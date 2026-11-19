// @vidimera/record — transactional-sidecar.test.ts: the integrated sidecar end to end over
// `MemoryStore` and `SqliteStore`, and the rule that selects it.
//
// `withSigning` runs in one of two modes, decided once, when it is constructed
// (`signing/decorate.ts`'s header). INTEGRATED, when the configured sidecar is the store's own
// (`config.signing.signatures === config.store.signatures`): the decorator mints and checks
// before the append exactly as it always has, then hands the entries down on the append itself
// (`AppendMeta.signatures`), and the store writes them inside that append's atomic unit — after
// every check has passed, and only then. SEPARATE, otherwise: the decorator writes each entry
// itself before delegating, so every attempt that then does not land leaves its entry behind
// as an orphan. The store-level half of the contract is pinned for every backing that carries a
// sidecar in conformance/store-conformance.ts; this file pins what the two modes do end to end.
//
// Deferral-register row 22's measurement leads: the no-edge refusal path that leaves one orphan
// per refusing call in separate mode (no-edge-containment.test.ts's BASELINE pins, which keep
// measuring separate mode and are unchanged) leaves none in integrated mode. The SqliteStore
// section at the end repeats it on the embedded backing, with what only a transactional backing
// has: a host transaction that rolls an enlisted redemption back takes its entry with it, and
// the store's own transaction takes an append's transition rows with a failed entry insert.
// PostgresStore's leg lives in its own package (store-postgres's transactional-sidecar.test.ts).

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import { replay } from '../src/chain/replay.js';
import type { ConfirmProfile } from '../src/config.js';
import { createWithClock, type Surfaces } from '../src/create.js';
import type { Outcome } from '../src/outcome.js';
import { withSigning } from '../src/signing/decorate.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { SignatureEntry, SignatureStore, Signer, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import type { AppendMeta, AppendResult, BatchResult, Store } from '../src/store/store.js';
import type { Digest, RecordState, StagedDraft, Transition } from '../src/types.js';
import { storeGenesis, storeNext } from './helpers/chain.js';
import {
  captureProfile,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';
import { breakOneSignature } from './helpers/signing.js';
import { APPROVER, successBatch } from './helpers/store-fixtures.js';

const CONTENT = { subject: 'week-1', total: 40 };
const PROFILE_ID = 'test.txsidecar.v1';
const PLAIN_ID = 'test.txsidecar.plain.v1';
const SIGNING_PROFILE: ConfirmProfile = { ...captureProfile({ id: PROFILE_ID }), signing: true };

/**
 * A clock that advances one second on every read, so two refusing calls never stamp the same
 * `at` and collapse two would-be orphans onto one sidecar key (no-edge-containment.test.ts
 * measured that collapse on a real clock).
 */
function tickingClock(startIso = '2026-11-19T00:00:00Z'): () => Date {
  let ms = Date.parse(startIso);
  return () => {
    ms += 1000;
    return new Date(ms);
  };
}

/** A ticking clock the test can also jump forward. */
function movableClock(startIso = '2026-11-19T00:00:00Z') {
  let ms = Date.parse(startIso);
  return {
    now: () => {
      ms += 1000;
      return new Date(ms);
    },
    advance: (deltaMs: number) => {
      ms += deltaMs;
    },
  };
}

/**
 * A Store wrapper that records the `meta` of every append handed down to it, then delegates
 * intact — `meta` and `tx` untouched — to an inner store. Whether it exposes a `signatures`
 * of its own is the caller's choice, and that choice is the wrapper rule this file pins: a
 * wrapper that exposes the sidecar it is configured with and forwards `meta` intact keeps
 * integrated mode; one that exposes none runs in separate mode. The field is mutable so a pin
 * can expose it only after the decorator was built. `beforeNextBatch` is a one-shot window: run
 * (and cleared) before the next `appendBatch` is recorded and forwarded, it lets a second writer
 * land between a seam's chain read and its batch.
 */
class MetaRecordingStore implements Store {
  readonly appends: { transitions: readonly Transition[]; meta: AppendMeta }[] = [];
  signatures?: SignatureStore;
  beforeNextBatch: (() => Promise<void>) | undefined;

  constructor(
    readonly inner: Store,
    sidecar?: SignatureStore,
  ) {
    if (sidecar !== undefined) this.signatures = sidecar;
  }
  putStaged(s: StagedDraft, tx?: unknown): Promise<void> {
    return this.inner.putStaged(s, tx);
  }
  getStaged(r: string): Promise<StagedDraft | null> {
    return this.inner.getStaged(r);
  }
  chainHead(r: string): Promise<Digest | null> {
    return this.inner.chainHead(r);
  }
  appendTransition(
    e: RecordState | null,
    t: Transition,
    m: AppendMeta,
    tx?: unknown,
  ): Promise<AppendResult> {
    this.appends.push({ transitions: [t], meta: m });
    return this.inner.appendTransition(e, t, m, tx);
  }
  async appendBatch(
    e: RecordState,
    transitions: readonly Transition[],
    m: AppendMeta,
    tx?: unknown,
  ): Promise<BatchResult> {
    const before = this.beforeNextBatch;
    if (before !== undefined) {
      this.beforeNextBatch = undefined;
      await before();
    }
    this.appends.push({ transitions, meta: m });
    return this.inner.appendBatch(e, transitions, m, tx);
  }
  readChain(r: string): Promise<Transition[]> {
    return this.inner.readChain(r);
  }
  listDue(now: Date): Promise<string[]> {
    return this.inner.listDue(now);
  }
  findNonTerminal(p: string, s: string): Promise<string | null> {
    return this.inner.findNonTerminal(p, s);
  }
}

/**
 * A real Ed25519 signer that counts its mints, its verifier, and an instance over `store` with
 * `signatures` as the configured sidecar. Which mode the instance runs in is decided by
 * whether `signatures` is `store.signatures` — the rig does not choose it.
 */
function signingRig(opts: {
  store: Store;
  signatures: SignatureStore;
  clock?: () => Date;
  profiles?: ConfirmProfile[];
}) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  let mints = 0;
  const signer: Signer = async (bytes) => {
    mints += 1;
    return { keyRef: 'key-1', signature: edSign(null, bytes, privateKey).toString('base64') };
  };
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  const config = {
    ...makeConfig(opts.profiles ?? [SIGNING_PROFILE], { store: opts.store }),
    signing: { signer, verifiers: { 'key-1': verifier }, signatures: opts.signatures },
  };
  return {
    handles: createWithClock(config, opts.clock ?? tickingClock()),
    mints: () => mints,
  };
}

