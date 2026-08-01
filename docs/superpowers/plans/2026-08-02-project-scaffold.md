# Project Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the docs-only Vidimera repository into a development-ready TypeScript pnpm-workspace monorepo with the concept set preserved whole under `docs/concept/` and the toolchain proven green by an honest walking skeleton.

**Architecture:** The ten-document concept set moves whole (renames only, zero content edits) to `docs/concept/`; a pnpm workspace grows around it with `packages/record` (`@vidimera/record`, zero runtime deps) whose only export, `create(config)`, throws a loud not-implemented construction error — the docs' own feature-guard discipline applied at day zero. The standalone-contract scan becomes cross-platform Node tooling wired into scripts and CI.

**Tech Stack:** TypeScript (strict, NodeNext), pnpm workspaces, vitest, Biome, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-02-project-scaffold-design.md`

## Global Constraints

- Platform is Windows / PowerShell 5.1 — commands below are PowerShell unless marked otherwise. No `&&` chaining; use `;`.
- The concept set (`docs/concept/` after Task 1) gets **renames only** — zero content edits, maturity markers untouched.
- **No tracked markdown except `CLAUDE.md` may contain an external URL or an ADR-style internal reference** — this plan file included. Additionally, the concept set (`docs/concept/`) and root `README.md` may not contain relative paths escaping their self-contained scope; engineering docs elsewhere may quote code with intra-repo relative imports. Run the standalone-contract scan **before every commit**: Task 1 uses the one-liner exactly as written in `CLAUDE.md` → Commands (clean = no output, exit 1); Tasks 2–4 use `node scripts/contract-scan.mjs` (clean = no output, exit 0).
- Kernel behavior is out of scope. `create()` throws; no SPEC behavior is implemented.
- Node ≥ 22 required; pnpm via corepack (fallback if corepack fails on Windows: `npm i -g pnpm`).
- Every commit message ends with the trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- The spec's two-commit sequence is refined here into one commit per task (Task 1 = the spec's "reorganize" commit; Tasks 2–4 realize the spec's "scaffold" commit as three reviewable commits). This is a documented refinement, not a scope change.

---

### Task 1: Reorganize — concept set to docs/concept/, project front door

**Files:**
- Move (git mv, no content change): `README.md`, `CONCEPT.md`, `SPEC.md`, `ARCHITECTURE.md`, `CONTROLS.md`, `ASSURANCE.md`, `SCOPING-GUIDE.md`, `DECISIONS.md`, `OPEN-QUESTIONS.md`, `GLOSSARY.md` → `docs/concept/<same name>`
- Create: `README.md` (new project front door)
- Modify: `CLAUDE.md` (paths + two-part project description; Commands section stays as-is until Task 4)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: the path `docs/concept/` that every later task and document references; root `README.md` whose Development section Task 3's scripts must match (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm contract-scan`).

- [ ] **Step 1: Move the ten documents whole**

```powershell
New-Item -ItemType Directory -Force docs\concept
git mv README.md docs/concept/README.md
git mv CONCEPT.md docs/concept/CONCEPT.md
git mv SPEC.md docs/concept/SPEC.md
git mv ARCHITECTURE.md docs/concept/ARCHITECTURE.md
git mv CONTROLS.md docs/concept/CONTROLS.md
git mv ASSURANCE.md docs/concept/ASSURANCE.md
git mv SCOPING-GUIDE.md docs/concept/SCOPING-GUIDE.md
git mv DECISIONS.md docs/concept/DECISIONS.md
git mv OPEN-QUESTIONS.md docs/concept/OPEN-QUESTIONS.md
git mv GLOSSARY.md docs/concept/GLOSSARY.md
git status --short
```

Expected: ten `R` (rename) lines, nothing else. The set's internal links are all sibling-relative (`CONCEPT.md`, `SPEC.md`, …) so moving the ten files together keeps every link working — verify with a spot check that `docs/concept/README.md` still links `[`CONCEPT.md`](CONCEPT.md)`.

- [ ] **Step 2: Write the new root README.md**

Create `README.md` with exactly this content:

````markdown
# Vidimera

A domain-agnostic verifiable-decision-record library: durable, content-bound,
hash-chained, operator-replayable records of human confirmations over AI-drafted
actions.

## Status

