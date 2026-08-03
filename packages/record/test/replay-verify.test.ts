// @vidimera/record — replay-verify.test.ts (SPEC §5 "Chain integrity"): the pure
// `replay(chain) -> DecisionRecord` fold
// from genesis, and `verifyChain(chain) -> ChainVerifyReport` digest-linkage
// recomputation — `{intact:true}` on a good chain, `{intact:false, firstBreakSeq,
// detail}` on a deleted / reordered / tampered / seq-skipped / bad-genesis chain.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { digest } from '../src/canonical.js';
import { genesisPrevHash, transitionDigest } from '../src/chain/encoding.js';
import { replay, verifyChain } from '../src/chain/replay.js';
import type { Consultation, IdentityAssertion, Transition } from '../src/types.js';
import { buildChain, cloneChain } from './helpers/chain.js';

// --- fixtures ----------------------------------------------------------------------

const RECORD_ID = 'rec-e2e-1';

const APPROVER: IdentityAssertion = { principal: 'approver:1', authority: 'session:test-app' };
const CHECKER: IdentityAssertion = {
  principal: 'svc:review-surface',
  authority: 'session:test-app',
};

const OPENED_PAYLOAD = {
  profileId: 'test.week.v1',
  profileDigest: digest('profile-projection'),
  legId: 'approver-decide',
  subjectRef: 'consultant:42',
  contentDigest: digest('week-content'),
  policyDigest: digest('policy-snapshot'),
};

const FACTS_CONSULTATION: Consultation = {
  kind: 'facts',
  checker: CHECKER,
  at: '2026-07-24T00:00:01.000Z',
  payloadDigest: digest('figures'),
  verdict: 'pass',
};

const CONFIRMED_PAYLOAD = { actor: APPROVER };

/** A correctly-linked opened -> consultation-recorded -> confirmed chain. */
function goodChain(): Transition[] {
  return buildChain(RECORD_ID, [
    { kind: 'opened', payload: OPENED_PAYLOAD },
    { kind: 'consultation-recorded', payload: FACTS_CONSULTATION },
    { kind: 'confirmed', payload: CONFIRMED_PAYLOAD },
  ]);
}

// === replay() ========================================================================

test('replay(): folds an opened -> consultation-recorded -> confirmed chain into a DecisionRecord', () => {
  const chain = goodChain();
  const record = replay(chain);

  assert.deepEqual(record, {
    id: RECORD_ID,
    profileId: OPENED_PAYLOAD.profileId,
    legId: OPENED_PAYLOAD.legId,
    subjectRef: OPENED_PAYLOAD.subjectRef,
    contentDigest: OPENED_PAYLOAD.contentDigest,
    policyDigest: OPENED_PAYLOAD.policyDigest,
    actor: APPROVER,
    consultations: [FACTS_CONSULTATION],
    state: 'confirmed',
  });
});

test('replay(): the opened payload seeds id/profileId/legId/subjectRef/contentDigest, and DecisionRecord.id comes from transition.recordId (not a payload field)', () => {
  const chain = [
    {
      recordId: 'rec-only-opened',
      seq: 1,
      at: '2026-07-24T00:00:00.000Z',
      kind: 'opened' as const,
      payload: { ...OPENED_PAYLOAD, policyDigest: undefined },
      prevHash: genesisPrevHash('rec-only-opened'),
    },
  ];
  const record = replay(chain);
  assert.equal(record.id, 'rec-only-opened');
  assert.equal(record.state, 'open');
  assert.deepEqual(record.consultations, []);
  assert.equal(record.actor, undefined);
  assert.equal(record.refusalCode, undefined);
});

test('replay(): policyDigest is OPTIONAL — an opened payload without it folds to a record with no policyDigest field', () => {
  const noPolicy = { ...OPENED_PAYLOAD } as Partial<typeof OPENED_PAYLOAD>;
  delete noPolicy.policyDigest;
  const chain = buildChain(RECORD_ID, [{ kind: 'opened', payload: noPolicy }]);
  const record = replay(chain);
  assert.equal(record.policyDigest, undefined);
});

test('replay(): multiple consultation-recorded transitions ACCUMULATE into consultations, in chain order', () => {
  const chainVerify: Consultation = {
    kind: 'chain-verify',
    checker: { principal: 'system:vidimera', authority: 'dev-stub' },
    at: '2026-07-24T00:00:02.000Z',
    payloadDigest: digest('verified-head'),
    verdict: 'pass',
  };
  const chain = buildChain(RECORD_ID, [
    { kind: 'opened', payload: OPENED_PAYLOAD },
    { kind: 'consultation-recorded', payload: chainVerify },
    { kind: 'consultation-recorded', payload: FACTS_CONSULTATION },
    { kind: 'confirmed', payload: CONFIRMED_PAYLOAD },
  ]);
  const record = replay(chain);
  assert.deepEqual(record.consultations, [chainVerify, FACTS_CONSULTATION]);
});

