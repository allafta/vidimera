# Findings Write Side Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land SPEC §10.2's write half — the `raiseFinding`/`acknowledge` seams,
finalize's rung (5.7) ack-coverage gate, and the `ackMode`/`requiredAcks` lift — in one
atomic commit; then execute the marker ruling (eight `[DESIGNED]` → `[PROVEN]` tokens)
and record step 7's exit.

**Architecture:** One new seam module (`kernel/findings-seams.ts`, the
several-seams-one-prologue `kernel/redeem.ts` precedent) minting the payloads the read
side already folds; rung (5.7) consuming the read side's `findingCoverage` derivation
with no new finalize inputs; `validateFindingsFlow` (config.ts) replacing the two
GOVERNED throws with the settled fail-closed class plus §10.2's both-or-neither rule.

**Tech Stack:** TypeScript strict, vitest, Biome; pnpm workspace, Node >=22.16.

**Spec:** docs/superpowers/specs/2026-08-17-findings-write-side-design.md (commit
a044b4f). The spec's "Rulings taken" section binds.

## Global Constraints

- Seams + gate + lift + their tests + every comment finalization: ONE commit (Task 1).
  The marker move is its OWN commit (Task 2). The record is its own (Task 3).
- Five gates before every commit: `pnpm typecheck` · `pnpm lint` · `pnpm lint:strict` ·
  `pnpm test` (zero skips) · `node scripts/contract-scan.mjs` (silent). PowerShell for
  pnpm with `$env:PATH = "$env:APPDATA\npm;$env:PATH"` first; git via the Bash tool;
  branch must be `main`.
- Frozen surfaces: `packages/record/test/byte-stability.test.ts` and
  `packages/record/src/chain/encoding.ts` — untouched, no exceptions.
  `packages/record/src/store/` — untouched EXCEPT one surgical comment-truth edit
  Task 1 is explicitly authorized to make: `semantics.ts`'s parenthetical
  "(GOVERNED annotations SPEC §10.2 defines, not emitted by this build's kernel)"
  (src/store/semantics.ts:48-49), which the seams falsify. NOTHING else under
  src/store/ may change, and Task 4 verifies the src/store/ diff is exactly that
  comment. `docs/concept/` — untouched by Tasks 1 and 3; Task 2 changes EXACTLY eight
  tokens and nothing else.
- Committed TS comments: no "slice"/"design"/"Task N"/bare hex; explicit increment
  naming ("the second step-7 increment"), never bare "this increment"; ASCII
  apostrophes; a quoted phrase after `SPEC §N` must occur verbatim in SPEC.md
  (whitespace-collapsed, backticks ignored) — the contract scan resolves these in code.
- Two-touch second touch: Task 1 FINALIZES every "landing in the second step-7
  increment"-class comment the first increment wrote (the enumerated checklist in
  Task 1 Step 4); none may survive Task 1's commit in future tense.
- RED is EXECUTED (capture output); substitutions stated in the report.
- Commit trailer on every commit: Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

---

### Task 1: The atomic commit — lift, seams, gate, tests, comment finalizations

**Files:**
- Modify: `packages/record/src/config.ts` (remove two GOVERNED throws; add
  `validateFindingsFlow`; call it in the per-leg validation sequence beside
  `validateRequiredConsultations`)
- Create: `packages/record/src/kernel/findings-seams.ts`
- Modify: `packages/record/src/kernel/finalize.ts` (rung (5.7); header rung list)
- Modify: `packages/record/src/create.ts` (Kernel type + makeKernel: two closures)
- Modify: `packages/record/src/operator-surface.ts` (interface + freeze list)
- Modify (comment finalizations only): `packages/record/src/types.ts`,
  `packages/record/src/chain/replay.ts`, `packages/record/src/kernel/findings.ts`,
  `packages/record/src/refusal-codes.ts`, `packages/record/src/store/semantics.ts`
  (the ONE authorized line)
