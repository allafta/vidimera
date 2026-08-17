// @vidimera/record — RefusalCode union, the REGISTRY code→class map, and the
// append-decision helper (SPEC §8 "Refusal codes"; DECISIONS.md #14 "The refusal
// registry is a compiler-total map; append behavior is one shared derivation").

export type RefusalCode =
  | 'content-drift'
  | 'identity-authority-refused'
  | 'record-exists'
  | 'leg-expired'
  | 'consultation-missing'
  | 'chain-compromise'
  | 'record-not-open'
  | 'unknown-profile'
  | 'unknown-leg'
  | 'unredeemable-state'
  | 'unsealable-state'
  // first PROFILE-CONDITIONAL codes (SPEC §8's conditional table): producers in
  // kernel/redeem.ts (effect-mismatch, already-redeemed); redemption-timeout produced by
  // kernel/expiry.ts's resolution, consumed by kernel/redeem.ts's shared prologue across
  // all three redemption seams (the third step-3 increment)
  | 'effect-mismatch'
  | 'already-redeemed'
  | 'redemption-timeout'
  // the fifteenth code (the first step-4 increment): SPEC §8's conditional table names it
  // "a pre-record `open()`-seam sequencing refusal that never appends" — producer worded
  // two-touch, same as `redemption-timeout` above: the verifier (`kernel/prior-legs.ts`)
  // consumed by `open()`'s sequencing rung, real as of the first step-4 increment
  | 'prior-leg-unverified'
  // the sixteenth code (the second step-4 increment): SPEC §8's conditional table names
  // it "`refusal`-class, `terminalRefusals`-able"; the default appendsOn path (appends
  // `open→refused` iff the leg's `terminalRefusals` lists it, else stays open per §10.1)
  // IS the spec-mandated behavior with zero new code — producer: finalize's rung 3.5
  // (kernel/finalize.ts), real as of the second step-4 increment
  | 'sod-violation'
  // the seventeenth code (the second step-5 increment): SPEC §8's conditional table names
  // it "`refusal`-class, open-by-default for re-run" (the required-consultation gate,
  // §11.1); producer: finalize's rung 5.5 (kernel/finalize.ts), real as of the second
  // step-5 increment
  | 'consultation-failed'
  // the eighteenth code (the second step-5 increment): SPEC §8 names it the availability
  // class's single code, "never appends"; carried by the `unavailable` outcome status, never
  // a `refused` edge. Two producers, both real: §11.1's required-consultation gate
  // (finalize's rung 5.5) is real as of the second step-5 increment; §10.3's policy gate
  // (finalize's rung 4.5) is real as of the second step-6 increment
  | 'availability'
  // the nineteenth code (the first step-6 increment): SPEC §8's conditional table names it
  // "`refusal`-class, open-by-default so a different eligible actor may decide" — the
  // default appendsOn path (appends `open→refused` iff the leg's `terminalRefusals` lists
  // it, else stays open per §10.1) IS the spec-mandated behavior with zero new code —
  // producer: finalize's eligibility arm of the required-consultation rung
  // (kernel/finalize.ts), real as of the first step-6 increment
  | 'ineligible'
  // the twentieth code (the second step-6 increment): SPEC §8's conditional table names it
  // "`refusal`-class, `terminalRefusals`-able — a policy-declaring profile SHOULD list it
  // (disposal-and-re-open recovery)" — a bound-vs-reality mismatch with no in-place
  // recovery, mirroring `content-drift`; the default appendsOn path (appends `open→refused`
  // iff the leg's `terminalRefusals` lists it, else stays open per §10.1) IS the
  // spec-mandated behavior with zero new code — producer: finalize's rung (4.5), real as
  // of the second step-6 increment
  | 'policy-drift'
  // the twenty-first and twenty-second codes (the first step-7 increment): SPEC §8's
  // conditional table names them "`refusal`-class, `terminalRefusals`-able, open-by-default"
  // under "findings flow (§10.2)". The distinction (§10.2): `ack-missing` = no ack at all
  // for a required-kind finding; `ack-stale` = acks present but none counting (wrong
  // digest, wrong magnitude, or violating ackMode). Producer: finalize's rung (5.7), the
  // ack-coverage rung, real as of the second step-7 increment
  | 'ack-missing'
  | 'ack-stale'
  // the twenty-third code (the step-8 recovery increment): SPEC §2's recovery relation
  // (`supersedes`) — a pre-record `open()`-seam verification refusal that never appends,
  // the same reason as `prior-leg-unverified` above: no record exists yet to carry an
  // edge. Producer: open()'s recovery rung (kernel/open.ts), consuming
  // `kernel/supersedes.ts`'s `verifySupersedes`, real as of the step-8 recovery
  // increment — this same commit, so there is no two-touch here unlike
  // `redemption-timeout`'s/`prior-leg-unverified`'s own two-touch wording above.
  | 'supersedes-unverified'
  // the twenty-fourth and LAST code of this build (the AL2 freshness increment): SPEC
  // §11.1/§14's consultation freshness gate — a bounded required kind whose obtained
  // `observedAt` claim is missing, future, or out-of-bound (an unparseable claim is
  // the intake's own throw, never this refusal — kernel/consultations.ts's shape check
  // runs before this rung is ever reached). `refusal`-class, `terminalRefusals`-able,
  // open-by-default for re-run (the `consultation-failed` family's own register — SPEC
  // §8's row: "can only fire with authority timestamps"). Producer: finalize's rung
  // 5.5 freshness arm (kernel/finalize.ts), real as of the AL2 freshness increment —
  // this same commit.
  | 'consultation-stale';
