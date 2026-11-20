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
//    possible while the predecessor's profile stays registered (id and digest).
//
// The AL2 enforcement increment folds the signature layer into this same
// verify-by-replay discipline: a signature-broken predecessor refuses
// `supersedes-unverified` exactly as a hash-broken or wrong-head one does —
// `signatureLayerHolds` is consulted immediately after AL1 intactness, never before it.
//
// The supersedes-binding increment folds the profile-drift gate's held check in for EVERY
// terminal state, as SPEC §4's fold sentence says of the two cross-record verifications: the
// instance must HOLD the predecessor's profile (id registered AND projection digesting to the
// genesis profileDigest), else the claim refuses `supersedes-unverified`. Before it, only a
// `confirmed` predecessor was held, so a forged terminal chain naming a profile this instance
// never held verified and bound — a route past the signature layer's obligation. Cost, stated:
// recovery needs the predecessor's profile kept registered (SPEC §4's version discipline).

import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import type { KernelContext } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { SupersedesRef } from '../types.js';
import { heldProfile } from './held-profile.js';
import { assertDigestForm, assertWellFormedString } from './intake.js';
import { signatureLayerHolds } from './verify-signatures.js';

export type SupersedesCheck = { ok: true; verified: SupersedesRef } | { ok: false };

/** Argument-depth shape validation (the established intake class): a malformed
 * supersedes claim is a caller error that throws before any chain loads. Returns the two
 * fields it checked, each read once — open()'s snapshot of the claim (the staged-integrity
 * increment), so the claim verified and recorded is the claim validated here. */
export function validateSupersedesShape(value: unknown): SupersedesRef {
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
  const recordId = record.recordId;
  if (typeof recordId !== 'string' || recordId.length === 0) {
    throw new Error('open: supersedes has a missing or empty recordId — a caller error (SPEC §2)');
  }
  assertWellFormedString('open', 'supersedes.recordId', recordId);
  const chainHead = record.chainHead;
  if (typeof chainHead !== 'string' || chainHead.length === 0) {
    throw new Error('open: supersedes has a missing or empty chainHead — a caller error (SPEC §2)');
  }
  assertDigestForm('open: supersedes chainHead', chainHead);
  return { recordId, chainHead };
}

/**
 * Verify the recovery claim: the predecessor's chain must exist, verify intact, match
 * the claimed head, have decided the SAME subject, be decided under a profile this instance
 * HOLDS (every state — the fold above), and be TERMINAL by the derived formula (SPEC §2).
 * `confirmed` is the one state whose terminality needs that profile's content (final-leg +
 * effect-seam judgment), read from the same held resolution. A NON-final leg's `confirmed`
 * qualifies too, by that same formula (`isFinalLeg` false makes
 * `nonTerminal('confirmed', false, effectSeam)` false regardless of effect seam): it is
 * terminal FOR THAT LEG even though the predecessor's own flow may still proceed to its next
 * leg (SPEC §2) — this check reads only the named record's own leg, never the whole
 * multi-leg flow, and treats that leg's terminality as sufficient on its own.
 * Every failure is one refusal, `supersedes-unverified`, mapped by the caller.
 */
export async function verifySupersedes(
  ctx: KernelContext,
  ref: SupersedesRef,
  subjectRef: string,
): Promise<SupersedesCheck> {
  const { store, profiles } = ctx;
  // The claim's two fields, read ONCE into locals before the first await (the staged-integrity
  // increment): the record and head every check below compares are the ones recorded, whatever
  // the caller's object does while this awaits.
  const { recordId, chainHead } = ref;
  const chain = await store.readChain(recordId);
  if (chain.length === 0) return { ok: false }; // an absent claim cannot be replayed
  // Bound to the REFERENCED id: another record's rows read back under `recordId` are a
  // break at seq 1, so the claim cannot borrow that record's terminal history.
  if (!verifyChain(chain, recordId).intact) return { ok: false };
  // The AL2 enforcement increment folds the signature layer into this same arm.
  if (!(await signatureLayerHolds(ctx, recordId, chain))) return { ok: false };
  const last = chain.at(-1);
  if (last === undefined) return { ok: false };
  if (transitionDigest(last) !== chainHead) return { ok: false };
  const record = replay(chain);
  if (record.subjectRef !== subjectRef) return { ok: false };
  // Held by id AND binding, for every state (the profile-drift gate's comparison, the one
  // verifyPriorLegs makes): a predecessor decided under rules this instance does not hold
  // cannot be held to them, nor to their signature obligation.
  const resolved = heldProfile(profiles, record);
  if (resolved === undefined) return { ok: false };
  if (record.state === 'open' || record.state === 'redeeming') return { ok: false };
  if (record.state === 'confirmed') {
    // The held profile derives terminality; a drifted one would read the wrong effect seam.
    const legIndex = resolved.profile.legs.findIndex((l) => l.id === record.legId);
    if (legIndex === -1) return { ok: false };
    const finalLeg = isFinalLeg(legIndex, resolved.profile.legs.length);
    if (nonTerminal('confirmed', finalLeg, resolved.effectSeam)) return { ok: false };
  }
  // refused / expired / declined / redeemed / redemption-failed: terminal by state alone.
  return { ok: true, verified: { recordId, chainHead } };
}
