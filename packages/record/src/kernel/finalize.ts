// @vidimera/record — kernel/finalize.ts: the operator-only `open → confirmed` seam
// (SPEC §9 "The finalize gate ladder"). THE check order is fixed
// and every refusal path wins over the ones after it:
//
//   load chain → (1) pre-seam chain-verify → profile resolution (unknown-profile:
//   unregistered, or not held — the profile-drift gate) → (2) state/expiry gate → (3)
//   identity (both branches) → (3.5) separation of duties → (4) content-drift → (4.5)
//   policy drift → (5) facts → (5.5) required consultations → (5.7) ack coverage →
//   (6) success append batch.
//
// This build implements rungs (1)/(2)/(3)/(3.5)/(4)/(4.5)/(5)/(5.5)/(5.7)/(6) of the SPEC's
// full ladder — the SPEC's (4.5) policy-drift rung is real as of the second step-6 increment
// (`policySource` is accepted at construction; the presence contract and this rung close the
// remaining two obligations, all three landing in that same commit). Rung (5.5) is built for
// THREE parts now: the required-consultation half (SPEC §11.1, second step-5 increment), the
// eligibility half (SPEC §10.4, first step-6 increment) — a declaring leg's implicit
// `'eligibility'` kind is prepended ahead of the declared `requiredConsultations`, so
// authority-to-decide is checked before the evidence checks — and the freshness arm (SPEC
// §11.1/§14, the AL2 freshness increment), which runs after a required kind's verdict passes
// and refuses `consultation-stale` on a missing, future, or out-of-bound `observedAt` claim.
// Rung (5.7), ack coverage (SPEC §10.2), is real as of the second step-7 increment — the same
// commit that lands the two operator-only seams (`kernel/findings-seams.ts`'s
// `raiseFinding`/`acknowledge`) that mint the transitions this rung's own coverage derivation
// reads.
//
// (1) Chain-verify is FIRST after load. A DETECTED BREAK → refuse `chain-compromise` (class
//     compromise, TERMINAL) and append ONE `refused` edge at head via NORMAL C2 (seq=max+1,
//     prevHash=chainHead) — `open→refused` unconfirmed, or `confirmed→refused` via the Store
//     C3 compromise carve-out. NO chain-verify consultation is appended on failure (the
//     fact folds into the single `refused` edge); the payload is `{code}`-only (AL1-honest —
//     `verifyChain` still reports only the original tamper). Because chain-verify precedes the
//     state gate, a tampered non-open record refuses `chain-compromise`, not `record-not-open`.
//     The AL2 enforcement increment folds the signature layer into this same arm
//     (`kernel/verify-signatures.ts`'s `signatureLayerHolds`, consulted only once AL1
//     intactness itself holds): a signing record whose layer does not hold refuses
//     `chain-compromise` exactly as a hash-broken chain does.
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
// (4.5) Policy drift (SPEC §10.3; second step-6 increment) — a policy-declaring profile's
//       live `opts.policy.digest` compared against the record's bound `policyDigest`:
//       mismatch → `policy-drift` (refusal-class, `terminalRefusals`-able, default open —
//       recovery is disposal + re-open, not retry); an `{ unreachable, authority }`
//       attestation → the `unavailable` outcome (this class's SECOND producer, after
//       (5.5)'s own); a bound `policyDigest` under a same-id NON-declaring instance never
//       reaches this rung — dropping `policySource` changes the profile's projection, so
//       profile resolution refuses `unknown-profile` first (the profile-drift gate; the
//       arm below throws as unreachable).
// (5) Facts — missing/malformed `facts` (no figures / no checker) → `consultation-missing`.
// (5.5) Required consultations (SPEC §11.1; second step-5 increment) plus eligibility (SPEC
//       §10.4; first step-6 increment) — for each kind the EFFECTIVE list names, IN ORDER: a
//       declaring leg's implicit `'eligibility'` kind FIRST, then the resolved leg's declared
//       `requiredConsultations` — a reported-unreachable marker → the `unavailable` outcome
//       (status `unavailable`, code `availability`, carrying the marker's `authority`; NEVER
//       appends — the record stays open and the seam re-arms for bounded host retry); missing
//       from the supplied obtained set → `consultation-missing` (this rung's SECOND producer,
//       after facts' own); an obtained `fail` verdict → `consultation-failed` — EXCEPT the
//       implicit `'eligibility'` kind under a declaring leg, whose `fail` verdict refuses
//       `ineligible` instead (SPEC §10.4's trip mapping; a NON-declaring leg that merely lists
//       `'eligibility'` in `requiredConsultations` keeps the generic code); a `pass` verdict on
//       a kind the leg's `freshness` bounds (SPEC §11.1/§14; the AL2 freshness increment) then
//       demands an evaluable, sane, in-bound `observedAt` claim — missing, future, or
//       out-of-bound → `consultation-stale`. The first kind that trips decides the outcome —
//       order, not severity across kinds.
// (5.7) Ack coverage (SPEC §10.2; second step-7 increment) — the library replays the
//       record's own findings and acks (no new finalize inputs) and, for each finding whose
//       `kind` appears in the leg's `requiredAcks`, in first-raise order, first trip refuses:
//       no ack at all → `ack-missing`; acks present but none counting → `ack-stale`. Zero
//       raised findings of a required kind, or an undeclared flow, pass vacuously. The
//       derivation is the read side's own (`kernel/findings.ts`'s `findingCoverage`); this
//       rung adds no recording of its own.
// (6) Success batch — ONE atomic, variable-arity `appendBatch` call carrying SPEC §9's shape,
//     `[chain-verify, facts, …obtained consultations, confirmed]` (the first step-5
//     increment's attach form — the host's supplied consultations, order preserved, land
//     between facts and confirmed), under a single entry compare-and-swap (SPEC §12): a
//     conflict applies NOTHING, so the partial-tail case this build once had to map is
//     unreachable now rather than handled. A `state-mismatch` at the entry CAS — the record is
//     not `open` — refuses `record-not-open`, which is true of the state AND honours its
//     never-appends registry entry. A `seq` conflict at that same entry is REACHABLE under a
//     conforming Store: a state-preserving append (`kernel/findings-seams.ts`'s
//     `raiseFinding`/`acknowledge`) landing between this call's chain read and its batch keeps
//     the record `open`, so the entry CAS passes and the store correctly refuses the stale seq.
//     `batchSeqConflict` re-reads once to tell the two honest stories apart: a moved head
//     refuses `record-contended` (SPEC §8, the record-contended increment — a RETURNED refusal,
//     never appends; re-invoke, and the ladder re-evaluates against the new head, so a finding
//     the confirmer never saw gates through rung (5.7) when its kind is required); an unmoved
//     head is a storage fault and THROWS. Either way nothing was recorded, so the throw sits
//     inside DECISIONS.md #10's "nothing was recorded" exception rather than beside it. The
//     seam never re-sends the batch itself: a fresh-seq retry would confirm over evidence the
//     human did not see.
//
// (3)/(3.5)/(4)/(4.5)/(5)/(5.5)/(5.7) are refusal-class ON THEIR
// consultation-missing/consultation-failed/ineligible/consultation-stale/policy-drift/
// ack-missing/ack-stale ARMS: each appends `open→refused` (terminal) IFF the leg's
// `terminalRefusals` lists it (the
// `appendsOn` rule), else no append and the record stays open. (4.5)'s and (5.5)'s
// availability arms are a DIFFERENT outcome status entirely (`unavailable`, never `refused`)
// and never append, `terminalRefusals` notwithstanding (SPEC §8).

