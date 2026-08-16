// @vidimera/record — kernel/finalize.ts: the operator-only `open → confirmed` seam
// (SPEC §9 "The finalize gate ladder"). THE check order is fixed
// and every refusal path wins over the ones after it:
//
//   load chain → (1) pre-seam chain-verify → (2) state/expiry gate → (3) identity (both
//   branches) → (3.5) separation of duties → (4) content-drift → (5) facts → (5.7) ack
//   coverage [reserved] → (6) success append batch.
//
// This build implements rungs (1)/(2)/(3)/(3.5)/(4)/(5)/(6) of the SPEC's full ladder; the
// SPEC's (4.5) policy-drift and (5.5) consultations/eligibility rungs are not built in this
// build (their profile fields throw GOVERNED at construction, so no profile that would need
// them can exist).
//
// (1) Chain-verify is FIRST after load. A DETECTED BREAK → refuse `chain-compromise` (class
//     compromise, TERMINAL) and append ONE `refused` edge at head via NORMAL C2 (seq=max+1,
//     prevHash=chainHead) — `open→refused` unconfirmed, or `confirmed→refused` via the Store
//     C3 compromise carve-out. NO chain-verify consultation is appended on failure (the
//     fact folds into the single `refused` edge); the payload is `{code}`-only (AL1-honest —
//     `verifyChain` still reports only the original tamper). Because chain-verify precedes the
//     state gate, a tampered non-open record refuses `chain-compromise`, not `record-not-open`.
// (2) State/expiry gate (intact chain, before any append): a due-open record → en-passant
//     `resolveDueClock` CAS-append `expired` → `leg-expired`; already-`expired` → `leg-expired`;
//     `state !== 'open'` (confirmed/refused) → `record-not-open` (no append, no transitionRef).
// (3) Identity — both branches → `identity-authority-refused`: the arg missing/malformed (the
//     library reads identity ONLY from the explicit arg — a payload-carried id is never
//     trusted), or `identity.authority` not in the leg's `allowedAuthorities`.
// (3.5) Separation of duties (SPEC §10.1; second step-4 increment) — `leg.sod.notActorOf`: the
//     finalizing principal must not be the recorded actor of any named PRIOR leg, looked up in
//     the record's own recorded `priorRecordRefs`/`priorLegActors`; `leg.proposer`: the
//     finalizing principal must not equal the declared proposer. Either match → `sod-violation`
//     (refusal-class, `terminalRefusals`-able, default open per §10.1).
// (4) Content-drift — re-canonicalize the `content` arg through the profile's adopter
//     canonicalizer + library JCS; mismatch vs the bound `contentDigest` → `content-drift`.
// (5) Facts — missing/malformed `facts` (no figures / no checker) → `consultation-missing`.
// (5.7) Ack coverage — RESERVED. No producer at this build step; arrives with findings and
//       acknowledgments (SPEC §10.2).
// (6) Success batch — ONE atomic, variable-arity `appendBatch` call carrying SPEC §9's shape,
//     `[chain-verify, facts, …obtained consultations, confirmed]` (the first step-5
//     increment's attach form — the host's supplied consultations, order preserved, land
//     between facts and confirmed), under a single entry compare-and-swap (SPEC §12): a
//     conflict applies NOTHING, so the partial-tail case this build once had to map is
//     unreachable now rather than handled. The only shape reachable at this batch's entry CAS
//     is `state-mismatch` — the record is not `open` — so it refuses `record-not-open`, which
//     is true of the state AND honours its never-appends registry entry, both for the first
//     time at this seam (`batchConflict`'s doc comment works the `seq` shape's
//     unreachability). A `seq` conflict is a STORAGE FAULT: under this build's single-writer /
//     no-concurrent-finalize-per-record bound and a Store honouring SPEC §12's
//     compare-and-swap contract, it cannot occur, so it THROWS naming the shape and index,
//     with nothing recorded — the throw sits inside DECISIONS.md #10's "nothing was recorded"
//     exception rather than beside it.
//
// (3)/(3.5)/(4)/(5) are refusal-class: each appends `open→refused` (terminal) IFF the leg's
// `terminalRefusals` lists it (the `appendsOn` rule), else no append and the record stays open.

