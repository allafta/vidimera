// @vidimera/record — kernel/findings-seams.ts: the two operator-only findings seams
// (SPEC §10.2 "The seams (record-then-gate)": "Two operator-only calls append
// mid-lifecycle transitions — the only appends between `opened` and the decision").
// Landed at the second step-7 increment, in the same commit as finalize's rung (5.7)
// and the ackMode/requiredAcks construction lift — the seams mint byte-identically the
// payloads the first step-7 increment's replay folds.
//
// The shared ladder (the several-seams-one-prologue shape kernel/redeem.ts set):
//   (0) argument intake THROWS (the validateConsultations class) before the chain loads
//   (1) chain-verify FIRST            -> chain-compromise (appendChainCompromise); the AL2
//         enforcement increment folds the signature layer into this same arm
//   (2) profile/leg resolution        -> unknown-profile; a persisted legId miss THROWS
//   (2.5) declaring check             -> THROW: SPEC §10.2, "both seams throw on a
//         record whose resolved leg declares no findings flow — so a non-declaring
//         profile can never acquire finding/ack transitions, and its chains are
//         byte-identical to a pre-findings implementation"
//   (3) state/expiry (en passant)     -> leg-expired / record-not-open (never-append)
//   (4) seam-specific semantic check  -> THROW (kind mutation; ack to absent findingId)
//   (5) append, CAS target 'open'     -> state-mismatch refuses record-not-open; a seq loss with
//         a moved head refuses record-contended (SPEC §8); an unmoved head throws
//
// The append's meta RE-SUPPLIES the open window's dueAt (SPEC §12: "present sets the
// record's pending-clock column, absent clears it") — a mid-lifecycle append that
// omitted it would disarm the sweep's clock for this record. `expiry:'none'` omits it,
// clearing nothing because nothing was set.

import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import type { LegSpec } from '../config.js';
import type { KernelContext, ResolvedProfile } from '../create.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import type { AppendMeta } from '../store/store.js';
import type {
  AcknowledgedPayload,
  DecisionRecord,
  Digest,
  FindingRaisedPayload,
  IdentityAssertion,
  Transition,
} from '../types.js';
import { expiryDeadlineMs, resolveDueClock } from './expiry.js';
import { appendChainCompromise, appendSeqConflict } from './finalize.js';
import { heldProfile } from './held-profile.js';
import { assertDigestForm, assertIdArg, assertWellFormedString, intakeIdentity } from './intake.js';
import { signatureLayerHolds } from './verify-signatures.js';

/** SPEC §10.2's `finding` argument: `{ findingId, kind, findingDigest, magnitude? }`. */
export interface FindingInput {
  findingId: string;
  kind: string;
  findingDigest: string;
  magnitude?: string;
}
/** SPEC §10.2's `ack` argument: `{ findingId, findingDigest, magnitude? }`. */
export interface AckInput {
  findingId: string;
  findingDigest: string;
  magnitude?: string;
}

type SeamResult = Outcome<{ recordId: string; state: 'open'; transitionRef: Digest }>;

const FINDING_KEYS = new Set(['findingId', 'kind', 'findingDigest', 'magnitude']);
const ACK_KEYS = new Set(['findingId', 'findingDigest', 'magnitude']);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

type ValidatedInput = {
  findingId: string;
  kind: string | undefined;
  findingDigest: string;
  magnitude: string | undefined;
};

/**
 * Argument-intake validation, the validateConsultations class (SPEC §9's "throws at
 * argument intake" posture): a malformed shape is a caller error that throws
 * identically regardless of record state, before the chain loads. The identity rule is
 * a permitted tightening the spec is silent on: an empty-principal raiser would make
 * the finding unacknowledgeable under `self`/`counterparty` (the counting predicate
 * fails closed on both sides) — the declarable-but-inert trap the settled class closes.
 */
