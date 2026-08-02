# Reference-Implementation Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt an existing reference implementation of this repository's specification as this repository's implementation, one build-order increment at a time, starting with a correction to the spec itself and ending with a kernel that passes its own test suite under this repository's compiler, runner and strictness.

**Architecture:** The concept set in `docs/concept/` is normative and sealed. `packages/record` is a walking skeleton today. Phase 0 corrects one under-specification in `SPEC.md` section 4, hardens CI, and extends the standalone-contract scan to TypeScript so inherited source cannot smuggle unresolvable pointers in. Phase 1 lands build-order step 1 (the kernel) from the reference implementation's own kernel-increment close, plus a hand-written RFC 8785 serializer that keeps the zero-dependency posture. Phases 2–8 follow the build order in `docs/concept/SCOPING-GUIDE.md` section 7 and get their own plans.

**Tech Stack:** TypeScript 7.0.2 (strict, `noUncheckedIndexedAccess`, `isolatedModules`, `noEmit`, target ES2022, NodeNext), vitest 4.1.10, Biome 2.5.6, pnpm 11.18.0, Node ≥22. `packages/record` has zero runtime dependencies and keeps them.

## Global Constraints

- **Zero runtime dependencies in `packages/record`.** Adoption decision 0f. `packages/record/package.json` has no `dependencies` key and does not gain one.
- **`noUncheckedIndexedAccess` stays on.** Adoption decision 0e. Fix every site by hand. **No non-null assertions (`!`)** — they defeat the flag and collide with Biome's `noNonNullAssertion`.
- **Test directory is singular `test/`**, not `tests/`. `vitest.config.ts` includes `packages/*/test/**/*.test.ts` and `packages/record/tsconfig.json` includes `["src", "test"]`. Import depth is unchanged, so `../src/x.js` and `../../src/x.js` both still resolve.
- **Commit style:** imperative sentence-case subject ~72 chars, semicolon-joined clauses where two things land together, body wrapped ~70 explaining *why*, trailer `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`. **No `feat:` / `docs:` prefixes** — this repository does not use conventional commits.
- **Never run `biome check --write --unsafe`.** Measured: it rewrites `3.14159` → `Math.PI` in the RFC 8785 vector fixture; the tree still typechecks with **0 errors** while **2 tests fail**. The safe path is `pnpm lint:fix` (`biome check --write`), which churns ~4,920 lines and leaves the suite green. **Prove every autofix with the test suite, never the typechecker.**
- **Provenance wording (decision 0b):** engineering docs say "the reference implementation" and cite short commit hashes. Never name the external repository, package, or any sibling project. No external URLs. The concept set stays sealed except for the decision-0a edit in Task 3.
- **ADR-style path references are a scan rule.** This repository has no ADR directory, and no document may contain such a path — the scan flags it repo-wide, including in this plan.
- **The concept set is normative.** Where code and spec differ, one of them is wrong and the difference is a finding, never silently reconciled.

---

## The phase map — the whole process

| Phase | What lands | Source posture | Markers move? | Gate before starting |
|---|---|---|---|---|
| **0** | SPEC section 4 correction; CI hardening; contract scan over `*.ts` | Authored here | No (stated explicitly) | — |
| **1** | Build-order step 1: the kernel | Adopt from base commit `c0f0f75` + 7 deltas | No | Phase 0 green |
| **2a** | Store contract v2, `seal`, sweep, memory-backed conformance suite | Adopt | No | Substitute exit artifact decided |
| **2b** | Two SQL adapters + cross-backing byte-identity e2e | Adopt | No | 2a green; CI shape decided |
| **3** | Redemption (the effect seam) — **the last store-perturbing step** | Adopt | No | 2a mandatory; 2b by this exit |
| **4** | Multi-leg separation of duties — the cleanest adoption in the range | Adopt | No | 3 green |
| **5** | Required-consultation gating; `availability` minted; three-class outcome model | Adopt | No | 4 green |
| **6** | Authority checks: policy-drift + eligibility — **carries decision 0c, a real re-derivation** | Adopt then invert | No | **Conflict C1 resolved in writing** |
| **7** | Findings & acknowledgments — **first step with no reference implementation** | Re-derive from SPEC section 10.2 | **Yes — first legitimate move, 10 sites** | 5 green |
| **0.1 cut** | Publish tooling, API naming review, CI hardening closeout, tag | Authored here | No | 7 green |
| **8.1** | Recovery (`supersedes`) | Re-derive | Yes | OQ section 3's three residuals decided |
| **8.2** | Live capture + `reverify` | Re-derive | Yes | **Sequencing fork decided** (see below) |
| **8.3** | AL2 detached signing | Re-derive | Yes | Six-item docket resolved, granularity first |
| **8.4** | Operator-assurance self-test tier | Re-derive (shape only) | Yes (CONTROLS only) | OQ section 5 decided — **possibly at the 0.1 cut** |

**Three structural facts about this map that are not obvious:**

1. **Steps 2–6 move ZERO maturity markers.** Sections 10.1, 10.3, 10.4, 11.1, 11.2 and 12 are already `[PROVEN]`. The inherited "spec-moves-to-truth at every increment's exit" discipline is therefore vacuous for five consecutive steps. **A substitute exit artifact must be decided before Phase 2** — an implementation-status ledger tracking what has landed *here*. It cannot live in `docs/concept/` (sealed); `docs/process/implementation-status.md` is the natural home.
2. **Step 3 is the last step that perturbs the store.** Verified against the reference implementation's history: the multi-leg, consultation and authority-check increments touch no store, adapter or conformance file at all; redemption does. So the build order's "store diff-empty from here on" property actually starts *after* step 3, and step 3's exit is where that claim becomes assertable.
3. **The `(5.7)` gate-ladder slot is reserved at step 1** (Task 21) even though findings arrive at step 7. Without the reservation, step 7 renumbers a ladder whose adjacent-pair order tests are already pinned.

**The live-capture sequencing fork (decide at step 8.1's exit, not at 8.2's start):** `SCOPING-GUIDE.md` section 7 lists live/reverify second within step 8, before AL2. The reference implementation's own final disposition deferred it past everything, breaking its own order, on the ground that no live-deciding host existed. Apply the same test. If no live host exists here, defer 8.2 behind 8.3 and record the reordering as a documented act with its recovery path per `SCOPING-GUIDE.md` section 8 item 5, keeping the construction guards armed.

---

## Standing rules for every phase

| Rule | Reason |
|---|---|
| **Obtain inherited files with `git show <commit>:<path>`, never `git archive`** | The source repository has `core.autocrlf=true` and no `.gitattributes`, so `git archive` extracts **CRLF**. Measured: every LF-anchored string replacement against an archive-extracted tree returns ANCHOR MISS. `git show` emits the LF blob. |
| **Never retype a fixture — `git show` it** | `fixtures/jcs-vectors.ts`'s expected literal contains a raw U+007F between `/` and an emoji. The loss is invisible in every editor and every diff view, and produces three visually-identical false failures. |
| Base-file-first for tests | For 8 of the 10 mixed test files the head body was *rewritten*, not extended — the terminality sequencing pin was inverted, and construction-validation **deleted 7 armed-guard tests** that step 1 needs. Taking head and deleting blocks silently drops them. |
| Red before green, always | Every behavioural delta in this plan has a named failing test. Where one cannot exist (see Task 18), the plan says so rather than faking it. |
| `pnpm typecheck && pnpm lint && pnpm test && pnpm contract-scan` green before every commit | Four gates, and CI runs all four |

---

# PHASE 0 — Foundations

Three commits. No implementation code. Task 3's commit is the only one in the entire port that touches `docs/concept/`.

### Task 1: SPEC section 4 — state the transition digest input

