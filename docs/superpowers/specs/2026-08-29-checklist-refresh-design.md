# Checklist refresh — design

**Date: 2026-08-29.** **A release-readiness increment, process documents only. No sanction is
needed and none is sought.** Nothing in `docs/concept/` moves, no maturity marker moves, and no
capability is promoted. The increment rewrites release day's authoritative list to the state
of the tree as it now stands, performs the one outward-facing action that list already
prescribes, and mirrors the result into the two living records that describe the cut. It
changes no code, no workflow, and no register row.

**The permitted edit envelope, stated as a STOP.** What lands: `docs/process/release-checklist.md`,
`docs/process/next-phases.md` (the "What gates the next cut" passage), `CLAUDE.md` (one clause
in its honest-bound paragraph), `docs/process/implementation-status.md` (the increment
section), `docs/superpowers/INDEX.md`, and the deletion of the remote and local tag `v0.1.0`.
**No `packages/` file, no `.github/workflows/` file, no `scripts/` file, no `docs/concept/`
file, and no change to the TEXT of any `docs/process/deferral-register.md` row** — the
register is read, quoted and compared, never edited. Any of those is a STOP.

**The register delta: none.** Rows 1, 19 and 22 keep their text, their triggers and their
dates byte-for-byte. Their release-day *dispositions* are pre-argued in the checklist; they
are not decided here (ruling 1).

**Where this sits.** Second of the two increments the 2026-08-29 path-to-0.1 brainstorm chose
(approach B). The first — the first-use proof, landed `2a28abe`..`3154cc3` — discharged the
checklist's clean-machine precondition by construction and took the floor rule's measurement;
this one writes both into the checklist, refreshes its pickup recipe, and removes the stale
tag, so that release day starts from a list that is true on the day it is read.

## The gap, stated from the record

| # | Site | Says | What is true instead |
|---|---|---|---|
| 1 | `docs/process/release-checklist.md`, the `PAUSED — 2026-08-19` notice (a blockquote — its wrapped lines carry `> ` markers, so phrases are quoted here as single-line fragments) | "To pick the cut back up" — "`git cherry-pick 8be3fce`" — "refresh every `2026-08-19` release date in it" | The preserved commit is stale in CONTENT, not only in date: `[Unreleased]` has gained six entries since (three promotions, `SignatureReport.orphans`, two `Fixed`); four docset flips were added to the list that `8be3fce` never touched (`SECURITY.md`, `docs/README.md`, both package READMEs); `CLAUDE.md`'s honest-bound paragraph has been rewritten several times. The pick would be mostly conflicts carrying stale wording. |
| 2 | Same notice | "If the remote tag `v0.1.0` from the paused" — "attempt still exists, delete it: `git push origin :refs/tags/v0.1.0`" | It still exists, on origin and locally — an annotated tag on the reverted commit, a false public claim that a 0.1.0 exists. The owner authorized its deletion on 2026-08-29. |
| 3 | The first precondition | "Phase 6 of the release plan (first-use validation) has run: one documented, reproduced first-use pass from packed artifact to verified chain on a machine that never held this checkout" — unticked, with the same-machine rehearsal named as what remains | Discharged by construction on 2026-08-29: `.github/workflows/first-use.yml`'s `first-use` job has no checkout step; run `33242645696` at `5c036d0` reached verified chains over `MemoryStore` and a `PostgresStore` against a service the job owned, on Node `v22.16.0` and `v24.19.0`; `docs/analysis/2026-08-29-first-use-proof.md` is the record. The owner ruled a no-checkout GitHub-hosted runner meets the bar. |
| 4 | The floor rule | "Check whether a maintained Node line carries a **stable** `node:sqlite` as of release day" — evaluated at the pause on 24.12.0 as ship-as-is, with the phase-6 finding that the warning fires on any import | `node:sqlite` is Stability 1.2 (release candidate) since Node 24.15.0, not 2 — the rule's own trigger has not fired and `>=22.16` stands. But the warning the rule was written to weigh no longer fires on 24.15+: measured by the first-use run (22.16.0 warns, 24.19.0 silent), and the guide and `packages/record/README.md` now say so. The "meets it at hello" finding is true only for adopters below 24.15. |
| 5 | The post-publish verification item | "In a scratch project on a clean machine: `npm install @vidimera/record @vidimera/store-postgres`, run the getting-started flow against the registry artifacts, and confirm the `./probes` subpath resolves" | The first-use workflow's `source: registry` input is that exact job, on a runner that never held the checkout, and it already exists. Release day should dispatch it, not hunt for a second clean box. |
| 6 | The row-19 and row-22 disposition items | each says release day "must retire it or explicitly carry it forward rather than leave it unaddressed" and stops there | The expected ruling for both is fully argued elsewhere: nothing has changed signature encoding or key handling since row 19 opened, and row 22's orphan half cannot close without a sanction nobody has sought. Release day should confirm a written argument, not draft one. |
| 7 | The notice's owner-side list | names the npm org, the token, the visibility flip, private vulnerability reporting, and code-owner branch protection as "all still open" | Still open — and two of them are not merely undone but UNAVAILABLE while the repository is private (branch protection with code-owner review, and private vulnerability reporting, both refused by the platform on a private free-plan repository). "Public first, then dispatch" is therefore not only npm's provenance ordering; it is the precondition for two other settings on the list. |
| 8 | `docs/process/next-phases.md`, "What gates the next cut"; `CLAUDE.md`'s honest-bound paragraph | describe the cut's gates as the three rows | True, and incomplete: neither names the two engineering preconditions or their state. A reader of either learns that rows gate the cut and not that the clean-machine pass is done or that the floor was re-evaluated. |

