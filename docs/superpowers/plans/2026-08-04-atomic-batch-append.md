# Atomic batch append — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the `Store` an all-or-nothing `appendBatch`, migrate both append methods to
SPEC §12's `meta` object, add the `listDue` read that makes `meta`'s clock column provable,
and move `finalize()`'s success batch onto the batch so a conflict can no longer leave
consultations on a chain with no decision edge.

**Architecture:** `Store` gains two methods and both existing append signatures change; the
in-memory implementation checks every element against an evolving intra-batch state before
mutating anything, matching the transactional shape `store/memory.ts` already models.
`finalize()`'s rung (6) collapses from three sequential compare-and-swap appends to one call,
which removes the partial-tail case entirely rather than mapping it to an outcome.

**Tech Stack:** TypeScript 7.0.2 (strict, `noUncheckedIndexedAccess`, NodeNext, `noEmit`),
vitest 4.1.10, Biome 2.5.6, pnpm 11.18.0, Node ≥22. Zero runtime dependencies.

**Design document:** `docs/superpowers/specs/2026-08-04-atomic-batch-append-design.md`. Read it
before Task 1 — it carries the reasoning this plan only executes.

## Global Constraints

Every task's requirements implicitly include this section.

- **`docs/concept/` is SEALED.** Not one byte. A needed change there is a stop-and-report for
  the human, never an edit.
- **The four byte-stability digest literals in `packages/record/test/byte-stability.test.ts`
  are an oracle.** A mismatch is a stop-and-report and may **never** be repaired by editing
  the literals. Every task in this plan must leave them byte-identical.
- **Zero runtime dependencies** in `packages/record`. No new dependency of any kind.
- **No non-null assertions (`!`)** anywhere. `noUncheckedIndexedAccess` stays on, so an
  indexed read is `T | undefined` and must be narrowed, never asserted.
- **Never** `biome check --write --unsafe` — it rewrites `3.14159` to `Math.PI` in the
  RFC 8785 fixture.
- **Never retype a fixture** — `git show` it. Never `git archive` (CRLF).
- **The standalone contract:** no tracked file may reference anything outside this
  repository — no external repos, files, projects, commits, or development history.
  `.superpowers/` is gitignored, so any pointer into it is reader-unresolvable.
- **Markdown is not citation-gated.** `scripts/contract-scan.mjs` resolves `SPEC §N` /
  `DECISIONS.md` citations in tracked **TypeScript** only. Any phrase quoted in a `.md` file
  must be hand-checked against a **whitespace-collapsed** copy of its source — a SPEC phrase
  quoted on this project wraps a line break, where `grep -F` reports it missing.
- **Editorial voice:** every guarantee stated with its limit in the same breath; never
  "non-repudiation"; never a compliance claim.
- **Commits:** imperative sentence-case subject, body explaining *why*, **no**
  conventional-commit prefixes (`feat:`/`fix:`/`chore:` are wrong here), trailer
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`. Use
  `git commit -F <file>` — the PowerShell here-string pattern mis-parses messages containing
  double quotes.
- **Shell:** PowerShell needs `$env:PATH = "$env:APPDATA\npm;$env:PATH"` before `pnpm`; `pnpm`
  fails outright under Git Bash on this machine.

## Gates

Run all five after every task. Every one must pass before the task is complete.

```
pnpm typecheck                          # exit 0
pnpm lint                               # exit 0
npx biome check --error-on-warnings .   # exit 0 (13 pre-existing infos: 12 useTemplate
                                        #   across three test files + 1 biome.json deprecation)
pnpm test                               # all pass, ZERO skips
node scripts/contract-scan.mjs          # exit 0, no output
```

**Diff the scan output, never compare totals** — a total moving has hidden an equal-sized
regression in the opposite direction on this project before.

Baseline at plan start (`main` @ `8e6bc32`): 23 test files / 257 tests / 0 skips.

---

## File Structure

**Modified**

| File | Responsibility after this increment |
|---|---|
| `packages/record/src/store/store.ts` | `AppendMeta`, `BatchResult`, the 7-method `Store` interface |
| `packages/record/src/store/memory.ts` | meta persistence, `appendBatch`, `listDue`, `dueAt` column |
| `packages/record/src/kernel/finalize.ts` | rung (6) as one batch call; the batch-conflict fault |
| `packages/record/src/kernel/open.ts` | genesis meta, carrying `dueAt` |
| `packages/record/src/kernel/expiry.ts` | meta on the `expired` edge |
| `packages/record/src/refusal-codes.ts` | the `record-not-open` note |
| `packages/record/test/helpers/chain.ts` | gains two single-transition builders |
| `packages/record/test/helpers/stores.ts` | three doubles migrate to the 7-method contract |
| `packages/record/test/store-constraints.test.ts` | meta migration; imports the extracted builders |
| `packages/record/test/terminality.test.ts` | batch-conflict fixtures |
| `packages/record/test/finalize-check-order.test.ts` | rung (6) derivation |
| `docs/process/deferral-register.md` | row 12 retires; row 13 rewritten |
| `docs/process/implementation-status.md` | §12 row, 7-of-9, the boundaries |

**Created**

| File | Responsibility |
|---|---|
| `packages/record/test/store-batch.test.ts` | `appendBatch`'s contract, driven at the store |
| `packages/record/test/due-listing.test.ts` | the `dueAt` discipline and `listDue` |

---

# Task 1: The `meta` object

Pure signature change. No behaviour changes, no test changes beyond call sites. The suite
staying green and the digests staying byte-identical is the whole proof.

**Files:**
- Modify: `packages/record/src/store/store.ts`
- Modify: `packages/record/src/store/memory.ts`
- Modify: `packages/record/src/kernel/open.ts`
- Modify: `packages/record/src/kernel/expiry.ts`
- Modify: `packages/record/src/kernel/finalize.ts`
- Modify: `packages/record/test/helpers/stores.ts`
- Modify: `packages/record/test/store-constraints.test.ts`
- Modify: `packages/record/test/terminality.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `AppendMeta { nonTerminal: boolean; dueAt?: string }` exported from
  `src/store/store.ts`; `appendTransition(expectedCurrentState, transition, meta)`.

- [ ] **Step 1: Add `AppendMeta` and change the interface**

In `packages/record/src/store/store.ts`, add after the `AppendResult` union:

```ts
/**
 * SPEC §12's append metadata — the record-level flags the store persists **verbatim**:
 * SPEC §12 "the library derives them, the store never recomputes them".
 *
 *  - `nonTerminal` — the derived (`nonterminal.ts`) flag for the record's state AFTER this
 *    append, which C1 exclusivity reads.
 *  - `dueAt` — the library-computed clock deadline for whichever pending window the record
 *    is in, RFC3339 UTC. Presence sets the record's pending-clock column; **absence clears
 *    it**. It is a listing index only and never authoritative — SPEC §12.
 *
 * §12 also puts an optional caller-supplied transaction on every write. It is NOT built
 * here: an in-memory backing has no transaction to receive, so the parameter would be
 * structurally ignored. It arrives with the first real adapter. Deferral register row 13.
 */
export interface AppendMeta {
  nonTerminal: boolean;
  dueAt?: string;
}
```

Then change the `appendTransition` signature and its doc's last sentence:

```ts
  appendTransition(
    expectedCurrentState: RecordState | null,
    transition: Transition,
    meta: AppendMeta,
  ): Promise<AppendResult>;
```

- [ ] **Step 2: Migrate `MemoryStore`**

In `packages/record/src/store/memory.ts`, add `dueAt?: string;` to the `StoredRecord`
interface, import `AppendMeta`, and thread meta through all three methods. The genesis path:

```ts
  async appendTransition(
    expectedCurrentState: RecordState | null,
    transition: Transition,
    meta: AppendMeta,
  ): Promise<AppendResult> {
    const existing = this.records.get(transition.recordId);
    if (expectedCurrentState === null) {
      return this.appendGenesis(transition, meta, existing);
    }
    return this.appendSubsequent(expectedCurrentState, transition, meta, existing);
  }
```

In `appendGenesis`, replace the `nonTerminal,` field in the `this.records.set(...)` literal
with:

```ts
      nonTerminal: meta.nonTerminal,
      dueAt: meta.dueAt,
```

In `appendSubsequent`, replace `existing.nonTerminal = nonTerminal;` with:

```ts
    existing.nonTerminal = meta.nonTerminal;
    // Presence sets the pending-clock column, absence clears it (SPEC §12). Assigning
    // `meta.dueAt` unconditionally IS the clearing rule — an append that carries no new
    // clock writes `undefined` over whatever was there.
    existing.dueAt = meta.dueAt;
```

- [ ] **Step 3: Migrate the four kernel call sites**

Each is a one-line change that wraps the existing boolean without evaluating anything new —
`store.appendTransition(x, t, someFlag)` becomes
`store.appendTransition(x, t, { nonTerminal: someFlag })`. The five sites and their exact
flags:

- `kernel/expiry.ts`, the `store.appendTransition('open', expiredTransition, …)` call →
  `{ nonTerminal: expiredNonTerminal }`
- `kernel/finalize.ts`, `refuseMaybeAppend`'s append → `{ nonTerminal: refusedNonTerminal }`
- `kernel/finalize.ts`, `appendChainCompromise`'s append → `{ nonTerminal: refusedNonTerminal }`
- `kernel/finalize.ts`, all three rung (6) appends → `{ nonTerminal: openNonTerminal }` for the
  two consultations, `{ nonTerminal: confirmedNonTerminal }` for the confirmed edge
- `kernel/open.ts`, **both** genesis appends (`:132` first attempt and `:173`
  expire-then-retry) → `{ nonTerminal: openedNonTerminal }`, reusing the const already
  declared at `:126`

Do not change any expression's value. This step is a wrapper, nothing else.

- [ ] **Step 4: Migrate the test doubles**

In `packages/record/test/helpers/stores.ts`, change the three `appendTransition` signatures.
`TamperingStore` and `RaceOnceStore`:

```ts
  appendTransition(e: RecordState | null, t: Transition, m: AppendMeta): Promise<AppendResult> {
    return this.inner.appendTransition(e, t, m);
  }
```

`CountingStore`:

```ts
  appendTransition(
    expectedCurrentState: RecordState | null,
    transition: Transition,
    meta: AppendMeta,
  ): Promise<AppendResult> {
    this.appendCalls += 1;
    return this.inner.appendTransition(expectedCurrentState, transition, meta);
  }
```

Add `AppendMeta` to the type import from `../../src/store/store.js`. `RaceOnceStore`'s
`appendTransition` keeps its hook; only the third parameter's type and the delegated value
change.

Also migrate the inline doubles in `packages/record/test/terminality.test.ts`
(`ConfirmBlockingStore`, `FactsConsultationBlockingStore`, `RaceThenAppendStore`) the same
way, and every direct `store.appendTransition(...)` call in
`packages/record/test/store-constraints.test.ts`. Those last are all literal booleans, so each
is the same mechanical wrap:

```ts
// before
const result = await store.appendTransition('open', confirmed, false);
// after
const result = await store.appendTransition('open', confirmed, { nonTerminal: false });
```

Find them with `grep -n 'appendTransition(' packages/record/test/store-constraints.test.ts`
and wrap every third argument. Do not change a single `true` to `false` or back — if the
suite's pass count or any assertion changes, the wrap was not mechanical.

- [ ] **Step 5: Run the gates**

```
pnpm typecheck ; pnpm lint ; npx biome check --error-on-warnings . ; pnpm test ; node scripts/contract-scan.mjs
```

Expected: all five green, **257 tests, zero skips** — the same count as the baseline. This
task adds no test and removes none.

**If any byte-stability digest moved, STOP and report.** A pure signature change cannot move
a digest; if one moved, something changed a transition's bytes.

- [ ] **Step 6: Commit**

```bash
git add packages/record/src packages/record/test
git commit -F <message-file>
```

Subject: `Carry SPEC §12's meta object on every append`. Body: why the bare boolean had to
widen (the batch and the clock column both need it), and that this task changes no behaviour —
the unchanged test count and the unmoved digests are the evidence.

---

# Task 2: `appendBatch`

The store method and its contract tests. No kernel caller yet — this task is complete and
reviewable with `finalize()` still doing three sequential appends.

**Files:**
- Modify: `packages/record/src/store/store.ts`
- Modify: `packages/record/src/store/memory.ts`
- Modify: `packages/record/test/helpers/chain.ts`
- Modify: `packages/record/test/helpers/stores.ts`
- Modify: `packages/record/test/store-constraints.test.ts`
- Modify: `packages/record/test/terminality.test.ts`
- Test: `packages/record/test/store-batch.test.ts` (create)

**Interfaces:**
- Consumes: `AppendMeta` from Task 1.
- Produces: `BatchResult` and `Store.appendBatch(expectedCurrentState, transitions, meta)`;
  `storeGenesis(recordId, profileId, subjectRef, at?)` and
  `storeNext(prev, kind, payload, at?)` from `test/helpers/chain.ts`.

