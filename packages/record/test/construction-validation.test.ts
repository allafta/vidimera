// @vidimera/record — construction-validation.test.ts (SPEC §9.1 "Construction is loud"):
// `create()` is fail-CLOSED at construction. Every profile-construction field this
// build once guarded with a GOVERNED throw (the guard-era head, reworded to the
// unknown-option-key head at the registry-hygiene increment, 2026-09-01)
// lifted feature-by-feature as build steps added enforcement, `freshness` (the AL2
// freshness increment) being the LAST: the governed count reached ZERO with that lift,
// so this file no longer has any live GOVERNED-throw pin of its own (the dead
// `assertGoverned`/`GOVERNED` helpers this file once carried are gone with it).
// `docs/process/implementation-status.md` carries the authoritative numbered
// self-authored-inversion sequence, which SPANS FILES — freshness's own pin below is
// its TENTH entry. EIGHT of the prior nine are argued in place in THIS file's own
// "is accepted at construction" tests; the sequence's SECOND entry — the replay-fold
// inversion (`replay()`'s `redemption-failed` throw becoming a fold) — is argued at
// `replay-verify.test.ts`'s own pin instead, not here.
// Structural rejections still throw a DIFFERENT error (never the unknown-option-key
// string): at least one leg is required, a stray redemption key placed outside a `redeem` block,
// `reverify` on a non-live profile, an unresolved `canonicalizerRef`, a duplicate
// profile id, and every settled-class field validator below. `open()`'s `supersedes`
// options key was the one GOVERNED guard living outside this file's construction-time
// scope (`kernel/open.ts`, reusing the same `governedUnavailable` helper); it lifted
// at the step-8 recovery increment — recovery.test.ts's own intake test pins the
// guard's absence (a well-formed `supersedes` refuses or succeeds on its merits)
// alongside the generic unknown-key throw (its GOVERNED head reworded at the
// registry-hygiene increment) that SURVIVES this file's own
// sweep (`kernel/finalize.ts`'s `finalizeOptionMessage` and `kernel/open.ts`'s own —
// neither is a per-field feature guard; both reject a caller-supplied key this build
// never documents at all).

import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Config, ConfirmProfile, LegSpec } from '../src/config.js';
import { create } from '../src/create.js';
import type { RefusalCode } from '../src/refusal-codes.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, Verifier } from '../src/signing/store.js';
import {
  captureProfile,
  DEFAULT_CANONICALIZER_REF,
  defaultCanonicalizer,
  effectSeamProfile,
  liveProfile,
  makeConfig,
  twoLegProfile,
} from './helpers/profiles.js';

/** A minimal signing config for construction-only tests (the AL2 freshness increment's
 * own need: `validateFreshness` requires `signing: true` on a declaring profile before
 * it will even look at the keys/values, and `create()` separately requires
 * `config.signing` present whenever a profile declares `signing: true`). `create()`
 * checks only PRESENCE at construction — it never invokes the hooks — so a stub
 * suffices here; the signing.test.ts Ed25519 pattern is for tests that actually
 * sign/verify, not this file's construction-only pins. */
function stubSigningConfig() {
  return {
    signer: (async () => ({ keyRef: 'key-1', signature: 'stub' })) as Signer,
    verifiers: {} as Record<string, Verifier>,
    signatures: new MemorySignatureStore(),
  };
}

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

