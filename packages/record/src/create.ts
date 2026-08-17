// @vidimera/record — create.ts: the factory. It (1) fail-fast validates every
// profile (config.ts's fail-closed guards), (2) detects duplicate profile ids, (3)
// resolves every profile's `canonicalizerRef` against the registry (canonical.ts's
// fail-closed `resolveCanonicalizer`), then (4) assembles the SHARED kernel closures over
// the injected Store + the resolved profiles and hands them to the two capability-split
// surface factories.
//
// The "shared kernel closures" all live here so the capability split
// (agent-surface.ts / operator-surface.ts) stays a pure select-and-freeze. Every
// record-transitioning closure (`stage`/`open`/`review`/`finalize`/`redeem`/`raiseFinding`/
// `acknowledge`/`seal`) calls into `kernel/*.ts` — `redeem` delegates to `kernel/redeem.ts`,
// the DIRECT-shape redemption seam (SPEC §11.2): a confirmed effect-seam record's final leg
// is coupled to its effect via `confirmed → redeemed { via: 'direct' }`, enlisted in the
// caller's own transaction when one is passed through; `unredeemable-state` on every
// profile/state with no redeemable seam; `raiseFinding`/`acknowledge` delegate to
// `kernel/findings-seams.ts`, SPEC §10.2's two operator-only mid-lifecycle seams (second
// step-7 increment) — the only appends between `opened` and the decision; `seal` delegates
// to `kernel/seal.ts`, the operator-only chain-retirement seam that caps a verified
// derived-terminal record with a `sealed` transition and reports `retired`. The reads
// (`getRecord`/`readChain`/`chainHead`/`listDue`) and the `replay`/`verifyChain` `recordId`
// audit wrappers are REAL: direct Store delegation + the pure `chain/replay.ts` core.
// `listDue`, new at the third step-3 increment, is the sweep's one read —
// `store.listDue(now())` under the injected clock, no append authority.

import { randomBytes } from 'node:crypto';
import { type AgentSurface, makeAgentSurface } from './agent-surface.js';
import { type Canonicalizer, resolveCanonicalizer } from './canonical.js';
import { replay as replayCore, verifyChain as verifyChainCore } from './chain/replay.js';
import {
  type Config,
  type ConfirmProfile,
  profileDeclaresEffectSeam,
  validateProfile,
} from './config.js';
import { mintRecordId } from './id.js';
import { finalize as finalizeKernel } from './kernel/finalize.js';
import {
  acknowledge as acknowledgeKernel,
  raiseFinding as raiseFindingKernel,
} from './kernel/findings-seams.js';
import { open as openKernel } from './kernel/open.js';
import {
  beginRedemption as beginRedemptionKernel,
  completeRedemption as completeRedemptionKernel,
  redeem as redeemKernel,
} from './kernel/redeem.js';
import { review as reviewKernel } from './kernel/review.js';
import { seal as sealKernel } from './kernel/seal.js';
import { stage as stageKernel } from './kernel/stage.js';
import { verifySignatures as verifySignaturesKernel } from './kernel/verify-signatures.js';
import { makeOperatorSurface, type OperatorSurface } from './operator-surface.js';
import { withSigning } from './signing/decorate.js';
import type { SigningConfig } from './signing/store.js';
import type { Store } from './store/store.js';

/**
 * A validated profile paired with its resolved canonicalizer and precomputed effect-seam
 * flag — the per-profile bundle the KERNEL behaviors look up by profileId.
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
 * re-exported from `index.ts` — the clock seam stays off the published surface
 * (`docs/concept/SPEC.md` names no injectable clock: its preamble leaves construction
 * deliberately unfrozen and SPEC §4 leaves clock reads implementation detail;
 * deterministic tests require one; this is the minimal knob).
 *
 * `mintId` is the injectable `recordId` minter: it defaults to `id.ts`'s `mintRecordId`
 * and is overridden ONLY by `createWithClock` (a fixed id sequence is what lets a
 * byte-stability test reproduce a chain's digests deterministically — `recordId` sits
 * inside every transition digest, so real randomness would make byte-for-byte
 * reproduction impossible). Like `now`, it is deliberately OFF the public surface —
 * `open()` consumes it in place of importing `mintRecordId` directly.
 *
 * `tokenSource` is the injectable single-use-token minter (SPEC §11.2's token shape,
 * second step-3 increment): it defaults to `defaultTokenSource` below (32 bytes of
 * crypto randomness) and, like `now`/`mintId`, is deliberately OFF the public surface —
 * overridden ONLY by `createWithClock` so a cross-backing byte-identity test can drive a
 * FIXED token (the token's digest, `tokenDigest`, sits inside the `redeeming`
 * transition's digest, the same reproducibility argument `mintId` makes for `recordId`).
 *
 * `signing` is SPEC §14's AL2 upgrade block (the AL2 mint increment) — present iff
 * `config.signing` was supplied. Unlike `store` above, `ctx.store` here is ALREADY the
 * signing-decorated wrapper when signing is configured (`createWithClock`'s own wrap,
 * below): `ctx.signing` is carried separately only because `kernel/verify-signatures.ts`
 * needs the raw `signer`/`verifiers`/`signatures` block directly, not the store
 * decorator built from it.
 */
