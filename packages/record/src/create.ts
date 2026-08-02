// @vidimera/record — create.ts (design §2 "create.ts" / §3 FACTORY / §1 the two frozen
// handles over shared kernel closures): the factory. It (1) fail-fast validates every
// profile (config.ts's fail-closed guards), (2) detects duplicate profile ids, (3)
// resolves every profile's `canonicalizerRef` against the registry (canonical.ts's
// fail-closed `resolveCanonicalizer`), then (4) assembles the SHARED kernel closures over
// the injected Store + the resolved profiles and hands them to the two capability-split
// surface factories.
//
// The "shared kernel closures" (design §1/§2) all live here so the capability split
// (agent-surface.ts / operator-surface.ts) stays a pure select-and-freeze. As of Task 9
// every record-transitioning closure (`stage`/`open`/`review`/`finalize`/`redeem`) calls
// into `kernel/*.ts` — `redeem` delegates to `kernel/redeem.ts`'s slice-3 stub, which
// unconditionally refuses `unredeemable-state` (the real effect-seam behavior is slice 5).
// The reads (`getRecord`/`readChain`/`chainHead`) and the `replay`/`verifyChain` `recordId`
// audit wrappers are REAL: direct Store delegation + the pure `chain/replay.ts` core.

import { resolveCanonicalizer, type Canonicalizer } from './canonical.js';
import { replay as replayCore, verifyChain as verifyChainCore } from './chain/replay.js';
import {
  validateProfile,
  profileDeclaresEffectSeam,
  type Config,
  type ConfirmProfile,
} from './config.js';
import type { Store } from './store/store.js';
import { makeAgentSurface, type AgentSurface } from './agent-surface.js';
import { makeOperatorSurface, type OperatorSurface } from './operator-surface.js';
import { stage as stageKernel } from './kernel/stage.js';
import { open as openKernel } from './kernel/open.js';
import { review as reviewKernel } from './kernel/review.js';
import { finalize as finalizeKernel } from './kernel/finalize.js';
import { redeem as redeemKernel } from './kernel/redeem.js';

/**
 * A validated profile paired with its resolved canonicalizer and precomputed effect-seam
 * flag — the per-profile bundle the KERNEL behaviors (Tasks 7-9) look up by profileId.
 */
export interface ResolvedProfile {
  profile: ConfirmProfile;
  canonicalizer: Canonicalizer;
  effectSeam: boolean;
}

/**
 * The state shared by every kernel closure: the injected Store, the resolved-profile
 * registry, and the clock. Passed to `makeKernel`; the `kernel/*.ts` functions take this
 * shape.
 *
 * `now` is the injected clock the kernel reads for RFC3339 `at` timestamps and for the
 * en-passant expiry gate (`openedAt + ttl < now`). It defaults to real time
 * (`() => new Date()`) via `create()`; `createWithClock()` overrides it so expiry tests
 * are deterministic WITHOUT sleeping. Deliberately NOT a public `Config` field and NOT
 * re-exported from `index.ts` — the clock seam stays off the published surface (design is
 * silent on a clock; deterministic tests require one; this is the minimal knob).
 */
export interface KernelContext {
  store: Store;
  profiles: Map<string, ResolvedProfile>;
  now: () => Date;
}

/**
 * The full set of shared kernel closures, one per public surface method. Method types are
 * pulled from the two surface interfaces by indexed access so the closures stay in lockstep
 * with the public contract (a signature change on a surface is a compile error here).
 */
export interface Kernel {
  stage: AgentSurface['stage'];
  getRecord: AgentSurface['getRecord'];
  readChain: AgentSurface['readChain'];
  chainHead: AgentSurface['chainHead'];
  open: OperatorSurface['open'];
  review: OperatorSurface['review'];
  finalize: OperatorSurface['finalize'];
  redeem: OperatorSurface['redeem'];
  replay: OperatorSurface['replay'];
  verifyChain: OperatorSurface['verifyChain'];
}

/**
 * Assembles the shared kernel closures over `ctx`. All five transitioning/read closures
 * (`stage`/`open`/`review`/`finalize`/`redeem`) now delegate to `kernel/*.ts` (Tasks 7-9);
 * `redeem` is Task 9's slice-3 stub — it always refuses `unredeemable-state` (the real
 * effect-seam behavior is slice 5). The reads + replay/verifyChain wrappers are real.
 */
function makeKernel(ctx: KernelContext): Kernel {
  const { store } = ctx;

  return {
    // --- stage()/open()/review()/finalize(): REAL — delegate to the kernel/*.ts behaviors ---
    stage: (content, profileId, subjectRef) => stageKernel(ctx, content, profileId, subjectRef),
    open: (stagedRef) => openKernel(ctx, stagedRef),
    review: (recordId) => reviewKernel(ctx, recordId),
    finalize: (recordId, identity, content, facts) => finalizeKernel(ctx, recordId, identity, content, facts),

    // --- redeem(): Task 9 — slice-3 stub (kernel/redeem.ts): unredeemable-state, always ---
    redeem: (recordId, content) => redeemKernel(ctx, recordId, content),

    // --- reads: REAL (direct Store delegation) ---
    getRecord: async (recordId) => {
      const chain = await store.readChain(recordId);
      return chain.length === 0 ? null : replayCore(chain);
    },
    readChain: (recordId) => store.readChain(recordId),
    chainHead: (recordId) => store.chainHead(recordId),

    // --- audit wrappers: REAL (readChain + the pure chain/replay.ts core) ---
    replay: async (recordId) => replayCore(await store.readChain(recordId)),
    verifyChain: async (recordId) => verifyChainCore(await store.readChain(recordId)),
  };
}

/** The default real-time clock. `create()` uses this; `createWithClock()` overrides it. */
function realClock(): Date {
  return new Date();
}

/**
 * `createWithClock(config, now)` — the internal assembly with an INJECTABLE clock. This
 * is the ONLY seam expiry tests use to control "now" deterministically (no sleeping). It
 * is exported for tests to import from `'../src/create.js'` but is deliberately NOT
 * re-exported from `index.ts`, so the clock knob never enters the public surface — the
 * public factory is the 1-arg `create(config)` below.
 */
export function createWithClock(
  config: Config,
  now: () => Date,
): { agent: AgentSurface; operator: OperatorSurface } {
  const profiles = new Map<string, ResolvedProfile>();

  for (const profile of config.profiles) {
    validateProfile(profile);
    if (profiles.has(profile.id)) {
      throw new Error(`create: duplicate profile id '${profile.id}'`);
    }
    const canonicalizer = resolveCanonicalizer(config.canonicalizers, profile.subject.canonicalizerRef);
    profiles.set(profile.id, {
      profile,
      canonicalizer,
      effectSeam: profileDeclaresEffectSeam(profile),
    });
  }

  const kernel = makeKernel({ store: config.store, profiles, now });
  return {
    agent: makeAgentSurface(kernel),
    operator: makeOperatorSurface(kernel),
  };
}

/**
 * `create(config)` (design §3 FACTORY): fail-fast, FAIL-CLOSED at construction. Every
 * profile is validated (config.ts's GOVERNED throws + structural rejections), duplicate
 * ids are rejected, and every `canonicalizerRef` must resolve. Returns the two frozen
 * capability-split handles over the shared kernel closures. Profiles are never persisted.
 * The public factory: it fixes the clock to real time and delegates to `createWithClock`.
 */
export function create(config: Config): { agent: AgentSurface; operator: OperatorSurface } {
  return createWithClock(config, realClock);
}
