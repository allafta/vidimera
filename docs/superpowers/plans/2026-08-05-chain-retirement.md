# Chain retirement (`seal` / `retired`) — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SPEC §12's C4 seal-finality and the operator-only `seal()` seam, so a
derived-terminal record can be retired: verified, capped with a state-preserving `sealed`
transition, and thereafter closed to every further append.

**Architecture:** C4 is a store constraint (a persisted `sealed` flag barring all later
appends); `seal()` is a library seam that verifies the chain, checks derived-terminality, and
appends through the existing `appendTransition`. **No new `Store` method.** `replay` gains a
`sealed` arm folding to a derived `status: 'active' | 'retired'` on `DecisionRecord`.

**Tech Stack:** TypeScript 7.0.2 (strict, `noUncheckedIndexedAccess`, NodeNext, `noEmit`),
vitest 4.1.10, Biome 2.5.6, pnpm 11.18.0, Node ≥22. Zero runtime dependencies.

**Design document:** `docs/superpowers/specs/2026-08-05-chain-retirement-design.md`. Read it
before Task 1 — it carries the reasoning this plan only executes.

## A correction to the design's unit order

The design proposed store → seam → replay → record. **That order does not work**, and the plan
below uses store → replay → seam → record instead.

`seal()`'s already-sealed gate reads the record through `replay()`, and `replay` currently
**throws** on a `sealed` transition. If the seam lands before the replay arm, the one gate that
must detect an already-sealed record cannot run at all. Replay comes second.

## Global Constraints

Every task's requirements implicitly include this section.

- **`docs/concept/` is SEALED.** Not one byte. A needed change there is a stop-and-report for
  the human, never an edit.
- **The four byte-stability digest literals in `packages/record/test/byte-stability.test.ts`
  are an oracle.** A feature-free finalize chain contains no `sealed` transition, so nothing
  here can move them. If one moves, **stop and report** — never edit a literal.
- **Zero runtime dependencies** in `packages/record`.
- **No non-null assertions (`!`) and no type assertions (`as X`)** introduced anywhere.
  `noUncheckedIndexedAccess` is on, so an indexed read is `T | undefined` and must be narrowed
  by a real check. (Existing `as` casts on payload reads are a pre-existing house convention —
  do not add new ones outside that pattern.)
- **Never** `biome check --write --unsafe` — it rewrites `3.14159` to `Math.PI` in the
  RFC 8785 fixture.
- **The standalone contract:** no tracked file may reference anything outside this repository.
  `.superpowers/` is gitignored, so any pointer into it is reader-unresolvable.
- **Markdown is not citation-gated.** `scripts/contract-scan.mjs` resolves `SPEC §N` /
  `DECISIONS.md` citations in tracked **TypeScript** only. Any phrase quoted in a `.md` file
  must be hand-checked against a **whitespace-collapsed** copy of its source — a §12 phrase
  that wraps a line break is present in the source and absent from `grep -F`.
- **Editorial voice:** every guarantee stated with its limit in the same breath. A comment its
  own commit contradicts is a defect, not a nit.
- **Commits:** imperative sentence-case subject, body explaining *why*, **no**
  conventional-commit prefixes, trailer
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`. Use
  `git commit -F <file>` — the PowerShell here-string pattern mis-parses messages containing
  double quotes.
- **Shell:** PowerShell needs `$env:PATH = "$env:APPDATA\npm;$env:PATH"` before `pnpm`; `pnpm`
  fails outright under Git Bash on this machine. Git works in either.

## Gates

Run all five after every task; all must pass.

```
pnpm typecheck                          # exit 0
pnpm lint                               # exit 0
npx biome check --error-on-warnings .   # exit 0 (13 pre-existing infos)
pnpm test                               # all pass, ZERO skips
node scripts/contract-scan.mjs          # exit 0, no output
```

**Diff the scan output, never compare totals.**

**On test counts:** BASE is **25 files / 272 tests**. Each task below states its **delta**, not
an absolute. Track the delta — absolute totals drift when a fix round adds a test, which
happened twice on the previous increment and caused a false alarm. If your delta is wrong, find
out which test was dropped or duplicated before committing.

---

## File Structure

**Modified**

| File | Responsibility after this increment |
|---|---|
| `packages/record/src/store/memory.ts` | C4: the `sealed` flag, the bar in both append paths |
| `packages/record/src/store/store.ts` | its two "C4 is unbuilt" claims, which Task 1 falsifies |
| `packages/record/src/chain/replay.ts` | the `sealed` arm folding to `status` |
| `packages/record/src/types.ts` | `DecisionRecord.status` |
| `packages/record/src/refusal-codes.ts` | `unsealable-state` in the union, `CORE`, `NEVER_APPENDS` |
| `packages/record/src/create.ts` | wire `seal` into the kernel closures |
| `packages/record/src/operator-surface.ts` | `seal` on the operator handle |
| `packages/record/test/store-constraints.test.ts` | C4 tests; header now names four constraints |
| `packages/record/test/replay-verify.test.ts` | the `sealed` fold |
| `docs/process/deferral-register.md` | row 14 retires; row 13 rewritten |
| `docs/process/implementation-status.md` | §2/§5/§8/§12/§13 rows, the boundary, the steps table |
| `docs/analysis/2026-08-03-step-1-review.md` | appended correction at the count's origin |

**Created**

| File | Responsibility |
|---|---|
| `packages/record/src/kernel/seal.ts` | the seam and its gate ladder |
| `packages/record/test/seal.test.ts` | the seam's behaviour and gate order |

---

# Task 1: C4 seal-finality in the store

**Files:**
- Modify: `packages/record/src/store/memory.ts`
- Test: `packages/record/test/store-constraints.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `MemoryStore` refuses every append against a record whose chain carries a `sealed`
  transition, via `{ appended: false, conflict: 'state-mismatch' }` (and `index: 0` from
  `appendBatch`). No signature changes.

