// @vidimera/record — no-edge-containment.test.ts (the no-edge containment increment). Pins
// over `appendChainCompromise`'s candidate walk and the signing decorator's per-attempt mint
// on the NO-EDGE path: a refusing seam call against a record whose persisted state admits no
// CAS candidate, so the compromise edge never lands while the decorator — which signs BEFORE
// delegating — has already minted and written a sidecar entry for every attempt.
//
// What this file pins, and in the same breath what it cannot. Before it, the corpus asserted
// no signer-invocation count anywhere and pinned orphan minting in neither direction, so the
// numbers here are the first of their kind and a green suite proves nothing about them on its
// own: a rejected candidate containment passed the whole record project with its new branch
// counted at ZERO firings, and another passed while measured to strip signatures from most
// concurrently-confirmed records. The counting rig below is what makes a change here visible.
//
// Two kinds of test live here, and they must be read differently:
//   - BASELINES record today's behavior — chain flat, one orphan per refusing call, one signer
//     invocation per CAS candidate — and are INVERTED by the changes that follow; the inversion
//     is the proof the change did something. Every figure was measured on this tree, not copied.
//   - The DIVERGENCE fixtures record what happens when the READ chain and the PERSISTED state
//     disagree, which is the ordinary shape of a real tamper: a length-preserving rewrite of the
//     head transition's kind — the base-level (AL1) blind spot SPEC §5 states plainly (the head
//     "is protected only once a later transition chains over it") and the one the AL2 layer
//     exists to catch. Today the walk still lands the compromise edge on both shapes, because
//     C3 and C4 are decided by the backing against its OWN persisted row, not against the chain
//     it was handed. THESE TWO TESTS MUST NOT CHANGE: any containment that predicts the store's
//     answer from the chain would suppress an evidence edge that lands today, on exactly the
//     population the signature layer serves. They are the tripwire for that whole family.
//
// Deferral-register row 22 is the finding these pins serve. Its redundant-signing half is what
// the decorator change closes; its orphan half — one sidecar entry per refusing call — stays
// open, and nothing in this file asserts the sidecar stops growing.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import { replay, verifyChain } from '../src/chain/replay.js';
import type { ConfirmProfile } from '../src/config.js';
import { createWithClock } from '../src/create.js';
import type { Outcome } from '../src/outcome.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { SignatureStore, Signer, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Store } from '../src/store/store.js';
import type { Transition } from '../src/types.js';
import { captureProfile, facts, identity, makeConfig, openRecord } from './helpers/profiles.js';
import { breakOneSignature } from './helpers/signing.js';
import { TamperingStore } from './helpers/stores.js';

const CONTENT = { subject: 'week-1', total: 40 };
const PROFILE_ID = 'test.noedge.v1';

/**
 * A clock that advances one second on every read. The compromise append stamps `at` from the
 * clock and the sidecar is keyed by the transition's digest, so two refusing calls landing in
 * the same wall-clock millisecond would collapse two orphans onto one key — observed on a
 * real clock in roughly one run in twelve when these figures were first taken. A ticking clock
 * makes "one orphan per refusing call" deterministic rather than usually true.
 */
function tickingClock(startIso = '2026-08-29T00:00:00Z'): () => Date {
  let ms = Date.parse(startIso);
  return () => {
    ms += 1000;
    return new Date(ms);
  };
}

/**
 * The counting rig: a real Ed25519 signer that counts its invocations, a `SignatureStore`
 * wrapper that counts `put` calls while delegating to a real `MemorySignatureStore`, and a
 * signing capture profile. `handles` is nested because `createWithClock()` returns the two
 * surfaces; `store` is exposed so a fixture can inject a `TamperingStore` and read the REAL
 * persisted chain beneath the decorator; every extra profile is stamped `signing: true`, or
 * the decorator would never sign it. Read the counters as DELTAS around the call under test.
 */
