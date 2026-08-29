# Sidecar Orphans Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the sidecar entries register row 22 keeps open VISIBLE to the host that must reconcile them — `verifySignatures(recordId).orphans` names every sidecar digest with no chain counterpart, sorted, at zero additional reads — without closing the row or touching any gate.

**Architecture:** Task 1 is one TDD cycle: five pins written red against the current `SignatureReport`, then the field added inside `layerVerdicts`' existing pass, the guide and the operator-surface doc moved in the same commit as the interface (`CLAUDE.md`'s same-change rule fires — a surface interface changes). Task 2 moves the three Tier 1 living records — the register row's inventory, the release checklist's expected ruling, the next-phases passage — with the row's scope and trigger proved byte-identical. Task 3 writes the increment section, moves the present-tense counts, indexes the spec/plan pair, and discharges the explicit-proposal condition.

**Tech Stack:** TypeScript (NodeNext, strict), ESM, vitest 4, Biome. Node 22.16+ floor; `@vidimera/record` keeps zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-08-29-sidecar-orphans-report-design.md`

## Global Constraints

- **NO SANCTION IS NEEDED AND NONE IS SOUGHT.** No task edits `docs/concept/`. No maturity marker moves. Confirm before Task 1 that no `docs/concept/` text enumerates `SignatureReport`'s fields: `grep -rn "signingDeclared\|SignatureReport" docs/concept/` must print nothing. If it prints anything, STOP — the field is then a sealed-set edit, not this increment.
- **THE PERMITTED `src/` ENVELOPE, as a STOP.** One behavior change: `packages/record/src/kernel/verify-signatures.ts`. One comment change: `packages/record/src/operator-surface.ts`. **Any other `packages/*/src/` edit is a STOP** — `signatureLayerHolds`'s body must be byte-identical at exit (proved by hash, below), and `packages/record/src/signing/*` is not opened.
- **REPORTING, NEVER CONTAINMENT.** Row 22 keeps its number, its scope (22a) and its trigger byte-for-byte. Every sentence this increment writes into a doc comment, the guide, the register, the checklist or the status doc must be readable as reporting. **If you find yourself writing "bounds", "contains", "fixes" or "closes" about 22a, STOP and reread the spec's ruling 6.**
- **THE GATE IS UNTOUCHED, and the proof is a hash, not a reading.** Record at Task 1 Step 1 and re-run at Task 1 Step 8 and Task 3 Step 5:
  ```bash
  sed -n '/^export async function signatureLayerHolds/,/^}/p' packages/record/src/kernel/verify-signatures.ts | git hash-object --stdin
  ```
  Any difference is a hard STOP.
- **`packages/record/test/byte-stability.test.ts` is FROZEN** (`CONTRIBUTING.md` hard rule 4) — no chain bytes change here, so nothing can reach it; proved untouched by `git diff` at exit.
- **`pnpm api-sync` GATES PRESENCE ONLY.** The quoted `SignatureReport` block in `docs/guide/api-reference.md` must be diffed against `packages/record/src/kernel/verify-signatures.ts` by hand (Task 1 Step 7).
- **Markdown is citation-checked by nothing.** Hand-verify every quoted phrase against a whitespace-collapsed copy of its source. A quoted phrase that wraps a line — or a `*` doc-comment leader — is present in the source and invisible to a naive check.
- **`codeOnlyPatterns` runs over every LINE of a tracked `.ts` file**, comments and string literals included. Forbidden: the bare word for a design document (only "by design" is excluded), the bare word for a work slice, `Task <n>`, `<that word> §<n>`, `OQ<n>-<n>`, foreign labels, and 7–40-char hex commit refs. **The fabricated orphan digest in the tests is `sha256:` followed by 64 zeros, built with `'0'.repeat(64)`, never written out as a literal** — a 64-char hex literal is exactly what the scan flags.
- **Every count is MEASURED, never copied.** The record project's file and test totals before and after, the Biome file count, and the repo-wide vitest totals are read from actual output at the step that needs them; no figure in this plan may stand in for a measurement.
- **`docs-index-sync`'s regexes are phrasing-locked.** The counted sentences must keep the exact shapes ``N files in `specs/`, M in `plans/` `` and ``**`docs/analysis/`** holds N files``. The gate reads TRACKED files only, so the spec, the plan, the INDEX row and both count moves land in ONE commit (Task 3).
- **Everything you paste must be Biome-formatted before it is committed.** Run `./node_modules/.bin/biome check --write <files>` after pasting any block, then re-read the diff.
- **Gates at every commit — never call `pnpm`** (the global shim is broken on this machine): `./node_modules/.bin/vitest run`, `./node_modules/.bin/tsc --noEmit -p packages/record` AND `-p packages/store-postgres`, `./node_modules/.bin/biome check --error-on-warnings .`, `node scripts/contract-scan.mjs` exit 0, `node scripts/api-reference-sync.mjs` exit 0, `node scripts/docs-index-sync.mjs` exit 0. **Every commit in this increment is green — there is no red carve-out.** Task 1's red tests are run red and then made green inside the same task, before its commit.
- Commit messages via `git commit -F <msgfile>` where the message file is written with the **Write tool** — PowerShell `Set-Content` prepends a BOM. Verify the branch is attached before each commit. **Never push.**
- Commit subjects follow the increment convention: `Sidecar orphans report N/3: <what landed>`.

---

### Task 1: The field, its five pins, and the surface that moves with it

**Files:**
- Create: `packages/record/test/sidecar-orphans-report.test.ts`
- Modify: `packages/record/src/kernel/verify-signatures.ts` (`SignatureReport`, `layerVerdicts`, `verifySignatures`)
- Modify: `packages/record/src/operator-surface.ts` (the `verifySignatures` doc comment only)
- Modify: `docs/guide/api-reference.md` (the quoted `SignatureReport` block and the orphan paragraph under `## Signing (AL2) — structural today`)
- Modify: `docs/guide/integrating.md` (the last bullet of "What you get, with its limits in the same breath")

**Interfaces:**
- Consumes: `enforceableSigningSetup(profiles)` and `breakOneSignature(signatures, recordId, store)` from `packages/record/test/helpers/signing.ts`; `captureProfile`, `facts`, `identity`, `makeConfig`, `openRecord` from `packages/record/test/helpers/profiles.ts`; `create` from `packages/record/src/create.js`; `MemorySignatureStore`; `SignatureEntry`, `SignatureStore`, `Signer`, `Verifier` from `packages/record/src/signing/store.js`; `transitionDigest` from `packages/record/src/chain/encoding.js`.
- Produces: `SignatureReport.orphans: Digest[]` — sorted lexicographically, every sidecar digest for the record with no chain counterpart; `[]` when the instance has no `config.signing`. Consumed by Tasks 2 and 3 only as a name to cite.

- [ ] **Step 1: Verify the premise and record the baselines.**

```bash
grep -rn "signingDeclared\|SignatureReport" docs/concept/ ; echo "concept hits above must be NONE"
grep -c "orphans" packages/record/src/kernel/verify-signatures.ts
sed -n '/^export async function signatureLayerHolds/,/^}/p' packages/record/src/kernel/verify-signatures.ts | git hash-object --stdin
./node_modules/.bin/vitest run --project record 2>&1 | grep -E "Test Files|Tests "
./node_modules/.bin/biome check --error-on-warnings . 2>&1 | tail -1
```
Expected: no concept hits; `0`; a hash — **write it down**; the record project's file and test totals — **write them down**; the Biome file count — **write it down**. Every later step compares against these.

- [ ] **Step 2: Write the five pins, red.**

Create `packages/record/test/sidecar-orphans-report.test.ts`:

```ts
// @vidimera/record — sidecar-orphans-report.test.ts (the sidecar-orphans-report increment).
// Pins over `SignatureReport.orphans`: every sidecar digest for the record that names no
// transition in the chain, sorted, computed inside the one pass `verifySignatures` already
// makes. Deferral-register row 22's open half is one orphan per refusing seam call against a
// record admitting no CAS candidate; the `SignatureStore` contract tells a host to prune
// entries no chain transition references, and this field is how a host learns which those are.
//
// What these pins prove, and in the same breath what they cannot: the report NAMES orphans.
// Nothing here bounds them, deletes them, or lets them gate anything — the never-gates pin
// below is the load-bearing one, and the row stays open.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { SignatureStore, Signer, Verifier } from '../src/signing/store.js';
import type { Digest } from '../src/types.js';
import { captureProfile, facts, identity, makeConfig, openRecord } from './helpers/profiles.js';
import { breakOneSignature, enforceableSigningSetup } from './helpers/signing.js';

const CONTENT = { subject: 'week-1', total: 40 };
const PROFILE_ID = 'test.orphans.v1';
const PROFILE: ConfirmProfile = { ...captureProfile({ id: PROFILE_ID }), signing: true };
/** Built, never written as a literal: a 64-char hex run is what the contract scan flags. */
const FABRICATED: Digest = `sha256:${'0'.repeat(64)}`;

