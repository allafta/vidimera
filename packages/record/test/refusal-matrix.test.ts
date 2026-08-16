// @vidimera/record — refusal-matrix.test.ts: ONE
// production-path assertion per REGISTRY RefusalCode this build can produce, driven through
// the PUBLIC agent/operator surfaces (a fixture may ARRANGE store state via direct appends,
// mirroring the existing per-behavior suites — e.g. chain-verify.test.ts's TamperingStore —
// but the OUTCOME under test always comes from a public call). Per-code depth (multiple
// scenarios, edge cases) lives in each code's own per-behavior file; this file is the
// cross-cutting summary + the transitionRef presence matrix + per-outcome `class`
// correctness. `unknown-leg` DOES have a producer in this build (stage()'s
// caller-named-leg check, production-path-tested in unknown-ids.test.ts) but is
// asserted here at registry/type level only, to keep this file's per-code coverage
// uniform without duplicating that test.
//
// transitionRef presence matrix (SPEC §8's "Append semantics"):
//   - chain-compromise: PRESENT — a compromise-class refusal ALWAYS appends one `refused`
//     edge at head (normal C2) and returns its digest. The ONE documented exception — the
//     C3-forced corner where a tampered chain's REAL persisted state is already terminal
//     (e.g. already-expired) and NO CAS candidate is admitted, so chain-compromise carries
//     NO transitionRef — is pinned by its own test in chain-verify.test.ts (~line 224,
//     "C3-forced corner"); referenced here, not duplicated (that test's fixture — an
//     already-expired record — is exactly the corner, not the ordinary case this file
//     exercises).
//   - record-exists / unknown-profile / record-not-open / unredeemable-state and every
//     pre-record refusal: ABSENT, always — the never-append codes (refusal-codes.ts
//     NEVER_APPENDS). Asserted below on each of their production-path outcomes.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create, createWithClock } from '../src/create.js';
import { isFinalLeg, nonTerminal } from '../src/nonterminal.js';
import { profileDigest } from '../src/profile-digest.js';
import { appendsOn, REGISTRY, type RefusalCode } from '../src/refusal-codes.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Consultation } from '../src/types.js';
import { buildChain } from './helpers/chain.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
  tamperNonLast,
} from './helpers/profiles.js';
import { TamperingStore } from './helpers/stores.js';

const PROFILE_ID = 'test.capture.v1';
const CONTENT = { subject: 'week-1', total: 40 };

// === content-drift =======================================================================

test('content-drift: finalize() with drifted content -> refused/refusal, no transitionRef (default leg)', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const outcome = await handles.operator.finalize(
    recordId,
    identity(),
    { ...CONTENT, total: 999 },
    facts(),
  );
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'content-drift');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined);
});

// === identity-authority-refused ==========================================================

test('identity-authority-refused: finalize() with a disallowed authority -> refused/refusal, no transitionRef (default leg)', async () => {
  const handles = create(
    makeConfig([captureProfile({ allowedAuthorities: ['session:test-app'] })]),
  );
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const outcome = await handles.operator.finalize(
    recordId,
    identity({ authority: 'dev-stub' }),
    CONTENT,
    facts(),
  );
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'identity-authority-refused');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined);
});

// === record-exists ========================================================================

test('record-exists: a second open() on a LIVE (profile, subject) -> refused/refusal, no transitionRef', async () => {
  const handles = create(makeConfig([captureProfile()]));
  await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const staged = await handles.agent.stage(CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const outcome = await handles.operator.open(staged.value.stagedRef);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'record-exists');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined);
});

// === leg-expired ==========================================================================

test('leg-expired: finalize() on a due-open record past its TTL -> refused/refusal, no transitionRef', async () => {
  let clockNow = new Date('2026-07-24T00:00:00.000Z');
  const clock = () => clockNow;
  const handles = createWithClock(makeConfig([captureProfile({ ttl: 3600 })]), clock);
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  clockNow = new Date('2026-07-24T02:00:00.000Z'); // past the 1h TTL
  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'leg-expired');
  assert.equal(outcome.class, 'refusal');
  assert.equal(
    outcome.transitionRef,
    undefined,
    'leg-expired carries no transitionRef — the appended edge is `expired`, not `refused`',
  );
});

