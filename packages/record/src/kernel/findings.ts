// @vidimera/record — kernel/findings.ts: SPEC §10.2's counting-ack predicate and the
// per-finding coverage derivation (the first step-7 increment, the READ half). Both
// functions are PURE reads over an already-folded `RecordedFinding[]` — no Store, no I/O —
// consumed by `kernel/review.ts`'s projection AND, as of the second step-7 increment, by
// finalize's rung (5.7) (`ack-missing` / `ack-stale`) — the same commit that lands the
// seams (`raiseFinding`/`acknowledge`, `kernel/findings-seams.ts`) that mint the
// transitions `chain/replay.ts` folds into the `RecordedFinding[]` these functions read.
//
// "Whether an ack counts is decided only at finalize" (SPEC §10.2) — and now, as of the
// second step-7 increment, it genuinely is: the COUNTING PREDICATE had no seam dependency
// even before that (it landed here, exercised only by hand-built chains), and the write
// half that makes the finalize half of that sentence real has since arrived.

import type { LegSpec } from '../config.js';
import type { IdentityAssertion, RecordedAck, RecordedFinding } from '../types.js';
import { identitySnapshot } from './finalize.js';

/** The three ack modes SPEC §10.2 declares, relative to a finding's raiser. */
export type AckMode = NonNullable<LegSpec['ackMode']>;

/** SPEC §10.2's four coverage outcomes, one per finding, never a whole-record verdict —
 * `'not-required'` covers both "the kind isn't in `requiredAcks`" and "no flow declared". */
export type FindingCoverage = 'covered' | 'ack-missing' | 'ack-stale' | 'not-required';

function isNonEmptyString(value: string): boolean {
  return value.length > 0;
}

/**
 * The principal of a recorded `raiser`/`acker`, read through `identitySnapshot`. A recorded
 * identity that is not a valid one (a `{}` written before the seams recorded validated
 * literals) has no principal to compare: a garbled or foreign chain is a storage/config fault,
 * not a domain outcome (SPEC §8), so it throws instead of reading a property of it.
 */
function recordedPrincipal(
  finding: RecordedFinding,
  field: 'raiser' | 'acker',
  recorded: IdentityAssertion,
): string {
  const snapshot = identitySnapshot(recorded);
  if (snapshot === null) {
    // An EMPTY-string principal on an otherwise object-shaped identity keeps its older,
    // narrower meaning — "missing principal fails closed" (the caller's `isNonEmptyString`
    // check returns `false`, never a throw) — so it is handed back as-is.
    if (typeof recorded === 'object' && recorded !== null && recorded.principal === '') return '';
    throw new Error(
      `ackCounts: finding '${finding.findingId}' carries a recorded ${field} that is not a valid identity — a garbled or foreign chain is a storage/config fault, not a domain outcome (SPEC §8)`,
    );
  }
  return snapshot.principal;
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

  const raiserPrincipal = recordedPrincipal(finding, 'raiser', finding.raiser);
  const ackerPrincipal = recordedPrincipal(finding, 'acker', ack.acker);
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
 * `ackMode` is consulted only when a finding's kind IS required. SPEC §10.2's own
 * both-or-neither construction rule (`ackMode` + `requiredAcks` "both-or-neither; either
 * alone is a construction error") IS ENFORCED at construction as of the second step-7
 * increment (`config.ts`'s `validateFindingsFlow`, the settled `validateSodShape` class),
 * so no profile this build can construct ever declares one without the other, or either at
 * all. `ackMode` is typed optional here for two reachable states, not one, even so: a
 * caller (the review projection) reading an UNRESOLVABLE leg, where `requiredAcks` is
 * undefined too and every finding classifies `'not-required'` before `ackMode` would ever
 * be consulted; and a direct call to this exported pure function — not gated by profile
 * construction — supplying a required kind with no `ackMode`, the half-declared state
 * `validateFindingsFlow` makes unreachable for a real profile but that this exported
 * function, callable directly, must still handle. See the fail-closed handling of that
 * second state below.
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
    if (ackMode === undefined) {
      // The fail-closed reading of a half-declared state (see the function's own doc
      // comment above): a required kind with no declared `ackMode` — reachable today only
      // via a direct call, since no profile this build can construct declares one of
      // `ackMode`/`requiredAcks` without the other (`config.ts`'s `validateFindingsFlow`,
      // real as of the second step-7 increment, makes the pair unreachable for a real
      // profile). This branch STAYS as defense-in-depth for the direct-call caller
      // `findingCoverage` itself admits: no ack counts under it — the house precedent an
      // impossible state already sets elsewhere (finalize's paired-actor mismatch,
      // redeem's garbled `tokenDigest`), never the fail-open `'any'` a permissive fallback
      // would give it.
      return { finding, coverage: 'ack-stale' };
    }
    const counts = finding.acks.some((ack) => ackCounts(finding, ack, ackMode));
    return { finding, coverage: counts ? 'covered' : 'ack-stale' };
  });
}
