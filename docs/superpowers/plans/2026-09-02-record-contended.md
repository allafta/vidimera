# `record-contended` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the thrown `Error` named `ContentionError` with a returned refusal, the new
profile-conditional code `record-contended`, at every seam that can lose its append to a
concurrent state-preserving append, and land the sanctioned SPEC §8/§9/§10.2 and ARCHITECTURE
text with the behavior.

**Architecture:** The shared classifier in `kernel/finalize.ts` (`seqConflict`, reached through
`batchSeqConflict` and `appendSeqConflict`) stops building an `Error` for the moved-head branch
and returns a discriminant instead — contended, or a fault carrying the storage-fault error. Its
four callers (`finalize`, `decline`, `raiseFinding`, `acknowledge`) refuse `record-contended` on
contended and throw the fault otherwise. The registry gains the code as a never-appends
`refusal`-class member; nothing else in the kernel changes.

**Tech Stack:** TypeScript (ES2022, strict), vitest, Biome; the record package only (no store
changes, so the store-postgres project is unaffected and is run once at the end as a check).

**Spec:** `docs/superpowers/specs/2026-09-02-record-contended-design.md` — read it first; §8 of
the spec carries the sanction GRANT and the exact sealed-set touches Task 4 is licensed to make.

## Global Constraints

- The sanction (spec §8, granted 2026-09-02) licenses exactly: one SPEC §8 profile-conditional
  table row; `record-contended` in SPEC §8's never-appends list; one sentence at SPEC §9 rung (6);
  one clause in SPEC §10.2's seam-discipline sentence; the ARCHITECTURE §5 ladder line and its
  (6) bullet. Touch nothing else under `docs/concept/`.
- The sealed-set text lands in the LAST task, after the behavior, never ahead of it (marker
  moves only when behavior has landed). The spec's Process paragraph speaks of one commit; this
  plan lands the behavior across Tasks 1–3 and the text in Task 4 on one branch that fast-forwards
  as a unit — the same guarantee, finer commits.
- TDD: every flipped pin is run RED before the code moves. The RED run must show the old
  behavior (a rejection where a refusal is now expected), not a typo.
- `packages/record/test/byte-stability.test.ts` is never edited. Nothing on this path appends.
- Run before every commit: `./node_modules/.bin/biome check --error-on-warnings .`,
  `./node_modules/.bin/tsc -p packages/record --noEmit`, `node scripts/contract-scan.mjs`
  (exit 0, silent). `pnpm` is unreliable on the authoring machine; call the binaries directly.
- Work on branch `record-contended` cut from `main`; fast-forward `main` at the end only on
  instruction. Never push without instruction.
- Do not touch comments beyond what each task's change makes false; the plan names every one.

---

### Task 1: The registry gains `record-contended`

**Files:**
- Modify: `packages/record/src/refusal-codes.ts` (the union at lines 5–86, `REGISTRY` at
  122–147, `NEVER_APPENDS` at 179–191)
- Test: `packages/record/test/refusal-matrix.test.ts` (a new registry-only test after the
  `consultation-stale` block; the total-accounting test at line 650)
- Test: `packages/record/test/outcome-model.test.ts:51`

**Interfaces:**
- Produces: the literal `'record-contended'` as a member of `RefusalCode`, mapped to `'refusal'`
  in `REGISTRY`, and present in `NEVER_APPENDS` so `appendsOn('record-contended', leg)` is
  `false` for every leg. Tasks 2 and 3 call `refused('record-contended')`.

- [ ] **Step 1: Write the failing registry-only test**