import { bindContent, canonicalize, digest } from '../canonical.js';
import { assertChainFor } from '../chain/binding.js';
import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import { type FinalizeOptions, type LegSpec, unknownOptionKey } from '../config.js';
import type { KernelContext, ResolvedProfile } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { ok, refused, unavailable } from '../outcome.js';
import { appendsOn, type RefusalCode } from '../refusal-codes.js';
import type { AppendMeta, Store } from '../store/store.js';
import type {
  Consultation,
  DecisionRecord,
  Digest,
  IdentityAssertion,
  RecordState,
  Transition,
} from '../types.js';
import { validateConsultations, validatePolicyInput } from './consultations.js';
import { deadlineIso, resolveDueClock } from './expiry.js';
import { findingCoverage } from './findings.js';
import { heldProfile } from './held-profile.js';
import { identitySnapshot } from './identity.js';
import { assertIdArg, assertOptionsBag } from './intake.js';
import { signatureLayerHolds } from './verify-signatures.js';

/**
 * The finalize `facts` arg (SPEC §3's "Reviewed-surface (`facts`) binding"): the
 * reviewed-surface figures + the review-surface checker.
 *
 * EXPORTED for kernel/decline.ts, the second caller (the recorded-human-decline increment).
 */
export type Facts = { figures: unknown; checker: IdentityAssertion };

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
  return unknownOptionKey(
    key,
    'finalize() accepts only consultations and policy in this build. Contract: §9, §11.1, and §10.3.',
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
  assertIdArg('finalize', 'recordId', recordId);
  assertOptionsBag('finalize', opts);
  const { store, profiles, now } = ctx;

  // --- intake (SPEC §9: consultation shape "throws at argument intake, before anything
  // is loaded") — BEFORE the chain load below, so a caller bug throws identically
  // regardless of record state. ------------------------------------------------------
  if (opts !== undefined) {
    for (const key of Object.keys(opts)) {
      if (key === 'consultations') continue; // REAL as of the first step-5 increment
      if (key === 'policy') continue; // REAL as of the second step-6 increment
      throw new Error(finalizeOptionMessage(key));
    }
  }
  const supplied = validateConsultations(opts?.consultations, 'finalize');
  validatePolicyInput(opts?.policy);

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
  // AL1 intactness first; the AL2 enforcement increment folds the signature layer into
  // this same arm — a signing record whose layer does not hold refuses chain-compromise
  // identically to a hash-broken chain, both via the shared append below. Both halves are
  // bound to the requested `recordId`: a chain whose rows belong to another record (another
  // record's rows copied under this key) is a break at seq 1, never that record's history.
  const report = verifyChain(chain, recordId);
  if (!report.intact || !(await signatureLayerHolds(ctx, recordId, chain))) {
    return appendChainCompromise(store, recordId, chain, now);
  }

  // The chain is intact — fold it and resolve its profile.
  const record = replay(chain);
  const resolved = heldProfile(profiles, record);
  if (resolved === undefined) {
    // Fail-closed: this instance does not HOLD the record's profile — the id is unregistered
    // (refusal-matrix.test.ts's two-instance arm), or it is registered under this id with a
    // data-only projection that does not digest to the record's genesis `profileDigest`
    // (the profile-drift gate; test/profile-drift-gate.test.ts). Either way the record was
    // opened under rules this instance does not have, so nothing here may decide, expire, or
    // append under the rules it does have — `unknown-profile`, never-append, ahead of every
    // rung below (SPEC §4, §8). Recovery is the version discipline: restore the declarative
    // fields exactly, or keep the prior version registered under its id.
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

  // --- §10.3: the policy presence contract (second step-6 increment) -------------------
  // "On a policy-declaring profile, finalize throws when `opts.policy` is absent, and
  // on a non-declaring profile it throws when `opts.policy` is present" — deliberately
  // asymmetric with a missing required consultation (§10.3 argues it: policy is a
  // single mandatory environment fact with an explicit unreachable escape hatch, so its
  // absence is a host contract violation, not omitted evidence — and keeping absence
  // out of `policy-drift` leaves that code purely "the digests differ").
  if (resolved.profile.policySource !== undefined) {
    if (opts?.policy === undefined) {
      throw new Error(
        `finalize: profile '${record.profileId}' declares policySource but no opts.policy was supplied — ` +
          'the operator attests the live source (or its unreachability) at every finalize (SPEC §10.3)',
      );
    }
  } else if (opts?.policy !== undefined) {
    throw new Error(
      `finalize: profile '${record.profileId}' declares no policySource but opts.policy was supplied — ` +
        'a caller error (SPEC §10.3)',
    );
  }

  // --- SPEC §11.1/§14 (the AL2 freshness increment): the observedAt presence contract --
  // an authority-claimed observation time is admitted ONLY where the signature layer
  // covers it — a non-signing profile supplying observedAt is AL1's clock-trust posture
  // violated, a caller error that throws (the opts.policy presence-contract precedent,
  // same depth and ordering: chain-compromise and unknown-profile outrank it).
  if (resolved.profile.signing !== true) {
    const carrier = supplied.obtained.find((entry) => entry.observedAt !== undefined);
    if (carrier !== undefined) {
      throw new Error(
        `finalize: consultations '${carrier.kind}' carries observedAt but profile '${record.profileId}' ` +
          'does not declare signing — AL1 does not accept a caller-supplied observation time ' +
          '(clock trust, SPEC §11.1; the AL2 admission is §14)',
      );
    }
  }

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
    const due = await resolveDueClock(store, recordId, chain, resolved, now());
    if (due.due && due.result.appended) {
      return refused(due.window === 'confirmed' ? 'leg-expired' : 'record-not-open');
    }
    // Lost the CAS to a racing writer: this refuses `record-not-open` even when the
    // winner resolved a `confirmed` window to `expired` (re-invocation would say
    // `leg-expired` there instead) — a deliberate divergence from the redemption
    // family's loser-agrees-with-reinvocation discipline, tolerated because the race is
    // rare (a concurrent resolver on a multi-connection backing) and harmless: the plain
    // state verdict returned here is still true of the record regardless of which window
    // raced, and re-invocation reports the fresh state.
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
  const ex = await resolveDueClock(store, recordId, chain, resolved, now());
  if (ex.due) {
    // Due — the `expired` transition was appended (the en-passant expiry edge; if the CAS
    // raced, the record is past its deadline regardless). `leg-expired` carries no
    // transitionRef — the expired edge is an expiry transition, not a `refused` edge.
    return refused('leg-expired');
  }

  // --- (3) identity — both branches → identity-authority-refused -----------------------
  // Validated ONCE into a fresh literal (`identitySnapshot`); the allowlist check, rung (3.5)
  // and the recorded `actor` all read that literal, never the caller's object again.
  const actor = identitySnapshot(identity);
  if (actor === null || !leg.allowedAuthorities.includes(actor.authority)) {
    return refuseMaybeAppend(
      store,
      recordId,
      'identity-authority-refused',
      leg,
      chain,
      resolved,
      finalLeg,
      now,
    );
  }

  // --- (3.5) separation of duties (SPEC §10.1; second step-4 increment) ----------------
  if (sodViolated(record, leg, actor, recordId, 'finalize')) {
    return refuseMaybeAppend(store, recordId, 'sod-violation', leg, chain, resolved, finalLeg, now);
  }

  // --- (4) content-drift ----------------------------------------------------------------
  const recomputed = bindContent(
    resolved.canonicalizer,
    resolved.profile.subject.canonicalizerRef,
    content,
    { wellFormed: false },
  );
  if (recomputed !== record.contentDigest) {
    return refuseMaybeAppend(store, recordId, 'content-drift', leg, chain, resolved, finalLeg, now);
  }

  // --- (4.5) policy drift (SPEC §10.3; second step-6 increment) ------------------------
  if (record.policyDigest !== undefined && resolved.profile.policySource === undefined) {
    // UNREACHABLE since the profile-drift gate: a record binding a policyDigest was opened
    // under a profile declaring policySource, and policySource is a declarative field the
    // genesis profileDigest covers — so a same-id profile that dropped it does not digest to
    // the binding and profile resolution above refused `unknown-profile` first (SPEC §4, §10.3
    // as amended; OPEN-QUESTIONS §2's fail-close decision stands, delivered one step earlier).
    // Until that gate this arm refused `policy-drift`, the decided open question of record. It
    // throws now so that a projection change that stopped covering policySource would fail
    // loudly here rather than silently re-open the corner.
    throw new Error(
      'finalize: unreachable — a bound policyDigest under a profile declaring no policySource ' +
        'cannot pass profile resolution; the profile-drift gate refuses unknown-profile first (SPEC §4)',
    );
  }
  if (resolved.profile.policySource !== undefined) {
    const policy = opts?.policy;
    if (policy === undefined) {
      throw new Error(
        'finalize: unreachable — the §10.3 presence contract above admits no absent policy on a declaring profile',
      );
    }
    if ('unreachable' in policy) {
      // §10.3: an { unreachable, authority } marker yields the availability outcome —
      // "bounded retry, never fail-open, never approval". The SECOND producer of the
      // unavailable status (§11.1's consultation gate was the first).
      return unavailable(policy.authority);
    }
    if (policy.digest !== record.policyDigest) {
      // Mismatch: both digests present and unequal — `policy-drift` proper. The "present
      // live digest against an ABSENT bound one" sub-case §10.3 once named here is
      // unreachable since the profile-drift gate (a same-id instance that newly declares
      // policySource does not digest to the record's binding and refuses unknown-profile at
      // resolution). Recovery is disposal + re-open, not retry (§10.3) — a declaring profile
      // SHOULD list policy-drift in terminalRefusals.
      return refuseMaybeAppend(
        store,
        recordId,
        'policy-drift',
        leg,
        chain,
        resolved,
        finalLeg,
        now,
      );
    }
  }

  // --- (5) facts ------------------------------------------------------------------------
  // isValidFacts guards CANONICALIZABILITY too: a present-but-non-canonicalizable figures
  // payload (BigInt/circular) is refused here rather than throwing mid-batch at the digest
  // step below; on ok, the carried `canonical` feeds the facts digest (no double-canonicalize).
  const factsCheck = isValidFacts(facts);
  if (!factsCheck.ok) {
    return refuseMaybeAppend(
      store,
      recordId,
      'consultation-missing',
      leg,
      chain,
      resolved,
      finalLeg,
      now,
    );
  }

  // --- (5.5) required consultations (SPEC §11.1; second step-5 increment) + eligibility
  //     (SPEC §10.4; first step-6 increment) --------------------------------------------
  // The gate reads THIS record's own resolved leg (§11.1: on a multi-leg profile one
  // leg's finalize is never gated by another leg's requiredConsultations) and iterates
  // the EFFECTIVE kinds IN ORDER — "the first kind that trips resolving the call".
  // Non-required supplied consultations are untouched here: evidence, never a gate.
  //
  // §10.4: declaring per-leg `eligibility` makes 'eligibility' an implicit-FIRST
  // required consultation kind — "the effective kinds are the implicit `'eligibility'`
  // followed by the declared `requiredConsultations` in order, so authority-to-decide
  // is checked before the evidence checks". The library never runs the check; the host
  // supplies its result and the library GATES on it (first step-6 increment).
  const effectiveKinds =
    leg.eligibility !== undefined
      ? ['eligibility', ...(leg.requiredConsultations ?? [])]
      : (leg.requiredConsultations ?? []);
  if (effectiveKinds.length > 0) {
    for (const requiredKind of effectiveKinds) {
      const marker = supplied.unreachable.find((m) => m.kind === requiredKind);
      if (marker !== undefined) {
        // §11.1: a required kind the host reports unreachable produces the availability
        // outcome — "never a fabricated pass", and it NEVER appends: the record stays
        // open and the seam re-arms for bounded host retry (§8). Not a refusal; not
        // terminalRefusals-able (appendsOn is never consulted — no refused edge exists).
        return unavailable(marker.authority);
      }
      const obtained = supplied.obtained.find((entry) => entry.kind === requiredKind);
      if (obtained === undefined) {
        // Missing — consultation-missing's SECOND producer (the facts rung above is the
        // first); terminalRefusals-governed, open by default for a corrected retry.
        return refuseMaybeAppend(
          store,
          recordId,
          'consultation-missing',
          leg,
          chain,
          resolved,
          finalLeg,
          now,
        );
      }
      if (obtained.verdict === 'fail') {
        // §10.4's trip mapping: when the tripping kind is the implicit 'eligibility'
        // under a declaring leg, a fail verdict refuses `ineligible` — open-by-default,
        // per-finalize and per-actor, so a DIFFERENT eligible actor may decide the same
        // open record. Every other kind (and 'eligibility' under a NON-declaring leg,
        // where it is an ordinary kind) keeps the generic `consultation-failed`.
        const code =
          requiredKind === 'eligibility' && leg.eligibility !== undefined
            ? 'ineligible'
            : 'consultation-failed';
        return refuseMaybeAppend(store, recordId, code, leg, chain, resolved, finalLeg, now);
      }
      // verdict 'pass': this required kind is satisfied; it records in the success
      // batch with every other obtained consultation (the first step-5 increment's
      // recording is unchanged — the gate adds no recording of its own).

      // SPEC §11.1's freshness gate (the AL2 freshness increment): a bounded required
      // kind demands an evaluable, sane, in-bound observation claim — missing, future,
      // or out-of-bound refuses `consultation-stale`, fail-closed, open-by-default
      // for re-run with a fresh consultation (the family's own register). The gate
      // reads the RECORDED claim; §11.1's recording-time sentence stands untouched.
      // Object.hasOwn, not a bare index: `leg.freshness` is a plain object, and an
      // UNBOUNDED requiredKind named e.g. 'toString' would otherwise resolve to the
      // INHERITED Object.prototype.toString function via `?.[requiredKind]` — truthy,
      // so `bound !== undefined` below would spuriously enter the freshness arm and
      // refuse `consultation-stale` on a kind this leg never bounds at all (found at
      // the AL2 freshness increment's final review).
      const bound =
        leg.freshness !== undefined && Object.hasOwn(leg.freshness, requiredKind)
          ? leg.freshness[requiredKind]
          : undefined;
      if (bound !== undefined) {
        const claimed = obtained.observedAt;
        const nowMs = now().getTime();
        const observedMs = claimed === undefined ? Number.NaN : Date.parse(claimed);
        if (
          claimed === undefined ||
          Number.isNaN(observedMs) ||
          observedMs > nowMs ||
          nowMs - observedMs > bound * 1000
        ) {
          return refuseMaybeAppend(
            store,
            recordId,
            'consultation-stale',
            leg,
            chain,
            resolved,
            finalLeg,
            now,
          );
        }
      }
    }
  }

  // --- (5.7) ack coverage (SPEC §10.2; the second step-7 increment) --------------------
  // The library replays the record's own findings and acks — NO new finalize inputs —
  // and, per SPEC §10.2, "for each finding whose `kind` appears in the leg's
  // `requiredAcks`, in first-raise order, first trip refuses". Coverage is the read
  // side's shared derivation (kernel/findings.ts) — the rung adds no recording of its
  // own, and an undeclared flow or findings-free record passes vacuously ("`requiredAcks`
  // gates *raised* findings; it does not require findings to exist").
  for (const row of findingCoverage(record.findings, leg.ackMode, leg.requiredAcks)) {
    if (row.coverage === 'ack-missing' || row.coverage === 'ack-stale') {
      return refuseMaybeAppend(store, recordId, row.coverage, leg, chain, resolved, finalLeg, now);
    }
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
    checker: factsCheck.checker, // the literal gate (5) validated, never `facts.checker` re-read
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
  // preserved, chained after facts and before confirmed. Any `supplied.unreachable`
  // marker reaching this point names a NON-required kind — SPEC §11.1: "an unreachable
  // marker for a non-required kind is inert" — because rung (5.5) above already consumed
  // (and returned on) any marker for a kind the leg's `requiredConsultations` names; it
  // goes UNUSED here, same as before the gate, just for a narrower reason now.
  const suppliedTransitions: Transition[] = [];
  let suppliedPrevHash = transitionDigest(factsTransition);
  for (const [i, entry] of supplied.obtained.entries()) {
    const consultation: Consultation = {
      kind: entry.kind,
      checker: entry.checker, // the fresh literal `validateConsultations` built at intake
      at: nowIso,
      payloadDigest: entry.payloadDigest,
      verdict: entry.verdict,
      ...(entry.proofRef !== undefined ? { proofRef: entry.proofRef } : {}),
      ...(entry.observedAt !== undefined ? { observedAt: entry.observedAt } : {}),
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
    payload: { actor },
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
      const verdict = await batchSeqConflict('finalize', store, recordId, chain.length, res.index);
      if (verdict.contended) return refused('record-contended');
      throw verdict.fault;
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
 * The two honest stories a `seq` conflict can tell, told apart by one advisory re-read (the
 * `kernel/redeem.ts` `residualRefusal` precedent): CONTENDED — a conforming Store adjudicated
 * this call's append against a head another writer had moved, so the caller refuses
 * `record-contended` (SPEC §8: never appends; the record is unchanged and still open); or a
 * FAULT — the head did not move, or the conflict sits past element 0, or the re-read itself
 * failed — carrying the storage-fault error the caller throws (DECISIONS.md #11).
 */
export type SeqConflictVerdict = { contended: true } | { contended: false; fault: Error };

/**
 * The batch `seq`-conflict classifier — rung (6)'s single append, shared with `kernel/decline.ts`
 * (EXPORTED for it, the second caller). Only the `seq` shape reaches here: a `state-mismatch`
 * means the record is not open, which `record-not-open` describes truthfully since nothing was
 * appended, so it is returned result-first at both call sites. This function returns a verdict,
 * never throws: the caller refuses `record-contended` or throws the carried fault.
 *
 * A `seq` conflict has TWO honest producers, and the caller cannot tell them apart from the
 * result alone, so this helper re-reads the chain ONCE — advisory, no append, the
 * `kernel/redeem.ts` `residualRefusal` precedent — and lets the fresh length pick the story:
 *
 *  - CONTENTION (`index === 0` and the chain grew past `readLength`): a conforming Store
 *    adjudicated this call's batch against a head another writer had moved. The entry CAS
 *    passed, so whatever landed was state-preserving (a `raiseFinding`/`acknowledge`) and the
 *    record is still `open`, intact and undecided — no refusal code is true of it, and the
 *    `unavailable` arm's `authority` names no one here — so the record-contended increment
 *    minted `record-contended` (SPEC §8, never appends), which the caller RETURNS: a host
 *    matches on the code and re-invokes, and the ladder then re-evaluates against the new
 *    head, so a finding the confirmer never saw gates through rung (5.7) if its kind is
 *    required. The seam deliberately does NOT re-send the batch with a fresh seq — that would
 *    skip (5.7) and confirm over evidence the human did not see.
 *  - STORAGE FAULT (everything else): the head did not move, yet the store reported a
 *    conflict; or the conflict sits past element 0, which a kernel-built batch — seq-contiguous
 *    from the head it read — cannot produce under a conforming Store. DECISIONS.md #11 makes a
 *    storage fault a loud throw.
 *
 * The fault's throw sits inside DECISIONS.md #10's "storage faults where nothing was recorded"
 * scope, and the refusal is #10's result-first rule kept:
 * the batch is all-or-nothing, so neither leaves anything on the chain. A writer landing
 * between the store's adjudication and this re-read can only widen the growth this helper
 * observes, never shrink it — chains only grow — so the contention branch stays true under a
 * second race, and the storage-fault branch is reached only when nothing at all landed.
 */
export async function batchSeqConflict(
  seam: 'finalize' | 'decline',
  store: Store,
  recordId: string,
  readLength: number,
  index: number,
): Promise<SeqConflictVerdict> {
  return seqConflict(seam, store, recordId, readLength, index);
}

/**
 * The single-append twin of `batchSeqConflict`, for the seams whose one `appendTransition`
 * can lose a seq race to a concurrent state-preserving writer while the record stays `open`
 * (`kernel/findings-seams.ts`'s `raiseFinding`/`acknowledge`, racing each other or a
 * decision seam's batch). The same two honest stories, told apart the same way and returned as
 * the same verdict — the caller refuses `record-contended` or throws the fault; the fault's
 * message says "append conflict" with no element index.
 */
export async function appendSeqConflict(
  seam: 'raiseFinding' | 'acknowledge',
  store: Store,
  recordId: string,
  readLength: number,
): Promise<SeqConflictVerdict> {
  return seqConflict(seam, store, recordId, readLength, undefined);
}

async function seqConflict(
  seam: string,
  store: Store,
  recordId: string,
  readLength: number,
  index: number | undefined,
): Promise<SeqConflictVerdict> {
  // The diagnostic re-read may itself fail (the store that just misreported may be dying):
  // its rejection must never REPLACE the conflict report, which is what tells the host that
  // nothing landed. Caught here and carried as the thrown error's `cause`.
  let fresh: readonly Transition[] | undefined;
  let reReadFailure: unknown;
  try {
    const read = await store.readChain(recordId);
    // A foreign chain is carried as the re-read failure below (`fresh` stays unset), so the
    // conflict is reported as the fault it may be, never as contention.
    assertChainFor(read, recordId, seam);
    fresh = read;
  } catch (err) {
    reReadFailure = err;
  }
  // ONE HONEST BOUND on the split: it is inferred from a read AFTER the store adjudicated, so a
  // legitimate writer landing in that window makes a genuine storage fault at an unmoved head
  // read as contention. Nothing landed either way and re-invocation re-evaluates, so the cost
  // is a quieter diagnosis, never a wrong record; the exact signal would be the store reporting
  // the head seq it adjudicated against (deferral-register row 23's increment names it).
  if (fresh !== undefined && (index === undefined || index === 0) && fresh.length > readLength) {
    return { contended: true };
  }
  const why =
    fresh === undefined
      ? "the diagnostic re-read itself failed (its error rides as this one's cause), so a " +
        'concurrent writer can neither be established nor ruled out — treated as the storage ' +
        'fault it may be; re-invoke once the store answers'
      : index === undefined || index === 0
        ? `a re-read finds ${fresh.length} transition(s) against the ${readLength} this call read — ` +
          'the head did not move, so no concurrent writer explains the conflict'
        : 'a kernel-built batch is seq-contiguous from the head it read, so a conflict past ' +
          'element 0 has no honest producer';
  const site =
    index === undefined ? 'append conflict' : `batch append conflict ('seq') at element ${index}`;
  const message =
    `${seam}: ${index === undefined ? `${site} ('seq')` : site}. A Store honouring the ` +
    `compare-and-swap contract cannot report this: ${why}. This is a storage fault. The ` +
    `${index === undefined ? 'append' : 'batch'} is all-or-nothing: nothing was appended and the record is unchanged.`;
  const fault =
    reReadFailure === undefined ? new Error(message) : new Error(message, { cause: reReadFailure });
  return { contended: false, fault };
}

/**
 * The states out of which no `refused` edge can leave — exactly `RecordState` minus the three
 * producible CAS targets the candidate walk tries. C3 bars a state-leaving `refused` append out
 * of a terminal record, and the compromise carve-out admits only an expected `confirmed` or
 * `redeeming`, so for a record whose persisted state is one of these five the same-state
 * candidate can never win its CAS. The set is DERIVED — SPEC §2's terminality plus C3's general
 * bar — not quoted from a sealed list: §5, §8 and §12's C3 each enumerate a different subset of
 * it, and none names `redeemed` or `redemption-failed`.
 *
 * Written as a `satisfies`-checked record rather than a bare set on purpose: adding a member to
 * `RecordState` then fails the build here, instead of silently classifying it as admissible.
 */
const NO_EDGE_STATE = {
  refused: true,
  expired: true,
  declined: true,
  redeemed: true,
  'redemption-failed': true,
  open: false,
  confirmed: false,
  redeeming: false,
} as const satisfies Record<RecordState, boolean>;

/**
 * The chain-compromise failure path (SPEC §5, AL1-honest). Appends ONE `refused`
 * edge at head via NORMAL C2 (`seq=max+1`, `prevHash=chainHead`, payload `{code}`-only), then
 * refuses `chain-compromise` WITH the appended edge's digest — compromise carries a
 * transitionRef wherever the Store's C3 carve-out admits an edge (`open→refused`;
 * `confirmed→refused`; `redeeming→refused`). On an already-terminal `expired`/`refused`
 * record NO CAS candidate is admitted (the C3-forced corner), no edge is appended, and the
 * refusal surfaces result-first with NO transitionRef — see the fallback below / SPEC §5.
 *
 * THE NO-EDGE CORNER, enumerated once. No candidate can land when the backing's PERSISTED
 * state is any of `NO_EDGE_STATE`'s five terminal states — `refused`, `expired`, `declined`,
 * `redeemed`, `redemption-failed` — or when the record is sealed (C4 bars unconditionally,
 * whatever the state). The shapes named below (already-terminal, already-sealed,
 * already-`redeemed`) are instances of that one rule. When the FOLDED state is one of the five,
 * the same-state candidate is dropped before the walk (see the body): it saves one signed CAS
 * attempt per refusing call and cannot change an outcome, because that candidate could only
 * ever match a record whose persisted state equals the folded one, and for such a record C3
 * bars the edge. Nothing else is predicted from the folded state — the three producible
 * targets are always tried, because the backing decides them against its own persisted row,
 * which the chain handed here (a chain that failed verification by construction) does not
 * determine. Under a signing profile in separate mode (a sidecar that is not the store's own,
 * `signing/decorate.ts`) every attempt is signed and written before it is tried, so a refusing
 * call on this corner still leaves ONE sidecar entry with no chain counterpart
 * (deferral-register row 22); the narrowing does not change that. In integrated mode every
 * attempt is still signed first, but its entry rides the attempt's own append, so an attempt
 * that loses its CAS writes none.
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
 *
 * `kernel/decline.ts`'s `decline()` (the recorded-human-decline increment) and
 * `kernel/findings-seams.ts`'s shared prologue serving `raiseFinding`/`acknowledge` (the
 * findings flow) are the remaining callers — five call sites in all, counting this
 * function's home seam. Both take the ordinary un-enlisted path and add no shape beyond
 * the ones named above: decline's own CAS candidate set is finalize's; and the findings
 * seams reach this append at their own chain-verify rung, which precedes their state rung
 * (SPEC §5: "Verification is first"), so a tampered or signature-broken chain over a
 * `confirmed` or `redeeming` findings-declaring record arrives here with that state —
 * already inside this function's own candidate list, adding nothing new.
 */
export async function appendChainCompromise(
  store: Store,
  recordId: string,
  chain: readonly Transition[],
  now: () => Date,
): Promise<Outcome<never>> {
  let candidates: RecordState[];
  try {
    const replayed = replay(chain).state;
    // --- drop the one candidate C3 can never admit ---------------------------------------
    // When the folded state is terminal, the same-state candidate is provably dead: its CAS
    // can only match a record whose persisted state equals the folded one, and for such a
    // record C3 bars a state-leaving `refused` append. Dropping it saves one signed CAS
    // attempt per refusing call and cannot change any outcome.
    //
    // The three producible targets are deliberately NOT dropped, and that is the load-bearing
    // limit. They are adjudicated by the backing against its OWN persisted row, which the read
    // chain does not determine — and the chain reaching this function failed verification by
    // construction. On the SQL backing `readChain` reads the transitions table while the C3
    // and C4 gates read the records row, so a tamper that rewrites a transition leaves the
    // persisted state untouched and the two diverge. Measured: a last-element kind rewrite
    // over a record persisted `confirmed` folds to `refused` on read, and the walk still lands
    // the edge through C3's carve-out. A bar predicted from the chain would suppress it.
    candidates = NO_EDGE_STATE[replayed]
      ? ['open', 'confirmed', 'redeeming']
      : dedupe([replayed, 'open', 'confirmed', 'redeeming']);
  } catch {
    // A tampered chain replay cannot fold a state — fall back to the three producible targets.
    // The narrowing above is deliberately INSIDE the try: with no folded state there is nothing
    // to narrow, and skipping it structurally keeps the fallback walk exactly as it was.
    candidates = ['open', 'confirmed', 'redeeming'];
  }

  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('appendChainCompromise: empty chain — callers hold a loaded chain');
  }
  const refusedTransition: Transition = {
    recordId,
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
 * out of `open` by a concurrent writer — reachable on a multi-connection backing): refuse
 * without a transitionRef (best-effort; nothing was recorded, and re-invocation re-reads).
 * `code` excludes `'availability'` — that
 * class never rides a `refused` edge (SPEC §8), and every call site here passes a
 * refusal/compromise-class literal; the second step-5 increment's narrowing of `refused()`
 * made the exclusion compile-time, so this parameter follows it.
 *
 * EXPORTED for kernel/decline.ts, the second caller (the recorded-human-decline increment).
 */
export async function refuseMaybeAppend(
  store: Store,
  recordId: string,
  code: Exclude<RefusalCode, 'availability'>,
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
    recordId,
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
 * Rung (3.5)'s shared predicate (SPEC §10.1), extracted at the recorded-human-decline
 * increment so the decline seam gates SoD from the SAME code, not a drifting copy.
 * Returns true when the seam must refuse `sod-violation`; THROWS on the garbled
 * paired-actor invariant (a storage/config fault, SPEC §8) — the boundary comments
 * from finalize's original rung travel here unchanged.
 *
 * `identity` is the seam's `identitySnapshot` literal, never the caller's object. The read
 * side fails closed too, since the identity-snapshot increment: every recorded
 * `priorLegActors` entry must itself be a valid identity, checked before any principal is
 * compared. Until then a recorded `{}` (what a getter-backed or `Object.create`-built maker
 * identity was written as) had no string principal, matched no finalizer, and let SoD pass —
 * the same garbled-evidence storage fault as the unpaired-actor throw below, widened to the
 * shape every seam now guarantees it writes.
 */
export function sodViolated(
  record: DecisionRecord,
  leg: LegSpec,
  identity: IdentityAssertion,
  recordId: string,
  seam: 'finalize' | 'decline',
): boolean {
  if (leg.sod !== undefined) {
    for (const [index, priorActor] of (record.priorLegActors ?? []).entries()) {
      if (identitySnapshot(priorActor) === null) {
        throw new Error(
          `${seam}: record '${recordId}' carries a prior-leg actor at index ${index} that is not a valid identity — a garbled or foreign chain is a storage/config fault (SPEC §8)`,
        );
      }
    }
    for (const namedLegId of leg.sod.notActorOf) {
      const refIndex = (record.priorRecordRefs ?? []).findIndex((ref) => ref.legId === namedLegId);
      if (refIndex === -1) {
        // Lookup miss — the record's own evidence carries no entry for the named leg
        // (profile reconfigured between open() and finalize(); construction validates
        // the static case). Fail-closed: distinctness cannot be demonstrated from the
        // record's own chain, so refuse rather than skip — SPEC §10.1: the lookup keys
        // the record's evidence precisely so a profile edit "cannot silently re-index
        // an already-opened record's evidence".
        return true;
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
          `${seam}: record '${recordId}' carries a prior-leg reference for '${namedLegId}' with no paired actor — a garbled or foreign chain is a storage/config fault (SPEC §8)`,
        );
      }
      if (priorActor.principal === identity.principal) return true;
    }
  }
  return leg.proposer !== undefined && leg.proposer === identity.principal;
}

/**
 * Facts are present AND USABLE iff `figures` is supplied (not `undefined`), `checker` is a valid
 * identity, AND `figures` is library-JCS-canonicalizable. The gate's return WIDENS from a bare
 * boolean to `{ ok: true; canonical: Uint8Array } | { ok: false }`: a present-but-non-
 * canonicalizable figures payload (a BigInt, a circular reference — `canonicalize` THROWS on
 * both) is NOT a valid facts payload, so the try/catch refuses it here (→ `consultation-missing`
 * at the call site) rather than letting the throw escape mid-batch at the facts-digest step. On
 * ok the carried `canonical` bytes are digested directly at the call site, so
 * `canonicalize(figures)` runs exactly once. The ok arm also carries `checker`, the
 * `identitySnapshot` literal of `facts.checker` — the value the facts consultation records,
 * so the call site never reads `facts.checker` a second time.
 *
 * EXPORTED for kernel/decline.ts, the second caller (the recorded-human-decline increment).
 */
export function isValidFacts(
  facts: Facts,
): { ok: true; canonical: Uint8Array; checker: IdentityAssertion } | { ok: false } {
  const f = facts as unknown as { figures?: unknown; checker?: unknown } | null | undefined;
  if (f == null || typeof f !== 'object') return { ok: false };
  if (f.figures === undefined) return { ok: false };
  const checker = identitySnapshot(f.checker as IdentityAssertion);
  if (checker === null) return { ok: false };
  let canonical: Uint8Array;
  try {
    canonical = canonicalize(f.figures);
  } catch {
    // Non-canonicalizable figures (BigInt/circular) — a present-but-unusable facts payload.
    return { ok: false };
  }
  return { ok: true, canonical, checker };
}

function dedupe<T>(values: T[]): T[] {
  return [...new Set(values)];
}
