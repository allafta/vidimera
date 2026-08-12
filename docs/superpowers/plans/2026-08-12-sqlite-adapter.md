# SQLite Adapter (`SqliteStore`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the embedded-SQL reference adapter on `node:sqlite`, land the `tx?`
caller-transaction seam whose deferral trigger this increment fires, and prove both with
the conformance suite and the cross-backing byte-identity test.

**Architecture:** `tx?: unknown` lands on the `Store` interface's three writes first, with
`MemoryStore` throwing loudly on presence and the shared kind→state semantics extracted to
`store/semantics.ts`. Then `SqliteStore` (schema with C1 as a real partial unique index,
every write inside one `BEGIN IMMEDIATE` transaction, transitions as JSON text) proven by a
one-call conformance caller. Then enlistment (`tx` = the adapter's own `DatabaseSync` with
an open transaction — enlisted, never wrapped) with backing-specific pins, then the
byte-identity test via `createWithClock`'s injectable clock **and** id minter.

**Tech Stack:** TypeScript (strict, `noEmit`), `node:sqlite` (`DatabaseSync`, synchronous),
vitest, Biome, pnpm workspace.

**Spec:** `docs/superpowers/specs/2026-08-12-sqlite-adapter-design.md` — read it first.

**Probed facts this plan relies on** (measured on Node 24.12 / SQLite 3.50.4 at plan time):
`isTransaction` getter exists on `DatabaseSync` (false idle, true after `BEGIN IMMEDIATE`);
`STRICT` tables and partial unique indexes work; a C1-index violation raises
`ERR_SQLITE_ERROR` with message `UNIQUE constraint failed: …`;
`--disable-warning=ExperimentalWarning` suppresses the module's warning and nothing else.

## Global Constraints

- **All five gates green at every commit:** `pnpm typecheck` · `pnpm lint` ·
  `pnpm lint:strict` · `pnpm test` (zero skips) · `node scripts/contract-scan.mjs` (silent;
  **diff its output, never totals**). Biome infos stay ≤ 13.
- **No edits under `docs/concept/`** (sealed); no maturity marker moves.
- **The byte-stability oracle:** the four digest literals in
  `packages/record/test/byte-stability.test.ts` must not move, and nothing under
  `packages/record/src/chain/`, `src/jcs.ts`, or `src/canonical.ts` is touched.
- **Suite-pinned throw messages are byte-preserved:** the conformance suite (running over
  BOTH backings after Task 2) pins `appendBatch`'s three caller-error messages — copy them
  byte-for-byte from `store/memory.ts` into the adapter; a reworded message is a red suite.
- **`node:sqlite` is imported ONLY in `src/store/sqlite.ts` and test files** — the
  experimental dependency stays contained to the adapter seam.
- **SPEC citations in TypeScript must resolve** through the scan (quoted phrases verified
  whitespace-collapsed); markdown citations are hand-verified.
- **Status-doc prose names its increment explicitly** ("the fifth step-2 increment") —
  never a bare "this increment".
- **Commit messages:** terse imperative subject, ending
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: The `tx?` seam on the interface, the semantics extraction, the memory throw

**Files:**
- Create: `packages/record/src/store/semantics.ts`
- Modify: `packages/record/src/store/store.ts` (three write signatures + two stale comments)
- Modify: `packages/record/src/store/memory.ts` (imports; three `tx?` params + throw)
- Modify: `packages/record/test/store-constraints.test.ts` (one new pin, red-first)

**Interfaces:**
- Consumes: the existing `Store` interface and `MemoryStore`.
- Produces: `putStaged(staged, tx?: unknown)`, `appendTransition(expected, transition,
  meta, tx?: unknown)`, `appendBatch(expected, transitions, meta, tx?: unknown)` on the
  interface; `stateOf(kind): RecordState | null`, `isStateLeaving(kind): boolean`,
  `isCompromiseCarveOut(transition, expectedCurrentState): boolean`, and
  `interface GenesisPayload { profileId: string; subjectRef: string }` exported from
  `./semantics.js` — Task 2's adapter imports all four.

- [ ] **Step 1: Write the failing pin**

