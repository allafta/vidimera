# Redemption Direct Shape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SPEC §11.2's co-located redemption shape — `confirmed → redeemed { via: 'direct' }`,
enlisted through the `tx?` seam, with effect-content correspondence and the at-most-once
replay refusal — releasing the held `(profile, subject)` pair and recording step 2's exit
ruling.

**Architecture:** `kernel/redeem.ts` is rebuilt from stub to a verify-first gate ladder
mirroring `kernel/seal.ts` (its file is the template — same throw shape, same
`appendChainCompromise` reuse, same residual mapping). `effect-mismatch` and
`already-redeemed` join the registry as its first profile-conditional codes; `replay` gains
the `redeemed` arm only. The record moves register row 9 out (built) and row 15 in (the
server-SQL deferral carrying the exit ruling).

**Tech Stack:** TypeScript (strict, `noEmit`), vitest, Biome, pnpm workspace (Node 22.16+).

**Spec:** `docs/superpowers/specs/2026-08-12-redemption-direct-shape-design.md` — read it first.

## Global Constraints

- **All five gates green at every commit:** `pnpm typecheck` · `pnpm lint` ·
  `pnpm lint:strict` · `pnpm test` (zero skips) · `node scripts/contract-scan.mjs` (silent;
  **diff output, never totals**). Biome infos ≤ 13; zero `ExperimentalWarning` lines.
- **The byte-stability oracle:** the four digest literals in
  `packages/record/test/byte-stability.test.ts` must not move; nothing under
  `packages/record/src/chain/`, `src/jcs.ts`, `src/canonical.ts` changes.
- **No store-semantics change:** `store/semantics.ts`, `store/memory.ts`,
  `store/sqlite.ts`, `store/store.ts`, and the conformance suite are all untouched —
  `stateOf('redeemed')` already exists, and the C1/C3 behavior this increment relies on is
  already pinned.
- **No edits under `docs/concept/`**; no maturity marker moves.
- **SPEC citations in TypeScript must resolve** (quoted phrases whitespace-collapsed);
  markdown citations hand-verified.
- **Inversion discipline:** the `terminality.test.ts` change is an authorized
  inversion-back of step-1's authorized inversion — argued in an APPENDED note at the test,
  named in the commit body, never silent.
- **Increment names are explicit** ("the first step-3 increment") in every document that
  outlives the increment — register included.
- **Commit messages:** terse imperative subject, ending
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: The seam — registry, replay arm, the ladder, the pins

**Files:**
- Modify: `packages/record/src/refusal-codes.ts` (two codes: union, CORE, NEVER_APPENDS, comments)
- Modify: `packages/record/src/chain/replay.ts` (the `redeemed` arm; the throw-list comment)
- Rewrite: `packages/record/src/kernel/redeem.ts` (stub → ladder)
- Modify: `packages/record/src/operator-surface.ts` (the `redeem` signature)
- Modify: `packages/record/src/create.ts` (the `redeem` wiring passes `tx` through)
- Create: `packages/record/test/redeem.test.ts`
- Modify: `packages/record/test/terminality.test.ts` (the inversion-back + appended note)

**Interfaces:**
- Consumes: `verifyChain`/`replay` (`chain/replay.ts`), `appendChainCompromise`
  (`kernel/finalize.ts`, already exported), `nonTerminal`/`isFinalLeg` (`nonterminal.ts`),
  `digest`/`canonicalize` (`canonical.ts` — the recompute idiom is `kernel/finalize.ts:160`:
  `digest(canonicalize(resolved.canonicalizer(content)))`), `transitionDigest`
  (`chain/encoding.ts`), the `tx?: unknown` pass-through on `store.appendTransition`.
- Produces: `redeem(recordId: string, content: unknown, tx?: unknown):
  Promise<Outcome<{ recordId: string; state: 'redeemed'; transitionRef: Digest }>>` on the
  operator surface; `'effect-mismatch' | 'already-redeemed'` in `RefusalCode`. Task 2's
  documents describe exactly these.

- [ ] **Step 1: Write the failing tests**

Create `packages/record/test/redeem.test.ts`:

```ts
// @vidimera/record — redeem.test.ts (SPEC §11.2 "Redemption (the effect seam)", the DIRECT
// shape): the co-located coupling of a confirmed final-leg decision to its effect —
// `confirmed → redeemed { via: 'direct' }`, enlisted in the host's transaction when one is
// supplied, inside the adapter's own otherwise. The token shape (`redeeming`, tokenDigest,
// presentation) and both redemption clocks are LATER step-3 increments; nothing here
// constructs them.
//
// The ladder under test (kernel/redeem.ts):
//   (1) chain-verify -> chain-compromise      — §5: verification first, at every
//                                               operator-side mutating seam
//   (2) resolve profile -> unknown-profile    — defensive (a coherent instance always
//                                               resolves a record it opened)
//   (3) effect seam declared? -> unredeemable-state (pure-capture; §11.2 "on-iff-effects")
//   (4) state gate -> already-redeemed on 'redeemed' (at-most-once, replay half);
//       unredeemable-state on open/refused/expired (§11.2's preamble); redeeming and
//       redemption-failed are defensive arms with no producer until the later increments
//   (5) correspondence -> effect-mismatch     — re-digest of the supplied content vs the
//                                               bound contentDigest, same path as stage()
//   (6) append redeemed { via: 'direct' }     — meta from the terminality derivation
//                                               (redeemed is terminal: THE RELEASE)
//
// ADJACENT-PAIR ORDER TESTS, derived as finalize-check-order.test.ts derives its own — one
// test per consecutive-rung ordered pair that is JOINTLY CONSTRUCTIBLE:
//   (1)->(3): tampered chain on a PURE-CAPTURE confirmed record — both rungs' conditions
//     hold; chain-compromise must win. Constructible; below.
//   (1)->(4)/(1)->(5): tampered chain + already-redeemed state / wrong content — covered
//     by the same principle as (1)->(3); one representative test below ((1)->(5)).
//   (2)->(3): NOT jointly constructible — an unconfigured profile is defensive-only here,
//     exactly as seal.test.ts's derivation records for its own (1)->(2).
//   (3)->(4): NOT jointly constructible — a pure-capture record cannot reach 'redeemed'.
//   (4)->(5): an already-redeemed record offered WRONG content — at-most-once outranks
//     mismatch reporting; already-redeemed must win. Constructible; below.
//   (5)->(6): a mismatch plus a racing writer — not constructible without a bespoke racing
//     store; excluded, and this comment is why.
// Total order-pair tests in this file: 3.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
  tamperNonLast,
} from './helpers/profiles.js';
import { TamperingStore } from './helpers/stores.js';

const CONTENT = { subject: 'week-1', total: 40 };

/** Opens and finalizes an effect-seam record, leaving it confirmed and NON-terminal. */
async function confirmedEffectRecord(store: MemoryStore | SqliteStore = new MemoryStore()) {
  const handles = create(makeConfig([effectSeamProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  return { handles, recordId, store };
}

// === the direct shape ==================================================================

test('redeem() on a confirmed effect-seam record appends redeemed { via: "direct" }', async () => {
  const { handles, recordId } = await confirmedEffectRecord();

  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;
  assert.equal(outcome.value.state, 'redeemed');
  assert.equal(outcome.value.recordId, recordId);

  const chain = await handles.operator.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'redeemed');
  assert.deepEqual(last.payload, { via: 'direct' });

  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'redeemed');
});

test('THE RELEASE: after redeemed, the (profile, subject) pair is held no longer', async () => {
  // Register row 9's own text named "the redemption edge itself (SPEC §11.2)" as the first
  // release path. This is that edge, doing that release: the persisted flag comes from the
  // terminality derivation (redeemed is terminal, §2), so C1's partial-unique hold lifts.
  const store = new MemoryStore();
  const { handles, recordId } = await confirmedEffectRecord(store);

  assert.equal(
    await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF),
    recordId,
    'fixture: the confirmed effect-seam record holds the pair before redemption',
  );

  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'ok', 'fixture: the redemption must succeed');

  assert.equal(await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF), null);

  const staged = await handles.agent.stage(
    { subject: 'week-2', total: 41 },
    'test.effect.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const reopened = await handles.operator.open(staged.value.stagedRef);
  assert.equal(reopened.status, 'ok', 'a fresh decision for the released pair opens');
});

test('ENLISTMENT: a host ROLLBACK erases the redeemed edge, and a known-rollback retry succeeds', async () => {
  // SPEC §11.2, the direct shape: the edge "commits or rolls back with" the host's
  // transaction; "A host rollback erases the edge entirely", and re-attempting a KNOWN
  // rolled-back redemption is legitimate — not the unknown-outcome retry the at-most-once
  // rule forbids (that rule governs the token shape's elapsed-`redeeming` case).
  const store = new SqliteStore(':memory:');
  const { handles, recordId } = await confirmedEffectRecord(store);

  store.database.exec('BEGIN IMMEDIATE');
  const enlisted = await handles.operator.redeem(recordId, CONTENT, store.database);
  assert.equal(enlisted.status, 'ok', 'the enlisted redemption reports success inside the txn');
  store.database.exec('ROLLBACK');

  const afterRollback = await handles.operator.getRecord(recordId);
  assert.equal(afterRollback?.state, 'confirmed', 'the rollback took the edge with it');
  assert.equal(
    await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF),
    recordId,
    'the pair is still held — nothing was released',
  );

  const retry = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(retry.status, 'ok', 'the known-rollback retry is legitimate and succeeds');
  assert.equal((await handles.operator.getRecord(recordId))?.state, 'redeemed');
});

// === at-most-once, replay half =========================================================

test('a second redeem() refuses already-redeemed, appending nothing', async () => {
  const { handles, recordId } = await confirmedEffectRecord();
  await handles.operator.redeem(recordId, CONTENT);
  const before = await handles.operator.readChain(recordId);

  const replayed = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(replayed.status, 'refused');
  if (replayed.status !== 'refused') return;
  assert.equal(replayed.code, 'already-redeemed');
  assert.equal(replayed.transitionRef, undefined, 'a never-appends code carries no ref');

  assert.deepEqual(await handles.operator.readChain(recordId), before);
});

// === correspondence ====================================================================

test('altered content refuses effect-mismatch, appending nothing', async () => {
  const { handles, recordId } = await confirmedEffectRecord();
  const before = await handles.operator.readChain(recordId);

  const outcome = await handles.operator.redeem(recordId, { subject: 'week-1', total: 41 });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'effect-mismatch');
  assert.equal(outcome.transitionRef, undefined);

  assert.deepEqual(await handles.operator.readChain(recordId), before);
});

test('content that re-canonicalizes identically redeems — the binding is the digest, not the reference', async () => {
  // Same value, different object: the correspondence check re-digests through the SAME
  // adopter-canonicalizer path stage() used, so a structurally identical value passes.
  const { handles, recordId } = await confirmedEffectRecord();
  const outcome = await handles.operator.redeem(recordId, { total: 40, subject: 'week-1' });
  assert.equal(outcome.status, 'ok', 'key order is not content difference under JCS');
});

// === unredeemable-state, correctly scoped ==============================================

test('redeem() on a PURE-CAPTURE profile refuses unredeemable-state whatever the state', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const open = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(open.status, 'refused');
  if (open.status !== 'refused') return;
  assert.equal(open.code, 'unredeemable-state');

  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  const confirmed = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(confirmed.status, 'refused');
  if (confirmed.status !== 'refused') return;
  assert.equal(confirmed.code, 'unredeemable-state');
});

test('redeem() on an OPEN effect-seam record refuses unredeemable-state', async () => {
  const handles = create(makeConfig([effectSeamProfile()]));
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state');
});

// === caller errors =====================================================================

test('redeem() on an unknown recordId THROWS — a caller error, not a domain refusal', async () => {
  // Fixes the stub, which refused unredeemable-state here against §8's qualifiers
  // ("intact-chain, known-profile, valid-leg"): a recordId that resolves to no chain is
  // the same caller error seal() and finalize() already throw on.
  const handles = create(makeConfig([effectSeamProfile()]));
  await assert.rejects(
    () => handles.operator.redeem('no-such-record', CONTENT),
    /unknown recordId/,
  );
});

// === verify-first, and the order pairs =================================================

test('(1)->(3): a tampered chain on a pure-capture confirmed record refuses chain-compromise, not unredeemable-state', async () => {
  const inner = new MemoryStore();
  const handles0 = create(makeConfig([captureProfile()], { store: inner }));
  const recordId = await openRecord(handles0, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const done = await handles0.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');

  const tampering = new TamperingStore(inner, recordId, tamperNonLast);
  const handles = create(makeConfig([captureProfile()], { store: tampering }));
  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
});

test('(1)->(5): a tampered chain outranks a content mismatch — chain-compromise, not effect-mismatch', async () => {
  const inner = new MemoryStore();
  const handles0 = create(makeConfig([effectSeamProfile()], { store: inner }));
  const recordId = await openRecord(handles0, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles0.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');

  const tampering = new TamperingStore(inner, recordId, tamperNonLast);
  const handles = create(makeConfig([effectSeamProfile()], { store: tampering }));
  const outcome = await handles.operator.redeem(recordId, { subject: 'week-1', total: 99 });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
});

test('(4)->(5): already-redeemed outranks effect-mismatch — at-most-once beats mismatch reporting', async () => {
  const { handles, recordId } = await confirmedEffectRecord();
  await handles.operator.redeem(recordId, CONTENT);

  const outcome = await handles.operator.redeem(recordId, { subject: 'week-1', total: 99 });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'already-redeemed');
});
```

