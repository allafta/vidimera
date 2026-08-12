// @vidimera/record — store-batch.test.ts: the MEMORY BACKING's batch-specific
// implementation pin. The `appendBatch` CONTRACT pins that used to live here are in the
// backing-parameterized conformance suite (conformance/store-conformance.ts) since the
// fourth step-2 increment. What remains: the all-or-nothing guarantee held against a THROW
// (structuredClone's DataCloneError mid-batch), which is MemoryStore's documented clone
// decision (store/memory.ts) rather than a shape the contract imposes on every backing.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { MemoryStore } from '../src/store/memory.js';
import type { Transition } from '../src/types.js';
import { openRecord, successBatch } from './helpers/store-fixtures.js';

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
