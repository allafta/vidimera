# Profile Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `create()` keeps a frozen plain-data snapshot of each profile, validated and digested
once, and refuses unknown keys, wrong types, non-arrays, oversized bounds and inert
`terminalRefusals` members.

**Architecture:** A new internal module, `profile-snapshot.ts`, builds the snapshot by a
bounded schema. `create.ts` validates and digests the snapshot and keeps only it.
`config.ts`'s `validateProfile` gains the type, shape and bound rules. `profile-digest.ts`
keeps an own `__proto__` key.

**Tech Stack:** TypeScript, vitest, node:assert/strict.

**Spec:** `docs/superpowers/specs/2026-11-20-profile-snapshot-design.md`.

## Global Constraints

- **Branch:** `profile-snapshot-2026-11-20`, off `main` at `0bfe7e2`.
- **Commits:** BOM-free message files, `git commit -F`, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never amend.
- **Tests:** `node:assert/strict`, not vitest's `expect`. The repo's tests are the style
  reference: read `packages/record/test/construction-validation.test.ts` and
  `packages/record/test/helpers/profiles.ts` before writing pins.
- **Never touch** `packages/record/test/byte-stability.test.ts`'s digests. The byte-regression
  suites must pass unchanged.
- **Existing assertions do not change.** If one must, stop and report it as an inversion
  candidate with the reason.
- **No new export from `packages/record/src/index.ts`.**
- **Message register.** `invalid profile '<id>': …` for profile rules; `create: …` for config
  rules. Every currently pinned message keeps its exact text.
- **The bound cap:** `3_155_760_000` seconds (100 Julian years), one named constant in
  `config.ts`.
- **Gates** (run from the repo root; pnpm is broken here):
  - `node_modules/.bin/vitest run`, or for the whole suite:
    `node_modules/.bin/vitest run --reporter=json --outputFile=.vitest-results.json`, then
    `node scripts/ci-assert-tests.mjs .vitest-results.json`, then delete the json;
  - `node_modules/.bin/tsc -p packages/record --noEmit`;
  - `node_modules/.bin/biome check . --error-on-warnings`;
  - `node scripts/contract-scan.mjs`;
  - `node scripts/api-reference-sync.mjs`;
  - `node scripts/docs-index-sync.mjs`.

## Review Focus

1. A profile that constructs today and is legal by SPEC §9.1 that the snapshot now refuses,
   for example a `null`-prototype object or a frozen literal.
2. The digest invariant broken for some accepted profile, so that `profileDigest(input)` is
   not the bound digest.
3. A pinned message whose text changed because the snapshot now throws first.
4. A feature-conditional `terminalRefusals` producer mapped wrongly, refusing a member the
   leg can in fact produce.
5. The kernel still reading the host's object anywhere after `create()`.

### Task 1: The snapshot

**Files:**
- Create: `packages/record/src/profile-snapshot.ts`
- Modify: `packages/record/src/create.ts` (the profile loop and the config reads in
  `createWithClock`; `ResolvedProfile`'s comment)
- Modify: `packages/record/src/profile-digest.ts` (`dataOnly` builds with `Object.fromEntries`)
- Modify: `packages/record/src/config.ts` (export the stray-redemption-key message builder for
  the snapshot to reuse; nothing else in this task)
- Test: `packages/record/test/profile-snapshot.test.ts`

**Interfaces:**
- Produces: `snapshotProfile(input: unknown, position: number): ConfirmProfile`, a deeply
  frozen plain-data copy per the design's §2 schema. It throws `Error` with the
  `invalid profile` register. `position` is the index in `config.profiles`, used when the id
  is not yet a string.
- Produces: the `create()` loop reads `config.profiles` once and requires an array. For each
  element, in order: `snapshotProfile`, then `validateProfile(snapshot)`, the duplicate-id
  check, `resolveCanonicalizer`, and `ResolvedProfile { profile: snapshot, …,
  profileDigest: profileDigest(snapshot) }`. `config.store`, `config.canonicalizers` and
  `config.signing` are read once into locals that everything below uses.

- [ ] **Step 1: Write the failing pins** in `profile-snapshot.test.ts`:
  - post-create mutation (design §4's list) changes no seam's outcome and no bound digest;
  - every node of the held snapshot is frozen. Reach it through behaviour only (no new
    export): mutate the input and observe that nothing changes;
  - a getter-class profile, an `Object.create(base)` profile, a non-enumerable own
    `signing`, a sparse `requiredConsultations` and a `Set` `requiredConsultations` each
    throw at `create()`, with a message naming the shape;
  - the digest invariant over every profile in `test/helpers/profiles.ts`: `profileDigest(p)`
    equals the genesis's bound `profileDigest` after `stage` and `open`;
  - `projectProfile` keeps an own `__proto__` key, and a profile whose
    `freshness['__proto__']` differs digests differently.
- [ ] **Step 2: Run them;** each fails on the current source for the old behaviour.
- [ ] **Step 3: Implement** `profile-snapshot.ts`, the `create.ts` wiring and the `dataOnly`
  change. Read each property with `Object.getOwnPropertyDescriptor` once. Build the
  `freshness` record with `Object.fromEntries` (or `Object.defineProperty`), so an own
  `__proto__` key survives. Freeze every node.
- [ ] **Step 4: Run the whole suite.** The new pins pass, and no existing assertion changes.
- [ ] **Step 5: Run the gates;** commit.

### Task 2: The construction rules

**Files:**
- Modify: `packages/record/src/config.ts` (`validateProfile` and its helpers)
- Modify: `packages/record/src/canonical.ts` (`resolveCanonicalizer`)
- Modify: `packages/record/src/profile-snapshot.ts` (only where a design rule lands there)
- Test: `packages/record/test/construction-validation.test.ts` (additions only)

**Interfaces:**
- Consumes: Task 1's `snapshotProfile`. Validation always runs on a snapshot, so values are
  primitives, plain objects or arrays.

- [ ] **Step 1: Write the failing pins.** Design §4's construction list, one `it` per rule.
  For the F087 table, before writing each pin, confirm the producer in
  `kernel/finalize.ts`/`kernel/decline.ts`/`kernel/findings.ts`, and report any row the code
  contradicts.
- [ ] **Step 2: Run them;** each fails on Task 1's head.
- [ ] **Step 3: Implement the rules** (design §2's "Type, shape and bound rules" and F084).
  The cap is one constant.
- [ ] **Step 4: Run the whole suite.** No existing assertion changes. If an existing test
  profile now throws (a bound over the cap, or an inert member), stop and report it.
- [ ] **Step 5: Run the gates;** commit.

### Task 3: Docs and records

- [ ] Design §5's guide passages: what they say now, and what is true after Tasks 1–2.
  `ResolvedProfile`'s comment.
- [ ] Then the records: `CHANGELOG.md` (Changed); the status record's section (the
  thirty-eighth post-build-order increment, with what landed per commit, the pins, the
  inversions, and the gates as measured); `CLAUDE.md`'s measured test counts; this plan's
  INDEX row is already in. Run the gates; commit.
