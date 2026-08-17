# Recovery (`supersedes`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land SPEC §2's recovery linkage whole — `open()` verifies a `supersedes`
claim by replay pre-record and binds it into the genesis, the twenty-third code
`supersedes-unverified` covers every failure, the call-seam GOVERNED guard lifts — then
move the five SKETCHED tokens, record the three OPEN-QUESTIONS §3 decisions, and record
step 8 Started with the tail deferred.

**Architecture:** One new verification module (`kernel/supersedes.ts`, the
`kernel/prior-legs.ts` precedent) consumed by a new `open()` rung after the sequencing
rung; a two-field `SupersedesRef` identical on both sides of the seam; sequential
exclusivity (terminality is one-way — no new store constraint, `src/store/` frozen with
NO exception this increment); no en-passant resolution of the predecessor's clock
(seal's sweeps-first posture).

**Tech Stack:** TypeScript strict, vitest, Biome; pnpm workspace, Node >=22.16.

**Spec:** docs/superpowers/specs/2026-08-17-recovery-supersedes-design.md (80c4ca7,
plus the lapsed-open amendment in this plan's own commit). The rulings bind.

## Global Constraints

- Code + guard lift + tests: ONE commit (Task 1). The marker/OQ move is its OWN commit
  (Task 2). The record its own (Task 3).
- Five gates before every commit: `pnpm typecheck` · `pnpm lint` · `pnpm lint:strict` ·
  `pnpm test` (zero skips) · `node scripts/contract-scan.mjs` (silent, run LAST on the
  staged tree). PowerShell for pnpm (`$env:PATH = "$env:APPDATA\npm;$env:PATH"` first);
  git via the Bash tool; branch `main`.
- Frozen surfaces, NO exceptions this increment: `packages/record/test/byte-stability.test.ts`,
  `packages/record/src/chain/encoding.ts`, `packages/record/src/store/`. `docs/concept/`
  untouched by Tasks 1 and 3; Task 2 changes exactly the five tokens plus the three
  OPEN-QUESTIONS §3 decision tails and nothing else.
- SPEC-cited strings in code use an outer quote style needing NO escape sequences
  (template literals or double quotes) — the scan compares raw characters.
- Committed comments: explicit increment naming ("the step-8 recovery increment"),
  never bare "this increment"; ASCII apostrophes; no "Task N"/"slice"; every quoted
  phrase after `SPEC §N` verbatim whitespace-collapsed in SPEC.md.
- RED is EXECUTED; substitutions stated.
- Trailer on every commit: Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

---

### Task 1: The recovery rung — reference, verification, binding, code, tests

**Files:**
- Modify: `packages/record/src/types.ts` (`SupersedesRef`; `DecisionRecord.supersedes?`)
- Modify: `packages/record/src/config.ts` (`OpenOptions.supersedes?`; the trailing
  "stays GOVERNED at the call seam" comment block rewritten)
- Create: `packages/record/src/kernel/supersedes.ts`
- Modify: `packages/record/src/kernel/open.ts` (intake, the rung, the binding, the
  guard-arm delete)
- Modify: `packages/record/src/chain/replay.ts` (the `opened` fold copies
  `supersedes` present-iff-present — mirror `policyDigest`'s fold exactly)
- Modify: `packages/record/src/refusal-codes.ts` (twenty-third code)
- Test: create `packages/record/test/recovery.test.ts`; modify
  `packages/record/test/outcome-model.test.ts` + `packages/record/test/refusal-matrix.test.ts`
  (count pins 22 → 23 in one move — value, word, arithmetic — plus the new matrix
  section, `content-drift` shape, producer PRESENT-TENSE: open()'s recovery rung lands
  in this same commit, so "real as of the step-8 recovery increment" is correct from
  the first byte — no two-touch needed, deliberately unlike the step-7 codes)

**Interfaces:**
- Consumes: `verifyChain`/`replay` (chain/replay.js), `transitionDigest`
  (chain/encoding.js), `isFinalLeg`/`nonTerminal` (nonterminal.js),
  `ResolvedProfile` (create.js), the existing `open()` ladder.
- Produces: `SupersedesRef { recordId: string; chainHead: Digest }` (types.ts);
  `verifySupersedes(store, profiles, ref, subjectRef): Promise<SupersedesCheck>` and
  `validateSupersedesShape(value)` (kernel/supersedes.ts);
  `OpenOptions.supersedes?: SupersedesRef`; `DecisionRecord.supersedes?: SupersedesRef`.

- [ ] **Step 1: Write the failing tests**

Create `packages/record/test/recovery.test.ts`:

```ts
// @vidimera/record — recovery.test.ts (SPEC §2 "Recovery (`supersedes`)", the step-8
// recovery increment): open() verifies the host's terminal-predecessor claim by replay
// BEFORE the record exists and binds the verified reference into the genesis.
// Decisions of record pinned here: the dedicated never-append code
// `supersedes-unverified`; sequential exclusivity (verify-then-open — terminality is
// one-way); no en-passant resolution of the predecessor's clock (seal's sweeps-first
// posture); same subject required, any profile allowed; no back-reference ever
// appended to the predecessor.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create, createWithClock } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  captureProfile,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
  tamperNonLast,
  twoLegProfile,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const WRONG = { subject: 'week-1', total: 41 };
const SUBJ = 'subject:rec-1';
const HEAD64 = `sha256:${'9'.repeat(64)}`;

type Handles = ReturnType<typeof create>;

/** Drives a record to an APPENDED refused terminal state (content-drift listed
 * terminal), returning { recordId, chainHead }. */
async function refusedPredecessor(
  handles: Handles,
  profileId: string,
  subjectRef: string,
): Promise<{ recordId: string; chainHead: string }> {
  const recordId = await openRecord(handles, CONTENT, profileId, subjectRef);
  const out = await handles.operator.finalize(recordId, identity(), WRONG, facts());
  assert.equal(out.status, 'refused', 'fixture: the drifted finalize must refuse');
  const rec = await handles.operator.getRecord(recordId);
  assert.equal(rec?.state, 'refused', 'fixture: content-drift must be terminal here');
  const head = await handles.operator.chainHead(recordId);
  assert.ok(head !== null);
  return { recordId, chainHead: head };
}

/** captureProfile with content-drift terminal, under a given id. */
function terminalProfile(id: string) {
  return captureProfile({ id, terminalRefusals: ['content-drift'] });
}

test('happy path: a refused predecessor recovers — the genesis binds the verified reference and replay folds it', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([terminalProfile('test.rec.v1')], { store }));
  const pred = await refusedPredecessor(handles, 'test.rec.v1', SUBJ);

  const staged = await handles.agent.stage(CONTENT, 'test.rec.v1', SUBJ);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef, { supersedes: pred });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;

  const rec = await handles.operator.getRecord(opened.value.recordId);
  assert.deepEqual(rec?.supersedes, pred, 'replay folds the verified reference');
  const chain = await handles.operator.readChain(opened.value.recordId);
  const genesis = chain[0];
  assert.ok(genesis !== undefined);
  const payload = genesis.payload as Record<string, unknown>;
  assert.deepEqual(payload.supersedes, pred, 'the genesis snapshot carries it verbatim');
  assert.deepEqual(
    Object.keys(payload).sort(),
    ['contentDigest', 'legId', 'profileDigest', 'profileId', 'subjectRef', 'supersedes'],
    'present-iff-supplied: exactly the base key set plus supersedes',
  );
});

test('an expired predecessor and a terminal redeemed predecessor both qualify — terminality is THE condition', async () => {
  // Expired: clock-driven, swept via the finalize seam observing the lapse.
  const store = new MemoryStore();
  let now = new Date('2026-08-17T10:00:00.000Z');
  const handles = createWithClock(
    makeConfig([terminalProfile('test.rec.v1')], { store }),
    () => now,
  );
  const expiredId = await openRecord(handles, CONTENT, 'test.rec.v1', 'subject:rec-exp');
  now = new Date('2026-08-17T12:00:01.000Z');
  const lapse = await handles.operator.finalize(expiredId, identity(), CONTENT, facts());
  assert.equal(lapse.status, 'refused');
  if (lapse.status === 'refused') assert.equal(lapse.code, 'leg-expired');
  assert.equal((await handles.operator.getRecord(expiredId))?.state, 'expired');
  const expHead = await handles.operator.chainHead(expiredId);
  assert.ok(expHead !== null);
  const staged1 = await handles.agent.stage(CONTENT, 'test.rec.v1', 'subject:rec-exp');
  assert.equal(staged1.status, 'ok');
  if (staged1.status !== 'ok') return;
  const rec1 = await handles.operator.open(staged1.value.stagedRef, {
    supersedes: { recordId: expiredId, chainHead: expHead },
  });
  assert.equal(rec1.status, 'ok', 'an expired predecessor is terminal and recoverable');

  // Redeemed: the effect-seam happy path ends terminal via the release.
  const store2 = new MemoryStore();
  const h2 = create(
    makeConfig([effectSeamProfile({ id: 'test.rec.effect.v1' }), terminalProfile('test.rec.v1')], {
      store: store2,
    }),
  );
  const redeemedId = await openRecord(h2, CONTENT, 'test.rec.effect.v1', 'subject:rec-red');
  const fin = await h2.operator.finalize(redeemedId, identity(), CONTENT, facts());
  assert.equal(fin.status, 'ok');
  const red = await h2.operator.redeem(redeemedId, CONTENT);
  assert.equal(red.status, 'ok');
  const redHead = await h2.operator.chainHead(redeemedId);
  assert.ok(redHead !== null);
  const staged2 = await h2.agent.stage(CONTENT, 'test.rec.v1', 'subject:rec-red');
  assert.equal(staged2.status, 'ok');
  if (staged2.status !== 'ok') return;
  const rec2 = await h2.operator.open(staged2.value.stagedRef, {
    supersedes: { recordId: redeemedId, chainHead: redHead },
  });
  assert.equal(rec2.status, 'ok', 'a redeemed predecessor is terminal — the parenthetical is illustrative');
});

test('non-terminal predecessors refuse supersedes-unverified: open, LAPSED-open (no en passant), and effect-seam confirmed', async () => {
  const store = new MemoryStore();
  let now = new Date('2026-08-17T10:00:00.000Z');
  const handles = createWithClock(
    makeConfig([terminalProfile('test.rec.v1'), effectSeamProfile({ id: 'test.rec.effect.v1' })], {
      store,
    }),
    () => now,
  );

  async function expectUnverified(predId: string, subjectRef: string) {
    const head = await handles.operator.chainHead(predId);
    assert.ok(head !== null);
    const staged = await handles.agent.stage(CONTENT, 'test.rec.v1', subjectRef);
    assert.equal(staged.status, 'ok');
    if (staged.status !== 'ok') throw new Error('unreachable');
    const before = await handles.operator.readChain(predId);
    const out = await handles.operator.open(staged.value.stagedRef, {
      supersedes: { recordId: predId, chainHead: head },
    });
    assert.equal(out.status, 'refused');
    if (out.status === 'refused') assert.equal(out.code, 'supersedes-unverified');
    assert.deepEqual(
      await handles.operator.readChain(predId),
      before,
      'never-append AND no en-passant edge on the predecessor',
    );
  }

  const openId = await openRecord(handles, CONTENT, 'test.rec.v1', 'subject:rec-open');
  await expectUnverified(openId, 'subject:rec-open2');

  const lapsedId = await openRecord(handles, CONTENT, 'test.rec.v1', 'subject:rec-lapse');
  now = new Date('2026-08-17T12:00:01.000Z');
  // Verification is a pure read: the lapsed record still replays as open — the
  // operator sweeps first, then recovers (seal's own sweeps-first posture).
  await expectUnverified(lapsedId, 'subject:rec-lapse2');

  const confirmedId = await openRecord(handles, CONTENT, 'test.rec.effect.v1', 'subject:rec-eff');
  const fin = await handles.operator.finalize(confirmedId, identity(), CONTENT, facts());
  assert.equal(fin.status, 'ok');
  // A final-leg confirmed on an effect-seam profile is NON-terminal (awaits redemption).
  await expectUnverified(confirmedId, 'subject:rec-eff2');
});

test('a confirmed capture-terminal predecessor qualifies; under an UNRESOLVABLE profile it fails closed', async () => {
  const store = new MemoryStore();
  const handles = create(
    makeConfig([captureProfile({ id: 'test.rec.cap.v1' }), terminalProfile('test.rec.v1')], {
      store,
    }),
  );
  const capId = await openRecord(handles, CONTENT, 'test.rec.cap.v1', 'subject:rec-cap');
  const fin = await handles.operator.finalize(capId, identity(), CONTENT, facts());
  assert.equal(fin.status, 'ok');
  const head = await handles.operator.chainHead(capId);
  assert.ok(head !== null);

  const staged = await handles.agent.stage(CONTENT, 'test.rec.v1', 'subject:rec-cap');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const ok = await handles.operator.open(staged.value.stagedRef, {
    supersedes: { recordId: capId, chainHead: head },
  });
  assert.equal(ok.status, 'ok', 'single-leg capture confirmed is terminal — and cross-profile');

  // Same store, an instance that does NOT register the predecessor's profile: a
  // confirmed predecessor's terminality needs its profile — unprovable fails closed.
  const h2 = create(makeConfig([terminalProfile('test.rec.v1')], { store }));
  const staged2 = await h2.agent.stage(CONTENT, 'test.rec.v1', 'subject:rec-cap2');
  assert.equal(staged2.status, 'ok');
  if (staged2.status !== 'ok') return;
  const out = await h2.operator.open(staged2.value.stagedRef, {
    supersedes: { recordId: capId, chainHead: head },
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'supersedes-unverified');
});

test('claim failures refuse: head mismatch, absent predecessor, garbled chain, subject mismatch', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([terminalProfile('test.rec.v1')], { store }));
  const pred = await refusedPredecessor(handles, 'test.rec.v1', SUBJ);

  async function expectRefusal(supersedes: { recordId: string; chainHead: string }, subjectRef = SUBJ) {
    const staged = await handles.agent.stage(CONTENT, 'test.rec.v1', subjectRef);
    assert.equal(staged.status, 'ok');
    if (staged.status !== 'ok') throw new Error('unreachable');
    const out = await handles.operator.open(staged.value.stagedRef, { supersedes });
    assert.equal(out.status, 'refused');
    if (out.status === 'refused') assert.equal(out.code, 'supersedes-unverified');
  }

  await expectRefusal({ recordId: pred.recordId, chainHead: HEAD64 }); // head mismatch
  await expectRefusal({ recordId: 'rec-none', chainHead: pred.chainHead }); // absent
  // Subject mismatch: the predecessor decided SUBJ; recovering a DIFFERENT subject.
  await expectRefusal(pred, 'subject:rec-other');

  // Garbled: a tampered copy of the predecessor chain in its own store.
  const tampered = new MemoryStore();
  const chain = await handles.operator.readChain(pred.recordId);
  for (const [i, t] of tamperNonLast(chain).entries()) {
    await tampered.appendTransition(i === 0 ? null : 'open', t, { nonTerminal: i < chain.length - 1 });
  }
  const h2 = create(makeConfig([terminalProfile('test.rec.v1')], { store: tampered }));
  const staged = await h2.agent.stage(CONTENT, 'test.rec.v1', SUBJ);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await h2.operator.open(staged.value.stagedRef, { supersedes: pred });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'supersedes-unverified');
});

test('a chain of recovery is legal: a terminal recovery record is itself a valid predecessor', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([terminalProfile('test.rec.v1')], { store }));
  const first = await refusedPredecessor(handles, 'test.rec.v1', SUBJ);

  const staged = await handles.agent.stage(CONTENT, 'test.rec.v1', SUBJ);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const second = await handles.operator.open(staged.value.stagedRef, { supersedes: first });
  assert.equal(second.status, 'ok');
  if (second.status !== 'ok') return;
  // Drive the recovery record terminal too, then recover THAT.
  const out = await handles.operator.finalize(second.value.recordId, identity(), WRONG, facts());
  assert.equal(out.status, 'refused');
  const head = await handles.operator.chainHead(second.value.recordId);
  assert.ok(head !== null);
  const staged2 = await handles.agent.stage(CONTENT, 'test.rec.v1', SUBJ);
  assert.equal(staged2.status, 'ok');
  if (staged2.status !== 'ok') return;
  const third = await handles.operator.open(staged2.value.stagedRef, {
    supersedes: { recordId: second.value.recordId, chainHead: head },
  });
  assert.equal(third.status, 'ok', 'an earlier superseded attempt is a legal predecessor');
});

test('order: exclusivity is decided at the genesis append, AFTER verification — a live blocker still refuses record-exists', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([terminalProfile('test.rec.v1')], { store }));
  const pred = await refusedPredecessor(handles, 'test.rec.v1', SUBJ);
  // A second, LIVE record now holds the (profile, subject) pair:
  const blocker = await openRecord(handles, CONTENT, 'test.rec.v1', SUBJ);
  assert.ok(blocker.length > 0);
  // Recovery names a perfectly valid terminal predecessor — verification passes, the
  // genesis append hits the ordinary exclusivity constraint:
  const staged = await handles.agent.stage(CONTENT, 'test.rec.v1', SUBJ);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await handles.operator.open(staged.value.stagedRef, { supersedes: pred });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'record-exists');
});

test('order: the sequencing rung outranks the recovery rung — jointly failing refuses prior-leg-unverified', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile({ id: 'test.rec.two.v1' })], { store }));
  // A successor-leg open with BAD prior-leg references AND a bad supersedes claim:
  const staged = await handles.agent.stage(CONTENT, 'test.rec.two.v1', SUBJ, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: 'rec-none', chainHead: HEAD64 }],
    supersedes: { recordId: 'rec-none', chainHead: HEAD64 },
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') {
    assert.equal(out.code, 'prior-leg-unverified', 'the earlier pre-record rung wins');
  }
});

test('intake THROWS at argument depth on a malformed supersedes; the GOVERNED guard is gone; unknown keys still throw', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([terminalProfile('test.rec.v1')], { store }));
  const staged = await handles.agent.stage(CONTENT, 'test.rec.v1', SUBJ);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const ref = staged.value.stagedRef;

  for (const bad of [
    { recordId: '', chainHead: HEAD64 },
    { recordId: 'rec-1', chainHead: '' },
    { recordId: 'rec-1' },
    { recordId: 'rec-1', chainHead: HEAD64, extra: 'x' },
    'rec-1',
  ]) {
    await assert.rejects(
      handles.operator.open(ref, { supersedes: bad as never }),
      /supersedes/i,
    );
  }
  // The lifted guard: a WELL-FORMED supersedes no longer throws GOVERNED (it refuses
  // or succeeds on its merits — here the predecessor is absent, so it refuses):
  const out = await handles.operator.open(ref, {
    supersedes: { recordId: 'rec-none', chainHead: HEAD64 },
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'supersedes-unverified');
  // Genuinely unknown keys keep the generic GOVERNED throw:
  await assert.rejects(
    handles.operator.open(ref, { nonsense: true } as never),
    /GOVERNED|nonsense/,
  );
});
```

Count pins: `outcome-model.test.ts` and `refusal-matrix.test.ts` move 22 → 23 in one
edit each place the count appears (numeric literals, the word "twenty-two" →
"twenty-three", the matrix arithmetic string — append "+ supersedes-unverified
registry-only (production path: recovery.test.ts, the step-8 recovery increment)" and
re-sum to `= 23`). New matrix section for `supersedes-unverified`, `content-drift`
shape, its own `=== supersedes-unverified ===` header (one header per code — the
established convention), class `refusal`, in `NEVER_APPENDS` (pre-record: no record
exists to append to — quote §2's own sentence only if it resolves verbatim; otherwise
describe without quoting). Producer wording PRESENT-TENSE ("real as of the step-8
recovery increment — open()'s recovery rung, this same commit").

- [ ] **Step 2: Run to verify failure — EXECUTE it**

Run: `pnpm exec vitest run packages/record/test/recovery.test.ts`
Expected: FAIL — `open()` throws GOVERNED(supersedes) at the call seam;
`supersedes-unverified` is not in the union. Capture output.

- [ ] **Step 3: Implement**

1. `types.ts`:

```ts
/** SPEC §2's recovery claim and its recorded form — the SAME two-field shape on both
 * sides of the seam: open() verifies the host's claim by replay and binds it verbatim
 * (the library adds nothing, unlike RecordedPriorLegRef's library-added legId). Real
 * as of the step-8 recovery increment. */
export interface SupersedesRef {
  recordId: string;
  chainHead: Digest;
}
```

   `DecisionRecord` gains (beside `priorRecordRefs`):

```ts
  /** SPEC §2 recovery: the verified terminal-predecessor reference, folded from the
   * genesis snapshot — present iff the record was opened as a recovery. Deliberately
   * NOT projected into ReviewView (the priorRecordRefs precedent: linkage evidence
   * rides getRecord/replay, never the review projection). */
  supersedes?: SupersedesRef;
```

2. `config.ts`: `OpenOptions` gains
   `supersedes?: SupersedesRef` (import the type from types.js) with a doc comment
   citing SPEC §2 and the same-subject/any-profile tightening; the trailing
   "`supersedes` … remains GOVERNED at the call seam" comment block (~:408-410)
   rewrites to say all three documented open() keys are real, `supersedes` as of the
   step-8 recovery increment.

3. Create `kernel/supersedes.ts`:

```ts
// @vidimera/record — kernel/supersedes.ts: SPEC §2 "Recovery (`supersedes`)" — the
// verify-by-replay discipline at the recovery relation (the kernel/prior-legs.ts
// precedent). Landed at the step-8 recovery increment. Decisions of record, argued in
// docs/process/implementation-status.md and OPEN-QUESTIONS.md §3:
//  - the dedicated never-append code `supersedes-unverified` covers EVERY failure;
//  - exclusivity is SEQUENTIAL (verify-then-open): terminality is one-way in this
//    model, so a verified-terminal predecessor cannot be raced back to non-terminal;
//    the genesis append rides the ordinary constraint unchanged;
//  - verification is a PURE READ — no en-passant resolution of the predecessor's
//    clock (SPEC §4's seal posture, "the operator sweeps first"): a lapsed-but-unswept
//    open predecessor replays as open, non-terminal, and refuses;
//  - the same-subject/any-profile tightening: the predecessor decided THIS subject;
//    a revised-profile re-open (SPEC §10.3's "disposal-and-re-open recovery") stays
//    possible.

import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import type { ResolvedProfile } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Store } from '../store/store.js';
import type { SupersedesRef } from '../types.js';

export type SupersedesCheck = { ok: true; verified: SupersedesRef } | { ok: false };

/** Argument-depth shape validation (the established intake class): a malformed
 * supersedes claim is a caller error that throws before any chain loads. */
export function validateSupersedesShape(value: unknown): asserts value is SupersedesRef {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('open: supersedes must be a plain { recordId, chainHead } object (SPEC §2)');
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== 'recordId' && key !== 'chainHead') {
      throw new Error(`open: supersedes carries the unknown key '${key}' — the shape is exact (SPEC §2)`);
    }
  }
  if (typeof record.recordId !== 'string' || record.recordId.length === 0) {
    throw new Error('open: supersedes has a missing or empty recordId — a caller error (SPEC §2)');
  }
  if (typeof record.chainHead !== 'string' || record.chainHead.length === 0) {
    throw new Error('open: supersedes has a missing or empty chainHead — a caller error (SPEC §2)');
  }
}

/**
 * Verify the recovery claim: the predecessor's chain must exist, verify intact, match
 * the claimed head, be TERMINAL by the derived formula (SPEC §2), and have decided the
 * SAME subject. `confirmed` is the one state whose terminality needs the PREDECESSOR's
 * profile (final-leg + effect-seam judgment) — unresolvable there fails closed. Every
 * failure is one refusal, `supersedes-unverified`, mapped by the caller.
 */
export async function verifySupersedes(
  store: Store,
  profiles: Map<string, ResolvedProfile>,
  ref: SupersedesRef,
  subjectRef: string,
): Promise<SupersedesCheck> {
  const chain = await store.readChain(ref.recordId);
  if (chain.length === 0) return { ok: false }; // an absent claim cannot be replayed
  if (!verifyChain(chain).intact) return { ok: false };
  const last = chain.at(-1);
  if (last === undefined) return { ok: false };
  if (transitionDigest(last) !== ref.chainHead) return { ok: false };
  const record = replay(chain);
  if (record.subjectRef !== subjectRef) return { ok: false };
  if (record.state === 'open' || record.state === 'redeeming') return { ok: false };
  if (record.state === 'confirmed') {
    const resolved = profiles.get(record.profileId);
    if (resolved === undefined) return { ok: false }; // terminality unprovable — fail closed
    const legIndex = resolved.profile.legs.findIndex((l) => l.id === record.legId);
    if (legIndex === -1) return { ok: false };
    const finalLeg = isFinalLeg(legIndex, resolved.profile.legs.length);
    if (nonTerminal('confirmed', finalLeg, resolved.effectSeam)) return { ok: false };
  }
  // refused / expired / redeemed / redemption-failed: terminal regardless of profile.
  return { ok: true, verified: { recordId: ref.recordId, chainHead: ref.chainHead } };
}
```

4. `kernel/open.ts`:
   - the intake key loop gains `if (key === 'supersedes') continue; // REAL as of the step-8 recovery increment`,
     followed after the loop by
     `if (opts?.supersedes !== undefined) validateSupersedesShape(opts.supersedes);`
   - `openOptionMessage` DELETES its supersedes arm (the guard lifts with the behavior,
     this same commit); its doc comment rewrites — only the generic unknown-key message
     remains; simplify the helper accordingly (a single-message function or inline it,
     whichever reads cleaner — say which in the report).
   - after the `priorCheck` refusal, the new rung:

```ts
  // --- SPEC §2 recovery (the step-8 recovery increment): verify the supersedes claim
  // BEFORE the record exists — the same pre-record posture as the sequencing rung
  // above, and deliberately AFTER it: where both fail jointly, the prior-leg refusal
  // wins (pinned). Verification is a pure read of the predecessor (no en-passant
  // clock edge; SPEC §4's sweeps-first posture at seal is the precedent), and the
  // genesis append below rides the ordinary exclusivity constraint unchanged —
  // terminality is one-way, so the verified predecessor cannot be raced back.
  let supersedesCheck: SupersedesCheck | null = null;
  if (opts?.supersedes !== undefined) {
    supersedesCheck = await verifySupersedes(store, profiles, opts.supersedes, staged.subjectRef);
    if (!supersedesCheck.ok) {
      return refused('supersedes-unverified');
    }
  }
```

   - `openedPayload`'s inline type gains `supersedes?: SupersedesRef`, and after the
     prior-legs binding:

```ts
  if (supersedesCheck !== null && supersedesCheck.ok) {
    // SPEC §2: the verified reference, recorded in the recovering record's genesis
    // snapshot — present-iff-supplied, so a non-recovery open() stays byte-identical.
    openedPayload.supersedes = supersedesCheck.verified;
  }
```

5. `chain/replay.ts`: the local `OpenedPayload` interface gains
   `supersedes?: SupersedesRef`; the `opened` fold copies it into the record
   present-iff-present, mirroring `policyDigest`'s fold exactly (same conditional
   form, placed beside it).

6. `refusal-codes.ts`: `supersedes-unverified` joins the union (after
   `prior-leg-unverified`), `REGISTRY` as `'refusal'`, and `NEVER_APPENDS`; the
   never-appends doc sentence (~:151) extends to name it with `prior-leg-unverified`
   (pre-record — no record exists to refuse onto). Producer comment present-tense:
   open()'s recovery rung, the step-8 recovery increment, this same commit.

- [ ] **Step 4: Run tests, gates, commit**

`pnpm exec vitest run packages/record/test/recovery.test.ts packages/record/test/outcome-model.test.ts packages/record/test/refusal-matrix.test.ts`,
then the full suite and all five gates (scan LAST on the staged tree). Commit (Bash):

```bash
git add -A packages/record
git commit -m "Recovery: open() verifies the terminal predecessor and binds the link; the twenty-third code

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: The marker and the decisions — five tokens, three tails

**Files:**
- Modify: `docs/concept/SPEC.md` — EXACTLY four lines' tokens
- Modify: `docs/concept/CONTROLS.md` — EXACTLY one line's bare-word cell
- Modify: `docs/concept/OPEN-QUESTIONS.md` — EXACTLY three decision tails in §3

The standing never-edit rule on `docs/concept/` is LIFTED for exactly this commit and
exactly these edits (the user's step-8 brainstorm ruling: "Tokens move + OQ records
DECIDED"). It re-arms immediately after.

- [ ] **Step 1: The five tokens (locate by CONTENT; line numbers advisory)**

1. SPEC ~128: "(recovery of a terminal predecessor, below) **[SKETCHED]**." →
   `**[PROVEN]**.`
2. SPEC ~130: "**Recovery (`supersedes`) [SKETCHED].**" → `[PROVEN]` (plain brackets
   INSIDE the bold span — preserve exactly that form)
3. SPEC ~318 (§4 `opened` payload row): "(`supersedes?` **[SKETCHED]**, §2)" →
   `**[PROVEN]**`
4. SPEC ~564 (§9 `open()` bullet): "(**[SKETCHED]**, §2)" → `**[PROVEN]**`
5. CONTROLS ~46 (the Recovery row's maturity cell): bare `SKETCHED` → `PROVEN`

Do NOT touch any other SKETCHED token (live capture, freshness, AL2, the self-test
rows, the legends).

- [ ] **Step 2: The three OPEN-QUESTIONS §3 tails**

Append to each of §3's three bullets, in the document's own decision-of-record idiom
(one sentence each, exactly this text, reflowed to the file's line width):

1. (the refusal-shape bullet) ` **Decided (this build):** the dedicated code
   \`supersedes-unverified\` — never-append, pre-record; the \`prior-leg-unverified\`
   pattern at its own name.`
2. (the exclusivity bullet) ` **Decided (this build):** sequential — verify-then-open
   under the ordinary exclusivity constraint alone; terminality is one-way, so the
   verified predecessor cannot be raced back to non-terminal.`
3. (the back-reference bullet) ` **Decided (this build):** no — the forward link is
   the evidence; the predecessor's chain stays untouched.`

(The backslash-backtick sequences above are this plan's markdown escaping — write
plain backticks into the document.)

- [ ] **Step 3: Byte-verify, gates, commit**

`git diff -- docs/concept/` must show: four changed token pairs in SPEC.md, one in
CONTROLS.md, and ONLY the three tail insertions in OPEN-QUESTIONS.md §3 (no other
line). `grep -rn "SKETCHED" docs/concept/` afterwards must show NO supersedes/recovery
hits (the remaining SKETCHED tokens all belong to live capture, freshness, AL2, or the
self-test tier — list them in the report as proof). All five gates. Commit (Bash):

```bash
git add docs/concept/SPEC.md docs/concept/CONTROLS.md docs/concept/OPEN-QUESTIONS.md
git commit -m "Move the recovery marker and record the three decisions: five tokens, three tails

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: The record — step 8 starts, the tail deferred

**Files:**
- Modify: `docs/process/implementation-status.md`
- Modify: `docs/process/deferral-register.md` (ONE new row — the step-8 tail)
- Modify: `CLAUDE.md`, `README.md`
- Modify: stale comments the sweep finds

**Interfaces:** consumes Tasks 1-2; the spec's §6 ("The record") is the checklist —
verify every claim against CODE, never task reports.

- [ ] **Step 1: implementation-status.md**

Steps table → step 8 **Started** (first item, recovery, landed; the tail — live
capture/`reverify` (OQ §7), AL2 signing (OQ §1), the self-test tier (OQ §5) — deferred
to the new register row; step 8 does NOT exit, said plainly). §2 row: recovery built —
the verification conditions, the three OQ decisions with the doc's own wording, the
same-subject/any-profile tightening, the no-en-passant ruling, ReviewView deliberately
NOT gaining the field (the priorRecordRefs precedent). §8 row: twenty-three codes. §9
row: `open()`'s options bag whole — all three documented keys real; the LAST call-seam
GOVERNED guard lifted at the step-8 recovery increment (the construction-guarded count
UNCHANGED at 2 — `captureMode:'live'`, `freshness` — the distinction drawn explicitly).
The marker/OQ move recorded as executed with the five-token + three-tail enumeration.

- [ ] **Step 2: deferral-register.md + CLAUDE.md + README.md**

Register: ONE new row (next free number — READ the file first): the step-8 tail — live
capture/`reverify`, AL2 signing, self-test tier, in SCOPING-GUIDE §7's deliberate
order, each gated on its own OPEN-QUESTIONS enablement design (§7, §1, §5); re-arm
trigger: a future brainstorm picking up the next tail item. CLAUDE.md: step 8 started
at recovery; "one of the eight build-order steps remains unstarted (step 8)" is now
FALSE — rewrite to step 8 Started with the tail deferred (verify the steps table
first); the twenty-third code joins the narrative where counts appear. README: same
movement.

- [ ] **Step 3: The sweep — LAST, against the committed tree**

```bash
git grep -nE 'supersedes|recovery|supersedes-unverified|twenty-two|step 8|unstarted|remains GOVERNED at the call seam|landing|will make|not yet|this increment|later increment' -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
git grep -nE 'twenty-three|23|SKETCHED|Started|have none|no producer|nothing mints|still absent' -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis' -- '*.md'
```

(Single-quoted patterns; the second grep is markdown-scoped — lesson 21's
absence-vocabulary arm.) Judge EVERY hit; THE REPORT SHOWS HIT-COUNT == VERDICT-COUNT
from THIS final run.

- [ ] **Step 4: Verify quotes, gates, commit**

Hand-verify quoted SPEC phrases in touched markdown whitespace-collapsed. Five gates.
Commit (Bash):

```bash
git add -A
git commit -m "Record step 8 started: recovery landed, the tail deferred by name

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Exit verification

**Files:** none modified (BLOCKED with evidence if a gate fails).

- [ ] **Step 1: Clean-tree gates**

Fresh PowerShell (`$env:PATH = "$env:APPDATA\npm;$env:PATH"`), `git status --porcelain`
empty, branch `main`, then ALL FIVE gates by name — typecheck, lint, lint:strict, test
(exact counts, zero skips), contract-scan — one line each with exit codes.

- [ ] **Step 2: Freeze verification (against the spec commit 80c4ca7)**

```bash
git diff 80c4ca7..HEAD -- packages/record/test/byte-stability.test.ts   # MUST be empty
git diff 80c4ca7..HEAD -- packages/record/src/chain/encoding.ts          # MUST be empty
git diff 80c4ca7..HEAD -- packages/record/src/store/                     # MUST be empty (no exception this increment)
git diff 80c4ca7..HEAD -- docs/concept/                                  # EXACTLY: 5 token pairs + the 3 OQ §3 tails
```

Any other content ⇒ BLOCKED with the diff stat.

- [ ] **Step 3: Report**

Commit list (`git log --oneline 80c4ca7..HEAD`), exact counts, register rows live
(READ the file — the new tail row included), step-8 steps-table cell, a
`grep -rn "SKETCHED" docs/concept/ | grep -ic "supersedes\|recovery"` zero-line, and
`git status -sb`'s ahead count for the user-gated push.
