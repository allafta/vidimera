# The 0.1 release-day checklist

> **PAUSED — 2026-08-19.** The cut was prepared and run to the owner-action boundary,
> then deliberately paused and reverted so main carries no published-state claim while
> parked. What exists: the complete release commit — versions bumped, `private` dropped,
> the CHANGELOG's `[0.1.0]` section cut, every docset caveat flipped — is preserved in
> history as commit `8be3fce` ("The 0.1 cut: ..."), reverted whole by the commit that
> added this notice. The floor rule was evaluated at the pause (Node 24 LTS still emits
> the `node:sqlite` ExperimentalWarning, measured on 24.12.0 → ship-as-is); re-evaluate
> at pickup. The clean-machine precondition was owner-waived at the paused attempt; that
> waiver does not carry — re-decide it at pickup.
>
> **To pick the cut back up:** `git cherry-pick 8be3fce` (or revert the reverting
> commit), refresh every `2026-08-19` release date in it to the actual cut date
> (CHANGELOG's `[0.1.0]` heading and body, README's status paragraph, CLAUDE.md's honest
> bound, the guide's four flips). The CHANGELOG's `[0.1.0]` section is the one flip a
> date refresh cannot fix: re-cut it fresh from `[Unreleased]` as it reads at pickup
> rather than reusing the preserved commit's wording — `[Unreleased]` has grown three
> post-build-order capabilities since the pause (recorded human decline, proposal
> provenance, effect-result notarization), none named in the commit being picked up. The
> same staleness question — has the content, not only the date, moved since the pause? —
> applies to any other docset flip in that commit; check each against its current source
> before trusting the preserved wording. Re-run all gates, commit, tag `v<version>`, push
> with the tag — then resume at "Repository and registry settings" below. The owner-side items
> that stopped the paused attempt, all still open: the npm `vidimera` org and a granular
> `NPM_TOKEN` secret, the repository visibility flip (blocked from automation by design —
> run `gh repo edit allafta/vidimera --visibility public
> --accept-visibility-change-consequences` yourself), private vulnerability reporting,
> and the code-owner branch protection. If the remote tag `v0.1.0` from the paused
> attempt still exists, delete it: `git push origin :refs/tags/v0.1.0`.

The one list release day runs from, collected across the release plan's phase records
(`docs/analysis/2026-08-19-phase-0-decisions.md` asked for it; the phase 2, 3, and 5
records each contributed items). Ordered: preconditions, the rule to evaluate, file
changes, repository settings, the dispatch, the verification, the paperwork. Nothing here
is optional; several items are settings no commit can land, which is why this list exists
as a list rather than as code.

## Preconditions (before the day is scheduled)

- [ ] Phase 6 of the release plan (first-use validation) has run: one documented,
      reproduced first-use pass from packed artifact to verified chain on a machine that
      never held this checkout. (The same-machine rehearsal ran 2026-08-19 —
      `docs/analysis/2026-08-19-phase-6-rehearsal.md`: both tarballs, the peer-range
      rewrite proven, both stores green from the installed artifacts. The clean-machine
      run is what remains of this box.)
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
      `SqliteStore`), so every adopter meets it at hello, whatever store they use.

## File changes (one commit, tagged)

- [ ] Bump `version` to `0.1.0` in `packages/record/package.json` **and**
      `packages/store-postgres/package.json` (the phase-5 ruling: both packages publish
      at the cut; the 2026-08-20 versioning ruling: lockstep — both packages carry the
      same version and both publish, at this cut and every later one,
      `docs/analysis/2026-08-20-versioning-mechanics.md`).
- [ ] Drop `"private": true` from both manifests — the one deliberate publish block.
- [ ] `CHANGELOG.md`: cut a `[0.1.0]` section from `[Unreleased]`, dated.
- [ ] Flip the docset's "unpublished" caveats to the published truth — `README.md`'s
      status paragraph, `docs/guide/getting-started.md`'s honest precondition,
      `docs/guide/api-reference.md`'s header caveat, `docs/guide/faq.md`'s
      is-it-production-ready answer, `SECURITY.md`'s supported-versions section,
      `docs/README.md`'s "not yet published or installable" line, and both package
      READMEs' status blocks (`packages/record/README.md`,
      `packages/store-postgres/README.md`; the last four entries added at the
      open-items plan's stage-2 pass, which found them missing from the paused cut's
      flip set) — and verify the README's headline snippet
      (`import ... from '@vidimera/record'`) is now literally true.
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
      is advisory until this is on.

