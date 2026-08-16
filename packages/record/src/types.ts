// @vidimera/record — core shapes (SPEC §2 "The record model" / §4 "Transitions & the
// encoding"). Field-for-field with the SPEC's tables; comments preserve its semantic
// constraints.

import type { RefusalCode } from './refusal-codes.js';

export type Digest = string;

export interface IdentityAssertion {
  principal: string;
  authority: string;
  proofRef?: string;
}
// authority RECOMMENDED: "oidc:<issuer>" | "session:<app>" | "mtls:<service>" | "dev-stub"

/**
 * A prior leg's reference, in its recorded three-field form (SPEC §10.1: "the record's
 * `opened` snapshot carries the verified references in their recorded three-field form
 * `{ recordId, chainHead, legId }`"): the host supplies `recordId`/`chainHead` at
 * `open()`, and the library adds the `legId` it verified the reference sits at.
 */
export interface RecordedPriorLegRef {
  recordId: string;
  chainHead: Digest;
  legId: string; // library-added while verifying against the profile's leg order
}

export interface Consultation {
  kind: string;
  checker: IdentityAssertion;
  at: string;
  payloadDigest: Digest;
  verdict: 'pass' | 'fail';
  proofRef?: string;
}

/**
 * A raised finding's payload (SPEC §2's Finding auxiliary structure, §10.2):
 * `{ findingId, kind, findingDigest, magnitude?, raiser, at }` minus `at` — the enclosing
 * `Transition.at` already carries recording time, the same convention every payload shape
 * in this build follows (`confirmed`'s `{actor}`, `refused`'s `{code}`). The seam that
 * mints this shape, `raiseFinding`, lands in the second step-7 increment — the first
 * landed only the READ half: the fold (`chain/replay.ts`), the counting predicate and the
 * coverage derivation (`kernel/findings.ts`), and the review projection.
 */
export interface FindingRaisedPayload {
  findingId: string;
  kind: string;
  findingDigest: Digest;
  magnitude?: string;
  raiser: IdentityAssertion;
}

/**
 * An acknowledgment's payload (SPEC §2's Ack auxiliary structure, §10.2):
 * `{ findingId, findingDigest, magnitude?, actor, at }` minus `at`, same convention as
 * `FindingRaisedPayload` above. The identity field is named `acker` here, not the SPEC
 * table's `actor` — `DecisionRecord.actor` already names the deciding human (this file's
 * own record-model field), and reusing that label for the acknowledging identity would
 * read as the same field twice under one name. The seam that mints this shape,
 * `acknowledge`, lands in the second step-7 increment, alongside `raiseFinding`.
 */
export interface AcknowledgedPayload {
  findingId: string;
  findingDigest: Digest;
  magnitude?: string;
  acker: IdentityAssertion;
}

/**
 * A recorded acknowledgment, folded onto its finding (SPEC §10.2): the digest/magnitude it
 * names plus the identity that gave it. Recorded whether or not it counts — counting is
 * `kernel/findings.ts`'s `ackCounts`'s job, never this fold's (fidelity, not validity).
 */
export interface RecordedAck {
  findingDigest: Digest;
  magnitude?: string;
  acker: IdentityAssertion;
}

/**
 * A raised finding folded to its CURRENT version (SPEC §10.2): a re-raise moves
 * `findingDigest`/`magnitude`/`raiser` in place, keyed by `findingId`, first-raise order
 * preserved — `kind` is immutable per `findingId` (a re-raise changing it is a fold-time
 * throw, `chain/replay.ts`). `acks` accumulates every acknowledgment this finding has ever
 * received, in chain order, including ones the current version no longer matches —
 * `kernel/findings.ts`'s `ackCounts` decides which ones count; this fold never filters.
 */
export interface RecordedFinding {
  findingId: string;
  kind: string;
  findingDigest: Digest;
  magnitude?: string;
  raiser: IdentityAssertion;
  acks: RecordedAck[];
}

export type RecordState =
  | 'open'
  | 'confirmed'
  | 'refused'
  | 'expired'
  | 'redeeming'
  | 'redeemed'
  | 'redemption-failed'; // last three: effect-seam states (SPEC §2); 'redeemed' produced