function countingSigningSetup(
  extraProfiles: ConfirmProfile[] = [],
  opts: { store?: Store; mintId?: () => string } = {},
) {
  const store = opts.store ?? new MemoryStore();
  const signatures = new MemorySignatureStore();
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  let signerCalls = 0;
  let putCalls = 0;
  const signer: Signer = async (bytes) => {
    signerCalls += 1;
    return { keyRef: 'key-1', signature: edSign(null, bytes, privateKey).toString('base64') };
  };
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  const counted: SignatureStore = {
    put: async (entry) => {
      putCalls += 1;
      return signatures.put(entry);
    },
    listByRecord: (recordId) => signatures.listByRecord(recordId),
  };
  const profiles: ConfirmProfile[] = [
    { ...captureProfile({ id: PROFILE_ID }), signing: true },
    ...extraProfiles.map((p) => ({ ...p, signing: true as const })),
  ];
  const config = {
    ...makeConfig(profiles, { store }),
    signing: { signer, verifiers: { 'key-1': verifier }, signatures: counted },
  };
  return {
    handles: createWithClock(config, tickingClock(), opts.mintId),
    signatures,
    store,
    signerCalls: () => signerCalls,
    putCalls: () => putCalls,
  };
}

/** The no-edge refusal shape: `chain-compromise`, compromise-classed, and NO transitionRef. */
function assertNoEdgeRefusal(out: Outcome<unknown>, label: string): void {
  assert.equal(out.status, 'refused', `${label}: refused`);
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise', `${label}: chain-compromise`);
  assert.equal(out.class, 'compromise', `${label}: compromise-classed`);
  assert.equal(out.transitionRef, undefined, `${label}: no edge landed, so no transitionRef`);
}

/** Opens and confirms a record on the rig's signing capture profile — terminal `confirmed`. */
async function confirmedSigningRecord(
  rig: ReturnType<typeof countingSigningSetup>,
  subjectRef: string,
) {
  const recordId = await openRecord(rig.handles, CONTENT, PROFILE_ID, subjectRef);
  const done = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  return recordId;
}

// === baselines: today's behavior, inverted by the changes that follow ===================

test('BASELINE — the sealed no-edge corner: six refusing finalize() calls, chain flat, one orphan and three signer calls per call', async () => {
  const rig = countingSigningSetup();
  const recordId = await confirmedSigningRecord(rig, 'subject:noedge-sealed');
  assert.equal((await rig.handles.operator.seal(recordId)).status, 'ok', 'fixture: sealed');
  await breakOneSignature(rig.signatures, recordId, rig.store);

  const chainLength = (await rig.store.readChain(recordId)).length;
  const sidecarBefore = (await rig.signatures.listByRecord(recordId)).length;
  const signerBefore = rig.signerCalls();
  const putBefore = rig.putCalls();

  // The deduped candidate list is THREE long here, not four: `sealed` is a transition kind,
  // never a record state, and replay leaves `state` at `confirmed` — see the arithmetic pin
  // below. Every candidate loses its CAS (C4 bars a sealed record unconditionally), and the
  // decorator has signed and written once per attempt before each loses.
  const CANDIDATES = 3;
  for (let call = 1; call <= 6; call += 1) {
    const out = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assertNoEdgeRefusal(out, `sealed corner, call ${call}`);
    assert.equal((await rig.store.readChain(recordId)).length, chainLength, 'chain flat');
    assert.equal(
      (await rig.signatures.listByRecord(recordId)).length,
      sidecarBefore + call,
      `sidecar grows by exactly one per refusing call (call ${call})`,
    );
    assert.equal(rig.signerCalls() - signerBefore, CANDIDATES * call, 'signer calls per call');
    assert.equal(rig.putCalls() - putBefore, CANDIDATES * call, 'one put per attempt');
  }
});

