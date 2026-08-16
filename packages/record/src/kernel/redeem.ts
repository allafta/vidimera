// @vidimera/record — kernel/redeem.ts: the operator-only redemption seam, DIRECT shape
// (SPEC §11.2): the single-use coupling of a confirmed final-leg decision to its effect —
// `confirmed → redeemed { via: 'direct' }`. Exported on every profile (SPEC §8:
// "`redeem()` and `seal()` are calls on every profile, with fail-closed domain outcomes in
// every deployment"); on a pure-capture profile the domain outcome is `unredeemable-state`.
//
// The gate ladder, and why:
//   (1) chain-verify      -> chain-compromise    — §5: "Every operator-side mutating seam
//                            verifies the chain before acting"
//   (2) resolve profile   -> unknown-profile     — defensive; fail-closed
//   (3) effect seam?      -> unredeemable-state  — §11.2: "on-iff-effects"
//   (4) state gate        -> already-redeemed on 'redeemed' (at-most-once, replay half);
//                            unredeemable-state otherwise-not-confirmed
//   (5) correspondence    -> effect-mismatch     — re-digest vs the bound contentDigest
//   (6) append redeemed   -> ok; a non-append residual is a racing writer -> the
//                            family-wide CAS-residual re-read (`residualRefusal` below)
//
// (4) before (5): a replayed redemption refuses `already-redeemed` whatever content it
// carries — at-most-once outranks mismatch reporting.
//
// NO IDENTITY ARGUMENT, deliberately — SPEC §11.2: "It carries no identity argument — the
// deciding actor was bound at finalize (§6); redemption evidences execution, not
// judgment."
//
// THE DUE-OPEN EXCEPTION, PINNED — SPEC §4: "`redeem()` does not treat a due-`open`
// record as expired — it refuses `unredeemable-state` without writing an edge". A due-open
// record's state skips the clock rung in the shared `prologue` below (which resolves only
// `confirmed`/`redeeming`) and reaches each seam's own state gate, which refuses
// `unredeemable-state` with no edge — stated so nobody widens the rung to `open` by
// analogy. §4's due-`confirmed` and due-`redeeming` resolutions are REAL as of the third
// step-3 increment: the clock rung itself, in `prologue` below.
//
// THE ENLISTMENT CONTRACT (direct shape, SPEC §11.2): when the host passes its own
// transaction handle, the edge is enlisted and "commits or rolls back with it" (SPEC §12).
// The host "MUST `await` the redemption before ending that transaction"; "A host rollback
// erases the edge entirely", and re-attempting a KNOWN rolled-back redemption is legitimate
// — the forbidden retry is the token shape's unknown-outcome case, not this one. §11.2's
// honest bound: the library never executes the effect; the co-located host's protection is
// the shared transaction itself.
//
// The token shape (`redeeming`, tokenDigest, presentation) is REAL as of the second
// step-3 increment: `beginRedemption` below is its issuance half, `completeRedemption`
// its presentation half. Both redemption clocks are REAL as of the third step-3
// increment: the shared `prologue`'s clock rung resolves an elapsed confirmed or
// redeeming window before any seam-specific state gate runs; `redemption-failed` now has
// that rung as its spec-granted producer (§11.2), no longer a defensive dead-until-clock
// arm.

import { canonicalize, digest } from '../canonical.js';
import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import type { KernelContext, ResolvedProfile } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import type { AppendMeta, Store } from '../store/store.js';
import type { DecisionRecord, Digest, Transition } from '../types.js';
import { deadlineIso, pendingWindow, resolveDueClock } from './expiry.js';
import { appendChainCompromise } from './finalize.js';

/**
 * The family-wide CAS-residual refusal (second step-3 increment; an authorized behavior
 * change to the first increment's direct seam, whose flat `unredeemable-state` residual
 * was never pinned): when an append's compare-and-swap fails, a racing writer moved the
 * record between the read and the CAS. Re-read ONCE — advisory, no append, at-most-once
 * untouched — and let the fresh state pick the code, so the loser's refusal always
 * agrees with what re-invocation would say: a record now `redeemed` is §11.2's "replayed
 * redemption of an already-redeemed record" (`already-redeemed` — the case a
 * crash-recovering separated executor must be able to distinguish); anything else maps
 * to the seams' own residual, `unredeemable-state`. A chain that no longer replays is
 * not this helper's to diagnose (the caller's NEXT invocation will hit verify-first).
 */
