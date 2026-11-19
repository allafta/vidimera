# Transactional Sidecar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Red is observed before green for every new pin.

**Goal:** On `MemoryStore`, `SqliteStore` and `PostgresStore`, a signature entry is written inside
the atomic unit of the append it signs, after its compare-and-swap passes and only then, whenever
the configured sidecar is the store's own.

**Architecture:** `Store` gains an optional `signatures` sidecar and `AppendMeta` an optional
`signatures` channel; each reference backing writes the channel inside its append's unit; the
signing decorator selects integrated mode by identity and otherwise keeps today's order.

**Tech Stack:** TypeScript (strict), vitest, Biome, `node:sqlite`, `pg`.

**Spec:** `docs/superpowers/specs/2026-11-19-transactional-sidecar-design.md` — rulings 5.1–5.7
bind every task; read it before starting any task.

**Task 0 (done before execution, by the authoring session):** the design and this plan are
committed together with their `docs/superpowers/INDEX.md` row and file counts.

## Global Constraints

- **Branch:** `transactional-sidecar-2026-11-19`, off `main` at `ff608bf`. Confirm with
  `git branch --show-current` before every commit.
- **Commits:** message written to a BOM-free temp file with the Write tool, committed with
  `git commit -F <file>`, ending with the exact line
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never amend, never push.
- **Commands — `pnpm` is broken on this machine; run from the repo root:** one test file
  `node_modules/.bin/vitest run <path>`; whole suite `node_modules/.bin/vitest run` (the
  embedded-postgres `TypeError: done is not a function` after the results is known teardown
  noise — judge by the summary lines); typecheck
  `node_modules/.bin/tsc -p packages/record --noEmit && node_modules/.bin/tsc -p packages/store-postgres --noEmit`;
  lint `node_modules/.bin/biome check . --error-on-warnings` (format with `--write <files>`);
  gates `node scripts/contract-scan.mjs`, `node scripts/api-reference-sync.mjs`,
  `node scripts/docs-index-sync.mjs`. `smoke` cannot run here.
- **STOP, absolute — never edit:** `docs/concept/**`; `packages/record/test/byte-stability.test.ts`;
  any existing `PINNED_` literal; either `package.json` manifest; `withSigning`'s exported
  signature; the `SignatureEntry` and `SignatureStore` member shapes.
- **No existing assertion may change its truth value.** Separate mode keeps today's behavior, so
  every existing pin should stay green unchanged; comments that describe the ordering may be
  edited to say which mode they describe. If an existing test goes red, STOP and report it.
- **New comments and markdown reference nothing outside this repository** (the contract scan's
  code-only patterns reject words like `design`, `Task 1`, `slice` in `.ts` comments).
- **Measured figures are measured, never copied.**
- **Byte stability:** no transition's bytes change; the frozen digests must stay green.

## Review Focus