- [ ] **Step 1: Extract the two single-transition builders into the shared helper**

`store-constraints.test.ts` defines `genesisTransition` and `nextTransition` privately, and
the new batch tests need the same two. Move them to `packages/record/test/helpers/chain.ts`
under names that do not collide with `buildChain`'s chain-assembling role, and append to that
file:

```ts
/**
 * A genesis (`opened`) transition for `recordId`: seq 1, `prevHash` from the genesis rule.
 * Distinct from `buildChain`: these two builders make ONE transition at a time, for tests
 * that drive a Store append-by-append and must not hand it a pre-assembled chain.
 */
export function storeGenesis(
  recordId: string,
  profileId: string,
  subjectRef: string,
  at = '2026-07-24T00:00:00.000Z',
): Transition {
  return {
    recordId,
    seq: 1,
    at,
    kind: 'opened',
    payload: {
      profileId,
      profileDigest: `sha256:${'0'.repeat(64)}`,
      legId: 'approver-decide',
      subjectRef,
      contentDigest: `sha256:${'1'.repeat(64)}`,
    },
    prevHash: genesisPrevHash(recordId),
  };
}

/** The next transition chained honestly onto `prev`: seq+1, `prevHash` = prev's own digest. */
export function storeNext(
  prev: Transition,
  kind: TransitionKind,
  payload: unknown,
  at?: string,
): Transition {
  return {
    recordId: prev.recordId,
    seq: prev.seq + 1,
    at: at ?? new Date(Date.UTC(2026, 0, 1, 0, 0, prev.seq)).toISOString(),
    kind,
    payload,
    prevHash: transitionDigest(prev),
  };
}
```

Then delete the two private copies from `store-constraints.test.ts`, import
`storeGenesis`/`storeNext` from `./helpers/chain.js`, and rename every call site. Its
`openedPayload` helper is now only used by `storeGenesis` — delete it too if nothing else
references it.

Run `pnpm test` and confirm **257 tests still pass** before writing any new test. A rename
that changes a count has changed behaviour.

- [ ] **Step 2: Write the failing tests**

Create `packages/record/test/store-batch.test.ts`:

```ts
// @vidimera/record — store-batch.test.ts (SPEC §12 "Atomic batch append"): the
// all-or-nothing `appendBatch`. Its semantics are exact, and three of them have a
// plausible wrong reading that this file exists to catch:
//   - the entry compare-and-swap is checked ONCE, at entry, and its failure reports index 0;
//   - per-element sequencing is server-verified `max+1 … max+N`, so a stale seq is caught
//     at the element that carries it;
//   - terminal-monotonicity runs against the EVOLVING intra-batch state, but with the
//     terminality INPUT fixed at the entry flag — so a record cannot become terminal
//     mid-batch. Recomputing terminality per element makes finalize's own batch reject its
//     own last element, which is why that rule gets a named test rather than incidental
//     coverage.
// Transitions are hand-built via `helpers/chain.ts`'s single-transition builders and driven
// straight at the Store, never through the kernel — this file tests the storage contract.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { transitionDigest } from '../src/chain/encoding.js';
import { MemoryStore } from '../src/store/memory.js';
import type { IdentityAssertion, Transition } from '../src/types.js';
import { storeGenesis, storeNext } from './helpers/chain.js';

const APPROVER: IdentityAssertion = { principal: 'approver:1', authority: 'session:test-app' };
const CHECKER: IdentityAssertion = { principal: 'system:chain-verify', authority: 'system:vidimera-record' };

/** An open record with only its genesis on the chain, ready to receive a batch. */
async function openRecord(store: MemoryStore, recordId = 'rec-batch'): Promise<Transition> {
  const genesis = storeGenesis(recordId, 'profile.p1', 'subject:s1');
  const res = await store.appendTransition(null, genesis, { nonTerminal: true });
  assert.equal(res.appended, true, 'fixture: the genesis append must land');
  return genesis;
}

/** finalize's own batch shape: two state-preserving consultations, then `confirmed`. */
function successBatch(genesis: Transition): Transition[] {
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

test('appendBatch: the happy path lands every element in order and returns their digests', async () => {
  const store = new MemoryStore();
  const genesis = await openRecord(store);
  const batch = successBatch(genesis);

  const res = await store.appendBatch('open', batch, { nonTerminal: false });
  assert.equal(res.appended, true);
  if (!res.appended) return;
  assert.deepEqual(
    res.transitionDigests,
    batch.map((t) => transitionDigest(t)),
    'the store returns each element’s own digest, in order',
  );

  const chain = await store.readChain(genesis.recordId);
  assert.deepEqual(chain.map((t) => t.kind), [
    'opened',
    'consultation-recorded',
    'consultation-recorded',
    'confirmed',
  ]);
  assert.deepEqual(chain.map((t) => t.seq), [1, 2, 3, 4], 'seqs are contiguous from max+1');
});

test('appendBatch: terminality is fixed at the ENTRY flag, so a batch may end in the transition that makes the record terminal', async () => {
  // The rule this file exists for. The entry flag is nonTerminal:true (the record is open),
  // so C3's terminal arm cannot fire while the batch applies — even though the LAST element
  // is `confirmed`, which is exactly what makes the record terminal. Recomputing terminality
  // per element rejects that element and breaks finalize's only batch.
  const store = new MemoryStore();
  const genesis = await openRecord(store);

  const res = await store.appendBatch('open', successBatch(genesis), { nonTerminal: false });
  assert.equal(res.appended, true, 'a batch ending in `confirmed` against an open record must land');

  // And the post-batch flag is the META's, applied once — not recomputed per element.
  const second = storeGenesis('rec-other', 'profile.p1', 'subject:s1');
  const blocked = await store.appendTransition(null, second, { nonTerminal: true });
  assert.equal(blocked.appended, true, 'the batched record is terminal now, so C1 no longer blocks the pair');
});

test('appendBatch: an entry compare-and-swap mismatch reports index 0 and applies nothing', async () => {
  const store = new MemoryStore();
  const genesis = await openRecord(store);
  const before = await store.readChain(genesis.recordId);

  const res = await store.appendBatch('confirmed', successBatch(genesis), { nonTerminal: false });
  assert.deepEqual(res, { appended: false, conflict: 'state-mismatch', index: 0 });

  const after = await store.readChain(genesis.recordId);
  assert.deepEqual(after, before, 'all-or-nothing: the chain is byte-for-byte unchanged');
});

test('appendBatch: a stale seq conflicts at the element that carries it, and applies nothing', async () => {
  const store = new MemoryStore();
  const genesis = await openRecord(store);
  const batch = successBatch(genesis);
  const [first, second] = batch;
  assert.ok(first !== undefined && second !== undefined, 'fixture: the batch has three elements');
  const stale: Transition = { ...second, seq: second.seq + 5 };
  const before = await store.readChain(genesis.recordId);

  const res = await store.appendBatch('open', [first, stale], { nonTerminal: true });
  assert.deepEqual(res, { appended: false, conflict: 'seq', index: 1 });

  const after = await store.readChain(genesis.recordId);
  assert.deepEqual(after, before, 'the first element does not land either');
});

test('appendBatch: against an already-terminal record, C3 rejects at entry', async () => {
  const store = new MemoryStore();
  const genesis = await openRecord(store);
  await store.appendBatch('open', successBatch(genesis), { nonTerminal: false });
  const head = (await store.readChain(genesis.recordId)).at(-1);
  assert.ok(head !== undefined);

  // The record is terminal `confirmed`. A state-leaving append that is not the compromise
  // carve-out is barred — and because the entry flag is the terminality input, it is barred
  // at the FIRST element rather than discovered part-way through.
  const expired = storeNext(head, 'expired', { bound: '2026-07-25T00:00:00.000Z' });
  const res = await store.appendBatch('confirmed', [expired], { nonTerminal: false });
  assert.deepEqual(res, { appended: false, conflict: 'state-mismatch', index: 0 });
});

test('appendBatch: an empty batch is a caller error, not a silent success', async () => {
  const store = new MemoryStore();
  await openRecord(store);
  await assert.rejects(
    () => store.appendBatch('open', [], { nonTerminal: true }),
    /appendBatch: empty batch/,
  );
});
```

