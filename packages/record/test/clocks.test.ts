// @vidimera/record — clocks.test.ts (SPEC §4 "Clock-driven edges are appended en
// passant"; §9.1 "Redemption bounds"; §12 dueAt/listDue): the third step-3 increment's
// windows. This file owns the clock module's derivation pins and, in later tasks of the
// same increment, the producer/resolution/sweep pins. Deterministic throughout via
// createWithClock — no test sleeps.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { createWithClock } from '../src/create.js';
import { pendingWindow, resolveDueClock } from '../src/kernel/expiry.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);
const HOUR = 3600_000;

/** Opens+finalizes an effect-seam record under a controllable clock; returns the store. */
async function confirmedAt(clockMs: { t: number }, store = new MemoryStore()) {
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store }),
    () => new Date(clockMs.t),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  return { handles, recordId, store };
}

test('pendingWindow: an open record is in the open window; a confirmed effect-seam record with confirmToRedeem is in the confirmed window', async () => {
  const clock = { t: T0 };
  const store = new MemoryStore();
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store }),
    () => new Date(clock.t),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);

  const resolved = {
    profile: effectSeamProfile(),
    canonicalizer: (c: unknown) => c,
    effectSeam: true,
  };
  const openWin = pendingWindow(await store.readChain(recordId), resolved);
  assert.equal(openWin.window, 'open');

  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const confirmedWin = pendingWindow(await store.readChain(recordId), resolved);
  assert.equal(confirmedWin.window, 'confirmed');
  if (confirmedWin.window !== 'confirmed') return;
  // deadline = the confirmed transition's at + confirmToRedeem seconds. Assert against
  // the profile's OWN declared value, never a hardcoded figure — the fixture's bound is
  // the helper's business, not this pin's:
  const declared = effectSeamProfile().redeem?.confirmToRedeem;
  assert.ok(declared !== undefined);
  const chain = await store.readChain(recordId);
  const confirmedTr = chain.find((t) => t.kind === 'confirmed');
  assert.ok(confirmedTr !== undefined);
  assert.equal(confirmedWin.deadlineMs, Date.parse(confirmedTr.at) + declared * 1000);
});

test('resolveDueClock: an elapsed confirmed window appends confirmed → expired { bound } and releases the pair', async () => {
  const clock = { t: T0 };
  const { recordId, store } = await confirmedAt(clock);
  const resolved = {
    profile: effectSeamProfile(),
    canonicalizer: (c: unknown) => c,
    effectSeam: true,
  };

  clock.t = T0 + 400 * HOUR; // far past any declared bound
  const res = await resolveDueClock(
    store,
    await store.readChain(recordId),
    resolved,
    new Date(clock.t),
  );
  assert.equal(res.due, true);
  if (!res.due) return;
  assert.equal(res.window, 'confirmed');
  assert.equal(res.result.appended, true);

  const chain = await store.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'expired');
  // PAYLOAD KEY-SET PIN: exactly { bound }, the crossed deadline, ms-precision RFC 3339.
  assert.deepEqual(Object.keys(last.payload as object), ['bound']);
  const bound = (last.payload as { bound: string }).bound;
  assert.match(bound, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  const confirmedTr = chain.find((t) => t.kind === 'confirmed');
  assert.ok(confirmedTr !== undefined);
  const declared = effectSeamProfile().redeem?.confirmToRedeem;
  assert.ok(declared !== undefined);
  assert.equal(bound, new Date(Date.parse(confirmedTr.at) + declared * 1000).toISOString());

  // THE RELEASE: expired is terminal — the C1 hold lifts.
  assert.equal(await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF), null);
});

test('resolveDueClock: a not-yet-elapsed window reports { due: false } and appends nothing', async () => {
  const clock = { t: T0 };
  const { recordId, store } = await confirmedAt(clock);
  const resolved = {
    profile: effectSeamProfile(),
    canonicalizer: (c: unknown) => c,
    effectSeam: true,
  };
  const before = (await store.readChain(recordId)).length;
  const res = await resolveDueClock(
    store,
    await store.readChain(recordId),
    resolved,
    new Date(T0), // the same instant — nothing has elapsed
  );
  assert.deepEqual(res, { due: false });
  assert.equal((await store.readChain(recordId)).length, before);
});

test('finalize stamps dueAt for a declared confirmToRedeem: listDue lists the record after the bound, not before', async () => {
  const clock = { t: T0 };
  const { recordId, store } = await confirmedAt(clock);
  const declared = effectSeamProfile().redeem?.confirmToRedeem;
  assert.ok(declared !== undefined);

  assert.deepEqual(await store.listDue(new Date(T0 + (declared - 1) * 1000)), []);
  assert.deepEqual(await store.listDue(new Date(T0 + (declared + 1) * 1000)), [recordId]);
});

test('beginRedemption on a redeemBound-declaring profile: payload is exactly { tokenDigest, bound }, dueAt set', async () => {
  const clock = { t: T0 };
  const { handles, recordId, store } = await confirmedAt(clock);
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok', 'fixture: the issuance must succeed');

  const chain = await store.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'redeeming');
  // KEY-SET PIN, declared shape: §4's present-iff-declared, both keys, nothing else.
  assert.deepEqual(Object.keys(last.payload as object).sort(), ['bound', 'tokenDigest']);
  const declared = effectSeamProfile().redeem?.redeemBound;
  assert.ok(declared !== undefined);
  assert.equal(
    (last.payload as { bound: string }).bound,
    new Date(Date.parse(last.at) + declared * 1000).toISOString(),
  );
  assert.deepEqual(await store.listDue(new Date(Date.parse(last.at) + (declared + 1) * 1000)), [
    recordId,
  ]);
});