export interface KernelContext {
  store: Store;
  profiles: Map<string, ResolvedProfile>;
  now: () => Date;
  mintId: () => string;
  tokenSource: () => string;
  signing?: SigningConfig;
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
  beginRedemption: OperatorSurface['beginRedemption'];
  completeRedemption: OperatorSurface['completeRedemption'];
  raiseFinding: OperatorSurface['raiseFinding'];
  acknowledge: OperatorSurface['acknowledge'];
  seal: OperatorSurface['seal'];
  replay: OperatorSurface['replay'];
  verifyChain: OperatorSurface['verifyChain'];
  listDue: OperatorSurface['listDue'];
  verifySignatures: OperatorSurface['verifySignatures'];
}

/**
 * Assembles the shared kernel closures over `ctx`. All eight transitioning/read closures
 * (`stage`/`open`/`review`/`finalize`/`redeem`/`raiseFinding`/`acknowledge`/`seal`) delegate
 * to `kernel/*.ts`; `redeem` is real: the DIRECT shape (SPEC §11.2) couples a confirmed
 * effect-seam record's final leg to its effect via `confirmed → redeemed { via: 'direct' }`,
 * `unredeemable-state` on every profile/state with no redeemable seam. `raiseFinding`/
 * `acknowledge` are real: SPEC §10.2's two operator-only mid-lifecycle seams. `seal` is
 * real: it caps a verified derived-terminal record with a `sealed` transition and reports
 * `retired`. The reads +
 * replay/verifyChain wrappers are real.
 */
function makeKernel(ctx: KernelContext): Kernel {
  const { store } = ctx;

  return {
    // --- stage()/open()/review()/finalize(): REAL — delegate to the kernel/*.ts behaviors ---
    stage: (content, profileId, subjectRef, legId) =>
      stageKernel(ctx, content, profileId, subjectRef, legId),
    open: (stagedRef, opts) => openKernel(ctx, stagedRef, opts),
    review: (recordId) => reviewKernel(ctx, recordId),
    finalize: (recordId, identity, content, facts, opts) =>
      finalizeKernel(ctx, recordId, identity, content, facts, opts),

    // --- redeem(): kernel/redeem.ts — the DIRECT-shape redemption seam (SPEC §11.2) ---
    redeem: (recordId, content, tx) => redeemKernel(ctx, recordId, content, tx),

    // --- beginRedemption(): kernel/redeem.ts — the TOKEN shape's issuance half (SPEC
    // §11.2, second step-3 increment): `confirmed → redeeming { tokenDigest }` ---
    beginRedemption: (recordId, content) => beginRedemptionKernel(ctx, recordId, content),

    // --- completeRedemption(): kernel/redeem.ts — the TOKEN shape's presentation half
    // (SPEC §11.2, second step-3 increment): `redeeming → redeemed { via: 'token',
    // tokenDigest }` on presenting the issued token ---
    completeRedemption: (recordId, token, content) =>
      completeRedemptionKernel(ctx, recordId, token, content),

    // --- raiseFinding()/acknowledge(): kernel/findings-seams.ts — SPEC §10.2's two
    // operator-only mid-lifecycle seams (second step-7 increment) ---
    raiseFinding: (recordId, finding, identity) =>
      raiseFindingKernel(ctx, recordId, finding, identity),
    acknowledge: (recordId, ack, identity) => acknowledgeKernel(ctx, recordId, ack, identity),

    // --- seal(): kernel/seal.ts — the operator-only chain-retirement seam ---
    seal: (recordId) => sealKernel(ctx, recordId),

    // --- reads: REAL (direct Store delegation) ---
    getRecord: async (recordId) => {
      const chain = await store.readChain(recordId);
      return chain.length === 0 ? null : replayCore(chain);
    },
    readChain: (recordId) => store.readChain(recordId),
    chainHead: (recordId) => store.chainHead(recordId),
    listDue: () => store.listDue(ctx.now()),

    // --- audit wrappers: REAL (readChain + the pure chain/replay.ts core) ---
    replay: async (recordId) => replayCore(await store.readChain(recordId)),
    verifyChain: async (recordId) => verifyChainCore(await store.readChain(recordId)),

    // --- verifySignatures(): kernel/verify-signatures.ts — SPEC §14's AL2 mint
    // increment's one audit surface, a pure chain-driven read wired the same way every
    // other operator read is ---
    verifySignatures: (recordId) => verifySignaturesKernel(ctx, recordId),
  };
}