test('a clean signing record reports no orphans', async () => {
  const rig = enforceableSigningSetup([PROFILE]);
  const recordId = await openRecord(rig.handles, CONTENT, PROFILE_ID, 'subject:orph-clean');
  assert.equal(
    (await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts())).status,
    'ok',
  );
  const report = await rig.handles.operator.verifySignatures(recordId);
  assert.deepEqual(report.orphans, []);
  assert.ok(report.transitions.every((t) => t.signed && t.verified));
});

test('the already-refused corner: one refusing call with no edge leaves exactly one orphan, and the report names it', async () => {
  const rig = enforceableSigningSetup([PROFILE]);
  const recordId = await openRecord(rig.handles, CONTENT, PROFILE_ID, 'subject:orph-refused');
  assert.equal(
    (await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts())).status,
    'ok',
  );
  await breakOneSignature(rig.signatures, recordId, rig.store);

  // First refusing call LANDS the compromise edge (C3's carve-out admits it out of a terminal
  // `confirmed`), so every sidecar entry still has a chain counterpart.
  const landed = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(landed.status, 'refused');
  if (landed.status !== 'refused') return;
  assert.ok(landed.transitionRef !== undefined, 'fixture: the edge landed');
  assert.deepEqual((await rig.handles.operator.verifySignatures(recordId)).orphans, []);

  // Second refusing call: the record is terminal `refused`, no candidate can win its CAS, and
  // the decorator has already written the attempt's entry — ONE orphan.
  const noEdge = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(noEdge.status, 'refused');
  if (noEdge.status !== 'refused') return;
  assert.equal(noEdge.transitionRef, undefined, 'fixture: no edge landed');

  const chain = await rig.store.readChain(recordId);
  const chainDigests = new Set(chain.map((t) => transitionDigest(t)));
  const report = await rig.handles.operator.verifySignatures(recordId);
  assert.equal(report.orphans.length, 1, 'exactly one orphan');
  const orphan = report.orphans[0];
  assert.ok(orphan !== undefined);
  assert.equal(chainDigests.has(orphan), false, 'the orphan names no chain transition');
  const entry = (await rig.signatures.listByRecord(recordId)).find(
    (e) => e.transitionDigest === orphan,
  );
  assert.ok(entry !== undefined, 'the orphan is a real sidecar entry');
  assert.equal(entry.seq, chain.length + 1, 'minted for the append that never landed');
  // The verdicts are unaffected: every chain transition still reports as before.
  assert.equal(report.transitions.length, chain.length);
});