/** Integrated mode over a bare `MemoryStore`: the configured sidecar IS the store's own. */
function integratedRig(clock?: () => Date) {
  const store = new MemoryStore();
  const signatures = store.signatures;
  return { ...signingRig({ store, signatures, clock }), store, signatures };
}

/** Opens and confirms a record — terminal `confirmed` on a capture profile. */
async function confirmedRecord(handles: Surfaces, subjectRef: string, profileId = PROFILE_ID) {
  const recordId = await openRecord(handles, CONTENT, profileId, subjectRef);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record confirms');
  return recordId;
}

/**
 * The sealed no-edge corner: a confirmed signing record, sealed, with its genesis entry broken
 * so every later `finalize()` refuses `chain-compromise` — and, C4 barring every candidate, can
 * land no edge.
 */
async function sealedNoEdgeRecord(
  handles: Surfaces,
  signatures: SignatureStore,
  store: Store,
  subjectRef: string,
) {
  const recordId = await confirmedRecord(handles, subjectRef);
  assert.equal((await handles.operator.seal(recordId)).status, 'ok', 'fixture: sealed');
  await breakOneSignature(signatures, recordId, store);
  return recordId;
}

/** The no-edge refusal shape: `chain-compromise`, compromise-classed, and NO transitionRef. */
function assertNoEdgeRefusal(out: Outcome<unknown>, label: string): void {
  assert.equal(out.status, 'refused', `${label}: refused`);
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise', `${label}: chain-compromise`);
  assert.equal(out.class, 'compromise', `${label}: compromise-classed`);
  assert.equal(out.transitionRef, undefined, `${label}: no edge landed, so no transitionRef`);
}

/** The sidecar's digests for a record, sorted — no sidecar promises an order. */
async function sidecarDigests(signatures: SignatureStore, recordId: string): Promise<string[]> {
  return (await signatures.listByRecord(recordId)).map((e) => e.transitionDigest).sort();
}

/** The persisted chain's digests for a record, sorted to compare with `sidecarDigests`. */
async function chainDigests(store: Store, recordId: string): Promise<string[]> {
  return (await store.readChain(recordId)).map((t) => transitionDigest(t)).sort();
}

// === row 22, integrated: the sidecar stays the chain ======================================

test('ROW 22, integrated — six refusing finalize() calls against a sealed signing record leave the sidecar equal to the chain: zero orphans', async () => {
  const rig = integratedRig();
  const recordId = await sealedNoEdgeRecord(
    rig.handles,
    rig.signatures,
    rig.store,
    'subject:tx-sealed',
  );
  const chainLength = (await rig.store.readChain(recordId)).length;
  assert.deepEqual(
    await sidecarDigests(rig.signatures, recordId),
    await chainDigests(rig.store, recordId),
    'fixture: one entry per landed transition before the refusing calls',
  );

  const mintsBefore = rig.mints();
  for (let call = 1; call <= 6; call += 1) {
    const out = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assertNoEdgeRefusal(out, `sealed corner, call ${call}`);
    assert.equal((await rig.store.readChain(recordId)).length, chainLength, 'chain flat');
    assert.equal(
      (await rig.signatures.listByRecord(recordId)).length,
      chainLength,
      `the sidecar's length is the chain's (call ${call}) — separate mode grows it by one per call`,
    );
    // The mint and its check still run before the append, memoized per transition object as in
    // separate mode: the walk's three candidates share one mint. Only the write moved.
    assert.equal(rig.mints() - mintsBefore, call, 'one mint per refusing call, unchanged');
  }
  assert.deepEqual(
    await sidecarDigests(rig.signatures, recordId),
    await chainDigests(rig.store, recordId),
    'the sidecar is exactly the chain',
  );
  const report = await rig.handles.operator.verifySignatures(recordId);
  assert.deepEqual(report.orphans, [], 'zero orphans');
});

