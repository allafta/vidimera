// @vidimera/record — kernel/expiry.ts: the clocks for the three pending windows (SPEC §4
// "Clock-driven edges are appended en passant"; §9.1 "Redemption bounds"; §12 dueAt/listDue):
// the third step-3 increment's windows. The library ships "no scheduler and no public
// `expire()`", and a due transition is "appended lazily at the next operator-side mutating
// seam that observes the bound has passed". This module does that append via the Store's
// compare-and-swap (SPEC §12), ahead of the calling seam's own verdict — finalize's gate
// ladder puts the state/expiry rung (2) ahead of every later rung (SPEC §9).
//
// Three seams share this module:
//  - `open()`: on a `conflict:'exclusivity'` against a still-OPEN but LAPSED blocker,
//    it resolves the blocker's open window here, then retries its own genesis exactly once.
//  - `finalize()`: its state/expiry gate resolves a due-open record's open window here,
//    then reads the now-`expired` state → `leg-expired`.
//  - The three redemption seams' shared prologue (`kernel/redeem.ts`): resolves the
//    confirmed and redeeming windows before each seam's own state gate runs.
// The module decides due-ness AND performs the CAS append; the CALLER decides its own
// verdict from the returned result. Keeping the CAS here (never an advisory pre-check)
// means a race that flips the record's state surfaces as a non-appended result the caller
// maps, never as a lost update.

import { transitionDigest } from '../chain/encoding.js';
import { replay } from '../chain/replay.js';
import type { ConfirmProfile } from '../config.js';
import type { ResolvedProfile } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { AppendResult, Store } from '../store/store.js';
import type { RecordState, Transition } from '../types.js';

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

export type PendingWindow =
  | { window: 'none' }
  | { window: 'open'; deadlineMs: number }
  | { window: 'confirmed'; deadlineMs: number }
  | { window: 'redeeming'; deadlineMs: number };

/** `Date.parse(atIso) + seconds*1000`, as the ms-precision RFC 3339 deadline (§4's rule). */
export function deadlineIso(atIso: string, seconds: number): string {
  return new Date(Date.parse(atIso) + seconds * 1000).toISOString();
}

/**
 * §12's "whichever pending window the record is in", as one derivation (third step-3
 * increment): the OPEN window (openedAt + expiry.ttl; `expiry:'none'` ⇒ none), the
 * CONFIRMED window (confirmedAt + confirmToRedeem — only a final-leg, effect-seam,
 * declaring profile; §9.1), the REDEEMING window (redeemingAt + redeemBound — only
 * declared). Terminal states and undeclared bounds ⇒ 'none'. The derivation reads the
 * REPLAYED state — never the dueAt column, which §12 keeps an index only. Its executing
 * pins live in clocks.test.ts and redeem-token.test.ts.
 */
export function pendingWindow(
  chain: readonly Transition[],
  resolved: ResolvedProfile,
): PendingWindow {
  const { profile, effectSeam } = resolved;
  const record = replay(chain);
  if (record.state === 'open') {
    const genesis = chain[0];
    if (genesis === undefined) throw new Error('pendingWindow: empty chain');
    const deadlineMs = expiryDeadlineMs(genesis.at, profile.expiry);
    return deadlineMs === null ? { window: 'none' } : { window: 'open', deadlineMs };
  }
  if (record.state === 'confirmed') {
    const legIndex = profile.legs.findIndex((l) => l.id === record.legId);
    const finalLeg = isFinalLeg(legIndex, profile.legs.length);
    const bound = profile.redeem?.confirmToRedeem;
    if (!effectSeam || !finalLeg || bound === undefined) return { window: 'none' };
    const confirmedAt = [...chain].reverse().find((t) => t.kind === 'confirmed')?.at;
    if (confirmedAt === undefined) {
      throw new Error('pendingWindow: state is confirmed but no confirmed transition exists');
    }
    return { window: 'confirmed', deadlineMs: Date.parse(confirmedAt) + bound * 1000 };
  }
  if (record.state === 'redeeming') {
    const bound = profile.redeem?.redeemBound;
    if (bound === undefined) return { window: 'none' };
    const redeemingAt = [...chain].reverse().find((t) => t.kind === 'redeeming')?.at;
    if (redeemingAt === undefined) {
      throw new Error('pendingWindow: state is redeeming but no redeeming transition exists');
    }
    return { window: 'redeeming', deadlineMs: Date.parse(redeemingAt) + bound * 1000 };
  }
  return { window: 'none' };
}

export type ResolveResult =
  | { due: false }
  | { due: true; window: 'open' | 'confirmed' | 'redeeming'; result: AppendResult; bound: string };

/**
 * The one en-passant CAS append (§4): if the record's pending window has elapsed, append
 * its resolution edge — open/confirmed → `expired { bound }` (the SAME kind and payload
 * either way: "the transitioned-from state, not the payload, distinguishes the expiry
 * clause from `confirmToRedeem`", §4's table), redeeming → `redemption-failed { bound }`.
 * Both terminal by the derivation — each is a release of the C1 hold; `dueAt` omitted
 * clears the column (§12). The CALLER maps the outcome (§4's per-seam exceptions live at
 * the call sites, never here) and handles a lost CAS (a racing writer) per its own
 * residual discipline.
 */
export async function resolveDueClock(
  store: Store,
  chain: readonly Transition[],
  resolved: ResolvedProfile,
  now: Date,
): Promise<ResolveResult> {
  const win = pendingWindow(chain, resolved);
  if (win.window === 'none' || win.deadlineMs >= now.getTime()) return { due: false };

  const bound = new Date(win.deadlineMs).toISOString();
  const last = chain.at(-1);
  if (last === undefined) throw new Error('resolveDueClock: empty chain');
  const kind = win.window === 'redeeming' ? 'redemption-failed' : 'expired';
  const target: RecordState = win.window; // 'open' | 'confirmed' | 'redeeming' — the CAS state
  const edge: Transition = {
    recordId: last.recordId,
    seq: chain.length + 1,
    at: now.toISOString(),
    kind,
    payload: { bound },
    prevHash: transitionDigest(last),
  };
  const state = kind === 'expired' ? 'expired' : 'redemption-failed';
  const { profile, effectSeam } = resolved;
  const meta = { nonTerminal: nonTerminal(state, isFinalLeg(0, profile.legs.length), effectSeam) };
  const result = await store.appendTransition(target, edge, meta);
  return { due: true, window: win.window, result, bound };
}
