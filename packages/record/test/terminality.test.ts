// @vidimera/record — terminality.test.ts (SPEC §2 "States and terminality"): the
// CONFIRMED-terminality and redeem() interaction tests together. A capture-only profile's
// final-leg `confirmed`
// is TERMINAL — a second open() on the same (profile, subject) is admitted afterwards. An
// effect-seam profile's final-leg `confirmed` is NON-terminal (awaits redemption) — a
// second open() is blocked with `record-exists`. Also pins the atomic-batch bound:
// finalize()'s success append is ONE all-or-nothing `appendBatch` call in this build — a
// conflict at its entry compare-and-swap applies NOTHING, leaving the chain exactly as it
// was, and surfaces as `record-not-open` (a `state-mismatch`) or, on a `seq` conflict, as the
// refusal `record-contended` when a re-read shows the head genuinely moved under a conforming
// store (the record-contended increment) or a storage-fault THROW when it shows nothing landed.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import type { ConfirmProfile, LegSpec } from '../src/config.js';
import { create } from '../src/create.js';
import type { Outcome } from '../src/outcome.js';
import { MemoryStore } from '../src/store/memory.js';
import type { AppendMeta, AppendResult, BatchResult, Store } from '../src/store/store.js';
import type { Digest, RecordState, StagedDraft, Transition } from '../src/types.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };

// === capture-only final-leg confirmed is TERMINAL =====================================

test('a capture-only final-leg CONFIRMED is terminal: a second open() on the same (profile, subject) is admitted', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  const confirmed = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(confirmed.status, 'ok');
  if (confirmed.status !== 'ok') return;

  // The confirmed record is TERMINAL (no effect seam) → C1 exclusivity no longer blocks.
  const secondRecordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  assert.notEqual(
    secondRecordId,
    recordId,
    'a fresh record opens after a capture-terminal confirm',
  );
  assert.equal((await handles.operator.getRecord(secondRecordId))?.state, 'open');
});

// === effect-seam final-leg confirmed is NON-terminal ==================================

test('an effect-seam final-leg CONFIRMED is non-terminal (awaits redemption): a second open() → record-exists', async () => {
  const handles = create(makeConfig([effectSeamProfile()]));
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);

  const confirmed = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(confirmed.status, 'ok');
  if (confirmed.status !== 'ok') return;
  assert.equal(confirmed.value.state, 'confirmed');

  // The confirmed record is NON-terminal (effect seam) → C1 exclusivity still blocks.
  const staged = await handles.agent.stage(CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const second = await handles.operator.open(staged.value.stagedRef);
  assert.equal(second.status, 'refused');
  if (second.status !== 'refused') return;
  assert.equal(
    second.code,
    'record-exists',
    'a confirmed-awaiting-redemption record blocks a second open',
  );
});

// === atomic-batch bound: an entry conflict applies nothing =============================

/**
 * A Store wrapper that FABRICATES a batch conflict of a chosen shape, letting every other
 * call through to a real inner `MemoryStore`.
 *
 * WHAT IT DOES NOT PROVE. The conflict is invented: the inner store never saw the batch, so
 * the record it holds is untouched afterwards. That is the correct post-state here for a
 * different reason than the fixture — the batch is all-or-nothing, so a REAL conflict leaves
 * the record untouched too. `RaceThenAppendStore` below reaches the branch through a genuine
 * race and is where post-conflict state is asserted honestly.
 */
class BatchConflictStore implements Store {
  private readonly inner = new MemoryStore();
  constructor(
    private readonly conflict: 'state-mismatch' | 'seq',
    private readonly index: number,
  ) {}
  putStaged(s: StagedDraft): Promise<void> {
    return this.inner.putStaged(s);
  }
  getStaged(r: string): Promise<StagedDraft | null> {
    return this.inner.getStaged(r);
  }
  readChain(r: string): Promise<Transition[]> {
    return this.inner.readChain(r);
  }
  chainHead(r: string): Promise<Digest | null> {
    return this.inner.chainHead(r);
  }
  appendTransition(e: RecordState | null, t: Transition, m: AppendMeta): Promise<AppendResult> {
    return this.inner.appendTransition(e, t, m);
  }
  async appendBatch(): Promise<BatchResult> {
    return { appended: false, conflict: this.conflict, index: this.index };
  }
  listDue(now: Date): Promise<string[]> {
    return this.inner.listDue(now);
  }
  findNonTerminal(p: string, s: string): Promise<string | null> {
    return this.inner.findNonTerminal(p, s);
  }
}

