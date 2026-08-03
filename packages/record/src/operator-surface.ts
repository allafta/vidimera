// @vidimera/record — operator-surface.ts: the OPERATOR (host/human-only)
// handle (SPEC §9's four-call split — this handle carries `open`/`review`/`finalize`/
// `redeem`, plus the `replay`/`verifyChain` `recordId` audit wrappers and the three
// reads). Like agent-surface.ts, this file's job is the CAPABILITY SPLIT — select the
// operator-reachable subset of the shared kernel closures (assembled in `create.ts`) and
// FREEZE it. Every transitioning closure delegates to a real `kernel/*.ts`
// behavior (`redeem` to `kernel/redeem.ts`, which refuses `unredeemable-state` on every
// profile/state except one: a confirmed effect-seam record now throws a build-capability
// error instead — the real effect-seam behavior is still not implemented); the reads +
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
  redeem(recordId: string, content: unknown): Promise<Outcome<{ state: RecordState }>>; // unredeemable-state, except throws on a confirmed effect-seam record
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
