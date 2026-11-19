// The one caller file deferral-register row 15 names: the backing-parameterized
// conformance suite runs unchanged over PostgresStore. A fresh Postgres schema per
// factory call is what "fresh, empty store" means for a server backing — the factory
// stays synchronous (the suite's own signature) because construction is lazy: DDL runs
// behind a memoized promise on first use.
//
// The host transaction is a client checked out of the shared pool with its own BEGIN — this
// backing's enlistment surface (a pg client whose transaction the caller owns). Ending it,
// either way, releases the client; a client whose COMMIT or ROLLBACK itself failed is released
// with that error, so pg destroys it rather than handing an aborted transaction to the next
// borrower.
import type pg from 'pg';
import { runStoreConformance } from '../../record/test/conformance/store-conformance.js';
import { newStore, sharedPool } from './helpers/pg.js';

/** Runs `statement` on the host's client, then releases it — with the error, if it failed. */
async function endHostTransaction(tx: unknown, statement: 'COMMIT' | 'ROLLBACK'): Promise<void> {
  const client = tx as pg.PoolClient;
  let failure: Error | undefined;
  try {
    await client.query(statement);
  } catch (err) {
    failure = err instanceof Error ? err : new Error(String(err));
    throw err;
  } finally {
    client.release(failure);
  }
}

runStoreConformance('PostgresStore (embedded)', () => newStore(), {
  begin: async () => {
    const client = await sharedPool().connect();
    try {
      await client.query('BEGIN');
    } catch (err) {
      client.release(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
    return client;
  },
  commit: (_store, tx) => endHostTransaction(tx, 'COMMIT'),
  rollback: (_store, tx) => endHostTransaction(tx, 'ROLLBACK'),
});