test('BASELINE — the already-refused corner: the first call LANDS the edge, then every later call takes the four-candidate no-edge path', async () => {
  const rig = countingSigningSetup();
  const recordId = await confirmedSigningRecord(rig, 'subject:noedge-refused');
  await breakOneSignature(rig.signatures, recordId, rig.store);

  const lengthBefore = (await rig.store.readChain(recordId)).length;
  const signerBefore = rig.signerCalls();
  const first = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(first.status, 'refused');
  if (first.status !== 'refused') return;
  assert.equal(first.code, 'chain-compromise');
  assert.ok(first.transitionRef !== undefined, 'the first call LANDS the compromise edge');
  const afterFirst = await rig.store.readChain(recordId);
  assert.equal(afterFirst.length, lengthBefore + 1, 'chain grew by the landed edge');
  assert.equal(afterFirst.at(-1)?.kind, 'refused');
  // `confirmed` heads the candidate list and wins its CAS through C3's compromise carve-out on
  // the first attempt, so landing costs exactly one mint.
  assert.equal(rig.signerCalls() - signerBefore, 1, 'landing the edge costs one signer call');

  // The replayed state is now `refused` — outside the static three — so the deduped list is
  // FOUR long, and no candidate can win: `refused` passes the state check but C3 bars a
  // state-leaving `refused` out of a terminal `refused` record (no carve-out), the other three
  // mismatch the persisted state.
  const CANDIDATES = 4;
  const sidecarBefore = (await rig.signatures.listByRecord(recordId)).length;
  const signerAfterFirst = rig.signerCalls();
  for (let call = 1; call <= 3; call += 1) {
    const out = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assertNoEdgeRefusal(out, `already-refused corner, call ${call}`);
    assert.equal((await rig.store.readChain(recordId)).length, lengthBefore + 1, 'chain flat');
    assert.equal(
      (await rig.signatures.listByRecord(recordId)).length,
      sidecarBefore + call,
      `one orphan per refusing call (call ${call})`,
    );
    assert.equal(rig.signerCalls() - signerAfterFirst, CANDIDATES * call, 'four mints per call');
  }
});

test('the candidate arithmetic: a sealed record folds to `confirmed`, so its no-edge walk tries three candidates, not four', async () => {
  const rig = countingSigningSetup();
  const recordId = await confirmedSigningRecord(rig, 'subject:noedge-arith');
  assert.equal((await rig.handles.operator.seal(recordId)).status, 'ok', 'fixture: sealed');
  const chain = await rig.store.readChain(recordId);
  assert.equal(chain.at(-1)?.kind, 'sealed', 'the head is the sealed transition');
  // `sealed` is a TransitionKind, never a RecordState: replay sets `status` and leaves `state`
  // untouched, so the folded state is `confirmed` and `[confirmed, open, confirmed, redeeming]`
  // dedupes to three. `stateOf('sealed')` is null for the same reason.
  assert.equal(replay(chain).state, 'confirmed');
  assert.equal(replay(chain).status, 'retired');

  await breakOneSignature(rig.signatures, recordId, rig.store);
  const before = rig.signerCalls();
  assertNoEdgeRefusal(
    await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts()),
    'sealed corner',
  );
  assert.equal(rig.signerCalls() - before, 3, 'three candidates, three mints — not four');
});

// === the divergence fixtures: read chain vs persisted state — MUST NOT CHANGE ============

/**
 * A record persisted terminal `confirmed`, read back through a `TamperingStore` whose tamper is
 * ARMED only after the record is built, so the record's own construction is never tampered.
 * The tamper is length-preserving — it rewrites the HEAD transition in place — so C2's seq
 * check still passes and `verifyChain` still reports intact: nothing chains over a head, which
 * is the base-level blind spot. Only the signature layer can see it, because the rewritten
 * head's digest has no sidecar entry. The record id is minted deterministically so the store
 * can be targeted before the record exists.
 */
