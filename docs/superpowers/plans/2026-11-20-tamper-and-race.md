# Tampering, Faults and Lost Races Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three behaviours change:

- tampering never crashes verification, and a detected break lands its edge at the store's next
  seq;
- faults throw instead of posing as domain refusals;
- lost races answer what re-invocation would.

Admission runs before the clock.

**Architecture:**

- `verifyChain` gains per-row shape and digest checks.
- `appendChainCompromise` gains a head guard and seq candidates.
- The redemption residual and `seal` take the append result.
- A shared lost-resolution helper lives in `kernel/expiry.ts`.
- `open()`'s single retry is factored, wrapped, and taken for a terminal blocker.
- Result admission moves into the redemption prologue.

**Tech Stack:** TypeScript, vitest, `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-11-20-tamper-and-race-design.md`.

## Global Constraints

- **Branch:** `tamper-and-race-2026-11-20`, off `main` at `c5e4fe6`.
- **Commits:** BOM-free message files, `git commit -F`, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never amend.
- **No external review IDs anywhere** (files, test titles, comments, commit messages).
- **Code comments** must clear `contract-scan`. In particular, every `SPEC §N` /
  `DECISIONS.md #N` citation must resolve, and any quoted phrase must be verbatim.
- **Never touch `packages/record/test/byte-stability.test.ts`.** The byte-regression suites must
  pass unchanged.
- **No existing assertion changes.** Never invert the inherited pin in `exclusivity.test.ts`
  ("… record-exists, NEVER re-loop"); that change is deferred to the owner.
- **The two self-authored stance inversions** are argued at their sites and numbered eighteenth
  and nineteenth. The seventeenth is in `signing/decorate.ts`.
- **No new export** from `packages/record/src/index.ts`.
- **Gates** (run from the repo root; pnpm is broken):
  - the suite: `node_modules/.bin/vitest run --reporter=json --outputFile=.vitest-results.json`,
    then `node scripts/ci-assert-tests.mjs .vitest-results.json`, then delete the json;
  - `tsc --noEmit` for both packages;
  - `node_modules/.bin/biome check . --error-on-warnings`;
  - `node scripts/contract-scan.mjs`, `api-reference-sync.mjs` and `docs-index-sync.mjs`.
- **Research notes** with line-level evidence are at
  `C:/Users/a/AppData/Local/Temp/claude/5a5780d303f17bd4/67520ab5-626f-422b-be28-73a20895fb11/scratchpad/p15-research.md`.
  They are outside the repo. Use them for locations and pin shapes, and never copy their
  finding IDs.

## Review Focus

1. **A contiguous, honest chain behaves differently.** It must not: same edge seq, same bytes,
   same mint count.
2. **A verifying seam that still throws** on a damaged chain, or a seam whose compromise edge
   still cannot land after a deletion, on any backing.
3. **An honest race now throws, or a fault still returns a domain code.**
4. **A re-read that changes an outcome on a path with no lost CAS.**
5. **The admission move changes the outcome of a correct call.**

### Task 1: Tampering never crashes verification; the edge lands

**Files:** `chain/replay.ts` (`verifyChain`); `kernel/finalize.ts` (`appendChainCompromise`, the
rung-(4.5) message); `signing/decorate.ts` (the cold-cache genesis read); comments in `jcs.ts` and
`operator-surface.ts`. Tests: a new `packages/record/test/tamper-shapes.test.ts`, plus a
store-postgres test file for the Postgres legs.

- [ ] **Failing pins:** design §4, "Verification and the compromise edge". They are red on
  `c5e4fe6`.
- [ ] **Implement.**
- [ ] **Run the whole suite and the gates,** then commit.

### Task 2: Faults throw; lost races re-read

**Files:** `kernel/redeem.ts` (the residual, the prologue's admission); `kernel/seal.ts`;
`kernel/expiry.ts` (the new helper); the state rungs in `kernel/finalize.ts`, `kernel/decline.ts`
and `kernel/findings-seams.ts`; `kernel/open.ts` (factored retry, terminal-blocker retry, retry
wrap, retry conflict mapping); `create.ts` (`listDue`); `chain/binding.ts` and `outcome.ts`
comments; the chain-binding census tally. Tests: a new
`packages/record/test/faults-and-races.test.ts`, and the admission pins in
`effect-result.test.ts`, as additions plus the one pin that cannot fail moving to a
non-declaring profile in a new test.

- [ ] **Failing pins:** design §4, "Faults and races" and "Admission and findings". They are
  red, except the characterization pins.
- [ ] **Implement,** arguing the eighteenth and nineteenth inversions at their sites.
- [ ] **Run the whole suite and the gates,** then commit.

### Task 3: Docs and records

- [ ] Design §5. Run the gates, then commit.
