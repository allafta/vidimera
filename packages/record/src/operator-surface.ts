// @vidimera/record — operator-surface.ts: the OPERATOR (host/human-only)
// handle (SPEC §9's four-call split, now joined by `seal` and the token shape's
// `beginRedemption`/`completeRedemption` — this handle carries `open`/`review`/`finalize`/
// `redeem`/`beginRedemption`/`completeRedemption`/`seal`, plus the `replay`/`verifyChain`
// `recordId` audit wrappers and the four reads). Like agent-surface.ts, this file's job
// is the CAPABILITY SPLIT — select the operator-reachable subset of the shared kernel
// closures (assembled in `create.ts`) and FREEZE it. Every transitioning closure
// delegates to a real `kernel/*.ts` behavior (`redeem` to `kernel/redeem.ts`, the
// DIRECT-shape redemption seam — SPEC §11.2: a confirmed effect-seam record's final leg
// is coupled to its effect via `confirmed → redeemed { via: 'direct' }`,
// `unredeemable-state` on every profile/state that has no redeemable seam;
// `beginRedemption`/`completeRedemption`, also `kernel/redeem.ts` (second step-3
// increment), the TOKEN shape's two halves — issuance (`confirmed → redeeming
// { tokenDigest }`, the single-use token returned exactly once and never persisted) and
// presentation (`redeeming → redeemed { via: 'token', tokenDigest }` on presenting that
// token); `seal` to `kernel/seal.ts`, the operator-only chain-retirement seam — a
// verified derived-terminal record is capped with a `sealed` transition,
// `unsealable-state` otherwise); the reads + replay/verifyChain wrappers are already real.
//
// The seam family now has a token half alongside the direct one — SPEC §11.2 names one
// verb, `redeem()`; the three call names here (`redeem`/`beginRedemption`/
// `completeRedemption`) are this build's own, recorded in
// `docs/process/implementation-status.md` and flagged to the pre-0.1 naming review.

import type { ChainVerifyReport } from './chain/replay.js';
import type { OpenOptions } from './config.js';
import type { Kernel } from './create.js';
import type { Outcome } from './outcome.js';
import type { DecisionRecord, Digest, IdentityAssertion, ReviewView, Transition } from './types.js';

export interface OperatorSurface {
  open(stagedRef: string, opts?: OpenOptions): Promise<Outcome<{ recordId: string }>>;
  review(recordId: string): Promise<Outcome<ReviewView>>; // pure content-free read
  finalize(
    recordId: string,
    identity: IdentityAssertion,
    content: unknown,
    facts: { figures: unknown; checker: IdentityAssertion }, // checker = review-surface identity (≠ actor)
  ): Promise<Outcome<{ recordId: string; state: 'confirmed'; transitionRef: Digest }>>;
  redeem(
    recordId: string,
    content: unknown,
    tx?: unknown, // SPEC §11.2's direct shape: the edge is enlisted in the host's transaction
  ): Promise<Outcome<{ recordId: string; state: 'redeemed'; transitionRef: Digest }>>;
  beginRedemption(
    recordId: string,
    content: unknown, // begin-time correspondence: this build's addition, argued at the seam
  ): Promise<
    // `token` is the single-use redemption token, returned exactly once and never persisted.
    // The `ok` value is secret material — a host MUST NOT log it; the chain and store carry
    // only its digest (SPEC §11.2's token shape; DECISIONS #30).
    Outcome<{ recordId: string; state: 'redeeming'; token: string; transitionRef: Digest }>
  >;
  completeRedemption(
    recordId: string,
    token: string, // the single-use token beginRedemption returned — presented, never persisted
    content: unknown,
  ): Promise<Outcome<{ recordId: string; state: 'redeemed'; transitionRef: Digest }>>;
  seal(
    recordId: string,
  ): Promise<Outcome<{ recordId: string; status: 'retired'; transitionRef: Digest }>>;
  replay(recordId: string): Promise<DecisionRecord>; // audit wrapper (not Outcome)
  verifyChain(recordId: string): Promise<ChainVerifyReport>; // audit wrapper (not Outcome)
  getRecord(recordId: string): Promise<DecisionRecord | null>;
  readChain(recordId: string): Promise<Transition[]>;
  chainHead(recordId: string): Promise<Digest | null>;
  listDue(): Promise<string[]>; // §12's sweep read: store.listDue at the injected clock.
  // "Like every §12 surface its concrete signature is provisional pre-1.0; the contract
  // is the behaviour above" — quoted because the sweep drives ordinary seams from this
  // list and adds no append authority (§4 ships no scheduler and no public expire()).
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
    beginRedemption: kernel.beginRedemption,
    completeRedemption: kernel.completeRedemption,
    seal: kernel.seal,
    replay: kernel.replay,
    verifyChain: kernel.verifyChain,
    getRecord: kernel.getRecord,
    readChain: kernel.readChain,
    chainHead: kernel.chainHead,
    listDue: kernel.listDue,
  });
}
