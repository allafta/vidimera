# Store Conformance Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract every store-driven contract pin into one backing-parameterized conformance
suite — SPEC §12's "the executable definition of a correct `Store`" — run over `MemoryStore`
by a one-call test file, so the next increment's SQL adapter starts with its proof standing.

**Architecture:** A test-side module `test/conformance/store-conformance.ts` exporting
`runStoreConformance(label: string, makeStore: () => Store)`, which registers a `describe`
block containing 42 migrated tests (relocation under a strict edit whitelist — no assertion,
title, or fixture-value changes) plus 3 new store-level `listDue` pins. Shared fixtures the
migrating and residual tests both use are hoisted to `test/helpers/store-fixtures.ts`.
`packages/record/src` is untouched — an empty src diff is a review criterion.

**Tech Stack:** TypeScript (strict, `noEmit`), vitest, Biome, pnpm workspace (Node 22+).

**Spec:** `docs/superpowers/specs/2026-08-12-store-conformance-suite-design.md` — read it first.

## Global Constraints

- **`packages/record/src` is diff-empty this increment.** Any change there is a stop-and-halt.
- **The standalone contract:** no external URLs, repos, or project names in any file.
  `node scripts/contract-scan.mjs` before every commit; exit 0, no output. **Diff the scan
  output, never compare totals.**
- **All five gates green at every commit:** `pnpm typecheck` · `pnpm lint` ·
  `pnpm lint:strict` · `pnpm test` (zero skips) · the contract scan. The 13 pre-existing
  Biome infos are known and allowed; anything new is not (12 of the 13 live in
  `store-constraints.test.ts` and `transition-encoding.test.ts` — the `useTemplate` infos in
  tests that MIGRATE move with them; the count staying 13 with some infos relocating is
  expected and fine; a count above 13 is not).
- **The byte-stability oracle:** the four digest literals in
  `packages/record/test/byte-stability.test.ts` must not move.
- **No edits under `docs/concept/`** (sealed); no maturity marker moves.
- **SPEC citations in TypeScript must resolve** through the scan's citation resolver; quoted
  phrases must occur (whitespace-collapsed) in the cited document.
- **Status-doc prose names its increment explicitly** ("the fourth step-2 increment") —
  never the bare "this increment" (previous increment's final-review lesson).
- **The migration edit whitelist** (the ONLY changes permitted to a migrating test):
  1. `new MemoryStore()` → `makeStore()`;
  2. import paths adjusted (`Store` type instead of `MemoryStore`; helpers from their new
     homes; one directory deeper, so `../` becomes `../../`);
  3. indentation one level deeper (tests sit inside `describe`);
  4. fixture consts/helpers replaced by the hoisted `store-fixtures.ts` imports;
  5. a comment whose deixis breaks on relocation (e.g. "the only test in this file") is
     minimally rewritten to stay true — each such rewrite is called out in the commit body.
  Assertions, test titles, and fixture values move byte-for-byte. The title-inventory check
  (Task 1 Step 8) is the mechanical gate on this.
- **Commit messages:** terse imperative subject in the repo's voice, ending with
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: The suite — fixtures hoist, module, caller, migration

**Files:**
- Create: `packages/record/test/helpers/store-fixtures.ts`
- Create: `packages/record/test/conformance/store-conformance.ts`
- Create: `packages/record/test/memory-store-conformance.test.ts`
- Modify: `packages/record/test/store-constraints.test.ts` (27 tests leave; header rewritten)
- Modify: `packages/record/test/store-batch.test.ts` (9 tests leave; header rewritten)
- Modify: `packages/record/test/find-non-terminal.test.ts` (5 tests leave; header rewritten)
- Modify: `packages/record/test/due-listing.test.ts` (1 test leaves; header sentence rewritten)

**Interfaces:**
- Consumes: `Store` (`src/store/store.ts`), `MemoryStore` (`src/store/memory.ts`),
  `storeGenesis`/`storeNext` (`test/helpers/chain.ts`), `genesisPrevHash`/`transitionDigest`
  (`src/chain/encoding.ts`).
- Produces: `runStoreConformance(label: string, makeStore: () => Store): void` — Task 2 adds
  tests inside its describe block; the future SQLite increment adds a second caller file.
  Also `APPROVER`, `CHECKER`, `openRecord(store: Store, recordId?: string): Promise<Transition>`,
  `successBatch(genesis: Transition): Transition[]` from `test/helpers/store-fixtures.ts`.

- [ ] **Step 1: Record the before-inventory**

```bash
git grep -hE "^[[:space:]]*test\(" -- packages/record/test | sed -E 's/^[[:space:]]+//' | sort > /tmp/titles-before.txt
wc -l /tmp/titles-before.txt
```

Expected: 301 lines (the full-suite test count; if it differs, count first, don't guess —
the after-inventory in Step 8 is diffed against this file).

- [ ] **Step 2: Create `test/helpers/store-fixtures.ts`**

Hoisted verbatim from `store-batch.test.ts:22-54` (the consts and two helpers), with exactly
one type change: `openRecord`'s parameter widens from `MemoryStore` to `Store` (the suite
drives arbitrary backings; the body is unchanged and only calls interface methods).

