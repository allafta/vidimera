# Sidecar Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the two readers that pick a sidecar entry by list position correlate through the chain instead, and state in the `SignatureStore` contract — and in the guide that reproduces it — that a conforming sidecar will hold entries for transitions that never landed.

**Architecture:** Task 1 writes both ordering-injection pins and shows them failing, because a fix whose failing test was never seen red is a fix nobody validated. Task 2 makes the operator-assurance probe chain-driven. Task 3 makes the shared test helper chain-driven and updates its fourteen call sites. Task 4 states the obligation in the contract and in both guide documents, writes the record, and runs the exit battery.

**Tech Stack:** TypeScript (NodeNext, strict), ESM, vitest 4, Biome. Node 22.16+ floor; `@vidimera/record` keeps zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-08-24-sidecar-contract-design.md`

## Global Constraints

- **NO SANCTION IS NEEDED AND NONE IS SOUGHT.** No task edits `docs/concept/`. No maturity marker moves. No interface gains or loses a member — `SignatureStore` keeps `put` and `listByRecord` exactly as they are. If a change appears to require a `docs/concept/` edit or a new interface member, STOP and report it.
- **THE PERMITTED `src/` ENVELOPE, as a STOP.** One behavior change: `packages/record/src/probes/probes.ts`. One comment change: `packages/record/src/signing/store.ts`. **Any other `packages/*/src/` edit is a STOP.**
- **THIS INCREMENT OPENS AND RETIRES NO REGISTER ROW.** Row 22's SCOPE is untouched — it keeps both halves and its trigger. What DOES move is the present-tense clause, in row 22 and in two other living records, that describes the two sidecar-driven readers as OPEN findings: this increment closes both, so those three sentences become false the moment it lands and are repaired here (Task 4 Step 4a). A false present-tense claim in a living record is repaired, never annotated — the row-22 increment's own Tier 1 rule. Both defects are closed rather than deferred, so neither is a deferral and neither needs a trigger. **If you find yourself wanting a register ROW, re-read the design's ruling 6 first.**
- **IT DOES NOT CLOSE ROW 22's ORPHAN HALF AND MUST NOT APPEAR TO.** The contract sentence delegates the obligation honestly; it prevents nothing. Every sentence written into the contract, the guide, or the record must be readable as delegation, never as a fix.
- **`packages/record/test/helpers/signing.ts`'s `signingSetup` IS FROZEN** by the AL2 signature-enforcement coverage increment and must stay byte-identical. `breakOneSignature` lives in the same file and is NOT frozen. **Prove the freeze by hashing `signingSetup`'s own text before and after** — not by leaving the file alone, which this increment cannot do:
  ```bash
  sed -n '/^export function signingSetup/,/^}/p' packages/record/test/helpers/signing.ts | git hash-object --stdin
  ```
  Record the hash at Task 1 Step 1 and re-run it at Task 3 Step 6 and Task 4 Step 6.
- **`packages/record/test/byte-stability.test.ts` is FROZEN** (`CONTRIBUTING.md` hard rule 4) — asserted green, never edited, proved byte-identical by `git diff` at exit. It declares no signing block, so nothing here can reach it.
- **`pnpm api-sync` GATES PRESENCE ONLY.** It checks that every exported name occurs in `docs/guide/api-reference.md`; it never checks that a quoted interface matches its source. The interface quote at `api-reference.md:465-468` must be diffed against `packages/record/src/signing/store.ts` **by hand**.
- **Markdown is not citation-checked by anything.** Hand-verify every quoted phrase against a whitespace-collapsed copy of its source. A quote that wraps a line break is present and invisible to a naive `grep -F`.
- **`codeOnlyPatterns` runs over every LINE of a tracked `.ts` file**, comments and string literals included. Forbidden: the bare word for a design document (only "by design" is excluded), the bare word for a work slice, `Task <n>`, `<that word> §<n>`, `OQ<n>-<n>`, foreign labels, and 7–40-char hex commit refs.
- **Keep every citation adjacent to its quotation.** Only an optional possessive and ONE sub-reference token may sit between a `SPEC §N` citation and its quotation.
- **Everything you paste must be Biome-formatted before it is committed.** Run `./node_modules/.bin/biome check --write .` after pasting any block, then re-read the diff.
- **Gates at every commit — never call `pnpm`** (the global shim is broken on this machine): `./node_modules/.bin/vitest run`, `./node_modules/.bin/tsc --noEmit -p packages/record` AND `-p packages/store-postgres`, `./node_modules/.bin/biome check .`, `node scripts/contract-scan.mjs` exit 0, `node scripts/api-reference-sync.mjs` exit 0, `node scripts/docs-index-sync.mjs` exit 0.
- **ONE CARVE-OUT, and only one: Task 1's commit is RED on purpose.** Its two pins are supposed to fail — that is what proves Tasks 2 and 3 did something. At that commit every gate but `vitest` must pass, the two failing tests must be exactly the two the task wrote, and the commit message must name them. **From Task 2 onward the suite is green at every commit with no exceptions.** If you find a third test failing at Task 1, that is not the carve-out — stop.
- Commit messages via `git commit -F <msgfile>` where the message file is written with the **Write tool** — PowerShell `Set-Content` prepends a BOM. Verify the branch is attached before each commit. **Never push.**
- Commit subjects follow the increment convention: `Sidecar contract N/4: <what landed>`.

---

### Task 1: Both pins, shown red

**Files:**
- Create: `packages/record/test/sidecar-ordering.test.ts`

**Interfaces:**
- Consumes: `enforceableSigningSetup` and `breakOneSignature` from `packages/record/test/helpers/signing.ts`; `ALL_PROBES` and the `ProbeDriver` shape from `packages/record/src/probes/`. **Driving a probe needs a conforming driver** — `packages/record/test/probes.test.ts` already builds one; read it and reuse its shape rather than inventing a second, and note that the driver's `makeConfig()` is where the `orphanFirst` wrapper must be installed, because that is the only handle the probe takes.
- Produces: `orphanFirst(inner)`, a `SignatureStore` wrapper returning a fabricated orphan entry ahead of every real one — ID-AGNOSTIC, because the probe mints its own recordId INSIDE `run()` (`probes.ts:851`) after `makeConfig()` (`:837`) has already handed the store over, so no caller can supply one. Used by Tasks 2 and 3.

- [ ] **Step 1: Verify the premise and record the freeze hash.**

```bash
sed -n '/^export function signingSetup/,/^}/p' packages/record/test/helpers/signing.ts | git hash-object --stdin
grep -n "entries\[0\]" packages/record/src/probes/probes.ts packages/record/test/helpers/signing.ts
grep -rn "breakOneSignature(" packages/record/test --include=*.ts | grep -v "helpers/signing.ts" | wc -l
./node_modules/.bin/vitest run --project record 2>&1 | tail -5
```
Expected: a hash — **write it down**; one `entries[0]` hit in each of the two files; a call-site count (the design says fourteen — **use what you measure**); and the record project's totals, also written down.

- [ ] **Step 2: Write the ordering wrapper.**

```ts
/**
 * A `SignatureStore` wrapper that returns a fabricated orphan entry AHEAD of every real one.
 * Contract-legal, and it STAYS legal while the pin runs: `signing/store.ts` promises "chain
 * order not guaranteed", and the wrapper stops injecting once its own digest is present in the
 * backing, so `listByRecord` never returns two entries for one `transitionDigest` — the one
 * thing `signing/store.ts` calls out of contract. The orphan's digest names no transition in
 * the chain, which is the state a signing deployment reaches on its own: the compromise append
 * signs before delegating, so every refusing call against a record admitting no CAS candidate
 * leaves one behind.
 *
 * ID-AGNOSTIC ON PURPOSE. The probe mints its own record inside `run()` (`probes.ts:851`),
 * after `makeConfig()` (`:837`) has already handed this store over, so no caller can gate the
 * injection on a recordId. Every non-empty listing gets the orphan.
 */
