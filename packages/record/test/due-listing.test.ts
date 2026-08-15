// @vidimera/record — due-listing.test.ts (SPEC §12's `listDue`): the pending-clock column
// and the read that makes it observable. `dueAt` is a STORE column, not part of the record
// model — SPEC §12 calls it a listing index and says it is never authoritative — so
// `getRecord` cannot see it and `listDue` is the only shipped path that can. Three
// producers set it as of the third step-3 increment: the genesis `opened` append (the
// profile's open-window ttl), finalize's `confirmed` append (the declared `confirmToRedeem`
// window), and beginRedemption's `redeeming` append (the declared `redeemBound` window) —
// and every state-leaving append clears it by omission.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { create } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
// `captureProfile()`'s default expiry is `{ ttl: 3600 }` — seconds, per SPEC §9.1 — so the
// open window closes exactly one hour after the genesis stamp.
const HOUR_MS = 3600_000;

test('listDue: a record opened under a ttl is listed once its open window has closed, and not before', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  const chain = await handles.operator.readChain(recordId);
  const genesis = chain[0];
  assert.ok(genesis !== undefined);
  const openedMs = Date.parse(genesis.at);

  assert.deepEqual(await store.listDue(new Date(openedMs)), [], 'not due at the moment it opened');
  assert.deepEqual(
    await store.listDue(new Date(openedMs + HOUR_MS - 1)),
    [],
    'not due one millisecond before the bound',
  );
  assert.deepEqual(
    await store.listDue(new Date(openedMs + HOUR_MS)),
    [recordId],
    'due exactly AT the bound — the gate is `<=`, not `<`',
  );
  assert.deepEqual(
    await store.listDue(new Date(openedMs + HOUR_MS * 2)),
    [recordId],
    'still due after',
  );
});

test('listDue: a record under expiry:none has no pending clock and is never listed', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile({ expiry: 'none' })], { store }));
  await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  assert.deepEqual(
    await store.listDue(new Date(Date.UTC(2099, 0, 1))),
    [],
    'no bound means never listed, however far the clock runs',
  );
});

test('listDue: finalizing clears the pending clock — a state-leaving append carrying no new clock', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'ok');

  assert.deepEqual(
    await store.listDue(new Date(Date.UTC(2099, 0, 1))),
    [],
    'the confirmed batch carries no clock, so its post-batch meta clears the column',
  );
});