```ts
// @vidimera/record — test/helpers/store-fixtures.ts: shared store-driving fixtures, hoisted
// from store-batch.test.ts when the conformance suite (conformance/store-conformance.ts)
// took over its contract pins — the suite and the residual backing-specific tests both need
// them, and two copies would drift. TEST-ONLY helper module (not `.test.ts`), same
// convention as helpers/chain.ts and helpers/profiles.ts.

import assert from 'node:assert/strict';
import { transitionDigest } from '../../src/chain/encoding.js';
import type { Store } from '../../src/store/store.js';
import type { IdentityAssertion, Transition } from '../../src/types.js';
import { storeGenesis, storeNext } from './chain.js';

export const APPROVER: IdentityAssertion = {
  principal: 'approver:1',
  authority: 'session:test-app',
};
export const CHECKER: IdentityAssertion = {
  principal: 'system:chain-verify',
  authority: 'system:vidimera-record',
};

/** An open record with only its genesis on the chain, ready to receive appends. */
export async function openRecord(store: Store, recordId = 'rec-batch'): Promise<Transition> {
  const genesis = storeGenesis(recordId, 'profile.p1', 'subject:s1');
  const res = await store.appendTransition(null, genesis, { nonTerminal: true });
  assert.equal(res.appended, true, 'fixture: the genesis append must land');
  return genesis;
}

/** finalize's own batch shape: two state-preserving consultations, then `confirmed`. */
export function successBatch(genesis: Transition): Transition[] {
  const cv = storeNext(genesis, 'consultation-recorded', {
    kind: 'chain-verify',
    checker: CHECKER,
    at: '2026-07-24T01:00:00.000Z',
    payloadDigest: transitionDigest(genesis),
    verdict: 'pass',
  });
  const facts = storeNext(cv, 'consultation-recorded', {
    kind: 'facts',
    checker: APPROVER,
    at: '2026-07-24T01:00:00.000Z',
    payloadDigest: `sha256:${'2'.repeat(64)}`,
    verdict: 'pass',
  });
  const confirmed = storeNext(facts, 'confirmed', { actor: APPROVER });
  return [cv, facts, confirmed];
}
```

Note: `store-constraints.test.ts:33` declares an identical `APPROVER` — its migrating tests
import the hoisted one; its residual tests keep no copy unless they use it (Step 7's grep
decides from the code, not from memory).

- [ ] **Step 3: Create the suite module skeleton**

`packages/record/test/conformance/store-conformance.ts`:

```ts
// @vidimera/record — test/conformance/store-conformance.ts: the backing-parameterized
// conformance suite — SPEC §12: an inheriting project's backings are "held equivalent by a
// single **backing-parameterized conformance suite** that is the executable definition of a
// correct `Store`". Every test in here drives a Store instance directly through the
// eight-method interface with hand-supplied meta flags; kernel-driven tests stay in their
// own files, and MemoryStore's own implementation decisions (the structuredClone /
// DataCloneError pins) stay in the backing-specific files — a SQL backing rejects a
// non-serializable payload differently, so that shape is not contract.
//
// TEST-ONLY module (not `.test.ts`): it registers nothing until a per-backing caller file
// invokes it — memory-store-conformance.test.ts is the one backing today; a future adapter
// adds its own caller and inherits every pin below.

import assert from 'node:assert/strict';
import { describe, test } from 'vitest';
import { genesisPrevHash, transitionDigest } from '../../src/chain/encoding.js';
import type { Store } from '../../src/store/store.js';
import type { IdentityAssertion, Transition } from '../../src/types.js';
import { storeGenesis, storeNext } from '../helpers/chain.js';
import { APPROVER, CHECKER, openRecord, successBatch } from '../helpers/store-fixtures.js';

/**
 * Registers the conformance suite for one backing. `makeStore` must return a FRESH, empty
 * store per call — tests share nothing. Synchronous by design: both present and
 * next-increment backings construct synchronously, and the suite is not public API.
 */
export function runStoreConformance(label: string, makeStore: () => Store): void {
  describe(`Store conformance: ${label}`, () => {
    // === putStaged / getStaged ======================================================
    // (migrated tests land here, Step 5)
    // === appendTransition: CAS, C1, C2, C3 ==========================================
    // === readChain / chainHead ======================================================
    // === freshness / no-retention ===================================================
    // === C4 seal-finality ===========================================================
    // === appendBatch ================================================================
    // === findNonTerminal ============================================================
    // === listDue ====================================================================
  });
}
```

