// @vidimera/record — nonterminal.ts: the ONE place the library-derived
// `nonTerminal` flag is computed, then handed to `Store.appendTransition` as a plain
// boolean argument (SPEC §12: "the library derives them, the store never recomputes
// them") — the Store itself never re-derives this from a profile; it only persists what
// it is told. This keeps the Store profile-ignorant.

import type { RecordState } from './types.js';

/**
 * `nonTerminal(state, isFinalLeg, effectSeam)` (SPEC §2 "States and terminality",
 * verbatim formula):
 *   state==='open' || (state==='confirmed' && isFinalLeg && effectSeam) || state==='redeeming'
 *
 * Read per disjunct:
 *  - `open` is always non-terminal (the record has not yet been decided).
 *  - `confirmed` is non-terminal ONLY when it is BOTH the profile's final leg AND the
 *    profile declares an effect seam (a `redeem` block) — i.e. confirmation still
 *    awaits redemption (SPEC §2: "effect-seam ⇒ non-terminal — it awaits redemption").
 *    A capture-only profile's final-leg `confirmed`
 *    (no effect seam) is terminal — this function returns `false` for it.
 *  - `redeeming` is always non-terminal — unreachable in this build (no
 *    caller here can ever produce this state, but the formula is written completely
 *    per the SPEC rather than narrowed to only the reachable disjuncts).
 *  - Every other `RecordState` (`refused`, `expired`, `redeemed`, `redemption-failed`)
 *    is terminal: `false`.
 */
export function nonTerminal(state: RecordState, isFinalLeg: boolean, effectSeam: boolean): boolean {
  return (
    state === 'open' || (state === 'confirmed' && isFinalLeg && effectSeam) || state === 'redeeming'
  );
}

/**
 * `isFinalLeg` helper: shaped here as a plain 0-based-index vs.
 * leg-count comparison so it is forward-compatible with a future multi-leg profile
 * (`legs.length>1` is GOVERNED-throw-guarded at construction in this build, per
 * `config.ts`'s construction guards — SPEC §10.1) without
 * needing a signature change when that guard lifts: the final leg is simply the last
 * index in the profile's ordered `legs` array.
 *
 * Single-leg in this build: with exactly one leg (`totalLegs===1`), the one
 * leg IS final — `isFinalLeg(0, 1) === true` — trivially, since `legIndex===0` is
 * always `totalLegs-1` when there is only one leg.
 */
export function isFinalLeg(legIndex: number, totalLegs: number): boolean {
  return legIndex === totalLegs - 1;
}
