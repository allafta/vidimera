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
  on the no-edge refusal path, recorded rather than fixed). See the dedicated section at the
  end of this document for the full account; the numbers immediately below already include
  it.
- **Measured against the current tree**: `pnpm test` — 64 test files, 802 tests, zero skips
  (the record and store-postgres vitest projects together, the latter over a real embedded
  Postgres its own globalSetup starts per run);
  `pnpm lint` (`biome check .`) — 131 files checked, zero errors or warnings;
  `pnpm typecheck` — clean; `node scripts/contract-scan.mjs` — no output. Both together
  (`pnpm lint:strict`, i.e. `biome check --error-on-warnings .`) are equally clean.
  `packages/record/src/refusal-codes.ts` carries 24 refusal codes, the twenty-fourth and
  last being `consultation-stale`; zero GOVERNED construction guards remain in `config.ts`.
- **The live deferral-register rows**: three — row 1 (publish tooling, whose tooling landed
  at the phase-2 packaging increment and which stays open until the release workflow is
  exercised once at the 0.1 cut); row 19 (the AL2 detached-signature sidecar pinning
  deferral, added by the byte-regression-pins increment, held open until the first
  increment that changes signature encoding or key handling, or the 0.1 cut, whichever
  lands first); and row 22 (orphan sidecar growth on the no-edge refusal path — each
  refusing seam call against a compromised record whose state admits no CAS candidate mints
  a sidecar entry naming a transition that never lands, and performs one signing operation
  per CAS candidate; inert to both AL2 consumers, which correlate from the chain to the
  sidecar and never the reverse, so a storage, observability and wasted-work finding rather
  than a soundness one; behavior on a durable `SignatureStore` backing is UNMEASURED). Row
  22 was added by the AL2 signature-enforcement coverage increment, which found it while
  closing rows 20 and 21 and recorded it rather than fixing it; its trigger is quoted
  verbatim in the "Still outstanding" row-22 bullet below rather than paraphrased here.
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
| 8 | Recovery, live capture, AL2 signing, the self-test tier | **Exited** — all four tail items landed whole, and the third of those four — AL2 detached signing — landed all THREE of its own increments (the mint, the enforcement, then freshness): AL2 is whole. The first: SPEC §2's recovery linkage. `open()`'s new recovery rung (`kernel/supersedes.ts`'s `verifySupersedes`, consumed after the prior-legs sequencing rung and before the genesis mint) verifies a host-claimed terminal predecessor (`{ recordId, chainHead }`) by replay — intact chain, matching head, TERMINAL by the derived formula (the `confirmed`-state profile-resolution nuance failing closed), same `subjectRef` — and binds the verified reference into the recovering record's genesis, folded by replay; any failure refuses the twenty-third code, `supersedes-unverified`, pre-record and never-appended. The LAST call-seam GOVERNED guard in this build lifted with it (`open()`'s options bag now carries all three of its documented keys for real — see the §9 row). **The second: live-mode capture and `reverify` (SPEC §9.2), the live-capture increment.** `validateLiveCapture` (`config.ts`) replaces the `captureMode:'live'` GOVERNED throw: every leg of a live profile must declare `requiredConsultations` (the decide-time independent re-derivation, gated as an ordinary required consultation at finalize's already-built rung 5.5, no new gate needed for it) and the profile's `redeem` block must declare `confirmToRedeem`, `reverify`, or both. Landing in the SAME commit, `kernel/redeem.ts`'s `refuseCorrespondenceMismatch` gives `reverify` its own redemption-seam semantics: on a reverify-declaring profile, a CONTENT-digest mismatch at any of the redemption family's three seams (the direct shape's rung (5), the token shape's begin-time correspondence, and complete's content half — never its token half, which keeps `effect-mismatch` unconditionally, a wrong token not being state drift) maps to `content-drift`, appended terminal from the seam's current state (CAS from `confirmed` at the direct and begin arms, `redeeming` at complete's content arm), releasing the `(profile, subject)` exclusivity hold — the ordinary non-terminal path, no C3 carve-out involved; an enlisted (`tx`-carrying) call meeting drift refuses result-first WITHOUT appending — an appended edge inside the host's transaction would roll back with the aborted effect — the family's settled enlisted discipline, pinned RED-first on the SQLite backing. Drifted state cannot un-drift: the decision dies terminally, and the recovery flow (`supersedes`) re-opens it under a fresh read, pinned by a composition test. `content-drift` gains this as its SECOND producer (see the §8 row), appending UNCONDITIONALLY there — `terminalRefusals` is finalize's own per-leg machinery and is not consulted at the redemption seam. The `captureMode:'live'` GOVERNED throw lifted with the mapping in the same commit (governed count 2 → 1; `freshness` alone remained, AL2-dependent by the spec's own vacuity argument at that point — since lifted whole at the AL2 freshness increment, below). OPEN-QUESTIONS.md §7's two residuals are now **Decided (this build)**: the `reverify` surface takes no new argument — the redemption seams' existing `content` argument IS the fresh read; and the staged-reference contract is UNCHANGED — `stage()`/`open()`/`finalize()` untouched, decide-time binding enforced by finalize's own rung (4) recompute plus the gated re-derivation consultation. The four live-mode `[SKETCHED]` tokens (SPEC:488's inline bracket, SPEC:667's bold heading, CONTROLS:40's prose, CONTROLS:45's cell) moved to `[PROVEN]`, and SPEC:488's now-false trailing clause was rewritten to point at OQ §7's recorded decisions instead of naming the seam semantics as still open. The library never verifies the re-derivation's path-independence — the consultation gates its presence and verdict; that proof is the operator-assurance tier's live-path-distinctness probe (CONTROLS §4). SPEC §9.2 is whole in this build; see the §9.2 row. AL2 detached signing (SPEC §14) splits into three increments at its own brainstorm — mint, enforce, freshness — and this step has now landed all three; AL2 is whole. **The mint**: the per-profile `signing` declaration, the host-injected signer/verifier hooks, the detached-signature sidecar, and a `create()`-level Store decorator that mints a signature on every append of a signing record, plus one audit-time read, `operator.verifySignatures()`. **The enforcement, landed at this step's own second AL2 increment, makes the layer load-bearing**: `kernel/verify-signatures.ts`'s `signatureLayerHolds`, one shared async correlation core factored onto `verifySignatures`'s own chain-driven walk rather than duplicating it, was consulted, at that increment, at all six verification sites then existing — `finalize()`, `seal()`, the redemption family's shared prologue (`redeem`/`beginRedemption`/`completeRedemption`, the enlisted direct shape's result-first no-append refusal INHERITED from the existing hash-break branch, not re-decided), the findings family's shared prologue (`raiseFinding`/`acknowledge`), `verifyPriorLegs`, and `verifySupersedes` — folding a `false` verdict into each site's OWN existing failure arm: `chain-compromise` at the four seams (the appended compromise edge on a signing record is itself signed, by construction, through the decorator), `prior-leg-unverified`/`supersedes-unverified` at the two cross-record claims. AL1 intactness (`verifyChain(chain).intact`) stays every call site's FIRST, cheap, synchronous check; the layer runs only on an intact chain. No new refusal code, no new outcome class. **The two audit reads stay separate and neither ever gates**: `operator.verifyChain` remains the AL1 report, `operator.verifySignatures` the AL2 report — graduated honesty; the seams enforce. **The sanctioned sealed bundle executed at the enforcement increment's own exit**, a separate commit after the enforcement commit's own gates were green, byte-verified before/after: SPEC §14's AL2 bullet and CONTROLS.md:48's bare cell moved `[SKETCHED]`/`SKETCHED` → `[PROVEN]`/`PROVEN`; `OPEN-QUESTIONS.md` §1's granularity, missing-signature-posture and key-custody tails are now **Decided (this build)**, its authority-timestamps tail **explicitly still open** — this step's own third AL2 increment's ground; SPEC:1233's and CONTROLS.md:48's own "named open decisions"/"granularity open" phrasings were rewritten decided-on-record; OPEN-QUESTIONS.md §7's opener tense-fixed. See the §14 row for the full account. **The rehoming residual is named, not closed**: a whole-chain recompute rehoming the genesis onto a REGISTERED non-signing profile produces a hash-intact chain the layer does not apply to, since the obligation keys on the genesis's own `profileId` claim — `verifySignatures` reports the truth either way (`signingDeclared: false` on the rehomed claim); see the §14 row's own limit column. **The third: consultation freshness (SPEC §11.1/§14), the AL2 freshness increment — AL2's own last of three, and the LAST governed field in this whole build.** `Consultation` (`types.ts`) gains `observedAt?: string`, present-iff-supplied — §2's own table lists the AL1 shape; the field lands under §14's own admission sentence ("AL2 admits authority timestamps inside digested payloads for required consultations"), an anticipated AL2 extension rather than a recorded divergence (see the §11.1 row and the boundary below). `kernel/consultations.ts`'s intake validator accepts it structurally (RFC 3339 with an explicit offset, enforced at intake) on the OBTAINED shape alone — never on the unreachable marker, an unknown-key throw there, no observation having happened. `finalize()` gains a presence contract at profile-resolution depth, the `opts.policy` precedent exactly: a non-signing profile's obtained `observedAt` throws, preserving AL1's clock-trust posture verbatim; a signing profile's is admitted, digest- and signature-covered once recorded. Rung 5.5 gains a freshness arm, run after a required kind's `pass` verdict: a kind the leg's `freshness` record bounds then demands an evaluable, sane, in-bound claim — missing, future, or older than the bound seconds refuses the twenty-fourth and LAST code, `consultation-stale` (`refusal`-class, `terminalRefusals`-able, open-by-default for re-run — the `consultation-failed` family's own register; see the §8 row). `validateFreshness` (`config.ts`) replaces the GOVERNED throw: a declaring leg's profile must set `signing: true` (the AL2 dependency made structural), every bounded key must be in the leg's own required set (`requiredConsultations`, plus `'eligibility'` iff the leg declares it — the ⊆ rule, no separate reserved-kind arm needed since a reserved kind can never be required), and every bound a positive finite integer of seconds (the ttl convention). The governed count moves 1 → 0 with this lift — the TENTH self-authored inversion in this document's own numbered sequence, the guard-lifting era's own exit (see the boundary below): the feature-guards-from-day-one era the kernel increment opened closes here, every guard it installed now lifted behind its own behavior, each in the same commit as that behavior; `governedUnavailable` (`config.ts`) SURVIVES this lift — it still serves the two generic unknown-option-key throws (`kernel/finalize.ts`'s `finalizeOptionMessage`, `kernel/open.ts`'s own), neither of which names a not-yet-enforceable field. Three `OPEN-QUESTIONS.md` §4 questions are answered and recorded as Decided: freshness-eligible kinds are a subset of the leg's own required kinds, including the implicit `eligibility` where declared; a finalize call's inputs are fixed per invocation, so a refusal leaves the record open and the seam re-arms on the NEXT call, never an in-attempt retry; and `facts` gets no freshness bound of its own — the library stamps it at the finalize instant, so recording IS observation at that seam, a host wanting surface-age gating modelling its renderer as an ordinary timestamped kind instead. **What this does not claim**: the library never verifies the observation happened AT `observedAt` — it gates on the recorded, signature-covered CLAIM; genuineness stays `proofRef` and the operator-assurance probes, the same limit §11.1's gate already carried before this increment. The sanctioned sealed bundle executed at this increment's own exit: SPEC:527's and SPEC:634's `[SKETCHED — AL2-dependent]`/bold-`[SKETCHED]` row markers and SPEC:951's inline `[SKETCHED]` moved to `[PROVEN]`/`[PROVEN]`/`[PROVEN]` (each row's own dependency clause, still true, is kept in prose), and CONTROLS.md:47's cell moved `SKETCHED (AL2-dependent)` → `PROVEN (AL2-dependent)` (the parenthetical stays true — construction now requires signing); `OPEN-QUESTIONS.md` §1's own fourth (authority-timestamps) tail completed, "Still open" → "Decided (this build): the recorded-claim, signing-gated design"; and `OPEN-QUESTIONS.md` §4's own three answers, above, recorded as its own Decided tails. **Step 8's fourth and last tail item, the self-test tier (`OPEN-QUESTIONS.md` §5), has since landed too, at the self-test-tier increment**: `src/probes/` — a runner (`runProbes`/`assertSatisfied`), the `ProbeDriver` interface, and seventeen probes authored against CONTROLS §4's own target list, quoted verbatim — plus deferral register row 18's own bounds-validation task, taken deliberately inside the same increment (`validateBounds`, `config.ts`; the ELEVENTH self-authored inversion — see the CONTROLS §4 row and the boundary below for both). Deferral register rows 17 AND 18 both retire with it, triggers fired (see the boundary below). **Step 8 EXITS here: eight of eight build-order steps are now exited, the build order complete at the concept's declared embedded, operator-only scope** — see the closing narrative below the steps table |

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
| 8 | Refusal codes | **Twenty-four codes in the union, across THREE classes** — eleven core (`unsealable-state` built at the second step-2 increment, the union's eleventh core member) plus all TEN of SPEC §8's *built* profile-conditional codes (this row's own "seven" undercounted by one from the first step-6 increment's own exit onward — `ineligible` was already its eighth; caught and fixed here rather than restated wrong again): `effect-mismatch` and `already-redeemed`, landed by the first step-3 increment with producers at the redeem seam, `redemption-timeout`, landed by the third — its producer is the clock resolution at the shared redemption prologue (`kernel/expiry.ts`'s `resolveDueClock`, consumed in `kernel/redeem.ts`), and it folds again on replay via `finalize()`'s own en-passant observation of the same clock reaching a resolved `redeeming` record (the edge lands in its `record-not-open` arm too; `open()`'s blocker branch never produces this edge — SPEC §4 names a due-`redeeming` blocker as the one case its exclusivity check never auto-resolves, so `open()` is not credited here), `prior-leg-unverified`, landed by the first step-4 increment: SPEC §8's own profile-conditional table names it "a pre-record `open()`-seam sequencing refusal that never appends", and its producer is the verifier `kernel/prior-legs.ts`'s `verifyPriorLegs`, consumed by `open()`'s sequencing rung ahead of any record being minted, so no `transitionRef` is ever available to carry it — `sod-violation`, landed by the second step-4 increment: its producer is `finalize()`'s rung 3.5 (SPEC §10.1), raised on either a `sod.notActorOf` match (keyed by the record's own recorded `priorRecordRefs`/`priorLegActors`, principal-only comparison, and a lookup miss also refusing it, fail-closed) or a `proposer` match against the finalizing principal; unlike `prior-leg-unverified`, it takes the DEFAULT `appendsOn` path — the same path `content-drift` and `identity-authority-refused` already exercise with a `terminalRefusals`-declaring production test, so `sod-violation` is a further instance of that path, not its first: default-open (no append, the record stays `open` "so a different approver may decide it", §10.1) unless the leg's `terminalRefusals` lists it, in which case it appends `open → refused` terminal, pinned by `multi-leg.test.ts`'s own terminalRefusals test — and, landed by the second step-5 increment, `consultation-failed` and `availability`: `consultation-failed`'s producer is `finalize()`'s rung 5.5 (SPEC §11.1), raised on a required kind's obtained `fail` verdict, and it takes the SAME default `appendsOn` path `sod-violation` already exercises — default-open unless the leg's `terminalRefusals` lists it, pinned by `consultations.test.ts`'s own terminalRefusals test. `availability` is the union's first and only member of a THIRD class (`RefusalClass`'s `'availability'`, beside `'refusal'` and `'compromise'`): its producer is the same rung 5.5, raised on a required kind's reported-unreachable marker, but it is carried by the `unavailable` outcome status alone (`{ status: 'unavailable'; code: 'availability'; authority }`) and NEVER by a `refused` edge — `appendsOn` returns `false` for the whole class unconditionally, ahead of the `terminalRefusals` consult, making it the SECOND legal-but-inert `terminalRefusals` member beside `leg-expired`'s, both pinned by `refusal-matrix.test.ts`; it is also never-terminal in the ordinary sense — nothing appends, so no chain a record carries ever shows it — and, landed by the first step-6 increment, `ineligible`: SPEC §10.4's implicit-first required kind, computed at the same rung 5.5 — a leg declaring `eligibility` gets an implicit `'eligibility'` required kind prepended ahead of its declared `requiredConsultations` and checked FIRST, authority-to-decide before the evidence checks; its producer is finalize's eligibility arm of that rung, raised on the implicit kind's obtained `fail` verdict, while a NON-declaring leg that merely lists `'eligibility'` in `requiredConsultations` keeps the generic `consultation-failed` instead (§10.4's own non-declaring paragraph); `ineligible` takes the SAME default `appendsOn` path `sod-violation` and `consultation-failed` already exercise — default-open, so a different eligible actor may decide the same open record, unless the leg's `terminalRefusals` lists it — pinned by `consultations.test.ts`'s own terminalRefusals test, and, landed by the second step-6 increment, `policy-drift`: SPEC §10.3's twentieth code, its producer finalize's rung (4.5), raised on a mismatch between a policy-declaring record's operator-bound `policyDigest` and the live digest `opts.policy` attests — including BOTH of §10.3's named cross-instance corners (a live digest against an absent bound one, and a bound digest under a same-id non-declaring instance, THE DECIDED OPEN QUESTION this build answers FAIL-CLOSE) — and it takes the SAME default `appendsOn` path `ineligible` and `sod-violation` already exercise: default-open, no in-place recovery (bound-vs-reality, like `content-drift`), so a policy-declaring leg SHOULD list it in `terminalRefusals` for the disposal-and-re-open flow — a guidance sentence the record carries, never a construction rule. Rung (4.5)'s OTHER arm, a required policy source the host reports unreachable, is `availability`'s SECOND producer (rung 5.5 was the first) — the same never-appended `unavailable` outcome shape, bounded retry on the SAME open record, never fail-open. `consultation-missing` now has TWO producers of its own: rung (5)'s facts check (built from the kernel increment on) and rung 5.5's own missing-required-kind check, both `terminalRefusals`-governed the identical way, so which one fired is unobservable from the appended edge alone. `policy-drift` is the ninth of that list, and, landed by the AL2 freshness increment, `consultation-stale` is the tenth and last: SPEC §11.1/§14's freshness gate, its producer finalize's rung 5.5 freshness arm, raised on a required kind's `pass` verdict whose bounded `observedAt` claim is missing, in the future, or older than the leg's declared bound — `refusal`-class, `terminalRefusals`-able, open-by-default for re-run, the `consultation-failed` family's own register (SPEC §8's row: "can only fire with authority timestamps"). `effect-mismatch` through `consultation-stale` above are the ten, and the count stops there. **`content-drift` gains a SECOND producer, at the live-capture increment, not a new code**: a reverify-declaring profile's redemption-time CONTENT correspondence mismatch (`kernel/redeem.ts`'s `refuseCorrespondenceMismatch`, SPEC §9.2) maps to this same code instead of `effect-mismatch`. The two producers differ structurally: rung (4)'s finalize-time producer consults the leg's `terminalRefusals` (`appendsOn`, the ordinary refusal-class rule) before appending, while the redemption-time producer does NOT — its append is UNCONDITIONAL and always terminal, `terminalRefusals` never consulted (the OPEN-QUESTIONS.md §7 decision on that seam's own append semantics); see the §9.2 row. **`supersedes-unverified` is a further, separate code — the union's twenty-third — landed by the step-8 recovery increment and counted OUTSIDE the nine, never inside it**: SPEC §8's own built profile-conditional table (SPEC.md:545-555) carries no row for it at all, and it is absent too from §8's own fixed never-appends enumeration (SPEC.md:560-563, a ten-member list ending at `prior-leg-unverified`) — it is supply-conditional (present iff a caller supplies a `supersedes` claim at `open()`) rather than profile-conditional in §8's own sense (present iff a `ConfirmProfile` field switches a feature on), so neither sealed list was ever a candidate home for it. Its mandate instead is SPEC §2's own pointer — "Remaining recovery-flow details (the non-terminal-predecessor refusal shape, the exclusivity interaction) are enumerated in `OPEN-QUESTIONS.md`" (SPEC.md:143-144) — and OPEN-QUESTIONS.md §3's own "Decided (this build)" answer to that pointer: "the dedicated code `supersedes-unverified` — never-append, pre-record; the `prior-leg-unverified` pattern at its own name" (OPEN-QUESTIONS.md:61-64). Its producer is `open()`'s recovery rung (`kernel/open.ts`), consuming `kernel/supersedes.ts`'s `verifySupersedes` — a PURE READ over the named predecessor requiring an intact chain, a matching claimed head, TERMINAL state by the derived formula (the `confirmed`-state profile-resolution nuance, unresolvable there failing closed), and the SAME `subjectRef` as the recovering record; unlike every default-`appendsOn`-path code from `sod-violation` through `ack-stale` above, `supersedes-unverified` is PRE-RECORD and NEVER-APPENDS — the `prior-leg-unverified` pattern at its own name, because no record exists yet to carry an edge. **The gap this leaves in both of §8's own sealed lists is recorded here, not reconciled**: §8's own Stability clause holds "the registry is amended only by a revision of this document" (SPEC.md:570), and this build does not revise SPEC.md, so `supersedes-unverified` stays a code this build mints under §2 and OPEN-QUESTIONS §3 while never appearing in either of §8's own enumerations — a deliberate gap, not a drift. As a union with a compiler-total code→class map; `appendsOn` implements §8's append semantics — compromise appends wherever the state admits a state-leaving append, a fixed never-appends set never does (`unsealable-state` is in it: `seal()`'s only append is the `sealed` transition itself, folded into its own success path, never a byproduct of this refusal; `effect-mismatch`, `already-redeemed` and `redemption-timeout` are in it too — redemption's refusals are all result-first, and `redemption-timeout`'s own edge is the `redemption-failed` KIND, never a `refused` transition), and every other refusal-class code appends `open → refused` iff the leg's `terminalRefusals` lists it; `leg-expired`'s inertness as a `terminalRefusals` member is real and pinned. Both `unknown-leg` producers are built. Caller errors throw rather than refuse at `open()` (unknown `stagedRef`), `finalize()` (unknown `recordId`), `seal()` (unknown `recordId`), `redeem()` (unknown `recordId`, new at the first step-3 increment) and `review`/`replay`/`verifyChain` (empty chain), and finalize throws on a persisted `legId` absent from its profile. **`ack-missing`/`ack-stale`
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
row). `seal()` is built too, new at the second step-2 increment, and also operator-only — §9 groups it with `open()`/`review()`/`finalize()`/`redeem()` "and the sweep — §12"; see the §5 and §12 rows for its own gate ladder. `redeem()`'s effect seam is built whole as of the third step-3 increment: both of §11.2's shapes — the direct shape (`confirmed → redeemed { via: 'direct' }`, first increment) and the token shape (`beginRedemption`/`completeRedemption`, `confirmed → redeeming { tokenDigest }` at issuance then `redeeming → redeemed { via: 'token', tokenDigest }` on presentation, second increment) — and both redemption clocks (third increment) — see the §11.2 row. The operator surface now carries three redemption call names where SPEC §9's own sealed-set enumeration names one, `redeem()`; `beginRedemption`/`completeRedemption` are this build's invention, held as a spec-vs-build naming divergence and flagged to deferral register row 6's pre-0.1 naming review. **That same divergence item EXTENDS to `listDue()`, new at the third step-3 increment**: SPEC §12 names "the sweep" as the operator's own iteration over `listDue(now)`, never a method of that name, and this build's `listDue()` is likewise this build's own naming rather than a spec-given one — flagged to the same row 6 review, for the same reason as the two call names above. The human anchor holds by construction — the agent handle is frozen and carries nothing that transitions a record. Exclusivity is enforced in the store's constraint, not by an advisory pre-check. Of the finalize gate ladder, rungs (1) chain-verify, (2) state/expiry, (3) identity, **(3.5) separation of duties (SPEC §10.1, real as of the second step-4 increment)**, (4) content-drift, (5) facts, **(5.5) required consultations (SPEC §11.1, real as of the second step-5 increment)** and (6) the success batch — now one atomic `appendBatch` call rather than three sequential appends — are built, and their adjacent-pair order is pinned by `test/finalize-check-order.test.ts` and, for the two pairs either side of (3.5), `test/multi-leg.test.ts`. **`open()`'s options bag carries its first real key, as of the first step-4 increment**: `priorRecordRefs`, verified by replay (`kernel/prior-legs.ts`) at the sequencing rung before the genesis append — see the §10.1 and §4 rows. **`open()`'s options bag gains its second real key, as of the second step-6 increment**: `policyDigest` (SPEC §10.3), the operator-attested drift baseline, bound into the genesis present-iff-declared, fail-closed loud both directions at profile-resolution depth (a policy-declaring profile opened without one, or a non-declaring profile opened with one, throws) — see the §10.3 row. **`finalize()` gains its own first options bag, as of the first step-5 increment**: §9's documented five-argument signature, `finalize(recordId, identity, content, facts, opts?)`, is now real — `opts?: FinalizeOptions` carries its own first real key, `consultations` (SPEC §11.1's attach form; see the §11.1 row), threaded through the operator surface, `Kernel`/`makeKernel` and the kernel `finalize` signature alike; the unknown-key guard and `validateConsultations` both run BEFORE the chain loads, mirroring `open()`'s own options-loop shape (SPEC §9: consultation shape "throws at argument intake, before anything is loaded"). **`finalize()`'s options bag gains its second real key, as of the second step-6 increment**: `policy` (SPEC §10.3's `PolicyInput`: a live `{ digest }` marker or an `{ unreachable, authority }` one), shape-checked at the same argument-intake depth `consultations` uses, and presence-checked at profile-resolution depth (after rung (1)'s chain-verify and the profile resolve, so `chain-compromise` and `unknown-profile` still win) — a declaring profile's absent `opts.policy` throws, and a non-declaring profile's present one throws UNCONDITIONALLY, bound record or not. **Rung (4.5) is now built too, as of the same increment**: SPEC §10.3's policy-drift comparison, placed after (4) content-drift and before (5) facts — see the §10.3 row. Deferral register row 11 retires with this landing (see the boundary below) | `open()`'s options bag has no remaining unbuilt key: `supersedes` (§2) is real too, as of the step-8 recovery increment (see the §2 row) — the LAST call-seam GOVERNED guard in this build lifted with it (`kernel/open.ts`'s own per-key `openOptionMessage` helper — the arm that named `supersedes` GOVERNED — is deleted whole in the same commit as the behavior, its generic message inlined via a direct call to `config.ts`'s `governedUnavailable`, which never had per-key arms of its own and still serves the two construction guards plus the generic unknown-key throws), so a genuinely unknown key is the only thing that still throws there; this cell's own former claim that `supersedes` alone remained unbuilt was true through the second step-7 increment and stale as of the step-8 recovery increment, corrected here. This is a DIFFERENT tally from the construction-guarded count the §9.1 row tracks (now ZERO — the per-leg `freshness` lifted at the AL2 freshness increment, the count's own one-to-zero move recorded at the step-8 account; `captureMode:'live'` lifted earlier at the live-capture increment; this parenthetical said "now one" until the open-items plan's stage-1 pass corrected it) — a call-seam guard on a real, documented options-bag key is not a `ConfirmProfile` construction guard, and the two counts move independently. **Rung (5.5) is built WHOLE, as of the first step-6 increment**: the required-consultation half (SPEC §11.1, second step-5 increment; see the §11.1 row) plus the eligibility half (SPEC §10.4's implicit-first required kind, first step-6 increment; see the §10.4 row) — a declaring leg's implicit `'eligibility'` kind is checked FIRST, ahead of the leg's own declared `requiredConsultations`. **Ladder rung (5.7) is built too, as of the second step-7 increment**: ack coverage (SPEC
§10.2), placed after (5.5) and before (6) the success batch — see the §10.2 row.
**The findings seams (`raiseFinding`/`acknowledge`, `kernel/findings-seams.ts`) are built
too, as of the same increment** — the operator-only mid-lifecycle pair that mints the
transitions the read half (the fold, the predicate, the coverage derivation, the review
projection) has read since the first step-7 increment; see the §10.2 row. The operator sweep itself stays a recipe, not a seam — SPEC §4 ships "no scheduler and no public `expire()`" and there is no `sweep()` method — but its one read surface, `listDue()`, is built (see the §12 row); the recipe that drives ordinary seams from its output is documented in this record rather than in code (see the §12 row). Exclusivity is enforced in the store's constraint and, since the third step-2 increment, *actionable*: a `record-exists` refusal still names no blocking record in the `Outcome` (§8's model is untouched, by design), and the host locates the blocker itself through the Store's `findNonTerminal` — see the §12 row |
| 9.1 | The ConfirmProfile | The profile and leg types carry §9.1's field table. "Construction is loud" is real: `create()` validates every profile, rejects duplicate ids, requires every `canonicalizerRef` to resolve, and throws a byte-preserved "feature not available in this build" error naming the section that lifts each governed field — **zero today**, the guard era's own exit reached at the AL2 freshness increment (see the end of this recitation, and the §11.1/§14/step-8 rows): `redeemBound` joined the count at the second step-3 increment (briefly eleven) and its own guard lifted at the third, once its own clock existed to honor it, bringing the count to ten; `legs.length>1` — SPEC §10.1's multi-leg maker-checker sequencing — lifted at the first step-4 increment, once `open()`'s sequencing rung existed to enforce the ordering that guard was standing in for, bringing the count to nine; per-leg `sod` and `proposer` — SPEC §10.1's own two remaining controls — lifted together at the second step-4 increment, once `finalize()`'s rung 3.5 existed to read the evidence those guards were standing in for, bringing the count to seven; per-leg `requiredConsultations` — SPEC §11.1's required-consultation gating — lifted at the second step-5 increment, once `finalize()`'s rung 5.5 existed to read the declaration that guard was standing in for, bringing the count to six; per-leg `eligibility` — SPEC §10.4's own gating — lifted at the first step-6 increment, once the same rung 5.5's eligibility arm existed to read the declaration that guard was standing in for, bringing the count to five; the whole-profile `policySource` — SPEC §10.3's policy notarization — lifted at the second step-6 increment, once `open()`'s binding contract, finalize's presence contract, and rung (4.5)'s comparison all existed to honor the three seam obligations that guard was standing in for, bringing the count to four; per-leg `ackMode` and `requiredAcks` — SPEC §10.2's findings-flow controls, always lifted as a pair (both-or-neither) — lifted together at the second step-7 increment, once the two seams and `finalize()`'s rung (5.7) existed to honor the pair's own obligations, bringing the count to two; the whole-profile `captureMode:'live'` — SPEC §9.2's live mode — lifted at the live-capture increment, once `validateLiveCapture` (`config.ts`) existed to enforce the mode's own construction obligations (every leg declaring `requiredConsultations`; the redemption tail declaring `confirmToRedeem`, `reverify`, or both) and `kernel/redeem.ts`'s `refuseCorrespondenceMismatch` existed to give a declared `reverify` its own seam semantics, both landing in the same commit as the lift, bringing the count to one, where it stood at this increment's own exit. What remained governed at that point: the per-leg `freshness` alone (vacuous by construction at AL1 regardless — the library stamps every consultation's own `at`, library-emitted or host-supplied alike, so lifting this guard alone could never make the gate fire on its own) — since lifted whole at the AL2 freshness increment, taking the count to zero; see the §11.1, §14, and step-8 rows. `expiry` drives the open window's clock; the `redeem` block's two bounds drive the other two, all three sharing one derivation (`kernel/expiry.ts`'s `pendingWindow`). **Both bounds are now enforced, as of the third step-3 increment**: `confirmToRedeem` resolves `confirmed → expired` and `redeemBound` resolves `redeeming → redemption-failed`, each at the deadline its own value names. SPEC §9.1's "A separated-store host SHOULD declare `redeemBound`" is real advice with teeth now, not a loudly-unsatisfiable one: a host that follows it gets a clock that ends the lost-token strand on its own bound; a host that declines it keeps the strand risk knowingly, as its own SHOULD-not-MUST wording always allowed (see the §11.2 row for the retired "safe to ship, not yet safe to operate" language this replaces). **The seconds convention, recorded here as this build's own**: SPEC §9.1 states units only for `expiry.ttl` ("`ttl` in seconds"); the `redeem` block's two bounds have no stated unit of their own, and this build treats them the same way — the fixtures' `3600`/`86400` values were always seconds-shaped, and `kernel/expiry.ts`'s deadline math (`Date.parse(atIso) + seconds * 1000`) now makes that reading load-bearing rather than merely assumed. The effect-seam predicate is written whole. `allowedAuthorities` and `terminalRefusals` are honored | §9.1's individually named construction errors are not all individually checked: "inert or contradictory feature combinations" is not implemented as a general check — a malformed `terminalRefusals` member is neither rejected nor ever matched. Reserved consultation kinds in `requiredConsultations` ARE now individually checked, as of the second step-5 increment (`validateRequiredConsultations`, `config.ts` — see the §11.1 row), and double-declared eligibility (§10.4 — declaring `eligibility` and also listing `'eligibility'` in `requiredConsultations`) IS now individually checked too, as of the first step-6 increment (`validateEligibility`, `config.ts` — see the §10.4 row), reachable now that `eligibility`'s own wholesale governed throw is gone |
| 9.2 | Capture modes | **Whole, as of the live-capture increment.** Both `staged` (the base mode) and `live` construct. `live`'s own construction rules are `validateLiveCapture` (`config.ts`): every leg must declare `requiredConsultations` — the decide-time independent re-derivation, gated as an ordinary required consultation at `finalize()`'s already-built rung 5.5 (SPEC §11.1), no new gate needed for it — and the profile's `redeem` block must declare `confirmToRedeem` as a maximum age, `reverify`, or both (both is legal — a max age AND drift re-verification). The mode falls out of machinery already built: required-consultation gating, finalize's rung (4) content recompute, the redemption family and its clocks, and the effect-seam predicate, which has read `captureMode === 'live'` since the kernel increment. `reverify`'s own redemption-seam semantics land with it (`kernel/redeem.ts`'s `refuseCorrespondenceMismatch`): on a reverify-declaring profile, a CONTENT-digest mismatch at any of the redemption family's three seams — the direct shape's rung (5), the token shape's begin-time correspondence, and complete's content half (never its token half, which keeps `effect-mismatch` unconditionally — a wrong token is not state drift) — refuses `content-drift` with an APPENDED terminal `refused` edge from the seam's current state (CAS from `confirmed` at the direct and begin arms, `redeeming` at complete's content arm), releasing the `(profile, subject)` exclusivity hold; the append rides the ORDINARY non-terminal path (a live profile is an effect-seam profile, so its `confirmed` is non-terminal — no C3 carve-out involved). An enlisted (`tx`-carrying) direct-shape call meeting drift refuses result-first WITHOUT appending — an appended edge inside the host's transaction would roll back with the aborted effect — so a subsequent unenlisted invocation lands the terminal edge (the loser-agrees-with-reinvocation shape); pinned RED-first on the SQLite backing. Drifted state cannot un-drift: the decision dies terminally, and the recovery flow (`supersedes`) re-opens it under a fresh read, pinned by a composition test. `content-drift` gains this as its SECOND producer (SPEC §8; see that row): the redemption-time append is UNCONDITIONAL — `terminalRefusals` is finalize's own per-leg machinery (`appendsOn`/`refuseMaybeAppend`) and is not consulted here, the refusal-matrix comments stating the distinction. **Two OPEN-QUESTIONS.md §7 residuals are now Decided (this build)**: (1) the `reverify` surface's argument shape — none new; the redemption seams' existing `content` argument IS the fresh read, mapping every content-digest mismatch to `content-drift` as above, the token comparison keeping `effect-mismatch`; (2) the staging contract — UNCHANGED: `stage()` binds the reviewed rendering's digest exactly as before, finalize's existing rung (4) re-digest is the decide-time re-verification, and the mandated independent re-derivation is evidenced by the required consultation — zero changes to `stage`/`open`/`finalize`. The `captureMode:'live'` GOVERNED throw is gone (`validateLiveCapture` replaces it — see the §9.1 row); the governed count moves 2 → 1 with this lift. The four live-mode `[SKETCHED]` tokens (SPEC.md:488's inline bracket, SPEC.md:667's bold heading, CONTROLS.md:40's prose, CONTROLS.md:45's cell) moved to `[PROVEN]`, and SPEC.md:488's trailing clause — which named the `reverify` seam semantics as among that mode's open decisions — was rewritten to point at OPEN-QUESTIONS.md §7's now-recorded decisions instead | The library never verifies the re-derivation's path-independence: the consultation gates its PRESENCE and verdict, never whether the host's access path is genuinely independent of the one that produced the reviewed rendering — that proof is the operator-assurance tier's live-path-distinctness probe (CONTROLS §4), stated wherever the mode is described. No new refusal code (`content-drift` gained a second producer, not a row) and no new argument, seam, store change, or encoding change |
| 10 | Feature-conditional decision controls | The shape of the rule: a host declaring none of §10's fields runs the base model, and every field that would switch one on throws at construction | All four controls below |
| 10.1 | Maker-checker / SoD | **Whole, as of the second step-4 increment.** Both controls the section names are enforced at `finalize()`'s spec-fixed rung 3.5 (SPEC §9's ladder: "(3) identity → (3.5) separation of duties → (4) content-drift"), after identity is well-formed and its authority allowed and before content-drift is checked. **The sequencing half** (first step-4 increment): `legs.length>1` is accepted at construction (the guard lifted with this landing — see the boundary below); `isFinalLeg(legIndex, totalLegs)` remains an index comparison, forward-compatible rather than a hardcoded final-leg answer, and `open()` passes the resolved leg's index. `open()`'s sequencing rung (`kernel/prior-legs.ts`'s `verifyPriorLegs`, consumed before the genesis append) verifies EVERY prior-leg reference by replay against SIX conditions, stated once here canonically: **(1)** the referenced chain must verify intact, **(2)** its recomputed head must equal the supplied `chainHead`, **(3)** the replayed record must share the successor's `profileId`, **(4)** share the successor's `subjectRef`, **(5)** sit at the expected leg, in the profile's declared order, and **(6)** be `confirmed` — refusing `prior-leg-unverified` (never-append, pre-record) on any failure, including a first leg that supplies references at all. On success the successor's `opened` snapshot carries the verified references in their recorded three-field form `{ recordId, chainHead, legId }` and the library-derived `priorLegActors` (see the §4 row). A sealed prior still verifies — state, not status, is what the check reads — and a destroyed one does not (SPEC §10.1's own two named postures, both pinned in `multi-leg.test.ts`). **The gate half** (second step-4 increment): `sod.notActorOf` and `proposer` construct real now (the GOVERNED throws deleted with the gate — see the boundary below); `finalize()`'s rung 3.5 reads the sequencing half's own chained evidence — for each `notActorOf` entry it looks the named leg up in the record's own `priorRecordRefs`, pairs it by index into `priorLegActors`, and refuses `sod-violation` if the paired actor's `principal` equals the finalizing identity's; `proposer` refuses the same code if it equals the finalizing identity's `principal`. **Comparison is by principal alone, deliberately** (§10.1): the same human re-authenticated under a second allowed authority still refuses, the fail-closed direction — the residual same-human-different-principal case is §10.1's own named AL1 limit, recorded rather than coded around. **A lookup miss refuses too**: an entry naming a leg absent from the record's own recorded references — reachable only through profile reconfiguration between `open()` and `finalize()`, since construction validates the static case — refuses `sod-violation` fail-closed, on the reading that distinctness cannot be demonstrated from evidence the record does not carry; a fresh record under the current profile is unaffected. **A retried decision by the same actor on the SAME leg is untouched**: `notActorOf` names only prior legs and `proposer` compares only the declared principal, so neither control fires on a retry (§10.1: "A retried decision by the same actor on the same leg is not self-approval"). The refusal is the sixteenth code, `sod-violation` — refusal-class, default-open, `terminalRefusals`-able like the other rung-(3)-through-(5) refusals (see the §8 row); every non-declaring profile's chain stays byte-identical, no new append shape anywhere. **The AL1 window on this evidence is recorded beside it, not closed**, unchanged since the first increment: the `priorLegActors` a successor's `open()` derives live in that successor's own genesis payload, which IS the chain head until the successor's own next append — over exactly that window the §0/§5 head-bound applies for a NON-signing profile — this build's own default. **A SIGNING-declaring profile closes this window now**, as of the AL2 enforcement increment (see the §8 and §14 rows): `signatureLayerHolds` recomputes and correlates every transition INCLUDING the genesis, so a head-window tamper orphans that transition's signature and refuses `chain-compromise` at finalize's own rung (1), before rung 3.5 ever reads the tampered evidence. **Four fail-closed rulings this build took where the spec is silent, recorded as tightenings, not divergences**: a `notActorOf` entry must be non-empty, pairwise distinct, and name a strictly-earlier leg (an empty array, a later leg, the leg's own id, or an unknown id could never match the record's references and would be declarable-but-inert — the fail-open trap `validateSodShape`, `config.ts`, rejects structurally at construction); `proposer` is multi-leg-only (§10.1's applicability sentence scopes the whole feature, so a single-leg profile declaring it is a construction error too); `proposer` must be non-empty (an empty string constructed fine but could never fire at the gate — finalize's rung 3 requires a non-empty `identity.principal`, so `leg.proposer === identity.principal` is unsatisfiable for `''` — the same declarable-but-inert trap; found at the second step-4 increment's final review, after the gate itself had already landed, and closed there rather than left as a residual gap); and the lookup-miss refusal above | Cross-leg content binding is not verified — legs may decide enriched or different content, both digests chained, a host wanting identical content enforcing that in its own staging (SPEC §10.1's own stated non-goal). Distinct principals, not independent judgment: two colluding humans satisfy the gate; collusion and coercion are out of scope (SPEC §13A). The library still never verifies WHO a principal is — identity remains transport-established (SPEC §6), and the gate compares recorded strings. One residual hardcoded leg index remains, at `kernel/expiry.ts`'s single `expired`/`redemption-failed` append, where the fed flag is `false` for every input either way |
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
| 10.3 | Policy-drift notarization | **Whole, as of the second step-6 increment.** `policySource` (`ConfirmProfile`, an opaque per-profile label) is accepted at construction — the kernel increment's GOVERNED throw is gone (the EIGHTH self-authored inversion; see the boundary below) — replaced by the same settled fail-closed structural class as `eligibility`'s own: an empty label throws as the malformed-reference rule. **The binding contract, loud both directions**: `open()`'s options bag carries its second real key, `policyDigest` (a `Digest`) — after profile resolution, a policy-declaring profile opened WITHOUT a (non-empty) `policyDigest` throws, and a `policyDigest` supplied to a NON-declaring profile throws too (§10.3: "fail-closed both directions and loud — a caller/config error, not a domain refusal"); the operator-attested digest is bound into the genesis `opened` payload present-iff-declared, never routed through the agent-reachable `stage()` — "routing the drift baseline through the untrusted drafter would let a lying agent bind whatever digest it anticipates the live source will hold" — and `replay`/`getRecord()` fold it, the draft-ahead field's first producer. Non-declaring chains stay byte-identical; the frozen fixtures never declare. **The presence contract, argued asymmetric with the consultations bag**: `finalize()`'s `opts?: FinalizeOptions` gains its second real key, `policy?: PolicyInput` (a live `{ digest: Digest }` marker or an `{ unreachable: true; authority: string }` one), shape-checked at argument intake beside `validateConsultations` (a present `opts.policy` must be exactly one of the two shapes, non-empty, or it throws as a caller error before the chain loads) and presence-checked at PROFILE-RESOLUTION depth — after rung (1)'s chain-verify and the profile resolve, so a tampered chain still refuses `chain-compromise` first and an unconfigured profile `unknown-profile` first (`policy-drift.test.ts`'s "the depth pin: a tampered declaring-profile chain refuses chain-compromise BEFORE the absent-policy throw" pin). A declaring profile's absent `opts.policy` throws; a non-declaring profile's present one throws UNCONDITIONALLY — bound record or not — deliberately DIFFERENT depth from the consultations bag's intake-depth throw, because policy is "a single mandatory environment fact with an explicit unreachable escape hatch"; its absence is a host contract violation, not omitted evidence, and keeping absence out of `policy-drift` leaves that code purely "the digests differ". **Rung (4.5)**, placed after (4) content-drift and before (5) facts (content integrity outranks the policy environment; policy outranks the evidence gates, "deciding under the wrong policy version moots the evidence"): a matching live digest confirms; a required policy source the host reports unreachable yields the `availability` outcome, its SECOND producer (rung 5.5 was the first) — bounded retry on the SAME open record, never fail-open, never approval; a mismatch refuses `policy-drift` (the twentieth code), including the ABSENT-bound forward corner — a live digest compared against `record.policyDigest === undefined` is a mismatch by the same string-inequality check, since `undefined` never equals a string. **BOTH cross-instance corners are pinned**, and one of them answers §10.3's own named open question: the forward corner (a record opened under a non-declaring same-id instance, finalized under a declaring one with the digest form) refuses `policy-drift`, fail-closed, §10.3's own corner; on a record with no bound digest under a declaring finalize-time profile, an `{ unreachable, authority }` attestation still yields the availability outcome (bounded retry) even though no later `{ digest }` retry can ever confirm — the retry terminates in `policy-drift` once the source recovers; the check order is SPEC §10.3's own. The reverse corner — a record opened under a DECLARING instance, finalized under a same-id NON-declaring one (no `opts.policy`, legal there) — is THE DECIDED OPEN QUESTION: this build takes FAIL-CLOSE, the recommendation §10.3 itself records, over skipping the gate, on the reading that a bound digest with nothing live to compare is mismatch-shaped, mirroring the forward corner's own fail-closed reading; the sealed concept set is untouched — §10.3 marks the question open and this build answers it in code, not in the spec. The cost, stated: a host retiring a policy source must re-open old records rather than finalize them gate-free. **The head-bound window** (§10.3's own AL1 analog of the SoD-evidence window, recorded beside the guarantee, not closed by it): a single-leg record's bound `policyDigest` lives in the genesis (head) payload until the next append — a storage-writing insider edit defeats the gate inside that window, for a NON-signing profile — this build's own default. **A SIGNING-declaring profile closes this window now**, as of the AL2 enforcement increment (see the §8 and §14 rows), the same mechanism §10.1's own head-bound window closes under. **The SHOULD guidance**: `policy-drift` mirrors `content-drift` — bound-vs-reality, no in-place recovery — so a policy-declaring leg SHOULD list it in `terminalRefusals` for the disposal-and-re-open flow; `availability` is the transient case that DOES retry the same open record. **Multi-leg**: `policyDigest` is record-level — each leg's own `open()` binds its own digest; no cross-leg equality is verified, chained and auditable like cross-leg content | The library notarizes the policy version; it never fetches or evaluates policy — whether the live source was honestly read stays the operator's, the same honest bound every gate carries |
| 10.4 | Eligibility gating | **Whole in this build, as of the first step-6 increment.** Declaring a per-leg `eligibility` reference makes `'eligibility'` an **implicit-first required consultation kind**: at `finalize()`'s rung 5.5 (see the §9 and §11.1 rows) the effective kinds for a declaring leg are the implicit `'eligibility'` kind followed by the leg's own declared `requiredConsultations`, in order, so authority-to-decide is checked before the evidence checks — the library never runs the check itself; the host supplies the `eligibility` consultation's verdict and the library gates on it. **The trip mapping**, when the tripping kind is the implicit `'eligibility'` under a declaring leg: a `fail` verdict refuses `ineligible` (SPEC §8's nineteenth code); a missing input refuses `consultation-missing` (generic); an unreachable marker yields the `availability` outcome (generic) — every other kind along the same rung keeps the generic codes too. **Verdict vs. code**: a failed eligibility check records verdict `'fail'`; `ineligible` is the refusal code, never a verdict value — a `pass`-verdict eligibility consultation is an obtained required input and records in the success batch exactly as every obtained consultation already does, while a `fail` records no consultation of its own (its evidence is the outcome code; a leg wanting a chain trace lists `ineligible` in `terminalRefusals`). `ineligible` is `refusal`-class, `terminalRefusals`-able, and takes the DEFAULT `appendsOn` path — open-by-default so a DIFFERENT eligible actor may decide the same open record. **The ordinary-kind fallback**, when `eligibility` is NOT declared: `'eligibility'` is then an ordinary kind with no special mapping — a voluntary `eligibility` consultation records as supplied evidence, and "a leg that merely lists `'eligibility'` in its `requiredConsultations` gates it with the generic codes (`consultation-failed` on a `fail`, never `ineligible`)". Construction: `eligibility?: string` was already on `LegSpec`; the GOVERNED throw is gone (`validateEligibility`, `config.ts`), replaced by the same settled fail-closed structural class as `validateSodShape`'s/`validateRequiredConsultations`'s — an empty label throws as the malformed-reference rule (the gate keys on the declaration's PRESENCE and never compares the label, so this is NOT `proposer: ''`'s inertness trap), and declaring `eligibility` while also listing `'eligibility'` in the same leg's `requiredConsultations` throws SPEC §10.4's own "declare it once" construction error, naming both sites. The governed count moves 6 → 5 with this lift (see the §9.1 row) | **Honest bound**, stated with its limit in the same breath: the gate ensures a `fail` cannot silently confirm — it never fabricates a pass — but it does not prove the named authority genuinely ran the check; the truthful-verdict burden stays the host's, exactly as §11.1's own gate does not prove a consultation was genuinely obtained. SPEC §10.3 — policy drift — landed at the second step-6 increment, closing step 6 whole; see the §10.3 row |
| 11 | Feature-conditional evidence & the effect seam | A heading with no normative text of its own; its two subsections carry it | — |
| 11.1 | Consultations | **Whole in this build, across three increments.** The first landed §11.1's unconditional half, as of the first step-5 increment (SPEC §11.1: "The attach form is always available"). `finalize()` still records its own `chain-verify` and `facts` consultations as before; the host's own attach form exists beside them: `opts?: FinalizeOptions`'s `consultations` key (`config.ts`'s `ObtainedConsultation`/`UnreachableMarker`/`ConsultationInput`), validated and partitioned at argument intake by a standalone module, `kernel/consultations.ts`'s `validateConsultations`, called BEFORE the chain loads (SPEC §9: "throws at argument intake, before anything is loaded" — pinned by a test where the intake throw wins over an unknown-`recordId` throw when both apply). It throws a caller error — never a refusal — on: an entry matching neither exact shape, or carrying an unknown key (an `at` field included — SPEC §11.1's "never accepted from the host" is enforced structurally, since neither input shape HAS an `at` field to drop); a non-string/empty `kind`, an out-of-domain `verdict`, a checker failing `isValidIdentity`, a missing `payloadDigest`/`authority`, a non-string `proofRef`; a RESERVED kind, `facts` or `chain-verify` ("would forge a library control"); or a duplicate `kind` across the whole list ("At most one consultation per kind per finalize"). `finalize()`'s success batch (rung (6)) is variable-arity, SPEC §9's own shape — `appendBatch([chain-verify, facts, …obtained consultations, confirmed])` — each supplied entry recorded between `facts` and `confirmed`, in supplied order, with the library-stamped recording time (the batch's single clock reading, §2.1 — never a host-supplied one, for host-supplied kinds too, not only the library's own two), digest-only custody (`payloadDigest`; the library never sees the payload), and `proofRef` present iff supplied. A fail-verdict consultation on a kind that is NOT required is recorded and does NOT refuse — §11.1's own sentence for that case: "recorded as supplied — including a `fail` verdict — as evidence, never a gate," pinned by its own named test. A no-consultations finalize's batch stays byte-identical in shape to before (the existing byte-stability suite, untouched, is this pin). Custody, stamping and one-per-kind hold for host-supplied consultations exactly as they already held for the library's own two; `replay` accumulates all of them in chain order, unchanged. The backing-parameterized conformance suite gained an arity-5 `appendBatch` case, run over both backings — nothing in the suite had exercised the store's own N-element acceptance above arity 3 before. **The second landed the gate, as of the second step-5 increment**: `finalize()`'s rung 5.5, placed after (5) facts and before (6) the success batch, reads the finalizing record's own resolved leg — "on a multi-leg profile one leg's finalize is never gated by another leg's `requiredConsultations`" — and iterates the leg's declared kinds in order, the first declared kind that trips deciding the outcome, never severity ranking across kinds. Per kind, three arms are checked in order and are mutually exclusive (the intake validator's one-per-kind rule already rejects a host supplying both a marker and an obtained entry for the same kind): a reported-unreachable marker produces the `availability` outcome — `{ status: 'unavailable'; code: 'availability'; authority }`, `authority` carrying the marker's own — never a fabricated pass, and it NEVER appends: `appendsOn` returns `false` for the whole class unconditionally, ahead of the `terminalRefusals` consult, making it the SECOND legal-but-inert `terminalRefusals` member beside `leg-expired`'s (both pinned by `refusal-matrix.test.ts`), and the record stays `open` so the seam re-arms for bounded host retry; a kind absent from the supplied obtained set refuses `consultation-missing` (its SECOND producer, after rung (5)'s own facts check); an obtained `fail` verdict refuses `consultation-failed` (the seventeenth code); a `pass` verdict is satisfied and the entry records in the success batch exactly as before — the gate adds no recording of its own. `refused()`'s `code` parameter narrows to `Exclude<RefusalCode, 'availability'>` in the same increment, the class's never-a-refused-edge rule made compile-time, pinned by a `@ts-expect-error` test. An unreachable marker for a kind the leg does NOT require stays inert exactly as the first increment left it — validates at intake, records nothing. The `requiredConsultations` GOVERNED throw lifted with the gate in the same commit: `validateRequiredConsultations` (`config.ts`) replaces it with this build's own fail-closed structural posture, the same settled class as `validateSodShape`'s — non-empty, pairwise distinct, every kind a non-empty string, never a reserved library-emitted kind (`RESERVED_CONSULTATION_KINDS`, `config.ts`, exported and consumed by both the construction guard and the intake validator — one definition, two consumers). Multi-leg: only a declaring leg is gated, the sequencing rung's own reading, pinned by test. **The third landed the freshness tail itself, as of the AL2 freshness increment.** `Consultation` gains `observedAt?: string` (§2 lists the AL1 shape; the field lands under §14's own admission sentence, an anticipated extension, not a divergence — see the boundary below); the intake validator accepts it structurally on the OBTAINED shape alone (RFC 3339 with an explicit offset, enforced at intake; the unreachable marker gains no such key, an unknown-key throw there); `finalize()` gains a presence contract at profile-resolution depth, the `opts.policy` precedent exactly — a non-signing profile's obtained `observedAt` throws, a signing profile's is admitted and recorded digest- and signature-covered. Rung 5.5 gains a freshness arm after a required kind's `pass` verdict: a kind the leg's `freshness` record bounds demands an evaluable, sane, in-bound claim — missing, future, or older than the bound refuses the twenty-fourth and last code, `consultation-stale` (see the §8 row). `validateFreshness` (`config.ts`) replaces the GOVERNED throw — a declaring leg's profile must set `signing: true`, every bounded key ⊆ the leg's own required set (plus the implicit `eligibility` where declared), every bound a positive integer of seconds — the LAST governed field in this build; see the §14 and step-8 rows for the count's own 1 → 0 move and the sanctioned sealed bundle it closed with. Three `OPEN-QUESTIONS.md` §4 questions are Decided: freshness-eligible kinds are a subset of the leg's required kinds; finalize inputs are fixed per call, so the seam re-arms on the next invocation rather than re-entering in-attempt; and `facts` gets no bound of its own, since library-stamping IS observation at that seam | §11.1 is whole in this build, all three increments landed. **The gate enforces presence, verdicts, and unreachability honestly — it never fabricates a pass — but it does not prove the named authority was genuinely consulted**: that severing a dependency yields `availability` rather than a stubbed pass is the operator's own regression exercise, outside the library's runtime guarantee (the operator-assurance limit §11.1 itself names travels with the guarantee, not a gap this build could close). The freshness gate carries the SAME class of limit, now that it is built rather than governed: the library never verifies the observation happened AT `observedAt`, only that the recorded, signature-covered CLAIM is present, parseable, and in-bound — genuineness of the claim itself stays `proofRef` and the operator-assurance probes, stated in the same breath as the gate (the AL2 freshness increment). `eligibility`'s own implicit-first required kind (§10.4: declaring `eligibility` prepends an implicit `'eligibility'` kind ahead of the declared `requiredConsultations`) is now built too, as of the first step-6 increment: rung 5.5 computes the EFFECTIVE kinds for a declaring leg as the implicit `'eligibility'` kind followed by the leg's own declared `requiredConsultations`, in order — see the §10.4 row for the trip mapping and the construction guard's lift. **The interplay with a never-satisfiable required kind**: whether the unsatisfiable kind is the implicit `eligibility` one or an ordinary declared one, a required kind the host can never pass keeps the record `open` and the finalizing leg's `(profile, subject)` pair held — bounded by the profile's own open `expiry.ttl`, or indefinitely under `expiry: 'none'`, the operator's own configuration to resolve. No lost-artifact strand exists the way an unbound redemption token once could (§11.2): the operator controls every finalize input, so the operator can always choose to end its own wait — by declaring a bounded `ttl` up front, or by supplying a different verdict, authority, or consultation on a later finalize attempt |
| 11.2 | Redemption (the effect seam) | `redeem(recordId, content, opts?)` — `opts?: RedeemOptions` since the effect-result increment's own Task 1 — is exported on every profile, as §8 requires of it. The first step-3 increment landed §11.2's direct shape as a verify-first gate ladder: chain-verify first (§5), profile resolution, the effect-seam/final-leg gate refusing `unredeemable-state`, the state gate (`already-redeemed` on replay, checked before correspondence — at-most-once outranks mismatch reporting — `unredeemable-state` otherwise-not-confirmed), effect-content correspondence via the same stage-path re-digest finalize rung (4) uses, refusing `effect-mismatch` on drift, and the atomic append of `confirmed → redeemed { via: 'direct' }`, enlisted through the caller's own `tx?` handle where supplied — which releases the `(profile, subject)` pair a confirmed effect-seam record held (register row 9, retired by building). The §8 stub-scoping fixes landed with it: an unknown `recordId` throws rather than misreporting a refusal, an unknown profile fails closed to `unknown-profile`, and the ladder verifies the chain before acting rather than never verifying. **The second step-3 increment landed §11.2's token shape whole**: `beginRedemption` (issuance, `confirmed → redeeming { tokenDigest }`) and `completeRedemption` (presentation, `redeeming → redeemed { via: 'token', tokenDigest }`), both sharing the direct shape's chain-verify-first prologue; the token itself — `node:crypto`'s `randomBytes(32)` as a 43-character base64url string, satisfying §11.2's "enough entropy that its digest is not invertible by guessing" — is generated before the append and returned in the `ok` value exactly once, never persisted (the chain carries only `tokenDigest`); at-most-once's replay half is built at both new seams (`already-redeemed` on an already-redeemed record, checked before correspondence, the same priority the direct shape uses); completion checks the token-vs-content correspondence — `digest(token)` against the chain-recorded `tokenDigest`, then the re-digested content against the bound `contentDigest`, both refusing `effect-mismatch` (§11.2's one code covers both, so the internal order between them is unobservable and recorded here rather than pinned by test); and THE RELEASE the direct shape's `confirmed → redeemed` edge performs is now also performed by the token path's `redeeming → redeemed` edge — either terminal `redeemed` lifts the Store's C1 hold. The ladder's STRAND set is pinned by test: `seal()`, direct `redeem()`, `open()`'s en-passant blocker-expire, and `beginRedemption` itself all refuse against a `redeeming` record rather than resolving it (`unsealable-state` / `unredeemable-state` / `record-exists` / no re-issue), `listDue` stays blind to it (no clock, no `dueAt`), and `completeRedemption` with the correct token is the sole exit. **UPDATED, at the third step-3 increment: that STRAND set now closes on its own bound wherever `redeemBound` is declared.** One generalized clock module (`kernel/expiry.ts`) derives `pendingWindow` — the confirmed window (`confirmedAt + confirmToRedeem`, only when final-leg, effect-seam, and declared) and the redeeming window (`redeemingAt + redeemBound`, only when declared) — and `resolveDueClock` performs the one shared compare-and-swap append: `confirmed → expired { bound }` (the SAME kind and payload shape as the open window's own edge; the transitioned-from state, not the payload, distinguishes the clause) and `redeeming → redemption-failed { bound }`. The producers: `finalize()`'s success batch stamps `confirmedAt + confirmToRedeem` into `dueAt` on a declaring, final-leg, effect-seam confirm (one clock reading per batch); `beginRedemption` stamps the `redeeming` payload as `{ tokenDigest, bound }` and `dueAt` together iff `redeemBound` is declared — closing the second increment's own present-iff-declared gap in BOTH directions, key-set pins for both profile shapes — undeclared, the payload stays exactly `{ tokenDigest }`, as the second increment pinned. The resolution rung is shared by all three redemption seams' prologue, placed after the effect-seam/final-leg gate and before each seam's own state gate: THE RESOLVER REPORTS the outcome it observes — an elapsed confirmed window resolves to `expired` and the seam refuses `unredeemable-state` (§11.2's preamble: the record is now expired); an elapsed redeeming window resolves to `redemption-failed` and the seam refuses `redemption-timeout`; a seam arriving after someone else's resolution finds the terminal state at its own state gate and refuses `unredeemable-state` too — nothing timed out at THAT call; a lost resolution CAS re-reads once and agrees with what re-invocation would say (the second increment's residual pattern, reused). `finalize()`'s state/expiry gate and `open()`'s exclusivity blocker branch observe the SAME clocks en passant: `finalize()` on a due-confirmed or due-redeeming record resolves it and refuses `leg-expired` / `record-not-open` from the fresh state; `open()`'s blocker branch now expire-then-retries a due-`confirmed` blocker exactly once — the `confirmToRedeem` half of §9.1's un-stranding promise — while a due-`redeeming` blocker still refuses `record-exists` with NO edge, SPEC §4's named exception ("`open()`'s exclusivity check never auto-resolves a `redeeming` blocker, due or not"), now pinned non-vacuously rather than vacuously true. `redemption-timeout` is the fourteenth `RefusalCode`; `replay` folds `redemption-failed` to `state: 'redemption-failed'` AND the constant `refusalCode: 'redemption-timeout'`, no longer throwing on that kind. The GOVERNED `redeemBound` guard (`config.ts`) lifted the same increment — an authorized inversion of the second increment's own construction-validation pin, argued in place at `construction-validation.test.ts` (see the boundary below). §11.2's at-most-once is now COMPLETE: the elapsed-`redeeming` unknown-outcome half joins the already-built replay half — a correct token presented after the bound elapsed gets the resolution and `redemption-timeout`, never a retry of an unknown outcome. The operator's sweep read, `operator.listDue()`, is built too (see the §9 and §12 rows) — a pure passthrough to `store.listDue(now())` under the injected clock, frozen into the operator literal and absent from the agent surface. **Result notarization is built too, at the effect-result increment**: `redeem.result?: true` admits (never requires) a host-claimed outcome digest at the two seams where the outcome is knowable — `redeem()` and `completeRedemption()`, rejected unconditionally at `beginRedemption()` — spliced present-iff-supplied into the `redeemed` payload as `resultDigest` and folded onto `DecisionRecord.resultDigest`; see the dedicated section below | The executor contract — the library never executes the effect, only couples to it — has no host-facing seam beyond the `opts?: RedeemOptions` bag: `tx`, taken by all three seams (register row 16, retired 2026-08-19 by building, shape-updated 2026-08-21), and `result` (the effect-result increment). Four items recorded here rather than left implicit: **(a)** two `unredeemable-state` producer extensions land with the second step-3 increment — a `beginRedemption` against an already-`redeeming` record (no re-issue) and a direct `redeem()` against a `redeeming` record (that ladder holds no token to consume) — both documented at the seam per §8's stability rule rather than slipped in silently; **(b)** begin-time effect-content correspondence is this build's addition, not spec-granted — §11.2's correspondence sentence reads at the effect's execution (completion), but refusing a mismatch before a token is ever issued is exactly what the Honest bound's "mismatched effects refusable at the seam" buys; **(c)** the family-wide CAS-residual re-read — all three redemption seams now re-read the chain once on a failed append and re-run their own state-gate mapping on the fresh state, rather than reporting a flat `unredeemable-state` — is an authorized behavior change to the first increment's own direct seam, whose flat residual was never pinned (that increment's tests deliberately declined a racing store); **(d)** the **"safe to ship, not yet safe to operate" statement RETIRES, at the third step-3 increment, to its truthful successor**: this build is safe to operate wherever a host declares `redeemBound` — the clock that ends the strand now exists, so `completeRedemption` with the token is no longer the sole exit once the bound elapses (the resolution is the other one). A host that omits `redeemBound` accepts the strand risk SPEC §9.1's own SHOULD names, knowingly — a policy choice the host makes at construction, not a truth the library can supply for it. `redeem-token.test.ts`'s no-`redeemBound` strand test (`noRedeemBoundProfile()`) is the executing record of exactly that shape: the same seal/direct-redeem/finalize refusals and the same `listDue`-blind assertion the second increment pinned, now scoped to the one profile shape that still carries them |
| 12 | Storage interface | All eight `Store` methods §12 gives a signature to — `findNonTerminal` landed the third step-2 increment, with C1 exclusivity over the persisted non-terminal flag, C2 server-verified sequencing, C3 terminal monotonicity (including the compromise carve-out) and **C4 seal-finality** all checked atomically inside the append rather than as an advisory pre-check; `putStaged` is "idempotent, first-write-wins"; "All reads return **fresh values**" is honored on every write and read seam, by deep clone on read *and* on write; the persisted `state`, non-terminal and `dueAt` columns are "constraint-and-index only", backing the compare-and-swap, the exclusivity index and the due query, replay over the chain staying the authoritative derivation; digests use the record's recorded algorithm. `appendTransition`'s `meta` argument now matches §12's `{ nonTerminal, dueAt? }` shape exactly, rather than the bare `nonTerminal` boolean it took before. `appendBatch` lands §12's atomic-batch rung whole: the entry compare-and-swap is checked **once** (genesis never appears in a batch); per-element sequencing is server-verified `max+1 … max+N`; terminal-monotonicity runs against the evolving intra-batch state with the terminality input fixed at the entry flag, so a record "cannot become terminal mid-batch"; `meta` is applied once as the post-batch record flags; and the first conflicting element aborts the whole transaction with nothing applied, naming that element's index. `listDue(now)` implements §12's gate verbatim — `dueAt ≠ null AND dueAt ≤ now`, with no state predicate — and, as of the third step-3 increment, `dueAt` has THREE producers: the genesis `opened` append (the profile's open-window deadline, built from the kernel increment on), `finalize()`'s success batch (the declared `confirmToRedeem` window, one clock reading per batch), and `beginRedemption`'s `redeeming` append (the declared `redeemBound` window) — with every state-leaving append, including both clock-resolution edges themselves, clearing it by omission. **C4, built at the second step-2 increment**: after a `sealed` transition lands, set from the transition's kind rather than from `meta`, no further append is admitted through either write seam, each at the reach §12 gives it: `appendTransition` checks seal-finality on every call and reports `state-mismatch`, while `appendBatch` checks it **once at entry** and reports `state-mismatch` at `index: 0`, matching SPEC §12's own words exactly: "Entry-level failures — an entry compare-and-swap mismatch or C4 seal-finality — report element index 0." The batch bar is entry-level only — the per-element loop does not re-evaluate seal-finality against the evolving batch, so a batch carrying a `sealed` element followed by further elements would not be stopped element-by-element. That is what §12 specifies rather than a narrowing of it, and nothing in this build can construct such a batch: `seal()` is the only producer of a `sealed` transition and sends it as a single `appendTransition`. The storage-section "Sealing" paragraph's `seal(recordId)` — verify, resolve profile, already-sealed check, derived-terminal check, then append — is also built (`kernel/seal.ts`), adding no Store method of its own and calling exactly two of them, `readChain` and `appendTransition`, over `chain/replay.ts`'s pure functions; see the §5 row and the eight-of-eight boundary below. **`findNonTerminal`, built at the third step-2 increment**: `(profileId, subjectRef)` to the blocking recordId or null, implemented on C1's own scan predicate (`liveNonTerminalFor`) so the record it returns and the `blockingRecordId` a rejected genesis names agree by construction, with the agreement also pinned observably by test; narrowed like `listDue` — it returns the recordId where §12 says "the live non-terminal record", ids being what every downstream seam takes, and full records requiring the store to replay chains it deliberately does not interpret. **The embedded-SQL adapter, built at the fifth step-2 increment** (`store/sqlite.ts`, `node:sqlite`'s synchronous `DatabaseSync`): C1 as the real partial unique index §12 prescribes, C2 as `PRIMARY KEY (record_id, seq)` with server-verified `max+1` inside the write transaction, C3/C4 evaluated from the same `store/semantics.ts` mapping the memory backing now imports (one copy, no drift), every write inside one `BEGIN IMMEDIATE` transaction with the mutation last, columns constraint-and-index only, transitions as JSON text (fresh values structurally). **`tx?`, built the same increment**: on all three interface writes, adapter-generic (`unknown` on the interface, the adapter's own `DatabaseSync`-with-open-transaction on the class — enlisted, never wrapped, same-connection validated); `MemoryStore` throws loudly on presence, having no driver. The proof structure now runs over two backings: the conformance suite via one caller file per backing, plus the cross-backing byte-identity test (fixed clock and fixed recordId sequence, per-transition JCS-byte equality). **The sweep recipe, built at the third step-3 increment**: `operator.listDue()` is a pure read, `store.listDue(now())` under the injected clock, frozen into the operator literal and absent from the agent surface — SPEC §12's own "the sweep" stays a recipe the operator runs, never a `sweep()` method (§4 ships "no scheduler and no public `expire()`", and a method by that name would be one in all but name). The recipe itself is documented here, not in code: iterate `operator.listDue()`; for each listed record, in a confirmed or redeeming window, drive `redeem(recordId, {})` — the resolution rung precedes correspondence, so any content serves, and the refusal reports the resolution that fired (`unredeemable-state` for an elapsed confirmed window, `redemption-timeout` for an elapsed redeeming one); then `seal()` the resolved records — sweep-then-seal, matching `seal()`'s own no-en-passant-expiry rule (§4/§5), pinned end-to-end by test. **The due-`open` rough edge, recorded honestly beside the recipe**: a due-`open` record has no argument-free resolver of its own — `redeem()` is spec-forbidden from treating a due-`open` record as expired (§4), and `finalize()` needs real arguments (`identity`, `content`, `facts`) the sweep does not have — so a due-`open` record resolves lazily at its next genuine `finalize()` call or at a fresh `open()` for the same `(profile, subject)` pair (§4's own lazy rule), never from the sweep directly. This is the spec's own shape rather than deferred work, so it carries no register row | The narrowings stand as before (`listDue` and `findNonTerminal` return recordIds). `open()` still holds C1's `blockingRecordId` internally and discards it, and a refused `Outcome` still carries no locator field — by design now rather than by gap: the host performs the lookup through the Store read §12 provides for exactly that purpose. `listDue` is narrowed from §12, which says the method "returns the records due": this build's version returns recordIds instead, because ids are what the operator sweep needs and full records would require the store to replay chains it deliberately does not interpret. §12's reference-adapter proof structure is complete for all three reference backings: the "backing-parameterized conformance suite" (test-side, `test/conformance/store-conformance.ts`, at the fourth step-2 increment — 42 migrated store-driven pins plus three store-level `listDue` pins) runs over each by its own one-call caller file — the third, `@vidimera/store-postgres`'s, added at the phase-4 increment that retired register row 15 — and the cross-backing byte-identity test (built at the fifth step-2 increment; see the Built column) holds them equivalent. (This cell said "the two backings that exist", with the server-SQL backing "the remaining absence", until the open-items plan's stage-3 pass corrected it — the landing predated the correction by a day and the survey missed this cell.) Whether the suite is exported as an adapter-author's tool was a 0.1-cut question left dangling when row 6's review retired without ruling on it; DECIDED 2026-08-20 (`docs/analysis/2026-08-20-conformance-export.md`): NOT exported while 0.x — the suite stays test-side, vendoring is the blessed path for a host verifying its own adapter, and the 1.0 store-interface freeze re-asks the question, a separate dev-only package the presumptive shape if it then rules export. See the eight-of-eight boundary below |
| 13 | Privacy & retention | Digest-only custody is real — content never reaches the store — which is what makes §13's pseudonymization guidance implementable by a host. `principal` is stored exactly as supplied. Sealing and the `active`/`retired` distinction are built at the second step-2 increment (§5, §12 rows), so §13's specified end-of-life state — "a record reports as `active` or, once sealed, `retired` — rather than an unexplained gap in the chain" — now exists here | Pseudonymization, retention periods and the purpose-limitation guard remain host duties this build neither enforces nor could |
| 13A | Security considerations | Descriptive, and accurate of this build: the AL1 limit is what `verifyChain` delivers, and "whole-record absence is silent" holds here too — `readChain` returns `[]` for an unknown id, and every audit path runs over what the store returns. **Three of the four named threats §13A says the library addresses are now live**, up from two as of the second step-7 increment: render-to-decide drift (rung (4)), payload-identity forgery (rung (3)), and — newly — late-arriving findings, caught by finding/ack coverage (finalize's rung (5.7)) where a findings flow is configured (§10.2, whole in this build; see the §10.2 row). The fourth, "faithful binding of a wrong draft", is §13A's own non-claim rather than a mechanism a build step switches on: the record proves review and decision, never correctness, and prevention "lives upstream", so it is not counted among the live three | **The AL2 closure §13A names for its first two residuals now exists**, for a SIGNING-declaring profile, as of the enforcement increment (see the §8 and §14 rows) — a non-signing profile, this build's own default, keeps the AL1 exposure exactly as named. The third residual, whole-record absence, stays unclosed even under AL2, per SPEC §13A's own text ("detached signing… verifies only what exists — absence survives it") |
| 14 | Signing & anchoring | AL1 is what ships, and nothing in this build describes it as cryptographic. **AL2's own THREE increments — the mint, the enforcement, then freshness — have all now landed; the layer is load-bearing and AL2 is whole** (see the step-8 row for the full split). Four rulings were taken at the AL2 brainstorm, so a later increment does not re-litigate them: **(1)** signing is per-profile and record-homogeneous — a record opened under a `signing: true` profile is signed WHOLE from its own genesis, mid-chain enablement boundaries never exist, and a same-id profile flipping the field is the version-discipline violation §2's own convention already names; **(2)** the missing-signature posture, BANKED at the mint, is now BUILT — an unsigned or unverifiable transition of a signing record folds into the existing chain-verify outcome at every one of the six verification sites then existing at the enforcement increment, as this row's own enforcement paragraph below states; **(3)** key custody is `keyRef` beside each detached signature, resolved against a host-supplied verifier registry (the canonicalizers-registry precedent) — the library never holds private keys, and an unresolvable `keyRef` reports (never throws) unverified; **(4)** three increments were scoped — mint, enforce, freshness — this row's own marker moved at the second, with the sanctioned sealed-bundle edit below; freshness, the third, has now landed too, with a second sanctioned sealed-bundle edit of its own (see the step-8 row). Landed: `ConfirmProfile.signing?: true` (the literal `true`, not `boolean`, closing the `signing: false` inertness trap at the type level the same way this file's other structural guards do) and `Config.signing?: { signer, verifiers, signatures }` (`config.ts`); a `signing: true` profile with `config.signing` absent throws loud at `create()`, while `config.signing` with no declaring profile is legal (a prepared instance, the unused-canonicalizer-registry-entry class). What is signed is the canonical transition bytes, `encodeTransition(transition)` (`chain/encoding.ts`, the frozen file untouched by the AL2 mint increment) — §14's "Detached signatures over canonical transitions and consultations" is satisfied transition-granularly, since in this build consultations ARE transitions (`consultation-recorded`, finalize's batch). **The mint point is a Store decorator, not per-seam edits**: `signing/decorate.ts`'s `withSigning` wraps the injected store — delegating all eight `Store` methods explicitly by name, since a class-instance object spread would silently drop prototype methods, recorded at the decorator's own header — and intercepts only `appendTransition`/`appendBatch`; it decides whether a record signs from the genesis payload's own `profileId` (memoized per record, one `readChain` genesis read on a decorator-restart-miss fallback), and for a signing record signs every transition BEFORE delegating the append. **Sign-before-append is argued, not incidental**: a crash or lost CAS between the sidecar write and the store append leaves an ORPHAN signature — an entry for a transition that never landed — which is harmless, because verification is chain-driven (it looks up a signature FOR a chain transition, never trusts the sidecar as its own index); the reverse order would risk a LANDED unsigned transition on a signing record, which the enforcement increment's fail-closed posture would then condemn as compromise, so reversing the order would make an honest crash produce a false finding — pinned by `test/signing.test.ts`'s throwing-signer order test (append never lands) and its orphan-invisibility test. `create()` wraps the store iff `config.signing` is present, BEFORE the kernel closures capture it, so every append path — the seams, `finalize()`'s batch, the en-passant clock edges, the reverify drift edge, `sealed` — is covered by construction, with ZERO seam edits and ZERO edits to any frozen surface; the enlisted `tx` seam (the direct-shape `redeem`) passes through untouched, the sidecar write deliberately OUTSIDE any host transaction (an aborted effect's orphan signature is the same harmless class), pinned on the SQLite backing. The reference sidecar, `signing/memory.ts`'s `MemorySignatureStore`, is a Map-backed `SignatureStore` keyed by `transitionDigest`, `put` upserting (a later signature over identical bytes is still evidence for the same digest, never a conflict). **The one audit surface, `operator.verifySignatures(recordId)` (`kernel/verify-signatures.ts`), is a PURE READ**: chain-driven correlation by `transitionDigest` (an orphan sidecar entry is invisible to the report by CONSTRUCTION, not by a filter, pinned by test), reporting `signed`/`verified` per transition plus `signingDeclared` for the record's own genesis-resolved profile — it never refuses, appends, or throws on a verification failure itself (an unresolvable `keyRef`, a failed verifier, or a throwing one all report `verified: false` — fail-closed REPORTING, not a gate); it throws only on the caller-error/unknown-record class every other read takes. Byte-identity is pinned precisely: `signing: true` is a DECLARED control, so it differs the genesis `profileDigest` exactly as every declared control does and nothing more — no signature material appears in any transition of either chain, and a non-declaring profile's chain stays byte-identical to the frozen pins. **The governed count stays UNCHANGED at 1** (the per-leg `freshness` alone, `config.ts`): `signing` is a NEW capability that arrived WITH its own behavior in the very commit that declared it — the `reverify`-arrival class (see the §9.2 row) — never a construction throw standing in for missing behavior that a later commit lifts, so there was never a guard here to begin with — `freshness` itself, the one field still governed at the mint, is the field AL2's own third increment lifts, below, taking the count to zero. **The enforcement increment, second of three, has now landed: the layer is load-bearing.** One shared async correlation core, `kernel/verify-signatures.ts`'s `signatureLayerHolds(ctx, chain)`, factored onto the SAME per-transition walk `verifySignatures` already used rather than duplicating it: `true` when the layer does not apply (the genesis `profileId` resolves to a non-signing or unresolvable profile in THIS instance — the same id-resolution posture `verifySignatures`'s own `signingDeclared` reads by) or when every transition carries a sidecar entry whose `keyRef` resolves and whose verifier passes over `encodeTransition(t)`; `false` on any miss, unresolvable `keyRef`, failing or THROWING verifier (fail-closed). AL1 intactness (`verifyChain(chain).intact`) stays every call site's FIRST, cheap, synchronous check — the layer is consulted only on an intact chain, pinned by a counting-verifier test showing it is never even invoked on a hash-broken one. **All six verification sites then existing enforced, at this increment**, each folding a `false` verdict into the SAME arm its own `!intact` already took, no new code and no new outcome class anywhere: `finalize()` (rung (1)), `seal()`, the redemption family's shared prologue (`kernel/redeem.ts`, serving `redeem`/`beginRedemption`/`completeRedemption` alike — the enlisted direct shape's result-first no-append refusal is INHERITED from the existing hash-break branch, not re-decided), and the findings family's shared prologue (`kernel/findings-seams.ts`, serving `raiseFinding`/`acknowledge` alike) all route a bad layer through `appendChainCompromise` (the seams that already append) or the same result-first shape (the enlisted redemption corner), landing `chain-compromise`; `kernel/prior-legs.ts`'s `verifyPriorLegs` and `kernel/supersedes.ts`'s `verifySupersedes` fold a bad layer into their own existing `{ ok: false }` arm, refusing `prior-leg-unverified`/`supersedes-unverified` respectively — pre-record, never-append, exactly as a hash break there already refused. **The compromise edge itself, appended onto a signing record, is signed by construction**: it lands through the `create()`-level decorator like any other append, pinned by test. **The two audit reads stay separate, deliberately, and neither ever gates**: `operator.verifyChain` remains the AL1 report exactly as before, `operator.verifySignatures` the AL2 report — graduated honesty — and the enforcement increment adds no new refusal code, no new outcome class, no store or encoding change, and zero edits to `chain/encoding.ts`. The suite grew 576 → 583 across 43 files (`test/signing-enforce.test.ts`'s six tests: tamper-one-signature refusals at all four seams and the cross-record claims; the layer's non-overreach on a non-signing record; the unresolvable-`keyRef` fail-closed corner; the order pin that a hash-broken chain never even reaches the verifier — the enlisted redemption corner is a SEPARATE pin, `test/redeem.test.ts`'s own SQLite enlisted suite, not one of these six). **The sealed bundle executed at the enforcement increment's own exit**, a separate commit after the enforcement commit's own gates were green, byte-verified before/after: SPEC §14's AL2 bullet and CONTROLS.md:48's bare cell moved `[SKETCHED]`/`SKETCHED` → `[PROVEN]`/`PROVEN`; `OPEN-QUESTIONS.md` §1's four bullets each gain a tail — granularity, missing-signature posture, and key custody all **Decided (this build)**, authority timestamps **explicitly still open**, this step's own third AL2 increment; SPEC:1233's and CONTROLS.md:48's own "named open decisions"/"granularity open" phrasings rewritten decided-on-record with the §1 pointer; OPEN-QUESTIONS.md §7's opener tense-fixed. **The governed count stayed UNCHANGED at 1** with the enforcement increment too: enforcement is new behavior at an existing seam, never a construction guard lifted — there was no guard here to lift. **`freshness` gating has since landed, AL2's own third increment, taking the count to ZERO — the LAST governed field in this build lifts here.** `Consultation` gains `observedAt?: string` (§2 lists the AL1 shape; the field lands under this row's own admission sentence — "AL2 admits authority timestamps inside digested payloads for required consultations" — an anticipated extension, not a divergence); a signing profile's finalize admits a recorded, signature-covered `observedAt` claim on an obtained consultation, a non-signing profile's throws (the `opts.policy` presence-contract precedent); rung 5.5 gains a freshness arm refusing the twenty-fourth and last code, `consultation-stale`, on a bounded required kind's missing, future, or out-of-bound claim (see the §8 and §11.1 rows for the gate itself). `validateFreshness` (`config.ts`) replaces the GOVERNED throw — the TENTH self-authored inversion in this document's own numbered sequence, the guard-lifting era's own exit (see the boundary below) — closing the feature-guards-from-day-one era the kernel increment opened: every guard it installed has now lifted behind its own behavior, each in the same commit as that behavior. A second sanctioned sealed bundle executed at this increment's own exit: SPEC:527's, SPEC:634's, and SPEC:951's freshness-row `[SKETCHED]` tokens and CONTROLS.md:47's cell moved to `[PROVEN]`/`PROVEN (AL2-dependent)`, and `OPEN-QUESTIONS.md` §1's own fourth (authority-timestamps) tail — the prerequisite this row's own enforcement paragraph above left explicitly open — completed to Decided (this build): the recorded-claim, signing-gated design. The library never verifies the observation happened AT `observedAt` — genuineness stays `proofRef` and the operator-assurance probes, the same class of limit `verifySignatures` itself already carries | **The REHOMING RESIDUAL, named, not closed**: a whole-chain recompute that rewrites the genesis `profileId` to a REGISTERED non-signing profile produces a hash-intact chain the layer does not apply to — the signature obligation is keyed by the genesis's own claim, not by whether the chain was ever actually signed. Closures exist but none is built here: a deployment that registers only signing profiles; a future profileDigest-pinning tightening riding SPEC §2's versioned-id convention. `verifySignatures` already reports the truth either way (`signingDeclared: false` on the rehomed claim), so an auditor composing the two reads sees the rehoming — the guarantee stated with its limit in the same breath, the honesty discipline's own register. `review()` and the other pure reads stay unverified, unchanged — `review` never chain-verified before the enforcement increment and gains nothing here; the enforcement bound was the six sites then existing, stated. **`freshness` gating has since landed too, AL2's own THIRD increment — see this row's own Built-here column and the §8/§11.1/step-8 rows for the gate's full mechanics.** AL2 is whole in this build: all three of its scoped increments (mint, enforce, freshness) have landed. The self-test tier (`OPEN-QUESTIONS.md` §5) has since landed too, at the self-test-tier increment — step 8's own fourth and last tail item, closing the build order at its declared scope (see the CONTROLS §4 row and the step-8 boundary below; deferral register row 17 retires with it). AL3 anchoring remains documented-only, `[SKETCHED]`, untouched by any of the AL2 signing increments or by the self-test tier: CONTROLS §4's own probes re-attack AL1/AL2 behaviors, never a claim about AL3 |
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
`governedUnavailable` (`config.ts`) SURVIVES this exit: it is not itself a
per-field guard, and it still serves the two generic unknown-option-key throws
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
simplified form: only the `seq` shape still reaches `batchConflict` (`kernel/finalize.ts`)
and throws a storage fault naming the shape and index, with nothing recorded; an entry
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
- **Row 22** — orphan sidecar growth on the no-edge refusal path, added by the AL2
  signature-enforcement coverage increment, which found it while closing rows 20 and 21 and
  recorded it rather than fixing it. `appendChainCompromise` (`kernel/finalize.ts`) rebuilds
  its `refused` transition on every call, stamping `at` from the clock; the signing
  decorator signs BEFORE delegating to the store, and `MemorySignatureStore.put` is keyed by
  `transitionDigest`, so a fresh timestamp is a new key rather than an upsert. On a record
  whose state admits no CAS candidate the append never lands and the sidecar keeps the entry
  anyway — measured at six consecutive refusing `finalize()` calls against a sealed signing
  record, which took the sidecar from 5 entries to 11 under a real clock, one fresh orphan
  per call (the readings after each being 6, 7, 8, 9, 10, 11), while the chain stayed at 5
  throughout; under a fixed instant the same six calls left it at 6, every call after the
  first re-signing byte-identical bytes onto one key. Not a soundness defect: both AL2
  consumers walk the CHAIN and look each transition's digest up in the sidecar, never the
  reverse, so an orphan is never visited and cannot make the layer report a false verdict.
  Behavior on a durable `SignatureStore` backing is UNMEASURED. Full account:
  `docs/analysis/2026-08-23-signature-enforcement-coverage.md` (Finding F).
  Trigger (verbatim): "The first increment that changes the signing decorator's
  sign-before-append ordering or `appendChainCompromise`'s candidate walk, or that adds a
  durable `SignatureStore` backing beyond `MemorySignatureStore` — or the 0.1 cut, whichever
  lands first."

Rows 17 and 18 both retired at the self-test-tier increment — step 8's own fourth and
last tail item landed (see the CONTROLS §4 row and the boundary above for the full
account, including the ELEVENTH self-authored inversion row 18 carries), so neither is
listed here any longer. **The build order is complete: no row above carries any of the
eight build-order steps as unfinished work** — of the three surviving rows, row 1 (publish
tooling) is a hygiene gate that outlives the build order by design, held open until the
release workflow it authored is exercised once at the 0.1 cut; row 19 (the AL2
detached-signature sidecar pinning deferral) is a scope gate opened by a later,
post-build-order increment, held open until a signature-encoding or key-handling change
lands, or the 0.1 cut, whichever comes first; and row 22 (orphan sidecar growth on the
no-edge refusal path) is a containment gate opened by the AL2 signature-enforcement
coverage increment, held open until a change to the signing decorator's ordering or the
compromise-append candidate walk, or a durable sidecar backing, or the 0.1 cut, whichever
comes first. Rows 20 and 21 — the two coverage gates a documentation-only findings record
opened over this same surface — retired at that increment, their accounts kept above.

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
than claimed away: **no append site ties the returned transition reference to the appended
edge's own digest.** The assertions accept any defined value, so a wrong digest would pass.
An independent probe confirmed the equality holds in reality; no test states it. Fourth,
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
unsigned one.

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
