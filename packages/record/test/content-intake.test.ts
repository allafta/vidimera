// @vidimera/record — content-intake.test.ts: content binding. Every seam that binds content
// (`stage`, `finalize`, `decline` and the three redemption seams) runs the registered
// canonicalizer through one helper, which refuses a thenable (a canonicalizer is synchronous)
// and digests the serialized output. Only `stage()` serializes strictly (a lone surrogate throws);
// every seam refuses a non-plain object, and the five re-bind seams serialize in the default
// escaping mode, so a lone surrogate there is ordinary content drift. A refusal is the same
// configuration fault a throwing canonicalizer already is: it propagates, `stage()` writes no
// draft and every other seam appends nothing. A refused native promise must also have its later
// rejection OBSERVED, or it would end the process as an unhandled rejection.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { bindContent, canonicalize, digest } from '../src/canonical.js';
import { create } from '../src/create.js';
import { deriveStagedRef } from '../src/id.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  captureProfile,
  DEFAULT_CANONICALIZER_REF,
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const STRICT = { wellFormed: true };
const DEFAULT_MODE = { wellFormed: false };

/** Lets microtasks and two macrotasks run, so a late rejection would have surfaced. */
async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

/** Runs `body` and returns every unhandled rejection the process saw meanwhile. */
async function unhandledDuring(body: () => Promise<void>): Promise<unknown[]> {
  const seen: unknown[] = [];
  const listener = (reason: unknown) => {
    seen.push(reason);
  };
  process.on('unhandledRejection', listener);
  try {
    await body();
    await flush();
  } finally {
    process.off('unhandledRejection', listener);
  }
  return seen;
}

/** Synchronous until `turnAsync()`, then an async function whose promise REJECTS. */
function turningAsync() {
  let asyncNow = false;
  return {
    canonicalizer: (content: unknown): unknown => {
      if (!asyncNow) return content;
      return (async () => {
        throw new Error('late rejection');
      })();
    },
    turnAsync: () => {
      asyncNow = true;
    },
  };
}

class Counting extends MemoryStore {
  puts = 0;
  override putStaged(...args: Parameters<MemoryStore['putStaged']>) {
    this.puts++;
    return super.putStaged(...args);
  }
}

function stagingSetup(canonicalizer: (c: unknown) => unknown) {
  const store = new Counting();
  const handles = create(
    makeConfig([captureProfile()], {
      store,
      canonicalizers: { [DEFAULT_CANONICALIZER_REF]: canonicalizer },
    }),
  );
  return { store, handles };
}

// === stage ============================================================================

test('stage(): an async canonicalizer throws the thenable refusal and writes no draft', async () => {
  const { canonicalizer, turnAsync } = turningAsync();
  const { store, handles } = stagingSetup(canonicalizer);
  turnAsync();
  await assert.rejects(
    () => handles.agent.stage(CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF),
    new RegExp(
      `canonicalizer for '${DEFAULT_CANONICALIZER_REF.replaceAll('.', '\\.')}' returned a thenable — a canonicalizer is synchronous`,
    ),
  );
  assert.equal(store.puts, 0, 'no draft was written');
  await flush();
});

test('stage(): the refused promise rejection is observed — no unhandledRejection fires', async () => {
  const { canonicalizer, turnAsync } = turningAsync();
  const { handles } = stagingSetup(canonicalizer);
  turnAsync();
  const seen = await unhandledDuring(async () => {
    await assert.rejects(
      () => handles.agent.stage(CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF),
      /returned a thenable/,
    );
  });
  assert.deepEqual(seen, [], 'the rejection was handled');
});

test('a non-native thenable is refused without its then ever being called', async () => {
  let calls = 0;
  const lazy = {
    // biome-ignore lint/suspicious/noThenProperty: a thenable is the input under test
    then() {
      calls++;
      throw new Error('hostile then');
    },
  };
  const fn = Object.assign(() => 1, {
    // biome-ignore lint/suspicious/noThenProperty: a thenable is the input under test
    then() {
      calls++;
    },
  });
  assert.throws(() => bindContent(() => lazy, 'ref.a', CONTENT, STRICT), /returned a thenable/);
  assert.throws(() => bindContent(() => fn, 'ref.b', CONTENT, STRICT), /returned a thenable/);
  await flush();
  assert.equal(calls, 0, 'a lazy thenable is never run');
});