Append to `packages/record/test/refusal-matrix.test.ts`, after the `consultation-stale`
registry-only test (search for `const code: RefusalCode = 'consultation-stale';` and add after
that test's closing `});`):

```ts
// === record-contended (the record-contended increment, a SPEC §8 registry amendment) =========
// `record-contended` (SPEC §8's conditional table: findings flow, §10.2) is `refusal`-class and a
// never-appends member: a decision-progress or findings seam lost its append to a concurrent
// finding or acknowledgment on the same record — nothing recorded, the record still open,
// re-invocation re-evaluates against the new head. Registry-only in this file; production-path
// coverage lives in terminality.test.ts (finalize/decline) and findings-seams.test.ts
// (raiseFinding/acknowledge), where the race is driven through the kernel.

test('record-contended: registry/type presence + class + never-appends shape only in this file — its producers are the four seams that can lose a seq race (kernel/finalize.ts, kernel/decline.ts, kernel/findings-seams.ts); production-path coverage lives in terminality.test.ts and findings-seams.test.ts', () => {
  // `code: RefusalCode = 'record-contended'` is itself a COMPILE-TIME union-membership check
  // (this file fails to type-check if 'record-contended' is ever removed from the union).
  const code: RefusalCode = 'record-contended';
  assert.equal(REGISTRY[code], 'refusal');
  assert.equal(appendsOn(code, {}), false, 'never appends — nothing landed to record');
  assert.equal(
    appendsOn(code, { terminalRefusals: [code] }),
    false,
    'legal but inert in terminalRefusals, like every never-appends member',
  );
});
```

- [ ] **Step 2: Move the two total-accounting pins to twenty-five**

In `packages/record/test/refusal-matrix.test.ts`, the test at line 650: in its NAME, replace
the trailing ` = 24)` with
` + record-contended registry-only (production path: terminality.test.ts and findings-seams.test.ts, the record-contended increment) = 25)`,
and in its body replace `assert.equal(allCodes.length, 24);` with
`assert.equal(allCodes.length, 25);`.

In the same file, lines 577–579, replace
```
// `consultation-stale` (SPEC §11.1/§14's freshness gate, the AL2 freshness increment) is
// the twenty-fourth and LAST code — the guard era the kernel increment opened ends with
// this lift. It is `refusal`-class, `terminalRefusals`-able, open-by-default for re-run,
```
with
```
// `consultation-stale` (SPEC §11.1/§14's freshness gate, the AL2 freshness increment) is
// the twenty-fourth code and the last of the guard era — the era the kernel increment opened
// ends with this lift; the twenty-fifth, `record-contended`, is a registry amendment below,
// not a guard lift. It is `refusal`-class, `terminalRefusals`-able, open-by-default for re-run,
```

In `packages/record/test/outcome-model.test.ts:51`, replace
`assert.equal(ALL_REFUSAL_CODES.length, 24, 'REGISTRY must cover all twenty-four RefusalCodes');`
with
`assert.equal(ALL_REFUSAL_CODES.length, 25, 'REGISTRY must cover all twenty-five RefusalCodes');`

- [ ] **Step 3: Run the two files to verify they fail**

Run: `./node_modules/.bin/vitest run --project record packages/record/test/refusal-matrix.test.ts packages/record/test/outcome-model.test.ts`
Expected: FAIL — the new test with `REGISTRY[code]` undefined (`Expected 'refusal', Received undefined`), the two totals with `Expected 25, Received 24`.

- [ ] **Step 4: Add the code to the registry**

In `packages/record/src/refusal-codes.ts`, replace lines 77–86:
```ts
  // the twenty-fourth and LAST code of this build (the AL2 freshness increment): SPEC
  // §11.1/§14's consultation freshness gate — a bounded required kind whose obtained
  // `observedAt` claim is missing, future, or out-of-bound (an unparseable claim is
  // the intake's own throw, never this refusal — kernel/consultations.ts's shape check
  // runs before this rung is ever reached). `refusal`-class, `terminalRefusals`-able,
  // open-by-default for re-run (the `consultation-failed` family's own register — SPEC
  // §8's row: "can only fire with authority timestamps"). Producer: finalize's rung
  // 5.5 freshness arm (kernel/finalize.ts), real as of the AL2 freshness increment —
  // this same commit.
  | 'consultation-stale';
```
with
```ts
  // the twenty-fourth code, and the last of the guard era (the AL2 freshness increment): SPEC
  // §11.1/§14's consultation freshness gate — a bounded required kind whose obtained
  // `observedAt` claim is missing, future, or out-of-bound (an unparseable claim is
  // the intake's own throw, never this refusal — kernel/consultations.ts's shape check
  // runs before this rung is ever reached). `refusal`-class, `terminalRefusals`-able,
  // open-by-default for re-run (the `consultation-failed` family's own register — SPEC
  // §8's row: "can only fire with authority timestamps"). Producer: finalize's rung
  // 5.5 freshness arm (kernel/finalize.ts), real as of the AL2 freshness increment —
  // this same commit.
  | 'consultation-stale'
  // the twenty-fifth code (the record-contended increment, a SPEC §8 registry amendment under
  // its own sanction): SPEC §8's conditional table names it under the findings flow (§10.2) —
  // a decision-progress or findings seam lost its append to a concurrent finding or
  // acknowledgment on the same record; nothing recorded, the record still open, re-invocation
  // re-evaluates against the new head. `refusal`-class, a never-appends member (legal but
  // inert in `terminalRefusals`). Producers: the moved-head branch of the shared seq-conflict
  // classifier (kernel/finalize.ts's `seqConflict`), reached from finalize's and decline's
  // rung (6) and from the findings seams' rung (5) — real as of this increment, this same
  // commit. The storage-fault branch of that classifier stays a throw.
  | 'record-contended';
```

In `REGISTRY`, after the line `'consultation-stale': 'refusal',` add
`'record-contended': 'refusal',`.

In `NEVER_APPENDS`, after `'supersedes-unverified',` add `'record-contended',`.

In the `NEVER_APPENDS` doc comment, after the sentence ending `real as of the step-8 recovery
increment (this same commit).` add:
```
 * `record-contended` never appends for the plainest reason of all: nothing of the losing call
 * landed — the store refused its stale sequence — and the record is still `open`, so there is
 * no state change to record and no edge to leave (the record-contended increment).
```

- [ ] **Step 5: Run the two files to verify they pass**

Run: `./node_modules/.bin/vitest run --project record packages/record/test/refusal-matrix.test.ts packages/record/test/outcome-model.test.ts`
Expected: PASS.

- [ ] **Step 6: Gates, then commit**

```bash
./node_modules/.bin/biome check --error-on-warnings . && ./node_modules/.bin/tsc -p packages/record --noEmit && node scripts/contract-scan.mjs
git add packages/record/src/refusal-codes.ts packages/record/test/refusal-matrix.test.ts packages/record/test/outcome-model.test.ts
git commit -m "record-contended 1/4: the registry gains the twenty-fifth code, refusal-class, never-appends"
```

---

### Task 2: The classifier returns a discriminant; finalize and decline refuse

**Files:**
- Modify: `packages/record/src/kernel/finalize.ts` (`batchSeqConflict` at ~650,
  `appendSeqConflict` at ~667, `seqConflict` at ~676–728; the rung-(6) call at ~599; the header
  paragraph at lines 92–96; the doc comment at ~617–648)
- Modify: `packages/record/src/kernel/decline.ts:288–293`
- Test: `packages/record/test/terminality.test.ts` (`isContentionError` at ~491 and its four
  callers at ~512/533/553/573; the two storage-fault pins at ~156 and ~213; the note at ~279)

**Interfaces:**
- Consumes: `refused('record-contended')` from Task 1.
- Produces:
  ```ts
  export type SeqConflictVerdict = { contended: true } | { contended: false; fault: Error };
  export async function batchSeqConflict(seam: 'finalize' | 'decline', store: Store, recordId: string, readLength: number, index: number): Promise<SeqConflictVerdict>;
  export async function appendSeqConflict(seam: 'raiseFinding' | 'acknowledge', store: Store, recordId: string, readLength: number): Promise<SeqConflictVerdict>;
  ```
  Task 3 consumes `appendSeqConflict` with this return type.

- [ ] **Step 1: Flip the four terminality pins to a returned refusal**

In `packages/record/test/terminality.test.ts`, replace the helper (lines ~490–504):
```ts
/** The contention throw's shape: named, truthful about what landed, and naming the remedy. */
function isContentionError(seam: 'finalize' | 'decline') {
  return (err: unknown): boolean => {
    assert.ok(err instanceof Error);
    assert.equal(err.name, 'ContentionError', 'a host must be able to tell contention apart');
    assert.ok(err.message.startsWith(`${seam}: `), `the message names the seam: ${err.message}`);
    assert.doesNotMatch(
      err.message,
      /storage fault/,
      'a conforming store that lost a race to another writer is not a storage fault',
    );
    assert.match(err.message, /nothing was appended/, 'the message must say nothing landed');
    assert.match(err.message, /re-invoke/i, 'the message names re-invocation as the remedy');
    return true;
  };
}
```
with
```ts
/** The contention outcome's shape (the record-contended increment): a RETURNED refusal, never a
 * throw — `record-contended`, refusal-class, never-appends, so no transitionRef. */
function assertContended(outcome: Outcome<unknown>): void {
  assert.equal(outcome.status, 'refused', 'contention is a refusal, not an exception');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'record-contended');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined, 'a never-appends code carries no transitionRef');
}
```
and add `import type { Outcome } from '../src/outcome.js';` to the file's imports (after the
`create` import line, keeping Biome's sorted order: `../src/outcome.js` sorts after
`../src/create.js` and before `../src/store/memory.js`).