function validateInput(
  seam: 'raiseFinding' | 'acknowledge',
  input: Record<string, unknown>,
  allowedKeys: Set<string>,
  requireKind: boolean,
): ValidatedInput {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error(
      `${seam}: the ${requireKind ? 'finding' : 'ack'} argument is not a plain object — a caller error (SPEC §10.2)`,
    );
  }
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      throw new Error(
        `${seam}: unknown key '${key}' — the shape is exact (SPEC §10.2), and the library stamps at itself`,
      );
    }
  }
  // Each field is read ONCE into a local, checked, and the literal returned is what the seam
  // records: a caller mutating its argument after the call changes nothing recorded.
  const findingId = input.findingId;
  const kind = input.kind;
  const findingDigest = input.findingDigest;
  const magnitude = input.magnitude;
  if (!isNonEmptyString(findingId)) {
    throw new Error(
      `${seam}: missing or empty findingId — a malformed argument is a caller error (SPEC §10.2)`,
    );
  }
  assertWellFormedString(seam, 'findingId', findingId);
  if (requireKind && !isNonEmptyString(kind)) {
    throw new Error(
      `${seam}: missing or empty kind — a malformed argument is a caller error (SPEC §10.2)`,
    );
  }
  assertWellFormedString(seam, 'kind', kind);
  if (!isNonEmptyString(findingDigest)) {
    throw new Error(
      `${seam}: missing or empty findingDigest — digest-only custody needs the digest (SPEC §3)`,
    );
  }
  assertDigestForm(`${seam}: findingDigest`, findingDigest);
  if (magnitude !== undefined && typeof magnitude !== 'string') {
    throw new Error(
      `${seam}: a non-string magnitude — the library never interprets it, but it IS a string (SPEC §10.2)`,
    );
  }
  assertWellFormedString(seam, 'magnitude', magnitude);
  return {
    findingId,
    kind: typeof kind === 'string' ? kind : undefined,
    findingDigest,
    magnitude: typeof magnitude === 'string' ? magnitude : undefined,
  };
}

/**
 * The findings seams' identity intake: throws on a malformed identity (the caller-error
 * posture above), and otherwise RETURNS the validator's fresh literal (`identitySnapshot`),
 * which the seam holds across its chain load and records as `raiser`/`acker` — never the
 * object it was handed, so the recorded principal is the one validated here and the one
 * `ackCounts` (kernel/findings.ts) later compares.
 */
function validateSeamIdentity(seam: string, identity: IdentityAssertion): IdentityAssertion {
  const snapshot = intakeIdentity(seam, 'identity', identity);
  if (snapshot === null) {
    throw new Error(
      `${seam}: a malformed identity (not exactly { principal, authority, proofRef? } with a ` +
        'non-empty principal and authority) is a caller error — an empty principal could never ' +
        'satisfy any ackMode (fail-closed both sides), the inert-input trap; an extra key is ' +
        'what a host leaks a secret through (SPEC §6)',
    );
  }
  return snapshot;
}

type Loaded =
  | {
      ok: true;
      chain: readonly Transition[];
      record: DecisionRecord;
      resolved: ResolvedProfile;
      leg: LegSpec;
    }
  | { ok: false; out: SeamResult };