test('a native promise that rejects later is observed when refused through bindContent', async () => {
  const seen = await unhandledDuring(async () => {
    const rejecting = Promise.reject(new Error('late'));
    assert.throws(
      () => bindContent(() => rejecting, 'ref.c', CONTENT, STRICT),
      /returned a thenable/,
    );
  });
  assert.deepEqual(seen, []);
});

class WithPrivate {
  #secret = 1;
  get secret() {
    return this.#secret;
  }
}

const VOID_OUTPUTS: readonly { what: string; output: unknown; pattern: RegExp }[] = [
  { what: 'a Map', output: { m: new Map([['a', 1]]) }, pattern: /Map/ },
  { what: 'a Set', output: { s: new Set([1]) }, pattern: /Set/ },
  {
    what: 'a class holding only #private state',
    output: new WithPrivate(),
    pattern: /WithPrivate/,
  },
  { what: 'a boxed primitive', output: { s: new String('a') }, pattern: /String/ },
  { what: 'a lone surrogate in a value', output: { a: 'x\ud800y' }, pattern: /lone surrogate/ },
  { what: 'a lone surrogate in a key', output: { 'k\udc00': 1 }, pattern: /lone surrogate/ },
  {
    what: 'a lone surrogate returned by toJSON',
    output: { toJSON: () => 'z\ud83d' },
    pattern: /lone surrogate/,
  },
  { what: 'a nested promise', output: { p: Promise.resolve(1) }, pattern: /Promise/ },
];

for (const { what, output, pattern } of VOID_OUTPUTS) {
  test(`stage(): canonicalizer output holding ${what} throws and writes no draft`, async () => {
    const { store, handles } = stagingSetup(() => output);
    await assert.rejects(
      () => handles.agent.stage(CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF),
      pattern,
    );
    assert.equal(store.puts, 0);
  });
}