- [ ] **Step 3: Run them to verify they fail**

```
npx vitest run packages/record/test/store-batch.test.ts
```

Expected: FAIL — TypeScript reports `Property 'appendBatch' does not exist on type
'MemoryStore'`. That is the right failure. If any test fails for a different reason, fix the
test before implementing.

- [ ] **Step 4: Add `BatchResult` and the interface method**

In `packages/record/src/store/store.ts`:

```ts
/**
 * `appendBatch`'s outcome. SPEC §12: the first conflicting element "aborts the whole
 * transaction with nothing applied, the outcome naming that element's index", and
 * entry-level failures "report element index 0".
 *
 * No `exclusivity` arm: C1 fires only on a genesis append, and SPEC §12 states that
 * genesis never appears in a batch. The type says what can happen rather than carrying a
 * variant nothing can produce.
 */
export type BatchResult =
  | { appended: true; transitionDigests: readonly Digest[] }
  | { appended: false; conflict: 'state-mismatch' | 'seq'; index: number };
```

And on the interface:

```ts
  /**
   * All-or-nothing multi-append under ONE entry compare-and-swap (SPEC §12). The caller
   * builds the chain — it must, since each element's `prevHash` is the previous element's
   * digest — and the store verifies the sequencing rather than assigning it.
   *
   * `expectedCurrentState` is `RecordState`, never `null`: SPEC §12 states that genesis
   * never appears in a batch, so the genesis CAS target has no meaning here.
   *
   * An empty `transitions` array is a caller error and THROWS — a batch that appends
   * nothing has no honest result to report, and returning `appended:true` with no digests
   * would let a caller mistake it for success.
   */
  appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
  ): Promise<BatchResult>;
```

Update the `Store` interface's own doc comment: it currently says the shipped subset is
`putStaged`/`getStaged`/`appendTransition`/`readChain`/`chainHead` and that `appendBatch`,
`findNonTerminal`, `listDue` and `seal` are not built. `appendBatch` moves to the built list.

- [ ] **Step 5: Implement it in `MemoryStore`**

Add to `packages/record/src/store/memory.ts`, after `appendSubsequent`:

```ts
  /**
   * SPEC §12's atomic batch. Every check runs against a DRY-RUN of the batch before any
   * mutation, so the "nothing applied" guarantee is structural rather than a rollback: the
   * first `chain.push` happens only after the last element has been checked.
   *
   * The terminality INPUT is `existing.nonTerminal` read once at entry, while the state the
   * checks run against EVOLVES element by element (SPEC §12: a record "cannot become
   * terminal mid-batch"). That is what lets finalize's batch end in the `confirmed` edge
   * that makes the record terminal.
   */
  async appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
  ): Promise<BatchResult> {
    const first = transitions[0];
    if (first === undefined) {
      throw new Error(
        'appendBatch: empty batch — a batch that appends nothing has no honest result to ' +
          'report, and is a caller error rather than a domain outcome',
      );
    }
    const existing = this.records.get(first.recordId);

    // Entry compare-and-swap, checked ONCE. Entry-level failures report index 0.
    if (!existing || existing.state !== expectedCurrentState) {
      return { appended: false, conflict: 'state-mismatch', index: 0 };
    }
    const entryNonTerminal = existing.nonTerminal;

    let state: RecordState = existing.state;
    let seq = existing.chain.length;
    const digests: Digest[] = [];
    // `entries()` rather than an index loop: it yields `Transition`, not
    // `Transition | undefined`, so `noUncheckedIndexedAccess` needs no unreachable
    // narrowing branch here.
    for (const [i, t] of transitions.entries()) {
      if (t.recordId !== first.recordId) {
        throw new Error(
          'appendBatch: every element must name the same recordId — a batch spanning ' +
            'records has no single entry compare-and-swap target',
        );
      }
      if (!entryNonTerminal && isStateLeaving(t.kind) && !isCompromiseCarveOut(t, state)) {
        return { appended: false, conflict: 'state-mismatch', index: i };
      }
      seq += 1;
      if (t.seq !== seq) {
        return { appended: false, conflict: 'seq', index: i };
      }
      digests.push(transitionDigest(t));
      const next = stateOf(t.kind);
      if (next !== null) state = next;
    }

    // Every check passed. Clone BEFORE the first push, not inside the push loop:
    // `structuredClone` is failable — it throws `DataCloneError` on a non-cloneable payload,
    // which this store deliberately lets propagate — and a throw interleaved with the pushes
    // would leave the earlier elements on the chain. Every failable operation happens before
    // any mutation, which is what makes "nothing applied" structural rather than a rollback.
    // A conflict still wins over a throw, because the check loop above returns first.
    const cloned = transitions.map((t) => structuredClone(t));
    for (const c of cloned) {
      existing.chain.push(c);
    }
    existing.state = state;
    existing.nonTerminal = meta.nonTerminal;
    existing.dueAt = meta.dueAt;
    return { appended: true, transitionDigests: digests };
  }
```

