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

import { transitionDigest } from '../src/chain/encoding.js';
import { replay, verifyChain } from '../src/chain/replay.js';
import type { ConfirmProfile } from '../src/config.js';
import { createWithClock } from '../src/create.js';
import type { Outcome } from '../src/outcome.js';
import { withSigning } from '../src/signing/decorate.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { SignatureStore, Signer, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import type { AppendMeta, AppendResult, BatchResult, Store } from '../src/store/store.js';
import type { Digest, RecordState, StagedDraft, Transition } from '../src/types.js';
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
 * A Store wrapper that records, in order, every append the decorator hands DOWN to it — one
 * `append:<digest>` event per transition, batch members included — so the sign-before-append
 * invariant can be asserted on an event SEQUENCE rather than on a boolean. Every method
 * delegates to `inner`.
 */
class EventStore implements Store {
  constructor(
    public readonly inner: Store,
    private readonly events: string[],
  ) {}
  putStaged(s: StagedDraft): Promise<void> {
    return this.inner.putStaged(s);
  }
  getStaged(r: string): Promise<StagedDraft | null> {
    return this.inner.getStaged(r);
  }
  chainHead(r: string): Promise<Digest | null> {
    return this.inner.chainHead(r);
  }
  appendTransition(e: RecordState | null, t: Transition, m: AppendMeta): Promise<AppendResult> {
    this.events.push(`append:${transitionDigest(t)}`);
    return this.inner.appendTransition(e, t, m);
  }
  appendBatch(
    e: RecordState,
    transitions: readonly Transition[],
    m: AppendMeta,
  ): Promise<BatchResult> {
    for (const t of transitions) this.events.push(`append:${transitionDigest(t)}`);
    return this.inner.appendBatch(e, transitions, m);
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
 * The counting rig: a real Ed25519 signer that counts its invocations, a `SignatureStore`
 * wrapper that counts `put` calls (and records each completed put as a `put:<digest>` event)
 * while delegating to a real `MemorySignatureStore`, an event-recording store over the caller's
 * backing, and a signing capture profile. `handles` is nested because `createWithClock()`
 * returns the two surfaces; `store` is the REAL backing beneath the decorator, so a fixture can
 * inject a `TamperingStore` and read the persisted chain; every extra profile is stamped
 * `signing: true`, or the decorator would never sign it. `swallowNextPut()` makes the next
 * `put` a silent no-op — the shape that separates a memo which shares only the mint from one
 * that would skip the write. Read the counters as DELTAS around the call under test.
 */
function countingSigningSetup(
  extraProfiles: ConfirmProfile[] = [],
  opts: { store?: Store; mintId?: () => string; clock?: () => Date } = {},
) {
  const store = opts.store ?? new MemoryStore();
  const events: string[] = [];
  const signatures = new MemorySignatureStore();
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  let signerCalls = 0;
  let putCalls = 0;
  let swallow = false;
  const signer: Signer = async (bytes) => {
    signerCalls += 1;
    return { keyRef: 'key-1', signature: edSign(null, bytes, privateKey).toString('base64') };
  };
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  const counted: SignatureStore = {
    put: async (entry) => {
      putCalls += 1;
      if (swallow) {
        swallow = false;
        events.push(`put-swallowed:${entry.transitionDigest}`);
        return;
      }
      await signatures.put(entry);
      events.push(`put:${entry.transitionDigest}`);
    },
    listByRecord: (recordId) => signatures.listByRecord(recordId),
  };
  const profiles: ConfirmProfile[] = [
    { ...captureProfile({ id: PROFILE_ID }), signing: true },
    ...extraProfiles.map((p) => ({ ...p, signing: true as const })),
  ];
  const config = {
    ...makeConfig(profiles, { store: new EventStore(store, events) }),
    signing: { signer, verifiers: { 'key-1': verifier }, signatures: counted },
  };
  return {
    handles: createWithClock(config, opts.clock ?? tickingClock(), opts.mintId),
    signatures,
    signing: config.signing,
    store,
    events,
    signerCalls: () => signerCalls,
    putCalls: () => putCalls,
    swallowNextPut: () => {
      swallow = true;
    },
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
  // decorator has written once per attempt before each loses. BEFORE the signer-result memo
  // this pin measured three MINTS per call too — one per attempt; AFTER it the three attempts
  // share one mint, because they carry the same transition object. The puts and the orphan are
  // unchanged: that is the orphan half of row 22, which nothing here closes.
  const CANDIDATES = 3;
  const MINTS_PER_CALL = 1;
  for (let call = 1; call <= 6; call += 1) {
    const out = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assertNoEdgeRefusal(out, `sealed corner, call ${call}`);
    assert.equal((await rig.store.readChain(recordId)).length, chainLength, 'chain flat');
    assert.equal(
      (await rig.signatures.listByRecord(recordId)).length,
      sidecarBefore + call,
      `sidecar grows by exactly one per refusing call (call ${call})`,
    );
    assert.equal(
      rig.signerCalls() - signerBefore,
      MINTS_PER_CALL * call,
      'one mint per refusing call (three before the memo)',
    );
    assert.equal(rig.putCalls() - putBefore, CANDIDATES * call, 'one put per attempt');
  }
});

test('BASELINE — key retirement: dropping the keyRef from the verifier registry puts a HEALTHY sealed record into permanent minting — one orphan per refusing call', async () => {
  // Deferral register row 22's key-retirement reachability shape, pinned for the first
  // time (the register's own figure was measured on a rig that is gone): the record is
  // untampered and sealed, the sidecar complete — only the registry moved. Nothing here
  // contains the growth; the pin states it.
  const rig = countingSigningSetup();
  const recordId = await confirmedSigningRecord(rig, 'subject:noedge-retired');
  assert.equal((await rig.handles.operator.seal(recordId)).status, 'ok', 'fixture: sealed');
  // NO breakOneSignature: chain and sidecar are both healthy.

  // The retired instance: same store, same sidecar, same signer — but the verifier
  // registry no longer resolves 'key-1' (the operator decommissioned the key).
  const retired = createWithClock(
    {
      ...makeConfig([{ ...captureProfile({ id: PROFILE_ID }), signing: true }], {
        store: rig.store,
      }),
      signing: { signer: rig.signing.signer, verifiers: {}, signatures: rig.signing.signatures },
    },
    tickingClock('2026-08-29T02:00:00Z'),
  );

  const chainLength = (await rig.store.readChain(recordId)).length;
  const sidecarBefore = (await rig.signatures.listByRecord(recordId)).length;
  for (let call = 1; call <= 4; call += 1) {
    const out = await retired.operator.finalize(recordId, identity(), CONTENT, facts());
    assertNoEdgeRefusal(out, `key retirement, call ${call}`);
    assert.equal((await rig.store.readChain(recordId)).length, chainLength, 'chain flat');
    assert.equal(
      (await rig.signatures.listByRecord(recordId)).length,
      sidecarBefore + call,
      `one orphan per refusing call (call ${call})`,
    );
    const report = await rig.handles.operator.verifySignatures(recordId);
    assert.equal(report.orphans.length, call, 'the report names each minted orphan');
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

  // The replayed state is now `refused` — outside the static three. BEFORE the narrowing the
  // deduped list was FOUR long and this pin measured four mints per call: `refused` passed the
  // state check but C3 barred a state-leaving `refused` out of a terminal `refused` record (no
  // carve-out), and the other three mismatched the persisted state. AFTER it, the dead
  // same-state candidate is dropped before the walk and the list is THREE long — the figure
  // the put count now records. And AFTER the signer-result memo the three attempts share ONE
  // mint (three before it, four before the narrowing). The refusal is byte-identical throughout.
  const CANDIDATES = 3;
  const MINTS_PER_CALL = 1;
  const sidecarBefore = (await rig.signatures.listByRecord(recordId)).length;
  const signerAfterFirst = rig.signerCalls();
  const putAfterFirst = rig.putCalls();
  for (let call = 1; call <= 3; call += 1) {
    const out = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assertNoEdgeRefusal(out, `already-refused corner, call ${call}`);
    assert.equal((await rig.store.readChain(recordId)).length, lengthBefore + 1, 'chain flat');
    assert.equal(
      (await rig.signatures.listByRecord(recordId)).length,
      sidecarBefore + call,
      `one orphan per refusing call (call ${call})`,
    );
    assert.equal(
      rig.putCalls() - putAfterFirst,
      CANDIDATES * call,
      'three puts per call (four before the narrowing)',
    );
    assert.equal(
      rig.signerCalls() - signerAfterFirst,
      MINTS_PER_CALL * call,
      'one mint per call (three before the memo, four before the narrowing)',
    );
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
  const putBefore = rig.putCalls();
  const signerBefore = rig.signerCalls();
  assertNoEdgeRefusal(
    await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts()),
    'sealed corner',
  );
  // The put count is the candidate count — one write per attempt. The mint count is not,
  // since the signer-result memo: three attempts, one mint (three before the memo).
  assert.equal(rig.putCalls() - putBefore, 3, 'three candidates, three puts — not four');
  assert.equal(rig.signerCalls() - signerBefore, 1, 'one mint for the three attempts');
});

// === the narrowing: the one candidate C3 can never admit is dropped ======================

test('NARROWING — on a terminal-folded record the same-state candidate is not tried: three puts per refusing call (four before), the refusal byte-identical, the sidecar still growing', async () => {
  const rig = countingSigningSetup();
  const recordId = await confirmedSigningRecord(rig, 'subject:noedge-narrowed');
  await breakOneSignature(rig.signatures, recordId, rig.store);
  const first = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(first.status, 'refused');
  if (first.status !== 'refused') return;
  assert.ok(first.transitionRef !== undefined, 'fixture: the edge landed, the record is refused');
  const chainLength = (await rig.store.readChain(recordId)).length;

  // The folded state is `refused`, a terminal state, so the same-state candidate is dead: its
  // CAS could only match a record persisted `refused`, and for that record C3 bars a
  // state-leaving `refused` append with no carve-out. Dropping it saves one signed attempt per
  // call. The three producible targets are still tried — they are adjudicated against the
  // persisted row, which the read chain does not determine (see the divergence fixtures).
  const CANDIDATES_AFTER = 3;
  const sidecarBefore = (await rig.signatures.listByRecord(recordId)).length;
  const signerBefore = rig.signerCalls();
  const putBefore = rig.putCalls();
  for (let call = 1; call <= 3; call += 1) {
    const out = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assertNoEdgeRefusal(out, `narrowed already-refused corner, call ${call}`);
    assert.equal((await rig.store.readChain(recordId)).length, chainLength, 'chain flat');
    assert.equal(rig.putCalls() - putBefore, CANDIDATES_AFTER * call, 'three puts');
    // One mint since the signer-result memo (this pin measured three when it was written, four
    // before the narrowing): the mint count no longer tracks the candidate count — the puts do.
    assert.equal(rig.signerCalls() - signerBefore, call, 'one mint per call');
    // Deliberately asserted as STILL GROWING: the narrowing does not touch orphan minting.
    // That is deferral-register row 22's orphan half, and this increment does not close it.
    assert.equal(
      (await rig.signatures.listByRecord(recordId)).length,
      sidecarBefore + call,
      'one orphan per refusing call, unchanged by the narrowing',
    );
  }
});

// === the signer-result memo: one mint per transition object, the put unchanged ============

/** A clock the test can move: ticks one second per read, and jumps on demand. */
function movableClock(startIso = '2026-08-29T00:00:00Z') {
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

test('MEMO — the compromise walk mints ONCE per refusing call where it minted once per candidate; the puts and the sidecar are unchanged', async () => {
  const rig = countingSigningSetup();
  const recordId = await confirmedSigningRecord(rig, 'subject:noedge-memo');
  assert.equal((await rig.handles.operator.seal(recordId)).status, 'ok', 'fixture: sealed');
  await breakOneSignature(rig.signatures, recordId, rig.store);

  const sidecarBefore = (await rig.signatures.listByRecord(recordId)).length;
  const signerBefore = rig.signerCalls();
  const putBefore = rig.putCalls();
  const eventsBefore = rig.events.length;
  assertNoEdgeRefusal(
    await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts()),
    'sealed corner under the memo',
  );
  // Three candidates are still tried (a sealed record folds to `confirmed`, which is not a
  // no-edge state), so three puts still happen and the sidecar still gains its one orphan —
  // but the three attempts carry the SAME transition object, whose bytes are identical, so
  // the signer is asked once. This is the redundant-signing half of row 22 closing; the
  // orphan half is visibly NOT closing in the same assertions.
  assert.equal(rig.signerCalls() - signerBefore, 1, 'one mint per refusing call');
  assert.equal(rig.putCalls() - putBefore, 3, 'the put still runs on every attempt');
  assert.equal(
    (await rig.signatures.listByRecord(recordId)).length,
    sidecarBefore + 1,
    'one orphan per refusing call — unchanged',
  );
  const puts = rig.events.slice(eventsBefore).filter((e) => e.startsWith('put:'));
  assert.equal(puts.length, 3);
  assert.equal(new Set(puts).size, 1, 'all three puts upsert ONE digest — byte-identical entries');
});

// INVERTED (the review's phase 5, authorized): this pin measured TWO mints for the
// expire-then-retry, on the ground that the retry handed the decorator the SAME genesis object
// as the first attempt. That reuse carried a stale `at`: the retried record claimed to have
// opened before the expiry edge that admitted it (exclusivity.test.ts pins the corrected
// stamp). The retry is now re-stamped from a fresh reading whenever the clock moved — and this
// file's clock ticks on every reading — so the retry is a DISTINCT transition with distinct
// bytes, which must be minted on its own: three mints for three puts, and the first attempt's
// entry is left behind as an orphan of the class `signing/store.ts` documents (a lost CAS or a
// crash leaves the entry behind; `verifySignatures().orphans` names it). Under a clock that
// did not move the bytes are identical, the same object is reused, and the old count holds;
// that case is not what this file's rig produces.
test("MEMO, inverted — open()'s expire-then-retry RE-STAMPS the retry when the clock moved: a distinct transition, so three mints for three puts, and the first attempt's entry is an orphan", async () => {
  const clock = movableClock();
  const rig = countingSigningSetup([], { clock: clock.now });
  // The rig's capture profile declares `ttl: 3600` through `captureProfile()`'s default expiry.
  const subjectRef = 'subject:noedge-retry';
  const blocker = await openRecord(rig.handles, CONTENT, PROFILE_ID, subjectRef);
  clock.advance(2 * 3600 * 1000); // past the open window: the blocker is now due

  const signerBefore = rig.signerCalls();
  const putBefore = rig.putCalls();
  const second = await openRecord(rig.handles, CONTENT, PROFILE_ID, subjectRef);
  assert.notEqual(second, blocker, 'a NEW record opened after the lapsed blocker expired');
  assert.equal(replay(await rig.store.readChain(blocker)).state, 'expired', 'blocker expired');

  // Three appends happen: the genesis attempt that loses C1 to the blocker, the blocker's
  // `expired` edge, and the genesis RETRY — re-stamped, since this rig's clock advanced
  // between the attempt and the retry, so a distinct transition. Three puts and three mints.
  assert.equal(rig.putCalls() - putBefore, 3, 'three puts: attempt, expire, retry');
  assert.equal(
    rig.signerCalls() - signerBefore,
    3,
    'three mints: the re-stamped retry is new bytes',
  );
  const report = await rig.handles.operator.verifySignatures(second);
  assert.ok(
    report.transitions.every((t) => t.signed && t.verified),
    'the landed (re-stamped) genesis is signed and verifies',
  );
  assert.equal(
    report.orphans.length,
    1,
    "the first attempt's entry names a genesis that never landed — one lost-genesis orphan",
  );
});

test('INVARIANT (green before the memo, and it must stay green) — the put ALWAYS runs: a put that silently no-ops on one attempt does not leave the landed transition unsigned', async () => {
  // This is the measured difference between the shape that ships — memoize only the signer's
  // result, run `put` on every attempt — and the digest-keyed or promise-memoizing shapes that
  // were rejected: those skip the write on a repeat and land an UNSIGNED transition whenever
  // the earlier entry is not there. Today's code satisfies this already; a future rewrite
  // toward either rejected shape is what this pin would catch.
  //
  // The clock HOLDS STILL within a call (advanced only between calls): the attempt and the
  // retry then share one object and one digest, which is the repeat this invariant is about.
  // Under a clock that moves between readings the retry is re-stamped into a distinct
  // transition (the inverted MEMO pin above) and this fixture would exercise no repeat at all.
  let ms = Date.parse('2026-08-29T00:00:00Z');
  const clock = {
    now: () => new Date(ms),
    advance: (deltaMs: number) => {
      ms += deltaMs;
    },
  };
  const rig = countingSigningSetup([], { clock: clock.now });
  const subjectRef = 'subject:noedge-swallow';
  await openRecord(rig.handles, CONTENT, PROFILE_ID, subjectRef);
  clock.advance(2 * 3600 * 1000);

  // The next put is the genesis attempt that will lose C1 to the blocker. Swallowing it leaves
  // that attempt's entry unwritten; the retry of the SAME object must still write its own.
  rig.swallowNextPut();
  const second = await openRecord(rig.handles, CONTENT, PROFILE_ID, subjectRef);
  const swallowed = rig.events.filter((e) => e.startsWith('put-swallowed:'));
  assert.equal(swallowed.length, 1, 'fixture: exactly one put was swallowed');
  const genesis = (await rig.store.readChain(second))[0];
  assert.ok(genesis !== undefined);
  assert.equal(
    swallowed[0],
    `put-swallowed:${transitionDigest(genesis)}`,
    "fixture: the swallowed put was the new genesis's first attempt",
  );
  const report = await rig.handles.operator.verifySignatures(second);
  assert.equal(report.transitions.length, 1);
  assert.equal(report.transitions[0]?.signed, true, 'the landed genesis has its sidecar entry');
  assert.equal(report.transitions[0]?.verified, true, 'and it verifies');
});

test('INVARIANT (green before the memo, and it must stay green) — sign-before-append holds as a SEQUENCE: no append is observed before a put for that transition has completed', async () => {
  const rig = countingSigningSetup();
  const recordId = await confirmedSigningRecord(rig, 'subject:noedge-order');
  assert.equal((await rig.handles.operator.seal(recordId)).status, 'ok');
  await breakOneSignature(rig.signatures, recordId, rig.store);
  assertNoEdgeRefusal(
    await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts()),
    'sealed corner',
  );

  // Every kind of append this rig can produce is in the log: the genesis, finalize's batch, the
  // seal, and the compromise walk's attempts. For each `append:<digest>` the SAME digest's
  // `put:<digest>` must already be in the sequence. Asserted on the sequence, not a boolean.
  const appends = rig.events.filter((e) => e.startsWith('append:'));
  assert.ok(appends.length >= 6, `fixture: appends were observed (${appends.length})`);
  const completedPuts = new Set<string>();
  for (const event of rig.events) {
    if (event.startsWith('put:')) completedPuts.add(event.slice('put:'.length));
    if (event.startsWith('append:')) {
      const digest = event.slice('append:'.length);
      assert.ok(
        completedPuts.has(digest),
        `an append was handed to the store before its own put completed: ${event}`,
      );
    }
  }
});

test('the digest-stability assumption behind the memo: a transition object MUTATED between two appends is caught — verification fails closed on the recomputed digest', async () => {
  // Not constructible through the public seams: every seam builds its transition once and hands
  // that one object to the store, unchanged, on every attempt. So this pin drives the decorator
  // directly through its exported factory, over the rig's own backing and sidecar, to show what
  // the memo's pairing — a signature minted at first-mint time, a digest recomputed at every
  // put — does if anything ever violates that. The mismatch is CAUGHT: the landed transition's
  // entry exists under the recomputed digest, but its signature is over the old bytes, and the
  // layer fails closed on it. Nothing in the type system prevents the mutation; this pin and
  // the comment at the memo are what state the assumption.
  const rig = countingSigningSetup();
  const first = await openRecord(rig.handles, CONTENT, PROFILE_ID, 'subject:noedge-mutate-1');
  const template = (await rig.store.readChain(first))[0];
  assert.ok(template !== undefined, 'fixture: a real genesis to clone');
  const payload = template.payload as Record<string, unknown>;
  const t: Transition = {
    ...structuredClone(template),
    recordId: 'rec-noedge-mutated',
    payload: { ...payload, subjectRef: 'subject:noedge-mutate-2' },
  };
  const decorated = withSigning(rig.signing, rig.store, (id) => id === PROFILE_ID);
  const meta = { nonTerminal: true };

  // Attempt 1: a genesis with a non-null expected state loses its CAS — but the decorator has
  // already minted and written for it.
  const lost = await decorated.appendTransition('open', t, meta);
  assert.equal(lost.appended, false, 'fixture: the first attempt did not land');
  const mintsAfterFirst = rig.signerCalls();
  // Mutate the SAME object, then append it again: the memo hands back the FIRST mint.
  t.payload = {
    ...payload,
    subjectRef: 'subject:noedge-mutate-2',
    contentDigest: `sha256:${'f'.repeat(64)}`,
  };
  const landed = await decorated.appendTransition(null, t, meta);
  assert.equal(landed.appended, true, 'fixture: the mutated object landed');
  assert.equal(rig.signerCalls(), mintsAfterFirst, 'no second mint — the memo was used');

  const report = await rig.handles.operator.verifySignatures('rec-noedge-mutated');
  assert.equal(report.transitions.length, 1);
  assert.equal(report.transitions[0]?.signed, true, 'an entry exists under the recomputed digest');
  assert.equal(
    report.transitions[0]?.verified,
    false,
    'and it does NOT verify: the signature is over the pre-mutation bytes — caught, fail-closed',
  );
});

test('what a WeakMap can and cannot show: N distinct transitions produce N mints and N puts — nothing observable grows', async () => {
  // A `WeakMap` has no size, so "the memo holds nothing once its keys are unreachable" is a
  // garbage-collection property and not a reading; no assertion is written against it. What IS
  // observable is that distinct objects never share a mint: each open() below builds a fresh
  // genesis, and the counters rise one-for-one with the appends. No assertion here is made
  // against a Map the test built itself — that would be a fact about the scaffolding.
  const rig = countingSigningSetup();
  const N = 7;
  const signerBefore = rig.signerCalls();
  const putBefore = rig.putCalls();
  for (let i = 0; i < N; i += 1) {
    await openRecord(rig.handles, CONTENT, PROFILE_ID, `subject:noedge-distinct-${i}`);
  }
  assert.equal(rig.signerCalls() - signerBefore, N, 'one mint per distinct genesis');
  assert.equal(rig.putCalls() - putBefore, N, 'one put per distinct genesis');
  assert.equal(
    rig.events.filter((e) => e.startsWith('append:')).length,
    N,
    'and exactly N appends were handed down',
  );
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
