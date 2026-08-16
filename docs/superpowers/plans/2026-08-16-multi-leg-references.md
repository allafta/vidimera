# Multi-Leg References Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land SPEC §10.1's multi-leg machinery without its actor gate — sequencing,
verify-by-replay references, `prior-leg-unverified` (fifteenth code), and the successor's
`opened` snapshot carrying the three-field refs + derived `priorLegActors` — as the first
of two step-4 increments.

**Architecture:** One new verifier module (`kernel/prior-legs.ts`) turns host-claimed
references into recorded evidence or one refusal; `open()` gains a pre-record sequencing
rung consuming it. The GOVERNED `legs.length>1` lift and that rung land in ONE commit so
no commit admits a multi-leg profile whose successor opens unverified. `sod`/`proposer`
stay GOVERNED (the second step-4 increment's gate).

**Tech Stack:** TypeScript strict (pnpm workspace, Node >=22.16), vitest, Biome. No new
runtime APIs — the floor does not move.

**Spec:** `docs/superpowers/specs/2026-08-16-multi-leg-references-design.md` (as amended
at the verifier-signature commit) — read it before your task.

## Global Constraints

- **Shell**: PowerShell for pnpm (`$env:PATH = "$env:APPDATA\npm;$env:PATH"` FIRST in
  EVERY fresh shell — corepack is broken). **Git commits go through the Bash tool** with
  ordinary multi-line `-m` quoting. Before any commit, `git branch --show-current` must
  print `main`; anything else ⇒ STOP, report BLOCKED.
- **The five gates** before each task's final commit: `pnpm typecheck` · `pnpm lint` ·
  `pnpm lint:strict` · `pnpm test` (zero skips) · `node scripts/contract-scan.mjs`
  (prints nothing, exits 0).
- **Frozen surfaces**: `packages/record/test/byte-stability.test.ts`,
  `packages/record/src/chain/encoding.ts`, and ALL of `packages/record/src/store/` must
  not appear in any diff of this increment — red or touched ⇒ STOP, BLOCKED.
- **`docs/concept/` is SEALED.** `docs/superpowers/` and `docs/analysis/` are historical
  leave-alone.
- **No external URLs/project names.** Committed TS comments: no "slice"/"design" words
  (except `.slice()` / "by design"), no `Task N`-style pointers, no bare 7-40-char hex.
  Explicit increment naming — "the first step-4 increment" / "the second step-4
  increment" — never bare "this increment". ASCII apostrophes. A double-quoted phrase
  right after a `SPEC §N` citation must occur verbatim (whitespace-collapsed, backticks
  ignored) in docs/concept/SPEC.md.
- **Plan-authored comments are truthful at the commit that lands them**: anything whose
  producer/consumer lands in a LATER task takes two-touch wording (future-tense first,
  finalized by the task that makes it real — each such finalization is an explicit step
  item below).
- **Counts stated with the movement named** (the governed count moves 10 → 9 here).
- **Enlisted-branch check, visibly run**: `open()` takes no `tx` parameter, so the new
  rung has no enlisted branch to decide — stated here so the check is on record.
- Narrow test runs: `pnpm exec vitest run packages/record/test/<file>.test.ts` from repo
  root. Clock-dependent fixtures use `createWithClock` — never sleeps.

---

### Task 1: The code, the verifier, and the fold (inert until the lift)

**Files:**
- Modify: `packages/record/src/refusal-codes.ts` (union + REGISTRY + NEVER_APPENDS)
- Modify: `packages/record/src/types.ts` (`RecordedPriorLegRef`, `DecisionRecord` fields)
- Modify: `packages/record/src/chain/replay.ts` (`OpenedPayload` + the seed fold)
- Create: `packages/record/src/kernel/prior-legs.ts`
- Modify: `packages/record/test/outcome-model.test.ts:44` and
  `packages/record/test/refusal-matrix.test.ts` (count pins 14→15; new section)
- Test: create `packages/record/test/multi-leg.test.ts`

**Interfaces:**
- Consumes: `verifyChain`/`replay` (chain/replay.ts), `transitionDigest`
  (chain/encoding.ts), `Store`, `ResolvedProfile`.
- Produces (later tasks rely on these EXACT shapes):

```ts
// types.ts
export interface RecordedPriorLegRef {
  recordId: string;
  chainHead: Digest;
  legId: string; // library-added while verifying against the profile's leg order
}
// DecisionRecord gains: priorRecordRefs?: RecordedPriorLegRef[]; priorLegActors?: IdentityAssertion[];

// kernel/prior-legs.ts
export interface VerifiedPriorLegs {
  priorRecordRefs: RecordedPriorLegRef[];
  priorLegActors: IdentityAssertion[]; // paired by index with priorRecordRefs
}
export type PriorLegsResult = { ok: true; verified: VerifiedPriorLegs | null } | { ok: false };
export function verifyPriorLegs(
  store: Store,
  resolved: ResolvedProfile,
  legIndex: number,
  subjectRef: string,
  refs: { recordId: string; chainHead: string }[] | undefined,
): Promise<PriorLegsResult>;
```

(The host-supplied two-field `PriorRecordRef` type is declared in config.ts at the NEXT
task, with `OpenOptions` — this task's `refs` parameter uses the structural shape so
nothing here depends on config.)

- [ ] **Step 1: Write the failing tests**

Create `packages/record/test/multi-leg.test.ts`:

```ts
// @vidimera/record — multi-leg.test.ts (SPEC §10.1 "Maker-checker / separation of
// duties", the sequencing-and-references half; §4's opened snapshot): the first step-4
// increment's file. This file owns the verifier pins, the sequencing-rung pins, and the
// interplay pins; the SoD gate's pins are the second step-4 increment's.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import { replay } from '../src/chain/replay.js';
import { verifyPriorLegs } from '../src/kernel/prior-legs.js';
import { MemoryStore } from '../src/store/memory.js';
import type { ResolvedProfile } from '../src/create.js';
import type { ConfirmProfile } from '../src/config.js';
import type { Transition } from '../src/types.js';
import { buildChain } from './helpers/chain.js';
import { DEFAULT_CANONICALIZER_REF, tamperNonLast } from './helpers/profiles.js';
import { TamperingStore } from './helpers/stores.js';

const SUBJECT = 'subject:ml-1';

/** A hand-built two-leg profile OBJECT (never passed through create() in this task —
 * the GOVERNED legs guard still throws there until the sequencing rung lands with it). */
function twoLegShape(id = 'test.twoleg.v1'): ConfirmProfile {
  return {
    id,
    subject: { canonicalizerRef: DEFAULT_CANONICALIZER_REF },
    legs: [
      { id: 'maker-decide', allowedAuthorities: ['session:test-app'] },
      { id: 'checker-decide', allowedAuthorities: ['session:test-app'] },
    ],
    captureMode: 'staged',
    expiry: { ttl: 3600 },
  };
}
function resolvedOf(profile: ConfirmProfile): ResolvedProfile {
  return { profile, canonicalizer: (c: unknown) => c, effectSeam: false };
}

/** Seeds a store with a correctly-linked chain, one honest append at a time. */
async function seed(store: MemoryStore, chain: Transition[], lastNonTerminal: boolean) {
  for (const [i, t] of chain.entries()) {
    const expected = i === 0 ? null : 'open';
    const nonTerminal = i === chain.length - 1 ? lastNonTerminal : true;
    const res = await store.appendTransition(expected, t, { nonTerminal });
    assert.equal(res.appended, true, `fixture: seed append ${i} must land`);
  }
}

/** A confirmed maker-leg prior for `twoLegShape()` under SUBJECT; returns its chain. */
function makerConfirmedChain(recordId: string, overrides?: {
  profileId?: string; subjectRef?: string; legId?: string; actorless?: boolean;
}): Transition[] {
  return buildChain(recordId, [
    {
      kind: 'opened',
      payload: {
        profileId: overrides?.profileId ?? 'test.twoleg.v1',
        profileDigest: `sha256:${'0'.repeat(64)}`,
        legId: overrides?.legId ?? 'maker-decide',
        subjectRef: overrides?.subjectRef ?? SUBJECT,
        contentDigest: `sha256:${'1'.repeat(64)}`,
      },
    },
    {
      kind: 'confirmed',
      payload: overrides?.actorless
        ? {}
        : { actor: { principal: 'maker:1', authority: 'session:test-app' } },
    },
  ]);
}

test('verifyPriorLegs: a first leg with no refs verifies to null; with any ref it fails', async () => {
  const store = new MemoryStore();
  const resolved = resolvedOf(twoLegShape());
  assert.deepEqual(await verifyPriorLegs(store, resolved, 0, SUBJECT, undefined), {
    ok: true,
    verified: null,
  });
  assert.deepEqual(await verifyPriorLegs(store, resolved, 0, SUBJECT, []), {
    ok: true,
    verified: null,
  });
  // §10.1: "supplying any is itself a sequencing error that refuses `prior-leg-unverified`"
  // — the caller maps { ok: false } to that code.
  const any = [{ recordId: 'r-x', chainHead: `sha256:${'a'.repeat(64)}` }];
  assert.deepEqual(await verifyPriorLegs(store, resolved, 0, SUBJECT, any), { ok: false });
});

test('verifyPriorLegs: the happy reference — three-field ref recorded, actor derived, paired by index', async () => {
  const store = new MemoryStore();
  const chain = makerConfirmedChain('rec-ml-1');
  await seed(store, chain, false); // confirmed non-final leg: terminal
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  const head = transitionDigest(last);

  const res = await verifyPriorLegs(store, resolvedOf(twoLegShape()), 1, SUBJECT, [
    { recordId: 'rec-ml-1', chainHead: head },
  ]);
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.ok(res.verified !== null);
  assert.deepEqual(res.verified.priorRecordRefs, [
    { recordId: 'rec-ml-1', chainHead: head, legId: 'maker-decide' },
  ]);
  assert.deepEqual(res.verified.priorLegActors, [
    { principal: 'maker:1', authority: 'session:test-app' },
  ]);
});

test('verifyPriorLegs: every verification condition fails closed to { ok: false }', async () => {
  const store = new MemoryStore();
  const chain = makerConfirmedChain('rec-ml-2');
  await seed(store, chain, false);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  const head = transitionDigest(last);
  const resolved = resolvedOf(twoLegShape());

  // unknown recordId — host DATA, refused, never a caller-error throw:
  assert.deepEqual(
    await verifyPriorLegs(store, resolved, 1, SUBJECT, [{ recordId: 'rec-none', chainHead: head }]),
    { ok: false },
  );
  // head mismatch (a wrong claimed head):
  assert.deepEqual(
    await verifyPriorLegs(store, resolved, 1, SUBJECT, [
      { recordId: 'rec-ml-2', chainHead: `sha256:${'f'.repeat(64)}` },
    ]),
    { ok: false },
  );
  // wrong subject:
  assert.deepEqual(
    await verifyPriorLegs(store, resolved, 1, 'subject:other', [
      { recordId: 'rec-ml-2', chainHead: head },
    ]),
    { ok: false },
  );
  // count mismatch — too few for a third leg, too many for a second:
  assert.deepEqual(await verifyPriorLegs(store, resolved, 2, SUBJECT, [
    { recordId: 'rec-ml-2', chainHead: head },
  ]), { ok: false });
  assert.deepEqual(
    await verifyPriorLegs(store, resolved, 1, SUBJECT, [
      { recordId: 'rec-ml-2', chainHead: head },
      { recordId: 'rec-ml-2', chainHead: head },
    ]),
    { ok: false },
  );
});

test('verifyPriorLegs: a still-open prior fails; a tampered prior chain fails', async () => {
  const store = new MemoryStore();
  const openOnly = buildChain('rec-ml-3', [
    {
      kind: 'opened',
      payload: {
        profileId: 'test.twoleg.v1',
        profileDigest: `sha256:${'0'.repeat(64)}`,
        legId: 'maker-decide',
        subjectRef: SUBJECT,
        contentDigest: `sha256:${'1'.repeat(64)}`,
      },
    },
  ]);
  await seed(store, openOnly, true);
  const openHead = openOnly.at(-1);
  assert.ok(openHead !== undefined);
  assert.deepEqual(
    await verifyPriorLegs(store, resolvedOf(twoLegShape()), 1, SUBJECT, [
      { recordId: 'rec-ml-3', chainHead: transitionDigest(openHead) },
    ]),
    { ok: false },
  );

  // Tampered: seed an honest confirmed chain, then read it through the established
  // TamperingStore wrapper (helpers/stores.ts) — a NON-LAST payload tamper, so
  // verifyChain reports intact:false at the break (the AL1 next-link rule).
  const honest = makerConfirmedChain('rec-ml-4');
  await seed(store, honest, false);
  const tampering = new TamperingStore(store, 'rec-ml-4', tamperNonLast);
  const honestLast = honest.at(-1);
  assert.ok(honestLast !== undefined);
  assert.deepEqual(
    await verifyPriorLegs(tampering, resolvedOf(twoLegShape()), 1, SUBJECT, [
      { recordId: 'rec-ml-4', chainHead: transitionDigest(honestLast) },
    ]),
    { ok: false },
  );
});

test('verifyPriorLegs: an intact, confirmed prior with no derivable actor THROWS — storage fault, not a refusal', async () => {
  const store = new MemoryStore();
  const chain = makerConfirmedChain('rec-ml-5', { actorless: true });
  await seed(store, chain, false);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  await assert.rejects(
    verifyPriorLegs(store, resolvedOf(twoLegShape()), 1, SUBJECT, [
      { recordId: 'rec-ml-5', chainHead: transitionDigest(last) },
    ]),
    /no actor/i,
  );
});

test('replay folds priorRecordRefs/priorLegActors from the opened snapshot; absent means absent', () => {
  const withRefs = buildChain('rec-ml-6', [
    {
      kind: 'opened',
      payload: {
        profileId: 'test.twoleg.v1',
        profileDigest: `sha256:${'0'.repeat(64)}`,
        legId: 'checker-decide',
        subjectRef: SUBJECT,
        contentDigest: `sha256:${'1'.repeat(64)}`,
        priorRecordRefs: [
          { recordId: 'rec-ml-1', chainHead: `sha256:${'a'.repeat(64)}`, legId: 'maker-decide' },
        ],
        priorLegActors: [{ principal: 'maker:1', authority: 'session:test-app' }],
      },
    },
  ]);
  const record = replay(withRefs);
  assert.deepEqual(record.priorRecordRefs, [
    { recordId: 'rec-ml-1', chainHead: `sha256:${'a'.repeat(64)}`, legId: 'maker-decide' },
  ]);
  assert.deepEqual(record.priorLegActors, [
    { principal: 'maker:1', authority: 'session:test-app' },
  ]);

  const without = buildChain('rec-ml-7', [
    {
      kind: 'opened',
      payload: {
        profileId: 'test.twoleg.v1',
        profileDigest: `sha256:${'0'.repeat(64)}`,
        legId: 'maker-decide',
        subjectRef: SUBJECT,
        contentDigest: `sha256:${'1'.repeat(64)}`,
      },
    },
  ]);
  const plain = replay(without);
  assert.equal('priorRecordRefs' in plain, false);
  assert.equal('priorLegActors' in plain, false);
});
```

Also bump the count pins: `outcome-model.test.ts:44` — the assertion value 14 → 15 and
its message word "fourteen" → "fifteen" (verify the current wording in the file before
editing; match on content). `refusal-matrix.test.ts` — the registry count 14 → 15 and its
arithmetic prose; add a `prior-leg-unverified` section mirroring the `redemption-timeout`
section's shape (class `refusal`, member of the never-appends set), its producer worded
two-touch: the verifier (`kernel/prior-legs.ts`) consumed by `open()`'s sequencing rung,
landing later in the first step-4 increment.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm exec vitest run packages/record/test/multi-leg.test.ts packages/record/test/outcome-model.test.ts packages/record/test/refusal-matrix.test.ts`
Expected: FAIL — `prior-legs.js` does not exist; count pins mismatch; the replay fold
pin fails (fields not folded).

- [ ] **Step 3: Implement**

1. `refusal-codes.ts`: `| 'prior-leg-unverified'` joins the union beside the
   profile-conditional block with its own comment — SPEC §8's conditional table names it
   "a pre-record `open()`-seam sequencing refusal that never appends"; producer worded
   two-touch as in the matrix section above. `'prior-leg-unverified': 'refusal'` in
   `REGISTRY`; membership in `NEVER_APPENDS` with the doc comment extended (pre-record:
   no record exists to carry an edge).
2. `types.ts`: add `RecordedPriorLegRef` (the exact interface from **Interfaces**) with a
   §4 comment (the "recorded three-field form" — the host supplies two fields at `open()`
   and the library adds the `legId` it verified); `DecisionRecord` gains
   `priorRecordRefs?: RecordedPriorLegRef[];` and `priorLegActors?: IdentityAssertion[];`
   after `policyDigest`, with a §10.1 comment: present together or not at all; a first
   leg and every single-leg record omit both; `priorLegActors` is library-derived, never
   host-supplied.
3. `chain/replay.ts`: `OpenedPayload` gains
   `priorRecordRefs?: RecordedPriorLegRef[]; priorLegActors?: IdentityAssertion[];`
   (import the type from `../types.js`); after the `policyDigest` fold add:

```ts
  if (opened.priorRecordRefs !== undefined && opened.priorLegActors !== undefined) {
    // SPEC §4: multi-leg successor evidence, present together or not at all; §10.1's
    // "The reference, not the copy, is the evidence" — replay surfaces what the genesis
    // recorded, it never re-verifies the referenced chains (that was open()'s job).
    record.priorRecordRefs = opened.priorRecordRefs;
    record.priorLegActors = opened.priorLegActors;
  }
```

4. Create `kernel/prior-legs.ts`:

```ts
// @vidimera/record — kernel/prior-legs.ts: SPEC §10.1's verify-by-replay reference
// checker (the first step-4 increment), consumed by open()'s sequencing rung. "Legs
// conclude in order": a successor leg's open() carries one host-supplied
// { recordId, chainHead } per prior leg, and this module verifies EVERY reference by
// replaying the referenced chain — six conditions, each failing closed to { ok: false },
// which the CALLER maps to `prior-leg-unverified` (pre-record, never-append; SPEC §8).
// An unknown recordId REFUSES rather than throwing: the reference is host-supplied DATA
// at a mutating seam, unlike replay()/verifyChain()'s audit-read caller-error posture.
// The ONE loud throw: an intact chain that verified and replayed `confirmed` whose
// confirmed payload carries no actor to derive — a storage/config fault (SPEC §8's
// loud-throw posture; the garbled-tokenDigest precedent), never a domain refusal.
//
// AL1 honesty note (SPEC §10.1): the priorLegActors this module derives live in the
// successor's genesis payload, which IS the chain head until the successor's own next
// append — over exactly that window the §0/§5 head-bound applies, and detached signing
// (SPEC §14) is the named upgrade that closes it.

import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import type { ResolvedProfile } from '../create.js';
import type { Store } from '../store/store.js';
import type { IdentityAssertion, RecordedPriorLegRef } from '../types.js';

export interface VerifiedPriorLegs {
  priorRecordRefs: RecordedPriorLegRef[];
  priorLegActors: IdentityAssertion[]; // paired by index with priorRecordRefs (SPEC §4)
}

export type PriorLegsResult =
  | { ok: true; verified: VerifiedPriorLegs | null } // null: a first leg — no evidence keys
  | { ok: false }; // the caller refuses `prior-leg-unverified`; WHICH condition failed is
// deliberately not distinguished (one code by the spec, and no record exists to carry a
// transitionRef)

export async function verifyPriorLegs(
  store: Store,
  resolved: ResolvedProfile,
  legIndex: number,
  subjectRef: string,
  refs: { recordId: string; chainHead: string }[] | undefined,
): Promise<PriorLegsResult> {
  if (legIndex === 0) {
    // A first leg carries no references; §10.1: "supplying any is itself a sequencing
    // error that refuses `prior-leg-unverified`".
    if (refs === undefined || refs.length === 0) return { ok: true, verified: null };
    return { ok: false };
  }
  // One entry per prior leg, in leg order — exactly legIndex of them.
  if (refs === undefined || refs.length !== legIndex) return { ok: false };

  const priorRecordRefs: RecordedPriorLegRef[] = [];
  const priorLegActors: IdentityAssertion[] = [];
  for (let i = 0; i < legIndex; i += 1) {
    const ref = refs[i];
    const expectedLeg = resolved.profile.legs[i];
    if (ref === undefined || expectedLeg === undefined) return { ok: false };

    const chain = await store.readChain(ref.recordId);
    if (chain.length === 0) return { ok: false }; // unknown recordId — and the
    // destroyed-prior posture: a chain that no longer exists cannot be replayed (§10.1)
    if (!verifyChain(chain).intact) return { ok: false };
    const last = chain.at(-1);
    if (last === undefined) return { ok: false };
    // "its recomputed head must equal the supplied `chainHead`" — the host's claim is
    // checked against the recomputation, never adopted.
    if (transitionDigest(last) !== ref.chainHead) return { ok: false };

    const prior = replay(chain);
    if (prior.profileId !== resolved.profile.id) return { ok: false };
    if (prior.subjectRef !== subjectRef) return { ok: false };
    // "sit at the expected leg in order" — against the profile's declared leg order.
    if (prior.legId !== expectedLeg.id) return { ok: false };
    // "be `confirmed`" — state only; status is deliberately NOT consulted, so a sealed
    // prior (state-preserving `sealed`, status `retired`) still verifies: §10.1's "A
    // sealed prior still verifies; a destroyed one does not."
    if (prior.state !== 'confirmed') return { ok: false };

    if (prior.actor === undefined) {
      throw new Error(
        `verifyPriorLegs: prior leg record '${ref.recordId}' replays 'confirmed' with no actor in its confirmed payload — a garbled or foreign chain is a storage/config fault, not a domain outcome (SPEC §8)`,
      );
    }
    priorRecordRefs.push({ recordId: ref.recordId, chainHead: ref.chainHead, legId: expectedLeg.id });
    priorLegActors.push(prior.actor);
  }
  return { ok: true, verified: { priorRecordRefs, priorLegActors } };
}
```

- [ ] **Step 4: Run tests, gates, commit**

Run: the three named files (PASS), then `pnpm test` (PASS — everything here is inert
until the lift: no seam calls the verifier yet, no payload carries the fields), all five
gates. Commit (Bash tool):

```bash
git add packages/record/src/refusal-codes.ts packages/record/src/types.ts packages/record/src/chain/replay.ts packages/record/src/kernel/prior-legs.ts packages/record/test/multi-leg.test.ts packages/record/test/outcome-model.test.ts packages/record/test/refusal-matrix.test.ts
git commit -m "The fifteenth code and the verifier: replay is the check, the reference is the evidence

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: The lift — sequencing at open(), in one commit

**Files:**
- Modify: `packages/record/src/config.ts` (legs guard delete + renumber; zero-legs
  message; unique-leg-ids structural; `PriorRecordRef` + `OpenOptions` reshape + doc
  rewrite)
- Modify: `packages/record/src/kernel/open.ts` (opts loop, `openOptionMessage`, the
  sequencing rung, the payload)
- Modify: `packages/record/src/refusal-codes.ts` + `packages/record/test/refusal-matrix.test.ts`
  (finalize the two-touch producer wording — the rung is real from this commit)
- Modify: `packages/record/test/helpers/profiles.ts` (`twoLegProfile`; `openRecord`
  gains `legId?`)
- Modify: `packages/record/test/construction-validation.test.ts` (invert the legs pin;
  add duplicate-ids; add multi-leg sod/proposer still-GOVERNED pins)
- Test: `packages/record/test/multi-leg.test.ts` (extend)

**Interfaces:**
- Consumes: Task 1's `verifyPriorLegs(store, resolved, legIndex, subjectRef, refs)` and
  `PriorLegsResult`.
- Produces: `PriorRecordRef { recordId: string; chainHead: Digest }` and
  `OpenOptions { priorRecordRefs?: PriorRecordRef[] }` in config.ts;
  `twoLegProfile(overrides?)` (legs `maker-decide`/`checker-decide`, capture-mode, ttl
  3600) and `openRecord(handles, content, profileId, subjectRef, legId?)` in helpers.

**All in ONE commit** so no commit admits a multi-leg profile whose successor opens
unverified — the same atomicity argument the third step-3 increment's guard-lift task
carried.

- [ ] **Step 1: Write the failing tests**

In `construction-validation.test.ts`, REPLACE the `legs.length > 1` GOVERNED test with
the acceptance pin, inversion note appended in place:

```ts
test('legs.length > 1 is accepted at construction — the sequencing that orders them is built', () => {
  // INVERTED, at the first step-4 increment: the kernel increment pinned a GOVERNED
  // throw here while nothing enforced §10.1's "Legs conclude in order". The sequencing
  // rung and the verify-by-replay reference check land in the same commit as this lift,
  // so the guard's stated trigger (multi-leg maker-checker sequencing, §10.1) has fired
  // for the ordering half; per-leg `sod`/`proposer` remain GOVERNED until the second
  // step-4 increment builds the gate that reads the evidence.
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assert.doesNotThrow(() =>
    create(makeConfig([
      { ...p, legs: [leg, { id: 'second-leg', allowedAuthorities: ['session:test-app'] }] },
    ])),
  );
});

test('structural: duplicate leg ids throw a structural error naming both positions', () => {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assertStructural(
    { ...p, legs: [leg, { ...leg }] },
    /duplicate leg id/i,
  );
});

test('GOVERNED: a MULTI-LEG profile declaring sod still throws (sod) — the gate is the second step-4 increment', () => {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assertGoverned(
    {
      ...p,
      legs: [
        leg,
        { id: 'second-leg', allowedAuthorities: ['session:test-app'], sod: { notActorOf: [leg.id] } },
      ],
    },
    'sod',
  );
});

test('GOVERNED: a MULTI-LEG profile declaring proposer still throws (proposer)', () => {
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assertGoverned(
    {
      ...p,
      legs: [leg, { id: 'second-leg', allowedAuthorities: ['session:test-app'], proposer: 'maker:1' }],
    },
    'proposer',
  );
});
```

(The existing single-leg sod/proposer GOVERNED pins and the zero-legs structural pin stay
— the zero-legs pin's expected message changes with the reworded structural error: update
its regex from `/exactly one leg/i` to `/at least one leg/i`.)

In `multi-leg.test.ts`, add (imports join the top: `create`, `createWithClock`,
`makeConfig`, `identity`, `facts`, `openRecord`, `twoLegProfile`, `captureProfile`,
`effectSeamProfile` as needed — match the file's conventions):

```ts
const CONTENT = { subject: 'week-1', total: 40 };

/** Opens+finalizes the maker leg of twoLegProfile(); returns ids and the maker's head.
 * (`AgentSurface`/`OperatorSurface` type imports join the file's top — the same handles
 * shape helpers/profiles.ts's openRecord takes.) */
async function makerConcluded(
  handles: { agent: AgentSurface; operator: OperatorSurface },
  store: MemoryStore,
  profileId = 'test.twoleg.v1',
) {
  const makerId = await openRecord(handles, CONTENT, profileId, SUBJECT, 'maker-decide');
  const done = await handles.operator.finalize(makerId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the maker leg must confirm');
  const chain = await store.readChain(makerId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  return { makerId, makerHead: transitionDigest(last) };
}

test('the two-leg happy path: maker concludes terminal, the pair releases, the checker opens with the verified ref', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile()], { store }));
  const { makerId, makerHead } = await makerConcluded(handles, store);

  // A non-final-leg confirmed is TERMINAL by the derivation — the C1 hold releases:
  assert.equal(await store.findNonTerminal('test.twoleg.v1', SUBJECT), null);

  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;

  // KEY-SET PIN on the successor's opened snapshot (SPEC §4): the five base keys plus
  // the two evidence keys, present together — and nothing else.
  const successorChain = await store.readChain(opened.value.recordId);
  const genesis = successorChain[0];
  assert.ok(genesis !== undefined);
  assert.deepEqual(Object.keys(genesis.payload as object).sort(), [
    'contentDigest',
    'legId',
    'priorLegActors',
    'priorRecordRefs',
    'profileDigest',
    'profileId',
    'subjectRef',
  ]);
  const payload = genesis.payload as {
    priorRecordRefs: { recordId: string; chainHead: string; legId: string }[];
    priorLegActors: { principal: string; authority: string }[];
  };
  // The recorded three-field form — the library ADDED the legId it verified:
  assert.deepEqual(payload.priorRecordRefs, [
    { recordId: makerId, chainHead: makerHead, legId: 'maker-decide' },
  ]);
  // The derived actor is the maker leg's finalizing identity, paired by index:
  assert.deepEqual(payload.priorLegActors, [
    { principal: 'approver:1', authority: 'session:test-app' },
  ]);
  // And replay folds both onto the record:
  const rec = await handles.operator.getRecord(opened.value.recordId);
  assert.deepEqual(rec?.priorRecordRefs, payload.priorRecordRefs);
  assert.deepEqual(rec?.priorLegActors, payload.priorLegActors);

  // The checker leg concludes the decision:
  const done = await handles.operator.finalize(opened.value.recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
});

test('open() refuses prior-leg-unverified for every bad reference, and no record is created', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile()], { store }));
  const { makerId, makerHead } = await makerConcluded(handles, store);

  async function openChecker(opts: Parameters<typeof handles.operator.open>[1]) {
    const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
    assert.equal(staged.status, 'ok');
    if (staged.status !== 'ok') throw new Error('unreachable');
    return handles.operator.open(staged.value.stagedRef, opts);
  }

  // No refs at all for a successor:
  let out = await openChecker(undefined);
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');
  // Too many:
  out = await openChecker({
    priorRecordRefs: [
      { recordId: makerId, chainHead: makerHead },
      { recordId: makerId, chainHead: makerHead },
    ],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');
  // Unknown recordId:
  out = await openChecker({
    priorRecordRefs: [{ recordId: 'rec-none', chainHead: makerHead }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');
  // Head mismatch:
  out = await openChecker({
    priorRecordRefs: [{ recordId: makerId, chainHead: `sha256:${'f'.repeat(64)}` }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');

  // NO successor record was created by any of the refusals — the pair still has no
  // non-terminal holder and no due entries beyond none:
  assert.equal(await store.findNonTerminal('test.twoleg.v1', SUBJECT), null);
});

test('a first leg supplying refs refuses prior-leg-unverified — §10.1 names it a sequencing error', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile()], { store }));
  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'maker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: 'rec-any', chainHead: `sha256:${'a'.repeat(64)}` }],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'prior-leg-unverified');
});

test('a still-open, an expired, and a refused-terminal prior each refuse prior-leg-unverified', async () => {
  // still-open — the maker has not concluded:
  const storeA = new MemoryStore();
  const a = create(makeConfig([twoLegProfile()], { store: storeA }));
  const openMaker = await openRecord(a, CONTENT, 'test.twoleg.v1', SUBJECT, 'maker-decide');
  const openChain = await storeA.readChain(openMaker);
  const openLast = openChain.at(-1);
  assert.ok(openLast !== undefined);
  let staged = await a.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  let out = await a.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: openMaker, chainHead: transitionDigest(openLast) }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');

  // expired — the maker lapsed and finalize resolved it en passant:
  const clock = { t: Date.UTC(2026, 0, 1) };
  const storeB = new MemoryStore();
  const b = createWithClock(makeConfig([twoLegProfile()], { store: storeB }), () => new Date(clock.t));
  const lapsedMaker = await openRecord(b, CONTENT, 'test.twoleg.v1', SUBJECT, 'maker-decide');
  clock.t += 400 * 3600_000;
  const lapsed = await b.operator.finalize(lapsedMaker, identity(), CONTENT, facts());
  assert.equal(lapsed.status, 'refused', 'fixture: the lapsed maker resolves to expired');
  const expiredChain = await storeB.readChain(lapsedMaker);
  const expiredLast = expiredChain.at(-1);
  assert.ok(expiredLast !== undefined);
  assert.equal(expiredLast.kind, 'expired');
  staged = await b.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  out = await b.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: lapsedMaker, chainHead: transitionDigest(expiredLast) }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');

  // refused-terminal — the maker leg lists content-drift terminal and drifts:
  const storeC = new MemoryStore();
  const drifting = twoLegProfile();
  const makerLeg = drifting.legs[0];
  assert.ok(makerLeg !== undefined);
  drifting.legs[0] = { ...makerLeg, terminalRefusals: ['content-drift'] };
  const c = create(makeConfig([drifting], { store: storeC }));
  const draftId = await openRecord(c, CONTENT, 'test.twoleg.v1', SUBJECT, 'maker-decide');
  const drifted = await c.operator.finalize(draftId, identity(), { subject: 'week-1', total: 99 }, facts());
  assert.equal(drifted.status, 'refused', 'fixture: drifted content refuses terminal');
  const refusedChain = await storeC.readChain(draftId);
  const refusedLast = refusedChain.at(-1);
  assert.ok(refusedLast !== undefined);
  assert.equal(refusedLast.kind, 'refused');
  staged = await c.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  out = await c.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: draftId, chainHead: transitionDigest(refusedLast) }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');
});

test('a wrong-profile and a wrong-subject prior each refuse prior-leg-unverified', async () => {
  const store = new MemoryStore();
  const handles = create(
    makeConfig([twoLegProfile(), twoLegProfile({ id: 'test.twoleg.other.v1' })], { store }),
  );
  // wrong profile: a maker concluded under the OTHER profile id, same subject:
  const other = await makerConcluded(handles, store, 'test.twoleg.other.v1');
  let staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  let out = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: other.makerId, chainHead: other.makerHead }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');

  // wrong subject: a maker concluded for a DIFFERENT subject under the same profile:
  const otherSubject = await openRecord(handles, CONTENT, 'test.twoleg.v1', 'subject:ml-2', 'maker-decide');
  const done = await handles.operator.finalize(otherSubject, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const chain = await store.readChain(otherSubject);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  out = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: otherSubject, chainHead: transitionDigest(last) }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');
});

test('a three-leg profile: refs out of leg order refuse; in order they verify', async () => {
  const store = new MemoryStore();
  const threeLeg: ConfirmProfile = {
    ...twoLegProfile({ id: 'test.threeleg.v1' }),
    legs: [
      { id: 'maker-decide', allowedAuthorities: ['session:test-app'] },
      { id: 'checker-decide', allowedAuthorities: ['session:test-app'] },
      { id: 'signer-decide', allowedAuthorities: ['session:test-app'] },
    ],
  };
  const handles = create(makeConfig([threeLeg], { store }));
  const maker = await makerConcluded(handles, store, 'test.threeleg.v1');
  // The middle leg is itself a successor — it opens WITH the maker ref:
  const stagedChecker = await handles.agent.stage(CONTENT, 'test.threeleg.v1', SUBJECT, 'checker-decide');
  assert.equal(stagedChecker.status, 'ok');
  if (stagedChecker.status !== 'ok') return;
  const checkerOpened = await handles.operator.open(stagedChecker.value.stagedRef, {
    priorRecordRefs: [{ recordId: maker.makerId, chainHead: maker.makerHead }],
  });
  assert.equal(checkerOpened.status, 'ok', 'fixture: the middle leg opens with the maker ref');
  if (checkerOpened.status !== 'ok') return;
  const checkerId = checkerOpened.value.recordId;
  const done = await handles.operator.finalize(checkerId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const checkerChain = await store.readChain(checkerId);
  const checkerLast = checkerChain.at(-1);
  assert.ok(checkerLast !== undefined);
  const checkerHead = transitionDigest(checkerLast);

  const staged = await handles.agent.stage(CONTENT, 'test.threeleg.v1', SUBJECT, 'signer-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  // Out of order — [checker, maker] where the profile declares [maker, checker]:
  const reversed = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [
      { recordId: checkerId, chainHead: checkerHead },
      { recordId: maker.makerId, chainHead: maker.makerHead },
    ],
  });
  assert.equal(reversed.status, 'refused');
  if (reversed.status === 'refused') assert.equal(reversed.code, 'prior-leg-unverified');

  // In order — verifies, and the recorded refs carry both legIds in order:
  const staged2 = await handles.agent.stage(CONTENT, 'test.threeleg.v1', SUBJECT, 'signer-decide');
  assert.equal(staged2.status, 'ok');
  if (staged2.status !== 'ok') return;
  const opened = await handles.operator.open(staged2.value.stagedRef, {
    priorRecordRefs: [
      { recordId: maker.makerId, chainHead: maker.makerHead },
      { recordId: checkerId, chainHead: checkerHead },
    ],
  });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;
  const rec = await handles.operator.getRecord(opened.value.recordId);
  assert.deepEqual(
    rec?.priorRecordRefs?.map((r) => r.legId),
    ['maker-decide', 'checker-decide'],
  );
});
```

In `helpers/profiles.ts`, add after `effectSeamProfile`:

```ts
/**
 * A two-leg maker-checker profile (SPEC §10.1, first step-4 increment): ordered legs
 * `maker-decide` then `checker-decide`, capture-mode, no redeem block. Multi-leg
 * construction is accepted as of the first step-4 increment (the sequencing rung and the
 * verify-by-replay reference check land with the lift); per-leg `sod`/`proposer` remain
 * GOVERNED until the second step-4 increment.
 */
export function twoLegProfile(overrides: ProfileOverrides = {}): ConfirmProfile {
  return {
    id: overrides.id ?? 'test.twoleg.v1',
    subject: { canonicalizerRef: overrides.canonicalizerRef ?? DEFAULT_CANONICALIZER_REF },
    legs: [
      { id: 'maker-decide', allowedAuthorities: ['session:test-app'] },
      { id: 'checker-decide', allowedAuthorities: ['session:test-app'] },
    ],
    captureMode: 'staged',
    expiry: resolveExpiry(overrides),
  };
}
```

and give `openRecord` an optional trailing `legId?: string` passed straight to
`handles.agent.stage(content, profileId, subjectRef, legId)` (update its doc comment: the
finalize suites' single-leg call sites are untouched — the parameter is optional).

- [ ] **Step 2: Run to verify failure**

Run: `pnpm exec vitest run packages/record/test/multi-leg.test.ts packages/record/test/construction-validation.test.ts`
Expected: the acceptance pin FAILS (guard still throws); every new multi-leg.test.ts test
FAILS at `create()` (GOVERNED legs throw) or at `open()` (opts loop throws for
priorRecordRefs).

- [ ] **Step 3: Implement**

1. `config.ts`:
   - Delete the `legs.length > 1` GOVERNED block; renumber the validateProfile doc
     comment's ordered list.
   - Reword the zero-legs structural error to "at least one leg is required (found 0)".
   - Add the unique-ids structural check after the zero-legs check:

```ts
  const seenLegIds = new Map<string, number>();
  for (const [index, leg] of profile.legs.entries()) {
    const first = seenLegIds.get(leg.id);
    if (first !== undefined) {
      throw new Error(
        `invalid profile '${profile.id}': duplicate leg id '${leg.id}' at positions ${first} and ${index} — ` +
          'SPEC §10.1 keys recorded evidence by legId, so leg ids must be unique',
      );
    }
    seenLegIds.set(leg.id, index);
  }
```

   - Add `PriorRecordRef` and reshape `OpenOptions` (REPLACING the `Record<string,
     never>` declaration and rewriting its doc block — the unreachable-in-practice
     argument dies with the lift; the runtime guard in open.ts still backstops unknown
     keys for plain-JavaScript callers):

```ts
/** A host-supplied prior-leg reference (SPEC §10.1): the claim `open()` verifies by
 * replay — never adopted unchecked. The recorded three-field form (types.ts's
 * `RecordedPriorLegRef`) is what the verified snapshot carries. */
export interface PriorRecordRef {
  recordId: string;
  chainHead: Digest;
}

export interface OpenOptions {
  /** SPEC §9 / §10.1: one entry per prior leg, in leg order, on a successor leg's
   * open(). A first leg supplies none. Verified by replay; any failure refuses
   * `prior-leg-unverified` pre-record. */
  priorRecordRefs?: PriorRecordRef[];
  // `policyDigest` (§10.3) and `supersedes` (§2) remain GOVERNED at the call seam
  // (kernel/open.ts's runtime guard) — their build steps have not arrived.
}
```

     (`Digest` import joins config.ts's imports from `./types.js` if not present.)
2. `kernel/open.ts`:
   - `openOptionMessage` loses its `priorRecordRefs` arm; its fallback message rewords to
     name that `open()` accepts only `priorRecordRefs` in this build.
   - The opts loop skips the real key:

```ts
  if (opts !== undefined) {
    for (const key of Object.keys(opts)) {
      if (key === 'priorRecordRefs') continue; // REAL as of the first step-4 increment
      throw new Error(openOptionMessage(key));
    }
  }
```

   - The sequencing rung, after the `legIndex` check (`unknown-leg`) and before the
     `recordId` mint:

```ts
  // --- §10.1 sequencing (first step-4 increment): verify prior-leg references BEFORE
  // the record exists. "open() enforces the sequencing before it creates the successor
  // record" — so a bad reference refuses `prior-leg-unverified` (pre-record, NO append)
  // even when a C1 blocker also holds the pair, and the blocker path below is never
  // reached with unverified references.
  const priorCheck = await verifyPriorLegs(
    store,
    resolved,
    legIndex,
    staged.subjectRef,
    opts?.priorRecordRefs,
  );
  if (!priorCheck.ok) {
    return refused('prior-leg-unverified');
  }
```

     (`import { verifyPriorLegs } from './prior-legs.js';` joins the imports.)
   - The payload gains the evidence keys (present together or not at all — §4):

```ts
  const openedPayload: {
    profileId: string;
    profileDigest: string;
    legId: string;
    subjectRef: string;
    contentDigest: string;
    priorRecordRefs?: RecordedPriorLegRef[];
    priorLegActors?: IdentityAssertion[];
  } = {
    profileId: staged.profileId,
    profileDigest: profileDigest(profile),
    legId: staged.legId,
    subjectRef: staged.subjectRef,
    contentDigest: staged.contentDigest,
    // policyDigest: omitted — no policySource in this build (GOVERNED-throw-guarded;
    // SPEC §4's opened payload).
  };
  if (priorCheck.verified !== null) {
    // SPEC §4: the recorded three-field form and the library-derived actors, present
    // together on a multi-leg successor; a first leg and every single-leg record omit
    // both, keeping undeclaring chains byte-identical.
    openedPayload.priorRecordRefs = priorCheck.verified.priorRecordRefs;
    openedPayload.priorLegActors = priorCheck.verified.priorLegActors;
  }
```

     (type imports for `RecordedPriorLegRef`/`IdentityAssertion` join the `types.js`
     import.)
3. `helpers/profiles.ts`: `twoLegProfile` + `openRecord`'s `legId?` (Step 1's shapes).
4. Two-touch finalization: `refusal-codes.ts`'s `prior-leg-unverified` producer comment
   and `refusal-matrix.test.ts`'s section wording go present-tense — the rung is real
   from this commit ("consumed by open()'s sequencing rung" without "landing later").

- [ ] **Step 4: Run tests, gates, commit**

Run the two named files, then `pnpm test` (zero skips — single-leg suites must be
untouched by the openRecord parameter default), all five gates. Commit (Bash):

```bash
git add -A packages/record
git commit -m "Lift the legs guard with the sequencing built: no successor opens unverified

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Interplay and posture pins

**Files:**
- Test: `packages/record/test/multi-leg.test.ts` (extend; no src edits expected — any
  src change discovered here is a finding to report, not to silently land)

**Interfaces:**
- Consumes: everything Tasks 1-2 landed; `seal()`; the redemption seams; the clock
  module's behavior at open()'s blocker path.

- [ ] **Step 1: Write the tests (these pin EXISTING behavior — most should pass on first run; a failure is a real finding)**

```ts
test('a sealed prior still verifies — §10.1: state, not status, is the check', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile()], { store }));
  const { makerId, makerHead } = await makerConcluded(handles, store);
  const sealed = await handles.operator.seal(makerId);
  assert.equal(sealed.status, 'ok', 'fixture: a terminal maker seals');
  if (sealed.status !== 'ok') return;
  assert.equal(sealed.value.status, 'retired');

  // The seal() append moved the chain head — the reference must claim the CURRENT head:
  const chain = await store.readChain(makerId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: transitionDigest(last) }],
  });
  assert.equal(opened.status, 'ok', 'a sealed prior replays confirmed and verifies');

  // And the PRE-seal head no longer verifies (head equality is against the recomputed
  // current head) — the stale-head shape:
  const staged2 = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged2.status, 'ok');
  if (staged2.status !== 'ok') return;
  const stale = await handles.operator.open(staged2.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(stale.status, 'refused');
  if (stale.status === 'refused') assert.equal(stale.code, 'prior-leg-unverified');
});

