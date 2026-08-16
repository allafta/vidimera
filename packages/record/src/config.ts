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
import type { Digest, IdentityAssertion } from './types.js';

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

/** SPEC §11.1: the library-emitted consultation kinds — reserved on BOTH sides of the
 * seam: a supplied input naming one throws at finalize's intake ("would forge a library
 * control"), and a profile declaring one in `requiredConsultations` is a construction
 * error ("declaring a reserved kind in `requiredConsultations` is likewise a
 * profile-construction error"). */
export const RESERVED_CONSULTATION_KINDS: ReadonlySet<string> = new Set(['facts', 'chain-verify']);

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
  if (leg.freshness !== undefined)
    throw new Error(
      governedUnavailable(
        'freshness',
        'consultation freshness gating cannot be enforced in this build — the library stamps ' +
          '`at` itself, so an authority-timestamped build is what actually lifts it. Contract: §11.1 and §14.',
      ),
    );
  assertNoStrayRedemptionKeys(profileId, 'leg', leg);
}

/**
 * Structural `eligibility` validation (SPEC §10.4; first step-6 increment). Fail-closed
 * by the same settled class as `validateSodShape`/`validateRequiredConsultations`: no
 * declarable-but-inert configuration exists —
 *  - a present-but-empty label is the malformed-reference rule, NOT the inertness trap:
 *    unlike `proposer: ''`, the gate keys on the DECLARATION'S PRESENCE and never
 *    compares the label itself, so an empty label is an opaque reference that names
 *    nothing rather than a value that could merely never match;
 *  - declaring `eligibility` AND ALSO listing `'eligibility'` in the same leg's
 *    `requiredConsultations` is SPEC §10.4's own construction error — "declare it once".
 */
function validateEligibility(profile: ConfirmProfile, leg: LegSpec): void {
  if (leg.eligibility === undefined) return;
  if (leg.eligibility.length === 0) {
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' declares an empty eligibility label — ` +
        'an opaque reference that references nothing is malformed config (the label names ' +
        'the host authority-to-decide check; the gate keys on the declaration, SPEC §10.4)',
    );
  }
  if (leg.requiredConsultations?.includes('eligibility')) {
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' declares eligibility AND lists ` +
        `'eligibility' in requiredConsultations — SPEC §10.4: declare it once`,
    );
  }
}

/**
 * Structural SoD shape validation (SPEC §10.1; second step-4 increment, with a fourth
 * rule added at that increment's final review). Fail-closed by ruling: no
 * declarable-but-inert configuration exists —
 *  - `sod.notActorOf` must be non-empty, pairwise distinct, and each entry must name a
 *    STRICTLY-EARLIER leg of this profile (an empty array, a later leg, the leg's own
 *    id, or an unknown id could never match the record's recorded references at the
 *    gate and would be silently inert — the fail-open trap). Consequence: a first leg
 *    cannot declare `sod`.
 *  - `proposer` requires a multi-leg profile: SPEC §10.1 opens "Applies when the
 *    profile declares more than one leg." and the applicability sentence scopes the
 *    whole feature — the conservative reading, loosenable later without a break.
 *  - `proposer` must be non-empty: an empty string constructs fine but can never fire at
 *    the gate — finalize's rung 3 `isValidIdentity` requires a non-empty `principal`, so
 *    `leg.proposer === identity.principal` is unsatisfiable for `''` — the same
 *    declarable-but-inert trap the other two rules above guard against. Found at the
 *    final review of the second step-4 increment, after the gate itself had already
 *    landed; added here rather than left as a residual gap.
 */
