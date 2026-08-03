// @vidimera/record — id.ts (design §2/§9 "recordId minting"): `recordId` minting at
// `open()` and the content-derived idempotent `stagedRef` derivation used by
// `stage()`. Deliberately has NO dependency on config.ts/create.ts — a leaf module.

import { randomUUID } from 'node:crypto';
import { canonicalize, digest } from './canonical.js';
import type { Digest } from './types.js';

/**
 * Mints a fresh `recordId` at `open()` (design §2/§9 "recordId minting"): an OPAQUE,
 * host-minted identifier — unlike `stagedRef`, it is NOT content-derived, so two
 * `open()` calls (even against the identical staged draft, e.g. the OQ2-8a
 * expire-then-retry path) mint DISTINCT recordIds.
 *
 * Format choice (the design leaves the exact internal format open — "opaque
 * host-scheme id"): a bare RFC 4122 v4 UUID via `node:crypto.randomUUID()`. Reasons:
 * `node:crypto` is already the project's runtime baseline (Node >= 24, no new
 * dependency); collision probability is cryptographically negligible; and a bare UUID
 * embeds cleanly into any host-side scheme (URL segment, DB primary key, log
 * correlation id) without the host having to strip a library-imposed prefix. The
 * design's "host-scheme" wording is read as "assigned by the host process" (in
 * contrast to `stagedRef`, which is content-derived), not as a literal URI-scheme
 * string the id itself must carry — genesis's own `"vidimera:genesis:<recordId>"`
 * (design §4/§5) already supplies that framing at the one call site that needs it.
 */
export function mintRecordId(): string {
  return randomUUID();
}

/**
 * Content-derived, idempotent `stagedRef` (design §2 "id.ts" / §9 "recordId minting":
 * "stagedRef stays content-derived"; task-3 brief: "same content+profile+subject+leg ⇒
 * same ref"). Takes the ALREADY-BOUND `contentDigest` (design §5 "Content binding":
 * `contentDigest = digest(canonicalize(adopterCanonicalizer(content)))`, computed by
 * `stage()`) rather than raw `content` again — `id.ts` has no adopter canonicalizer to
 * apply, and re-hashing raw content here would either bypass the adopter transform
 * (wrong: library JCS must never see raw domain content directly, design §9 "M2") or
 * duplicate work `stage()` already did. Combining `contentDigest` with `profileId` +
 * `subjectRef` + `legId` under one more digest (library JCS over a small, always-
 * JSON-safe four-field object — no BigInt risk) makes `stagedRef` collision-resistant
 * across DIFFERENT (profile, subject, leg) triples that happen to stage identical
 * content, while staying idempotent for repeated staging of the identical quadruple —
 * `Store.putStaged` is idempotent by `staged.id` (design §4), which is this value.
 *
 * `legId` (design §2/§9 "deriveStagedRef folds the leg id"): without it, two DIFFERENT
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