1. **A write after the compare-and-swap but outside the unit** (row 22's hazard) — every
   backing's entry write must sit inside the same atomic unit as the transition rows, after the
   last check (Tasks 1–3).
2. **Every conflict arm writes nothing** — state, seq, exclusivity, C3, C4, a batch element —
   including the arms that return `{appended:false}` from inside a committed (empty) transaction
   on SQLite and Postgres (Tasks 2–3).
3. **A host transaction rolled back** after an enlisted append removes the entry on SQLite and
   Postgres (Tasks 2–3).
4. **Mode selection by identity only** — a wrapper without `signatures`, or a different sidecar
   object, runs in separate mode exactly as today (Task 1).
5. **A mismatched or miscounted `meta.signatures`** throws before anything is written, on every
   backing (Tasks 1–3).

---

### Task 1: The contract, the decorator, and `MemoryStore`

**Files:**
- Modify: `packages/record/src/store/store.ts` (`AppendMeta.signatures?`, `Store.signatures?`, their JSDoc per ruling 5.1)
- Modify: `packages/record/src/signing/decorate.ts` (integrated mode per 5.2; the header — the seventeenth inversion argued per 5.5)
- Modify: `packages/record/src/signing/store.ts` (the `SignatureStore` JSDoc: the two modes; orphans arise in separate mode)
- Modify: `packages/record/src/store/memory.ts` (the integrated sidecar per 5.3)
- Modify: `packages/record/test/conformance/store-conformance.ts` (the integrated-sidecar block per 5.6, run where `store.signatures` is defined)
- Create: `packages/record/test/transactional-sidecar.test.ts` (end-to-end, integrated mode over `MemoryStore`, and mode selection)

**Interfaces:**
- Produces: `AppendMeta.signatures?: readonly SignatureEntry[]`; `Store.signatures?: SignatureStore`;
  `MemoryStore.signatures: SignatureStore`. Tasks 2–3 implement the same contract.

- [ ] **Step 1: Write the pins** — the conformance block (5.6's first bullet, minus the
  transactional rollback case) and, in the new file: row 22's measurement over `MemoryStore` in
  integrated mode (six refusing `finalize` calls on a sealed signing record: sidecar length equals
  chain length, `verifySignatures(...).orphans` empty), `open()`'s expire-then-retry under a moving
  clock leaving no orphan genesis, mode selection (identity → integrated; a different
  `MemorySignatureStore` → separate, the old orphan behavior intact; a wrapper without
  `signatures` → separate), and a mismatched `meta.signatures` throwing with nothing applied.
- [ ] **Step 2: Run; observe red.**
- [ ] **Step 3: Implement rulings 5.1, 5.2, 5.3 (`MemoryStore`), 5.5.**
- [ ] **Step 4: Run the file, the conformance suite, then the whole suite, typecheck, lint,
  contract scan, api sync.** All green; the existing ordering pins unchanged.
- [ ] **Step 5: Commit.**

### Task 2: `SqliteStore`

**Files:**
- Modify: `packages/record/src/store/sqlite.ts` (the `signatures` table and sidecar; the in-unit insert in genesis, subsequent and batch bodies)
- Modify: `packages/record/test/conformance/store-conformance.ts` only if the transactional rollback case needs a backing hook
- Modify: `packages/record/test/transactional-sidecar.test.ts` (the SQLite cases)
- Modify: `packages/record/test/al2-conditions.test.ts` (condition (iii) met in integrated mode: the rollback splice and the lost-batch splice over `store.signatures` refuse `chain-compromise`; the existing pins' comments say they describe separate mode)

**Interfaces:**
- Consumes: Task 1's contract.

- [ ] **Step 1: Write the pins** — that `new SqliteStore(...).signatures` is defined (so the
  conformance block cannot skip this backing silently), the SQLite rollback case (an enlisted append under
  `BEGIN IMMEDIATE`, then `ROLLBACK`: no entry), row 22's measurement over SQLite, a
  `record-contended` lost batch leaving no entry, and the two integrated-mode condition (iii) pins.
- [ ] **Step 2: Run; observe red.**
- [ ] **Step 3: Implement 5.3 for SQLite** (existing database files gain the table on open).
- [ ] **Step 4: Run the files, then the whole suite, typecheck, lint, contract scan.** All green.
- [ ] **Step 5: Commit.**

### Task 3: `PostgresStore`

**Files:**
- Modify: `packages/store-postgres/src/postgres-store.ts` (the table in the lazy DDL; the sidecar; the in-unit insert)
- Modify or create tests under `packages/store-postgres/test/` (the shared conformance block runs; the host-client rollback case; row 22's measurement over Postgres)

**Interfaces:**
- Consumes: Task 1's contract (types imported from `@vidimera/record`).

- [ ] **Step 1: Write the pins** — that `PostgresStore` exposes `signatures` (so the conformance
  block cannot skip it silently), the host-client rollback case, row 22's measurement.
- [ ] **Step 2: Run; observe red.**
- [ ] **Step 3: Implement 5.3 for Postgres.**
- [ ] **Step 4: Run the store-postgres suite, then the whole suite, typecheck, lint.** All green.
- [ ] **Step 5: Commit.**

### Task 4: Documentation, the record, and the gates

**Files:**
- Modify: `docs/guide/integrating.md` (the AL2 section: the example's `signatures: store.signatures`, both modes, switching, the wrapper rule, the sidecar bullet), `docs/guide/api-reference.md` (`Store.signatures`, `AppendMeta.signatures`, the orphan paragraph by mode), `docs/guide/concepts.md` and `docs/guide/faq.md` where they state condition (iii)'s gap
- Modify: `docs/process/deferral-register.md` (row 22 retired, with the measurements and the separate-mode residual), `docs/process/next-phases.md`, `CHANGELOG.md` (`[Unreleased]`), `docs/process/implementation-status.md` (a new section: what landed per commit, the seventeenth inversion, measured gates; the "Current state" counts), `CLAUDE.md` (the counts and row 22's mention)

- [ ] **Step 1: Write the docs per ruling 5.7** (prose; the guide's AL2 code sample changes only
  its `signatures:` line, and the changed sample is executed as a scratch vitest file before it is
  written down).
- [ ] **Step 2: Run every gate** — the whole suite with `--reporter=json --outputFile=.vitest-results.json`,
  then `node scripts/ci-assert-tests.mjs .vitest-results.json`, then delete the json; typecheck;
  lint; both builds; contract scan; api sync; docs-index sync. Record the measured counts.
- [ ] **Step 3: Commit.**
