# `findNonTerminal` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `findNonTerminal(profileId, subjectRef)` — the eighth and last Store method
SPEC §12 gives a signature to — so a host that draws `record-exists` has a supported way to
find the record blocking it.

**Architecture:** One read method on the `Store` interface, implemented in `MemoryStore` by
extracting C1's existing exclusivity scan into a private predicate both callers share — so
the record `findNonTerminal` returns and the `blockingRecordId` a rejected genesis names
agree by construction. Six test doubles gain a one-line delegation. The process documents
move in the same increment.

**Tech Stack:** TypeScript (strict, `noEmit`), vitest, Biome, pnpm workspace (Node 22+).

**Spec:** `docs/superpowers/specs/2026-08-12-find-non-terminal-design.md` — read it first.

## Global Constraints

- **The standalone contract:** no external URLs, repos, or project names in any file. Run
  `node scripts/contract-scan.mjs` before every commit; it must exit 0 with no output.
  **Diff the scan output, never compare totals.**
- **All five gates green at every commit:** `pnpm typecheck` · `pnpm lint` ·
  `pnpm lint:strict` · `pnpm test` (zero skips) · `node scripts/contract-scan.mjs`.
- **The byte-stability oracle:** the four digest literals in
  `packages/record/test/byte-stability.test.ts` must not move. A moved digest is a
  stop-and-halt, never a literal to update. This increment touches no write path, so any
  movement means something went badly wrong.
- **No maturity marker moves** in `docs/concept/` — that set is sealed. §12 is `[PROVEN]`
  already; `docs/process/implementation-status.md` is the substitute exit record.
- **SPEC citations in TypeScript must resolve:** the contract scan checks that a `SPEC §N`
  names a real section and that a quoted phrase attached to a citation occurs in the cited
  document. The quotes in this plan were verified against `docs/concept/SPEC.md` §12;
  re-verify against a whitespace-collapsed copy if you reword them.
- **Commit messages:** terse imperative subject in the repo's voice, ending with
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: The method — tests, interface, implementation, doubles

**Files:**
- Create: `packages/record/test/find-non-terminal.test.ts`
- Modify: `packages/record/src/store/store.ts` (interface + two stale comment sites)
- Modify: `packages/record/src/store/memory.ts` (extract predicate, add method)
- Modify: `packages/record/test/helpers/stores.ts` (header + 3 delegations)
- Modify: `packages/record/test/exclusivity.test.ts` (`RaceStore` delegation)
- Modify: `packages/record/test/terminality.test.ts` (`BatchConflictStore`,
  `RaceThenAppendStore` delegations)

**Interfaces:**
- Consumes: `MemoryStore`, `storeGenesis`/`storeNext` (`test/helpers/chain.ts`),
  `captureProfile`/`effectSeamProfile`/`makeConfig`/`identity`/`facts`/`openRecord`/
  `DEFAULT_SUBJECT_REF` (`test/helpers/profiles.ts`), `create`/`createWithClock`
  (`src/create.ts`).
- Produces: `Store.findNonTerminal(profileId: string, subjectRef: string): Promise<string | null>`
  — Task 2's documents describe exactly this signature.

- [ ] **Step 1: Write the failing test file**

Create `packages/record/test/find-non-terminal.test.ts` with exactly this content:

```ts
// @vidimera/record — find-non-terminal.test.ts (SPEC §12's liveness reads): the eighth
// Store method, `findNonTerminal(profileId, subjectRef)` — SPEC §12: "the re-emit binding
// that makes `record-exists` actionable, and the same record C1 names as the blocker".
//
// Two layers, because the method has both a store-level contract and a kernel-level
// purpose:
//   - store-level: a MemoryStore driven directly (store-constraints.test.ts style), the
//     flags supplied by hand;
//   - kernel-level: records driven through create()/createWithClock, the flags coming from
//     the library's own terminality derivation (nonterminal.ts), so each test pins what a
//     HOST would actually observe.
//
// NARROWING, pinned here and recorded in store.ts: §12 says the method "returns the live
// non-terminal record for the pair (or nothing)"; this build returns the recordId, on the
// same reasoning as listDue's ids-not-records narrowing.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create, createWithClock } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import { storeGenesis, storeNext } from './helpers/chain.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };

// === store-level: the contract, flags supplied by hand ================================

test('findNonTerminal() on an unknown pair -> null', async () => {
  const store = new MemoryStore();
  assert.equal(await store.findNonTerminal('p-none', 's-none'), null);
});

test('findNonTerminal() after a non-terminal genesis -> that recordId', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-1', 'p-1', 's-1');
  const landed = await store.appendTransition(null, genesis, { nonTerminal: true });
  assert.equal(landed.appended, true, 'fixture: the genesis must land');
  assert.equal(await store.findNonTerminal('p-1', 's-1'), 'rec-1');
});

test('findNonTerminal() matches the PAIR, not either half', async () => {
  const store = new MemoryStore();
  await store.appendTransition(null, storeGenesis('rec-1', 'p-1', 's-1'), {
    nonTerminal: true,
  });
  assert.equal(await store.findNonTerminal('p-1', 's-other'), null);
  assert.equal(await store.findNonTerminal('p-other', 's-1'), null);
});

test('C1 AGREEMENT: a rejected genesis names the same record findNonTerminal returns', async () => {
  // SPEC §12's C1: "A rejected genesis append names the **blocking** record — the live
  // non-terminal record for the pair, the same record `findNonTerminal` returns." The
  // implementation shares one predicate between the two; this test pins the agreement
  // OBSERVABLY, so a future backing that implements them separately still has to honor it.
  const store = new MemoryStore();
  await store.appendTransition(null, storeGenesis('rec-blocker', 'p-1', 's-1'), {
    nonTerminal: true,
  });
  const rejected = await store.appendTransition(
    null,
    storeGenesis('rec-second', 'p-1', 's-1'),
    { nonTerminal: true },
  );
  assert.equal(rejected.appended, false);
  if (rejected.appended) return;
  assert.equal(rejected.conflict, 'exclusivity');
  if (rejected.conflict !== 'exclusivity') return;
  assert.equal(rejected.blockingRecordId, await store.findNonTerminal('p-1', 's-1'));
});

test('findNonTerminal() after the persisted flag flips terminal -> null', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-1', 'p-1', 's-1');
  await store.appendTransition(null, genesis, { nonTerminal: true });
  const expired = storeNext(genesis, 'expired', { deadline: '2026-07-24T01:00:00.000Z' });
  const landed = await store.appendTransition('open', expired, { nonTerminal: false });
  assert.equal(landed.appended, true, 'fixture: the expired edge must land');
  assert.equal(await store.findNonTerminal('p-1', 's-1'), null);
});

// === kernel-level: the flags coming from the library's own derivation =================

test('an OPEN record is the live non-terminal record for its pair', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  assert.equal(await store.findNonTerminal('test.capture.v1', DEFAULT_SUBJECT_REF), recordId);
});

test('staging alone creates no record: findNonTerminal stays null', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const staged = await handles.agent.stage(CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  assert.equal(staged.status, 'ok', 'fixture: staging must succeed');
  assert.equal(await store.findNonTerminal('test.capture.v1', DEFAULT_SUBJECT_REF), null);
});

test('a pure-capture final-leg CONFIRMED record is terminal: findNonTerminal -> null', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  assert.equal(await store.findNonTerminal('test.capture.v1', DEFAULT_SUBJECT_REF), null);
});

test('an EXPIRED record is terminal: findNonTerminal -> null', async () => {
  // The expiry idiom from seal.test.ts / expiry.test.ts: the clock is INJECTED via
  // createWithClock and finalize expires the due record en passant. Never sleep in a test.
  const TTL = 3600;
  let nowMs = Date.UTC(2026, 0, 1, 0, 0, 0);
  const clock = () => new Date(nowMs);
  const store = new MemoryStore();
  const handles = createWithClock(makeConfig([captureProfile({ ttl: TTL })], { store }), clock);
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  assert.equal(
    await store.findNonTerminal('test.capture.v1', DEFAULT_SUBJECT_REF),
    recordId,
    'fixture: the open record is the live non-terminal record before it lapses',
  );

  nowMs += (TTL + 1) * 1000; // past the open window
  const lapsed = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(lapsed.status, 'refused', 'fixture: the due record expires en passant');
  assert.equal(await store.findNonTerminal('test.capture.v1', DEFAULT_SUBJECT_REF), null);
});

test('a TERMINAL REFUSED record: findNonTerminal -> null', async () => {
  // A leg listing identity-authority-refused in terminalRefusals makes that refusal append
  // open -> refused, leaving the record terminal (SPEC §8's append semantics).
  const store = new MemoryStore();
  const handles = create(
    makeConfig([captureProfile({ terminalRefusals: ['identity-authority-refused'] })], {
      store,
    }),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const refusedOutcome = await handles.operator.finalize(
    recordId,
    identity({ authority: 'session:wrong-app' }),
    CONTENT,
    facts(),
  );
  assert.equal(refusedOutcome.status, 'refused');
  if (refusedOutcome.status !== 'refused') return;
  assert.equal(refusedOutcome.code, 'identity-authority-refused');
  assert.equal(await store.findNonTerminal('test.capture.v1', DEFAULT_SUBJECT_REF), null);
});

test('an EFFECT-SEAM confirmed record IS the live non-terminal record (row 9 made visible)', async () => {
  // SPEC §2 makes a final-leg `confirmed` on an effect-seam profile NON-terminal (awaiting
  // redemption). This is deferral register row 9's held (profile, subject) pair made
  // VISIBLE: findNonTerminal is how a host discovers which record holds it. Located, not
  // released — the hold lives in C1 and nothing this method returns changes it.
  const store = new MemoryStore();
  const handles = create(makeConfig([effectSeamProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  assert.equal(await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF), recordId);
});

test('a SEALED record stays invisible: findNonTerminal -> null', async () => {
  // SPEC §12 admits seal() only against a derived-terminal record, so the persisted flag
  // was already false before the seal; the state-preserving `sealed` append keeps it false.
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  const sealed = await handles.operator.seal(recordId);
  assert.equal(sealed.status, 'ok', 'fixture: the terminal record must seal');
  assert.equal(await store.findNonTerminal('test.capture.v1', DEFAULT_SUBJECT_REF), null);
});

test('END-TO-END ACTIONABILITY: record-exists -> findNonTerminal -> review()', async () => {
  // SPEC §12: "the re-emit binding that makes `record-exists` actionable". The flow: a
  // second open() on a held pair refuses record-exists with no locator field (by design —
  // §8's outcome model is untouched); the host, holding the profileId and subjectRef it
  // just tried, asks the Store which record blocks it, and can then review that record.
  const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);
  const clock = () => new Date(T0); // fixed clock: the blocker never lapses
  const store = new MemoryStore();
  const handles = createWithClock(makeConfig([captureProfile({ ttl: 3600 })], { store }), clock);

  const recordA = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  const staged = await handles.agent.stage(
    { subject: 'week-2', total: 41 },
    'test.capture.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(staged.status, 'ok', 'fixture: the second draft must stage');
  if (staged.status !== 'ok') return;
  const second = await handles.operator.open(staged.value.stagedRef);
  assert.equal(second.status, 'refused');
  if (second.status !== 'refused') return;
  assert.equal(second.code, 'record-exists');

  const blocker = await store.findNonTerminal('test.capture.v1', DEFAULT_SUBJECT_REF);
  assert.equal(blocker, recordA, 'the lookup names the record that drew the refusal');
  if (blocker === null) return;

  const view = await handles.operator.review(blocker);
  assert.equal(view.status, 'ok', 'the located blocker is reviewable');
});
```

