# Parked Truths Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four items the truth-restoration and registry-hygiene final reviews
parked — one adopter-visible error-string split (pinned), five vocabulary repairs, one
measured-sentence refresh, and one report-vocabulary assertion.

**Architecture:** Four tasks on one branch: the `beginRedemption` tail split with its two
pins (task 1); the `construction-validation.test.ts` vocabulary sweep with its 21-hit
table (task 2); the `verifySignatures().orphans` assertion (task 3); the `CLAUDE.md`
measured sentence plus exit paperwork (task 4). One src string changes; zero behavior
changes.

**Tech Stack:** TypeScript (strict), vitest, Biome, the repo's gate scripts, pnpm
(working at 11.18.0 as of 2026-09-01).

**Spec:** `docs/superpowers/specs/2026-09-02-parked-truths-design.md` — read it first;
its four rulings and STOP envelope bind every task.

## Global Constraints

- **Branch:** all work on a `parked-truths` branch off `main`. Before EVERY commit run
  `git branch --show-current` and confirm it prints `parked-truths`.
- **Commits:** message via a bash-heredoc temp file (no UTF-8 BOM) + `git commit -F
  <file>`, ending with the exact line
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **Runner:** prefer the local binaries (`./node_modules/.bin/vitest`,
  `./node_modules/.bin/tsc`, `./node_modules/.bin/biome`, `node scripts/*.mjs`); pnpm
  works if needed.
- **Behavior invariance:** `validateRedeemOptions`'s key loop, admitted keys, throw
  sites, and the dedicated issuance-refusal message are all unchanged — only the
  unknown-key TAIL becomes seam-dependent. Any other `packages/*/src/` edit is a STOP.
- **The vocabulary rule (spec ruling 3):** bare `GOVERNED` in past-tense narration (the
  INVERTED records, header history, the `:102` era banner) STAYS; present-tense
  descriptions of the current thrown string move to unknown-option-key vocabulary.
- **Run biome in every task that edits a file** — the registry-hygiene increment lost a
  fix round to a task that skipped it.
- **STOP, absolute:** `docs/concept/**`, `docs/guide/**`,
  `docs/process/deferral-register.md`, `docs/process/release-checklist.md`,
  `.github/**`, both manifests, `packages/record/test/byte-stability.test.ts`, every
  existing `PINNED_` literal.
- **Measured figures are measured, never copied** — the suite total moves with task 1's
  own pin (expect 67 files / 833 tests at exit, but write what the run prints).
- Line references verified against `main = e5f04b4` on 2026-09-02 — locate every edit by
  its quoted text, not the number.

---

### Task 1: Item C — the `beginRedemption` tail split, pinned twice

**Files:**
- Modify: `packages/record/src/kernel/redeem.ts` (~:318-325, `validateRedeemOptions`'s
  throw)
- Test: `packages/record/test/redeem-token.test.ts` (one new test)

**Interfaces:**
- Produces: the seam-split tails task 4's CHANGELOG entry quotes —
  `beginRedemption() accepts only tx in this build — a result is refused at issuance and
  belongs to completeRedemption (SPEC §11.2). Contract: §11.2, §12.` for
  `beginRedemption`; the existing
  `` `${seam}() accepts only tx and result in this build. Contract: §11.2, §12.` `` for
  the other two seams.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b parked-truths
