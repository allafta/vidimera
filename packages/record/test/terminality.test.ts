// @vidimera/record — terminality.test.ts (design §5 "Profile-derived terminality" / §9
// "finalize check order" success batch + S5 honest sequencing): the CONFIRMED-terminality
// portions (the redeem portions are Task 9). A capture-only profile's final-leg `confirmed`
// is TERMINAL — a second open() on the same (profile, subject) is admitted afterwards. An
// effect-seam profile's final-leg `confirmed` is NON-terminal (awaits redemption) — a
// second open() is blocked with `record-exists`. Also pins the honest sequencing bound
// (design §9 S5): finalize()'s multi-append is a best-effort SEQUENTIAL append, NOT a
// cross-append atomic batch — a confirmed-append conflict after the consultations landed
// leaves them on the chain and maps to `record-not-open` (the M-B residual).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import type { AppendResult, Store } from '../src/store/store.js';
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

// === honest sequencing bound (design §9 S5) + confirmed-append residual → record-not-open ===

/**
 * A Store wrapper that lets the two consultation appends land but forces the CONFIRMED
 * append to `state-mismatch` — modelling a residual CAS conflict on the confirmed edge. It
 * proves finalize()'s batch is SEQUENTIAL (the consultations are on the chain) not atomic,
 * and that the residual confirmed-append conflict maps to `record-not-open` (M-B).
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
    nonTerminalFlag: boolean,
  ): Promise<AppendResult> {
    if (transition.kind === 'confirmed') {
      return { appended: false, conflict: 'state-mismatch' };
    }
    return this.inner.appendTransition(expected, transition, nonTerminalFlag);
  }
}

test("finalize()'s batch is sequential, not atomic: a residual confirmed-append conflict leaves the consultations on the chain and maps to record-not-open", async () => {
  const store = new ConfirmBlockingStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(
    outcome.code,
    'record-not-open',
    'a residual confirmed-append state-mismatch → record-not-open',
  );
  assert.equal(outcome.transitionRef, undefined);

  // The two consultation appends DID land (sequential best-effort, not rolled back).
  const chain = await handles.operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'consultation-recorded', 'consultation-recorded'],
    'the chain-verify + facts consultations landed; the confirmed edge did not (no rollback — slice-3 single-writer bound)',
  );
  assert.equal(
    (await handles.operator.getRecord(recordId))?.state,
    'open',
    'the record stays open (never confirmed)',
  );
});

// === redeem() slice-3 stub: unredeemable-state on BOTH profile shapes (design §5 "redeem()
// slice-3 stub" / §9 "unredeemable-state always-present (O2)"): exported on every profile,
// returns `unredeemable-state` result-first, NOT appended, NO transitionRef — on every
// profile/state at slice 3 (the effect edges are slice 5). Both cases below finalize first
// so the record is CONFIRMED — the capture-only case is capture-terminal (redundant but
// still refused: the stub does not special-case terminality either), and the effect-seam
// case is exactly the "awaiting redemption" non-terminal state the stub must refuse. =====

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
    'redeem() never appends at slice 3 — no transitionRef',
  );

  const chainAfter = await handles.operator.readChain(recordId);
  assert.deepEqual(
    chainAfter,
    chainBefore,
    'redeem() appends nothing — the chain is byte-for-byte unchanged',
  );
});

test('redeem() on an effect-seam CONFIRMED record awaiting redemption -> unredeemable-state, not appended, no transitionRef', async () => {
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

  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined);

  const chainAfter = await handles.operator.readChain(recordId);
  assert.deepEqual(
    chainAfter,
    chainBefore,
    'redeem() appends nothing — the chain is byte-for-byte unchanged',
  );
  assert.equal(
    (await handles.operator.getRecord(recordId))?.state,
    'confirmed',
    'the record stays confirmed/non-terminal — redeem() is a stub, not a real seam',
  );
});
