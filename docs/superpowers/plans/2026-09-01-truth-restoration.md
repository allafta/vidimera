# Truth Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every stale sentence the tree ships or asserts about itself true, and land
the six cheap evidence pins — zero behavior change except one output-identical leg-index
derivation in `kernel/expiry.ts`.

**Architecture:** Ten tasks on one branch: four shipped-source comment repairs (task 1),
the expiry leg-index fix with its pin (task 2), two test-comment repairs each paired with
the tests whose absence let them stay wrong (tasks 3–4), five new evidence pins (tasks
5–9), and the exit paperwork (task 10). Every task leaves the full suite green and is
independently committable.

**Tech Stack:** TypeScript (strict), vitest, node:assert/strict, Biome, the repo's own
gate scripts.

**Spec:** `docs/superpowers/specs/2026-09-01-truth-restoration-design.md` — read it first;
its "Rulings taken" and STOP-envelope sections bind every task here.

## Global Constraints

- **Branch:** all work on a `truth-restoration` branch off `main`. Before EVERY commit run
  `git branch --show-current` and confirm it prints `truth-restoration` (a past increment
  lost a commit to a detached head).
- **Commits:** write the message to a file and use `git commit -F <file>` (a here-string
  once leaked `'@` into a subject on this machine). End every message with the line
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **Runner (this machine):** pnpm's shim is broken (corepack EPERM). Use the local
  binaries directly from the repo root:
  - test: `./node_modules/.bin/vitest run <path>` (no path = full suite; the
    store-postgres project starts an embedded Postgres via its globalSetup — slow is
    normal)
  - typecheck: `./node_modules/.bin/tsc -p packages/record --noEmit && ./node_modules/.bin/tsc -p packages/store-postgres --noEmit`
  - lint: `./node_modules/.bin/biome check --error-on-warnings .`
  - gates: `node scripts/contract-scan.mjs`, `node scripts/api-reference-sync.mjs`,
    `node scripts/docs-index-sync.mjs` (each prints nothing and exits 0 when clean)
- **STOP conditions (from the spec):** any `packages/*/src/` edit beyond the seven files
  the spec's envelope names; any test that surprises (wrong refusal code, unexpected ok,
  posture mismatch) — report the finding, do not adjust source or expectation to pass;
  any movement in `packages/record/test/byte-stability.test.ts` or any EXISTING
  `PINNED_` literal; any edit under `docs/concept/` or `docs/guide/`.
- **`docs/process/implementation-status.md`:** rows are single physical lines (table
  cells) — edits must not introduce newlines. Only the three sentences named in tasks 1,
  2, 6 plus task 10's new account section may change; the commit-pinned gate blocks are
  untouchable.
- **contract-scan trap:** edited `.ts` comment lines must not introduce the bare words
  `slice`/`pre-slice`, `design` (except "by design"), foreign labels (`M-A`, `T1.2`…), or
  abbreviated commit refs. Citing `docs/analysis/2026-08-19-phase-1-api-review.md` from a
  comment is fine (precedent: `test/public-surface.test.ts:2`).
- **Line references** below were verified against `main = 38b70df` on 2026-09-01 and
  drift with edits — locate by the quoted text, not the number, and re-verify before
  each edit.

---

### Task 1: Cluster A comment repairs (A1–A4) + the `listDue` ruling note

**Files:**
- Modify: `packages/record/src/operator-surface.ts:34-37`
- Modify: `packages/record/src/id.ts:17-18`
- Modify: `packages/record/src/store/store.ts:121-123`
- Modify: `packages/record/src/refusal-codes.ts:209-212` and `:220-221`
- Modify: `docs/process/implementation-status.md:414` (two substring edits, one line)

**Interfaces:** none — comment/prose only. No behavior, no test.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b truth-restoration
```

- [ ] **Step 2: `operator-surface.ts` — the retired review is ratified, not pending**

Replace (at ~:34-37):

```ts
// The seam family now has a token half alongside the direct one — SPEC §11.2 names one
// verb, `redeem()`; the three call names here (`redeem`/`beginRedemption`/
// `completeRedemption`) are this build's own, recorded in
// `docs/process/implementation-status.md` and flagged to the pre-0.1 naming review.
```

with:

```ts
// The seam family now has a token half alongside the direct one — SPEC §11.2 names one
// verb, `redeem()`; the three call names here (`redeem`/`beginRedemption`/
// `completeRedemption`) are this build's own, recorded in
// `docs/process/implementation-status.md` and RATIFIED by the pre-0.1 API review, which
// retired deferral register row 6 on 2026-08-19
// (`docs/analysis/2026-08-19-phase-1-api-review.md`).
```

- [ ] **Step 3: `id.ts` — the floor is 22.16, not 24**

Replace (at ~:17-18):

```
 * `node:crypto` is already the project's runtime baseline (Node >= 24, no new
 * dependency); collision probability is cryptographically negligible; and a bare UUID
```

with:

```
 * `node:crypto` is already the project's runtime baseline (Node >= 22.16, the declared
 * `engines` floor in both manifests; no new dependency); collision probability is
 * cryptographically negligible; and a bare UUID
```

- [ ] **Step 4: `store/store.ts` — the Postgres adapter landed**

Replace (at ~:121-123):

```
 * for the whole adapter contract. Async throughout — committing now avoids a breaking
 * sync->async flip once a real Postgres adapter lands — even though `store/memory.ts`'s
 * Map-backed implementation has no genuine I/O to await.
```

with:

```
 * for the whole adapter contract. Async throughout — committed before any SQL backing
 * existed, so the server-SQL adapter (`@vidimera/store-postgres`, real since 2026-08-19)
 * arrived without a breaking sync->async flip — even though `store/memory.ts`'s
 * Map-backed implementation has no genuine I/O to await.