function validateSodShape(profile: ConfirmProfile, index: number, leg: LegSpec): void {
  if (leg.sod !== undefined) {
    const entries = leg.sod.notActorOf;
    if (entries.length === 0) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' declares sod.notActorOf as an empty array — ` +
          'the control must name at least one leg (non-empty by the fail-closed ruling)',
      );
    }
    const seen = new Set<string>();
    for (const entry of entries) {
      if (seen.has(entry)) {
        throw new Error(
          `invalid profile '${profile.id}': leg '${leg.id}' names '${entry}' twice in sod.notActorOf — ` +
            'entries must be pairwise distinct (duplicate)',
        );
      }
      seen.add(entry);
      const earlierIndex = profile.legs.slice(0, index).findIndex((l) => l.id === entry);
      if (earlierIndex === -1) {
        throw new Error(
          `invalid profile '${profile.id}': leg '${leg.id}' names '${entry}' in sod.notActorOf, ` +
            'which is not a strictly-earlier leg of this profile — only prior legs have recorded ' +
            'evidence for the gate to key (SPEC §10.1)',
        );
      }
    }
  }
  if (leg.proposer !== undefined && leg.proposer.length === 0) {
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' declares proposer as an empty string — ` +
        'an empty proposer could never match any finalizing principal (finalize requires a ' +
        'non-empty identity.principal) — declarable-but-inert, fail-closed by ruling',
    );
  }
  if (leg.proposer !== undefined && profile.legs.length === 1) {
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' declares proposer on a single-leg profile — ` +
        'SPEC §10.1 applies when the profile declares more than one leg',
    );
  }
}

/** Structural requiredConsultations validation (SPEC §11.1; second step-5 increment).
 * The settled fail-closed class: no declarable-but-inert configuration exists — the
 * list is non-empty, pairwise distinct, every kind a non-empty string, and never a
 * reserved library-emitted kind. */
function validateRequiredConsultations(profile: ConfirmProfile, leg: LegSpec): void {
  if (leg.requiredConsultations === undefined) return;
  const kinds = leg.requiredConsultations;
  if (kinds.length === 0) {
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' declares requiredConsultations as an empty array — ` +
        'the control must require at least one kind (non-empty by the fail-closed ruling)',
    );
  }
  const seen = new Set<string>();
  for (const kind of kinds) {
    if (typeof kind !== 'string' || kind.length === 0) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' declares a missing or empty consultation kind in requiredConsultations`,
      );
    }
    if (RESERVED_CONSULTATION_KINDS.has(kind)) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' requires the reserved library-emitted kind '${kind}' — ` +
          'SPEC §11.1: declaring a reserved kind in requiredConsultations is a profile-construction error',
      );
    }
    if (seen.has(kind)) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' requires '${kind}' twice in requiredConsultations — ` +
          'entries must be pairwise distinct (duplicate)',
      );
    }
    seen.add(kind);
  }
}