- [ ] **Step 1: Write the failing tests**

Append to `packages/record/test/store-constraints.test.ts`. It already imports `MemoryStore`,
`assert`, `test`, `transitionDigest`, `storeGenesis`, `storeNext` and defines `APPROVER`.

```ts
// === C4 seal-finality ==================================================================

/** An open record advanced to terminal `confirmed`, then sealed. Returns the sealed chain. */
async function sealedRecord(store: MemoryStore, recordId = 'rec-sealed') {
  const genesis = storeGenesis(recordId, 'profile.p1', 'subject:s1');
  assert.equal((await store.appendTransition(null, genesis, { nonTerminal: true })).appended, true);
  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  assert.equal(
    (await store.appendTransition('open', confirmed, { nonTerminal: false })).appended,
    true,
  );
  const sealed = storeNext(confirmed, 'sealed', { chainHead: transitionDigest(confirmed) });
  const res = await store.appendTransition('confirmed', sealed, { nonTerminal: false });
  // The seal itself must be ADMITTED: `sealed` maps to null in `stateOf`, so
  // `isStateLeaving('sealed')` is false and C3's terminal gate never reaches its predicate.
  assert.equal(res.appended, true, 'the seal append is admitted against a terminal record');
  return { sealed, recordId };
}

test('C4: after a `sealed` transition, no further append of any kind is admitted', async () => {
  const store = new MemoryStore();
  const { sealed, recordId } = await sealedRecord(store);
  const before = await store.readChain(recordId);

  const later = storeNext(sealed, 'expired', { bound: '2026-01-01T00:00:00.000Z' });
  const res = await store.appendTransition('confirmed', later, { nonTerminal: false });

  assert.deepEqual(res, { appended: false, conflict: 'state-mismatch' });
  assert.deepEqual(await store.readChain(recordId), before, 'nothing landed');
});

test('C4 bars even a compromise refusal edge — the one append C3 would otherwise admit', async () => {
  // SPEC §12 names this case: "not even a `compromise` refusal edge". It is the one place C4
  // has to override a rule that says yes — C3's carve-out admits `confirmed → refused` for a
  // compromise-classed code, and C4 must refuse it once the record is sealed.
  const store = new MemoryStore();
  const { sealed, recordId } = await sealedRecord(store);
  const before = await store.readChain(recordId);

  const compromise = storeNext(sealed, 'refused', { code: 'chain-compromise' });
  const res = await store.appendTransition('confirmed', compromise, { nonTerminal: false });

  assert.deepEqual(res, { appended: false, conflict: 'state-mismatch' });
  assert.deepEqual(await store.readChain(recordId), before, 'nothing landed');
});

test('C4 in appendBatch is an ENTRY-level failure and reports index 0', async () => {
  const store = new MemoryStore();
  const { sealed, recordId } = await sealedRecord(store);
  const before = await store.readChain(recordId);

  const a = storeNext(sealed, 'consultation-recorded', { kind: 'facts', verdict: 'pass' });
  const b = storeNext(a, 'refused', { code: 'chain-compromise' });
  const res = await store.appendBatch('confirmed', [a, b], { nonTerminal: false });

  assert.deepEqual(res, { appended: false, conflict: 'state-mismatch', index: 0 });
  assert.deepEqual(await store.readChain(recordId), before, 'all-or-nothing: nothing landed');
});
```

- [ ] **Step 2: Run them to verify they fail**

```
npx vitest run packages/record/test/store-constraints.test.ts
```

Expected: the three C4 tests FAIL — the later appends currently succeed, because nothing bars
them. The `sealedRecord` helper's own assertions should PASS (the seal append is already
admitted today). If `sealedRecord` fails, stop: something about `stateOf('sealed')` is not what
this task assumes.

- [ ] **Step 3: Add the flag to `StoredRecord`**

In `packages/record/src/store/memory.ts`, add to the `StoredRecord` interface:

```ts
  /**
   * SPEC §12's C4 seal-finality: set when a `sealed` transition lands, never cleared. Unlike
   * `nonTerminal` and `dueAt` — library-derived flags the store persists verbatim from `meta`
   * — this one is the store's own, derived from the transition's kind. C4 is one of §12's
   * "Constraints an adapter MUST provide", and constraints are the store's work: C1 scans
   * records, C2 computes `max+1`, C3 already switches on the kind. Putting `sealed` in
   * `AppendMeta` instead would break the §12 meta shape.
   */
  sealed: boolean;
```

