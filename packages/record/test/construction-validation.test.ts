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
  // for the ordering half; per-leg `sod`/`proposer` were GOVERNED until the second step-4
  // increment built the gate that reads the evidence (their own inversions sit further
  // down this file).
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

test('a checker leg declaring sod.notActorOf naming the maker leg is accepted — the gate is built', () => {
  // INVERTED, at the second step-4 increment: the kernel increment pinned a GOVERNED
  // throw here, and the first step-4 increment re-pinned it on a multi-leg profile
  // while the gate was still unbuilt. The gate lands at finalize's rung 3.5 in the same
  // commit as this lift, so the guard's stated trigger has fired.
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assert.doesNotThrow(() =>
    create(
      makeConfig([
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
      ]),
    ),
  );
});

test('proposer on a multi-leg profile is accepted — any leg, including the first', () => {
  // INVERTED, at the second step-4 increment (same argument as the sod inversion above).
  // proposer needs no prior legs — SPEC §10.1: "the designated proposer may not decide
  // their own leg" is self-contained — but the FEATURE is multi-leg-scoped (§10.1's
  // applicability sentence), so the acceptance shape is a multi-leg profile.
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assert.doesNotThrow(() =>
    create(
      makeConfig([
        {
          ...p,
          legs: [
            { ...leg, proposer: 'proposer:1' },
            { id: 'second-leg', allowedAuthorities: ['session:test-app'] },
          ],
        },
      ]),
    ),
  );
});

test('structural: sod on a FIRST leg (no earlier legs) throws — single-leg or multi-leg alike', () => {
  // The single-leg shape was GOVERNED before the second step-4 increment; it is now
  // STRUCTURAL, per the ruling: notActorOf entries must name strictly-earlier legs, and
  // a first leg has none — no declarable-but-inert configuration exists.
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assertStructural(
    { ...p, legs: [{ ...leg, sod: { notActorOf: ['anything'] } }] },
    /strictly-earlier/i,
  );
  assertStructural(
    {
      ...p,
      legs: [
        { ...leg, sod: { notActorOf: ['second-leg'] } },
        { id: 'second-leg', allowedAuthorities: ['session:test-app'] },
      ],
    },
    /strictly-earlier/i,
  );
});

test('structural: proposer on a SINGLE-LEG profile throws — §10.1 is multi-leg-scoped', () => {
  // GOVERNED before the second step-4 increment; now STRUCTURAL per the ruling: SPEC
  // §10.1 opens "Applies when the profile declares more than one leg." and the
  // conservative reading scopes proposer with the feature.
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assertStructural({ ...p, legs: [{ ...leg, proposer: 'proposer:1' }] }, /more than one leg/i);
});

test('structural: proposer as an empty string throws — declarable-but-inert, found at the final review', () => {
  // Found at the final review of the second step-4 increment: an empty-string `proposer`
  // constructed fine but could never fire at the gate — finalize's rung 3 `isValidIdentity`
  // requires a non-empty `principal`, so `leg.proposer === identity.principal` is
  // unsatisfiable for `''` — exactly the declarable-but-inert trap `validateSodShape`'s own
  // doc comment claims cannot exist. MULTI-leg so only the emptiness rule fires (a
  // single-leg profile would also trip the "more than one leg" rule above).
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assertStructural(
    {
      ...p,
      legs: [
        { ...leg, proposer: '' },
        { id: 'second-leg', allowedAuthorities: ['session:test-app'] },
      ],
    },
    /empty/i,
  );
});

test('structural: notActorOf rejects empty, own-leg, later-leg, unknown, and duplicate entries', () => {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  const threeLegs = (checkerSod: { notActorOf: string[] }) => ({
    ...p,
    legs: [
      leg,
      { id: 'checker-decide', allowedAuthorities: ['session:test-app'], sod: checkerSod },
      { id: 'signer-decide', allowedAuthorities: ['session:test-app'] },
    ],
  });
  assertStructural(threeLegs({ notActorOf: [] }), /non-empty/i);
  assertStructural(threeLegs({ notActorOf: ['checker-decide'] }), /strictly-earlier/i);
  assertStructural(threeLegs({ notActorOf: ['signer-decide'] }), /strictly-earlier/i);
  assertStructural(threeLegs({ notActorOf: ['no-such-leg'] }), /strictly-earlier/i);
  assertStructural(threeLegs({ notActorOf: [leg.id, leg.id] }), /duplicate/i);
});

test('requiredConsultations is accepted at construction — the gate is built', () => {
  // INVERTED, at the second step-5 increment: the kernel increment pinned a GOVERNED
  // throw here while no gate enforced the declaration. The required-consultation rung
  // lands at finalize's rung 5.5 in the same commit as this lift, so the guard's stated
  // trigger has fired.
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assert.doesNotThrow(() =>
    create(makeConfig([{ ...p, legs: [{ ...leg, requiredConsultations: ['risk-check'] }] }])),
  );
});

test('structural: requiredConsultations rejects empty, duplicate, empty-string, and reserved kinds', () => {
  // The settled fail-closed class (the notActorOf/proposer rulings): no
  // declarable-but-inert configuration exists. The reserved half is SPEC §11.1's own
  // sentence: "declaring a reserved kind in `requiredConsultations` is likewise a
  // profile-construction error".
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  const withReq = (kinds: string[]) => ({
    ...p,
    legs: [{ ...leg, requiredConsultations: kinds }],
  });
  assertStructural(withReq([]), /non-empty/i);
  assertStructural(withReq(['risk-check', 'risk-check']), /duplicate/i);
  assertStructural(withReq(['']), /kind/i);
  assertStructural(withReq(['facts']), /reserved/i);
  assertStructural(withReq(['chain-verify']), /reserved/i);
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

test('eligibility is accepted at construction — the gate arm is built', () => {
  // INVERTED, at the first step-6 increment: the kernel increment pinned a GOVERNED
  // throw here while no gate consumed the declaration. The implicit-first eligibility
  // arm lands at finalize's required-consultation rung in the same commit as this
  // lift, so the guard's stated trigger has fired.
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assert.doesNotThrow(() =>
    create(makeConfig([{ ...p, legs: [{ ...leg, eligibility: 'hr.approver-check' }] }])),
  );
});

test('structural: an empty eligibility label and a double declaration each throw', () => {
  // Empty: NOT the inertness trap (the gate keys on declaration presence, never the
  // label) — the malformed-reference rule: an opaque reference that references nothing.
  // Double: SPEC §10.4's own sentence — "Declaring `eligibility` **and** also listing
  // `'eligibility'` in `requiredConsultations` is a construction error (declare it
  // once)".
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assertStructural({ ...p, legs: [{ ...leg, eligibility: '' }] }, /empty/i);
  assertStructural(
    {
      ...p,
      legs: [{ ...leg, eligibility: 'hr.approver-check', requiredConsultations: ['eligibility'] }],
    },
    /declare it once/i,
  );
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
