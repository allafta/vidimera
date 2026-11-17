// @vidimera/record — kernel/prior-legs.ts: SPEC §10.1's verify-by-replay reference
// checker (the first step-4 increment), consumed by open()'s sequencing rung. "Legs
// conclude in order": a successor leg's open() carries one host-supplied
// { recordId, chainHead } per prior leg, and this module verifies EVERY reference by
// replaying the referenced chain — six conditions, each failing closed to { ok: false },
// which the CALLER maps to `prior-leg-unverified` (pre-record, never-append; SPEC §8).
// An unknown recordId REFUSES rather than throwing: the reference is host-supplied DATA
// at a mutating seam, unlike replay()/verifyChain()'s audit-read caller-error posture.
// The ONE loud throw: an intact chain that verified and replayed `confirmed` whose
// confirmed payload carries no actor to derive, or an actor that is not a valid identity —
// a storage/config fault (SPEC §8's loud-throw posture; the garbled-tokenDigest
// precedent), never a domain refusal.
//
// AL1 honesty note (SPEC §10.1): the priorLegActors this module derives live in the
// successor's genesis payload, which IS the chain head until the successor's own next
// append — over exactly that window the §0/§5 head-bound applies, and detached signing
// (SPEC §14) is the named upgrade that closes it. The AL2 enforcement increment folds
// the signature layer into this same six-condition arm (a seventh, in effect): a
// signature-broken prior leg is unverified exactly as a hash-broken or foreign one is —
// `signatureLayerHolds` is consulted immediately after AL1 intactness, never before it.

import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import type { KernelContext, ResolvedProfile } from '../create.js';
import type { IdentityAssertion, RecordedPriorLegRef } from '../types.js';
import { identitySnapshot } from './finalize.js';
import { signatureLayerHolds } from './verify-signatures.js';

export interface VerifiedPriorLegs {
  priorRecordRefs: RecordedPriorLegRef[];
  priorLegActors: IdentityAssertion[]; // paired by index with priorRecordRefs (SPEC §4)
}

export type PriorLegsResult =
  | { ok: true; verified: VerifiedPriorLegs | null } // null: a first leg — no evidence keys
  | { ok: false }; // the caller refuses `prior-leg-unverified`; WHICH condition failed is
// deliberately not distinguished (one code by the spec, and no record exists to carry a
// transitionRef)

export async function verifyPriorLegs(
  ctx: KernelContext,
  resolved: ResolvedProfile,
  legIndex: number,
  subjectRef: string,
  refs: { recordId: string; chainHead: string }[] | undefined,
): Promise<PriorLegsResult> {
  const { store } = ctx;
  if (legIndex === 0) {
    // A first leg carries no references; §10.1: "supplying any is itself a sequencing
    // error that refuses `prior-leg-unverified`".
    if (refs === undefined || refs.length === 0) return { ok: true, verified: null };
    return { ok: false };
  }
  // One entry per prior leg, in leg order — exactly legIndex of them.
  if (refs === undefined || refs.length !== legIndex) return { ok: false };

  const priorRecordRefs: RecordedPriorLegRef[] = [];
  const priorLegActors: IdentityAssertion[] = [];
  for (let i = 0; i < legIndex; i += 1) {
    const ref = refs[i];
    const expectedLeg = resolved.profile.legs[i];
    if (ref === undefined || expectedLeg === undefined) return { ok: false };

    const chain = await store.readChain(ref.recordId);
    if (chain.length === 0) return { ok: false }; // unknown recordId — and the
    // destroyed-prior posture: a chain that no longer exists cannot be replayed (§10.1)
    // Bound to the REFERENCED id: another record's rows read back under `ref.recordId` are a
    // break at seq 1, so the reference cannot borrow that record's confirmed history.
    if (!verifyChain(chain, ref.recordId).intact) return { ok: false };
    // The AL2 enforcement increment folds the signature layer into this same arm.
    if (!(await signatureLayerHolds(ctx, ref.recordId, chain))) return { ok: false };
    const last = chain.at(-1);
    if (last === undefined) return { ok: false };
    // "its recomputed head must equal the supplied `chainHead`" — the host's claim is
    // checked against the recomputation, never adopted.
    if (transitionDigest(last) !== ref.chainHead) return { ok: false };

    const prior = replay(chain);
    if (prior.profileId !== resolved.profile.id) return { ok: false };
    // The profile-drift gate: the prior leg's record must bind the same profileDigest the
    // successor's resolved profile digests to (SPEC §4, §10.1) — a flow is decided under one
    // version of its rules, and the separation-of-duties rules live in the profile.
    if (prior.profileDigest !== resolved.profileDigest) return { ok: false };
    if (prior.subjectRef !== subjectRef) return { ok: false };
    // "sit at the expected leg in order" — against the profile's declared leg order.
    if (prior.legId !== expectedLeg.id) return { ok: false };
    // "be `confirmed`" — state only; status is deliberately NOT consulted, so a sealed
    // prior (state-preserving `sealed`, status `retired`) still verifies: §10.1's "A
    // sealed prior still verifies; a destroyed one does not."
    if (prior.state !== 'confirmed') return { ok: false };

    if (prior.actor === undefined) {
      throw new Error(
        `verifyPriorLegs: prior leg record '${ref.recordId}' replays 'confirmed' with no actor in its confirmed payload — a garbled or foreign chain is a storage/config fault, not a domain outcome (SPEC §8)`,
      );
    }
    // The same fault when the recorded actor is present but not a valid identity: a recorded
    // `{}` (what a getter-backed or `Object.create`-built identity was written as before the
    // identity-snapshot increment) has no principal to compare, so carrying it forward would
    // let the successor's SoD gate pass silently. Fail closed here, and record the validated
    // literal — the shape every seam now writes — into the successor's evidence.
    const priorActor = identitySnapshot(prior.actor);
    if (priorActor === null) {
      throw new Error(
        `verifyPriorLegs: prior leg record '${ref.recordId}' replays 'confirmed' with an actor that is not a valid identity in its confirmed payload — a garbled or foreign chain is a storage/config fault, not a domain outcome (SPEC §8)`,
      );
    }
    priorRecordRefs.push({
      recordId: ref.recordId,
      chainHead: ref.chainHead,
      legId: expectedLeg.id,
    });
    priorLegActors.push(priorActor);
  }
  return { ok: true, verified: { priorRecordRefs, priorLegActors } };
}