import { canonicalize, digest } from '../canonical.js';
import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import { type FinalizeOptions, governedUnavailable, type LegSpec } from '../config.js';
import type { KernelContext, ResolvedProfile } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import { appendsOn, type RefusalCode } from '../refusal-codes.js';
import type { AppendMeta, Store } from '../store/store.js';
import type { Consultation, Digest, IdentityAssertion, RecordState, Transition } from '../types.js';
import { validateConsultations } from './consultations.js';
import { deadlineIso, resolveDueClock } from './expiry.js';

/** The finalize `facts` arg (SPEC §3's "Reviewed-surface (`facts`) binding"): the reviewed-surface figures + the review-surface checker. */
type Facts = { figures: unknown; checker: IdentityAssertion };

/**
 * The well-known SYSTEM_CHECKER (SPEC §5 "Mandatory pre-seam chain-verify"): the identity the
 * mandatory pre-seam chain-verify records as the consultation's `checker`. It is NOT a
 * transport-established caller identity — it is the LIBRARY itself attesting a clean replay,
 * so its `authority` is an internal library authority (`system:vidimera-record`), never one of
 * the transport authorities (`oidc:`/`session:`/`mtls:`/`dev-stub`) a leg's `allowedAuthorities`
 * would list. Exported so audit/tooling can recognize a system-emitted consultation — but
 * recognition is by the RESERVED KIND (`facts`/`chain-verify`) alone, never by this constant's
 * shape: with the attach form live (the first step-5 increment), a host-supplied consultation's
 * own `checker` is host-attestable (`kernel/consultations.ts` validates its shape, not its
 * truth), so only the reserved kinds are unforgeable — `SYSTEM_CHECKER` itself proves nothing
 * about a consultation that merely happens to carry a similar-looking checker.
 */
export const SYSTEM_CHECKER: IdentityAssertion = {
  principal: 'system:chain-verify',
  authority: 'system:vidimera-record',
};

/** Per-key message for a finalize() options key this build does not accept. */
function finalizeOptionMessage(key: string): string {
  if (key === 'policy') {
    return governedUnavailable(
      key,
      'the policy-drift gate is not implemented in this build; finalize() accepts no policy input. Contract: §10.3.',
    );
  }
  return governedUnavailable(
    key,
    'finalize() accepts only consultations in this build. Contract: §9 and §11.1.',
  );
}