test("open()'s expire-then-retry under a moving clock leaves no orphan genesis: the attempt that lost C1 is minted and checked, never written", async () => {
  const clock = movableClock();
  const rig = integratedRig(clock.now);
  const subjectRef = 'subject:tx-retry';
  const blocker = await openRecord(rig.handles, CONTENT, PROFILE_ID, subjectRef);
  clock.advance(2 * 3600 * 1000); // past the capture profile's one-hour open window

  const mintsBefore = rig.mints();
  const second = await openRecord(rig.handles, CONTENT, PROFILE_ID, subjectRef);
  assert.notEqual(second, blocker, 'a new record opened after the lapsed blocker expired');
  assert.equal(replay(await rig.store.readChain(blocker)).state, 'expired', 'blocker expired');
  // Three mints, exactly as in separate mode: the genesis attempt that loses C1, the blocker's
  // `expired` edge, and the retry — re-stamped by the moved clock, so distinct bytes. Separate
  // mode writes all three and leaves the first as a lost-genesis orphan; here it is never written.
  assert.equal(rig.mints() - mintsBefore, 3, 'three mints: attempt, expiry, retry');

  for (const [label, recordId] of [
    ['the blocker', blocker],
    ['the retried record', second],
  ] as const) {
    assert.deepEqual(
      await sidecarDigests(rig.signatures, recordId),
      await chainDigests(rig.store, recordId),
      `${label}: the sidecar is exactly the chain`,
    );
    const report = await rig.handles.operator.verifySignatures(recordId);
    assert.deepEqual(report.orphans, [], `${label}: no orphan`);
    assert.ok(
      report.transitions.every((t) => t.signed && t.verified),
      `${label}: every landed transition is signed and verifies`,
    );
  }
});

// === mode selection: integrated on identity, and only on identity =========================

test('MemoryStore exposes its own sidecar — one stable object per store — so the conformance suite registers its integrated-sidecar block for this backing', () => {
  const store = new MemoryStore();
  assert.ok(store.signatures !== undefined, 'the sidecar is exposed');
  assert.equal(typeof store.signatures.put, 'function');
  assert.equal(typeof store.signatures.listByRecord, 'function');
  assert.equal(store.signatures, store.signatures, 'stable: identity is what selects the mode');
  assert.notEqual(new MemoryStore().signatures, store.signatures, 'each store has its own');
});

test("MODE — identity selects integrated: every signed append hands its entries down in order, the configured sidecar's put is never called, and a non-signing record's appends carry none", async () => {
  // The wrapper rule's positive half: this wrapper exposes the sidecar it is configured with and
  // forwards `meta` intact, so the decorator sees `signatures === store.signatures`. The exposed
  // sidecar counts `put` calls and reads through to the inner store's own sidecar, which is
  // where the inner store writes what the appends carry.
  const inner = new MemoryStore();
  let puts = 0;
  const sidecar: SignatureStore = {
    put: async (entry) => {
      puts += 1;
      await inner.signatures.put(entry);
    },
    listByRecord: (recordId) => inner.signatures.listByRecord(recordId),
  };
  const wrapper = new MetaRecordingStore(inner, sidecar);
  const rig = signingRig({
    store: wrapper,
    signatures: sidecar,
    profiles: [SIGNING_PROFILE, captureProfile({ id: PLAIN_ID })],
  });

  const signedId = await confirmedRecord(rig.handles, 'subject:tx-mode-signed');
  const plainId = await confirmedRecord(rig.handles, 'subject:tx-mode-plain', PLAIN_ID);
  assert.equal(puts, 0, 'integrated mode never calls put: the store writes the entries');

  const forSigned = wrapper.appends.filter((a) => a.transitions[0]?.recordId === signedId);
  assert.equal(forSigned.length, 2, 'fixture: the genesis and the finalize batch');
  for (const { transitions, meta } of forSigned) {
    const entries = meta.signatures;
    assert.ok(entries !== undefined, 'a signed append carries its entries');
    assert.equal(entries.length, transitions.length, 'one entry per transition');
    for (const [i, t] of transitions.entries()) {
      const entry: SignatureEntry | undefined = entries[i];
      assert.ok(entry !== undefined);
      assert.equal(entry.transitionDigest, transitionDigest(t), `entry ${i}: its own digest`);
      assert.equal(entry.recordId, t.recordId, `entry ${i}: its own recordId`);
      assert.equal(entry.seq, t.seq, `entry ${i}: its own seq, in order`);
      assert.equal(entry.keyRef, 'key-1');
    }
  }
  assert.deepEqual(
    await sidecarDigests(sidecar, signedId),
    await chainDigests(inner, signedId),
    'the signed record: the sidecar is exactly the chain',
  );

  const forPlain = wrapper.appends.filter((a) => a.transitions[0]?.recordId === plainId);
  assert.equal(forPlain.length, 2, 'fixture: the genesis and the finalize batch');
  for (const { meta } of forPlain) {
    assert.equal('signatures' in meta, false, 'a non-signing record carries no entries');
  }
  assert.deepEqual(await sidecar.listByRecord(plainId), [], 'and has none in the sidecar');
});

