# Design: the PostgreSQL backing, the token seams' `tx?`, and the workspace shape

**Date: 2026-08-19.** The phase-4 increment of the release plan
(`docs/analysis/2026-08-18-release-phase-brainstorm.md`): deferral-register **row 15** (the
server-SQL third reference backing), **row 16** (the additive `tx?` on
`beginRedemption`/`completeRedemption`), and **row 4** (workspace-shape generalization,
whose trigger — "Second workspace package lands" — this increment fires deliberately).
Owner rulings from the 2026-08-19 phase-4 session: PostgreSQL with the `pg` driver; an
embedded-Postgres dev-dependency as the test server; adapter tests inside the default
`pnpm test`; row 16 bundled here. Design approved in session before this document was
written.

Row 15's own definition of done governs: "a third backing (an adapter package or module)
wired into the existing conformance suite by one caller file, a third leg added to the
cross-backing byte-identity test, and real multi-connection contention coverage that
neither existing backing can express."

## 1. Package shape

New workspace package `packages/store-postgres`, name `@vidimera/store-postgres`,
`private: true` (whether it publishes at the 0.1 cut is deliberately a later phase's
question — the row demands the backing exist as proof structure, not that it publish).
Same conventions as `record`: `type: module`, `license: Apache-2.0`,
`author: The Vidimera Authors`, `engines >=22.16`, a `tsconfig.json`
(`extends ../../tsconfig.base.json`, `include: ["src","test"]`), a `tsconfig.build.json`
(src-only, declarations, `dist/`), `sideEffects: false`, a single `.` export.

- **dependencies:** `pg` — the adapter's own driver, never the core's (the phase-0
  ruling). `@vidimera/record` is a **peerDependency** (types-only at runtime: `Store` is
  an interface the adapter implements structurally; nothing from `record` executes inside
  the adapter).
- **devDependencies:** `vitest` (row 4's per-package rule), `@types/pg`,
  `@vidimera/record` (`workspace:*`, satisfying the peer locally), and the embedded
  Postgres server package — candidate `embedded-postgres`, its exact identity and platform
  coverage (win/macos/linux) verified at plan time, with a fallback candidate named there
  if it disappoints.

**Exports:** `PostgresStore` (the class) and `PostgresStoreOptions` (its config type).
Nothing is added to `@vidimera/record`'s own surface — `test/public-surface.test.ts`'s
export pin stands untouched.

## 2. Type wiring — no build-ordering, run-from-source preserved

`record`'s exports map points at `dist/`, so a bare `@vidimera/record` import would demand
a build before typecheck. Instead:

- **Adapter `src`** imports from `'@vidimera/record'` — types (`Store`, `Transition`,
  `StagedDraft`, `AppendMeta`, result shapes) and the four adapter-author runtime helpers
  §3 adds. For **tsc**, a `paths` mapping in the adapter's tsconfigs
  (`"@vidimera/record": ["../record/src/index.ts"]`) resolves the specifier to source;
  emitted declarations keep the bare specifier (tsc does not rewrite `paths`), which is
  exactly what the peerDependency contract wants.
- For **vitest**, the `store-postgres` project (§4) carries one `resolve.alias` mapping
  `@vidimera/record` to `packages/record/src/index.ts`, so the runtime helpers also
  resolve to source — no build step, no build ordering. A published adapter resolves the
  bare specifier against the installed peer normally.
- **Adapter tests** import `record`'s test helpers (the conformance suite, the extracted
  byte-identity flows) **relatively** (`../../record/test/...`), the same way `record`'s
  own tests run from source; the root vitest `include` glob already covers
  `packages/*/test`.

## 3. The store: schema and semantics

