// @vidimera/record — kernel/findings.ts: SPEC §10.2's counting-ack predicate and the
// per-finding coverage derivation (the first step-7 increment, the READ half). Both
// functions are PURE reads over an already-folded `RecordedFinding[]` — no Store, no I/O —
// consumed today by `kernel/review.ts`'s projection; the gate that consumes the same
// derivation at finalize (`ack-missing` / `ack-stale`, already-registered refusal codes)
// lands in the second step-7 increment, alongside the seams (`raiseFinding`/`acknowledge`)
// that mint the transitions `chain/replay.ts` folds into the `RecordedFinding[]` these
// functions read.
//
// "Whether an ack counts is decided only at finalize" (SPEC §10.2) — but the COUNTING
// PREDICATE itself has no seam dependency, so it lands here, now, exercised only by
// hand-built chains until the write half arrives.

import type { LegSpec } from '../config.js';
import type { RecordedAck, RecordedFinding } from '../types.js';

/** The three ack modes SPEC §10.2 declares, relative to a finding's raiser. */
export type AckMode = NonNullable<LegSpec['ackMode']>;

/** SPEC §10.2's four coverage outcomes, one per finding, never a whole-record verdict —
 * `'not-required'` covers both "the kind isn't in `requiredAcks`" and "no flow declared". */
export type FindingCoverage = 'covered' | 'ack-missing' | 'ack-stale' | 'not-required';

function isNonEmptyString(value: string): boolean {
  return value.length > 0;
}

/**
 * `ackCounts(finding, ack, ackMode)` (SPEC §10.2's coverage-gate sentence): "a counting ack
 * names the findingId, carries the finding's current findingDigest, matches magnitude
 * exactly (present-iff-present, both directions), and satisfies ackMode by principal-only
 * comparison against the raiser (missing principal fails closed)". `findingId` matching is
 * the CALLER's job (a finding's own `acks` list already holds only its own acks, by
 * `chain/replay.ts`'s fold) — this predicate checks the remaining three conditions:
 *
 *  1. digest: `ack.findingDigest === finding.findingDigest` — a stale-version ack never
 *     counts, regardless of everything else.
 *  2. magnitude: present-iff-present on BOTH sides, and exactly equal when both are
 *     present — a finding with a magnitude that the ack omits (or vice versa) never
 *     counts, matching "present-iff-present, both directions" precisely.
 *  3. ackMode, by PRINCIPAL-ONLY comparison against the raiser: `self` requires the same
 *     principal, `counterparty` requires a different one, `any` accepts either — but a
 *     missing (empty-string) principal on EITHER side fails closed unconditionally,
 *     including under `any`, before the mode is even consulted. Comparing by principal
 *     alone (ignoring `authority`) is deliberate: the raiser's principal under a different
 *     transport is still the raiser, the same fail-closed direction SPEC §10.1's SoD gate
 *     established for `notActorOf`, applied here in the counting direction instead of the
 *     refusing one.
 */
export function ackCounts(finding: RecordedFinding, ack: RecordedAck, ackMode: AckMode): boolean {
  if (ack.findingDigest !== finding.findingDigest) return false;
  if ((finding.magnitude !== undefined) !== (ack.magnitude !== undefined)) return false;
  if (finding.magnitude !== undefined && finding.magnitude !== ack.magnitude) return false;

  const raiserPrincipal = finding.raiser.principal;
  const ackerPrincipal = ack.acker.principal;
  if (!isNonEmptyString(raiserPrincipal) || !isNonEmptyString(ackerPrincipal)) return false;

  const samePrincipal = raiserPrincipal === ackerPrincipal;
  if (ackMode === 'self') return samePrincipal;
  if (ackMode === 'counterparty') return !samePrincipal;
  return true; // 'any' — the missing-principal fail-closed check above already ran
}

/** One finding's derived coverage, paired with the finding itself so a caller (the review
 * projection today; the finalize gate from the second step-7 increment) can report both
 * without a second lookup. */
export interface FindingCoverageRow {
  finding: RecordedFinding;
  coverage: FindingCoverage;
}

/**
 * `findingCoverage(findings, ackMode, requiredAcks)` (SPEC §10.2's coverage gate): maps
 * each finding, in the order given (first-raise order, since `chain/replay.ts` folds
 * `RecordedFinding[]` that way), to its derived coverage:
 *
 *  - the finding's `kind` is absent from `requiredAcks` (or `requiredAcks` itself is
 *    undefined — the undeclared-flow case) ⇒ `'not-required'`, SPEC §10.2's own vacuous-pass
 *    rule: "Zero raised findings of a required kind pass vacuously — `requiredAcks` gates
 *    *raised* findings; it does not require findings to exist" generalizes here to
 *    non-required KINDS too — nothing about them ever gates;
 *  - zero acks recorded ⇒ `'ack-missing'`;
 *  - one or more acks recorded, none of which `ackCounts` ⇒ `'ack-stale'`;
 *  - at least one counting ack ⇒ `'covered'`.
 *
 * `ackMode` is read only when a finding's kind IS required — SPEC §10.2's own
 * both-or-neither construction rule (`ackMode` + `requiredAcks` "both-or-neither; either
 * alone is a construction error") means a profile that reaches this branch always declared
 * both; `ackMode` is typed optional here only because a caller (the review projection) may
 * be reading an UNRESOLVABLE leg, where both are undefined together and every finding
 * classifies `'not-required'` before `ackMode` would ever be consulted.
 *
 * `findings === undefined` (a findings-free record) returns `[]` — there is nothing to
 * derive coverage over.
 */
export function findingCoverage(
  findings: RecordedFinding[] | undefined,
  ackMode: AckMode | undefined,
  requiredAcks: string[] | undefined,
): FindingCoverageRow[] {
  if (findings === undefined) return [];
  return findings.map((finding) => {
    if (!requiredAcks?.includes(finding.kind)) {
      return { finding, coverage: 'not-required' };
    }
    if (finding.acks.length === 0) {
      return { finding, coverage: 'ack-missing' };
    }
    // `requiredAcks?.includes(...)` being true means `requiredAcks` is declared, and
    // SPEC §10.2's both-or-neither rule means `ackMode` is declared alongside it — so this
    // branch is reached only when `ackMode` is genuinely present; the `?? 'any'` fallback
    // below exists only to keep the type honest against `AckMode | undefined`, never to
    // paper over a reachable undeclared-`ackMode` case.
    const mode = ackMode ?? 'any';
    const counts = finding.acks.some((ack) => ackCounts(finding, ack, mode));
    return { finding, coverage: counts ? 'covered' : 'ack-stale' };
  });
}