The **concept is complete and normative**; its ten-document set lives in
[`docs/concept/`](docs/concept/README.md), presented whole at its deliberate
embedded, operator-only scope. **Implementation is beginning** in this repository
(TypeScript, pnpm workspaces); no build-order increment has landed yet. The
maturity markers inside the concept set speak to a reference implementation of
the spec and move only when the behavior actually lands here.

## Layout

| Path | What it is |
|---|---|
| `docs/concept/` | The ten-document concept set — `SPEC.md` is the single normative document |
| `docs/process/` | Living process artifacts (deferral register) |
| `packages/record` | `@vidimera/record` — the library (walking skeleton today: `create()` throws not-implemented) |
| `scripts/` | Repo tooling (standalone-contract scan) |

## Development

Requires Node 22+ and pnpm (via corepack).

```text
pnpm install
pnpm typecheck      # tsc strict, no emit
pnpm lint           # Biome
pnpm test           # vitest
pnpm contract-scan  # must print nothing (the standalone contract)
```

Next increment: build-order step 1 — the kernel
(`docs/concept/SCOPING-GUIDE.md` section 7).

## License

Apache-2.0 — see `LICENSE`.
````

- [ ] **Step 3: Update CLAUDE.md paths and project description**

Replace the two sections `## What this project is` and `## The document set` (and the `## The standalone contract` paragraph) of `CLAUDE.md` so the file reads, in full (leaving the existing `## Commands` section untouched at the end — Task 4 replaces it):

````markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## What this project is

The home of **Vidimera** — a domain-agnostic verifiable-decision-record library — in two
parts:

- **The concept set** (`docs/concept/`): ten self-contained markdown documents that
  present the Vidimera concept whole, at its deliberate embedded, operator-only scope —
  the proven kernel, the profile-declared governed controls, sketched upgrades, and the
  operator-assurance tier. The operator is the sole consumer of the records; capabilities
  meaningful only to an outside party are out of scope by design.
- **The implementation** (`packages/`): a TypeScript pnpm-workspace monorepo implementing
  the concept in the proven build order (`docs/concept/SCOPING-GUIDE.md` §7). Currently a
  walking skeleton — no build-order increment has landed yet.

## The standalone contract

The concept set's hard rule: **the documents reference nothing outside this repository.**
No external repos, files, projects, commits, or internal development history — the concept
stands on this text alone. Generic mention of "a reference implementation" is permitted;
naming, pathing, or dating one is not. All newly authored markdown in this repository
(README, process docs, specs, plans) stays free of external URLs so the repo-wide scan
keeps holding.

## The document set

`docs/concept/README.md` is the set's front door and maps all ten documents. The
load-bearing structure:

- **`docs/concept/SPEC.md` is the single normative document.** Every other document is
  downstream and defers to it; fix conflicts in the other document unless the spec itself
  is being deliberately revised. Code implements the spec; where code and spec differ,
  one of them is wrong and the difference is a finding, never silently reconciled.
- `docs/concept/CONCEPT.md` holds the identity: the purpose statement, the **four
  non-negotiable principles** (graduated honesty, fidelity-not-validity, human anchor,
  identity-by-transport), the honesty discipline, and the anti-goals. A change that
  touches the principles or honesty discipline is a **fork of the concept**, not an
  edit — it must be called out as such, never slipped in.
- `docs/concept/CONTROLS.md` / `docs/concept/SCOPING-GUIDE.md` carry the scope machinery
  (tier test, promotion rule with purpose-trace, rescoping checklist). Scope changes to
  the concept go through that machinery and get recorded.
- **Maturity markers are accuracy claims.** `[PROVEN]` / `[DESIGNED]` / `[SKETCHED]`
  (legend in `docs/concept/README.md`) must stay truthful: `[PROVEN]` speaks to a
  reference implementation of the spec; a marker moves only when the behavior actually
  lands in this repository.
- Editorial voice: every guarantee is stated with its limit in the same breath; never
  "non-repudiation"; never a compliance claim; domain examples stay generic.
````

(Then the existing `## Commands` section follows unchanged.)

- [ ] **Step 4: Run the standalone contract scan**

