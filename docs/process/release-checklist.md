# The 0.1 release-day checklist

> **PAUSED — 2026-08-19; list refreshed 2026-08-29.** The cut was prepared and run to the
> owner-action boundary on 2026-08-19, then deliberately paused and reverted so `main` carries
> no published-state claim while parked. The complete release commit of that attempt —
> versions bumped, `private` dropped, the CHANGELOG's `[0.1.0]` section cut, every docset
> caveat then known flipped — is preserved in history as `8be3fce` ("The 0.1 cut: …"),
> reverted whole by the commit that added the original notice. **Do not cherry-pick it.** It
> is stale in content, not only in date: `[Unreleased]` has gained six entries since (three
> post-build-order promotions, `SignatureReport.orphans`, and two `Fixed` entries), the
> "File changes" list below gained four docset flips that commit never touched (`SECURITY.md`,
> `docs/README.md`, both package READMEs), and `CLAUDE.md`'s honest-bound paragraph has been
> rewritten several times. **To pick the cut back up:** compose the release commit fresh from
> the "File changes" list below against the tree as it stands, using `8be3fce` only as the
> precedent for what such a commit looks like — and re-cut the CHANGELOG's `[0.1.0]` section
> from `[Unreleased]` as it reads on the day, never from the preserved wording. Then run every
> gate, commit, tag `v<version>`, push with the tag, and resume at "Repository and registry
> settings" below.
>
> **State of the two engineering preconditions, as of 2026-08-29.** The clean-machine
> first-use pass is DISCHARGED BY CONSTRUCTION: `.github/workflows/first-use.yml`'s
> `first-use` job has no checkout step, and `First-use run 33242645696 on origin` (commit
> `5c036d0`) reached verified chains over `MemoryStore` and a `PostgresStore` against a service
> the job owned, on Node `v22.16.0` and `v24.19.0` — `docs/analysis/2026-08-29-first-use-proof.md`
> is the record, and its checkbox below is ticked against it. The floor rule was evaluated
> 2026-08-29 and did NOT fire (its own item below records why); the floor stays `>=22.16`.
>
> **The stale tag is gone.** The remote and local tag `v0.1.0` from the paused attempt, which
> pointed at `8be3fce`, was deleted on 2026-08-29 on the owner's authorization; a tag can be
> recreated on that commit in one command if ever wanted, and the commit itself stays in
> history.
>
> **What stopped the paused attempt, all still open, none the repository's to close:** the
> npm `@vidimera` scope and a live granular `NPM_TOKEN` secret; the repository visibility flip
> (blocked from automation by design — run `gh repo edit allafta/vidimera --visibility public
> --accept-visibility-change-consequences` yourself); private vulnerability reporting; and the
> code-owner branch protection. Two of those are not merely undone but UNAVAILABLE while the
> repository is private — the platform refuses both branch protection with code-owner review
> and private vulnerability reporting on a private repository under this account's plan — so
> "public first, then dispatch" below is not only npm's provenance ordering; it is the
> precondition for two other settings on this list. The clean-machine precondition was
> owner-waived at the paused attempt; that waiver is now moot, since the precondition is
> discharged.

The one list release day runs from, collected across the release plan's phase records
(`docs/analysis/2026-08-19-phase-0-decisions.md` asked for it; the phase 2, 3, and 5
records each contributed items; the 2026-09-01 gaps record,
`docs/analysis/2026-09-01-zero-one-cut-gaps.md`, added the entry-point decision and the
pre-flight section and turned the docset flip from an enumeration into a recipe). Ordered:
preconditions, the rule to evaluate, the entry-point decision, file changes, repository
settings, pre-flight, the dispatch, the verification, the paperwork. Nothing here is
optional; several items are settings no commit can land, which is why this list exists as
a list rather than as code.

## Preconditions (before the day is scheduled)