- Test: create `packages/record/test/findings-seams.test.ts`; modify
  `packages/record/test/findings.test.ts` (append the gate section — the refusal
  matrix already names this file as both codes' production path),
  `packages/record/test/finalize-check-order.test.ts` (ten-rung header + the new
  adjacent pair), `packages/record/test/construction-validation.test.ts` (GOVERNED
  tests → validateFindingsFlow tests; guard-sweep swap),
  `packages/record/test/refusal-matrix.test.ts` (banner tense),
  `packages/record/test/conformance/store-conformance.ts` (two
  `note: 'not emitted by this kernel build'` strings)

**Interfaces:**
- Consumes: `findingCoverage`/`ackCounts` (`kernel/findings.ts`);
  `FindingRaisedPayload`/`AcknowledgedPayload`/`RecordedFinding` (types.ts);
  `resolveDueClock`/`expiryDeadlineMs` (`kernel/expiry.ts`); `appendChainCompromise` +
  `isValidIdentity` (exports of `kernel/finalize.ts`); `refuseMaybeAppend` stays
  finalize-internal (the seams use `refused` from outcome.ts — their two codes are
  never-append/en-passant, not terminalRefusals-consulting).
- Produces: `OperatorSurface.raiseFinding(recordId, finding, identity)` and
  `.acknowledge(recordId, ack, identity)`, both
  `Promise<Outcome<{ recordId: string; state: 'open'; transitionRef: Digest }>>`, with
  `FindingInput = { findingId: string; kind: string; findingDigest: string;
  magnitude?: string }` and `AckInput = { findingId: string; findingDigest: string;
  magnitude?: string }` exported from `kernel/findings-seams.ts`.

- [ ] **Step 1: Write the failing tests**

Create `packages/record/test/findings-seams.test.ts`:

```ts
// @vidimera/record — findings-seams.test.ts (SPEC §10.2 "The seams (record-then-gate)",
// the second step-7 increment): raiseFinding/acknowledge, the two operator-only calls
// that append the only mid-lifecycle transitions between `opened` and the decision.
// Gate/coverage production paths live in findings.test.ts (where the refusal matrix
// points); THIS file pins the seams: intake throws, the prologue ladder, payload
// minting, the dueAt re-supply, and the non-declaring byte-identity throw.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConfirmProfile, LegSpec } from '../src/config.js';
import { create, createWithClock } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  captureProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
  tamperNonLast,
} from './helpers/profiles.js';

const SUBJECT = 'subject:seam-1';
const CONTENT = { subject: 'week-1', total: 40 };
const D1 = `sha256:${'1'.repeat(64)}`;
const D2 = `sha256:${'2'.repeat(64)}`;
const RAISER = { principal: 'checker:1', authority: 'mtls:checker' };

/** captureProfile with the leg's findings flow declared (both-or-neither pair). */
function flowProfile(extra?: Partial<LegSpec>): ConfirmProfile {
  const p = captureProfile({ id: 'test.flow.v1' });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  p.legs[0] = { ...leg, ackMode: 'any' as const, requiredAcks: ['variance'], ...extra };
  return p;
}

test('raiseFinding appends: payload key-set exact, at library-stamped, raiser = the identity argument, record stays open', async () => {
  const store = new MemoryStore();
  const t0 = new Date('2026-08-17T10:00:00.000Z');
  const handles = createWithClock(makeConfig([flowProfile()], { store }), () => t0);
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);

  const out = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(out.status, 'ok');
  if (out.status !== 'ok') return;
  assert.equal(out.value.state, 'open');

  const chain = await handles.operator.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'finding-raised');
  assert.equal(last.at, t0.toISOString(), 'the library stamps at — never a host time');
  assert.deepEqual(
    Object.keys(last.payload as Record<string, unknown>).sort(),
    ['findingDigest', 'findingId', 'kind', 'raiser'],
    'magnitude absent from the input is absent from the payload (present-iff-present)',
  );
  assert.deepEqual((last.payload as { raiser: unknown }).raiser, RAISER);

  const rec = await handles.operator.getRecord(recordId);
  assert.equal(rec?.state, 'open');
  assert.equal(rec?.findings?.[0]?.findingId, 'f-1');
});

test('a re-raise updates the version through the seam; a kind-changing re-raise THROWS', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);

  await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1, magnitude: '250 SEK' },
    RAISER,
  );
  const upd = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D2 },
    identity(),
  );
  assert.equal(upd.status, 'ok');
  const rec = await handles.operator.getRecord(recordId);
  const f1 = rec?.findings?.[0];
  assert.equal(f1?.findingDigest, D2, 'current version moved');
  assert.equal(f1 !== undefined && 'magnitude' in f1, false, 'update without magnitude clears it');

  await assert.rejects(
    handles.operator.raiseFinding(
      recordId,
      { findingId: 'f-1', kind: 'CHANGED', findingDigest: D2 },
      RAISER,
    ),
    /kind/i,
  );
});

test('acknowledge appends (stale digests included — fidelity); an ack to an absent findingId THROWS', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);
  await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D2 },
    RAISER,
  );

  const stale = await handles.operator.acknowledge(
    recordId,
    { findingId: 'f-1', findingDigest: D1 },
    identity(),
  );
  assert.equal(stale.status, 'ok', 'a stale digest is recorded anyway and never counts');
  const rec = await handles.operator.getRecord(recordId);
  assert.equal(rec?.findings?.[0]?.acks.length, 1);
  assert.equal(rec?.findings?.[0]?.acks[0]?.findingDigest, D1, 'recorded as supplied — visible');

  await assert.rejects(
    handles.operator.acknowledge(
      recordId,
      { findingId: 'f-none', findingDigest: D1 },
      identity(),
    ),
    /findingId|finding/i,
  );
});

test('intake THROWS at argument depth: malformed finding, malformed ack, malformed identity, unknown key', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);

  const bad = [
    { findingId: '', kind: 'variance', findingDigest: D1 },
    { findingId: 'f-1', kind: '', findingDigest: D1 },
    { findingId: 'f-1', kind: 'variance', findingDigest: '' },
    { findingId: 'f-1', kind: 'variance', findingDigest: D1, magnitude: 7 },
    { findingId: 'f-1', kind: 'variance', findingDigest: D1, extra: 'x' },
  ];
  for (const finding of bad) {
    await assert.rejects(
      handles.operator.raiseFinding(recordId, finding as never, RAISER),
      /finding|magnitude|key/i,
    );
  }
  await assert.rejects(
    handles.operator.acknowledge(
      recordId,
      { findingId: 'f-1', findingDigest: D1, kind: 'x' } as never,
      identity(),
    ),
    /key|ack/i,
  );
  await assert.rejects(
    handles.operator.raiseFinding(
      recordId,
      { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
      { principal: '', authority: 'mtls:x' },
    ),
    /identity|principal/i,
  );
  // Nothing appended by any throw above:
  const chain = await handles.operator.readChain(recordId);
  assert.equal(chain.length, 1, 'intake throws are pre-record: the chain is untouched');
});

test('a NON-declaring leg THROWS at both seams and its chain stays byte-identical (no append)', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', SUBJECT);
  const before = await handles.operator.readChain(recordId);

  await assert.rejects(
    handles.operator.raiseFinding(
      recordId,
      { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
      RAISER,
    ),
    /findings flow|declar/i,
  );
  await assert.rejects(
    handles.operator.acknowledge(recordId, { findingId: 'f-1', findingDigest: D1 }, identity()),
    /findings flow|declar/i,
  );
  const after = await handles.operator.readChain(recordId);
  assert.deepEqual(after, before, 'SPEC §10.2: byte-identical to a pre-findings implementation');
});

test('the prologue: chain-compromise outranks everything; expired refuses leg-expired; confirmed refuses record-not-open (never-append)', async () => {
  // Tampered chain -> chain-compromise (both seams). Seed a store with a tampered copy
  // of a valid chain (the seal/finalize compromise-fixture pattern).
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);
  const good = await handles.operator.readChain(recordId);
  const tamperedStore = new MemoryStore();
  for (const [i, t] of tamperNonLast(good).entries()) {
    await tamperedStore.appendTransition(i === 0 ? null : 'open', t, { nonTerminal: true });
  }
  const h2 = create(makeConfig([flowProfile()], { store: tamperedStore }));
  const raise = await h2.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(raise.status, 'refused');
  if (raise.status === 'refused') assert.equal(raise.code, 'chain-compromise');
  const ackOut = await h2.operator.acknowledge(
    recordId,
    { findingId: 'f-1', findingDigest: D1 },
    identity(),
  );
  assert.equal(ackOut.status, 'refused');
  if (ackOut.status === 'refused') assert.equal(ackOut.code, 'chain-compromise');

  // Confirmed -> record-not-open, never-append. (flowProfile declares requiredAcks
  // ['variance'] and no finding was raised: the coverage gate passes vacuously — the
  // TRUE-vacuous pin rides here.)
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const lenBefore = (await handles.operator.readChain(recordId)).length;
  const late = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(late.status, 'refused');
  if (late.status === 'refused') assert.equal(late.code, 'record-not-open');
  assert.equal((await handles.operator.readChain(recordId)).length, lenBefore, 'never-append');
});

test('a due-open record: the seam appends the expired edge en passant and refuses leg-expired', async () => {
  const store = new MemoryStore();
  let now = new Date('2026-08-17T10:00:00.000Z');
  const handles = createWithClock(
    makeConfig([flowProfile()], { store }),
    () => now,
  );
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);
  now = new Date('2026-08-17T12:00:01.000Z'); // past the helper's default ttl
  const out = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'leg-expired');
  const rec = await handles.operator.getRecord(recordId);
  assert.equal(rec?.state, 'expired', 'the en-passant edge landed');

  // And an ALREADY-expired record refuses leg-expired with no further append:
  const lenAfter = (await handles.operator.readChain(recordId)).length;
  const again = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-2', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(again.status, 'refused');
  if (again.status === 'refused') assert.equal(again.code, 'leg-expired');
  assert.equal((await handles.operator.readChain(recordId)).length, lenAfter);
});

test('the dueAt re-supply pin: a raised-on record still lists as due at its open deadline', async () => {
  const store = new MemoryStore();
  let now = new Date('2026-08-17T10:00:00.000Z');
  const handles = createWithClock(makeConfig([flowProfile()], { store }), () => now);
  const recordId = await openRecord(handles, CONTENT, 'test.flow.v1', SUBJECT);

  now = new Date('2026-08-17T10:05:00.000Z'); // open, not due
  const out = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(out.status, 'ok');

  now = new Date('2026-08-17T12:00:01.000Z'); // past the open deadline
  const due = await handles.operator.listDue();
  assert.ok(
    due.includes(recordId),
    'SPEC §12: "present sets the record\'s pending-clock column, absent clears it" — the ' +
      'seam re-supplied dueAt, so the sweep still sees the open window',
  );
});
```

Append to `packages/record/test/findings.test.ts` (the gate section — this file is
where the refusal matrix points for both codes' production paths). Reuse the file's
existing imports where present; add `create`/`createWithClock`, `MemoryStore`,
`captureProfile`/`makeConfig`/`identity`/`facts`/`openRecord` imports as needed, and a
local `flowProfile` identical to findings-seams.test.ts's (two test files, two small
local fixtures — the established per-file-fixture convention):

```ts
// === the coverage gate: rung (5.7) (SPEC §10.2; the second step-7 increment) ===

test('ack-missing: a raised required-kind finding with zero acks refuses at finalize; an ack re-arms it', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT2, 'test.flow.v1', 'subject:gate-a');
  await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  const out = await handles.operator.finalize(recordId, identity(), CONTENT2, facts());
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'ack-missing');
  assert.equal((await handles.operator.getRecord(recordId))?.state, 'open', 'open by default');

  await handles.operator.acknowledge(recordId, { findingId: 'f-1', findingDigest: D1 }, identity());
  const retry = await handles.operator.finalize(recordId, identity(), CONTENT2, facts());
  assert.equal(retry.status, 'ok', 'a counting ack re-arms the same open record');
});

test('ack-stale: stale digest, magnitude mismatch, and an ackMode-violating ack each refuse', async () => {
  for (const [ack, mode] of [
    [{ findingId: 'f-1', findingDigest: D1 }, 'any'], // stale digest (current is D2)
    [{ findingId: 'f-1', findingDigest: D2 }, 'any'], // finding has magnitude, ack has none
    [{ findingId: 'f-1', findingDigest: D2, magnitude: '250 SEK' }, 'counterparty'], // acker below = raiser
  ] as const) {
    const store = new MemoryStore();
    const handles = create(
      makeConfig([flowProfile({ ackMode: mode as 'any' | 'counterparty' })], { store }),
    );
    const recordId = await openRecord(handles, CONTENT2, 'test.flow.v1', 'subject:gate-b');
    await handles.operator.raiseFinding(
      recordId,
      { findingId: 'f-1', kind: 'variance', findingDigest: D2, magnitude: '250 SEK' },
      RAISER,
    );
    const acker = mode === 'counterparty' ? RAISER : identity();
    await handles.operator.acknowledge(recordId, ack as never, acker);
    const out = await handles.operator.finalize(recordId, identity(), CONTENT2, facts());
    assert.equal(out.status, 'refused');
    if (out.status === 'refused') assert.equal(out.code, 'ack-stale');
  }
});

test('vacuous pass and non-required kinds: zero raised required findings pass; a non-required kind never gates', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT2, 'test.flow.v1', 'subject:gate-c');
  await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-note', kind: 'note', findingDigest: D1 },
    RAISER,
  );
  const out = await handles.operator.finalize(recordId, identity(), CONTENT2, facts());
  assert.equal(out.status, 'ok', 'requiredAcks gates raised findings of REQUIRED kinds only');
});

test('first trip in first-raise order: the FIRST non-covered required finding names the code', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT2, 'test.flow.v1', 'subject:gate-d');
  await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  ); // will be ack-missing
  await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-2', kind: 'variance', findingDigest: D2 },
    RAISER,
  );
  await handles.operator.acknowledge(recordId, { findingId: 'f-2', findingDigest: D1 }, identity()); // stale
  const out = await handles.operator.finalize(recordId, identity(), CONTENT2, facts());
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'ack-missing', "f-1's code, not f-2's ack-stale");
});

test('terminalRefusals can end the leg on ack-missing: the refusal appends and the record refuses', async () => {
  const store = new MemoryStore();
  const handles = create(
    makeConfig([flowProfile({ terminalRefusals: ['ack-missing'] })], { store }),
  );
  const recordId = await openRecord(handles, CONTENT2, 'test.flow.v1', 'subject:gate-e');
  await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  const out = await handles.operator.finalize(recordId, identity(), CONTENT2, facts());
  assert.equal(out.status, 'refused');
  const rec = await handles.operator.getRecord(recordId);
  assert.equal(rec?.state, 'refused');
  assert.equal(rec?.refusalCode, 'ack-missing');
});
```

(`CONTENT2`, `D1`, `D2`, `RAISER` — reuse the file's existing constants where they
exist; `findings.test.ts` already defines `D1`/`D2`/`RAISER`, and its `SUBJECT`
constant is per-record there, so the gate tests pass distinct subjects inline. Add a
`CONTENT2` constant `{ subject: 'week-2', total: 41 }` if no content constant exists.)

Add to `packages/record/test/construction-validation.test.ts` (replacing the two
GOVERNED tests for `ackMode`/`requiredAcks`, which now construct):

```ts
// === validateFindingsFlow: SPEC §10.2's both-or-neither + the settled class (second
// step-7 increment — the ackMode/requiredAcks lift) ===

test('findings flow: either field alone is a construction error, both-or-neither', () => {
  assert.throws(() => create(cfgWithLeg({ ackMode: 'any' })), /both-or-neither|requiredAcks/i);
  assert.throws(() => create(cfgWithLeg({ requiredAcks: ['variance'] })), /both-or-neither|ackMode/i);
});

test('findings flow: the settled class on requiredAcks — non-empty, distinct, non-empty strings; facts is LEGAL (own namespace)', () => {
  assert.throws(() => create(cfgWithLeg({ ackMode: 'any', requiredAcks: [] })), /empty/i);
  assert.throws(
    () => create(cfgWithLeg({ ackMode: 'any', requiredAcks: ['x', 'x'] })),
    /distinct|duplicate/i,
  );
  assert.throws(() => create(cfgWithLeg({ ackMode: 'any', requiredAcks: [''] })), /empty/i);
  // Finding kinds are their own namespace — SPEC §10.2: "the reserved consultation
  // kinds do not apply to them". 'facts' as a requiredAcks kind constructs cleanly:
  assert.doesNotThrow(() => create(cfgWithLeg({ ackMode: 'any', requiredAcks: ['facts'] })));
  assert.doesNotThrow(() =>
    create(cfgWithLeg({ ackMode: 'counterparty', requiredAcks: ['variance', 'note'] })),
  );
});
```

(`cfgWithLeg(extra)` — the file already builds single-leg configs for the other settled
classes; reuse its existing builder, whatever its name is there, rather than adding a
duplicate. The guard-sweep-total test at ~line 356 currently declares `ackMode` as one
of its two governed features — a dead alternative once the guard lifts: swap that
declaration to `freshness`, keep `captureMode: 'live'` as the other, and rewrite its
comment (the "(findings/acknowledgments, SPEC §10.2, not yet built)" clause) to name
the two that remain governed.)

Add to `packages/record/test/finalize-check-order.test.ts`: one new adjacent-pair test
(5.5)→(5.7) — a declaring leg with BOTH `requiredConsultations: ['risk-check']` and the
findings flow, a record carrying an uncovered required finding, finalize called with a
`fail`-verdict risk-check consultation — asserts `consultation-failed` (the earlier
rung wins). Update the header: "nine-rung" → ten-rung; the rung enumeration gains
(5.7); the (5.5)→(6) unreachability note re-targets to (5.7)→(6) (the argument
transfers verbatim: rung (6)'s batch conflict is not a caller-constructible refusal
code); the corpus total moves 12 → 13 wherever the file states it.

- [ ] **Step 2: Run to verify failure — EXECUTE it**

Run: `pnpm exec vitest run packages/record/test/findings-seams.test.ts`
Expected: FAIL — `flowProfile` throws GOVERNED(ackMode) at construction;
`raiseFinding` is not a function. Capture output.

- [ ] **Step 3: Implement**

1. `config.ts` — delete the `ackMode` and `requiredAcks` GOVERNED throws from
   `validateLeg` (keep `freshness`'s); add beside `validateRequiredConsultations`:

```ts
/**
 * SPEC §10.2's findings-flow construction rules (the second step-7 increment — the
 * ackMode/requiredAcks lift): the pair is declared "both-or-neither; either alone is a
 * construction error", and `requiredAcks` takes the settled fail-closed class
 * (`validateSodShape`/`validateRequiredConsultations`'s): non-empty, pairwise
 * distinct, every kind a non-empty string. NO reserved-kind arm, deliberately —
 * finding kinds are their own namespace (SPEC §10.2: "the reserved consultation kinds
 * do not apply to them"), so 'facts' is a LEGAL requiredAcks kind.
 */
function validateFindingsFlow(profile: ConfirmProfile, leg: LegSpec): void {
  const hasMode = leg.ackMode !== undefined;
  const hasAcks = leg.requiredAcks !== undefined;
  if (hasMode !== hasAcks) {
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' declares ` +
        `${hasMode ? 'ackMode without requiredAcks' : 'requiredAcks without ackMode'} — ` +
        'SPEC §10.2: the findings flow is declared both-or-neither; either alone is a construction error',
    );
  }
  if (!hasAcks) return;
  const kinds = leg.requiredAcks as string[];
  if (kinds.length === 0) {
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' declares requiredAcks as an empty array — ` +
        'the control must require at least one kind (non-empty by the fail-closed ruling)',
    );
  }
  const seen = new Set<string>();
  for (const kind of kinds) {
    if (typeof kind !== 'string' || kind.length === 0) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' declares a missing or empty finding kind in requiredAcks`,
      );
    }
    if (seen.has(kind)) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' requires acknowledgment of '${kind}' twice — ` +
          'entries must be pairwise distinct (duplicate)',
      );
    }
    seen.add(kind);
  }
}
```

   Call it wherever the other per-leg structural validators run (the same loop that
   calls `validateRequiredConsultations`), and update `validateProfile`'s header
   comment: the guarded count moves — state it as "two per-leg/profile fields remain
   governed (`captureMode:'live'`, `freshness`); `ackMode`/`requiredAcks` lifted at the
   second step-7 increment in the same commit as the seams and rung (5.7)".

2. Create `packages/record/src/kernel/findings-seams.ts`:

```ts
// @vidimera/record — kernel/findings-seams.ts: the two operator-only findings seams
// (SPEC §10.2 "The seams (record-then-gate)": "Two operator-only calls append
// mid-lifecycle transitions — the only appends between `opened` and the decision").
// Landed at the second step-7 increment, in the same commit as finalize's rung (5.7)
// and the ackMode/requiredAcks construction lift — the seams mint byte-identically the
// payloads the first step-7 increment's replay folds.
//
// The shared ladder (the several-seams-one-prologue shape kernel/redeem.ts set):
//   (0) argument intake THROWS (the validateConsultations class) before the chain loads
//   (1) chain-verify FIRST            -> chain-compromise (appendChainCompromise)
//   (2) profile/leg resolution        -> unknown-profile; a persisted legId miss THROWS
//   (2.5) declaring check             -> THROW: SPEC §10.2, "both seams throw on a
//         record whose resolved leg declares no findings flow — so a non-declaring
//         profile can never acquire finding/ack transitions, and its chains are
//         byte-identical to a pre-findings implementation"
//   (3) state/expiry (en passant)     -> leg-expired / record-not-open (never-append)
//   (4) seam-specific semantic check  -> THROW (kind mutation; ack to absent findingId)
//   (5) append, CAS target 'open'     -> a lost CAS refuses record-not-open
//
// The append's meta RE-SUPPLIES the open window's dueAt (SPEC §12: "present sets the
// record's pending-clock column, absent clears it") — a mid-lifecycle append that
// omitted it would disarm the sweep's clock for this record. `expiry:'none'` omits it,
// clearing nothing because nothing was set.

