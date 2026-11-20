// @vidimera/record — subject-intake.test.ts: the `subjectRef` rule. `stage()` takes only a
// non-empty, well-formed, NUL-free string of at most 1,024 UTF-8 bytes, and throws a caller error
// otherwise, writing no draft; `open()` applies the same rule to a persisted draft it resolves
// (and to a `proposed` one), since such a draft may predate the rule or come from a writer other
// than `stage()`. Each case runs on MemoryStore and SqliteStore.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { canonicalize, digest } from '../src/canonical.js';
import { create } from '../src/create.js';
import { deriveStagedRef } from '../src/id.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import type { Store } from '../src/store/store.js';
import { captureProfile, makeConfig, openRecord } from './helpers/profiles.js';

const PROFILE = captureProfile();
const LEG = 'approver-decide';
const CONTENT = { amount: 8.0 };
const CONTENT_DIGEST = digest(canonicalize(CONTENT));

const BACKINGS: readonly { name: string; store: () => Store }[] = [
  { name: 'MemoryStore', store: () => new MemoryStore() },
  { name: 'SqliteStore', store: () => new SqliteStore(':memory:') },
];

const BAD_SUBJECTS: readonly { what: string; subject: unknown; rule: string }[] = [
  { what: 'a number', subject: 42, rule: 'must be a string (received a number)' },
  { what: 'an object', subject: {}, rule: 'must be a string (received an object)' },
  { what: 'an array', subject: ['a'], rule: 'must be a string (received an array)' },
  { what: 'undefined', subject: undefined, rule: 'must be a string (received undefined)' },
  {
    what: 'an object with toJSON',
    subject: { toJSON: () => 'subject:redirected' },
    rule: 'must be a string (received an object)',
  },
  { what: 'null', subject: null, rule: 'must be a string (received null)' },
  { what: 'the empty string', subject: '', rule: 'must not be empty' },
  { what: 'a lone high surrogate', subject: 'a\ud800b', rule: 'must be well-formed UTF-16' },
  { what: 'a lone low surrogate', subject: 'a\udc00', rule: 'must be well-formed UTF-16' },
  { what: 'a U+0000', subject: 'a\u0000b', rule: 'must not contain U+0000' },
  {
    what: '1,025 UTF-8 bytes',
    subject: 'a'.repeat(1025),
    rule: 'must be at most 1024 bytes in UTF-8 — digest a longer natural key into one',
  },
  {
    what: '1,026 UTF-8 bytes of multi-byte characters',
    subject: 'é'.repeat(513),
    rule: 'must be at most 1024 bytes in UTF-8 — digest a longer natural key into one',
  },
];

/** Plants a self-consistent draft (so the staged-integrity check passes) and returns its ref. */
async function plant(store: Store, subject: string, content: unknown = CONTENT): Promise<string> {
  const contentDigest = digest(canonicalize(content));
  const id = deriveStagedRef(contentDigest, PROFILE.id, subject, LEG);
  await store.putStaged({
    id,
    profileId: PROFILE.id,
    legId: LEG,
    subjectRef: subject,
    contentDigest,
  });
  return id;
}

