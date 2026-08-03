// @vidimera/record — public entry point: the single `.` export. Re-exports `create`,
// the two exported helpers (`canonicalize`/`digest`), every public type, and the
// provisional `MemoryStore` implementation (see that export's own comment below). No
// subpath exports — the agent/operator split is a runtime capability split (two frozen
// handles from `create`), not a module split.

export type { AgentSurface } from './agent-surface.js';
export type { DigestAlgorithm } from './canonical.js';
// --- exported helpers ---
export { canonicalize, digest } from './canonical.js';
export type { ChainVerifyReport } from './chain/replay.js';
// --- public types ---
export type { Canonicalizer, Config, ConfirmProfile, LegSpec } from './config.js';
// --- factory ---
export { create } from './create.js';
export type { OperatorSurface } from './operator-surface.js';
export type { Outcome } from './outcome.js';
export type { RefusalCode } from './refusal-codes.js';
// --- provisional in-memory Store implementation ---
// Re-exported so adopters wire the library's own reference `Store` instead of
// hand-rolling a byte-identical copy (an integrating host otherwise risks
// re-deriving the private transition-encoding internals itself — a drift hazard).
// Chain/encoding internals stay unexported; the store class is the
// seam. PUBLIC BUT EXPLICITLY UNSTABLE PRE-1.0 — see `MemoryStore`'s own doc comment
// and the `Store` interface's (same marking).
export { MemoryStore } from './store/memory.js';
export type { AppendResult, Store } from './store/store.js';
export type {
  Consultation,
  DecisionRecord,
  Digest,
  IdentityAssertion,
  RecordState,
  ReviewView,
  StagedDraft,
  Transition,
  TransitionKind,
} from './types.js';
