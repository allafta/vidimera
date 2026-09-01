# Registry-Facing Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the three registry-facing decisions ratified 2026-09-01 — reword and pin
the unknown-option-key error head, pin `@types/node` to the floor major by its own check,
and add the manifest metadata — before any of them becomes immutable at the 0.1 publish.

**Architecture:** Five tasks on one branch: the rename/reword with its pin across code,
tests, and `CLAUDE.md` (task 1); the ruled sweep of `docs/process/` (task 2); the
`@types/node` check-then-pin with its Dependabot guard (task 3); the manifest metadata
with build + smoke (task 4); exit paperwork (task 5). One adopter-visible string changes;
zero behavior changes.

**Tech Stack:** TypeScript (strict), vitest, pnpm (verified working 2026-09-01 at
11.18.0), Biome, the repo's gate scripts.

**Spec:** `docs/superpowers/specs/2026-09-01-registry-hygiene-design.md` — read it first;
its three "Rulings taken", its SPEC-§9.1 posture paragraph, and its STOP envelope bind
every task here.

## Global Constraints

- **Branch:** all work on a `registry-hygiene` branch off `main`. Before EVERY commit run
  `git branch --show-current` and confirm it prints `registry-hygiene`.
- **Commits:** message via a bash-heredoc temp file — NO UTF-8 BOM (a PowerShell-written
  msg file leaked one into a subject this week) — then `git commit -F <file>`, ending
  with the exact line `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **Runner:** pnpm works on this machine as of 2026-09-01 (`pnpm --version` → 11.18.0);
  verify that first, and if it fails use the local binaries
  (`./node_modules/.bin/vitest`, `./node_modules/.bin/tsc`, `./node_modules/.bin/biome`,
  `node scripts/*.mjs`). Task 3's `pnpm install` REQUIRES working pnpm.
- **The tier word vs the head:** bare `GOVERNED` is ALSO the concept's control-tier
  vocabulary (`docs/concept/CONTROLS.md`) and the guard era's name — those uses STAY
  everywhere. Only the helper NAME `governedUnavailable` and the message head
  `GOVERNED feature not available in this build` move. The spec's sweep recipe greps for
  exactly those two patterns and nothing broader.
- **STOP, absolute (from the spec):** `docs/concept/**`, `docs/guide/**`,
  `docs/process/deferral-register.md`, `docs/process/release-checklist.md`,
  `.github/workflows/**`, `packages/record/test/byte-stability.test.ts`, every existing
  `PINNED_` literal. Any behavior change anywhere is a STOP — the four seams keep the
  same throws, keys, and tails.
- **`docs/process/implementation-status.md`:** table rows are single physical lines — no
  newlines introduced; commit-pinned gate blocks untouchable; past-tense increment
  accounts stay verbatim (task 2's whole point).
- **contract-scan traps:** no bare `slice`, no bare `design` (except "by design"), no
  foreign labels, no abbreviated commit refs in edited `.ts` comments; `SPEC §9.1`
  citations must keep any attached double-quoted phrase verbatim from the spec or drop
  the quotation. No literal external URLs in any edited/added MARKDOWN (the manifests are
  JSON — URLs are fine there).
- Line references were verified against `main = fc9b037` on 2026-09-01 — locate every
  edit by its quoted text, not the number.

---

### Task 1: The rename and reword — `governedUnavailable` → `unknownOptionKey`, pinned

**Files:**
- Modify: `packages/record/src/config.ts` (helper ~:97-121, count comment ~:600-609)
- Modify: `packages/record/src/kernel/open.ts` (import ~:22, comment ~:48, call ~:57)
- Modify: `packages/record/src/kernel/finalize.ts` (import ~:107, `finalizeOptionMessage` ~:153-159)
- Modify: `packages/record/src/kernel/decline.ts` (import ~:22, call ~:57)
- Modify: `packages/record/src/kernel/redeem.ts` (import ~:82, call ~:321)
- Modify: `packages/record/test/construction-validation.test.ts` (header ~:1-8, negatives ~:83, ~:378)
- Modify: `packages/record/test/decline.test.ts` (~:150 — the positive head pin)
- Modify: `CLAUDE.md` (two identical parentheticals, ~:34 and ~:240)

**Interfaces:**
- Produces: `unknownOptionKey(field: string, contract: string): string` in
  `packages/record/src/config.ts`, returning
  `` `unknown option key (${field}) — ${contract}` `` — internal, NOT exported from
  `index.ts`. Tasks 2 and 5 reference the rename by this exact name.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b registry-hygiene
```

- [ ] **Step 2: The positive pin FIRST (TDD red).** In
`packages/record/test/decline.test.ts`, in the test
`'decline: unknown option keys throw — policy is deliberately not accepted'`, replace the
regex line:

```ts
    /decline\(\) accepts only consultations/,
```

with:

```ts
    /^unknown option key \(policy\) — decline\(\) accepts only consultations/,
```

- [ ] **Step 3: Run it — expect FAIL** (the head is still the GOVERNED one):

```bash
pnpm vitest run packages/record/test/decline.test.ts 2>/dev/null || ./node_modules/.bin/vitest run packages/record/test/decline.test.ts
```
Expected: that one test FAILS with the actual message showing the old
`GOVERNED feature not available in this build (policy)` head. Capture this output — it is
the pin's firing proof.

- [ ] **Step 4: The helper.** In `packages/record/src/config.ts`, replace the whole
doc-comment-plus-function block — from the line `/**` above
`* The exact GOVERNED throw message (§9.1: …` down through the function's closing `}` —
with:

```ts
/**
 * The message for a genuinely unknown options-bag key — a caller/config error, never a
 * domain refusal. `field` is the unknown key; the caller-supplied `contract` is the
 * appended tail: the seam's accepted keys, and the SPEC section(s) that made them real.
 * Four call sites today: `kernel/open.ts`'s options loop, `kernel/finalize.ts`'s
 * `finalizeOptionMessage`, `kernel/decline.ts`'s intake, and `kernel/redeem.ts`'s shared
 * `validateRedeemOptions` serving all three redemption seams
 * (`redeem()`/`beginRedemption()`/`completeRedemption()`). This count is stated once more
 * above `validateProfile`; the two must not diverge again.
 *
 * HISTORY: until the registry-hygiene increment (2026-09-01) this helper was
 * `governedUnavailable`, minting the feature-guard era's head — GOVERNED feature not
 * available in this build (<field>) — per SPEC §9.1's fail-fast rule for unimplemented
 * capabilities. That era closed with zero governed fields remaining; the four surviving
 * callers were never guards, and the old head was recorded as unpinned prose, so the
 * rename broke no gate. §9.1 binds GUARDS: if a governed field ever returns, its guard
 * mints its own §9.1-shaped message at its own site. The NEW head IS pinned
 * (decline.test.ts's unknown-option test), so rewording it again is a test-visible act.
 */