const ORPHAN_DIGEST: Digest = `sha256:${'0'.repeat(64)}`;

function orphanFirst(inner: SignatureStore): SignatureStore {
  return {
    put: (entry) => inner.put(entry),
    listByRecord: async (id) => {
      const real = await inner.listByRecord(id);
      if (real.length === 0 || real.some((e) => e.transitionDigest === ORPHAN_DIGEST)) {
        return real;
      }
      const sample = real[0] as SignatureEntry;
      return [{ ...sample, transitionDigest: ORPHAN_DIGEST, seq: real.length + 1 }, ...real];
    },
  };
}
```

Check `Digest`'s actual shape in `packages/record/src/types.ts` before writing the literal — if it is not a `sha256:`-prefixed hex string, use what the type requires. **The re-entrancy guard is load-bearing, not tidiness:** the probe writes its tamper back through `put`, so without it the very next `listByRecord` returns two entries carrying `ORPHAN_DIGEST`, which `signing/store.ts` calls out of contract — the pin would then be exercising an illegal store rather than a legal ordering.

- [ ] **Step 3: Write the probe pin, and watch it fail.**

Drive the `signature-tamper-refuses` probe against a config whose `signing.signatures` is wrapped by `orphanFirst`. Assert `status === 'pass'`. Locate the probe by id rather than by array position:

```ts
const probe = ALL_PROBES.find((p) => p.id === 'signature-tamper-refuses');
assert.ok(probe !== undefined, 'fixture: the probe exists');
```

Run: `./node_modules/.bin/vitest run --project record packages/record/test/sidecar-ordering.test.ts`
Expected: **FAIL**, with the probe reporting `expected refused/chain-compromise, observed {"status":"refused","code":"record-not-open","class":"refusal"}` — it tampered the orphan, every real signature survived, and `finalize()` reached the state guard instead of the signature gate. **If it passes, STOP** — the wrapper is not reaching the probe's config, and a trivially-green pin here means the wrapper never fired, not that the premise is wrong.

- [ ] **Step 4: Write the helper pin, and watch it fail.**

Build a signing record with `enforceableSigningSetup`, wrap its sidecar with `orphanFirst`, call `breakOneSignature`, then assert that the GENESIS entry's signature actually changed — read it back through the unwrapped store and compare against the value captured before the call. The helper's first parameter is widened to `SignatureStore` in Task 3 Step 2 for exactly this reason; write this pin against that signature, and if `tsc` rejects the wrapper you have hit the private-member rule, not a mistake in the pin.

Run the same command.
Expected: **FAIL** on the genesis comparison. Note in a comment what makes this defect nasty: both of `breakOneSignature`'s own guard assertions PASS while it does this, because an orphan is an entry and overwriting its leading four characters does change bytes. The fixture proves nothing and the test goes green.

- [ ] **Step 5: Gates and commit.** The full battery; the record project gains one file and its tests, **and the two new tests are RED** — so commit them with the failing state named in the message rather than pretending the suite is green.

Subject: `Sidecar contract 1/4: two ordering-injection pins, both red`

---

### Task 2: The probe correlates through the chain

**Files:**
- Modify: `packages/record/src/probes/probes.ts`

**Interfaces:**
- Consumes: `handles.operator.verifySignatures(recordId)`, already reachable — `handles` is built earlier in the same probe.
- Produces: no new exported name.

- [ ] **Step 1: Run the Task 1 probe pin and confirm it is still red.** Never start a fix from an unverified red.

- [ ] **Step 2: Replace the victim selection.**

Replace:

```ts
    const entries = await config.signing.signatures.listByRecord(recordId);
    const victim = entries[0];
    if (victim === undefined) {
      return fail(this, 'a confirmed signing record has no sidecar signature entries');
    }
