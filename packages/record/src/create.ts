// @vidimera/record — create.ts: the factory. It (1) fail-fast validates every
// profile (config.ts's fail-closed guards), (2) detects duplicate profile ids, (3)
// resolves every profile's `canonicalizerRef` against the registry (canonical.ts's
// fail-closed `resolveCanonicalizer`), then (4) assembles the SHARED kernel closures over
// the injected Store + the resolved profiles and hands them to the two capability-split
// surface factories.
//
// The "shared kernel closures" all live here so the capability split
// (agent-surface.ts / operator-surface.ts) stays a select, wrap and freeze — each surface
// picks its subset and gives every function its own frozen closure (handle-fn.ts). Every
// record-transitioning closure (`stage`/`open`/`review`/`finalize`/`decline`/`redeem`/
// `raiseFinding`/`acknowledge`/`seal`) calls into `kernel/*.ts` — `decline` delegates to
// `kernel/decline.ts`, SPEC §9's operator-only `open → declined` seam (the
// recorded-human-decline increment): finalize's ladder with the evidence rungs absent,
// sharing `finalize()`'s own `sodViolated`/`refuseMaybeAppend`/`isValidFacts` helpers rather
// than a drifting copy; `redeem` delegates to `kernel/redeem.ts`,
// the DIRECT-shape redemption seam (SPEC §11.2): a confirmed effect-seam record's final leg
// is coupled to its effect via `confirmed → redeemed { via: 'direct', resultDigest? }`, enlisted in the
// caller's own transaction when one is passed through; `unredeemable-state` on every
// profile/state with no redeemable seam; `raiseFinding`/`acknowledge` delegate to
// `kernel/findings-seams.ts`, SPEC §10.2's two operator-only mid-lifecycle seams (second
// step-7 increment) — the only appends between `opened` and the decision; `seal` delegates
// to `kernel/seal.ts`, the operator-only chain-retirement seam that caps a verified
// derived-terminal record with a `sealed` transition and reports `retired`. The reads
// (`getRecord`/`readChain`/`chainHead`/`listDue`) and the `replay`/`verifyChain` `recordId`
// audit wrappers are REAL: Store delegation + the pure `chain/replay.ts` core. `getRecord`
// and `replay` identity-check the chain they read (`chain/binding.ts`); raw `readChain` and
// `chainHead` stay direct delegation and check nothing.
// `listDue`, new at the third step-3 increment, is the sweep's one read —
// `store.listDue(now())` under the injected clock, no append authority.

import { randomBytes } from 'node:crypto';
import { type AgentSurface, makeAgentSurface } from './agent-surface.js';
import { type Canonicalizer, resolveCanonicalizer } from './canonical.js';
import { assertChainFor } from './chain/binding.js';
import { replay as replayCore, verifyChain as verifyChainCore } from './chain/replay.js';
import {
  type Config,
  type ConfirmProfile,
  profileDeclaresEffectSeam,
  validateProfile,
} from './config.js';
import { mintRecordId } from './id.js';
import { decline as declineKernel } from './kernel/decline.js';
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
import { profileDigest } from './profile-digest.js';
import { snapshotProfile } from './profile-snapshot.js';
import { withSigning } from './signing/decorate.js';
import type { SigningConfig } from './signing/store.js';
import type { Store } from './store/store.js';
import type { Digest } from './types.js';

/**
 * A validated profile paired with its resolved canonicalizer and precomputed effect-seam
 * flag — the per-profile bundle the KERNEL behaviors look up by profileId.
 *
 * `profile` is the frozen plain-data SNAPSHOT `profile-snapshot.ts` made at `create()`, never
 * the host's own object: validation, the digest and every seam read this copy, so a host that
 * mutates its object afterwards changes nothing the instance enforces or binds.
 */
export interface ResolvedProfile {
  profile: ConfirmProfile;
  canonicalizer: Canonicalizer;
  effectSeam: boolean;
  /**
   * `profileDigest(profile)` of the snapshot, computed once here: the digest `open()` binds
   * into every genesis and the digest `kernel/held-profile.ts` compares a record's binding
   * against at every seam. Because the snapshot keeps exactly the own enumerable data the
   * projection reads (and a Proxy, whose reads could differ, is refused), it equals
   * `profileDigest(hostObject)` for the profile as the host passed it to `create()`, so the
   * offline helper and the instance never disagree about a registrable profile.
   * `kernel/verify-signatures.ts`'s report reads this same cached value.
   */
  profileDigest: Digest;
}

