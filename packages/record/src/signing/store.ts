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
 * contract: signatures are an additive evidence layer beside the chain, never inside its
 * bytes (SPEC §14's "detached"). Same provisional-signature discipline as the Store:
 * behaviors stable, method shapes pre-1.0.
 *
 * TWO MODES, and the configuration says which (`signing/decorate.ts`'s header). INTEGRATED:
 * the configured sidecar IS the store's own (`Store.signatures`, which each reference backing
 * exposes) — an entry is then written WITH its append, inside the append's atomic unit, after
 * every check has passed, so an append that does not land leaves no entry and a landed one
 * always has its own. SEPARATE: any other sidecar — one over other storage, which cannot join
 * the append's unit — is written by the decorator BEFORE it delegates the append.
 *
 * AN IMPLEMENTER MUST TOLERATE ORPHANS — they arise in separate mode. Entries whose
 * `transitionDigest` names no transition in the record's chain are a normal, expected state
 * there, not corruption: the decorator signs and writes before delegating the append, so a
 * lost CAS, a rolled-back host transaction or a crash leaves the entry behind, and a seam that
 * refuses against a record admitting no append target leaves one on every call. (Integrated
 * mode writes none of these; a `put` the host makes itself can still leave one in either
 * mode.) They are safe to prune whenever no chain transition
 * references them — verification is chain-driven, so an entry with no chain counterpart
 * is never read for a verdict. Inert is not harmless: an orphan over a transition that was
 * attempted and never committed is a valid signature over it, so a storage-writing insider
 * who writes that transition back into the chain where it was signed for is not caught
 * (SPEC §14's third condition); and the orphan of a head an insider deleted may be the only
 * trace of it, so a host that prunes may want to keep what it removes. The library performs no pruning, and this surface is never
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
 * `false` when it does not — including for any signature you cannot parse. Throw (or reject)
 * ONLY when you cannot answer at all — a key service down, a network call timed out. A throw is
 * a FAULT, not a verdict: the seam that needed the answer propagates it with `cause` and
 * appends nothing, and a transient outage clears when the call is made again. Any answer other
 * than the literal `true` reads as "does not verify".
 *
 * What the layer settles before it asks you: a sidecar entry whose `keyRef` or `signature` is
 * not a string is a miss and never reaches a verifier, and a definite miss on any transition
 * (no entry, a non-string field, an unregistered `keyRef`, a non-`true` answer) still refuses
 * `chain-compromise` even when another transition's verifier faults — unless it is the verifier
 * this instance signs under, whose outage delays the edge's own mint check until it recovers.
 * So, on an instance that holds the record's profile, a seam persistently throws rather than
 * drawing that edge only when no
 * transition is a definite miss and some entry is a string the verifier cannot answer for — a
 * malformed or planted signature string that makes it throw is exactly that case, and it
 * persists until the entry is repaired (a STUCK record, with nothing recording the tampering);
 * on an instance that does not hold it, a fault at the genesis throws as well, since whether
 * the layer applies there rests on that answer. Answering `false` for input that does not parse
 * closes the malformed case. `verifySignatures` throws on the same fault, naming the `seq` and
 * `keyRef` that locate the entry. */
export type Verifier = (bytes: Uint8Array, signature: string) => Promise<boolean>;

/** The instance-level signing block (SPEC §14: "Signing ships as an optional hook;
 * key distribution and rotation are host-declared"). The library holds no keys:
 * `signer` mints, `verifiers` (keyed by the opaque keyRef) check, `signatures` is
 * the detached sidecar — an evidence layer BESIDE the chain, never inside its bytes. Setting
 * `signatures` to the configured store's own sidecar (`store.signatures`, the very object)
 * selects the integrated mode `SignatureStore` describes; any other sidecar, separate mode.
 *
 * The shape is checked at `create()`: `signer` a function, `verifiers` a plain object whose
 * every own string key, enumerable or not, holds a function (an empty registry is allowed — a
 * prepared instance), `signatures` an object with `put` and `listByRecord`. Every signature
 * the signer mints is checked against this registry before it is stored: the minted `keyRef`
 * must be an own key of `verifiers` and its verifier must answer `true`, or the append throws
 * a named Error with nothing written (a thrown Error, not a `refused` outcome — and it applies
 * wherever the instance signs, so an instance that cannot verify its own key throws even at an
 * append that would have drawn or refused a `chain-compromise` edge). A batch is minted and
 * checked whole before any entry is written. The cost of the check: every signed append,
 * `open()` included, needs this instance's own verifier answering, so an outage of it defers
 * even a hash-break compromise edge until the verifier recovers.
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
