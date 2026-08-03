// @vidimera/record — expiry.test.ts (design §5 "finalize() check order" state/expiry gate
// / §9 "record-not-open core code (M-B)" / §6 expiry test): finalize()'s state/expiry gate
// (after chain-verify, before any append) on an intact chain resolves:
//   - a DUE-open record → en-passant CAS-append `expired`, then `leg-expired` (the expiry
//     edge is the only append; the leg-expired refusal itself carries NO transitionRef);
//   - an already-`expired` record → `leg-expired` (no append);
//   - `state !== 'open'` (confirmed / refused) → `record-not-open` (no append, no
//     transitionRef) — the three M-B cases: double-finalize on a capture-terminal confirmed
//     record, finalize on an effect-seam confirmed record awaiting redemption, and finalize
//     on a refused record.
// The clock is injected via createWithClock (internal test seam) so lapse is deterministic
// with NO sleeps.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create, createWithClock } from '../src/create.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const PROFILE_ID = 'test.capture.v1';
const CONTENT = { subject: 'week-1', total: 40 };
const TTL = 3600; // 1h
const T0 = '2026-07-24T00:00:00.000Z';
const T_DEADLINE = '2026-07-24T01:00:00.000Z';
const T_LATE = '2026-07-24T02:00:00.000Z';

// === due-open record → en-passant expired + leg-expired ===============================

test('finalize() against a DUE-open record en-passant expires it, then refuses leg-expired (no transitionRef; the expiry edge is the only append)', async () => {
  let clockNow = new Date(T0);
  const clock = () => clockNow;
  const handles = createWithClock(makeConfig([captureProfile({ ttl: TTL })]), clock);
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  clockNow = new Date(T_LATE); // past the open window
  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'leg-expired');
  assert.equal(outcome.class, 'refusal');
  assert.equal(
    outcome.transitionRef,
    undefined,
    'leg-expired carries no transitionRef (the expired edge is not a refused edge)',
  );

  // The record gained exactly one `expired` transition (the en-passant expiry), not a `refused` one.
  const chain = await handles.operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'expired'],
  );
  const expiredTransition = chain[1];
  if (expiredTransition === undefined)
    throw new Error(
      'expiry.test.ts: chain[1] missing — the en-passant expiry must have appended a second transition',
    );
  assert.equal((expiredTransition.payload as { bound: string }).bound, T_DEADLINE);
  assert.equal((await handles.operator.getRecord(recordId))?.state, 'expired');
});

test('finalize() against an ALREADY-expired record → leg-expired, no append', async () => {
  let clockNow = new Date(T0);
  const clock = () => clockNow;
  const handles = createWithClock(makeConfig([captureProfile({ ttl: TTL })]), clock);
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  clockNow = new Date(T_LATE);
  await handles.operator.finalize(recordId, identity(), CONTENT, facts()); // expires it (chain: [opened, expired])
  const lengthAfterFirst = (await handles.operator.readChain(recordId)).length;
  assert.equal(lengthAfterFirst, 2);

  // A second finalize sees state==='expired' at the gate → leg-expired, NO new append.
  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'leg-expired');
  assert.equal(outcome.transitionRef, undefined);
  assert.equal(
    (await handles.operator.readChain(recordId)).length,
    2,
    'an already-expired record gains no further append',
  );
});

// === M-B: state !== 'open' (confirmed / refused) → record-not-open =====================

test('M-B: double-finalize on a capture-terminal CONFIRMED record → record-not-open (no append, no transitionRef)', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const first = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(first.status, 'ok');
  const lengthAfterConfirm = (await handles.operator.readChain(recordId)).length;
  assert.equal(lengthAfterConfirm, 4, '[opened, chain-verify, facts, confirmed]');

  const second = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(second.status, 'refused');
  if (second.status !== 'refused') return;
  assert.equal(second.code, 'record-not-open');
  assert.equal(second.class, 'refusal');
  assert.equal(second.transitionRef, undefined);
  assert.equal(
    (await handles.operator.readChain(recordId)).length,
    4,
    'a re-finalize appends nothing',
  );
});

test('M-B: finalize on an effect-seam CONFIRMED record awaiting redemption → record-not-open (no append)', async () => {
  const handles = create(makeConfig([effectSeamProfile()]));
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);

  const first = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(first.status, 'ok');
  if (first.status !== 'ok') return;
  assert.equal(first.value.state, 'confirmed');
  const lengthAfterConfirm = (await handles.operator.readChain(recordId)).length;

  const second = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(second.status, 'refused');
  if (second.status !== 'refused') return;
  assert.equal(second.code, 'record-not-open');
  assert.equal(second.transitionRef, undefined);
  assert.equal(
    (await handles.operator.readChain(recordId)).length,
    lengthAfterConfirm,
    'no append on a confirmed-awaiting-redemption record',
  );
});

test('M-B: finalize on a REFUSED record → record-not-open (no append)', async () => {
  // Drive the record into a refused terminal state via a terminalRefusals:[content-drift] leg.
  const handles = create(makeConfig([captureProfile({ terminalRefusals: ['content-drift'] })]));
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const drift = await handles.operator.finalize(
    recordId,
    identity(),
    { subject: 'week-1', total: 999 },
    facts(),
  );
  assert.equal(drift.status, 'refused');
  if (drift.status !== 'refused') return;
  assert.equal(drift.code, 'content-drift');
  assert.equal((await handles.operator.getRecord(recordId))?.state, 'refused');
  assert.equal((await handles.operator.readChain(recordId)).length, 2);

  // A subsequent finalize (even with correct content) sees state==='refused' → record-not-open.
  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'record-not-open');
  assert.equal(outcome.transitionRef, undefined);
  assert.equal(
    (await handles.operator.readChain(recordId)).length,
    2,
    'a finalize on a refused record appends nothing',
  );
});