async function divergenceFixture(recordId: string, rewriteHead: (head: Transition) => Transition) {
  const inner = new MemoryStore();
  let armed = false;
  const tampering = new TamperingStore(inner, recordId, (chain) => {
    if (!armed) return chain;
    const t = structuredClone(chain);
    const head = t[t.length - 1];
    if (head === undefined) throw new Error('fixture: chain has a head');
    t[t.length - 1] = rewriteHead(head);
    return t;
  });
  const rig = countingSigningSetup([], { store: tampering, mintId: () => recordId });
  const minted = await confirmedSigningRecord(rig, `subject:${recordId}`);
  assert.equal(minted, recordId, 'fixture: the deterministic id was minted');
  const persisted = await rig.handles.operator.getRecord(recordId);
  assert.equal(persisted?.state, 'confirmed', 'fixture: persisted terminal confirmed');
  assert.equal(persisted?.status, 'active', 'fixture: not sealed');
  const realBefore = await inner.readChain(recordId);
  armed = true;
  const tampered = await tampering.readChain(recordId);
  assert.equal(tampered.length, realBefore.length, 'length-preserving');
  assert.equal(verifyChain(tampered).intact, true, 'AL1 cannot see a head rewrite');
  return { rig, inner, realBefore, tampered };
}

test("DIVERGENCE (must not change) — head kind rewritten confirmed→refused: replay folds `refused`, yet the edge LANDS through C3's carve-out against the persisted `confirmed`", async () => {
  const recordId = 'rec-divergence-refused';
  const fx = await divergenceFixture(recordId, (head) => ({
    ...head,
    kind: 'refused',
    payload: { code: 'chain-compromise' },
  }));
  // The folded state is `refused` — a terminal state a chain-predicted bar would refuse to
  // walk. The persisted row still says `confirmed`: `refused` and `open` lose the state CAS,
  // `confirmed` passes it, and C3's compromise carve-out admits the state-leaving `refused`
  // append against an expected `confirmed`.
  assert.equal(replay(fx.tampered).state, 'refused');
  const out = await fx.rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.ok(
    out.transitionRef !== undefined,
    'the compromise evidence edge LANDS today — a bar predicted from the read chain would suppress it',
  );
  const real = await fx.inner.readChain(recordId);
  assert.equal(real.length, fx.realBefore.length + 1, 'the edge is in the REAL chain');
  assert.equal(real.at(-1)?.kind, 'refused');
  // Read the persisted state from the REAL store: through the tampering read the new head would
  // itself be rewritten, and that folded reading is exactly what this fixture says not to trust.
  assert.equal(replay(real).state, 'refused', 'the persisted record is now terminal refused');
});

test('DIVERGENCE (must not change) — head kind rewritten confirmed→sealed: replay folds `open`, so a terminal-state rule would not even fire, yet the edge LANDS because C4 reads the persisted `sealed` flag', async () => {
  const recordId = 'rec-divergence-sealed';
  const fx = await divergenceFixture(recordId, (head) => ({
    ...head,
    kind: 'sealed',
    payload: { chainHead: head.prevHash },
  }));
  // Replacing the confirmation with a fabricated `sealed` leaves the folded state at `open`
  // and the folded status at `retired`. A rule keyed on a sealed transition in the READ chain
  // would bar the walk; the backing's persisted row is `confirmed`, unsealed, so `open` loses
  // the state CAS, `confirmed` passes it, C4 has nothing to bar, and C3's carve-out admits the
  // edge.
  assert.equal(replay(fx.tampered).state, 'open');
  assert.equal(replay(fx.tampered).status, 'retired');
  const out = await fx.rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.ok(
    out.transitionRef !== undefined,
    'the compromise evidence edge LANDS today — a bar predicted from the read chain would suppress it',
  );
  const real = await fx.inner.readChain(recordId);
  assert.equal(real.length, fx.realBefore.length + 1, 'the edge is in the REAL chain');
  assert.equal(real.at(-1)?.kind, 'refused');
  // Read the persisted state from the REAL store: through the tampering read the new head would
  // itself be rewritten, and that folded reading is exactly what this fixture says not to trust.
  assert.equal(replay(real).state, 'refused', 'the persisted record is now terminal refused');
});