async function residualRefusal(store: Store, recordId: string): Promise<Outcome<never>> {
  try {
    const fresh = replay(await store.readChain(recordId));
    if (fresh.state === 'redeemed') return refused('already-redeemed');
  } catch {
    // fall through — result-first either way
  }
  return refused('unredeemable-state');
}

/**
 * Due-ness for the enlisted guard in the clock rung, below — the same predicate
 * `resolveDueClock` applies internally (a pending window whose deadline has passed),
 * computed here with NO append, so an enlisted caller can refuse before ever reaching
 * `resolveDueClock`'s own compare-and-swap.
 */
function dueNow(chain: readonly Transition[], resolved: ResolvedProfile, now: Date): boolean {
  const win = pendingWindow(chain, resolved);
  return win.window !== 'none' && win.deadlineMs < now.getTime();
}

/**
 * The shared prologue of every redemption ladder — rungs (1)-(3) of all three seams
 * (direct redeem, beginRedemption, completeRedemption), byte-identical across them:
 *   load chain      -> THROW on unknown recordId (a caller error, SPEC §8)
 *   (1) chain-verify -> chain-compromise — §5: "Every operator-side mutating seam
 *       verifies the chain before acting". ENLISTED callers (tx !== undefined — today
 *       only direct redeem carries tx) refuse result-first with NO edge: see the comment
 *       in place below. Un-enlisted callers append the edge via appendChainCompromise.
 *   (2) resolve profile -> unknown-profile (fail-closed); persisted legId absent -> THROW
 *   (3) effect seam + final leg -> unredeemable-state (§11.2 "on-iff-effects"; the
 *       non-final-leg refusal is structural until the separation-of-duties step)
 * The STATE gates stay in each ladder — they are where the three seams differ.
 * The clock increment's en-passant resolution (due-`confirmed` / due-`redeeming`, §4)
 * lands HERE once, not three times — that is this helper's reason to exist.
 */
async function prologue(
  ctx: KernelContext,
  seam: 'redeem' | 'beginRedemption' | 'completeRedemption',
  recordId: string,
  tx?: unknown,
): Promise<
  | { refusal: Outcome<never> }
  | {
      gated: {
        chain: Transition[];
        record: DecisionRecord;
        resolved: ResolvedProfile;
        finalLeg: boolean;
      };
    }
