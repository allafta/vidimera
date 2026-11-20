// @vidimera/record — effect-result.test.ts: the effect-result increment (SPEC §11.2's
// result notarization, §9.1's `redeem.result` declaration, §4's `redeemed` payload key).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConfirmProfile } from '../src/config.js';
import { create, createWithClock } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import type { Store } from '../src/store/store.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
  tamperNonLast,
} from './helpers/profiles.js';
import { signingSetup } from './helpers/signing.js';
import { TamperingStore } from './helpers/stores.js';

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
//     BEFORE `prologue()` ever runs — a malformed `opts.result` throws at intake depth,
//     before profile resolution or the admission gate exist to run at all.
//   - The admission gate (a supplied result on a profile whose `redeem.result` is not
//     `true` -> throw) sits INSIDE `prologue()`, after its rung (3) — `if
//     (!resolved.effectSeam || !finalLeg) return { refusal: refused('unredeemable-state') }`
//     — and before its clock rung (moved there by the faults-and-races increment; it used
//     to sit after `prologue()` returned, so a due record resolved its clock first).
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

// Two further gate-order pins: `kernel/redeem.ts`'s own admission-gate comment names two
// more codes that must outrank the admission throw, beyond the seam gate the pin above
// already covers: chain-compromise and unknown-profile. Both are `prologue()`'s rungs (1)
// and (2), which run before its admission gate, exactly like the seam-gate pin above. The
// first pin below runs on a result-DECLARING profile, where the admission throw could never
// fire whatever the order; its twin on a non-declaring profile, after the two, is the one
// that can fail.

test('gate order: a tampered chain on a result-declaring profile refuses chain-compromise before the admission throw can fire', async () => {
  // The established tampered-chain shape (redeem.test.ts's own (1)->(3)/(1)->(5) pins):
  // confirm under a real store, then redeem through a SECOND handle wrapping that same
  // store in a chain-tampering Store double.
  const inner = new MemoryStore();
  const profile = resultProfile();
  const handles0 = create(makeConfig([profile], { store: inner }));
  const recordId = await openRecord(handles0, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  const done = await handles0.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');

  const tampering = new TamperingStore(inner, recordId, tamperNonLast);
  const handles = create(makeConfig([profile], { store: tampering }));
  const outcome = await handles.operator.redeem(recordId, CONTENT, {
    result: { digest: RESULT },
  });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
});

test('gate order: an unresolvable profile refuses unknown-profile before the admission throw can fire', async () => {
  // The established two-instance shape (multi-leg.test.ts's own unknown-leg gate-order
  // pin, "the established two-instance shape"): open/confirm under one create() instance,
  // then call the seam under a SECOND instance sharing the same store whose profile
  // catalog never registered this profileId — `profiles.get(record.profileId)` resolves
  // to nothing for it, the defensive fail-closed branch in `prologue()`.
  const store = new MemoryStore();
  const profile = resultProfile();
  const openingSide = create(makeConfig([profile], { store }));
  const recordId = await openRecord(openingSide, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  const done = await openingSide.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');

  const unaware = create(makeConfig([captureProfile({ id: 'test.unrelated.v1' })], { store }));
  const outcome = await unaware.operator.redeem(recordId, CONTENT, {
    result: { digest: RESULT },
  });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unknown-profile');
});

test('gate order: a tampered chain on a NON-declaring profile refuses chain-compromise before the admission throw can fire', async () => {
  // The twin of the result-declaring pin above, on the profile where the admission throw is
  // live: a stray result here would throw if admission ran before chain-verify.
  const inner = new MemoryStore();
  const profile = effectSeamProfile();
  const handles0 = create(makeConfig([profile], { store: inner }));
  const recordId = await openRecord(handles0, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  const done = await handles0.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');

  const tampering = new TamperingStore(inner, recordId, tamperNonLast);
  const handles = create(makeConfig([profile], { store: tampering }));
  const outcome = await handles.operator.redeem(recordId, CONTENT, {
    result: { digest: RESULT },
  });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
});

// --- admission before the clock -----------------------------------------------------------------
// A stray result on a non-declaring profile is a caller error that throws and records nothing
// (SPEC §8, §11.2), whether or not the record is due: the admission gate sits before the clock
// rung, so a due record keeps its pending window for the next correct call to resolve.

const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);
const CONFIRM_MS = (effectSeamProfile().redeem?.confirmToRedeem ?? 0) * 1000;
const REDEEM_MS = (effectSeamProfile().redeem?.redeemBound ?? 0) * 1000;
const STRAY = { result: { digest: RESULT } };

/** A non-declaring effect-seam record under a controllable clock: confirmed, or redeeming. */
async function underClock(store: Store, clock: { t: number }, redeeming: boolean) {
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store }),
    () => new Date(clock.t),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  let token = '';
  if (redeeming) {
    const begun = await handles.operator.beginRedemption(recordId, CONTENT);
    if (begun.status !== 'ok') throw new Error('fixture: beginRedemption must succeed');
    token = begun.value.token;
  }
  clock.t += (redeeming ? REDEEM_MS : CONFIRM_MS) + 10_000;
  return { handles, recordId, token };
}