Then replace each of the four call sites. The pattern, at every one of them:
```ts
  await assert.rejects(
    () => handles.operator.finalize(recordId, identity(), CONTENT, facts()),
    isContentionError('finalize'),
  );
```
becomes
```ts
  assertContended(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
```
and the `decline` site likewise:
```ts
  assertContended(await handles.operator.decline(recordId, identity(), CONTENT, facts()));
```
Rename the four tests: replace `throws a ContentionError, not a storage fault,` with
`refuses record-contended, not a storage fault,`; replace `throws the same ContentionError` with
`refuses the same record-contended`; in the two re-invocation tests replace `after a contention
loss` with `after a record-contended refusal`.

In the fabricated-seq pin (~line 154–158), replace
```ts
      assert.notEqual(
        err.name,
        'ContentionError',
        'a fabricated conflict over an unmoved head is a storage fault, never contention',
      );
```
with
```ts
      assert.equal(
        err.name,
        'Error',
        'a fabricated conflict over an unmoved head is a plain storage-fault throw, never a refusal',
      );
```
In the failed-re-read pin (~line 213), replace
`assert.notEqual(err.name, 'ContentionError', 'contention cannot be established');` with
`assert.equal(err.name, 'Error', 'contention cannot be established — the fault throws');`.

In the historical note at ~line 279, replace
```
// since the code-review fixes, tells a moved head, `ContentionError`, from a storage fault), but it
```
with
```
// since the code-review fixes, tells a moved head — now the refusal `record-contended` — from a
// storage fault), but it
```

Also update the section comment above the fixture (search `// === the batch's seq conflict under
a CONFORMING store: contention, not a storage fault ====`): replace its last two sentences
`Nothing of the losing call lands, so the mapping must (a) not misrepresent the record\n// with a
refusal code that is false of it, and (b) be distinguishable from a storage fault, so a\n// host
can re-invoke rather than page someone.` with `Nothing of the losing call lands, so the mapping
must (a) name the record truthfully — `record-contended`, the code the record-contended
increment minted for exactly this — and (b) stay distinguishable from a storage fault, which
keeps its throw.`

- [ ] **Step 2: Run terminality to verify the four pins fail**

Run: `./node_modules/.bin/vitest run --project record packages/record/test/terminality.test.ts`
Expected: FAIL ×4 — each `assertContended(await …)` rejects with the current `ContentionError`
throw before the assertion runs (the vitest report shows the thrown error, name `ContentionError`).
The two storage-fault pins PASS (their throws are plain `Error`s already).

- [ ] **Step 3: Change the classifier's return type and the two callers**

In `packages/record/src/kernel/finalize.ts`:

Add the exported type above `batchSeqConflict`:
```ts
/**
 * The two honest stories a `seq` conflict can tell, told apart by one advisory re-read (the
 * `kernel/redeem.ts` `residualRefusal` precedent): CONTENDED — a conforming Store adjudicated
 * this call's append against a head another writer had moved, so the caller refuses
 * `record-contended` (SPEC §8: never appends; the record is unchanged and still open); or a
 * FAULT — the head did not move, or the conflict sits past element 0, or the re-read itself
 * failed — carrying the storage-fault error the caller throws (DECISIONS.md #11).
 */
export type SeqConflictVerdict = { contended: true } | { contended: false; fault: Error };
```

Change the three signatures' return types from `Promise<Error>` to `Promise<SeqConflictVerdict>`
(`batchSeqConflict`, `appendSeqConflict`, `seqConflict`).

In `seqConflict`, replace the contended branch
```ts
  if (fresh !== undefined && (index === undefined || index === 0) && fresh.length > readLength) {
    const err = new Error(
      `${seam}: contention — the chain head moved between this call's read (${readLength} ` +
        `transitions) and its append (${fresh.length} now): another writer landed a ` +
        "state-preserving append in between, and the store correctly refused this call's " +
        'stale seq. The batch is all-or-nothing: nothing was appended by this call and the ' +
        'record is unchanged by it. Re-invoke to re-evaluate the gate ladder against the new head.',
    );
    err.name = 'ContentionError';
    return err;
  }
```
with
```ts
  if (fresh !== undefined && (index === undefined || index === 0) && fresh.length > readLength) {
    return { contended: true };
  }
```
and the tail
```ts
  return reReadFailure === undefined
    ? new Error(message)
    : new Error(message, { cause: reReadFailure });
```
with
```ts
  const fault =
    reReadFailure === undefined ? new Error(message) : new Error(message, { cause: reReadFailure });
  return { contended: false, fault };
```
The `seam` parameter stays: it still prefixes the storage-fault message.

At the rung-(6) call (~line 597–600), replace
```ts
    if (res.conflict === 'seq') {
      throw await batchSeqConflict('finalize', store, recordId, chain.length, res.index);
    }
```
with
```ts
    if (res.conflict === 'seq') {
      const verdict = await batchSeqConflict('finalize', store, recordId, chain.length, res.index);
      if (verdict.contended) return refused('record-contended');
      throw verdict.fault;
    }
```

In `packages/record/src/kernel/decline.ts:288–293`, replace
```ts
    if (res.conflict === 'seq') {
      // Shared with finalize: a moved head is a `ContentionError` (re-invoke), an unmoved
      // head a storage fault — see `batchSeqConflict`'s doc comment for the split.
      throw await batchSeqConflict('decline', store, recordId, chain.length, res.index);
    }
