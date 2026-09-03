// @vidimera/record — kernel/held-profile.ts: the one profile-resolution rule every seam that
// touches a persisted record applies (the profile-drift gate increment, 2026-09-03). An
// instance HOLDS a record's profile only when the record's `profileId` is registered here AND
// the registered profile's data-only projection digests to the record's genesis
// `profileDigest` (SPEC §4) — the same digest `open()` bound. Anything else is a profile this
// instance does not hold: the operator seams refuse `unknown-profile` (SPEC §8's second
// producer of that code), the two cross-record verifications fold the miss into their own
// claim refusals, and `open()`'s exclusivity path leaves a due blocker it does not hold
// standing. The comparison is a string compare against a digest computed once per profile at
// `create()` — no digesting per call, and `open()` binds the same cached value.

import type { ResolvedProfile } from '../create.js';
import type { Digest } from '../types.js';

/** What a replayed record (or a genesis payload) exposes for the comparison. */
export interface ProfileBinding {
  profileId: string;
  profileDigest: Digest;
}

export function heldProfile(
  profiles: ReadonlyMap<string, ResolvedProfile>,
  bound: ProfileBinding,
): ResolvedProfile | undefined {
  const resolved = profiles.get(bound.profileId);
  if (resolved === undefined) return undefined;
  return resolved.profileDigest === bound.profileDigest ? resolved : undefined;
}