/**
 * Fail-CLOSED structural validation of a single profile. Order:
 *  1. structural: at least one leg (internal legId derivation must be well-defined);
 *  2. structural: unique leg ids (SPEC §10.1 keys recorded evidence by legId);
 *  3. GOVERNED `captureMode:'live'` (live capture, SPEC §9.2) — checked BEFORE the reverify
 *     guard so a live profile throws GOVERNED(captureMode), never the reverify refusal;
 *  4. structural: an empty `policySource` label (policy drift, SPEC §10.3) — the
 *     malformed-reference rule, the same settled class as `eligibility`'s own empty-label
 *     check;
 *  5. per-leg GOVERNED guards + stray-redemption-key check (inside `validateLeg`), then
 *     structural SoD shape validation (`validateSodShape`), structural
 *     requiredConsultations validation (`validateRequiredConsultations`), and structural
 *     eligibility validation (`validateEligibility`), all three after;
 *  6. structural: stray redemption key on the profile itself;
 *  7. structural: `reverify` on a non-live profile — not built in this build (SPEC §9.2's
 *     live mode).
 * `legs.length>1` (multi-leg maker-checker sequencing, SPEC §10.1) is accepted at
 * construction as of the first step-4 increment: `kernel/open.ts`'s sequencing rung
 * verifies every prior-leg reference by replay before a successor's record is created, in
 * the same commit as this lift, so the guard's stated trigger has fired for the ordering
 * half. Per-leg `sod`/`proposer` (`validateLeg`, below) are REAL as of the second step-4
 * increment: the gate that reads the recorded evidence lands at finalize's rung 3.5 in the
 * same commit as this lift, so the GOVERNED throws are gone — `validateSodShape` (above)
 * replaces them with this build's fail-closed structural posture (the spec is silent on
 * all four of its rules — the fourth, proposer non-emptiness, found at that increment's
 * final review; none is a divergence, each a permitted tightening).
 * `redeemBound` (redeeming-window bound, SPEC §4 & §11.2) is accepted-at-construction as of
 * the third step-3 increment — the clock module now stamps the `bound` payload and `dueAt`,
 * AND the en-passant resolution that consumes `dueAt` is built at the redemption seams'
 * shared prologue (`kernel/redeem.ts`) and at `finalize()`/`open()`'s own clock rungs, so
 * there is no longer a GOVERNED guard on it here.
 * `requiredConsultations` (SPEC §11.1) is accepted-at-construction as of the second step-5
 * increment: the gate that reads the declaration lands at finalize's rung 5.5 in the same
 * commit as this lift, so the GOVERNED throw is gone — `validateRequiredConsultations`
 * (above) replaces it with this build's fail-closed structural posture (non-empty, pairwise
 * distinct, every kind a non-empty string, never a reserved kind — the same settled class
 * as `validateSodShape`'s). The governed count moves 7 → 6 with this lift.
 * `eligibility` (SPEC §10.4) is accepted-at-construction as of the first step-6 increment:
 * the implicit-first arm that reads the declaration lands at finalize's rung 5.5 in the
 * same commit as this lift, so the GOVERNED throw is gone — `validateEligibility` (above)
 * replaces it with the same settled fail-closed structural class (empty label rejected as
 * the malformed-reference rule, not the inertness trap; double declaration rejected per
 * SPEC §10.4's own "declare it once" sentence). The governed count moves 6 → 5 with this
 * lift.
 * `policySource` (SPEC §10.3) is accepted-at-construction as of the second step-6
 * increment (the EIGHTH self-authored inversion — argued in place at
 * construction-validation.test.ts's own pin): `open()`'s binding contract, finalize's
 * presence contract, and rung (4.5)'s comparison land in the SAME commit as this lift, so
 * the guard's stated trigger has fired for the whole three-seam obligation — construction
 * validity, open-time binding, and finalize-time gate are none of them reachable alone.
 * The structural empty-label check above replaces the deleted GOVERNED throw with the same
 * settled fail-closed class `eligibility`'s own empty-label rule uses. The governed count
 * moves 5 → 4 with this lift.
 * The sweep is TOTAL: a profile declaring any governed feature throws — the first one
 * reached wins, but none slips through. Canonicalizer resolution + duplicate-id detection
 * are `create.ts`'s (they need the registry / the whole profile list).
 */
