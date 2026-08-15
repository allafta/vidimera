// @vidimera/record — config.ts: the
// profile/config TYPES, the fail-CLOSED structural profile validation, and the
// `profile-declares-effect-seam` predicate.
//
// Canonicalizer-registry resolution itself lives at the one site that holds the registry
// (`create.ts`, via canonical.ts's fail-closed `resolveCanonicalizer`) — this module
// owns the profile-SHAPE guards; `create.ts` composes them with resolution + duplicate-id
// detection. The `Canonicalizer` type is owned by canonical.ts and re-exported here so a
// Config type consumer has one import site.

import type { Canonicalizer } from './canonical.js';
import type { RefusalCode } from './refusal-codes.js';
import type { Store } from './store/store.js';

export type { Canonicalizer };

// --- types (SPEC §9.1's ConfirmProfile field table) ------------------------------------

export interface LegSpec {
  id: string;
  allowedAuthorities: string[];
  sod?: { notActorOf: string[] };
  proposer?: string;
  ackMode?: 'self' | 'counterparty' | 'any';
  requiredAcks?: string[];
  requiredConsultations?: string[];
  freshness?: Record<string, number>;
  eligibility?: string;
  terminalRefusals?: RefusalCode[];
}

export interface ConfirmProfile {
  id: string; // RECOMMENDED "<domain>.<subject>.v<n>"
  subject: { canonicalizerRef: string };
  legs: LegSpec[]; // ordered; >1 switches on separation of duties (SPEC §10.1)
  captureMode: 'staged' | 'live';
  expiry: { ttl: number } | 'none';
  policySource?: string; // SPEC §10.3
  redeem?: { confirmToRedeem?: number; redeemBound?: number; reverify?: boolean }; // presence ⇒ effect seam
}

export interface Config {
  profiles: ConfirmProfile[];
  store: Store;
  canonicalizers: Record<string, Canonicalizer>; // keyed by canonicalizerRef
  // signer?: Signer — not built in this build; the AL2 signing upgrade (SPEC §14)
}

// --- the effect-seam predicate (SPEC §9.1 "The effect-seam predicate") ----------------

/**
 * `profile-declares-effect-seam := (profile.redeem present) OR (profile.captureMode ===
 * 'live')` (SPEC §9.1). Written completely even though in this build a `captureMode:'live'`
 * profile is GOVERNED-throw-rejected at construction, so the only reachable effect-seam
 * trigger post-validation is a `redeem` block — the disjunct is kept whole (matching
 * `nonterminal.ts`'s "full formula, not the narrowed reachable subset" posture) so the
 * predicate does not need a signature change when the `captureMode:'live'` guard lifts.
 */
export function profileDeclaresEffectSeam(profile: ConfirmProfile): boolean {
  return profile.redeem !== undefined || profile.captureMode === 'live';
}

// --- construction guards (fail-CLOSED) -----------------------------------------------

/**
 * The exact GOVERNED throw message (§9.1: "a feature field for an unimplemented capability
 * fails fast with an explicit 'feature not available in this build' error rather than
 * silently degrading"). Guards lift feature-by-feature as build steps add enforcement. The
 * head through the closing parenthesis — `GOVERNED feature not available in this build
 * (<field>)` — is byte-preserved (pinned by construction-validation.test.ts); the
 * caller-supplied `contract` is the appended tail: what is unavailable, and the SPEC
 * section(s) that lift it. Arity-2 because it serves two consumers: the per-field
 * construction guards below and `kernel/open.ts`'s `supersedes` options guard.
 */
export function governedUnavailable(field: string, contract: string): string {
  return `GOVERNED feature not available in this build (${field}) — ${contract}`;
}

/**
 * The three redemption FIELDS: `confirmToRedeem` and `redeemBound` — SPEC §9.1's `redeem`
 * block, which names exactly those two — plus `reverify`, introduced only by SPEC §9.2's
 * live mode (§9.1 never names it; nesting it in the same `redeem` block is this build's
 * structuring). They are only ever valid INSIDE a
 * `redeem` block. Appearing as a direct own-key on the profile or a leg is a
 * misplacement — refused structurally (the former redeem-field guard
 * was logically vacuous, so it is replaced by this real "stray key outside redeem" check).
 */
const REDEMPTION_KEYS = ['confirmToRedeem', 'redeemBound', 'reverify'] as const;

function assertNoStrayRedemptionKeys(profileId: string, where: string, obj: object): void {
  for (const key of REDEMPTION_KEYS) {
    if (Object.hasOwn(obj, key)) {
      throw new Error(
        `invalid profile '${profileId}': redemption key '${key}' must live inside a 'redeem' block, not as a ${where} key`,
      );
    }
  }
}

