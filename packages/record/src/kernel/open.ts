// @vidimera/record — kernel/open.ts: the operator-only record-creating seam (SPEC §9
// `open(stagedRef, {...})`). `open(stagedRef)`:
//   1. read the staged draft (missing -> a caller error, THROWS — see below);
//   2. resolve the draft's profile fail-CLOSED (unconfigured -> `refused('unknown-profile')`,
//      NO append — open() never trusts a staged profileId blindly);
//   3. mint an opaque `recordId`, build the genesis `opened` transition (payload carries
//      `profileDigest` over the data-only projection), CAS-append with
//      `expectedCurrentState:null`;
//   4. on `conflict:'exclusivity'` (a non-terminal record already holds (profile, subject)),
//      run the gated expire-then-retry via the `blockingRecordId` locator (SPEC §12).
//
// Missing-stagedRef choice (the SPEC names NO RefusalCode for it): open() is operator-only,
// and a `stagedRef` that resolves to no draft is a CALLER error — the host must have
// obtained it from a prior `stage()`. No CORE RefusalCode fits (`unknown-profile` names a
// profile, not a staged draft; the union is contract-fixed — do not invent one),
// so open() THROWS, mirroring `replay()`/`verifyChain()`'s "a record that does not exist is
// a caller error" posture (SPEC §8). This is distinct from the reserved store/infra-fault
// exceptions; nothing was recorded here either.

import { genesisPrevHash } from '../chain/encoding.js';
import { replay } from '../chain/replay.js';
import { governedUnavailable, type OpenOptions } from '../config.js';
import type { KernelContext } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import { profileDigest } from '../profile-digest.js';
import type { Transition } from '../types.js';
import { expireIfDue } from './expiry.js';

/**
 * Per-key GOVERNED message for an `open()` options key (config.ts's `OpenOptions`): the
 * `supersedes` case is the one this build step actually needs to guard (no profile-level
 * construction switch reaches it — see `OpenOptions`'s doc comment); `priorRecordRefs` and
 * `policyDigest` are named too, in case a caller passes them anyway, since neither has a
 * runtime check elsewhere either. Anything else falls back to a generic message.
 */
function openOptionMessage(key: string): string {
  if (key === 'supersedes') {
    return governedUnavailable(
      key,
      'recovery linkage to a terminal predecessor record is not implemented in this build. Contract: §2 and §9.',
    );
  }
  if (key === 'priorRecordRefs') {
    return governedUnavailable(
      key,
      'multi-leg prior-leg reference verification is not implemented in this build. Contract: §10.1.',
    );
  }
  if (key === 'policyDigest') {
    return governedUnavailable(
      key,
      'policy-drift notarization is not implemented in this build. Contract: §10.3.',
    );
  }
  return governedUnavailable(key, 'open() accepts no options in this build. Contract: §9.');
}