test('MODE — a different MemorySignatureStore selects separate: the store is never handed an entry, and the old orphan behavior is intact', async () => {
  const store = new MemoryStore();
  const separate = new MemorySignatureStore();
  const rig = signingRig({ store, signatures: separate });
  const recordId = await sealedNoEdgeRecord(rig.handles, separate, store, 'subject:tx-separate');

  const chainLength = (await store.readChain(recordId)).length;
  const sidecarBefore = (await separate.listByRecord(recordId)).length;
  for (let call = 1; call <= 3; call += 1) {
    const out = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assertNoEdgeRefusal(out, `separate mode, call ${call}`);
    assert.equal((await store.readChain(recordId)).length, chainLength, 'chain flat');
    assert.equal(
      (await separate.listByRecord(recordId)).length,
      sidecarBefore + call,
      `one orphan per refusing call, as before (call ${call})`,
    );
    const report = await rig.handles.operator.verifySignatures(recordId);
    assert.equal(report.orphans.length, call, 'the report names each orphan');
  }
  assert.deepEqual(
    await store.signatures.listByRecord(recordId),
    [],
    "the store's own sidecar was never written: no append carried an entry",
  );
});

test("MODE — a wrapper that does not expose `signatures` selects separate, even configured with the inner store's own sidecar", async () => {
  // The wrapper rule's negative half: the decorator compares against the store it is handed,
  // and this one exposes no sidecar, so identity fails and the entries are put before each
  // append — orphans included — exactly as in separate mode.
  const inner = new MemoryStore();
  const wrapper = new MetaRecordingStore(inner);
  const rig = signingRig({ store: wrapper, signatures: inner.signatures });
  const recordId = await sealedNoEdgeRecord(
    rig.handles,
    inner.signatures,
    inner,
    'subject:tx-wrapper',
  );

  const sidecarBefore = (await inner.signatures.listByRecord(recordId)).length;
  for (let call = 1; call <= 3; call += 1) {
    const out = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assertNoEdgeRefusal(out, `hidden sidecar, call ${call}`);
    assert.equal(
      (await inner.signatures.listByRecord(recordId)).length,
      sidecarBefore + call,
      `one orphan per refusing call (call ${call})`,
    );
  }
  assert.ok(wrapper.appends.length > 0, 'fixture: appends were handed down');
  assert.ok(
    wrapper.appends.every(({ meta }) => !('signatures' in meta)),
    'no append handed down carried meta.signatures',
  );
});

test('MODE — decided once, at construction: a store that exposes the sidecar only after the decorator was built stays in separate mode', async () => {
  const inner = new MemoryStore();
  const wrapper = new MetaRecordingStore(inner);
  const rig = signingRig({ store: wrapper, signatures: inner.signatures });
  wrapper.signatures = inner.signatures; // identity holds from here on, but only from here on

  const recordId = await confirmedRecord(rig.handles, 'subject:tx-late');
  assert.ok(wrapper.appends.length > 0, 'fixture: appends were handed down');
  assert.ok(
    wrapper.appends.every(({ meta }) => !('signatures' in meta)),
    'no append carried entries: the mode did not change under the instance',
  );
  assert.deepEqual(
    await sidecarDigests(inner.signatures, recordId),
    await chainDigests(inner, recordId),
    "fixture: separate mode's puts signed every landed transition",
  );
});

// === the store-side check and the decorator-side order ====================================

test('MemoryStore: a mismatched meta.signatures throws before any other check, and leaves the record and its bookkeeping untouched', async () => {
  const store = new MemoryStore();
  const entry = (t: Transition) => ({
    transitionDigest: transitionDigest(t),
    recordId: t.recordId,
    seq: t.seq,
    keyRef: 'key-1',
    signature: `sig:${t.seq}`,
  });
  const dueAt = '2026-07-24T12:00:00.000Z';
  const later = new Date(Date.UTC(2100, 0, 1));
  const genesis = storeGenesis('rec-tx-mismatch', 'profile.p1', 'subject:tx-mismatch');

  // A genesis: no record, no C1 hold, no pending clock, no entry.
  await assert.rejects(
    () =>
      store.appendTransition(null, genesis, {
        nonTerminal: true,
        dueAt,
        signatures: [{ ...entry(genesis), seq: 2 }],
      }),
    /MemoryStore: meta\.signatures/,
  );
  assert.deepEqual(await store.readChain('rec-tx-mismatch'), []);
  assert.equal(await store.findNonTerminal('profile.p1', 'subject:tx-mismatch'), null);
  assert.deepEqual(await store.listDue(later), []);
  assert.deepEqual(await store.signatures.listByRecord('rec-tx-mismatch'), []);

  const opened = await store.appendTransition(null, genesis, {
    nonTerminal: true,
    dueAt,
    signatures: [entry(genesis)],
  });
  assert.equal(opened.appended, true, 'fixture: the genesis lands, rightly signed');

  // Checked FIRST: an append that would also have conflicted throws rather than conflicting.
  await assert.rejects(
    () => store.appendTransition(null, genesis, { nonTerminal: true, signatures: [] }),
    /MemoryStore: meta\.signatures/,
    'a genesis against an existing record, miscounted',
  );

  // A subsequent append and a batch: the record stays `open`, live, and due.
  const confirmed = storeNext(genesis, 'confirmed', { actor: { principal: 'a', authority: 's' } });
  await assert.rejects(
    () =>
      store.appendTransition('open', confirmed, {
        nonTerminal: false,
        signatures: [entry(genesis)],
      }),
    /MemoryStore: meta\.signatures/,
  );
  const batch = successBatch(genesis);
  await assert.rejects(
    () =>
      store.appendBatch('open', batch, {
        nonTerminal: false,
        signatures: batch.slice(1).map(entry),
      }),
    /MemoryStore: meta\.signatures/,
  );
  assert.deepEqual(await store.readChain('rec-tx-mismatch'), [genesis], 'the chain is unchanged');
  assert.equal(
    await store.findNonTerminal('profile.p1', 'subject:tx-mismatch'),
    'rec-tx-mismatch',
    'still the live record for its pair',
  );
  assert.deepEqual(await store.listDue(later), ['rec-tx-mismatch'], 'its clock untouched');
  assert.deepEqual(
    (await store.signatures.listByRecord('rec-tx-mismatch')).map((e) => e.seq),
    [1],
  );
  const landed = await store.appendBatch('open', batch, {
    nonTerminal: false,
    signatures: batch.map(entry),
  });
  assert.equal(landed.appended, true, 'the record is still `open`: the right batch lands');
});

