# The embedded-SQL adapter (`SqliteStore`) — design

**Build-order step 2, fifth increment.** The first four landed the eight-method contract and
its conformance suite. This one lands the embedded backing SPEC §12 describes — "an
embedded-SQL store (zero-infra, single-operator)" — plus the caller-transaction seam whose
deferral trigger this increment fires, and the cross-backing byte-identity test that becomes
constructible the moment a second backing exists. After it, what remains of step 2 is the
server-SQL adapter alone.

## Why this piece now, and what it is for

The conformance suite exists, so the adapter's proof is one caller file — the sequencing the
previous increment was built to enable. Deferral register row 13's trigger reads "The first
real adapter — the build task that first has a transaction to pass": this is that build
task, so `tx?` lands here rather than being re-deferred against the register's own words.

Purpose, settled during design so the driver choice reads correctly: this is the
**reference** embedded adapter (SPEC §12's heading is "Reference adapters (implementation
guidance)"). Its first job is proving the contract over real SQL — real partial unique
index, real transactions, real persistence. Its second job is being genuinely usable by the
concept's archetypal host, the single-operator agentic application, for which SPEC's own
taxonomy makes embedded SQL the production story. Multi-operator services are the later
server-SQL adapter's audience, and any host can supply its own `Store` — the conformance
suite is what makes that safe.

## Decisions taken, so they are not re-litigated

- **Driver: `node:sqlite` (`DatabaseSync`).** Zero runtime dependencies stay zero; the
  synchronous API matches the store's no-await-inside-transaction shape. Costs, accepted
  with eyes open: the module is experimental (its API may change — a risk to adapter code,
  never to evidence, since records live in the stable SQLite file format); it emits an
  `ExperimentalWarning`, suppressed by the *targeted*
  `--disable-warning=ExperimentalWarning` (never a blanket `--no-warnings`); and the honest
  engines floor moves to `>=22.13`, where the module lost its CLI flag.
- **Scope: adapter + conformance caller + `tx?` + cross-backing byte-identity test**, plus
  the backing-specific pins named below.
- **`tx?` typing: opaque on the interface, narrowed on the class.** The `Store` interface's
  writes gain `tx?: unknown`; each adapter names its concrete handle type on its own class
  methods and validates at runtime, throwing loudly on a foreign handle. This is SPEC §12's
  sentence implemented literally: the seam is "adapter-generic: its concrete type is the
  driver's own transaction handle, named only where an adapter is instantiated, never
  abstracted behind a library-owned transaction interface". A generic `Store<TTx>` was
  considered and rejected — it propagates a type parameter through `Config`, `create()`,
  and every test double for a parameter the kernel never passes.

---

## 1. The adapter

`packages/record/src/store/sqlite.ts`, exporting `class SqliteStore implements Store`,
re-exported from `index.ts` beside `MemoryStore` (the export-count consequence is row 6's
review-time concern, by that row's own design). Constructor:
`new SqliteStore(location: string)` — `':memory:'` or a file path; opens a `DatabaseSync`,
applies the schema idempotently (`CREATE TABLE IF NOT EXISTS …`), and sets
`PRAGMA journal_mode = WAL` for file-backed databases (durability under the single-operator
concurrency this backing is scoped to).

### Schema — an implementation artifact

SPEC §12: "A persisted schema is an **implementation artifact, not a public query API**" —
the adapter's header carries that sentence, and richer listing stays the host's own read
model over the Store's reads.

```sql
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
```

The columns are constraint-and-index only, exactly as the memory backing's are — replay
over the chain stays the sole authoritative derivation. C1 is the real thing SPEC §12
prescribes: "A partial `UNIQUE(profileId, subjectRef)` over the **persisted non-terminal
flag**" — the genesis path still SELECTs the blocker first (the conflict must *name*
`blockingRecordId`, and `findNonTerminal` shares that same SELECT), with the index as the
durable backstop. `PRIMARY KEY (record_id, seq)` is C2's `UNIQUE(recordId, seq)`; the
server-verified `seq = max+1` is computed inside the write transaction.

### Semantics shared, not copied

