// @vidimera/record — profile-drift-report.test.ts (the security-findings pass, 2026-09-03):
// `SignatureReport.genesisProfile` — the genesis profile as the chain binds it and as THIS
// instance holds it. `signingDeclared` has always been computed from the LIVE registry: the
// genesis `profileId` resolved against this instance's profiles, then `.signing === true`.
// So a record opened under a signing profile reads as a plain AL1 record to any same-id
// instance whose profile omits `signing` — and finalizes there — while the report said only
// `signingDeclared: false`, which a reader takes as "not a signing record". The chain has
// carried the evidence all along: the `opened` payload's `profileDigest` covers every
// declarative field, `signing` included (SPEC §4: "the governing profile is detectable on
// replay"). This field performs the comparison the record was built for and reports it in
// three states — matches, drifted, unresolvable — beside the digests it compared.
//
// REPORTING ONLY, stated as loudly as `orphans` is: no gate reads it, `signatureLayerHolds`
// never sees it, and the same-id non-signing sibling still finalizes. Fail-closing that
// sibling changes the SPEC §8/§9 refusal ladder and OPEN-QUESTIONS §1's decided text, so it
// needs a fresh sanction; the fail-open is pinned below AS A BOUND, so that the day it moves
// it moves on purpose. `profileDigest` and `projectProfile` are exported from the entry
// point so a host can make the same comparison offline over an archived chain.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import { profileDigest } from '../src/profile-digest.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, SigningConfig, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Store } from '../src/store/store.js';
import { captureProfile, facts, identity, makeConfig, openRecord } from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const ID = 'test.drift.v1';

function signingProfile(overrides: { ttl?: number } = {}): ConfirmProfile {
  return { ...captureProfile({ id: ID, ...overrides }), signing: true };
}

/** One shared store and one shared signing tier, so two instances can be built over them. */
function shared(): { store: Store; signing: SigningConfig } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const signer: Signer = async (bytes) => ({
    keyRef: 'key-1',
    signature: edSign(null, bytes, privateKey).toString('base64'),
  });
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  return {
    store: new MemoryStore(),
    signing: { signer, verifiers: { 'key-1': verifier }, signatures: new MemorySignatureStore() },
  };
}

async function boundDigestOf(store: Store, recordId: string): Promise<string> {
  const genesis = (await store.readChain(recordId))[0];
  assert.ok(genesis !== undefined, 'fixture: the record has a genesis');
  const d = (genesis.payload as { profileDigest?: unknown }).profileDigest;
  assert.equal(typeof d, 'string', 'fixture: the opened payload binds a profileDigest');
  return d as string;
}

test('matches: on the instance that opened it, the report carries the bound digest and says the live profile is the one the record was opened under', async () => {
  const { store, signing } = shared();
  const handles = create({ ...makeConfig([signingProfile()], { store }), signing });
  const recordId = await openRecord(handles, CONTENT, ID, 'subject:drift-1');
  const bound = await boundDigestOf(store, recordId);

  const report = await handles.operator.verifySignatures(recordId);
  assert.equal(report.signingDeclared, true);
  assert.deepEqual(report.genesisProfile, { resolution: 'matches', profileId: ID, digest: bound });
  assert.equal(bound, profileDigest(signingProfile()), 'the bound digest is the projection digest');
});

test("drifted, the finding's own route: a same-id sibling whose profile omits signing reads the record as non-signing and FINALIZES it — the recorded bound — while the report now says the live profile is not the one the record was opened under", async () => {
  const { store, signing } = shared();
  const opener = create({ ...makeConfig([signingProfile()], { store }), signing });
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:drift-2');
  const bound = await boundDigestOf(store, recordId);

  // Same id, no `signing`, no `config.signing` at all — the sibling never looks at the sidecar.
  const plain = captureProfile({ id: ID });
  const sibling = create(makeConfig([plain], { store }));

  const report = await sibling.operator.verifySignatures(recordId);
  assert.equal(
    report.signingDeclared,
    false,
    'computed from the LIVE profile — the reading this field exists to qualify',
  );
  assert.notEqual(bound, profileDigest(plain), 'the projection covers `signing`');
  assert.deepEqual(report.genesisProfile, {
    resolution: 'drifted',
    profileId: ID,
    boundDigest: bound,
    liveDigest: profileDigest(plain),
  });

  // THE BOUND, pinned so it moves on purpose: nothing refuses. Fail-closing this is a
  // refusal-ladder change under a fresh sanction (file header), not a fix this pass may make.
  const out = await sibling.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'ok', 'recorded residual — see the file header before changing this');
});

test('drifted on the signing side is reporting only: a same-id signing sibling with a different ttl verifies every signature and finalizes; the report names the drift', async () => {
  const { store, signing } = shared();
  const opener = create({ ...makeConfig([signingProfile()], { store }), signing });
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:drift-3');
  const bound = await boundDigestOf(store, recordId);

  const edited = signingProfile({ ttl: 60 });
  const sibling = create({ ...makeConfig([edited], { store }), signing });
  const report = await sibling.operator.verifySignatures(recordId);
  assert.equal(report.signingDeclared, true);
  assert.ok(
    report.transitions.every((t) => t.signed && t.verified),
    'the layer holds',
  );
  assert.deepEqual(report.genesisProfile, {
    resolution: 'drifted',
    profileId: ID,
    boundDigest: bound,
    liveDigest: profileDigest(edited),
  });
  const out = await sibling.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'ok', 'drift gates nothing — reporting only');
});

test('unresolvable: an instance whose registry lacks the genesis profileId reports the claim and the bound digest with no live digest, and signingDeclared reads false', async () => {
  const { store, signing } = shared();
  const opener = create({ ...makeConfig([signingProfile()], { store }), signing });
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:drift-4');
  const bound = await boundDigestOf(store, recordId);

  const stranger = create(makeConfig([captureProfile({ id: 'test.drift.other.v1' })], { store }));
  const report = await stranger.operator.verifySignatures(recordId);
  assert.equal(report.signingDeclared, false);
  assert.deepEqual(report.genesisProfile, {
    resolution: 'unresolvable',
    profileId: ID,
    boundDigest: bound,
  });
});

test('a non-signing instance reports the same field: matches on the profile it opened under', async () => {
  const plain = captureProfile({ id: ID });
  const store = new MemoryStore();
  const handles = create(makeConfig([plain], { store }));
  const recordId = await openRecord(handles, CONTENT, ID, 'subject:drift-5');
  const report = await handles.operator.verifySignatures(recordId);
  assert.equal(report.signingDeclared, false);
  assert.deepEqual(report.genesisProfile, {
    resolution: 'matches',
    profileId: ID,
    digest: profileDigest(plain),
  });
});

test("the digest helpers are exported from the entry point, and profileDigest reproduces the genesis payload's own binding", async () => {
  const mod = (await import('../src/index.js')) as Record<string, unknown>;
  assert.equal(typeof mod.profileDigest, 'function', 'profileDigest is on the public surface');
  assert.equal(typeof mod.projectProfile, 'function', 'projectProfile is on the public surface');

  const plain = captureProfile({ id: ID });
  const store = new MemoryStore();
  const handles = create(makeConfig([plain], { store }));
  const recordId = await openRecord(handles, CONTENT, ID, 'subject:drift-6');
  const bound = await boundDigestOf(store, recordId);
  const exported = mod.profileDigest as (p: ConfirmProfile) => string;
  assert.equal(exported(plain), bound, 'a host can recompute the binding offline');
});
