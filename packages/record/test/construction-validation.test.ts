// @vidimera/record — construction-validation.test.ts (SPEC §9.1 "Construction is loud"):
// `create()` is fail-CLOSED
// at construction. Every not-yet-enforceable GOVERNED declaration THROWS a message whose
// HEAD is byte-preserved —
//   "GOVERNED feature not available in this build (<field>)"
// — with per-guard prose (what is unavailable, which SPEC section lifts it) appended after
// it (guards lift feature-by-feature as later build steps add enforcement). Structural
// rejections throw a DIFFERENT (non-GOVERNED) error: zero legs (exactly one required),
// a stray redemption key placed outside a `redeem` block, `reverify` on a non-live
// profile, an unresolved `canonicalizerRef`, and a duplicate profile id. `open()`'s
// `supersedes` options key was the one GOVERNED guard living outside this file's
// construction-time scope (`kernel/open.ts`, reusing this same `governedUnavailable`
// helper); it lifted at the step-8 recovery increment — recovery.test.ts's own intake
// test now pins the guard's absence (a well-formed `supersedes` refuses or succeeds on
// its merits) alongside the generic unknown-key GOVERNED throw that remains.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { ConfirmProfile, LegSpec } from '../src/config.js';
import { create } from '../src/create.js';
import {
  captureProfile,
  defaultCanonicalizer,
  effectSeamProfile,
  liveProfile,
  makeConfig,
} from './helpers/profiles.js';

/** A single-leg config with `extra` merged onto the leg — the `validateFindingsFlow`
 * tests' own builder (this file's other settled-class tests each hand-roll `{ ...p,
 * legs: [{ ...leg, ... }] }` inline; this is the first pair to need the SAME shape
 * across two tests, so it is named once here rather than duplicated). */
function cfgWithLeg(extra: Partial<LegSpec>) {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  return makeConfig([{ ...p, legs: [{ ...leg, ...extra }] }]);
}

/** A single-profile `Config` — `validateLiveCapture`'s own tests' shorthand for the
 * `makeConfig([profile])` pattern this file otherwise repeats inline (added for the
 * live-capture increment; no equivalent existed here before it). */
function cfg(profile: ConfirmProfile) {
  return makeConfig([profile]);
}

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

test("captureMode:'live' is accepted at construction — the mode's own obligations are gated (the live-capture increment)", () => {
  // INVERTED, at the live-capture increment: the kernel increment pinned a GOVERNED
  // throw here while nothing built the mode's own obligations. `validateLiveCapture`
  // (config.ts) now enforces them structurally — a declared required consultation per
  // leg and a declared redemption tail — and `kernel/redeem.ts`'s
  // `refuseCorrespondenceMismatch` gives a declared `reverify` a real seam to act at, so
  // the guard's stated trigger (SPEC §9.2) has fired.
  assert.doesNotThrow(() => create(cfg(liveProfile())));
});

// === validateLiveCapture: SPEC §9.2's live mode (the live-capture increment) ===

