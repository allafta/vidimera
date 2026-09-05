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
import { NEVER_APPENDS, REGISTRY, type RefusalCode } from './refusal-codes.js';
import type { SigningConfig } from './signing/store.js';
import type { Store } from './store/store.js';
import type { Digest, IdentityAssertion, SupersedesRef } from './types.js';

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
  decline?: true; // SPEC §9.1: per-leg switch for §9's decline seam — literal true, the signing rule's class (this increment)
  terminalRefusals?: RefusalCode[];
}

export interface ConfirmProfile {
  id: string; // RECOMMENDED "<domain>.<subject>.v<n>"
  subject: { canonicalizerRef: string };
  legs: LegSpec[]; // ordered; >1 switches on separation of duties (SPEC §10.1)
  captureMode: 'staged' | 'live';
  expiry: { ttl: number } | 'none';
  policySource?: string; // SPEC §10.3
  // presence ⇒ effect seam; `result` (the effect-result increment) admits SPEC §11.2's
  // outcome digest at the redemption seams — declaration alone, never a value, is what
  // ADMITS the field (the admission gate lives at the redemption seams, kernel/redeem.ts)
  redeem?: {
    confirmToRedeem?: number;
    redeemBound?: number;
    reverify?: boolean;
    result?: true;
  };
  /** SPEC §14's AL2 upgrade, per-profile enablement, record-homogeneous from genesis
   * (the AL2 brainstorm ruling) — the AL2 mint increment (first of three): the
   * declaration alone mints a detached signature over every transition this profile's
   * records ever append (`signing/decorate.ts`). The AL2 enforcement increment (second
   * of three, now landed) is what CONSULTS it: every chain-verify site folds
   * `kernel/verify-signatures.ts`'s `signatureLayerHolds` into its own existing failure
   * arm on a declaring profile. The literal `true` (never `boolean`) closes the
   * `signing: false` inertness at the type level for a TS caller — and, as of this
   * review's guard, at runtime too: `validateProfile` (below) throws on any declared
   * value other than `true`, so a non-TS caller cannot construct a silently-inert
   * `signing: false` (or any other truthy-but-wrong value) either. Settled fail-closed
   * class, now true at BOTH levels — matching this file's other structural guards. */
  signing?: true;
}

export interface Config {
  profiles: ConfirmProfile[];
  store: Store;
  canonicalizers: Record<string, Canonicalizer>; // keyed by canonicalizerRef
  /** SPEC §14's AL2 upgrade — the operator-supplied signer/verifier/sidecar block. The
   * AL2 mint increment's own addition: present iff the operator enables signing on this
   * instance. A `signing:true` profile with this absent is a construction error
   * (create.ts); this present with NO declaring profile is legal — a prepared
   * instance, the same unused-canonicalizer-registry-entry class already tolerated
   * above. */
  signing?: SigningConfig;
}

// --- the effect-seam predicate (SPEC §9.1 "The effect-seam predicate") ----------------

/**
 * `profile-declares-effect-seam := (profile.redeem present) OR (profile.captureMode ===
 * 'live')` (SPEC §9.1). Both disjuncts are reachable as of the live-capture increment:
 * `validateLiveCapture` (below) requires every constructing live profile to declare a
 * redemption tail (`confirmToRedeem`, `reverify`, or both), so a live profile always
 * satisfies the `redeem`-present disjunct too — the `captureMode === 'live'` disjunct
 * stays in the formula anyway (matching `nonterminal.ts`'s "full formula, not the
 * narrowed reachable subset" posture: SPEC §9.1's own predicate, not this build's own
 * narrowed corner of it).
 */
export function profileDeclaresEffectSeam(profile: ConfirmProfile): boolean {
  return profile.redeem !== undefined || profile.captureMode === 'live';
}

// --- construction guards (fail-CLOSED) -----------------------------------------------

/**
 * The message for a genuinely unknown options-bag key — a caller/config error, never a
 * domain refusal. `field` is the unknown key; the caller-supplied `contract` is the
 * appended tail: the seam's accepted keys, and the SPEC section(s) that made them real.
 * Four call sites today: `kernel/open.ts`'s options loop, `kernel/finalize.ts`'s
 * `finalizeOptionMessage`, `kernel/decline.ts`'s intake, and `kernel/redeem.ts`'s shared
 * `validateRedeemOptions` serving all three redemption seams
 * (`redeem()`/`beginRedemption()`/`completeRedemption()`). This count is stated once more
 * above `validateProfile`; the two must not diverge again.
 *
 * HISTORY: until the registry-hygiene increment (2026-09-01) this helper was
 * `governedUnavailable`, minting the feature-guard era's head — GOVERNED feature not
 * available in this build (<field>) — per SPEC §9.1's fail-fast rule for unimplemented
 * capabilities. That era closed with zero governed fields remaining; the four surviving
 * callers were never guards, and the old head was recorded as unpinned prose, so the
 * rename broke no gate. §9.1 binds GUARDS: if a governed field ever returns, its guard
 * mints its own §9.1-shaped message at its own site. The NEW head IS pinned
 * (decline.test.ts's unknown-option test), so rewording it again is a test-visible act.
 */