test("finalize()'s success batch is atomic: an entry conflict refuses record-not-open and leaves the chain untouched", async () => {
  const store = new BatchConflictStore('state-mismatch', 0);
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const before = await handles.operator.readChain(recordId);

  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'record-not-open');
  assert.equal(outcome.transitionRef, undefined, 'a never-appends code carries no transitionRef');

  const after = await handles.operator.readChain(recordId);
  assert.deepEqual(after, before, 'all-or-nothing: no consultation is left behind');
});

test('finalize() throws a storage fault when the batch reports a seq conflict, with nothing recorded', async () => {
  const store = new BatchConflictStore('seq', 1);
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const before = await handles.operator.readChain(recordId);

  await assert.rejects(
    () => handles.operator.finalize(recordId, identity(), CONTENT, facts()),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.startsWith("finalize: batch append conflict ('seq') at element 1"),
        `expected the batch conflict throw naming shape and index, got: ${err.message}`,
      );
      assert.match(err.message, /nothing was appended/, 'the message must say nothing landed');
      assert.equal(
        err.name,
        'Error',
        'a fabricated conflict over an unmoved head is a plain storage-fault throw, never a refusal',
      );
      return true;
    },
  );

  const after = await handles.operator.readChain(recordId);
  assert.deepEqual(after, before, 'the throw reports a batch that applied nothing');
});

/**
 * A Store that fabricates a `seq` conflict and then FAILS every read: the diagnostic re-read
 * `batchSeqConflict` performs to tell contention from a storage fault cannot complete. The
 * review caught the re-read's own rejection replacing the conflict report entirely — a host
 * lost both the storage-fault classification and the assurance that nothing landed.
 */
class FaultThenDeadStore implements Store {
  private readonly inner = new MemoryStore();
  private dead = false;
  putStaged(s: StagedDraft): Promise<void> {
    return this.inner.putStaged(s);
  }
  getStaged(r: string): Promise<StagedDraft | null> {
    return this.inner.getStaged(r);
  }
  async readChain(r: string): Promise<Transition[]> {
    if (this.dead) throw new Error('store dead: connection lost');
    return this.inner.readChain(r);
  }
  chainHead(r: string): Promise<Digest | null> {
    return this.inner.chainHead(r);
  }
  appendTransition(e: RecordState | null, t: Transition, m: AppendMeta): Promise<AppendResult> {
    return this.inner.appendTransition(e, t, m);
  }
  async appendBatch(): Promise<BatchResult> {
    this.dead = true;
    return { appended: false, conflict: 'seq', index: 0 };
  }
  listDue(now: Date): Promise<string[]> {
    return this.inner.listDue(now);
  }
  findNonTerminal(p: string, s: string): Promise<string | null> {
    return this.inner.findNonTerminal(p, s);
  }
}

test('a seq conflict whose diagnostic re-read ALSO fails still surfaces the conflict report — nothing landed — with the re-read failure as its cause', async () => {
  const store = new FaultThenDeadStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  await assert.rejects(
    () => handles.operator.finalize(recordId, identity(), CONTENT, facts()),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.equal(err.name, 'Error', 'contention cannot be established — the fault throws');
      assert.match(err.message, /batch append conflict \('seq'\) at element 0/);
      assert.match(err.message, /re-read/, 'the message says the diagnostic read itself failed');
      assert.match(err.message, /nothing was appended/, 'the all-or-nothing assurance survives');
      const cause = (err as { cause?: unknown }).cause;
      assert.ok(
        cause instanceof Error && /store dead/.test(cause.message),
        'the re-read failure rides as cause',
      );
      return true;
    },
  );
});

test("finalize()'s batch digests are the ones finalize itself computed", async () => {
  // The batch has no per-append round trip, so finalize computes each prevHash locally via
  // `transitionDigest`. That makes the store's returned digests a free cross-check on the
  // encoding: if the two ever disagree, something recomputes differently.
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;

  const chain = await handles.operator.readChain(recordId);
  const confirmed = chain.at(-1);
  assert.ok(confirmed !== undefined);
  assert.equal(
    outcome.value.transitionRef,
    transitionDigest(confirmed),
    'the returned transitionRef is the confirmed edge’s own digest',
  );
});

