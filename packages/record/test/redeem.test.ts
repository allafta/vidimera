// @vidimera/record — redeem.test.ts (SPEC §11.2 "Redemption (the effect seam)", the DIRECT
// shape): the co-located coupling of a confirmed final-leg decision to its effect —
// `confirmed → redeemed { via: 'direct' }`, enlisted in the host's transaction when one is
// supplied, inside the adapter's own otherwise. The token shape (`redeeming`, tokenDigest,
// presentation) is REAL as of the second step-3 increment — its issuance half
// (`beginRedemption`) is covered in redeem-token.test.ts, not here; both redemption clocks
// remain the third increment's, and nothing here constructs them either.
//
// The ladder under test (kernel/redeem.ts):
//   (1) chain-verify -> chain-compromise      — §5: verification first, at every
//                                               operator-side mutating seam
//   (2) resolve profile -> unknown-profile    — defensive (a coherent instance always
//                                               resolves a record it opened)
//   (3) effect seam declared? -> unredeemable-state (pure-capture; §11.2 "on-iff-effects")
//   (4) state gate -> already-redeemed on 'redeemed' (at-most-once, replay half);
//       unredeemable-state on open/refused/expired (§11.2's preamble) AND on 'redeeming'
//       (this direct ladder holds no token to consume — completeRedemption is that seam);
//       redemption-failed remains a defensive arm with no producer until the clock increment
//   (5) correspondence -> effect-mismatch     — re-digest of the supplied content vs the
//                                               bound contentDigest, same path as stage()
//   (6) append redeemed { via: 'direct' }     — meta from the terminality derivation
//                                               (redeemed is terminal: THE RELEASE); a
//                                               non-append residual re-reads once and
//                                               agrees with re-invocation (already-
//                                               redeemed if the fresh state is
//                                               'redeemed', unredeemable-state otherwise)
//
// ADJACENT-PAIR ORDER TESTS, derived as finalize-check-order.test.ts derives its own — one
// test per consecutive-rung ordered pair that is JOINTLY CONSTRUCTIBLE:
//   (1)->(3): tampered chain on a PURE-CAPTURE confirmed record — both rungs' conditions
//     hold; chain-compromise must win. Constructible; below.
//   (1)->(4)/(1)->(5): tampered chain + already-redeemed state / wrong content — covered
//     by the same principle as (1)->(3); one representative test below ((1)->(5)).
//   (2)->(3): NOT jointly constructible — an unconfigured profile is defensive-only here,
//     exactly as seal.test.ts's derivation records for its own (1)->(2).
//   (3)->(4): NOT jointly constructible — a pure-capture record cannot reach 'redeemed'.
//   (4)->(5): an already-redeemed record offered WRONG content — at-most-once outranks
//     mismatch reporting; already-redeemed must win. Constructible; below.
//   (5)->(6): a mismatch plus a racing writer — not constructible without a bespoke racing
//     store; excluded, and this comment is why.
// Total order-pair tests in this file: 3.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create } from '../src/create.js';
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
  tamperNonLast,
} from './helpers/profiles.js';
import { TamperingStore } from './helpers/stores.js';

const CONTENT = { subject: 'week-1', total: 40 };

