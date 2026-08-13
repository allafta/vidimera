// @vidimera/record — redeem-token.test.ts (SPEC §11.2 "Redemption (the effect seam)", the
// TOKEN shape — second step-3 increment): the separated-store coupling —
// `confirmed → redeeming { tokenDigest }` at beginRedemption() (the single-use token,
// library-generated, returned exactly once, never persisted), and
// `redeeming → redeemed { via: 'token', tokenDigest }` at completeRedemption() on
// presenting that token. Both redemption clocks are the third step-3 increment; nothing
// here constructs a bound, a dueAt, or a redemption-failed record.
//
// ADJACENT-PAIR ORDER TESTS are derived per redeem.test.ts's discipline, per ladder, at
// the bottom of this file — each ladder's derivation comment enumerates the jointly
// constructible pairs and why the rest are excluded.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { digest } from '../src/canonical.js';
import { create, createWithClock } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };

/** Opens and finalizes an effect-seam record, leaving it confirmed and NON-terminal. */
async function confirmedEffectRecord(store: MemoryStore | SqliteStore = new MemoryStore()) {
  const handles = create(makeConfig([effectSeamProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  return { handles, recordId, store };
}

/** Begins a token redemption on a fresh confirmed record; returns the token too. */
async function redeemingRecord(store: MemoryStore | SqliteStore = new MemoryStore()) {
  const { handles, recordId } = await confirmedEffectRecord(store);
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok', 'fixture: beginRedemption must succeed');
  if (begun.status !== 'ok') throw new Error('unreachable');
  return { handles, recordId, store, token: begun.value.token };
}

// === beginRedemption: the issuance ====================================================

test('beginRedemption() on a confirmed effect-seam record appends redeeming { tokenDigest } and returns the token once', async () => {
  const { handles, recordId } = await confirmedEffectRecord();

  const outcome = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;
  assert.equal(outcome.value.state, 'redeeming');
  assert.equal(outcome.value.recordId, recordId);

  // Token format pin: 32 random bytes, base64url, no padding — 43 chars (SPEC §11.2's
  // "enough entropy that its digest is not invertible by guessing", §13's limit).
  assert.match(outcome.value.token, /^[A-Za-z0-9_-]{43}$/);

  const chain = await handles.operator.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'redeeming');
  // PAYLOAD KEY-SET PIN: exactly { tokenDigest } — no bound key exists in this build
  // (redeemBound is GOVERNED-guarded; the clock increment lands the bound whole).
  assert.deepEqual(Object.keys(last.payload as object), ['tokenDigest']);
  assert.equal(
    (last.payload as { tokenDigest: string }).tokenDigest,
    digest(outcome.value.token),
    'the chain carries exactly the digest of the returned token',
  );

  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'redeeming');
  assert.equal(record?.status, 'active');
});

test('token custody: the token appears in the begin ok value and NOWHERE else (chain, store rows, refusals)', async () => {
  const store = new SqliteStore(':memory:');
  const { handles, recordId, token } = await redeemingRecord(store);

  const chain = await handles.operator.readChain(recordId);
  assert.ok(!JSON.stringify(chain).includes(token), 'the chain must not carry the raw token');

  // Dump EVERY table generically — robust to schema naming.
  const db = store.database;
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
    name: string;
  }[];
  assert.ok(tables.length > 0, 'fixture: the sqlite schema has tables');
  for (const { name } of tables) {
    const rows = db.prepare(`SELECT * FROM "${name}"`).all();
    assert.ok(
      !JSON.stringify(rows).includes(token),
      `the raw token must not appear in table '${name}'`,
    );
  }

  // A refusal outcome must not echo the token either: a second begin refuses.
  const again = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.ok(!JSON.stringify(again).includes(token));
});

test('two begins on two records issue different tokens (randomness smoke)', async () => {
  const a = await redeemingRecord();
  const b = await redeemingRecord();
  assert.notEqual(a.token, b.token);
});