test('the destroyed-prior stand-in: a reference into a store that lacks the chain refuses', async () => {
  // No destroy seam exists in this build (§13 retention is the host's); the nearest
  // constructible shape is a fresh store that never held the prior — named as the
  // stand-in for §10.1's "a destroyed one does not".
  const emptyStore = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile()], { store: emptyStore }));
  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: 'rec-destroyed', chainHead: `sha256:${'d'.repeat(64)}` }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');
});

test('a two-leg EFFECT-SEAM profile: maker confirmed is terminal, checker confirmed awaits redemption', async () => {
  const store = new MemoryStore();
  const effectTwoLeg: ConfirmProfile = {
    ...twoLegProfile({ id: 'test.twoleg.effect.v1' }),
    redeem: { confirmToRedeem: 3600, redeemBound: 86400 },
  };
  const handles = create(makeConfig([effectTwoLeg], { store }));
  const { makerId, makerHead } = await makerConcluded(handles, store, 'test.twoleg.effect.v1');
  // NON-final leg + effect seam: still terminal — the derivation keys on finalLeg:
  assert.equal(await store.findNonTerminal('test.twoleg.effect.v1', SUBJECT), null);

  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.effect.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;
  const done = await handles.operator.finalize(opened.value.recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  // FINAL leg + effect seam: non-terminal, awaiting redemption — the hold is real:
  assert.equal(
    await store.findNonTerminal('test.twoleg.effect.v1', SUBJECT),
    opened.value.recordId,
  );
  const redeemed = await handles.operator.redeem(opened.value.recordId, CONTENT);
  assert.equal(redeemed.status, 'ok', 'the direct shape releases the final leg');
});

test('gate order: unknown-leg outranks prior-leg-unverified at open()', async () => {
  // The open()-side unknown-leg producer is the staged-legId RE-check: stage under a
  // config whose profile knows the leg, open under a second create() sharing the store
  // whose same-id profile renamed its legs (the established two-instance shape).
  const store = new MemoryStore();
  const stagingSide = create(makeConfig([twoLegProfile()], { store }));
  const staged = await stagingSide.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;

  const renamed = twoLegProfile();
  renamed.legs = [
    { id: 'maker-decide', allowedAuthorities: ['session:test-app'] },
    { id: 'checker-renamed', allowedAuthorities: ['session:test-app'] },
  ];
  const openingSide = create(makeConfig([renamed], { store }));
  const out = await openingSide.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: 'rec-any', chainHead: `sha256:${'a'.repeat(64)}` }],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'unknown-leg', 'the staged-legId re-check precedes sequencing');
});

