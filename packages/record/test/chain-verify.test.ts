// @vidimera/record — chain-verify.test.ts (SPEC §5 "Chaining & replay/verify" /
// "Mandatory pre-seam chain-verify"): finalize()'s
// FIRST step after loading the chain is a pre-seam chain-verify sharing ONE replay/
// verifyChain core with the operator `verifyChain()` audit wrapper.
//   - clean verify → a `verdict:'pass'` `chain-verify` consultation is appended as the FIRST
//     element of the success batch [chain-verify, facts, confirmed];
//   - a DETECTED BREAK → NO chain-verify consultation; finalize refuses `chain-compromise`
//     (class compromise) and appends ONE `refused` edge at head via NORMAL C2 (seq=max+1,
//     prevHash=chainHead) — `open→refused` for an unconfirmed record, and `confirmed→refused`
//     via the C3 carve-out for an already-confirmed effect-seam record whose chain carries a
//     post-confirmed NON-LAST tamper. The `refused` payload is `{code}`-only; verifyChain
//     still reports only the ORIGINAL tamper's firstBreakSeq (no verifyChain carve-out).
// All tamper fixtures tamper a NON-LAST transition (last-element tamper is the AL1 blind spot).

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { verifyChain } from '../src/chain/replay.js';
import { create } from '../src/create.js';
import { isFinalLeg, nonTerminal } from '../src/nonterminal.js';
import { profileDigest } from '../src/profile-digest.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Consultation } from '../src/types.js';
import { buildChain } from './helpers/chain.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
  tamperAt,
  tamperNonLast,
} from './helpers/profiles.js';
import { TamperingStore } from './helpers/stores.js';

const PROFILE_ID = 'test.capture.v1';
const CONTENT = { subject: 'week-1', total: 40 };

function aConsultation(payloadDigest: string): Consultation {
  return {
    kind: 'facts',
    checker: { principal: 'svc:review-surface', authority: 'mtls:review-surface' },
    at: '2026-07-24T00:30:00.000Z',
    payloadDigest,
    verdict: 'pass',
  };
}

// === clean verify: chain-verify consultation is the FIRST success-batch element (SPEC §5) ===

test('a clean pre-seam verify appends a verdict:pass chain-verify consultation as the FIRST success-batch element', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);
  const headBefore = await handles.operator.chainHead(recordId);

  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;

  const chain = await handles.operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'consultation-recorded', 'consultation-recorded', 'confirmed'],
  );
  const firstTransition = chain[1];
  if (firstTransition === undefined)
    throw new Error(
      'chain-verify.test.ts: chain[1] missing — clean-verify success batch must carry index 1',
    );
  const first = firstTransition.payload as Consultation;
  assert.equal(
    first.kind,
    'chain-verify',
    'the chain-verify consultation is FIRST in the batch (before facts)',
  );
  assert.equal(first.verdict, 'pass');
  assert.equal(first.payloadDigest, headBefore, 'payloadDigest = the verified head');
  const secondTransition = chain[2];
  if (secondTransition === undefined)
    throw new Error(
      'chain-verify.test.ts: chain[2] missing — clean-verify success batch must carry index 2',
    );
  const second = secondTransition.payload as Consultation;
  assert.equal(second.kind, 'facts', 'facts consultation is second');
});

// === detected break, UNCONFIRMED (open) record → open→refused, {code}-only ============

