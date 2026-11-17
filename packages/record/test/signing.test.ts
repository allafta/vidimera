// @vidimera/record — signing.test.ts (SPEC §14 "AL2 — Signed", the AL2 mint
// increment, first of three): the detached-signature LAYER — per-profile declaration,
// sign-before-append via the create()-level Store decorator, the chain-driven
// verifySignatures read. This file pins the MINT layer in ISOLATION only: every
// fixture below either signs and verifies correctly throughout, or only ever calls the
// pure `open()`/`verifySignatures()` reads that no chain-verify site consults — so none
// of it exercises the AL2 enforcement increment's own work (second of three, now
// landed: every seam's chain-verify now folds `kernel/verify-signatures.ts`'s
// `signatureLayerHolds` into its existing failure arm — see signing-enforce.test.ts).
// AL1's guarantees hold throughout — the signed chain's BYTES are identical to an
// unsigned one's except the declared control's own genesis profileDigest and its
// hash-chain derivations (prevHash; the chain-verify consultation's payloadDigest) —
// no signature material anywhere, pinned below. The tests sign with real Ed25519 via
// node:crypto; the library itself does no crypto — the signer/verifier are host hooks.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import { create, createWithClock } from '../src/create.js';
import { SIGNING_MEMO_CAP, withSigning } from '../src/signing/decorate.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Store } from '../src/store/store.js';
import type { Transition } from '../src/types.js';
import { storeGenesis, storeNext } from './helpers/chain.js';
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
            // The AL2 enforcement increment now consults this registry at finalize's
            // chain-verify rung (below) — `verifiers: {}` was inert before that
            // increment; the shared `ed25519Verifier` (module scope, same keypair
            // `makeSigner()` signs with) is what this fixture always meant to check.
            signer: makeSigner().signer,
            verifiers: { 'key-1': ed25519Verifier },
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
  // Deliberately NOT `helpers/signing.ts`'s shared `breakOneSignature`: that one overwrites
  // the LEADING four base64 characters and this breaks the TRAILING four. Two different
  // corruptions of the same entry; folding them together would quietly change which bytes
  // this test exercises.
  await signatures.put({ ...victim, signature: `${victim.signature.slice(0, -4)}AAAA` });
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

// === the decorator's per-record memo is bounded (the review's phase 4) ====================
//
// `withSigning` remembers, per recordId, whether the record signs, so a non-genesis append
// need not re-read the genesis to find out. Unbounded, that map grew by one entry per record
// for the life of the process. These two pins drive the decorator DIRECTLY over a
// read-counting O(1) stub store — no kernel, no crypto (a trivial signer, since nothing here
// verifies) — so ten thousand records cost milliseconds, and count the one observable the bound has:
// a hot record's append reads no chain, an evicted record's next append re-reads its genesis
// exactly once and is still signed.

const PROBE_PAYLOAD = { kind: 'probe', payloadDigest: `sha256:${'a'.repeat(64)}` };

/**
 * The decorator over a MINIMAL O(1) store whose `readChain` calls are counted; a trivial
 * signer. Not a MemoryStore: its C1 scan walks every record per genesis, which made ten
 * thousand geneses O(n²) (the review measured over a second per pin). This stub keeps only
 * what the memo pins observe — chains by recordId, appended in order, read back — and none
 * of the Store contract's constraints, which the conformance suite owns elsewhere.
 */