export function unknownOptionKey(field: string, contract: string): string {
  return `unknown option key (${field}) — ${contract}`;
}

/** SPEC §11.1: the library-emitted consultation kinds — reserved on BOTH sides of the
 * seam: a supplied input naming one throws at finalize's intake ("would forge a library
 * control"), and a profile declaring one in `requiredConsultations` is a construction
 * error ("declaring a reserved kind in `requiredConsultations` is likewise a
 * profile-construction error"). */
export const RESERVED_CONSULTATION_KINDS: ReadonlySet<string> = new Set(['facts', 'chain-verify']);

/**
 * The redemption FIELDS: `confirmToRedeem`, `redeemBound`, and `result` — SPEC §9.1's
 * `redeem` block names all three (the effect-result increment added `result` to that
 * row's field coverage) — plus `reverify`, introduced only by SPEC §9.2's live mode (§9.1
 * never names it; nesting it in the same `redeem` block is this build's structuring).
 * `result`'s own semantics — which seams admit it, its two throw postures, digest-only
 * custody — are SPEC §11.2's (the effect-result increment); §9.1 names the field, §11.2
 * defines it. They are only ever valid INSIDE a
 * `redeem` block. Appearing as a direct own-key on the profile or a leg is a
 * misplacement — refused structurally (the former redeem-field guard
 * was logically vacuous, so it is replaced by this real "stray key outside redeem" check).
 */
const REDEMPTION_KEYS = ['confirmToRedeem', 'redeemBound', 'reverify', 'result'] as const;

function assertNoStrayRedemptionKeys(profileId: string, where: string, obj: object): void {
  for (const key of REDEMPTION_KEYS) {
    if (Object.hasOwn(obj, key)) {
      throw new Error(
        `invalid profile '${profileId}': redemption key '${key}' must live inside a 'redeem' block, not as a ${where} key`,
      );
    }
  }
}

/**
 * Structural `allowedAuthorities` validation — the settled fail-closed class
 * (`validateRequiredConsultations`'s three rules, minus the reserved-kind arm: authorities
 * are the host's own namespace): non-empty, every entry a non-empty string, pairwise
 * distinct. An empty list constructed and then refused every finalize and decline with
 * `identity-authority-refused` — a leg no identity could ever decide, the declarable-but-dead
 * twin of the inert trap this class exists to close (SPEC §9.1: inert feature configuration
 * is a construction error).
 */
function validateAllowedAuthorities(profile: ConfirmProfile, leg: LegSpec): void {
  const authorities = leg.allowedAuthorities;
  if (!Array.isArray(authorities)) {
    // A non-TS caller omitting the field or passing one string: its own message, never the
    // empty-array one — the operator must be pointed at the shape they actually wrote.
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' declares no allowedAuthorities list ` +
        `(found ${authorities === undefined ? 'nothing' : typeof authorities}) — every leg names ` +
        'the transport authorities that may decide it (SPEC §6)',
    );
  }
  if (authorities.length === 0) {
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' declares allowedAuthorities as an empty array — ` +
        'no identity could ever decide the leg (non-empty by the fail-closed ruling)',
    );
  }
  const seen = new Set<string>();
  for (const authority of authorities) {
    if (typeof authority !== 'string' || authority.length === 0) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' declares a missing or empty authority in allowedAuthorities`,
      );
    }
    if (seen.has(authority)) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' lists '${authority}' twice in allowedAuthorities — ` +
          'entries must be pairwise distinct (duplicate)',
      );
    }
    seen.add(authority);
  }
}

/** Per-leg GOVERNED guards: every not-yet-enforceable leg control throws. NONE remain as
 * of the AL2 freshness increment — `freshness` was the last (`validateFreshness`, below,
 * replaces it with this build's own fail-closed structural posture). This function is
 * kept as the stray-redemption-key check's own per-leg call site. */
