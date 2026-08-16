// @vidimera/record — finalize-check-order.test.ts (SPEC §9 "The finalize gate ladder"): pins the
// check-order INVARIANT itself — every finalize() refusal path wins over the ones after it
// in the seven-rung ladder this build implements (kernel/finalize.ts header), including
// (3.5):
//   load chain → (1) pre-seam chain-verify → (2) state/expiry gate → (3) identity
//   → (3.5) separation of duties → (4) content-drift → (5) facts → (6) success append batch.
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
//   (5) facts          -> consultation-missing                      (1 code)
//   (6) success batch  -> record-not-open, but ONLY on a conflict at the batch's single entry
//       compare-and-swap, where the batch is all-or-nothing so nothing of the call has
//       landed. A `seq` conflict at that same entry THROWS a storage fault instead
//       (kernel/finalize.ts's `batchConflict`), and a throw is not a refusal code — it cannot
//       enter an order pair at all. The surviving refusal still needs a store that violates
//       this build step's single-writer bound: there is no way to construct a RECORD whose
//       data trips it, so (5)->(6) is NOT jointly constructible here and is excluded below.
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
//   (4)->(5) x 1 — content-drift over consultation-missing. NEW below.
//
// Total order-pair tests across the corpus: 8 (2 in chain-verify.test.ts, 4 in this file,
// 2 in multi-leg.test.ts).

import assert from 'node:assert/strict';
import { test } from 'vitest';

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
