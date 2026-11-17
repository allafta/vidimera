// @vidimera/record — store-constraints.test.ts: the MEMORY BACKING's own implementation
// decisions, pinned. The store CONTRACT pins that used to live here (CAS, C1-C4, freshness,
// first-write-wins) are in the backing-parameterized conformance suite
// (conformance/store-conformance.ts) since the fourth step-2 increment, run over this
// backing by memory-store-conformance.test.ts. What remains here is deliberately NOT
// contract: the store-clone decision (store/memory.ts) makes MemoryStore reject a
// function-valued payload member with `DataCloneError` (structuredClone's own error), and a
// different backing may reject such a payload differently — so these three pins bind THIS
// backing, not every conforming Store.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { genesisPrevHash } from '../src/chain/encoding.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Transition } from '../src/types.js';
import { storeGenesis, storeNext } from './helpers/chain.js';

// --- fixtures ------------------------------------------------------------------------

/**
 * The `opened` transition's payload shape, still needed here directly (not via
 * `storeGenesis`) by the DataClone genesis test below, which must splice its own
 * function-valued member into an otherwise-normal payload.
 */
function openedPayload(profileId: string, subjectRef: string) {
  return {
    profileId,
    profileDigest: `sha256:${'0'.repeat(64)}`,
    legId: 'approver-decide',
    subjectRef,
    contentDigest: `sha256:${'1'.repeat(64)}`,
  };
}

// === DataCloneError decision pin (see store/memory.ts's store-clone decision comment) ==
//
// `structuredClone` — used by `store/memory.ts` to isolate store-internal state from a caller's own
// object — THROWS `DataCloneError` on a function- or symbol-valued member anywhere in the
// object graph. This is a DELIBERATE choice (memory.ts documents the full reasoning): a
// payload that digests fine today (JCS silently OMITS such a member rather than throwing,
// jcs.ts's `hasNoJsonForm`) now fails LOUDLY at the store seam instead of being silently
// accepted by reference. These tests pin that choice so it cannot change by accident.

test('appendTransition (non-genesis): a payload member carrying a FUNCTION (an identity object literal with an OWN method, not a plain literal) throws DataCloneError rather than being silently stored', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis(
    'rec-dataclone-subsequent',
    'profile.p1',
    'subject:dataclone-subsequent',
  );
  await store.appendTransition(null, genesis, { nonTerminal: true });

  const actorWithMethod = {
    principal: 'approver:1',
    authority: 'session:test-app',
    describe(): string {
      return this.principal;
    },
  };
  const confirmed = storeNext(genesis, 'confirmed', { actor: actorWithMethod });

  await assert.rejects(
    () => store.appendTransition('open', confirmed, { nonTerminal: false }),
    (err: unknown) => err instanceof Error && err.name === 'DataCloneError',
    'a function-valued payload member must throw DataCloneError at the clone-on-write seam',
  );
});

test('appendTransition (genesis): a payload member carrying a FUNCTION throws DataCloneError rather than being silently stored', async () => {
  const store = new MemoryStore();
  const genesisPayloadWithMethod = {
    ...openedPayload('profile.p1', 'subject:dataclone-genesis'),
    describe(): string {
      return 'not a plain literal';
    },
  };
  const genesis: Transition = {
    recordId: 'rec-dataclone-genesis',
    seq: 1,
    at: '2026-07-24T00:00:00.000Z',
    kind: 'opened',
    payload: genesisPayloadWithMethod,
    prevHash: genesisPrevHash('rec-dataclone-genesis'),
  };

  await assert.rejects(
    () => store.appendTransition(null, genesis, { nonTerminal: true }),
    (err: unknown) => err instanceof Error && err.name === 'DataCloneError',
    'a function-valued payload member must throw DataCloneError at the genesis clone-on-write seam',
  );
});

test('putStaged: a StagedDraft carrying an extra FUNCTION-valued property throws DataCloneError rather than being silently stored', async () => {
  const store = new MemoryStore();
  const draftWithMethod = {
    id: 'staged-dataclone',
    profileId: 'p1',
    legId: 'leg-1',
    subjectRef: 'subj-dataclone',
    contentDigest: `sha256:${'2'.repeat(64)}`,
    describe(): string {
      return 'not a plain StagedDraft literal';
    },
  };

  await assert.rejects(
    () => store.putStaged(draftWithMethod),
    (err: unknown) => err instanceof Error && err.name === 'DataCloneError',
    'a function-valued extra property must throw DataCloneError at the clone-on-write seam',
  );
});

test('MemoryStore rejects a supplied tx loudly — no driver, no transaction to enlist', async () => {
  // SPEC §12's caller-transaction seam is adapter-generic; a backing with no driver has
  // nothing to enlist a write in, and silently ignoring the handle is the failure mode the
  // seam's deferral existed to avoid. The check runs FIRST in each write, ahead of every
  // other validation, so no partial work precedes the throw.
  const store = new MemoryStore();
  const draft = {
    id: `sha256:${'d'.repeat(64)}`,
    profileId: 'profile.p1',
    legId: 'approver-decide',
    subjectRef: 'subject:tx-pin',
    contentDigest: `sha256:${'e'.repeat(64)}`,
  };
  await assert.rejects(() => store.putStaged(draft, {}), /no transaction to enlist/);

  const genesis = storeGenesis('rec-tx-pin', 'profile.p1', 'subject:tx-pin');
  await assert.rejects(
    () => store.appendTransition(null, genesis, { nonTerminal: true }, {}),
    /no transaction to enlist/,
  );
  await assert.rejects(
    () => store.appendBatch('open', [genesis], { nonTerminal: true }, {}),
    /no transaction to enlist/,
  );
});

