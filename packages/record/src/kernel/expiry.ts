// @vidimera/record — kernel/expiry.ts: the en-passant expiry helper (SPEC §4
// "Clock-driven edges are appended en passant"): the library ships "no scheduler and no
// public `expire()`", and a due `expired` is "appended lazily at the next operator-side
// mutating seam that observes the bound has passed". This helper does that append via the
// Store's compare-and-swap (SPEC §12), ahead of the calling seam's own verdict — finalize's
// gate ladder puts the state/expiry rung (2) ahead of every later rung (SPEC §9). This build
// covers ONLY `open → expired` (`confirmed → expired` / `confirmToRedeem` is SPEC §9.1's
// effect-seam edge, not built in this build).
//
// Two seams share this helper:
//  - `open()`: on a `conflict:'exclusivity'` against a still-OPEN but LAPSED
//    blocker, it expires the blocker here, then retries its own genesis exactly once.
//  - `finalize()`: its state/expiry gate expires a due-open record here,
//    then reads the now-`expired` state → `leg-expired`.
// The helper decides due-ness AND performs the CAS append; the CALLER decides its own
// verdict from the returned AppendResult. Keeping the CAS here (never an advisory
// pre-check) means a race that flips the record away from 'open' surfaces as a
// non-appended result the caller maps, never as a lost update.

import { transitionDigest } from '../chain/encoding.js';
import type { ConfirmProfile } from '../config.js';
import type { ResolvedProfile } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { AppendResult, Store } from '../store/store.js';
import type { Transition } from '../types.js';

type Expiry = ConfirmProfile['expiry'];

/**
 * The epoch-ms deadline a record's OPEN window closes: `openedAt + ttl`. `ttl` is in
 * SECONDS (SPEC §9.1; matching the profile builders' `3600` / `86400` values), so it is
 * multiplied by 1000. Returns `null` for `expiry:'none'` — an open record under a
 * no-expiry profile NEVER lapses.
 */
export function expiryDeadlineMs(openedAt: string, expiry: Expiry): number | null {
  if (expiry === 'none') return null;
  return Date.parse(openedAt) + expiry.ttl * 1000;
}

/**
 * The result of an en-passant expiry attempt:
 *  - `{expired:false}` — NOT due (never lapses under `expiry:'none'`, or the deadline has
 *    not yet passed); no CAS was attempted.
 *  - `{expired:true; result; bound}` — due; the CAS was attempted. `result` is the raw
 *    `AppendResult` (the caller inspects `appended`); `bound` is the crossed deadline.
 */
export type ExpireResult =
  | { expired: false }
  | { expired: true; result: AppendResult; bound: string };

/**
 * `expireIfDue(store, chain, resolved, now)` — if the currently-OPEN record whose `chain`
 * is given is due, append an `expired` transition via the Store CAS
 * (`expectedCurrentState:'open'`) and return the result; otherwise report `{expired:false}`.
 * The caller MUST pass the chain of a record it has already determined is in state `open`
 * (open() via `replay(blockerChain).state==='open'`; finalize() via its own state gate) —
 * the CAS re-checks `open` atomically regardless, so a stale read surfaces as a
 * non-appended `state-mismatch` rather than a lost update.
 *
 * The `expired` transition (SPEC §4's payload shapes: `expired = { bound }`):
 *  - `prevHash` = `transitionDigest(chain[last])` (the current head — computed from the
 *    chain we hold, no extra Store round-trip);
 *  - `seq` = `chain.length + 1` (§12's C2, 1-based +1; a stale seq is caught by the Store);
 *  - `at` = `now` (RFC3339 UTC);
 *  - `payload.bound` = the crossed deadline `openedAt + ttl` as RFC3339 — the moment the
 *    open window closed. It is informational (replay folds only `state:'expired'` from an
 *    `expired` transition); `bound` is the elapsed deadline timestamp, not a clause name —
 *    the transitioned-from state distinguishes which expiry clause fired, SPEC §4;
 *  - `nonTerminal` = `false` (an `expired` record is terminal — `nonTerminal('expired',…)`
 *    is `false` for every leg/effect-seam combination; computed via the helper for honesty
 *    rather than hardcoded).
 *
 * The blocker/record shares its profile with the caller (open()'s C1 exclusivity keys on
 * (profileId, subjectRef), so the blocker's profile IS the caller's `resolved`), so
 * `resolved` supplies both the ttl and the effect-seam flag correctly.
 */
export async function expireIfDue(
  store: Store,
  chain: readonly Transition[],
  resolved: ResolvedProfile,
  now: Date,
): Promise<ExpireResult> {
  const { profile, effectSeam } = resolved;
  const genesis = chain[0];
  if (genesis === undefined) {
    throw new Error('expireIfDue: empty chain — callers hold a loaded chain');
  }
  const openedAt = genesis.at; // chain[0] is the genesis `opened` transition
  const deadline = expiryDeadlineMs(openedAt, profile.expiry);
  if (deadline === null || deadline >= now.getTime()) {
    return { expired: false };
  }

  const bound = new Date(deadline).toISOString();
  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('expireIfDue: empty chain — callers hold a loaded chain');
  }
  const expiredTransition: Transition = {
    recordId: last.recordId,
    seq: chain.length + 1,
    at: now.toISOString(),
    kind: 'expired',
    payload: { bound },
    prevHash: transitionDigest(last),
  };
  const expiredNonTerminal = nonTerminal('expired', isFinalLeg(0, profile.legs.length), effectSeam); // false
  const result = await store.appendTransition('open', expiredTransition, expiredNonTerminal);
  return { expired: true, result, bound };
}