> {
  const { store, profiles, now } = ctx;
  const chain = await store.readChain(recordId);
  if (chain.length === 0) {
    throw new Error(
      `${seam}: unknown recordId '${recordId}' — no such record (open() first); a recordId ` +
        'that resolves to no chain is a caller error, not a domain refusal (SPEC §8)',
    );
  }
  if (!verifyChain(chain).intact) {
    if (tx !== undefined) {
      // ENLISTED: the host already has ITS OWN transaction open on this connection, and
      // appendChainCompromise's no-tx fallback would BEGIN a SECOND transaction on that
      // same connection — the embedded backing throws ("cannot start a transaction within
      // a transaction") rather than refusing. Worse, even setting that aside, enlisting the
      // evidence edge IN the host's transaction would let a host rollback erase tampering
      // evidence, which SPEC §5's compromise guarantee cannot survive. So an enlisted
      // caller never routes through the append at all: it gets the result-first, no-edge
      // shape appendChainCompromise's OWN fallback already legitimizes for the
      // already-terminal / already-sealed corner (SPEC §5/§12) — while an un-enlisted
      // caller keeps the full edge-appending behavior below.
      return { refusal: refused('chain-compromise') };
    }
    return { refusal: await appendChainCompromise(store, chain, now) };
  }
  const record = replay(chain);
  const resolved = profiles.get(record.profileId);
  if (resolved === undefined) {
    // Defensive, fail-closed: a coherent instance always resolves a record it opened.
    return { refusal: refused('unknown-profile') };
  }
  const legIndex = resolved.profile.legs.findIndex((l) => l.id === record.legId);
  if (legIndex < 0) {
    throw new Error(
      `${seam}: persisted legId '${record.legId}' is absent from profile '${record.profileId}'`,
    );
  }
  const finalLeg = isFinalLeg(legIndex, resolved.profile.legs.length);
  if (!resolved.effectSeam || !finalLeg) {
    return { refusal: refused('unredeemable-state') };
  }

  // --- the clock rung (third step-3 increment; §4 "appended lazily at the next
  // operator-side mutating seam that observes the bound has passed") -------------------
  // Placed AFTER the seam gate: a pure-capture record never reaches here, and a
  // due-OPEN record is deliberately NOT resolved at these seams — §4: "`redeem()` does
  // not treat a due-`open` record as expired — it refuses `unredeemable-state` without
  // writing an edge" (pendingWindow's open arm is skipped by the state check below).
  // The RESOLVER REPORTS the outcome: an elapsed confirmed window resolves to `expired`
  // and the seam refuses `unredeemable-state` (§11.2's preamble — the record is now
  // expired); an elapsed redeeming window resolves to `redemption-failed` and the seam
  // refuses `redemption-timeout` (§11.2: the bound elapsed "with the outcome unknown...
  // with `redemption-timeout`"). A seam arriving AFTER a resolution finds the terminal
  // state at its own state gate and refuses `unredeemable-state` — nothing timed out at
  // that call. A lost resolution CAS re-reads once (the family residual discipline). An
  // ENLISTED caller reaching a due window is a further exception, guarded immediately
  // below, before the resolver is ever called.
  if (record.state === 'confirmed' || record.state === 'redeeming') {
    if (tx !== undefined && dueNow(chain, resolved, now())) {
      // ENLISTED and due: mirrors the enlisted chain-verify branch above. The host
      // already has ITS OWN transaction open on this connection (today only direct
      // `redeem()` carries a `tx`), so `resolveDueClock`'s no-tx `store.appendTransition`
      // would BEGIN a SECOND transaction on that same connection — the embedded backing
      // throws ("cannot start a transaction within a transaction") rather than refusing.
      // Worse, even setting that aside, enlisting the resolution edge in the host's
      // transaction would let a host rollback erase an edge this refusal already
      // reported. So an enlisted caller reaching a due window never calls
      // `resolveDueClock` at all: it refuses `unredeemable-state` for BOTH windows,
      // never `redemption-timeout` (reserved for the call that actually appends the
      // resolution), with NO edge — the edge lands at the next un-enlisted seam or the
      // sweep, per §4's lazy rule (this call is not the seam that observes).
      // Loser-agrees-with-reinvocation still holds: re-invocation without `tx` resolves
      // and reports the same terminal truth.
      return { refusal: refused('unredeemable-state') };
    }
    const due = await resolveDueClock(store, chain, resolved, now());
    if (due.due) {
      if (!due.result.appended) {
        return { refusal: await residualRefusal(store, recordId) };
      }
      return {
        refusal: refused(due.window === 'redeeming' ? 'redemption-timeout' : 'unredeemable-state'),
      };
    }
  }

  return { gated: { chain, record, resolved, finalLeg } };
}

