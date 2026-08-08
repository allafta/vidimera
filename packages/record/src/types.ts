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

export interface Consultation {
  kind: string;
  checker: IdentityAssertion;
  at: string;
  payloadDigest: Digest;
  verdict: 'pass' | 'fail';
  proofRef?: string;
}

export type RecordState =
  | 'open'
  | 'confirmed'
  | 'refused'
  | 'expired'
  | 'redeeming'
  | 'redeemed'
  | 'redemption-failed'; // last three: effect-seam states (SPEC §2), not produced in this build

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
// this build's kernel emits only: opened, consultation-recorded, confirmed, refused, expired

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
  actor?: IdentityAssertion;
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