/** The shared prologue: rungs (1)-(3) of the header ladder. */
async function loadOpenDeclaringRecord(
  ctx: KernelContext,
  seam: 'raiseFinding' | 'acknowledge',
  recordId: string,
): Promise<Loaded> {
  const { store, profiles, now } = ctx;
  const chain = await store.readChain(recordId);
  if (chain.length === 0) {
    throw new Error(
      `${seam}: unknown recordId '${recordId}' — no such record (open() first); a recordId that ` +
        'resolves to no chain is a caller error, not a domain refusal (SPEC §8)',
    );
  }
  // (1) chain-verify, FIRST. The AL2 enforcement increment folds the signature layer
  // into this same arm. Both halves are bound to the requested `recordId`.
  if (!verifyChain(chain, recordId).intact || !(await signatureLayerHolds(ctx, recordId, chain))) {
    return {
      ok: false,
      out: (await appendChainCompromise(store, recordId, chain, now)) as SeamResult,
    };
  }
  const record = replay(chain);
  // (2) profile/leg resolution.
  const resolved = heldProfile(profiles, record);
  if (resolved === undefined) {
    // Not held: unregistered, or registered with a projection that does not digest to the
    // record's binding (the profile-drift gate — kernel/finalize.ts's same arm argues it).
    return { ok: false, out: refused('unknown-profile') };
  }
  const leg = resolved.profile.legs.find((l) => l.id === record.legId);
  if (leg === undefined) {
    throw new Error(
      `${seam}: persisted legId '${record.legId}' is absent from profile '${record.profileId}'`,
    );
  }
  // (2.5) declaring check — both-or-neither holds at construction, so either field
  // proves the pair.
  if (leg.ackMode === undefined || leg.requiredAcks === undefined) {
    throw new Error(
      `${seam}: profile '${record.profileId}' leg '${leg.id}' declares no findings flow — ` +
        'SPEC §10.2: "both seams throw on a record whose resolved leg declares no findings flow", ' +
        'keeping a non-declaring chain byte-identical to a pre-findings implementation, scoped ' +
        'to its own keys and transitions per the SPEC §4 invariant; the universal §5 ' +
        'chain-compromise edge sits outside that scope, since rung (1) runs before this gate ' +
        '(SPEC §5)',
    );
  }
  // (3) state/expiry — the finalize rung-(2) arms, adapted (SPEC §10.2: "only `open`
  // records accept the append").
  if (record.state === 'expired') {
    return { ok: false, out: refused('leg-expired') };
  }
  if (record.state === 'confirmed' || record.state === 'redeeming') {
    // The clock rung, adapted from finalize's own rung (2): an elapsed confirmed window
    // resolves to `expired` -> `leg-expired`; an elapsed redeeming window resolves to
    // `redemption-failed` -> `record-not-open` (a non-open, non-expired record). Not
    // due, or the CAS lost to a racing writer: `record-not-open` either way — true of
    // the record's state regardless (the same divergence from the redemption family's
    // loser-agrees-with-reinvocation discipline finalize.ts's own rung (2) comment
    // records, tolerated for the same reason: the race is rare and the verdict stays
    // true of the record; re-invocation reports the fresh state).
    const due = await resolveDueClock(store, recordId, chain, resolved, now());
    if (due.due && due.result.appended) {
      return {
        ok: false,
        out: refused(due.window === 'confirmed' ? 'leg-expired' : 'record-not-open'),
      };
    }
    return { ok: false, out: refused('record-not-open') };
  }
  if (record.state !== 'open') {
    return { ok: false, out: refused('record-not-open') };
  }
  const ex = await resolveDueClock(store, recordId, chain, resolved, now());
  if (ex.due) {
    return { ok: false, out: refused('leg-expired') };
  }
  return { ok: true, chain, record, resolved, leg };
}

/** Rung (5): the one mid-lifecycle append, state-preserving, dueAt re-supplied. */
async function appendSeamTransition(
  ctx: KernelContext,
  seam: 'raiseFinding' | 'acknowledge',
  recordId: string,
  chain: readonly Transition[],
  resolved: ResolvedProfile,
  kind: 'finding-raised' | 'acknowledged',
  payload: FindingRaisedPayload | AcknowledgedPayload,
): Promise<SeamResult> {
  const last = chain.at(-1);
  if (last === undefined) throw new Error('findings-seams: empty chain — the prologue holds');
  const genesis = chain[0];
  if (genesis === undefined) throw new Error('findings-seams: empty chain — the prologue holds');
  const transition: Transition = {
    recordId,
    seq: chain.length + 1,
    at: ctx.now().toISOString(),
    kind,
    payload: payload as unknown as Transition['payload'],
    prevHash: transitionDigest(last),
  };
  const deadlineMs = expiryDeadlineMs(genesis.at, resolved.profile.expiry);
  const meta: AppendMeta = {
    nonTerminal: true,
    ...(deadlineMs === null ? {} : { dueAt: new Date(deadlineMs).toISOString() }),
  };
  const res = await ctx.store.appendTransition('open', transition, meta);
  if (!res.appended) {
    if (res.conflict === 'seq') {
      // The state did NOT move — the record is still open and another state-preserving
      // append took this seq (a concurrent raise/ack, or a decision seam's batch). The one
      // code true of an open record whose head moved is `record-contended` (SPEC §8, the
      // record-contended increment): a RETURNED refusal, never appends, re-invoke. An unmoved
      // head is a storage fault and throws — never record-not-open, which would be false here.
      const verdict = await appendSeqConflict(seam, ctx.store, recordId, chain.length);
      if (verdict.contended) return refused('record-contended');
      throw verdict.fault;
    }
    // `state-mismatch`: a racing writer moved the state between the read and this CAS — the
    // state the caller saw is gone; re-invocation re-reads (the established lost-race posture).
    return refused('record-not-open');
  }
  return ok({ recordId, state: 'open', transitionRef: res.transitionDigest });
}