test('a tampered chain on an UNCONFIRMED (open) record: NO chain-verify consultation, ONE refused edge at head (open→refused) via normal C2', async () => {
  const inner = new MemoryStore();
  const profile = captureProfile();
  const leg = profile.legs[0];
  if (leg === undefined)
    throw new Error(
      'chain-verify.test.ts: profile.legs[0] missing — captureProfile() must have at least one leg',
    );
  const legId = leg.id;
  const recordId = 'rec-compromise-open';
  const openedPayload = {
    profileId: profile.id,
    profileDigest: profileDigest(profile),
    legId,
    subjectRef: DEFAULT_SUBJECT_REF,
    contentDigest: 'sha256:aaaa',
  };
  // [opened, consultation-recorded] — state stays 'open' (a 2-transition chain we can tamper non-last).
  const chain = buildChain(recordId, [
    { kind: 'opened', payload: openedPayload },
    { kind: 'consultation-recorded', payload: aConsultation('sha256:bbbb') },
  ]);
  const openedTransition = chain[0];
  const consultationTransition = chain[1];
  if (openedTransition === undefined || consultationTransition === undefined) {
    throw new Error('chain-verify.test.ts: buildChain must return transitions at index 0 and 1');
  }
  const openNT = nonTerminal('open', isFinalLeg(0, 1), false); // true
  assert.equal((await inner.appendTransition(null, openedTransition, openNT)).appended, true);
  assert.equal(
    (await inner.appendTransition('open', consultationTransition, openNT)).appended,
    true,
  );

  const store = new TamperingStore(inner, recordId, (c) => tamperNonLast(c)); // tamper the opened (index 0)
  const { operator } = create(makeConfig([profile], { store }));

  // Sanity: the tampered chain finalize sees IS detected as broken, with firstBreakSeq 2.
  const originalReport = verifyChain(await store.readChain(recordId));
  assert.equal(originalReport.intact, false);
  if (originalReport.intact !== false) return;
  assert.equal(originalReport.firstBreakSeq, 2, 'a tamper at seq 1 (opened) is caught at seq 2');

  const outcome = await operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
  assert.equal(outcome.class, 'compromise');
  assert.ok(
    outcome.transitionRef,
    'chain-compromise ALWAYS carries the appended refused edge digest',
  );

  // The REAL persisted chain gained exactly ONE transition — a `refused` edge, NO chain-verify consultation.
  const real = await inner.readChain(recordId);
  assert.deepEqual(
    real.map((t) => t.kind),
    ['opened', 'consultation-recorded', 'refused'],
  );
  const refusedTransition = real[2];
  if (refusedTransition === undefined)
    throw new Error(
      'chain-verify.test.ts: real[2] missing — the compromise refused edge must have landed at index 2',
    );
  assert.deepEqual(
    refusedTransition.payload,
    { code: 'chain-compromise' },
    'refused payload is {code}-only (no self-identifying field)',
  );
  assert.equal(refusedTransition.seq, 3, 'normal C2: seq = max+1');
  assert.equal(
    outcome.transitionRef,
    await inner.chainHead(recordId),
    'transitionRef = the appended refused edge digest',
  );

  // verifyChain still reports ONLY the ORIGINAL tamper's firstBreakSeq (no verifyChain carve-out).
  const afterReport = await operator.verifyChain(recordId);
  assert.equal(afterReport.intact, false);
  if (afterReport.intact !== false) return;
  assert.equal(
    afterReport.firstBreakSeq,
    2,
    'the refused append does not change the reported original break',
  );
});

// === detected break on a CONFIRMED effect-seam record → confirmed→refused (SPEC §5's
// === admission rule) ===