test("leg-expired PIN: a leg declaring terminalRefusals:['leg-expired'] has NO effect — the state/expiry gate resolves leg-expired BEFORE any refusal-append decision, so appendsOn is never consulted for it", async () => {
  let clockNow = new Date('2026-07-24T00:00:00.000Z');
  const clock = () => clockNow;
  const handles = createWithClock(
    makeConfig([captureProfile({ ttl: 3600, terminalRefusals: ['leg-expired'] })]),
    clock,
  );
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);
  const lengthBefore = (await handles.operator.readChain(recordId)).length;

  clockNow = new Date('2026-07-24T02:00:00.000Z'); // past the 1h TTL
  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'leg-expired');
  assert.equal(outcome.class, 'refusal');
  assert.equal(
    outcome.transitionRef,
    undefined,
    'leg-expired never carries a transitionRef, terminalRefusals notwithstanding — the appended edge (if any) is `expired`, never `refused`',
  );

  // The chain gained ONLY the en-passant `expired` edge — NOT a `refused` edge. If the
  // helper's `appendsOn('leg-expired', leg)` (which would say "append") were ever consulted
  // by finalize's state/expiry gate, this record would instead show a trailing `refused`
  // edge with payload {code:'leg-expired'} — an open→refused append on an already-expired
  // record, which is structurally impossible (C3): the gate gets there first.
  const chain = await handles.operator.readChain(recordId);
  assert.equal(chain.length, lengthBefore + 1, 'exactly one edge appended (the expiry edge)');
  const lastTransition = chain[chain.length - 1];
  if (lastTransition === undefined)
    throw new Error('refusal-matrix.test.ts: chain has no last transition after the expiry append');
  assert.equal(lastTransition.kind, 'expired', 'the appended edge is `expired`, not `refused`');
});

// === consultation-missing =================================================================

test('consultation-missing: finalize() without facts (missing figures) -> refused/refusal, no transitionRef', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const noFigures = {
    figures: undefined,
    checker: identity({ principal: 'svc:review', authority: 'mtls:review' }),
  };
  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, noFigures);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'consultation-missing');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined);
});

// === chain-compromise (transitionRef PRESENT — the ordinary case) =======================
// Uses the shared TamperingStore (helpers/stores.ts) — same pattern as
// chain-verify.test.ts's fixture: `readChain` returns a TAMPERED copy of the target
// record's chain (so finalize's pre-seam verify sees the tamper) while every WRITE
// delegates to a real inner MemoryStore (so the compromise `refused` edge lands under
// real CAS/C3 semantics).

function aConsultation(payloadDigest: string): Consultation {
  return {
    kind: 'facts',
    checker: { principal: 'svc:review-surface', authority: 'mtls:review-surface' },
    at: '2026-07-24T00:30:00.000Z',
    payloadDigest,
    verdict: 'pass',
  };
}

test('chain-compromise: finalize() on a tampered (non-last) chain -> refused/compromise, transitionRef PRESENT (ordinary case)', async () => {
  const inner = new MemoryStore();
  const profile = captureProfile();
  const leg = profile.legs[0];
  if (leg === undefined)
    throw new Error(
      'refusal-matrix.test.ts: profile.legs[0] missing — captureProfile() must have at least one leg',
    );
  const legId = leg.id;
  const recordId = 'rec-matrix-compromise';
  const openedPayload = {
    profileId: profile.id,
    profileDigest: profileDigest(profile),
    legId,
    subjectRef: DEFAULT_SUBJECT_REF,
    contentDigest: 'sha256:matrix1',
  };
  // [opened, consultation-recorded] — state stays 'open'; the `opened` transition (index 0)
  // is non-last and tamperable (a last-element tamper is the documented AL1 blind spot).
  const chain = buildChain(recordId, [
    { kind: 'opened', payload: openedPayload },
    { kind: 'consultation-recorded', payload: aConsultation('sha256:matrix2') },
  ]);
  const openedTransition = chain[0];
  const consultationTransition = chain[1];
  if (openedTransition === undefined || consultationTransition === undefined) {
    throw new Error('refusal-matrix.test.ts: buildChain must return transitions at index 0 and 1');
  }
  const openNT = nonTerminal('open', isFinalLeg(0, 1), false);
  assert.equal(
    (await inner.appendTransition(null, openedTransition, { nonTerminal: openNT })).appended,
    true,
  );
  assert.equal(
    (await inner.appendTransition('open', consultationTransition, { nonTerminal: openNT }))
      .appended,
    true,
  );

  const store = new TamperingStore(inner, recordId, (c) => tamperNonLast(c));
  const { operator } = create(makeConfig([profile], { store }));

  const outcome = await operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
  assert.equal(
    outcome.class,
    'compromise',
    'chain-compromise is the ONLY code whose class is compromise, not refusal',
  );
  assert.ok(
    outcome.transitionRef,
    'chain-compromise ALWAYS appends here (a CAS candidate is admitted) -> transitionRef PRESENT; ' +
      'the C3-forced no-append corner (an already-terminal tampered record) is pinned by chain-verify.test.ts ~line 224, not duplicated here',
  );
});

// === record-not-open ======================================================================

test('record-not-open: finalize() on an already-CONFIRMED record -> refused/refusal, no transitionRef', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const first = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(first.status, 'ok');

  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'record-not-open');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined);
});