test('well-formed supplementary characters and a Date (via toJSON) still bind', async () => {
  const { store, handles } = stagingSetup(() => ({ e: '\u{1F600}', at: new Date(0) }));
  const staged = await handles.agent.stage(CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  assert.equal(staged.status, 'ok');
  assert.equal(store.puts, 1);
});

test('bindContent digests exactly what the default canonicalize path digests for clean content', () => {
  const c = { b: 2, a: [1, 'é', '\u{1F600}'] };
  assert.equal(
    bindContent((x) => x, 'ref', c, STRICT),
    digest(canonicalize(c)),
  );
});

test('bindContent: strict refuses a lone surrogate, the default mode escapes it, and a refusal names the canonicalizer', () => {
  const bad = { a: 'x\ud800y' };
  assert.throws(
    () => bindContent((x) => x, 'ref.d', bad, STRICT),
    /canonicalizer for 'ref\.d' returned output that cannot be serialized — serializeJcs: .*lone surrogate/,
  );
  assert.equal(
    bindContent((x) => x, 'ref.d', bad, DEFAULT_MODE),
    digest(canonicalize(bad)),
  );
  try {
    bindContent(() => new Map(), 'ref.e', CONTENT, DEFAULT_MODE);
    assert.fail('expected a throw');
  } catch (err) {
    assert.ok(err instanceof TypeError);
    assert.match(
      err.message,
      /^canonicalizer for 'ref\.e' returned output that cannot be serialized — serializeJcs: an instance of 'Map' has no JCS representation/,
    );
    assert.ok(err.cause instanceof TypeError, 'the serializer error is kept as the cause');
  }
});

// === the five other seams ==============================================================

type Seam = 'finalize' | 'decline' | 'redeem' | 'beginRedemption' | 'completeRedemption';

async function seamSetup(seam: Seam, callContent: unknown = CONTENT) {
  const { canonicalizer, turnAsync } = turningAsync();
  const store = new MemoryStore();
  const profile =
    seam === 'finalize' || seam === 'decline'
      ? captureProfile({ decline: true })
      : effectSeamProfile();
  const handles = create(
    makeConfig([profile], {
      store,
      canonicalizers: { [DEFAULT_CANONICALIZER_REF]: canonicalizer },
    }),
  );
  const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  let token = '';
  if (seam !== 'finalize' && seam !== 'decline') {
    const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  }
  if (seam === 'completeRedemption') {
    const begun = await handles.operator.beginRedemption(recordId, CONTENT);
    assert.equal(begun.status, 'ok', 'fixture: beginRedemption must succeed');
    if (begun.status !== 'ok') throw new Error('unreachable');
    token = begun.value.token;
  }
  const call = (): Promise<unknown> => {
    switch (seam) {
      case 'finalize':
        return handles.operator.finalize(recordId, identity(), callContent, facts());
      case 'decline':
        return handles.operator.decline(recordId, identity(), callContent, facts());
      case 'redeem':
        return handles.operator.redeem(recordId, callContent);
      case 'beginRedemption':
        return handles.operator.beginRedemption(recordId, callContent);
      case 'completeRedemption':
        return handles.operator.completeRedemption(recordId, token, callContent);
    }
  };
  return { store, recordId, call, turnAsync };
}

for (const seam of [
  'finalize',
  'decline',
  'redeem',
  'beginRedemption',
  'completeRedemption',
] as const) {
  test(`${seam}(): a canonicalizer that turns async throws the thenable refusal, appends nothing and leaves no unobserved rejection`, async () => {
    const { store, recordId, call, turnAsync } = await seamSetup(seam);
    const before = await store.readChain(recordId);
    turnAsync();
    const seen = await unhandledDuring(async () => {
      await assert.rejects(call, /returned a thenable — a canonicalizer is synchronous/);
    });
    assert.deepEqual(seen, [], 'the rejection was handled');
    assert.deepEqual(await store.readChain(recordId), before, 'the chain is untouched');
  });
}

// === a lone surrogate at the re-bind seams: drift, not a throw ===========================

const LONE = { subject: 'week-1', total: 40, note: 'x\ud800y' };

for (const seam of [
  'finalize',
  'decline',
  'redeem',
  'beginRedemption',
  'completeRedemption',
] as const) {
  // The code maps a content mismatch per seam: finalize and decline refuse `content-drift`; the
  // redemption seams on a profile with no `reverify` refuse `effect-mismatch` (reverify maps it
  // to `content-drift`). Neither is a throw, because only stage() is strict.
  const code = seam === 'finalize' || seam === 'decline' ? 'content-drift' : 'effect-mismatch';
  test(`${seam}(): content holding a lone surrogate refuses ${code} instead of throwing`, async () => {
    const { call } = await seamSetup(seam, LONE);
    const outcome = (await call()) as { status: string; code?: string };
    assert.equal(outcome.status, 'refused');
    assert.equal(outcome.code, code);
  });
}

test('finalize() on a record staged by an older build over content holding a lone surrogate confirms', async () => {
  const { store, handles } = stagingSetup((c) => c);
  const profile = captureProfile();
  const leg = profile.legs[0]?.id ?? '';
  // An older build bound this draft through the default (escaping) serializer.
  const contentDigest = digest(canonicalize(LONE));
  const id = deriveStagedRef(contentDigest, profile.id, DEFAULT_SUBJECT_REF, leg);
  await store.putStaged({
    id,
    profileId: profile.id,
    legId: leg,
    subjectRef: DEFAULT_SUBJECT_REF,
    contentDigest,
  });
  const opened = await handles.operator.open(id);
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;
  const done = await handles.operator.finalize(opened.value.recordId, identity(), LONE, facts());
  assert.equal(done.status, 'ok');
  // The same content staged today is refused at the door.
  await assert.rejects(
    () => handles.agent.stage(LONE, profile.id, DEFAULT_SUBJECT_REF),
    /lone surrogate/,
  );
});

test('finalize(): a facts.figures entry holding a Map refuses consultation-missing', async () => {
  const { handles } = stagingSetup((c) => c);
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const outcome = await handles.operator.finalize(
    recordId,
    identity(),
    CONTENT,
    facts({ figures: { m: new Map([['a', 1]]) } }),
  );
  assert.equal(outcome.status, 'refused');
  assert.equal(outcome.status === 'refused' ? outcome.code : '', 'consultation-missing');
});
