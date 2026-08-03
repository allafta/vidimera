// @vidimera/record — review.test.ts (SPEC §9 `review(recordId)`):
// `review()` is a PURE content-free read. On both an open AND a confirmed record the
// returned `ReviewView` carries METADATA + `contentDigest` only — no content body,
// consultations surfaced as `payloadDigest` — and `chainHead` / `readChain` length / the
// record state are INVARIANT across the call (review appends nothing, changes no state).

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

test('review() on an OPEN record: ReviewView carries metadata + contentDigest only (no content body); consultations empty', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const content = { subject: 'week-1', total: 40 };
  const recordId = await openRecord(handles, content, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const before = {
    head: await handles.operator.chainHead(recordId),
    length: (await handles.operator.readChain(recordId)).length,
    state: (await handles.operator.getRecord(recordId))?.state,
  };

  const outcome = await handles.operator.review(recordId);
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;
  const view = outcome.value;

  // Exactly the ReviewView metadata shape — recordId/profileId/legId/subjectRef/contentDigest/
  // state/consultations — and NO content body (no `content`/`figures`/raw-payload field).
  assert.equal(view.recordId, recordId);
  assert.equal(view.profileId, PROFILE_ID);
  assert.equal(view.legId, 'approver-decide');
  assert.equal(view.subjectRef, DEFAULT_SUBJECT_REF);
  assert.match(view.contentDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(view.state, 'open');
  assert.deepEqual(view.consultations, []);
  assert.ok(!('content' in view), 'ReviewView carries NO content body');
  assert.ok(!('figures' in view), 'ReviewView carries NO figures body');
  // T3.4: refusalCode is present-iff-present — an OPEN (non-refused) record carries NO key.
  assert.equal(
    'refusalCode' in view,
    false,
    'an OPEN record carries NO refusalCode key (present-iff-present)',
  );

  // Invariance: review() is a pure read — head, chain length, and state are unchanged.
  const after = {
    head: await handles.operator.chainHead(recordId),
    length: (await handles.operator.readChain(recordId)).length,
    state: (await handles.operator.getRecord(recordId))?.state,
  };
  assert.deepEqual(after, before, 'review() appends nothing and changes no state');
});

test('review() on a CONFIRMED record: consultations surfaced as payloadDigest (no raw payload body); state confirmed; invariant across the call', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const content = { subject: 'week-1', total: 40 };
  const recordId = await openRecord(handles, content, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const confirmed = await handles.operator.finalize(recordId, identity(), content, facts());
  assert.equal(confirmed.status, 'ok');
  if (confirmed.status !== 'ok') return;

  const before = {
    head: await handles.operator.chainHead(recordId),
    length: (await handles.operator.readChain(recordId)).length,
    state: (await handles.operator.getRecord(recordId))?.state,
  };

  const outcome = await handles.operator.review(recordId);
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;
  const view = outcome.value;

  assert.equal(view.state, 'confirmed');
  assert.match(view.contentDigest, /^sha256:[0-9a-f]{64}$/);
  assert.ok(!('content' in view), 'ReviewView carries NO content body even when confirmed');
  // T3.4: a CONFIRMED (non-refused) record carries NO refusalCode key either (present-iff-present).
  assert.equal('refusalCode' in view, false, 'a CONFIRMED record carries NO refusalCode key');

  // The two success-batch consultations (chain-verify + facts) are surfaced, each carrying a
  // payloadDigest and NO raw payload body (a Consultation has no raw-payload field by shape).
  assert.equal(view.consultations.length, 2);
  assert.deepEqual(
    view.consultations.map((c) => c.kind),
    ['chain-verify', 'facts'],
  );
  for (const c of view.consultations) {
    assert.match(c.payloadDigest, /^sha256:[0-9a-f]{64}$/);
    assert.equal(c.verdict, 'pass');
    assert.ok(
      !('payload' in c),
      'a surfaced Consultation carries payloadDigest, not a raw payload',
    );
  }

  const after = {
    head: await handles.operator.chainHead(recordId),
    length: (await handles.operator.readChain(recordId)).length,
    state: (await handles.operator.getRecord(recordId))?.state,
  };
  assert.deepEqual(
    after,
    before,
    'review() on a confirmed record still appends nothing and changes no state',
  );
});

test('T3.4: review() on a REFUSED record carries refusalCode = the refusal reason (present-iff-present, the policyDigest rule); an audit surface must not hide it', async () => {
  const handles = create(makeConfig([captureProfile({ terminalRefusals: ['content-drift'] })]));
  const content = { subject: 'week-1', total: 40 };
  const recordId = await openRecord(handles, content, PROFILE_ID, DEFAULT_SUBJECT_REF);

  // Finalize with DRIFTED content → content-drift; the leg lists it terminal → an open→refused edge
  // lands, so replay folds `refusalCode: 'content-drift'` onto the record.
  const refusedOut = await handles.operator.finalize(
    recordId,
    identity(),
    { ...content, total: 999 },
    facts(),
  );
  assert.equal(refusedOut.status, 'refused');
  if (refusedOut.status !== 'refused') return;
  assert.equal(refusedOut.code, 'content-drift');
  assert.equal((await handles.operator.getRecord(recordId))?.state, 'refused');

  const outcome = await handles.operator.review(recordId);
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;
  const view = outcome.value;
  assert.equal(view.state, 'refused');
  // The KEY is present on a refused record, and it carries the refusal reason. (Cast keeps the
  // test compilable against the pre-T3.4 ReviewView; post-change the field is native.)
  assert.equal('refusalCode' in view, true, 'a REFUSED record surfaces the refusalCode key');
  assert.equal(
    (view as { refusalCode?: string }).refusalCode,
    'content-drift',
    'review() surfaces the refusal reason on a refused record',
  );
});

test("review() on a NONEXISTENT record THROWS (via replay()'s empty-chain guard) — the surface's replay-throws posture; no fitting unknown-record RefusalCode exists", async () => {
  const handles = create(makeConfig([captureProfile()]));
  await assert.rejects(() => handles.operator.review('no-such-record'), /empty chain/);
});