export async function open(
  ctx: KernelContext,
  stagedRef: string,
  opts?: OpenOptions,
): Promise<Outcome<{ recordId: string }>> {
  if (opts !== undefined) {
    for (const key of Object.keys(opts)) {
      throw new Error(openOptionMessage(key));
    }
  }

  const { store, profiles, now, mintId } = ctx;

  const staged = await store.getStaged(stagedRef);
  if (staged === null) {
    throw new Error(
      `open: unknown stagedRef '${stagedRef}' — no staged draft (call stage() first); ` +
        'a stagedRef that resolves to nothing is a caller error, not a domain refusal',
    );
  }

  const resolved = profiles.get(staged.profileId);
  if (resolved === undefined) {
    // Fail-closed: open() re-validates the draft's profile and never trusts it blindly.
    return refused('unknown-profile');
  }
  const { profile, effectSeam } = resolved;

  // The staged draft's legId must still name a leg of the profile it resolves under here
  // (SPEC §8's SECOND `unknown-leg` producer — the FIRST is `stage()`'s own caller-named-
  // legId check, kernel/stage.ts). A profile can be reconfigured between stage() and
  // open() (e.g. two create() instances sharing one Store under different leg ids for the
  // same profile id) — without this re-check a stale legId would mint a record that can
  // never resolve a leg at finalize() time. Fail-closed, pre-record: no draft is consumed
  // into a record, no append, no transitionRef (`unknown-leg` never appends).
  const legIndex = profile.legs.findIndex((leg) => leg.id === staged.legId);
  if (legIndex === -1) {
    return refused('unknown-leg');
  }

  // Build the genesis `opened` transition (SPEC §4's payload shapes / opened snapshot).
  const recordId = mintId();
  const openedPayload: {
    profileId: string;
    profileDigest: string;
    legId: string;
    subjectRef: string;
    contentDigest: string;
  } = {
    profileId: staged.profileId,
    profileDigest: profileDigest(profile),
    legId: staged.legId,
    subjectRef: staged.subjectRef,
    contentDigest: staged.contentDigest,
    // policyDigest: omitted — no policySource in this build (GOVERNED-throw-guarded;
    // SPEC §4's opened payload).
  };
  const openedTransition: Transition = {
    recordId,
    seq: 1,
    at: now().toISOString(),
    kind: 'opened',
    payload: openedPayload,
    prevHash: genesisPrevHash(recordId),
  };
  // state 'open' -> always non-terminal (computed via the helper for honesty).
  const openedNonTerminal = nonTerminal(
    'open',
    isFinalLeg(legIndex, profile.legs.length),
    effectSeam,
  );

  const first = await store.appendTransition(null, openedTransition, openedNonTerminal);
  if (first.appended) {
    return ok({ recordId });
  }
  if (first.conflict !== 'exclusivity') {
    // A genesis `state-mismatch` (the freshly-minted recordId already exists — a UUID
    // collision, cryptographically negligible) or a `seq` conflict on a seq we set to 1:
    // a should-never-happen invariant violation, not a domain refusal.
    throw new Error(
      `open: unexpected genesis append conflict '${first.conflict}' for freshly-minted recordId '${recordId}'`,
    );
  }

  // --- C1 exclusivity: gated expire-then-retry (SPEC §12's C1) --------------------------
  // A non-terminal record already holds (profileId, subjectRef); `blockingRecordId` names it.
  const blockerChain = await store.readChain(first.blockingRecordId);
  const blocker = replay(blockerChain);

  if (blocker.state !== 'open') {
    // A NON-open non-terminal blocker (an effect-seam `confirmed`/`redeeming` awaiting
    // redemption) never expires here — record-exists directly, NO open-state CAS.
    // `record-exists` NEVER carries a transitionRef.
    return refused('record-exists');
  }

  // The blocker shares (profileId, subjectRef) with our genesis payload (C1 keys on both),
  // so its profile IS `resolved` — pass it for the expired transition's ttl + nonTerminal.
  // expireIfDue gates on `openedAt + ttl < now` (expiry:'none' ⇒ never due).
  const ex = await expireIfDue(store, blockerChain, resolved, now());
  if (!ex.expired) {
    // The blocker is open but has NOT lapsed (or the profile is expiry:'none') — no CAS was
    // attempted; the live record still holds -> record-exists.
    return refused('record-exists');
  }
  if (!ex.result.appended) {
    // A race flipped the blocker away from 'open' between our read and the expire CAS
    // (`conflict:'state-mismatch'`/`'seq'`) -> record-exists, and NEVER re-loop.
    return refused('record-exists');
  }

  // The blocker is expired (now terminal); retry the genesis open EXACTLY ONCE.
  const retry = await store.appendTransition(null, openedTransition, openedNonTerminal);
  if (retry.appended) {
    return ok({ recordId });
  }
  // A second exclusivity (or any) conflict on the single retry -> record-exists, no loop.
  return refused('record-exists');
}
