// @vidimera/record — finalize-check-order.test.ts (SPEC §9 "The finalize gate ladder"): pins the
// check-order INVARIANT itself — every finalize() refusal path wins over the ones after it
// in the ten-rung ladder this build implements (kernel/finalize.ts header), including
// (3.5), (4.5), (5.5), and (5.7):
//   load chain → (1) pre-seam chain-verify → (2) state/expiry gate → (3) identity
//   → (3.5) separation of duties → (4) content-drift → (4.5) policy drift → (5) facts →
//   (5.5) required consultations → (5.7) ack coverage → (6) success append batch.
//
// Definition (written here so the pair count is reproducible, not re-derived differently by
// each reader): an ADJACENT-PAIR ORDER TEST is one test per (earlier-rung refusal code,
// later-rung refusal code) ORDERED PAIR that is JOINTLY CONSTRUCTIBLE at this build step,
// where the two rungs are CONSECUTIVE in the ladder header above. Each test constructs a
// record/call that trips BOTH rungs' conditions simultaneously and asserts the refusal
// carries the EARLIER rung's code — a test that only trips one rung proves nothing about
// order.
//
// Derivation — the codes each rung emits:
//   (1) chain-verify   -> chain-compromise                        (1 code)
//   (2) state/expiry   -> record-not-open, leg-expired             (2 codes)
//   (3) identity       -> identity-authority-refused                (1 code)
//   (3.5) SoD          -> sod-violation                             (1 code)
//   (4) content-drift  -> content-drift                             (1 code)
//   (4.5) policy drift -> policy-drift (1 code on its refused-class arm; its availability
//       arm produces the `unavailable` status — a different outcome shape entirely, never a
//       `refused` code, so it cannot enter an order pair by this file's own refusal-code-pair
//       definition above, the same exclusion (5.5)'s availability arm gets below)
//   (5) facts          -> consultation-missing                      (1 code)
//   (5.5) consultations -> consultation-missing (second producer), consultation-failed
//       (2 codes on its refused-class arms; its THIRD arm produces the `unavailable`
//       status — a different outcome shape entirely, never a `refused` code, so it cannot
//       enter an order pair by this file's own refusal-code-pair definition above)
//   (5.7) ack coverage -> ack-missing, ack-stale (the second step-7 increment; 2 codes,
//       both `refusal`-class and `terminalRefusals`-able — no third outcome class at this
//       rung, unlike (4.5)/(5.5))
//   (6) success batch  -> record-not-open, but ONLY on a conflict at the batch's single entry
//       compare-and-swap, where the batch is all-or-nothing so nothing of the call has
//       landed. A `seq` conflict at that same entry refuses `record-contended` when a re-read
//       shows the head moved (the record-contended increment), and THROWS a storage fault when
//       it did not (kernel/finalize.ts's `batchSeqConflict`); the throw is not a refusal code
//       and cannot enter an order pair. Both rung-(6) refusals need a concurrent writer landing
//       between the read and the batch, so the (5.7)->(6) pair is constructible ONLY by a race
//       and is pinned where the race is driven — terminality.test.ts's raced-finding tests —
//       with a carve-out from this file's own definition: on the LOSING call the LATER rung's
//       code surfaces (`record-contended`), because (5.7) ran against the stale head, and it is
//       the RE-INVOCATION that refuses `ack-missing`. There is no way to construct a RECORD whose
//       data trips it, so (5.7)->(6) is NOT jointly constructible here and is excluded below
//       (the second step-7 increment's rung 5.7 now sits where (5.5)->(6) used to be
//       adjacent; the same unreachability argument carries over unchanged to the new
//       adjacent pair).
//
// Consecutive-rung pairs and their tests:
//   (1)->(2) x 2 — chain-compromise over each of rung (2)'s two codes. ALREADY COVERED in
//     chain-verify.test.ts: "a post-confirmed NON-LAST tamper on a CONFIRMED effect-seam
//     record ..." (the tampered chain's real state replays to 'confirmed', which rung (2)
//     would refuse record-not-open) and "a tampered chain on an ALREADY-EXPIRED record ..."
//     (real state replays to 'expired', which rung (2) would refuse leg-expired) — both
//     assert the surfaced code is chain-compromise. Not duplicated here.
//   (2)->(3) x 2 — each of rung (2)'s two codes over identity-authority-refused. NEW below.
//   (3)->(3.5) x 1 and (3.5)->(4) x 1 — the two pairs either side of separation of duties
//     (added at the second step-4 increment). ALREADY COVERED in multi-leg.test.ts (a
//     multi-leg profile is required to declare `sod`/`proposer` at all — this file's own
//     fixtures are single-leg, so these pairs cannot be built here): "gate order: (3)
//     identity outranks (3.5) sod ..." and "gate order: (3.5) sod outranks (4)
//     content-drift ...". Not duplicated here.
//   (3)->(4) x 1 — identity-authority-refused over content-drift. NEW below. This pair is no
//     longer CONSECUTIVE now that (3.5) sits between (3) and (4) — kept anyway because it is
//     still a true rung-(3)-outranks-rung-(4) test on a profile that declares neither `sod`
//     nor `proposer` (so (3.5) is a no-op for it and the two rungs are adjacent-but-for-3.5
//     in that fixture); the two genuinely consecutive pairs around (3.5) are the
//     multi-leg.test.ts pair named above.
//   (4)->(4.5) x 1 — content-drift over policy-drift (the second step-6 increment).
//     Genuinely CONSECUTIVE — nothing sits between (4) and (4.5). ALREADY COVERED in
//     policy-drift.test.ts: "order: (4) content-drift outranks (4.5) ...". Not duplicated
//     here.
//   (4)->(5) x 1 — content-drift over consultation-missing. NEW below. This pair is no
//     longer CONSECUTIVE now that (4.5) sits between (4) and (5) — kept anyway, the same
//     treatment (3)->(4) gets above: still a true rung-(4)-outranks-rung-(5) test on a
//     profile that declares no `policySource` (so (4.5) is a no-op for it and the two rungs
//     are adjacent-but-for-4.5 in that fixture).
//   (4.5)->(5) x 1 — policy drift over facts' consultation-missing (the second step-6
//     increment's own review fold-in — flagged as an unpinned-but-constructible gap at
//     the second step-6 increment's own exit, then closed in that same increment). Genuinely
//     CONSECUTIVE — nothing sits between (4.5) and (5). ALREADY COVERED in
//     policy-drift.test.ts: "order: (4.5) outranks (5) — a drifted policy moots even
//     malformed facts", using the established non-canonicalizable-BigInt-figures shape
//     (the same discriminator fixture consultations.test.ts's own (5)->(5.5) pin uses) as
//     the malformed-facts trip. Not duplicated here.
//   (4.5)->(5.5) x 1 — policy drift over the required-consultation gate's
//     `consultation-missing` (the second step-6 increment). ALREADY COVERED in
//     policy-drift.test.ts: "order: (4.5) outranks (5.5) ...". Not strictly CONSECUTIVE —
//     (5) sits between (4.5) and (5.5) — kept for the same reason (3)->(4) is: that test's
//     fixture supplies valid `facts()` figures, so rung (5) is a no-op there and the two
//     rungs are adjacent-but-for-5 in that fixture. Not duplicated here.
//   (5)->(5.5) x 1 — facts' consultation-missing over consultation-failed (the second
//     step-5 increment). ALREADY COVERED in consultations.test.ts: "gate order: (5) facts
//     outranks (5.5) ..." — that pair needs the gated-profile fixture (a leg declaring
//     `requiredConsultations`) that only that file's helpers construct, so it is not
//     duplicated here.
//   (5.5)->(5.7) x 1 — the required-consultation gate's `consultation-failed` over the ack
//     coverage gate's `ack-missing` (the second step-7 increment). Genuinely CONSECUTIVE —
//     nothing sits between (5.5) and (5.7). NEW below: a leg declaring BOTH
//     `requiredConsultations: ['risk-check']` and the findings flow, a record carrying an
//     uncovered required finding, finalize called with a `fail`-verdict risk-check
//     consultation.
//
// Total order-pair tests across the corpus: 13 (2 in chain-verify.test.ts, 5 in this file,
// 2 in multi-leg.test.ts, 1 in consultations.test.ts, 3 in policy-drift.test.ts).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConfirmProfile } from '../src/config.js';
import { create, createWithClock } from '../src/create.js';
import type { IdentityAssertion } from '../src/types.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const PROFILE_ID = 'test.capture.v1';
const CONTENT = { subject: 'week-1', total: 40 };
const DRIFTED_CONTENT = { subject: 'week-1', total: 999 };
const TTL = 3600; // 1h
const T0 = '2026-07-24T00:00:00.000Z';
const T_LATE = '2026-07-24T02:00:00.000Z';

