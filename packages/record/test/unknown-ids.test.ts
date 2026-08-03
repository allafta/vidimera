// @vidimera/record — unknown-ids.test.ts (design §6 "unknown-ids.test.ts" / §9 "unknown-leg
// deferral"): only the `unknown-profile` path has a slice-3 producer. Both agent `stage()`
// and operator `open()` name a profile indirectly — `stage(content, profileId, subjectRef)`
// directly, `open(stagedRef)` via the staged draft's `profileId` — and BOTH must fail
// CLOSED on an unconfigured profileId: `refused('unknown-profile')`, NO append, NO record.
//
// `unknown-leg` has NO slice-3 producer (single-leg; legId is derived internally from the
// one leg, never caller-named) — it is asserted at registry/type level only in
// refusal-matrix.test.ts (Task 9), not here.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create } from '../src/create.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
} from './helpers/profiles.js';
import { CountingStore } from './helpers/stores.js';

const CONTENT = { subject: 'week-1', total: 40 };

// === stage(): unknown profileId ========================================================

test('stage() naming an unconfigured profileId -> refused unknown-profile, fail-closed (no putStaged, no append)', async () => {
  const store = new CountingStore();
  const { agent } = create(makeConfig([captureProfile()], { store }));

  const outcome = await agent.stage({ any: 'content' }, 'no.such.profile.v1', DEFAULT_SUBJECT_REF);

  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unknown-profile');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined, 'unknown-profile never carries a transitionRef');

  // Fail-closed: not even a staged draft is written for an unknown profile (legId cannot
  // be derived without a resolved profile), and certainly no transition is appended.
  assert.equal(store.putStagedCalls, 0, 'no staged draft for an unknown profile');
  assert.equal(store.appendCalls, 0, 'no append for an unknown profile');
});

// === open(): unknown profileId (via a planted staged draft) ===========================

test('open() on a staged draft naming an unconfigured profileId -> refused unknown-profile, no append', async () => {
  // Arrange a staged draft whose profileId is NOT in the config — the fail-closed guard
  // in open() (it never trusts a staged profileId blindly) is the only producer here.
  // Direct putStaged is legitimate for arranging store state (Task 7 brief).
  const store = new CountingStore();
  const stagedRef = 'sha256:deadbeef';
  await store.putStaged({
    id: stagedRef,
    profileId: 'no.such.profile.v1',
    legId: 'approver-decide',
    subjectRef: DEFAULT_SUBJECT_REF,
    contentDigest: 'sha256:00',
  });
  const appendsBefore = store.appendCalls;

  const { operator } = create(makeConfig([captureProfile()], { store }));
  const outcome = await operator.open(stagedRef);

  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unknown-profile');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined);
  assert.equal(
    store.appendCalls,
    appendsBefore,
    'open() appends nothing when the profile is unknown',
  );
});

// === open(): unknown/missing stagedRef -> THROWS (caller error, design §8, SPEC "Caller ===
// === errors are not refusals") =========================================================
//
// A stagedRef that resolves to no staged draft at all (never staged, or the store was
// never given one) is distinct from the unknown-PROFILE case above (a draft exists but
// names an unconfigured profile — that's a domain refusal). No CORE RefusalCode fits a
// missing draft, so open() throws rather than mint a code — mirroring replay()/
// verifyChain()'s "a record that does not exist is a caller error" posture (task-12-report.md
// Item 6).

test('open() on a stagedRef that resolves to NO staged draft -> THROWS (caller error, not a domain refusal)', async () => {
  const { operator } = create(makeConfig([captureProfile()]));
  await assert.rejects(() => operator.open('sha256:nonexistent-staged-ref'), /unknown stagedRef/);
});

// === finalize(): unknown/missing recordId -> THROWS (caller error, design §8) ==========
//
// Symmetric to open() above: a recordId that resolves to no chain at all was never
// opened — a caller error (the union is contract-fixed; no fitting RefusalCode), not a
// domain refusal.

test('finalize() on a recordId that resolves to NO chain -> THROWS (caller error, not a domain refusal)', async () => {
  const { operator } = create(makeConfig([captureProfile()]));
  await assert.rejects(
    () => operator.finalize('rec-nonexistent', identity(), CONTENT, facts()),
    /unknown recordId/,
  );
});
