// @vidimera/record — operator-surface.ts (design §2 "operator-surface.ts" / §3
// OperatorSurface / §1 the object-capability split): the OPERATOR (host/human-only)
// handle. It exposes the record-transitioning calls (`open`/`review`/`finalize`/
// `redeem`), the `replay`/`verifyChain` `recordId` audit wrappers, and the three reads.
// Like agent-surface.ts, this file's job is the CAPABILITY SPLIT — select the
// operator-reachable subset of the shared kernel closures (assembled in `create.ts`) and
// FREEZE it. As of Task 9 every transitioning closure delegates to a real `kernel/*.ts`
// behavior (`redeem` to Task 9's slice-3 stub, which unconditionally refuses
// `unredeemable-state` — the effect-seam behavior is slice 5); the reads +
// replay/verifyChain wrappers are already real.

import type { ChainVerifyReport } from './chain/replay.js';
import type { OpenOptions } from './config.js';
import type { Kernel } from './create.js';
import type { Outcome } from './outcome.js';
import type {
  DecisionRecord,
  Digest,
  IdentityAssertion,
  RecordState,
  ReviewView,
  Transition,
} from './types.js';

export interface OperatorSurface {
  open(stagedRef: string, opts?: OpenOptions): Promise<Outcome<{ recordId: string }>>;
  review(recordId: string): Promise<Outcome<ReviewView>>; // pure content-free read
  finalize(
    recordId: string,
    identity: IdentityAssertion,
    content: unknown,
    facts: { figures: unknown; checker: IdentityAssertion }, // checker = review-surface identity (≠ actor)
  ): Promise<Outcome<{ recordId: string; state: 'confirmed'; transitionRef: Digest }>>;
  redeem(recordId: string, content: unknown): Promise<Outcome<{ state: RecordState }>>; // slice3 → unredeemable-state
  replay(recordId: string): Promise<DecisionRecord>; // audit wrapper (not Outcome)
  verifyChain(recordId: string): Promise<ChainVerifyReport>; // audit wrapper (not Outcome)
  getRecord(recordId: string): Promise<DecisionRecord | null>;
  readChain(recordId: string): Promise<Transition[]>;
  chainHead(recordId: string): Promise<Digest | null>;
}

/**
 * Selects the operator-reachable subset of the shared kernel closures and freezes it. The
 * returned object is a FROZEN plain-object literal carrying the full operator surface.
 */
export function makeOperatorSurface(kernel: Kernel): OperatorSurface {
  return Object.freeze({
    open: kernel.open,
    review: kernel.review,
    finalize: kernel.finalize,
    redeem: kernel.redeem,
    replay: kernel.replay,
    verifyChain: kernel.verifyChain,
    getRecord: kernel.getRecord,
    readChain: kernel.readChain,
    chainHead: kernel.chainHead,
  });
}
