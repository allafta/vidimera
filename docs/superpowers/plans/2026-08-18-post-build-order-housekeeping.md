# Post-Build-Order Housekeeping Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Leave the repository oriented for its next phases: documentation that tells a
fresh reader where the project IS rather than how it got here, a written next-phase
roadmap, a navigable increment history, and a verified-clean tree.

**Architecture:** No code changes. Two large docs return to their stated jobs
(`CLAUDE.md` = guidance, `README.md` = orientation) with their accreted per-increment
narrative retired into the account that already owns it; two new documents carry what
nothing owns today (the next-phase roadmap; the increment index); the sealed concept
set is VERIFIED and never edited.

**Tech Stack:** Markdown only. The five gates still run (the contract scan reads
markdown).

**Context — why this exists:** the eight-step build order completed at
`84484ba`. Every increment appended its own paragraph to `CLAUDE.md`'s "What this
project is" (now 266 lines) and `README.md`'s "Status" (now 185). Nothing there is
FALSE — the per-increment sweeps kept it true — but a reader must now reconstruct the
present from the whole history, and that is the debt this plan pays.

## Global Constraints

- **`docs/concept/` is SEALED and is NOT edited by any task in this plan.** Task 5
  verifies its accuracy read-only; anything found gets REPORTED for a sanction, never
  fixed in place. A concept-set edit in any diff is a task failure.
- **Nothing true is lost.** Before deleting narrative from `CLAUDE.md` or `README.md`,
  the deleting task VERIFIES the claim survives in `docs/process/implementation-status.md`
  (the authoritative account by CLAUDE.md's own text) and MIGRATES anything unique
  there first. The report lists every migrated claim.
- **No new claim without a check.** Every count, path, identifier, and command written
  into these docs is verified against the tree at write time (`pnpm test` for counts;
  `git log` for history; a read for every path). No number is carried forward from
  this plan's own prose without re-measuring (lesson 26).
- Five gates before every commit: `pnpm typecheck` · `pnpm lint` · `pnpm lint:strict` ·
  `pnpm test` · `node scripts/contract-scan.mjs` (silent, LAST on the staged tree).
  PowerShell for pnpm (`$env:PATH = "$env:APPDATA\npm;$env:PATH"` first); git via the
  Bash tool; branch `main`.
- Frozen surfaces untouched (no code changes at all in tasks 1-4).
- Voice: the build order is COMPLETE — past tense for it, present tense for the state,
  future only for the register's own triggers. Never bare "this increment" (there is
  no current increment); name increments explicitly where history is cited.
- Trailer on every commit: Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

**Execution order: 3 → 1 → 2 → 4 → 5.** Task 3 creates
`docs/process/next-phases.md`, which Tasks 1 and 2 then point at; running 1 before 3
would mean writing a pointer to a file that does not exist. The numbering below is the
reading order (guidance first, then the new documents); the dispatch order is this one.

**The acceptance criterion for the whole plan.** A reader who has never seen this
repository can, from `README.md` and `CLAUDE.md` alone in a few minutes: say what
Vidimera is and what its declared scope excludes; say that the build order is complete
and what the suite/gates prove; say that the package is NOT consumable and why; name
the next phases and what gates each; name the working disciplines (the sealed set, the
contract scan, byte-stability, the register); and find the increment history without
reading it.

---

### Task 1: `CLAUDE.md` — back to guidance

**Files:** Modify `CLAUDE.md`. Modify `docs/process/implementation-status.md` ONLY if
migration requires it (report each migrated claim).

- [ ] **Step 1: Verify before deleting.** Read `CLAUDE.md`'s "What this project is"
  (lines ~6-272) claim by claim against `docs/process/implementation-status.md`. Build
  a list: claims preserved there (deletable), claims unique to CLAUDE.md (MIGRATE
  first — append to the status doc's own matching section, in that document's voice).
  The report carries this list. Do not delete anything not on it.

