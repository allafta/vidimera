// @vidimera/record — seal.test.ts (SPEC §5 "Chain retirement (`sealed` / `retired`)" and
// §12's "Sealing"): the operator-only `seal()` seam and its gate ladder.
//
// The ladder, and why its order is what it is:
//   (1) chain-verify   -> chain-compromise      — §5: "Verification is first"
//   (2) resolve profile -> unknown-profile      — derived-terminality needs the profile
//   (3) already sealed? -> unsealable-state
//   (4) derived-terminal? -> unsealable-state
//   (5) append `sealed` -> unsealable-state on a non-append, else ok
//
// (3) before (4) is a readability choice, not a behavioural one: both map to the same code,
// and a sealed record is STILL derived-terminal (sealing preserves state), so (4) would pass
// and (3) would catch it either way.
//
// ADJACENT-PAIR ORDER TESTS, derived the way finalize-check-order.test.ts derives its own —
// one test per (earlier-rung code, later-rung code) ordered pair that is JOINTLY
// CONSTRUCTIBLE, where the rungs are consecutive. The codes each rung emits:
//   (1) chain-verify    -> chain-compromise    (1 code)
//   (2) profile         -> unknown-profile     (1 code)
//   (3) already sealed  -> unsealable-state    (1 code)
//   (4) terminality     -> unsealable-state    (same code)
//   (5) the append      -> unsealable-state    (same code)
// (1)->(2): NOT jointly constructible. An unconfigured profile is defensive here — a coherent
//   instance always resolves a record it opened — exactly as finalize's own derivation records
//   for its (5)->(6) pair. Excluded, and this comment is why.
// (1)->(3) x1 and (1)->(4) x1: constructible, and both are below. They are the pairs that
//   prove SPEC §5's "Verification is first".
// (3)->(4), (4)->(5): both rungs emit the SAME code, so no ordering between them is
//   observable in an outcome and no test can distinguish them. Excluded.
// Total order-pair tests in this file: 2.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import { create, createWithClock } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Transition } from '../src/types.js';
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

/** Opens and finalizes a capture-only record, leaving it terminal `confirmed`. */
async function confirmedRecord(store: MemoryStore = new MemoryStore()) {
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  return { handles, recordId };
}

test('seal() on a capture-terminal CONFIRMED record retires it', async () => {
  const { handles, recordId } = await confirmedRecord();

  const outcome = await handles.operator.seal(recordId);
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;
  assert.equal(outcome.value.status, 'retired');

  const chain = await handles.operator.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'sealed');
  assert.equal(outcome.value.transitionRef, transitionDigest(last));

  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.status, 'retired');
  assert.equal(record?.state, 'confirmed', 'sealing preserves state');
});

test("seal()'s `sealed` payload carries the chain head it caps", async () => {
  // Redundant-looking against `prevHash`, and deliberately so: SPEC §4's payload table and §5
  // both require it, because after the body is archived or destroyed the sealed transition
  // must stand alone as evidence.
  const { handles, recordId } = await confirmedRecord();
  const before = await handles.operator.readChain(recordId);
  const head = before.at(-1);
  assert.ok(head !== undefined);

  await handles.operator.seal(recordId);

  const sealed = (await handles.operator.readChain(recordId)).at(-1);
  assert.ok(sealed !== undefined);
  assert.deepEqual(sealed.payload, { chainHead: transitionDigest(head) });
  assert.equal(sealed.prevHash, transitionDigest(head));
});

test('seal() on a terminal EXPIRED record retires it', async () => {
  // PINS: gate (4) reads §2's terminality derivation, not `state === 'confirmed'` — `expired` is
  // terminal outright (SPEC §2: "`refused` and `expired` are terminal"), so it seals.
  // Discriminating: an inverted gate (4) refuses `unsealable-state` here instead of appending.
  // §13's end-of-life framing makes this the archetypal seal target, not a corner case.
  // `confirmedRecord()` above cannot serve as the fixture — it produces a `confirmed` record —
  // so the expiry idiom is borrowed from the DUE-but-open test below and from expiry.test.ts:
  // the clock is INJECTED via `createWithClock` and finalize expires the due record en passant
  // (its own rung (2)). Never sleep in a test here.
  const TTL = 3600;
  let nowMs = Date.UTC(2026, 0, 1, 0, 0, 0);
  const clock = () => new Date(nowMs);
  const handles = createWithClock(makeConfig([captureProfile({ ttl: TTL })]), clock);
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  nowMs += (TTL + 1) * 1000; // past the open window
  const lapsed = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(lapsed.status, 'refused', 'fixture: the due record expires en passant');
  assert.equal(
    (await handles.operator.getRecord(recordId))?.state,
    'expired',
    'fixture: the record must be terminal `expired` before the seal',
  );

  const outcome = await handles.operator.seal(recordId);
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;
  assert.equal(outcome.value.status, 'retired');

  const chain = await handles.operator.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'sealed');
  assert.equal(outcome.value.transitionRef, transitionDigest(last));

  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.status, 'retired');
  assert.equal(record?.state, 'expired', 'sealing preserves state');
});

test('seal() on an OPEN record -> unsealable-state, nothing appended', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const before = await handles.operator.readChain(recordId);

  const outcome = await handles.operator.seal(recordId);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unsealable-state');
  assert.equal(outcome.transitionRef, undefined);

  assert.deepEqual(await handles.operator.readChain(recordId), before);
});

