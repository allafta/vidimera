// @vidimera/record — kernel/supersedes.ts: SPEC §2 "Recovery (`supersedes`)" — the
// verify-by-replay discipline at the recovery relation (the kernel/prior-legs.ts
// precedent). Landed at the step-8 recovery increment. Decisions of record, argued in
// docs/process/implementation-status.md and OPEN-QUESTIONS.md §3:
//  - the dedicated never-append code `supersedes-unverified` covers EVERY failure;
//  - exclusivity is SEQUENTIAL (verify-then-open): terminality is one-way in this
//    model, so a verified-terminal predecessor cannot be raced back to non-terminal;
//    the genesis append rides the ordinary constraint unchanged;
//  - verification is a PURE READ — no en-passant resolution of the predecessor's
//    clock (SPEC §4's seal posture, "the operator sweeps first"): a lapsed-but-unswept
//    open predecessor replays as open, non-terminal, and refuses;
//  - the same-subject/any-profile tightening: the predecessor decided THIS subject;
//    a revised-profile re-open (SPEC §10.3's "disposal-and-re-open recovery") stays
//    possible.
//
// The AL2 enforcement increment folds the signature layer into this same
// verify-by-replay discipline: a signature-broken predecessor refuses
// `supersedes-unverified` exactly as a hash-broken or wrong-head one does —
// `signatureLayerHolds` is consulted immediately after AL1 intactness, never before it.

import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import type { KernelContext } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { SupersedesRef } from '../types.js';
import { signatureLayerHolds } from './verify-signatures.js';

export type SupersedesCheck = { ok: true; verified: SupersedesRef } | { ok: false };

/** Argument-depth shape validation (the established intake class): a malformed
 * supersedes claim is a caller error that throws before any chain loads. */
export function validateSupersedesShape(value: unknown): asserts value is SupersedesRef {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('open: supersedes must be a plain { recordId, chainHead } object (SPEC §2)');
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== 'recordId' && key !== 'chainHead') {
      throw new Error(
        `open: supersedes carries the unknown key '${key}' — the shape is exact (SPEC §2)`,
      );
    }
  }
  if (typeof record.recordId !== 'string' || record.recordId.length === 0) {
    throw new Error('open: supersedes has a missing or empty recordId — a caller error (SPEC §2)');
  }
  if (typeof record.chainHead !== 'string' || record.chainHead.length === 0) {
    throw new Error('open: supersedes has a missing or empty chainHead — a caller error (SPEC §2)');
  }
}

/**
 * Verify the recovery claim: the predecessor's chain must exist, verify intact, match
 * the claimed head, be TERMINAL by the derived formula (SPEC §2), and have decided the
 * SAME subject. `confirmed` is the one state whose terminality needs the PREDECESSOR's
 * profile (final-leg + effect-seam judgment) — unresolvable there fails closed. A
 * NON-final leg's `confirmed` qualifies too, by that same formula (`isFinalLeg` false
 * makes `nonTerminal('confirmed', false, effectSeam)` false regardless of effect seam):
 * it is terminal FOR THAT LEG even though the predecessor's own flow may still proceed
 * to its next leg (SPEC §2) — this check reads only the named record's own leg, never
 * the whole multi-leg flow, and treats that leg's terminality as sufficient on its own.
 * Every failure is one refusal, `supersedes-unverified`, mapped by the caller.
 */
export async function verifySupersedes(
  ctx: KernelContext,
  ref: SupersedesRef,
  subjectRef: string,
): Promise<SupersedesCheck> {
  const { store, profiles } = ctx;
  const chain = await store.readChain(ref.recordId);
  if (chain.length === 0) return { ok: false }; // an absent claim cannot be replayed
  if (!verifyChain(chain).intact) return { ok: false };
  // The AL2 enforcement increment folds the signature layer into this same arm.
  if (!(await signatureLayerHolds(ctx, chain))) return { ok: false };
  const last = chain.at(-1);
  if (last === undefined) return { ok: false };
  if (transitionDigest(last) !== ref.chainHead) return { ok: false };
  const record = replay(chain);
  if (record.subjectRef !== subjectRef) return { ok: false };
  if (record.state === 'open' || record.state === 'redeeming') return { ok: false };
  if (record.state === 'confirmed') {
    const resolved = profiles.get(record.profileId);
    if (resolved === undefined) return { ok: false }; // terminality unprovable — fail closed
    const legIndex = resolved.profile.legs.findIndex((l) => l.id === record.legId);
    if (legIndex === -1) return { ok: false };
    const finalLeg = isFinalLeg(legIndex, resolved.profile.legs.length);
    if (nonTerminal('confirmed', finalLeg, resolved.effectSeam)) return { ok: false };
  }
  // refused / expired / redeemed / redemption-failed: terminal regardless of profile.
  return { ok: true, verified: { recordId: ref.recordId, chainHead: ref.chainHead } };
}
