// @vidimera/record — kernel/redeem.ts: the operator-only redemption seam, DIRECT shape
// (SPEC §11.2): the single-use coupling of a confirmed final-leg decision to its effect —
// `confirmed → redeemed { via: 'direct', resultDigest? }`. Exported on every profile (SPEC §8:
// "`redeem()` and `seal()` are calls on every profile, with fail-closed domain outcomes in
// every deployment"); on a pure-capture profile the domain outcome is `unredeemable-state`.
//
// The gate ladder, and why. Two rungs sit outside the (1)-(6) numbering proper — one
// pre-ladder, one inserted mid-ladder by the effect-result increment — each documented at
// its own depth, the convention `kernel/finalize.ts`'s header uses for its own two
// pre-ladder throws:
//   (0) intake validate   -> THROWS               — `validateRedeemOptions` below: the
//                            options bag's SHAPE (only `tx`/`result` keys; `result`'s
//                            `{ digest }` shape; `beginRedemption`'s unconditional
//                            rejection of `result`), checked at ARGUMENT depth, before any
//                            chain loads (SPEC §11.2/§12; finalize's own consultation-shape
//                            intake precedent) — a caller bug throws identically regardless
//                            of record state, ahead of every rung below including
//                            chain-compromise
//   (1) chain-verify      -> chain-compromise    — §5: "Every operator-side mutating seam
//                            verifies the chain before acting"; the AL2 enforcement
//                            increment folds the signature layer into this same arm
//   (2) resolve profile   -> unknown-profile     — defensive; fail-closed
//   (3) effect seam?      -> unredeemable-state  — §11.2: "on-iff-effects"
//   (3.5) result admission -> THROWS              — the effect-result increment's admission
//                            gate (`redeem`/`completeRedemption` only; SPEC §9.1/§11.2):
//                            `opts.result` supplied but the resolved profile does not
//                            declare `redeem.result` throws, PROFILE-RESOLUTION depth, so it
//                            sits after (1)/(2)/(3) — chain-compromise, unknown-profile and
//                            the effect-seam/final-leg gate all outrank it, matching
//                            finalize's own policy-presence-contract depth
//   (4) state gate        -> already-redeemed on 'redeemed' (at-most-once, replay half);
//                            unredeemable-state otherwise-not-confirmed
//   (5) correspondence    -> effect-mismatch     — re-digest vs the bound contentDigest;
//                            content-drift instead, appended terminal, on a
//                            reverify-declaring profile (SPEC §9.2, the live-capture
//                            increment: `refuseCorrespondenceMismatch` below)
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
//
// THE LIVE-CAPTURE INCREMENT (SPEC §9.2): a `reverify`-declaring profile's redemption-time
// CONTENT correspondence check maps a mismatch to `content-drift` instead of
// `effect-mismatch` — appended terminal, releasing the (profile, subject) hold, via
// `refuseCorrespondenceMismatch` below, shared by all three seams' CONTENT comparisons.
// The TOKEN comparison at completeRedemption is never routed through it — a wrong token
// is not state drift. Every non-reverify profile's behavior is byte-identical to before
// this increment.

import { bindContent, digest } from '../canonical.js';
import { assertChainFor } from '../chain/binding.js';
import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import { type RedeemOptions, unknownOptionKey } from '../config.js';
import type { KernelContext, ResolvedProfile } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import type { AppendMeta, Store } from '../store/store.js';
import type { DecisionRecord, Digest, Transition } from '../types.js';
import { isWellFormedUtf16 } from '../utf16.js';
import { deadlineIso, pendingWindow, resolveDueClock } from './expiry.js';
import { appendChainCompromise } from './finalize.js';
import { heldProfile } from './held-profile.js';
import { signatureLayerHolds } from './verify-signatures.js';

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
    const chain = await store.readChain(recordId);
    // A foreign chain throws into the fallback below: it can never make this seam say
    // `already-redeemed`.
    assertChainFor(chain, recordId, 'redemption residual re-read');
    const fresh = replay(chain);
    if (fresh.state === 'redeemed') return refused('already-redeemed');
  } catch {
    // fall through — result-first either way
  }
  return refused('unredeemable-state');
}