Run the one-liner as written in `CLAUDE.md` → Commands, but append one more pathspec
argument at the end: `":(exclude)docs/superpowers"` (the blanket escape-path pattern
predates engineering docs that quote code; the properly scoped scan lands in Task 2 and
covers that directory from then on).
Expected: no output, exit code 1 (git grep's "no matches"). Any printed line is a finding — fix it before committing.

- [ ] **Step 5: Commit**

```powershell
git add -A; git status --short
git commit -m @'
Reorganize: concept set to docs/concept/, project front door README

The ten documents move whole (renames only, content untouched); root
README.md becomes the project front door; CLAUDE.md records the two-part
shape. Commands section updates when the commands become real (Task 4).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

Expected: `git status --short` before commit shows ten renames + `M CLAUDE.md` + `A README.md` (and nothing else); commit succeeds.

---

### Task 2: The standalone-contract scan as repo tooling

**Files:**
- Create: `scripts/contract-scan.mjs`

**Interfaces:**
- Consumes: git-tracked `*.md` files (via `git ls-files`).
- Produces: `node scripts/contract-scan.mjs` — clean: prints nothing, exits 0; findings: prints `path:line:text` per finding, exits 1. Task 3 wires it as the root script `contract-scan`; Task 4's CI job and CLAUDE.md Commands section depend on these exact semantics.

- [ ] **Step 1: Write the scan script**

Create `scripts/contract-scan.mjs` with exactly this content:

```js
#!/usr/bin/env node
// Standalone-contract scan (see CLAUDE.md): tracked markdown, except CLAUDE.md
// itself, must reference nothing outside this repository. Clean: no output,
// exit 0. Findings: path:line:text on stdout, exit 1.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();

const trackedMarkdown = execFileSync('git', ['ls-files', '-z', '--', '*.md'], {
  cwd: repoRoot,
  encoding: 'utf8',
})
  .split('\0')
  .filter((path) => path !== '' && path !== 'CLAUDE.md');

// Self-containment (no relative paths escaping scope) is the contract for the
// concept set and the root README; engineering docs elsewhere may quote code
// with intra-repo relative imports. The external-link and ADR-style checks
// apply repo-wide.
const conceptScope = /^(docs\/concept\/|README\.md$)/;

const escapePattern = /\.\.\//; // relative path escaping the self-contained scope
const repoWidePatterns = [
  /docs\/adr/, // ADR-style internal reference
  /https?:\/\/(?!.*example\.com)/, // external link (spec's worked examples excepted)
];

let findings = 0;
for (const path of trackedMarkdown) {
  const activePatterns = conceptScope.test(path)
    ? [escapePattern, ...repoWidePatterns]
    : repoWidePatterns;
  const lines = readFileSync(join(repoRoot, path), 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (activePatterns.some((pattern) => pattern.test(line))) {
      findings += 1;
      console.log(`${path}:${index + 1}:${line.trim()}`);
    }
  });
}

process.exit(findings === 0 ? 0 : 1);
```

- [ ] **Step 2: Run it against the clean tree — expect silence**

```powershell
node scripts/contract-scan.mjs; "exit: $LASTEXITCODE"
```

Expected: no findings printed, `exit: 0`. (This silently proves the scope split too: this plan file quotes code containing parent-relative imports and stays clean, because the escape check applies only to `docs/concept/` and root `README.md`.)

- [ ] **Step 3: Prove it catches a violation (negative test), then restore**

Plant a violating line in a tracked markdown file without this plan itself containing a URL (string is concatenated at run time):

```powershell
Add-Content -Path README.md -Value ("https" + "://scan-negative-check.invalid")
node scripts/contract-scan.mjs; "exit: $LASTEXITCODE"
```

Expected: one finding printed naming `README.md` and the planted line; `exit: 1`.

```powershell
git restore README.md
node scripts/contract-scan.mjs; "exit: $LASTEXITCODE"
```

Expected: silence again, `exit: 0`.

- [ ] **Step 4: Commit**

```powershell
git add scripts/contract-scan.mjs
git commit -m @'
Add standalone-contract scan as repo tooling

Cross-platform Node replacement for the git grep one-liner, identical
semantics: tracked *.md except CLAUDE.md; findings exit 1, clean exits 0.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 3: Workspace root + @vidimera/record walking skeleton (TDD)

