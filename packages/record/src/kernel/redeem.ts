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
//   (6) append redeemed   -> ok; a non-append residual is a racing writer ->
//                            unredeemable-state, result-first
//
// (4) before (5): a replayed redemption refuses `already-redeemed` whatever content it
// carries — at-most-once outranks mismatch reporting.
//
// NO IDENTITY ARGUMENT, deliberately — SPEC §11.2: "It carries no identity argument — the
// deciding actor was bound at finalize (§6); redemption evidences execution, not
// judgment."
//
// NO EN-PASSANT EXPIRY — SPEC §4: "`redeem()` does not treat a due-`open` record as
// expired — it refuses `unredeemable-state` without writing an edge". Vacuous in the first
// step-3 increment (no clock sets `dueAt` on any state this ladder examines until the clock
// increment) and stated so nobody adds `expireIfDue` by analogy; §4's due-`confirmed`
// resolution is the clock increment's work.
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
// step-3 increment: `beginRedemption` below is its issuance half; `completeRedemption`,
// its presentation half, is a later increment's addition. Both redemption clocks remain
// the third increment's; `redemption-failed` stays a defensive, dead-until-clock arm,
// never claimed as a spec-granted producer.

import { canonicalize, digest } from '../canonical.js';
import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import type { KernelContext, ResolvedProfile } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import type { AppendMeta } from '../store/store.js';
import type { DecisionRecord, Digest, Transition } from '../types.js';
import { appendChainCompromise } from './finalize.js';

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
    // has no producer until the clock increment — this arm is defensive for that one alone.
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
    // A racing writer moved the record between the read and the CAS; result-first,
    // nothing appended, the residual mapped to the seam's own domain code.
    return refused('unredeemable-state');
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
 * Until the clock increment, a lost token permanently strands the (profile, subject)
 * pair — completeRedemption with the token is the sole exit (status doc: safe to ship,
 * not yet safe to operate).
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
    // open/refused/expired per §11.2's preamble; `redemption-failed` has no producer
    // until the clock increment — that arm of this check is dead code until then.
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
  const redeemingTransition: Transition = {
    recordId,
    seq: chain.length + 1,
    at: now().toISOString(),
    kind: 'redeeming',
    payload: { tokenDigest },
    prevHash: transitionDigest(last),
  };
  // `redeeming` is non-terminal (§2) — the derivation, never a literal: the pair's C1
  // hold CONTINUES through the token window. `dueAt` omitted: no clock exists in this
  // build (redeemBound is GOVERNED-guarded at construction).
  const meta: AppendMeta = {
    nonTerminal: nonTerminal('redeeming', finalLeg, resolved.effectSeam),
  };
  const res = await store.appendTransition('confirmed', redeemingTransition, meta);
  if (!res.appended) {
    // A racing writer moved the record between the read and the CAS; result-first.
    // (The family-wide residual re-read refinement replaces this in a later task of the
    // second step-3 increment.)
    return refused('unredeemable-state');
  }
  return ok({ recordId, state: 'redeeming', token, transitionRef: res.transitionDigest });
}