- [ ] **Step 2: Run the test file to verify it fails**

Run: `pnpm test -- find-non-terminal`
Expected: every test FAILS with `TypeError: store.findNonTerminal is not a function`.
(vitest strips types without checking them, so the missing method surfaces at runtime.)

- [ ] **Step 3: Add the method to the `Store` interface**

In `packages/record/src/store/store.ts`, after the `listDue` declaration (inside the
`Store` interface, before its closing `}`), add:

```ts
  /**
   * The live non-terminal record for the pair, or `null` — SPEC §12: "the re-emit binding
   * that makes `record-exists` actionable, and the same record C1 names as the blocker".
   * A host that draws `record-exists` from `open()` holds the `(profileId, subjectRef)` it
   * just tried; this read turns that pair into the blocking record's id.
   *
   * NARROWED from SPEC §12, which says this "returns the live non-terminal record for the
   * pair (or nothing)": this build returns the recordId, on the same reasoning as
   * `listDue` — the id is what every downstream seam takes (`review`, `readChain`,
   * `replay`), and returning a full record would require the store to replay chains it
   * deliberately does not interpret. Freshness (SPEC §12: "All reads return fresh values")
   * is satisfied structurally — a string is immutable, so there is nothing to clone.
   */
  findNonTerminal(profileId: string, subjectRef: string): Promise<string | null>;
```