import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import type { KernelContext, ResolvedProfile } from '../create.js';
import type { LegSpec } from '../config.js';
import type { Outcome } from '../outcome.js';
import { ok, refused } from '../outcome.js';
import type { AppendMeta } from '../store/store.js';
import type {
  AcknowledgedPayload,
  DecisionRecord,
  Digest,
  FindingRaisedPayload,
  IdentityAssertion,
  Transition,
} from '../types.js';
import { expiryDeadlineMs, resolveDueClock } from './expiry.js';
import { appendChainCompromise, isValidIdentity } from './finalize.js';

/** SPEC §10.2's `finding` argument: `{ findingId, kind, findingDigest, magnitude? }`. */
export interface FindingInput {
  findingId: string;
  kind: string;
  findingDigest: string;
  magnitude?: string;
}
/** SPEC §10.2's `ack` argument: `{ findingId, findingDigest, magnitude? }`. */
export interface AckInput {
  findingId: string;
  findingDigest: string;
  magnitude?: string;
}

type SeamResult = Outcome<{ recordId: string; state: 'open'; transitionRef: Digest }>;

const FINDING_KEYS = new Set(['findingId', 'kind', 'findingDigest', 'magnitude']);
const ACK_KEYS = new Set(['findingId', 'findingDigest', 'magnitude']);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Argument-intake validation, the validateConsultations class (SPEC §9's "throws at
 * argument intake" posture): a malformed shape is a caller error that throws
 * identically regardless of record state, before the chain loads. The identity rule is
 * a permitted tightening the spec is silent on: an empty-principal raiser would make
 * the finding unacknowledgeable under `self`/`counterparty` (the counting predicate
 * fails closed on both sides) — the declarable-but-inert trap the settled class closes.
 */
function validateInput(
  seam: 'raiseFinding' | 'acknowledge',
  input: Record<string, unknown>,
  allowedKeys: Set<string>,
  requireKind: boolean,
): void {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error(`${seam}: the ${requireKind ? 'finding' : 'ack'} argument is not a plain object — a caller error (SPEC §10.2)`);
  }
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      throw new Error(
        `${seam}: unknown key '${key}' — the shape is exact (SPEC §10.2), and the library stamps at itself`,
      );
    }
  }
  if (!isNonEmptyString(input.findingId)) {
    throw new Error(`${seam}: missing or empty findingId — a malformed argument is a caller error (SPEC §10.2)`);
  }
  if (requireKind && !isNonEmptyString(input.kind)) {
    throw new Error(`${seam}: missing or empty kind — a malformed argument is a caller error (SPEC §10.2)`);
  }
  if (!isNonEmptyString(input.findingDigest)) {
    throw new Error(`${seam}: missing or empty findingDigest — digest-only custody needs the digest (SPEC §3)`);
  }
  if (input.magnitude !== undefined && typeof input.magnitude !== 'string') {
    throw new Error(`${seam}: a non-string magnitude — the library never interprets it, but it IS a string (SPEC §10.2)`);
  }
}

