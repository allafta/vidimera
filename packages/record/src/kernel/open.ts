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
// obtained it from a prior `stage()`. No REGISTRY RefusalCode fits (`unknown-profile` names a
// profile, not a staged draft; the union is contract-fixed — do not invent one),
// so open() THROWS, mirroring `replay()`/`verifyChain()`'s "a record that does not exist is
// a caller error" posture (SPEC §8). This is the caller-error half of the exceptions
// `outcome.ts` reserves; nothing was recorded here either.

import { genesisPrevHash } from '../chain/encoding.js';
import { replay } from '../chain/replay.js';
import { governedUnavailable, type OpenOptions } from '../config.js';
import type { KernelContext } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import { profileDigest } from '../profile-digest.js';
import type { AppendMeta } from '../store/store.js';
import type { IdentityAssertion, RecordedPriorLegRef, Transition } from '../types.js';
import { expiryDeadlineMs, resolveDueClock } from './expiry.js';
import { verifyPriorLegs } from './prior-legs.js';

/**
 * Per-key GOVERNED message for an `open()` options key (config.ts's `OpenOptions`): the
 * `supersedes` case is the one this build step actually needs to guard (no profile-level
 * construction switch reaches it — see `OpenOptions`'s doc comment). `priorRecordRefs` is
 * no longer guarded here — it is real as of the first step-4 increment, verified by
 * `verifyPriorLegs` (`kernel/prior-legs.ts`) at the sequencing rung below; `policyDigest`
 * is likewise real as of the second step-6 increment, checked by the binding contract
 * below. Anything else falls back to a generic message.
 */
function openOptionMessage(key: string): string {
  if (key === 'supersedes') {
    return governedUnavailable(
      key,
      'recovery linkage to a terminal predecessor record is not implemented in this build. Contract: §2 and §9.',
    );
  }
  return governedUnavailable(
    key,
    'open() accepts only priorRecordRefs and policyDigest in this build. Contract: §9.',
  );
}

export async function open(
  ctx: KernelContext,
  stagedRef: string,
  opts?: OpenOptions,
): Promise<Outcome<{ recordId: string }>> {
  if (opts !== undefined) {
    for (const key of Object.keys(opts)) {
      if (key === 'priorRecordRefs') continue; // REAL as of the first step-4 increment
      if (key === 'policyDigest') continue; // REAL as of the second step-6 increment
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

  // --- §10.3: the policy binding contract (second step-6 increment) --------------------
  // Fail-closed BOTH directions and loud — a caller/config error, never a refusal: the
  // operator is the only party who may attest the drift baseline, and an unbound
  // declaring record (or a bound non-declaring one) is a host contract violation.
  if (resolved.profile.policySource !== undefined) {
    if (opts?.policyDigest === undefined || opts.policyDigest.length === 0) {
      throw new Error(
        `open: profile '${staged.profileId}' declares policySource but no policyDigest was supplied — ` +
          'the operator binds the drift baseline at open(), fail-closed and loud (SPEC §10.3)',
      );
    }
  } else if (opts?.policyDigest !== undefined) {
    throw new Error(
      `open: profile '${staged.profileId}' declares no policySource but a policyDigest was supplied — ` +
        'binding a drift baseline on a non-declaring profile is a caller error (SPEC §10.3)',
    );
  }

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

  // --- SPEC §10.1 sequencing (first step-4 increment): verify prior-leg references BEFORE
  // the record exists. "open() enforces the sequencing before it creates the successor
  // record" — so a bad reference refuses `prior-leg-unverified` (pre-record, NO append)
  // even when a C1 blocker also holds the pair, and the blocker path below is never
  // reached with unverified references.
  const priorCheck = await verifyPriorLegs(
    store,
    resolved,
    legIndex,
    staged.subjectRef,
    opts?.priorRecordRefs,
  );
  if (!priorCheck.ok) {
    return refused('prior-leg-unverified');
  }

  // Build the genesis `opened` transition (SPEC §4's payload shapes / opened snapshot).
  const recordId = mintId();
  const openedPayload: {
    profileId: string;
    profileDigest: string;
    legId: string;
    subjectRef: string;
    contentDigest: string;
    policyDigest?: string;
    priorRecordRefs?: RecordedPriorLegRef[];
    priorLegActors?: IdentityAssertion[];
  } = {
    profileId: staged.profileId,
    profileDigest: profileDigest(profile),
    legId: staged.legId,
    subjectRef: staged.subjectRef,
    contentDigest: staged.contentDigest,
  };
  if (resolved.profile.policySource !== undefined && opts?.policyDigest !== undefined) {
    openedPayload.policyDigest = opts.policyDigest;
  }
  if (priorCheck.verified !== null) {
    // SPEC §4: the recorded three-field form and the library-derived actors, present
    // together on a multi-leg successor; a first leg and every single-leg record omit
    // both, keeping undeclaring chains byte-identical.
    openedPayload.priorRecordRefs = priorCheck.verified.priorRecordRefs;
    openedPayload.priorLegActors = priorCheck.verified.priorLegActors;
  }
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
  const deadlineMs = expiryDeadlineMs(openedTransition.at, profile.expiry);
  const genesisMeta: AppendMeta = {
    nonTerminal: openedNonTerminal,
    // SPEC §12: presence sets the pending-clock column. This genesis append is the open
    // ttl window's producer. The effect-seam `confirmToRedeem` window and the `redeeming`
    // window are §9.1's other two clocks; both have their own producers as of the third
    // step-3 increment (finalize's success batch; beginRedemption), and this seam now
    // OBSERVES the confirmed window too — the C1 exclusivity branch below resolves a
    // due-confirmed blocker en passant, the same expire-then-retry shape as the open
    // window it already handled.
    ...(deadlineMs === null ? {} : { dueAt: new Date(deadlineMs).toISOString() }),
  };

  const first = await store.appendTransition(null, openedTransition, genesisMeta);
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

  if (blocker.state === 'redeeming') {
    // §4's named exception, verbatim: "`open()`'s exclusivity check never auto-resolves
    // a `redeeming` blocker, due or not — it refuses `record-exists`, leaving that edge
    // to the redemption seam's own clock." No CAS, no edge, ever.
    return refused('record-exists');
  }
  if (blocker.state !== 'open' && blocker.state !== 'confirmed') {
    // Defensive: a terminal blocker cannot hold C1; a coherent store never names one.
    return refused('record-exists');
  }
  // An `open` blocker rides the open window; a `confirmed` effect-seam blocker rides the
  // confirmToRedeem window (third step-3 increment — the un-stranding §9.1 promises:
  // "without it, a lost redemption token strands the record... indefinitely" is the
  // redeemBound half; this is the confirmed half). Same expire-then-retry-ONCE shape
  // either way; resolveDueClock picks the window from the replayed state.
  const ex = await resolveDueClock(store, blockerChain, resolved, now());
  if (!ex.due) {
    // The blocker's window (open or confirmed) has NOT elapsed — no CAS was attempted;
    // the live record still holds -> record-exists.
    return refused('record-exists');
  }
  if (!ex.result.appended) {
    // A race flipped the blocker away from its resolveDueClock-observed state between our
    // read and the expire CAS (`conflict:'state-mismatch'`/`'seq'`) -> record-exists, and
    // NEVER re-loop.
    return refused('record-exists');
  }

  // The blocker is expired (now terminal); retry the genesis open EXACTLY ONCE.
  const retry = await store.appendTransition(null, openedTransition, genesisMeta);
  if (retry.appended) {
    return ok({ recordId });
  }
  // A second exclusivity (or any) conflict on the single retry -> record-exists, no loop.
  return refused('record-exists');
}
