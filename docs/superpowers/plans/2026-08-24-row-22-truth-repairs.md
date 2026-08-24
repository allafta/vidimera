# Row 22 Truth Repairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct twelve claims about deferral-register row 22 that assert a containment cost nobody had measured, record the third horn the original dilemma never named, restate the row with a measured containment inventory and a trigger that names the events it actually needs, and record the measurements in an analysis record the corrected sites can point at.

**Architecture:** Task 1 writes the analysis record every other task cites, and moves the one `docs/analysis/` count the index gate reads. Task 2 restates row 22 in `docs/process/deferral-register.md` and mirrors the new trigger and every corrected present-tense claim into `docs/process/next-phases.md`, `docs/process/release-checklist.md` and `docs/process/implementation-status.md` — one commit, because a half-mirrored trigger is worse than an uncorrected one, and because a reviewer cannot sensibly approve half of it. Task 3 appends dated reconciliation notes to the two historical accounts, which are preserved rather than rewritten. Task 4 writes the increment record and runs the exit battery.

**Tech Stack:** Markdown only. Node 22.16+ for the gate scripts (`node:fs`, `node:path`, `node:url`, `node:child_process`); vitest 4 and Biome are run to prove they did not move.

**Spec:** `docs/superpowers/specs/2026-08-24-row-22-truth-repairs-design.md`

## Global Constraints

- **NO SANCTION IS NEEDED AND NONE IS SOUGHT.** No task edits `docs/concept/`. No maturity marker moves. If a repair appears to require a `docs/concept/` edit, STOP and report it — that is a finding, not a task.
- **NO `packages/*/src/` OR `packages/*/test/` FILE IS TOUCHED BY ANY TASK.** This increment is markdown only. The record project's 60 test files / 737 tests and the store-postgres project's 4 files / 65 tests must report identical counts before and after; the repo-wide figure stays 64 files / 802 tests. **If you find yourself editing a `.ts` file, STOP.**
- **ROW 22 IS RESTATED, NOT SPLIT AND NOT RETIRED.** It keeps its number and stays in the table. The register's own rule is that an entry leaves only when the behavior lands or the deferral is explicitly retired; neither happens here. The next increment (`docs/superpowers/specs/2026-08-24-no-edge-containment-design.md`) closes 22b on behavior and re-scopes the row; 22a stays open on the third horn. **The row does not leave the table at either increment.**
- **THE THREE TIERS govern every edit.** Tier 1 (living records: **`CLAUDE.md`**, `deferral-register.md`, `next-phases.md`, `release-checklist.md`, and the present-tense sections of `implementation-status.md`) is corrected IN PLACE. **`CLAUDE.md` is the one every sweep in this sequence misses**, because every completeness grep is scoped to `docs/process/` and it sits outside — it carries a present-tense sentence naming row 22 under its old title. Tier 2 (historical accounts inside living documents: `implementation-status.md`'s coverage-increment section, and `docs/analysis/2026-08-23-signature-enforcement-coverage.md`'s Finding F) is PRESERVED and reconciled by a DATED NOTE. Tier 3 (`docs/superpowers/specs/2026-08-23-al2-signature-enforcement-coverage-design.md` and `docs/superpowers/plans/2026-08-23-al2-signature-enforcement-coverage.md`) is NOT TOUCHED AT ALL — `docs/superpowers/INDEX.md:11-19` declares spec/plan pairs historical and unmaintained. **Editing a Tier 3 file is a STOP.**
- **The design doc's inventory is evidence, not authority.** Re-verify every row against the tree before repairing it. A row that no longer reproduces is a finding, recorded in Task 4, not silently skipped and not "fixed anyway".
- **Repair in place; do not delete.** Every one of these sentences carries real explanation beside its false claim. Keep the explanation; correct only the claim.
- **MARKDOWN IS NOT CITATION-CHECKED BY ANYTHING.** `scripts/contract-scan.mjs` resolves `SPEC §N` and `DECISIONS.md #N` citations in tracked TypeScript only. Every SPEC section number and every quoted phrase you write must be hand-verified against a **whitespace-collapsed** copy of the source. A quoted phrase that wraps a line break is present in the source and invisible to a naive `grep -F` — this has repeatedly produced false "missing quotation" findings here.
- **`docs-index-sync`'s regexes are phrasing-locked.** The specs-and-plans sentence must keep the exact shape ``N files in `specs/`, M in `plans/` `` and the analysis sentence the exact shape ``**`docs/analysis/`** holds N files``. The gate reads TRACKED files only, so a new file's `git add` and its count move must land in the SAME commit.
- **All SIX new documents are UNTRACKED and staging any of them fires `docs-index-sync`.** Measured: `git status --short` shows six `??` entries — three specs and three plans, one pair per increment in this three-increment sequence. `docs/superpowers/INDEX.md`'s table carries ONE row per PAIR (five columns: date, increment, build-order step, spec link, plan link), so six documents need THREE rows, not six. Each authoring commit must, in the SAME commit, add its pair's row (column 3 is the literal `Post-build-order (no step)`, links are `[design](specs/<basename>)` and `[plan](plans/<basename>)`) and move the counted sentence. Once all three pairs are staged the specs count reads 34 and the plans count 37 — measured against `git ls-files -- 'docs/superpowers/specs/*.md'` and `'docs/superpowers/plans/*.md'` (31 and 34 today), never incremented by hand. **Do not reword the sentence** — the gate reads it with the literal pattern ``(\d+)\s+files?\s+in\s+`specs/`,\s*(\d+)\s+in\s+`plans/` ``. **One house convention this sequence deliberately does NOT need, named so its absence is not read as an omission:** when a design is committed BEFORE its plan exists, the precedent (the AL2 signature-enforcement coverage pair) writes `plan pending` in the row's Plan cell instead of a link, appends a paragraph to the counted sentence explaining the imbalance, and leaves the `plans/` count unmoved — then removes both at the plan's own commit. That state is real only when the plan does not yet exist. All six documents in this sequence were authored together, so each pair is committed whole, with both links live and both counts moved, and no pending state is ever written. If that has not happened when you start Task 1, do it first and say so.
- **Gates at every commit — never call `pnpm`** (the global shim is broken on this machine): `./node_modules/.bin/vitest run` (zero skips), `./node_modules/.bin/tsc --noEmit -p packages/record` AND `-p packages/store-postgres` (there is NO root tsconfig), `./node_modules/.bin/biome check .`, `node scripts/contract-scan.mjs` exit 0, `node scripts/api-reference-sync.mjs` exit 0, `node scripts/docs-index-sync.mjs` exit 0.
- Commit messages via `git commit -F <msgfile>` where the message file is written with the **Write tool** — PowerShell `Set-Content` prepends a BOM that corrupts the subject line. Verify the branch is attached before each commit. **Never push.**
- Commit subjects follow the increment convention: `Row 22 truth repairs N/4: <what landed>`.

