// @vidimera/record — store-batch.test.ts (SPEC §12 "Atomic batch append"): the
// all-or-nothing `appendBatch`. Its semantics are exact, and three of them have a
// plausible wrong reading that this file exists to catch:
//   - the entry compare-and-swap is checked ONCE, at entry, and its failure reports index 0;
//   - per-element sequencing is server-verified `max+1 … max+N`, so a stale seq is caught
//     at the element that carries it;
//   - terminal-monotonicity runs against the EVOLVING intra-batch state, but with the
//     terminality INPUT fixed at the entry flag — so a record cannot become terminal
//     mid-batch. Recomputing terminality per element makes finalize's own batch reject its
//     own last element, which is why that rule gets a named test rather than incidental
//     coverage.
// Transitions are hand-built via `helpers/chain.ts`'s single-transition builders and driven
// straight at the Store, never through the kernel — this file tests the storage contract.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { transitionDigest } from '../src/chain/encoding.js';
import { MemoryStore } from '../src/store/memory.js';
import type { IdentityAssertion, Transition } from '../src/types.js';
import { storeGenesis, storeNext } from './helpers/chain.js';

const APPROVER: IdentityAssertion = { principal: 'approver:1', authority: 'session:test-app' };
const CHECKER: IdentityAssertion = {
  principal: 'system:chain-verify',
  authority: 'system:vidimera-record',
};

/** An open record with only its genesis on the chain, ready to receive a batch. */
async function openRecord(store: MemoryStore, recordId = 'rec-batch'): Promise<Transition> {
  const genesis = storeGenesis(recordId, 'profile.p1', 'subject:s1');
  const res = await store.appendTransition(null, genesis, { nonTerminal: true });
  assert.equal(res.appended, true, 'fixture: the genesis append must land');
  return genesis;
}

/** finalize's own batch shape: two state-preserving consultations, then `confirmed`. */
function successBatch(genesis: Transition): Transition[] {
  const cv = storeNext(genesis, 'consultation-recorded', {
    kind: 'chain-verify',
    checker: CHECKER,
    at: '2026-07-24T01:00:00.000Z',
    payloadDigest: transitionDigest(genesis),
    verdict: 'pass',
  });
  const facts = storeNext(cv, 'consultation-recorded', {
    kind: 'facts',
    checker: APPROVER,
    at: '2026-07-24T01:00:00.000Z',
    payloadDigest: `sha256:${'2'.repeat(64)}`,
    verdict: 'pass',
  });
  const confirmed = storeNext(facts, 'confirmed', { actor: APPROVER });
  return [cv, facts, confirmed];
}

test('appendBatch: the happy path lands every element in order and returns their digests', async () => {
  const store = new MemoryStore();
  const genesis = await openRecord(store);
  const batch = successBatch(genesis);

  const res = await store.appendBatch('open', batch, { nonTerminal: false });
  assert.equal(res.appended, true);
  if (!res.appended) return;
  assert.deepEqual(
    res.transitionDigests,
    batch.map((t) => transitionDigest(t)),
    'the store returns each element’s own digest, in order',
  );

  const chain = await store.readChain(genesis.recordId);
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'consultation-recorded', 'consultation-recorded', 'confirmed'],
  );
  assert.deepEqual(
    chain.map((t) => t.seq),
    [1, 2, 3, 4],
    'seqs are contiguous from max+1',
  );
});

test('appendBatch: terminality is fixed at the ENTRY flag, so a batch may end in the transition that makes the record terminal', async () => {
  // The rule this file exists for. The entry flag is nonTerminal:true (the record is open),
  // so C3's terminal arm cannot fire while the batch applies — even though the LAST element
  // is `confirmed`, which is exactly what makes the record terminal. Recomputing terminality
  // per element rejects that element and breaks finalize's only batch.
  const store = new MemoryStore();
  const genesis = await openRecord(store);

  const res = await store.appendBatch('open', successBatch(genesis), { nonTerminal: false });
  assert.equal(
    res.appended,
    true,
    'a batch ending in `confirmed` against an open record must land',
  );

  // And the post-batch flag is the META's, applied once — not recomputed per element.
  const second = storeGenesis('rec-other', 'profile.p1', 'subject:s1');
  const blocked = await store.appendTransition(null, second, { nonTerminal: true });
  assert.equal(
    blocked.appended,
    true,
    'the batched record is terminal now, so C1 no longer blocks the pair',
  );
});

test('appendBatch: an entry compare-and-swap mismatch reports index 0 and applies nothing', async () => {
  const store = new MemoryStore();
  const genesis = await openRecord(store);
  const before = await store.readChain(genesis.recordId);

  const res = await store.appendBatch('confirmed', successBatch(genesis), { nonTerminal: false });
  assert.deepEqual(res, { appended: false, conflict: 'state-mismatch', index: 0 });

  const after = await store.readChain(genesis.recordId);
  assert.deepEqual(after, before, 'all-or-nothing: the chain is byte-for-byte unchanged');
});

test('appendBatch: a stale seq conflicts at the element that carries it, and applies nothing', async () => {
  const store = new MemoryStore();
  const genesis = await openRecord(store);
  const batch = successBatch(genesis);
  const [first, second] = batch;
  assert.ok(first !== undefined && second !== undefined, 'fixture: the batch has three elements');
  const stale: Transition = { ...second, seq: second.seq + 5 };
  const before = await store.readChain(genesis.recordId);

  const res = await store.appendBatch('open', [first, stale], { nonTerminal: true });
  assert.deepEqual(res, { appended: false, conflict: 'seq', index: 1 });

  const after = await store.readChain(genesis.recordId);
  assert.deepEqual(after, before, 'the first element does not land either');
});

