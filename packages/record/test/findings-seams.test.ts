// @vidimera/record — findings-seams.test.ts (SPEC §10.2 "The seams (record-then-gate)",
// the second step-7 increment): raiseFinding/acknowledge, the two operator-only calls
// that append the only mid-lifecycle transitions between `opened` and the decision.
// Gate/coverage production paths live in findings.test.ts (where the refusal matrix
// points); THIS file pins the seams: intake throws, the prologue ladder, payload
// minting, the dueAt re-supply, and the non-declaring byte-identity throw.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConfirmProfile, LegSpec } from '../src/config.js';
import { create, createWithClock } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import type { FindingRaisedPayload } from '../src/types.js';
import { storeNext } from './helpers/chain.js';
import {
  captureProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
  tamperNonLast,
} from './helpers/profiles.js';

const SUBJECT = 'subject:seam-1';
const CONTENT = { subject: 'week-1', total: 40 };
const D1 = `sha256:${'1'.repeat(64)}`;
const D2 = `sha256:${'2'.repeat(64)}`;
const RAISER = { principal: 'checker:1', authority: 'mtls:checker' };

/** captureProfile with the leg's findings flow declared (both-or-neither pair). */
function flowProfile(extra?: Partial<LegSpec>): ConfirmProfile {
  const p = captureProfile({ id: 'test.flow.v1' });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  p.legs[0] = { ...leg, ackMode: 'any' as const, requiredAcks: ['variance'], ...extra };
  return p;
}

test('raiseFinding appends: payload key-set exact, at library-stamped, raiser = the identity argument, record stays open', async () => {
  const store = new MemoryStore();
  const t0 = new Date('2026-08-17T10:00:00.000Z');
  const handles = createWithClock(makeConfig([flowProfile()], { store }), () => t0);
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);

  const out = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(out.status, 'ok');
  if (out.status !== 'ok') return;
  assert.equal(out.value.state, 'open');

  const chain = await handles.operator.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'finding-raised');
  assert.equal(last.at, t0.toISOString(), 'the library stamps at — never a host time');
  assert.deepEqual(
    Object.keys(last.payload as Record<string, unknown>).sort(),
    ['findingDigest', 'findingId', 'kind', 'raiser'],
    'magnitude absent from the input is absent from the payload (present-iff-present)',
  );
  assert.deepEqual((last.payload as { raiser: unknown }).raiser, RAISER);

  const rec = await handles.operator.getRecord(recordId);
  assert.equal(rec?.state, 'open');
  assert.equal(rec?.findings?.[0]?.findingId, 'f-1');
});

test('a re-raise updates the version through the seam; a kind-changing re-raise THROWS', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);

  await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1, magnitude: '250 SEK' },
    RAISER,
  );
  const upd = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D2 },
    identity(),
  );
  assert.equal(upd.status, 'ok');
  const rec = await handles.operator.getRecord(recordId);
  const f1 = rec?.findings?.[0];
  assert.equal(f1?.findingDigest, D2, 'current version moved');
  assert.equal(f1 !== undefined && 'magnitude' in f1, false, 'update without magnitude clears it');

  await assert.rejects(
    handles.operator.raiseFinding(
      recordId,
      { findingId: 'f-1', kind: 'CHANGED', findingDigest: D2 },
      RAISER,
    ),
    /kind/i,
  );
});

test('acknowledge appends (stale digests included — fidelity); an ack to an absent findingId THROWS', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);
  await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D2 },
    RAISER,
  );

  const stale = await handles.operator.acknowledge(
    recordId,
    { findingId: 'f-1', findingDigest: D1 },
    identity(),
  );
  assert.equal(stale.status, 'ok', 'a stale digest is recorded anyway and never counts');
  const rec = await handles.operator.getRecord(recordId);
  assert.equal(rec?.findings?.[0]?.acks.length, 1);
  assert.equal(rec?.findings?.[0]?.acks[0]?.findingDigest, D1, 'recorded as supplied — visible');

  await assert.rejects(
    handles.operator.acknowledge(recordId, { findingId: 'f-none', findingDigest: D1 }, identity()),
    /findingId|finding/i,
  );
});

test('intake THROWS at argument depth: malformed finding, malformed ack, malformed identity, unknown key', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);

  const bad = [
    { findingId: '', kind: 'variance', findingDigest: D1 },
    { findingId: 'f-1', kind: '', findingDigest: D1 },
    { findingId: 'f-1', kind: 'variance', findingDigest: '' },
    { findingId: 'f-1', kind: 'variance', findingDigest: D1, magnitude: 7 },
    { findingId: 'f-1', kind: 'variance', findingDigest: D1, extra: 'x' },
  ];
  for (const finding of bad) {
    await assert.rejects(
      handles.operator.raiseFinding(recordId, finding as never, RAISER),
      /finding|magnitude|key/i,
    );
  }
  await assert.rejects(
    handles.operator.acknowledge(
      recordId,
      { findingId: 'f-1', findingDigest: D1, kind: 'x' } as never,
      identity(),
    ),
    /key|ack/i,
  );
  await assert.rejects(
    handles.operator.raiseFinding(
      recordId,
      { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
      { principal: '', authority: 'mtls:x' },
    ),
    /identity|principal/i,
  );
  // Nothing appended by any throw above:
  const chain = await handles.operator.readChain(recordId);
  assert.equal(chain.length, 1, 'intake throws are pre-record: the chain is untouched');
});

