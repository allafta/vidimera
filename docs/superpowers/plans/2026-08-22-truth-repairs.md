# Truth Repairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair ten claims in tracked source comments, test headers and the increment record that assert a state this repository left behind, and give the one countable claim among them a gate so it cannot drift silently again.

**Architecture:** Tasks 1–3 are comment-only repairs grouped by what falsified them: the packaging increment's `exports` map (Task 1), two stale counts in the kernel and its surfaces (Task 2), and `config.ts`'s two self-contradictions (Task 3). Task 4 builds `scripts/docs-index-sync.mjs`, uses its first red run as the failing test against real drift in `docs/superpowers/INDEX.md`, repairs that drift, wires the gate, and moves the seven prose enumerations an eighth gate falsifies — all in one commit, because a gate that lands without them creates the exact defect this increment closes. Task 5 records the increment and runs the exit battery.

**Tech Stack:** TypeScript (NodeNext, strict), ESM `.mjs` for repo tooling, vitest 4, Biome.

**Spec:** `docs/superpowers/specs/2026-08-22-truth-repairs-design.md`

## Global Constraints

- **NO SANCTION IS NEEDED AND NONE IS SOUGHT.** No task edits `docs/concept/`. No maturity marker moves. If a repair appears to require a `docs/concept/` edit, STOP and report it — that is a finding, not a task.
- **Zero library behavior change.** `packages/record`'s 48 test files and `packages/store-postgres`'s 4 must report the same test counts before and after. Only Task 4 changes the suite TOTAL, by adding exactly one file in `scripts/test/`.
- **`packages/record/test/byte-stability.test.ts` is FROZEN** — asserted green, never edited (`CONTRIBUTING.md` hard rule 4).
- **Re-verify every row against the tree before repairing it.** The design doc's inventory is evidence, not authority. A row that no longer reproduces is recorded as such in Task 5, not silently skipped and not "fixed anyway".
- **Repair in place; do not delete.** Each comment carries real explanation beside its false claim. Keep the explanation; correct only the claim.
- **Keep every citation adjacent to its quotation.** `scripts/contract-scan.mjs` resolves `SPEC §N` and `DECISIONS.md #N` citations in tracked TypeScript and checks any quotation attributed to them. Its `attributionGapPattern` admits an optional possessive and ONE sub-reference token (`C\d+`, `#\d+`, `§N`, `reads`, `says`); anything else between citation and quotation ends attribution and silently de-gates the quotation. Never insert prose between a citation and the text it attributes.
- **`codeOnlyPatterns` runs over every LINE of a tracked `.ts`/`.mts`/`.cts` file**, not only comments. Forbidden in anything you write into one: the bare word `design` (only "by design" is excluded), the bare word `slice` (a left guard keeps `.slice()` legal), `Task <n>`, `slice <n>`, `OQ<n>-<n>`, `design §<n>`, foreign labels (`M-A`, `S-3`, `O11`, `T1.2`), and 7–40-char hex commit refs. **Do not write "Task 3" or similar into any source comment.**
- **`.mjs` IS NOT SCANNED, and that is a real gap this increment widens.** `scripts/contract-scan.mjs` globs `*.ts`, `*.mts`, `*.cts` only, so neither the existing `scripts/*.mjs` tooling nor the new gate script and its test is checked by anything. Hold the new `.mjs` files to the same standard by hand — the gate will not catch you — and say so plainly in Task 5's increment section rather than leaving a reader to assume `contract-scan` covers `scripts/`.
- **Everything you paste must be Biome-formatted before it is committed.** Every gate step runs `./node_modules/.bin/biome check .`, `biome.json` enables the formatter, and the code blocks in this plan are written for readability, not to Biome's line-width and member-chain rules. Run `./node_modules/.bin/biome check --write .` after pasting any block, then re-read the diff — do not let the formatter's rewrite go in unreviewed.
- Node floor `>=22.16`; ESM; `@vidimera/record` keeps zero runtime dependencies. The new gate script adds no dependency — `node:fs`, `node:path`, `node:url`, `node:child_process` only.
- **Gates at every commit — never call `pnpm`** (the global shim is broken on this machine): `./node_modules/.bin/vitest run` (zero skips), `./node_modules/.bin/tsc --noEmit -p packages/record` AND `-p packages/store-postgres` (there is NO root tsconfig), `./node_modules/.bin/biome check .`, `node scripts/contract-scan.mjs` exit 0, `node scripts/api-reference-sync.mjs` exit 0. From Task 4 on, also `node scripts/docs-index-sync.mjs` exit 0.
- Commit messages via `git commit -F <msgfile>` where the message file is written with the **Write tool** — PowerShell `Set-Content` prepends a BOM that corrupts the subject line. Verify the branch before each commit. **Never push.**
- Commit subjects follow the increment convention: `Truth repairs N/5: <what landed>`.

---

### Task 1: The exports-map family — rows 1, 2, 3, 5

Four comments falsified by one event: the phase-2 packaging increment adding `exports` to `packages/record/package.json`, and in the same commit the `files` array that stops `src/` from being published.

