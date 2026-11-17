// @vidimera/record — signing-config.test.ts: the signing block's shape and the mint check.
// `create()` refuses a malformed `config.signing` with a named error; the decorator's one
// mint point verifies what the signer minted (own-key keyRef, a verifier answering the literal
// `true`) before anything reaches the sidecar; a verifier fault during that check propagates
// with its cause; and the rotation rule in `signing/store.ts` is pinned both ways — the
// two-phase rollout that works and the one-phase hazard that is documented, decided behavior.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import { create } from '../src/create.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import { captureProfile, facts, identity, makeConfig } from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const PROFILE_ID = 'test.cfg.v1';

function keyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const signer =
    (keyRef: string): Signer =>
    async (bytes) => ({
      keyRef,
      signature: edSign(null, bytes, privateKey).toString('base64'),
    });
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  return { signer, verifier };
}

function profiles() {
  return [{ ...captureProfile({ id: PROFILE_ID }), signing: true as const }];
}

function build(signing: unknown, store: MemoryStore = new MemoryStore()) {
  const config = { ...makeConfig(profiles(), { store }), signing } as never;
  return create(config);
}

async function stageOk(handles: ReturnType<typeof create>, subject: string) {
  const staged = await handles.agent.stage(CONTENT, PROFILE_ID, subject);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') throw new Error('unreachable');
  return staged.value.stagedRef;
}

async function stageAndOpen(handles: ReturnType<typeof create>, subject: string) {
  return handles.operator.open(await stageOk(handles, subject));
}

// --- the mint check -------------------------------------------------------------------

test('mint check: a keyRef absent from verifiers is refused before anything lands; a later fix succeeds', async () => {
  const k = keyPair();
  const store = new MemoryStore();
  const signatures = new MemorySignatureStore();
  const verifiers: Record<string, Verifier> = {};
  const handles = build({ signer: k.signer('k1'), verifiers, signatures }, store);

  const stagedRef = await stageOk(handles, 'subject:mc-1');
  await assert.rejects(() => handles.operator.open(stagedRef), /k1/);
  assert.equal(await store.findNonTerminal(PROFILE_ID, 'subject:mc-1'), null);

  verifiers.k1 = k.verifier; // the memo was dropped: the next attempt mints and checks anew
  const opened = await handles.operator.open(stagedRef);
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;
  const chain = await handles.operator.readChain(opened.value.recordId);
  assert.equal(chain.length, 1);
  assert.equal((await signatures.listByRecord(opened.value.recordId)).length, 1);
});

test('mint check: an inherited keyRef such as "toString" is not an own key', async () => {
  const k = keyPair();
  const store = new MemoryStore();
  const handles = build(
    {
      signer: k.signer('toString'),
      verifiers: { k1: k.verifier },
      signatures: new MemorySignatureStore(),
    },
    store,
  );
  const stagedRef = await stageOk(handles, 'subject:mc-2');
  await assert.rejects(() => handles.operator.open(stagedRef), /toString/);
  assert.equal(await store.findNonTerminal(PROFILE_ID, 'subject:mc-2'), null);
});

test('mint check: a signer key that does not match its verifier is refused; nothing appended, no sidecar entry', async () => {
  const signing = keyPair();
  const other = keyPair();
  const store = new MemoryStore();
  const signatures = new MemorySignatureStore();
  const puts: unknown[] = [];
  const spy = {
    put: async (e: never) => {
      puts.push(e);
      await signatures.put(e);
    },
    listByRecord: (id: string) => signatures.listByRecord(id),
  };
  const handles = build(
    { signer: signing.signer('k1'), verifiers: { k1: other.verifier }, signatures: spy },
    store,
  );
  const stagedRef = await stageOk(handles, 'subject:mc-3');
  await assert.rejects(() => handles.operator.open(stagedRef), /k1/);
  assert.equal(await store.findNonTerminal(PROFILE_ID, 'subject:mc-3'), null);
  assert.equal(puts.length, 0, 'nothing reached the sidecar');
});

test('mint check: a verifier that throws during the check propagates with its cause; a later fix succeeds', async () => {
  const k = keyPair();
  const store = new MemoryStore();
  const signatures = new MemorySignatureStore();
  const boom = new Error('key service down');
  const verifiers: Record<string, Verifier> = {
    k1: async () => {
      throw boom;
    },
  };
  const handles = build({ signer: k.signer('k1'), verifiers, signatures }, store);
  const stagedRef = await stageOk(handles, 'subject:mc-4');
  let caught: unknown;
  try {
    await handles.operator.open(stagedRef);
  } catch (err) {
    caught = err;
  }
  assert.ok(caught instanceof Error, 'open() threw');
  assert.equal((caught as Error).cause, boom);
  assert.equal(await store.findNonTerminal(PROFILE_ID, 'subject:mc-4'), null);

  verifiers.k1 = k.verifier;
  const opened = await handles.operator.open(stagedRef);
  assert.equal(opened.status, 'ok');
});

test('mint check: a verifier answering a non-true value is a failed check', async () => {
  const k = keyPair();
  const handles = build({
    signer: k.signer('k1'),
    verifiers: { k1: (async () => 'yes') as unknown as Verifier },
    signatures: new MemorySignatureStore(),
  });
  await assert.rejects(() => stageAndOpen(handles, 'subject:mc-5'), /k1/);
});

// --- create(): the shape check --------------------------------------------------------

function goodSigning() {
  const k = keyPair();
  return {
    signer: k.signer('k1'),
    verifiers: { k1: k.verifier },
    signatures: new MemorySignatureStore(),
  };
}

