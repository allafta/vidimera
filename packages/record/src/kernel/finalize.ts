// @vidimera/record — kernel/finalize.ts: the operator-only `open → confirmed` seam
// (SPEC §9 "The finalize gate ladder"). THE check order is fixed
// and every refusal path wins over the ones after it:
//
//   load chain → (1) pre-seam chain-verify → (2) state/expiry gate → (3) identity (both
//   branches) → (4) content-drift → (5) facts → (5.7) ack coverage [reserved] → (6) success
//   append batch.
//
// This build implements rungs (1)/(2)/(3)/(4)/(5)/(6) of the SPEC's full ladder; the
// SPEC's (3.5) separation-of-duties, (4.5) policy-drift, and (5.5) consultations/eligibility
// rungs are not built in this build (their profile fields throw GOVERNED at construction,
// so no profile that would need them can exist).
//
// (1) Chain-verify is FIRST after load. A DETECTED BREAK → refuse `chain-compromise` (class
//     compromise, TERMINAL) and append ONE `refused` edge at head via NORMAL C2 (seq=max+1,
//     prevHash=chainHead) — `open→refused` unconfirmed, or `confirmed→refused` via the Store
//     C3 compromise carve-out. NO chain-verify consultation is appended on failure (the
//     fact folds into the single `refused` edge); the payload is `{code}`-only (AL1-honest —
//     `verifyChain` still reports only the original tamper). Because chain-verify precedes the
//     state gate, a tampered non-open record refuses `chain-compromise`, not `record-not-open`.
// (2) State/expiry gate (intact chain, before any append): a due-open record → en-passant
//     `expireIfDue` CAS-append `expired` → `leg-expired`; already-`expired` → `leg-expired`;
//     `state !== 'open'` (confirmed/refused) → `record-not-open` (no append, no transitionRef).
// (3) Identity — both branches → `identity-authority-refused`: the arg missing/malformed (the
//     library reads identity ONLY from the explicit arg — a payload-carried id is never
//     trusted), or `identity.authority` not in the leg's `allowedAuthorities`.
// (4) Content-drift — re-canonicalize the `content` arg through the profile's adopter
//     canonicalizer + library JCS; mismatch vs the bound `contentDigest` → `content-drift`.
// (5) Facts — missing/malformed `facts` (no figures / no checker) → `consultation-missing`.
// (5.7) Ack coverage — RESERVED. No producer at this build step; arrives with findings and
//       acknowledgments (SPEC §10.2).
// (6) Success batch — ONE atomic `appendBatch` call carrying [chain-verify consultation,
//     facts consultation, confirmed] under a single entry compare-and-swap (SPEC §12): a
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
// (3)/(4)/(5) are refusal-class: each appends `open→refused` (terminal) IFF the leg's
// `terminalRefusals` lists it (the `appendsOn` rule), else no append and the record stays open.

import { canonicalize, digest } from '../canonical.js';
import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import type { LegSpec } from '../config.js';
import type { KernelContext, ResolvedProfile } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import { appendsOn, type RefusalCode } from '../refusal-codes.js';
import type { AppendMeta, Store } from '../store/store.js';
import type { Consultation, Digest, IdentityAssertion, RecordState, Transition } from '../types.js';
import { expireIfDue } from './expiry.js';

/** The finalize `facts` arg (SPEC §3's "Reviewed-surface (`facts`) binding"): the reviewed-surface figures + the review-surface checker. */
type Facts = { figures: unknown; checker: IdentityAssertion };

/**
 * The well-known SYSTEM_CHECKER (SPEC §5 "Mandatory pre-seam chain-verify"): the identity the
 * mandatory pre-seam chain-verify records as the consultation's `checker`. It is NOT a
 * transport-established caller identity — it is the LIBRARY itself attesting a clean replay,
 * so its `authority` is an internal library authority (`system:vidimera-record`), never one of
 * the transport authorities (`oidc:`/`session:`/`mtls:`/`dev-stub`) a leg's `allowedAuthorities`
 * would list. Exported so audit/tooling can recognize a system-emitted consultation.
 */
export const SYSTEM_CHECKER: IdentityAssertion = {
  principal: 'system:chain-verify',
  authority: 'system:vidimera-record',
};

export async function finalize(
  ctx: KernelContext,
  recordId: string,
  identity: IdentityAssertion,
  content: unknown,
  facts: Facts,
): Promise<Outcome<{ recordId: string; state: 'confirmed'; transitionRef: Digest }>> {
  const { store, profiles, now } = ctx;

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
  if (record.state !== 'open') {
    // A DECIDED record (confirmed / refused) — `record-not-open` (SPEC §8's never-appends
    // set): no append, no
    // transitionRef. Covers double-finalize on a capture-terminal confirmed record, finalize
    // on an effect-seam confirmed record awaiting redemption, and finalize on a refused record.
    return refused('record-not-open');
  }
  // state === 'open': en-passant expiry (expireIfDue performs the CAS append if due).
  const ex = await expireIfDue(store, chain, resolved, now());
  if (ex.expired) {
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

  // --- (6) success batch: [chain-verify, facts, confirmed] -----------------------------
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
  // capture-only ⇒ terminal; effect-seam ⇒ non-terminal (awaits redemption).
  const confirmedTransition: Transition = {
    recordId,
    seq: seqBase + 3,
    at: nowIso,
    kind: 'confirmed',
    payload: { actor: identity },
    prevHash: transitionDigest(factsTransition),
  };

  // `meta` is the POST-batch record flag, applied once. The entry terminality flag is the
  // store's own, read at entry — which is what admits the `confirmed` element that makes the
  // record terminal (SPEC §12).
  const postBatch: AppendMeta = {
    nonTerminal: nonTerminal('confirmed', finalLeg, resolved.effectSeam),
    // No `dueAt`: a capture-only final-leg `confirmed` is terminal and has no pending clock,
    // and the effect-seam `confirmToRedeem` window that WOULD set one here is unbuilt — the
    // redemption bounds remain inert until the clock increment (the status doc's §9.1 row
    // records it). Absent is the honest value today; this is the site that must set it when
    // that clock lands.
  };
  const res = await store.appendBatch(
    'open',
    [cvTransition, factsTransition, confirmedTransition],
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
 * transitionRef via the `'redeeming'` candidate; before this increment named that target, the
 * same corner exhausted `'open'`/`'confirmed'` without a match and surfaced result-first with
 * NO transitionRef instead. Either way the append target is chosen from an ORDERED candidate
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
 * `kernel/redeem.ts`'s `beginRedemption` (second step-3 increment) and `completeRedemption`
 * (a later increment) are FURTHER un-enlisted callers of this same append, through the SAME
 * shared `prologue()` chain-verify-first rung the direct shape uses — no copy of this
 * function, and no new shape beyond the `redeeming` candidate named above.
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
function isValidIdentity(identity: IdentityAssertion): boolean {
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