// === unknown-profile =======================================================================

test('unknown-profile: stage() naming an unconfigured profileId -> refused/refusal, no transitionRef', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const outcome = await handles.agent.stage(CONTENT, 'no.such.profile.v1', DEFAULT_SUBJECT_REF);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unknown-profile');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined);
});

// === unredeemable-state (ONE production-path assertion here; both profile-shape depth ===
// === lives in terminality.test.ts) ========================================================

test('unredeemable-state: redeem() on a confirmed record -> refused/refusal, no transitionRef (both-profile-shape depth: terminality.test.ts)', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);
  const confirmed = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(confirmed.status, 'ok');

  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined);
});

// === redemption-timeout (ONE production-path assertion here; registry/type-level only) ===

test('redemption-timeout: registry/type presence + class only in this file — production-path coverage lives in clocks.test.ts (the third step-3 increment)', () => {
  // `code: RefusalCode = 'redemption-timeout'` is itself a COMPILE-TIME union-membership check
  // (this file fails to type-check if 'redemption-timeout' is ever removed from the union).
  const code: RefusalCode = 'redemption-timeout';
  assert.equal(REGISTRY[code], 'refusal');
});

// === prior-leg-unverified (ONE production-path assertion here; registry/type-level only) ===

test("prior-leg-unverified: registry/type presence + class only in this file — its verifier (kernel/prior-legs.ts) is consumed by open()'s sequencing rung; production-path coverage lives in multi-leg.test.ts (the first step-4 increment)", () => {
  // `code: RefusalCode = 'prior-leg-unverified'` is itself a COMPILE-TIME union-membership check
  // (this file fails to type-check if 'prior-leg-unverified' is ever removed from the union).
  const code: RefusalCode = 'prior-leg-unverified';
  assert.equal(REGISTRY[code], 'refusal');
});

// === unknown-leg: registry/type-level presence + class ONLY (production path is
// === unknown-ids.test.ts, not this file) =================================================

test('unknown-leg: registry/type presence + class only in this file — the production-path assertion lives in unknown-ids.test.ts', () => {
  // `code: RefusalCode = 'unknown-leg'` is itself a COMPILE-TIME union-membership check
  // (this file fails to type-check if 'unknown-leg' is ever removed from the union).
  const code: RefusalCode = 'unknown-leg';
  assert.equal(REGISTRY[code], 'refusal');
});

// === sod-violation (the second step-4 increment) =================================================
// `sod-violation` (separation-of-duties refusal, SPEC §8's conditional table) is
// `terminalRefusals`-able: appends `open→refused` iff listed in the leg's
// `terminalRefusals`, default open (§10.1: a DIFFERENT approver may decide). Its producer
// is finalize's rung 3.5 (kernel/finalize.ts), real as of the second step-4 increment, so
// this file carries a registry-only assertion; production-path coverage lives in
// multi-leg.test.ts, the second step-4 increment's own file.

test("sod-violation: registry/type presence + class only in this file — its producer is finalize's rung 3.5; production-path coverage lives in multi-leg.test.ts (the second step-4 increment)", () => {
  // `code: RefusalCode = 'sod-violation'` is itself a COMPILE-TIME union-membership check
  // (this file fails to type-check if 'sod-violation' is ever removed from the union).
  const code: RefusalCode = 'sod-violation';
  assert.equal(REGISTRY[code], 'refusal');
});

// === consultation-failed (the second step-5 increment) ===================================
// `consultation-failed` (SPEC §8's conditional table: required consultations, §11.1) has
// content-drift's own shape: `refusal`-class, `terminalRefusals`-able, open-by-default for
// re-run — a leg's `terminalRefusals` must list it to end the leg instead, same as
// content-drift's own default-open behavior above. Its producer is finalize's rung 5.5
// (kernel/finalize.ts), real as of the second step-5 increment, so this file carries a
// registry-only assertion, mirroring `redemption-timeout`'s and `sod-violation`'s own
// sections above; production-path coverage lives in consultations.test.ts, that
// increment's own file — but unlike those two, `appendsOn`'s append-decision behavior for
// this code is exercised directly below too, since that helper needs no producer to be
// meaningful.

test("consultation-failed: registry/type presence + class + appendsOn shape only in this file — its producer is finalize's rung 5.5, real as of the second step-5 increment; production-path coverage lives in consultations.test.ts", () => {
  // `code: RefusalCode = 'consultation-failed'` is itself a COMPILE-TIME union-membership
  // check (this file fails to type-check if 'consultation-failed' is ever removed from the
  // union).
  const code: RefusalCode = 'consultation-failed';
  assert.equal(REGISTRY[code], 'refusal');
  assert.equal(
    appendsOn(code, {}),
    false,
    'no terminalRefusals -> record stays open, no append (open-by-default for re-run)',
  );
  assert.equal(appendsOn(code, { terminalRefusals: [code] }), true);
});