```

- [ ] **Step 5: `refusal-codes.ts` — `appendsOn` has two consulting ladders now**

Verified mechanics (2026-09-01): `appendsOn`'s only direct src caller is
`refuseMaybeAppend` (`kernel/finalize.ts:817`), which is exported for `kernel/decline.ts`
as its second caller (7 call sites, `decline.ts:141-199`); decline's ladder resolves
state/expiry at its own rung (2) (`decline.ts:119-137`), mirroring finalize's, ahead of
its `refuseMaybeAppend` rungs. Two `refuseMaybeAppend` sites pass variables
(`finalize.ts:422` `code`, `:476` `row.coverage`) — so do NOT claim "every site passes a
literal"; the rung-(2) ordering is the truth that holds.

Replace (at ~:209-212):

```
 * `terminalRefusals`, but it is resolved by finalize()'s state/expiry gate BEFORE any
 * refusal-append decision is reached (kernel/finalize.ts step (2), ahead of steps
 * (3)-(5.7) which are the only callers of `appendsOn`) — so `appendsOn('leg-expired', …)`
 * is never actually consulted by the kernel.
```

with:

```
 * `terminalRefusals`, but it is resolved at rung (2) — the state/expiry gate — of BOTH
 * ladders that consult `appendsOn`, before any refusal-append decision is reached:
 * kernel/finalize.ts's steps (3)-(5.7) and, since the recorded-human-decline increment,
 * kernel/decline.ts's refusal rungs, each consulting only through `refuseMaybeAppend`
 * (kernel/finalize.ts, exported for decline as its second caller) — so
 * `appendsOn('leg-expired', …)` is never actually consulted by the kernel.
```

And replace (at ~:220-221):

```
 * refusal-matrix.test.ts). Keep it that way, or gate it explicitly if/when `appendsOn`
 * usage widens beyond finalize's steps (3)-(5.7).