export function unknownOptionKey(field: string, contract: string): string {
  return `unknown option key (${field}) — ${contract}`;
}
```

- [ ] **Step 5: The count comment.** In the same file's `validateProfile` doc comment,
replace:

```
 * closes here — every guard that era installed has now lifted behind its own behavior,
 * each in the same commit as that behavior. `governedUnavailable` (above) SURVIVES this
 * lift: it is not itself a per-field guard, and it still serves the generic
```

with:

```
 * closes here — every guard that era installed has now lifted behind its own behavior,
 * each in the same commit as that behavior. `unknownOptionKey` (above; named
 * `governedUnavailable` until the registry-hygiene increment renamed it with its head)
 * SURVIVES this lift: it is not itself a per-field guard, and it still serves the generic
```

and, a few lines below in the same comment, replace
`This count is stated once above `governedUnavailable` itself; the two must not diverge again.`
with
`This count is stated once above `unknownOptionKey` itself; the two must not diverge again.`

- [ ] **Step 6: The four callers, mechanically.** In each of
`kernel/open.ts`, `kernel/finalize.ts`, `kernel/decline.ts`, `kernel/redeem.ts`: change
the import `governedUnavailable` → `unknownOptionKey` and the call site(s) likewise. The
tails (every `contract` argument string) stay byte-identical. In `open.ts` also replace
the comment line:

```
  // unknown key and throws GOVERNED (config.ts's `governedUnavailable`) — a