// INVERTED (this build step, authorized — the SECOND inherited assertion to invert on this
// branch; the first is redeem()'s, further below). The inherited assertion pinned the
// opposite result: a confirmed-append conflict arriving after the two consultations had
// landed refused `record-not-open`, and this test held that mapping in place. The mapping does
// not fit the normative document's own DESCRIPTION of the code, which is why overturning it is
// a finding acted on rather than a preference — while SPEC issues no VERDICT on which code to
// return in a shape its atomic batch cannot produce (deferral register row 12, retired at
// the first step-2 increment). The ground is not an inventory of which codes are true — two
// attempts to write it that way were each constructibly false at the edges, and
// `kernel/finalize.ts`'s `midBatchConflict` now carries the durable form: under this build's
// single-writer bound and a Store honouring the compare-and-swap contract, NO conflict is
// reachable at that append, so reaching one is a storage fault, and DECISIONS.md #11 makes a
// storage fault a loud throw. What the inherited assertion pinned was a refusal that
// MISREPRESENTS: `record-not-open` carries no `transitionRef` and is a never-appends member,
// so a host reading it is told nothing was recorded — while two consultations sit on the
// chain. The code also names a seam rather than a call — SPEC §8: "a decision-progress seam
// invoked against a non-open, non-expired record", "never appends" — and a seam that has
// already appended twice is not that one. What this is NOT is a contradiction of the never-appends rule itself: that rule
// governs whether a REFUSAL appends a `refused` edge, and no `refused` edge was ever appended
// here — the consultations came from the success batch. What the change does NOT buy, stated
// with the change itself: nothing is rolled back — no rollback exists in this build. The
// consultations stay on the chain with no decision edge of this call's, and a retry that
// succeeds appends its own consultation pair on top. The all-or-nothing batch that would fix
// that is SPEC §12's `appendBatch`, which this build's `Store` does not implement (deferral
// register). The exception taken is scoped by DECISIONS.md #10: "storage faults where nothing
// was recorded" — wider here, because something WAS recorded, and the message says what.
//
// APPENDED, this build step: `midBatchConflict` is gone, and with it the case this note
// argued about — there is no longer a "conflict after something already landed" for a code to
// misrepresent, because `appendBatch`'s entry CAS is all-or-nothing. The mapping this note
// inverted TO — throw, never a misrepresenting refusal — held until the record-contended
// increment, which split the `seq` shape by one re-read (`batchSeqConflict`, above): a moved
// head is the RETURNED refusal `record-contended`, true of the record, and only an unmoved
// head still throws as the storage fault it is. The note's own point survives intact: no code
// that is FALSE of the record is ever returned, and nothing is ever partially applied for
// either shape to misrepresent — a `state-mismatch` refuses `record-not-open`. The test this note
// guarded (`ConfirmBlockingStore`'s fabricated confirmed-append conflict) is gone with the
// three-append sequence it fabricated a conflict inside of; `BatchConflictStore`'s tests above
// pin the same throw-vs-refuse split at the batch's one entry CAS instead — the same place
// this inversion argued the split belonged, reached by construction rather than by
// enumeration now.

/**
 * A Store wrapper that RACES A REAL EDGE IN, rather than inventing a conflict: before
 * forwarding finalize()'s success batch to the inner `MemoryStore`, it appends a genuine
 * `confirmed` transition through that SAME inner store — another writer winning the record
 * while this finalize() is mid-ladder. The forwarded batch then fails the inner store's own
 * entry compare-and-swap, honestly: the record really is no longer `open`. The race moved
 * here (from `appendTransition`) when rung (6) became one `appendBatch` call — finalize no
 * longer calls `appendTransition` for its consultations/confirmed at all, so hooking that
 * method would never fire.
 *
 * This is the fixture the post-conflict state CAN be asserted from, and it exists because
 * `BatchConflictStore` above cannot support such an assertion — its conflict is invented, so
 * its inner store never even sees the batch.
 *
 * The two `assert.ok`s below are fixture PRECONDITIONS, and they are load-bearing: if the
 * raced edge silently failed to land, the test would pass while testing nothing. They fail
 * loudly today (deliberately broken once, to check). The latent hazard is a future change that
 * wraps this append seam in a try/catch — that would swallow them, so any such change must
 * re-home these checks rather than inherit them.
 */