// class map: chain-compromise → 'compromise'; availability → 'availability'; all others →
// 'refusal'
// record-not-open: class 'refusal', terminal-record category — finalize() against a non-open, intact-chain
//   record (double-finalize; an effect-seam confirmed record awaiting redemption; a refused record). NEVER
//   appends, no transitionRef, no transitionRef-bearing edge. One further producer sits off the gate
//   ladder: rung (6)'s entry conflict, where finalize()'s success batch is all-or-nothing and its entry
//   compare-and-swap fails before anything is appended — kernel/finalize.ts's rung (6) comment and
//   `batchConflict`'s doc comment. Because the batch applied nothing, the code is true of both the
//   record's state and this registry's never-appends rule at that site, for the first time here.
// unknown-leg: class 'refusal'. SPEC §8 names two producers — a caller-named leg absent
//   from the profile at `stage()`, and a staged draft's leg absent from the profile it
//   resolves under at `open()`. BOTH are built in this build (`stage()`'s
//   caller-named-legId check, kernel/stage.ts; `open()`'s staged-legId re-check,
//   kernel/open.ts).
// unsealable-state: class 'refusal'. SPEC §8 — `seal()` against a record that is not
//   derived-terminal or is already sealed, and the residual of a racing or duplicate seal
//   (C4 rejects through C3's terminal-state-mismatch path, §12). NEVER appends.

export type RefusalClass = 'refusal' | 'compromise' | 'availability';

/**
 * REGISTRY code→class map (DECISIONS.md #14: "a compiler-total map"). Typed as
 * `Record<RefusalCode, RefusalClass>`
 * so the mapping is compiler-enforced TOTAL — every RefusalCode must have an entry or
 * this file fails to type-check. Only `chain-compromise` is `'compromise'` and only
 * `availability` is `'availability'`; every other code is `'refusal'`. This is the ONLY
 * place class is derived from — outcome.ts's `refused()` looks class up here; callers
 * never supply it directly.
 *
 * Named `REGISTRY` (DECISIONS.md #14's own word — "the refusal registry is a
 * compiler-total map") since the second step-3 increment: it carries the core set AND the
 * profile-conditional codes (`effect-mismatch`, `already-redeemed`), so the earlier name
 * `CORE` misdescribed it — that increment honored the rename its predecessor recorded
 * here as deferred.
 */
export const REGISTRY: Record<RefusalCode, RefusalClass> = {
  'content-drift': 'refusal',
  'identity-authority-refused': 'refusal',
  'record-exists': 'refusal',
  'leg-expired': 'refusal',
  'consultation-missing': 'refusal',
  'chain-compromise': 'compromise',
  'record-not-open': 'refusal',
  'unknown-profile': 'refusal',
  'unknown-leg': 'refusal',
  'unredeemable-state': 'refusal',
  'unsealable-state': 'refusal',
  'effect-mismatch': 'refusal',
  'already-redeemed': 'refusal',
  'redemption-timeout': 'refusal',
  'prior-leg-unverified': 'refusal',
  'sod-violation': 'refusal',
  'consultation-failed': 'refusal',
  availability: 'availability',
  ineligible: 'refusal',
  'policy-drift': 'refusal',
  'ack-missing': 'refusal',
  'ack-stale': 'refusal',
  'supersedes-unverified': 'refusal',
  'consultation-stale': 'refusal',
};

/**
 * Minimal shape of a leg needed to decide whether a refusal appends a transition.
 * NOT the full LegSpec (that's config.ts's) — kept minimal so
 * this module doesn't depend on config types.
 */