```

with:

```
 * refusal-matrix.test.ts). Keep it that way, or gate it explicitly if `appendsOn` usage
 * widens again — it widened once already (kernel/decline.ts's ladder, above) with the
 * conclusion intact, because decline mirrors finalize's rung-(2) placement.
```

- [ ] **Step 6: `implementation-status.md:414` — two substring edits, same physical line**

Both target substrings verified verbatim on line 414. Edit in place; the line must stay
one line. First:

- old: `held as a spec-vs-build naming divergence and flagged to deferral register row 6's pre-0.1 naming review.`
- new: `held as a spec-vs-build naming divergence; row 6's pre-0.1 naming review RATIFIED the triad and retired 2026-08-19 (see docs/analysis/2026-08-19-phase-1-api-review.md).`

Second (the `listDue()` clause — ruling 3 of the spec: the honest note, never a
retroactive-coverage claim):

- old: `flagged to the same row 6 review, for the same reason as the two call names above.`
- new: `routed to the same row 6 review, for the same reason as the two call names above — but that review's name-by-name pass never ruled on it: NO recorded ruling covers the name (noted 2026-09-01, the truth-restoration increment), and it is docketed to the 1.0 freeze beside its ids-vs-records shape.`

- [ ] **Step 7: Verify no stale phrase survives, and the gates hold**

```bash
git grep -n "flagged to the pre-0.1 naming review\|once a real Postgres adapter lands\|Node >= 24, no new\|which are the only callers of" -- packages/record/src docs/process/implementation-status.md
```
Expected: no output. Then:

```bash
./node_modules/.bin/tsc -p packages/record --noEmit && ./node_modules/.bin/tsc -p packages/store-postgres --noEmit
./node_modules/.bin/biome check --error-on-warnings .
node scripts/contract-scan.mjs
```
Expected: all exit 0, no output from the scan.

- [ ] **Step 8: Review each changed sentence against the tree** — the task's whole point.
Read every replacement above in its file and confirm it is now TRUE (not differently
wrong): the review really is retired (`docs/process/next-phases.md` row 6), the floor
really is 22.16 (`engines` in both `package.json`s), the adapter really exists
(`packages/store-postgres/`), decline really is the second caller (`decline.ts:36`).

- [ ] **Step 9: Commit**

```bash
git branch --show-current   # must print: truth-restoration
git add -A && git commit -F <msgfile>   # subject: "Truth restoration 1/10: cluster A comment repairs — four shipped-source sites and the listDue no-ruling note"
```

---

### Task 2: A5 — the `expiry.ts` leg-index derivation, its pin, and the residual sentence

**Files:**
- Modify: `packages/record/src/kernel/expiry.ts:133-135`
- Test: `packages/record/test/clocks.test.ts` (one new test + imports)
- Modify: `docs/process/implementation-status.md:423` (one substring, one line)

**Interfaces:**
- Consumes: `resolveDueClock(store, chain, resolved, now)` (already exported, already
  imported in clocks.test.ts); `storeGenesis`/`storeNext` (`./helpers/chain.js`);
  `MemoryStore`; `effectSeamProfile`, `identity` (`./helpers/profiles.js`);
  file-scope consts `T0`, `CONFIRM_BOUND`.
- Produces: nothing later tasks use.

- [ ] **Step 1: Write the pin test** (append to `clocks.test.ts`; add `storeGenesis` to
the existing `./helpers/chain.js` import, and add
`import type { AppendMeta, BatchResult, Store } from '../src/store/store.js';` /
`import type { RecordState, Transition } from '../src/types.js';` only if the subclass
below needs them to typecheck):

```ts
class MetaSpyStore extends MemoryStore {
  captured: { nonTerminal: boolean } | undefined;
  override async appendTransition(
    expected: RecordState | null,
    t: Transition,
    meta: AppendMeta,
  ) {
    this.captured = meta;
    return super.appendTransition(expected, t, meta);
  }
}

test('resolveDueClock derives the leg index: the expired append is terminal (nonTerminal false) on a final-leg MULTI-LEG effect profile', async () => {
  // The one shape where a hardcoded leg index 0 and the derived index could ever
  // disagree: a due CONFIRMED record on the FINAL leg of a two-leg effect profile. Both
  // derivations feed nonTerminal('expired', flag, true) === false — this pin states the
  // append's meta as a contract, for the day a non-terminal clock edge ever exists.
  const twoLegEffect = {
    ...effectSeamProfile(),
    legs: [
      { id: 'leg-first', allowedAuthorities: ['session:test-app'] },
      { id: 'leg-final', allowedAuthorities: ['session:test-app'] },
    ],
  };
  const resolved = {
    profile: twoLegEffect,
    canonicalizer: (c: unknown) => c,
    effectSeam: true,
  };

  const genesisBase = storeGenesis('rec-legindex', twoLegEffect.id, 'subject:legindex');
  const genesis = {
    ...genesisBase,
    payload: { ...(genesisBase.payload as Record<string, unknown>), legId: 'leg-final' },
  };
  const confirmed = storeNext(genesis, 'confirmed', { actor: identity() });
  const spy = new MetaSpyStore();
  await spy.appendTransition(null, genesis, { nonTerminal: true });
  await spy.appendTransition('open', confirmed, { nonTerminal: true });
  const chain = await spy.readChain('rec-legindex');
  spy.captured = undefined;

  const past = new Date(Date.parse(confirmed.at) + (CONFIRM_BOUND + 10) * 1000);
  const res = await resolveDueClock(spy, chain, resolved, past);
  assert.equal(res.due, true);
  if (!res.due) return;
  assert.equal(res.window, 'confirmed');
  assert.equal(spy.captured?.nonTerminal, false, 'the expired append is terminal');
  assert.equal((await spy.readChain('rec-legindex')).at(-1)?.kind, 'expired');
});
```

If `resolved` needs a cast to satisfy `ResolvedProfile`, mirror whatever the existing
inline object at `clocks.test.ts:117-121` does (it compiles bare today).

- [ ] **Step 2: Run it — expect PASS on the UNFIXED code, and know why**

```bash
./node_modules/.bin/vitest run packages/record/test/clocks.test.ts
```
Expected: PASS. This is not a TDD red — `nonTerminal('expired', …)` is `false` under both
derivations by construction; the pin is a contract statement, not a differential.

- [ ] **Step 3: Prove the pin can fail** — temporarily change the assertion's expected
value `false` to `true`, run, watch it FAIL, revert. This is the firing check (standing
lesson: a green suite with a new pin firing zero times proves nothing).

- [ ] **Step 4: Apply the fix.** In `packages/record/src/kernel/expiry.ts`, replace:

```ts
  const state = kind === 'expired' ? 'expired' : 'redemption-failed';
  const { profile, effectSeam } = resolved;
  const meta = { nonTerminal: nonTerminal(state, isFinalLeg(0, profile.legs.length), effectSeam) };
```

with:

```ts
  const state = kind === 'expired' ? 'expired' : 'redemption-failed';
  const { profile, effectSeam } = resolved;
  // Derived, not hardcoded, mirroring pendingWindow's confirmed arm. Output-identical:
  // both resolution kinds are terminal, so nonTerminal() is false for every input either
  // way; the derived index keeps this append correct if a non-terminal clock edge ever
  // exists. Pinned in clocks.test.ts.
  const record = replay(chain);
  const legIndex = profile.legs.findIndex((l) => l.id === record.legId);
  const meta = {
    nonTerminal: nonTerminal(state, isFinalLeg(legIndex, profile.legs.length), effectSeam),
  };
```

`replay` is already imported in `expiry.ts` (`pendingWindow` uses it at ~:67).

- [ ] **Step 5: Full record-package suite — output-identical means NOTHING else moves**

```bash
./node_modules/.bin/vitest run packages/record
```
Expected: all pass, in particular `byte-stability.test.ts` and every `byte-regression`
file untouched and green. Any byte-pin movement is a STOP.

- [ ] **Step 6: `implementation-status.md:423`** — replace the substring (one line, table
cell, no newlines):

- old: `One residual hardcoded leg index remains, at `kernel/expiry.ts`'s single `expired`/`redemption-failed` append, where the fed flag is `false` for every input either way`
- new: `The last residual hardcoded leg index — kernel/expiry.ts's single expired/redemption-failed append — was removed at the truth-restoration increment (2026-09-01), the index now derived from the replayed record exactly as the dueAt producer derives its own; output-identical (the fed flag is false for every input under either derivation, both kinds being terminal), pinned in clocks.test.ts`

- [ ] **Step 7: Gates + commit**

```bash
./node_modules/.bin/tsc -p packages/record --noEmit && node scripts/contract-scan.mjs && ./node_modules/.bin/biome check --error-on-warnings .
git branch --show-current && git add -A && git commit -F <msgfile>   # subject: "Truth restoration 2/10: expiry.ts derives the leg index — output-identical, pinned"
```

---

### Task 3: B1 — the enlisted-token due-window pair, and the stale "token seams take no tx"

**Files:**
- Test + Modify: `packages/record/test/clocks.test.ts` (two new tests; one comment fix
  inside the test at ~:195)

**Interfaces:**
- Consumes: `confirmedAt(clock, store)` and `redeemingAt(clock, store)` (file-local
  helpers, both accept a `SqliteStore`); `SqliteStore` (imported); consts `T0`,
  `CONFIRM_BOUND`, `REDEEM_BOUND`, `CONTENT`.

Expected codes verified from source before writing (kernel/redeem.ts's enlisted-and-due
guard): an enlisted call reaching a due window refuses `unredeemable-state` for BOTH
windows, never `redemption-timeout`, with NO edge. The un-enlisted re-invocation resolves:
confirmed window → `expired` edge + `unredeemable-state`; redeeming window →
`redemption-failed` edge + `redemption-timeout` (the pin at ~:239 states that mapping).
If a run disagrees: STOP, report the finding.

- [ ] **Step 1: Fix the stale parenthetical** inside the ENLISTED direct-seam test
(~:200-202). Replace:

```ts
  // adapter throw mid-host-transaction. Only direct redeem(recordId, content, tx) reaches
  // the shared prologue enlisted (the token seams take no tx), so this is the one shape
  // that can hit it.
```

with:

```ts
  // adapter throw mid-host-transaction. All three redemption seams reach the shared
  // prologue enlisted (each carries a tx via opts.tx since the effect-result increment);
  // this test pins the direct shape, and the two token-seam twins below pin the others.
```

- [ ] **Step 2: Write the two twins** (append directly after the ENLISTED direct-seam
test):

```ts
test('ENLISTED: beginRedemption(recordId, content, { tx }) against a due-confirmed record on SqliteStore refuses unredeemable-state with no edge, and an un-enlisted call still resolves it', async () => {
  const clock = { t: T0 };
  const store = new SqliteStore(':memory:');
  const { handles, recordId } = await confirmedAt(clock, store);
  clock.t = T0 + (CONFIRM_BOUND + 10) * 1000; // past the confirmed window's bound

  const before = await store.readChain(recordId);
  store.database.exec('BEGIN IMMEDIATE');
  const outcome = await handles.operator.beginRedemption(recordId, CONTENT, {
    tx: store.database,
  });
  assert.equal(store.database.isTransaction, true, "the host's transaction is still open");
  store.database.exec('COMMIT'); // nothing was appended — an empty commit either way

  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state', 'never redemption-timeout on an enlisted call');
  assert.equal(outcome.transitionRef, undefined, 'no edge — the enlisted call appends nothing');
  assert.deepEqual(await store.readChain(recordId), before, 'the chain is untouched');

  const resolved = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(resolved.status, 'refused');
  if (resolved.status !== 'refused') return;
  assert.equal(resolved.code, 'unredeemable-state');
  assert.equal((await store.readChain(recordId)).at(-1)?.kind, 'expired');
});

test('ENLISTED: completeRedemption(recordId, token, content, { tx }) against a due-redeeming record on SqliteStore refuses unredeemable-state with no edge, and an un-enlisted call still resolves it', async () => {
  const clock = { t: T0 };
  const store = new SqliteStore(':memory:');
  const { handles, recordId, token } = await redeemingAt(clock, store);
  clock.t = T0 + (REDEEM_BOUND + 10) * 1000; // past the redeeming window's bound

  const before = await store.readChain(recordId);
  store.database.exec('BEGIN IMMEDIATE');
  const outcome = await handles.operator.completeRedemption(recordId, token, CONTENT, {
    tx: store.database,
  });
  assert.equal(store.database.isTransaction, true, "the host's transaction is still open");
  store.database.exec('COMMIT');

  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state', 'never redemption-timeout on an enlisted call');
  assert.equal(outcome.transitionRef, undefined, 'no edge — the enlisted call appends nothing');
  assert.deepEqual(await store.readChain(recordId), before, 'the chain is untouched');

  // Un-enlisted re-invocation resolves the window: the edge lands and the caller gets the
  // resolver's own verdict (the ~:239 pin's mapping — redemption-timeout, token dead).
  const resolved = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(resolved.status, 'refused');
  if (resolved.status !== 'refused') return;
  assert.equal(resolved.code, 'redemption-timeout');
  assert.equal((await store.readChain(recordId)).at(-1)?.kind, 'redemption-failed');
});
```

- [ ] **Step 3: Run**

```bash
./node_modules/.bin/vitest run packages/record/test/clocks.test.ts
```
Expected: PASS (the branch exists and the direct-seam test proves the guard; these pin
the two seams that reached it untested). A different code or a thrown adapter error is a
STOP — that would mean the guard does NOT cover the token seams, which is a finding.

- [ ] **Step 4: Fire-check** — temporarily change one expected code
(`'unredeemable-state'` → `'redemption-timeout'`) in each new test, run, watch both FAIL,
revert.

- [ ] **Step 5: Commit** (subject: `Truth restoration 3/10: the enlisted-token due-window
twins — the "token seams take no tx" claim repaired by the tests that disprove it`).

---

### Task 4: B2 — the (5)→(6) race pair on both ladders

**Files:**
- Test: `packages/record/test/redeem-token.test.ts` (two new tests after the racing
  residual section ~:623-711; one comment fix at ~:585-586)
- Modify: `packages/record/test/redeem.test.ts:42-43` (comment only)

**Interfaces:**
- Consumes: `RaceOnceStore(inner, match, run)` (`./helpers/stores.js` — `run` fires at
  most once, BEFORE the matched append delegates); file-local `confirmedEffectRecord(inner)`,
  `redeemingRecord(inner)`; `create`, `makeConfig`, `effectSeamProfile`, `CONTENT`.
- The match predicates below are the SAME shapes the existing racing tests fire with
  (`:694` for confirmed→redeemed, `:635` for redeeming→redeemed), so the predicates are
  proven live in this very file.

- [ ] **Step 1: Write the two pair tests** (append after the direct-vs-direct race test,
~:711):

```ts
// === order (5)->(6), both ladders: mismatch beats the racer, and the racer NEVER fires ==

test('order (5)->(6), direct ladder: a mismatch plus an ARMED racing writer — effect-mismatch wins and the racer never fires', async () => {
  // The pair cell is an ORDER claim: rung (5) correspondence refuses before rung (6)'s
  // append, so the armed racer — which fires only on that append — must stay cold. The
  // hook flag is the firing counter; the same match predicate fires in the
  // direct-vs-direct race test above, so a cold racer here is order, not a dead rig.
  const inner = new MemoryStore();
  const { recordId } = await confirmedEffectRecord(inner);
  let raced = false;
  const racing = new RaceOnceStore(
    inner,
    (expected, t) => expected === 'confirmed' && t.kind === 'redeemed',
    async () => {
      raced = true;
      return undefined;
    },
  );
  const handles = create(makeConfig([effectSeamProfile()], { store: racing }));

  const loser = await handles.operator.redeem(recordId, { subject: 'week-1', total: 999 });
  assert.equal(loser.status, 'refused');
  if (loser.status !== 'refused') return;
  assert.equal(loser.code, 'effect-mismatch', 'rung (5) wins the pair');
  assert.equal(raced, false, 'the racer never fired — no append was ever attempted');
});

test('order (5)->(6), complete ladder: wrong content with a CORRECT token plus an ARMED racing writer — effect-mismatch wins and the racer never fires', async () => {
  const inner = new MemoryStore();
  const { recordId, token } = await redeemingRecord(inner);
  let raced = false;
  const racing = new RaceOnceStore(
    inner,
    (expected, t) => expected === 'redeeming' && t.kind === 'redeemed',
    async () => {
      raced = true;
      return undefined;
    },
  );
  const handles = create(makeConfig([effectSeamProfile()], { store: racing }));

  const loser = await handles.operator.completeRedemption(recordId, token, {
    subject: 'week-1',
    total: 999,
  });
  assert.equal(loser.status, 'refused');
  if (loser.status !== 'refused') return;
  assert.equal(loser.code, 'effect-mismatch', 'rung (5) wins the pair');
  assert.equal(raced, false, 'the racer never fired — no append was ever attempted');
});
```

- [ ] **Step 2: Run, then prove the arming** — run the file (expect PASS). Then, in the
direct-ladder test only, temporarily swap the wrong content for `CONTENT`: the racer must
fire (`raced === false` FAILS). Revert. This proves the predicate arms on this fixture,
so the cold racer in the real test is order, not a typo.

```bash
./node_modules/.bin/vitest run packages/record/test/redeem-token.test.ts
```

- [ ] **Step 3: Fix the two ladder comments.** In `redeem.test.ts`, replace (~:42-43):

```
//   (5)->(6): a mismatch plus a racing writer — not constructible without a bespoke racing
//     store; excluded, and this comment is why.
```

with:

```
//   (5)->(6): a mismatch plus a racing writer — constructible since RaceOnceStore
//     (helpers/stores.ts); pinned in redeem-token.test.ts's racing section (2026-09-01):
//     effect-mismatch wins and the racer never fires. Not counted in this file's total.
```

In `redeem-token.test.ts`, replace (~:585-586):

```
//   (5)->(6): a mismatch plus a racing writer — needs the racing store; the racing task
//     covers the (6) residual on its own.
```

with:

```
//   (5)->(6): a mismatch plus a racing writer — pinned in the racing section below
//     (2026-09-01): effect-mismatch wins and the racer never fires; the racing residual
//     tests cover the (6) residual on its own.
```

`redeem.test.ts`'s "Total order-pair tests in this file: 3." stays true — both new tests
live in `redeem-token.test.ts`.

- [ ] **Step 4: Run both files, commit** (subject: `Truth restoration 4/10: the (5)->(6)
race pair pinned on both ladders — the "not constructible" comment repaired by the
construction`).

```bash
./node_modules/.bin/vitest run packages/record/test/redeem.test.ts packages/record/test/redeem-token.test.ts
```

---

### Task 5: C1 — the unknown-profile arms at finalize and seal

**Files:**
- Test: `packages/record/test/refusal-matrix.test.ts` (two tests in its
  `=== unknown-profile ===` section, after the stage() test at ~:285)
- Modify: `packages/record/src/kernel/finalize.ts:209-214` (comment),
  `packages/record/src/kernel/seal.ts:63-66` (comment)

**Interfaces:**
- Consumes: the established two-instance shape (`effect-result.test.ts:237-256`):
  open/confirm under one `create()` instance, drive the seam under a second sharing the
  store whose catalog lacks the profileId. Check `refusal-matrix.test.ts`'s imports and
  add any of `openRecord`, `identity`, `facts` (from `./helpers/profiles.js`) and
  `MemoryStore` (from `../src/store/memory.js`) it lacks.

- [ ] **Step 1: Write the two tests**

```ts
test('unknown-profile: finalize() under a second instance whose catalog lacks the profile -> refused/refusal, no append (the defensive arm, two-instance shape)', async () => {
  const store = new MemoryStore();
  const profile = captureProfile();
  const openingSide = create(makeConfig([profile], { store }));
  const recordId = await openRecord(openingSide, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  const before = await store.readChain(recordId);

  const unaware = create(makeConfig([captureProfile({ id: 'test.unrelated.v1' })], { store }));
  const outcome = await unaware.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unknown-profile');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined);
  assert.equal((await store.readChain(recordId)).length, before.length, 'no append');
});

test('unknown-profile: seal() under a second instance whose catalog lacks the profile -> refused/refusal, no append (the defensive arm, two-instance shape)', async () => {
  const store = new MemoryStore();
  const profile = captureProfile();
  const openingSide = create(makeConfig([profile], { store }));
  const recordId = await openRecord(openingSide, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  const done = await openingSide.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  const before = await store.readChain(recordId);

  const unaware = create(makeConfig([captureProfile({ id: 'test.unrelated.v1' })], { store }));
  const outcome = await unaware.operator.seal(recordId);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unknown-profile');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined);
  assert.equal((await store.readChain(recordId)).length, before.length, 'no append');
});
```

The returned `unknown-profile` from THIS seam call is itself proof the arm fired — no
separate firing check needed.

- [ ] **Step 2: Run**

```bash
./node_modules/.bin/vitest run packages/record/test/refusal-matrix.test.ts
```
Expected: PASS. Any other code (or an ok) is a STOP finding.

- [ ] **Step 3: The comments stop claiming untested.** In `finalize.ts`, replace the
sentence `Not exercised by this build's tests\n    // (open() is the runtime producer); defensive.`
(keep the rest of the comment) with
`Defensive; exercised by\n    // refusal-matrix.test.ts's two-instance arm.`
In `seal.ts`, replace `Defensive: a coherent instance always\n    // resolves a record it opened, so no test at this build step constructs it.`
with `Defensive: a coherent instance always\n    // resolves a record it opened; refusal-matrix.test.ts's two-instance arm constructs it.`

- [ ] **Step 4: Gates + commit** (subject: `Truth restoration 5/10: the unknown-profile
arms at finalize and seal exercised — the "not exercised" comments retired by the
exercise`).

---

### Task 6: C2 — `transitionRef` equals the appended edge's digest at all nine signature-broken cells

**Files:**
- Modify: `packages/record/test/signing-enforce.test.ts:181, 365, 402, 438, 475, 502`
- Modify: `packages/record/test/decline.test.ts:136`
- Modify: `packages/record/test/findings-seams.test.ts:234, 256`
- Modify: `docs/process/implementation-status.md` (~:2537-2541, wrapped prose — multiline
  edits fine here)

**Interfaces:**
- Consumes: `Store.chainHead(recordId): Promise<Digest | null>` — after the refusing call
  appends the compromise/refused edge, the head IS that edge, mirroring
  `chain-verify.test.ts:165-169`. Fixture store variables: `a.store` (:181),
  `store` (:365, :402, :438, :475, :502), `tamperedStore` (decline :136),
  `store1` (:234), `store2` (:256).

- [ ] **Step 1: Upgrade the nine assertions.** Mechanical, one shape (keep each site's
message, adding the equality claim):

| Site | Replace | With |
|---|---|---|
| signing-enforce :181 | `assert.notEqual(red.transitionRef, undefined, 'un-enlisted redeem appends the edge');` | `assert.equal(red.transitionRef, await a.store.chainHead(redeemId), 'un-enlisted redeem appends the edge — ref = its digest');` |
| signing-enforce :365 | `assert.notEqual(out.transitionRef, undefined, 'an open record admits the edge');` | `assert.equal(out.transitionRef, await store.chainHead(recordId), 'an open record admits the edge — ref = its digest');` |
| signing-enforce :402 | `assert.notEqual(out.transitionRef, undefined);` | `assert.equal(out.transitionRef, await store.chainHead(recordId));` |
| signing-enforce :438 | `assert.notEqual(out.transitionRef, undefined, 'an open record admits the edge');` | `assert.equal(out.transitionRef, await store.chainHead(recordId), 'an open record admits the edge — ref = its digest');` |
| signing-enforce :475 | `assert.notEqual(out.transitionRef, undefined, 'un-enlisted: the edge appended');` | `assert.equal(out.transitionRef, await store.chainHead(recordId), 'un-enlisted: the edge appended — ref = its digest');` |
| signing-enforce :502 | same as :475 | same as :475 |
| decline :136 | `assert.notEqual(out.transitionRef, undefined); // an open record admits the edge` | `assert.equal(out.transitionRef, await tamperedStore.chainHead(recordId)); // an open record admits the edge — ref = its digest` |
| findings-seams :234 | `assert.notEqual(raise.transitionRef, undefined); // an open record admits the edge` | `assert.equal(raise.transitionRef, await store1.chainHead(recordId)); // an open record admits the edge — ref = its digest` |
| findings-seams :256 | `assert.notEqual(ackOut.transitionRef, undefined); // an open record admits the edge` | `assert.equal(ackOut.transitionRef, await store2.chainHead(recordId)); // an open record admits the edge — ref = its digest` |

Do NOT touch the `assert.equal(..., undefined, ...)` no-edge sites (:208, :287, :543,
:579) — those pin the opposite, correctly.

- [ ] **Step 2: Run**

```bash
./node_modules/.bin/vitest run packages/record/test/signing-enforce.test.ts packages/record/test/decline.test.ts packages/record/test/findings-seams.test.ts
```
Expected: PASS (an independent probe confirmed the equality; these tests state it). A
mismatch anywhere is a STOP finding — a wrong ref at a signature-broken seam.

- [ ] **Step 3: Correct the over-broad record.** In `implementation-status.md` ~:2537-2541,
replace:

```
Third, and found by this increment's own review rather
than claimed away: **no append site ties the returned transition reference to the appended
edge's own digest.** The assertions accept any defined value, so a wrong digest would pass.
An independent probe confirmed the equality holds in reality; no test states it. Fourth,
```

with:

```
Third, and found by this increment's own review rather
than claimed away: **no signature-broken cell tied the returned transition reference to the
appended edge's own digest** (over-broad as first written even then — the hash-broken cell
had the equality pinned at chain-verify.test.ts since the step-1 corpus). The assertions
accepted any defined value, so a wrong digest would have passed; an independent probe
confirmed the equality held, and the truth-restoration increment (2026-09-01) upgraded all
nine cells to equality against the chain head. Fourth,
```

- [ ] **Step 4: Gates + commit** (subject: `Truth restoration 6/10: transitionRef =
appended edge digest at all nine signature-broken cells — the record's honest limit
retired`).

---

### Task 7: C3 — the key-retirement orphan baseline pin

**Files:**
- Test: `packages/record/test/no-edge-containment.test.ts` (one test beside the BASELINE
  sealed-corner test at ~:197)

**Interfaces:**
- Consumes: file-local `countingSigningSetup()` (returns `{ handles, signatures, signing,
  store, … }` — `signing` is the config block `{ signer, verifiers, signatures }`),
  `confirmedSigningRecord(rig, subjectRef)`, `assertNoEdgeRefusal(out, label)`,
  `tickingClock(startIso)`, consts `CONTENT`, `PROFILE_ID`; `createWithClock`,
  `makeConfig`, `captureProfile`, `identity`, `facts` (all imported already).

- [ ] **Step 1: Write the pin**

```ts
test('BASELINE — key retirement: dropping the keyRef from the verifier registry puts a HEALTHY sealed record into permanent minting — one orphan per refusing call', async () => {
  // Deferral register row 22's key-retirement reachability shape, pinned for the first
  // time (the register's own figure was measured on a rig that is gone): the record is
  // untampered and sealed, the sidecar complete — only the registry moved. Nothing here
  // contains the growth; the pin states it.
  const rig = countingSigningSetup();
  const recordId = await confirmedSigningRecord(rig, 'subject:noedge-retired');
  assert.equal((await rig.handles.operator.seal(recordId)).status, 'ok', 'fixture: sealed');
  // NO breakOneSignature: chain and sidecar are both healthy.

  // The retired instance: same store, same sidecar, same signer — but the verifier
  // registry no longer resolves 'key-1' (the operator decommissioned the key).
  const retired = createWithClock(
    {
      ...makeConfig([{ ...captureProfile({ id: PROFILE_ID }), signing: true }], {
        store: rig.store,
      }),
      signing: { signer: rig.signing.signer, verifiers: {}, signatures: rig.signing.signatures },
    },
    tickingClock('2026-08-29T02:00:00Z'),
  );

  const chainLength = (await rig.store.readChain(recordId)).length;
  const sidecarBefore = (await rig.signatures.listByRecord(recordId)).length;
  for (let call = 1; call <= 4; call += 1) {
    const out = await retired.operator.finalize(recordId, identity(), CONTENT, facts());
    assertNoEdgeRefusal(out, `key retirement, call ${call}`);
    assert.equal((await rig.store.readChain(recordId)).length, chainLength, 'chain flat');
    assert.equal(
      (await rig.signatures.listByRecord(recordId)).length,
      sidecarBefore + call,
      `one orphan per refusing call (call ${call})`,
    );
  }
});
```

If construction rejects an empty `verifiers` map (a possible fail-closed validation),
model the decommission as a registry that resolves a DIFFERENT key instead:
`verifiers: { 'key-2': async () => false }` — and note which shape was needed in the test
comment. Either way the record's `key-1` entries are unresolvable, which is the retirement.

- [ ] **Step 2: Run; fire-check**

```bash
./node_modules/.bin/vitest run packages/record/test/no-edge-containment.test.ts
```
Expected: PASS. Fire-check: temporarily change `sidecarBefore + call` to
`sidecarBefore` — must FAIL on call 1; revert. If the refusal is NOT `chain-compromise`
no-edge, or the sidecar does not grow: STOP, finding (the register's description of this
shape would be wrong).

- [ ] **Step 3: Commit** (subject: `Truth restoration 7/10: the key-retirement orphan
baseline pinned — the register's figure no longer rests on a rig that is gone`).

---

### Task 8: C4 — the `magnitude` byte pin

**Files:**
- Test: `packages/record/test/byte-regression/findings.test.ts` (one const, one flow
  function, two tests)

**Interfaces:**
- Consumes: file-local `makeConfig()`, `deterministicSeams(seed)`
  (`./fixtures.js`), `raiserIdentity()`, `ackerIdentity()`, `identityAssertion()`,
  `factsArg()`, consts `STAGED_CONTENT`, `PROFILE_ID`, `SUBJECT_REF`, `FINDING_ID`,
  `FINDING_KIND`, `FINDING_DIGEST`; `FindingInput`/`AckInput` (imported) — both carry
  `magnitude?: string` (string only — verified in `types.ts` 2026-09-01).
- `byte-stability.test.ts` and the existing `PINNED_DIGESTS` are UNTOUCHED.

- [ ] **Step 1: Add the flow and tests** (append; `MAGNITUDE` beside the other consts):

```ts
const MAGNITUDE = 'material';

// Harvest-then-pin, like PINNED_DIGESTS above: placeholders first, then paste the values
// the failure diff reports.
const PINNED_MAGNITUDE_DIGESTS: readonly string[] = [
  'sha256:PLACEHOLDER-0',
  'sha256:PLACEHOLDER-1',
  'sha256:PLACEHOLDER-2',
  'sha256:PLACEHOLDER-3',
  'sha256:PLACEHOLDER-4',
  'sha256:PLACEHOLDER-5',
];

async function runFindingsFlowWithMagnitude(): Promise<Transition[]> {
  const { now, mintId, tokenSource } = deterministicSeams('byte-regression-findings-magnitude');
  const { agent, operator } = createWithClock(makeConfig(), now, mintId, tokenSource);

  const staged = await agent.stage(STAGED_CONTENT, PROFILE_ID, SUBJECT_REF);
  if (staged.status !== 'ok') throw new Error(`stage() refused: ${JSON.stringify(staged)}`);
  const opened = await operator.open(staged.value.stagedRef);
  if (opened.status !== 'ok') throw new Error(`open() refused: ${JSON.stringify(opened)}`);

  const finding: FindingInput = {
    findingId: FINDING_ID,
    kind: FINDING_KIND,
    findingDigest: FINDING_DIGEST,
    magnitude: MAGNITUDE,
  };
  const raised = await operator.raiseFinding(opened.value.recordId, finding, raiserIdentity());
  if (raised.status !== 'ok') throw new Error(`raiseFinding() refused: ${JSON.stringify(raised)}`);

  const ack: AckInput = {
    findingId: FINDING_ID,
    findingDigest: FINDING_DIGEST,
    magnitude: MAGNITUDE,
  };
  const acked = await operator.acknowledge(opened.value.recordId, ack, ackerIdentity());
  if (acked.status !== 'ok') throw new Error(`acknowledge() refused: ${JSON.stringify(acked)}`);

  const finalized = await operator.finalize(
    opened.value.recordId,
    identityAssertion(),
    STAGED_CONTENT,
    factsArg(),
  );
  if (finalized.status !== 'ok')
    throw new Error(`finalize() refused: ${JSON.stringify(finalized)}`);

  return operator.readChain(opened.value.recordId);
}

test('byte-regression: magnitude rides both findings payloads, value-pinned', async () => {
  const chain = await runFindingsFlowWithMagnitude();
  const raisedPayload = chain[1]?.payload as Record<string, unknown> | undefined;
  const ackedPayload = chain[2]?.payload as Record<string, unknown> | undefined;
  if (raisedPayload === undefined || ackedPayload === undefined) {
    throw new Error('expected findings transitions at indices 1 and 2');
  }
  assert.equal(raisedPayload.magnitude, MAGNITUDE);
  assert.equal(ackedPayload.magnitude, MAGNITUDE);
});

test('byte-regression: the magnitude-carrying findings chain matches its pinned literals', async () => {
  const chain = await runFindingsFlowWithMagnitude();
  assert.deepEqual(
    chain.map((t) => transitionDigest(t)),
    PINNED_MAGNITUDE_DIGESTS,
  );
});
```

- [ ] **Step 2: Harvest** — run the file; the literals test FAILS showing six real
digests (this failing run IS the pin's firing proof). Paste them over the placeholders.

```bash
./node_modules/.bin/vitest run packages/record/test/byte-regression/findings.test.ts
```

- [ ] **Step 3: Re-run — all green, and the PRE-EXISTING `PINNED_DIGESTS` test untouched
and green.** Any movement in an existing literal is a STOP.

- [ ] **Step 4: Commit** (subject: `Truth restoration 8/10: the magnitude byte pin — the
last post-oracle conditional field value-pinned`).

---

### Task 9: C5 — the Postgres payload-posture pin

**Files:**
- Test: `packages/store-postgres/test/postgres-store.test.ts` (one test; imports:
  add `storeNext` beside the existing `storeGenesis` import from
  `'../../record/test/helpers/chain.js'`, and
  `import { verifyChain } from '../../record/src/chain/replay.js';`)

**Interfaces:**
- Consumes: `newStore()` / helpers from `./helpers/pg.js` (embedded server, schema per
  test); mirrors `packages/record/test/sqlite-store.test.ts:107-129` exactly.

- [ ] **Step 1: Write the mirror**

```ts
test('payload posture: a function-valued member is dropped CONSISTENTLY with the digest — exactly SqliteStore posture, as postgres-store.ts claims', async () => {
  // Proves the src/postgres-store.ts claim that the JCS-invisible-member round-trip
  // behavior is exactly SqliteStore's: JSON round-trip drops the member, library JCS
  // dropped the same member when digesting, so persisted bytes and digest agree.
  const store = newStore();
  const genesis = storeGenesis('rec-jsondrop', 'profile.p1', 'subject:jsondrop');
  await store.appendTransition(null, genesis, { nonTerminal: true });
  const confirmed = storeNext(genesis, 'confirmed', {
    actor: { principal: 'approver:posture', authority: 'session:posture' },
    describe: () => 'not JSON-representable',
  });
  const res = await store.appendTransition('open', confirmed, { nonTerminal: false });
  assert.equal(res.appended, true);

  const chain = await store.readChain('rec-jsondrop');
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.ok(
    !('describe' in (last.payload as Record<string, unknown>)),
    'the function member is gone from the persisted payload',
  );
  assert.equal(verifyChain(chain).intact, true, 'and the digests still verify');
});
```

- [ ] **Step 2: Run** (starts the embedded Postgres — slow is normal)

```bash
./node_modules/.bin/vitest run packages/store-postgres/test/postgres-store.test.ts
```
Expected: PASS, proving the shipped comment. FAILURE IS A STOP — whether the comment or
the serialization moves is an argued finding, not this increment's call (spec C5).

- [ ] **Step 3: Fire-check** — temporarily assert `('describe' in …)` is `true`, watch it
FAIL, revert.

- [ ] **Step 4: Commit** (subject: `Truth restoration 9/10: the Postgres payload-posture
pin — the "exactly SqliteStore's" claim proven against the embedded server`).

---

### Task 10: Exit — full gates, CHANGELOG, the increment account

**Files:**
- Modify: `CHANGELOG.md` (`[Unreleased]`), `docs/process/implementation-status.md`
  (new increment section, appended per the file's own post-build-order section shape —
  read the "Checklist repair" section as the model)

- [ ] **Step 1: Full gate set, in order**

```bash
./node_modules/.bin/tsc -p packages/record --noEmit && ./node_modules/.bin/tsc -p packages/store-postgres --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/biome check --error-on-warnings .
node scripts/contract-scan.mjs
node scripts/api-reference-sync.mjs
node scripts/docs-index-sync.mjs
```
All green/exit 0. Record the test totals (files/tests) for the account section — count
them from the vitest summary, never carry a number from this plan.

- [ ] **Step 2: CHANGELOG entry** under `## [Unreleased]`, in the file's own list style
(place beside its most recent post-build-order entries; adjust the section heading to
whatever the file uses — `### Fixed` if present, else the file's convention):

```markdown
- **Truth restoration** (2026-09-01, post-build-order): every stale shipped-source and
  test sentence repaired against the tree — the retired naming-review pointer
  (`operator-surface.ts`), the Node floor (`id.ts`), the adapter-anticipation note
  (`store/store.ts`), the `appendsOn` caller set (`refusal-codes.ts`), the enlisted-token
  and racing-store claims (`clocks.test.ts`, `redeem.test.ts`, `redeem-token.test.ts`) —
  and the last hardcoded leg index (`kernel/expiry.ts`) replaced with the derived index,
  output-identical and pinned. New evidence: the enlisted-token due-window twins, the
  (5)→(6) race pair on both ladders (racer-never-fires order pins), the unknown-profile
  arms at finalize/seal, transitionRef-equals-digest at all nine signature-broken cells,
  the key-retirement orphan baseline, a `magnitude` byte pin, and the Postgres
  payload-posture pin. `listDue()` recorded as carrying NO naming ruling, docketed to the
  1.0 freeze. No public-surface change; no register row moves.
```

- [ ] **Step 3: The account section** in `implementation-status.md` — a new section
following the existing post-build-order sections' shape, covering: what the increment is
(the spec path), the five scoping rulings, each repaired sentence (site, was, is), the one
code change and its output-identical argument, each new pin (file + what it states), the
gate outputs measured in step 1, and the two record corrections this increment made to
this file itself (:414's listDue note, ~:2538's over-broad softening) so their provenance
is in the file that changed. State plainly: no deferral-register row moved, no checklist
box ticked, row 22a unchanged (the key-retirement pin is a baseline, not containment).

- [ ] **Step 4: Final gates re-run** (`node scripts/contract-scan.mjs`,
`node scripts/docs-index-sync.mjs` — the account section must not break either), then
commit (subject: `Truth restoration 10/10: exit — gates green, CHANGELOG and the account
landed`).

- [ ] **Step 5: Merge decision** — use superpowers:finishing-a-development-branch
(requesting-code-review first if the session wants the two-stage review). Do not push
without instruction.

---

## Self-review notes (already applied)

- Spec coverage: A1–A4 → task 1; A5 → task 2; B1 → task 3; B2 → task 4; C1 → task 5;
  C2 → task 6; C3 → task 7; C4 → task 8; C5 → task 9; exit/CHANGELOG/account → task 10.
  Rulings 1–5: item 23 rides task 9 pre-cut on this branch; race pair ADDED (task 4);
  the listDue honest note (task 1 step 6); the Postgres kernel-enlisted leg does NOT
  appear in task 3 (deferred, spec ruling 4); task 7 is pin-only (ruling 5).
- The two claims this plan corrected against the sweep while being written: `appendsOn`'s
  second caller is indirect via `refuseMaybeAppend` (task 1 step 5 wording rests on
  rung-(2) ordering, not on call-site literals — two finalize sites pass variables), and
  `magnitude` is `string`-only (task 8 pins a string).
- Type consistency: `MetaSpyStore` extends `MemoryStore` (task 2 only);
  `RaceOnceStore(inner: MemoryStore, match, run)` per `helpers/stores.ts:142`;
  `chainHead(recordId): Promise<Digest | null>` per `store/store.ts`.