export async function finalize(
  ctx: KernelContext,
  recordId: string,
  identity: IdentityAssertion,
  content: unknown,
  facts: Facts,
  opts?: FinalizeOptions,
): Promise<Outcome<{ recordId: string; state: 'confirmed'; transitionRef: Digest }>> {
  const { store, profiles, now } = ctx;

  // --- intake (SPEC §9: consultation shape "throws at argument intake, before anything
  // is loaded") — BEFORE the chain load below, so a caller bug throws identically
  // regardless of record state. ------------------------------------------------------
  if (opts !== undefined) {
    for (const key of Object.keys(opts)) {
      if (key === 'consultations') continue; // REAL as of the first step-5 increment
      throw new Error(finalizeOptionMessage(key));
    }
  }
  const supplied = validateConsultations(opts?.consultations);

  // --- load the chain ------------------------------------------------------------------
  const chain = await store.readChain(recordId);
  if (chain.length === 0) {
    // No such record. No fitting RefusalCode (the union is contract-fixed; the record
    // must have been opened first) — THROWS, mirroring open()'s missing-stagedRef and
    // replay()/verifyChain()'s empty-chain posture (SPEC §8: "any operator call on a
    // non-existent recordId... throw rather than refuse").
    throw new Error(
      `finalize: unknown recordId '${recordId}' — no such record (open() first); ` +
        'a recordId that resolves to no chain is a caller error, not a domain refusal',
    );
  }

  // --- (1) pre-seam chain-verify (FIRST after load) ------------------------------------
  const report = verifyChain(chain);
  if (!report.intact) {
    return appendChainCompromise(store, chain, now);
  }

  // The chain is intact — fold it and resolve its profile.
  const record = replay(chain);
  const resolved = profiles.get(record.profileId);
  if (resolved === undefined) {
    // Fail-closed: the record's profile is not configured in THIS instance (a config/caller
    // error — a coherent instance always resolves a record it opened). No append, matching
    // stage()/open()'s `unknown-profile` posture. Not exercised by this build's tests
    // (open() is the runtime producer); defensive.
    return refused('unknown-profile');
  }
  const legIndex = resolved.profile.legs.findIndex((l) => l.id === record.legId);
  const leg = resolved.profile.legs[legIndex];
  if (leg === undefined) {
    throw new Error(
      `finalize: persisted legId '${record.legId}' is absent from profile '${record.profileId}'`,
    );
  }
  const finalLeg = isFinalLeg(legIndex, resolved.profile.legs.length);

  // --- (2) state/expiry gate (intact chain, before any append) -------------------------
  if (record.state === 'expired') {
    // Already expired — `leg-expired`, no append (the `expired` edge already landed earlier;
    // the leg-expired refusal itself appends no separate `refused` edge → no transitionRef).
    return refused('leg-expired');
  }
  if (record.state === 'confirmed' || record.state === 'redeeming') {
    // The clock rung (third step-3 increment; §4's lazy rule at this seam too): an
    // elapsed confirmed window resolves to `expired` → `leg-expired` (§8's "expired or
    // due-expired record"); an elapsed redeeming window resolves to `redemption-failed`
    // → `record-not-open` (a non-open, non-expired record). Not due, or the CAS lost to
    // a racing writer: the plain state verdict below — the record is not open either way.
    const due = await resolveDueClock(store, chain, resolved, now());
    if (due.due && due.result.appended) {
      return refused(due.window === 'confirmed' ? 'leg-expired' : 'record-not-open');
    }
    // Lost the CAS to a racing writer: this refuses `record-not-open` even when the
    // winner resolved a `confirmed` window to `expired` (re-invocation would say
    // `leg-expired` there instead) — a deliberate divergence from the redemption
    // family's loser-agrees-with-reinvocation discipline, tolerated because it is
    // unreachable under this build's stated single-writer bound; the plain state
    // verdict returned here is still true of the record regardless of which window raced.
    return refused('record-not-open');
  }
  if (record.state !== 'open') {
    // A DECIDED, non-clocked record — `record-not-open` (SPEC §8's never-appends set): no
    // append, no transitionRef. `confirmed`/`redeeming` are peeled off by the clock-rung arm
    // above (third step-3 increment) — including double-finalize on a capture-terminal
    // confirmed record and finalize on an effect-seam confirmed record awaiting redemption,
    // both of which now report `record-not-open` from THAT arm's own not-due fallthrough, not
    // this one. What remains here is finalize on a `refused`, `redeemed`, or
    // `redemption-failed` record.
    return refused('record-not-open');
  }
  // state === 'open': en-passant expiry (resolveDueClock performs the CAS append if due).
  const ex = await resolveDueClock(store, chain, resolved, now());
  if (ex.due) {
    // Due — the `expired` transition was appended (the en-passant expiry edge; if the CAS
    // raced, the record is past its deadline regardless). `leg-expired` carries no
    // transitionRef — the expired edge is an expiry transition, not a `refused` edge.
    return refused('leg-expired');
  }

  // --- (3) identity — both branches → identity-authority-refused -----------------------
  if (!isValidIdentity(identity) || !leg.allowedAuthorities.includes(identity.authority)) {
    return refuseMaybeAppend(
      store,
      'identity-authority-refused',
      leg,
      chain,
      resolved,
      finalLeg,
      now,
    );
  }

  // --- (3.5) separation of duties (SPEC §10.1; second step-4 increment) ----------------
  if (leg.sod !== undefined) {
    for (const namedLegId of leg.sod.notActorOf) {
      const refIndex = (record.priorRecordRefs ?? []).findIndex((ref) => ref.legId === namedLegId);
      if (refIndex === -1) {
        // Lookup miss — the record's own evidence carries no entry for the named leg
        // (profile reconfigured between open() and finalize(); construction validates
        // the static case). Fail-closed: distinctness cannot be demonstrated from the
        // record's own chain, so refuse rather than skip — SPEC §10.1: the lookup keys
        // the record's evidence precisely so a profile edit "cannot silently re-index
        // an already-opened record's evidence".
        return refuseMaybeAppend(store, 'sod-violation', leg, chain, resolved, finalLeg, now);
      }
      const priorActor = record.priorLegActors?.[refIndex];
      if (priorActor === undefined) {
        // A found reference with no paired actor breaks the recorded paired-by-index
        // invariant (SPEC §4) — a garbled or foreign chain is a storage/config fault,
        // not a domain outcome (SPEC §8's loud-throw posture). The boundary, stated so
        // nobody reads this throw as the universal garbled-evidence posture: a
        // `priorLegActors` list that is merely SHORTER than `priorRecordRefs` — so a
        // matched ref at this index has no paired entry — throws here (the paired-by-index
        // invariant broke), whereas refs with actors ABSENT ENTIRELY never reach this line
        // at all — replay's both-or-neither rule (`chain/replay.ts`) folds neither field
        // when only one is present, so the lookup miss above (`refIndex === -1`) catches
        // that case first and refuses `sod-violation` instead; both directions fail
        // closed, just through different gates.
        throw new Error(
          `finalize: record '${recordId}' carries a prior-leg reference for '${namedLegId}' with no paired actor — a garbled or foreign chain is a storage/config fault (SPEC §8)`,
        );
      }
      if (priorActor.principal === identity.principal) {
        return refuseMaybeAppend(store, 'sod-violation', leg, chain, resolved, finalLeg, now);
      }
    }
  }
  if (leg.proposer !== undefined && leg.proposer === identity.principal) {
    // "the designated proposer may not decide their own leg" (SPEC §10.1).
    return refuseMaybeAppend(store, 'sod-violation', leg, chain, resolved, finalLeg, now);
  }

  // --- (4) content-drift ----------------------------------------------------------------
  const recomputed = digest(canonicalize(resolved.canonicalizer(content)));
  if (recomputed !== record.contentDigest) {
    return refuseMaybeAppend(store, 'content-drift', leg, chain, resolved, finalLeg, now);
  }

  // --- (5) facts ------------------------------------------------------------------------
  // isValidFacts guards CANONICALIZABILITY too: a present-but-non-canonicalizable figures
  // payload (BigInt/circular) is refused here rather than throwing mid-batch at the digest
  // step below; on ok, the carried `canonical` feeds the facts digest (no double-canonicalize).
  const factsCheck = isValidFacts(facts);
  if (!factsCheck.ok) {
    return refuseMaybeAppend(store, 'consultation-missing', leg, chain, resolved, finalLeg, now);
  }

  // --- (6) success batch: [chain-verify, facts, …obtained consultations, confirmed] ----
  const nowIso = now().toISOString();
  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('finalize: empty chain — callers hold a loaded chain');
  }
  const headDigest = transitionDigest(last); // the verified head

  const chainVerifyConsultation: Consultation = {
    kind: 'chain-verify',
    checker: SYSTEM_CHECKER,
    at: nowIso,
    payloadDigest: headDigest,
    verdict: 'pass',
  };
  // Facts figures go through LIBRARY JCS ONLY (never the adopter content-canonicalizer —
  // this build's reading of SPEC §3's ownership split, which scopes the adopter
  // canonicalizer to domain content and does not name the figures path)
  // — figures are the reviewed-surface rendering artifact, not the bound content. The canonical
  // bytes were already computed (and proven canonicalizable) by isValidFacts at gate (5); reuse
  // them directly — the SAME `canonicalize(facts.figures)` result, digested once.
  const factsConsultation: Consultation = {
    kind: 'facts',
    checker: facts.checker,
    at: nowIso,
    payloadDigest: digest(factsCheck.canonical),
    verdict: 'pass',
  };

  // The batch is built whole before it is sent: each element's `prevHash` is the previous
  // element's digest, so the caller necessarily computes the chain and the store verifies
  // the sequencing rather than assigning it (SPEC §12).
  const seqBase = chain.length;
  const cvTransition: Transition = {
    recordId,
    seq: seqBase + 1,
    at: nowIso,
    kind: 'consultation-recorded',
    payload: chainVerifyConsultation,
    prevHash: headDigest,
  };
  const factsTransition: Transition = {
    recordId,
    seq: seqBase + 2,
    at: nowIso,
    kind: 'consultation-recorded',
    payload: factsConsultation,
    prevHash: transitionDigest(cvTransition),
  };
  // The host's obtained consultations (SPEC §11.1's attach form), supplied order
  // preserved, chained after facts and before confirmed. `supplied.unreachable` markers
  // are validated above but go UNUSED here — SPEC §11.1: "an unreachable marker for a
  // non-required kind is inert", and no kind can be required while `requiredConsultations`
  // stays GOVERNED (config.ts); the second step-5 increment's gate is the consumer.
  const suppliedTransitions: Transition[] = [];
  let suppliedPrevHash = transitionDigest(factsTransition);
  for (const [i, entry] of supplied.obtained.entries()) {
    const consultation: Consultation = {
      kind: entry.kind,
      checker: entry.checker,
      at: nowIso,
      payloadDigest: entry.payloadDigest,
      verdict: entry.verdict,
      ...(entry.proofRef !== undefined ? { proofRef: entry.proofRef } : {}),
    };
    const t: Transition = {
      recordId,
      seq: seqBase + 3 + i,
      at: nowIso,
      kind: 'consultation-recorded',
      payload: consultation,
      prevHash: suppliedPrevHash,
    };
    suppliedTransitions.push(t);
    suppliedPrevHash = transitionDigest(t);
  }
  // capture-only ⇒ terminal; effect-seam ⇒ non-terminal (awaits redemption). When nothing
  // is supplied, `suppliedPrevHash` is facts' digest and this seq is seqBase + 3 — today's
  // shape exactly, so the no-consultations batch stays byte-identical.
  const confirmedTransition: Transition = {
    recordId,
    seq: seqBase + 3 + suppliedTransitions.length,
    at: nowIso,
    kind: 'confirmed',
    payload: { actor: identity },
    prevHash: suppliedPrevHash,
  };

  // `meta` is the POST-batch record flag, applied once. The entry terminality flag is the
  // store's own, read at entry — which is what admits the `confirmed` element that makes the
  // record terminal (SPEC §12).
  const confirmToRedeem = resolved.profile.redeem?.confirmToRedeem;
  const confirmedDue =
    resolved.effectSeam && finalLeg && confirmToRedeem !== undefined
      ? deadlineIso(nowIso, confirmToRedeem)
      : undefined;
  const postBatch: AppendMeta = {
    nonTerminal: nonTerminal('confirmed', finalLeg, resolved.effectSeam),
    // §12: presence sets the pending-clock column — the confirmed-awaiting-redemption
    // window (§9.1's confirmToRedeem), stamped from the batch's own single clock reading
    // (§2.1) at the third step-3 increment. Capture-only or undeclared: omitted, clearing
    // the open window's column as before.
    ...(confirmedDue === undefined ? {} : { dueAt: confirmedDue }),
  };
  const res = await store.appendBatch(
    'open',
    [cvTransition, factsTransition, ...suppliedTransitions, confirmedTransition],
    postBatch,
  );
  if (!res.appended) {
    if (res.conflict === 'seq') {
      throw batchConflict(res.conflict, res.index);
    }
    // `state-mismatch`. The batch applied nothing, so `record-not-open` is true of the
    // record AND honours its never-appends entry — both, for the first time at this seam.
    // Element-level `state-mismatch` is unreachable for THIS batch: the entry flag is
    // non-terminal (the record is open), so C3's terminal arm cannot fire while it applies.
    return refused('record-not-open');
  }
  const confirmedDigest = res.transitionDigests.at(-1);
  if (confirmedDigest === undefined) {
    throw new Error(
      'finalize: appendBatch reported success with no digests — a conforming Store returns ' +
        'one digest per element',
    );
  }
  return ok({ recordId, state: 'confirmed', transitionRef: confirmedDigest });
}