function memoRig() {
  const chains = new Map<string, Transition[]>();
  let reads = 0;
  const counting: Store = {
    putStaged: async () => undefined,
    getStaged: async () => null,
    appendTransition: async (_e, t) => {
      const chain = chains.get(t.recordId) ?? [];
      chain.push(t);
      chains.set(t.recordId, chain);
      return { appended: true, seq: t.seq, transitionDigest: transitionDigest(t) };
    },
    appendBatch: async (_e, ts) => {
      for (const t of ts) {
        const chain = chains.get(t.recordId) ?? [];
        chain.push(t);
        chains.set(t.recordId, chain);
      }
      return { appended: true, transitionDigests: ts.map((t) => transitionDigest(t)) };
    },
    readChain: async (r) => {
      reads += 1;
      return [...(chains.get(r) ?? [])];
    },
    chainHead: async (r) => {
      const last = chains.get(r)?.at(-1);
      return last === undefined ? null : transitionDigest(last);
    },
    listDue: async () => [],
    findNonTerminal: async () => null,
  };
  const signatures = new MemorySignatureStore();
  const signer: Signer = async () => ({ keyRef: 'key-1', signature: 'sig' });
  // A stub pair consistent with each other: the mint check needs a verifier that answers
  // true for what this signer mints; the memo assertions are about something else.
  const stubVerifiers = { 'key-1': (async () => true) as Verifier };
  const store = withSigning({ signer, verifiers: stubVerifiers, signatures }, counting, () => true);
  return {
    store,
    signatures,
    reads: { count: () => reads, reset: () => (reads = 0) },
  };
}

async function landGenesis(store: Store, i: number) {
  const g = storeGenesis(`rec-${i}`, 'test.signed.v1', `subject:memo-${i}`);
  const res = await store.appendTransition(null, g, { nonTerminal: true });
  assert.ok(res.appended, `fixture: genesis rec-${i} must land`);
  return g;
}

test('the per-record memo is BOUNDED: past SIGNING_MEMO_CAP distinct records the oldest is evicted — its next append re-reads the genesis once, and is still signed', async () => {
  const { store, signatures, reads } = memoRig();
  const g0 = await landGenesis(store, 0);
  const n1 = storeNext(g0, 'consultation-recorded', PROBE_PAYLOAD);
  reads.reset();
  assert.ok((await store.appendTransition('open', n1, { nonTerminal: true })).appended);
  assert.equal(reads.count(), 0, 'hot: the memo answers and the decorator reads no chain');

  for (let i = 1; i <= SIGNING_MEMO_CAP; i += 1) await landGenesis(store, i);

  const n2 = storeNext(n1, 'consultation-recorded', PROBE_PAYLOAD);
  reads.reset();
  assert.ok((await store.appendTransition('open', n2, { nonTerminal: true })).appended);
  assert.equal(reads.count(), 1, 'cold: evicted, so exactly one genesis re-read — never more');
  assert.equal(
    (await signatures.listByRecord('rec-0')).length,
    3,
    'every rec-0 append is signed, whether the memo was hot or cold',
  );
});

test('the memo is LRU, not FIFO: a hit refreshes the record, so a full memo evicts the least-recently-used record instead', async () => {
  const { store, reads } = memoRig();
  const g0 = await landGenesis(store, 0);
  const g1 = await landGenesis(store, 1);
  for (let i = 2; i < SIGNING_MEMO_CAP; i += 1) await landGenesis(store, i); // memo: exactly CAP

  // A hit on rec-0 refreshes it — it is no longer the oldest entry.
  const n0 = storeNext(g0, 'consultation-recorded', PROBE_PAYLOAD);
  reads.reset();
  assert.ok((await store.appendTransition('open', n0, { nonTerminal: true })).appended);
  assert.equal(reads.count(), 0);

  // One more distinct record forces an eviction: the LRU entry is rec-1, not rec-0.
  await landGenesis(store, SIGNING_MEMO_CAP);
  reads.reset();
  const n0b = storeNext(n0, 'consultation-recorded', PROBE_PAYLOAD);
  assert.ok((await store.appendTransition('open', n0b, { nonTerminal: true })).appended);
  assert.equal(reads.count(), 0, 'rec-0 was refreshed by its hit and survives the eviction');
  reads.reset();
  const n1 = storeNext(g1, 'consultation-recorded', PROBE_PAYLOAD);
  assert.ok((await store.appendTransition('open', n1, { nonTerminal: true })).appended);
  assert.equal(reads.count(), 1, 'rec-1, untouched since its genesis, is the one evicted');
});