const MALFORMED: Array<[string, () => unknown, RegExp]> = [
  ['signing: null', () => null, /create: .*signing/],
  ['signing: a string', () => 'nope', /create: .*signing/],
  ['signer missing', () => ({ ...goodSigning(), signer: undefined }), /create: .*signer/],
  ['signer not a function', () => ({ ...goodSigning(), signer: 'k1' }), /create: .*signer/],
  ['verifiers missing', () => ({ ...goodSigning(), verifiers: undefined }), /create: .*verifiers/],
  ['verifiers a Map', () => ({ ...goodSigning(), verifiers: new Map() }), /create: .*verifiers/],
  ['verifiers an array', () => ({ ...goodSigning(), verifiers: [] }), /create: .*verifiers/],
  [
    'verifiers holds a non-function',
    () => ({ ...goodSigning(), verifiers: { k1: 'not a function' } }),
    /create: .*verifiers.*k1/,
  ],
  [
    'signatures missing',
    () => ({ ...goodSigning(), signatures: undefined }),
    /create: .*signatures/,
  ],
  [
    'signatures.put missing',
    () => ({ ...goodSigning(), signatures: { listByRecord: async () => [] } }),
    /create: .*put/,
  ],
  [
    'signatures.listByRecord missing',
    () => ({ ...goodSigning(), signatures: { put: async () => undefined } }),
    /create: .*listByRecord/,
  ],
];

for (const [name, make, pattern] of MALFORMED) {
  test(`create() refuses a malformed signing block: ${name}`, () => {
    assert.throws(() => build(make()), pattern);
  });
}

test('create() accepts an empty verifiers registry (a prepared instance); the mint check refuses its first signature', async () => {
  const k = keyPair();
  const handles = build({
    signer: k.signer('k1'),
    verifiers: {},
    signatures: new MemorySignatureStore(),
  });
  await assert.rejects(() => stageAndOpen(handles, 'subject:empty-1'), /k1/);
});

test('create() accepts a null-prototype verifiers registry', async () => {
  const k = keyPair();
  const verifiers = Object.assign(Object.create(null) as Record<string, Verifier>, {
    k1: k.verifier,
  });
  const handles = build({
    signer: k.signer('k1'),
    verifiers,
    signatures: new MemorySignatureStore(),
  });
  const opened = await stageAndOpen(handles, 'subject:null-proto-1');
  assert.equal(opened.status, 'ok');
});

// --- rotation -------------------------------------------------------------------------

function rotationRig(aVerifiers: 'both' | 'k1-only') {
  const k1 = keyPair();
  const k2 = keyPair();
  const store = new MemoryStore();
  const signatures = new MemorySignatureStore();
  const all = { k1: k1.verifier, k2: k2.verifier };
  const a = build(
    {
      signer: k1.signer('k1'),
      verifiers: aVerifiers === 'both' ? all : { k1: k1.verifier },
      signatures,
    },
    store,
  );
  const b = build({ signer: k2.signer('k2'), verifiers: all, signatures }, store);
  return { a, b, signatures };
}

test('rotation, two phases: both instances hold both verifiers, records touched by both finalize and seal healthy', async () => {
  const { a, b, signatures } = rotationRig('both');
  const opened = await stageAndOpen(a, 'subject:rot-1');
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;
  const recordId = opened.value.recordId;

  const fin = await b.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(fin.status, 'ok');
  const sealed = await a.operator.seal(recordId);
  assert.equal(sealed.status, 'ok');

  const chain = await a.operator.readChain(recordId);
  const keyRefs = new Set((await signatures.listByRecord(recordId)).map((e) => e.keyRef));
  assert.deepEqual([...keyRefs].sort(), ['k1', 'k2']);
  assert.equal(chain.at(-1)?.kind, 'sealed');
  const report = await b.operator.verifySignatures(recordId);
  assert.ok(report.transitions.every((t) => t.verified));
});

test('rotation, one phase (documented decided behavior): an instance holding only the old verifier reads a new-key transition as unverified and refuses chain-compromise', async () => {
  const { a, b } = rotationRig('k1-only');
  const opened = await stageAndOpen(b, 'subject:rot-2'); // signed with k2
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;

  const out = await a.operator.finalize(opened.value.recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
});

test('key retirement, the OLD shape: an instance whose signer still uses a key its registry no longer holds throws at the mint on a sealed record — nothing appended, no orphan', async () => {
  const k1 = keyPair();
  const store = new MemoryStore();
  const signatures = new MemorySignatureStore();
  const healthy = build(
    { signer: k1.signer('k1'), verifiers: { k1: k1.verifier }, signatures },
    store,
  );
  const opened = await stageAndOpen(healthy, 'subject:retire-1');
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;
  const recordId = opened.value.recordId;
  assert.equal(
    (await healthy.operator.finalize(recordId, identity(), CONTENT, facts())).status,
    'ok',
  );
  assert.equal((await healthy.operator.seal(recordId)).status, 'ok');

  const chainBefore = await store.readChain(recordId);
  const sidecarBefore = (await signatures.listByRecord(recordId)).length;
  // Same signer, but the registry no longer holds k1: the shape the mint check closes.
  const stale = build({ signer: k1.signer('k1'), verifiers: {}, signatures }, store);
  for (let call = 1; call <= 3; call += 1) {
    await assert.rejects(
      () => stale.operator.finalize(recordId, identity(), CONTENT, facts()),
      /k1/,
    );
    assert.equal((await store.readChain(recordId)).length, chainBefore.length, 'chain flat');
    assert.equal(
      (await signatures.listByRecord(recordId)).length,
      sidecarBefore,
      `no orphan minted (call ${call})`,
    );
  }
});