---

### Task 1: The analysis record, and the one count that moves with it

Every corrected site in Task 2 points at a record that does not exist yet. Row 22 today points at `docs/analysis/2026-08-23-signature-enforcement-coverage.md` (Finding F); after this increment it points at both — the original finding and the investigation that corrected its reasoning. Writing the record first means no task ever writes a pointer to a missing file.

**Files:**
- Create: `docs/analysis/2026-08-24-no-edge-containment-investigation.md`
- Modify: `docs/superpowers/INDEX.md` (the `docs/analysis/` count sentence only)

**Interfaces:**
- Consumes: nothing.
- Produces: the path `docs/analysis/2026-08-24-no-edge-containment-investigation.md`, cited verbatim by Tasks 2, 3 and 4.

- [ ] **Step 1: Verify the premise before writing anything.**

Run:
```bash
git ls-files -- 'docs/analysis/*.md' | wc -l
grep -n 'docs/analysis/' docs/superpowers/INDEX.md
node scripts/docs-index-sync.mjs; echo "exit=$?"
```
Expected: `17`; a line reading ``**`docs/analysis/`** holds 17 files``; and `exit=0` with no output. If the count is not 17, use what you measure and carry it forward — do not use the number written here.

- [ ] **Step 2: Write the analysis record.**

Create `docs/analysis/2026-08-24-no-edge-containment-investigation.md`. It must carry, and must not exceed:

1. A dated opening paragraph stating what the investigation was: a review of whether register row 22's finding was correctly deferred, run after the AL2 signature-enforcement coverage increment opened the row. State plainly that **the deferral was the right act** and that **the reason recorded for it was wrong**.
2. **The measurements**, each with what produced it. At minimum: the double dissociation (memo zeroes signing cost and leaves accumulation at 6, 7, 8, 9, 10, 11; compensating removal zeroes accumulation and leaves signer invocations at three per call); the key-retirement reachability (sidecar 6 to 13 over eight calls on a healthy untampered sealed record, chain flat at 5); the already-refused steady state (four candidates, sidecar 5 to 8 over three calls); the read amplification (twenty calls fetching 5 to 24 rows, 290 cumulative against 100); the corpus census is NOT carried — its three filing-time figures (72 compromise-append calls, 64 landing the edge, 68 making exactly one CAS attempt) are WITHDRAWN as arithmetically irreconcilable, and may be re-derived only by instrumenting `store.appendTransition` inside the walk and reporting three reconciling counts: total calls, calls landing at candidate index 0, and calls that exhaust the list; both sidecar-DRIVEN readers — `packages/record/src/probes/probes.ts`'s `signature-tamper-refuses` returning a FAIL against a sound build under a contract-legal listing order, and the same positional idiom in `packages/record/test/helpers/signing.ts`'s shared `breakOneSignature`, whose two guard assertions BOTH pass while it tampers an orphan and the fixture proves nothing; and the three prototype arms at 60 files / 737 tests / 0 failures with `tsc` strict clean.
3. **The zero-firing result, given its own paragraph.** Compensating removal — measured on two distinct shapes, and the record must keep them apart: on two concurrent SUCCEEDING `finalize()` calls it stripped the entire signature set from 94 of 100 and, in an independent reproduction, 88 of 100 legitimately confirmed hash-intact records; on two concurrent REFUSING calls it left 292 of 300 landed-but-unsigned. The shipped ordering scored 0 across every control run. It — passed the full record project with its new branch instrumented and counted at **zero firings**, sanity-checked at thirty firings against a scratch fixture. State the conclusion explicitly: a green suite is a null result in this area.
4. **The containment inventory**, with each family's position on the horns, what it addresses, and its verdict. The object-keyed signer-result memo: RECOMMENDED, neither horn, closes 22b. The chain-local admissibility precheck: REJECTED, on a THIRD horn the original disjunction never named — it predicts C3 and C4 from the READ chain, which on this path failed verification by construction, while C3 and C4 are decided against the backing's own persisted row; it measured green against the record project and was afterwards measured to SUPPRESS a compromise evidence edge that lands today, on a tamper shape the corpus contains no fixture for. Digest-keyed de-dup: rejected, ON the ordering horn, measured. Compensating removal: rejected, measured. Deterministic `at`: rejected against the fidelity principle. A Store-contract failure-reason field: rejected, needs a sealed-set edit.
5. **What this investigation did NOT establish**, as an explicit list. At minimum: no durable `SignatureStore` exists in the tree to measure against; no latency figure was taken anywhere and the signing cost is an invocation count; every concurrency measurement is in-process, never cross-process against a shared Postgres; the read-chain/persisted-state divergence WAS measured against the current tree but is pinned by NO fixture in it — both shapes (a length-preserving last-element kind rewrite to `refused`, and its `sealed` sibling folding to `open`) were built on a scratch tree that no longer exists, and the no-edge containment increment is what lands them as permanent pins; and a wall-clock flake was observed in roughly one run in twelve where two consecutive refusing calls landed in the same millisecond and collapsed two orphans into one upsert.

