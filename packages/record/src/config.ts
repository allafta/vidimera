// @vidimera/record — config.ts (design §2 "config.ts" / §3 Config/ConfirmProfile/LegSpec
// / §5 "Construction guards (fail-closed)" / §9 "Fail-closed construction guards"): the
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

// --- types (design §3, verbatim) -----------------------------------------------------

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
  legs: LegSpec[]; // ordered; >1 switches SoD on (slice 5)
  captureMode: 'staged' | 'live';
  expiry: { ttl: number } | 'none';
  policySource?: string; // slice 5
  redeem?: { confirmToRedeem?: number; redeemBound?: number; reverify?: boolean }; // presence ⇒ effect seam
}

export interface Config {
  profiles: ConfirmProfile[];
  store: Store;
  canonicalizers: Record<string, Canonicalizer>; // keyed by canonicalizerRef
  // signer?: Signer — joins at slice 6 (AL2)
}

// --- the effect-seam predicate (design §3 line / §5 "Profile-derived terminality") ----

/**
 * `profile-declares-effect-seam := (profile.redeem present) OR (profile.captureMode ===
 * 'live')` (design §3). Written completely even though at slice 3 a `captureMode:'live'`
 * profile is GOVERNED-throw-rejected at construction, so the only reachable effect-seam
 * trigger post-validation is a `redeem` block — the disjunct is kept whole (matching
 * `nonterminal.ts`'s "full formula, not the narrowed reachable subset" posture) so the
 * predicate does not need a signature change when the `captureMode:'live'` guard lifts.
 */
export function profileDeclaresEffectSeam(profile: ConfirmProfile): boolean {
  return profile.redeem !== undefined || profile.captureMode === 'live';
}

// --- construction guards (fail-CLOSED) -----------------------------------------------

/** The exact GOVERNED throw message (design §5): guards lift feature-by-feature. */
export function governedUnavailable(field: string): string {
  return `GOVERNED feature not available in this build (${field})`;
}

/**
 * The three redemption FIELDS (design §3 `redeem`): they are only ever valid INSIDE a
 * `redeem` block. Appearing as a direct own-key on the profile or a leg is a
 * misplacement — refused structurally (design §9 O3 rework: the former redeem-field guard
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

/** Per-leg GOVERNED guards (design §5): every not-yet-enforceable leg control throws. */
function validateLeg(profileId: string, leg: LegSpec): void {
  // proposer gets its OWN throw (design §9 S-1): it is a per-leg SoD control that a
  // single-leg profile would otherwise slip past the `legs.length>1` multi-leg guard.
  if (leg.sod !== undefined) throw new Error(governedUnavailable('sod'));
  if (leg.proposer !== undefined) throw new Error(governedUnavailable('proposer'));
  if (leg.ackMode !== undefined) throw new Error(governedUnavailable('ackMode'));
  if (leg.requiredAcks !== undefined) throw new Error(governedUnavailable('requiredAcks'));
  if (leg.requiredConsultations !== undefined)
    throw new Error(governedUnavailable('requiredConsultations'));
  if (leg.freshness !== undefined) throw new Error(governedUnavailable('freshness'));
  if (leg.eligibility !== undefined) throw new Error(governedUnavailable('eligibility'));
  assertNoStrayRedemptionKeys(profileId, 'leg', leg);
}

/**
 * Fail-CLOSED structural validation of a single profile (design §5/§9). Order:
 *  1. structural: exactly one leg (O2 — internal legId derivation must be well-defined);
 *  2. GOVERNED `legs.length>1` (multi-leg SoD, slice 5);
 *  3. GOVERNED `captureMode:'live'` (live capture, slice 5) — checked BEFORE the reverify
 *     guard so a live profile throws GOVERNED(captureMode), never the reverify refusal;
 *  4. GOVERNED `policySource` (policy drift, slice 5);
 *  5. per-leg GOVERNED guards + stray-redemption-key check;
 *  6. structural: stray redemption key on the profile itself (O3);
 *  7. structural: `reverify` on a non-live profile (deferred; no live profiles at slice 3).
 * The sweep is TOTAL: a profile declaring any governed feature throws — the first one
 * reached wins, but none slips through. Canonicalizer resolution + duplicate-id detection
 * are `create.ts`'s (they need the registry / the whole profile list).
 */
export function validateProfile(profile: ConfirmProfile): void {
  if (profile.legs.length === 0) {
    throw new Error(`invalid profile '${profile.id}': exactly one leg is required (found 0)`);
  }
  if (profile.legs.length > 1) {
    throw new Error(governedUnavailable('legs'));
  }
  if (profile.captureMode === 'live') {
    throw new Error(governedUnavailable('captureMode'));
  }
  if (profile.policySource !== undefined) {
    throw new Error(governedUnavailable('policySource'));
  }
  for (const leg of profile.legs) {
    validateLeg(profile.id, leg);
  }
  assertNoStrayRedemptionKeys(profile.id, 'top-level profile', profile);
  // `reverify` on a non-live profile is refused (deferred; no live profiles at slice 3).
  // Reaching here, `captureMode` is already narrowed to 'staged' (the 'live' guard above
  // threw GOVERNED), so any `reverify:true` present is BY DEFINITION on a non-live profile.
  if (profile.redeem?.reverify === true) {
    throw new Error(
      `invalid profile '${profile.id}': 'reverify' is not available on a non-live profile (deferred; no live profiles at slice 3)`,
    );
  }
}