function validateLeg(profileId: string, leg: LegSpec): void {
  assertNoStrayRedemptionKeys(profileId, 'leg', leg);
  // `terminalRefusals` members must be registry codes (SPEC §8): an unrecognized string
  // constructs inert and never matches, so a leg the operator believes configured
  // terminal is not — SPEC §9.1's construction-is-loud rule makes that a construction
  // error, not a runtime surprise. The two legal-but-inert registry members SPEC §8
  // itself names (`leg-expired`, `availability`) stay constructible: their inertness is
  // at-the-seam semantics (pinned in refusal-matrix.test.ts), not a misspelling. The
  // review-hardening pass (2026-09-05) closed the rest of the inert space: `appendsOn`
  // consults the leg only after the compromise class, the availability class and the
  // fixed never-appends set have each answered, so a member from the first or the third
  // could never take effect and is rejected here — SPEC §8 names exactly two legal-but-inert
  // members, and these are not among them. A duplicate takes the allowedAuthorities rule.
  const seen = new Set<string>();
  for (const code of leg.terminalRefusals ?? []) {
    if (!Object.hasOwn(REGISTRY, code)) {
      throw new Error(
        `invalid profile '${profileId}': leg '${leg.id}' lists '${code}' in terminalRefusals, ` +
          'which is not a registry refusal code (SPEC §8) — an unrecognized member would never ' +
          'match, leaving a leg the operator believes terminal silently non-terminal ' +
          '(SPEC §9.1: inert feature configuration is a construction error)',
      );
    }
    if (REGISTRY[code] === 'compromise') {
      throw new Error(
        `invalid profile '${profileId}': leg '${leg.id}' lists '${code}' in terminalRefusals, ` +
          'but the compromise class appends regardless of any listing (SPEC §8) — the member ' +
          'could never take effect (SPEC §9.1: inert feature configuration is a construction error)',
      );
    }
    if (NEVER_APPENDS.has(code)) {
      throw new Error(
        `invalid profile '${profileId}': leg '${leg.id}' lists '${code}' in terminalRefusals, ` +
          'but that code never appends (SPEC §8) — appendsOn consults the leg only after the ' +
          'fixed never-appends set has answered, so the member could never take effect ' +
          '(SPEC §9.1: inert feature configuration is a construction error)',
      );
    }
    if (seen.has(code)) {
      throw new Error(
        `invalid profile '${profileId}': leg '${leg.id}' lists '${code}' twice in terminalRefusals — ` +
          'entries must be pairwise distinct (duplicate)',
      );
    }
    seen.add(code);
  }
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

function validateDecline(profile: ConfirmProfile, leg: LegSpec): void {
  if (Object.hasOwn(leg, 'decline') && leg.decline !== true) {
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' — decline must be the literal true when declared — ` +
        'any other value would construct as a non-declaring leg, silently disabling the seam ' +
        '(the fail-closed structural class; SPEC §9.1)',
    );
  }
}

/**
 * SPEC §11.2's `redeem.result` declaration (the effect-result increment): literal `true`
 * only — unlike `decline` (above), `result` sits on the PROFILE's `redeem` block, not a
 * leg, so this is a profile-level check, not a per-leg one. Any other declared value
 * would construct as a non-declaring profile, silently disabling the admission gate at
 * the redemption seams (the same fail-closed structural class as `decline`/`signing`'s
 * own literal-true guards).
 */
function validateResultDeclaration(profile: ConfirmProfile): void {
  if (Object.hasOwn(profile.redeem ?? {}, 'result') && profile.redeem?.result !== true) {
    throw new Error(
      `invalid profile '${profile.id}': redeem.result must be the literal true when declared — ` +
        'any other value would construct as a non-declaring profile, silently disabling the ' +
        'admission gate (the fail-closed structural class; SPEC §9.1)',
    );
  }
}

/**
 * SPEC §11.1's freshness bounds (the AL2 freshness increment — the LAST governed
 * lift; the guard era the kernel increment opened ends here). AL2-dependent made
 * structural: only a signing profile may declare freshness ("meaningful only for
 * consultation kinds that carry such an authority-supplied time" — and the claim is
 * only tamper-evident under the signature layer). Keys must be bounded-able: each a
 * required kind of the same leg (or the implicit 'eligibility' where declared) — the
 * subset rule also excludes the reserved kinds by construction, since they can never
 * be required. Values are positive integer seconds (the ttl convention).
 */