// --- helpers ---------------------------------------------------------------------------

/**
 * The batch-conflict fault — rung (6)'s single append.
 *
 * THE GROUND, and it is one sentence: under this build's single-writer /
 * no-concurrent-finalize-per-record bound, with a Store honouring SPEC §12's compare-and-swap
 * contract, no conflict is reachable at this append, so arriving here means the storage layer
 * broke a contract. DECISIONS.md #11 makes a storage fault a loud throw, and because the
 * batch is all-or-nothing this one sits squarely inside the scope DECISIONS.md #10 gives that
 * exception — "storage faults where nothing was recorded" — rather than beside it.
 *
 * Only the `seq` shape reaches here. A `state-mismatch` means the record is not open, which
 * `record-not-open` describes truthfully now that nothing was appended, so it is returned
 * result-first at the call site.
 */
function batchConflict(conflict: 'seq', index: number): Error {
  return new Error(
    `finalize: batch append conflict ('${conflict}') at element ${index}. Under this ` +
      "build's single-writer / no-concurrent-finalize-per-record bound, with a Store " +
      'honouring the compare-and-swap contract, no conflict is reachable here — so this is ' +
      'a storage fault. The batch is all-or-nothing: nothing was appended and the record is ' +
      'unchanged.',
  );
}

/**
 * The chain-compromise failure path (SPEC §5, AL1-honest). Appends ONE `refused`
 * edge at head via NORMAL C2 (`seq=max+1`, `prevHash=chainHead`, payload `{code}`-only), then
 * refuses `chain-compromise` WITH the appended edge's digest — compromise carries a
 * transitionRef wherever the Store's C3 carve-out admits an edge (`open→refused`;
 * `confirmed→refused`; `redeeming→refused`). On an already-terminal `expired`/`refused`
 * record NO CAS candidate is admitted (the C3-forced corner), no edge is appended, and the
 * refusal surfaces result-first with NO transitionRef — see the fallback below / SPEC §5.
 *
 * The CAS target state is the REPLAYED current state of the (tampered) chain — `open→refused`
 * for an unconfirmed record; `confirmed→refused` rides the Store's C3 compromise carve-out for
 * an already-confirmed record. `replay()` folds state from KINDS, so a payload tamper of a
 * non-last transition (the tests' fixtures) leaves the kinds intact and replay yields the true
 * state. If replay itself THROWS on a tampered chain (a corrupted field it reads / a non-genesis
 * first kind — not producible by the tests' payload tampers), we cannot pick a CAS target from
 * it: fall back to trying `'open'` then `'confirmed'`, and — since the second step-3
 * increment — `'redeeming'`, the fallback's third producible target (deferral-register row
 * 10). A genesis-KIND-tampered `redeeming` chain forces exactly this fallback (`replay`
 * throws before it can even fold a state) and now lands `redeeming→refused` WITH a
 * transitionRef via the `'redeeming'` candidate; before the second step-3 increment named
 * that target, the same corner exhausted `'open'`/`'confirmed'` without a match and surfaced
 * result-first with NO transitionRef instead. Either way the append target is chosen from an ORDERED candidate
 * list and the FIRST target whose CAS succeeds wins (a failed CAS appends nothing, so
 * retrying against another target is safe).
 *
 * EXPORTED: `kernel/seal.ts`'s `seal()` is a second caller — chain-verify is its rung (1) too
 * (SPEC §5: "Verification is first"), and it reuses this same append rather than a copy. That
 * second caller adds a THIRD shape to the C3-forced corner named two paragraphs above (a
 * tampered chain over an already-terminal `expired`/`refused` record) — an already-SEALED
 * record, which C4 bars unconditionally, so neither `open` nor `confirmed` is admitted either.
 *
 * ENLISTED CALLERS MUST NOT ROUTE THROUGH THIS FUNCTION while their own transaction is open:
 * the no-tx fallback above BEGINs its OWN transaction on the same connection, which a
 * caller-open transaction turns into a throw rather than a refusal — `kernel/redeem.ts`'s
 * enlisted rung (1) refuses `chain-compromise` result-first itself instead, precisely so it
 * never reaches this function with `tx !== undefined`.
 *
 * `kernel/redeem.ts`'s `redeem()` is a further (un-enlisted) caller of this same append, for
 * the same chain-verify-first reason, and it adds a FOURTH shape to the no-edge corner named
 * two paragraphs above: a tampered chain over an already-`redeemed` terminal record — the
 * replayed state's own CAS candidate (`redeemed`) passes the entry state check but C3's
 * monotonicity then rejects the state-leaving `refused` (no carve-out for `redeemed`), so this
 * shape too surfaces result-first with no transitionRef.
 *
 * `kernel/redeem.ts`'s `beginRedemption` and `completeRedemption` (the second step-3
 * increment, alongside each other) are FURTHER un-enlisted callers of this same append,
 * through the SAME shared `prologue()` chain-verify-first rung the direct shape uses — no
 * copy of this function, and no new shape beyond the `redeeming` candidate named above.
 */