/**
 * The state shared by every kernel closure: the injected Store, the resolved-profile
 * registry, and the clock. Passed to `makeKernel`; the `kernel/*.ts` functions take this
 * shape.
 *
 * `now` is the injected clock the kernel reads for RFC3339 `at` timestamps and for the
 * en-passant expiry gate (`openedAt + ttl <= now` — inclusive at the instant, the stores'
 * own listing gate). It defaults to real time
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
  decline: OperatorSurface['decline'];
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
 * effect-seam record's final leg to its effect via `confirmed → redeemed { via: 'direct', resultDigest? }`,
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

    // --- decline(): kernel/decline.ts — the recorded-human-decline increment's
    // operator-only `open → declined` seam (SPEC §9) ---
    decline: (recordId, identity, content, facts, opts) =>
      declineKernel(ctx, recordId, identity, content, facts, opts),

    // --- redeem(): kernel/redeem.ts — the DIRECT-shape redemption seam (SPEC §11.2) ---
    redeem: (recordId, content, opts) => redeemKernel(ctx, recordId, content, opts),

    // --- beginRedemption(): kernel/redeem.ts — the TOKEN shape's issuance half (SPEC
    // §11.2, second step-3 increment): `confirmed → redeeming { tokenDigest }` ---
    beginRedemption: (recordId, content, opts) =>
      beginRedemptionKernel(ctx, recordId, content, opts),

    // --- completeRedemption(): kernel/redeem.ts — the TOKEN shape's presentation half
    // (SPEC §11.2, second step-3 increment): `redeeming → redeemed { via: 'token',
    // tokenDigest, resultDigest? }` on presenting the issued token ---
    completeRedemption: (recordId, token, content, opts) =>
      completeRedemptionKernel(ctx, recordId, token, content, opts),

    // --- raiseFinding()/acknowledge(): kernel/findings-seams.ts — SPEC §10.2's two
    // operator-only mid-lifecycle seams (second step-7 increment) ---
    raiseFinding: (recordId, finding, identity) =>
      raiseFindingKernel(ctx, recordId, finding, identity),
    acknowledge: (recordId, ack, identity) => acknowledgeKernel(ctx, recordId, ack, identity),

    // --- seal(): kernel/seal.ts — the operator-only chain-retirement seam ---
    seal: (recordId) => sealKernel(ctx, recordId),

    // --- reads: REAL (`getRecord` identity-checks the chain; the raw reads delegate directly) ---
    getRecord: async (recordId) => {
      const chain = await store.readChain(recordId);
      if (chain.length === 0) return null;
      assertChainFor(chain, recordId, 'getRecord');
      return replayCore(chain);
    },
    readChain: (recordId) => store.readChain(recordId),
    chainHead: (recordId) => store.chainHead(recordId),
    listDue: () => store.listDue(ctx.now()),

    // --- audit wrappers: REAL (readChain + the pure chain/replay.ts core; `replay`
    // identity-checks the chain, `verifyChain` reports a foreign one as a break) ---
    replay: async (recordId) => {
      const chain = await store.readChain(recordId);
      assertChainFor(chain, recordId, 'replay');
      return replayCore(chain);
    },
    // Bound to `recordId` (SPEC §5: "running over the chain the store returns for that
    // record"): another record's rows read back under this key report a break at seq 1.
    verifyChain: async (recordId) => verifyChainCore(await store.readChain(recordId), recordId),

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
 * The shape of `config.signing`, checked at construction so a malformed block fails loudly
 * here instead of as an obscure error at the first append. An EMPTY `verifiers` registry is
 * legal (a prepared instance): the mint check refuses its first signature.
 */