```

- [ ] **Step 2: Write the pin FIRST (TDD red).** Append to
`packages/record/test/redeem-token.test.ts` (fixtures `confirmedEffectRecord` and const
`CONTENT` are file-local; `assert` is imported):

```ts
test('beginRedemption: an unknown option key gets the seam-true tail, and a PRESENT result gets the dedicated issuance refusal — never the unknown-key message', async () => {
  const { recordId, handles } = await (async () => {
    const r = await confirmedEffectRecord();
    return { recordId: r.recordId, handles: r.handles };
  })();

  // The unknown-key message, seam-true: issuance honors tx alone.
  await assert.rejects(
    () => handles.operator.beginRedemption(recordId, CONTENT, { nope: 1 } as never),
    /^Error: unknown option key \(nope\) — beginRedemption\(\) accepts only tx in this build/,
  );

  // A present result is a DIFFERENT refusal — the dedicated issuance message, which the
  // tail points toward; the unknown-key head must not appear.
  await assert.rejects(
    () =>
      handles.operator.beginRedemption(recordId, CONTENT, {
        result: { digest: `sha256:${'a'.repeat(64)}` },
      } as never),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /not admitted at issuance/);
      assert.doesNotMatch(err.message, /unknown option key/);
      return true;
    },
  );
});
```

If `confirmedEffectRecord()` returns a shape without `handles` (check its definition at
~:40 — it may return `{ handles, recordId, … }` directly), simplify the destructure to
match; the two rejects are the substance.

- [ ] **Step 3: Run it — expect the FIRST reject to FAIL** (the current tail says
"accepts only tx and result"); capture the failing output — it is the pin's firing proof.
The second reject should already pass (the dedicated message exists).

```bash
./node_modules/.bin/vitest run packages/record/test/redeem-token.test.ts
```

- [ ] **Step 4: The split.** In `packages/record/src/kernel/redeem.ts`, replace:

```ts
    throw new Error(
      unknownOptionKey(
        key,
        `${seam}() accepts only tx and result in this build. Contract: §11.2, §12.`,
      ),
    );
```

with:

```ts
    throw new Error(
      unknownOptionKey(
        key,
        seam === 'beginRedemption'
          ? 'beginRedemption() accepts only tx in this build — a result is refused at ' +
              'issuance and belongs to completeRedemption (SPEC §11.2). Contract: §11.2, §12.'
          : `${seam}() accepts only tx and result in this build. Contract: §11.2, §12.`,
      ),
    );
