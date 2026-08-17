# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## What this project is

The home of **Vidimera** — a domain-agnostic verifiable-decision-record library — in two
parts:

- **The concept set** (`docs/concept/`): ten self-contained markdown documents that
  present the Vidimera concept whole, at its deliberate embedded, operator-only scope —
  the proven kernel, the profile-declared governed controls, sketched upgrades, and the
  operator-assurance tier. The operator is the sole consumer of the records; capabilities
  meaningful only to an outside party are out of scope by design.
- **The implementation** (`packages/`): a TypeScript pnpm-workspace monorepo implementing
  the concept in the proven build order (`docs/concept/SCOPING-GUIDE.md` §7). Build-order
  step 1 — the kernel — was adopted from a reference implementation of the same spec and
  **has reached its exit**; `packages/record/src` is real code today, not a skeleton, and
  `create()` is implemented and exercised by a full suite with zero skips. A base-vs-head
  provenance audit (`docs/process/adopted-source-provenance.md`) found ten fixes the
  reference project had already made that this build had not taken; the nine that were
  genuinely applicable are now applied, and the tenth was reclassified as a local
  improvement rather than an inherited fix (see that document). The remediation plan's
  units R1–R5 (`docs/superpowers/plans/2026-08-03-step-1-remediation.md`) are all
  complete. Step 2 — the store, for real — **exited, with a recorded deferral**: five
  increments landed the atomic `appendBatch`, `listDue`, §12's
  `{ nonTerminal, dueAt? }` meta shape on both append seams, the C4 seal-finality bar,
  the operator-only `seal()` chain-retirement seam with its derived
  `active`/`retired` status, `findNonTerminal`, completing the eight-method Store
  contract, the backing-parameterized conformance suite (test-side, run over that one
  backing), and the embedded-SQL adapter (`store/sqlite.ts`) with the `tx?` seam and the
  cross-backing byte-identity test — two of §12's three reference backings, held
  equivalent by the suite and the byte-identity test; the server-SQL adapter is deferred
  to deferral register row 15, which carries the exit ruling. Step 3 — redemption (the
  effect seam) — **exited**: three increments landed. The first
  landed SPEC §11.2's direct shape, `redeem(recordId, content, tx?)` as a verify-first
  ladder ending in `confirmed → redeemed { via: 'direct' }`. The second landed the token
  shape, `beginRedemption`/`completeRedemption`, ending in `confirmed → redeeming { tokenDigest }`
  then `redeeming → redeemed { via: 'token', tokenDigest }`. The third landed the clocks:
  one generalized module (`kernel/expiry.ts`) resolving both remaining SPEC §4 edges —
  `confirmed → expired` (the `confirmToRedeem` window) and `redeeming → redemption-failed`
  (the `redeemBound` window) — the fourteenth refusal code `redemption-timeout`, the
  `redeemBound` construction guard lifted, and `operator.listDue()`, the sweep's one read
  surface; §11.2 is whole in this build. Step 4 — multi-leg separation of duties — has
  **reached its exit**: two increments landed. The first landed `open()`'s SPEC §10.1
  sequencing rung (`kernel/prior-legs.ts`'s `verifyPriorLegs`), which verifies every
  prior-leg reference by replay — the six conditions the section names — before a successor
  record is created, and chains the verified evidence, the recorded `priorRecordRefs` plus
  library-derived `priorLegActors`, into the successor's `opened` snapshot; the fifteenth
  refusal code, `prior-leg-unverified`, is a pre-record never-append. The second landed the
  SoD gate itself: `finalize()`'s rung 3.5 reads that chained evidence — `sod.notActorOf`
  keyed by the record's own recorded references, principal-only comparison, and `proposer`
  as the may-not-decide-own-leg pin — both raising the sixteenth refusal code,
  `sod-violation`. §10.1 is whole in this build. Step 5 — required-consultation gating,
  SPEC §11.1 — **has reached its exit**: two increments landed. The first landed §11.1's
  unconditional half, "The attach form is always available." `finalize()` gains its first
  options bag, `opts?: FinalizeOptions` (§9's documented five-argument signature,
  `finalize(recordId, identity, content, facts, opts?)`, now real), a standalone intake
  validator (`kernel/consultations.ts`) that throws at argument depth — before the chain
  loads — on a malformed entry, a reserved kind, or a duplicate kind, and a variable-arity
  success batch, `appendBatch([chain-verify, facts, …obtained consultations, confirmed])`,
  each entry stamped with the library's own recording time, never a host-supplied one. The
  second landed the gate itself: `finalize()`'s rung 5.5 reads a leg's declared
  `requiredConsultations` in order — an obtained `fail` verdict on a required kind refuses
  `consultation-failed` (the seventeenth code), a required kind absent from the supplied
  set refuses `consultation-missing` (that code's second producer, after the facts rung),
  and a required kind the host reports unreachable produces the `availability` outcome
  instead (the eighteenth code and its own third outcome class — `{ status: 'unavailable';
  code: 'availability'; authority }`, never a `refused` edge and never appended, the
  record staying open so the seam re-arms for bounded host retry); the
  `requiredConsultations` GOVERNED throw lifted with the gate in the same commit (governed
  count 7 → 6). §11.1 is whole in this build except its freshness tail: `freshness` stays
  GOVERNED and `[SKETCHED]` deliberately (an AL1 build can never make that bound fire).
  Step 6 — authority checks: eligibility + policy drift, SPEC §10.4 + §10.3 — **has
  exited**: both of its two increments landed. The first landed eligibility gating, SPEC
  §10.4 whole — declaring a per-leg `eligibility` reference makes `'eligibility'` an
  implicit-FIRST required consultation kind at `finalize()`'s rung 5.5, checked ahead of the
  leg's own declared `requiredConsultations`; a `fail` verdict on that implicit kind refuses
  `ineligible` (the nineteenth code, `refusal`-class, open-by-default so a different
  eligible actor may decide), while a missing or unreachable input keeps the generic codes,
  and a NON-declaring leg that merely lists `'eligibility'` in `requiredConsultations` keeps
  the generic codes too; the `eligibility` GOVERNED throw lifted with the gate in the same
  commit (governed count 6 → 5). The second landed policy-drift notarization, SPEC §10.3
  whole: `open()`'s options bag binds the operator-attested `policyDigest` into the genesis,
  present-iff-declared and fail-closed loud both directions; `finalize()`'s matching
  presence contract requires (or, on a non-declaring profile, forbids) `opts.policy` at
  profile-resolution depth; and rung (4.5) compares the live digest against the record's
  bound one — `policy-drift` (the twentieth code) on mismatch, including both cross-instance
  corners, and the `availability` outcome (its second producer) on a reported-unreachable
  source; the cross-drift open decision named at the step-6 brainstorm is DECIDED in code as
  FAIL-CLOSE, so a bound record finalized under a same-id non-declaring instance still
  refuses `policy-drift` rather than skipping the gate; the `policySource` GOVERNED throw
  lifted with all three seam obligations in the same commit (governed count 5 → 4).
  Step 7 — findings & acknowledgments, SPEC §10.2, where the first draft-ahead maturity
  marker could finally move — **has exited**: two increments landed. The first landed
  SPEC §10.2's read half: `ack-missing`/`ack-stale` join the refusal-code
  union (twenty-first and twenty-second; count 20 → 22 in one move), `replay()`'s two
  throwing arms fold instead (a `kind`-mutating re-raise and an ack naming an absent
  `findingId` throw as storage/config faults, unreachable on any chain a seam can
  mint), `DecisionRecord`/`ReviewView` gain a digest-only findings projection, and
  `kernel/findings.ts` carries the counting-ack predicate and the per-finding
  coverage derivation finalize's gate consumes as of the second increment — every piece
  exercisable, at that point, only over hand-built chains, since no seam minted either kind
  yet. **The second landed the seams, the gate, and the construction lift, all three in ONE
  atomic commit**: the two operator-only seams (`kernel/findings-seams.ts`'s
  `raiseFinding`/`acknowledge`, sharing one prologue — argument intake, chain-verify FIRST,
  profile/leg resolution, a declaring-check throw on a non-declaring leg, state/expiry en
  passant, and the seam-specific semantic check before the one append, which re-supplies the
  open window's `dueAt`); `finalize()`'s rung (5.7), reading the read side's own
  `findingCoverage` derivation with no new finalize inputs and refusing `ack-missing`/
  `ack-stale` at the first tripped row in first-raise order; and the `ackMode`/
  `requiredAcks` construction-guard lift (`validateFindingsFlow`, `config.ts` — both-or-neither
  plus the settled fail-closed class, deliberately WITHOUT a reserved-kind arm, since finding
  kinds are their own namespace). §10.2 is whole in this build. The second step-7 increment
  then executed the marker ruling: SPEC §10.2's nine `[DESIGNED]`/`DESIGNED` tokens — eight in SPEC.md,
  one in CONTROLS.md — moved to `[PROVEN]`/`PROVEN`, the first draft-ahead marker to move in
  this repository.
  Step 8 — recovery, live capture, AL2 signing, the self-test tier — **has started**: its
  first item, SPEC §2's recovery linkage, landed whole. `open()` gains a new pre-genesis
  recovery rung (`kernel/supersedes.ts`'s `verifySupersedes`, consumed after the prior-legs
  sequencing rung and before the genesis mint): given a host-supplied `supersedes` claim —
  `{ recordId, chainHead }` naming a terminal predecessor — it replays that chain and
  requires it intact, its recomputed head matching the claim, TERMINAL by the derived
  formula (the `confirmed`-state profile-resolution nuance failing closed: an unresolvable
  predecessor profile fails closed too), and decided over the SAME `subjectRef`; any
  failure refuses the twenty-third code, `supersedes-unverified` (count 22 → 23), pre-record
  and never-appended, the `prior-leg-unverified` pattern at its own name. On success the
  verified reference binds into the recovering record's genesis and folds by replay onto
  `DecisionRecord.supersedes`; `ReviewView` deliberately does NOT gain the field, the
  `priorRecordRefs` precedent. This is the LAST call-seam GOVERNED guard in the build:
  `open()`'s options bag now carries all three of its documented keys —
  `priorRecordRefs`, `policyDigest`, `supersedes` — for real, and `kernel/open.ts`'s own
  per-key `openOptionMessage` helper — the arm that named `supersedes` GOVERNED — is
  deleted whole in the same commit as the behavior, its generic message inlined via a
  direct call to `config.ts`'s `governedUnavailable`, which never had per-key arms of its
  own and still serves the two construction guards plus the generic unknown-key throws.
  This
  is a DIFFERENT tally from the construction-guarded count below, which the lift leaves
  UNCHANGED at two — a call-seam guard on a real, documented options-bag key is not a
  `ConfirmProfile` construction guard. Step 8 records **Started**, not Exited: the tail —
  live-mode capture and `reverify`, AL2 detached signing, and the self-test tier — is
  deferred to deferral register row 17, each gated on its own OPEN-QUESTIONS enablement
  design rather than bundled into this one increment.
  **`docs/process/implementation-status.md` is the authoritative
  account** of what this build does and does not implement, section by section, with the
  gate outputs and the outstanding list — read it rather than trusting a count here,
  which is a claim with a shelf life and no way to fail loudly. Step 8, the last of the
  eight build-order steps, has started, its tail deferred by name, and the package is not
  consumable by a host today.

## The standalone contract

The concept set's hard rule: **the documents reference nothing outside this repository.**
No external repos, files, projects, commits, or internal development history — the concept
stands on this text alone. Generic mention of "a reference implementation" is permitted;
naming, pathing, or dating one is not. All newly authored markdown in this repository
(README, process docs, specs, plans) stays free of external URLs so the repo-wide scan
keeps holding.

## The document set

`docs/concept/README.md` is the set's front door and maps all ten documents. The
load-bearing structure:

- **`docs/concept/SPEC.md` is the single normative document.** Every other document is
  downstream and defers to it; fix conflicts in the other document unless the spec itself
  is being deliberately revised. Code implements the spec; where code and spec differ,
  one of them is wrong and the difference is a finding, never silently reconciled.
- `docs/concept/CONCEPT.md` holds the identity: the purpose statement, the **four
  non-negotiable principles** (graduated honesty, fidelity-not-validity, human anchor,
  identity-by-transport), the honesty discipline, and the anti-goals. A change that
  touches the principles or honesty discipline is a **fork of the concept**, not an
  edit — it must be called out as such, never slipped in.
- `docs/concept/CONTROLS.md` / `docs/concept/SCOPING-GUIDE.md` carry the scope machinery
  (tier test, promotion rule with purpose-trace, rescoping checklist). Scope changes to
  the concept go through that machinery and get recorded.
- **Maturity markers are accuracy claims.** `[PROVEN]` / `[DESIGNED]` / `[SKETCHED]`
  (legend in `docs/concept/README.md`) must stay truthful: `[PROVEN]` speaks to a
  reference implementation of the spec; a marker moves only when the behavior actually
  lands in this repository.
- Editorial voice: every guarantee is stated with its limit in the same breath; never
  "non-repudiation"; never a compliance claim; domain examples stay generic.

## Commands

pnpm workspace (Node 22.16+, pnpm via corepack):

- `pnpm install` — install dev dependencies
- `pnpm typecheck` — tsc strict, no emit
- `pnpm lint` — Biome (`pnpm lint:fix` to apply safe fixes)
- `pnpm test` — vitest, all packages
- `pnpm contract-scan` — the **standalone contract scan**: run before any commit that
  touches markdown or TypeScript. Prints nothing and exits 0 when clean; prints
  `path:line:text` and exits 1 on findings (`scripts/contract-scan.mjs`). Scans all
  tracked `*.md` except this file, and all tracked `*.ts`/`*.mts`/`*.cts`: external-link
  and ADR-style checks repo-wide; the escaping-relative-path check on the concept set and
  root README, where self-containment is the contract (a document-only check — a
  TypeScript relative import stays legal). Tracked code is additionally checked for
  pointers into a design-document, slice/increment, task and open-question numbering
  scheme that has no counterpart here (`design §4`, `slice 7`, `Task 5`, `OQ2-10`) — such
  a reader-unresolvable pointer is an external reference in the contract's sense. A
  maintainer working alongside other private repositories should extend the script's
  patterns with those projects' names, package names, and tooling. **Exits 0 today, zero
  findings** — the imported kernel's comment scrub that rewrote every reference-project
  pointer is complete. The scan also **resolves** citations in tracked code: a `SPEC §N`
  must name a section that exists, and a quoted phrase attached to a citation must occur
  in the document it is attributed to. That resolver ships with a bounds list in the
  script's own header naming what it deliberately does **not** check — read it before
  treating a green scan as coverage. **Markdown is not citation-checked at all**, so a
  wrong citation in a process document, plan or README has no gate behind it and must be
  hand-verified against a whitespace-collapsed copy of the source: a quoted SPEC phrase
  that wraps a line break is present in the source and invisible to a naive `grep -F`,
  which is a standing trap here and has repeatedly produced false "missing quotation"
  findings. A reader should diff a new run's output, never just compare totals, before
  treating any red result as a regression — a scan total moving has hidden an equal-sized
  regression in the opposite direction here before.

CI (`.github/workflows/ci.yml`) runs typecheck, test, lint, contract-scan, and the
stricter `lint:strict` (`biome check --error-on-warnings`) on every push to `main` and
every pull request, with read-only token permissions and one cancel-on-supersede
concurrency group per ref.

## Process disciplines (inherited from the concept)

From `docs/concept/SCOPING-GUIDE.md` §7, binding on implementation work here:

- One cluster per increment; **spec-moves-to-truth** at every increment's exit (a
  maturity marker moves only when the behavior lands in this repository). That exit step
  has **nothing to move** at steps 1–6: every section those steps build is already
  `[PROVEN]`, and the first draft-ahead marker that could come off was §10.2's `[DESIGNED]`
  at step 7 — and it moved, at the second step-7 increment's own exit, the first such move
  in this repository. A second move landed at step 8's own first increment: SPEC §2's five
  `[SKETCHED]` recovery tokens (SPEC.md ~128/130/318/564, CONTROLS.md ~46) moved to
  `[PROVEN]` once the behavior they describe — `open()`'s recovery rung — landed, tokens
  only, byte-verified. `docs/process/implementation-status.md` is the substitute exit record
  that moves at every other step's exit — do not expect a marker change at steps 1–6 and do
  not manufacture one there.
- **Inverting an inherited pinned assertion is authorized explicitly, never slipped in.**
  The kernel arrived with the reference implementation's test corpus; adopting a corpus
  and quietly changing what it pins is how a build drifts while its suite stays green. Two
  inversions have been authorized so far, both during the step-1 remediation, each argued
  in place at `packages/record/test/terminality.test.ts` and recorded in the exit record.
- Feature guards from day one — an unimplemented capability throws at construction
  (`config.ts` `validateProfile`; two governed profile fields throw there, four before the
  second step-7 increment lifted `ackMode`/`requiredAcks` alongside the seams and gate that
  give them teeth; five before the second step-6 increment lifted `policySource` alongside
  all three of its own seam
  obligations). `redeem`
  was originally the eleventh governed capability, throwing at the call seam instead
  (`kernel/redeem.ts`) rather than at construction; the first step-3 increment landed
  SPEC §11.2's direct shape, and the second landed the token shape —
  `beginRedemption`/`completeRedemption`, two NEW operator calls with no throwing-stub
  history to lift, unlike `redeem`'s own — so that throw is gone from every confirmed or
  redeeming effect-seam record. **Nothing at the redemption seams remains governed as of
  the third step-3 increment**: `redeemBound`'s own construction guard (`config.ts`) —
  added at the second step-3 increment, briefly bringing the construction-guarded count to
  eleven — lifted WITH its clock at the third, back down to ten. `beginRedemption`
  now mints SPEC §4's present-iff-declared `bound` byte into the `redeeming` payload (via
  `deadlineIso`), and `kernel/expiry.ts`'s `resolveDueClock` resolves the window that byte
  opens — together the guard's own stated trigger, so a declaring profile constructs cleanly;
  `confirmToRedeem` was accepted-but-inert from the second increment and is now genuinely
  acted on by the same clock; and `redemption-timeout` has a real producer, the clock
  resolution shared by all three redemption seams' prologue. A confirmed
  effect-seam record's held `(profile, subject)` pair is now
  released by that direct-shape redemption — the `confirmed → redeemed` edge lifts the
  Store's C1 exclusivity hold, where before neither a throw nor a refusal could. `seal()`
  remains **not** a release path: SPEC §12 admits it only against a derived-terminal
  record, and a final-leg `confirmed` on an effect-seam profile is non-terminal (SPEC §2).
  That last claim is no longer argued only in prose — now that `seal()` is built, it is
  pinned by an executing test in `packages/record/test/seal.test.ts`. Recorded in
  `docs/process/implementation-status.md` (an earlier framing of this remedy was itself
  wrong and was corrected in place, first in the now-retired deferral register row 9 and
  carried forward when that row retired; the `seal()`-as-release half was a second error,
  found by the citation audit and corrected in the same place). **The construction-guarded
  count moves twice more, across the two step-4 increments: ten down to seven.**
  `legs.length>1` — SPEC §10.1's multi-leg maker-checker sequencing — was GOVERNED from the
  kernel increment on; it lifted at the first step-4 increment because `open()`'s new
  sequencing rung (`kernel/prior-legs.ts`'s `verifyPriorLegs`, consumed before a successor
  record is created) now verifies every prior-leg reference by replay, landing in the same
  commit as the lift, bringing the count to nine. Per-leg `sod.notActorOf` and `proposer` —
  SPEC §10.1's own two remaining controls — lifted together at the second step-4 increment,
  in the same commit as `finalize()`'s new rung 3.5, which reads the now-chained
  `priorLegActors` evidence and raises the sixteenth refusal code, `sod-violation`, on
  either a `notActorOf` match (principal-only comparison; a lookup miss also refuses,
  fail-closed) or a `proposer` match — bringing the count to seven. What replaces the two
  guards is this build's own fail-closed structural posture, `validateSodShape`
  (`config.ts`): `sod.notActorOf` entries must be non-empty, pairwise distinct, and name a
  strictly-earlier leg, and `proposer` is multi-leg-only — the spec is silent on all three
  rulings; each is a permitted tightening, not a divergence. **The construction-guarded
  count moves once more, at the second step-5 increment: seven down to six.**
  `requiredConsultations` — SPEC §11.1's required-consultation gating — was GOVERNED from
  the kernel increment on; it lifted because `finalize()`'s new rung 5.5 now reads the
  declaration, landing in the same commit as the lift. What replaces the guard is this
  build's own fail-closed structural posture, `validateRequiredConsultations`
  (`config.ts`), the same settled class as `validateSodShape`'s: the declared list must be
  non-empty, pairwise distinct, every kind a non-empty string, and never a reserved
  library-emitted kind (`facts`, `chain-verify`) — the spec's own sentence for the last
  rule ("declaring a reserved kind in `requiredConsultations` is likewise a
  profile-construction error"). `freshness` stays governed deliberately, since at AL1 the
  library stamps every consultation's own recording time, so a `freshness` bound could
  never fire (the spec's own vacuity argument). **The construction-guarded count moves once
  more, at the first step-6 increment: six down to five.** `eligibility` — SPEC §10.4's
  eligibility gating — was GOVERNED from the kernel increment on; it lifted because
  `finalize()`'s rung 5.5 now reads the declaration too, prepending an implicit-FIRST
  `'eligibility'` required kind ahead of the leg's own declared `requiredConsultations`,
  landing in the same commit as the lift. What replaces the guard is this build's own
  fail-closed structural posture, `validateEligibility` (`config.ts`), the same settled
  class as `validateSodShape`'s/`validateRequiredConsultations`'s: an empty label throws as
  the malformed-reference rule (the gate keys on the declaration's presence, never the
  label — NOT `proposer: ''`'s inertness trap), and declaring `eligibility` while also
  listing `'eligibility'` in the same leg's `requiredConsultations` throws SPEC §10.4's own
  "declare it once" construction error. **The construction-guarded count moves once more, at
  the second step-6 increment: five down to four.** `policySource` — SPEC §10.3's opaque
  per-profile policy-authority label — was GOVERNED from the kernel increment on; it lifted
  because all three of its own seam obligations land in the same commit: `open()`'s binding
  contract binds the operator-attested `policyDigest` into the genesis, present-iff-declared
  and fail-closed loud both directions; `finalize()`'s presence contract requires (or, on a
  non-declaring profile, forbids unconditionally) `opts.policy` at profile-resolution depth;
  and `finalize()`'s new rung (4.5) compares the live digest against the record's bound one,
  raising the twentieth refusal code, `policy-drift`, on a mismatch — including both
  cross-instance corners, the reverse one answering §10.3's own named open decision
  FAIL-CLOSE — and the `availability` outcome (its second producer) on a reported-unreachable
  source. What replaces the guard is the same settled fail-closed structural class
  `validateEligibility`'s own empty-label rule uses: an opaque reference that references
  nothing is malformed config. **The construction-guarded count moves once more, at the
  second step-7 increment: four down to two.** `ackMode`/`requiredAcks` — SPEC §10.2's
  findings-flow controls, declared both-or-neither — were GOVERNED-throw-guarded
  individually from the kernel increment on; they lift together because the write half
  lands in the SAME commit as the lift: the two operator-only seams
  (`kernel/findings-seams.ts`'s `raiseFinding`/`acknowledge`) and `finalize()`'s new rung
  (5.7), which reads the pair's own declaration via the read side's `findingCoverage`
  derivation and raises `ack-missing`/`ack-stale` on it. What replaces the guard is
  `validateFindingsFlow` (`config.ts`), the same settled fail-closed structural class
  `validateEligibility`'s/`validateRequiredConsultations`'s/`validateSodShape`'s: both-or-
  neither, and `requiredAcks` non-empty, pairwise distinct, every kind a non-empty string —
  deliberately WITHOUT a reserved-kind arm, since finding kinds are their own namespace
  (SPEC §10.2: "the reserved consultation kinds do not apply to them"), so `'facts'` is a
  LEGAL `requiredAcks` kind. Two fields are governed today: the whole-profile
  `captureMode:'live'`, and the per-leg `freshness`. **The one call-seam GOVERNED guard
  outside `validateProfile` — `open()`'s `supersedes` options key (`kernel/open.ts`, reusing
  this same `governedUnavailable` helper) — lifted separately, at the step-8 recovery
  increment**, once `kernel/supersedes.ts`'s `verifySupersedes` existed to honor it; this is
  the LAST call-seam GOVERNED guard in the build, and its lift does not move the
  construction-guarded count above, which is a distinct tally.
- Byte-stability pins and adjacent-pair gate-order tests, from the kernel increment on.
- The living deferral register: `docs/process/deferral-register.md`.
