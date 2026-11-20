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
//  - `finalize()` (and, on the same rung, `decline()` and the findings seams): its
//    state/expiry gate resolves a due record's open or confirmed window here → `leg-expired`.
//  - The three redemption seams' shared prologue (`kernel/redeem.ts`): resolves the
//    confirmed and redeeming windows before each seam's own state gate runs.
// The module decides due-ness AND performs the CAS append; the CALLER decides its own
// verdict from the returned result. Keeping the CAS here (never an advisory pre-check)
// means a race that flips the record's state surfaces as a non-appended result the caller
// maps, never as a lost update. The decision-progress seams map a lost resolution CAS
// through `lostResolutionRefusal` below, so the loser is told what re-invoking would tell
// it (the faults-and-races increment).

import { assertChainFor } from '../chain/binding.js';
import { transitionDigest } from '../chain/encoding.js';
import { replay } from '../chain/replay.js';
import type { ConfirmProfile } from '../config.js';
import type { ResolvedProfile } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { refused } from '../outcome.js';
import type { AppendResult, Store } from '../store/store.js';
import type { RecordState, Transition } from '../types.js';

/** The most recent transition of `kind`, scanned from the head with no reversed copy — the
 * loop `kernel/redeem.ts` already uses (the review-hardening pass, 2026-09-05). */
function lastOfKind(
  chain: readonly Transition[],
  kind: Transition['kind'],
): Transition | undefined {
  for (let i = chain.length - 1; i >= 0; i--) {
    const t = chain[i];
    if (t !== undefined && t.kind === kind) return t;
  }
  return undefined;
}

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
    const confirmedAt = lastOfKind(chain, 'confirmed')?.at;
    if (confirmedAt === undefined) {
      throw new Error('pendingWindow: state is confirmed but no confirmed transition exists');
    }
    return { window: 'confirmed', deadlineMs: Date.parse(confirmedAt) + bound * 1000 };
  }
  if (record.state === 'redeeming') {
    const bound = profile.redeem?.redeemBound;
    if (bound === undefined) return { window: 'none' };
    const redeemingAt = lastOfKind(chain, 'redeeming')?.at;
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
  recordId: string,
  chain: readonly Transition[],
  resolved: ResolvedProfile,
  now: Date,
): Promise<ResolveResult> {
  const win = pendingWindow(chain, resolved);
  // Due when `now >= deadline` — the same inclusive instant SPEC §12's listing gate
  // (`dueAt ≤ now`) uses, so a record the sweep lists is a record every seam resolves.
  if (win.window === 'none' || win.deadlineMs > now.getTime()) return { due: false };

  const bound = new Date(win.deadlineMs).toISOString();
  const last = chain.at(-1);
  if (last === undefined) throw new Error('resolveDueClock: empty chain');
  const kind = win.window === 'redeeming' ? 'redemption-failed' : 'expired';
  const target: RecordState = win.window; // 'open' | 'confirmed' | 'redeeming' — the CAS state
  const edge: Transition = {
    recordId,
    seq: chain.length + 1,
    at: now.toISOString(),
    kind,
    payload: { bound },
    prevHash: transitionDigest(last),
  };
  const state = kind === 'expired' ? 'expired' : 'redemption-failed';
  const { profile, effectSeam } = resolved;
  // Derived, not hardcoded, mirroring pendingWindow's confirmed arm. Output-identical:
  // both resolution kinds are terminal, so nonTerminal() is false for every input either
  // way; the derived index keeps this append correct if a non-terminal clock edge ever
  // exists. Pinned in clocks.test.ts.
  const record = replay(chain);
  const legIndex = profile.legs.findIndex((l) => l.id === record.legId);
  const meta = {
    nonTerminal: nonTerminal(state, isFinalLeg(legIndex, profile.legs.length), effectSeam),
  };
  const result = await store.appendTransition(target, edge, meta);
  return { due: true, window: win.window, result, bound };
}

/** An append the store did not take — the shape every lost-CAS mapping reads. */
export type LostAppend = Extract<AppendResult, { appended: false }>;

