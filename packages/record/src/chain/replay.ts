// @vidimera/record — chain/replay.ts: the ONE pure core shared by
// the mandatory pre-seam chain-verify (kernel `finalize()`, SPEC §5) and the operator
// `verifyChain()`/`replay()` audit wrappers (`operator-surface.ts`) —
//   `replay(chain)` folds a `DecisionRecord` from genesis, and
//   `verifyChain(chain)` recomputes every transition's digest linkage and reports the
//   FIRST break, if any.
// Both are PURE functions over `Transition[]`: no Store, no I/O, no side effects —
// callers (kernel, operator surface) are responsible for fetching the chain via
// `Store.readChain()` first.

import type { RefusalCode } from '../refusal-codes.js';
import type {
  Consultation,
  DecisionRecord,
  Digest,
  IdentityAssertion,
  Transition,
} from '../types.js';
import { genesisPrevHash, transitionDigest } from './encoding.js';

// --- payload shapes (SPEC §4's payload table) ---------------------------------------
// These are NOT part of the public Transition/DecisionRecord contract (Transition.payload
// is `unknown` by design — the chain is the persisted, opaque wire format); they are
// this module's own understanding of what each TransitionKind this build emits
// carries, used only to fold replay(). Kept local rather than added to
// types.ts because they describe an internal reading convention, not a public type.

interface OpenedPayload {
  profileId: string;
  profileDigest: Digest;
  legId: string;
  subjectRef: string;
  contentDigest: Digest;
  policyDigest?: Digest;
}
interface ConfirmedPayload {
  actor: IdentityAssertion;
}
interface RefusedPayload {
  code: RefusalCode;
}

/**
 * `replay(chain)`: folds a `DecisionRecord` by walking `chain`
 * in the order given (the caller — `Store.readChain()`, or a verified-intact chain —
 * is responsible for supplying it in seq order; `replay` does not itself validate
 * seq/prevHash linkage, that is `verifyChain`'s job, kept as a separate concern so
 * each function does exactly one thing).
 *
 * Folding rules (SPEC §4's payload table):
 *  - `opened` (`{profileId, profileDigest, legId, subjectRef, contentDigest,
 *    policyDigest?}`) seeds `id` (from `transition.recordId`, NOT a payload field —
 *    the payload has no self-identifying id), `profileId`, `legId`, `subjectRef`,
 *    `contentDigest`, `policyDigest`, and initializes `consultations: []`,
 *    `state: 'open'`. MUST be the first transition — there is no other source for
 *    these required `DecisionRecord` fields.
 *  - `consultation-recorded` payload is itself a `Consultation` — pushed onto
 *    `consultations` in chain order (SPEC §5's chain-verify / §3's facts
 *    consultations accumulate this way).
 *  - `confirmed` (`{actor}`) sets `actor` and `state: 'confirmed'`.
 *  - `refused` (`{code}`) sets `state: 'refused'` and `refusalCode: code`.
 *  - `expired` (`{bound}`) sets `state: 'expired'` (`bound` is not itself part of
 *    `DecisionRecord` — it is the elapsed deadline timestamp, not a clause name; the
 *    transitioned-from state distinguishes which expiry clause fired, SPEC §4).
 *  - `state` follows the LAST state-changing transition kind seen: e.g. an
 *    `open→confirmed→refused` chain — the §12 (C3) `confirmed→refused` compromise
 *    carve-out — folds to `state:'refused'`, even though `actor` (set by
 *    the earlier `confirmed`) is untouched by the later `refused` (only
 *    `state`/`refusalCode` are refusal-owned fields).
 *  - `sealed` (SPEC §5's chain retirement) sets `status: 'retired'` without moving `state`
 *    — a sealed `confirmed` record is still `confirmed`.
 *  - `redeemed` (SPEC §11.2's direct shape; `{via}`) sets `state: 'redeemed'`. The `via`
 *    payload field is EVIDENCE, not state — it records which redemption shape produced the
 *    edge, and `replay` reads nothing from it; only `state` moves.
 *  - `redeeming` (SPEC §11.2's token shape, second step-3 increment; `{tokenDigest}`) sets
 *    `state: 'redeeming'`. The `tokenDigest` payload field is EVIDENCE, not state — replay
 *    reads nothing from it; only `state` moves.
 *  - `redemption-failed` (SPEC §11.2, the third step-3 increment; `{bound}`) sets
 *    `state: 'redemption-failed'` and `refusalCode: 'redemption-timeout'` — the constant,
 *    from the registry. The `bound` payload field is EVIDENCE, not state — the elapsed
 *    deadline timestamp, not a clause name — replay reads nothing from it; only `state` and
 *    refusalCode move. The kind is handled, and its kernel producer (the clock resolution,
 *    `kernel/expiry.ts`'s `resolveDueClock`, consumed by `kernel/redeem.ts`'s shared
 *    prologue) is REAL as of the third step-3 increment.
 *  - Any other `TransitionKind` (`finding-raised`, `acknowledged`) is not yet emitted
 *    in this build — this kernel emits opened, consultation-recorded, confirmed, refused,
 *    expired, sealed, redeemed, redeeming (since the second step-3 increment's
 *    `beginRedemption`), and redemption-failed (since the third step-3 increment's clock
 *    resolution). `replay` THROWS on any other kind rather than silently ignoring it,
 *    matching the codebase's fail-closed posture (an unhandled kind reaching this fold is
 *    either a not-yet-wired future capability or chain corruption; both should be loud, not
 *    silently dropped state).
 *
 * Empty-chain choice: THROWS. Replaying a
 * record that doesn't exist (no `opened` transition to seed the required fields) is a
 * caller error, not a valid zero-value `DecisionRecord` — there is no honest "empty"
 * state to return (e.g. `profileId`/`legId`/`subjectRef`/`contentDigest` are all
 * non-optional `DecisionRecord` fields with no default).
 */
