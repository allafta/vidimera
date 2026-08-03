// @vidimera/record — construction-validation.test.ts (design §5 "Construction guards
// (fail-closed)" / §6 / §9 "Fail-closed construction guards"): `create()` is fail-CLOSED
// at construction. Every not-yet-enforceable GOVERNED declaration THROWS the exact string
//   "GOVERNED feature not available in this build (<field>)"
// (guards lift feature-by-feature as slices 5+ build enforcement). Structural rejections
// throw a DIFFERENT (non-GOVERNED) error: zero legs (exactly one required — O2), a stray
// redemption key placed outside a `redeem` block (O3), `reverify` on a non-live profile
// (O3), an unresolved `canonicalizerRef`, and a duplicate profile id.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import {
  captureProfile,
  defaultCanonicalizer,
  effectSeamProfile,
  makeConfig,
} from './helpers/profiles.js';

const GOVERNED = (field: string) => `GOVERNED feature not available in this build (${field})`;

/** Assert `create` throws EXACTLY the GOVERNED message for `field`. */
function assertGoverned(profile: ConfirmProfile, field: string): void {
  assert.throws(
    () => create(makeConfig([profile])),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.equal(
        err.message,
        GOVERNED(field),
        `expected the exact GOVERNED message for field '${field}'`,
      );
      return true;
    },
    `create() must throw GOVERNED for field '${field}'`,
  );
}

/** Assert `create` throws a STRUCTURAL error (NOT the GOVERNED string) matching `re`. */
function assertStructural(cfgProfile: ConfirmProfile, re: RegExp): void {
  assert.throws(
    () => create(makeConfig([cfgProfile])),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.doesNotMatch(
        err.message,
        /GOVERNED feature not available/,
        'a structural error must NOT be the GOVERNED string',
      );
      assert.match(err.message, re);
      return true;
    },
  );
}

// === a plain valid profile constructs cleanly ========================================

test('create(): a minimal single-leg capture-only profile constructs without throwing', () => {
  assert.doesNotThrow(() => create(makeConfig([captureProfile()])));
});

test('create(): a single-leg effect-seam (redeem-block) profile constructs without throwing', () => {
  assert.doesNotThrow(() => create(makeConfig([effectSeamProfile()])));
});

// === GOVERNED throws — one per not-yet-enforceable field ==============================

test("GOVERNED: captureMode:'live' throws (captureMode)", () => {
  assertGoverned({ ...captureProfile(), captureMode: 'live' }, 'captureMode');
});

test('GOVERNED: legs.length > 1 throws (legs)', () => {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined)
    throw new Error(
      'construction-validation.test.ts: p.legs[0] missing — captureProfile() must have at least one leg',
    );
  assertGoverned(
    { ...p, legs: [leg, { id: 'second-leg', allowedAuthorities: ['session:test-app'] }] },
    'legs',
  );
});

test('GOVERNED: a leg declaring sod throws (sod)', () => {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined)
    throw new Error(
      'construction-validation.test.ts: p.legs[0] missing — captureProfile() must have at least one leg',
    );
  assertGoverned({ ...p, legs: [{ ...leg, sod: { notActorOf: ['proposer'] } }] }, 'sod');
});

test('GOVERNED: a SINGLE-LEG profile declaring proposer throws (proposer) — the S-1 case', () => {
  // proposer is a per-leg SoD control that legs.length>1 would silently miss on a single
  // leg, so it gets its own throw (design §9 S-1). The profile is otherwise valid single-leg.
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined)
    throw new Error(
      'construction-validation.test.ts: p.legs[0] missing — captureProfile() must have at least one leg',
    );
  assertGoverned({ ...p, legs: [{ ...leg, proposer: 'someProposer' }] }, 'proposer');
});

test('GOVERNED: a leg declaring requiredConsultations throws (requiredConsultations)', () => {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined)
    throw new Error(
      'construction-validation.test.ts: p.legs[0] missing — captureProfile() must have at least one leg',
    );
  assertGoverned(
    { ...p, legs: [{ ...leg, requiredConsultations: ['facts'] }] },
    'requiredConsultations',
  );
});