for (const backing of BACKINGS) {
  for (const { what, subject, rule } of BAD_SUBJECTS) {
    test(`${backing.name}: stage() throws on ${what} as the subject and writes no draft`, async () => {
      const store = backing.store();
      // Counts every draft write, so a non-string subject (which has no derivable ref) is observed too.
      let writes = 0;
      const putStaged = store.putStaged.bind(store);
      store.putStaged = (...args) => {
        writes++;
        return putStaged(...args);
      };
      const handles = create(makeConfig([PROFILE], { store }));
      // A draft written despite the throw would sit under the ref stage() derives for a string.
      const wouldBe =
        typeof subject === 'string'
          ? deriveStagedRef(CONTENT_DIGEST, PROFILE.id, subject, LEG)
          : undefined;

      await assert.rejects(
        handles.agent.stage(CONTENT, PROFILE.id, subject as string),
        (err: unknown) => {
          assert.ok(err instanceof Error);
          assert.ok(
            err.message.startsWith(`stage: subjectRef ${rule}`),
            `unexpected message: ${err.message}`,
          );
          return true;
        },
      );
      assert.equal(writes, 0, 'no draft was written');
      if (wouldBe !== undefined) assert.equal(await store.getStaged(wouldBe), null);
    });
  }

  test(`${backing.name}: the rule runs before profile resolution — a bad subject under an unknown profile throws, not refuses`, async () => {
    const handles = create(makeConfig([PROFILE], { store: backing.store() }));
    await assert.rejects(
      handles.agent.stage(CONTENT, 'no.such.profile.v1', ''),
      /^Error: stage: subjectRef must not be empty/,
    );
  });

  test(`${backing.name}: a subject of exactly 1,024 bytes, multi-byte characters included, stages and opens`, async () => {
    const handles = create(makeConfig([PROFILE], { store: backing.store() }));
    const twoByte = 'é'.repeat(512);
    assert.equal(Buffer.byteLength(twoByte, 'utf8'), 1024);
    await openRecord(handles, CONTENT, PROFILE.id, twoByte);
    // An astral character is a valid surrogate pair and counts as four bytes.
    const astral = `${'a'.repeat(1020)}\u{1f600}`;
    assert.equal(Buffer.byteLength(astral, 'utf8'), 1024);
    await openRecord(handles, CONTENT, PROFILE.id, astral);
  });

  test(`${backing.name}: 42 and "42" can no longer yield two live records`, async () => {
    const handles = create(makeConfig([PROFILE], { store: backing.store() }));
    await openRecord(handles, CONTENT, PROFILE.id, '42');
    await assert.rejects(
      handles.agent.stage(CONTENT, PROFILE.id, 42 as unknown as string),
      /^Error: stage: subjectRef must be a string/,
    );
    // The string form is held by the live record: a second open is refused, not split.
    const again = await handles.agent.stage({ amount: 9 }, PROFILE.id, '42');
    assert.equal(again.status, 'ok');
    if (again.status !== 'ok') return;
    const out = await handles.operator.open(again.value.stagedRef);
    assert.equal(out.status === 'refused' ? out.code : out.status, 'record-exists');
  });

  for (const { what, subject } of [
    { what: 'an empty subject', subject: '' },
    { what: 'a NUL subject', subject: 'a\u0000b' },
    { what: 'a lone-surrogate subject', subject: 'a\ud800b' },
    { what: 'an over-long subject', subject: 'a'.repeat(1025) },
  ]) {
    test(`${backing.name}: open() throws on a planted draft with ${what}, appending nothing`, async () => {
      const store = backing.store();
      const handles = create(makeConfig([PROFILE], { store }));
      const id = await plant(store, subject);

      await assert.rejects(handles.operator.open(id), /^Error: open: subjectRef /);
      assert.equal(await store.findNonTerminal(PROFILE.id, subject), null);
    });
  }

  test(`${backing.name}: a legal opened draft with an illegal proposed draft throws naming the proposed one`, async () => {
    const store = backing.store();
    const handles = create(makeConfig([PROFILE], { store }));
    const proposal = await plant(store, '', { amount: 1 });
    const opened = await plant(store, 'subject:fine');
    await assert.rejects(
      handles.operator.open(opened, { proposed: { stagedRef: proposal } }),
      /^Error: open: subjectRef .*proposed stagedRef/,
    );
  });

  test(`${backing.name}: a draft failing both the integrity check and the subject rule throws the integrity error`, async () => {
    const store = backing.store();
    const handles = create(makeConfig([PROFILE], { store }));
    const id = deriveStagedRef(CONTENT_DIGEST, PROFILE.id, 'subject:honest', LEG);
    // Stored under `id` but carrying an empty subject: it does not re-derive to `id`.
    await store.putStaged({
      id,
      profileId: PROFILE.id,
      legId: LEG,
      subjectRef: '',
      contentDigest: CONTENT_DIGEST,
    });
    await assert.rejects(
      handles.operator.open(id),
      /^Error: open: the persisted draft under stagedRef .* does not match it/,
    );
  });
}