In the same file, fix the now-stale interface doc comment. Replace:

```
 * The provisional Store — a strict SUBSET of the storage surface SPEC §12 names, not a
 * transcription of it. Shipped here: `putStaged`/`getStaged`/`appendTransition`/
 * `readChain`/`chainHead`/`appendBatch`/`listDue`. NOT built in this build step:
 * `findNonTerminal` — the sole absence. `seal` is not a Store method at all: SPEC §9 lists
```

with:

```
 * The provisional Store — SPEC §12's storage surface, complete at the method level: all
 * eight methods §12 gives a signature to are shipped here — `putStaged`/`getStaged`/
 * `appendTransition`/`readChain`/`chainHead`/`appendBatch`/`listDue`/`findNonTerminal`.
 * `seal` is not a Store method at all: SPEC §9 lists
```

- [ ] **Step 4: Implement in `MemoryStore` by extracting C1's scan**

In `packages/record/src/store/memory.ts`, add a private helper to the `MemoryStore` class
(place it directly above `appendGenesis`):

```ts
  /**
   * The C1 exclusivity scan (SPEC §12's C1: a partial `UNIQUE(profileId, subjectRef)` over
   * the persisted non-terminal flag), shared by `appendGenesis`'s rejection path and
   * `findNonTerminal` — SPEC §12: "A rejected genesis append names the **blocking**
   * record — the live non-terminal record for the pair, the same record `findNonTerminal`
   * returns." ONE predicate, so the two agree by construction rather than by parallel
   * code; find-non-terminal.test.ts pins the agreement observably as well. A linear scan,
   * hand-simulating the partial unique index a real adapter would query — correct for the
   * provisional in-memory backing.
   */
  private liveNonTerminalFor(profileId: string, subjectRef: string): StoredRecord | undefined {
    for (const record of this.records.values()) {
      if (
        record.nonTerminal &&
        record.profileId === profileId &&
        record.subjectRef === subjectRef
      ) {
        return record;
      }
    }
    return undefined;
  }
```

In `appendGenesis`, replace the inline C1 scan:

```ts
    // C1 exclusivity (SPEC §12's C1: a partial `UNIQUE(profileId, subjectRef)` over the
    // persisted non-terminal flag). A partial-UNIQUE-index scan,
    // hand-simulated as a linear scan over every currently-tracked record — correct
    // for the provisional in-memory backing; a real adapter enforces the same
    // predicate via an actual partial unique index.
    for (const other of this.records.values()) {
      if (
        other.nonTerminal &&
        other.profileId === payload.profileId &&
        other.subjectRef === payload.subjectRef
      ) {
        return { appended: false, conflict: 'exclusivity', blockingRecordId: other.id };
      }
    }
```

with:

```ts
    // C1 exclusivity (SPEC §12's C1) — the scan lives in `liveNonTerminalFor`, shared with
    // `findNonTerminal` so the blocker named here and the record that method returns agree
    // by construction (see the helper's own doc comment).
    const blocker = this.liveNonTerminalFor(payload.profileId, payload.subjectRef);
    if (blocker !== undefined) {
      return { appended: false, conflict: 'exclusivity', blockingRecordId: blocker.id };
    }
```

Then add the public method, placed after `listDue` at the end of the class:

```ts
  async findNonTerminal(profileId: string, subjectRef: string): Promise<string | null> {
    return this.liveNonTerminalFor(profileId, subjectRef)?.id ?? null;
  }
```

- [ ] **Step 5: Run typecheck to enumerate the broken doubles**

Run: `pnpm typecheck`
Expected: FAIL — every class that `implements Store` without the new method is named.
Cross-check the list against: `git grep -n "implements Store" -- packages/`
Measured at plan time that is six doubles: `TamperingStore`, `CountingStore`,
`RaceOnceStore` (`test/helpers/stores.ts`), `RaceStore` (`test/exclusivity.test.ts`),
`BatchConflictStore`, `RaceThenAppendStore` (`test/terminality.test.ts`). Trust the
compiler's list over this paragraph.