test('the memo never evicts on a re-insert: two concurrent cold misses on ONE record cost one eviction, not two', async () => {
  // The review caught `memoSet` evicting whenever the memo was full, before checking whether
  // the key was already present — reachable because the genesis re-read is an await between
  // the miss and the insert, so two appends on one evicted record both miss and both insert.
  const { store, reads } = memoRig();
  const g0 = await landGenesis(store, 0);
  for (let i = 1; i <= SIGNING_MEMO_CAP; i += 1) await landGenesis(store, i); // rec-0 evicted; full

  // Two appends on the evicted rec-0, dispatched together: both miss and both re-read.
  const a = storeNext(g0, 'consultation-recorded', PROBE_PAYLOAD);
  const b = storeNext(a, 'consultation-recorded', PROBE_PAYLOAD);
  const [ra, rb] = await Promise.all([
    store.appendTransition('open', a, { nonTerminal: true }),
    store.appendTransition('open', b, { nonTerminal: true }),
  ]);
  assert.ok(ra.appended && rb.appended, 'fixture: both appends land, in order');

  // Exactly one eviction happened: rec-2 (next-oldest) is still hot, rec-1 (the oldest) is cold.
  // Probe the hot record FIRST — probing the cold one first would insert it and evict rec-2 itself.
  const g1 = storeGenesis('rec-1', 'test.signed.v1', 'subject:memo-1');
  const g2 = storeGenesis('rec-2', 'test.signed.v1', 'subject:memo-2');
  reads.reset();
  assert.ok(
    (
      await store.appendTransition('open', storeNext(g2, 'consultation-recorded', PROBE_PAYLOAD), {
        nonTerminal: true,
      })
    ).appended,
  );
  assert.equal(reads.count(), 0, 'rec-2 was not evicted by the second, redundant insert');
  reads.reset();
  assert.ok(
    (
      await store.appendTransition('open', storeNext(g1, 'consultation-recorded', PROBE_PAYLOAD), {
        nonTerminal: true,
      })
    ).appended,
  );
  assert.equal(reads.count(), 1, 'rec-1 paid for the one eviction');
});

test('the memo never learns from an EMPTY chain: a non-genesis append that arrives before its genesis does not pin the record as non-signing', async () => {
  // The review's second round: `recordSigns` cached `signs = false` derived from an empty
  // chain exactly like a real non-signing answer, so a record whose genesis had not yet
  // landed was remembered as unsigned and its later genuine genesis landed with no sidecar
  // entry — which the fail-closed layer reads as chain-compromise. Reachable through the
  // public `withSigning` over a store with host-chosen recordIds; not through create().
  const inner = new MemoryStore();
  const signatures = new MemorySignatureStore();
  const signer: Signer = async () => ({ keyRef: 'key-1', signature: 'sig' });
  // A stub pair consistent with each other: the mint check needs a verifier that answers
  // true for what this signer mints; the memo assertions are about something else.
  const stubVerifiers = { 'key-1': (async () => true) as Verifier };
  const store = withSigning({ signer, verifiers: stubVerifiers, signatures }, inner, () => true);

  const genesis = storeGenesis('rec-early', 'test.signed.v1', 'subject:early');
  const early = storeNext(genesis, 'consultation-recorded', PROBE_PAYLOAD);
  const refused = await store.appendTransition('open', early, { nonTerminal: true });
  assert.equal(refused.appended, false, 'fixture: no record exists yet — the store refuses');

  const landed = await store.appendTransition(null, genesis, { nonTerminal: true });
  assert.equal(landed.appended, true);
  assert.equal(
    (await signatures.listByRecord('rec-early')).length,
    1,
    'the genesis is signed — the empty-chain read taught the memo nothing',
  );
});