## Rulings taken (at the 2026-08-29 brainstorm), so they are not re-litigated

1. **Rows 19 and 22 are pre-argued, not decided.** Both triggers name the 0.1 cut; the cut is
   where the ruling is made. The checklist items gain the expected disposition — carry forward
   — with its reasoning, so release day confirms rather than drafts. Re-deriving either trigger
   today to drop the cut disjunct would be a register decision taken on the grounds that we
   already know the answer, which is the pre-judging the trigger discipline exists to prevent;
   row 22's trigger was re-derived four days ago and stands.

2. **The release commit is re-cut fresh; `8be3fce` is a precedent, not a source.** The notice
   says plainly: do not cherry-pick. The "File changes" list is the specification of the
   release commit; `8be3fce` stays named as the record of what such a commit looked like, so
   release day can diff its own commit against a real one — and as the only place the "refresh
   every 2026-08-19 date" trap is written down.

3. **The floor rule keeps its literal trigger and gains the measurement.** Stability 1.2 is not
   Stability 2; the rule as written has not fired; `>=22.16` stays in all three manifests and
   in CI's exact-floor leg. The item records the 2026-08-29 evaluation, the measured warning
   story, and that release day re-evaluates against the Node lines *then* — if any maintained
   line has reached Stability 2 by the cut, the rule fires as written.

4. **The phase-6 precondition is TICKED here** — the one checkbox this increment changes — with
   the workflow, the run id and the record named, and the bound stated in the same breath
   (ubuntu only; tarball source; the getting-started prose unproven; the 24 leg measured
   `v24.19.0`). The owner's-bar precondition stays unticked: it is a judgment only the owner
   makes, on the day.

5. **The post-publish verification item points at the workflow's `source: registry` dispatch**,
   and names the three script/workflow improvements parked for that dispatch — the
   `ExperimentalWarning: SQLite`-specific grep, the note that the script's `pg` import relies on
   npm hoisting, and the review view's `subjectRef` assertion — so they land with the run that
   re-proves the published artifacts, and the recorded run's script stays byte-identical until
   then.

6. **The stale tag is deleted in this increment.** `git push origin :refs/tags/v0.1.0` and
   `git tag -d v0.1.0`, owner-authorized 2026-08-29. The notice records it as done, with the
   commit the tag pointed at (`8be3fce`) named so the history stays legible.

7. **The notice becomes a status, not a recipe.** It states what has landed since the pause and
   what each landing changed for the cut, the state of both engineering preconditions, the
   re-cut instruction, the tag's deletion, and the owner-side list with the platform bound on
   two of its items. It stops being the place a reader looks for cherry-pick commands.

8. **Historical mentions of `8be3fce` are left alone.** `docs/process/implementation-status.md`'s
   release-readiness section and `docs/process/open-items-plan.md` describe the paused cut as it
   stood when they were written; per the tier discipline they are not rewritten.

## What lands