test('live capture: every leg requires a consultation, and the redemption tail is declared', () => {
  const missingConsultations = liveProfile();
  missingConsultations.legs[0] = {
    ...(missingConsultations.legs[0] as LegSpec),
    requiredConsultations: undefined,
  };
  assert.throws(() => create(cfg(missingConsultations)), /requiredConsultations|re-derivation/i);

  const noRedeem = liveProfile();
  noRedeem.redeem = undefined;
  assert.throws(() => create(cfg(noRedeem)), /redeem|confirmToRedeem|reverify/i);

  const emptyRedeem = liveProfile();
  emptyRedeem.redeem = {};
  assert.throws(() => create(cfg(emptyRedeem)), /confirmToRedeem|reverify/i);

  assert.doesNotThrow(() => create(cfg(liveProfile())));
  const ageOnly = liveProfile();
  ageOnly.redeem = { confirmToRedeem: 3600 };
  assert.doesNotThrow(() => create(cfg(ageOnly)));
  const both = liveProfile();
  both.redeem = { confirmToRedeem: 3600, reverify: true };
  assert.doesNotThrow(() => create(cfg(both)));
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

// === validateFindingsFlow: SPEC §10.2's both-or-neither + the settled class (second
// step-7 increment — the ackMode/requiredAcks lift) ===

test('findings flow: either field alone is a construction error, both-or-neither', () => {
  assert.throws(() => create(cfgWithLeg({ ackMode: 'any' })), /both-or-neither|requiredAcks/i);
  assert.throws(
    () => create(cfgWithLeg({ requiredAcks: ['variance'] })),
    /both-or-neither|ackMode/i,
  );
});

test('findings flow: the settled class on requiredAcks — non-empty, distinct, non-empty strings; facts is LEGAL (own namespace)', () => {
  assert.throws(() => create(cfgWithLeg({ ackMode: 'any', requiredAcks: [] })), /empty/i);
  assert.throws(
    () => create(cfgWithLeg({ ackMode: 'any', requiredAcks: ['x', 'x'] })),
    /distinct|duplicate/i,
  );
  assert.throws(() => create(cfgWithLeg({ ackMode: 'any', requiredAcks: [''] })), /empty/i);
  // Finding kinds are their own namespace — SPEC §10.2: "the reserved consultation
  // kinds do not apply to them". 'facts' as a requiredAcks kind constructs cleanly:
  assert.doesNotThrow(() => create(cfgWithLeg({ ackMode: 'any', requiredAcks: ['facts'] })));
  assert.doesNotThrow(() =>
    create(cfgWithLeg({ ackMode: 'counterparty', requiredAcks: ['variance', 'note'] })),
  );
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

test('policySource is accepted at construction — the notarization contract is built end to end', () => {
  // INVERTED, at the second step-6 increment (the EIGHTH self-authored inversion): the
  // kernel increment pinned a GOVERNED throw here while nothing bound or compared a
  // policy digest. The open() binding contract, the finalize presence contract, and
  // rung (4.5) land in the same commit as this lift, so the guard's stated trigger has
  // fired for the whole three-seam obligation.
  const p = captureProfile();
  assert.doesNotThrow(() => create(makeConfig([{ ...p, policySource: 'rules.v1' }])));
});

test('structural: an empty policySource label throws — the malformed-reference rule', () => {
  const p = captureProfile();
  assertStructural({ ...p, policySource: '' }, /empty/i);
});

test('structural: signing accepts only the literal true — any other declared value throws', () => {
  // The settled fail-closed class, added at the AL2 mint increment's final review:
  // `signing?: true` closes the `signing: false` inertness at the TYPE level for a TS
  // caller (there is no declarable-but-inert `false` to construct against); this guard
  // closes the same hole at RUNTIME for a non-TS caller, who could otherwise pass any
  // other value and construct a silently non-signing profile.
  const p = captureProfile();
  assertStructural({ ...p, signing: 'yes' as never }, /signing/i);
  assertStructural({ ...p, signing: false as never }, /signing/i);
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

test('GOVERNED: a profile declaring the one remaining governed feature still throws (guard sweep — LAST reshape, live-capture increment)', () => {
  // Was a TWO-governed-features sweep (captureMode:'live' AND a leg declaring
  // freshness) through the second step-7 increment, proving the sweep is total — the
  // first guard reached wins, never slips through. The live-capture increment lifts
  // `captureMode:'live'` (`validateLiveCapture` replaces the GOVERNED throw), so only
  // ONE field remains reachable here: the per-leg `freshness` — it stays GOVERNED
  // (consultation freshness gating, SPEC §11.1 and §14, not yet built). The governed
  // count moves 2 → 1 at the live-capture increment; this test narrows from two
  // declared governed features to one with it.
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  const oneGoverned: ConfirmProfile = {
    ...p,
    legs: [{ ...leg, freshness: { facts: 3600 } }],
  };
  assertGoverned(oneGoverned, 'freshness');
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

test("structural: reverify:true on a non-live (staged) profile is refused — reverify is live capture's own control", () => {
  // Rewritten at the live-capture increment: `reverify` is no longer refused because
  // live capture "is not implemented in this build" — it IS, as of this increment.
  // It is refused here because `reverify` is live mode's OWN control (SPEC §9.2);
  // declaring it on a staged profile is a misdeclaration, not an unimplemented-feature
  // gap.
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