function validateSeamIdentity(seam: string, identity: IdentityAssertion): void {
  if (!isValidIdentity(identity)) {
    throw new Error(
      `${seam}: a malformed identity (missing or empty principal/authority) is a caller error — ` +
        'an empty principal could never satisfy any ackMode (fail-closed both sides), the inert-input trap',
    );
  }
}

type Loaded =
  | { ok: true; chain: readonly Transition[]; record: DecisionRecord; resolved: ResolvedProfile; leg: LegSpec }
  | { ok: false; out: SeamResult };

/** The shared prologue: rungs (1)-(3) of the header ladder. */
async function loadOpenDeclaringRecord(
  ctx: KernelContext,
  seam: 'raiseFinding' | 'acknowledge',
  recordId: string,
): Promise<Loaded> {
  const { store, profiles, now } = ctx;
  const chain = await store.readChain(recordId);
  if (chain.length === 0) {
    throw new Error(
      `${seam}: unknown recordId '${recordId}' — no such record (open() first); a recordId that ` +
        'resolves to no chain is a caller error, not a domain refusal (SPEC §8)',
    );
  }
  // (1) chain-verify, FIRST.
  if (!verifyChain(chain).intact) {
    return { ok: false, out: (await appendChainCompromise(store, chain, now)) as SeamResult };
  }
  const record = replay(chain);
  // (2) profile/leg resolution.
  const resolved = profiles.get(record.profileId);
  if (resolved === undefined) {
    return { ok: false, out: refused('unknown-profile') };
  }
  const leg = resolved.profile.legs.find((l) => l.id === record.legId);
  if (leg === undefined) {
    throw new Error(
      `${seam}: persisted legId '${record.legId}' is absent from profile '${record.profileId}'`,
    );
  }
  // (2.5) declaring check — both-or-neither holds at construction, so either field
  // proves the pair.
  if (leg.ackMode === undefined || leg.requiredAcks === undefined) {
    throw new Error(
      `${seam}: profile '${record.profileId}' leg '${leg.id}' declares no findings flow — ` +
        'SPEC §10.2: "both seams throw on a record whose resolved leg declares no findings flow", ' +
        'keeping a non-declaring chain byte-identical to a pre-findings implementation',
    );
  }
  // (3) state/expiry — the finalize rung-(2) arms, adapted (SPEC §10.2: "only `open`
  // records accept the append").
  if (record.state === 'expired') {
    return { ok: false, out: refused('leg-expired') };
  }
  if (record.state === 'confirmed' || record.state === 'redeeming') {
    const due = await resolveDueClock(store, chain, resolved, now());
    if (due.due && due.result.appended) {
      return {
        ok: false,
        out: refused(due.window === 'confirmed' ? 'leg-expired' : 'record-not-open'),
      };
    }
    return { ok: false, out: refused('record-not-open') };
  }
  if (record.state !== 'open') {
    return { ok: false, out: refused('record-not-open') };
  }
  const ex = await resolveDueClock(store, chain, resolved, now());
  if (ex.due) {
    return { ok: false, out: refused('leg-expired') };
  }
  return { ok: true, chain, record, resolved, leg };
}