// since the first step-3 increment, 'redeeming' since the second, 'redemption-failed'
// since the third (kernel/expiry.ts's clock resolution) — all three reachable now

export type TransitionKind =
  | 'opened'
  | 'consultation-recorded'
  | 'confirmed'
  | 'refused'
  | 'expired'
  | 'sealed'
  | 'finding-raised'
  | 'acknowledged'
  | 'redeeming'
  | 'redeemed'
  | 'redemption-failed';
// this build's kernel emits: opened, consultation-recorded, confirmed, refused, expired,
// sealed, redeemed, redeeming, redemption-failed (the third step-3 increment's clock
// resolution) — not yet finding-raised/acknowledged (§10.2)

export interface Transition {
  recordId: string;
  seq: number;
  at: string;
  kind: TransitionKind;
  payload: unknown;
  prevHash: Digest;
} // seq 1-based +1; at RFC3339 UTC

export interface DecisionRecord {
  id: string;
  profileId: string;
  legId: string;
  subjectRef: string;
  contentDigest: Digest;
  policyDigest?: Digest;
  /**
   * Multi-leg successor evidence (SPEC §4/§10.1): present together or not at all — a
   * first leg and every single-leg record omit both. `priorRecordRefs` is the recorded
   * three-field form of the host-supplied references this leg's `open()` verified;
   * `priorLegActors` is library-derived from the replayed prior legs, never host-supplied.
   */
  priorRecordRefs?: RecordedPriorLegRef[];
  priorLegActors?: IdentityAssertion[];
  actor?: IdentityAssertion;
  /**
   * SPEC §10.2's findings-flow evidence: present iff the chain carries at least one
   * `finding-raised` transition — a non-declaring profile's chain never acquires one, so
   * this field is genuinely absent (not present-but-empty) on it, matching SPEC §10.2's
   * own "its chains are byte-identical to a pre-findings implementation" guarantee.
   * `chain/replay.ts` folds it; no seam mints the transitions that populate it until the
   * second step-7 increment.
   */
  findings?: RecordedFinding[];
  consultations: Consultation[];
  state: RecordState;
  /**
   * Per-record lifecycle status (SPEC §5's chain retirement): `retired` once a `sealed`
   * transition caps the chain, `active` before that. DERIVED by `chain/replay.ts` from the
   * chain — never stored, never a caller input, the same discipline `state` follows.
   *
   * NOT a field of SPEC §2's record-model table, which names `state` and no status. §5 and
   * §12 both require a sealed record to report `retired`, which is why the field exists here.
   * That is a divergence from §2's table, recorded rather than reconciled: it is held for the
   * repository owner in `docs/process/implementation-status.md`, because the only other place
   * it could be resolved is the sealed concept set.
   */
  status: 'active' | 'retired';
  refusalCode?: RefusalCode;
}

export interface ReviewView {
  recordId: string;
  profileId: string;
  legId: string;
  subjectRef: string;
  contentDigest: Digest;
  state: RecordState;
  consultations: Consultation[];
  policyDigest?: Digest;
  refusalCode?: RefusalCode; // present-iff-present, the same rule as policyDigest above —
  // kernel/review.ts copies it from the replayed DecisionRecord's `refusalCode` (set by
  // chain/replay.ts's `refused` fold). Absent (not present-but-undefined) on open/confirmed
  // records: an audit surface that hid the refusal reason on a refused record would be
  // under-informative.
  /** SPEC §9's findings projection (§10.2), digest-only with per-finding coverage —
   * present iff the record has findings. Coverage is derived under THIS instance's
   * resolved leg; an unresolvable profile/leg classifies conservatively as
   * `not-required` (review is a pure read that never fails on config drift — the gate
   * at finalize is where an unconfigured profile refuses). */
  findings?: {
    findingId: string;
    kind: string;
    findingDigest: Digest;
    magnitude?: string;
    coverage: 'covered' | 'ack-missing' | 'ack-stale' | 'not-required';
  }[];
}

/**
 * Store-facing staged draft (SPEC §12's "Staged-draft surface"): `stage()` writes one of
 * these (digest-only, content never persisted); `open()` reads it by `stagedRef` to
 * mint the record.
 */
export interface StagedDraft {
  id: string;
  profileId: string;
  legId: string;
  subjectRef: string;
  contentDigest: Digest;
}
