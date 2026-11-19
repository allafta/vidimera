# AL2 Restatement (First Commit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this
> plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The sealed sentences call 3.1 names state AL2's three conditions as they stand on this
tree, after two pins show conditions (i) and (iii) as behavior.

**Architecture:** One test file pins the conditions; one sealed-set commit lands the eight sites
of the design's §6 verbatim; one commit moves the guide and the records.

**Tech Stack:** TypeScript (strict), vitest, Biome; markdown.

**Spec:** `docs/superpowers/specs/2026-11-19-al2-restatement-design.md` — §6's Current and
Proposed texts are exact and bind Task 2.

**Execution:** native (the authoring session implements every task), then one whole-branch
review on the most capable model, one fix wave, a scoped re-review.

## Global Constraints

- **Branch:** `al2-restatement-2026-11-19`, off `main` at `a877fed`.
- **Commits:** message in a BOM-free file written with the Write tool, `git commit -F <file>`,
  ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never amend.
- **Commands — `pnpm` is broken on this machine; from the repo root:**
  `node_modules/.bin/vitest run [<path>]`; `node_modules/.bin/tsc -p packages/record --noEmit`
  and `-p packages/store-postgres --noEmit`; `node_modules/.bin/biome check . --error-on-warnings`;
  builds `node_modules/.bin/tsc -p packages/<pkg>/tsconfig.build.json`; gates
  `node scripts/contract-scan.mjs`, `node scripts/api-reference-sync.mjs`,
  `node scripts/docs-index-sync.mjs`; the report gate
  `node scripts/ci-assert-tests.mjs .vitest-results.json` after
  `vitest run --reporter=json --outputFile=.vitest-results.json` (delete the json after).
- **The sealed commit (Task 2) touches only `docs/concept/`** and only the eight sites; no
  maturity token moves; CONCEPT.md is not touched.
- **No source file under `packages/*/src` changes.** No existing assertion changes.
- **New markdown references nothing outside this repository.**

## Review Focus

1. A Proposed text that claims more than a pin or the code shows (Task 2).
2. A condition stated where it does not bind (site 6 states two, not three — the design argues
   why).
3. A sealed site outside the grant edited by accident (Task 2's diff against §6's list).
4. The guide's orphan sentence: "inert to verification" must stay true while gaining the
   splice route (Task 3).
5. A count or section reference in the records copied rather than measured (Task 3).

---

### Task 1: The pins

**Files:** Create `packages/record/test/al2-conditions.test.ts`.

- [ ] **Step 1:** Write the two tests the design's §5 describes.
- [ ] **Step 2:** Run the file; both pass on today's tree (they pin present behavior — the
  "red" for this increment is the sealed text, not the code).
- [ ] **Step 3:** Lint, typecheck, contract scan.
- [ ] **Step 4:** Commit.

### Task 2: The sealed-set commit

**Files:** Modify `docs/concept/SPEC.md`, `docs/concept/CONTROLS.md`,
`docs/concept/ASSURANCE.md`, `docs/concept/OPEN-QUESTIONS.md` — the design's §6 sites 1–8.

- [ ] **Step 1:** Apply each Current → Proposed replacement with a script that requires each
  Current text to occur exactly once.
- [ ] **Step 2:** Check mechanically: every Proposed text present (whitespace-collapsed), every
  Current text absent; `git diff --stat` names only the four files.
- [ ] **Step 3:** Contract scan.
- [ ] **Step 4:** Commit — the message names call 3.1 and says this is the first of the grant's
  two sealed commits.

### Task 3: The guide and the records

**Files:** Modify `docs/guide/concepts.md`, `docs/guide/integrating.md`, `docs/guide/faq.md`
(design §7); `docs/process/implementation-status.md`, `CLAUDE.md`, `CHANGELOG.md` (design §8).

- [ ] **Step 1:** Write the guide sentences (prose only; no code samples change).
- [ ] **Step 2:** Write the records; run every gate and record the measured counts.
- [ ] **Step 3:** Commit.