class RaceThenAppendStore implements Store {
  private readonly inner = new MemoryStore();
  private raced = false;
  putStaged(s: StagedDraft): Promise<void> {
    return this.inner.putStaged(s);
  }
  getStaged(r: string): Promise<StagedDraft | null> {
    return this.inner.getStaged(r);
  }
  readChain(r: string): Promise<Transition[]> {
    return this.inner.readChain(r);
  }
  chainHead(r: string): Promise<Digest | null> {
    return this.inner.chainHead(r);
  }
  appendTransition(
    expected: RecordState | null,
    transition: Transition,
    meta: AppendMeta,
  ): Promise<AppendResult> {
    return this.inner.appendTransition(expected, transition, meta);
  }
  async appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
  ): Promise<BatchResult> {
    const first = transitions[0];
    if (!this.raced && first !== undefined) {
      this.raced = true;
      const chain = await this.inner.readChain(first.recordId);
      const head = await this.inner.chainHead(first.recordId);
      assert.ok(head !== null, 'fixture: the record must exist before the race');
      const otherWriter: Transition = {
        recordId: first.recordId,
        seq: chain.length + 1,
        at: first.at,
        kind: 'confirmed',
        payload: { actor: identity({ principal: 'approver:other' }) },
        prevHash: head,
      };
      // A capture-only final-leg `confirmed` is terminal ⇒ nonTerminal false.
      const landed = await this.inner.appendTransition('open', otherWriter, { nonTerminal: false });
      assert.ok(landed.appended, 'fixture: the raced confirmed edge must genuinely land');
    }
    return this.inner.appendBatch(expectedCurrentState, transitions, meta);
  }
  listDue(now: Date): Promise<string[]> {
    return this.inner.listDue(now);
  }
  findNonTerminal(p: string, s: string): Promise<string | null> {
    return this.inner.findNonTerminal(p, s);
  }
}

// Pins the behaviour the human RULED to keep, which was documented but unpinned: the batch's
// entry conflict still refuses `record-not-open` rather than throwing. Deliberately driven by
// a GENUINE conflict — another writer confirms the record between finalize()'s chain load and
// its one append — because that is the case where the code is actually TRUE: nothing of this
// call has landed, and the record really is no longer open. A mutation of the site to a throw
// left the suite green before this test existed.
test("finalize() refuses record-not-open when the batch's entry compare-and-swap loses to another writer: nothing of the call landed", async () => {
  const store = new RaceThenAppendStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused', 'the entry conflict refuses, never throws');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'record-not-open');
  assert.equal(outcome.class, 'refusal');
  assert.equal(
    outcome.transitionRef,
    undefined,
    'a never-appends code carries no transitionRef — nothing of this call was appended',
  );

  const chain = await handles.operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'confirmed'],
    'only the other writer edge is on the chain — this call appended nothing, which is what makes the never-appends code honest here',
  );
  assert.equal(
    (await handles.operator.getRecord(recordId))?.state,
    'confirmed',
    'the record really is non-open — `record-not-open` is true of this state, not merely returned',
  );
});

// === the batch's seq conflict under a CONFORMING store: contention, not a storage fault ====
//
// The window is real: finalize() and decline() read the chain once, then suspend at
// `signatureLayerHolds` and `resolveDueClock` before their one `appendBatch`. A state-preserving
// append (`raiseFinding`/`acknowledge`) landing in that window keeps the record `open`, so the
// batch passes the store's entry compare-and-swap and fails its seq check honestly — the head
// moved. The store honoured its contract; only the kernel's mapping of the result is on trial
// here. Nothing of the losing call lands, so the mapping must (a) name the record truthfully —
// `record-contended`, the code the record-contended increment minted for exactly this — and (b)
// stay distinguishable from a storage fault, which keeps its throw.

const RACE_RAISER = { principal: 'checker:race', authority: 'mtls:checker' };
const RACE_DIGEST = `sha256:${'a'.repeat(64)}`;

/** captureProfile with the leg's findings flow declared (both-or-neither pair). */
function flowProfile(requiredAcks: string[], extra: Partial<LegSpec> = {}): ConfirmProfile {
  const p = captureProfile({ id: 'test.flow.v1' });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  p.legs[0] = { ...leg, ackMode: 'any', requiredAcks, ...extra };
  return p;
}

/**
 * A Store wrapper that fires a one-shot `race` hook BEFORE forwarding the first `appendBatch`
 * to its inner `MemoryStore`. The hook drives a GENUINE second writer through the kernel — a
 * `raiseFinding` over this same wrapper — so the edge that lands is the seam's own, under the
 * inner store's real compare-and-swap, not a hand-built imitation. Every other method delegates.
 *
 * The `assert.equal` inside the hook is a fixture PRECONDITION, load-bearing for the same
 * reason `RaceThenAppendStore`'s are: if the raced finding silently failed to land, the batch
 * would succeed and the test would pass while testing nothing.
 */