/**
 * The correspondence-mismatch mapping (SPEC §9.2, the live-capture increment): a
 * reverify-declaring profile treats a CONTENT-digest mismatch as state drift —
 * `content-drift` ("registered as that code's second producer, §8"), appended terminal
 * from the seam's current state, releasing the (profile, subject) hold; the appended edge
 * rides the ORDINARY non-terminal path (a live profile's confirmed awaits redemption — the
 * effect-seam predicate). Every other profile keeps §11.2's `effect-mismatch`,
 * never-append. `terminalRefusals` is finalize's machinery and is NOT consulted here — the
 * redemption-time drift append is unconditional (the OQ §7 decision). ENLISTED (tx
 * supplied), the drift refusal is result-first with NO append: an edge inside the host's
 * transaction would roll back with the aborted effect — the family's settled enlisted
 * discipline (its chain-verify and clock rungs both). The token comparison at
 * completeRedemption is never routed here: a wrong token is not state drift.
 */
async function refuseCorrespondenceMismatch(
  store: Store,
  recordId: string,
  chain: readonly Transition[],
  resolved: ResolvedProfile,
  target: 'confirmed' | 'redeeming',
  finalLeg: boolean,
  now: () => Date,
  tx?: unknown,
): Promise<Outcome<never>> {
  if (resolved.profile.redeem?.reverify !== true) {
    return refused('effect-mismatch');
  }
  if (tx !== undefined) {
    return refused('content-drift');
  }
  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('redeem: empty chain — the caller length checks hold');
  }
  const edge: Transition = {
    recordId,
    seq: chain.length + 1,
    at: now().toISOString(),
    kind: 'refused',
    payload: { code: 'content-drift' },
    prevHash: transitionDigest(last),
  };
  // Terminal by the derivation; dueAt omitted clears the pending clock (SPEC §12).
  const meta: AppendMeta = {
    nonTerminal: nonTerminal('refused', finalLeg, resolved.effectSeam),
  };
  const res = await store.appendTransition(target, edge, meta);
  if (!res.appended) {
    // A racing writer moved the state — the family-wide CAS-residual discipline.
    return residualRefusal(store, recordId);
  }
  return refused('content-drift', res.transitionDigest);
}

/**
 * Due-ness for the enlisted guard in the clock rung, below — the same predicate
 * `resolveDueClock` applies internally (a pending window whose deadline has passed),
 * computed here with NO append, so an enlisted caller can refuse before ever reaching
 * `resolveDueClock`'s own compare-and-swap.
 */
function dueNow(chain: readonly Transition[], resolved: ResolvedProfile, now: Date): boolean {
  const win = pendingWindow(chain, resolved);
  return win.window !== 'none' && win.deadlineMs <= now.getTime();
}

