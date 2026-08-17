// @vidimera/record — tests/helpers/profiles.ts: the shared profile/identity/facts
// builders used across this package's test files. Deliberately parameterizable
// (profileId / canonicalizerRef / ttl / legId / allowedAuthorities / terminalRefusals
// overrides) so the same builder serves the construction-validation, unreachability,
// stage/open, finalize, and redeem suites without each one re-hand-rolling a profile.
//
// This is a TEST-ONLY helper module (not `.test.ts`, so `node --test dist/tests/*.test.js`
// never runs it directly — same convention as tests/helpers/chain.ts and
// tests/fixtures/jcs-vectors.ts).

import type { AgentSurface } from '../../src/agent-surface.js';
import type { Canonicalizer } from '../../src/canonical.js';
import type { Config, ConfirmProfile, LegSpec } from '../../src/config.js';
import type { OperatorSurface } from '../../src/operator-surface.js';
import type { RefusalCode } from '../../src/refusal-codes.js';
import { MemoryStore } from '../../src/store/memory.js';
import type { Store } from '../../src/store/store.js';
import type { IdentityAssertion, Transition } from '../../src/types.js';

// --- shared defaults -----------------------------------------------------------------

/** The canonicalizerRef every default builder wires up (and `makeConfig` registers). */
export const DEFAULT_CANONICALIZER_REF = 'test.canonical.v1';
/** A default subjectRef for stage()/finalize() call sites. */
export const DEFAULT_SUBJECT_REF = 'subject:test-1';

/**
 * The default library-registered canonicalizer for tests: a shallow structural
 * passthrough. Domain canonicalizers project domain content into a plain JSON-safe
 * structure BEFORE library JCS (SPEC §3's `Canonicalizer` hook); for test content (already
 * plain objects) an identity projection is sufficient and MUST NOT emit BigInt.
 */
export function defaultCanonicalizer(): Canonicalizer {
  return (content: unknown) => content;
}

interface ProfileOverrides {
  id?: string;
  canonicalizerRef?: string;
  /** Shorthand → `expiry: { ttl }`. Ignored when `expiry` is given explicitly. */
  ttl?: number;
  expiry?: { ttl: number } | 'none';
  legId?: string;
  allowedAuthorities?: string[];
  terminalRefusals?: RefusalCode[];
  /** SPEC §11.1: the leg's required-consultation kinds — `liveProfile`'s own override
   * point (the live-capture increment); every other builder's legs leave this
   * undefined, unchanged from before this increment. */
  requiredConsultations?: string[];
  /** SPEC §9.1's `redeem` block — `liveProfile`'s own override point (the live-capture
   * increment), honored before its own `{ reverify: true }` default. */
  redeem?: ConfirmProfile['redeem'];
}

function resolveExpiry(o: ProfileOverrides): { ttl: number } | 'none' {
  if (o.expiry !== undefined) return o.expiry;
  if (o.ttl !== undefined) return { ttl: o.ttl };
  return { ttl: 3600 };
}

function buildLeg(o: ProfileOverrides): LegSpec {
  const leg: LegSpec = {
    id: o.legId ?? 'approver-decide',
    allowedAuthorities: o.allowedAuthorities ?? ['session:test-app'],
  };
  if (o.terminalRefusals !== undefined) leg.terminalRefusals = o.terminalRefusals;
  if (o.requiredConsultations !== undefined) leg.requiredConsultations = o.requiredConsultations;
  return leg;
}

/**
 * A capture-only profile: single-leg, `captureMode:
 * 'staged'`, NO `redeem` block ⇒ effect-seam FALSE ⇒ final-leg `confirmed` is terminal.
 */
export function captureProfile(overrides: ProfileOverrides = {}): ConfirmProfile {
  return {
    id: overrides.id ?? 'test.capture.v1',
    subject: { canonicalizerRef: overrides.canonicalizerRef ?? DEFAULT_CANONICALIZER_REF },
    legs: [buildLeg(overrides)],
    captureMode: 'staged',
    expiry: resolveExpiry(overrides),
  };
}

/**
 * An effect-seam profile: single-leg, `captureMode:
 * 'staged'`, `redeem` block PRESENT ⇒ effect-seam TRUE ⇒ final-leg `confirmed` is
 * NON-terminal (awaits redemption — SPEC §2). `reverify` is deliberately omitted — it is
 * refused on a non-live profile in this build (SPEC §9.2).
 */