- [ ] **Step 4: Initialise it and set it**

In `appendGenesis`, add `sealed: false,` to the `this.records.set(...)` object literal.

In `appendSubsequent`, in the mutation step beside the existing `stateOf(transition.kind)` call:

```ts
    if (transition.kind === 'sealed') {
      existing.sealed = true;
    }
```

In `appendBatch`, in its mutation step (after the push loop, beside `existing.state = state`):

```ts
    if (cloned.some((t) => t.kind === 'sealed')) {
      existing.sealed = true;
    }
```

- [ ] **Step 5: Add the bar**

In `appendSubsequent`, immediately after the existing `if (!existing || existing.state !== expectedCurrentState)`
block:

```ts
    // C4 seal-finality (SPEC §12): after a `sealed` transition, NO further append of any kind
    // is admitted — not even a `compromise` refusal edge, because a sealed record's body may
    // be archived or destroyed as a unit and nothing may extend a chain whose evidence may be
    // gone. C4 rejects through the same terminal-state-mismatch path as C3 (SPEC §12: "no
    // separate conflict shape"), so a racing or duplicate seal loses deterministically and
    // `kernel/seal.ts` maps the residual to `unsealable-state`.
    if (existing.sealed) {
      return { appended: false, conflict: 'state-mismatch' };
    }
```

In `appendBatch`, immediately after its entry compare-and-swap check:

```ts
    // C4 is an ENTRY-level failure — SPEC §12: "Entry-level failures — an entry
    // compare-and-swap mismatch or C4 seal-finality — report element index 0."
    if (existing.sealed) {
      return { appended: false, conflict: 'state-mismatch', index: 0 };
    }
```

- [ ] **Step 6: Update the file header and the test file's header**

`memory.ts`'s header currently names C1/C2/C3. It now hand-implements four constraints; say so.

`store-constraints.test.ts`'s header enumerates "the three hand-implemented constraints" with a
line each for C1/C2/C3. Add C4 in the same form: after a `sealed` transition no append of any
kind is admitted, rejected through C3's conflict shape, and its residual maps to
`unsealable-state` at the seam.

- [ ] **Step 7: Run the tests to verify they pass**

```
npx vitest run packages/record/test/store-constraints.test.ts
```

Expected: PASS. Then the full gates. **Delta: +3 tests.**

- [ ] **Step 8: Commit**

Subject: `Bar every append after a record is sealed`. Body: why C4 needs a store-side flag
rather than a `meta` field, and why it reuses C3's conflict shape rather than inventing one.

---

# Task 2: `replay`'s `sealed` arm and the derived status

**Files:**
- Modify: `packages/record/src/types.ts`
- Modify: `packages/record/src/chain/replay.ts`
- Test: `packages/record/test/replay-verify.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 (independent).
- Produces: `DecisionRecord.status: 'active' | 'retired'`, derived by `replay`. Task 3's
  already-sealed gate reads it.

- [ ] **Step 1: Write the failing tests**

Append to `packages/record/test/replay-verify.test.ts`. It already defines `RECORD_ID`,
`APPROVER`, `OPENED_PAYLOAD`, `CONFIRMED_PAYLOAD` and imports `buildChain` and `replay`.

```ts
test("replay folds a `sealed` transition to status 'retired' WITHOUT moving `state`", () => {
  const chain = buildChain(RECORD_ID, [
    { kind: 'opened', payload: OPENED_PAYLOAD },
    { kind: 'confirmed', payload: CONFIRMED_PAYLOAD },
    { kind: 'sealed', payload: { chainHead: `sha256:${'a'.repeat(64)}` } },
  ]);

  const record = replay(chain);

  assert.equal(record.status, 'retired');
  assert.equal(
    record.state,
    'confirmed',
    'sealing is state-PRESERVING — a sealed `confirmed` record is still `confirmed`',
  );
  assert.deepEqual(record.actor, APPROVER, 'the seal does not disturb earlier folded fields');
});

test('replay reports status active on a record that has never been sealed', () => {
  const chain = buildChain(RECORD_ID, [
    { kind: 'opened', payload: OPENED_PAYLOAD },
    { kind: 'confirmed', payload: CONFIRMED_PAYLOAD },
  ]);

  assert.equal(replay(chain).status, 'active');
});
```

- [ ] **Step 2: Run them to verify they fail**

```
npx vitest run packages/record/test/replay-verify.test.ts
```

Expected: the first FAILS with `replay: unhandled TransitionKind 'sealed'` (replay's default
arm throws); the second FAILS on `status` being `undefined`. Both are the right failures.

- [ ] **Step 3: Add the field**

In `packages/record/src/types.ts`, add to `DecisionRecord` after `state`:

```ts
  /**
   * Per-record lifecycle status (SPEC §5's chain retirement): `retired` once a `sealed`
   * transition caps the chain, `active` before that. DERIVED by `chain/replay.ts` from the
   * chain — never stored, never a caller input, the same discipline `state` follows.
   *
   * NOT a field of SPEC §2's record-model table, which names `state` and no status. §5 and
   * §12 both require a sealed record to report `retired`, which is why the field exists here;
   * the divergence from §2's table is recorded in `docs/process/implementation-status.md`
   * rather than assumed away.
   */
  status: 'active' | 'retired';
