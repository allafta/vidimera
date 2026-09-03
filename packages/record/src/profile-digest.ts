// @vidimera/record — profile-digest.ts: the DATA-ONLY profile projection and its
// `profileDigest` (SPEC §4 "`profileDigest`"). The `opened` transition records
// `profileDigest` in its payload so a later comparison can detect a profile that
// drifted out from under an open record. Since the security-findings pass (2026-09-03)
// `verifySignatures(recordId).genesisProfile` performs that comparison and reports it
// (matches / drifted / unresolvable, with the digests), and both helpers below are
// exported from the entry point so a host can make the same comparison offline over an
// archived chain. And since the profile-drift gate every seam that resolves a persisted
// record makes the comparison too (`kernel/held-profile.ts`, against a digest cached on the
// resolved profile at `create()`) and refuses `unknown-profile` when this instance does not
// hold the profile the record was opened under (SPEC §4, §8).

import { canonicalize, digest } from './canonical.js';
import type { ConfirmProfile } from './config.js';
import type { Digest } from './types.js';

/**
 * Recursively strips function-valued members from a value, yielding a data-only clone
 * (SPEC §4: "a data-only projection of the profile — its configured fields, excluding
 * any host code references"). The projection is the whole
 * profile MINUS any function member at any depth — this deterministically covers every
 * declarative field (it includes everything that is not a function) rather than an
 * allow-list that could silently omit a newly-added declarative field.
 *
 *  - objects: rebuilt from own enumerable string keys, DROPPING any function-valued key;
 *  - arrays: function elements dropped, remaining elements recursed;
 *  - primitives: returned as-is.
 * Key order is irrelevant — library JCS (`canonicalize`) lexicographically sorts keys, so
 * the projection need not itself normalize order. Explicit-`undefined` object properties
 * fold away under JCS exactly as they do under JSON.stringify, matching an omitted field.
 */
function dataOnly(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.filter((el) => typeof el !== 'function').map(dataOnly);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, member] of Object.entries(value)) {
      if (typeof member === 'function') continue;
      out[key] = dataOnly(member);
    }
    return out;
  }
  return value;
}

/**
 * The data-only projection of a profile (SPEC §4 "opened" snapshot). Exposed alongside
 * `profileDigest` so a caller (or a future drift comparison) can inspect exactly what
 * was digested, not just its hash.
 */
export function projectProfile(profile: ConfirmProfile): unknown {
  return dataOnly(profile);
}

/**
 * `profileDigest = digest(canonicalize(projectProfile(profile)))` (SPEC §4's "opened"
 * snapshot). Stable under key reordering (library JCS sorts keys) and blind to function
 * members (stripped by the projection), but sensitive to every declarative field. It runs
 * NO validation — it digests a profile's data regardless of whether `create()` would
 * accept it (validation is `config.ts`/`create.ts`'s concern; the digest is pure data).
 */
export function profileDigest(profile: ConfirmProfile): Digest {
  return digest(canonicalize(projectProfile(profile)));
}
