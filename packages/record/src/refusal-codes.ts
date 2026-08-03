// @vidimera/record — RefusalCode union, the CORE code→class registry, and the
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
  | 'unredeemable-state';
// class map: chain-compromise → 'compromise'; all others → 'refusal'
// record-not-open: class 'refusal', terminal-record category — finalize() against a non-open, intact-chain
//   record (double-finalize; an effect-seam confirmed record awaiting redemption; a refused record). NEVER
//   appends, no transitionRef, no transitionRef-bearing edge; also the mapping for a residual
//   conflict:'state-mismatch' on the finalize confirmed-append CAS.
// unknown-leg: class 'refusal'. SPEC §8 names two producers — a caller-named leg absent
//   from the profile at `stage()`, and a staged draft's leg absent from the profile it
//   resolves under at `open()`. Only the first is built in this build (`stage()`'s
//   caller-named-legId check, kernel/stage.ts); the second is not yet wired.

export type RefusalClass = 'refusal' | 'compromise';

/**
 * CORE code→class registry (DECISIONS.md #14: "a compiler-total map"). Typed as
 * `Record<RefusalCode, RefusalClass>`
 * so the mapping is compiler-enforced TOTAL — every RefusalCode must have an entry or
 * this file fails to type-check. Only `chain-compromise` is `'compromise'`; every other
 * code is `'refusal'`. This is the ONLY place class is derived from — outcome.ts's
 * `refused()` looks class up here; callers never supply it directly.
 */
export const CORE: Record<RefusalCode, RefusalClass> = {
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
 * `record-not-open` (terminal-record) never append; `unredeemable-state` (this build's
 * redeem() stub) never appends either.
 */
const NEVER_APPENDS: ReadonlySet<RefusalCode> = new Set<RefusalCode>([
  'record-exists',
  'unknown-profile',
  'unknown-leg',
  'record-not-open',
  'unredeemable-state',
]);

/**
 * Append-decision helper (SPEC §8's "Append semantics" — the `appendsOn` rule): a
 * `compromise`-class code ALWAYS appends a `refused`
 * transition at head; the never-append codes above NEVER append; every other
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
  if (CORE[code] === 'compromise') return true;
  if (NEVER_APPENDS.has(code)) return false;
  return leg.terminalRefusals?.includes(code) ?? false;
}