```

- [ ] **Step 4: Seed it and fold it**

In `packages/record/src/chain/replay.ts`, add `status: 'active',` to the `const record: DecisionRecord = {...}`
seed, beside `state: 'open'`.

Add the case to the fold's switch, before `default`:

```ts
      case 'sealed': {
        // State-PRESERVING (SPEC §4's delta payload; §5's chain retirement): sealing never
        // moves `state` — a sealed `confirmed` record is still `confirmed`. What it changes
        // is the per-record status §5 reports as `retired` rather than `active`. The payload's
        // `chainHead` is not folded into the record: it is standalone evidence for after the
        // body is archived or destroyed (§5), not a field of the record model.
        record.status = 'retired';
        break;
      }
```

Update replay's doc comment: its bullet list currently names `sealed` among kinds "not yet
emitted in this build" that make replay throw. `sealed` moves out of that list and gets its own
bullet.

- [ ] **Step 5: Run the tests to verify they pass**

```
npx vitest run packages/record/test/replay-verify.test.ts
```

Expected: PASS. Then the full gates. **Delta: +2 tests.**

`pnpm typecheck` will flag any other place constructing a `DecisionRecord` literal — `replay`
should be the only one. If typecheck names another, stop and report it rather than adding
`status` there: something other than replay is minting records, which contradicts the field's
whole justification.

- [ ] **Step 6: Commit**

Subject: `Fold a sealed chain to a retired record`. Body: that `status` is derived rather than
stored, and that §2's table names no status while §5 and §12 require one.

---

# Task 3: the `seal()` seam

**Files:**
- Create: `packages/record/src/kernel/seal.ts`
- Modify: `packages/record/src/refusal-codes.ts`
- Modify: `packages/record/src/create.ts`
- Modify: `packages/record/src/operator-surface.ts`
- Test: `packages/record/test/seal.test.ts` (create)

**Interfaces:**
- Consumes: `MemoryStore`'s C4 bar (Task 1); `DecisionRecord.status` (Task 2).
- Produces: `OperatorSurface.seal(recordId): Promise<Outcome<{ recordId: string; status: 'retired'; transitionRef: Digest }>>`
  and the `unsealable-state` refusal code.

- [ ] **Step 1: Add `unsealable-state` to the registry**

In `packages/record/src/refusal-codes.ts`: add `| 'unsealable-state'` to the `RefusalCode`
union, `'unsealable-state': 'refusal',` to `CORE`, and `'unsealable-state',` to the
`NEVER_APPENDS` set. Add a note beside the other per-code notes:

```ts
// unsealable-state: class 'refusal'. SPEC §8 — `seal()` against a record that is not
//   derived-terminal or is already sealed, and the residual of a racing or duplicate seal
//   (C4 rejects through C3's terminal-state-mismatch path, §12). NEVER appends.
```

Run `pnpm typecheck`. The compiler-total `CORE` map means an omission fails the build — that
is the intended safety net. Run `pnpm test`: any test enumerating all codes now covers eleven.

- [ ] **Step 2: Write the failing tests**

Create `packages/record/test/seal.test.ts`:

```ts
// @vidimera/record — seal.test.ts (SPEC §5 "Chain retirement (`sealed` / `retired`)" and
// §12's "Sealing"): the operator-only `seal()` seam and its gate ladder.
//
// The ladder, and why its order is what it is:
//   (1) chain-verify   -> chain-compromise      — §5: "Verification is first"
//   (2) resolve profile -> unknown-profile      — derived-terminality needs the profile
//   (3) already sealed? -> unsealable-state
//   (4) derived-terminal? -> unsealable-state
//   (5) append `sealed` -> unsealable-state on a non-append, else ok
//
// (3) before (4) is a readability choice, not a behavioural one: both map to the same code,
// and a sealed record is STILL derived-terminal (sealing preserves state), so (4) would pass
// and (3) would catch it either way.
//
// ADJACENT-PAIR ORDER TESTS, derived the way finalize-check-order.test.ts derives its own —
// one test per (earlier-rung code, later-rung code) ordered pair that is JOINTLY
// CONSTRUCTIBLE, where the rungs are consecutive. The codes each rung emits:
//   (1) chain-verify    -> chain-compromise    (1 code)
//   (2) profile         -> unknown-profile     (1 code)
//   (3) already sealed  -> unsealable-state    (1 code)
//   (4) terminality     -> unsealable-state    (same code)
//   (5) the append      -> unsealable-state    (same code)
// (1)->(2): NOT jointly constructible. An unconfigured profile is defensive here — a coherent
//   instance always resolves a record it opened — exactly as finalize's own derivation records
//   for its (5)->(6) pair. Excluded, and this comment is why.
// (1)->(3) x1 and (1)->(4) x1: constructible, and both are below. They are the pairs that
//   prove SPEC §5's "Verification is first".
// (3)->(4), (4)->(5): both rungs emit the SAME code, so no ordering between them is
//   observable in an outcome and no test can distinguish them. Excluded.
// Total order-pair tests in this file: 2.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import { create, createWithClock } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Transition } from '../src/types.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';
import { TamperingStore } from './helpers/stores.js';