**EVERY FIGURE NAMES THE RIG THAT PRODUCED IT, AND SAYS WHETHER THAT RIG STILL EXISTS.** This is
the increment's single largest hazard and the reason it exists in miniature. Almost every
measurement above was taken on prototype trees that were reverted and no longer exist; a read-only
pass cannot reconstruct them. Writing them into a living register and a new analysis record gives
them the authority of the tree, which is exactly the move this increment is correcting. So for each
figure: name the fixture or prototype arm that produced it, state plainly that the arm is gone and
the figure is not reproducible from the tree as it stands, and name where a permanent pin for it
lands if one is scheduled. **A figure that cannot carry that sentence is withdrawn, not softened.**
The two probe/orphan measurements are the exception and should be marked as such — they were
reproduced against the current tree during review.

**No external URL, and no reference to anything outside this repository** — the standalone contract binds all newly authored markdown here.

- [ ] **Step 3: Move the analysis count and stage both together.**

Replace the count in the `docs/analysis/` sentence with the number measured in Step 1 plus one (17 becomes 18 unless Step 1 said otherwise). **Do not reword the sentence** — `scripts/docs-index-sync.mjs` reads it with the literal pattern ``**`docs/analysis/`** holds (\d+) files``.

```bash
git add docs/analysis/2026-08-24-no-edge-containment-investigation.md docs/superpowers/INDEX.md
node scripts/docs-index-sync.mjs; echo "exit=$?"
```
Expected: `exit=0`, no output. A `count-mismatch` here means the number and the `git add` disagree.

- [ ] **Step 4: Gates.**

```bash
./node_modules/.bin/vitest run
./node_modules/.bin/tsc --noEmit -p packages/record && ./node_modules/.bin/tsc --noEmit -p packages/store-postgres
./node_modules/.bin/biome check .
node scripts/contract-scan.mjs; echo "contract-scan exit=$?"
node scripts/api-reference-sync.mjs; echo "api-sync exit=$?"
node scripts/docs-index-sync.mjs; echo "docs-index-sync exit=$?"
```
Expected: 64 test files / 802 tests, zero skips, zero failures; both `tsc` clean; Biome clean; all three scripts exit 0 with no output. **Record the exact vitest and Biome figures — Task 4 needs them.**

- [ ] **Step 5: Commit.**

Subject: `Row 22 truth repairs 1/4: the investigation record, and the analysis count that moves with it`

---

### Task 2: Row 22 restated, and the trigger mirrored into all four living copies

The single largest task, and deliberately one commit. Four documents carry a byte-identical 248-character trigger; a fifth copy lives in a Tier 3 plan and is deliberately left alone. Five documents carry NON-identical variants of the dilemma sentence, two of which are Tier 2 or Tier 3 and are not rewritten here. Moving some and not others leaves the repository asserting two different things about the same row.

**Files:**
- Modify: `docs/process/deferral-register.md:13` (the whole row-22 line — the canonical text)
- Modify: `docs/process/next-phases.md:38-46`
- Modify: `docs/process/release-checklist.md:126-139`
- Modify: `docs/process/implementation-status.md:74-82`, `:91-104`, `:1177-1196`, `:1207-1211`
- Modify: `CLAUDE.md` (the live-deferral-rows sentence, which names row 22 and its old title)

**Interfaces:**
- Consumes: the analysis-record path from Task 1.
- Produces: the canonical restated trigger string, which Task 4 re-verifies.

- [ ] **Step 1: Verify the premise, and capture the current trigger as a baseline.**

```bash
node -e '
const fs=require("fs");
const files=["docs/process/deferral-register.md","docs/process/next-phases.md","docs/process/release-checklist.md","docs/process/implementation-status.md"];
const re=/The first increment that changes the signing decorator[^"]*?lands first\./g;
for(const f of files){
  const t=fs.readFileSync(f,"utf8").replace(/\s+/g," ");
  const m=t.match(re)||[];
  console.log(f, m.length, m.length?m[0].length:"-");
}'
```
Expected: each of the four files prints exactly `1` and length `248`. If any prints `0`, the trigger has been reworded since design time — STOP and re-locate it by content. If any prints a different length, the copies have already drifted and that is itself a finding for Task 4.