test('a NON-declaring leg THROWS at both seams and its chain stays byte-identical (no append)', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', SUBJECT);
  const before = await handles.operator.readChain(recordId);

  await assert.rejects(
    handles.operator.raiseFinding(
      recordId,
      { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
      RAISER,
    ),
    /findings flow|declar/i,
  );
  await assert.rejects(
    handles.operator.acknowledge(recordId, { findingId: 'f-1', findingDigest: D1 }, identity()),
    /findings flow|declar/i,
  );
  const after = await handles.operator.readChain(recordId);
  assert.deepEqual(after, before, 'SPEC §10.2: byte-identical to a pre-findings implementation');
});

test('a NON-declaring leg over a HASH-BROKEN chain refuses chain-compromise at both seams and APPENDS — rung (1) beats the declaring check', async () => {
  // Complements the test immediately above ('a NON-declaring leg THROWS…'), not a
  // contradiction of it: that test drives an INTACT chain, where the declaring check (2.5)
  // is reachable and throws first; this one drives a BROKEN chain, where rung (1)
  // (chain-verify, SPEC §5) never lets control reach the declaring check at all. Chain
  // integrity is the discriminator between the two.
  //
  // This is Finding E's corner (docs/analysis/2026-08-23-signature-enforcement-coverage.md),
  // adjudicated: not a defect — the declaring check's byte-identity message is scoped to
  // the findings feature's own keys/transitions (SPEC §4), and a universal §5
  // chain-compromise edge sits outside that scope. `kernel/decline.ts` carries the
  // identical twin, pinned by its own corner test in decline.test.ts.
  const genesisStore = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store: genesisStore }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', SUBJECT);
  const genesis = (await handles.operator.readChain(recordId))[0];
  if (genesis === undefined) throw new Error('fixture: genesis exists after openRecord');
  const seeded: FindingRaisedPayload = {
    findingId: 'f-seed',
    kind: 'variance',
    findingDigest: D2,
    raiser: RAISER,
  };
  // tamperNonLast needs >= 2 transitions to tamper a NON-last one — a second, honestly
  // chained transition is built by hand onto the real genesis, same idiom the compromise
  // test below uses for its own (declaring) fixture.
  const good = [genesis, storeNext(genesis, 'finding-raised', seeded)];

  const store1 = new MemoryStore();
  for (const [i, t] of tamperNonLast(good).entries()) {
    await store1.appendTransition(i === 0 ? null : 'open', t, { nonTerminal: true });
  }
  const h1 = create(makeConfig([captureProfile()], { store: store1 }));
  const beforeRaise = await h1.operator.readChain(recordId);
  // No throw here is the whole point: had the declaring check run first, this call would
  // have thrown (as the test above pins over an intact chain) instead of returning a refusal.
  const raise = await h1.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(raise.status, 'refused');
  if (raise.status === 'refused') {
    assert.equal(raise.code, 'chain-compromise');
    assert.equal(raise.transitionRef, await store1.chainHead(recordId)); // an open record admits the edge — ref = its digest
  }
  const afterRaise = await h1.operator.readChain(recordId);
  assert.equal(afterRaise.length, beforeRaise.length + 1);
  assert.equal(afterRaise.at(-1)?.kind, 'refused');

  // A second, independent tampered copy: acknowledge is cheap to pin on the same fixture,
  // and its OWN findingId-existence check (rung 4) never runs either — rung (1) still wins.
  const store2 = new MemoryStore();
  for (const [i, t] of tamperNonLast(good).entries()) {
    await store2.appendTransition(i === 0 ? null : 'open', t, { nonTerminal: true });
  }
  const h2 = create(makeConfig([captureProfile()], { store: store2 }));
  const beforeAck = await h2.operator.readChain(recordId);
  const ackOut = await h2.operator.acknowledge(
    recordId,
    { findingId: 'f-1', findingDigest: D1 },
    identity(),
  );
  assert.equal(ackOut.status, 'refused');
  if (ackOut.status === 'refused') {
    assert.equal(ackOut.code, 'chain-compromise');
    assert.equal(ackOut.transitionRef, await store2.chainHead(recordId)); // an open record admits the edge — ref = its digest
  }
  const afterAck = await h2.operator.readChain(recordId);
  assert.equal(afterAck.length, beforeAck.length + 1);
  assert.equal(afterAck.at(-1)?.kind, 'refused');
});

