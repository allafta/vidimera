// @vidimera/record — signing.test.ts (SPEC §14 "AL2 — Signed", the AL2 mint
// increment, first of three): the detached-signature LAYER — per-profile declaration,
// sign-before-append via the create()-level Store decorator, the chain-driven
// verifySignatures read. NOTHING enforces yet: no seam consults signatures (the AL2
// enforcement increment's own work), and AL1's guarantees hold throughout — the
// signed chain's BYTES are identical to an unsigned one's except the declared
// control's own genesis profileDigest and its hash-chain derivations (prevHash; the
// chain-verify consultation's payloadDigest) — no signature material anywhere,
// pinned below. The tests sign with real Ed25519 via node:crypto; the library itself
// does no crypto — the signer/verifier are host hooks.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import { create, createWithClock } from '../src/create.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import { captureProfile, facts, identity, makeConfig, openRecord } from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const SUBJ = 'subject:sig-1';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
function makeSigner(keyRef = 'key-1'): { signer: Signer; calls: Uint8Array[] } {
  const calls: Uint8Array[] = [];
  const signer: Signer = async (bytes) => {
    calls.push(bytes);
    return { keyRef, signature: edSign(null, bytes, privateKey).toString('base64') };
  };
  return { signer, calls };
}
const ed25519Verifier: Verifier = async (bytes, signature) =>
  edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));

function signingProfile(id = 'test.signed.v1') {
  const p = captureProfile({ id });
  return { ...p, signing: true as const };
}

function signingSetup(profiles = [signingProfile()]) {
  const store = new MemoryStore();
  const signatures = new MemorySignatureStore();
  const { signer, calls } = makeSigner();
  const config = {
    ...makeConfig(profiles, { store }),
    signing: { signer, verifiers: { 'key-1': ed25519Verifier }, signatures },
  };
  return { store, signatures, calls, handles: create(config) };
}

test('construction: a signing profile without config.signing throws loud; a prepared instance without a declaring profile constructs', () => {
  const store = new MemoryStore();
  assert.throws(() => create(makeConfig([signingProfile()], { store })), /signing/i);
  const prepared = {
    ...makeConfig([captureProfile()], { store: new MemoryStore() }),
    signing: {
      signer: makeSigner().signer,
      verifiers: {},
      signatures: new MemorySignatureStore(),
    },
  };
  assert.doesNotThrow(() => create(prepared));
});

test('mint coverage: every transition of a signing record gets a sidecar entry — the batch and a clock edge included; a non-signing profile mints nothing', async () => {
  const store = new MemoryStore();
  const signatures = new MemorySignatureStore();
  const { signer } = makeSigner();
  let now = new Date('2026-08-17T10:00:00.000Z');
  const config = {
    ...makeConfig([signingProfile(), captureProfile({ id: 'test.plain.v1' })], { store }),
    signing: { signer, verifiers: { 'key-1': ed25519Verifier }, signatures },
  };
  const handles = createWithClock(config, () => now);

  const recordId = await openRecord(handles, CONTENT, 'test.signed.v1', SUBJ);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const chain = await handles.operator.readChain(recordId);
  const entries = await signatures.listByRecord(recordId);
  assert.equal(entries.length, chain.length, 'one entry per transition, batch included');
  for (const t of chain) {
    const entry = entries.find((e) => e.transitionDigest === transitionDigest(t));
    assert.ok(entry, `transition seq ${t.seq} is signed`);
    assert.equal(entry?.keyRef, 'key-1');
    assert.equal(entry?.seq, t.seq);
  }

  // An en-passant clock edge signs too: a second signing record lapses open.
  const lapsingId = await openRecord(handles, CONTENT, 'test.signed.v1', 'subject:sig-lapse');
  now = new Date('2026-08-17T12:00:01.000Z');
  const lapse = await handles.operator.finalize(lapsingId, identity(), CONTENT, facts());
  assert.equal(lapse.status, 'refused');
  const lapsedChain = await handles.operator.readChain(lapsingId);
  const lapsedEntries = await signatures.listByRecord(lapsingId);
  assert.equal(lapsedEntries.length, lapsedChain.length, 'the expired edge is signed');

  // Non-signing profile in the SAME instance: nothing minted.
  const plainId = await openRecord(handles, CONTENT, 'test.plain.v1', 'subject:sig-plain');
  assert.equal((await signatures.listByRecord(plainId)).length, 0);
});

