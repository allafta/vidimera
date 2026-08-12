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
    profileDigest: 'sha256:' + '0'.repeat(64),
    legId: 'approver-decide',
    subjectRef,
    contentDigest: 'sha256:' + '1'.repeat(64),
  };
}

// === DataCloneError decision pin (see store/memory.ts's store-clone decision comment) ==
//
// `structuredClone` — used above to isolate store-internal state from a caller's own
// object — THROWS `DataCloneError` on a function- or symbol-valued member anywhere in the
// object graph. This is a DELIBERATE choice (memory.ts documents the full reasoning): a
// payload that digests fine today (JCS silently OMITS such a member rather than throwing,
// jcs.ts's `hasNoJsonForm`) now fails LOUDLY at the store seam instead of being silently
// accepted by reference. These tests pin that choice so it cannot change by accident.

test('appendTransition (non-genesis): a payload member carrying a FUNCTION (e.g. a class-instance identity with a method, not a plain literal) throws DataCloneError rather than being silently stored', async () => {
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
    contentDigest: 'sha256:' + '2'.repeat(64),
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