test('integrated mode keeps the mint and its check before the append: a batch whose second element fails the mint check throws, with nothing appended and nothing written', async () => {
  const store = new MemoryStore();
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  let mint = 0;
  const signer: Signer = async (bytes) => {
    mint += 1;
    // The third mint is the batch's second element; it names a key the registry does not hold.
    return {
      keyRef: mint === 3 ? 'key-unknown' : 'key-1',
      signature: edSign(null, bytes, privateKey).toString('base64'),
    };
  };
  const verifiers: Record<string, Verifier> = {
    'key-1': async (bytes, signature) =>
      edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64')),
  };
  const decorated = withSigning(
    { signer, verifiers, signatures: store.signatures },
    store,
    () => true,
  );

  const genesis = storeGenesis('rec-tx-mint', 'profile.p1', 'subject:tx-mint');
  const opened = await decorated.appendTransition(null, genesis, { nonTerminal: true });
  assert.equal(opened.appended, true, 'fixture: the genesis lands, signed');
  await assert.rejects(
    () => decorated.appendBatch('open', successBatch(genesis), { nonTerminal: false }),
    /holds no verifier for it/,
  );
  assert.equal(mint, 3, 'the batch stopped at its second element');
  assert.deepEqual(await store.readChain('rec-tx-mint'), [genesis], 'nothing appended');
  assert.deepEqual(
    await sidecarDigests(store.signatures, 'rec-tx-mint'),
    [transitionDigest(genesis)],
    'nothing written: only the genesis entry',
  );
});

// === record-contended: a batch that loses to a concurrent finding writes no entry ==========
//
// finalize() reads the chain, then appends its batch; a state-preserving finding that lands in
// between keeps the record `open`, so the batch passes the entry compare-and-swap and loses on
// seq — `record-contended`, never-appends. In separate mode its three entries are put before the
// append and stay as orphans. Run on both backings, over a wrapper that exposes the inner store's
// own sidecar and forwards `meta` intact, so the instance runs integrated — and the pin reads the
// losing batch's `meta` to show it did: the entries were handed down, and the store dropped them.

const FLOW_ID = 'test.txsidecar.flow.v1';
const RACE_RAISER = { principal: 'checker:race', authority: 'mtls:checker' };

/** A signing capture profile whose leg declares the findings flow, gating only on `variance`. */
function flowSigningProfile(): ConfirmProfile {
  const p = captureProfile({ id: FLOW_ID });
  const legs = p.legs.map((leg) => ({
    ...leg,
    ackMode: 'any' as const,
    requiredAcks: ['variance'],
  }));
  return { ...p, legs, signing: true };
}

