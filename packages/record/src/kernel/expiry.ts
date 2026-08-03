// @vidimera/record — kernel/expiry.ts (design §5 "Clocks en passant" / §9 "OQ2-10 minimal
// locator pulled forward"): the en-passant expiry helper. "A due `expired` is appended
// lazily at the next operator-side mutating seam via the Store CAS BEFORE that seam's
// verdict; no public `expire()`." At slice 3 this covers ONLY `open → expired`
// (`confirmed → expired` / `confirmToRedeem` is a slice-5 effect-seam edge).
//
// Two seams share this helper:
//  - `open()` (Task 7): on a `conflict:'exclusivity'` against a still-OPEN but LAPSED
//    blocker, it expires the blocker here, then retries its own genesis exactly once.
//  - `finalize()` (Task 8, forward): its state/expiry gate expires a due-open record here,
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
 * SECONDS (matching the profile builders' `3600` / `86400` values), so it is multiplied
 * by 1000. Returns `null` for `expiry:'none'` — an open record under a no-expiry profile
 * NEVER lapses (design §5: "profile expiry 'none' ⇒ never expires ⇒ no expire branch").
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
 * The `expired` transition (design §3 payload shapes: `expired = { bound }`):
 *  - `prevHash` = `transitionDigest(chain[last])` (the current head — computed from the
 *    chain we hold, no extra Store round-trip);
 *  - `seq` = `chain.length + 1` (C2 1-based +1; a stale seq is caught by the Store);
 *  - `at` = `now` (RFC3339 UTC);
 *  - `payload.bound` = the crossed deadline `openedAt + ttl` as RFC3339 — the moment the
 *    open window closed. It is informational (replay folds only `state:'expired'` from an
 *    `expired` transition; `bound` names which expiry clause fired, §3/replay.ts);
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
