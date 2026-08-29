# Checklist Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make release day's authoritative list true on the day it is read — both engineering preconditions carrying their real state, the pickup recipe re-cut fresh instead of cherry-picking a stale commit, the false `v0.1.0` tag gone from the remote, and the two register dispositions pre-argued — without deciding anything the cut itself must decide.

**Architecture:** Task 1 deletes the stale tag (the one outward-facing action, owner-authorized) and rewrites the six checklist sites, then proves every untouched item and every register row byte-identical. Task 2 mirrors the state into `next-phases.md` and `CLAUDE.md`. Task 3 writes the increment section, indexes the pair, and exits. Three commits, all markdown; no code, no workflow, no register text.

**Tech Stack:** Markdown; `git`; the repository's gate scripts. Nothing new.

**Spec:** `docs/superpowers/specs/2026-08-29-checklist-refresh-design.md`

## Global Constraints

- **NO SANCTION IS NEEDED AND NONE IS SOUGHT.** No task edits `docs/concept/`. No maturity marker moves.
- **NO `packages/`, `.github/`, or `scripts/` FILE IS TOUCHED.** `git diff <baseline> --stat -- packages/ .github/ scripts/ docs/concept/` must be empty at every commit. Any hit is a STOP.
- **NO REGISTER ROW'S TEXT CHANGES.** `docs/process/deferral-register.md` is read and compared, never edited. Rows 1, 19 and 22 must be byte-identical to the baseline, cell by cell (Task 1 Step 8 proves it). If a task seems to need a register edit, STOP — spec ruling 1.
- **ONE OUTWARD-FACING ACTION, ALREADY AUTHORIZED.** The owner authorized, on 2026-08-29, deleting the stale tag `v0.1.0` on origin and locally. Nothing else is pushed: no branch push, no `main` push. The branch is merged and pushed only through the finishing step, on the owner's separate say-so.
- **UNTOUCHED CHECKLIST ITEMS STAY BYTE-IDENTICAL.** Task 1 changes six sites in `docs/process/release-checklist.md` (the notice; the phase-6 precondition; the floor rule; the post-publish verification item; the row-19 item; the row-22 item). Every other line of the file is unchanged, proved by reading `git diff -U0` hunk by hunk.
- **PRE-ARGUED, NOT DECIDED.** The row-19 and row-22 items say what the expected ruling is and why; they never say the row IS retired or IS carried — release day rules. Forbidden phrasings: "row 19 is retired", "row 22 is carried forward", "retire it now".
- **TICK ONE CHECKBOX AND ONLY ONE.** The phase-6 precondition becomes `- [x]`; every other `- [ ]` stays `- [ ]` (grep-countable: measure the file's `- [ ]` count at Task 1 Step 1 — 19 on 2026-08-29 — and it must be exactly one fewer after, plus exactly one `- [x]`).
- **Markdown is citation-checked by nothing.** Hand-verify every quoted phrase against a whitespace-collapsed copy of its source (`tr -s ' \n' ' ' < file | grep -oF -- "phrase" | wc -l`). The notice is a BLOCKQUOTE: its wrapped lines carry `> ` markers, so a multi-line phrase from it will not match — quote single-line fragments.
- **No external URL** in any new markdown. Runs are named by id (`First-use run 33242645696 on origin`).
- **`docs-index-sync`'s counted sentences are phrasing-locked** (``N files in `specs/`, M in `plans/` ``; ``**`docs/analysis/`** holds N files``). Numbers are measured with `git ls-files` after `git add`; the spec, plan, INDEX row and counts land in ONE commit (Task 3). The `docs/analysis/` count does not move.
- **Every count is measured, never copied** — the `- [ ]` totals, the vitest and Biome figures (67 files / 821 tests and 135 files today), the INDEX counts.
- **Gates at every commit — never call `pnpm`** (the global shim is broken on this machine): `./node_modules/.bin/vitest run`, `./node_modules/.bin/tsc --noEmit -p packages/record` AND `-p packages/store-postgres`, `./node_modules/.bin/biome check --error-on-warnings .`, `node scripts/contract-scan.mjs` exit 0, `node scripts/api-reference-sync.mjs` exit 0, `node scripts/docs-index-sync.mjs` exit 0.
- Commit messages via `git commit -F <msgfile>` where the message file is written with the **Write tool**. Verify the branch is attached before each commit.
- Commit subjects follow the increment convention: `Checklist refresh N/3: <what landed>`.

---

### Task 1: The stale tag gone, and the checklist made true

**Files:**
- Modify: `docs/process/release-checklist.md` (six sites, listed in Step 2)
- Remote/local state: the tag `v0.1.0` deleted

**Interfaces:**
- Consumes: the first-use proof's facts — workflow `.github/workflows/first-use.yml`; run `33242645696` at `5c036d0`; Node `v22.16.0` (warning present) and `v24.19.0` (warning absent); record `docs/analysis/2026-08-29-first-use-proof.md`. The floor measurement: `node:sqlite` Stability 1.2 (release candidate) since Node 24.15.0.
- Produces: the refreshed checklist Tasks 2 and 3 cite.

- [ ] **Step 1: Verify the premise and record the baselines.**

```bash
git status --short --branch
BASE=$(git rev-parse --short HEAD); echo "baseline $BASE"
grep -c "^- \[ \]" docs/process/release-checklist.md; grep -c "^- \[x\]" docs/process/release-checklist.md
git ls-remote --tags origin | awk '{print $2}'; git tag -l
node -e '
const fs=require("fs");const rows=fs.readFileSync("docs/process/deferral-register.md","utf8").split("\n").filter(l=>/^\| (1|19|22) \|/.test(l));
fs.writeFileSync(".rows.before.json",JSON.stringify(rows));console.log("rows captured:",rows.length);'
./node_modules/.bin/vitest run 2>&1 | grep -E "Test Files|Tests "
./node_modules/.bin/biome check --error-on-warnings . 2>&1 | tail -1
```
Expected: a clean tree on the feature branch; the baseline SHA — **write it down**; `21` unticked and `0` ticked (measure; use what you read); `refs/tags/v0.1.0` present on origin and `v0.1.0` locally; `rows captured: 3`; the vitest and Biome figures — **write them down**. Keep `.rows.before.json` until Step 8; never commit it.

- [ ] **Step 2: Delete the stale tag — remote first, then local.**

```bash
git show -s --format='%h %s' v0.1.0^{commit}
git push origin :refs/tags/v0.1.0
git tag -d v0.1.0
git ls-remote --tags origin | grep -c v0.1.0; git tag -l v0.1.0 | wc -l
```
Expected: the first line prints `8be3fce The 0.1 cut: …` (the reverted commit — confirm before deleting; if the tag points anywhere else, STOP); the push reports `- [deleted] v0.1.0`; both counts `0`. This is the one outward-facing action, authorized 2026-08-29.

- [ ] **Step 3: Rewrite the paused notice.**

In `docs/process/release-checklist.md`, replace the whole blockquote from `> **PAUSED — 2026-08-19.**` through the line ending `` `git push origin :refs/tags/v0.1.0`. `` (lines 3–35 today; locate by the two markers, not by number) with:

```
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
> and private vulnerability reporting on a private repository of this plan — so "public first,
> then dispatch" below is not only npm's provenance ordering; it is the precondition for two
> other settings on this list. The clean-machine precondition was owner-waived at the paused
> attempt; that waiver is now moot, since the precondition is discharged.
```

Keep the blank `>` separator lines; the notice remains one blockquote. Wrap to ~90 columns.

- [ ] **Step 4: Tick the phase-6 precondition, and state its bound.**

Replace the item beginning `- [ ] Phase 6 of the release plan (first-use validation) has run:` through `The clean-machine run is what remains of this box.)` with:

```
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
```

- [ ] **Step 5: Extend the floor-rule item with the evaluation.**

The item beginning `- [ ] Check whether a maintained Node line carries a **stable** `node:sqlite` as of` ends `whatever store they use.` Keep every existing sentence and append, inside the same item with the six-space indent:

```
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
```

- [ ] **Step 6: Point the post-publish verification item at the workflow.**

Replace the item beginning `- [ ] In a scratch project on a clean machine: `npm install @vidimera/record` through `and confirm the `./probes` subpath resolves.` with:

```
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
```

- [ ] **Step 7: Pre-argue rows 19 and 22.**

The row-19 item — the one beginning `- [ ] Decide register row 19's disposition` — ends `give it the same retirement-note/roadmap-update treatment as row 1.` **That closing phrase also occurs INSIDE the row-22 item** (followed there by `Note before ruling:`), so anchor on the row-19 item's own start and append after ITS last line, never on the phrase alone:

```
      **Expected ruling, pre-argued 2026-08-29 (release day confirms or overrules; the row is
      NOT decided here):** carry forward. Nothing has changed signature encoding or key
      handling since the row opened on 2026-08-23 — the decorator's memo (the no-edge
      containment increment) changed how many times a signer is asked, never what is signed or
      how it is keyed — so the row's first disjunct has not fired and the deferral's reason
      stands. Carrying it forward means restating the row's trigger without the "or the 0.1
      cut" disjunct and recording that ruling in `docs/process/implementation-status.md`.
```

The row-22 item ends `(prune-at-seal) is recorded in the row as identified, not built.` Append, inside the item:

```
      **Expected ruling, pre-argued 2026-08-29 (release day confirms or overrules; the row is
      NOT decided here):** carry forward. The only containment for the orphan half takes a horn
      that needs a sanction nobody has sought; the delegation in the `SignatureStore` contract
      and the visibility `SignatureReport.orphans` gives a host are what stand; the sanction is
      declined at this cut unless sought on its own merits. Carrying it forward means
      restating the row's trigger without the "or the 0.1 cut" disjunct and recording that
      ruling in `docs/process/implementation-status.md`.
```

- [ ] **Step 8: Prove what did not move.**

```bash
echo "unticked: $(grep -c '^- \[ \]' docs/process/release-checklist.md)  ticked: $(grep -c '^- \[x\]' docs/process/release-checklist.md)"
git diff -U0 -- docs/process/release-checklist.md | grep -E "^@@" | cat
node -e '
const fs=require("fs");const before=JSON.parse(fs.readFileSync(".rows.before.json","utf8"));
const now=fs.readFileSync("docs/process/deferral-register.md","utf8").split("\n").filter(l=>/^\| (1|19|22) \|/.test(l));
console.log("register rows byte-identical:", JSON.stringify(before)===JSON.stringify(now));
const line22=now.find(l=>l.startsWith("| 22 |"));const want=line22.split(" | ")[2].trim().replace(/\s+/g," ");
for(const f of ["docs/process/deferral-register.md","docs/process/next-phases.md","docs/process/release-checklist.md","docs/process/implementation-status.md"]){const t=fs.readFileSync(f,"utf8").replace(/\s+/g," ");console.log(f,"row-22 trigger occurrences:",t.split(want).length-1);}'
rm -f .rows.before.json
grep -n -i "row 19 is retired\|row 22 is carried\|retire it now\|is carried forward" docs/process/release-checklist.md; echo "(the line above must print nothing)"
grep -n "http" docs/process/release-checklist.md; echo "(the line above must print nothing new — compare with the baseline: git show <BASE>:docs/process/release-checklist.md | grep -c http)"
git status --porcelain
```
Expected: unticked = Step 1's count minus one, ticked = 1; the `@@` hunks fall only inside the six sites (the notice; the phase-6 item; the floor item; the verification item; the row-19 item; the row-22 item) — read each hunk header's line range against the file and confirm; `register rows byte-identical: true`; the row-22 trigger occurs exactly once in each of the four files (the checklist quotes it in the row-22 item, unchanged); no forbidden phrasing; no new `http`; exactly one modified path.

- [ ] **Step 9: Gates and commit.**

The Global Constraints battery; `git diff <BASE> --stat -- packages/ .github/ scripts/ docs/concept/` empty. Verify by hand every phrase Steps 3–7 quote from other documents (`docs/analysis/2026-08-19-phase-6-rehearsal.md`, the first-use record) occurs there whitespace-collapsed.

Subject: `Checklist refresh 1/3: the stale tag gone, the notice a status, both preconditions true, rows 19 and 22 pre-argued`

The commit body records the tag deletion (what it pointed at, the two commands, the authorization) and lists the six sites.

---

### Task 2: The two mirrors

**Files:**
- Modify: `docs/process/next-phases.md` (the "What gates the next cut" passage — one paragraph added)
- Modify: `CLAUDE.md` (the honest-bound paragraph — one clause)

**Interfaces:**
- Consumes: Task 1's refreshed checklist as the authority to point at.
- Produces: nothing.

- [ ] **Step 1: `next-phases.md`.**

The passage under `## What gates the next cut` opens `Three deferral-register rows gate the next cut — down from four:` and its first paragraph ends `Each item below names its row and quotes its trigger verbatim.` (locate by content). Insert, immediately after that paragraph and before the `### Consumability` heading's preceding blank line, a new paragraph:

```
Two engineering preconditions also gate the cut, and both moved on 2026-08-29 (the checklist
is the authority; this is the pointer). The clean-machine first-use pass is discharged by
construction — `.github/workflows/first-use.yml`'s no-checkout job and `First-use run
33242645696 on origin` (`docs/analysis/2026-08-29-first-use-proof.md`) — and its checkbox is
ticked against that record. The floor rule was evaluated and did not fire: `node:sqlite` is
Stability 1.2 since Node 24.15.0, not 2, so `>=22.16` stands; the warning it was written to
weigh no longer fires on 24.15+, and the guide says so. The paused release commit `8be3fce` is
a precedent to diff against, never a commit to cherry-pick — the checklist's notice says why;
and the stale `v0.1.0` tag from the paused attempt is gone. What still gates the cut outside
this repository is the owner-side list in that notice, two items of which cannot even be
attempted until the repository is public.
```

Wrap to the file's ~90-column convention.

- [ ] **Step 2: `CLAUDE.md`.**

The honest-bound paragraph ends `the pre-0.1 API review (row 6) completed and retired 2026-08-19 (`docs/analysis/2026-08-19-phase-1-api-review.md`).` Append, inside the same paragraph:

```
The release checklist's clean-machine precondition is discharged by construction (the
first-use proof, 2026-08-29 — `docs/analysis/2026-08-29-first-use-proof.md`), its floor rule
was evaluated and did not fire, and the cut stays owner-gated: the repository is private, no
publish token exists, and the paused attempt's stale `v0.1.0` tag has been removed.
```

- [ ] **Step 3: Verify the quotes and the envelope; gates; commit.**

Every path and run id named above exists (`ls docs/analysis/2026-08-29-first-use-proof.md .github/workflows/first-use.yml`); `git status --porcelain` shows exactly the two files; the battery green; `git diff <BASE> --stat -- packages/ .github/ scripts/ docs/concept/` empty.

Subject: `Checklist refresh 2/3: the two mirrors — next-phases and CLAUDE.md name the preconditions' state`

---

### Task 3: The record and the exit

**Files:**
- Modify: `docs/process/implementation-status.md` (a new increment section; the present-tense counts do NOT move — verify)
- Modify: `docs/superpowers/INDEX.md` (this pair's row; the `specs/` and `plans/` counts)
- Add to the index: `docs/superpowers/specs/2026-08-29-checklist-refresh-design.md`, `docs/superpowers/plans/2026-08-29-checklist-refresh.md`

**Interfaces:**
- Consumes: Task 1 Step 1's baselines; Task 1 Step 2's tag facts; Task 1 Step 8's proofs.
- Produces: nothing.

- [ ] **Step 1: Classify every count sentence before touching one.**

```bash
grep -n "test files, [0-9]* tests\|files checked" CLAUDE.md docs/process/implementation-status.md | head -30
```
No test file and no Biome-scanned file was added or removed in this increment, so NO count moves — confirm the vitest and Biome figures equal Task 1 Step 1's. Every `Gate outputs` block stays byte-identical.

- [ ] **Step 2: Write the increment section.**

Append `## Post-build-order increment — Checklist refresh` after the last section (`## Post-build-order increment — First-use proof`), in the house shape (read the two preceding sections and match them): the ordinal — count the `## Post-build-order increment —` headings above and add one (expected fourteenth; the `## Post-build-order note —` heading does not count); exit status; the commit range in backticks closed by this commit; **no `packages/`, `.github/`, `scripts/` or `docs/concept/` file touched**, proved by `git diff <baseline> --stat` over those paths (empty); no register row's text changed, proved cell by cell; no marker, no sanction; `Design:`/`plan:` paths. Then: **The gap this closed.** (the eight rows of the spec's gap table, compressed); **What landed.** per file, including the tag deletion with what it pointed at; **Pre-argued, not decided** — why rows 19 and 22 keep their triggers and what the checklist now carries for each; **The floor did not move, and why** — Stability 1.2 ≠ 2; the measured story; re-evaluate on the day; **The one checkbox ticked, and its bound**; **Deviations from the plan as written** — "None" only if true; **The honest limit.** (nothing about the cut moves; owner-side items not the repository's to close, two unavailable while private; pre-argued is a draft to overrule; the floor evaluation is dated; the recipe is a list, not a commit); **What stays outside, and why.**; **Cuts.** None; **Gate outputs, as measured against this increment's own exit commit** with measured figures, the envelope diff empty, `docs/process/deferral-register.md` loses no row and gains none and every row byte-identical, `git ls-remote --tags origin` empty of `v0.1.0`.

- [ ] **Step 3: Index the pair; move the two counts.**

Add the INDEX row after the `First-use proof` row:

```
| 2026-08-29 | Checklist refresh | Post-build-order (no step) | [design](specs/2026-08-29-checklist-refresh-design.md) | [plan](plans/2026-08-29-checklist-refresh.md) |
```

```bash
git add docs/superpowers/specs/2026-08-29-checklist-refresh-design.md docs/superpowers/plans/2026-08-29-checklist-refresh.md
git ls-files -- 'docs/superpowers/specs/*.md' | wc -l
git ls-files -- 'docs/superpowers/plans/*.md' | wc -l
```
Write the two measured numbers into ``**N files in `specs/`, M in `plans/`**`` — **do not reword the sentence**. The `docs/analysis/` count stays. Then `node scripts/docs-index-sync.mjs; echo "exit=$?"` → `exit=0`, no output.

- [ ] **Step 4: Prove the envelope one last time.**

```bash
git diff <BASE> --stat -- packages/ .github/ scripts/ docs/concept/ ; echo "empty means untouched"
git diff <BASE> --name-only
git ls-remote --tags origin | grep -c v0.1.0; git tag -l v0.1.0 | wc -l
node -e '
const fs=require("fs");const now=fs.readFileSync("docs/process/deferral-register.md","utf8");
const base=require("child_process").execSync("git show <BASE>:docs/process/deferral-register.md",{encoding:"utf8"});
console.log("register byte-identical to baseline:", now===base);'
```
Expected: no output from the first; the second lists exactly `docs/process/release-checklist.md`, `docs/process/next-phases.md`, `CLAUDE.md`, `docs/process/implementation-status.md`, `docs/superpowers/INDEX.md` and the two added pair files; both tag counts `0`; `register byte-identical to baseline: true`.

- [ ] **Step 5: Full gates, commit, and discharge the explicit-proposal condition.**

The Global Constraints battery, all green, figures identical to Task 1 Step 1's.

Subject: `Checklist refresh 3/3: the record lands the exit — release day starts from a list that is true`

The commit body names every `docs/process/` file this increment touched — `release-checklist.md` (the six sites), `next-phases.md` (one paragraph), `implementation-status.md` (the section) — what changed in each and why, per `CONTRIBUTING.md`'s requirement that `implementation-status.md` edits be proposed rather than slipped in; and states that `deferral-register.md` was read and compared, never edited.

---

## Self-review notes

- **Spec coverage.** Ruling 1 (pre-argued, not decided) → Task 1 Step 7's two blocks and Step 8's forbidden-phrasing grep; ruling 2 (re-cut fresh, `8be3fce` a precedent) → Step 3's notice; ruling 3 (floor rule keeps its trigger, gains the evaluation) → Step 5; ruling 4 (one checkbox ticked, bound stated; owner's bar unticked) → Step 4 and the Global Constraints' tick count; ruling 5 (verification → registry dispatch with the three parked improvements) → Step 6; ruling 6 (tag deleted) → Step 2; ruling 7 (notice a status) → Step 3; ruling 8 (historical `8be3fce` mentions untouched) → the envelope (no other file). Gap row 7 (two settings unavailable while private) → Step 3's last paragraph. Gap row 8 (mirrors) → Task 2. The spec's "What lands" → Tasks 1–3 file by file.
- **The one thing most likely to be got wrong** is a sentence in the row-19/22 items that reads as a decision. Step 8's grep is a blunt instrument; the reviewer's read is the real check — every sentence there must be prefixed, in effect, by "expected".
- **The second** is quoting the blockquote across a line break and getting a false "missing" — or, worse, a false "present" from a stale copy. Quote single-line fragments and check them against the tree, not against this plan.
- **The third** is the tag: deleting the wrong ref. Step 2 prints what the tag points at before touching it and STOPs if it is not `8be3fce`.
- **No figure in this plan is a measurement.** The `- [ ]` count, the test totals, the Biome count and the INDEX counts are measured at the step that needs them.