test('a post-confirmed NON-LAST tamper on a CONFIRMED effect-seam record: confirmed→refused via the C3 carve-out', async () => {
  const inner = new MemoryStore();
  const profile = effectSeamProfile(); // effect-seam ⇒ confirmed is NON-terminal
  const leg = profile.legs[0];
  if (leg === undefined)
    throw new Error(
      'chain-verify.test.ts: profile.legs[0] missing — effectSeamProfile() must have at least one leg',
    );
  const legId = leg.id;
  const recordId = 'rec-compromise-confirmed';
  const openedPayload = {
    profileId: profile.id,
    profileDigest: profileDigest(profile),
    legId,
    subjectRef: DEFAULT_SUBJECT_REF,
    contentDigest: 'sha256:cccc',
  };
  // [opened, confirmed, consultation-recorded] — state confirmed; confirmed is a NON-LAST
  // transition we can tamper (a post-confirmed tamper) and still have verifyChain detect it.
  const chain = buildChain(recordId, [
    { kind: 'opened', payload: openedPayload },
    { kind: 'confirmed', payload: { actor: identity() } },
    { kind: 'consultation-recorded', payload: aConsultation('sha256:dddd') },
  ]);
  const openedTransition = chain[0];
  const confirmedTransition = chain[1];
  const consultationTransition = chain[2];
  if (
    openedTransition === undefined ||
    confirmedTransition === undefined ||
    consultationTransition === undefined
  ) {
    throw new Error('chain-verify.test.ts: buildChain must return transitions at index 0, 1 and 2');
  }
  const openNT = nonTerminal('open', isFinalLeg(0, 1), true); // true
  const confirmedNT = nonTerminal('confirmed', isFinalLeg(0, 1), true); // true (effect seam, non-terminal)
  assert.equal((await inner.appendTransition(null, openedTransition, openNT)).appended, true);
  assert.equal(
    (await inner.appendTransition('open', confirmedTransition, confirmedNT)).appended,
    true,
  );
  assert.equal(
    (await inner.appendTransition('confirmed', consultationTransition, confirmedNT)).appended,
    true,
  );

  const store = new TamperingStore(inner, recordId, (c) => tamperAt(c, 1)); // tamper the confirmed (index 1, non-last)
  const { operator } = create(makeConfig([profile], { store }));

  const originalReport = verifyChain(await store.readChain(recordId));
  assert.equal(originalReport.intact, false);
  if (originalReport.intact !== false) return;
  assert.equal(originalReport.firstBreakSeq, 3, 'a tamper at seq 2 (confirmed) is caught at seq 3');

  const outcome = await operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
  assert.equal(outcome.class, 'compromise');
  assert.ok(outcome.transitionRef);

  // The real chain gained a confirmed→refused edge via the C3 carve-out; {code}-only payload.
  const real = await inner.readChain(recordId);
  assert.deepEqual(
    real.map((t) => t.kind),
    ['opened', 'confirmed', 'consultation-recorded', 'refused'],
  );
  const refusedTransition = real[3];
  if (refusedTransition === undefined)
    throw new Error(
      'chain-verify.test.ts: real[3] missing — the C3 carve-out refused edge must have landed at index 3',
    );
  assert.deepEqual(refusedTransition.payload, { code: 'chain-compromise' });
  assert.equal(refusedTransition.seq, 4);
  assert.equal(
    (await operator.getRecord(recordId))?.state,
    'refused',
    'the record folds to refused after the carve-out edge',
  );

  const afterReport = await operator.verifyChain(recordId);
  assert.equal(afterReport.intact, false);
  if (afterReport.intact !== false) return;
  assert.equal(afterReport.firstBreakSeq, 3, 'verifyChain still reports only the original tamper');
});