test('appendBatch: against an already-terminal record, C3 rejects at entry', async () => {
  const store = new MemoryStore();
  const genesis = await openRecord(store);
  await store.appendBatch('open', successBatch(genesis), { nonTerminal: false });
  const head = (await store.readChain(genesis.recordId)).at(-1);
  assert.ok(head !== undefined);

  // The record is terminal `confirmed`. A state-leaving append that is not the compromise
  // carve-out is barred — and because the entry flag is the terminality input, it is barred
  // at the FIRST element rather than discovered part-way through.
  const expired = storeNext(head, 'expired', { bound: '2026-07-25T00:00:00.000Z' });
  const res = await store.appendBatch('confirmed', [expired], { nonTerminal: false });
  assert.deepEqual(res, { appended: false, conflict: 'state-mismatch', index: 0 });
});

test('appendBatch: an empty batch is a caller error, not a silent success', async () => {
  const store = new MemoryStore();
  await openRecord(store);
  await assert.rejects(
    () => store.appendBatch('open', [], { nonTerminal: true }),
    /appendBatch: empty batch/,
  );
});

test('appendBatch: an element naming a different recordId throws, and applies nothing', async () => {
  const store = new MemoryStore();
  const genesis = await openRecord(store);
  const batch = successBatch(genesis);
  const [cv, facts] = batch;
  assert.ok(cv !== undefined && facts !== undefined, 'fixture: the batch has three elements');
  const foreign: Transition = { ...facts, recordId: 'rec-other' };
  const before = await store.readChain(genesis.recordId);

  await assert.rejects(
    () => store.appendBatch('open', [cv, foreign], { nonTerminal: true }),
    /appendBatch: every element must name the same recordId/,
  );

  const after = await store.readChain(genesis.recordId);
  assert.deepEqual(after, before, 'a batch spanning records leaves the chain untouched');
});

test('appendBatch: a genesis element inside a batch throws (SPEC §12: genesis never appears in a batch), and applies nothing', async () => {
  const store = new MemoryStore();
  const genesis = await openRecord(store);
  const before = await store.readChain(genesis.recordId);

  // Shaped so every OTHER check would pass: same recordId, and a seq that lines up with
  // `chain.length + 1` — the exact shape that let this element slip through before the guard
  // existed. Only the new `kind === 'opened'` check catches it.
  const secondOpen = storeNext(genesis, 'opened', {
    profileId: 'profile.p1',
    profileDigest: `sha256:${'0'.repeat(64)}`,
    legId: 'approver-decide',
    subjectRef: 'subject:s1',
    contentDigest: `sha256:${'1'.repeat(64)}`,
  });

  await assert.rejects(
    () => store.appendBatch('open', [secondOpen], { nonTerminal: true }),
    /appendBatch: genesis never appears in a batch/,
  );

  const after = await store.readChain(genesis.recordId);
  assert.deepEqual(after, before, 'a genesis element inside a batch leaves the chain untouched');
});

test('appendBatch: a throwing clone applies nothing — the guarantee holds against a throw, not just a conflict', async () => {
  const store = new MemoryStore();
  const genesis = await openRecord(store);
  const batch = successBatch(genesis);
  const [cv, facts] = batch;
  assert.ok(cv !== undefined && facts !== undefined, 'fixture: the batch has three elements');

  // A function-valued payload member is not structured-cloneable, and this store deliberately
  // lets `DataCloneError` propagate rather than degrading the copy. The dry-run checks pass:
  // the digest step's JCS silently omits function members, so nothing upstream rejects this.
  const poisoned: Transition = {
    ...facts,
    payload: { kind: 'facts', describe: () => 'not structured-cloneable' },
  };
  const before = await store.readChain(genesis.recordId);

  await assert.rejects(() => store.appendBatch('open', [cv, poisoned], { nonTerminal: true }));

  const after = await store.readChain(genesis.recordId);
  assert.deepEqual(after, before, 'element 0 must not survive a throw at element 1');
});

test("appendBatch: the post-batch record state is the last element's, provably — a later CAS targets it", async () => {
  const store = new MemoryStore();
  const genesis = await openRecord(store);

  const res = await store.appendBatch('open', successBatch(genesis), { nonTerminal: false });
  assert.equal(res.appended, true, 'fixture: the batch must land');

  // Discriminating probe. Asserting the chain's contents cannot distinguish an implementation
  // that advances `state` from one that does not — both leave the same transitions. A CAS on
  // 'confirmed' can: it succeeds only if the batch actually moved the record's state there.
  // `sealed` is state-preserving, so C3 admits it against a terminal `confirmed` record.
  const head = (await store.readChain(genesis.recordId)).at(-1);
  assert.ok(head !== undefined, 'fixture: the chain is non-empty');
  const sealed = storeNext(head, 'sealed', { chainHead: transitionDigest(head) });

  const after = await store.appendTransition('confirmed', sealed, { nonTerminal: false });
  assert.equal(after.appended, true, 'the record really is `confirmed` after the batch');
});
