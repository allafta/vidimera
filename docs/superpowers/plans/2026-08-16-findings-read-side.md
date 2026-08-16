# Findings Read Side Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land SPEC §10.2's read half, all dead-until-producer — `ack-missing`/`ack-stale`
(21st/22nd codes), the replay folds replacing the two throwing arms, the recorded
Finding/Ack shapes, the counting-ack predicate + coverage derivation
(`kernel/findings.ts`), and the digest-only findings projection on
`DecisionRecord`/`ReviewView` — as the first of two step-7 increments.

**Architecture:** Codes first (inert). Then one commit lands the shapes, the replay
arms with their storage-fault throws, the pure predicate module, and the review
projection — every piece exercisable only over hand-built chains, since no seam mints
either kind until the second step-7 increment. No guard lifts; no fail-open window
exists. Step 7 moves to Started.

**Tech Stack:** TypeScript strict (pnpm workspace, Node >=22.16), vitest, Biome. No new
runtime APIs — the floor does not move.

**Spec:** `docs/superpowers/specs/2026-08-16-findings-read-side-design.md` — read it
before your task; its "Rulings taken" section is binding, and its §2/§4 code blocks are
transcribed verbatim.

## Global Constraints

- **Shell**: PowerShell for pnpm (`$env:PATH = "$env:APPDATA\npm;$env:PATH"` FIRST in
  EVERY fresh shell). **Git commits via the Bash tool**, ordinary multi-line `-m`.
  `git branch --show-current` must print `main` before any commit; else STOP, BLOCKED.
- **The five gates** before each task's final commit: `pnpm typecheck` · `pnpm lint` ·
  `pnpm lint:strict` · `pnpm test` (zero skips) · `node scripts/contract-scan.mjs`
  (prints nothing, exits 0).