// === (2)->(3): rung (2)'s two codes over identity-authority-refused ===================

test('(2)->(3): an already-CONFIRMED record (record-not-open) with an ALSO-bad identity -> record-not-open, not identity-authority-refused', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const first = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(first.status, 'ok', 'fixture precondition: the record must confirm first');

  const badIdentity = {} as unknown as IdentityAssertion; // would trip rung (3) if reached
  const outcome = await handles.operator.finalize(recordId, badIdentity, CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(
    outcome.code,
    'record-not-open',
    'rung (2) (state/expiry) must win over rung (3) (identity) — the state gate runs first',
  );
});

test('(2)->(3): a DUE-open record (leg-expired, en-passant) with an ALSO-bad identity -> leg-expired, not identity-authority-refused', async () => {
  let clockNow = new Date(T0);
  const clock = () => clockNow;
  const handles = createWithClock(makeConfig([captureProfile({ ttl: TTL })]), clock);
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  clockNow = new Date(T_LATE); // past the open window
  const badIdentity = {} as unknown as IdentityAssertion; // would trip rung (3) if reached
  const outcome = await handles.operator.finalize(recordId, badIdentity, CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(
    outcome.code,
    'leg-expired',
    'rung (2) (state/expiry) must win over rung (3) (identity) — the expiry gate runs first',
  );
});

// === (3)->(4): identity-authority-refused over content-drift ==========================

test('(3)->(4): a bad-identity finalize call that ALSO drifts content -> identity-authority-refused, not content-drift', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const badIdentity = {} as unknown as IdentityAssertion; // trips rung (3)
  const outcome = await handles.operator.finalize(
    recordId,
    badIdentity,
    DRIFTED_CONTENT, // would ALSO trip rung (4) if reached
    facts(),
  );
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(
    outcome.code,
    'identity-authority-refused',
    'rung (3) (identity) must win over rung (4) (content-drift) — identity is checked first',
  );
});

