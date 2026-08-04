// @vidimera/record — terminality.test.ts (SPEC §2 "States and terminality"): the
// CONFIRMED-terminality and redeem() interaction tests together. A capture-only profile's
// final-leg `confirmed`
// is TERMINAL — a second open() on the same (profile, subject) is admitted afterwards. An
// effect-seam profile's final-leg `confirmed` is NON-terminal (awaits redemption) — a
// second open() is blocked with `record-exists`. Also pins the honest sequencing bound:
// finalize()'s multi-append is a best-effort SEQUENTIAL append in this build, NOT a
// cross-append atomic batch — a mid-batch conflict AFTER something of the call has landed
// leaves what landed on the chain, with no decision edge of that call's and no rollback, and
// THROWS without claiming what the record became.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create } from '../src/create.js';
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

// === honest sequencing bound (sequential, not atomic, in this build): a mid-batch conflict throws ===

/**
 * A Store wrapper that lets the two consultation appends land but FABRICATES a
 * `state-mismatch` on the CONFIRMED append. It proves finalize()'s batch is SEQUENTIAL (the
 * consultations are on the chain) not atomic, and that the conflict THROWS rather than
 * returning a code (see the inversion note below).
 *
 * WHAT IT DOES NOT PROVE, and must not be read as proving. The conflict is invented: the
 * inner `MemoryStore` never saw the confirmed append, so the record it holds is still `open`
 * afterwards. A REAL `state-mismatch` is the opposite case — `nonterminal.ts` makes `open`
 * unconditionally non-terminal, so memory.ts's C3 arm cannot fire against an open record and
 * its state CAS is the only producer of that shape here, which means a genuine one implies
 * the record is NO LONGER open. The `open` this test asserts below is therefore a property of
 * THIS FIXTURE, not of the shape it models. A store lying about a conflict is still a
 * legitimate way to reach the branch — it is a storage fault too — but the state it leaves
 * behind is evidence about the fixture only. The `RaceThenAppendStore` further below reaches
 * the same class of branch through a genuine conflict, and is where post-conflict state is
 * asserted honestly.
 */
class ConfirmBlockingStore implements Store {
  private readonly inner = new MemoryStore();
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
  async appendTransition(
    expected: RecordState | null,
    transition: Transition,
    meta: AppendMeta,
  ): Promise<AppendResult> {
    if (transition.kind === 'confirmed') {
      return { appended: false, conflict: 'state-mismatch' };
    }
    return this.inner.appendTransition(expected, transition, meta);
  }
  appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
  ): Promise<BatchResult> {
    return this.inner.appendBatch(expectedCurrentState, transitions, meta);
  }
}

// INVERTED (this build step, authorized — the SECOND inherited assertion to invert on this
// branch; the first is redeem()'s, further below). The inherited assertion pinned the
// opposite result: a confirmed-append conflict arriving after the two consultations had
// landed refused `record-not-open`, and this test held that mapping in place. The mapping does
// not fit the normative document's own DESCRIPTION of the code, which is why overturning it is
// a finding acted on rather than a preference — while SPEC issues no VERDICT on which code to
// return in a shape its atomic batch cannot produce (deferral register row 12). The ground is not an inventory of which codes are true — two
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
test("finalize()'s batch is sequential, not atomic: a confirmed-append conflict throws, leaving the consultations on the chain", async () => {
  const store = new ConfirmBlockingStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  await assert.rejects(
    () => handles.operator.finalize(recordId, identity(), CONTENT, facts()),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.startsWith("finalize: mid-batch append conflict ('state-mismatch')"),
        `expected the mid-batch conflict throw naming the conflict shape, got: ${err.message}`,
      );
      assert.match(
        err.message,
        /appended 2 consultations and no decision edge/,
        'the message must say what the call itself appended',
      );
      assert.doesNotMatch(
        err.message,
        /record stays open/,
        'the message must not assert a state this call never re-read',
      );
      return true;
    },
    'a confirmed-append conflict after the consultations landed must throw, not refuse',
  );

  // The two consultation appends DID land (sequential best-effort, not rolled back).
  const chain = await handles.operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'consultation-recorded', 'consultation-recorded'],
    'the chain-verify + facts consultations landed; the confirmed edge did not (no rollback — the throw undoes nothing)',
  );
  assert.equal(
    (await handles.operator.getRecord(recordId))?.state,
    'open',
    'still open HERE because this fixture invented the conflict rather than moving the record — a fixture property, not a property of the shape (see the store docstring)',
  );
});

