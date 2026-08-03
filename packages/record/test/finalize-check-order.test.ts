// @vidimera/record — finalize-check-order.test.ts (SPEC §9 "The finalize gate ladder"): pins the
// check-order INVARIANT itself — every finalize() refusal path wins over the ones after it
// in the six-rung ladder (kernel/finalize.ts header):
//   load chain → (1) pre-seam chain-verify → (2) state/expiry gate → (3) identity
//   → (4) content-drift → (5) facts → (6) success append batch.
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
//   (4) content-drift  -> content-drift                             (1 code)
//   (5) facts          -> consultation-missing                      (1 code)
//   (6) success batch  -> record-not-open, but ONLY as a CAS-race residual on the
//       confirmed-append — kernel/finalize.ts's success-batch comment and
//       refuseMaybeAppend's docstring both describe that residual as not producible under
//       this build step's single-writer bound. There is no way to construct a RECORD whose
//       data trips it — only a store that violates the bound — so (5)->(6) is NOT jointly
//       constructible here and is excluded below.
//
// Consecutive-rung pairs and their tests:
//   (1)->(2) x 2 — chain-compromise over each of rung (2)'s two codes. ALREADY COVERED in
//     chain-verify.test.ts: "a post-confirmed NON-LAST tamper on a CONFIRMED effect-seam
//     record ..." (the tampered chain's real state replays to 'confirmed', which rung (2)
//     would refuse record-not-open) and "a tampered chain on an ALREADY-EXPIRED record ..."
//     (real state replays to 'expired', which rung (2) would refuse leg-expired) — both
//     assert the surfaced code is chain-compromise. Not duplicated here.
//   (2)->(3) x 2 — each of rung (2)'s two codes over identity-authority-refused. NEW below.
//   (3)->(4) x 1 — identity-authority-refused over content-drift. NEW below.
//   (4)->(5) x 1 — content-drift over consultation-missing. NEW below.
//
// Total order-pair tests across the corpus: 6 (2 pre-existing + 4 new here).

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