```
with
```ts
    if (res.conflict === 'seq') {
      // Shared with finalize: a moved head refuses `record-contended` (re-invoke), an unmoved
      // head throws a storage fault — see `batchSeqConflict`'s doc comment for the split.
      const verdict = await batchSeqConflict('decline', store, recordId, chain.length, res.index);
      if (verdict.contended) return refused('record-contended');
      throw verdict.fault;
    }
```

Comments the change makes false, in `finalize.ts`:

Header lines 92–96, replace
```
//     No refusal code is true of that record (open, intact, undecided), so the seam THROWS, and
//     `batchSeqConflict` re-reads once to tell the two honest stories apart: a moved head is a
//     `ContentionError` (re-invoke — the ladder re-evaluates against the new head, so a
//     finding the confirmer never saw gates through rung (5.7) when its kind is required); an
//     unmoved head is a storage fault. Either way nothing was recorded, so both throws sit
```
with
```
//     `batchSeqConflict` re-reads once to tell the two honest stories apart: a moved head
//     refuses `record-contended` (SPEC §8, the record-contended increment — a RETURNED refusal,
//     never appends; re-invoke, and the ladder re-evaluates against the new head, so a finding
//     the confirmer never saw gates through rung (5.7) when its kind is required); an unmoved
//     head is a storage fault and THROWS. Either way nothing was recorded, so the throw sits
```
and the next line's `inside DECISIONS.md #10's "nothing was recorded" exception rather than
beside it. The` keeps reading correctly ("the throw sits inside…").

Doc comment at ~617–648 (`batchSeqConflict`'s): replace
```
 * The batch `seq`-conflict mapping — rung (6)'s single append, shared with `kernel/decline.ts`
 * (EXPORTED for it, the second caller). Only the `seq` shape reaches here: a `state-mismatch`
 * means the record is not open, which `record-not-open` describes truthfully since nothing was
 * appended, so it is returned result-first at both call sites.
```
with
```
 * The batch `seq`-conflict classifier — rung (6)'s single append, shared with `kernel/decline.ts`
 * (EXPORTED for it, the second caller). Only the `seq` shape reaches here: a `state-mismatch`
 * means the record is not open, which `record-not-open` describes truthfully since nothing was
 * appended, so it is returned result-first at both call sites. This function returns a verdict,
 * never throws: the caller refuses `record-contended` or throws the carried fault.
```
and in the same comment replace
```
 *    `unavailable` arm's `authority` names no one here. The throw carries `name =
 *    'ContentionError'` so a host can retry it programmatically without parsing prose, and
 *    its message names re-invocation as the remedy: the ladder then re-evaluates against the
 *    new head, so a finding the confirmer never saw gates through rung (5.7) if its kind is
 *    required. The seam deliberately does NOT re-send the batch with a fresh seq — that would
 *    skip (5.7) and confirm over evidence the human did not see.
```
with
```
 *    `unavailable` arm's `authority` names no one here — so the record-contended increment
 *    minted `record-contended` (SPEC §8, never appends), which the caller RETURNS: a host
 *    matches on the code and re-invokes, and the ladder then re-evaluates against the new
 *    head, so a finding the confirmer never saw gates through rung (5.7) if its kind is
 *    required. The seam deliberately does NOT re-send the batch with a fresh seq — that would
 *    skip (5.7) and confirm over evidence the human did not see.
```
and replace `Both throws sit inside DECISIONS.md #10's "storage faults where nothing was
recorded" scope:` with `The fault's throw sits inside DECISIONS.md #10's "storage faults where
nothing was recorded" scope, and the refusal is #10's result-first rule kept:`.

