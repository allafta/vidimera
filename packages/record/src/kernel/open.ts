// @vidimera/record — kernel/open.ts: the operator-only record-creating seam (SPEC §9
// `open(stagedRef, {...})`). `open(stagedRef)`:
//   0. snapshot the caller's options: each value it will use, read ONCE (see below);
//   1. read the staged draft (missing -> a caller error, THROWS — see below), check that it
//      re-derives to `stagedRef` and that its subject meets stage()'s rule (either failing
//      THROWS too — `checkedDraft`, below);
//   2. resolve the draft's profile fail-CLOSED (unconfigured -> `refused('unknown-profile')`,
//      NO append — open() never trusts a staged profileId blindly);
//   3. mint an opaque `recordId`, build the genesis `opened` transition (payload carries
//      `profileDigest` over the data-only projection), CAS-append with
//      `expectedCurrentState:null`;
//   4. on `conflict:'exclusivity'` (a non-terminal record already holds (profile, subject)),
//      run the gated expire-then-retry via the `blockingRecordId` locator (SPEC §12); a
//      blocker that is already terminal when read (a racer freed the pair) takes the same
//      single retry with no expiry.
//
// Missing-stagedRef choice (the SPEC names NO RefusalCode for it): open() is operator-only,
// and a `stagedRef` that resolves to no draft is a CALLER error — the host must have
// obtained it from a prior `stage()`. No REGISTRY RefusalCode fits (`unknown-profile` names a
// profile, not a staged draft; the union is contract-fixed — do not invent one),
// so open() THROWS, mirroring `replay()`/`verifyChain()`'s "a record that does not exist is
// a caller error" posture (SPEC §8). This is the caller-error half of the exceptions
// `outcome.ts` reserves; nothing was recorded here either.

import { assertChainFor } from '../chain/binding.js';
import { genesisPrevHash } from '../chain/encoding.js';
import { replay } from '../chain/replay.js';
import { type OpenOptions, type PriorRecordRef, unknownOptionKey } from '../config.js';
import type { KernelContext } from '../create.js';
import { deriveStagedRef } from '../id.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import type { AppendMeta } from '../store/store.js';
import { subjectRefProblem } from '../subject-ref.js';
import type {
  IdentityAssertion,
  RecordedPriorLegRef,
  StagedDraft,
  SupersedesRef,
  Transition,
} from '../types.js';
import {
  appendConflictFault,
  CONFIRMED_SEQ_WHY,
  expiryDeadlineMs,
  resolveDueClock,
} from './expiry.js';
import {
  assertDigestForm,
  assertIdArg,
  assertOptionsBag,
  assertWellFormedString,
} from './intake.js';
import { verifyPriorLegs } from './prior-legs.js';
import { type SupersedesCheck, validateSupersedesShape, verifySupersedes } from './supersedes.js';