/**
 * The shared prologue of every redemption ladder — rungs (1)-(3) of all three seams
 * (direct redeem, beginRedemption, completeRedemption), byte-identical across them:
 *   load chain      -> THROW on unknown recordId (a caller error, SPEC §8)
 *   (1) chain-verify -> chain-compromise — §5: "Every operator-side mutating seam
 *       verifies the chain before acting". The AL2 enforcement increment folds the
 *       signature layer into this same arm — inherited by the ENLISTED branch, not
 *       re-decided. ENLISTED callers (tx !== undefined — all three redemption seams carry
 *       it, riding `opts.tx` since the effect-result increment) refuse result-first with NO
 *       edge: see the comment in place below. Un-enlisted callers append the edge via
 *       appendChainCompromise.
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
  // AL1 intactness first; the AL2 enforcement increment folds the signature layer into
  // this same arm — inherited by the enlisted branch below, not re-decided: a
  // signature-broken chain refuses `chain-compromise` result-first over an enlisted
  // caller exactly as a hash-broken one does. Both halves are bound to the requested
  // `recordId`, so another record's rows read back under this key refuse here too.
  if (!verifyChain(chain, recordId).intact || !(await signatureLayerHolds(ctx, recordId, chain))) {
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
    return { refusal: await appendChainCompromise(store, recordId, chain, now) };
  }
  const record = replay(chain);
  const resolved = heldProfile(profiles, record);
  if (resolved === undefined) {
    // Fail-closed: not held — unregistered, or registered with a projection that does not
    // digest to the record's binding (the profile-drift gate). A redemption bound read from
    // a drifted profile would be the wrong bound; nothing here runs under it.
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
    // ONE clock read for the whole rung (the review-hardening pass, 2026-09-05): the enlisted
    // guard below and `resolveDueClock` judge the same instant. Read twice, a deadline falling
    // between the reads let an enlisted call pass the guard and then resolve — routing the
    // resolver's no-tx append onto the connection the host holds open, the very throw the
    // guard exists to prevent. Pinned in clocks.test.ts under a straddling clock.
    const instant = now();
    if (tx !== undefined && dueNow(chain, resolved, instant)) {
      // ENLISTED and due: mirrors the enlisted chain-verify branch above. The host
      // already has ITS OWN transaction open on this connection (all three redemption
      // seams carry a `tx`, riding `opts.tx` since the effect-result increment), so
      // `resolveDueClock`'s no-tx `store.appendTransition` would BEGIN a SECOND
      // transaction on that same connection — the embedded backing
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
    const due = await resolveDueClock(store, recordId, chain, resolved, instant);
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

/**
 * SPEC §11.2/§12: the redemption options bag's shape, validated at ARGUMENT depth —
 * before any chain loads — so a caller bug throws identically regardless of record
 * state (finalize's consultation-intake precedent). The `beginRedemption` rejection
 * lives here rather than at profile depth because it is arity, not admission: issuance
 * NEVER accepts a result, declaration notwithstanding.
 */
function validateRedeemOptions(
  seam: 'redeem' | 'beginRedemption' | 'completeRedemption',
  opts: RedeemOptions | undefined,
): void {
  if (opts === undefined) return;
  for (const key of Object.keys(opts)) {
    if (key === 'tx' || key === 'result') continue;
    throw new Error(
      unknownOptionKey(
        key,
        seam === 'beginRedemption'
          ? 'beginRedemption() accepts only tx in this build — a result is refused at ' +
              'issuance and belongs to completeRedemption (SPEC §11.2). Contract: §11.2, §12.'
          : `${seam}() accepts only tx and result in this build. Contract: §11.2, §12.`,
      ),
    );
  }
  if (opts.result === undefined) return;
  if (seam === 'beginRedemption') {
    throw new Error(
      'beginRedemption: opts.result is not admitted at issuance — a result at ' +
        'redeeming-minting time would claim an outcome for an unexecuted effect; supply it ' +
        'at completeRedemption, where the executor knows it (SPEC §11.2)',
    );
  }
  const result = opts.result as unknown;
  if (result === null || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error(`${seam}: opts.result must be a plain { digest } object (SPEC §11.2)`);
  }
  const keys = Object.keys(result);
  if (keys.length !== 1 || keys[0] !== 'digest') {
    throw new Error(
      `${seam}: opts.result carries unknown keys or is missing digest (found: ${keys.join(', ') || 'none'}) — ` +
        'exactly { digest } (SPEC §11.2)',
    );
  }
  const digestValue = (result as { digest: unknown }).digest;
  if (typeof digestValue !== 'string' || digestValue.length === 0) {
    throw new Error(`${seam}: opts.result.digest must be a non-empty string (SPEC §11.2)`);
  }
}