for (const [backing, makeInner] of [
  ['MemoryStore', () => new MemoryStore()],
  ['SqliteStore', () => new SqliteStore(':memory:')],
] as const) {
  test(`${backing}, integrated — a finalize batch that loses to a concurrent finding refuses record-contended, and its entries, handed down with it, are never written`, async () => {
    const inner = makeInner();
    const wrapper = new MetaRecordingStore(inner, inner.signatures);
    const rig = signingRig({
      store: wrapper,
      signatures: inner.signatures,
      profiles: [flowSigningProfile()],
    });
    const recordId = await openRecord(rig.handles, CONTENT, FLOW_ID, 'subject:tx-contended');
    wrapper.beforeNextBatch = async () => {
      const raised = await rig.handles.operator.raiseFinding(
        recordId,
        { findingId: 'f-race', kind: 'note', findingDigest: `sha256:${'a'.repeat(64)}` },
        RACE_RAISER,
      );
      assert.equal(raised.status, 'ok', 'fixture: the racing finding genuinely lands');
    };

    const out = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(out.status, 'refused', 'the batch lost its race');
    if (out.status !== 'refused') return;
    assert.equal(out.code, 'record-contended');
    assert.equal(out.transitionRef, undefined, 'never-appends: no edge landed');
    assert.deepEqual(
      (await inner.readChain(recordId)).map((t) => t.kind),
      ['opened', 'finding-raised'],
      'only the racing finding is on the chain',
    );

    const lost = wrapper.appends.find((a) => a.transitions.length > 1);
    assert.ok(lost !== undefined, 'fixture: the batch was handed down');
    assert.equal(
      lost.meta.signatures?.length,
      lost.transitions.length,
      'integrated: the losing batch carried one entry per element down to the store',
    );
    const written = await sidecarDigests(inner.signatures, recordId);
    assert.deepEqual(
      written,
      await chainDigests(inner, recordId),
      'the sidecar is exactly the chain',
    );
    for (const t of lost.transitions) {
      assert.ok(!written.includes(transitionDigest(t)), `no entry for the losing ${t.kind}`);
    }
    const report = await rig.handles.operator.verifySignatures(recordId);
    assert.deepEqual(report.orphans, [], 'zero orphans');

    const again = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(again.status, 'ok', 'fixture: re-invoked, the seam confirms over the new head');
    assert.deepEqual(
      await sidecarDigests(inner.signatures, recordId),
      await chainDigests(inner, recordId),
      'the batch that lands writes its entries',
    );
  });
}

// === SqliteStore: the same integrated sidecar, on the embedded backing =====================

const EFFECT_ID = 'test.txsidecar.effect.v1';
const EFFECT_PROFILE: ConfirmProfile = { ...effectSeamProfile({ id: EFFECT_ID }), signing: true };

/** Integrated mode over a bare `SqliteStore`: the configured sidecar IS the store's own table. */
function sqliteIntegratedRig(clock?: () => Date) {
  const store = new SqliteStore(':memory:');
  const signatures = store.signatures;
  return { ...signingRig({ store, signatures, clock }), store, signatures };
}

test('SqliteStore exposes its own sidecar — one stable object per store — so the conformance suite registers its integrated-sidecar block, and its enlisted pins, for this backing', () => {
  const store = new SqliteStore(':memory:');
  assert.ok(store.signatures !== undefined, 'the sidecar is exposed');
  assert.equal(typeof store.signatures.put, 'function');
  assert.equal(typeof store.signatures.listByRecord, 'function');
  assert.equal(store.signatures, store.signatures, 'stable: identity is what selects the mode');
  assert.notEqual(
    new SqliteStore(':memory:').signatures,
    store.signatures,
    'each store has its own',
  );
});

test('ROW 22, integrated, SqliteStore — six refusing finalize() calls against a sealed signing record leave the sidecar table equal to the chain: zero orphans', async () => {
  const rig = sqliteIntegratedRig();
  const recordId = await sealedNoEdgeRecord(
    rig.handles,
    rig.signatures,
    rig.store,
    'subject:tx-sqlite-sealed',
  );
  const chainLength = (await rig.store.readChain(recordId)).length;
  assert.deepEqual(
    await sidecarDigests(rig.signatures, recordId),
    await chainDigests(rig.store, recordId),
    'fixture: one entry per landed transition before the refusing calls',
  );

  const mintsBefore = rig.mints();
  for (let call = 1; call <= 6; call += 1) {
    const out = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assertNoEdgeRefusal(out, `sealed corner, call ${call}`);
    assert.equal((await rig.store.readChain(recordId)).length, chainLength, 'chain flat');
    assert.equal(
      (await rig.signatures.listByRecord(recordId)).length,
      chainLength,
      `the sidecar's length is the chain's (call ${call})`,
    );
    assert.equal(rig.mints() - mintsBefore, call, 'one mint per refusing call, unchanged');
  }
  assert.deepEqual(
    await sidecarDigests(rig.signatures, recordId),
    await chainDigests(rig.store, recordId),
    'the sidecar is exactly the chain',
  );
  const report = await rig.handles.operator.verifySignatures(recordId);
  assert.deepEqual(report.orphans, [], 'zero orphans');
});

test("SqliteStore, integrated — open()'s expire-then-retry under a moving clock leaves no orphan genesis", async () => {
  const clock = movableClock();
  const rig = sqliteIntegratedRig(clock.now);
  const subjectRef = 'subject:tx-sqlite-retry';
  const blocker = await openRecord(rig.handles, CONTENT, PROFILE_ID, subjectRef);
  clock.advance(2 * 3600 * 1000); // past the capture profile's one-hour open window

  const mintsBefore = rig.mints();
  const second = await openRecord(rig.handles, CONTENT, PROFILE_ID, subjectRef);
  assert.notEqual(second, blocker, 'a new record opened after the lapsed blocker expired');
  assert.equal(replay(await rig.store.readChain(blocker)).state, 'expired', 'blocker expired');
  assert.equal(rig.mints() - mintsBefore, 3, 'three mints: attempt, expiry, retry');

  for (const [label, recordId] of [
    ['the blocker', blocker],
    ['the retried record', second],
  ] as const) {
    assert.deepEqual(
      await sidecarDigests(rig.signatures, recordId),
      await chainDigests(rig.store, recordId),
      `${label}: the sidecar is exactly the chain`,
    );
    const report = await rig.handles.operator.verifySignatures(recordId);
    assert.deepEqual(report.orphans, [], `${label}: no orphan`);
    assert.ok(
      report.transitions.every((t) => t.signed && t.verified),
      `${label}: every landed transition is signed and verifies`,
    );
  }
});