```

with:

```ts
    // Chain-driven correlation, never sidecar-driven: `verifySignatures` walks the CHAIN and
    // reports each transition's own digest, so a victim chosen from its report always names a
    // transition that actually landed. `listByRecord` promises no order, and a signing
    // deployment accumulates entries for transitions that never landed — every refusing seam
    // call against a record admitting no CAS candidate leaves one, because the decorator signs
    // before delegating. Taking the list's first element could therefore garble an orphan,
    // leave every real signature intact, and fail a sound build.
    const report = await handles.operator.verifySignatures(recordId);
    const signed = report.transitions.find((t) => t.signed);
    if (signed === undefined) {
      return fail(this, 'a confirmed signing record has no signed transitions');
    }
    const entries = await config.signing.signatures.listByRecord(recordId);
    const victim = entries.find((e) => e.transitionDigest === signed.transitionDigest);
    if (victim === undefined) {
      return fail(this, 'a signed transition has no sidecar entry');
    }
```

Two things to hold. `verifySignatures` reports and never throws on a verification failure, but it does throw on the unknown-record class every read takes — **do not move this call above the record's creation.** And the `SignatureReport` field names are `transitions`, `transitionDigest` and `signed`; confirm them against `packages/record/src/kernel/verify-signatures.ts`, where the interface is declared — `operator-surface.ts` only imports the type and declares the method.

- [ ] **Step 3: Run the pin.** Expected: the Task 1 probe pin now PASSES; the whole record project green, including `packages/record/test/probes.test.ts`.

- [ ] **Step 4: Exercise both new failure arms, and record which is real.** Temporarily force `signed` to `undefined`, confirm the probe returns `no signed transitions` rather than throwing, and revert. Do the same for the `no sidecar entry` arm. **Then record the honest status of the second one**: `layerVerdicts` marks a transition `signed: true` only when the sidecar holds an entry for its digest, so on a sound build that arm cannot fire — it is a guard against a store that changes its answer between two reads, not a live path. Say so in a comment beside it rather than leaving a reader to assume it is reachable.

- [ ] **Step 5: Gates and commit.**

Subject: `Sidecar contract 2/4: the operator-assurance probe correlates through the chain`

---

### Task 3: The helper correlates through the chain, and its call sites follow

**Files:**
- Modify: `packages/record/test/helpers/signing.ts`
- Modify: `packages/record/test/signing-enforce.test.ts`, `packages/record/test/redeem.test.ts` (every `breakOneSignature` call site)

**Interfaces:**
- Consumes: `transitionDigest` from `packages/record/src/chain/encoding.js`; the `SignatureStore` type from `packages/record/src/signing/store.js`. **`Store` is ALREADY imported in this file — do not re-import it.**
- Produces: `breakOneSignature(signatures, recordId, store)` — a third required parameter.

- [ ] **Step 1: Run the Task 1 helper pin and confirm it is still red.**

- [ ] **Step 2: Rewrite the helper.**

```ts
export async function breakOneSignature(
  signatures: SignatureStore,
  recordId: string,
  store: Store,
): Promise<void> {
  const chain = await store.readChain(recordId);
  const genesis = chain[0];
  assert.ok(genesis !== undefined, 'fixture: the record has a chain');
  const digest = transitionDigest(genesis);
  const entries = await signatures.listByRecord(recordId);
  const victim = entries.find((e) => e.transitionDigest === digest);
  assert.ok(victim !== undefined, 'fixture: the genesis transition has a sidecar entry');
  const broken = `AAAA${victim.signature.slice(4)}`;
  assert.notEqual(broken, victim.signature, 'fixture: the tamper changed the signature');
  await signatures.put({ ...victim, signature: broken });
}
```

Targeting the GENESIS deliberately preserves today's behavior exactly, and the claim is MEASURED rather than quoted: `MemorySignatureStore` iterates its map in insertion order and the decorator writes in append order, so on a clean signing flow `entries[0]` IS the genesis entry — verify it by comparing `entries[0].transitionDigest` against `transitionDigest(chain[0])` after a stage/open/finalize. `signing-enforce.test.ts`'s header supports this only for one increment's own additions — its actual sentence is "every break this increment ADDED is a TAMPERED sidecar entry at the GENESIS transition", and it then names a missing entry and an unresolvable keyRef as carried by the OLDER tests — so verify per call site rather than leaning on the header. **This is a correlation change, not a target change** — say so in the doc comment, and add the reason: `listByRecord` promises no order and a signing deployment accumulates entries for transitions that never landed, so position is not identity.

Add exactly TWO new bindings, both into the existing sorted import block: `transitionDigest` from
`../../src/chain/encoding.js`, and `SignatureStore` folded into the existing
`import type { Signer, Verifier } from '../../src/signing/store.js';` line. **`Store` is already
imported in this file — re-importing it is a duplicate-identifier error.**

**The first parameter is widened from `MemorySignatureStore` to `SignatureStore` on purpose.** The
class carries a `private readonly entries` field, which makes it NOMINAL: a `SignatureStore` object
literal is not assignable to it, so Task 1 Step 4's pin could not pass `orphanFirst(rig.signatures)`
at all. The body uses only `listByRecord` and `put`, and every one of the call sites passes a
`MemorySignatureStore`, which is structurally assignable to the interface.

- [ ] **Step 3: Update every call site.**

```bash
grep -rn "breakOneSignature(" packages/record/test --include=*.ts | grep -v "helpers/signing.ts"
```
Each site passes the store from the SAME rig whose `signatures` it passes. **The compiler catches a missing argument; it does NOT catch `a.signatures` paired with `b.store`** — that type-checks and tampers the wrong record. The sites are not uniform: some hold a whole rig object and can write `a.store` / `b.store` directly, while others destructured only `signatures` at the top of their test and have no `store` binding in scope at all. For the second shape, widen the destructuring rather than reaching for a different store — and if a site's rig turns out not to expose one, STOP and report rather than inventing a second way in.

If any call site's rig does not expose a store, do not reach around it — check what that rig returns and, if it genuinely has none, STOP and report rather than inventing a second way in.

- [ ] **Step 4: Run the full record project.**

Run: `./node_modules/.bin/vitest run --project record`
Expected: the Task 1 helper pin now PASSES and everything else is green. **Read the failures, not the count.** A mis-paired store makes a break land on a record the assertion does not name, so the symptom is a seam test reporting the wrong outcome — not a compile error and not an obviously related failure.

- [ ] **Step 5: Prove the helper's own guard still bites.** Temporarily make the digest lookup match nothing and confirm the `no sidecar entry` assertion fires; revert.

- [ ] **Step 6: Prove the freeze.**

```bash
sed -n '/^export function signingSetup/,/^}/p' packages/record/test/helpers/signing.ts | git hash-object --stdin
```
Expected: byte-identical to the hash recorded at Task 1 Step 1. Any difference is a hard STOP.

- [ ] **Step 7: Gates and commit.**

Subject: `Sidecar contract 3/4: the shared break helper correlates through the chain, fourteen call sites follow`

---

### Task 4: The obligation stated, in the contract and in the guide

**Files:**
- Modify: `packages/record/src/signing/store.ts`
- Modify: `docs/guide/api-reference.md`, `docs/guide/integrating.md`
- Modify: `docs/process/implementation-status.md` (a new increment section, plus the third-reader clause in its "live deferral-register rows" bullet)
- Modify: `docs/process/deferral-register.md` (row 22's third-reader clause ONLY — the row's scope, trigger and every other clause stay byte-identical)
- Modify: `docs/process/next-phases.md` (the two-findings paragraph only)
- Modify: `CLAUDE.md` (test-count figures only, if they moved)

- [ ] **Step 1: State the obligation in the contract.**

In `packages/record/src/signing/store.ts`, extend the `SignatureStore` interface doc. Keep the existing two sentences and the two per-method bounds exactly as they are; add the implementer-facing half:

```ts
/** The detached-signature sidecar. Deliberately NOT part of the frozen Store
 * contract: signatures are an additive evidence layer beside the chain, stored and
 * injected separately (SPEC §14's "detached"). Same provisional-signature discipline
 * as the Store: behaviors stable, method shapes pre-1.0.
 *
 * AN IMPLEMENTER MUST TOLERATE ORPHANS. Entries whose `transitionDigest` names no
 * transition in the record's chain are a normal, expected state, not corruption: the
 * signing decorator signs BEFORE delegating the append, so a lost CAS or a crash leaves
 * the entry behind, and a seam that refuses against a record admitting no append target
 * leaves one on every call. They are safe to prune whenever no chain transition
 * references them — verification is chain-driven, so an entry with no chain counterpart
 * is never read for a verdict. The library performs no pruning and has no way to: it
 * cannot tell this surface which entries are dead. A backing that must not grow without
 * bound therefore has to reconcile against the chain itself. (`MemorySignatureStore` ships a
 * `delete`, but that method is documented there as explicitly NOT part of this contract — a
 * test and host convenience, never something the library calls.) */