function validateFreshness(profile: ConfirmProfile, leg: LegSpec): void {
  if (leg.freshness === undefined) return;
  if (profile.signing !== true) {
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' declares freshness without profile signing — ` +
        'freshness gates a recorded observation claim, tamper-evident only under the AL2 signature layer (SPEC §11.1, §14)',
    );
  }
  const entries = Object.entries(leg.freshness);
  if (entries.length === 0) {
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' declares an empty freshness record — ` +
        'the control must bound at least one kind (non-empty by the fail-closed ruling)',
    );
  }
  const boundable = new Set(leg.requiredConsultations ?? []);
  if (leg.eligibility !== undefined) boundable.add('eligibility');
  for (const [kind, seconds] of entries) {
    if (typeof kind !== 'string' || kind.length === 0 || !boundable.has(kind)) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' bounds freshness of '${kind}', which is not a ` +
          'required kind of this leg — a bound on a never-gated kind is declarable-but-inert (the fail-closed ruling)',
      );
    }
    if (!Number.isInteger(seconds) || seconds <= 0) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' bounds '${kind}' at ${String(seconds)} — ` +
          'a freshness bound is a positive integer of seconds (the ttl convention)',
      );
    }
  }
}

/**
 * SPEC §9.1/§4's numeric bounds — `expiry.ttl` (when declared, i.e. `expiry !== 'none'`),
 * `redeem.confirmToRedeem`, and `redeem.redeemBound` (when present; SPEC §9.1's `redeem`
 * block leaves both optional) — validated for the first time at the self-test-tier
 * increment (deferral register row 18, retired by this landing; found at the AL2
 * freshness increment's own final review). Until now all three were unvalidated numeric fields: a `NaN`/`Infinity` value
 * constructed cleanly and only crashed later, wherever first reached (`jcs.ts`'s own
 * non-finite-numbers-throw rule, or `kernel/expiry.ts`'s `resolveDueClock` calling
 * `toISOString()` on the resulting Invalid Date); a negative or zero value constructed
 * cleanly too and silently PRE-ELAPSED the window it declares, never refusing at
 * construction the way a freshness bound already does. Row 18's own recorded stance —
 * `construction-validation.test.ts`'s redeemBound pin, "Bound-value validation
 * deliberately mirrors expiry.ttl's treatment (no novel posture)" — is inverted here,
 * deliberately, not by drift: `validateFreshness` (above) ended this file's
 * no-numeric-rules symmetry at the AL2 freshness increment, so mirroring `expiry.ttl`'s
 * own laxity stopped being this build's only posture on a numeric bound, leaving the
 * three fields here as the sole remaining unvalidated class — row 18's own trigger. The
 * message register and rule class are `validateFreshness`'s own, unchanged: a positive
 * integer of seconds (the ttl convention), WHERE DECLARED.
 */
function validateBounds(profile: ConfirmProfile): void {
  if (profile.expiry !== 'none') {
    const expiry: unknown = profile.expiry;
    if (typeof expiry !== 'object' || expiry === null) {
      // The review-hardening pass (2026-09-05): a non-TS caller's `expiry: undefined` met a raw
      // TypeError from the destructuring below; it meets this file's own message instead.
      throw new Error(
        `invalid profile '${profile.id}': expiry is ${JSON.stringify(expiry) ?? 'undefined'} — ` +
          "SPEC §9.1 admits 'none' or { ttl }; anything else is malformed config, not a bound",
      );
    }
    const { ttl } = profile.expiry;
    if (!Number.isInteger(ttl) || ttl <= 0) {
      throw new Error(
        `invalid profile '${profile.id}': expiry.ttl is ${String(ttl)} — ` +
          'a bound is a positive integer of seconds (the ttl convention)',
      );
    }
  }
  const confirmToRedeem = profile.redeem?.confirmToRedeem;
  if (
    confirmToRedeem !== undefined &&
    (!Number.isInteger(confirmToRedeem) || confirmToRedeem <= 0)
  ) {
    throw new Error(
      `invalid profile '${profile.id}': redeem.confirmToRedeem is ${String(confirmToRedeem)} — ` +
        'a bound is a positive integer of seconds (the ttl convention)',
    );
  }
  const redeemBound = profile.redeem?.redeemBound;
  if (redeemBound !== undefined && (!Number.isInteger(redeemBound) || redeemBound <= 0)) {
    throw new Error(
      `invalid profile '${profile.id}': redeem.redeemBound is ${String(redeemBound)} — ` +
        'a bound is a positive integer of seconds (the ttl convention)',
    );
  }
}

