// @vidimera/record — decline.test.ts: the recorded-human-decline increment (SPEC §9's
// decline seam). This file owns the kind/state wiring pins, the construction pins, the
// seam's ladder pins, and the interaction pins.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create } from '../src/create.js';
import { isStateLeaving, stateOf } from '../src/store/semantics.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

test('stateOf: declined maps to the declined state and is state-leaving', () => {
  assert.equal(stateOf('declined'), 'declined');
  assert.equal(isStateLeaving('declined'), true);
});

test('construction: decline must be the literal true when declared — the signing rule class', () => {
  const profile = captureProfile();
  (profile.legs[0] as unknown as Record<string, unknown>).decline = false;
  assert.throws(() => create(makeConfig([profile])), /literal true/i);
});

test('construction: a decline-declaring leg constructs', () => {
  assert.doesNotThrow(() => create(makeConfig([captureProfile({ decline: true })])));
});

const CHECKER = { principal: 'svc:hr-check', authority: 'mtls:hr-check' };
const DIGEST = `sha256:${'b'.repeat(64)}`;
const CONTENT = { amount: 40 };

async function declinable(overrides: Parameters<typeof captureProfile>[0] = {}) {
  const profile = captureProfile({ decline: true, ...overrides });
  const handles = create(makeConfig([profile]));
  const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  return { handles, recordId, profile };
}

test('decline: happy path — terminal declined, actor bound, batch mirrors confirm', async () => {
  const { handles, recordId } = await declinable();
  const res = await handles.operator.decline(recordId, identity(), CONTENT, facts(), {
    consultations: [
      { kind: 'decline-reason', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
    ],
  });
  assert.equal(res.status, 'ok');
  assert.equal(res.status === 'ok' && res.value.state, 'declined');

  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'declined');
  assert.deepEqual(record?.actor, identity());
  assert.deepEqual(
    record?.consultations.map((c) => c.kind),
    ['chain-verify', 'facts', 'decline-reason'],
  );
  const chain = await handles.operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => t.kind),
    [
      'opened',
      'consultation-recorded',
      'consultation-recorded',
      'consultation-recorded',
      'declined',
    ],
  );
});

test('decline: a non-declaring leg throws — the findings-seams posture', async () => {
  const profile = captureProfile(); // no decline
  const handles = create(makeConfig([profile]));
  const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  await assert.rejects(
    () => handles.operator.decline(recordId, identity(), CONTENT, facts()),
    /decline/,
  );
});

test('decline: unknown option keys throw — policy is deliberately not accepted', async () => {
  const { handles, recordId } = await declinable();
  await assert.rejects(
    () =>
      handles.operator.decline(recordId, identity(), CONTENT, facts(), {
        policy: { digest: DIGEST },
      } as never),
    /decline\(\) accepts only consultations/,
  );
});

test('decline: unknown recordId throws — caller error, never a refusal', async () => {
  const { handles } = await declinable();
  await assert.rejects(
    () => handles.operator.decline('rec_none', identity(), CONTENT, facts()),
    /unknown recordId/,
  );
});
