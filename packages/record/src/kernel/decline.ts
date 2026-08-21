// @vidimera/record — kernel/decline.ts: the operator-only `open → declined` seam (SPEC
// §9's decline call; the recorded-human-decline increment). The recorded human "no" with
// confirm's evidentiary treatment: finalize's ladder with the EVIDENCE rungs absent —
//
//   intake → load chain → (1) pre-seam chain-verify → declaration + observedAt contracts
//   → (2) state/expiry gate → (3) identity → (3.5) separation of duties →
//   (4) content-drift → (5) facts → (5.5) eligibility ONLY → (6) success append batch.
//
// Deliberately absent, per the "authority yes, evidence no" ruling recorded for this increment:
// requiredConsultations iteration, evidence-kind freshness, rung (5.7) ack coverage —
// a "no" is never blockable by a missing or dead evidence source — and rung (4.5): the
// seam takes NO policy input (the policy gate exists to prevent approving under stale
// rules; a decline disposes the record either way; the bound policyDigest stays as the
// context the decline was made under). Eligibility DOES gate (authority-to-decide covers
// deciding either way), including its AL2 freshness bound (stale authority is authority
// not established). Every refusal reuses an existing §8 code through the same
// refuseMaybeAppend/appendsOn rule — the registry does not grow at this increment.

import { canonicalize, digest } from '../canonical.js';
import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import { type DeclineOptions, governedUnavailable } from '../config.js';
import type { KernelContext } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { ok, refused, unavailable } from '../outcome.js';
import type { AppendMeta } from '../store/store.js';
import type { Consultation, Digest, IdentityAssertion, Transition } from '../types.js';
import { validateConsultations } from './consultations.js';
import { resolveDueClock } from './expiry.js';
import {
  appendChainCompromise,
  type Facts,
  isValidFacts,
  isValidIdentity,
  refuseMaybeAppend,
  SYSTEM_CHECKER,
  sodViolated,
} from './finalize.js';
import { signatureLayerHolds } from './verify-signatures.js';

