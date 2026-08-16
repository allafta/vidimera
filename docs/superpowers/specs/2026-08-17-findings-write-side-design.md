# Findings and acknowledgments, the write side — design

**Build-order step 7, second of two increments — the exit.** SPEC §10.2's write half:
the two operator-only seams (`raiseFinding`/`acknowledge`), finalize's rung (5.7)
ack-coverage gate, and the `ackMode`/`requiredAcks` construction lift — all three in ONE
atomic commit, per the step-7 brainstorm's ruling (the seams cannot precede the lift, or
they are unreachable; the lift cannot precede the gate, or a declaring profile finalizes
fail-open). The increment then executes the marker ruling — §10.2's `[DESIGNED]` tokens
move to `[PROVEN]`, the one sanctioned edit to the sealed set — and records step 7's
exit. After this increment, §10.2 is whole in this build and step 8 is the last
unstarted step.

## Rulings taken, so they are not re-litigated

- **Banked at the step-7 brainstorm**: seams + gate + lift atomic (one commit);
  `requiredAcks` takes the settled fail-closed class whole (non-empty, pairwise
  distinct, non-empty-string kinds) with **NO reserved-kind check** — finding kinds are
  their own namespace (§10.2: "the reserved consultation kinds do not apply to them"),
  and a construction-level pin proves `'facts'` is a LEGAL `requiredAcks` kind; the
  marker moves at THIS increment's exit.
- **Both-or-neither is the spec's own sentence** (§10.2: "both-or-neither; either alone
  is a construction error") — `validateFindingsFlow` (config.ts) enforces it in the same
  commit as the lift, alongside the settled-class rules. No runtime re-check of
  `ackMode`'s value: the TS union carries it, matching every prior lift.
- **The marker set is NINE tokens** — eight in SPEC.md, enumerated by line at HEAD: 127
  (§2's profile-conditional `findings`/`acks` listing), 324 (§4's transition-table row),
  522 (§8's conditional-table row — plain brackets, not bold), 550 (§9's operator-only
  parenthetical), 573 (§9's review-projection sentence), 591 (§9's ladder rung (5.7)),
  638 (the profile-field table's `ackMode`/`requiredAcks` row), 745 (the §10.2 heading);
  plus CONTROLS.md:44's findings-flow row, whose maturity cell is the bare word
  `DESIGNED` → `PROVEN` (no brackets there). CONTROLS.md is downstream of SPEC and
  conflicts resolve in the downstream document — a `DESIGNED` control row against a
  `[PROVEN]` SPEC heading would be exactly such a conflict, so the row moves with the
  set. Each edit replaces the token and NOTHING else — the commit's diff must show
  exactly these nine lines across the two files, verified byte-wise. `supersedes`'
  `[SKETCHED]` tokens and `freshness`'s do not move; the two marker-LEGEND definition
  lines (SPEC.md:17, concept README.md:48) never move.
- **Seam intake validates at argument depth** — the `validateConsultations` class: a
  malformed `finding`/`ack` (missing/empty `findingId`, `kind`, or `findingDigest`;
  a non-string `magnitude`; an unknown key) and a malformed `identity` (missing/empty
  `principal` or `authority`) THROW before the chain loads, identically regardless of
  record state. The identity rule is a permitted tightening the spec is silent on: an
  empty-principal raiser would make the finding unacknowledgeable under
  `self`/`counterparty` (the predicate fails closed on both sides), which is the
  declarable-but-inert trap the settled class exists to close.
- **The seams re-supply `dueAt`.** §12's omission rule ("present sets the record's
  pending-clock column, absent clears it") means a mid-lifecycle append that forgot the
  open window would DISARM the sweep's clock for that record. Both seams re-derive the open deadline
  (`expiryDeadlineMs(genesis.at, profile.expiry)`, the exact expression `open()` uses)
  and carry it in the append's meta; `expiry:'none'` omits it, which clears nothing
  because nothing was set. Pinned by a `listDue` test: after a raise, a due-open record
  still lists.
- **The seam residual maps to `record-not-open`.** A CAS non-append at the seams' own
  append (a racing writer moved the state between read and append) refuses
  `record-not-open` result-first — the state the caller saw is gone, and re-invocation
  re-reads (the established lost-race posture).
- **Return shape**: both seams resolve `ok({ recordId, state: 'open', transitionRef })`
  — the record stays open; the ref is the appended transition's digest (the
  `seal()`/`finalize()` convention).