- **Frozen surfaces**: `packages/record/test/byte-stability.test.ts`,
  `packages/record/src/chain/encoding.ts`, and ALL of `packages/record/src/store/` must
  not appear in any diff of this increment. **`docs/concept/` is SEALED this increment**
  (the marker moves at the SECOND step-7 increment's exit, not here).
- `docs/superpowers/`/`docs/analysis/` historical leave-alone.
- **No external URLs/project names.** Committed TS comments: no "slice"/"design" words
  (except `.slice()` / "by design"), no `Task N` pointers, no bare 7-40-char hex.
  Explicit increment naming ("the first step-7 increment" / "the second step-7
  increment"), never bare "this increment". ASCII apostrophes. A double-quoted phrase
  right after a `SPEC §N` citation must occur verbatim (whitespace-collapsed, backticks
  ignored) in docs/concept/SPEC.md.
- **Plan-authored comments truthful at the commit that lands them** (two-touch;
  finalization items belong to the SECOND increment's plan). **A mandated RED run is
  EXECUTED; a substitution is STATED.** Every code identifier written into docs is
  verified against the tree first.
- **Counts stated with the movement named** (codes 20 → 22; the governed count does NOT
  move — stated explicitly).
- **Enlisted-branch check, visibly run**: nothing here touches a seam at all — stated.
- Narrow runs: `pnpm exec vitest run packages/record/test/<file>.test.ts` from repo
  root.

---

### Task 1: The twenty-first and twenty-second codes (inert)

**Files:**
- Modify: `packages/record/src/refusal-codes.ts` (union + REGISTRY — default `appendsOn`
  path)
- Modify: `packages/record/test/outcome-model.test.ts` and
  `packages/record/test/refusal-matrix.test.ts` (count pins 20→22; two new sections)

**Interfaces:**
- Produces: `'ack-missing'` and `'ack-stale'` in `RefusalCode`, both class `'refusal'`.

- [ ] **Step 1: Write the failing tests**

Bump the two count pins 20 → 22 ("twenty" → "twenty-two"; the matrix arithmetic — read
both files first, match on content). Add TWO matrix sections (`content-drift`-shape
each), quoting §8's row — "`refusal`-class, `terminalRefusals`-able, open-by-default" —
with producers worded two-touch: finalize's ack-coverage rung, landing in the second
step-7 increment.

- [ ] **Step 2: Run to verify failure — EXECUTE it**

Run: `pnpm exec vitest run packages/record/test/outcome-model.test.ts packages/record/test/refusal-matrix.test.ts`
Expected: FAIL — the union has 20 members. Capture output.

- [ ] **Step 3: Implement**

`refusal-codes.ts`: `| 'ack-missing' | 'ack-stale'` join the union with one shared
comment block (SPEC §8's conditional-table row quoted; `ack-missing` = no ack at all
for a required-kind finding, `ack-stale` = acks present but none counting — §10.2's
gate distinction; producers two-touch); both `'refusal'` in `REGISTRY`. `NEVER_APPENDS`
untouched.

- [ ] **Step 4: Run tests, gates, commit**

Run the two named files (PASS), `pnpm test` (PASS), all five gates. Commit (Bash tool):

```bash
git add packages/record/src/refusal-codes.ts packages/record/test/outcome-model.test.ts packages/record/test/refusal-matrix.test.ts
git commit -m "The twenty-first and twenty-second codes: coverage has two ways to fail

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: The shapes, the folds, the predicate, the projection — one commit

**Files:**
- Modify: `packages/record/src/types.ts` (the spec §2 block VERBATIM: the two payload
  interfaces + `RecordedAck`/`RecordedFinding`; `DecisionRecord.findings?`;
  `ReviewView.findings?` — see Step 3 for its exact shape)
- Modify: `packages/record/src/chain/replay.ts` (the two arms replacing the throws; the
  doc-comment's throws/emitted sentences update truthfully)
- Create: `packages/record/src/kernel/findings.ts` (the spec §4 block's two functions,
  implemented)
- Modify: `packages/record/src/kernel/review.ts` (the projection integration)
- Test: create `packages/record/test/findings.test.ts`

**Interfaces:**
- Consumes: Task 1's codes (comments only — nothing raises them yet); `buildChain`
  (`test/helpers/chain.ts`); `MemoryStore`; `create`/`makeConfig`/`captureProfile`.
- Produces (the second step-7 increment relies on these EXACT shapes):
  `FindingRaisedPayload`/`AcknowledgedPayload`/`RecordedAck`/`RecordedFinding`
  (types.ts, the spec §2 block); `ackCounts(finding, ack, ackMode)` and
  `findingCoverage(findings, ackMode, requiredAcks)` returning
  `{ finding, coverage }[]` with `FindingCoverage = 'covered' | 'ack-missing' |
  'ack-stale' | 'not-required'` (kernel/findings.ts, the spec §4 block);
  `DecisionRecord.findings?: RecordedFinding[]`.

- [ ] **Step 1: Write the failing tests**

Create `packages/record/test/findings.test.ts`:

```ts
// @vidimera/record — findings.test.ts (SPEC §10.2 "Findings & acknowledgments", the
// READ half; the first step-7 increment): the replay folds, the counting-ack predicate,
// the coverage derivation, and the review projection — every chain here is HAND-BUILT
// (buildChain + a seeded store), because no seam mints `finding-raised`/`acknowledged`
// until the second step-7 increment lands raiseFinding/acknowledge with the gate and
// the lift. Digest-only throughout: finding content never appears (§3).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { replay } from '../src/chain/replay.js';
import { ackCounts, findingCoverage } from '../src/kernel/findings.js';
import { MemoryStore } from '../src/store/memory.js';
import { create } from '../src/create.js';
import type { RecordedAck, RecordedFinding } from '../src/types.js';
import { buildChain } from './helpers/chain.js';
import { captureProfile, makeConfig } from './helpers/profiles.js';

const SUBJECT = 'subject:fnd-1';
const D1 = `sha256:${'1'.repeat(64)}`;
const D2 = `sha256:${'2'.repeat(64)}`;
const RAISER = { principal: 'checker:1', authority: 'mtls:checker' };
const OTHER = { principal: 'approver:2', authority: 'session:test-app' };

function openedStep(profileId = 'test.capture.v1') {
  return {
    kind: 'opened' as const,
    payload: {
      profileId,
      profileDigest: `sha256:${'0'.repeat(64)}`,
      legId: 'approver-decide',
      subjectRef: SUBJECT,
      contentDigest: `sha256:${'c'.repeat(64)}`,
    },
  };
}
function raise(findingId: string, extra?: Record<string, unknown>) {
  return {
    kind: 'finding-raised' as const,
    payload: {
      findingId,
      kind: 'variance',
      findingDigest: D1,
      raiser: RAISER,
      ...extra,
    },
  };
}
function ackStep(findingId: string, extra?: Record<string, unknown>) {
  return {
    kind: 'acknowledged' as const,
    payload: { findingId, findingDigest: D1, acker: OTHER, ...extra },
  };
}

test('replay folds a raise, an update, and acks — first-raise order, current version, fidelity', () => {
  const chain = buildChain('rec-fnd-1', [
    openedStep(),
    raise('f-1'),
    raise('f-2', { magnitude: '250 SEK' }),
    ackStep('f-1'),
    // f-1 re-raised: digest, magnitude, and raiser all move to the new version; the
    // earlier ack now names a stale version (recorded, visibly non-counting — the
    // predicate's business, never replay's):
    {
      kind: 'finding-raised' as const,
      payload: { findingId: 'f-1', kind: 'variance', findingDigest: D2, raiser: OTHER },
    },
  ]);
  const record = replay(chain);
  assert.ok(record.findings !== undefined);
  assert.deepEqual(
    record.findings.map((f) => f.findingId),
    ['f-1', 'f-2'],
    'first-raise order survives the update',
  );
  const f1 = record.findings[0];
  assert.ok(f1 !== undefined);
  assert.deepEqual(
    Object.keys(f1).sort(),
    ['acks', 'findingDigest', 'findingId', 'kind', 'raiser'],
    'the projected finding key set — magnitude cleared by the update',
  );
  assert.equal(f1.findingDigest, D2, 'current version wins');
  assert.deepEqual(f1.raiser, OTHER, 'the raiser moves with the version');
  assert.equal('magnitude' in f1, false, 'an update without magnitude clears it');
  assert.equal(f1.acks.length, 1, 'the stale ack stays recorded — fidelity, not validity');
  assert.equal(record.state, 'open', 'neither kind moves state');
});

test('replay throws on chain shapes the seams forbid: a kind mutation; an ack to an absent findingId', () => {
  const kindMutation = buildChain('rec-fnd-2', [
    openedStep(),
    raise('f-1'),
    {
      kind: 'finding-raised' as const,
      payload: { findingId: 'f-1', kind: 'CHANGED', findingDigest: D2, raiser: RAISER },
    },
  ]);
  assert.throws(() => replay(kindMutation), /kind/i);

  const orphanAck = buildChain('rec-fnd-3', [openedStep(), ackStep('f-none')]);
  assert.throws(() => replay(orphanAck), /findingId|finding/i);
});

test('a findings-free record omits the key', () => {
  const plain = buildChain('rec-fnd-4', [openedStep()]);
  assert.equal('findings' in replay(plain), false);
});

test('ackCounts: current digest, magnitude both directions, principal-only ackMode, missing principal fails closed', () => {
  const finding: RecordedFinding = {
    findingId: 'f-1',
    kind: 'variance',
    findingDigest: D2,
    magnitude: '250 SEK',
    raiser: RAISER,
    acks: [],
  };
  const good: RecordedAck = { findingDigest: D2, magnitude: '250 SEK', acker: OTHER };
  assert.equal(ackCounts(finding, good, 'any'), true);
  assert.equal(ackCounts(finding, good, 'counterparty'), true);
  assert.equal(ackCounts(finding, good, 'self'), false, 'self demands the raiser principal');
  assert.equal(
    ackCounts(finding, { ...good, acker: RAISER }, 'self'),
    true,
    'the raiser acknowledging their own finding',
  );

  // Stale digest never counts:
  assert.equal(ackCounts(finding, { ...good, findingDigest: D1 }, 'any'), false);
  // Magnitude present-iff-present, BOTH directions, exact:
  assert.equal(ackCounts(finding, { findingDigest: D2, acker: OTHER }, 'any'), false);
  assert.equal(ackCounts(finding, { ...good, magnitude: '251 SEK' }, 'any'), false);
  const noMagnitude: RecordedFinding = { ...finding, magnitude: undefined };
  assert.equal(
    ackCounts(noMagnitude, good, 'any'),
    false,
    'an ack naming a magnitude the finding does not carry',
  );
  // Principal-only: the raiser's principal under a DIFFERENT authority is still the
  // raiser — a counterparty ack from it does NOT count (the fail-closed direction the
  // SoD gate established; here in the counting direction):
  assert.equal(
    ackCounts(finding, { ...good, acker: { ...RAISER, authority: 'session:other' } }, 'counterparty'),
    false,
  );
  // Missing/empty principal fails closed on either side:
  assert.equal(
    ackCounts(finding, { ...good, acker: { principal: '', authority: 'mtls:x' } }, 'any'),
    false,
  );
  assert.equal(
    ackCounts(
      { ...finding, raiser: { principal: '', authority: 'mtls:x' } },
      good,
      'counterparty',
    ),
    false,
  );
});

test('findingCoverage: not-required never gates; ack-missing vs ack-stale; covered; the undeclared flow; order', () => {
  const covered: RecordedFinding = {
    findingId: 'f-a',
    kind: 'variance',
    findingDigest: D1,
    raiser: RAISER,
    acks: [{ findingDigest: D1, acker: OTHER }],
  };
  const unacked: RecordedFinding = {
    findingId: 'f-b',
    kind: 'variance',
    findingDigest: D1,
    raiser: RAISER,
    acks: [],
  };
  const staleOnly: RecordedFinding = {
    findingId: 'f-c',
    kind: 'variance',
    findingDigest: D2,
    raiser: RAISER,
    acks: [{ findingDigest: D1, acker: OTHER }],
  };
  const informational: RecordedFinding = {
    findingId: 'f-d',
    kind: 'note',
    findingDigest: D1,
    raiser: RAISER,
    acks: [],
  };

  const rows = findingCoverage([covered, unacked, staleOnly, informational], 'any', ['variance']);
  assert.deepEqual(
    rows.map((r) => [r.finding.findingId, r.coverage]),
    [
      ['f-a', 'covered'],
      ['f-b', 'ack-missing'],
      ['f-c', 'ack-stale'],
      ['f-d', 'not-required'],
    ],
  );

  // The undeclared flow classifies everything not-required (§10.2's vacuous-pass rule
  // falls out: zero non-covered entries):
  const undeclared = findingCoverage([unacked], undefined, undefined);
  assert.deepEqual(
    undeclared.map((r) => r.coverage),
    ['not-required'],
  );
  assert.deepEqual(findingCoverage(undefined, 'any', ['variance']), []);
});

test('the own-namespace pin: a finding kind named facts is LEGAL — reserved consultation kinds do not apply', () => {
  // SPEC §10.2: "the reserved consultation kinds do not apply to them".
  const chain = buildChain('rec-fnd-5', [
    openedStep(),
    {
      kind: 'finding-raised' as const,
      payload: { findingId: 'f-1', kind: 'facts', findingDigest: D1, raiser: RAISER },
    },
  ]);
  const record = replay(chain);
  assert.equal(record.findings?.[0]?.kind, 'facts');
});

test('review() projects the findings digest-only with per-finding coverage', async () => {
  const store = new MemoryStore();
  const chain = buildChain('rec-fnd-6', [openedStep(), raise('f-1'), ackStep('f-1')]);
  for (const [i, t] of chain.entries()) {
    const res = await store.appendTransition(i === 0 ? null : 'open', t, {
      nonTerminal: true,
    });
    assert.equal(res.appended, true, `fixture: seed append ${i} must land`);
  }
  const handles = create(makeConfig([captureProfile()], { store }));
  const view = await handles.operator.review('rec-fnd-6');
  assert.equal(view.status, 'ok');
  if (view.status !== 'ok') return;
  assert.ok(view.value.findings !== undefined);
  const row = view.value.findings[0];
  assert.ok(row !== undefined);
  assert.deepEqual(Object.keys(row).sort(), ['coverage', 'findingDigest', 'findingId', 'kind']);
  assert.equal(row.coverage, 'not-required', 'captureProfile declares no flow — conservative read');
  // Digest-only: no content field anywhere in the projection.
});
```

- [ ] **Step 2: Run to verify failure — EXECUTE it**

Run: `pnpm exec vitest run packages/record/test/findings.test.ts`
Expected: FAIL — `kernel/findings.js` does not exist; replay still throws on both kinds.
Capture output.

- [ ] **Step 3: Implement**

1. `types.ts`: the spec §2 block VERBATIM (the two payload interfaces, `RecordedAck`,
   `RecordedFinding`); `DecisionRecord` gains
   `findings?: RecordedFinding[]` (present iff the chain carries a raise — the §10.2
   byte-identity comment from the spec block); `ReviewView` gains

```ts
  /** SPEC §9's findings projection (§10.2), digest-only with per-finding coverage —
   * present iff the record has findings. Coverage is derived under THIS instance's
   * resolved leg; an unresolvable profile/leg classifies conservatively as
   * `not-required` (review is a pure read that never fails on config drift — the gate
   * at finalize is where an unconfigured profile refuses). */
  findings?: {
    findingId: string;
    kind: string;
    findingDigest: Digest;
    magnitude?: string;
    coverage: 'covered' | 'ack-missing' | 'ack-stale' | 'not-required';
  }[];
```

   The `TransitionKind` comment's "not yet finding-raised/acknowledged" sentence stays
   TRUE (the kernel still emits neither) — verify and leave.
2. `chain/replay.ts`: the two arms per the spec's §3 semantics —

```ts
      case 'finding-raised': {
        // SPEC §10.2 (first step-7 increment, the READ half): upsert by findingId —
        // a new id appends in first-raise order; an existing id is a content update,
        // moving findingDigest, magnitude (present-iff-present on the raise — an
        // update without magnitude clears it), and raiser to the new version's. A
        // re-raise changing `kind` cannot exist on an honest chain (the seam, landing
        // in the second step-7 increment, throws on it) — meeting one here is a
        // garbled or foreign chain, a storage/config fault (SPEC §8's loud-throw
        // posture), never a fold.
        const payload = transition.payload as FindingRaisedPayload;
        record.findings ??= [];
        const existing = record.findings.find((f) => f.findingId === payload.findingId);
        if (existing === undefined) {
          record.findings.push({
            findingId: payload.findingId,
            kind: payload.kind,
            findingDigest: payload.findingDigest,
            ...(payload.magnitude !== undefined ? { magnitude: payload.magnitude } : {}),
            raiser: payload.raiser,
            acks: [],
          });
        } else {
          if (existing.kind !== payload.kind) {
            throw new Error(
              `replay: finding '${payload.findingId}' re-raised with kind '${payload.kind}' over '${existing.kind}' — ` +
                'kind is immutable per findingId (SPEC §10.2); a garbled or foreign chain is a storage/config fault',
            );
          }
          existing.findingDigest = payload.findingDigest;
          if (payload.magnitude !== undefined) {
            existing.magnitude = payload.magnitude;
          } else {
            delete existing.magnitude;
          }
          existing.raiser = payload.raiser;
        }
        break;
      }
      case 'acknowledged': {
        // SPEC §10.2: an ack is recorded whether or not it will ever count — "recorded
        // and visibly non-counting (fidelity, not validity)"; counting is
        // kernel/findings.ts's ackCounts, consulted at review and (from the second
        // step-7 increment) at finalize's coverage rung, never here. An ack naming an
        // absent findingId cannot exist on an honest chain (the seam throws) — the
        // same storage-fault posture as the kind-mutation throw above.
        const payload = transition.payload as AcknowledgedPayload;
        const target = record.findings?.find((f) => f.findingId === payload.findingId);
        if (target === undefined) {
          throw new Error(
            `replay: acknowledgment names finding '${payload.findingId}' which the chain never raised — ` +
              'a garbled or foreign chain is a storage/config fault (SPEC §8)',
          );
        }
        target.acks.push({
          findingDigest: payload.findingDigest,
          ...(payload.magnitude !== undefined ? { magnitude: payload.magnitude } : {}),
          acker: payload.acker,
        });
        break;
      }
```

   (type imports join; the doc comment's "any other TransitionKind (`finding-raised`,
   `acknowledged`) is not yet emitted... `replay` THROWS" sentence rewrites truthfully:
   both kinds now FOLD, their kernel producers landing in the second step-7 increment;
   the default-arm throw remains for genuinely unknown kinds.)
3. Create `kernel/findings.ts`: the spec §4 block's two signatures, implemented —
   `ackCounts` checks digest equality, magnitude present-iff-present both directions +
   exact equality, then ackMode by principal-only comparison with
   `isNonEmptyString`-style fail-closed guards on both principals (`self`: equal;
   `counterparty`: unequal; `any`: either — but ALWAYS failing closed on a missing
   principal, including under `any`); `findingCoverage` maps each finding:
   undeclared-or-not-listed kind ⇒ `'not-required'`; zero acks ⇒ `'ack-missing'`;
   some acks, none counting ⇒ `'ack-stale'`; any counting ⇒ `'covered'`;
   `undefined` findings ⇒ `[]`. Module header carries §10.2's evidence sentences and
   the two-touch note (the gate consumes this at the second step-7 increment).
4. `kernel/review.ts`: after the existing optional fields —

```ts
  if (record.findings !== undefined) {
    const resolved = ctx.profiles.get(record.profileId);
    const leg = resolved?.profile.legs.find((l) => l.id === record.legId);
    view.findings = findingCoverage(record.findings, leg?.ackMode, leg?.requiredAcks).map(
      ({ finding, coverage }) => ({
        findingId: finding.findingId,
        kind: finding.kind,
        findingDigest: finding.findingDigest,
        ...(finding.magnitude !== undefined ? { magnitude: finding.magnitude } : {}),
        coverage,
      }),
    );
  }
```

   (import `findingCoverage`; the module header's projection sentence updates to name
   the findings projection beside the consultations one.)

- [ ] **Step 4: Run tests, gates, commit**

Run the file, then `pnpm test` (zero skips — nothing else changes behavior; no seam
mints the kinds), all five gates. Commit (Bash):

```bash
git add -A packages/record
git commit -m "The read half of the findings flow: folds, the counting predicate, the projection

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: The record — step 7 starts

**Files:**
- Modify: `docs/process/implementation-status.md`
- Modify: `CLAUDE.md`, `README.md`
- Modify: stale comments the sweep finds
- No register edits expected (verify by READING `docs/process/deferral-register.md`)

**Interfaces:** consumes Tasks 1-2; the spec's §7 ("The record — step 7 starts") is the
checklist — verify every claim against CODE, never task reports.

- [ ] **Step 1: implementation-status.md**

Per the spec's §7, matching on content: steps table → step 7 **Started** (first of two
increments: the read side; the seams + rung (5.7) + the `ackMode`/`requiredAcks` lift +
THE MARKER MOVE remaining, exiting step 7 — the marker ruling named as taken at the
step-7 brainstorm). §10.2 row: the read half built (the arms with their storage-fault
throws, the shapes, the predicate, the projection), the seams/gate NOT
(`ackMode`/`requiredAcks` still GOVERNED — **governed count UNCHANGED at 4, stated**;
the marker explicitly NOT yet moved). §8 row: twenty-two codes. §9 row: review's
findings projection real — over chains only a future seam can mint, said plainly. The
ackMode-current-raiser reading and the replay-storage-fault rulings recorded.

- [ ] **Step 2: CLAUDE.md + README.md**

CLAUDE.md: step 7 started (first of two increments); "two of the eight build-order
steps remain unstarted" → **one (step 8)** — verify the arithmetic against the steps
table before writing. README: same movement.

- [ ] **Step 3: The sweep — LAST, against the committed tree**

Only after every other edit in this task is final:

```bash
git grep -nE 'finding-raised|acknowledged|findings|ack-missing|ack-stale|ackMode|requiredAcks|first step-7|second step-7|step 8|landing later|this increment|later increment' -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
git grep -nE 'replay throws on either kind|throws on .finding-raised|no raiseFinding|not yet finding-raised|twenty-one|twenty-two|twenty\b|two of the eight' -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
```

(Single-quoted patterns deliberately — a backtick inside a double-quoted pattern would
command-substitute in bash.)

(The second grep carries the OLD shapes' literal text — the status doc's prior §10.2
row wording, replay's old throw sentences, old counts.) Judge EVERY hit. THE REPORT
MUST SHOW HIT-COUNT == VERDICT-COUNT, counts from THIS run. Own-comment pass:
`git diff bf864df..HEAD -- packages | grep -nE "landing later|later in the first step-7"`.

- [ ] **Step 4: Verify quotes, gates, commit**

Hand-verify every quoted SPEC phrase in touched markdown whitespace-collapsed. All five
gates. Commit (Bash):

```bash
git add -A
git commit -m "Record step 7 started: the read half folds what no seam yet mints

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Exit verification

**Files:** none modified (fixes only if a gate fails).

- [ ] **Step 1: Clean-tree gates**

Fresh PowerShell (`$env:PATH = "$env:APPDATA\npm;$env:PATH"`), `git status --porcelain`
empty, `git branch --show-current` = main, then: `pnpm typecheck` · `pnpm lint` ·
`pnpm lint:strict` · `pnpm test` (exact counts, zero skips) · `node scripts/contract-scan.mjs`
(silent, exit 0).

- [ ] **Step 2: Freeze verification**

```bash
git diff bf864df..HEAD -- packages/record/test/byte-stability.test.ts   # MUST be empty
git diff bf864df..HEAD -- packages/record/src/chain/encoding.ts          # MUST be empty
git diff bf864df..HEAD -- packages/record/src/store/                     # MUST be empty
git diff bf864df..HEAD -- docs/concept/                                  # MUST be empty (the marker moves NEXT increment)
```

Any non-empty result ⇒ BLOCKED with the diff stat.

- [ ] **Step 3: Report**

The increment's commit list (`git log --oneline bf864df..HEAD` — bf864df is the spec
commit), exact counts, register rows live (read the file), step-7-Started confirmation
(read the steps table), and `git status -sb`'s ahead count for the user-gated push.