(The section comments are scaffolding for Step 5's placement; delete any that end up empty.
Unused imports at this step are fine — Step 5 uses them; run the lint gate only after it.)

- [ ] **Step 4: Create the caller file**

`packages/record/test/memory-store-conformance.test.ts`:

```ts
// @vidimera/record — memory-store-conformance.test.ts: the in-memory backing's conformance
// proof — one call. The suite itself (and the inventory of what it pins) lives in
// conformance/store-conformance.ts; MemoryStore-specific pins stay in store-constraints.test.ts
// and store-batch.test.ts.

import { MemoryStore } from '../src/store/memory.js';
import { runStoreConformance } from './conformance/store-conformance.js';

runStoreConformance('MemoryStore', () => new MemoryStore());
```

- [ ] **Step 5: Migrate the 42 tests**

Move each test below into its suite section, applying ONLY the Global Constraints edit
whitelist. Worked example of the whole transformation (first migrating test):

Before (`store-constraints.test.ts:52`, top level):

```ts
test('putStaged/getStaged: round-trips a StagedDraft by id', async () => {
  const store = new MemoryStore();
  ...
```

After (inside the suite's describe, putStaged section):

```ts
    test('putStaged/getStaged: round-trips a StagedDraft by id', async () => {
      const store = makeStore();
      ...
```

**From `store-constraints.test.ts` — 27 tests, all except the three DataCloneError tests**
(titles verbatim; the file's line numbers at plan time in parentheses):
putStaged/getStaged round-trip (52), getStaged unknown → null (65), putStaged idempotent
(70), putStaged first-write-wins (84), getStaged FRESH value (109), genesis append succeeds
(143), CAS mismatch (154), genesis against existing recordId (165), C1 names the blocker
(179), C1 not across pairs (194), C1 clears when blocker terminal (204), C2 stale seq (225),
C2 retry with corrected seq (242), C3 blocks after terminal (262), C3 sealed carve-out (284),
C3 compromise carve-out (303), C3 admits while non-terminal (332), readChain/chainHead
unknown id (343), readChain/chainHead order + last digest (349), failed append does not
mutate chain (362), readChain FRESH transitions (387), non-genesis no-retention (420),
putStaged no-retention (442), genesis no-retention (470), C4 no further append (586), C4
bars the compromise edge (603), C4 in appendBatch entry-level index 0 (618).
**Stay (residual):** the three DataCloneError tests (498, 523, 547) and their private
`openedPayload` helper (40).

**From `store-batch.test.ts` — 9 tests, all except the throwing-clone test (202):**
happy path (56), entry-flag terminality (82), entry CAS index 0 (107), stale seq at its
element (119), C3 at entry (135), empty batch throws (150), cross-record element throws
(159), genesis-in-batch throws (177), post-batch state provable by CAS (224).
**Stay:** "a throwing clone applies nothing" (202).

**From `find-non-terminal.test.ts` — the 5 store-level tests** (unknown pair, non-terminal
genesis → recordId, matches-the-PAIR, C1 AGREEMENT, flag-flips-terminal → null — the file's
"store-level" section). **Stay:** the 8 kernel-level tests.

**From `due-listing.test.ts` — 1 test:** 'listDue applies NO state predicate — a due record
is listed whatever state it is in' (83). Its comment's sentence "It is the only test in this
file that does not go through the kernel, and that is why." breaks on relocation
(whitelist item 5) — replace that sentence with: "In this build only the genesis sets
`dueAt` and every state-leaving append clears it, so this scenario is constructible only by
driving the store directly." (keep the comment's preceding sentences).
**Stay:** the 3 kernel-driven tests.

- [ ] **Step 6: Delete the migrated tests from their source files**

Remove the moved test bodies (and store-batch's now-hoisted `APPROVER`/`CHECKER`/
`openRecord`/`successBatch` — its residual test imports them from
`./helpers/store-fixtures.js` instead). Remove imports each residual file no longer uses
(the lint gate catches leftovers).

- [ ] **Step 7: Rewrite the four residual headers**

Check residual-symbol usage first (decides imports, not memory):

```bash
git grep -n "APPROVER\|CHECKER\|openRecord\|successBatch\|openedPayload" -- packages/record/test/store-constraints.test.ts packages/record/test/store-batch.test.ts
```

`store-constraints.test.ts` header (replace the whole block comment at lines 1-22):

```ts
// @vidimera/record — store-constraints.test.ts: the MEMORY BACKING's own implementation
// decisions, pinned. The store CONTRACT pins that used to live here (CAS, C1-C4, freshness,
// first-write-wins) are in the backing-parameterized conformance suite
// (conformance/store-conformance.ts) since the fourth step-2 increment, run over this
// backing by memory-store-conformance.test.ts. What remains here is deliberately NOT
// contract: the store-clone decision (store/memory.ts) makes MemoryStore reject a
// function-valued payload member with `DataCloneError` (structuredClone's own error), and a
// different backing may reject such a payload differently — so these three pins bind THIS
// backing, not every conforming Store.
```

`store-batch.test.ts` header (replace lines 1-13):

```ts
// @vidimera/record — store-batch.test.ts: the MEMORY BACKING's batch-specific
// implementation pin. The `appendBatch` CONTRACT pins that used to live here are in the
// backing-parameterized conformance suite (conformance/store-conformance.ts) since the
// fourth step-2 increment. What remains: the all-or-nothing guarantee held against a THROW
// (structuredClone's DataCloneError mid-batch), which is MemoryStore's documented clone
// decision (store/memory.ts) rather than a shape the contract imposes on every backing.
```

`find-non-terminal.test.ts` header: replace the "Two layers…" paragraph with a sentence
saying the store-level layer lives in the conformance suite since the fourth step-2
increment, and this file keeps the kernel-level pins (flags from the library's own
derivation). Keep the header's SPEC citation and narrowing note.

`due-listing.test.ts` header: the file is now all-kernel; if the header enumerates the
store-driven exception, rewrite that sentence to point at the suite.

- [ ] **Step 8: The relocation gate — inventory and count**

```bash
git grep -hE "^[[:space:]]*test\(" -- packages/record/test | sed -E 's/^[[:space:]]+//' | sort > /tmp/titles-after.txt
diff /tmp/titles-before.txt /tmp/titles-after.txt && echo INVENTORY-IDENTICAL
```

Expected: `INVENTORY-IDENTICAL` — pure relocation changes no title and no count.

- [ ] **Step 9: Run the full gates**

`pnpm typecheck` · `pnpm lint` · `pnpm lint:strict` · `pnpm test` ·
`node scripts/contract-scan.mjs` — all green; test summary still 301 tests, zero skips, now
28 files; Biome infos ≤ 13 (relocated `useTemplate` infos are expected to move file);
`git diff --stat packages/record/src` prints nothing.

- [ ] **Step 10: Commit**

```bash
git add packages/record/test
git commit -m "Extract the store conformance suite, parameterized by backing

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(Append one body line per whitelist-item-5 comment rewrite, naming the test and the
sentence.)

---

### Task 2: The new listDue pins

**Files:**
- Modify: `packages/record/test/conformance/store-conformance.ts` (the listDue section)

**Interfaces:**
- Consumes: Task 1's `runStoreConformance` internals — the listDue section already holds the
  migrated no-state-predicate test; these three land beside it, using `storeGenesis`/
  `storeNext`/`APPROVER` already imported there.
- Produces: nothing downstream; these are the increment's only net-new tests.

- [ ] **Step 1: Write the three pins**

Add inside the suite's listDue section:

```ts
    test('listDue: the gate is dueAt ≤ now, boundary INCLUSIVE — at-the-instant is due, one ms later is not yet', async () => {
      // SPEC §12's gate, verbatim: `dueAt ≠ null AND dueAt ≤ now`. The migrated
      // no-state-predicate pin covers the state half; this one pins the comparison itself,
      // including equality, with the meta supplied by hand.
      const store = makeStore();
      const genesis = storeGenesis('rec-boundary', 'profile.p1', 'subject:s1');
      const dueAt = '2026-07-24T12:00:00.000Z';
      await store.appendTransition(null, genesis, { nonTerminal: true, dueAt });

      const justBefore = new Date(Date.parse(dueAt) - 1);
      assert.deepEqual(await store.listDue(justBefore), [], 'not due one ms early');
      assert.deepEqual(await store.listDue(new Date(dueAt)), ['rec-boundary'], 'due AT the instant — ≤, not <');
      const justAfter = new Date(Date.parse(dueAt) + 1);
      assert.deepEqual(await store.listDue(justAfter), ['rec-boundary'], 'still due after');
    });

    test('listDue: a record whose meta never carried dueAt is never listed', async () => {
      // SPEC §12: "A record with no bound is never listed, regardless of state."
      const store = makeStore();
      const genesis = storeGenesis('rec-unclocked', 'profile.p1', 'subject:s1');
      await store.appendTransition(null, genesis, { nonTerminal: true });
      assert.deepEqual(await store.listDue(new Date(Date.UTC(2100, 0, 1))), []);
    });

    test('listDue: presence sets, absence clears — an append whose meta omits dueAt clears the pending clock', async () => {
      // SPEC §12: "every state-leaving append that carries no new clock clears the column by
      // omission" — pinned here at the meta level, with no kernel involved: the store must
      // treat absence as clearing, not as keep-previous.
      const store = makeStore();
      const genesis = storeGenesis('rec-clearing', 'profile.p1', 'subject:s1');
      const dueAt = '2026-07-24T12:00:00.000Z';
      await store.appendTransition(null, genesis, { nonTerminal: true, dueAt });
      const past = new Date(Date.parse(dueAt) + 1000);
      assert.deepEqual(await store.listDue(past), ['rec-clearing'], 'fixture: listed while the clock is set');

      const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
      const res = await store.appendTransition('open', confirmed, { nonTerminal: false });
      assert.equal(res.appended, true, 'fixture: the state-leaving append must land');
      assert.deepEqual(await store.listDue(past), [], 'the omitted dueAt cleared the clock');
    });
```

Both quoted SPEC fragments must be verified against a whitespace-collapsed
`docs/concept/SPEC.md` §12 before committing (they were verified at plan time; re-verify if
reworded).

- [ ] **Step 2: Mutation-check each pin (they are green-on-first-run regression pins, not red-first TDD)**

For each of the three, temporarily break the assertion's subject locally and see it fail:
(a) boundary test — change `new Date(dueAt)` to `justBefore` in the equality assertion → the
test must FAIL; (b) never-listed test — hand the genesis append `dueAt` → FAIL; (c) clearing
test — hand the confirmed append `{ nonTerminal: false, dueAt }` → FAIL. Revert all three
edits. Record the three failing outputs in your report as the non-vacuity evidence.

- [ ] **Step 3: Run the focused file, then the full gates**

`pnpm test -- memory-store-conformance` → the suite passes with the three new tests.
Full gates all green; total now **304 tests / 28 files**, zero skips.

- [ ] **Step 4: Commit**

```bash
git add packages/record/test/conformance/store-conformance.ts
git commit -m "Pin listDue's gate at the store level, inside the suite

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: The record

**Files:**
- Modify: `docs/process/implementation-status.md` (two sites)
- Modify: `CLAUDE.md`, `README.md` (the step-2 sentences)

**Interfaces:**
- Consumes: Tasks 1-2 landed — the suite at `test/conformance/store-conformance.ts`, run by
  `memory-store-conformance.test.ts`, 304 tests total.
- Produces: nothing downstream; this task is the increment's record.

- [ ] **Step 1: implementation-status.md, site 1 — the steps table (step 2 row)**

Replace the row's status cell with:

> **Started, not exited** — four increments in: the first landed `appendBatch`, `listDue`,
> and the `meta = { nonTerminal, dueAt? }` migration on both append methods; the second
> added §12's C4 seal-finality bar and the operator-only `seal()` seam; the third landed
> `findNonTerminal`, completing the eight-method Store contract; the fourth extracted the
> backing-parameterized conformance suite (test-side,
> `packages/record/test/conformance/store-conformance.ts`, run over the in-memory backing
> by a one-call test file) — all still inside the one in-memory backing, which is why the
> step has not exited; the caller-transaction seam (`tx?`), a real SQL adapter and the
> cross-backing byte-identical-chains test are still not built — see the §12 row and the
> eight-of-eight boundary below

- [ ] **Step 2: implementation-status.md, site 2 — the §12 row's proof-structure sentence**

Replace (in the Not-built column):

> One backing ships (in-memory), so §12's reference-adapter proof structure — SQL adapters,
> a "backing-parameterized conformance suite", a cross-backing "byte-identical chains" test
> — has nothing to run over.

with:

> One backing still ships (in-memory), and half of §12's reference-adapter proof structure
> now exists: the "backing-parameterized conformance suite" is built (test-side,
> `test/conformance/store-conformance.ts`, at the fourth step-2 increment — 42 migrated
> store-driven pins plus three store-level `listDue` pins, run over the memory backing by a
> one-call caller file; whether it is ever exported as an adapter-author's tool is a
> 0.1-cut question alongside register row 6's review, deliberately not decided now). The
> SQL adapters and the cross-backing "byte-identical chains" test remain unbuilt, so the
> cross-backing half of the proof still has nothing to run over.

If the surrounding cell's exact current text differs from the quoted "replace" block, match
what is actually there (read it first) and preserve the rest of the cell.

- [ ] **Step 3: CLAUDE.md and README.md step-2 sentences**

In CLAUDE.md, the step-2 sentence currently reads "three increments have landed … and
`findNonTerminal`, completing the eight-method Store contract — all still inside the one
in-memory backing, which is why the step has not exited." Change "three increments" to
"four increments" and extend the landed list with ", and the backing-parameterized
conformance suite (test-side, run over that one backing)" before the "— all still inside"
clause. README.md carries a sibling sentence — read it and apply the same transformation in
that file's own wrapping. Content is fixed; byte layout follows each file.

- [ ] **Step 4: The sweep — repo-root-wide, including the deictic pattern**

```bash
git grep -lni -E "three increments|nothing to run over|this increment" -- .
```

Open every hit and classify: live claims about the current tree must be correct (the sites
above); `docs/concept/` is never touched; dated plans/specs (including this increment's own)
are history — correct only a present-tense claim about the current tree, in that document's
own convention. The specific checks: no live document says "three increments"; no live
document says the proof structure has "nothing to run over" without the cross-backing
qualification; no CURRENT-STATE table row in implementation-status.md says a bare
"this increment" (the previous increment's fix relabeled them all — do not reintroduce one).

- [ ] **Step 5: Contract scan and full gates**

`node scripts/contract-scan.mjs` silent; all five gates green, 304 tests, zero skips.

- [ ] **Step 6: Commit**

```bash
git add docs/process/implementation-status.md CLAUDE.md README.md
git commit -m "Record the suite: half of the proof structure now runs

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(Add any additional file Step 4 corrected.)

---

### Task 4: Exit verification

**Files:** none modified — verification only. Do not edit, do not commit; a failed check is
a finding to report.

**Interfaces:**
- Consumes: everything Tasks 1-3 landed.
- Produces: the increment's verified exit state.

- [ ] **Step 1: Gates from a clean tree**

`git status --short` clean, then all five gates. Expected: exit 0 across the board; **304
tests / 28 files / zero skips**; scan silent; Biome infos ≤ 13.

- [ ] **Step 2: The src-diff and oracle checks**

```bash
git diff --stat 726b997..HEAD -- packages/record/src
git log --oneline 726b997..HEAD -- packages/record/test/byte-stability.test.ts
```

Expected: both print nothing — src untouched by the whole increment, oracle untouched. Any
output is a stop-and-halt to report.

- [ ] **Step 3: The relocation inventory, end to end**

```bash
git grep -hE "^[[:space:]]*test\(" -- packages/record/test | sed -E 's/^[[:space:]]+//' | sort > /tmp/titles-final.txt
diff /tmp/titles-before.txt /tmp/titles-final.txt
```

Expected: exactly three additions (the Task 2 listDue titles), zero removals. If
`/tmp/titles-before.txt` no longer exists, regenerate the equivalent from the pre-increment
commit: `git stash list` is irrelevant — use
`git show 726b997 -- packages/record/test` via a worktree only if needed; otherwise rely on
Task 1's committed inventory evidence in its report.

- [ ] **Step 4: The sweep, re-run**

Task 3 Step 4's command, confirming survivors are normative/historical only.

- [ ] **Step 5: Report**

Gate outputs, the final counts, the three commits' hashes, and the inventory diff. Do not
mark the increment done with any check red.
