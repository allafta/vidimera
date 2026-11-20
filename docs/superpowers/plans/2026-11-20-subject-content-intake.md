# Subject and Content Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `stage()` accepts only a well-formed, bounded string `subjectRef`. Content binding
refuses thenables, non-plain objects and ill-formed strings. `serializeJcs` refuses objects with
no JSON form, and `digest` refuses ill-formed strings.

**Architecture:**

- a `subjectRef` rule, applied at `stage()` and to the drafts `open()` resolves;
- one content-binding helper in `canonical.ts`, used by the six binding sites;
- `serializeJcs` gains a plain-object rule (always) and an internal strict mode (well-formed
  strings), and the helper uses that mode.

**Tech Stack:** TypeScript, vitest, `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-11-20-subject-content-intake-design.md`.

## Global Constraints

- **Branch:** `subject-content-intake-2026-11-20`, off `main` at `38ed58e`.
- **Commits:** BOM-free message files, `git commit -F`, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never amend.
- **No external review IDs anywhere.** That means no `F###`/`G###`-style identifiers in files,
  test titles, comments or commit messages. Describe the defect instead.
- **Never touch `packages/record/test/byte-stability.test.ts`.** The byte-regression suites
  must pass unchanged.
- **Existing assertions do not change.** If one must, stop and report it as an inversion
  candidate.
- **No new export** from `packages/record/src/index.ts`.
- **The cap:** `subjectRef` at most `1024` bytes in UTF-8. It is one named constant.
- **Node floor is 22, and `tsconfig` `lib` is ES2022.** `String.prototype.isWellFormed` is not
  in the type lib, so use a local helper.
- **Gates** (run from the repo root; pnpm is broken):
  - `node_modules/.bin/vitest run --reporter=json --outputFile=.vitest-results.json`, then
    `node scripts/ci-assert-tests.mjs .vitest-results.json`, then delete the json;
  - `node_modules/.bin/tsc -p packages/record --noEmit` and
    `node_modules/.bin/tsc -p packages/store-postgres --noEmit`;
  - `node_modules/.bin/biome check . --error-on-warnings`;
  - `node scripts/contract-scan.mjs`, `node scripts/api-reference-sync.mjs` and
    `node scripts/docs-index-sync.mjs`.

## Review Focus

1. **The read path must stay as it was.** A persisted chain carrying a lone surrogate must
   still verify, and a tampered one must still report a break rather than throw.
   `canonicalize` and the transition encoding must not use the strict mode.
2. **A refusal that writes or appends.** A thenable, non-plain or ill-formed output must write
   no draft at `stage()` and append nothing at the five other seams.
3. **A refused async canonicalizer still crashing the process** through an unobserved
   rejection.
4. **A library-internal value that `serializeJcs` now refuses.** For example a store row, a
   `Uint8Array`, or a library-built payload that is not a plain object.
5. **Inconsistent subject handling across backings.** A subject the rule accepts must open on
   `PostgresStore` too.

### Task 1: The subjectRef rule

**Files:**
- Create: `packages/record/src/subject-ref.ts`
- Modify: `packages/record/src/kernel/stage.ts` and `packages/record/src/kernel/open.ts`
- Test: create `packages/record/test/subject-intake.test.ts`. The PostgresStore leg goes into
  `packages/store-postgres/test/postgres-store.test.ts` (or the file there that holds the
  store-level cases).

**Interfaces:**
- Produces `subjectRefProblem(value: unknown): string | undefined`. It returns undefined for a
  legal subject, or a short phrase naming the broken rule, and is internal (no index export).
  `stage()` throws `Error('stage: subjectRef ' + problem + …)` before profile resolution.
  `open()` throws with an `open:` head when the resolved or `proposed` draft's `subjectRef`
  fails.

- [ ] **Step 1: Write the failing pins** (design §4, the `subjectRef` list).
- [ ] **Step 2: Run them.** They are red on `38ed58e`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the whole suite and the gates.** Commit.

### Task 2: Content binding and the serializer

**Files:**
- Modify: `packages/record/src/jcs.ts`, `packages/record/src/canonical.ts`, `kernel/stage.ts`,
  `kernel/finalize.ts`, `kernel/decline.ts` and `kernel/redeem.ts`
- Test: create `packages/record/test/content-intake.test.ts`; add to `jcs.test.ts`.

**Interfaces:**
- Produces `bindContent(canonicalizer, canonicalizerRef: string, content: unknown): Digest` in
  `canonical.ts`, internal only. It calls the canonicalizer, refuses a thenable (attaching a
  rejection handler first), serializes in strict mode, and digests.
- `serializeJcs(value, options?: { wellFormed?: boolean })`: `wellFormed: true` throws on any
  ill-formed string it writes. The default keeps today's escaping. The plain-object rule
  applies in both modes.
- `digest(string)` throws on an ill-formed string.

- [ ] **Step 1: Write the failing pins** (design §4, the content and serializer lists).
  - To show the rejection is observed, listen for `unhandledRejection` in the test, let
    microtasks and a macrotask flush, and assert it never fired.
- [ ] **Step 2: Run them.** They are red on Task 1's head.
- [ ] **Step 3: Implement.** Replace all six binding expressions with `bindContent`. Keep each
  site's existing fault posture (a throw propagates and appends nothing).
- [ ] **Step 4: Run the whole suite and the gates.** No existing assertion may change. If an
  internal path now throws, stop and report it. Commit.

### Task 3: Docs and records

- [ ] Design §5's passages. Then the records:
  - `CHANGELOG.md`;
  - the status record's section, "the thirty-ninth post-build-order increment";
  - `next-phases.md`: the staged-draft prune to the sanction-gated list, and operator intake as
    the next item;
  - `CLAUDE.md`'s measured counts.

  Run the gates and commit.
