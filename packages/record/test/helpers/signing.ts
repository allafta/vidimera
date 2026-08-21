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

import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';

import type { ConfirmProfile } from '../../src/config.js';
import { createWithClock } from '../../src/create.js';
import { MemorySignatureStore } from '../../src/signing/memory.js';
import type { Signer, Verifier } from '../../src/signing/store.js';
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
