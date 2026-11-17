// @vidimera/record — chain-binding.test.ts: a loaded chain is bound to the recordId it was
// requested for. `verifyChain(chain, recordId)` compares every row, and the genesis link,
// against the requested id rather than against whatever the first row claims.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import { verifyChain } from '../src/chain/replay.js';
import type { Transition } from '../src/types.js';
import { buildChain } from './helpers/chain.js';

function chainFor(recordId: string): Transition[] {
  return buildChain(recordId, [
    { kind: 'opened', payload: { n: 1 } },
    { kind: 'consultation-recorded', payload: { n: 2 } },
    { kind: 'confirmed', payload: { n: 3 } },
  ]);
}

// === verifyChain(chain, recordId) ====================================================

test('verifyChain(chain, recordId): a wholly relocated chain breaks at seq 1, naming both ids', () => {
  const result = verifyChain(chainFor('rec-Y'), 'rec-X');
  assert.equal(result.intact, false);
  if (result.intact) return;
  assert.equal(result.firstBreakSeq, 1);
  assert.match(result.detail, /rec-X/);
  assert.match(result.detail, /rec-Y/);
});

test('verifyChain(chain, recordId): a relabelled chain breaks at seq 1 on the genesis link', () => {
  // Every row claims 'rec-X' and links 2..n are recomputed, but the genesis prevHash is still
  // the one derived from 'rec-Y'.
  const [a, b, c] = chainFor('rec-Y');
  assert.ok(a !== undefined && b !== undefined && c !== undefined);
  const first: Transition = { ...a, recordId: 'rec-X' };
  const second: Transition = { ...b, recordId: 'rec-X', prevHash: transitionDigest(first) };
  const third: Transition = { ...c, recordId: 'rec-X', prevHash: transitionDigest(second) };

  const result = verifyChain([first, second, third], 'rec-X');
  assert.equal(result.intact, false);
  if (result.intact) return;
  assert.equal(result.firstBreakSeq, 1);
  assert.match(result.detail, /genesis prevHash/);
});

test('verifyChain(chain, recordId): a mixed chain breaks at the foreign row', () => {
  const [a, b, c] = chainFor('rec-X');
  assert.ok(a !== undefined && b !== undefined && c !== undefined);
  const foreign: Transition = { ...b, recordId: 'rec-Y' };
  const relinked: Transition = { ...c, prevHash: transitionDigest(foreign) };

  const result = verifyChain([a, foreign, relinked], 'rec-X');
  assert.equal(result.intact, false);
  if (result.intact) return;
  assert.equal(result.firstBreakSeq, 2);
});

test('verifyChain(chain, recordId): the matching id reports intact', () => {
  assert.deepEqual(verifyChain(chainFor('rec-X'), 'rec-X'), { intact: true });
});

test("verifyChain(chain): omitting recordId keeps today's behavior", () => {
  assert.deepEqual(verifyChain(chainFor('rec-Y')), { intact: true });
});