```

with:

```
  // unknown key and throws (config.ts's `unknownOptionKey`) — a
```

- [ ] **Step 7: The two negatives and the header.** In
`packages/record/test/construction-validation.test.ts`, both occurrences (~:83, ~:378):

```ts
      assert.doesNotMatch(
        err.message,
        /GOVERNED feature not available/,
        'a structural error must NOT be the GOVERNED string',
      );
```

become:

```ts
      assert.doesNotMatch(
        err.message,
        /unknown option key/,
        'a structural error must NOT be the unknown-option-key string',
      );
```

(one occurrence is indented two spaces deeper — preserve each site's indentation). And in
the file header, replace lines 3–4:

```
// build once guarded with a GOVERNED throw —
//   "GOVERNED feature not available in this build (<field>)"
```

with:

```
// build once guarded with a GOVERNED throw (the guard-era head, reworded to the
// unknown-option-key head at the registry-hygiene increment, 2026-09-01)
```

RULING, recorded here and in the account: the header's quoted old head is history and
could stay true, but it would keep the literal phrase greppable in `packages/` forever
and defeat the spec's strict-empty sweep; the history survives descriptively, and the
old head's verbatim text lives on in `implementation-status.md`'s guard-era accounts.

- [ ] **Step 8: `CLAUDE.md` — two identical parentheticals** (~:34 and ~:240). Replace
BOTH occurrences of:

```
(`governedUnavailable` survives only for four generic unknown-option-key throw sites, in
```

with:

```
(`unknownOptionKey` — named `governedUnavailable` until the registry-hygiene increment —
survives only for four generic unknown-option-key throw sites, in
```

The other four bare `GOVERNED` words in `CLAUDE.md` (~:18, :22, :32, :238) are tier/era
vocabulary and STAY.

- [ ] **Step 9: Run the pin (green now) and the record suite**

```bash
./node_modules/.bin/vitest run packages/record
```
Expected: all green, the upgraded decline pin included. If ANY other test fails on the
message change, that is an unnoticed positive match on the old head — STOP and report it
(the spec says none exists; a failure falsifies that).

- [ ] **Step 10: The sweep recipe, first grep — must be EMPTY:**

```bash
git grep -n "governedUnavailable\|GOVERNED feature not available" -- packages/ CLAUDE.md
```

- [ ] **Step 11: Gates + commit**

```bash
./node_modules/.bin/tsc -p packages/record --noEmit && ./node_modules/.bin/tsc -p packages/store-postgres --noEmit
./node_modules/.bin/biome check --error-on-warnings .
node scripts/contract-scan.mjs && node scripts/api-reference-sync.mjs
git branch --show-current && git add -A && git commit -F <msgfile>   # subject: "Registry hygiene 1/5: the unknown-option-key head — reworded, renamed, and pinned"
```
`api-sync` proves the rename touched no public surface.

---

### Task 2: The `docs/process/` ruled sweep

**Files:**
- Modify: `docs/process/implementation-status.md` (ONE annotation)
- Modify: `docs/process/open-items-plan.md` (ONE rename)
- Everything else the grep hits: ruled STAYS, recorded, unedited.

**Interfaces:**
- Consumes: task 1's rename (`unknownOptionKey`) and its increment name
  ("the registry-hygiene increment").
- Produces: the per-hit ruling table task 5 folds into the account.

- [ ] **Step 1: Run the recipe's second grep and list every hit**

```bash
git grep -n "governedUnavailable\|GOVERNED feature not available" -- docs/process/
```
Expected 14 hits (as pre-classified below — re-verify each in context; if the grep finds
a hit this table does not carry, classify it by the same policy and add it to the table):

| Site | Pre-classification |
|---|---|
| `adopted-source-provenance.md` (4 hits, ~:637-672) | STAYS — a dated provenance record of the kernel as it arrived; "today" in it means that record's date |
| `implementation-status.md` ~:173 (step-8 table row) | STAYS — past-tense narration of that step's exit (verify in context) |
| `implementation-status.md` ~:414 (§9 row) | STAYS — narrates the recovery increment's commit and the state at that moment |
| `implementation-status.md` ~:815 | EDIT — the guard-era exit record's "SURVIVES this exit" sentence is the one readers consult for the helper's fate; annotate (step 2) |
| `implementation-status.md` ~:1737 | STAYS — quotes the tail (unchanged text) while narrating a past increment |
| `implementation-status.md` ~:1866-1867 | STAYS — historical account of a past count correction |
| `implementation-status.md` ~:2087-2091 | STAYS — same correction's account ("was not touched" — true of that increment) |
| `open-items-plan.md` ~:312 | EDIT — a live planning document speaking in present tense (step 3) |

- [ ] **Step 2: The `implementation-status.md` annotation.** Locate the sentence
containing `` `governedUnavailable` (`config.ts`) SURVIVES this exit `` (~:815) and insert
immediately after the word `exit`:
` (and was later renamed `unknownOptionKey`, its head reworded, at the registry-hygiene increment, 2026-09-01)`
— keeping the line-wrapping style of the surrounding prose (this region is wrapped prose,
not a table row).

- [ ] **Step 3: The `open-items-plan.md` rename.** Locate the text
`the four surviving `governedUnavailable` throws (permanent unknown-option-key caller`
(~:312) and replace `` `governedUnavailable` `` with
`` `unknownOptionKey` (`governedUnavailable` until 2026-09-01) `` — the rest of the
sentence stays.

- [ ] **Step 4: Gates + commit**

```bash
node scripts/contract-scan.mjs && node scripts/docs-index-sync.mjs
git branch --show-current && git add -A && git commit -F <msgfile>   # subject: "Registry hygiene 2/5: the docs sweep — two present-tense renames, twelve historical hits ruled to stand"
```
Write the final per-hit table (with your verified classifications) into your report —
task 5's account needs it verbatim.

---

### Task 3: `@types/node` — the check, then the pin or the recorded fallback

**Files:**
- Modify: `package.json` (root, `"@types/node": "^26.2.0"` → `"^22"`), `pnpm-lock.yaml`
  (regenerated), `.github/dependabot.yml` (ignore rule) — ALL THREE ONLY IF the check
  passes; NOTHING if it fails (the fallback is recorded in task 5's account, not here).

**Interfaces:**
- Produces: the check's measured outcome (resolved `@types/node` version + typecheck
  result) — task 5's account states it either way.

- [ ] **Step 1: The check the ruling was made pending.** Edit root `package.json`:
`"@types/node": "^26.2.0"` → `"@types/node": "^22"`. Then:

```bash
pnpm install
node -e "console.log(require('./node_modules/@types/node/package.json').version)"
./node_modules/.bin/tsc -p packages/record --noEmit && ./node_modules/.bin/tsc -p packages/store-postgres --noEmit
```
Record the resolved version and the full typecheck result. The typecheck REACHES the
tests (`packages/record/tsconfig.json` includes `test/`), so the `node:sqlite` surface
the suite uses (`DatabaseSync`, `exec`, `prepare`, `isTransaction`) is checked — that is
the suspect surface the spec names.

- [ ] **Step 2a — check PASSES (both tsc runs clean):** add the Dependabot guard so the
weekly npm group cannot bump the pin back. In `.github/dependabot.yml`, under the npm
update entry (after its `groups:` block, same indentation level as `groups:`):

```yaml
    ignore:
      # The @types/node major is pinned to the engines floor's major line (the
      # registry-hygiene increment's ruling 2): a types major above the floor would let
      # post-floor APIs typecheck. Minors/patches still flow weekly.
      - dependency-name: "@types/node"
        update-types: ["version-update:semver-major"]
```

Then run one record-package test file as a sanity signal (types are compile-time only;
typecheck is the real gate):

```bash
./node_modules/.bin/vitest run packages/record/test/sqlite-store.test.ts
```

- [ ] **Step 2b — check FAILS (missing typings the floor's own APIs need):** revert the
`package.json` edit and the lockfile (`git checkout -- package.json pnpm-lock.yaml`),
touch nothing else, and record in your report the EXACT tsc errors — task 5's account
records the fallback: `^26` stays and the exact-floor CI leg (ubuntu @ 22.16.0) is the
deliberate gate. Do not partially pin (no `~22.x`, no resolutions) — the spec decided
two exits only.

- [ ] **Step 3: Gates + commit** (whichever exit):

```bash
node scripts/contract-scan.mjs && ./node_modules/.bin/biome check --error-on-warnings .
git branch --show-current && git add -A && git commit -F <msgfile>
# subject if 2a: "Registry hygiene 3/5: @types/node pinned to the floor major — checked, landed, Dependabot-guarded"
# subject if 2b: "Registry hygiene 3/5: @types/node pin checked and declined — the exact-floor CI leg stays the gate" (commit carries only the report's evidence via the account later; if NOTHING changed, skip the commit and say so in the report)
```

---

### Task 4: Manifest metadata, proven by build + smoke

**Files:**
- Modify: `packages/record/package.json`, `packages/store-postgres/package.json`

**Interfaces:**
- Consumes: each manifest's own `repository.url` — a `git+`-prefixed https URL ending in
  `.git`; derive the https base by stripping that prefix and suffix. The derived values
  are written LITERALLY into the JSON (JSON is not contract-scanned); only this plan and
  the spec avoid writing them out.

- [ ] **Step 1: `packages/record/package.json`** — insert after the `"author"` field:

```json
"homepage": "[repository https base]/tree/main/packages/record#readme",
"bugs": { "url": "[repository https base]/issues" },
"keywords": [
  "decision-records",
  "confirmation",
  "hash-chain",
  "append-only",
  "tamper-evident",
  "audit",
  "human-in-the-loop"
],
```

with `[repository https base]` replaced by the derived base. Field order after insert:
name, version, private, type, description, license, author, homepage, bugs, keywords,
repository, … (keep the file's 2-space JSON style; no trailing commas).

- [ ] **Step 2: `packages/store-postgres/package.json`** — same insertion point:

```json
"homepage": "[repository https base]/tree/main/packages/store-postgres#readme",
"bugs": { "url": "[repository https base]/issues" },
"keywords": [
  "vidimera",
  "postgres",
  "postgresql",
  "store-adapter",
  "decision-records"
],
```

`publishConfig` is NOT added — the spec's ruling 3 records the omission as deliberate
(`release.yml` passes `--access public` on the command line; one copy of that fact).

- [ ] **Step 3: Build and smoke — the gate these manifests exist for:**

```bash
./node_modules/.bin/tsc -p packages/record/tsconfig.build.json && ./node_modules/.bin/tsc -p packages/store-postgres/tsconfig.build.json
node scripts/smoke-pack.mjs
```
Expected: `smoke: OK`, exit 0. Smoke packs both tarballs from these manifests and
consumer-tests them — a malformed field fails HERE, before the cut. Any failure: STOP,
report the output.

- [ ] **Step 4: Commit** (subject: `Registry hygiene 4/5: homepage, bugs, and keywords in
both manifests — publishConfig omitted deliberately, smoke green over the new shapes`).

---

### Task 5: Exit — full gates, CHANGELOG, the account

**Files:**
- Modify: `CHANGELOG.md` (`[Unreleased]`), `docs/process/implementation-status.md` (new
  increment account section, shaped like its neighbors — read the "Truth restoration"
  section as the freshest model)

- [ ] **Step 1: The full gate set, in order, totals captured from the actual output:**

```bash
./node_modules/.bin/tsc -p packages/record --noEmit && ./node_modules/.bin/tsc -p packages/store-postgres --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/biome check --error-on-warnings .
node scripts/contract-scan.mjs
node scripts/api-reference-sync.mjs
node scripts/docs-index-sync.mjs
./node_modules/.bin/tsc -p packages/record/tsconfig.build.json && ./node_modules/.bin/tsc -p packages/store-postgres/tsconfig.build.json
node scripts/smoke-pack.mjs
```
All green, build and smoke INCLUDED (the spec names them; the truth-restoration increment
was caught omitting them). Test totals go into the account as measured — the suite should
still be 67 files / 832 tests (this increment adds no tests, it upgrades three
assertions); if the totals moved, find out why before writing them down.

- [ ] **Step 2: Re-run both sweep-recipe greps** (task 1 step 10's must still be empty;
task 2 step 1's hits must match the ruled table).

- [ ] **Step 3: CHANGELOG entry** under `## [Unreleased]` → `### Changed` (create the
subsection if the file lacks it, matching its heading style; this is a Changed, not a
Fixed — an adopter-visible string moved):

```markdown
- **The unknown-option-key error head** (2026-09-01, the registry-hygiene increment): an
  unknown options-bag key at `open()`, `finalize()`, `decline()`, or any redemption seam
  now throws `unknown option key (<key>) — <the seam's accepted keys>` where it threw the
  feature-guard era's `GOVERNED feature not available in this build (<key>)`. The guard
  era closed with zero governed fields; the old head named a mechanism the tree no longer
  has, was recorded as unpinned prose, and this was the last release before it became a
  string adopters match on. The new head IS pinned. Each seam's tail is unchanged.
- **Manifest metadata** (same increment): both packages gain `homepage`, `bugs`, and
  `keywords` so the 0.1 registry pages render links and are keyword-findable;
  `publishConfig` deliberately omitted (the release workflow passes `--access public`
  itself). `@types/node` [pinned to the floor major with a Dependabot major-ignore
  guard / left at ^26 with the exact-floor CI leg recorded as the deliberate gate —
  write whichever exit task 3 measured].
```

- [ ] **Step 4: The account section** in `implementation-status.md`, covering: the spec
path; the three rulings and their §9.1 posture (rewording is not a fork — the rule binds
guards, zero remain, a returning guard mints its own message); the rename's full site
list; the pin (decline.test.ts) and the two updated negatives, plus the header ruling
from task 1 step 7; task 2's per-hit table verbatim; task 3's measured exit (resolved
version + typecheck result, whichever branch); the manifest fields added and the
publishConfig omission; the measured gate outputs including build and smoke. House voice:
every claim with its limit (the `^22` pin narrows the types-vs-floor gap, it does not
close it — an API added within the 22 line after 22.16 still typechecks; the exact-floor
CI leg remains the runtime gate).

- [ ] **Step 5: Final gate re-run on the docs** (`node scripts/contract-scan.mjs`,
`node scripts/docs-index-sync.mjs`), then commit (subject: `Registry hygiene 5/5: exit —
gates green through smoke, CHANGELOG and the account landed`).

- [ ] **Step 6: Merge decision** — superpowers:finishing-a-development-branch (the
controller's, not the implementer's). Do not push.

---

## Self-review notes (already applied)

- Spec coverage: ruling 1 → tasks 1–2; ruling 2 → task 3; ruling 3 → task 4; exit → task
  5. The spec's "header mention … updated" is refined by task 1 step 7's recorded ruling
  (history kept, greppable literal dropped) — flag it to the account rather than silently
  narrowing.
- The pin is TDD-shaped (red in step 3 against the old head, green in step 9 after the
  rename) — its firing proof is the red run itself.
- CLAUDE.md's four bare-`GOVERNED` tier/era words stay; only the two helper parentheticals
  move — verified against the actual file 2026-09-01 (hits at :18, :22, :32, :238 are
  vocabulary; :34 and :240 are the helper).
- Type consistency: `unknownOptionKey(field: string, contract: string): string` is the
  single name used in tasks 1, 2, and 5.
