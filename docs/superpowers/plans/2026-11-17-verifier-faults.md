# Verifier Faults Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Red is observed before green for every new pin.

**Goal:** A verifier that cannot answer is a fault — the seam throws, nothing lands — wherever the
signature layer applies; the instance refuses to land what it cannot verify; `create()` refuses a
malformed signing block.

**Architecture:** `layerVerdicts` records a verifier fault beside each verdict instead of reading
it as `false`; `signatureLayerHolds` rethrows only where the obligation applies, `verifySignatures`
always. The decorator's memoized mint becomes mint-then-verify. `create()` gains a shape check.

**Tech Stack:** TypeScript (strict), vitest, Biome.

**Spec:** `docs/superpowers/specs/2026-11-17-verifier-faults-design.md` — rulings 5.1–5.8 bind
every task; read it before starting any task.

**Task 0 (done before execution, by the authoring session):** the design and this plan are
committed together with their `docs/superpowers/INDEX.md` row and file counts.

## Global Constraints

- **Branch:** `verifier-faults-2026-11-17`, off `main` at `eedcd3a`. Confirm with
  `git branch --show-current` before every commit.
- **Commits:** message written to a BOM-free temp file (use the Write tool — the shell has failed
  to parse long heredocs here), committed with `git commit -F <file>`, ending with the exact line
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never amend, never push.
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
  `packages/store-postgres/src/**`; both `package.json` manifests; any existing `PINNED_` literal;
  the public `SignatureReport` type. The seven verification call sites' CODE does not change.
- **No existing assertion may change its truth value.** The two verifier-registry "boundary"
  tests may be retitled only. If an existing test goes red, STOP and report it.
- **New comments and markdown reference nothing outside this repository** (the contract scan's
  code-only patterns reject words like `design`, `Task 1`, `slice` in `.ts` comments).
- **Measured figures are measured, never copied.** Some markdown files are CRLF in the working
  tree — preserve line endings and check `git diff --numstat` for truncation before committing.

## Review Focus

1. **A junk sidecar entry on a record the layer does not apply to**, whose verifier throws, must
   change nothing at any seam (the anti-goal) — Task 1's no-overreach pin.
2. **The non-holder branch:** the obligation needs the genesis verdict; a faulted genesis
   verification must throw only when the live same-id profile declares `signing` (Task 1).
3. **The mint check's memo:** a failed check drops the memo entry, so the next attempt re-mints;
   a successful check is not repeated per CAS candidate (Task 2).
4. **An empty `verifiers` registry** constructs (a prepared instance) and the mint check refuses
   its first signature (Task 2).
5. **A rejecting (async) verifier and a synchronously throwing one** behave the same (Task 1).

---

### Task 1: The fault, at the gate and the read

**Files:**
- Modify: `packages/record/src/kernel/verify-signatures.ts` (`layerVerdicts`, `signatureLayerHolds`, `verifySignatures`, and their comments — the sixteenth inversion argued at its site)
- Modify: `packages/record/test/verifier-registry.test.ts` (retitle the two boundary tests only)
- Create: `packages/record/test/verifier-faults.test.ts`

**Interfaces:**
- Produces: `signatureLayerHolds(ctx, recordId, chain)` and `verifySignatures(ctx, recordId)` keep their signatures; they now reject with the fault per rulings 5.2–5.4.

- [ ] **Step 1: Write the pins** for design ruling 5.7's first five bullets (the eight seams with a throwing and a rejecting verifier, recovery afterwards; the enlisted seam and both cross-record verifications; `verifySignatures`; no overreach; the non-holder branch).
- [ ] **Step 2: Run; observe red** (today a fault reads `false`: the seams return `chain-compromise` and append). Record which pins already pass (the no-overreach and live-non-signing non-holder pins should).
- [ ] **Step 3: Implement rulings 5.1–5.4**; rewrite the comments; retitle the two boundary tests.
- [ ] **Step 4: Run the file, then the whole suite, typecheck, lint, contract scan.** All green.
- [ ] **Step 5: Commit.**

### Task 2: The mint check and the signing block's shape

**Files:**
- Modify: `packages/record/src/signing/decorate.ts` (`signOne` and its memo; the header)
- Modify: `packages/record/src/create.ts` (the `config.signing` shape check)
- Modify: `packages/record/src/signing/store.ts` (the `Verifier` and `SigningConfig` JSDoc — the contract)
- Create: `packages/record/test/signing-config.test.ts`

**Interfaces:**
- Consumes: Task 1's fault posture (a verifier fault during the mint check propagates the same way).

- [ ] **Step 1: Write the pins** for ruling 5.7's mint-check, `create()` and rotation bullets.
- [ ] **Step 2: Run; observe red.**
- [ ] **Step 3: Implement rulings 5.5 and 5.6**; the JSDoc states the contract (`true` verifies; `false` does not; throw only when you cannot answer — a throw on malformed input turns a tampered entry into a stuck record).
- [ ] **Step 4: Run the file, then the whole suite, typecheck, lint, contract scan.** All green.
- [ ] **Step 5: Commit.**

### Task 3: Documentation, the record, and the gates

**Files:**
- Modify: `docs/guide/api-reference.md` (the Verifier paragraph ~:614-626), `docs/guide/integrating.md` (the AL2 bullets)
- Modify: `CHANGELOG.md` (`[Unreleased]`, `Fixed`), `docs/process/implementation-status.md` (a new `## Post-build-order increment — Verifier faults` section after the release-hardening section, modelled on it, with an **Inversions** paragraph naming the sixteenth; the "Current state" counts), `docs/process/next-phases.md` (the `unavailable` entry: built here), `CLAUDE.md` (the measured counts only)

- [ ] **Step 1:** Write the docs per ruling 5.8 (prose only; no guide code sample changes).
- [ ] **Step 2:** Run every gate: whole suite (with `--reporter=json --outputFile=.vitest-results.json`, then `node scripts/ci-assert-tests.mjs .vitest-results.json`, then delete the json), typecheck, lint (`--error-on-warnings` too), build (`node_modules/.bin/tsc -p packages/record/tsconfig.build.json && node_modules/.bin/tsc -p packages/store-postgres/tsconfig.build.json`), contract scan, api-reference sync, docs-index sync. Record the measured counts.
- [ ] **Step 3: Commit.**