/**
 * A Store wrapper that lets the FIRST `consultation-recorded` append land and fabricates a
 * `seq` conflict on the SECOND — finalize()'s facts consultation — modelling a conflict
 * raised one append into the batch. That path had no test at all before this build step. The
 * blocking stores here use DIFFERENT conflict shapes on purpose: the throw names the
 * `AppendResult.conflict` it saw, and that shape is the only diagnostic the host gets.
 *
 * Fabricated, like `ConfirmBlockingStore` — with the same reading limit, though a real `seq`
 * conflict happens to leave the record open too: memory.ts checks the state CAS before
 * sequencing, so it raises `seq` only after finding the record `open`. That is memory.ts's
 * check order rather than a SPEC §12 requirement, so it is not a property another conforming
 * adapter must share, and this test does not assert one.
 */
class FactsConsultationBlockingStore implements Store {
  private readonly inner = new MemoryStore();
  private consultations = 0;
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
  async appendTransition(
    expected: RecordState | null,
    transition: Transition,
    meta: AppendMeta,
  ): Promise<AppendResult> {
    if (transition.kind === 'consultation-recorded') {
      this.consultations += 1;
      if (this.consultations === 2) {
        return { appended: false, conflict: 'seq' };
      }
    }
    return this.inner.appendTransition(expected, transition, meta);
  }
  appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
  ): Promise<BatchResult> {
    return this.inner.appendBatch(expectedCurrentState, transitions, meta);
  }
}

test("finalize() throws when the batch's SECOND append conflicts: the first consultation stays on the chain", async () => {
  const store = new FactsConsultationBlockingStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  await assert.rejects(
    () => handles.operator.finalize(recordId, identity(), CONTENT, facts()),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.startsWith("finalize: mid-batch append conflict ('seq')"),
        `expected the mid-batch conflict throw naming the conflict shape, got: ${err.message}`,
      );
      assert.match(
        err.message,
        /appended 1 consultation and no decision edge/,
        'one consultation landed, not two — the message must say which',
      );
      // Mirrored from the confirmed-append test rather than left to it. One message serves
      // both sites today, so a single guard would catch the regression — but only while that
      // stays true, and a per-site message is exactly the change that would make the other
      // test stop covering this one silently.
      assert.doesNotMatch(
        err.message,
        /record stays open/,
        'the message must not assert a state this call never re-read',
      );
      return true;
    },
    'a facts-append conflict after the chain-verify consultation landed must throw, not refuse',
  );

  const chain = await handles.operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'consultation-recorded'],
    'the chain-verify consultation landed; the facts consultation and the confirmed edge did not',
  );
  assert.equal(
    (await handles.operator.getRecord(recordId))?.state,
    'open',
    'still open HERE because the conflict was fabricated (see the store docstring) — not a claim about a real seq conflict under some other adapter',
  );
});

