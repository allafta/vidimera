# Redemption Clocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land SPEC §4's two remaining clock-driven edges — `confirmed → expired`
(`confirmToRedeem`) and `redeeming → redemption-failed` (`redeemBound`) — with their
`dueAt` producers, en-passant resolutions, the `redemption-timeout` code, and the
operator's `listDue` read, as the third and last step-3 increment, recording **step 3's
exit** per the spec (`docs/superpowers/specs/2026-08-14-redemption-clocks-design.md` —
read it before your task).

**Architecture:** `kernel/expiry.ts` generalizes into one clock module (`pendingWindow` +
`resolveDueClock`) consumed by every producer and resolver. The redemption prologue gains
one resolution rung; `finalize` rung 2 and `open()`'s blocker branch extend; the GOVERNED
`redeemBound` guard lifts in the same task that lands its payload producer, so no commit
can mint a declaring profile's `redeeming` edge without its `bound`.

**Tech Stack:** TypeScript strict (pnpm workspace, Node >=22.16), vitest 4, Biome. No new
runtime APIs (Date arithmetic + `toISOString` only) — the floor does not move.

## Global Constraints

- **Shell**: PowerShell for pnpm (`$env:PATH = "$env:APPDATA\npm;$env:PATH"` first in
  EVERY fresh shell — corepack is broken). **Git commits go through the Bash tool** with
  ordinary multi-line `-m` quoting — PowerShell here-strings and `Set-Content` have both
  leaked delimiters/BOM into commit subjects in this repo. Before any commit, verify
  `git branch --show-current` prints `main`; if detached, STOP and report.
- **The five gates** before each task's final commit: `pnpm typecheck` · `pnpm lint` ·
  `pnpm lint:strict` · `pnpm test` (zero skips) · `node scripts/contract-scan.mjs`
  (prints nothing, exits 0).
- **Byte-stability**: the four frozen digest literals in
  `packages/record/test/byte-stability.test.ts` NEVER move — red there ⇒ STOP, BLOCKED.
- **`docs/concept/` is SEALED.** `docs/superpowers/` and `docs/analysis/` history is
  leave-alone.
- **No external URLs/project names.** Explicit increment naming — "the third step-3
  increment" — never bare "this increment", and never "a later increment" for something
  landing in THIS increment (a known drift class). ASCII apostrophes. Citations as
  `SPEC §N` / `DECISIONS.md #N` (with `.md`).
- **Bounds are in seconds** (build convention, recorded in the status doc by Task 7);
  every `bound` payload value is the crossed deadline as ms-precision RFC 3339 UTC
  (`new Date(ms).toISOString()`).
- **Markdown SPEC quotes are hand-verified whitespace-collapsed** (quotes wrap line
  breaks in the source).
- Narrow test runs: `pnpm exec vitest run packages/record/test/<file>.test.ts` from repo
  root. Clock tests use `createWithClock` — never `sleep`.

---

### Task 1: The clock module — `pendingWindow` + `resolveDueClock`

**Files:**
- Modify: `packages/record/src/kernel/expiry.ts` (generalize; `expireIfDue` retires)
- Modify: `packages/record/src/kernel/open.ts:171` (call-site migration)
- Modify: `packages/record/src/kernel/finalize.ts:137-144` (call-site migration)
- Test: create `packages/record/test/clocks.test.ts`

**Interfaces:**
- Consumes: `ResolvedProfile` (create.ts), `nonTerminal`/`isFinalLeg`, `transitionDigest`,
  the Store CAS.
- Produces (later tasks rely on these EXACT shapes):

```ts
export type PendingWindow =
  | { window: 'none' }
  | { window: 'open'; deadlineMs: number }
  | { window: 'confirmed'; deadlineMs: number }
  | { window: 'redeeming'; deadlineMs: number };
export function pendingWindow(chain: readonly Transition[], resolved: ResolvedProfile): PendingWindow;
export function deadlineIso(atIso: string, seconds: number): string; // Date.parse(atIso)+seconds*1000 → toISOString
export type ResolveResult =
  | { due: false }
  | { due: true; window: 'open' | 'confirmed' | 'redeeming'; result: AppendResult; bound: string };
export function resolveDueClock(store: Store, chain: readonly Transition[], resolved: ResolvedProfile, now: Date): Promise<ResolveResult>;
```

`expiryDeadlineMs` stays (the genesis `dueAt` producer in open.ts uses it); `expireIfDue`
and its `ExpireResult` type are REPLACED by `resolveDueClock`/`ResolveResult`.

- [ ] **Step 1: Write the failing tests**

Create `packages/record/test/clocks.test.ts`:

```ts
// @vidimera/record — clocks.test.ts (SPEC §4 "Clock-driven edges are appended en
// passant"; §9.1 "Redemption bounds"; §12 dueAt/listDue): the third step-3 increment's
// windows. This file owns the clock module's derivation pins and, in later tasks of the
// same increment, the producer/resolution/sweep pins. Deterministic throughout via
// createWithClock — no test sleeps.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { createWithClock } from '../src/create.js';
import { pendingWindow, resolveDueClock } from '../src/kernel/expiry.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);
const HOUR = 3600_000;

/** Opens+finalizes an effect-seam record under a controllable clock; returns the store. */
async function confirmedAt(clockMs: { t: number }, store = new MemoryStore()) {
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store }),
    () => new Date(clockMs.t),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  return { handles, recordId, store };
}

test('pendingWindow: an open record is in the open window; a confirmed effect-seam record with confirmToRedeem is in the confirmed window', async () => {
  const clock = { t: T0 };
  const store = new MemoryStore();
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store }),
    () => new Date(clock.t),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);

  const resolved = {
    profile: effectSeamProfile(),
    canonicalizer: (c: unknown) => c,
    effectSeam: true,
  };
  const openWin = pendingWindow(await store.readChain(recordId), resolved);
  assert.equal(openWin.window, 'open');

  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const confirmedWin = pendingWindow(await store.readChain(recordId), resolved);
  assert.equal(confirmedWin.window, 'confirmed');
  if (confirmedWin.window !== 'confirmed') return;
  // deadline = the confirmed transition's at + confirmToRedeem seconds. Assert against
  // the profile's OWN declared value, never a hardcoded figure — the fixture's bound is
  // the helper's business, not this pin's:
  const declared = effectSeamProfile().redeem?.confirmToRedeem;
  assert.ok(declared !== undefined);
  const chain = await store.readChain(recordId);
  const confirmedTr = chain.find((t) => t.kind === 'confirmed');
  assert.ok(confirmedTr !== undefined);
  assert.equal(confirmedWin.deadlineMs, Date.parse(confirmedTr.at) + declared * 1000);
});

test('resolveDueClock: an elapsed confirmed window appends confirmed → expired { bound } and releases the pair', async () => {
  const clock = { t: T0 };
  const { recordId, store } = await confirmedAt(clock);
  const resolved = {
    profile: effectSeamProfile(),
    canonicalizer: (c: unknown) => c,
    effectSeam: true,
  };

  clock.t = T0 + 400 * HOUR; // far past any declared bound
  const res = await resolveDueClock(
    store,
    await store.readChain(recordId),
    resolved,
    new Date(clock.t),
  );
  assert.equal(res.due, true);
  if (!res.due) return;
  assert.equal(res.window, 'confirmed');
  assert.equal(res.result.appended, true);

  const chain = await store.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'expired');
  // PAYLOAD KEY-SET PIN: exactly { bound }, the crossed deadline, ms-precision RFC 3339.
  assert.deepEqual(Object.keys(last.payload as object), ['bound']);
  const bound = (last.payload as { bound: string }).bound;
  assert.match(bound, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  const confirmedTr = chain.find((t) => t.kind === 'confirmed');
  assert.ok(confirmedTr !== undefined);
  const declared = effectSeamProfile().redeem?.confirmToRedeem;
  assert.ok(declared !== undefined);
  assert.equal(bound, new Date(Date.parse(confirmedTr.at) + declared * 1000).toISOString());

  // THE RELEASE: expired is terminal — the C1 hold lifts.
  assert.equal(await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF), null);
});

test('resolveDueClock: a not-yet-elapsed window reports { due: false } and appends nothing', async () => {
  const clock = { t: T0 };
  const { recordId, store } = await confirmedAt(clock);
  const resolved = {
    profile: effectSeamProfile(),
    canonicalizer: (c: unknown) => c,
    effectSeam: true,
  };
  const before = (await store.readChain(recordId)).length;
  const res = await resolveDueClock(
    store,
    await store.readChain(recordId),
    resolved,
    new Date(T0), // the same instant — nothing has elapsed
  );
  assert.deepEqual(res, { due: false });
  assert.equal((await store.readChain(recordId)).length, before);
});
```

