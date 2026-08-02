// @vidimera/record — kernel/stage.ts (design §3 AgentSurface.stage / §5 "Content binding"
// / §9 "stage() args" / "recordId minting"): the agent-reachable, PRE-RECORD staged-draft
// write. `stage(content, profileId, subjectRef)`:
//   1. resolve + validate the profile — an unconfigured `profileId` fails CLOSED with
//      `refused('unknown-profile')`: NO staged draft, NO append, NO record (the only
//      slice-3 producer of `unknown-profile` on the agent surface);
//   2. derive the leg INTERNALLY — single-leg (config guards `legs.length !== 1` at
//      construction), so `legId` is simply the one leg's id (no caller-named leg exists at
//      slice 3, hence `unknown-leg` has no producer here);
//   3. bind the content: `contentDigest = digest(canonicalize(adopterCanonicalizer(content)))`
//      — the adopter canonicalizer projects domain content to a JSON-safe structure, then
//      library JCS + digest; content itself is NEVER persisted, only its digest;
//   4. derive the content-derived, idempotent `stagedRef` (id.ts `deriveStagedRef`) and
//      write the digest-only draft via the idempotent `putStaged`.
// It APPENDS NOTHING and creates NO record — `open()` (kernel/open.ts) is what mints the
// record and appends the genesis `opened` transition.

import type { KernelContext } from '../create.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import { canonicalize, digest } from '../canonical.js';
import { deriveStagedRef } from '../id.js';

export async function stage(
  ctx: KernelContext,
  content: unknown,
  profileId: string,
  subjectRef: string,
): Promise<Outcome<{ stagedRef: string }>> {
  const resolved = ctx.profiles.get(profileId);
  if (resolved === undefined) {
    // Fail-closed: an unconfigured profile yields NOTHING — no leg to derive, no draft to
    // write, no record. (No transitionRef — `unknown-profile` never appends.)
    return refused('unknown-profile');
  }

  const { profile, canonicalizer } = resolved;
  // Single-leg by construction (config.ts rejects `legs.length !== 1`): the one leg IS the
  // leg. legId is derived internally — no public slice-3 call names a leg.
  const firstLeg = profile.legs[0];
  if (firstLeg === undefined) {
    throw new Error(`stage: profile '${profileId}' has no legs`);
  }
  const legId = firstLeg.id;

  // Content binding (design §5): adopter canonicalizer -> library JCS -> digest. The digest
  // is all that is persisted; the raw content never crosses into the Store.
  const contentDigest = digest(canonicalize(canonicalizer(content)));

  // Content-derived + idempotent (same content+profile+subject -> same ref); putStaged is
  // idempotent by this id (design §4).
  const stagedRef = deriveStagedRef(contentDigest, profileId, subjectRef);
  await ctx.store.putStaged({ id: stagedRef, profileId, legId, subjectRef, contentDigest });

  return ok({ stagedRef });
}