test('replay(): a refused payload {code} folds to state "refused" + refusalCode, and does not touch actor', () => {
  const chain = buildChain(RECORD_ID, [
    { kind: 'opened', payload: OPENED_PAYLOAD },
    { kind: 'refused', payload: { code: 'content-drift' } },
  ]);
  const record = replay(chain);
  assert.equal(record.state, 'refused');
  assert.equal(record.refusalCode, 'content-drift');
  assert.equal(record.actor, undefined);
});

test('replay(): an expired payload {bound} folds to state "expired"', () => {
  const chain = buildChain(RECORD_ID, [
    { kind: 'opened', payload: OPENED_PAYLOAD },
    { kind: 'expired', payload: { bound: 'ttl' } },
  ]);
  const record = replay(chain);
  assert.equal(record.state, 'expired');
});

test('replay(): state follows the LAST state-changing transition kind (a compromise-refusal after confirmed lands on "refused")', () => {
  const chain = buildChain(RECORD_ID, [
    { kind: 'opened', payload: OPENED_PAYLOAD },
    { kind: 'confirmed', payload: CONFIRMED_PAYLOAD },
    { kind: 'refused', payload: { code: 'chain-compromise' } },
  ]);
  const record = replay(chain);
  assert.equal(record.state, 'refused');
  assert.equal(record.refusalCode, 'chain-compromise');
  // actor set by the earlier confirmed transition is NOT erased by the later refusal
  // (only state/refusalCode are refusal-owned fields).
  assert.deepEqual(record.actor, APPROVER);
});

test('replay(): throws on an empty chain (replaying a record that does not exist is a caller error)', () => {
  assert.throws(() => replay([]), /empty chain/i);
});

test('replay(): throws when the first transition is not "opened" (no other source for id/profileId/legId/subjectRef/contentDigest)', () => {
  const malformed: Transition[] = [
    {
      recordId: RECORD_ID,
      seq: 1,
      at: '2026-07-24T00:00:00.000Z',
      kind: 'confirmed',
      payload: CONFIRMED_PAYLOAD,
      prevHash: genesisPrevHash(RECORD_ID),
    },
  ];
  assert.throws(() => replay(malformed), /opened/i);
});

test('replay(): throws on a TransitionKind the kernel in this build never emits (e.g. "sealed")', () => {
  const chain = buildChain(RECORD_ID, [
    { kind: 'opened', payload: OPENED_PAYLOAD },
    { kind: 'sealed', payload: { note: 'not a kind this build emits' } },
  ]);
  assert.throws(() => replay(chain), /sealed/);
});

// === verifyChain() ===================================================================

test('verifyChain(): {intact:true} on a correctly-linked chain, with NO firstBreakSeq/detail keys present', () => {
  const result = verifyChain(goodChain());
  assert.deepEqual(result, { intact: true });
  assert.equal('firstBreakSeq' in result, false);
  assert.equal('detail' in result, false);
});

test('verifyChain(): {intact:true} on a single-transition (opened-only) chain', () => {
  const chain = buildChain(RECORD_ID, [{ kind: 'opened', payload: OPENED_PAYLOAD }]);
  assert.deepEqual(verifyChain(chain), { intact: true });
});

test('verifyChain(): throws on an empty chain', () => {
  assert.throws(() => verifyChain([]), /empty chain/i);
});

test('verifyChain(): DELETED middle transition -> firstBreakSeq at the first position whose seq no longer matches its 1-based position', () => {
  const chain = cloneChain(goodChain());
  const openedTransition = chain[0];
  const confirmedTransition = chain[2];
  if (openedTransition === undefined || confirmedTransition === undefined) {
    throw new Error(
      'replay-verify.test.ts: chain[0]/chain[2] missing — goodChain() must have 3 transitions',
    );
  }
  const withDeletion = [openedTransition, confirmedTransition]; // drop the middle (consultation-recorded, seq 2)
  const result = verifyChain(withDeletion);
  assert.equal(result.intact, false);
  if (result.intact) throw new Error('unreachable');
  assert.equal(
    result.firstBreakSeq,
    2,
    'position 2 is where the array no longer matches the expected 1-based sequence',
  );
  assert.match(result.detail, /seq/i);
});

test('verifyChain(): REORDERED transitions (swap positions 2 and 3) -> firstBreakSeq at the first out-of-place position', () => {
  const chain = cloneChain(goodChain());
  const openedTransition = chain[0];
  const consultationTransition = chain[1];
  const confirmedTransition = chain[2];
  if (
    openedTransition === undefined ||
    consultationTransition === undefined ||
    confirmedTransition === undefined
  ) {
    throw new Error(
      'replay-verify.test.ts: chain[0]/chain[1]/chain[2] missing — goodChain() must have 3 transitions',
    );
  }
  const reordered = [openedTransition, confirmedTransition, consultationTransition]; // swap consultation-recorded/confirmed
  const result = verifyChain(reordered);
  assert.equal(result.intact, false);
  if (result.intact) throw new Error('unreachable');
  assert.equal(result.firstBreakSeq, 2);
});

