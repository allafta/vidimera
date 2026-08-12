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
// The token shape (`redeeming`, tokenDigest, presentation) and both redemption clocks are
// LATER step-3 increments; states `redeeming`/`redemption-failed` are defensively refused
// below, never claimed as spec-granted arms.

import { canonicalize, digest } from '../canonical.js';
import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import type { KernelContext } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import type { AppendMeta } from '../store/store.js';
import type { Digest, Transition } from '../types.js';
import { appendChainCompromise } from './finalize.js';

export async function redeem(
  ctx: KernelContext,
  recordId: string,
  content: unknown,
  tx?: unknown,
): Promise<Outcome<{ recordId: string; state: 'redeemed'; transitionRef: Digest }>> {
  const { store, profiles, now } = ctx;

  const chain = await store.readChain(recordId);
  if (chain.length === 0) {
    throw new Error(
      `redeem: unknown recordId '${recordId}' — no such record (open() first); a recordId ` +
        'that resolves to no chain is a caller error, not a domain refusal (SPEC §8)',
    );
  }

  // --- (1) chain-verify, FIRST ---------------------------------------------------------
  if (!verifyChain(chain).intact) {
    return appendChainCompromise(store, chain, now);
  }

  const record = replay(chain);

  // --- (2) profile resolution ----------------------------------------------------------
  const resolved = profiles.get(record.profileId);
  if (resolved === undefined) {
    // Defensive, fail-closed: a coherent instance always resolves a record it opened.
    return refused('unknown-profile');
  }
  const legIndex = resolved.profile.legs.findIndex((l) => l.id === record.legId);
  if (legIndex < 0) {
    throw new Error(
      `redeem: persisted legId '${record.legId}' is absent from profile '${record.profileId}'`,
    );
  }
  const finalLeg = isFinalLeg(legIndex, resolved.profile.legs.length);

  // --- (3) effect seam declared? -------------------------------------------------------
  // §11.2's preamble: pure-capture profiles omit redemption entirely. The non-final-leg
  // refusal it also names is structural here — no multi-leg profile can be constructed
  // until the separation-of-duties build step, so `!finalLeg` is defensive, not reachable.
  if (!resolved.effectSeam || !finalLeg) {
    return refused('unredeemable-state');
  }

  // --- (4) state gate ------------------------------------------------------------------
  if (record.state === 'redeemed') {
    // At-most-once, the replay half — §11.2: "a replayed redemption of an already-redeemed
    // record refuses `already-redeemed`". Checked BEFORE correspondence: at-most-once
    // outranks mismatch reporting.
    return refused('already-redeemed');
  }
  if (record.state !== 'confirmed') {
    // open/refused/expired per §11.2's preamble; `redeeming`/`redemption-failed` have no
    // producer until the token and clock increments — this arm is defensive for them.
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