---

## 1. The lift (`config.ts`)

`validateLeg`'s `ackMode` and `requiredAcks` GOVERNED throws are removed in the same
commit that lands the seams and the gate — the construction-guarded count moves 4 → 2
(remaining: whole-profile `captureMode:'live'`, per-leg `freshness`). What replaces the
guards is `validateFindingsFlow(profile, leg)`, the settled class:

- both-or-neither: `ackMode` without `requiredAcks`, or the reverse, throws §10.2's own
  construction error;
- `requiredAcks` non-empty, pairwise distinct, every kind a non-empty string — the
  `validateRequiredConsultations` shape MINUS the reserved-kind arm, with a comment
  citing §10.2's own-namespace sentence.

The guard-sweep-total test (`construction-validation.test.ts`) currently uses `ackMode`
as one of its two governed features — a dead alternative once the guard lifts; it swaps
to `freshness` + `captureMode:'live'`, the two that remain.

## 2. The seams (`kernel/findings-seams.ts`, new)

Two operator-only calls (SPEC §10.2 "Two operator-only calls append mid-lifecycle
transitions — the only appends between `opened` and the decision"), sharing one
prologue, in one new module (the `kernel/redeem.ts` several-seams-one-prologue
precedent; `kernel/findings.ts` stays the pure predicate module):

```ts
raiseFinding(ctx, recordId, finding, identity)  // finding: { findingId, kind, findingDigest, magnitude? }
acknowledge(ctx, recordId, ack, identity)       // ack:     { findingId, findingDigest, magnitude? }
```

surfaced on `OperatorSurface` as `raiseFinding(recordId, finding, identity)` /
`acknowledge(recordId, ack, identity)` (SPEC §10.2's documented signatures).

The shared ladder, in order:

- **(0) argument intake** — the intake THROWS above, before the chain loads.
- **load** — an empty chain THROWS (unknown recordId, the caller-error posture every
  operator seam takes).
- **(1) chain-verify, FIRST** — `verifyChain` fails ⇒ `appendChainCompromise` (the
  exported rung-(1) helper `seal()` already reuses).
- **(2) profile/leg resolution** — unresolvable profile refuses `unknown-profile`
  (fail-closed, defensive); a persisted `legId` absent from the profile THROWS (the
  `seal()` posture).
- **(2.5) declaring check** — the resolved leg declares no findings flow
  (`ackMode`/`requiredAcks` undefined — both-or-neither makes checking either
  sufficient) ⇒ THROW, a config error: §10.2, "both seams throw on a record whose
  resolved leg declares no findings flow — so a non-declaring profile can never acquire
  finding/ack transitions, and its chains are byte-identical to a pre-findings
  implementation".
- **(3) state/expiry** — `expired` refuses `leg-expired`; `open`-and-due resolves the
  clock en passant (`resolveDueClock`) and refuses `leg-expired`; any other non-open
  state refuses `record-not-open`, never-append (§8). The finalize rung-(2) residual
  discipline carries over: a lost clock CAS re-reads nothing — the caller maps the
  non-append per the established arms.
- **(4) seam-specific semantic check** against the replayed record — `raiseFinding`: an
  existing `findingId` whose recorded `kind` differs from the supplied one THROWS
  (§10.2: "`kind` is immutable per `findingId` — a re-raise changing it throws"; the
  same condition replay treats as a storage fault can here be a live caller error, and
  the seam refusing it is what KEEPS it impossible on honest chains); `acknowledge`: a
  `findingId` absent from `record.findings` THROWS (§10.2: "throws (caller error)").
  A stale `findingDigest`, a mismatched `magnitude`, an `ackMode`-violating acker: all
  APPEND — §10.2's "recorded and visibly non-counting (fidelity, not validity)";
  counting is rung (5.7)'s business.
- **(5) append** — one transition, `kind: 'finding-raised' | 'acknowledged'`, payload
  minted from the validated input plus the identity (`raiser`/`acker` — the recorded
  `acker`-for-`actor` divergence, already labeled at `types.ts`), `at` stamped by the
  library's own clock, `prevHash` the head digest, CAS target `'open'`, meta
  `{ nonTerminal: true, dueAt? }` per the re-supply ruling. Non-append refuses
  `record-not-open`.

## 3. The gate (`kernel/finalize.ts`, rung (5.7))

Between rung (5.5)'s loop and the success batch: the library replays the record's own
findings and acks — **no new finalize inputs**; `FinalizeOptions` is untouched — and
derives coverage with the read side's `findingCoverage(record.findings, leg.ackMode,
leg.requiredAcks)` (the shared-derivation design the module was built for). The FIRST
row in first-raise order whose coverage is `'ack-missing'` or `'ack-stale'` refuses that
code via `refuseMaybeAppend` — both codes `refusal`-class, `terminalRefusals`-able,
open-by-default, exactly the §8 row the first step-7 increment transcribed.
`'covered'`/`'not-required'` rows pass; an undeclared flow or a findings-free record
passes vacuously (§10.2: "`requiredAcks` gates *raised* findings; it does not require
findings to exist").

Structure updates travelling with the rung (the lesson-11 class): `finalize.ts`'s header
rung list gains (5.7); `finalize-check-order.test.ts`'s "nine-rung" header becomes
ten-rung, and the corpus grows by the two new jointly-constructible adjacent pairs —
(5.5)→(5.7) (a failing required consultation outranks a missing ack on the same record)
and (5.7)→(6) (the same unreachability treatment the old (5.5)→(6) pair carries — a
batch conflict is not a refusal code; the argument transfers verbatim to the new
adjacency).

## 4. The comment finalizations (the two-touch second touch)

Every "landing in the second step-7 increment" written by the first increment is
finalized by the landing commit itself (lesson-7 discipline, IN the plan): `types.ts`'s
`TransitionKind` "not yet `finding-raised`/`acknowledged`" sentence (now FALSE — the
kernel mints both); `chain/replay.ts`'s "their kernel producers landing…" doc sentence;
`kernel/findings.ts`'s module header ("the gate consumes this at…") and the
half-declared fail-closed branch's "will make unreachable" (the construction rule now
EXISTS — the branch stays, the tense moves); `refusal-codes.ts`'s two producer comments;
`refusal-matrix.test.ts`'s two section banners; `types.ts`'s `AcknowledgedPayload`
"the `acknowledge` seam (landing…)" phrasing. The record task's sweep greps
`second step-7 increment` and finalizes every hit — hit-count == verdict-count.

## 5. The marker move (`docs/concept/SPEC.md` + `docs/concept/CONTROLS.md`)

Its own commit, after the atomic commit's gates are green: the nine enumerated tokens,
`[DESIGNED]` → `[PROVEN]` (SPEC.md's eight) and `DESIGNED` → `PROVEN` (CONTROLS.md:44's
bare-word cell), nothing else on any line. Verification is byte-wise: `git diff` for
the commit must show exactly nine changed lines across the two files, each differing
only in the token (the bolding — `**[DESIGNED]**` at 127/324/550/573/591/638/745, plain
`[DESIGNED]` at 522, bare `DESIGNED` in CONTROLS.md's table cell — is preserved around
the swap). The standing never-edit rule on `docs/concept/` is LIFTED for exactly this
commit and exactly these tokens, per the user's step-7 brainstorm ruling; it re-arms
immediately after.

## 6. Tests

- **Seam pins** (new `findings-seams.test.ts`): a raise on an open declaring record
  appends (payload key-set pin; `at` library-stamped, never host time; `raiser` = the
  identity argument); a re-raise updates (replayed current version moves); a kind-change
  re-raise THROWS at the seam; an ack appends; a stale-digest ack appends (fidelity,
  visible via `review()`); an ack to an absent `findingId` THROWS; intake throws
  (malformed finding/ack/identity, unknown key); a NON-declaring leg's seams THROW and
  its chain stays byte-identical (no append observed); chain-verify outranks everything
  (tampered chain ⇒ `chain-compromise`, both seams); `expired` ⇒ `leg-expired`; due-open
  ⇒ en-passant `expired` edge + `leg-expired`; `confirmed` ⇒ `record-not-open`,
  never-append; the `dueAt` re-supply pin (a raised-on record still `listDue`s at its
  open deadline).
- **Gate pins**: `ack-missing` (raised required kind, zero acks); `ack-stale` (stale
  digest; magnitude mismatch; `ackMode`-violating ack under `counterparty`); covered ⇒
  `confirmed`, the batch unchanged in shape; vacuous pass (zero raised of a required
  kind; a non-declaring profile untouched); non-required kinds never gate; first-trip in
  first-raise order (two uncovered findings ⇒ the FIRST's code); `terminalRefusals:
  ['ack-missing']` ends the leg (the default-`appendsOn` path's first real consumer);
  the (5.5)→(5.7) adjacent-pair order test, with (5.7)→(6) taking the unreachability
  note (the old (5.5)→(6) treatment, transferred).
- **Construction pins**: both-or-neither throws both directions; the settled-class
  throws (empty array, duplicate, empty-string kind); `'facts'` in `requiredAcks` is
  LEGAL; a declaring profile constructs cleanly; the guard-sweep-total swap.
- **Count pins**: the construction-guarded count 4 → 2 wherever pinned.
- **Frozen surfaces**: `byte-stability.test.ts`, `chain/encoding.ts`, `src/store/`
  untouched (the store already maps both kinds state-preserving — no store change is
  needed or permitted); `docs/concept/` untouched EXCEPT the marker commit's eight
  lines.

## 7. The record — step 7 exits

- **Status doc**: steps table → step 7 **Exited** (two increments named); §10.2 row →
  whole in this build (seams, gate, lift, marker all real; the `acker` divergence and
  nested-`acks` reading entries stay, tense updated); §8 row: `ack-missing`/`ack-stale`
  producers real (rung (5.7)); §9 row: the seams on the operator surface; the governed
  count 4 → 2 WITH the movement named and the "down to N" tail convention (lesson 15);
  the guard-lift boundary paragraph appended (the doc's own convention — `ackMode` +
  `requiredAcks` lifted together at the second step-7 increment, in the same commit as
  the seams + gate; what replaces them is `validateFindingsFlow`); the marker move
  recorded as executed, with the eight-token enumeration.
- **CLAUDE.md / README**: step 7 exited; the construction-guarded count narrative gains
  the 4 → 2 movement; "one of the eight build-order steps remains unstarted (step 8)"
  stays true and is re-verified against the steps table.
- **Register**: read it; no rows expected to move (verify by reading — say so).
- **Sweep patterns** (LAST, committed tree, hit==verdict): the standing list plus
  `second step-7 increment`, `landing in`, `will make`, `not yet ENFORCED`,
  `not yet finding-raised`, `nine-rung`, `corpus total`, `governed count UNCHANGED`,
  `four fields are governed`, `4`-as-governed-count phrasings, the §10.2 status-doc
  row's prior text, `[DESIGNED]` (repo-wide OUTSIDE docs/concept — process docs naming
  the §10.2 marker as future must have moved), `Started` (the steps-table cell).

## What this does not claim

- **`freshness` stays GOVERNED and §11.1's freshness tail stays `[SKETCHED]`** — the
  AL1 vacuity argument is untouched by this increment. `captureMode:'live'` stays
  GOVERNED. The construction-guarded count lands at 2 and this document says so with the
  movement, not as a bare count.
- **Step 8 (`supersedes` recovery) is unstarted**; its `[SKETCHED]` tokens do not move.
- **The library still never interprets `magnitude`** — opaque, exact-equality,
  host-canonicalized.
- The sweep (`listDue`) gains no append authority; the seams are ordinary operator
  seams driven by the host.

## Process

Subagent-driven development, standing lessons in force: the atomic commit is ONE task
(seams + gate + lift indivisible by the brainstorm ruling); the marker move is its own
task with byte-wise diff verification; plan-authored comments truthful at the commit
that lands them; counts stated with the movement named; the record task's sweep runs
LAST against the committed tree with hit-count == verdict-count; every identifier
written into docs verified against the tree; a mandated RED run is executed or its
substitution stated; NO new rung lands on a tx-carrying seam (rung (5.7) lands in
`finalize()`, which takes no `tx` — stated so the lesson-9 check is discharged, not
skipped); the final review checks the status doc against CODE; no new runtime APIs —
the floor stays `>=22.16`.
