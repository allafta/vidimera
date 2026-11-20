# Operator Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every operator seam and every read throws a named caller error, before any store call,
for:

- a non-string id;
- a non-object options bag;
- a primitive `tx`;
- a malformed `priorRecordRefs`;
- a digest field outside SPEC §7's form;
- an impossible `observedAt`;
- an ill-formed operator string.

**Architecture:** Shared helpers enforce the rules at intake:

- `canonical.ts` holds `isDigestForm`;
- an id guard used by every seam and read;
- a calendar check beside the `observedAt` regex.

Each seam's existing intake validator calls them. The read path, including `identitySnapshot`,
does not change.

**Tech Stack:** TypeScript, vitest, `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-11-20-operator-intake-design.md`.

## Global Constraints

- **Branch:** `operator-intake-2026-11-20`, off `main` at `19bdbc7`.
- **Commits:** BOM-free message files, `git commit -F`, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never amend.
- **No external review IDs anywhere** (files, test titles, comments, commit messages).
- **Never touch `packages/record/test/byte-stability.test.ts`.** The byte-regression suites
  pass unchanged.
- **Existing assertions do not change.** An existing test may have a placeholder digest input
  made form-valid only when its subject is not digest form. List every such test. A test that
  pins the old leniency is an inversion: stop and report it.
- **No new export from `packages/record/src/index.ts`.**
- **Every throw is a named caller error with the seam's head,** raised before any store read,
  lock or append, and the same on every backing.
- **Gates** (run from the repo root; pnpm is broken):
  - the suite: `node_modules/.bin/vitest run --reporter=json --outputFile=.vitest-results.json`,
    then `node scripts/ci-assert-tests.mjs .vitest-results.json`, then delete the json;
  - `tsc --noEmit` for both packages;
  - `node_modules/.bin/biome check . --error-on-warnings`;
  - `node scripts/contract-scan.mjs`, `api-reference-sync.mjs` and `docs-index-sync.mjs`.

## Review Focus

1. **A read-path change.** A persisted record behaves differently: a prior actor read through
   `identitySnapshot`, a stored digest, a replayed payload.
2. **A legitimate host value now refused.** A digest from another algorithm, a leap-day
   `observedAt`, a real driver transaction handle, an empty-string id that today answers
   `null`.
3. **A check placed after a store call or lock,** so a refused call still leaves a trace or
   still meets a raw driver error.
4. **An evidence edge still suppressed** by a primitive `tx` on some refusal path.
5. **A seam or read missed by the id guard.**

### Task 1: Ids, options bags, `tx`, `priorRecordRefs`

**Files:**
- Modify: the `kernel/*.ts` seams, `create.ts` (operator reads), `agent-surface.ts` /
  `operator-surface.ts` if the reads are wired there, and `kernel/prior-legs.ts` or `open.ts`
  for `priorRecordRefs`.
- Test: create `packages/record/test/operator-intake.test.ts`.

**Interfaces:**
- Produces a shared id guard (internal), e.g. `assertIdArg(seam, name, value)`, which throws
  `<seam>: <name> must be a string`.
- Produces an options-bag guard shared by the options-taking seams.

- [ ] **Step 1: Write the failing pins** (design §4: ids, options bags, `tx`,
  `priorRecordRefs`).
- [ ] **Step 2: Run them.** They are red on `19bdbc7`.
- [ ] **Step 3: Implement.** Also fix the single-append storage-fault message.
- [ ] **Step 4: Run the whole suite and the gates.** Commit.

### Task 2: Digest form, `observedAt`, well-formed operator strings

**Files:**
- Modify: `canonical.ts` (`isDigestForm`), `kernel/consultations.ts`, `kernel/open.ts`,
  `kernel/findings-seams.ts`, `kernel/redeem.ts`, `kernel/supersedes.ts`, and the seams' actor
  intake.
- Test: add to `operator-intake.test.ts`.

**Interfaces:**
- Produces `isDigestForm(value: unknown): boolean`, internal. It accepts
  `/^[a-z][a-z0-9-]*:(?:[0-9a-f]{2})+$/`.
- Reuses `utf16.ts`'s `isWellFormedUtf16` for operator strings.

- [ ] **Step 1: Write the failing pins** (design §4: digest fields, `observedAt`, ill-formed
  strings, and the read-path guard).
- [ ] **Step 2: Run them.** They are red.
- [ ] **Step 3: Implement.** Do not change `identitySnapshot`.
- [ ] **Step 4: Run the whole suite and the gates.** List every existing test whose
  placeholder digest you made form-valid. Commit.

### Task 3: Docs and records

- [ ] Design §5. Run the gates and commit.
