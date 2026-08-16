// @vidimera/record — RefusalCode union, the REGISTRY code→class map, and the
// append-decision helper (SPEC §8 "Refusal codes"; DECISIONS.md #14 "The refusal
// registry is a compiler-total map; append behavior is one shared derivation").

export type RefusalCode =
  | 'content-drift'
  | 'identity-authority-refused'
  | 'record-exists'
  | 'leg-expired'
  | 'consultation-missing'
  | 'chain-compromise'
  | 'record-not-open'
  | 'unknown-profile'
  | 'unknown-leg'
  | 'unredeemable-state'
  | 'unsealable-state'
  // first PROFILE-CONDITIONAL codes (SPEC §8's conditional table): producers in
  // kernel/redeem.ts (effect-mismatch, already-redeemed); redemption-timeout produced by
  // kernel/expiry.ts's resolution, consumed by kernel/redeem.ts's shared prologue across
  // all three redemption seams (the third step-3 increment)
  | 'effect-mismatch'
  | 'already-redeemed'
  | 'redemption-timeout'
  // the fifteenth code (the first step-4 increment): SPEC §8's conditional table names it
  // "a pre-record `open()`-seam sequencing refusal that never appends" — producer worded
  // two-touch, same as `redemption-timeout` above: the verifier (`kernel/prior-legs.ts`)
  // consumed by `open()`'s sequencing rung, landing later in the first step-4 increment
  | 'prior-leg-unverified';
// class map: chain-compromise → 'compromise'; all others → 'refusal'
// record-not-open: class 'refusal', terminal-record category — finalize() against a non-open, intact-chain
//   record (double-finalize; an effect-seam confirmed record awaiting redemption; a refused record). NEVER
//   appends, no transitionRef, no transitionRef-bearing edge. One further producer sits off the gate
//   ladder: rung (6)'s entry conflict, where finalize()'s success batch is all-or-nothing and its entry
//   compare-and-swap fails before anything is appended — kernel/finalize.ts's rung (6) comment and
//   `batchConflict`'s doc comment. Because the batch applied nothing, the code is true of both the
//   record's state and this registry's never-appends rule at that site, for the first time here.
// unknown-leg: class 'refusal'. SPEC §8 names two producers — a caller-named leg absent
//   from the profile at `stage()`, and a staged draft's leg absent from the profile it
//   resolves under at `open()`. BOTH are built in this build (`stage()`'s
//   caller-named-legId check, kernel/stage.ts; `open()`'s staged-legId re-check,
//   kernel/open.ts).
// unsealable-state: class 'refusal'. SPEC §8 — `seal()` against a record that is not
//   derived-terminal or is already sealed, and the residual of a racing or duplicate seal
//   (C4 rejects through C3's terminal-state-mismatch path, §12). NEVER appends.

export type RefusalClass = 'refusal' | 'compromise';

/**
 * REGISTRY code→class map (DECISIONS.md #14: "a compiler-total map"). Typed as
 * `Record<RefusalCode, RefusalClass>`
 * so the mapping is compiler-enforced TOTAL — every RefusalCode must have an entry or
 * this file fails to type-check. Only `chain-compromise` is `'compromise'`; every other
 * code is `'refusal'`. This is the ONLY place class is derived from — outcome.ts's
 * `refused()` looks class up here; callers never supply it directly.
 *
 * Named `REGISTRY` (DECISIONS.md #14's own word — "the refusal registry is a
 * compiler-total map") since the second step-3 increment: it carries the core set AND the
 * profile-conditional codes (`effect-mismatch`, `already-redeemed`), so the earlier name
 * `CORE` misdescribed it — that increment honored the rename its predecessor recorded
 * here as deferred.
 */
export const REGISTRY: Record<RefusalCode, RefusalClass> = {
  'content-drift': 'refusal',
  'identity-authority-refused': 'refusal',
  'record-exists': 'refusal',
  'leg-expired': 'refusal',
  'consultation-missing': 'refusal',
  'chain-compromise': 'compromise',
  'record-not-open': 'refusal',
  'unknown-profile': 'refusal',
  'unknown-leg': 'refusal',
  'unredeemable-state': 'refusal',
  'unsealable-state': 'refusal',
  'effect-mismatch': 'refusal',
  'already-redeemed': 'refusal',
  'redemption-timeout': 'refusal',
  'prior-leg-unverified': 'refusal',
};

