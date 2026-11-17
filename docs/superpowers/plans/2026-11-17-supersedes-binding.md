# Supersedes Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Red is observed before green for every new pin.

**Goal:** `verifySupersedes` refuses `supersedes-unverified` whenever the instance does not hold
the predecessor's profile, for every terminal state, as SPEC §4's fold sentence states.

**Architecture:** One `heldProfile` check in `kernel/supersedes.ts`, placed after the subject
check; the `confirmed` branch reuses its result. Nothing else in the kernel moves.

**Tech Stack:** TypeScript (strict), vitest, Biome.

**Spec:** `docs/superpowers/specs/2026-11-17-supersedes-binding-design.md` — rulings 5.1–5.4
bind every task; read it before starting any task.

**Task 0 (done before execution, by the authoring session):** the design and this plan are
committed together with their `docs/superpowers/INDEX.md` row and file counts.

## Global Constraints

- **Branch:** `supersedes-binding-2026-11-17`, stacked on `signing-obligation-2026-11-17`
  (`8db734d`). Confirm with `git branch --show-current` before every commit.
- **Commits:** message written to a BOM-free temp file (a bash heredoc in the session
  scratchpad), committed with `git commit -F <file>`, ending with the exact line
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Commands — `pnpm` is broken on this machine; run from the repo root:** one test file
  `node_modules/.bin/vitest run <path>`; whole suite `node_modules/.bin/vitest run` (the
  embedded-postgres `TypeError: done is not a function` printed after the results is known
  teardown noise — judge by the summary lines); typecheck
  `node_modules/.bin/tsc -p packages/record --noEmit && node_modules/.bin/tsc -p packages/store-postgres --noEmit`;
  lint `node_modules/.bin/biome check .` (format with `--write <files>`); gates
  `node scripts/contract-scan.mjs`, `node scripts/api-reference-sync.mjs`,
  `node scripts/docs-index-sync.mjs`. `smoke` cannot run here.
- **STOP, absolute — never edit:** `docs/concept/**`; `packages/record/test/byte-stability.test.ts`;
  `packages/record/src/index.ts`; any `packages/record/src/store/**` file;
  `packages/store-postgres/src/**`; both `package.json` manifests; any kernel file other than
  `kernel/supersedes.ts` (comments in `kernel/verify-signatures.ts` may be corrected); any
  existing `PINNED_` literal. No push, no merge.
- **Exactly four existing assertions change their truth value** (design ruling 5.2): the
  declined half of `test/profile-drift-gate.test.ts`'s supersedes test, and three supersedes
  pins in `test/signing-obligation.test.ts` (the add-signing supersedes-over-declined half and
  the two "recorded residual at supersedes" tests). Any OTHER test going red: STOP and report.
- **New comments and markdown reference nothing outside this repository** (the contract scan's
  code-only patterns reject words like `design`, `Task 1`, `slice` in `.ts` comments).
- **Measured figures are measured, never copied.**

## Review Focus

1. **The escalation recipe** — a different successor profile on an instance that also holds the
   predecessor's — must still verify (Task 1, the routes pin).
2. **A `confirmed` predecessor** keeps its existing behavior: the held check now runs before it,
   and the terminality computation reuses the held profile.
3. **A predecessor whose profile id is not registered at all** refuses — the original forged
   route — and re-registering the id unchanged restores recovery.
4. **No record is created on a refusal** — `open()` refuses pre-record; assert it (e.g. the
   subject is still free afterwards, or the store holds no new chain).
5. **The inverted pin keeps its recovery story visible**: the holder recovers the same declined
   record in the same test.

---

### Task 1: The fold, the inversion, and its pins

**Files:**
- Modify: `packages/record/src/kernel/supersedes.ts` (`verifySupersedes` ~:65-96; the header
  ~:1-19 and the state-check comment ~:94)
