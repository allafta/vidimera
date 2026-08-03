// @vidimera/record — chain/encoding.ts: library-owned transition encoding — JCS over
// `{recordId, seq, at, kind, payload, prevHash}` (`seq` stringified; digest fields in
// their string forms), `transitionDigest` under the record's RECORDED algorithm (derived via
// `algorithmOf`, never a hardcoded 'sha256'), and the genesis rule
// `prevHash = digest(UTF-8 "vidimera:genesis:<recordId>")` (SPEC §4).
//
// Scope fence: this module offers ENCODING primitives only — how a
// caller computes a genesis prevHash, a transition's digest, and the canonical
// encoding bytes. It does NOT construct transitions (mint recordId, decide seq,
// assemble a payload) — that is kernel territory, which calls these
// three exports to build the transitions it appends.

import { algorithmOf, canonicalize, digest } from '../canonical.js';
import type { Digest, Transition } from '../types.js';

/**
 * The exact shape fed to library JCS for a transition digest (SPEC §4 "the digest
 * input, stated exactly"): the same
 * six `Transition` fields, EXCLUDING nothing and adding nothing, with `seq`
 * serialized AS A STRING. `recordId`/`at`/`kind`/`prevHash` are already strings;
 * `payload` is carried through verbatim (its own internal JCS canonicalization, if
 * any object structure, happens as part of encoding this outer object — JCS recurses).
 * `seq` is the one non-string `Transition` field among the six, and is stringified so
 * the protocol ENVELOPE (everything but `payload`) never depends on JSON's
 * ECMAScript-specific number-formatting rules — only `payload` content ever needs
 * that (and only if an adopter's own values require it).
 */
interface TransitionDigestInput {
  recordId: string;
  seq: string;
  at: string;
  kind: string;
  payload: unknown;
  prevHash: string;
}

function toDigestInput(transition: Transition): TransitionDigestInput {
  return {
    recordId: transition.recordId,
    seq: String(transition.seq),
    at: transition.at,
    kind: transition.kind,
    payload: transition.payload,
    prevHash: transition.prevHash,
  };
}

/**
 * Genesis rule (SPEC §4): `prevHash = digest(UTF-8 "vidimera:genesis:<recordId>")`
 * — a digest of the RAW UTF-8 bytes of that literal string, not a library-JCS digest
 * of some wrapper structure (there is no JCS involved here at all; `digest()` accepts
 * a plain string and UTF-8-encodes it itself). Computed under `digest()`'s default
 * algorithm (`sha256`, the only algorithm this build supports) — genesis is what ESTABLISHES the
 * algorithm a record's whole chain is recorded under; every subsequent
 * `transitionDigest()` call derives its algorithm from the PREVIOUS transition's
 * `prevHash`, so the algorithm chosen here propagates forward without ever being
 * hardcoded again downstream.
 */
export function genesisPrevHash(recordId: string): Digest {
  return digest(`vidimera:genesis:${recordId}`);
}

/**
 * The canonical encoding bytes for a transition: library JCS over
 * `toDigestInput(transition)`. Exposed standalone (not just folded into
 * `transitionDigest`) so a caller can inspect/re-digest the exact bytes independently
 * — e.g. under a different algorithm during a future digest-agility migration.
 */
export function encodeTransition(transition: Transition): Uint8Array {
  return canonicalize(toDigestInput(transition));
}

/**
 * `transitionDigest` (SPEC §4): digests
 * `encodeTransition(transition)` under the algorithm DERIVED from `transition.prevHash`
 * via `algorithmOf` — never a hardcoded `'sha256'`. This is what makes the chain
 * self-describing: genesis mints the first `prevHash` under `digest()`'s default
 * algorithm, and every following transition's digest is computed under whatever
 * algorithm its OWN `prevHash` (the previous transition's digest) was itself recorded
 * under, so a future algorithm migration reads as data (a differently-prefixed
 * `prevHash`) rather than a code change to this function.
 */
export function transitionDigest(transition: Transition): Digest {
  const algorithm = algorithmOf(transition.prevHash);
  return digest(encodeTransition(transition), algorithm);
}