test('verifyChain(): TAMPERED payload on a NON-last transition is caught at the NEXT transition (the hash-chain link forward), not at the tampered transition itself', () => {
  const chain = cloneChain(goodChain());
  const consultationTransition = chain[1];
  if (consultationTransition === undefined)
    throw new Error(
      'replay-verify.test.ts: chain[1] missing — goodChain() must have 3 transitions',
    );
  // Tamper the middle transition's payload IN PLACE (same seq, same prevHash field —
  // only the payload content changes) without fixing up anything downstream, exactly
  // as an attacker editing a stored row would.
  consultationTransition.payload = {
    ...(consultationTransition.payload as Consultation),
    verdict: 'fail',
  };

  const result = verifyChain(chain);
  assert.equal(result.intact, false);
  if (result.intact) throw new Error('unreachable');
  // The tampered transition itself (seq 2) still carries its ORIGINAL, still-valid
  // prevHash (pointing at the untouched seq-1 transition) — the break only surfaces
  // one link later, at seq 3, whose prevHash was computed by the honest builder from
  // the UNTAMPERED seq-2 payload and therefore no longer matches the tampered
  // transition's recomputed digest. This is the documented honesty limit of a
  // singly-linked hash chain: a mutation is detected by the link AFTER it, not at it.
  assert.equal(result.firstBreakSeq, 3);
  assert.match(result.detail, /prevHash/i);
});

test("verifyChain(): SEQ-TAMPERED (mutated seq field, no deletion) -> firstBreakSeq reports the 1-based POSITION, not the transition's own corrupted seq value", () => {
  const chain = cloneChain(goodChain());
  const consultationTransition = chain[1];
  if (consultationTransition === undefined)
    throw new Error(
      'replay-verify.test.ts: chain[1] missing — goodChain() must have 3 transitions',
    );
  consultationTransition.seq = 99; // corrupt the seq field itself, array length unchanged
  const result = verifyChain(chain);
  assert.equal(result.intact, false);
  if (result.intact) throw new Error('unreachable');
  assert.equal(
    result.firstBreakSeq,
    2,
    'must report the expected position (2), not the corrupted stored value (99)',
  );
});

test('verifyChain(): WRONG GENESIS prevHash on the first transition -> firstBreakSeq 1', () => {
  const chain = cloneChain(goodChain());
  const openedTransition = chain[0];
  if (openedTransition === undefined)
    throw new Error(
      'replay-verify.test.ts: chain[0] missing — goodChain() must have 3 transitions',
    );
  openedTransition.prevHash = genesisPrevHash('some-other-record-id');
  const result = verifyChain(chain);
  assert.equal(result.intact, false);
  if (result.intact) throw new Error('unreachable');
  assert.equal(result.firstBreakSeq, 1);
  assert.match(result.detail, /genesis|prevHash/i);
});

test('verifyChain(): reports the FIRST break only, even when a second, independent break exists later in the same chain', () => {
  const chain = cloneChain(goodChain());
  const openedTransition = chain[0];
  const consultationTransition = chain[1];
  if (openedTransition === undefined || consultationTransition === undefined) {
    throw new Error(
      'replay-verify.test.ts: chain[0]/chain[1] missing — goodChain() must have 3 transitions',
    );
  }
  openedTransition.prevHash = genesisPrevHash('some-other-record-id'); // break #1 at seq 1
  consultationTransition.payload = {
    ...(consultationTransition.payload as Consultation),
    verdict: 'fail',
  }; // break #2 surfaces at seq 3
  const result = verifyChain(chain);
  assert.equal(result.intact, false);
  if (result.intact) throw new Error('unreachable');
  assert.equal(result.firstBreakSeq, 1, 'the earlier break must win, not the later one');
});

test('verifyChain(): a chain independently rebuilt via transitionDigest()/genesisPrevHash() by hand (not through the buildChain() helper) is also intact — cross-checks the helper is not doing anything verifyChain() itself does not', () => {
  const opened: Transition = {
    recordId: 'rec-handbuilt',
    seq: 1,
    at: '2026-07-24T00:00:00.000Z',
    kind: 'opened',
    payload: OPENED_PAYLOAD,
    prevHash: genesisPrevHash('rec-handbuilt'),
  };
  const confirmed: Transition = {
    recordId: 'rec-handbuilt',
    seq: 2,
    at: '2026-07-24T00:00:01.000Z',
    kind: 'confirmed',
    payload: CONFIRMED_PAYLOAD,
    prevHash: transitionDigest(opened),
  };
  assert.deepEqual(verifyChain([opened, confirmed]), { intact: true });
});