- [ ] **Step 6: Add the delegations**

Every double wraps an inner `MemoryStore`; each gets a one-line delegation beside its
existing `listDue` delegation, in that class's own parameter-name style. For the
short-name classes (`TamperingStore`, `RaceOnceStore`, `BatchConflictStore`, and
`RaceThenAppendStore` if it uses short names — match what you see):

```ts
  findNonTerminal(p: string, s: string): Promise<string | null> {
    return this.inner.findNonTerminal(p, s);
  }
```

For the full-name classes (`CountingStore`, `RaceStore`):

```ts
  findNonTerminal(profileId: string, subjectRef: string): Promise<string | null> {
    return this.inner.findNonTerminal(profileId, subjectRef);
  }
```

In `test/helpers/stores.ts`, also rewrite the stale header claim. Replace:

```
// @vidimera/record — test/helpers/stores.ts: shared Store test-doubles, down-ported to
// this build step's seven-of-eight-method Store contract (`putStaged`/`getStaged`/
// `appendTransition`/`readChain`/`chainHead`/`appendBatch`/`listDue` — no
// `findNonTerminal`; a later-phase Store surface. `seal` is not and never was a Store
// method — it is an operator-only seam built atop these, SPEC §9/§12). Three shapes fold the
```

with:

```
// @vidimera/record — test/helpers/stores.ts: shared Store test-doubles over the full
// eight-method Store contract (`putStaged`/`getStaged`/`appendTransition`/`readChain`/
// `chainHead`/`appendBatch`/`listDue`/`findNonTerminal` — every double delegates each to
// its inner MemoryStore. `seal` is not and never was a Store
// method — it is an operator-only seam built atop these, SPEC §9/§12). Three shapes fold the
```

- [ ] **Step 7: Run typecheck and the new tests to verify green**

Run: `pnpm typecheck` — Expected: PASS (exit 0).
Run: `pnpm test -- find-non-terminal` — Expected: all tests in the new file PASS.

- [ ] **Step 8: Run the full gates**

Run all five: `pnpm typecheck` · `pnpm lint` · `pnpm lint:strict` · `pnpm test` ·
`node scripts/contract-scan.mjs`.
Expected: all exit 0; the full suite passes with zero skips (the pre-existing 13 Biome
infos are known and allowed); the contract scan prints nothing. Confirm
`git diff --stat packages/record/test/byte-stability.test.ts` is empty.

- [ ] **Step 9: Commit**

