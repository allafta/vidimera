// @vidimera/record — tests/helpers/signing.ts: the AL2 ed25519 signing rig shared across
// this package's signing pins. Extracted verbatim from decline.test.ts's file-local
// `signingSetup` (that file's two signing tests: the eligibility-freshness refusal and
// the happy-path signed decline) so provenance.test.ts's signed-genesis pin builds the
// SAME rig rather than hand-rolling its own — no behavioral change from the inline
// version this replaces.
//
// This is a TEST-ONLY helper module (not `.test.ts`, so `node --test dist/tests/*.test.js`
// never runs it directly — same convention as tests/helpers/profiles.ts and
// tests/helpers/chain.ts).

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';

import { transitionDigest } from '../../src/chain/encoding.js';
import type { ConfirmProfile } from '../../src/config.js';
import { create, createWithClock } from '../../src/create.js';
import { MemorySignatureStore } from '../../src/signing/memory.js';
import type { SignatureStore, Signer, Verifier } from '../../src/signing/store.js';
import { MemoryStore } from '../../src/store/memory.js';
import type { Store } from '../../src/store/store.js';
import { makeConfig } from './profiles.js';

/**
 * The AL2 signing rig shared by decline.test.ts's two signing tests (the
 * eligibility-freshness refusal and the happy-path signed decline): a real Ed25519
 * keypair (`node:crypto`), a `MemorySignatureStore` sidecar, and a fixed clock
 * (`2026-08-21T00:00:00Z` — arbitrary but shared, so a freshness-bound fixture's
 * `observedAt` offsets stay meaningful). Extracted so those tests — and
 * provenance.test.ts's signed-genesis pin — build the SAME rig rather than each
 * hand-rolling its own signer/verifier — no behavioral change from the inline version
 * this replaces.
 */
export function signingSetup(profile: ConfirmProfile) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const signer: Signer = async (bytes) => ({
    keyRef: 'key-1',
    signature: edSign(null, bytes, privateKey).toString('base64'),
  });
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  const config = {
    ...makeConfig([profile]),
    signing: { signer, verifiers: { 'key-1': verifier }, signatures: new MemorySignatureStore() },
  };
  const nowMs = Date.parse('2026-08-21T00:00:00Z');
  const handles = createWithClock(config, () => new Date(nowMs));
  return { handles };
}

/**
 * The AL2 rig for signature-ENFORCEMENT fixtures. `signingSetup` above returns `{ handles }`
 * only, so a fixture built on it cannot reach the sidecar to break an entry — which is why
 * no test could drive a signature-broken chain through `decline()` until this landed. This
 * rig hands back three more things:
 *
 *   - `signatures`, the SAME `MemorySignatureStore` instance the config carries, so
 *     `breakOneSignature` below mutates what the kernel actually reads;
 *   - `store`, so an enlisted fixture can pass a `SqliteStore` and open a host transaction;
 *   - `calls`, a verifier invocation counter.
 *
 * READ `calls` AS A DELTA, NEVER AS A TOTAL. `verifySignatures()` consults the verifier too,
 * so `calls() > 0` can be satisfied without the seam under test ever reaching the layer.
 * Snapshot before the seam call and compare. The delta is what distinguishes rung (1)'s two
 * disjuncts: the condition short-circuits on `||`, so a HASH-broken chain never calls
 * `signatureLayerHolds` at all and the delta stays zero.
 *
 * Unlike `signingSetup` this uses the real clock (`create`, not `createWithClock`) — the
 * redemption seams stamp real `dueAt` values from `confirmToRedeem` and a frozen clock makes
 * those fixtures awkward. Nothing here depends on a fixed instant.
 */
export function enforceableSigningSetup(profiles: ConfirmProfile[], opts: { store?: Store } = {}) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const store = opts.store ?? new MemoryStore();
  const signatures = new MemorySignatureStore();
  let verifyCount = 0;
  const signer: Signer = async (bytes) => ({
    keyRef: 'key-1',
    signature: edSign(null, bytes, privateKey).toString('base64'),
  });
  const verifier: Verifier = async (bytes, signature) => {
    verifyCount += 1;
    return edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  };
  const config = {
    ...makeConfig(profiles, { store }),
    signing: { signer, verifiers: { 'key-1': verifier }, signatures },
  };
  return { handles: create(config), store, signatures, calls: () => verifyCount };
}

/**
 * Break exactly one sidecar entry (tamper its signature) for the given record — the GENESIS
 * transition's entry, found by correlating through the chain. Lifted from
 * `signing-enforce.test.ts`'s file-local copy, which `redeem.test.ts` had inlined
 * byte-identically; both now call this.
 *
 * CHAIN-DRIVEN, NEVER SIDECAR-DRIVEN, and this is a correlation change, not a target change.
 * The helper used to take `listByRecord`'s first element. `signing/store.ts` promises no order
 * ("chain order not guaranteed"), and a signing deployment accumulates entries for transitions
 * that never landed — the compromise append signs before delegating, so every refusing call
 * against a record admitting no CAS candidate leaves one — so position is not identity: under
 * a legal orphan-first ordering the old helper tampered the orphan while BOTH of its guard
 * assertions passed, and the fixture proved nothing. Reading the genesis digest from the chain
 * and looking THAT up is what the contract tells every caller to do. The target is unchanged:
 * on a clean signing flow `MemorySignatureStore` iterates in insertion order and the decorator
 * writes in append order, so the first entry WAS the genesis — measured, not assumed, at the
 * increment that made this change. `test/sidecar-ordering.test.ts` pins the adverse ordering.
 *
 * The first parameter is the `SignatureStore` INTERFACE, not the `MemorySignatureStore` class:
 * the class carries a private field and is therefore nominal, so a wrapping store could not be
 * passed at all. The body uses only `listByRecord` and `put`.
 *
 * The guard on the second assertion is not ceremony: the mutation overwrites the LEADING four
 * base64 characters with `AAAA`, which is a silent no-op on a signature that already begins
 * with them. Without the guard the fixture would assert nothing and the test would pass green.
 *
 * `signing.test.ts` keeps its own variant, which breaks the TRAILING four characters. That is
 * a different corruption, not a duplicate of this one, so it is deliberately not folded in.
 */
export async function breakOneSignature(
  signatures: SignatureStore,
  recordId: string,
  store: Store,
): Promise<void> {
  const chain = await store.readChain(recordId);
  const genesis = chain[0];
  assert.ok(genesis !== undefined, 'fixture: the record has a chain');
  const digest = transitionDigest(genesis);
  const entries = await signatures.listByRecord(recordId);
  const victim = entries.find((e) => e.transitionDigest === digest);
  assert.ok(victim !== undefined, 'fixture: the genesis transition has a sidecar entry');
  const broken = `AAAA${victim.signature.slice(4)}`;
  assert.notEqual(broken, victim.signature, 'fixture: the tamper changed the signature');
  await signatures.put({ ...victim, signature: broken });
}