/** Assert `create` throws a STRUCTURAL error (NOT the unknown-option-key string) matching `re`. */
function assertStructural(cfgProfile: ConfirmProfile, re: RegExp): void {
  assert.throws(
    () => create(makeConfig([cfgProfile])),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.doesNotMatch(
        err.message,
        /unknown option key/,
        'a structural error must NOT be the unknown-option-key string',
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

test('freshness is accepted at construction — the gate arm is built (the guard era ends)', () => {
  // INVERTED, at the AL2 freshness increment: the TENTH self-authored inversion in
  // `implementation-status.md`'s numbered sequence, which spans files — EIGHT of the
  // prior nine are argued in this file, above; the sequence's second entry (the
  // replay-fold inversion) is argued at `replay-verify.test.ts`'s own pin instead. The
  // kernel increment pinned a GOVERNED throw here while no gate consumed the
  // declaration and no clock could stamp an authority-supplied observation time. The
  // freshness arm lands at finalize's rung 5.5 in the same commit as this lift, so the
  // guard's stated trigger (an authority-timestamped build, SPEC §11.1/§14) has fired —
  // this is the LAST governed lift; the governed count moves 1 → 0.
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined)
    throw new Error(
      'construction-validation.test.ts: p.legs[0] missing — captureProfile() must have at least one leg',
    );
  assert.doesNotThrow(() =>
    create({
      ...makeConfig([
        {
          ...p,
          signing: true,
          legs: [
            { ...leg, requiredConsultations: ['risk-check'], freshness: { 'risk-check': 3600 } },
          ],
        },
      ]),
      signing: stubSigningConfig(),
    }),
  );
});

test("structural: freshness settled class — signing required, keys ⊆ the leg's required set, eligibility only where declared, positive integer seconds, non-empty record", () => {
  // The settled fail-closed class (the notActorOf/proposer/requiredConsultations
  // rulings): no declarable-but-inert configuration exists.
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  const withFreshness = (extra: Partial<LegSpec>): ConfirmProfile => ({
    ...p,
    signing: true,
    legs: [{ ...leg, requiredConsultations: ['risk-check'], ...extra }],
  });
  /** Like `assertStructural`, but attaches a signing config — every case here declares
   * `signing: true` (freshness needs it to get past its OWN signing check before the
   * rule under test even runs), so `create()`'s separate config.signing obligation must
   * be satisfied too, or every case would throw THAT error instead of the one tested. */
  function assertSignedStructural(profile: ConfirmProfile, re: RegExp): void {
    assert.throws(
      () => create({ ...makeConfig([profile]), signing: stubSigningConfig() }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.doesNotMatch(
          err.message,
          /unknown option key/,
          'a structural error must NOT be the unknown-option-key string',
        );
        assert.match(err.message, re);
        return true;
      },
    );
  }

  // Without profile signing: throws (the AL2 dependency made structural) — plain
  // assertStructural suffices here since profile.signing isn't true, so create()'s own
  // separate config.signing obligation never triggers.
  assertStructural(
    {
      ...p,
      legs: [{ ...leg, requiredConsultations: ['risk-check'], freshness: { 'risk-check': 3600 } }],
    },
    /signing/i,
  );
  // A key not in the leg's required set: throws.
  assertSignedStructural(
    withFreshness({ freshness: { 'other-check': 3600 } }),
    /not a.*required kind/i,
  );
  // 'eligibility' as a key: legal iff the leg declares eligibility.
  assert.doesNotThrow(() =>
    create({
      ...makeConfig([
        withFreshness({ eligibility: 'hr.approver-check', freshness: { eligibility: 3600 } }),
      ]),
      signing: stubSigningConfig(),
    }),
  );
  assertSignedStructural(
    withFreshness({ freshness: { eligibility: 3600 } }),
    /not a.*required kind/i,
  );
  // Zero/negative/fractional seconds: throw.
  assertSignedStructural(withFreshness({ freshness: { 'risk-check': 0 } }), /positive integer/i);
  assertSignedStructural(withFreshness({ freshness: { 'risk-check': -1 } }), /positive integer/i);
  assertSignedStructural(withFreshness({ freshness: { 'risk-check': 1.5 } }), /positive integer/i);
  // An empty freshness record: throws.
  assertSignedStructural(withFreshness({ freshness: {} }), /empty/i);
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
  // INVERTED, at the self-test-tier increment (the ELEVENTH self-authored inversion):
  // `validateFreshness` ended the no-numeric-rules symmetry this sentence leaned on, and
  // `validateBounds` (config.ts) now demands positive finite integer seconds for all
  // three bounds — register row 18's own trigger, taken deliberately.
  const declaring = {
    ...effectSeamProfile(),
    redeem: { confirmToRedeem: 1, redeemBound: 86400 },
  };
  assert.doesNotThrow(() => create(makeConfig([declaring])));
});

// === validateBounds: register row 18's numeric-bounds tightening (the self-test-tier
// increment, the ELEVENTH self-authored inversion) — the settled fail-closed class
// `validateFreshness` already uses (positive finite integer seconds), applied to
// expiry.ttl (when not 'none'), redeem.confirmToRedeem, and redeem.redeemBound ===

test('structural: expiry.ttl rejects NaN, Infinity, negative, zero, and fractional values', () => {
  const p = captureProfile();
  const withTtl = (ttl: number): ConfirmProfile => ({ ...p, expiry: { ttl } });
  assertStructural(withTtl(Number.NaN), /expiry\.ttl.*positive integer/i);
  assertStructural(withTtl(Number.POSITIVE_INFINITY), /expiry\.ttl.*positive integer/i);
  assertStructural(withTtl(-1), /expiry\.ttl.*positive integer/i);
  assertStructural(withTtl(0), /expiry\.ttl.*positive integer/i);
  assertStructural(withTtl(1.5), /expiry\.ttl.*positive integer/i);
});

test("structural: expiry:'none' is exempt from bounds validation — nothing to bound", () => {
  assert.doesNotThrow(() => create(makeConfig([{ ...captureProfile(), expiry: 'none' }])));
});

test('structural: redeem.confirmToRedeem rejects NaN, Infinity, negative, zero, and fractional values', () => {
  const p = effectSeamProfile();
  const withConfirmToRedeem = (confirmToRedeem: number): ConfirmProfile => ({
    ...p,
    redeem: { ...p.redeem, confirmToRedeem },
  });
  assertStructural(withConfirmToRedeem(Number.NaN), /confirmToRedeem.*positive integer/i);
  assertStructural(
    withConfirmToRedeem(Number.POSITIVE_INFINITY),
    /confirmToRedeem.*positive integer/i,
  );
  assertStructural(withConfirmToRedeem(-1), /confirmToRedeem.*positive integer/i);
  assertStructural(withConfirmToRedeem(0), /confirmToRedeem.*positive integer/i);
  assertStructural(withConfirmToRedeem(1.5), /confirmToRedeem.*positive integer/i);
});

test('structural: redeem.redeemBound rejects NaN, Infinity, negative, zero, and fractional values', () => {
  const p = effectSeamProfile();
  const withRedeemBound = (redeemBound: number): ConfirmProfile => ({
    ...p,
    redeem: { ...p.redeem, redeemBound },
  });
  assertStructural(withRedeemBound(Number.NaN), /redeemBound.*positive integer/i);
  assertStructural(withRedeemBound(Number.POSITIVE_INFINITY), /redeemBound.*positive integer/i);
  assertStructural(withRedeemBound(-1), /redeemBound.*positive integer/i);
  assertStructural(withRedeemBound(0), /redeemBound.*positive integer/i);
  assertStructural(withRedeemBound(1.5), /redeemBound.*positive integer/i);
});

// === the guard sweep is TOTAL — TERMINAL form (the AL2 freshness increment) ==========

test('a FULLY-LOADED two-leg profile declaring every once-governed field constructs cleanly (guard sweep — TERMINAL form, the AL2 freshness increment)', () => {
  // TERMINAL reshape. This test's history: it PROVED the sweep was total by showing a
  // profile declaring the still-governed feature(s) threw — captureMode:'live' AND
  // freshness together (through the second step-7 increment), then freshness alone
  // (the live-capture increment). The governed count is now ZERO (the AL2 freshness
  // increment's own last lift), so there is nothing left for that shape to prove — the
  // sweep's own pin inverts to the opposite claim: a profile loading EVERY field the
  // kernel increment ever gated constructs cleanly, in ONE profile, under a full
  // signing config. The guard era that increment opened has now fully closed — each
  // field lifted behind its own behavior, each in the same commit as that behavior.
  // NO per-field `unknownOptionKey` caller remains anywhere in this sweep: the
  // generic unknown-option-key throws that DO still call it — `kernel/finalize.ts`'s
  // `finalizeOptionMessage` and `kernel/open.ts`'s own — are not feature guards (they
  // reject a caller-supplied key this build never documents at all, not a declared
  // field this build merely hasn't wired up yet); `config.ts`'s own `validateProfile`
  // header names both survivors precisely.
  // EVERY once-governed field this file's own guard-lift sequence names is declared
  // somewhere below: `legs.length>1` (leg1+leg2), `sod.notActorOf`/`proposer` (leg2),
  // `requiredConsultations` (leg1, leg2), `eligibility` (leg2), `ackMode`/
  // `requiredAcks` (leg2), `freshness` (leg2), `captureMode:'live'`, `policySource`
  // (the EIGHTH self-authored inversion), and `redeemBound` (the third step-3
  // increment's own clock guard). Found at this same review: an earlier draft of this
  // fixture omitted `policySource` and `redeemBound`, so the title's "every" claim did
  // not yet hold — both are declared now. `signing: true` sits beside them but was
  // NEVER itself a governed field — it arrived WITH its own behavior in the mint
  // increment that declared it, no throwing stub ever standing in for it
  // (`docs/process/implementation-status.md`'s §14 row: "there was never a guard here
  // to begin with") — it is declared here only because `validateFreshness` makes it
  // freshness's OWN structural prerequisite (a declaring leg's profile must set
  // `signing: true`).
  const base = captureProfile();
  const leg1: LegSpec = {
    id: 'leg-1',
    allowedAuthorities: ['session:test-app'],
    requiredConsultations: ['leg1-check'], // live capture: every leg needs one
  };
  const leg2: LegSpec = {
    id: 'leg-2',
    allowedAuthorities: ['session:test-app'],
    requiredConsultations: ['leg2-check'],
    eligibility: 'hr.approver-check', // NOT double-declared in requiredConsultations
    sod: { notActorOf: ['leg-1'] }, // names a strictly-earlier leg
    proposer: 'proposer:1', // multi-leg-only, satisfied by leg-1's presence
    ackMode: 'any',
    requiredAcks: ['variance'],
    freshness: { eligibility: 3600 }, // keys ⊆ (requiredConsultations ∪ eligibility)
  };
  const fullyLoaded: ConfirmProfile = {
    id: 'test.fullyloaded.v1',
    subject: base.subject,
    legs: [leg1, leg2],
    captureMode: 'live',
    expiry: { ttl: 3600 },
    policySource: 'rules.v1', // the eighth self-authored inversion
    signing: true, // freshness's own structural prerequisite — never itself governed
    redeem: { reverify: true, redeemBound: 86400 }, // live capture's tail + the clock bound
  };
  assert.doesNotThrow(() => create({ ...makeConfig([fullyLoaded]), signing: stubSigningConfig() }));
});

// === structural rejections (a DIFFERENT error, not the unknown-option-key string) ======

test('structural: legs.length === 0 throws a structural "at least one leg" error (NOT the unknown-option-key string)', () => {
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

// === terminalRefusals: members must be registry codes ====================================
// The step-8 exit record flagged the footgun this pins shut: a `terminalRefusals` member
// that is not a real refusal code constructed silently and then never matched, so a leg
// the operator believed configured terminal was not. Ruled at the 2026-08-19 phase-1 API
// review (`docs/analysis/2026-08-19-phase-1-api-review.md`): throw at construction —
// SPEC §9.1's own sentence, "inert or contradictory feature combinations are construction
// errors". The two legal-but-INERT registry members SPEC §8 itself names (`leg-expired`,
// `availability`) stay constructible: their inertness is at-the-seam semantics
// (refusal-matrix.test.ts pins both), not a misspelled code.

test('structural: a terminalRefusals member that is not a registry refusal code throws at construction', () => {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  const typoed: ConfirmProfile = {
    ...p,
    // biome-ignore lint/suspicious/noExplicitAny: the runtime guard exists exactly for callers outside the type system
    legs: [{ ...leg, terminalRefusals: ['content-drfit' as any] }],
  };
  assertStructural(typoed, /terminalRefusals.*not a registry refusal code/i);
});

test('structural: the legal-but-inert registry members SPEC §8 names still construct', () => {
  const handles = create(cfgWithLeg({ terminalRefusals: ['leg-expired', 'availability'] }));
  assert.equal(typeof handles.operator.finalize, 'function');
});

test('structural: allowedAuthorities rejects empty, empty-string, and duplicate entries — the declarable-but-dead twin of the inert trap', () => {
  // The settled fail-closed class (the review's phase 6): an empty list constructed and then
  // refused every finalize and decline with identity-authority-refused — a leg no identity
  // could ever decide. Same three rules as requiredConsultations, minus the reserved-kind arm
  // (authorities are the host's own namespace).
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  const withAuthorities = (authorities: string[]) => ({
    ...p,
    legs: [{ ...leg, allowedAuthorities: authorities }],
  });
  assertStructural(withAuthorities([]), /empty array/i);
  assertStructural(withAuthorities(['']), /missing or empty authority/i);
  assertStructural(withAuthorities(['session:test-app', 'session:test-app']), /duplicate/i);
  assert.doesNotThrow(() =>
    create(makeConfig([withAuthorities(['session:test-app', 'mtls:review-surface'])])),
  );
});

test('structural: a MISSING or non-array allowedAuthorities names that shape — never the empty-array message', () => {
  // The review caught the non-array case folded into the empty-array branch: a JS caller who
  // omitted the field, or passed one string, was told they declared an empty array.
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  const withValue = (value: unknown) => ({
    ...p,
    legs: [{ ...leg, allowedAuthorities: value } as unknown as LegSpec],
  });
  for (const value of [undefined, 'session:test-app', 7]) {
    assert.throws(
      () => create(makeConfig([withValue(value)])),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /declares no allowedAuthorities list/);
        assert.doesNotMatch(err.message, /empty array/, `a ${typeof value} is not an empty array`);
        return true;
      },
    );
  }
});

// --- the review-hardening pass (2026-09-05): construction loudness finished for the shapes an
// external review found still lax, and `terminalRefusals` rejecting what can never take effect.
// SPEC §9.1: "inert or contradictory feature combinations are construction errors". Every pin
// below was observed RED against the tree before the validators landed. -----------------------

const NEVER_APPENDS_FOR_PIN: RefusalCode[] = [
  'record-exists',
  'unknown-profile',
  'unknown-leg',
  'record-not-open',
  'unredeemable-state',
  'unsealable-state',
  'effect-mismatch',
  'already-redeemed',
  'redemption-timeout',
  'prior-leg-unverified',
  'supersedes-unverified',
  'record-contended',
];

test('terminalRefusals: every never-appends code is a construction error — appendsOn consults the leg only after the fixed set has answered, so the listing could never take effect', () => {
  for (const code of NEVER_APPENDS_FOR_PIN) {
    assertStructural(captureProfile({ terminalRefusals: [code] }), /never appends/i);
  }
});

test('terminalRefusals: chain-compromise is a construction error — the compromise class appends regardless of any listing', () => {
  assertStructural(captureProfile({ terminalRefusals: ['chain-compromise'] }), /regardless/i);
});

test('terminalRefusals: a duplicate member is a construction error (the allowedAuthorities / requiredAcks rule)', () => {
  assertStructural(
    captureProfile({ terminalRefusals: ['content-drift', 'content-drift'] }),
    /twice/i,
  );
});

test("terminalRefusals: SPEC §8's two legal-but-inert members, leg-expired and availability, still construct — the boundary this pass does not cross", () => {
  assert.doesNotThrow(() =>
    create(makeConfig([captureProfile({ terminalRefusals: ['leg-expired', 'availability'] })])),
  );
});

test('structural: captureMode outside its two values is a construction error — a non-TS caller was silently treated as staged', () => {
  const p = { ...captureProfile(), captureMode: 'bogus' } as unknown as ConfirmProfile;
  assertStructural(p, /captureMode/);
});

test('structural: ackMode outside its three values is a construction error — ackCounts fell through to the permissive any branch, the fail-open direction', () => {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  const withMode = {
    ...p,
    legs: [{ ...leg, ackMode: 'bogus', requiredAcks: ['risk'] } as unknown as LegSpec],
  };
  assertStructural(withMode, /ackMode/);
});

test("structural: an expiry that is neither 'none' nor an object is a construction error, never a raw TypeError from destructuring", () => {
  for (const value of [undefined, null, 7, 'later']) {
    const p = { ...captureProfile(), expiry: value } as unknown as ConfirmProfile;
    assertStructural(p, /^invalid profile .*expiry/);
  }
});

test('structural: a sod without a notActorOf array is a construction error, never a raw TypeError', () => {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  for (const value of [{}, { notActorOf: 'leg-1' }, { notActorOf: null }]) {
    const withSod = { ...p, legs: [{ ...leg, sod: value } as unknown as LegSpec] };
    assertStructural(withSod, /^invalid profile .*notActorOf/);
  }
});

test('structural: an empty profile id is a construction error', () => {
  assertStructural(captureProfile({ id: '' }), /empty id|id is empty|non-empty id/i);
});

test('structural: an empty leg id is a construction error', () => {
  assertStructural(captureProfile({ legId: '' }), /leg id/i);
});

test('structural: a non-array legs is a construction error, never a raw TypeError', () => {
  for (const value of [undefined, {}, 'leg-1']) {
    const p = { ...captureProfile(), legs: value } as unknown as ConfirmProfile;
    assertStructural(p, /^invalid profile .*legs/);
  }
});

// === the construction rules on the snapshot (type, shape and bound rules; F084, F087) ===
// `create()` validates a frozen plain-data snapshot, so any primitive can reach any slot.
// Each rule below meets a named `invalid profile '<id>': …` message — never a raw
// TypeError, never silent acceptance.

const NAMED = (field: string) => new RegExp(`^invalid profile '[^']+': .*${field}`, 's');

/** Asserts `create` throws an `Error` (never a TypeError) whose message matches `re`. */
function assertNamed(profile: unknown, re: RegExp, config?: Partial<Config>): void {
  assert.throws(
    () =>
      create({
        ...makeConfig([captureProfile()]),
        ...config,
        profiles: [profile as ConfirmProfile],
      }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(!(err instanceof TypeError), `a raw TypeError escaped: ${err.message}`);
      assert.match(err.message, re);
      return true;
    },
  );
}

/** A two-leg profile whose SECOND leg carries `extra` (SoD and `proposer` need two legs). */
function twoLegWith(extra: Record<string, unknown>): ConfirmProfile {
  const p = twoLegProfile();
  const second = p.legs[1] as LegSpec;
  return { ...p, legs: [p.legs[0] as LegSpec, { ...second, ...extra }] };
}

/** A single-leg profile carrying `extra` on its leg and `top` on the profile. */
function oneLegWith(extra: Record<string, unknown>, top: Record<string, unknown> = {}) {
  const p = captureProfile();
  return { ...p, ...top, legs: [{ ...(p.legs[0] as LegSpec), ...extra }] } as ConfirmProfile;
}

/** The signing-bearing config a `signing: true` profile needs to get past `create()`'s own check. */
function signed(profile: ConfirmProfile): Config {
  return { ...makeConfig([profile]), signing: stubSigningConfig() };
}

/** A captureProfile with `top` merged on, loosely typed (the keys the types rule out). */
function withTop(top: Record<string, unknown>): ConfirmProfile {
  return { ...captureProfile(), ...top } as unknown as ConfirmProfile;
}

test('F021: a non-string proposer is a construction error; null says to omit the field', () => {
  for (const value of [7, true, {}, ['a']]) {
    assertNamed(twoLegWith({ proposer: value }), NAMED('proposer'));
  }
  assertNamed(twoLegWith({ proposer: null }), /omit the field/);
  assertNamed(twoLegWith({ proposer: null }), NAMED('proposer'));
});

test('F021: a non-string eligibility is a construction error; null says to omit the field', () => {
  for (const value of [7, true, {}]) {
    assertNamed(oneLegWith({ eligibility: value }), NAMED('eligibility'));
  }
  assertNamed(oneLegWith({ eligibility: null }), /omit the field/);
  assertNamed(oneLegWith({ eligibility: null }), NAMED('eligibility'));
});

test('F021: a non-string policySource is a construction error; null says to omit the field', () => {
  for (const value of [7, false, {}]) {
    assertNamed(withTop({ policySource: value }), NAMED('policySource'));
  }
  assertNamed(withTop({ policySource: null }), /omit the field/);
  assertNamed(withTop({ policySource: null }), NAMED('policySource'));
});

test('F021: a non-boolean redeem.reverify is a construction error; null says to omit the field', () => {
  for (const value of ['yes', 1, 0, {}]) {
    assertNamed(withTop({ redeem: { confirmToRedeem: 3600, reverify: value } }), NAMED('reverify'));
  }
  assertNamed(withTop({ redeem: { confirmToRedeem: 3600, reverify: null } }), /omit the field/);
});

test('F021: a non-string terminalRefusals member is refused before the registry lookup', () => {
  for (const member of [7, null, true, ['sod-violation'], { code: 'sod-violation' }]) {
    assertNamed(oneLegWith({ terminalRefusals: [member] }), NAMED('terminalRefusals'));
  }
  // The coercion this closes: `Object.hasOwn(REGISTRY, ['content-drift'])` coerces to a key.
  assertNamed(oneLegWith({ terminalRefusals: [['content-drift']] }), NAMED('terminalRefusals'));
});

test('F022: a non-object redeem is a construction error — null, false, 0, none and []', () => {
  for (const value of [null, false, 0, 'none', []]) {
    assertNamed(withTop({ redeem: value }), NAMED('redeem'));
  }
  // `null` is a declared non-object, not an absent field (and the message names which).
  assertNamed(withTop({ redeem: null }), /found null/);
  assertNamed(withTop({ redeem: 'none' }), /found string/);
});

test('F023: every list field must be an array — a string, number or null meets a named message', () => {
  const lists: Array<[string, (value: unknown) => ConfirmProfile]> = [
    ['allowedAuthorities', (v) => oneLegWith({ allowedAuthorities: v })],
    ['requiredConsultations', (v) => oneLegWith({ requiredConsultations: v })],
    ['requiredAcks', (v) => oneLegWith({ ackMode: 'any', requiredAcks: v })],
    ['terminalRefusals', (v) => oneLegWith({ terminalRefusals: v })],
    ['notActorOf', (v) => twoLegWith({ sod: { notActorOf: v } })],
  ];
  for (const [field, build] of lists) {
    for (const value of ['kyc', 7, null, true]) {
      assertNamed(build(value), NAMED(field));
    }
  }
});

test('F088: subject must be an object with a canonicalizerRef string', () => {
  for (const subject of [null, 'x', 7, {}, { canonicalizerRef: null }, { canonicalizerRef: 7 }]) {
    assertNamed(withTop({ subject }), NAMED('subject'));
  }
  const missing = { ...captureProfile() } as { subject?: unknown };
  delete missing.subject;
  assertNamed(missing, NAMED('subject'));
});

test('F088: every legs element must be an object', () => {
  const first = captureProfile().legs[0] as LegSpec;
  for (const element of [null, 'x', 7, true]) {
    assertNamed(withTop({ legs: [element] }), NAMED('legs'));
    assertNamed(withTop({ legs: [first, element] }), NAMED('legs'));
  }
});

test('F088: null in any optional field meets a named message, never a raw TypeError', () => {
  const signing = { signing: stubSigningConfig() };
  const cases: Array<[ConfirmProfile, RegExp, Partial<Config>?]> = [
    [twoLegWith({ sod: null }), NAMED('sod')],
    [twoLegWith({ sod: { notActorOf: null } }), NAMED('notActorOf')],
    [twoLegWith({ proposer: null }), NAMED('proposer')],
    [oneLegWith({ ackMode: null, requiredAcks: ['k'] }), NAMED('ackMode')],
    [oneLegWith({ ackMode: null }), NAMED('ackMode')],
    [oneLegWith({ ackMode: 'any', requiredAcks: null }), NAMED('requiredAcks')],
    [oneLegWith({ requiredConsultations: null }), NAMED('requiredConsultations')],
    [
      oneLegWith({ requiredConsultations: ['k'], freshness: null }, { signing: true }),
      NAMED('freshness'),
      signing,
    ],
    [oneLegWith({ eligibility: null }), NAMED('eligibility')],
    [oneLegWith({ decline: null }), NAMED('decline')],
    [oneLegWith({ terminalRefusals: null }), NAMED('terminalRefusals')],
    [withTop({ policySource: null }), NAMED('policySource')],
    [withTop({ redeem: null }), NAMED('redeem')],
    [withTop({ redeem: { confirmToRedeem: null } }), NAMED('confirmToRedeem')],
    [withTop({ redeem: { redeemBound: null } }), NAMED('redeemBound')],
    [withTop({ redeem: { reverify: null } }), NAMED('reverify')],
    [withTop({ redeem: { result: null } }), NAMED('result')],
    [withTop({ signing: null }), NAMED('signing')],
    [withTop({ expiry: null }), NAMED('expiry')],
    [withTop({ expiry: { ttl: null } }), NAMED('ttl')],
  ];
  for (const [profile, re, config] of cases) assertNamed(profile, re, config);
});

test('F088: a non-object freshness is a construction error, never a character-wise record', () => {
  for (const value of ['risk-check', 7, true]) {
    assertNamed(
      oneLegWith({ requiredConsultations: ['risk-check'], freshness: value }, { signing: true }),
      NAMED('freshness'),
      { signing: stubSigningConfig() },
    );
  }
});

// --- F020: the upper bound on every seconds-valued bound -------------------------------

const CAP = 3_155_760_000; // 100 Julian years

test('F020: expiry.ttl at the cap constructs, one past it throws and states the cap', () => {
  assert.doesNotThrow(() => create(makeConfig([captureProfile({ ttl: CAP })])));
  assertNamed(
    captureProfile({ ttl: CAP + 1 }),
    /expiry\.ttl is 3155760001.*positive integer.*3155760000/s,
  );
});

test('F020: redeem.confirmToRedeem at the cap constructs, one past it throws and states the cap', () => {
  assert.doesNotThrow(() => create(makeConfig([withTop({ redeem: { confirmToRedeem: CAP } })])));
  assertNamed(
    withTop({ redeem: { confirmToRedeem: CAP + 1 } }),
    /redeem\.confirmToRedeem is 3155760001.*positive integer.*3155760000/s,
  );
});

test('F020: redeem.redeemBound at the cap constructs, one past it throws and states the cap', () => {
  assert.doesNotThrow(() => create(makeConfig([withTop({ redeem: { redeemBound: CAP } })])));
  assertNamed(
    withTop({ redeem: { redeemBound: CAP + 1 } }),
    /redeem\.redeemBound is 3155760001.*positive integer.*3155760000/s,
  );
});

test('F020: a freshness value at the cap constructs, one past it throws and states the cap', () => {
  const build = (seconds: number) =>
    oneLegWith(
      { requiredConsultations: ['risk-check'], freshness: { 'risk-check': seconds } },
      { signing: true },
    );
  assert.doesNotThrow(() => create(signed(build(CAP))));
  assertNamed(build(CAP + 1), /bounds 'risk-check' at 3155760001.*positive integer.*3155760000/s, {
    signing: stubSigningConfig(),
  });
});

// --- F087: a terminalRefusals member whose producer the leg or profile does not declare --

test('F087: sod-violation needs the leg to declare sod or proposer', () => {
  assertNamed(
    twoLegWith({ terminalRefusals: ['sod-violation'] }),
    /sod-violation.*terminalRefusals/s,
  );
  const bySod = twoLegWith({
    sod: { notActorOf: ['maker-decide'] },
    terminalRefusals: ['sod-violation'],
  });
  assert.doesNotThrow(() => create(makeConfig([bySod])));
  const byProposer = twoLegWith({ proposer: 'maker:1', terminalRefusals: ['sod-violation'] });
  assert.doesNotThrow(() => create(makeConfig([byProposer])));
});

test('F087: policy-drift needs the profile to declare policySource', () => {
  assertNamed(
    oneLegWith({ terminalRefusals: ['policy-drift'] }),
    /policy-drift.*terminalRefusals/s,
  );
  const declared = oneLegWith(
    { terminalRefusals: ['policy-drift'] },
    { policySource: 'ops.policy' },
  );
  assert.doesNotThrow(() => create(makeConfig([declared])));
});

test('F087: ineligible needs the leg to declare eligibility', () => {
  assertNamed(oneLegWith({ terminalRefusals: ['ineligible'] }), /ineligible.*terminalRefusals/s);
  const declared = oneLegWith({ eligibility: 'hr.check', terminalRefusals: ['ineligible'] });
  assert.doesNotThrow(() => create(makeConfig([declared])));
});

test('F087: consultation-failed needs the leg to declare requiredConsultations', () => {
  assertNamed(
    oneLegWith({ terminalRefusals: ['consultation-failed'] }),
    /consultation-failed.*terminalRefusals/s,
  );
  const declared = oneLegWith({
    requiredConsultations: ['risk-check'],
    terminalRefusals: ['consultation-failed'],
  });
  assert.doesNotThrow(() => create(makeConfig([declared])));
});

test('F087: consultation-stale needs the leg to declare freshness', () => {
  assertNamed(
    oneLegWith({ requiredConsultations: ['risk-check'], terminalRefusals: ['consultation-stale'] }),
    /consultation-stale.*terminalRefusals/s,
  );
  const declared = oneLegWith(
    {
      requiredConsultations: ['risk-check'],
      freshness: { 'risk-check': 3600 },
      terminalRefusals: ['consultation-stale'],
    },
    { signing: true },
  );
  assert.doesNotThrow(() => create(signed(declared)));
});

test('F087: ack-missing and ack-stale need the leg to declare the findings flow', () => {
  for (const code of ['ack-missing', 'ack-stale'] as const) {
    assertNamed(
      oneLegWith({ terminalRefusals: [code] }),
      new RegExp(`${code}.*terminalRefusals`, 's'),
    );
    const declared = oneLegWith({ ackMode: 'any', requiredAcks: ['k'], terminalRefusals: [code] });
    assert.doesNotThrow(() => create(makeConfig([declared])));
  }
});

test('F087: leg-expired and availability stay legal and inert without any feature', () => {
  const profile = oneLegWith({ terminalRefusals: ['leg-expired', 'availability'] });
  assert.doesNotThrow(() => create(makeConfig([profile])));
});

// --- F084: a registry entry must be a function ------------------------------------------

test('F084: a canonicalizer registry entry that is not a function is refused at construction', () => {
  for (const entry of [null, 'canon', 7, {}, [], true]) {
    assert.throws(
      () =>
        create({
          ...makeConfig([captureProfile()]),
          canonicalizers: { [DEFAULT_CANONICALIZER_REF]: entry as never },
        }),
      /^Error: resolveCanonicalizer: unresolved canonicalizerRef 'test\.canonical\.v1'.*not a function/s,
    );
  }
});

test('F088: a BigInt or Symbol in a primitive slot is described without throwing a TypeError', () => {
  for (const value of [10n, Symbol('s')]) {
    assertNamed(withTop({ captureMode: value }), NAMED('captureMode'));
    assertNamed(withTop({ expiry: value }), NAMED('expiry'));
    assertNamed(oneLegWith({ ackMode: value, requiredAcks: ['k'] }), NAMED('ackMode'));
    assertNamed(twoLegWith({ sod: { notActorOf: [value] } }), NAMED('notActorOf'));
  }
  assertNamed(twoLegWith({ sod: { notActorOf: [7] } }), NAMED('notActorOf'));
});
