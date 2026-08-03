// @vidimera/record — kernel/finalize.ts (design §3 finalize signature / §5 "finalize()
// check order" IN FULL / §9 "finalize check order (2nd-pass)" + "record-not-open (M-B)" +
// "chain-compromise failure path (S6, AL1-honest)" + "Facts consultation checker (S1) +
// figures path (O1)"): the operator-only `open → confirmed` seam. THE check order is fixed
// and every refusal path wins over the ones after it:
//
//   load chain → (1) pre-seam chain-verify → (2) state/expiry gate → (3) identity (both
//   branches) → (4) content-drift → (5) facts → (6) success append batch.
//
// (1) Chain-verify is FIRST after load. A DETECTED BREAK → refuse `chain-compromise` (class
//     compromise, TERMINAL) and append ONE `refused` edge at head via NORMAL C2 (seq=max+1,
//     prevHash=chainHead) — `open→refused` unconfirmed, or `confirmed→refused` via the Store
//     C3 compromise carve-out (S-4). NO chain-verify consultation is appended on failure (the
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
// (6) Success batch — best-effort SEQUENTIAL appends [chain-verify consultation, facts
//     consultation, confirmed] under the single-writer / no-concurrent-finalize-per-record
//     slice-3 bound (NOT a cross-append atomic batch — OQ2-9 is slice 4). A residual
//     `state-mismatch` on the confirmed-append CAS → `record-not-open` (M-B residual).
//
// (3)/(4)/(5) are refusal-class: each appends `open→refused` (terminal) IFF the leg's
// `terminalRefusals` lists it (Task 2 `appendsOn`), else no append and the record stays open.

import { canonicalize, digest } from '../canonical.js';
import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import type { LegSpec } from '../config.js';
import type { KernelContext, ResolvedProfile } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import { appendsOn, type RefusalCode } from '../refusal-codes.js';
import type { Store } from '../store/store.js';
import type { Consultation, Digest, IdentityAssertion, RecordState, Transition } from '../types.js';
import { expireIfDue } from './expiry.js';

/** The finalize `facts` arg (design §3): the reviewed-surface figures + the review-surface checker. */
type Facts = { figures: unknown; checker: IdentityAssertion };

/**
 * The well-known SYSTEM_CHECKER (design §9 "chain-verify consultation"): the identity the
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
    // No such record. No fitting slice-3 RefusalCode (the union is contract-fixed; the record
    // must have been opened first) — THROWS, mirroring open()'s missing-stagedRef and
    // replay()/verifyChain()'s empty-chain posture. Flagged for the Task-12 reconciliation.
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
    // stage()/open()'s `unknown-profile` posture. Not a slice-3 producer under the tests
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
    // A DECIDED record (confirmed / refused) — `record-not-open` (M-B): no append, no
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
  if (!isValidFacts(facts)) {
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
  // Facts figures go through LIBRARY JCS ONLY (never the adopter content-canonicalizer, O1)
  // — figures are the reviewed-surface rendering artifact, not the bound content.
  const factsConsultation: Consultation = {
    kind: 'facts',
    checker: facts.checker,
    at: nowIso,
    payloadDigest: digest(canonicalize(facts.figures)),
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
  if (!cvRes.appended) return refused('record-not-open');
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
  if (!factsRes.appended) return refused('record-not-open');
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
    // Residual CAS conflict on the confirmed edge (state-mismatch) → record-not-open (M-B
    // residual). The already-landed consultations stay on the chain — the batch is sequential
    // best-effort, not atomic (design §9 S5).
    return refused('record-not-open');
  }

  return ok({ recordId, state: 'confirmed', transitionRef: confirmedRes.transitionDigest });
}

// --- helpers ---------------------------------------------------------------------------

/**
 * The chain-compromise failure path (design §5/§9 S6, AL1-honest). Appends ONE `refused`
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
  // than throw — the compromise is still surfaced. Documented fallback (design/brief).
  return refused('chain-compromise');
}

/**
 * A refusal-class refusal that appends `open→refused` (terminal, payload `{code}`-only) IFF the
 * leg's `terminalRefusals` lists `code` (Task 2 `appendsOn`), else no append (the record stays
 * open). On an append: refuse WITH the appended edge's digest. On a failed append CAS (a race
 * out of `open` — not producible under the single-writer slice-3 bound): refuse without a
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

/** Facts are present iff `figures` is supplied (not `undefined`) AND `checker` is a valid identity. */
function isValidFacts(facts: Facts): boolean {
  const f = facts as unknown as { figures?: unknown; checker?: unknown } | null | undefined;
  if (f == null || typeof f !== 'object') return false;
  if (f.figures === undefined) return false;
  return isValidIdentity(f.checker as IdentityAssertion);
}

function dedupe<T>(values: T[]): T[] {
  return [...new Set(values)];
}
