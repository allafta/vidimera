// @vidimera/record — tests/helpers/chain.ts: a tiny hand-authored chain builder for
// tests (Task 4 brief: "build a tiny local helper ... that chains transitions
// correctly via your encoding functions; the tamper cases then mutate a copy").
//
// This is a TEST-ONLY helper, not a kernel construction convenience (design §9 task
// scope fence: "no transition-CONSTRUCTION convenience beyond what §2 names" lives in
// src/). It deliberately reuses the real `genesisPrevHash`/`transitionDigest` under
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
 * `{kind, payload}` steps: seq starts at 1 and increments by 1 per step (design §3/§5
 * "seq 1-based +1"), the first step's `prevHash` is the genesis rule
 * (`genesisPrevHash(recordId)`), and every subsequent step's `prevHash` is the actual
 * `transitionDigest()` of the transition immediately before it.
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