```

**Do not add a `remove` method.** The obligation is stated; the mechanism stays the implementer's.

**The sentence `AN IMPLEMENTER MUST TOLERATE ORPHANS` is a CROSS-INCREMENT INTERFACE, not just
prose.** `docs/superpowers/plans/2026-08-24-no-edge-containment.md` gates its own premise check on
`grep -c "AN IMPLEMENTER MUST TOLERATE ORPHANS" packages/record/src/signing/store.ts` printing 1.
Reword the surrounding paragraph freely; **leave that sentence byte-identical**, or update the
successor plan's grep in the same change.

- [ ] **Step 2: Move `docs/guide/api-reference.md` in the same commit.**

The interface is quoted verbatim under the heading `## Signing (AL2) — structural today`. Bring the quote's comments into line with the source — it currently carries only `// upsert by transitionDigest` and reproduces neither of the source's two bounds — and add a short prose note beneath the block covering the orphan obligation. Then diff the quote against the source by hand:

```bash
sed -n '/^interface SignatureStore/,/^}/p' docs/guide/api-reference.md
sed -n '/^export interface SignatureStore/,/^}/p' packages/record/src/signing/store.ts
```
The member list must match exactly. `pnpm api-sync` will not check this for you.

- [ ] **Step 3: Move `docs/guide/integrating.md` too.**

