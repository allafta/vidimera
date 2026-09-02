// @vidimera/record — sqlite-store.test.ts: the embedded backing's OWN pins — everything
// here is deliberately backing-specific (the conformance suite carries the contract):
// file-backed durability, tx enlistment (SPEC §12: "enlisted in that transaction and
// commits or rolls back with it" — enlisted, never wrapped), the foreign-handle and
// no-open-transaction throws, and the JSON-drop payload-consistency pin that is this
// backing's counterpart to MemoryStore's DataCloneError posture.

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, test, vi } from 'vitest';

import { verifyChain } from '../src/chain/replay.js';
import { SqliteStore } from '../src/store/sqlite.js';
import { storeGenesis, storeNext } from './helpers/chain.js';
import { APPROVER } from './helpers/store-fixtures.js';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'vidimera-sqlite-'));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  return join(dir, 'store.db');
}

test('durability: a file-backed chain survives close-and-reopen byte-identically', async () => {
  const path = tempDbPath();
  const first = new SqliteStore(path);
  const genesis = storeGenesis('rec-durable', 'profile.p1', 'subject:s1');
  await first.appendTransition(null, genesis, { nonTerminal: true });
  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  await first.appendTransition('open', confirmed, { nonTerminal: false });
  const before = await first.readChain('rec-durable');
  first.database.close();

  const reopened = new SqliteStore(path);
  const after = await reopened.readChain('rec-durable');
  reopened.database.close();
  assert.deepEqual(after, before, 'the chain must survive process death');
  assert.equal(verifyChain(after).intact, true, 'and still verify');
});

test('tx enlistment: a write inside the host transaction rolls back with it', async () => {
  const store = new SqliteStore(':memory:');
  const genesis = storeGenesis('rec-enlist', 'profile.p1', 'subject:s1');
  await store.appendTransition(null, genesis, { nonTerminal: true });

  store.database.exec('BEGIN IMMEDIATE');
  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  const res = await store.appendTransition(
    'open',
    confirmed,
    { nonTerminal: false },
    store.database,
  );
  assert.equal(res.appended, true, 'the enlisted write reports success inside the txn');
  store.database.exec('ROLLBACK');

  const chain = await store.readChain('rec-enlist');
  assert.equal(chain.length, 1, "the host's ROLLBACK took the enlisted write with it");
});

test('tx enlistment: a write inside the host transaction commits with it', async () => {
  const store = new SqliteStore(':memory:');
  const genesis = storeGenesis('rec-enlist-commit', 'profile.p1', 'subject:s1');
  await store.appendTransition(null, genesis, { nonTerminal: true });

  store.database.exec('BEGIN IMMEDIATE');
  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  await store.appendTransition('open', confirmed, { nonTerminal: false }, store.database);
  store.database.exec('COMMIT');

  const chain = await store.readChain('rec-enlist-commit');
  assert.equal(chain.length, 2, "the host's COMMIT landed the enlisted write");
});

test('tx validation: a foreign DatabaseSync is refused loudly (split-brain guard)', async () => {
  // A different connection is a DIFFERENT database for ':memory:' and a different
  // transaction scope for a file — enlisting on it would silently write elsewhere.
  const store = new SqliteStore(':memory:');
  const foreign = new DatabaseSync(':memory:');
  foreign.exec('BEGIN');
  const genesis = storeGenesis('rec-foreign', 'profile.p1', 'subject:s1');
  await assert.rejects(
    () => store.appendTransition(null, genesis, { nonTerminal: true }, foreign),
    /not this store's own connection/,
  );
});

test('tx validation: the store connection WITHOUT an open transaction is refused', async () => {
  // Autocommit-per-statement under a supplied handle would break write atomicity; the
  // boundary is the host's to own — SPEC §12: "The transaction boundary is never hidden
  // from the caller".
  const store = new SqliteStore(':memory:');
  const genesis = storeGenesis('rec-notx', 'profile.p1', 'subject:s1');
  await assert.rejects(
    () => store.appendTransition(null, genesis, { nonTerminal: true }, store.database),
    /no open transaction/,
  );
});

test('payload posture: a function-valued member is dropped CONSISTENTLY with the digest', async () => {
  // This backing's counterpart to MemoryStore's DataCloneError: JSON.stringify drops the
  // member, and library JCS dropped the same member when digesting, so persisted bytes
  // and digest agree — verifyChain stays green over the round-trip.
  const store = new SqliteStore(':memory:');
  const genesis = storeGenesis('rec-jsondrop', 'profile.p1', 'subject:s1');
  await store.appendTransition(null, genesis, { nonTerminal: true });
  const confirmed = storeNext(genesis, 'confirmed', {
    actor: APPROVER,
    describe: () => 'not JSON-representable',
  });
  const res = await store.appendTransition('open', confirmed, { nonTerminal: false });
  assert.equal(res.appended, true);

  const chain = await store.readChain('rec-jsondrop');
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.ok(
    !('describe' in (last.payload as Record<string, unknown>)),
    'the function member is gone from the persisted payload',
  );
  assert.equal(verifyChain(chain).intact, true, 'and the digests still verify');
});

test('close(): closes the adapter connection — a later call throws, and the file-backed chain survives to a reopen', async () => {
  // Backing-specific by design (the review's phase 6): `close` is not a Store method — the
  // memory backing has nothing to close and the Postgres backing never owns its pool — so it
  // lives on this class alone, beside the `database` getter callers reached through before.
  const path = tempDbPath();
  const store = new SqliteStore(path);
  const genesis = storeGenesis('rec-close', 'profile.p1', 'subject:s1');
  assert.equal((await store.appendTransition(null, genesis, { nonTerminal: true })).appended, true);
  store.close();
  await assert.rejects(store.readChain('rec-close'), /not open|closed/i);

  const reopened = new SqliteStore(path);
  assert.equal((await reopened.readChain('rec-close')).length, 1, 'closed cleanly — durable');
  reopened.close();
});

test('prepared statements are cached: repeated reads do not re-prepare — the prepare count is bounded by the distinct statements, not the calls', async () => {
  // Observable through the connection class itself: `prepare` is a prototype method, so a spy
  // on it counts every preparation this store performs without any injection seam.
  const prepare = vi.spyOn(DatabaseSync.prototype, 'prepare');
  try {
    const store = new SqliteStore(':memory:');
    const genesis = storeGenesis('rec-prep', 'profile.p1', 'subject:s1');
    assert.equal(
      (await store.appendTransition(null, genesis, { nonTerminal: true })).appended,
      true,
    );
    const before = prepare.mock.calls.length;
    for (let i = 0; i < 20; i += 1) await store.readChain('rec-prep');
    for (let i = 0; i < 20; i += 1) await store.chainHead('rec-prep');
    const prepared = prepare.mock.calls.length - before;
    assert.ok(
      prepared <= 2,
      `forty reads over two distinct statements prepared ${prepared} times — one per statement, ever`,
    );
    assert.equal((await store.readChain('rec-prep')).length, 1, 'the cached statement still reads');
  } finally {
    prepare.mockRestore();
  }
});