test('seal() on an EFFECT-SEAM confirmed record -> unsealable-state (it is non-terminal, awaiting redemption)', async () => {
  // Deferral register row 9's most-corrected claim, pinned: seal() is NOT a release path for
  // the (profile, subject) pair such a record holds. §12 admits seal only against a
  // derived-terminal record, and §2 makes this one non-terminal.
  const handles = create(makeConfig([effectSeamProfile()]));
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');

  const outcome = await handles.operator.seal(recordId);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unsealable-state');
});

test('seal() twice -> the second refuses unsealable-state and appends nothing', async () => {
  const { handles, recordId } = await confirmedRecord();
  assert.equal((await handles.operator.seal(recordId)).status, 'ok');
  const before = await handles.operator.readChain(recordId);

  const second = await handles.operator.seal(recordId);
  assert.equal(second.status, 'refused');
  if (second.status !== 'refused') return;
  assert.equal(second.code, 'unsealable-state');

  assert.deepEqual(await handles.operator.readChain(recordId), before);
});

test('seal() on a DUE-but-open record refuses without expiring it en passant', async () => {
  // SPEC §4's named exception: "`seal()` never appends a clock edge en passant — a record
  // whose bound has elapsed refuses `unsealable-state`, and the operator sweeps first, then
  // seals." open() and finalize() both DO expire en passant, so the omission is what needs
  // proving, not the refusal.
  // The clock is INJECTED via `createWithClock`, the internal test seam every expiry test in
  // this corpus uses (see expiry.test.ts and exclusivity.test.ts). Never sleep in a test here.
  const TTL = 3600;
  let nowMs = Date.UTC(2026, 0, 1, 0, 0, 0);
  const clock = () => new Date(nowMs);
  const store = new MemoryStore();
  const handles = createWithClock(makeConfig([captureProfile({ ttl: TTL })], { store }), clock);
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const before = await handles.operator.readChain(recordId);

  nowMs += (TTL + 1) * 1000; // past the open window

  const outcome = await handles.operator.seal(recordId);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unsealable-state');

  assert.deepEqual(
    await handles.operator.readChain(recordId),
    before,
    'no `expired` edge — seal() must not call expireIfDue',
  );
});

test('seal() on an unknown recordId THROWS (a caller error, not a refusal)', async () => {
  const handles = create(makeConfig([captureProfile()]));
  await assert.rejects(() => handles.operator.seal('rec-does-not-exist'), /unknown recordId/);
});

test('seal() on a tampered chain over a terminal CONFIRMED record -> chain-compromise WITH an appended edge', async () => {
  const inner = new MemoryStore();
  const { recordId } = await confirmedRecord(inner);
  const handles = create(
    makeConfig([captureProfile()], { store: new TamperingStore(inner, recordId, tamperNonLast) }),
  );

  const outcome = await handles.operator.seal(recordId);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
  assert.equal(outcome.class, 'compromise');
  assert.ok(
    outcome.transitionRef !== undefined,
    '§12 C3 admits the edge against terminal `confirmed`',
  );

  const real = await inner.readChain(recordId);
  const last = real.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'refused', 'the compromise edge landed on the real chain');
});

test('seal() on a tampered chain over an ALREADY-SEALED record -> chain-compromise with NO edge', async () => {
  // The only place the two new mechanisms meet. Verification is first (§5), so it outranks
  // `unsealable-state`; and C4 admits nothing, so the compromise surfaces result-first.
  const inner = new MemoryStore();
  const { handles: real, recordId } = await confirmedRecord(inner);
  assert.equal((await real.operator.seal(recordId)).status, 'ok', 'fixture: seal first');
  const before = await inner.readChain(recordId);

  const handles = create(
    makeConfig([captureProfile()], { store: new TamperingStore(inner, recordId, tamperNonLast) }),
  );
  const outcome = await handles.operator.seal(recordId);

  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise', 'verification outranks unsealable-state');
  assert.equal(outcome.transitionRef, undefined, 'C4 admits no edge');
  assert.deepEqual(await inner.readChain(recordId), before, 'nothing landed');
});

test('seal() on a tampered chain over a NON-TERMINAL record -> chain-compromise, not unsealable-state', async () => {
  // Adjacent-pair order test (1)->(4). `tamperNonLast` needs a NON-LAST transition to
  // tamper, and a bare open() leaves a 1-transition chain (genesis only) — nothing precedes
  // its head. A second, state-preserving `consultation-recorded` transition is appended
  // directly to `inner` (mirroring chain-verify.test.ts's own hand-built fixtures) so the
  // chain has something non-last to tamper while the record stays `open` (non-terminal).
  const inner = new MemoryStore();
  const handles0 = create(makeConfig([captureProfile()], { store: inner }));
  const recordId = await openRecord(handles0, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const opened = (await inner.readChain(recordId)).at(-1);
  if (opened === undefined) throw new Error('fixture: opened transition missing');
  const consultation: Transition = {
    recordId,
    seq: 2,
    at: '2026-01-01T00:00:00.000Z',
    kind: 'consultation-recorded',
    payload: {
      kind: 'facts',
      checker: { principal: 'svc:review-surface', authority: 'mtls:review-surface' },
      at: '2026-01-01T00:00:00.000Z',
      payloadDigest: transitionDigest(opened),
      verdict: 'pass',
    },
    prevHash: transitionDigest(opened),
  };
  const fixtureAppend = await inner.appendTransition('open', consultation, { nonTerminal: true });
  assert.equal(fixtureAppend.appended, true, 'fixture: the second transition must append');

  const handles = create(
    makeConfig([captureProfile()], { store: new TamperingStore(inner, recordId, tamperNonLast) }),
  );
  const outcome = await handles.operator.seal(recordId);

  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
});
