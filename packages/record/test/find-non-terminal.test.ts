// @vidimera/record — find-non-terminal.test.ts (SPEC §12's liveness reads): the eighth
// Store method, `findNonTerminal(profileId, subjectRef)` — SPEC §12: "the re-emit binding
// that makes `record-exists` actionable, and the same record C1 names as the blocker".
//
// The store-level layer — a Store driven directly, the flags supplied by hand — moved to
// the backing-parameterized conformance suite (conformance/store-conformance.ts) at the
// fourth step-2 increment; this file keeps the kernel-level layer: records driven through
// create()/createWithClock, the flags coming from the library's own terminality derivation
// (nonterminal.ts), so each test pins what a HOST would actually observe.
//
// NARROWING, pinned here and recorded in store.ts: §12 says the method "returns the live
// non-terminal record for the pair (or nothing)"; this build returns the recordId, on the
// same reasoning as listDue's ids-not-records narrowing.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create, createWithClock } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
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

// === kernel-level: the flags coming from the library's own derivation =================

test('an OPEN record is the live non-terminal record for its pair', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  assert.equal(await store.findNonTerminal('test.capture.v1', DEFAULT_SUBJECT_REF), recordId);
});

test('staging alone creates no record: findNonTerminal stays null', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const staged = await handles.agent.stage(CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  assert.equal(staged.status, 'ok', 'fixture: staging must succeed');
  assert.equal(await store.findNonTerminal('test.capture.v1', DEFAULT_SUBJECT_REF), null);
});

test('a pure-capture final-leg CONFIRMED record is terminal: findNonTerminal -> null', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  assert.equal(await store.findNonTerminal('test.capture.v1', DEFAULT_SUBJECT_REF), null);
});

test('an EXPIRED record is terminal: findNonTerminal -> null', async () => {
  // The expiry idiom from seal.test.ts / expiry.test.ts: the clock is INJECTED via
  // createWithClock and finalize expires the due record en passant. Never sleep in a test.
  const TTL = 3600;
  let nowMs = Date.UTC(2026, 0, 1, 0, 0, 0);
  const clock = () => new Date(nowMs);
  const store = new MemoryStore();
  const handles = createWithClock(makeConfig([captureProfile({ ttl: TTL })], { store }), clock);
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  assert.equal(
    await store.findNonTerminal('test.capture.v1', DEFAULT_SUBJECT_REF),
    recordId,
    'fixture: the open record is the live non-terminal record before it lapses',
  );

  nowMs += (TTL + 1) * 1000; // past the open window
  const lapsed = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(lapsed.status, 'refused', 'fixture: the due record expires en passant');
  assert.equal(await store.findNonTerminal('test.capture.v1', DEFAULT_SUBJECT_REF), null);
});

test('a TERMINAL REFUSED record: findNonTerminal -> null', async () => {
  // A leg listing identity-authority-refused in terminalRefusals makes that refusal append
  // open -> refused, leaving the record terminal (SPEC §8's append semantics).
  const store = new MemoryStore();
  const handles = create(
    makeConfig([captureProfile({ terminalRefusals: ['identity-authority-refused'] })], {
      store,
    }),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const refusedOutcome = await handles.operator.finalize(
    recordId,
    identity({ authority: 'session:wrong-app' }),
    CONTENT,
    facts(),
  );
  assert.equal(refusedOutcome.status, 'refused');
  if (refusedOutcome.status !== 'refused') return;
  assert.equal(refusedOutcome.code, 'identity-authority-refused');
  assert.equal(await store.findNonTerminal('test.capture.v1', DEFAULT_SUBJECT_REF), null);
});

test('an EFFECT-SEAM confirmed record IS the live non-terminal record (the held pair, made visible)', async () => {
  // SPEC §2 makes a final-leg `confirmed` on an effect-seam profile NON-terminal (awaiting
  // redemption). This is the once-registered held (profile, subject) pair (deferral register
  // row 9, retired by building) made VISIBLE: findNonTerminal is how a host discovers which
  // record holds it. Located, not released — the hold lives in C1 and nothing this method
  // returns changes it.
  const store = new MemoryStore();
  const handles = create(makeConfig([effectSeamProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  assert.equal(await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF), recordId);
});

test('a SEALED record stays invisible: findNonTerminal -> null', async () => {
  // SPEC §12 admits seal() only against a derived-terminal record, so the persisted flag
  // was already false before the seal; the state-preserving `sealed` append keeps it false.
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  const sealed = await handles.operator.seal(recordId);
  assert.equal(sealed.status, 'ok', 'fixture: the terminal record must seal');
  assert.equal(await store.findNonTerminal('test.capture.v1', DEFAULT_SUBJECT_REF), null);
});

test('END-TO-END ACTIONABILITY: record-exists -> findNonTerminal -> review()', async () => {
  // SPEC §12: "the re-emit binding that makes `record-exists` actionable". The flow: a
  // second open() on a held pair refuses record-exists with no locator field (by design —
  // §8's outcome model is untouched); the host, holding the profileId and subjectRef it
  // just tried, asks the Store which record blocks it, and can then review that record.
  const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);
  const clock = () => new Date(T0); // fixed clock: the blocker never lapses
  const store = new MemoryStore();
  const handles = createWithClock(makeConfig([captureProfile({ ttl: 3600 })], { store }), clock);

  const recordA = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  const staged = await handles.agent.stage(
    { subject: 'week-2', total: 41 },
    'test.capture.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(staged.status, 'ok', 'fixture: the second draft must stage');
  if (staged.status !== 'ok') return;
  const second = await handles.operator.open(staged.value.stagedRef);
  assert.equal(second.status, 'refused');
  if (second.status !== 'refused') return;
  assert.equal(second.code, 'record-exists');

  const blocker = await store.findNonTerminal('test.capture.v1', DEFAULT_SUBJECT_REF);
  assert.equal(blocker, recordA, 'the lookup names the record that drew the refusal');
  if (blocker === null) return;

  const view = await handles.operator.review(blocker);
  assert.equal(view.status, 'ok', 'the located blocker is reviewable');
});