- [x] Phase 6 of the release plan (first-use validation) has run: one documented,
      reproduced first-use pass from packed artifact to verified chain on a machine that
      never held this checkout. **Discharged by construction, 2026-08-29:**
      `.github/workflows/first-use.yml` (dispatch-only) packs both tarballs in one job and
      installs them in a second that has NO checkout step; `First-use run 33242645696 on
      origin`, commit `5c036d0`, reached verified chains over `MemoryStore` and a
      `PostgresStore` against a service the job owned, on Node `v22.16.0` and `v24.19.0` —
      `docs/analysis/2026-08-29-first-use-proof.md` is the record (the owner ruled a
      no-checkout GitHub-hosted runner meets the bar). The bound, in the same breath: ubuntu
      only; tarball source only until the cut; the getting-started prose itself unproven; the
      probe tier not run. (The same-machine rehearsal of 2026-08-19 —
      `docs/analysis/2026-08-19-phase-6-rehearsal.md` — remains the record of the first pass
      and of the finding that shaped the floor rule.)
- [ ] The CI test gate is live on the run being trusted: each of the four `test` legs of the
      latest `main` run prints `ci-assert-tests: ok — N tests in F files …` with N and F equal
      to `docs/process/implementation-status.md`'s measured count, and the release workflow
      will print the same line before it publishes. Until the CI test-gate repair (2026-09-03)
      every test leg concluded success regardless of failures — no earlier green run is
      evidence of anything but the step having run.
- [ ] The owner's own bar from the phase-0 record holds: nothing goes public before the
      project is actually ready — this list executes that decision, never substitutes
      for it.

## The floor rule (phase-0 ruling 3 — evaluate, then act)

- [ ] Check whether a maintained Node line carries a **stable** `node:sqlite` as of
      release day. If yes: raise `engines.node` in the root and both packages, and the
      CI matrix's exact-floor job, to that version — the ExperimentalWarning question
      disappears. If no: ship as-is; the warning, why it appears, and the
      `--disable-warning=ExperimentalWarning` flag are already documented in
      `docs/guide/integrating.md`. Weigh it knowing the phase-6 rehearsal's finding: the
      warning fires on ANY `@vidimera/record` import (the entry point re-exports
      `SqliteStore`), so every adopter meets it at hello, whatever store they use — that
      finding's own question now has its own item, "The entry-point decision" below, and is
      no longer settled inside this one.
      **Evaluated 2026-08-29 — the rule did NOT fire.** `node:sqlite` reached Stability 1.2
      (release candidate) in Node 24.15.0, not Stability 2; `engines.node` stays `>=22.16` in
      the root and both packages, and CI's exact-floor leg stays 22.16.0. What DID change is
      the fact this rule was written to weigh: the change that made it a release candidate
      also removed the runtime `ExperimentalWarning`, so on 24.15 and later an adopter sees
      nothing at import — measured, not assumed, by `First-use run 33242645696 on origin`
      (`v22.16.0` warns, `v24.19.0` silent; `docs/analysis/2026-08-29-first-use-proof.md`).
      `docs/guide/integrating.md` and `packages/record/README.md` now say exactly that, so the
      "meets it at hello" finding is true only for adopters below 24.15. Re-evaluate on the
      day against the Node lines THEN: if any maintained line has reached Stability 2, this
      rule fires as written.

## The entry-point decision (`SqliteStore`'s eager re-export)