test('admission before the clock: a stray result on a DUE-confirmed record of a non-declaring profile throws and appends nothing; the correct call then resolves the window', async () => {
  const clock = { t: T0 };
  const store = new MemoryStore();
  const { handles, recordId } = await underClock(store, clock, false);
  const before = await store.readChain(recordId);
  await assert.rejects(() => handles.operator.redeem(recordId, CONTENT, STRAY), /does not declare/);
  assert.deepEqual(await store.readChain(recordId), before, 'no expired edge, nothing at all');
  assert.equal(before.at(-1)?.kind, 'confirmed');

  const correct = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(correct.status === 'refused' && correct.code, 'unredeemable-state');
  assert.equal((await store.readChain(recordId)).at(-1)?.kind, 'expired');
});

test('admission before the clock: a stray result on a DUE-redeeming record of a non-declaring profile throws at completeRedemption and appends nothing', async () => {
  const clock = { t: T0 };
  const store = new MemoryStore();
  const { handles, recordId, token } = await underClock(store, clock, true);
  const before = await store.readChain(recordId);
  await assert.rejects(
    () => handles.operator.completeRedemption(recordId, token, CONTENT, STRAY),
    /does not declare/,
  );
  assert.deepEqual(await store.readChain(recordId), before, 'no redemption-failed edge');
  assert.equal(before.at(-1)?.kind, 'redeeming');

  const correct = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(correct.status === 'refused' && correct.code, 'redemption-timeout');
});

test('admission before the clock, enlisted on SqliteStore: a stray result on a due record throws, appends nothing, and leaves the host transaction open and usable', async () => {
  for (const redeeming of [false, true]) {
    const sqlite = new SqliteStore(':memory:');
    try {
      const clock = { t: T0 };
      const { handles, recordId, token } = await underClock(sqlite, clock, redeeming);
      const before = await sqlite.readChain(recordId);
      const opts = { tx: sqlite.database, ...STRAY };
      sqlite.database.exec('BEGIN IMMEDIATE');
      let thrown: unknown;
      try {
        if (redeeming) await handles.operator.completeRedemption(recordId, token, CONTENT, opts);
        else await handles.operator.redeem(recordId, CONTENT, opts);
      } catch (e) {
        thrown = e;
      }
      assert.equal(sqlite.database.isTransaction, true, "the host's transaction is still open");
      sqlite.database.exec(
        'CREATE TABLE host_effect (n INTEGER); INSERT INTO host_effect VALUES (1)',
      );
      assert.deepEqual(
        { ...(sqlite.database.prepare('SELECT COUNT(*) AS n FROM host_effect').get() ?? {}) },
        { n: 1 },
        "the host's transaction is still usable",
      );
      sqlite.database.exec('ROLLBACK');
      assert.ok(thrown instanceof Error, 'the stray result throws');
      assert.match(thrown.message, /does not declare/);
      assert.deepEqual(await sqlite.readChain(recordId), before, 'nothing appended');
    } finally {
      sqlite.close();
    }
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
