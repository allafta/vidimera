// @vidimera/record — public entry point: the single `.` export (design §2 "index.ts" /
// §8 "Exports: single '.'"). Re-exports `create`, the two exported helpers
// (`canonicalize`/`digest`), every public type, and the provisional `MemoryStore`
// implementation (added post-Task-10 review; see that export's own comment below). No
// subpath exports — the agent/operator split is a runtime capability split (two frozen
// handles from `create`), not a module split.

// --- factory ---
export { create } from './create.js';

// --- exported helpers (design §3 EXPORTED HELPERS) ---
export { canonicalize, digest } from './canonical.js';

// --- public types ---
export type { Config, ConfirmProfile, LegSpec, Canonicalizer } from './config.js';
export type { AgentSurface } from './agent-surface.js';
export type { OperatorSurface } from './operator-surface.js';
export type { Outcome } from './outcome.js';
export type { RefusalCode } from './refusal-codes.js';
export type { DigestAlgorithm } from './canonical.js';
export type {
  Digest,
  IdentityAssertion,
  Consultation,
  Transition,
  TransitionKind,
  RecordState,
  DecisionRecord,
  ReviewView,
  StagedDraft,
} from './types.js';
export type { Store, AppendResult } from './store/store.js';
export type { ChainVerifyReport } from './chain/replay.js';

// --- provisional in-memory Store implementation (design §4 slice-3 backing) ---
// Re-exported (Task 10 review, adjudicated) so adopters wire the library's own
// reference `Store` instead of hand-rolling a byte-identical copy (the tide example
// originally did exactly that, including re-deriving the private transition-encoding
// — a drift hazard). Chain/encoding internals stay unexported; the store class is the
// seam. PUBLIC BUT EXPLICITLY UNSTABLE PRE-1.0 — see `MemoryStore`'s own doc comment
// and the `Store` interface's (same marking).
export { MemoryStore } from './store/memory.js';