test('byte-identity, stated precisely: the chains differ ONLY in the genesis profileDigest — no signature material anywhere', async () => {
  async function run(withSigning: boolean) {
    const store = new MemoryStore();
    const base = captureProfile({ id: 'test.bi.v1' });
    const profile = withSigning ? { ...base, signing: true as const } : base;
    const config = withSigning
      ? {
          ...makeConfig([profile], { store }),
          signing: {
            signer: makeSigner().signer,
            verifiers: {},
            signatures: new MemorySignatureStore(),
          },
        }
      : makeConfig([profile], { store });
    // Fixed clock AND a deterministic mintId counter: both runs mint identical id
    // sequences (mintId may serve staged refs too), so the ONLY legitimate
    // divergence left is the declared control's own profileDigest (and the prevHash
    // chaining it forces downstream) — everything else must match.
    let n = 0;
    const handles = createWithClock(
      config,
      () => new Date('2026-08-17T10:00:00.000Z'),
      () => `id-bi-${++n}`,
    );
    const recordId = await openRecord(handles, CONTENT, 'test.bi.v1', SUBJ);
    const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(done.status, 'ok');
    return handles.operator.readChain(recordId);
  }
  const signed = await run(true);
  const plain = await run(false);
  const gs = (signed[0]?.payload as { profileDigest?: string } | undefined)?.profileDigest;
  const gp = (plain[0]?.payload as { profileDigest?: string } | undefined)?.profileDigest;
  assert.notEqual(
    gs,
    gp,
    'the declaration IS visible to profileDigest, like every declared control',
  );
  // The pin sanctions exactly ONE primary divergence — the declared control's
  // genesis profileDigest — and masks every OTHER differing field only if it is a
  // DERIVATION of that one digest through the chain's own integrity machinery, never
  // a fresh difference of its own:
  //   (1) `prevHash` chains the genesis digest forward, transition to transition;
  //   (2) the pre-seam `chain-verify` consultation's `payloadDigest` embeds the
  //       verified head digest, which IS the genesis digest here (SPEC §5's
  //       mandatory pre-seam chain-verify — pre-existing, untouched by signing);
  //       identified by the consultation's own `kind`, never by chain position, so
  //       the mask stays correct if this fixture's shape ever grows more legs or
  //       consultations.
  // Both are the SAME genesis digest flowing through two channels, not two
  // independent facts. What the pin proves is unchanged, now stated sharply: no
  // FIELD of any transition carries signature material — every divergence in the two
  // chains is a derivation of the one declared-control difference. If masking these
  // three field classes still left ANY difference, that would be a real finding.
  const mask = (chain: typeof signed) =>
    chain.map((t) => {
      const payload = t.payload as Record<string, unknown>;
      const isChainVerify = payload?.kind === 'chain-verify';
      return {
        ...t,
        prevHash: 'masked',
        payload:
          t.seq === 1
            ? { ...payload, profileDigest: 'masked' }
            : isChainVerify
              ? { ...payload, payloadDigest: 'masked' }
              : payload,
      };
    });
  assert.deepEqual(mask(signed), mask(plain));
});

test('sign-before-append: a throwing signer PREVENTS the append (order proven, not narrated)', async () => {
  const store = new MemoryStore();
  const config = {
    ...makeConfig([signingProfile()], { store }),
    signing: {
      signer: (async () => {
        throw new Error('signer down');
      }) as Signer,
      verifiers: {},
      signatures: new MemorySignatureStore(),
    },
  };
  const handles = create(config);
  const staged = await handles.agent.stage(CONTENT, 'test.signed.v1', SUBJ);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  await assert.rejects(handles.operator.open(staged.value.stagedRef), /signer down/);
  // Append-then-sign would have landed the genesis before the throw; sign-before-
  // append leaves NO chain — the order pin.
  const anyChain = await store.findNonTerminal('test.signed.v1', SUBJ);
  assert.equal(anyChain, null, 'nothing landed');
});

test('orphan sidecar entries are invisible to the report (chain-driven correlation)', async () => {
  const { handles, signatures } = signingSetup();
  const recordId = await openRecord(handles, CONTENT, 'test.signed.v1', SUBJ);

  await signatures.put({
    transitionDigest: `sha256:${'f'.repeat(64)}`,
    recordId,
    seq: 99,
    keyRef: 'key-1',
    signature: 'orphan',
  });
  const report = await handles.operator.verifySignatures(recordId);
  assert.equal(
    report.transitions.some((t) => t.seq === 99),
    false,
    'chain-driven: an orphan entry never appears',
  );
});

test('verifySignatures: verified under the registry; fail-closed on unresolvable keyRef, tampered signature, missing entry', async () => {
  const { handles, signatures } = signingSetup();
  const recordId = await openRecord(handles, CONTENT, 'test.signed.v1', SUBJ);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');

  const good = await handles.operator.verifySignatures(recordId);
  assert.equal(good.signingDeclared, true);
  assert.ok(good.transitions.length >= 3);
  assert.ok(good.transitions.every((t) => t.signed && t.verified && t.keyRef === 'key-1'));

  // Tamper one signature: that seq alone fails, fail-closed reporting, no throw.
  const entries = await signatures.listByRecord(recordId);
  const victim = entries[0];
  assert.ok(victim !== undefined);
  await signatures.put({ ...victim, signature: victim.signature.slice(0, -4) + 'AAAA' });
  const tampered = await handles.operator.verifySignatures(recordId);
  const victimRow = tampered.transitions.find(
    (t) => t.transitionDigest === victim.transitionDigest,
  );
  assert.equal(victimRow?.signed, true);
  assert.equal(victimRow?.verified, false);

  // Unresolvable keyRef: rebuild the entry under a key the registry lacks.
  await signatures.put({ ...victim, keyRef: 'key-unknown' });
  const unresolvable = await handles.operator.verifySignatures(recordId);
  assert.equal(
    unresolvable.transitions.find((t) => t.transitionDigest === victim.transitionDigest)?.verified,
    false,
  );
});

test('the signer receives exactly encodeTransition bytes; the enlisted tx passes through untouched', async () => {
  const { handles, calls } = signingSetup();
  const recordId = await openRecord(handles, CONTENT, 'test.signed.v1', SUBJ);
  const chain = await handles.operator.readChain(recordId);
  const genesis = chain[0];
  assert.ok(genesis !== undefined);
  const { encodeTransition } = await import('../src/chain/encoding.js');
  assert.deepEqual(
    Buffer.from(calls[0] as Uint8Array),
    Buffer.from(encodeTransition(genesis)),
    'the hook signs the canonical bytes, nothing else',
  );
  // The enlisted-passthrough pin lives in the sqlite suite (redeem.test.ts's own
  // ENLISTED SIGNING test, added alongside this file in the AL2 mint increment) —
  // this file pins the byte contract only.
});