export async function redeem(
  ctx: KernelContext,
  recordId: string,
  content: unknown,
  opts?: RedeemOptions,
): Promise<Outcome<{ recordId: string; state: 'redeemed'; transitionRef: Digest }>> {
  validateRedeemOptions('redeem', opts);
  const { store, now } = ctx;
  const tx = opts?.tx;
  const resultDigest = opts?.result?.digest;
  const pro = await prologue(ctx, 'redeem', recordId, tx);
  if ('refusal' in pro) return pro.refusal;
  const { chain, record, resolved, finalLeg } = pro.gated;

  // SPEC §11.2's admission gate (the effect-result increment): the declaration ADMITS
  // the field. A non-declaring profile supplying one is a caller error at
  // profile-resolution depth — chain-compromise, unknown-profile and the seam gate
  // outrank it, matching finalize's own presence-contract depth.
  if (opts?.result !== undefined && resolved.profile.redeem?.result !== true) {
    throw new Error(
      `redeem: opts.result supplied but profile '${record.profileId}' does not declare ` +
        'redeem.result — declaring it is what admits an outcome digest (SPEC §9.1, §11.2)',
    );
  }

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
  // §11.2: refuse "any mismatch with `effect-mismatch`" — on a non-reverify profile. A
  // reverify-declaring profile (SPEC §9.2, the live-capture increment) maps the mismatch
  // to `content-drift` instead, appended terminal (`refuseCorrespondenceMismatch` below).
  const recomputed = bindContent(
    resolved.canonicalizer,
    resolved.profile.subject.canonicalizerRef,
    content,
    { wellFormed: false },
  );
  if (recomputed !== record.contentDigest) {
    return refuseCorrespondenceMismatch(
      store,
      recordId,
      chain,
      resolved,
      'confirmed',
      finalLeg,
      now,
      tx,
    );
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
    // §4's present-iff-supplied rule (the effect-result increment): an absent
    // resultDigest leaves this payload byte-identical to a pre-increment chain.
    payload: { via: 'direct', ...(resultDigest === undefined ? {} : { resultDigest }) },
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
 * reverse order would hand out a token whose edge never landed, strictly worse). The
 * optional `tx` (register row 16, landed at the phase-4 increment as a trailing
 * positional parameter; riding `opts.tx` since the effect-result increment moved the
 * whole redemption family onto one options bag) is the TWELFTH self-authored inversion —
 * this comment previously argued "NO tx parameter",
 * on the ground that a host rollback could erase the recorded tokenDigest while the
 * live token is out. The inverted reading: an enlisted issuance commits or rolls back
 * with the host's own outbox row, so a rollback erases the edge AND the outbox entry
 * together — the host declining the issuance whole, never a strand (the token returned
 * from a rolled-back issuance corresponds to no persisted digest and can never
 * complete, which is fail-closed, not dangling) — and the crash-strand window between
 * the append and the token's return shrinks to the host's own transaction. §11.2's "no
 * transaction is shared" defines the EXECUTOR relationship, not the issuance's own
 * persistence. NO re-issue: a begin against a `redeeming` record refuses
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
  opts?: RedeemOptions,
): Promise<
  Outcome<{ recordId: string; state: 'redeeming'; token: string; transitionRef: Digest }>