/** Opens and finalizes an effect-seam record, leaving it confirmed and NON-terminal. */
async function confirmedEffectRecord(store: MemoryStore | SqliteStore = new MemoryStore()) {
  const handles = create(makeConfig([effectSeamProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  return { handles, recordId, store };
}

// === the direct shape ==================================================================

test('redeem() on a confirmed effect-seam record appends redeemed { via: "direct" }', async () => {
  const { handles, recordId } = await confirmedEffectRecord();

  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;
  assert.equal(outcome.value.state, 'redeemed');
  assert.equal(outcome.value.recordId, recordId);

  const chain = await handles.operator.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'redeemed');
  assert.deepEqual(last.payload, { via: 'direct' });

  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'redeemed');
});

test('THE RELEASE: after redeemed, the (profile, subject) pair is held no longer', async () => {
  // Deferral register row 9 (retired by this landing) named "the redemption edge itself
  // (SPEC §11.2)" as the first release path. This is that edge, doing that release: the
  // persisted flag comes from the terminality derivation (redeemed is terminal, §2), so
  // C1's partial-unique hold lifts.
  const store = new MemoryStore();
  const { handles, recordId } = await confirmedEffectRecord(store);

  assert.equal(
    await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF),
    recordId,
    'fixture: the confirmed effect-seam record holds the pair before redemption',
  );

  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'ok', 'fixture: the redemption must succeed');

  assert.equal(await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF), null);

  const staged = await handles.agent.stage(
    { subject: 'week-2', total: 41 },
    'test.effect.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const reopened = await handles.operator.open(staged.value.stagedRef);
  assert.equal(reopened.status, 'ok', 'a fresh decision for the released pair opens');
});

test('ENLISTMENT: a host ROLLBACK erases the redeemed edge, and a known-rollback retry succeeds', async () => {
  // SPEC §11.2, the direct shape: the edge "commits or rolls back with" the host's
  // transaction; "A host rollback erases the edge entirely", and re-attempting a KNOWN
  // rolled-back redemption is legitimate — not the unknown-outcome retry the at-most-once
  // rule forbids (that rule governs the token shape's elapsed-`redeeming` case).
  const store = new SqliteStore(':memory:');
  const { handles, recordId } = await confirmedEffectRecord(store);

  store.database.exec('BEGIN IMMEDIATE');
  const enlisted = await handles.operator.redeem(recordId, CONTENT, store.database);
  assert.equal(enlisted.status, 'ok', 'the enlisted redemption reports success inside the txn');
  store.database.exec('ROLLBACK');

  const afterRollback = await handles.operator.getRecord(recordId);
  assert.equal(afterRollback?.state, 'confirmed', 'the rollback took the edge with it');
  assert.equal(
    await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF),
    recordId,
    'the pair is still held — nothing was released',
  );

  const retry = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(retry.status, 'ok', 'the known-rollback retry is legitimate and succeeds');
  assert.equal((await handles.operator.getRecord(recordId))?.state, 'redeemed');
});

test('ENLISTED CHAIN-COMPROMISE: a tampered chain over an enlisted redeem() refuses chain-compromise with no edge, and the host transaction stays open and usable', async () => {
  // The corner this pins: appendChainCompromise's own no-tx fallback runs its OWN `BEGIN
  // IMMEDIATE` on the same connection an enlisted caller's transaction already has open —
  // on the embedded backing that throws ("cannot start a transaction within a
  // transaction") rather than refusing. Rung (1) now short-circuits before ever reaching
  // that append: an enlisted caller over a tampered chain refuses `chain-compromise`
  // result-first, with NO append attempted, no throw, and the host's own transaction left
  // exactly as it was (see kernel/redeem.ts rung (1) and kernel/finalize.ts's
  // `appendChainCompromise` doc comment).
  const sqlite = new SqliteStore(':memory:');
  const { recordId } = await confirmedEffectRecord(sqlite);

  const tampering = new TamperingStore(sqlite, recordId, tamperNonLast);
  const handles = create(makeConfig([effectSeamProfile()], { store: tampering }));

  sqlite.database.exec('BEGIN IMMEDIATE');
  const outcome = await handles.operator.redeem(recordId, CONTENT, sqlite.database);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
  assert.equal(outcome.transitionRef, undefined, 'no edge — the append was never attempted');

  assert.equal(sqlite.database.isTransaction, true, "the host's transaction is still open");
  sqlite.database.exec('ROLLBACK'); // must not throw — the connection is clean and usable
  assert.equal(sqlite.database.isTransaction, false, 'the rollback landed cleanly');
});

// === at-most-once, replay half =========================================================