Two edits. The inline comment on the `signatures:` line names the two methods; leave it and let the prose carry the obligation. Then add a bullet to the "What you get, with its limits in the same breath" list — the document's own graduated-honesty register — saying that the sidecar accumulates entries for transitions that never landed, that they are inert to verification because correlation runs chain-to-sidecar and never the reverse, and that a durable backing has to reconcile against the chain if it must stay bounded. Match the surrounding bullets' voice: a claim and its limit in one breath.

- [ ] **Step 4a: Retire the two reader findings at their three Tier 1 sites.**

The row-22 truth-repairs increment recorded both defects as open, in present tense, in three living
records. This increment closes them, so all three sentences are now false and are repaired in place.
**Locate each by CONTENT, never by line number** — the row-22 increment grew all three files.

  1. `docs/process/deferral-register.md`, row 22: the sentence beginning `A THIRD reader is
     sidecar-DRIVEN` becomes a closure — the reader WAS sidecar-driven, was measured returning a
     FAIL against a sound build under a permitted listing order, and CLOSED at this increment, which
     made it correlate through `verifySignatures`; the same idiom in the corpus's shared
     `breakOneSignature` closed with it; row 22's own scope is unchanged. **Every other clause of
     the row, and its whole trigger cell, stays byte-identical** — re-run the row-22 plan's
     whitespace-collapsed trigger comparison to prove it.
  2. `docs/process/next-phases.md`: the sentence naming the two findings as their own small cluster
     becomes a closure naming this increment.
  3. `docs/process/implementation-status.md`, the "live deferral-register rows" bullet: the clause
     saying a third, sidecar-driven reader exists in `probes/probes.ts` as a separate finding
     becomes a closure — that reader and the shared helper both correlate through the chain as of
     this increment, and row 22's scope is unaffected.