/** Rung (5): the one mid-lifecycle append, state-preserving, dueAt re-supplied. */
async function appendSeamTransition(
  ctx: KernelContext,
  chain: readonly Transition[],
  resolved: ResolvedProfile,
  kind: 'finding-raised' | 'acknowledged',
  payload: FindingRaisedPayload | AcknowledgedPayload,
): Promise<SeamResult> {
  const last = chain.at(-1);
  if (last === undefined) throw new Error('findings-seams: empty chain — the prologue holds');
  const genesis = chain[0];
  if (genesis === undefined) throw new Error('findings-seams: empty chain — the prologue holds');
  const transition: Transition = {
    recordId: last.recordId,
    seq: chain.length + 1,
    at: ctx.now().toISOString(),
    kind,
    payload: payload as unknown as Transition['payload'],
    prevHash: transitionDigest(last),
  };
  const deadlineMs = expiryDeadlineMs(genesis.at, resolved.profile.expiry);
  const meta: AppendMeta = {
    nonTerminal: true,
    ...(deadlineMs === null ? {} : { dueAt: new Date(deadlineMs).toISOString() }),
  };
  const res = await ctx.store.appendTransition('open', transition, meta);
  if (!res.appended) {
    // A racing writer moved the state between the read and this CAS — the state the
    // caller saw is gone; re-invocation re-reads (the established lost-race posture).
    return refused('record-not-open');
  }
  return ok({ recordId: last.recordId, state: 'open', transitionRef: res.transitionDigest });
}