The **redeeming-window** derivation is written complete in this task (the module's full
three-window shape, per the completeness-over-narrowing precedent `nonterminal.ts` set)
but its executing pins land in Task 2, when the `redeemBound` guard lifts and the state
becomes constructible under a declaring profile — noted in a comment at the derivation.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm exec vitest run packages/record/test/clocks.test.ts`
Expected: FAIL — `pendingWindow`/`resolveDueClock` do not exist.

- [ ] **Step 3: Implement the module**

Rewrite `kernel/expiry.ts` (keeping `expiryDeadlineMs` verbatim; the file header updates:
it now covers ALL THREE windows — "covers ONLY `open → expired`" retires; name "the third
step-3 increment" for the two new windows):

```ts
export type PendingWindow =
  | { window: 'none' }
  | { window: 'open'; deadlineMs: number }
  | { window: 'confirmed'; deadlineMs: number }
  | { window: 'redeeming'; deadlineMs: number };

/** `Date.parse(atIso) + seconds*1000`, as the ms-precision RFC 3339 deadline (§4's rule). */
export function deadlineIso(atIso: string, seconds: number): string {
  return new Date(Date.parse(atIso) + seconds * 1000).toISOString();
}

/**
 * §12's "whichever pending window the record is in", as one derivation (third step-3
 * increment): the OPEN window (openedAt + expiry.ttl; `expiry:'none'` ⇒ none), the
 * CONFIRMED window (confirmedAt + confirmToRedeem — only a final-leg, effect-seam,
 * declaring profile; §9.1), the REDEEMING window (redeemingAt + redeemBound — only
 * declared; its executing pins land with the guard lift, later in the third step-3
 * increment). Terminal states and undeclared bounds ⇒ 'none'. The derivation reads the
 * REPLAYED state — never the dueAt column, which §12 keeps an index only.
 */
export function pendingWindow(
  chain: readonly Transition[],
  resolved: ResolvedProfile,
): PendingWindow {
  const { profile, effectSeam } = resolved;
  const record = replay(chain);
  if (record.state === 'open') {
    const genesis = chain[0];
    if (genesis === undefined) throw new Error('pendingWindow: empty chain');
    const deadlineMs = expiryDeadlineMs(genesis.at, profile.expiry);
    return deadlineMs === null ? { window: 'none' } : { window: 'open', deadlineMs };
  }
  if (record.state === 'confirmed') {
    const legIndex = profile.legs.findIndex((l) => l.id === record.legId);
    const finalLeg = isFinalLeg(legIndex, profile.legs.length);
    const bound = profile.redeem?.confirmToRedeem;
    if (!effectSeam || !finalLeg || bound === undefined) return { window: 'none' };
    const confirmedAt = [...chain].reverse().find((t) => t.kind === 'confirmed')?.at;
    if (confirmedAt === undefined) {
      throw new Error('pendingWindow: state is confirmed but no confirmed transition exists');
    }
    return { window: 'confirmed', deadlineMs: Date.parse(confirmedAt) + bound * 1000 };
  }
  if (record.state === 'redeeming') {
    const bound = profile.redeem?.redeemBound;
    if (bound === undefined) return { window: 'none' };
    const redeemingAt = [...chain].reverse().find((t) => t.kind === 'redeeming')?.at;
    if (redeemingAt === undefined) {
      throw new Error('pendingWindow: state is redeeming but no redeeming transition exists');
    }
    return { window: 'redeeming', deadlineMs: Date.parse(redeemingAt) + bound * 1000 };
  }
  return { window: 'none' };
}

export type ResolveResult =
  | { due: false }
  | { due: true; window: 'open' | 'confirmed' | 'redeeming'; result: AppendResult; bound: string };

/**
 * The one en-passant CAS append (§4): if the record's pending window has elapsed, append
 * its resolution edge — open/confirmed → `expired { bound }` (the SAME kind and payload
 * either way: "the transitioned-from state, not the payload, distinguishes the expiry
 * clause from `confirmToRedeem`", §4's table), redeeming → `redemption-failed { bound }`.
 * Both terminal by the derivation — each is a release of the C1 hold; `dueAt` omitted
 * clears the column (§12). The CALLER maps the outcome (§4's per-seam exceptions live at
 * the call sites, never here) and handles a lost CAS (a racing writer) per its own
 * residual discipline.
 */