const CONTENT = { subject: 'week-1', total: 40 };

/** Opens and finalizes a capture-only record, leaving it terminal `confirmed`. */
async function confirmedRecord(store: MemoryStore = new MemoryStore()) {
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  return { handles, recordId };
}

test('seal() on a capture-terminal CONFIRMED record retires it', async () => {
  const { handles, recordId } = await confirmedRecord();

  const outcome = await handles.operator.seal(recordId);
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;
  assert.equal(outcome.value.status, 'retired');

  const chain = await handles.operator.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'sealed');
  assert.equal(outcome.value.transitionRef, transitionDigest(last));

  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.status, 'retired');
  assert.equal(record?.state, 'confirmed', 'sealing preserves state');
});

test("seal()'s `sealed` payload carries the chain head it caps", async () => {
  // Redundant-looking against `prevHash`, and deliberately so: SPEC §4's payload table and §5
  // both require it, because after the body is archived or destroyed the sealed transition
  // must stand alone as evidence.
  const { handles, recordId } = await confirmedRecord();
  const before = await handles.operator.readChain(recordId);
  const head = before.at(-1);
  assert.ok(head !== undefined);

  await handles.operator.seal(recordId);

  const sealed = (await handles.operator.readChain(recordId)).at(-1);
  assert.ok(sealed !== undefined);
  assert.deepEqual(sealed.payload, { chainHead: transitionDigest(head) });
  assert.equal(sealed.prevHash, transitionDigest(head));
});

test('seal() on an OPEN record -> unsealable-state, nothing appended', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const before = await handles.operator.readChain(recordId);

  const outcome = await handles.operator.seal(recordId);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unsealable-state');
  assert.equal(outcome.transitionRef, undefined);

  assert.deepEqual(await handles.operator.readChain(recordId), before);
});

test('seal() on an EFFECT-SEAM confirmed record -> unsealable-state (it is non-terminal, awaiting redemption)', async () => {
  // Deferral register row 9's most-corrected claim, pinned: seal() is NOT a release path for
  // the (profile, subject) pair such a record holds. §12 admits seal only against a
  // derived-terminal record, and §2 makes this one non-terminal.
  const handles = create(makeConfig([effectSeamProfile()]));
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');

  const outcome = await handles.operator.seal(recordId);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unsealable-state');
});

test('seal() twice -> the second refuses unsealable-state and appends nothing', async () => {
  const { handles, recordId } = await confirmedRecord();
  assert.equal((await handles.operator.seal(recordId)).status, 'ok');
  const before = await handles.operator.readChain(recordId);

  const second = await handles.operator.seal(recordId);
  assert.equal(second.status, 'refused');
  if (second.status !== 'refused') return;
  assert.equal(second.code, 'unsealable-state');

  assert.deepEqual(await handles.operator.readChain(recordId), before);
});

test('seal() on a DUE-but-open record refuses without expiring it en passant', async () => {
  // SPEC §4's named exception: "`seal()` never appends a clock edge en passant — a record
  // whose bound has elapsed refuses `unsealable-state`, and the operator sweeps first, then
  // seals." open() and finalize() both DO expire en passant, so the omission is what needs
  // proving, not the refusal.
  // The clock is INJECTED via `createWithClock`, the internal test seam every expiry test in
  // this corpus uses (see expiry.test.ts and exclusivity.test.ts). Never sleep in a test here.
  const TTL = 3600;
  let nowMs = Date.UTC(2026, 0, 1, 0, 0, 0);
  const clock = () => new Date(nowMs);
  const store = new MemoryStore();
  const handles = createWithClock(
    makeConfig([captureProfile({ ttl: TTL })], { store }),
    clock,
  );
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const before = await handles.operator.readChain(recordId);

  nowMs += (TTL + 1) * 1000; // past the open window

  const outcome = await handles.operator.seal(recordId);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unsealable-state');

  assert.deepEqual(
    await handles.operator.readChain(recordId),
    before,
    'no `expired` edge — seal() must not call expireIfDue',
  );
});

test('seal() on an unknown recordId THROWS (a caller error, not a refusal)', async () => {
  const handles = create(makeConfig([captureProfile()]));
  await assert.rejects(() => handles.operator.seal('rec-does-not-exist'), /unknown recordId/);
});
```

- [ ] **Step 3: Add the chain-compromise tests**

Append to the same file. `TamperingStore(inner, targetRecordId, tamperFn)` returns a tampered
chain from `readChain` while every write goes to the real inner store.

```ts
`tamperNonLast` is **already exported** from `./helpers/profiles.js` — import it rather than
writing a local copy. Add it to that file's existing import list.