- [ ] **Step 2: Rewrite the section.** "What this project is" becomes a short
  orientation — target 25-40 lines, not 266:
  - the two parts (the concept set at `docs/concept/`, its scope and the
    operator-only bound; the implementation at `packages/`);
  - the state in one paragraph: the eight-step build order (SCOPING-GUIDE §7) is
    COMPLETE — all eight steps exited, the last at the self-test-tier increment;
    measure and state the suite (`pnpm test`) and the code count from
    `refusal-codes.ts`; zero governed construction guards remain;
  - the honest bound in the same breath: the package is NOT consumable by a host (no
    `exports`, no build artifact — register rows 1 and 6);
  - the pointers, stated as the rule they already are: **`docs/process/implementation-status.md`
    is the authoritative account** — read it rather than trusting any count elsewhere;
    the next phases live in `docs/process/next-phases.md` (landed by Task 3, which
    runs first — read it and point at what it actually says);
  - what a working agent must not do: edit `docs/concept/` (sealed — the marker-move
    sanctions were per-increment and are spent), touch the frozen byte-stability
    digests, or push without instruction.

- [ ] **Step 3: The remaining sections.** Keep "The standalone contract", "The document
  set", "Commands", "Process disciplines" — these are guidance and stay. Update them
  for the completed state: the disciplines section's per-increment lineage (the
  governed-count movements, the inversion narrative) compresses to the RULE plus a
  pointer to where the lineage is recorded; the commands section stays accurate
  (verify each command runs); the standalone contract stays verbatim in force.

- [ ] **Step 4: Gates + commit.** Five gates; `git add CLAUDE.md docs/process/implementation-status.md`;
  commit "CLAUDE.md returns to guidance: the state, the rules, the pointers".

---

### Task 2: `README.md` — orientation for a reader

**Files:** Modify `README.md`.

