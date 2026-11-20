// @vidimera/record — kernel/intake.ts: argument-depth guards shared by the seams and the
// reads. Each throws a named caller error with the caller's head, and each runs before any
// store read, lock or append, so a malformed call leaves no trace and meets the same answer
// on every backing. An empty or unknown string is NOT a malformed id: it keeps the seam's
// existing answer (null, an empty chain, or its domain outcome). Only a non-string throws.

import { isDigestForm } from '../canonical.js';
import type { IdentityAssertion } from '../types.js';
import { isWellFormedUtf16 } from '../utf16.js';
import { identitySnapshot } from './identity.js';

/** An id argument (`recordId`, `stagedRef`) must be a string. */
export function assertIdArg(seam: string, name: string, value: unknown): void {
  if (typeof value !== 'string') {
    throw new Error(`${seam}: ${name} must be a string`);
  }
}

/** An options bag is an absent argument, an explicit `undefined`, or an object. `null` is
 * not "absent": treating it as absent would hide a host bug. An array is not an options bag
 * either: `[]` would otherwise pass silently and a non-empty one would meet a misleading
 * "unknown option key '0'". */
export function assertOptionsBag(seam: string, opts: unknown): void {
  if (opts !== undefined && (typeof opts !== 'object' || opts === null || Array.isArray(opts))) {
    throw new Error(`${seam}: options must be an object when supplied`);
  }
}

/**
 * A host digest field must have SPEC §7's form (`isDigestForm`). `head` is the caller's own
 * message head, kept as the site already words it; the tail says what form is required. The
 * caller has already handled the absent / non-string / empty cases with its existing messages.
 */
export function assertDigestForm(head: string, value: unknown): void {
  if (!isDigestForm(value)) {
    throw new Error(
      `${head} is not in digest form — it must be <algorithm>:<even-length lowercase hex>, ` +
        'the form every digest field takes (SPEC §7); a caller error',
    );
  }
}

/**
 * An operator-supplied string the seam will record must be well-formed UTF-16. A lone
 * surrogate would be recorded as host attestation yet could not be digested or round-tripped
 * through the canonical form faithfully. Only a string is judged; every other shape keeps the
 * seam's existing answer. Write path only: a persisted string re-read through
 * `identitySnapshot` or a replay is never re-judged.
 */
export function assertWellFormedString(seam: string, field: string, value: unknown): void {
  if (typeof value === 'string' && !isWellFormedUtf16(value)) {
    throw new Error(
      `${seam}: ${field} holds a lone surrogate — an operator string must be well-formed ` +
        'UTF-16 to be recorded; a caller error',
    );
  }
}

/**
 * The intake half of the acting-identity check: validates `identity` ONCE through
 * `identitySnapshot` (so a getter is read once, and the caller keeps this literal rather than
 * re-reading the object), throws when a string it carries is not well-formed, and otherwise
 * returns the snapshot, or `null` when the identity is invalid for any OTHER reason — each
 * seam keeps its own posture toward that (a refusal, or its own throw). `identitySnapshot`
 * itself is unchanged: finalize's separation-of-duties read of persisted prior actors goes
 * through it, and the read path must not start judging what was recorded.
 */
export function intakeIdentity(
  seam: string,
  field: string,
  identity: IdentityAssertion,
): IdentityAssertion | null {
  const snapshot = identitySnapshot(identity);
  if (snapshot !== null) assertIdentityStrings(seam, field, snapshot);
  return snapshot;
}

/** The three identity strings of an already-validated snapshot, each named under `field`. */
export function assertIdentityStrings(
  seam: string,
  field: string,
  snapshot: IdentityAssertion,
): void {
  assertWellFormedString(seam, `${field}.principal`, snapshot.principal);
  assertWellFormedString(seam, `${field}.authority`, snapshot.authority);
  assertWellFormedString(seam, `${field}.proofRef`, snapshot.proofRef);
}

/**
 * The same check for `facts.checker`, the identity the facts consultation records. A missing or
 * invalid facts payload or checker is the facts gate's own answer (`consultation-missing`), so
 * only a well-formed-shape checker carrying a lone surrogate throws here.
 */
export function assertFactsCheckerStrings(seam: string, facts: unknown): void {
  if (facts === null || typeof facts !== 'object') return;
  const snapshot = identitySnapshot((facts as { checker?: unknown }).checker as IdentityAssertion);
  if (snapshot !== null) assertIdentityStrings(seam, 'facts.checker', snapshot);
}