export function validateProfile(profile: ConfirmProfile): void {
  if (profile.legs.length === 0) {
    throw new Error(`invalid profile '${profile.id}': at least one leg is required (found 0)`);
  }
  const seenLegIds = new Map<string, number>();
  for (const [index, leg] of profile.legs.entries()) {
    const first = seenLegIds.get(leg.id);
    if (first !== undefined) {
      throw new Error(
        `invalid profile '${profile.id}': duplicate leg id '${leg.id}' at positions ${first} and ${index} — ` +
          'SPEC §10.1 keys recorded evidence by legId, so leg ids must be unique',
      );
    }
    seenLegIds.set(leg.id, index);
  }
  if (profile.captureMode === 'live') {
    throw new Error(
      governedUnavailable(
        'captureMode',
        'live capture is not implemented in this build; only staged capture is supported. Contract: §9.2.',
      ),
    );
  }
  if (profile.policySource !== undefined && profile.policySource.length === 0) {
    throw new Error(
      `invalid profile '${profile.id}': declares an empty policySource label — ` +
        'an opaque reference that references nothing is malformed config (the label names ' +
        "the operator's policy authority; the gate keys on the declaration, SPEC §10.3)",
    );
  }
  for (const [index, leg] of profile.legs.entries()) {
    validateLeg(profile.id, leg);
    validateSodShape(profile, index, leg);
    validateRequiredConsultations(profile, leg);
    validateEligibility(profile, leg);
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
// supersedes? })`) — NOT construction; `priorRecordRefs` and `policyDigest` are both
// real, `supersedes` alone stays GOVERNED at the call seam ------------------------------

/** A host-supplied prior-leg reference (SPEC §10.1): the claim `open()` verifies by
 * replay — never adopted unchecked. The recorded three-field form (types.ts's
 * `RecordedPriorLegRef`) is what the verified snapshot carries. */
export interface PriorRecordRef {
  recordId: string;
  chainHead: Digest;
}

export interface OpenOptions {
  /** SPEC §9 / §10.1: one entry per prior leg, in leg order, on a successor leg's
   * open(). A first leg supplies none. Verified by replay; any failure refuses
   * `prior-leg-unverified` pre-record. */
  priorRecordRefs?: PriorRecordRef[];
  /** SPEC §10.3: the policy snapshot digest the OPERATOR attests at open() — bound into
   * the genesis, present-iff-declared. Never routed through the agent-reachable
   * stage(): "routing the drift baseline through the untrusted drafter would let a
   * lying agent bind whatever digest it anticipates the live source will hold". */
  policyDigest?: Digest;
  // `supersedes` (§2's recovery linkage) remains GOVERNED at the call seam — its build
  // step has not arrived.
}

// --- finalize() options bag (SPEC §11.1's consultation input surface) -----------------

/**
 * An *obtained consultation* (SPEC §11.1): `{ kind, checker, payloadDigest, verdict }`,
 * with an optional `proofRef`. Custody is digest-only — the host digests its own
 * evidence payload; the library never sees it. There is deliberately no `at` field:
 * recording time is library-stamped (§2.1), never host-supplied, so an unknown entry
 * key (`at` included) throws at intake — "never accepted from the host" is enforced
 * structurally, not by silently dropping the field.
 */
export interface ObtainedConsultation {
  kind: string;
  checker: IdentityAssertion;
  payloadDigest: Digest;
  verdict: 'pass' | 'fail';
  proofRef?: string;
}

/**
 * An *unreachable marker* (SPEC §11.1): `{ kind, unreachable: true, authority }`, whose
 * `authority` names the party that was down. Like `ObtainedConsultation`, there is no
 * `at` field — the library stamps recording time itself (§2.1).
 */
export interface UnreachableMarker {
  kind: string;
  unreachable: true;
  authority: string;
}

/** SPEC §11.1's consultation input surface: each entry is either shape. */
export type ConsultationInput = ObtainedConsultation | UnreachableMarker;

/** SPEC §10.3's finalize-time policy attestation: the live-source digest the operator
 * read — `{ digest }` — or an attestation that the source was down — `{ unreachable,
 * authority }`. Shape validated at intake (`kernel/consultations.ts`'s
 * `validatePolicyInput`); presence validated at profile resolution
 * (`kernel/finalize.ts`'s presence contract). */
export type PolicyInput = { digest: Digest } | { unreachable: true; authority: string };

export interface FinalizeOptions {
  /** SPEC §11.1: the host's supplied consultations, attach-form. */
  consultations?: ConsultationInput[];
  /** SPEC §10.3: the operator's live-policy attestation, real as of the second step-6
   * increment — required on a policy-declaring profile, forbidden on a non-declaring
   * one (the presence contract; `kernel/finalize.ts`). */
  policy?: PolicyInput;
}