export async function resolveDueClock(
  store: Store,
  chain: readonly Transition[],
  resolved: ResolvedProfile,
  now: Date,
): Promise<ResolveResult> {
  const win = pendingWindow(chain, resolved);
  if (win.window === 'none' || win.deadlineMs >= now.getTime()) return { due: false };

  const bound = new Date(win.deadlineMs).toISOString();
  const last = chain.at(-1);
  if (last === undefined) throw new Error('resolveDueClock: empty chain');
  const kind = win.window === 'redeeming' ? 'redemption-failed' : 'expired';
  const target: RecordState = win.window; // 'open' | 'confirmed' | 'redeeming' — the CAS state
  const edge: Transition = {
    recordId: last.recordId,
    seq: chain.length + 1,
    at: now.toISOString(),
    kind,
    payload: { bound },
    prevHash: transitionDigest(last),
  };
  const state = kind === 'expired' ? 'expired' : 'redemption-failed';
  const { profile, effectSeam } = resolved;
  const meta = { nonTerminal: nonTerminal(state, isFinalLeg(0, profile.legs.length), effectSeam) };
  const result = await store.appendTransition(target, edge, meta);
  return { due: true, window: win.window, result, bound };
}
```

(Add the needed imports: `replay` from `../chain/replay.js`, `RecordState` type. The
`isFinalLeg(0, …)` in the meta mirrors `expireIfDue`'s existing single-leg posture —
both resolution states are terminal for every leg/effect-seam combination anyway.)

Migrate the two `expireIfDue` call sites, preserving semantics exactly:
- `kernel/open.ts:171`: `const ex = await resolveDueClock(store, blockerChain, resolved, now());`
  then `if (!ex.due) { return refused('record-exists'); } if (!ex.result.appended) { return refused('record-exists'); }`
  — behavior identical (this task touches ONLY the open-window blocker; the confirmed
  blocker arm is Task 5's). The guard above it (`blocker.state !== 'open'` ⇒
  record-exists) stays untouched in this task.
- `kernel/finalize.ts:138`: `const ex = await resolveDueClock(store, chain, resolved, now());`
  and `if (ex.due) { return refused('leg-expired'); }` — reached only when
  `record.state === 'open'`, so only the open window can be due there in this task.
Delete `expireIfDue`/`ExpireResult`.

- [ ] **Step 4: Run tests, gates, commit**

Run: `pnpm exec vitest run packages/record/test/clocks.test.ts` (PASS), `pnpm test`
(PASS — the migration is behavior-preserving), all five gates. Commit (Bash tool):

```bash
git add packages/record/src/kernel/expiry.ts packages/record/src/kernel/open.ts packages/record/src/kernel/finalize.ts packages/record/test/clocks.test.ts
git commit -m "One derivation for every window: the clock module the seams will share

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: The producers — guard lift, fixtures, `bound` payload, `dueAt`

**Files:**
- Modify: `packages/record/src/config.ts` (delete the GOVERNED `redeemBound` guard + its
  doc-comment entry; renumber)
- Modify: `packages/record/test/construction-validation.test.ts` (invert the guard pin)
- Modify: `packages/record/test/helpers/profiles.ts` (`effectSeamProfile` →
  `redeem: { confirmToRedeem: 3600, redeemBound: 86400 }`)
- Modify: `packages/record/src/kernel/redeem.ts` (beginRedemption: payload `bound` +
  `meta.dueAt`)
- Modify: `packages/record/src/kernel/finalize.ts:236-243` (postBatch `dueAt`)
- Test: `packages/record/test/clocks.test.ts` (extend), `packages/record/test/redeem-token.test.ts`
  (key-set pin split + strand-test rework)

**Interfaces:**
- Consumes: Task 1's `deadlineIso`, `pendingWindow`.
- Produces: a `redeemBound`-declaring profile is constructible; `beginRedemption`'s
  payload is `{ tokenDigest, bound }` iff declared (`{ tokenDigest }` otherwise);
  `finalize` stamps `dueAt` iff `confirmToRedeem` declared on an effect-seam final leg.
  Later tasks construct due states through these producers.

**All in ONE task and ONE commit** so no commit leaves a declaring profile able to mint a
boundless `redeeming` edge (the exact §4 divergence the second increment's guard
prevented).

- [ ] **Step 1: Write the failing tests**

