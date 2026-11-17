# Signing Obligation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Red is observed before green for every new pin.

**Goal:** The AL2 obligation every verification site enforces comes from the profile the
instance holds for the record, or — where it does not hold it — from the chain's own verified
genesis, so a same-id edit that adds `signing: true` refuses `unknown-profile` with no edge.

**Architecture:** One rule inside `layerVerdicts` (`kernel/verify-signatures.ts`), the
correlation core both `signatureLayerHolds` and `verifySignatures` share. The seven call sites
do not change. The public report does not change.

**Tech Stack:** TypeScript (strict), vitest, Biome, `node:sqlite`.

**Spec:** `docs/superpowers/specs/2026-11-17-signing-obligation-design.md` — rulings 5.1–5.6 bind
every task; read it before starting any task.

**Task 0 (done before execution, by the authoring session):** the design and this plan are
committed together with their `docs/superpowers/INDEX.md` row and file counts.

## Global Constraints

- **Branch:** `signing-obligation-2026-11-17`, stacked on `identity-snapshot-2026-11-17`
  (`1dde68b`). Confirm with `git branch --show-current` before every commit.
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
  `packages/store-postgres/src/**`; both `package.json` manifests; the seven call sites'
  code (`finalize.ts`, `decline.ts`, `findings-seams.ts`, `redeem.ts`, `seal.ts`,
  `prior-legs.ts`, `supersedes.ts` — comments in them may be corrected if they state the old
  rule); any existing `PINNED_` literal. No push, no merge.
- **No existing assertion may change its truth value.** If an existing test goes red, STOP and
  report it with its name and output.