export async function raiseFinding(
  ctx: KernelContext,
  recordId: string,
  finding: FindingInput,
  identity: IdentityAssertion,
): Promise<SeamResult> {
  validateInput('raiseFinding', finding as unknown as Record<string, unknown>, FINDING_KEYS, true);
  validateSeamIdentity('raiseFinding', identity);
  const pre = await loadOpenDeclaringRecord(ctx, 'raiseFinding', recordId);
  if (!pre.ok) return pre.out;
  // (4) SPEC §10.2: "`kind` is immutable per `findingId` — a re-raise changing it
  // throws". The same shape replay treats as a storage fault is a live CALLER error
  // here — the seam refusing it is what keeps it impossible on honest chains.
  const existing = pre.record.findings?.find((f) => f.findingId === finding.findingId);
  if (existing !== undefined && existing.kind !== finding.kind) {
    throw new Error(
      `raiseFinding: finding '${finding.findingId}' was raised with kind '${existing.kind}' — ` +
        "SPEC §10.2: \"`kind` is immutable per `findingId` — a re-raise changing it throws\"",
    );
  }
  const payload: FindingRaisedPayload = {
    findingId: finding.findingId,
    kind: finding.kind,
    findingDigest: finding.findingDigest,
    ...(finding.magnitude !== undefined ? { magnitude: finding.magnitude } : {}),
    raiser: identity,
  };
  return appendSeamTransition(ctx, pre.chain, pre.resolved, 'finding-raised', payload);
}

export async function acknowledge(
  ctx: KernelContext,
  recordId: string,
  ack: AckInput,
  identity: IdentityAssertion,
): Promise<SeamResult> {
  validateInput('acknowledge', ack as unknown as Record<string, unknown>, ACK_KEYS, false);
  validateSeamIdentity('acknowledge', identity);
  const pre = await loadOpenDeclaringRecord(ctx, 'acknowledge', recordId);
  if (!pre.ok) return pre.out;
  // (4) SPEC §10.2: "An ack naming a `findingId` absent from the record throws (caller
  // error)". A stale digest, a mismatched magnitude, an ackMode-violating acker all
  // APPEND — §10.2's "recorded and visibly non-counting (fidelity, not validity)";
  // counting is rung (5.7)'s business, never this seam's.
  const target = pre.record.findings?.find((f) => f.findingId === ack.findingId);
  if (target === undefined) {
    throw new Error(
      `acknowledge: finding '${ack.findingId}' was never raised on record '${recordId}' — ` +
        'SPEC §10.2: an ack naming an absent findingId throws (caller error)',
    );
  }
  const payload: AcknowledgedPayload = {
    findingId: ack.findingId,
    findingDigest: ack.findingDigest,
    ...(ack.magnitude !== undefined ? { magnitude: ack.magnitude } : {}),
    acker: identity,
  };
  return appendSeamTransition(ctx, pre.chain, pre.resolved, 'acknowledged', payload);
}
```

   (Adapt import specifics to the tree — e.g. if `Digest` lives elsewhere or
   `appendChainCompromise`'s return type needs a narrower cast, follow the compiler;
   `ResolvedProfile` is exported from create.ts. The `as SeamResult` on
   `appendChainCompromise` mirrors how its refusal-only outcome narrows at every other
   caller — check seal.ts's usage and match it.)

3. `kernel/finalize.ts` — insert between rung (5.5)'s closing brace and the
   "(6) success batch" comment:

```ts
  // --- (5.7) ack coverage (SPEC §10.2; the second step-7 increment) --------------------
  // The library replays the record's own findings and acks — NO new finalize inputs —
  // and, per SPEC §10.2, "for each finding whose `kind` appears in the leg's
  // `requiredAcks`, in first-raise order, first trip refuses". Coverage is the read
  // side's shared derivation (kernel/findings.ts) — the rung adds no recording of its
  // own, and an undeclared flow or findings-free record passes vacuously ("`requiredAcks`
  // gates *raised* findings; it does not require findings to exist").
  for (const row of findingCoverage(record.findings, leg.ackMode, leg.requiredAcks)) {
    if (row.coverage === 'ack-missing' || row.coverage === 'ack-stale') {
      return refuseMaybeAppend(store, row.coverage, leg, chain, resolved, finalLeg, now);
    }
  }
