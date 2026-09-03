// @vidimera/record — clocks.test.ts (SPEC §4 "Clock-driven edges are appended en
// passant"; §9.1 "Redemption bounds"; §12 dueAt/listDue): the third step-3 increment's
// windows. This file owns the clock module's derivation, producer, resolution, and
// sweep pins. Deterministic throughout via createWithClock — no test sleeps.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { createWithClock } from '../src/create.js';
import { pendingWindow, resolveDueClock } from '../src/kernel/expiry.js';
import { profileDigest } from '../src/profile-digest.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import type { AppendMeta, Store } from '../src/store/store.js';
import type { RecordState, Transition } from '../src/types.js';
import { storeGenesis, storeNext } from './helpers/chain.js';
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
import { RaceOnceStore, TamperingStore } from './helpers/stores.js';

const CONTENT = { subject: 'week-1', total: 40 };
const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);
const HOUR = 3600_000;

/** Opens+finalizes an effect-seam record under a controllable clock; returns the store. */
async function confirmedAt(clockMs: { t: number }, store: Store = new MemoryStore()) {
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store }),
    () => new Date(clockMs.t),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  return { handles, recordId, store };
}

test('pendingWindow: an open record is in the open window; a confirmed effect-seam record with confirmToRedeem is in the confirmed window', async () => {
  const clock = { t: T0 };
  const store = new MemoryStore();
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store }),
    () => new Date(clock.t),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);

  const profileForResolved = effectSeamProfile();
  const resolved = {
    profile: profileForResolved,
    canonicalizer: (c: unknown) => c,
    effectSeam: true,
    profileDigest: profileDigest(profileForResolved),
  };
  const openWin = pendingWindow(await store.readChain(recordId), resolved);
  assert.equal(openWin.window, 'open');

  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const confirmedWin = pendingWindow(await store.readChain(recordId), resolved);
  assert.equal(confirmedWin.window, 'confirmed');
  if (confirmedWin.window !== 'confirmed') return;
  // deadline = the confirmed transition's at + confirmToRedeem seconds. Assert against
  // the profile's OWN declared value, never a hardcoded figure — the fixture's bound is
  // the helper's business, not this pin's:
  const declared = effectSeamProfile().redeem?.confirmToRedeem;
  assert.ok(declared !== undefined);
  const chain = await store.readChain(recordId);
  const confirmedTr = chain.find((t) => t.kind === 'confirmed');
  assert.ok(confirmedTr !== undefined);
  assert.equal(confirmedWin.deadlineMs, Date.parse(confirmedTr.at) + declared * 1000);
});

test('resolveDueClock: an elapsed confirmed window appends confirmed → expired { bound } and releases the pair', async () => {
  const clock = { t: T0 };
  const { recordId, store } = await confirmedAt(clock);
  const profileForResolved = effectSeamProfile();
  const resolved = {
    profile: profileForResolved,
    canonicalizer: (c: unknown) => c,
    effectSeam: true,
    profileDigest: profileDigest(profileForResolved),
  };

  clock.t = T0 + 400 * HOUR; // far past any declared bound
  const res = await resolveDueClock(
    store,
    await store.readChain(recordId),
    resolved,
    new Date(clock.t),
  );
  assert.equal(res.due, true);
  if (!res.due) return;
  assert.equal(res.window, 'confirmed');
  assert.equal(res.result.appended, true);

  const chain = await store.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'expired');
  // PAYLOAD KEY-SET PIN: exactly { bound }, the crossed deadline, ms-precision RFC 3339.
  assert.deepEqual(Object.keys(last.payload as object), ['bound']);
  const bound = (last.payload as { bound: string }).bound;
  assert.match(bound, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  const confirmedTr = chain.find((t) => t.kind === 'confirmed');
  assert.ok(confirmedTr !== undefined);
  const declared = effectSeamProfile().redeem?.confirmToRedeem;
  assert.ok(declared !== undefined);
  assert.equal(bound, new Date(Date.parse(confirmedTr.at) + declared * 1000).toISOString());

  // THE RELEASE: expired is terminal — the C1 hold lifts.
  assert.equal(await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF), null);
});