test('gate order: prior-leg-unverified outranks the C1 blocker path — and no clock edge lands on the blocker', async () => {
  const clock = { t: Date.UTC(2026, 0, 1) };
  const store = new MemoryStore();
  const handles = createWithClock(makeConfig([twoLegProfile()], { store }), () => new Date(clock.t));
  // A maker record left OPEN holds the pair; let its open window lapse:
  const makerId = await openRecord(handles, CONTENT, 'test.twoleg.v1', SUBJECT, 'maker-decide');
  clock.t += 400 * 3600_000;
  const before = (await store.readChain(makerId)).length;

  // A checker open with a BAD ref (the still-open maker cannot verify): sequencing
  // refuses pre-record, so the genesis append never happens, the exclusivity conflict
  // never fires, and the due-open blocker is NOT resolved en passant here.
  const makerChain = await store.readChain(makerId);
  const makerLast = makerChain.at(-1);
  assert.ok(makerLast !== undefined);
  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: transitionDigest(makerLast) }],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'prior-leg-unverified');
  assert.equal((await store.readChain(makerId)).length, before, 'no edge on the blocker');
});

test('verified references do not bypass C1: a live successor still blocks a second one', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile()], { store }));
  const { makerId, makerHead } = await makerConcluded(handles, store);
  const staged1 = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged1.status, 'ok');
  if (staged1.status !== 'ok') return;
  const first = await handles.operator.open(staged1.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(first.status, 'ok');

  const staged2 = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged2.status, 'ok');
  if (staged2.status !== 'ok') return;
  const second = await handles.operator.open(staged2.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(second.status, 'refused');
  if (second.status !== 'refused') return;
  assert.equal(second.code, 'record-exists', 'good refs verify but the live checker holds the pair');
});