export async function redeem(
  ctx: KernelContext,
  recordId: string,
  content: unknown,
  tx?: unknown,
): Promise<Outcome<{ recordId: string; state: 'redeemed'; transitionRef: Digest }>> {
  const { store, now } = ctx;
  const pro = await prologue(ctx, 'redeem', recordId, tx);
  if ('refusal' in pro) return pro.refusal;
  const { chain, record, resolved, finalLeg } = pro.gated;

  // --- (4) state gate ------------------------------------------------------------------
  if (record.state === 'redeemed') {
    // At-most-once, the replay half — §11.2: "a replayed redemption of an already-redeemed
    // record refuses `already-redeemed`". Checked BEFORE correspondence: at-most-once
    // outranks mismatch reporting.
    return refused('already-redeemed');
  }
  if (record.state !== 'confirmed') {
    // open/refused/expired per §11.2's preamble; `redeeming` has a producer since the
    // second step-3 increment (`beginRedemption` below) — a direct redeem() reaching a
    // `redeeming` record still refuses `unredeemable-state` here (this ladder holds no
    // token to consume; `completeRedemption` is the seam that does). `redemption-failed`
    // has a producer since the third step-3 increment (the clock rung in the shared
    // prologue above) — this arm is a post-resolution arrival, not dead code.
    return refused('unredeemable-state');
  }

  // --- (5) effect-content correspondence -----------------------------------------------
  // The same recompute path stage() bound and finalize rung (4) checks:
  // adopter canonicalizer -> library JCS -> digest, against the bound contentDigest.
  // §11.2: refuse "any mismatch with `effect-mismatch`".
  const recomputed = digest(canonicalize(resolved.canonicalizer(content)));
  if (recomputed !== record.contentDigest) {
    return refused('effect-mismatch');
  }

  // --- (6) append `confirmed → redeemed` -----------------------------------------------
  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('redeem: empty chain — the length check above holds');
  }
  const redeemedTransition: Transition = {
    recordId,
    seq: chain.length + 1,
    at: now().toISOString(),
    kind: 'redeemed',
    payload: { via: 'direct' },
    prevHash: transitionDigest(last),
  };
  // `redeemed` is terminal (§2) — the derivation, never a hardcoded false: THIS is the
  // release of the (profile, subject) pair C1 held while the record awaited redemption.
  // `dueAt` omitted clears any pending clock by §12's omission rule.
  const meta: AppendMeta = {
    nonTerminal: nonTerminal('redeemed', finalLeg, resolved.effectSeam),
  };

  const res = await store.appendTransition('confirmed', redeemedTransition, meta, tx);
  if (!res.appended) {
    return residualRefusal(store, recordId);
  }
  return ok({ recordId, state: 'redeemed', transitionRef: res.transitionDigest });
}

/**
 * beginRedemption — SPEC §11.2's token shape, the ISSUANCE half (second step-3
 * increment): `confirmed → redeeming { tokenDigest }`. The token is generated by
 * ctx.tokenSource (default: 32 bytes crypto randomness, base64url), its DIGEST is the
 * only thing persisted (DECISIONS #30: digest-only custody), and the raw token is
 * returned in the ok value EXACTLY ONCE — generated before the append, returned only
 * after it (a crash between the two strands the record, §11.2's lost-token pricing; the
 * reverse order would hand out a token whose edge never landed, strictly worse). NO tx
 * parameter: the token shape exists where "no transaction is shared" (§11.2), and
 * enlisting an issuance would let a host rollback erase the recorded tokenDigest while
 * the live token is out. NO re-issue: a begin against a `redeeming` record refuses
 * `unredeemable-state` (DECISIONS #30 — this build's mapping; §8's producer enumeration
 * predates the state, recorded in the status doc). Begin-time content correspondence is
 * this build's ADDITION, not spec-granted: §11.2's correspondence sentence reads at the
 * effect's execution (completion), but the Honest bound's "mismatched effects refusable
 * at the seam" is exactly what refusing BEFORE a token is issued buys.
 * A declared `redeemBound` prices the lost-token strand finitely (§11.2's lost-token
 * pricing): the bound is stamped into the payload and `dueAt`, so the record becomes
 * LISTABLE once it elapses, and the en-passant resolution that actually ends the strand —
 * the shared `prologue`'s clock rung, above — is REAL as of the third step-3 increment. A
 * profile declaring no `redeemBound` keeps the strand risk knowingly (§9.1's SHOULD, not a
 * MUST).
 */
export async function beginRedemption(
  ctx: KernelContext,
  recordId: string,
  content: unknown,
): Promise<
  Outcome<{ recordId: string; state: 'redeeming'; token: string; transitionRef: Digest }>