export interface AppendDecisionLeg {
  terminalRefusals?: RefusalCode[];
}

/**
 * Codes that NEVER append a transition, regardless of leg configuration (SPEC §8's
 * never-appends set): `record-exists` / `unknown-profile` / `unknown-leg` (pre-record) and
 * `record-not-open` (terminal-record) never append; `unsealable-state` never appends —
 * `seal()`'s only append is the `sealed` transition itself, folded into its own success path
 * (`kernel/seal.ts`), never a byproduct of this refusal;
 * `unredeemable-state`, `effect-mismatch`, `already-redeemed`, and `redemption-timeout` never append —
 * redemption's refusals are all result-first, the seam's only append being the `redeemed`
 * transition folded into its own success path (`kernel/redeem.ts`), never a byproduct of a
 * refusal; `redemption-timeout`'s producer is the clock resolution at the redemption seams
 * (`kernel/expiry.ts`'s `resolveDueClock` consumed in `kernel/redeem.ts`'s shared
 * prologue), real as of the third step-3 increment, and its edge is the
 * `redemption-failed` KIND (SPEC §4's table), never a `refused` transition — SPEC §8
 * lists it in the never-appends set; `prior-leg-unverified` never appends too —
 * pre-record, same reason as `record-exists`/`unknown-profile`/`unknown-leg` above: no
 * record exists to carry an edge. Its producer, the verifier (`kernel/prior-legs.ts`), is
 * consumed by `open()`'s sequencing rung, real as of the first step-4 increment.
 * `supersedes-unverified` never appends for the same pre-record reason — its producer,
 * `kernel/supersedes.ts`'s `verifySupersedes`, is consumed by `open()`'s recovery rung,
 * real as of the step-8 recovery increment (this same commit).
 */
const NEVER_APPENDS: ReadonlySet<RefusalCode> = new Set<RefusalCode>([
  'record-exists',
  'unknown-profile',
  'unknown-leg',
  'record-not-open',
  'unredeemable-state',
  'unsealable-state',
  'effect-mismatch',
  'already-redeemed',
  'redemption-timeout',
  'prior-leg-unverified',
  'supersedes-unverified',
]);

/**
 * Append-decision helper (SPEC §8's "Append semantics" — the `appendsOn` rule): a
 * `compromise`-class code appends a `refused` transition at head wherever the current
 * state admits a state-leaving append — §8 surfaces it result-first with NO edge against an
 * already-terminal `expired`/`refused` record (§12's C3) or a sealed one (§12's C4), so
 * this predicate returns `true` unconditionally and the append seam in the kernel
 * (kernel/finalize.ts's `appendChainCompromise`, which walks candidate CAS targets and
 * falls back to a ref-less refusal when the store admits none), not `appendsOn`, is what
 * lands that carve-out. §12's C4 is built in `store/memory.ts`, so the sealed half is a
 * bar this build's Store enforces, not merely a rule §12 states; the never-append codes
 * above NEVER append; every other
 * refusal-class code appends `open→refused` iff the leg's `terminalRefusals` lists it
 * (otherwise the record stays open, no append).
 *
 * `leg-expired` is a member of `RefusalCode` and CAN legally appear in a leg's
 * `terminalRefusals`, but it is resolved by finalize()'s state/expiry gate BEFORE any
 * refusal-append decision is reached (kernel/finalize.ts step (2), ahead of steps
 * (3)-(5.7) which are the only callers of `appendsOn`) — so `appendsOn('leg-expired', …)`
 * is never actually consulted by the kernel. `availability` is legal in a leg's
 * `terminalRefusals` too, but by a different mechanism: this function's own
 * availability-class check above returns `false` for it unconditionally, ahead of the
 * `terminalRefusals` consult, so `appendsOn('availability', …)` never reaches that
 * consult either — no kernel timing involved, unlike `leg-expired`. `leg-expired` and
 * `availability` are the two legal-but-inert `terminalRefusals` members SPEC §8 names
 * "so an adopter isn't trapped configuring a control that can never fire" (both pinned in
 * refusal-matrix.test.ts). Keep it that way, or gate it explicitly if/when `appendsOn`
 * usage widens beyond finalize's steps (3)-(5.7).
 */
export function appendsOn(code: RefusalCode, leg: AppendDecisionLeg): boolean {
  if (REGISTRY[code] === 'compromise') return true;
  if (REGISTRY[code] === 'availability') return false; // never a `refused` edge (SPEC §8)
  if (NEVER_APPENDS.has(code)) return false;
  return leg.terminalRefusals?.includes(code) ?? false;
}