test('resolveDueClock: a not-yet-elapsed window reports { due: false } and appends nothing', async () => {
  const clock = { t: T0 };
  const { recordId, store } = await confirmedAt(clock);
  const profileForResolved = effectSeamProfile();
  const resolved = {
    profile: profileForResolved,
    canonicalizer: (c: unknown) => c,
    effectSeam: true,
    profileDigest: profileDigest(profileForResolved),
  };
  const before = (await store.readChain(recordId)).length;
  const res = await resolveDueClock(
    store,
    await store.readChain(recordId),
    resolved,
    new Date(T0), // the same instant — nothing has elapsed
  );
  assert.deepEqual(res, { due: false });
  assert.equal((await store.readChain(recordId)).length, before);
});

test('finalize stamps dueAt for a declared confirmToRedeem: listDue lists the record after the bound, not before', async () => {
  const clock = { t: T0 };
  const { recordId, store } = await confirmedAt(clock);
  const declared = effectSeamProfile().redeem?.confirmToRedeem;
  assert.ok(declared !== undefined);

  assert.deepEqual(await store.listDue(new Date(T0 + (declared - 1) * 1000)), []);
  assert.deepEqual(await store.listDue(new Date(T0 + (declared + 1) * 1000)), [recordId]);
});

test('beginRedemption on a redeemBound-declaring profile: payload is exactly { tokenDigest, bound }, dueAt set', async () => {
  const clock = { t: T0 };
  const { handles, recordId, store } = await confirmedAt(clock);
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok', 'fixture: the issuance must succeed');

  const chain = await store.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'redeeming');
  // KEY-SET PIN, declared shape: §4's present-iff-declared, both keys, nothing else.
  assert.deepEqual(Object.keys(last.payload as object).sort(), ['bound', 'tokenDigest']);
  const declared = effectSeamProfile().redeem?.redeemBound;
  assert.ok(declared !== undefined);
  assert.equal(
    (last.payload as { bound: string }).bound,
    new Date(Date.parse(last.at) + declared * 1000).toISOString(),
  );
  assert.deepEqual(await store.listDue(new Date(Date.parse(last.at) + (declared + 1) * 1000)), [
    recordId,
  ]);
});

/** Confirms then begins redemption under a controllable clock; returns the issued token. */
async function redeemingAt(clock: { t: number }, store: Store = new MemoryStore()) {
  const { handles, recordId } = await confirmedAt(clock, store);
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok', 'fixture: the issuance must succeed');
  if (begun.status !== 'ok') throw new Error('unreachable');
  return { handles, recordId, store, token: begun.value.token };
}

const CONFIRM_BOUND = effectSeamProfile().redeem?.confirmToRedeem ?? NaN;
const REDEEM_BOUND = effectSeamProfile().redeem?.redeemBound ?? NaN;

test('an elapsed confirmed window at redeem(): expired edge appended, unredeemable-state, pair released', async () => {
  const clock = { t: T0 };
  const { handles, recordId, store } = await confirmedAt(clock);
  clock.t = T0 + (CONFIRM_BOUND + 10) * 1000;

  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state'); // §11.2's preamble: the record is now expired

  const last = (await store.readChain(recordId)).at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'expired');
  assert.equal(await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF), null);
  assert.deepEqual(await store.listDue(new Date(clock.t + 1000 * 1000)), [], 'dueAt cleared');
});