- [ ] **Step 2: Replace row 22 in `docs/process/deferral-register.md`.**

Row 22 is ONE physical line, line 13. Replace the entire line with the text below. Keep the leading `| 22 | ` and the three-cell shape; the register table is `| # | Deferred item | Trigger to un-defer | Recorded |`.

```
| 22 | Orphan sidecar growth and redundant signing on the no-edge refusal path. `appendChainCompromise` (`kernel/finalize.ts`) rebuilds its `refused` transition on every call, stamping `at` from the clock; the signing decorator signs BEFORE delegating to the store, and `MemorySignatureStore.put` is keyed by `transitionDigest`, so a fresh timestamp is a new key rather than an upsert. On a record whose state admits no CAS candidate the append never lands and the sidecar keeps the entry anyway. TWO DEFECTS, proven independent by double dissociation — a signer-result memo zeroes the signing cost and leaves accumulation byte-for-byte identical, while a compensating removal zeroes accumulation and leaves the signing cost untouched. (22a) ORPHAN ACCUMULATION: six consecutive refusing `finalize()` calls against a sealed signing record took the sidecar from 5 entries to 11 under a real clock — the readings after each being 6, 7, 8, 9, 10, 11 — while the chain stayed at 5; under a fixed instant the same six calls left it at 6, the clock being the only difference between the runs. (22b) REDUNDANT SIGNER INVOCATIONS: one signing operation per CAS candidate — three on that fixture, four on a record already carrying a compromise edge — all signing byte-identical bytes and upserting ONE digest, so N round-trips buy exactly one orphan. The corpus census recorded at filing time is WITHDRAWN pending re-derivation: its three figures (72 compromise-append calls, 64 landing the edge, 68 making exactly one CAS attempt) cannot all be true, because the walk returns on the first successful CAS and the shortest candidate list is three, so the one-attempt count is at most the landing count. REACHED IN ORDINARY OPERATION, not only under attack: an ordinary key retirement — dropping a decommissioned `keyRef` from the verifier registry — puts a healthy, untampered, sealed signing record into permanent minting, sidecar 6 to 13 over eight calls with the chain flat at 5. And on an unsealed record the first call lands the edge, after which the replayed state is `refused` and every later call takes the four-candidate no-edge path, so this is the steady state of a compromised record touched again rather than a sealed-record curiosity. NOT a soundness defect, stated precisely: `verifySignatures` and `signatureLayerHolds` both walk the CHAIN and look each transition's digest up in the sidecar, so an entry with no chain counterpart never produces a verdict — but it IS visited, `layerVerdicts` (`kernel/verify-signatures.ts`) materializing every sidecar row on every verification, twenty refusing calls fetching 5 to 24 rows, 290 cumulative against 100 for a non-accumulating sidecar. A THIRD reader is sidecar-DRIVEN and is a separate finding, not part of this row: `probes/probes.ts`'s `signature-tamper-refuses` takes `entries[0]` with no chain correlation and was measured returning a FAIL against a sound build under a listing order `signing/store.ts` explicitly permits. UNMEASURED, and named as such: behavior on a durable `SignatureStore` backing — a coverage bound rather than a mitigation, since `MemorySignatureStore` is the only implementation in the tree and no other measurement was possible. CONTAINMENT INVENTORY, replacing this row's earlier claim that the fix was dilemma-bound, which is WITHDRAWN as EXHAUSTIVE rather than as wrong: a signer-result memo keyed by transition OBJECT identity zeroes 22b outright — one mint per transition instead of one per CAS candidate, with the signature still written before each append — and sits on neither of the two horns; it was applied to the real tree and ran the record project green. A chain-local admissibility precheck would also zero 22a, but it sits on a THIRD horn the original disjunction did not name: it predicts C3 and C4 from the READ chain, which on this path failed verification by construction, while C3 and C4 are decided against the backing's own persisted row — on the SQL backing `readChain` reads the transitions table and the gates read the records row, so a tamper that rewrites a transition leaves the persisted state untouched. Measured against the current tree: a length-preserving last-element kind rewrite over a record persisted `confirmed` folds to `refused` on read, and the walk lands the compromise edge through C3's carve-out WITH a transitionRef today; a chain-predicted bar would suppress it. The corpus cannot see this — every corpus tamper is payload-only, kinds intact — so a green record project is a null result for any candidate in this family. A DIGEST-keyed de-dup was measured to weaken the ordering invariant and land unsigned transitions, and compensating removal after a failed CAS was measured to strip signatures from 88 of 100 concurrently-confirmed records against 0 of 400 for the shipped ordering — both REJECTED. The hazard the ordering pin protects, stated as a hazard rather than as one mechanism: any change that makes the sidecar entry's survival conditional on the append's outcome reintroduces the landed-but-unsigned transition the AL2 enforcement increment made fail closed. Full account: `docs/analysis/2026-08-24-no-edge-containment-investigation.md`; the finding's original record is `docs/analysis/2026-08-23-signature-enforcement-coverage.md` (Finding F, with its 2026-08-24 reconciliation note). (Row number 22: the highest row number ever used across `docs/process/`, `docs/superpowers/`, and `CLAUDE.md` is 22 against the tree this row lands on — but every hit above 21 is this increment's own design and plan naming this row in advance, so the highest number any RECORDED register row has ever taken is 21, and this entry takes 22, the next number never yet used. Restated 2026-08-24: the number is unchanged, this row is restated rather than reopened, and the derivation above is the one performed at write time and is left exactly as written.) | The first increment that changes `appendChainCompromise`'s candidate walk, the signing decorator's `signOne`, or the order in which the decorator's append seams sign and delegate, that adds a durable `SignatureStore` backing beyond `MemorySignatureStore`, that documents, ships or takes a support obligation for a `Signer` whose invocation has non-trivial cost — a remote key service, an HSM, or any network-bound signer — or that lifts `private: true` and publishes the package, since a durable backing arrives in an operator's own deployment where no in-repo event fires — or the 0.1 cut, whichever lands first. | 2026-08-23 (restated 2026-08-24) |
```