test('SqliteStore, integrated — a redemption enlisted in a host transaction writes its entry inside that transaction, and the ROLLBACK takes the entry with the transition: no orphan, and the record still redeems, signed', async () => {
  const store = new SqliteStore(':memory:');
  const rig = signingRig({ store, signatures: store.signatures, profiles: [EFFECT_PROFILE] });
  const recordId = await confirmedRecord(rig.handles, 'subject:tx-sqlite-rollback', EFFECT_ID);
  const committed = await chainDigests(store, recordId);
  assert.deepEqual(
    await sidecarDigests(store.signatures, recordId),
    committed,
    'fixture: the confirmed record is fully signed',
  );

  store.database.exec('BEGIN IMMEDIATE');
  try {
    const redeemed = await rig.handles.operator.redeem(recordId, CONTENT, { tx: store.database });
    assert.equal(
      redeemed.status,
      'ok',
      'fixture: the enlisted redemption lands in the transaction',
    );
    const head = (await store.readChain(recordId)).at(-1);
    assert.ok(
      head !== undefined && head.kind === 'redeemed',
      'fixture: the redemption is the head',
    );
    assert.ok(
      (await sidecarDigests(store.signatures, recordId)).includes(transitionDigest(head)),
      'inside the transaction, on its connection, the entry is written with the transition',
    );
  } finally {
    store.database.exec('ROLLBACK');
  }

  assert.deepEqual(await chainDigests(store, recordId), committed, 'the redemption rolled back');
  assert.deepEqual(
    await sidecarDigests(store.signatures, recordId),
    committed,
    'and its entry with it',
  );
  const report = await rig.handles.operator.verifySignatures(recordId);
  assert.deepEqual(report.orphans, [], 'zero orphans: no signature outlived the append');

  const again = await rig.handles.operator.redeem(recordId, CONTENT);
  assert.equal(again.status, 'ok', 'fixture: the record is still confirmed, and redeems');
  assert.deepEqual(
    await sidecarDigests(store.signatures, recordId),
    await chainDigests(store, recordId),
    'the redemption that commits is signed',
  );
});