test('beginRedemption: no re-issue — a second begin on a redeeming record refuses unredeemable-state with no append', async () => {
  // DECISIONS #30: "a persisted or re-issuable token would trade the at-most-once
  // guarantee for convenience". `unredeemable-state` is this build's mapping (§8's
  // enumeration predates the state) — recorded in the status doc.
  const { handles, recordId } = await redeemingRecord();
  const before = (await handles.operator.readChain(recordId)).length;

  const again = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(again.status, 'refused');
  if (again.status !== 'refused') return;
  assert.equal(again.code, 'unredeemable-state');
  assert.equal((await handles.operator.readChain(recordId)).length, before);
});

test('beginRedemption on a pure-capture profile refuses unredeemable-state; on open/refused likewise', async () => {
  // Pure-capture (any state): §11.2's preamble — on-iff-effects.
  const captureHandles = create(makeConfig([captureProfile()]));
  const capId = await openRecord(captureHandles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const cap = await captureHandles.operator.beginRedemption(capId, CONTENT);
  assert.equal(cap.status, 'refused');
  if (cap.status === 'refused') assert.equal(cap.code, 'unredeemable-state');

  // Effect-seam but still open:
  const handles = create(makeConfig([effectSeamProfile()]));
  const openId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const stillOpen = await handles.operator.beginRedemption(openId, CONTENT);
  assert.equal(stillOpen.status, 'refused');
  if (stillOpen.status === 'refused') assert.equal(stillOpen.code, 'unredeemable-state');

  // Effect-seam, terminally refused (§11.2's preamble names refused/expired explicitly):
  const refusingHandles = create(
    makeConfig([
      effectSeamProfile({
        id: 'test.effect.refusing.v1',
        terminalRefusals: ['identity-authority-refused'],
      }),
    ]),
  );
  const refId = await openRecord(
    refusingHandles,
    CONTENT,
    'test.effect.refusing.v1',
    DEFAULT_SUBJECT_REF,
  );
  const refFin = await refusingHandles.operator.finalize(
    refId,
    identity({ authority: 'session:wrong-app' }),
    CONTENT,
    facts(),
  );
  assert.equal(refFin.status, 'refused', 'fixture: the record must terminally refuse');
  const onRefused = await refusingHandles.operator.beginRedemption(refId, CONTENT);
  assert.equal(onRefused.status, 'refused');
  if (onRefused.status === 'refused') assert.equal(onRefused.code, 'unredeemable-state');
});

test('beginRedemption with mismatched content refuses effect-mismatch, no append', async () => {
  // Begin-time correspondence is this build's ADDITION (comment-argued at the seam):
  // §11.2's Honest bound makes a MISMATCHED effect refusable at the seam — refusing
  // before a token is ever issued is what that buys in the separated shape.
  const { handles, recordId } = await confirmedEffectRecord();
  const before = (await handles.operator.readChain(recordId)).length;

  const outcome = await handles.operator.beginRedemption(recordId, {
    subject: 'week-1',
    total: 41,
  });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'effect-mismatch');
  assert.equal((await handles.operator.readChain(recordId)).length, before);
});

test('beginRedemption: unknown recordId throws (a caller error, not a refusal)', async () => {
  const handles = create(makeConfig([effectSeamProfile()]));
  await assert.rejects(
    handles.operator.beginRedemption('no-such-record', CONTENT),
    /unknown recordId 'no-such-record'/,
  );
});

test('the injectable tokenSource drives a deterministic token (internal seam, like the clock)', async () => {
  const store = new MemoryStore();
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store }),
    () => new Date(Date.UTC(2026, 0, 1)),
    undefined,
    () => 'fixed-token-under-test-000000000000000000000',
  );
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok');
  if (begun.status !== 'ok') return;
  assert.equal(begun.value.token, 'fixed-token-under-test-000000000000000000000');
});