class RaceFindingThenBatchStore implements Store {
  readonly inner = new MemoryStore();
  race: (() => Promise<void>) | undefined;
  putStaged(s: StagedDraft): Promise<void> {
    return this.inner.putStaged(s);
  }
  getStaged(r: string): Promise<StagedDraft | null> {
    return this.inner.getStaged(r);
  }
  readChain(r: string): Promise<Transition[]> {
    return this.inner.readChain(r);
  }
  chainHead(r: string): Promise<Digest | null> {
    return this.inner.chainHead(r);
  }
  appendTransition(
    expected: RecordState | null,
    transition: Transition,
    meta: AppendMeta,
  ): Promise<AppendResult> {
    return this.inner.appendTransition(expected, transition, meta);
  }
  async appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
  ): Promise<BatchResult> {
    const race = this.race;
    if (race !== undefined) {
      this.race = undefined;
      await race();
    }
    return this.inner.appendBatch(expectedCurrentState, transitions, meta);
  }
  listDue(now: Date): Promise<string[]> {
    return this.inner.listDue(now);
  }
  findNonTerminal(p: string, s: string): Promise<string | null> {
    return this.inner.findNonTerminal(p, s);
  }
}

/** Opens a record on a findings-declaring profile and arms the race with a finding of `kind`. */
async function armedRace(kind: string, extra: Partial<LegSpec> = {}) {
  const store = new RaceFindingThenBatchStore();
  const handles = create(makeConfig([flowProfile(['variance'], extra)], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', DEFAULT_SUBJECT_REF);
  store.race = async () => {
    const out = await handles.operator.raiseFinding(
      recordId,
      { findingId: 'f-race', kind, findingDigest: RACE_DIGEST },
      RACE_RAISER,
    );
    assert.equal(out.status, 'ok', 'fixture: the racing raiseFinding must genuinely land');
  };
  return { handles, recordId };
}

/** The contention outcome's shape (the record-contended increment): a RETURNED refusal, never a
 * throw — `record-contended`, refusal-class, never-appends, so no transitionRef. */
function assertContended(outcome: Outcome<unknown>): void {
  assert.equal(outcome.status, 'refused', 'contention is a refusal, not an exception');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'record-contended');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined, 'a never-appends code carries no transitionRef');
}

test('finalize() refuses record-contended, not a storage fault, when a state-preserving append lands between its chain read and its batch: nothing of the call landed', async () => {
  const { handles, recordId } = await armedRace('note');

  assertContended(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));

  const chain = await handles.operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'finding-raised'],
    'only the racing writer edge is on the chain — this call appended nothing',
  );
  assert.equal(
    (await handles.operator.getRecord(recordId))?.state,
    'open',
    'the record is still open — which is exactly why no existing refusal code is true of it',
  );
});

test('after a record-contended refusal, re-invoking finalize() confirms when the raced finding kind is NOT in requiredAcks — the ladder re-evaluates against the new head', async () => {
  const { handles, recordId } = await armedRace('note'); // requiredAcks is ['variance']

  assertContended(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));

  const again = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(again.status, 'ok', 'a non-gating finding does not block the re-invocation');
  if (again.status !== 'ok') return;
  assert.equal(again.value.state, 'confirmed');
  const chain = await handles.operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'finding-raised', 'consultation-recorded', 'consultation-recorded', 'confirmed'],
    'the re-invocation chains its batch after the raced finding — one batch, not two',
  );
});

test('after a record-contended refusal, re-invoking finalize() refuses ack-missing when the raced finding kind IS in requiredAcks — fail-closed through rung (5.7), never a silent batch retry', async () => {
  const { handles, recordId } = await armedRace('variance'); // requiredAcks is ['variance']

  assertContended(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));

  const again = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(again.status, 'refused', 'the gating finding the confirmer never saw blocks');
  if (again.status !== 'refused') return;
  assert.equal(again.code, 'ack-missing');
  assert.equal(again.transitionRef, undefined, 'ack-missing is open-by-default here: no edge');
  assert.deepEqual(
    (await handles.operator.readChain(recordId)).map((t) => t.kind),
    ['opened', 'finding-raised'],
    'neither call appended — the record waits for the ack, still open',
  );
});

test('decline() refuses the same record-contended on the same race: nothing of the call landed, the record is still open', async () => {
  const { handles, recordId } = await armedRace('variance', { decline: true });

  assertContended(await handles.operator.decline(recordId, identity(), CONTENT, facts()));

  assert.deepEqual(
    (await handles.operator.readChain(recordId)).map((t) => t.kind),
    ['opened', 'finding-raised'],
    'only the racing writer edge is on the chain — this call appended nothing',
  );
  assert.equal((await handles.operator.getRecord(recordId))?.state, 'open');
});