```ts
test('seal() on a tampered chain over a terminal CONFIRMED record -> chain-compromise WITH an appended edge', async () => {
  const inner = new MemoryStore();
  const { recordId } = await confirmedRecord(inner);
  const handles = create(
    makeConfig([captureProfile()], { store: new TamperingStore(inner, recordId, tamperNonLast) }),
  );

  const outcome = await handles.operator.seal(recordId);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
  assert.equal(outcome.class, 'compromise');
  assert.ok(outcome.transitionRef !== undefined, '§12 C3 admits the edge against terminal `confirmed`');

  const real = await inner.readChain(recordId);
  const last = real.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'refused', 'the compromise edge landed on the real chain');
});

test('seal() on a tampered chain over an ALREADY-SEALED record -> chain-compromise with NO edge', async () => {
  // The only place the two new mechanisms meet. Verification is first (§5), so it outranks
  // `unsealable-state`; and C4 admits nothing, so the compromise surfaces result-first.
  const inner = new MemoryStore();
  const { handles: real, recordId } = await confirmedRecord(inner);
  assert.equal((await real.operator.seal(recordId)).status, 'ok', 'fixture: seal first');
  const before = await inner.readChain(recordId);

  const handles = create(
    makeConfig([captureProfile()], { store: new TamperingStore(inner, recordId, tamperNonLast) }),
  );
  const outcome = await handles.operator.seal(recordId);

  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise', 'verification outranks unsealable-state');
  assert.equal(outcome.transitionRef, undefined, 'C4 admits no edge');
  assert.deepEqual(await inner.readChain(recordId), before, 'nothing landed');
});

test('seal() on a tampered chain over a NON-TERMINAL record -> chain-compromise, not unsealable-state', async () => {
  // Adjacent-pair order test (1)->(4).
  const inner = new MemoryStore();
  const handles0 = create(makeConfig([captureProfile()], { store: inner }));
  const recordId = await openRecord(handles0, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  const handles = create(
    makeConfig([captureProfile()], { store: new TamperingStore(inner, recordId, tamperNonLast) }),
  );
  const outcome = await handles.operator.seal(recordId);

  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
});
```

- [ ] **Step 4: Run them to verify they fail**

```
npx vitest run packages/record/test/seal.test.ts
```

Expected: every test FAILS because `handles.operator.seal` does not exist — under a single-file
`vitest run` this surfaces as a runtime `TypeError`, not a compile error, because that mode does
no full `tsc` pass. That is the right failure.

- [ ] **Step 5: Write the seam**

Create `packages/record/src/kernel/seal.ts`:

```ts
// @vidimera/record — kernel/seal.ts: the operator-only chain-retirement seam
// (SPEC §5 "Chain retirement (`sealed` / `retired`)"; §12 "Sealing (`seal` / `retired`)").
// A derived-terminal record whose chain verifies clean is capped with a state-preserving
// `sealed` transition; §12's C4 then admits no further append of any kind, and the record
// reports `retired`.
//
// The gate ladder, and why:
//   (1) chain-verify     -> chain-compromise, appending an edge where the state admits one
//   (2) resolve profile  -> unknown-profile (derived-terminality needs the leg and the profile)
//   (3) already sealed?  -> unsealable-state
//   (4) derived-terminal?-> unsealable-state
//   (5) append `sealed`  -> a non-append is a racing/duplicate seal -> unsealable-state
//
// (1) IS FIRST and outranks everything, including an already-sealed record — SPEC §5:
// "Verification is first: a record whose chain fails verification refuses `chain-compromise`
// and can never be sealed." Against a sealed record C4 admits no edge, so that combination
// surfaces result-first with no transitionRef.
//
// NO EN-PASSANT EXPIRY, deliberately. `open()` and `finalize()` both call `expireIfDue`; this
// seam must not, and the omission is a stated rule rather than an oversight — SPEC §4:
// "`seal()` never appends a clock edge en passant — a record whose bound has elapsed refuses
// `unsealable-state`, and the operator sweeps first, then seals." In this build that also
// falls out of gate (4): a due-but-open record is non-terminal.

import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import type { KernelContext } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import type { AppendMeta } from '../store/store.js';
import type { Digest, Transition } from '../types.js';
import { appendChainCompromise } from './finalize.js';

export async function seal(
  ctx: KernelContext,
  recordId: string,
): Promise<Outcome<{ recordId: string; status: 'retired'; transitionRef: Digest }>> {
  const { store, profiles, now } = ctx;

  const chain = await store.readChain(recordId);
  if (chain.length === 0) {
    throw new Error(
      `seal: unknown recordId '${recordId}' — no such record (open() first); a recordId that ` +
        'resolves to no chain is a caller error, not a domain refusal (SPEC §8)',
    );
  }

  // --- (1) chain-verify, FIRST ---------------------------------------------------------
  if (!verifyChain(chain).intact) {
    return appendChainCompromise(store, chain, now);
  }

  const record = replay(chain);

  // --- (2) profile resolution ----------------------------------------------------------
  const resolved = profiles.get(record.profileId);
  if (resolved === undefined) {
    // Fail-closed, matching finalize's posture. Defensive: a coherent instance always
    // resolves a record it opened, so no test at this build step constructs it.
    return refused('unknown-profile');
  }
  const legIndex = resolved.profile.legs.findIndex((l) => l.id === record.legId);
  if (legIndex < 0) {
    throw new Error(
      `seal: persisted legId '${record.legId}' is absent from profile '${record.profileId}'`,
    );
  }
  const finalLeg = isFinalLeg(legIndex, resolved.profile.legs.length);

  // --- (3) already sealed ---------------------------------------------------------------
  if (record.status === 'retired') {
    return refused('unsealable-state');
  }

  // --- (4) derived-terminal -------------------------------------------------------------
  // §12 admits seal only against a derived-terminal record. Terminality is the derived
  // formula (§2), not `state` alone: a final-leg `confirmed` on an effect-seam profile is
  // NON-terminal (it awaits redemption) and is therefore unsealable.
  const stillNonTerminal = nonTerminal(record.state, finalLeg, resolved.effectSeam);
  if (stillNonTerminal) {
    return refused('unsealable-state');
  }

  // --- (5) append the seal --------------------------------------------------------------
  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('seal: empty chain — the length check above holds');
  }
  const headDigest = transitionDigest(last);
  const sealedTransition: Transition = {
    recordId,
    seq: chain.length + 1,
    at: now().toISOString(),
    kind: 'sealed',
    // `chainHead` equals `prevHash`, and that is not duplication: SPEC §4's payload table and
    // §5 both require the payload to carry the head, because after the body is archived or
    // destroyed this transition must stand alone as evidence — §5's "`sealed` chain head
    // standing in for replayable body evidence".
    payload: { chainHead: headDigest },
    prevHash: headDigest,
  };
  // State-preserving, so terminality is unchanged — computed via the helper rather than
  // hardcoded `false`, matching the rest of the kernel. `dueAt` is omitted, which clears any
  // pending clock: a retired record must never be swept.
  const meta: AppendMeta = { nonTerminal: nonTerminal(record.state, finalLeg, resolved.effectSeam) };

  const res = await store.appendTransition(record.state, sealedTransition, meta);
  if (!res.appended) {
    // A racing or duplicate seal: C4 (or the state CAS) rejected it through the
    // terminal-state-mismatch path, and §12 maps that residual here.
    return refused('unsealable-state');
  }
  return ok({ recordId, status: 'retired', transitionRef: res.transitionDigest });
}
```

