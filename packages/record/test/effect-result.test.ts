// @vidimera/record — effect-result.test.ts: the effect-result increment (SPEC §11.2's
// result notarization, §9.1's `redeem.result` declaration, §4's `redeemed` payload key).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import {
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 42 };
const RESULT = `sha256:${'c'.repeat(64)}`;

/** An effect-seam profile that declares result notarization. */
function resultProfile(): ConfirmProfile {
  const profile = effectSeamProfile();
  profile.redeem = { ...profile.redeem, result: true };
  return profile;
}

async function confirmed(profile: ConfirmProfile) {
  const handles = create(makeConfig([profile]));
  const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  return { handles, recordId };
}

test('result notarization: the direct seam binds the claimed digest and replay folds it', async () => {
  const { handles, recordId } = await confirmed(resultProfile());
  const res = await handles.operator.redeem(recordId, CONTENT, { result: { digest: RESULT } });
  assert.equal(res.status, 'ok');

  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'redeemed');
  assert.equal(record?.resultDigest, RESULT);
});

test('result notarization: the token completion binds it; issuance never does', async () => {
  const { handles, recordId } = await confirmed(resultProfile());
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok');
  const token = begun.status === 'ok' ? begun.value.token : '';
  const done = await handles.operator.completeRedemption(recordId, token, CONTENT, {
    result: { digest: RESULT },
  });
  assert.equal(done.status, 'ok');
  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.resultDigest, RESULT);
});

test('result notarization: a declaring profile that supplies nothing records nothing', async () => {
  const { handles, recordId } = await confirmed(resultProfile());
  const res = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(res.status, 'ok');
  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.resultDigest, undefined);
});

test('result notarization: supplying one on a non-declaring profile throws', async () => {
  const { handles, recordId } = await confirmed(effectSeamProfile()); // no result declaration
  await assert.rejects(
    () => handles.operator.redeem(recordId, CONTENT, { result: { digest: RESULT } }),
    /does not declare/i,
  );
});

test('result notarization: beginRedemption rejects a result even on a declaring profile', async () => {
  const { handles, recordId } = await confirmed(resultProfile());
  await assert.rejects(
    () => handles.operator.beginRedemption(recordId, CONTENT, { result: { digest: RESULT } }),
    /issuance/i,
  );
});

test('result notarization: malformed result shapes throw at intake', async () => {
  const { handles, recordId } = await confirmed(resultProfile());
  await assert.rejects(
    () => handles.operator.redeem(recordId, CONTENT, { result: {} } as never),
    /digest/i,
  );
  await assert.rejects(
    () => handles.operator.redeem(recordId, CONTENT, { result: { digest: '' } } as never),
    /digest/i,
  );
  await assert.rejects(
    () =>
      handles.operator.redeem(recordId, CONTENT, {
        result: { digest: RESULT, extra: 1 },
      } as never),
    /unknown key|exactly/i,
  );
  await assert.rejects(
    () => handles.operator.redeem(recordId, CONTENT, { nope: 1 } as never),
    /accepts only tx and result/i,
  );
});

test('construction: redeem.result must be the literal true when declared', async () => {
  const profile = resultProfile();
  (profile.redeem as Record<string, unknown>).result = false;
  assert.throws(() => create(makeConfig([profile])), /literal true/i);
});
