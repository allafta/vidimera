// @vidimera/record — signing/store.ts: the AL2 mint increment's own types (SPEC §14
// "AL2 — Signed" — the first of three signing increments; enforcement and its marker
// move next, freshness after). Detached-signature evidence lives BESIDE the chain,
// never inside a transition's own bytes — nothing here enforces anything: this
// increment lands the shape and the mint point only. Folding a signing record's bad
// layer into chain-compromise at the seams is the AL2 enforcement increment's own work.

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
 * as the Store: behaviors stable, method shapes pre-1.0. */
export interface SignatureStore {
  put(entry: SignatureEntry): Promise<void>;
  /** All entries for a record, chain order not guaranteed — the caller correlates by
   * transitionDigest (chain-driven, never sidecar-driven). */
  listByRecord(recordId: string): Promise<SignatureEntry[]>;
}

/** The host's signer hook: canonical transition bytes in, keyRef + signature out.
 * The library never sees key material. */
export type Signer = (bytes: Uint8Array) => Promise<{ keyRef: string; signature: string }>;

/** The host's verifier for ONE key: canonical bytes + signature in, boolean out. */
export type Verifier = (bytes: Uint8Array, signature: string) => Promise<boolean>;

/** The instance-level signing block (SPEC §14: "Signing ships as an optional hook;
 * key distribution and rotation are host-declared"). The library holds no keys:
 * `signer` mints, `verifiers` (keyed by the opaque keyRef) check, `signatures` is
 * the detached sidecar — an evidence layer BESIDE the chain, never inside its bytes. */
export interface SigningConfig {
  signer: Signer;
  verifiers: Record<string, Verifier>;
  signatures: SignatureStore;
}