- [ ] **Step 1: Verify-before-deleting**, same discipline as Task 1 against the status
  doc (the README's per-step narration is a summary of what that document holds).

- [ ] **Step 2: Rewrite "Status"** (currently ~185 lines) to ~20-30: what the concept
  is and that it is normative; that the implementation is complete at the concept's
  declared scope with the measured suite/gate facts; that it is not consumable and
  why; the pointers (the status doc, the next-phases doc, the concept set's own front
  door). No per-step narration — the steps table lives in the status doc.

- [ ] **Step 3: "Layout" and "Development".** Layout: verify every path exists and
  every description is current (`packages/record/src/` now includes `signing/` and
  `probes/` — check the tree, do not assume). Development: verify each command; state
  the Node floor and pnpm from `package.json`; keep the contract-scan note.

- [ ] **Step 4: Gates + commit** — "README returns to orientation: what this is, where
  it stands, where to look".

---

### Task 3: The next-phase roadmap + the status doc's current-state header

**Files:** Create `docs/process/next-phases.md`. Modify
`docs/process/implementation-status.md` (a current-state header only).

- [ ] **Step 1: `next-phases.md`.** Derived — never invented — from three sources read
  first: `docs/process/deferral-register.md` (the six live rows and their triggers),
  `docs/concept/OPEN-QUESTIONS.md` (READ ONLY — which questions remain genuinely open
  after the build order; several now carry "Decided (this build)" tails, and those are
  CLOSED), and the status doc's "Still outstanding" + "unconsumable today" sections.
  The document states, in this order:
  - **What is done** — one short paragraph: the build order, at the concept's declared
    embedded operator-only scope.
  - **What gates the next cut** — the pre-0.1/1.0 work, each item naming its register
    row and trigger verbatim: consumability (rows 1, 6 — the `exports` map, the build,
    the API naming review), the server-SQL backing (row 15), the token seams' `tx?`
    (row 16), the Biome migration (row 5), the workspace-shape gate (row 4). For each:
    what "done" would look like, in one or two sentences — enough to start, not a
    design.
  - **What is deliberately outside the scope** — AL3 anchoring (documented-only, SPEC
    §14), concurrent legs (out pre-1.0 by declaration, OQ §8), and anything the
    concept's own anti-goals exclude. Quote each source's own words (whitespace-
    collapsed verification required — the scan does not check markdown).
  - **The genuinely open questions that remain** — read OPEN-QUESTIONS.md and list
    ONLY those without a "Decided (this build)" tail, each with its section number.
  - **The disciplines that outlive the build order** — the sealed set (and that its
    marker sanctions were per-increment and are spent), the contract scan, the
    byte-stability pins, the register's own trigger rule, and where the increment
    history lives.
  This document is a ROADMAP, not a plan: it says what and why, never how.

- [ ] **Step 2: The status doc's current-state header.** Insert a short block near the
  top (before or as part of "Steps at a glance"): the build order complete, the
  measured suite/files/codes, the gate baseline, the live register rows, and a
  one-line "how to read this document" (the per-step accounts below are the record;
  the header is the state). Change nothing else — the per-step accounts stay.

- [ ] **Step 3: Gates + commit** — "The next phases, written down: what gates the
  0.1 cut and what is outside the scope".

---

### Task 4: The increment index

**Files:** Create `docs/superpowers/INDEX.md`. Check `docs/analysis/`.

- [ ] **Step 1: Build the index.** `docs/superpowers/specs/` and `plans/` hold the
  increment record (count them; do not assume 24/26). Produce a table, chronological,
  one row per increment: date, increment name, its spec file, its plan file, and the
  build-order step it served. Derive the mapping from the FILES (their own headers
  name their step/increment) — never from memory. Note in the header that these are
  the historical record of how the build order ran, that the authoritative account of
  WHAT was built is the status doc, and that a spec/plan pair is superseded by the
  code the moment it lands (they are not maintained).
- [ ] **Step 2: `docs/analysis/`.** One file (`2026-08-03-step-1-review.md`). Read it;
  state in the index (or a one-line note in the directory) what it is and that it is a
  historical artifact of step 1's review, not current guidance.
- [ ] **Step 3: Gates + commit** — "Index the increment record: 50 documents, one table".

---

### Task 5: Verification, sweep, and the concept-set read-only audit

**Files:** none modified unless the sweep finds a stale claim in a task-1-to-4 output
(fix it and say so).

- [ ] **Step 1: The sweep** — LAST, against the committed tree, repo-wide outside the
  sealed set:

```bash
git grep -nE 'under way|in progress|unstarted|next increment|will land|not yet built|remains|step 8|build order|this increment|later increment' -- ':!docs/concept' ':!docs/superpowers/specs' ':!docs/superpowers/plans'
git grep -nE 'twenty-|[0-9]{3} tests|governed|consumable|exports map|0\.1 cut' -- ':!docs/concept' ':!docs/superpowers/specs' ':!docs/superpowers/plans' -- '*.md'
```

  Judge EVERY hit; the report shows HIT-COUNT == VERDICT-COUNT from THIS run.

- [ ] **Step 2: The concept-set audit (READ ONLY).** Verify the sealed set's accuracy
  claims against the tree: every `[PROVEN]` marker names behavior that exists (spot
  check at least six across SPEC §§2, 8, 9, 10, 11, 12, 14 and CONTROLS' tables);
  every remaining `[SKETCHED]`/`[DESIGNED]` names something genuinely unbuilt; the
  OPEN-QUESTIONS "Decided (this build)" tails match the code. **Report findings; edit
  NOTHING.** A finding here becomes a sanction request in the final report.

- [ ] **Step 3: The tree.** `git status --porcelain` empty; no stray files (delete
  scratch debris if any, naming it); the five gates with exact counts; confirm
  `git diff <this plan's first commit>~1..HEAD -- docs/concept/` is EMPTY.

- [ ] **Step 4: Report** — the acceptance criterion above, item by item, answered
  against the actual files; the sweep counts; the concept audit's findings; the gate
  outputs; the ahead count.
