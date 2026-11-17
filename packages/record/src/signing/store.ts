// @vidimera/record — signing/store.ts: the AL2 mint increment's own types (SPEC §14
// "AL2 — Signed" — the first of three signing increments; freshness, the third, landed
// at the AL2 freshness increment: the freshness arm in `kernel/finalize.ts`, refusing
// `consultation-stale`). Detached-signature evidence lives BESIDE the chain, never inside a
// transition's own bytes — this file lands the shape and the mint point only, and on
// its own still enforces nothing. Folding a signing record's bad layer into
// chain-compromise at the seams is the AL2 enforcement increment's own work, landed
// (second of three) at `kernel/verify-signatures.ts`'s `signatureLayerHolds`, consulted
// by every chain-verify site over these same types.

import type { Digest } from '../types.js';

/** One detached signature, keyed by the transition's own digest (content-addressed —
 * the signature is OVER the canonical bytes that digest names). recordId/seq ride
 * along for listing; they never key anything. */
export interface SignatureEntry {
  transitionDigest: Digest;
  recordId: string;
  seq: number;
  keyRef: string;
  signature: string;
}

/** The detached-signature sidecar. Deliberately NOT part of the frozen Store
 * contract: signatures are an additive evidence layer beside the chain, stored and
 * injected separately (SPEC §14's "detached"). Same provisional-signature discipline
 * as the Store: behaviors stable, method shapes pre-1.0.
 *
 * AN IMPLEMENTER MUST TOLERATE ORPHANS. Entries whose `transitionDigest` names no
 * transition in the record's chain are a normal, expected state, not corruption: the
 * signing decorator signs BEFORE delegating the append, so a lost CAS or a crash leaves
 * the entry behind, and a seam that refuses against a record admitting no append target
 * leaves one on every call. They are safe to prune whenever no chain transition
 * references them — verification is chain-driven, so an entry with no chain counterpart
 * is never read for a verdict. The library performs no pruning, and this surface is never
 * told which entries are dead — the operator's `verifySignatures(recordId).orphans` names
 * them (every sidecar digest with no chain counterpart, sorted; reporting only), and the
 * host acts on that. A backing that must not grow without bound therefore reconciles
 * against the chain itself, deleting what that read names. (`MemorySignatureStore` ships a
 * `delete`, but that method is documented there as explicitly NOT part of this contract — a
 * test and host convenience, never something the library calls.) */
export interface SignatureStore {
  /** At most one entry per transitionDigest — put upserts; a sidecar returning
   * multiple entries for one digest is out of contract (the report's correlation
   * assumes the invariant). */
  put(entry: SignatureEntry): Promise<void>;
  /** All entries for a record, chain order not guaranteed — the caller correlates by
   * transitionDigest (chain-driven, never sidecar-driven). */
  listByRecord(recordId: string): Promise<SignatureEntry[]>;
}

/** The host's signer hook: canonical transition bytes in, keyRef + signature out.
 * The library never sees key material. */
export type Signer = (bytes: Uint8Array) => Promise<{ keyRef: string; signature: string }>;

/** The host's verifier for ONE key: canonical bytes + signature in, boolean out.
 *
 * THE CONTRACT: answer the literal `true` when the signature verifies over these bytes, and
 * `false` when it does not. Throw (or reject) ONLY when you cannot answer at all — a key
 * service down, a network call timed out. A throw is a FAULT, not a verdict: the seam that
 * needed the answer propagates it with `cause` and appends nothing, so the call can be made
 * again once the verifier answers. A verifier that throws on MALFORMED input (a signature
 * that does not decode, say) turns a tampered entry into a stuck record — the seam throws
 * until the entry is repaired — instead of the evidence it should be; catch that case and
 * answer `false`. Any answer other than the literal `true` reads as "does not verify". */
export type Verifier = (bytes: Uint8Array, signature: string) => Promise<boolean>;

/** The instance-level signing block (SPEC §14: "Signing ships as an optional hook;
 * key distribution and rotation are host-declared"). The library holds no keys:
 * `signer` mints, `verifiers` (keyed by the opaque keyRef) check, `signatures` is
 * the detached sidecar — an evidence layer BESIDE the chain, never inside its bytes.
 *
 * The shape is checked at `create()`: `signer` a function, `verifiers` a plain object whose
 * every value is a function (an empty registry is allowed — a prepared instance), `signatures`
 * an object with `put` and `listByRecord`. Every signature the signer mints is checked against
 * this registry before it is stored: the minted `keyRef` must be an own key of `verifiers`
 * and its verifier must answer `true`, or the append is refused with nothing written.
 *
 * ROTATION. Every instance that can touch a record — and every configuration a deployment may
 * roll back to — must hold the verifier for every `keyRef` any instance signs with. Rotate in
 * two phases: first distribute the new key's verifier to every instance, then switch the
 * signers. An instance that lacks a verifier reads that key's entries as unverified and
 * refuses `chain-compromise`. Keep a retired key's verifier registered for as long as records
 * it signed may still be touched. */
export interface SigningConfig {
  signer: Signer;
  verifiers: Record<string, Verifier>;
  signatures: SignatureStore;
}