// === C3-forced no-append corner: tampered chain on an ALREADY-TERMINAL (expired) record ===
// The C3-forced exception to "compromise always appends" (SPEC §5: against an
// already-terminal `expired`/`refused` record "no edge is admitted, and the compromise
// is surfaced result-first with no transition reference"): an ORDINARILY REACHABLE
// corner — an ordinary non-last
// payload tamper on a record whose REAL persisted state is already TERMINAL (expired here;
// refused is the analogous case) — where NONE of the CAS candidates is admitted. The tampered
// chain still replays to 'expired' (kinds survive a payload-only tamper), so the candidate
// list is ['expired','open','confirmed']: 'expired' passes the state CAS but is rejected by
// the Store's C3 compromise carve-out (it only admits expected 'confirmed'/'redeeming'), and
// 'open'/'confirmed' state-mismatch against the record's true 'expired' state. Adjudicated
// as the correct fail-safe horn of an apparent contradiction between "compromise always
// appends" and C3's carve-out scope — do NOT change this behavior: this test pins that the
// corner IS reachable, not a dead branch.
test('a tampered chain on an ALREADY-EXPIRED record: NO candidate CAS target is admitted — chain-compromise with NO append, NO transitionRef (C3-forced corner)', async () => {
  const inner = new MemoryStore();
  const profile = captureProfile();
  const leg = profile.legs[0];
  if (leg === undefined)
    throw new Error(
      'chain-verify.test.ts: profile.legs[0] missing — captureProfile() must have at least one leg',
    );
  const legId = leg.id;
  const recordId = 'rec-compromise-expired';
  const openedPayload = {
    profileId: profile.id,
    profileDigest: profileDigest(profile),
    legId,
    subjectRef: DEFAULT_SUBJECT_REF,
    contentDigest: 'sha256:eeee1',
  };
  // [opened, expired] — a due-open record that has already en-passant expired (REAL
  // persisted state 'expired', terminal). The `opened` transition (index 0) is non-last and
  // tamperable.
  const chain = buildChain(recordId, [
    { kind: 'opened', payload: openedPayload },
    { kind: 'expired', payload: { bound: '2026-07-24T01:00:00.000Z' } },
  ]);
  const openedTransition = chain[0];
  const expiredTransition = chain[1];
  if (openedTransition === undefined || expiredTransition === undefined) {
    throw new Error('chain-verify.test.ts: buildChain must return transitions at index 0 and 1');
  }
  const openNT = nonTerminal('open', isFinalLeg(0, 1), false); // true
  const expiredNT = nonTerminal('expired', isFinalLeg(0, 1), false); // false — terminal
  assert.equal((await inner.appendTransition(null, openedTransition, openNT)).appended, true);
  assert.equal((await inner.appendTransition('open', expiredTransition, expiredNT)).appended, true);

  const beforeLength = (await inner.readChain(recordId)).length;
  const beforeHead = await inner.chainHead(recordId);

  const store = new TamperingStore(inner, recordId, (c) => tamperNonLast(c)); // tamper the opened (index 0)
  const { operator } = create(makeConfig([profile], { store }));

  // Sanity: the tampered chain finalize sees IS detected as broken.
  const originalReport = verifyChain(await store.readChain(recordId));
  assert.equal(originalReport.intact, false);
  if (originalReport.intact !== false) return;
  assert.equal(originalReport.firstBreakSeq, 2, 'a tamper at seq 1 (opened) is caught at seq 2');

  const outcome = await operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
  assert.equal(outcome.class, 'compromise');
  assert.equal(
    outcome.transitionRef,
    undefined,
    'C3-forced corner: no candidate CAS target is admitted, so there is no appended edge to reference',
  );

  // The REAL persisted chain is UNCHANGED — no dishonest edge landed, and the refusal was
  // not silently dropped (it still surfaced as chain-compromise above).
  const real = await inner.readChain(recordId);
  assert.equal(real.length, beforeLength, 'no append landed on the C3-forced corner');
  assert.equal(await inner.chainHead(recordId), beforeHead, 'chainHead is unchanged');
});

// === shared replay/verifyChain core (behavioral) ======================================

test("finalize's pre-seam verify and operator verifyChain() share one verifyChain core (behavioral equivalence over the same chain)", async () => {
  const inner = new MemoryStore();
  const profile = captureProfile();
  const recordId = 'rec-shared-core';
  const leg = profile.legs[0];
  if (leg === undefined)
    throw new Error(
      'chain-verify.test.ts: profile.legs[0] missing — captureProfile() must have at least one leg',
    );
  const openedPayload = {
    profileId: profile.id,
    profileDigest: profileDigest(profile),
    legId: leg.id,
    subjectRef: DEFAULT_SUBJECT_REF,
    contentDigest: 'sha256:eeee',
  };
  const chain = buildChain(recordId, [
    { kind: 'opened', payload: openedPayload },
    { kind: 'consultation-recorded', payload: aConsultation('sha256:ffff') },
  ]);
  const openedTransition = chain[0];
  const consultationTransition = chain[1];
  if (openedTransition === undefined || consultationTransition === undefined) {
    throw new Error('chain-verify.test.ts: buildChain must return transitions at index 0 and 1');
  }
  const openNT = nonTerminal('open', isFinalLeg(0, 1), false);
  await inner.appendTransition(null, openedTransition, openNT);
  await inner.appendTransition('open', consultationTransition, openNT);

  const store = new TamperingStore(inner, recordId, (c) => tamperNonLast(c));
  const { operator } = create(makeConfig([profile], { store }));

  // The operator wrapper IS verifyChain(readChain(recordId)) — the same pure core finalize's
  // gate consults; both see the tampered chain and agree exactly.
  const viaOperator = await operator.verifyChain(recordId);
  const viaPureCore = verifyChain(await store.readChain(recordId));
  assert.deepEqual(
    viaOperator,
    viaPureCore,
    'operator.verifyChain() == the shared pure verifyChain core over the same chain',
  );

  // And finalize gates on that same verdict: not-intact → chain-compromise.
  const outcome = await operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
});
