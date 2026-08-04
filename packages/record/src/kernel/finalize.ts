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
// (6) Success batch — best-effort SEQUENTIAL appends [chain-verify consultation, facts
//     consultation, confirmed] under the single-writer / no-concurrent-finalize-per-record
//     bound in this build (not a cross-append atomic batch; a future build step makes it
//     one). No conflict is reachable at any of the three appends under that bound and a Store
//     honouring SPEC §12's compare-and-swap contract, so a conflict here is a STORAGE FAULT
//     however it is surfaced. A conflict on the FIRST append still refuses `record-not-open`,
//     which nothing of this call has yet contradicted, and which is true of the state for a
//     `state-mismatch` but FALSE for a `seq` conflict — both reachable, both stated at the
//     site. Keeping the refusal there while the later two throw is a deliberate boundary
//     rather than an oversight; the deferral register records it, with the trigger that
//     dissolves it. A conflict on
//     EITHER LATER append THROWS, naming the conflict shape and what this call appended:
//     returning a never-appends code carrying no `transitionRef` would tell the host this call
//     recorded nothing, when its consultations are on the chain. Nothing rolls back what
//     landed.
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
import type { AppendResult, Store } from '../store/store.js';
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

  // The record is `open` and stays `open` across the two state-preserving consultation
  // appends (both `expectedCurrentState:'open'`), then the `confirmed` edge flips it.
  const openNonTerminal = nonTerminal('open', finalLeg, resolved.effectSeam); // true
  let prevHash: Digest = headDigest;
  let seq = chain.length + 1;

  // (a) chain-verify consultation (state-preserving)
  const cvTransition: Transition = {
    recordId,
    seq,
    at: nowIso,
    kind: 'consultation-recorded',
    payload: chainVerifyConsultation,
    prevHash,
  };
  const cvRes = await store.appendTransition('open', cvTransition, openNonTerminal);
  if (!cvRes.appended) {
    // The FIRST append of the batch: nothing of this call has landed. A never-appends code
    // carrying no `transitionRef` therefore tells the host the truth — this call recorded
    // nothing — which is exactly what stops being true at the later two sites. (A racing
    // writer's own edge may well be on the chain; the claim is about this call, as it is at
    // those sites.) What the code CLAIMS is
    // still narrower than the branch it guards, and the difference is recorded rather than
    // left for a reader to assume away. Measured against `store/memory.ts`, not reasoned from
    // the name:
    //  - `state-mismatch` ⇒ the record was absent or NOT `open` at this CAS, so the code is
    //    true of the state. `nonterminal.ts` makes `open` unconditionally non-terminal, so
    //    memory.ts's C3 arm (which needs a terminal record) cannot fire against an open one,
    //    leaving its state CAS as the only producer of this shape here. One sub-shape is
    //    still off: a race to `expired` draws `leg-expired` under SPEC §8, not this code.
    //  - `seq` ⇒ memory.ts checks the state CAS BEFORE sequencing, so it raises `seq` only
    //    after finding the record `open` — and `record-not-open` is then FALSE. That premise
    //    is memory.ts's check order, not a SPEC §12 requirement, so another conforming
    //    adapter may order its checks differently and carry no such implication.
    // Both shapes need a store that violates this build's single-writer bound. The code stays
    // as it is: this site refusing while the later two throw is a deliberate boundary, and the
    // deferral register carries it — substance and trigger both — rather than leaving it to a
    // comment that dies with the code. Changing the code by conflict shape is a separate
    // decision from the one this site records. The `seq` arm above is the residual it leaves,
    // and it is stated rather than hidden.
    return refused('record-not-open');
  }
  prevHash = cvRes.transitionDigest;
  seq += 1;

  // (b) facts consultation (state-preserving)
  const factsTransition: Transition = {
    recordId,
    seq,
    at: nowIso,
    kind: 'consultation-recorded',
    payload: factsConsultation,
    prevHash,
  };
  const factsRes = await store.appendTransition('open', factsTransition, openNonTerminal);
  if (!factsRes.appended) {
    // One consultation (chain-verify) of this call is already on the chain — see
    // `midBatchConflict`. What the RECORD's state is by now is not re-read here, and a
    // `state-mismatch` means it is no longer `open`.
    throw midBatchConflict(factsRes.conflict, 1);
  }
  prevHash = factsRes.transitionDigest;
  seq += 1;

  // (c) confirmed transition — capture-only ⇒ terminal (nonTerminal false); effect-seam ⇒
  // non-terminal (awaits redemption).
  const confirmedNonTerminal = nonTerminal('confirmed', finalLeg, resolved.effectSeam);
  const confirmedTransition: Transition = {
    recordId,
    seq,
    at: nowIso,
    kind: 'confirmed',
    payload: { actor: identity },
    prevHash,
  };
  const confirmedRes = await store.appendTransition(
    'open',
    confirmedTransition,
    confirmedNonTerminal,
  );
  if (!confirmedRes.appended) {
    // Both consultations of this call are already on the chain and THIS call adds no decision
    // edge after them — see `midBatchConflict`. They stay there: the batch is sequential
    // best-effort in this build, not atomic, so the throw undoes nothing. Whether the record
    // still has no decision edge at all is a different question and not one this call can
    // answer: a `state-mismatch` here means something else moved the record out of `open`,
    // which may well have been another writer's own `confirmed`.
    throw midBatchConflict(confirmedRes.conflict, 2);
  }

  return ok({ recordId, state: 'confirmed', transitionRef: confirmedRes.transitionDigest });
}

// --- helpers ---------------------------------------------------------------------------