Two things to notice about the new trigger, because they are the point of the change. Disjunct 1 now names **`signOne`** rather than "sign-before-append ordering": the memo changes `signOne` without changing the ordering, so the old wording would not have fired for it. And the publication disjunct exists because a durable backing arrives through `docs/guide/integrating.md`'s documented `signatures:` hook, in an operator's deployment — an event no in-repo increment performs, so the durable-backing disjunct alone fires nothing at the moment the condition it names is actually met.

- [ ] **Step 3: Extract the new canonical trigger, mechanically.**

Do not retype it into the other three files. Extract it:
```bash
node -e '
const fs=require("fs");
const line=fs.readFileSync("docs/process/deferral-register.md","utf8").split("\n").find(l=>l.startsWith("| 22 |"));
const cells=line.split(" | ");
const trig=cells[cells.length-2].trim();
fs.writeFileSync(".trigger.tmp",trig);
console.log(JSON.stringify(trig).slice(0,120)+"...");
console.log("length:",trig.length);'
```
Keep `.trigger.tmp` until Step 7, then delete it. **It must never be committed** — confirm with `git status --porcelain` at Step 7.

- [ ] **Step 4: `docs/process/next-phases.md` — the dilemma paraphrase and the trigger.**

Lines 38-46 are one continuous passage. Replace from `Row 22, orphan sidecar growth on the no-edge refusal path, was opened by the AL2` through the closing `lands first."` with:

```
Row 22, orphan sidecar growth and redundant signing on the no-edge refusal path, was
opened by the AL2 signature-enforcement coverage increment, which found it while closing
rows 20 and 21 and recorded it rather than fixing it
(`docs/analysis/2026-08-23-signature-enforcement-coverage.md`, Finding F). That was the
right act — one cluster per increment — but the reason the row first gave has been
withdrawn as an exhaustive disjunction. A later investigation
(`docs/analysis/2026-08-24-no-edge-containment-investigation.md`) found one containment
that sits on neither horn and closes the redundant-signing half, and found that the only
measured containment for the orphan half sits on a THIRD horn the sentence never named:
it predicts the store's C3 and C4 answer from a chain that failed verification by
construction. The row now carries a containment inventory instead of a dilemma. Two
findings that investigation produced take no register row of their own and are recorded
here so they are not lost: a third, sidecar-DRIVEN reader in `probes/probes.ts`, measured
returning a FAIL against a sound build under a listing order the sidecar contract permits;
and the same idiom in the corpus's shared break helper. Both are their own small cluster, and it is scheduled rather than open-ended: the sidecar-contract increment closes both, immediately after this one and before the containment increment. Naming that home is what keeps them out of the deferral register — work with a named successor increment is sequenced, not deferred.
Row 22's trigger (verbatim): "<PASTE .trigger.tmp HERE, wrapped to fit>"
```

Wrap the pasted trigger to the file's ~90-column convention. **Wrapping is permitted; changing a character is not** — Step 7 collapses whitespace before comparing.

- [ ] **Step 5: `docs/process/release-checklist.md` — the disposition checkbox.**

Replace lines 126-139 (the whole row-22 checkbox, from `- [ ] Decide register row 22's disposition` through `case is where "unbounded" would actually matter.`) with a checkbox that keeps the same six-space continuation indent and states four things: that the row covers two defects, 22a and 22b; that the containment is identified and measured, and is scheduled to land BEFORE the cut at its own increment; the new trigger, verbatim from `.trigger.tmp`; and a corrected "Note before ruling" saying that behavior on a durable `SignatureStore` backing is a coverage bound rather than a mitigation — unmeasurable in this tree, because `MemorySignatureStore` is the only implementation — and that if the containment increment has already landed, this item is discharged and the row is gone.

- [ ] **Step 6: `docs/process/implementation-status.md` — the four Tier 1 sites.**

