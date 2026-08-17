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
    'SPEC §12: "present sets the record\'s pending-clock column, absent clears it" — the ' +
      'seam re-supplied dueAt, so the sweep still sees the open window',
  );
});