**Files:**
- Create: `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `vitest.config.ts`, `biome.json`, `.editorconfig`, `.gitattributes`
- Modify: `.gitignore`
- Create: `packages/record/package.json`, `packages/record/tsconfig.json`, `packages/record/src/index.ts`, `packages/record/test/create.test.ts`

**Interfaces:**
- Consumes: `scripts/contract-scan.mjs` from Task 2 (wired as the `contract-scan` script).
- Produces: root scripts `typecheck` / `lint` / `lint:fix` / `test` / `contract-scan` (Task 4's CI and CLAUDE.md name exactly these); `@vidimera/record` exporting `create(config: unknown): never` and `class VidimeraNotImplementedError extends Error`.

- [ ] **Step 1: Line-ending and editor normalization**

Create `.gitattributes`:

```text
* text=auto eol=lf
```

Create `.editorconfig`:

```text
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

Replace `.gitignore` content with:

```text
.claude/settings.local.json
node_modules/
dist/
coverage/
*.tsbuildinfo
```

Then renormalize (the repo is already LF in the index, so this should be quiet):

```powershell
git add --renormalize .; git status --short
```

Expected: at most the three files above show as changed; no mass renormalization diff.

- [ ] **Step 2: Workspace root files**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - packages/*
```

Create `package.json`:

```json
{
  "name": "vidimera",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "typecheck": "tsc -p packages/record --noEmit",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "test": "vitest run",
    "contract-scan": "node scripts/contract-scan.mjs"
  }
}
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts'],
  },
});
```

Create `biome.json`:

```json
{
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single"
    }
  }
}
```

(If the installed Biome rejects this config shape, run `pnpm exec biome migrate --write` and keep the migrated file — the settings above are the intent.)

- [ ] **Step 3: Package manifests**

Create `packages/record/package.json`:

```json
{
  "name": "@vidimera/record",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "description": "Durable, content-bound, hash-chained, operator-replayable records of human confirmations over AI-drafted actions. Walking skeleton - nothing implemented yet."
}
```

Create `packages/record/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src", "test"]
}
```

- [ ] **Step 4: Install the toolchain**

```powershell
corepack enable
corepack use pnpm@latest
pnpm add -D -w typescript vitest "@biomejs/biome"
```

Expected: `corepack use` pins a `packageManager` field into `package.json` and creates `pnpm-lock.yaml`; the add installs the three dev deps at the workspace root. Fallback if corepack fails (known Windows signature issue): `npm i -g pnpm`, then `pnpm add -D -w typescript vitest "@biomejs/biome"`, and add `"packageManager": "pnpm@<installed version>"` to `package.json` by hand (`pnpm --version`).

- [ ] **Step 5: Write the failing test**

Create `packages/record/test/create.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { VidimeraNotImplementedError, create } from '../src/index.js';

describe('create (walking skeleton)', () => {
  it('throws the loud not-implemented construction error', () => {
    expect(() => create({})).toThrow(VidimeraNotImplementedError);
  });

  it('names the gap in the message', () => {
    expect(() => create({})).toThrow(/not implemented/);
  });
});
```

- [ ] **Step 6: Run the test — verify it fails**

```powershell
pnpm test
```

Expected: FAIL — the suite errors resolving `../src/index.js` (module does not exist yet).

- [ ] **Step 7: Minimal implementation**

Create `packages/record/src/index.ts`:

```ts
/**
 * Walking skeleton. The spec's public entry point exists so the toolchain runs
 * against real code, and it refuses loudly: no build-order increment has landed
 * in this repository yet. Feature-guard discipline from day one — unimplemented
 * means a construction-time throw, never silent degradation.
 */

export class VidimeraNotImplementedError extends Error {
  constructor() {
    super(
      'vidimera: create() is not implemented - no build-order increment has landed in this repository yet',
    );
    this.name = 'VidimeraNotImplementedError';
  }
}

export function create(_config: unknown): never {
  throw new VidimeraNotImplementedError();
}
```

- [ ] **Step 8: Run the full local pipeline — verify green**

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm contract-scan; "exit: $LASTEXITCODE"
```

Expected: 2 tests pass; typecheck silent; lint clean (if Biome flags formatting, run `pnpm lint:fix` once and re-run); contract-scan silent with `exit: 0`.

- [ ] **Step 9: Commit**

```powershell
git add -A; git status --short
git commit -m @'
Scaffold TypeScript pnpm workspace with walking-skeleton @vidimera/record

tsc strict (NodeNext) + vitest + Biome + LF normalization. The single
export create() throws a loud not-implemented construction error - the
feature-guard discipline applied to the whole library at day zero. No
kernel behavior; maturity markers unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

Expected staged set: the seven root files, `.gitignore`, `pnpm-lock.yaml`, and the four `packages/record/` files. `node_modules/` must NOT appear (ignored).

---

### Task 4: CI workflow, deferral register, CLAUDE.md records real commands

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `docs/process/deferral-register.md`
- Modify: `CLAUDE.md` (replace the `## Commands` section)

