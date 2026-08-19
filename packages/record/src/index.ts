// @vidimera/record — public entry point: the single `.` export. Re-exports `create` (its
// handle pair named `Surfaces`), the exported helpers (`canonicalize`/`digest`, and the
// pure audit functions `replay`/`verifyChain` beside their operator-handle forms, SPEC §5),
// every public type — including, per the 2026-08-19 phase-1 API review's no-unspellable-
// names rule, every type a public signature names — the signing tier, and the provisional
// `Store` implementations (see each export's own comment below). The agent/operator split
// is a runtime capability split (two frozen handles from `create`), not a module split;
// the one decided subpath, `./probes` (OPEN-QUESTIONS §5's "a public library subpath"),
// lands with the exports map itself (publish tooling, deferral register row 1).

export type { AgentSurface } from './agent-surface.js';
export type { DigestAlgorithm } from './canonical.js';
// --- exported helpers ---
export { canonicalize, digest } from './canonical.js';
// --- the adapter-author surface (SPEC §12: "A third-party `Store` adapter implementer
// MUST honor the contract below") — the helpers a conforming backing needs and cannot
// re-derive without becoming the drift hazard the store seam exists to prevent: the
// private transition encoding's digest, and the C3/C4 semantic arms. A deliberate,
// grouped post-review amendment to the phase-1 surface, argued in the phase-4
// store-postgres spec under docs/superpowers/specs/ (dated 2026-08-19).
export { transitionDigest } from './chain/encoding.js';
export type { ChainVerifyReport } from './chain/replay.js';
// --- the pure audit functions (SPEC §5) — exposed on the operator handle by recordId,
// and exported here in their pure `(chain)` forms for the offline-audit case: an
// archived chain (a sealed record's, say) replays and verifies with no store and no
// handle ---
export { replay, verifyChain } from './chain/replay.js';
// --- public types ---
export type {
  Canonicalizer,
  Config,
  ConfirmProfile,
  ConsultationInput,
  FinalizeOptions,
  LegSpec,
  ObtainedConsultation,
  OpenOptions,
  PolicyInput,
  PriorRecordRef,
  UnreachableMarker,
} from './config.js';
export type { Surfaces } from './create.js';
// --- factory ---
export { create } from './create.js';
export type { AckInput, FindingInput } from './kernel/findings-seams.js';
export type { SignatureReport } from './kernel/verify-signatures.js';
export type { OperatorSurface } from './operator-surface.js';
export type { Outcome } from './outcome.js';
export type { RefusalCode } from './refusal-codes.js';
// --- the AL2 signing tier (SPEC §14) — root-reachable beside the stores it mirrors:
// the host-supplied hooks and registry types, the decorator, and the provisional
// in-memory SignatureStore ---
export { withSigning } from './signing/decorate.js';
export { MemorySignatureStore } from './signing/memory.js';
export type {
  SignatureEntry,
  SignatureStore,
  Signer,
  SigningConfig,
  Verifier,
} from './signing/store.js';
// --- provisional in-memory Store implementation ---
// Re-exported so adopters wire the library's own reference `Store` instead of
// hand-rolling a byte-identical copy (an integrating host otherwise risks
// re-deriving the private transition-encoding internals itself — a drift hazard).
// Chain/encoding internals stay unexported; the store class is the
// seam. PUBLIC BUT EXPLICITLY UNSTABLE PRE-1.0 — see `MemoryStore`'s own doc comment
// and the `Store` interface's (same marking).
export { MemoryStore } from './store/memory.js';
export type { GenesisPayload } from './store/semantics.js';
export { isCompromiseCarveOut, isStateLeaving, stateOf } from './store/semantics.js';
// --- provisional embedded-SQL Store implementation ---
// Same rationale as `MemoryStore` above — the seam an adopter wires rather than
// hand-rolling. PUBLIC BUT EXPLICITLY UNSTABLE PRE-1.0 — see `SqliteStore`'s own doc
// comment and the `Store` interface's (same marking).
export { SqliteStore } from './store/sqlite.js';
export type { AppendMeta, AppendResult, BatchResult, Store } from './store/store.js';
export type {
  Consultation,
  DecisionRecord,
  Digest,
  IdentityAssertion,
  RecordedAck,
  RecordedFinding,
  RecordedPriorLegRef,
  RecordState,
  ReviewView,
  StagedDraft,
  SupersedesRef,
  Transition,
  TransitionKind,
} from './types.js';