## The dispatch

- [ ] Run the **Release** workflow (`.github/workflows/release.yml`, dispatch-only). Its
      guard refuses any package still carrying `private: true` or `0.0.0`; it re-runs
      every gate, then publishes `@vidimera/record` first and `@vidimera/store-postgres`
      second (tarball-first, so the adapter's `workspace:*` peer range is rewritten),
      both with provenance. This is the register's row-1 trigger firing: the first
      exercised publish.

## Verification, then the paperwork

- [ ] In a scratch project on a clean machine: `npm install @vidimera/record
      @vidimera/store-postgres`, run the getting-started flow against the registry
      artifacts, and confirm the `./probes` subpath resolves.
- [ ] Retire register row 1 (`docs/process/deferral-register.md` — row 1 leaves the
      table), with the retirement note in `docs/process/implementation-status.md` and the
      roadmap update in `docs/process/next-phases.md`.
- [ ] Decide register row 19's disposition (`docs/process/deferral-register.md`, the AL2
      detached-signature sidecar pinning deferral) — its own trigger ("The first increment
      that changes signature encoding or key handling, or the 0.1 cut — whichever lands
      first") names this cut too, so release day must retire it or explicitly carry it
      forward rather than leave it unaddressed; if retired, give it the same
      retirement-note/roadmap-update treatment as row 1.
- [ ] Decide register row 20's disposition (`docs/process/deferral-register.md`, decline's
      rung-(1) coverage gap) — RETRIGGERED twice: first at the Finding E adjudication
      increment (commit `536fdba`, which touched `kernel/decline.ts` to scope a throw
      message without closing the gap), then again at the immediately following fix
      commit (`98584e1`), whose own replacement trigger named the deferred work's own
      completion rather than a prompting event and was corrected; its current trigger
      (verbatim) is: "The next increment that touches AL2 signature enforcement at
      `decline()`'s rung (1), or that extends `signing-enforce.test.ts`'s local rig or
      `packages/record/test/helpers/signing.ts`'s shared `signingSetup` to expose the
      sidecar alongside decline's handles — or the 0.1 cut, whichever lands first.
      RETRIGGERED: this said "the next increment that touches
      `packages/record/src/kernel/decline.ts`", which fired at the Finding E adjudication
      increment (commit `536fdba`) — that increment touched the file only to scope two
      throw-message strings and add a hash-broken corner test, not to close the deferred
      gap; the AL2 signature-broken half of rung (1) is still unexecuted. A first
      replacement trigger, written the same day at the immediately following fix commit
      (`98584e1`), named "the next increment that drives a signature-broken chain through
      `decline()`'s rung (1)" — but that names the deferred work's own completion, not a
      prompting event, so it un-defers nothing (in effect, 0.1-cut-only); corrected here.
      The principle a trigger must follow: it names the event that PROMPTS the work, never
      the work's own completion — every other row in this table does exactly that (row 1:
      "First external consumer"; row 19: "The first increment that changes signature
      encoding or key handling"; row 21, this row's own sibling: "The next increment that
      touches AL2 signature enforcement"). Row 5's own retrigger
      (`docs/process/next-phases.md`) draws the same line from the opposite side: a
      trigger too VAGUE to fire discriminately ("next housekeeping commit") was narrowed
      to a specific, checkable file; here a trigger too BROAD (any touch of one file) is
      narrowed instead to a specific, checkable class of prompting work." — this new
      trigger names this cut too, so release day must retire it or explicitly carry it
      forward rather than leave it unaddressed; if retired, give it the same
      retirement-note/roadmap-update treatment as row 1.
- [ ] Decide register row 21's disposition (`docs/process/deferral-register.md`, the AL2
      caller-input and assertion-depth gaps) — its own trigger ("The next increment that
      touches AL2 signature enforcement, or the 0.1 cut — whichever lands first") names
      this cut too, so release day must retire it or explicitly carry it forward rather
      than leave it unaddressed; if retired, give it the same
      retirement-note/roadmap-update treatment as row 1.
- [ ] Update `docs/process/implementation-status.md`'s measured block (versions,
      published state) — dated, as always.