```

   Import `findingCoverage` from `./findings.js`. Header updates: the rung list at
   finalize.ts:10 gains (5.7); any "nine rungs"/rung-count phrasing in the header moves
   with it (grep the file for the old enumeration).

4. Wiring: `operator-surface.ts` — add to the interface, after `finalize`:

```ts
  raiseFinding(
    recordId: string,
    finding: FindingInput, // SPEC §10.2: { findingId, kind, findingDigest, magnitude? }
    identity: IdentityAssertion,
  ): Promise<Outcome<{ recordId: string; state: 'open'; transitionRef: Digest }>>;
  acknowledge(
    recordId: string,
    ack: AckInput, // SPEC §10.2: { findingId, findingDigest, magnitude? } — the version accepted
    identity: IdentityAssertion,
  ): Promise<Outcome<{ recordId: string; state: 'open'; transitionRef: Digest }>>;
```

   plus the two entries in `makeOperatorSurface`'s frozen literal and the type import.
   `create.ts` — the `Kernel` type gains
   `raiseFinding: OperatorSurface['raiseFinding']; acknowledge: OperatorSurface['acknowledge'];`
   and `makeKernel` gains:

```ts
    // --- raiseFinding()/acknowledge(): kernel/findings-seams.ts — SPEC §10.2's two
    // operator-only mid-lifecycle seams (second step-7 increment) ---
    raiseFinding: (recordId, finding, identity) =>
      raiseFindingKernel(ctx, recordId, finding, identity),
    acknowledge: (recordId, ack, identity) => acknowledgeKernel(ctx, recordId, ack, identity),
```

5. Comment finalizations — EVERY item below is verified changed (or verified already
   true) before the commit; the report lists each with its verdict:
   - `types.ts:44` region — "the second step-7 increment — the first landed only the
     READ half" phrasing: rewrite to name both halves landed (the seams mint as of the
     second step-7 increment).
   - `types.ts:128` — "not yet finding-raised/acknowledged (§10.2)": now minted by the
     findings seams (the second step-7 increment).
   - `types.ts:160-161` — "no seam mints the transitions that populate it until the
     second step-7 increment": the seams are real as of the second step-7 increment.
   - `types.ts` `AcknowledgedPayload` docblock — any "landing"/future tense on the
     `acknowledge` seam: real now; the acker/actor divergence label STAYS.
   - `chain/replay.ts:99-107` — the doc list's "their kernel producers landing in the
     second step-7 increment" and the "not yet emitted" enumeration: both kinds' seams
     real as of the second step-7 increment; the default-arm throw sentence stays true.
   - `chain/replay.ts:214` — "(the seam, landing in the second step-7 increment,
     throws on it)": the seam is real; the storage-fault reasoning stands.
   - `kernel/findings.ts:6,11,66` — "lands in the second step-7 increment" /
     "no seam dependency" framing: the consumers are real now.
   - `kernel/findings.ts:89-96,121` — "is not yet ENFORCED at construction in this
     build" / "The second step-7 increment's own [rule]": `validateFindingsFlow` is
     real; the half-declared state is unconstructible; the fail-closed branch STAYS as
     defense-in-depth with its tense finalized.
   - `refusal-codes.ts:66` (and its sibling if both sections carry one) — "landing in
     the second step-7 increment" → real as of the second step-7 increment (finalize's
     rung (5.7)).
   - `refusal-matrix.test.ts:496-521` — the two banners' "landing in the second step-7
     increment" → real; "production-path coverage will live in findings.test.ts" →
     lives there now (this commit adds it).
   - `store/semantics.ts:48-49` — THE ONE AUTHORIZED src/store/ EDIT: the
     parenthetical "(GOVERNED annotations SPEC §10.2 defines, not emitted by this
     build's kernel)" → "(SPEC §10.2's findings-flow annotations, minted by the
     findings seams as of the second step-7 increment)". Nothing else in the file.
   - `test/conformance/store-conformance.ts:267,564` — the two
     `note: 'not emitted by this kernel build'` strings → describe the kinds as
     emitted by the findings seams (adjust the note text to stay true; behavior
     assertions unchanged).
   - `construction-validation.test.ts:363` region — the guard-sweep comment (covered
     in Step 1's swap).

- [ ] **Step 4: Run tests, gates, commit**

`pnpm exec vitest run packages/record/test/findings-seams.test.ts packages/record/test/findings.test.ts`,
then the full suite and all five gates. Then re-grep the finalization checklist:
`git grep -nE 'landing in the second step-7|not yet ENFORCED|not emitted by this|not yet finding-raised' -- packages/record` must return ZERO hits. Commit (Bash):

```bash
git add -A packages/record
git commit -m "The findings flow, whole: the seams, the coverage rung, and the lift in one commit

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: The marker move — nine tokens in the sealed set

**Files:**
- Modify: `docs/concept/SPEC.md` — EXACTLY eight lines, each changing ONLY the token
  `[DESIGNED]` → `[PROVEN]` (bold stays bold, plain stays plain).
- Modify: `docs/concept/CONTROLS.md` — EXACTLY one line (~44, the findings-flow
  control row): the bare-word maturity cell `DESIGNED` → `PROVEN` (no brackets in
  that table). CONTROLS.md is downstream of SPEC and conflicts resolve in the
  downstream document — a `DESIGNED` row against a `[PROVEN]` heading would be one.

The standing never-edit rule on `docs/concept/` is LIFTED for exactly this commit and
exactly these tokens (the user's step-7 brainstorm ruling; spec-moves-to-truth's own
sanctioned edit class). It re-arms immediately after.

- [ ] **Step 1: Locate the nine lines by CONTENT (line numbers are advisory)**

1. ~127 (§2, profile-conditional fields): "`findings` and `acks` (a findings flow,
   §10.2) **[DESIGNED]**" → `**[PROVEN]**`
2. ~324 (§4 transition table): "| `finding-raised` / `acknowledged` | the Finding /
   Ack object (profile-conditional, §10.2) **[DESIGNED]** | delta |" → `**[PROVEN]**`
3. ~522 (§8 conditional table): "| `ack-missing` / `ack-stale` | findings flow
   (§10.2); `refusal`-class, `terminalRefusals`-able, open-by-default | [DESIGNED] |"
   → `[PROVEN]` (PLAIN brackets — this is the one unbolded token)
4. ~550 (§9 surface intro): "the findings seams of §10.2 **[DESIGNED]**," →
   `**[PROVEN]**,`