> {
  const { store, now, tokenSource } = ctx;
  const pro = await prologue(ctx, 'beginRedemption', recordId);
  if ('refusal' in pro) return pro.refusal;
  const { chain, record, resolved, finalLeg } = pro.gated;

  // --- (4) state gate ------------------------------------------------------------------
  if (record.state === 'redeemed') {
    // A begin against a redeemed record IS §11.2's "replayed redemption of an
    // already-redeemed record" — at-most-once, checked before correspondence.
    return refused('already-redeemed');
  }
  if (record.state === 'redeeming') {
    return refused('unredeemable-state'); // no re-issue — doc comment above
  }
  if (record.state !== 'confirmed') {
    // open/refused/expired/redemption-failed per §11.2's preamble; `redemption-failed`
    // has a producer since the third step-3 increment (the clock rung in the shared
    // prologue above) — this arm is a post-resolution arrival, not dead code.
    return refused('unredeemable-state');
  }

  // --- (5) effect-content correspondence (this build's addition — doc comment above) ----
  const recomputed = digest(canonicalize(resolved.canonicalizer(content)));
  if (recomputed !== record.contentDigest) {
    return refused('effect-mismatch');
  }

  // --- (6) issue, then append `confirmed → redeeming` -----------------------------------
  const token = tokenSource();
  const tokenDigest = digest(token);
  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('beginRedemption: empty chain — the prologue length check holds');
  }
  const redeemBound = resolved.profile.redeem?.redeemBound;
  const at = now().toISOString();
  // §4's table: `redeeming` is `{ tokenDigest, bound? }`, `bound` present-IFF-declared —
  // built whole at the third step-3 increment (payload, dueAt, and resolution together).
  const bound = redeemBound === undefined ? undefined : deadlineIso(at, redeemBound);
  const redeemingTransition: Transition = {
    recordId,
    seq: chain.length + 1,
    at,
    kind: 'redeeming',
    payload: bound === undefined ? { tokenDigest } : { tokenDigest, bound },
    prevHash: transitionDigest(last),
  };
  // `redeeming` is non-terminal (§2) — the derivation, never a literal: the pair's C1
  // hold CONTINUES through the token window. `dueAt` mirrors the payload's `bound`
  // present-iff-declared; omitted (undeclared profile) clears the pending-clock column
  // (§12's omission rule) exactly as it did before this profile could declare a bound.
  const meta: AppendMeta = {
    nonTerminal: nonTerminal('redeeming', finalLeg, resolved.effectSeam),
    ...(bound === undefined ? {} : { dueAt: bound }),
  };
  const res = await store.appendTransition('confirmed', redeemingTransition, meta);
  if (!res.appended) {
    return residualRefusal(store, recordId);
  }
  return ok({ recordId, state: 'redeeming', token, transitionRef: res.transitionDigest });
}

/**
 * completeRedemption — SPEC §11.2's token shape, the PRESENTATION half (second step-3
 * increment): `redeeming → redeemed { via: 'token', tokenDigest }` on presenting the
 * issued token. At-most-once's replay half is the state gate (`already-redeemed`,
 * checked BEFORE correspondence — outranks mismatch reporting); the correspondence rung
 * checks the token (digest of the presented token vs the chain-recorded tokenDigest)
 * then the content, both refusing `effect-mismatch` — one code by §11.2's own sentence,
 * so the internal order is unobservable and recorded here rather than pinned. The
 * executor's own deduplication, keyed on the token, remains the separated host's MUST
 * (§11.2's Honest bound) — this seam is defense-in-depth beside it, never a substitute.
 * NO tx, deliberately — same argument as beginRedemption's doc comment.
 */