- [ ] Rule on whether `packages/record/src/index.ts` keeps re-exporting `SqliteStore`
      eagerly, so that `node:sqlite` loads — and, below Node 24.15, warns — on any
      `@vidimera/record` import whatever store the adopter chose. **This is the only
      cut-gating decision that changes what an adopter meets at `import`, and until
      2026-09-01 it had no item of its own**: it was weighed inside the floor rule's prose
      above, which is how a behavioral decision gets defaulted into rather than taken. It is
      listed separately here because the floor rule can fail to fire — as it did on
      2026-08-29 — while this question still wants an answer. The three recorded exits:
      - **Ship as-is** (the recorded default, `docs/analysis/2026-08-19-phase-0-decisions.md`):
        the warning stays for adopters below 24.15 and the documented
        `--disable-warning=ExperimentalWarning` flag is the shipped answer. The entry point
        stays exactly what the 2026-08-19 API review closed on.
      - **Lazy-load** `SqliteStore` so `node:sqlite` loads on first construction. Honest in
        shape — an adopter on `MemoryStore` or Postgres never asked for `node:sqlite` — but it
        reshapes the entry point after a closed review, so it needs its own recorded ruling,
        and `.github/workflows/first-use.yml`'s warning assertions must then expect silence
        on both legs, with `docs/guide/integrating.md` and `packages/record/README.md` moving
        with it.
      - **Raise the floor to 24.15**, which drops the 22.x line the floor rule was written to
        keep and keys on the warning rather than on Stability 2, contradicting that rule as
        written.

      Whichever is chosen, record it — a default taken knowingly is a ruling; a default
      taken by silence is the thing this item exists to prevent.

## File changes (one commit, tagged)

- [ ] Bump `version` to `0.1.0` in `packages/record/package.json` **and**
      `packages/store-postgres/package.json` (the phase-5 ruling: both packages publish
      at the cut; the 2026-08-20 versioning ruling: lockstep — both packages carry the
      same version and both publish, at this cut and every later one,
      `docs/analysis/2026-08-20-versioning-mechanics.md`).