Add `BatchResult` to the type import from `./store.js`.

- [ ] **Step 6: Run the tests to verify they pass**

```
npx vitest run packages/record/test/store-batch.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 7: Add `appendBatch` to the test doubles**

Every hand-rolled `Store` must implement it, or `pnpm typecheck` fails. There are **seven**
besides `MemoryStore` — find them with `git grep -n "implements Store" -- '*.ts'` rather than
trusting this list, but as of Task 1's head they are:

| File | Classes |
|---|---|
| `test/helpers/stores.ts` | `TamperingStore`, `CountingStore`, `RaceOnceStore` |
| `test/terminality.test.ts` | `ConfirmBlockingStore`, `FactsConsultationBlockingStore`, `RaceThenAppendStore` |
| `test/exclusivity.test.ts` | `RaceStore` (`:292`) |

Add to each:

```ts
  appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
  ): Promise<BatchResult> {
    return this.inner.appendBatch(expectedCurrentState, transitions, meta);
  }
```

`CountingStore` counts appends, so its version increments first:
`this.appendCalls += 1;` before delegating — and its doc comment gains a clause saying a batch
counts as one append.

Update that file's header: it currently says the doubles are "down-ported to this build step's
five-method Store contract … no `appendBatch`, `findNonTerminal` or `listDue`". `appendBatch`
is no longer in that list.

Do the same for the three inline doubles in `terminality.test.ts`. Two of those three
(`ConfirmBlockingStore`, `FactsConsultationBlockingStore`) are deleted by Task 3 — migrating
them here anyway is not wasted work but the price of Task 2 being independently green, which
is what makes it independently reviewable.

- [ ] **Step 8: Run the full gates**

Expected: 24 test files / 263 tests / 0 skips (257 + 6 new). Digests unmoved.

- [ ] **Step 9: Commit**

Subject: `Add the all-or-nothing batch append the success batch needs`. Body: why the
terminality-input rule gets a named test, and why `BatchResult` carries no `exclusivity` arm.

---

# Task 3: `finalize()` adopts the batch

**Files:**
- Modify: `packages/record/src/kernel/finalize.ts`
- Modify: `packages/record/src/refusal-codes.ts`
- Modify: `packages/record/test/terminality.test.ts`
- Modify: `packages/record/test/finalize-check-order.test.ts`

**Interfaces:**
- Consumes: `Store.appendBatch`, `BatchResult`, `AppendMeta`.
- Produces: no new exported symbol. `finalize()`'s outcome contract is unchanged on success.

- [ ] **Step 1: Rewrite the two blocking fixtures as batch fixtures**

`ConfirmBlockingStore` and `FactsConsultationBlockingStore` block a single `appendTransition`;
after this task nothing routes finalize's success path through that method, so both lose their
subject. Replace them with one fixture, in `terminality.test.ts`:

```ts
/**
 * A Store wrapper that FABRICATES a batch conflict of a chosen shape, letting every other
 * call through to a real inner `MemoryStore`.
 *
 * WHAT IT DOES NOT PROVE. The conflict is invented: the inner store never saw the batch, so
 * the record it holds is untouched afterwards. That is the correct post-state here for a
 * different reason than the fixture — the batch is all-or-nothing, so a REAL conflict leaves
 * the record untouched too. `RaceThenAppendStore` below reaches the branch through a genuine
 * race and is where post-conflict state is asserted honestly.
 */
class BatchConflictStore implements Store {
  private readonly inner = new MemoryStore();
  constructor(private readonly conflict: 'state-mismatch' | 'seq', private readonly index: number) {}
  putStaged(s: StagedDraft): Promise<void> {
    return this.inner.putStaged(s);
  }
  getStaged(r: string): Promise<StagedDraft | null> {
    return this.inner.getStaged(r);
  }
  readChain(r: string): Promise<Transition[]> {
    return this.inner.readChain(r);
  }
  chainHead(r: string): Promise<Digest | null> {
    return this.inner.chainHead(r);
  }
  appendTransition(e: RecordState | null, t: Transition, m: AppendMeta): Promise<AppendResult> {
    return this.inner.appendTransition(e, t, m);
  }
  async appendBatch(): Promise<BatchResult> {
    return { appended: false, conflict: this.conflict, index: this.index };
  }
}
```

- [ ] **Step 2: Write the failing tests**

Replace the two mid-batch tests in `terminality.test.ts` with these three. Keep the
`RaceThenAppendStore` test that follows them; only its expectation text changes (step 5).

```ts
test("finalize()'s success batch is atomic: an entry conflict refuses record-not-open and leaves the chain untouched", async () => {
  const store = new BatchConflictStore('state-mismatch', 0);
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const before = await handles.operator.readChain(recordId);

  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'record-not-open');
  assert.equal(outcome.transitionRef, undefined, 'a never-appends code carries no transitionRef');

  const after = await handles.operator.readChain(recordId);
  assert.deepEqual(after, before, 'all-or-nothing: no consultation is left behind');
});

test('finalize() throws a storage fault when the batch reports a seq conflict, with nothing recorded', async () => {
  const store = new BatchConflictStore('seq', 1);
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const before = await handles.operator.readChain(recordId);

  await assert.rejects(
    () => handles.operator.finalize(recordId, identity(), CONTENT, facts()),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.startsWith("finalize: batch append conflict ('seq') at element 1"),
        `expected the batch conflict throw naming shape and index, got: ${err.message}`,
      );
      assert.match(err.message, /nothing was appended/, 'the message must say nothing landed');
      return true;
    },
  );

  const after = await handles.operator.readChain(recordId);
  assert.deepEqual(after, before, 'the throw reports a batch that applied nothing');
});