/** The `AppendResult` conflict shapes, i.e. every shape a non-appending result can carry. */
type AppendConflict = Extract<AppendResult, { appended: false }>['conflict'];

/**
 * The mid-batch conflict fault — rung (6)'s later two appends (b) and (c).
 *
 * THE GROUND, and it is one sentence: under this build's single-writer /
 * no-concurrent-finalize-per-record bound, with a Store honouring SPEC §12's compare-and-swap
 * contract, NO conflict is reachable at these appends — the CAS target is a state only another
 * writer could move, and the `seq` is `max+1` unless another writer appended. So arriving here
 * means the storage layer broke a contract, which is a storage fault, and DECISIONS.md #11
 * makes a storage fault a loud throw. That ground is independent of the conflict shape, of the
 * adapter, and of the record's state — none of which this call re-reads.
 *
 * WHY NOT RETURN A CODE ANYWAY. A refusal is result-first data the host routes on, and the
 * codes available here would MISREPRESENT what happened rather than describe it:
 * `record-not-open` carries no `transitionRef` and is a never-appends member, so returning it
 * tells a host that this call recorded nothing — while the consultations it appended (one at
 * site (b), two at site (c)) sit on the chain. Note what
 * this argument is NOT: the never-appends rule itself was never contradicted. SPEC §8's
 * append-semantics paragraph scopes that rule to whether the REFUSAL appends a `refused`
 * transition, `appendsOn('record-not-open', leg)` is `false` unconditionally, and no `refused`
 * edge was appended at either site — the consultations came from the success batch. What is
 * wrong is the picture the outcome paints for the host, plus §8's own table-row framing of the
 * code as a SEAM invoked against a non-open record, which does not describe a seam that has
 * already put two consultations on the chain. An earlier version of this comment claimed a
 * contradiction here, and a version before that claimed the record was "still open"; both were
 * false — the second because `store/memory.ts`'s state CAS is the only producer of
 * `state-mismatch` at these appends (C3's arm needs a TERMINAL record, and `nonterminal.ts`
 * makes `open` unconditionally non-terminal), so a genuine one means the record is NOT open.
 *
 * WHAT THE UNION DOES AND DOES NOT OFFER — commentary, NOT the ground above. A defect in this
 * paragraph is a documentation bug, not a hole in the justification, and it is written that
 * way deliberately: two successive attempts to justify the throw by enumerating the union and
 * ruling every member out were each constructibly false at their edges, because a
 * bound-violating store gets to influence the state the enumeration quantifies over.
 * `record-not-open` may well be TRUE of the state after a `state-mismatch`. At least two codes
 * can be true of it AND are outside the never-appends set: `leg-expired`, when another writer
 * lands an `expired` edge (SPEC §8 routes an expired record at these seams to it), and
 * `chain-compromise`, when a bound-violating writer lands an edge whose `prevHash` does not
 * link — both constructed against `MemoryStore`, neither hypothetical. Returning either would
 * still be wrong for the reason above, and no exhaustiveness is claimed for this list. The
 * three argument-determined codes (`content-drift`, `identity-authority-refused`,
 * `consultation-missing`) cannot flip: they are properties of THIS CALL's arguments against
 * the record's bound digest, the leg's authorities and the `facts` arg, and a writer racing
 * through the append seam cannot reach any of them. They were gated and PASSED earlier in this same call, and none was
 * re-checked after the conflict — which is itself a reason this is a fault, not a verdict.
 *
 * THE LIMIT, IN THE SAME BREATH. The exception taken here is a scoped one —
 * DECISIONS.md #10: "storage faults where nothing was recorded" — and here something WAS
 * recorded, so this throw sits outside that scope rather than inside it. It rolls nothing
 * back, because no rollback exists in this build: the batch is sequential, not atomic
 * (SPEC §12's `appendBatch` is the all-or-nothing rung, and it is not part of the shipped
 * `Store`; deferral register). What the message may therefore state is what this call DID —
 * the conflict shape, and the consultations it appended with no decision edge of its own —
 * and not what the record now is. A retry that succeeds appends its own consultation pair on
 * top; after site (b) that leaves three consultations on the chain, not two.
 */
function midBatchConflict(conflict: AppendConflict, landed: 1 | 2): Error {
  const consultations = landed === 1 ? '1 consultation' : `${landed} consultations`;
  return new Error(
    `finalize: mid-batch append conflict ('${conflict}') on a record this call has already ` +
      "appended to. Under this build's single-writer / no-concurrent-finalize-per-record " +
      'bound, with a Store honouring the compare-and-swap contract, no conflict is reachable ' +
      'here — so this is a storage fault. This call ' +
      `appended ${consultations} and no decision edge, and nothing is rolled back. It did ` +
      'not re-read the record afterwards: re-read before retrying, and note that a retry ' +
      'which succeeds appends its own pair of consultations on top of these.',
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
 * it: fall back to trying `'open'` then `'confirmed'`. Either way the append target is chosen
 * from an ORDERED candidate list and the FIRST target whose CAS succeeds wins (a failed CAS
 * appends nothing, so retrying against another target is safe).
 */
async function appendChainCompromise(
  store: Store,
  chain: readonly Transition[],
  now: () => Date,
): Promise<Outcome<never>> {
  let candidates: RecordState[];
  try {
    candidates = dedupe([replay(chain).state, 'open', 'confirmed']);
  } catch {
    // A tampered chain replay cannot fold a state — fall back to the two producible targets.
    candidates = ['open', 'confirmed'];
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
    const res = await store.appendTransition(target, refusedTransition, refusedNonTerminal);
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
  const res = await store.appendTransition('open', refusedTransition, refusedNonTerminal);
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