export async function completeRedemption(
  ctx: KernelContext,
  recordId: string,
  token: string,
  content: unknown,
): Promise<Outcome<{ recordId: string; state: 'redeemed'; transitionRef: Digest }>> {
  if (typeof token !== 'string') {
    // A caller bug throws at argument intake, ahead of every outcome — the same depth as
    // finalize's consultation-shape throw (SPEC §8: caller errors are not refusals). An
    // unguarded non-string would surface as an incidental TypeError out of the digest
    // internals, which is the one wrong answer.
    throw new TypeError(
      `completeRedemption: token must be a string (got ${typeof token}) — a caller error, not a domain refusal (SPEC §8)`,
    );
  }
  const { store, now } = ctx;
  const pro = await prologue(ctx, 'completeRedemption', recordId);
  if ('refusal' in pro) return pro.refusal;
  const { chain, record, resolved, finalLeg } = pro.gated;

  // --- (4) state gate ------------------------------------------------------------------
  if (record.state === 'redeemed') {
    // §11.2: "a replayed redemption of an already-redeemed record refuses
    // `already-redeemed`" — checked before any correspondence.
    return refused('already-redeemed');
  }
  if (record.state !== 'redeeming') {
    // A never-began `confirmed`, and open/refused/expired. `redemption-failed` has a
    // producer since the third step-3 increment (the clock rung in the shared prologue
    // above, resolving an elapsed redeeming window) — a post-resolution arrival reaches
    // this gate carrying it and refuses `unredeemable-state` here, not dead code.
    return refused('unredeemable-state');
  }

  // --- (5) correspondence: the token, then the content -----------------------------------
  let issued: Transition | undefined;
  for (let i = chain.length - 1; i >= 0; i--) {
    const t = chain[i];
    if (t !== undefined && t.kind === 'redeeming') {
      issued = t;
      break;
    }
  }
  if (issued === undefined) {
    throw new Error(
      `completeRedemption: state is 'redeeming' but no redeeming transition exists in the chain for '${recordId}' — the replay fold guarantees one`,
    );
  }
  const persisted = (issued.payload as { tokenDigest?: unknown }).tokenDigest;
  if (typeof persisted !== 'string') {
    // A hash-intact chain whose redeeming payload carries no string tokenDigest is a
    // storage/config fault — SPEC §8's loud-throw posture (the legId-throw precedent),
    // NEVER `effect-mismatch`: no presentable token could ever correspond, and the
    // refusal would send the operator into a permanent retry loop against a lie.
    throw new Error(
      `completeRedemption: persisted 'redeeming' payload for record '${recordId}' carries no string tokenDigest — a garbled or foreign chain is a storage/config fault, not a domain outcome (SPEC §8)`,
    );
  }
  // Plain `===` over digest strings, DELIBERATELY not a constant-time compare: the
  // compared value (tokenDigest) is public chain data any chain reader already holds;
  // the secret is the PREIMAGE, protected by the digest's preimage resistance. A timing
  // oracle on `===` can only ever recover the non-secret side; `timingSafeEqual` here
  // would defend nothing. (Written down so nobody "fixes" it.)
  if (digest(token) !== persisted) {
    return refused('effect-mismatch');
  }
  const recomputed = digest(canonicalize(resolved.canonicalizer(content)));
  if (recomputed !== record.contentDigest) {
    return refused('effect-mismatch');
  }

  // --- (6) append `redeeming → redeemed { via: 'token', tokenDigest }` ------------------
  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('completeRedemption: empty chain — the prologue length check holds');
  }
  const redeemedTransition: Transition = {
    recordId,
    seq: chain.length + 1,
    at: now().toISOString(),
    kind: 'redeemed',
    payload: { via: 'token', tokenDigest: persisted },
    prevHash: transitionDigest(last),
  };
  // Terminal by the derivation — THE RELEASE via the token path; dueAt omitted here IS
  // the clearing (§12's omission rule): beginRedemption wrote a real dueAt for this
  // window whenever redeemBound was declared, and this append's own omission clears it,
  // exactly as expected of a terminal record with no successor window pending.
  const meta: AppendMeta = {
    nonTerminal: nonTerminal('redeemed', finalLeg, resolved.effectSeam),
  };
  const res = await store.appendTransition('redeeming', redeemedTransition, meta);
  if (!res.appended) {
    return residualRefusal(store, recordId);
  }
  return ok({ recordId, state: 'redeemed', transitionRef: res.transitionDigest });
}
