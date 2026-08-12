// @vidimera/record — test/helpers/store-fixtures.ts: shared store-driving fixtures, hoisted
// from store-batch.test.ts when the conformance suite (conformance/store-conformance.ts)
// took over its contract pins — the suite and the residual backing-specific tests both need
// them, and two copies would drift. TEST-ONLY helper module (not `.test.ts`), same
// convention as helpers/chain.ts and helpers/profiles.ts.

import assert from 'node:assert/strict';
import { transitionDigest } from '../../src/chain/encoding.js';
import type { Store } from '../../src/store/store.js';
import type { IdentityAssertion, Transition } from '../../src/types.js';
import { storeGenesis, storeNext } from './chain.js';

export const APPROVER: IdentityAssertion = {
  principal: 'approver:1',
  authority: 'session:test-app',
};
export const CHECKER: IdentityAssertion = {
  principal: 'system:chain-verify',
  authority: 'system:vidimera-record',
};

/** An open record with only its genesis on the chain, ready to receive appends. */
export async function openRecord(store: Store, recordId = 'rec-batch'): Promise<Transition> {
  const genesis = storeGenesis(recordId, 'profile.p1', 'subject:s1');
  const res = await store.appendTransition(null, genesis, { nonTerminal: true });
  assert.equal(res.appended, true, 'fixture: the genesis append must land');
  return genesis;
}

/** finalize's own batch shape: two state-preserving consultations, then `confirmed`. */
export function successBatch(genesis: Transition): Transition[] {
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
