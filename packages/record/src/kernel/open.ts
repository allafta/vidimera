// @vidimera/record — kernel/open.ts (design §3 OperatorSurface.open / §5 "opened snapshot"
// + "Exclusivity" + "Clocks en passant" / §9 "recordId minting" + "OQ2-10 minimal locator
// pulled forward", S-2): the operator-only record-creating seam. `open(stagedRef)`:
//   1. read the staged draft (missing -> a caller error, THROWS — see below);
//   2. resolve the draft's profile fail-CLOSED (unconfigured -> `refused('unknown-profile')`,
//      NO append — open() never trusts a staged profileId blindly);
//   3. mint an opaque `recordId`, build the genesis `opened` transition (payload carries
//      `profileDigest` over the data-only projection), CAS-append with
//      `expectedCurrentState:null`;
//   4. on `conflict:'exclusivity'` (a non-terminal record already holds (profile, subject)),
//      run the S-2 gated expire-then-retry via the `blockingRecordId` locator.
//
// Missing-stagedRef choice (design names NO RefusalCode for it): open() is operator-only,
// and a `stagedRef` that resolves to no draft is a CALLER error — the host must have
// obtained it from a prior `stage()`. No CORE RefusalCode fits (`unknown-profile` names a
// profile, not a staged draft; the union is contract-fixed this slice — do not invent one),
// so open() THROWS, mirroring `replay()`/`verifyChain()`'s "a record that does not exist is
// a caller error" posture. Flagged for the Task-12 SPEC reconciliation (whether the registry
// wants an `unknown-staged` code). This is distinct from the reserved store/infra-fault
// exceptions; nothing was recorded here either.

import { genesisPrevHash } from '../chain/encoding.js';
import { replay } from '../chain/replay.js';
import type { KernelContext } from '../create.js';
import { mintRecordId } from '../id.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import { profileDigest } from '../profile-digest.js';
import type { Transition } from '../types.js';
import { expireIfDue } from './expiry.js';

export async function open(
  ctx: KernelContext,
  stagedRef: string,
): Promise<Outcome<{ recordId: string }>> {
  const { store, profiles, now } = ctx;

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

  // Build the genesis `opened` transition (design §3 payload shapes + §5 "opened snapshot").
  const recordId = mintRecordId();
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
    // policyDigest: omitted — no policySource at slice 3 (GOVERNED-throw-guarded).
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
  const openedNonTerminal = nonTerminal('open', isFinalLeg(0, profile.legs.length), effectSeam);

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

  // --- C1 exclusivity: S-2 gated expire-then-retry (design §5 / §9 OQ2-10) --------------
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