test('GOVERNED: a leg declaring freshness throws (freshness)', () => {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined)
    throw new Error(
      'construction-validation.test.ts: p.legs[0] missing — captureProfile() must have at least one leg',
    );
  assertGoverned({ ...p, legs: [{ ...leg, freshness: { facts: 3600 } }] }, 'freshness');
});

test('GOVERNED: a leg declaring requiredAcks throws (requiredAcks)', () => {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined)
    throw new Error(
      'construction-validation.test.ts: p.legs[0] missing — captureProfile() must have at least one leg',
    );
  assertGoverned({ ...p, legs: [{ ...leg, requiredAcks: ['counterparty'] }] }, 'requiredAcks');
});

test('GOVERNED: a leg declaring ackMode throws (ackMode)', () => {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined)
    throw new Error(
      'construction-validation.test.ts: p.legs[0] missing — captureProfile() must have at least one leg',
    );
  assertGoverned({ ...p, legs: [{ ...leg, ackMode: 'counterparty' }] }, 'ackMode');
});

test('GOVERNED: a leg declaring eligibility throws (eligibility)', () => {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined)
    throw new Error(
      'construction-validation.test.ts: p.legs[0] missing — captureProfile() must have at least one leg',
    );
  assertGoverned({ ...p, legs: [{ ...leg, eligibility: 'employed' }] }, 'eligibility');
});

test('GOVERNED: a profile declaring policySource throws (policySource)', () => {
  assertGoverned({ ...captureProfile(), policySource: 'opa://tide/week' }, 'policySource');
});

// === the guard sweep is TOTAL ========================================================

test('GOVERNED: a profile declaring TWO governed features still throws (guard sweep is total)', () => {
  // captureMode:'live' AND policySource — must throw (on the first guard reached), never
  // slip through. We only assert it throws GOVERNED for one of them, not which one.
  const p: ConfirmProfile = { ...captureProfile(), captureMode: 'live', policySource: 'opa://x' };
  assert.throws(
    () => create(makeConfig([p])),
    /GOVERNED feature not available in this build \((captureMode|policySource)\)/,
  );
});

// === structural rejections (a DIFFERENT error, not the GOVERNED string) ================

test('structural: legs.length === 0 throws a structural "exactly one leg" error (NOT the GOVERNED string)', () => {
  assertStructural({ ...captureProfile(), legs: [] }, /exactly one leg/i);
});

test('structural: a stray redemption key on the PROFILE (outside a redeem block) is refused', () => {
  const p = captureProfile();
  // confirmToRedeem only belongs inside `redeem{}`; as a top-level profile key it is stray.
  const strayed = { ...p, confirmToRedeem: 1 } as unknown as ConfirmProfile;
  assertStructural(strayed, /redemption key .*confirmToRedeem/i);
});

test('structural: a stray redemption key on a LEG (outside a redeem block) is refused', () => {
  const p = captureProfile();
  const strayed = { ...p, legs: [{ ...p.legs[0], redeemBound: 10 }] } as unknown as ConfirmProfile;
  assertStructural(strayed, /redemption key .*redeemBound/i);
});

test('structural: reverify:true on a non-live (staged) profile is refused (deferred; no live profiles at slice 3)', () => {
  const p = effectSeamProfile();
  const withReverify: ConfirmProfile = { ...p, redeem: { ...p.redeem, reverify: true } };
  assertStructural(withReverify, /reverify/i);
});

test('structural: an unresolved canonicalizerRef throws (fail-closed registry resolution)', () => {
  const p = captureProfile({ canonicalizerRef: 'does.not.exist.v9' });
  // Register the DEFAULT ref only — the profile names a ref absent from the registry.
  const cfg = makeConfig([p], { canonicalizers: { 'some.other.ref': defaultCanonicalizer() } });
  assert.throws(() => create(cfg), /unresolved canonicalizerRef .*does\.not\.exist\.v9/i);
});

test('structural: a duplicate profile id is rejected (fail-fast)', () => {
  const a = captureProfile({ id: 'dup.v1' });
  const b = effectSeamProfile({ id: 'dup.v1' });
  assert.throws(() => create(makeConfig([a, b])), /duplicate profile id .*dup\.v1/i);
});
