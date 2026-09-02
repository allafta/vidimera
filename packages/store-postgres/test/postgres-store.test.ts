// Backing-specific pins for PostgresStore — the tx-seam caller errors and enlistment
// semantics sqlite-store.test.ts pins for its own backing. The conformance suite owns
// everything backing-generic; only what is Postgres-shaped lives here.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { verifyChain } from '../../record/src/chain/replay.js';
import { storeGenesis, storeNext } from '../../record/test/helpers/chain.js';
import { newStore, nextSchemaName, sharedPool } from './helpers/pg.js';

test('tx validation: a foreign object is refused loudly (not a pg client)', async () => {
  const store = newStore();
  await assert.rejects(
    store.putStaged(
      { id: 's-1', profileId: 'p.v1', legId: 'l', subjectRef: 'x', contentDigest: 'sha256:a' },
      { notAClient: true },
    ),
    /not a pg client/,
  );
});

test('tx validation: a client with NO open transaction is refused loudly', async () => {
  const store = newStore();
  const client = await sharedPool().connect();
  try {
    await assert.rejects(
      store.putStaged(
        { id: 's-2', profileId: 'p.v1', legId: 'l', subjectRef: 'x', contentDigest: 'sha256:a' },
        client,
      ),
      /no open transaction/,
    );
  } finally {
    client.release();
  }
});

test('enlistment: a host ROLLBACK erases the enlisted write (SPEC §12: commits or rolls back with it)', async () => {
  const store = newStore();
  const client = await sharedPool().connect();
  try {
    await client.query('BEGIN');
    await store.putStaged(
      { id: 's-3', profileId: 'p.v1', legId: 'l', subjectRef: 'x', contentDigest: 'sha256:a' },
      client,
    );
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
  assert.equal(await store.getStaged('s-3'), null);
});

test('enlistment: a host COMMIT persists the enlisted append', async () => {
  const store = newStore();
  const genesis = storeGenesis('rec-enlist', 'profile.p1', 'subject:enlist');
  const client = await sharedPool().connect();
  try {
    await client.query('BEGIN');
    const result = await store.appendTransition(null, genesis, { nonTerminal: true }, client);
    assert.equal(result.appended, true);
    await client.query('COMMIT');
  } finally {
    client.release();
  }
  const chain = await store.readChain('rec-enlist');
  assert.equal(chain.length, 1);
  assert.equal(await store.findNonTerminal('profile.p1', 'subject:enlist'), 'rec-enlist');
});

test('recovery: a transient failure during lazy DDL does not brick the store — the next call retries', async () => {
  // The review finding this pins shut: a memoized #ready promise that caches a REJECTION
  // replays the stale error forever, so one startup blip permanently bricks the
  // instance — against the backing's own production posture. The flaky pool fails the
  // FIRST connect (the DDL's own client checkout — the DDL runs on one checked-out client
  // inside a transaction, the review's phase 6), then behaves; the store must fail that
  // first call loudly and then recover on the next.
  const real = sharedPool();
  let failed = false;
  const flaky = {
    query: (text: string, values?: unknown[]) => real.query(text, values),
    connect() {
      if (!failed) {
        failed = true;
        return Promise.reject(new Error('transient: connection refused'));
      }
      return real.connect();
    },
  };
  const { PostgresStore } = await import('../src/postgres-store.js');
  const store = new PostgresStore(flaky as never, { schema: nextSchemaName() });

  await assert.rejects(store.getStaged('s-any'), /transient/);
  // The blip is over — the same instance must work now, not replay the stale rejection.
  assert.equal(await store.getStaged('s-any'), null);
});

test('payload posture: a function-valued member is dropped CONSISTENTLY with the digest — exactly SqliteStore posture, as postgres-store.ts claims', async () => {
  // Proves the src/postgres-store.ts claim that the JCS-invisible-member round-trip
  // behavior is exactly SqliteStore's: JSON round-trip drops the member, library JCS
  // dropped the same member when digesting, so persisted bytes and digest agree.
  const store = newStore();
  const genesis = storeGenesis('rec-jsondrop', 'profile.p1', 'subject:jsondrop');
  await store.appendTransition(null, genesis, { nonTerminal: true });
  const confirmed = storeNext(genesis, 'confirmed', {
    actor: { principal: 'approver:posture', authority: 'session:posture' },
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

test('lazy DDL under concurrent first use on ONE schema: every bootstrap succeeds — the advisory lock serializes CREATE … IF NOT EXISTS across connections', async () => {
  // Postgres's known catalog race (the review's phase 6): two connections running
  // `CREATE SCHEMA/TABLE IF NOT EXISTS` at once can leave the loser with a unique violation
  // on the catalog despite the IF NOT EXISTS. Behind a transaction-scoped advisory lock keyed
  // by the schema name the bootstraps serialize and the loser finds the objects present.
  // Stated plainly: without the lock this pin is a probabilistic tripwire (it fails only when
  // the race lands); with it, every round is deterministic.
  const { PostgresStore } = await import('../src/postgres-store.js');
  for (let round = 0; round < 10; round += 1) {
    const schema = nextSchemaName();
    const stores = Array.from({ length: 5 }, () => new PostgresStore(sharedPool(), { schema }));
    const results = await Promise.allSettled(stores.map((s) => s.getStaged('s-bootstrap')));
    for (const r of results) {
      assert.equal(
        r.status,
        'fulfilled',
        r.status === 'rejected' ? `round ${round}: ${String(r.reason)}` : '',
      );
    }
  }
});