// === availability (the second step-5 increment) ==========================================
// `availability` is the third class's single code (SPEC §8): the `unavailable` outcome
// status carries it and `refused()` cannot mint it (compile-time exclusion, pinned in
// outcome-model.test.ts). It is legal but INERT in a leg's `terminalRefusals` —
// `appendsOn` returns `false` for it unconditionally, mirroring the `leg-expired` inert
// pin above, but by a different mechanism: `leg-expired` is inert because the kernel's
// state/expiry gate resolves it before `appendsOn` is ever consulted, while `availability`
// is inert because `appendsOn` itself returns `false` for the whole class before reaching
// the `terminalRefusals` consult — no kernel timing is involved, so this pin needs no
// fixture beyond the helper itself. Its producers are worded two-touch: §11.1's
// required-consultation gate (finalize's rung 5.5) is real as of the second step-5
// increment — production-path coverage lives in consultations.test.ts's "THE AVAILABILITY
// PIN" test — while §10.3's policy gate remains a later build step's second producer
// (future).

test("availability PIN: a leg declaring terminalRefusals:['availability'] has NO effect — appendsOn returns false unconditionally for the availability class, never reaching the terminalRefusals consult", () => {
  assert.equal(REGISTRY.availability, 'availability');
  assert.equal(
    appendsOn('availability', {}),
    false,
    'no terminalRefusals -> never appends (availability class)',
  );
  assert.equal(
    appendsOn('availability', { terminalRefusals: ['availability'] }),
    false,
    'availability never appends even when a leg lists it as terminal',
  );
});

// === registry totality sanity (cross-check against outcome-model.test.ts's own total) ===

// `unsealable-state` (seal()'s refusal, SPEC §8) is the eleventh code. Its own production-path
// coverage is extensive — seal.test.ts's whole gate ladder — so, like unknown-leg, it is not
// duplicated here with a registry-only stub. `effect-mismatch` and `already-redeemed`
// (redeem()'s two profile-conditional refusals, SPEC §11.2) are the twelfth and thirteenth —
// same reasoning: their own production-path coverage is redeem.test.ts's whole gate ladder,
// so this sanity check's total simply grows. `redemption-timeout` (the third step-3
// increment's clock-produced refusal) is the fourteenth; its production-path coverage lives
// in clocks.test.ts, the third step-3 increment's own file, not in this matrix.
// `prior-leg-unverified` (the first step-4 increment's sequencing refusal) is the
// fifteenth; its verifier (kernel/prior-legs.ts) is consumed by open()'s sequencing rung,
// real as of the first step-4 increment; its production-path coverage lives in
// multi-leg.test.ts, the first step-4 increment's own file, not in this matrix.
// `sod-violation` (the second step-4 increment's gate refusal) is the sixteenth; its
// producer is finalize's rung 3.5, real as of the second step-4 increment; its
// production-path coverage lives in multi-leg.test.ts, the second step-4 increment's own
// file, not in this matrix.
// `consultation-failed` (the second step-5 increment's required-consultation refusal,
// SPEC §8) is the seventeenth code; its producer is finalize's rung 5.5, real as of the
// second step-5 increment (this commit) — production-path coverage lives in
// consultations.test.ts, so this sanity check's total simply grows, same as every
// profile-conditional code before it (registry-only here).
// `availability` (the second step-5 increment's third-class code, SPEC §8) is the
// eighteenth and last code added by the second step-5 increment; it is carried by the
// `unavailable`
// outcome status alone and never appends (pinned above, not duplicated here). Its
// producers are worded two-touch: §11.1's required-consultation gate (finalize's rung
// 5.5) is real as of the second step-5 increment — production-path coverage lives in
// consultations.test.ts's "THE AVAILABILITY PIN" test — while §10.3's policy gate remains
// a later build step's second producer (future).
test('every REGISTRY RefusalCode is accounted for in this matrix (9 production-path-tested here + unknown-leg registry-only + unsealable-state production-path-tested in seal.test.ts + effect-mismatch and already-redeemed production-path-tested in redeem.test.ts + redemption-timeout registry-only (production path: clocks.test.ts, third step-3 increment) + prior-leg-unverified registry-only (production path: multi-leg.test.ts, first step-4 increment) + sod-violation registry-only (production path: multi-leg.test.ts, second step-4 increment) + consultation-failed registry-only (production path: consultations.test.ts, second step-5 increment) + availability registry-only (production path: consultations.test.ts, second step-5 increment) = 18)', () => {
  const allCodes = Object.keys(REGISTRY) as RefusalCode[];
  assert.equal(allCodes.length, 18);
});