**Files:**
- Modify: `packages/record/src/probes/index.ts` (header, the `NOTE:` paragraph)
- Modify: `packages/record/src/index.ts` (header line 1 and the header's closing sentence; the `MemoryStore` block comment)
- Modify: `packages/record/test/public-surface.test.ts` (header, rule 3)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. Comment-only; no symbol, signature or export changes.

- [ ] **Step 1: Verify the premise before touching anything.**

Run:
```bash
sed -n '17,30p' packages/record/package.json
grep -n "transitionDigest" packages/record/src/index.ts
```
Expected: an `exports` object carrying both `"."` and `"./probes"`; a `files` array whose first entry is `"dist"`; and `export { transitionDigest } from './chain/encoding.js';` in `index.ts`. If any of these is absent, STOP — the row does not reproduce, and Task 5 records that instead.

- [ ] **Step 2: Repair `probes/index.ts`'s `NOTE:` paragraph.**

Replace the whole `NOTE:` paragraph (it begins `// NOTE: this is source convention only today` and ends `// does.`) with:

```ts
// The package's `exports` map carries this subpath: `packages/record/package.json`
// declares both `.` and `./probes`, so a consumer imports this module as
// `@vidimera/record/probes`. It landed at the phase-2 packaging increment, together with
// the `files` array — whose first entry is `dist` — so `src/` is never published and no
// deep path into source is reachable from a published tarball. Deferral-register row 6
// (the pre-0.1 API-naming review) retired 2026-08-19 having decided this as the one
// subpath; row 1's own remaining scope is the release workflow's first exercise at the
// 0.1 cut, not the map. This package's own suite imports the module by relative path from
// inside the workspace, which is a workspace convenience and not the published route.
```

- [ ] **Step 3: Repair `index.ts`'s header — two places in one block.**

First line: replace `// @vidimera/record — public entry point: the single `.` export. Re-exports `create` (its` with:

```ts
// @vidimera/record — public entry point: the `.` half of a two-entry exports map (`.` and
// `./probes`). Re-exports `create` (its
```

Then the header's closing sentence: replace `// the one decided subpath, `./probes` (OPEN-QUESTIONS §5's "a public library subpath"),` and the line following it (`// lands with the exports map itself (publish tooling, deferral register row 1).`) with:

```ts
// the one decided subpath, `./probes` (OPEN-QUESTIONS §5's "a public library subpath"),
// landed with the exports map at the phase-2 packaging increment; the manifest declares
// both entries today.
```

- [ ] **Step 4: Repair `index.ts`'s `MemoryStore` block.**

`transitionDigest` is the ONLY `chain/encoding.js` name this entry point exports. Verify with `grep -n "from './chain/encoding.js'" packages/record/src/index.ts`, which prints the single re-export line and therefore actually proves it — the Step 1 grep cannot establish the absence of two other names.

**This is a string replace, not a line replace.** Replace the string `// Chain/encoding internals stay unexported; the store class is the` plus the leading `// seam.` of the line that follows — but that following line continues `PUBLIC BUT EXPLICITLY UNSTABLE PRE-1.0 — see \`MemoryStore\`'s own doc comment`, and the line after completes the thought. Replacing it wholesale would silently delete the PRE-1.0 instability marking from the entry point. The replacement block's trailing `// seam.` must leave that tail attached:

```ts
// One chain/encoding internal IS exported — `transitionDigest`, above, part of the
// adapter-author surface a conforming `Store` needs, and the only route
// `@vidimera/store-postgres` has to it. The rest of `chain/encoding.ts`
// (`genesisPrevHash`, `encodeTransition`) stays unexported; the store class is the
// seam.
```

- [ ] **Step 5: Repair `public-surface.test.ts`'s rule 3.**

Replace `// signing tier is root-reachable (the `./probes` subpath is publish-tooling work,` and its continuation `// register row 1: no exports map exists yet, so a subpath cannot).` with:

```ts
// signing tier is root-reachable, and `./probes` is the one decided subpath — the exports
// map declaring both entries landed at the phase-2 packaging increment.
```

- [ ] **Step 6: Gates.**

Run, in order:
```bash
./node_modules/.bin/tsc --noEmit -p packages/record
./node_modules/.bin/tsc --noEmit -p packages/store-postgres
./node_modules/.bin/biome check .
node scripts/contract-scan.mjs; echo "contract-scan exit=$?"
node scripts/api-reference-sync.mjs; echo "api-sync exit=$?"
./node_modules/.bin/vitest run
```
Expected: both typechecks silent; biome no findings; both scans exit 0 with no output; vitest **54 files, 751 tests, 0 failed** — unchanged, because nothing but comments moved.

- [ ] **Step 7: Commit.**

Write the message with the Write tool to `.git/COMMIT_MSG_TMP`, then:
```bash
git branch --show-current
git add packages/record/src/probes/index.ts packages/record/src/index.ts packages/record/test/public-surface.test.ts
git commit -F .git/COMMIT_MSG_TMP
```
Subject: `Truth repairs 1/5: the exports map exists — four comments catch up`