test('ENLISTED: redeem(recordId, content, tx) against a due-confirmed record on SqliteStore refuses unredeemable-state with no edge, and an un-enlisted call still resolves it', async () => {
  // The bug this pins (a final-review fix to the third step-3 increment): the clock
  // rung's resolveDueClock call carries NO tx, but on SqliteStore the caller's tx IS the
  // store's own connection with an open transaction — the no-tx append would BEGIN a
  // second transaction on that connection and throw, turning a domain outcome into an
  // adapter throw mid-host-transaction. All three redemption seams reach the shared
  // prologue enlisted (each carries a tx via opts.tx since the effect-result increment);
  // this test pins the direct shape, and the two token-seam twins below pin the others.
  const clock = { t: T0 };
  const store = new SqliteStore(':memory:');
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store }),
    () => new Date(clock.t),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  clock.t = T0 + (CONFIRM_BOUND + 10) * 1000; // past the confirmed window's bound

  const before = await store.readChain(recordId);
  store.database.exec('BEGIN IMMEDIATE');
  const outcome = await handles.operator.redeem(recordId, CONTENT, { tx: store.database });
  assert.equal(store.database.isTransaction, true, "the host's transaction is still open");
  store.database.exec('COMMIT'); // nothing was appended — an empty commit either way

  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state', 'never redemption-timeout on an enlisted call');
  assert.equal(outcome.transitionRef, undefined, 'no edge — the enlisted call appends nothing');
  assert.deepEqual(await store.readChain(recordId), before, 'the chain is untouched');

  // A subsequent UN-ENLISTED call still resolves the window and reports the same
  // terminal truth (loser-agrees-with-reinvocation, extended to the enlisted refusal):
  // the edge lands at the next call that is not enlisted, exactly as §4's lazy rule
  // promises.
  const resolved = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(resolved.status, 'refused');
  if (resolved.status !== 'refused') return;
  assert.equal(resolved.code, 'unredeemable-state');
  const last = (await store.readChain(recordId)).at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'expired');
});

test('ENLISTED: beginRedemption(recordId, content, { tx }) against a due-confirmed record on SqliteStore refuses unredeemable-state with no edge, and an un-enlisted call still resolves it', async () => {
  const clock = { t: T0 };
  const store = new SqliteStore(':memory:');
  const { handles, recordId } = await confirmedAt(clock, store);
  clock.t = T0 + (CONFIRM_BOUND + 10) * 1000; // past the confirmed window's bound

  const before = await store.readChain(recordId);
  store.database.exec('BEGIN IMMEDIATE');
  const outcome = await handles.operator.beginRedemption(recordId, CONTENT, {
    tx: store.database,
  });
  assert.equal(store.database.isTransaction, true, "the host's transaction is still open");
  store.database.exec('COMMIT'); // nothing was appended — an empty commit either way

  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state', 'never redemption-timeout on an enlisted call');
  assert.equal(outcome.transitionRef, undefined, 'no edge — the enlisted call appends nothing');
  assert.deepEqual(await store.readChain(recordId), before, 'the chain is untouched');

  const resolved = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(resolved.status, 'refused');
  if (resolved.status !== 'refused') return;
  assert.equal(resolved.code, 'unredeemable-state');
  assert.equal((await store.readChain(recordId)).at(-1)?.kind, 'expired');
});

test('ENLISTED: completeRedemption(recordId, token, content, { tx }) against a due-redeeming record on SqliteStore refuses unredeemable-state with no edge, and an un-enlisted call still resolves it', async () => {
  const clock = { t: T0 };
  const store = new SqliteStore(':memory:');
  const { handles, recordId, token } = await redeemingAt(clock, store);
  clock.t = T0 + (REDEEM_BOUND + 10) * 1000; // past the redeeming window's bound

  const before = await store.readChain(recordId);
  store.database.exec('BEGIN IMMEDIATE');
  const outcome = await handles.operator.completeRedemption(recordId, token, CONTENT, {
    tx: store.database,
  });
  assert.equal(store.database.isTransaction, true, "the host's transaction is still open");
  store.database.exec('COMMIT');

  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state', 'never redemption-timeout on an enlisted call');
  assert.equal(outcome.transitionRef, undefined, 'no edge — the enlisted call appends nothing');
  assert.deepEqual(await store.readChain(recordId), before, 'the chain is untouched');

  // Un-enlisted re-invocation resolves the window: the edge lands and the caller gets the
  // resolver's own verdict (the ~:239 pin's mapping — redemption-timeout, token dead).
  const resolved = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(resolved.status, 'refused');
  if (resolved.status !== 'refused') return;
  assert.equal(resolved.code, 'redemption-timeout');
  assert.equal((await store.readChain(recordId)).at(-1)?.kind, 'redemption-failed');
});

