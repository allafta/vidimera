// @vidimera/record — tests/helpers/chain.ts: a tiny hand-authored chain builder for
// tests — build a small local helper that chains transitions correctly via the real
// encoding functions, so the tamper cases can then mutate a copy.
//
// This is a TEST-ONLY helper, not a kernel construction convenience — no
// transition-construction convenience beyond what the public API already exposes lives
// in src/. It deliberately reuses the real `genesisPrevHash`/`transitionDigest` under
// test to link transitions correctly — the correctness of those two functions is
// independently verified byte-for-byte in transition-encoding.test.ts against a
// hand-built canonicalize()/digest() recomputation, so using them here to assemble
// fixtures is not circular: replay-verify.test.ts's job is to check replay()/
// verifyChain() given a chain that IS correctly linked (positive cases) and given a
// COPY that has been deliberately mutated after linking (negative/tamper cases).

import { genesisPrevHash, transitionDigest } from '../../src/chain/encoding.js';
import type { Transition, TransitionKind } from '../../src/types.js';

export interface ChainStep {
  kind: TransitionKind;
  payload: unknown;
  /** Defaults to a deterministic, strictly-increasing RFC3339 UTC timestamp per step. */
  at?: string;
}

/**
 * Builds a correctly-linked `Transition[]` from `recordId` + an ordered list of
 * `{kind, payload}` steps: seq starts at 1 and increments by 1 per step (SPEC §4:
 * "1-based, increments by exactly 1 per record"), the first step's `prevHash` is the
 * genesis rule (`genesisPrevHash(recordId)`), and every subsequent step's `prevHash` is
 * the actual `transitionDigest()` of the transition immediately before it.
 */
export function buildChain(recordId: string, steps: ChainStep[]): Transition[] {
  const chain: Transition[] = [];
  let prevHash = genesisPrevHash(recordId);
  let seq = 1;
  for (const step of steps) {
    const transition: Transition = {
      recordId,
      seq,
      at: step.at ?? new Date(Date.UTC(2026, 0, seq, 0, 0, 0)).toISOString(),
      kind: step.kind,
      payload: step.payload,
      prevHash,
    };
    chain.push(transition);
    prevHash = transitionDigest(transition);
    seq += 1;
  }
  return chain;
}

/** Deep-clones a chain (via structuredClone) so a tamper test can mutate a COPY
 * without corrupting the fixture other tests in the same file may reuse. */
export function cloneChain(chain: Transition[]): Transition[] {
  return structuredClone(chain);
}

/**
 * A genesis (`opened`) transition for `recordId`: seq 1, `prevHash` from the genesis rule.
 * Distinct from `buildChain`: these two builders make ONE transition at a time, for tests
 * that drive a Store append-by-append and must not hand it a pre-assembled chain.
 */
export function storeGenesis(
  recordId: string,
  profileId: string,
  subjectRef: string,
  at = '2026-07-24T00:00:00.000Z',
): Transition {
  return {
    recordId,
    seq: 1,
    at,
    kind: 'opened',
    payload: {
      profileId,
      profileDigest: `sha256:${'0'.repeat(64)}`,
      legId: 'approver-decide',
      subjectRef,
      contentDigest: `sha256:${'1'.repeat(64)}`,
    },
    prevHash: genesisPrevHash(recordId),
  };
}

/** The next transition chained honestly onto `prev`: seq+1, `prevHash` = prev's own digest. */
export function storeNext(
  prev: Transition,
  kind: TransitionKind,
  payload: unknown,
  at?: string,
): Transition {
  return {
    recordId: prev.recordId,
    seq: prev.seq + 1,
    at: at ?? new Date(Date.UTC(2026, 0, 1, 0, 0, prev.seq)).toISOString(),
    kind,
    payload,
    prevHash: transitionDigest(prev),
  };
}