export async function raiseFinding(
  ctx: KernelContext,
  recordId: string,
  finding: FindingInput,
  identity: IdentityAssertion,
): Promise<SeamResult> {
  assertIdArg('raiseFinding', 'recordId', recordId);
  const input = validateInput(
    'raiseFinding',
    finding as unknown as Record<string, unknown>,
    FINDING_KEYS,
    true,
  );
  const raiser = validateSeamIdentity('raiseFinding', identity);
  const pre = await loadOpenDeclaringRecord(ctx, 'raiseFinding', recordId);
  if (!pre.ok) return pre.out;
  // (4) SPEC §10.2: "`kind` is immutable per `findingId` — a re-raise changing it
  // throws". The same shape replay treats as a storage fault is a live CALLER error
  // here — the seam refusing it is what keeps it impossible on honest chains.
  const existing = pre.record.findings?.find((f) => f.findingId === input.findingId);
  if (existing !== undefined && existing.kind !== input.kind) {
    throw new Error(
      `raiseFinding: finding '${input.findingId}' was raised with kind '${existing.kind}' — ` +
        'SPEC §10.2: "`kind` is immutable per `findingId` — a re-raise changing it throws"',
    );
  }
  const payload: FindingRaisedPayload = {
    findingId: input.findingId,
    kind: input.kind as string, // requireKind: validateInput guaranteed a non-empty string
    findingDigest: input.findingDigest,
    ...(input.magnitude !== undefined ? { magnitude: input.magnitude } : {}),
    raiser,
  };
  return appendSeamTransition(
    ctx,
    'raiseFinding',
    recordId,
    pre.chain,
    pre.resolved,
    'finding-raised',
    payload,
  );
}

export async function acknowledge(
  ctx: KernelContext,
  recordId: string,
  ack: AckInput,
  identity: IdentityAssertion,
): Promise<SeamResult> {
  assertIdArg('acknowledge', 'recordId', recordId);
  const input = validateInput(
    'acknowledge',
    ack as unknown as Record<string, unknown>,
    ACK_KEYS,
    false,
  );
  const acker = validateSeamIdentity('acknowledge', identity);
  const pre = await loadOpenDeclaringRecord(ctx, 'acknowledge', recordId);
  if (!pre.ok) return pre.out;
  // (4) SPEC §10.2: "An ack naming a `findingId` absent from the record throws (caller
  // error)". A stale digest, a mismatched magnitude, an ackMode-violating acker all
  // APPEND — SPEC §10.2's "recorded and visibly non-counting (fidelity, not validity)";
  // counting is rung (5.7)'s business, never this seam's.
  const target = pre.record.findings?.find((f) => f.findingId === input.findingId);
  if (target === undefined) {
    throw new Error(
      `acknowledge: finding '${input.findingId}' was never raised on record '${recordId}' — ` +
        'SPEC §10.2: an ack naming an absent findingId throws (caller error)',
    );
  }
  const payload: AcknowledgedPayload = {
    findingId: input.findingId,
    findingDigest: input.findingDigest,
    ...(input.magnitude !== undefined ? { magnitude: input.magnitude } : {}),
    acker,
  };
  return appendSeamTransition(
    ctx,
    'acknowledge',
    recordId,
    pre.chain,
    pre.resolved,
    'acknowledged',
    payload,
  );
}