Add to `packages/record/test/store-constraints.test.ts`, after the DataCloneError pins
(reusing the file's existing `storeGenesis` import):

```ts
test('MemoryStore rejects a supplied tx loudly — no driver, no transaction to enlist', async () => {
  // SPEC §12's caller-transaction seam is adapter-generic; a backing with no driver has
  // nothing to enlist a write in, and silently ignoring the handle is the failure mode the
  // seam's deferral existed to avoid. The check runs FIRST in each write, ahead of every
  // other validation, so no partial work precedes the throw.
  const store = new MemoryStore();
  const draft = {
    id: `sha256:${'d'.repeat(64)}`,
    profileId: 'profile.p1',
    legId: 'approver-decide',
    subjectRef: 'subject:tx-pin',
    contentDigest: `sha256:${'e'.repeat(64)}`,
  };
  await assert.rejects(() => store.putStaged(draft, {}), /no transaction to enlist/);

  const genesis = storeGenesis('rec-tx-pin', 'profile.p1', 'subject:tx-pin');
  await assert.rejects(
    () => store.appendTransition(null, genesis, { nonTerminal: true }, {}),
    /no transaction to enlist/,
  );
  await assert.rejects(
    () => store.appendBatch('open', [genesis], { nonTerminal: true }, {}),
    /no transaction to enlist/,
  );
});
```

(If `StagedDraft` requires fields beyond these five, match the shape the file's DataClone
putStaged test already builds — trust the compiler over this snippet.)

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test -- store-constraints`
Expected: the new test FAILS — before the implementation, the extra argument is silently
ignored at runtime (vitest strips types), so no rejection happens and all three
`assert.rejects` fail.

- [ ] **Step 3: Create `store/semantics.ts`**

Move — do not rewrite — `stateOf`, `isStateLeaving`, `isCompromiseCarveOut`, and the
`GenesisPayload` / `RefusedPayload` reading-convention interfaces out of
`store/memory.ts`, with their doc comments verbatim except where relocation breaks deixis
(e.g. `stateOf`'s "the C3 gate below" becomes "the backings' C3 gates"; name each such
rewrite in the commit body — the both-directions deixis lesson). File header:

```ts
// @vidimera/record — store/semantics.ts: the kind→state mapping and SPEC §12's C3
// carve-out predicate, shared by every backing. Extracted from store/memory.ts when the
// SQLite adapter arrived (the fifth step-2 increment) — two backings evaluating C3/C4
// from two copies of this mapping is drift waiting to happen, the same argument that put
// `findNonTerminal` on C1's own predicate. Behavior is byte-identically what memory.ts
// carried; the conformance suite over MemoryStore is the regression gate on the
// extraction.
```

Exports: `stateOf`, `isStateLeaving`, `isCompromiseCarveOut`, `type GenesisPayload`.
`RefusedPayload` stays module-local (its only consumer is `isCompromiseCarveOut`). The
`CORE`/`RefusalCode` import moves with the predicate.

- [ ] **Step 4: Point `memory.ts` at the extraction and add the throw**

Replace the moved declarations with
`import { type GenesisPayload, isCompromiseCarveOut, isStateLeaving, stateOf } from './semantics.js';`
and prune imports that became unused (`CORE`, `RefusalCode`, `TransitionKind` — trust the
lint gate). Add a private guard and call it as the FIRST line of `putStaged`,
`appendTransition`, and `appendBatch` (before even the empty-batch throw):

```ts
  /**
   * SPEC §12's caller-transaction seam is adapter-generic — "its concrete type is the
   * driver's own transaction handle" — and this backing has no driver: a supplied handle
   * is a caller error, thrown loudly rather than structurally ignored (the silent-ignore
   * risk is why the seam was deferred until a real adapter existed to receive it).
   */
  private static rejectTx(tx: unknown): void {
    if (tx !== undefined) {
      throw new Error('MemoryStore: no transaction to enlist — this backing has no driver');
    }
  }
```

Each write's signature gains `tx?: unknown` as its final parameter.

- [ ] **Step 5: Update `store/store.ts`**

Add `tx?: unknown` to the interface's `putStaged`, `appendTransition`, and `appendBatch`.
Add one shared paragraph to the `Store` interface doc comment (after the narrowed-surface
discussion):

```
 * `tx?` on every write is SPEC §12's caller-supplied transaction — adapter-generic: "its
 * concrete type is the driver's own transaction handle, named only where an adapter is
 * instantiated, never abstracted behind a library-owned transaction interface". When a
 * host supplies one, the write is "enlisted in that transaction and commits or rolls
 * back with it"; each backing validates the handle it receives and throws a caller error
 * on one it cannot enlist (MemoryStore throws on any handle — it has no driver).
```

Rewrite the two now-stale sentences: the header's "(most likely gaining a
caller-transaction seam and a committed-read surface — both named but not built in this
build, SPEC §12)" becomes "(a committed-read surface is still named-not-built, SPEC §12;
the caller-transaction seam `tx?` is on every write as of the fifth step-2 increment)";
and `AppendMeta`'s closing paragraph ("§12 also puts an optional caller-supplied
transaction on every write. It is NOT built here … Deferral register row 13.") becomes:

```
 * §12's optional caller-supplied transaction rides beside this as `tx?` on each write
 * method — adapter-generic, validated by each backing (`store/sqlite.ts` enlists its own
 * connection's open transaction; `MemoryStore` throws on presence, having no driver).
```

- [ ] **Step 6: Verify green, run the full gates**

Run: `pnpm test -- store-constraints` — the new pin PASSES.
Run all five gates. The six test doubles compile unchanged (an added optional parameter
breaks no implementor — if typecheck disagrees, stop and report). Expected totals:
**305 tests / 28 files**, zero skips.

- [ ] **Step 7: Commit**

```bash
git add packages/record/src/store packages/record/test/store-constraints.test.ts
git commit -m "Open the tx seam: adapter-generic on the interface, loud on memory

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `SqliteStore` + the conformance caller + plumbing

**Files:**
- Create: `packages/record/src/store/sqlite.ts`
- Create: `packages/record/test/sqlite-store-conformance.test.ts`
- Create: `vitest.config.ts` (repo root)
- Modify: `packages/record/src/index.ts` (one export line)
- Modify: `package.json` (engines)

**Interfaces:**
- Consumes: Task 1's `semantics.ts` exports and the widened `Store` interface;
  `transitionDigest` (`src/chain/encoding.ts`); `runStoreConformance`
  (`test/conformance/store-conformance.ts`).
- Produces: `class SqliteStore implements Store`, constructor
  `new SqliteStore(location: string)` — Tasks 3-4 build on it. (`tx` handling arrives in
  Task 3; in this task the write methods omit the `tx` parameter entirely, which
  TypeScript accepts against the interface.)

- [ ] **Step 1: Create the failing conformance caller**

`packages/record/test/sqlite-store-conformance.test.ts`:

```ts
// @vidimera/record — sqlite-store-conformance.test.ts: the embedded backing's conformance
// proof — one call, the same suite MemoryStore answers. An in-memory SQLite database per
// test keeps the suite's fresh-store-per-test contract without filesystem litter; the
// file-backed durability pin lives in sqlite-store.test.ts, backing-specific.

import { SqliteStore } from '../src/store/sqlite.js';
import { runStoreConformance } from './conformance/store-conformance.js';

runStoreConformance('SqliteStore (:memory:)', () => new SqliteStore(':memory:'));
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test -- sqlite-store-conformance`
Expected: FAIL — cannot resolve `../src/store/sqlite.js`.

- [ ] **Step 3: Write the adapter**

`packages/record/src/store/sqlite.ts`, complete:

```ts
// @vidimera/record — store/sqlite.ts: the embedded-SQL `Store` — SPEC §12's "an
// embedded-SQL store (zero-infra, single-operator)" — on `node:sqlite`'s synchronous
// `DatabaseSync`. Single-operator scoped: WAL-mode SQLite under one process; nothing here
// claims multi-connection safety (that is the server-SQL adapter's job description).
//
// The schema is an implementation artifact — SPEC §12: "A persisted schema is an
// **implementation artifact, not a public query API**" — richer listing is the host's own
// read model over the Store's reads. The persisted `state`/`non_terminal`/`due_at`/
// `sealed` columns are constraint-and-index only, exactly as the memory backing's are:
// replay over the chain stays the sole authoritative derivation.
//
// C1 exclusivity is the real thing §12 prescribes — "A partial `UNIQUE(profileId,
// subjectRef)` over the **persisted non-terminal flag**" (`records_c1_exclusivity`
// below). The genesis path still SELECTs the blocker first, because the conflict must
// NAME `blockingRecordId` and `findNonTerminal` shares the same statement; the index is
// the durable backstop.
//
// Payload posture, BACKING-SPECIFIC by design (the conformance suite deliberately does
// not bind it): transitions persist as `JSON.stringify` text, so a function-valued
// payload member is silently dropped — consistently with the digest, since library JCS
// drops the same member when digesting, so persisted bytes and digest agree and
// `verifyChain` stays green over the round-trip. The memory backing throws
// `DataCloneError` on the same input; each backing owns its rejection shape.
//
// WATCH ITEM: `node:sqlite` is experimental — its API may move under a Node upgrade; the
// conformance suite is what catches it. The engines floor is >=22.13, where the module
// lost its CLI flag.

import { DatabaseSync } from 'node:sqlite';
import { transitionDigest } from '../chain/encoding.js';
import type { Digest, RecordState, StagedDraft, Transition } from '../types.js';
import {
  type GenesisPayload,
  isCompromiseCarveOut,
  isStateLeaving,
  stateOf,
} from './semantics.js';
import type { AppendMeta, AppendResult, BatchResult, Store } from './store.js';

interface RecordRow {
  id: string;
  state: RecordState;
  non_terminal: number;
  sealed: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS staged (
  id         TEXT PRIMARY KEY,
  draft_json TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS records (
  id           TEXT PRIMARY KEY,
  profile_id   TEXT NOT NULL,
  subject_ref  TEXT NOT NULL,
  state        TEXT NOT NULL,
  non_terminal INTEGER NOT NULL,
  due_at       TEXT,
  sealed       INTEGER NOT NULL DEFAULT 0
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS records_c1_exclusivity
  ON records(profile_id, subject_ref) WHERE non_terminal = 1;
CREATE TABLE IF NOT EXISTS transitions (
  record_id       TEXT NOT NULL,
  seq             INTEGER NOT NULL,
  transition_json TEXT NOT NULL,
  PRIMARY KEY (record_id, seq)
) STRICT;
`;

/**
 * The provisional embedded `Store`. Same public marking as `MemoryStore`: PUBLIC BUT
 * EXPLICITLY UNSTABLE PRE-1.0 (SPEC §12's provisionality clause).
 */
export class SqliteStore implements Store {
  private readonly db: DatabaseSync;

  constructor(location: string) {
    this.db = new DatabaseSync(location);
    this.db.exec(SCHEMA);
    if (location !== ':memory:') {
      // Durability under the single-operator concurrency this backing is scoped to.
      this.db.exec('PRAGMA journal_mode = WAL');
    }
  }

  /**
   * Every write runs inside one transaction with the mutation last — the transactional
   * shape `store/memory.ts`'s header MODELS is literal here. SPEC §12: "When none is
   * supplied, an adapter uses its own transaction for the write." (Enlistment in a
   * caller-supplied transaction arrives with the `tx` parameter in the next task.)
   */
  private inOwnTransaction<T>(body: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = body();
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  private recordRow(recordId: string): RecordRow | undefined {
    return this.db
      .prepare('SELECT id, state, non_terminal, sealed FROM records WHERE id = ?')
      .get(recordId) as RecordRow | undefined;
  }

  private maxSeq(recordId: string): number {
    const row = this.db
      .prepare('SELECT COALESCE(MAX(seq), 0) AS m FROM transitions WHERE record_id = ?')
      .get(recordId) as { m: number };
    return row.m;
  }

  /** The C1 scan — shared by the genesis rejection path and `findNonTerminal`, the same
   * one-predicate discipline `store/memory.ts` uses (SPEC §12: "the same record
   * `findNonTerminal` returns"). */
  private liveNonTerminalId(profileId: string, subjectRef: string): string | null {
    const row = this.db
      .prepare('SELECT id FROM records WHERE profile_id = ? AND subject_ref = ? AND non_terminal = 1')
      .get(profileId, subjectRef) as { id: string } | undefined;
    return row?.id ?? null;
  }

  private insertTransition(t: Transition): void {
    this.db
      .prepare('INSERT INTO transitions (record_id, seq, transition_json) VALUES (?, ?, ?)')
      .run(t.recordId, t.seq, JSON.stringify(t));
  }

  async putStaged(staged: StagedDraft): Promise<void> {
    // Idempotent, first-write-wins (SPEC §12) — literally ON CONFLICT DO NOTHING, the SQL
    // semantics the memory backing's comment names as its model.
    this.db
      .prepare('INSERT INTO staged (id, draft_json) VALUES (?, ?) ON CONFLICT(id) DO NOTHING')
      .run(staged.id, JSON.stringify(staged));
  }

  async getStaged(stagedRef: string): Promise<StagedDraft | null> {
    const row = this.db
      .prepare('SELECT draft_json FROM staged WHERE id = ?')
      .get(stagedRef) as { draft_json: string } | undefined;
    // Fresh value (SPEC §12): parsing from text mints a new object graph per call.
    return row === undefined ? null : (JSON.parse(row.draft_json) as StagedDraft);
  }

  async appendTransition(
    expectedCurrentState: RecordState | null,
    transition: Transition,
    meta: AppendMeta,
  ): Promise<AppendResult> {
    return this.inOwnTransaction(() => {
      if (expectedCurrentState === null) {
        return this.appendGenesis(transition, meta);
      }
      return this.appendSubsequent(expectedCurrentState, transition, meta);
    });
  }

  /** Check order mirrors `store/memory.ts` exactly: state CAS, C1, C2, then the insert. */
  private appendGenesis(transition: Transition, meta: AppendMeta): AppendResult {
    if (this.recordRow(transition.recordId) !== undefined) {
      return { appended: false, conflict: 'state-mismatch' };
    }
    const payload = transition.payload as GenesisPayload;
    const blockingRecordId = this.liveNonTerminalId(payload.profileId, payload.subjectRef);
    if (blockingRecordId !== null) {
      return { appended: false, conflict: 'exclusivity', blockingRecordId };
    }
    if (transition.seq !== 1) {
      return { appended: false, conflict: 'seq' };
    }
    const digest = transitionDigest(transition);
    this.db
      .prepare(
        'INSERT INTO records (id, profile_id, subject_ref, state, non_terminal, due_at, sealed) VALUES (?, ?, ?, ?, ?, ?, 0)',
      )
      .run(
        transition.recordId,
        payload.profileId,
        payload.subjectRef,
        'open',
        meta.nonTerminal ? 1 : 0,
        meta.dueAt ?? null,
      );
    this.insertTransition(transition);
    return { appended: true, seq: transition.seq, transitionDigest: digest };
  }

  /** Check order mirrors `store/memory.ts` exactly: state CAS, C4, C3, C2, then insert. */
  private appendSubsequent(
    expectedCurrentState: RecordState,
    transition: Transition,
    meta: AppendMeta,
  ): AppendResult {
    const row = this.recordRow(transition.recordId);
    if (row === undefined || row.state !== expectedCurrentState) {
      return { appended: false, conflict: 'state-mismatch' };
    }
    if (row.sealed === 1) {
      // C4 seal-finality (SPEC §12): same terminal-state-mismatch shape as C3.
      return { appended: false, conflict: 'state-mismatch' };
    }
    if (
      row.non_terminal === 0 &&
      isStateLeaving(transition.kind) &&
      !isCompromiseCarveOut(transition, expectedCurrentState)
    ) {
      return { appended: false, conflict: 'state-mismatch' };
    }
    if (transition.seq !== this.maxSeq(transition.recordId) + 1) {
      return { appended: false, conflict: 'seq' };
    }
    const digest = transitionDigest(transition);
    this.insertTransition(transition);
    const nextState = stateOf(transition.kind);
    this.db
      .prepare('UPDATE records SET state = ?, non_terminal = ?, due_at = ?, sealed = ? WHERE id = ?')
      .run(
        nextState ?? row.state,
        meta.nonTerminal ? 1 : 0,
        meta.dueAt ?? null,
        row.sealed === 1 || transition.kind === 'sealed' ? 1 : 0,
        transition.recordId,
      );
    return { appended: true, seq: transition.seq, transitionDigest: digest };
  }

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
    return this.inOwnTransaction(() => {
      const row = this.recordRow(first.recordId);
      if (row === undefined || row.state !== expectedCurrentState) {
        return { appended: false, conflict: 'state-mismatch', index: 0 } as BatchResult;
      }
      if (row.sealed === 1) {
        // C4 is an ENTRY-level failure (SPEC §12: "report element index 0").
        return { appended: false, conflict: 'state-mismatch', index: 0 } as BatchResult;
      }
      const entryNonTerminal = row.non_terminal === 1;

      let state: RecordState = row.state;
      let seq = this.maxSeq(first.recordId);
      const digests: Digest[] = [];
      for (const [i, t] of transitions.entries()) {
        if (t.recordId !== first.recordId) {
          throw new Error(
            'appendBatch: every element must name the same recordId — a batch spanning ' +
              'records has no single entry compare-and-swap target',
          );
        }
        if (!entryNonTerminal && isStateLeaving(t.kind) && !isCompromiseCarveOut(t, state)) {
          return { appended: false, conflict: 'state-mismatch', index: i } as BatchResult;
        }
        seq += 1;
        if (t.seq !== seq) {
          return { appended: false, conflict: 'seq', index: i } as BatchResult;
        }
        if (t.kind === 'opened') {
          throw new Error(
            'appendBatch: genesis never appears in a batch (SPEC §12) — a genesis append has ' +
              'no entry compare-and-swap target and needs the C1 exclusivity check ' +
              '`appendTransition` runs',
          );
        }
        digests.push(transitionDigest(t));
        const next = stateOf(t.kind);
        if (next !== null) state = next;
      }

      for (const t of transitions) {
        this.insertTransition(t);
      }
      this.db
        .prepare('UPDATE records SET state = ?, non_terminal = ?, due_at = ?, sealed = ? WHERE id = ?')
        .run(
          state,
          meta.nonTerminal ? 1 : 0,
          meta.dueAt ?? null,
          transitions.some((t) => t.kind === 'sealed') ? 1 : 0,
          first.recordId,
        );
      return { appended: true, transitionDigests: digests } as BatchResult;
    });
  }

  async readChain(recordId: string): Promise<Transition[]> {
    const rows = this.db
      .prepare('SELECT transition_json FROM transitions WHERE record_id = ? ORDER BY seq')
      .all(recordId) as { transition_json: string }[];
    // Fresh values (SPEC §12): every call parses a new object graph from text.
    return rows.map((r) => JSON.parse(r.transition_json) as Transition);
  }

  async chainHead(recordId: string): Promise<Digest | null> {
    const row = this.db
      .prepare('SELECT transition_json FROM transitions WHERE record_id = ? ORDER BY seq DESC LIMIT 1')
      .get(recordId) as { transition_json: string } | undefined;
    if (row === undefined) return null;
    return transitionDigest(JSON.parse(row.transition_json) as Transition);
  }

  async listDue(now: Date): Promise<string[]> {
    // SPEC §12's gate verbatim: `dueAt ≠ null AND dueAt ≤ now`, no state predicate.
    // RFC3339 UTC strings with fixed 'Z' and millisecond precision compare
    // lexicographically in chronological order, so string `<=` is the gate. No ordering
    // of the returned ids is promised.
    const rows = this.db
      .prepare('SELECT id FROM records WHERE due_at IS NOT NULL AND due_at <= ?')
      .all(now.toISOString()) as { id: string }[];
    return rows.map((r) => r.id);
  }

  async findNonTerminal(profileId: string, subjectRef: string): Promise<string | null> {
    return this.liveNonTerminalId(profileId, subjectRef);
  }
}
```

Notes for the implementer: the three `appendBatch` throw messages above are byte-for-byte
`store/memory.ts`'s — do not reword them; the suite pins them over both backings. The
`as BatchResult` casts exist because the arrow returns a union member; if the compiler is
happy without them, drop them.

- [ ] **Step 4: Export it, add the plumbing**

In `packages/record/src/index.ts`, add the export beside the `MemoryStore` export,
mirroring its comment style:

```ts
export { SqliteStore } from './store/sqlite.js';
```

Create `vitest.config.ts` at the repo root:

```ts
// Targeted suppression of node:sqlite's ExperimentalWarning (the embedded adapter,
// packages/record/src/store/sqlite.ts, imports the module; the warning would otherwise
// print once per worker and make test output non-pristine). --disable-warning is scoped
// to exactly this warning class — never a blanket --no-warnings. Remove when node:sqlite
// stabilizes.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    poolOptions: {
      forks: { execArgv: ['--disable-warning=ExperimentalWarning'] },
    },
  },
});
```

In root `package.json`, change `"node": ">=22"` to `"node": ">=22.13"` (where
`node:sqlite` lost its CLI flag).

- [ ] **Step 5: Run the caller to verify green**

Run: `pnpm test -- sqlite-store-conformance`
Expected: the full suite PASSES over `SqliteStore (:memory:)` — all 45 pins.

- [ ] **Step 6: Run the full gates**

All five green. Expected totals: **350 tests / 29 files**, zero skips; test output free of
`ExperimentalWarning` (that is what Step 4's config is for — if the warning still prints,
stop and fix the config, do not ship noisy output).

- [ ] **Step 7: Commit**

```bash
git add packages/record/src/store/sqlite.ts packages/record/src/index.ts \
  packages/record/test/sqlite-store-conformance.test.ts vitest.config.ts package.json
git commit -m "Build SqliteStore: the embedded backing, proven by the suite in one call

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Enlistment — `tx` on the adapter, and the backing-specific pins

**Files:**
- Modify: `packages/record/src/store/sqlite.ts` (the `database` getter, validation,
  narrowed `tx` params on the three writes)
- Create: `packages/record/test/sqlite-store.test.ts`

**Interfaces:**
- Consumes: Task 2's `SqliteStore`.
- Produces: `get database(): DatabaseSync` and
  `putStaged(staged, tx?: DatabaseSync)` / `appendTransition(…, tx?: DatabaseSync)` /
  `appendBatch(…, tx?: DatabaseSync)` on the class (narrowed from the interface's
  `unknown` — method bivariance permits it). Task 4 does not use `tx`.

- [ ] **Step 1: Write the failing backing-specific tests**

`packages/record/test/sqlite-store.test.ts`:

```ts
// @vidimera/record — sqlite-store.test.ts: the embedded backing's OWN pins — everything
// here is deliberately backing-specific (the conformance suite carries the contract):
// file-backed durability, tx enlistment (SPEC §12: "enlisted in that transaction and
// commits or rolls back with it" — enlisted, never wrapped), the foreign-handle and
// no-open-transaction throws, and the JSON-drop payload-consistency pin that is this
// backing's counterpart to MemoryStore's DataCloneError posture.

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, test } from 'vitest';

import { verifyChain } from '../src/chain/replay.js';
import { SqliteStore } from '../src/store/sqlite.js';
import { storeGenesis, storeNext } from './helpers/chain.js';
import { APPROVER } from './helpers/store-fixtures.js';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'vidimera-sqlite-'));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  return join(dir, 'store.db');
}

test('durability: a file-backed chain survives close-and-reopen byte-identically', async () => {
  const path = tempDbPath();
  const first = new SqliteStore(path);
  const genesis = storeGenesis('rec-durable', 'profile.p1', 'subject:s1');
  await first.appendTransition(null, genesis, { nonTerminal: true });
  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  await first.appendTransition('open', confirmed, { nonTerminal: false });
  const before = await first.readChain('rec-durable');

  const reopened = new SqliteStore(path);
  const after = await reopened.readChain('rec-durable');
  assert.deepEqual(after, before, 'the chain must survive process death');
  assert.equal(verifyChain(after).ok, true, 'and still verify');
});

test('tx enlistment: a write inside the host transaction rolls back with it', async () => {
  const store = new SqliteStore(':memory:');
  const genesis = storeGenesis('rec-enlist', 'profile.p1', 'subject:s1');
  await store.appendTransition(null, genesis, { nonTerminal: true });

  store.database.exec('BEGIN IMMEDIATE');
  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  const res = await store.appendTransition('open', confirmed, { nonTerminal: false }, store.database);
  assert.equal(res.appended, true, 'the enlisted write reports success inside the txn');
  store.database.exec('ROLLBACK');

  const chain = await store.readChain('rec-enlist');
  assert.equal(chain.length, 1, "the host's ROLLBACK took the enlisted write with it");
});

test('tx enlistment: a write inside the host transaction commits with it', async () => {
  const store = new SqliteStore(':memory:');
  const genesis = storeGenesis('rec-enlist-commit', 'profile.p1', 'subject:s1');
  await store.appendTransition(null, genesis, { nonTerminal: true });

  store.database.exec('BEGIN IMMEDIATE');
  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  await store.appendTransition('open', confirmed, { nonTerminal: false }, store.database);
  store.database.exec('COMMIT');

  const chain = await store.readChain('rec-enlist-commit');
  assert.equal(chain.length, 2, "the host's COMMIT landed the enlisted write");
});

test('tx validation: a foreign DatabaseSync is refused loudly (split-brain guard)', async () => {
  // A different connection is a DIFFERENT database for ':memory:' and a different
  // transaction scope for a file — enlisting on it would silently write elsewhere.
  const store = new SqliteStore(':memory:');
  const foreign = new DatabaseSync(':memory:');
  foreign.exec('BEGIN');
  const genesis = storeGenesis('rec-foreign', 'profile.p1', 'subject:s1');
  await assert.rejects(
    () => store.appendTransition(null, genesis, { nonTerminal: true }, foreign),
    /not this store's own connection/,
  );
});

test('tx validation: the store connection WITHOUT an open transaction is refused', async () => {
  // Autocommit-per-statement under a supplied handle would break write atomicity; the
  // boundary is the host's to own — SPEC §12: "The transaction boundary is never hidden
  // from the caller".
  const store = new SqliteStore(':memory:');
  const genesis = storeGenesis('rec-notx', 'profile.p1', 'subject:s1');
  await assert.rejects(
    () => store.appendTransition(null, genesis, { nonTerminal: true }, store.database),
    /no open transaction/,
  );
});

test('payload posture: a function-valued member is dropped CONSISTENTLY with the digest', async () => {
  // This backing's counterpart to MemoryStore's DataCloneError: JSON.stringify drops the
  // member, and library JCS dropped the same member when digesting, so persisted bytes
  // and digest agree — verifyChain stays green over the round-trip.
  const store = new SqliteStore(':memory:');
  const genesis = storeGenesis('rec-jsondrop', 'profile.p1', 'subject:s1');
  await store.appendTransition(null, genesis, { nonTerminal: true });
  const confirmed = storeNext(genesis, 'confirmed', {
    actor: APPROVER,
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
  assert.equal(verifyChain(chain).ok, true, 'and the digests still verify');
});
```

(If `verifyChain`'s report shape is not `{ ok: boolean }`, match its real shape — open
`src/chain/replay.ts` and trust it over this snippet; the assertion's substance is "the
chain verifies clean".)

- [ ] **Step 2: Run to verify the enlistment/validation tests fail**

Run: `pnpm test -- sqlite-store`
Expected: the two enlistment and two validation tests FAIL (`store.database` is undefined;
the 4th argument is ignored). The durability and JSON-drop tests may already pass — they
pin Task 2 behavior; that is fine and expected.

- [ ] **Step 3: Implement the getter, the validation, the enlistment**

In `sqlite.ts`: add the getter and guard, narrow the three writes' signatures, and route
them through one entry point.

```ts
  /**
   * The adapter's own connection — the enlistment surface. SPEC §12's tx is "the driver's
   * own transaction handle"; node:sqlite has no separate transaction object, so the handle
   * IS the connection carrying an open transaction, and co-location (§11.2) means the host
   * runs its own effect statements on THIS connection inside its BEGIN/COMMIT. A foreign
   * connection is refused outright: for ':memory:' it is a different database entirely,
   * and for a file it is a different transaction scope — either way a silent wrong-place
   * write, which is exactly what loud validation exists to prevent.
   */
  get database(): DatabaseSync {
    return this.db;
  }

  private validateTx(tx: DatabaseSync): void {
    if (tx !== this.db) {
      throw new Error(
        "SqliteStore: tx is not this store's own connection — enlistment is same-connection " +
          'by design (a foreign connection is a different database or transaction scope)',
      );
    }
    if (!tx.isTransaction) {
      throw new Error(
        'SqliteStore: tx has no open transaction — the caller owns BEGIN/COMMIT (SPEC §12: ' +
          '"The transaction boundary is never hidden from the caller")',
      );
    }
  }

  /** Enlisted (SPEC §12: "enlisted in that transaction and commits or rolls back with
   * it") — the body runs on the open transaction with NO BEGIN/COMMIT/ROLLBACK of our
   * own; or, with no tx, inside our own transaction. */
  private inTransaction<T>(tx: DatabaseSync | undefined, body: () => T): T {
    if (tx !== undefined) {
      this.validateTx(tx);
      return body();
    }
    return this.inOwnTransaction(body);
  }
```

`putStaged(staged: StagedDraft, tx?: DatabaseSync)` wraps its INSERT in
`this.inTransaction(tx, …)` (a single statement, but the validation must still run);
`appendTransition(…, tx?: DatabaseSync)` and `appendBatch(…, tx?: DatabaseSync)` replace
their `this.inOwnTransaction(…)` calls with `this.inTransaction(tx, …)`. Contingency,
named in the spec: if CI's Node 22.x lacks the `isTransaction` getter (probed present on
Node 24), these tests fail there with the no-open-transaction message — implement the
`BEGIN`-probe fallback then, not preemptively.

- [ ] **Step 4: Run the file, then the full gates**

`pnpm test -- sqlite-store` — all six PASS. Full gates green. Expected totals: **356 tests
/ 30 files**, zero skips, no warning noise.

- [ ] **Step 5: Commit**

```bash
git add packages/record/src/store/sqlite.ts packages/record/test/sqlite-store.test.ts
git commit -m "Enlist, never wrap: tx on SqliteStore, validated same-connection

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: The cross-backing byte-identity test

**Files:**
- Create: `packages/record/test/cross-backing-byte-identity.test.ts`

**Interfaces:**
- Consumes: `createWithClock(config, now, mintId?)` (`src/create.ts` — the injectable
  clock AND recordId minter; both exist for exactly this), `canonicalize`
  (`src/canonical.ts`), `transitionDigest` (`src/chain/encoding.ts`), both stores, the
  profile helpers.
- Produces: nothing downstream — this is step 2's cross-backing proof, previously
  unconstructible with one backing.

- [ ] **Step 1: Write the test**

```ts
// @vidimera/record — cross-backing-byte-identity.test.ts: SPEC §12's cross-backing
// end-to-end — all backings "produce **byte-identical chains** from the same scripted
// flow under a fixed clock". Byte-level in substance: per-transition library-JCS
// serialization compared as strings, plus head-digest equality — not just deepEqual.
// Determinism needs BOTH injectable knobs createWithClock carries: the fixed clock (`at`
// stamps) and the fixed recordId sequence (recordId sits inside every transition digest,
// so real randomness would make byte-for-byte comparison impossible — create.ts's own
// words for why the minter seam exists).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { canonicalize } from '../src/canonical.js';
import { transitionDigest } from '../src/chain/encoding.js';
import { createWithClock } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import type { Store } from '../src/store/store.js';
import type { Transition } from '../src/types.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);

/** A deterministic recordId sequence — identical across backings by construction. */
function fixedMint(prefix: string): () => string {
  let n = 0;
  return () => {
    n += 1;
    return `${prefix}-${String(n).padStart(4, '0')}`;
  };
}

async function happyFlow(store: Store): Promise<Transition[]> {
  const clock = () => new Date(T0);
  const handles = createWithClock(
    makeConfig([captureProfile()], { store }),
    clock,
    fixedMint('cross-happy'),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  const sealed = await handles.operator.seal(recordId);
  assert.equal(sealed.status, 'ok', 'fixture: the record must seal');
  return handles.operator.readChain(recordId);
}

async function refusalFlow(store: Store): Promise<Transition[]> {
  const clock = () => new Date(T0);
  const handles = createWithClock(
    makeConfig([captureProfile({ terminalRefusals: ['identity-authority-refused'] })], {
      store,
    }),
    clock,
    fixedMint('cross-refusal'),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const refused = await handles.operator.finalize(
    recordId,
    identity({ authority: 'session:wrong-app' }),
    CONTENT,
    facts(),
  );
  assert.equal(refused.status, 'refused', 'fixture: the identity must be refused');
  return handles.operator.readChain(recordId);
}

function assertByteIdentical(a: Transition[], b: Transition[], flow: string): void {
  assert.equal(a.length, b.length, `${flow}: same chain length`);
  for (const [i, ta] of a.entries()) {
    const tb = b[i];
    assert.ok(tb !== undefined);
    assert.equal(
      canonicalize(ta),
      canonicalize(tb),
      `${flow}: transition ${i} must be byte-identical under library JCS`,
    );
  }
  const headA = a.at(-1);
  const headB = b.at(-1);
  assert.ok(headA !== undefined && headB !== undefined);
  assert.equal(transitionDigest(headA), transitionDigest(headB), `${flow}: same head digest`);
}

test('the happy path produces byte-identical chains over both backings', async () => {
  const memory = await happyFlow(new MemoryStore());
  const sqlite = await happyFlow(new SqliteStore(':memory:'));
  assertByteIdentical(memory, sqlite, 'happy path');
});

test('a terminal refusal produces byte-identical chains over both backings', async () => {
  const memory = await refusalFlow(new MemoryStore());
  const sqlite = await refusalFlow(new SqliteStore(':memory:'));
  assertByteIdentical(memory, sqlite, 'refusal path');
});
```

(If `canonicalize`'s return type is a byte array rather than a string, compare via
`assert.deepEqual` — open `src/canonical.ts` and trust it over this snippet; the substance
is JCS-byte equality.)

- [ ] **Step 2: Run to verify it fails, then passes**

This is a cross-implementation pin: it should be green on first run if Tasks 2-3 are
correct. Non-vacuity check instead of red-first: temporarily add a
`content: unknown = CONTENT` parameter to `happyFlow`, pass `{ ...CONTENT, total: 41 }`
for the sqlite run only, and watch the byte-identity comparison FAIL (different
contentDigest → different genesis payload → different bytes); then revert both edits.
Record the failing output in your report as the non-vacuity evidence.

Run: `pnpm test -- cross-backing`
Expected: both tests PASS (after the reverted mutation check).

- [ ] **Step 3: Run the full gates, commit**

Full gates green. Expected totals: **358 tests / 31 files**, zero skips.

```bash
git add packages/record/test/cross-backing-byte-identity.test.ts
git commit -m "Prove byte-identical chains across backings, fixed clock and ids

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: The record

**Files:**
- Modify: `docs/process/deferral-register.md` (row 13 retires — deleted per the preamble)
- Modify: `docs/process/implementation-status.md` (steps table; §12 row; the
  eight-of-eight boundary; the Still-outstanding list)
- Modify: `CLAUDE.md`, `README.md` (step-2 sentences; the Node floor)
- Modify: `packages/record/src/store/memory.ts` (one stale header sentence)

**Interfaces:**
- Consumes: Tasks 1-4 landed. Produces: the increment's record.

- [ ] **Step 1: Retire register row 13**

Delete the row. Precedent and rule: the register's preamble — the same way row 14 retired
("a gap is an entry that has left; the number is not reused", as
`docs/process/implementation-status.md`'s chain-retirement boundary records it). The gap
row 13 last carried was `tx?`, and `tx?` is built: on the interface's three writes, honored
by `SqliteStore` with enlisted-never-wrapped semantics and same-connection validation, and
loud on `MemoryStore`, which has no driver. The `listDue`/`findNonTerminal` narrowings the
row also mentioned stay recorded in the status doc's §12 row, which already carries them.

- [ ] **Step 2: Update `docs/process/implementation-status.md` — four sites**

**Steps table, step 2 row** — replace the status cell with:

> **Started, not exited** — five increments in: the first landed `appendBatch`, `listDue`,
> and the `meta = { nonTerminal, dueAt? }` migration on both append methods; the second
> added §12's C4 seal-finality bar and the operator-only `seal()` seam; the third landed
> `findNonTerminal`, completing the eight-method Store contract; the fourth extracted the
> backing-parameterized conformance suite; the fifth built the embedded-SQL adapter
> (`store/sqlite.ts`, on `node:sqlite`), the caller-transaction seam (`tx?`) on every
> write, and the cross-backing byte-identical-chains test — two of §12's three reference
> backings now exist and are held equivalent by the suite plus the byte-identity test; the
> server-SQL adapter is the one §12 backing still unbuilt, and whether one SQL adapter
> satisfies `docs/concept/SCOPING-GUIDE.md` §7's "real SQL adapters" for the step's exit
> is the owner's ruling, deliberately not made here — see the §12 row

**§12 row, Built column** — append:

> **The embedded-SQL adapter, built at the fifth step-2 increment** (`store/sqlite.ts`,
> `node:sqlite`'s synchronous `DatabaseSync`): C1 as the real partial unique index §12
> prescribes, C2 as `PRIMARY KEY (record_id, seq)` with server-verified `max+1` inside the
> write transaction, C3/C4 evaluated from the same `store/semantics.ts` mapping the memory
> backing now imports (one copy, no drift), every write inside one `BEGIN IMMEDIATE`
> transaction with the mutation last, columns constraint-and-index only, transitions as
> JSON text (fresh values structurally). **`tx?`, built the same increment**: on all three
> interface writes, adapter-generic (`unknown` on the interface, the adapter's own
> `DatabaseSync`-with-open-transaction on the class — enlisted, never wrapped,
> same-connection validated); `MemoryStore` throws loudly on presence, having no driver.
> The proof structure now runs over two backings: the conformance suite via one caller
> file per backing, plus the cross-backing byte-identity test (fixed clock and fixed
> recordId sequence, per-transition JCS-byte equality)

**§12 row, Not-built column** — replace the `tx?` signature-divergence sentence ("The
signature divergence is `tx?` alone: …accepts one — an in-memory backing has no
transaction to receive it.") with:

> The signature divergence is closed: `tx?` is on every write (see the Built column). The
> narrowings stand as before (`listDue` and `findNonTerminal` return recordIds).

and update the proof-structure sentence to say the remaining absence is the server-SQL
backing alone ("production, multi-connection-safe"), the embedded and in-memory backings
being held equivalent by the suite and the byte-identity test.

**The eight-of-eight boundary** — its `tx?` sentences ("what remains of the signature
divergence is `tx?` alone", "row 13 does not retire but is rewritten…") are rewritten:
`tx?` is built at the fifth step-2 increment and row 13 is retired per the register's
preamble; the boundary keeps its history and now records the closure.

**Still-outstanding list** — the Row 13 bullet is removed (retired rows leave the list, as
row 12's and row 14's did).

- [ ] **Step 3: CLAUDE.md and README.md**

CLAUDE.md: the step-2 sentence moves to five increments (append "…the backing-parameterized
conformance suite (test-side, run over that one backing), and the embedded-SQL adapter
(`store/sqlite.ts`) with the `tx?` seam and the cross-backing byte-identity test" —
and the "all still inside the one in-memory backing" clause is now false: replace with
"which leaves the server-SQL adapter as step 2's one unbuilt backing, and the step has
not exited"). The commands section's "(Node 22+, pnpm via corepack)" becomes
"(Node 22.13+, pnpm via corepack)". README.md: apply the sibling transformations in that
file's own wrapping.

- [ ] **Step 4: `memory.ts`'s stale header sentence**

"this class is provisional scaffolding standing in for a future real SQLite/Postgres
adapter, not a frozen contract" is half-stale: the SQLite adapter exists. Rewrite to:
"this class is the reference in-memory backing beside the real embedded adapter
(`store/sqlite.ts`); a server-SQL adapter is still future, and neither class is a frozen
contract". (Task 1 already updated `store.ts`'s sibling sentence.)

- [ ] **Step 5: The sweep — repo-root, both deixis directions**

```bash
git grep -lni -E "four increments|this increment|future real|one backing|no transaction to receive" -- .
```

Open every hit; classify live/normative/historical per the standing rule; correct
present-tense claims about the current tree in each document's own convention. Specific
checks: no live doc says "four increments"; no live doc says the adapter is future or that
anything "has no transaction to receive it" in the present tense; no current-state table
row or register row carries a bare "this increment" (the register lesson from the previous
increment).

- [ ] **Step 6: Gates, commit**

Contract scan silent; all five gates green (358 tests / 31 files).

```bash
git add docs/process/deferral-register.md docs/process/implementation-status.md \
  CLAUDE.md README.md packages/record/src/store/memory.ts
git commit -m "Record the fifth increment: two backings held equivalent, row 13 retires

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(Add any file Step 5 corrected.)

---

### Task 6: Exit verification

**Files:** none — verification only. Do not edit, do not commit.

- [ ] **Step 1: Gates from a clean tree**

`git status --short` clean; all five gates. Expected: **358 tests / 31 files / 0 skips**;
scan silent; infos ≤ 13; zero `ExperimentalWarning` lines anywhere in the test output.

- [ ] **Step 2: The oracle and encoding-freeze checks**

```bash
git log --oneline 0e24834..HEAD -- packages/record/test/byte-stability.test.ts
git diff --stat 0e24834..HEAD -- packages/record/src/chain packages/record/src/jcs.ts packages/record/src/canonical.ts
```

Expected: both print nothing. Any output is a stop-and-halt.

- [ ] **Step 3: The containment check**

```bash
git grep -ln "node:sqlite" -- packages/record/src
```

Expected: exactly `packages/record/src/store/sqlite.ts`. The experimental dependency
stays contained.

- [ ] **Step 4: The sweep, re-run**

Task 5 Step 5's command; survivors normative/historical only.

- [ ] **Step 5: Report**

Gate outputs, final counts, the five commits, the containment result — and one named
outstanding item: **the CI run on Node 22.x is unconfirmed until the next push to
`origin`**, which is user-gated in this repository; report it as pending, with the two
things that run there for the first time (node:sqlite on 22.x, the `isTransaction`
getter) and the named contingency if either misbehaves (the `BEGIN`-probe fallback from
Task 3). Do not mark the increment done with any local check red.