// === redeem(): unredeemable-state on a capture-only profile; the DIRECT-shape redemption on
// an effect-seam profile's confirmed record ============================================
//
// redeem() is exported on every profile (capture-only and effect-seam alike). On a
// capture-only profile it still refuses `unredeemable-state`, result-first, NOT appended,
// NO transitionRef, on every state — that behavior is untouched here. On an
// effect-seam profile's confirmed record specifically, it now REDEEMS instead (see the test
// below and its inversion note for why). Both cases finalize first so the record is
// CONFIRMED — the capture-only case is capture-terminal (redundant but still refused:
// redeem() does not special-case terminality), and the effect-seam case is exactly the
// "awaiting redemption" non-terminal state the redemption edge targets. ================

test('redeem() on a capture-terminal CONFIRMED record (capture-only profile) -> unredeemable-state, not appended, no transitionRef', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  const confirmed = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(confirmed.status, 'ok');
  const chainBefore = await handles.operator.readChain(recordId);

  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state');
  assert.equal(outcome.class, 'refusal');
  assert.equal(
    outcome.transitionRef,
    undefined,
    'redeem() never appends in this build — no transitionRef',
  );

  const chainAfter = await handles.operator.readChain(recordId);
  assert.deepEqual(
    chainAfter,
    chainBefore,
    'redeem() appends nothing — the chain is byte-for-byte unchanged',
  );
});

// INVERTED (this build step, authorized — the FIRST of the two inversions authorized on this
// branch; the second is the mid-batch conflict above, and the count is stated in both places
// so neither reads as the only one): the
// reference implementation's stub silently refused `unredeemable-state` here, same as the
// capture-only case above. That silence is what this build step corrects: a host that
// declares an effect-seam profile and calls redeem() on a just-confirmed record was left to
// discover — only much later, and only indirectly, via a `record-exists` refusal on some
// unrelated future open() — that the pair it holds can never advance. `redeem()` now throws
// a build-capability error loudly, at the seam, instead. This is loudness, not closure: the
// throw does not release anything. The `(profile, subject)` pair STAYS held — the hold lives
// in the Store's C1 exclusivity, not in redeem()'s refusal, so a throw here cannot lift it
// any more than the silent refusal it replaces could. Real closure needs a later build
// step's redemption edge (SPEC §11.2) or a `confirmToRedeem` expiry edge (SPEC §9.1) — NOT
// `seal()`, which SPEC §12 admits only against a derived-terminal record while SPEC §2 makes
// this record non-terminal. That is no longer an argument held for a later build step: this
// build step ships `seal()`, so both halves of it now exist and are reachable — `seal()` is on
// the operator surface and `unsealable-state` is in the shipped union — and `test/seal.test.ts`
// pins the consequence, that `seal()` on a confirmed effect-seam record refuses
// `unsealable-state` rather than releasing the held pair. See the deferral register for
// the corrected framing; two successive framings there were wrong, one having this as
// something redeem() or open() could itself close, the other naming seal() as a release path.
//
// INVERTED BACK, at the first step-3 increment: the loudness-throw this note argued for
// completed its purpose — the direct-shape redemption edge (SPEC §11.2) now exists, so the
// call this test pins succeeds instead of throwing. The original inversion's reasoning
// stands as history above; this appended note is the authorization for the second move,
// per the same discipline (argued in place, named in the commit body, never silent).
test('redeem() on an effect-seam CONFIRMED record awaiting redemption now succeeds: confirmed → redeemed releases the held pair', async () => {
  const handles = create(makeConfig([effectSeamProfile()]));
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);

  const confirmed = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(confirmed.status, 'ok');
  if (confirmed.status !== 'ok') return;
  assert.equal(
    confirmed.value.state,
    'confirmed',
    'the effect-seam confirmed record is non-terminal — exactly "awaiting redemption"',
  );

  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'ok', 'redeem() on a confirmed effect-seam record now succeeds');
  if (outcome.status !== 'ok') return;
  assert.equal(outcome.value.state, 'redeemed');
  assert.equal(outcome.value.recordId, recordId);

  assert.equal(
    (await handles.operator.getRecord(recordId))?.state,
    'redeemed',
    'the record moves to redeemed — the (profile, subject) pair is released, not held',
  );
});