export async function appendChainCompromise(
  store: Store,
  chain: readonly Transition[],
  now: () => Date,
): Promise<Outcome<never>> {
  let candidates: RecordState[];
  try {
    candidates = dedupe([replay(chain).state, 'open', 'confirmed', 'redeeming']);
  } catch {
    // A tampered chain replay cannot fold a state — fall back to the three producible targets.
    candidates = ['open', 'confirmed', 'redeeming'];
  }

  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('appendChainCompromise: empty chain — callers hold a loaded chain');
  }
  const refusedTransition: Transition = {
    recordId: last.recordId,
    seq: chain.length + 1,
    at: now().toISOString(),
    kind: 'refused',
    payload: { code: 'chain-compromise' },
    prevHash: transitionDigest(last), // the (tampered) head's digest — AL1-honest
  };
  // A `refused` record is terminal under every leg/effect-seam combination.
  const refusedNonTerminal = nonTerminal('refused', false, false); // false

  for (const target of candidates) {
    const res = await store.appendTransition(target, refusedTransition, {
      nonTerminal: refusedNonTerminal,
    });
    if (res.appended) {
      return refused('chain-compromise', res.transitionDigest);
    }
  }
  // No candidate CAS target admitted the edge (not reachable for the tested tampers, which
  // always replay to `open`/`confirmed`). Last-resort: refuse without a transitionRef rather
  // than throw — the compromise is still surfaced: SPEC §5 admits no edge against an already-
  // terminal record and surfaces the compromise result-first with no transition reference.
  return refused('chain-compromise');
}