/**
 * SPEC §9.2's live-mode construction rules (the live-capture increment — the
 * captureMode:'live' lift). "The obligation is gated, not merely stated: the
 * re-derivation is declared as a `requiredConsultations` kind under §11.1" — so every
 * leg of a live profile must DECLARE required consultations (which declared kind is
 * the independent re-derivation is the host's semantics; that its access path is
 * genuinely independent is not library-checkable — that proof is the
 * operator-assurance tier's live-path-distinctness probe, CONTROLS §4). And the
 * redemption tail: "A live profile either declares `confirmToRedeem` as a maximum age"
 * or declares `reverify` — at least one; both is legal.
 */
function validateLiveCapture(profile: ConfirmProfile): void {
  if (profile.captureMode !== 'live') return;
  for (const leg of profile.legs) {
    if (leg.requiredConsultations === undefined) {
      throw new Error(
        `invalid profile '${profile.id}': captureMode 'live' requires leg '${leg.id}' to declare ` +
          'requiredConsultations — the decide-time independent re-derivation is gated, not merely stated (SPEC §9.2)',
      );
    }
  }
  if (profile.redeem?.confirmToRedeem === undefined && profile.redeem?.reverify !== true) {
    throw new Error(
      `invalid profile '${profile.id}': captureMode 'live' requires the redemption tail — ` +
        'declare redeem.confirmToRedeem as a maximum age, redeem.reverify, or both (SPEC §9.2)',
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
    // The review-hardening pass (2026-09-05): `sod: {}` from a non-TS caller met a raw
    // TypeError on `.length`; the shape is checked first so it meets this file's own message.
    const sod: unknown = leg.sod;
    const entries: unknown =
      typeof sod === 'object' && sod !== null
        ? (sod as { notActorOf?: unknown }).notActorOf
        : undefined;
    if (!Array.isArray(entries)) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' declares sod without a notActorOf array ` +
          `(found ${entries === undefined ? 'nothing' : typeof entries}) — SPEC §10.1`,
      );
    }
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
 * SPEC §10.2's findings-flow construction rules (the second step-7 increment — the
 * ackMode/requiredAcks lift): the pair is declared "both-or-neither; either alone is a
 * construction error", and `requiredAcks` takes the settled fail-closed class
 * (`validateSodShape`/`validateRequiredConsultations`'s): non-empty, pairwise
 * distinct, every kind a non-empty string. NO reserved-kind arm, deliberately —
 * finding kinds are their own namespace (SPEC §10.2: "the reserved consultation kinds
 * do not apply to them"), so 'facts' is a LEGAL requiredAcks kind.
 */
function validateFindingsFlow(profile: ConfirmProfile, leg: LegSpec): void {
  const hasMode = leg.ackMode !== undefined;
  const hasAcks = leg.requiredAcks !== undefined;
  if (hasMode !== hasAcks) {
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' declares ` +
        `${hasMode ? 'ackMode without requiredAcks' : 'requiredAcks without ackMode'} — ` +
        'SPEC §10.2: the findings flow is declared both-or-neither; either alone is a construction error',
    );
  }
  if (!hasAcks) return;
  const mode: unknown = leg.ackMode;
  if (mode !== 'self' && mode !== 'counterparty' && mode !== 'any') {
    // The review-hardening pass (2026-09-05): `kernel/findings.ts`'s `ackCounts` falls through
    // to the permissive `'any'` branch for any value it does not recognize, so an unrecognized
    // mode from a non-TS caller was a silently WEAKENED gate — the fail-open direction, the
    // one shape this file exists to make loud.
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' declares ackMode ${JSON.stringify(mode)} — ` +
        "SPEC §10.2 names three modes, 'self', 'counterparty' and 'any'; any other value would " +
        "count acknowledgments as 'any', a silently weakened gate (the fail-closed structural class)",
    );
  }
  const kinds = leg.requiredAcks as string[];
  if (kinds.length === 0) {
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' declares requiredAcks as an empty array — ` +
        'the control must require at least one kind (non-empty by the fail-closed ruling)',
    );
  }
  const seen = new Set<string>();
  for (const kind of kinds) {
    if (typeof kind !== 'string' || kind.length === 0) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' declares a missing or empty finding kind in requiredAcks`,
      );
    }
    if (seen.has(kind)) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' requires acknowledgment of '${kind}' twice — ` +
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
 *  3. structural: `captureMode:'live'` construction rules (`validateLiveCapture`, SPEC
 *     §9.2, live as of the live-capture increment) — checked at this same position,
 *     still ahead of the reverify guard below (rung 8), whose own condition now reads
 *     `captureMode` directly rather than relying on this rung to have thrown first;
 *  4. structural: numeric bounds (`validateBounds`, SPEC §9.1/§4, real as of the
 *     self-test-tier increment — register row 18) — `expiry.ttl` where declared,
 *     `redeem.confirmToRedeem`/`redeem.redeemBound` where present, each a positive
 *     finite integer of seconds;
 *  4a. structural: the `redeem.result` declaration's shape (`validateResultDeclaration`,
 *     the effect-result increment) — profile-level, run immediately after the numeric
 *     bounds and before the policySource label check;
 *  5. structural: an empty `policySource` label (policy drift, SPEC §10.3) — the
 *     malformed-reference rule, the same settled class as `eligibility`'s own empty-label
 *     check;
 *  5a. structural: `signing` declared as anything but the literal `true` — the
 *     fail-closed guard that stops a silently-inert `signing: false` from constructing;
 *     profile-level, run before the leg loop;
 *  6. the stray-redemption-key check (inside `validateLeg` — no per-leg GOVERNED guard
 *     remains there, see below), then structural allowedAuthorities validation
 *     (`validateAllowedAuthorities`), structural SoD shape validation
 *     (`validateSodShape`), structural requiredConsultations validation
 *     (`validateRequiredConsultations`), structural eligibility validation
 *     (`validateEligibility`), structural decline validation (`validateDecline`),
 *     structural freshness validation (`validateFreshness`), and structural
 *     findings-flow validation (`validateFindingsFlow`), all seven after;
 *  7. structural: stray redemption key on the profile itself;
 *  8. structural: `reverify` on a non-live profile — live capture's own control,
 *     misdeclared onto a staged profile (SPEC §9.2's live mode).
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
 * `ackMode`/`requiredAcks` (SPEC §10.2's findings flow) are accepted-at-construction as of
 * the second step-7 increment: the seams that mint `finding-raised`/`acknowledged`
 * (`kernel/findings-seams.ts`) and the coverage gate that reads the pair at finalize's rung
 * (5.7) land in the SAME commit as this lift, so the GOVERNED throws are gone —
 * `validateFindingsFlow` (above) replaces them with the same settled fail-closed structural
 * class `validateRequiredConsultations`'s uses, MINUS a reserved-kind arm (finding kinds
 * are their own namespace, SPEC §10.2). Two per-leg/profile fields remained governed after
 * this lift: the whole-profile `captureMode:'live'` and the per-leg `freshness` — since
 * moved again at the live-capture increment; see the live-capture paragraph below. The governed count
 * moves 4 → 2 with this lift (both fields of the pair lift together, in one commit).
 * `captureMode:'live'` (SPEC §9.2's live mode) is accepted-at-construction as of the
 * live-capture increment: `validateLiveCapture` (above) replaces the GOVERNED throw with
 * this build's own fail-closed structural posture — a live profile must declare a
 * required consultation on every leg (the decide-time independent re-derivation rides
 * finalize's ALREADY-BUILT rung 5.5, no new gate needed there) and a redemption tail
 * (`confirmToRedeem`, `reverify`, or both). What lands in the SAME commit as this lift is
 * the piece that was actually missing: `kernel/redeem.ts`'s `refuseCorrespondenceMismatch`,
 * which reads `redeem.reverify` at all three redemption seams and maps a CONTENT
 * correspondence mismatch to `content-drift` (appended terminal, releasing the hold)
 * instead of `effect-mismatch` (never-append) — before this commit `reverify` was
 * structurally refused outright regardless of `captureMode` (the tail rule, rung 7 above),
 * so a live profile could never construct at all. One field remained governed after this
 * lift: the per-leg `freshness`. The governed count moved 2 → 1 with this lift.
 * `freshness` (SPEC §11.1/§14) is accepted-at-construction as of the AL2 freshness
 * increment — the LAST governed lift, the TENTH self-authored inversion in
 * `implementation-status.md`'s numbered sequence (argued in place at
 * construction-validation.test.ts's own pin, where EIGHT of the prior nine live; the
 * sequence's second entry, the replay-fold inversion, is argued at
 * replay-verify.test.ts's own pin instead): the freshness arm that reads the
 * declaration lands at finalize's rung 5.5, in the SAME
 * commit as this lift, so the guard's stated trigger (an authority-timestamped build)
 * has fired. `validateFreshness` (above) replaces the GOVERNED throw with this build's
 * own fail-closed structural posture — the AL2 dependency made structural (a declaring
 * profile must set `signing: true`), keys a subset of the leg's required kinds (plus the
 * implicit `'eligibility'`), values positive integer seconds. The governed count moves
 * 1 → 0 with this lift: the feature-guards-from-day-one era the kernel increment opened
 * closes here — every guard that era installed has now lifted behind its own behavior,
 * each in the same commit as that behavior. `unknownOptionKey` (above; named
 * `governedUnavailable` until the registry-hygiene increment renamed it with its head)
 * SURVIVES this lift: it is not itself a per-field guard, and it still serves the generic
 * unknown-option-key throws that are NOT feature guards — four call sites today
 * (`kernel/open.ts`, `kernel/finalize.ts`, `kernel/decline.ts`, and `kernel/redeem.ts`'s
 * shared `validateRedeemOptions` serving all three redemption seams), none of which names
 * a single not-yet-enforceable field the way every guard swept by this sequence did. This
 * count is stated once above `unknownOptionKey` itself; the two must not diverge again.
 * The sweep is TOTAL: a profile declaring any governed feature throws — the first one
 * reached wins, but none slips through. Canonicalizer resolution + duplicate-id detection
 * are `create.ts`'s (they need the registry / the whole profile list).
 */
export function validateProfile(profile: ConfirmProfile): void {
  // The review-hardening pass (2026-09-05): the shapes a non-TS caller can hand in that the
  // typed surface rules out, read BEFORE anything destructures them, so the caller meets this
  // file's own `invalid profile` message and never a raw TypeError (SPEC §9.1: inert or
  // contradictory feature combinations are construction errors). Each is held as `unknown`
  // deliberately — the declared type says the value cannot be wrong, and the check is for
  // the caller the declared type does not reach.
  const id: unknown = profile.id;
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error(
      `invalid profile '${String(id)}': the profile id is empty — a profile is addressed by its id ` +
        '(SPEC §9.1 recommends the <domain>.<subject>.v<n> form); an empty id is malformed config',
    );
  }
  const legs: unknown = profile.legs;
  if (!Array.isArray(legs)) {
    throw new Error(
      `invalid profile '${profile.id}': legs must be an array of leg declarations ` +
        `(found ${legs === undefined ? 'nothing' : typeof legs}) — SPEC §9.1`,
    );
  }
  if (profile.legs.length === 0) {
    throw new Error(`invalid profile '${profile.id}': at least one leg is required (found 0)`);
  }
  const mode: unknown = profile.captureMode;
  if (mode !== 'staged' && mode !== 'live') {
    throw new Error(
      `invalid profile '${profile.id}': captureMode is ${JSON.stringify(mode) ?? 'undefined'} — ` +
        "SPEC §9.2 names two modes, 'staged' and 'live'; anything else would construct as staged, " +
        'a silent misdeclaration (SPEC §9.1: inert feature configuration is a construction error)',
    );
  }
  const seenLegIds = new Map<string, number>();
  for (const [index, leg] of profile.legs.entries()) {
    const legId: unknown = leg.id;
    if (typeof legId !== 'string' || legId.length === 0) {
      throw new Error(
        `invalid profile '${profile.id}': the leg id at position ${index} is empty — ` +
          'SPEC §10.1 keys recorded evidence by legId, so every leg id must be a non-empty string',
      );
    }
    const first = seenLegIds.get(leg.id);
    if (first !== undefined) {
      throw new Error(
        `invalid profile '${profile.id}': duplicate leg id '${leg.id}' at positions ${first} and ${index} — ` +
          'SPEC §10.1 keys recorded evidence by legId, so leg ids must be unique',
      );
    }
    seenLegIds.set(leg.id, index);
  }
  validateLiveCapture(profile);
  validateBounds(profile);
  validateResultDeclaration(profile);
  if (profile.policySource !== undefined && profile.policySource.length === 0) {
    throw new Error(
      `invalid profile '${profile.id}': declares an empty policySource label — ` +
        'an opaque reference that references nothing is malformed config (the label names ' +
        "the operator's policy authority; the gate keys on the declaration, SPEC §10.3)",
    );
  }
  if (Object.hasOwn(profile, 'signing') && profile.signing !== true) {
    throw new Error(
      `invalid profile '${profile.id}': signing must be the literal true when declared — ` +
        'any other value would construct as a non-signing profile, a silent AL1 downgrade ' +
        '(the fail-closed structural class; SPEC §14 signing is operator-ENABLED, never approximate)',
    );
  }
  for (const [index, leg] of profile.legs.entries()) {
    validateLeg(profile.id, leg);
    validateAllowedAuthorities(profile, leg);
    validateSodShape(profile, index, leg);
    validateRequiredConsultations(profile, leg);
    validateEligibility(profile, leg);
    validateDecline(profile, leg);
    validateFreshness(profile, leg);
    validateFindingsFlow(profile, leg);
  }
  assertNoStrayRedemptionKeys(profile.id, 'top-level profile', profile);
  // `reverify` on a non-live profile is refused — reverify is live capture's OWN control
  // (SPEC §9.2: "A live profile either declares `confirmToRedeem` as a maximum age" or
  // declares `reverify`), so declaring it on a staged profile is a misdeclaration, not
  // an unimplemented-feature gap. Before the live-capture increment this arm needed no
  // explicit `captureMode` check — every live profile threw GOVERNED above, so any
  // `reverify:true` reaching here was BY DEFINITION on a non-live profile; now that
  // `validateLiveCapture` (above) lets a live profile construct, this arm must name its
  // own condition explicitly instead of inheriting it from a guard that no longer fires.
  if (profile.captureMode !== 'live' && profile.redeem?.reverify === true) {
    throw new Error(
      `invalid profile '${profile.id}': 'reverify' is only available on a captureMode:'live' ` +
        "profile (SPEC §9.2's live mode) — declaring it on a staged profile is a misdeclaration",
    );
  }
}

// --- open() options bag (§9 `open(stagedRef, { priorRecordRefs?, policyDigest?,
// supersedes?, proposed? })`) — NOT construction; all four documented open() keys are
// real: `supersedes` as of the step-8 recovery increment, `proposed` as of the
// proposal-provenance increment ---------------------------------------------------------

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
  /** SPEC §2: the recovery claim on a fresh record that recovers a terminal
   * predecessor — the host's `{ recordId, chainHead }`, verified by replay at open()
   * (`kernel/supersedes.ts`'s `verifySupersedes`) before it is ever bound. Same-subject
   * required; any profile allowed (a revised-profile re-open stays possible). Real as
   * of the step-8 recovery increment; any failure refuses `supersedes-unverified`
   * pre-record. */
  supersedes?: SupersedesRef;
  /** SPEC §9's provenance option (§2's proposedDigest): the staged reference the
   * proposal arrived as, resolved through the store at open() and required to name the
   * SAME (profileId, subjectRef, legId) as the opened draft — both failure modes THROW
   * (the unknown-stagedRef caller-error posture). Binds the resolved draft's
   * contentDigest into the genesis, present-iff-supplied. Record-only: nothing gates
   * on it (notarize, never evaluate). Real as of the proposal-provenance increment. */
  proposed?: { stagedRef: string };
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
  /** SPEC §14's AL2 admission (the AL2 freshness increment): the checker-claimed
   * observation time, present-iff-supplied. Structural well-formedness (RFC 3339 with
   * an explicit offset, enforced at intake) is `kernel/consultations.ts`'s intake job;
   * WHETHER a present one is legal at all is `kernel/finalize.ts`'s presence contract
   * (signing-gated). */
  observedAt?: string;
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

// SPEC §9's decline seam: consultations only — no policy member, by design (this increment).
export interface DeclineOptions {
  /** SPEC §11.1: the host's supplied consultations, attach-form — the same shape
   * `FinalizeOptions.consultations` declares; the decline seam takes no policy input. */
  consultations?: ConsultationInput[];
}

// --- redeem()/beginRedemption()/completeRedemption() options bag (SPEC §11.2, §12) ---

/**
 * The redemption seams' options bag (SPEC §11.2, §12; this build's own shape — SPEC
 * states no redemption argument list, and §9 licenses growth through the operator-only
 * bags). `tx` moved in from a trailing positional parameter at the effect-result
 * increment — a shape update to deferral-register row 16 (the token-shape seams'
 * originally-missing `tx?`), which was already retired 2026-08-19, before this increment;
 * `docs/process/implementation-status.md` and `docs/process/next-phases.md` carry the
 * retirement and this shape update, not a reopening of the row.
 */
export interface RedeemOptions {
  /** SPEC §12's caller-transaction seam: the DRIVER'S OWN transaction handle. Typed
   * `unknown` deliberately — §12 requires the concrete type stay the driver's, "never
   * abstracted behind a library-owned transaction interface", so this field must never
   * become a library transaction type. When supplied, the append is enlisted and
   * commits or rolls back with the host's own write. */
  tx?: unknown;
  /** SPEC §11.2's result notarization (the effect-result increment): the host's CLAIMED
   * outcome digest, admitted iff the profile declares `redeem.result` (§9.1) — supplying
   * one on a non-declaring profile is a caller error, and issuance (`beginRedemption`)
   * admits none at all. Digest-only custody: the host digests its own result content and
   * the library never sees it, never verifies the claim, and never gates on it. */
  result?: { digest: Digest };
}