In `construction-validation.test.ts`, REPLACE the GOVERNED redeemBound test (the second
increment's pin) with the acceptance pin, appending the inversion note in place per the
standing discipline:

```ts
test('redeem.redeemBound is accepted at construction — the clock that honors it is built', () => {
  // INVERTED, at the third step-3 increment: the second step-3 increment pinned a
  // GOVERNED throw here (its `redeeming` edges could not carry §4's declared `bound`
  // until the clock existed). The third increment builds the bound whole — payload,
  // dueAt, en-passant resolution — so the guard's own stated trigger ("lifted by the
  // third step-3 increment") has fired and the throw is deleted. Bound-value validation
  // deliberately mirrors expiry.ttl's treatment (no novel posture).
  const declaring = {
    ...effectSeamProfile(),
    redeem: { confirmToRedeem: 1, redeemBound: 86400 },
  };
  assert.doesNotThrow(() => create(makeConfig([declaring])));
});
```

In `clocks.test.ts`, add:

```ts
test('finalize stamps dueAt for a declared confirmToRedeem: listDue lists the record after the bound, not before', async () => {
  const clock = { t: T0 };
  const { recordId, store } = await confirmedAt(clock);
  const declared = effectSeamProfile().redeem?.confirmToRedeem;
  assert.ok(declared !== undefined);

  assert.deepEqual(await store.listDue(new Date(T0 + (declared - 1) * 1000)), []);
  assert.deepEqual(await store.listDue(new Date(T0 + (declared + 1) * 1000)), [recordId]);
});

test('beginRedemption on a redeemBound-declaring profile: payload is exactly { tokenDigest, bound }, dueAt set', async () => {
  const clock = { t: T0 };
  const { handles, recordId, store } = await confirmedAt(clock);
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok', 'fixture: the issuance must succeed');

  const chain = await store.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'redeeming');
  // KEY-SET PIN, declared shape: §4's present-iff-declared, both keys, nothing else.
  assert.deepEqual(Object.keys(last.payload as object).sort(), ['bound', 'tokenDigest']);
  const declared = effectSeamProfile().redeem?.redeemBound;
  assert.ok(declared !== undefined);
  assert.equal(
    (last.payload as { bound: string }).bound,
    new Date(Date.parse(last.at) + declared * 1000).toISOString(),
  );
  assert.deepEqual(await store.listDue(new Date(Date.parse(last.at) + (declared + 1) * 1000)), [
    recordId,
  ]);
});
```

In `redeem-token.test.ts`:
- The begin happy-path key-set pin (`:74`,
  `assert.deepEqual(Object.keys(last.payload as object), ['tokenDigest'])`) now runs
  under a DECLARING fixture — change it to
  `assert.deepEqual(Object.keys(last.payload as object).sort(), ['bound', 'tokenDigest'])`,
  and add beside it a NO-`redeemBound` profile variant preserving the second increment's
  pin (§4's iff, the absent direction):

```ts
/** An effect-seam profile that deliberately declares NO redeemBound (§9.1's SHOULD is a
 * policy choice, not a MUST): the strand-risk shape, and §4's bound-absent byte pin. */
function noRedeemBoundProfile() {
  return {
    ...effectSeamProfile({ id: 'test.effect.nobound.v1' }),
    redeem: { confirmToRedeem: 3600 },
  };
}

test('beginRedemption without redeemBound: payload stays exactly { tokenDigest } — present-iff-declared, absent half', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([noRedeemBoundProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.effect.nobound.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok');
  const last = (await store.readChain(recordId)).at(-1);
  assert.ok(last !== undefined);
  assert.deepEqual(Object.keys(last.payload as object), ['tokenDigest']);
});
```

- REWORK the strand test (`:481-511`): it pinned `listDue` blind and completion as the
  sole exit — true for the second increment's guard-protected world, FALSE once the
  fixture declares `redeemBound` (begin now sets `dueAt`). Rewrite it over
  `noRedeemBoundProfile()` with the note appended in place: the strand shape survives
  ONLY for a host that declines §9.1's SHOULD; the seal/direct/finalize refusals and the
  sole-exit assertion keep their force under that profile; the `listDue`-blind assertion
  stays true there (no bound ⇒ no dueAt ⇒ never listed — §12: "A record with no bound is
  never listed"). The declared-bound path's closing-window pins are Task 4's.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm exec vitest run packages/record/test/construction-validation.test.ts packages/record/test/clocks.test.ts packages/record/test/redeem-token.test.ts`
Expected: the acceptance pin FAILS (guard still throws); the two producer pins FAIL
(no dueAt/bound written); the reworked pins fail per their edits.

- [ ] **Step 3: Implement**

1. `config.ts`: delete the `redeemBound` guard block and its numbered doc-comment entry
   (renumber the tail back).
2. `test/helpers/profiles.ts`: `effectSeamProfile`'s redeem block becomes
   `redeem: { confirmToRedeem: 3600, redeemBound: 86400 }`, REPLACING the second
   increment's authorization note with the third's: the guard lifted with the clock
   built; `confirmToRedeem` WIDENED from 1 to 3600 because finalize now stamps a real
   `dueAt` — a one-second fixture bound would race every real-clock test between
   finalize and the next seam call.
3. `kernel/redeem.ts` `beginRedemption` rung (6): after `const tokenDigest = digest(token);`:

```ts
  const redeemBound = resolved.profile.redeem?.redeemBound;
```

   build the transition first (its `at` anchors the bound), then:

```ts
  const bound = redeemBound === undefined ? undefined : deadlineIso(redeemingTransition.at, redeemBound);
  // §4's table: `redeeming` is `{ tokenDigest, bound? }`, `bound` present-IFF-declared —
  // built whole at the third step-3 increment (payload, dueAt, and resolution together).
  if (bound !== undefined) {
    redeemingTransition.payload = { tokenDigest, bound };
  }
  const meta: AppendMeta = {
    nonTerminal: nonTerminal('redeeming', finalLeg, resolved.effectSeam),
    ...(bound === undefined ? {} : { dueAt: bound }),
  };
```

   (Restructure so `redeemingTransition` is built with the right payload in one literal
   rather than mutated after construction if the linter prefers — the committed shape is
   the implementer's, the payload/meta VALUES are binding.) Update the doc comment's
   strand sentence: the lost-token strand now ends at the declared `redeemBound` (§11.2's
   lost-token pricing); a profile declaring no bound keeps the strand risk knowingly.
   Delete the stale "`dueAt` omitted: no clock exists in this build" comment.
4. `kernel/finalize.ts` postBatch: replace the `// No dueAt:` comment block and the bare
   meta with:

```ts
  const confirmToRedeem = resolved.profile.redeem?.confirmToRedeem;
  const confirmedDue =
    resolved.effectSeam && finalLeg && confirmToRedeem !== undefined
      ? deadlineIso(nowIso, confirmToRedeem)
      : undefined;
  const postBatch: AppendMeta = {
    nonTerminal: nonTerminal('confirmed', finalLeg, resolved.effectSeam),
    // §12: presence sets the pending-clock column — the confirmed-awaiting-redemption
    // window (§9.1's confirmToRedeem), stamped from the batch's own single clock reading
    // (§2.1) at the third step-3 increment. Capture-only or undeclared: omitted, clearing
    // the open window's column as before.
    ...(confirmedDue === undefined ? {} : { dueAt: confirmedDue }),
  };
```

   (`import { deadlineIso } from './expiry.js';` joins the existing expiry import.)
5. `kernel/expiry.ts`: finalize `pendingWindow`'s redeeming-window doc sentence — its
   "executing pins land with the guard lift, later in the third step-3 increment" wording
   was true at the module's own commit and goes stale HERE, where the guard lifts and the
   pins execute; reword to name where the pins live (clocks.test.ts /
   redeem-token.test.ts), truthful at this commit and every later one.

- [ ] **Step 4: Run tests, gates, commit**

Run the three named files, then `pnpm test` (zero skips), all five gates — `pnpm test`
includes the cross-backing byte-identity token flow, which now mints a `redeeming`
payload carrying `bound` under its fixed clock and fixed token: it MUST stay green and
byte-identical across both backings (deterministic inputs ⇒ deterministic bytes; a red
there means the producer leaked a real-clock read). Commit (Bash):

```bash
git add -A packages/record
git commit -m "Lift the guard with the bound built whole: producers stamp what the clock reads

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `redemption-timeout` and the last replay arm

**Files:**
- Modify: `packages/record/src/refusal-codes.ts` (union + REGISTRY + NEVER_APPENDS + comments)
- Modify: `packages/record/src/chain/replay.ts` (the `redemption-failed` arm + doc comment)
- Modify: `packages/record/test/outcome-model.test.ts:44` and
  `packages/record/test/refusal-matrix.test.ts` (count pins 13→14; matrix row)
- Test: `packages/record/test/replay-verify.test.ts` (fold pin replaces the throw pin)

**Interfaces:**
- Produces: `'redemption-timeout'` in `RefusalCode` (class `refusal`, never-appends);
  `replay()` folds `redemption-failed` to
  `{ state: 'redemption-failed', refusalCode: 'redemption-timeout' }`.

- [ ] **Step 1: Write the failing tests**

In `replay-verify.test.ts`, REPLACE the second increment's throw pin
(`'replay: redemption-failed still throws — no producer until the clock increment'`)
with the fold pin, inversion note appended in place:

```ts
test('replay: a redemption-failed transition folds state AND refusalCode redemption-timeout', () => {
  // INVERTED, at the third step-3 increment: the second increment pinned the loud throw
  // here while no producer existed. The clock now produces the kind, and §4's table says
  // it "folds `refusalCode: redemption-timeout` on replay" — the constant, from the
  // registry; `bound` stays evidence, never folded.
  const genesis = storeGenesis('rec-replay-rf', 'profile.p1', 'subject:rf');
  const confirmed = storeNext(genesis, 'confirmed', {
    actor: { principal: 'approver:1', authority: 'session:test-app' },
  });
  const redeeming = storeNext(confirmed, 'redeeming', {
    tokenDigest: `sha256:${'b'.repeat(64)}`,
  });
  const failed = storeNext(redeeming, 'redemption-failed', { bound: '2026-01-01T00:00:00.000Z' });
  const record = replay([genesis, confirmed, redeeming, failed]);
  assert.equal(record.state, 'redemption-failed');
  assert.equal(record.refusalCode, 'redemption-timeout');
  assert.equal('bound' in record, false);
});
```

Bump both count pins 13→14 (the assertion value at `outcome-model.test.ts:44` and its
assertion-message string "…all thirteen…" → "…all fourteen…"; the matrix file's own
count); add the `refusal-matrix` row for
`redemption-timeout` following that file's per-code section conventions (class
`refusal`, never-appends — read the file's existing `unredeemable-state` section and
mirror its shape).

- [ ] **Step 2: Run to verify failure**

Run: `pnpm exec vitest run packages/record/test/replay-verify.test.ts packages/record/test/outcome-model.test.ts packages/record/test/refusal-matrix.test.ts`
Expected: FAIL — the code is not in the union (compile error) and replay throws.

- [ ] **Step 3: Implement**

`refusal-codes.ts`: add `| 'redemption-timeout'` under the profile-conditional comment
(producers: `kernel/expiry.ts`'s resolution via the redemption seams — name
`kernel/redeem.ts`'s resolver rung, Task 4's), `'redemption-timeout': 'refusal'` in
`REGISTRY`, membership in `NEVER_APPENDS` with the comment extended: its edge is the
`redemption-failed` KIND (§4's table), never a `refused` transition — §8 lists it in the
never-appends set. `chain/replay.ts`: the arm —

```ts
      case 'redemption-failed': {
        // The redemption bound elapsed with the outcome unknown (SPEC §11.2; third
        // step-3 increment): state moves, and §4's table folds the CONSTANT refusal code
        // — "folds `refusalCode: redemption-timeout` on replay". `bound` is evidence.
        record.state = 'redemption-failed';
        record.refusalCode = 'redemption-timeout';
        break;
      }
```

and the doc comment's throws list shrinks to `finding-raised` / `acknowledged` (update
the emitted-kinds sentence truthfully: the kernel emits `redemption-failed` as of the
third step-3 increment — this task's arm lands BEFORE the producer (Task 4), so word it
as "handled; its kernel producer (the clock resolution) lands later in the third step-3
increment", then Task 4 finalizes the wording — the same two-touch truth discipline the
second increment used for `redeeming`).

- [ ] **Step 4: Run tests, gates, commit**

```bash
git add -A packages/record
git commit -m "Fold the timeout on replay: the fourteenth code, constant by the table

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: The resolutions at the redemption seams

**Files:**
- Modify: `packages/record/src/kernel/redeem.ts` (prologue rung + doc comments)
- Modify: `packages/record/src/chain/replay.ts` (finalize the emitted-kinds wording — the
  producer is now real)
- Test: `packages/record/test/clocks.test.ts` (extend)

**Interfaces:**
- Consumes: Task 1's `resolveDueClock`, Task 3's code; the prologue's `gated` shape.
- Produces: the prologue resolves elapsed confirmed/redeeming windows for all three
  seams; resolver-reports-timeout semantics later tasks and docs rely on.

- [ ] **Step 1: Write the failing tests**

Add to `clocks.test.ts` (the fixture helpers from earlier steps; add a
`redeemingAt(clock)` helper mirroring `confirmedAt` that also begins and returns the
token):

```ts
async function redeemingAt(clock: { t: number }, store = new MemoryStore()) {
  const { handles, recordId } = await confirmedAt(clock, store);
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok', 'fixture: the issuance must succeed');
  if (begun.status !== 'ok') throw new Error('unreachable');
  return { handles, recordId, store, token: begun.value.token };
}

const CONFIRM_BOUND = effectSeamProfile().redeem?.confirmToRedeem ?? NaN;
const REDEEM_BOUND = effectSeamProfile().redeem?.redeemBound ?? NaN;

test('an elapsed confirmed window at redeem(): expired edge appended, unredeemable-state, pair released', async () => {
  const clock = { t: T0 };
  const { handles, recordId, store } = await confirmedAt(clock);
  clock.t = T0 + (CONFIRM_BOUND + 10) * 1000;

  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state'); // §11.2's preamble: the record is now expired

  const last = (await store.readChain(recordId)).at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'expired');
  assert.equal(await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF), null);
  assert.deepEqual(await store.listDue(new Date(clock.t + 1000 * 1000)), [], 'dueAt cleared');
});

test('THE UNKNOWN-OUTCOME PIN: a CORRECT token after the redeemBound elapsed — redemption-timeout, edge redemption-failed, token dead', async () => {
  // §11.2: "a `redeeming` bound elapsing with the outcome unknown resolves
  // `redeeming → redemption-failed` with `redemption-timeout`, and an unknown outcome is
  // never retried" — at-most-once over convenience, now an executing pin.
  const clock = { t: T0 };
  const { handles, recordId, store, token } = await redeemingAt(clock);
  clock.t += (REDEEM_BOUND + 10) * 1000;

  const outcome = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'redemption-timeout'); // the RESOLVER reports what this call did

  const chain = await store.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'redemption-failed');
  assert.deepEqual(Object.keys(last.payload as object), ['bound']);

  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'redemption-failed');
  assert.equal(record?.refusalCode, 'redemption-timeout');
  assert.equal(await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF), null);

  // The token is DEAD: a later arrival finds the resolved record — unredeemable-state,
  // and NO second append (the resolver reported; the later arrival only reads).
  const lengthAfterResolution = chain.length;
  const again = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(again.status, 'refused');
  if (again.status !== 'refused') return;
  assert.equal(again.code, 'unredeemable-state');
  assert.equal((await store.readChain(recordId)).length, lengthAfterResolution);
});

test('the clock rung never touches a pure-capture record: elapsed time changes nothing at redeem()', async () => {
  // The rung sits AFTER the effect-seam gate, so a capture-only record — which has no
  // confirmed or redeeming window to be in — refuses exactly as before, with no edge,
  // however far the clock has advanced (the adjacent-pair gate-order discipline).
  const clock = { t: T0 };
  const store = new MemoryStore();
  const handles = createWithClock(
    makeConfig([captureProfile()], { store }),
    () => new Date(clock.t),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const before = (await store.readChain(recordId)).length;

  clock.t = T0 + 400 * HOUR;
  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state');
  assert.equal((await store.readChain(recordId)).length, before, 'no edge on a capture record, ever');
});

test('begin and direct redeem() resolving an elapsed redeeming window also report redemption-timeout', async () => {
  const clock = { t: T0 };
  const a = await redeemingAt(clock);
  clock.t += (REDEEM_BOUND + 10) * 1000;
  const viaBegin = await a.handles.operator.beginRedemption(a.recordId, CONTENT);
  assert.equal(viaBegin.status, 'refused');
  if (viaBegin.status === 'refused') assert.equal(viaBegin.code, 'redemption-timeout');

  const clock2 = { t: T0 };
  const b = await redeemingAt(clock2);
  clock2.t += (REDEEM_BOUND + 10) * 1000;
  const viaDirect = await b.handles.operator.redeem(b.recordId, CONTENT);
  assert.equal(viaDirect.status, 'refused');
  if (viaDirect.status === 'refused') assert.equal(viaDirect.code, 'redemption-timeout');
});

test('§4 exception, now non-vacuous: redeem() on a due-OPEN record refuses with NO edge', async () => {
  const clock = { t: T0 };
  const store = new MemoryStore();
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store }),
    () => new Date(clock.t),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  clock.t = T0 + 400 * HOUR; // far past the open ttl
  const before = (await store.readChain(recordId)).length;

  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state');
  assert.equal((await store.readChain(recordId)).length, before, 'no edge — §4 names this exception');
});

test('verify-first outranks the clock: a tampered chain with an elapsed bound refuses chain-compromise', async () => {
  const clock = { t: T0 };
  const inner = new MemoryStore();
  const { recordId } = await confirmedAt(clock, inner);
  clock.t = T0 + (CONFIRM_BOUND + 10) * 1000;

  const tampering = new TamperingStore(inner, recordId, tamperNonLast);
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store: tampering }),
    () => new Date(clock.t),
  );
  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
});

test('the resolution race: a resolver losing the CAS re-reads and reports the fresh state honestly', async () => {
  // The winner resolves redeeming → redemption-failed first; the loser's own resolution
  // CAS fails, re-reads, finds redemption-failed — unredeemable-state (nothing timed out
  // at the loser's call; the SECOND increment's residual discipline extended to clocks).
  const clock = { t: T0 };
  const inner = new MemoryStore();
  const { handles: _h, recordId, token } = await redeemingAt(clock, inner);
  clock.t += (REDEEM_BOUND + 10) * 1000;

  const racing = new RaceOnceStore(
    inner,
    (expected, t) => expected === 'redeeming' && t.kind === 'redemption-failed',
    async (innerStore, rid) => {
      const chain = await innerStore.readChain(rid);
      const head = chain.at(-1);
      if (head === undefined) throw new Error('fixture: chain has a head');
      const winner = storeNext(head, 'redemption-failed', {
        bound: new Date(clock.t - 10 * 1000).toISOString(),
      });
      const res = await innerStore.appendTransition('redeeming', winner, { nonTerminal: false });
      if (!res.appended) throw new Error('fixture: the winner must land');
      return undefined;
    },
  );
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store: racing }),
    () => new Date(clock.t),
  );
  const loser = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(loser.status, 'refused');
  if (loser.status !== 'refused') return;
  assert.equal(loser.code, 'unredeemable-state');
});
```

(Imports join the file's top: `create`, `captureProfile`, `TamperingStore`,
`RaceOnceStore`, `tamperNonLast`, `storeNext` — `storeNext` lives in
`test/helpers/chain.ts`; match the existing files' import conventions.)

- [ ] **Step 2: Run to verify failure**

Run: `pnpm exec vitest run packages/record/test/clocks.test.ts`
Expected: the resolution tests FAIL (elapsed bounds are ignored; the state gates refuse
`unredeemable-state` with no edge, or complete succeeds where timeout is asserted).

- [ ] **Step 3: Implement the prologue rung**

In `kernel/redeem.ts`'s `prologue`, after the effect-seam/final-leg gate and before
`return { gated: … }`:

```ts
  // --- the clock rung (third step-3 increment; §4 "appended lazily at the next
  // operator-side mutating seam that observes the bound has passed") -------------------
  // Placed AFTER the seam gate: a pure-capture record never reaches here, and a
  // due-OPEN record is deliberately NOT resolved at these seams — §4: "`redeem()` does
  // not treat a due-`open` record as expired — it refuses `unredeemable-state` without
  // writing an edge" (pendingWindow's open arm is skipped by the state check below).
  // The RESOLVER REPORTS the outcome: an elapsed confirmed window resolves to `expired`
  // and the seam refuses `unredeemable-state` (§11.2's preamble — the record is now
  // expired); an elapsed redeeming window resolves to `redemption-failed` and the seam
  // refuses `redemption-timeout` (§11.2: the bound elapsed "with the outcome unknown...
  // with `redemption-timeout`"). A seam arriving AFTER a resolution finds the terminal
  // state at its own state gate and refuses `unredeemable-state` — nothing timed out at
  // that call. A lost resolution CAS re-reads once (the family residual discipline).
  if (record.state === 'confirmed' || record.state === 'redeeming') {
    const due = await resolveDueClock(store, chain, resolved, now());
    if (due.due) {
      if (!due.result.appended) {
        return { refusal: await residualRefusal(store, recordId) };
      }
      return {
        refusal: refused(due.window === 'redeeming' ? 'redemption-timeout' : 'unredeemable-state'),
      };
    }
  }
```

(`import { resolveDueClock } from './expiry.js';`. `residualRefusal` already exists above
in the same file — note its re-read maps a fresh `redemption-failed`/`expired` to
`unredeemable-state`, which is exactly the loser semantics the race pin asserts.)

Comment truth passes in the same commit: the file header's "NO EN-PASSANT EXPIRY"
paragraph rewrites (the due-`open` half stays as the §4 exception, now pinned; the
due-`confirmed` half is REAL as of the third step-3 increment — delete "is the clock
increment's work"); `beginRedemption`'s and `completeRedemption`'s dead-until-clock
sentences for `redemption-failed` update (the state now has a producer; the arms are the
post-resolution arrivals); `replay.ts`'s emitted-kinds sentence finalizes (the producer
is real).

- [ ] **Step 4: Run tests, gates, commit**

Run `clocks.test.ts`, then `pnpm test` (the second increment's suite must stay green —
its fixtures never sit inside a live window after Task 2's widening), all five gates.

```bash
git add -A packages/record
git commit -m "Resolve at the seams: the resolver reports, the strand window closes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: The resolutions at `finalize()` and `open()`

**Files:**
- Modify: `packages/record/src/kernel/finalize.ts:124-144` (rung 2 extension)
- Modify: `packages/record/src/kernel/open.ts:161-181` (blocker branch: the confirmed arm)
- Test: `packages/record/test/clocks.test.ts` (extend)

**Interfaces:**
- Consumes: Task 1's `resolveDueClock`; Task 4's semantics for comparison.
- Produces: finalize resolves both windows at rung 2 (`leg-expired` /
  `record-not-open`); `open()` expire-and-retries a due-confirmed blocker and refuses
  `record-exists` for a redeeming blocker due or not.

- [ ] **Step 1: Write the failing tests**

```ts
test('finalize on a due-confirmed record resolves it en passant and refuses leg-expired', async () => {
  const clock = { t: T0 };
  const { handles, recordId, store } = await confirmedAt(clock);
  clock.t = T0 + (CONFIRM_BOUND + 10) * 1000;

  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'leg-expired'); // §8: an expired or due-expired record at a decision-progress seam

  const last = (await store.readChain(recordId)).at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'expired');
});

test('finalize on a due-redeeming record resolves it en passant and refuses record-not-open', async () => {
  const clock = { t: T0 };
  const { handles, recordId, store } = await redeemingAt(clock);
  clock.t += (REDEEM_BOUND + 10) * 1000;

  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'record-not-open'); // resolved to redemption-failed: non-open, non-expired

  const last = (await store.readChain(recordId)).at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'redemption-failed');
});

test('open(): a due-CONFIRMED blocker is expired en passant and the fresh open succeeds — §9.1 un-strands the pair', async () => {
  const clock = { t: T0 };
  const { handles, store } = await confirmedAt(clock);
  clock.t = T0 + (CONFIRM_BOUND + 10) * 1000;

  const staged = await handles.agent.stage({ subject: 'week-2', total: 41 }, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const reopened = await handles.operator.open(staged.value.stagedRef);
  assert.equal(reopened.status, 'ok', 'expire-then-retry: the elapsed window releases the pair');
  if (reopened.status !== 'ok') return;

  // Far in the future only the NEW record's own open window pends — the blocker resolved
  // terminal, its dueAt cleared by the resolution append's omission.
  const due = await store.listDue(new Date(clock.t + 400 * HOUR));
  assert.deepEqual(due, [reopened.value.recordId]);
});

test('open(): a due-REDEEMING blocker is NEVER auto-resolved — record-exists, no edge (§4 named exception)', async () => {
  const clock = { t: T0 };
  const { handles, recordId, store } = await redeemingAt(clock);
  clock.t += (REDEEM_BOUND + 10) * 1000;
  const before = (await store.readChain(recordId)).length;

  const staged = await handles.agent.stage({ subject: 'week-2', total: 41 }, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const second = await handles.operator.open(staged.value.stagedRef);
  assert.equal(second.status, 'refused');
  if (second.status !== 'refused') return;
  assert.equal(second.code, 'record-exists');
  assert.equal((await store.readChain(recordId)).length, before, 'no edge — the redemption seam owns that clock');
});

test('seal() on due-confirmed and due-redeeming records refuses unsealable-state with no edge — sweep first, then seal', async () => {
  const clock = { t: T0 };
  const a = await confirmedAt(clock);
  clock.t = T0 + (CONFIRM_BOUND + 10) * 1000;
  const beforeA = (await a.store.readChain(a.recordId)).length;
  const sealA = await a.handles.operator.seal(a.recordId);
  assert.equal(sealA.status, 'refused');
  if (sealA.status === 'refused') assert.equal(sealA.code, 'unsealable-state');
  assert.equal((await a.store.readChain(a.recordId)).length, beforeA);

  const clock2 = { t: T0 };
  const b = await redeemingAt(clock2);
  clock2.t += (REDEEM_BOUND + 10) * 1000;
  const beforeB = (await b.store.readChain(b.recordId)).length;
  const sealB = await b.handles.operator.seal(b.recordId);
  assert.equal(sealB.status, 'refused');
  if (sealB.status === 'refused') assert.equal(sealB.code, 'unsealable-state');
  assert.equal((await b.store.readChain(b.recordId)).length, beforeB);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm exec vitest run packages/record/test/clocks.test.ts`
Expected: the finalize pins FAIL (record-not-open with no edge today); the
due-confirmed-blocker pin FAILS (record-exists today); the exception pins may already
pass — keep them regardless (they pin the boundary).

- [ ] **Step 3: Implement**

`kernel/finalize.ts` rung 2 — restructure to (preserving the existing arms' comments,
extended):

```ts
  if (record.state === 'expired') {
    return refused('leg-expired');
  }
  if (record.state === 'confirmed' || record.state === 'redeeming') {
    // The clock rung (third step-3 increment; §4's lazy rule at this seam too): an
    // elapsed confirmed window resolves to `expired` → `leg-expired` (§8's "expired or
    // due-expired record"); an elapsed redeeming window resolves to `redemption-failed`
    // → `record-not-open` (a non-open, non-expired record). Not due, or the CAS lost to
    // a racing writer: the plain state verdict below — the record is not open either way.
    const due = await resolveDueClock(store, chain, resolved, now());
    if (due.due && due.result.appended) {
      return refused(due.window === 'confirmed' ? 'leg-expired' : 'record-not-open');
    }
    return refused('record-not-open');
  }
  if (record.state !== 'open') {
    return refused('record-not-open');
  }
  const ex = await resolveDueClock(store, chain, resolved, now());
  if (ex.due) {
    return refused('leg-expired');
  }
```

`kernel/open.ts` blocker branch — replace the `blocker.state !== 'open'` block:

```ts
  if (blocker.state === 'redeeming') {
    // §4's named exception, verbatim: "`open()`'s exclusivity check never auto-resolves
    // a `redeeming` blocker, due or not — it refuses `record-exists`, leaving that edge
    // to the redemption seam's own clock." No CAS, no edge, ever.
    return refused('record-exists');
  }
  if (blocker.state !== 'open' && blocker.state !== 'confirmed') {
    // Defensive: a terminal blocker cannot hold C1; a coherent store never names one.
    return refused('record-exists');
  }
  // An `open` blocker rides the open window; a `confirmed` effect-seam blocker rides the
  // confirmToRedeem window (third step-3 increment — the un-stranding §9.1 promises:
  // "without it, a lost redemption token strands the record... indefinitely" is the
  // redeemBound half; this is the confirmed half). Same expire-then-retry-ONCE shape
  // either way; resolveDueClock picks the window from the replayed state.
  const ex = await resolveDueClock(store, blockerChain, resolved, now());
  if (!ex.due) {
    return refused('record-exists');
  }
  if (!ex.result.appended) {
    return refused('record-exists');
  }
```

(The retry-once tail below stays byte-identical.)

- [ ] **Step 4: Run tests, gates, commit**

```bash
git add -A packages/record
git commit -m "Finalize and open observe the clocks too: lazy, once, own codes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: `operator.listDue` and the sweep end-to-end

**Files:**
- Modify: `packages/record/src/operator-surface.ts` (interface + literal + header)
- Modify: `packages/record/src/create.ts` (Kernel + makeKernel)
- Modify: `packages/record/test/agent-unreachability.test.ts` (arrays)
- Test: `packages/record/test/clocks.test.ts` (extend)

**Interfaces:**
- Produces: `OperatorSurface.listDue(): Promise<string[]>` — `store.listDue(now())` with
  the injected clock; absent from the agent surface.

- [ ] **Step 1: Write the failing tests**

```ts
test('the sweep, end to end: listDue names the lost-token record, redeem({}) resolves it, seal() retires it', async () => {
  // §12's sweep: "the operator iterates `listDue(now)` and, per listed record, drives
  // the ordinary mutating seam for that record's pending window" — no append authority
  // of its own; then sweep-first-then-seal (§4, §5). The token is LOST in this scenario
  // — the resolution needs no token and any content serves (the clock rung precedes
  // correspondence).
  const clock = { t: T0 };
  const { handles, recordId } = await redeemingAt(clock); // token deliberately unused: lost
  clock.t += (REDEEM_BOUND + 10) * 1000;

  const due = await handles.operator.listDue();
  assert.deepEqual(due, [recordId]);

  const resolved = await handles.operator.redeem(recordId, {});
  assert.equal(resolved.status, 'refused');
  if (resolved.status !== 'refused') return;
  assert.equal(resolved.code, 'redemption-timeout');

  assert.deepEqual(await handles.operator.listDue(), [], 'resolution cleared the clock');

  const sealed = await handles.operator.seal(recordId);
  assert.equal(sealed.status, 'ok', 'sweep first, then seal — the record is terminal now');
  if (sealed.status !== 'ok') return;
  assert.equal(sealed.value.status, 'retired');
});
```

In `agent-unreachability.test.ts`: `TRANSITIONING` gains `'listDue'` (it is
operator-only even though it is a read — the agent surface's key-set pin enforces
absence either way; the probe stays symmetric).

- [ ] **Step 2: Run to verify failure**

Run: `pnpm exec vitest run packages/record/test/clocks.test.ts packages/record/test/agent-unreachability.test.ts`
Expected: FAIL — `listDue` is not on the operator surface.

- [ ] **Step 3: Implement**

`operator-surface.ts` interface, beside the reads:

```ts
  listDue(): Promise<string[]>; // §12's sweep read: store.listDue at the injected clock.
  // "Like every §12 surface its concrete signature is provisional pre-1.0; the contract
  // is the behaviour above" — quoted because the sweep drives ordinary seams from this
  // list and adds no append authority (§4 ships no scheduler and no public expire()).
```

`create.ts`: `Kernel` gains `listDue: OperatorSurface['listDue'];`, `makeKernel` gains
`listDue: () => store.listDue(ctx.now()),` in the reads section (destructure `now` or use
`ctx.now()` per the file's local style); the frozen operator literal gains
`listDue: kernel.listDue,`. The agent surface is untouched.

- [ ] **Step 4: Run tests, gates, commit**

```bash
git add -A packages/record
git commit -m "One read for the sweep: listDue on the operator handle, nothing more

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: The record — step 3 exits

**Files:**
- Modify: `docs/process/implementation-status.md`
- Modify: `CLAUDE.md`, `README.md`
- Modify: stale comments the sweep finds (src + test)
- No register edits expected (verify: row 16's trigger unchanged; nothing new defers)

**Interfaces:** consumes everything Tasks 1-6 landed; the spec's §7 ("The record") is
this task's checklist — read the spec in full first, and verify every claim against the
CODE as it stands, never against task reports (a standing lesson).

- [ ] **Step 1: implementation-status.md**

Content requirements (match on content — line numbers have drifted):
- **Steps table**: step 3 → **Exited**, naming its three increments (the direct shape;
  the token shape; the clocks) and the exit ruling's deferred-at-exit list (live-mode
  `reverify` — §9.2 SKETCHED, a later step; the sweep's provisional signature; the
  due-`open` rough edge; register row 16). Step 4 (multi-leg separation of duties,
  SPEC §10.1) named as the next build-order step.
- **§4 row**: the clock edges built (all three; the two named exceptions pinned
  non-vacuously); emitted kinds now include `redemption-failed`.
- **§8 row**: `redemption-timeout` present with its producers (the resolver rung;
  folded on replay); the two count pins at 14.
- **§9 row**: the surface gained the `listDue` read — the recorded naming-divergence
  item EXTENDS to it (SPEC names "the sweep", not a method; flagged to row 6's pre-0.1
  naming review, same as the two call names).
- **§9.1 row**: both bounds enforced; the SHOULD-declare-`redeemBound` advice is now
  real advice with teeth; the seconds convention recorded (the spec states units only
  for `expiry.ttl`; the bounds match it as this build's convention).
- **§11.2 row**: whole — both shapes, both clocks, at-most-once including the
  elapsed-`redeeming` unknown-outcome half (the pin named). The **"safe to ship, not
  yet safe to operate" statement RETIRES** to its truthful successor: safe to operate
  when `redeemBound` is declared; a host omitting it accepts the strand §9.1 names,
  knowingly (the no-`redeemBound` strand test is the executing record of that shape).
- **§12 row**: the sweep recipe documented — iterate `operator.listDue()`; drive
  `redeem(recordId, {})` for confirmed/redeeming windows (the clock rung precedes
  correspondence, so any content serves; the refusal reports the resolution:
  `unredeemable-state` / `redemption-timeout`); then `seal()`. The due-`open` rough
  edge recorded beside it: no argument-free resolver exists — `redeem()` is
  spec-forbidden from expiring it (§4) and `finalize()` needs real arguments — it
  resolves at its next genuine `finalize()` or a fresh `open()` for the pair.
- The resolver-reports ruling, the `open()` due-confirmed blocker extension, and the
  Task 2/Task 3 pin inversions (guard lift; replay throw→fold) recorded as authorized,
  with their in-place notes cited.

- [ ] **Step 2: CLAUDE.md + README.md**

- CLAUDE.md's project paragraph and feature-guard paragraph: step 3 **exited** (three
  increments, the third named as the clocks); nothing at the redemption seams is
  governed any longer (`redeemBound`'s construction guard lifted WITH its clock);
  "five of the eight build-order steps remain unstarted" — verify it survives (it
  counted steps 4-8) and leave it. README's step-3 sentences and layout row: same
  movement; step 4 named as next.

- [ ] **Step 3: The sweep**

```bash
git grep -nE "until the clock increment|the clock increment|third step-3 increment|dead.?until|no producer|not yet safe to operate|sole exit|strand|later increment|this increment|still unbuilt|does not exist( yet)?|inert|accepted-but-inert|unreachable in this build|if a later build step|second and third" -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
git grep -nE "covers ONLY|expireIfDue|ExpireResult" -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
```

Judge every hit (still-true / fixed-by-tasks-1-6 / fix-now / historical-leave-alone);
the hit-list with verdicts is REQUIRED in your report. Both deixis directions. Known
targets the sweep must confirm fixed: `kernel/open.ts:135-139`'s genesis-meta comment
("both remain inert until the clock increment" — false now), `kernel/redeem.ts`'s
header and per-seam clock sentences, `expiry.ts`'s header, `types.ts`'s emitted-kinds
comments (add `redemption-failed`), `refusal-codes.ts`'s producer comments,
`redeem-token.test.ts`'s reworked strand-test note, the status doc's own prior-increment
rows. END-OF-INCREMENT OWN-COMMENT PASS: re-grep the increment's new comments for
"later in the third step-3 increment" phrasing that Tasks 3-6 have since made stale
(`git diff 1575938..HEAD -- packages | grep -n "later in the third"` — the second
increment's drift lesson, applied to this one's own text).

- [ ] **Step 4: Verify quotes, gates, commit**

Hand-verify every quoted SPEC/DECISIONS phrase whitespace-collapsed. All five gates
(contract-scan gates the markdown). Commit (Bash):

```bash
git add -A
git commit -m "Record step 3's exit: three increments, the strand priced and now paid

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Exit verification

**Files:** none modified (fixes only if a gate fails).

- [ ] **Step 1: Clean-tree gates**

Fresh PowerShell (`$env:PATH = "$env:APPDATA\npm;$env:PATH"`), `git status --porcelain`
empty, `git branch --show-current` = main, then in order: `pnpm typecheck` · `pnpm lint`
· `pnpm lint:strict` · `pnpm test` · `node scripts/contract-scan.mjs`. Capture exact
test/file counts and the zero-skip line.

- [ ] **Step 2: Freeze verification**

```bash
git diff 95b1521..HEAD -- packages/record/test/byte-stability.test.ts   # MUST be empty
git diff 95b1521..HEAD -- packages/record/src/chain/encoding.ts          # MUST be empty
git diff 95b1521..HEAD -- packages/record/src/store/                     # MUST be empty (no store edits this increment)
```

Characterize any non-empty result as BLOCKED and report.

- [ ] **Step 3: Report**

The increment's commit list one-per-line (`git log --oneline ac8d07f..HEAD` plus the
spec/plan commits), exact counts (do not carry forward as claims), register rows live
(verify by reading the file), step-3-exited confirmation, and `git status -sb`'s
ahead-count for the user-gated push.
