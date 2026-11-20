// @vidimera/record — kernel/stage.ts: the agent-reachable, PRE-RECORD staged-draft write
// (SPEC §9 `stage(content, profileId, subjectRef, legId?)`).
// `stage(content, profileId, subjectRef, legId?)`:
//   0. check `subjectRef` (subject-ref.ts's one rule: a non-empty, well-formed, NUL-free string of
//      at most 1,024 UTF-8 bytes) — a caller error that THROWS `stage: subjectRef …`, before
//      anything else, so no draft is written for a subject the backings would store differently;
//   1. resolve + validate the profile — an unconfigured `profileId` fails CLOSED with
//      `refused('unknown-profile')`: NO staged draft, NO append, NO record (the only
//      producer of `unknown-profile` on the agent surface);
//   2. resolve the leg — `legId` OMITTED derives `profile.legs[0].id` (single-leg call
//      sites stay byte-compatible); a legId the CALLER NAMES that is absent from the
//      resolved profile's legs fails CLOSED with `refused('unknown-leg')` — pre-record,
//      BEFORE any `putStaged` (the FIRST `unknown-leg` producer; SPEC §8);
//   3. bind the content: `contentDigest = bindContent(...)` (canonical.ts)
//      — the adopter canonicalizer projects domain content to a JSON-safe structure (it must
//      be synchronous), then strict library JCS + digest; content itself is NEVER persisted, only its digest;
//   4. derive the content-derived, idempotent `stagedRef` (id.ts `deriveStagedRef`, now
//      leg-folded) and write the digest-only draft via the idempotent `putStaged`.
// It APPENDS NOTHING and creates NO record — `open()` (kernel/open.ts) is what mints the
// record and appends the genesis `opened` transition.

import { bindContent } from '../canonical.js';
import type { KernelContext } from '../create.js';
import { deriveStagedRef } from '../id.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import { subjectRefProblem } from '../subject-ref.js';

export async function stage(
  ctx: KernelContext,
  content: unknown,
  profileId: string,
  subjectRef: string,
  legId?: string,
): Promise<Outcome<{ stagedRef: string }>> {
  // A caller error, not a domain refusal: SPEC §8 has no refusal code for it, and the agent
  // surface is the untrusted one, so the subject is checked before anything reads or writes.
  const subjectProblem = subjectRefProblem(subjectRef);
  if (subjectProblem !== undefined) {
    throw new Error(`stage: subjectRef ${subjectProblem}`);
  }

  const resolved = ctx.profiles.get(profileId);
  if (resolved === undefined) {
    // Fail-closed: an unconfigured profile yields NOTHING — no leg to derive, no draft to
    // write, no record. (No transitionRef — `unknown-profile` never appends.)
    return refused('unknown-profile');
  }

  const { profile, canonicalizer } = resolved;
  // Omitted legId -> the first leg (single-leg call sites stay byte-compatible). A
  // caller-named legId is resolved against the SAME profile.legs list. `validateProfile`
  // rejects zero-leg profiles at `create()` (config.ts), so `profile.legs[0]` always
  // exists at runtime; the guard below satisfies `noUncheckedIndexedAccess` typing, not a
  // reachable failure.
  const firstLeg = profile.legs[0];
  if (firstLeg === undefined) {
    throw new Error(`stage: profile '${profileId}' has no legs`);
  }
  const resolvedLegId = legId ?? firstLeg.id;
  const legExists = profile.legs.some((leg) => leg.id === resolvedLegId);
  if (!legExists) {
    // Fail-closed, PRE-RECORD (SPEC §9's `legId` bullet): a caller-named leg absent from
    // the profile refuses BEFORE any putStaged — no draft, no transitionRef (`unknown-leg`
    // never appends — SPEC §8's never-appends set). The FIRST of `unknown-leg`'s two
    // producers (SPEC §8).
    return refused('unknown-leg');
  }

  // Content binding (SPEC §3): adopter canonicalizer -> library JCS -> digest. The digest
  // is all that is persisted; the raw content never crosses into the Store.
  const contentDigest = bindContent(canonicalizer, profile.subject.canonicalizerRef, content);

  // Content-derived + idempotent (same content+profile+subject+leg -> same ref); putStaged
  // is idempotent by this id (SPEC §12). Leg-folded: two different legs staging identical
  // content+subject yield two DISTINCT stagedRefs, not one aliased draft.
  const stagedRef = deriveStagedRef(contentDigest, profileId, subjectRef, resolvedLegId);
  await ctx.store.putStaged({
    id: stagedRef,
    profileId,
    legId: resolvedLegId,
    subjectRef,
    contentDigest,
  });

  return ok({ stagedRef });
}