/** Per-leg GOVERNED guards: every not-yet-enforceable leg control throws. */
function validateLeg(profileId: string, leg: LegSpec): void {
  // proposer gets its OWN throw: it is a per-leg SoD control that a
  // single-leg profile would otherwise slip past the `legs.length>1` multi-leg guard.
  if (leg.sod !== undefined)
    throw new Error(
      governedUnavailable(
        'sod',
        'per-leg separation-of-duties (`notActorOf`) is not enforced in this build. Contract: §10.1.',
      ),
    );
  if (leg.proposer !== undefined)
    throw new Error(
      governedUnavailable(
        'proposer',
        'the per-leg proposer / separation-of-duties pin is not enforced in this build. Contract: §10.1.',
      ),
    );
  if (leg.ackMode !== undefined)
    throw new Error(
      governedUnavailable(
        'ackMode',
        'the findings-flow acknowledgment mode is not implemented in this build. Contract: §10.2.',
      ),
    );
  if (leg.requiredAcks !== undefined)
    throw new Error(
      governedUnavailable(
        'requiredAcks',
        'required-acknowledgment gating on findings is not implemented in this build. Contract: §10.2.',
      ),
    );
  if (leg.requiredConsultations !== undefined)
    throw new Error(
      governedUnavailable(
        'requiredConsultations',
        'required-consultation gating is not implemented in this build. Contract: §11.1.',
      ),
    );
  if (leg.freshness !== undefined)
    throw new Error(
      governedUnavailable(
        'freshness',
        'consultation freshness gating cannot be enforced in this build — the library stamps ' +
          '`at` itself, so an authority-timestamped build is what actually lifts it. Contract: §11.1 and §14.',
      ),
    );
  if (leg.eligibility !== undefined)
    throw new Error(
      governedUnavailable(
        'eligibility',
        'eligibility gating is not enforced in this build. Contract: §10.4.',
      ),
    );
  assertNoStrayRedemptionKeys(profileId, 'leg', leg);
}

/**
 * Fail-CLOSED structural validation of a single profile. Order:
 *  1. structural: exactly one leg (internal legId derivation must be well-defined);
 *  2. GOVERNED `legs.length>1` (multi-leg SoD, SPEC §10.1);
 *  3. GOVERNED `captureMode:'live'` (live capture, SPEC §9.2) — checked BEFORE the reverify
 *     guard so a live profile throws GOVERNED(captureMode), never the reverify refusal;
 *  4. GOVERNED `policySource` (policy drift, SPEC §10.3);
 *  5. per-leg GOVERNED guards + stray-redemption-key check;
 *  6. structural: stray redemption key on the profile itself;
 *  7. structural: `reverify` on a non-live profile — not built in this build (SPEC §9.2's
 *     live mode).
 * `redeemBound` (redeeming-window bound, SPEC §4 & §11.2) is accepted-at-construction as of
 * the third step-3 increment — the clock module builds the bound whole (payload, dueAt,
 * resolution), so there is no longer a GOVERNED guard on it here.
 * The sweep is TOTAL: a profile declaring any governed feature throws — the first one
 * reached wins, but none slips through. Canonicalizer resolution + duplicate-id detection
 * are `create.ts`'s (they need the registry / the whole profile list).
 */
export function validateProfile(profile: ConfirmProfile): void {
  if (profile.legs.length === 0) {
    throw new Error(`invalid profile '${profile.id}': exactly one leg is required (found 0)`);
  }
  if (profile.legs.length > 1) {
    throw new Error(
      governedUnavailable(
        'legs',
        'multi-leg maker-checker sequencing is not enforced in this build; only single-leg profiles are supported. Contract: §10.1.',
      ),
    );
  }
  if (profile.captureMode === 'live') {
    throw new Error(
      governedUnavailable(
        'captureMode',
        'live capture is not implemented in this build; only staged capture is supported. Contract: §9.2.',
      ),
    );
  }
  if (profile.policySource !== undefined) {
    throw new Error(
      governedUnavailable(
        'policySource',
        'policy-drift notarization is not implemented in this build. Contract: §10.3.',
      ),
    );
  }
  for (const leg of profile.legs) {
    validateLeg(profile.id, leg);
  }
  assertNoStrayRedemptionKeys(profile.id, 'top-level profile', profile);
  // `reverify` on a non-live profile is refused — not built in this build (SPEC §9.2's
  // live mode). Reaching here, `captureMode` is already narrowed to 'staged' (the 'live'
  // guard above threw GOVERNED), so any `reverify:true` present is BY DEFINITION on a
  // non-live profile.
  if (profile.redeem?.reverify === true) {
    throw new Error(
      `invalid profile '${profile.id}': 'reverify' is not available on a non-live profile ` +
        '(live capture is not implemented in this build — SPEC §9.2)',
    );
  }
}

// --- open() options bag (§9 `open(stagedRef, { priorRecordRefs?, policyDigest?,
// supersedes? })`) — NOT construction, but the same GOVERNED shape ------------------

/**
 * `open()`'s options bag. NONE of the three SPEC-documented keys are implemented at this
 * build step: `priorRecordRefs` lifts with multi-leg separation of duties (§10.1) and
 * `policyDigest` with policy-drift notarization (§10.3) — both already unreachable in
 * practice, because the profile-level switches that would make either meaningful
 * (`legs.length>1` / `policySource`) throw GOVERNED above, so no profile that could
 * legitimately need them can even be constructed. `supersedes` (recovery of a terminal
 * predecessor, §2) is the ONE draft-ahead field with NO profile-level switch, so nothing
 * stops a caller from passing it for any profile at all.
 *
 * Declared empty (`Record<string, never>`) so a typed caller sees the absence directly.
 * That alone is not a guard for a plain JavaScript caller, who can pass any key regardless
 * of what the type says and get it silently dropped — believing they got a recovery link
 * (or a leg-sequencing / policy binding) they never actually received. `kernel/open.ts`
 * sweeps every own key on the object it actually receives, at runtime, and throws.
 */
export type OpenOptions = Record<string, never>;