test("finalize()'s batch digests are the ones finalize itself computed", async () => {
  // The batch has no per-append round trip, so finalize computes each prevHash locally via
  // `transitionDigest`. That makes the store's returned digests a free cross-check on the
  // encoding: if the two ever disagree, something recomputes differently.
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;

  const chain = await handles.operator.readChain(recordId);
  const confirmed = chain.at(-1);
  assert.ok(confirmed !== undefined);
  assert.equal(
    outcome.value.transitionRef,
    transitionDigest(confirmed),
    'the returned transitionRef is the confirmed edge’s own digest',
  );
});
```

Add `transitionDigest` to that file's imports from `../src/chain/encoding.js`, and
`AppendMeta`/`BatchResult` to the `../src/store/store.js` type import.

- [ ] **Step 3: Run them to verify they fail**

```
npx vitest run packages/record/test/terminality.test.ts
```

Expected: FAIL — `appendBatch` is never called, so `BatchConflictStore` has no effect and
finalize still succeeds. That is the right failure.

- [ ] **Step 4: Rewrite rung (6)**

In `packages/record/src/kernel/finalize.ts`, replace everything from `const openNonTerminal =`
through the end of the confirmed-append block with:

```ts
  // The batch is built whole before it is sent: each element's `prevHash` is the previous
  // element's digest, so the caller necessarily computes the chain and the store verifies
  // the sequencing rather than assigning it (SPEC §12).
  const seqBase = chain.length;
  const cvTransition: Transition = {
    recordId,
    seq: seqBase + 1,
    at: nowIso,
    kind: 'consultation-recorded',
    payload: chainVerifyConsultation,
    prevHash: headDigest,
  };
  const factsTransition: Transition = {
    recordId,
    seq: seqBase + 2,
    at: nowIso,
    kind: 'consultation-recorded',
    payload: factsConsultation,
    prevHash: transitionDigest(cvTransition),
  };
  // capture-only ⇒ terminal; effect-seam ⇒ non-terminal (awaits redemption).
  const confirmedTransition: Transition = {
    recordId,
    seq: seqBase + 3,
    at: nowIso,
    kind: 'confirmed',
    payload: { actor: identity },
    prevHash: transitionDigest(factsTransition),
  };

  // `meta` is the POST-batch record flag, applied once. The entry terminality flag is the
  // store's own, read at entry — which is what admits the `confirmed` element that makes the
  // record terminal (SPEC §12).
  const postBatch: AppendMeta = {
    nonTerminal: nonTerminal('confirmed', finalLeg, resolved.effectSeam),
  };
  const res = await store.appendBatch(
    'open',
    [cvTransition, factsTransition, confirmedTransition],
    postBatch,
  );
  if (!res.appended) {
    if (res.conflict === 'seq') {
      throw batchConflict(res.conflict, res.index);
    }
    // `state-mismatch`. The batch applied nothing, so `record-not-open` is true of the
    // record AND honours its never-appends entry — both, for the first time at this seam.
    // Element-level `state-mismatch` is unreachable for THIS batch: the entry flag is
    // non-terminal (the record is open), so C3's terminal arm cannot fire while it applies.
    return refused('record-not-open');
  }
  const confirmedDigest = res.transitionDigests.at(-1);
  if (confirmedDigest === undefined) {
    throw new Error(
      'finalize: appendBatch reported success with no digests — a conforming Store returns ' +
        'one digest per element',
    );
  }
  return ok({ recordId, state: 'confirmed', transitionRef: confirmedDigest });
}
```

Replace the `midBatchConflict` helper with:

```ts
/**
 * The batch-conflict fault — rung (6)'s single append.
 *
 * THE GROUND, and it is one sentence: under this build's single-writer /
 * no-concurrent-finalize-per-record bound, with a Store honouring SPEC §12's compare-and-swap
 * contract, no conflict is reachable at this append, so arriving here means the storage layer
 * broke a contract. DECISIONS.md #11 makes a storage fault a loud throw, and because the
 * batch is all-or-nothing this one sits squarely inside the scope DECISIONS.md #10 gives that
 * exception — "storage faults where nothing was recorded" — rather than beside it.
 *
 * Only the `seq` shape reaches here. A `state-mismatch` means the record is not open, which
 * `record-not-open` describes truthfully now that nothing was appended, so it is returned
 * result-first at the call site.
 */
function batchConflict(conflict: 'seq', index: number): Error {
  return new Error(
    `finalize: batch append conflict ('${conflict}') at element ${index}. Under this ` +
      "build's single-writer / no-concurrent-finalize-per-record bound, with a Store " +
      'honouring the compare-and-swap contract, no conflict is reachable here — so this is ' +
      'a storage fault. The batch is all-or-nothing: nothing was appended and the record is ' +
      'unchanged.',
  );
}
```

Import `AppendMeta` (type) and `BatchResult` is not needed at the call site. `openNonTerminal`
and `confirmedNonTerminal` are now unused — delete both declarations; the batch reads its entry
flag from the store and its post-batch flag from `postBatch`.

- [ ] **Step 5: Update every comment the change falsified**

- `finalize.ts`'s header, rung (6): it describes three sequential appends and a
  refuse-vs-throw asymmetry across them. Rewrite it for one atomic call, and say plainly that
  a conflict applies nothing.
- `refusal-codes.ts`'s `record-not-open` note: the whole "one further producer sits off the
  gate ladder … which conflict shapes the code is true for and which it is not" passage
  describes the three-site world. Replace with: rung (6)'s entry conflict, where the batch
  applied nothing, so the code is true of the state and never-appends holds.
- `terminality.test.ts`'s banner and the inversion note above the `RaceThenAppendStore` test:
  the "sequential, not atomic" framing is now false. The inversion note is the record of
  overturning an inherited assertion — **keep it, and append rather than rewrite**, saying
  that the mapping it argued for is now reached by a different and simpler route.
- `finalize-check-order.test.ts`'s rung (6) derivation: rung (6) now emits `record-not-open`
  from one entry-level conflict and throws on `seq`. The `(5)→(6)` exclusion still holds and
  gets simpler. **Re-check the "Total order-pair tests across the corpus: 6" sentence** after
  editing and confirm it is still true by counting.

- [ ] **Step 6: Run the tests to verify they pass**

```
npx vitest run packages/record/test/terminality.test.ts packages/record/test/finalize-check-order.test.ts
```

Then the full gates. Expected: **24 files / 264 tests / 0 skips** — Task 2 left 263, and this
task replaces two mid-batch tests with three, for a net +1.

**Digests must be unmoved.** The transitions are byte-identical; only the commit path changed.
If a digest moved, STOP and report.

- [ ] **Step 7: Mutation-test the new pins**

Prove the tests are load-bearing before trusting them. In an **untracked scratch copy** of
`finalize.ts` (never a tracked file):

1. Map `seq` to `refused('record-not-open')` instead of throwing → the seq test must fail.
2. Map `state-mismatch` to a throw → the entry-conflict test must fail.

Restore and verify with `git diff` that the tree is clean. Report which test each mutation
killed.

- [ ] **Step 8: Commit**

Subject: `Commit finalize's success batch all at once`. Body: that the partial-tail case is
now unreachable rather than mapped, and that the storage-fault throw moves inside
DECISIONS.md #10's scope because nothing is recorded.