`stateOf`, `isStateLeaving`, and `isCompromiseCarveOut` are today file-local to
`store/memory.ts`. Two backings evaluating C3/C4 from two copies of the kind→state mapping
is drift waiting to happen — the same argument that put `findNonTerminal` on C1's own
predicate. They move to a new `packages/record/src/store/semantics.ts`; `memory.ts` imports
them with its behavior byte-identically unchanged (the conformance suite over `MemoryStore`
is the regression gate on the extraction, exactly as it was designed to be). This is the
increment's only touch on proven src code.

### Writes

Every write runs inside one transaction. When no `tx` is supplied, the adapter uses its own:
`BEGIN IMMEDIATE` … `COMMIT`/`ROLLBACK` on its own connection — SPEC §12: "When none is
supplied, an adapter uses its own transaction for the write." All checks (CAS, C1, C2, C3,
C4) are SELECTs inside that transaction with the INSERT/UPDATE last, porting
`store/memory.ts`'s check order 1:1 — the transactional shape that file's header says it
models is what becomes literal here. `appendBatch` is the same shape with the entry checks
once, the per-element loop against the evolving state with terminality fixed at the entry
flag, and every element's INSERT inside the one transaction.

Transitions are persisted as `JSON.stringify(transition)` with the digest computed from the
original object before serialization (same discipline as the memory backing's
clone-after-digest). Freshness — "All reads return fresh values" — is structural: every
read parses fresh objects from text.

**This backing's own payload posture** (backing-specific by design — the conformance suite
deliberately does not bind it): a function-valued payload member is silently dropped by
`JSON.stringify`, and that is *consistent*, not corrupt — library JCS drops the same member
when digesting, so the persisted bytes and the digest agree, and `verifyChain` stays green
over the round-trip. One backing-specific test pins exactly that consistency. The memory
backing throws `DataCloneError` on the same input; each backing owns its rejection shape,
which is why those pins stayed out of the suite.

### The `tx?` seam

Interface change (`store/store.ts`): `putStaged`, `appendTransition`, and `appendBatch`
each gain a trailing `tx?: unknown`, with a doc comment carrying §12's contract: when a
host supplies one, the write is "enlisted in that transaction and commits or rolls back
with it"; "The transaction boundary is never hidden from the caller". Adding an optional
parameter breaks no implementor — the six test doubles compile unchanged and stay unchanged
(the kernel never passes `tx`; forwarding it in doubles would be dead code).

`SqliteStore` narrows the parameter on its own methods to its concrete handle — the
`DatabaseSync` connection on which the host has an open transaction (node:sqlite has no
separate transaction object; the connection *is* the enlistment surface, which is exactly
the co-location §11.2 wants: the host's effect write and the record write on one
connection, committing together). At runtime the adapter validates the handle —
`instanceof DatabaseSync` and an open transaction (`isTransaction`; the plan verifies this
getter's availability on the 22.13 floor before relying on it, with a
`BEGIN`-probe fallback named in the plan if it is missing) — and throws a caller error
otherwise. When enlisted, the adapter issues **no** `BEGIN`/`COMMIT`/`ROLLBACK` — enlisted,
never wrapped.

`MemoryStore` accepts the parameter and **throws on presence**: it has no driver and no
transaction to enlist, and a silently ignored `tx` is the failure mode the original
deferral existed to avoid — the loud throw converts it into a caller error. One
backing-specific test pins the throw.

## 2. The proofs

- **Conformance caller** — `test/sqlite-store-conformance.test.ts`:
  `runStoreConformance('SqliteStore (:memory:)', () => new SqliteStore(':memory:'))`. The
  whole suite, over real SQL, for one call — the previous increment's promise kept.
- **Cross-backing byte-identity** — `test/cross-backing-byte-identity.test.ts`, SPEC §12's
  "cross-backing end-to-end that asserts all backings produce **byte-identical chains**
  from the same scripted flow under a fixed clock". Two scripted flows through
  `createWithClock` with the same fixed clock over both backings: the full happy path
  (stage → open → finalize → seal) and a terminal-refusal path. Comparison is byte-level in
  substance: per-transition library-JCS serialization compared as strings, plus head-digest
  equality — not just `deepEqual`.