export function effectSeamProfile(overrides: ProfileOverrides = {}): ConfirmProfile {
  return {
    id: overrides.id ?? 'test.effect.v1',
    subject: { canonicalizerRef: overrides.canonicalizerRef ?? DEFAULT_CANONICALIZER_REF },
    legs: [buildLeg(overrides)],
    captureMode: 'staged',
    expiry: resolveExpiry(overrides),
    // `redeemBound` was declared here (86400) from step 1 until the second step-3
    // increment, riding the accepted-but-inert posture. That increment GOVERNED-guarded
    // it (config.ts): the token shape mints `redeeming` edges, and SPEC §4's
    // present-iff-declared `bound` would make a declaring profile's chain bytes
    // permanently divergent until the clock increment builds the bound whole. The third
    // step-3 increment lifts that guard with the clock built, so `redeemBound` is
    // declared again here. `confirmToRedeem` WIDENS from 1 to 3600 in the same edit:
    // finalize now stamps a real `dueAt` from it, and a one-second fixture bound would
    // race every real-clock test between finalize and the next seam call.
    redeem: { confirmToRedeem: 3600, redeemBound: 86400 },
  };
}

/**
 * SPEC §9.2's live mode (the live-capture increment): decide-what-exists. Declares the
 * mode's two construction obligations — a per-leg required consultation (the host-named
 * independent re-derivation kind) and the redemption tail (`reverify` by default here;
 * override `redeem` for the `confirmToRedeem`-only shape).
 */
export function liveProfile(overrides: ProfileOverrides = {}): ConfirmProfile {
  const leg = buildLeg(overrides);
  return {
    id: overrides.id ?? 'test.live.v1',
    subject: { canonicalizerRef: overrides.canonicalizerRef ?? DEFAULT_CANONICALIZER_REF },
    legs: [{ ...leg, requiredConsultations: leg.requiredConsultations ?? ['rederive'] }],
    captureMode: 'live',
    expiry: resolveExpiry(overrides),
    redeem: overrides.redeem ?? { reverify: true },
  };
}

/**
 * A two-leg maker-checker profile (SPEC §10.1): ordered legs `maker-decide` then
 * `checker-decide`, capture-mode, no redeem block. Multi-leg construction is accepted as
 * of the first step-4 increment (the sequencing rung and the verify-by-replay reference
 * check land with the lift); per-leg `sod`/`proposer` construct real too, as of the second
 * step-4 increment (the gate at finalize's rung 3.5 that reads the evidence). Neither is
 * declared on this base builder's legs — `multi-leg.test.ts`'s own `gatedTwoLeg` wrapper
 * extends the checker leg directly, per test, with `sod`/`proposer`/`terminalRefusals`.
 */
export function twoLegProfile(overrides: ProfileOverrides = {}): ConfirmProfile {
  return {
    id: overrides.id ?? 'test.twoleg.v1',
    subject: { canonicalizerRef: overrides.canonicalizerRef ?? DEFAULT_CANONICALIZER_REF },
    legs: [
      { id: 'maker-decide', allowedAuthorities: ['session:test-app'] },
      { id: 'checker-decide', allowedAuthorities: ['session:test-app'] },
    ],
    captureMode: 'staged',
    expiry: resolveExpiry(overrides),
  };
}

/**
 * Assembles a `Config` for `create()`: the given profiles, a fresh `MemoryStore` (unless
 * one is injected — e.g. the unreachability test injects an append-counting store), and a
 * canonicalizer registry that auto-registers `defaultCanonicalizer()` for every distinct
 * `canonicalizerRef` the profiles name (unless an explicit registry is supplied).
 */
export function makeConfig(
  profiles: ConfirmProfile[],
  opts: { store?: Store; canonicalizers?: Record<string, Canonicalizer> } = {},
): Config {
  let canonicalizers = opts.canonicalizers;
  if (canonicalizers === undefined) {
    canonicalizers = {};
    for (const profile of profiles) {
      canonicalizers[profile.subject.canonicalizerRef] = defaultCanonicalizer();
    }
  }
  return { profiles, store: opts.store ?? new MemoryStore(), canonicalizers };
}

/**
 * An identity factory (SPEC §6 "Identity by transport"): a transport-established
 * `IdentityAssertion`. Default is an approver principal under a `session:` authority —
 * the shape a host's transport establishes, distinct from a payload-carried id.
 */