5. ~573 (§9 review bullet): "coverage (§10.2) **[DESIGNED]**." → `**[PROVEN]**.`
6. ~591 (§9 ladder): "**(5.7)** ack coverage **[DESIGNED]** → **(6)**" →
   `**[PROVEN]**`
7. ~638 (profile-field table): "| `ackMode`, `requiredAcks` | Per-leg findings-flow
   controls (§10.2) **[DESIGNED]** — declared both-or-neither |" → `**[PROVEN]**`
8. ~745 (the section heading): "### 10.2 Findings & acknowledgments **[DESIGNED]**" →
   `**[PROVEN]**`
9. CONTROLS.md ~44 (the governed-controls table): "| Findings & acknowledgments |
   `ackMode` + `requiredAcks` (per leg, both-or-neither) | … | DESIGNED | …" — the
   maturity cell's bare word `DESIGNED` → `PROVEN`, nothing else in the row.

- [ ] **Step 2: Byte-verify the diff**

`git diff -- docs/concept/` must show exactly nine changed line pairs across the two
files, each differing ONLY in the token. `grep -c "DESIGNED" docs/concept/SPEC.md`
must return 1 (the legend line 17 definition, which NEVER moves);
`grep -c "DESIGNED" docs/concept/CONTROLS.md` must return 0;
`grep -rn "DESIGNED" docs/concept/` afterwards shows ONLY the two legend lines
(SPEC.md:17 and README.md:48 — the concept README's legend never moves). No other
docs/concept file in the diff.

- [ ] **Step 3: Gates, commit**

All five gates (contract-scan especially — it must stay silent). Commit (Bash):

```bash
git add docs/concept/SPEC.md docs/concept/CONTROLS.md
git commit -m "Move the marker: §10.2 is PROVEN in this repository — nine tokens, nothing else

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: The record — step 7 exits

**Files:**
- Modify: `docs/process/implementation-status.md`
- Modify: `CLAUDE.md`, `README.md`
- Modify: stale comments the sweep finds
- No register edits expected (verify by READING `docs/process/deferral-register.md`)

**Interfaces:** consumes Tasks 1-2; the spec's §7 ("The record — step 7 exits") is the
checklist — verify every claim against CODE, never task reports.

- [ ] **Step 1: implementation-status.md**

Per the spec's §7: steps table → step 7 **Exited** (two increments named); §10.2 row →
whole in this build (seams + rung (5.7) + lift + marker executed; the acker/actor
divergence and nested-acks representation entries STAY with tense updated; review's
conservative-read sentence updated — the gate at finalize is REAL now); §8 row: both
codes' producers real (rung (5.7)); §9 row: the seams named on the operator surface;
the governed count 4 → 2 WITH the movement narrated and any "where it stands
today"/"down to N" tails amended forward; the guard-lift boundary paragraph appended
(the doc's own convention: `ackMode` + `requiredAcks` lifted together at the second
step-7 increment, same commit as seams + gate; replaced by `validateFindingsFlow`);
the marker move recorded as EXECUTED with the eight-token enumeration; the
authorized semantics.ts comment edit recorded in one sentence (the frozen-store
exception, ruled at this increment).

- [ ] **Step 2: CLAUDE.md + README.md**

CLAUDE.md: step 7 exited (two increments, the second landing seams+gate+lift atomic
and executing the marker ruling); the construction-guard narrative gains "the count
moves once more, at the second step-7 increment: four down to two" with
`validateFindingsFlow` named; the "Four fields are governed today" sentence becomes
two (`captureMode:'live'`, `freshness`). README: step 7 exited; the steps arithmetic
("one … step 8") re-verified — it stays true.

- [ ] **Step 3: The sweep — LAST, against the committed tree**

Only after every other edit in this task is final:

```bash
git grep -nE 'second step-7 increment|first step-7 increment|raiseFinding|acknowledge|ack-missing|ack-stale|ackMode|requiredAcks|validateFindingsFlow|rung \(5\.7\)|landing in|will make|not yet|this increment|later increment|step 8' -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
git grep -nE 'four fields are governed|Four fields|4 \(|governed count|down to (two|four|4|2)|where it stands today|nine-rung|ten-rung|corpus total|DESIGNED|Started' -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
```

(Single-quoted patterns deliberately.) The second grep's `DESIGNED` arm catches
process docs still calling §10.2's marker future; `Started` catches the steps-table
cell. Judge EVERY hit; THE REPORT MUST SHOW HIT-COUNT == VERDICT-COUNT, counts from
THIS run.

- [ ] **Step 4: Verify quotes, gates, commit**

Hand-verify every quoted SPEC phrase in touched markdown whitespace-collapsed. All
five gates. Commit (Bash):

```bash
git add -A
git commit -m "Record step 7 exited: the findings flow is whole and the marker moved

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Exit verification

**Files:** none modified (fixes only if a gate fails).

- [ ] **Step 1: Clean-tree gates**

Fresh PowerShell (`$env:PATH = "$env:APPDATA\npm;$env:PATH"`), `git status --porcelain`
empty, branch `main`, then all five gates with exact counts (zero skips).

- [ ] **Step 2: Freeze verification (against the spec commit a044b4f)**

```bash
git diff a044b4f..HEAD -- packages/record/test/byte-stability.test.ts   # MUST be empty
git diff a044b4f..HEAD -- packages/record/src/chain/encoding.ts          # MUST be empty
git diff a044b4f..HEAD -- packages/record/src/store/                     # EXACTLY the one semantics.ts comment
git diff a044b4f..HEAD -- docs/concept/                                  # EXACTLY the nine marker-token lines
```

The third diff must touch ONLY `semantics.ts` and only its §10.2 parenthetical comment
(no behavior line). The fourth must show nine changed line pairs — eight in SPEC.md
(`[DESIGNED]`→`[PROVEN]`) and one in CONTROLS.md (bare `DESIGNED`→`PROVEN`) — and
`grep -c DESIGNED docs/concept/SPEC.md` returns 1 (the legend),
`grep -c DESIGNED docs/concept/CONTROLS.md` returns 0. Any other content ⇒ BLOCKED
with the diff stat.

- [ ] **Step 3: Report**

The increment's commit list (`git log --oneline a044b4f..HEAD`), exact counts,
register rows live (read the file), step-7-Exited confirmation (read the steps table),
`grep -n PROVEN docs/concept/SPEC.md | wc -l` sanity line, and `git status -sb`'s
ahead count for the user-gated push.
