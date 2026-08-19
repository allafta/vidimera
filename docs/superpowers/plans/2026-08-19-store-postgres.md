# PostgreSQL Backing + Token-Seam `tx?` + Workspace Shape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land deferral-register rows 15 (a `@vidimera/store-postgres` third reference backing, conformance-wired, byte-identity-proven, contention-proven), 16 (additive trailing `tx?` on `beginRedemption`/`completeRedemption`), and 4 (root scripts and test-runner devDependencies generalized for a second workspace package).

**Architecture:** A new workspace package whose `PostgresStore` ports `SqliteStore` arm-for-arm onto `pg` with row locks and the two unique constraints; an embedded Postgres started once per test run by a project-scoped vitest globalSetup; a fresh Postgres schema per store instance so the conformance suite's synchronous `() => Store` factory stays untouched; `record` gains one grouped adapter-author export; the token seams gain `tx?` threaded through the already-tx-aware prologue.

**Tech Stack:** TypeScript (NodeNext, strict), `pg@8.23.0`, `@types/pg@8.23.1`, `embedded-postgres@18.4.0-beta.17` (the `-beta.N` suffix is that package's permanent versioning convention; platform binaries cover windows-x64, darwin-x64/arm64, linux-x64/arm64 — every CI matrix OS), vitest 4 projects.

**Spec:** `docs/superpowers/specs/2026-08-19-store-postgres-design.md`

## Global Constraints

- Node floor `>=22.16`; ESM only (`type: module`, NodeNext `.js` specifiers).
- `@vidimera/record` keeps zero runtime dependencies; `pg` belongs to the adapter only.
- `docs/concept/` is SEALED — nothing in this plan touches it. `packages/record/test/byte-stability.test.ts` is frozen — untouched (the file extracted from is `cross-backing-byte-identity.test.ts`, a different file).
- `pnpm contract-scan` before every commit (new `.ts` files are scanned: SPEC § citations must resolve; quoted phrases must occur in the cited doc).
- Every gate at every commit: `pnpm test` (zero skips), `pnpm typecheck`, `pnpm lint:strict` (bare exit code, never piped through `tail`), `pnpm build`, `pnpm smoke` where record's surface moved.
- Local runner note: use `./node_modules/.bin/vitest`, `./node_modules/.bin/tsc`, `./node_modules/.bin/biome` (the global pnpm shim is broken on this machine).
- Guide files move in the same commit as any public-surface change (PR-template rule).

---

### Task 1: Workspace scaffolding — the second package exists, row 4 lands

**Files:**
- Create: `packages/store-postgres/package.json`, `packages/store-postgres/tsconfig.json`, `packages/store-postgres/tsconfig.build.json`, `packages/store-postgres/src/index.ts` (minimal), `packages/store-postgres/LICENSE` (copy of root)
- Modify: `package.json` (root: `typecheck`/`build` scripts), `packages/record/package.json` (add `vitest` devDependency), `vitest.config.ts` (projects restructure)

**Interfaces:**
- Produces: a compiling, testable second package; root `pnpm typecheck`/`pnpm build`/`pnpm test` cover both packages; vitest projects `record` (record tests + scripts tests, unchanged behavior) and `store-postgres` (empty until Task 3).

- [ ] **Step 1:** Write `packages/store-postgres/package.json`:

```json
{
  "name": "@vidimera/store-postgres",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "description": "PostgreSQL Store backing for @vidimera/record — the server-SQL third reference backing (multi-connection-safe).",
  "license": "Apache-2.0",
  "author": "The Vidimera Authors",
  "repository": "COPY packages/record/package.json's repository object verbatim, changing only directory to packages/store-postgres (the URL is omitted here because tracked markdown stays external-URL-free per the standalone contract)",
  "engines": { "node": ">=22.16" },
  "sideEffects": false,
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
  "files": ["dist", "LICENSE"],
  "scripts": { "build": "tsc -p tsconfig.build.json" },
  "dependencies": { "pg": "^8.23.0" },
  "peerDependencies": { "@vidimera/record": "workspace:*" },
  "devDependencies": {
    "@types/pg": "^8.23.1",
    "@vidimera/record": "workspace:*",
    "embedded-postgres": "18.4.0-beta.17",
    "vitest": "^4.1.10"
  }
}
```

(`peerDependencies` uses `workspace:*` pre-publish; the publish-time range is a later phase's edit. `embedded-postgres` is pinned exact — its binaries are the one third-party moving part.)

- [ ] **Step 2:** Write `packages/store-postgres/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "paths": { "@vidimera/record": ["../record/src/index.ts"] }
  },
  "include": ["src", "test"]
}
```

and `packages/store-postgres/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3:** Write minimal `packages/store-postgres/src/index.ts` (Task 3 replaces the body):

```ts
// @vidimera/store-postgres — public entry point. The PostgresStore lands at Task 3 of
// docs/superpowers/plans/2026-08-19-store-postgres.md; this placeholder keeps the
// package compiling from the moment it exists.
export {};
```

Copy `LICENSE`: `cp LICENSE packages/store-postgres/LICENSE`.

- [ ] **Step 4:** Root `package.json` script changes (row 4):

```json
"typecheck": "tsc -p packages/record --noEmit && tsc -p packages/store-postgres --noEmit",
"build": "tsc -p packages/record/tsconfig.build.json && tsc -p packages/store-postgres/tsconfig.build.json",
```

Add `"vitest": "^4.1.10"` to `packages/record/package.json` as its only `devDependencies` entry (row 4's per-package test-runner rule; root keeps its copy for the config file).

- [ ] **Step 5:** Restructure `vitest.config.ts` into projects (same effective behavior for existing tests; the `store-postgres` project gains its globalSetup in Task 3):

```ts
import { defineConfig } from 'vitest/config';

// Two projects (a third file-set, scripts/test, rides with record): the record project
// is exactly the old single-config behavior; the store-postgres project exists so its
// embedded-Postgres globalSetup (test/setup/global-setup.ts, Task 3) scopes to the
// adapter suite alone and never starts a server for a record-only run.
const execArgv = ['--disable-warning=ExperimentalWarning'];

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'record',
          include: ['packages/record/test/**/*.test.ts', 'scripts/test/**/*.test.mjs'],
          execArgv,
        },
      },
      {
        test: {
          name: 'store-postgres',
          include: ['packages/store-postgres/test/**/*.test.ts'],
          execArgv,
        },
      },
    ],
  },
});
```

- [ ] **Step 6:** `pnpm install` (updates the lockfile, links the workspace, downloads the embedded binaries). Then run the gates: `./node_modules/.bin/vitest run` (expect: record project green, store-postgres project has no test files — confirm vitest exits 0 with an empty project; if vitest errors on a project with no test files, add a temporary `test/placeholder.test.ts` with one trivial passing test, removed in Task 3), `./node_modules/.bin/tsc -p packages/record --noEmit && ./node_modules/.bin/tsc -p packages/store-postgres --noEmit`, `./node_modules/.bin/biome check --error-on-warnings .` (bare exit), `node scripts/contract-scan.mjs`.

- [ ] **Step 7:** Commit: `The second package lands empty, and row 4's shape lands with it` (body: scaffolding + row-4 script generalization + vitest projects; register row 4 retires in Task 7 with the rest, since its "second workspace package lands" trigger has now fired and its work is in this commit).