- **Backing-specific pins** — `test/sqlite-store.test.ts`: durability (file-backed temp
  database written, closed, reopened — `readChain` byte-identical); enlistment both ways
  (host `BEGIN` → write with `tx` → host `ROLLBACK` leaves the chain unchanged; host
  `COMMIT` lands it); the foreign-handle throw; the memory-side `tx` throw (in
  `store-constraints.test.ts`, beside the other memory-specific pins); the JSON-drop
  consistency pin described above.

## 3. Plumbing

- **Engines:** root `package.json` `engines.node` moves `>=22` → `>=22.13`; CLAUDE.md's
  "(Node 22+, pnpm via corepack)" moves with it. CI's `node-version: 22` resolves to
  current 22.x (≥ 22.13), so CI needs no change beyond what the warning suppression adds.
- **Warning suppression:** a root `vitest.config.ts` (none exists today) setting the fork
  pool's `execArgv` to `['--disable-warning=ExperimentalWarning']` — targeted at exactly
  this warning class, documented in the config with the SPEC-side reason, removed when
  node:sqlite stabilizes. Test output stays pristine by policy, not by ignoring noise.
- **Types:** `@types/node` ^24 (already a devDependency) carries `node:sqlite`.

## 4. The record

- **Register row 13 retires** — built, not reclassified: `tx?` exists on the interface's
  writes, honored by the adapter with enlisted-never-wrapped semantics, and loud on the
  backing that has no transaction to receive. Retirement follows the register's preamble
  (row deleted, number never reused). The `listDue`/`findNonTerminal` recordId narrowings
  it also recorded stay recorded in the status doc's §12 row, which already carries them.
- **Status doc:** the steps table (fifth increment; step 2 **still not exited** — SCOPING
  §7 says "real SQL adapters" and SPEC's three-backing proof structure is a SHOULD; whether
  embedded-only suffices for exit is the owner's ruling, deliberately not made here); the
  §12 row (adapter built, `tx?` built, the proof structure now runs over two backings with
  the byte-identity test real — the remaining absence is server-SQL); the §11.2 row gains
  nothing (the seam exists for the host's co-location, but redemption itself is untouched).
- **Stale-header sweep:** `store/store.ts` and `store/memory.ts` both describe the adapter
  as future ("provisional scaffolding standing in for a future real SQLite/Postgres
  adapter", "most likely gaining a caller-transaction seam") — those sentences move to the
  present. Sweep patterns, repo-root-wide per the standing lessons:
  `four increments|this increment|future real|one backing|no transaction to receive`, each
  hit classified live/normative/historical, both deixis directions checked.
- **CLAUDE.md / README.md:** step-2 sentences move to five increments; the Node floor
  sentence moves; the commands section stays true (no new script).
- **No maturity marker moves**; `docs/concept/` untouched.

## What this does not claim

- **Step 2 does not exit here** unless the owner rules that one SQL adapter satisfies
  SCOPING §7's plural; the record states what exists and leaves the ruling visible.
- **No server-SQL adapter, no committed-read surface** (`store.ts`'s header names it as a
  possible future; it stays future), no operator sweep, no redemption.
- The adapter is **single-operator scoped**: WAL-mode SQLite under one process. Nothing
  here claims multi-connection safety — that is the server-SQL adapter's job description.
- The schema is not API. Nothing here adds query capability beyond §12's reads.
- The package remains unconsumable (`private`, no publish tooling — row 1 unchanged).
- node:sqlite's experimental status is carried as a **watch item in the adapter's header**,
  not hidden: the API may move under a Node upgrade, and the suite is what catches it.

## Process

Subagent-driven development, as run through the previous four increments. Standing lessons
carry: commands over hand-lists; open every record cited; verify quotes against
whitespace-collapsed sources; sweep the repo root; never write a bare "this increment"
into a document that outlives it; check broken deixis in both directions. New verification
obligations this increment adds: the `isTransaction` availability check lands in the plan
as an explicit early task-step with its fallback named, and the CI run after the engines
bump is confirmed green before the increment reports done.