test('single-leg chains stay byte-shaped: the opened payload key set gains nothing', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const chain = await store.readChain(recordId);
  const genesis = chain[0];
  assert.ok(genesis !== undefined);
  assert.deepEqual(Object.keys(genesis.payload as object).sort(), [
    'contentDigest',
    'legId',
    'profileDigest',
    'profileId',
    'subjectRef',
  ]);
});
```

(`DEFAULT_SUBJECT_REF` import joins the helpers import if not already present.)

- [ ] **Step 2: Run, judge, fix only test-side**

Run: `pnpm exec vitest run packages/record/test/multi-leg.test.ts`
Expected: PASS — these pin behavior Tasks 1-2 and earlier increments already built. A
FAILURE here is a real finding: report it (BLOCKED or DONE_WITH_CONCERNS naming the
divergence); do not silently change src to make a pin pass.

- [ ] **Step 3: Full suite, gates, commit**

```bash
git add packages/record/test/multi-leg.test.ts
git commit -m "Pin the postures: sealed priors verify, C1 still holds, single-leg bytes stand still

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: The record — step 4 started

**Files:**
- Modify: `docs/process/implementation-status.md`
- Modify: `CLAUDE.md`, `README.md`
- Modify: stale comments the sweep finds (src + test)
- No register edits expected (verify by reading `docs/process/deferral-register.md`;
  nothing new defers — the second step-4 increment is sequenced work, not a deferral)