test('the prologue: chain-compromise outranks everything; expired refuses leg-expired; confirmed refuses record-not-open (never-append)', async () => {
  // Tampered chain -> chain-compromise (both seams). Seed a store with a tampered copy
  // of a valid chain (the seal/finalize compromise-fixture pattern). `tamperNonLast`
  // needs >= 2 transitions to tamper a NON-last one, but the real genesis-only chain
  // (right after open()) has just one — so a second, honestly-chained transition is
  // built by hand (`storeNext`, the same helper the Store-conformance suite uses) onto
  // the REAL genesis, entirely in this standalone copy. The ORIGINAL store/handles below
  // are never touched by it — the later "Confirmed" section's vacuous-pass precondition
  // (no finding raised on the real record) still holds.
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);
  const genesis = (await handles.operator.readChain(recordId))[0];
  if (genesis === undefined) throw new Error('fixture: genesis exists after openRecord');
  const seeded: FindingRaisedPayload = {
    findingId: 'f-seed',
    kind: 'variance',
    findingDigest: D2,
    raiser: RAISER,
  };
  const good = [genesis, storeNext(genesis, 'finding-raised', seeded)];
  const tamperedStore = new MemoryStore();
  for (const [i, t] of tamperNonLast(good).entries()) {
    await tamperedStore.appendTransition(i === 0 ? null : 'open', t, { nonTerminal: true });
  }
  const h2 = create(makeConfig([flowProfile()], { store: tamperedStore }));
  const raise = await h2.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(raise.status, 'refused');
  if (raise.status === 'refused') assert.equal(raise.code, 'chain-compromise');
  const ackOut = await h2.operator.acknowledge(
    recordId,
    { findingId: 'f-1', findingDigest: D1 },
    identity(),
  );
  assert.equal(ackOut.status, 'refused');
  if (ackOut.status === 'refused') assert.equal(ackOut.code, 'chain-compromise');

  // Confirmed -> record-not-open, never-append. (flowProfile declares requiredAcks
  // ['variance'] and no finding was raised: the coverage gate passes vacuously — the
  // TRUE-vacuous pin rides here.)
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const lenBefore = (await handles.operator.readChain(recordId)).length;
  const late = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(late.status, 'refused');
  if (late.status === 'refused') assert.equal(late.code, 'record-not-open');
  assert.equal((await handles.operator.readChain(recordId)).length, lenBefore, 'never-append');
});

test('a due-open record: the seam appends the expired edge en passant and refuses leg-expired', async () => {
  const store = new MemoryStore();
  let now = new Date('2026-08-17T10:00:00.000Z');
  const handles = createWithClock(makeConfig([flowProfile()], { store }), () => now);
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);
  now = new Date('2026-08-17T12:00:01.000Z'); // past the helper's default ttl
  const out = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'leg-expired');
  const rec = await handles.operator.getRecord(recordId);
  assert.equal(rec?.state, 'expired', 'the en-passant edge landed');

  // And an ALREADY-expired record refuses leg-expired with no further append:
  const lenAfter = (await handles.operator.readChain(recordId)).length;
  const again = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-2', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(again.status, 'refused');
  if (again.status === 'refused') assert.equal(again.code, 'leg-expired');
  assert.equal((await handles.operator.readChain(recordId)).length, lenAfter);
});

test('the dueAt re-supply pin: a raised-on record still lists as due at its open deadline', async () => {
  const store = new MemoryStore();
  let now = new Date('2026-08-17T10:00:00.000Z');
  const handles = createWithClock(makeConfig([flowProfile()], { store }), () => now);
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);

  now = new Date('2026-08-17T10:05:00.000Z'); // open, not due
  const out = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(out.status, 'ok');

  now = new Date('2026-08-17T12:00:01.000Z'); // past the open deadline
  const due = await handles.operator.listDue();
  assert.ok(
    due.includes(recordId),
    `SPEC §12: "present sets the record's pending-clock column, absent clears it" — the ` +
      'seam re-supplied dueAt, so the sweep still sees the open window',
  );
});