- [ ] **Step 4: Move the count sentences — and only the present-tense ones.**

```bash
grep -rn "test files\|tests, zero skips\|files checked" CLAUDE.md docs/process/implementation-status.md | head -20
```
This increment adds one test file and its cases, so the present-tense figures in `CLAUDE.md`'s State paragraph and `implementation-status.md`'s `**Measured against the current tree**` bullet move to what Task 3's gate run measured. Every figure under a `**Gate outputs, as measured against this increment's own exit commit**` heading is pinned to a past commit and **stays byte-identical**. Re-measure the Biome file count from actual output.

- [ ] **Step 5: Write the increment section.** House shape. Beyond the standard paragraphs it must record:

  - **That both defects were LATENT, not live** — no real flow was found that reaches an orphan for the probe's own record, and the pins inject an ordering the contract permits rather than demonstrating a deployment that produces it.
  - **That this increment does NOT close row 22's orphan half**, and that the contract sentence is containment by honest delegation rather than by prevention.
  - **That the contract sentence is unenforced and unenforceable here** — no gate reads a host's implementation.
  - **The fourteen call-site edits**, and the specific mis-edit the compiler cannot catch.
  - **`signing.test.ts`'s own trailing-four-character break variant**, which has the same shape and is deliberately left, per the design's scope bounds.

- [ ] **Step 6: Prove the frozen things.**

```bash
git diff HEAD~3 --stat -- packages/record/test/byte-stability.test.ts ; echo "empty means untouched"
git diff HEAD~3 --name-only -- 'packages/*/src/*'
sed -n '/^export function signingSetup/,/^}/p' packages/record/test/helpers/signing.ts | git hash-object --stdin
```
Tasks 1, 2 and 3 have each committed once, so `HEAD~3` is the pre-increment baseline and this step runs BEFORE Task 4's own commit. Expected: no output from the first; exactly the two repo-relative paths `packages/record/src/probes/probes.ts` and `packages/record/src/signing/store.ts` from the second — `git diff --name-only` prints repo-relative paths, so compare against those, not against basenames; and the Task 1 hash from the third.

- [ ] **Step 7: Full gates, commit, and discharge the explicit-proposal condition.**

Subject: `Sidecar contract 4/4: the orphan obligation stated in the contract and the guide`

Then write the PR description — or a note in this commit's body — naming the `docs/process/` and `docs/guide/` files touched, what changed in each and why, per `CONTRIBUTING.md`'s requirement that `implementation-status.md` edits be proposed explicitly rather than slipped in.

---

## Self-review notes

- **Spec coverage.** Design rows 1 and 2 → Task 4 Steps 1 and 2; row 3 → Task 4 Step 3; row 4 → Task 2; row 5 → Task 3. Ruling 1 (obligation not mechanism) → Task 4 Step 1's explicit no-`remove` instruction; ruling 2 (guide moves with source) → Task 4 Steps 2 and 3 in the same commit; rulings 3 and 4 (chain-driven, both readers) → Tasks 2 and 3; ruling 5 (`signingSetup` frozen by hash) → Task 1 Step 1, Task 3 Step 6, Task 4 Step 6; ruling 6 (no register row) → Global Constraints; ruling 7 (does not close 22a) → Global Constraints and Task 4 Step 5.
- **The one thing most likely to be got wrong** is Task 3 Step 3's call-site pairing. A wrong store type-checks. The symptom is a distant seam test failing for a reason that looks unrelated, so the instruction is to read failures rather than count them.
- **The second most likely** is committing Task 1 while trying to make the suite green. The pins are supposed to be red at that commit; that is what proves Tasks 2 and 3 did something.
- **Type consistency.** `orphanFirst(inner)` takes ONE parameter and returns a `SignatureStore` (Task 1 Step 2); `breakOneSignature(signatures: SignatureStore, recordId, store)` (Task 3 Step 2); the probe uses `report.transitions`, `.signed` and `.transitionDigest`, confirmed against `packages/record/src/kernel/verify-signatures.ts:26-35` — NOT against `operator-surface.ts`, which only imports the type.
- **No figure in this plan is a measurement.** The call-site count, the test totals and the freeze hash are all measured at Task 1 Step 1 and carried forward from there.