**Interfaces:** consumes everything Tasks 1-3 landed; the spec's §7 ("The record") is
this task's checklist — read the spec in full first, and verify every claim against the
CODE as it stands, never against task reports.

- [ ] **Step 1: implementation-status.md**

Content requirements (match on content — line numbers drift):
- **Steps table**: step 4 → **Started** — first of two increments landed (sequencing +
  verify-by-replay references), the second (the SoD gate: `sod.notActorOf`, `proposer`,
  `sod-violation`) named as remaining.
- **§10.1 row**: the sequencing half built — legs conclude in order, `open()` verifies
  every reference by replay (the six conditions), the opened snapshot carries the
  recorded three-field refs + derived actors; the AL1 window on that evidence recorded
  beside it (the genesis IS the head until the successor's next append; detached signing
  is the named upgrade, a later build step); the gate half NOT built — `sod`/`proposer`
  still throw at construction, `sod-violation` does not exist, nothing at `finalize()`
  reads `priorLegActors` yet.
- **§8 row**: fifteen codes; `prior-leg-unverified` pre-record never-append with its
  producer (`kernel/prior-legs.ts` via `open()`'s sequencing rung); the two count pins
  at 15.
- **§9 row**: `open()`'s options bag carries its first real key (`priorRecordRefs`);
  `policyDigest`/`supersedes` still guarded at the seam.
- **§4 row**: the opened snapshot's profile-conditional evidence keys now have a
  producer; single-leg chains byte-identical (the key-set pin named).
- **The governed count**: 10 → 9, the movement named (the `legs` guard lifted with the
  sequencing built; `sod`/`proposer` remain).
- The construction inversions recorded as authorized with their in-place notes cited
  (the legs acceptance pin; the reworded zero-legs structural message).

- [ ] **Step 2: CLAUDE.md + README.md**

- CLAUDE.md's project paragraph: step 4 started, first of two increments (the clocks
  paragraph's "Step 4 ... is next" claim updates); the feature-guard paragraph: nine
  governed fields with the movement named; the multi-leg lift and what still throws.
  Verify the "five of the eight build-order steps remain unstarted" sentence — it
  counted steps 4-8, and step 4 is now STARTED: it must become four (steps 5-8), stated
  accurately.
- README's step rows: same movement.

- [ ] **Step 3: The sweep**

```bash
git grep -nE "multi-leg|single-leg|only single-leg profiles|exactly one leg|at least one leg|Record<string, never>|unreachable in practice|no profile that could|first step-4|second step-4|landing later|this increment|later increment|ten governed|nine governed" -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
git grep -nE "prior-leg|priorRecordRefs|priorLegActors|maker-checker" -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
```

Judge EVERY hit (still-true / fixed-by-earlier-tasks / fix-now / historical-leave-alone);
the hit-list with verdicts is REQUIRED in your report. Known targets the sweep must
confirm fixed or judge:
- `config.ts`'s OpenOptions doc block (rewritten at the lift — verify no
  "unreachable in practice" survivor);
