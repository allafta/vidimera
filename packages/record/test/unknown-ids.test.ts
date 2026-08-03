// @vidimera/record — unknown-ids.test.ts: Both agent `stage()` and operator `open()` name
// a profile indirectly —
// `stage(content, profileId, subjectRef)` directly, `open(stagedRef)` via the staged
// draft's `profileId` — and BOTH must fail CLOSED on an unconfigured profileId:
// `refused('unknown-profile')`, NO append, NO record.
//
// `unknown-leg` has its FIRST producer here: `stage()` accepts an optional caller-named
// `legId`; a NAMED legId absent from the resolved profile's legs refuses `unknown-leg`
// BEFORE any `putStaged` — pre-record, fail-closed, no draft, no transitionRef. (Omitting
// `legId` still derives `profile.legs[0].id` internally, byte-compatible with every prior
// call site — that path never reaches this refusal.) SPEC §8 names a SECOND producer (a
// persisted draft's legId absent from the resolved profile it resolves under at `open()`)
// and multi-leg profiles add more surface still — neither is built or tested here yet
// (open()'s own draft-legId check; a non-GOVERNED multi-leg profile).

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

// === stage(): unknown legId — the FIRST unknown-leg producer (SPEC §8) ===========

test('stage() naming a legId absent from a SINGLE-leg profile -> refused unknown-leg, fail-closed (no putStaged, no append)', async () => {
  const store = new CountingStore();
  const { agent } = create(makeConfig([captureProfile()], { store }));

  const outcome = await agent.stage(
    { any: 'content' },
    'test.capture.v1',
    DEFAULT_SUBJECT_REF,
    'no-such-leg',
  );

  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unknown-leg');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined, 'unknown-leg never carries a transitionRef');

  // Fail-closed, PRE-RECORD: a caller-named leg absent from the profile writes no draft
  // at all — you can't even compute the would-be stagedRef for an unknown leg, so the
  // absence is proven via the counting store rather than a getStaged(ref) lookup.
  assert.equal(store.putStagedCalls, 0, 'no staged draft for an unknown leg');
  assert.equal(store.appendCalls, 0, 'no append for an unknown leg (stage() never appends anyway)');
});

// === open(): unknown profileId (via a planted staged draft) ===========================

test('open() on a staged draft naming an unconfigured profileId -> refused unknown-profile, no append', async () => {
  // Arrange a staged draft whose profileId is NOT in the config — the fail-closed guard
  // in open() (it never trusts a staged profileId blindly) is the only producer here.
  // Direct putStaged is legitimate for arranging store state in a test.
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

// === open(): unknown legId — the SECOND unknown-leg producer (SPEC §8) ================
//
// A staged draft's legId can go stale between stage() and open() — e.g. two create()
// instances sharing one Store with different leg ids configured for the same profile id
// (a profile redeploy while a stagedRef from the old configuration is still
// outstanding). open() must re-validate staged.legId against the profile it resolves
// under, the same way stage() validates a caller-named legId (kernel/stage.ts).

test("open() on a staged draft whose legId is absent from the profile it resolves under -> refused unknown-leg, fail-closed, no append (SPEC §8's SECOND unknown-leg producer)", async () => {
  const store = new CountingStore();

  // Stage under a profile whose one leg is 'approver-decide'.
  const { agent } = create(makeConfig([captureProfile({ legId: 'approver-decide' })], { store }));
  const staged = await agent.stage(CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;

  const appendsBefore = store.appendCalls;

  // A second create() instance over the SAME store resolves the SAME profile id, but its
  // one leg has been renamed since — modeling a profile redeploy while the staged draft
  // above is still outstanding.
  const { operator } = create(makeConfig([captureProfile({ legId: 'renamed-leg' })], { store }));
  const outcome = await operator.open(staged.value.stagedRef);

  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unknown-leg');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined, 'unknown-leg never carries a transitionRef');
  assert.equal(
    store.appendCalls,
    appendsBefore,
    'open() appends nothing when the staged legId is unknown to the resolved profile',
  );
});

// === open(): unknown/missing stagedRef -> THROWS (caller error — SPEC §8 "Caller ===
// === errors are not refusals") =========================================================
//
// A stagedRef that resolves to no staged draft at all (never staged, or the store was
// never given one) is distinct from the unknown-PROFILE case above (a draft exists but
// names an unconfigured profile — that's a domain refusal). No CORE RefusalCode fits a
// missing draft, so open() throws rather than mint a code — mirroring replay()/
// verifyChain()'s "a record that does not exist is a caller error" posture.

test('open() on a stagedRef that resolves to NO staged draft -> THROWS (caller error, not a domain refusal)', async () => {
  const { operator } = create(makeConfig([captureProfile()]));
  await assert.rejects(() => operator.open('sha256:nonexistent-staged-ref'), /unknown stagedRef/);
});

// === finalize(): unknown/missing recordId -> THROWS (caller error — SPEC §8) ==========
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
