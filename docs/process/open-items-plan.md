# The open-items plan

The staged working plan over everything a full-tree survey (2026-08-19) found open,
undecided, or not built — organized to be worked one stage at a time. The survey swept
six slices — the process documents, the sealed concept set (read-only), the paused
release's git history, tracked code, repository infrastructure and the public docset,
and live GitHub/registry state — then ran a completeness pass over the combined
findings. Measurements below (line numbers, live settings, registry state) were taken
against `main` at `1cffe1f` on 2026-08-19 and drift from that moment; every item names
where the truth lives so it can be re-checked at work time.

**What this document is not.** It is downstream of everything it cites and decides
nothing itself. `docs/process/release-checklist.md` stays release day's authoritative
list (stages 4 and 5 below defer to it rather than restate it);
`docs/process/implementation-status.md` stays the authoritative account of what landed;
`docs/process/next-phases.md` stays the roadmap; the deferral register keeps its own
trigger rule. Where this plan and any of those disagree, they win and this plan is
stale. "Stage" here is this plan's own sequence — it is NOT the release attempt's
`phase-0`–`phase-6` numbering (`docs/analysis/2026-08-19-phase-*.md`), which belongs to
that plan alone.

**How items close.** A checkbox ticks only when the closing act named in the item has
actually happened — an edit landed, a ruling recorded, a setting flipped — never on
intention. Several items are decisions: those close by a recorded ruling (the repo's
pattern: a dated record under `docs/analysis/`), and only spawn build work if the
ruling says build. Stages 1–3 are repo-side and owner-independent; stage 4 is gated on
owner actions no commit can land; stages 6–7 are post-0.1. The session-by-session
working method — which brainstorming session covers which items, in what order, with
what preparation — is `docs/process/open-items-sessions.md`.

## Stage 1 — Truth restoration

Drift fixes only: places where a recorded claim contradicts the current tree. No
decisions live here; every fix realigns a statement with behavior that already landed.