test('orphans never gate: an open record carrying a fabricated orphan still finalizes ok, and its verdicts are unchanged', async () => {
  const rig = enforceableSigningSetup([PROFILE]);
  const recordId = await openRecord(rig.handles, CONTENT, PROFILE_ID, 'subject:orph-gate');
  const before = await rig.handles.operator.verifySignatures(recordId);
  assert.deepEqual(before.orphans, []);

  await rig.signatures.put({
    transitionDigest: FABRICATED,
    recordId,
    seq: 99,
    keyRef: 'key-1',
    signature: 'AAAA',
  });
  const after = await rig.handles.operator.verifySignatures(recordId);
  assert.deepEqual(after.orphans, [FABRICATED], 'the report names the fabricated orphan');
  assert.deepEqual(after.transitions, before.transitions, 'the chain verdicts are byte-identical');

  // The seam consults `signatureLayerHolds`, which walks the CHAIN; an orphan is never visited.
  const done = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'an orphan gates nothing');
});

/**
 * A `SignatureStore` wrapper that returns the real entries in ALTERNATING order on successive
 * `listByRecord` calls — insertion order, then reversed, then insertion order again. Legal:
 * `signing/store.ts` promises "chain order not guaranteed". Two consecutive reports over it
 * must be deep-equal, or the report would be a sidecar-driven artifact.
 */
function alternatingOrder(inner: SignatureStore): SignatureStore {
  let flip = false;
  return {
    put: (entry) => inner.put(entry),
    listByRecord: async (id) => {
      const real = await inner.listByRecord(id);
      flip = !flip;
      return flip ? [...real].reverse() : real;
    },
  };
}

test('the report is deterministic under a contract-legal reordering of the sidecar: sorted, and deep-equal across calls', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const signer: Signer = async (bytes) => ({
    keyRef: 'key-1',
    signature: edSign(null, bytes, privateKey).toString('base64'),
  });
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  const inner = new MemorySignatureStore();
  const handles = create({
    ...makeConfig([PROFILE]),
    signing: { signer, verifiers: { 'key-1': verifier }, signatures: alternatingOrder(inner) },
  });
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, 'subject:orph-order');
  assert.equal(
    (await handles.operator.finalize(recordId, identity(), CONTENT, facts())).status,
    'ok',
  );
  // Two orphans, put in an order that is NOT sorted, so sorting is observable.
  const second: Digest = `sha256:${'f'.repeat(64)}`;
  await inner.put({ transitionDigest: second, recordId, seq: 98, keyRef: 'key-1', signature: 'AAAA' });
  await inner.put({ transitionDigest: FABRICATED, recordId, seq: 99, keyRef: 'key-1', signature: 'AAAA' });

  const first = await handles.operator.verifySignatures(recordId);
  const again = await handles.operator.verifySignatures(recordId);
  assert.deepEqual(first.orphans, [FABRICATED, second], 'sorted lexicographically');
  assert.deepEqual(first, again, 'the whole report is identical under the reordering');
  assert.ok(first.transitions.every((t) => t.signed && t.verified));
});