test('SqliteStore: a database file from before the sidecar gains its table on open — its chain intact and unsigned, and the next append carrying entries writes them', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'vidimera-txsidecar-'));
  const opened: SqliteStore[] = [];
  try {
    const path = join(dir, 'store.db');
    const sidecarTables = (store: SqliteStore): number =>
      (
        store.database
          .prepare(
            "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'signatures'",
          )
          .get() as { n: number }
      ).n;

    // The file as an earlier build left it: a record on its chain, and no sidecar table.
    const earlier = new SqliteStore(path);
    opened.push(earlier);
    const genesis = storeGenesis('rec-tx-legacy', 'profile.p1', 'subject:tx-legacy');
    await earlier.appendTransition(null, genesis, { nonTerminal: true });
    earlier.database.exec('DROP TABLE IF EXISTS signatures');
    assert.equal(sidecarTables(earlier), 0, 'fixture: the file holds no sidecar table');
    earlier.close();

    const reopened = new SqliteStore(path);
    opened.push(reopened);
    assert.equal(sidecarTables(reopened), 1, 'opening the file created the table');
    const indexes = reopened.database
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'signatures'")
      .all() as { sql: string | null }[];
    assert.ok(
      indexes.some((r) => r.sql?.includes('record_id') === true),
      'with its index on record_id',
    );
    assert.deepEqual(await reopened.readChain('rec-tx-legacy'), [genesis], 'the chain is intact');
    assert.deepEqual(
      await reopened.signatures.listByRecord('rec-tx-legacy'),
      [],
      'and unsigned: opening the file migrates nothing',
    );

    const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
    const entry: SignatureEntry = {
      transitionDigest: transitionDigest(confirmed),
      recordId: 'rec-tx-legacy',
      seq: 2,
      keyRef: 'key-1',
      signature: 'sig:legacy:2',
    };
    const res = await reopened.appendTransition('open', confirmed, {
      nonTerminal: false,
      signatures: [entry],
    });
    assert.equal(res.appended, true, 'fixture: the append lands');
    assert.deepEqual(await reopened.signatures.listByRecord('rec-tx-legacy'), [entry]);
  } finally {
    for (const store of opened) if (store.database.isOpen) store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("SqliteStore: atomicity on the store's own transaction — an entry insert that fails takes the append's transition rows with it, for a genesis, a subsequent append and a batch", async () => {
  // The conformance suite's enlisted pins show the entries ride a HOST transaction; this shows
  // they ride the store's OWN. A trigger refuses every insert into the sidecar table, so each
  // append that carries entries fails at its entry insert — after its transition rows — and the
  // store's own ROLLBACK must take those rows with it. An insert moved after the store's COMMIT
  // would still reject, but would leave the transition landed, unsigned.
  const store = new SqliteStore(':memory:');
  const entry = (t: Transition): SignatureEntry => ({
    transitionDigest: transitionDigest(t),
    recordId: t.recordId,
    seq: t.seq,
    keyRef: 'key-1',
    signature: `sig:${t.recordId}:${t.seq}`,
  });
  const genesis = storeGenesis('rec-tx-atomic', 'profile.p1', 'subject:tx-atomic');
  // An append carrying no entries inserts none, so the trigger never fires for this one.
  assert.equal((await store.appendTransition(null, genesis, { nonTerminal: true })).appended, true);
  store.database.exec(
    'CREATE TRIGGER refuse_entry BEFORE INSERT ON signatures ' +
      "BEGIN SELECT RAISE(ABORT, 'entry insert refused by the test trigger'); END",
  );

  const other = storeGenesis('rec-tx-atomic-2', 'profile.p1', 'subject:tx-atomic-2');
  await assert.rejects(
    () => store.appendTransition(null, other, { nonTerminal: true, signatures: [entry(other)] }),
    /refused by the test trigger/,
    'a genesis',
  );
  assert.deepEqual(await store.readChain('rec-tx-atomic-2'), [], 'no genesis landed');
  assert.equal(
    await store.findNonTerminal('profile.p1', 'subject:tx-atomic-2'),
    null,
    'nor its record row',
  );

  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  await assert.rejects(
    () =>
      store.appendTransition('open', confirmed, {
        nonTerminal: false,
        signatures: [entry(confirmed)],
      }),
    /refused by the test trigger/,
    'a subsequent append',
  );
  assert.deepEqual(
    await store.readChain('rec-tx-atomic'),
    [genesis],
    'no subsequent append landed',
  );
  const batch = successBatch(genesis);
  await assert.rejects(
    () => store.appendBatch('open', batch, { nonTerminal: false, signatures: batch.map(entry) }),
    /refused by the test trigger/,
    'a batch',
  );
  assert.deepEqual(await store.readChain('rec-tx-atomic'), [genesis], 'no batch element landed');
  assert.deepEqual(await store.signatures.listByRecord('rec-tx-atomic'), []);
  assert.deepEqual(await store.signatures.listByRecord('rec-tx-atomic-2'), []);

  // The control: without the trigger the same appends land, with their entries — the record
  // was left `open` and live, exactly where it was.
  store.database.exec('DROP TRIGGER refuse_entry');
  const opened = await store.appendTransition(null, other, {
    nonTerminal: true,
    signatures: [entry(other)],
  });
  assert.equal(opened.appended, true, 'the genesis lands');
  const landed = await store.appendBatch('open', batch, {
    nonTerminal: false,
    signatures: batch.map(entry),
  });
  assert.equal(landed.appended, true, 'the batch lands');
  assert.deepEqual(
    await sidecarDigests(store.signatures, 'rec-tx-atomic'),
    batch.map((t) => transitionDigest(t)).sort(),
  );
  assert.deepEqual(await store.signatures.listByRecord('rec-tx-atomic-2'), [entry(other)]);
});

test('SqliteStore: an entry whose keyRef or signature is not a string is refused before anything is written — enlisted, a host that commits after the throw lands nothing', async () => {
  // Unchecked, the insert stores a numeric keyRef as other text ('42.0') and throws on a null
  // signature only at the entry insert, after the transition rows — a host that then committed
  // its transaction would land the transition unsigned. The check runs with the others, first.
  const store = new SqliteStore(':memory:');
  const genesis = storeGenesis('rec-tx-strict', 'profile.p1', 'subject:tx-strict');
  await store.appendTransition(null, genesis, { nonTerminal: true });
  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  const good: SignatureEntry = {
    transitionDigest: transitionDigest(confirmed),
    recordId: 'rec-tx-strict',
    seq: 2,
    keyRef: 'key-1',
    signature: 'sig:strict:2',
  };
  const bad: [string, unknown][] = [
    ['a numeric keyRef', { ...good, keyRef: 42 }],
    ['a null signature', { ...good, signature: null }],
  ];
  for (const [label, entry] of bad) {
    store.database.exec('BEGIN IMMEDIATE');
    try {
      await assert.rejects(
        () =>
          store.appendTransition(
            'open',
            confirmed,
            { nonTerminal: false, signatures: [entry as SignatureEntry] },
            store.database,
          ),
        /SqliteStore: meta\.signatures/,
        label,
      );
    } finally {
      store.database.exec('COMMIT'); // the host commits regardless
    }
    assert.deepEqual(
      await store.readChain('rec-tx-strict'),
      [genesis],
      `${label}: nothing was written for the host's commit to land`,
    );
  }
  assert.deepEqual(await store.signatures.listByRecord('rec-tx-strict'), []);
  const landed = await store.appendTransition('open', confirmed, {
    nonTerminal: false,
    signatures: [good],
  });
  assert.equal(landed.appended, true, 'the same append, rightly signed, lands');
});