export function replay(chain: readonly Transition[]): DecisionRecord {
  const [first, ...rest] = chain;
  if (first === undefined) throw new Error('replay: empty chain — a record always has a genesis');
  if (first.kind !== 'opened') {
    throw new Error(
      `replay: first transition must be 'opened' to seed the DecisionRecord, found '${first.kind}'`,
    );
  }
  const opened = first.payload as OpenedPayload;

  const record: DecisionRecord = {
    id: first.recordId,
    profileId: opened.profileId,
    legId: opened.legId,
    subjectRef: opened.subjectRef,
    contentDigest: opened.contentDigest,
    consultations: [],
    state: 'open',
    status: 'active',
  };
  if (opened.policyDigest !== undefined) {
    record.policyDigest = opened.policyDigest;
  }

  for (const transition of rest) {
    switch (transition.kind) {
      case 'consultation-recorded': {
        record.consultations.push(transition.payload as Consultation);
        break;
      }
      case 'confirmed': {
        const payload = transition.payload as ConfirmedPayload;
        record.actor = payload.actor;
        record.state = 'confirmed';
        break;
      }
      case 'refused': {
        const payload = transition.payload as RefusedPayload;
        record.state = 'refused';
        record.refusalCode = payload.code;
        break;
      }
      case 'expired': {
        // `bound` (SPEC §4's `expired` payload) is the elapsed deadline timestamp, not a
        // clause name — the transitioned-from state distinguishes which expiry clause
        // fired. `bound` is not itself reflected in DecisionRecord — only `state` changes.
        record.state = 'expired';
        break;
      }
      case 'sealed': {
        // State-PRESERVING (SPEC §4's delta payload; §5's chain retirement): sealing never
        // moves `state` — a sealed `confirmed` record is still `confirmed`. What it changes
        // is the per-record status §5 reports as `retired` rather than `active`. The payload's
        // `chainHead` is not folded into the record: it is standalone evidence for after the
        // body is archived or destroyed (§5), not a field of the record model.
        record.status = 'retired';
        break;
      }
      case 'redeemed': {
        // State-MOVING (SPEC §11.2's direct shape): `confirmed → redeemed` is the release —
        // `redeemed` is terminal (§2). The payload's `via` field is evidence of which
        // redemption shape produced the edge, not state — replay reads nothing from it; only
        // `state` moves, the same one field a `confirmed`/`refused`/`expired` arm moves.
        record.state = 'redeemed';
        break;
      }
      case 'redeeming': {
        // State-MOVING (SPEC §11.2's token shape, second step-3 increment):
        // `confirmed → redeeming` records the issued token's digest. Non-terminal (§2:
        // decided, effect unresolved). The payload's `tokenDigest` (and, when the clock
        // increment lands it, `bound`) is EVIDENCE — replay reads nothing from it; only
        // `state` moves.
        record.state = 'redeeming';
        break;
      }
      case 'redemption-failed': {
        // The redemption bound elapsed with the outcome unknown (SPEC §11.2; third
        // step-3 increment): state moves, and §4's table folds the CONSTANT refusal code
        // — "folds `refusalCode: redemption-timeout` on replay". `bound` is evidence.
        record.state = 'redemption-failed';
        record.refusalCode = 'redemption-timeout';
        break;
      }
      default: {
        throw new Error(
          `replay: unhandled TransitionKind '${transition.kind}' (not emitted in this build)`,
        );
      }
    }
  }

  return record;
}

