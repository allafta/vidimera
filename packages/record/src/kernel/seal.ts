// @vidimera/record — kernel/seal.ts: the operator-only chain-retirement seam
// (SPEC §5 "Chain retirement (`sealed` / `retired`)"; §12 "Sealing (`seal` / `retired`)").
// A derived-terminal record whose chain verifies clean is capped with a state-preserving
// `sealed` transition; §12's C4 then admits no further append of any kind, and the record
// reports `retired`.
//
// The gate ladder, and why:
//   (1) chain-verify     -> chain-compromise, appending an edge where the state admits one
//   (2) resolve profile  -> unknown-profile (derived-terminality needs the leg and the profile)
//   (3) already sealed?  -> unsealable-state
//   (4) derived-terminal?-> unsealable-state
//   (5) append `sealed`  -> a non-append is a racing/duplicate seal -> unsealable-state
//
// (1) IS FIRST and outranks everything, including an already-sealed record — SPEC §5:
// "Verification is first: a record whose chain fails verification refuses `chain-compromise`
// and can never be sealed." Against a sealed record C4 admits no edge, so that combination
// surfaces result-first with no transitionRef. The AL2 enforcement increment folds the
// signature layer into this same arm (`kernel/verify-signatures.ts`'s `signatureLayerHolds`).
//
// NO EN-PASSANT EXPIRY, deliberately. `open()` and `finalize()` both call `resolveDueClock`
// (`kernel/expiry.ts`); this seam must not, and the omission is a stated rule rather than an
// oversight — SPEC §4:
// "`seal()` never appends a clock edge en passant — a record whose bound has elapsed refuses
// `unsealable-state`, and the operator sweeps first, then seals." In this build that also
// falls out of gate (4): a due-but-open record is non-terminal.

import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import type { KernelContext } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import type { AppendMeta } from '../store/store.js';
import type { Digest, Transition } from '../types.js';
import { appendChainCompromise } from './finalize.js';
import { heldProfile } from './held-profile.js';
import { assertIdArg } from './intake.js';
import { signatureLayerHolds } from './verify-signatures.js';

export async function seal(
  ctx: KernelContext,
  recordId: string,
): Promise<Outcome<{ recordId: string; status: 'retired'; transitionRef: Digest }>> {
  assertIdArg('seal', 'recordId', recordId);
  const { store, profiles, now } = ctx;

  const chain = await store.readChain(recordId);
  if (chain.length === 0) {
    throw new Error(
      `seal: unknown recordId '${recordId}' — no such record (open() first); a recordId that ` +
        'resolves to no chain is a caller error, not a domain refusal (SPEC §8)',
    );
  }

  // --- (1) chain-verify, FIRST ---------------------------------------------------------
  // AL1 intactness first; the AL2 enforcement increment folds the signature layer into
  // this same arm. Both halves are bound to the requested `recordId`.
  if (!verifyChain(chain, recordId).intact || !(await signatureLayerHolds(ctx, recordId, chain))) {
    return appendChainCompromise(store, recordId, chain, now);
  }

  const record = replay(chain);

  // --- (2) profile resolution ----------------------------------------------------------
  const resolved = heldProfile(profiles, record);
  if (resolved === undefined) {
    // Fail-closed, matching finalize's posture: not held — unregistered (refusal-matrix's
    // two-instance arm), or registered with a projection that does not digest to the record's
    // binding (the profile-drift gate). Terminality is derived from the profile; a drifted
    // one derives it wrong.
    return refused('unknown-profile');
  }
  const legIndex = resolved.profile.legs.findIndex((l) => l.id === record.legId);
  if (legIndex < 0) {
    throw new Error(
      `seal: persisted legId '${record.legId}' is absent from profile '${record.profileId}'`,
    );
  }
  const finalLeg = isFinalLeg(legIndex, resolved.profile.legs.length);

  // --- (3) already sealed ---------------------------------------------------------------
  if (record.status === 'retired') {
    return refused('unsealable-state');
  }

  // --- (4) derived-terminal -------------------------------------------------------------
  // §12 admits seal only against a derived-terminal record. Terminality is the derived
  // formula (§2), not `state` alone: a final-leg `confirmed` on an effect-seam profile is
  // NON-terminal (it awaits redemption) and is therefore unsealable.
  const stillNonTerminal = nonTerminal(record.state, finalLeg, resolved.effectSeam);
  if (stillNonTerminal) {
    return refused('unsealable-state');
  }

  // --- (5) append the seal --------------------------------------------------------------
  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('seal: empty chain — the length check above holds');
  }
  const headDigest = transitionDigest(last);
  const sealedTransition: Transition = {
    recordId,
    seq: chain.length + 1,
    at: now().toISOString(),
    kind: 'sealed',
    // `chainHead` equals `prevHash`, and that is not duplication: SPEC §4's payload table and
    // §5 both require the payload to carry the head, because after the body is archived or
    // destroyed this transition must stand alone as evidence — §5's "`sealed` chain head
    // standing in for replayable body evidence".
    payload: { chainHead: headDigest },
    prevHash: headDigest,
  };
  // State-preserving, so terminality is unchanged — reusing `stillNonTerminal` (gate (4)
  // already proved it `false`; sealing never crosses back from terminal to non-terminal, so
  // recomputing it here would be the same pure expression evaluated twice for no reason).
  // `dueAt` is omitted, which clears any pending clock: a retired record must never be swept.
  const meta: AppendMeta = { nonTerminal: stillNonTerminal };

  const res = await store.appendTransition(record.state, sealedTransition, meta);
  if (!res.appended) {
    // A racing or duplicate seal: C4 (or the state CAS) rejected it through the
    // terminal-state-mismatch path, and §12 maps that residual here.
    return refused('unsealable-state');
  }
  return ok({ recordId, status: 'retired', transitionRef: res.transitionDigest });
}