(Two shape hedges, trust the compiler over this snippet: `confirmedEffectRecord`'s store
parameter type, and whether `TamperingStore`'s constructor accepts a `SqliteStore`-typed
inner — it is typed `MemoryStore`; both fixtures here pass a `MemoryStore`, so no change to
the helper is needed or wanted.)

- [ ] **Step 2: Run to verify the failures are the RIGHT failures**

Run: `pnpm test -- redeem`
Expected: FAIL throughout — the happy path and release/enlistment tests hit the stub's
build-capability THROW (the step-1 loudness inversion, still in place); the
`already-redeemed`/`effect-mismatch` tests fail on `code` being `'unredeemable-state'` or
on the throw; the unknown-recordId test fails because the stub refuses instead of throwing.
Capture this as RED evidence.

- [ ] **Step 3: The registry — two profile-conditional codes**

In `packages/record/src/refusal-codes.ts`: add `'effect-mismatch'` and
`'already-redeemed'` to the `RefusalCode` union (after `'unsealable-state'`, with a comment
line marking them the union's first PROFILE-CONDITIONAL codes — §8's conditional table,
producers in `kernel/redeem.ts`); add both to `CORE` as `'refusal'`; add both to
`NEVER_APPENDS` (§8 lists both in the never-appends set). Rewrite the stale clause in the
`NEVER_APPENDS` doc comment — "`unredeemable-state` (this build's redeem() stub) never
appends either" becomes:

```
 * `unredeemable-state`, `effect-mismatch` and `already-redeemed` never append —
 * redemption's refusals are all result-first, the seam's only append being the `redeemed`
 * transition folded into its own success path (`kernel/redeem.ts`), never a byproduct of a
 * refusal;
```

- [ ] **Step 4: The `replay` arm**

In `packages/record/src/chain/replay.ts`: add a `case 'redeemed':` arm to the kind switch,
following the file's existing arm pattern exactly (open the file; the `confirmed` and
`sealed` arms are the models — state-moving kinds set `record.state`, and this one sets it
to `'redeemed'`; the `via` payload field is evidence, not state — replay reads nothing from
it, and the arm's comment says so). Remove `redeemed` from the not-yet-emitted list in the
file's throw-arm comment (currently naming `acknowledged`, `redeeming`, `redeemed`,
`redemption-failed`) — the other kinds stay listed and stay throwing.

- [ ] **Step 5: Rebuild `kernel/redeem.ts`**

Replace the whole file:

```ts
// @vidimera/record — kernel/redeem.ts: the operator-only redemption seam, DIRECT shape
// (SPEC §11.2): the single-use coupling of a confirmed final-leg decision to its effect —
// `confirmed → redeemed { via: 'direct' }`. Exported on every profile (SPEC §8:
// "`redeem()` and `seal()` are calls on every profile, with fail-closed domain outcomes in
// every deployment"); on a pure-capture profile the domain outcome is `unredeemable-state`.
//
// The gate ladder, and why:
//   (1) chain-verify      -> chain-compromise    — §5: "Every operator-side mutating seam
//                            verifies the chain before acting"
//   (2) resolve profile   -> unknown-profile     — defensive; fail-closed
//   (3) effect seam?      -> unredeemable-state  — §11.2: "on-iff-effects"
//   (4) state gate        -> already-redeemed on 'redeemed' (at-most-once, replay half);
//                            unredeemable-state otherwise-not-confirmed
//   (5) correspondence    -> effect-mismatch     — re-digest vs the bound contentDigest
//   (6) append redeemed   -> ok; a non-append residual is a racing writer ->
//                            unredeemable-state, result-first
//
// (4) before (5): a replayed redemption refuses `already-redeemed` whatever content it
// carries — at-most-once outranks mismatch reporting.
//
// NO IDENTITY ARGUMENT, deliberately — SPEC §11.2: "It carries no identity argument — the
// deciding actor was bound at finalize (§6); redemption evidences execution, not
// judgment."
//
// NO EN-PASSANT EXPIRY — SPEC §4: "`redeem()` does not treat a due-`open` record as
// expired — it refuses `unredeemable-state` without writing an edge". Vacuous in this
// increment (no clock sets `dueAt` on any state this ladder examines until the clock
// increment) and stated so nobody adds `expireIfDue` by analogy; §4's due-`confirmed`
// resolution is the clock increment's work.
//
// THE ENLISTMENT CONTRACT (direct shape, SPEC §11.2): when the host passes its own
// transaction handle, the edge is enlisted and "commits or rolls back with it". The host
// "MUST `await` the redemption before ending that transaction"; "A host rollback erases
// the edge entirely", and re-attempting a KNOWN rolled-back redemption is legitimate — the
// forbidden retry is the token shape's unknown-outcome case, not this one. §11.2's honest
// bound: the library never executes the effect; the co-located host's protection is the
// shared transaction itself.
//
// The token shape (`redeeming`, tokenDigest, presentation) and both redemption clocks are
// LATER step-3 increments; states `redeeming`/`redemption-failed` are defensively refused
// below, never claimed as spec-granted arms.

import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import { canonicalize, digest } from '../canonical.js';
import type { KernelContext } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import type { AppendMeta } from '../store/store.js';
import type { Digest, Transition } from '../types.js';
import { appendChainCompromise } from './finalize.js';

export async function redeem(
  ctx: KernelContext,
  recordId: string,
  content: unknown,
  tx?: unknown,
): Promise<Outcome<{ recordId: string; state: 'redeemed'; transitionRef: Digest }>> {
  const { store, profiles, now } = ctx;

  const chain = await store.readChain(recordId);
  if (chain.length === 0) {
    throw new Error(
      `redeem: unknown recordId '${recordId}' — no such record (open() first); a recordId ` +
        'that resolves to no chain is a caller error, not a domain refusal (SPEC §8)',
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
    // Defensive, fail-closed: a coherent instance always resolves a record it opened.
    return refused('unknown-profile');
  }
  const legIndex = resolved.profile.legs.findIndex((l) => l.id === record.legId);
  if (legIndex < 0) {
    throw new Error(
      `redeem: persisted legId '${record.legId}' is absent from profile '${record.profileId}'`,
    );
  }
  const finalLeg = isFinalLeg(legIndex, resolved.profile.legs.length);

  // --- (3) effect seam declared? -------------------------------------------------------
  // §11.2's preamble: pure-capture profiles omit redemption entirely. The non-final-leg
  // refusal it also names is structural here — no multi-leg profile can be constructed
  // until the separation-of-duties build step, so `!finalLeg` is defensive, not reachable.
  if (!resolved.effectSeam || !finalLeg) {
    return refused('unredeemable-state');
  }

  // --- (4) state gate ------------------------------------------------------------------
  if (record.state === 'redeemed') {
    // At-most-once, the replay half — §11.2: "a replayed redemption of an already-redeemed
    // record refuses `already-redeemed`". Checked BEFORE correspondence: at-most-once
    // outranks mismatch reporting.
    return refused('already-redeemed');
  }
  if (record.state !== 'confirmed') {
    // open/refused/expired per §11.2's preamble; `redeeming`/`redemption-failed` have no
    // producer until the token and clock increments — this arm is defensive for them.
    return refused('unredeemable-state');
  }

  // --- (5) effect-content correspondence -----------------------------------------------
  // The same recompute path stage() bound and finalize rung (4) checks:
  // adopter canonicalizer -> library JCS -> digest, against the bound contentDigest.
  // §11.2: refuse "any mismatch with `effect-mismatch`".
  const recomputed = digest(canonicalize(resolved.canonicalizer(content)));
  if (recomputed !== record.contentDigest) {
    return refused('effect-mismatch');
  }

  // --- (6) append `confirmed → redeemed` -----------------------------------------------
  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('redeem: empty chain — the length check above holds');
  }
  const redeemedTransition: Transition = {
    recordId,
    seq: chain.length + 1,
    at: now().toISOString(),
    kind: 'redeemed',
    payload: { via: 'direct' },
    prevHash: transitionDigest(last),
  };
  // `redeemed` is terminal (§2) — the derivation, never a hardcoded false: THIS is the
  // release of the (profile, subject) pair C1 held while the record awaited redemption.
  // `dueAt` omitted clears any pending clock by §12's omission rule.
  const meta: AppendMeta = {
    nonTerminal: nonTerminal('redeemed', finalLeg, resolved.effectSeam),
  };

  const res = await store.appendTransition('confirmed', redeemedTransition, meta, tx);
  if (!res.appended) {
    // A racing writer moved the record between the read and the CAS; result-first,
    // nothing appended, the residual mapped to the seam's own domain code.
    return refused('unredeemable-state');
  }
  return ok({ recordId, state: 'redeemed', transitionRef: res.transitionDigest });
}
```