/**
 * A refusal-class refusal that appends `open→refused` (terminal, payload `{code}`-only) IFF the
 * leg's `terminalRefusals` lists `code` (the `appendsOn` rule), else no append (the record stays
 * open). On an append: refuse WITH the appended edge's digest. On a failed append CAS (a race
 * out of `open` — not producible under this build's single-writer bound): refuse without a
 * transitionRef (best-effort; nothing was recorded).
 */
async function refuseMaybeAppend(
  store: Store,
  code: RefusalCode,
  leg: LegSpec,
  chain: readonly Transition[],
  resolved: ResolvedProfile,
  finalLeg: boolean,
  now: () => Date,
): Promise<Outcome<never>> {
  if (!appendsOn(code, leg)) {
    return refused(code); // no append — the record stays open
  }
  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('refuseMaybeAppend: empty chain — callers hold a loaded chain');
  }
  const refusedTransition: Transition = {
    recordId: last.recordId,
    seq: chain.length + 1,
    at: now().toISOString(),
    kind: 'refused',
    payload: { code },
    prevHash: transitionDigest(last),
  };
  const refusedNonTerminal = nonTerminal('refused', finalLeg, resolved.effectSeam); // false
  const res = await store.appendTransition('open', refusedTransition, {
    nonTerminal: refusedNonTerminal,
  });
  return res.appended ? refused(code, res.transitionDigest) : refused(code);
}