**Files:**
- Modify: `docs/concept/SPEC.md` (currently 1215 lines; section 4's `at` row at line 273, the anchor paragraph ending at line 282, `**Genesis.**` at line 284)

**Interfaces:**
- Produces: the normative statements Phase 1's `chain/encoding.ts` implements — `seq` stringified in the digest input, millisecond-precision timestamps.

`ARCHITECTURE.md` section 3 claims "two independent implementations verify each other's chains." Section 4 does not currently state the two conventions that claim rests on. Both anchors below were verified unique with `grep -F -c` (returns 1 each).

- [ ] **Step 1: Edit the `at` field-table row**

old_string:
```
| `at` | timestamp | RFC 3339 UTC |
```
new_string:
```
| `at` | timestamp | RFC 3339 UTC, millisecond precision (see the digest input below) |
```

- [ ] **Step 2: Insert the digest-input block**

old_string:
```
implementations verify each other's chains.

**Genesis.** `seq` starts at 1.
```
new_string:
```
implementations verify each other's chains.

**The digest input, stated exactly.** Two conventions of that encoding are not implied by the
field table above, and both are stated here because cross-implementation verification is what
they buy:

- **`seq` is serialized as a string.** It is the envelope's one non-string field, and the
  encoding stringifies it — `1` is fed to JCS as `"1"`. The reason is the claim just made: the
  envelope must not depend on ECMAScript-specific number formatting, so no envelope field ever
  reaches JCS's number rules; only `payload` can, and only where an adopter's own content
  carries numbers. `seq` stays an integer in the transition and in storage (§12's C2) — the
  stringification belongs to the digest input alone.
- **Every timestamp the library stamps carries millisecond precision** — the table's RFC 3339
  UTC form (an ISO-8601 profile), with exactly three fractional-second digits and a `Z` suffix
  (`2030-01-15T10:03:44.612Z`). This covers the envelope's `at`, a recorded Consultation's `at`
  (§11.1), and an `expired`, `redemption-failed` or `redeeming` payload's `bound`. The digest
  is over bytes: the same instant written at a coarser precision is a different digest.

Both are the library's own behaviour, stated descriptively per §1, and both buy exactly
*verification* — a second implementation can recompute the digests of any chain it is handed.
Neither makes a chain *reproducible* from the same inputs: how many times a seam reads the
clock, and which appends share one reading, is implementation detail (§2.1's finalize batch
shares one) and is deliberately left unstated.

**Genesis.** `seq` starts at 1.
```

No BCP-14 keyword: section 1 carries a closed inventory of every MUST/SHOULD, each an obligation on a party other than the library. This states the library's own behaviour, so it takes the descriptive register — the move section 7 already makes. Using MUST here would require amending section 1's inventory.

The closing paragraph is decision 0d's spec-side counterpart: verification needs only the encoding; reproduction additionally needs a clock discipline this spec deliberately does not mandate.

### Task 2: SPEC section 2.1 — correct the worked example's timestamps

**Files:**
- Modify: `docs/concept/SPEC.md` (section 2.1's worked example, lines ~168–206)

Counts verified with `grep -o`: `"2030-01-15T10:03:44Z"` appears exactly **7** times, `"2030-01-15T09:58:00Z"` exactly **1**. The example currently contradicts Task 1 on precision.

- [ ] **Step 1: Replace both timestamp literals**

Replace all 7 occurrences of `"2030-01-15T10:03:44Z"` with `"2030-01-15T10:03:44.612Z"`, and the 1 occurrence of `"2030-01-15T09:58:00Z"` with `"2030-01-15T09:58:00.000Z"`.

- [ ] **Step 2: Add the encoding note after the code fence**

Insert this paragraph immediately after the closing fence of the example, before the existing "The `chain-verify` consultation at seq 2…" paragraph:

```
Two encoding notes on the JSON above. `seq` is shown as the integer it is in the transition
and in storage; the digest input stringifies it (§4). The timestamps carry the millisecond
precision §4 requires — the example is a record, not a rounding.
```

- [ ] **Step 3: Verify no other document carries ISO timestamps**

Run: `Select-String -Path docs/concept/*.md -Pattern '20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]T'`
Expected: only the 8 section-2.1 lines in `SPEC.md`. No other concept document needs touching.

**Note on scope:** the JSON keeps `"seq": 1` as an integer. Changing it to `"1"` would contradict section 4's `| seq | integer |` row and section 12's C2, and would require a reconciling clause in the same commit. The added note is the correct resolution — but this is a deliberate narrowing of decision 0a.3's literal wording ("every transition in that example needs fixing") and should be confirmed at review.

### Task 3: Consistency sweep and commit the SPEC change

**Files:**
- Verify only: `docs/concept/SPEC.md` sections 7 and 12

- [ ] **Step 1: Confirm sections 7 and 12 need no change**

Section 7 (digest identifiers) states identifier form, the sha256 default, per-record recorded-algorithm verification, and deprecation warnings. It says nothing about `seq` or `at`. Section 12 mentions `seq` twice (`seq = max+1 … max+N`, and C2's `UNIQUE(recordId, seq)`) — both integer-domain statements that stay true and that Task 1's bullet now explicitly cites. `at` does not appear in section 12 at all. `dueAt` does, but it is an index column that is never digested.

- [ ] **Step 2: Confirm no maturity marker moves**

Section 1 defines `[PROVEN]` as "implemented and test-proven in a reference implementation of this spec". Both newly stated conventions are exactly that. `CLAUDE.md`'s rule constrains *moving* a marker; nothing moves.

Run: `Select-String -Path docs/concept/SPEC.md -Pattern '\[PROVEN\]|\[DESIGNED\]|\[SKETCHED\]' | Measure-Object`
Expected: the same count as `HEAD`.

- [ ] **Step 3: Run the gates**

```powershell
git diff --stat docs/concept/
node scripts/contract-scan.mjs; "exit=$LASTEXITCODE"
```
Expected: only `SPEC.md` changed, only the section 2.1 and section 4 hunks; scan silent, exit 0.

- [ ] **Step 4: Commit**

```bash
git add docs/concept/SPEC.md
git commit -m "State the transition digest input in SPEC section 4

The encoding's two unstated conventions - seq stringified before
serialization, and millisecond-precision timestamps - are what
two-implementations-verify-each-other actually rests on. Section
2.1's worked example now carries the same precision. No behavior
claim moves: section 4 stays [PROVEN].

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 4: Harden the CI workflow

**Files:**
- Modify: `.github/workflows/ci.yml` (currently **18** lines — full replacement)
- Modify: `CLAUDE.md` (the CI paragraph)

Deferral entry 3's trigger has fired: the remote exists and CI has run green.

- [ ] **Step 1: Replace the workflow**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
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

All eight existing steps are preserved in order. `permissions: contents: read` at top level makes least privilege independent of the repository setting — nothing here writes. `concurrency` is keyed on workflow **and ref**, so a main run is never cancelled by a feature-branch run. `push: branches: [main]` stops the double-build; `pull_request:` stays unfiltered so a PR into any target is still checked.

Do **not** quote the `on:` key. A strict YAML 1.1 parser reads it as boolean `true`; GitHub's parser does not, and the existing file has the same shape and runs green.

- [ ] **Step 2: Correct `CLAUDE.md`**

old_string:
```
CI (`.github/workflows/ci.yml`) runs typecheck, lint, test, and contract-scan on every
push and pull request; it activates by itself once a remote exists.
```
new_string:
```
CI (`.github/workflows/ci.yml`) runs typecheck, lint, test, and contract-scan on every
push to `main` and every pull request, with read-only token permissions and one
cancel-on-supersede concurrency group per ref.
```

The "activates by itself once a remote exists" clause is now false.

### Task 5: Retire the fired deferral-register entries

**Files:**
- Modify: `docs/process/deferral-register.md`

The register's own rule (its header): *"An entry leaves this table only when the behavior lands or the deferral is explicitly retired."* Both entries leave under the first clause — entry 2's behaviour landed by itself exactly as predicted; entry 3's lands in Task 4.

- [ ] **Step 1: Replace the file**

```markdown
# Deferral register

The living register of consciously deferred work, per the process discipline in
`docs/concept/SCOPING-GUIDE.md` section 7: every deferral carries the trigger that
un-defers it. An entry leaves this table only when the behavior lands or the
deferral is explicitly retired. Numbers are stable identifiers, not positions: a
gap is an entry that has left, and a new entry takes the next number never yet used.

| # | Deferred item | Trigger to un-defer | Recorded |
|---|---|---|---|
| 1 | Publish tooling (build, versioning, release) for the record package | First external consumer, or the 0.1 cut | 2026-08-02 |
| 4 | Generalize root `typecheck` beyond packages/record and declare per-package test-runner devDependencies | Second workspace package lands | 2026-08-02 |
| 5 | `biome migrate --write` to clear deprecated `linter.rules.recommended` and add the schema field | Next housekeeping commit | 2026-08-02 |
```

Entries 1, 4 and 5 **keep their numbers**. Renumbering would silently break the adoption design doc, which cites entry 4 by number.

- [ ] **Step 2: Commit Tasks 4 and 5 together**

```bash
git add .github/workflows/ci.yml CLAUDE.md docs/process/deferral-register.md
git commit -m "Harden CI; retire the fired deferral-register entries

Least-privilege token, one cancel-on-supersede concurrency group per
ref, and push builds filtered to main - branch pushes are already
covered by the pull_request trigger. Register entries 2 and 3 leave
the table: the remote exists, CI has run green, and the hardening
has landed. The git history is the record of a retired entry; the
table stays a list of what is still open.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 6: Contract-scan extension — prove it red

**Files:**
- Create: `packages/record/src/scan-probe.ts` (deleted in Task 7)

The scan reads tracked `*.md` only. Inherited source carries **313 lines** of unresolvable pointers at the port base (210 in `src`, 103 in tests) — all invisible today.

- [ ] **Step 1: Write the probe**

```typescript
// positive: design §4 / design  §12
// positive: slice 7, slice-3, slices 1-2, pre-slice-6
// positive: Task 5, task-4, Tasks 7-8
// positive: OQ2-10, OQ2-8b, OQ-3
// negative: SPEC §9.1 and §12's C1-C4 and AL1/AL2 must stay legal
// negative: chain.slice(0, -1) and items.slice(1) and str.slice(-1)
// negative: 2030-01-15T10:03:44.612Z timestamps
// negative: the word design on its own, and slicing, and multitask
export const scanProbe = 1;
```

- [ ] **Step 2: Run the scan and watch it miss**

```powershell
git add -N packages/record/src/scan-probe.ts
node scripts/contract-scan.mjs; "exit=$LASTEXITCODE"
```
Expected RED output: **no output at all, `exit=0`**. That is the bug.

`git add -N` (intent-to-add) makes the file appear in `git ls-files` without staging content; the scan reads the working tree, so this is enough. Leave the probe for Task 7.

### Task 7: Contract-scan extension — the patch, then prove it green

**Files:**
- Modify: `scripts/contract-scan.mjs` (full replacement)
- Delete: `packages/record/src/scan-probe.ts` (after the proof)

- [ ] **Step 1: Replace the scan**

```javascript
#!/usr/bin/env node
// Standalone-contract scan (see CLAUDE.md): tracked markdown, except CLAUDE.md
// itself, must reference nothing outside this repository. Tracked TypeScript is
// scanned too, under the checks that apply to code. Clean: no output, exit 0.
// Findings: path:line:text on stdout, exit 1.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();

function tracked(...globs) {
  return execFileSync('git', ['ls-files', '-z', '--', ...globs], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .split('\0')
    .filter((path) => path !== '' && path !== 'CLAUDE.md');
}

const trackedMarkdown = tracked('*.md');
const trackedTypeScript = tracked('*.ts', '*.mts', '*.cts');

// Self-containment (no relative paths escaping scope) is the contract for the
// concept set and the root README; engineering docs elsewhere may quote code
// with intra-repo relative imports. The external-link and ADR-style checks
// apply repo-wide.
const conceptScope = /^(docs\/concept\/|README\.md$)/;

const escapePattern = /\.\.\//; // relative path escaping the self-contained scope
const adrPattern = /docs\/adr/; // ADR-style internal reference

// External link exception applies per URL, not per line: a line can carry
// more than one URL, and a substring match on "example.com" anywhere in the
// line would blanket-whitelist a real leak sharing the line, or wave through
// a lookalike host that merely contains the string. Extract every URL and
// flag the line unless each one resolves to example.com or a subdomain of it
// (the spec's worked examples are the intended exception).
const urlPattern = /https?:\/\/([^\s\/)\]>"']+)/g;
const allowedHost = /(^|\.)example\.com$/;

function hasExternalLink(line) {
  for (const match of line.matchAll(urlPattern)) {
    const host = match[1].split(':')[0]; // drop a port, if present
    if (!allowedHost.test(host)) {
      return true;
    }
  }
  return false;
}

const repoWidePatterns = [adrPattern, hasExternalLink];

// Code-only checks. Inherited source carries pointers into a design-document,
// per-increment and open-question numbering scheme that does not exist in this
// repository: `design §4`, `slice 7`, `Task 5`, `OQ2-10`. A reader cannot
// resolve them here, so they are external references in the contract's sense.
// These patterns are code-only on purpose: this repository's own plans number
// their tasks, and the escaping-relative-path check is a document contract,
// not a code one — a TypeScript import of `../types.js` is ordinary and stays
// legal.
const designSectionPattern = /\bdesign\s+§/i;
const incrementPattern = /\bslices?[\s-]?\d/i;
const taskPattern = /\btasks?[\s-]\d/i;
const openQuestionPattern = /\bOQ\d*-\d/i;

const codeOnlyPatterns = [designSectionPattern, incrementPattern, taskPattern, openQuestionPattern];

const files = [
  ...trackedMarkdown.map((path) => ({
    path,
    patterns: conceptScope.test(path) ? [escapePattern, ...repoWidePatterns] : repoWidePatterns,
  })),
  ...trackedTypeScript.map((path) => ({
    path,
    patterns: [...repoWidePatterns, ...codeOnlyPatterns],
  })),
];

let findings = 0;
for (const { path, patterns } of files) {
  const lines = readFileSync(join(repoRoot, path), 'utf8').split('\n');
  lines.forEach((line, index) => {
    const flagged = patterns.some((pattern) =>
      typeof pattern === 'function' ? pattern(line) : pattern.test(line),
    );
    if (flagged) {
      findings += 1;
      console.log(`${path}:${index + 1}:${line.trim()}`);
    }
  });
}

process.exit(findings === 0 ? 0 : 1);
```

**Do not hand-format this file.** Biome (lineWidth 100) requires `codeOnlyPatterns` and the markdown `patterns:` ternary to each sit on ONE line; the naive multi-line form typechecks but fails `pnpm lint` with "The contents aren't fixed". Equally, do **not** run `biome check --write` on it — that would also rewrite the pre-existing `urlPattern` escape (a `noUselessEscapeInRegex` info the repo currently exits 0 with), mixing an unrelated fix into this commit.

Five load-bearing design points: the escape check never reaches code (the two file lists are built independently, and the TypeScript list omits `escapePattern`), so a relative import stays legal; ADR and external-URL checks *do* apply to code; the four numbering patterns are code-only because this repository's own plans legitimately number their tasks; a bare section sign is never banned, only `design §N`; and `.mjs` is deliberately excluded from the glob so the script does not flag its own comment block.

- [ ] **Step 2: Run the scan and watch it catch**

```powershell
node scripts/contract-scan.mjs; "exit=$LASTEXITCODE"
```
Expected: exactly these four lines, then `exit=1`:
```
packages/record/src/scan-probe.ts:1:// positive: design §4 / design  §12
packages/record/src/scan-probe.ts:2:// positive: slice 7, slice-3, slices 1-2, pre-slice-6
packages/record/src/scan-probe.ts:3:// positive: Task 5, task-4, Tasks 7-8
packages/record/src/scan-probe.ts:4:// positive: OQ2-10, OQ2-8b, OQ-3
```
Four lines and no more is the whole test: it proves each pattern fires **and** that `arr.slice(-1)`, a bare section reference, `C1-C4`, `AL1/AL2` and ISO timestamps do not.

- [ ] **Step 3: Remove the probe and confirm silence**

```powershell
git rm -q --cached packages/record/src/scan-probe.ts
Remove-Item packages/record/src/scan-probe.ts
node scripts/contract-scan.mjs; "exit=$LASTEXITCODE"
```
Expected: no output, exit 0.

### Task 8: Document the scan and verify the Phase-0 exit

**Files:**
- Modify: `CLAUDE.md` (the `pnpm contract-scan` bullet)

- [ ] **Step 1: Update the scan description**

Amend the `pnpm contract-scan` bullet so it says the scan covers tracked markdown **and tracked TypeScript**, that code is additionally checked for pointers into numbering schemes that do not exist here, and that the escaping-relative-path check is a document contract that does not apply to code.

- [ ] **Step 2: Run all four gates**

```powershell
pnpm typecheck; pnpm lint; pnpm test; node scripts/contract-scan.mjs; "exit=$LASTEXITCODE"
```
Expected: typecheck clean; Biome exit 0 (2 infos, both pre-existing); `Test Files 1 passed (1) / Tests 2 passed (2)`; scan silent, exit 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/contract-scan.mjs CLAUDE.md
git commit -m "Extend the contract scan to tracked TypeScript

Inherited source will carry pointers into a design-document, slice
and open-question numbering that has no counterpart here - a reader
cannot resolve them, so they are external references in the
contract's sense. The escaping-path check stays a document contract;
relative imports are ordinary code. Proved against a planted probe.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

**Phase 0 exit:** four gates green locally and on CI; one concept-set commit; the scan now sees code.

---

# PHASE 1 — Build-order step 1: the kernel

Base commit `c0f0f75` (subject: "chore: final-review fix batch"), verified: **22 files, 2,301 lines** under `packages/record/src`, a **10-code** refusal registry equal to SPEC section 8's core set minus `unsealable-state`, a **five-method** Store, and a sequential `finalize`. It typechecks with **26** errors under this repository's settings against 61 at the reference implementation's head.

Target: **20 test files / 202 tests** — 17 taken at `c0f0f75` (189 tests), plus `facts.test.ts` (6), `review.test.ts` (4) and `byte-stability.test.ts` (3) taken at head.

### Task 9: Add `@types/node` — two edits, not one

**Files:**
- Modify: `package.json` (root devDependencies)
- Modify: `tsconfig.base.json`

**Interfaces:**
- Produces: `node:crypto`, `TextEncoder`, `process` resolving under TS 7.0.2 — without this, the port cannot compile at all.

Measured control compile: without the `types` entry the base tree yields **31** errors instead of 26 — the extra 5 being `canonical.ts(6,28)` TS2591 `node:crypto`, `canonical.ts(65,14)` and `(83,49)` TS2304 `TextEncoder`, `canonical.ts(110,5)` TS2591 `process`, and `id.ts(5,28)` TS2591 `node:crypto`. TypeScript 7.0.2 does not auto-discover where 5.9.3 did.

- [ ] **Step 1: Add the devDependency to the root `package.json`**

Add `"@types/node": "^24.13.3"` to `devDependencies`, then run `pnpm install`.

- [ ] **Step 2: Add the `types` entry to `tsconfig.base.json`**

Add `"types": ["node"]` to `compilerOptions`.

- [ ] **Step 3: Verify and commit**

Run: `pnpm typecheck`
Expected: still clean — the skeleton needs neither, but the entry must be in place before Task 12.

```bash
git add package.json tsconfig.base.json pnpm-lock.yaml
git commit -m "Add @types/node and declare it in the base tsconfig

TypeScript 7 does not auto-discover @types the way 5.9 did, so the
devDependency alone leaves node:crypto, TextEncoder and process
unresolved. Both edits are required before any real source lands.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 10: The RFC 8785 serializer — failing test

**Files:**
- Create: `packages/record/test/jcs.test.ts`

**Interfaces:**
- Produces: `serializeJcs(value: unknown): string` from `../src/jcs.js` — consumed by Task 12's `canonical.ts` rewire.

Decision 0f: hand-write it, do not vendor. The incumbent package is 49 lines whose only JCS-specific step over `JSON.stringify` is recursive key sorting.

- [ ] **Step 1: Write the failing test**

```typescript
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { serializeJcs } from '../src/jcs.js';

test('sorts object keys recursively by UTF-16 code unit', () => {
  assert.equal(serializeJcs({ b: 1, a: { d: 2, c: 3 } }), '{"a":{"c":3,"d":2},"b":1}');
  // A lead surrogate (U+D83D) sorts before U+FB33 under code UNITS, after it
  // under code POINTS. RFC 8785 section 3.2.3 mandates code units.
  assert.deepEqual(['\uFB33', '\u{1F600}'].sort(), ['\u{1F600}', '\uFB33']);
  // The same ordering, driven through serializeJcs itself: a code-POINT
  // comparator would emit these two keys the other way round.
  assert.equal(
    serializeJcs({ '\uFB33': 1, '\u{1F600}': 2 }),
    `{${JSON.stringify('\u{1F600}')}:2,${JSON.stringify('\uFB33')}:1}`,
  );
});

test('delegates number and string forms to ECMAScript, as RFC 8785 requires', () => {
  assert.equal(
    serializeJcs([1e20, 1e21, 1e-6, 1e-7, -0]),
    '[100000000000000000000,1e+21,0.000001,1e-7,0]',
  );
  assert.equal(serializeJcs('a\u0000b\tc"d\\e/f'), '"a\\u0000b\\tc\\"d\\\\e/f"');
});

test('throws rather than yielding undefined for values with no JCS form', () => {
  assert.throws(() => serializeJcs(undefined), /undefined/i);
  assert.throws(() => serializeJcs(Symbol('x')), /symbol/i);
  assert.throws(() => serializeJcs(() => 1), /function/i);
  assert.throws(() => serializeJcs(10n), /BigInt/i);
  assert.throws(() => serializeJcs(Number.NaN), /non-finite/i);
  assert.throws(() => serializeJcs(Number.POSITIVE_INFINITY), /non-finite/i);
});

test('applies JSON.stringify structural rules to directly-present unrepresentable values', () => {
  assert.equal(serializeJcs({ a: 1, b: undefined }), '{"a":1}');
  assert.equal(serializeJcs({ a: 1, b: Symbol('s') }), '{"a":1}');
  assert.equal(serializeJcs([1, undefined, 3]), '[1,null,3]');
  // A hole is not a member: for...of yields undefined, so it becomes null.
  // biome-ignore lint/suspicious/noSparseArray: the hole IS the case under test
  assert.equal(serializeJcs([1, , 3]), '[1,null,3]');
  assert.equal(serializeJcs({ a: 1, b: () => 1 }), '{"a":1}');
});

test('honors toJSON with no arguments, and throws if it yields no JCS form', () => {
  assert.equal(
    serializeJcs({ d: new Date('2030-01-15T10:03:44.612Z') }),
    '{"d":"2030-01-15T10:03:44.612Z"}',
  );
  // Called with NO arguments: JSON.stringify passes the key, this does not.
  assert.equal(serializeJcs({ k: { toJSON: (...a: unknown[]) => a.length } }), '{"k":0}');
  // Applied to the value as given, not to a toJSON result: a loud failure
  // rather than a member that silently vanishes from the digest.
  assert.throws(() => serializeJcs({ x: { toJSON: () => undefined } }), /undefined/i);
  assert.throws(() => serializeJcs([{ toJSON: () => undefined }]), /undefined/i);
});

test('drops symbol-keyed properties and rejects genuine cycles only', () => {
  assert.equal(serializeJcs({ a: 1, [Symbol('k')]: 2 }), '{"a":1}');
  const shared = { v: 1 };
  assert.equal(serializeJcs([shared, shared]), '[{"v":1},{"v":1}]');
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  assert.throws(() => serializeJcs(cyclic), /circular/i);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test`
Expected: FAIL — `Failed to resolve import "../src/jcs.js"`.

### Task 11: The RFC 8785 serializer — implementation

**Files:**
- Create: `packages/record/src/jcs.ts`

- [ ] **Step 1: Write the file**

Write exactly this. 109 lines, zero dependencies, Biome-clean as written (verified byte-identical before and after `biome check --write`), and clean under TS 7.0.2 with `strict` + `noUncheckedIndexedAccess` + `isolatedModules` + `target: ES2022`.

```typescript
// @vidimera/record — jcs.ts: the library-owned RFC 8785 (JSON Canonicalization
// Scheme) serializer.
//
// Zero dependencies by construction. This is not a shortcut: RFC 8785 section 3.2.2
// normatively *delegates* primitive serialization to ECMAScript — numbers to the
// Number::toString algorithm (section 3.2.2.3) and strings to the escaping rules of
// QuoteJSONString (section 3.2.2.2). `JSON.stringify` already implements both
// exactly, including the lowercase \u00xx fallback for control characters with no
// short escape and the ES2019 well-formed escaping of lone surrogates. The only step
// JCS layers on top is recursive object-key ordering by UTF-16 code unit, which is
// what this file adds.
//
// `Array.prototype.sort` with no comparator compares by UTF-16 code unit, which is
// precisely RFC 8785 section 3.2.3's requirement — so the sort is deliberately the
// default one, never `localeCompare` (locale-sensitive) and never a codepoint sort.

/**
 * Serializes `value` to RFC 8785 canonical JSON **text**. Always returns a `string`:
 * every input with no JCS representation throws instead of yielding `undefined`, so
 * no caller can silently hash zero bytes by accident.
 *
 * Deliberate, tested decisions — each is a byte-level commitment, not a detail:
 *
 * - **`toJSON` is honored**, called with no arguments. Changing this changes bytes:
 *   a `Date` member serializes as its ISO string rather than as `{}`.
 * - **BigInt throws.** RFC 8785 numbers are IEEE-754 doubles; a BigInt has no
 *   round-trippable JCS form, and silently coercing one would produce a digest over
 *   a value the host did not supply.
 * - **Non-finite numbers throw** (`NaN`, `Infinity`, `-Infinity`). `JSON.stringify`
 *   would emit `null` for these; RFC 8785 section 3.2.2.3 does not admit them at all,
 *   and a digest over a silently-nulled figure is exactly the failure this library
 *   exists to prevent.
 * - **`undefined` has no top-level form and throws**; a directly-present `undefined`
 *   member is omitted and a directly-present `undefined` array element becomes `null`,
 *   matching `JSON.stringify`'s structural rules. A `toJSON` that RETURNS `undefined`
 *   (or a symbol or a function) throws in every position — the structural rules are
 *   applied to the value as given, not to a `toJSON` result, so an adopter whose
 *   `Canonicalizer` emits such a wrapper gets a loud failure rather than a member that
 *   silently vanishes from the digest.
 * - **Symbols** behave identically to `undefined` (throw / `null` / omitted), and
 *   **symbol-keyed properties are silently dropped**, because `Object.keys` never
 *   returns them. That is `JSON.stringify`'s behavior too; a host that needs a
 *   symbol-keyed field recorded must project it to a string key in its own
 *   `Canonicalizer`.
 * - **Functions** behave identically to `undefined` (throw / `null` / omitted).
 * - **Circular references throw.** Only genuine cycles: the same object appearing
 *   twice in sibling positions is a finite tree and serializes fine.
 * - **No special case for boxed primitives** (`new String('a')`, `new Number(7)`):
 *   they serialize as ordinary objects over their own enumerable keys.
 */
export function serializeJcs(value: unknown): string {
  return write(value, new Set<object>());
}

function write(value: unknown, open: Set<object>): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (!Number.isFinite(value)) {
        throw new TypeError(
          `serializeJcs: the non-finite number ${String(value)} has no JCS representation`,
        );
      }
      return JSON.stringify(value);
    case 'string':
      return JSON.stringify(value);
    case 'bigint':
      throw new TypeError('serializeJcs: a BigInt has no JCS representation');
    case 'undefined':
      throw new TypeError('serializeJcs: undefined has no JCS representation');
    case 'symbol':
      throw new TypeError('serializeJcs: a symbol has no JCS representation');
    case 'function':
      throw new TypeError('serializeJcs: a function has no JCS representation');
    default:
      return writeContainer(value, open);
  }
}

function writeContainer(container: object, open: Set<object>): string {
  if (open.has(container)) {
    throw new TypeError('serializeJcs: circular reference — the input is not a finite JSON tree');
  }
  open.add(container);
  try {
    const toJson = (container as { toJSON?: unknown }).toJSON;
    if (typeof toJson === 'function') {
      return write((toJson as (this: object) => unknown).call(container), open);
    }
    if (Array.isArray(container)) {
      const elements: string[] = [];
      for (const element of container as readonly unknown[]) {
        elements.push(hasNoJsonForm(element) ? 'null' : write(element, open));
      }
      return `[${elements.join(',')}]`;
    }
    const members: string[] = [];
    for (const key of Object.keys(container).sort()) {
      const member: unknown = (container as Record<string, unknown>)[key];
      if (hasNoJsonForm(member)) continue;
      members.push(`${JSON.stringify(key)}:${write(member, open)}`);
    }
    return `{${members.join(',')}}`;
  } finally {
    open.delete(container);
  }
}

function hasNoJsonForm(value: unknown): boolean {
  return value === undefined || typeof value === 'symbol' || typeof value === 'function';
}
```

Four choices that are load-bearing, all differentially checked against the incumbent across 20,000+ cases:
- `default: return writeContainer(value, open)` — TS narrows `unknown` to `object` in the `default` arm once all seven other `typeof` results are handled, so no cast is needed. If a future TS release stops narrowing there, the fix is `writeContainer(value as object, open)`.
- `for (const element of …)`, **not** `.map` — `Array.prototype.map` preserves holes, which is exactly the incumbent's `[1,,3]`-emitting bug (invalid JSON).
- `(container as Record<string, unknown>)[key]` yields `unknown` under `noUncheckedIndexedAccess`; `hasNoJsonForm` is the only narrowing needed. **No non-null assertions.**
- `toJson.call(container)` with **no arguments** — `JSON.stringify` passes the key; the incumbent does not. Matching the incumbent is a byte decision for any host `toJSON` that reads its argument.

**Do not export `serializeJcs` from `packages/record/src/index.ts`.** SPEC section 3 names `canonicalize()` and `digest()` as the exported helpers.

- [ ] **Step 2: Run the tests**

Run: `pnpm test` → the jcs tests pass. Then `pnpm typecheck` → clean. Then `pnpm lint` → 0 new diagnostics.

- [ ] **Step 3: Commit**

```bash
git add packages/record/src/jcs.ts packages/record/test/jcs.test.ts
git commit -m "Add the library-owned RFC 8785 serializer, zero dependencies

RFC 8785 delegates number and string forms to ECMAScript, so
JSON.stringify already does most of it; recursive key ordering by
UTF-16 code unit is the part JCS adds. Every input with no JCS form
throws rather than returning undefined - TextEncoder would encode
that as zero bytes, collapsing three distinct unrepresentable
inputs onto the empty-string digest.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 12: Import the base kernel source

**Files:**
- Create: 21 files under `packages/record/src/` from base commit `c0f0f75`
- Modify: `packages/record/src/index.ts` (replaces the skeleton)
- Modify: `packages/record/src/canonical.ts` (the serializer rewire)
- Delete: `packages/record/test/create.test.ts`

**Interfaces:**
- Consumes: `serializeJcs` from Task 11.
- Produces: `create(config)`, `canonicalize`, `digest`, the `Store` interface, `MemoryStore`, `createWithClock` — consumed by every later task and phase.

- [ ] **Step 1: Obtain each file with `git show`, never `git archive`**

For every path in `git -C <reference> ls-tree -r --name-only c0f0f75 -- packages/record/src`, write the output of `git -C <reference> show c0f0f75:<path>` to the same relative path here. **`git archive` extracts CRLF** (the source repo has `core.autocrlf=true` and no `.gitattributes`), which makes every anchored edit in the following tasks miss.

Do **not** copy `packages/record/package.json` — this repository's has no `dependencies` key and does not gain one.

- [ ] **Step 2: Rewire `canonical.ts` to the hand-written serializer**

The reference implementation touches the external package in exactly three places at `c0f0f75`: `package.json:19` (never copied), `canonical.ts:7` (the import), and `canonical.ts:59` (the single invocation repo-wide).

Edit 1 — `canonical.ts:7`:
```typescript
import canonicalizeJcs from 'canonicalize';
```
becomes
```typescript
import { serializeJcs } from './jcs.js';
```

Edit 2 — the body containing `canonical.ts:59`. Replace the `const text = canonicalizeJcs(structure); if (text === undefined) throw …; return new TextEncoder().encode(text);` sequence with:
```typescript
  // The `undefined` guard is gone because serializeJcs returns `string` and every
  // unrepresentable input throws at the point of the value. TypeScript will NOT
  // catch a regression here — TextEncoder.encode is typed `encode(input?: string)`,
  // so a widened return type compiles clean. If serializeJcs ever returns
  // `string | undefined`, the guard comes back in the same commit.
  return new TextEncoder().encode(serializeJcs(structure));
```

**These two edits are one coupled decision, not two independent ones.** Why it matters: `new TextEncoder().encode(undefined)` does **not** stringify — `encode`'s parameter defaults to `""`, so it returns **zero bytes**, and the library would chain `sha256:e3b0c442…`, the empty-string digest this file's own test pins for `digest('')`. Three different unrepresentable inputs would collapse onto one indistinguishable digest.

- [ ] **Step 3: Delete the walking-skeleton test**

Remove `packages/record/test/create.test.ts`. Both its tests go red the moment `create()` stops throwing `VidimeraNotImplementedError`.

- [ ] **Step 4: Run typecheck and record the error count**

Run: `pnpm typecheck`
Expected: **26 errors**, all `noUncheckedIndexedAccess`-derived, in six files (`chain/replay.ts` 11, `kernel/finalize.ts` 9, `kernel/expiry.ts` 3, `store/memory.ts` 1, `kernel/stage.ts` 1, `canonical.ts` 1). Do not commit yet — Task 13 clears them.

### Task 13: Clear the 26 typecheck errors — eleven edit sites

**Files:**
- Modify: `packages/record/src/chain/replay.ts`, `kernel/expiry.ts`, `kernel/finalize.ts`, `kernel/stage.ts`, `store/memory.ts`, `canonical.ts`

Decision 0e. Sixteen of the 22 files have zero errors and need no work. **No non-null assertions.** Where the branch is genuinely unreachable, the throw message must say *why* rather than implying a real failure mode.

- [ ] **Step 1: Group A — `replay.ts` destructuring (4 errors, one fix)**

`const [first, ...rest] = chain;` — fold the existing `chain.length === 0` throw into the destructure guard and delete the now-dead length check:
```typescript
const [first, ...rest] = chain;
if (first === undefined) throw new Error('replay: empty chain — a record always has a genesis');
```

- [ ] **Step 2: Group B — `replay.ts` verifyChain loop (7 errors, one fix)**

Switch the indexed loop (`const transition = chain[i];`) to `for (const [i, transition] of chain.entries())` — `entries()` yields a non-optional element type — and hoist the genesis seed to reuse the first entry rather than re-indexing `chain[0]` at line 185.

- [ ] **Step 3: Group C — last-element reads (8 errors, five sites, same fix)**

At `expiry.ts:89`, `finalize.ts:143`, `finalize.ts:254` (`appendChainCompromise`), `finalize.ts:297` (`refuseMaybeAppend`):
```typescript
const last = chain.at(-1);
if (last === undefined) throw new Error('<fn>: empty chain — callers hold a loaded chain');
```
At `memory.ts:286` an `existing.chain.length === 0` early return sits two lines above, so prefer restructuring and deleting the length check:
```typescript
const last = existing.chain.at(-1);
return last === undefined ? null : transitionDigest(last);
```

- [ ] **Step 4: Group C-prime — the genesis read at `expiry.ts:80`**

`const openedAt = chain[0].at;` is a genesis index read, not a last-element read, so no Group-C fix reaches it:
```typescript
const genesis = chain[0];
if (genesis === undefined) throw new Error('expireIfDue: empty chain — callers hold a loaded chain');
const openedAt = genesis.at;
```
This is the site the original grouping missed; without it the count is 25, not 26.

- [ ] **Step 5: Group D — `legs[index]` after findIndex (4 errors, one fix)**

This edit **is** post-base fix (iv). Measured: the `if (legIndex === -1) throw; const leg = legs[legIndex];` form leaves all four errors standing (still 26); the read-then-guard form clears all four (26 → 22). Do them as ONE edit:
```typescript
const leg = legs[legIndex];
if (leg === undefined) {
  throw new Error(`finalize: persisted legId '${legId}' is absent from profile '${profileId}'`);
}
```
This also replaces the fail-open clamp onto leg 0 at `finalize.ts:100`. At `c0f0f75` there is exactly **one** such clamp; the other two sites the design mentions do not exist at base. Two further hardcoded-leg-0 sites do exist (`open.ts:76`, `expiry.ts:96`) but are provably correct while the `legs.length > 1` guard is armed — they become live work at step 4, not now.

- [ ] **Step 6: Group E — `stage.ts` first-leg read (1 error)**

```typescript
const firstLeg = profile.legs[0];
if (firstLeg === undefined) throw new Error(`stage: profile '${profileId}' has no legs`);
```
`validateProfile` already rejects zero legs at `create()`, so this is a typing gap.

- [ ] **Step 7: Group F — `canonical.ts` registry read (1 error)**

Replace the `Object.hasOwn` pre-check at line 131 with a read-then-guard, keeping the identical message:
```typescript
const c = registry[ref];
if (c === undefined) throw new Error(`resolveCanonicalizer: unresolved canonicalizerRef '${ref}'`);
return c;
```

- [ ] **Step 8: Verify zero errors**

Run: `pnpm typecheck`
Expected: clean, 0 errors.

### Task 14: Adopt head's staging module and its fan-out

**Files:**
- Modify: `packages/record/src/kernel/stage.ts`, `id.ts`, `agent-surface.ts`, `create.ts`

Adoption delta 1. Head's `stage.ts` (64 lines) carries the stage-side producer of `unknown-leg`, without which SPEC section 8's core registry claim is untrue at step 1. It is **not** a drop-in: it fans out to three other files (a leg-folded 4-field `deriveStagedRef`), and to `content-binding.test.ts` in Task 17.

- [ ] **Step 1: Replace `stage.ts` and apply the fan-out**

Take `git show <head>:packages/record/src/kernel/stage.ts` and the corresponding hunks in `id.ts`, `agent-surface.ts` and `create.ts`. Re-apply the Group E fix from Task 13 at its new position (`stage.ts(44,34)`, `const resolvedLegId = legId ?? profile.legs[0].id;`).

- [ ] **Step 2: Confirm the chain digests are unaffected**

`stagedRef` never enters the `opened` payload (`kernel/open.ts:53-66`), so chain digests do not move. Task 19's byte-compatibility pins are the empirical proof.

Run: `pnpm typecheck` — expected clean.

### Task 15: Re-arm the construction-time feature guards

**Files:**
- Modify: `packages/record/src/config.ts`
- Modify: `packages/record/test/construction-validation.test.ts` (message assertions)

Adoption delta 3, and a **directional inversion**: the reference implementation progressively *lifted* these guards as capabilities landed. This repository is at step 1 and needs them armed. The `c0f0f75` version already has them in that state — this task is about not letting a later version's lifted guards in, and about the message text.

- [ ] **Step 1: Confirm every governed field throws**

Every field for a capability not built at step 1 (`sod`, `proposer`, `requiredConsultations`, `eligibility`, `policySource`, `ackMode`, `requiredAcks`, `freshness`, `redeem`, `captureMode: 'live'`, multi-leg `legs.length > 1`) must throw at construction.

- [ ] **Step 2: Make each message name the section that lifts it**

The adoption design's verification bar requires each governed throw to name the spec section that will lift it. Base messages name only the field. Rewriting the helper changes every message string and breaks assertions in `construction-validation.test.ts`. **Settle which SPEC section lifts each of the eleven guards, then change the helper and the assertions in one commit.**

- [ ] **Step 3: Decide the `supersedes` guard question**

`supersedes` is the one draft-ahead field with **no profile-level switch**, so the construction-guard discipline does not reach it. Decide now: is type-level absence from the `open()` opts bag sufficient, or should `open()` throw loudly on an unexpected key? Without a decision, a JavaScript caller silently gets no recovery linkage while believing it has one. Record the answer in `docs/process/deferral-register.md` if it is deferred.

### Task 16: Add the record-id minter seam

**Files:**
- Modify: `packages/record/src/create.ts`, `kernel/context.ts`, `kernel/open.ts`

Adoption delta 7 — **an unlisted delta the design omits**, and Task 19's four frozen digests cannot be reproduced without it. Base `createWithClock(config, now)` is 2-arg; head's byte-stability test calls it with 3. Verified: applying exactly these four hunks makes all four pinned digests reproduce byte-for-byte against the `c0f0f75` kernel.

- [ ] **Step 1: Apply the four hunks**

Add the `mintId` import in `create.ts`; add `mintId` to `KernelContext`; add the defaulted third parameter to `createWithClock`; call `ctx.mintId()` in `open.ts` where the record id is generated.

Run: `pnpm typecheck` — expected clean.

### Task 17: Adopt the step-1 test subset

**Files:**
- Create: 17 files under `packages/record/test/` from `c0f0f75`
- Create: `packages/record/test/helpers/chain.ts`, `helpers/profiles.ts`, `helpers/stores.ts`, `fixtures/jcs-vectors.ts`

**Base-file-first is mandatory.** For 8 of the 10 mixed files the head body was rewritten, not extended — terminality's sequencing pin was *inverted* from SEQUENTIAL to ATOMIC, and construction-validation **deleted 7 armed-guard tests** that Task 15 depends on. Only `facts.test.ts`, `review.test.ts` (Task 18) and `byte-stability.test.ts` (Task 19) come from head.

- [ ] **Step 1: Take the 17 base test files**

From `c0f0f75`: `agent-unreachability`, `canonicalization`, `chain-verify`, `construction-validation`, `content-binding`, `content-drift`, `exclusivity`, `expiry`, `identity`, `outcome-model`, `profile-digest`, `refusal-matrix`, `replay-verify`, `store-constraints`, `terminality`, `transition-encoding`, `unknown-ids`. Target directory is **`test/`**, singular.

`store-constraints.test.ts` (282 lines, 18 tests) exists **only** at `c0f0f75` — it was deleted when the step-2 conformance suite replaced it. **Phase 2 deletes it on arrival**; carry that forward.

- [ ] **Step 2: Take the support files**

`helpers/chain.ts` and `fixtures/jcs-vectors.ts` are byte-identical across commits — take either, with `git show`, **never retyped**. `helpers/profiles.ts` must be the **200-line base version**; head added 152 lines of multi-leg and effect-seam builders that Task 15's armed guards reject at construction.

- [ ] **Step 3: Down-port `helpers/stores.ts`**

Head's version (179 lines) implements Store **v2** — `TamperingStore`, `CountingStore` and `RaceOnceStore` delegate `appendBatch`, `findNonTerminal` and `listDue`, and `CountingStore` counts `appendBatch`. Strip each to the five-method base contract. The base equivalents are seven inline classes across six base test files; consolidate to the three shared shapes.

- [ ] **Step 4: Rewrite one import line per file**

Verified exactly one line per file, at these positions in the base corpus: `agent-unreachability:14`, `canonicalization:6`, `chain-verify:15`, `construction-validation:10`, `content-binding:12`, `content-drift:9`, `exclusivity:19`, `expiry:14`, `facts:11`, `identity:12`, `outcome-model:6`, `profile-digest:8`, `refusal-matrix:25`, `replay-verify:8`, `review:8`, `store-constraints:18`, `terminality:11`, `transition-encoding:8`, `unknown-ids:11`.

```typescript
import test from 'node:test';
```
becomes
```typescript
import { test } from 'vitest';
```

Nothing else changes: `node:assert/strict`, `node:crypto` and `structuredClone` all work unchanged, and `describe` / `t.mock` / lifecycle hooks / context parameters appear **nowhere** in the subset.

- [ ] **Step 5: Run and record**

Run: `pnpm test`
Expected: 19 files, **197 tests**, all passing — which simultaneously proves the base test count, the one-line migration, and decision 0f's behavioural equivalence across the whole corpus.

### Task 18: Apply the two step-1-reachable post-base fixes, red first

**Files:**
- Create: `packages/record/test/facts.test.ts`, `packages/record/test/review.test.ts` (from head)
- Modify: `packages/record/src/types.ts`, `kernel/review.ts`, `kernel/finalize.ts`

Adoption delta 2. Two of the four named post-base fixes are step-1 reachable and can be proven red; the other two cannot.

- [ ] **Step 1: Add head's two test files and watch them fail**

Run: `pnpm test`
Expected: `Test Files 2 failed | 18 passed (20) / Tests 2 failed | 200 passed (202)`. The two failures are exactly: BigInt figures must yield `consultation-missing` rather than throwing (the `isValidFacts` canonicalizability guard), and `refusalCode` must be present on a REFUSED review.

- [ ] **Step 2: Apply the three source hunks**

`types.ts` — `ReviewView.refusalCode` present-iff-present. `review.ts` — the passthrough. `finalize.ts` — the `isValidFacts` widening plus its two call sites, carrying canonical bytes.

- [ ] **Step 3: Run and confirm green, with digests unmoved**

Run: `pnpm test`
Expected: 20 files, **202 tests**, all passing. The byte-compatibility digests must be unchanged, confirming the `payloadDigest` rewiring is byte-neutral.

- [ ] **Step 4: Do not fake the other two fixes**

Fix (iii), the `redeeming` arm of the compromise fallback, has **no step-1 producer** — no step-1 test can turn it red. Apply it or defer it, but do **not** write a test that pretends to prove it. Record the choice in the commit body.

### Task 19: Reframe the byte-stability pins as compatibility pins

**Files:**
- Create: `packages/record/test/byte-stability.test.ts` (from head)

Decision 0d. These four digests are **not** a spec-conformance vector: re-deriving them with the finalize batch stamped from a single clock read — a perfectly legal reimplementation — reproduces digest [0] and breaks [1], [2] and [3].

- [ ] **Step 1: Add the file and rewrite its header comment**

State that the four literals are byte-compatibility pins against the implementation this kernel was adopted from, that a mismatch is a finding to adjudicate rather than evidence this repository is wrong, and that SPEC section 4 (as amended in Phase 0) states the two conventions that *are* normative while the clock-read count deliberately is not.

- [ ] **Step 2: Run**

Run: `pnpm test`
Expected: 21 files, 205 tests; all four literals reproduce byte-for-byte.

### Task 20: Two fresh RED tests for the silent section-12 violations

**Files:**
- Modify: `packages/record/test/store-constraints.test.ts`
- Modify: `packages/record/src/store/memory.ts`

Both confirmed in source, and **no inherited test distinguishes them**. These are the storage twin of decision 0c: un-made decisions that ship and pass every inherited test.

- [ ] **Step 1: Write the failing tests**

Test 1 — `putStaged` is idempotent, first-write-wins. Base `memory.ts` does `this.staged.set(staged.id, staged)` (last-write-wins); SPEC section 12 mandates *"idempotent, first-write-wins … keeps the first write rather than overwriting it."* Put a draft, put a different draft under the same id, read it back, assert the **first** survives.

Test 2 — reads return fresh values. Base `getStaged` returns the stored object **by reference**; SPEC section 12 says *"a caller mutating a returned chain, head, or staged draft can never corrupt store-internal state."* Get a draft, mutate the returned object, get it again, assert the store's copy is unchanged.

- [ ] **Step 2: Run and watch both fail**

Run: `pnpm test` — expected: 2 failures.

- [ ] **Step 3: Fix `memory.ts`**

`putStaged`: return early if the id is already present. `getStaged`: return a structured clone.

- [ ] **Step 4: Run** — expected: 207 tests, all passing.

### Task 21: Reserve the `(5.7)` ladder slot and pin adjacent-pair order

**Files:**
- Modify: `packages/record/src/kernel/finalize.ts` (the ladder header comment)
- Modify: the appropriate step-1 test file (order tests)

The reference implementation's `finalize.ts` header carries the ladder verbatim in nine rungs with **no `(5.7)` slot**. Step 7 adds it. Reserving it now is what buys out a ladder renumbering against already-pinned order tests.

- [ ] **Step 1: Add the reserved rung to the header comment**

Insert `(5.7) ack coverage — reserved; arrives with findings & acknowledgments (SPEC §10.2)` between the `(5.5)` and `(6)` rungs.

- [ ] **Step 2: Write an adjacent-pair order test for every adjacent pair present at step 1**

For each adjacent pair in the ladder that exists at step 1, assert that a record tripping *both* gates refuses with the **earlier** rung's code. This is the inherited discipline, and the reference implementation's own analysis found it **missing** on two of its gates — do not inherit that gap.

- [ ] **Step 3: Run** — expected: all green, with the new order tests counted.

### Task 22: Scrub the history references

**Files:**
- Modify: every ported source and test file carrying a flagged line

Measured: **313 lines** at the port base (210 in `src`, 103 in tests); **132 lines** across the step-1 subset specifically.

- [ ] **Step 1: Run the extended scan**

Run: `node scripts/contract-scan.mjs`
Expected: a line-by-line list of every `design §N`, `slice N`, `Task N` and `OQ2-N` pointer.

- [ ] **Step 2: Rewrite each flagged comment**

Where the comment states a *reason*, keep the reason and drop the pointer. Where it only points, delete it. Where it cites a decision this repository has, cite it as `SPEC §N` or `DECISIONS.md`. **This is the port's main cost and its main risk: the comment layer is 49% of source lines and is the inherited code's highest-value asset.** Do not bulk-delete.

- [ ] **Step 3: Confirm silence**

Run: `node scripts/contract-scan.mjs; "exit=$LASTEXITCODE"` — expected: no output, exit 0.

### Task 23: Lint, final gates, and the Phase-1 exit

- [ ] **Step 1: Run the safe autofix**

Run: `pnpm lint:fix` — **never `--unsafe`**. Expected churn roughly 4,920 lines.

- [ ] **Step 2: Prove the autofix with the suite, not the typechecker**

Run: `pnpm test` — expected: all tests still passing. A clean typecheck is **not** evidence: the unsafe autofix leaves the tree at 0 errors while breaking 2 tests.

- [ ] **Step 3: Run all four gates**

```powershell
pnpm typecheck; pnpm lint; pnpm test; node scripts/contract-scan.mjs; "exit=$LASTEXITCODE"
```

- [ ] **Step 4: Write the exit note**

Record, in the commit body and in `docs/process/`: the registry is **10** codes and compiler-total; **no maturity markers moved** (record the absence as a decision, not an omission); the four byte-compatibility digests hold; adjacent-pair order tests exist for every adjacent pair present; the API names accepted at this step (`MemoryStore`, `createWithClock`, both surface types) are registered for the pre-0.1 naming review; and fix (iii)'s disposition.

- [ ] **Step 5: Commit and push**

---

# PHASES 2–8 — roadmap

Each gets its own design/plan cycle. The material below is the verified entry condition for each.

### Phase 2a — the store contract, memory backing, conformance suite
Store v2 (`AppendMeta {nonTerminal, dueAt}` persisted verbatim, `appendBatch` all-or-nothing under one compare-and-swap, `findNonTerminal`, `listDue` dueAt-gated with no state predicate, the `TTx` generic), constraints C1–C4, `seal()` to `retired`, the operator sweep, and the backing-parameterized conformance suite (~1,140 lines, 52 cases) run memory-backed. Registry 10 → 11. **Delete `store-constraints.test.ts` on arrival** and account for its 18 cases one-to-one. **Decide before starting:** the substitute exit artifact; the sweep surface (SPEC section 12 says the operator iterates `listDue`, "the sweep grants no append authority of its own" — the inherited code ships it as a library call, and the surface follows the spec); whether the adapter kit (`transitionDigest`, `genesisPrevHash`, `algorithmOf`) is exported, which the conformance suite forces. **Deferral entry 4 fires.** Note the conformance case modules import a test runner **inside `src/`** — a `node:test` import there makes vitest exit 1 with a misleading "No test suite found".

### Phase 2b — the two SQL adapters and the cross-backing e2e
An embedded-SQL store, a server-SQL store, the caller-tx seam actually exercised, and byte-identical chains across backings under a fixed clock. **Bound: may slip inside step 3 but not past its exit**, because the caller-tx contract cannot be proven memory-backed and the direct redemption shape is half of redemption. Brings a native build, a network prebuild fetch, and a service container — three things this CI has never carried. Recommendation: a **separate CI job** with a Postgres service container so the pg leg is genuinely required somewhere; do not inherit the silently-skipping steady state. Reconcile the adapters' inherited `engines: ">=24"` against this repository's `>=22`.

### Phase 3 — redemption (the effect seam)
Both host shapes, the correspondence gate, at-most-once, three clock edges, the sweep's three-arm dispatch. Registry 11 → 14. **The last store-perturbing step** — assert that in the exit note.

### Phase 4 — multi-leg separation of duties
Leg sequencing by verified reference, the (3.5) gate keyed on the record's own recorded legIds, `prior-leg-unverified`. Registry 14 → 16. The cleanest adoption in the range: store, adapters and conformance are diff-**empty** — assert it with a path-scoped `git diff --stat`. **OQ section 8 activates as a negative:** keep the prior-reference shape an ordered list, and record the non-admission of concurrent legs as a deliberate act.

### Phase 5 — required-consultation gating
Host consultations as finalize inputs, the intake throw *before the chain load*, the (5.5) gate, and `availability` minted as the first producer of the `unavailable` status — which widens `RefusalClass` to three classes. Registry 16 → 18. **`freshness` stays governed and must keep throwing**; do not mint `consultation-stale`. The three-class widening is ADR-grade — record it as a decision. **Byte-stability caution:** the inherited N=0 proof leans partly on 8 frozen hashes from an example package that is out of scope here; this repository inherits only the 4-digest arm and needs its own fixture provenance.

### Phase 6 — authority checks (policy-drift + eligibility)
Registry 18 → 20. **Carries decision 0c and Conflict C1 below.** Author a TDD-red test that exists in neither repository: open under a declaring profile, construct a same-id non-declaring instance, finalize, expect `policy-drift`. Prove eligibility's short-circuit keys off the **derived** list (the fail-open bug the reference implementation found in its own first pass).

### Phase 7 — findings & acknowledgments
**No reference implementation exists** — two construction guards and a 288-line design document, nothing else. SPEC section 10.2 is complete on behaviour; do not re-open it. Four residuals to re-derive: a ~25-item test plan; the **composite pin** (an earlier-gate refusal carrying a well-formed consultations list appends **zero** consultation *and* zero finding/ack transitions, one representative per earlier tier); the requirement that the (5.7) gate and `ReviewView.findings[].covered` be **one shared function**; and a worked example, which is dropped as a deliberate act. Registry 20 → 22. **The first legitimate marker move — all ten `[DESIGNED]` sites, in one commit, at exit.** This is the only step in the roadmap that activates none of the open questions.

### The 0.1 cut — after step 7, before step 8
Every decided behaviour has landed; everything remaining is `[SKETCHED]` with open decisions about the behaviour itself. Deferral entry 1 fires (there is no emit path today — `noEmit: true`, no `exports`, no `build`), the API naming review comes due, entry 5 folds in. **OQ section 9 (store interface freeze) does NOT fire — it is a 1.0 gate**, so the README must state the interface's provisionality in the same breath as the version. Recommendation: cut and tag **without** publication unless a real consumer exists. **OQ section 5 may need answering here**, several steps before the self-test tier is built, because a subpath export shapes the 0.1 `exports` map.

### Phase 8.1 — recovery (`supersedes`)
Zero inherited code. Behaviour is decided (verify-by-replay, terminal predecessor required, recorded in genesis); three residuals are not — the refusal shape for a non-terminal predecessor, whether exclusivity and terminality are checked under one store constraint or sequentially (**the last plausible store change before the 1.0 freeze**), and whether a back-reference is recorded on the predecessor (likely no; say so rather than letting C4 decide by accident). First among step 8's four.

### Phase 8.2 — live capture and `reverify`
Zero inherited code beyond guards. **See the sequencing fork above.** If it bypasses staging, SPEC section 9's "this holds without exception" human-anchor sentence needs restating — and that is a preserved-principle claim, so weakening it is a fork, not an edit.

### Phase 8.3 — AL2 detached signing
Zero inherited code — one placeholder comment. **Resolve the six-item docket first, granularity first**, per `SCOPING-GUIDE.md` section 7's own instruction. The signer-contract choice is a dependency decision of the same weight as 0f was: adopting a standard envelope puts an external dependency on a governed path. The synchrony choice **can grow the Store contract**, which collides with the 1.0 freeze.

### Phase 8.4 — the self-test tier
Last, by the build order's reasoning and because four of its fourteen target behaviours only exist after steps 3, 4, 6 and 7. Inherited code is on a parked branch and **cannot be ported**: it emits a conformance report with a waiver set — exactly what this concept places out of scope — and every identifier carries banned vocabulary. What survives is roughly 60 lines of shape, notably the characterization inversion where an attack *succeeding* means the guarantee is broken. **This tier has no SPEC section**; its four markers live in `CONTROLS.md` alone.

---

## Conflicts requiring an owner decision before their phase

**C1 — decision 0c contradicts sealed normative text.** `SPEC.md` section 10.3 contains a paragraph headed "The reverse cross-instance direction is permissive at AL1 — a named, open decision", stating the gate skips and the decision confirms. Fail-close falsifies it. But the adoption design's "Out of scope" line forbids "any change to the concept set beyond decision 0a". **Resolve in writing before Phase 6 starts, not during.** OQ section 2 must also move to resolved, and `ASSURANCE.md` section 7's bullet is satisfied by recording it.

**C2 — the fail-close cure path does not exist in either repository.** Under fail-close, a record with a bound `policyDigest` finalized under a same-id non-declaring profile refuses `policy-drift` — but that profile **cannot supply `opts.policy` without throwing**, and the `terminalRefusals` guidance is scoped to policy-*declaring* profiles. The record may strand its `(profile, subject)` pair under exclusivity. Decide: extend the guidance to the non-declaring case, make the refusal terminal by construction, or state that the operator must restore the declaring profile.

**C3 — the AL2 docket is a second concept-set amendment.** Authoring the two missing sub-decisions (a signer's programmatic contract; signing synchrony and the signer-outage failure class) into `OPEN-QUESTIONS.md` section 1 breaks the seal a second time. Recommendation: **put them there anyway** — that file's entire purpose is to be the honest list an inheritor decides, and a list known to be missing two named sub-decisions is inaccurate. The alternative is a `docs/process/` docket, which keeps the seal at the cost that a reader of the concept set alone does not see them.

**C4 — steps 2–6 have no exit signal.** Decide the substitute artifact before Phase 2.

**C5 — vocabulary tension inside the concept set.** `CONTROLS.md` section 4 says "Waiver governance (self)" and "probe suite" while `SCOPING-GUIDE.md` section 3 commitment 4 bans "waiver" from user-facing surfaces. Decide at Phase 8.4 whether catalog vocabulary and shipped API vocabulary are governed by the same rule.