```

The doc comment above `validateRedeemOptions` already states the issuance-arity truth and
does not change.

- [ ] **Step 5: Green + no collateral.** Run the file (new test passes), then the two
files that pin the sibling tails, then the record suite:

```bash
./node_modules/.bin/vitest run packages/record/test/redeem-token.test.ts packages/record/test/effect-result.test.ts
./node_modules/.bin/vitest run packages/record
```
Expected: all green — `effect-result.test.ts`'s `/accepts only tx and result/i` pin
drives `redeem()`, which is unchanged. Any other failure is a STOP (an unnoticed match
on the old shared tail at the beginRedemption seam).

- [ ] **Step 6: Gates + commit**

```bash
./node_modules/.bin/tsc -p packages/record --noEmit && ./node_modules/.bin/tsc -p packages/store-postgres --noEmit
./node_modules/.bin/biome check --error-on-warnings .
node scripts/contract-scan.mjs
git branch --show-current && git add -A && git commit -F <msgfile>   # subject: "Parked truths 1/4: the beginRedemption tail split — issuance's unknown-key sentence now exactly true, pinned both sides"
```

---

### Task 2: Item A — the vocabulary sweep in `construction-validation.test.ts`

**Files:**
- Modify: `packages/record/test/construction-validation.test.ts` (five sites; comments,
  one docstring, one banner, one test title — zero assertion logic)

**Interfaces:**
- Produces: the per-hit table task 4's account folds in.

- [ ] **Step 1: The five edits, verbatim.** Locate each by its quoted text:

(1) ~:15 — replace:
```
// Structural rejections still throw a DIFFERENT (non-GOVERNED) error: at least one leg
```
with:
```
// Structural rejections still throw a DIFFERENT error (never the unknown-option-key
// string): at least one leg
```
(rewrap the sentence's continuation lines to the file's band as needed — content
byte-identical modulo the replacement and breaks).

(2) ~:23 — replace:
```
// alongside the generic unknown-key GOVERNED throw that SURVIVES this file's own
```
with:
```
// alongside the generic unknown-key throw (its GOVERNED head reworded at the
// registry-hygiene increment) that SURVIVES this file's own
```

(3) ~:75 — replace:
```
/** Assert `create` throws a STRUCTURAL error (NOT the GOVERNED string) matching `re`. */
```
with:
```
/** Assert `create` throws a STRUCTURAL error (NOT the unknown-option-key string) matching `re`. */
```

(4) ~:636 — replace:
```
// === structural rejections (a DIFFERENT error, not the GOVERNED string) ================
```
with:
```
// === structural rejections (a DIFFERENT error, not the unknown-option-key string) ======
```
(keep the banner's total width by trimming trailing `=`).

(5) ~:638 — in the test title, replace `(NOT the GOVERNED string)` with
`(NOT the unknown-option-key string)`.

- [ ] **Step 2: The per-hit table.** Run
`grep -n "GOVERNED" packages/record/test/construction-validation.test.ts` and write a
table of EVERY hit into your report: the five edited sites marked MOVED, and each
remaining hit classified past-tense-stays with its anchor (header history ~:3-8, :19's
lifted-guard narration, the `:102` era banner, and the INVERTED-at-increment records at
~:105, :142, :146, :169, :219, :242, :293, :329, :450, :483, :509 — verify each in
context; if any hit reads present-tense about the CURRENT string, that is a finding to
report, not to silently edit).

- [ ] **Step 3: Run the file, gates, commit**

```bash
./node_modules/.bin/vitest run packages/record/test/construction-validation.test.ts
node scripts/contract-scan.mjs && ./node_modules/.bin/biome check --error-on-warnings .
git branch --show-current && git add -A && git commit -F <msgfile>   # subject: "Parked truths 2/4: construction-validation speaks of the current throw in current vocabulary — five sites moved, sixteen ruled to stand"
```
(All tests must pass unchanged — a title change alters no behavior.)

---

### Task 3: Item D — the orphans assertion in the key-retirement pin

**Files:**
- Test: `packages/record/test/no-edge-containment.test.ts` (two lines inside the
  existing key-retirement BASELINE test's loop)

**Interfaces:**
- Consumes: the test `'BASELINE — key retirement: …'` with its `rig` (from
  `countingSigningSetup()`) and per-call loop;
  `rig.handles.operator.verifySignatures(recordId): Promise<SignatureReport>` with
  `orphans: Digest[]`.

- [ ] **Step 1: Insert the assertion.** In the key-retirement test's `for` loop, after
the existing sidecar-growth `assert.equal`, add:

```ts
    const report = await rig.handles.operator.verifySignatures(recordId);
    assert.equal(report.orphans.length, call, 'the report names each minted orphan');