**`appendChainCompromise` is currently module-private in `finalize.ts`.** Export it, and add one
line to its doc comment saying `seal()` is now a second caller and that C4 makes its
no-candidate fallback reachable where it previously could not fire.

- [ ] **Step 6: Wire it onto the operator handle**

In `packages/record/src/create.ts`: import `seal as sealKernel` from `./kernel/seal.js`, add
`seal: OperatorSurface['seal'];` to the `Kernel` type, and add the closure beside `redeem`:

```ts
    seal: (recordId) => sealKernel(ctx, recordId),
```

In `packages/record/src/operator-surface.ts`: add to the interface and to the frozen literal.

```ts
  seal(recordId: string): Promise<Outcome<{ recordId: string; status: 'retired'; transitionRef: Digest }>>;
```

Update both files' header comments — each enumerates the operator seams, and `seal` joins them.

- [ ] **Step 7: Run the tests to verify they pass**

```
npx vitest run packages/record/test/seal.test.ts
```

Expected: PASS, **10 tests** (seven behavioural, three compromise). Then the full gates.
**Delta: +10 tests, +1 file.**

- [ ] **Step 8: Prove the en-passant omission is load-bearing**

In an **untracked scratch copy** of `seal.ts` — never a tracked file — add an `expireIfDue`
call before gate (3), and confirm the due-but-open test FAILS. Restore, and verify `git diff`
shows a clean tree. Report which test the mutation killed.

- [ ] **Step 9: Commit**

Subject: `Retire a verified terminal record with a sealed cap`. Body: why verification is
first, and why the seam deliberately does not expire en passant.

---

# Task 4: the record

No code. This is the increment's exit, and it carries a correction that predates it.

**Files:**
- Modify: `docs/process/deferral-register.md`
- Modify: `docs/process/implementation-status.md`
- Modify: `docs/analysis/2026-08-03-step-1-review.md`

**Interfaces:**
- Consumes: the finished state of Tasks 1-3.
- Produces: nothing code-facing.

- [ ] **Step 1: Retire row 14, and correct its trigger as you retire it**

Delete row 14 from `docs/process/deferral-register.md` — C4 seal-finality is its entire
subject, and Task 1 built it. Numbers are stable identifiers and the file's preamble says a gap
is an entry that has left, so **do not renumber anything**.

Its trigger reads: *"The build step that first ships `seal()` — the same step must add the C4
bar and its test, because shipping `seal()` makes this gap reachable in the same commit."*
**That sequencing did not happen and did not need to.** C4 landed in Task 1, one task *ahead*
of `seal()`, precisely so the store would already refuse correctly when the seam arrived. The
trigger's prediction was reasonable and wrong; record that correction in the exit record where
a reader can still find it after the row is gone, the same way the previous increment handled
row 12's trigger.

- [ ] **Step 2: Rewrite row 13 with the count correction**