test('both seams admit an authority outside allowedAuthorities while finalize and decline refuse that same identity — deciders and informers are different populations', async () => {
  // The review's phase 2 ruling, pinned where the asymmetry lives: rung (3) of the two
  // decision seams reads the leg's `allowedAuthorities` (SPEC §6); the findings seams read
  // only the identity's shape (`validateSeamIdentity`), because a raiser or acker is the
  // host's informing population — the review-surface checker's kind, "informs, never
  // decides" — and listing them as deciders would widen who may confirm.
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile({ decline: true })], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);
  const unlisted = { principal: 'auditor:9', authority: 'oidc:unlisted' };

  const raised = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    unlisted,
  );
  assert.equal(raised.status, 'ok', 'raiseFinding admits the unlisted authority');
  const acked = await handles.operator.acknowledge(
    recordId,
    { findingId: 'f-1', findingDigest: D1 },
    unlisted,
  );
  assert.equal(acked.status, 'ok', 'acknowledge admits the unlisted authority');

  const confirm = await handles.operator.finalize(recordId, unlisted, CONTENT, facts());
  assert.equal(confirm.status, 'refused');
  if (confirm.status === 'refused') assert.equal(confirm.code, 'identity-authority-refused');
  const declined = await handles.operator.decline(recordId, unlisted, CONTENT, facts());
  assert.equal(declined.status, 'refused');
  if (declined.status === 'refused') assert.equal(declined.code, 'identity-authority-refused');

  assert.deepEqual(
    (await handles.operator.readChain(recordId)).map((t) => t.kind),
    ['opened', 'finding-raised', 'acknowledged'],
    'the informing appends landed; the two decision refusals appended nothing (default leg)',
  );
});

test('two concurrent raiseFinding calls on one record: the loser refuses record-contended — the record is still open, so record-not-open would be false of it', async () => {
  // The review's second round: phase 1 fixed the batch seams' seq loss but the single-append
  // seams kept mapping EVERY lost CAS to record-not-open. A seq loss means the state did not
  // move — the record is open, intact, and now carries the winner's finding — so the loser gets
  // the same `record-contended` refusal the batch seams return, and re-invocation lands its own finding.
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);

  const [a, b] = await Promise.all([
    handles.operator.raiseFinding(
      recordId,
      { findingId: 'f-a', kind: 'variance', findingDigest: D1 },
      RAISER,
    ),
    handles.operator.raiseFinding(
      recordId,
      { findingId: 'f-b', kind: 'variance', findingDigest: D2 },
      RAISER,
    ),
  ]);
  const outcomes = [a, b];
  const landed = outcomes.filter((o) => o.status === 'ok');
  const contended = outcomes.filter((o) => o.status === 'refused');
  assert.equal(landed.length, 1, 'exactly one finding lands');
  assert.equal(
    contended.length,
    1,
    'exactly one call loses the seq race — and REFUSES, never throws',
  );
  const loser = contended[0];
  assert.ok(loser !== undefined && loser.status === 'refused');
  if (loser?.status !== 'refused') return;
  assert.equal(loser.code, 'record-contended');
  assert.equal(loser.class, 'refusal');
  assert.equal(loser.transitionRef, undefined, 'never appends — nothing of the losing call landed');
  assert.equal(
    (await handles.operator.getRecord(recordId))?.state,
    'open',
    'still open — record-not-open would have lied',
  );

  // Re-invocation of the loser lands, chained after the winner's finding.
  const again = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-b', kind: 'variance', findingDigest: D2 },
    RAISER,
  );
  assert.equal(again.status, 'ok');
  assert.deepEqual(
    (await handles.operator.readChain(recordId)).map((t) => t.kind),
    ['opened', 'finding-raised', 'finding-raised'],
  );
});

test('two concurrent acknowledgments of one finding: the loser refuses record-contended and re-invocation lands its ack', async () => {
  // `acknowledge` is the fourth producer of the code and the only one no earlier pin raced —
  // the raiseFinding race above covers the seam's sibling, not this call (the record-contended
  // increment; the spec review found the gap).
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);
  const raised = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(raised.status, 'ok');

  const [a, b] = await Promise.all([
    handles.operator.acknowledge(recordId, { findingId: 'f-1', findingDigest: D1 }, identity()),
    handles.operator.acknowledge(
      recordId,
      { findingId: 'f-1', findingDigest: D1 },
      identity({ principal: 'approver:2' }),
    ),
  ]);
  const outcomes = [a, b];
  assert.equal(outcomes.filter((o) => o.status === 'ok').length, 1, 'exactly one ack lands');
  const loser = outcomes.find((o) => o.status === 'refused');
  assert.ok(loser !== undefined && loser.status === 'refused', 'the other REFUSES, never throws');
  if (loser?.status !== 'refused') return;
  assert.equal(loser.code, 'record-contended');
  assert.equal(loser.transitionRef, undefined);
  assert.equal((await handles.operator.getRecord(recordId))?.state, 'open');

  const again = await handles.operator.acknowledge(
    recordId,
    { findingId: 'f-1', findingDigest: D1 },
    identity({ principal: 'approver:2' }),
  );
  assert.equal(again.status, 'ok', 're-invocation lands against the new head');
  assert.deepEqual(
    (await handles.operator.readChain(recordId)).map((t) => t.kind),
    ['opened', 'finding-raised', 'acknowledged', 'acknowledged'],
  );
});
