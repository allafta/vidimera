// Backing-specific pins for PostgresStore — the tx-seam caller errors and enlistment
// semantics sqlite-store.test.ts pins for its own backing. The conformance suite owns
// everything backing-generic; only what is Postgres-shaped lives here.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { storeGenesis } from '../../record/test/helpers/chain.js';
import { newStore, sharedPool } from './helpers/pg.js';

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