---

# Task 4: `dueAt` and `listDue`

**Files:**
- Modify: `packages/record/src/store/store.ts`
- Modify: `packages/record/src/store/memory.ts`
- Modify: `packages/record/src/kernel/open.ts`
- Modify: `packages/record/test/helpers/stores.ts`
- Modify: `packages/record/test/terminality.test.ts`
- Test: `packages/record/test/due-listing.test.ts` (create)

**Interfaces:**
- Consumes: `AppendMeta.dueAt` (declared in Task 1, unset until now), `expiryDeadlineMs` from
  `src/kernel/expiry.ts`.
- Produces: `Store.listDue(now: Date): Promise<string[]>`.

- [ ] **Step 1: Write the failing tests**

Create `packages/record/test/due-listing.test.ts`:

```ts
// @vidimera/record — due-listing.test.ts (SPEC §12's `listDue`): the pending-clock column
// and the read that makes it observable. `dueAt` is a STORE column, not part of the record
// model — SPEC §12 calls it a listing index and says it is never authoritative — so
// `getRecord` cannot see it and `listDue` is the only shipped path that can. Exactly one
// producer sets it (the genesis `opened` append, from the profile's open-window ttl) and
// every state-leaving append clears it by omission.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { MemoryStore } from '../src/store/memory.js';
import { create } from '../src/create.js';
import type { Transition } from '../src/types.js';
import { storeGenesis, storeNext } from './helpers/chain.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
// `captureProfile()`'s default expiry is `{ ttl: 3600 }` — seconds, per SPEC §9.1 — so the
// open window closes exactly one hour after the genesis stamp.
const HOUR_MS = 3600_000;

test('listDue: a record opened under a ttl is listed once its open window has closed, and not before', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  const chain = await handles.operator.readChain(recordId);
  const genesis = chain[0];
  assert.ok(genesis !== undefined);
  const openedMs = Date.parse(genesis.at);

  assert.deepEqual(await store.listDue(new Date(openedMs)), [], 'not due at the moment it opened');
  assert.deepEqual(
    await store.listDue(new Date(openedMs + HOUR_MS - 1)),
    [],
    'not due one millisecond before the bound',
  );
  assert.deepEqual(
    await store.listDue(new Date(openedMs + HOUR_MS)),
    [recordId],
    'due exactly AT the bound — the gate is `<=`, not `<`',
  );
  assert.deepEqual(await store.listDue(new Date(openedMs + HOUR_MS * 2)), [recordId], 'still due after');
});

test('listDue: a record under expiry:none has no pending clock and is never listed', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile({ expiry: 'none' })], { store }));
  await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  assert.deepEqual(
    await store.listDue(new Date(Date.UTC(2099, 0, 1))),
    [],
    'no bound means never listed, however far the clock runs',
  );
});

test('listDue: finalizing clears the pending clock — a state-leaving append carrying no new clock', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'ok');

  assert.deepEqual(
    await store.listDue(new Date(Date.UTC(2099, 0, 1))),
    [],
    'the confirmed batch carries no clock, so its post-batch meta clears the column',
  );
});

test('listDue applies NO state predicate — a due record is listed whatever state it is in', async () => {
  // SPEC §12 states the gate as `dueAt` alone, with no state predicate. In this build only
  // the genesis sets `dueAt` and every state-leaving append clears it, so no kernel path can
  // produce a due non-open record. The STORE contract still has to honour the rule, so this
  // one test drives the store directly and sets the meta itself. It is the only test in this
  // file that does not go through the kernel, and that is why.
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-due', 'profile.p1', 'subject:s1');
  await store.appendTransition(null, genesis, { nonTerminal: true });

  const confirmed: Transition = storeNext(genesis, 'confirmed', { actor: { principal: 'a', authority: 'session:t' } });
  await store.appendTransition('open', confirmed, {
    nonTerminal: false,
    dueAt: '2026-01-01T00:00:00.000Z',
  });

  assert.deepEqual(
    await store.listDue(new Date(Date.UTC(2026, 5, 1))),
    ['rec-due'],
    'terminal `confirmed`, and still listed — the gate reads `dueAt`, never `state`',
  );
});
```

Every helper used above is verified to exist with these exact signatures:
`captureProfile(overrides?)` accepts `{ expiry: { ttl } | 'none' }`; `makeConfig(profiles, { store })`;
`openRecord(handles, content, profileId, subjectRef)` returns the recordId and throws on a
refusal; `identity()` and `facts()` take optional overrides. `profiles.ts` exports no content
constant, which is why this file declares its own `CONTENT`, matching the convention in
`terminality.test.ts`.

- [ ] **Step 2: Run them to verify they fail**

```
npx vitest run packages/record/test/due-listing.test.ts
```

Expected: FAIL — `Property 'listDue' does not exist on type 'MemoryStore'`.

- [ ] **Step 3: Add `listDue` to the interface**

In `packages/record/src/store/store.ts`:

```ts
  /**
   * The recordIds with a pending clock that has come due — SPEC §12's gate, verbatim:
   * `dueAt ≠ null AND dueAt ≤ now`, with **no state predicate**. `dueAt` presence is the
   * library's declaration of a pending clock; the store never derives one.
   *
   * NARROWED from SPEC §12, which says this returns the records due. Ids are what the
   * operator sweep needs — every seam it would drive takes a recordId — and returning full
   * records would require the store to replay chains it deliberately does not interpret.
   * Recorded as a divergence in the deferral register.
   */
  listDue(now: Date): Promise<string[]>;
```

- [ ] **Step 4: Implement it and the genesis producer**

In `packages/record/src/store/memory.ts`:

```ts
  async listDue(now: Date): Promise<string[]> {
    const nowMs = now.getTime();
    const due: string[] = [];
    for (const record of this.records.values()) {
      if (record.dueAt !== undefined && Date.parse(record.dueAt) <= nowMs) {
        due.push(record.id);
      }
    }
    return due;
  }
```

In `packages/record/src/kernel/open.ts`, the genesis append's meta gains the open-window
deadline. `expiryDeadlineMs` already exists in `kernel/expiry.ts` and takes the opened-at
stamp — at genesis that is the transition's own `at`:

Declare it once, directly below the existing `openedNonTerminal` const at `:126`, and pass it
at **both** genesis append call sites (`:132` first attempt, `:173` expire-then-retry) in place
of the `{ nonTerminal: openedNonTerminal }` Task 1 put there:

```ts
  const deadlineMs = expiryDeadlineMs(openedTransition.at, profile.expiry);
  const genesisMeta: AppendMeta = {
    nonTerminal: openedNonTerminal,
    // SPEC §12: presence sets the pending-clock column. This is the only producer in this
    // build — the open ttl window. The effect-seam `confirmToRedeem` window and the
    // `redeeming` window are §9.1's other two clocks and neither is built (deferral register
    // row 9), so finalize's batch carries no `dueAt` and thereby clears the column.
    ...(deadlineMs === null ? {} : { dueAt: new Date(deadlineMs).toISOString() }),
  };
```

`expiryDeadlineMs` returns `null` for `expiry: 'none'`, which is why the spread is conditional:
an omitted key is what clears the column, and writing `dueAt: undefined` explicitly would be
the same at runtime but reads as though a value were intended.

Import `expiryDeadlineMs` from `./expiry.js` and the `AppendMeta` type from
`../store/store.js`. Use whichever local binding for the profile is already in scope at that
point — `open.ts` already reads `profile.legs.length` at `:128`.

- [ ] **Step 5: Run the tests to verify they pass**

```
npx vitest run packages/record/test/due-listing.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Add `listDue` to the test doubles**

The same set Task 2 step 7 enumerates — re-run `git grep -n "implements Store" -- '*.ts'`,
since Task 3 deleted two of them and added one:

```ts
  listDue(now: Date): Promise<string[]> {
    return this.inner.listDue(now);
  }
```

- [ ] **Step 7: Name the effect-seam site**

In `packages/record/src/kernel/finalize.ts`, on the `postBatch` meta, add:

```ts
    // No `dueAt`: a capture-only final-leg `confirmed` is terminal and has no pending clock,
    // and the effect-seam `confirmToRedeem` window that WOULD set one here is unbuilt
    // (deferral register row 9 — both redemption bounds are inert in this build). Absent is
    // the honest value today; this is the site that must set it when that clock lands.
```

- [ ] **Step 8: Run the full gates**

Expected: **25 files / 268 tests / 0 skips** (264 + this file's 4). Digests unmoved.

- [ ] **Step 9: Commit**

Subject: `Give the pending-clock column a producer and a reader`. Body: why `listDue` came in
with `dueAt` rather than later — a store column that no shipped path can read cannot be
red-first tested, and the discipline would have been a claim with no failing test behind it.

---

# Task 5: The record

No code. This is the increment's exit, and the reason it is its own task is that the last
remediation's final three review rounds found contradictions **between documents** rather than
in code.

**Files:**
- Modify: `docs/process/deferral-register.md`
- Modify: `docs/process/implementation-status.md`

**Interfaces:**
- Consumes: the finished state of Tasks 1–4.
- Produces: nothing code-facing.

- [ ] **Step 1: Retire row 12, and correct its trigger as you retire it**

Delete row 12 from `docs/process/deferral-register.md`. Its number is a stable identifier — the
file's own preamble says a gap is an entry that has left — so **do not renumber anything**.

Its trigger text reads: *"Build step 2, when `appendBatch` lands: the batch becomes
all-or-nothing and the mid-batch throw loses its only producer."* The first half held; the
second did not — a `seq` conflict is still producible when another writer moves `max` between
the chain load and the batch, so the throw survives in simplified form. Record that correction
in the exit record (Step 3), where a reader can still find it after the row is gone.

- [ ] **Step 2: Rewrite row 13 — it does NOT retire**

Two of its four absent methods landed. Rewrite the row to say:

- the Store is **7 of 9**: `putStaged`, `getStaged`, `appendTransition`, `appendBatch`,
  `readChain`, `chainHead`, `listDue` built; `findNonTerminal` and `seal` absent;
- the signature divergence is now `tx?` alone — `meta` matches SPEC §12;
- `listDue` returns recordIds where §12 says records — the narrowing from Task 4;
- trigger unchanged: build step 2.

**Do not delete this row.** Landing two of four methods reads like closing it and does not.

- [ ] **Step 3: Update the exit record**

In `docs/process/implementation-status.md`:

- The **§12 row** of the per-SPEC-section table: move `appendBatch` and `listDue` from the
  not-built column to the built column, with what each guarantees. `findNonTerminal`, `seal`
  and C4 stay in the not-built column — and note that `appendBatch` **inherits** the C4 gap,
  since §12 makes seal-finality an entry-level batch failure and no bar exists.
- The **§9 row**: rung (6) is no longer "sequential, not atomic". Its Not-built cell keeps the
  `record-exists`-has-no-locator clause, which is unaffected.
- The **"The finalize success batch is sequential, not atomic"** named boundary: replace it
  with the batch's arrival, carrying row 12's corrected trigger text from Step 1.
- The **"The store is five of nine"** named boundary → seven of nine, with the two that
  remain and why row 13 survives.
- **Still outstanding:** drop row 12 from the list; keep row 13 with its new wording.
- Add a **step 2 row** to the "Steps at a glance" table showing it started and what part
  landed — this increment is one piece of step 2, not the whole step, and the table must not
  read as though step 2 exited.

- [ ] **Step 4: Hand-check every quotation you added**

Markdown is not citation-gated. For each phrase quoted from `SPEC.md`, `DECISIONS.md` or
`CONTROLS.md`, confirm it occurs verbatim in a **whitespace-collapsed** copy of that document.
A quotation wrapping a line break is present in the source and absent from `grep -F`.

- [ ] **Step 5: Run the gates and commit**

All five green. Subject: `Record what the atomic batch closed, and what it did not`. Body:
that exactly one row retires, that row 13 narrows rather than closing, and the corrected
trigger text.

---

## Done when

- 25 test files, 268 tests, zero skips; all five gates green. The per-task counts are
  257 → 263 (Task 2) → 264 (Task 3) → 268 (Task 4). A count that lands somewhere else means a
  test was dropped or duplicated — find out which before continuing.
- The four byte-stability digests are byte-identical to their values at plan start.
- `docs/concept/` untouched.
- No non-null assertion introduced: `git diff main HEAD -- '*.ts' | grep -nE '^\+.*[A-Za-z_)\]]!\.'`
  returns nothing.
- Deferral register: row 12 gone, row 13 rewritten, rows 1/4/5/6/9/10/11/14 untouched.
- `docs/process/implementation-status.md` describes a 7-of-9 Store and an atomic rung (6).