- `kernel/open.ts`'s `openOptionMessage` fallback ("open() accepts no options in this
  build" is FALSE after the lift — must have been reworded at the lift; verify);
- `agent-surface.ts:15`'s "single-leg call sites stay byte-compatible" (still true —
  judge and record);
- `kernel/stage.ts`'s named-or-first comments (judge: still true multi-leg — the
  named-leg path is now the multi-leg staple);
- `refusal-codes.ts`'s two-touch producer wording (finalized at the lift — verify no
  "landing later" survivor);
- `types.ts`'s RecordState/TransitionKind comments (no change expected — judge);
- CLAUDE.md's own prior-increment sentences about step 4 being next.
END-OF-INCREMENT OWN-COMMENT PASS: `git diff a232e3c..HEAD -- packages | grep -nE "later in the first step-4|landing later"`
— judge every hit of this increment's own comments that later tasks made stale.

- [ ] **Step 4: Verify quotes, gates, commit**

Hand-verify every quoted SPEC phrase in the touched markdown against a
whitespace-collapsed reading of docs/concept/SPEC.md (quotes wrap line breaks there). All
five gates (contract-scan gates the markdown too). Commit (Bash):

```bash
git add -A
git commit -m "Record step 4 started: the order is enforced, the evidence is chained, the gate is next

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Exit verification

**Files:** none modified (fixes only if a gate fails).

- [ ] **Step 1: Clean-tree gates**

Fresh PowerShell (`$env:PATH = "$env:APPDATA\npm;$env:PATH"`), `git status --porcelain`
empty, `git branch --show-current` = main, then in order: `pnpm typecheck` · `pnpm lint`
· `pnpm lint:strict` · `pnpm test` · `node scripts/contract-scan.mjs`. Capture exact
test/file counts and the zero-skip evidence.

- [ ] **Step 2: Freeze verification**

```bash
git diff a232e3c..HEAD -- packages/record/test/byte-stability.test.ts   # MUST be empty
git diff a232e3c..HEAD -- packages/record/src/chain/encoding.ts          # MUST be empty
git diff a232e3c..HEAD -- packages/record/src/store/                     # MUST be empty
```

Characterize any non-empty result as BLOCKED and report.

- [ ] **Step 3: Report**

The increment's commit list one per line (`git log --oneline 71af9c1..HEAD` — 71af9c1 is
the spec commit; a232e3c its signature amendment), exact counts (never carried forward as
claims), register rows live (verify by reading the file), step-4-Started confirmation
(read the status doc's table), and `git status -sb`'s ahead count for the user-gated
push.