---

### Task 2: The stale counts — rows 6 and 8

Two enumerations in the kernel and its surfaces that a later increment outgrew. Row 6 has been stale since the recorded-human-decline increment added a seventh verification site; row 8 since `970d837` (2026-08-17, the findings flow) added a caller the comment never named.

**Files:**
- Modify: `packages/record/src/operator-surface.ts` (the FILE HEADER's `verifySignatures` paragraph — NOT the interface member's doc comment lower down, which makes the same folding claim and carries no count)
- Modify: `packages/record/test/signing-enforce.test.ts` (header)
- Modify: `packages/record/src/kernel/finalize.ts` (`appendChainCompromise`'s doc comment)
- Modify: `docs/process/implementation-status.md` (present-tense "six verification sites" sentences only)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. Comment-only.

- [ ] **Step 1: Establish the true counts.**

Run:
```bash
grep -rn "signatureLayerHolds(ctx, chain)\|await signatureLayerHolds" packages/record/src/ | grep -v "verify-signatures.ts"
grep -rn "appendChainCompromise(" packages/record/src/ | grep -v "export async function"
```
Expected — seven `signatureLayerHolds` invocation sites: `kernel/finalize.ts`, `kernel/decline.ts`, `kernel/findings-seams.ts`, `kernel/prior-legs.ts`, `kernel/redeem.ts`, `kernel/seal.ts`, `kernel/supersedes.ts`. Expected — five `appendChainCompromise` call sites: `kernel/decline.ts`, `kernel/finalize.ts`, `kernel/findings-seams.ts`, `kernel/redeem.ts`, `kernel/seal.ts`. If the counts differ, use what you measured and note the difference for Task 5.

- [ ] **Step 2: Repair `operator-surface.ts`'s header paragraph.**

Replace `// (second of three, now landed) folds the signature layer into chain-compromise at the` and its continuation `// SIX verification sites instead (`signatureLayerHolds`, sharing this read's own` with:

```ts
// (second of three, now landed) folds the signature layer into chain-compromise at the
// SEVEN verification sites instead (`signatureLayerHolds`, sharing this read's own
```

Then, immediately after that paragraph's closing line (`// correlation core), never by having this read itself gate.`), add:

```ts
// The seventh site is `kernel/decline.ts`, which the recorded-human-decline increment
// added after the enforcement increment's own six; a count here is a live claim about the
// current tree, so it moves whenever a seam joins the family.
```

- [ ] **Step 3: Repair `signing-enforce.test.ts`'s header.**

Replace `// chain-verification site — the four seam prologues and the two cross-record` and its continuation `// claims — requires a signing record's every transition to verify under the host` with:

```ts
// chain-verification site — the five seam prologues (finalize, decline, seal, the
// redemption family's shared prologue, the findings family's shared prologue) and the two
// cross-record claims (verifyPriorLegs, verifySupersedes) — requires a signing record's
// every transition to verify under the host
```

- [ ] **Step 4: Repair `appendChainCompromise`'s caller enumeration.**

The comment names `seal`, `redeem`, `beginRedemption` and `completeRedemption` but not `kernel/decline.ts` or `kernel/findings-seams.ts`. Immediately before the closing `*/` of that doc comment, add a final paragraph:

```ts
 *
 * `kernel/decline.ts`'s `decline()` (the recorded-human-decline increment) and
 * `kernel/findings-seams.ts`'s shared prologue serving `raiseFinding`/`acknowledge` (the
 * findings flow) are the remaining callers — five call sites in all, counting this
 * function's home seam. Both take the ordinary un-enlisted path and add no shape beyond
 * the ones named above: decline's own CAS candidate set is finalize's, and the findings
 * seams append only from `open`.
```

- [ ] **Step 5: Repair the present-tense count in the record, WITHOUT rewriting history.**

Run `grep -n "SIX verification sites\|six verification sites" docs/process/implementation-status.md`.

For each hit, read the surrounding sentence and classify it:
- **Present-tense claim about the current tree** (e.g. "is now consulted at ALL SIX verification sites") — this is stale. Repair it by pinning it to its increment in the past tense rather than by bumping the number, because six WAS correct at the AL2 enforcement increment: `was consulted, at that increment, at all six verification sites then existing`.
- **Past-tense historical statement already scoped to its increment** — leave it exactly as it is. It is accurate about the moment it describes.

Do NOT edit `docs/superpowers/specs/` or `docs/superpowers/plans/` files that say "six": `docs/superpowers/INDEX.md` states that a spec/plan pair describes the state at the time it was written, so those are correct as historical records.

- [ ] **Step 6: Gates.** Same battery as Task 1 Step 6. Expected identical: 54 files, 751 tests, 0 failed; both scans exit 0.

- [ ] **Step 7: Commit.**

Subject: `Truth repairs 2/5: six becomes seven, and the compromise caller list names all five`

Note in the commit body that `docs/process/implementation-status.md` was edited and why, per `CONTRIBUTING.md`'s rule that edits to it are proposed explicitly.

---

### Task 3: `config.ts`'s two — rows 7 and 9

One file, two comments, three distinct falsehoods: a pin asserted that never existed; a numbered ladder that stops short of the body; and the file contradicting itself two-against-four about `governedUnavailable`'s call sites.

**Files:**
- Modify: `packages/record/src/config.ts` (the GOVERNED message doc comment; `validateProfile`'s doc comment — ONE block, opening above the numbered list and closing immediately above the function)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. Comment-only. **`governedUnavailable` itself is not touched**, and no construction guard is added or removed (`CONTRIBUTING.md` hard rule 5).

- [ ] **Step 1: Verify all three claims.**

Run:
```bash
grep -n "GOVERNED feature not available" packages/record/test/construction-validation.test.ts
grep -rn "governedUnavailable(" packages/record/src/ | grep -v "config.ts:"
sed -n '614,642p' packages/record/src/config.ts
```
Expected: in the test file, only a header mention and two `assert.doesNotMatch` negatives — no positive match anywhere. Four `governedUnavailable` call sites: `kernel/open.ts`, `kernel/finalize.ts`, `kernel/decline.ts`, `kernel/redeem.ts`. And in the body: `validateResultDeclaration`, then the `policySource` check, then a `signing`-must-be-literal-`true` check, then a leg loop running SIX validators after `validateLeg`.

- [ ] **Step 2: Repair the GOVERNED message comment (row 7) — correct the claim, do not satisfy it.**

Replace the WHOLE of `packages/record/src/config.ts` line 102, whose verbatim text is:

```text
 * (<field>)` — is byte-preserved (pinned by construction-validation.test.ts); the
```

with the four-line block below. This is a WHOLE-LINE replace, not a clause replace: the replacement block itself re-opens with `` * (<field>)` ``, so substituting only the trailing clause would produce a doubled fragment. The block's final word `The` runs into the existing next line (`` * caller-supplied `contract` is the appended tail: … ``), which is left untouched. Note the block is a `/** … */` doc comment, so its lines begin `` * ``, never `// *`.

```ts
 * (<field>)` — is NOT pinned by any test. `construction-validation.test.ts` names it in
 * its own header and in two `assert.doesNotMatch` negatives, which assert that a
 * STRUCTURAL error is not the governed string; nothing anywhere asserts that a governed
 * throw MATCHES this head, so rewording it would break no gate. Ordinary prose, not a
 * byte contract. The
```

Do NOT add a positive pin. Whether this head SHOULD be byte-preserved is a decision about the GOVERNED message contract and is out of scope here (design doc, "Row 7 is corrected, not satisfied").

- [ ] **Step 3: Repair `validateProfile`'s numbered ladder (row 9, first half).**

The leg loop runs SIX validators after `validateLeg`, in this verified order: `validateSodShape`, `validateRequiredConsultations`, `validateEligibility`, `validateDecline`, `validateFreshness`, `validateFindingsFlow`. Rung 6 names five of them and says "all five after", omitting `validateDecline`, which sits FOURTH — between eligibility and freshness, not at the end.

Replace rung 6's tail — from `(`validateEligibility`), structural freshness validation` through `all five after;` — with the block below. This is a single replacement carrying the whole corrected tail in loop order; do **not** additionally "insert `validateDecline`" somewhere, or it will be named twice:

```ts
 *     (`validateEligibility`), structural decline validation (`validateDecline`),
 *     structural freshness validation (`validateFreshness`), and structural
 *     findings-flow validation (`validateFindingsFlow`), all six after;
```

Then add the two profile-level steps the numbered list never reaches. After rung 4's entry (`validateBounds`) insert:

```ts
 *  4a. structural: the `redeem.result` declaration's shape (`validateResultDeclaration`,
 *     the effect-result increment) — profile-level, run immediately after the numeric
 *     bounds and before the policySource label check;
```

and after rung 5's entry insert:

```ts
 *  5a. structural: `signing` declared as anything but the literal `true` — the
 *     fail-closed guard that stops a silently-inert `signing: false` from constructing;
 *     profile-level, run before the leg loop;
```

- [ ] **Step 4: Repair the self-contradiction (row 9, second half).**

The same comment block's AL2-freshness tail says `governedUnavailable` serves two throw sites; the comment above `governedUnavailable` itself says four. Four is correct. Replace `* unknown-option-key throws that are NOT feature guards — `finalize()`'s own` through `* single not-yet-enforceable field the way every guard swept by this sequence did.` with:

```ts
 * unknown-option-key throws that are NOT feature guards — four call sites today
 * (`kernel/open.ts`, `kernel/finalize.ts`, `kernel/decline.ts`, and `kernel/redeem.ts`'s
 * shared `validateRedeemOptions` serving all three redemption seams), none of which names
 * a single not-yet-enforceable field the way every guard swept by this sequence did. This
 * count is stated once above `governedUnavailable` itself; the two must not diverge again.
```

- [ ] **Step 5: Gates.** Same battery. Expected identical: 54 files, 751 tests, 0 failed.

- [ ] **Step 6: Commit.**

Subject: `Truth repairs 3/5: config.ts stops contradicting itself — the unpinned head, the short ladder, two against four`

---

### Task 4: The gate, the index repair, the wiring, and the seven enumerations

One commit, because a gate that lands without its enumeration moves creates the very defect this increment closes. The gate's first red run against real drift IS this task's failing test.

**Files:**
- Create: `scripts/docs-index-sync.mjs`
- Create: `scripts/test/docs-index-sync.test.mjs`
- Modify: `docs/superpowers/INDEX.md` (the counts paragraph, the `docs/analysis/` paragraph, and the table)
- Modify: `package.json` (root scripts)
- Modify: `.github/workflows/ci.yml` (the `checks` job)
- Modify: `.github/workflows/release.yml` (the gate block under `# Every gate the repository has`)
- Modify: `docs/process/next-phases.md` (the over-broad "no scan reads a prose enumeration" sentence — narrowed, see Step 8)
- Modify: `CONTRIBUTING.md` (the fenced gate list; the `scripts/` table row)
- Modify: `CLAUDE.md` (the Commands list; the CI-description sentence)
- Modify: `README.md` (the dev block)
- Modify: `docs/process/release-checklist.md` (the single-line gate command)

**Interfaces:**
- Produces: `scripts/docs-index-sync.mjs` exporting three functions — `statedCounts(indexText)` returning `{ specs, plans, analysis }` (each a number or `null` when the sentence is absent); `unlistedFiles(basenames, indexText)` returning the basenames not occurring in `indexText`; and `trackedBasenames(repoRoot, dir)`, which shells out to `git ls-files` and is therefore exported for reuse rather than for unit testing. The test imports the first two. `main()` is not exported and runs only under the `process.argv[1]` guard.

- [ ] **Step 1: Write the gate script.**

Create `scripts/docs-index-sync.mjs`:

```js
// docs-index-sync.mjs — the increment-record drift gate (the truth-repairs increment):
// docs/superpowers/INDEX.md carries counted claims about docs/superpowers/specs/,
// docs/superpowers/plans/ and docs/analysis/, and a table naming one row per increment.
// Markdown is never citation-checked and no other gate reads a prose count, so this script
// is the only mechanical check behind those claims.
//
// What it checks — TWO directions, both presence-shaped: every tracked file in specs/ and
// plans/ must be named somewhere in INDEX.md (`file-not-indexed`), and each stated count
// must equal the tracked file count for its directory (`count-mismatch`). Clean = no
// output and exit 0, the convention both sibling gates use. Findings go to stderr, which
// matches api-reference-sync and differs from contract-scan, which prints to stdout.
//
// Bounds, stated plainly (read before treating a green run as coverage): it proves
// presence and arithmetic, never accuracy — a row carrying the wrong date, the wrong
// increment name, or the wrong build-order step passes; a file named only inside an
// unrelated sentence counts as named; and it reads tracked files only, so an unstaged new
// document is invisible until `git add`. It does not check docs/analysis/ for rows,
// because that directory has never been tabulated — only its count is claimed.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Tracked files under `dir` matching `*.md`, as basenames. */
export function trackedBasenames(repoRoot, dir) {
  const out = execFileSync('git', ['ls-files', '-z', '--', `${dir}/*.md`], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return out.split('\0').filter((p) => p !== '').map((p) => basename(p));
}

/** The three counts INDEX.md states, or null for a sentence that is absent. */
export function statedCounts(indexText) {
  const pair = indexText.match(/(\d+)\s+files?\s+in\s+`specs\/`,\s*(\d+)\s+in\s+`plans\/`/);
  const analysisNumeric = indexText.match(/`docs\/analysis\/`\*\*\s+holds\s+(\d+)\s+files?/);
  const analysisWordOne = /`docs\/analysis\/`\*\*\s+holds\s+one\s+file/.test(indexText);
  return {
    specs: pair === null ? null : Number(pair[1]),
    plans: pair === null ? null : Number(pair[2]),
    analysis: analysisNumeric !== null ? Number(analysisNumeric[1]) : analysisWordOne ? 1 : null,
  };
}

/** The basenames that do NOT occur in the index text. */
export function unlistedFiles(basenames, indexText) {
  return basenames.filter((name) => !indexText.includes(name));
}

function main() {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const indexPath = join('docs', 'superpowers', 'INDEX.md');
  const indexText = readFileSync(join(repoRoot, indexPath), 'utf8');

  const specs = trackedBasenames(repoRoot, 'docs/superpowers/specs');
  const plans = trackedBasenames(repoRoot, 'docs/superpowers/plans');
  const analysis = trackedBasenames(repoRoot, 'docs/analysis');

  const findings = [];
  for (const name of unlistedFiles([...specs, ...plans], indexText)) {
    findings.push(`${indexPath}: file-not-indexed: ${name}`);
  }
  const stated = statedCounts(indexText);
  const actual = { specs: specs.length, plans: plans.length, analysis: analysis.length };
  for (const key of ['specs', 'plans', 'analysis']) {
    if (stated[key] === null) {
      findings.push(`${indexPath}: count-absent: no stated count for ${key}`);
    } else if (stated[key] !== actual[key]) {
      findings.push(
        `${indexPath}: count-mismatch: ${key} states ${stated[key]}, tracked files number ${actual[key]}`,
      );
    }
  }

  for (const finding of findings) {
    console.error(finding);
  }
  if (findings.length > 0) process.exit(1);
}

// Run as a script (`node scripts/docs-index-sync.mjs`); importing the module (the test
// does) must not run the gate — the argv check is the cross-platform way to tell.
if (process.argv[1]?.endsWith('docs-index-sync.mjs')) {
  main();
}
```

- [ ] **Step 2: Run the gate and watch it fail against real drift.**

```bash
node scripts/docs-index-sync.mjs; echo "exit=$?"
```
FIRST, stage both 2026-08-22 plan files. The gate reads `git ls-files`, so leaving them untracked would measure it against a knowingly incomplete tree and it would go red the first time anyone staged them:

```bash
git add docs/superpowers/plans/2026-08-22-truth-repairs.md docs/superpowers/plans/2026-08-22-byte-regression-pins.md
```

This repository's convention commits each increment's plan before implementing it (`370e778` and `2deadce` are two post-build-order examples).

Expected then: **exit 1**, with `count-mismatch` lines for `specs`, `plans` and `analysis`, plus `file-not-indexed` lines for TEN basenames — the three post-build-order increments' six spec/plan files, plus this increment's own spec and plan, plus the byte-regression-pins spec and plan. Re-derive the tracked counts from the run rather than trusting any figure written here. This red run is the failing test; record its exact output for Task 5.

- [ ] **Step 3: Write the gate's own test.**

Create `scripts/test/docs-index-sync.test.mjs`:

```js
// docs-index-sync.test.mjs — unit tests for the increment-record drift gate's two pure
// functions. The gate's integration behavior (git ls-files, process.exit) is exercised by
// running it in CI, not here; these cover the parsing and comparison it can get wrong.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { statedCounts, unlistedFiles } from '../docs-index-sync.mjs';

test('statedCounts reads the specs/plans pair', () => {
  const text = '**Counted at write time:** 24 files in `specs/`, 27 in `plans/` — not one-to-one.';
  const counts = statedCounts(text);
  assert.equal(counts.specs, 24);
  assert.equal(counts.plans, 27);
});

test('statedCounts reads a numeric analysis count', () => {
  assert.equal(statedCounts('**`docs/analysis/`** holds 16 files, each').analysis, 16);
});

test('statedCounts reads the word "one" as 1, the pre-repair phrasing', () => {
  assert.equal(statedCounts('**`docs/analysis/`** holds one file,').analysis, 1);
});

test('statedCounts returns null for an absent sentence rather than guessing', () => {
  const counts = statedCounts('no counts here at all');
  assert.equal(counts.specs, null);
  assert.equal(counts.plans, null);
  assert.equal(counts.analysis, null);
});

test('unlistedFiles returns only the basenames absent from the index', () => {
  const index = 'a row naming 2026-01-01-alpha-spec.md and nothing else';
  const missing = unlistedFiles(['2026-01-01-alpha-spec.md', '2026-01-02-beta.md'], index);
  assert.deepEqual(missing, ['2026-01-02-beta.md']);
});

test('unlistedFiles returns an empty array when every basename occurs', () => {
  assert.deepEqual(unlistedFiles(['x.md'], 'mentions x.md once'), []);
});
```

- [ ] **Step 4: Run the new test file.**

```bash
./node_modules/.bin/vitest run scripts/test/docs-index-sync.test.mjs
```
Expected: 6 tests, all passing. If `vitest` does not pick the file up, confirm `vitest.config.ts`'s `record` project includes `scripts/test/**/*.test.mjs` — it does today, and that is why the suite total is 48 + 4 + 2.

- [ ] **Step 5: Repair `INDEX.md` — the counts, the analysis paragraph, and five table rows.**

First, retire the hedge and state live counts. Replace the sentence beginning `**Counted at write time:** 24 files in `specs/`, 27 in `plans/` — not one-to-one.` with a version carrying the measured numbers and no "at write time" qualifier — the count is gated now, so the hedge would be false. Use the numbers `node scripts/docs-index-sync.mjs` reported in Step 2, and keep the existing explanation of why the two directories are not one-to-one.

Second, replace the `**`docs/analysis/`** holds one file,` paragraph. It currently names, links and characterizes a single file. Rewrite it to state the measured count, keep `2026-08-03-step-1-review.md` named and linked as the earliest of them, and say plainly that the directory holds the increment-history artifacts outside the spec/plan pair structure — the phrasing `docs/process/next-phases.md` already uses.

Third, append table rows covering every unlisted file from Step 2's output. The ten basenames pair into **five rows**, one per increment. Use the existing column shape `| Date | Increment | Build-order step served | Spec | Plan |`, and `Post-build-order (no step)` in the third column where no build-order step applies, matching the `2026-08-18` housekeeping row already present. The five: recorded human decline (2026-08-20 spec, 2026-08-21 plan), proposal provenance (2026-08-21), effect-result notarization (2026-08-21), this increment's own pair (2026-08-22), and byte-regression pins (2026-08-22). All ten files are tracked after Step 2's `git add`, so every Spec and Plan cell carries a real link — there is no `no plan yet` cell to write.

**The gate's two parse targets are phrasing-locked**, so rewrite them within the shapes its regexes match, or Step 6 will report `count-absent` and you will debug a script that is working correctly:
- the specs/plans sentence must keep the form `<n> files in \`specs/\`, <n> in \`plans/\``
- the analysis sentence must keep the form `` **`docs/analysis/`** holds <n> files ``

- [ ] **Step 6: Run the gate until it is green.**

```bash
node scripts/docs-index-sync.mjs; echo "exit=$?"
```
Expected: **exit 0, no output.** If a `file-not-indexed` line survives, the basename is missing from the table; if a `count-mismatch` survives, the stated number does not match `git ls-files`. Re-run after each fix.

- [ ] **Step 7: Wire the gate.**

In `package.json`, `"api-sync"` is currently the LAST entry in `scripts` and carries no trailing comma, so add one. Both lines, so the comma is unmissable rather than a JSON parse error found by the next gate:
```json
    "api-sync": "node scripts/api-reference-sync.mjs",
    "docs-index-sync": "node scripts/docs-index-sync.mjs"
```

In BOTH `.github/workflows/ci.yml`'s `checks` job AND `.github/workflows/release.yml`'s gate block (the one under `# Every gate the repository has, then the artifact gates.`), add after each file's own `- run: pnpm api-sync` line:
```yaml
      - run: pnpm docs-index-sync
```

- [ ] **Step 8: Move the seven enumerations an eighth gate falsifies.**

Nothing scans a prose enumeration, so this step is the only defense. All SEVEN, in the same commit:

1. `CONTRIBUTING.md` — the fenced gate list (currently seven lines, `pnpm typecheck` through `pnpm api-sync`). Add: `pnpm docs-index-sync  # every spec/plan file must have a row in the increment record`
2. `CONTRIBUTING.md` — the `scripts/` table row, currently `Repo tooling: the contract scan, the api-reference drift gate, the tarball smoke test — each with its own test where it has logic`. Add the increment-record drift gate to that list.
3. `CLAUDE.md` — the Commands list. Add a `pnpm docs-index-sync` bullet beside `pnpm api-sync`, naming the script and its presence-only bound.
4. `CLAUDE.md` — the CI-description sentence naming the `checks` job's steps (`typecheck, lint, contract-scan, api-sync, lint:strict`). Add the new step.
5. `README.md` — the dev block fence. Add the same line as (1).
6. `docs/process/release-checklist.md` — the single-line gate command (`pnpm typecheck && pnpm test && ... && pnpm api-sync`). Add `&& pnpm docs-index-sync`.
7. `.github/workflows/release.yml` — the gate block under the comment `# Every gate the repository has, then the artifact gates.` Insert `      - run: pnpm docs-index-sync` immediately after that block's `      - run: pnpm api-sync` line. This workflow is dispatch-only and unexercised until the 0.1 cut, which is exactly why it must not be skipped: its own comment asserts completeness, and nothing would catch the lie until release day.

**A second rule, mirroring Task 2 Step 5's classification.** A hit that makes a PRESENT-TENSE claim about what this repository's scans DO — as distinct from enumerating the gate set — must be re-read and either narrowed or left, with the choice recorded in Task 5. Two such hits exist and are decided here:
- `docs/process/next-phases.md` ("no scan reads a prose enumeration or a sealed honesty cell — `pnpm contract-scan` and `pnpm api-sync` are both silent on this class of drift") becomes over-broad the moment `docs-index-sync` lands. **Narrow it** to the class it actually means: SPEC §2 enumerations, the publish-facing docset, §8 registry rows and sealed honesty cells — none of which any scan reads, `docs-index-sync` included.
- `docs/process/implementation-status.md` restates the same sentence as PAST narration of an earlier increment. **Leave it untouched.**

Verify none is missed:
```bash
grep -rn "api-sync" --include=*.md --include=*.yml . | grep -v node_modules | grep -v docs/superpowers/ | grep -v docs/analysis/ | grep -v CHANGELOG.md
```
Every hit that ENUMERATES the gate set must now also name `docs-index-sync`. Hits inside `docs/superpowers/` and `docs/analysis/` are historical records — leave them.

- [ ] **Step 9: Full gates.**

```bash
./node_modules/.bin/tsc --noEmit -p packages/record
./node_modules/.bin/tsc --noEmit -p packages/store-postgres
./node_modules/.bin/biome check .
node scripts/contract-scan.mjs; echo "contract-scan exit=$?"
node scripts/api-reference-sync.mjs; echo "api-sync exit=$?"
node scripts/docs-index-sync.mjs; echo "docs-index-sync exit=$?"
./node_modules/.bin/vitest run
```
Expected: all scans exit 0; vitest now reports **55 files** and 751 + 6 = **757 tests**, 0 failed. Record the exact figures — Task 5 carries them into `CLAUDE.md` and `docs/process/implementation-status.md`.

- [ ] **Step 10: Commit.**

Subject: `Truth repairs 4/5: the increment record gains a gate, five rows, and seven enumerations move with it`

---

### Task 5: The record and the exit

**Files:**
- Modify: `docs/process/implementation-status.md` (a new increment section; the present-tense `54 test files, 751 tests` figures and the `119 files checked` Biome figure at lines 41 and 44 — **NOT** the two commit-pinned `Gate outputs` blocks at lines 1671 and 1831, which are historical and stay byte-identical)
- Modify: `CLAUDE.md` (the same figures in its State paragraph)

**Interfaces:**
- Consumes: the exact vitest figures from Task 4 Step 9.
- Produces: nothing.

- [ ] **Step 1: Update both count sentences, in both files.**

```bash
grep -n "54 test files\|751 tests" CLAUDE.md docs/process/implementation-status.md
```
Expected: one hit in `CLAUDE.md` (line 31) and THREE in `implementation-status.md` (lines 41, 1671, 1831). Classify each exactly as Task 2 Step 5 does, because only TWO of the four move:

- `CLAUDE.md:31` and `implementation-status.md:41` (the `**Measured against the current tree**` bullet) are PRESENT-TENSE claims. Update both to the figures measured in Task 4 Step 9 — each carries a FILE count beside the test count, so move both numbers.
- `implementation-status.md:1671` (`54 test files, 749 tests`) and `:1831` (`54 test files, 751 tests`) sit under `**Gate outputs, as measured against this increment's own exit commit**` headings and are pinned to past commits. **Leave them byte-identical.** Rewriting them would falsify two past increments' recorded exit records — the exact thing Task 2 Step 5 forbids in this same file.

While you are in that bullet: `implementation-status.md:44` carries a `119 files checked` Biome figure in the SAME present-tense bullet. This increment adds two tracked files under `scripts/`, which Biome checks. Re-measure it from the actual `./node_modules/.bin/biome check .` output and move it in the same commit.

- [ ] **Step 2: Write the increment section in `docs/process/implementation-status.md`.**

Follow the existing post-build-order increment sections' shape. It must record: that this increment landed no behavior and moved no maturity marker; the ten rows, each marked repaired or recorded-as-not-reproducing; that row 7 was corrected rather than satisfied, and why; that `governedUnavailable` was not touched and remains live at four call sites; the new gate and its stated bounds — including that `contract-scan` does not read `.mjs`, so the gate script itself is checked by nothing; that seven prose enumerations moved with it and one over-broad present-tense sentence in `next-phases.md` was narrowed; and the new test and Biome figures.

- [ ] **Step 3: Confirm the frozen oracle never moved.**

```bash
git diff HEAD~4 --stat -- packages/record/test/byte-stability.test.ts; echo "empty means untouched"
```
Expected: no output. If this file appears in the diff, STOP — hard rule 4 was violated.

- [ ] **Step 4: Full gates one last time.** The Task 4 Step 9 battery, all green, with the figures matching what Step 1 wrote down.

- [ ] **Step 5: Commit.**

Subject: `Truth repairs 5/5: the record lands the exit — ten rows accounted, the new counts measured`

- [ ] **Step 6: Discharge the explicit-proposal condition.**

`CONTRIBUTING.md` requires that edits to `docs/process/implementation-status.md` be proposed explicitly rather than slipped in, and both design docs carry it as an exit condition. Two tasks edited that file (Task 2's count classification, and this task's increment section plus the present-tense figures).

Write the PR description — or, if no PR is being opened, a note in this final commit's body — that names every `docs/process/` file this increment touched, what changed in each, and why. Name `implementation-status.md` and `next-phases.md` explicitly. This is the exit condition; the increment is not finished without it.

---

## Self-review notes

- **Spec coverage.** Design rows 1–5 → Task 1; rows 6, 8 → Task 2; rows 7, 9 → Task 3; row 10 plus the gate, its bounds, its wiring and the seven enumerations → Task 4; the exit record and the count moves → Task 5. The design's "re-verify before repairing" ruling is Step 1 of Tasks 1, 2 and 3. The "scope bounds, not deferrals" ruling means **no deferral-register row is written by this increment** — if you find yourself wanting one, re-read the design's scope-bounds section first.
- **The one thing most likely to be skipped** is Task 4 Step 8. A gate landing without its enumeration moves would make this increment commit, in its own commit, the defect it was written to close.
- **Test-count arithmetic.** 751 + 6 = 757 assumes the six tests in Step 3's file and no other change. If your gate test has a different number of cases, the expected total moves with it — measure, do not assume.
