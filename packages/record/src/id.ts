// @vidimera/record — id.ts: `recordId` minting at
// `open()` and the content-derived idempotent `stagedRef` derivation used by
// `stage()`. Deliberately has NO dependency on config.ts/create.ts — a leaf module.

import { randomUUID } from 'node:crypto';
import { canonicalize, digest } from './canonical.js';
import type { Digest } from './types.js';

/**
 * Mints a fresh `recordId` at `open()`: an OPAQUE,
 * host-minted identifier — unlike `stagedRef`, it is NOT content-derived, so two
 * `open()` calls (even against the identical staged draft, including the exclusivity
 * expire-then-retry path) mint DISTINCT recordIds.
 *
 * Format choice (SPEC §2 names it only a "Host-scheme identifier", leaving the exact
 * internal format open): a bare RFC 4122 v4 UUID via `node:crypto.randomUUID()`. Reasons:
 * `node:crypto` is already the project's runtime baseline (Node >= 24, no new
 * dependency); collision probability is cryptographically negligible; and a bare UUID
 * embeds cleanly into any host-side scheme (URL segment, DB primary key, log
 * correlation id) without the host having to strip a library-imposed prefix. The
 * "host-scheme" wording is read as "assigned by the host process" (in
 * contrast to `stagedRef`, which is content-derived), not as a literal URI-scheme
 * string the id itself must carry — genesis's own `"vidimera:genesis:<recordId>"`
 * (SPEC §4) already supplies that framing at the one call site that needs it.
 */
export function mintRecordId(): string {
  return randomUUID();
}

/**
 * Content-derived, idempotent `stagedRef` (SPEC §12: "a staged reference is
 * content-derived (§3)"; same content+profile+subject+leg ⇒ same ref). Takes the
 * ALREADY-BOUND `contentDigest` (SPEC §3's content binding:
 * `contentDigest = digest(canonical(content))`, computed by
 * `stage()`) rather than raw `content` again — `id.ts` has no adopter canonicalizer to
 * apply, and re-hashing raw content here would either bypass the adopter transform
 * (wrong: library JCS must never see raw domain content directly) or
 * duplicate work `stage()` already did. Combining `contentDigest` with `profileId` +
 * `subjectRef` + `legId` under one more digest (library JCS over a small, always-
 * JSON-safe four-field object — no BigInt risk) makes `stagedRef` collision-resistant
 * across DIFFERENT (profile, subject, leg) triples that happen to stage identical
 * content, while staying idempotent for repeated staging of the identical quadruple —
 * `Store.putStaged` is idempotent by `staged.id` (SPEC §12), which is this value.
 *
 * `legId` (folds the leg id into the ref): without it, two DIFFERENT
 * legs staging identical content on the identical subject would collide to ONE draft
 * (first-write-wins, silently aliasing the two legs' drafts). Folding it in makes
 * leg-distinctness genuine: `stage()` always supplies a resolved legId (never
 * `undefined`) — an omitted-legId call site resolves to `profile.legs[0].id` before this
 * function is ever called.
 */
export function deriveStagedRef(
  contentDigest: Digest,
  profileId: string,
  subjectRef: string,
  legId: string,
): Digest {
  return digest(canonicalize({ contentDigest, profileId, subjectRef, legId }));
}