- [x] **Two stale "a server-SQL adapter is still future" comments.**
      `packages/record/src/store/store.ts` (line 10) and
      `packages/record/src/store/memory.ts` (line 102) both predate
      `@vidimera/store-postgres`, which ships exactly that adapter
      (`packages/store-postgres/src/postgres-store.ts` calls itself "the provisional
      server-SQL Store"). Closing: reword both to name the adapter that exists.
      Coupling note: `store.ts`'s same sentence carries the committed-read clause that
      stage 3 rules on — either take that ruling first and land one edit, or fix only
      the server-SQL clause and leave the committed-read clause for its ruling.
- [x] **Stale "freshness is the third, still future" header.**
      `packages/record/src/signing/store.ts` (lines 1–3) still describes the AL2
      freshness increment as future; it landed
      (`packages/record/src/refusal-codes.ts`'s `consultation-stale` entry records it,
      and `kernel/finalize.ts`'s rung 5.5 produces it). The header updated its account
      of the second signing increment but never the third. Closing: one-line comment
      edit.
- [x] **Stale `terminalRefusals` caveat in the status table.**
      `docs/process/implementation-status.md`'s §8 row still ends "What remains is a
      caveat, not a gap: a `terminalRefusals` entry that is not a real code is accepted
      at construction and then never matches" — contradicted by the pre-0.1 API
      review's ruling 7 (`docs/analysis/2026-08-19-phase-1-api-review.md`), which made
      construction throw on exactly that. The document's own "Still outstanding"
      section records the resolution; the table row was never updated to match.
      Closing: align the row with the resolution the same document already records.
- [x] **Stale governed-count parenthetical in the status table.**
      The same document's §9 row still reads "now one: the per-leg freshness alone",
      predating the AL2 freshness increment's one-to-zero move that the document's own
      current-state block and step-8 row record. Closing: same-document alignment.

**Not in this stage, deliberately:** the four stale narrative descriptors inside the
sealed set (stage 3's sanction decision — the set is edited through machinery, never
directly), and the committed-read clause (stage 3's ruling).

**Exit:** the four sites match the tree; `pnpm contract-scan`, `pnpm lint`,
`pnpm typecheck`, `pnpm test` all green (comment-only and doc-only edits should move no
behavior).

## Stage 2 — Publish-artifact polish

Everything that sharpens the parked cut before it is picked back up. The cut commit
`8be3fce` is preserved in history ready to cherry-pick; these items change what that
pickup ships or flips, so they land before it.

- [x] **Package-level READMEs.** Neither `packages/record/` nor
      `packages/store-postgres/` contains a `README.md`, so both npm registry pages
      would render blank at 0.1 (npm packs a package-directory README regardless of the
      `files` array — the gap is the files' absence, not the manifests). No record
      anywhere makes blank-page a choice: the phase-2 manifest ruling
      (`docs/analysis/2026-08-19-phase-2-packaging.md`) never mentions a README, and
      neither the release workflow nor the smoke script copies one. Closing: write both
      READMEs (short — name, one honest paragraph, install line, pointer to the guide),
      and verify via `pnpm smoke` that the record tarball carries its README.
- [x] **Two files missing from the cut's flip list.** `SECURITY.md` ("No release …
      has been published — the package is pre-0.1") and `docs/README.md` ("the package
      is not yet published or installable") carry unpublished-state claims, and neither
      appears in `8be3fce`'s file list nor in the release checklist's flip item — a
      straight cherry-pick publishes with two stale claims on `main`. Closing: add both
      files to `docs/process/release-checklist.md`'s flip checkbox so the pickup commit
      flips them with the rest.
- [x] **The smoke test consumer-tests only the record tarball.**
      `scripts/smoke-pack.mjs` builds, packs, and consumer-tests `packages/record`
      only; the store-postgres artifact (including its rewritten `workspace:^` peer
      range) was consumer-tested exactly once, at the 2026-08-19 same-machine
      rehearsal — yet the release workflow publishes both packages after re-running this
      record-only smoke. Unlike the api-sync script, the smoke script does not record
      its own bound. Closing: extend the smoke to pack and consumer-test both tarballs,
      or record the record-only bound in the script's own header — one of the two, on
      record.
- [x] **The adapter's supported PostgreSQL range is undeclared.** No manifest field,
      doc, or comment states which server versions `@vidimera/store-postgres` supports.
      The code's hardest floor — `hashtextextended`, PostgreSQL 11+ — sits unstated at
      `packages/store-postgres/src/postgres-store.ts` (line 285); the test evidence
      spans an embedded server pinned to a beta-channel devDependency
      (`embedded-postgres` 18.4.0-beta.17) and the Windows CI leg's unpinned
      preinstalled service. Closing: declare the supported range where adopters will
      read it (the new adapter README and/or `docs/guide/integrating.md`), and take a
      posture on the beta pin (acceptable for a dev-only dependency, or move to a
      stable line) — recorded either way.

**Exit:** a cherry-pick of `8be3fce` plus this stage's landed changes would publish
with no blank registry page, no stale unpublished-state claim, both tarballs
consumer-tested (or the bound recorded), and a declared PostgreSQL floor.

## Stage 3 — Postures and rulings

Questions with no decision on record. Each closes by a dated ruling (the
`docs/analysis/` pattern); "no" is as valid a closure as "yes", but silence is not.
This repo writes down every bound it accepts — these are the exceptions the survey
found.

- [x] **Conformance-suite export.** `docs/process/implementation-status.md`'s §12 row
      states "whether the suite is ever exported as an adapter-author's tool is a
      0.1-cut question alongside register row 6's review, deliberately not decided
      now" — row 6's review completed and retired 2026-08-19 without ruling on it, so
      the question dangles on a fired companion. The suite remains test-side
      (`packages/record/test/conformance/store-conformance.ts`). Closing: rule export
      or not-exported; if export, the build work is stage 6's.
- [x] **Multi-package versioning mechanics.** The phase-2 packaging ruling deferred
      versioning tooling with a named trigger — "revisit when the row-15 adapter
      package lands" — and the adapter landed the same day; the trigger has fired and
      no document revisits it. Whether the two packages version in lockstep or
      independently after 0.1, and whether tooling arrives, is undecided on a fired
      trigger (the checklist's "both to 0.1.0" covers only the first cut; the
      CHANGELOG's semver line covers policy, not mechanics). Closing: a recorded
      ruling.
- [ ] **Coverage posture.** No coverage script, no vitest coverage configuration, and
      no record that a coverage metric was considered and declined — unusual against
      the repo's habit of recording every accepted bound. The already-recorded
      probe-tier can-fail hole (stage 6) is the class of blind spot a number could
      surface. Closing: add the tooling or record the no-metric posture.
- [ ] **Performance posture.** No benchmark, perf test, or throughput documentation
      exists, and nothing records performance work as out of scope (the docset's
      "performance" mentions concern reviewer-surveillance ethics, not library
      throughput). Plausible unmeasured hot paths exist: the per-append `FOR UPDATE`
      row lock and per-(profile, subject) advisory lock in
      `packages/store-postgres/src/postgres-store.ts`, and the O(chain) whole-chain
      verifies. A pre-0.1 embedded library can legitimately skip this — the skip is
      what goes on record. Closing: a recorded posture; if measure, stage 7 holds the
      build candidate.
- [ ] **Actions pinning: tag vs. commit SHA.** Both workflows pin actions by mutable
      major tag (`actions/checkout@v7` et al.), not SHA; the phase-3 CI record rules on
      the matrix, Dependabot, and CODEOWNERS but is silent on pinning — undecided by
      silence, notable because `release.yml` holds `id-token: write` and the npm
      token. Dependabot updates SHA pins too. Closing: pin to SHAs or record
      tag-pinning as the accepted posture.
- [ ] **The committed-read clause.** `packages/record/src/store/store.ts` (line 11)
      says the Store shape "WILL change (a committed-read surface is still
      named-not-built, SPEC §12 …) at a later build step" — but the eight-step build
      order is complete; no later build step exists to land it. Closing: rule build
      (then it needs a register row with a trigger) or re-record (reword the comment to
      name the surface as unscheduled, or hang it on the 1.0 freeze where OPEN-QUESTIONS
      §9 already lives).
- [ ] **The sealed set's four stale narrative descriptors.** Four passages describe as
      sketched/designed what SPEC now marks `[PROVEN]`: `docs/concept/ASSURANCE.md` §6
      still calls AL2 "operator-enabled upgrade (sketched — enablement design open)";
      `docs/concept/SCOPING-GUIDE.md` §5 says "AL2/AL3 — both sketched" and its §7 calls
      steps 7–8 "the designed/sketched continuation"; `docs/concept/ARCHITECTURE.md`'s
      gate-ladder rung tags ack-coverage "(findings-flow only; designed)". Each
      contradicts SPEC §14 / §10.2 and misleads a reader about what exists only on
      paper (the true answer: AL3 alone). These are downstream-doc conflicts in
      CLAUDE.md's sense — but the set is SEALED, so the fix is not an edit: the
      decision here is whether to seek a fresh sanction through
      `docs/concept/SCOPING-GUIDE.md` §§1–2's machinery (the 2026-08-19 corrective pass
      is the precedent shape) or to record the drift outside the set, visibly, without
      touching it. Closing: that decision, recorded; the edit itself only under
      sanction.
- [ ] **(Minor) The 13 standing Biome lint infos.** `pnpm lint:strict` errors on
      warnings, so infos pass every gate; no posture on the infos themselves is
      recorded. Closing: clear them or record leaving them — smallest item in this
      stage, listed for completeness.

**Exit:** no question the survey surfaced remains without either a dated ruling on
record or a named trigger in the deferral register.

## Stage 4 — The pickup (owner-gated)

`docs/process/release-checklist.md` is the authoritative list here — its PAUSED banner
carries the exact pickup instructions (cherry-pick `8be3fce`, refresh every 2026-08-19
release date, re-run all gates, tag, push, resume at "Repository and registry
settings"). This stage does not restate it; it records what the survey verified live on
2026-08-19 so the pickup starts from measured fact:

- The four owner-side items that stopped the paused attempt were all confirmed still
  open: the secrets list is empty (no `NPM_TOKEN`), both packages 404 on the registry
  (no `@vidimera` scope has published), the repository is private, and both the private
  vulnerability-reporting and branch-protection settings are unreachable while it stays
  private on the current plan (the protection endpoint answers 403,
  "upgrade or make public" — so flipping visibility unblocks both settings, and the
  order the checklist fixes still holds: public before the dispatch).
- The stale remote tag `v0.1.0` from the paused attempt still exists (annotated tag
  `49502c3`, pointing at `8be3fce`) — the checklist's conditional deletion is live, and
  left standing it collides with the pickup's own re-tag.
- Two decisions are re-decided at pickup, not carried, per the banner: the Node floor
  rule (weighing the phase-6 rehearsal's finding that the `node:sqlite`
  ExperimentalWarning fires on ANY `@vidimera/record` import — and its recorded,
  untaken alternative, a lazy `SqliteStore` load that reshapes the entry point after
  the closed API review) and the clean-machine first-use waiver (the same-machine
  rehearsal deliberately does not claim that bar).
- One piece of pure housekeeping rides along: `origin/adopt-reference-implementation`
  is fully merged (zero commits ahead of `main`) and can be deleted at the next push
  the owner instructs.

**Exit:** the checklist's preconditions, floor rule, file changes, and repository and
registry settings sections are complete — through its own checkboxes, not this
document's.

## Stage 5 — Dispatch, verification, paperwork

Entirely the release checklist's closing sections; listed here only so the plan runs to
the end. The dispatch-only release workflow has never run (zero runs as of 2026-08-19 —
register row 1's trigger not yet fired). After it runs once: the clean-machine registry
install with the `./probes` subpath check, then the paperwork — retire register row 1
(the table empties), the retirement note in
`docs/process/implementation-status.md`, the roadmap update in
`docs/process/next-phases.md`, and the measured block refreshed to the published state,
dated.

**Exit:** both packages live on the registry with provenance; the deferral register is
empty; the status documents say so.

## Stage 6 — The pre-1.0 program

Post-0.1 work with a recorded basis today. Items here are candidates ordered by how
much of their shape already exists on record; none is committed until it gets its own
scoping.

- [ ] **Can-fail discipline, suite-wide.** Of the seventeen operator-assurance probes,
      four families plus the runner-catch path are demonstrated able to FAIL against
      deliberately broken drivers; the other eleven refusal-assertion probes pin only
      their conforming-host pass path (`docs/process/implementation-status.md`'s
      CONTROLS §4 row records the bound honestly; no register row tracks closing it).
      The shape of the work: one deliberately-broken driver per remaining probe family,
      proving each probe can fail.
- [ ] **Deeper-leg and deeper-chain driver shapes.** Two probes name it in their own
      not-driven messages: consultation-genuineness drives only the leg-0 shape, and
      sod-refuses only the two-leg shape — "deeper legs/chains are a pre-1.0
      driver-shape question" (`packages/record/src/probes/probes.ts`, the not-driven
      arms). A host declaring those controls only beyond the driven positions gets
      not-driven, never coverage.
- [ ] **The store interface freeze — the 1.0 gate.** OPEN-QUESTIONS §9: behaviors
      stable, method signatures provisional pre-1.0 — whether the meta-object form is
      final and whether a driver-generic transaction type parameter survives, plus SPEC
      §12's sweep-signature provisionality, all freeze in one deliberate decision at
      1.0. Until then the PUBLIC-BUT-UNSTABLE markings across the store, operator,
      probe, and signing surfaces stand.
- [ ] **The conformance-suite export — if stage 3 ruled export.** The landing work:
      packaging the suite behind a public subpath with the same provisional-signature
      discipline as everything else pre-1.0.
- [ ] **The rehoming-residual closures — consider, not owed.** The AL2 rehoming
      residual is a recorded limit, deliberately unclosed (`verifySignatures` reports
      the truth either way); its two named closures — a deployment registering only
      signing profiles, or a profileDigest-pinning tightening — are candidates a 1.0
      review should weigh, not debts.

**Dormant, with named triggers — watched, not worked:** OPEN-QUESTIONS §6's registry
candidates (`unknown-staged`/`unknown-record` mint only if a real host hits the
process-boundary case; the caller-error posture is the decision of record) and
OPEN-QUESTIONS §10's AL3 interval-and-disclosure design (activates only with a threat
model where key custody itself is in doubt).

## Stage 7 — The horizon

Candidates only. Each needs its own scoping — and where one touches the sealed set,
its own sanction — before any work starts.

- **A third store adapter.** Would prove the exported conformance suite (if stage 3
  ruled export) against an author who is not this repository, the way store-postgres
  proved the suite's parameterization.
- **An in-repo examples host.** The guide carries verified snippets; a small living
  host showing one real approval flow end-to-end (staging, legs, consultations, a
  refusal, the audit read) would show composition the snippets cannot. In-repo keeps
  the standalone contract trivially satisfied.
- **A benchmark suite — if stage 3 ruled measure.** The append path under contention
  and the O(chain) verifies are the first candidates.
- **SPEC §10.3's reverse cross-instance direction made normative.** The build already
  behaves fail-close and the sealed set records that decision (OPEN-QUESTIONS §2's
  tail, added by the 2026-08-19 sanctioned pass) — but SPEC §10.3's own text still
  frames fail-close as "the recommendation on record", a named open decision about the
  spec's future revision. Making it normative is a sealed-set revision through
  SCOPING-GUIDE §§1–2's machinery only.

## Appendix — surveyed and not open

Named so nobody re-litigates them from this plan. The survey confirmed each of these is
a recorded limit or a deliberate exclusion, not pending work: AL3 as an active level
and every capability meaningful only with an outside party (the concept's own scope
line); concurrent legs (out pre-1.0 by declaration); the host-layer product boundary;
whole-record absence staying silent at every shipped level (AL2 verifies only what
exists); freshness gating inert at AL1 by construction; the due-`open` rough edge (the
spec's own shape, no register row); the omitted-`redeemBound` strand risk (a host's
recorded choice); single-algorithm digest agility (room left, nothing pending); the
prepared-signing-without-declaring-profile tolerance (stated in `create.ts`); the
deliberately unfrozen construction and read-convenience surfaces (SPEC's own header);
the CI matrix's exact-floor-on-ubuntu-only bound (phase-3 ruling 1, deliberate); and
the two surviving `governedUnavailable` throws (permanent unknown-option-key caller
guards in `finalize()` and `open()` — not feature guards awaiting a lift). Also
measured clean at survey time: zero TODO/FIXME markers in tracked code, zero test
skips, an empty issue and PR tracker, and only dev-only patch drift outstanding, which
weekly Dependabot already covers.