- Modify: `packages/record/test/profile-drift-gate.test.ts` (the supersedes test ~:387-421 —
  inversion, argued at the site)
- Modify: `packages/record/test/signing-obligation.test.ts` (the three supersedes pins named in
  Global Constraints, and the file header's sentence on the residual)
- Create: `packages/record/test/supersedes-binding.test.ts`

**Interfaces:**
- Consumes: `heldProfile(profiles, binding)` from `kernel/held-profile.ts`; `replay(chain)`'s
  `profileId`/`profileDigest`.
- Produces: no new export; `verifySupersedes` keeps its signature.

- [ ] **Step 1: Write the new pins (design ruling 5.3)** in `supersedes-binding.test.ts`:
  - `a forged declined chain naming an unregistered profile id refuses supersedes-unverified — no record is created`
  - `a forged declined chain naming a registered id with a non-matching profileDigest refuses supersedes-unverified`
  - `every terminal state the fixtures reach verifies for the holder and refuses for a same-id instance at a different digest` (one `test` per state is fine; name each state)
  - `escalation: an instance holding both the declined record's profile and a stricter one supersedes under the stricter one`
  - `a registry without the predecessor's id refuses; re-registering the id unchanged recovers`
- [ ] **Step 2: Run the new file; observe red.** The two forged-chain tests and the
  different-digest halves fail today (`ok`); the holder halves and the routes may pass — record
  which.
- [ ] **Step 3: Implement ruling 5.1**; rewrite the header and state-check comments to the new
  rule.
- [ ] **Step 4: Invert the four pins (ruling 5.2).** In `profile-drift-gate.test.ts`, the
  declined half now expects `supersedes-unverified`, the holder then supersedes the same declined
  record successfully, and a comment at the site argues the inversion (the fifteenth
  self-authored inversion; the drift-gate ruling argued terminality, SPEC §4's fold sentence asks
  whether the rules are held; the signature layer is where the asymmetry became a forged
  binding). In `signing-obligation.test.ts`, the three pins expect `supersedes-unverified`,
  asserted whole, retitled to say the residual is closed by the supersedes fold.
- [ ] **Step 5: Run the new file, the two edited files, then the whole suite, typecheck, lint,
  contract scan.** All green.
- [ ] **Step 6: Commit.**

### Task 2: Documentation, the record, and the gates

**Files:**
- Modify: `packages/record/src/kernel/verify-signatures.ts` (comments only — any sentence that
  says a `supersedes` claim over a terminal non-`confirmed` predecessor verifies)
- Modify: `docs/guide/integrating.md` (the AL2 bullet's per-site outcomes; one sentence in the
  same-subject/any-profile escalation paragraph ~:271-276)
- Modify: `docs/guide/api-reference.md` (the per-site outcomes in the `signingDeclared` paragraph)
- Modify: `CHANGELOG.md` (`[Unreleased]`: a `Fixed` entry, and the signing-obligation entry's
  supersedes residual sentence marked closed here)
- Modify: `docs/process/implementation-status.md` — a new
  `## Post-build-order increment — Supersedes binding` section after the signing-obligation
  section, modelled on it (per-commit record, measured gates, an **Inversions** paragraph naming
  the **fifteenth** self-authored inversion with its argument and its pin, the non-goals named
  open); in the signing-obligation section, the supersedes residual marked closed by this
  increment; the "Current state" counts
- Modify: `CLAUDE.md` — the measured suite counts only

- [ ] **Step 1:** Write the docs per design ruling 5.4 (prose only; no guide code sample changes).
- [ ] **Step 2:** Run every gate: whole suite, typecheck, lint (`--error-on-warnings` too),
  build (`node_modules/.bin/tsc -p packages/record/tsconfig.build.json && node_modules/.bin/tsc -p packages/store-postgres/tsconfig.build.json`),
  contract scan, api-reference sync, docs-index sync. All exit 0; record the measured counts.
- [ ] **Step 3: Commit.**
