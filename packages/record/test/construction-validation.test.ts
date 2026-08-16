// @vidimera/record — construction-validation.test.ts (SPEC §9.1 "Construction is loud"):
// `create()` is fail-CLOSED
// at construction. Every not-yet-enforceable GOVERNED declaration THROWS a message whose
// HEAD is byte-preserved —
//   "GOVERNED feature not available in this build (<field>)"
// — with per-guard prose (what is unavailable, which SPEC section lifts it) appended after
// it (guards lift feature-by-feature as later build steps add enforcement). Structural
// rejections throw a DIFFERENT (non-GOVERNED) error: zero legs (exactly one required),
// a stray redemption key placed outside a `redeem` block, `reverify` on a non-live
// profile, an unresolved `canonicalizerRef`, and a duplicate profile id. The final
// section below covers `open()`'s `supersedes` options guard — not construction-time, but
// the same GOVERNED shape and the same `governedUnavailable` helper.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  defaultCanonicalizer,
  effectSeamProfile,
  makeConfig,
} from './helpers/profiles.js';

// The byte-preserved HEAD of every GOVERNED message — up to and including the field's
// closing parenthesis. `config.ts`'s `governedUnavailable(field, contract)` appends
// per-guard prose after this head; the head itself never changes, so this constant (and
// the startsWith check below) is the ONLY assertion in this file that pins exact text.
const GOVERNED = (field: string) => `GOVERNED feature not available in this build (${field})`;

/** Assert `create` throws the GOVERNED message for `field` (byte-preserved head, any tail). */
function assertGoverned(profile: ConfirmProfile, field: string): void {
  assert.throws(
    () => create(makeConfig([profile])),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.startsWith(GOVERNED(field)),
        `expected the GOVERNED message to start with the byte-preserved head for field '${field}', got: ${err.message}`,
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

test('legs.length > 1 is accepted at construction — the sequencing that orders them is built', () => {
  // INVERTED, at the first step-4 increment: the kernel increment pinned a GOVERNED
  // throw here while nothing enforced §10.1's "Legs conclude in order". The sequencing
  // rung and the verify-by-replay reference check land in the same commit as this lift,
  // so the guard's stated trigger (multi-leg maker-checker sequencing, §10.1) has fired
  // for the ordering half; per-leg `sod`/`proposer` remain GOVERNED until the second
  // step-4 increment builds the gate that reads the evidence.
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assert.doesNotThrow(() =>
    create(
      makeConfig([
        { ...p, legs: [leg, { id: 'second-leg', allowedAuthorities: ['session:test-app'] }] },
      ]),
    ),
  );
});

test('structural: duplicate leg ids throw a structural error naming both positions', () => {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assertStructural({ ...p, legs: [leg, { ...leg }] }, /duplicate leg id/i);
});

test('GOVERNED: a MULTI-LEG profile declaring sod still throws (sod) — the gate is the second step-4 increment', () => {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assertGoverned(
    {
      ...p,
      legs: [
        leg,
        {
          id: 'second-leg',
          allowedAuthorities: ['session:test-app'],
          sod: { notActorOf: [leg.id] },
        },
      ],
    },
    'sod',
  );
});

test('GOVERNED: a MULTI-LEG profile declaring proposer still throws (proposer)', () => {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assertGoverned(
    {
      ...p,
      legs: [
        leg,
        { id: 'second-leg', allowedAuthorities: ['session:test-app'], proposer: 'maker:1' },
      ],
    },
    'proposer',
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

test('GOVERNED: a SINGLE-LEG profile declaring proposer throws (proposer)', () => {
  // proposer is a per-leg SoD control that legs.length>1 would silently miss on a single
  // leg, so it gets its own throw. The profile is otherwise valid single-leg.
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
  assertGoverned({ ...captureProfile(), policySource: 'opa://x' }, 'policySource');
});

test('redeem.redeemBound is accepted at construction — the clock that honors it is built', () => {
  // INVERTED, at the third step-3 increment: the second step-3 increment pinned a
  // GOVERNED throw here (its `redeeming` edges could not carry §4's declared `bound`
  // until the clock existed). The third step-3 increment lifts the guard as its own
  // stated trigger names, landing the payload and `dueAt` here, AND the en-passant
  // resolution that consumes `dueAt` at the seams (kernel/redeem.ts's shared prologue;
  // finalize()'s and open()'s own clock rungs), all in the same increment.
  // Bound-value validation deliberately mirrors expiry.ttl's treatment (no novel posture).
  const declaring = {
    ...effectSeamProfile(),
    redeem: { confirmToRedeem: 1, redeemBound: 86400 },
  };
  assert.doesNotThrow(() => create(makeConfig([declaring])));
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

test('structural: legs.length === 0 throws a structural "at least one leg" error (NOT the GOVERNED string)', () => {
  assertStructural({ ...captureProfile(), legs: [] }, /at least one leg/i);
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

test('structural: reverify:true on a non-live (staged) profile is refused (live capture is not implemented in this build)', () => {
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

// === open(): the `supersedes` options guard (GOVERNED, not construction-time) =========
//
// `supersedes` is the one draft-ahead `open()` option with no profile-level construction
// switch (recovery of a terminal predecessor, §2) — none of the guards above can reach it,
// since they only ever see a PROFILE, never an `open()` call's options bag. The guard lives
// in `kernel/open.ts` instead, reusing the SAME `governedUnavailable(field, contract)`
// helper. Proven via an `as`-cast past `OpenOptions`'s empty (`Record<string, never>`) type
// — this exercises the RUNTIME sweep a plain JavaScript caller (ignoring the type) would
// hit, not merely what the compiler would reject.

test("open(): passing an unexpected options key ('supersedes') throws GOVERNED, byte-preserved head", async () => {
  const { agent, operator } = create(makeConfig([captureProfile()]));
  const staged = await agent.stage({ any: 'content' }, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;

  const badOpts = {
    supersedes: { recordId: 'rec-prior', chainHead: 'sha256:deadbeef' },
  } as unknown as Parameters<typeof operator.open>[1];

  await assert.rejects(
    () => operator.open(staged.value.stagedRef, badOpts),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.startsWith(GOVERNED('supersedes')),
        `expected the GOVERNED message to start with the byte-preserved head for field 'supersedes', got: ${err.message}`,
      );
      return true;
    },
  );
});