test('a non-signing instance reports no orphans and does not overreach', async () => {
  const handles = create(makeConfig([captureProfile({ id: 'test.orphans.plain.v1' })]));
  const recordId = await openRecord(handles, CONTENT, 'test.orphans.plain.v1', 'subject:orph-plain');
  const report = await handles.operator.verifySignatures(recordId);
  assert.equal(report.signingDeclared, false);
  assert.deepEqual(report.orphans, []);
});
```

- [ ] **Step 3: Run the pins and watch them fail.**

Run: `./node_modules/.bin/vitest run --project record packages/record/test/sidecar-orphans-report.test.ts`
Expected: **FAIL** — vitest strips types, so the file runs; every test that reads `report.orphans` fails on `undefined` (`deepEqual(undefined, [])`, `Cannot read properties of undefined (reading 'length')`). `tsc` would also reject the file now — that is expected and is why the implementation lands in this same task. **If any pin passes here, STOP**: it is not reaching the field.

- [ ] **Step 4: Add the field.**

In `packages/record/src/kernel/verify-signatures.ts`, replace the `SignatureReport` interface:

```ts
export interface SignatureReport {
  recordId: string;
  signingDeclared: boolean;
  transitions: {
    seq: number;
    transitionDigest: Digest;
    signed: boolean;
    keyRef?: string;
    verified: boolean;
  }[];
  /**
   * Every sidecar digest for this record that names NO transition in the chain — orphans.
   * REPORTING ONLY: no verdict reads this, no gate consults it, `signatureLayerHolds` never
   * sees it; the layer stays chain-driven and an orphan is never visited for a verdict. The
   * set is derived from the sidecar because orphans exist nowhere else, and it is SORTED
   * lexicographically so the report is identical under any `listByRecord` order the contract
   * permits. It is computed inside the one pass that already lists the sidecar — zero
   * additional reads. A host discharges `SignatureStore`'s prune obligation by deleting what
   * this names, when no seam call on the record is in flight (an in-flight append's entry and
   * an orphan carry the same `seq`). Deferral-register row 22's open half is why this exists;
   * naming orphans does not bound them.
   */
  orphans: Digest[];
}
```

Then change `layerVerdicts`' return type and tail. Its signature becomes:

```ts
async function layerVerdicts(
  ctx: KernelContext,
  chain: readonly Transition[],
): Promise<{
  signingDeclared: boolean;
  transitions: SignatureReport['transitions'];
  orphans: Digest[];
}> {
```

and its last two lines (currently `return { signingDeclared, transitions };`) become:

```ts
  // The orphan set: sidecar digests the chain walk above never visited. `byDigest` already
  // holds every entry, so this costs no read; the Set collapses the duplicate-digest shape
  // `signing/store.ts` calls out of contract rather than reporting it twice.
  const chainDigests = new Set(transitions.map((t) => t.transitionDigest));
  const orphans = Array.from(
    new Set(entries.map((e) => e.transitionDigest).filter((d) => !chainDigests.has(d))),
  ).sort();
  return { signingDeclared, transitions, orphans };
```

And in `verifySignatures`, replace the two lines

```ts
  const { signingDeclared, transitions } = await layerVerdicts(ctx, chain);
  return { recordId, signingDeclared, transitions };
```

with

```ts
  const { signingDeclared, transitions, orphans } = await layerVerdicts(ctx, chain);
  return { recordId, signingDeclared, transitions, orphans };
```

**Do not touch `signatureLayerHolds`.** It destructures `signingDeclared` and `transitions` from `layerVerdicts` today; a wider return type needs no edit there. If `tsc` says otherwise, STOP — something else changed.

- [ ] **Step 5: Run the pins and the record project.**

```bash
./node_modules/.bin/biome check --write packages/record/src/kernel/verify-signatures.ts packages/record/test/sidecar-orphans-report.test.ts
./node_modules/.bin/tsc --noEmit -p packages/record
./node_modules/.bin/vitest run --project record
```
Expected: `tsc` clean; the five pins PASS; the record project green with its file count up by one and its test count up by five from Step 1's figures. **If `signing.test.ts` or `signing-enforce.test.ts` fails, STOP** — those pin the verdicts and the gate, which this task must not move.

- [ ] **Step 6: The operator-surface doc comment.**

In `packages/record/src/operator-surface.ts`, the `verifySignatures` doc currently ends `Throws only on the caller-error/unknown-record class every read takes. */`. Replace that closing sentence with:

```ts
   * caller-error/unknown-record class every read takes. Its `orphans` names the sidecar
   * entries with no chain counterpart, sorted — reporting only, read by no gate; the host
   * prunes them, the library never does. */
```

so the comment reads `... never by this read gating. Throws only on the caller-error/unknown-record class every read takes. Its `orphans` names ...`. Keep every preceding sentence byte-identical.

- [ ] **Step 7: Move the guide in the same commit, and diff the quote by hand.**

In `docs/guide/api-reference.md`, under `## Signing (AL2) — structural today`, the quoted block ends:

```ts
interface SignatureReport {                              // verifySignatures()'s return
  recordId: string;
  signingDeclared: boolean;
  transitions: { seq: number; transitionDigest: Digest; signed: boolean;
                 keyRef?: string; verified: boolean }[];
}
```

Replace it with:

```ts
interface SignatureReport {                              // verifySignatures()'s return
  recordId: string;
  signingDeclared: boolean;
  transitions: { seq: number; transitionDigest: Digest; signed: boolean;
                 keyRef?: string; verified: boolean }[];
  orphans: Digest[];                                     // sidecar digests naming no chain
                                                         // transition — sorted; reporting only
}
```

Then, in the bold paragraph beneath the block that begins `**An implementer must tolerate orphans.**`, replace the sentence `The library performs no pruning and cannot tell your store which entries are dead, so a backing that must not grow without bound has to reconcile against the chain itself.` with:

```
The library performs no pruning, but it tells you which entries are dead:
`verifySignatures(recordId).orphans` names every sidecar digest with no chain counterpart,
sorted, at no read the call was not already making. A backing that must not grow without
bound reconciles by deleting what that names — when no seam call on the record is in flight,
since an in-flight append's entry and an orphan carry the same `seq`.
```

In `docs/guide/integrating.md`, the last bullet of "What you get, with its limits in the same breath" ends `Stated, not enforced: nothing here reads your implementation.` — **that sentence WRAPS across two lines in the file** (`Stated, not` / `enforced: …`), so locate it by whitespace-collapsed content, never by a single-line grep. Insert, before that final sentence:

```
`operator.verifySignatures(recordId).orphans` names exactly those entries, sorted, so the
reconciliation is a delete of what it lists — run it only when no seam call on that record
is in flight, because an in-flight append's entry and an orphan carry the same `seq`.
```

Then diff the member list by hand — `pnpm api-sync` will not:

```bash
sed -n '/^interface SignatureReport/,/^}/p' docs/guide/api-reference.md | sed 's,//.*,,' | tr -d ' \n'
sed -n '/^export interface SignatureReport/,/^}/p' packages/record/src/kernel/verify-signatures.ts | sed '/^\s*\/\*\*/,/\*\//d; s,//.*,,' | tr -d ' \n'
```
Expected: the same member names and types in the same order (`recordId`, `signingDeclared`, `transitions`, `orphans`), the source's doc comment stripped. Any difference is fixed in the guide, never in the source.

- [ ] **Step 8: Gates and the freeze proof.**

```bash
./node_modules/.bin/biome check --write .
./node_modules/.bin/vitest run
./node_modules/.bin/tsc --noEmit -p packages/record && ./node_modules/.bin/tsc --noEmit -p packages/store-postgres
./node_modules/.bin/biome check --error-on-warnings .
node scripts/contract-scan.mjs; echo "contract-scan exit=$?"
node scripts/api-reference-sync.mjs; echo "api-sync exit=$?"
node scripts/docs-index-sync.mjs; echo "docs-index-sync exit=$?"
sed -n '/^export async function signatureLayerHolds/,/^}/p' packages/record/src/kernel/verify-signatures.ts | git hash-object --stdin
git diff --stat -- packages/record/test/byte-stability.test.ts
git status --porcelain
```
Expected: all green; the hash identical to Step 1's; `byte-stability` diff empty; exactly five paths modified or added — the test file, `verify-signatures.ts`, `operator-surface.ts`, `api-reference.md`, `integrating.md`. **Record the repo-wide vitest totals and the Biome file count** — Task 3 needs them.

- [ ] **Step 9: Commit.**

Subject: `Sidecar orphans report 1/3: SignatureReport.orphans, five pins, the guide moved with the surface`

---

### Task 2: The three living records — inventory, ruling, passage — with the row's scope proved unchanged

**Files:**
- Modify: `docs/process/deferral-register.md` (row 22's containment inventory ONLY — the row's scope, trigger and every other clause stay byte-identical)
- Modify: `docs/process/release-checklist.md` (the row-22 item's closing ruling sentence)
- Modify: `docs/process/next-phases.md` (the row-22 passage, one sentence added)

**Interfaces:**
- Consumes: the field name `verifySignatures(recordId).orphans` from Task 1.
- Produces: nothing. Task 3 re-runs this task's trigger proof.

- [ ] **Step 1: Capture the row's trigger and date cells as a baseline.**

```bash
node -e '
const fs=require("fs");
const line=fs.readFileSync("docs/process/deferral-register.md","utf8").split("\n").find(l=>l.startsWith("| 22 |"));
const cells=line.split(" | ");
fs.writeFileSync(".row22.before.json", JSON.stringify({trigger:cells[2], date:cells[3], bodyLen:cells[1].length}));
console.log("cells:",cells.length,"trigger len:",cells[2].trim().length,"body len:",cells[1].length);'
```
Expected: `cells: 4`, a 555-character trigger. Keep `.row22.before.json` until Step 5; it must never be committed.

- [ ] **Step 2: Extend the inventory — by replacing one exact sentence.**

The row's body contains, verbatim, this sentence: `What stands in the meantime is delegation, not prevention: the `SignatureStore` contract states that a conforming sidecar holds orphans, that they are safe to prune when no chain transition references them, and that a backing which must stay bounded reconciles against the chain itself (the sidecar-contract increment).` Replace it — and only it — with the same sentence followed by two new ones:

```
What stands in the meantime is delegation, not prevention: the `SignatureStore` contract states that a conforming sidecar holds orphans, that they are safe to prune when no chain transition references them, and that a backing which must stay bounded reconciles against the chain itself (the sidecar-contract increment). OBSERVABILITY, LANDED at the sidecar-orphans-report increment: `verifySignatures(recordId).orphans` names exactly those entries — every sidecar digest with no chain counterpart, sorted, computed inside the read the call already makes — so the growth this row records is visible to the host that must reconcile it; reporting only, read by no gate, and it bounds nothing. IDENTIFIED, NOT BUILT: prune-at-seal — once `seal()`'s CAS has landed, C4 admits no further append of any kind, so every sidecar entry without a chain counterpart is an orphan forever, including a concurrent refusing call's entry whose append is still in flight, and can be deleted with no race and no prediction from the chain; it needs a `remove` on the provisional `SignatureStore`, which the sidecar-contract increment's first ruling declined, it bounds only orphans minted before the seal while the key-retirement shape keeps minting after it, and it is gated on a durable `SignatureStore` backing existing to measure against — one of this row's own trigger disjuncts. Its design, if ever, must re-open that ruling explicitly.
```

Do it by script, asserting the sentence occurs exactly once:

```bash
node -e '
const fs=require("fs");const p="docs/process/deferral-register.md";
const lines=fs.readFileSync(p,"utf8").split("\n");const i=lines.findIndex(l=>l.startsWith("| 22 |"));
const old="What stands in the meantime is delegation, not prevention: the `SignatureStore` contract states that a conforming sidecar holds orphans, that they are safe to prune when no chain transition references them, and that a backing which must stay bounded reconciles against the chain itself (the sidecar-contract increment).";
const add=" OBSERVABILITY, LANDED at the sidecar-orphans-report increment: `verifySignatures(recordId).orphans` names exactly those entries — every sidecar digest with no chain counterpart, sorted, computed inside the read the call already makes — so the growth this row records is visible to the host that must reconcile it; reporting only, read by no gate, and it bounds nothing. IDENTIFIED, NOT BUILT: prune-at-seal — once `seal()`'"'"'s CAS has landed, C4 admits no further append of any kind, so every sidecar entry without a chain counterpart is an orphan forever, including a concurrent refusing call'"'"'s entry whose append is still in flight, and can be deleted with no race and no prediction from the chain; it needs a `remove` on the provisional `SignatureStore`, which the sidecar-contract increment'"'"'s first ruling declined, it bounds only orphans minted before the seal while the key-retirement shape keeps minting after it, and it is gated on a durable `SignatureStore` backing existing to measure against — one of this row'"'"'s own trigger disjuncts. Its design, if ever, must re-open that ruling explicitly.";
if(lines[i].split(old).length!==2){console.error("sentence not found exactly once");process.exit(1);}
lines[i]=lines[i].replace(old,old+add);fs.writeFileSync(p,lines.join("\n"));console.log("inventory extended");'
```

- [ ] **Step 3: The release checklist's expected ruling.**

In `docs/process/release-checklist.md`, the row-22 item ends with the sentence beginning `and "carry forward" is the expected ruling unless a sanction for the third horn has been sought and granted, since the` and ending `alternative containments were measured and rejected rather than left untried.` Replace that sentence (keep the six-space continuation indent and wrap to the file's width) with:

```
      and "carry forward, with the growth visible" is the expected ruling —
      `verifySignatures(recordId).orphans` now names the entries a host must reconcile, so the
      row's cost is a number rather than a warning — and the third-horn sanction is DECLINED at
      this cut unless sought on its own merits, since the alternative containments were
      measured and rejected rather than left untried and the one horn-free deletion point
      (prune-at-seal) is recorded in the row as identified, not built.
```

- [ ] **Step 4: The next-phases passage.**

In `docs/process/next-phases.md`, the row-22 passage contains the sentence `That sentence is delegation, not a fix: 22a stays open.` — **it WRAPS across two lines** (`… 22a stays` / `open. Work with …`), so locate it by whitespace-collapsed content and re-wrap the paragraph to the file's ~90-column convention after inserting. Insert immediately after it:

```
The sidecar-orphans-report increment (2026-08-29) made the delegated work visible —
`verifySignatures(recordId).orphans` names the entries to prune, sorted, at no extra read —
without closing 22a; prune-at-seal is recorded in the row's inventory as identified and
gated on a durable backing, and the third-horn sanction is declined at this cut.
```

- [ ] **Step 5: Prove the row's scope and trigger did not move, and the wording obeys ruling 6.**

```bash
node -e '
const fs=require("fs");
const before=JSON.parse(fs.readFileSync(".row22.before.json","utf8"));
const line=fs.readFileSync("docs/process/deferral-register.md","utf8").split("\n").find(l=>l.startsWith("| 22 |"));
const cells=line.split(" | ");
console.log("cells:",cells.length,"| trigger identical:",cells[2]===before.trigger,"| date identical:",cells[3]===before.date,"| body grew:",cells[1].length-before.bodyLen);
const want=cells[2].trim().replace(/\s+/g," ");let bad=0;
for(const f of ["docs/process/deferral-register.md","docs/process/next-phases.md","docs/process/release-checklist.md","docs/process/implementation-status.md"]){const t=fs.readFileSync(f,"utf8").replace(/\s+/g," ");const n=t.split(want).length-1;console.log(f,n);if(n!==1)bad++;}
process.exit(bad?1:0);'
rm -f .row22.before.json
grep -n -i "bounds 22a\|closes 22a\|contains 22a\|fixes 22a" docs/process/deferral-register.md docs/process/release-checklist.md docs/process/next-phases.md; echo "(the line above must print nothing)"
git status --porcelain
```
Expected: `cells: 4`, trigger and date identical, body grew by the two sentences; the trigger occurs exactly once in each of the four living copies; no containment verb aimed at 22a; exactly three modified paths, all under `docs/process/`; `.row22.before.json` gone.

- [ ] **Step 6: Gates and commit.** The Task 1 Step 8 battery (markdown-only change, so the vitest and Biome figures are Task 1's; confirm they are).

Subject: `Sidecar orphans report 2/3: the inventory, the ruling and the passage — the row's scope and trigger unchanged`

---

### Task 3: The record and the exit

**Files:**
- Modify: `docs/process/implementation-status.md` (a new increment section; the present-tense counts; **NOT** any commit-pinned `Gate outputs` block)
- Modify: `CLAUDE.md` (the State paragraph's test-count sentence)
- Modify: `docs/superpowers/INDEX.md` (this pair's row and both counted sentences)
- Add to the index: `docs/superpowers/specs/2026-08-29-sidecar-orphans-report-design.md`, `docs/superpowers/plans/2026-08-29-sidecar-orphans-report.md`

**Interfaces:**
- Consumes: Task 1 Step 8's vitest and Biome figures; the `signatureLayerHolds` hash from Task 1 Step 1.
- Produces: nothing.

- [ ] **Step 1: Classify every count sentence before touching one.**

```bash
grep -n "test files, [0-9]* tests\|files checked" CLAUDE.md docs/process/implementation-status.md | head -30
```
Only two hits are present-tense: `CLAUDE.md`'s State paragraph (`pnpm test` — N test files, M tests, zero skips) and `implementation-status.md`'s `**Measured against the current tree**` bullet (with its `pnpm lint` line). Every other hit is under a `**Gate outputs, as measured against this increment's own exit commit**` heading or inside a historical narrative and **stays byte-identical**. Move the two present-tense sites to Task 1 Step 8's repo-wide figures. Re-measure the Biome count from output rather than incrementing.

- [ ] **Step 2: Write the increment section.**

Append to `docs/process/implementation-status.md`, after the last line of the "No-edge containment" section's gate block. House shape: `## Post-build-order increment — Sidecar orphans report`; an opening bold paragraph giving the ordinal (count the `## Post-build-order increment —` headings above it and add one — expected **twelfth**; the `## Post-build-order note —` heading does not count), the exit status, the commit range in backticks closed by this commit, that it landed one report field and no gate change, no marker move, no `docs/concept/` change, no sanction, exactly two `src/` files (`kernel/verify-signatures.ts`, `operator-surface.ts` comment-only) proved by `git diff <baseline> --name-only -- 'packages/*/src/*'`, and the `Design:`/`plan:` paths. Then bolded-lead paragraphs:

  - **The gap this closed.** The contract and the guide told a host to reconcile orphans against the chain without naming a read that yields them; `layerVerdicts` computed the set implicitly and discarded it.
  - **What landed.** Per file: the field (sorted, zero additional reads, `Set`-collapsed), the five pins by name, the operator-surface sentence, the two guide edits with the by-hand quote diff, the three Tier 1 records.
  - **Reporting, not containment — stated where it could be misread.** 22a is open; the sidecar still grows by one per refusing call; the never-gates pin is the load-bearing one; `signatureLayerHolds`'s hash unchanged (quote it).
  - **The two inventory entries and why they are shaped that way.** Observability landed; prune-at-seal identified — horn-free by C4 closure, partial (pre-seal only), needs a `remove` that re-opens the sidecar-contract increment's first ruling, gated on a durable backing. The third-horn sanction declined at this cut, in the checklist's own words.
  - **Deviations from the plan as written**, if any; otherwise say "None" and mean it.
  - **The honest limit.** Per record only; as fresh as the read; deletion is the host's act under the host's race discipline (same-`seq` hazard); durable backing unmeasured; no probe (CONTROLS §4's target vocabulary is sealed and none fits).
  - **What stays outside, and why.** Closing 22a; prune-at-seal; a `remove` on `SignatureStore`; a cross-record sweep; a probe; any change to the gate, the seams or the decorator.
  - **Cuts.** None.
  - **Gate outputs, as measured against this increment's own exit commit** — the Task 1 Step 8 battery's figures, plus `docs/process/deferral-register.md` loses no row and gains none, `git diff <baseline> --stat -- packages/record/test/byte-stability.test.ts` empty, and the `signatureLayerHolds` hash.

- [ ] **Step 3: Index the pair.**

In `docs/superpowers/INDEX.md`, add one row to the increments table after the `No-edge containment` row, in the table's five-column shape:

```
| 2026-08-29 | Sidecar orphans report | Post-build-order (no step) | [design](specs/2026-08-29-sidecar-orphans-report-design.md) | [plan](plans/2026-08-29-sidecar-orphans-report.md) |
```

Then move BOTH counts in the counted sentence — measure, never increment by hand:

```bash
git add docs/superpowers/specs/2026-08-29-sidecar-orphans-report-design.md docs/superpowers/plans/2026-08-29-sidecar-orphans-report.md
git ls-files -- 'docs/superpowers/specs/*.md' | wc -l
git ls-files -- 'docs/superpowers/plans/*.md' | wc -l
```
Write those two numbers into ``**N files in `specs/`, M in `plans/`**`` — **do not reword the sentence**; the gate reads it with a literal pattern. The `docs/analysis/` count does not move (this increment adds no analysis record).

```bash
node scripts/docs-index-sync.mjs; echo "docs-index-sync exit=$?"
```
Expected: `exit=0`, no output. A `count-mismatch` means the numbers and the `git add` disagree.

- [ ] **Step 4: Move the two present-tense count sentences** (Step 1's classification) to Task 1 Step 8's figures, and re-run `./node_modules/.bin/biome check --error-on-warnings .` to confirm the Biome count you wrote.

- [ ] **Step 5: Prove the frozen things and the envelope.**

Tasks 1 and 2 have each committed once, so `HEAD~2` is the pre-increment baseline here — this step runs BEFORE Task 3's own commit.

```bash
git diff HEAD~2 --stat -- packages/record/test/byte-stability.test.ts ; echo "empty means untouched"
git diff HEAD~2 --name-only -- 'packages/*/src/*'
sed -n '/^export async function signatureLayerHolds/,/^}/p' packages/record/src/kernel/verify-signatures.ts | git hash-object --stdin
```
Expected: no output from the first; exactly `packages/record/src/kernel/verify-signatures.ts` and `packages/record/src/operator-surface.ts` from the second; the Task 1 Step 1 hash from the third. Any other path or any other hash is a STOP.

- [ ] **Step 6: Full gates, commit, and discharge the explicit-proposal condition.**

The Task 1 Step 8 battery, all green, the vitest figure identical to Task 1's — a moved test count in a markdown-only task means something else changed.

Subject: `Sidecar orphans report 3/3: the record lands the exit — reporting, not containment`

The commit body names every `docs/process/` file this increment touched, what changed in each and why, and names `implementation-status.md`, `deferral-register.md`, `release-checklist.md` and `next-phases.md` explicitly, per `CONTRIBUTING.md`'s requirement that `implementation-status.md` edits be proposed rather than slipped in.

---

## Self-review notes

- **Spec coverage.** Ruling 1 (digests) and ruling 2 (sorted) → Task 1 Step 4's `orphans: Digest[]` and `.sort()`, pinned by the reordering test; ruling 3 (zero reads) → the set is built from `byDigest`/`entries` inside `layerVerdicts`, with no new `listByRecord` call anywhere in Step 4; ruling 4 (gate untouched) → the hash discipline in the Global Constraints, Task 1 Step 8 and Task 3 Step 5, and the never-gates pin; ruling 5 (no probe) → no probe task, and the section's honest limit says why; ruling 6 (not containment) → the Global Constraints' STOP, Task 2 Step 5's verb grep, and the section paragraph; ruling 7 (prune-at-seal recorded) → Task 2 Step 2's second sentence; ruling 8 (sanction declined) → Task 2 Step 3. The spec's five pins → Task 1 Step 2, one test each. The spec's "What lands" list → Tasks 1–3 file by file; `CLAUDE.md`'s counts → Task 3 Step 4.
- **The one thing most likely to be got wrong** is letting a containment verb into a record. The register row in particular already carries a long inventory, and "observability landed" sits beside "closed on behavior" for 22b; a reader skimming could conflate them. Task 2 Step 5's grep is a blunt check; the reviewer's read of the diff is the real one.
- **The second most likely** is a same-`seq` misunderstanding leaking into the guide: the report tells a host WHICH entries are orphans, not WHEN it is safe to delete them. Both guide edits carry the in-flight caveat verbatim for that reason.
- **Type consistency.** `SignatureReport.orphans: Digest[]` (Task 1 Step 4) is what the tests read as `report.orphans` (Task 1 Step 2) and what the records cite as `verifySignatures(recordId).orphans` (Tasks 2–3). `layerVerdicts` returns `{ signingDeclared, transitions, orphans }`; `verifySignatures` spreads all three; `signatureLayerHolds` keeps destructuring two.
- **No figure in this plan is a measurement.** The 555-character trigger length is a shape check from the previous increment's exit, not a claim about this one; every test total, file count and Biome count is measured at the step that needs it.