> {
  validateRedeemOptions('beginRedemption', opts);
  const { store, now, tokenSource } = ctx;
  const tx = opts?.tx;
  const pro = await prologue(ctx, 'beginRedemption', recordId, tx);
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
  // Same mapping as the direct shape's rung (5): `content-drift` on a reverify-declaring
  // profile (SPEC §9.2, the live-capture increment), `effect-mismatch` otherwise.
  const recomputed = bindContent(
    resolved.canonicalizer,
    resolved.profile.subject.canonicalizerRef,
    content,
    { wellFormed: false },
  );
  if (recomputed !== record.contentDigest) {
    return refuseCorrespondenceMismatch(
      store,
      recordId,
      chain,
      resolved,
      'confirmed',
      finalLeg,
      now,
      tx,
    );
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
  const res = await store.appendTransition('confirmed', redeemingTransition, meta, tx);
  if (!res.appended) {
    return residualRefusal(store, recordId);
  }
  return ok({ recordId, state: 'redeeming', token, transitionRef: res.transitionDigest });
}

/**
 * completeRedemption — SPEC §11.2's token shape, the PRESENTATION half (second step-3
 * increment): `redeeming → redeemed { via: 'token', tokenDigest, resultDigest? }` on
 * presenting the issued token. At-most-once's replay half is the state gate (`already-redeemed`,
 * checked BEFORE correspondence — outranks mismatch reporting); the correspondence rung
 * checks the token first (digest of the presented token vs the chain-recorded
 * tokenDigest), always refusing `effect-mismatch` on a miss — a wrong token is never
 * state drift, whatever the profile declares. THEN the content: through the second
 * step-3 increment both comparisons shared one code by §11.2's own sentence, so the
 * internal order was unobservable; the live-capture increment (SPEC §9.2) splits them —
 * a reverify-declaring profile's content mismatch now maps to `content-drift` instead
 * (`refuseCorrespondenceMismatch`, appended terminal from `redeeming`), while every
 * other profile keeps `effect-mismatch`, byte-identical to before this increment. The
 * executor's own deduplication, keyed on the token, remains the separated host's MUST
 * (§11.2's Honest bound) — this seam is defense-in-depth beside it, never a substitute.
 * The optional `tx` (register row 16; riding `opts.tx` since the effect-result increment
 * moved the whole redemption family onto one options bag) inverts this comment's earlier
 * "NO tx, deliberately" — the same TWELFTH-inversion argument as beginRedemption's doc
 * comment: an enlisted completion commits or rolls back with the host's own effect row,
 * which is §11.2's co-located coupling wearing the token shape.
 */
export async function completeRedemption(
  ctx: KernelContext,
  recordId: string,
  token: string,
  content: unknown,
  opts?: RedeemOptions,
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
  validateRedeemOptions('completeRedemption', opts);
  const { store, now } = ctx;
  const tx = opts?.tx;
  const resultDigest = opts?.result?.digest;
  const pro = await prologue(ctx, 'completeRedemption', recordId, tx);
  if ('refusal' in pro) return pro.refusal;
  const { chain, record, resolved, finalLeg } = pro.gated;

  // SPEC §11.2's admission gate (the effect-result increment): the declaration ADMITS
  // the field. A non-declaring profile supplying one is a caller error at
  // profile-resolution depth — chain-compromise, unknown-profile and the seam gate
  // outrank it, matching finalize's own presence-contract depth.
  if (opts?.result !== undefined && resolved.profile.redeem?.result !== true) {
    throw new Error(
      `completeRedemption: opts.result supplied but profile '${record.profileId}' does not declare ` +
        'redeem.result — declaring it is what admits an outcome digest (SPEC §9.1, §11.2)',
    );
  }

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
  // A presented token that is not well-formed UTF-16 can never be the minted one (base64url),
  // and `digest` refuses such a string, so it is a mismatch here rather than a throw.
  if (!isWellFormedUtf16(token) || digest(token) !== persisted) {
    return refused('effect-mismatch');
  }
  const recomputed = bindContent(
    resolved.canonicalizer,
    resolved.profile.subject.canonicalizerRef,
    content,
    { wellFormed: false },
  );
  if (recomputed !== record.contentDigest) {
    return refuseCorrespondenceMismatch(
      store,
      recordId,
      chain,
      resolved,
      'redeeming',
      finalLeg,
      now,
      tx,
    );
  }

  // --- (6) append `redeeming → redeemed { via: 'token', tokenDigest, resultDigest? }` ---
  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('completeRedemption: empty chain — the prologue length check holds');
  }
  const redeemedTransition: Transition = {
    recordId,
    seq: chain.length + 1,
    at: now().toISOString(),
    kind: 'redeemed',
    // §4's present-iff-supplied rule (the effect-result increment): an absent
    // resultDigest leaves this payload byte-identical to a pre-increment chain.
    payload: {
      via: 'token',
      tokenDigest: persisted,
      ...(resultDigest === undefined ? {} : { resultDigest }),
    },
    prevHash: transitionDigest(last),
  };
  // Terminal by the derivation — THE RELEASE via the token path; dueAt omitted here IS
  // the clearing (§12's omission rule): beginRedemption wrote a real dueAt for this
  // window whenever redeemBound was declared, and this append's own omission clears it,
  // exactly as expected of a terminal record with no successor window pending.
  const meta: AppendMeta = {
    nonTerminal: nonTerminal('redeemed', finalLeg, resolved.effectSeam),
  };
  const res = await store.appendTransition('redeeming', redeemedTransition, meta, tx);
  if (!res.appended) {
    return residualRefusal(store, recordId);
  }
  return ok({ recordId, state: 'redeemed', transitionRef: res.transitionDigest });
}