// === A clone that digests differently is refused (store/memory.ts's clone-check) ========
//
// `structuredClone` drops a prototype, and with it a prototype `toJSON` the digest honours.
// MemoryStore therefore clones first and compares digests, throwing before any state changes
// — after every conflict check, so a conflict still wins.

/** A class whose prototype `toJSON` shows the digest a different view than its own fields. */
class ViewedMember {
  secret = 'own-field';
  toJSON(): Record<string, string> {
    return { view: 'json-view' };
  }
}

test('MemoryStore refuses an append whose clone would digest differently (subsequent append)', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-clone-sub', 'profile.p1', 'subject:clone-sub');
  await store.appendTransition(null, genesis, { nonTerminal: true });
  const before = await store.readChain('rec-clone-sub');
  const head = await store.chainHead('rec-clone-sub');

  const confirmed = storeNext(genesis, 'confirmed', { actor: new ViewedMember() });
  await assert.rejects(
    () => store.appendTransition('open', confirmed, { nonTerminal: false }),
    /MemoryStore/,
  );
  assert.deepEqual(await store.readChain('rec-clone-sub'), before);
  assert.equal(await store.chainHead('rec-clone-sub'), head);
});

test('MemoryStore refuses an append whose clone would digest differently (genesis append)', async () => {
  const store = new MemoryStore();
  const genesis: Transition = {
    ...storeGenesis('rec-clone-gen', 'profile.p1', 'subject:clone-gen'),
    payload: {
      ...openedPayload('profile.p1', 'subject:clone-gen'),
      extra: new ViewedMember(),
    },
  };
  await assert.rejects(
    () => store.appendTransition(null, genesis, { nonTerminal: true }),
    /MemoryStore/,
  );
  assert.deepEqual(await store.readChain('rec-clone-gen'), []);
  assert.equal(await store.chainHead('rec-clone-gen'), null);
});

test('MemoryStore refuses a batch whose last element would digest differently; nothing is stored', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-clone-batch', 'profile.p1', 'subject:clone-batch');
  await store.appendTransition(null, genesis, { nonTerminal: true });
  const before = await store.readChain('rec-clone-batch');
  const head = await store.chainHead('rec-clone-batch');

  const first = storeNext(genesis, 'consultation-recorded', { kind: 'k', checker: { a: 1 } });
  const last = storeNext(first, 'confirmed', { actor: new ViewedMember() });
  await assert.rejects(
    () => store.appendBatch('open', [first, last], { nonTerminal: false }),
    /MemoryStore/,
  );
  assert.deepEqual(await store.readChain('rec-clone-batch'), before);
  assert.equal(await store.chainHead('rec-clone-batch'), head);
});

/**
 * A class whose prototype `toJSON` gives the digest a plain view, while its OWN field is a
 * BigInt: the original digests through the view, the clone (no prototype) carries the BigInt
 * and cannot be digested at all.
 */
class BigIntField {
  n = 1n;
  toJSON(): Record<string, string> {
    return { view: 'json-view' };
  }
}

test('MemoryStore names itself when the clone cannot be digested at all, keeps the cause; nothing is stored', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-clone-bigint', 'profile.p1', 'subject:clone-bigint');
  await store.appendTransition(null, genesis, { nonTerminal: true });
  const before = await store.readChain('rec-clone-bigint');
  const head = await store.chainHead('rec-clone-bigint');

  const confirmed = storeNext(genesis, 'confirmed', { actor: new BigIntField() });
  await assert.rejects(
    () => store.appendTransition('open', confirmed, { nonTerminal: false }),
    (err: unknown) =>
      err instanceof Error &&
      /MemoryStore/.test(err.message) &&
      err.cause instanceof TypeError &&
      /BigInt/.test(err.cause.message),
  );
  assert.deepEqual(await store.readChain('rec-clone-bigint'), before);
  assert.equal(await store.chainHead('rec-clone-bigint'), head);
});

test('a conflict still wins over the digest-check throw (stale expected state, prototype toJSON member)', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-clone-conflict', 'profile.p1', 'subject:clone-conflict');
  await store.appendTransition(null, genesis, { nonTerminal: true });
  const before = await store.readChain('rec-clone-conflict');

  const confirmed = storeNext(genesis, 'confirmed', { actor: new ViewedMember() });
  const result = await store.appendTransition('confirmed', confirmed, { nonTerminal: false });
  assert.deepEqual(result, { appended: false, conflict: 'state-mismatch' });
  assert.deepEqual(await store.readChain('rec-clone-conflict'), before);
});

test('a plain payload is unaffected: the returned digests equal chainHead', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-clone-plain', 'profile.p1', 'subject:clone-plain');
  const g = await store.appendTransition(null, genesis, { nonTerminal: true });
  assert.equal(g.appended, true);
  if (g.appended) assert.equal(g.transitionDigest, await store.chainHead('rec-clone-plain'));

  const first = storeNext(genesis, 'consultation-recorded', { kind: 'k' });
  const r = await store.appendTransition('open', first, { nonTerminal: true });
  assert.equal(r.appended, true);
  if (r.appended) assert.equal(r.transitionDigest, await store.chainHead('rec-clone-plain'));

  const confirmed = storeNext(first, 'confirmed', { actor: { principal: 'a', authority: 'b' } });
  const b = await store.appendBatch('open', [confirmed], { nonTerminal: false });
  assert.equal(b.appended, true);
  if (b.appended) {
    assert.equal(b.transitionDigests.at(-1), await store.chainHead('rec-clone-plain'));
  }
});
