// @vidimera/record — canonicalize()/digest(): RFC-8785 JCS canonicalization via the
// library-owned serializer in `./jcs.js`, the digest primitive over `node:crypto`,
// and canonicalizer-registry resolution (consumed by config.ts/create.ts).

import { createHash } from 'node:crypto';

import { serializeJcs } from './jcs.js';

import type { Digest } from './types.js';

/** One encoder for the module — `TextEncoder` is stateless, and a per-call allocation bought
 * nothing (the review-hardening pass, 2026-09-05). */
const UTF8 = new TextEncoder();

/**
 * Adopter-supplied, pre-JCS content transform, keyed by `profile.subject.canonicalizerRef`
 * (SPEC §3): projects domain content into a plain JSON-compatible structure BEFORE
 * library JCS canonicalization. MUST NOT emit BigInt
 * (JCS-unsupported — `serializeJcs` (`./jcs.js`) throws on any BigInt it receives).
 * MUST be TOTAL over the content a seam will hand it: this is the host's registered CODE,
 * not caller data, so a throw at finalize, decline or a redemption seam propagates as a
 * configuration fault — nothing appended, no refusal minted, never read as `content-drift`
 * (the review-hardening pass, 2026-09-05; pinned in canonicalizer-totality.test.ts). The
 * facts side is the deliberate contrast: `facts.figures` are caller DATA, so a canonicalization
 * failure there is a present-but-unusable payload and refuses `consultation-missing`.
 */
export type Canonicalizer = (content: unknown) => unknown;

/**
 * Digest algorithms `digest()` will accept when MINTING a new digest
 * (SPEC §7 "Digest identifiers & agility") — this build records under exactly one
 * algorithm; the union type leaves room for a future addition without widening
 * today's runtime behavior.
 */
export const SUPPORTED_ALGORITHMS = ['sha256'] as const;
export type DigestAlgorithm = (typeof SUPPORTED_ALGORITHMS)[number];

function isSupportedAlgorithm(alg: string): alg is DigestAlgorithm {
  return (SUPPORTED_ALGORITHMS as readonly string[]).includes(alg);
}

/**
 * Algorithms still RESOLVABLE (via `algorithmOf`, for re-verifying an existing
 * recorded digest) but no longer used to MINT new ones — the deprecation-warning
 * surface SPEC §7 calls for. Empty in this build: `sha256` is the only algorithm
 * that has ever existed, so nothing is deprecated yet. A future algorithm addition
 * retires an old one by moving it here (and out of the "preferred" set `digest()`
 * defaults to) rather than deleting it outright, so `algorithmOf()` on an
 * already-recorded old digest keeps resolving instead of throwing.
 */
export const DEPRECATED_ALGORITHMS: ReadonlySet<DigestAlgorithm> = new Set<DigestAlgorithm>([]);

/**
 * Library-owned RFC-8785 JSON Canonicalization Scheme (JCS) canonicalizer: serializes
 * `structure` to canonical JSON text via `serializeJcs` (`./jcs.js`), then UTF-8-encodes
 * the text to bytes.
 *  (a) Every input with no JCS representation throws inside `serializeJcs` itself
 *      (see `./jcs.js`) — `canonicalize()` has no `undefined` case of its own to
 *      guard against; a caller either gets bytes back or the call throws, and
 *  (b) `serializeJcs` delegates primitive (number/string) serialization to
 *      `JSON.stringify`, which already implements the ECMAScript `Number::toString`
 *      algorithm and the JSON string-escaping rules RFC 8785 itself specifies — so the
 *      only genuinely JCS-specific behavior it adds on top is recursive lexicographic
 *      (UTF-16 code unit) object-key sorting.
 * The returned JCS text is UTF-8-encoded to bytes: JCS is a byte-exact encoding (two
 * independent implementations must produce identical bytes to verify each other's
 * chains), and `digest()` hashes bytes, never JS string code units directly.
 */
export function canonicalize(structure: unknown): Uint8Array {
  // The `undefined` guard is gone because serializeJcs returns `string` and every
  // unrepresentable input throws at the point of the value. TypeScript will NOT
  // catch a regression here — TextEncoder.encode is typed `encode(input?: string)`,
  // so a widened return type compiles clean. If serializeJcs ever returns
  // `string | undefined`, the guard comes back in the same commit.
  return UTF8.encode(serializeJcs(structure));
}