```bash
git add packages/record/src/store/store.ts packages/record/src/store/memory.ts \
  packages/record/test/find-non-terminal.test.ts packages/record/test/helpers/stores.ts \
  packages/record/test/exclusivity.test.ts packages/record/test/terminality.test.ts
git commit -m "Build findNonTerminal, the eighth Store method, on C1's own scan

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: The record — register, exit record, CLAUDE.md, and the sweep

**Files:**
- Modify: `docs/process/deferral-register.md` (row 13, rewritten in place)
- Modify: `docs/process/implementation-status.md` (six sites, named below)
- Modify: `CLAUDE.md` (the step-2 sentence)

**Interfaces:**
- Consumes: Task 1's landed method — `findNonTerminal(profileId: string, subjectRef: string): Promise<string | null>`
  on `Store`, implemented in `MemoryStore` via the shared `liveNonTerminalFor` predicate.
- Produces: nothing downstream; this task is the increment's record.

- [ ] **Step 1: Rewrite deferral register row 13 in place**

Replace row 13's first cell (the long description; keep the row number and the recorded
date `2026-08-04`) with:

> The caller-supplied transaction seam — `tx?`, the optional transaction SPEC §12 puts on
> every write — is the one piece of §12's Store surface still unbuilt: an in-memory backing
> has no transaction to receive it, so the parameter would be structurally ignored. §12's
> provisionality clause covers argument lists ("What is durable is the *behaviour* each
> method guarantees, not its argument list."), so this absence sits inside that latitude,
> exactly as it always did. THE METHOD GAP IS CLOSED, this increment:
> `findNonTerminal(profileId, subjectRef)` is built (`store/store.ts`, `store/memory.ts`),
> the eighth of the eight Store methods §12 gives a signature to, implemented on C1's own
> scan predicate so the record it returns and the `blockingRecordId` a rejected genesis
> names agree by construction — and by a pinned test
> (`packages/record/test/find-non-terminal.test.ts`). Every earlier version of this row
> said a Store missing the method "implements PART of §12's surface and does not conform to
> §12"; that was true until it landed, and it is the nonconformance this increment closed
> by building the method rather than reading it away. Two narrowings stay recorded:
> `listDue` and `findNonTerminal` both return recordIds where §12 says records — ids are
> what the operator sweep and the re-emit flow need (every seam either would drive takes a
> recordId), and returning full records would require the store to replay chains it
> deliberately does not interpret. A third-party adapter author must not read the shipped
> surface as the whole contract while `tx?` remains

Replace the row's trigger cell (`Build step 2`) with:

> The first real adapter — the build task that first has a transaction to pass

- [ ] **Step 2: Update `docs/process/implementation-status.md` — six sites**

**Site 1, the steps table (step 2 row).** Replace the row's status cell with:

> **Started, not exited** — three increments in: the first landed `appendBatch`, `listDue`,
> and the `meta = { nonTerminal, dueAt? }` migration on both append methods; the second
> added §12's C4 seal-finality bar and the operator-only `seal()` seam; the third landed
> `findNonTerminal`, completing the eight-method Store contract — all still inside the one
> in-memory backing, which is why the step has not exited; the caller-transaction seam
> (`tx?`), a real SQL adapter, the backing-parameterized conformance suite and the
> cross-backing byte-identical-chains test are still not built — see the §12 row and the
> eight-of-eight boundary below

**Site 2, the §9 row.** Replace its closing sentence:

> Exclusivity is enforced but not *actionable*: a `record-exists` refusal names no blocking
> record, §12's `findNonTerminal` being absent — see the §12 row

with:

> Exclusivity is enforced in the store's constraint and, since the third step-2 increment,
> *actionable*: a `record-exists` refusal still names no blocking record in the `Outcome`
> (§8's model is untouched, by design), and the host locates the blocker itself through the
> Store's `findNonTerminal` — see the §12 row

**Site 3, the §12 row, Built column.** Replace its opening phrase "Seven of the eight
`Store` methods §12 gives a signature to" with "All eight `Store` methods §12 gives a
signature to — `findNonTerminal` landed the third step-2 increment", and append to the
cell:

> **`findNonTerminal`, built this increment**: `(profileId, subjectRef)` to the blocking
> recordId or null, implemented on C1's own scan predicate (`liveNonTerminalFor`) so the
> record it returns and the `blockingRecordId` a rejected genesis names agree by
> construction, with the agreement also pinned observably by test; narrowed like `listDue`
> — it returns the recordId where §12 says "the live non-terminal record", ids being what
> every downstream seam takes, and full records requiring the store to replay chains it
> deliberately does not interpret

**Site 4, the §12 row, Not-built column.** Replace the cell's opening ("`findNonTerminal`
is the one absent method. What remains of the signature divergence is `tx?` alone: …") and
its "The absence of `findNonTerminal` still costs a host something concrete …
`open()` holds C1's `blockingRecordId` internally and discards it; no field of a refused
`Outcome` could carry it out." passage with:

> The signature divergence is `tx?` alone: §12 puts an optional caller-supplied transaction
> on every write, and neither `appendTransition` nor `appendBatch` accepts one — an
> in-memory backing has no transaction to receive it. `open()` still holds C1's
> `blockingRecordId` internally and discards it, and a refused `Outcome` still carries no
> locator field — by design now rather than by gap: the host performs the lookup through
> the Store read §12 provides for exactly that purpose.

Keep the cell's remaining sentences (the `listDue` narrowing, the sweep-not-built pointer
to the §9 row, the one-backing / conformance-suite absence) — they all stay true; adjust
the final pointer to say "See the eight-of-eight boundary below".

**Site 5, the named boundary.** Retitle "**The store is seven of eight.**" to "**The store
is eight of eight.**" and rewrite the paragraph to say: all eight methods are built,
`findNonTerminal` having landed this increment; keep the denominator-correction history the
paragraph already carries (nine → eight, `seal` never a Store method) as history; state
that what remains of the signature divergence is `tx?` alone, covered by the provisionality
clause, which never covered an absent method — which is why the gap was a nonconformance
while it lasted and why it closed by building; and note row 13 does not retire but is
rewritten in place to carry `tx?` with its trigger moved to the first real adapter.

**Site 6, the Still-outstanding list.** Replace the Row 13 bullet with:

> - **Row 13** — the caller-supplied transaction seam (`tx?`), the one piece of §12's write
>   signatures still unbuilt; the Store's eight methods are all present as of this
>   increment. Trigger: the first real adapter. See the eight-of-eight boundary above.

- [ ] **Step 3: Update `CLAUDE.md`'s step-2 sentence**

Replace, in the step-2 sentence of the "What this project is" section:

```
Step 2 — the store, for real — is **started and has not exited**: two
increments have landed the atomic `appendBatch`, `listDue`, §12's
`{ nonTerminal, dueAt? }` meta shape on both append seams, the C4 seal-finality bar,
and the operator-only `seal()` chain-retirement seam with its derived
`active`/`retired` status — all still inside the one in-memory backing, which is why
the step has not exited.
```

with:

```
Step 2 — the store, for real — is **started and has not exited**: three
increments have landed the atomic `appendBatch`, `listDue`, §12's
`{ nonTerminal, dueAt? }` meta shape on both append seams, the C4 seal-finality bar,
the operator-only `seal()` chain-retirement seam with its derived
`active`/`retired` status, and `findNonTerminal`, completing the eight-method Store
contract — all still inside the one in-memory backing, which is why
the step has not exited.
```

(Match the file's actual line wrapping when editing; the wrapped text above is the
content, not the exact byte layout.)

- [ ] **Step 4: Run the sweep and settle every hit**

Run:

```bash
git grep -lni -E "seven of eight|7 of 8|findnonterminal" -- docs/ packages/ CLAUDE.md
```

For each hit, open it and classify: **live** claims about the current tree must be correct
after this increment (the sites above, plus anything the grep finds that this plan missed);
**normative** (`docs/concept/SPEC.md`) is never touched; **dated/completed** documents
(the step-1 review, `docs/process/adopted-source-provenance.md`, prior plans and specs,
and this increment's own spec and plan) are left as history — **unless** a claim in them is
written in the present tense about the current tree, in which case correct it in that
document's own convention (the step-1 review appends labelled corrections; the provenance
document was corrected the same way at `f38fd64`). The specific check: after this step, no
document may state in the present tense that `findNonTerminal` is absent or that the store
is seven of eight.

- [ ] **Step 5: Run the contract scan and the full gates**

Run: `node scripts/contract-scan.mjs` — Expected: no output, exit 0.
Run: `pnpm typecheck` · `pnpm lint` · `pnpm lint:strict` · `pnpm test` — all green, zero
skips.

- [ ] **Step 6: Commit**

```bash
git add docs/process/deferral-register.md docs/process/implementation-status.md CLAUDE.md
git commit -m "Record the eighth method: row 13 narrows to tx?, the count moves to eight

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(If Step 4 corrected any additional document, add it to the same commit.)

