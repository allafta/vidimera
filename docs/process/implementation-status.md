# Implementation status

**What this document is.** The running record of what has actually landed **in this
repository**, build-order step by build-order step (`docs/concept/SCOPING-GUIDE.md` §7's
sequence). Per step it carries four things: what landed here, the commit range, the gate
outputs measured at the step's exit, and what is explicitly still outstanding. It is a
record of code, not of intent — every claim below is settled against
`packages/record/src`, and where a section of the spec is partly built the entry says
which part.

---

## Current state

**Read this first.** The step-by-step accounts below are this repository's historical
record, increment by increment; this block is the state, kept current rather than frozen at
any one exit.

- **The build order is complete.** All eight build-order steps
  (`docs/concept/SCOPING-GUIDE.md` §7) are exited; the last, step 8, settled at the
  self-test-tier increment's own fix wave, commit `84484ba`.
- **A ninth increment, past the build order, has landed: recorded human decline** —
  SPEC §9's `open → declined` seam, the human "no" with confirm's own evidentiary
  treatment. See the dedicated section at the end of this document for the full account;
  the numbers immediately below already include it.
- **A tenth increment, past the build order, has landed: proposal provenance** — SPEC
  §9's `open`-time `proposed { stagedRef }` option, resolving and binding an agent's
  original proposal digest into the genesis as `proposedDigest` so a record distinguishes
  what was proposed from what was decided. See the dedicated section at the end of this
  document for the full account; the numbers immediately below already include it.
- **An eleventh increment, past the build order, has landed: effect-result
  notarization** — SPEC §11.2's `redeem.result` declaration, admitting a host-claimed
  outcome digest bound into the `redeemed` payload at the enlisted direct seam and token
  completion. See the dedicated section at the end of this document for the full
  account; the numbers immediately below already include it.
- **A twelfth increment, past the build order, has landed: release-readiness
  reconciliation** — the publish-facing docset caught up with the three capabilities above,
  the paused cut's stale-CHANGELOG trap recorded, and two sanctioned enumeration closures in
  the sealed set (SPEC §2's `resultDigest` row and list entry; SPEC §13's correction-rate
  vector). See the dedicated section at the end of this document for the full account.
- **A thirteenth increment, past the build order, has landed: truth repairs** — ten tracked
  source-comment and test-header claims, plus one stale count in the separate increment
  record (`docs/superpowers/INDEX.md`), that asserted a state the tree had already left
  behind were repaired or corrected in place, and a new gate (`scripts/docs-index-sync.mjs`)
  now keeps that increment record's own counts from drifting silently again. One of the ten
  (row 4, `packages/record/src/store/memory.ts`) was missed by the plan's own task
  decomposition — the design enumerated ten rows, the plan's four repair tasks covered nine,
  and the plan's own self-review note asserted coverage it did not deliver — caught at this
  increment's own exit review and repaired here, an instance of the same enumeration defect
  the increment targets, found in the increment's own plan. No behavior landed and no
  maturity marker moved. See the dedicated section at the end of this document for the full
  account; the numbers immediately below already include it.
- **A further increment, past the build order, has landed: Finding E adjudicated** — the
  signature-enforcement-coverage findings record's own Finding E (whether `kernel/decline.ts`'s
  rung (1) running before its leg-declaration gate is a defect) is resolved: not a defect,
  by SPEC §4's scoped byte-identity invariant, SPEC §5's mandatory pre-seam chain-verify, and
  SPEC §9's own adjudicated ordering of the two competing checks. Two throw messages that
  asserted the byte-identity claim without the scoping qualifier that makes it true —
  `kernel/decline.ts`'s declaration gate and its identical twin in
  `kernel/findings-seams.ts`'s declaring check — are reworded together, since a one-site fix
  would leave the sibling standing. The corner both messages glossed (a non-declaring leg
  over a hash-broken chain) is pinned by a new test at each site, closing the hash-broken
  half of deferral-register row 20; row 20's item text is narrowed to name only the
  signature-broken half as still unexercised. That same fix's own edit to
  `kernel/decline.ts` fired row 20's ORIGINAL trigger without closing the row, so it is
  RETRIGGERED — kept open under its same number but a new trigger text, the house form row
  5 (`docs/process/next-phases.md`) already uses. No behavior changed, no bytes moved, and
  no maturity marker moved. See the dedicated section at the end of this document for the
  full account; the numbers immediately below already include it. (**Updated 2026-08-23:**
  row 20 has since RETIRED, at the AL2 signature-enforcement coverage increment below,
  which closed the signature-broken half this bullet names as still unexercised. The
  bullet stays as the Finding E narrative it was, its present tense true at its own
  writing; the register carries the numbering gap.)
- **A further increment, past the build order, has landed: AL2 signature-enforcement
  coverage** — the signature-broken half of the AL2 enforcement surface, which register rows
  20 and 21 held open, is now executed and shape-asserted at all seven
  `signatureLayerHolds` call sites, and a call-site census fails on the day an eighth site
  appears. Test-only: the increment's single `packages/*/src/` edit is a comment, and no
  maturity marker moved. It retires rows 20 and 21 and opens row 22 (orphan sidecar growth
  on the no-edge refusal path, recorded rather than fixed — restated 2026-08-28 by the
  row-22 truth-repairs increment with a measured containment inventory in place of the
  dilemma it first recorded, and re-scoped 2026-08-29 by the no-edge containment increment,
  which closed its redundant-signing half on behavior and left its orphan half open). See
  the dedicated sections at the end of this document for the full accounts; the numbers
  immediately below already include them. (**Updated 2026-11-19:** row 22 has since RETIRED,
  at the transactional-sidecar increment, which leaves no orphan on that path when the
  configured sidecar is the store's own; the bullet stays as the narrative it was.)
- **A further increment, past the build order, has landed: code-review fixes (six phases)** —
  a 2026-09-02 code review of the tree at `d5fc3b9`, worked phase by phase on branch
  `code-review-fixes`, one commit per phase with the argument in its message. Behavior moved in
  four phases: a batch `seq` conflict at `finalize`/`decline` is contention under a conforming
  Store (first an `Error` named `ContentionError`, since the record-contended increment the
  returned refusal `record-contended`), told from a storage fault by one
  re-read; `withSigning`'s per-record memo is a bounded LRU; `verifyChain` checks record
  identity, the kernel's "due" matches the stores' inclusive gate at the instant, and
  `open()`'s retried genesis is re-stamped (one authorized inversion of the no-edge memo pin,
  two mints to three); `SqliteStore` gains `close()` and a statement cache, `PostgresStore`'s
  DDL serializes on an advisory lock, and `allowedAuthorities` joins the settled construction
  class. Two phases pinned rulings without changing behavior (principal-only identity and the
  seams' host-trusted identity; the verifier's silence on content across legs, as an omission).
  Four scope questions are flagged as sanction-gated, not taken, and register row 23 opens for
  the one item deferred as its own increment. No recorded byte, digest, or maturity marker moved.
  See the dedicated section at the end of this document; the numbers immediately below already
  include it.
- **A further increment, past the build order, has landed: the CI test-gate repair
  (2026-09-03, branch `ci-windows-test-gate`)** — a canary pull request carrying one
  always-failing test showed all four CI test legs concluding success. The cause is
  `embedded-postgres`'s `async-exit-hook` `beforeExit` listener exiting 0 over vitest's exit
  code, reached because the adapter's vitest global setup imported the library at the top of
  the module, in vitest's main process. Fixed at the source (a guarded dynamic import that
  removes exactly the listener the import added, two pins), guarded independently (the
  JSON-report gate — `pnpm test:ci` then `scripts/ci-assert-tests.mjs` — in CI and the release
  workflow), and the four SQLite restart-driver probes get a 20s budget (raised to 60s on
  2026-11-19 — the note at the end of this document). No `packages/*/src/`
  file, recorded byte, digest, or maturity marker moved. Every earlier CI green on a test leg
  proved only that the step ran; this document's gate outputs were measured locally and
  stand. See the dedicated section at the end of this document; the numbers immediately
  below already include it.
- **Measured against the current tree** (re-measured at the transactional-sidecar increment's
  fix wave after its whole-branch review, 2026-11-20): `pnpm test` — 88 test files, 1240 tests,
  zero skips
  (the record and store-postgres vitest projects together, the latter over a real embedded
  Postgres its own globalSetup starts per run);
  `pnpm lint` (`biome check .`) — 161 files checked, zero errors or warnings;
  `pnpm typecheck` — clean; `node scripts/contract-scan.mjs` — no output. Both together
  (`pnpm lint:strict`, i.e. `biome check --error-on-warnings .`) are equally clean.
  `packages/record/src/refusal-codes.ts` carries 25 refusal codes, the twenty-fifth being
  `record-contended` (the record-contended increment); zero GOVERNED construction guards
  remain in `config.ts`.
- **The live deferral-register rows**: four — row 23 (the optional `tx` on the Store's five
  reads, opened 2026-09-02 by the code-review-fixes increment; it does not gate the cut — its
  own bullet in "Still outstanding" below), row 24 (the `embedded-postgres` exit-hook
  workaround, opened 2026-09-03 by the CI test-gate follow-ups; it does not gate the cut — its
  trigger is the hazard pin failing or the library being replaced) and the two that gate the
  cut: row 1 (publish tooling, whose tooling landed
  at the phase-2 packaging increment and which stays open until the release workflow is
  exercised once at the 0.1 cut); and row 19 (the AL2 detached-signature sidecar pinning
  deferral, added by the byte-regression-pins increment, held open until the first
  increment that changes signature encoding or key handling, or the 0.1 cut, whichever
  lands first — the transactional-sidecar increment changed neither). **Row 22 retired
  2026-11-19** at the transactional-sidecar increment (orphan sidecar growth on the no-edge
  refusal path, opened 2026-08-23, restated 2026-08-28, re-scoped 2026-08-29 to its orphan
  half and held open on the third horn): with the configured sidecar the store's own, each
  reference store writes a signature entry inside the atomic unit of the append it signs, and
  six refusing calls against a sealed signing record leave zero orphans on all three backings,
  measured — the third horn not taken. Its separate-mode residual is stated, not closed: a
  sidecar that is not the store's own still takes one orphan per refusing call. Its account is
  in "Still outstanding" below and in the increment's own section at the end.
  **Rows 20 and 21 retired 2026-08-23** at
  that same increment, their accounts in "Still outstanding" below; both had been added by
  the signature-enforcement-coverage findings record
  (`docs/analysis/2026-08-23-signature-enforcement-coverage.md`), which changed no
  `packages/*/src/` file and wrote no test. Five further rows retired 2026-08-19, each with
  its account in "Still outstanding" below: 6 (the API review), 5 (the Biome migration), and
  — at the phase-4 store-postgres increment — 15 (the server-SQL backing, landed whole as
  `@vidimera/store-postgres`), 16 (the token seams' `tx?`, the TWELFTH self-authored
  inversion), and 4 (the workspace shape, its trigger fired deliberately by the second
  package). See `docs/process/deferral-register.md` for the rows themselves and
  `docs/process/next-phases.md` for what gates the next cut.
- **How to read this document**: the per-step accounts below are the record of how the build
  order ran; this header is the state.

---

**Why it exists.** The process discipline this repository inherited puts
**spec-moves-to-truth** "as an explicit exit step of every increment" — "draft-ahead
markers come off only when the behavior lands" (`docs/concept/SCOPING-GUIDE.md` §7). Here,
that exit step has **nothing to move**. Nothing this kernel lands carries a draft-ahead
marker to retire — every behavior it implements is already marked `[PROVEN]` on the
strength of a reference implementation of the same spec, or sits in unmarked text. The
same holds for build-order steps 2 through 6: the sections they would build (§12, §11.2,
§10.1, §11.1, §10.4, §10.3) are `[PROVEN]` already. The first draft-ahead marker that
could come off was §10.2's `[DESIGNED]`, at step 7 — and it HAS, at the second step-7
increment's own exit (see the §10.2 row and the boundary below). So the inherited exit
step is vacuous
at step 1's exit and stays vacuous for the five steps after it — deferral register row 8
recorded that vacuity for steps 2–6 and asked for this artifact because of it. A
discipline whose exit step cannot move needs a substitute that can, and this record is it.
It cannot live in `docs/concept/` — that set is sealed, and it is deliberately about the
spec rather than about any one implementation of it.

**What this document does not do.** It does not move a maturity marker, and nothing in it
should be read as moving one. `[PROVEN]` / `[DESIGNED]` / `[SKETCHED]` live in the sealed
concept set, and `[PROVEN]` says what its legend says it says: "implemented and
test-proven in a reference implementation of the spec"
(`docs/concept/README.md`). That is a claim about a reference implementation, stated as
such in both front doors; it was never a claim about this repository, so nothing landing
here makes it truer and nothing outstanding here makes it false. The per-section table
below is what answers "what does *this* build do", which is the question the markers were
never asked.

---

## Steps at a glance

| Step | Capability | Status here |
|---|---|---|
| 1 | The kernel | **Exited** — five gates green at `74f7e7b`, with the named outstanding list below |
| 2 | The store, for real | **Exited (with a recorded deferral)** — five increments in: the first landed `appendBatch`, `listDue`, and the `meta = { nonTerminal, dueAt? }` migration on both append methods; the second added §12's C4 seal-finality bar and the operator-only `seal()` seam; the third landed `findNonTerminal`, completing the eight-method Store contract; the fourth extracted the backing-parameterized conformance suite; the fifth built the embedded-SQL adapter (`store/sqlite.ts`, on `node:sqlite`), the caller-transaction seam (`tx?`) on every write, and the cross-backing byte-identical-chains test — two of §12's three reference backings now exist and are held equivalent by the suite plus the byte-identity test; the server-SQL adapter is deferred to register row 15, which carries the exit ruling |
| 3 | Redemption (the effect seam) | **Exited** — three increments landed. The first landed §11.2's direct shape: `redeem(recordId, content, tx?)` as a verify-first gate ladder, `confirmed → redeemed { via: 'direct' }` enlisted through the `tx?` seam, `effect-mismatch` and `already-redeemed` (never-appends), the at-most-once replay refusal, and the release of the held `(profile, subject)` pair (register row 9, retired by building). The second landed §11.2's token shape: `beginRedemption`/`completeRedemption`, `confirmed → redeeming { tokenDigest }` at issuance then `redeeming → redeemed { via: 'token', tokenDigest }` on presentation, the single-use token returned exactly once and never persisted, the family-wide CAS-residual re-read (an authorized behavior change to the first increment's own seam), and the GOVERNED `redeemBound` guard at construction (`config.ts`); `appendChainCompromise`'s `redeeming` candidates landed with it too (register row 10, retired by building). **The third landed the clocks**: one generalized clock module (`kernel/expiry.ts`'s `pendingWindow`/`resolveDueClock`) resolving SPEC §4's two remaining clock-driven edges — `confirmed → expired { bound }` (the `confirmToRedeem` window) and `redeeming → redemption-failed { bound }` (the `redeemBound` window) — their `dueAt` producers at `finalize()`'s success batch and `beginRedemption`, the en-passant resolution rung shared by all three redemption seams (the resolver reports the outcome it observes; a later arrival refuses `unredeemable-state`), `finalize()`'s and `open()`'s own en-passant observations of the same clocks, the fourteenth refusal code `redemption-timeout` with its replay fold, the `redeemBound` construction guard lifted, and `operator.listDue()`, the sweep's one read surface. §11.2 is whole in this build: both shapes, both clocks, at-most-once including the elapsed-`redeeming` unknown-outcome half. **Deferred at this exit**, recorded as such: live-mode `reverify` (§9.2, `[SKETCHED]` at that exit — a later build step's own work, since landed whole at the live-capture increment; see the §9.2 row), the sweep's provisional signature (SPEC §12's own "Like every §12 surface its concrete signature is provisional pre-1.0" note), the due-`open` rough edge (no argument-free resolver exists for a due-`open` record — `redeem()` is spec-forbidden from expiring it and `finalize()` needs real arguments — so it resolves at its next genuine `finalize()` or a fresh `open()` for the pair), and register row 16 (the token-shape seams' missing `tx?`). Build-order step 4 — multi-leg separation of duties, SPEC §10.1 — is under way; see the next row |
| 4 | Multi-leg separation of duties | **Exited** — both increments landed. The first landed `open()`'s SPEC §10.1 sequencing rung (`kernel/prior-legs.ts`'s `verifyPriorLegs`), verifying every prior-leg reference by replay — the section's six conditions — before a successor record is created, and chaining the verified evidence, the recorded `priorRecordRefs` plus library-derived `priorLegActors`, into the successor's `opened` snapshot; the fifteenth refusal code, `prior-leg-unverified`, is a pre-record never-append; the `legs.length>1` construction guard lifted with the sequencing that gives it teeth (governed count 10 → 9). **The second landed the SoD gate itself**: `finalize()`'s rung 3.5 (SPEC §9's ladder) reads that chained evidence — `sod.notActorOf` keyed by the record's own recorded `priorRecordRefs`/`priorLegActors`, principal-only comparison, and `proposer` as the may-not-decide-own-leg pin — both raising the sixteenth refusal code, `sod-violation` (default-open, `terminalRefusals`-able); the per-leg `sod`/`proposer` GOVERNED throws lifted with the gate in the same commit (governed count 9 → 7). §10.1 is whole in this build. Build-order step 5 — required-consultation gating, SPEC §11.1 — is next; see the next row |
| 5 | Required-consultation gating | **Exited** — both increments landed. The first landed the attach form (SPEC §11.1's unconditional half, "the attach form is always available"): no bound is placed on the supplied-consultations count, the seam being operator-only, so a self-imposed large batch sits outside this build's threat model. The second landed the gate and the `availability` outcome class: `finalize()`'s rung 5.5 reads a leg's declared `requiredConsultations` in order — an obtained `fail` verdict refuses `consultation-failed` (the seventeenth code), a missing required kind refuses `consultation-missing` (that code's second producer, after the facts rung), and a required kind the host reports unreachable produces the `availability` outcome (the eighteenth code, the union's first third-class member) rather than a fabricated pass — never appending, the record staying open so the seam re-arms for bounded host retry; the `requiredConsultations` GOVERNED throw lifted with the gate in the same commit (governed count 7 → 6). §11.1 was whole in this build except its freshness tail at this exit. **Deferred at this exit**, recorded as such: `freshness`/`consultation-stale` stayed `[SKETCHED]` and AL2-dependent at this point — the spec's own vacuity argument, that at AL1 the library stamps every consultation's own recording time so the bound could never fire, a dead gate wearing an assurance label — and §10.4's implicit-first `eligibility` prepend, step 6's own ground. Both deferrals have since closed: `eligibility` at step 6's first increment (see that row), and `freshness`/`consultation-stale` whole at the AL2 freshness increment, step 8's own third AL2 increment (see the §11.1, §14, and step-8 rows). Build-order step 6 — authority checks: eligibility + policy drift, SPEC §10.4 + §10.3 — is next; see the next row |
| 6 | Authority checks (eligibility + policy drift) | **Exited** — both increments landed. The first landed eligibility gating, SPEC §10.4 whole (see the §10.4 row). The second landed policy-drift notarization, SPEC §10.3 whole (see the §10.3 row): `open()` binds an operator-attested `policyDigest` into the genesis, present-iff-declared and fail-closed loud both directions; `finalize()` gains the matching presence contract for `opts.policy` at profile-resolution depth; and rung (4.5) compares the live digest against the record's bound one — `policy-drift` (the twentieth code) on mismatch, including both cross-instance corners, and the `availability` outcome (its second producer) on a reported-unreachable source. The cross-drift open decision named at the step-6 brainstorm is now DECIDED in code: FAIL-CLOSE, so a bound record finalized under a same-id non-declaring instance still refuses `policy-drift` rather than skipping the gate. Build-order step 7 — findings & acknowledgments, SPEC §10.2, where the FIRST draft-ahead maturity marker — §10.2's `[DESIGNED]` — could finally move — is next; see the next row |
| 7 | Findings & acknowledgments | **Exited** — both increments landed. The first landed SPEC §10.2's read half: the fold (`chain/replay.ts`), the counting predicate and per-finding coverage derivation (`kernel/findings.ts`), and the digest-only findings projection on `DecisionRecord`/`ReviewView`. **The second landed the seams, the gate, and the construction lift — all three in ONE atomic commit**: the two operator-only seams (`kernel/findings-seams.ts`'s `raiseFinding`/`acknowledge`), `finalize()`'s rung (5.7) ack-coverage gate (reading the read side's own `findingCoverage` derivation, no new finalize inputs), and the `ackMode`/`requiredAcks` construction-guard lift (`validateFindingsFlow`, `config.ts`; governed count 4 → 2). §10.2 is whole in this build. **The second increment then executed the marker move**: the nine `[DESIGNED]` tokens SPEC §10.2 carried — eight in SPEC.md (lines 127, 324, 522, 550, 573, 591, 638, 745) plus CONTROLS.md:44's bare-word cell — moved to `[PROVEN]`/`PROVEN`, in a separate commit after the atomic commit's gates were green, nothing else on any line; this is the first draft-ahead marker to move in this repository. Build-order step 8 — recovery, live capture, AL2 signing, the self-test tier, the last of the eight — has since started, its first item landed; see the next row |
| 8 | Recovery, live capture, AL2 signing, the self-test tier | **Exited** — all four tail items landed whole, and the third of those four — AL2 detached signing — landed all THREE of its own increments (the mint, the enforcement, then freshness): AL2 is whole. The first: SPEC §2's recovery linkage. `open()`'s new recovery rung (`kernel/supersedes.ts`'s `verifySupersedes`, consumed after the prior-legs sequencing rung and before the genesis mint) verifies a host-claimed terminal predecessor (`{ recordId, chainHead }`) by replay — intact chain, matching head, TERMINAL by the derived formula (the `confirmed`-state profile-resolution nuance failing closed; **widened at the supersedes-binding increment, 2026-11-17 — the FIFTEENTH self-authored inversion**: the predecessor's profile must now be HELD — id registered and its projection digesting to the genesis `profileDigest` — for every terminal state, not only `confirmed`, and an unheld profile refuses `supersedes-unverified`; the signature layer is consulted as well, where it applies), same `subjectRef` — and binds the verified reference into the recovering record's genesis, folded by replay; any failure refuses the twenty-third code, `supersedes-unverified`, pre-record and never-appended. The LAST call-seam GOVERNED guard in this build lifted with it (`open()`'s options bag now carries all three of its documented keys for real — see the §9 row). **The second: live-mode capture and `reverify` (SPEC §9.2), the live-capture increment.** `validateLiveCapture` (`config.ts`) replaces the `captureMode:'live'` GOVERNED throw: every leg of a live profile must declare `requiredConsultations` (the decide-time independent re-derivation, gated as an ordinary required consultation at finalize's already-built rung 5.5, no new gate needed for it) and the profile's `redeem` block must declare `confirmToRedeem`, `reverify`, or both. Landing in the SAME commit, `kernel/redeem.ts`'s `refuseCorrespondenceMismatch` gives `reverify` its own redemption-seam semantics: on a reverify-declaring profile, a CONTENT-digest mismatch at any of the redemption family's three seams (the direct shape's rung (5), the token shape's begin-time correspondence, and complete's content half — never its token half, which keeps `effect-mismatch` unconditionally, a wrong token not being state drift) maps to `content-drift`, appended terminal from the seam's current state (CAS from `confirmed` at the direct and begin arms, `redeeming` at complete's content arm), releasing the `(profile, subject)` exclusivity hold — the ordinary non-terminal path, no C3 carve-out involved; an enlisted (`tx`-carrying) call meeting drift refuses result-first WITHOUT appending — an appended edge inside the host's transaction would roll back with the aborted effect — the family's settled enlisted discipline, pinned RED-first on the SQLite backing. Drifted state cannot un-drift: the decision dies terminally, and the recovery flow (`supersedes`) re-opens it under a fresh read, pinned by a composition test. `content-drift` gains this as its SECOND producer (see the §8 row), appending UNCONDITIONALLY there — `terminalRefusals` is finalize's own per-leg machinery and is not consulted at the redemption seam. The `captureMode:'live'` GOVERNED throw lifted with the mapping in the same commit (governed count 2 → 1; `freshness` alone remained, AL2-dependent by the spec's own vacuity argument at that point — since lifted whole at the AL2 freshness increment, below). OPEN-QUESTIONS.md §7's two residuals are now **Decided (this build)**: the `reverify` surface takes no new argument — the redemption seams' existing `content` argument IS the fresh read; and the staged-reference contract is UNCHANGED — `stage()`/`open()`/`finalize()` untouched, decide-time binding enforced by finalize's own rung (4) recompute plus the gated re-derivation consultation. The four live-mode `[SKETCHED]` tokens (SPEC:488's inline bracket, SPEC:667's bold heading, CONTROLS:40's prose, CONTROLS:45's cell) moved to `[PROVEN]`, and SPEC:488's now-false trailing clause was rewritten to point at OQ §7's recorded decisions instead of naming the seam semantics as still open. The library never verifies the re-derivation's path-independence — the consultation gates its presence and verdict; that proof is the operator-assurance tier's live-path-distinctness probe (CONTROLS §4). SPEC §9.2 is whole in this build; see the §9.2 row. AL2 detached signing (SPEC §14) splits into three increments at its own brainstorm — mint, enforce, freshness — and this step has now landed all three; AL2 is whole. **The mint**: the per-profile `signing` declaration, the host-injected signer/verifier hooks, the detached-signature sidecar, and a `create()`-level Store decorator that mints a signature on every append of a signing record, plus one audit-time read, `operator.verifySignatures()`. **The enforcement, landed at this step's own second AL2 increment, makes the layer load-bearing**: `kernel/verify-signatures.ts`'s `signatureLayerHolds`, one shared async correlation core factored onto `verifySignatures`'s own chain-driven walk rather than duplicating it, was consulted, at that increment, at all six verification sites then existing — `finalize()`, `seal()`, the redemption family's shared prologue (`redeem`/`beginRedemption`/`completeRedemption`, the enlisted direct shape's result-first no-append refusal INHERITED from the existing hash-break branch, not re-decided), the findings family's shared prologue (`raiseFinding`/`acknowledge`), `verifyPriorLegs`, and `verifySupersedes` — folding a `false` verdict into each site's OWN existing failure arm: `chain-compromise` at the four seams (the appended compromise edge on a signing record is itself signed, by construction, through the decorator), `prior-leg-unverified`/`supersedes-unverified` at the two cross-record claims. AL1 intactness (`verifyChain(chain).intact`) stays every call site's FIRST, cheap, synchronous check; the layer runs only on an intact chain. No new refusal code, no new outcome class. **The two audit reads stay separate and neither ever gates**: `operator.verifyChain` remains the AL1 report, `operator.verifySignatures` the AL2 report — graduated honesty; the seams enforce. **The sanctioned sealed bundle executed at the enforcement increment's own exit**, a separate commit after the enforcement commit's own gates were green, byte-verified before/after: SPEC §14's AL2 bullet and CONTROLS.md:48's bare cell moved `[SKETCHED]`/`SKETCHED` → `[PROVEN]`/`PROVEN`; `OPEN-QUESTIONS.md` §1's granularity, missing-signature-posture and key-custody tails are now **Decided (this build)**, its authority-timestamps tail **explicitly still open** — this step's own third AL2 increment's ground; SPEC:1233's and CONTROLS.md:48's own "named open decisions"/"granularity open" phrasings were rewritten decided-on-record; OPEN-QUESTIONS.md §7's opener tense-fixed. See the §14 row for the full account. **The rehoming residual is named, not closed**: a whole-chain recompute rehoming the genesis onto a REGISTERED non-signing profile produces a hash-intact chain the layer does not apply to, since the obligation keys on the genesis's own `profileId` claim — `verifySignatures` reports the truth either way (`signingDeclared: false` on the rehomed claim); see the §14 row's own limit column. **The third: consultation freshness (SPEC §11.1/§14), the AL2 freshness increment — AL2's own last of three, and the LAST governed field in this whole build.** `Consultation` (`types.ts`) gains `observedAt?: string`, present-iff-supplied — §2's own table lists the AL1 shape; the field lands under §14's own admission sentence ("AL2 admits authority timestamps inside digested payloads for required consultations"), an anticipated AL2 extension rather than a recorded divergence (see the §11.1 row and the boundary below). `kernel/consultations.ts`'s intake validator accepts it structurally (RFC 3339 with an explicit offset, enforced at intake) on the OBTAINED shape alone — never on the unreachable marker, an unknown-key throw there, no observation having happened. `finalize()` gains a presence contract at profile-resolution depth, the `opts.policy` precedent exactly: a non-signing profile's obtained `observedAt` throws, preserving AL1's clock-trust posture verbatim; a signing profile's is admitted, digest- and signature-covered once recorded. Rung 5.5 gains a freshness arm, run after a required kind's `pass` verdict: a kind the leg's `freshness` record bounds then demands an evaluable, sane, in-bound claim — missing, future, or older than the bound seconds refuses the twenty-fourth and LAST code, `consultation-stale` (`refusal`-class, `terminalRefusals`-able, open-by-default for re-run — the `consultation-failed` family's own register; see the §8 row). `validateFreshness` (`config.ts`) replaces the GOVERNED throw: a declaring leg's profile must set `signing: true` (the AL2 dependency made structural), every bounded key must be in the leg's own required set (`requiredConsultations`, plus `'eligibility'` iff the leg declares it — the ⊆ rule, no separate reserved-kind arm needed since a reserved kind can never be required), and every bound a positive finite integer of seconds (the ttl convention). The governed count moves 1 → 0 with this lift — the TENTH self-authored inversion in this document's own numbered sequence, the guard-lifting era's own exit (see the boundary below): the feature-guards-from-day-one era the kernel increment opened closes here, every guard it installed now lifted behind its own behavior, each in the same commit as that behavior; `governedUnavailable` (`config.ts`) SURVIVES this lift — it still serves the two generic unknown-option-key throws (`kernel/finalize.ts`'s `finalizeOptionMessage`, `kernel/open.ts`'s own), neither of which names a not-yet-enforceable field. Three `OPEN-QUESTIONS.md` §4 questions are answered and recorded as Decided: freshness-eligible kinds are a subset of the leg's own required kinds, including the implicit `eligibility` where declared; a finalize call's inputs are fixed per invocation, so a refusal leaves the record open and the seam re-arms on the NEXT call, never an in-attempt retry; and `facts` gets no freshness bound of its own — the library stamps it at the finalize instant, so recording IS observation at that seam, a host wanting surface-age gating modelling its renderer as an ordinary timestamped kind instead. **What this does not claim**: the library never verifies the observation happened AT `observedAt` — it gates on the recorded, signature-covered CLAIM; genuineness stays `proofRef` and the operator-assurance probes, the same limit §11.1's gate already carried before this increment. The sanctioned sealed bundle executed at this increment's own exit: SPEC:527's and SPEC:634's `[SKETCHED — AL2-dependent]`/bold-`[SKETCHED]` row markers and SPEC:951's inline `[SKETCHED]` moved to `[PROVEN]`/`[PROVEN]`/`[PROVEN]` (each row's own dependency clause, still true, is kept in prose), and CONTROLS.md:47's cell moved `SKETCHED (AL2-dependent)` → `PROVEN (AL2-dependent)` (the parenthetical stays true — construction now requires signing); `OPEN-QUESTIONS.md` §1's own fourth (authority-timestamps) tail completed, "Still open" → "Decided (this build): the recorded-claim, signing-gated design"; and `OPEN-QUESTIONS.md` §4's own three answers, above, recorded as its own Decided tails. **Step 8's fourth and last tail item, the self-test tier (`OPEN-QUESTIONS.md` §5), has since landed too, at the self-test-tier increment**: `src/probes/` — a runner (`runProbes`/`assertSatisfied`), the `ProbeDriver` interface, and seventeen probes authored against CONTROLS §4's own target list, quoted verbatim — plus deferral register row 18's own bounds-validation task, taken deliberately inside the same increment (`validateBounds`, `config.ts`; the ELEVENTH self-authored inversion — see the CONTROLS §4 row and the boundary below for both). Deferral register rows 17 AND 18 both retire with it, triggers fired (see the boundary below). **Step 8 EXITS here: eight of eight build-order steps are now exited, the build order complete at the concept's declared embedded, operator-only scope** — see the closing narrative below the steps table |

Exiting step 1 is exiting **one of eight**. A host adopting this repository today gets a
store adapter (all three of §12's reference backings) and redemption whole (both shapes and
both clocks — a lost redemption token now resolves on its declared bound rather than
stranding the record), and multi-leg records now conclude in a verified, chained order with
a separation-of-duties gate enforced over that order (step 4, exited whole — see the §10.1
row below); a host can now attach its own consultations to a decision as recorded evidence
AND require them — a required kind's obtained failure or reported absence refuses, and a
required kind's reported unreachability never fabricates a pass (step 5, exited whole —
see the §11.1 row below); a declaring leg's authority-to-decide check now runs FIRST, ahead
of every other required kind, refusing `ineligible` on a `fail` verdict so a different
eligible actor may decide the same open record (step 6's first increment, eligibility
whole — see the §10.4 row below), and a policy-declaring leg's live policy version is now
notarized and gated at finalize — a mismatch against the record's operator-bound
`policyDigest` refuses `policy-drift` rather than confirming under drift (step 6's second
increment, policy drift whole — see the §10.3 row below); step 6 is fully **Exited** —
and step 7 is now fully **Exited** too: a host can raise a finding and acknowledge it
through the two operator-only seams (`raiseFinding`/`acknowledge`), and finalize gates on
ack coverage — an uncovered required-kind finding refuses `ack-missing` or `ack-stale`
rather than confirming past it (step 7, exited whole — see the §10.2 row below); the
first draft-ahead maturity marker in this repository has now moved — SPEC §10.2's nine
`[DESIGNED]` tokens are `[PROVEN]` as of the second step-7 increment's own marker-move
commit (see the §10.2 row and the boundary below) — **and step 8 is now fully Exited too,
the eighth and last**: a host can recover a superseded record by a verified predecessor
reference (step 8's recovery increment, SPEC §2 whole), declare a live-capture profile
whose redemption-time content mismatch drifts terminally rather than stranding the record
(the live-capture increment, SPEC §9.2 whole), construct a signing profile whose whole
chain is detached-signed and was enforced, at the AL2 enforcement increment, at all six verification sites then existing, with a per-leg
freshness bound gated on that same signing profile's own consultations (AL2's three
increments, SPEC §14 and §11.1's freshness tail whole), and — new at this step's own last
increment — run its own re-attack suite over its own configuration: seventeen probes,
authored against `docs/concept/CONTROLS.md` §4's own target list and quoted from it
verbatim, each demonstrated able to FAIL against a deliberately-broken driver, each
waivable only by a dated, unexpired waiver, and `not-driven` honestly reported wherever
the host's driver lacks an exercise hook or the probed configuration declares no profile
for the control being re-attacked (the self-test-tier increment; see the CONTROLS §4 row
below). Zero governed profile fields throw at construction as of the AL2 freshness
increment — the TENTH self-authored inversion in this document's own numbered sequence,
the guard-lifting era's own exit — and an ELEVENTH, a different mechanic (not a guard
lift; a previously-deliberate no-validation stance inverted instead), follows at the
self-test-tier increment: register row 18's own bounds-validation task (see the boundary
below for both). Deferral register rows 17 AND 18 both retire with that same increment,
triggers fired (see the boundary below).

**Eight of eight build-order steps are EXITED. The build is complete at the concept's own
declared scope** — embedded, operator-only — and the sections below say so in the same
breath as the green gates, stated with the same honesty register this record has carried
throughout: AL3 anchoring stays documented-only, `[SKETCHED]` (`docs/concept/SPEC.md`
§14's own AL3 bullet: "External anchoring of chain heads… documented upgrade only"),
untouched by anything this build order has landed; concurrent legs stay out of scope
pre-1.0 (`docs/concept/SPEC.md` §1: "Legs conclude in configured order; concurrent legs
are out of scope pre-1.0"); and the deferral register's own surviving residue — **row 5**
(the Biome `linter.rules.recommended` migration), **row 6** (the pre-0.1 API-naming review
over the whole public surface), and **row 15** (SPEC §12's third reference backing,
server-SQL) — are pre-0.1/1.0 hygiene and proof-structure gates that OUTLIVE the build
order BY DESIGN, never unfinished build-order work: row 15 carries step 2's own exit
ruling (a backing deliberately deferred there), but its own trigger — the first
multi-operator consumer, or the 0.1 cut — lands after the build order regardless of when
step 2 itself exited; rows 5 and 6 were never tied to any build-order step's own exit at
all. (Three further rows survive, carried in the "Still outstanding" list below rather
than restated here: row 1, publish tooling; row 4, generalizing the root `typecheck`
beyond `packages/record` and declaring per-package test-runner devDependencies — this one
a workspace-SHAPE gate rather than a pre-0.1/1.0 one, its own trigger being the second
workspace package landing, not any 0.1/1.0 cut; and row 16, the token-shape seams' missing
`tx?`.) (**Updated 2026-08-19:** every row this paragraph names as surviving has since
retired except row 1 — the "Current state" block above and the "Still outstanding"
accounts below carry the retirements; the paragraph stays as the step-8 exit narrative it
was, its present tense true at its own writing.) (This sentence's earlier "no store adapter" and "no redemption"
were pre-existing drift — the former stale since step 2's own exit, the latter since the
first step-3 increment — missed by their own increments' sweeps; fixed here. This
paragraph's own earlier "two governed profile fields throw at construction" was a second
instance of the identical defect — stale since the AL2 freshness increment's own exit took
the guard era to zero, missed by that increment's own sweep and the two increments after
it; fixed here too, rather than restated wrong a third time.)

---

## Build-order step 1 — the kernel

### What landed here

The capability split, canonicalization and digests, hash-chained transitions, the
pre-seam chain-verify, and an in-memory store carrying the exclusivity, sequencing and
monotonicity constraints — `docs/concept/SCOPING-GUIDE.md` §7's step 1, less the parts
named under "still outstanding" below.

Concretely, and only what is true of the code: a host can construct a single-leg,
pure-capture or `redeem`-declaring profile; stage a draft from the agent handle; open,
review and finalize it from the operator handle; and replay or verify the resulting chain.
Content never crosses into the store — only digests do. Every decision-bearing state
change is a hash-linked transition, and `replay()` over the chain is the sole
authoritative derivation of a record's state; the store's own `state` column exists to back
its compare-and-swap, never to answer what a record is.

The kernel was **adopted** from a reference implementation of the same spec rather than
written from scratch, and the differences between the two are recorded file by file in
`docs/process/adopted-source-provenance.md`. The whole-branch review that motivated this
step's remediation pass is `docs/analysis/2026-08-03-step-1-review.md`.

### Commit range

`e97ce96..74f7e7b` — 60 commits, of which **42 touch `packages/record`**, from `6d3045d`
(the library-owned RFC 8785 serializer) through `74f7e7b`. The remaining eighteen touch
the concept set, CI, repository tooling, and this repository's own process, analysis and
plan documents. Before this branch, `packages/record` was a walking skeleton: a `create()`
that threw a not-implemented error, and two tests asserting that it did.

### Gate outputs at exit (measured at `74f7e7b`)

Commands and their summary lines. The thirteen Biome diagnostic bodies are elided (read
below for what they are), as are run durations. `74f7e7b` is the last **build-step-1**
commit that touched code — this record itself lands after it and changes no TypeScript, so
the four code-facing gates measure the same tree either way at step 1's own exit; only
`contract-scan`, which reads tracked markdown too, re-runs against this file. Later build
steps have touched `packages/record/src` since — see the per-section table below, which
tracks the current tree rather than this frozen exit snapshot.

```text
$ pnpm typecheck
$ tsc -p packages/record --noEmit
EXIT=0

$ pnpm lint
$ biome check .
Checked 57 files. No fixes applied.
Found 13 infos.
EXIT=0

$ npx biome check --error-on-warnings .
Checked 57 files. No fixes applied.
Found 13 infos.
EXIT=0

$ pnpm test
$ vitest run
 Test Files  23 passed (23)
      Tests  257 passed (257)
EXIT=0

$ node scripts/contract-scan.mjs
(no output)
EXIT=0
```

Read with their bounds, in the same breath:

- The **13 infos** are not one thing. Twelve are `lint/style/useTemplate` in three test
  files (`outcome-model.test.ts`, `store-constraints.test.ts`,
  `transition-encoding.test.ts`) — string concatenation where a template literal would do,
  each carrying an *unsafe* fix that this repository does not apply automatically. The
  thirteenth is a Biome configuration deprecation on `biome.json`'s
  `linter.rules.recommended`, carried in the deferral register. None is a warning or an
  error, which is why `--error-on-warnings` is also green.
- **23 test files / 257 tests, zero skips.** Twenty-two of those files and 228 of those
  tests are the record package's own suite; the twenty-third file is
  `scripts/test/contract-scan.test.mjs`, which tests the contract scan's citation
  resolver, not the library.
- **`contract-scan` exit 0, no output** means no finding under the checks that scan
  actually runs. Its citation resolver reads tracked **TypeScript** only, and its own
  header enumerates eight things it deliberately does not check. Markdown — including this
  document — is scanned for external links and ADR-style references, never for whether a
  citation resolves. A reader comparing a later run against this one should **diff the
  output, not the totals**: a total moving has hidden an equal-sized regression in the
  opposite direction on this branch before.
- The four byte-compatibility digest literals in
  `packages/record/test/byte-stability.test.ts` are byte-for-byte what they were when they
  were pinned at `4e3405f`; no later commit on this branch changed one. They are an
  oracle, not an assertion to be updated — a mismatch means the minimal chain moved.

### Per-SPEC-section status

This table tracks the **current tree**, not a snapshot frozen at step 1's exit two sections
above: its §12 and §2.1 rows already describe `appendBatch`, `listDue`, and the `meta`
migration, all landed by a later increment inside build-order step 2, not by step 1. Twenty-
five sections, settled against the code. "Not built here" means exactly that — not
that the behavior is wrong, and not that a marker should move.

| § | Section | Built here | Not built here |
|---|---|---|---|
| 0 | Abstract & honest scope | No behavior of its own. The AL1 bound it states — "tamper-*evident* against non-recomputing tampering", and only for a transition that is not the current head — is what `chain/replay.ts`'s `verifyChain` actually delivers, and that function's own doc comment states the same limit | The signing upgrade §0 names as the closure for the recompute residual (§14) |
| 1 | Terminology & conventions | Definitional. Its BCP-14 obligations fall on parties other than the library; the adopter-canonicalizer one is honored as a hook (`Config.canonicalizers`, resolved fail-closed) | — |
| 2 | The record model | `types.ts`'s `DecisionRecord` carries every unconditional field of §2's table; `IdentityAssertion` and `Consultation` match their auxiliary shapes; `nonterminal.ts` writes §2's terminality derivation whole — all three disjuncts, not the reachable subset — and every `appendTransition` call the kernel makes takes its persisted non-terminal flag from it, none hardcoding one; the human-leg requirement holds structurally, the frozen agent handle carrying `{stage, getRecord, readChain, chainHead}` and nothing that transitions a record. `DecisionRecord` also carries `status: 'active' \| 'retired'`, new at the second step-2 increment: derived by `chain/replay.ts` from the chain — `retired` once a `sealed` transition caps it, `active` before that — never stored, never a caller input, the same discipline `state` follows. This is not a gap against §5 or §12, both of which require a sealed record to report `retired`; it IS a divergence from §2's own table above, which lists `state` and no `status` row — the field exists to satisfy a requirement §2's own table does not carry a line for. All three effect-seam states are now reachable: `redeemed` as of the first step-3 increment (the direct-shape ladder's `confirmed → redeemed`), `redeeming` as of the second (`beginRedemption`'s `confirmed → redeeming`), and `redemption-failed` as of the third (`kernel/expiry.ts`'s `resolveDueClock` appending `redeeming → redemption-failed`) — `replay` folds all three into the record's derived state rather than throwing on any of them (see the §4 row). `DecisionRecord.supersedes?: SupersedesRef` is real too, as of the step-8 recovery increment: `open()`'s recovery rung (`kernel/supersedes.ts`'s `verifySupersedes`) verifies a host-claimed terminal predecessor by replay before the record exists, and `replay` folds the verified reference verbatim from the genesis snapshot (see the §4 and §9 rows). Verification settles the three questions `OPEN-QUESTIONS.md` §3 records as now **Decided (this build)**: the refusal shape is the dedicated never-append code `supersedes-unverified` alone, covering every verification failure — the `prior-leg-unverified` pattern at its own name; the exclusivity interaction is SEQUENTIAL — verify-then-open under the ordinary exclusivity constraint alone, because terminality is one-way in this model (no edge leaves a terminal state; `seal()` only caps status, never state), so the verified predecessor cannot be raced back to non-terminal, and no new store constraint was needed — `src/store/` stays frozen; and no superseded-by back-reference is recorded on the predecessor — the forward link in the recovering genesis is the evidence, and the predecessor's chain (sealed-or-terminal, admitting no append either way) stays untouched. Verification is also a PURE READ, deliberately: no en-passant resolution of the predecessor's own clock runs inside it, so a LAPSED-but-unswept `open` predecessor replays as `open`, non-terminal, and refuses — the operator sweeps first, then recovers, the same posture SPEC §4 states for `seal()` ("the operator sweeps first, then seals"); this is NOT a counter-precedent to the exclusivity retry's own lapsed-blocker resolution, since that resolves a blocker of the SAME `(profile, subject)` genesis being opened, while here the mutation would belong to a DIFFERENT record's chain, inside what §2 defines as verification. The tightening is same-subject, any-profile: the replayed predecessor's `subjectRef` must equal the recovering record's (a mismatch refuses `supersedes-unverified`), while `profileId` may differ, keeping §10.3's own "disposal-and-re-open recovery" under a revised profile possible | Every one of §2's profile-conditional fields is now represented at the RECORD level: `priorRecordRefs`/`priorLegActors` landed at the first
step-4 increment, `findings` (with its own auxiliary structures, `RecordedFinding`/
`RecordedAck`/`FindingRaisedPayload`/`AcknowledgedPayload`) landed at the first step-7
increment's read half (see the §10.2 row), and `supersedes` landed at the step-8 recovery
increment (see this row's Built-here column above). SPEC §2's own profile-conditional listing
(`docs/concept/SPEC.md:128-130`) names "`findings` and `acks` (a findings flow, §10.2)" as
its own two fields; this build carries the latter NESTED per-finding (`RecordedFinding.acks`)
rather than as a `DecisionRecord.acks` field of its own — a representation reading, recorded
rather than silently reconciled, the same posture this row's own `status`-field divergence
sentence above takes. This row's own former claim — that no profile-conditional field was
represented at all — was pre-existing drift dating to step 4, caught and corrected at the
step-7 record task's own sweep; the further former claim that `supersedes` alone remained
absent was true through the second step-7 increment and stale as of the step-8 recovery
increment, corrected here |
| 2.1 | Worked example | This build produces the example's shape. A pure-capture single-leg profile is the only kind it can construct; `finalize()`'s rung (6) appends `chain-verify`, then `facts`, then `confirmed` as one atomic `appendBatch` call — matching the example's own "one atomic batch (§12)" shape now, not only its transition sequence — all stamped from one clock read (`kernel/finalize.ts`'s `nowIso`), and each payload matches §4's table | The worked example itself never continues past its own pure-capture chain — a pure-capture profile still cannot construct any of the three continuations §2.1's own closing paragraph names, and the example's own JSON stays exactly as printed above. Each of those three now has a real producer elsewhere in the build, though: the effect-seam continuation (`redeeming`/`redeemed` after `confirmed`, §11.2) by the redemption ladders and clock resolutions the §4 and §11.2 rows describe; the multi-leg continuation (`priorRecordRefs`/`priorLegActors` and a prior leg's chain, §10.1) by `open()`'s sequencing rung, `kernel/prior-legs.ts`'s `verifyPriorLegs`, since the first step-4 increment (see the §4 and §10.1 rows); and the findings-flow continuation (`finding-raised`/`acknowledged` between `opened` and the decision, §10.2) by `kernel/findings-seams.ts`'s `raiseFinding`/`acknowledge`, since the second step-7 increment (see the §4, §9, and §10.2 rows). This row's own former claim that multi-leg and findings-flow transitions "still have none anywhere in the build" was pre-existing drift — true when first written, stale since the first step-4 increment (multi-leg) and the second step-7 increment (findings-flow); caught and corrected here |
| 3 | Content binding | `contentDigest = digest(canonicalize(adopterCanonicalizer(content)))` at `stage()`, recomputed and compared at finalize's rung (4); the adopter canonicalizer is a hook, never a domain canonicalizer; RFC 8785 serialization is library-owned and zero-dependency (`jcs.ts`); content is digested and never persisted; `canonicalize`/`digest` are exported so a host can recompute; the reviewed-surface (`facts`) binding is enforced by default at rung (5), refusing `consultation-missing` | One narrowing, stated at its site: `facts.figures` goes through library JCS only, never the adopter canonicalizer — §3's ownership split scopes that canonicalizer to domain content and does not name the figures path, so this is a reading rather than a transcription. Host content retention is a host duty either way |
| 4 | Transitions & the encoding | The `Transition` shape; `transitionDigest` over JCS of `{recordId, seq, at, kind, payload, prevHash}` with `seq` stringified; the genesis rule over the UTF-8 bytes of `vidimera:genesis:<recordId>`; millisecond-precision UTC stamps; `profileDigest` over "a data-only projection of the profile". §4's byte-stability invariant is exercised in the only direction this build can exercise it: `test/byte-stability.test.ts` pins the four transition digests of a feature-free finalize, so drift in the minimal chain surfaces as a digest change — with no declarable feature there is no second profile shape to compare it against. Emitted kinds: `opened`, `consultation-recorded`, `confirmed`, `refused`, `expired`, `sealed` (the second step-2 increment; this row's own list previously omitted it — pre-existing drift, fixed here), `redeemed` since the first step-3 increment, `redeeming` since the second, and `redemption-failed` since the third — appended by the redemption ladders' `confirmed → redeemed { via: 'direct' }`, `confirmed → redeeming { tokenDigest, bound? }` and `redeeming → redeemed { via: 'token', tokenDigest }` edges, and by `kernel/expiry.ts`'s `resolveDueClock`'s two resolution edges — plus `finding-raised` and `acknowledged`, since the second step-7 increment, and `declined`, since the recorded-human-decline increment (`kernel/decline.ts`'s `{ actor }` payload, terminal always): `kernel/findings-seams.ts`'s `raiseFinding`/`acknowledge` are their producers (see the §9 and §10.2 rows). The `redeeming` payload's `bound` key (§4: present **iff** declared) is MINTABLE as of the third step-3 increment — the GOVERNED `redeemBound` guard (`config.ts`) lifted with the clock that resolves it, so a declaring profile's chain now carries `{tokenDigest, bound}` and an undeclaring one still carries `{tokenDigest}` exactly, both key-set shapes pinned by test. **All three of §4's clock-driven edges are built and appended en passant**, one generalized module (`kernel/expiry.ts`'s `pendingWindow`/`resolveDueClock`) deriving "whichever pending window the record is in" and performing the one shared compare-and-swap append: `open → expired` (the open-window ttl, built from the kernel increment on), `confirmed → expired { bound }` (the `confirmToRedeem` window, the SAME kind and payload shape as the open window's edge — SPEC §4's own words, "the transitioned-from state, not the payload, distinguishes the `expiry` clause from `confirmToRedeem`"), and `redeeming → redemption-failed { bound }` (the `redeemBound` window) — "no scheduler and no public `expire()`" holds here literally for all three, and the resolving seam reports the outcome it observed (§11.2's preamble / `redemption-timeout`), never a scheduled background process. **The `opened` payload's multi-leg evidence keys are also written now, as of the first step-4 increment**: `priorRecordRefs` (the recorded three-field `{ recordId, chainHead, legId }` form) and `priorLegActors` (library-derived from the replayed prior legs), present together on a successor leg's genesis and absent together on a first leg or any single-leg record. Their producer is `kernel/prior-legs.ts`'s `verifyPriorLegs`, consumed by `open()`'s sequencing rung ahead of the genesis append; `multi-leg.test.ts`'s own "single-leg chains stay byte-shaped: the opened payload key set gains nothing" test pins that a single-leg chain's bytes are unchanged by the lift | `replay` FOLDS both `finding-raised` and `acknowledged` (real since the first step-7
increment, see the §10.2 row), throwing only on the two chain shapes an honest seam could
never produce (a re-raise changing `kind`; an ack naming an absent `findingId`). The `opened`
payload's `supersedes` key IS written too, since the step-8 recovery increment (`kernel/open.ts`'s
recovery rung, see the §2 and §9 rows) — this cell's own former claim that the key was never
written was true through the second step-7 increment and stale as of the step-8 recovery
increment, corrected here; `policyDigest` IS written, since the second
step-6 increment (see this row's Built-here column above) — this cell's own former claim
that `policyDigest` was never written was pre-existing drift dating to step 6, caught and
corrected here by this task's own sweep |
| 5 | Chaining & replay/verify | `replay(chain)` and `verifyChain(chain)` as pure functions over a chain; `verifyChain` recomputes every link and seq and reports the first break; `finalize()` runs the pre-seam verify as rung (1) and records it as a `chain-verify` consultation on a clean replay; on a detected break it refuses `chain-compromise` and appends one `refused` edge where the store's C3 admits one, falling back to a result-first refusal with no `transitionRef` where none is admitted. **Chain retirement is built, new at the second step-2 increment**: `seal(recordId)` on the operator handle verifies the chain first — SPEC §5: "Verification is first: a record whose chain fails verification refuses `chain-compromise` and can never be sealed" — then, against a derived-terminal record, appends a state-preserving `sealed` transition through C3's carve-out; the store's C4 bar then admits no further append of any kind, and `replay` folds a `sealed` transition to `status: 'retired'` without moving `state` (a sealed `confirmed` record is still `confirmed`, §2 row above). Verification's priority holds even against an already-sealed record: a broken chain over one still refuses `chain-compromise`, with no edge (C4 admits none against a sealed record either), reusing `finalize.ts`'s `appendChainCompromise` (now exported) rather than a copy — now joined by two further un-enlisted callers of the same function, `beginRedemption` and `completeRedemption` (second step-3 increment), through the redemption ladders' shared prologue. `appendChainCompromise` itself gained the `redeeming` candidate in both its dynamic and catch-branch candidate lists the same increment, closing deferral register row 10 (see the boundary below). `seal()` never calls `resolveDueClock` (`kernel/expiry.ts`), deliberately — SPEC §4 names this an exception, not an omission. **The AL2 enforcement increment widens `chain-compromise`'s own trigger at the SEAM, never inside `verifyChain` itself**: `finalize()`, `seal()`, the redemption family's shared prologue, and the findings family's shared prologue (`kernel/findings-seams.ts`'s `raiseFinding`/`acknowledge`, routing identically) now route a signature-layer failure on a signing record (`kernel/verify-signatures.ts`'s `signatureLayerHolds`) through the SAME `appendChainCompromise`/result-first arm a hash break already used — `verifyChain(chain).intact` stays the pure AL1 report it always was, checked first and unchanged, and the widening lives entirely in the caller's own `if`. The reads-stay-separate ruling holds exactly as named: `operator.verifyChain` reports AL1 only, `operator.verifySignatures` (§14) reports AL2 only, and neither read ever gates — only the seams enforce | §5 says "The library exposes two functions over a record's chain"; `index.ts` exports neither — only the operator handle's `recordId`-keyed wrappers, which can verify only a chain the live store returns. "Every operator-side mutating seam verifies the chain before acting" is not universal here: `open()`'s en-passant expire of a blocking record replays that chain without verifying it — the remaining exception, now that `redeem()` verifies first, as its own ladder's rung (1), landed at the first step-3 increment |
| 6 | Identity | `IdentityAssertion {principal, authority, proofRef?}`; identity is read only from `finalize()`'s explicit argument and never from a decision payload; both of §6's refusal branches map to `identity-authority-refused` at rung (3) — a missing or malformed identity argument, and an `authority` outside the leg's `allowedAuthorities`, including a low-trust one where the leg does not list it | `proofRef` is carried and never inspected. Pseudonymous `principal` is host guidance (§13), unenforced and unenforceable here |
| 7 | Digest identifiers & agility | `<algorithm>:<lowercase-hex>` throughout; `sha256` is the only minting algorithm and `digest()` throws on any other rather than deferring to the runtime's list; `algorithmOf()` resolves a recorded digest's own algorithm, so every `transitionDigest` after genesis is computed under the algorithm its own `prevHash` carries | The deprecation-warning surface exists (`DEPRECATED_ALGORITHMS` plus `process.emitWarning`) but the set is empty, so nothing can fire it — there is no second algorithm to migrate to or from |
| 8 | Refusal codes | **Twenty-four codes in the union, across THREE classes** — eleven core (`unsealable-state` built at the second step-2 increment, the union's eleventh core member) plus all TEN of SPEC §8's *built* profile-conditional codes (this row's own "seven" undercounted by one from the first step-6 increment's own exit onward — `ineligible` was already its eighth; caught and fixed here rather than restated wrong again): `effect-mismatch` and `already-redeemed`, landed by the first step-3 increment with producers at the redeem seam, `redemption-timeout`, landed by the third — its producer is the clock resolution at the shared redemption prologue (`kernel/expiry.ts`'s `resolveDueClock`, consumed in `kernel/redeem.ts`), and it folds again on replay via `finalize()`'s own en-passant observation of the same clock reaching a resolved `redeeming` record (the edge lands in its `record-not-open` arm too; `open()`'s blocker branch never produces this edge — SPEC §4 names a due-`redeeming` blocker as the one case its exclusivity check never auto-resolves, so `open()` is not credited here), `prior-leg-unverified`, landed by the first step-4 increment: SPEC §8's own profile-conditional table names it "a pre-record `open()`-seam sequencing refusal that never appends", and its producer is the verifier `kernel/prior-legs.ts`'s `verifyPriorLegs`, consumed by `open()`'s sequencing rung ahead of any record being minted, so no `transitionRef` is ever available to carry it — `sod-violation`, landed by the second step-4 increment: its producer is `finalize()`'s rung 3.5 (SPEC §10.1), raised on either a `sod.notActorOf` match (keyed by the record's own recorded `priorRecordRefs`/`priorLegActors`, principal-only comparison — this cell's own former claim that a lookup miss there also refuses `sod-violation`, fail-closed, was true through the second step-4 increment and stale as of the profile-drift gate (2026-09-03), corrected here: renaming a leg changes the profile's own projection, so profile resolution now refuses `unknown-profile` before this rung ever runs, and the lookup-miss arm is unreachable through that route) or a `proposer` match against the finalizing principal; unlike `prior-leg-unverified`, it takes the DEFAULT `appendsOn` path — the same path `content-drift` and `identity-authority-refused` already exercise with a `terminalRefusals`-declaring production test, so `sod-violation` is a further instance of that path, not its first: default-open (no append, the record stays `open` "so a different approver may decide it", §10.1) unless the leg's `terminalRefusals` lists it, in which case it appends `open → refused` terminal, pinned by `multi-leg.test.ts`'s own terminalRefusals test — and, landed by the second step-5 increment, `consultation-failed` and `availability`: `consultation-failed`'s producer is `finalize()`'s rung 5.5 (SPEC §11.1), raised on a required kind's obtained `fail` verdict, and it takes the SAME default `appendsOn` path `sod-violation` already exercises — default-open unless the leg's `terminalRefusals` lists it, pinned by `consultations.test.ts`'s own terminalRefusals test. `availability` is the union's first and only member of a THIRD class (`RefusalClass`'s `'availability'`, beside `'refusal'` and `'compromise'`): its producer is the same rung 5.5, raised on a required kind's reported-unreachable marker, but it is carried by the `unavailable` outcome status alone (`{ status: 'unavailable'; code: 'availability'; authority }`) and NEVER by a `refused` edge — `appendsOn` returns `false` for the whole class unconditionally, ahead of the `terminalRefusals` consult, making it the SECOND legal-but-inert `terminalRefusals` member beside `leg-expired`'s, both pinned by `refusal-matrix.test.ts`; it is also never-terminal in the ordinary sense — nothing appends, so no chain a record carries ever shows it — and, landed by the first step-6 increment, `ineligible`: SPEC §10.4's implicit-first required kind, computed at the same rung 5.5 — a leg declaring `eligibility` gets an implicit `'eligibility'` required kind prepended ahead of its declared `requiredConsultations` and checked FIRST, authority-to-decide before the evidence checks; its producer is finalize's eligibility arm of that rung, raised on the implicit kind's obtained `fail` verdict, while a NON-declaring leg that merely lists `'eligibility'` in `requiredConsultations` keeps the generic `consultation-failed` instead (§10.4's own non-declaring paragraph); `ineligible` takes the SAME default `appendsOn` path `sod-violation` and `consultation-failed` already exercise — default-open, so a different eligible actor may decide the same open record, unless the leg's `terminalRefusals` lists it — pinned by `consultations.test.ts`'s own terminalRefusals test, and, landed by the second step-6 increment, `policy-drift`: SPEC §10.3's twentieth code, its producer finalize's rung (4.5), raised on a mismatch between a policy-declaring record's operator-bound `policyDigest` and the live digest `opts.policy` attests — this cell's own former claim that `policy-drift` covers BOTH of §10.3's named cross-instance corners, including a bound digest under a same-id non-declaring instance as THE DECIDED OPEN QUESTION this build answers FAIL-CLOSE, was true through the second step-6 increment and stale as of the profile-drift gate (2026-09-03), corrected here: both corners now refuse `unknown-profile` at profile resolution before this rung ever runs (a same-id profile that adds or drops `policySource` no longer digests to the record's binding), so `policy-drift` here is purely both digests present and unequal — and it takes the SAME default `appendsOn` path `ineligible` and `sod-violation` already exercise: default-open, no in-place recovery (bound-vs-reality, like `content-drift`), so a policy-declaring leg SHOULD list it in `terminalRefusals` for the disposal-and-re-open flow — a guidance sentence the record carries, never a construction rule. Rung (4.5)'s OTHER arm, a required policy source the host reports unreachable, is `availability`'s SECOND producer (rung 5.5 was the first) — the same never-appended `unavailable` outcome shape, bounded retry on the SAME open record, never fail-open. `consultation-missing` now has TWO producers of its own: rung (5)'s facts check (built from the kernel increment on) and rung 5.5's own missing-required-kind check, both `terminalRefusals`-governed the identical way, so which one fired is unobservable from the appended edge alone. `policy-drift` is the ninth of that list, and, landed by the AL2 freshness increment, `consultation-stale` is the tenth and last: SPEC §11.1/§14's freshness gate, its producer finalize's rung 5.5 freshness arm, raised on a required kind's `pass` verdict whose bounded `observedAt` claim is missing, in the future, or older than the leg's declared bound — `refusal`-class, `terminalRefusals`-able, open-by-default for re-run, the `consultation-failed` family's own register (SPEC §8's row: "can only fire with authority timestamps"). `effect-mismatch` through `consultation-stale` above are the ten, and the count stops there. **`content-drift` gains a SECOND producer, at the live-capture increment, not a new code**: a reverify-declaring profile's redemption-time CONTENT correspondence mismatch (`kernel/redeem.ts`'s `refuseCorrespondenceMismatch`, SPEC §9.2) maps to this same code instead of `effect-mismatch`. The two producers differ structurally: rung (4)'s finalize-time producer consults the leg's `terminalRefusals` (`appendsOn`, the ordinary refusal-class rule) before appending, while the redemption-time producer does NOT — its append is UNCONDITIONAL and always terminal, `terminalRefusals` never consulted (the OPEN-QUESTIONS.md §7 decision on that seam's own append semantics); see the §9.2 row. **`supersedes-unverified` is a further, separate code — the union's twenty-third — landed by the step-8 recovery increment and counted OUTSIDE the nine, never inside it**: SPEC §8's own built profile-conditional table (SPEC.md:545-555) carries no row for it at all, and it is absent too from §8's own fixed never-appends enumeration (SPEC.md:560-563, a ten-member list ending at `prior-leg-unverified`) — it is supply-conditional (present iff a caller supplies a `supersedes` claim at `open()`) rather than profile-conditional in §8's own sense (present iff a `ConfirmProfile` field switches a feature on), so neither sealed list was ever a candidate home for it. Its mandate instead is SPEC §2's own pointer — "Remaining recovery-flow details (the non-terminal-predecessor refusal shape, the exclusivity interaction) are enumerated in `OPEN-QUESTIONS.md`" (SPEC.md:143-144) — and OPEN-QUESTIONS.md §3's own "Decided (this build)" answer to that pointer: "the dedicated code `supersedes-unverified` — never-append, pre-record; the `prior-leg-unverified` pattern at its own name" (OPEN-QUESTIONS.md:61-64). Its producer is `open()`'s recovery rung (`kernel/open.ts`), consuming `kernel/supersedes.ts`'s `verifySupersedes` — a PURE READ over the named predecessor requiring an intact chain, a matching claimed head, TERMINAL state by the derived formula (the `confirmed`-state profile-resolution nuance, unresolvable there failing closed), and the SAME `subjectRef` as the recovering record (**widened at the supersedes-binding increment, 2026-11-17 — the FIFTEENTH self-authored inversion**: it also requires the instance to HOLD the predecessor's profile — id registered, projection digesting to the genesis `profileDigest` — for every terminal state, not only `confirmed`, and it consults the signature layer where that applies; an unheld profile refuses `supersedes-unverified`, pre-record, never-append); unlike every default-`appendsOn`-path code from `sod-violation` through `ack-stale` above, `supersedes-unverified` is PRE-RECORD and NEVER-APPENDS — the `prior-leg-unverified` pattern at its own name, because no record exists yet to carry an edge. **The gap this leaves in both of §8's own sealed lists is recorded here, not reconciled**: §8's own Stability clause holds "the registry is amended only by a revision of this document" (SPEC.md:570), and this build does not revise SPEC.md, so `supersedes-unverified` stays a code this build mints under §2 and OPEN-QUESTIONS §3 while never appearing in either of §8's own enumerations — a deliberate gap, not a drift. As a union with a compiler-total code→class map; `appendsOn` implements §8's append semantics — compromise appends wherever the state admits a state-leaving append, a fixed never-appends set never does (`unsealable-state` is in it: `seal()`'s only append is the `sealed` transition itself, folded into its own success path, never a byproduct of this refusal; `effect-mismatch`, `already-redeemed` and `redemption-timeout` are in it too — redemption's refusals are all result-first, and `redemption-timeout`'s own edge is the `redemption-failed` KIND, never a `refused` transition), and every other refusal-class code appends `open → refused` iff the leg's `terminalRefusals` lists it; `leg-expired`'s inertness as a `terminalRefusals` member is real and pinned. Both `unknown-leg` producers are built. Caller errors throw rather than refuse at `open()` (unknown `stagedRef`), `finalize()` (unknown `recordId`), `seal()` (unknown `recordId`), `redeem()` (unknown `recordId`, new at the first step-3 increment) and `review`/`replay`/`verifyChain` (empty chain), and finalize throws on a persisted `legId` absent from its profile. **`ack-missing`/`ack-stale`
are now PRODUCING, as of the second step-7 increment**: the twenty-first
and twenty-second codes (SPEC §8's conditional table naming them `refusal`-class,
`terminalRefusals`-able, open-by-default under findings flow, §10.2) joined the union and
`REGISTRY` at the first step-7 increment — `ack-missing` for a required-kind finding with no ack at all, `ack-stale` for
acks present but none counting — and finalize's rung (5.7), the ack-coverage gate that
raises either, is real as of the second step-7 increment: the two-touch wording
`redemption-timeout`/`prior-leg-unverified` carried before their own producers landed is
retired for this pair too. The two count pins (`refusal-matrix.test.ts`, `outcome-model.test.ts`) moved 13→14 with the third step-3 increment, 14→15 with the first step-4 increment, 15→16 with the second, 16→18 with the second step-5 increment, 18→19 with the first step-6 increment, 19→20 with the second step-6 increment, and 20→22 in
ONE MOVE with the first step-7 increment, and 22→23 with the step-8 recovery increment —
`outcome-model.test.ts`'s own
`ALL_REFUSAL_CODES.length` assertion carries the final move | Nothing in §8's registry remains
unbuilt: `consultation-stale` — the last code to land, §11.1's own freshness tail,
meaningful only with the AL2 authority timestamps §14 admits — was built at the AL2
freshness increment, and this column said "remains unbuilt" until the post-build-order
housekeeping pass corrected it (a stale claim that survived its own increment's sweep,
contradicting this row's own Built-here column). The findings flow (§10.2) has no
freshness tail of its own to be unbuilt (see the §10.2 row). The last caveat this cell
carried — a `terminalRefusals` entry that is not a real code was accepted at
construction and then never matched — CLOSED at the 2026-08-19 phase-1 API review (its
ruling 7): `validateLeg` throws at construction on any member absent from the registry.
The resolution was already recorded in this document's own step-8 bullet list while
this row still said "caveat, not a gap"; the open-items plan's stage-1 pass
(`docs/process/open-items-plan.md`) corrected the row |
| 9 | The API surface | All five decision calls this build ships, split as §9 splits them: `stage()` agent-reachable, `open()`/`review()`/`finalize()`/`decline()` operator-only. `review()`'s own
findings projection (SPEC §10.2) is real — `ReviewView.findings?`,
digest-only with per-finding coverage, present iff the record carries findings. As of the
second step-7 increment it is reachable over host-driven chains too, not only hand-built
ones: the two operator-only seams (`raiseFinding`/`acknowledge`, `kernel/findings-seams.ts`)
now mint the `finding-raised`/`acknowledged` transitions the projection reads (see the §10.2
row). `seal()` is built too, new at the second step-2 increment, and also operator-only — §9 groups it with `open()`/`review()`/`finalize()`/`redeem()` "and the sweep — §12"; see the §5 and §12 rows for its own gate ladder. `redeem()`'s effect seam is built whole as of the third step-3 increment: both of §11.2's shapes — the direct shape (`confirmed → redeemed { via: 'direct' }`, first increment) and the token shape (`beginRedemption`/`completeRedemption`, `confirmed → redeeming { tokenDigest }` at issuance then `redeeming → redeemed { via: 'token', tokenDigest }` on presentation, second increment) — and both redemption clocks (third increment) — see the §11.2 row. The operator surface now carries three redemption call names where SPEC §9's own sealed-set enumeration names one, `redeem()`; `beginRedemption`/`completeRedemption` are this build's invention, held as a spec-vs-build naming divergence; row 6's pre-0.1 naming review RATIFIED the triad and retired 2026-08-19 (see docs/analysis/2026-08-19-phase-1-api-review.md). **That same divergence item EXTENDS to `listDue()`, new at the third step-3 increment**: SPEC §12 names "the sweep" as the operator's own iteration over `listDue(now)`, never a method of that name, and this build's `listDue()` is likewise this build's own naming rather than a spec-given one — routed to the same row 6 review, for the same reason as the two call names above — but that review's name-by-name pass never ruled on it: NO recorded ruling covers the name (noted 2026-09-01, the truth-restoration increment), and it is docketed to the 1.0 freeze beside its ids-vs-records shape. The human anchor holds by construction — the agent handle is frozen and carries nothing that transitions a record. Exclusivity is enforced in the store's constraint, not by an advisory pre-check. Of the finalize gate ladder, rungs (1) chain-verify, (2) state/expiry, (3) identity, **(3.5) separation of duties (SPEC §10.1, real as of the second step-4 increment)**, (4) content-drift, (5) facts, **(5.5) required consultations (SPEC §11.1, real as of the second step-5 increment)** and (6) the success batch — now one atomic `appendBatch` call rather than three sequential appends — are built, and their adjacent-pair order is pinned by `test/finalize-check-order.test.ts` and, for the two pairs either side of (3.5), `test/multi-leg.test.ts`. **`open()`'s options bag carries its first real key, as of the first step-4 increment**: `priorRecordRefs`, verified by replay (`kernel/prior-legs.ts`) at the sequencing rung before the genesis append — see the §10.1 and §4 rows. **`open()`'s options bag gains its second real key, as of the second step-6 increment**: `policyDigest` (SPEC §10.3), the operator-attested drift baseline, bound into the genesis present-iff-declared, fail-closed loud both directions at profile-resolution depth (a policy-declaring profile opened without one, or a non-declaring profile opened with one, throws) — see the §10.3 row. **`finalize()` gains its own first options bag, as of the first step-5 increment**: §9's documented five-argument signature, `finalize(recordId, identity, content, facts, opts?)`, is now real — `opts?: FinalizeOptions` carries its own first real key, `consultations` (SPEC §11.1's attach form; see the §11.1 row), threaded through the operator surface, `Kernel`/`makeKernel` and the kernel `finalize` signature alike; the unknown-key guard and `validateConsultations` both run BEFORE the chain loads, mirroring `open()`'s own options-loop shape (SPEC §9: consultation shape "throws at argument intake, before anything is loaded"). **`finalize()`'s options bag gains its second real key, as of the second step-6 increment**: `policy` (SPEC §10.3's `PolicyInput`: a live `{ digest }` marker or an `{ unreachable, authority }` one), shape-checked at the same argument-intake depth `consultations` uses, and presence-checked at profile-resolution depth (after rung (1)'s chain-verify and the profile resolve, so `chain-compromise` and `unknown-profile` still win) — a declaring profile's absent `opts.policy` throws, and a non-declaring profile's present one throws UNCONDITIONALLY, bound record or not. **Rung (4.5) is now built too, as of the same increment**: SPEC §10.3's policy-drift comparison, placed after (4) content-drift and before (5) facts — see the §10.3 row. Deferral register row 11 retires with this landing (see the boundary below) | `open()`'s options bag has no remaining unbuilt key: `supersedes` (§2) is real too, as of the step-8 recovery increment (see the §2 row) — the LAST call-seam GOVERNED guard in this build lifted with it (`kernel/open.ts`'s own per-key `openOptionMessage` helper — the arm that named `supersedes` GOVERNED — is deleted whole in the same commit as the behavior, its generic message inlined via a direct call to `config.ts`'s `governedUnavailable`, which never had per-key arms of its own and still serves the two construction guards plus the generic unknown-key throws), so a genuinely unknown key is the only thing that still throws there; this cell's own former claim that `supersedes` alone remained unbuilt was true through the second step-7 increment and stale as of the step-8 recovery increment, corrected here. This is a DIFFERENT tally from the construction-guarded count the §9.1 row tracks (now ZERO — the per-leg `freshness` lifted at the AL2 freshness increment, the count's own one-to-zero move recorded at the step-8 account; `captureMode:'live'` lifted earlier at the live-capture increment; this parenthetical said "now one" until the open-items plan's stage-1 pass corrected it) — a call-seam guard on a real, documented options-bag key is not a `ConfirmProfile` construction guard, and the two counts move independently. **Rung (5.5) is built WHOLE, as of the first step-6 increment**: the required-consultation half (SPEC §11.1, second step-5 increment; see the §11.1 row) plus the eligibility half (SPEC §10.4's implicit-first required kind, first step-6 increment; see the §10.4 row) — a declaring leg's implicit `'eligibility'` kind is checked FIRST, ahead of the leg's own declared `requiredConsultations`. **Ladder rung (5.7) is built too, as of the second step-7 increment**: ack coverage (SPEC
§10.2), placed after (5.5) and before (6) the success batch — see the §10.2 row.
**The findings seams (`raiseFinding`/`acknowledge`, `kernel/findings-seams.ts`) are built
too, as of the same increment** — the operator-only mid-lifecycle pair that mints the
transitions the read half (the fold, the predicate, the coverage derivation, the review
projection) has read since the first step-7 increment; see the §10.2 row. The operator sweep itself stays a recipe, not a seam — SPEC §4 ships "no scheduler and no public `expire()`" and there is no `sweep()` method — but its one read surface, `listDue()`, is built (see the §12 row); the recipe that drives ordinary seams from its output is documented in this record rather than in code (see the §12 row). Exclusivity is enforced in the store's constraint and, since the third step-2 increment, *actionable*: a `record-exists` refusal still names no blocking record in the `Outcome` (§8's model is untouched, by design), and the host locates the blocker itself through the Store's `findNonTerminal` — see the §12 row |
| 9.1 | The ConfirmProfile | The profile and leg types carry §9.1's field table. "Construction is loud" is real: `create()` validates every profile, rejects duplicate ids, requires every `canonicalizerRef` to resolve, and throws a byte-preserved "feature not available in this build" error naming the section that lifts each governed field — **zero today**, the guard era's own exit reached at the AL2 freshness increment (see the end of this recitation, and the §11.1/§14/step-8 rows): `redeemBound` joined the count at the second step-3 increment (briefly eleven) and its own guard lifted at the third, once its own clock existed to honor it, bringing the count to ten; `legs.length>1` — SPEC §10.1's multi-leg maker-checker sequencing — lifted at the first step-4 increment, once `open()`'s sequencing rung existed to enforce the ordering that guard was standing in for, bringing the count to nine; per-leg `sod` and `proposer` — SPEC §10.1's own two remaining controls — lifted together at the second step-4 increment, once `finalize()`'s rung 3.5 existed to read the evidence those guards were standing in for, bringing the count to seven; per-leg `requiredConsultations` — SPEC §11.1's required-consultation gating — lifted at the second step-5 increment, once `finalize()`'s rung 5.5 existed to read the declaration that guard was standing in for, bringing the count to six; per-leg `eligibility` — SPEC §10.4's own gating — lifted at the first step-6 increment, once the same rung 5.5's eligibility arm existed to read the declaration that guard was standing in for, bringing the count to five; the whole-profile `policySource` — SPEC §10.3's policy notarization — lifted at the second step-6 increment, once `open()`'s binding contract, finalize's presence contract, and rung (4.5)'s comparison all existed to honor the three seam obligations that guard was standing in for, bringing the count to four; per-leg `ackMode` and `requiredAcks` — SPEC §10.2's findings-flow controls, always lifted as a pair (both-or-neither) — lifted together at the second step-7 increment, once the two seams and `finalize()`'s rung (5.7) existed to honor the pair's own obligations, bringing the count to two; the whole-profile `captureMode:'live'` — SPEC §9.2's live mode — lifted at the live-capture increment, once `validateLiveCapture` (`config.ts`) existed to enforce the mode's own construction obligations (every leg declaring `requiredConsultations`; the redemption tail declaring `confirmToRedeem`, `reverify`, or both) and `kernel/redeem.ts`'s `refuseCorrespondenceMismatch` existed to give a declared `reverify` its own seam semantics, both landing in the same commit as the lift, bringing the count to one, where it stood at this increment's own exit. What remained governed at that point: the per-leg `freshness` alone (vacuous by construction at AL1 regardless — the library stamps every consultation's own `at`, library-emitted or host-supplied alike, so lifting this guard alone could never make the gate fire on its own) — since lifted whole at the AL2 freshness increment, taking the count to zero; see the §11.1, §14, and step-8 rows. `expiry` drives the open window's clock; the `redeem` block's two bounds drive the other two, all three sharing one derivation (`kernel/expiry.ts`'s `pendingWindow`). **Both bounds are now enforced, as of the third step-3 increment**: `confirmToRedeem` resolves `confirmed → expired` and `redeemBound` resolves `redeeming → redemption-failed`, each at the deadline its own value names. SPEC §9.1's "A separated-store host SHOULD declare `redeemBound`" is real advice with teeth now, not a loudly-unsatisfiable one: a host that follows it gets a clock that ends the lost-token strand on its own bound; a host that declines it keeps the strand risk knowingly, as its own SHOULD-not-MUST wording always allowed (see the §11.2 row for the retired "safe to ship, not yet safe to operate" language this replaces). **The seconds convention, recorded here as this build's own**: SPEC §9.1 states units only for `expiry.ttl` ("`ttl` in seconds"); the `redeem` block's two bounds have no stated unit of their own, and this build treats them the same way — the fixtures' `3600`/`86400` values were always seconds-shaped, and `kernel/expiry.ts`'s deadline math (`Date.parse(atIso) + seconds * 1000`) now makes that reading load-bearing rather than merely assumed. The effect-seam predicate is written whole. `allowedAuthorities` and `terminalRefusals` are honored | §9.1's individually named construction errors are not all individually checked: "inert or contradictory feature combinations" is not implemented as a general check — a malformed `terminalRefusals` member is neither rejected nor ever matched. Reserved consultation kinds in `requiredConsultations` ARE now individually checked, as of the second step-5 increment (`validateRequiredConsultations`, `config.ts` — see the §11.1 row), and double-declared eligibility (§10.4 — declaring `eligibility` and also listing `'eligibility'` in `requiredConsultations`) IS now individually checked too, as of the first step-6 increment (`validateEligibility`, `config.ts` — see the §10.4 row), reachable now that `eligibility`'s own wholesale governed throw is gone |
| 9.2 | Capture modes | **Whole, as of the live-capture increment.** Both `staged` (the base mode) and `live` construct. `live`'s own construction rules are `validateLiveCapture` (`config.ts`): every leg must declare `requiredConsultations` — the decide-time independent re-derivation, gated as an ordinary required consultation at `finalize()`'s already-built rung 5.5 (SPEC §11.1), no new gate needed for it — and the profile's `redeem` block must declare `confirmToRedeem` as a maximum age, `reverify`, or both (both is legal — a max age AND drift re-verification). The mode falls out of machinery already built: required-consultation gating, finalize's rung (4) content recompute, the redemption family and its clocks, and the effect-seam predicate, which has read `captureMode === 'live'` since the kernel increment. `reverify`'s own redemption-seam semantics land with it (`kernel/redeem.ts`'s `refuseCorrespondenceMismatch`): on a reverify-declaring profile, a CONTENT-digest mismatch at any of the redemption family's three seams — the direct shape's rung (5), the token shape's begin-time correspondence, and complete's content half (never its token half, which keeps `effect-mismatch` unconditionally — a wrong token is not state drift) — refuses `content-drift` with an APPENDED terminal `refused` edge from the seam's current state (CAS from `confirmed` at the direct and begin arms, `redeeming` at complete's content arm), releasing the `(profile, subject)` exclusivity hold; the append rides the ORDINARY non-terminal path (a live profile is an effect-seam profile, so its `confirmed` is non-terminal — no C3 carve-out involved). An enlisted (`tx`-carrying) direct-shape call meeting drift refuses result-first WITHOUT appending — an appended edge inside the host's transaction would roll back with the aborted effect — so a subsequent unenlisted invocation lands the terminal edge (the loser-agrees-with-reinvocation shape); pinned RED-first on the SQLite backing. Drifted state cannot un-drift: the decision dies terminally, and the recovery flow (`supersedes`) re-opens it under a fresh read, pinned by a composition test. `content-drift` gains this as its SECOND producer (SPEC §8; see that row): the redemption-time append is UNCONDITIONAL — `terminalRefusals` is finalize's own per-leg machinery (`appendsOn`/`refuseMaybeAppend`) and is not consulted here, the refusal-matrix comments stating the distinction. **Two OPEN-QUESTIONS.md §7 residuals are now Decided (this build)**: (1) the `reverify` surface's argument shape — none new; the redemption seams' existing `content` argument IS the fresh read, mapping every content-digest mismatch to `content-drift` as above, the token comparison keeping `effect-mismatch`; (2) the staging contract — UNCHANGED: `stage()` binds the reviewed rendering's digest exactly as before, finalize's existing rung (4) re-digest is the decide-time re-verification, and the mandated independent re-derivation is evidenced by the required consultation — zero changes to `stage`/`open`/`finalize`. The `captureMode:'live'` GOVERNED throw is gone (`validateLiveCapture` replaces it — see the §9.1 row); the governed count moves 2 → 1 with this lift. The four live-mode `[SKETCHED]` tokens (SPEC.md:488's inline bracket, SPEC.md:667's bold heading, CONTROLS.md:40's prose, CONTROLS.md:45's cell) moved to `[PROVEN]`, and SPEC.md:488's trailing clause — which named the `reverify` seam semantics as among that mode's open decisions — was rewritten to point at OPEN-QUESTIONS.md §7's now-recorded decisions instead | The library never verifies the re-derivation's path-independence: the consultation gates its PRESENCE and verdict, never whether the host's access path is genuinely independent of the one that produced the reviewed rendering — that proof is the operator-assurance tier's live-path-distinctness probe (CONTROLS §4), stated wherever the mode is described. No new refusal code (`content-drift` gained a second producer, not a row) and no new argument, seam, store change, or encoding change |
| 10 | Feature-conditional decision controls | The shape of the rule: a host declaring none of §10's fields runs the base model, and every field that would switch one on throws at construction | All four controls below |
| 10.1 | Maker-checker / SoD | **Whole, as of the second step-4 increment.** Both controls the section names are enforced at `finalize()`'s spec-fixed rung 3.5 (SPEC §9's ladder: "(3) identity → (3.5) separation of duties → (4) content-drift"), after identity is well-formed and its authority allowed and before content-drift is checked. **The sequencing half** (first step-4 increment): `legs.length>1` is accepted at construction (the guard lifted with this landing — see the boundary below); `isFinalLeg(legIndex, totalLegs)` remains an index comparison, forward-compatible rather than a hardcoded final-leg answer, and `open()` passes the resolved leg's index. `open()`'s sequencing rung (`kernel/prior-legs.ts`'s `verifyPriorLegs`, consumed before the genesis append) verifies EVERY prior-leg reference by replay against SIX conditions, stated once here canonically: **(1)** the referenced chain must verify intact, **(2)** its recomputed head must equal the supplied `chainHead`, **(3)** the replayed record must share the successor's `profileId`, **(4)** share the successor's `subjectRef`, **(5)** sit at the expected leg, in the profile's declared order, and **(6)** be `confirmed` — refusing `prior-leg-unverified` (never-append, pre-record) on any failure, including a first leg that supplies references at all. On success the successor's `opened` snapshot carries the verified references in their recorded three-field form `{ recordId, chainHead, legId }` and the library-derived `priorLegActors` (see the §4 row). A sealed prior still verifies — state, not status, is what the check reads — and a destroyed one does not (SPEC §10.1's own two named postures, both pinned in `multi-leg.test.ts`). **The gate half** (second step-4 increment): `sod.notActorOf` and `proposer` construct real now (the GOVERNED throws deleted with the gate — see the boundary below); `finalize()`'s rung 3.5 reads the sequencing half's own chained evidence — for each `notActorOf` entry it looks the named leg up in the record's own `priorRecordRefs`, pairs it by index into `priorLegActors`, and refuses `sod-violation` if the paired actor's `principal` equals the finalizing identity's; `proposer` refuses the same code if it equals the finalizing identity's `principal`. **Comparison is by principal alone, deliberately** (§10.1): the same human re-authenticated under a second allowed authority still refuses, the fail-closed direction — the residual same-human-different-principal case is §10.1's own named AL1 limit, recorded rather than coded around. **A lookup miss refuses too — this cell's own former claim, corrected here**: it read an entry naming a leg absent from the record's own recorded references as reachable only through profile reconfiguration between `open()` and `finalize()`, since construction validates the static case, refusing `sod-violation` fail-closed on the reading that distinctness cannot be demonstrated from evidence the record does not carry. That was true through the second step-4 increment and is stale as of the profile-drift gate (2026-09-03): the profile reconfiguration this route needs (renaming or reordering legs between `open()` and `finalize()`) changes the profile's own data-only projection, so profile resolution now refuses `unknown-profile` before this rung ever runs — the recorded-refs lookup itself is unchanged and unobservable through that shape; a fresh record under the current profile remains unaffected. **A retried decision by the same actor on the SAME leg is untouched**: `notActorOf` names only prior legs and `proposer` compares only the declared principal, so neither control fires on a retry (§10.1: "A retried decision by the same actor on the same leg is not self-approval"). The refusal is the sixteenth code, `sod-violation` — refusal-class, default-open, `terminalRefusals`-able like the other rung-(3)-through-(5) refusals (see the §8 row); every non-declaring profile's chain stays byte-identical, no new append shape anywhere. **The AL1 window on this evidence is recorded beside it, not closed**, unchanged since the first increment: the `priorLegActors` a successor's `open()` derives live in that successor's own genesis payload, which IS the chain head until the successor's own next append — over exactly that window the §0/§5 head-bound applies for a NON-signing profile — this build's own default. **A SIGNING-declaring profile closes this window now**, as of the AL2 enforcement increment (see the §8 and §14 rows): `signatureLayerHolds` recomputes and correlates every transition INCLUDING the genesis, so a head-window tamper orphans that transition's signature and refuses `chain-compromise` at finalize's own rung (1), before rung 3.5 ever reads the tampered evidence. **Four fail-closed rulings this build took where the spec is silent, recorded as tightenings, not divergences**: a `notActorOf` entry must be non-empty, pairwise distinct, and name a strictly-earlier leg (an empty array, a later leg, the leg's own id, or an unknown id could never match the record's references and would be declarable-but-inert — the fail-open trap `validateSodShape`, `config.ts`, rejects structurally at construction); `proposer` is multi-leg-only (§10.1's applicability sentence scopes the whole feature, so a single-leg profile declaring it is a construction error too); `proposer` must be non-empty (an empty string constructed fine but could never fire at the gate — finalize's rung 3 requires a non-empty `identity.principal`, so `leg.proposer === identity.principal` is unsatisfiable for `''` — the same declarable-but-inert trap; found at the second step-4 increment's final review, after the gate itself had already landed, and closed there rather than left as a residual gap); and the lookup-miss refusal above | Cross-leg content binding is not verified — legs may decide enriched or different content, both digests chained, a host wanting identical content enforcing that in its own staging (SPEC §10.1's own stated non-goal). Distinct principals, not independent judgment: two colluding humans satisfy the gate; collusion and coercion are out of scope (SPEC §13A). The library still never verifies WHO a principal is — identity remains transport-established (SPEC §6), and the gate compares recorded strings. The last residual hardcoded leg index — kernel/expiry.ts's single expired/redemption-failed append — was removed at the truth-restoration increment (2026-09-01), the index now derived from the replayed record exactly as the dueAt producer derives its own; output-identical (the fed flag is false for every input under either derivation, both kinds being terminal), pinned in clocks.test.ts |
| 10.2 | Findings & acknowledgments | **Whole in this build, as of the second step-7 increment.** The first increment landed the read half: `finding-raised`/`acknowledged` transitions FOLD in `chain/replay.ts` rather than throw: a raise upserts by `findingId` into `record.findings` (a new id appends in first-raise order; an existing id is a content update, moving `findingDigest`/`magnitude`/`raiser` to the new version's — an update without `magnitude` CLEARS it); an ack pushes `{ findingDigest, magnitude?, acker }` onto its named finding's `acks`, whether or not it will ever count. `replay`'s two remaining throwing arms are storage/config faults, reached only on a chain no honest seam could produce: a re-raise that changes an existing `findingId`'s `kind` THROWS (`kind` is immutable per `findingId`), and an ack naming a `findingId` absent from the chain THROWS — neither kind moves `state`. `DecisionRecord.findings?: RecordedFinding[]` and `ReviewView.findings?` are both new (`types.ts`): present iff the chain carries at least one `finding-raised`, absent (not present-but-empty) otherwise — a non-declaring profile's chain stays byte-identical, and every existing byte-stability pin is untouched. `kernel/findings.ts` carries the two pure derivations SPEC §10.2 names: `ackCounts(finding, ack, ackMode)` — current-digest equality, `magnitude` present-iff-present both directions and exact, `ackMode` by PRINCIPAL-ONLY comparison against the finding's CURRENT raiser (`self`/`counterparty`/`any`), a missing/empty principal on either side failing closed — and `findingCoverage(findings, ackMode, requiredAcks)`, the per-finding `'covered' \| 'ack-missing' \| 'ack-stale' \| 'not-required'` array `finalize()`'s own ack-coverage gate (rung 5.7) consumes as of the second increment. `kernel/review.ts` projects the digest-only findings view: present iff `record.findings !== undefined`, coverage derived under the record's own resolved leg, content never appearing (§3). **Review's own conservative-read posture is recorded here, not left implicit**: when a record's `profileId`/`legId` is unresolvable against THIS instance's config, `kernel/review.ts` reads `leg?.ackMode`/`leg?.requiredAcks` as both undefined and `findingCoverage` classifies every finding `'not-required'` rather than guessing at the true declaration — the same reading `ReviewView.findings`'s own doc comment (`types.ts`) states: "review is a pure read that never fails on config drift — the gate at finalize is where an unconfigured profile refuses." **The second increment landed the write half — the seams, the gate, and the construction lift, together in ONE atomic commit** (per the step-7 brainstorm's own ruling: the seams cannot precede the lift, or they are unreachable; the lift cannot precede the gate, or a declaring profile finalizes fail-open). The seams: `kernel/findings-seams.ts`'s `raiseFinding`/`acknowledge`, two operator-only calls sharing one prologue (the `kernel/redeem.ts` several-seams-one-prologue shape) — argument intake THROWS on a malformed finding/ack/identity or an unknown key, before the chain loads; chain-verify FIRST (`appendChainCompromise`, the same exported rung-(1) helper `seal()` reuses); profile/leg resolution (`unknown-profile` fail-closed; a persisted `legId` absent from the profile THROWS); a declaring check THROWS on a leg whose `ackMode`/`requiredAcks` are undefined (SPEC §10.2: "both seams throw on a record whose resolved leg declares no findings flow", keeping a non-declaring chain byte-identical to a pre-findings implementation); state/expiry en passant (`resolveDueClock`, the finalize rung-(2) arms adapted — `expired`/due-open → `leg-expired`, any other non-open state → `record-not-open`, never-append); the seam-specific semantic check (`raiseFinding`: a kind-mutating re-raise THROWS; `acknowledge`: an ack naming an absent `findingId` THROWS — a stale digest, a mismatched magnitude, or an `ackMode`-violating acker all APPEND, fidelity not validity); and the one append, CAS target `'open'`, meta `{ nonTerminal: true, dueAt? }` RE-SUPPLYING the open window's `dueAt` (SPEC §12's "present sets the record's pending-clock column, absent clears it" — a mid-lifecycle append that omitted it would disarm the sweep's clock for that record; `expiry:'none'` omits it, clearing nothing because nothing was set), pinned by a `listDue` test. The gate: `finalize()`'s rung (5.7), placed between rung (5.5) and the success batch, replays the record's own findings and acks — NO new finalize inputs — and consumes the read side's own `findingCoverage` derivation, refusing at the FIRST row in first-raise order whose coverage is `'ack-missing'` or `'ack-stale'` — both codes `refusal`-class, `terminalRefusals`-able, open-by-default (`refuseMaybeAppend`, the same helper rungs (3)/(3.5)/(4)/(4.5)/(5)/(5.5) already use); `'covered'`/`'not-required'` rows pass; an undeclared flow or a findings-free record passes vacuously (SPEC §10.2: "`requiredAcks` gates *raised* findings; it does not require findings to exist"). The construction lift: `ackMode`/`requiredAcks`'s GOVERNED throws (`validateLeg`, `config.ts`) are gone, replaced by `validateFindingsFlow` — the settled fail-closed structural class `validateSodShape`'s/`validateRequiredConsultations`'s: both-or-neither (§10.2's own sentence, "either alone is a construction error"), and `requiredAcks` non-empty/pairwise-distinct/non-empty-string kinds — deliberately WITH NO reserved-kind arm, because finding kinds are their own namespace (SPEC §10.2: "the reserved consultation kinds do not apply to them"), and `'facts'` is a LEGAL `requiredAcks` kind, pinned by test. The governed count moves 4 → 2 with this lift, both fields of the pair together in the one commit (see the §9.1 row and the boundary below). **A naming divergence from SPEC §2's Ack structure, recorded here rather than reconciled,
entered by the first step-7 increment.** SPEC §2 (`docs/concept/SPEC.md:158`) names the Ack object's identity
field `actor` — "`{ findingId, findingDigest, magnitude?, actor, at }`". This build's
`AcknowledgedPayload`/`RecordedAck` (`types.ts`) name that same field `acker` instead:
`DecisionRecord.actor` (the same file's own record-model field) already names the deciding
human, and reusing that label for the acknowledging identity would read as the same field
twice under one name. The rename is deliberate — a reading, not drift — and it STANDS;
`types.ts`'s own comment beside `AcknowledgedPayload` carries the rationale (`RecordedAck`'s
own comment does not restate it). `acknowledge` (`kernel/findings-seams.ts`, real as of the
second step-7 increment) mints `AcknowledgedPayload` with this exact shape — field `acker`,
not SPEC's `actor`.

Two rulings recorded here, so they are not re-litigated: `ackMode` compares against the CURRENT version's raiser — a re-raise moves the raiser along with the digest, and both raisers stay chained regardless of which is current (fidelity) — this build's reading of a singular SPEC leaves unversioned; and `replay` throws, rather than folds, on the two chain shapes the seams (`kernel/findings-seams.ts`, real as of the second step-7 increment) now make impossible on an honest chain (a re-raise changing `kind`; an ack naming an absent `findingId`) — the same storage/config-fault posture already used for a paired-actor mismatch and a garbled `tokenDigest`. **The marker move, executed with the second step-7 increment's exit**: SPEC §10.2's own `[DESIGNED]` token, and the eight others it carries alongside it across SPEC.md and CONTROLS.md — nine in total — moved to `[PROVEN]`/`PROVEN`, in a commit of their own after the atomic commit's gates were green (see the boundary below for the full nine-line enumeration); this is the first draft-ahead marker to move in this repository | The library gates coverage structurally — it never proves a raised finding is genuine, that an acknowledging identity actually reviewed it, or that a supplied `magnitude` means what a host's domain says it means: `magnitude` stays opaque, exact-equality, host-canonicalized, and the library never interprets it, the same operator-assurance limit every other gate in this build carries. SPEC §10.2 has no freshness tail of its own — `freshness` (§11.1's own AL1 vacuity argument, resolved at the AL2 freshness increment; see the §11.1 and §14 rows) is a per-leg control the findings flow does not share and never gated on |
| 10.3 | Policy-drift notarization | **Whole, as of the second step-6 increment.** `policySource` (`ConfirmProfile`, an opaque per-profile label) is accepted at construction — the kernel increment's GOVERNED throw is gone (the EIGHTH self-authored inversion; see the boundary below) — replaced by the same settled fail-closed structural class as `eligibility`'s own: an empty label throws as the malformed-reference rule. **The binding contract, loud both directions**: `open()`'s options bag carries its second real key, `policyDigest` (a `Digest`) — after profile resolution, a policy-declaring profile opened WITHOUT a (non-empty) `policyDigest` throws, and a `policyDigest` supplied to a NON-declaring profile throws too (§10.3: "fail-closed both directions and loud — a caller/config error, not a domain refusal"); the operator-attested digest is bound into the genesis `opened` payload present-iff-declared, never routed through the agent-reachable `stage()` — "routing the drift baseline through the untrusted drafter would let a lying agent bind whatever digest it anticipates the live source will hold" — and `replay`/`getRecord()` fold it, the draft-ahead field's first producer. Non-declaring chains stay byte-identical; the frozen fixtures never declare. **The presence contract, argued asymmetric with the consultations bag**: `finalize()`'s `opts?: FinalizeOptions` gains its second real key, `policy?: PolicyInput` (a live `{ digest: Digest }` marker or an `{ unreachable: true; authority: string }` one), shape-checked at argument intake beside `validateConsultations` (a present `opts.policy` must be exactly one of the two shapes, non-empty, or it throws as a caller error before the chain loads) and presence-checked at PROFILE-RESOLUTION depth — after rung (1)'s chain-verify and the profile resolve, so a tampered chain still refuses `chain-compromise` first and an unconfigured profile `unknown-profile` first (`policy-drift.test.ts`'s "the depth pin: a tampered declaring-profile chain refuses chain-compromise BEFORE the absent-policy throw" pin). A declaring profile's absent `opts.policy` throws; a non-declaring profile's present one throws UNCONDITIONALLY — bound record or not — deliberately DIFFERENT depth from the consultations bag's intake-depth throw, because policy is "a single mandatory environment fact with an explicit unreachable escape hatch"; its absence is a host contract violation, not omitted evidence, and keeping absence out of `policy-drift` leaves that code purely "the digests differ". **Rung (4.5)**, placed after (4) content-drift and before (5) facts (content integrity outranks the policy environment; policy outranks the evidence gates, "deciding under the wrong policy version moots the evidence"): a matching live digest confirms; a required policy source the host reports unreachable yields the `availability` outcome, its SECOND producer (rung 5.5 was the first) — bounded retry on the SAME open record, never fail-open, never approval; a mismatch refuses `policy-drift` (the twentieth code), including the ABSENT-bound forward corner — a live digest compared against `record.policyDigest === undefined` is a mismatch by the same string-inequality check, since `undefined` never equals a string. **BOTH cross-instance corners are pinned — this cell's own former claim, corrected here.** It read the forward corner (a record opened under a non-declaring same-id instance, finalized under a declaring one with the digest form) as refusing `policy-drift`, fail-closed, at rung (4.5), and the reverse corner (a record opened under a DECLARING instance, finalized under a same-id NON-declaring one, no `opts.policy`, legal there) as THE DECIDED OPEN QUESTION this build takes FAIL-CLOSE, the recommendation §10.3 itself records, over skipping the gate — with the sealed concept set left untouched, §10.3 marking the question open and this build answering it only in code, not in the spec. That reading was true through the second step-6 increment and is stale as of the profile-drift gate (2026-09-03): both cross-instance corners now refuse `unknown-profile` at profile resolution, before rung (4.5) ever runs — a same-id profile that adds or drops `policySource` between a record's `open()` and its `finalize()` no longer digests to the record's genesis `profileDigest`. The reverse corner's own rung-(4.5) arm is now an unreachable throw in `kernel/finalize.ts`, not a live refusal path; the forward corner's "present live digest against an absent bound one" sub-case is likewise pre-empted, folded into the same throw's reasoning at the code site. What remains live at rung (4.5) is the ordinary, non-drifted case — an UNDRIFTED same-id declaring instance whose live `opts.policy.digest` differs from the record's own bound one still refuses `policy-drift`, both digests present and unequal, exactly as before; the `{ unreachable, authority }` attestation still yields the availability outcome there too, and the check order is unchanged. And since the profile-drift gate, the sealed text itself says so, not only the code: SPEC §10.3 was amended under the sanction recorded in the increment's own design §8, and `docs/concept/OPEN-QUESTIONS.md` §2 now carries a further "Superseded (this build, the profile-drift gate)" tail alongside its 2026-08-19 "Decided (this build)" one. The cost, restated: a host retiring or newly declaring a policy source between a record's two seams no longer reaches rung (4.5) at all — it refuses `unknown-profile` at resolution, and must re-open under a held profile rather than finalize gate-free or gate-checked either one. **The head-bound window** (§10.3's own AL1 analog of the SoD-evidence window, recorded beside the guarantee, not closed by it): a single-leg record's bound `policyDigest` lives in the genesis (head) payload until the next append — a storage-writing insider edit defeats the gate inside that window, for a NON-signing profile — this build's own default. **A SIGNING-declaring profile closes this window now**, as of the AL2 enforcement increment (see the §8 and §14 rows), the same mechanism §10.1's own head-bound window closes under. **The SHOULD guidance**: `policy-drift` mirrors `content-drift` — bound-vs-reality, no in-place recovery — so a policy-declaring leg SHOULD list it in `terminalRefusals` for the disposal-and-re-open flow; `availability` is the transient case that DOES retry the same open record. **Multi-leg**: `policyDigest` is record-level — each leg's own `open()` binds its own digest; no cross-leg equality is verified, chained and auditable like cross-leg content | The library notarizes the policy version; it never fetches or evaluates policy — whether the live source was honestly read stays the operator's, the same honest bound every gate carries |
| 10.4 | Eligibility gating | **Whole in this build, as of the first step-6 increment.** Declaring a per-leg `eligibility` reference makes `'eligibility'` an **implicit-first required consultation kind**: at `finalize()`'s rung 5.5 (see the §9 and §11.1 rows) the effective kinds for a declaring leg are the implicit `'eligibility'` kind followed by the leg's own declared `requiredConsultations`, in order, so authority-to-decide is checked before the evidence checks — the library never runs the check itself; the host supplies the `eligibility` consultation's verdict and the library gates on it. **The trip mapping**, when the tripping kind is the implicit `'eligibility'` under a declaring leg: a `fail` verdict refuses `ineligible` (SPEC §8's nineteenth code); a missing input refuses `consultation-missing` (generic); an unreachable marker yields the `availability` outcome (generic) — every other kind along the same rung keeps the generic codes too. **Verdict vs. code**: a failed eligibility check records verdict `'fail'`; `ineligible` is the refusal code, never a verdict value — a `pass`-verdict eligibility consultation is an obtained required input and records in the success batch exactly as every obtained consultation already does, while a `fail` records no consultation of its own (its evidence is the outcome code; a leg wanting a chain trace lists `ineligible` in `terminalRefusals`). `ineligible` is `refusal`-class, `terminalRefusals`-able, and takes the DEFAULT `appendsOn` path — open-by-default so a DIFFERENT eligible actor may decide the same open record. **The ordinary-kind fallback**, when `eligibility` is NOT declared: `'eligibility'` is then an ordinary kind with no special mapping — a voluntary `eligibility` consultation records as supplied evidence, and "a leg that merely lists `'eligibility'` in its `requiredConsultations` gates it with the generic codes (`consultation-failed` on a `fail`, never `ineligible`)". Construction: `eligibility?: string` was already on `LegSpec`; the GOVERNED throw is gone (`validateEligibility`, `config.ts`), replaced by the same settled fail-closed structural class as `validateSodShape`'s/`validateRequiredConsultations`'s — an empty label throws as the malformed-reference rule (the gate keys on the declaration's PRESENCE and never compares the label, so this is NOT `proposer: ''`'s inertness trap), and declaring `eligibility` while also listing `'eligibility'` in the same leg's `requiredConsultations` throws SPEC §10.4's own "declare it once" construction error, naming both sites. The governed count moves 6 → 5 with this lift (see the §9.1 row) | **Honest bound**, stated with its limit in the same breath: the gate ensures a `fail` cannot silently confirm — it never fabricates a pass — but it does not prove the named authority genuinely ran the check; the truthful-verdict burden stays the host's, exactly as §11.1's own gate does not prove a consultation was genuinely obtained. SPEC §10.3 — policy drift — landed at the second step-6 increment, closing step 6 whole; see the §10.3 row |
| 11 | Feature-conditional evidence & the effect seam | A heading with no normative text of its own; its two subsections carry it | — |
| 11.1 | Consultations | **Whole in this build, across three increments.** The first landed §11.1's unconditional half, as of the first step-5 increment (SPEC §11.1: "The attach form is always available"). `finalize()` still records its own `chain-verify` and `facts` consultations as before; the host's own attach form exists beside them: `opts?: FinalizeOptions`'s `consultations` key (`config.ts`'s `ObtainedConsultation`/`UnreachableMarker`/`ConsultationInput`), validated and partitioned at argument intake by a standalone module, `kernel/consultations.ts`'s `validateConsultations`, called BEFORE the chain loads (SPEC §9: "throws at argument intake, before anything is loaded" — pinned by a test where the intake throw wins over an unknown-`recordId` throw when both apply). It throws a caller error — never a refusal — on: an entry matching neither exact shape, or carrying an unknown key (an `at` field included — SPEC §11.1's "never accepted from the host" is enforced structurally, since neither input shape HAS an `at` field to drop); a non-string/empty `kind`, an out-of-domain `verdict`, a checker failing `isValidIdentity`, a missing `payloadDigest`/`authority`, a non-string `proofRef`; a RESERVED kind, `facts` or `chain-verify` ("would forge a library control"); or a duplicate `kind` across the whole list ("At most one consultation per kind per finalize"). `finalize()`'s success batch (rung (6)) is variable-arity, SPEC §9's own shape — `appendBatch([chain-verify, facts, …obtained consultations, confirmed])` — each supplied entry recorded between `facts` and `confirmed`, in supplied order, with the library-stamped recording time (the batch's single clock reading, §2.1 — never a host-supplied one, for host-supplied kinds too, not only the library's own two), digest-only custody (`payloadDigest`; the library never sees the payload), and `proofRef` present iff supplied. A fail-verdict consultation on a kind that is NOT required is recorded and does NOT refuse — §11.1's own sentence for that case: "recorded as supplied — including a `fail` verdict — as evidence, never a gate," pinned by its own named test. A no-consultations finalize's batch stays byte-identical in shape to before (the existing byte-stability suite, untouched, is this pin). Custody, stamping and one-per-kind hold for host-supplied consultations exactly as they already held for the library's own two; `replay` accumulates all of them in chain order, unchanged. The backing-parameterized conformance suite gained an arity-5 `appendBatch` case, run over both backings — nothing in the suite had exercised the store's own N-element acceptance above arity 3 before. **The second landed the gate, as of the second step-5 increment**: `finalize()`'s rung 5.5, placed after (5) facts and before (6) the success batch, reads the finalizing record's own resolved leg — "on a multi-leg profile one leg's finalize is never gated by another leg's `requiredConsultations`" — and iterates the leg's declared kinds in order, the first declared kind that trips deciding the outcome, never severity ranking across kinds. Per kind, three arms are checked in order and are mutually exclusive (the intake validator's one-per-kind rule already rejects a host supplying both a marker and an obtained entry for the same kind): a reported-unreachable marker produces the `availability` outcome — `{ status: 'unavailable'; code: 'availability'; authority }`, `authority` carrying the marker's own — never a fabricated pass, and it NEVER appends: `appendsOn` returns `false` for the whole class unconditionally, ahead of the `terminalRefusals` consult, making it the SECOND legal-but-inert `terminalRefusals` member beside `leg-expired`'s (both pinned by `refusal-matrix.test.ts`), and the record stays `open` so the seam re-arms for bounded host retry; a kind absent from the supplied obtained set refuses `consultation-missing` (its SECOND producer, after rung (5)'s own facts check); an obtained `fail` verdict refuses `consultation-failed` (the seventeenth code); a `pass` verdict is satisfied and the entry records in the success batch exactly as before — the gate adds no recording of its own. `refused()`'s `code` parameter narrows to `Exclude<RefusalCode, 'availability'>` in the same increment, the class's never-a-refused-edge rule made compile-time, pinned by a `@ts-expect-error` test. An unreachable marker for a kind the leg does NOT require stays inert exactly as the first increment left it — validates at intake, records nothing. The `requiredConsultations` GOVERNED throw lifted with the gate in the same commit: `validateRequiredConsultations` (`config.ts`) replaces it with this build's own fail-closed structural posture, the same settled class as `validateSodShape`'s — non-empty, pairwise distinct, every kind a non-empty string, never a reserved library-emitted kind (`RESERVED_CONSULTATION_KINDS`, `config.ts`, exported and consumed by both the construction guard and the intake validator — one definition, two consumers). Multi-leg: only a declaring leg is gated, the sequencing rung's own reading, pinned by test. **The third landed the freshness tail itself, as of the AL2 freshness increment.** `Consultation` gains `observedAt?: string` (§2 lists the AL1 shape; the field lands under §14's own admission sentence, an anticipated extension, not a divergence — see the boundary below); the intake validator accepts it structurally on the OBTAINED shape alone (RFC 3339 with an explicit offset, enforced at intake; the unreachable marker gains no such key, an unknown-key throw there); `finalize()` gains a presence contract at profile-resolution depth, the `opts.policy` precedent exactly — a non-signing profile's obtained `observedAt` throws, a signing profile's is admitted and recorded digest- and signature-covered. Rung 5.5 gains a freshness arm after a required kind's `pass` verdict: a kind the leg's `freshness` record bounds demands an evaluable, sane, in-bound claim — missing, future, or older than the bound refuses the twenty-fourth and last code, `consultation-stale` (see the §8 row). `validateFreshness` (`config.ts`) replaces the GOVERNED throw — a declaring leg's profile must set `signing: true`, every bounded key ⊆ the leg's own required set (plus the implicit `eligibility` where declared), every bound a positive integer of seconds — the LAST governed field in this build; see the §14 and step-8 rows for the count's own 1 → 0 move and the sanctioned sealed bundle it closed with. Three `OPEN-QUESTIONS.md` §4 questions are Decided: freshness-eligible kinds are a subset of the leg's required kinds; finalize inputs are fixed per call, so the seam re-arms on the next invocation rather than re-entering in-attempt; and `facts` gets no bound of its own, since library-stamping IS observation at that seam | §11.1 is whole in this build, all three increments landed. **The gate enforces presence, verdicts, and unreachability honestly — it never fabricates a pass — but it does not prove the named authority was genuinely consulted**: that severing a dependency yields `availability` rather than a stubbed pass is the operator's own regression exercise, outside the library's runtime guarantee (the operator-assurance limit §11.1 itself names travels with the guarantee, not a gap this build could close). The freshness gate carries the SAME class of limit, now that it is built rather than governed: the library never verifies the observation happened AT `observedAt`, only that the recorded, signature-covered CLAIM is present, parseable, and in-bound — genuineness of the claim itself stays `proofRef` and the operator-assurance probes, stated in the same breath as the gate (the AL2 freshness increment). `eligibility`'s own implicit-first required kind (§10.4: declaring `eligibility` prepends an implicit `'eligibility'` kind ahead of the declared `requiredConsultations`) is now built too, as of the first step-6 increment: rung 5.5 computes the EFFECTIVE kinds for a declaring leg as the implicit `'eligibility'` kind followed by the leg's own declared `requiredConsultations`, in order — see the §10.4 row for the trip mapping and the construction guard's lift. **The interplay with a never-satisfiable required kind**: whether the unsatisfiable kind is the implicit `eligibility` one or an ordinary declared one, a required kind the host can never pass keeps the record `open` and the finalizing leg's `(profile, subject)` pair held — bounded by the profile's own open `expiry.ttl`, or indefinitely under `expiry: 'none'`, the operator's own configuration to resolve. No lost-artifact strand exists the way an unbound redemption token once could (§11.2): the operator controls every finalize input, so the operator can always choose to end its own wait — by declaring a bounded `ttl` up front, or by supplying a different verdict, authority, or consultation on a later finalize attempt |
| 11.2 | Redemption (the effect seam) | `redeem(recordId, content, opts?)` — `opts?: RedeemOptions` since the effect-result increment's own Task 1 — is exported on every profile, as §8 requires of it. The first step-3 increment landed §11.2's direct shape as a verify-first gate ladder: chain-verify first (§5), profile resolution, the effect-seam/final-leg gate refusing `unredeemable-state`, the state gate (`already-redeemed` on replay, checked before correspondence — at-most-once outranks mismatch reporting — `unredeemable-state` otherwise-not-confirmed), effect-content correspondence via the same stage-path re-digest finalize rung (4) uses, refusing `effect-mismatch` on drift, and the atomic append of `confirmed → redeemed { via: 'direct' }`, enlisted through the caller's own `tx?` handle where supplied — which releases the `(profile, subject)` pair a confirmed effect-seam record held (register row 9, retired by building). The §8 stub-scoping fixes landed with it: an unknown `recordId` throws rather than misreporting a refusal, an unknown profile fails closed to `unknown-profile`, and the ladder verifies the chain before acting rather than never verifying. **The second step-3 increment landed §11.2's token shape whole**: `beginRedemption` (issuance, `confirmed → redeeming { tokenDigest }`) and `completeRedemption` (presentation, `redeeming → redeemed { via: 'token', tokenDigest }`), both sharing the direct shape's chain-verify-first prologue; the token itself — `node:crypto`'s `randomBytes(32)` as a 43-character base64url string, satisfying §11.2's "enough entropy that its digest is not invertible by guessing" — is generated before the append and returned in the `ok` value exactly once, never persisted (the chain carries only `tokenDigest`); at-most-once's replay half is built at both new seams (`already-redeemed` on an already-redeemed record, checked before correspondence, the same priority the direct shape uses); completion checks the token-vs-content correspondence — `digest(token)` against the chain-recorded `tokenDigest`, then the re-digested content against the bound `contentDigest`, both refusing `effect-mismatch` (§11.2's one code covers both, so the internal order between them is unobservable and recorded here rather than pinned by test); and THE RELEASE the direct shape's `confirmed → redeemed` edge performs is now also performed by the token path's `redeeming → redeemed` edge — either terminal `redeemed` lifts the Store's C1 hold. The ladder's STRAND set is pinned by test: `seal()`, direct `redeem()`, `open()`'s en-passant blocker-expire, and `beginRedemption` itself all refuse against a `redeeming` record rather than resolving it (`unsealable-state` / `unredeemable-state` / `record-exists` / no re-issue), `listDue` stays blind to it (no clock, no `dueAt`), and `completeRedemption` with the correct token is the sole exit. **UPDATED, at the third step-3 increment: that STRAND set now closes on its own bound wherever `redeemBound` is declared.** One generalized clock module (`kernel/expiry.ts`) derives `pendingWindow` — the confirmed window (`confirmedAt + confirmToRedeem`, only when final-leg, effect-seam, and declared) and the redeeming window (`redeemingAt + redeemBound`, only when declared) — and `resolveDueClock` performs the one shared compare-and-swap append: `confirmed → expired { bound }` (the SAME kind and payload shape as the open window's own edge; the transitioned-from state, not the payload, distinguishes the clause) and `redeeming → redemption-failed { bound }`. The producers: `finalize()`'s success batch stamps `confirmedAt + confirmToRedeem` into `dueAt` on a declaring, final-leg, effect-seam confirm (one clock reading per batch); `beginRedemption` stamps the `redeeming` payload as `{ tokenDigest, bound }` and `dueAt` together iff `redeemBound` is declared — closing the second increment's own present-iff-declared gap in BOTH directions, key-set pins for both profile shapes — undeclared, the payload stays exactly `{ tokenDigest }`, as the second increment pinned. The resolution rung is shared by all three redemption seams' prologue, placed after the effect-seam/final-leg gate and before each seam's own state gate: THE RESOLVER REPORTS the outcome it observes — an elapsed confirmed window resolves to `expired` and the seam refuses `unredeemable-state` (§11.2's preamble: the record is now expired); an elapsed redeeming window resolves to `redemption-failed` and the seam refuses `redemption-timeout`; a seam arriving after someone else's resolution finds the terminal state at its own state gate and refuses `unredeemable-state` too — nothing timed out at THAT call; a lost resolution CAS re-reads once and agrees with what re-invocation would say (the second increment's residual pattern, reused). `finalize()`'s state/expiry gate and `open()`'s exclusivity blocker branch observe the SAME clocks en passant: `finalize()` on a due-confirmed or due-redeeming record resolves it and refuses `leg-expired` / `record-not-open` from the fresh state; `open()`'s blocker branch now expire-then-retries a due-`confirmed` blocker exactly once — the `confirmToRedeem` half of §9.1's un-stranding promise — while a due-`redeeming` blocker still refuses `record-exists` with NO edge, SPEC §4's named exception ("`open()`'s exclusivity check never auto-resolves a `redeeming` blocker, due or not"), now pinned non-vacuously rather than vacuously true. `redemption-timeout` is the fourteenth `RefusalCode`; `replay` folds `redemption-failed` to `state: 'redemption-failed'` AND the constant `refusalCode: 'redemption-timeout'`, no longer throwing on that kind. The GOVERNED `redeemBound` guard (`config.ts`) lifted the same increment — an authorized inversion of the second increment's own construction-validation pin, argued in place at `construction-validation.test.ts` (see the boundary below). §11.2's at-most-once is now COMPLETE: the elapsed-`redeeming` unknown-outcome half joins the already-built replay half — a correct token presented after the bound elapsed gets the resolution and `redemption-timeout`, never a retry of an unknown outcome. The operator's sweep read, `operator.listDue()`, is built too (see the §9 and §12 rows) — a pure passthrough to `store.listDue(now())` under the injected clock, frozen into the operator literal and absent from the agent surface. **Result notarization is built too, at the effect-result increment**: `redeem.result?: true` admits (never requires) a host-claimed outcome digest at the two seams where the outcome is knowable — `redeem()` and `completeRedemption()`, rejected unconditionally at `beginRedemption()` — spliced present-iff-supplied into the `redeemed` payload as `resultDigest` and folded onto `DecisionRecord.resultDigest`; see the dedicated section below | The executor contract — the library never executes the effect, only couples to it — has no host-facing seam beyond the `opts?: RedeemOptions` bag: `tx`, taken by all three seams (register row 16, retired 2026-08-19 by building, shape-updated 2026-08-21), and `result` (the effect-result increment). Four items recorded here rather than left implicit: **(a)** two `unredeemable-state` producer extensions land with the second step-3 increment — a `beginRedemption` against an already-`redeeming` record (no re-issue) and a direct `redeem()` against a `redeeming` record (that ladder holds no token to consume) — both documented at the seam per §8's stability rule rather than slipped in silently; **(b)** begin-time effect-content correspondence is this build's addition, not spec-granted — §11.2's correspondence sentence reads at the effect's execution (completion), but refusing a mismatch before a token is ever issued is exactly what the Honest bound's "mismatched effects refusable at the seam" buys; **(c)** the family-wide CAS-residual re-read — all three redemption seams now re-read the chain once on a failed append and re-run their own state-gate mapping on the fresh state, rather than reporting a flat `unredeemable-state` — is an authorized behavior change to the first increment's own direct seam, whose flat residual was never pinned (that increment's tests deliberately declined a racing store); **(d)** the **"safe to ship, not yet safe to operate" statement RETIRES, at the third step-3 increment, to its truthful successor**: this build is safe to operate wherever a host declares `redeemBound` — the clock that ends the strand now exists, so `completeRedemption` with the token is no longer the sole exit once the bound elapses (the resolution is the other one). A host that omits `redeemBound` accepts the strand risk SPEC §9.1's own SHOULD names, knowingly — a policy choice the host makes at construction, not a truth the library can supply for it. `redeem-token.test.ts`'s no-`redeemBound` strand test (`noRedeemBoundProfile()`) is the executing record of exactly that shape: the same seal/direct-redeem/finalize refusals and the same `listDue`-blind assertion the second increment pinned, now scoped to the one profile shape that still carries them |
| 12 | Storage interface | All eight `Store` methods §12 gives a signature to — `findNonTerminal` landed the third step-2 increment, with C1 exclusivity over the persisted non-terminal flag, C2 server-verified sequencing, C3 terminal monotonicity (including the compromise carve-out) and **C4 seal-finality** all checked atomically inside the append rather than as an advisory pre-check; `putStaged` is "idempotent, first-write-wins"; "All reads return **fresh values**" is honored on every write and read seam, by deep clone on read *and* on write; the persisted `state`, non-terminal and `dueAt` columns are "constraint-and-index only", backing the compare-and-swap, the exclusivity index and the due query, replay over the chain staying the authoritative derivation; digests use the record's recorded algorithm. `appendTransition`'s `meta` argument now matches §12's `{ nonTerminal, dueAt? }` shape exactly, rather than the bare `nonTerminal` boolean it took before. `appendBatch` lands §12's atomic-batch rung whole: the entry compare-and-swap is checked **once** (genesis never appears in a batch); per-element sequencing is server-verified `max+1 … max+N`; terminal-monotonicity runs against the evolving intra-batch state with the terminality input fixed at the entry flag, so a record "cannot become terminal mid-batch"; `meta` is applied once as the post-batch record flags; and the first conflicting element aborts the whole transaction with nothing applied, naming that element's index. `listDue(now)` implements §12's gate verbatim — `dueAt ≠ null AND dueAt ≤ now`, with no state predicate — and, as of the third step-3 increment, `dueAt` has THREE producers: the genesis `opened` append (the profile's open-window deadline, built from the kernel increment on), `finalize()`'s success batch (the declared `confirmToRedeem` window, one clock reading per batch), and `beginRedemption`'s `redeeming` append (the declared `redeemBound` window) — with every state-leaving append, including both clock-resolution edges themselves, clearing it by omission. **C4, built at the second step-2 increment**: after a `sealed` transition lands, set from the transition's kind rather than from `meta`, no further append is admitted through either write seam, each at the reach §12 gives it: `appendTransition` checks seal-finality on every call and reports `state-mismatch`, while `appendBatch` checks it **once at entry** and reports `state-mismatch` at `index: 0`, matching SPEC §12's own words exactly: "Entry-level failures — an entry compare-and-swap mismatch or C4 seal-finality — report element index 0." The batch bar is entry-level only — the per-element loop does not re-evaluate seal-finality against the evolving batch, so a batch carrying a `sealed` element followed by further elements would not be stopped element-by-element. That is what §12 specifies rather than a narrowing of it, and nothing in this build can construct such a batch: `seal()` is the only producer of a `sealed` transition and sends it as a single `appendTransition`. The storage-section "Sealing" paragraph's `seal(recordId)` — verify, resolve profile, already-sealed check, derived-terminal check, then append — is also built (`kernel/seal.ts`), adding no Store method of its own and calling exactly two of them, `readChain` and `appendTransition`, over `chain/replay.ts`'s pure functions; see the §5 row and the eight-of-eight boundary below. **`findNonTerminal`, built at the third step-2 increment**: `(profileId, subjectRef)` to the blocking recordId or null, implemented on C1's own scan predicate (`liveNonTerminalFor`) so the record it returns and the `blockingRecordId` a rejected genesis names agree by construction, with the agreement also pinned observably by test; narrowed like `listDue` — it returns the recordId where §12 says "the live non-terminal record", ids being what every downstream seam takes, and full records requiring the store to replay chains it deliberately does not interpret. **The embedded-SQL adapter, built at the fifth step-2 increment** (`store/sqlite.ts`, `node:sqlite`'s synchronous `DatabaseSync`): C1 as the real partial unique index §12 prescribes, C2 as `PRIMARY KEY (record_id, seq)` with server-verified `max+1` inside the write transaction, C3/C4 evaluated from the same `store/semantics.ts` mapping the memory backing now imports (one copy, no drift), every write inside one `BEGIN IMMEDIATE` transaction with the mutation last, columns constraint-and-index only, transitions as JSON text (fresh values structurally). **`tx?`, built the same increment**: on all three interface writes, adapter-generic (`unknown` on the interface, the adapter's own `DatabaseSync`-with-open-transaction on the class — enlisted, never wrapped in a transaction of its own (since the transactional-sidecar increment, 2026-11-19, the enlisted body runs in a savepoint inside the host's transaction, which never ends that transaction — see that section's Inversions paragraph), same-connection validated); `MemoryStore` throws loudly on presence, having no driver. The proof structure now runs over two backings: the conformance suite via one caller file per backing, plus the cross-backing byte-identity test (fixed clock and fixed recordId sequence, per-transition JCS-byte equality). **The sweep recipe, built at the third step-3 increment**: `operator.listDue()` is a pure read, `store.listDue(now())` under the injected clock, frozen into the operator literal and absent from the agent surface — SPEC §12's own "the sweep" stays a recipe the operator runs, never a `sweep()` method (§4 ships "no scheduler and no public `expire()`", and a method by that name would be one in all but name). The recipe itself is documented here, not in code: iterate `operator.listDue()`; for each listed record, in a confirmed or redeeming window, drive `redeem(recordId, {})` — the resolution rung precedes correspondence, so any content serves, and the refusal reports the resolution that fired (`unredeemable-state` for an elapsed confirmed window, `redemption-timeout` for an elapsed redeeming one); then `seal()` the resolved records — sweep-then-seal, matching `seal()`'s own no-en-passant-expiry rule (§4/§5), pinned end-to-end by test. **The due-`open` rough edge, recorded honestly beside the recipe**: a due-`open` record has no argument-free resolver of its own — `redeem()` is spec-forbidden from treating a due-`open` record as expired (§4), and `finalize()` needs real arguments (`identity`, `content`, `facts`) the sweep does not have — so a due-`open` record resolves lazily at its next genuine `finalize()` call or at a fresh `open()` for the same `(profile, subject)` pair (§4's own lazy rule), never from the sweep directly. This is the spec's own shape rather than deferred work, so it carries no register row | The narrowings stand as before (`listDue` and `findNonTerminal` return recordIds). `open()` still holds C1's `blockingRecordId` internally and discards it, and a refused `Outcome` still carries no locator field — by design now rather than by gap: the host performs the lookup through the Store read §12 provides for exactly that purpose. `listDue` is narrowed from §12, which says the method "returns the records due": this build's version returns recordIds instead, because ids are what the operator sweep needs and full records would require the store to replay chains it deliberately does not interpret. §12's reference-adapter proof structure is complete for all three reference backings: the "backing-parameterized conformance suite" (test-side, `test/conformance/store-conformance.ts`, at the fourth step-2 increment — 42 migrated store-driven pins plus three store-level `listDue` pins) runs over each by its own one-call caller file — the third, `@vidimera/store-postgres`'s, added at the phase-4 increment that retired register row 15 — and the cross-backing byte-identity test (built at the fifth step-2 increment; see the Built column) holds them equivalent. (This cell said "the two backings that exist", with the server-SQL backing "the remaining absence", until the open-items plan's stage-3 pass corrected it — the landing predated the correction by a day and the survey missed this cell.) Whether the suite is exported as an adapter-author's tool was a 0.1-cut question left dangling when row 6's review retired without ruling on it; DECIDED 2026-08-20 (`docs/analysis/2026-08-20-conformance-export.md`): NOT exported while 0.x — the suite stays test-side, vendoring is the blessed path for a host verifying its own adapter, and the 1.0 store-interface freeze re-asks the question, a separate dev-only package the presumptive shape if it then rules export. See the eight-of-eight boundary below |
| 13 | Privacy & retention | Digest-only custody is real — content never reaches the store — which is what makes §13's pseudonymization guidance implementable by a host. `principal` is stored exactly as supplied. Sealing and the `active`/`retired` distinction are built at the second step-2 increment (§5, §12 rows), so §13's specified end-of-life state — "a record reports as `active` or, once sealed, `retired` — rather than an unexplained gap in the chain" — now exists here | Pseudonymization, retention periods and the purpose-limitation guard remain host duties this build neither enforces nor could |
| 13A | Security considerations | Descriptive, and accurate of this build: the AL1 limit is what `verifyChain` delivers, and "whole-record absence is silent" holds here too — `readChain` returns `[]` for an unknown id, and every audit path runs over what the store returns. **Three of the four named threats §13A says the library addresses are now live**, up from two as of the second step-7 increment: render-to-decide drift (rung (4)), payload-identity forgery (rung (3)), and — newly — late-arriving findings, caught by finding/ack coverage (finalize's rung (5.7)) where a findings flow is configured (§10.2, whole in this build; see the §10.2 row). The fourth, "faithful binding of a wrong draft", is §13A's own non-claim rather than a mechanism a build step switches on: the record proves review and decision, never correctness, and prevention "lives upstream", so it is not counted among the live three | **The AL2 closure §13A names for its first two residuals now exists**, for a SIGNING-declaring profile, as of the enforcement increment (see the §8 and §14 rows) — a non-signing profile, this build's own default, keeps the AL1 exposure exactly as named. The third residual, whole-record absence, stays unclosed even under AL2, per SPEC §13A's own text ("detached signing… verifies only what exists — absence survives it") |
| 14 | Signing & anchoring | AL1 is what ships, and nothing in this build describes it as cryptographic. **AL2's own THREE increments — the mint, the enforcement, then freshness — have all now landed; the layer is load-bearing and AL2 is whole** (see the step-8 row for the full split). Four rulings were taken at the AL2 brainstorm, so a later increment does not re-litigate them: **(1)** signing is per-profile and record-homogeneous — a record opened under a `signing: true` profile is signed WHOLE from its own genesis, mid-chain enablement boundaries never exist, and a same-id profile flipping the field is the version-discipline violation §2's own convention already names; **(2)** the missing-signature posture, BANKED at the mint, is now BUILT — an unsigned or unverifiable transition of a signing record folds into the existing chain-verify outcome at every one of the six verification sites then existing at the enforcement increment, as this row's own enforcement paragraph below states; **(3)** key custody is `keyRef` beside each detached signature, resolved against a host-supplied verifier registry (the canonicalizers-registry precedent) — the library never holds private keys, and an unresolvable `keyRef` reports (never throws) unverified; **(4)** three increments were scoped — mint, enforce, freshness — this row's own marker moved at the second, with the sanctioned sealed-bundle edit below; freshness, the third, has now landed too, with a second sanctioned sealed-bundle edit of its own (see the step-8 row). Landed: `ConfirmProfile.signing?: true` (the literal `true`, not `boolean`, closing the `signing: false` inertness trap at the type level the same way this file's other structural guards do) and `Config.signing?: { signer, verifiers, signatures }` (`config.ts`); a `signing: true` profile with `config.signing` absent throws loud at `create()`, while `config.signing` with no declaring profile is legal (a prepared instance, the unused-canonicalizer-registry-entry class). What is signed is the canonical transition bytes, `encodeTransition(transition)` (`chain/encoding.ts`, the frozen file untouched by the AL2 mint increment) — §14's "Detached signatures over canonical transitions and consultations" is satisfied transition-granularly, since in this build consultations ARE transitions (`consultation-recorded`, finalize's batch). **The mint point is a Store decorator, not per-seam edits**: `signing/decorate.ts`'s `withSigning` wraps the injected store — delegating all eight `Store` methods explicitly by name, since a class-instance object spread would silently drop prototype methods, recorded at the decorator's own header — and intercepts only `appendTransition`/`appendBatch`; it decides whether a record signs from the genesis payload's own `profileId` (memoized per record, one `readChain` genesis read on a decorator-restart-miss fallback), and for a signing record signs every transition BEFORE delegating the append. **Sign-before-append is argued, not incidental**: a crash or lost CAS between the sidecar write and the store append leaves an ORPHAN signature — an entry for a transition that never landed — which is harmless, because verification is chain-driven (it looks up a signature FOR a chain transition, never trusts the sidecar as its own index); the reverse order would risk a LANDED unsigned transition on a signing record, which the enforcement increment's fail-closed posture would then condemn as compromise, so reversing the order would make an honest crash produce a false finding — pinned by `test/signing.test.ts`'s throwing-signer order test (append never lands) and its orphan-invisibility test. `create()` wraps the store iff `config.signing` is present, BEFORE the kernel closures capture it, so every append path — the seams, `finalize()`'s batch, the en-passant clock edges, the reverify drift edge, `sealed` — is covered by construction, with ZERO seam edits and ZERO edits to any frozen surface; the enlisted `tx` seam (the direct-shape `redeem`) passes through untouched, the sidecar write deliberately OUTSIDE any host transaction (an aborted effect's orphan signature is the same harmless class), pinned on the SQLite backing. The reference sidecar, `signing/memory.ts`'s `MemorySignatureStore`, is a Map-backed `SignatureStore` keyed by `transitionDigest`, `put` upserting (a later signature over identical bytes is still evidence for the same digest, never a conflict). **The one audit surface, `operator.verifySignatures(recordId)` (`kernel/verify-signatures.ts`), is a PURE READ**: chain-driven correlation by `transitionDigest` (an orphan sidecar entry is invisible to the report by CONSTRUCTION, not by a filter, pinned by test), reporting `signed`/`verified` per transition plus `signingDeclared` for the record's own genesis-resolved profile — it never refuses, appends, or throws on a verification failure itself (an unresolvable `keyRef`, a failed verifier, or a throwing one all report `verified: false` — fail-closed REPORTING, not a gate); it throws only on the caller-error/unknown-record class every other read takes. (**Widened at the chain-binding increment, 2026-11-17 — the FOURTEENTH self-authored inversion**: that class now includes foreign persisted data. A chain whose rows carry another record's id throws here, as it does at `getRecord`, `replay`, `review` and `open()`'s blocker read — the "every other read" parallel kept, the class widened for all of them together; argued at its pin in `test/chain-binding-seams.test.ts`, and recorded in that increment's own section. It still never throws on a verification failure.) Byte-identity is pinned precisely: `signing: true` is a DECLARED control, so it differs the genesis `profileDigest` exactly as every declared control does and nothing more — no signature material appears in any transition of either chain, and a non-declaring profile's chain stays byte-identical to the frozen pins. **The governed count stays UNCHANGED at 1** (the per-leg `freshness` alone, `config.ts`): `signing` is a NEW capability that arrived WITH its own behavior in the very commit that declared it — the `reverify`-arrival class (see the §9.2 row) — never a construction throw standing in for missing behavior that a later commit lifts, so there was never a guard here to begin with — `freshness` itself, the one field still governed at the mint, is the field AL2's own third increment lifts, below, taking the count to zero. **The enforcement increment, second of three, has now landed: the layer is load-bearing.** One shared async correlation core, `kernel/verify-signatures.ts`'s `signatureLayerHolds(ctx, chain)`, factored onto the SAME per-transition walk `verifySignatures` already used rather than duplicating it: `true` when the layer does not apply (the genesis `profileId` resolves to a non-signing or unresolvable profile in THIS instance — the same id-resolution posture `verifySignatures`'s own `signingDeclared` reads by) or when every transition carries a sidecar entry whose `keyRef` resolves and whose verifier passes over `encodeTransition(t)`; `false` on any miss, unresolvable `keyRef`, failing or THROWING verifier (fail-closed). AL1 intactness (`verifyChain(chain).intact`) stays every call site's FIRST, cheap, synchronous check — the layer is consulted only on an intact chain, pinned by a counting-verifier test showing it is never even invoked on a hash-broken one. **All six verification sites then existing enforced, at this increment**, each folding a `false` verdict into the SAME arm its own `!intact` already took, no new code and no new outcome class anywhere: `finalize()` (rung (1)), `seal()`, the redemption family's shared prologue (`kernel/redeem.ts`, serving `redeem`/`beginRedemption`/`completeRedemption` alike — the enlisted direct shape's result-first no-append refusal is INHERITED from the existing hash-break branch, not re-decided), and the findings family's shared prologue (`kernel/findings-seams.ts`, serving `raiseFinding`/`acknowledge` alike) all route a bad layer through `appendChainCompromise` (the seams that already append) or the same result-first shape (the enlisted redemption corner), landing `chain-compromise`; `kernel/prior-legs.ts`'s `verifyPriorLegs` and `kernel/supersedes.ts`'s `verifySupersedes` fold a bad layer into their own existing `{ ok: false }` arm, refusing `prior-leg-unverified`/`supersedes-unverified` respectively — pre-record, never-append, exactly as a hash break there already refused. **The compromise edge itself, appended onto a signing record, is signed by construction**: it lands through the `create()`-level decorator like any other append, pinned by test. (**Changed at the signing-obligation increment, 2026-11-17**: `signatureLayerHolds` applies the layer when the instance HOLDS the record's profile and that profile declares `signing`, and, where it does not hold it, only when its live same-id profile declares `signing` AND the genesis transition's sidecar entry verifies under its own verifier — no longer on the bare `profileId` resolution described above. And "signed by construction" holds only where the appending instance's live profile is a signing one: an edge a drifted instance whose live profile is non-signing draws over a hash-broken chain is unsigned, unchanged by this increment — the row should not be read wider. See the signing-obligation section at the end of this document.) **The two audit reads stay separate, deliberately, and neither ever gates**: `operator.verifyChain` remains the AL1 report exactly as before, `operator.verifySignatures` the AL2 report — graduated honesty — and the enforcement increment adds no new refusal code, no new outcome class, no store or encoding change, and zero edits to `chain/encoding.ts`. The suite grew 576 → 583 across 43 files (`test/signing-enforce.test.ts`'s six tests: tamper-one-signature refusals at all four seams and the cross-record claims; the layer's non-overreach on a non-signing record; the unresolvable-`keyRef` fail-closed corner; the order pin that a hash-broken chain never even reaches the verifier — the enlisted redemption corner is a SEPARATE pin, `test/redeem.test.ts`'s own SQLite enlisted suite, not one of these six). **The sealed bundle executed at the enforcement increment's own exit**, a separate commit after the enforcement commit's own gates were green, byte-verified before/after: SPEC §14's AL2 bullet and CONTROLS.md:48's bare cell moved `[SKETCHED]`/`SKETCHED` → `[PROVEN]`/`PROVEN`; `OPEN-QUESTIONS.md` §1's four bullets each gain a tail — granularity, missing-signature posture, and key custody all **Decided (this build)**, authority timestamps **explicitly still open**, this step's own third AL2 increment; SPEC:1233's and CONTROLS.md:48's own "named open decisions"/"granularity open" phrasings rewritten decided-on-record with the §1 pointer; OPEN-QUESTIONS.md §7's opener tense-fixed. **The governed count stayed UNCHANGED at 1** with the enforcement increment too: enforcement is new behavior at an existing seam, never a construction guard lifted — there was no guard here to lift. **`freshness` gating has since landed, AL2's own third increment, taking the count to ZERO — the LAST governed field in this build lifts here.** `Consultation` gains `observedAt?: string` (§2 lists the AL1 shape; the field lands under this row's own admission sentence — "AL2 admits authority timestamps inside digested payloads for required consultations" — an anticipated extension, not a divergence); a signing profile's finalize admits a recorded, signature-covered `observedAt` claim on an obtained consultation, a non-signing profile's throws (the `opts.policy` presence-contract precedent); rung 5.5 gains a freshness arm refusing the twenty-fourth and last code, `consultation-stale`, on a bounded required kind's missing, future, or out-of-bound claim (see the §8 and §11.1 rows for the gate itself). `validateFreshness` (`config.ts`) replaces the GOVERNED throw — the TENTH self-authored inversion in this document's own numbered sequence, the guard-lifting era's own exit (see the boundary below) — closing the feature-guards-from-day-one era the kernel increment opened: every guard it installed has now lifted behind its own behavior, each in the same commit as that behavior. A second sanctioned sealed bundle executed at this increment's own exit: SPEC:527's, SPEC:634's, and SPEC:951's freshness-row `[SKETCHED]` tokens and CONTROLS.md:47's cell moved to `[PROVEN]`/`PROVEN (AL2-dependent)`, and `OPEN-QUESTIONS.md` §1's own fourth (authority-timestamps) tail — the prerequisite this row's own enforcement paragraph above left explicitly open — completed to Decided (this build): the recorded-claim, signing-gated design. The library never verifies the observation happened AT `observedAt` — genuineness stays `proofRef` and the operator-assurance probes, the same class of limit `verifySignatures` itself already carries | **The REHOMING RESIDUAL, named, not closed**: a whole-chain recompute that rewrites the genesis `profileId` to a REGISTERED non-signing profile produces a hash-intact chain the layer does not apply to — the signature obligation is keyed by the genesis's own claim, not by whether the chain was ever actually signed. Closures exist but none is built here: a deployment that registers only signing profiles; a future profileDigest-pinning tightening riding SPEC §2's versioned-id convention. `verifySignatures` already reports the truth either way (`signingDeclared: false` on the rehomed claim), so an auditor composing the two reads sees the rehoming — the guarantee stated with its limit in the same breath, the honesty discipline's own register. `review()` and the other pure reads stay unverified, unchanged — `review` never chain-verified before the enforcement increment and gains nothing here; the enforcement bound was the six sites then existing, stated. **`freshness` gating has since landed too, AL2's own THIRD increment — see this row's own Built-here column and the §8/§11.1/step-8 rows for the gate's full mechanics.** AL2 is whole in this build: all three of its scoped increments (mint, enforce, freshness) have landed. The self-test tier (`OPEN-QUESTIONS.md` §5) has since landed too, at the self-test-tier increment — step 8's own fourth and last tail item, closing the build order at its declared scope (see the CONTROLS §4 row and the step-8 boundary below; deferral register row 17 retires with it). AL3 anchoring remains documented-only, `[SKETCHED]`, untouched by any of the AL2 signing increments or by the self-test tier: CONTROLS §4's own probes re-attack AL1/AL2 behaviors, never a claim about AL3 |
| CONTROLS §4 | OPERATOR-ASSURANCE — self-run verification (`docs/concept/CONTROLS.md`, not a `SPEC.md` section; carried in this table because it is the build order's own last item) | **Built whole at the self-test-tier increment, step 8's own fourth and last tail item.** The suite grew 595 → 621 tests across 45 files over that increment's own commits (both numbers checked against the tree at the increment's own last commit, not carried forward from a plan — the final-review fix wave's own two not-driven pins are included). `src/probes/` ships a library subpath (`index.ts`, `types.ts`, `runner.ts`, `probes.ts`), versioned with the library under the Store contract's own pre-1.0 discipline — "behaviors stable, shapes provisional", stated at every module's own header — `packages/record/package.json` carries the `./probes` subpath in its `exports` map as of the phase-2 packaging increment, so a consumer imports `@vidimera/record/probes` directly (register row 6 retired 2026-08-19). **The shape**: a `ProbeDriver` interface (`makeConfig`, `sampleContent`, `sampleIdentity`, `sampleConsultations?`, plus three optional host-exercise hooks — `severConsultationAuthority`, `disableRenderingCredential`, `restartPersistence`) the host wires against its own real configuration, never a test fixture — `makeConfig()` must return a FRESH, independent instance per call, isolation being the driver's own duty; `runProbes(driver, opts?)` runs every registered probe (a throw is caught and recorded as a `fail`, never an aborted suite) and returns `{ results, satisfied, expiredWaivers, unusedWaivers }`; `assertSatisfied(report)` is the CI hook (no CLI ships, YAGNI). **`not-driven` is GENERALIZED**, past the brainstorm's own starting scope: a probe reports it not only when the host's driver lacks the exercise hook it needs, but also when the probed configuration reaches no profile declaring the control the probe re-attacks (a driver with no multi-leg profile cannot prove SoD refusal, and the report SAYS so) — graduated honesty applied to the tier itself: `not-driven` is "unproved", never "disproved", never a silent skip. Waiver governance carries its own expiry discipline: `Waiver = { probeId, reason, expires }`, `expires` an offset-required RFC 3339 string (the freshness increment's own intake class, reused); an UNEXPIRED waiver converts `fail`/`not-driven` to `waived`; an EXPIRED waiver converts NOTHING and is flagged in `expiredWaivers`; a waiver that converted nothing (already passing, or its own probe absent) is listed in `unusedWaivers`, never silently absorbed. **Seventeen probes** (`ALL_PROBES`), each `{ id, target, run }` — the plan's own `requires` predicate is not a fourth member; it landed folded into each probe's own `run`, as that probe's not-driven branches — with `target` quoting `docs/concept/CONTROLS.md` §4 VERBATIM — the target-list sentence for sixteen of the seventeen, and `live-path-distinctness`'s own table-cell text ("Disable the rendering credential; the independent re-derivation must still succeed", a behavior the sentence never names) for the seventeenth: the library-orchestratable fourteen — tamper-evident-on-replay, drifted-content-refuses, payload-carried-identity-cannot-finalize, at-most-once-redeem, effects-match, cross-leg-self-approval-refuses (narrowed honestly to the two-leg shape its own driver can construct), stale-or-missing-acks-block, required-consultations-present, ineligible-refuses, exclusivity-holds, nothing-agent-reachable-decides, unknown-inputs-fail-closed, binds-what-the-reviewer-saw, signature-tamper-refuses — plus the three host-exercise probes: consultation-genuineness (sever the required authority; the seam must yield `availability`, never a stubbed pass; restore after), live-path-distinctness (disable the rendering credential; the independent re-derivation must still succeed), state-survives-restart (open+confirm, `restartPersistence()`, the record replays `confirmed`, over a REAL sqlite close-reopen fixture, not a simulated one). **The can-fail discipline is demonstrated for four probe families plus the runner-catch path — not suite-wide**: deliberately-broken drivers drive four named probes to a genuine `fail` — a constant-digest canonicalizer makes drift invisible (`drift-refuses` fails), a lying severed-authority hook stubs a pass (`consultation-genuineness` fails), a state-losing restart driver defeats the restart probe (`state-survives-restart` fails), and a disabled-credential path that lies about independence fails the re-derivation itself (`path-distinctness` fails) — plus the runner-catch path itself: a throwing driver's setup surfaces as `fail` via `runner.ts`'s own catch, proven directly (not through any one probe's own attack logic). A minimal-config driver with no declaring profile makes every declaring/hook-gated probe report `not-driven`, never a false pass. The other **eleven refusal-assertion probes** — `exclusivity-holds`, `tamper-evident`, `payload-identity-refused`, `at-most-once-redeem`, `effects-match`, `sod-refuses`, `acks-block`, `consultations-present`, `ineligible-refuses`, `binds-reviewed`, `signature-tamper-refuses` — carry no broken-driver fail demonstration of their own in this suite: only their conforming-host pass path is pinned, so "a probe suite able only to pass is the stubbed-pass trap wearing a runner" is proven for the four named families plus the runner-catch path, not yet for the tier as a whole. **The honest bound, verbatim from `docs/concept/CONTROLS.md` §4's own table**: "Proves the control operated in the probed configuration, at probe time" (the runner row); "A probe-proved property, not a library-enforced one" (consultation-genuineness); "Probe-proved, host-specific" (live-path distinctness); "Self-attestation with expiry discipline — not third-party assurance" (waiver governance) — each restated at `runner.ts`'s own header too: a passing report is not third-party assurance and says nothing about an unprobed configuration. **Row 18's bounds-validation task landed inside this same increment**: `validateBounds` (`config.ts`) — see the boundary below for the ELEVENTH self-authored inversion it carries | The tier proves properties in the probed configuration, at probe time, never third-party assurance and never a claim about an unprobed configuration — stated at the runner's own header and repeated here. The probes gain no privileged access: everything runs through the public surfaces plus the Store/sidecar handles the host's own config already contains — the insider-attack surface, which is the point |

### Named boundaries and divergences

Nine things are called out on their own because a reader would otherwise have to
reconstruct them from the table.

**The store is eight of eight.** `putStaged`, `getStaged`, `appendTransition`, `appendBatch`,
`readChain`, `chainHead`, `listDue` and `findNonTerminal` are all built — `findNonTerminal`
landed at the third step-2 increment, the last of the eight. **The denominator was corrected at the
increment that shipped `seal()`: it had been nine, and the ninth was `seal`, counted as a
second absent Store method.** `seal` never was one. SPEC §9 lists it operator-only,
alongside `open()`/`review()`/`finalize()`/`redeem()` "and the sweep — §12," and §12 discusses
`seal(recordId)` in the storage section only because C4 seal-finality — the constraint that
makes both of them true — lives there. `seal()` is built (see the §5 row and the next
boundary below) and adds no Store method of its own: it calls exactly two of the eight,
`readChain` and `appendTransition`, over `chain/replay.ts`'s pure functions. At the time
`seal()` was built it could not have run "atop all eight" in any case — `findNonTerminal`
was not yet there to be called. Its arrival is what surfaced the miscount, not what caused
it — the count was wrong from this row's first version, long before `seal()` existed to
demonstrate it. The distinction that matters is recorded in full at **deferral register row
13** and is summarized here rather than restated differently: §12's provisionality clause —
"method signatures are unstable while 0.x and freeze only at 1.0", the durable thing being
the behavior rather than the argument list — covers what remains of the signature
divergence, now `tx?` alone (`appendTransition` and `appendBatch` both take §12's
`meta = { nonTerminal, dueAt? }` exactly). That clause never covered an **absent method**: a
store missing one implements part of §12's surface and does not conform to §12, no reading
of the provisionality clause closes that gap, and that is exactly why the missing eighth
method was a nonconformance with §12 while it lasted and why it closed only by building
`findNonTerminal` rather than by any latitude the clause offers. `Store` is a public export
and `Config.store` is host-supplied, so a third-party adapter author must not read the
shipped eight-method surface as the whole contract while `tx?` remains unbuilt. Row 13
itself does not retire at the third step-2 increment's exit: it is rewritten in place to
carry `tx?` alone, its trigger moved from "Build step 2" to the first real adapter — the
register's own preamble treats numbers as stable identifiers, and a row that still names a
real, if narrowed, gap stays on the table under its own number. **UPDATED, at the fifth
step-2 increment**: the signature divergence this paragraph tracks is closed — `tx?` is
built on all three interface writes, adapter-generic on the interface and validated per
backing (see the §12 row). Row 13 retires at the fifth step-2 increment's exit, per the
register's own preamble (a gap is an entry that has left; the number is not reused),
rather than being rewritten again as this paragraph once predicted it would be.

**Chain retirement is built, and deferral register row 14 retires.** §5's "sealed"/"retired"
pair and §12's C4 seal-finality bar are real: `seal(recordId)` on the operator handle verifies
the chain first — SPEC §5: "Verification is first: a record whose chain fails verification
refuses `chain-compromise` and can never be sealed" — then, against a derived-terminal record,
appends a state-preserving `sealed` transition through C3's carve-out; the store's C4 bar then
admits no further append of any kind, through either write seam, and `replay` folds a `sealed`
transition to `status: 'retired'` without moving `state` — a sealed `confirmed` record is still
`confirmed` (§2 row above). This closes **deferral register row 14**, now retired and deleted
per the register's own preamble (a gap is an entry that has left; the number is not reused).
Row 14's trigger predicted the wrong sequencing, and the correction belongs here since the row
itself is gone: it read "The build step that first ships `seal()` — the same step must add the
C4 bar and its test, because shipping `seal()` makes this gap reachable in the same commit."
That did not happen, and did not need to — C4 seal-finality and its test landed one build task
*ahead* of `seal()`, deliberately, so the store already refused correctly before the one seam
that could reach it existed. The prediction was reasonable (nothing demonstrates a bar with no
producer of what it bars) and wrong: building the bar first and proving it defensively, then
adding the caller that can trigger it, is the safer order, and it is the order the second
step-2 increment actually used.

**Row 10 retires: the `redeeming` chain-compromise candidates are built.**
`kernel/finalize.ts`'s `appendChainCompromise` — the single, shared compromise-append helper
`finalize()`, `seal()`, and (via the redemption ladders' own shared prologue) `redeem()`,
`beginRedemption` and `completeRedemption` all reach through — now
carries `'redeeming'` in both its dynamic candidate list
(`dedupe([replay(chain).state, 'open', 'confirmed', 'redeeming'])`) and its catch-branch
static fallback (`['open', 'confirmed', 'redeeming']`), landed at the second step-3
increment alongside `beginRedemption`, the first producer of a real `redeeming` state.
Before the second step-3 increment neither list named that target, so a tampered
`redeeming` chain's compare-and-swap attempt matched no candidate and the compromise
refusal surfaced result-first with no `transitionRef` — the same ref-less shape SPEC §5/§12
reserve for the already-terminal / already-sealed corner, but reached here for a different
reason (no candidate existed to try, not that none was admitted). SPEC §5 admits
`redeeming → refused` directly ("both are non-terminal states"), so a tampered `redeeming`
chain now lands the edge WITH a `transitionRef` — through the ORDINARY non-terminal CAS
path, not the C3 carve-out: a `redeeming` record's persisted non-terminal flag is always
true (SPEC §12's C1 counts any `redeeming` as non-terminal), so the backings' terminal
branch that actually consults `isCompromiseCarveOut` is never reached for it
(`store/semantics.ts:96-108` pins exactly this), the same way an `open` chain's compromise
edge already succeeded through the ordinary non-terminal path. The C3 carve-out itself
remains the terminal-`confirmed` route only — pinned by two tests in
`packages/record/test/redeem-token.test.ts` (one per candidate-list branch: a mid-chain
tamper exercising the dynamic list, a genesis-kind tamper forcing `replay` to throw and
exercising the static catch-branch list).
This closes **deferral register row 10**, now retired and deleted per the register's own
preamble (a gap is an entry that has left; the number is not reused). The row's own trigger
— "the build step that first produces a `redeeming` state" — named build-order step 3 in
general; it fired at that step's SECOND increment specifically, since the first (the direct
shape) produces only `redeemed`, never `redeeming`.

**The third step-3 increment closes the strand, and two more pin inversions are authorized.**
The resolver-reports ruling: whichever redemption seam (`redeem` / `beginRedemption` /
`completeRedemption`) itself appends the `redeeming → redemption-failed` edge refuses
`redemption-timeout` — the outcome names what THAT call did; a seam arriving after the
resolution finds `redemption-failed` already on the chain and refuses `unredeemable-state`
instead, the second increment's dead-until-now arm going live. `finalize()` and `open()` keep
their own domain codes when they resolve the SAME clocks en passant (`leg-expired` /
`record-not-open` / expire-then-retry) — never `redemption-timeout`, reserved for the
redemption seams' own resolution. Argued in place at `kernel/redeem.ts`'s shared `prologue`
(the clock-rung comment) and pinned by `clocks.test.ts`'s resolver-vs-later-arrival tests.
The `open()` due-confirmed blocker extension: SPEC §9.1's un-stranding promise names two
halves — `redeemBound` (the redeeming-window strand this section documents throughout) and
`confirmToRedeem` (a confirmed blocker sitting on a lapsed window would strand a fresh
`open()` the same way, absent a clock). `open()`'s exclusivity blocker branch already
expire-then-retried a due-`open` blocker (built from the kernel increment); it now extends
the SAME expire-then-retry-once shape to a due-`confirmed` blocker, while a due-`redeeming`
blocker keeps SPEC §4's named exception — refused with NO edge, never auto-resolved by
`open()` (pinned in `clocks.test.ts`; the rule is stated at `kernel/open.ts`'s own comment).

Two pin inversions land with the third step-3 increment, both argued in place and neither inherited from
the reference implementation — a different category from the two step-1 inversions above,
since these invert pins this build itself set during the SECOND step-3 increment:

1. **The `redeemBound` construction guard lifts.** `construction-validation.test.ts`'s own
   "INVERTED, at the third step-3 increment" note, beside its
   "`redeem.redeemBound` is accepted at construction — the clock that honors it is built"
   test, replaces the second increment's GOVERNED-throw pin with the opposite assertion:
   construction now succeeds. Argued there: the second increment's guard existed only because
   no clock could honor SPEC §4's present-iff-declared `bound` byte; the third increment
   builds that clock, so the guard's own stated trigger has fired.
2. **`replay()`'s throw on `redemption-failed` folds instead.** `replay-verify.test.ts`'s own
   "INVERTED, at the third step-3 increment" note, beside its
   "replay: a redemption-failed transition folds state AND refusalCode redemption-timeout"
   test, replaces the second increment's loud-throw pin (no producer existed then) with the
   fold SPEC §4's table names. Argued there: the third increment's clock resolution is the
   producer that makes the fold reachable for the first time.

Both notes are appended in place beside their prior pin, per this build's standing
discipline, never a silent rewrite.

**The first step-4 increment lifts the multi-leg construction guard, with a third
self-authored inversion.** `legs.length>1` — SPEC §10.1's multi-leg maker-checker
sequencing — was GOVERNED-throw-guarded from the kernel increment on; it lifts because
`kernel/open.ts`'s new sequencing rung (`kernel/prior-legs.ts`'s `verifyPriorLegs`) now
verifies every prior-leg reference by replay before a successor's record is created, landed
in the same commit as the lift (`1cd78b6`) — so the guard's own stated trigger has fired
for the ordering half. Per-leg `sod`/`proposer` remain GOVERNED at the first step-4
increment's own exit; the SoD gate that would read the recorded evidence is the second
step-4 increment's own work. **UPDATED, at the second step-4 increment: that gate landed too — see the next
boundary below.**
`construction-validation.test.ts`'s own "INVERTED, at the first step-4 increment" note,
beside its "legs.length > 1 is accepted at construction — the sequencing that orders them
is built" test, replaces the kernel increment's own GOVERNED-throw pin with the opposite
assertion — a third self-authored inversion by this build's own count, after the two
recorded at the third step-3 increment's exit above, argued in place per the same
discipline. The zero-legs structural message is reworded in the same commit, not
inverted: `config.ts`'s zero-leg throw now reads "at least one leg is required" rather than
"exactly one leg is required", because `legs.length>1` no longer throws and the old wording
implied a one-leg ceiling that was never structural, only GOVERNED — the structural check
itself (still refusing zero legs, now also refusing a duplicate leg id) is unchanged in
kind, only in wording.

**The second step-4 increment lifts the SoD guards, with two more self-authored
inversions.** Per-leg `sod` and `proposer` — SPEC §10.1's own two remaining controls —
were GOVERNED-throw-guarded from the kernel increment on (re-pinned on a multi-leg profile
by the first step-4 increment, since no multi-leg profile could construct before that
increment landed either); they lift together because `kernel/finalize.ts`'s new rung 3.5
now reads the sequencing half's own chained evidence — `priorRecordRefs`/`priorLegActors`
— and raises the sixteenth refusal code, `sod-violation`, on either a `notActorOf` match
or a `proposer` match, landing in the same commit as the lift (the guard lifts land WITH
the gate, in one commit — the same discipline the first step-4 increment's own
`legs.length>1` lift used).
`construction-validation.test.ts`'s own "INVERTED, at the second step-4 increment" notes,
beside its "a checker leg declaring sod.notActorOf naming the maker leg is accepted — the
gate is built" and "proposer on a multi-leg profile is accepted — any leg, including the
first" tests, replace the two GOVERNED-throw pins with the opposite assertions — a fourth
and fifth self-authored inversion by this build's own count, after the three recorded
above, argued in place per the same discipline. In their place, `validateSodShape`
(`config.ts`) adds this build's own fail-closed structural posture — the three rulings the
§10.1 row records above, none inherited, all argued where they land: a spec-silent point
in each case, so each is recorded as a permitted tightening rather than a divergence. The
construction-guarded count moves once more, in this same commit: nine down to seven — see
the second step-5 increment's own boundary below for the further move to six.

**The second step-5 increment lifts the `requiredConsultations` guard, with a sixth
self-authored inversion.** `requiredConsultations` — SPEC §11.1's required-consultation
gating — was GOVERNED-throw-guarded from the kernel increment on; it lifts because
`kernel/finalize.ts`'s new rung 5.5 now reads the declaration and raises two of the
union's refusal codes on it — `consultation-missing` (that code's second producer, after
rung (5)'s own facts check) and the seventeenth code, `consultation-failed` — plus the
eighteenth code and the union's first third-class member, `availability`, on a required
kind's reported-unreachable marker, carried by the `unavailable` outcome status alone and
never appended — landing in the same commit as the lift (the guard lifts land WITH the
gate, in one commit — the same discipline both step-4 increments used).
`construction-validation.test.ts`'s own "INVERTED, at the second step-5 increment" note,
beside its "requiredConsultations is accepted at construction — the gate is built" test,
replaces the GOVERNED-throw pin with the opposite assertion — a sixth self-authored
inversion by this build's own count, after the five recorded above, argued in place per
the same discipline. In its place, `validateRequiredConsultations` (`config.ts`) adds this
build's own fail-closed structural posture, the same settled class `validateSodShape`'s
three rulings already established: the declared list must be non-empty, pairwise
distinct, every kind a non-empty string, and never a reserved library-emitted kind — the
last is SPEC §11.1's own sentence, "declaring a reserved kind in `requiredConsultations`
is likewise a profile-construction error". The reserved set itself, formerly local to the
intake validator, moves to `config.ts` as an exported `RESERVED_CONSULTATION_KINDS` const
that `kernel/consultations.ts` now re-imports rather than duplicating — one definition,
upstream, both consumers (`kernel/consultations.ts` already imported its input types from
`config.ts`, so the reverse direction would have been a cycle). `freshness` and
`eligibility` do NOT lift alongside it, deliberately, at this point in the build:
`freshness`'s own gate is the spec's own named vacuity case at AL1 (§11.1: at AL1 the
library stamps every consultation's own `at`, so the bound could never fire — "a dead gate
wearing an assurance label") — vacuous only until AL2 authority timestamps exist; it lifts
at the AL2 freshness increment, the tenth self-authored inversion in this
document's own numbered sequence, the guard-lifting era's own exit (see below) — and
`eligibility`'s implicit-first required kind (§10.4) is step 6's own ground, not this
increment's. The construction-guarded count moves once more, in this same commit: seven
down to six — since moved again; see the first step-6 increment's paragraph below.

**The first step-6 increment lifts the `eligibility` guard, with a seventh
self-authored inversion.** `eligibility` — SPEC §10.4's declaring-leg authority-to-decide
check — was GOVERNED-throw-guarded from the kernel increment on; it lifts because
`kernel/finalize.ts`'s new rung 5.5 now prepends an implicit-first `'eligibility'` kind
ahead of the leg's own declared `requiredConsultations` and reads both in order; on a fail
verdict, a ternary assignment in the fail-arm (`requiredKind === 'eligibility' && leg.eligibility !== undefined ? 'ineligible' : 'consultation-failed'`) produces the trip mapping — refusing `ineligible` for the implicit kind under a declaring leg, `consultation-failed` otherwise — landing in the same commit as the
lift, so the guard's stated trigger has fired.
`construction-validation.test.ts`'s own "INVERTED, at the first step-6 increment" note,
beside its "eligibility is accepted at construction — the implicit-first arm is built" test,
replaces the kernel increment's GOVERNED-throw pin with the opposite assertion — a seventh
self-authored inversion by this build's own count, after the six recorded above, argued in
place per the same discipline. In its place, `validateEligibility` (`config.ts`) adds this
build's own fail-closed structural posture, the same settled class `validateSodShape` and
`validateRequiredConsultations` already established: an empty label is rejected as a
malformed reference (the gate keys on the DECLARATION'S PRESENCE, never the label itself),
and declaring `eligibility` while also listing it in the same leg's `requiredConsultations`
is SPEC §10.4's own construction error ("declare it once"). The construction-guarded count
moves once more, in this same commit: six down to five — since moved again; see the second
step-6 increment's paragraph below.

**The second step-6 increment lifts the `policySource` guard, with an EIGHTH
self-authored inversion.** `policySource` — SPEC §10.3's opaque per-profile policy-authority
label — was GOVERNED-throw-guarded from the kernel increment on; it lifts because all three
of its own seam obligations land in the same commit: `open()`'s binding contract binds the
operator-attested `policyDigest` into the genesis, present-iff-declared and fail-closed loud
both directions; `finalize()`'s presence contract requires (on a declaring profile) or
forbids (on a non-declaring one, unconditionally) `opts.policy` at profile-resolution depth;
and `finalize()`'s new rung (4.5) compares the live digest against the record's bound one,
raising the twentieth refusal code, `policy-drift`, on a mismatch — including both
cross-instance corners, with the reverse one answering §10.3's own named open decision
FAIL-CLOSE — and the `availability` outcome (its second producer) on a reported-unreachable
source, landing in the same commit as the lift (the guard lifts land WITH the gate, in one
commit — the same discipline every governed lift before it has used).
`construction-validation.test.ts`'s own "INVERTED, at the second step-6 increment" note,
beside its "policySource is accepted at construction — the notarization contract is built
end to end" test, replaces the kernel increment's GOVERNED-throw pin with the opposite
assertion — an EIGHTH self-authored inversion by this build's own count, after the seven
recorded above, argued in place per the same discipline. In its place, the structural
empty-`policySource`-label check (`config.ts`) adds this build's own fail-closed structural
posture, the same settled class `validateEligibility`'s own empty-label rule uses: an opaque
reference that references nothing is malformed config, never a value that could merely never
match. The construction-guarded count moves at last, in this same commit: five down to four
— since moved again; see the second step-7 increment's own paragraph below for the further
move to two.

**Deferral register row 11 retires with the second step-6 increment.** The row's own
trigger read: "The build step that ships policy notarization (SPEC §10.3): landing
`policySource` and the live-source comparison makes the two-directional throw reachable,
and must land it with a test in that same step." That is exactly what the second step-6
increment did — `open()`'s binding contract and `finalize()`'s presence contract are both the real
two-directional check §10.3 specifies now, not the governed-capability guard's coincidental
match the row's own text described, and `policy-drift.test.ts`'s "the presence contract:
declaring-without-policy THROWS at finalize; non-declaring-with-policy THROWS
unconditionally" test exercises exactly that contract, landed in the same commit as the
lift. This closes **deferral register row 11**, now retired and deleted per the register's
own preamble (a gap is an entry that has left; the number is not reused). This row's own
"Still outstanding" bullet below is removed with it, rather than left to restate a claim
the second step-6 increment has already overtaken.

**The second step-7 increment lifts the `ackMode`/`requiredAcks` guard, together.**
The pair — SPEC §10.2's findings-flow controls, declared both-or-neither — was
GOVERNED-throw-guarded individually from the kernel increment on (`validateLeg`'s two
separate throws, one per field); it lifts because the write half lands in the SAME
commit as the second step-7 increment's atomic landing (`970d837`): the two
operator-only seams (`kernel/findings-seams.ts`'s `raiseFinding`/`acknowledge`) and
`finalize()`'s new rung (5.7), which reads the pair's own declaration via the read
side's `findingCoverage` derivation and raises `ack-missing`/`ack-stale` on it — landing
together with the lift (the guard lifts land WITH the gate, in one commit — the same
discipline every governed lift before it has used). **This lift is recorded as a
different mechanic from the eight self-authored inversions above, not a ninth
instance of the same one**: `construction-validation.test.ts`'s own two individual
`GOVERNED: a leg declaring requiredAcks/ackMode throws` tests are DELETED outright
rather than inverted in place, replaced by a new `validateFindingsFlow` test section
(the pair's own both-or-neither rule and `requiredAcks`'s settled-class shape needed
more than one flipped assertion) — no `INVERTED, at the second step-7 increment` note
exists beside either deleted test, so this paragraph names the mechanic honestly rather
than folding it into the numbered-inversion count. In its place, `validateFindingsFlow`
(`config.ts`) adds this build's own fail-closed structural posture, the same settled
class `validateSodShape`'s/`validateRequiredConsultations`'s/`validateEligibility`'s:
both-or-neither (SPEC §10.2's own sentence, "either alone is a construction error"),
and `requiredAcks` non-empty, pairwise distinct, every kind a non-empty string —
deliberately WITHOUT a reserved-kind arm, because finding kinds are their own
namespace (SPEC §10.2: "the reserved consultation kinds do not apply to them"), so
`'facts'` is a LEGAL `requiredAcks` kind, pinned by test. The construction-guarded
count moves once more, in this same commit: four down to two — since moved again; see
the live-capture increment's own paragraph below for the further move to one.
The guard-sweep-total test (`construction-validation.test.ts`'s own "a profile
declaring TWO governed features still throws") swaps its second governed feature from
`ackMode` (now lifted) to `freshness`, pairing it with `captureMode:'live'` — the
sweep's own two-governed-feature shape at that point, since reshaped again to
`freshness` alone at the live-capture increment (see below).

**The live-capture increment lifts the `captureMode:'live'` guard, a NINTH
self-authored inversion.** `captureMode:'live'` — SPEC §9.2's live mode — was
GOVERNED-throw-guarded from the kernel increment on; it lifts because `validateLiveCapture`
(`config.ts`) now enforces the mode's own construction obligations — every leg of a live
profile must declare `requiredConsultations` (the decide-time independent re-derivation,
gated at finalize's ALREADY-BUILT rung 5.5, no new gate needed there) and the profile's
`redeem` block must declare `confirmToRedeem`, `reverify`, or both — landing in the SAME
commit as `kernel/redeem.ts`'s `refuseCorrespondenceMismatch`, which is the piece that was
actually missing: it reads `redeem.reverify` at all three redemption seams and maps a
CONTENT correspondence mismatch to `content-drift` (appended terminal, releasing the hold)
instead of `effect-mismatch` (never-append) — before this commit `reverify` was
structurally refused outright regardless of `captureMode` (the tail rule in
`validateProfile`'s own order), so a live profile could never construct at all.
`construction-validation.test.ts`'s own "INVERTED, at the live-capture increment" note,
beside its "`captureMode:'live'` is accepted at construction — the mode's own obligations
are gated" test, replaces the kernel increment's GOVERNED-throw pin with the opposite
assertion — a NINTH self-authored inversion by this build's own count, after the eight
recorded above (the second step-7 increment's `ackMode`/`requiredAcks` lift is NOT counted
in this sequence, per its own paragraph's ruling: a deletion-and-replacement, not an
inversion), argued in place per the same discipline. The construction-guarded count moves
once more, in this same commit: two down to one, where it stood at this increment's own
exit — the per-leg `freshness` alone (vacuous by construction at AL1 regardless, unchanged
since the second step-5 increment's own ruling at that point) — since lifted whole at the
AL2 freshness increment; see that paragraph below for the further move to zero. This is
also the mode's own marker move: SPEC §9.2's four
live-mode `[SKETCHED]` tokens (SPEC.md:488's inline bracket, SPEC.md:667's bold heading,
CONTROLS.md:40's prose, CONTROLS.md:45's cell) moved to `[PROVEN]`/`PROVEN`, in a separate
commit after the construction-and-mapping commit's gates were green, nothing else on
either line changing; OPEN-QUESTIONS.md §7 gained two "Decided (this build):" tails
recording the `reverify` argument-shape and staged-reference-contract decisions above; and
SPEC.md:488's own trailing clause — which named the `reverify` seam semantics as "among
that mode's open decisions" — was rewritten to point at OPEN-QUESTIONS.md §7's now-recorded
decisions instead, since that clause would otherwise be false the moment the decisions
landed. `docs/concept/` was un-sealed for exactly this commit and exactly these edits, per
the same standing ruling the step-7 marker move used, and re-armed immediately after.

**The AL2 freshness increment lifts the `freshness` guard, the TENTH
self-authored inversion — the guard era's own exit.** `freshness` — SPEC §11.1/§14's
per-leg consultation-freshness bound — was GOVERNED-throw-guarded from the kernel
increment on; it lifts because `kernel/finalize.ts`'s rung 5.5 gains a freshness arm in
the SAME commit, reading a passed required kind's `freshness` bound and refusing the
twenty-fourth code, `consultation-stale`, on a missing, future, or
out-of-bound `observedAt` claim (see the §8 and §11.1 rows for the gate itself).
`construction-validation.test.ts`'s own "INVERTED, at the AL2 freshness increment" note,
beside its own fully-loaded-profile test — every once-governed field declared, including
`freshness`, constructs cleanly — replaces the kernel increment's GOVERNED-throw pin with
the opposite assertion — the TENTH self-authored inversion by this build's own count, after
the nine recorded above (EIGHT of those nine argued in place at
`construction-validation.test.ts`'s own pin; the sequence's second entry, the replay-fold
inversion, argued at `replay-verify.test.ts`'s own pin instead), argued in place per the
same discipline. This same fully-loaded-profile test is also the guard-sweep-total test's
own terminal form: every earlier version of that test asserted a throw on whichever
governed remainder existed at the time, and this version asserts the opposite —
construction succeeds with nothing left to guard. In its place, `validateFreshness`
(`config.ts`) adds this build's own fail-closed structural posture: the AL2 dependency made
structural (a declaring leg's profile must set `signing: true` — meaningful freshness
gating needs a signature layer to make the recorded claim tamper-evident, §11.1's own
"meaningful only" sentence), every bounded key a member of the leg's own required set
(`requiredConsultations`, plus the implicit `'eligibility'` iff the leg declares it — the
⊆ rule, so no separate reserved-kind arm is needed, since a reserved kind can never be
required), and every bound a positive finite integer of seconds (the ttl convention).
**The construction-guarded count moves once more, in this same commit: one down to
ZERO.** This is the feature-guards-from-day-one era's own exit, stated as such: every
guard the kernel increment installed has now lifted behind its own behavior, each in the
same commit as that behavior — down through the nine self-authored inversions and the one
deletion-and-replacement (`ackMode`/`requiredAcks`) recorded above, to this tenth one —
the guard-lifting era's own last inversion, not this document's last inversion overall (an
eleventh, a different mechanic, follows below at the self-test-tier increment).
`governedUnavailable` (`config.ts`) SURVIVES this exit (and was later
renamed `unknownOptionKey`, its head reworded, at the registry-hygiene
increment, 2026-09-01): it is not itself a per-field guard, and it still
serves the two generic unknown-option-key throws
(`kernel/finalize.ts`'s `finalizeOptionMessage`, `kernel/open.ts`'s own), neither of which
names a single not-yet-enforceable field the way every guard this sequence swept did.

**The self-test-tier increment takes deferral register row 18, with an ELEVENTH
self-authored inversion — a different mechanic from the ten above, since nothing is
governed here.** `expiry.ttl` (when declared, i.e. `expiry !== 'none'`),
`redeem.confirmToRedeem`, and `redeem.redeemBound` were, until this increment, unvalidated
numeric fields: `create()` never checked any of the three, so a `NaN`/`Infinity` value
constructed cleanly and only crashed later — `jcs.ts`'s own non-finite-numbers-throw rule
at `profileDigest`'s canonicalization, or `kernel/expiry.ts`'s `resolveDueClock` calling
`toISOString()` on the resulting Invalid Date, whichever ran first for the profile in
question — and a negative or zero value constructed cleanly too and silently
PRE-ELAPSED the window it declares, never refusing at construction the way a `freshness`
bound already did. This was a RECORDED STANCE, not an oversight:
`construction-validation.test.ts:514`'s own comment, on the pin that accepted
`redeemBound` at construction (the third step-3 increment), stated outright —
"Bound-value validation deliberately mirrors expiry.ttl's treatment (no novel posture)" —
that `redeemBound` was deliberately left exactly as unvalidated as `expiry.ttl` already
was. The trigger that inverts it: `validateFreshness` (above, the TENTH inversion) ended
the "no numeric field in this build gets a positive-finite-integer runtime check"
symmetry `:514`'s own reasoning leaned on — `freshness` bounds ARE validated that way now
— leaving these three fields as the sole remaining unvalidated numeric class, deferral
register row 18's own trigger. `validateBounds` (`config.ts`) closes it: the SAME settled
fail-closed class `validateFreshness` already uses (a positive finite integer of seconds,
the ttl convention), applied to all three fields, RED-first (NaN/Infinity/negative/
zero/fractional per field pinned failing against the pre-increment build before the guard
existed). `construction-validation.test.ts:514`'s own comment is amended IN PLACE, not
rewritten — the original sentence stays, and an "INVERTED, at the self-test-tier
increment" note is appended beside it naming the trigger and the count: the ELEVENTH
self-authored inversion in this document's own numbered sequence, per the same discipline
every inversion above follows (argued in place, beside the prior pin, never a silent
rewrite). **Unlike the ten above, this is not a guard lift**: the construction-guarded
count stayed at ZERO throughout — `expiry.ttl`/`confirmToRedeem`/`redeemBound` were never
GOVERNED, only silently unvalidated, so there was no guard here to lift, the same
"different mechanic" reasoning the second step-7 increment's `ackMode`/`requiredAcks`
deletion-and-replacement used above for the same reason. What makes it a genuine inversion
rather than a fresh addition is that it overturns a stance a prior increment deliberately
took and pinned by test, not a gap nobody had opined on. This closes **deferral register
row 18**, now retired and deleted per the register's own preamble (a gap is an entry that
has left; the number is not reused) — its own trigger, "the self-test-tier increment…or
the pre-0.1 cut — whichever lands first", has fired. **Deferral register row 17 retires
in the same increment, a separate task inside it**: `src/probes/` — the runner, the typed
driver interface, and the seventeen probes authored against `docs/concept/CONTROLS.md`
§4's own target list — is step 8's fourth and last tail item, closing the row's own
trigger, "the self-test tier (`OPEN-QUESTIONS.md` §5) — its own future brainstorm, the
sole remaining step-8 tail item" (see the CONTROLS §4 row above for the tier's own full
account). Both retirements land in the SAME increment as the sealed edit that moves
CONTROLS §4's own four maturity cells `[SKETCHED]` → `[PROVEN]` and records
`OPEN-QUESTIONS.md` §5's Decided tail — the concept set's own last `[SKETCHED]`-to-
`[PROVEN]` move this build order makes, per the sealed-edit ruling every prior marker
move in this document has used: `docs/concept/` un-sealed for exactly that one commit and
exactly those tokens, re-armed immediately after. **The full `docs/concept/` history,
verified against `git log --oneline -- docs/concept/` rather than assumed: THIRTEEN commits
touch it, not six.** Six are marker moves (`3f8051e`, `bb30e2e`, `4f93e8b`, `3aea0af`,
`a55d3b1`, this row's own `07dd900`), each moving tokens/tails for a behavior that had just
landed. Five more are SANCTIONED CORRECTIVE commits, each its own deliberate,
controller-ruled un-seal, not a marker move itself: `0300feb` (a
prose-restoration fix, repairing a parenthetical `bb30e2e`'s own marker swap had
accidentally deleted), `12ca3aa` (a backtick-convention fix, retroactively applying the
section's own code-identifier convention to prose `4f93e8b` had added), and `8def41b` (an
accuracy correction under what its own commit message calls "the extended sanction" —
"every accuracy claim ends true" — fixing a stale contradiction a later review found), the 2026-08-19
corrective pass — the first after the build order's completion — landing five owner-ruled
corrections under the sanction recorded in `docs/analysis/2026-08-19-sealed-set-sanction.md`,
and the 2026-08-20 corrective pass — four stale narrative descriptors (AL2 "sketched" in
ASSURANCE §6 and SCOPING-GUIDE §5, "steps 7–8 the designed/sketched continuation" in
SCOPING-GUIDE §7, the ack-coverage rung's "; designed" tag in ARCHITECTURE) aligned with
markers their own per-increment sanctions had already moved, under the sanction recorded in
`docs/analysis/2026-08-20-sealed-set-sanction-2.md`.
The seal re-arms after EVERY sanctioned edit, marker move or corrective alike — it has never
been edited outside a sanction since the convention began. The remaining two — `c26c179`,
`a4acfae`, both 2026-08-02 — PREDATE the convention entirely, before the set was sealed.

**The Consultation shape extension is admitted, not a divergence.** `types.ts`'s
`Consultation` gains `observedAt?: string`, present-iff-supplied, in this same increment.
SPEC §2's own Consultation table lists the AL1 shape only; the field lands instead under
§14's own admission sentence — "AL2 admits authority timestamps inside digested payloads
for required consultations" — and §11.1's own echo of it, "authority timestamps carried
inside the digested payload (§14)". Recorded here beside the `status`-field divergence
entry above (the §2 row) for the same reason, but on the opposite side of the ledger: that
entry is a field this build carries that §2's own table does not list AND that no other
section of the spec anticipates; this one is a field §2's own table does not list but that
two OTHER sections of the same spec name in advance. An anticipated extension is not a
divergence. **One further breadth is recorded here, found at this same review**:
SPEC:1312's own admission sentence — "AL2 admits authority timestamps inside digested
payloads for required consultations" — names required consultations, but `finalize()`'s
presence contract (above) admits a present `observedAt` on ANY obtained consultation of
a signing profile, required or not — it keys on `resolved.profile.signing`, never on
whether the carrying kind is in the leg's own effective required set. This build's
reading: a non-required consultation's `observedAt` is recorded-as-supplied evidence,
the same posture §11.1 already gives every other field on a non-required consultation
("recorded as supplied — including a `fail` verdict — as evidence, never a gate," the
§11.1 row's own sentence) — never gated, since only a required kind's `observedAt`
ever reaches the freshness arm at all. A wider admission than the letter of SPEC:1312
names, defended by a sentence the spec already states elsewhere, not a divergence from
either.

**The marker moves, EXECUTED at `3f8051e`.** SPEC §10.2's own `[DESIGNED]` token, plus
the eight other `[DESIGNED]`/`DESIGNED` tokens SPEC §10.2 carries across the two sealed-set
files, all move to `[PROVEN]`/`PROVEN` in that commit — the first draft-ahead marker to
move in this repository, satisfying SCOPING-GUIDE §7's own "spec-moves-to-truth" exit step,
vacuous at every step before this one (see this document's own opening paragraphs). Nine
lines change, nothing else: eight in SPEC.md — line 127 (§2's profile-conditional
`findings`/`acks` listing), 324 (§4's transition-table row), 522 (§8's conditional-table
row, plain brackets not bold), 550 (§9's operator-only parenthetical), 573 (§9's
review-projection sentence), 591 (§9's ladder rung (5.7)), 638 (the profile-field table's
`ackMode`/`requiredAcks` row), and 745 (the §10.2 heading) — plus CONTROLS.md:44's
findings-flow row, whose maturity cell is the bare word `DESIGNED` → `PROVEN` (no brackets
there; downstream of SPEC and moved with it, since a `DESIGNED` control row against a
`[PROVEN]` SPEC heading would itself be exactly the conflict the document set's own rule
resolves in the downstream document). The standing never-edit rule on `docs/concept/` was
LIFTED for exactly this commit and exactly these nine tokens, per the step-7 brainstorm's
own ruling, and re-armed immediately after — `docs/concept/` is SEALED AGAIN as of this
commit. `git diff 3f8051e~1 3f8051e` touches only these two files, nine lines, each
differing only in the token itself (the surrounding bolding — `**[DESIGNED]**` at
127/324/550/573/591/638/745, plain `[DESIGNED]` at 522, bare `DESIGNED` in CONTROLS.md's
table cell — is preserved around the swap), verified byte-wise.

**One authorized comment edit inside the frozen store, ruled at the second step-7
increment.**
`store/semantics.ts`'s doc comment describing `finding-raised`/`acknowledged` as
state-preserving (lines 48-49) is rewritten, in the same atomic commit as the seams and
the gate, from "GOVERNED annotations SPEC §10.2 defines, not emitted by this build's
kernel" to name the seams that now mint them — a comment-only edit inside the store
surface the second step-7 increment otherwise holds frozen (`byte-stability.test.ts`,
`chain/encoding.ts`, and `src/store/` itself untouched — no store change is needed or
permitted by that increment, since the store already maps both kinds state-preserving).
The freeze protects bytes and semantics, never a comment's own truthfulness: a comment
that had gone stale against real behavior — the two kinds ARE minted now — is exactly the
thing the freeze was never meant to hold in place, and the ruling authorizing this one
edit is recorded in the SDD ledger for the second step-7 increment.

**A false claim in `11f6527`'s commit body needs correcting here, because the commit itself
can't be.** That commit's body says shipping `seal()` "is what makes that function's
no-candidate fallback reachable for the first time — before the C4 bar existed, nothing
stopped an append against an already-sealed record, so a tampered chain over one could not
arise as a scenario," speaking of `kernel/finalize.ts`'s `appendChainCompromise`. **This is
false.** That fallback — the result-first `chain-compromise` refusal with no `transitionRef` —
was already reachable before this branch existed, against a terminal `expired`/`refused`
record under §12's C3 carve-out, with no `sealed` transition or C4 involved at all:
`packages/record/test/chain-verify.test.ts:292` ("a tampered chain on an ALREADY-EXPIRED
record: NO candidate CAS target is admitted — chain-compromise with NO append, NO
transitionRef (C3-forced corner)") has pinned exactly that scenario since `7547b12`, part of
build-order step 1's own test corpus. What C4 actually added is a *second* route into the same
fallback — a sealed record is now also a no-candidate case — not the first one. The claim
traces to the second step-2 increment's own plan, `docs/superpowers/plans/2026-08-05-chain-retirement.md`,
whose Step 5 directed the implementer to "add one line to its doc comment saying `seal()` is now
a second caller and that C4 makes its no-candidate fallback reachable where it previously could
not fire" — quoted as that line then read, because this branch's final fix round corrected it in
place, it being the tracked sentence the false doc comment came from. From there the claim was
carried into `kernel/finalize.ts`'s `appendChainCompromise` doc comment itself (the same file
the commit body describes) — reworded
once in `b779517` (to the weaker, still partly false claim that `seal()`'s own tamper test was
"the first fixture in this corpus" to construct the fallback) and the surviving sentence deleted
outright in `8a64b0d`; that doc comment now carries neither claim. The commit body can't be
corrected without rewriting history, so this paragraph is the correction, recorded where a
reader auditing the commit will find it.

**The finalize success batch is one atomic `appendBatch` call.** §9's ladder rung (6) is
"one atomic, variable-arity" `appendBatch`, "all-or-nothing, so a conflict never leaves a
partial tail"; this build's rung (6) now IS that call — `[chain-verify, facts, confirmed]`
sent under one entry compare-and-swap rather than as three ordinary sequential appends,
which is what **deferral register row 12** (now retired) named as its own trigger. That
row's trigger read: "Build step 2, when `appendBatch` lands: the batch becomes
all-or-nothing and the mid-batch throw loses its only producer." The first half held; the
second did not. A `seq` conflict is still producible — another writer can move the store's
`max` between finalize's chain load and its batch send — so the throw survives, in
simplified form: only the `seq` shape still reaches `batchConflict` (`kernel/finalize.ts`;
superseded 2026-09-02 by `batchSeqConflict`, which tells a concurrent writer from a storage
fault — the code-review-fixes section below) and throws a storage fault naming the shape and
index, with nothing recorded; an entry
`state-mismatch` now refuses `record-not-open` instead, true of the record's state AND its
never-appends registry entry both, for the first time at this seam, because the batch is
all-or-nothing and applies nothing under either conflict shape. The asymmetry the retired
row recorded — the first append's refusal against the later two appends' throw — is
retired with it: there is no longer a "later append" for anything to be.

**`unknown-leg`: the divergence is closed.** SPEC §8 names two producers of this code —
"a caller-named leg absent from the profile at `stage()`, and a staged draft's leg absent
from the profile it resolves under at `open()`". At the point this step's remediation plan
was written, only the first was wired. The gap was never a deliberate difference from the
spec: it was inherited, and it was a difference from the **reference implementation** this
kernel was adopted from — that project's later history carried `open()`'s re-check and the
commit this kernel was taken from did not, so the second producer arrived unwired. It is
INHERIT item 5 in `docs/process/adopted-source-provenance.md`, applied at `8c78083`. Both
producers are built and tested today (`packages/record/test/unknown-ids.test.ts`), with
`unknown-profile` still winning where both are wrong. What remains from the same family is
about a different thing: `kernel/stage.ts` is the one source file taken from the reference
project's later head rather than from the commit the rest came from — a deliberate
divergence, recorded as such in the provenance document.

**Two inherited pinned assertions were inverted, both authorized.** This kernel arrived
with the reference implementation's own test corpus, and adopting a corpus and then
quietly changing what it pins is how a build drifts from the thing it adopted while its
suite stays green. So an **inversion** — overturning an assertion the inherited corpus
pinned, replacing a passing test's expectation with the opposite one — is authorized
explicitly and argued at the test itself, never folded in silently. This branch authorized
exactly two, both recorded in place in `packages/record/test/terminality.test.ts`:

1. **`redeem()` on a confirmed effect-seam record.** The inherited assertion pinned a
   silent `unredeemable-state` refusal. It then threw a build-capability error at the
   seam instead. This was **loudness, not closure**: the throw released nothing, and the
   `(profile, subject)` pair stayed held exactly as it did under the refusal, because the
   hold lived in the store's C1 exclusivity rather than in what `redeem()` returned.
   **UPDATED, at the first step-3 increment:** the throw is gone. SPEC §11.2's direct
   redemption shape now ships, so `redeem()` on a confirmed effect-seam record performs
   the ladder instead of throwing — chain-verify, the state and correspondence gates,
   then the atomic `confirmed → redeemed { via: 'direct' }` append — which DOES release
   the pair (register row 9, retired by that same landing). This is the second move on
   the same inherited assertion, not a third inversion: `packages/record/test/terminality.test.ts`'s
   own "INVERTED BACK, at the first step-3 increment" note, appended in place beside the
   original argument rather than replacing it, is what this entry mirrors, per the same
   discipline (argued in place, never silent).
2. **A mid-batch conflict in finalize's success batch.** The inherited assertion pinned
   `record-not-open` returned after a conflict on the `confirmed` append — a never-appends
   code carrying no `transitionRef`, which tells a host that the call recorded nothing
   while two of its consultations sit on the chain. At this build step's own exit it threw
   instead, naming the conflict shape and what the call appended, with nothing rolled back
   (no rollback existed) and a retry appending its own consultation pair on top of what had
   already landed. **UPDATED, at the first step-2 increment:** the three-append sequence that description
   depends on is gone — rung (6) is now one atomic `appendBatch` call (deferral register row
   12, now retired) — so there is no longer a scenario where something already landed for a
   retry to append on top of. The throw-not-refuse mapping this inversion argued for is
   still in force, reached differently: a `seq` conflict throws and a `state-mismatch`
   refuses `record-not-open`, full stop, because nothing is ever partially applied for
   either shape to misrepresent. `packages/record/test/terminality.test.ts`'s own inversion
   note is appended in place to say the same thing, rather than rewritten, and this entry
   follows the same discipline.

**Deferral register row 9's most-corrected claim is now a passing test.** The row already
states, after two prior corrections, that `seal()` is not a release path for a confirmed
effect-seam record's held `(profile, subject)` pair — held, that is, until the redemption
edge released it (the first step-3 increment; row 9 itself is retired by that same
landing) — SPEC §12 admits `seal()` only against a derived-terminal record, and SPEC §2
makes a final-leg `confirmed` on an effect-seam profile non-terminal. What changed is that
a release path now exists elsewhere, not that `seal()` became one.
`packages/record/test/seal.test.ts`'s "seal() on an
EFFECT-SEAM confirmed record -> unsealable-state (it is non-terminal, awaiting redemption)"
now proves it by execution, not only by argument: that test pins the refusal and its code,
`unsealable-state`, and `kernel/seal.ts` returns it at the terminality gate, ahead of the
`sealed` append — so the hold, which lives in the store's C1 exclusivity rather than in
what any call returns or throws, is untouched.

**Row 9 did need one edit, and it is not the claim above.** The row carried a second
sentence — a statement of fact about the shipped code, that there was "no `seal()` on the
operator surface and no `unsealable-state` in the shipped `RefusalCode` union" — which was
true when it was written and false the moment the second step-2 increment shipped both
(`packages/record/src/operator-surface.ts`, `packages/record/src/refusal-codes.ts`). The
release-path claim was the part that was merely argued and is now pinned; the currentness
claim beside it was the part that went stale, and it is rewritten in place. An earlier version
of this paragraph concluded that the row needed no edit at all, having checked only the first
of the two. `packages/record/test/terminality.test.ts` carried the same stale sentence and is
corrected with it.

### The package is unconsumable today

Stated plainly, in the same breath as the green gates, because that is what an exit record
is for: **there is no artifact here a host could install or import.**

`packages/record/package.json` carries exactly five fields — `name`, `version` (`0.0.0`),
`private: true`, `type: module`, and `description`. There is no `exports`, no `main`, no
`types`, no `files`, no `scripts`, and no dependency of any kind. `private: true` blocks
publication; with no entry-point field, nothing tells a resolver what to load even if it
were published. And nothing is compiled: the repository's only TypeScript invocation is
`tsc -p packages/record --noEmit`, and `noEmit` is set in `tsconfig.base.json` itself, so
no JavaScript artifact is produced anywhere by any script here.

What runs today is the TypeScript source, inside this workspace, under this repository's
own test runner. That is enough to prove the kernel's behavior and not enough for anyone
else to use it. Publish tooling is **deferral register row 1**, triggered by the first
external consumer or the 0.1 cut; the pre-0.1 API naming review over what `index.ts`
exports is row 6, triggered at the 0.1 cut.

**Updated 2026-08-19 (the phase-2 packaging increment):** the paragraphs above record the
five-field era and stay as the exit record; against the current tree they are superseded.
The manifest now carries the full publish shape — `exports` (`.` and the decided
`./probes`), `types`, `files`, `sideEffects`, `license`, `author`, `repository`, `engines`,
and a `build` script — `pnpm build` emits `dist/` (tsc, `tsconfig.build.json`), and
`pnpm smoke` (`scripts/smoke-pack.mjs`) packs the tarball and installs it into a scratch
consumer project on every CI run, driving a confirm loop through both entry points and
both audit-function forms. What remains is the release itself, **by design**:
`private: true` stays as the one deliberate publish block until the 0.1 cut
(`docs/analysis/2026-08-19-phase-0-decisions.md`), `version` stays `0.0.0` until then, and
the dispatch-only, provenance-attested release workflow
(`.github/workflows/release.yml`, guarded against publishing the pre-release shape) is
authored but unexercised until that day. Row 1 stays open until the publish it exists for
has actually run once. The full account: `docs/analysis/2026-08-19-phase-2-packaging.md`.

### Still outstanding

Carried in the deferral register, with triggers:

- **Row 1** — publish tooling (build, versioning, release).
- **Row 4** — RETIRED 2026-08-19 (the phase-4 store-postgres increment): the trigger —
  "Second workspace package lands" — fired deliberately when `packages/store-postgres`
  landed; the same commit generalized root `typecheck` and `build` across both packages,
  declared `vitest` per-package, and restructured the vitest config into per-package
  projects. Kept here as the record; the register carries the numbering gap.
- **Row 5** — RETIRED 2026-08-19 (the phase-3 CI increment): the trigger — "the next
  commit that edits `biome.json` for any reason" — was fired deliberately rather than
  tripped: `biome migrate --write` produced exactly the one hunk the row's own dry-run
  predicted (`"recommended": true` → `"preset": "recommended"`), the `$schema` field was
  added by hand as the row noted migrate would not, and the deprecation notice left
  `pnpm lint`'s output (14 infos → 13). Kept here as the record; the register carries the
  numbering gap.
- **Row 6** — RETIRED 2026-08-19: the pre-0.1 API review completed over the whole surface
  (`docs/analysis/2026-08-19-phase-1-api-review.md`) — every prior name ratified, the
  no-unspellable-names export rule applied, the signing tier moved onto the root, the pure
  audit functions exported, `Surfaces` named, and the `terminalRefusals` footgun closed at
  construction. Kept here as the record; the register carries the numbering gap.
- **Row 15** — RETIRED 2026-08-19 (the phase-4 store-postgres increment): the server-SQL
  backing landed whole as `@vidimera/store-postgres` (`PostgresStore` over a caller-owned
  `pg.Pool`, FOR-UPDATE row locks and a genesis advisory lock making the CAS and C1
  race-free under real concurrency), meeting the row's own three-part shape exactly — the
  conformance suite wired by one caller file (all 50 tests, unchanged), the third
  cross-backing byte-identity leg (Memory ↔ Postgres, transitively identical with
  Sqlite), and five real multi-connection contention scenarios neither prior backing
  could express. The test server is an embedded Postgres the suite's own globalSetup
  starts per run — the zero-skips collision the row worried about dissolved rather than
  waived. `docs/analysis/2026-08-19-phase-4-store-postgres.md` carries the account.
- **Row 16** — RETIRED 2026-08-19 (the phase-4 store-postgres increment): both token seams
  gained the additive trailing `tx?`, threaded through the already-tx-aware prologue and
  each seam's single append. This inverted the seams' own recorded "NO tx, deliberately"
  doc comments — the **TWELFTH** entry of this document's numbered self-authored-inversion
  sequence, argued in place at `kernel/redeem.ts` (an enlisted issuance commits or rolls
  back with the host's own outbox row, so a rollback declines the issuance whole, never a
  strand; §11.2's "no transaction is shared" defines the executor relationship, not the
  issuance's persistence) and pinned by four new enlisted-token tests in
  `redeem-token.test.ts`. **Shape update, 2026-08-21 (the effect-result increment's Task
  1):** that trailing `tx?` — on all three redemption seams, not only the two token
  halves — moved into `RedeemOptions.tx`, one options bag shared by `redeem`,
  `beginRedemption`, and `completeRedemption`; behavior-preserving, gated by the existing
  suite, no new deferral. This is a shape correction to the already-retired row, not a
  reopening.
- **Row 19** — the AL2 detached-signature sidecar pinning deferral, added by the
  byte-regression-pins increment: `transitionDigest`'s input is
  `{recordId, seq, at, kind, payload, prevHash}` — no signature field — so no chain pin
  anywhere in this repository reaches an AL2 detached-signature sidecar. Trigger
  (verbatim): "The first increment that changes signature encoding or key handling, or
  the 0.1 cut — whichever lands first".
- **Row 20** — RETIRED 2026-08-23 (the AL2 signature-enforcement coverage increment):
  `kernel/decline.ts`'s rung (1) — its pre-seam chain-verify plus the AL2 signature-layer
  check, and the `chain-compromise` append it guards — was unexecuted by the entire test
  corpus, proved by deleting the rung wholesale and observing the full suite still pass. The
  Finding E adjudication increment closed the hash-broken disjunct (`!report.intact`); this
  increment closed the AL2 signature-broken disjunct
  (`!(await signatureLayerHolds(...))`) with two shape-asserted pins in
  `signing-enforce.test.ts` — the declaring leg, and the non-declaring corner where rung (1)
  refuses before the declaration gate can throw — each carrying a verifier-call DELTA above
  zero, the only mechanical proof that the signature disjunct ran rather than the hash one,
  since the condition short-circuits on `||`. The row's other half, the missing
  rung-(1)-beats-rung-(2) adjacent pair, landed in `decline.test.ts`'s ladder-order test.
  The row's THIRD trigger text is the one that fired, and it fired as a prompting event
  rather than tautologically. The trigger named extending
  `packages/record/test/helpers/signing.ts`'s shared `signingSetup` to expose the sidecar;
  what this increment did was deliver that CAPABILITY without that EDIT — `signingSetup`
  itself was left byte-identical by ruling, and the sidecar-exposing rig landed as a sibling
  export beside it. The prompting work the trigger describes is what occurred, and the file
  it names did move; the function it names did not. Full account:
  `docs/analysis/2026-08-23-signature-enforcement-coverage.md`
  (Findings A and B), and the increment section at the end of this document. Kept here as
  the record; the register carries the numbering gap.
- **Row 21** — RETIRED 2026-08-23 (the AL2 signature-enforcement coverage increment): the
  three AL2 call paths exercised only over a hash-broken chain (`acknowledge`'s shared
  prologue, `beginRedemption`, `completeRedemption`) gained signature-broken pins — five
  cells rather than three, since both token seams double on enlistment — and the five
  refusal-code-only sites were deepened in place to state what the seam did with the
  evidence edge: `seal`, `raiseFinding` and un-enlisted `redeem` now assert the append,
  while the two that append NOTHING ANYWHERE (`verifyPriorLegs`, `verifySupersedes`) now
  assert exactly that, including that the prior leg or predecessor whose chain was just
  found broken is itself left unmarked — a fact no test in this package previously stated.
  Full account: `docs/analysis/2026-08-23-signature-enforcement-coverage.md` (Findings C
  and D), and the increment section at the end of this document. Kept here as the record;
  the register carries the numbering gap.
- **Row 22** — RETIRED 2026-11-19 (the transactional-sidecar increment, on call 2 of
  `docs/analysis/2026-11-17-sanction-calls.md`): each reference store — `MemoryStore`,
  `SqliteStore`, `PostgresStore` — exposes its own sidecar as `signatures`, and a signing
  instance configured with that very object runs INTEGRATED: the decorator still mints and
  checks before the append, then hands the entries down on it, and the store writes them inside
  the append's own atomic unit, after every check, only when it applies — through a host's
  transaction when enlisted. Measured on all three backings with the row's own rig (a sealed
  signing record, its genesis entry broken, a one-second ticking clock, six refusing
  `finalize()` calls): integrated, chain 5 and sidecar 5 after every call, one mint per call,
  zero orphans; the same rig with a separate `MemorySignatureStore`, sidecar 6, 7, 8, 9, 10, 11
  — six orphans. Pinned on each backing: that measurement, `open()`'s moving-clock retry, and a
  `record-contended` lost batch leaving no orphan; and on SQLite and Postgres an enlisted
  redemption rolled back leaving none. The trigger's first disjunct fired as a prompting event —
  the increment adds durable `SignatureStore` backings beyond `MemorySignatureStore` — and the
  behavior landed with it; the third horn was NOT taken, and both divergence pins in
  `no-edge-containment.test.ts` stand unchanged. The SEPARATE-MODE RESIDUAL, stated: a sidecar
  that is not the store's own keeps the write-first order — one orphan per refusing call, a
  spliceable signature over every append that does not commit — and that file's baselines keep
  measuring it; an existing deployment switching to the store's own sidecar must copy its
  entries across with `put` first (the library does not migrate); a store wrapper must expose
  the inner store's `signatures` and forward `meta` intact, or it runs separate. The account as
  it stood until then follows, kept as the record; the register carries the numbering gap.
  It was the surviving half, 22a,
  of a row added by the AL2 signature-enforcement coverage increment (which found it while
  closing rows 20 and 21 and recorded it rather than fixing it), restated 2026-08-28 by the
  row-22 truth-repairs increment, and re-scoped 2026-08-29 by the no-edge containment
  increment. `appendChainCompromise` (`kernel/finalize.ts`) rebuilds its `refused`
  transition on every call, stamping `at` from the clock; the signing decorator signs BEFORE
  delegating to the store, and `MemorySignatureStore.put` is keyed by `transitionDigest`, so
  a fresh timestamp is a new key rather than an upsert. On a record whose persisted state
  admits no CAS candidate the append never lands and the sidecar keeps the entry anyway —
  one orphan per refusing call. The row's other half, 22b (redundant signer invocations, one
  mint per CAS candidate over byte-identical bytes), CLOSED on behavior at the no-edge
  containment increment: commit `3542668`'s signer-result memo keyed by transition OBJECT
  identity mints once per transition and still writes the put before every attempt, and
  commit `9111035` drops the one candidate C3 can never admit — three attempts rather than
  four on a terminal-folded record. Neither touches 22a, and
  `packages/record/test/no-edge-containment.test.ts` asserts the sidecar still grows by one
  per refusing call after both. Measured: six consecutive refusing `finalize()` calls
  against a sealed signing record took the sidecar from 5 entries to 11 under a real clock
  (6, 7, 8, 9, 10, 11), chain flat at 5; under a fixed instant, 6 flat; on the tree as it
  stands the pin holds under a ticking clock. Reached in ordinary operation, not only under
  attack: an ordinary key retirement — dropping a decommissioned `keyRef` from the verifier
  registry — puts a healthy, untampered, sealed signing record into permanent minting,
  sidecar 6 to 13 over eight calls with the chain flat at 5; and on an unsealed record the
  first call lands the edge, after which every later call takes the no-edge path. Not a
  soundness defect, stated precisely: both AL2 kernel readers walk the CHAIN and look each
  transition's digest up in the sidecar, so an orphan never produces a verdict — but it IS
  visited, `layerVerdicts` materializing every sidecar row on every verification (twenty
  refusing calls fetched 5 to 24 rows, 290 cumulative against 100 for a non-accumulating
  sidecar). Why 22a stays open — the third horn: every measured containment for orphan
  accumulation predicts C3 and C4 from the READ chain, which on this path failed
  verification by construction, while both are decided against the backing's own persisted
  row; a chain-local admissibility precheck was measured to suppress a compromise evidence
  edge that lands today, and the two divergence shapes are permanent must-not-change pins in
  `no-edge-containment.test.ts` (a head-kind rewrite to `refused` folds terminal yet lands
  through C3's carve-out; to `sealed` folds `open` yet lands because C4 reads the persisted
  flag). Taking that horn narrows SPEC §5's admission rule and needs a fresh sanction with a
  stated trade. Also rejected, measured: a digest-keyed de-dup (lands unsigned transitions)
  and compensating removal after a failed CAS (stripped signatures from 88 of 100
  concurrently-confirmed records against 0 of 400 for the shipped ordering). The hazard the
  ordering pin protects, stated as a hazard rather than as one mechanism: any change that
  makes a sidecar entry's survival conditional on the append's outcome. What stands
  meanwhile is delegation, not prevention — the `SignatureStore` contract states that a
  conforming sidecar holds orphans and that a bounded backing reconciles against the chain
  (the sidecar-contract increment). Behavior on a durable `SignatureStore` backing is
  UNMEASURED — a coverage bound, not a mitigation, since `MemorySignatureStore` is the only
  implementation in the tree. Full account:
  `docs/analysis/2026-08-24-no-edge-containment-investigation.md`; the finding's original
  record is `docs/analysis/2026-08-23-signature-enforcement-coverage.md` (Finding F).
  Trigger, re-derived for 22a (verbatim): "The first increment that adds a durable
  `SignatureStore` backing beyond `MemorySignatureStore` — the only implementation in the
  tree, and the reason unbounded growth is unmeasured here; or that lifts `private: true`
  and publishes the package, since a host's durable backing arrives through the documented
  `signatures:` hook in the operator's own deployment, where no in-repo event fires; or that
  seeks a sanction through `docs/concept/SCOPING-GUIDE.md` §§1–2 to decide C3 and C4 from
  the read chain, the third horn; or the 0.1 cut — whichever lands first."
- **Row 23** — opened 2026-09-02 by the code-review-fixes increment: an optional
  caller-transaction handle on the `Store`'s five reads, so an enlisted seam on `PostgresStore`
  can read inside the host's transaction rather than committed state through the pool (today
  a host cannot chain two enlisted seam calls on one record in one transaction — the second
  call's chain read is stale and its compare-and-swap refuses). Deferred as its own increment;
  a `COLLATE "C"` hardening on the text `due_at` comparison rides with it. Trigger (verbatim):
  "The first host that needs two enlisted seam calls on one record inside one transaction; or
  the first increment that changes any `Store` read signature; or the 1.0 freeze of the `Store`
  contract (`docs/concept/OPEN-QUESTIONS.md` §9's gate) — whichever lands first. Does not gate
  the 0.1 cut."
- **Row 24** — opened 2026-09-03 by the CI test-gate follow-ups: the `embedded-postgres`
  exit-hook workaround in the adapter's vitest global setup (`loadEmbeddedPostgres` imports the
  library dynamically and removes exactly the `beforeExit` listener the import adds, because
  `async-exit-hook` exits 0 from that listener over vitest's exit code). Test infrastructure
  only; no published package carries it. Trigger (verbatim): "The hazard pin failing — the
  library, or its exit hook, no longer exits 0 over the process's exit code — or the library
  being replaced; either removes the workaround and both pins together. Does not gate the 0.1
  cut." Noise note added 2026-09-05, recorded in the row: the workaround exposes the library's
  `exit`-event path, which runs the hook with no callback and, after a clean teardown, throws
  `TypeError: done is not a function` as a stack trace after vitest's summary; measured through
  the real `loadEmbeddedPostgres` in a child process, exit code 1 survives as 1 and 0 as 0, so
  the trace is noise and not a gate concern. Two further pins in
  `global-setup-exit-hooks.test.ts` hold the exit code and the trace's presence; the suite count
  moved from 905 to 907 with them. The trigger is unchanged.

Rows 17 and 18 both retired at the self-test-tier increment — step 8's own fourth and
last tail item landed (see the CONTROLS §4 row and the boundary above for the full
account, including the ELEVENTH self-authored inversion row 18 carries), so neither is
listed here any longer. **The build order is complete: no row above carries any of the
eight build-order steps as unfinished work** — of the four surviving rows, row 1 (publish
tooling) is a hygiene gate that outlives the build order by design, held open until the
release workflow it authored is exercised once at the 0.1 cut; row 19 (the AL2
detached-signature sidecar pinning deferral) is a scope gate opened by a later,
post-build-order increment, held open until a signature-encoding or key-handling change
lands, or the 0.1 cut, whichever comes first; and rows 23 and 24, opened later still, do not
gate the cut. Row 22 (orphan sidecar growth on the no-edge refusal path, restated 2026-08-28
and re-scoped 2026-08-29 to its orphan half, then held open as a sanction gate on the third
horn) retired 2026-11-19 at the transactional-sidecar increment, on behavior that took no horn
at all — its account kept above. Rows 20 and 21 — the two
coverage gates a documentation-only findings record opened over this same surface — retired
at the AL2 signature-enforcement coverage increment, their accounts kept above.

Raised by this step's own review and planning documents and **not in the deferral register** —
recorded here so the step does not exit with them unstated, and left as their sources state
them rather than adjudicated again:

- `redeem()`'s stub returns `unredeemable-state` on three paths §8 scopes elsewhere: an
  unconfigured profile, a tampered chain (it never verifies), and a non-existent
  `recordId` (which §8 makes a throw). Every one of those paths appends nothing, so each
  stays fail-closed; only the reported code is wrong. **RESOLVED at the first step-3
  increment**: the direct-shape ladder throws on a non-existent `recordId`, fails closed
  to `unknown-profile` on an unconfigured one, and verifies the chain first — all three
  mis-scoped paths this bullet named are fixed; kept here as the record of what the
  review found.
- A `terminalRefusals` member that is not a real refusal code constructs without error and
  then never matches, so a leg the operator believes is configured terminal is not.
  **RESOLVED at the 2026-08-19 phase-1 API review** (its ruling 7): `validateLeg`
  (`config.ts`) now throws at construction on any member absent from the registry, under
  SPEC §9.1's own "inert or contradictory feature combinations are construction errors";
  the two legal-but-inert registry members SPEC §8 names stay constructible. Kept here as
  the record of what the review found.
- **2026-08-12**: an enlisted `redeem()` over a tampered chain called rung (1)'s
  `appendChainCompromise` with no `tx`, so its own no-tx fallback's `BEGIN IMMEDIATE`
  collided with the host's already-open transaction on the same connection and threw
  rather than refusing. Found by the first step-3 increment's whole-branch review; fixed
  in the same increment: an enlisted rung (1) now refuses `chain-compromise` result-first
  with no edge instead of ever routing through the append, the rule stated at the seam
  (`kernel/redeem.ts` rung (1); `kernel/finalize.ts`'s `appendChainCompromise` doc
  comment), and pinned by a new test in `redeem.test.ts`.
- **2026-08-13**: the second step-3 increment's design was audited before being written
  down — four independent reviews (spec fidelity against the sealed concept set, codebase
  impact, process record, adversarial design attack) ran over the presented draft. The
  adversarial review found no Critical defect: at-most-once survived every constructible
  race, and token custody held. Its headline catches, each folded into the shipped design
  as a ruling rather than left open: **the CAS-loser honesty finding** — a completion (or
  direct `redeem()`) losing the append race must re-read once and refuse
  `already-redeemed` when the fresh state is `redeemed`, not report a flat
  `unredeemable-state`, so a crash-recovering separated executor can tell the two apart
  (landed as the family-wide CAS-residual re-read, §11.2 row above); **the
  garbled-tokenDigest posture** — a hash-intact chain whose persisted `redeeming` payload
  carries no string `tokenDigest` is a storage/config fault that THROWS, never
  `effect-mismatch`, because a refusal there would send the operator into a permanent
  retry loop against a lie (`kernel/redeem.ts`'s `completeRedemption`); **the
  `redeemBound` bytes-vs-index ruling** — GOVERNED-throw at construction rather than
  accepted-but-inert, because SPEC §4 makes the `redeeming` payload's `bound` key present
  only when declared, in digested chain bytes, unlike `confirmToRedeem`'s merely-index gap
  (§9.1 row above); and **the injectable token source** — `ctx.tokenSource`, an internal
  construction seam mirroring `createWithClock`'s own internal-only exposure, which is
  what makes the token flow byte-identity-coverable under a fixed token (the
  backing-parameterized conformance and cross-backing byte-identity work, §12 row above).
- **Four items are held for the repository owner rather than acted on**, because in each
  the plausible fix touches the **sealed** concept set. This record neither resolves nor
  adjudicates any of them.

  Two come from the whole-branch review, and in both the reference implementation's later
  head does what this build does — which is what makes the spec-wording reading plausible
  rather than this branch having introduced a defect: `replay`/`verifyChain` not being
  exported from `index.ts` against §5's "The library exposes two functions over a record's
  chain", and `open()`'s en-passant blocker expire running without the pre-seam
  chain-verify §5 states as a blanket rule.

  The third is a divergence *inside* the sealed set, and it is carried in the autonomous
  step-1 plan's own known-open list rather than in the review. Verified live here:
  `docs/concept/CONTROLS.md`'s Recovery (`supersedes`) row calls it a "profile-conditional
  field", and §9.1's ConfirmProfile field table — the table that decides what a profile can
  declare — has no row for it, while §9 carries `supersedes` as an `open()` option. A
  reader deciding what a profile is allowed to declare gets two answers. **One thing an
  owner should know before ruling**, because it means the divergence is not the
  two-document affair it first looks like: §2 also lists `supersedes` among
  "Profile-conditional fields", "present only when the profile switches the feature on" —
  so §9.1's table and §2's list do not obviously agree with each other either. Which of the
  three texts moves is the owner's call; the code cannot settle it either way, but it no
  longer merely fails to settle it by leaving `supersedes` unbuilt. As of the step-8
  recovery increment `supersedes` is real, and the shape it landed in agrees with §9.1's
  own omission rather than with the two "profile-conditional field" sentences: it is an
  `open()`-option (`kernel/supersedes.ts`'s `verifySupersedes`, consumed by `open()`'s
  recovery rung), never a `ConfirmProfile` field — no profile declares it, and `config.ts`
  carries no per-field construction guard for it the way it does for every genuine profile
  field. That is this build's own reading, taken because a reading was unavoidable once the
  feature had to be built at all, not a resolution of the sealed-set divergence above — the
  owner's call still stands.

  **The fourth is also a divergence inside the sealed set, and it is new at the second
  step-2 increment: `DecisionRecord.status`.** §5 (`docs/concept/SPEC.md:449`) — "A sealed record reports its
  per-record status as `retired`" — §12 (`:1214`) and §13 (`:1246-1247`) all require a sealed
  record to report `retired`, while §2's record-model field table (`:111-126`) has no `status`
  row: it lists `state` and nothing that could carry a lifecycle status beside it. So the field
  this build ships to satisfy §5, §12 and §13 is a field §2's own table does not carry a line
  for — the same thing the §2 row of the table above records. The code cannot settle it and is
  not waiting on it: three sections require the field, so removing it is not an option this
  build has, and it ships. What is open is only which text should have named it — §2's table
  gaining a `status` row, or §5/§12/§13 wording their requirement against `state` — and both
  candidate fixes are edits to `docs/concept/`.

  **2026-08-19 — the owner ruled, and the sanctioned corrective pass closed the sealed-set
  side of all four items** (`docs/analysis/2026-08-19-sealed-set-sanction.md` carries the
  session and each ruling): SPEC §5 now states the operator-handle exposure of
  `replay`/`verifyChain` and the en-passant blocker-expire carve-out with its limit (the
  index-export half of the first item stays a pre-0.1 API-review question, register row 6);
  the `supersedes` divergence closed by ratifying the open()-option shape this build ships
  (§2's list and CONTROLS' Recovery row moved; §9.1 untouched); and `DecisionRecord.status`
  gained its §2 table row. The same pass added OPEN-QUESTIONS §2's "Decided (this build)"
  tail and corrected the concept README's front-door build-order line; the [PROVEN] legend
  was deliberately left untouched, its server-SQL clause to be satisfied by the release
  plan's row-15 adapter.

Full accounts: `docs/analysis/2026-08-03-step-1-review.md` (Class D and "Findings that
need a sealed `docs/concept/` decision"),
`docs/superpowers/plans/2026-08-03-autonomous-step-1-completion.md`'s "Known-open,
deliberately" list, and `docs/process/deferral-register.md`.

---

## Post-build-order increment — recorded human decline (SPEC §9's `decline` seam)

**The first post-build-order promotion, exited.** The eight-step build order closed at the
self-test-tier increment (commit `84484ba`; see the eight-of-eight boundary above). This
increment is not a ninth build-order step — the build order's own scope is closed — it is a
GOVERNED capability promoted afterward through `docs/concept/SCOPING-GUIDE.md` §§1–2's own
tier-test and promotion-rule machinery, on a fresh sanction earned for exactly this case (the
"disciplines that outlive the build order" `docs/process/next-phases.md` names). Design and
promotion case:
`docs/superpowers/specs/2026-08-20-recorded-human-decline-design.md`; plan:
`docs/superpowers/plans/2026-08-21-recorded-human-decline.md`.

**The gap this closes.** Before this increment a terminal "no" was evidence-free by
construction: the `refused` payload is `{ code }` and nothing else, so on every refusal
path the finalize identity, the failing consultation, and the checker who returned the fail
verdict were all discarded. An approval bound actor + reviewed surface + consultations; a
rejection bound a machine code. The nearest host workaround — a `terminalRefusals`-listed
`consultation-failed` carrying a fail-verdict human-review consultation — ended the leg
without recording who declined, what they saw, or why.

**What landed.** A new operator-only seam, `decline(recordId, identity, content, facts,
opts?)` (`kernel/decline.ts`), wired through `create.ts` and `operator-surface.ts` exactly
like `finalize` — never on the agent surface. `TransitionKind` and `RecordState` both gain
`declined` (`types.ts`); `stateOf('declined')` folds to `'declined'` in the no-default
exhaustive switch (`store/semantics.ts`); `nonterminal.ts` returns `false` for it
unconditionally — terminal under every leg/effect-seam combination, with no C3 carve-out
(parity with `refused`/`expired`); `chain/replay.ts` folds `declined`'s `{ actor }` payload
one-for-one with `confirmed`'s own projection; `kernel/supersedes.ts`'s terminal-predecessor
check accepts a declined record. `LegSpec` gains `decline?: true` (`config.ts`) — the
literal-`true`-guarded structural class (`validateDecline`), the same class `signing` uses,
never a "not yet available" construction throw: this field carries no GOVERNED-guard history
at all, because a non-declaring leg's `decline()` call throws at the SEAM instead (the
findings-seams declaring-check posture), so the governed-guard count this document has
tracked since the kernel increment is untouched by this increment, staying at zero.
`config.ts` also gains `DeclineOptions` (consultations only, no `policy` member — an
unknown-option-key throw covers one), exported from `index.ts` beside `FinalizeOptions`.
`kernel/finalize.ts` exports three pieces so the new seam shares code rather than forking a
copy: the `Facts` type, `refuseMaybeAppend`, and `isValidFacts` are now exported, and
rung (3.5)'s separation-of-duties check is extracted into a new exported predicate,
`sodViolated(record, leg, identity, recordId, seam)`, called identically from both
`finalize()` and `decline()`. Zero new refusal codes — the registry stands at 24, the
twenty-fourth still `consultation-stale` (`packages/record/src/refusal-codes.ts`); every
decline refusal reuses an existing code (`chain-compromise`, `leg-expired`,
`record-not-open`, `sod-violation`, `content-drift`, `consultation-missing`, `ineligible`,
`consultation-stale`, `availability`). Zero encoding changes and zero Store-interface
changes — the frozen eight methods and `chain/encoding.ts` are untouched, and
`byte-stability.test.ts`'s pinned minimal chain (which declares no `decline` leg) stays
green, asserted rather than edited. Tests: 25 in `packages/record/test/decline.test.ts` plus
one new store-conformance scenario (`test/conformance/store-conformance.ts`, run across all
three backings — memory, embedded-SQL, and `@vidimera/store-postgres` — via the existing
one-caller-file wiring) pinning C3 blocking a state-leaving append against a declined
record, the compromise carve-out excluding `declined` the way it already excludes
`refused`/`expired`, and C1 releasing the `(profile, subject)` pair so a fresh genesis
succeeds. The guide moved with the surface in the same increment:
`docs/guide/api-reference.md` and `docs/guide/integrating.md` both gain `decline` entries,
kept green by `pnpm api-sync`.

**The ruling set** (taken at the design brainstorm, recorded so a later increment does not
re-litigate them):

- **Payload is `{ actor }`** — the mirror of `confirmed`'s own payload, and nothing else.
  Reasons and return/escalate intent are NOT payload fields: they ride as ordinary
  consultations in the decline's own success batch (e.g. a host `decline-reason` kind —
  digest-only custody, open vocabulary, at most one per kind per call). No taxonomy enters
  the sealed set.
- **The gate ladder: authority rungs gate both verdicts, evidence rungs gate only confirm.**
  Keeping `finalize()`'s own rung numbering with the evidence rungs absent: **(1)**
  chain-verify (AL2's `signatureLayerHolds` folded in exactly as `finalize()` folds it);
  **(2)** state/expiry (a due-open record resolves `expired` first and refuses
  `leg-expired`; a non-open record refuses `record-not-open`); **(3)** identity +
  `allowedAuthorities`; **(3.5)** separation of duties (`sod.notActorOf` AND the proposer
  rule — "deciding includes declining", so a proposer cannot decline their own leg any more
  than confirm it); **(4)** content-drift (re-canonicalize and re-digest the supplied
  content against the bound `contentDigest` — the decline is about THIS content or it does
  not land); **(4.5) does not run** — no `opts.policy` member exists on the seam's options
  bag at all, an unknown-option-key throw if one is supplied; **(5)** facts binding (no
  fresh reviewed-surface digest refuses `consultation-missing` — the decline binds what the
  decider saw when they said no); **(5.5) eligibility ONLY**, with its existing trip mapping
  (`fail` → `ineligible`, missing → `consultation-missing`, unreachable → the availability
  outcome) and its AL2 `freshness` bound (`consultation-stale` — stale authority is
  authority not established); declared `requiredConsultations` are NOT iterated, and rung
  (5.7)'s ack-coverage gate does not run. **(6)** the success batch,
  `[chain-verify, facts, …obtained consultations, declined]`, one atomic append exactly
  like confirm's own. The skipped rungs are deliberate: "a 'no' must never be blockable by a
  missing or dead evidence source" — required-consultation gating, evidence-kind freshness,
  and findings-ack coverage all gate only the affirmative path.
- **No `opts.policy` on decline; rung (4.5) does not run.** The policy gate exists to
  prevent approving under stale rules; a decline disposes the record either way, and
  demanding a live policy attestation to say no would recreate the undeclinable-record trap
  through the policy source instead. The bound `policyDigest` stays on the record as the
  context the decline was made under — notarized at `open()`, untouched here.
- **A separate seam, not a `finalize()` verdict flag.** `finalize()`'s pinned return shape
  (`state: 'confirmed'`) is untouched; §9 gains one symmetric call instead. The ladder core
  is shared internally (`sodViolated`/`refuseMaybeAppend`/`isValidFacts`), never forked.
- **Name: `decline`.** `reject` collides with the store's own rejected-append vocabulary;
  `refuse` collides with the `refused` state itself.

**The four cuts, recorded per `docs/concept/CONCEPT.md` §7's anti-goal #4** ("cut in
writing, never silently... what was cut, why, and how it could be recovered or re-derived"):

- **DEFER as a verb — cut.** Deferral is already the `open` state plus `expiry`; the host's
  own workflow layer waits. Recovery path: none needed — the chain already shows the wait.
- **RETURN / MODIFY / ESCALATE as verbs — cut.** Each is `decline` plus a reason
  consultation plus a `supersedes` re-open (any-profile re-open covers escalation by
  design). Recovery path: if real hosts prove the recipes insufficient, a disposition field
  on the payload is the revisit point — considered and declined at this design's own
  brainstorm, not foreclosed.
- **Proposer withdrawal — cut.** The proposer rule gates `decline` identically to
  `finalize` ("deciding includes declining"), so a proposer cannot decline their own leg;
  withdrawal stays a host-modeled flow outside the library. Recovery path: a distinct future
  verb with its own promotion case, if a real host needs it.
- **Decline-reason as a payload field — cut**, in favor of the consultation vehicle above.
  Recovery path: the payload can gain an optional digest field later without moving any
  existing chain (present-iff-present), should the consultation vehicle prove wrong.

**The sanction's grant record.** Granted by the maintainer 2026-08-21, in-session
("approved", in response to the direct question), for exactly the design doc's §8 scope —
Tasks 1 and 10 of the increment's plan licensed to touch `docs/concept/`, and only for the
sites §8 there names. Task 1 landed the sanctioned sealed-set text as `[DESIGNED]` (SPEC §2
×2 sites, §4's payload row, §9's seam bullet, §9.1's profile-field row, §10.1's SoD
sentence; CONTROLS.md §3's GOVERNED row and §5's domain-instance row; a GLOSSARY.md entry).
This increment's own exit (its Task 10) is the marker-move step spec-moves-to-truth
requires: all eight `[DESIGNED]`/`DESIGNED` tokens Task 1 introduced move to
`[PROVEN]`/`PROVEN`, in the same commit as this record, and `docs/concept/` re-seals
immediately after. **Two further sentences move under the SAME grant, by a recorded
controller ruling taken during Task 1's own review** (`.superpowers/sdd/2026-08-21-recorded-human-decline/progress.md`):
SPEC §5's chain-admission sentence and §8's `unredeemable-state` registry entry both
enumerated `open`/`refused`/`expired` — current seam behavior at the time they were
written — without `declined`; the ruling held that these enumerations must be true when the
behavior they describe lands, and leaving them false at this exit would be the worse
sealed-set violation, so both gain `declined` at this same commit, spliced minimally, no
draft-ahead marker involved (they carried none to begin with — they are stated as current
fact, now made current fact again).

**Gate outputs, as measured against this increment's own exit commit**: `./node_modules/.bin/vitest run`
— 52 test files, 723 tests, zero skips; `tsc -p packages/record --noEmit` and
`tsc -p packages/store-postgres --noEmit` — both clean; `./node_modules/.bin/biome check .`
— 116 files checked, zero errors or warnings; `node scripts/contract-scan.mjs` — exit 0, no
output; `node scripts/api-reference-sync.mjs` — exit 0. `docs/process/deferral-register.md`
carries no row for this increment and none moved — verified, not merely assumed.

**Two follow-up commits, after this increment's own exit.** Commit `44d23b0` ("Decline
follow-ups 1/2") landed three pins the exit left implicit rather than asserted: the
agent-reachable surface's absence of `decline`, a signed decline verified end-to-end, and
the unreachable-consultation re-arm proof at the decline seam. This commit ("Decline
follow-ups 2/2, the sanctioned consistency pass") is the second and closing follow-up: the
maintainer's 2026-08-21 grant ("Class A + authoritative Class B") licensed a sealed-set
consistency pass over eleven SPEC.md sites that had gone false-by-omission when the decline
seam landed — three §8 producer-note rows (`content-drift`, `leg-expired`,
`consultation-missing`); seven authoritative Class B sentences across §3 (content crossing,
the facts default), §9 (the capability-split sentence), §9.1 (the `eligibility` row), §10.4
(the per-call and success-batch sentences), and §11.1 (the one-consultation-per-kind rule);
and one route-accuracy reword of the decline block's own closing refusal-routing sentence,
which had over-generalized to `terminalRefusals` alone where three of the decline seam's
refusal codes (`leg-expired`, `record-not-open`, `chain-compromise`) route through their own
§8 postures instead. `docs/concept/` re-seals immediately after, as it does at every
marker-move and consistency-pass commit; §6's identity prose and §13A's honesty restatements
were explicitly out of the grant and are untouched.

**One further false-by-omission site is recorded here, not fixed:** SPEC §9's own opening
sentence still counts "four calls, split across two surfaces" and its operator-only
parenthetical still omits `decline()`, though the seam is operator-only and the build now
ships five decision calls. It was outside both grants above; closing it needs a fresh,
explicit sanction through `SCOPING-GUIDE.md` §§1–2's own machinery.

## Post-build-order increment — proposal provenance (SPEC §9's `proposed` option)

**The second post-build-order promotion, exited.** Recorded human decline (above) closed
the first; this is the second GOVERNED capability promoted through
`docs/concept/SCOPING-GUIDE.md` §§1–2's own tier-test and promotion-rule machinery, on a
fresh sanction earned for exactly this case. Design and promotion case:
`docs/superpowers/specs/2026-08-21-proposal-provenance-design.md`; plan:
`docs/superpowers/plans/2026-08-21-proposal-provenance.md`.

**The gap this closes.** Before this increment the record's one content binding —
`contentDigest`, fixed at `open()` from whichever staged draft the operator opens —
captured only the content that was actually decided. Staging is idempotent by content, so
when a human revises an agent's draft before opening, the revision mints a distinct
`stagedRef`; the agent's original proposal survives nowhere on the chain, and "the human
changed the draft before approving it" — the evidence effective-challenge review is
supposed to leave — was unrecoverable from the record. The nearest host workaround embeds
the proposed digest inside the decided content itself, polluting the domain content schema
with process metadata and binding an unverified self-claim.

**What landed.** `OpenOptions` (`config.ts`) gains one member beside
`priorRecordRefs`/`policyDigest`/`supersedes`: `proposed?: { stagedRef: string }`. At
`open()` (`kernel/open.ts`), after the opened draft resolves and before the genesis is
built, a present `proposed` claim is shape-validated at intake (a new file-local
`validateProposedShape`, the `validateSupersedesShape` class: a plain object with exactly
`stagedRef`, a non-empty string), then its `stagedRef` is resolved via `store.getStaged` —
an unresolvable reference THROWS naming it (the unknown-`stagedRef` caller-error posture),
and a resolved draft naming a different `(profileId, subjectRef, legId)` than the opened
draft ALSO throws, naming both triples (strict same-triple, fail-closed against host
wiring bugs). The resolved draft's `contentDigest` binds into the genesis `opened` payload
as `proposedDigest`, present-iff-supplied — the `supersedes` mechanism exactly, so a
non-supplying chain stays byte-identical to today's and the frozen byte-stability oracle
does not move. `open()`'s unknown-key allowlist and its throw message both gain `proposed`
(the message text changed; its caller-error posture did not). `types.ts`'s
`DecisionRecord` gains `proposedDigest?: Digest`, folded from the genesis snapshot by
`chain/replay.ts` (`OpenedPayload` gains the field; the folding-rules doc comment's
`opened` line and its prose both name it) — present-iff-present, deliberately absent from
`ReviewView`. Zero new refusal codes (the registry stays at 24, still ending
`consultation-stale`), zero new `TransitionKind`s or `RecordState`s, zero encoding or
Store-interface changes. Tests: 9 in the new `packages/record/test/provenance.test.ts`
(happy path with digest inequality; unchanged acceptance with digest equality; the
unresolvable-reference throw; the cross-triple throw's subject and profile arms; the
malformed-shape throw; composition with recovery — `supersedes` AND `proposed` on one
re-open; per-leg behavior and a cross-leg throw on a two-leg profile; a signed-genesis pin;
a live-profile pin), plus the ed25519 signing setup `decline.test.ts` held as a file-local
helper extracted verbatim into `packages/record/test/helpers/signing.ts` and re-pointed
from both files — a behavior-preserving move, zero test-count change from the extraction
itself. The guide moved with the surface in the same increment: `docs/guide/api-reference.md`
(the `OpenOptions`/`DecisionRecord` entries) and `docs/guide/integrating.md` (a "Binding
the agent's proposal" subsection, its sample vitest-verified before being written down)
both gain `proposed`/`proposedDigest` entries, kept green by `pnpm api-sync`.

**The ruling set** (taken at the design brainstorm, recorded so a later increment does not
re-litigate them):

- **Resolved-ref binding, not a bare digest.** `open(stagedRef, { proposed: { stagedRef }
  })` resolves the proposed reference through the store exactly as it consumes its own
  `stagedRef`. A bare host-claimed digest was considered and declined: resolution buys the
  existence check, the same-triple check below, and the ergonomics of a ref the host
  already holds.
- **Throw, never refuse.** An unresolvable proposed ref is a caller error (`open`'s own
  unknown-`stagedRef` posture; SPEC §8's throw-rather-than-refuse class) — not a domain
  outcome, so it never touches the refusal registry.
- **Strict same-triple.** A resolved draft naming a different `(profileId, subjectRef,
  legId)` than the opened draft throws, naming both triples — fail-closed against host
  wiring bugs, never loosened by a "just the subject" or "just the profile" partial check.
- **Open-time option, no profile field.** The `supersedes` precedent exactly: presence
  switches it, byte-stability rides present-iff-supplied, and a host wanting it mandatory
  enforces at its own `open` call site.
- **ReviewView does NOT project it.** The `supersedes`/`priorRecordRefs` precedent:
  provenance and linkage evidence ride `getRecord`/`replay`, never the review projection —
  review shows what is being decided, not its pedigree.
- **Same-ref is legal and meaningful.** Opening the proposal itself with `proposed: {
  stagedRef }` naming that same draft records unchanged acceptance — digests equal,
  deliberately representable, no special case.

**The four cuts, recorded per `docs/concept/CONCEPT.md` §7's anti-goal #4** ("cut in
writing, never silently... what was cut, why, and how it could be recovered or
re-derived"):

- **Multi-hop draft lineage (P1→P2→P3 inside one record) — cut.** Staged drafts are
  store-side and unchained; linking them would mint unverifiable lineage. Recovery path:
  multi-round rework as records (decline/refuse + `supersedes`), each round carrying its
  own `proposed`.
- **Editor identity on the revision — cut.** Staging carries no identity, so the library
  cannot attribute who produced a revision. Recovery path: a host `revision` consultation
  convention, documented in the guide (`checker` names the editor's identity,
  `payloadDigest` digests the prior version) — an ordinary consultation, not a new field; a
  first-class field is a later case if hosts prove the recipe insufficient.
- **A mandatory-provenance profile switch — cut.** Recovery path: a leg-level requirement
  field with its own promotion case, if a real host needs enforcement the call site cannot
  give.
- **Cross-subject/profile/leg proposed refs — cut** (strict same-triple). Recovery path:
  loosen on a demonstrated real-host need, argued at the seam.

**The sanction's grant record.** Granted by the maintainer 2026-08-21, in-session ("all
approved", in response to the direct question), for exactly the design doc's §7 scope —
Tasks 1 and 5 of the increment's plan licensed to touch `docs/concept/`, and only for the
sites §7 there names. Task 1 landed the sanctioned sealed-set text as `[DESIGNED]` (SPEC §2's
field-table row and provenance sentence, §4's opened-row gloss, §9's options block;
CONTROLS.md §3's GOVERNED row and §5's domain-instance row; a GLOSSARY.md entry). This
increment's own exit (this section's own commit) is the marker-move step
spec-moves-to-truth requires: all six `[DESIGNED]`/`DESIGNED` tokens Task 1 introduced move
to `[PROVEN]`/`PROVEN`, in the same commit as this record, and `docs/concept/` re-seals
immediately after. **One further sentence moves under the SAME grant, by a recorded
controller ruling taken during Task 1's own review**
(`.superpowers/sdd/2026-08-21-proposal-provenance/progress.md`): SPEC §2's
"Flow-conditional field: `supersedes`" sentence under-included `proposedDigest` — also an
open-time-conditional field, declared by no profile field, exactly like `supersedes` — so
it is spliced minimally to name both ("Flow-conditional fields: `supersedes` … and
`proposedDigest` …"), no draft-ahead marker involved (the sentence carried none to begin
with — it is stated as current fact, now made current fact again for both fields it
describes).

**Gate outputs, as measured against this increment's own exit commit**:
`./node_modules/.bin/vitest run` — 53 test files, 734 tests, zero skips;
`tsc -p packages/record --noEmit` and `tsc -p packages/store-postgres --noEmit` — both
clean; `./node_modules/.bin/biome check .` — 118 files checked, zero errors or warnings;
`node scripts/contract-scan.mjs` — exit 0, no output; `node scripts/api-reference-sync.mjs`
— exit 0. `docs/process/deferral-register.md` carries no row for this increment and none
moved — verified, not merely assumed.

**The comment-truth sweep.** Every pattern the exit task named — `"accepts only
priorRecordRefs"` (`open()`'s updated allowlist message), `"proposed"` across `packages/`
(every hit this increment's own or an adjudicated pre-existing unrelated use of the plain
word — `store/memory.ts` and `store/store.ts`'s "the proposed `transition.seq`" sequencing
prose, unrelated to this increment's option), `"opened snapshot"` and the genesis-key
enumerations in comments (`kernel/open.ts`'s payload literal doc, `chain/replay.ts`'s
folding-rules doc), and the `operator-surface.ts`/`create.ts` header enumerations (neither
names the `open()` option list) — checked out current, landed correctly by Tasks 2–4; the
sweep found nothing stale and made no additional fix.

**One follow-up commit, after this increment's own exit.** Commit `b5bada5` ("Proposal
provenance, final fix wave") landed two further sealed-set sentences of the same class
under the same grant — SPEC §4's minimal-model invariant paragraph gained the
open-time-option carve-out (`supersedes`/`proposed` are present-iff-supplied, independent
of the profile) and CONTROLS.md's control-table note now names the Recovery and
Proposal-provenance rows as open-time-option exceptions rather than profile fields — plus
two more pins in `provenance.test.ts` (9 → 11), the guide's own enumerations, and two
comment corrections in `kernel/open.ts`. `docs/concept/` re-seals immediately after.

## Post-build-order increment — effect-result notarization (SPEC §11.2's `redeem.result`)

**The third post-build-order promotion, exited.** Recorded human decline and proposal
provenance (above) closed the first two; this is the third GOVERNED capability promoted
through `docs/concept/SCOPING-GUIDE.md` §§1–2's own tier-test and promotion-rule
machinery, on a fresh sanction earned for exactly this case. Design and promotion case:
`docs/superpowers/specs/2026-08-21-effect-result-design.md`; plan:
`docs/superpowers/plans/2026-08-21-effect-result.md`.

**The gap this closes.** A redeemed record said how redemption closed — `{ via: 'direct'
}` or `{ via: 'token', tokenDigest }` — never what the effect did. Embedding a result
inside the redemption `content` is impossible (it is re-digested against the record's
bound `contentDigest`, so anything added refuses `effect-mismatch`); appending after
`redeemed` is barred by C3's terminal monotonicity. The one honest slot left open is the
redemption call itself, in the two shapes where the outcome is knowable at the seam: the
enlisted co-located `redeem()`, whose edge commits or rolls back with the host's own
effect write (§12), and token `completeRedemption()`, which the separated executor calls
when it executes.

**What landed.**

*Task 1 — the surface refactor (sanction-free, commits `603a21e`..`05dcbfc`).* The
redemption family's three seams — `redeem`, `beginRedemption`, `completeRedemption` —
move from a trailing positional `tx?` to a trailing `opts?: RedeemOptions` (`{ tx?:
unknown }` at this point), aligning them with `finalize`/`open`/`decline`'s own
options-bag shape. Measured blast radius: 11 call sites passing a real `tx` rewritten to
`{ tx: … }` (5 in `redeem.test.ts`, 5 in `redeem-token.test.ts`, 1 in `clocks.test.ts`);
91 no-`tx` call sites untouched, including the cross-backing byte-identity flow's own
redemption driver. `create.ts`'s three delegations and `kernel/redeem.ts`'s nine internal
positional pass-throughs (three `prologue()` calls, three `refuseCorrespondenceMismatch()`
calls, three `store.appendTransition()` calls) now read a local `const tx = opts?.tx`
instead of a parameter — byte-identical downstream. `RedeemOptions` is exported beside
`FinalizeOptions`/`DeclineOptions`/`OpenOptions`. Behavior-preserving throughout, gated by
the existing suite (53 files/736 tests at this task's own exit). Verified sanction-free:
SPEC states parameter lists for `stage`/`open`/`review`/`finalize`/`decline`/`seal` only
and names redemption solely as the bare verb `redeem()` — no sealed sentence states a
redemption argument list — and §9 positively licenses the shape ("Feature options … grow
only the **operator-only** options bags"). Register row 16 — already retired 2026-08-19 —
was NOT reopened: it gained a "Shape update, 2026-08-21" note in both this document's own
row-16 bullet and `next-phases.md`'s matching section, recording the new shape (see the
ruling below).

*Task 2 — the sanctioned sealed-set text, `[DESIGNED]` (commit `7130346`).* Landed the
five sites named in the sanction's grant record below, verbatim as scoped, with no
further false-by-omission sentence discovered elsewhere (unlike the two prior
increments' own exits).

*Task 3 — the capability (commits `7130346`..`78f71c0`).* `ConfirmProfile.redeem` gains
`result?: true`, guarded structurally by a new `validateResultDeclaration` — the
literal-`true` class `signing`/`LegSpec.decline` share, wired into `validateProfile`
beside `validateBounds`'s own redemption checks; `REDEMPTION_KEYS` gains `'result'`, so a
stray `result` key on a profile or a leg is caught by the existing misplacement sweep
with no new test needed. `RedeemOptions` gains `result?: { digest: Digest }`. A new
shared file-local intake validator, `validateRedeemOptions(seam, opts)`
(`kernel/redeem.ts`), runs as the first statement of all three seams (after
`completeRedemption`'s pre-existing token-must-be-a-string guard) — one function serving
three call sites: it throws on any options-bag key beyond `tx`/`result`
(`governedUnavailable`, "accepts only tx and result in this build"), throws at
`beginRedemption` unconditionally when `opts.result` is supplied (issuance precedes
execution — a result at redeeming-minting time would claim an outcome for an unexecuted
effect), and validates a supplied `result`'s shape (a plain object with exactly `digest`,
a non-empty string) — all before any chain load. The admission gate — `opts.result`
supplied but the profile does not declare `redeem.result` throws — lands in `redeem()`
and `completeRedemption()` only, immediately after `prologue()`'s gated destructuring, so
`chain-compromise`, `unknown-profile`, and the effect-seam/final-leg refusal all win
first; `beginRedemption` needs no admission gate at all, since its arity rejection is
unconditional. Both accepting seams splice `resultDigest` into the `redeemed` payload
present-iff-supplied, matching `finalize()`'s own `proofRef`/`observedAt` idiom: `{ via:
'direct', ...(resultDigest === undefined ? {} : { resultDigest }) }` and `{ via: 'token',
tokenDigest, ...(resultDigest === undefined ? {} : { resultDigest }) }`.
`DecisionRecord.resultDigest?: Digest` folds from the payload in `chain/replay.ts`'s
existing `redeemed` arm (added alongside, not restructured) — absent from `ReviewView` by
the same reasoning as `supersedes`/`proposedDigest` (review shows what is being decided;
a redeemed record is past review). Zero new refusal codes, kinds, states, or
Store-interface changes. TDD: 7 tests landed RED against `tsc` (three `TS2353`/`TS2339`
families — `result` unknown on `profile.redeem` and on `RedeemOptions`, `resultDigest`
unknown on `DecisionRecord`) then GREEN (`packages/record/test/effect-result.test.ts`).

*Task 4 — pins (commit `5d065e6`).* 6 more pins in the same file (13 total): the
`redeemed` payload's key set pinned exactly (`['via']` unsupplied; `['resultDigest',
'via']` direct-supplied; `['resultDigest', 'tokenDigest', 'via']` token-supplied); the
gate order (intake beats admission; the seam gate outranks admission on a pure-capture
profile — verified by reading `kernel/redeem.ts` before asserting, no seam defect found);
the construction-time literal-`true` guard and a stray top-level `result` key throwing;
correspondence-precedes-binding (a drifted redemption carrying a result binds nothing,
leaves the record `confirmed`); sealing preserving a bound `resultDigest` across the
`retired` cap; and a signed, result-declaring effect-seam profile's redemption reporting
every transition signed and verified.

*Task 5 — the guide (commit `da030e4`).* `docs/guide/api-reference.md` gains the
`ConfirmProfile.redeem.result`, `RedeemOptions.result`, and `DecisionRecord.resultDigest`
field entries plus a prose note on the two throw postures and the honest bound;
`docs/guide/integrating.md` gains a "Notarizing what the effect did" subsection with
three vitest-verified samples — the enlisted direct shape carrying a result, token
completion carrying a result, and the late-result recipe (a successor pure-capture
record whose `subjectRef` names the executed effect, composed entirely from
`open`/`finalize` over an ordinary profile, no new library mechanism).

Both frozen oracles (`byte-stability.test.ts`, `cross-backing-byte-identity.test.ts`)
were asserted green and left untouched at every task's own exit — the second confirms
empirically, not just by the present-iff-supplied idiom's intent, that a non-supplying
redemption's bytes did not move.

**The ruling set** (taken at the design brainstorm, recorded so a later increment does
not re-litigate them):

- **The redemption family gains one options bag; `tx` moves into it — verified
  sanction-free.** No sealed sentence states a redemption argument list, and §9
  positively licenses operator-only bag growth. Two sealed constraints bind the bag and
  are honored: §12's handle rule (`tx?: unknown` stays the driver's own handle type,
  never a library-owned transaction interface) and §11.2's "It carries no identity
  argument" (the bag never gains an identity field — adding one would be a fork, not an
  edit).
- **The declaration ADMITS the field; it does not require it — new normative text, not
  an inherited pattern**, acknowledged as such at the sanction grant. The only sealed
  presence rule is §10.3's *mandatory* one; the admission-gate shape existed only as a
  code pattern (finalize's `observedAt` gate), not sealed vocabulary. Argued on its
  merits: a result the host does not know cannot be manufactured, so a mandatory
  contract would force hosts to fabricate a digest or leave the capability undeclared —
  the opposite of fail-closed; absence here is self-evidently non-evidence, unlike
  policy, where absence would leave a declared gate unrun.
- **Accepted at `redeem()` and `completeRedemption()`; rejected at `beginRedemption()`.**
  Issuance precedes execution, so a result at begin-time would claim an outcome for an
  effect that has not run.
- **Declaring `result` declares the effect seam.** `profileDeclaresEffectSeam` keys on
  the `redeem` block's presence, never its contents, so `redeem: { result: true }` is an
  effect-seam profile exactly as `redeem: {}` is — correct, not a trap: a result digest
  exists only on a `redeemed` transition, so there is nothing to notarize without
  redemption.
- **`resultDigest` is the payload key; `result: { digest }` is the input shape** —
  digest only, no structured members; anything else rides inside the host's own digested
  result content.

**The five cuts, recorded per `docs/concept/CONCEPT.md` §7's anti-goal #4** ("cut in
writing, never silently... what was cut, why, and how it could be recovered or
re-derived"):

- **Post-`redeemed` result append, and any C3 carve-out for it — rejected outright.**
  Recovery path: the late-result recipe above (a successor pure-capture record) — the
  only path this design leaves open, by construction.
- **Structured result fields** (`executionId`, `transactionId`, `effectTarget`, `result`)
  **— cut.** Recovery path: they ride inside the host's digested result content; a
  future case would have to argue why the library needs to read them.
- **Library-side result verification — cut permanently.** No recovery path:
  performing it would make the library the business system.
- **Result at `beginRedemption()` — cut.** No recovery path while issuance precedes
  execution — the rationale is structural, not a placeholder.
- **A mandatory presence contract — cut, in favor of the admission gate argued above.**
  Recovery path: a future profile field could demand the stricter posture if a real host
  needs it.

**The sanction's grant record.** Granted by the maintainer 2026-08-21, in-session
("Granted as scoped", in response to the direct question, explicitly acknowledging the
grant licenses NEW normative text for the admission-gate shape), for exactly the design
doc's §7 scope — Tasks 2 and 6 of the increment's plan licensed to touch
`docs/concept/`, and only for the sites §7 there names. Task 2 landed the sanctioned
sealed-set text as `[DESIGNED]`/`DESIGNED` at five sites: SPEC §4's `redeemed` payload
row (`resultDigest?` in both shapes), SPEC §9.1's `redeem` field row (the literal-`true`
declaration clause), SPEC §11.2's result-notarization block (landed verbatim,
unsoftened), CONTROLS.md §3's GOVERNED row (plain `DESIGNED`, that table's own
convention) and its §5 domain-instance row (untagged, per that table's own convention),
and one GLOSSARY.md entry. This increment's own exit (this section's own commit) is the
marker-move step spec-moves-to-truth requires: all five `[DESIGNED]`/`DESIGNED` tokens
Task 2 introduced move to `[PROVEN]`/`PROVEN` in the same commit as this record, and
`docs/concept/` re-seals immediately after.

**Gate outputs, as measured against this increment's own exit commit**:
`./node_modules/.bin/vitest run` — 54 test files, 749 tests, zero skips;
`tsc -p packages/record --noEmit` and `tsc -p packages/store-postgres --noEmit` — both
clean; `./node_modules/.bin/biome check .` — 119 files checked, zero errors or warnings;
`node scripts/contract-scan.mjs` — exit 0, no output; `node scripts/api-reference-sync.mjs`
— exit 0. `docs/process/deferral-register.md` carries no row for this increment and none
moved — verified by reading the file in full (it holds exactly the one live row,
publish tooling); register row 16 was already retired 2026-08-19, before this branch,
and Task 1's "Shape update, 2026-08-21" notes (in this document's own row-16 bullet and
`next-phases.md`'s matching section) record the options-bag shape against that
retirement without reopening it.

**The comment-truth sweep.** Every pattern the exit task named — `"accepts only tx and
result"` (the new intake messages, current everywhere they occur); `"resultDigest"`
across `packages/` and `docs/` (every tracked hit this increment's own, or a dated
planning/design artifact under `docs/superpowers/`, adjudicated as such per Task 1's own
convention); `"redeemed payload"`/`"via: 'direct'"` enumerations in comments (all
current, or dated artifacts); `"present-iff-supplied"` claims (all true, confirmed
against the two payload splices and the fold) — checked out current or adjudicated,
landed correctly by Tasks 1–5. One further finding, outside the named patterns but
within `governedUnavailable`'s own count-literal family: this document's CLAUDE.md
enumeration (three throw sites) and a general doc-comment on `governedUnavailable`
itself (`packages/record/src/config.ts`) both undercounted, and
`docs/process/adopted-source-provenance.md`'s own running DIVERGENCE-list correction had
gone stale even before this increment (it never recorded the recorded-human-decline
increment's own `decline()` guard). All three are fixed in this commit: CLAUDE.md now
names four throw sites, one of them (`kernel/redeem.ts`'s shared
`validateRedeemOptions`) serving all three redemption seams; `config.ts`'s own doc
comment is corrected the same way; `adopted-source-provenance.md` gains a further
correction bullet recording both the previously-unrecorded `decline()` guard and this
increment's own addition. Two comments describing a specific PAST increment's own
snapshot (`packages/record/src/config.ts`'s `validateFreshness` doc comment and
`construction-validation.test.ts`'s AL2-freshness-titled test) are left untouched,
consistent with how every other step's own historical account in this document is
frozen at the moment it was written; `docs/process/open-items-plan.md`'s own count is
likewise left untouched — that document explicitly disclaims currency ("Measurements
below … drift from that moment … this plan is stale") and defers to this document as
authoritative.

**A further finding, raised at a final fix wave outside this increment's own grant —
recorded, not fixed.** `docs/concept/SPEC.md` §2's conditional-fields enumeration
("**Profile-conditional fields** … `priorRecordRefs`/`priorLegActors` … `findings` and
`acks` … **Flow-conditional fields:** `supersedes` … and `proposedDigest` …", SPEC.md
lines ~127-133) is false-by-omission against this increment's own field:
`DecisionRecord.resultDigest` (`types.ts`) is a real record-model field, present only
under a `redeem.result` declaration plus a seam supply — profile-conditional, by the
sentence's own test, exactly like `priorRecordRefs`/`findings` — and the sentence does not
name it; §2's own unconditional field table (lines 111-125) likewise carries no
`resultDigest` row (as it carries none for `supersedes`/`findings`/`acks` either — only
`policyDigest` and `proposedDigest` earned dedicated rows). This is the **third
consecutive** post-build-order increment whose own landed capability left a §2-adjacent
enumeration under-inclusive by omission: recorded human decline's own two §2 sites were
caught and fixed within that increment's own grant (the recorded-human-decline section
above records it: "Task 1 landed the sanctioned sealed-set text as `[DESIGNED]` (SPEC §2
×2 sites, …)"); proposal provenance's own "Flow-conditional field" under-inclusion was
likewise caught and fixed within that increment's own grant (the proposal-provenance
section above records it: "One
further sentence moves under the SAME grant, by a recorded controller ruling taken during
Task 1's own review… SPEC §2's 'Flow-conditional field: `supersedes`' sentence
under-included `proposedDigest`… spliced minimally to name both"); this increment's own
design doc
(`docs/superpowers/specs/2026-08-21-effect-result-design.md` §7, "Sanction requested")
never named §2 at all — not requested, and not among the sites its "Explicitly NOT
requested" clause names either — so the gap surfaces only now, at this final fix wave,
with no in-scope grant to close it. Per the sealed-set authority governing this fix wave
(SPEC §§4/9.1/11.2, CONTROLS §§3/5, GLOSSARY only), §2 is OUTSIDE the grant, so this
finding is recorded here rather than fixed: closing it needs a fresh, explicit sanction
through `docs/concept/SCOPING-GUIDE.md` §§1-2's own tier-test and promotion-rule
machinery, naming §2's conditional-fields sentence and field table as the sites to
touch — never assumed from this or any past grant.

**CLOSED 2026-08-21 — release-readiness increment, Task 3 (the sanctioned enumeration
closures).** The fresh, explicit sanction this finding named as its own precondition was
granted the same day, in-session ("All three tasks, sanction granted"), naming this exact
site among exactly two. `docs/concept/SPEC.md` §2's field table now carries a
`resultDigest` row, and its conditional-fields sentence's existing **Profile-conditional
fields** list now names `resultDigest` alongside `priorRecordRefs`/`priorLegActors` and
`findings`/`acks` — the classification this finding's own text above already used
("profile-conditional, by the sentence's own test, exactly like
`priorRecordRefs`/`findings`"). A separate "doubly-conditional" category was drafted for
this field during the fix and then RETIRED during this same task's own review:
`findings`/`acks` carry the identical admits-not-requires shape — a profile declaration
ADMITS the capability (`requiredAcks`'s findings flow; `redeem.result` for
`resultDigest`) and a voluntary per-call action alone PRODUCES the value (a raised
finding — `types.ts`'s `findings?` doc comment: "present iff the chain carries at least
one `finding-raised` transition"; SPEC §10.2: "Zero raised findings of a required kind
pass vacuously — `requiredAcks` gates *raised* findings; it does not require findings to
exist" — for `resultDigest`, a supplied result digest at the closing redemption call). The
category's own "present only when the profile switches the feature on" wording is a
necessary-condition test, not a sufficiency claim, so it already covered `findings`/`acks`
correctly without ever promising the field is present whenever the profile declares the
feature — and it covers `resultDigest` the same way; a new category would have sorted two
structurally identical fields differently in the same sentence for no stated reason. The
`resultDigest` list entry was initially left unmarked on a controller instruction that
reasoned any marker addition here would be a marker-move; that instruction was corrected
on a further review: writing `**[PROVEN]**` at this entry restates a promotion already
settled at the field's two home sites (SPEC §4's `redeemed` transitions-table row and
§11.2's own subsection lead), not a fresh DESIGNED→PROVEN move, so the entry now carries
`**[PROVEN]**` exactly as its four list-mates do, and no entry is added to the marker-move
lineage CLAUDE.md and this document's own step-7/step-8 accounts track.

## Post-build-order increment — release-readiness reconciliation

**The fourth post-build-order increment, exited (commits `bc9d0a4`..`385961b`).** Unlike the
three capability increments above, this one landed no new GOVERNED capability — it
reconciled the publish-facing docset and two sealed-set enumerations the three prior
increments left behind, run as three tasks with no dedicated design doc (no
`docs/superpowers/specs/` file precedes it; the commit messages "Release readiness
1/3"…"3/3" carry the task list themselves).

**Task 1 (`bc9d0a4`) — the publish-facing docset catches up, no sanction needed.**
`CHANGELOG.md`'s `[Unreleased]` section, `README.md`'s Status paragraph, and
`docs/guide/concepts.md`'s governed-controls list had no mention at all of the three
post-build-order capabilities (recorded human decline, proposal provenance, effect-result
notarization). Each of the three gained one entry per file, naming the capability's switch
and its honest bound, verified against `kernel/decline.ts`, `kernel/open.ts`,
`kernel/redeem.ts` and `config.ts` and kept consistent with the already-ratified wording in
`docs/concept/CONTROLS.md` and `docs/guide/api-reference.md`. `docs/guide/faq.md` was
checked and deliberately left untouched — none of its answers become incomplete by the
three capabilities' existence. No code or test changes.

**Task 2 (`669ad20`) — two process-doc fixes, no sanction needed.**
`docs/process/release-checklist.md`'s PAUSED-pickup notice named refreshing every
`2026-08-19` date in the preserved cut commit `8be3fce`, but a date refresh alone would let
a stale `[0.1.0]` CHANGELOG section reach a release, since `[Unreleased]` had grown the
three Task-1 entries that predate none of that commit's own narrative; the notice now says
the `[0.1.0]` section must be re-cut fresh from `[Unreleased]` at pickup rather than reused,
and that the same staleness question — content, not only date — applies to any other
docset flip the preserved commit carries. `docs/process/next-phases.md` gained one
discipline bullet: a capability that adds a conditional field must move SPEC §2's
enumerations, the publish-facing docset, and any §8 registry producer-note row in its OWN
increment, because neither `contract-scan` nor `api-sync` reads a prose enumeration or a
sealed honesty cell — recorded human decline and proposal provenance each caught their own
§2-adjacent gap within their own review; effect-result notarization's did not, surfacing
only at this later fix wave.

**Task 3 (`5ee9d72`, `a131bca`, `385961b`) — the sanctioned enumeration closures.** Granted
by the maintainer 2026-08-21, in-session ("All three tasks, sanction granted"), for exactly
two sealed sites in `docs/concept/SPEC.md`, both previously-recorded findings this document
itself carried (see the "further finding … recorded, not fixed" paragraph in the
effect-result section above, now marked CLOSED): §2's field table and Profile-conditional
fields list gained a `resultDigest` row/entry, and §13's purpose-limitation vector list
gained the per-named-reviewer correction-rate vector (comparing `proposedDigest` against
`contentDigest`), with the aggregate-only rule preserved verbatim. No maturity marker MOVED
in the tracked-lineage sense — `resultDigest` was already `[PROVEN]` at its two home sites
(§4's `redeemed` row and §11.2's own subsection lead) — but the classification took two
further commits to settle: `5ee9d72` first classified the field under a new
"doubly-conditional" category and left its list entry unmarked; `a131bca` retired that
category on review (`findings`/`acks` share the identical admits-not-requires shape, so the
existing Profile-conditional-fields wording — a necessary-condition test, not a sufficiency
claim — already covers it) and folded `resultDigest` into the Profile-conditional fields
list alongside them; `385961b` then added `**[PROVEN]**` to that list entry on a further
controller ruling, correcting an earlier instruction that had reasoned any marker addition
there would itself be a marker move — restating a promotion already settled elsewhere is
not one.

**Cuts.** None recorded — this increment closed two previously-recorded gaps and caught up
three docset files; it introduced no new capability and cut nothing under
`docs/concept/CONCEPT.md` §7's anti-goal #4.

**Gate outputs, as measured against this increment's own exit commit (`385961b`)**:
`./node_modules/.bin/vitest run` — 54 test files, 751 tests, zero skips;
`tsc -p packages/record --noEmit` and `tsc -p packages/store-postgres --noEmit` — both
clean; `./node_modules/.bin/biome check .` — 119 files checked, zero errors or warnings;
`node scripts/contract-scan.mjs` — exit 0, no output; `node scripts/api-reference-sync.mjs`
— exit 0. `docs/process/deferral-register.md` carries no row for this increment and none
moved.

## Post-build-order increment — truth repairs (comment and record accuracy)

**The fifth post-build-order increment, exited.** Unlike the three capability increments
and the release-readiness reconciliation before it, this increment lands no behavior at
all: every task is a comment or documentation repair. No maturity marker moves, and none
could — `docs/concept/SCOPING-GUIDE.md` §7's spec-moves-to-truth rule moves a marker only
when behavior lands, and no `docs/concept/` file was touched. No sanction was sought and
none was needed. Design:
`docs/superpowers/specs/2026-08-22-truth-repairs-design.md`; plan:
`docs/superpowers/plans/2026-08-22-truth-repairs.md`.

**The gap this closed.** Ten claims in tracked source comments, test headers and this
repository's own increment record (`docs/superpowers/INDEX.md`) asserted a state the tree
had already left behind. Nine are one defect wearing nine faces — a capability's blast
radius reaches comments in files the capability itself never touches: the phase-2
packaging increment's `exports` map falsified three comments about a subpath that "does
not exist yet" (rows 1, 2, 5); the phase-4 store-postgres increment's adapter-author-surface
export of `transitionDigest` falsified a matching pair of "chain/encoding internals stay
unexported" claims — one inside `index.ts`'s own `MemoryStore` block (row 3) and one inside
`store/memory.ts`'s own `MemoryStore` doc comment (row 4 — missed by the plan's own task
decomposition and repaired late, at this increment's own exit review; see below); the
recorded-human-decline increment's seventh verification site
outgrew a "six
verification sites" count in three places (row 6); the findings flow (commit `970d837`)
added an `appendChainCompromise` caller the doc comment never named (row 8); and the
effect-result increment's `validateResultDeclaration` landed on top of a numbered
validation ladder that already stopped short of the body (row 9). Row 7 is a different
defect, named apart rather than folded into that count: not a claim later falsified, but a
pin asserted to exist — "byte-preserved (pinned by `construction-validation.test.ts`)" —
that never did. Row 10, `INDEX.md`'s own "Counted at write time" hedge, was stale since the
day after it was written; it is the one row among the ten that is countable and therefore
gatable — unlike rows 1–9, which are prose claims that stay ungated by design (no comment-
assertion machinery exists here to gate them), `docs/process/next-phases.md` already named
this class before this increment existed ("no scan reads a prose enumeration").

**Task 1 (`cd0da5a`) — rows 1, 2, 3, 5, the exports-map family.** Four comments in
`packages/record/src/probes/index.ts`, `packages/record/src/index.ts` (two sites) and
`packages/record/test/public-surface.test.ts` were rewritten to state what the manifest
actually declares: an `exports` map carrying both `.` and `./probes`, a `files` array
whose first entry is `dist` (so no deep import into `src/` survives publication), and
`transitionDigest` as the one `chain/encoding.ts` name the entry point re-exports, kept for
`@vidimera/store-postgres`'s own use. The `index.ts` `MemoryStore` block's PRE-1.0
instability marking was preserved verbatim across the edit — the one trap the task's own
brief called out by name.

**Task 2 (`ca2fd67`, `28a18d8`) — rows 6, 8, the stale counts.**
`packages/record/src/operator-surface.ts`'s header, `packages/record/test/signing-enforce.test.ts`'s
header, and four present-tense sentences across three sites in this document's own step-8
and row-14 accounts said "six verification sites"; a seventh site — `kernel/decline.ts`,
added by the recorded-human-decline increment — makes seven. The four sentences here were
repaired by pinning each to the increment where six was actually true, in the past tense,
rather than by bumping the number to seven — six was never wrong for the moment those
sentences describe. `kernel/finalize.ts`'s `appendChainCompromise` doc comment gained the two callers
it never named (`kernel/decline.ts`'s `decline()`, `kernel/findings-seams.ts`'s shared
prologue), bringing the stated total to five. A fix round (`28a18d8`) corrected a new
sentence this same task introduced and got wrong: "the findings seams append only from
`open`" is false — `findings-seams.ts`'s chain-verify rung runs before its state rung, so a
signature-broken chain over a `confirmed` or `redeeming` findings-declaring record reaches
the same append carrying that state, already a member of the function's own candidate
list. The corrected sentence cites SPEC §5 ("Verification is first") beside the ordering
claim it supports.

**Task 3 (`b5ea416`) — rows 7, 9, `config.ts`'s two self-contradictions.** Row 7: the
GOVERNED message's head was never pinned by any test — `construction-validation.test.ts`
names it only in its own header and in two `assert.doesNotMatch` negatives, which assert
that a STRUCTURAL error is not the governed string. Per the design's own ruling, the
comment is corrected to say the head is unpinned; no pin was added, because whether the
head SHOULD be byte-preserved is a decision about the GOVERNED message contract, out of
this increment's scope — **row 7 is corrected, not satisfied.** Row 9: `validateProfile`'s
numbered ladder gained rungs 4a (`validateResultDeclaration`) and 5a (the
`signing`-must-be-`true` guard), two profile-level steps the list never reached, and rung 6
gained `validateDecline` in its true position — fourth of six, between eligibility and
freshness — correcting "all five after" to "all six after". The same comment's
AL2-freshness tail said `governedUnavailable` serves two throw sites where the comment
directly above `governedUnavailable` itself already said four; four is correct, and the
tail now names all four (`kernel/open.ts`, `kernel/finalize.ts`, `kernel/decline.ts`,
`kernel/redeem.ts`'s shared `validateRedeemOptions`), matching the count stated once
elsewhere in the same file. **`governedUnavailable` itself was not touched** — no
construction guard added or removed — and remains live at exactly these four call sites,
none naming a not-yet-enforceable field.

**Task 4 (`5ed1218`, `144df9e`) — row 10, the gate, and the seven enumerations it
falsifies.** `scripts/docs-index-sync.mjs` checks two things about
`docs/superpowers/INDEX.md` and no more: that every tracked file in
`docs/superpowers/specs/` and `docs/superpowers/plans/` is named somewhere in the index
(`file-not-indexed`), and that the index's stated counts for `specs/`, `plans/` and
`docs/analysis/` match the tracked file counts (`count-mismatch`/`count-absent`). Silent
exit 0 when clean, one finding per line on stderr and exit 1 otherwise, mirroring
`api-reference-sync.mjs`'s shape. **Its bounds, stated in its own header comment**: it
proves presence and arithmetic, never accuracy — a row carrying the wrong date, the wrong
increment name or the wrong build-order step passes; a file named only inside an unrelated
sentence counts as named. **A further bound stated plainly here rather than left for a
reader to assume otherwise: `contract-scan` globs only `*.ts`/`*.mts`/`*.cts`, so it never
reads `.mjs` at all — the gate script and its own test file
(`scripts/test/docs-index-sync.test.mjs`) are themselves checked by no gate in this
repository.** The first run against the real tree found ten untracked-in-index files and
three count mismatches (specs stated 24, tracked 30; plans stated 27, tracked 33; analysis
stated 1, tracked 16); the repair added five table rows, one per post-build-order
increment's spec/plan pair (recorded human decline, proposal provenance, effect-result
notarization, this increment, and the sibling byte-regression-pins increment), retired the
"Counted at write time" hedge now that the count is gated, and rewrote the
`docs/analysis/` paragraph to state the measured count rather than name a single file. The
gate is wired into `package.json`'s scripts, `.github/workflows/ci.yml`'s `checks` job, and
`.github/workflows/release.yml`'s gate block, in the same commit as the seven prose
enumerations it would otherwise falsify (`CONTRIBUTING.md`'s fenced gate list and its
`scripts/` table row; `CLAUDE.md`'s Commands list and its CI-description sentence;
`README.md`'s dev block; `docs/process/release-checklist.md`'s single-line gate command;
`.github/workflows/release.yml`'s own "every gate the repository has" block) plus one
over-broad present-tense sentence in `docs/process/next-phases.md` ("no scan reads a prose
enumeration or a sealed honesty cell") narrowed to name the class more precisely now that
`docs-index-sync` reads part of what that sentence used to say nothing read. A fix round
(`144df9e`) corrected two further over-broad sentences the review caught: `INDEX.md`'s new
`docs/analysis/` paragraph had claimed of all 16 files what was true of only one — that
each is superseded, fixed elsewhere, or purely historical — when the two sealed-set
sanction records ARE the sanction, and `CHANGELOG.md` and `CLAUDE.md` both cite specific
analysis files as live authority, so the tail sentence was deleted rather than replaced
with a different sweeping claim; and `next-phases.md`'s "the concept set's last"
(describing the operator-assurance marker move) was narrowed to "the build order's last",
since three post-build-order marker moves followed it — the sentence's own "six
marker-move commits in total" count was untouched, being correct in its own explicitly
build-order-scoped count.

**Row 4 — missed by the plan, caught at exit review, repaired here.** The design document
lists row 4 as `packages/record/src/store/memory.ts`'s `MemoryStore` doc comment, which
said chain/encoding internals "remain unexported", naming `transitionDigest` explicitly —
false for the same reason row 3 was, before Task 1's repair: `index.ts` re-exports
`transitionDigest` (confirmed again at this repair: `grep -n "from './chain/encoding.js'"
packages/record/src/index.ts` prints exactly that one line), and
`@vidimera/store-postgres`'s `PostgresStore` reaches it only that way — its only route to
it. Stale since the same phase-4 store-postgres increment's adapter-author-surface
amendment that produced row 3 (commit `bb87ad0`, per the design document). **This is not a
row the plan chose to leave for later — it is a gap in the plan's own coverage**: the
design document's row table enumerates ten rows, but the plan's four repair tasks name only
nine of them in their file lists (Task 1's own heading and file list cover rows 1, 2, 3 and
5; Task 2 covers 6 and 8; Task 3 covers 7 and 9; Task 4 covers 10), while the same plan's
self-review notes assert "Design rows 1–5 → Task 1" — a coverage claim the task's own,
narrower scope did not deliver. Row 4 was never touched by any of the four repair tasks'
commits (`git diff main -- packages/record/src/store/memory.ts` showed no change at this
increment's first exit-review pass), was caught at that review, and is repaired in this
same exit commit: the comment now names `transitionDigest` as the one exported
chain/encoding internal (the adapter-author surface `@vidimera/store-postgres` needs) and
`genesisPrevHash`/`encodeTransition` as the two that stay unexported, matching `index.ts`'s
own parallel repair (commit `cd0da5a`) word for word in structure. This is recorded plainly
as an instance of the very enumeration defect this increment exists to close, found this
time inside the increment's own plan rather than inside the tree the plan was written to
fix — not softened to a mere footnote.

**Cuts.** None. This increment repaired all ten of its enumerated rows — nine inside the
original four tasks' commits, the tenth (row 4) caught at exit review and repaired in this
same commit — and corrected, rather than satisfied, row 7; it introduced one new gate
script and cut no capability.

**Four items, parked rather than acted on** (recorded so none is silently discarded):
`.github/PULL_REQUEST_TEMPLATE.md` was deliberately not given the new gate — it lists a
curated subset of gates and already omitted `api-sync`, `lint`, `build` and `smoke`, so it
carries no completeness claim; the new fence lines added to `README.md` and
`CONTRIBUTING.md` break the comment-column alignment of their neighboring lines by two
characters, a cosmetic effect; `scripts/docs-index-sync.mjs`'s `analysisWordOne` branch
parses a "holds one file" phrasing that no longer occurs anywhere in the tree — harmless
today, but it means a future regression back to that exact phrasing would parse as count 1
rather than firing `count-absent`; and, restated here for completeness alongside the other
three, `contract-scan` not reading `.mjs` at all, so the new gate script and its test are
checked by no gate this repository has.

**Gate outputs, as measured against this increment's own exit commit**:
`./node_modules/.bin/vitest run` — 55 test files, 757 tests, zero skips;
`tsc -p packages/record --noEmit` and `tsc -p packages/store-postgres --noEmit` — both
clean; `./node_modules/.bin/biome check .` — 121 files checked, zero errors or warnings;
`node scripts/contract-scan.mjs` — exit 0, no output; `node scripts/api-reference-sync.mjs`
— exit 0; `node scripts/docs-index-sync.mjs` — exit 0. `docs/process/deferral-register.md`
carries no row for this increment and none moved — the design document's own "scope
bounds, not deferrals" ruling: nothing here is postponed with a trigger that would un-defer
it.

## Post-build-order increment — byte-regression pins

**The sixth post-build-order increment, exited (commits `87298d1`..`0fde92e`, closed by
this commit).** Landed no new GOVERNED capability and moved no maturity marker — this
increment is test-only: no `packages/*/src/` file and no `docs/concept/` file changed by
any of its own commits (proved below, not merely asserted). No sanction was sought and none
was needed. Design: `docs/superpowers/specs/2026-08-22-byte-regression-pins-design.md`;
plan: `docs/superpowers/plans/2026-08-22-byte-regression-pins.md`.

**The gap this closed.** `packages/record/test/byte-stability.test.ts` pins four digest
literals over exactly one chain — single-leg, `captureMode:'staged'` — covering three of
`TransitionKind`'s twelve members (`opened`, `consultation-recorded`, `confirmed`) and none
of seven conditional payload fields added by increments that landed after that pin was
written (`policyDigest`, `proposedDigest`, `tokenDigest`, `resultDigest`,
`priorRecordRefs`, `priorLegActors`, `supersedes`) — an eighth, `magnitude`
(`FindingRaisedPayload`/`AcknowledgedPayload`, `types.ts`), also post-dates the pin, but
`findings.test.ts` in this same directory deliberately asserts its ABSENCE rather than
pinning a value, so it is named here rather than folded into that count. `deriveStagedRef`
— a store key, not a transition — had no literal pin at all.

**What landed.** The prior seven commits on this increment created a new directory,
`packages/record/test/byte-regression/`, holding eight files: `fixtures.ts` (two
functions — `deterministicSeams`, the three injectable seams `now`, `mintId`, and
`tokenSource` every pin file drives `createWithClock` with, and `advanceableSeams`, the
same three plus a fourth `advance(ms)` knob that `terminal-refusals.test.ts` alone needs to
cross an expiry deadline; editing either moves every literal in the directory at once,
deliberately) and seven pin files, one per family:

- `staged-ref.test.ts` — `deriveStagedRef`'s one standalone literal; no transition kind
  reached.
- `confirm-declaring.test.ts` — a feature-declaring confirm, pinning `policyDigest` and
  `proposedDigest` inside a literal; no kind unreached by the frozen oracle.
- `declined.test.ts` — the recorded human decline, the first pin reaching `declined`.
- `findings.test.ts` — the findings write side, the first pins reaching `finding-raised`
  and `acknowledged`.
- `redemption.test.ts` — both redemption shapes, direct and token, pinning `tokenDigest`
  and `resultDigest`; the first pins reaching `redeeming` and `redeemed`.
- `terminal-refusals.test.ts` — three unrelated mechanisms under one header (the gate
  ladder's refusal, `kernel/expiry.ts`'s clock-driven lazy expiry, provoked by a read past
  the deadline rather than called directly, and `seal()`'s state-preserving cap); the
  first pins reaching `refused`, `expired`, `sealed`, `redemption-failed`.
- `multi-leg.test.ts` — `priorRecordRefs`, `priorLegActors`, and recovery's `supersedes`
  over a verified terminal predecessor minted locally in the same file; no kind unreached
  by the six files above.

After those seven pin files, every one of `TransitionKind`'s twelve members appears in at
least one absolute literal, and `deriveStagedRef` has one. This exit commit adds a ninth
file, `coverage.test.ts`, which pins no bytes of its own and instead asserts that claim
executably.

**The coverage proof.** `coverage.test.ts` makes the central claim executable: one test
concatenates the other eight files' source text (excluding itself) and asserts every
quoted kind name occurs somewhere in it; a second test asserts its own `ALL_KINDS` list
matches the `TransitionKind` union in `types.ts`, so a future kind addition fails loudly
rather than silently passing an out-of-date list. Its own header states the bound plainly:
it proves MENTION, not coverage and not correctness — a name in a label, a comment, or a
dead constant satisfies it, and no linkage to any pinned-literal array is checked anywhere.
It is a tripwire for a newly added kind going unpinned, never evidence that any kind
reaches a literal, and never evidence that a literal is right.

**The honest limit, stated once for the whole directory.** These pins prove non-drift,
never correctness: a pin freezes whatever encoding is there today, bug included, and a
future mismatch is a regression to adjudicate, not necessarily an error in the new code.
They are also, by construction, a different claim from `byte-stability.test.ts`'s four
literals: that file pins byte-COMPATIBILITY against the reference implementation this
kernel was adopted from, verified once and never regenerated; the files in this new
directory pin SELF-REGRESSION against encodings built entirely inside this repository,
where no external implementation exists to be compatible with. The two claims are filed in
separate files for that reason, and `byte-stability.test.ts` is untouched by this
increment.

**What stays outside, and why.** Combination coverage — the cross-product of declarable
features inside one chain (a declining, policy-drifting, proposal-provenance-carrying,
multi-leg record that also redeems with a result) — is a permanent scope bound and takes no
`docs/process/deferral-register.md` row: nothing could close it at any future date, so
there is no trigger that would un-defer it, and every register entry carries a trigger by
the register's own header. AL2 detached-signature sidecars are a different case:
`transitionDigest`'s input is `{recordId, seq, at, kind, payload, prevHash}` — no signature
field — so no chain pin here, or anywhere, reaches a sidecar, but a fixed key pair or the
0.1 cut is a real, nameable trigger, so that one DOES take a row: register row 19. The
highest row number any tracked document had ever used, before this row, was 18
(`grep -rnoE "register row [0-9]+|row [0-9]+" docs/process/ docs/superpowers/ CLAUDE.md`),
so this entry takes 19, the next number never yet used — recorded in the row's own text.

**The frozen oracle, proved rather than asserted.** `git diff main --
packages/record/test/byte-stability.test.ts` is empty across the whole branch, covering
both this increment and the sibling truth-repairs increment that landed first on it; no
file in the new directory imports from `../byte-stability`, and `byte-stability.test.ts`
carries no reference back to `byte-regression`. `git diff main --stat -- docs/concept` and
`git diff main --stat -- packages/store-postgres/src` are both empty. `git diff main
--stat -- packages/record/src` is NOT empty, but every line in it belongs to the sibling
truth-repairs increment's own recorded comment-only fixes (`config.ts`, `index.ts`,
`kernel/finalize.ts`, `operator-surface.ts`, `probes/index.ts`, `store/memory.ts`, all
landed before this increment's first commit): isolating the range from immediately before
this increment's first commit to its own exit shows zero `packages/record/src` change
(`git diff 87298d1~1..HEAD --stat -- packages/record/src` is empty).

**Cuts.** None. This increment added one new test directory and one gate-adjacent coverage
test; it cut no capability and left no family unbuilt.

**Gate outputs, as measured against this increment's own exit commit**:
`./node_modules/.bin/vitest run` — 63 test files, 794 tests, zero skips;
`./node_modules/.bin/tsc --noEmit -p packages/record` and
`./node_modules/.bin/tsc --noEmit -p packages/store-postgres` — both clean;
`./node_modules/.bin/biome check .` — 130 files checked, zero errors or warnings;
`node scripts/contract-scan.mjs` — exit 0, no output; `node scripts/api-reference-sync.mjs`
— exit 0; `node scripts/docs-index-sync.mjs` — exit 0. `docs/process/deferral-register.md`
gains one row for this increment: row 19, the AL2 detached-signature sidecar pinning
deferral.

## Post-build-order note — signature-enforcement coverage findings (documentation only)

**Not an increment: no `packages/*/src/` file changed, no test was written, and no
maturity marker moved.** An audit following on from the byte-regression-pins increment's
own AL2 sidecar work found that `kernel/decline.ts`'s rung (1) — its pre-seam chain-verify
and AL2 signature-layer check, and the `chain-compromise` append it guards — is
unexecuted by the entire test corpus: deleting the rung wholesale (reverted immediately
after) left the full suite at 63 files / 794 tests, 0 failures. Reading outward from that
finding turned up four further gaps in the same signature-enforcement surface: decline's
ladder-order test is missing its rung-(1)-beats-rung-(2) adjacent pair; three AL2
call paths (`acknowledge`'s shared prologue, `beginRedemption`, `completeRedemption`) are
exercised only hash-broken, never signature-broken; five of the seven signature-broken
sites this package does test assert the refusal code only, not the appended-or-withheld
edge shape; and a genuine code/spec question — whether decline's rung (1) running before
its own leg-declaration gate is a defect against that gate's stated byte-identity comment,
or SPEC §5's "verification is first" working as intended — is recorded **undecided**,
left for the maintainer to adjudicate rather than resolved here. The full account, all
five findings with their verbatim evidence:
`docs/analysis/2026-08-23-signature-enforcement-coverage.md`.

Two new deferral-register rows carry the four coverage findings forward: **row 20**
(decline's rung-(1) coverage gap) and **row 21** (the AL2 caller-input and
assertion-depth gaps), both triggered by the next increment that touches the code they
name, or the 0.1 cut, whichever lands first (row 20's trigger has since been
retriggered — twice — see the Finding E adjudicated section below). (**Updated
2026-08-23:** both rows have since RETIRED, at the AL2 signature-enforcement coverage
increment at the end of this document; row 22, opened there, is the only register row this
surface now carries.) The fifth finding —
the code/spec question — takes no row: it is a decision for the maintainer, not work a
future increment closes.
Gates remained green throughout: this record changed no gate output from the
byte-regression-pins increment's own exit measurement above.

## Post-build-order increment — Finding E adjudicated (byte-identity claim scoped, corner pinned)

**Adjudicated 2026-08-23, the same calendar day the signature-enforcement-coverage findings
record above raised it undecided.** Finding E asked whether `kernel/decline.ts`'s rung (1)
(pre-seam chain-verify) running before its own leg-declaration gate is a defect. The
maintainer's ruling: **not a defect**. The declaration gate's byte-identity claim is scoped
to the decline feature's own payload keys and transitions — the reading SPEC §4
(`SPEC.md:369-372`) already states: "Every profile-conditional key is present-iff-declared …
The invariant is over profile-declared features." A universal §5 `chain-compromise` edge is
neither a profile-conditional key nor a decline/findings transition, so it sits outside that
promise. The ordering itself is required by SPEC §5's "Mandatory pre-seam chain-verify"
(`SPEC.md:421-426`), and the exact competition between the chain-verify rung and a
declaration-conditional throw is adjudicated at decline's own section, SPEC §9
(`SPEC.md:652-658`: "The policy declared-iff-present throw fires at profile resolution,
which follows the chain load and its verification"). No behavior changes; no bytes move;
`docs/concept/` is untouched; no maturity marker moves.

**What was genuinely wrong, and is fixed here:** two throw messages — `kernel/decline.ts`'s
declaration gate and its identical twin, `kernel/findings-seams.ts`'s declaring check
(SPEC §10.2) — asserted the byte-identity claim without the qualifier that makes it true. A
one-site fix would leave the sibling standing, so both are reworded together to name the
scope and the §5 carve-out. The corner both messages glossed — a non-declaring leg over a
hash-broken chain — is pinned by a new test at each site
(`packages/record/test/decline.test.ts`, `packages/record/test/findings-seams.test.ts`),
each asserting the appended edge itself (refusal code, `transitionRef`, chain growth by
exactly one, the appended transition's `kind`), not merely the refusal code — Finding D of
the same findings record notes five of seven signature-enforcement sites assert the code
only, and this increment does not add a sixth. Verified by mutation, the reverse of the
findings record's own check: neutering `decline.ts`'s rung (1) now fails exactly the new
decline-side test (made and reverted on the working tree, the same discipline the findings
record used).

**`docs/process/deferral-register.md` row 20** is narrowed rather than retired: it named
the entire rung-(1) condition as unexecuted; after this increment the hash-broken disjunct
(`!report.intact`) executes and appends, while the AL2 signature-broken disjunct
(`!(await signatureLayerHolds(...))`) still does not, for this seam. The row keeps its
number, but its trigger does NOT: this increment's own message-only edit to
`kernel/decline.ts` fires the original trigger ("the next increment that touches
`packages/record/src/kernel/decline.ts`") without closing the deferred gap, so the row is
RETRIGGERED — the same house form row 5 (`docs/process/next-phases.md`) uses for a trigger
that fired without the deferred work landing. **This took two attempts.** The first
replacement trigger (fix round 1, commit `98584e1`) named the deferred work's own
completion — "the next increment that drives a signature-broken chain through
`decline()`'s rung (1)" — which is tautological: a trigger that fires exactly when the
work lands un-defers nothing, so in practice that wording left the row 0.1-cut-only. Fix
round 2 corrects it to a genuine prompting event: the next increment that touches AL2
signature enforcement at `decline()`'s rung (1), or that extends the shared AL2 signing
test rig to reach it — the same shape row 21 (this row's own sibling) already uses — or
the 0.1 cut. Full current trigger text: see the register row itself, and its verbatim
mirror in `docs/process/next-phases.md`, `docs/process/release-checklist.md`, and the
"Still outstanding" row 20 bullet above (all four moved together at fix round 2, so none
quotes a stale trigger). (**Updated 2026-08-23:** that third trigger DID fire as a
prompting event — the AL2 signature-enforcement coverage increment extended
`packages/record/test/helpers/signing.ts` to expose the sidecar, which the trigger names
— and the row RETIRED there. Its trigger text no longer stands in the register, the
release checklist, or the "Still outstanding" row 20 bullet above, all three of which are
now retirement notes; `docs/process/next-phases.md`'s own row-20 retirement section is
where that trigger is preserved verbatim.)

**Cuts.** None. **Register rows.** None added; row 20 narrowed AND retriggered (number
unchanged); rows 19 and 21 untouched.

**Gate outputs, as measured against this increment's own exit commit**:
`./node_modules/.bin/vitest run` — 63 test files, 796 tests, zero skips;
`./node_modules/.bin/tsc --noEmit -p packages/record` and
`./node_modules/.bin/tsc --noEmit -p packages/store-postgres` — both clean;
`./node_modules/.bin/biome check .` — 130 files checked, zero errors or warnings;
`node scripts/contract-scan.mjs` — exit 0, no output; `node scripts/api-reference-sync.mjs`
— exit 0; `node scripts/docs-index-sync.mjs` — exit 0.

## Post-build-order increment — AL2 signature-enforcement coverage

**The eighth post-build-order increment, exited (commits `dc2b9d9`..`5a1992c`, closed by
the register-and-record commit that followed them, then extended by two
documentation-repair commits: `126cf04`, which brought `signing-enforce.test.ts`'s header
into line with the coverage this increment gave it, and the truth-repair commit that closes
the range. Neither moved a figure, a test, or any `packages/*/src/` line — both are
comment and prose only, so the gate outputs recorded at the foot of this section stand
unchanged.)** The ordinal counts the sections above in order — recorded human decline,
proposal provenance, effect-result notarization, release-readiness reconciliation, truth
repairs, byte-regression pins, Finding E adjudicated — and does NOT count the
documentation-only signature-enforcement-coverage findings note between the last two, whose
own header says it is not an increment. **This increment landed no behavior and moved no
maturity marker.** No `docs/concept/` file changed, no sanction was sought and none was
needed. Its single `packages/*/src/` edit is comment-only, proved by diff rather than
asserted: `git diff 89e44ae --stat -- packages/record/src/` names exactly one file,
`packages/record/src/kernel/redeem.ts`, at 4 insertions and 3 deletions, and every changed
line in that diff is a JSDoc continuation. Design:
`docs/superpowers/specs/2026-08-23-al2-signature-enforcement-coverage-design.md`; plan:
`docs/superpowers/plans/2026-08-23-al2-signature-enforcement-coverage.md`.

**The gap this closed.** `signatureLayerHolds` has exactly seven call sites, one per file,
and the condition at every one of them is a short-circuiting disjunction —
`!verifyChain(chain).intact || !(await signatureLayerHolds(ctx, chain))`. A hash-broken
fixture therefore never calls `signatureLayerHolds` at all, so it exercises only the first
operand, and every coverage claim about such a rung must say which disjunct it means.
Measured before this increment, four of those sites had no signature-broken test at all
(`decline`, `acknowledge`, `beginRedemption`, `completeRedemption` — six cells rather than
four, since both token seams double on enlistment), and five of the seven sites that were
tested asserted the refusal code only, never whether the compromise edge appended or was
withheld. Decline additionally lacked the rung-(1)-beats-rung-(2) adjacent pair every other
seam ladder in this package pins, which belongs to no cell of that grid at all. Register
rows 20 and 21 carried those nine gaps; both retire here.

**What landed.** Test-only, two `src/` comments aside:

- `packages/record/test/helpers/signing.ts` — two new exports beside the frozen
  `signingSetup`, never a rewrite of it: `enforceableSigningSetup(profiles, opts?)`,
  returning `{ handles, store, signatures, calls }` so a fixture can reach the sidecar (the
  reason no signature-broken decline fixture could exist before) and so an enlisted cell can
  supply a `SqliteStore`; and `breakOneSignature(signatures, recordId)`, lifted from
  `signing-enforce.test.ts`'s file-local copy, gaining a guard that asserts the tamper
  actually changed the signature — the existing helper overwrote the leading four base64
  characters, a silent no-op on a signature that already began with them.
- `packages/record/test/signing-enforce.test.ts` — five new tests: signature-broken
  `decline()` on a declaring leg; the same on a NON-declaring leg, where rung (1) refuses
  before the declaration gate can throw; `acknowledge`, reaching the findings prologue
  through its second seam; and both token seams over a signature-broken chain, un-enlisted
  and enlisted, in one test apiece. Five existing refusal-code-only SITES — spread
  across three of the file's pre-existing tests, since two of those tests carry two sites
  each — were deepened in place to assert the edge shape.
- `packages/record/test/decline.test.ts` — the missing rung-(1)-beats-rung-(2) adjacent
  pair, added as a block inside the existing ladder-order test (a broken chain on a record
  also past its ttl: rung (2) would refuse `leg-expired`, rung (1) refuses
  `chain-compromise` first).
- `packages/record/test/signature-enforcement-sites.test.ts` — new: the call-site census.
- `packages/record/test/redeem.test.ts` — its inlined break helper repointed at the shared
  one, which it had duplicated byte-identically.
- `packages/record/test/signing.test.ts` — a comment recording why its own break helper is
  deliberately NOT folded into the shared one: it corrupts the TRAILING four base64
  characters where the shared one corrupts the leading four, so repointing it would quietly
  change which bytes that test exercises.
- `packages/record/src/kernel/redeem.ts` — the `src/` edits, comment-only and at TWO sites in
  the one function: a doc comment said ENLISTED callers were "today only direct redeem
  carries tx", which the increment that wired `tx` into the token seams falsified. All three
  redemption seams read `opts.tx`; the correction drops the dated "today", a claim with a
  shelf life and no way to fail loudly. The identical falsified parenthetical stood a second
  time some fifty lines below, on the enlisted-and-due clock branch, and was repaired in the
  same voice at this increment's own final review — on a fresh authorization that knowingly
  exceeds the increment's original one-`src/`-edit bound, since a one-site fix would have left
  the file asserting both claims at once. That is the same reasoning the Finding E
  adjudication recorded when it reworded its own pair of twin messages together.
- `docs/analysis/2026-08-23-signature-enforcement-coverage.md` — Finding F appended as a
  dated section, and three stale line pins corrected; eight further pins, staled by this
  increment's own test edits after those three were fixed, were re-derived at its final
  review, where Findings C and D also gained dated closure notes. Per that document's own
  established convention, the original framing is preserved and reconciled by dated notes
  rather than rewritten, so the history stays legible.

**The coverage proof.** Three mutations were run across the increment, and each proves
something narrower than "the new pins are load-bearing" — so each is recorded with its own
reach rather than pooled. First: neutering `kernel/decline.ts`'s AL2 disjunct — the
`signatureLayerHolds` half of rung (1)'s condition, its hash half left standing — failed
exactly the two new decline tests and nothing else, the revert confirmed clean. That is a
direct witness that those two pins hold the SIGNATURE arm rather than the hash one. Second:
injecting a probe mention of the enforcement helper into `chain/replay.ts` failed the census
naming that file, revert confirmed — the tripwire fires on a file that newly names the
helper. Third, and recorded for what it actually was rather than for what its failure count
suggests: `kernel/redeem.ts`'s ENLISTMENT branch was neutered (`if (tx !== undefined)`
rewritten to `if (false)`), NOT its signature disjunct. That failed exactly five tests — the
new enlisted test, two in `redeem-token.test.ts` and two in `redeem.test.ts` — every one of
them throwing "cannot start a transaction within a transaction", revert likewise confirmed.
What it proves is that the result-first, no-edge shape is load-bearing at all three
redemption seams, which is worth having and is not a claim about AL2: three of those five
failures are hash-broken fixtures (`redeem-token.test.ts`'s two enlisted tamper tests and
`redeem.test.ts`'s enlisted chain-compromise test, each built through `TamperingStore` with
`tamperNonLast`), which no signature disjunct could reach.

**The pins with no mutation witness, named rather than left to inference:** decline's
rung-(1)-beats-rung-(2) adjacent pair, the `acknowledge` pin, all five deepened sites, and
all four token-seam cells. The token cells need their case spelled out, since the third
mutation did touch two of them: the UN-enlisted `beginRedemption` and `completeRedemption`
cells had no mutation contact whatever — an `if (false)` on the enlistment branch cannot
reach a path that carries no transaction — and the two ENLISTED cells' only contact
witnessed the no-edge shape, never the AL2 arm. So no mutation anywhere in this increment
witnesses the signature disjunct at the redemption prologue. They rest on the structural proofs below and on what
they assert, which is weaker evidence than a mutation and is recorded as such.

**The structural proofs, and where they stop.** Each of the seven new signature-broken cells
asserts `verifyChain(before).intact === true` before the seam call, so its refusal cannot be
the hash disjunct wearing the signature disjunct's name; and each reads the verifier-call
counter as a DELTA across the seam call, never as a total — `verifySignatures()` consults
the verifier itself, so a bare "calls above zero" would pass vacuously. The delta is the only
mechanical proof that the signature disjunct ran. The five deepened sites carry no
intactness guard of their own: they inherit fixtures whose chains are untampered by
construction, so the property holds there without being stated. Two of them — the
cross-record claims `verifyPriorLegs` and `verifySupersedes` — do now read the delta, added
at this increment's own final review, because each folds several distinct causes (an absent
or non-terminal predecessor, a head mismatch, a `subjectRef` mismatch, a hash break, a
signature break) into one refusal code, and without the delta either test could have gone on
passing for the wrong reason.

**The honest limit.** The census proves NAMING, not testing. It is a source-text scan
comparing the set of files that call `signatureLayerHolds` against a pinned list of seven,
so an eighth site fails it on the day it lands — but it cannot tell whether a listed site's
test still asserts anything, and gutting an existing pin leaves it green. Its own header
says so. Second, and narrower than the coverage claim sounds: **every signature break in
this increment is a tampered sidecar entry at the genesis transition.** A missing entry, an
unresolvable key reference, a throwing verifier, and a break at a non-genesis transition are
separate inputs, and this increment added not one of them. Two were already covered and are
left exactly as covered as they were: one existing test deletes a sidecar entry, and one
re-keys an entry to a registry miss. **The other two are covered nowhere at all.** No test
anywhere breaks a non-genesis entry — every mutation site in the corpus takes the first
entry. And no test anywhere supplies a verifier that throws or rejects: every `Verifier` in
the corpus returns a boolean, and the one throwing seam in the signing tests is a SIGNER,
pinning the sign-before-append order, which is a different seam proving a different
property. Third, and found by this increment's own review rather
than claimed away: **no signature-broken cell tied the returned transition reference to the
appended edge's own digest** (over-broad as first written even then — the hash-broken cell
had the equality pinned at chain-verify.test.ts since the step-1 corpus). The assertions
accepted any defined value, so a wrong digest would have passed; an independent probe
confirmed the equality held, and the truth-restoration increment (2026-09-01) upgraded all
nine cells to equality against the chain head. Fourth,
these tests prove enforcement, never that the enforcement is the right policy.

**What stays outside, and why.** The orphan-growth finding takes register **row 22** rather
than a fix. `appendChainCompromise` rebuilds its `refused` transition on every call and the
signing decorator signs before delegating to the store, so on a record whose state admits no
CAS candidate each refusing call mints a sidecar entry naming a transition that never lands.
It is not fixed here because the containment either special-cases a path five call sites
share, or reopens the sign-before-append order the signing decorator pins deliberately —
and inverting that order would reintroduce exactly the landed-but-unsigned transition the
AL2 enforcement increment made fail closed. That is its own increment with its own design,
not a change to make in passing while closing a coverage row. **Behavior on a durable
`SignatureStore` backing is UNMEASURED**: the probe covered the in-memory reference backing
only, and the durable case is where "unbounded" would actually matter. The row says so in
its own text. Also outside: every cell of the seam and break-kind grid that neither row
named — coverage here is bounded to what the rows name, because a row retires when its own
behavior lands and inventing adjacent work would blur which; a fix for the three
near-duplicate break helpers beyond pointing two of them at one shared function; and any
byte-regression pin over this surface, since the digested transition shape carries no
signature field and no byte literal can distinguish a signed compromise edge from an
unsigned one. (**Reconciled 2026-08-29:** the orphan-growth deferral stands — file-don't-fix
was the right act — but the reason this paragraph records for it is withdrawn as an
EXHAUSTIVE disjunction: a signer-result memo keyed by transition object identity sits on
neither horn and closes the redundant-signing half, and the only measured containment for
the orphan half sits on a THIRD horn the sentence never named, predicting C3 and C4 from a
chain that failed verification by construction. Row 22 was restated 2026-08-28 by the row-22
truth-repairs increment with a measured containment inventory; its redundant-signing half,
22b, retires on behavior at the no-edge containment increment, which re-scopes the row to
its orphan half, 22a, rather than retiring it. The paragraph stays as this increment wrote
it, its reasoning true to what was known at its own writing. Full account:
`docs/analysis/2026-08-24-no-edge-containment-investigation.md`.)

**The frozen files, proved rather than asserted.** `git diff 89e44ae --
packages/record/test/byte-stability.test.ts` produces no output — the frozen oracle never
moved. `git diff 89e44ae -- packages/record/test/helpers/signing.ts` shows only appended
exports and import-block additions; `signingSetup`'s own body is byte-identical, which
matters because its fixed clock is load-bearing for `decline.test.ts`'s
eligibility-freshness fixture and three test files build on it.

**Cuts.** None. This increment closed two coverage rows, added one census test, and cut no
capability.

**Gate outputs, as measured against this increment's own exit commit**:
`./node_modules/.bin/vitest run` — 64 test files, 802 tests, zero skips;
`./node_modules/.bin/tsc --noEmit -p packages/record` and
`./node_modules/.bin/tsc --noEmit -p packages/store-postgres` — both clean;
`./node_modules/.bin/biome check --error-on-warnings .` — 131 files checked, zero errors or
warnings; `node scripts/contract-scan.mjs` — exit 0, no output;
`node scripts/api-reference-sync.mjs` — exit 0; `node scripts/docs-index-sync.mjs` — exit 0.
`docs/process/deferral-register.md` loses two rows and gains one: rows 20 and 21 retired,
row 22 opened.

## Post-build-order increment — Row 22 truth repairs

**The ninth post-build-order increment, exited (commits `e306673`..`062a3cb`, closed by the
record commit that follows them).** The ordinal counts the sections above in order and, as
the eighth did, does NOT count the documentation-only signature-enforcement-coverage
findings note, whose own header says it is not an increment. **This increment landed no
behavior and moved no maturity marker.** No `docs/concept/` file changed, no sanction was
sought and none was needed. No `packages/` file was touched at all, proved by diff rather
than asserted: `git diff f6f2180 --stat -- packages/` — `f6f2180` being the commit this
increment's first task started from — produces no output, and the test figures are
identical before and after (64 test files / 802 tests, of which the record project is 60 /
737 and the store-postgres project 4 / 65). It is the first of a three-increment sequence
authored together on 2026-08-24 — this one, then the sidecar contract, then the no-edge
containment — each of whose plans checks that its predecessor landed before it starts.
Design: `docs/superpowers/specs/2026-08-24-row-22-truth-repairs-design.md`; plan:
`docs/superpowers/plans/2026-08-24-row-22-truth-repairs.md`.

**The gap this closed.** Register row 22 was opened by the increment above with its
containment's cost estimated rather than measured, and the estimate was wrong in the same
way in five documents: the row said the fix "either special-cases a path five call sites
share or reopens the deliberately pinned sign-before-append ordering", an exhaustive
disjunction. A later investigation measured every candidate and found the disjunction
non-exhaustive without finding the containment unconstrained — one family (a signer-result
memo keyed by transition OBJECT identity) sits on neither horn and closes the
redundant-signing half; the only measured family for the orphan half sits on a THIRD horn
the sentence never named, predicting the store's C3 and C4 answer from a chain that failed
verification by construction, and was measured to suppress a compromise evidence edge that
lands today. The design's inventory carries twelve corrections and one finding (its row 13,
the third horn); its row 12 is a clarification listed apart so it does not inflate the count
of things that were wrong. Deferring was the right act throughout — the investigation's
own decisive result is that the record project passes with a signature-destroying change's
new branch firing zero times, so the corpus cannot adjudicate this family and a containment
needs its own pins — but the reason recorded for deferring was not, and a register that
states a wrong reason with the authority of the tree is the thing this increment corrects.

**What landed.** Markdown only, in four commits:

- `docs/analysis/2026-08-24-no-edge-containment-investigation.md` — new. The record every
  corrected site points at: the measurements, each figure naming the rig that produced it
  and stating that the rig is gone (every scratch fixture and prototype arm was reverted),
  or that it is one of two marked exceptions reproduced against the current tree; the
  zero-firing result in its own paragraph; the containment inventory with each family's
  horn; and an explicit list of what the investigation did NOT establish. The filing-time
  corpus census (72 / 64 / 68) is withdrawn there as arithmetically irreconcilable, with the
  re-derivation method stated, and is carried nowhere as a live figure.
- `docs/superpowers/INDEX.md` — the `docs/analysis/` count 17 → 18. The sequence's three
  spec/plan rows and the 34 / 37 counts had already landed with the authoring commits
  (`e08a1da`..`f6f2180`), each pair whole, so no `plan pending` state was ever written.
- `docs/process/deferral-register.md` — row 22 replaced whole and RESTATED: same number,
  write-time row-number derivation carried verbatim with one appended restatement clause;
  the 22a/22b decomposition, proven independent by double dissociation; the ordinary
  key-retirement reachability; "never visited" corrected to "never produces a verdict — but
  IS visited"; the third sidecar-driven reader named as a separate finding; the containment
  inventory in place of the dilemma, which is withdrawn as EXHAUSTIVE rather than as wrong;
  horn 2 restated by its hazard (any change that makes a sidecar entry's survival conditional
  on the append's outcome) rather than by one mechanism. The trigger grew from 248 to 613
  characters and gained three disjuncts: `signOne` (the memo changes it without changing the
  ordering, so the old wording would not have fired), a cost-bearing `Signer` (the condition
  that makes 22b material, which nothing named), and publication (a durable backing arrives
  in an operator's deployment through the documented `signatures:` hook, where no in-repo
  event fires — a clarification of which event matters, never earlier than the 0.1-cut
  disjunct already present).
- `docs/process/next-phases.md` — the dilemma paraphrase replaced; the two reader findings
  recorded with their scheduled home (the sidecar-contract increment) so they stay out of
  the register without being lost; the trigger, pasted from the register.
- `docs/process/release-checklist.md` — the row-22 disposition item restated for a reader
  arriving cold on release day: two defects, a containment identified and scheduled BEFORE
  the cut, the trigger, and a "Note before ruling" that now says the durable-backing
  unmeasurability is a coverage bound and not a mitigation.
- `docs/process/implementation-status.md` — four Tier 1 sites corrected in place (the
  increment bullet, the live-rows clause, the "Still outstanding" bullet, the boundary
  paraphrase — which stays a paraphrase, not a fifth verbatim copy); one Tier 2 inline dated
  note appended to the coverage increment's "What stays outside, and why" paragraph; and
  this section.
- `CLAUDE.md` — the live-rows sentence, outside `docs/process/` and therefore outside every
  completeness sweep in this sequence, corrected to the row's new title.
- `docs/analysis/2026-08-23-signature-enforcement-coverage.md` — a dated reconciliation
  note appended to Finding F; every pre-existing line byte-identical.

**The twelve corrections, accounted.** Design rows 1, 2, 9 and 10 (the dilemma's
exhaustiveness, the "special-cases" mis-description, the trigger's unreachable
durable-backing disjunct, the unnamed signing-cost condition) landed in the restated row
and its four living trigger copies. Rows 3, 4, 5, 6 and 7 ("never visited", the two-consumer
claim, the misleading per-candidate cost and the withdrawn census, the sealed record as
canonical shape, the attacker-only framing) landed in the row, the four `implementation-status.md`
Tier 1 sites, and the two Tier 2 notes. Row 8 (unmeasured-as-mitigation) landed in the
release checklist's corrected note and the row's own UNMEASURED clause. Row 11 (the
uncommented cardinality assertion) is recorded below and discharged by the next increment.
Row 12 (the enlisted exemption's scope) is confirmed rather than corrected, in Finding F's
note. Row 13, the third horn, is recorded everywhere the dilemma was.

**The three tiers, and why two documents were deliberately not touched.** Tier 1 — the
living records — was corrected in place. Tier 2 — the coverage increment's own section in
this document and Finding F in its analysis record — was PRESERVED and reconciled by dated
notes, in this document's own convention ("the original framing is preserved and reconciled
by dated notes rather than rewritten, so the history stays legible"); `git diff -U0` at that
commit shows zero removed lines in the analysis record and exactly one in this document,
the paragraph's own final line re-added with the note appended, and both original dilemma
sentences — "ordering" in the analysis record, "order" in this document's coverage section —
still occur exactly once. Tier 3 —
`docs/superpowers/specs/2026-08-23-al2-signature-enforcement-coverage-design.md` and
`docs/superpowers/plans/2026-08-23-al2-signature-enforcement-coverage.md` — was not touched
at all, per `docs/superpowers/INDEX.md`'s own rule that spec/plan pairs are
historical and unmaintained. **The trigger therefore has four living copies and one frozen
one.** The Tier 3 copy at the coverage plan's line 985 deliberately still reads the old
248-character text. A future sweep comparing all five will find them divergent; the
divergence is correct, and this paragraph is where a reader learns that. The proof that the
four living copies are byte-identical is a whitespace-collapsed programmatic comparison,
never an occurrence count — the register line contains the trigger phrase twice and counts
once, and a `docs/process/` glob cannot see the Tier 3 copy.

**Row 22 is restated, not split and not retired.** It keeps its number and stays in the
table; the register's own rule is that an entry leaves only when the behavior lands or the
deferral is explicitly retired, and neither happened here. The redundant-signing half, 22b,
retires on behavior at the no-edge containment increment, which re-scopes the row to its
orphan half, 22a; 22a stays open on the third horn, with no candidate that escapes it. The
row's date cell reads `2026-08-23 (restated 2026-08-28)`.

**One correction is recorded here and discharged elsewhere.** The cardinality assertion at
`packages/record/test/signing-enforce.test.ts:98-102` — the file's first test, asserting
sidecar entries equal chain length after one refusing `finalize()` — carries no comment
saying why that equality holds only after exactly ONE refusing call, while three siblings in
the file do. It is not annotated by this increment, because the hazard the annotation would
state is the hazard the no-edge containment increment removes; the annotation lands with the
behavior change, in the increment that owns it.

**Deviations from the plan as written, stated rather than smoothed over.** Four, none of
them a change of substance. (1) Dates: the plan pre-wrote `2026-08-24` for the row's
restatement and for both reconciliation notes, assuming same-day execution; the
restatement landed 2026-08-28 (`9fc914a`) and the notes 2026-08-29 (`062a3cb`), and each
carries its actual landing date, since a false date is exactly the defect class this
increment corrects. (2) The plan's release-checklist step and Tier 2 note step both said the
row "is gone" / "will retire on behavior" at the containment increment; the plan's own
Global Constraints and the containment design keep the row in the table with 22a open, so
both sites say 22b retires and the row is re-scoped. (3) The plan's Task 2 Step 8 expected
exactly four modified paths; five were modified, because the same task's Step 6a adds
`CLAUDE.md`. (4) In the analysis record, the `SignatureStore` contract sentence is quoted as
its two contiguous fragments rather than whole: it wraps a ` * ` comment-leader line break in
the source, so the whole-sentence quote is present in the source and invisible to the
whitespace-collapsed check this repository uses — the standing citation trap, met in a new
form.

**The honest limit.** Nothing in this increment is gated by anything that can fail. Every
figure it wrote down was measured, and the analysis record says per figure that the rig is
gone; the only figures reproducible from the tree today are the baseline test counts, the
candidate arithmetic read from `kernel/finalize.ts`, and the two sidecar-driven reader
measurements. Markdown is citation-checked by nothing, so every quoted phrase and SPEC
section number was hand-verified against a whitespace-collapsed copy of its source, and that
verification is not repeatable by a gate. The two reader defects the investigation found are
recorded and still OPEN in the tree at this exit; the sidecar-contract increment closes them.
The census stays withdrawn; nothing here re-derives it. And the deferral's stronger
justification — that a green suite is a null result in this area — is a limit on every
future claim about this path, including the next increment's.

**What stays outside, and why.** The design's scope bounds, decisions rather than deferrals,
none given a register row: the defect itself, which row 22 stays open for; the annotation at
`signing-enforce.test.ts:98-102`, discharged by the next increment; hardening the two
sidecar-driven readers, which the sidecar-contract increment owns; the tolerate-and-prune
sentence in `packages/record/src/signing/store.ts` and its guide counterpart, same owner;
and the row-number derivation parentheticals in rows 19 and 22, which are write-time
records and were carried verbatim rather than re-run. No deferral-register row was written
or retired.

**Cuts.** None. This increment corrected a record and cut no capability.

**Gate outputs, as measured against this increment's own exit commit**:
`./node_modules/.bin/vitest run` — 64 test files, 802 tests, zero skips;
`./node_modules/.bin/tsc --noEmit -p packages/record` and
`./node_modules/.bin/tsc --noEmit -p packages/store-postgres` — both clean;
`./node_modules/.bin/biome check --error-on-warnings .` — 131 files checked, zero errors or
warnings; `node scripts/contract-scan.mjs` — exit 0, no output;
`node scripts/api-reference-sync.mjs` — exit 0; `node scripts/docs-index-sync.mjs` — exit 0.
`docs/process/deferral-register.md` loses no row and gains none: row 22 restated in place.
`git diff f6f2180 --stat -- packages/` — no output.

## Post-build-order increment — Sidecar contract

**The tenth post-build-order increment, exited (commits `f953d0f`..`3ab669d`, closed by the
record commit that follows them).** The ordinal counts the sections above in order and, as
the last two did, does NOT count the documentation-only signature-enforcement-coverage
findings note. **This increment landed no behavior change to the record's own semantics
and moved no maturity marker.** No `docs/concept/` file changed, no sanction was sought and
none was needed. No interface gained or lost a member: `SignatureStore` keeps `put` and
`listByRecord` exactly as they were. Exactly two `packages/*/src/` files changed, proved by
`git diff 53ec4f6 --name-only -- 'packages/*/src/*'`: `packages/record/src/probes/probes.ts`
(the one behavior change — an operator-assurance probe picks its victim through the chain)
and `packages/record/src/signing/store.ts` (comment only — the contract states an
obligation it had left unstated). It is the second of the three-increment sequence authored
2026-08-24, after the row-22 truth repairs and before the no-edge containment; its plan
checked that the analysis record the first increment created exists before starting.
Design: `docs/superpowers/specs/2026-08-24-sidecar-contract-design.md`; plan:
`docs/superpowers/plans/2026-08-24-sidecar-contract.md`.

**The gap this closed.** `packages/record/src/signing/store.ts` already told a CALLER how to
read the sidecar — `listByRecord` returns entries "chain order not guaranteed", and the
caller correlates by digest, "chain-driven, never sidecar-driven" — but two readers in this
repository did the reverse, one of them in production source, and the contract told an
IMPLEMENTER nothing about the entries it would actually receive. The `signature-tamper-refuses`
operator-assurance probe took `listByRecord`'s first element as its tamper victim; under a
contract-legal orphan-first ordering it garbled an orphan, every real signature survived, its
attacking `finalize()` reached the state guard instead of the signature gate, and it returned
a **FAIL against a sound build** — the one verdict that tier exists never to produce. The
corpus's shared `breakOneSignature` helper used the same positional idiom; under the same
ordering it tampered the orphan while BOTH of its own guard assertions passed, so the fixture
proved nothing and the eleven tests depending on it — fourteen call sites, since three tests
break more than one record — went green. Both defects were found by
the no-edge containment investigation
(`docs/analysis/2026-08-24-no-edge-containment-investigation.md`) and recorded by the row-22
truth repairs as open findings with a named home; this increment is that home.

**What landed.** Three commits — one deliberately red, two green:

- `packages/record/test/sidecar-ordering.test.ts` — new, committed RED first (`f953d0f`), the
  increment's one sanctioned red commit. An `orphanFirst(inner)` `SignatureStore` wrapper
  returns a fabricated orphan entry ahead of every real one — contract-legal, ID-agnostic
  because the probe mints its own record after `makeConfig()` has handed the store over, and
  re-entrancy-guarded so a positional reader's write-back can never make `listByRecord` return
  two entries for one digest, which would make the store illegal rather than merely
  adversely ordered. Two pins drive it: the probe must PASS against a sound build, and the
  helper must change the GENESIS entry's signature. Both failed at that commit exactly as the
  defects predict — the probe reporting `record-not-open` where it expected
  `chain-compromise`, the helper leaving the genesis untouched — and both went green when
  each reader was fixed.
- `packages/record/src/probes/probes.ts` — the probe takes its victim's digest from
  `handles.operator.verifySignatures(recordId)`, a chain-driven read it already had, and
  looks THAT digest up in the sidecar. Two new failure arms, each exercised by forcing it and
  reverting: `no signed transitions`, and `no sidecar entry` — the second commented as
  unreachable on a sound build, since `layerVerdicts` marks a transition signed only when the
  sidecar holds its entry; it guards a store that changes its answer between two reads.
- `packages/record/test/helpers/signing.ts` — `breakOneSignature(signatures, recordId, store)`
  reads the genesis transition from the chain and tampers the entry whose digest matches. A
  correlation change, not a target change, and the claim is measured: on a clean signing
  flow `entries[0].transitionDigest === transitionDigest(chain[0])` after stage/open/finalize,
  so every existing fixture breaks the same entry it always did. The first parameter widened
  from the `MemorySignatureStore` CLASS — nominal, through its private field — to the
  `SignatureStore` interface, without which no wrapping store could be passed at all.
  `signingSetup`, frozen by the AL2 signature-enforcement coverage increment in this same
  file, proved byte-identical by a hash over its own extracted text before and after
  (`b50b3798785ce8415e6e27610fb718347046d7ec`) — a narrower proof than that increment's
  whole-file diff, chosen because a whole-file diff is unavailable when the file must change.
- **Fourteen call sites**, thirteen in `packages/record/test/signing-enforce.test.ts` and one
  in `packages/record/test/redeem.test.ts`, each now passing the store of the SAME rig whose
  sidecar it passes — destructurings widened to include `store`, the enlisted `redeem` site
  passing its `sqlite`. The specific mis-edit the compiler cannot catch: `a.signatures` paired
  with `b.store` type-checks and tampers the wrong record, surfacing as a distant seam test
  reporting the wrong outcome. The whole record project was run after the batch and its
  failures read rather than counted; there were none. One over-widened destructuring with no
  break call in scope was caught by Biome's unused-variable warning and reverted.
- `packages/record/src/signing/store.ts` — the `SignatureStore` doc gains the
  implementer-facing half: `AN IMPLEMENTER MUST TOLERATE ORPHANS`, why they exist (the
  decorator signs before delegating; a refusing seam against a record admitting no append
  target leaves one per call), why they are inert (verification is chain-driven), that they
  are safe to prune when no chain transition references them, and that the library performs
  no pruning and cannot say which entries are dead. No `remove` method was added: the
  obligation is stated, the mechanism stays the implementer's. That capitalised sentence is a
  cross-increment interface — the no-edge containment plan's premise check greps for it — and
  is byte-identical to what that plan expects.
- `docs/guide/api-reference.md` and `docs/guide/integrating.md` — moved in the same commit as
  the source, as a decision rather than an obligation misread: `CLAUDE.md`'s same-change rule
  fires on an interface member moving, and none did, but the reference quotes the interface
  verbatim and would otherwise reproduce a contract that no longer matches its source. The
  quote now carries both of the source's bounds (upsert-by-digest with at most one entry per
  digest; no ordering guarantee, chain-driven correlation), its member list diffed against the
  source by hand, and a prose paragraph states the orphan obligation; the integration guide's
  "What you get, with its limits in the same breath" list gains the matching bullet in its
  own voice.
- `docs/process/deferral-register.md`, `docs/process/next-phases.md`, and this document's
  live-rows bullet — the three present-tense sentences the row-22 truth repairs wrote
  describing the two readers as OPEN findings, repaired in place to closures. Row 22's scope,
  its trigger cell, and every other clause are byte-identical, proved by the same
  whitespace-collapsed comparison the row-22 increment used: the trigger still occurs exactly
  once in each of its four living copies.
- `CLAUDE.md` and this document's `Measured against the current tree` bullet — the
  present-tense counts moved to what the exit measured (65 files / 804 tests; 132 files under
  Biome). Every figure under a `Gate outputs` heading is pinned to a past commit and stayed
  byte-identical.

**Both defects were LATENT, not live, and the record says so rather than dramatising.**
`MemorySignatureStore` iterates a `Map` in insertion order and the decorator writes in
append order, so today the first entry is the genesis and both readers happened to pick a
real transition. Nothing pinned that; the contract permits any order; and register row 22
guarantees orphans are there to be picked. No real flow was found that reaches an orphan
for the probe's OWN record — `open()` mints a fresh identifier per probe run and the probe's
own refusal appends rather than orphaning. The pins INJECT an ordering the contract permits;
they do not demonstrate a deployment that produces it. Host `ProbeDriver` shapes were not
enumerated, and a driver returning a shared durable sidecar was not modelled.

**This increment does NOT close row 22's orphan half, and must not be read as doing so.**
The contract sentence is containment by honest delegation, not by prevention: it tells the
implementer who will actually hit unbounded growth that the growth is theirs to reconcile,
and it prevents nothing. Orphan accumulation continues at one entry per refusing call. Row
22 keeps both halves and its trigger; 22b closes on behavior at the no-edge containment
increment, which follows, and 22a stays open there on the third horn.

**The contract sentence is unenforced, and nothing here can enforce it.** No gate in this
repository reads a host's `SignatureStore` implementation. The obligation lives in a doc
comment and in the guide, which are the only places it can live; `pnpm api-sync` checks that
exported names occur in the reference and never that a quoted interface matches its source,
so the quote was diffed by hand and has no gate behind it.

**Deviations from the plan as written, stated rather than smoothed over.** Two. (1) The plan
asked for one commit per task and, in the same breath, for the suite to be green "at every
commit with no exceptions" after the one red commit — but its first task wrote BOTH pins red
and its second closed only the probe's, so a second-task-only commit would necessarily have
carried the helper pin red. Tasks 2 and 3 therefore landed together in `3ab669d`, with each
fix's pin-flip observed and recorded separately in that commit's message, so that no
post-red commit is red. (2) The plan's helper-pin step said to write the pin against the
widened `SignatureStore` signature before the helper was widened, which `tsc` would have
rejected at the red commit where every gate but `vitest` had to pass; the pin called today's
signature through a documented `as unknown as MemorySignatureStore` cast, removed when the
helper was widened. Neither changes what landed.

**The honest limit.** Five positional sidecar reads existed in this repository; this
increment corrected the two that fail QUIETLY — a false operator-assurance verdict, and a
fixture that goes green while proving nothing. The other three — `signing.test.ts`'s own
trailing-four-character break variant, and the missing-entry and unresolvable-keyRef fixtures
in `signing-enforce.test.ts` — fail LOUDLY under an adverse ordering, because tampering,
deleting or re-keying an orphan leaves every real signature intact and the seam assertion
each carries then fails outright; a loud fixture failure is a different hazard class, and
they are left, per the design's scope bounds, with `signing.test.ts`'s variant named here so
the next author knows it was seen and left rather than missed. The census of positional
reads is over this repository, not over hosts. And the row-22 investigation's own limit
binds this increment too: the corpus could not have caught either defect, and the two pins
are the only evidence in either direction.

**What stays outside, and why.** Closing 22a, for which no candidate escapes the third horn;
a `remove` or prune method on `SignatureStore`, per the design's first ruling; the no-edge
containment increment's own work — the signer-result memo and the candidate narrowing —
which is the next cluster; `signing.test.ts`'s trailing-break variant, above; and the stale
intra-repo pointer in `packages/record/src/store/memory.ts` citing `kernel/open.ts` at two
line numbers that have moved, named by the design so the next author does not re-derive it,
and out of this increment's envelope. No deferral-register row was written or retired.

**Cuts.** None. This increment made two readers obey a contract that already bound them and
stated one obligation that contract had left unstated; it cut no capability.

**Gate outputs, as measured against this increment's own exit commit**:
`./node_modules/.bin/vitest run` — 65 test files, 804 tests, zero skips;
`./node_modules/.bin/tsc --noEmit -p packages/record` and
`./node_modules/.bin/tsc --noEmit -p packages/store-postgres` — both clean;
`./node_modules/.bin/biome check --error-on-warnings .` — 132 files checked, zero errors or
warnings; `node scripts/contract-scan.mjs` — exit 0, no output;
`node scripts/api-reference-sync.mjs` — exit 0; `node scripts/docs-index-sync.mjs` — exit 0.
`docs/process/deferral-register.md` loses no row and gains none: row 22's third-reader
sentence closed, its scope and trigger byte-identical. `git diff 53ec4f6 --stat --
packages/record/test/byte-stability.test.ts` — no output; `git diff 53ec4f6 --name-only --
'packages/*/src/*'` — exactly `packages/record/src/probes/probes.ts` and
`packages/record/src/signing/store.ts`; `signingSetup` hash unchanged.

## Post-build-order increment — No-edge containment

**The eleventh post-build-order increment, exited (commits `c607989`..`3542668`, closed by
the record commit that follows them).** The ordinal counts the sections above in order and,
as the last three did, does NOT count the documentation-only signature-enforcement-coverage
findings note. **This increment landed behavior in the kernel and the decorator — the first
in this three-increment sequence to change what the library does on a seam call, where the
sidecar-contract increment's one behavior change was how an operator-assurance probe reads —
and moved no maturity marker.** No `docs/concept/` file changed, no
sanction was sought and none was needed: the narrowing drops only a candidate C3 can never
admit, so every seam outcome (refusal code, class, `transitionRef` presence) is byte-identical
on every shape, and the memo changes how many times a signer is asked, never what is written
or when. Exactly four `packages/*/src/` files changed, proved by `git diff d6a5f1f --name-only
-- 'packages/*/src/*'`: `kernel/finalize.ts` and `signing/decorate.ts` (the two permitted
behavior changes) and `refusal-codes.ts` and `outcome.ts` (comment only, the fallback-walk
descriptions). It is the third and last of the sequence authored 2026-08-24; its plan checked
that both predecessors had landed — the register's `CONTAINMENT INVENTORY` and the contract's
`AN IMPLEMENTER MUST TOLERATE ORPHANS` — before starting. Design:
`docs/superpowers/specs/2026-08-24-no-edge-containment-design.md`; plan:
`docs/superpowers/plans/2026-08-24-no-edge-containment.md`.

**Re-scoped before implementation, and why — the increment's most durable output.** The
design as first drafted proposed a chain-local admissibility precheck: return before building
anything whenever the read chain looked terminal or carried a `sealed` transition. It would
have zeroed BOTH of row 22's costs, and it passed the whole record project. It was then
measured to SUPPRESS a compromise evidence edge that lands today, because C3 and C4 are decided
by the backing against its own persisted row while the precheck read the chain — a chain that
reached `appendChainCompromise` precisely because it failed verification — and on the SQL
backing those are different tables (`readChain` reads the transitions table; the gates read the
records row). The design was re-scoped around that finding: the precheck is named in the
plan's constraints as the thing not to rebuild, and the divergence fixture that exposed it was
built FIRST, under a binding STOP, before any behavior change shipped. Both shapes are now
permanent pins marked must-not-change.

**The gap this closed.** Row 22's redundant-signing half, 22b: on a refusing seam call
against a record admitting no CAS candidate, the signing decorator — which signs BEFORE
delegating — minted one signature per candidate the walk tried (three on a sealed record,
four on an already-refused one), every mint over byte-identical bytes upserting one sidecar
key. The row's trigger named "the first increment that changes `appendChainCompromise`'s
candidate walk, the signing decorator's `signOne`, or the order in which the decorator's
append seams sign and delegate"; this increment did the first two — the walk in `9111035`,
`signOne` in `3542668` — and left the order untouched. **That discharges the trigger for 22b
only.** 22a's containment did not land, and its trigger was re-derived rather than inherited.

**What landed.** Four commits, the first one test-only:

- `packages/record/test/no-edge-containment.test.ts` (`c607989`, then extended) — the counting
  rig (`countingSigningSetup`: an Ed25519 signer that counts its invocations, a put-counting
  sidecar wrapper that also records each completed put as an event, an event-recording store
  wrapper, an injectable store and clock, a deterministic record-id mint, a put-swallow
  toggle); the BASELINES the fix inverts, every figure measured on this tree; the two
  DIVERGENCE fixtures; the NARROWING pin; the two MEMO pins; the two INVARIANT pins; the
  digest-stability pin; and the WeakMap-observability pin. Twelve tests. One shape decision
  beyond the plan: the rig's clock TICKS one second per read, because the compromise append
  stamps `at` from the clock and two refusing calls in one wall-clock millisecond collapse two
  orphans onto one key — the flake the investigation observed in roughly one run in twelve.
  "One orphan per refusing call" is deterministic under a ticking clock and only usually true
  under a real one.
- `packages/record/src/kernel/finalize.ts` (`9111035`) — `NO_EDGE_STATE`, the five terminal
  states out of which no `refused` edge can leave (`refused`, `expired`, `declined`,
  `redeemed`, `redemption-failed`), written `as const satisfies Record<RecordState, boolean>`
  so a new `RecordState` member fails the BUILD rather than being classified silently; the set
  is DERIVED from SPEC §2's terminality plus C3's general bar, not quoted from a sealed list —
  §5, §8 and §12's C3 each enumerate a different subset and none names `redeemed` or
  `redemption-failed`. When the folded state is one of the five, the same-state candidate is
  dropped before the walk; the narrowing sits INSIDE the `try`, so when `replay` throws there
  is no folded state and the fallback walk is byte-for-byte what it was. The correctness
  argument is written at the site: the dropped candidate could only match a record whose
  persisted state equals the folded one, and for that record C3 bars the edge; the three
  producible targets are NOT dropped because the backing decides them against its own row.
  `appendChainCompromise`'s doc gains the one-place enumeration of the no-edge corner;
  `refusal-codes.ts` and `outcome.ts` gain "three candidates rather than four".
- `packages/record/src/signing/decorate.ts` (`3542668`) — `signOne` memoizes the SIGNER's
  in-flight promise in a `WeakMap<Transition, Promise<{ keyRef; signature }>>` keyed by
  transition OBJECT identity, declared at `withSigning` scope beside the existing recordId
  memo. Only the mint is shared: the put still runs on every attempt with the digest
  recomputed each time; a rejected mint is deleted from the memo before the rethrow, so the
  next attempt reaches the signer again and `signing.test.ts`'s throwing-signer pin stays
  green. Two call paths hand one object to `appendTransition` more than once — the
  compromise walk and `open()`'s C1 expire-then-retry — and both now mint once. This is the
  change that closes 22b.
- `packages/record/test/signing-enforce.test.ts` — the previously unannotated cardinality
  assertion in the file's first test now carries the sibling comment, stating the hazard as
  it is AFTER this increment: a second refusing call still mints another sidecar entry,
  because 22a is not closed.
- `docs/process/deferral-register.md` — row 22 re-scoped, not retired: 22b's body and its
  memo inventory entry removed and replaced by a closure naming both commits; 22a's body, its
  measurements, the third horn, the rejected families, the third-reader closure and the
  UNMEASURED clause kept; the write-time row-number derivation carried verbatim with one
  appended re-scope clause; and a FRESH trigger for 22a — a durable `SignatureStore` backing,
  publication, a sanction sought for the third horn, or the 0.1 cut. Also corrected in
  passing: the row said Finding F's reconciliation note was dated 2026-08-28; the note landed
  dated 2026-08-29.
- `docs/process/next-phases.md`, `docs/process/release-checklist.md`, this document's
  increment bullet, live-rows clause, "Still outstanding" bullet and boundary paraphrase, and
  `CLAUDE.md`'s live-rows sentence — every present-tense description of the row moved to the
  re-scoped shape, the four living copies of the new trigger proved identical by
  whitespace-collapsed comparison and the old trigger proved absent from all four. The
  present-tense counts moved to 66 files / 816 tests and 133 Biome files; every figure under
  an earlier `Gate outputs` heading stayed byte-identical.

**Both firing counts, with their nonzero controls, and why they are in the record.** The
corpus asserted no signer count and pinned orphan minting in neither direction before this
increment, so the suite could not have noticed either change had it been wrong — the
rejected compensating removal passed the whole record project with its new branch counted at
zero firings. Each behavior change therefore carried a temporary `process.stderr.write`
probe, counted across the record project with the suite green under it, then removed: the
narrowing arm fired **10** times (62 files / 745 tests at that run); the memo-hit path fired
**37** times (62 files / 751 tests). Nothing of either probe ships. One mishap is recorded
because it produced a misleading zero: the first attempt to inject the narrowing probe by
`sed` mangled a newline escape, split the string literal, and failed the whole suite to
compile — 49 files failed and the probe counted 0. That zero was a syntax error, not a
non-firing branch; re-inserted correctly, the count was 10.

**What the divergence fixture found.** Both shapes were constructible: a record persisted
terminal `confirmed`, read through a `TamperingStore` whose length-preserving head-kind
rewrite is armed only after the record is built — `verifyChain` still reports intact, since
nothing chains over a head, and only the signature layer sees the rewritten head's missing
entry. Head kind `confirmed→refused`: replay folds `refused`, yet `confirmed` passes its CAS
and C3's carve-out admits the edge, WITH a `transitionRef`, into the REAL chain. Head kind
`confirmed→sealed` with a fabricated `chainHead` payload: replay folds `open`/`retired`, so a
terminal-state rule would not even fire, yet C4 reads the persisted unsealed row and the edge
lands. The binding STOP was therefore in force from Task 1: nothing in this increment
predicts the store's answer from the chain. One fixture bug found while writing them, fixed
before commit: the persisted-state assertion first read through `getRecord`, i.e. through
the tampering store, where the freshly landed head is itself rewritten and folds back to
`confirmed`; it now replays the inner store's chain.

**What is NOT closed, and why.** 22a — one orphan sidecar entry per refusing call — stays
open, and the pins in this increment assert the sidecar STILL grows by one per call after
both changes, deliberately. Every measured containment for it takes the third horn:
predicting C3's and C4's answers from a chain that failed verification by construction,
which the divergence fixture shows suppresses an evidence edge that lands today. Taking that
horn narrows SPEC §5's admission rule against a `[PROVEN]` section — a code/spec divergence
this repository classes as a finding — and needs a fresh sanction through
`docs/concept/SCOPING-GUIDE.md` §§1–2 with its trade stated plainly: a lost compromise
evidence edge under a real tamper, in exchange for bounded sidecar growth. What stands
meanwhile is the sidecar-contract increment's delegation. Row 22's re-derived trigger names
the events that would make 22a's cost material or its containment sanctionable.

**The rejected families, with their measurements, so nobody rediscovers them.** The
chain-local admissibility precheck (above). A digest-keyed de-dup — memoize on
`transitionDigest` rather than object identity — weakens the pinned invariant from "this
append is preceded by its OWN completed sidecar write" to "some earlier signing for this
digest happened": the eager variant let an append reach the store with zero completed puts,
and the awaited variant landed an UNSIGNED transition across seam calls whenever the entry
was absent at the second append. Compensating removal — sign, put, append, remove on
`appended: false` — obeys the sign-before-append token order and destroys the property it
protects: 100 trials of two concurrent same-record `finalize()` calls drove 94 legitimately
confirmed, hash-intact records to lose their signature sets (88 of 100 in an independent
reproduction — the figure the register row carries), against 0 of 400 for the shipped
ordering; unrepairable, because the sidecar is
content-addressed and the scheme deterministic, so racing writers write byte-identical entries
under one key. Both are pinned against by this increment's INVARIANT tests: the put always
runs, and no append is observed before that transition's put completed. All figures from the
investigation record's prototype arms, which no longer exist.

**The digest-stability assumption, and how it was pinned.** The memo pairs a signature
minted over the object's bytes at first-mint time with a `transitionDigest` recomputed at
every put; that is sound only while the object is not mutated between attempts, and nothing
in the type system enforces it. The shape is NOT constructible through the public seams —
every seam builds its transition once and hands that one object to the store unchanged — so
the pin drives the exported `withSigning` factory directly over the rig's own backing and
sidecar, mutates a transition object between a losing and a landing append, and shows the
mismatch CAUGHT: the landed transition's entry exists under the recomputed digest, and
`verifySignatures` reports it `verified: false`, fail-closed. The assumption is stated at the
memo and in the test, not left implicit.

**Deviations from the plan as written, stated rather than smoothed over.** Two. (1) The
plan's rig used the real clock via `create()`; the rig uses `createWithClock` over a ticking
clock, for the same-millisecond reason above. (2) The plan asked for a firing-count probe per
change; both were taken, but the first injection attempt was botched (above) and is recorded
rather than omitted. Nothing changed in what landed.

**The honest limit.** Only the redundant-signing half is closed, and only for the two
repeat-object paths that exist today; a future path that rebuilt its transition per attempt
would mint per attempt again, and nothing but this file's pins would notice. The narrowing's
own saving is small once the memo is in — one CAS attempt and one put per refusing call on a
terminal-folded record, not a signer round-trip — and it is kept because it is free and
provably outcome-preserving, not because it is the point. Behavior on a durable
`SignatureStore` backing stays UNMEASURED and unmeasurable in this tree. No latency figure
exists anywhere; the signing cost is an invocation count. Every concurrency measurement
behind the rejected families was in-process, on prototype arms that are gone. The enlisted
redemption seams gain nothing here: their `tx !== undefined` guard returns before
`appendChainCompromise`, so all three token seams already cost zero signer invocations under
enlistment. And a green suite remains a null result in this area — the two firing counts are
the only evidence the suite itself could not give.

**The row-22 sweep, discharged in writing.** `grep -rn "row 22\|Row 22" CLAUDE.md docs/
packages/` was run after the re-scoping. Every PRESENT-TENSE hit describes the row as it now
is: `CLAUDE.md`'s live-rows sentence; this document's coverage-increment bullet, live-rows
clause, "Still outstanding" bullet and boundary paraphrase; `docs/process/next-phases.md`;
`docs/process/release-checklist.md`; `kernel/finalize.ts`'s doc comment; and the test
comments in `signing-enforce.test.ts`, `sidecar-ordering.test.ts` and
`no-edge-containment.test.ts`, all of which name the orphan half as the open one. Every other
hit is HISTORICAL and was deliberately left as written, per the tier discipline the row-22
truth repairs stated: this document's coverage-increment, truth-repairs and sidecar-contract
sections and its documentation-only findings note describe the row as it stood on the day
each was written; `docs/analysis/2026-08-23-signature-enforcement-coverage.md` and
`docs/analysis/2026-08-24-no-edge-containment-investigation.md` are dated records; and every
`docs/superpowers/` spec and plan is historical and unmaintained by `INDEX.md`'s own rule —
including this increment's own plan, whose premise check greps the register for
`CONTAINMENT INVENTORY`, a phrase that left with 22b's body and now prints 0. That grep was a
"predecessor landed" probe for THIS increment and has done its work; a later plan copying it
as a probe would get a false negative, which is why it is named here. `git diff d6a5f1f
db8070f --stat -- docs/analysis docs/superpowers` is empty.

**One repair after the exit review, recorded rather than folded in silently.** The review of
this increment against its plan found the memo's rejection path deleted its entry
unconditionally: if a third caller had already installed a fresh in-flight promise between
the shared promise's rejection and the `catch`, that fresh promise was dropped from the memo.
The cost was bounded — at most one extra mint on the next attempt, never an unsigned append,
since the put always runs — and no pin required the change; `signOne` now deletes only when
the memo still holds the promise that rejected. The same review corrected two figures in this
section (the primary and reproduction compensating-removal counts had been swapped; the
"first to land behavior" sentence lacked the sidecar-contract qualifier) and asked for the
sweep above to be written down.

**What stays outside, and why.** The cost-zeroing precheck, which needs a sanction and a
stated trade; 22a's containment, which has no candidate off the third horn; and the stale
intra-repo pointer in `packages/record/src/store/memory.ts` citing `kernel/open.ts` at two
line numbers that have moved, named by both designs in this sequence and out of every
envelope. No deferral-register row was written or retired; row 22 was re-scoped in place.

**Cuts.** None. This increment removed one wasted mint per attempt and one dead CAS attempt
per call; it cut no capability.

**Gate outputs, as measured against this increment's own exit commit**:
`./node_modules/.bin/vitest run` — 66 test files, 816 tests, zero skips (record project
62 / 751; store-postgres 4 / 65);
`./node_modules/.bin/tsc --noEmit -p packages/record` and
`./node_modules/.bin/tsc --noEmit -p packages/store-postgres` — both clean;
`./node_modules/.bin/biome check --error-on-warnings .` — 133 files checked, zero errors or
warnings; `node scripts/contract-scan.mjs` — exit 0, no output;
`node scripts/api-reference-sync.mjs` — exit 0; `node scripts/docs-index-sync.mjs` — exit 0.
`docs/process/deferral-register.md` loses no row and gains none: row 22 re-scoped to 22a in
place, its trigger re-derived. `git diff d6a5f1f --stat --
packages/record/test/byte-stability.test.ts` — no output; `git diff d6a5f1f --name-only --
'packages/*/src/*'` — exactly `packages/record/src/kernel/finalize.ts`,
`packages/record/src/outcome.ts`, `packages/record/src/refusal-codes.ts` and
`packages/record/src/signing/decorate.ts`; `packages/record/test/redeem-token.test.ts`
untouched.

## Post-build-order increment — Sidecar orphans report

**The twelfth post-build-order increment, exited (commits `f778c17`..`917c5fd`, closed by
the record commit that follows them).** The ordinal counts the sections above in order and,
as the last four did, does NOT count the documentation-only signature-enforcement-coverage
findings note. **This increment landed one field on one provisional report type — no gate,
no append, no deletion and no admission decision changed — and moved no maturity marker.**
No `docs/concept/` file changed, no sanction was sought and none was needed; that was
checked rather than assumed, since the design asked for it in writing: a grep of the sealed
set for `SignatureReport` and `orphan` returns three hits, all of them the redemption
passages' orphaned EFFECTS in `CONCEPT.md` and `SPEC.md`, and no concept-set text
enumerates the report's members. Exactly two `packages/*/src/` files changed, proved by
`git diff 8571301 --name-only -- 'packages/*/src/*'`:
`packages/record/src/kernel/verify-signatures.ts` (the one behavior change — the field, its
computation, and the threading) and `packages/record/src/operator-surface.ts` (comment
only). It is the first increment authored 2026-08-29, following the three-increment
sequence authored 2026-08-24, and it is the smallest honest next step its own design ranked
first among what that sequence left: make the orphans the contract already delegates
VISIBLE. Design: `docs/superpowers/specs/2026-08-29-sidecar-orphans-report-design.md`; plan:
`docs/superpowers/plans/2026-08-29-sidecar-orphans-report.md`.

**The gap this closed.** The sidecar-contract increment's `AN IMPLEMENTER MUST TOLERATE
ORPHANS` half told a host that orphans exist and are safe to prune when no chain transition
references them, and `docs/guide/integrating.md` told it that "a durable backing that must
stay bounded has to reconcile against the chain itself" — but neither named a read that
yields the entries to prune, so a host was told to do something the library gave it no
direct way to do. The one library read that touches the sidecar had the answer already:
`layerVerdicts` (`kernel/verify-signatures.ts`) lists `listByRecord(recordId)` once into a
`byDigest` map, walks the CHAIN, and reports a verdict per chain transition, so every
sidecar entry the walk never visits is an orphan by definition. The set difference sat in
that same pass at zero additional reads, computed implicitly and discarded.

**What landed.** One implementation commit and one records commit, no red commit:

- `packages/record/src/kernel/verify-signatures.ts` (`f778c17`) — `SignatureReport` gains
  `orphans: Digest[]` with its own doc comment; `layerVerdicts`' return type widens from
  `{ signingDeclared, transitions }` to carry `orphans` beside them; `verifySignatures`
  destructures and threads all three. The set is the sidecar's digests minus the chain's,
  `Set`-collapsed — so the duplicate-digest shape `signing/store.ts` calls out of contract
  is reported once rather than twice — and `.sort()`ed, so the report is identical under
  any `listByRecord` order the contract permits. No second `listByRecord` and no second
  `readChain`: the row's own read-amplification finding is not made worse by one byte.
  `signatureLayerHolds` is unedited.
- `packages/record/src/operator-surface.ts` — the `verifySignatures` doc comment gains one
  sentence naming the field, its sort and its limit: reporting only, read by no gate, the
  host prunes and the library never does. Every earlier sentence byte-identical.
- `packages/record/test/sidecar-orphans-report.test.ts` — new, five pins, one test each: a
  clean signing record reports no orphans; the already-refused corner — break one
  signature, `finalize()` once to LAND the compromise edge, `finalize()` again to refuse
  with no edge — leaves exactly one orphan and the report names it; **orphans never gate**,
  an open record carrying a fabricated orphan still finalizes `ok` and its `transitions[]`
  verdicts are deep-equal with and without it; the report is deterministic under a
  contract-legal reordering of the sidecar, sorted and deep-equal across calls; and a
  non-signing instance reports no orphans. The pins were written and run RED before the
  field existed — the focused run failed all five, `report.orphans` reading `undefined`
  against every assertion — and passed all five once the field and its computation landed.
  That red state was observed in the working tree and not committed: this increment carries
  no sanctioned red commit, and its one implementation commit is green.
- `docs/guide/api-reference.md` and `docs/guide/integrating.md` — moved in the same commit
  as the surface, as an obligation rather than a choice: `SignatureReport` is exported from
  `packages/record/src/index.ts`, so `CLAUDE.md`'s same-change rule fires on a public
  interface gaining a member. The quoted `SignatureReport` block gains the member with its
  comment, diffed against the source by hand because `api-sync` gates presence and never
  accuracy; the reference's orphan paragraph now names `verifySignatures(recordId).orphans`
  as the read that yields the dead entries, in place of its previous claim that the library
  "cannot tell your store which entries are dead"; the integration guide's limits bullet
  gains the same pointer in its own voice. Both carry the in-flight caveat, because the
  report says WHICH entries are orphans and never WHEN it is safe to delete them: prune
  only when no seam call on that record is in flight, since an in-flight append's entry and
  an orphan carry the same `seq`.
- `docs/process/deferral-register.md`, `docs/process/release-checklist.md` and
  `docs/process/next-phases.md` (`917c5fd`) — the three living records that describe row 22,
  moved together. The register's containment inventory gains two sentences and nothing
  else, `OBSERVABILITY, LANDED at the sidecar-orphans-report increment` and `IDENTIFIED,
  NOT BUILT: prune-at-seal`; the row's scope cell (22a), its trigger cell and its date cell
  are byte-identical, proved by the same whitespace-collapsed before/after comparison the
  row-22 increment used, with the trigger still occurring exactly once in each of its four
  living copies. The checklist's expected ruling for the row becomes "carry forward, with
  the growth visible", the row's cost now a number rather than a warning, and the
  third-horn sanction restated as `DECLINED at this cut unless sought on its own merits`.
  The next-phases passage gains one sentence after "That sentence is delegation, not a fix:
  22a stays open.", naming this increment as having made the delegated work visible
  "without closing 22a".
- `CLAUDE.md` and this document's `Measured against the current tree` bullet — the
  present-tense counts moved to what the exit measured (67 files / 821 tests; 134 files
  under Biome). Every figure under an earlier `Gate outputs` heading is pinned to a past
  commit and stayed byte-identical.

**Reporting, not containment — stated here because this is where it could be misread.** Row
22 keeps its number, its scope and its trigger, and 22a is open. The sidecar still grows by
one entry per refusing call; `packages/record/test/no-edge-containment.test.ts` still pins
that it does, and nothing in this increment was allowed to weaken that pin. Naming an
orphan does not prevent it, and the inventory entry reads `OBSERVABILITY, LANDED` rather
than "contained" for exactly that reason. The load-bearing pin is the never-gates one: a
fabricated orphan leaves `finalize()` at `ok` and the chain verdicts deep-equal, so the
field cannot quietly become an admission input. The gate's own body is the other half of
that proof — `signatureLayerHolds` consumes only the per-transition verdicts, as it always
did, and `sed -n '/^export async function signatureLayerHolds/,/^}/p'` over
`kernel/verify-signatures.ts` piped to `git hash-object --stdin` reads
`f1b8ac2567ebba588dd61a336ba8ca9aed3b4ef2` both at the pre-increment baseline and at this
exit.

**The two inventory entries, and why each is shaped the way it is.** The first records what
shipped and states its limit in the same breath: the field names every sidecar digest with
no chain counterpart, sorted, computed inside the read the call already makes — and it is
reporting only, read by no gate, and it bounds nothing. The second records an idea found and
deliberately NOT built. Prune-at-seal is the one deletion point identified that escapes the
third horn entirely: once `seal()`'s CAS has landed, C4 admits no further append of any
kind, so every sidecar entry without a chain counterpart is an orphan forever — including a
concurrent refusing call's entry whose append is still in flight — and can be deleted with
no race and no prediction from a chain that failed verification. Three things keep it out
of this increment, and the record names all three rather than the first alone: it needs a
`remove` on the provisional `SignatureStore`, which the sidecar-contract increment's first
ruling declined and which its own design would have to re-open explicitly; it is PARTIAL,
bounding only orphans minted before the seal while the key-retirement shape keeps minting
after it; and it is gated on a durable `SignatureStore` backing existing to measure
against, which is one of row 22's own trigger disjuncts. The third horn itself — deciding
C3 and C4 from the read chain — is declined at this cut in writing, in the checklist's own
words, with the row's sanction disjunct left standing as the door.

**Deviations from the plan as written, stated rather than smoothed over.** Two, both caught
by the final review after this paragraph was first written as "None." (1) The plan's Task 1
Step 7 told the implementer to INSERT the orphans-naming sentence before
`integrating.md`'s closing line rather than REPLACE the bullet's own `cannot tell you which
entries are dead` clause, so the guide carried the old limit and the new pointer together
and contradicted itself until the review caught it and the clause was rewritten in place.
(2) Neither the design nor the plan named `CHANGELOG.md`; its own convention needs an
`### Added` entry for a public-type member gaining a field, so one was added, dated
2026-08-29, after review rather than as a plan-carried step.

**The honest limit.** The read is PER RECORD: a host with many records still has to know
which records to ask about, and this increment opened no cross-record view — a sweep would
be a new surface, not a wider field. The report is as fresh as the read: an orphan minted
by a refusing call that completes after `verifySignatures` returns is not in that report,
so it is a reconciliation input and never a lock. Deleting what the report names is still
the HOST's act under the host's own race discipline, for the same-`seq` reason both guide
documents now carry; the library performs no pruning and gained no way to. Behavior on a
durable `SignatureStore` backing stays UNMEASURED and unmeasurable in this tree — the field
was exercised against `MemorySignatureStore` only, which is row 22's own standing coverage
bound rather than anything new. And no probe covers it: the operator-assurance tier's probe
targets quote `docs/concept/CONTROLS.md` §4 verbatim, that document is sealed, and none of
the seventeen targets in `packages/record/src/probes/probes.ts` describes sidecar
reporting — so the proof that the report is honest lives in the test corpus and nowhere
else.

**What stays outside, and why.** Closing 22a, for which no candidate escapes the third horn
and whose sanction is declined at this cut; prune-at-seal, which needs its own design, a
re-opened ruling and a durable backing to measure against; a `remove` or prune method on
`SignatureStore`, for that same reason; a cross-record orphan sweep or any new read surface
beyond the one field; a probe, per the design's fifth ruling; and any change to
`signatureLayerHolds`, the seams or the signing decorator, which the design named as a STOP
and which the hash and the two-file envelope both prove untouched. No deferral-register row
was written or retired; row 22's inventory grew and nothing else in the row moved.

**Cuts.** None. This increment added one field to one report and cut no capability.

**Gate outputs, as measured against this increment's own exit commit**:
`./node_modules/.bin/vitest run` — 67 test files, 821 tests, zero skips (record project
63 / 756; store-postgres 4 / 65);
`./node_modules/.bin/tsc --noEmit -p packages/record` and
`./node_modules/.bin/tsc --noEmit -p packages/store-postgres` — both clean;
`./node_modules/.bin/biome check --error-on-warnings .` — 134 files checked, zero errors or
warnings; `node scripts/contract-scan.mjs` — exit 0, no output;
`node scripts/api-reference-sync.mjs` — exit 0; `node scripts/docs-index-sync.mjs` — exit 0.
`docs/process/deferral-register.md` loses no row and gains none: row 22's containment
inventory gains two sentences, its scope, trigger and date cells byte-identical.
`git diff 8571301 --stat -- packages/record/test/byte-stability.test.ts` — no output;
`git diff 8571301 --name-only -- 'packages/*/src/*'` — exactly
`packages/record/src/kernel/verify-signatures.ts` and
`packages/record/src/operator-surface.ts`; `signatureLayerHolds` body hash unchanged at
`f1b8ac2567ebba588dd61a336ba8ca9aed3b4ef2`.

## Post-build-order increment — First-use proof

**The thirteenth post-build-order increment, exited (commits `2a28abe`..`d95dcc8`, closed
by the record commit that follows them).** The ordinal counts the sections above in order
and, as the last five did, does NOT count the documentation-only
signature-enforcement-coverage findings note. **This increment landed no library behavior
at all — one dispatch-only workflow, the consumer script it runs, one documented run of
that workflow, and the two public sentences the run licensed — and moved no maturity
marker.** No `docs/concept/` file changed, no sanction was sought and none was needed:
nothing here promotes a capability, narrows a rule, or touches a sealed enumeration. No
`packages/*/src/` file changed, proved by `git diff 4e3e833 --name-only --
'packages/*/src/*'` (no output); the one file under `packages/` that moved is
`packages/record/README.md`, one paragraph of install prose, named in the design's own
"What lands" list. It is the second increment authored 2026-08-29 and the first
release-readiness increment since the reconciliation pass: where the three-increment
sidecar sequence and the orphans report worked on the signing layer, this one leaves the
library alone and asks a different question — whether an adopter can install it and reach
a verified chain on a machine that never held this checkout. Design:
`docs/superpowers/specs/2026-08-29-first-use-proof-design.md`; plan:
`docs/superpowers/plans/2026-08-29-first-use-proof.md`.

**The gap this closed.** The release checklist's first precondition asks for "one
documented, reproduced first-use pass from packed artifact to verified chain on a machine
that never held this checkout", and nothing this repository ran could discharge it. The
2026-08-19 rehearsal ran on the development machine and said so. `pnpm smoke`, the
per-push packed-artifact gate, packs both packages and consumer-tests the tarballs in a
scratch directory — on a runner that CHECKED THE REPOSITORY OUT, so the checkout sits on
disk beside the scratch project, which is exactly the doubt the bar exists to remove. The
second gap is smaller and was found while reading the first: two public sentences had gone
stale under Node. `docs/guide/integrating.md` said "Node still flags `node:sqlite` as
experimental and prints a warning" and `packages/record/README.md` said the same in its
own voice — true below Node 24.15 and false at or above it, so every reader on the current
LTS line was being told to expect something they would not see.

**What landed.** Four commits, none of them touching the library:

- `scripts/first-use.mjs` (`2a28abe`) — the consumer script, and consumer code in the
  strict sense: it imports `@vidimera/record`, `@vidimera/record/probes`,
  `@vidimera/store-postgres`, `pg` and node builtins, and never a relative path into this
  repository, so every import resolves through a package's exports map or fails. It is the
  getting-started flow in substance rather than a copy of `smoke-pack.mjs`'s loop: stage →
  open → review → finalize → `confirmed` over `MemoryStore`; the offline `replay` and
  `verifyChain` reads and the handle-form `verifyChain`; the four-kind chain shape
  `['opened', 'consultation-recorded', 'consultation-recorded', 'confirmed']` the guide
  shows; the refused half, where a wrong-authority identity comes back as
  `identity-authority-refused` and is never thrown; the `./probes` subpath, with
  `ALL_PROBES` non-empty and `runProbes` and `assertSatisfied` importable; the adapter's
  peer range read out of the installed manifest and asserted NOT to start with
  `workspace:`; and, when `VIDIMERA_PG_URL` is set, the same confirm loop over a real
  PostgreSQL server through `PostgresStore`. Without that variable the Postgres half prints
  a notice and is skipped — never skipped silently. One summary line on success, non-zero
  exit on the first failed assertion.
- `.github/workflows/first-use.yml` and `CLAUDE.md` (`5c036d0`) — the dispatch-only
  workflow: `workflow_dispatch` with a `source` choice (`tarball` | `registry`) and a
  `version` string, `permissions: contents: read`, five actions pinned by full SHA with
  trailing version comments. Job `pack` checks out, builds, packs the record package with
  `npm pack` and the adapter with `pnpm pack` — only pnpm rewrites the adapter's
  `workspace:^` peer range, the trap `scripts/smoke-pack.mjs` already documents — copies
  the script in beside them, and uploads all three as ONE artifact. Job `first-use` has no
  `actions/checkout` step, and that absence is the whole proof: it downloads that artifact
  and installs from it, on a two-entry matrix (`22.16.0` with `expect_warning: 'true'`,
  `24` with `'false'`) against a `postgres:18` service container with a `pg_isready` health
  check. Its last step is the warning pin: a bare `node -e` import of `@vidimera/record`
  with stderr redirected to a file, the file echoed into the log between two markers, then
  `grep -q ExperimentalWarning` asserted present on the floor leg and absent on the other.
  `CLAUDE.md`'s CI paragraph gained one sentence naming the workflow, what it does, and
  what it is not — a deliberate release act, never a per-push gate, with `pnpm smoke` named
  as the thing that stays that.
- `docs/guide/integrating.md` and `packages/record/README.md` (`40331ba`, corrected in
  `d95dcc8`) — the two public sentences, rewritten AFTER the run and only because of it.
  Both now say the same thing in their own voices: below Node 24.15 importing the package
  prints Node's `ExperimentalWarning` for `node:sqlite` and
  `node --disable-warning=ExperimentalWarning` silences it; "on 24.15 and later nothing
  prints". Both attribute the claim — measured by the first-use workflow, which imports the
  packed artifact bare on the declared floor and on the current LTS line — and the guide
  points at the record by path. The README's `Requires Node 22.16 or newer.` is
  byte-identical across this increment.
- `docs/superpowers/INDEX.md`, this document, and the `git add` of the design, the plan and
  `docs/analysis/2026-08-29-first-use-proof.md` (this commit) — the record. The
  present-tense Biome count moved by one, to 135 files, for `scripts/first-use.mjs`; the
  present-tense test counts did NOT move and were re-measured rather than assumed, because
  this increment added no test file. Every figure under an earlier `Gate outputs` heading
  is pinned to a past commit and stayed byte-identical.

**The run, and what it proved.** `First-use run 33242645696 on origin` — the `First-use`
workflow, dispatched with `source: tarball` against ref `first-use-proof` at commit
`5c036d0`. Three jobs, all `success`: `pack`, `first-use (22.16.0, true)` and
`first-use (24, false)`. `pack` produced `vidimera-record-0.0.0.tgz` (164713 bytes) and
`vidimera-store-postgres-0.0.0.tgz` (11521 bytes) and uploaded them with the script. Each
`first-use` leg then installed both tarballs into a scratch project — `added 16 packages in
1s` on the floor leg, `added 16 packages in 2s` on the LTS leg — and ran the script against
a `postgres:18` service container the JOB owned
(`starting PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2)`), not against the workspace's own
embedded Postgres: the rehearsal's one honest gap, borrowed binaries, closes there. Both
legs printed a byte-identical summary line:

```
first-use: OK - source=tarball; memory: 4 transitions, confirmed + intact; 17 probes visible through ./probes; adapter peer range ^0.0.0; postgres half OK (4 transitions, confirmed + intact)
```

Four transitions over `MemoryStore` and four more over the real server, each confirmed and
chain-intact; the adapter's peer range observed as `^0.0.0`, pnpm's pack-time rewrite of
`workspace:^`, satisfied by the record tarball installed beside it. The bare import then
printed `imported @vidimera/record` on stdout on both legs and, on stderr, the two
measurements the public sentences rest on: on the resolved `v22.16.0`,
`ExperimentalWarning: SQLite is an experimental feature and might change at any time`; on
the resolved `v24.19.0`, an empty block. Nothing printed.

**The floor did not move, and why.** Phase-0 ruling 3's trigger is a stable `node:sqlite` —
the checklist's own words are "Check whether a maintained Node line carries a **stable**
`node:sqlite`". Node marked the module a release candidate, not stable, at 24.15;
"Stability 1.2 is not 2", as the design puts it, so the rule's trigger has not fired.
`engines.node` stays `>=22.16` in the root and both packages, CI's exact-floor leg stays
22.16.0, and the README's `Requires Node 22.16 or newer.` is unchanged. What DID move is
the story the rule was written to weigh: the checklist tells release day to weigh the
rehearsal's finding that "every adopter meets it at hello", and on 24.15 and later they no
longer do. This increment supplies that measurement and pins it in a re-runnable job;
refreshing the rule's own text is the next increment's work, not this one's.

**Deviations from the plan as written, stated rather than smoothed over.** Two, plus one
repair the same review round caught.

1. **A `workflow_dispatch` workflow is registered only from the default branch.** The
   plan's Task 3 assumed `gh workflow run --ref first-use-proof` would work as soon as the
   file existed on that branch. It does not: the first dispatch returned
   `HTTP 404: workflow first-use.yml not found on the default branch`, and the raw REST
   endpoint returned the same — registration happens from the default branch, and `--ref`
   only selects which branch's file then runs. On the owner's ruling of 2026-08-29 (option
   1 of three offered), `main` was fast-forwarded to `5c036d0` — Tasks 1 and 2, both
   reviewed clean, gates green on the merged head — and pushed; the workflow registered;
   the run was dispatched from `first-use-proof` at that same commit, so the file that ran
   is the branch's. The consequence is recorded rather than hidden: this increment lands on
   `main` in two pieces, Tasks 1–2 before the run and Tasks 3–4 after, and `main` briefly
   carried a workflow whose proving run had not happened yet. That is harmless, because the
   workflow is dispatch-only and does nothing on push, but it is a real ordering the plan
   did not anticipate, and a later plan that assumes feature-branch dispatch will meet the
   same 404.
2. **The design's and the plan's prescribed sentence over-claimed.** As written — in the
   design's own "What lands" bullet for `docs/guide/integrating.md`
   (`docs/superpowers/specs/2026-08-29-first-use-proof-design.md`) and repeated verbatim in
   the plan — it also named "(and 25.x below 25.7)", a boundary this run did not measure at
   all. The plan-mandated review of Task 3 flagged it, the clause was ruled out, and
   `d95dcc8` removed it. This is a finding against the design as much as the implementation:
   the design itself asked for an unmeasured claim, and the plan carried the same clause
   forward rather than catching it first. The 24.15 boundary itself stays, on a stated
   basis: it is bracketed by the two measured legs (`v22.16.0` warns, `v24.19.0` does not)
   and attributed to Node's own release note, with the bracket — measured either side, never
   at the boundary — written into the record.
3. **The record's install-timing quote over-generalized**, and the same review round caught
   it: it read as though both legs reported the same elapsed install time, when they differ
   (1s and 2s). It now quotes each leg separately. That repair is not visible in `d95dcc8`'s
   diff, because the record was still untracked at the time; it is part of the file this
   commit adds.

**The honest limit.** Ubuntu only: both legs run on `ubuntu-latest`, and consumer-side
behavior on Windows and macOS is inferred from CI's own matrix, which runs from a checkout,
rather than proved here. Tarball source only: `source: registry` is wired and has nothing
to install until the packages exist, so the registry half stays a rehearsed act rather than
a performed one. The prose is unproven — whether the getting-started walkthrough reads right
to a first-time reader is a human's judgment, and the script follows the flow in substance,
not the reader's eyes. The `24` leg measured the patch the runner image resolved on this
date, `v24.19.0`, named in the record for exactly that reason: it lets a later reader tell
"the story is wrong" from "that image was old". The probe tier was reached and not run — 17
probes visible through `./probes`, no verdict computed, because running them needs a
host-declared driver the guide does not ask a first-time reader to write. `pnpm smoke` is
unchanged and remains the per-push packed-artifact gate; this workflow adds a second,
deliberate proof and replaces nothing. And it is ONE run on one date: nothing re-runs it
automatically, so a future runner image resolving `24` below 24.15 would falsify the public
sentence and be caught only at the next dispatch — the leg would fail loudly, which is the
pin working, but only when someone presses it.

**What stays outside, and why.** The release checklist itself, deliberately and entirely:
its first precondition box, its floor-rule text, its pickup instructions, rows 19 and 22's
carry-forward notes, and the deletion of the stale remote `v0.1.0` tag from the paused
attempt are all the NEXT increment's, so that increment can cite this run rather than write
the run and the citation in one breath. `docs/process/release-checklist.md` is
byte-identical across this increment, proved below. **The precondition is therefore
discharged BY CONSTRUCTION, not ticked**: the run exists and the record names it, and the
checkbox is a checklist edit this increment did not make. Also outside: raising the floor
(above); a lazy `SqliteStore` load to remove the warning on old Nodes, which would reshape
the entry point after the API review closed; running the probe tier inside the script,
which needs a host driver; Windows and macOS first-use legs, which the record names as a
gap and which are a later choice; and any change to `.github/workflows/ci.yml`,
`.github/workflows/release.yml` or `scripts/smoke-pack.mjs`, all three proved untouched
below. No deferral-register row was written, retired or restated — row 1's trigger, the
release workflow's first exercise, does not fire here, because this workflow publishes
nothing.

**Cuts.** None. This increment added a proof and corrected two sentences; it cut no
capability and removed no behavior.

**Gate outputs, as measured against this increment's own exit commit**:
`./node_modules/.bin/vitest run` — 67 test files, 821 tests, zero skips (record project
63 / 756; store-postgres 4 / 65), identical to the pre-increment figures, as an increment
that adds no test file should be;
`./node_modules/.bin/tsc --noEmit -p packages/record` and
`./node_modules/.bin/tsc --noEmit -p packages/store-postgres` — both clean;
`./node_modules/.bin/biome check --error-on-warnings .` — 135 files checked, zero errors or
warnings; `node scripts/contract-scan.mjs` — exit 0, no output, re-run after the three
untracked documents were staged, since the scan reaches them only once they are tracked;
`node scripts/api-reference-sync.mjs` — exit 0; `node scripts/docs-index-sync.mjs` — exit 0.
`docs/process/deferral-register.md` loses no row and gains none, and no row's text moved.
The envelope baseline is `4e3e833`, the commit this branch was cut from — NOT
`git merge-base main HEAD`, which advanced to `5c036d0` mid-increment (deviation 1) and
would hide the first two commits from the proof. `git diff 4e3e833 --name-only --
'packages/*/src/*'` — no output; `git diff 4e3e833 --stat --
packages/record/test/byte-stability.test.ts` — no output; `git diff 4e3e833 --name-only --
.github/workflows/ scripts/ docs/process/release-checklist.md` — exactly
`.github/workflows/first-use.yml` and `scripts/first-use.mjs`, so `ci.yml`, `release.yml`,
`smoke-pack.mjs` and the release checklist are all untouched. The full changed set since
that baseline, measured directly (`git diff 4e3e833 954d421 --name-only`), is TEN files: the
five outside the increment's own records — those two, `CLAUDE.md`,
`docs/guide/integrating.md` and `packages/record/README.md` — plus the design
(`docs/superpowers/specs/2026-08-29-first-use-proof-design.md`), the plan
(`docs/superpowers/plans/2026-08-29-first-use-proof.md`),
`docs/analysis/2026-08-29-first-use-proof.md`, `docs/superpowers/INDEX.md` and this
document. The exit commit's own message quotes "five files" for the same range — that count
was taken before the commit's own changes to this document, `docs/superpowers/INDEX.md` and
the three `git add`ed documents were staged, so it measured a narrower tree than the one the
commit actually closed, and a commit body cannot be rewritten to fix it. This section is the
corrected count.

## Post-build-order increment — Checklist refresh

**The fourteenth post-build-order increment, exited (commits `e30c1f5`..`b27f2d0`, closed
by the record commit that follows them).** The ordinal counts the sections above in order
and, as the last six did, does NOT count the documentation-only
signature-enforcement-coverage findings note. **This increment landed no library behavior,
no workflow and no script — five documents changed, two added, and one outward-facing act
on a tag — and moved no maturity marker.** No `docs/concept/` file changed, no sanction was
sought and none was needed: nothing here promotes a capability, narrows a rule, or touches
a sealed enumeration. No `packages/`, `.github/` or `scripts/` file changed at all, proved
by `git diff 3154cc3 --stat -- packages/ .github/ scripts/ docs/concept/` (no output). And
no `docs/process/deferral-register.md` row was written, retired or re-worded: the register
was read, quoted and compared, never edited, and the whole file is byte-identical to the
baseline (proof below). It is the third increment authored 2026-08-29 and the second of the
two that day's path-to-0.1 brainstorm chose: the first-use proof took the measurements and
deliberately left release day's list alone so that this increment could cite the run rather
than write the run and the citation in one breath; this one writes them in, so release day
starts from a list that is true on the day it is read. Design:
`docs/superpowers/specs/2026-08-29-checklist-refresh-design.md`; plan:
`docs/superpowers/plans/2026-08-29-checklist-refresh.md`.

**The gap this closed.** `docs/process/release-checklist.md` had drifted from the tree in
eight places, tabulated in the design and compressed here. Its pickup recipe told a reader
to cherry-pick the preserved release commit `8be3fce` and refresh every `2026-08-19` date
in it — but that commit is stale in CONTENT, not only in date: `[Unreleased]` has gained
six entries since (three post-build-order promotions, `SignatureReport.orphans`, and two
`Fixed` entries), the checklist's own "File changes" list gained four docset flips that
commit never touched, and `CLAUDE.md`'s honest-bound paragraph has been rewritten several
times, so the pick would have been mostly conflicts carrying stale wording. The same notice
carried a CONDITIONAL instruction to delete the remote `v0.1.0` tag if it still existed —
and it still existed, on origin and locally: an annotated tag (object `49502c3`, per the
deletion output; target `8be3fce`) on the reverted commit, and so a standing public claim
that a 0.1.0 had been released. The first precondition read unticked, with the
same-machine rehearsal named as what remained, after the same day's first-use proof had
discharged it by construction. The floor rule carried its 2026-08-19
evaluation (measured on 24.12.0, ship-as-is) and the rehearsal's finding that "every
adopter meets it at hello", both overtaken by Node. The post-publish verification item
asked release day to find a second clean machine, when `.github/workflows/first-use.yml`'s
`source: registry` input is that exact job and already exists. The row-19
disposition item said only that release day "must retire it or explicitly carry it
forward" and stopped there, leaving a written argument to be drafted under the pressure of
the day; the row-22 item already carried a "Note before ruling" naming carry-forward as
the expected ruling, but in a shape row 19 had nothing to match. Both now carry the same
explicitly-disclaimed "Expected ruling" block, so release day reads one form for both rows
and the row-22 note stays as the fuller argument the block compresses. The notice's
owner-side list called five settings "all still open" without recording that two of them
are not merely undone but UNAVAILABLE while the repository is private. And
`docs/process/next-phases.md` and `CLAUDE.md` described the cut's gates as the
three register rows alone — true, and incomplete: a reader of either learned that rows gate
the cut and not that the clean-machine pass was done or that the floor had been
re-evaluated.

**What landed.** Two commits, neither of them touching code, and no red commit:

- `docs/process/release-checklist.md` (`e30c1f5`) — six sites, 87 insertions and 35
  deletions in one file, with every other line of the list byte-identical, proved by
  reading `git diff -U0` hunk by hunk: all eight hunks fall inside the six named sites.
  (1) The `PAUSED` blockquote becomes a STATUS rather than a recipe — what has landed since
  the pause and what each landing changed for the cut, the state of both engineering
  preconditions, the re-cut instruction with `8be3fce` demoted to a precedent to diff
  against, the tag's deletion, and the owner-side list with the platform bound on two of
  its items. It no longer carries a cherry-pick command. (2) The phase-6 precondition,
  ticked (below). (3) The floor-rule item, extended (below) — its existing sentences kept
  byte-identical and the 2026-08-29 evaluation appended after them. (4) The post-publish
  verification item, rewritten to dispatch `.github/workflows/first-use.yml` with
  `source: registry` and `version: 0.1.0` against the published packages, on the same
  no-checkout job that discharged the precondition, and naming the three script and
  workflow improvements parked for that dispatch's own commit — the floor leg's warning
  grep narrowed to the SQLite-specific message, a header note that the script's `pg` import
  resolves only because npm hoists the adapter's dependency, and the review view's
  `subjectRef` assertion — so the recorded tarball run's script stays byte-identical until
  the run that supersedes it. (5) and (6) The row-19 and row-22 disposition items, each
  extended with an expected ruling (below).
- The tag `v0.1.0` — deleted on origin and then locally on the owner's authorization of
  2026-08-29, the one outward-facing act in this increment and the only thing it changed
  outside the tree. What the tag pointed at was confirmed BEFORE the deletion rather than
  reconstructed after it: `git show -s --format` over `v0.1.0^{commit}` printed `8be3fce`
  and its subject, the preserved 0.1-cut commit that the pause reverted whole, and the plan
  made a different target a STOP. `git push origin :refs/tags/v0.1.0` reported the tag
  deleted; `git tag -d v0.1.0` followed. The deletion is irreversible in place but not
  lossy: the commit stays in history, is named in the notice, and a tag can be recreated on
  it in one command. What is gone is the claim, not the code.
- `docs/process/next-phases.md` and `CLAUDE.md` (`b27f2d0`) — the two mirrors, 17
  insertions across two files and nothing removed. The next-phases paragraph lands at the
  END of the "What gates the next cut" passage — directly after its closing sentence,
  "Each item below names its row and quotes its trigger verbatim.", and before the
  `### Consumability` heading — not beside the sentence that OPENS the passage by naming
  the three rows. It carries the two engineering preconditions that also gate the cut, both
  moved on 2026-08-29; `8be3fce` as a precedent and not a commit to cherry-pick; the stale
  tag gone; and the owner-side list as what still gates the cut outside this repository. It
  points at the checklist as the authority rather than restating it as a second claim of
  record — "the checklist is the authority; this is the pointer", in its own words.
  `CLAUDE.md`'s honest-bound paragraph gains one sentence carrying the same two facts plus
  the owner-gated ones.
- `docs/superpowers/INDEX.md`, this document, and the `git add` of the design and the plan
  (this commit) — the record. The counted sentences move by the two files added, to 37 in
  `specs/` and 40 in `plans/`, measured with `git ls-files` after the `git add` rather than
  incremented from the previous figure; `docs/analysis/` stays at 19, because this
  increment adds no analysis record — it has no run and no measurement of its own to write
  down, only the previous increment's to cite. The present-tense vitest and Biome counts
  did NOT move and were re-measured rather than assumed: this increment adds no test file
  and no file Biome scans. Every figure under an earlier `Gate outputs` heading is pinned
  to a past commit and stayed byte-identical.

**Pre-argued, not decided — stated here because this is where it could be misread.** Rows
19 and 22 keep their numbers, their scopes, their triggers and their date cells; both are
OPEN, and this increment decided neither. What each item gained is an EXPECTED ruling with
its reasoning, prefixed in the file by its own disclaimer — release day "confirms or
overrules", and the row is not decided there. Row 19's expected ruling is carry forward,
because nothing has changed signature encoding or key handling since the row opened on
2026-08-23: the no-edge containment increment's signer-result memo changed how many times a
signer is asked, never what is signed or how it is keyed, so the row's first trigger
disjunct has not fired and the deferral's reason stands. Row 22's is carry forward too,
because the surviving orphan half's only measured containment takes a horn that needs a
sanction nobody has sought — "declined at this cut unless sought on its own merits", in the
checklist's own words — while the `SignatureStore` contract's delegation and the visibility
`SignatureReport.orphans` gives a host are what stand in the meantime. Both rows' triggers
name the 0.1 cut as a disjunct — and row 22's names the publish event as a second one the
cut fires, "or that lifts `private: true` and publishes the package", since the release
commit drops `private: true` and the dispatch publishes — which is exactly why the ruling
belongs to the cut and not to this increment: re-deriving either trigger today to drop
those disjuncts would be a register decision taken on the grounds that the answer is
already known, which is the pre-judging the trigger discipline exists to prevent. Row 22's
row was restated by the row-22 truth-repairs increment and re-scoped by the no-edge
containment increment, and its date cell still reads
`2026-08-23 (restated 2026-08-28; re-scoped 2026-08-29)`,
unchanged by this increment. What each carry-forward would MEAN is written down too, and
row by row rather than in one recipe: for row 19, restating the trigger without the cut
disjunct; for row 22, restating it without BOTH disjuncts the cut fires — the publish one
and the cut one — leaving the durable-backing and third-horn-sanction disjuncts standing,
so that what is restated is not a trigger already fired. Each ruling is then recorded here,
and the day's work is confirming an argument rather than composing one.

**The floor did not move, and why.** Phase-0 ruling 3's trigger is literal: the item asks
release day to "Check whether a maintained Node line carries a **stable** `node:sqlite`".
`node:sqlite` reached Stability 1.2 — release candidate — in Node 24.15.0, not Stability 2,
so the rule as written has not fired. `engines.node` stays `>=22.16` in the root and both
packages, CI's exact-floor leg stays 22.16.0, and `packages/record/README.md`'s
`Requires Node 22.16 or newer.` is untouched; this increment changed no manifest and no
workflow, which the envelope proof below covers. What the item gained is the measurement
the rule was written to weigh. The change that made the module a release candidate also
removed the runtime `ExperimentalWarning`, so the rehearsal's "every adopter meets it at
hello" finding is now true only for adopters below 24.15 — measured, not assumed, by the
first-use run's two legs (`v22.16.0` warns; `v24.19.0` is silent), with the guide and the
package README already saying so. The item is dated on its face and hands the question
back: release day re-evaluates against the Node lines THEN, and a Stability-2 `node:sqlite`
on any maintained line by the cut fires the rule as written.

**The one checkbox ticked, and its bound.** The file carried 19 unticked boxes and none
ticked before this increment, and carries 18 unticked and exactly one ticked after —
measured on both sides, not asserted. The box that moved is the phase-6 clean-machine
precondition, ticked "Discharged by construction, 2026-08-29:" against
`.github/workflows/first-use.yml`'s no-checkout job, `First-use run 33242645696 on origin`
at commit `5c036d0`, and `docs/analysis/2026-08-29-first-use-proof.md` as the record.
Ticking a checkbox is a claim, so the item states what the run did not prove in the same
breath: ubuntu only; tarball source only until the cut; "the getting-started prose itself
unproven"; "the probe tier not run". The owner's-bar precondition directly below it stays
UNTICKED deliberately — it is a judgment only the owner makes, on the day, and no
repository act can discharge it. Every other box on the list — the file changes, the
repository and registry settings, the dispatch, the paperwork — stays unticked: this
increment prepares the list, it does not run it.

**Deviations from the plan as written, stated rather than smoothed over.** Five, all
minor, none caught by a gate — two are wrinkles in the landed text, and three are findings
against the design, the plan and a commit body rather than against the implementation.

1. **A prescribed line overruns the file's own wrap.**
   `docs/process/release-checklist.md:24` runs to 98 characters (100 bytes, for one
   em-dash), the longest line in the file. It is text the plan prescribed verbatim, and it
   is long because it carries an inline path
   (`docs/analysis/2026-08-29-first-use-proof.md`) inside a blockquote whose `> ` marker
   eats two more columns. No gate measures markdown line length, and re-wrapping would have
   moved away from the plan's own words, so it was left as written and is recorded here
   instead.
2. **`CLAUDE.md`'s new sentence paraphrases where it could have quoted.** It says no publish
   token exists; the checklist's corresponding item — a live granular `NPM_TOKEN` secret,
   still open — is what that paraphrases. The paraphrase is accurate on this date and
   `CLAUDE.md` points at the checklist as the authority, so it is not a second claim of
   record; but a reader comparing the two will find wording, not text.
3. **The plan disagreed with itself about the checkbox baseline.** Its Global Constraints
   named 19 unticked boxes on 2026-08-29 while Task 1's own first step gave `21` as the
   expected reading. That step also said to measure and use what was read, which is what
   happened — the file held 19 — so the discipline absorbed the defect rather than the
   implementation inheriting it. It is recorded because that constraint is the only reason
   the wrong figure did not become the record.
4. **The design's gap table overstated the row-22 gap.** Its row 6 covers both disposition
   items in one cell, saying of each that it quotes release day's instruction to retire the
   row or carry it forward "and stops there". That is true of the row-19 item and false of
   the row-22 one: at the baseline the row-22 item already carried a
   ten-line "Note before ruling" naming "carry forward, with the growth visible" as the
   expected ruling, explaining why, and recording the third-horn sanction as declined at
   this cut — text this increment did not touch, readable at the baseline with
   `git show 3154cc3:docs/process/release-checklist.md`. What row 22 lacked was the SHAPE
   row 19 had nothing to match, not an argument, which is why the increment gave both rows
   one block and left the note standing as the fuller argument the block compresses. The
   design lands as authored — it is a dated artefact and this is a finding against it,
   not an edit to it — and the "gap this closed" paragraph above is the corrected statement.
5. **Task 2's commit body names the wrong paragraph.** It says the `next-phases.md`
   paragraph landed "after the passage's first paragraph"; it landed after the SECOND. The
   passage's blank lines fall at 27, 80, 88 and 100, so its first paragraph runs 28-79, its
   second runs 81-87, and the new paragraph is 89-99 — directly after the closing sentence
   "Each item below names its row and quotes its trigger verbatim." The plan's Task 2 anchor
   made the same misidentification and the body inherited it. The "What landed" bullet above
   already states the correct location, and a commit body cannot be rewritten, so this
   section is the corrected location.

Otherwise both tasks executed the plan as written, checked rather than assumed:
`git show e30c1f5 --stat` is one file, and `git show b27f2d0 --stat` is exactly `CLAUDE.md`
and `docs/process/next-phases.md` — the files each task was scoped to and no others.

**The honest limit.** Nothing about the cut itself moves. The repository stays private,
`private: true` stays in both manifests, no version is bumped, no token exists, and this
increment publishes nothing — it prepares the list, it does not run it, and a true list is
not a release. The owner-side items are not the repository's to close, and two of them
cannot even be ATTEMPTED until the visibility flip, because the platform refuses branch
protection with code-owner review and private vulnerability reporting on a private
repository under this account's plan; the list can say so and that is all it can do, which
is also why "public first, then dispatch" is not only npm's provenance ordering here.
Pre-argued is not decided: if release day finds a reason to retire row 19 or row 22, the
pre-written text is a draft to overrule and carries no weight against the day's judgment.
The floor evaluation is DATED — it is true of 2026-08-29, and the item itself tells release
day to re-evaluate. The re-cut recipe is a list of files, not a commit: release day still
composes the release commit by hand, and the recipe removes a trap rather than automating
the flip. And the whole increment is prose about a list — nothing here is executable, no
test pins any of it, and it will go stale exactly the way the text it replaced did, which
is why the notice now carries its own refresh date on its face.

**What stays outside, and why.** The cut, entirely: every "File changes" and "Repository
and registry settings" item stays unticked, and nothing is bumped, flipped, published or
tagged. Raising the floor, per the rule's own unfired trigger. The three parked script and
workflow improvements, which land with the `source: registry` dispatch so the recorded
tarball run's script stays byte-identical until the run that supersedes it. Retiring or
re-deriving rows 19 and 22, which belongs to the cut. Rewriting the historical accounts of
the paused attempt — this document's release-readiness section,
`docs/process/open-items-plan.md` and `docs/process/open-items-sessions.md` describe that
cut as it stood when they were written, and per the tier discipline they are left alone;
the mentions of `8be3fce` there are history, not instructions. Both open-items documents
rest on the same 2026-08-19 survey and its measurements, taken well before this refresh, so
their description of the PAUSED banner — its cherry-pick pickup recipe, and the `v0.1.0`
tag as something that might still exist — is an account of what the banner said then, not
of what it says today; the checklist itself is the authority on that. `docs/guide/` and
`packages/record/README.md`, which the first-use proof already corrected. And any
deferral-register edit at all: no row was written, retired or
restated, row 1's trigger does not fire here because nothing was published, and the file is
byte-identical to the baseline.

**Cuts.** None. This increment rewrote a list and deleted a stale tag; it cut no capability
and removed no behavior.

**Gate outputs, as measured against this increment's own exit commit**:
`./node_modules/.bin/vitest run` — 67 test files, 821 tests, zero skips (record project
63 / 756; store-postgres 4 / 65 — each project measured on its own run as well as together),
identical to the pre-increment figures, as an increment that adds no test file should be;
`./node_modules/.bin/tsc --noEmit -p packages/record` and
`./node_modules/.bin/tsc --noEmit -p packages/store-postgres` — both clean;
`./node_modules/.bin/biome check --error-on-warnings .` — 135 files checked, zero errors or
warnings; `node scripts/contract-scan.mjs` — exit 0, no output, re-run after the two untracked
documents were staged, since the scan reaches them only once they are tracked;
`node scripts/api-reference-sync.mjs` — exit 0; `node scripts/docs-index-sync.mjs` — exit
0, run after the INDEX row and both counts were written and the pair staged.
`docs/process/deferral-register.md` loses no row and gains none, and no row's text moved:
the whole file is byte-identical to the baseline, and rows 1, 19 and 22 were additionally
compared cell by cell after splitting each row on the table's own separator. The envelope
baseline is `3154cc3`, the commit this branch was cut from.
`git diff 3154cc3 --stat -- packages/ .github/ scripts/ docs/concept/` — no output, so the
library, the workflows, the scripts and the sealed set are all untouched. The full changed
set since that baseline, measured directly (`git diff 3154cc3 --name-only` at this commit),
is SEVEN files: `CLAUDE.md`, `docs/process/release-checklist.md`,
`docs/process/next-phases.md`, this document, `docs/superpowers/INDEX.md`, and the two
added pair documents (`docs/superpowers/specs/2026-08-29-checklist-refresh-design.md`,
`docs/superpowers/plans/2026-08-29-checklist-refresh.md`). `git ls-remote --tags origin`
piped to `grep -c v0.1.0`, and `git tag -l v0.1.0` piped to `wc -l`, both read `0`: the
stale tag is gone from the remote and from this clone.

## Post-build-order increment — Checklist repair (documentation only)

**The fifteenth post-build-order increment, exited.** The ordinal counts the sections above
in order and, as the last seven did, does NOT count the documentation-only
signature-enforcement-coverage findings note. **This increment landed no library behavior,
no workflow and no script — three documents changed, one added the day before it as its own
commit — and moved no maturity marker.** No `docs/concept/` file changed, no sanction was
sought and none was needed: nothing here promotes a capability, narrows a rule, or touches
a sealed enumeration. No `packages/`, `.github/` or `scripts/` file changed at all. And no
`docs/process/deferral-register.md` row was written, retired or re-worded: rows 1, 19 and
22 are untouched, and the two pre-argued dispositions are left exactly as the checklist
refresh wrote them — this increment makes release day's list true, it decides nothing on
it. It has no spec/plan pair, deliberately: its design argument is
`docs/analysis/2026-09-01-zero-one-cut-gaps.md` section 4, committed the same day as
`565f7b4`, which scoped the four edits and named what was out of scope. A bounded
documentation change to one file did not warrant a third document to say so.

**The gap this closed.** The 2026-09-01 gaps record read the cut's gate set whole rather
than through the 2026-08-30 sweep's code-only frame, and found three defects in the list
release day runs from.

1. **The docset flip item was an enumeration, and had been short twice.** It named eight
   sites. Four of those eight had themselves been added at the open-items plan's stage-2
   pass, which found them missing from the paused attempt's flip set — and the gaps record
   found three more the list still did not name: `CHANGELOG.md`'s preamble and its "Known
   not-done" block, both of which go flatly false at the cut, and the second workspace
   caveat in `docs/guide/api-reference.md` plus the probe-tier caveat in
   `docs/guide/integrating.md` — a file no version of the list had ever named. A list
   maintained by hand across a growing docset fails this way structurally, not by
   carelessness. The item now carries a two-tier `git grep` recipe: tier 1 for claims that
   go false, which must come back empty before the release commit; tier 2 for from-source
   and in-this-workspace sentences, which need a ruling rather than a flip because they can
   stay true for a reader inside the workspace while being the wrong sentence for an
   adopter. The eight named sites survive only as the worked example of what the recipe
   caught. **Measured at `565f7b4` before the edit and re-measured after: tier 1 returns 16
   hits across 9 files, tier 2 returns 22** — figures recorded as a worked example, dated,
   not as a pin: the recipe is what release day runs, never the count. The recipe's own trap
   is named in place: this checklist contains the search terms as regex and as prose, so the
   path list deliberately excludes `docs/process/`, whose historical accounts describe the
   pre-cut state correctly in the past tense and must not be flipped.
2. **The CHANGELOG item covered only the section cut.** Executed exactly as written it
   produced a file carrying a `[0.1.0]` heading above a paragraph reading "No release has
   been cut". The item now names both claims, and rules in place on the third hit — the
   publish-tooling entry's own narration of what it did — as one that stays.
3. **The irreversible step had nothing in front of it and no way back.** `release.yml`
   publishes `@vidimera/record` then `@vidimera/store-postgres` in one job; its guard checks
   `private` and `0.0.0` and nothing about the registry. A failure between the two publishes
   leaves the first live and immutable and the registry in the state the lockstep ruling
   forbids. A new "Pre-flight, immediately before the dispatch" section carries three boxes:
   prove publish rights against the live scope rather than token validity alone (and that
   neither name is taken); know the recovery — npm's unpublish window, flagged as an
   external policy to confirm on the day rather than trust from this file, with a 0.1.1 as
   the only exit once it closes; and know what state `main` is in if the dispatch never
   succeeds, since the release commit is tagged and pushed before the dispatch runs and
   asserts a publish that has not happened. That last is where the 2026-08-19 attempt
   stopped, and the whole-commit revert of `8be3fce` is named as the precedent.

**One item promoted, not added.** Whether the entry point keeps re-exporting `SqliteStore`
eagerly was the only cut-gating decision with no checkbox: it was weighed inside the floor
rule's prose, which is how a behavioral decision gets defaulted into rather than taken. It
now has its own section with the three recorded exits (ship as-is — the recorded default;
lazy-load; raise the floor to 24.15) and the reason it stands apart from the floor rule: the
floor rule can fail to fire, as it did on 2026-08-29, while this question still wants an
answer. Nothing about the recorded default changed; only whether it is taken knowingly.

**What moved, and what did not.** `docs/process/release-checklist.md`'s open checkbox count
moves **18 to 22** — one for the entry-point decision, three for pre-flight — and its
section list in the opening paragraph now names both new sections.
`docs/process/next-phases.md` gains a paragraph naming the entry-point decision as a third
engineering question and pointing at the gaps record for the argument. `CLAUDE.md` is NOT
edited: nothing in its release paragraph became false, and it already directs a reader to
the checklist as release day's authority. The gaps record is NOT edited either — it is a
dated artefact and lands as authored, so its own present-tense "18 open checkboxes" stays
pinned to `710aa69` by its stated bound, with a dated addendum at its foot recording that
this increment moved the figure.

**Gate outputs, as measured against this increment's own exit commit.** `contract-scan` and
`docs-index-sync` both exit 0. No TypeScript, workflow or script file changed, so
`typecheck`, `test`, `build`, `smoke`, `lint:strict` and `api-sync` are unaffected and were
not re-run — the same bound the checklist refresh recorded for the same reason.

## Post-build-order increment — Truth restoration (comments, tests, and one output-identical edit)

**The sixteenth post-build-order increment, exited (commits `fd8a6ea`..`5672c89`, closed by
the record commit that follows them).** The ordinal counts the sections above in order and,
as the last eight did, does NOT count the documentation-only signature-enforcement-coverage
findings note. **No sanction was needed and none was sought**: nothing in `docs/concept/`
moves, no maturity marker moves, no capability is promoted, and the public surface does not
change (`pnpm api-sync` unaffected, `docs/guide/` untouched). Design:
`docs/superpowers/specs/2026-09-01-truth-restoration-design.md`; plan:
`docs/superpowers/plans/2026-09-01-truth-restoration.md`.

**What the increment is.** Every stale sentence the tree ships or asserts about itself made
true, and every cheap claim that can become a test made one — assembled from the 2026-08-30
sweep's "increment 1" and its section 9 (`docs/analysis/2026-08-30-pre-release-code-gaps.md`
§§2, 9), scoped as step 1 of the revised pre-cut sequence
(`docs/analysis/2026-09-01-zero-one-cut-gaps.md` §5). One `packages/*/src/` edit is
behavior-adjacent (`kernel/expiry.ts`'s leg-index derivation, required output-identical);
everything else is comments and tests.

**Five rulings taken at scoping, held through exit, so they are not re-litigated here
either.**

1. Item 23 (the Postgres payload-posture claim) rides this increment rather than the
   adapter-evidence increment — a shipped claim should be true before it ships.
2. The (5)→(6) race pair is added as tests, not recorded-excluded — `RaceOnceStore`
   already exists and the tests are small.
3. `listDue()` gets the honest note, not a retroactive claim: the row-6 API review's
   name-by-name pass never mentions it, so this increment records that no recorded ruling
   covers the name and dockets it to the 1.0 freeze, beside its ids-vs-records shape.
4. Item 22's optional Postgres kernel-enlisted leg is deferred to the adapter-evidence
   increment; the two new enlisted-token tests run over `SqliteStore` only, mirroring the
   existing direct-seam test.
5. Item 40 is pin-only: containment of key-retirement minting stays sequenced behind the
   durable `SignatureStore` backing, the first post-0.1 increment, per the register.

**Cluster A — five shipped-source comment repairs, each verified stale against
`main = ead1f0b` on 2026-09-01, task 1 except A5.**

- `operator-surface.ts:34-37` — was: the three redemption call names "flagged to the
  pre-0.1 naming review"; is: that review RATIFIED the triad and retired deferral register
  row 6 on 2026-08-19 (`docs/analysis/2026-08-19-phase-1-api-review.md`).
- `id.ts:17` — was: `node:crypto` "the project's runtime baseline (Node >= 24 …)"; is: the
  declared floor, Node 22.16, the `engines` field in both manifests.
- `store/store.ts:122` — was: a sync→async flip anticipated "once a real Postgres adapter
  lands"; is: reworded against the adapter that exists, `@vidimera/store-postgres`, landed
  2026-08-19.
- `refusal-codes.ts:~210-212` — was: finalize's "steps (3)-(5.7)" named as "the only
  callers of `appendsOn`"; is: `decline.ts` calls it too, since the recorded-human-decline
  increment, through the shared `refuseMaybeAppend` helper (exported for decline as its
  second caller).
- `kernel/expiry.ts:135-136` (task 2) — the one behavior-adjacent edit:
  `isFinalLeg(0, profile.legs.length)`, a hardcoded leg index fed to the
  `expired`/`redemption-failed` append's meta, replaced with the derived index the sibling
  `dueAt` producer already computes at `expiry.ts:75` (`profile.legs.findIndex(...)`).
  **Output-identical, argued and pinned**: both `expired` and `redemption-failed` are
  terminal, so the fed `nonTerminal` flag is `false` for every input under either
  derivation — no byte pin could move. The new pin, in `clocks.test.ts`, asserts
  `nonTerminal: false` on that append for a final-leg, multi-leg profile — the one shape
  where a hardcoded `0` and the derived index could ever disagree.

A1 carried two paired documentation edits, both landed at task 1: the "flagged to" tense
fix at this file's own §9 row (line ~414), and ruling 3's dated note recording
`listDue()`'s no-ruling status — see "The two corrections this file made to itself" below.

**Cluster B — two test-comment repairs, each paired with the tests that make the repair
honest.**

- B1, `clocks.test.ts:200-202` (item 22, task 3) — was: the shared prologue's enlisted
  branch reachable only through direct `redeem()` "(the token seams take no tx)"; is:
  false since the effect-result increment — all three redemption seams carry `opts.tx`.
  Repaired the parenthetical and added the twins: `beginRedemption(recordId, content,
  { tx })` against a due `confirmed` record and `completeRedemption(recordId, token,
  content, { tx })` against a due `redeeming` record, both over `SqliteStore`, mirroring
  the existing direct-seam enlisted-due test — each asserts the due refusal
  (`unredeemable-state`), no edge appended, and that an un-enlisted re-invocation then
  resolves the clock.
- B2, `redeem.test.ts:42-43` and `redeem-token.test.ts:585-586` (item 25, task 4) — was:
  the mismatch-plus-racing-writer pair "not constructible without a bespoke racing"
  store; is: false since `RaceOnceStore` exists. Fixed both comments and added the pair
  test each ladder lacked — mismatched content presented while `RaceOnceStore` is armed on
  the success append (`confirmed → redeemed` on the direct ladder; the completion append
  on the token ladder) — asserting both the refusal (`effect-mismatch`) AND the racer's
  fired-state staying `false`, so the pin is on ORDER (rung (5) correspondence beats rung
  (6)'s append) rather than merely on outcome.

**Cluster C — five new-evidence tests, the sweep's section 9 conversions.**

- C1 (item 91, task 5): the `unknown-profile` arms at `kernel/finalize.ts:209-215` and
  `kernel/seal.ts:63-67`, called defensive and untested, exercised by two
  `refusal-matrix.test.ts` tests under the established two-instance shape (open, and for
  seal confirm, under one `create()` instance; drive `finalize()`/`seal()` from a second
  instance whose catalog lacks the profile) — both assert `unknown-profile`,
  refusal-class, no append. The two "not exercised" comment sentences were deleted in the
  same commit as the tests that license the deletion.
- C2 (item 84, task 6): the nine defined-only `transitionRef` assertions upgraded to
  equality against the appended edge's digest (`signing-enforce.test.ts:181, 365, 402,
  438, 475, 502`; `decline.test.ts:136`; `findings-seams.test.ts:234, 256`), mirroring
  `chain-verify.test.ts:165-169`. The four no-edge assertions in those same files stay
  unchanged, pinning the opposite behavior. This task is also where this file's own
  over-broad sentence at ~2538 was softened — see "The two corrections" below.
- C3 (item 40, pin only, task 7): one baseline test in `no-edge-containment.test.ts` — a
  healthy, untampered, sealed signing record, its `keyRef` dropped from the verifier
  registry, four repeated `finalize()` calls: each takes the no-edge refusal path, the
  chain stays flat, and the sidecar grows by exactly one orphan entry per call. No
  containment, no source change — the register's "6 to 13 over eight calls" figure now
  rests on a live pin instead of a retired rig.
- C4 (item 90, task 8): `magnitude?: string` (confirmed string-only on both
  `FindingRaisedPayload` and `AcknowledgedPayload`, `types.ts` — the sweep's "string
  and/or numeric" hedge does not survive the type) had been pinned only absent;
  `byte-regression/findings.test.ts` gained a flow that raises and acknowledges a finding
  WITH `magnitude` set, freezing six new digest values in one new `PINNED_MAGNITUDE_DIGESTS`
  array.
  `byte-stability.test.ts` is untouched; no existing pinned literal moved.
- C5 (item 23, task 9): `postgres-store.ts:20-24`'s claim that the JCS-invisible-member
  round-trip behavior is "exactly `SqliteStore`'s" was untested. `postgres-store.test.ts`
  gained the mirror of `sqlite-store.test.ts:107-125` against the embedded server: a
  function-valued payload member is dropped on the JSON round-trip, consistently with the
  digest — `verifyChain(chain).intact === true` afterward. No source change; the comment
  held.

**The two corrections this increment made to `implementation-status.md` itself, so their
provenance sits in the file that changed rather than only in a commit body.**

1. **Line ~414, the §9 row (task 1).** The "flagged to the pre-0.1 naming review" clause
   was tense-fixed to record row 6's actual 2026-08-19 ratification, and the same edit
   extended the divergence item to `listDue()` with ruling 3's dated note: "NO recorded
   ruling covers the name (noted 2026-09-01, the truth-restoration increment)", docketed
   to the 1.0 freeze beside its ids-vs-records shape — not claimed "retroactively covered
   by the whole-surface ratification," a reading the review's own text does not support.
2. **Line ~2538, the AL2 signature-enforcement-coverage account (task 6).** The sentence
   "no append site ties the returned transition reference to the appended edge's own
   digest" was over-broad as first written even then — the hash-broken cell had the
   equality pinned at `chain-verify.test.ts` since the step-1 corpus. Softened to the true
   bound, "no signature-broken cell tied [it]," with the fact of the upgrade recorded in
   the same breath: "the truth-restoration increment (2026-09-01) upgraded all nine cells
   to equality against the chain head."

A third, smaller narrative edit rode task 2 alongside the A5 code change: the §10.1 row's
"One residual hardcoded leg index remains" tail (line ~423) now reads that the index "was
removed at the truth-restoration increment (2026-09-01) … output-identical … pinned in
clocks.test.ts". That edit is the A5 repair's own record, not counted among the two
corrections above — those two are the file noticing and fixing claims it had gotten wrong
on its own account, not restating a code change made elsewhere in the same task.

**Gate outputs, as measured against this increment's own exit commit.**
`./node_modules/.bin/tsc -p packages/record --noEmit` and
`./node_modules/.bin/tsc -p packages/store-postgres --noEmit` — both clean.
`./node_modules/.bin/vitest run` — 67 test files, 832 tests, zero skips (record project
alone: 63 files, 766 tests; store-postgres alone: 4 files, 66 tests — each project measured
on its own run as well as together). Up from the pre-increment 67 files/821 tests (63/756
and 4/65) by exactly the eleven new tests this increment's pins add: one at A5, two at B1,
two at B2, two at C1, one at C3, two at C4, and one at C5 — cluster A's other four sites and
C2's nine assertion upgrades touch no test count, since they repair comments or tighten an
existing assertion in place rather than adding one.
`./node_modules/.bin/biome check --error-on-warnings .` — 135 files checked, zero errors or
warnings. `node scripts/contract-scan.mjs` — exit 0, silent. `node
scripts/api-reference-sync.mjs` — exit 0, silent. `node scripts/docs-index-sync.mjs` — exit
0, silent, re-run after this section and the CHANGELOG entry were written, since the scan
reaches this file's own new content only once it is written.
`docs/process/deferral-register.md` and `docs/process/release-checklist.md` are both
byte-identical to the branch's baseline — neither was opened, let alone edited.
`git diff ead1f0b --stat -- packages/ .github/ scripts/ docs/concept/
packages/record/test/byte-stability.test.ts` names only `packages/` lines — seventeen files
(seven `src/` sites, ten test files), the whole comment-and-test surface clusters A through
C touch; `.github/`, `scripts/`, `docs/concept/` and the frozen byte-stability oracle carry
no diff at all.

**Build and smoke, run 2026-09-01 against this same commit** — the spec's Verification list
names both and neither had run above.
`./node_modules/.bin/tsc -p packages/record/tsconfig.build.json && ./node_modules/.bin/tsc -p
packages/store-postgres/tsconfig.build.json` (what `pnpm build` runs) — clean, `dist/`
emitted for both packages. `node scripts/smoke-pack.mjs` (what `pnpm smoke` runs) — exit 0,
`smoke: OK`, pnpm resolving from this machine's PATH (the npm-global install, 11.18.0, not
the corepack shim recorded elsewhere as broken on this machine) for the adapter's `pnpm
pack` step; a pnpm-environment failure would have been recorded here as a bound rather than
claimed green, but none occurred. Both gates' artifacts are gitignored or scratch-directory
temporary; `git status` stays clean throughout. CI's `test` matrix runs both on every push
regardless of this machine's pnpm posture and remains the gate that proves them across the
declared Node floor and current Node.

**What stays outside, and why.** No deferral-register row moved: the file is untouched, and
neither row 1's publish trigger nor row 19's nor row 22's cut trigger fires from a
comment-and-test increment that publishes nothing. No release-checklist box was ticked —
this increment does not touch `docs/process/release-checklist.md` at all. **Row 22a is
unchanged**: C3's key-retirement pin is a BASELINE, not containment — it states the growth
deferral register row 22's own figure describes, measured on a live rig instead of one that
no longer exists, and ruling 5 records why containment stays out: sequenced behind the
durable `SignatureStore` backing, the first post-0.1 increment. No maturity marker moved,
no public-surface name changed, and no `docs/concept/` file was opened.

**Cuts.** None. This increment repaired sentences and added tests; it removed no capability
and no behavior, and its one source edit is proven output-identical above.

## Post-build-order increment — Registry-facing hygiene (unknown-option-key reword,
`@types/node` pin, manifest metadata)

**The seventeenth post-build-order increment, exited (commits `4bad794`..`7fb9324`, closed
by the record commit that follows them).** The ordinal counts every section above in order,
excluding only the documentation-only signature-enforcement-coverage findings note, the same
rule the sixteen before it used. **No sanction was needed and none was sought**: nothing in
`docs/concept/` moves, no maturity marker moves, and the public surface does not change
(`pnpm api-sync` unaffected — the renamed helper was never exported). Design:
`docs/superpowers/specs/2026-09-01-registry-hygiene-design.md`; plan:
`docs/superpowers/plans/2026-09-01-registry-hygiene.md`.

**What the increment is.** Three decisions the 2026-08-30 sweep grouped as "registry-facing
hygiene" (`docs/analysis/2026-08-30-pre-release-code-gaps.md` §2 increment 2: items 10, 45,
47), promoted by the 2026-09-01 gaps record on its immutability lens: each becomes unfixable
for 0.1 the moment the packages publish — the registry page renders from the 0.1 tarball's
manifest, and the error string ships in `dist/*.js` under the provenance attestation. One
adopter-visible error string changes; nothing exported moves.

**Three rulings taken at scoping (2026-09-01, in the design document), held through exit.**

1. **Item 45 — reword the unknown-option-key error head, rename the helper, pin the new
   head.** New head: `unknown option key (<key>)`, every caller's tail (the seam's
   accepted-keys sentence and its SPEC citation) unchanged. Helper renamed
   `governedUnavailable` → `unknownOptionKey`. Plus ONE positive `assert.match` pin on the
   new head at one seam, and the two existing `assert.doesNotMatch` negatives updated to the
   new head, keeping their meaning (a structural error is not the unknown-key string).
2. **Item 47 — pin `@types/node` to the floor major (`^22`), decided empirically.** The
   increment's first act was the check itself: set the pin, `pnpm install`, run the full
   typecheck. A clean result lands the pin with a Dependabot ignore guard; a typing failure
   on floor-only APIs (the `node:sqlite` surface named as the suspect) would have kept `^26`
   and recorded the exact-floor CI leg as the deliberate gate instead. See the measured exit
   below.
3. **Item 10 — add `homepage`, `bugs`, `keywords` to both manifests; omit `publishConfig`
   deliberately.** `release.yml` already passes `--access public` on the publish command
   line, so `publishConfig.access` would be a second copy of the same fact.

**On SPEC §9.1, said precisely so the reword is not mistaken for a fork.** §9.1's
error-shape rule — a feature field for an unimplemented capability fails fast with an
explicit unavailable-in-this-build error — binds GUARDS. Measured against the tree at
scoping, zero governed fields remained (`config.ts`'s own count, "1 → 0" at the AL2
freshness increment), so no site emits a §9.1 guard error; the four surviving
`unknownOptionKey` call sites are generic unknown-option-key throws that merely ride the
guard era's helper, and its old head named a mechanism the tree no longer has. Rewording
that head neither touches §9.1 nor weakens it: if a governed field ever returns, its guard
mints its own §9.1-shaped message at its own site. The old head was "NOT pinned by any
test … Ordinary prose, not a byte contract" by `config.ts`'s own prior recorded ruling, so
the reword broke no gate — and this increment ends that unpinned state for the NEW head.

**Ruling 1's full site list, mechanical everywhere but the header.**
`packages/record/src/config.ts` — the helper (`~:97-121`, rename plus a HISTORY paragraph
naming the old head verbatim so the phrase survives descriptively) and the
`validateProfile` count comment (`~:599-609`), its "the two must not diverge again" pairing
kept, both sides updated together. The four callers, import plus call site, tails
byte-identical: `kernel/open.ts` (`~:22` import, `~:48` comment, `~:57` call),
`kernel/finalize.ts` (`~:107` import, `finalizeOptionMessage` call), `kernel/decline.ts`
(`~:22` import, `~:57` call), `kernel/redeem.ts` (`~:82` import, `validateRedeemOptions`
call). `packages/record/test/construction-validation.test.ts` — the header (`~:1-8`) and
both `doesNotMatch` negatives (`~:81-85`, `~:376-380`). `packages/record/test/decline.test.ts`
(`~:150`) — the positive pin. `CLAUDE.md` — two identical parentheticals (`~:34`, `~:241`);
the other four bare `GOVERNED` words there (`~:18`, `~:22`, `~:32`, `~:238`) are tier/era
vocabulary and stayed.

**The pin, TDD-shaped.** `decline.test.ts`'s `'decline: unknown option keys throw — policy
is deliberately not accepted'` test ran RED first, against the still-`governedUnavailable`
head — captured output showed the actual message still reading `GOVERNED feature not
available in this build (policy) — decline() accepts only consultations…` — then GREEN
after the rename. Its final regex, by controller ruling, is
`/^Error: unknown option key \(policy\) — decline\(\) accepts only consultations/`: anchored
against `err.toString()`, since `assert.rejects` matches the stringified error, which
prepends `Error: ` to the message — an unanchored or bare-anchored pattern either matches
too loosely or fails against the literal string actually under test. The two negatives
became `assert.doesNotMatch(err.message, /unknown option key/, …)`, their comments reworded
to name the new string they must not be.

**The header ruling (task 1's own, plus one controller ruling on the same edit).** Rather
than keep the old head's literal text quoted in the file header — which would leave the
phrase greppable in `packages/` forever and defeat the sweep recipe below — the header now
describes the history descriptively: "build once guarded with a GOVERNED throw (the
guard-era head, reworded to the unknown-option-key head at the registry-hygiene increment,
2026-09-01)"; the old head's verbatim text lives on instead in this file's own guard-era
accounts. Separately, the replacement text removed the opening half of an em-dash pair the
original header used (`"… a GOVERNED throw —"` / `"…(<field>)" —`); the controller ruled
that dropping the now-orphaned closing `"— "` before the following line's "lifted
feature-by-feature…" completed the edit grammatically, and it was applied that way —
confirmed in the tree: the line reads "lifted feature-by-feature as build steps added
enforcement" with no leading dash.

**Task 2's ruled sweep of `docs/process/`, carried here in substance (its final per-hit
table).**

| Site | Pre-classification | Verification | Status |
|---|---|---|---|
| `adopted-source-provenance.md:637-640` (hit 1) | STAYS — provenance record | Dated narrative of the kernel as arrived; first consumer count claim | VERIFIED |
| `adopted-source-provenance.md:644` (hit 2) | STAYS — provenance record | Quote: "calls `governedUnavailable` nowhere today"; historical correction record | VERIFIED |
| `adopted-source-provenance.md:658` (hit 3) | STAYS — provenance record | Quote: "has exactly two live consumers today"; dated observation | VERIFIED |
| `adopted-source-provenance.md:672` (hit 4) | STAYS — provenance record | Quote: "`completeRedemption()` immediately after its own token-type throw"; final paragraph of divergence list update | VERIFIED |
| `implementation-status.md:173` (hit 5) | STAYS — step-8 table row | Past-tense narration of step 8's exit: "The LAST call-seam GOVERNED guard in this build lifted with it"; no edit needed | VERIFIED |
| `implementation-status.md:414` (hit 6) | STAYS — recovery increment account | Historical narrative of redemption surface evolution; past-tense account of state at that moment | VERIFIED |
| `implementation-status.md:815` (hit 7) | EDIT — guard-era exit record | Added annotation immediately after "exit": naming the later rename, its head reworded, at the registry-hygiene increment | LANDED |
| `implementation-status.md:1737` (hit 8) | STAYS — narration of past increment | Quote of unchanged tail text while narrating the effect-result increment's shared validator; historical account | VERIFIED |
| `implementation-status.md:1866` (hit 9) | STAYS — past count correction | Quote: "within `governedUnavailable`'s own count-literal family"; historical account of the effect-result increment's correction | VERIFIED |
| `implementation-status.md:1867` (hit 10) | STAYS — past count correction | Quote: "enumeration (three throw sites) and a general doc-comment on `governedUnavailable`"; same correction's account | VERIFIED |
| `implementation-status.md:2087` (hit 11) | STAYS — count correction | Quote: "AL2-freshness tail said `governedUnavailable` serves two throw sites where the comment directly above...already said four"; historical account of a mismatch that was corrected | VERIFIED |
| `implementation-status.md:2088` (hit 12) | STAYS — count correction | Quote: "directly above `governedUnavailable` itself already said four"; narrative of same historical correction | VERIFIED |
| `implementation-status.md:2091` (hit 13) | STAYS — was not touched | Explicit statement: "`governedUnavailable` itself was not touched — no construction guard added or removed"; historical account of the effect-result increment | VERIFIED |
| `open-items-plan.md:312` (hit 14) | EDIT — live planning document | Renamed `governedUnavailable` to `unknownOptionKey` (`governedUnavailable` until 2026-09-01) in present-tense live planning context | LANDED |

Hit counts and line numbers are quoted as task 2 measured them at its own exit; this
increment's own re-run of the same grep (below) confirms all fourteen still match in
substance, at line numbers shifted by task 2's own later line-wrap fix.

**Ruling 2's measured exit.** The check (task 3's own first act): root `@types/node` set to
`^22`, `pnpm install` resolved `22.20.1`, both `tsc -p packages/record --noEmit` and
`tsc -p packages/store-postgres --noEmit` (test files included via each tsconfig's own
reach) passed clean — the `node:sqlite` surface (`DatabaseSync`, `exec`, `prepare`,
`isTransaction`) typechecked at the pinned floor major. **Exit 2a taken**: the pin lands,
`pnpm-lock.yaml` moved with it, and `.github/dependabot.yml` gained an ignore rule
(`update-types: ["version-update:semver-major"]` on `@types/node`) so the weekly grouped
update does not bump the pin back; minors and patches still flow. A sanity run of
`sqlite-store.test.ts` passed 6/6 under the pinned types. One disclosed, bounded transitive
shift: `@types/pg` declares its own `@types/node` dependency as unconstrained (`"*"`), and
vacating the workspace root's `26.2.0` let pnpm re-resolve that nested copy — previously
`24.13.3` — up to `26.2.0` anyway, a move that pairs with `undici-types@8.3.0` (already
present in the lockfile — the same version root's own vacated `26.2.0` had used); the
fresh `undici-types@6.21.0` the lockfile also gained arrived paired with the ROOT's own new
`22.20.1` pin, not with the nested move (verified against
`git diff d4abfc0..3593555 -- pnpm-lock.yaml`). No typecheck consequence:
`@types/pg` imports no `'@types/node'`/`'node'` module paths
directly, only builtins (`events`, `stream`, `tls`) that pnpm's hoisted layout resolves
against the workspace
root's `@types/node@22.20.1`, not the nested copy — both clean `tsc` runs and the sanity
test confirm this in practice, not only in theory. **The honest bound, either way, restated
here rather than only in the design document:** `^22` resolves to the latest 22.x typings,
so an API added WITHIN the 22 line after 22.16 still typechecks while absent at the floor;
the pin narrows the types-vs-floor gap by a major line, it does not close it, and the
exact-floor CI leg (ubuntu @ 22.16.0) remains the runtime gate regardless.

**Ruling 3's manifest fields, both derived from each manifest's own `repository.url`** —
its `git+`-prefixed, `.git`-suffixed git URL stripped to an https base — so no literal
external URL needed authoring in the design document, or here. `packages/record/package.json`
gained a per-package `homepage` (the https base plus `/tree/main/packages/record#readme`),
a `bugs.url` (the https base plus `/issues`), and `"keywords": ["decision-records",
"confirmation", "hash-chain", "append-only", "tamper-evident", "audit",
"human-in-the-loop"]`. `packages/store-postgres/package.json` gained the parallel
`/tree/main/packages/store-postgres#readme` homepage, the same `bugs.url` base, and
`"keywords": ["vidimera", "postgres", "postgresql", "store-adapter", "decision-records"]`.
`publishConfig` was deliberately omitted, per ruling 3, rather than silently:
`release.yml`'s `--access public` stays the single copy of that fact. The URLs point at a
repository private until the cut — they 404 for outsiders today, which is fine, since the
registry pages that render them exist only after the publish, which the checklist orders
after the visibility flip. `package.json` is not contract-scanned, so the literal URLs it
carries raise no standalone-contract question.

**The gate set caught a task-4 defect before the exit commit — recorded as part of this
increment's own gate story, not smoothed over.** The exit task's step-1 full gate-set run,
executed in full against the branch tip at that time (`221c430`), surfaced
`biome check --error-on-warnings .` failing with two errors: task 4's commit had added
`"bugs": { "url": "…" }` to both manifests as a single-line JSON object, and Biome's own
JSON formatter always expands a non-empty object onto multiple lines — the style every
other nested object in both files (`repository`, `engines`, `exports`) already used. Task
4's own report recorded a typecheck and the smoke test after its edit, but never re-ran
`biome check`, so the violation shipped into the commit unnoticed. The exit task's own file
scope (`CHANGELOG.md` and this file only) does not extend to `package.json`, so the finding
was recorded rather than silently repaired from inside the exit brief; a dedicated
fix-round commit, `7fb9324` ("bugs objects expanded to biome's form — content unchanged,
smoke re-proven"), landed the two-line-per-file expansion before the exit commit was
written, changing no content — the URLs, keywords, and field order task 4 recorded stand
unchanged. This is the gate set doing exactly its job: a formatting defect caught and fixed
before the cut, not after it ships inside a published tarball.

**Gate outputs, as measured against this increment's own exit commit.** Every total below
was measured directly against the tree at exit; `biome` specifically was RE-RUN after
`7fb9324` landed rather than assumed fixed or carried forward from the earlier red result.
`./node_modules/.bin/tsc -p packages/record --noEmit` and
`./node_modules/.bin/tsc -p packages/store-postgres --noEmit` — both clean.
`./node_modules/.bin/vitest run` — 67 test files, 832 tests, zero skips — unchanged from the
pre-increment count, since this increment upgrades three assertions (one positive pin, two
negatives) and adds no new test. `./node_modules/.bin/biome check --error-on-warnings .` —
re-run after `7fb9324`: "Checked 135 files in 151ms. No fixes applied.", exit 0; the earlier
run against `221c430` (two errors, both in the manifests above) is recorded above as the
finding it was, not as a passing gate. `node scripts/contract-scan.mjs` — exit 0, silent.
`node scripts/api-reference-sync.mjs` — exit 0, silent (the rename touched no exported
name). `node scripts/docs-index-sync.mjs` — exit 0, silent, re-run after this section and
the CHANGELOG entry were written. `./node_modules/.bin/tsc -p
packages/record/tsconfig.build.json && ./node_modules/.bin/tsc -p
packages/store-postgres/tsconfig.build.json` (what `pnpm build` runs) — clean, `dist/`
emitted for both packages. `node scripts/smoke-pack.mjs` (what `pnpm smoke` runs) — exit 0,
`smoke: OK - 4 transitions, confirmed + intact, 17 probes visible through ./probes; adapter
resolved, peer range ^0.0.0, PostgresStore constructs (packaging-level only, by recorded
bound)`.

**The sweep recipe, both greps re-run.** First grep,
`git grep -n "governedUnavailable\|GOVERNED feature not available" -- packages/ CLAUDE.md`,
re-run against the exit commit: the design document's own recipe called for this grep to
"return EMPTY"; a controller ruling taken during execution — not itself in the design
document, resolving a tension the design left unresolved — held that strict bound
unsatisfiable (the mandated rename annotations themselves contain the old name) and
refined it to the bound actually checked here: tsc green (no live identifier, confirmed
above) plus every remaining hit being a rename annotation or past-tense narration. The
re-run returns FIVE hits — `CLAUDE.md:34`, `CLAUDE.md:241` (both rename annotations),
`config.ts:108` (the HISTORY doc-comment, past-tense), `config.ts:600` (a rename
annotation), `construction-validation.test.ts:20` (past-tense narration of when the
`open()` guard lifted) — not the six the scoping session's own ruling text names. This is
accounted for, not a shortfall: task 1's own Fix Round 1 (commit `070f96a`) corrected a
sixth hit, `construction-validation.test.ts:586`, from a present-tense claim using the old
name ("NO per-field `governedUnavailable` caller remains anywhere in this sweep") to the
current name — exactly what the refined bound itself calls for, since a present-tense
claim about the current tree must use the current name and only a rename annotation or
past-tense narration may keep the old one. Five is the bound satisfied, measured after
task 1's own later correction, not six under-delivered.

Second grep, `git grep -n "governedUnavailable\|GOVERNED feature not available" --
docs/process/`, measured against `7fb9324` — the tree before this account section
existed — returns FOURTEEN hits, matching task 2's table above in substance at every site.
Of the nine pre-account `implementation-status.md` hits, two (`:173`, `:414`) sit BEFORE
line 815 and are unmoved, one sits AT line 815 itself and is unmoved (task 2's own edit
landed there), and six sit AFTER it — now at `:1739`, `:1868`, `:1869`, `:2089`, `:2090`,
`:2093` — two lines later than task 2's own report recorded them, because task 2's own Fix
Round 1 rewrapped line 815's one long line into three (net +2 lines); a line-count
artifact of that fix, not a content change. **Re-running the same grep at the branch
head, after this section was written, returns TWENTY-SIX, not fourteen** — this section's
own text is the cause, not a new violation: two literal quotations of the grep pattern
itself (this paragraph and the one above), three further prose mentions of the retired
name inside this section's own narrative (describing the rename, the TDD pin, and task
1's fix), and seven of task 2's table rows above whose Verification cells quote the old
name inside a historical quotation — twelve new hits, every one the account's own ruling
text describing or quoting the sweep, not an unruled present-tense claim about the tree.
Fourteen is the correct, measured count of what the sweep found before this account
existed to describe it; the account's own act of recording that finding necessarily grows
the grep's count from here on, which is expected and not itself a gap.

**What stays outside, and why.** No deferral-register row moves: item 45's old register
lineage (row 7, "corrected, not satisfied") is history, and this increment's decision lands
here rather than as a new row; items 47 and 10 never had register rows of their own. No
release-checklist box was ticked — this increment does not touch
`docs/process/release-checklist.md` at all. No maturity marker moved, no public-surface
name changed (the helper is internal, never exported), and no `docs/concept/` file was
opened. `release.yml`'s `--access public` stays the single copy of that fact.

**Cuts.** None. This increment reworded one internal error head (every seam's tail and
accepted keys unchanged), pinned one devDependency major with a Dependabot guard, and added
registry metadata to both manifests; it removed no capability and changed no seam's
accepted keys or refusal behavior.

## Post-build-order increment — Parked truths (four items from both 2026-09-01 reviews)

**The eighteenth post-build-order increment, exited (commits `da8f99e`..`7cb7c8f`, closed
by the record commit that follows them).** The ordinal counts every section above in
order, excluding only the documentation-only signature-enforcement-coverage findings
note, the same rule the seventeen before it used. **No sanction was needed and none was
sought**: nothing in `docs/concept/` moves, no maturity marker moves, no register row or
checklist box moves, and the public surface does not change. Design:
`docs/superpowers/specs/2026-09-02-parked-truths-design.md`; plan:
`docs/superpowers/plans/2026-09-02-parked-truths.md`.

**What the increment is.** Four items parked with rulings, rather than fixed in place, by
both 2026-09-01 final reviews — three (items A, B, C below) by the registry-hygiene
increment's whole-branch review, one (item D) by the truth-restoration increment's final
review the same day. Both reviews' session ledgers are deleted per that process's own
discipline, so the design document (dated 2026-09-02) is the durable statement of what
each review found and ruled; this account and that design document are now the only
record of them. One `packages/*/src/` edit changes an adopter-visible ERROR STRING (item
C) — the same last-chance-before-0.1 logic both parent increments ran on: after the
publish, that string is immutable for 0.1 and an adopter could come to match on it.
Everything else is comments, one documentation sentence, and two test assertions.

**Item A — `construction-validation.test.ts` spoke of the current throw in the guard
era's vocabulary.** The registry-hygiene sweep's own grep patterns (`governedUnavailable`,
the full old head) could not see bare-word mentions, and five present-tense sites
survived it. The vocabulary rule applied is the one the registry-hygiene sweep already
used, extended to bare words: past-tense narration of the guard era stays verbatim;
present-tense description of the CURRENT thrown string moves to unknown-option-key
vocabulary. All twenty-one bare-`GOVERNED` mentions in the file, measured against base
`da8f99e`, five moved and sixteen ruled to stand — the full per-hit table, carried here
from task 2's own report:

| Line | Context | Classification | Tense | Status |
|---|---|---|---|---|
| 3 | `build once guarded with a GOVERNED throw (the guard-era head...` | Header history | PAST | STAYS |
| 7 | `no longer has any live GOVERNED-throw pin of its own` | Header history | PAST | STAYS |
| 8 | `` `assertGoverned`/`GOVERNED` helpers this file once carried are gone `` | Header history, dead helpers | PAST | STAYS |
| 15 | `(non-GOVERNED) error` → `error (never the unknown-option-key string)` | Present-tense current throw description | PRESENT | **MOVED** |
| 19 | `options key was the one GOVERNED guard living outside this file's` | Header history, per-field guard | PAST | STAYS |
| 23 | `generic unknown-key GOVERNED throw` → `throw (its GOVERNED head reworded at...)` | Reframed from present to past-tense context | PRESENT→PAST | **MOVED** |
| 75 | `(NOT the GOVERNED string)` → `(NOT the unknown-option-key string)` | Present-tense current throw description | PRESENT | **MOVED** |
| 102 | `=== GOVERNED throws — one per not-yet-enforceable field ===` | Era-naming banner, describes the guard era | PAST | STAYS |
| 105 | `INVERTED, at the live-capture increment: the kernel increment pinned a GOVERNED` | INVERTED record, guard-era history | PAST | STAYS |
| 142 | `INVERTED, at the first step-4 increment: the kernel increment pinned a GOVERNED` | INVERTED record, guard-era history | PAST | STAYS |
| 146 | `per-leg `sod`/`proposer` were GOVERNED until the second step-4` | Guard-era history, transition record | PAST | STAYS |
| 169 | `INVERTED, at the second step-4 increment: the kernel increment pinned a GOVERNED` | INVERTED record, guard-era history | PAST | STAYS |
| 219 | `The single-leg shape was GOVERNED before the second step-4 increment` | Guard-era history, transition record | PAST | STAYS |
| 242 | `GOVERNED before the second step-4 increment; now STRUCTURAL per the ruling` | Guard-era history, transition record | PAST | STAYS |
| 293 | `INVERTED, at the second step-5 increment: the kernel increment pinned a GOVERNED` | INVERTED record, guard-era history | PAST | STAYS |
| 329 | `kernel increment pinned a GOVERNED throw here while no gate consumed` | INVERTED record, guard-era history | PAST | STAYS |
| 450 | `INVERTED, at the first step-6 increment: the kernel increment pinned a GOVERNED` | INVERTED record, guard-era history | PAST | STAYS |
| 483 | `kernel increment pinned a GOVERNED throw here while nothing bound or compared` | INVERTED record, guard-era history | PAST | STAYS |
| 509 | `GOVERNED throw here (its `redeeming` edges could not carry §4's declared` | INVERTED record, guard-era history | PAST | STAYS |
| 636 | `(not the GOVERNED string)` → `(not the unknown-option-key string)` | Present-tense current throw description (banner) | PRESENT | **MOVED** |
| 638 | `(NOT the GOVERNED string)` → `(NOT the unknown-option-key string)` | Present-tense current throw description (test title) | PRESENT | **MOVED** |

Five sites moved (lines 15, 23, 75, 636, 638): a comment, a comment reframed to
past-tense context, a docstring, a section banner, and a test title — no assertion logic
changed at any of the five. The remaining sixteen are past-tense narration of the guard
era (header history, the lifted-guard record at line 19, the `:102` era-naming banner,
the eight INVERTED-at-increment records, and three transition records) and stay verbatim.
`./node_modules/.bin/vitest run packages/record/test/construction-validation.test.ts` —
37 tests passed, unchanged before and after, since no assertion moved.

**Item B — `CLAUDE.md`'s measured sentence was stale.** The test-count clause read "67
test files, 821 tests" while the suite had measured 832 since the truth-restoration
increment, and this increment's own one new test moves it again; the sentence's
neighboring parenthetical (the construction-guard and throw-site count) had been updated
by the registry-hygiene increment while the test-count clause two clauses earlier sat
outside that envelope. The refusal-code count in the same sentence ("24 refusal codes")
was NOT stale — see the cross-check episode below, where a defective measurement recipe
briefly suggested otherwise. The sentence now reads "67 test files, 833 tests, zero
skips" with "carries 24 refusal codes" unchanged; nothing else in the sentence or file
moved.

**Item C — `beginRedemption`'s unknown-option-key tail needed a charitable reading.**
`kernel/redeem.ts`'s shared `validateRedeemOptions` minted `` `${seam}() accepts only tx
and result in this build. Contract: §11.2, §12.` `` for all three redemption seams, but
`beginRedemption` never accepts a `result` — the key loop admits it and the very next
check refuses it unconditionally at issuance, with its own dedicated message ("opts.result
is not admitted at issuance…", which is true and unchanged). An adopter reading the
unknown-key string alone at that seam was told issuance accepts a key it always refuses.
The tail is now seam-dependent — `beginRedemption`:

```
beginRedemption() accepts only tx in this build — a result is refused at issuance and
belongs to completeRedemption (SPEC §11.2). Contract: §11.2, §12.
```

`redeem` / `completeRedemption` (unchanged):

```
${seam}() accepts only tx and result in this build. Contract: §11.2, §12.
```

The key loop still `continue`s on `result` for all three seams, so passing `result` to
`beginRedemption` still produces the DEDICATED refusal, never the unknown-key one — both
sides are pinned in `redeem-token.test.ts` by one test with two `assert.rejects` calls:
an anchored positive match on the new `beginRedemption` head-plus-tail form (red-first
against the pre-split shared tail, captured in task 1's own report), and a
`doesNotMatch`/dedicated-message assertion on a present `result`, so the two messages'
division of labor is pinned, not narrated. `redeem()`'s own tail pin
(`effect-result.test.ts` ~:107) already covered the shared variant and needed no change.

**Item D — the key-retirement pin counted orphans outside the register's own
vocabulary.** The truth-restoration increment's key-retirement baseline
(`no-edge-containment.test.ts`) proved one-orphan-per-refusing-call by
`listByRecord().length` growth against a flat chain — semantically equivalent, but the
deferral register and the sidecar-orphans report speak in `verifySignatures().orphans`.
The parking ruling said: add the report-vocabulary assertion at that file's next touch,
and this increment takes the trigger deliberately. Inside the BASELINE test's per-call
loop, after the existing sidecar-growth assertion:

```ts
const report = await rig.handles.operator.verifySignatures(recordId);
assert.equal(report.orphans.length, call, 'the report names each minted orphan');
```

`rig.handles` is the full verifier registry, not the retired instance, so the read is the
operator's ordinary audit read; `orphans` is derived chain-vs-sidecar and
verifier-independent either way. Fire-checked by temporarily asserting `call - 1`: the
assertion failed with `1 !== 0` on the first call, confirmed live, then reverted. The
existing `listByRecord` growth assertions stay — the two counts agreeing in the same run
is the point. Reporting vocabulary only: **row 22a is unchanged**, said here so nobody
reads the stronger assertion as movement — no containment claim of any kind is added.

**The task-2 commit-message amend, recorded as part of this increment's own gate
story.** Task 2's original commit subject baked in a miscount ("seventeen") against the
brief's mandated "sixteen" ruled-to-stand sites; the tip was unpushed and the tree's
content was already correct — the report's own table always totaled 5 moved + 16 stand =
21 — so a message-only amend was authorized, the same precedent used for a prior
BOM-only amend, and applied: `3b59ef8` → `371c56c`, verified tree-identical before and
after by diffstat. The corrected subject is what `git log` shows on this branch today.

**Item B's cross-check episode, recorded as part of this increment's own gate story —
the measurement discipline working, not a defect in the tree.** Step 1's brief-mandated
recipe for the refusal-code count,
`awk '/^export const REGISTRY/,/^};/' packages/record/src/refusal-codes.ts | grep -c
"':"`, printed **22** against `packages/record/src/refusal-codes.ts`. Cross-checked, per
the brief's own instruction, against the `RefusalCode` union's arms: **24**, matching the
file's own self-numbering comments (`ack-missing`/`ack-stale` are named "the twenty-first
and twenty-second codes," `supersedes-unverified` "the twenty-third," and
`consultation-stale` "the twenty-fourth and LAST code of this build"). 22 ≠ 24: per the
brief's explicit "if the two disagree, STOP and report," the task stopped before touching
`CLAUDE.md`, reported the disagreement rather than resolving it, and offered a diagnosis
without acting on it. A controller ruling then confirmed that diagnosis: `REGISTRY`
(`Record<RefusalCode, RefusalClass>`, compiler-enforced total per the file's own doc
comment) has exactly 24 entries, but two of its keys — `availability` and `ineligible` —
are valid bare identifiers and so are written UNQUOTED in the object literal; the
recipe's `grep -c "':"` matches only a quote immediately followed by a colon, so it
silently misses both, undercounting by exactly 2. **The ruling: the awk recipe was
defective, not the tree.** The authoritative refusal-code figure is 24, and `CLAUDE.md`'s
existing "24 refusal codes" claim was never stale on that axis — only the test-count
clause two words earlier was. Stopping on the disagreement, rather than picking a number,
is recorded here as the mandated behavior it was, not a delay.

**The measured figures, from step 1's full gate run against branch `parked-truths`,
tip `7cb7c8f`, before this section was written.**
`./node_modules/.bin/vitest run` — 67 test files, 833 tests, zero skips — up from the
pre-increment 67 files/832 tests by exactly the one new test item C's pin adds (task 1's
`redeem-token.test.ts` test with two `assert.rejects` calls; task 2 changed no test, only
comments, a docstring, a banner, and a title; task 3 added one assertion inside an
existing test's existing per-call loop, not a new test). Refusal-code count: 24 (the
cross-check episode above). `./node_modules/.bin/tsc -p packages/record --noEmit` and
`./node_modules/.bin/tsc -p packages/store-postgres --noEmit` — both clean.
`./node_modules/.bin/biome check --error-on-warnings .` — "Checked 135 files in 259ms. No
fixes applied.", exit 0. `node scripts/contract-scan.mjs`, `node
scripts/api-reference-sync.mjs`, `node scripts/docs-index-sync.mjs` — all exit 0, silent
(docs-index-sync re-run again after this section and the CHANGELOG entries were written,
since the scan reaches this file's own new content only once it is written).
`./node_modules/.bin/tsc -p packages/record/tsconfig.build.json && ./node_modules/.bin/tsc
-p packages/store-postgres/tsconfig.build.json` (what `pnpm build` runs) — clean, `dist/`
emitted for both packages. `node scripts/smoke-pack.mjs` (what `pnpm smoke` runs) — exit
0, "smoke: OK - 4 transitions, confirmed + intact, 17 probes visible through ./probes;
adapter resolved, peer range ^0.0.0, PostgresStore constructs (packaging-level only, by
recorded bound)".

**What stays outside, and why.** No deferral-register row moved: item D's own text says
so plainly — row 22a is unchanged, since the new `verifySignatures().orphans` assertion
is reporting vocabulary added to an existing BASELINE test, never a containment claim of
any kind. No release-checklist box was ticked; this increment does not touch
`docs/process/release-checklist.md` at all. No maturity marker moved, no public-surface
name changed, and no `docs/concept/` file was opened.
`packages/record/test/byte-stability.test.ts` was not opened, let alone edited.

**Cuts.** None. This increment split one error-message tail by seam, moved five
comment/docstring/title sites' vocabulary, re-measured one documentation sentence's
figures, and added one reporting-only assertion to an existing test; it removed no
capability and changed no seam's accepted keys, refusal behavior, or class.

## Post-build-order increment — Code-review fixes (six phases)

**The nineteenth post-build-order increment, exited (the six phase commits
`4308e86`..`614c262` on `code-review-fixes`, the review-fixes commit `2297901`, the
follow-ups commit `c3ee557` that landed this section, and the second-round commit that
closes it).** A code review of
the tree at `d5fc3b9` surfaced six clusters. Each was worked as its own phase under one protocol:
the code quoted, two to three candidate resolutions with their trade-offs — correctness, recorded
bytes, API surface, test impact — a ruling taken before any edit, the failing test written and
watched failing first, and one commit whose message carries the argument. The six commit messages
ARE the design record; no spec/plan pair was written, and this section names what moved rather
than restating them. No `docs/concept/` file changed and no maturity marker moved. No sanction was
sought: every change that would have needed one is flagged below as gated and not taken. No
recorded chain, digest, or profile digest moved in any phase; `byte-stability.test.ts` is untouched.

**What landed, by phase.**

1. **Kernel concurrency** (`4308e86`). `finalize()` and `decline()` read the chain once and
   suspend at `signatureLayerHolds` and `resolveDueClock` before their single `appendBatch`; a
   state-preserving append (`raiseFinding`/`acknowledge`) landing in that window keeps the record
   `open`, so the batch passes the entry compare-and-swap and fails the seq check honestly. Both
   seams had mapped that to a throw asserting the race was unreachable under a single-writer
   bound the Postgres adapter never had. A shared `batchSeqConflict` re-reads once (the
   `residualRefusal` precedent): a moved head is an `Error` named `ContentionError` whose message
   names re-invocation (since minted as the refusal `record-contended` — the twentieth
   increment, below); an unmoved head keeps the storage-fault throw, now true. The seam never
   re-sends the batch — a fresh-seq retry would skip rung (5.7) and confirm over a finding the
   human never saw; the pins show re-invocation refusing `ack-missing` for a required kind and
   confirming for a non-gating one. A never-appends contention refusal code is the durable shape
   and is sanction-gated (below).
2. **Identity comparison and gate consistency** (`17725fb`, tests only). Principal-only
   comparison in `sodViolated` and `ackCounts`, and the findings seams' shape-only identity check,
   were read by the review as gaps. Both are rulings the code already argued: pair-equality would
   let one human re-authenticate under a second allowed authority and pass the SoD gate, and
   raisers/ackers are the informing population every findings fixture already draws from a
   service authority the leg never lists. Gating the seams on `allowedAuthorities` was measured
   to break nine production-path tests. Three pins make the posture loud, each watched failing
   against the change it guards.
3. **Multi-leg content binding** (`afd0d79`, tests only). `verifyPriorLegs` compares no
   `contentDigest` across legs. Neither a ruling nor pinned, and the only design statement on
   record (id.ts's leg-folded stagedRef) presumes shared content is the normal case. Equality at
   `open()` was measured to break no existing test and change no bytes, but it adds a condition
   to the verifier's spec-enumerated list, the list the signature check joined under its own
   increment — so it is sanction-gated. One pin records the admission and the fidelity property
   that makes it tolerable: the divergence is derivable from the recorded reference alone.
4. **Signing sidecar** (`8ecb088`). Sign-before-append stays — the reverse order turns a crash
   between append and put into a permanent false `chain-compromise`. Two-phase cleanup and orphan
   classification are ruled out by the sidecar contract's own "the library performs no pruning"
   and by row 22's third horn; flagged. The decorator's per-record memo, unbounded per process, is
   a bounded LRU (`SIGNING_MEMO_CAP`, ten thousand, not exported from the index), pinned through
   a read-counting store: a hot record reads nothing, an evicted one re-reads its genesis once.
5. **Chain verification and clock edges** (`9b251ba`). `verifyChain` checks record identity
   (a spliced foreign transition with recomputed links is a break); a monotonic-`at` check was
   rejected because finalize stamps a batch with one reading and a clock step would become a
   false tamper verdict at every seam. The kernel's "due" is `now >= deadline` in
   `resolveDueClock` and the enlisted `dueNow`, matching the stores' inclusive listing gate at the
   instant. `open()`'s expire-then-retry re-stamps the retried genesis from a fresh reading and
   rebuilds its meta from the same reading (`genesisMetaFor`), reusing the same object only when
   the clock did not move. **One authorized inversion:** `no-edge-containment.test.ts`'s memo pin
   measured two mints for the retry on the ground of object reuse; under its ticking clock the
   retry is now a distinct transition — three mints for three puts, and the first attempt's entry
   is a lost-genesis orphan the pin now asserts. The neighbouring put-always-runs invariant kept
   every assertion; its clock now holds still within a call so the repeat it guards is still
   exercised.
6. **Adapters and config hygiene** (`614c262`). `SqliteStore.close()` (not a Store method) and a
   per-text `StatementSync` cache pinned through a spy on the connection class's `prepare`.
   `PostgresStore`'s lazy DDL runs on one checked-out client inside a transaction under a
   schema-keyed advisory lock: five stores bootstrapping one fresh schema failed in the first
   round with `duplicate key value violates unique constraint "pg_namespace_nspname_index"`
   before the fix and succeed every round after. `validateAllowedAuthorities` applies the settled
   class (non-empty, non-empty strings, distinct) — an empty list constructed and refused every
   decision. Two items deferred: the optional `tx` on the Store's reads (register row 23, its own
   increment) and `COLLATE "C"` on `due_at` (no live defect, no failing test here).

**Gated, not taken — scope questions for the sealed set, recorded here and in
`docs/process/next-phases.md` rather than as register rows, because none is deferred
implementation work with a trigger:** a never-appends contention refusal code (the result-first
shape phase 1's throw stands in for); a per-leg raiser/acker authority allowlist consulted at
counting time; content equality across legs at `open()`; two-phase sidecar cleanup and orphan
classification. Each needs a fresh sanction through `docs/concept/SCOPING-GUIDE.md` §§1–2.

**The review of these six commits, and what it found (commit `2297901`).** The branch was
reviewed before merge; three review angles completed (the orchestrating pass was cut off by a
session limit, so every finding was re-verified by hand before acting), and five defects in
the phases' own changes were fixed, each pinned by a test watched failing first: `close()`
left the new statement cache holding finalized handles, so a warmed statement threw
"statement has been finalized" rather than the not-open error the comment promised (the
cache is cleared on close; the pin warms first); `validateAllowedAuthorities` folded a
missing or non-array list into the empty-array message (its own message now, naming what
was found); the signing memo's `memoSet` evicted on a re-insert, so two concurrent cold misses
on one record cost two evictions (a re-insert now refreshes and evicts nothing); the
diagnostic re-read `batchSeqConflict` performs could itself reject and replace the conflict
report (caught; the report is thrown with the read's failure as its `cause`); and the
Postgres recovery pin, re-pointed at the first connect when the DDL moved onto a client,
left the transaction body's failure path unexercised (a second pin fails the first
`CREATE TABLE` inside it). The same commit repaired every pointer the phases left stale —
two `finalize.ts` arms and the findings seams' clock arm still grounding a lost-CAS refusal
on the single-writer bound; `finalize-check-order.test.ts`'s (5.7)->(6) exclusion, whose
premise the race fixtures removed (the pair is constructible only by a race and is pinned
in `terminality.test.ts`: the losing call throws, re-invocation refuses `ack-missing`);
`refusal-codes.ts`'s and `terminality.test.ts`'s `batchConflict` pointers; `create.ts`'s
expiry-gate doc, still strict; and the no-edge memo pin's "documented lost-genesis class",
now citing the sidecar contract clause that documents it.

**A second review round, over the branch as it stood after the first (the closing commit).**
Three further review angles completed — altitude, efficiency, and wrapper correctness — and
were verified by hand the same way. Fixed, each pinned first: the findings seams mapped
every lost compare-and-swap to `record-not-open`, which is false of a record that lost only
a seq race and is still open — the exact untruth phase 1 removed from the batch seams; two
concurrent `raiseFinding` calls now leave the loser with the same `ContentionError` (since the
refusal `record-contended`, below), via a single-append twin of the batch helper, and
re-invocation lands its finding. The signing
decorator cached `signs = false` from an EMPTY chain, so a non-genesis append arriving before
its genesis pinned the record as non-signing and the genuine genesis then landed unsigned,
which the fail-closed layer reads as chain-compromise — reachable only through `withSigning`
composed directly over host-chosen ids, never through `create()`; an empty chain now teaches
the memo nothing. `SqliteStore`'s statement cache followed `close()` but not the connection,
which the documented `database` handle also closes; the cache now follows the connection's
own `isOpen`. A Postgres client whose ROLLBACK failed was released bare, so the pool could
hand it to the next borrower inside an aborted transaction; it is released with the error,
which pg treats as destroy — and the DDL bootstrap and the no-tx write path now share one
pooled-transaction primitive instead of two copies of that plumbing. Taken without a failing
test, as refactors under green pins: the retried genesis is stamped from the same reading
as the expiry edge that admitted it (one clock read fewer, and the relation is now equality
rather than not-before); the memo skips its recency promotion for consecutive appends to one
record; `verifyChain`'s doc lists the checks in the order the loop runs them, with the
same-index precedence (seq, then recordId, then prevHash) pinned by a splice that recomputes
nothing — that pin passed on first run, since the loop's order was already right and only the
doc had it reversed; and the memo pins run over an O(1) stub store instead of `MemoryStore`,
whose linear exclusivity scan had made ten thousand geneses cost over a second per pin.
Recorded rather than changed: the contention-versus-fault split is inferred from a re-read
after adjudication, so a legitimate writer landing in that window makes a genuine fault read
as contention — nothing lands either way and re-invocation re-evaluates, so the cost is a
quieter diagnosis; the exact signal (the store reporting the head seq it adjudicated against)
is named on register row 23. Also recorded there: a one-client pool deadlocks an enlisted
first call, since the DDL bootstrap needs a client of its own (the guide now states the floor).
Recorded as observations, not ruled on: the freshness bound and the pending-window clocks
resolve the exact instant in opposite directions (fresh AT the bound, expired AT the deadline)
— a separate clock family with its own wording, unexamined by this increment; and
`validateAllowedAuthorities` is the fourth hand-written copy of the settled
non-empty/distinct/non-empty-strings rule in `config.ts`, a simplification left for a session
that can move all four together.

**Two orphan producers named, recorded in register row 22 without re-scoping it.** Under a
signing profile the batch is signed before the store adjudicates it, so a contention loss
leaves one sidecar entry per batch element; and a re-stamped retry leaves the first
attempt's entry, on a SUCCESS path. Both are inside the class `signing/store.ts` already
documents (a lost CAS leaves the entry behind), both are visible through
`verifySignatures().orphans`, and neither is a no-edge refusal — so row 22's title stands,
its producer inventory widens by a dated note, and its trigger does not move. The guide's
orphan paragraph names both.

**A code/spec difference, recorded rather than reconciled.** The kernel's clock predicate
now reads `now >= deadline`, following SPEC §12's listing gate (`dueAt ≠ null AND dueAt ≤
now`, inclusive, pinned by the conformance suite). SPEC §4's prose for the same edge — a due
transition is appended at the next mutating seam that "observes the bound has passed" —
reads as strictly-after, which is what the old kernel code implemented. The two sections
disagree at exactly one millisecond; the kernel follows the one with a stated gate, and the
wording tension is a finding for a future sealed-set clarification, not something this
increment could edit.

**Follow-ups, landed in the closing commit.** `docs/guide/api-reference.md`, `integrating.md`
and `concepts.md` caught up (`ContentionError`, `SqliteStore.close()` and `database`,
`verifyChain`'s fourth check, the `allowedAuthorities` rule); `CHANGELOG.md` gained one Changed
and one Fixed entry; `CLAUDE.md`'s measured sentence re-measured and its live-rows parenthetical
names row 23; three source comments (`kernel/finalize.ts` rung (2) and `refuseMaybeAppend`,
`kernel/findings-seams.ts`'s clock rung) and one test header
(`finalize-check-order.test.ts`) that asserted the single-writer bound reworded to the reachable
truth; this section, the current-state bullets above, and register row 23.

**Gate outputs, as measured against the closing commit.** `./node_modules/.bin/tsc -p
packages/record --noEmit` and `-p packages/store-postgres --noEmit` — both clean.
`./node_modules/.bin/vitest run` — 67 test files, 860 tests, zero skips (record 63 files / 791,
store-postgres 4 files / 69 over the embedded server, which starts on this machine).
`./node_modules/.bin/biome check --error-on-warnings .` — 135 files, no fixes, exit 0.
`node scripts/contract-scan.mjs` — exit 0, silent. `node scripts/api-reference-sync.mjs` — exit
0 (no exported name moved; `SIGNING_MEMO_CAP` is deliberately not on the index).
`node scripts/docs-index-sync.mjs` — exit 0. The build tsconfigs and the packed-tarball smoke are
recorded in the closing commit's message as run or as not runnable on the authoring machine.

## Post-build-order increment — `record-contended` (a SPEC §8 registry amendment)

**The twentieth post-build-order increment, exited (branch `record-contended`, cut from `main`
at `708b557`: four task commits and one review fold-in).** The 2026-09-02 code review left a seam's lost sequence race
surfacing as an `Error` named `ContentionError` — a throw where DECISIONS.md #10 says refusals
are returned, taken only because no registry code was true of an open, intact, undecided record
and the registry is spec-fixed. This increment minted the code. Its design and promotion case is
`docs/superpowers/specs/2026-09-02-record-contended-design.md` (reviewed against the code by a
second model before execution; eleven findings folded in, one escalated to the maintainer); its
plan `docs/superpowers/plans/2026-09-02-record-contended.md`.

**The sanction.** Granted 2026-09-02 by the maintainer in session, recorded against the design's
§8, and re-granted the same day for the definitional touches the review surfaced. It licensed
exactly: one SPEC §8 profile-conditional row (`record-contended`, findings flow §10.2,
`[PROVEN]`); the code in §8's never-appends list AND the set's definition widened to name
contention as its fourth category — in SPEC §8's defining clause, `GLOSSARY.md`'s Never-append
set entry, and `DECISIONS.md` #15, so definition and list agree everywhere; one sentence at §9
rung (6); one clause in §10.2's seam-discipline sentence; the ARCHITECTURE §5 ladder line and
its (6) bullet. Nothing else under `docs/concept/` moved — CONTROLS.md, OPEN-QUESTIONS.md and
CONCEPT.md are untouched, for the reasons the design states. This is the **tenth marker-bearing
sealed-set edit** in the repository's lineage and the first that amends the registry rather than
promoting a capability; the row landed `[PROVEN]` in the task that landed the text, after the
behavior (Tasks 1–3), never ahead of it.

**Tier and placement.** GOVERNED, under the findings flow: the only state-preserving appends
between `opened` and a decision are `finding-raised` and `acknowledged` (`consultation-recorded`
rides only inside decision batches that end state-leaving; `sealed` is gated on derived
terminality), and all three backings adjudicate state before sequence, so a `seq` conflict at an
`open` entry implies a findings-seam racer. On a profile with no findings flow no such writer
exists — two finalizes racing lose at the entry compare-and-swap, which is `record-not-open` and
true. The structural witness is the findings seams' own (2.5) declaring check, which throws on
a non-declaring leg before any append.

**What landed.** `refusal-codes.ts`: the twenty-fifth code, `refusal`-class, in `NEVER_APPENDS`.
`kernel/finalize.ts`: the shared seq-conflict classifier returns a `SeqConflictVerdict`
(contended, or a fault carrying the storage-fault error) instead of an `Error`; finalize and
decline refuse `record-contended` on contended and throw the fault otherwise; `raiseFinding` and
`acknowledge` (`kernel/findings-seams.ts`) likewise. The `ContentionError` name is gone; nothing
published ever carried it. The storage-fault branches — unmoved head, conflict past element
zero, failed re-read (with `cause`) — are unchanged throws. One correction to the plan's own
expectation, recorded: it predicted a typecheck error between Tasks 2 and 3 at the findings
seam; TypeScript accepts `throw` of any value, so the seam compiled while throwing the verdict
object, an interim state inside the branch only, removed at Task 3.

**Pins.** Five flipped from a thrown name to `status: 'refused'`, `code: 'record-contended'`,
`class: 'refusal'`, no `transitionRef`, each keeping its post-state assertions — four in
`terminality.test.ts` (finalize ×3 including both re-invocation outcomes, `ok` for a non-gating
kind and `ack-missing` for a required one; decline ×1) and the concurrent-`raiseFinding` race in
`findings-seams.test.ts`; one NEW race pin for `acknowledge`, the producer no earlier test had
raced (the review found the gap). One registry-only pin added (`refusal-matrix.test.ts`); the two
total-accounting pins moved to twenty-five. The two storage-fault pins now assert a plain
`Error` positively. Every flipped or new pin was run RED against the throw first — Task 3's
against the pre-Task-3 seam checked out from its own prior commit, after a scripting slip had
committed the seam ahead of its pins; that commit was amended before anything left the branch.

**Honest bounds, restated.** The contention-versus-fault split is still inferred from a re-read
after the store adjudicated; the exact signal (`headSeq` on the store's conflict arms) is
register row 23's. Under a signing profile a contention loss still leaves one sidecar entry per
batch element (row 22's widened inventory). `refuseMaybeAppend`'s lost-CAS refusal at rung (5.7)
can be stale after a concurrent acknowledgment (never false; recorded as a residual). A
code/spec observation surfaced while editing §8's never-appends list and is recorded, not
reconciled: the list omits `supersedes-unverified`, which the code's `NEVER_APPENDS` set carries —
and the string occurs nowhere in SPEC.md at all, §8's registry table included; SPEC §2 defers
"the non-terminal-predecessor refusal shape" to OPEN-QUESTIONS.md rather than naming the code.
So the code is absent from the normative registry entirely, a pre-existing gap on `main`; the
sanction did not license those sentences and it is left for a future consistency pass.

**Gate outputs, as measured against the closing commit.** `tsc -p packages/record --noEmit` and
`-p packages/store-postgres --noEmit` clean; `vitest run` — 67 files, 862 tests, zero skips
(record 793, store-postgres 69); `biome check --error-on-warnings .` — 135 files, exit 0;
`contract-scan`, `api-reference-sync`, `docs-index-sync` — exit 0.

**The branch review, before merge.** A second model reviewed the four commits against the spec
and the sanction: every classifier call site handles both verdict arms, no `ContentionError`
remains outside historical narration, every `docs/concept/` hunk maps to a licensed touch, and
the definition, list, GLOSSARY and DECISIONS agree. Twelve record-level findings were folded in
as the fifth commit: this file's header and inversion note in `terminality.test.ts` still spoke
of a throw; the `acknowledge` race pin now asserts class as the others do; two test totals read
860 where the tree measures 862; the increment index still said "awaiting sanction"; the
ARCHITECTURE ladder line was trimmed to exactly the licensed text, its explanatory clause having
exceeded the grant's wording; a re-flow orphan in SPEC §9 was re-wrapped (bytes of that
sentence only, content identical); the `supersedes-unverified` observation above was
sharpened; the two historical `ContentionError` statements in the previous section gained
forward pointers; and this header no longer presumes how the branch is integrated.

## Post-build-order increment — The CI test-gate repair

**The twenty-first post-build-order increment, exited (branch `ci-windows-test-gate`, cut from
`main` at `95257c1`: three code commits and this record).** Not a capability and not a review:
a repair of the repository's own evidence. It began as a Windows-only oddity and ended as a
finding about every CI run this repository has had.

**The finding.** After the record-contended increment's push, the Windows leg of CI run
33703094044 showed vitest reporting `1 failed | 861 passed` — a SQLite restart-driver probe
timed out at the 5000ms default — while the `pnpm test` step concluded success and the job went
on to build and smoke. Earlier runs on the same leg had done the same (3 failed / 860; 1 failed /
833 at `d5fc3b9`, before the code-review session). No pnpm `ELIFECYCLE` banner appeared in any
of them. A canary pull request (#5, closed and its branch deleted once read) carried one test
that always fails and, on the Windows leg only, diagnostic steps that re-ran the suite under
pwsh and bash, through pnpm, through vitest directly, and through `pnpm exec`, printing each
exit code. CI run 33705059031 answered more than was asked: **all four test legs — ubuntu at
the exact floor 22.16.0, ubuntu at 24, macOS, and Windows — concluded success with the failing
test reported in their own logs**, and each went on to build and smoke. The gate had never
been Windows-specific. It had been inert on every leg, for every run, since the adapter joined
the workspace.

**The diagnostics, and what each ruled out.** On the Windows leg: `pnpm test` → exit 0; `node
node_modules/vitest/vitest.mjs run --project record` → 1; `pnpm exec vitest run --project
record` → 1; the same under bash → the same. So pnpm's script runner and the runner's shells
were suspects for a while, and every local experiment pointed the other way: pnpm 11.18.0 and
pnpm 10.34.5 both propagate a failing script's exit code from a scratch package, from a scratch
workspace, from a copy of this repository's manifests, and even when the script is this
repository's own vitest invoked from a scratch package. The lifecycle environment pnpm hands a
script (thirteen variables, replayed one at a time onto a direct run) changes nothing. What
reproduced the loss, with no pnpm anywhere: `vitest run` in this repository with a failing
test — exit 0 with both projects, exit 1 with `--project record` alone, exit 0 with
`--project store-postgres` alone. Two trivial projects with one failing test exit 1 with and
without a global setup; two trivial projects whose global setup does nothing but `import
'embedded-postgres'` exit 0.

**The mechanism.** `embedded-postgres` (18.4.0-beta.17) calls `AsyncExitHook(gracefulShutdown)`
at module load. `async-exit-hook` (2.0.1) then listens on `exit`, `beforeExit`, and the
termination signals; its `beforeExit` listener runs the hooks and, because the shutdown hook is
asynchronous, ends with `process.nextTick(process.exit.bind(null, 0))` — an explicit exit with
code 0, over whatever `process.exitCode` the process had set. A vitest globalSetup module runs
in vitest's main process, the process whose exit code is the gate. Vitest sets `exitCode = 1`
for a failed run and lets the loop drain; `beforeExit` fires; the library exits 0. A bare child
process pins the whole mechanism in one line: `import 'embedded-postgres'; process.exitCode =
1;` exits 0, and the same line without the import exits 1. On the Windows leg the external
server is used and the embedded server never starts — but the import is the hazard, not the
server, which is why that leg lost the code too.

**One side finding, recorded for the reader who filters.** The canary's `pnpm test -- --project
record` step ran all 863 tests, not the record project's 794. pnpm forwards the `--` to the
script literally (`vitest run -- --project record`), and vitest's argument parser treats
everything after `--` as positional and ignores it. `pnpm test --project record`, without the
separator, is the form that filters; `CLAUDE.md`'s command list now says so.

**The fix, at the source (commit 2/3).** `packages/store-postgres/test/setup/global-setup.ts`
no longer imports the library at the top of the module. `loadEmbeddedPostgres()` snapshots
`process.listeners('beforeExit')`, dynamically imports `embedded-postgres`, removes exactly the
listeners the import added, and returns the constructor; only the embedded branch calls it, so
the external-server branch (the Windows leg) never loads the library at all. The library's
`exit` and signal hooks stay, so its graceful shutdown of a server still running at an abnormal
exit is untouched. Two pins in `packages/store-postgres/test/global-setup-exit-hooks.test.ts`:
the hazard itself, in a child process with a control (fails the day the library stops needing
the workaround, which is the signal to remove it); and the guarded path leaving the process's
`beforeExit` listeners exactly as they were. Red was observed first, at the listener assertion,
against the old top-level import. Proofs after the fix: a failing test in the store-postgres
project alone, and in the two-project run, both exit 1 (both were 0).

**The guard, independent of the cause (commit 3/3).** `pnpm test:ci` runs the suite with the
default reporter plus the JSON reporter written to `.vitest-results.json` (git-ignored);
`scripts/ci-assert-tests.mjs` then fails unless the report says success with zero failed tests,
zero failed files, zero skipped or todo tests, and at least one test — the zero-skips
discipline made a gate. The CI matrix and the release workflow both run the pair as two steps
in place of `pnpm test`. The exit code had to survive vitest, pnpm and the runner's shell in
turn; the report is read directly. Its bounds, in the script's header: counters only, from the
report the same step just wrote — it cannot tell whether the report describes the tree under
test or whether the right files ran.

**The visible symptom (commit 1/3).** The four probe tests driving `makeSqliteRestartDriver()`
each run the full probe set over a real file-backed SQLite store with a genuine close-and-reopen;
on the Windows runner that IO takes 3.5–5s against vitest's 5s default, and the timeout that
opened this inquiry was one of them. They get a 20s budget (`SQLITE_RESTART_TIMEOUT_MS`,
`packages/record/test/probes.test.ts`). Test-only; a pass there is decided by the probe verdicts,
never by the clock.

**The honest bound, stated once.** Every "CI green" this repository's test legs ever showed
proved that the step ran to completion, not that its tests passed. Two things soften that
without erasing it: the suites' own reported results were never wrong — the loss was in the
process's exit code, after the summary was printed — and this document's gate outputs were
measured locally at each increment's closing commit, where a reader would have seen a red
summary line. What no one could see was a red step. The repaired gate was proven the way the
inert one was found, in two temporary commits on the fix branch's pull request (#6), each
dropped before merge. Run 33707967647 carried one SKIPPED test: vitest exits 0 for a skip, so
`pnpm test:ci` concluded success on all four legs and the report gate failed all four
(`FAIL — 1 skipped test(s) (865 tests in 69 files (74 suites): 864 passed, 0 failed, 1
skipped, 0 todo)`). Run 33708203890 carried one FAILING test: `pnpm test:ci` itself failed on
all four legs — the exit code that had been 0 for every failed run since the adapter joined
arrived as 1. Both red on purpose, once, before the branch's own head went green.

**Gate outputs, as measured against the closing commit.** `tsc -p packages/record --noEmit` and
`-p packages/store-postgres --noEmit` clean; `vitest run` — 68 files, 864 tests, zero skips
(record 793, store-postgres 71); `node scripts/ci-assert-tests.mjs` over the run's report —
`ok — 864 tests in 68 files (73 suites): 864 passed, 0 failed, 0 skipped, 0 todo` (the
report's suites count every `describe` block as well as every file); `biome check
--error-on-warnings .` — 137 files, exit 0; `contract-scan`, `api-reference-sync`,
`docs-index-sync` — exit 0.

**The follow-ups, the same day (branch `ci-followups`).** Four items the repair surfaced,
brainstormed and taken together on the owner's choice, with a fifth left as an owner act
outside the repository (reporting the hazard upstream).

*The release workflow's dry run.* `release.yml` gains a `dry_run` dispatch input. With it on,
the pre-release guard runs but reports without blocking (a same-day change — the first version
skipped it, which meant a dry run against a release-shaped tree could never show it passing),
both publish steps are skipped, a one-line step says so, every gate
runs unchanged — the report gate included — and a dry-run-only step runs the publish steps'
own `pnpm pack` commands in their own directories. It proves the job's structure and its gate
chain on the release runner, which had never executed; it proves nothing about the publish,
the provenance attestation, or the token, and it does not retire register row 1, whose
trigger is the real publish. The release checklist gains a pre-flight box for one dry-run
dispatch against the release commit's tree, and its branch-protection item now also asks for
required status checks. It was dispatched once on `main` after this branch merged — run
33713900951, green: every gate ran on the release runner (the report gate reading `864
tests in 68 files`, smoke `OK`), the guard and both publish steps skipped, both tarballs
packed. Not before one more gate had been seen red: the file's first push was rejected by
GitHub's parser, because the dry-run notice's plain scalar carried `dry run: the tree` — a
colon-space — which surfaced as a push-event failure of a dispatch-only workflow (run
33713746413) and a refused dispatch ("Workflow does not have 'workflow_dispatch' trigger");
the block-scalar fix is `806d0d4`. No local YAML parser exists in this tree, so GitHub's
parse is the only one there is; the checklist's dry-run box is where that fact bites next.

*Register row 24.* The `embedded-postgres` exit-hook workaround, with its trigger: the hazard
pin failing, or the library being replaced. A new live row ripples through every document
that counts them — `CLAUDE.md`, this document's current-state bullet and outstanding list,
and `next-phases.md` — all moved here, each marking the row as not gating the cut.

*The CI design record's addendum.* `docs/analysis/2026-08-19-phase-3-ci.md` carries a dated
addendum at its end; its body stands.

*The exit-code evidence sweep.* The failing-test canary (run 33708203890) proved that a
failing step fails the job on every leg, so what remained unproven for the other CI steps was
each tool's own exit code on its own failure class. Each was induced locally against the
current tree and the tree restored (clean `git status` after every row):

| Step | Induced failure | Exit | Note |
|---|---|---|---|
| `pnpm typecheck` | a type error in a `packages/record/test/` file | 1 | |
| `pnpm build` | a type error in `packages/record/src/` | 1 | |
| `pnpm lint` | a `debugger` statement | 1 | |
| `pnpm lint:strict` | the same | 1 | |
| `pnpm lint` | an unused variable | 0 | a warning class; plain lint does not fail on warnings, which is why `lint:strict` exists — it exits 1 on the same file |
| `pnpm contract-scan` | a tracked markdown with an `example.com` URL | 0 | the scan's documented exception for the spec's worked examples (`allowedHost`), not an inert gate |
| `pnpm contract-scan` | the same with an npmjs URL | 1 | `path:line:text` printed |
| `pnpm api-sync` | an `export const` appended to `index.ts` | 0 | the gate parses only `export { … } from` clauses, the barrel's shape, as its header states |
| `pnpm api-sync` | a re-export of a name absent from the reference | 1 | `name-not-documented` printed |
| `pnpm docs-index-sync` | a tracked plan absent from `INDEX.md` | 1 | |
| `pnpm smoke` | a new `import` condition appended to record's `.` export | 0 | an ineffective induce, not the gate: Node matches export conditions in key order and `default` came first |
| `pnpm smoke` | every `.js` target of record's `.` export pointing at a missing file | 1 | `smoke: FAILED at consumer script (exit 1)` |

Every tool exits non-zero on a real instance of its failure class. The three zeros are the
honest part of the table: two are documented bounds of the gates (a warning is not an error;
`example.com` is allowed by design; the api gate reads one export shape), one was a
mis-aimed induce — each now written down where a reader who repeats the sweep will look
first.

*The workflow-file parse gate (branch `workflow-parse-gate`, the same day).* The dry-run input's
first push was rejected by GitHub's YAML parser and nothing in this tree could have said why:
no YAML parser lived here. `yaml` (2.9.0) joins the workspace dev dependencies through pnpm
11.18.0 so the lockfile moved consistently for the frozen install, and
`scripts/test/workflows.test.mjs` — six tests, in the record project beside the other script
tests — parses every file in `.github/workflows/` and asserts the facts the documents rely on:
every job has steps and every step is exactly one of `uses` or a non-empty `run`; `release.yml`
declares a boolean `dry_run` input, its guard carries `continue-on-error` on that input and no
`if`, both publish steps are conditioned on it, and every gate precedes them in order; `ci.yml`
keeps the four-leg matrix with the exact floor 22.16.0 and runs `test:ci` with the report gate
as the very next step; the parser refuses the exact defect GitHub refused (a plain scalar
carrying a colon-space) and accepts its block-scalar form; and the shape check itself refuses
fixtures with no steps, no trigger, or a step with neither or both of `uses` and `run`. Red was
observed first: against the guard as merged that morning (`if: !inputs.dry_run`, no
`continue-on-error`) the release assertion failed, and the guard change that made it pass is
the same commit's second half — the guard now runs in both modes and reports without blocking
in a dry run, so a dry run against a release-shaped tree shows it passing, which the rehearsal
below needs. Bounds, in the file's header: parse and shape only; GitHub's schema — allowed
keys, action pins, expression syntax — is not checked, so a typo inside an `if` still passes
here and fails there. Measured: 69 files, 870 tests; `biome check` 138 files.

*The release-day rehearsal (branch `release-rehearsal`, never merged; the record on `main`).*
The checklist's "File changes" section, executed as written on a throwaway branch cut from
`main` at `74a5828`: both versions to 0.1.0, both `private` flags dropped, the CHANGELOG
section cut with its two flips, the docset flip recipe run — tier 1 from 16 hits in 9 files
(the worked example's numbers exactly) to empty, tier 2 from 22 to 16 with every remaining hit
ruled to stay — the README snippet and CLAUDE.md skim, every gate green locally (the smoke line
reading `peer range ^0.1.0`), no tag. The release workflow dispatched in dry-run mode against
the branch (run 33718633361): the guard passed on the release shape, every gate ran, both
tarballs packed as `vidimera-record-0.1.0.tgz` and `vidimera-store-postgres-0.1.0.tgz`. Three
findings, each now written where release day will read it: the checklist contradicted itself
on the publish-tooling entry's narration (kept as written by one item, forbidden by the
recipe's empty-tier-1 rule — resolved by rewording in the past tense without the literal
patterns, and the item amended); a stale test count hid inside the getting-started caveat; and
a refusing guard under `continue-on-error` shows as a successful step, its verdict only in the
log. The flipped sentences are kept in `docs/analysis/2026-09-03-release-rehearsal.md` as a
worked example to copy and re-verify. The branch was deleted after the record was written;
nothing from it merged.

## Post-build-order increment — The security-findings pass (four findings, two code fixes)

**The twenty-second post-build-order increment, exited (branch `security-findings-2026-09-03`,
cut from `main` at `d7d6dcb`: three code commits — `5a56892`, `bc0a2e1`, `c3bfdf0` — and this
record).** Not a capability: an owner-driven security review of `@vidimera/record` reported four
findings in one message, each with the route taken, and this increment verified each against the
tree before changing anything, then acted on them in severity order. The full account, with the
red-first evidence quoted per commit and each finding's lineage in the earlier reviews, is
`docs/analysis/2026-09-03-security-findings.md`; this section is the ledger.

**Finding 1, the verifier registry — confirmed and fixed (`5a56892`).** The one real defect.
`kernel/verify-signatures.ts` resolved a sidecar entry's `keyRef` with a bare index into the
host's `verifiers` object and read the verifier's answer for truthiness. A bare index walks the
prototype chain: a forged entry whose `keyRef` named `toString` or `constructor` resolved to a
callable answering a truthy value over any bytes and any signature, so a sidecar written by a
storage-side insider holding no key verified whole and every enforcement site confirmed the
record — AL2's own purpose (SPEC §14, "storage-writing insiders") defeated, inside `SECURITY.md`'s
stated scope. The same trap `resolveCanonicalizer` closed at the 2026-08-03 step-1 review, in
the one registry that arrived after that review; a sweep found no other unguarded read. The
lookup is now `Object.hasOwn` and a verification is the literal `true` (a truthy status string or
object from a host's verifier no longer verifies either). `test/verifier-registry.test.ts` pins
the family; red first, `3 failed | 4 passed (7)`.

**Finding 3, identity objects persisted verbatim — confirmed, and INVERTED (`bc0a2e1`): the
TWELFTH self-authored inversion in this document's own numbered sequence.** `isValidIdentity`
checked a non-empty `principal` and `authority` and nothing more, and every seam persisted the
object it was handed; `kernel/consultations.ts` recorded the posture in so many words — extra
keys "reach the digested payload as host attestation" — shared by the `confirmed` actor, the
raiser, the acker and both checkers since the kernel increment (the 2026-08-30 catalogue's item
51 tracked the checker half). Argued at the validator's own site: SPEC §6 defines the shape;
§6 and §13 build erasure on the principal being a pseudonym held outside the chain; the extra keys
are exactly where a host leaks an e-mail address or a bearer token into a digested, immutable
transition; attestation no seam reads is not a capability anyone lost. Tighter conformance to §6,
no SPEC change — but this build's own earlier stance reversed, so it is numbered. An identity is
now exactly `{ principal, authority, proofRef? }` (own keys within that set, non-empty strings,
`proofRef` absent, explicitly `undefined`, or a string); each seam keeps its existing posture
toward an invalid one — `identity-authority-refused` at finalize and decline, a thrown caller
error at the findings seams and the obtained-consultation checker, `consultation-missing` from
the facts gate. Red first, `6 failed (6)`; the record project's other 806 tests unaffected. Item
51 closes, wider than filed.

**Finding 2, enforcement reads live configuration — confirmed as behavior, a recorded posture;
the report now says so (`c3bfdf0`); the fail-open stays, pinned as a bound.** `signingDeclared`
is computed from the genesis `profileId` resolved against THIS instance's registry — the
id-resolution posture and the rehoming residual this document has named since the enforcement
increment (OPEN-QUESTIONS §1's decided granularity; catalogue items 33 and 60). The review's
route: a same-id profile without `signing: true`, on an instance with no `config.signing`, reads
a signing record as plain AL1 and finalizes it, and the report said only `signingDeclared: false`.
What the review added: the in-tree asymmetry with the policy-drift arm, which fails closed on the
identical same-id flip and argues so in place; a route that needs no recompute where item 60
assumed one; the evidence already in the chain — the genesis `profileDigest` covers `signing`;
and helpers the host could not reach, since neither was exported. What landed, no sanction
needed: `SignatureReport.genesisProfile` — `matches` / `drifted` (both digests) / `unresolvable`
— computed only in `verifySignatures` so the gate primitive pays nothing; `signingDeclared`
documented as live-computed; `profileDigest` and `projectProfile` exported. Red first,
`6 failed (6)`. What did NOT land: refusing on drift, which adds to SPEC §8's registry and §9's
ladder and moves OPEN-QUESTIONS §1's decided text — a fresh sanction, recorded as the fourth
entry of `next-phases.md`'s sanction-gated list. `test/profile-drift-report.test.ts` pins the
review's own route with its fail-open AS A BOUND, so that when it moves it moves on purpose.

**Finding 4, any authority may raise or acknowledge — by design, pinned, already recorded.**
SPEC §10.2's raiser "MAY be an automated checker's", counting is "by principal-only comparison
against the raiser", and §4 scopes `allowedAuthorities` to a leg's actor;
`test/findings-seams.test.ts` pins "deciders and informers are different populations". The
residual the review points at is the first entry of `next-phases.md`'s sanction-gated list,
surfaced by the 2026-09-02 code review; that entry now notes the independent re-derivation.
Nothing changed.

**Observed, not acted on.** Every full run on this branch printed `TypeError: done is not a
function` from `embedded-postgres` after vitest's summary and the JSON report, with `vitest exit:
0` and the report gate `ok`; no commit here touches `packages/store-postgres`. Recorded in the
analysis for deferral register row 24's owner.

**Gate outputs, as measured against the closing commit.** `pnpm test:ci` — 889 tests in 72
files, zero skips (`ok — 889 tests in 72 files (77 suites): 889 passed, 0 failed, 0 skipped,
0 todo`); `pnpm typecheck` — both packages clean; `biome check --error-on-warnings .` — 141
files, exit 0; `contract-scan`, `api-reference-sync`, `docs-index-sync` — exit 0. From `d7d6dcb`'s
69 files and 870 tests: 70/877 after the verifier fix, 71/883 after the identity shape, 72/889
after the drift report.

## Post-build-order increment — The profile-drift gate (a sanctioned widening of `unknown-profile`)

**The twenty-third post-build-order increment, exited (branch `profile-drift-gate`, cut from
`main` at `54d9d1c`: the commits `git log main..HEAD` enumerates on the branch; the
design's Process section names their three groups).** A sealed-set widening
under a fresh sanction — `docs/superpowers/specs/2026-09-03-profile-drift-gate-design.md`,
whose §8 records the grant on the maintainer's words and the exact sites, and whose §9 names
every pin. No maturity marker MOVED — every OTHER touched section was already `[PROVEN]` — but
one new row landed, stamped `PROVEN` directly rather than moved to it: CONTROLS §2 gains a
"Profile binding" row after "Content binding" (design §8's site 11), truthful because the
behavior it names lands in this same increment, not because a prior `[DESIGNED]`/`[SKETCHED]`
token moved. It joins the lineage as a sanctioned corrective-and-widening edit, beside the
earlier sanctioned corrective edits and distinct from the ten marker-bearing commits.

**What it closes.** The security-findings pass (the twenty-second increment) left one finding
reported rather than refused: `signingDeclared` is computed from the profile THIS instance
holds, so a same-id profile that dropped `signing: true` read a signing record as plain AL1 and
finalized it. Now an instance HOLDS a record's profile only when the id is registered AND the
registered profile's data-only projection digests to the record's genesis `profileDigest`
(`kernel/held-profile.ts`, against a digest cached on `ResolvedProfile` at `create()`, which
`open()` also binds — byte-identical, the frozen pins unmoved). Every seam that resolves a
persisted record — finalize, decline, raiseFinding, acknowledge, redeem, beginRedemption,
completeRedemption, seal — refuses `unknown-profile`, never-append, at the resolution step it
already had, ahead of every rung; `verifyPriorLegs` and `verifySupersedes` fold the miss into
`prior-leg-unverified` and `supersedes-unverified`; `open()`'s exclusivity path leaves a due
blocker it does not hold standing, `record-exists`, rather than expiring it under the wrong
rules. No new code, no new rung: SCOPING-GUIDE §1 places the control in the KERNEL and §2
names it verbatim, "decided-under-rules-as-they-were".

**What it costs, stated as behavior.** An in-place profile edit strands that profile's open
records: nothing finalizes, declines, expires or takes findings on them, and exclusivity holds
their subjects, until the declarative fields are restored exactly or the edit is registered
under a new id with the old version kept under its own. Pinned, not softened
(`test/profile-drift-gate.test.ts`: the due record that does not expire; the blocker that
stands; both recovery routes).

**What it does not close.** The recompute route: a storage-writing insider who rewrites the
genesis `profileId` AND `profileDigest` consistently onto a registered non-signing profile
still resolves as held. That is the rehoming residual proper (the 2026-08-30 catalogue's item
60), open at AL1; only signing-only registration or AL2 key custody closes it. A second corner,
unrelated to the recompute route: the rung-(1) `chain-compromise` evidence edge is the one
write a drifted instance still makes — chain-verify runs before profile resolution in the
ladder, so a hash-broken chain under a drifted profile still refuses `chain-compromise` and
appends its own `refused` edge at head, exactly as an undrifted instance would — so SPEC §4's
new "a drifted instance writes nothing into the record" sentence over-claimed by that one
corner; recorded here at the closing commit rather than edited, since this increment's own
sanction was spent, and corrected on 2026-09-04 under its own grant — site 15 in the design's
§8, landed in its own commit — so the clause now names the evidence edge as the one exception
the ladder's order makes. A milder consequence, also unclosed: `review()` still
derives ack coverage from the live, possibly-drifted profile it resolves directly
(`ctx.profiles.get`, never `heldProfile`) — SPEC §9's own "reads never refuse" rule holds
`review()` outside every gate this increment adds, so a review taken under a drifted profile
can report coverage against `ackMode`/`requiredAcks` values the record was never actually
opened or decided under; recorded here as a consequence of the reads-never-refuse rule, not a
gap this increment closes.

**The thirteenth self-authored inversion.** OPEN-QUESTIONS §2 decided the policy-gate reverse
direction fail-close, and this build delivered it as `policy-drift` at rung (4.5). Dropping
`policySource` is a profile drift, so both §10.3 cross-instance corners now refuse
`unknown-profile` at resolution before rung (4.5) can run; the now-non-declaring arm in
`kernel/finalize.ts` throws as unreachable, and two `policy-drift.test.ts` pins flip. The
decision did not move; its form did — argued at the pins. Two further pins flipped for the
same mechanical reason without a numbered inversion: `multi-leg.test.ts`'s renamed-maker
separation-of-duties pin (the shape no longer passes resolution) and
`profile-drift-report.test.ts`'s two bound pins, as that file's header promised.

**The sealed-set edits.** Sites 1–13 of the design's §8, verbatim, checked mechanically at
exit against the Proposed texts (present) and the Current texts (absent). Site 14 — SPEC §4's
en-passant exceptions, found while writing the plan — was NOT landed at the closing commit: its
re-grant was pending and the enumeration was false by omission, named here so no reader would
mistake the omission for an oversight. The maintainer re-granted it on 2026-09-04 ("site 14
granted as written", recorded in the design's §8), and the sentence landed in its own commit
after this record, checked the same way; the enumeration is now whole.

**Gate outputs, as measured against the closing commit.** `pnpm test:ci` — 905 tests in
73 files, zero skips (`ok — 905 tests in 73 files (78 suites): 905 passed, 0 failed, 0
skipped, 0 todo`); `pnpm typecheck` — both packages clean; `biome check --error-on-warnings .`
— 143 files, exit 0; `contract-scan`, `api-reference-sync`, `docs-index-sync` — exit 0. The
count moved from 903 to 905 after this section was first written: the whole-branch review's
own final fix wave added two pins, a reads-never-refuse pin
(`profile-drift-gate.test.ts`) and a separation-of-duties unit pin (`multi-leg.test.ts`),
re-measured here on the fixed head.

## Post-build-order increment — The review-hardening pass (five findings from an external code review)

**The twenty-fourth post-build-order increment, exited (branch `review-hardening-2026-09-05`,
cut from `main` at `ad97401`: a design commit, three code commits and the paperwork commit
`git log main..HEAD` enumerates).** No sealed-set edit, no marker move, no new refusal code, no
public-surface change, no inversion. The record is
`docs/analysis/2026-09-05-external-code-review.md` — all seventeen findings of an external code
review of `ad97401` with verdicts and citations; the design is
`docs/superpowers/specs/2026-09-05-review-hardening-design.md`.

**What the review was, and what it could not see.** The reviewer stripped every comment and
JSDoc from the source and excluded `docs/` before reading, ran the gates and eighteen hypothesis
tests, and reported seventeen findings ranked by operator impact. The code claims held where
verified; the record did not reach the reviewer, so nine findings restate rulings already
taken (the profile-drift gate's stranding story, `createWithClock`'s absence as a decision of
record, row 22a's orphans, the sealed principal-only identity rule, the sealed "a sealed prior
still verifies", `review()`'s throw posture, the freshness design's future-claim refusal, and
three by-design nits), two restate recorded horizon items (catalogue items 38 and 175), and
three recommendations would have reversed a sanctioned ruling or repeated an approach row 22
measured and rejected. Each is cited in the record; none was acted on.

**What it closes.** Five findings the repository's own rules already called for. (1)
Construction loudness for the shapes a non-TypeScript caller can hand in that the types rule
out — `config.ts` now throws its own `invalid profile` error, never a raw `TypeError` and never
silent acceptance, for a `captureMode` outside its two values, an `ackMode` outside its three
(`kernel/findings.ts`'s `ackCounts` had read any unrecognized mode as the permissive `'any'`,
the one fail-open shape in the review), an `expiry` neither `'none'` nor an object, a `sod`
without a `notActorOf` array, an empty profile or leg id, and a non-array `legs`; measured
before the fix by execution, two of those were raw `TypeError`s and three constructed. (2)
`terminalRefusals` rejects what can never take effect: every never-appends code
(`NEVER_APPENDS`, now exported from `refusal-codes.ts`), `chain-compromise` (the compromise
class appends regardless of any listing), and a duplicate — SPEC §9.1's "inert or
contradictory feature combinations are construction errors"; `leg-expired` and `availability`,
the two members SPEC §8 names legal-but-inert, stay constructible and the boundary is pinned,
so the reviewer's recommendation to reject `availability` was declined on the sealed text. The
`appendsOn` unit pins that hand the pure function a never-appends leg literal stay: they pin the
function's override, now unreachable through `create()` but still true of the function. (3)
`kernel/redeem.ts`'s shared prologue reads the clock ONCE for its clock rung: the enlisted
due-guard and `resolveDueClock` had each read `now()`, and a window deadline falling between the
two reads let an enlisted call pass the guard and then resolve — routing the resolver's
own-transaction append onto the connection the host held open, which the embedded backing
rejects with "cannot start a transaction within a transaction" mid-host-transaction; pinned in
`clocks.test.ts` under a straddling clock, red first with exactly that throw. (4) The
`Canonicalizer` totality contract, stated at the type and in the guide and pinned as a bound in
`canonicalizer-totality.test.ts` (green from its first run, said so in its header): a
registered canonicalizer is the host's code, so a throw at finalize, decline or a redemption
seam propagates as a configuration fault, appends nothing, and is never read as
`content-drift` — the deliberate contrast with `facts.figures`, caller data, where
`isValidFacts` reads a canonicalization failure as a present-but-unusable payload. (5) Four
behavior-preserving nits — `consultations.ts`'s `as never` cast, `canonical.ts`'s per-call
`TextEncoder`, `probes.ts`'s `AAAA` tamper prefix (a no-op on a signature already beginning so,
once in roughly sixteen million runs against a real signer; now a first-character flip), and
`expiry.ts`'s reversed-copy scans — with the frozen byte-stability pins untouched and green as
the proof. Two guide sentences beside these: the `Verifier` paragraph names the two operational
consequences of fail-closed verification (retry inside a transiently failing verifier; keep a
retired key's verifier registered), and the `SqliteStore` entry states the single-operator
bound that catalogue item 175 had left in the source header alone.

**What it records rather than closes.** Finding 5.1 — a throwing or `false`-answering
`Verifier` is unverified, and an unverified transition of a signing record is
`chain-compromise`, a terminal edge, so a transient key-service failure marks a healthy record
compromised — is correct on the code and a decided posture (the AL2 enforce design,
OPEN-QUESTIONS §1's key-custody tail, this document's §14 row); an `unavailable` route for the
signature layer would widen SPEC §8's availability-class producers and touch §14 and the decided
tail, so it is the fifth entry on `next-phases.md`'s sanction-gated list, and the guide
sentences above are the mitigation a host has today. Finding 5.16's four adapter items — no
`due_at` index in either SQL backing, a doubled `#validateTx` on an enlisted batch, no opt-out
for the lazy DDL, an undocumented READ COMMITTED assumption — widen deferral register row 23's
inventory, dated, none gating the cut. Finding 5.12 (a transition-legality table in `replay`)
and the finalize half of 5.9 (one clock read per operation) are recorded in `next-phases.md` as
post-0.1 considerations beside catalogue item 38. Finding 5.4 (`createWithClock`) stays
decided; the owner declined to reopen it, and the record keeps the reviewer's argument for the
day a host demand arrives.

**Inversions.** None. No pinned assertion changed its truth value; the self-authored-inversion
sequence stays at thirteen. Every new pin either went red first against the tree before its fix
(ten construction pins by "Missing expected exception" or a raw `TypeError` message, the clock
pin by the nested-transaction throw) or is a bound pinned green and labeled as such (the two
totality pins, the boundary pin for `leg-expired`/`availability`).

**Gate outputs, as measured against the closing commit.** `pnpm test:ci` — 921 tests in 74
files, zero skips (`ci-assert-tests: ok — 921 tests in 74 files (79 suites): 921 passed, 0
failed, 0 skipped, 0 todo`), up from 907 in 73 at `ad97401` by fourteen pins; `pnpm typecheck`
— both packages clean; `biome check --error-on-warnings .` — 144 files, exit 0;
`contract-scan`, `api-reference-sync`, `docs-index-sync` — exit 0; `pnpm build` — both
packages emit. `CLAUDE.md`'s measured sentence moves to 74 files / 921 tests with this record.

## Post-build-order increment — Chain binding

**The twenty-fifth post-build-order increment, exited (branch `chain-binding-2026-11-17`, cut
from `main` at `b2ea16b`: the design-and-plan commit `1fc5178`, six code commits and this
paperwork commit, which `git log main..HEAD` enumerates).** No sealed-set edit, no marker move,
no new refusal code, and no `Store`, backing, `SignatureStore` or conformance-suite change. Two
public-surface changes: the exported pure `verifyChain` gains an optional `recordId`, and
`getRecord` (both handles), `replay`, `review`, `verifySignatures` and `open()` gain a throw on
foreign persisted data. One self-authored inversion, the fourteenth. The design is
`docs/superpowers/specs/2026-11-17-chain-binding-design.md` — its §3 argues why no sanction is
needed and none is claimed — and the plan is
`docs/superpowers/plans/2026-11-17-chain-binding.md`.

**What it closes.** No path bound a loaded chain to the `recordId` it was loaded for.
`verifyChain` compared every transition's `recordId` with `chain[0]`'s and derived the genesis
link from that same id, never seeing the requested one; every seam's load, `verifyPriorLegs`,
`verifySupersedes`, the operator wrappers, `review`, `verifySignatures` and `open()`'s blocker
read ran over whatever `store.readChain(id)` returned; the AL2 layer listed the sidecar by the
chain's own genesis `recordId`; and five edge builders addressed their edge with
`last.recordId`, data read off the chain. The SQL backings key a read by the `record_id` column
and return the parsed JSON, whose own `recordId` is independent of that column. So a
storage-writing insider who copied record Y's rows under record X's key — no hashing, no signing
— got `verifyChain(X)` intact and, at AL2, `verifySignatures(X)` all-verified over Y's history;
the operator's next ordinary call on X appended a library-built edge (library-signed, at AL2)
onto the honest Y — a terminal one costing Y its pending decision while Y still verified clean;
and a relocated prior leg or predecessor passed `verifyPriorLegs` or `verifySupersedes`. That
broke SPEC §5's account of the one en-passant append to a different record's chain (`open()`'s
blocker expiry) and SPEC §14's AL2 claim that a rebuilt chain fails verification "without
trusting storage" (SPEC.md:1359). The doc comment at `verifyChain` rested on a premise the SQL
backings do not hold, that no store can persist a mixed chain. What this buys a host, with its
limit: a chain relocated under another record's id is now detected wherever the library folds or
verifies a chain, and no edge the library builds lands on the record the rows came from — while
whole-record absence and AL1's recompute and head-edit residuals stay exactly as SPEC §13A names
them.

**What landed, commit by commit.**

- `2c97b6e` — `verifyChain(chain, recordId?)` (`chain/replay.ts`). Given the id, check 2 (record
  identity) compares every row with it and check 3 (genesis) derives the link from it, so a
  wholly relocated chain breaks at seq 1 with both ids in the detail; omitted, the function is
  unchanged — identity against the genesis row. The check order and the first-break-only report
  are unchanged. The doc comment's premise is replaced with the truth (the `record_id` column,
  the row's own JSON, and why to pass the id, an offline audit of an archived chain included);
  the same premise in `test/replay-verify.test.ts`'s foreign-splice comment is corrected, its
  assertion untouched. Five pins open `test/chain-binding.test.ts`: relocated, relabelled with
  the genesis link left as Y's, mixed, matching, omitted.
- `350e27b` — every library-built transition is addressed by the caller's id.
  `appendChainCompromise` and `refuseMaybeAppend` (`kernel/finalize.ts`), `resolveDueClock`
  (`kernel/expiry.ts`), `appendSeamTransition` (`kernel/findings-seams.ts`) and
  `refuseCorrespondenceMismatch` (`kernel/redeem.ts`) take a `recordId` parameter; the findings
  seq-conflict call, the findings ok result and the redemption residual re-read use it too;
  `open()`'s blocker expiry passes `first.blockingRecordId`. `last.recordId` no longer occurs in
  `src/`. Three pins call the exported builders with one record's chain and another record's id
  and find the edge carrying the argument. `test/clocks.test.ts`'s `resolveDueClock` calls gain
  the argument, their assertions untouched. For an honest chain this changes no byte: after a
  bound verify, `last.recordId === recordId`.
- `095b1b2` — every verifying load passes the id it loaded by: the chain-verify rung of
  `finalize`, `decline`, the findings prologue, the redemption prologue and `seal` (the
  operator's `recordId`), `verifyPriorLegs` and `verifySupersedes` (`ref.recordId`), and the
  operator `verifyChain` wrapper (`create.ts`). `signatureLayerHolds` and `layerVerdicts`
  (`kernel/verify-signatures.ts`) take that id and list the sidecar by it, never by the genesis
  row. The outcomes are each site's existing ones: `chain-compromise`, with the edge on the
  requested record and addressed to it where the store admits one (none for an enlisted
  redemption, as before); `prior-leg-unverified`; `supersedes-unverified`; and a break at seq 1
  from the wrapper. Tests: `RelocatingStore` (`test/helpers/stores.ts`), whose doc comment
  states its fidelity limit — the inner store keeps X's real rows, so its pins build X and Y at
  equal lengths and assert that the edge DID land, on X, addressed to X; the seam matrix in
  `test/chain-binding-seams.test.ts` over `MemoryStore` and `SqliteStore` at AL1 and AL2, the
  three original attack shapes, the cross-record pair and the audit pin; and
  `test/chain-binding-sqlite.test.ts`'s faithful SQL row copy on `SqliteStore`.
- `2a28317` — `assertChainFor` (`chain/binding.ts`, not exported from the root) throws an
  `Error` naming the seam, the requested id and the id found, with the phrase
  `foreign persisted data` and SPEC §8, when any transition of a non-empty chain carries another
  id. It runs in `getRecord` (the one closure both handles share), the `replay` wrapper,
  `review`, `verifySignatures` (after its own empty-chain throw) and `open()`'s blocker read,
  before the blocker is replayed — so `open()` throws and no edge lands on either record. Two
  diagnostic re-reads call it inside their existing `try`, so a foreign chain takes their
  existing fallback: the redemption residual (`residualRefusal`) falls through to
  `unredeemable-state`, never `already-redeemed`; and the seq-conflict classifier
  (`seqConflict`, `kernel/finalize.ts`, serving `finalize`'s and `decline`'s batch conflicts and
  the findings seams' append conflicts) reports the storage fault, never `record-contended`.
  Empty chains keep their behavior at every site. The surface doc comments for `getRecord` (both
  handles), `replay` and `verifySignatures` moved in the same commit; the SQLite file gained a
  verbatim-copy pin at AL2 and an AL1 twin, the shape only the binding catches.
- `ecbf7fa` — the signing decorator (`signing/decorate.ts`'s `recordSigns`, the design's ruling
  5.6): on a cold memo it reads the record's genesis to decide whether to sign, and when that
  genesis carries another record's id it now signs and caches nothing, and never throws (a throw
  would turn the seam's `chain-compromise` refusal into a crash). Without it, ruling 5.3's
  correctly addressed compromise edge would have cached Y's signing decision under X in the
  decorator's bounded memo, and where X's profile signs and Y's does not, a later append to X in
  the same process could land unsigned. Two pins: a foreign genesis on a cold read is signed; a
  foreign genesis is never cached. Also: `seqConflict`'s identity check names its caller's seam,
  and the empty-chain read pin awaits each read in turn and asserts each read's own message.
- `651d2de` — the source census, `test/chain-binding-census.test.ts` (five pins): no
  `last.recordId` in `src/`; every `prevHash`-bearing object literal in `src/kernel/` writes
  `recordId` in shorthand — the variable of that name, never `recordId: <expression>`; every
  `verifyChain(` call outside `chain/replay.ts` (and its `verifyChainCore` alias in `create.ts`)
  passes the requested id — exactly `recordId` or `ref.recordId` — as its second argument; every `.readChain(` call
  site is on a per-file list with its binding (verify-bound, identity-checked, raw by contract,
  the decorator's check, or a pass-through), and each identity-checked file calls
  `assertChainFor(` the listed number of times; `layerVerdicts` lists the sidecar by its own
  `recordId` parameter. It proves naming, not behavior, and its header says so; the behavioral
  pins are the files above.

**What it does not close.** Whole-record absence and AL1's recompute and head-edit windows —
SPEC §13A's residuals — are unchanged: a record whose whole chain is gone still leaves no trace
at the base level, and an insider who rewrites every copied row's `recordId` and recomputes
every link produces a chain that verifies at AL1; AL2 detects that recompute only when the
signing key sits outside that insider's boundary. The raw `readChain` and `chainHead` on both
handles return what storage holds, by contract, and the probes and their tampering wrapper are
untouched. The design's §2 names two further AL2 questions as non-goals, each its own increment;
nothing here moves them. [The obligation read from the live registry was taken by the
signing-obligation increment, the twenty-seventh section below.] Earlier passages of this document that quote a call site as
`verifyChain(chain)` — the step-8, §5 and §14 rows and the AL2 enforcement accounts — describe
the code as it stood when they were written; every such call in `src/` now passes the id, as the
census pins.

**Inversions.** One — the **fourteenth** self-authored inversion in this document's numbered
sequence: `verifySignatures`'s recorded throw class. The §14 row recorded that it "throws only
on the caller-error/unknown-record class every other read takes", and its doc comment
(`operator-surface.ts`) the same in "Throws only on the caller-error/unknown-record class every
read takes"; it now also throws on foreign persisted data. The stance's own parallel — "every
other read" — is kept: `getRecord`, `replay`, `review` and `open()`'s blocker read throw on the
same data, so the class widens for all of them together and `verifySignatures` stays exactly as
strict as they are. It stays a read: it appends nothing and still never throws on a verification
failure. Argued at its pin — `test/chain-binding-seams.test.ts`'s "replay, review and
verifySignatures throw on a relocated record" — and noted in place in the §14 row. The design's
ruling 5.4 asks the same check of the other four reads, and none of their recorded stances is
reversed, so the sequence stands at fourteen:

- `review()` is "a pure read that never fails on config drift" (`types.ts`'s
  `ReviewView.findings` doc comment, quoted in the §10.2 row), and the profile-drift gate's
  "reads never refuse" pin (`test/profile-drift-gate.test.ts`) asserts that, and that
  `getRecord` answers and `replay` folds the chain "regardless of profile drift". Both are
  scoped to configuration drift, and a throw on foreign storage is not a refusal; the pin is
  unchanged and green.
- The module headers of `review()` (`kernel/review.ts`) and `open()` (`kernel/open.ts`) name
  their unknown-record and unknown-`stagedRef` throws as SPEC §8's caller-error posture without
  claiming that class is the only one — "only" is the word `verifySignatures`'s stance carried
  and theirs do not. `replay`'s doc comment carried nothing beyond "audit wrapper (not
  Outcome)", and the guide's "an unknown record is a caller-error throw" names a throw, not the
  only one.
- The §14 row's "`review()` and the other pure reads stay unverified, unchanged", and the §5
  row's limit that `open()`'s en-passant expire "replays that chain without verifying it" — SPEC
  §5's "without a pre-verify of the blocker's chain" — both still hold: `assertChainFor` is a
  string comparison of each row's `recordId`, not a chain-verify; no digest is recomputed.
- The guide's "the three reads are pure" (the agent surface) still holds: the throw writes
  nothing.

No pinned assertion changed its truth value. The only edits to existing test files are the
corrected comment in `test/replay-verify.test.ts` and the added argument at
`test/clocks.test.ts`'s `resolveDueClock` calls; `test/byte-stability.test.ts` is untouched
since `b2ea16b` and passes, so the frozen digests did not move.

**Gate outputs, as measured on this branch with this paperwork in place (the tree of the increment's last commit, the final review's fix wave, whose source and test edits are comments and the census's tightening only).**
`pnpm` fails on this machine with `CommandNotFound`, so each gate ran through the local binaries
its script names. The whole suite — `vitest run` with the JSON reporter, then
`node scripts/ci-assert-tests.mjs` over the report, the `pnpm test:ci` pair — 984 tests in 78
files, zero skips
(`ci-assert-tests: ok — 984 tests in 78 files (83 suites): 984 passed, 0 failed, 0 skipped, 0 todo`),
vitest exit 0; `embedded-postgres`'s `TypeError: done is not a function` printed after the
summary — the known teardown message the security-findings pass recorded for deferral register
row 24's owner. Against the 921 in 74 the review-hardening pass last measured, the difference is
exactly the four new files: `chain-binding.test.ts` 10, `chain-binding-seams.test.ts` 45,
`chain-binding-sqlite.test.ts` 3, `chain-binding-census.test.ts` 5. Typecheck, both packages —
exit 0; `biome check .` and `biome check --error-on-warnings .` — 149 files, exit 0 each; build,
both packages' `tsconfig.build.json` — exit 0; `contract-scan`, `api-reference-sync` and
`docs-index-sync` — exit 0, no output, and the first and last re-run after this section was
written, exit 0 again. **The packed-tarball smoke test was not run to completion on this
machine.** `node scripts/smoke-pack.mjs` built both packages and packed `record` with npm, then
stopped at its `pnpm pack (adapter)` step, exit 1, `CommandNotFound` — the same broken `pnpm`
launcher. The adapter must be packed by pnpm (only pnpm's pack rewrites the `workspace:^` peer
range), so no substitute ran here: that gate is unmeasured for this increment until a machine
with a working `pnpm`, or CI's test matrix, runs it. Nothing in this increment touches either
manifest, the build configuration, or `packages/store-postgres`. `CLAUDE.md`'s measured sentence
moved to 78 files / 984 tests with this record, as the earlier increments' records moved it.

**One residual the final review named, not fixed.** Ruling 5.6 signs the compromise edge when
the decorator cannot take a record's signing decision from its own genesis, and the extra
sidecar entry that can leave is a harmless orphan. That can also happen for a NON-signing
record's compromise attempts, on the no-edge path, while a relocation persists; deferral
register row 22's text speaks of signing records only. The register itself is not edited here.

---

## Post-build-order increment — Identity snapshot

**The twenty-sixth post-build-order increment, exited (branch `identity-snapshot-2026-11-17`,
stacked on `chain-binding-2026-11-17` at `3a1361b`: the design-and-plan commit `9c4ea71`, two
code commits, this paperwork commit and the fix-wave commit that followed it, which `git log 3a1361b..HEAD` enumerates).** No
sealed-set edit, no marker move, no new refusal code, and no change to `index.ts`, either
manifest, `sqlite.ts` or `packages/store-postgres`. No public-surface change: `identitySnapshot`
is exported from `kernel/identity.ts` only, never from the root. **No inversion** — the
Inversions paragraph below says why. The design is
`docs/superpowers/specs/2026-11-17-identity-snapshot-design.md` — its §3 argues why no sanction
is needed and none is claimed — and the plan is
`docs/superpowers/plans/2026-11-17-identity-snapshot.md`.

**What it closes.** What the library validated as an identity was not what it recorded.
`isValidIdentity` checked the object's OWN enumerable keys, then read `principal`, `authority`
and `proofRef` through ordinary property access — following getters and the prototype chain —
while every seam embedded the caller's object itself (`payload: { actor: identity }`,
`facts.checker`, an obtained consultation's `checker`, `raiser`, `acker`), and three serializers
then read that object three ways: JCS honours an inherited `toJSON`, `MemoryStore`'s
`structuredClone` drops the prototype, the SQL backings persist `JSON.stringify`. A getter-backed
or `Object.create`-built identity was digested and recorded as `{}`, so a `sod.notActorOf`
successor received `priorLegActors: [{}]` and the same principal confirmed the checker leg —
separation of duties failed open. A class with a prototype `toJSON` persisted that view on the
SQL backings: an extra e-mail key, a redacted principal, a disallowed authority. On
`MemoryStore` the same shape in `facts.checker` mid-batch made the stored chain stop linking
(`verifyChain` broke an untampered record; the next seam appended `chain-compromise`). A
getter-backed acker was recorded as `{}`. And chains already written with a `{}` actor stayed
fail-open on the read side: `verifyPriorLegs` rejected only an `undefined` actor and
`sodViolated` compared `priorActor.principal`. What this buys a host, with its limit: the
identity a seam records is exactly the values it validated, whatever shape the host's identity
object has, and a recorded actor that is not a valid identity is a loud storage fault on read;
other host values — profiles, options, canonicalizer output — are not snapshotted by this
increment.

**What landed, commit by commit.**

- `d87ea90` — `identitySnapshot(identity): IdentityAssertion | null` (then in `kernel/finalize.ts`; see the fix wave below)
  applies `isValidIdentity`'s checks in their order, reads each field exactly once into a local
  and returns a fresh `{ principal, authority, proofRef? }` literal (`proofRef` omitted when
  `undefined`), or `null`; it catches nothing, so a getter that throws propagates as before.
  `isValidIdentity` is now its non-null test [with no caller left in `src/` — kept as the site
  the twelfth inversion is argued at, a post-merge correction of this sentence]. Every
  seam records the literal it validated: finalize's and decline's actor (the allowlist check,
  `sodViolated` and the recorded `actor` all read it), `facts.checker` (the facts gate now
  returns the checker literal with the canonical bytes), an obtained consultation's `checker`
  (`validateConsultations`), `raiseFinding`'s `raiser` and `acknowledge`'s `acker`
  (`validateSeamIdentity` returns the literal, held across the chain load). The read side
  fails closed: `verifyPriorLegs` throws a storage-fault error when a replayed `confirmed`
  prior's actor is not a valid identity (and records the literal into `priorLegActors`), and
  `sodViolated` throws the same way when any `priorLegActors` entry is not one, before comparing
  principals. `test/identity-snapshot.test.ts` opens with the four shapes at each seam on
  `MemoryStore` and `SqliteStore`, the SoD pin, the mutation-after-call pin and the read-side
  pins.
- `1916097` — `MemoryStore` clones each transition, compares the clone's digest with the
  digest of the transition it was given, and throws before any state changes when they differ
  (genesis append, append and `appendBatch`; after every conflict check, so a conflict still
  wins over a throw, and a batch stays all-or-nothing). The header's store-clone decision was
  touched here, but its premise was not yet corrected; the fix wave below did that. A conformance case in `test/conformance/store-conformance.ts` runs on all
  three backings: an append whose payload carries a prototype `toJSON` either throws leaving the
  chain unchanged or returns a digest equal to `chainHead` and to the digest of what `readChain`
  returns. `kernel/findings.ts` now throws a named storage-fault error for a recorded
  raiser or acker that is not a valid identity — it previously crashed with an unnamed
  `TypeError` (the design's first draft said `finalize` refused there; execution measured the
  crash, and the design's §1 bullet was corrected in `961cdbe`, the record commit) — except that an
  empty-string principal on an object-shaped identity stays non-counting, because an existing
  assertion pins it. Four `MemoryStore` pins in `test/store-constraints.test.ts`; the
  review-driven additions to the identity test file (a capturing-store double so the
  mutation-after-call pin can fail, a decline matrix, SoD rows).

- This increment's fix-wave commit (the final review's findings). `IDENTITY_KEYS`,
  `identitySnapshot` and `isValidIdentity` moved, with their doc comments and the twelfth
  inversion's argument, from `kernel/finalize.ts` into the new leaf module
  `kernel/identity.ts`; every importer was updated, which removes the `findings.ts` ↔
  `finalize.ts` and `consultations.ts` ↔ `finalize.ts` import cycles, and nothing outside the
  kernel imported them. The `MemoryStore` header's premise was corrected (above). One behavior
  change, in `cloneSameDigest`: when the clone cannot be digested at all (a BigInt reached
  through a prototype `toJSON`, say) it now rethrows a `MemoryStore`-named error with the
  original as `cause`, where the bare `TypeError` used to escape; two more pins in
  `test/store-constraints.test.ts` (that rethrow, and a conflict still winning over the
  digest-check throw), and one test title there corrected. The changelog entry's limits were
  qualified: the throws that fire only for a `sod`-declaring leg and for a required-kind
  finding carrying acknowledgements, and what the conformance case does and does not hold.

**What changes in the stored form, and what does not.** For a plain `{ principal, authority,
proofRef? }` literal every digest is unchanged: `test/byte-stability.test.ts` is untouched
since `3a1361b` and passes, and no `PINNED_` literal moved. Two stored-form differences follow
from the literal being built fresh: `MemoryStore` no longer keeps an own `proofRef: undefined`
key on a recorded identity (it never entered a digest — JCS omits it — but it was visible to a
reader of the stored object), and the SQL backings' stored JSON lists `principal` then
`authority` in that order whatever order the host's object declared its keys in.

**The store-clone decision's corrected premise.** The decision comment in `store/memory.ts`
said a class instance carrying a method "would newly THROW" at the clone. That is wrong
for the shape it named, and the header text was corrected in this increment's fix-wave commit
(the final review's findings): `structuredClone` throws on function- or symbol-valued OWN members, and
silently drops a prototype, its methods and its `toJSON`. The decision itself — plain
`structuredClone`, its throw accepted as a deliberate narrowing — is kept; the digest check is
what makes the silent half loud, since a clone that lost a prototype `toJSON` digests
differently from the object it copies.

**Behavior changes on the read side, plainly.** A recorded prior-leg actor, `priorLegActors`
entry, finding raiser or finding acker that is not a valid identity is now a storage-fault
throw, where before it was a silent separation-of-duties pass or an unnamed `TypeError`: at a
successor's `open()` (`verifyPriorLegs`), at `finalize` and `decline` (`sodViolated`, only
for a leg that declares `sod`), and wherever a finding's acknowledgement coverage is computed
(`finalize` and `review`, reached when a required-kind finding carries acknowledgements). The
set includes chains written before the 2026-09-03 exact-shape posture whose actors carry extra
keys — they are not valid identities now either. The library is unpublished, so no published
release carries the old behavior; this paragraph states the consequence for any chain written
before this increment and speculates about nothing else.

**What it does not close.** Other host values — profiles, options, canonicalizer output,
consultation payloads beyond the checker — are not snapshotted: they share the root cause and
are separate findings with separate fixes. The SQL backings are unchanged: they persist
`JSON.stringify` of a transition and digest it through JCS, and the conformance case checks
that the two agree on a prototype `toJSON` rather than changing either. The exact-own-key check
is unchanged; a getter that returns different values on successive reads is read once per
field, so its first answer is the one recorded, and a getter that throws still propagates.

**Inversions.** None. The twelfth self-authored inversion (`bc0a2e1`, above, the
security-findings pass) made an identity exactly `{ principal, authority, proofRef? }`; this
increment keeps that check unchanged and completes the fix, which had been verified against the
extra-own-key shape only and was incomplete for inherited, accessor and `toJSON` shapes — the
check read own keys but the fields through property access, and every seam still embedded the
object. The store-clone posture is kept too (plain `structuredClone`, its throw accepted as a
narrowing); the new digest check adds a second loud refusal in the same direction, and only its
premise is corrected. No recorded stance of this build is reversed, so the numbered sequence
stands at fourteen. No pinned assertion changed its truth value; the only edits to existing
test files are additions (`test/conformance/store-conformance.ts`'s new case,
`test/store-constraints.test.ts`'s six pins).

**Gate outputs, as measured on this branch after the fix wave.** `pnpm` fails on this
machine with `CommandNotFound`, so each gate ran through the local binaries its script names.
The whole suite — `vitest run` with the JSON reporter, then `node scripts/ci-assert-tests.mjs`
over the report, the `pnpm test:ci` pair — 1068 tests in 79 files, zero skips
(`ci-assert-tests: ok — 1068 tests in 79 files (84 suites): 1068 passed, 0 failed, 0 skipped, 0 todo`),
vitest exit 0; `embedded-postgres`'s `TypeError: done is not a function` printed after the
summary — the known teardown message deferral register row 24 owns. Against the 984 in 78 the
chain-binding increment last measured, the difference is 84 tests and one file:
`identity-snapshot.test.ts` 75, `store-constraints.test.ts` six more (four, then two in the fix wave), and the new
conformance case once on each of the three backings. Typecheck, both packages — exit 0; `biome check .` and
`biome check --error-on-warnings .` — 151 files, exit 0 each; build, both packages'
`tsconfig.build.json` — exit 0; `contract-scan`, `api-reference-sync` and `docs-index-sync` —
exit 0, no output. **The packed-tarball smoke test was not run on the authoring machine** — the
broken `pnpm` launcher stops `scripts/smoke-pack.mjs` at its adapter pack step, as at the
previous increment — and runs in CI on the pull request. Nothing in this increment touches
either manifest, the build configuration or `packages/store-postgres`. `CLAUDE.md`'s measured
sentence moved to 79 files / 1068 tests with the fix wave, as the earlier increments' records
moved it.

## Post-build-order increment — Signing obligation

**The twenty-seventh post-build-order increment, exited (branch `signing-obligation-2026-11-17`,
stacked on `identity-snapshot-2026-11-17` at `1dde68b`: the design-and-plan commit `10998f2`, the
code-and-pins commit `4705ded`, the record commit `2e43574`, and the amendment after the
whole-branch review — its design commit `d95b441`, its code-and-pins commit `640eb42` and the
docs-and-record commit after it — which `git log 1dde68b..HEAD` enumerates).**
No sealed-set edit, no marker move, no new refusal code, and no change to `index.ts`, either
manifest, any store file, `packages/store-postgres`, the seven verification call sites or the
`SignatureReport` type. **No inversion** — the Inversions paragraph below says why. The design is
`docs/superpowers/specs/2026-11-17-signing-obligation-design.md` — its §3 argues why no sanction
is needed and none is claimed — and the plan is
`docs/superpowers/plans/2026-11-17-signing-obligation.md`.

**What it closes.** The AL2 obligation every verification site enforces was read from the live
profile registered under the genesis `profileId`, with no comparison against the genesis
`profileDigest`. An instance holding `{ ...P, signing: true }` over records opened under
non-signing `P` read each as a signing chain with no signatures, and every operator seam
appended a terminal `chain-compromise` edge to an untampered record: open records through
`finalize`, `decline` and the findings seams, confirmed records through `seal`'s compromise
carve-out and the redemption seams, which could then never redeem; restoring `P` exactly met
`record-not-open`. The drop direction had been closed by the profile-drift gate; the add direction
never was. What this buys a host, with its limit: an in-place edit that adds `signing: true`
refuses `unknown-profile`, never-append, instead of destroying the records it touches — and an
instance that does not hold a record's profile still cannot tell every signing chain from a
never-signed one (the bound below).

**What landed, commit by commit.**

- `10998f2` — the design, the plan and their `docs/superpowers/INDEX.md` row and counts.
- `4705ded` — the first cut: one rule inside `layerVerdicts` (`kernel/verify-signatures.ts`),
  the correlation core `signatureLayerHolds` and `verifySignatures` share. `layerVerdicts` now
  returns an `obligation` beside `signingDeclared`: the held profile's `signing` when the
  instance holds the record's profile (`heldProfile`: the id registered AND its live digest
  equal to the genesis `profileDigest`), and otherwise — in this first cut — whether the
  chain's first transition was reported `signed` and `verified` by the walk that already
  verifies every transition (no new sidecar read, no second verifier call).
  `signatureLayerHolds` enforces the layer exactly when the obligation is true. The add
  direction refuses `unknown-profile` with no edge at `finalize`, `decline`, `raiseFinding`,
  `acknowledge`, `redeem`, `beginRedemption`, `completeRedemption` and `seal`; a successor
  leg's `open()` refuses `prior-leg-unverified`; a `supersedes` claim over a declined
  predecessor verified [refuses since the supersedes-binding increment, the twenty-eighth
  section below] and over a confirmed one refuses `supersedes-unverified` (the binding
  fold, as for every other drift). `config.ts`'s `signing` comment and `operator-surface.ts`'s
  `verifySignatures` comment state the rule. Nine pins in `test/signing-obligation.test.ts`.
  The first cut ALSO had a sibling that dropped `signing` but kept the verifier enforce the
  whole layer once its genesis verified; that part is withdrawn, below.
- `d95b441` and `640eb42` — the amendment, after the whole-branch review. The review found two
  consequences of the first cut. First, a non-holder that kept a verifier enforced the whole
  layer: a sibling that dropped `signing` but kept `config.signing` drew `chain-compromise` —
  an UNSIGNED edge, since the signing decorator decides by the live profile — into an
  untampered record whose later transition was signed under a key the sibling holds no
  verifier for (a rotation not mirrored on it). That is an instance that does not hold a
  record's profile appending to an untampered record, the one thing the increment exists to
  stop; before the increment such a sibling refused `unknown-profile` with no edge, and the
  first cut's "gained detection" is what introduced the path. Second, `supersedes` verified in
  the narrowed case (below). The rule for an instance that does not hold the profile is now
  the live same-id profile's declaration (`signingDeclared`) AND a genesis transition the walk
  reported `signed` and `verified`; the held branch is unchanged. Against the code before the
  increment the only changes are the add direction (fixed) and a same-id signing sibling over
  a signing record whose genesis entry is missing, fails or names a key it cannot verify
  (narrowed). The drop direction is exactly as it was: no obligation, no edge,
  `unknown-profile`. `kernel/verify-signatures.ts`, `config.ts` and `operator-surface.ts` state
  the rule per site. The pin file is now twelve tests: the drop-direction exception pin became
  its opposite (a sibling that dropped `signing` but keeps the verifier refuses
  `unknown-profile`, no edge, over a signing record with a later entry broken), a key-gap pin
  was added (genesis signed under one key, a later entry under a second the sibling holds no
  verifier for), the bound gained the no-verifier-genesis case, the two `supersedes` residuals
  below are pinned as current behavior, the redemption pin now refuses on a `confirmed` record
  before the holder begins, and the ttl pins assert the sibling reads `drifted`.
- The record commits — `docs/guide/integrating.md` (the bullet on losing `signing` in place
  now covers gaining it and states the bound; one sentence after the AL2 sample says enabling
  AL2 on a profile with records is a profile edit — new id, old one kept registered; the sample
  itself is unchanged, so it needed no re-run), `docs/guide/api-reference.md` (the
  `signingDeclared` paragraph says the seams apply the held profile's obligation, not that
  reading alone), `CHANGELOG.md`, this section, the SPEC §14 row's in-place annotation, and
  `CLAUDE.md`'s measured sentence; the amendment moved each of them to the per-site rule.

**The report is unchanged.** `verifySignatures` keeps every field and value: `signingDeclared`
is still the live profile's declaration and is reporting only, in both directions now — a
same-id profile that adds `signing: true` makes a never-signed record read `signingDeclared:
true`, and no seam enforces on it alone — where an instance does not hold the profile the
reading counts only together with a genesis entry its verifier accepts. `genesisProfile` keeps naming the drift.

**The profile-drift gate's sentence, made true for both directions.** That gate's design §5
says "`signingDeclared` is still computed from the live profile, but that computation no longer
reaches a seam that could act on it." It held only for the drop direction: a non-signing live
profile read `signingDeclared: false`, the layer passed and resolution refused. For the add
direction the live reading did reach every seam. After this increment it is true for both — the
claim is made true, not reversed. The drop direction itself is unchanged: a non-signing live
profile still reads no obligation, so a sibling that dropped `signing` runs no layer, draws no
edge and refuses `unknown-profile`, whether or not it keeps the verifier.

**The honest bound, per site (design §8.2).** An instance that does not hold a record's profile
cannot tell a never-signed record from a signing record whose genesis entry was removed, whose
genesis key it holds no verifier for, or whose genesis entry fails. A same-id signing sibling (a
`ttl` edit, say) reads all three as carrying no obligation. At the five operator seams —
`finalize`, `decline`, the findings seams, the redemption seams, `seal` — it refuses
`unknown-profile` and appends nothing, where before the increment it drew `chain-compromise`
and a holder of the profile still does. At `prior-legs` it refuses `prior-leg-unverified`, as
before (the binding fold). At `supersedes` a `confirmed` predecessor refuses
`supersedes-unverified` (the binding fold) and a terminal non-`confirmed` predecessor
VERIFIED, where it refused before [closed by the supersedes-binding increment, the twenty-eighth
section below, for a predecessor whose profile the instance does not hold: every terminal state
now refuses there; a forged predecessor under a HELD non-signing profile stays open, named there]. A planted or broken genesis entry is the ambiguous case — a
tampered signing chain, or garbage a storage-writing insider put into a never-signed record's
sidecar — and the rule takes the write-nothing side of it; only an entry the instance's own
verifier accepts counts. Stated in `kernel/verify-signatures.ts`, in both guide pages and the
changelog, and pinned.

**A standing difference from SPEC §4, recorded as a finding rather than reconciled.** SPEC §4
says a chain that "fails the signature layer draws its `chain-compromise` evidence edge (§8)
from a drifted instance as from any other", and that an instance that does not hold the
profile "writes nothing into the record". For one case the code now takes the second side: a
same-id signing sibling over a signing record whose GENESIS entry is broken, missing or
unverifiable by that sibling refuses `unknown-profile` and writes nothing, where a holder
draws the edge, so the exception does not reach it. The code is deliberately on the
write-nothing side because a non-holder cannot tell that chain from a never-signed record
carrying garbage in its sidecar; reading the sealed sentence as reaching it would reopen the
add-direction path this increment closes. The sealed text is not edited — a change to it needs
its own sanction.

**Open, and not done here.**

- **[CLOSED by the supersedes-binding increment, the twenty-eighth section below, for the cases
  where the instance does not hold the predecessor's profile: every terminal state now refuses
  `supersedes-unverified` there, and the two pins below were flipped there. NOT closed: a forged
  predecessor under a HELD non-signing profile, which that section names as open.] The `supersedes` fold for every
  predecessor state, now with two named cases.** A terminal
  non-`confirmed` predecessor gets no binding check at `supersedes`, so a forged predecessor
  under an unregistered or non-signing profile still binds, as before. Two cases join it,
  both pinned as the recorded residual: (a) a same-id signing sibling over a signing
  predecessor whose genesis sidecar entry was deleted and whose head is a forged unsigned
  `declined` edge appended by a storage-writing insider with the correct `prevHash` — the
  sibling's claim verifies where a holder's refuses `supersedes-unverified`, and it refused
  before the increment; (b) a forged `declined` chain naming a REGISTERED signing id with a
  non-matching `profileDigest`, which verifies on an instance registering that id. The insider
  gains no capability either way — a forged chain naming an unregistered id already verified
  there, before and after — but the claim that every site refuses was not true and is not
  made. Folding the binding for every predecessor state, and refusing an unheld predecessor,
  reverses a recorded stance (the confirmed-only fold) and narrows recovery, so it needs its
  own argument.
- **Rehoming.** A storage-writing insider rewriting a signing record's genesis onto a
  co-registered non-signing profile with a consistent digest is unchanged; closing it needs an
  obligation anchored outside the chain, which is a design question of its own.
- **`review()`'s findings coverage** still reads the live profile.

**Inversions.** None. The profile-drift gate's design §5 sentence is a claim this increment
makes true, not a stance it reverses. The suite carried no pin of a drifted instance holding a
verifier and refusing `unknown-profile` over a signature-broken signing chain (the drop-direction
pins run without `config.signing`), and the amendment keeps that behavior rather than changing
it; no pin covered the narrowed genesis-broken case. No pinned assertion changed its truth
value — the full suite stayed green with only the new file added — so the numbered sequence
stays at fourteen.

**Gate outputs, as measured on this branch at this commit.** `pnpm` fails on this machine, so
each gate ran through the local binaries its script names. The whole suite — `vitest run` with
the JSON reporter, then `node scripts/ci-assert-tests.mjs` over the report, the `pnpm test:ci`
pair — 1080 tests in 80 files, zero skips (`ci-assert-tests: ok — 1080 tests in 80 files (85
suites): 1080 passed, 0 failed, 0 skipped, 0 todo`), vitest exit 0. Against the 1068 in 79 the
identity-snapshot increment last measured, the difference is twelve tests and one file:
`signing-obligation.test.ts`. Typecheck, both packages — exit 0; `biome check .` and
`biome check --error-on-warnings .` — 152 files, exit 0 each; build, both packages'
`tsconfig.build.json` — exit 0; `contract-scan`, `api-reference-sync` and `docs-index-sync` —
exit 0, no output. **The packed-tarball smoke test was not run on the authoring machine** — the
broken `pnpm` launcher stops `scripts/smoke-pack.mjs` at its adapter pack step — and runs in CI on
the pull request. Nothing in this increment touches either manifest, the build configuration or
`packages/store-postgres`. `CLAUDE.md`'s measured sentence moved to 80 files / 1080 tests.

## Post-build-order increment — Supersedes binding

**The twenty-eighth post-build-order increment, exited (branch `supersedes-binding-2026-11-17`,
stacked on `signing-obligation-2026-11-17` at `8db734d`: the design-and-plan commit, the
code-and-pins commit `ad9b9f5`, and the record commit after it — `git log 8db734d..HEAD`
enumerates them).** No sealed-set edit, no marker move, no new refusal code, and no change to
`index.ts`, either manifest, any store file, `packages/store-postgres`, `verifyPriorLegs` or any
public type. **One inversion — the fifteenth self-authored one**, argued below and at its pin.
The design is `docs/superpowers/specs/2026-11-17-supersedes-binding-design.md` — its §3 argues
why no sanction is needed and none is claimed — and the plan is
`docs/superpowers/plans/2026-11-17-supersedes-binding.md`.

**What it closes.** `verifySupersedes` (`kernel/supersedes.ts`) resolved the predecessor's
profile only for a `confirmed` predecessor, the one state whose terminality depends on the
profile. A `refused`, `expired`, `declined`, `redeemed` or `redemption-failed` predecessor
verified whatever profile its genesis named — an id the instance never registered, or a
registered id whose digest did not match. That is a route past the signature layer: a
storage-writing insider without keys could write a whole forged terminal chain, AL1-intact
because AL1 is not cryptographic, and have `open(…, { supersedes })` bind it as a verified
predecessor in a new record's genesis, where SPEC §14 says a rebuilt chain "fails signature
verification without trusting storage". The signing-obligation increment pinned two shapes of
it as a recorded residual and named this increment as the one that closes them; the original
shape, a forged chain naming an unregistered id, predates both. What this buys a host, with its
limit: a predecessor decided under a profile the instance does not hold no longer binds — and
recovery now needs that profile held (the cost, below). The forgery route closes only where every
profile the instance registers signs. A key-less insider still binds a forged terminal
predecessor on any instance that HOLDS a non-signing profile, by naming it and copying its real
`profileDigest` from any genuine genesis (the AL1 recompute route); since recovery is
any-profile, such a predecessor binds into a signing successor's genesis too. On an AL1-only host
the fold buys "decided under rules this instance holds", not forgery resistance.

**What landed, commit by commit.**

- the design and the plan, with their `docs/superpowers/INDEX.md` row and counts.
- `ad9b9f5` — `verifySupersedes` calls `heldProfile(profiles, record)` (`kernel/held-profile.ts`:
  the id registered AND its projection digesting to the genesis `profileDigest`, the comparison
  `verifyPriorLegs` makes) after the subject check and before the state checks, for every
  terminal state; `undefined` refuses `supersedes-unverified`, pre-record, never-append. The
  `confirmed` branch reuses the held profile for its terminality derivation — no second lookup.
  The checks before it (AL1, the signature layer, the claimed head, the subject) keep their
  order. New pins in `test/supersedes-binding.test.ts`: a forged declined chain naming an
  unregistered id, and one naming a registered id at a non-matching digest, each refuse with
  no record created; every terminal state the fixtures reach verifies for the holder and
  refuses for a same-id instance at a different digest; escalation (both profiles registered)
  verifies; a registry lacking the predecessor's id refuses and re-registering it unchanged
  recovers. The four inverted assertions are named under Inversions.
- the record commit — `kernel/supersedes.ts`'s header and state-check comment were written with
  the code; `kernel/verify-signatures.ts`'s per-site comment now says every terminal state
  refuses; `docs/guide/integrating.md` (the AL2 bullet's per-site outcomes, and one sentence in
  the escalation paragraph: the instance must hold the predecessor's profile, registered under
  its id and unedited), `docs/guide/api-reference.md` (the `signingDeclared` paragraph's
  per-site outcomes), `CHANGELOG.md` (a `Fixed` entry, and the signing-obligation entry's
  residual sentence marked closed in place rather than deleted), the signing-obligation section
  above (its open item and its per-site sentence marked closed in place), this section, and
  `CLAUDE.md`'s measured sentence. The guide changes are prose only; no code sample moved, so
  none needed a re-run.

**What this reads, in the sealed text.** SPEC §4: "the two cross-record verifications (§10.1,
§2) fold the same mismatch on the referenced record into their own claim refusals" — with no
state qualifier, so it admits both readings: every referenced record, or only those whose claim
needs the profile. The profile-drift gate's design drafted that sentence (its site 2 of the sealed-set
touches) and took the narrow reading in its "two cross-record verifications" bullet and its
acceptance list, while its own changelog entry and this record's summary of it state the fold
unqualified. `verifyPriorLegs` folded it for every prior leg; `verifySupersedes` folded it for
`confirmed` only. This increment resolves that inconsistency toward the public statement, and needs
no sanction because the sealed words admit that reading — not because the code diverged from sealed
text. OPEN-QUESTIONS §1's posture that a missing signature in a signing scope refuses the claim at
the cross-record verifications now reaches a predecessor the instance does not hold. SPEC §2's
recovery paragraph ("verified by replay … requires it intact and terminal") says nothing the fold
contradicts.

**Inversions.** One — the **fifteenth** self-authored inversion in this document's numbered
sequence: the confirmed-only fold at `supersedes`. Where it was recorded: the profile-drift
gate design's "two cross-record verifications" bullet
(`docs/superpowers/specs/2026-09-03-profile-drift-gate-design.md`) ruled that a predecessor in
a state terminal regardless of profile is unaffected — its profile not consulted then, not
consulted after; the 2026-09-05 external-review triage
(`docs/analysis/2026-09-05-external-code-review.md` §5.2) defended the asymmetry against a
reviewer who called it unmotivated; and the pin was `test/profile-drift-gate.test.ts`'s
supersedes test, whose declined half asserted `ok`. The argument for reversing it: that ruling
was argued from terminality, and it is right about terminality — only `confirmed` needs the
profile to prove it. It does not reach the question SPEC §4 asks, which is whether the instance
holds the rules the referenced record was decided under and, since AL2, whether it can hold the
predecessor to its signature obligation at all; the triage did not consider the signature layer,
which is where the asymmetry turned into a forged binding. The inversion is of that design's own
ruling and acceptance pin, which read the sentence narrowly and which its public statements
contradicted; it is not a correction of code to sealed text. The pin's site:
`test/profile-drift-gate.test.ts`, the test now titled "recovery (supersedes): a confirmed and a
declined predecessor whose profile the sibling does not hold both refuse supersedes-unverified;
the holder recovers the declined one" — the declined half flipped from `ok` to
`supersedes-unverified`, argued in a comment at the site, with the holder's recovery of the same
record asserted beside it. Three further pins in `test/signing-obligation.test.ts` (the
add-signing supersedes-over-declined half and the two supersedes tests that recorded the
residual) flipped too; they pinned the residual this increment closes, on an unmerged stacked
branch, and are not a further inversion, so the sequence stands at fifteen. Exactly those four
assertions changed truth value; measured before the design was written by applying the check
and running the suite, the same four failed and every other test passed.

**The cost, named.** Recovery now needs the predecessor's profile held. A host that edited a
profile in place, or retired an id, must restore the profile's declarative fields exactly or
re-register the prior version under its id to supersede its records — SPEC §4's version
discipline, the same one every operator seam already demands. A record whose profile is gone
can no longer be recovered by `supersedes`. What is lost is the verified `supersedes` link, not the
subject: a terminal predecessor releases exclusivity, and a plain `open` still works.

**Open, and not done here.**

- **Rehoming.** An insider rewriting a predecessor's genesis consistently onto a profile the
  instance holds and that does not sign still verifies at AL1; closing it needs an obligation
  anchored outside the chain (an instance-level policy), a design question of its own.
- **A forged predecessor under a held non-signing profile** — the AL1 recompute route, inherent
  to AL1; SPEC §14 names closing "the recompute residual" as AL2's job, for signing profiles. A
  key-less insider names the held profile and copies its real digest from any genuine genesis, and
  since recovery is any-profile the forged predecessor binds into a signing successor's genesis
  too. This increment's fold narrows the route to instances holding such a profile; it does not
  close it.
- **`review()`'s findings coverage** still reads the live profile.

**Gate outputs, as measured on this branch at the record commit's tree.** `pnpm` fails on this
machine, so each gate ran through the local binaries its script names. The whole suite —
`vitest run` with the JSON reporter, then `node scripts/ci-assert-tests.mjs` over the report —
`ci-assert-tests: ok — 1090 tests in 81 files (86 suites): 1090 passed, 0 failed, 0 skipped, 0
todo`, vitest exit 0. Against the 1080 in 80 the signing-obligation increment measured, the
difference is ten tests and one file: `supersedes-binding.test.ts`. Typecheck, both packages —
exit 0; `biome check .` and `biome check --error-on-warnings .` — 153 files, exit 0 each; build,
both packages' `tsconfig.build.json` — exit 0; `contract-scan`, `api-reference-sync` and
`docs-index-sync` — exit 0, no output. **The packed-tarball smoke test was not run on the
authoring machine** — the broken `pnpm` launcher stops `scripts/smoke-pack.mjs` at its adapter
pack step — and runs in CI on the pull request. Nothing in this increment touches either
manifest, the build configuration or `packages/store-postgres`; the byte-stability digests did
not move. `CLAUDE.md`'s measured sentence moved to 81 files / 1090 tests.

## Post-build-order increment — Compliance statement

**The twenty-ninth post-build-order increment, exited (branch `compliance-statement-2026-11-17`,
stacked on `supersedes-binding-2026-11-17`; one commit).** Documentation and one test file
only: no sealed-set edit, no marker move, no source change, no public-surface change. The design
is `docs/superpowers/specs/2026-11-17-compliance-statement-design.md` and the plan
`docs/superpowers/plans/2026-11-17-compliance-statement.md`; executed inline by the authoring
session, then reviewed.

**What it closes.** SCOPING-GUIDE §6 requires every user-facing document to say that adopting
the library makes no host compliant with anything. Only the root README said so in those words.
The package README, which becomes the registry page at the 0.1 cut, listed three "does not
promise" bullets and omitted this one; the store-postgres README, `docs/README.md` and four of
the five guide pages had no statement, and the FAQ answered the question without the sentence.

**What landed.** The package README gains the root README's "It is not compliance." bullet
verbatim; every other user-facing page gains one intro sentence linking the FAQ; the FAQ's
answer gains the sentence. `scripts/test/compliance-statement.test.mjs` (ten tests in the
`record` vitest project) checks the phrase "makes no host compliant", whitespace-collapsed, on
the root README, both package READMEs, `docs/README.md` and every `docs/guide/*.md` — the
guide set enumerated from the directory, so a new page is held to the rule on arrival — with a
guard against an empty enumeration. Red before the edits (eight of ten failed), green after.

**The bound.** The pin checks presence, never absence of a compliance reading elsewhere on a
page. `docs/concept/` (which states the rule) and `docs/process/` (not user-facing) are outside
its set; so are `CONTRIBUTING.md`, `SECURITY.md` and `CODE_OF_CONDUCT.md`, which describe the
project's process, not the library.

**Inversions.** None.

**Gates, measured on the authoring machine.** `ci-assert-tests: ok — 1100 tests in 82 files (87
suites): 1100 passed, 0 failed, 0 skipped, 0 todo`; typecheck, biome (`--error-on-warnings`),
build, `contract-scan`, `api-reference-sync` and `docs-index-sync` all exit 0. `smoke` runs in
CI. `CLAUDE.md`'s measured sentence moved to 82 files / 1100 tests.

## Post-build-order increment — Release hardening

**The thirtieth post-build-order increment, exited (branch `release-hardening-2026-11-17`,
stacked on `compliance-statement-2026-11-17`).** The release surface only: `release.yml`,
`first-use.yml`, CODEOWNERS, dependabot, a new guard script and its tests, the release
checklist. No sealed-set edit, no library source change, no public-surface change. The design
is `docs/superpowers/specs/2026-11-17-release-hardening-design.md` and the plan
`docs/superpowers/plans/2026-11-17-release-hardening.md`; executed inline by the authoring
session, then reviewed.

**What it closes.** The release guard checked two things — `private` and `0.0.0` — while the
workflow header promised it refused a release that skipped any release-day step, the tag
included: a dispatch from `main`, from a branch, or from a tag that did not name the version
would have published, and so would two packages at different versions. One job held
`id-token: write` from its first step and received `NPM_TOKEN` at its last, after
`pnpm install`, the whole dev toolchain, the suite and the smoke test's script-enabled registry
installs had run in it. `first-use.yml` wrote its free-text `version` input, and `source`,
straight into a shell `run:` block. The header named the wrong peer range (`workspace:*` for
`workspace:^`), the wrong token type (an automation token, which can no longer be created) and
said the dry run skips the guard (it runs and reports); the release checklist repeated the peer
range. CODEOWNERS left the workflows, the gate scripts and itself unowned; dependabot proposed a
release the day it was published.

**What landed.** `scripts/release-guard.mjs` exports `guardFindings({ packages, refType,
refName })` — every reason to refuse at once: private, `0.0.0`, versions out of lockstep, a
non-tag ref (an absent ref included), a tag that is not `v<version>` — and a CLI that reads the
two manifests and the ref from `REF_TYPE`/`REF_NAME`. Eight unit tests
(`scripts/test/release-guard.test.mjs`), red (no module) before the script, green after.
`release.yml` became two jobs (four after the review's fix wave, below): `build` (read-only
contents, no secret) installs, runs the guard
(reporting without blocking in a dry run) and every gate in the old order, packs both tarballs
with `pnpm pack --pack-destination` and uploads them (`if-no-files-found: error`); `publish`
(needs `build`; runs only outside a dry run and from a tag ref; `environment: release`; the
only `id-token: write`) sets up Node with no cache, downloads the artifact, and publishes record
first, then the adapter — no checkout, no install. Every action stays SHA-pinned, the artifact
actions reusing `first-use.yml`'s pins. `first-use.yml` passes `source` and `version` through
`env:` and refuses a version that is not semver. CODEOWNERS adds `/.github/` and `/scripts/`;
both dependabot ecosystems gain a seven-day `cooldown`. The release checklist names the two
owner settings (the `release` environment with a `v*` tag rule; the token moved into it),
describes the dry run and the dispatch over two jobs from the tag, and says `workspace:^`.
`CLAUDE.md`'s description of the workflow, dependabot and CODEOWNERS moved with it.

**The workflow test.** `scripts/test/workflows.test.mjs`'s release test pinned the single-job
shape. It is rewritten to pin the same guarantees over two jobs — the boolean `dry_run` input,
the guard reporting without blocking only in a dry run, nothing published in a dry run, every
gate in order before any publish — and three tests are added: only the publish job holds
credentials and it runs no toolchain (the read-only default, the publish job's permissions and
environment, its two actions, no cache, publish commands over the downloaded tarballs, the
artifact name shared by upload and download); the guard step runs the script with the ref
through `env:`; no `first-use.yml` `run:` block interpolates an input (red against the old
file, green against the new). The old guarantees keep their truth value; only their encoding
moved. Not an inversion. (The fix wave below re-shapes these tests over four jobs.)

**The review's fix wave.** One review of `af824c7` found a critical regression, two important
gaps and several minors, all answered in one fix wave; the design's §7 records each against the
ruling it amends. The regression: the split publish job wrote its argument as
`release-tarballs/vidimera-record-*.tgz`, which npm reads as a GitHub `owner/repo` spec, not a
file — npm 10.9's own argument parser, run locally, returns a github `git` spec for
`release-tarballs/<name>.tgz` and a `file` spec for `./release-tarballs/<name>.tgz`. The old
single job's `./*.tgz` was right. Every publish command now starts
`npm publish ./release-tarballs/`, the first carrying a comment that the `./` is load-bearing.
The real publish is two jobs, `publish-record` (needs `build`) then `publish-store-postgres`
(needs `publish-record`), each alone holding `id-token: write` and the token in the `release`
environment behind the same tag/dry-run `if:`, so a failure at the adapter re-runs without
re-publishing record. A dry run now also runs `publish-dry-run` (needs `build`; no environment,
no permission beyond the read-only default, no secret, Node set up with no registry so no auth
line is written): the real publish commands without `--provenance` — which needs the OIDC token
the job lacks — and with `--dry-run`, record first. Run locally on npm 10.9 against a dummy
scoped tarball, with an empty user config and an unreachable registry, that command form reads
the tarball, warns that it is not logged in, and exits 0, a `private: true` manifest
notwithstanding; the runner's npm was not exercised. `first-use.yml`'s semver check is bash's
`[[ =~ ]]` over the whole value under an explicit `shell: bash`: the line-by-line grep it
replaces passed a multi-line value whose first line was semver (measured locally, on the step's
own extracted script). The release checklist, `CLAUDE.md`, both dependabot comments and the
guard script's header moved with it: the guard's own description, CODEOWNERS' coverage and its
sole-owner limit, the token's location and the bypass-2FA option, the deployment rule's **Tag**
type and what it does not limit, the local dry run's `./` form, and the cooldown's
security-update limit.

**The workflow test, after the fix wave.** `scripts/test/workflows.test.mjs` pins: exactly four
jobs; every `npm publish` line in any job as a `./` path (structure-independent, so it reads the
same against any shape of the file); each real publish job's command as an exact literal with
the token in its env; only the two real publish jobs holding `id-token: write` or any `secrets.`
reference, both in `release`, both behind the tag/dry-run `if:`, chained `build` →
`publish-record` → `publish-store-postgres`; the dry-run job's commands derived from the real
jobs' own (so the two cannot drift), with no environment, no permissions, no secret and no
registry; every downloading job fetching the build job's artifact into `release-tarballs`; and
the first-use interpolation check now also seeing `github.event.inputs.`, with fixtures for both
spellings. Red before green: against `af824c7`'s `release.yml` six release tests fail, the `./`
pin on exactly `npm publish release-tarballs/vidimera-record-*.tgz --provenance --access
public`; with the new four-job file and only record's `./` dropped, three fail on that literal
(the `./` pin, the exact-command pin, and the dry-run derivation). Green after: 14 tests in the
file, up from 9.

**The bound.** Nothing here has executed on GitHub: the YAML is parsed and its facts asserted.
GitHub parses the file on push (the earlier single-job shape's parser failure surfaced that
way); the dry-run dispatch the release checklist already requires is the first run of the
build job in full (`pnpm pack --pack-destination` on the runner
included), of the artifact upload and download, and of the exact publish commands under
`--dry-run` (argument parsing, tarball read). It never runs the real publish jobs, so the
`release` environment's behavior, the OIDC token and provenance from a downloaded tarball,
`NPM_TOKEN` and the real publish are first run by the release dispatch itself. Whether a re-run
attempt can download the artifact the first attempt uploaded — what makes a failed adapter
publish resumable — was not verified. The split's limit: the published bytes are produced in
`build`, which runs `pnpm install`, the suite and the smoke test, whose scratch install fetches
registry dependencies fresh, with install scripts, outside the lockfile and the dependabot
cooldown; code running there can alter what `pnpm pack` packs, and the publish jobs then publish
it with valid provenance. The split keeps the publish credentials away from the toolchain, not
the toolchain away from the bytes. Until the owner creates the `release` environment's `v*` tag
rule and moves the token, the environment is created on first use with no rule and the publish
jobs read the repository secret — the guard and the split still hold.

**Open.** pnpm's `minimumReleaseAge` (it changes resolution, which the authoring machine's
broken `pnpm` cannot exercise); a digest pin for `first-use.yml`'s `postgres:18` service image
(a dispatch-only release act, not a per-push gate; the digest could not be looked up and
verified here); and npm trusted publishing, which would remove `NPM_TOKEN` in favour of a
publisher keyed to this workflow and the `release` environment, but needs npm 11.5.1 or later,
newer than Node 22's bundled npm 10.9 — a later change, after 0.1.0 exists.

**Inversions.** None.

**Gates, measured on the authoring machine.** At the increment's commit: `ci-assert-tests: ok —
1111 tests in 83 files (88 suites): 1111 passed, 0 failed, 0 skipped, 0 todo`. After the fix
wave: `ci-assert-tests: ok — 1116 tests in 83 files (88 suites): 1116 passed, 0 failed, 0
skipped, 0 todo` (the five new workflow tests); typecheck (both packages), biome
(`--error-on-warnings`, 156 files checked — the header's earlier 153 was already stale at the
increment's commit, which this wave adds no file to), both builds, `contract-scan`,
`api-reference-sync` and `docs-index-sync` all exit 0. `smoke` runs in CI, as do the workflows
themselves. `CLAUDE.md`'s measured sentence moved to 83 files / 1116 tests.

## Post-build-order increment — Verifier faults

**The thirty-first post-build-order increment, exited (branch `verifier-faults-2026-11-17`, off
`main` at `eedcd3a`).** Behavior in the signature layer and the signing decorator, plus a shape
check in `create()`. No sealed-set edit, no marker move, no new refusal code, no change to
`index.ts`, either manifest or any public type; the byte-stability digests did not move. The
design is `docs/superpowers/specs/2026-11-17-verifier-faults-design.md` and the plan
`docs/superpowers/plans/2026-11-17-verifier-faults.md`; the sanction question it answers is call 1
of `docs/analysis/2026-11-17-sanction-calls.md`, which needed none.

**What it closes.** `layerVerdicts` wrapped each verifier call in a `catch` that read a throw or
a rejection as `verified: false`. On a signing record every un-enlisted seam then appended a
terminal `refused { code: 'chain-compromise' }` after a verifier outage, to a record nobody had
touched, and once the outage ended every transition verified, the compromise edge included. A
rejecting `listByRecord`, a fault of the same kind one hook over, already propagated and appended
nothing. Separately, `signOne` stored whatever `{ keyRef, signature }` the signer returned: a
`keyRef` missing from `verifiers`, a signer whose key differed from its registered verifier, or a
buggy signer opened records the same instance then read as compromised at its next seam call.
`create()` checked only that `config.signing` was present, so `signing: null`, a `Map` for
`verifiers` or a sidecar without `put` constructed and failed later. And the guide gave the
retired-key half of rotation and left out the new-key half.

**What landed, per commit.**

- `4564e75` — `layerVerdicts` records a verifier fault beside each verdict instead of reading it
  as `false`. `signatureLayerHolds` rethrows only where the obligation applies, or, on an
  instance that does not hold the record's profile, where the live same-id profile declares
  `signing` and the genesis verification faulted (the obligation cannot be computed); it returns
  `true` without rethrowing where the obligation is false. `verifySignatures` always rethrows the
  first fault in chain order, after the chain is bound to its id and the sidecar listed. The
  thrown `Error` names the record, the `seq` and the `keyRef` and carries the verifier's error as
  `cause`. A non-`true` answer and an unresolvable `keyRef` stay `verified: false`. New pins in
  `packages/record/test/verifier-faults.test.ts`: a throwing and a rejecting verifier at each of
  the eight un-enlisted seams (the call rejects with the cause, chain and sidecar unchanged, the
  same call succeeds once the verifier recovers), the enlisted seam, both cross-record
  verifications, the read, the no-overreach case and the non-holder branch both ways. The two
  verifier-registry "boundary" tests were retitled to say what they assert.
- `a24e8b5` and `c8c146b` — the mint check in `signing/decorate.ts`: the memoized per-transition
  promise became "mint, then verify". The minted `keyRef` must be an own key of `verifiers` and
  that verifier must answer the literal `true` over the same bytes, or the instance throws with
  nothing put to the sidecar and nothing appended; this includes a seam that would have drawn a
  `chain-compromise` edge. A verifier fault during the check propagates with `cause`; any failure
  drops the memo entry, so a repaired configuration mints anew, and a success is not repeated
  per compare-and-swap candidate. `create()` gained `validateSigningShape`: `config.signing` an
  object, `signer` a function, `verifiers` a plain object of functions (an empty registry is
  allowed), `signatures.put` and `listByRecord` functions, each with a named `create:` error.
  The `Verifier` and `SigningConfig` JSDoc in `signing/store.ts` state the contract and the
  two-phase rotation. New pins in `packages/record/test/signing-config.test.ts` cover the mint
  check, the memo drop, each malformed shape and the rotation (a two-phase rollout leaves every
  record healthy across instances; the one-phase hazard is pinned as the documented behavior).
  The second commit pinned the memo drop and the no-sidecar-put assertions the first review
  found missing.
- `bfd06fe` — this increment's docs commit: the guide's Verifier paragraph rewritten (the three
  outcomes, the fault posture, the mint check, two-phase rotation, the stuck-record limit), its
  `create()` paragraph and the integrating guide's AL2 bullets moved with it; the public JSDoc
  for `verifySignatures` in `operator-surface.ts` no longer says it throws only on the
  caller-error class; two comments corrected in `kernel/verify-signatures.ts` and
  `test/verifier-registry.test.ts`; `CHANGELOG.md`; `docs/process/next-phases.md`'s `unavailable`
  entry marked built; `CLAUDE.md`'s counts.
- `e41000e` and the docs commit that follows it — the fix wave after the whole-branch review:
  the code and its pins, then the guide, this record, the design's §8, the CHANGELOG and
  deferral-register row 22's note. See "Amended after the whole-branch review" below.

**Amended after the whole-branch review.** The review approved the core — no verifier fault can
let a seam decide or append — and found four Important gaps; the design gained §8 recording the
amendments, which bind over its 5.2 order and add to 5.1 and 5.5. One line per finding:

- *A fault outranked a definite miss* (OPEN-QUESTIONS §1's posture held only in the unmixed
  case): `signatureLayerHolds` now returns `false` when any transition is definitely unverified
  — no entry, a non-string field, an unresolvable `keyRef`, a non-`true` answer — and rethrows
  the first fault only when none is; the non-holder genesis-fault rethrow is unchanged.
- *Untyped sidecar fields reached the host verifier* (a planted `null` signature made a
  sample-shaped verifier throw, turning tampering into a fault; an object `keyRef` threw a raw
  `TypeError` from `Object.hasOwn`): a non-string `keyRef` or `signature` is now a definite miss
  and the verifier is never called with it.
- *The mint check added a batch orphan producer* (a check failure on a batch's last element left
  an entry for each element before it, on every attempt): `appendBatch` now mints and checks
  every element before it puts any, still signing before the append.
- *The fault message overclaimed and the stuck-record limit was stated too narrowly*: the
  message no longer says the fault "is not a verification failure"; it says a transient outage
  clears on retry and a fault that persists while the verifier is otherwise healthy means the
  named entry may be malformed or planted. The guide, the JSDoc and this record state the limit
  at its true width (the bound below).
- Minors fixed in the same commit: `create()` checks every own string key of `verifiers`,
  enumerable or not (the layer's `Object.hasOwn` finds a non-enumerable key); the integrating
  guide's construction bullet has its continuation paragraph back; the guide's `create()`
  paragraph names class instances as refused and null-prototype objects and module namespaces
  as accepted; the mint check's availability coupling is stated (below); the key-retirement
  baseline's comment says the signer moved to a new key too, and deferral-register row 22
  gained a dated note; the `verifier-registry.test.ts` header says which inherited-member pins
  the own-key guard alone now carries, measured by deleting it (the four throwing members' pins
  go red, `toString` and `constructor` stay green behind the literal-`true` comparison); three
  over-width comments wrapped.

New pins, each observed red before its code change where it pins a change: a definite miss
beside a faulting verifier at `finalize` (either chain order) and at `seal`, with the fault
alone still throwing; a planted `null` signature and an object `keyRef`, the verifier never
called; a finalize batch failing its check on the last element, and one whose signer throws on
the middle element, writing nothing on any of three attempts; a non-enumerable non-function
verifier refused at `create()`. Pins of behavior that already held (each shown to bite by a
mutation, recorded in `.superpowers/sdd/2026-11-17-verifier-faults/fix-wave-report.md`): a
non-holder whose genesis is missing, fails or
names an unknown key refuses `unknown-profile` while a later transition faults; a hash-broken
signing chain throws while the instance's own verifier faults and draws the edge once it
recovers; the mint check runs once per transition across the compromise walk's three
candidates. One existing test gained an assertion, as the review asked: the non-holder test's
non-signing sibling is shown to consult the verifier. No other existing assertion moved.

**Inversions.** The SIXTEENTH self-authored inversion — this build reversing its own recorded
stance, not an inherited pinned assertion. The stance, "a throwing verifier is fail-closed
reporting," was recorded in `kernel/verify-signatures.ts`'s header and in `layerVerdicts`'s
comment, and in the guide's sentence that an unlisted answer refuses at every enforcement site
"exactly as a throwing verifier does." The argument, made at its site in
`kernel/verify-signatures.ts`: `false` is the verifier answering that the bytes and signature do
not match; a throw is the verifier saying it could not answer at all, and recording "could not
answer" as a terminal tampering edge is the one outcome no host can undo. The posture already
taken for a rejecting `listByRecord` is the precedent. No assertion anywhere pinned the old
posture — no test supplied a throwing verifier, as this document's coverage-increment section
already recorded — so none flipped; deleting the old `catch` kept every test green, which is the
gap the new pins close.

**Existing fixtures that moved (nine), and re-encoded counts (five).** The mint check refuses
what the old fixtures did on purpose: nine existing tests minted with a key their own instance
could not verify. Each assertion keeps its truth value; only the setup moved, so the state each
test is about is produced another way. `no-edge-containment.test.ts`'s key-retirement baseline
signed with a `keyRef` its registry lacked; now a second instance signs with a new key and
holds only that key's verifier, and its numbers (chain flat, one orphan per refusing call, four
calls) are unchanged, with a new pin showing the old shape now throws at the mint with no
orphan. `signing-enforce.test.ts`'s hash-broken-chain order test shared a key between the
sibling and the counted verifier; the sibling now signs with its own key, the counted verifier
stays under `key-1`, and `calls() === 0` is unchanged. `verifier-registry.test.ts`'s truthy
non-boolean test opened its record with the truthy verifier; a correct instance opens it and a
second instance over the same store answers truthy-string for the old key, with the
report-unverified and `chain-compromise` assertions unchanged. Two `chain-binding.test.ts`
foreign-genesis tests had `verifiers: {}`; they now hold a real verifier for their key. Four
`signing.test.ts` tests (the memo bound, LRU, no re-insert eviction, and the empty-chain case)
had `verifiers: {}` against a stub signer; they now register a verifier consistent with it. Five
"the AL2 disjunct ran" counts in `signing-enforce.test.ts` (decline, decline on a non-declaring
leg, acknowledge, begin and complete redemption) counted all calls to a verifier the mint check
now also calls over the new edge, so they passed on the check's own call; the enforcement rig now
records the bytes it was asked about and `callsOver(chain)` counts only calls over the chain as it
stood before the seam call, which only the layer makes. The per-fixture account is
`.superpowers/sdd/2026-11-17-verifier-faults/task-2-report.md`.

**The bound.** What still fails closed: a missing entry, a sidecar `keyRef` or `signature` that
is not a string, a `false` or other non-`true` answer, and a `keyRef` that is not an own key of
`verifiers` still read `verified: false` and still draw `chain-compromise` where the layer
applies — on any transition, even while another transition's verifier faults, unless the
faulting verifier is the one the instance signs under, whose outage delays the edge's own mint
check until it recovers (the availability coupling below). What does not
change: a record the layer does not apply to is unaffected at every seam by a junk entry whose
verifier throws, though `verifySignatures` on that record throws. The stuck-record limit, at its
true width: on an instance that holds the record's profile, a seam persistently throws instead
of drawing the edge only when no transition is a definite miss and some entry is a string the verifier cannot
answer for — a malformed or planted signature string that makes the host's verifier throw — and
the record stays so until the entry is repaired; on an instance that does not hold it, a genesis
fault throws as well, since the obligation rests on that answer. The guide asks a verifier to
answer `false` for any signature it cannot parse, and `verifySignatures` names the `seq` and
`keyRef` that locate the entry. The availability coupling the mint check adds: every signed
append, `open()` included, needs the instance's own verifier answering, so an outage of it makes
those seams throw and defers even a hash-break (AL1) `chain-compromise` edge, which never
consults the layer, until the verifier recovers (pinned). The mint check proves this instance's
own verifier accepts its own signature, not that any other instance holds that verifier: a
one-phase rotation still has an old instance read the new key's entries as unverified and refuse
`chain-compromise`, which is pinned as the decided behavior and documented, not fixed. Rotation
tooling stays the host's (SPEC §14). Routing verifier unavailability to SPEC §8's availability
class was declined by the sanction call.
**Open, named:** `config.store`'s shape is not checked at `create()` — the same class of late
failure, one hook over. And no probe in `ALL_PROBES` plants a wrong-length signature and expects
`chain-compromise`: such a probe would catch, in a host's own deployment, a verifier that throws
on malformed input — the one shape that turns tampering into a stuck record — and none is built.

**Gates, measured on the authoring machine after the fix wave.** `ci-assert-tests: ok — 1161
tests in 85 files (90 suites): 1161 passed, 0 failed, 0 skipped, 0 todo`; typecheck (both
packages), biome (`--error-on-warnings`, 158 files checked, no findings), both builds,
`contract-scan`, `api-reference-sync` and `docs-index-sync` all exit 0. `smoke` cannot run here
and runs in CI. `CLAUDE.md`'s measured sentence moved to 85 files / 1161 tests. (At the docs
commit, before the fix wave: 1152 tests in 85 files.)

## Post-build-order increment — AL2 restatement (three sanctioned sealed-set commits)

**The thirty-second post-build-order increment (branch `al2-restatement-2026-11-19`, off `main`
at `a877fed`).** Three sealed-set commits under two grants, no maturity marker moved, no scope
changed, no behavior changed: call 3.1 of `docs/analysis/2026-11-17-sanction-calls.md` (the
first of that call's two sealed-set commits, corrective), then the owner's grant of 2026-11-19
for the sentences outside call 3, in two commits — the second completes one sentence after the
re-review. One site of the owner's grant is in CONCEPT.md's honesty discipline, which by the
repository's rule makes that change a fork of the concept; it is called out as one below. The
design is `docs/superpowers/specs/2026-11-19-al2-restatement-design.md` (§6 call 3.1's sites,
§10 the review, §11 the owner's grant, §12 the re-review) and the plan
`docs/superpowers/plans/2026-11-19-al2-restatement.md`. They join the lineage beside the
profile-drift gate as sanctioned sealed-set commits with no marker move.

**What it corrects.** The sealed set stated AL2's closure of the recompute residual and the
head-edit windows without the conditions the build depends on. Three conditions hold it up:
(i) every registered profile signs — the layer applies through the profile a record's genesis
names, so a genesis rewritten onto a co-registered non-signing profile, carrying that profile's
digest (computable with the exported `profileDigest`), leaves the layer, and version discipline
leaves exactly such an unsigned twin registered while signing is enabled for an existing flow;
(ii) the key sits outside the insider's boundary; (iii) no signature outlives an uncommitted
append — the decorator writes a transition's sidecar entry before it delegates the append, so a
rolled-back or lost append leaves a valid signature over a transition that never committed,
which a key-less insider can splice in where it was signed for. Before this increment the sealed
set stated (ii) only — explicitly in CONTROLS' AL2 row and CONCEPT.md's honesty discipline, in
substance in ASSURANCE §6's AL2 and AL3 rows and SPEC §14's closing paragraph — and CONTROLS'
profile-binding row and OPEN-QUESTIONS §1 offered AL2 key custody as closing the recompute route
on its own, which (i) refutes.

**What landed, per commit.**

- `04b501b` — the design and the plan, with the INDEX row and counts.
- `0b408d4` — `packages/record/test/al2-conditions.test.ts`, pins of present behavior over a
  SQLite backing with the insider writing straight to the tables. Condition (i): a forged decider
  on a relinked signing chain refuses `chain-compromise` at `seal`; the same forgery rehomed onto
  a co-registered non-signing profile reads `signingDeclared: false` and `seal` retires it; an
  instance registering only the signing profile refuses the rehomed record `unknown-profile` and
  appends nothing. Condition (iii): an enlisted `redeem` the host rolls back leaves its signature
  among `verifySignatures(...).orphans`; the never-committed `redeemed` transition spliced back
  in verifies, replays `redeemed` and seals; the same transition fabricated onto another record is
  unsigned and refuses `chain-compromise`.
- `5a8ab21` — **call 3.1's sealed-set commit**, `docs/concept/` only (SPEC, CONTROLS, ASSURANCE,
  OPEN-QUESTIONS; 27 lines in, 9 out): sites 1–8 below.
- `b7e6480` — the guide and the first draft of this record.
- `3eb1413` — the fix wave after the whole-branch review (below), the design's §10 and §11, and
  a third pin: the absence residual.
- `3032ef2` — **the owner's-grant sealed-set commit**, `docs/concept/` only (SPEC, ARCHITECTURE,
  OPEN-QUESTIONS, SCOPING-GUIDE, CONCEPT; 20 lines in, 11 out): sites 9–18 below.
- `f1d854d` — this section's second draft, the "Measured" line, `CHANGELOG.md`, `CLAUDE.md`,
  and a line-break-only resync of the design's site texts with the files.
- `0f4f997` — a fourth pin, after the re-review: the lost compare-and-swap half of condition
  (iii), made deterministic by a store wrapper that holds the first batch until the second
  arrives.
- `df12561` — **the owner's grant, completed**, `docs/concept/` only (SCOPING-GUIDE; 3 lines
  in, 2 out): site 17b below.
- The records commit after it: the re-review's corrections to this section, the design's §11 and
  §12, `CHANGELOG.md` and `CLAUDE.md`.

**The sealed-history account: call 3.1's commit `5a8ab21`, verbatim.** Checked mechanically
before the commit: every "after" text present and every "before" text absent, whitespace
collapsed, and the design's §6 blockquotes equal to these.

1. **SPEC §13A, the closing sentence on AL2** (`docs/concept/SPEC.md`).

   Before:

   > The first two residuals close at AL2; detached signing (AL2, §14) is the
   > upgrade for those, stated with the absence caveat.

   After:

   > The first two residuals close at AL2 under the three conditions §14
   > states — every profile the instance registers signs, the key sits outside the insider's
   > boundary, and no signature outlives an uncommitted append, which this build's
   > sign-before-append order does not yet meet; detached signing (AL2, §14) is the upgrade for
   > those, stated with the absence caveat and those conditions.

2. **SPEC §14, the AL2 bullet** (`docs/concept/SPEC.md`).

   Before:

   > it closes the
   > recompute residual and the genesis-head blind windows (§13A, §10.1, §10.3), because a
   > rebuilt or head-edited chain fails signature verification without trusting storage. Signing

   After:

   > it closes the
   > recompute residual and the genesis-head blind windows (§13A, §10.1, §10.3), because a
   > rebuilt or head-edited chain fails signature verification without trusting storage — under
   > three conditions, each a limit of the closure. (i) **Every profile the instance registers
   > signs:** the layer applies to a record through the profile its genesis names, so a
   > storage-writing insider who rewrites a signing record's genesis onto a co-registered
   > non-signing profile, carrying that profile's genuine digest, takes the record out of the
   > layer — and version discipline (§9.1) leaves exactly such an unsigned twin registered while
   > signing is enabled for an existing flow. (ii) **The key sits outside the insider's
   > boundary:** a key holder signs whatever chain it writes. (iii) **No signature outlives an
   > uncommitted append:** this build signs a transition before it appends it, outside the
   > append's atomic unit, so an append that is rolled back or loses its compare-and-swap leaves
   > a valid signature over a transition that never committed, which a key-less insider can
   > splice in where it was signed for. Signing

3. **CONTROLS §2, the Profile binding row** (`docs/concept/CONTROLS.md`).

   Before:

   > a rewritten genesis carrying a consistent digest (the recompute route) passes at AL1 — AL2 or signing-only registration closes it;

   After:

   > a rewritten genesis carrying a consistent digest (the recompute route) passes at AL1 — only signing-only registration under AL2, with the key outside the insider boundary, closes it: AL2 alone leaves a genesis rewritten onto a co-registered non-signing profile outside the signature layer (SPEC §14);

4. **CONTROLS §3, the Effect-result notarization row** (`docs/concept/CONTROLS.md`).

   Before:

   > AL2 signing closes the window early |

   After:

   > AL2 signing closes the window early, under SPEC §14's conditions — a redemption the host rolls back leaves a valid signature over a `redeemed` transition that never committed (condition (iii)) |

5. **CONTROLS §3, the AL2 detached signing row** (`docs/concept/CONTROLS.md`).

   Before:

   > Closes the recompute + head-edit residuals **when the key is outside the insider boundary** |

   After:

   > Closes the recompute + head-edit residuals **when the key is outside the insider boundary, every registered profile signs, and no signature outlives an uncommitted append** (SPEC §14) — this build signs before it appends, so the last does not yet hold |

6. **ASSURANCE §2, the sentence closing both blind windows** (`docs/concept/ASSURANCE.md`).

   Before:

   > Both are honestly documented at AL1, and both are closed by the same upgrade: a signed
   > genesis fails verification when its payload is edited, head or not.

   After:

   > Both are honestly documented at AL1, and both are closed by the same upgrade: a signed
   > genesis fails verification when its payload is edited, head or not — while every profile
   > the instance registers signs and the key sits outside the insider's boundary (`SPEC.md`
   > §14).

7. **ASSURANCE §6, the AL2 row's "Closes" cell** (`docs/concept/ASSURANCE.md`).

   Before:

   > the recompute residual; both §2 blind windows; admits authority timestamps (freshness becomes meaningful)

   After:

   > the recompute residual and both §2 blind windows, under `SPEC.md` §14's conditions — every registered profile signs, the key sits outside the insider's boundary, and no signature outlives an uncommitted append (this build's sign-before-append order does not yet meet the last); admits authority timestamps (freshness becomes meaningful)

8. **OPEN-QUESTIONS §1, the amended Granularity paragraph** (`docs/concept/OPEN-QUESTIONS.md`).

   Before:

   > what remains is the
   > recompute route, a rewritten genesis carrying a consistent digest, which only signing-only
   > registration or AL2 key custody closes.

   After:

   > what remains is the
   > recompute route, a rewritten genesis carrying a consistent digest, which only signing-only
   > registration with the AL2 key outside the insider's boundary closes — key custody alone
   > leaves a genesis rewritten onto a co-registered non-signing profile outside the signature
   > layer (SPEC §14's first condition).

**The sealed-history account: the owner's-grant commit `3032ef2`, verbatim.** The owner granted
conditioning the sentences found outside call 3 ("granted, condition the six too"). The list
the owner read named seven; the whole-branch review then found SPEC §5's three of the same
class. The grant is read as covering the inventory it was given as — every sentence outside call
3's named ones that states AL2's closure without its conditions — so all ten are conditioned
here, and the owner can revoke any of them. SPEC §10.1 and §10.3, about a genesis payload
window alone, state conditions (i) and (ii); every other site names all three, because (iii)
reaches the recompute residual too (below). Two near-misses make no closure claim and stay:
OPEN-QUESTIONS §1's "Motivating context" and SPEC §0's "detached signing is the documented
upgrade". **A fork of the concept, called out as one:** site 18 is in CONCEPT.md §5, the
honesty discipline, and CLAUDE.md's rule is that a change touching the principles or the honesty
discipline "is a **fork of the concept**, not an edit — it must be called out as such". By that
rule this commit is a fork. It lengthens one parenthetical qualifier of the "Never
'non-repudiation'" bullet to name all three conditions; the bullet's rule, the four principles
and the discipline's other bullets are unchanged, and the claim gets smaller. The owner's grant
named CONCEPT.md, but whether to keep a fork is the owner's call, put to the owner as such. (The
first draft of this record said "it is not a fork", which misstated the rule; so does
`3032ef2`'s commit message, which cannot change.) Checked mechanically the same way, against
the design's §11.

9. **OPEN-QUESTIONS §1, the opening scope sentence** (`docs/concept/OPEN-QUESTIONS.md`).

   Before:

   > consultations; closes the recompute residual and both genesis-head blind windows) but its
   > enablement design is deliberately reserved for a dedicated decision:

   After:

   > consultations; closes the recompute residual and both genesis-head blind windows, under the
   > conditions SPEC §14 states) but its enablement design is deliberately reserved for a
   > dedicated decision:

10. **SPEC §5, the AL1-bound paragraph** (`docs/concept/SPEC.md`).

   Before:

   > detached signing
   > (§14) is the upgrade that makes recomputation and head-edits detectable without trusting
   > storage.

   After:

   > detached signing
   > (§14) is the upgrade that makes recomputation and head-edits detectable without trusting
   > storage, under the three conditions §14 states.

11. **SPEC §5, the compromise edge** (`docs/concept/SPEC.md`).

   Before:

   > detached signing (§14) is
   > the upgrade that makes the compromise-refusal independently trustworthy.

   After:

   > detached signing (§14) is
   > the upgrade that makes the compromise-refusal independently trustworthy, under the three
   > conditions §14 states.

12. **SPEC §5, chain retirement** (`docs/concept/SPEC.md`).

   Before:

   > detached signing (§14) is the upgrade that makes an
   > end-of-life attestation independently verifiable.

   After:

   > detached signing (§14) is the upgrade that makes an
   > end-of-life attestation independently verifiable, under the three conditions §14 states.

13. **SPEC §10.1, the SoD-evidence window** (`docs/concept/SPEC.md`).

   Before:

   > Detached signing (AL2, §14) is the named
   > upgrade that closes this (a signed genesis fails verification when its payload is edited, head
   > or not).

   After:

   > Detached signing (AL2, §14) is the named
   > upgrade that closes this (a signed genesis fails verification when its payload is edited, head
   > or not), while every registered profile signs and the key sits outside the insider's boundary
   > (§14's first two conditions).

14. **SPEC §10.3, the policy-binding window** (`docs/concept/SPEC.md`).

   Before:

   > This
   > is the policy-gate analog of §10.1's SoD-evidence window; detached signing (AL2, §14) is the
   > named closure.

   After:

   > This
   > is the policy-gate analog of §10.1's SoD-evidence window; detached signing (AL2, §14) is the
   > named closure, under the same two of §14's conditions.

15. **ARCHITECTURE §3, the AL1-bound paragraph** (`docs/concept/ARCHITECTURE.md`).

   Before:

   > Detached signing (AL2) is the named
   > closure for all of it.

   After:

   > Detached signing (AL2) is the named
   > closure for all of it, under the three conditions `SPEC.md` §14 states — every registered
   > profile signs, the key sits outside the insider's boundary, and no signature outlives an
   > uncommitted append (the last not yet met).

16. **ARCHITECTURE §9, the ladder's AL2 "Closes" cell** (`docs/concept/ARCHITECTURE.md`).

   Before:

   > the storage-writing-insider recompute residual **and** the head/sole-genesis edit windows (SoD evidence, policy binding); admits authority timestamps that make freshness gating meaningful

   After:

   > the storage-writing-insider recompute residual **and** the head/sole-genesis edit windows (SoD evidence, policy binding), under `SPEC.md` §14's three conditions (the last, no signature outliving an uncommitted append, not yet met); admits authority timestamps that make freshness gating meaningful

17. **SCOPING-GUIDE §5, the build-vs-buy picture** (`docs/concept/SCOPING-GUIDE.md`).

   Before:

   > The insider-recompute threat closes at **AL2 signing**.

   After:

   > The insider-recompute threat closes at **AL2 signing**,
   > while every registered profile signs and the key sits outside the insider's boundary
   > (`SPEC.md` §14).

18. **CONCEPT.md §5, the honesty discipline's "Never non-repudiation" bullet** (`docs/concept/CONCEPT.md`).

   Before:

   > AL2 is insider-resistant (when the key
   > is outside the insider boundary);

   After:

   > AL2 is insider-resistant (when the key
   > is outside the insider boundary, every registered profile signs, and no signature
   > outlives an uncommitted append — `SPEC.md` §14);

17b. **SCOPING-GUIDE §5, the build-vs-buy picture (completed)** (`docs/concept/SCOPING-GUIDE.md`), in `df12561`.

   Before (as `3032ef2` left it):

   > The insider-recompute threat closes at **AL2 signing**,
   > while every registered profile signs and the key sits outside the insider's boundary
   > (`SPEC.md` §14).

   After:

   > The insider-recompute threat closes at **AL2 signing**,
   > under the three conditions `SPEC.md` §14 states — every registered profile signs, the key
   > sits outside the insider's boundary, and no signature outlives an uncommitted append (the
   > last not yet met).

**Amended after the whole-branch review.** A fresh review on the most capable model read the
branch against the code. It found sites 1–8 true of the code, no claim widened and the grant's
scope kept, and confirmed by counter-probes that each pin passes for the reason it claims
(rehoming onto a *signing* twin is caught; deleting the orphan signature makes the splice
refused). It found four Important problems outside the sealed text, each fixed in `3eb1413`:

- *The site-6 rationale was false.* The first draft said a never-committed genesis belongs to a
  record id never created. But `open()` mints the id once and, on an exclusivity conflict with a
  due blocker, re-stamps its retry when the clock has moved, and the decorator signs both
  attempts: a created record carries a valid orphan genesis (`no-edge-containment.test.ts` pins
  it), and a key-less insider who swaps it in makes the record read as opened before its blocker
  expired. Site 6 still holds — the two geneses share a payload and both §2 windows are payload
  edits — and the `at`-only swap is an instance of condition (iii).
- *The outside-the-grant inventory missed SPEC §5's three sentences* and said six where it listed
  seven.
- *The guide's advice to unregister the old profile version omitted its cost*: its open records
  strand and its terminal records lose verified `supersedes` recovery. The guide states the trade.
- *This record paraphrased the sealed sentences* where call 3 asks for them verbatim; it now
  carries all eighteen pairs above.

Minor findings fixed in the same wave: where condition (ii) was already stated (above); the
rehoming digest is computable with `profileDigest`, not only copied from a donor record; the
guide says condition (i) binds every instance acting on the records and condition (ii) every key
whose verifier is registered, retired keys included; the sidecar bullet says the splice route
stays open until the prune, a made splice is no longer an orphan, and an orphan may be the only
trace of a deleted head, so keep what you prune; `concepts.md` drops "exactly when";
`api-reference.md` and `SECURITY.md` state the three conditions; the pin's title and observation
comment are exact. One Minor is parked: ASSURANCE §6, SPEC §14, OPEN-QUESTIONS §1's opener and
ARCHITECTURE §9 attach the three conditions to the closure as a whole, genesis windows included,
while ASSURANCE §2 and SPEC §10.1 and §10.3 give the genesis windows two — the underclaim
direction. Aligning them is not a narrowing of condition (iii), so it is outside call 3.2's
terms and would need its own grant; it is recorded, not pursued. Found by this session during
the review and fixed in the same wave: `signing/decorate.ts` called an orphan "harmless" in
three comments, and `signing/store.ts` and the guide's "An implementer must tolerate orphans"
paragraph called orphans safe to prune without naming the splice route — comments and prose
only, recorded as a plan ruling.

**The re-review.** The same reviewer re-read the fix wave and `3032ef2`: every earlier finding
addressed and every verbatim pair matching. Two Important findings, both fixed. *Site 17 stated
two conditions where three bind*: a finalize batch that loses its compare-and-swap is a signed
branch, and since deleting committed transitions is undetected, the insider deletes back to the
fork point and writes that branch in, with no key and no recompute — the decider changes and a
buried redemption can be repeated; `0f4f997` pins it and `df12561` completes the sentence. *The
record misstated the fork rule* for CONCEPT.md; corrected above. Minor, fixed: the conditions
rationale for OPEN-QUESTIONS §1 and ARCHITECTURE §9, the parking note (above), "without its
conditions" in the CHANGELOG and CLAUDE.md, and the rehoming pin's comment.

**The absence residual, measured.** The review observed that deleting a committed `redeemed`
head leaves every remaining signature verifying and lets the record be redeemed again. SPEC §13A
already names this — AL2 "verifies only what exists — absence survives it", and a restored
backup drops "recent transitions wholesale" — so no sealed sentence is needed. A third pin in
`al2-conditions.test.ts` measures it, and the guide states it beside the conditions.

**The sanctions.** Call 3 allowed at most two sealed-set commits; `5a8ab21` is the first. The
second restates condition (iii) when the transactional-sidecar increment (call 2) lands —
narrowed to a host-supplied sidecar that cannot join the append's atomic unit, in the same
sentences and nowhere else; if call 2 is abandoned the sanction is spent at `5a8ab21`. The
owner's grant is spent at `df12561`. (Updated 2026-11-20: the second commit landed as `e387502`,
after call 2's increment; call 3 is spent — the AL2 restatement follow-up section.)

**Inversions.** None. No pinned assertion changed; the suite gained one file of four pins.

**Gates, measured on the authoring machine after the re-review's fixes.** `ci-assert-tests: ok —
1165 tests in 86 files (91 suites): 1165 passed, 0 failed, 0 skipped, 0 todo`; typecheck (both
packages), biome (`--error-on-warnings`, 159 files checked, no findings), both builds,
`contract-scan`, `api-reference-sync` and `docs-index-sync` all exit 0. `smoke` cannot run here
and runs in CI. `CLAUDE.md`'s measured sentence moved to 86 files / 1165 tests. (At the first
draft of this record, before the fix wave: 1163 tests; after it, 1164.)

## Post-build-order note — the Windows SQLite probe budget (test-only)

**2026-11-19, branch `windows-probe-budget-2026-11-19`.** `packages/record/test/probes.test.ts`'s
`SQLITE_RESTART_TIMEOUT_MS`, the per-test budget of the four tests that drive the probe set over a
file-backed SQLite store with a real close-and-reopen, moves from 20s to 60s. The 20s budget was
set at the CI test-gate repair when the slowest of them took 3.5–5s on the Windows runner. It has
since grown and varies widely there: across thirteen Windows CI runs between 2026-11-17 and
2026-11-19 the full-probe restart test took 3.4s to 25.6s, and the 25.6s run failed on the budget
alone (PR #23's first run; every other leg passed, and the branch's next run passed on all
legs). The latest runs sit at
12–15s; the same test takes 1.2s on a local Windows machine, so the spread is the runner's disk,
not the code. Sixty seconds is about twice the worst observed. A pass is still decided by the probe
verdicts, never by the clock; the budget only stops a slow runner from failing a correct run. No
source file, recorded byte, digest or maturity marker moves, and no assertion changes.

## Post-build-order increment — Transactional sidecar (call 2; register row 22 retired)

**The thirty-third post-build-order increment (branch `transactional-sidecar-2026-11-19`, off
`main` at `ff608bf`).** Behavior in the signing decorator and in all three reference stores, one
new export (`signatureEntriesToWrite`), two optional members on the provisional `Store` contract
(`Store.signatures`, `AppendMeta.signatures`); no sealed-set edit, no maturity marker moved, no
new refusal code, no change to either manifest; the byte-stability digests did not move. The
design is `docs/superpowers/specs/2026-11-19-transactional-sidecar-design.md` and the plan
`docs/superpowers/plans/2026-11-19-transactional-sidecar.md`; the sanction question it answers is
call 2 of `docs/analysis/2026-11-17-sanction-calls.md` ("build it, as its own increment, and do
not take the third horn"), which needed none.

**What it closes.** The signing decorator wrote a transition's sidecar entry with `put` before it
delegated the append, outside any transaction, so every append that then did not commit left a
valid signature over a transition that never landed: an enlisted seam whose host transaction
rolled back, a lost compare-and-swap (the compromise edge's candidate walk, a `record-contended`
batch, `open()`'s re-stamped retry), a crash between the write and the append. Each such orphan
is inert to verification and spliceable — SPEC §14's condition (iii), pinned as a gap by
`packages/record/test/al2-conditions.test.ts` at the AL2 restatement — and the no-edge refusal
path minted one per refusing call: deferral-register row 22, then one of the three rows gating
the 0.1 cut.

**What landed, per commit.**

- `c71c2e0` — the design and the plan, with the INDEX row and counts.
- `6e89b8f` — the contract, the decorator's two modes, and `MemoryStore`. `Store` gains an
  optional `readonly signatures?: SignatureStore` and `AppendMeta` an optional
  `signatures?: readonly SignatureEntry[]`; the `Store.signatures` JSDoc states the contract: one
  entry per appended transition, in order, naming its own digest, record and seq, or a caller
  error before anything is written; written inside the append's atomic unit, after every
  compare-and-swap and constraint check; none on any conflict arm; through a host `tx` when
  enlisted. `withSigning` decides its mode once, when it is built: INTEGRATED exactly when
  `signing.signatures !== undefined && signing.signatures === store.signatures`, SEPARATE
  otherwise. Integrated mode keeps the mint, the mint check, the per-object memo and the batch's
  mint-and-check-every-element-first order, then appends with `meta.signatures` and never calls
  `put`; separate mode keeps the old call sequence exactly; a non-signing record's `meta` passes
  through untouched in both. `MemoryStore` gains its sidecar over a private map, written in the
  synchronous mutation section after the last failable step. The conformance suite gains an
  integrated-sidecar block, registered only for a backing whose `signatures` is defined (no
  skip, no vacuous pass), and `packages/record/test/transactional-sidecar.test.ts` (new) pins
  row 22 and the retry over `MemoryStore`, mode selection by identity alone, a wrapper hiding
  `signatures` running separate, the mode fixed at construction, and the mint still before the
  append in integrated mode.
- `d385910` — `SqliteStore`: a `signatures` table (`STRICT`, keyed by `transition_digest`,
  indexed on `record_id`) created with the schema, so an existing file gains it on open; the
  entries inserted as the last statement before each `appended: true` return, on the store's
  transaction or the host's. The conformance suite gains an optional `HostTransactions` hook and
  its enlisted commit and rollback pins. Condition (iii) met, in `al2-conditions.test.ts`: the
  rollback splice and the lost-batch splice repeated over `sqlite.signatures` — each spliced
  transition has no entry, and the seam refuses `chain-compromise`. The two existing (iii) pins
  keep every assertion and now say they describe separate mode.
- `b576e8b` — one entry check for every backing: `signatureEntriesToWrite` in
  `store/semantics.ts`, exported beside the adapter-author helpers. It returns, per entry, a
  fresh object holding exactly the five `SignatureEntry` fields, each read from the caller's
  entry once, and refuses a non-string `keyRef` or `signature`; `MemoryStore` and `SqliteStore`
  drop their own copies, and `api-reference.md` documents it.
- `8a688a8` — `PostgresStore`: the same table in the store's schema, created by the lazy DDL, the
  entries inserted through the append body's client; the conformance caller passes
  `HostTransactions`, so the integrated block registers there too; and
  `packages/store-postgres/test/transactional-sidecar.test.ts` (new). Atomicity on the store's
  OWN transaction is pinned on SQLite and Postgres with a `BEFORE INSERT` trigger on `signatures`
  that aborts: a non-enlisted genesis, append and batch each reject with the chain unchanged and
  no entry. No earlier pin caught an entry write moved after the store's own COMMIT: under that
  mutation, on either backing, only the new pin failed.
- `50a54b4` — `SqliteStore` runs every enlisted body in a savepoint (`SAVEPOINT
  vidimera_enlisted`; on a throw, `ROLLBACK TO` and `RELEASE`, the body's own error rethrown), and
  `MemoryStore.signatures.put` stores exactly the five fields.
- This increment's records commit: the guide — `integrating.md`'s AL2 section (the sample's
  `signatures: store.signatures`, both modes and how one is chosen, the switching step, the
  wrapper rule, the enlisted-throw contract, the orphans bullet by mode), `api-reference.md`
  (`Store.signatures`, `AppendMeta.signatures`, each store's member, the orphans paragraph by
  mode, the header's count of names added since the review — ten, measured: 62 exported names
  against the review's 52, `profileDigest` and `projectProfile` having been missed by that count
  since 2026-09-03), and condition (iii)'s sentences in `concepts.md`, `faq.md` and `SECURITY.md`;
  the store-postgres README; the register, `next-phases.md`, `release-checklist.md`,
  `CHANGELOG.md`, `CLAUDE.md` and this section; and, per the design's ruling 5.7, every comment
  that described only the write-first order without naming separate mode —
  `probes/probes.ts`, `kernel/finalize.ts`, `kernel/verify-signatures.ts`'s `orphans` JSDoc,
  `test/helpers/signing.ts`, `sidecar-ordering.test.ts`, `sidecar-orphans-report.test.ts`,
  `no-edge-containment.test.ts`'s header, `redeem.test.ts` and `signing-enforce.test.ts`.
  Comments only; no assertion moved.

**Inversions.** The SEVENTEENTH self-authored inversion — this build reversing its own recorded
stance, not an inherited pinned assertion. The stance, recorded in `signing/decorate.ts`'s
header until this increment, verbatim: "The sidecar write is deliberately NOT part of any host
transaction an enlisted seam passes through (`tx` delegates untouched): an aborted effect's
orphan signature is the same class — inert to verification, and spliceable." The argument, made
at its site in `signing/decorate.ts`: the stance held because the only alternative to writing
first was writing after the append, which is the landed-but-unsigned hazard; an orphan is a
valid signature over a transition that never committed, which condition (iii) makes a gap in the
closure rather than an inert leftover; and atomicity removes it without reopening the hazard,
because the entry and the transition are written in one unit and neither survives without the
other. It reverses for integrated mode only: separate mode keeps the stance and its orphans, so
no existing pin flipped, as the design predicted — the suite went from 1165 tests to 1237 with
every earlier assertion unchanged and green at every commit. One behavior change was judged NOT
an inversion, stated so the judgment can be checked: `SqliteStore`'s enlisted body was recorded
as running "on the open transaction with NO BEGIN/COMMIT/ROLLBACK of our own"; the savepoint
keeps that — the host's transaction boundary is never touched — and no assertion pinned the
partial state a throwing enlisted body used to leave.

**The controller's rulings, recorded.** Four, each with its cost if wrong. *The SQLite savepoint*:
without it, an enlisted SQLite append that throws part-way — at its entry insert, after its
transition rows — leaves those rows in the host's transaction, because SQLite rolls back only
the failed statement, and a host that commits anyway lands them unsigned, which is not "inside
the append's atomic unit"; cost if wrong, a small behavior change to enlisted SQLite appends,
strictly more atomic. Postgres needs none: a failed statement aborts the host's whole
transaction (pinned). *The shared validator*: three backings, one rule, on the drift argument
that put the C3/C4 helpers in `store/semantics.ts`. *The five-field rule*: every backing stores
the five `SignatureEntry` fields by name and refuses a non-string `keyRef` or `signature` before
writing — unchecked, SQLite would store `42` as the text `'42.0'` and a null would fail only at
the entry insert, after the transition rows. *The Postgres NUL limit, accepted*: a `keyRef` or
`signature` containing `\0` passes the validator and fails at the insert, because Postgres
`text` cannot hold NUL; the failure is atomic and loud (the store's own transaction rolls back,
a host's is aborted), but it is a refusal SQLite does not make. Two further decisions rode the
reviews: the handle `withSigning` returns does not re-expose `signatures` (the kernel reads the
sidecar from `config.signing`, and re-exposing it would invite a double wrap that selects
integrated mode on the wrapper), and, because the two transactional backings leave different
states behind when an enlisted seam throws, the guide states one contract for both — roll the
transaction back.

**Measured: row 22 on all three backings.** Re-measured for this record with a throwaway rig
(deleted): a sealed signing record whose genesis entry was broken, a one-second ticking clock, a
real Ed25519 signer, chain `opened, consultation-recorded, consultation-recorded, confirmed,
sealed`. Integrated (`signatures: store.signatures`), on `MemoryStore`, `SqliteStore` and
`PostgresStore` alike: sidecar 5 before the calls, and after each of six refusing `finalize()`
calls, `chain-compromise` with no edge, chain 5, sidecar 5, one mint per call;
`verifySignatures(...).orphans` empty. Separate (a `MemorySignatureStore`), the same rig on each
backing: sidecar 6, 7, 8, 9, 10, 11 — six orphans. Pinned on each backing besides: `open()`'s
moving-clock retry and a `record-contended` lost batch leave no orphan; on SQLite and Postgres,
an enlisted redemption the host rolls back leaves none.

**What is not closed, stated.** SEPARATE mode — any sidecar that is not the configured store's
own, which is every host-supplied sidecar over other storage — keeps the write-first order and
every consequence: one orphan per refusing call, and a spliceable signature over every append
that does not commit, so condition (iii) stays open there; `no-edge-containment.test.ts`'s
baselines keep measuring it. **Switching** an existing deployment between modes, in either
direction, leaves the earlier entries behind: those records read unsigned and their next seam
refuses `chain-compromise`, unless the host copies the entries with `put` into the sidecar the new
configuration will read — the library migrates nothing (measured while writing the guide: an
uncopied record refuses `chain-compromise` at `seal`, a copied one seals). The copy is safe only
with every writer stopped: the host stops every instance that writes to the store, copies, then
starts the new configuration alone, because two configurations run against one store at once (a
rolling restart) each write entries the other cannot see, and the next verifying seam appends a
terminal `chain-compromise` edge on a healthy record (stated after the whole-branch review; below).
**A wrapper** around a store must expose the
inner store's `signatures` and forward `meta` intact, or it runs separate; one that exposes
`signatures` but drops `meta.signatures` lands transitions unsigned, and the next seam refuses
`chain-compromise` (measured the same way: a dropped genesis entry, then `finalize` refused).
Integrated mode still verifies only what exists: orphans arise there from committed transitions
an insider deleted or rewrote, and from planted entries, and the absence residual SPEC §13A names
is untouched. Row 19 did not fire: this increment changed where and when an entry is written,
never what is signed, how an entry is encoded, or how a key is handled.

**The sealed follow-up (landed 2026-11-20, `e387502`).** Call 3 of the sanction calls reserves its second sealed-set
commit for this increment's landing: "condition (iii) narrows to the host-supplied sidecar that
cannot join the append's unit, in the same sentences, and nowhere else". It lands after this
increment, as its own change, and spends call 3's sanction; until it does, the sealed set still says this build's
sign-before-append order does not meet condition (iii), which is now true of separate mode only.
The guide, `SECURITY.md` and this record already state the narrower truth. (It landed on
2026-11-20 for call 3.1's five sentences — the AL2 restatement follow-up section; three sentences
the owner's grant conditioned still say "not yet met", pending the owner's word.)

**Gates, measured on the authoring machine at the records commit.** `ci-assert-tests: ok — 1237
tests in 88 files (96 suites): 1237 passed, 0 failed, 0 skipped, 0 todo` (the known
`embedded-postgres` teardown trace follows the summary, register row 24); typecheck (both
packages), biome (`--error-on-warnings`, 161 files checked, no findings), both builds,
`contract-scan`, `api-reference-sync` and `docs-index-sync` all exit 0. `smoke` cannot run here
and runs in CI. `CLAUDE.md`'s measured sentence moved to 88 files / 1237 tests.

**Amended after the whole-branch review.** A fresh whole-branch review on the most capable model
approved the branch with fixes — no Critical finding, one Important, ten Minor — and found every
ruling met in the code: on all three backings and every path an entry is written inside the
append's unit, no conflict arm writes one, a malformed `meta.signatures` is refused before
anything is written, and the mode is chosen by identity alone. The controller ruled on each
finding; the fix wave is `11f8e07` (pins and comments) and the records commit after it, and the
design gained §8. One line per finding:

- *The switching step omitted its writer constraint and one direction* (Important). Copy-then-switch
  is safe only with no instance of the old configuration still writing; a rolling restart runs both
  configurations against one store, each writes entries the other cannot see, and the next
  verifying seam appends a terminal `chain-compromise` edge on a healthy record — and the reverse
  switch, integrated back to separate, was not stated. The guide, the api-reference, the
  CHANGELOG, `next-phases.md` and "What is not closed" above now state both directions: stop every
  instance that writes to the store, copy the entries with `put` into the sidecar the new
  configuration will read, then start only the new configuration.
- *A same-named table* (Minor). Ruled: keep the unprefixed `signatures`, consistent with `staged`,
  `records` and `transitions`. The guide's store list now names the four tables each SQL store
  owns and its two indexes, and what a pre-existing table of one of those names with another shape
  does, measured on scratch databases for both backings before it was written: the store throws on
  SQLite at open, and on Postgres at every call, when an index it creates names a column that table
  lacks (`records`, or a `signatures` without `record_id`); otherwise at the first statement that
  needs a missing column (a `signatures` with `record_id` but not the other columns refuses the
  first append carrying entries, and that append applies nothing). So a failure at open holds for
  some shapes only, and the guide says which. An existing index of either name is kept as found,
  and the store's own is then silently not created — stated in the guide as measured.
- *Pruning assumed a delete* (Minor). `SignatureStore` has none; only `MemorySignatureStore`
  carries one, outside the contract, and the integrated sidecars expose none. The guide and the
  api-reference now say that in integrated mode an orphan is evidence to keep (unless the host's
  own `put` wrote it), and that removing one is the host's own SQL `DELETE` by `transition_digest`
  against the store's `signatures` table.
- *The §12 row's "enlisted, never wrapped"* (Minor). The row now says never wrapped in a transaction of its
  own, with the savepoint named; `SqliteStore`'s `inTransaction` comment says nothing there ends
  the host's transaction (the savepoint's `ROLLBACK TO` undoes only the body's own rows), and
  `sqlite-store.test.ts`'s header, which carried the same phrase, moved with it. The review
  confirmed the savepoint is not an inversion, as judged under Inversions above.
- *Stale comments* (two Minors). The entry check's string-check rationale, in `store/semantics.ts`
  and in its SQLite pin, now gives the reason that holds: silent mis-storage (SQLite stores `42` as
  the text `'42.0'`, re-measured) and a late failure that differs by backing — not a host commit
  landing rows unsigned, which the savepoint (SQLite) and the aborted transaction (Postgres) rule
  out. `store/semantics.ts`'s header no longer says three backings carried a copy of the check:
  `MemoryStore` and `SqliteStore` did, `PostgresStore` never.
- *The api-reference date* (Minor): re-dated 2026-11-20. *Two over-long guide lines* (Minor):
  rewrapped.
- *Pins* (two Minors). Each behavior already held, so each new pin was shown to discriminate by a
  temporary mutation, reverted. Separate mode on `SqliteStore`: six refusing calls grow a separate
  sidecar from 5 to 11, six orphans, the store's own table untouched — red at call 1 (`5 !== 6`)
  under a write-after-append decorator, with both integrated row-22 pins green. The separate
  series was re-measured on all three backings with a throwaway rig (deleted): 5 before; 6, 7, 8,
  9, 10, 11; six orphans, one mint per call — unchanged, so the guide's figures stand, now pinned
  on `MemoryStore` (`no-edge-containment.test.ts`'s baselines) and `SqliteStore`. A non-array
  `meta.signatures` (an array-like of the right length, a bare entry, `null`, a string of the right
  length) is refused before anything is written on `MemoryStore` and `SqliteStore` — red with
  `Array.isArray` removed (the array-like was accepted). `public-surface.test.ts` names
  `signatureEntriesToWrite` — red with the export removed. The store-postgres enlisted pin asserts
  the abort itself (`SELECT 1` rejects "current transaction is aborted") — red under a savepoint
  around Postgres's enlisted body, where the pin as it stood stayed green. The store-postgres
  rollback pin releases its client in a finally of its own, with the error when `ROLLBACK`
  throws — with `ROLLBACK` made to fail, the old shape left one client checked out of the shared
  pool and the new none. The probe tier over an integrated configuration
  (`signatures: store.signatures` on a `MemoryStore`) reaches the separate driver's outcome on
  every probe — red under a `MemoryStore` that drops integrated entries
  (`signature-tamper-refuses` fails at its setup `finalize`).
- *Deferred by ruling* (Minor): `PostgresStore` writes an append's entries one statement per round
  trip while it holds the record-row lock, so a many-element batch lengthens the hold; one
  multi-row upsert would shorten it. The lock order is unchanged — entry rows are inserted only by
  the holder of the record-row lock, or of the genesis advisory lock after its records insert — so
  no new wait cycle is possible; the cost is latency under many-element batches on a hot record.

No existing assertion changed its truth value: three tests were added, and the two store-postgres
pins and the public-surface list changed inside existing tests. **Gates, measured on the authoring
machine at the fix wave.** `ci-assert-tests: ok — 1240 tests in 88 files (96 suites): 1240 passed,
0 failed, 0 skipped, 0 todo` (the known `embedded-postgres` teardown trace follows the summary,
register row 24); typecheck (both packages), biome (`--error-on-warnings`, 161 files checked, no
findings), both builds, `contract-scan`, `api-reference-sync` and `docs-index-sync` all exit 0.
`smoke` cannot run here. `CLAUDE.md`'s measured sentence moved to 88 files / 1240 tests.

## Post-build-order increment — AL2 restatement, follow-up (call 3.2)

**The thirty-fourth post-build-order increment (branch `al2-followup-2026-11-20`, off `main` at
`75ed531`).** Documentation only: one sealed-set commit, no code, no maturity marker, no scope
change. The design is `docs/superpowers/specs/2026-11-20-al2-restatement-followup-design.md` and
the plan `docs/superpowers/plans/2026-11-20-al2-restatement-followup.md`.

**What it corrects.** Since the transactional sidecar, SPEC §14's condition (iii) — no signature
outlives an uncommitted append — holds where the configured sidecar is the configured store's own
(the decorator selects that mode by identity, once) and the store writes each entry inside the
append's atomic unit, as the three reference stores do; with any other sidecar the entry is still
written before the append. Call 3.1's five sentences that mention the condition said it was not
met at all.

**What landed, per commit.**

- `a00faa7` — the design and the plan, with the INDEX row and counts.
- `e387502` — **call 3.2's sealed-set commit**, `docs/concept/` only (SPEC, CONTROLS, ASSURANCE;
  13 lines in, 10 out): A1–A5 below. Call 3's sanction is spent.
- The records commit after it: this section, the records that called the follow-up pending,
  `CHANGELOG.md` and `CLAUDE.md`'s lineage paragraph.

**The wording, and a first draft closed unmerged.** Call 3.2 names "the host-supplied sidecar";
the failing class the code defines is wider — any sidecar other than the configured store's own,
including the library's own `MemorySignatureStore` configured beside a store and a store's own
sidecar behind a wrapper that hides it. A first draft (PR #26, closed unmerged) said "a sidecar
kept apart from the store"; an independent review showed the wrapper case reads under that as
met, which would have overclaimed. The same review found that the draft's second commit, three
sentences under the owner's 2026-11-19 grant, leaned on a general instruction while this record
calls that grant spent; those sentences (ARCHITECTURE §3 and §9, SCOPING-GUIDE §5) still say the
third condition is "not yet met" — an understatement, since SPEC §14 is normative — and wait for
the owner's explicit word. §14's sentence says "as the reference stores do" because the store's
in-unit contract lives in `packages/record/src/store/store.ts`, not in SPEC §12.

**The sealed-history account, verbatim.** Checked mechanically at the commit: every "after" text
present and every "before" text absent, whitespace collapsed, and the design's §3 equal to these.
Marker token counts in every touched file are unchanged.

A1. **SPEC §13A, the closing sentence on AL2 (call 3.1 site 1)** (`docs/concept/SPEC.md`).

   Before:

   > boundary, and no signature outlives an uncommitted append, which this build's
   > sign-before-append order does not yet meet; detached signing (AL2, §14) is the upgrade for
   > those, stated with the absence caveat and those conditions.

   After:

   > boundary, and no signature outlives an uncommitted append, which this build meets only where
   > the sidecar is the configured store's own and written inside the append's atomic unit (§14);
   > detached signing (AL2, §14) is the upgrade for those, stated with the absence caveat and those
   > conditions.

A2. **SPEC §14, the AL2 bullet's condition (iii) (call 3.1 site 2)** (`docs/concept/SPEC.md`).

   Before:

   > uncommitted append:** this build signs a transition before it appends it, outside the
   > append's atomic unit, so an append that is rolled back or loses its compare-and-swap leaves
   > a valid signature over a transition that never committed, which a key-less insider can
   > splice in where it was signed for. Signing

   After:

   > uncommitted append:** it holds where the sidecar is the configured store's own and that
   > store writes each entry inside the atomic unit of the append it signs, after its
   > compare-and-swap and only if the append applies, as the reference stores do; with any other
   > sidecar this build writes the entry before the append, outside it, so an append that is
   > rolled back or loses its compare-and-swap leaves a valid signature over a transition that
   > never committed, which a key-less insider can splice in where it was signed for. Signing

A3. **CONTROLS §3, the Effect-result notarization row (call 3.1 site 4)** (`docs/concept/CONTROLS.md`).

   Before:

   > AL2 signing closes the window early, under SPEC §14's conditions — a redemption the host rolls back leaves a valid signature over a `redeemed` transition that never committed (condition (iii)) |

   After:

   > AL2 signing closes the window early, under SPEC §14's conditions — with a sidecar other than the configured store's own, a redemption the host rolls back leaves a valid signature over a `redeemed` transition that never committed (condition (iii)) |

A4. **CONTROLS §3, the AL2 detached signing row (call 3.1 site 5)** (`docs/concept/CONTROLS.md`).

   Before:

   > (SPEC §14) — this build signs before it appends, so the last does not yet hold |

   After:

   > (SPEC §14) — the last holds only where the sidecar is the configured store's own and written inside the append's atomic unit, not for any other sidecar |

A5. **ASSURANCE §6, the AL2 row's "Closes" cell (call 3.1 site 7)** (`docs/concept/ASSURANCE.md`).

   Before:

   > (this build's sign-before-append order does not yet meet the last)

   After:

   > (the last met only where the sidecar is the configured store's own and written inside the append's atomic unit, not for any other sidecar)

**No new pins.** Integrated mode's half is pinned in `packages/record/test/transactional-sidecar.test.ts`,
`al2-conditions.test.ts` and the store-postgres suite; separate mode's by the existing condition
(iii) pins. Recorded, not changed: integrated mode still calls the host's signer before the
append, so "(iii) holds" speaks to what this build persists, not to any copy a host's signer
keeps.

**Inversions.** None.

**Gates, measured on the authoring machine at the records commit.** The whole suite is unchanged
(no code moved) and was measured at `main` `75ed531`: `ci-assert-tests: ok — 1240 tests in 88 files
(96 suites): 1240 passed, 0 failed, 0 skipped, 0 todo`; biome (`--error-on-warnings`, 161 files),
`contract-scan`, `api-reference-sync` and `docs-index-sync` exit 0 on this branch.