/**
 * `ChainVerifyReport`: `{ intact; firstBreakSeq?; detail? }`.
 * Modeled as a discriminated union (this codebase's house style, matching
 * `Outcome<T>` in outcome.ts) rather than optional fields on one shape: on
 * `intact:true` there is genuinely nothing else to report; on `intact:false`,
 * `firstBreakSeq`/`detail` are always BOTH present together, never partially.
 */
export type ChainVerifyReport =
  | { intact: true }
  | { intact: false; firstBreakSeq: number; detail: string };

/**
 * `verifyChain(chain)` (SPEC §5 "Operator audit functions", the run of §5 that defines
 * both this and `replay`): recomputes every transition's digest linkage —
 *  1. genesis: `chain[0].prevHash` must equal `genesisPrevHash(chain[0].recordId)`;
 *  2. every subsequent `chain[i].prevHash` must equal `transitionDigest(chain[i-1])`
 *     (recomputed under `chain[i-1]`'s own recorded algorithm, via `encoding.ts`);
 *  3. seq continuity: `chain[i].seq` must equal `i + 1` for every `i` (1-based, +1
 *     per transition).
 * Reports `{intact:true}` if every check passes, or `{intact:false, firstBreakSeq,
 * detail}` on the FIRST index (1-based) at which any check fails — later breaks in
 * the same chain are not reported.
 *
 * Honesty limit (documented, not a bug): a mutation to a transition's OWN prevHash
 * field, or to the LAST transition in the chain, is not distinguishable from that
 * transition simply never having existed in that exact form — a singly-linked hash
 * chain protects a transition's integrity via the NEXT link, not its own. A tamper to
 * transition N's payload (leaving its `prevHash` field untouched) is therefore caught
 * at transition N+1 (whose stored `prevHash` was computed by the honest chain-builder
 * from transition N's ORIGINAL payload and no longer matches the recomputed digest of
 * the tampered version) — `firstBreakSeq` in that case is `N+1`, not `N`. This is the
 * same AL1 honesty limit SPEC §5's chain-compromise discussion documents for the
 * compromise-refusal edge; detached signing (SPEC §14) is the eventual upgrade.
 *
 * Empty-chain choice: THROWS, for the same reason as `replay`'s — verifying the
 * integrity of a chain that does not exist is a caller error, not a vacuous
 * `{intact:true}`.
 */
export function verifyChain(chain: readonly Transition[]): ChainVerifyReport {
  if (chain.length === 0) {
    throw new Error(
      'verifyChain: empty chain (verifying a chain that does not exist is a caller error)',
    );
  }

  let expectedPrevHash: Digest | undefined;

  for (const [i, transition] of chain.entries()) {
    const expectedSeq = i + 1;
    expectedPrevHash ??= genesisPrevHash(transition.recordId);

    if (transition.seq !== expectedSeq) {
      return {
        intact: false,
        firstBreakSeq: expectedSeq,
        detail: `expected seq ${expectedSeq} at chain position ${expectedSeq}, found seq ${transition.seq}`,
      };
    }

    if (transition.prevHash !== expectedPrevHash) {
      return {
        intact: false,
        firstBreakSeq: expectedSeq,
        detail:
          i === 0
            ? `genesis prevHash mismatch at seq 1: expected ${expectedPrevHash}, found ${transition.prevHash}`
            : `prevHash mismatch at seq ${expectedSeq}: expected ${expectedPrevHash} (the previous transition's digest), found ${transition.prevHash}`,
      };
    }

    // This transition's own digest becomes the expected prevHash of the next one.
    expectedPrevHash = transitionDigest(transition);
  }

  return { intact: true };
}