---

### Task 3: Exit verification

**Files:** none modified — this task only verifies.

**Interfaces:**
- Consumes: everything Tasks 1–2 landed.
- Produces: the increment's verified exit state.

- [ ] **Step 1: Re-run all five gates from a clean tree**

Confirm `git status --short` is clean, then run: `pnpm typecheck` · `pnpm lint` ·
`pnpm lint:strict` · `pnpm test` · `node scripts/contract-scan.mjs`.
Expected: all exit 0; test count strictly greater than 288 (the pre-increment count) with
zero skips; scan silent. Diff the scan output against empty, not its total.

- [ ] **Step 2: Re-run both sweep commands and confirm survivors**

```bash
git grep -n "implements Store" -- packages/
git grep -lni -E "seven of eight|7 of 8|findnonterminal" -- docs/ packages/ CLAUDE.md
```

Expected: every `implements Store` class typechecks (gate 1 already proved it — this is
the visual cross-check); every grep survivor is normative, dated-historical, or a
correct present-tense claim. No document states the method is absent.

- [ ] **Step 3: Confirm the oracle**

Run: `git log --oneline -3 -- packages/record/test/byte-stability.test.ts`
Expected: no commit from this increment touches it. If one does, STOP — do not proceed,
do not amend; report it.

- [ ] **Step 4: Report**

State the gate outputs, the new test count, and the two commits' hashes. Do not mark the
increment done with any gate red or any sweep survivor unresolved.