- **The `SignatureReport` type and every field `verifySignatures` returns keep their values.**
- **New comments and markdown reference nothing outside this repository** (the contract scan's
  code-only patterns reject words like `design`, `Task 1`, `slice` in `.ts` comments — read
  `CLAUDE.md`'s contract-scan paragraph before writing comments).
- **Measured figures are measured, never copied.**

## Review Focus

1. **A broken GENESIS entry under a drifted signing sibling** reads as no obligation (ruling
   5.4) — so the exception pin must break a LATER entry. `test/helpers/signing.ts`'s
   `breakOneSignature` breaks the genesis entry: use it for the bound pin, not the exception pin.
2. **A holder of a non-signing profile with garbage in the sidecar** still passes every seam
   (`signing-enforce.test.ts`, "the layer does not overreach") — the rule must not read the
   sidecar as authority when the profile is held.
3. **A genesis payload without a string `profileId` or `profileDigest`** — `heldProfile` is
   called only with strings; otherwise the instance does not hold the profile.
4. **An instance with no `config.signing`** — no verifiers, so the genesis never verifies and an
   unheld chain carries no obligation (today's drop-direction pins stay green).
5. **The SQLite redeploy** — the opener's store is closed before the edited instance opens the
   same file, so the pin is the single-deployment shape, not two live instances.

---

### Task 1: The obligation rule, and its pins

**Files:**
- Modify: `packages/record/src/kernel/verify-signatures.ts` (`layerVerdicts` ~:135-212; the doc
  comments on the file header ~:1-23, `SignatureReport.signingDeclared` ~:32-41,
  `layerVerdicts` ~:109-134, `signatureLayerHolds` ~:240-252)
- Modify (comments only, where they state the live-profile obligation): `packages/record/src/operator-surface.ts`, `packages/record/src/config.ts` (~:56), `packages/record/src/signing/decorate.ts` (~:9), `packages/record/src/signing/store.ts` (~:8)
- Create: `packages/record/test/signing-obligation.test.ts`

**Interfaces:**
- Consumes: `heldProfile(profiles, { profileId, profileDigest })` from `kernel/held-profile.ts`.
- Produces: `layerVerdicts` returns one more internal field (name left to the builder) carrying
  the obligation; `signatureLayerHolds(ctx, recordId, chain)` keeps its signature.

- [ ] **Step 1: Write the pins (design ruling 5.5)** in `signing-obligation.test.ts`. Fixtures:
  an opener holding non-signing `P` and a sibling holding `{ ...P, signing: true }` with a real
  Ed25519 tier, sharing one `MemoryStore` (`profile-drift-gate.test.ts`'s `instance` and
  `signingTier` shapes). Tests:
  - `add-signing: finalize, decline, raiseFinding and acknowledge refuse unknown-profile with no edge, and the opener finalizes afterwards`
  - `add-signing: redeem, beginRedemption and completeRedemption refuse unknown-profile on a confirmed effect-seam record — the record stays confirmed`
  - `add-signing: seal refuses unknown-profile on a completed confirmed record — it stays confirmed and the opener seals it`
  - `add-signing: a successor leg's open() refuses prior-leg-unverified — no record created`
  - `add-signing: supersedes over a declined predecessor verifies and the new record opens; over a confirmed predecessor it refuses supersedes-unverified`
  - `add-signing on one SqliteStore file redeployed in place: finalize and seal refuse unknown-profile and the records keep their state` (opener closed before the edited instance opens the file; a temp file under `os.tmpdir()`, removed in `finally`)
  - `the exception keeps its reach: a ttl-edited signing sibling draws chain-compromise on a signing record whose later entry is broken — one edge`
  - `the exception gains the drop direction: a sibling that dropped signing but keeps the verifier draws chain-compromise on the same break — one edge` (withdrawn by the design's §8 amendment after the whole-branch review: the pin was inverted to "refuses unknown-profile with no edge", and a key-gap pin added)
  - `the bound: with the genesis entry deleted, and separately broken, a ttl-edited signing sibling refuses unknown-profile with no edge, while the holder refuses chain-compromise`
  Every refusal is asserted whole (status, code, class, and `transitionRef` absent for
  never-append refusals); every no-edge claim is a chain-length comparison.

- [ ] **Step 2: Run the new file; observe red.** `node_modules/.bin/vitest run packages/record/test/signing-obligation.test.ts`.
  Expected: the add-signing operator-seam tests, the supersedes-over-declined test and the
  drop-direction exception test FAIL (today: `chain-compromise`, or `unknown-profile` for the
  drop direction); the prior-leg test, the ttl exception test and the holder half of the bound
  test may already pass — record which in the report.

- [ ] **Step 3: Implement ruling 5.1** in `layerVerdicts`, and correct the four doc comments in
  `verify-signatures.ts` (state the rule and ruling 5.4's bound; drop the claim that the live
  reading cannot reach a seam). Correct any comment in the files listed above that states the
  obligation as the live profile's declaration.

- [ ] **Step 4: Run the new file, then the whole suite, typecheck, lint, contract scan.** All
  green; no existing test changed.

- [ ] **Step 5: Commit** (`git add` the test and the touched sources only).

### Task 2: Documentation, the record, and the gates

**Files:**
- Modify: `docs/guide/integrating.md` (the AL2 bullet on losing `signing` in place ~:560-565;
  one sentence after the AL2 sample ~:546)
- Modify: `docs/guide/api-reference.md` (the `signingDeclared` paragraph ~:575-588)
- Modify: `CHANGELOG.md` (`[Unreleased]`, `Fixed`)
- Modify: `docs/process/implementation-status.md` — a new
  `## Post-build-order increment — Signing obligation` section after the identity-snapshot
  section, modelled on it: what landed per commit, the measured gates, an **Inversions**
  paragraph (none expected — say why: the drift-gate design §5 sentence is made true, not
  reversed; no pin covered the narrowed genesis-broken case), ruling 5.4's bound, the non-goals
  (the supersedes fold for every predecessor state; rehoming; `review()` coverage) named as
  open; the "Current state" counts
- Modify: `CLAUDE.md` — the measured suite counts only

- [ ] **Step 1:** Write the guide sentences per design ruling 5.6 (prose only; no code sample
  changes), the CHANGELOG entry (what it fixes for a host, with ruling 5.4's limit), and the
  status section.
- [ ] **Step 2:** Run every gate: whole suite, typecheck, lint (`--error-on-warnings` too),
  build (`node_modules/.bin/tsc -p packages/record/tsconfig.build.json && node_modules/.bin/tsc -p packages/store-postgres/tsconfig.build.json`),
  contract scan, api-reference sync, docs-index sync. All exit 0; record the measured counts.
- [ ] **Step 3: Commit.**