test('THE UNKNOWN-OUTCOME PIN: a CORRECT token after the redeemBound elapsed — redemption-timeout, edge redemption-failed, token dead', async () => {
  // §11.2: "a `redeeming` bound elapsing with the outcome unknown resolves
  // `redeeming → redemption-failed` with `redemption-timeout`, and an unknown outcome is
  // never retried" — at-most-once over convenience, now an executing pin.
  const clock = { t: T0 };
  const { handles, recordId, store, token } = await redeemingAt(clock);
  clock.t += (REDEEM_BOUND + 10) * 1000;

  const outcome = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'redemption-timeout'); // the RESOLVER reports what this call did

  const chain = await store.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'redemption-failed');
  assert.deepEqual(Object.keys(last.payload as object), ['bound']);

  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'redemption-failed');
  assert.equal(record?.refusalCode, 'redemption-timeout');
  assert.equal(await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF), null);

  // The token is DEAD: a later arrival finds the resolved record — unredeemable-state,
  // and NO second append (the resolver reported; the later arrival only reads).
  const lengthAfterResolution = chain.length;
  const again = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(again.status, 'refused');
  if (again.status !== 'refused') return;
  assert.equal(again.code, 'unredeemable-state');
  assert.equal((await store.readChain(recordId)).length, lengthAfterResolution);
});

test('the clock rung never touches a pure-capture record: elapsed time changes nothing at redeem()', async () => {
  // The rung sits AFTER the effect-seam gate, so a capture-only record — which has no
  // confirmed or redeeming window to be in — refuses exactly as before, with no edge,
  // however far the clock has advanced (the adjacent-pair gate-order discipline).
  const clock = { t: T0 };
  const store = new MemoryStore();
  const handles = createWithClock(
    makeConfig([captureProfile()], { store }),
    () => new Date(clock.t),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const before = (await store.readChain(recordId)).length;

  clock.t = T0 + 400 * HOUR;
  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state');
  assert.equal(
    (await store.readChain(recordId)).length,
    before,
    'no edge on a capture record, ever',
  );
});

test('begin and direct redeem() resolving an elapsed redeeming window also report redemption-timeout', async () => {
  const clock = { t: T0 };
  const a = await redeemingAt(clock);
  clock.t += (REDEEM_BOUND + 10) * 1000;
  const viaBegin = await a.handles.operator.beginRedemption(a.recordId, CONTENT);
  assert.equal(viaBegin.status, 'refused');
  if (viaBegin.status === 'refused') assert.equal(viaBegin.code, 'redemption-timeout');

  const clock2 = { t: T0 };
  const b = await redeemingAt(clock2);
  clock2.t += (REDEEM_BOUND + 10) * 1000;
  const viaDirect = await b.handles.operator.redeem(b.recordId, CONTENT);
  assert.equal(viaDirect.status, 'refused');
  if (viaDirect.status === 'refused') assert.equal(viaDirect.code, 'redemption-timeout');
});

test('§4 exception, now non-vacuous: redeem() on a due-OPEN record refuses with NO edge', async () => {
  const clock = { t: T0 };
  const store = new MemoryStore();
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store }),
    () => new Date(clock.t),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  clock.t = T0 + 400 * HOUR; // far past the open ttl
  const before = (await store.readChain(recordId)).length;

  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state');
  assert.equal(
    (await store.readChain(recordId)).length,
    before,
    'no edge — §4 names this exception',
  );
});