/**
 * Minimal shape of a leg needed to decide whether a refusal appends a transition.
 * NOT the full LegSpec (that's config.ts's) — kept minimal so
 * this module doesn't depend on config types.
 */
export interface AppendDecisionLeg {
  terminalRefusals?: RefusalCode[];
}

/**
 * Codes that NEVER append a transition, regardless of leg configuration (SPEC §8's
 * never-appends set): `record-exists` / `unknown-profile` / `unknown-leg` (pre-record) and
 * `record-not-open` (terminal-record) never append; `unsealable-state` never appends —
 * `seal()`'s only append is the `sealed` transition itself, folded into its own success path
 * (`kernel/seal.ts`), never a byproduct of this refusal;
 * `unredeemable-state`, `effect-mismatch`, `already-redeemed`, and `redemption-timeout` never append —
 * redemption's refusals are all result-first, the seam's only append being the `redeemed`
 * transition folded into its own success path (`kernel/redeem.ts`), never a byproduct of a
 * refusal; `redemption-timeout`'s producer is the clock resolution at the redemption seams
 * (`kernel/expiry.ts`'s `resolveDueClock` consumed in `kernel/redeem.ts`'s shared
 * prologue), real as of the third step-3 increment, and its edge is the
 * `redemption-failed` KIND (SPEC §4's table), never a `refused` transition — SPEC §8
 * lists it in the never-appends set; `prior-leg-unverified` never appends too —
 * pre-record, same reason as `record-exists`/`unknown-profile`/`unknown-leg` above: no
 * record exists to carry an edge. Its producer, the verifier (`kernel/prior-legs.ts`)
 * consumed by `open()`'s sequencing rung, lands later in the first step-4 increment; the
 * verifier itself lands here, unconsumed.
 */
const NEVER_APPENDS: ReadonlySet<RefusalCode> = new Set<RefusalCode>([
  'record-exists',
  'unknown-profile',
  'unknown-leg',
  'record-not-open',
  'unredeemable-state',
  'unsealable-state',
  'effect-mismatch',
  'already-redeemed',
  'redemption-timeout',
  'prior-leg-unverified',
]);

/**
 * Append-decision helper (SPEC §8's "Append semantics" — the `appendsOn` rule): a
 * `compromise`-class code appends a `refused` transition at head wherever the current
 * state admits a state-leaving append — §8 surfaces it result-first with NO edge against an
 * already-terminal `expired`/`refused` record (§12's C3) or a sealed one (§12's C4), so
 * this predicate returns `true` unconditionally and the append seam in the kernel
 * (kernel/finalize.ts's `appendChainCompromise`, which walks candidate CAS targets and
 * falls back to a ref-less refusal when the store admits none), not `appendsOn`, is what
 * lands that carve-out. §12's C4 is built in `store/memory.ts`, so the sealed half is a
 * bar this build's Store enforces, not merely a rule §12 states; the never-append codes
 * above NEVER append; every other
 * refusal-class code appends `open→refused` iff the leg's `terminalRefusals` lists it
 * (otherwise the record stays open, no append).
 *
 * `leg-expired` is a member of `RefusalCode` and CAN legally appear in a leg's
 * `terminalRefusals`, but it is resolved by finalize()'s state/expiry gate BEFORE any
 * refusal-append decision is reached (kernel/finalize.ts step (2), ahead of steps
 * (3)-(5) which are the only callers of `appendsOn`) — so `appendsOn('leg-expired', …)`
 * is never actually consulted by the kernel. A leg listing `leg-expired` in
 * `terminalRefusals` therefore has no effect (SPEC §8 names this as one of two inert
 * `terminalRefusals` members; pinned in refusal-matrix.test.ts). Keep it that way, or
 * gate it explicitly if/when `appendsOn` usage widens beyond finalize's steps (3)-(5).
 */
export function appendsOn(code: RefusalCode, leg: AppendDecisionLeg): boolean {
  if (REGISTRY[code] === 'compromise') return true;
  if (NEVER_APPENDS.has(code)) return false;
  return leg.terminalRefusals?.includes(code) ?? false;
}