Port of `SqliteStore`'s proven design (`packages/record/src/store/sqlite.ts`), reusing —
never re-deriving — `record`'s cross-backing store machinery. That machinery is runtime
code the adapter genuinely executes, and none of it is exported from `record`'s entry
point today. **The design adds it as one deliberate, grouped export: the adapter-author
surface** — `transitionDigest` (`chain/encoding.ts`; a store must recompute each appended
transition's digest for its `AppendResult`, and the private transition encoding cannot be
recomputed from outside), plus `stateOf`, `isStateLeaving`, and `isCompromiseCarveOut`
(`store/semantics.ts`; the C3/C4 arms every conforming backing must express), plus the
`GenesisPayload` type (the payload shape a genesis append reads). The argument: SPEC §12
explicitly contemplates third-party `Store` adapters ("A third-party `Store` adapter
implementer MUST honor the contract below"), and a documented adapter contract whose
required helpers are unimportable is the phase-1 review's unspellable-names defect
wearing store clothes; re-derivation in the adapter is exactly the drift hazard the repo
names against hand-rolled stores. This is a post-review surface amendment — four pure
functions and one type — landed under this spec's own authority, added to
`public-surface.test.ts`, documented in the api-reference under an "adapter authors"
heading, and recorded in the phase-4 record as a deliberate amendment, not slipped in.

**Schema** (all identifiers schema-qualified; one Postgres schema per store instance):

```sql
CREATE TABLE <s>.staged (
  id         text PRIMARY KEY,
  draft_json text NOT NULL                     -- JSON.stringify, mirroring sqlite
);
CREATE TABLE <s>.records (
  id           text PRIMARY KEY,
  profile_id   text NOT NULL,
  subject_ref  text NOT NULL,
  state        text NOT NULL,
  non_terminal boolean NOT NULL,
  due_at       text,                            -- toISOString grammar; lexicographic <= is correct
  sealed       boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX records_c1_exclusivity
  ON <s>.records (profile_id, subject_ref) WHERE non_terminal;
CREATE TABLE <s>.transitions (
  record_id       text NOT NULL,
  seq             integer NOT NULL,
  transition_json text NOT NULL,
  PRIMARY KEY (record_id, seq)
);
```

`transition_json`/`draft_json` are `text` holding `JSON.stringify` output — **not**
`jsonb` — because `jsonb` normalizes (key order, duplicate keys, number forms) and the
byte-identity proof is about the stored transition bytes replaying identically;
`SqliteStore`'s JSON-drop payload posture is inherited verbatim.

**Method semantics**, mirroring sqlite arm-for-arm:

- `appendTransition`: entire body in one transaction. Genesis: record-exists →
  `state-mismatch`; live non-terminal for the pair (one shared query with
  `findNonTerminal`, so the named blocker is the same record) → `exclusivity` +
  `blockingRecordId`; `seq !== 1` → `seq`; insert record row + transition. Subsequent:
  state CAS → C4 (`sealed`) → C3 (`isStateLeaving` unless carve-out) → C2
  (`seq === max+1`, computed inside the transaction **with the record row locked** —
  see contention below) → insert + one `UPDATE` of
  `state / non_terminal / due_at (absence clears) / sealed (sticky)`.
- `appendBatch`: validate-then-write inside one transaction; entry CAS once (mismatch or
  sealed → `index: 0`); entry non-terminal flag fixed for the whole loop; per-element
  evolving-state C3, contiguous seq, `opened`-in-batch and recordId-mismatch throws;
  digests accumulated; single post-batch meta `UPDATE`. Empty batch throws; `validateTx`
  runs before the empty check (the memory backing's pinned order).
- **Locking discipline (the Postgres-specific part):** sqlite gets serialization free
  from `BEGIN IMMEDIATE` on a single connection; Postgres under a pool has real
  concurrency, so the CAS reads the record row `FOR UPDATE` (and the genesis path handles
  the C1 unique-index race by catching `unique_violation` and re-reading the blocker —
  the constraint is the backstop, the SELECT names the blocker). `READ COMMITTED` plus
  row locks and the two unique constraints is the design; the contention tests exist to
  prove it rather than assert it.
- `tx?`: accepts a `pg` **client** (`PoolClient`/`Client` — the driver's own handle,
  adapter-generic per SPEC §12) with an open transaction; `validateTx` throws on a
  foreign object or an idle client, mirroring sqlite's two caller-error throws. When
  absent, the method checks out a pooled client and owns `BEGIN`/`COMMIT`/`ROLLBACK`
  (original error rethrown, rollback failure swallowed — sqlite's pinned posture).
- Reads: fresh values per call (`JSON.parse` per read gives this free); `listDue(now)`
  is `due_at IS NOT NULL AND due_at <= $1` on the ISO string; `chainHead` recomputes the
  head digest the way sqlite does.

**Construction is synchronous** — `new PostgresStore(pool, { schema })` takes a caller
`pg.Pool` (never creates one: connection custody is the host's, the same posture as key
custody) plus a schema name; DDL runs lazily behind a memoized `ready` promise awaited by
every method. Synchronous construction is what keeps the conformance suite's
`() => Store` factory signature **completely unchanged**.

## 4. Conformance wiring — one caller file, suite untouched

`packages/store-postgres/test/postgres-store-conformance.test.ts`:

- a module-level shared `pg.Pool` (small `max`, e.g. 5) pointed at the embedded server;
- `runStoreConformance('PostgresStore (embedded)', () => new PostgresStore(pool,
  { schema: nextSchemaName() }))` — imported relatively from
  `../../record/test/conformance/store-conformance.js`; a fresh schema per factory call
  is what "fresh, empty store" means here (~50 schemas per run, dropped with the
  database).

The suite file itself does not change — the row's "wired ... by one caller file" is met
literally.

**The embedded server lifecycle:** the root vitest config gains **projects** — `record`
(as today, no setup) and `store-postgres`, whose project-scoped `globalSetup` starts one
embedded Postgres per test run (fresh temp data dir, random port), publishes its DSN to
the tests, and tears it down after. `pnpm test` runs both projects: one command, zero
skips, the server's absence impossible by construction. Connection problems fail loudly —
there is deliberately no skip path.

## 5. The third byte-identity leg

The three flow functions (`happyFlow`, `refusalFlow`, `tokenFlow`) and
`assertByteIdentical` move from `record/test/cross-backing-byte-identity.test.ts` into a
new `record/test/helpers/byte-identity-flows.ts`; the record-side test keeps pinning
Memory ↔ Sqlite exactly as today (a mechanical extraction, no assertion changes). The
adapter adds `test/cross-backing-byte-identity.test.ts` driving the same flows against
`PostgresStore` and asserting Memory ↔ Postgres byte identity — with Memory ↔ Sqlite
already pinned, identity is transitive across all three.

## 6. Contention coverage — what neither existing backing can express

`packages/store-postgres/test/contention.test.ts`, all against one store over separate
pooled connections, real concurrency:

1. **CAS race:** N concurrent `appendTransition('open', refused-edge …)` on one record —
   exactly one `appended: true`, every loser `state-mismatch`, final chain length exactly
   +1.
2. **Genesis exclusivity race:** two concurrent genesis appends for one
   `(profile, subject)` — exactly one wins; the loser's conflict is `exclusivity` and
   names the winner as `blockingRecordId`.
3. **Seq race:** concurrent appends racing the same expected state at the same seq —
   C2 admits exactly one per slot; no gaps, no duplicates in the final chain.
4. **Batch atomicity vs a concurrent reader:** a reader polling `readChain` during
   concurrent `appendBatch` attempts never observes a partial batch (length jumps by the
   whole batch or not at all).
5. **Enlisted rollback across connections:** a host transaction on one client with an
   enlisted append, rolled back — a second connection never sees the edge; retry
   un-enlisted succeeds (the sqlite enlistment pins, now under real cross-connection
   visibility).

## 7. Row 16 — the token seams' `tx?`

`beginRedemption(recordId, content, tx?)` / `completeRedemption(recordId, token, content,
tx?)`, additive trailing parameter on the operator surface, `create.ts`'s closures, and
the kernel functions (`Kernel` picks up the widened types automatically). Threading, per
the survey of `kernel/redeem.ts`: pass `tx` into `prologue` (already tx-aware — the
enlisted chain-compromise and due-clock branches exist and are inherited, not
re-decided), into each seam's single `store.appendTransition`, and into
`refuseCorrespondenceMismatch` at its two currently-omitting call sites.

**This inverts a recorded stance, and says so.** Both seams' doc comments currently argue
"NO tx, deliberately" (a host rollback could erase the recorded `tokenDigest` while the
live token is out). Register row 16 and the phase-0 ruling are the authorization; the new
posture is argued in place at the seam: an enlisted issuance hands the host exactly the
atomicity it asked for — the `redeeming` edge commits or rolls back with the host's own
outbox row, so a rollback erases the edge *and* the outbox entry together, which is the
host declining the issuance whole, not a strand; the crash-strand window between append
and token return shrinks to the host's own transaction. The stance change is recorded as
the next entry in `docs/process/implementation-status.md`'s numbered
self-authored-inversion sequence (current count verified at plan time).

**Tests (TDD, sqlite as the enlisted host, mirroring `redeem.test.ts`'s five pins):**
enlisted `beginRedemption` + ROLLBACK → state back to `confirmed`, pair still held,
un-enlisted retry succeeds with a fresh token; enlisted `completeRedemption` + COMMIT →
`redeemed`; enlisted begin/complete over a tampered chain → result-first
`chain-compromise`, no edge (the inherited rung-(1) shape, now pinned for these seams);
`isTransaction` still true after each call. Guide (`api-reference.md`,
`integrating.md`) moves in the same change.

## 8. Row 4 — fired deliberately, landed here

- Root `typecheck` becomes both packages (two `tsc -p ... --noEmit` invocations).
- Root `build` builds both (`record` first — no cross-build dependency exists, but
  determinism reads better).
- `vitest` declared in **both** packages' devDependencies (the root keeps its own copy —
  the root config file imports `vitest/config`); single version, pnpm dedupes.
- The root vitest config's restructure into projects (§4) is row 4's test-runner half in
  practice.

## 9. CI, docs, and register

- **CI:** no structural change — the embedded server runs inside the suite on all four
  matrix combos, so Windows and macOS get real Postgres coverage. Install size grows by
  the embedded binaries (devDependency only; stated in CONTRIBUTING's setup note).
- **Docs in the same change:** `api-reference.md` (the `tx?` signatures; the
  adapter-author helper exports with their rationale), `integrating.md` (store choice
  gains the Postgres backing; enlisted token shapes), `CONTRIBUTING.md` (the embedded
  server + install note), `README.md` (two backings → three), CHANGELOG, CLAUDE.md
  (commands unchanged; state counts move), `implementation-status.md` (rows 15/16/4
  retirements + the inversion entry), `next-phases.md`, and the register itself: **rows
  15, 16, and 4 retire** when their behaviors land, each leaving its numbering gap.
- The contract scan covers the new package's tracked `.ts` — its comments' SPEC citations
  must resolve, same bar as `record`.

## 10. Out of scope, stated

No `@vidimera/store-postgres` publish decision (phase 5/6); no store-signature changes
(the OPEN-QUESTIONS §9 freeze stays a 1.0 gate — the adapter implements the shape as-is);
no committed-read surface (named-not-built in the store header stays so); no CI service
containers; no changes to `MemoryStore`/`SqliteStore` behavior (the byte-identity flow
extraction is mechanical).

## 11. Risks, named

- **The embedded-server package** is the one third-party moving part: platform coverage
  and PG version pinning get verified at plan time before anything depends on it; the
  fallback is a second embedded-binaries package, and the design isolates the choice
  inside one globalSetup file.
- **The adapter-author exports** (§3) grow `record`'s reviewed surface by four pure
  functions and one type after the phase-1 review closed; the addition is argued above,
  lands under this spec's own authority, is added to `public-surface.test.ts`, and is
  recorded in the phase-4 record as a post-review amendment — deliberately, not silently.
- **Pool/connection budget in tests:** ~50 schemas and a shared small pool; the embedded
  server's default `max_connections` (100) is respected by using one pool for the
  conformance run and a second small pool for contention tests.