test('verify-first outranks the clock: a tampered chain with an elapsed bound refuses chain-compromise', async () => {
  const clock = { t: T0 };
  const inner = new MemoryStore();
  const { recordId } = await confirmedAt(clock, inner);
  clock.t = T0 + (CONFIRM_BOUND + 10) * 1000;

  const tampering = new TamperingStore(inner, recordId, tamperNonLast);
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store: tampering }),
    () => new Date(clock.t),
  );
  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
});

test('the resolution race: a resolver losing the CAS re-reads and reports the fresh state honestly', async () => {
  // The winner resolves redeeming → redemption-failed first; the loser's own resolution
  // CAS fails, re-reads, finds redemption-failed — unredeemable-state (nothing timed out
  // at the loser's call; the SECOND increment's residual discipline extended to clocks).
  const clock = { t: T0 };
  const inner = new MemoryStore();
  const { handles: _h, recordId, token } = await redeemingAt(clock, inner);
  clock.t += (REDEEM_BOUND + 10) * 1000;

  const racing = new RaceOnceStore(
    inner,
    (expected, t) => expected === 'redeeming' && t.kind === 'redemption-failed',
    async (innerStore, rid) => {
      const chain = await innerStore.readChain(rid);
      const head = chain.at(-1);
      if (head === undefined) throw new Error('fixture: chain has a head');
      const winner = storeNext(head, 'redemption-failed', {
        bound: new Date(clock.t - 10 * 1000).toISOString(),
      });
      const res = await innerStore.appendTransition('redeeming', winner, { nonTerminal: false });
      if (!res.appended) throw new Error('fixture: the winner must land');
      return undefined;
    },
  );
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store: racing }),
    () => new Date(clock.t),
  );
  const loser = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(loser.status, 'refused');
  if (loser.status !== 'refused') return;
  assert.equal(loser.code, 'unredeemable-state');
});

test('finalize on a due-confirmed record resolves it en passant and refuses leg-expired', async () => {
  const clock = { t: T0 };
  const { handles, recordId, store } = await confirmedAt(clock);
  clock.t = T0 + (CONFIRM_BOUND + 10) * 1000;

  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'leg-expired'); // §8: an expired or due-expired record at a decision-progress seam

  const last = (await store.readChain(recordId)).at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'expired');
});

test('finalize on a due-redeeming record resolves it en passant and refuses record-not-open', async () => {
  const clock = { t: T0 };
  const { handles, recordId, store } = await redeemingAt(clock);
  clock.t += (REDEEM_BOUND + 10) * 1000;

  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'record-not-open'); // resolved to redemption-failed: non-open, non-expired

  const last = (await store.readChain(recordId)).at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'redemption-failed');
});