/**
 * A Store wrapper that RACES A REAL EDGE IN, rather than inventing a conflict: before the
 * first `consultation-recorded` append of finalize()'s batch, it appends a genuine
 * `confirmed` transition through the inner `MemoryStore` — another writer winning the record
 * while this finalize() is mid-ladder. The forwarded consultation append then fails the inner
 * store's own state CAS, honestly: the record really is no longer `open`.
 *
 * This is the fixture the post-conflict state CAN be asserted from, and it exists because the
 * two fabricating stores above cannot support such an assertion.
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
  async appendTransition(
    expected: RecordState | null,
    transition: Transition,
    meta: AppendMeta,
  ): Promise<AppendResult> {
    if (transition.kind === 'consultation-recorded' && !this.raced) {
      this.raced = true;
      const chain = await this.inner.readChain(transition.recordId);
      const head = await this.inner.chainHead(transition.recordId);
      assert.ok(head !== null, 'fixture: the record must exist before the race');
      const otherWriter: Transition = {
        recordId: transition.recordId,
        seq: chain.length + 1,
        at: transition.at,
        kind: 'confirmed',
        payload: { actor: identity({ principal: 'approver:other' }) },
        prevHash: head,
      };
      // A capture-only final-leg `confirmed` is terminal ⇒ nonTerminal false.
      const landed = await this.inner.appendTransition('open', otherWriter, { nonTerminal: false });
      assert.ok(landed.appended, 'fixture: the raced confirmed edge must genuinely land');
    }
    return this.inner.appendTransition(expected, transition, meta);
  }
  appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
  ): Promise<BatchResult> {
    return this.inner.appendBatch(expectedCurrentState, transitions, meta);
  }
}

// Pins the behaviour the human RULED to keep, which was documented but unpinned: the batch's
// FIRST append still refuses `record-not-open` rather than throwing. Deliberately driven by a
// GENUINE conflict — another writer confirms the record between finalize()'s chain load and
// its first append — because that is the case where the code is actually TRUE: nothing of
// this call has landed, and the record really is no longer open. A mutation of the site to a
// throw left the suite green before this test existed.
test("finalize() refuses record-not-open when the batch's FIRST append loses to another writer: nothing of the call landed", async () => {
  const store = new RaceThenAppendStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused', 'the first-append conflict refuses, never throws');
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

// === redeem(): unredeemable-state on a capture-only profile; a build-capability throw on
// an effect-seam profile's confirmed record ============================================
//
// redeem() is exported on every profile (capture-only and effect-seam alike). On a
// capture-only profile it still refuses `unredeemable-state`, result-first, NOT appended,
// NO transitionRef, on every state — that stub behavior is untouched here. On an
// effect-seam profile's confirmed record specifically, it now THROWS instead (see the test
// below and its inversion note for why). Both cases finalize first so the record is
// CONFIRMED — the capture-only case is capture-terminal (redundant but still refused: the
// stub does not special-case terminality), and the effect-seam case is exactly the
// "awaiting redemption" non-terminal state the throw targets. =========================

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
// this record non-terminal. Stated for the build step that ships `seal()`, since neither half
// exists here to be reached: there is no `seal()` on the operator surface and no
// `unsealable-state` in the shipped union, so a step that builds `seal()` expecting it to
// release the held pair would get `unsealable-state` instead. See the deferral register for
// the corrected framing; two successive framings there were wrong, one having this as
// something redeem() or open() could itself close, the other naming seal() as a release path.
test('redeem() on an effect-seam CONFIRMED record awaiting redemption throws a build-capability error at the seam (the held pair is not released)', async () => {
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
  const chainBefore = await handles.operator.readChain(recordId);

  await assert.rejects(
    () => handles.operator.redeem(recordId, CONTENT),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.startsWith('GOVERNED feature not available in this build (redeem)'),
        `expected the GOVERNED message to start with the byte-preserved head, got: ${err.message}`,
      );
      return true;
    },
    'redeem() on a confirmed effect-seam record must throw, not silently refuse',
  );

  const chainAfter = await handles.operator.readChain(recordId);
  assert.deepEqual(
    chainAfter,
    chainBefore,
    'the throw appends nothing — the chain is byte-for-byte unchanged',
  );
  assert.equal(
    (await handles.operator.getRecord(recordId))?.state,
    'confirmed',
    'the record stays confirmed/non-terminal — the (profile, subject) pair remains held, ' +
      'not released, by this throw',
  );
});