```

(`rig.handles` — the full-registry instance — so this is the operator's ordinary audit
read; orphans are chain-vs-sidecar derived and verifier-independent either way. The
existing `listByRecord` growth assertions stay: the two counts agreeing is the point.)

- [ ] **Step 2: Run — expect PASS; then fire-check** (temporarily assert
`report.orphans.length, call - 1`, watch call 1 FAIL, revert; include the failing output
in your report):

```bash
./node_modules/.bin/vitest run packages/record/test/no-edge-containment.test.ts
```

- [ ] **Step 3: Gates + commit**

```bash
node scripts/contract-scan.mjs && ./node_modules/.bin/biome check --error-on-warnings .
git branch --show-current && git add -A && git commit -F <msgfile>   # subject: "Parked truths 3/4: the key-retirement pin counts orphans in the register's own vocabulary — reporting only, row 22a unmoved"
```

---

### Task 4: Item B + exit — the measured sentence, CHANGELOG, the account

**Files:**
- Modify: `CLAUDE.md` (the measured-claims sentence only), `CHANGELOG.md`
  (`[Unreleased]`), `docs/process/implementation-status.md` (one new account section,
  modeled on the file's freshest post-build-order neighbors)

- [ ] **Step 1: Full gate set, totals captured from the actual output:**

```bash
./node_modules/.bin/tsc -p packages/record --noEmit && ./node_modules/.bin/tsc -p packages/store-postgres --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/biome check --error-on-warnings .
node scripts/contract-scan.mjs && node scripts/api-reference-sync.mjs && node scripts/docs-index-sync.mjs
./node_modules/.bin/tsc -p packages/record/tsconfig.build.json && ./node_modules/.bin/tsc -p packages/store-postgres/tsconfig.build.json
node scripts/smoke-pack.mjs
```
All green, build and smoke included (item C ships in `dist/*.js`). Also measure the
refusal-code count from the registry itself:

```bash
awk '/^export const REGISTRY/,/^};/' packages/record/src/refusal-codes.ts | grep -c "':"
```
Cross-check the number against the `RefusalCode` union arms in the same file; if the two
disagree, STOP and report.

- [ ] **Step 2: `CLAUDE.md` — the measured sentence.** Replace the figures in:

```
tree: `pnpm test` — 67 test files, 821 tests, zero skips; `packages/record/src/refusal-codes.ts`
carries 24 refusal codes;
```

with the values step 1 measured (expected 67 files / 833 tests and whatever the registry
count came to — write what was printed, not these expectations). Nothing else in the
sentence or file moves.

- [ ] **Step 3: CHANGELOG** under `## [Unreleased]` — item C under `### Changed` (beside
the registry-hygiene head entry), items A/B/D under `### Fixed`, in the file's own list
voice:

```markdown
- **`beginRedemption`'s unknown-option-key tail** (2026-09-02, the parked-truths
  increment): an unknown key at issuance now says `beginRedemption() accepts only tx in
  this build — a result is refused at issuance and belongs to completeRedemption (SPEC
  §11.2)` where it shared the family-wide "accepts only tx and result" sentence —
  issuance never accepted a result (the dedicated refusal for a present one is
  unchanged), and this was the one seam whose unknown-key sentence needed a charitable
  reading. Pinned on both sides: the new tail, and that a present result still gets the
  dedicated message, never the unknown-key one.
```

and:

```markdown
- **Parked truths** (2026-09-02): `construction-validation.test.ts` stopped describing
  the current unknown-option-key throw in the guard era's vocabulary (five present-tense
  sites; the sixteen past-tense guard-era records stand); `CLAUDE.md`'s measured sentence
  re-measured; the key-retirement orphan pin now also counts
  `verifySignatures().orphans` — the register's own vocabulary, reporting only, row 22a
  unchanged.
```

- [ ] **Step 4: The account section** in `implementation-status.md`: the four items with
their parking provenance (both 2026-09-01 final reviews; the spec as the durable record
of the parkings, the session ledgers being deleted per that process's discipline), the
per-hit table from task 2's report, the pinned strings from task 1, the measured figures
from step 1, and the plain statement that no register row, checklist box, or marker
moved. House voice; prose wrapped to the local band; single-line rows stay single-line;
commit-pinned gate blocks untouched.

- [ ] **Step 5: Docs gates re-run + commit**

```bash
node scripts/contract-scan.mjs && node scripts/docs-index-sync.mjs
git branch --show-current && git add -A && git commit -F <msgfile>   # subject: "Parked truths 4/4: exit — the measured sentence re-measured, CHANGELOG and the account landed"
```

- [ ] **Step 6: Merge decision** — superpowers:finishing-a-development-branch (the
controller's, not the implementer's). Do not push without instruction.

---

## Self-review notes (already applied)

- Spec coverage: item C → task 1; item A → task 2; item D → task 3; item B + exit →
  task 4. All four spec rulings are carried: the per-seam split with both pins (1), the
  deliberate next-touch trigger (2), the vocabulary rule with the full-table requirement
  (3), measured-at-exit figures (4).
- Task 1's pin is genuinely red-first: the anchored regex cannot match until the split
  exists. The adjacency reject (dedicated message, never unknown-key head) passes before
  and after — its meaning is the division of labor, and `doesNotMatch` on the head makes
  it fail loudly if the seam order ever inverts.
- Type consistency: `SignatureReport.orphans: Digest[]` (verified at
  `kernel/verify-signatures.ts:48`); `confirmedEffectRecord` returns `{ handles,
  recordId, … }` per `redeem-token.test.ts:40` — the step-2 destructure note covers the
  shape either way.