test('open(): a due-CONFIRMED blocker is expired en passant and the fresh open succeeds — §9.1 un-strands the pair', async () => {
  const clock = { t: T0 };
  const { handles, store } = await confirmedAt(clock);
  clock.t = T0 + (CONFIRM_BOUND + 10) * 1000;

  const staged = await handles.agent.stage(
    { subject: 'week-2', total: 41 },
    'test.effect.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const reopened = await handles.operator.open(staged.value.stagedRef);
  assert.equal(reopened.status, 'ok', 'expire-then-retry: the elapsed window releases the pair');
  if (reopened.status !== 'ok') return;

  // Far in the future only the NEW record's own open window pends — the blocker resolved
  // terminal, its dueAt cleared by the resolution append's omission.
  const due = await store.listDue(new Date(clock.t + 400 * HOUR));
  assert.deepEqual(due, [reopened.value.recordId]);
});

test('open(): a due-REDEEMING blocker is NEVER auto-resolved — record-exists, no edge (§4 named exception)', async () => {
  const clock = { t: T0 };
  const { handles, recordId, store } = await redeemingAt(clock);
  clock.t += (REDEEM_BOUND + 10) * 1000;
  const before = (await store.readChain(recordId)).length;

  const staged = await handles.agent.stage(
    { subject: 'week-2', total: 41 },
    'test.effect.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const second = await handles.operator.open(staged.value.stagedRef);
  assert.equal(second.status, 'refused');
  if (second.status !== 'refused') return;
  assert.equal(second.code, 'record-exists');
  assert.equal(
    (await store.readChain(recordId)).length,
    before,
    'no edge — the redemption seam owns that clock',
  );
});

test('seal() on due-confirmed and due-redeeming records refuses unsealable-state with no edge — sweep first, then seal', async () => {
  const clock = { t: T0 };
  const a = await confirmedAt(clock);
  clock.t = T0 + (CONFIRM_BOUND + 10) * 1000;
  const beforeA = (await a.store.readChain(a.recordId)).length;
  const sealA = await a.handles.operator.seal(a.recordId);
  assert.equal(sealA.status, 'refused');
  if (sealA.status === 'refused') assert.equal(sealA.code, 'unsealable-state');
  assert.equal((await a.store.readChain(a.recordId)).length, beforeA);

  const clock2 = { t: T0 };
  const b = await redeemingAt(clock2);
  clock2.t += (REDEEM_BOUND + 10) * 1000;
  const beforeB = (await b.store.readChain(b.recordId)).length;
  const sealB = await b.handles.operator.seal(b.recordId);
  assert.equal(sealB.status, 'refused');
  if (sealB.status === 'refused') assert.equal(sealB.code, 'unsealable-state');
  assert.equal((await b.store.readChain(b.recordId)).length, beforeB);
});

test('the sweep, end to end: listDue names the lost-token record, redeem({}) resolves it, seal() retires it', async () => {
  // §12's sweep: "the operator iterates `listDue(now)` and, per listed record, drives
  // the ordinary mutating seam for that record's pending window" — no append authority
  // of its own; then sweep-first-then-seal (§4, §5). The token is LOST in this scenario
  // — the resolution needs no token and any content serves (the clock rung precedes
  // correspondence).
  const clock = { t: T0 };
  const { handles, recordId } = await redeemingAt(clock); // token deliberately unused: lost
  clock.t += (REDEEM_BOUND + 10) * 1000;

  const due = await handles.operator.listDue();
  assert.deepEqual(due, [recordId]);

  const resolved = await handles.operator.redeem(recordId, {});
  assert.equal(resolved.status, 'refused');
  if (resolved.status !== 'refused') return;
  assert.equal(resolved.code, 'redemption-timeout');

  assert.deepEqual(await handles.operator.listDue(), [], 'resolution cleared the clock');

  const sealed = await handles.operator.seal(recordId);
  assert.equal(sealed.status, 'ok', 'sweep first, then seal — the record is terminal now');
  if (sealed.status !== 'ok') return;
  assert.equal(sealed.value.status, 'retired');
});

class MetaSpyStore extends MemoryStore {
  captured: AppendMeta | undefined;
  override async appendTransition(expected: RecordState | null, t: Transition, meta: AppendMeta) {
    this.captured = meta;
    return super.appendTransition(expected, t, meta);
  }
}

test('resolveDueClock derives the leg index: the expired append is terminal (nonTerminal false) on a final-leg MULTI-LEG effect profile', async () => {
  // The one shape where a hardcoded leg index 0 and the derived index could ever
  // disagree: a due CONFIRMED record on the FINAL leg of a two-leg effect profile. Both
  // derivations feed nonTerminal('expired', flag, true) === false — this pin states the
  // append's meta as a contract, for the day a non-terminal clock edge ever exists.
  const twoLegEffect = {
    ...effectSeamProfile(),
    legs: [
      { id: 'leg-first', allowedAuthorities: ['session:test-app'] },
      { id: 'leg-final', allowedAuthorities: ['session:test-app'] },
    ],
  };
  const resolved = {
    profile: twoLegEffect,
    canonicalizer: (c: unknown) => c,
    effectSeam: true,
    profileDigest: profileDigest(twoLegEffect),
  };

  const genesisBase = storeGenesis('rec-legindex', twoLegEffect.id, 'subject:legindex');
  const genesis = {
    ...genesisBase,
    payload: { ...(genesisBase.payload as Record<string, unknown>), legId: 'leg-final' },
  };
  const confirmed = storeNext(genesis, 'confirmed', { actor: identity() });
  const spy = new MetaSpyStore();
  await spy.appendTransition(null, genesis, { nonTerminal: true });
  await spy.appendTransition('open', confirmed, { nonTerminal: true });
  const chain = await spy.readChain('rec-legindex');
  spy.captured = undefined;

  const past = new Date(Date.parse(confirmed.at) + (CONFIRM_BOUND + 10) * 1000);
  const res = await resolveDueClock(spy, chain, resolved, past);
  assert.equal(res.due, true);
  if (!res.due) return;
  assert.equal(res.window, 'confirmed');
  assert.equal(
    (spy.captured as AppendMeta | undefined)?.nonTerminal,
    false,
    'the expired append is terminal',
  );
  assert.equal((await spy.readChain('rec-legindex')).at(-1)?.kind, 'expired');
});

// === the exact-instant edge: one definition of due (the review's phase 5) ===================
//
// The store's listing gate is `dueAt ≤ now` (SPEC §12, pinned inclusive by the conformance
// suite and due-listing.test.ts). The kernel's resolution once read the same instant as NOT
// yet due, so for one millisecond the sweep listed a record no seam would expire. The kernel
// now agrees with the listing: due when `now >= deadline`, in `resolveDueClock` and in the
// enlisted guard that mirrors it.

test('at now === deadline the store lists the record AND the kernel resolves it; one millisecond earlier neither does', async () => {
  const clock = { t: T0 };
  const { recordId, store } = await confirmedAt(clock);
  const deadline = T0 + CONFIRM_BOUND * 1000;
  const profileForResolved = effectSeamProfile();
  const resolved = {
    profile: profileForResolved,
    canonicalizer: (c: unknown) => c,
    effectSeam: true,
    profileDigest: profileDigest(profileForResolved),
  };
  const chain = await store.readChain(recordId);

  assert.deepEqual(await store.listDue(new Date(deadline - 1)), [], 'not listed one ms early');
  assert.deepEqual(
    await resolveDueClock(store, chain, resolved, new Date(deadline - 1)),
    { due: false },
    'not resolved one ms early',
  );
  assert.deepEqual(await store.listDue(new Date(deadline)), [recordId], 'listed at the instant');
  const res = await resolveDueClock(store, chain, resolved, new Date(deadline));
  assert.equal(res.due, true, 'resolved at the same instant — the kernel agrees with the listing');
  if (!res.due) return;
  assert.equal(res.result.appended, true);
  assert.equal((await store.readChain(recordId)).at(-1)?.kind, 'expired');
});

test('ENLISTED at the exact instant: redeem(tx) at now === deadline refuses unredeemable-state with no edge — the enlisted guard shares the kernel definition of due', async () => {
  const clock = { t: T0 };
  const store = new SqliteStore(':memory:');
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store }),
    () => new Date(clock.t),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  clock.t = T0 + CONFIRM_BOUND * 1000; // exactly the bound — listed as due by the store

  const before = await store.readChain(recordId);
  store.database.exec('BEGIN IMMEDIATE');
  const outcome = await handles.operator.redeem(recordId, CONTENT, { tx: store.database });
  store.database.exec('COMMIT');

  assert.equal(outcome.status, 'refused', 'due at the instant: never a redemption');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state');
  assert.equal(outcome.transitionRef, undefined, 'no edge inside the host transaction');
  assert.deepEqual(await store.readChain(recordId), before, 'the chain is untouched');
});