### Task 2: The adapter-author exports on `record`

**Files:**
- Modify: `packages/record/src/index.ts`, `packages/record/test/public-surface.test.ts`, `docs/guide/api-reference.md`

**Interfaces:**
- Produces (consumed by Tasks 3–5 via `@vidimera/record`): `transitionDigest(transition: Transition): Digest`; `stateOf(kind: TransitionKind): RecordState | null`; `isStateLeaving(kind: TransitionKind): boolean`; `isCompromiseCarveOut(transition: Transition, expectedCurrentState: RecordState): boolean` (verify the exact parameter list against `store/semantics.ts` before writing the test — use the source's own signature); type `GenesisPayload { profileId: string; subjectRef: string }`.

- [ ] **Step 1:** Extend `public-surface.test.ts`: add `transitionDigest, stateOf, isStateLeaving, isCompromiseCarveOut` to the value-import block and the `fns` object; add `GenesisPayload` to the type-import block and the `RuledTypeExports` tuple with the comment `// the adapter-author surface (phase-4 spec §3) — what a conforming Store implementation needs`.
- [ ] **Step 2:** Run `./node_modules/.bin/vitest run packages/record/test/public-surface.test.ts` — expect FAIL (missing exports).
- [ ] **Step 3:** Add to `packages/record/src/index.ts`, with this comment block:

```ts
// --- the adapter-author surface (SPEC §12: "A third-party `Store` adapter implementer
// MUST honor the contract below") — the helpers a conforming backing needs and cannot
// re-derive without becoming the drift hazard the store seam exists to prevent: the
// private transition encoding's digest, and the C3/C4 semantic arms. A deliberate,
// grouped post-review amendment to the phase-1 surface, argued in the phase-4 spec.
export { transitionDigest } from './chain/encoding.js';
export { isCompromiseCarveOut, isStateLeaving, stateOf } from './store/semantics.js';
export type { GenesisPayload } from './store/semantics.js';
```

(Let Biome's organize-imports place them; run `biome check --write` on the two files.)
- [ ] **Step 4:** Run the full record project + `pnpm typecheck` — expect PASS.
- [ ] **Step 5:** api-reference: bump the derivation date to match the commit date; add an "Adapter authors" subsection under Stores listing the five names with one-line meanings and the §12 third-party-adapter rationale.
- [ ] **Step 6:** Gates (`vitest run`, typecheck, biome bare, contract-scan, `pnpm smoke` — record's surface moved) and commit: `The adapter-author surface: what a conforming Store needs, exported whole`.

### Task 3: `PostgresStore` + the embedded server + the conformance caller

**Files:**
- Create: `packages/store-postgres/test/setup/global-setup.ts`, `packages/store-postgres/test/helpers/pg.ts`, `packages/store-postgres/src/postgres-store.ts`, `packages/store-postgres/test/postgres-store-conformance.test.ts`, `packages/store-postgres/test/postgres-store.test.ts`
- Modify: `packages/store-postgres/src/index.ts`, `vitest.config.ts` (wire `globalSetup` + the `resolve.alias` into the store-postgres project)

**Interfaces:**
- Consumes: Task 2's adapter-author exports; `record`'s conformance suite `runStoreConformance(label: string, makeStore: () => Store)` (imported relatively).
- Produces: `class PostgresStore implements Store` with `constructor(pool: pg.Pool, options: PostgresStoreOptions)`; `interface PostgresStoreOptions { schema: string }`; test helper `newStore(): PostgresStore` and `nextSchemaName(): string` in `test/helpers/pg.ts`; env var `VIDIMERA_PG_URL` set by globalSetup.

- [ ] **Step 1:** `test/setup/global-setup.ts` — one embedded server per run:

```ts
// Project-scoped vitest globalSetup: one embedded Postgres per `pnpm test` run. Runs in
// the main process before workers fork, so the DSN set on process.env is inherited by
// every worker. There is deliberately NO skip path: if the server cannot start, the
// suite fails loudly (the zero-skips discipline).
import { mkdtempSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (addr === null || typeof addr === 'string') return reject(new Error('no port'));
      const port = addr.port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

export default async function setup(): Promise<() => Promise<void>> {
  const port = await freePort();
  const pg = new EmbeddedPostgres({
    databaseDir: mkdtempSync(join(tmpdir(), 'vidimera-pg-')),
    user: 'vidimera',
    password: 'vidimera',
    port,
    persistent: false,
  });
  await pg.initialise();
  await pg.start();
  process.env.VIDIMERA_PG_URL = `postgresql://vidimera:vidimera@127.0.0.1:${port}/postgres`;
  return async () => {
    await pg.stop();
  };
}
```

(If `embedded-postgres`'s option or method names differ at runtime, read `node_modules/embedded-postgres/dist/index.d.ts` and adjust — the pinned version is the source of truth, not this snippet.)

- [ ] **Step 2:** Wire the project in `vitest.config.ts` — the store-postgres project gains:

```ts
resolve: { alias: { '@vidimera/record': new URL('./packages/record/src/index.ts', import.meta.url).pathname } },
// inside its test block:
globalSetup: ['packages/store-postgres/test/setup/global-setup.ts'],
```

(On Windows, `new URL(...).pathname` yields `/C:/...` — if vitest mis-resolves it, use `fileURLToPath` instead. Verify empirically.)

- [ ] **Step 3:** `test/helpers/pg.ts`:

```ts
// Shared pg.Pool for the adapter suite (small max: the embedded server's
// max_connections is finite and the conformance suite creates ~50 stores — stores share
// this pool, isolated by schema, never by connection).
import pg from 'pg';
import { PostgresStore } from '../../src/postgres-store.js';

function dsn(): string {
  const url = process.env.VIDIMERA_PG_URL;
  if (url === undefined) {
    throw new Error('VIDIMERA_PG_URL unset — the globalSetup did not run or did not start');
  }
  return url;
}

let shared: pg.Pool | undefined;
export function sharedPool(): pg.Pool {
  shared ??= new pg.Pool({ connectionString: dsn(), max: 5 });
  return shared;
}

let n = 0;
export function nextSchemaName(): string {
  n += 1;
  return `s${process.pid}_${n}`;
}

export function newStore(): PostgresStore {
  return new PostgresStore(sharedPool(), { schema: nextSchemaName() });
}
```

- [ ] **Step 4:** Write the conformance caller FIRST (the failing test), `test/postgres-store-conformance.test.ts`:

```ts
// The one caller file deferral-register row 15 names: the backing-parameterized
// conformance suite runs unchanged over PostgresStore. A fresh Postgres schema per
// factory call is what "fresh, empty store" means for a server backing.
import { runStoreConformance } from '../../record/test/conformance/store-conformance.js';
import { newStore } from './helpers/pg.js';

runStoreConformance('PostgresStore (embedded)', () => newStore());
```

Run `./node_modules/.bin/vitest run --project store-postgres` — expect FAIL (PostgresStore missing / placeholder index). This step also proves the embedded server boots on this machine: if `initialise()`/`start()` fails here (e.g., a Windows-elevation refusal from `initdb`), STOP and resolve the server story before writing store code — that is the plan's designated bail-out point, and the fallback is a different embedded-binaries package swapped inside `global-setup.ts` alone.

- [ ] **Step 5:** Implement `src/postgres-store.ts` as the arm-for-arm port of `packages/record/src/store/sqlite.ts` (open both files side by side; the port preserves every arm's ORDER and every conflict shape). The skeleton, with the Postgres-specific parts in full:

```ts
import type {
  AppendMeta, AppendResult, BatchResult, RecordState, StagedDraft, Store, Transition,
} from '@vidimera/record';
import {
  isCompromiseCarveOut, isStateLeaving, stateOf, transitionDigest,
} from '@vidimera/record';
import type { GenesisPayload } from '@vidimera/record';
import type pg from 'pg';

export interface PostgresStoreOptions { schema: string }

type Queryable = pg.Pool | pg.PoolClient | pg.ClientBase;

export class PostgresStore implements Store {
  readonly #pool: pg.Pool;
  readonly #schema: string;      // validated: /^[a-z_][a-z0-9_]*$/ — identifiers are
                                 // interpolated (DDL cannot be parameterized), so the
                                 // name is constrained instead
  #ready: Promise<void> | undefined;

  constructor(pool: pg.Pool, options: PostgresStoreOptions) { /* validate schema name, store both */ }

  // Lazy DDL behind a memoized promise — construction stays synchronous for the
  // conformance factory; every public method awaits #ensureReady() first.
  async #ensureReady(): Promise<void> { /* CREATE SCHEMA IF NOT EXISTS + the three tables + C1 partial unique index, once */ }

  // The tx seam: mirrors SqliteStore's validateTx posture. A supplied tx must be a pg
  // client (duck-typed: object with a query function) that came from THIS store's pool
  // universe and has an open transaction. pg exposes no isTransaction; the check is a
  // `SELECT current_setting('transaction_isolation')`… — NO: the honest check is
  // transaction state via the client's internal readyForQuery/activeQuery? Not public.
  // DECISION: validate with `SELECT now() = statement_timestamp() ...`? Overwrought.
  // The implementable contract: (a) tx must be an object with a .query method, else
  // throw caller-error; (b) the store issues `SELECT txid_current_if_assigned()` — wait,
  // simplest robust check: `SHOW transaction_isolation` works always. USE:
  // `SELECT pg_current_xact_id_if_assigned()` — returns null outside an explicit txn
  // only if no write yet… ALSO imperfect. FINAL: validate shape only (.query exists),
  // then issue `SELECT statement_timestamp() <> transaction_timestamp() OR pg_current_xact_id_if_assigned() IS NOT NULL AS in_tx`
  // — inside an open transaction with any prior statement, statement_timestamp diverges
  // from transaction_timestamp; a just-BEGUN transaction is caught by the xact-id arm
  // after its first write, and by timestamp divergence otherwise. If BOTH arms are
  // false, throw "tx has no open transaction — the caller owns BEGIN/COMMIT".
  async #validateTx(tx: unknown): Promise<pg.ClientBase> { /* as above */ }

  // inTransaction(tx, body): with tx — validate, run body on it bare (enlisted, never
  // wrapped). Without — checkout client from pool, BEGIN, body, COMMIT; on throw,
  // ROLLBACK (its own failure swallowed), rethrow ORIGINAL; finally release().
  async #inTransaction<T>(tx: unknown, body: (c: Queryable) => Promise<T>): Promise<T> { /* … */ }

  async putStaged(staged: StagedDraft, tx?: unknown): Promise<void> {
    // INSERT INTO <s>.staged (id, draft_json) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING
  }
  async getStaged(stagedRef: string): Promise<StagedDraft | null> { /* SELECT + JSON.parse */ }

  async appendTransition(expected: RecordState | null, t: Transition, meta: AppendMeta, tx?: unknown): Promise<AppendResult> {
    // one transaction. Genesis (expected === null):
    //   SELECT id FROM <s>.records WHERE id = $1 FOR UPDATE → exists → state-mismatch
    //   SELECT id FROM <s>.records WHERE profile_id=$1 AND subject_ref=$2 AND non_terminal → exclusivity + blockingRecordId
    //   t.seq !== 1 → seq
    //   INSERT records (state 'open', flags from meta) — catch unique_violation (code 23505)
    //     on records_c1_exclusivity from a concurrent racer: re-SELECT the blocker and
    //     return the exclusivity conflict naming it (the constraint is the backstop, the
    //     SELECT names the blocker)
    //   INSERT transitions; return { appended: true, seq: t.seq, transitionDigest: transitionDigest(t) }
    // Subsequent:
    //   SELECT id, state, non_terminal, sealed FROM <s>.records WHERE id=$1 FOR UPDATE
    //     (the row lock is what makes CAS + max(seq) race-free under the pool)
    //   row missing or state !== expected → state-mismatch
    //   sealed → state-mismatch (C4, same arm as C3)
    //   !non_terminal && isStateLeaving(t.kind) && !isCompromiseCarveOut(t, expected) → state-mismatch (C3)
    //   SELECT COALESCE(MAX(seq),0) FROM <s>.transitions WHERE record_id=$1; t.seq !== max+1 → seq (C2)
    //   INSERT transition; UPDATE records SET state=COALESCE(stateOf(t.kind), old), non_terminal, due_at (absence clears), sealed sticky-OR-(kind==='sealed')
  }

  async appendBatch(expected: RecordState, ts: readonly Transition[], meta: AppendMeta, tx?: unknown): Promise<BatchResult> {
    // validateTx BEFORE the empty-batch throw (the memory backing's pinned order);
    // empty → throw /appendBatch: empty batch/. One transaction:
    //   entry SELECT ... FOR UPDATE; CAS mismatch or sealed → { appended:false, conflict:'state-mismatch', index:0 }
    //   entryNonTerminal fixed; loop validates without writing (recordId mismatch throws,
    //   evolving-state C3 → state-mismatch at that index, seq contiguity → seq at index,
    //   kind 'opened' throws), digests accumulated; then inserts + ONE meta UPDATE with
    //   sealed = batch contains 'sealed'.
  }

  async readChain(recordId: string): Promise<Transition[]> { /* SELECT ORDER BY seq; JSON.parse per row (fresh values) */ }
  async chainHead(recordId: string): Promise<Digest | null> { /* MAX(seq) row → transitionDigest(parsed) */ }
  async listDue(now: Date): Promise<string[]> { /* due_at IS NOT NULL AND due_at <= $1 (toISOString) */ }
  async findNonTerminal(profileId: string, subjectRef: string): Promise<string | null> { /* the SAME query the genesis blocker path uses */ }
}
```

**Resolve the `#validateTx` deliberation in code as follows (this is the decision, the comment above is the reasoning trail to delete):** shape-check that `tx` is an object with a `query` function (else `throw new Error('PostgresStore: tx is not a pg client — enlistment takes the driver's own handle')`); then `const r = await tx.query("SELECT pg_current_xact_id_if_assigned() IS NOT NULL OR statement_timestamp() <> transaction_timestamp() AS in_tx")` and throw `'PostgresStore: tx has no open transaction — the caller owns BEGIN/COMMIT'` when false. Same-pool custody (sqlite's "same connection" rule) is not verifiable through pg's public API; the doc comment states that bound plainly instead of pretending.

- [ ] **Step 6:** Replace `src/index.ts` placeholder:

```ts
// @vidimera/store-postgres — public entry point: the server-SQL third reference backing
// (SPEC §12), multi-connection-safe over a caller-owned pg.Pool. Connection custody is
// the host's: the store never creates or closes the pool.
export { PostgresStore } from './postgres-store.js';
export type { PostgresStoreOptions } from './postgres-store.js';
```

- [ ] **Step 7:** Iterate `./node_modules/.bin/vitest run --project store-postgres` until all 50 conformance tests pass. Expected friction points, in order: embedded-server API drift (fix in global-setup only), schema-name validation, `sealed`/`non_terminal` boolean vs sqlite's integers (parse `pg` booleans natively), `seq` as `integer` (pg returns JS number for int4 — verify, since int8 would arrive as string).
- [ ] **Step 8:** `test/postgres-store.test.ts` — the backing-specific pins, mirroring `sqlite-store.test.ts`'s tx pins: a foreign object as `tx` throws `/not a pg client/`; a checked-out client with NO open transaction throws `/no open transaction/`; an enlisted `putStaged` + `ROLLBACK` leaves no row; an enlisted append + `COMMIT` persists. Write each test first, watch it fail for the right reason, implement/fix, re-run.
- [ ] **Step 9:** Full gates (all projects), contract-scan, commit: `PostgresStore: the third backing, conformance-green over an embedded server`.

### Task 4: The byte-identity third leg

**Files:**
- Create: `packages/record/test/helpers/byte-identity-flows.ts`, `packages/store-postgres/test/cross-backing-byte-identity.test.ts`
- Modify: `packages/record/test/cross-backing-byte-identity.test.ts` (mechanical extraction only)

**Interfaces:**
- Produces: `happyFlow(store: Store): Promise<Transition[]>`, `refusalFlow(store): Promise<Transition[]>`, `tokenFlow(store): Promise<Transition[]>`, `assertByteIdentical(a: Transition[], b: Transition[], flow: string): void`, plus the fixed-clock/mint/token constants — all moved verbatim from the record test into the helper and re-imported by it.

- [ ] **Step 1:** Move the three flow functions, `assertByteIdentical`, and the determinism constants from `record/test/cross-backing-byte-identity.test.ts` into the new helper, exporting each; the record test file becomes imports + its three existing `test(...)` bodies, assertions unchanged. Run the record project — the three tests must pass exactly as before (this is the extraction's whole verification).
- [ ] **Step 2:** Write `store-postgres/test/cross-backing-byte-identity.test.ts`: three tests, each `assertByteIdentical(await flow(new MemoryStore()), await flow(newStore()), 'name')` — `MemoryStore` imported from `@vidimera/record` (aliased to source), flows from `../../record/test/helpers/byte-identity-flows.js`. Run — expect PASS if Task 3 is truly byte-faithful; a failure here is a store bug (most likely JSON round-trip or digest-algorithm handling), not a test bug.
- [ ] **Step 3:** Gates, commit: `The third byte-identity leg: Memory and Postgres, byte-for-byte`.

### Task 5: Contention — what neither existing backing can express

**Files:**
- Create: `packages/store-postgres/test/contention.test.ts`

**Interfaces:**
- Consumes: `newStore()`, `sharedPool()`; a second small pool of its own for the enlisted-visibility case.

- [ ] **Step 1:** Write the five tests (all `async`, real concurrency via `Promise.all` over separate pooled connections; helpers build a genesis + open record first using `storeGenesis`/`storeNext` from `../../record/test/helpers/chain.js`):
  1. CAS race: 8 concurrent `appendTransition('open', <refused edge seq 2>, …)` — exactly one `appended: true`; every other result `conflict: 'state-mismatch'` or `'seq'`; final `readChain` length 2.
  2. Genesis exclusivity race: two concurrent genesis appends, same `(profile, subject)`, different recordIds — exactly one wins; the loser reports `conflict: 'exclusivity'` with `blockingRecordId` equal to the winner's id.
  3. Seq race: 8 concurrent appends all built at seq 2 over `'open'` with non-state-leaving kind (`consultation-recorded`) — exactly one lands; chain has no gap and no duplicate seq.
  4. Batch atomicity vs reader: start 4 concurrent `appendBatch('open', fiveElementBatch…)` attempts while a loop polls `readChain` 50 times — every observed length is 1 or 6, never in between; exactly one batch reports `appended: true`.
  5. Enlisted rollback across connections: client A `BEGIN` + enlisted append + (second connection observes `readChain` unchanged) + `ROLLBACK` → still unchanged; un-enlisted retry succeeds.
- [ ] **Step 2:** Run; iterate the store's locking until all five hold (the likely fix sites: `FOR UPDATE` on the genesis existence check, the 23505 catch on the C1 index, `MAX(seq)` read after the row lock).
- [ ] **Step 3:** Gates, commit: `Contention proven: the CAS, the constraint, and the batch hold under real concurrency`.

### Task 6: Row 16 — `tx?` on the token seams

**Files:**
- Modify: `packages/record/src/operator-surface.ts`, `packages/record/src/kernel/redeem.ts` (signatures, threading, and the two doc comments that argued "NO tx" — rewritten to the new posture with its limit), `packages/record/src/create.ts` (the two closures), `docs/guide/api-reference.md`, `docs/guide/integrating.md`
- Test: `packages/record/test/redeem-token.test.ts` (new enlisted pins appended)

**Interfaces:**
- Produces: `beginRedemption(recordId: string, content: unknown, tx?: unknown)`, `completeRedemption(recordId: string, token: string, content: unknown, tx?: unknown)` on `OperatorSurface` (returns unchanged).

- [ ] **Step 1:** Write the failing tests in `redeem-token.test.ts`, mirroring `redeem.test.ts`'s ENLISTED wiring (`SqliteStore(':memory:')`, `store.database.exec('BEGIN IMMEDIATE')`, pass `store.database`, assert `store.database.isTransaction === true` after the call, then `ROLLBACK`/`COMMIT` must not throw):
  1. enlisted `beginRedemption` + ROLLBACK → replayed state back to `confirmed`, `findNonTerminal` still names the record, un-enlisted retry returns `ok` with a fresh token;
  2. enlisted `beginRedemption` + COMMIT → `redeeming` persists; then enlisted `completeRedemption` (new BEGIN) + COMMIT → `redeemed`;
  3. enlisted `beginRedemption` over a tampered chain (the `TamperingStore` wrapper pattern from `redeem.test.ts`) → `refused('chain-compromise')` result-first, chain unchanged (no edge — the inherited rung-(1) shape, now pinned for this seam);
  4. same as 3 for `completeRedemption`.
- [ ] **Step 2:** Run — expect FAIL (TypeScript: too many arguments).
- [ ] **Step 3:** Implement: widen the two `OperatorSurface` signatures (trailing `tx?: unknown` with a one-line comment citing register row 16); update `create.ts`'s closures to pass it; in `kernel/redeem.ts` add the trailing parameter to both exports, pass into `prologue(ctx, seam, recordId, tx)`, into each seam's single `store.appendTransition(..., tx)`, and into `refuseCorrespondenceMismatch(..., tx)` at its two omitting call sites. Rewrite both "NO tx, deliberately" doc comments: the enlisted issuance/completion commits or rolls back with the host's own outbox row — a rollback erases edge and outbox together (the host declining the issuance whole, not a strand) — and the crash-strand window shrinks to the host's transaction; the old no-tx argument and this reversal are the numbered inversion (grep `implementation-status.md` for the sequence's current highest entry and cite the next number in the comment, per the house pattern).
- [ ] **Step 4:** Run the new tests + the whole record project — PASS, zero regressions.
- [ ] **Step 5:** Guide: api-reference's two signatures + the note bullet about `open`'s options gains nothing — instead extend the `beginRedemption` token bullet with the enlisted form; integrating.md's effect-seam section gains the enlisted-token paragraph. Same commit.
- [ ] **Step 6:** Gates + smoke (surface moved), commit: `The token seams enlist: tx? lands, and the no-tx stance inverts on record`.

### Task 7: Register retirements, records, and the docset sweep

**Files:**
- Modify: `docs/process/deferral-register.md` (rows 15, 16, 4 leave the table), `docs/process/implementation-status.md` (current-state counts re-measured; three RETIRED notes in Still outstanding; the numbered inversion entry cross-referenced), `docs/process/next-phases.md` (header counts; the three sections gain done-notes), `README.md` (two backings → three; test counts), `CHANGELOG.md` (Added entries for the backing + tx?; Known not-done shrinks), `CONTRIBUTING.md` (setup note: pnpm install downloads embedded-Postgres binaries for the adapter suite), `CLAUDE.md` (state paragraph counts; packages description), `docs/guide/concepts.md`/`integrating.md` if they state backing counts (grep for "two backings"/"embedded-SQL" claims), `docs/README.md` if it names package layout
- Create: `docs/analysis/2026-08-19-phase-4-store-postgres.md` (the phase record: rulings, the adapter-author amendment, the inversion, the register standing)

- [ ] **Step 1:** Re-measure everything measurable (test file count, test count, lint file/info count, export count) and write the numbers with the 2026-08-19 date.
- [ ] **Step 2:** Make every edit above; grep the docset for `two backings`, `row 15`, `row 16`, `row 4`, `five live rows`, `four live rows` to catch stragglers.
- [ ] **Step 3:** Full gates one last time (`vitest run` all projects, typecheck, biome bare exit, build, smoke, contract-scan with everything staged).
- [ ] **Step 4:** Commit: `Rows 15, 16, and 4 retire: three backings held equivalent, the seams enlist, the workspace generalizes`.

## Self-Review Notes

- Spec coverage: §1→Task 1; §2→Tasks 1(paths)+3(alias); §3→Tasks 2+3; §4→Task 3; §5→Task 4; §6→Task 5; §7→Task 6; §8→Task 1; §9→Task 7; §10 respected (no publish decision, no Store signature change); §11 risks → Task 3 Step 4 bail-out + pinned versions here.
- The `#validateTx` design deliberation in Task 3 Step 5's comment block is resolved in the paragraph immediately after it; the implementer deletes the trail and keeps the decision.
- Type consistency: `PostgresStoreOptions { schema }`, `newStore()`, `nextSchemaName()`, flow-helper names match across Tasks 3–5.
