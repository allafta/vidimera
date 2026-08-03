// @vidimera/record — content-drift.test.ts (SPEC §3 "Content binding", re-checked at
// finalize per SPEC §9): at finalize() the `content` arg is
// re-canonicalized through the profile's adopter canonicalizer + library JCS and digested;
// a mismatch vs the record's bound `contentDigest` → `content-drift`. Default leg: the
// record stays OPEN, NO append, NO transitionRef. A leg listing `content-drift` in
// `terminalRefusals` appends `open→refused` (transitionRef present) — the terminal-vs-
// non-terminal branch.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create } from '../src/create.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const PROFILE_ID = 'test.capture.v1';
const STAGED_CONTENT = { subject: 'week-1', total: 40 };
const DRIFTED_CONTENT = { subject: 'week-1', total: 41 };

test('finalize() with content DIFFERENT from what was staged → content-drift; default leg stays OPEN, no append, no transitionRef', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, STAGED_CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const outcome = await handles.operator.finalize(recordId, identity(), DRIFTED_CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'content-drift');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined, 'a default-leg drift refusal appends nothing');

  const chain = await handles.operator.readChain(recordId);
  assert.equal(chain.length, 1, 'the record stays open with just [opened]');
  assert.equal((await handles.operator.getRecord(recordId))?.state, 'open');
});

test('finalize() with the SAME content presented in a different key order does NOT drift (JCS is order-insensitive) — it confirms', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, STAGED_CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const reordered = { total: 40, subject: 'week-1' }; // same content, different key order
  const outcome = await handles.operator.finalize(recordId, identity(), reordered, facts());
  assert.equal(
    outcome.status,
    'ok',
    'a content-equal re-presentation is not drift; finalize confirms',
  );
  if (outcome.status !== 'ok') return;
  assert.equal(outcome.value.state, 'confirmed');
});

test('a leg with terminalRefusals:[content-drift] appends open→refused with a transitionRef (the appendsOn rule, SPEC §8)', async () => {
  const handles = create(makeConfig([captureProfile({ terminalRefusals: ['content-drift'] })]));
  const recordId = await openRecord(handles, STAGED_CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const outcome = await handles.operator.finalize(recordId, identity(), DRIFTED_CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'content-drift');
  assert.ok(
    outcome.transitionRef,
    'a terminalRefusals-listed drift carries the appended refused edge digest',
  );

  const chain = await handles.operator.readChain(recordId);
  assert.equal(chain.length, 2, 'the drift appended [opened, refused]');
  const refusedTransition = chain[1];
  if (refusedTransition === undefined)
    throw new Error(
      'content-drift.test.ts: chain[1] missing — the terminal drift refusal must have appended a second transition',
    );
  assert.equal(refusedTransition.kind, 'refused');
  assert.deepEqual(
    refusedTransition.payload,
    { code: 'content-drift' },
    'refused payload is {code}-only',
  );
  assert.equal(
    refusedTransition.payload &&
      (refusedTransition.payload as Record<string, unknown>).transitionRef,
    undefined,
  );
  assert.equal((await handles.operator.getRecord(recordId))?.state, 'refused');
  // The appended refused edge digest IS the returned transitionRef.
  assert.equal(outcome.transitionRef, await handles.operator.chainHead(recordId));
});
