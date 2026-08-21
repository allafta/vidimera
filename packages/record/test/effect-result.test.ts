// @vidimera/record — effect-result.test.ts: the effect-result increment (SPEC §11.2's
// result notarization, §9.1's `redeem.result` declaration, §4's `redeemed` payload key).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';
import { signingSetup } from './helpers/signing.js';

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

test('the redeemed payload key set: base keys plus exactly resultDigest, both shapes', async () => {
  // Direct shape.
  {
    const { handles, recordId } = await confirmed(resultProfile());
    const res = await handles.operator.redeem(recordId, CONTENT, { result: { digest: RESULT } });
    assert.equal(res.status, 'ok');
    const chain = await handles.operator.readChain(recordId);
    const last = chain.at(-1);
    assert.ok(last !== undefined);
    const payload = last.payload as Record<string, unknown>;
    assert.deepEqual(
      Object.keys(payload).sort(),
      ['resultDigest', 'via'],
      'present-iff-supplied: exactly the direct base key set plus resultDigest',
    );
  }
  // Token shape.
  {
    const { handles, recordId } = await confirmed(resultProfile());
    const begun = await handles.operator.beginRedemption(recordId, CONTENT);
    assert.equal(begun.status, 'ok');
    const done = await handles.operator.completeRedemption(
      recordId,
      begun.status === 'ok' ? begun.value.token : '',
      CONTENT,
      { result: { digest: RESULT } },
    );
    assert.equal(done.status, 'ok');
    const chain = await handles.operator.readChain(recordId);
    const last = chain.at(-1);
    assert.ok(last !== undefined);
    const payload = last.payload as Record<string, unknown>;
    assert.deepEqual(
      Object.keys(payload).sort(),
      ['resultDigest', 'tokenDigest', 'via'],
      'present-iff-supplied: exactly the token base key set plus resultDigest',
    );
  }
  // Absent: the pre-increment shapes, unchanged.
  {
    const { handles, recordId } = await confirmed(resultProfile());
    const res = await handles.operator.redeem(recordId, CONTENT);
    assert.equal(res.status, 'ok');
    const chain = await handles.operator.readChain(recordId);
    const last = chain.at(-1);
    assert.ok(last !== undefined);
    assert.deepEqual(Object.keys(last.payload as Record<string, unknown>).sort(), ['via']);
  }
});

// Gate-order VERIFICATION (per the controller resolution): read in `kernel/redeem.ts`.
//   - `redeem()` calls `validateRedeemOptions('redeem', opts)` (the intake shape check)
//     BEFORE `prologue()` ever runs (redeem.ts lines 338-342) — a malformed `opts.result`
//     throws at intake depth, before profile resolution or the admission gate exist to
//     run at all.
//   - The admission gate (`opts?.result !== undefined && resolved.profile.redeem?.result
//     !== true` -> throw, redeem.ts lines 350-355) sits AFTER `prologue()` returns its
//     `gated` branch. `prologue()`'s own rung (3), `if (!resolved.effectSeam || !finalLeg)
//     return { refusal: refused('unredeemable-state') }` (redeem.ts lines 235-237), fires
//     INSIDE prologue and is returned via `if ('refusal' in pro) return pro.refusal;`
//     (line 343) — strictly before the admission gate at line 350 is ever reached.
//   CONFIRMED: for a pure-capture profile (no `redeem` block -> `resolved.effectSeam ===
//   false`), a `redeem()` call carrying a well-formed `opts.result` never reaches the
//   admission throw — it refuses `unredeemable-state` from the seam gate first. The pin
//   below asserts exactly that true order.
test('gate order: the intake throw beats the admission throw; both sit behind the seam gate', async () => {
  // Intake beats admission: a malformed result on a NON-declaring profile throws the
  // shape error (intake depth), never the admission error (profile depth).
  {
    const { handles, recordId } = await confirmed(effectSeamProfile());
    await assert.rejects(
      () => handles.operator.redeem(recordId, CONTENT, { result: {} } as never),
      /digest/i,
    );
  }
  // The seam gate outranks admission: a pure-capture profile has no redeemable seam, so
  // a supplied result on it refuses `unredeemable-state` rather than throwing.
  {
    const profile = captureProfile();
    const handles = create(makeConfig([profile]));
    const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
    const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(done.status, 'ok');
    const res = await handles.operator.redeem(recordId, CONTENT, {
      result: { digest: RESULT },
    } as never);
    assert.equal(res.status, 'refused');
    assert.equal(res.status === 'refused' && res.code, 'unredeemable-state');
  }
});

test('construction: a stray result key outside the redeem block throws', async () => {
  const profile = resultProfile();
  (profile as unknown as Record<string, unknown>).result = true;
  assert.throws(() => create(makeConfig([profile])), /redeem/i);
});

// The two composition pins below (correspondence-precedes-binding, sealing-preserves-the-
// binding). Verified against `kernel/redeem.ts`'s correspondence rung (5) before
// asserting: the CONTENT recompute-and-compare happens
// BEFORE the `redeemed` append (6), and `resultProfile()` (== `effectSeamProfile()` +
// `redeem.result: true`) never declares `reverify`, so a content mismatch always routes
// through `refuseCorrespondenceMismatch`'s `resolved.profile.redeem?.reverify !== true`
// branch, which returns `refused('effect-mismatch')` with NO append at all (redeem.ts
// lines 120-122) — never the reverify-only appended-`content-drift` branch. The record
// therefore never leaves `confirmed` and no `resultDigest` is ever bound.
test('correspondence precedes the binding: a drifted redemption carrying a result binds nothing', async () => {
  const { handles, recordId } = await confirmed(resultProfile());
  const res = await handles.operator.redeem(
    recordId,
    { subject: 'week-1', total: 43 },
    {
      result: { digest: RESULT },
    },
  );
  assert.equal(res.status, 'refused');
  assert.equal(res.status === 'refused' && res.code, 'effect-mismatch');
  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'confirmed'); // still awaiting redemption
  assert.equal(record?.resultDigest, undefined); // nothing bound
});

test('sealing caps a result-carrying redeemed chain and reports retired', async () => {
  const { handles, recordId } = await confirmed(resultProfile());
  const res = await handles.operator.redeem(recordId, CONTENT, { result: { digest: RESULT } });
  assert.equal(res.status, 'ok');
  const sealed = await handles.operator.seal(recordId);
  assert.equal(sealed.status, 'ok');
  assert.equal(sealed.status === 'ok' && sealed.value.status, 'retired');
  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.resultDigest, RESULT); // the cap preserves the binding
});

test('AL2: a signing, result-declaring effect-seam profile — signed redemption, every transition signed and verified', async () => {
  const profile: ConfirmProfile = { ...resultProfile(), signing: true };
  const { handles } = signingSetup(profile);
  const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const res = await handles.operator.redeem(recordId, CONTENT, { result: { digest: RESULT } });
  assert.equal(res.status, 'ok');

  const report = await handles.operator.verifySignatures(recordId);
  assert.equal(report.signingDeclared, true);
  const chain = await handles.operator.readChain(recordId);
  assert.equal(report.transitions.length, chain.length);
  assert.ok(
    report.transitions.every((t) => t.signed === true && t.verified === true),
    'every transition in the result-carrying redeemed chain is signed and verified',
  );
});