function validateSigningShape(signing: unknown): void {
  if (typeof signing !== 'object' || signing === null) {
    throw new Error('create: config.signing must be an object { signer, verifiers, signatures }');
  }
  const block = signing as Record<string, unknown>;
  if (typeof block.signer !== 'function') {
    throw new Error('create: config.signing.signer must be a function');
  }
  const verifiers = block.verifiers;
  const isObject = typeof verifiers === 'object' && verifiers !== null;
  const proto: unknown = isObject ? Object.getPrototypeOf(verifiers) : undefined;
  if (!isObject || (proto !== Object.prototype && proto !== null)) {
    throw new Error(
      'create: config.signing.verifiers must be a plain object keyed by keyRef ' +
        '(not an array, a Map, or another class instance)',
    );
  }
  // EVERY own string key, enumerable or not: the signature layer resolves a keyRef with
  // `Object.hasOwn`, which finds a non-enumerable own key as readily as any other, so a check
  // over `Object.entries` alone would pass a registry the layer then calls a non-function from.
  for (const keyRef of Object.getOwnPropertyNames(verifiers)) {
    const verifier: unknown = (verifiers as Record<string, unknown>)[keyRef];
    if (typeof verifier !== 'function') {
      throw new Error(`create: config.signing.verifiers['${keyRef}'] must be a function`);
    }
  }
  const sidecar = block.signatures as Record<string, unknown> | null | undefined;
  if (typeof sidecar !== 'object' || sidecar === null) {
    throw new Error('create: config.signing.signatures must be an object');
  }
  if (typeof sidecar.put !== 'function') {
    throw new Error('create: config.signing.signatures.put must be a function');
  }
  if (typeof sidecar.listByRecord !== 'function') {
    throw new Error('create: config.signing.signatures.listByRecord must be a function');
  }
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
): Surfaces {
  const profiles = new Map<string, ResolvedProfile>();

  // The config is read ONCE: each field below is read into a local and everything after uses
  // the local, so a getter, a Proxy or a host mutating mid-construction cannot make two reads
  // disagree. The profile list is iterated by index over that one read.
  if (typeof config !== 'object' || config === null) {
    throw new Error('create: config must be an object');
  }
  const profileList: unknown = config.profiles;
  const baseStore = config.store;
  const canonicalizers: unknown = config.canonicalizers;
  const signing = config.signing;
  if (!Array.isArray(profileList)) {
    throw new Error(
      `create: config.profiles must be an array of profiles (found ${profileList === null ? 'null' : typeof profileList})`,
    );
  }
  if (typeof canonicalizers !== 'object' || canonicalizers === null) {
    throw new Error(
      'create: config.canonicalizers must be an object keyed by canonicalizerRef ' +
        `(found ${canonicalizers === null ? 'null' : typeof canonicalizers})`,
    );
  }
  if (signing !== undefined) validateSigningShape(signing);
  const profileCount = profileList.length;
  for (let position = 0; position < profileCount; position += 1) {
    // One frozen plain-data copy per profile, validated and digested here; the host's own
    // object is never retained, so nothing it does afterwards reaches a seam.
    const profile = snapshotProfile(profileList[position], position);
    validateProfile(profile);
    if (profiles.has(profile.id)) {
      throw new Error(`create: duplicate profile id '${profile.id}'`);
    }
    const canonicalizer = resolveCanonicalizer(
      canonicalizers as Record<string, Canonicalizer>,
      profile.subject.canonicalizerRef,
    );
    profiles.set(profile.id, {
      profile,
      canonicalizer,
      effectSeam: profileDeclaresEffectSeam(profile),
      profileDigest: profileDigest(profile),
    });
    // SPEC §14's AL2 upgrade (the AL2 mint increment): a signing-declaring profile
    // demands a capability the instance cannot supply without `config.signing` — a
    // loud construction error, never a silent AL1 downgrade. The reverse (a prepared
    // instance: `config.signing` present with no declaring profile) is legal and
    // checked nowhere — the same unused-canonicalizer-registry-entry class already
    // tolerated above.
    if (profile.signing === true && signing === undefined) {
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
    signing === undefined ? baseStore : withSigning(signing, baseStore, isSigningProfile);

  const kernel = makeKernel({
    store,
    profiles,
    now,
    mintId,
    tokenSource,
    signing,
  });
  return {
    agent: makeAgentSurface(kernel),
    operator: makeOperatorSurface(kernel),
  };
}

/**
 * The handle pair `create()` returns: the two frozen capability-split surfaces over one
 * shared kernel. Named (rather than left an inline shape) so a host can spell the pair —
 * annotate a field, type a wrapper — without re-deriving it; SPEC §9's composition rule
 * ("the host MUST compose the handles so the agent receives only the agent surface")
 * is about how these two members are handed out.
 */
export interface Surfaces {
  agent: AgentSurface;
  operator: OperatorSurface;
}

/**
 * `create(config)`: fail-fast, FAIL-CLOSED at construction (SPEC §9.1 "Construction is
 * loud"). Every profile is validated (config.ts's GOVERNED throws + structural
 * rejections), duplicate ids are rejected, and every `canonicalizerRef` must resolve.
 * Returns the two frozen capability-split handles over the shared kernel closures.
 * Profiles are never persisted.
 * The public factory: it fixes the clock to real time and delegates to `createWithClock`.
 */
export function create(config: Config): Surfaces {
  return createWithClock(config, realClock);
}