**Interfaces:**
- Consumes: root scripts `typecheck` / `lint` / `test` / `contract-scan` from Task 3, exactly as named.
- Produces: the finished scaffold; CI activates by itself when a remote exists.

- [ ] **Step 1: CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
  pull_request:
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm contract-scan
```

- [ ] **Step 2: Seed the deferral register**

Create `docs/process/deferral-register.md`:

```markdown
# Deferral register

The living register of consciously deferred work, per the process discipline in
`docs/concept/SCOPING-GUIDE.md` section 7: every deferral carries the trigger that
un-defers it. An entry leaves this table only when the behavior lands or the
deferral is explicitly retired.

| # | Deferred item | Trigger to un-defer | Recorded |
|---|---|---|---|
| 1 | Publish tooling (build, versioning, release) for the record package | First external consumer, or the 0.1 cut | 2026-08-02 |
| 2 | CI remote activation (workflow is inert until a remote exists) | Repository pushed to a hosting remote | 2026-08-02 |
```

- [ ] **Step 3: Replace CLAUDE.md's Commands section**

In `CLAUDE.md`, replace the entire `## Commands` section (from the `## Commands` heading through the paragraph ending "…keep this file the honest record of how to work in *this* repo.") with:

````markdown
## Commands

pnpm workspace (Node 22+, pnpm via corepack):

- `pnpm install` — install dev dependencies
- `pnpm typecheck` — tsc strict, no emit
- `pnpm lint` — Biome (`pnpm lint:fix` to apply safe fixes)
- `pnpm test` — vitest, all packages
- `pnpm contract-scan` — the **standalone contract scan**: run before any commit that
  touches markdown. Prints nothing and exits 0 when clean; prints `path:line:text` and
  exits 1 on findings (`scripts/contract-scan.mjs`). Scans all tracked `*.md` except this
  file: external-link and ADR-style checks repo-wide; the escaping-relative-path check
  on the concept set and root README, where self-containment is the contract. A
  maintainer working alongside other private repositories should extend the script's
  patterns with those projects' names, package names, and tooling.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, test, and contract-scan on every
push and pull request; it activates by itself once a remote exists.

## Process disciplines (inherited from the concept)

From `docs/concept/SCOPING-GUIDE.md` §7, binding on implementation work here:

- One cluster per increment; **spec-moves-to-truth** at every increment's exit (a
  maturity marker moves only when the behavior lands in this repository).
- Feature guards from day one — an unimplemented capability throws at construction
  (today `create()` itself throws: walking skeleton, nothing implemented).
- Byte-stability pins and adjacent-pair gate-order tests, from the kernel increment on.
- The living deferral register: `docs/process/deferral-register.md`.
````

- [ ] **Step 4: Full verification — the spec's exit criteria**

```powershell
pnpm install; pnpm typecheck; pnpm lint; pnpm test
pnpm contract-scan; "exit: $LASTEXITCODE"
git diff --stat HEAD~3 -- docs/concept/
```

Expected: install/typecheck/lint/test all green; contract-scan silent, `exit: 0`; the `docs/concept/` diff over the three scaffold commits is **empty** (renames only happened in Task 1; content never changed).

- [ ] **Step 5: Commit**

```powershell
git add -A; git status --short
git commit -m @'
Add CI workflow and deferral register; CLAUDE.md records real commands

CI runs typecheck, lint, test, and the contract scan; inert until a
remote exists (deferral register entry 2). CLAUDE.md now documents the
pnpm commands and the inherited process disciplines.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

## Verification (whole plan)

1. `pnpm install && pnpm typecheck && pnpm lint && pnpm test` green on Windows (run as separate PowerShell commands).
2. `pnpm contract-scan` prints nothing, exits 0.
3. `git log --oneline` shows the four task commits on `main`.
4. `git diff --stat <pre-Task-1 commit> HEAD -- docs/concept/` shows renames only (use `git log --follow docs/concept/SPEC.md` to confirm history is preserved).
5. Concept-set maturity markers unchanged (`git diff` over the set is empty).
6. CLAUDE.md's Commands section matches what the scripts actually do.
