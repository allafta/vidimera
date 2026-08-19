// Real multi-connection contention — the third of deferral-register row 15's proof legs,
// and the one neither existing backing can express: MemoryStore is one process's memory,
// SqliteStore is one connection. Every scenario here races genuinely concurrent
// operations over separate pooled connections (the store's own no-tx path checks out a
// pooled client per call) and asserts the store contract's invariants hold under it: the
// compare-and-swap admits exactly one winner, the C1 constraint names the blocker, seq
// admits no gap and no duplicate, a batch is never observed half-landed, and an enlisted
// transaction's writes are invisible to other connections until commit and gone on
// rollback.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { storeGenesis, storeNext } from '../../record/test/helpers/chain.js';
import { APPROVER, fiveElementBatch } from '../../record/test/helpers/store-fixtures.js';
import { newStore, sharedPool } from './helpers/pg.js';

const RACERS = 8;

test('CAS race: N concurrent appends over one expected state — exactly one wins', async () => {
  const store = newStore();
  const genesis = storeGenesis('rec-cas', 'profile.p1', 'subject:cas');
  assert.equal((await store.appendTransition(null, genesis, { nonTerminal: true })).appended, true);

  const refusedEdge = storeNext(genesis, 'refused', { code: 'content-drift' });
  const results = await Promise.all(
    Array.from({ length: RACERS }, () =>
      store.appendTransition('open', refusedEdge, { nonTerminal: false }),
    ),
  );
  const winners = results.filter((r) => r.appended);
  assert.equal(winners.length, 1, 'exactly one racer lands the edge');
  for (const r of results) {
    if (!r.appended) {
      assert.ok(
        r.conflict === 'state-mismatch' || r.conflict === 'seq',
        'every loser reports the CAS or seq conflict, never a partial success',
      );
    }
  }
  const chain = await store.readChain('rec-cas');
  assert.equal(chain.length, 2, 'the chain grew by exactly one transition');
});

test('genesis exclusivity race: one (profile, subject), two records — the loser names the winner as blocker', async () => {
  const store = newStore();
  const a = storeGenesis('rec-excl-a', 'profile.p1', 'subject:excl');
  const b = storeGenesis('rec-excl-b', 'profile.p1', 'subject:excl');
  const [ra, rb] = await Promise.all([
    store.appendTransition(null, a, { nonTerminal: true }),
    store.appendTransition(null, b, { nonTerminal: true }),
  ]);
  const winner = ra.appended ? 'rec-excl-a' : 'rec-excl-b';
  const loser = ra.appended ? rb : ra;
  assert.equal(ra.appended !== rb.appended, true, 'exactly one genesis lands');
  assert.ok(!loser.appended);
  assert.equal(loser.conflict, 'exclusivity');
  if (loser.conflict === 'exclusivity') {
    assert.equal(
      loser.blockingRecordId,
      winner,
      "the loser's conflict names the winner — the same record findNonTerminal returns",
    );
  }
  assert.equal(await store.findNonTerminal('profile.p1', 'subject:excl'), winner);
});

test('seq race: state-preserving appends racing one seq slot — no gap, no duplicate', async () => {
  const store = newStore();
  const genesis = storeGenesis('rec-seq', 'profile.p1', 'subject:seq');
  assert.equal((await store.appendTransition(null, genesis, { nonTerminal: true })).appended, true);

  // Distinct payloads, all built at seq 2 over 'open' with a state-PRESERVING kind — so
  // every loser fails on C2's server-verified seq, never the state CAS.
  const results = await Promise.all(
    Array.from({ length: RACERS }, (_, i) =>
      store.appendTransition(
        'open',
        storeNext(genesis, 'consultation-recorded', {
          kind: 'race-probe',
          checker: APPROVER,
          at: '2026-07-24T01:00:00.000Z',
          payloadDigest: `sha256:${String(i).repeat(64).slice(0, 64)}`,
          verdict: 'pass',
        }),
        { nonTerminal: true },
      ),
    ),
  );
  const winners = results.filter((r) => r.appended);
  assert.equal(winners.length, 1, 'exactly one racer takes the seq slot');
  for (const r of results) {
    if (!r.appended) assert.equal(r.conflict, 'seq');
  }
  const chain = await store.readChain('rec-seq');
  assert.deepEqual(
    chain.map((t) => t.seq),
    [1, 2],
    'seq is contiguous with no duplicate — the server verified it inside the transaction',
  );
});

test('batch atomicity vs a concurrent reader: a chain is never observed half-landed', async () => {
  const store = newStore();
  const genesis = storeGenesis('rec-batch-race', 'profile.p1', 'subject:batch');
  assert.equal((await store.appendTransition(null, genesis, { nonTerminal: true })).appended, true);

  const batch = fiveElementBatch(genesis);
  const attempts = Promise.all(
    Array.from({ length: 4 }, () => store.appendBatch('open', batch, { nonTerminal: false })),
  );
  const observed = new Set<number>();
  for (let i = 0; i < 50; i += 1) {
    observed.add((await store.readChain('rec-batch-race')).length);
  }
  const results = await attempts;
  observed.add((await store.readChain('rec-batch-race')).length);

  for (const len of observed) {
    assert.ok(len === 1 || len === 6, `observed a half-landed batch: chain length ${len}`);
  }
  assert.equal(results.filter((r) => r.appended).length, 1, 'exactly one batch lands');
  assert.equal((await store.readChain('rec-batch-race')).length, 6);
});

test('enlisted rollback across connections: an uncommitted edge is invisible, a rolled-back edge is gone', async () => {
  const store = newStore();
  const genesis = storeGenesis('rec-enlist-race', 'profile.p1', 'subject:enlist-race');
  assert.equal((await store.appendTransition(null, genesis, { nonTerminal: true })).appended, true);

  const edge = storeNext(genesis, 'refused', { code: 'content-drift' });
  const host = await sharedPool().connect();
  try {
    await host.query('BEGIN');
    const enlisted = await store.appendTransition('open', edge, { nonTerminal: false }, host);
    assert.equal(enlisted.appended, true);
    // A second connection (the store's own read path) must not see the uncommitted edge.
    assert.equal((await store.readChain('rec-enlist-race')).length, 1);
    await host.query('ROLLBACK');
  } finally {
    host.release();
  }
  assert.equal((await store.readChain('rec-enlist-race')).length, 1, 'rolled back means gone');

  const retry = await store.appendTransition('open', edge, { nonTerminal: false });
  assert.equal(retry.appended, true, 'an un-enlisted retry lands cleanly');
  assert.equal((await store.readChain('rec-enlist-race')).length, 2);
});