export async function decline(
  ctx: KernelContext,
  recordId: string,
  identity: IdentityAssertion,
  content: unknown,
  facts: Facts,
  opts?: DeclineOptions,
): Promise<Outcome<{ recordId: string; state: 'declined'; transitionRef: Digest }>> {
  const { store, profiles, now } = ctx;

  // --- intake (finalize's posture: throws before anything is loaded) -------------------
  if (opts !== undefined) {
    for (const key of Object.keys(opts)) {
      if (key === 'consultations') continue;
      throw new Error(
        governedUnavailable(
          key,
          'decline() accepts only consultations in this build — the seam takes no policy ' +
            'input by design (SPEC §9). Contract: §9 and §11.1.',
        ),
      );
    }
  }
  const supplied = validateConsultations(opts?.consultations);

  // --- load the chain -------------------------------------------------------------------
  const chain = await store.readChain(recordId);
  if (chain.length === 0) {
    throw new Error(
      `decline: unknown recordId '${recordId}' — no such record (open() first); ` +
        'a recordId that resolves to no chain is a caller error, not a domain refusal',
    );
  }

  // --- (1) pre-seam chain-verify (SPEC §5: verification is first) ----------------------
  const report = verifyChain(chain);
  if (!report.intact || !(await signatureLayerHolds(ctx, chain))) {
    return appendChainCompromise(store, chain, now);
  }

  const record = replay(chain);
  const resolved = profiles.get(record.profileId);
  if (resolved === undefined) {
    return refused('unknown-profile');
  }
  const legIndex = resolved.profile.legs.findIndex((l) => l.id === record.legId);
  const leg = resolved.profile.legs[legIndex];
  if (leg === undefined) {
    throw new Error(
      `decline: persisted legId '${record.legId}' is absent from profile '${record.profileId}'`,
    );
  }
  const finalLeg = isFinalLeg(legIndex, resolved.profile.legs.length);

  // --- the declaration gate (the findings-seams posture, SPEC §9.1) --------------------
  if (leg.decline !== true) {
    throw new Error(
      `decline: leg '${leg.id}' of profile '${record.profileId}' does not declare the decline ` +
        'seam — declare decline: true on the leg (SPEC §9.1); a non-declaring chain stays ' +
        'byte-identical to a pre-decline implementation',
    );
  }

  // --- the observedAt presence contract (SPEC §11.1/§14 — finalize's own, shared) ------
  if (resolved.profile.signing !== true) {
    const carrier = supplied.obtained.find((entry) => entry.observedAt !== undefined);
    if (carrier !== undefined) {
      throw new Error(
        `decline: consultations '${carrier.kind}' carries observedAt but profile ` +
          `'${record.profileId}' does not declare signing — AL1 does not accept a ` +
          'caller-supplied observation time (clock trust, SPEC §11.1; the AL2 admission is §14)',
      );
    }
  }

  // --- (2) state/expiry gate (the shape mirrors finalize's rung (2); the adjacent-pair
  //     tests pin both ladders) ----------------------------------------------------------
  if (record.state === 'expired') {
    return refused('leg-expired');
  }
  if (record.state === 'confirmed' || record.state === 'redeeming') {
    const due = await resolveDueClock(store, chain, resolved, now());
    if (due.due && due.result.appended) {
      return refused(due.window === 'confirmed' ? 'leg-expired' : 'record-not-open');
    }
    return refused('record-not-open');
  }
  if (record.state !== 'open') {
    return refused('record-not-open');
  }
  const ex = await resolveDueClock(store, chain, resolved, now());
  if (ex.due) {
    return refused('leg-expired');
  }

  // --- (3) identity ---------------------------------------------------------------------
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

  // --- (3.5) separation of duties (SPEC §10.1: deciding includes declining) ------------
  if (sodViolated(record, leg, identity, recordId, 'decline')) {
    return refuseMaybeAppend(store, 'sod-violation', leg, chain, resolved, finalLeg, now);
  }

  // --- (4) content-drift — the decline is about THIS content or it does not land -------
  const recomputed = digest(canonicalize(resolved.canonicalizer(content)));
  if (recomputed !== record.contentDigest) {
    return refuseMaybeAppend(store, 'content-drift', leg, chain, resolved, finalLeg, now);
  }

  // --- (5) facts — the decline binds what the decider saw when they said no ------------
  const factsCheck = isValidFacts(facts);
  if (!factsCheck.ok) {
    return refuseMaybeAppend(store, 'consultation-missing', leg, chain, resolved, finalLeg, now);
  }

  // --- (5.5) eligibility ONLY (SPEC §10.4; the "authority yes, evidence no" ruling):
  //     declared requiredConsultations are NOT iterated and rung (5.7) does not run —
  //     those rungs protect the approval. Eligibility's own trip mapping and its AL2
  //     freshness bound apply unchanged. ------------------------------------------------
  if (leg.eligibility !== undefined) {
    const marker = supplied.unreachable.find((m) => m.kind === 'eligibility');
    if (marker !== undefined) {
      return unavailable(marker.authority);
    }
    const obtained = supplied.obtained.find((entry) => entry.kind === 'eligibility');
    if (obtained === undefined) {
      return refuseMaybeAppend(store, 'consultation-missing', leg, chain, resolved, finalLeg, now);
    }
    if (obtained.verdict === 'fail') {
      return refuseMaybeAppend(store, 'ineligible', leg, chain, resolved, finalLeg, now);
    }
    const bound =
      leg.freshness !== undefined && Object.hasOwn(leg.freshness, 'eligibility')
        ? leg.freshness.eligibility
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
        return refuseMaybeAppend(store, 'consultation-stale', leg, chain, resolved, finalLeg, now);
      }
    }
  }

  // --- (6) success batch: [chain-verify, facts, …obtained consultations, declined] -----
  const nowIso = now().toISOString();
  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('decline: empty chain — callers hold a loaded chain');
  }
  const headDigest = transitionDigest(last);

  const chainVerifyConsultation: Consultation = {
    kind: 'chain-verify',
    checker: SYSTEM_CHECKER,
    at: nowIso,
    payloadDigest: headDigest,
    verdict: 'pass',
  };
  const factsConsultation: Consultation = {
    kind: 'facts',
    checker: facts.checker,
    at: nowIso,
    payloadDigest: digest(factsCheck.canonical),
    verdict: 'pass',
  };

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
  // `declined` is terminal under every leg/effect-seam combination (SPEC §2) — the
  // derivation, never a literal: nonTerminal matches no disjunct for it.
  const declinedTransition: Transition = {
    recordId,
    seq: seqBase + 3 + suppliedTransitions.length,
    at: nowIso,
    kind: 'declined',
    payload: { actor: identity },
    prevHash: suppliedPrevHash,
  };

  const postBatch: AppendMeta = {
    nonTerminal: nonTerminal('declined', finalLeg, resolved.effectSeam), // false
    // no dueAt: a terminal append clears the pending-clock column by omission (SPEC §12)
  };
  const res = await store.appendBatch(
    'open',
    [cvTransition, factsTransition, ...suppliedTransitions, declinedTransition],
    postBatch,
  );
  if (!res.appended) {
    if (res.conflict === 'seq') {
      throw new Error(
        `decline: batch append conflict ('seq') at element ${res.index}. Under this build's ` +
          'single-writer bound, with a Store honouring the compare-and-swap contract, no ' +
          'conflict is reachable here — a storage fault; the batch is all-or-nothing: ' +
          'nothing was appended and the record is unchanged.',
      );
    }
    return refused('record-not-open');
  }
  const declinedDigest = res.transitionDigests.at(-1);
  if (declinedDigest === undefined) {
    throw new Error(
      'decline: appendBatch reported success with no digests — a conforming Store returns ' +
        'one digest per element',
    );
  }
  return ok({ recordId, state: 'declined', transitionRef: declinedDigest });
}