**The Store is 7 of 8, not 7 of 9.** SPEC states no method count anywhere — verify that
yourself with `grep -ciE "nine methods|eight methods" docs/concept/SPEC.md`, which returns 0.
§12 gives signatures to eight methods: `putStaged`, `getStaged`, `appendTransition`,
`appendBatch`, `readChain`, `chainHead`, `findNonTerminal`, `listDue`. `seal` is not among
them — §9 lists `seal()` as **operator-only** alongside `open()`, `review()`, `finalize()`,
`redeem()` "and the sweep — §12", and §12 discusses it in the storage section for the same
reason it discusses the operator sweep there: because C4 lives there.

Rewrite row 13 to say 7 of 8, with `findNonTerminal` the only absent method, `tx?` the only
surviving signature divergence, and `listDue`'s recordIds narrowing unchanged. **Do not delete
the row.**

- [ ] **Step 3: Sweep the count with a command, not a list**

```
git grep -ln "of 9\|of the 9\|nine methods" -- docs/
```

Measured while planning, that returns **seven** documents in **four** classes — and it will
return eight once this plan is committed, because this plan quotes the wrong count too, in
order to correct it:

| Class | Documents | Treatment |
|---|---|---|
| **Live** | `docs/process/deferral-register.md` (row 13 — 1 site); `docs/process/implementation-status.md` (**4** sites: the steps table, the §12 row, the named boundary heading, the still-outstanding list) | Correct in place |
| **Origin, dated** | `docs/analysis/2026-08-03-step-1-review.md` | Append a labelled `**Correction:**` in that document's own convention — it appends and never rewrites, and it is where the count entered |
| **Completed** | the step-1 remediation plan, the atomic-batch plan, the atomic-batch design | Leave as history |
| **Corrects it deliberately** | `docs/superpowers/specs/2026-08-05-chain-retirement-design.md`, and this plan | Leave alone. Both state "7 of 8, not 7 of 9" — they match the grep *because* they carry the correction |

**Run the grep rather than trusting that table.** It was already wrong once: written as six
documents in three classes, it missed that the design spec quotes the count in order to correct
it. Re-run it afterward and confirm the only survivors are the historical and
corrects-it-deliberately classes — five documents, six with this plan.

- [ ] **Step 4: Update the exit record**

In `docs/process/implementation-status.md`, all of these are now false in the same direction:

- **§5 row** — chain retirement is no longer "entirely absent": `seal()`, the `sealed`
  transition and `retired` all exist. What remains absent there is unchanged.
- **§8 row** — eleven of eleven core codes; `unsealable-state` leaves the not-built column.
- **§12 row** — C4 built (so `appendBatch` no longer "inherits the same gap"); the 7-of-8
  correction; `seal` removed from the absent-methods list because it was never a Store method.
- **§13 row** — the `active`/`retired` distinction now exists, so §13's specified end-of-life
  state is no longer absent. Its host duties (pseudonymisation, retention periods, the
  purpose-limitation guard) remain unchanged and still host duties.
- **§2 row** — the new `status` field, and its divergence from §2's own table.
- **The named boundary** — "seven of nine" becomes seven of eight, carrying the correction.
- **Steps at a glance** — step 2 stays **"Started, not exited"**: `findNonTerminal`, `tx?`,
  adapters, the conformance suite and the cross-backing test all remain. Say what this
  increment added.
- **Still outstanding** — drop row 14; keep row 13 with its new wording.

- [ ] **Step 5: Note what row 9 gained**

Row 9's most-corrected claim — that `seal()` is not a release path for a confirmed effect-seam
record's held `(profile, subject)` pair — is now a passing test
(`packages/record/test/seal.test.ts`). The row itself needs no change; say so in the exit
record's account rather than editing the row, so a reader knows the claim is pinned.

- [ ] **Step 6: Hand-check every quotation you added**

Markdown is not citation-gated. For each phrase quoted from `SPEC.md`, `DECISIONS.md` or
`CONTROLS.md`, confirm it occurs verbatim in a **whitespace-collapsed** copy. A quotation that
wraps a line break is present in the source and absent from `grep -F`. Do not write a pointer
to a register row or document you have not opened.

- [ ] **Step 7: Run the gates and commit**

All five green; **delta: 0 tests** — this task touches no code. Subject:
`Record what chain retirement closed, and correct the store method count`. Body: that exactly
one row retires, that row 13 narrows rather than closing, and where the nine came from.

---

## Done when

- All five gates green; **delta +15 tests and +1 test file** over BASE's 25 files / 272 tests
  (Task 1 +3, Task 2 +2, Task 3 +10, Task 4 +0). Track the delta, not the absolute.
- The four byte-stability digests are byte-identical to BASE.
- `docs/concept/` untouched.
- No non-null assertion introduced:
  `git diff <BASE> HEAD -- '*.ts' | grep -nE '^\+.*[A-Za-z_)\]]!\.'` returns nothing.
- Deferral register: row 14 gone, row 13 rewritten, rows 1/4/5/6/9/10/11 untouched.
- `git grep -ln "of 9\|of the 9\|nine methods" -- docs/` returns only the historical class (the
  step-1 remediation plan, the atomic-batch plan, the atomic-batch design) and the two
  documents that carry the correction (this increment's design and this plan) — five in total.
  No live process document survives it.
- `docs/process/implementation-status.md` describes a 7-of-8 Store, C4 built, eleven of eleven
  refusal codes, and step 2 still "Started, not exited".