/**
 * The storage fault an append conflict is where it has NO honest producer (the
 * faults-and-races increment). Nothing was appended, so it is thrown — the exception scope
 * DECISIONS.md #10 reserves for "storage faults where nothing was recorded" — and never mapped
 * to a domain code, which would state something about a record this call cannot see. The
 * wording is the single-append conflict fault's (`kernel/finalize.ts`'s `seqConflict`).
 * `seqWhy` says why `'seq'` has no honest producer at the caller's own CAS target; an
 * exclusivity conflict has none on any append but a genesis. Callers: the redemption residual
 * (`kernel/redeem.ts`), `seal`, and `lostResolutionRefusal` below.
 */
export function appendConflictFault(
  seam: string,
  conflict: LostAppend['conflict'],
  seqWhy: string,
): Error {
  const why =
    conflict === 'seq'
      ? seqWhy
      : 'C1 exclusivity binds only a genesis append, and this append is not one';
  return new Error(
    `${seam}: append conflict ('${conflict}'). A Store honouring the compare-and-swap ` +
      `contract cannot report this: ${why}. This is a storage fault. The append is ` +
      'all-or-nothing: nothing was appended and the record is unchanged.',
  );
}

/**
 * The fault a lost compare-and-swap becomes when the re-read that would name the winner
 * fails — it rejects, returns another record's rows, or does not replay. The re-read is what
 * lets the loser answer what re-invoking would; without it no domain code is known to be true,
 * so the failure is thrown as this error's `cause` (`seqConflict`'s posture for its own
 * diagnostic re-read). The call's own append lost, so nothing was appended by it.
 */
export function lostCasReadFault(seam: string, cause: unknown): Error {
  return new Error(
    `${seam}: the append lost its compare-and-swap to a concurrent writer, and the re-read ` +
      "that would name the record's fresh state failed (its error rides as this one's cause), " +
      'so no refusal is known to be true of the record. This call appended nothing; re-invoke ' +
      'once the store answers.',
    { cause },
  );
}

/** Why `'seq'` has no honest producer on an expiry edge proposed against `confirmed`. */
const CONFIRMED_SEQ_WHY =
  "the expiry edge's compare-and-swap target is 'confirmed', and every legitimate append a " +
  'confirmed record admits leaves that state; every conforming backing checks the state before ' +
  "the seq, so a concurrent writer reaches this call as 'state-mismatch', never 'seq'";

/**
 * A decision-progress seam's lost resolution CAS (`finalize`, `decline`, the findings seams;
 * the faults-and-races increment): the seam asked `resolveDueClock` to append a due window's
 * edge and the store did not take it. The loser answers what re-invoking would answer:
 *  - the REDEEMING window: `record-not-open`. No append out of `redeeming` leaves the record
 *    open or expired, so the code is true whatever won.
 *  - `'seq'` on the OPEN window: the state CAS passed, so the record is still `open` — a
 *    state-preserving append (a finding or an acknowledgment) took the seq — and still due.
 *    `leg-expired`: re-invoking lands the edge and says the same.
 *  - `'seq'` on the CONFIRMED window: no honest producer (`CONFIRMED_SEQ_WHY`), so the
 *    storage fault is thrown.
 *  - `state-mismatch` on either: a racer moved the state. One advisory re-read, no append:
 *    `expired` → `leg-expired` (SPEC §8: "an `expired` or due-expired record"), anything else
 *    → `record-not-open`. A re-read that fails throws `lostCasReadFault`.
 */
export async function lostResolutionRefusal(
  seam: 'finalize' | 'decline' | 'raiseFinding' | 'acknowledge',
  store: Store,
  recordId: string,
  window: 'open' | 'confirmed' | 'redeeming',
  lost: LostAppend,
): Promise<Outcome<never>> {
  if (window === 'redeeming') return refused('record-not-open');
  if (lost.conflict !== 'state-mismatch') {
    if (lost.conflict === 'seq' && window === 'open') return refused('leg-expired');
    throw appendConflictFault(seam, lost.conflict, CONFIRMED_SEQ_WHY);
  }
  let state: RecordState;
  try {
    const chain = await store.readChain(recordId);
    // A foreign chain is a failed re-read: it can never name this record's state.
    assertChainFor(chain, recordId, `${seam} re-read`);
    state = replay(chain).state;
  } catch (err) {
    throw lostCasReadFault(seam, err);
  }
  return refused(state === 'expired' ? 'leg-expired' : 'record-not-open');
}