- `docs/process/release-checklist.md` — the notice rewritten per ruling 7; the phase-6
  precondition ticked per ruling 4; the floor-rule item extended per ruling 3; the post-publish
  verification item rewritten per ruling 5; the row-19 and row-22 items extended per ruling 1;
  the notice's owner-side list annotated per gap row 7. The rest of the list — the file
  changes, the settings, the dispatch, the paperwork — byte-identical.
- The tag `v0.1.0` — deleted on origin and locally, per ruling 6.
- `docs/process/next-phases.md` — the "What gates the next cut" passage gains one paragraph:
  the two engineering preconditions' state and the re-cut instruction, pointing at the
  checklist as the authority.
- `CLAUDE.md` — the honest-bound paragraph gains one clause: the clean-machine precondition is
  discharged (the first-use proof) and the cut stays owner-gated.
- `docs/process/implementation-status.md` — the increment section (fourteenth post-build-order).
- `docs/superpowers/INDEX.md` — this pair's row and both counts, in the same commit as the
  `git add`. No analysis record is added.

## Coverage this adds, stated with its limit

Release day starts from a list that is true on the day it is read: both engineering
preconditions carry their real state, the pickup recipe no longer points at a commit that would
conflict, the false `v0.1.0` claim is gone from the remote, and the two register dispositions
arrive pre-argued.

**The limits, stated in the same breath:**

- **Nothing about the cut itself moves.** The repository stays private; no token exists; no
  version bumps; `private: true` stays. This increment prepares the list, not the release.
- **The owner-side items are not the repository's to close**, and two cannot even be attempted
  until the visibility flip — the list says so, and that is all it can do.
- **Pre-argued is not decided.** If release day finds a reason to retire row 19 or 22, the
  pre-written text is a draft to overrule, not a ruling to obey.
- **The floor evaluation is dated.** It is true of 2026-08-29; the rule tells release day to
  re-evaluate, and a Stability-2 `node:sqlite` on any maintained line by then fires it.
- **The re-cut recipe is a list of files, not a commit.** Release day still composes the
  release commit by hand; the recipe removes a trap, it does not automate the flip.

## Risk, and how it is held

- **Register rows must not move.** The increment quotes rows 19 and 22 and compares nothing
  else; the exit proves both rows byte-identical to the pre-increment commit by splitting each
  on ` | ` and comparing every cell, and re-runs the whitespace-collapsed trigger comparison the
  row-22 increments established.
- **Markdown is citation-checked by nothing.** Every phrase quoted from the checklist, the
  record or the guide is hand-verified against a whitespace-collapsed copy of its source.
- **The tag deletion is irreversible in place** — but the commit it pointed at (`8be3fce`) is
  in history and named; a tag can be recreated on it in one command if ever wanted.
- **Ticking a checkbox is a claim.** The phase-6 tick cites a run and a record; the text beside
  it states what the run did not prove, so a reader cannot take the tick for more than it is.
- **`docs-index-sync`'s counted sentences are phrasing-locked**; the pair's row and the two
  counts land in one commit with the `git add`.
- **No external URL** in any new markdown; the run is named by id.

## What stays outside, and why

- **The cut.** Every "File changes" and "Repository and registry settings" item stays
  unticked; this increment does not bump, flip, publish or tag.
- **Raising the floor** — ruling 3; the rule's trigger has not fired.
- **The three parked script/workflow improvements** — ruling 5; they land with the registry
  dispatch.
- **Retiring or re-deriving rows 19 and 22** — ruling 1.
- **Rewriting historical accounts of the paused cut** — ruling 8.
- **`docs/guide/` and `packages/record/README.md`** — the first-use proof already corrected
  them; nothing here touches them.

## Exit

The increment exits when: `docs/process/release-checklist.md` reads as specified in "What
lands", with every untouched item byte-identical to the pre-increment commit; `git ls-remote
--tags origin` shows no `v0.1.0` and `git tag -l v0.1.0` is empty; rows 1, 19 and 22 of the
register are byte-identical to the pre-increment commit, cell by cell; the `next-phases.md`
paragraph and the `CLAUDE.md` clause are in place; the increment's section is written in
`docs/process/implementation-status.md` and proposed explicitly in the commit body;
`docs/superpowers/INDEX.md` gains this pair's row with both counts moved in the same commit as
the `git add`; `git diff <baseline> --stat -- packages/ .github/ scripts/ docs/concept/` is
empty; and `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm contract-scan`, `pnpm api-sync`
and `pnpm docs-index-sync` are green with the figures measured at exit rather than carried
forward.