/**
 * `digest()`: hashes `input`
 * (raw bytes, or a string UTF-8-encoded first) under `algorithm` (default `sha256`,
 * the only MINTING algorithm this build supports) via `node:crypto`, returning
 * `"<alg>:<lowercase-hex>"`. An `algorithm` outside `SUPPORTED_ALGORITHMS` THROWS
 * rather than silently deferring to `node:crypto`'s own much larger algorithm list —
 * digest agility (SPEC §7) means the library controls which algorithms are recordable, not
 * every algorithm the underlying runtime happens to support.
 */
export function digest(input: Uint8Array | string, algorithm: DigestAlgorithm = 'sha256'): Digest {
  if (!isSupportedAlgorithm(algorithm)) {
    throw new Error(
      `digest: unsupported algorithm '${algorithm}' (supported: ${SUPPORTED_ALGORITHMS.join(', ')})`,
    );
  }
  const bytes = typeof input === 'string' ? UTF8.encode(input) : input;
  const hex = createHash(algorithm).update(bytes).digest('hex');
  return `${algorithm}:${hex.toLowerCase()}`;
}

/**
 * Splits a recorded `Digest` (`"<alg>:<hex>"`) back into its algorithm, so a
 * re-verify (chain-verify, content-drift re-check) hashes under the
 * digest's OWN recorded algorithm rather than a hardcoded one — SPEC §7: "A record is
 * verified under its own recorded algorithm". Throws on a malformed digest (no
 * `:` separator) or an algorithm outside `SUPPORTED_ALGORITHMS ∪ DEPRECATED_ALGORITHMS`.
 * Emits a runtime deprecation warning (does not throw) when the resolved algorithm is
 * in `DEPRECATED_ALGORITHMS` — the deprecation-warning surface; currently unreachable
 * since that set is empty in this build.
 */
export function algorithmOf(recorded: Digest): DigestAlgorithm {
  const sep = recorded.indexOf(':');
  if (sep <= 0) {
    throw new Error(`algorithmOf: malformed digest '${recorded}' (expected "<alg>:<hex>")`);
  }
  const alg = recorded.slice(0, sep);
  const recognized = isSupportedAlgorithm(alg) || DEPRECATED_ALGORITHMS.has(alg as DigestAlgorithm);
  if (!recognized) {
    throw new Error(`algorithmOf: unrecognized digest algorithm '${alg}' in '${recorded}'`);
  }
  const resolved = alg as DigestAlgorithm;
  if (DEPRECATED_ALGORITHMS.has(resolved)) {
    process.emitWarning(`digest algorithm '${resolved}' is deprecated`, 'DeprecationWarning');
  }
  return resolved;
}

/**
 * Canonicalizer-registry resolution, keyed by `profile.subject.canonicalizerRef`
 * (SPEC §3): fails CLOSED — throws when `ref` is absent
 * from `registry`, rather than returning `undefined` and letting a missing
 * canonicalizer surface later as a confusing runtime error deep inside
 * `stage()`/`finalize()`. Consumed by `config.ts`/`create.ts` at
 * construction time — construction is loud (SPEC §9.1): every
 * `profile.subject.canonicalizerRef` must resolve, or `create()` throws.
 */
export function resolveCanonicalizer(
  registry: Record<string, Canonicalizer>,
  ref: string,
): Canonicalizer {
  // `Object.hasOwn` is load-bearing, not a style choice: `registry[ref]` alone walks
  // the prototype chain, so a ref naming an inherited Object.prototype member (e.g.
  // "toString", "constructor", "valueOf", "hasOwnProperty") would resolve to that
  // inherited function instead of throwing — silently handing back a canonicalizer
  // that produces every content digest. The `=== undefined` check below is still
  // required alongside it, only to satisfy noUncheckedIndexedAccess's typing of the
  // indexed read; it is not on its own a sufficient fail-closed guard.
  const c = Object.hasOwn(registry, ref) ? registry[ref] : undefined;
  if (c === undefined) {
    throw new Error(`resolveCanonicalizer: unresolved canonicalizerRef '${ref}'`);
  }
  // A registry entry that is not a function (a `null`, a string, an object) would construct
  // and then fail at the first `stage()`, deep inside the kernel; construction is loud, so it
  // is refused here, with the same head as a missing entry.
  if (typeof c !== 'function') {
    throw new Error(
      `resolveCanonicalizer: unresolved canonicalizerRef '${ref}' — the registry entry is not a function ` +
        `(found ${c === null ? 'null' : Array.isArray(c) ? 'an array' : typeof c}); a canonicalizer is a function (SPEC §3)`,
    );
  }
  return c;
}
