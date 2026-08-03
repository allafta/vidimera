// @vidimera/record — profile-digest.ts (design §2 "profile-digest.ts" / §5 "opened
// snapshot" / §9 O4): the DATA-ONLY profile projection and its `profileDigest`. The
// `opened` transition (Task 7) records `profileDigest` in its payload so a slice-4
// comparison can detect a profile that drifted out from under an open record. At THIS
// task the helper + its properties are what ship; there is NO slice-3 detector (O4).

import { canonicalize, digest } from './canonical.js';
import type { ConfirmProfile } from './config.js';
import type { Digest } from './types.js';

/**
 * Recursively strips function-valued members from a value, yielding a data-only clone
 * (design §5: "the data-only profile projection ... injected function members excluded").
 * Profiles are data (design §9 O4: "profiles are data"), so the projection is the whole
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
 * The data-only projection of a profile (design §5 "opened snapshot"). Exposed alongside
 * `profileDigest` so a caller (or a future slice-4 comparison) can inspect exactly what
 * was digested, not just its hash.
 */
export function projectProfile(profile: ConfirmProfile): unknown {
  return dataOnly(profile);
}

/**
 * `profileDigest = digest(canonicalize(projectProfile(profile)))` (design §5 "opened
 * snapshot"). Stable under key reordering (library JCS sorts keys) and blind to function
 * members (stripped by the projection), but sensitive to every declarative field. It runs
 * NO validation — it digests a profile's data regardless of whether `create()` would
 * accept it (validation is `config.ts`/`create.ts`'s concern; the digest is pure data).
 */
export function profileDigest(profile: ConfirmProfile): Digest {
  return digest(canonicalize(projectProfile(profile)));
}
