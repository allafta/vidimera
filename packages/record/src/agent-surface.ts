// @vidimera/record — agent-surface.ts (design §2 "agent-surface.ts" / §3 AgentSurface /
// §1 the object-capability split): the AGENT-reachable handle. It exposes `stage()` +
// the three pure reads and NOTHING that transitions a record — `open`/`review`/
// `finalize`/`redeem` live solely on the operator handle. The behaviors themselves are
// the shared kernel closures assembled in `create.ts`; this file's job is the CAPABILITY
// SPLIT: select exactly the agent-reachable subset and FREEZE it into a plain object so
// the record-transitioning calls are unreachable-by-construction (the honest in-process
// limit design §1 states, asserted by agent-unreachability.test.ts).

import type { Kernel } from './create.js';
import type { Outcome } from './outcome.js';
import type { DecisionRecord, Digest, Transition } from './types.js';

export interface AgentSurface {
  // `legId?` (design §2/§3/§9): omitted -> `profile.legs[0]` (single-leg call sites stay
  // byte-compatible); a caller-NAMED legId absent from the resolved profile refuses
  // `unknown-leg`, pre-record. One optional parameter — NOT a new method, so the agent
  // handle's KEY SET (asserted by agent-unreachability.test.ts) is unchanged.
  stage(
    content: unknown,
    profileId: string,
    subjectRef: string,
    legId?: string,
  ): Promise<Outcome<{ stagedRef: string }>>;
  getRecord(recordId: string): Promise<DecisionRecord | null>;
  readChain(recordId: string): Promise<Transition[]>;
  chainHead(recordId: string): Promise<Digest | null>;
}

/**
 * Selects the agent-reachable subset of the shared kernel closures and freezes it. The
 * returned object is a FROZEN plain-object literal (prototype `Object.prototype`, no class
 * instance) carrying EXACTLY `{stage, getRecord, readChain, chainHead}` — no
 * transitioning method is present, own or inherited.
 */
export function makeAgentSurface(kernel: Kernel): AgentSurface {
  return Object.freeze({
    stage: kernel.stage,
    getRecord: kernel.getRecord,
    readChain: kernel.readChain,
    chainHead: kernel.chainHead,
  });
}
