# Staged Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Red is observed before green for every new pin.

**Goal:** `open()` binds only staged drafts that re-derive to the reference it was asked for, and
reads each caller-supplied option once.

**Architecture:** A check after each `getStaged` in `kernel/open.ts`; a snapshot of the options at
`open()`'s entry; `verifySupersedes` and `verifyPriorLegs` read their reference's fields once.

**Tech Stack:** TypeScript (strict), vitest, Biome.

**Spec:** `docs/superpowers/specs/2026-11-20-staged-integrity-design.md` — rulings 3.1–3.3 and §5's
pins bind every task.

## Global Constraints

- **Branch:** `staged-integrity-2026-11-20`, off `main` at `58f2e2a`.
- **Commits:** BOM-free message files written with the Write tool, `git commit -F`, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never amend, never push.
- **Commands — `pnpm` is broken here; from the repo root:** `node_modules/.bin/vitest run [<path>]`
  (the embedded-postgres `TypeError: done is not a function` after the results is known teardown
  noise); `node_modules/.bin/tsc -p packages/record --noEmit && node_modules/.bin/tsc -p packages/store-postgres --noEmit`;
  `node_modules/.bin/biome check . --error-on-warnings`; `node scripts/contract-scan.mjs`;
  `node scripts/api-reference-sync.mjs`; `node scripts/docs-index-sync.mjs`; the report gate
  (`vitest run --reporter=json --outputFile=.vitest-results.json`, then
  `node scripts/ci-assert-tests.mjs .vitest-results.json`, then delete the json).
- **STOP, absolute — never edit:** `docs/concept/**`; `packages/record/test/byte-stability.test.ts`;
  any `PINNED_` literal; either `package.json`; `packages/record/src/index.ts`.
- **No existing assertion changes its truth value; an honest genesis's bytes do not change.**
- **`.ts` comments reference nothing outside this repository** (the contract scan rejects
  `design`, `slice`, `Task N`).

## Review Focus

1. A draft field read twice (once for the check, once for the binding) — the check must cover
   exactly the values bound.
2. The `proposed` draft checked the same way as the opened draft.
3. An options accessor whose second read differs: the genesis never carries an unverified value.
4. The check's error is a throw with nothing appended, never a refusal.
5. An untampered `open()` is byte-identical to today's.

---

### Task 1: The check, the snapshot, the docs and the record

**Files:** Modify `packages/record/src/kernel/open.ts`, `kernel/supersedes.ts`,
`kernel/prior-legs.ts`; create `packages/record/test/staged-integrity.test.ts`; modify the guide's
provenance sentences (`docs/guide/integrating.md`, and any other page that calls `proposedDigest`
the agent's original), `CHANGELOG.md`, `docs/process/implementation-status.md` (a new section after
the last one, with measured gates, and the "Current state" measured line), `CLAUDE.md` (measured
counts).

- [ ] **Step 1:** Write the pins of the design's §5.
- [ ] **Step 2:** Run; observe red.
- [ ] **Step 3:** Implement rulings 3.1 and 3.2.
- [ ] **Step 4:** Run the file, the whole suite, typecheck, lint, contract scan. All green.
- [ ] **Step 5:** Write the docs and the record per ruling 3.3; run every gate; record the
  measured counts.
- [ ] **Step 6:** Commit (code and docs may be separate commits).