- [ ] Drop `"private": true` from both manifests — the one deliberate publish block.
- [ ] `CHANGELOG.md`: cut a `[0.1.0]` section from `[Unreleased]`, dated — **and flip the
      file's own two unpublished-state claims in the same edit**, because cutting the
      section alone leaves the file contradicting itself: the preamble ("**No release has
      been cut.** The package is pre-0.1 and unpublished") and the "Known not-done" block's
      first bullet ("The release itself: the package is `private: true` and unpublished by
      design until the 0.1 cut"). Both are found by the tier-1 recipe in the next item;
      neither was named by any earlier version of this list. A third hit, inside the
      publish-tooling entry ("The package stays `private: true` until the 0.1 cut by
      design"), is that entry's own narration of what it did and stays as written —
      rule on it, do not flip it.
- [ ] Flip the docset's "unpublished" caveats to the published truth. **Find the sites by
      running the recipe, not by reading a list.** This item was an enumeration of named
      sites until 2026-09-01, and an enumeration maintained by hand across a growing docset
      was short twice: the open-items plan's stage-2 pass found four sites the paused
      attempt's flip set had missed (`SECURITY.md`, `docs/README.md`, both package READMEs),
      and the 2026-09-01 gaps record found three more this list still did not name (both
      `CHANGELOG.md` claims, now folded into the item above, and the two workspace caveats
      tier 2 catches). The recipe is the check; the worked example below is only what it
      caught on 2026-09-01.

      ```sh
      # Tier 1 — claims that go FALSE at the cut. Rule on every hit, then re-run:
      # this must come back EMPTY before the release commit is made.
      git grep -nE 'private: true|unpublished|not yet published|is not published|no npm install|does not exist as an option|No release has been cut|not yet published or installable|until the 0\.1 cut' -- README.md CHANGELOG.md CONTRIBUTING.md SECURITY.md docs/README.md 'docs/guide/*.md' 'packages/*/README.md'

      # Tier 2 — claims that need a RULING, not necessarily a flip: a from-source or
      # in-this-workspace sentence can stay true for a reader inside the workspace while
      # being the wrong sentence for an adopter. This one need not come back empty; every
      # hit must have been looked at.
      git grep -nE 'from source|this workspace|deep import|pre-0\.1' -- README.md CHANGELOG.md CONTRIBUTING.md SECURITY.md docs/README.md 'docs/guide/*.md' 'packages/*/README.md'
      ```

      **Worked example, measured 2026-09-01 at `565f7b4`** — tier 1 returned 16 hits in 9
      files and tier 2 returned 22, together covering: `README.md`'s status paragraph,
      `docs/guide/getting-started.md`'s honest precondition, `docs/guide/api-reference.md`'s
      header caveat AND its second workspace caveat at the probe-tier section,
      `docs/guide/faq.md`'s is-it-production-ready answer, `docs/guide/integrating.md`'s
      probe-tier deep-import caveat (a file no earlier version of this list named),
      `SECURITY.md`'s supported-versions section, `docs/README.md`'s "not yet published or
      installable" line, both package READMEs' status blocks, and the three `CHANGELOG.md`
      hits the item above rules on. Expect the numbers to have moved; the recipe, not the
      count, is what release day runs.

      One trap, named so nobody walks into it: THIS file contains the recipe's own search
      terms, as regex and as prose. The path list above deliberately excludes
      `docs/process/`, and widening it to the process docs would make the recipe match
      itself and every historical account in `implementation-status.md` — which describe
      the pre-cut state correctly, in the past tense, and must not be flipped.

      Then verify the README's headline snippet (`import ... from '@vidimera/record'`) is
      now literally true.
- [ ] The `CLAUDE.md` skim (phase-0 ruling 6): remove private-workflow residue; update
      its honest-bound paragraph to the published state.
- [ ] Run every gate (`pnpm typecheck && pnpm test && pnpm build && pnpm smoke &&
      pnpm lint:strict && pnpm contract-scan && pnpm api-sync && pnpm docs-index-sync`),
      commit, tag `v0.1.0`, push the tag.

## Repository and registry settings (no commit can land these)

- [ ] **The repository is public BEFORE the dispatch.** `npm publish --provenance`
      rejects publishes whose source repository is private — flipping visibility is the
      phase-0 release event anyway, but the ORDER matters: public first, then dispatch.
- [ ] The npm `@vidimera` scope exists and the `NPM_TOKEN` repository secret carries a
      **live granular access token** with publish rights for the scope — classic
      automation tokens can no longer be created, and granular tokens expire, so verify
      the token's validity near the dispatch, not weeks before.
- [ ] GitHub **private vulnerability reporting** is enabled — `SECURITY.md` and
      `.github/ISSUE_TEMPLATE/config.yml` both route reporters there and are asserting a
      setting only this checkbox makes true.
- [ ] Branch protection with **require review from code owners** is enabled —
      `.github/CODEOWNERS` guards `docs/concept/` and the frozen byte-stability test, and
      is advisory until this is on. Enable **required status checks** in the same setting —
      the `checks` job and the four `test` legs of `ci.yml`: since the CI test-gate repair
      (2026-09-03) a green test leg verifies that its tests passed, and before it none did.

## Pre-flight, immediately before the dispatch

The dispatch is the only step on this list that cannot be undone, and until 2026-09-01 it
was also the only one with nothing in front of it: `release.yml`'s guard checks the two
things the repository can see (`private`, `0.0.0`) and nothing about the registry it is
about to write to. Do these in the same sitting as the dispatch, not the week before.

- [ ] **Dispatch the release workflow once in dry-run mode** (`dry_run: true`) against the
      release commit's tree and read it green: the guard reports without blocking (on a
      pre-release tree it refuses and the run continues; on the release commit's tree it must
      pass), both publish steps are skipped, every gate runs, and both tarballs pack — the
      only way the job's YAML and its gate chain execute on the release runner before the
      real dispatch. It was first dispatched
      2026-09-03 against the pre-release tree (run 33713900951: every gate green, the guard
      and both publish steps skipped, both tarballs packed), which proves the job's
      structure, not the release commit's tree, so this box is release day's own.
- [ ] **Prove publish rights against the live scope, not just token validity.** This sharpens
      the token item in the section above rather than repeating it: a token that authenticates
      and a token that may publish to `@vidimera` are different facts, and only the second one
      matters. Check the authenticated identity and the scope's permissions
      from the token you are about to hand the workflow, and confirm neither package name is
      already taken. A `--dry-run` publish of the packed tarball exercises the same path
      without writing.
- [ ] **Know the recovery before you need it.** The publish is not atomic: `release.yml`
      publishes `@vidimera/record` first and `@vidimera/store-postgres` second, in one job.
      If the second fails, the first is live and immutable, and the registry is in the state
      the lockstep ruling forbids (`docs/analysis/2026-08-20-versioning-mechanics.md`: both
      packages carry the same version and both publish). The escape hatch is npm's unpublish
      window — as this is written, a version may be unpublished within 72 hours of its
      publication, after which the version number is burned permanently even if unpublished.
      That is an external policy this repository cannot verify: **confirm it on the day**, and
      if the window has closed or the policy has changed, the only exit is a 0.1.1.
- [ ] **Know what state `main` is in if the dispatch never succeeds.** The release commit
      flips the docset to published truth, and it is committed, tagged and pushed BEFORE the
      dispatch runs. Between the two, `main` asserts a publish that has not happened. That is
      exactly where the 2026-08-19 attempt stopped, and the answer then was to revert the
      whole commit — `8be3fce`, preserved in history, reverted whole; the tag was deleted
      later, on 2026-08-29. If the dispatch fails and cannot be re-run the same day, take
      that path rather than leaving the claim standing.

## The dispatch

- [ ] Run the **Release** workflow (`.github/workflows/release.yml`, dispatch-only). Its
      guard refuses any package still carrying `private: true` or `0.0.0`; it re-runs
      every gate, then publishes `@vidimera/record` first and `@vidimera/store-postgres`
      second (tarball-first, so the adapter's `workspace:*` peer range is rewritten),
      both with provenance. This is the register's row-1 trigger firing: the first
      exercised publish.

## Verification, then the paperwork

- [ ] Re-prove the PUBLISHED artifacts on a machine that never held this checkout: dispatch
      `.github/workflows/first-use.yml` with `source: registry` and `version: 0.1.0` — the same
      no-checkout job that discharged the precondition above, now installing
      `@vidimera/record` and `@vidimera/store-postgres` from the registry, running the
      getting-started flow to a verified chain over both stores, and confirming the `./probes`
      subpath resolves. Record the run id and both legs' results in a dated
      `docs/analysis/` record. Three improvements are parked for THIS dispatch's own commit so
      the recorded tarball run's script stayed byte-identical until now: the floor leg's
      warning grep narrowed to `ExperimentalWarning: SQLite`; a header note that the script's
      `import pg from 'pg'` resolves only because npm hoists the adapter's dependency; and the
      review view's `subjectRef` assertion the guide's own test makes.
- [ ] Retire register row 1 (`docs/process/deferral-register.md` — row 1 leaves the
      table), with the retirement note in `docs/process/implementation-status.md` and the
      roadmap update in `docs/process/next-phases.md`.
- [ ] Decide register row 19's disposition (`docs/process/deferral-register.md`, the AL2
      detached-signature sidecar pinning deferral) — its own trigger ("The first increment
      that changes signature encoding or key handling, or the 0.1 cut — whichever lands
      first") names this cut too, so release day must retire it or explicitly carry it
      forward rather than leave it unaddressed; if retired, give it the same
      retirement-note/roadmap-update treatment as row 1.
      **Expected ruling, pre-argued 2026-08-29 (release day confirms or overrules; the row is
      NOT decided here):** carry forward. Nothing has changed signature encoding or key
      handling since the row opened on 2026-08-23 — the decorator's memo (the no-edge
      containment increment) changed how many times a signer is asked, never what is signed or
      how it is keyed — so the row's first disjunct has not fired and the deferral's reason
      stands. Carrying it forward means restating the row's trigger without the "or the 0.1
      cut" disjunct and recording that ruling in `docs/process/implementation-status.md`.
- [ ] Decide register row 22's disposition (`docs/process/deferral-register.md`, orphan
      sidecar growth on the no-edge refusal path — the row's surviving half, 22a: each
      refusing seam call against a record whose persisted state admits no CAS candidate
      mints one orphan sidecar entry naming a transition that never lands. An orphan never
      produces a verdict, because both AL2 kernel readers correlate from the chain to the
      sidecar — but every sidecar row IS fetched on every verification, so this is a
      storage and observability finding, not a soundness one. The redundant-signing half,
      22b, CLOSED on behavior at the no-edge containment increment, 2026-08-29: one mint per
      transition instead of one per CAS candidate, and one dead candidate dropped from the
      walk — so no wasted-signing cost remains to weigh). What remains open cannot be closed
      by a fix in this repository as it stands: every measured containment for 22a predicts
      the store's C3 and C4 answer from a chain that failed verification, a chain-local
      precheck was measured to suppress a compromise evidence edge that lands today, and the
      two divergence shapes are permanent must-not-change pins
      (`packages/record/test/no-edge-containment.test.ts`). Closing 22a therefore means
      seeking a sanction for that trade, or accepting the delegation already stated in the
      `SignatureStore` contract — a conforming sidecar holds orphans and a bounded backing
      reconciles against the chain
      (`docs/analysis/2026-08-24-no-edge-containment-investigation.md`). Its own trigger
      (verbatim) — "The first increment that adds a durable `SignatureStore` backing beyond
      `MemorySignatureStore` — the only implementation in the tree, and the reason unbounded
      growth is unmeasured here; or that lifts `private: true` and publishes the package,
      since a host's durable backing arrives through the documented `signatures:` hook in the
      operator's own deployment, where no in-repo event fires; or that seeks a sanction
      through `docs/concept/SCOPING-GUIDE.md` §§1–2 to decide C3 and C4 from the read chain,
      the third horn; or the 0.1 cut — whichever lands first." — names this cut too, so
      release day must retire it or explicitly carry it forward rather than leave it
      unaddressed; if retired, give it the same retirement-note/roadmap-update treatment as
      row 1. Note before ruling: behavior on a durable `SignatureStore` backing is a coverage
      bound, NOT a mitigation — it is unmeasurable in this tree, because
      `MemorySignatureStore` is the only implementation — so its absence from the evidence
      must not be read as the finding being contained; and "carry forward, with the growth
      visible" is the expected ruling — `verifySignatures(recordId).orphans` now names the
      entries a host must reconcile, so the row's cost is a number rather than a warning —
      and the third-horn sanction is DECLINED at this cut unless sought on its own merits,
      since the alternative containments were measured and rejected rather than left
      untried and the one horn-free deletion point (prune-at-seal) is recorded in the row
      as identified, not built.
      **Expected ruling, pre-argued 2026-08-29 (release day confirms or overrules; the row is
      NOT decided here):** carry forward. The only measured containment for the orphan half
      takes a horn that needs a sanction nobody has sought; the delegation in the
      `SignatureStore` contract and the visibility `SignatureReport.orphans` gives a host are
      what stand; the sanction is declined at this cut unless sought on its own merits.
      Carrying it forward means restating the row's trigger without the TWO disjuncts the cut
      itself fires — "or that lifts `private: true` and publishes the package" (the release
      commit drops `private: true` and the dispatch publishes) and "or the 0.1 cut" — leaving
      the durable-backing and third-horn-sanction disjuncts standing, and recording that
      ruling in `docs/process/implementation-status.md`.
- [ ] Update `docs/process/implementation-status.md`'s measured block (versions,
      published state) — dated, as always.
