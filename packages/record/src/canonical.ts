// @vidimera/record — canonicalize()/digest(): RFC-8785 JCS canonicalization via the
// library-owned serializer in `./jcs.js`, the digest primitive over `node:crypto`,
// and canonicalizer-registry resolution (consumed by config.ts/create.ts).

import { createHash } from 'node:crypto';
import { types } from 'node:util';

import { serializeJcs } from './jcs.js';
import type { Digest } from './types.js';
import { isWellFormedUtf16 } from './utf16.js';

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

/** How `bindContent` serializes the canonicalizer's output. Internal. */
export interface BindContentOptions {
  /**
   * True only where content ENTERS the library (`stage()`): the output must be well-formed
   * UTF-16, so every new binding is one the escaping default reproduces injectively. False at
   * every re-bind seam (finalize, decline, redeem, beginRedemption, completeRedemption): they
   * only COMPARE against a recorded digest, so a record bound by an older build from content
   * holding a lone surrogate re-binds exactly as before, and an ill-formed value introduced
   * after staging is recorded as `content-drift` instead of an unrecorded throw.
   */
  wellFormed: boolean;
}

/**
 * Content binding (SPEC §3), the one path every seam uses: runs the adopter canonicalizer over
 * `content`, serializes its output as library JCS (strictly well-formed only when
 * `options.wellFormed` is true — see `BindContentOptions`), and digests the bytes. A
 * canonicalizer is SYNCHRONOUS, so an output with a callable `then` is refused. When it is a
 * native promise a rejection handler is attached first, so a later rejection is observed instead
 * of ending the process as an unhandled rejection; any other thenable is refused WITHOUT calling
 * its `then`, so a lazy thenable is never run. The limit: only a native promise's rejection is
 * observed here — a non-native thenable that fails on its own (eagerly) stays the host's, and so
 * does a promise nested deeper (`serializeJcs` refuses it). Any throw propagates: it is a
 * configuration fault, never read as content drift; a serializer refusal is wrapped to name the
 * canonicalizer, with the original as `cause`. Internal: not exported from the package index.
 */
export function bindContent(
  canonicalizer: Canonicalizer,
  canonicalizerRef: string,
  content: unknown,
  options: BindContentOptions,
): Digest {
  const out = canonicalizer(content);
  if ((typeof out === 'object' && out !== null) || typeof out === 'function') {
    const then = (out as { then?: unknown }).then;
    if (typeof then === 'function') {
      if (types.isPromise(out)) {
        try {
          Promise.prototype.then.call(out, undefined, () => {});
        } catch {
          // an exotic promise whose adoption throws: the refusal below still stands
        }
      }
      throw new TypeError(
        `canonicalizer for '${canonicalizerRef}' returned a thenable — a canonicalizer is synchronous; return the projected content, not a promise`,
      );
    }
  }
  let text: string;
  try {
    text = serializeJcs(out, { wellFormed: options.wellFormed });
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new TypeError(
      `canonicalizer for '${canonicalizerRef}' returned output that cannot be serialized — ${reason}`,
      {
        cause,
      },
    );
  }
  return digest(UTF8.encode(text));
}

/**
 * `digest()`: hashes `input`
 * (raw bytes, or a string UTF-8-encoded first) under `algorithm` (default `sha256`,
 * the only MINTING algorithm this build supports) via `node:crypto`, returning
 * `"<alg>:<lowercase-hex>"`. An `algorithm` outside `SUPPORTED_ALGORITHMS` THROWS
 * rather than silently deferring to `node:crypto`'s own much larger algorithm list —
 * digest agility (SPEC §7) means the library controls which algorithms are recordable, not
 * every algorithm the underlying runtime happens to support. A string with a lone surrogate
 * THROWS too: UTF-8 encoding would collapse each one to U+FFFD, so two different strings would
 * share a digest. (Bytes are hashed as given.)
 */
export function digest(input: Uint8Array | string, algorithm: DigestAlgorithm = 'sha256'): Digest {
  if (!isSupportedAlgorithm(algorithm)) {
    throw new Error(
      `digest: unsupported algorithm '${algorithm}' (supported: ${SUPPORTED_ALGORITHMS.join(', ')})`,
    );
  }
  if (typeof input === 'string' && !isWellFormedUtf16(input)) {
    throw new TypeError(
      'digest: the string holds a lone surrogate — it is not well-formed UTF-16, and UTF-8 encoding would collapse it',
    );
  }
  const bytes = typeof input === 'string' ? UTF8.encode(input) : input;
  const hex = createHash(algorithm).update(bytes).digest('hex');
  return `${algorithm}:${hex.toLowerCase()}`;
}

const DIGEST_FORM = /^[a-z][a-z0-9-]*:(?:[0-9a-f]{2})+$/;

/**
 * True when `value` has the form SPEC §7 fixes for every digest field: an algorithm name of
 * lowercase letters, digits or hyphens starting with a letter, a colon, then a non-empty,
 * even-length run of lowercase hex. The algorithm name is not checked against a list: a host
 * digests its own evidence under its own algorithm and the library never re-verifies that
 * digest, so only the FORM is required. A form-valid string is still the host's claim — nothing
 * here checks that it digests anything. Internal: not exported from the package index.
 */
export function isDigestForm(value: unknown): boolean {
  return typeof value === 'string' && DIGEST_FORM.test(value);
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
  // is refused here, with the same head as a missing entry. The type description below
  // repeats `config.ts`'s `found()` on purpose: this module is the lower layer (config.ts
  // takes its `Canonicalizer` type from here), so it does not import back up.
  if (typeof c !== 'function') {
    throw new Error(
      `resolveCanonicalizer: unresolved canonicalizerRef '${ref}' — the registry entry is not a function ` +
        `(found ${c === null ? 'null' : Array.isArray(c) ? 'an array' : `a ${typeof c}`}); a canonicalizer is a function (SPEC §3)`,
    );
  }
  return c;
}