Four separate edits in one file. **Do not touch anything else in this file in this task** — in particular not the coverage increment's section around line 2493, which is Tier 2 and belongs to Task 3.

  1. **Lines 79-80**, inside the increment bullet: `It retires rows 20 and 21 and opens row 22 (orphan sidecar growth on the no-edge refusal path, recorded rather than fixed).` Correct the row's title to `orphan sidecar growth and redundant signing on the no-edge refusal path` and add that the row was restated 2026-08-24 with a measured containment inventory.
  2. **Lines 96-101**, the row-22 clause of the "live deferral-register rows" bullet. Two corrections land here: `mints a sidecar entry naming a transition that never lands, and performs one signing operation per CAS candidate` gains the fact that those N operations sign byte-identical bytes and buy exactly ONE orphan; and `inert to both AL2 consumers` becomes the precise claim — an orphan never produces a verdict, but every sidecar row IS fetched and materialized on every verification, and a third, sidecar-driven reader exists in `probes/probes.ts` as a separate finding.
  3. **Lines 1177-1196**, the "Still outstanding" row-22 bullet. This is the fullest Tier 1 restatement. It must carry the 22a/22b decomposition, the ordinary-key-retirement reachability, the corrected "never produces a verdict" wording, the containment inventory with both rejected families named and measured, the new trigger verbatim, and pointers to BOTH analysis records.
  4. **Lines 1207-1211**, the boundary paragraph's narrower paraphrase: `row 22 (orphan sidecar growth on the no-edge refusal path) is a containment gate ... held open until a change to the signing decorator's ordering or the compromise-append candidate walk, or a durable sidecar backing, or the 0.1 cut, whichever comes first.` The trigger's disjuncts have changed, so this paraphrase must change with them — and it must stay a paraphrase, not become a fifth verbatim copy.

**A limit of this task, stated rather than hidden.** Five of its six edits are specified as
prose requirements anchored by content, not as literal find-and-replace strings — the
replacement text is long-form prose that must be composed against the surrounding paragraph,
and pasting a pre-written block would produce a seam that reads wrong. Before committing,
re-read `git diff` for each of the four files in full and check every corrected claim against
the design's inventory row by row. **The diff is the review artifact here; the plan cannot be.**

- [ ] **Step 6a: `CLAUDE.md`'s live-deferral-rows sentence.**

Outside `docs/process/`, and therefore outside every completeness sweep in this sequence. Locate by content:

```bash
grep -n "row 22" CLAUDE.md
```
Its parenthetical names the three live rows and calls row 22 "orphan sidecar growth on the no-edge refusal path". Correct the title to match the restated row and say the row was restated 2026-08-24 with a measured containment inventory. **Do not turn this into a fifth verbatim trigger copy** — `CLAUDE.md` paraphrases deliberately, and its own header says to read the process documents rather than trust it.

- [ ] **Step 7: Prove the four copies are byte-identical, programmatically.**

**Do not use `grep -c`.** The occurrence count is blind here: `deferral-register.md:13` contains the trigger phrase twice and counts once, and a `docs/process/` glob misses the Tier 3 copy entirely — the check would pass while proving almost nothing.

```bash
node -e '
const fs=require("fs");
const want=fs.readFileSync(".trigger.tmp","utf8").replace(/\s+/g," ").trim();
const files=["docs/process/deferral-register.md","docs/process/next-phases.md","docs/process/release-checklist.md","docs/process/implementation-status.md"];
let bad=0;
for(const f of files){
  const t=fs.readFileSync(f,"utf8").replace(/\s+/g," ");
  const n=t.split(want).length-1;
  const stale=(t.match(/The first increment that changes the signing decorator[^"]*?lands first\./g)||[]).length;
  console.log(f,"new:",n,"stale:",stale);
  if(n<1){bad++;console.log("  MISSING or ALTERED in",f);}
  if(stale>0){bad++;console.log("  OLD TRIGGER STILL PRESENT in",f);}
}
console.log(bad?"FAIL":"OK — all four carry the new trigger and none carries the old");
process.exit(bad?1:0);'
rm -f .trigger.tmp
git status --porcelain | grep -F ".trigger.tmp" && echo "STOP: temp file staged" || echo "temp file clean"
```
Expected: each file reports at least 1, the summary line reads `OK`, and the temp file is gone. The register reports 1 because the restated row quotes the trigger only in its trigger cell.

- [ ] **Step 8: Confirm no Tier 3 file moved, and no code moved.**

```bash
git status --porcelain
```
Expected: exactly four modified paths, all under `docs/process/`. **If `docs/superpowers/specs/2026-08-23-*` or `docs/superpowers/plans/2026-08-23-*` appears, STOP** — a Tier 3 file was edited. If any `packages/` path appears, STOP.

- [ ] **Step 9: Gates.** The Task 1 Step 4 battery, all green, with vitest and Biome figures unchanged from Task 1.

- [ ] **Step 10: Commit.**

Subject: `Row 22 truth repairs 2/4: the row restated, the dilemma withdrawn, the trigger's four living copies moved together`

---

### Task 3: The two historical accounts, preserved and reconciled by dated notes

Tier 2. Neither text is rewritten. The convention is this repository's own, stated in `docs/process/implementation-status.md:2426-2428` about the analysis record — "the original framing is preserved and reconciled by dated notes rather than rewritten, so the history stays legible" — and practised in that same document at `:2272-2275` as an inline `(**Updated 2026-08-23:** …)`. Finding B's own closure note is the model: the original paragraph is left exactly as the audit wrote it, and the note says what is true now.

**Files:**
- Modify: `docs/analysis/2026-08-23-signature-enforcement-coverage.md` (append to the Finding F section)
- Modify: `docs/process/implementation-status.md` (the coverage increment's "What stays outside, and why" paragraph, around lines 2493-2510)

**Interfaces:**
- Consumes: the analysis-record path from Task 1.
- Produces: nothing.

- [ ] **Step 1: Verify the premise.**

```bash
grep -n "^## Finding F" docs/analysis/2026-08-23-signature-enforcement-coverage.md
grep -n "Closed 2026-08-23" docs/analysis/2026-08-23-signature-enforcement-coverage.md
S=$(grep -n '^\*\*What stays outside, and why\.\*\* The orphan-growth finding takes register' docs/process/implementation-status.md | cut -d: -f1)
echo "paragraph starts at line $S"; sed -n "${S},$((S+20))p" docs/process/implementation-status.md
```
Expected: the Finding F heading; at least one existing dated closure note to copy the form from; and the "What stays outside, and why" paragraph containing `It is not fixed here because the containment either special-cases a path five call sites share, or reopens the sign-before-append order the signing decorator pins deliberately`. Note that variant says **order**, not **ordering** — the five dilemma sentences are not byte-identical and there is no find-and-replace that reaches them all.

- [ ] **Step 2: Append the dated note to Finding F.**

Leave every existing line of the Finding F section byte-identical. Append, at the end of the section and before the next heading if there is one:

```markdown
**Reconciled 2026-08-24 (the no-edge containment investigation).** The finding above is
sound and its measurements reproduce. Three of its statements are corrected here rather
than rewritten above, so the record of what the increment knew stays legible.

**The deferral was right; the reason given for it was not — but it was not wrong to be a
dilemma.** "The containment either special-cases a path five call sites share, or reopens the
sign-before-append ordering the signing decorator pins deliberately" is withdrawn as
EXHAUSTIVE. One containment does sit on neither horn: a signer-result memo keyed by transition
object identity, which still writes the signature before each append, and which closes the
redundant-signing half outright. `appendChainCompromise(store, chain, now)` receives no caller
identity, so every candidate family is a uniform change to one shared function rather than a
per-caller special case.

**A THIRD horn exists, and the orphan half sits on it.** Every measured containment for orphan
accumulation predicts C3 and C4 from the READ chain — the chain that reached this function
precisely because it failed verification — while C3 and C4 are decided against the backing's
own persisted row. On the SQL backing `readChain` reads the transitions table and the gates
read the records row, so a tamper that rewrites a transition leaves the persisted state
untouched. Measured: a length-preserving last-element kind rewrite over a record persisted
`confirmed` folds to `refused` on read, and the walk lands the compromise edge through C3's
carve-out WITH a transitionRef today; a chain-predicted bar suppresses it. The corpus cannot
see this — every corpus tamper is payload-only, kinds intact.

**A stronger justification for deferring survives, and it is not the one recorded:** all three
prototyped containments passed the record project unchanged, and the most dangerous of them
passed with its new branch instrumented and counted at zero firings. A green record project is
a null result for any candidate in this family.

**"An entry with no chain counterpart is never visited" should read "an entry with no chain
counterpart never produces a verdict."** `layerVerdicts` fetches and materializes every sidecar row on every verification; twenty
consecutive refusing calls fetched 5 to 24 rows, 290 cumulative against 100.

**The soundness argument above is exhaustive over the kernel, not over the repository.**
A third, sidecar-driven reader exists in production source and was measured returning a
FAIL against a sound build under a contract-legal listing order. It is a finding in its own
right, not part of register row 22.

Two statements are CONFIRMED rather than corrected: the three-candidate arithmetic on this
section's own sealed fixture, and the enlisted-redemption exemption, which is total for all
three token seams rather than only for direct redemption. Full account:
`docs/analysis/2026-08-24-no-edge-containment-investigation.md`.
```

- [ ] **Step 3: Append the inline dated note to the coverage increment's section.**

At the end of the "What stays outside, and why" paragraph in `docs/process/implementation-status.md` — after the sentence ending `unsigned one.` — append a dated reconciliation in the same inline form the document already uses at `:2272-2275`. It states: that the orphan-growth deferral stands; that the reason recorded in this paragraph is withdrawn as an exhaustive disjunction; that row 22 was restated 2026-08-24 with a measured containment inventory and will retire on behavior at the no-edge containment increment; and where the full account lives. **Leave every preceding sentence of the paragraph byte-identical.**

- [ ] **Step 4: Prove the originals did not move.**

```bash
git diff -U0 -- docs/analysis/2026-08-23-signature-enforcement-coverage.md | grep '^-' | grep -v '^---'
git diff -U0 -- docs/process/implementation-status.md | grep '^-' | grep -v '^---'
```
Expected for the analysis record: **no output at all** — Tier 2 appends, it never deletes. For `implementation-status.md`, Task 2 is already committed, so its edits do not appear in this diff at all; the only removed line permitted here is the paragraph's own final line, extended by the appended note. **Verify by CONTENT, never by line number** — Task 2 grew this file by tens of lines above the paragraph, so every pre-Task-2 line pin into it is stale. After the edit the whitespace-collapsed string `It is not fixed here because the containment either special-cases a path five call sites share, or reopens the sign-before-append order the signing decorator pins deliberately` must still occur exactly once. If it does not, a Tier 2 original was rewritten — STOP and restore it.

- [ ] **Step 5: Gates.** The Task 1 Step 4 battery, all green.

- [ ] **Step 6: Commit.**

Subject: `Row 22 truth repairs 3/4: the two historical accounts reconciled by dated notes, originals preserved`

---

### Task 4: The record and the exit

**Files:**
- Modify: `docs/process/implementation-status.md` (a new increment section; **NOT** any commit-pinned `Gate outputs` block, which are historical and stay byte-identical)
- Modify: `docs/superpowers/INDEX.md` (only if the design/plan rows and counts have not already landed with their authoring commits)

**Interfaces:**
- Consumes: the vitest and Biome figures from Task 1 Step 4.
- Produces: nothing.

- [ ] **Step 1: Classify every count sentence before touching one.**

```bash
grep -n "64 test files\|802 tests\|131 files checked" CLAUDE.md docs/process/implementation-status.md
```
Expected: hits in `CLAUDE.md`'s State paragraph and in `implementation-status.md`'s `**Measured against the current tree**` bullet, plus hits inside `**Gate outputs, as measured against this increment's own exit commit**` blocks. **Only present-tense claims may move, and this increment moves NONE of them** — it changes no test and no source file, so every figure stays exactly as it is. The gate-output blocks are pinned to past commits and rewriting them would falsify past increments' exit records. **If your Task 1 Step 4 run produced different figures from those written here, that is a finding: report it, do not quietly update the sentences.**

- [ ] **Step 2: Write the increment section in `docs/process/implementation-status.md`.**

Follow the house shape for a post-build-order increment section: an `## Post-build-order increment — Row 22 truth repairs` heading; an opening bold paragraph giving the ordinal, the exit status, the commit range in backticks, an explicit statement that the increment landed no behavior and moved no maturity marker, that no `docs/concept/` file changed and no sanction was sought or needed, and `Design:` and `plan:` paths; then bolded-lead paragraphs: **The gap this closed.**, **What landed.** with a per-file bullet list, **The three tiers, and why two documents were deliberately not touched.**, **The honest limit.**, **What stays outside, and why.**, **Cuts.**, and **Gate outputs, as measured against this increment's own exit commit**.

Three things this section must state that a reader will otherwise trip over:

  - **The trigger now has four living copies and one frozen one.** The Tier 3 copy at `docs/superpowers/plans/2026-08-23-al2-signature-enforcement-coverage.md:985` is deliberately left at the old text because that plan is historical and unmaintained per `docs/superpowers/INDEX.md:11-19`. A future sweep comparing all five will find them divergent and must be able to learn here that the divergence is correct.
  - **Row 22 is restated, not split and not retired**, and it retires on behavior at the no-edge containment increment.
  - **One correction is recorded here and discharged elsewhere.** The uncommented cardinality assertion at `packages/record/test/signing-enforce.test.ts:98-102` is not annotated by this increment, because the hazard the annotation would state is the hazard the next increment removes.

- [ ] **Step 3: Confirm the frozen oracle and every code path never moved.**

```bash
git diff HEAD~3 --stat -- packages/ ; echo "empty means no package file moved"
git diff HEAD~3 --stat -- 'docs/superpowers/specs/2026-08-23-*' 'docs/superpowers/plans/2026-08-23-*' ; echo "empty means no Tier 3 file moved"
```
Expected: no output from either. Any output is a hard STOP.

- [ ] **Step 4: Full gates one last time.** The Task 1 Step 4 battery, with the vitest figure identical to the one measured in Task 1 — 64 test files, 802 tests, zero skips. A moved test count in a markdown-only increment means something else changed.

- [ ] **Step 5: Commit.**

Subject: `Row 22 truth repairs 4/4: the record lands the exit — twelve corrections accounted, the row restated`

- [ ] **Step 6: Discharge the explicit-proposal condition.**

`CONTRIBUTING.md` requires that edits to `docs/process/implementation-status.md` be proposed explicitly rather than slipped in, and the design carries it as an exit condition. Three tasks edited that file. Write the PR description — or, if no PR is opened, a note in this final commit's body — naming every `docs/process/` file this increment touched, what changed in each, and why, and naming `implementation-status.md`, `next-phases.md`, `release-checklist.md` and `deferral-register.md` explicitly.

---

## Self-review notes

- **Spec coverage.** Design rows 1, 2, 9 and 10 → Task 2 (the restated row and all four living trigger copies); rows 3, 4, 5, 6, 7 → Task 2 Steps 2 and 6, and Task 3 Step 2; row 8 → Task 2 Step 5's corrected "Note before ruling"; row 11 → recorded in Task 4 Step 2 and discharged by the next increment, per the design's scope bounds; row 12 → Task 3 Step 2's confirmed-rather-than-corrected paragraph. The design's three-tier ruling is enforced by Task 2 Step 8, Task 3 Step 4 and Task 4 Step 3.
- **The one thing most likely to be done wrong** is Task 2 Step 7. Reaching for `grep -c` there produces a green check that proves almost nothing — the register line contains the phrase twice and counts once, and a `docs/process/` glob cannot see the Tier 3 copy. The programmatic whitespace-collapsed comparison is the check; the occurrence count is not.
- **The second most likely** is treating the five dilemma sentences as one string. They are not byte-identical: `next-phases.md` drops the mechanism and uses an indefinite article, and `implementation-status.md:2498` says "order" where the register says "ordering". Two of the five are Tier 2 or Tier 3 and must not be rewritten at all.
- **No test count moves.** If vitest reports anything other than 64 files / 802 tests at any gate step, a non-markdown file was touched. Stop and find it rather than updating the figure.
- **No deferral-register row is written or retired by this increment.** If you find yourself wanting one, re-read the design's scope-bounds section first: those bounds are decisions, not deferrals, and a register row requires a trigger.
