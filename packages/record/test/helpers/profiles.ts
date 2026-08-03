// @vidimera/record — tests/helpers/profiles.ts (design §6 "tests/helpers/profiles.ts"):
// the shared builders used across Tasks 6-9 test files. Deliberately parameterizable
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
/** A default subjectRef for stage()/finalize() call sites (Tasks 7-9). */
export const DEFAULT_SUBJECT_REF = 'subject:test-1';

/**
 * The default library-registered canonicalizer for tests: a shallow structural
 * passthrough. Domain canonicalizers project domain content into a plain JSON-safe
 * structure BEFORE library JCS (design §3 `Canonicalizer`); for test content (already
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
  return leg;
}

/**
 * A capture-only profile (design §7 tide.week.v1 shape): single-leg, `captureMode:
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
 * An effect-seam profile (design §7 pay.order.v1 shape): single-leg, `captureMode:
 * 'staged'`, `redeem` block PRESENT ⇒ effect-seam TRUE ⇒ final-leg `confirmed` is
 * NON-terminal (awaits redemption, slice 5). `reverify` is deliberately omitted — it is
 * refused on a non-live profile at slice 3 (design §5/§9).
 */
export function effectSeamProfile(overrides: ProfileOverrides = {}): ConfirmProfile {
  return {
    id: overrides.id ?? 'test.effect.v1',
    subject: { canonicalizerRef: overrides.canonicalizerRef ?? DEFAULT_CANONICALIZER_REF },
    legs: [buildLeg(overrides)],
    captureMode: 'staged',
    expiry: resolveExpiry(overrides),
    redeem: { confirmToRedeem: 1, redeemBound: 86400 },
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
 * An identity factory (design §6): a transport-established `IdentityAssertion`. Default
 * is an approver principal under a `session:` authority — the shape the tide example's
 * host establishes from its transport (design §7), distinct from a payload-carried id.
 */
export function identity(overrides: Partial<IdentityAssertion> = {}): IdentityAssertion {
  return {
    principal: overrides.principal ?? 'approver:1',
    authority: overrides.authority ?? 'session:test-app',
    ...(overrides.proofRef !== undefined ? { proofRef: overrides.proofRef } : {}),
  };
}

/**
 * A facts factory (design §6 / §3 finalize `facts`): produces `{ figures, checker }`
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
 * A chain-tamper helper (design §6): deep-clones `chain` and mutates a NON-LAST
 * transition's payload. Tampering a non-last transition is deliberate — a LAST-element
 * tamper is the documented AL1 blind spot (Task 4 / chain/replay.ts honesty limit): a
 * singly-linked hash chain protects a transition via the NEXT link, so only a non-last
 * tamper surfaces in `verifyChain` (at `firstBreakSeq = N+1`). Requires ≥ 2 transitions.
 */
export function tamperNonLast(chain: Transition[]): Transition[] {
  return tamperAt(chain, 0);
}

/**
 * A chain-tamper helper (Task 8 finalize / design §6) parameterized by INDEX: deep-clones
 * `chain` and mutates the payload of the transition at `index`, which MUST be non-last (a
 * last-element tamper is the documented AL1 blind spot — `verifyChain` cannot detect it).
 * Kinds are left intact (only a payload field is added), so `replay` still folds the same
 * state sequence — matching the fixtures Task 8 must pass (payload tampers of non-last
 * transitions). `tamperNonLast` is the `index=0` special case. Used for the S-4
 * `confirmed→refused` fixture: a post-confirmed NON-LAST tamper on a
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
 * A stage→open convenience used by the Task 8 finalize suites: stages `content` under
 * `(profileId, subjectRef)` then opens the resulting draft, returning the fresh
 * `recordId`. THROWS if either step refuses (the finalize tests set up records they expect
 * to open cleanly — a refusal there is a fixture error, not the behavior under test).
 */
export async function openRecord(
  handles: { agent: AgentSurface; operator: OperatorSurface },
  content: unknown,
  profileId: string,
  subjectRef: string,
): Promise<string> {
  const staged = await handles.agent.stage(content, profileId, subjectRef);
  if (staged.status !== 'ok') {
    throw new Error(`openRecord: stage() refused unexpectedly: ${JSON.stringify(staged)}`);
  }
  const opened = await handles.operator.open(staged.value.stagedRef);
  if (opened.status !== 'ok') {
    throw new Error(`openRecord: open() refused unexpectedly: ${JSON.stringify(opened)}`);
  }
  return opened.value.recordId;
}
