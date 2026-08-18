# Phase 0 decisions — the release-shape rulings

**Date: 2026-08-19.** This is the written record of the phase 0 session that
`docs/analysis/2026-08-18-release-phase-brainstorm.md` required before phases 1 and 4 are
designed. Each ruling below was taken by the repository owner in that session; the owner's
own words are quoted where they carry the ruling's intent. This document records decisions —
it edits no register row and no sealed document, and it grants no sanction (ruling 5 *plans*
one; granting it happens through `docs/concept/SCOPING-GUIDE.md` §§1–2's own machinery in
its own session).

## The seven rulings

1. **The release event is the 0.1 cut, and nothing goes public before the project is
   ready.** The owner's words: "there is no rush to public release - hold it until the
   project is actually ready." The repo stays private until the 0.1 bar is met; repo-public
   and the npm publish of `@vidimera/record` land together at that bar, with no calendar
   pressure. Consequence, stated plainly: every register row whose trigger names the 0.1
   cut (rows 1, 6, 15, 16) now gates the release, and phases 1 through 6 of the agenda are
   all release-gating work.

2. **Row 15 is built, not re-scoped — as a separate adapter package.** The server-SQL
   backing lands as a second workspace package, keeping `@vidimera/record` itself
   zero-runtime-dependency (the server driver is the adapter's dependency, never the
   core's). The row's own three-part shape governs: wired to the existing conformance
   suite by one caller file, a third leg in the cross-backing byte-identity test, and real
   multi-connection contention coverage. The second package fires **row 4** (root
   `typecheck` generalization, per-package test-runner devDependencies) — planned in the
   same phase, not discovered after. The register row itself is untouched until the
   behavior lands; it retires at the landing, per the register's own rule.

3. **`node:sqlite`'s floor decision is deferred to release day, with the rule fixed now.**
   If a maintained Node line carries a stable `node:sqlite` by the release date, the
   declared floor rises to it and the ExperimentalWarning question disappears; if not,
   `SqliteStore` ships as-is with the warning documented in the same breath — what it is,
   why it appears, and the `--disable-warning=ExperimentalWarning` flag that silences it.
   Either way the shipped floor is CI-tested (the agenda's phase 3 item).

4. **The copyright holder is "The Vidimera Authors."** The collective form: the git
   history is the authoritative roster. Phase 5 lands it once, consistently — the
   copyright line, a NOTICE file if one is used, and the `license`/`author`/`repository`
   manifest fields all give the same answer.

5. **One scoped corrective sanction pass over the sealed set is planned.** Scope: exactly
   the six recorded observations the agenda lists (OPEN-QUESTIONS §2's missing "Decided
   (this build)" tail; the `supersedes` three-text divergence; `DecisionRecord.status`
   absent from SPEC §2's field table; `replay`/`verifyChain` and `open()`'s en-passant
   expire against SPEC §5's wording; the concept README's "proven through step 6" table
   line; the `[PROVEN]` legend's server-SQL clause). Nothing else. This is a decision
   session with the machinery's full ceremony, not a typo sweep — items like `supersedes`
   require a ruling on which text moves. **Ordering constraint recorded here so it is not
   rediscovered:** the pass must precede or accompany phase 1, because the naming review's
   `replay`/`verifyChain` export question and the §5 ruling are the same question seen
   from two sides.

6. **`CLAUDE.md` stays, with a release-day skim.** It remains tracked and public — its
   drift risk against `CONTRIBUTING.md` is accepted, both already defer to the process
   docs, and the skim at release removes any private-workflow residue.

7. **The contact channel becomes real as setting-plus-file.** GitHub private vulnerability
   reporting is enabled the day the repo goes public — a repository setting, so it is a
   pinned release-checklist action no commit can substitute for — and
   `.github/ISSUE_TEMPLATE/config.yml` lands with a contact link routing security reports
   there and blank issues disabled. `SECURITY.md`'s public-issue fallback becomes a
   never-needed last resort rather than the working path.

## What this changes downstream

- **The agenda's phase ordering holds, with one addition.** Phases 1 → 2 → 3 in
  dependency order; phase 4 runs parallel once designed; phase 5 lands with the publish;
  phase 6 is last. The addition: the sanctioned sealed-set pass (ruling 5) is scheduled
  before or alongside phase 1, for the ordering constraint recorded there.
- **A release-day checklist now exists as a category.** Three items are pinned to release
  or public day rather than to any commit: the floor re-evaluation rule (ruling 3), the
  private-reporting setting (ruling 7), and the `CLAUDE.md` skim (ruling 6). The phase 5
  session should collect these into one checklist so no setting-shaped item is lost among
  file-shaped ones.
- **No register edit follows from this session.** Row 15 is satisfied by building, so its
  trigger stands as written; rows 1, 6, 16 stand as written and gate the cut; row 4's
  trigger (the second workspace package) will fire as a planned consequence of ruling 2;
  row 5 rides its own file-edit trigger untouched.

## What remains undecided

Everything the phases themselves own: the naming review's individual rulings (phase 1),
the emit mechanism and manifest shape (phase 2), the CI matrix breadth (phase 3), the
adapter's engine and CI-hosting design (phase 4), and the six sanction-pass rulings
themselves — planned here, argued nowhere yet.