In `appendSeqConflict`'s doc comment (~658–666), replace `The same two honest stories, told
apart the same way; the message\n * says "append conflict" with no element index.` with
`The same two honest stories, told apart the same way and returned as the same verdict — the
caller refuses \`record-contended\` or throws the fault; the fault's message says "append
conflict" with no element index.` (keep the comment's line-wrapping).

- [ ] **Step 4: Run terminality, then the whole record project, to verify**

Run: `./node_modules/.bin/vitest run --project record packages/record/test/terminality.test.ts`
Expected: PASS (12 + the earlier additions; all green).

Run: `./node_modules/.bin/tsc -p packages/record --noEmit`
Expected: ONE error — `kernel/findings-seams.ts` still does `throw await appendSeqConflict(...)`,
whose type is now `SeqConflictVerdict`. That is Task 3's job; it is expected here. Do NOT fix it
in this task. (vitest does not type-check, so the run above is green regardless.)

- [ ] **Step 5: Commit (typecheck intentionally red until Task 3 — say so in the message)**

```bash
./node_modules/.bin/biome check --error-on-warnings . && node scripts/contract-scan.mjs
git add packages/record/src/kernel/finalize.ts packages/record/src/kernel/decline.ts packages/record/test/terminality.test.ts
git commit -m "record-contended 2/4: the seq-conflict classifier returns a verdict; finalize and decline refuse record-contended (typecheck red at findings-seams until 3/4)"
```

---

### Task 3: The findings seams refuse `record-contended`

**Files:**
- Modify: `packages/record/src/kernel/findings-seams.ts:238–250`
- Test: `packages/record/test/findings-seams.test.ts` (the race test at ~409–450)

**Interfaces:**
- Consumes: `appendSeqConflict(...): Promise<SeqConflictVerdict>` from Task 2;
  `refused('record-contended')` from Task 1.

- [ ] **Step 1: Flip the race pin to a returned refusal**

In `packages/record/test/findings-seams.test.ts`, replace the test's name
`two concurrent raiseFinding calls on one record: the loser throws a ContentionError — the record is still open, so record-not-open would be false of it`
with
`two concurrent raiseFinding calls on one record: the loser refuses record-contended — the record is still open, so record-not-open would be false of it`,
and replace its body from `const [a, b] = await Promise.allSettled([` through the line
`assert.match((loser.reason as Error).message, /raiseFinding: contention/);` with:
```ts
  const [a, b] = await Promise.all([
    handles.operator.raiseFinding(recordId, { findingId: 'f-a', kind: 'variance', findingDigest: D1 }, RAISER),
    handles.operator.raiseFinding(recordId, { findingId: 'f-b', kind: 'variance', findingDigest: D2 }, RAISER),
  ]);
  const outcomes = [a, b];
  const landed = outcomes.filter((o) => o.status === 'ok');
  const contended = outcomes.filter((o) => o.status === 'refused');
  assert.equal(landed.length, 1, 'exactly one finding lands');
  assert.equal(contended.length, 1, 'exactly one call loses the seq race — and REFUSES, never throws');
  const loser = contended[0];
  assert.ok(loser !== undefined && loser.status === 'refused');
  if (loser?.status !== 'refused') return;
  assert.equal(loser.code, 'record-contended');
  assert.equal(loser.class, 'refusal');
  assert.equal(loser.transitionRef, undefined, 'never appends — nothing of the losing call landed');
```
Keep the remaining assertions of the test (state still `open`; re-invocation lands; the chain
is `['opened', 'finding-raised', 'finding-raised']`) unchanged.

Then append a NEW pin for the producer no existing test races, `acknowledge`:
```ts
test('two concurrent acknowledgments of one finding: the loser refuses record-contended and re-invocation lands its ack', async () => {
  // `acknowledge` is the fourth producer of the code and the only one no earlier pin raced —
  // the raiseFinding race above covers the seam's sibling, not this call (the record-contended
  // increment; the spec review found the gap).
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);
  const raised = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(raised.status, 'ok');

  const [a, b] = await Promise.all([
    handles.operator.acknowledge(recordId, { findingId: 'f-1', findingDigest: D1 }, identity()),
    handles.operator.acknowledge(recordId, { findingId: 'f-1', findingDigest: D1 }, identity({ principal: 'approver:2' })),
  ]);
  const outcomes = [a, b];
  assert.equal(outcomes.filter((o) => o.status === 'ok').length, 1, 'exactly one ack lands');
  const loser = outcomes.find((o) => o.status === 'refused');
  assert.ok(loser !== undefined && loser.status === 'refused', 'the other REFUSES, never throws');
  if (loser?.status !== 'refused') return;
  assert.equal(loser.code, 'record-contended');
  assert.equal(loser.transitionRef, undefined);
  assert.equal((await handles.operator.getRecord(recordId))?.state, 'open');

  const again = await handles.operator.acknowledge(recordId, { findingId: 'f-1', findingDigest: D1 }, identity({ principal: 'approver:2' }));
  assert.equal(again.status, 'ok', 're-invocation lands against the new head');
  assert.deepEqual(
    (await handles.operator.readChain(recordId)).map((t) => t.kind),
    ['opened', 'finding-raised', 'acknowledged', 'acknowledged'],
  );
});
```
(`identity` is already imported in this file from `./helpers/profiles.js`.)

Also in Step 3, fix the seam file's ladder header — `packages/record/src/kernel/findings-seams.ts:19` —
replace `//   (5) append, CAS target 'open'     -> a lost CAS refuses record-not-open` with
`//   (5) append, CAS target 'open'     -> state-mismatch refuses record-not-open; a seq loss with
//         a moved head refuses record-contended (SPEC §8); an unmoved head throws`. Also update the test's leading
comment: replace `so the loser gets\n  // the same contention throw the batch seams give, and
re-invocation lands its own finding.` with `so the loser gets\n  // the same \`record-contended\`
refusal the batch seams return, and re-invocation lands its own finding.`

- [ ] **Step 2: Run the file to verify the pin fails**

Run: `./node_modules/.bin/vitest run --project record packages/record/test/findings-seams.test.ts`
Expected: FAIL ×2 — in both the flipped `raiseFinding` pin and the new `acknowledge` pin,
`Promise.all` rejects with the current `ContentionError` throw (the report shows the thrown
error), so each fails before its first assertion.

- [ ] **Step 3: Make the seam refuse**

In `packages/record/src/kernel/findings-seams.ts:238–250`, replace
```ts
    if (res.conflict === 'seq') {
      // The state did NOT move — the record is still open and another state-preserving
      // append took this seq (a concurrent raise/ack, or a decision seam's batch). No
      // refusal code is true of an open record, so this is the contention throw the batch
      // seams give (a moved head), or a storage fault (an unmoved one) — never
      // record-not-open, which would be false of it.
      throw await appendSeqConflict(seam, ctx.store, last.recordId, chain.length);
    }
```
with
```ts
    if (res.conflict === 'seq') {
      // The state did NOT move — the record is still open and another state-preserving
      // append took this seq (a concurrent raise/ack, or a decision seam's batch). The one
      // code true of an open record whose head moved is `record-contended` (SPEC §8, the
      // record-contended increment): a RETURNED refusal, never appends, re-invoke. An unmoved
      // head is a storage fault and throws — never record-not-open, which would be false here.
      const verdict = await appendSeqConflict(seam, ctx.store, last.recordId, chain.length);
      if (verdict.contended) return refused('record-contended');
      throw verdict.fault;
    }
```

- [ ] **Step 4: Run the file, then typecheck and the whole record project**

Run: `./node_modules/.bin/vitest run --project record packages/record/test/findings-seams.test.ts`
Expected: PASS.

Run: `./node_modules/.bin/tsc -p packages/record --noEmit && ./node_modules/.bin/vitest run --project record`
Expected: typecheck clean (Task 2's expected error is gone); 63 files, 793 tests passing (791
before this increment, plus Task 1's registry-only test and Task 3's `acknowledge` race pin;
every flipped pin counts once).

- [ ] **Step 5: Gates, then commit**

```bash
./node_modules/.bin/biome check --error-on-warnings . && ./node_modules/.bin/tsc -p packages/record --noEmit && node scripts/contract-scan.mjs
git add packages/record/src/kernel/findings-seams.ts packages/record/test/findings-seams.test.ts
git commit -m "record-contended 3/4: raiseFinding and acknowledge refuse record-contended on a moved head"
```

---

### Task 4: The sanctioned sealed-set text, the guide, and the records

**Files:**
- Modify: `docs/concept/SPEC.md` (§8 table at line 549; never-appends list at 561–563; §9
  rung (6) at 651–652; §10.2 at 837–838) — exactly the touches spec §8 licenses
- Modify: `docs/concept/ARCHITECTURE.md:144` and `:171–173`
- Modify: `docs/concept/GLOSSARY.md:87–88` and `docs/concept/DECISIONS.md:81–83` (the re-granted
  definitional touches)
- Modify: `packages/record/test/finalize-check-order.test.ts:37–42`
- Modify: `docs/guide/api-reference.md` (~279–286, 288, after 310, 508), `docs/guide/integrating.md`
  (~153–160), `docs/guide/concepts.md` (~130–132, 142)
- Modify: `CHANGELOG.md` (lines ~143, ~190, ~210; one new Added entry before `### Changed`)
- Modify: `CLAUDE.md:32` and `:220`
- Modify: `docs/process/implementation-status.md` (current-state ~90 and ~108–109; a new section
  appended at the end)
- Modify: `docs/process/next-phases.md:355–360`
- Modify: `docs/process/deferral-register.md` (row 22's phrase "the `ContentionError` path" only)
- (Not this task: `docs/superpowers/INDEX.md` already names this plan and counts 44 — done when
  the plan was committed; `docs-index-sync` in Step 6 confirms it.)

**Interfaces:** none (documentation and one test header).

- [ ] **Step 1: The sealed-set text (the sanctioned touches only)**

`docs/concept/SPEC.md`, §8 profile-conditional table: after line 549
```
| `ack-missing` / `ack-stale` | findings flow (§10.2); `refusal`-class, `terminalRefusals`-able, open-by-default | [PROVEN] |
```
insert
```
| `record-contended` | findings flow (§10.2); `refusal`-class — a decision-progress or findings seam lost its append to a concurrent finding or acknowledgment on the same record: nothing recorded, the record still `open`, re-invocation re-evaluates against the new head; never appends | [PROVEN] |
```

§8 never-appends DEFINITION, lines 560–561 (re-granted): replace
```
records it is surfaced result-first with no edge; a fixed **never-appends** set — the
pre-record, terminal-record, and redemption/seal codes (`record-exists`, `record-not-open`,
```
with
```
records it is surfaced result-first with no edge; a fixed **never-appends** set — the
pre-record, terminal-record, contention, and redemption/seal codes (`record-exists`, `record-not-open`,
```

§8 never-appends list, lines 562–563: replace
```
`unknown-profile`, `unknown-leg`, `unredeemable-state`, `unsealable-state`, `effect-mismatch`,
`already-redeemed`, `redemption-timeout`, `prior-leg-unverified`) — never appends; every other
```
with
```
`unknown-profile`, `unknown-leg`, `unredeemable-state`, `unsealable-state`, `effect-mismatch`,
`already-redeemed`, `redemption-timeout`, `prior-leg-unverified`, `record-contended`) — never
appends; every other
```

§9 rung (6), lines 651–652: replace
```
`appendBatch([chain-verify, facts, …obtained consultations, confirmed])` — all-or-nothing, so
a conflict never leaves a partial tail. Two validation *throws* sit deliberately ahead of the
```
with
```
`appendBatch([chain-verify, facts, …obtained consultations, confirmed])` — all-or-nothing, so
a conflict never leaves a partial tail: an entry conflict on state refuses `record-not-open`,
and a sequence conflict against a head a concurrent finding or acknowledgment moved refuses
`record-contended` (§10.2, never appends) — the seam never re-sends the batch, and
re-invocation re-evaluates the ladder against the new head. Two validation *throws* sit
deliberately ahead of the
```

§10.2, lines 836–838: replace
```
(the expired edge appended en passant where due), any other non-open state refuses
`record-not-open` (never-append, §8); both seams throw on a record whose resolved leg
```
with
```
(the expired edge appended en passant where due), any other non-open state refuses
`record-not-open` (never-append, §8), and an append that loses its sequence to a concurrent
finding or acknowledgment refuses `record-contended` (never-append, §8) — the record unchanged
and still open; both seams throw on a record whose resolved leg
```

`docs/concept/GLOSSARY.md:87–88`: replace
```
- **Never-append set** — the fixed refusal codes that never write a `refused` edge
  (pre-record, terminal-record, redemption/seal codes) (SPEC §8).
```
with
```
- **Never-append set** — the fixed refusal codes that never write a `refused` edge
  (pre-record, terminal-record, contention, and redemption/seal codes) (SPEC §8).
```

`docs/concept/DECISIONS.md:81–83`: replace
```
15. **A fixed never-appends set.** Pre-record, terminal-record, and redemption/seal codes
    never write a `refused` edge. — There is either no record to append to, or a terminal
    chain that must not grow; appending "refusals" there fabricates history. — Inert
```
with
```
15. **A fixed never-appends set.** Pre-record, terminal-record, contention, and
    redemption/seal codes never write a `refused` edge. — There is either no record to append
    to, a terminal chain that must not grow, or a lost sequence race whose call landed nothing;
    appending "refusals" there fabricates history. — Inert
```

`docs/guide/concepts.md:136–137` (the guide's restatement, not sealed): replace `(the pre-record
failures, the state-gate refusals, and every redemption-seam refusal)` with `(the pre-record
failures, the state-gate refusals, the contention refusal, and every redemption-seam refusal)`.

`docs/concept/ARCHITECTURE.md:144`: replace
```
 (6)   success batch                →  ok  (one atomic appendBatch)
```
with
```
 (6)   success batch                →  ok  (one atomic appendBatch) / record-contended
                                       (findings-flow only: the head moved under a concurrent
                                       finding or ack)
```
and lines 171–173: replace
```
- **(6) success batch** — one atomic, variable-arity
  `appendBatch([chain-verify, facts, …obtained consultations, confirmed])`; all-or-nothing,
  so a conflict never leaves a partial tail of stray transitions.
```
with
```
- **(6) success batch** — one atomic, variable-arity
  `appendBatch([chain-verify, facts, …obtained consultations, confirmed])`; all-or-nothing,
  so a conflict never leaves a partial tail of stray transitions. A sequence conflict against
  a head a concurrent finding or acknowledgment moved refuses `record-contended` (findings-flow
  only; never appends) — the seam never re-sends, and re-invocation re-evaluates the ladder.
```

- [ ] **Step 2: The check-order header**

`packages/record/test/finalize-check-order.test.ts:37–42`: replace
```
//       landed. A `seq` conflict at that same entry THROWS instead — a `ContentionError` when
//       a re-read shows the head moved, a storage fault when it did not
//       (kernel/finalize.ts's `batchSeqConflict`) — and a throw is not a refusal code — it
//       cannot enter an order pair at all. The surviving refusal still needs a concurrent
//       writer landing between the read and the batch: there is no way to construct a RECORD
//       whose data trips it,
```
with
```
//       landed. A `seq` conflict at that same entry refuses `record-contended` when a re-read
//       shows the head moved (the record-contended increment), and THROWS a storage fault when
//       it did not (kernel/finalize.ts's `batchSeqConflict`); the throw is not a refusal code
//       and cannot enter an order pair. Both rung-(6) refusals need a concurrent writer landing
//       between the read and the batch, so the (5.7)->(6) pair is constructible ONLY by a race
//       and is pinned where the race is driven — terminality.test.ts's raced-finding tests —
//       with a carve-out from this file's own definition: on the LOSING call the LATER rung's
//       code surfaces (`record-contended`), because (5.7) ran against the stale head, and it is
//       the RE-INVOCATION that refuses `ack-missing`. There is no way to construct a RECORD whose
//       data trips it,
```
Then run `./node_modules/.bin/vitest run --project record packages/record/test/finalize-check-order.test.ts` — Expected: PASS (comment-only change).

- [ ] **Step 3: The guide**

`docs/guide/api-reference.md`: replace the paragraph beginning `One exception is retryable by
design rather than a bug.` (through `...differently worded throw.`) with:
```
One refusal describes a race rather than an input. When `finalize`, `decline`, `raiseFinding`
or `acknowledge` loses its append to a concurrent state-preserving append on the same record (a
finding raised or acknowledged between the seam's chain read and its write), it returns
`{ status: 'refused', code: 'record-contended' }`: nothing was recorded, the record is unchanged
and still open, and re-invoking re-runs the whole gate ladder against the new head — so a
required-kind finding raised in between now gates. The seam never retries the append itself. A
genuine storage fault at the same site stays a throw, told apart by a one-time re-read.
```
Replace `24 codes against the current tree.` with `25 codes against the current tree.`
After the table row `| \`ack-missing\` / \`ack-stale\` | ... |` insert
```
| `record-contended` | A decision or findings seam lost its append to a concurrent finding or acknowledgment on the same record — nothing recorded, the record still open; re-invoke (never appends; findings-flow profiles only) |
```
Replace `(the\n\`ContentionError\` case)` (line ~507–508) with `(the\n\`record-contended\` case)`.

`docs/guide/integrating.md`: replace the paragraph beginning `One exception is not your bug.`
(through `...and neither should you.`) with:
```
One refusal is neither an input problem nor a state change. A `finalize`, `decline`,
`raiseFinding` or `acknowledge` that loses its append to a concurrent `raiseFinding` or
`acknowledge` on the same record refuses `record-contended`. Nothing was recorded and the record
is still open. Re-invoke it: the ladder re-evaluates against the new head, so a required-kind
finding raised in between now gates. If your surface shows the human the record before they
decide, consider re-prompting first — the library will not confirm on their behalf over
evidence they never saw, and neither should you.
```

`docs/guide/concepts.md`: replace the sentences beginning `One further\nexception is neither a
bug nor an outage:` (through `(the integration guide has the shape).`) with
```
A lost race is
neither: a concurrent `raiseFinding` or `acknowledge` can cost `finalize`, `decline`, or a
findings seam its append, which surfaces as the refusal `record-contended` — nothing recorded,
re-invoke (the integration guide has the shape).
```
and replace `The full registry is 24 codes;` with `The full registry is 25 codes;`.

- [ ] **Step 4: CHANGELOG, CLAUDE.md, next-phases**

`CHANGELOG.md`: immediately before the line `### Changed` insert
```
- **`record-contended`** (2026-09-02, the record-contended increment — a SPEC §8 registry
  amendment under its own fresh sanction, the tenth marker-bearing sealed-set edit): the
  twenty-fifth refusal code. A `finalize`, `decline`, `raiseFinding` or `acknowledge` that loses
  its append to a concurrent finding or acknowledgment on the same record now returns
  `{ status: 'refused', code: 'record-contended' }` — nothing recorded, the record still open,
  re-invoke — where the code-review fixes earlier in this same unreleased span had thrown an
  `Error` named `ContentionError`. Profile-conditional under the findings flow, the only source
  of state-preserving appends; never appends; a genuine storage fault at the same site keeps its
  throw. The two `ContentionError` entries below describe that interim shape and are left as the
  history they are.

```
Replace line ~143's `same record now throw an \`Error\` named \`ContentionError\` — nothing
recorded, re-invoke —` with `same record now throw an \`Error\` named \`ContentionError\` —
nothing recorded, re-invoke; since minted as the refusal \`record-contended\`, see Added —`.
Replace line ~190's `same \`ContentionError\` the decision seams throw,` with `same
\`ContentionError\` the decision seams then threw (since the refusal \`record-contended\`),`.
Replace line ~210's `(\`ContentionError\`, \`SqliteStore.close()\`,` with `(\`ContentionError\`,
since \`record-contended\`; \`SqliteStore.close()\`,`.

`docs/process/deferral-register.md`, row 22: replace `(the \`ContentionError\` path)` with
`(the \`record-contended\` path)` — the name disappears everywhere; nothing else on the row moves.

`CLAUDE.md:32`: replace `carries 24 refusal codes;` with `carries 25 refusal codes;`.
`CLAUDE.md:220`: replace `CONTROLS.md and GLOSSARY.md tokens — nine marker-move commits in
total, each a separate,` with `CONTROLS.md and GLOSSARY.md tokens, and the `record-contended`
registry amendment (SPEC §8's row and its §9/§10.2/ARCHITECTURE sentences, landed with the
behavior) — ten marker-bearing sealed-set commits in total, each a separate,`.

`docs/process/next-phases.md:355–360`: replace `Four further questions were surfaced by the
2026-09-02 code review and are recorded as` with `Three further questions were surfaced by the
2026-09-02 code review and are recorded as` and delete the whole first bullet (`- **A
never-appends contention refusal code.** …` through `The result-first shape is a new code.`),
then add after the list's last bullet:
```

(A fourth, a never-appends contention refusal code, was decided the same day: `record-contended`,
minted under its own sanction — `docs/superpowers/specs/2026-09-02-record-contended-design.md`.)
```

`docs/superpowers/INDEX.md`: nothing to do — its row and its plan count (44) landed with this
plan's own commit.

- [ ] **Step 5: The status document**

`docs/process/implementation-status.md`: in the current-state bullet (~line 90) replace
`Store (an \`Error\` named \`ContentionError\`, re-invoke), told from a storage fault by one`
with `Store (first an \`Error\` named \`ContentionError\`, since the record-contended increment
the returned refusal \`record-contended\`), told from a storage fault by one`. Replace lines
~108–109's `carries 24 refusal codes, the twenty-fourth and\n  last being \`consultation-stale\`;`
with `carries 25 refusal codes, the twenty-fifth being\n  \`record-contended\` (the record-
contended increment);`. Append at the end of the file:
```

## Post-build-order increment — `record-contended` (a SPEC §8 registry amendment)

**The twentieth post-build-order increment, exited (branch `record-contended`, four commits,
fast-forwarded to `main`).** The 2026-09-02 code review left a seam's lost sequence race
surfacing as an `Error` named `ContentionError` — a throw where DECISIONS.md #10 says refusals
are returned, taken only because no registry code was true of an open, intact, undecided record
and the registry is spec-fixed. This increment minted the code. Its design and promotion case is
`docs/superpowers/specs/2026-09-02-record-contended-design.md`; its plan
`docs/superpowers/plans/2026-09-02-record-contended.md`.

**The sanction.** Granted 2026-09-02 by the maintainer in session, recorded against the design's
§8, licensing exactly: one SPEC §8 profile-conditional row (`record-contended`, findings flow
§10.2, `[PROVEN]`); the code in §8's never-appends list; one sentence at §9 rung (6); one clause
in §10.2's seam-discipline sentence; the ARCHITECTURE §5 ladder line and its (6) bullet. Nothing
else under `docs/concept/` moved — CONTROLS.md, GLOSSARY.md, OPEN-QUESTIONS.md and CONCEPT.md are
untouched, for the reasons the design states. This is the **tenth marker-bearing sealed-set
edit** in the repository's lineage, and the first that amends the registry rather than promoting
a capability; the row landed `[PROVEN]` in the task that landed the text, after the behavior
(Tasks 1–3), never ahead of it.

**Tier and placement.** GOVERNED, under the findings flow: the only state-preserving appends
between `opened` and a decision are `finding-raised` and `acknowledged`, so on a profile with no
findings flow no writer exists to lose a sequence race to — two finalizes racing lose at the
entry compare-and-swap, which is `record-not-open` and true. The structural witness is the
findings seams' own (2.5) declaring check, which throws on a non-declaring leg before any append.

**What landed.** `refusal-codes.ts`: the twenty-fifth code, `refusal`-class, in `NEVER_APPENDS`.
`kernel/finalize.ts`: the shared seq-conflict classifier returns a `SeqConflictVerdict`
(contended, or a fault carrying the storage-fault error) instead of an `Error`; finalize and
decline refuse `record-contended` on contended and throw the fault otherwise; `raiseFinding` and
`acknowledge` (`kernel/findings-seams.ts`) likewise. The `ContentionError` name is gone; nothing
published ever carried it. The storage-fault branches — unmoved head, conflict past element
zero, failed re-read (with `cause`) — are unchanged throws.

**Pins.** Five flipped from a thrown name to `status: 'refused'`, `code: 'record-contended'`,
`class: 'refusal'`, no `transitionRef`, each keeping its post-state assertions — four in
`terminality.test.ts` (finalize ×3 including both re-invocation outcomes, `ok` for a non-gating
kind and `ack-missing` for a required one; decline ×1) and the concurrent-`raiseFinding` race in
`findings-seams.test.ts`. One registry-only pin added (`refusal-matrix.test.ts`); the two
total-accounting pins moved to twenty-five. The two storage-fault pins now assert a plain
`Error`. Every flipped pin was run RED against the throw first.

**Honest bounds, restated.** The contention-versus-fault split is still inferred from a re-read
after the store adjudicated; the exact signal (`headSeq` on the store's conflict arms) is
register row 23's. Under a signing profile a contention loss still leaves one sidecar entry per
batch element (row 22's widened inventory). A code/spec observation surfaced while editing §8's
never-appends list and is recorded, not reconciled: the list omits `supersedes-unverified`,
which the code's `NEVER_APPENDS` set carries and SPEC §2's recovery text treats as pre-record;
the sanction did not license that sentence and it is left for a future consistency pass.

**Gate outputs, as measured against the closing commit.** `tsc -p packages/record --noEmit` and
`-p packages/store-postgres --noEmit` clean; `vitest run` — 67 files, 862 tests, zero skips
(record 793, store-postgres 69); `biome check --error-on-warnings .` — 135 files, exit 0;
`contract-scan`, `api-reference-sync`, `docs-index-sync` — exit 0.
```
(If the measured totals differ at the closing commit, write the measured figures — never the
plan's.)

- [ ] **Step 6: Gates, then the closing commit**

```bash
./node_modules/.bin/biome check --error-on-warnings . && ./node_modules/.bin/tsc -p packages/record --noEmit && ./node_modules/.bin/tsc -p packages/store-postgres --noEmit && ./node_modules/.bin/vitest run && node scripts/contract-scan.mjs && node scripts/api-reference-sync.mjs && node scripts/docs-index-sync.mjs
git add docs/concept/SPEC.md docs/concept/ARCHITECTURE.md docs/concept/GLOSSARY.md docs/concept/DECISIONS.md packages/record/test/finalize-check-order.test.ts docs/guide CHANGELOG.md CLAUDE.md docs/process/implementation-status.md docs/process/next-phases.md docs/process/deferral-register.md
git commit -m "record-contended 4/4: the sanctioned SPEC §8/§9/§10.2 and ARCHITECTURE text lands with the behavior; guide, changelog and records catch up"
```
Then report the measured totals and stop; fast-forwarding `main` is the maintainer's call.
