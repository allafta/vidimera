// @vidimera/record — nonterminal.ts (design §2 "nonterminal.ts" / §4 "the nonTerminal
// formula" / §5 "Profile-derived terminality"): the ONE place the library-derived
// `nonTerminal` flag is computed, then handed to `Store.appendTransition` as a plain
// boolean argument (design §4: "library-derived nonTerminal") — the Store itself never
// re-derives this from a profile; it only persists what it is told. This keeps the
// Store profile-ignorant (design §2: "the flag passed into appendTransition; keeps the
// Store profile-ignorant").

import type { RecordState } from './types.js';

/**
 * `nonTerminal(state, isFinalLeg, effectSeam)` (design §4, verbatim formula):
 *   state==='open' || (state==='confirmed' && isFinalLeg && effectSeam) || state==='redeeming'
 *
 * Read per disjunct:
 *  - `open` is always non-terminal (the record has not yet been decided).
 *  - `confirmed` is non-terminal ONLY when it is BOTH the profile's final leg AND the
 *    profile declares an effect seam (a `redeem` block) — i.e. confirmation still
 *    awaits redemption (design §5 "Profile-derived terminality": "effect-seam ⇒
 *    non-terminal (awaits redemption)"). A capture-only profile's final-leg `confirmed`
 *    (no effect seam) is terminal — this function returns `false` for it.
 *  - `redeeming` is always non-terminal (design §4: "unreachable at slice 3" — no
 *    slice-3 caller can ever produce this state, but the formula is written completely
 *    per the design rather than narrowed to only the reachable disjuncts).
 *  - Every other `RecordState` (`refused`, `expired`, `redeemed`, `redemption-failed`)
 *    is terminal: `false`.
 */
export function nonTerminal(state: RecordState, isFinalLeg: boolean, effectSeam: boolean): boolean {
  return state === 'open' || (state === 'confirmed' && isFinalLeg && effectSeam) || state === 'redeeming';
}

/**
 * `isFinalLeg` helper (design §2: "+ isFinalLeg helper"). Not otherwise specified by
 * the design beyond that pairing — shaped here as a plain 0-based-index vs.
 * leg-count comparison so it is forward-compatible with a future multi-leg profile
 * (`legs.length>1` is GOVERNED-throw-guarded at construction through slice 3, per
 * `config.ts` design §5 "Construction guards" — not yet built at Task 5) without
 * needing a signature change when that guard lifts: the final leg is simply the last
 * index in the profile's ordered `legs` array.
 *
 * Single-leg slice 3 (task-5 brief): with exactly one leg (`totalLegs===1`), the one
 * leg IS final — `isFinalLeg(0, 1) === true` — trivially, since `legIndex===0` is
 * always `totalLegs-1` when there is only one leg.
 */
export function isFinalLeg(legIndex: number, totalLegs: number): boolean {
  return legIndex === totalLegs - 1;
}
