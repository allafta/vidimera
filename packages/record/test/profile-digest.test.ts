// @vidimera/record — profile-digest.test.ts (SPEC §4's "opened" snapshot):
// `profileDigest` is a DATA-ONLY projection of a ConfirmProfile (declarative fields only;
// function members excluded) fed through library JCS + digest. This file exports the
// helper and proves its three properties; it is RECORDED into `opened` and is meant to be
// COMPARED against a later live read once a drift detector exists (none in this build).
// The projection is validation-free:
// `profileDigest` digests a profile's data regardless of whether `create()` would accept it.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { ConfirmProfile } from '../src/config.js';
import { profileDigest } from '../src/profile-digest.js';
import { captureProfile } from './helpers/profiles.js';

test('profileDigest emits a Digest-shaped value ("sha256:<64-lowercase-hex>")', () => {
  assert.match(profileDigest(captureProfile()), /^sha256:[0-9a-f]{64}$/);
});

// === declarative-field coverage: changing ANY declarative field changes the digest ====

test('declarative-field coverage: changing any declarative field changes the digest', () => {
  const base = captureProfile();
  const baseDigest = profileDigest(base);
  const baseLeg = base.legs[0];
  if (baseLeg === undefined)
    throw new Error(
      'profile-digest.test.ts: base.legs[0] missing — captureProfile() must have at least one leg',
    );

  // Each mutation touches a distinct declarative field of ConfirmProfile / LegSpec.
  const mutations: Array<{ label: string; profile: ConfirmProfile }> = [
    { label: 'id', profile: { ...base, id: 'test.capture.v2' } },
    {
      label: 'subject.canonicalizerRef',
      profile: { ...base, subject: { canonicalizerRef: 'other.canonical.v1' } },
    },
    { label: 'captureMode', profile: { ...base, captureMode: 'live' } },
    { label: 'expiry (ttl value)', profile: { ...base, expiry: { ttl: 999 } } },
    { label: "expiry ({ttl} vs 'none')", profile: { ...base, expiry: 'none' } },
    { label: 'policySource (added)', profile: { ...base, policySource: 'opa://x' } },
    { label: 'redeem (added)', profile: { ...base, redeem: { confirmToRedeem: 1 } } },
    { label: 'legs[0].id', profile: { ...base, legs: [{ ...baseLeg, id: 'other-leg' }] } },
    {
      label: 'legs[0].allowedAuthorities',
      profile: { ...base, legs: [{ ...baseLeg, allowedAuthorities: ['mtls:svc'] }] },
    },
    {
      label: 'legs[0].terminalRefusals',
      profile: { ...base, legs: [{ ...baseLeg, terminalRefusals: ['content-drift'] }] },
    },
  ];

  for (const { label, profile } of mutations) {
    assert.notEqual(
      profileDigest(profile),
      baseDigest,
      `changing ${label} must change the profileDigest`,
    );
  }
});

// === JCS key-order stability ==========================================================

test('JCS key-order stability: the same profile authored with keys in different orders digests identically', () => {
  const canonical: ConfirmProfile = {
    id: 'test.capture.v1',
    subject: { canonicalizerRef: 'test.canonical.v1' },
    legs: [{ id: 'approver-decide', allowedAuthorities: ['session:test-app'] }],
    captureMode: 'staged',
    expiry: { ttl: 3600 },
  };

  // Same data, keys authored in a DIFFERENT insertion order at every object level.
  const reordered = {
    expiry: { ttl: 3600 },
    captureMode: 'staged' as const,
    legs: [{ allowedAuthorities: ['session:test-app'], id: 'approver-decide' }],
    subject: { canonicalizerRef: 'test.canonical.v1' },
    id: 'test.capture.v1',
  };

  assert.equal(profileDigest(reordered), profileDigest(canonical));
});

// === function-member exclusion ========================================================

test('function-member exclusion: a top-level function property does not change the digest', () => {
  const base = captureProfile();
  const withFn = { ...base, helper: () => 'nope' } as unknown as ConfirmProfile;
  assert.equal(profileDigest(withFn), profileDigest(base));
});

test('function-member exclusion: a NESTED function property (on a leg) does not change the digest', () => {
  const base = captureProfile();
  const withNestedFn = {
    ...base,
    legs: [{ ...base.legs[0], render: () => 'nope' }],
  } as unknown as ConfirmProfile;
  assert.equal(profileDigest(withNestedFn), profileDigest(base));
});

test('function-member exclusion is orthogonal to data: a data change still registers even alongside a function member', () => {
  const base = captureProfile();
  const withFnAndDataChange = {
    ...base,
    id: 'changed.v9',
    helper: () => 'nope',
  } as unknown as ConfirmProfile;
  assert.notEqual(
    profileDigest(withFnAndDataChange),
    profileDigest(base),
    'the function member is ignored, but the id change must still move the digest',
  );
});
