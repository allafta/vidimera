# The 0.1 release-day checklist

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
      at the cut).
- [ ] Drop `"private": true` from both manifests — the one deliberate publish block.
- [ ] `CHANGELOG.md`: cut a `[0.1.0]` section from `[Unreleased]`, dated.
- [ ] Flip the docset's "unpublished" caveats to the published truth — `README.md`'s
      status paragraph, `docs/guide/getting-started.md`'s honest precondition,
      `docs/guide/api-reference.md`'s header caveat, `docs/guide/faq.md`'s
      is-it-production-ready answer — and verify the README's headline snippet
      (`import ... from '@vidimera/record'`) is now literally true.
- [ ] The `CLAUDE.md` skim (phase-0 ruling 6): remove private-workflow residue; update
      its honest-bound paragraph to the published state.
- [ ] Run every gate (`pnpm typecheck && pnpm test && pnpm build && pnpm smoke &&
      pnpm lint:strict && pnpm contract-scan && pnpm api-sync`), commit, tag `v0.1.0`,
      push the tag.

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
- [ ] Retire register row 1 (`docs/process/deferral-register.md` — the table empties),
      with the retirement note in `docs/process/implementation-status.md` and the
      roadmap update in `docs/process/next-phases.md`.
- [ ] Update `docs/process/implementation-status.md`'s measured block (versions,
      published state) — dated, as always.