/**
 * A finalize identity is valid iff it is an object carrying a non-empty `principal` AND a
 * non-empty `authority` string. The arg is typed `IdentityAssertion`, but the library must
 * fail closed against a malformed/absent arg supplied at runtime (a payload-carried or empty
 * id) — hence the defensive runtime shape check.
 */
export function isValidIdentity(identity: IdentityAssertion): boolean {
  const i = identity as unknown as { principal?: unknown; authority?: unknown } | null | undefined;
  return (
    i != null &&
    typeof i === 'object' &&
    typeof i.principal === 'string' &&
    i.principal.length > 0 &&
    typeof i.authority === 'string' &&
    i.authority.length > 0
  );
}

/**
 * Facts are present AND USABLE iff `figures` is supplied (not `undefined`), `checker` is a valid
 * identity, AND `figures` is library-JCS-canonicalizable. The gate's return WIDENS from a bare
 * boolean to `{ ok: true; canonical: Uint8Array } | { ok: false }`: a present-but-non-
 * canonicalizable figures payload (a BigInt, a circular reference — `canonicalize` THROWS on
 * both) is NOT a valid facts payload, so the try/catch refuses it here (→ `consultation-missing`
 * at the call site) rather than letting the throw escape mid-batch at the facts-digest step. On
 * ok the carried `canonical` bytes are digested directly at the call site, so
 * `canonicalize(figures)` runs exactly once.
 */
function isValidFacts(facts: Facts): { ok: true; canonical: Uint8Array } | { ok: false } {
  const f = facts as unknown as { figures?: unknown; checker?: unknown } | null | undefined;
  if (f == null || typeof f !== 'object') return { ok: false };
  if (f.figures === undefined) return { ok: false };
  if (!isValidIdentity(f.checker as IdentityAssertion)) return { ok: false };
  let canonical: Uint8Array;
  try {
    canonical = canonicalize(f.figures);
  } catch {
    // Non-canonicalizable figures (BigInt/circular) — a present-but-unusable facts payload.
    return { ok: false };
  }
  return { ok: true, canonical };
}

function dedupe<T>(values: T[]): T[] {
  return [...new Set(values)];
}