export function identity(overrides: Partial<IdentityAssertion> = {}): IdentityAssertion {
  return {
    principal: overrides.principal ?? 'approver:1',
    authority: overrides.authority ?? 'session:test-app',
    ...(overrides.proofRef !== undefined ? { proofRef: overrides.proofRef } : {}),
  };
}

/**
 * A facts factory (SPEC §3's reviewed-surface `facts` binding): produces `{ figures, checker }`
 * where `checker` is the REVIEW-SURFACE identity — distinct from the finalizing actor
 * (SPEC §2.1: `svc:review-surface` ≠ actor; checker informs, never decides). Its default
 * authority is `mtls:` (a service identity), not the `session:` approver authority, so a
 * test that forgets to pass a distinct checker still gets a review-surface-shaped one.
 */
export function facts(overrides: { figures?: unknown; checker?: IdentityAssertion } = {}): {
  figures: unknown;
  checker: IdentityAssertion;
} {
  return {
    figures: overrides.figures ?? { total: 40, currency: 'SEK' },
    checker: overrides.checker ?? {
      principal: 'svc:review-surface',
      authority: 'mtls:review-surface',
    },
  };
}

/**
 * A chain-tamper helper: deep-clones `chain` and mutates a NON-LAST
 * transition's payload. Tampering a non-last transition is deliberate — a LAST-element
 * tamper is the documented AL1 blind spot (SPEC §5 / chain/replay.ts's honesty limit): a
 * singly-linked hash chain protects a transition via the NEXT link, so only a non-last
 * tamper surfaces in `verifyChain` (at `firstBreakSeq = N+1`). Requires ≥ 2 transitions.
 */
export function tamperNonLast(chain: Transition[]): Transition[] {
  return tamperAt(chain, 0);
}

/**
 * A chain-tamper helper, used by the finalize suites, parameterized by INDEX: deep-clones
 * `chain` and mutates the payload of the transition at `index`, which MUST be non-last (a
 * last-element tamper is the documented AL1 blind spot — `verifyChain` cannot detect it).
 * Kinds are left intact (only a payload field is added), so `replay` still folds the same
 * state sequence — matching the fixtures the finalize suite must pass (payload tampers of
 * non-last transitions). `tamperNonLast` is the `index=0` special case. Used for the
 * `confirmed→refused` compromise-carve-out fixture: a post-confirmed NON-LAST tamper on a
 * `[opened, confirmed, …]` chain.
 */
export function tamperAt(chain: Transition[], index: number): Transition[] {
  if (chain.length < 2) {
    throw new Error('tamperAt: need at least 2 transitions to tamper a non-last one');
  }
  if (index < 0 || index >= chain.length - 1) {
    throw new Error(
      `tamperAt: index ${index} must be a NON-LAST position (0..${chain.length - 2})`,
    );
  }
  const tampered = structuredClone(chain);
  const target = tampered[index];
  if (target === undefined)
    throw new Error(
      `tamperAt: index ${index} out of range after cloning — chain length ${tampered.length}`,
    );
  const basePayload =
    target.payload !== null && typeof target.payload === 'object' ? target.payload : {};
  tampered[index] = {
    ...target,
    payload: { ...(basePayload as Record<string, unknown>), __tampered: true },
  };
  return tampered;
}

/**
 * A stage→open convenience used by the finalize suites: stages `content` under
 * `(profileId, subjectRef)` then opens the resulting draft, returning the fresh
 * `recordId`. THROWS if either step refuses (the finalize tests set up records they expect
 * to open cleanly — a refusal there is a fixture error, not the behavior under test).
 * `legId?` is optional and passed straight to `stage()` — the finalize suites' single-leg
 * call sites are untouched.
 */
export async function openRecord(
  handles: { agent: AgentSurface; operator: OperatorSurface },
  content: unknown,
  profileId: string,
  subjectRef: string,
  legId?: string,
): Promise<string> {
  const staged = await handles.agent.stage(content, profileId, subjectRef, legId);
  if (staged.status !== 'ok') {
    throw new Error(`openRecord: stage() refused unexpectedly: ${JSON.stringify(staged)}`);
  }
  const opened = await handles.operator.open(staged.value.stagedRef);
  if (opened.status !== 'ok') {
    throw new Error(`openRecord: open() refused unexpectedly: ${JSON.stringify(opened)}`);
  }
  return opened.value.recordId;
}