// === (4)->(5): content-drift over consultation-missing =================================

test('(4)->(5): drifted content with ALSO-missing facts -> content-drift, not consultation-missing', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const noFigures = { figures: undefined, checker: identity() }; // would trip rung (5) if reached
  const outcome = await handles.operator.finalize(
    recordId,
    identity(),
    DRIFTED_CONTENT, // trips rung (4)
    noFigures,
  );
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(
    outcome.code,
    'content-drift',
    'rung (4) (content-drift) must win over rung (5) (facts) — content is checked first',
  );
});

// === (5.5)->(5.7): required consultations over ack coverage (the second step-7 increment) =

const RISK_CHECKER = { principal: 'svc:risk-check', authority: 'mtls:risk-check' };
const RISK_DIGEST = `sha256:${'a'.repeat(64)}`;

/** A leg declaring BOTH requiredConsultations and the findings flow — this pair's own
 * fixture, since neither captureProfile() nor flowProfile() (findings.test.ts /
 * findings-seams.test.ts) declares both at once. */
function gatedFlowProfile(): ConfirmProfile {
  const p = captureProfile({ id: 'test.gated-flow.v1' });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  p.legs[0] = {
    ...leg,
    requiredConsultations: ['risk-check'],
    ackMode: 'any',
    requiredAcks: ['variance'],
  };
  return p;
}

test('(5.5)->(5.7): a failed required consultation with ALSO an uncovered required finding -> consultation-failed, not ack-missing', async () => {
  const handles = create(makeConfig([gatedFlowProfile()]));
  const recordId = await openRecord(handles, CONTENT, 'test.gated-flow.v1', DEFAULT_SUBJECT_REF);
  await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: RISK_DIGEST },
    RISK_CHECKER,
  ); // would trip rung (5.7) if reached (ack-missing)
  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [
      { kind: 'risk-check', checker: RISK_CHECKER, payloadDigest: RISK_DIGEST, verdict: 'fail' },
    ],
  }); // trips rung (5.5)
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(
    outcome.code,
    'consultation-failed',
    'rung (5.5) (required consultations) must win over rung (5.7) (ack coverage) — consultations are checked first',
  );
});