/** The default real-time clock. `create()` uses this; `createWithClock()` overrides it. */
function realClock(): Date {
  return new Date();
}

/** The default token source: 32 bytes of crypto randomness, base64url (43 chars) —
 * SPEC §11.2's "cryptographic randomness and enough entropy that its digest is not
 * invertible by guessing" (§13's low-entropy-preimage limit). */
function defaultTokenSource(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * `createWithClock(config, now, mintId?, tokenSource?)` — the internal assembly with an
 * INJECTABLE clock, `recordId` minter, AND single-use-token source. The clock seam is
 * the ONLY seam expiry tests use to control "now" deterministically (no sleeping); the
 * minter seam is what a byte-stability test uses to drive a fixed id sequence so its
 * digests reproduce byte-for-byte; the token seam is the same determinism knob for
 * `beginRedemption`'s minted token — the cross-backing byte-identity test drives a FIXED
 * token through it so a `redeeming` transition's digest (which embeds `tokenDigest`)
 * reproduces byte-for-byte too. `mintId` defaults to real behavior (`id.ts`'s
 * `mintRecordId`); `tokenSource` defaults to real behavior (`defaultTokenSource` above).
 * All three are exported for tests to import from `'../src/create.js'` but deliberately
 * NOT re-exported from `index.ts`, so none of the three knobs enters the public
 * surface — the public factory is the 1-arg `create(config)` below.
 */
export function createWithClock(
  config: Config,
  now: () => Date,
  mintId: () => string = mintRecordId,
  tokenSource: () => string = defaultTokenSource,
): { agent: AgentSurface; operator: OperatorSurface } {
  const profiles = new Map<string, ResolvedProfile>();

  for (const profile of config.profiles) {
    validateProfile(profile);
    if (profiles.has(profile.id)) {
      throw new Error(`create: duplicate profile id '${profile.id}'`);
    }
    const canonicalizer = resolveCanonicalizer(
      config.canonicalizers,
      profile.subject.canonicalizerRef,
    );
    profiles.set(profile.id, {
      profile,
      canonicalizer,
      effectSeam: profileDeclaresEffectSeam(profile),
    });
    // SPEC §14's AL2 upgrade (the AL2 mint increment): a signing-declaring profile
    // demands a capability the instance cannot supply without `config.signing` — a
    // loud construction error, never a silent AL1 downgrade. The reverse (a prepared
    // instance: `config.signing` present with no declaring profile) is legal and
    // checked nowhere — the same unused-canonicalizer-registry-entry class already
    // tolerated above.
    if (profile.signing === true && config.signing === undefined) {
      throw new Error(
        `create: profile '${profile.id}' declares signing but the instance supplies no ` +
          'config.signing (signer, verifiers, signatures) — SPEC §14: signing is an ' +
          'operator-enabled hook, and a declaring profile without the hook is a loud ' +
          'construction error, never a silent AL1 downgrade',
      );
    }
  }

  // The signing-decorated wrap (SPEC §14's AL2 mint increment): iff the instance
  // declares `config.signing`, every kernel closure below captures the WRAPPED store —
  // `signing/decorate.ts`'s `withSigning` — so every append path signs by
  // construction and no seam below ever has to know. `isSigningProfile` closes over
  // the just-built `profiles` registry (never a raw profile list) so it reflects the
  // SAME resolved profiles every other kernel closure reads.
  const isSigningProfile = (profileId: string): boolean =>
    profiles.get(profileId)?.profile.signing === true;
  const store =
    config.signing === undefined
      ? config.store
      : withSigning(config.signing, config.store, isSigningProfile);

  const kernel = makeKernel({
    store,
    profiles,
    now,
    mintId,
    tokenSource,
    signing: config.signing,
  });
  return {
    agent: makeAgentSurface(kernel),
    operator: makeOperatorSurface(kernel),
  };
}

/**
 * `create(config)`: fail-fast, FAIL-CLOSED at construction (SPEC §9.1 "Construction is
 * loud"). Every profile is validated (config.ts's GOVERNED throws + structural
 * rejections), duplicate ids are rejected, and every `canonicalizerRef` must resolve.
 * Returns the two frozen capability-split handles over the shared kernel closures.
 * Profiles are never persisted.
 * The public factory: it fixes the clock to real time and delegates to `createWithClock`.
 */
export function create(config: Config): { agent: AgentSurface; operator: OperatorSurface } {
  return createWithClock(config, realClock);
}