test('a second redeem() refuses already-redeemed, appending nothing', async () => {
  const { handles, recordId } = await confirmedEffectRecord();
  await handles.operator.redeem(recordId, CONTENT);
  const before = await handles.operator.readChain(recordId);

  const replayed = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(replayed.status, 'refused');
  if (replayed.status !== 'refused') return;
  assert.equal(replayed.code, 'already-redeemed');
  assert.equal(replayed.transitionRef, undefined, 'a never-appends code carries no ref');

  assert.deepEqual(await handles.operator.readChain(recordId), before);
});

// === correspondence ====================================================================

test('altered content refuses effect-mismatch, appending nothing', async () => {
  const { handles, recordId } = await confirmedEffectRecord();
  const before = await handles.operator.readChain(recordId);

  const outcome = await handles.operator.redeem(recordId, { subject: 'week-1', total: 41 });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'effect-mismatch');
  assert.equal(outcome.transitionRef, undefined);

  assert.deepEqual(await handles.operator.readChain(recordId), before);
});

test('content that re-canonicalizes identically redeems — the binding is the digest, not the reference', async () => {
  // Same value, different object: the correspondence check re-digests through the SAME
  // adopter-canonicalizer path stage() used, so a structurally identical value passes.
  const { handles, recordId } = await confirmedEffectRecord();
  const outcome = await handles.operator.redeem(recordId, { total: 40, subject: 'week-1' });
  assert.equal(outcome.status, 'ok', 'key order is not content difference under JCS');
});

// === unredeemable-state, correctly scoped ==============================================

test('redeem() on a PURE-CAPTURE profile refuses unredeemable-state whatever the state', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const open = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(open.status, 'refused');
  if (open.status !== 'refused') return;
  assert.equal(open.code, 'unredeemable-state');

  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  const confirmed = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(confirmed.status, 'refused');
  if (confirmed.status !== 'refused') return;
  assert.equal(confirmed.code, 'unredeemable-state');
});

test('redeem() on an OPEN effect-seam record refuses unredeemable-state', async () => {
  const handles = create(makeConfig([effectSeamProfile()]));
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state');
});

// === caller errors =====================================================================

test('redeem() on an unknown recordId THROWS — a caller error, not a domain refusal', async () => {
  // Fixes the stub, which refused unredeemable-state here against §8's qualifiers
  // ("intact-chain, known-profile, valid-leg"): a recordId that resolves to no chain is
  // the same caller error seal() and finalize() already throw on.
  const handles = create(makeConfig([effectSeamProfile()]));
  await assert.rejects(
    () => handles.operator.redeem('no-such-record', CONTENT),
    /unknown recordId/,
  );
});

// === verify-first, and the order pairs =================================================

test('(1)->(3): a tampered chain on a pure-capture confirmed record refuses chain-compromise, not unredeemable-state', async () => {
  const inner = new MemoryStore();
  const handles0 = create(makeConfig([captureProfile()], { store: inner }));
  const recordId = await openRecord(handles0, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const done = await handles0.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');

  const tampering = new TamperingStore(inner, recordId, tamperNonLast);
  const handles = create(makeConfig([captureProfile()], { store: tampering }));
  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
});

test('(1)->(5): a tampered chain outranks a content mismatch — chain-compromise, not effect-mismatch', async () => {
  const inner = new MemoryStore();
  const handles0 = create(makeConfig([effectSeamProfile()], { store: inner }));
  const recordId = await openRecord(handles0, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles0.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');

  const tampering = new TamperingStore(inner, recordId, tamperNonLast);
  const handles = create(makeConfig([effectSeamProfile()], { store: tampering }));
  const outcome = await handles.operator.redeem(recordId, { subject: 'week-1', total: 99 });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
});

test('(4)->(5): already-redeemed outranks effect-mismatch — at-most-once beats mismatch reporting', async () => {
  const { handles, recordId } = await confirmedEffectRecord();
  await handles.operator.redeem(recordId, CONTENT);

  const outcome = await handles.operator.redeem(recordId, { subject: 'week-1', total: 99 });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'already-redeemed');
});