export async function open(
  ctx: KernelContext,
  stagedRef: string,
  opts?: OpenOptions,
): Promise<Outcome<{ recordId: string }>> {
  assertIdArg('open', 'stagedRef', stagedRef);
  assertOptionsBag('open', opts);
  // Every documented `open()` options key is real, each as of its own increment
  // (`priorRecordRefs` since the first step-4 increment, `policyDigest` since the
  // second step-6 increment, `supersedes` since the step-8 recovery increment,
  // `proposed` since the proposal-provenance increment); anything else is a genuinely
  // unknown key and throws (config.ts's `unknownOptionKey`) — a
  // caller/config error, never a domain refusal.
  if (opts !== undefined) {
    for (const key of Object.keys(opts)) {
      if (key === 'priorRecordRefs') continue; // REAL as of the first step-4 increment
      if (key === 'policyDigest') continue; // REAL as of the second step-6 increment
      if (key === 'supersedes') continue; // REAL as of the step-8 recovery increment
      if (key === 'proposed') continue; // REAL as of the proposal-provenance increment
      throw new Error(
        unknownOptionKey(
          key,
          'open() accepts only priorRecordRefs, policyDigest, supersedes, and proposed in this build. Contract: §9.',
        ),
      );
    }
  }
  // --- The option snapshot (the staged-integrity increment): every caller-supplied value
  // open() uses is read ONCE, here, into plain locals, and every later check and binding uses
  // only those. A host that mutates its own argument mid-call, or passes an accessor whose
  // value changes, cannot get a value into the genesis that no check saw (a recorded
  // `supersedes` naming a record never verified; a declaring genesis bound with no
  // `policyDigest`). An accessor that throws here propagates as the caller error it is.
  //
  // Argument-depth shape validation for a present supersedes claim
  // (kernel/supersedes.ts's validateSupersedesShape): a malformed claim throws here,
  // BEFORE any chain loads; a well-formed one comes back as the two fields it checked.
  const supersedesClaim = opts?.supersedes;
  const supersedes =
    supersedesClaim === undefined ? undefined : validateSupersedesShape(supersedesClaim);
  // Argument-depth shape validation for a present proposed claim (SPEC §9's provenance
  // option): a malformed claim throws here, BEFORE any store read; a well-formed one comes
  // back as the stagedRef it checked.
  const proposedClaim = opts?.proposed;
  const proposedRef =
    proposedClaim === undefined ? undefined : validateProposedShape(proposedClaim);
  const priorRecordRefs = snapshotPriorRecordRefs(opts?.priorRecordRefs);
  const policyDigest = opts?.policyDigest;
  // A supplied policyDigest is a string of SPEC §7's form. An empty one keeps the policy
  // binding contract's own message below (declaring: not supplied; non-declaring: supplied).
  if (policyDigest !== undefined) {
    if (typeof policyDigest !== 'string') {
      throw new Error(
        'open: policyDigest must be a string of digest form when supplied — a caller error (SPEC §10.3)',
      );
    }
    if (policyDigest.length > 0) assertDigestForm('open: policyDigest', policyDigest);
  }

  const { store, profiles, now, mintId } = ctx;

  const stored = await store.getStaged(stagedRef);
  if (stored === null) {
    throw new Error(
      `open: unknown stagedRef '${stagedRef}' — no staged draft (call stage() first); ` +
        'a stagedRef that resolves to nothing is a caller error, not a domain refusal',
    );
  }
  // Before any other use of the draft: it must re-derive to the reference it was read under
  // (`checkedDraft`, below). Everything after this binds these four locals, never a re-read.
  const { profileId, legId, subjectRef, contentDigest } = checkedDraft(
    stored,
    stagedRef,
    'stagedRef',
  );

  const resolved = profiles.get(profileId);
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
    if (policyDigest === undefined || policyDigest.length === 0) {
      throw new Error(
        `open: profile '${profileId}' declares policySource but no policyDigest was supplied — ` +
          'the operator binds the drift baseline at open(), fail-closed and loud (SPEC §10.3)',
      );
    }
  } else if (policyDigest !== undefined) {
    throw new Error(
      `open: profile '${profileId}' declares no policySource but a policyDigest was supplied — ` +
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
  const legIndex = profile.legs.findIndex((leg) => leg.id === legId);
  if (legIndex === -1) {
    return refused('unknown-leg');
  }

  // --- SPEC §9's provenance option (the proposal-provenance increment): resolve the
  // proposed reference BEFORE the record exists. Both failure modes are caller errors
  // (the unknown-stagedRef posture): the host holds both refs, so an unresolvable or
  // cross-triple proposal is wiring error, not a domain outcome. Record-only — nothing
  // downstream gates on the binding (SPEC §2: notarize, never evaluate).
  let proposedDigestBound: string | null = null;
  if (proposedRef !== undefined) {
    const storedProposal = await store.getStaged(proposedRef);
    if (storedProposal === null) {
      throw new Error(
        `open: unknown proposed stagedRef '${proposedRef}' — no staged draft; ` +
          'a proposed reference that resolves to nothing is a caller error, not a domain refusal (SPEC §9)',
      );
    }
    // The opened draft's check, before any other use of this one: the digest bound below is
    // the one that re-derived to `proposedRef`.
    const proposal = checkedDraft(storedProposal, proposedRef, 'proposed stagedRef');
    if (
      proposal.profileId !== profileId ||
      proposal.subjectRef !== subjectRef ||
      proposal.legId !== legId
    ) {
      throw new Error(
        `open: proposed draft '${proposedRef}' names ` +
          `('${proposal.profileId}', '${proposal.subjectRef}', '${proposal.legId}') but the opened draft names ` +
          `('${profileId}', '${subjectRef}', '${legId}') — the proposed reference must name the same ` +
          '(profileId, subjectRef, legId) as the opened draft (SPEC §9); a cross-triple proposal is a caller error',
      );
    }
    proposedDigestBound = proposal.contentDigest;
  }

  // --- SPEC §10.1 sequencing (first step-4 increment): verify prior-leg references BEFORE
  // the record exists. "open() enforces the sequencing before it creates the successor
  // record" — so a bad reference refuses `prior-leg-unverified` (pre-record, NO append)
  // even when a C1 blocker also holds the pair, and the blocker path below is never
  // reached with unverified references.
  const priorCheck = await verifyPriorLegs(ctx, resolved, legIndex, subjectRef, priorRecordRefs);
  if (!priorCheck.ok) {
    return refused('prior-leg-unverified');
  }

  // --- SPEC §2 recovery (the step-8 recovery increment): verify the supersedes claim
  // BEFORE the record exists — the same pre-record posture as the sequencing rung
  // above, and deliberately AFTER it: where both fail jointly, the prior-leg refusal
  // wins (pinned). Verification is a pure read of the predecessor (no en-passant
  // clock edge; SPEC §4's sweeps-first posture at seal is the precedent), and the
  // genesis append below rides the ordinary exclusivity constraint unchanged —
  // terminality is one-way, so the verified predecessor cannot be raced back.
  let supersedesCheck: SupersedesCheck | null = null;
  if (supersedes !== undefined) {
    supersedesCheck = await verifySupersedes(ctx, supersedes, subjectRef);
    if (!supersedesCheck.ok) {
      return refused('supersedes-unverified');
    }
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
    supersedes?: SupersedesRef;
    proposedDigest?: string;
  } = {
    profileId,
    profileDigest: resolved.profileDigest,
    legId,
    subjectRef,
    contentDigest,
  };
  if (resolved.profile.policySource !== undefined && policyDigest !== undefined) {
    openedPayload.policyDigest = policyDigest;
  }
  if (priorCheck.verified !== null) {
    // SPEC §4: the recorded three-field form and the library-derived actors, present
    // together on a multi-leg successor; a first leg and every single-leg record omit
    // both, keeping undeclaring chains byte-identical.
    openedPayload.priorRecordRefs = priorCheck.verified.priorRecordRefs;
    openedPayload.priorLegActors = priorCheck.verified.priorLegActors;
  }
  if (supersedesCheck?.ok) {
    // SPEC §2: the verified reference, recorded in the recovering record's genesis
    // snapshot — present-iff-supplied, so a non-recovery open() stays byte-identical.
    openedPayload.supersedes = supersedesCheck.verified;
  }
  if (proposedDigestBound !== null) {
    // SPEC §2's provenance binding: the resolved proposal digest, present-iff-supplied,
    // so a non-supplying open() stays byte-identical (the supersedes mechanism).
    openedPayload.proposedDigest = proposedDigestBound;
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
  // The genesis meta for a genesis stamped `atIso` — computed from the stamp it rides with,
  // so a re-stamped retry (below) carries a window that follows its own reading.
  const genesisMetaFor = (atIso: string): AppendMeta => {
    const deadlineMs = expiryDeadlineMs(atIso, profile.expiry);
    return {
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
  };
  const genesisMeta = genesisMetaFor(openedTransition.at);

  // A genesis conflict other than exclusivity — a `state-mismatch` (the freshly-minted
  // recordId already exists — a UUID collision, cryptographically negligible) or a `seq`
  // conflict on a seq we set to 1 — is a should-never-happen invariant violation, not a
  // domain refusal, on the first attempt and on the retry alike.
  const unexpectedConflict = (conflict: string): Error =>
    new Error(
      `open: unexpected genesis append conflict '${conflict}' for freshly-minted recordId '${recordId}'`,
    );

  // THE SINGLE RETRY, one local for both paths that take it (the faults-and-races increment):
  // the genesis RE-STAMPED from `at` — the retried record opens at that reading, and its open
  // window follows it. When the clock has not moved the bytes are identical, so the SAME
  // object and meta are reused (one mint under signing — `signing/decorate.ts` keys its mint
  // memo by object identity). Its conflicts map as the first attempt's do: exclusivity — the
  // retry's own C1 names a live blocker — is `record-exists`, never a loop; anything else
  // throws. `expiredBlocker` names the blocker THIS call expired en passant, when it did: that
  // edge stands whatever the retry does, so a retry that fails cannot be "a storage fault where
  // nothing was recorded" — it throws an error naming the blocker, with the store's (or the
  // signer's) error as `cause`. When this call appended nothing, the failure propagates as it
  // came, the fault it is.
  const retryOnce = async (
    at: Date,
    expiredBlocker?: string,
  ): Promise<Outcome<{ recordId: string }>> => {
    const retryAt = at.toISOString();
    const reuse = retryAt === openedTransition.at;
    const retryTransition: Transition = reuse
      ? openedTransition
      : { ...openedTransition, at: retryAt };
    let failure: unknown;
    try {
      const retry = await store.appendTransition(
        null,
        retryTransition,
        reuse ? genesisMeta : genesisMetaFor(retryAt),
      );
      if (retry.appended) return ok({ recordId });
      if (retry.conflict === 'exclusivity') return refused('record-exists');
      failure = unexpectedConflict(retry.conflict);
    } catch (err) {
      failure = err;
    }
    if (expiredBlocker === undefined) throw failure;
    throw new Error(
      `open: the retried genesis failed after this call expired blocker '${expiredBlocker}' ` +
        'en passant — that edge stands (its window had elapsed; SPEC §4 appends a clock edge at ' +
        'the seam that observes the bound has passed), no record was opened, and re-invoking ' +
        "open() retries against the released pair; the failure rides as this error's cause",
      { cause: failure },
    );
  };

  const first = await store.appendTransition(null, openedTransition, genesisMeta);
  if (first.appended) {
    return ok({ recordId });
  }
  if (first.conflict !== 'exclusivity') {
    throw unexpectedConflict(first.conflict);
  }

  // --- C1 exclusivity: gated expire-then-retry (SPEC §12's C1) --------------------------
  // A non-terminal record already holds (profileId, subjectRef); `blockingRecordId` names it.
  const blockerChain = await store.readChain(first.blockingRecordId);
  // An identity check, NOT the pre-verify SPEC §5 says this en-passant path skips: a foreign
  // blocker chain throws before anything is replayed, so no edge lands on either record.
  assertChainFor(blockerChain, first.blockingRecordId, 'open');
  const blocker = replay(blockerChain);

  if (blocker.state === 'redeeming') {
    // §4's named exception, verbatim: "`open()`'s exclusivity check never auto-resolves
    // a `redeeming` blocker, due or not — it refuses `record-exists`, leaving that edge
    // to the redemption seam's own clock." No CAS, no edge, ever.
    return refused('record-exists');
  }
  if (blocker.state !== 'open' && blocker.state !== 'confirmed') {
    // Terminal under every profile. THE TWENTIETH SELF-AUTHORED STANCE INVERSION (the
    // faults-and-races increment). This arm read "Defensive: a terminal blocker cannot hold C1;
    // a coherent store never names one." and refused `record-exists` — written at the third
    // step-3 increment, when open() learned to resolve a confirmed blocker's window too. The
    // stance is false of a coherent store: the store names the blocker when it adjudicates this
    // call's genesis, and this read comes after, so a racer that decided the blocker in between
    // (a confirm, a decline, a refusal, an expiry) leaves a terminal record the store named
    // honestly. The pair is then free, `record-exists` is false of it, and re-invoking would
    // open the record. The inverted reading: a blocker terminal when read takes the single
    // retry, stamped from a fresh reading — the first stamp predates the racer's edge — and
    // answers `record-exists` only when the retry's own C1 names a live blocker. This call
    // appended nothing. No test assertion inverts: the old arm was unpinned.
    return retryOnce(now());
  }
  // The profile-drift gate: this instance may expire the blocker en passant only if it HOLDS
  // the blocker's profile — the blocker's genesis binding must be the digest this instance's
  // same-id profile digests to (SPEC §4). Otherwise the windows `resolveDueClock` would read
  // from `resolved` are not the blocker's rules, and the `expired` edge would be a write into
  // a record this instance does not hold. The blocker stands: `record-exists`, never-append —
  // the code this seam already speaks for a blocker it may not resolve (the `redeeming` one
  // above). Recovery is the version discipline: a new profile id is a new pair.
  if (blocker.profileDigest !== resolved.profileDigest) {
    return refused('record-exists');
  }
  // A `confirmed` blocker is terminal unless it awaits redemption — a final leg on an
  // effect-seam profile (SPEC §2's derivation, `nonterminal.ts`). Held, its profile is this
  // instance's, so the derivation can be read here: a terminal `confirmed` (a capture leg, or
  // a non-final one) means a racer confirmed the blocker after the store named it, the same
  // freed pair as the arm above, and takes the same single retry.
  if (
    blocker.state === 'confirmed' &&
    !nonTerminal(
      'confirmed',
      isFinalLeg(
        profile.legs.findIndex((leg) => leg.id === blocker.legId),
        profile.legs.length,
      ),
      effectSeam,
    )
  ) {
    return retryOnce(now());
  }
  // An `open` blocker rides the open window; a `confirmed` effect-seam blocker rides the
  // confirmToRedeem window (third step-3 increment — the un-stranding §9.1 promises:
  // "without it, a lost redemption token strands the record... indefinitely" is the
  // redeemBound half; this is the confirmed half). Same expire-then-retry-ONCE shape
  // either way; resolveDueClock picks the window from the replayed state.
  // One reading serves the blocker's resolution edge AND the retried genesis's stamp below,
  // so the new record opens at the very instant the blocker expired — never before it.
  const resolveNow = now();
  const ex = await resolveDueClock(
    store,
    first.blockingRecordId,
    blockerChain,
    resolved,
    resolveNow,
  );
  if (!ex.due) {
    // The blocker's window (open or confirmed) has NOT elapsed — no CAS was attempted;
    // the live record still holds -> record-exists.
    return refused('record-exists');
  }
  if (!ex.result.appended) {
    // A conflict with no honest producer throws the storage fault, and appends nothing (the
    // faults-and-races increment): a `'seq'` on a CONFIRMED blocker's expiry edge, whose
    // compare-and-swap target is a state every legitimate competing append leaves
    // (`CONFIRMED_SEQ_WHY`), and an `exclusivity` conflict, which binds only a genesis. The
    // imported comment here named `'seq'` among the races this arm answers; no pinned
    // assertion covers that arm, and on the confirmed window no race produces it. A confirmed
    // blocker whose chain was edited in storage reaches this throw too (a deleted middle row:
    // open() does not verify its blocker, so the edge's `chain.length + 1` misses the store's
    // next seq) — a storage fault from this seam's view, until a verifying seam lands the
    // compromise edge and releases the pair.
    const { conflict } = ex.result;
    if (conflict === 'exclusivity' || (conflict === 'seq' && ex.window === 'confirmed')) {
      throw appendConflictFault('open', conflict, CONFIRMED_SEQ_WHY);
    }
    // A race flipped the blocker away from its resolveDueClock-observed state between our
    // read and the expire CAS (`conflict:'state-mismatch'`), or, on an OPEN blocker, a
    // finding or acknowledgment took the seq (`'seq'`: the blocker is still open and due)
    // -> record-exists, and NEVER re-loop. (Left as it is: taking the single retry here
    // would invert an inherited pinned assertion, which waits for the owner's explicit word.
    // The same arm answers a state-mismatch whose blocker never moved — a fault no racer
    // explains — `record-exists` too, since telling it apart needs the re-read the retry
    // question decides; `next-phases.md` carries both under the owner-gated item.)
    return refused('record-exists');
  }

  // The blocker is expired (now terminal) by THIS call's edge; retry the genesis open EXACTLY
  // ONCE — RE-STAMPED from the reading that stamped the expiry edge: the retried record opens
  // at the instant the blocker expired, never before it. A retry that fails names the blocker
  // whose edge stands (`retryOnce`, above).
  return retryOnce(resolveNow, first.blockingRecordId);
}

/** A staged draft's four bound fields, as `checkedDraft` read and checked them. */
type CheckedDraft = Readonly<
  Pick<StagedDraft, 'profileId' | 'legId' | 'subjectRef' | 'contentDigest'>
>;

/**
 * A staged reference is content-derived (SPEC §3, §12): `deriveStagedRef` over the draft's own
 * `contentDigest`, `profileId`, `subjectRef` and `legId`. So a draft read back under `ref` is
 * bound only if its `id` is `ref` and those four fields re-derive to `ref`. Each field is read
 * ONCE, here, and the caller binds exactly the values checked — never a second read of the
 * store's object. The four bound fields are also required to be strings: defensive, so a value
 * the serializer cannot take never reaches the digest (a missing field is already caught by the
 * derived-reference comparison). A mismatch means the persisted draft is not the one staged — edited
 * in storage between `stage()` and `open()`, or returned altered by a Store: corrupted or foreign
 * persisted data, met with SPEC §8's loud-throw posture — a throw
 * naming the reference that records nothing, never a refusal. What it does not do: authenticate
 * who staged a draft. A whole new, self-consistent draft is the digest of its own fields, so it
 * lives under a different reference and is bound only if the host asks for that one. A stated
 * limit: the re-derivation uses the default digest algorithm, not the one the reference names.
 */
function checkedDraft(draft: StagedDraft, ref: string, label: string): CheckedDraft {
  const { id, profileId, legId, subjectRef, contentDigest } = draft;
  if (
    id !== ref ||
    typeof profileId !== 'string' ||
    typeof legId !== 'string' ||
    typeof subjectRef !== 'string' ||
    typeof contentDigest !== 'string' ||
    deriveStagedRef(contentDigest, profileId, subjectRef, legId) !== ref
  ) {
    throw new Error(
      `open: the persisted draft under ${label} '${ref}' does not match it — a staged draft's id ` +
        'and the reference its fields re-derive to must both be the reference it is stored under ' +
        '(SPEC §12); a persisted draft that does not match its reference was edited in storage, ' +
        'or came back from a Store that does not round-trip it — corrupted or foreign persisted ' +
        'data, a storage fault, not a domain outcome (SPEC §8)',
    );
  }
  // After the re-derivation, so a draft failing both reports the mismatch: a tampered draft's
  // fields are not worth reading further. A draft that is intact but carries a subject stage()
  // would now refuse was persisted before that rule, or by a writer other than stage().
  const subjectProblem = subjectRefProblem(subjectRef);
  if (subjectProblem !== undefined) {
    throw new Error(
      `open: subjectRef ${subjectProblem} — the persisted draft under ${label} '${ref}' carries a ` +
        'subject stage() would not accept; it was persisted before that rule or by a writer other ' +
        'than stage(), a storage fault, not a domain outcome (SPEC §8)',
    );
  }
  return { profileId, legId, subjectRef, contentDigest };
}

/**
 * The `priorRecordRefs` half of open()'s option snapshot, shape-checked at argument depth before
 * any store read: an array, each entry a plain `{ recordId, chainHead }` — the shape exact,
 * unknown keys thrown, both fields non-empty strings (`validateSupersedesShape`'s rules, per
 * entry). Returns a fresh array holding each entry's two fields, each read once.
 */
function snapshotPriorRecordRefs(refs: unknown): PriorRecordRef[] | undefined {
  if (refs === undefined) return undefined;
  if (!Array.isArray(refs)) {
    throw new Error('open: priorRecordRefs must be an array when supplied (SPEC §10.1)');
  }
  const out: PriorRecordRef[] = [];
  for (let i = 0; i < refs.length; i++) {
    const entry: unknown = refs[i];
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new Error(
        `open: priorRecordRefs[${i}] must be a plain { recordId, chainHead } object (SPEC §10.1)`,
      );
    }
    const fields = entry as Record<string, unknown>;
    for (const key of Object.keys(fields)) {
      if (key !== 'recordId' && key !== 'chainHead') {
        throw new Error(
          `open: priorRecordRefs[${i}] carries the unknown key '${key}' — the shape is exact (SPEC §10.1)`,
        );
      }
    }
    const recordId = fields.recordId;
    if (typeof recordId !== 'string' || recordId.length === 0) {
      throw new Error(
        `open: priorRecordRefs[${i}] has a missing or empty recordId — a caller error (SPEC §10.1)`,
      );
    }
    assertWellFormedString('open', `priorRecordRefs[${i}].recordId`, recordId);
    const chainHead = fields.chainHead;
    if (typeof chainHead !== 'string' || chainHead.length === 0) {
      throw new Error(
        `open: priorRecordRefs[${i}] has a missing or empty chainHead — a caller error (SPEC §10.1)`,
      );
    }
    assertDigestForm(`open: priorRecordRefs[${i}] chainHead`, chainHead);
    out.push({ recordId, chainHead });
  }
  return out;
}

/** SPEC §9's provenance option shape: a plain object with exactly `stagedRef`, a
 * non-empty string — the validateSupersedesShape class: malformed claims throw at
 * argument depth, before any store read. Returns the `stagedRef` it checked, read once —
 * open()'s snapshot of the claim. */
function validateProposedShape(proposed: unknown): string {
  if (proposed === null || typeof proposed !== 'object' || Array.isArray(proposed)) {
    throw new Error('open: proposed must be a plain { stagedRef } object (SPEC §9)');
  }
  const keys = Object.keys(proposed);
  if (keys.length !== 1 || keys[0] !== 'stagedRef') {
    throw new Error(
      `open: proposed carries unknown keys or is missing stagedRef (found: ${keys.join(', ') || 'none'}) — ` +
        'exactly { stagedRef } (SPEC §9)',
    );
  }
  const ref = (proposed as { stagedRef: unknown }).stagedRef;
  if (typeof ref !== 'string' || ref.length === 0) {
    throw new Error('open: proposed.stagedRef must be a non-empty string (SPEC §9)');
  }
  return ref;
}