(One import-shape hedge: if `KernelContext`'s resolved-profile entry names the canonicalizer
differently than `resolved.canonicalizer` — check how `kernel/finalize.ts:160` reaches it
and use exactly that path.)

- [ ] **Step 6: The surface and the wiring**

In `packages/record/src/operator-surface.ts`, replace the `redeem` line:

```ts
  redeem(
    recordId: string,
    content: unknown,
    tx?: unknown, // SPEC §11.2's direct shape: the edge is enlisted in the host's transaction
  ): Promise<Outcome<{ recordId: string; state: 'redeemed'; transitionRef: Digest }>>;
```

and delete the old line's stub comment. In `packages/record/src/create.ts`, the operator
handle's `redeem` closure gains the `tx` pass-through
(`redeem: (recordId, content, tx) => redeemKernel(kernel, recordId, content, tx)` — match
the file's actual closure shape; open it and mirror the neighboring seams).

- [ ] **Step 7: The inversion-back in `terminality.test.ts`**

Find the test pinning the build-capability THROW on a confirmed effect-seam record (the
step-1 authorized inversion). Replace its assertion body: the call now SUCCEEDS
(`status: 'ok'`, state `'redeemed'`) — reuse the happy-path assertions, minimally. APPEND
to the test's existing inversion note (never rewrite it):

```
// INVERTED BACK, at the first step-3 increment: the loudness-throw this note argued for
// completed its purpose — the direct-shape redemption edge (SPEC §11.2) now exists, so the
// call this test pins succeeds instead of throwing. The original inversion's reasoning
// stands as history above; this appended note is the authorization for the second move,
// per the same discipline (argued in place, named in the commit body, never silent).
```

Also update the file's stale sentence about the held pair if one survives — the release now
exists (the sweep in Task 2 confirms; fix here only what this test file itself says).

- [ ] **Step 8: Green, gates, count**

Run: `pnpm test -- redeem` → all PASS. Then `pnpm test -- terminality` → PASS. Then the
full five gates. Expected totals: **370 tests / 32 files** (358 + 12 new in redeem.test.ts;
terminality edits replace, not add), zero skips, infos ≤ 13, no warnings. Confirm
`git diff --stat packages/record/src/store packages/record/src/chain/encoding.ts packages/record/src/jcs.ts packages/record/src/canonical.ts`
shows only files this task names (none of those).

- [ ] **Step 9: Commit**

```bash
git add packages/record/src packages/record/test/redeem.test.ts packages/record/test/terminality.test.ts
git commit -m "Redeem, the direct shape: verify first, correspond, release the pair

<one body line naming the inversion-back and its appended note>

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: The record — rows 9 and 15, the exit ruling, the sweep

**Files:**
- Modify: `docs/process/deferral-register.md` (row 9 deleted; row 15 added)
- Modify: `docs/process/implementation-status.md` (steps table ×2 rows; §11.2, §8, §4, §2, §5 rows; the still-outstanding list)
- Modify: `CLAUDE.md`, `README.md` (step 2 exited-with-deferral; step 3 started; the feature-guard paragraph)
- Modify: `packages/record/src/kernel/finalize.ts:~240`, `packages/record/src/kernel/open.ts:~137` (comment-only: the row-9 pointers)

**Interfaces:**
- Consumes: Task 1 landed. Produces: the increment's record.

- [ ] **Step 1: Register — row 9 out, row 15 in**

Delete row 9 (its trigger — "The build step that first ships the redemption edge … whichever
lands first releases the held pair" — fired; the edge exists and
`packages/record/test/redeem.test.ts`'s THE RELEASE test pins the release). Add row 15:

> | 15 | The server-SQL backing (SPEC §12: "a server-SQL store (production,
> multi-connection-safe)") is deferred, and this row carries the step-2 exit ruling that
> deferred it: step 2 exited at its fifth increment with two of §12's three reference
> backings (in-memory, embedded-SQL) held equivalent by the backing-parameterized
> conformance suite plus the cross-backing byte-identity test. The owner read SCOPING §7's
> "real SQL adapters" as the proof-structure goal this row now carries, not a gate on the
> build order, because: the conformance suite makes a later backing landable without
> touching feature code (its design purpose); a server-SQL backing needs a reachable
> server, which collides with the zero-skips discipline on machines without one; and
> SPEC §12's three-backing proof structure is a SHOULD. A third backing lands as: an
> adapter package or module wired to the suite by one caller file, a third leg in the
> cross-backing byte-identity test, and real multi-connection contention coverage that
> neither existing backing can express | The first multi-operator consumer, or the 0.1
> cut — whichever lands first | 2026-08-12 |

- [ ] **Step 2: implementation-status.md**

**Steps table:** step 2's cell gains a leading "**Exited (with a recorded deferral)** —"
replacing "**Started, not exited** —", keeps its five-increment history, and its tail
becomes "…the server-SQL adapter is deferred to register row 15, which carries the exit
ruling". Step 3's cell: "**Started, not exited** — the first increment landed §11.2's
direct shape: `redeem(recordId, content, tx?)` as a verify-first gate ladder,
`confirmed → redeemed { via: 'direct' }` enlisted through the `tx?` seam,
`effect-mismatch` and `already-redeemed` (never-appends), the at-most-once replay refusal,
and the release of the held `(profile, subject)` pair (register row 9, retired by
building); the token shape (`redeeming`, tokenDigest, presentation) and both redemption
clocks (`confirmToRedeem`, `redeemBound`, `redemption-timeout`) are the second and third
increments, not yet built".

**§11.2 row:** the Built column replaces its stub description with the ladder (mirror the
steps-table sentence, plus: correspondence via the stage-path re-digest; the §8 stub fixes —
unknown recordId throws, unknown profile fails closed, verify-first). The Not-built column
keeps: token shape, clocks, `redemption-timeout`, executor contract, at-most-once's
elapsed-`redeeming` half.

**§8 row:** thirteen codes in the union — eleven core plus the first two profile-conditional
(`effect-mismatch`, `already-redeemed`, never-appends, producers at the redeem seam);
`redemption-timeout` still absent with its producer. The stub-scoping sentence in the
"raised by review, not in register" list (the `redeem()` returns `unredeemable-state` on
three mis-scoped paths item) — mark it resolved by this increment's ladder.

**§4 row:** `redeemed` moves from "union members with no producer" to emitted kinds;
`redeeming`/`redemption-failed` stay unproduced.

**§2 row:** the three effect-seam states sentence updates — `redeemed` reachable, replay
folds it; the other two still throw.

**§5 row:** the "not universal" sentence about mutating seams — `redeem()` now verifies
first; `open()`'s en-passant half stays as the held finding (rewrite that sentence to name
only `open()`).

**Still outstanding:** row 9's bullet leaves; a row 15 bullet enters; row 10's bullet
gains "(the token increment is its trigger)".

- [ ] **Step 3: CLAUDE.md and README.md**

CLAUDE.md: the steps sentence — step 2 exited with the row-15 deferral (two backings held
equivalent), step 3 started (direct shape landed; token and clocks remain); "Seven of the
eight build-order steps remain" becomes "Six of the eight build-order steps remain
unstarted". The feature-guard paragraph's `redeem` sentences rewrite: `redeem` is no longer
"the eleventh governed capability [that] throws at the call seam" — the direct shape is
real; what remains governed at that seam is the token shape and the clocks, and the
held-pair paragraph's release claim updates (a confirmed effect-seam record is released by
the direct-shape redemption now; `seal()` remains a non-release path — keep that sentence
and its `seal.test.ts` pin reference). README: sibling edits in its own wrapping.

- [ ] **Step 4: The two kernel comment pointers**

`kernel/finalize.ts` ~line 240 ("deferral register row 9 — both redemption bounds are
inert in this build") — the bounds are STILL inert (clocks are increment C), but row 9 is
gone: repoint to "the redemption bounds remain inert until the clock increment — the
status doc's §9.1 row records it". `kernel/open.ts` ~line 137 (its row-9 reference) — same
treatment, matching its sentence's own shape. Comment-only edits; name them in the commit
body.

- [ ] **Step 5: The sweep — repo-root, both deixis directions**

```bash
git grep -lni -E "row 9|held pair|permanently held|awaiting redemption|throws at the call seam|this increment|started and has not exited" -- .
```

Classify every hit (live/normative/historical); `docs/concept/` never touched; dated
plans/specs are history. Specific checks: no live document says the pair is permanently
held or that `redeem()` throws on a confirmed effect-seam record; no live "row 9" pointer
survives outside historical documents; no bare "this increment" anywhere live; the
terminality/seal test comments that mention the held pair say something still true (the
seal-is-not-a-release pin REMAINS TRUE and its comments stay — do not over-correct them;
what changed is that a release path now exists, not that seal became one).

- [ ] **Step 6: Gates, commit**

Scan silent; all five green (370/32/0).

```bash
git add docs/process CLAUDE.md README.md packages/record/src/kernel/finalize.ts packages/record/src/kernel/open.ts
git commit -m "Record step 2's exit and step 3's opening: row 9 retires by building

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(Plus any file Step 5 corrected.)

---

### Task 3: Exit verification

**Files:** none — verification only. No edits, no commits, no fixes.

- [ ] **Step 1: Gates from a clean tree**

`git status --short` clean; all five gates. Expected: **370 tests / 32 files / 0 skips**,
infos ≤ 13, zero warning lines, scan silent.

- [ ] **Step 2: Freeze checks**

```bash
git log --oneline d47eb3f..HEAD -- packages/record/test/byte-stability.test.ts packages/record/src/chain/encoding.ts packages/record/src/jcs.ts packages/record/src/canonical.ts packages/record/src/store
```

Expected: nothing (the spec commit `d47eb3f` predates this increment's code; store and
encoding are untouched — `chain/replay.ts` is the one chain-directory file this increment
DOES touch, which is why it is absent from this pathspec and covered by review instead).

- [ ] **Step 3: The release, end to end, from the built tree**

Re-run the two decisive pins in isolation and quote their names in the report:
`pnpm test -- redeem` (THE RELEASE test and the ENLISTMENT rollback test green).

- [ ] **Step 4: The sweep, re-run**

Task 2 Step 5's command; survivors normative/historical only.

- [ ] **Step 5: Report**

Gate outputs, final counts, both commits, the sweep survivors, and the standing outstanding
item: the CI run (now spanning the engines floor claim AND this increment) still pends the
user's push. Do not mark done with anything red.
