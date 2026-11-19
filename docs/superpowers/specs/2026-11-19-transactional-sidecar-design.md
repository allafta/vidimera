# The transactional sidecar — design

**Date: 2026-11-19.** Licensed by call 2 of `docs/analysis/2026-11-17-sanction-calls.md`
("build it, as its own increment, and do not take the third horn"); no sealed-set edit. The
follow-up sealed commit call 3.2 reserves (condition (iii) narrowed to a sidecar that cannot join
the append's unit) lands after this increment, as its own change.

## 1. What this increment answers

The signing decorator (`signing/decorate.ts`) mints a transition's signature, checks it, and
writes its sidecar entry with `signatures.put` **before** it delegates the append, outside any
transaction. Every append that then does not commit leaves a valid signature over a transition
that never landed:

- a host transaction that rolls back an enlisted seam (`redeem`, `beginRedemption`,
  `completeRedemption` with `tx`);
- a lost compare-and-swap — the compromise edge's candidate walk, a `finalize`/`decline` batch
  that loses to a concurrent append (`record-contended`), `open()`'s expire-then-retry under a
  moving clock;
- a crash between the write and the append.

Each such orphan is inert to verification but spliceable: a key-less storage-writing insider who
writes the transition back where it was signed for is not caught (pinned in
`test/al2-conditions.test.ts`, condition (iii) of SPEC §14). And the no-edge refusal path mints
one orphan per refusing call — deferral-register row 22, one of three rows gating the 0.1 cut.

## 2. Goals, non-goals, anti-goals

- **Goal.** On each of the three reference backings — `MemoryStore`, `SqliteStore`,
  `PostgresStore` — a signature entry is persisted inside the atomic unit of the append it signs,
  after that append's compare-and-swap passes, and only then. No entry outlives an uncommitted
  append; no landed transition is left unsigned.
- **Goal.** Row 22 retires on measured behavior on all three backings.
- **Non-goal.** A host-supplied sidecar that cannot join the append's unit (a separate
  `SignatureStore` over other storage). It keeps today's order, and its residual is stated.
- **Non-goal.** Pruning, migration between sidecars, or a sidecar conformance suite for hosts'
  own `SignatureStore`s.
- **Anti-goal (row 22's hazard, call 2's hard constraint).** No change may make an entry's
  survival conditional on the append's outcome without atomicity: a write after the
  compare-and-swap but outside the append's unit reopens the landed-but-unsigned transition.
- **Anti-goal.** A silent mode: a deployment must be able to tell from its configuration which
  ordering it runs.

## 3. Constraints

- SPEC §12: the Store's compare-and-swap discipline is fixed; its argument list is provisional
  ("What is durable is the *behaviour* each method guarantees, not its argument list").
  `SignatureStore` is provisional the same way. Neither SPEC §12 nor §14 says when or where a
  sidecar entry is written; "detached" means signatures stay out of the chain's bytes.
- The frozen byte-stability digests do not move: no transition bytes change.
- The mint and the mint check stay before the append, so every "throws, nothing appended" pin
  (`signing.test.ts`, `signing-config.test.ts`, `verifier-faults.test.ts`) keeps its meaning.
- `withSigning`'s exported signature does not change.

## 4. Approaches

- **(a) A store-integrated sidecar, selected by identity (chosen).** Each reference store exposes
  `readonly signatures: SignatureStore` over its own storage; `AppendMeta` gains an optional
  `signatures` channel the store writes inside the append's unit; the decorator uses it exactly
  when the configured sidecar *is* the store's (`config.signing.signatures === config.store.signatures`).
  Explicit in the configuration, no new transaction abstraction, and every backing already has a
  single point where checks have passed and writes begin.
- **(b) Write after a successful append, outside the unit.** Forbidden: it is row 22's hazard.
- **(c) A library-owned two-phase protocol (prepare, then commit).** The Store has no generic
  transaction; SPEC §12 forbids a library-owned transaction interface ("never abstracted behind a
  library-owned transaction interface"). Rejected.
- **(d) Pick atomic mode whenever the store has `signatures`, ignoring the configured sidecar.**
  Makes `config.signing.signatures` misleading and hides the mode. Rejected for the explicit
  identity rule.

## 5. Rulings

**5.1 The Store contract.** `Store` gains an optional `readonly signatures?: SignatureStore` — a
sidecar the store persists atomically with its own appends. `AppendMeta` gains an optional
`signatures?: readonly SignatureEntry[]`. A store that exposes `signatures` and receives
`meta.signatures` on `appendTransition` or `appendBatch`:

- requires exactly one entry per appended transition, in order, each naming that transition's
  `transitionDigest`, `recordId` and `seq`; otherwise it throws a caller error before writing
  anything;
- writes the entries inside the append's atomic unit, after every compare-and-swap and
  constraint check has passed, upserting by `transitionDigest` exactly as `put` does;
- writes none when the append does not apply (any conflict arm);
- with a host `tx`, writes them through that transaction, so they commit or roll back with it.

A store without `signatures` never receives the field (5.2).

**5.2 The decorator's two modes.** `withSigning` decides once, at construction:
**integrated** when `signing.signatures !== undefined && signing.signatures === store.signatures`,
otherwise **separate**. Integrated: mint and check before the append, exactly as today (the memo
and the batch's mint-all-then-check-all order unchanged), then append with
`meta.signatures` set; no `put`. Separate: today's behavior, unchanged. A non-signing record's
appends carry no entries in either mode.

**5.3 The backings.**
- `MemoryStore`: a private map keyed by `transitionDigest`; the entries are written in the
  synchronous mutation section, after the last failable step.
- `SqliteStore`: a `signatures` table (`transition_digest` primary key; `record_id`, `seq`,
  `key_ref`, `signature`; an index on `record_id`) created with the schema; the entries are
  inserted in the same transaction body, after the transition rows. `put` is a standalone upsert
  on the store's connection; `listByRecord` a select.
- `PostgresStore`: the same table in the store's schema, created by the lazy DDL; inserted through
  the body's client (the store's own transaction, or the host's client).

Each integrated sidecar honours `SignatureStore`'s existing contract (`put` upserts by digest,
`listByRecord` promises no order). An existing SQLite or Postgres database gains the table on
first use (`IF NOT EXISTS`).

**5.4 What is not closed, stated.** Separate mode keeps today's order and every consequence:
orphans on the no-edge path, spliceable signatures over uncommitted appends. A store wrapper that
does not expose the inner store's `signatures` (or does not forward `meta` intact) runs in
separate mode — or, if it exposes `signatures` but drops `meta.signatures`, lands transitions
unsigned, which the next seam refuses `chain-compromise`: loud, not silent. **Switching an
existing deployment** from a separate sidecar to `store.signatures` leaves the earlier entries in
the old sidecar, so those records read unsigned and refuse `chain-compromise`; the host copies
the entries across (with `put`) before switching. The library does not migrate.

**5.5 The seventeenth self-authored inversion.** The decorator's recorded stance — "The sidecar
write is deliberately NOT part of any host transaction an enlisted seam passes through ... an
aborted effect's orphan signature is the same class" — reverses for integrated mode, argued at
its site: an orphan is a valid signature over a transition that never committed, which condition
(iii) makes a closure gap, and atomicity removes it without reintroducing the landed-but-unsigned
transition the stance guarded against. Separate mode keeps the stance, so no existing pin is
expected to flip; if one does, the task stops and reports it.

**5.6 Pins.**
- The store conformance suite (`test/conformance/store-conformance.ts`, run for all three
  backings) gains an integrated-sidecar block: an appended transition's entry is listed; every
  conflict arm (state, seq, exclusivity, C3, C4, a batch's element conflict) writes none; a
  mismatched or miscounted `meta.signatures` throws and applies nothing; an entry is upserted by
  digest; for the transactional backings, a host transaction rolled back after an enlisted append
  leaves no entry.
- End to end, integrated mode, on each backing (Postgres in `packages/store-postgres/test/`):
  row 22's measurement — six refusing calls against a sealed signing record leave the sidecar
  equal to the chain (zero orphans); `open()`'s expire-then-retry leaves no orphan genesis; a
  `record-contended` lost batch leaves none; and on the transactional backings, the rolled-back
  enlisted redemption leaves none.
- Condition (iii) met, in integrated mode: `al2-conditions.test.ts`'s rollback splice and
  lost-batch splice repeated over `store.signatures` — the spliced transition has no entry and the
  seam refuses `chain-compromise`. The existing pins (separate mode) stay and now say which mode
  they describe.
- Mode selection: integrated only on identity; a wrapper without `signatures` falls back to
  separate mode.

**5.7 Docs and records.** The guide's AL2 section shows `signatures: store.signatures` for the
reference stores and states both modes, the switching step and the wrapper rule; its sidecar
bullet and `api-reference.md`'s "An implementer must tolerate orphans" are rewritten by mode;
`Store.signatures` and `AppendMeta.signatures` are documented. `deferral-register.md` row 22
retires with the measurements, its separate-mode residual stated; `next-phases.md`,
`CHANGELOG.md`, the status record (a section with the inversion and measured gates) and
`CLAUDE.md` move. The comments in `signing/decorate.ts`, `signing/store.ts` and the tests that
describe the ordering say which mode they describe.

## 6. Left to the builder

Internal names; where in each backing's body the insert sits, provided it is after every check
and inside the unit; the SQL types; how the conformance block parameterizes the transactional
rollback case.

## 7. Exit

Every gate clean on all three backings (the store-postgres suite runs against its embedded
Postgres); row 22's measurements recorded; a whole-branch review on the most capable model; then
the call 3.2 sealed follow-up as its own change.

## 8. Amended after the whole-branch review

A fresh whole-branch review on the most capable model approved the branch with fixes: no
Critical finding, one Important and ten Minor. It found the code meets every ruling above — on all
three backings and every path an entry is written inside the append's unit, no conflict arm
writes one, a malformed `meta.signatures` is refused before anything is written, and the mode is
chosen by identity alone — and that what blocked a clean merge was documentation. The controller
ruled on each finding; §§1–7 stand as written except where these amend them.

**8.1 Switching, in both directions, with every writer stopped (amends 5.4).** 5.4's switching
step is safe only if no instance on the old configuration writes to the store between the copy
and the switch, or after it. A rolling restart breaks that: instances on the two configurations
each write entries the other cannot see, and the next seam that verifies such a record appends a
terminal `chain-compromise` edge on a record nobody tampered with. The reverse switch — integrated
back to separate, to move signatures onto storage of their own — has the same consequence and was
not stated. Ruling: everywhere the step appears (the guide, the api-reference, the CHANGELOG,
`next-phases.md`, the status record), it is stated for both directions: stop every instance that
writes to the store, copy the entries with `put` into the sidecar the new configuration will read,
then start only the new configuration.

**8.2 The table names stay, and are documented (amends 5.3).** The review found that a
pre-existing table named `signatures` reaches into existing databases (SQLite enlistment is
same-connection by design, so a host's own tables live in the store's file). Ruling: keep the
unprefixed name, consistent with `staged`, `records` and `transitions`; the guide's store list
names the four tables each SQL store owns, in its database file (SQLite) or schema (Postgres),
and what a same-named table of another shape does. Measured on scratch databases for both
backings before it was written: the store throws on SQLite at open, and on Postgres at every
call, when an index it creates names a column that table lacks (`records`, or a `signatures`
without `record_id`); otherwise at the first statement needing a missing column (a `signatures`
with `record_id` but not the other columns refuses the first append carrying entries, which
applies nothing). An existing index named `records_c1_exclusivity` or `signatures_by_record` is
kept as found and the store's own is silently not created; the guide states that too. 5.3's "An
existing SQLite or Postgres database gains the table on first use" holds only where no table of
that name exists.

**8.3 Pruning assumes no delete (amends the guide's reading of 5.4).** `SignatureStore` has no
`delete`; only `MemorySignatureStore` carries one, outside the contract, and the three integrated
sidecars expose none. The guide and the api-reference now say so: in separate mode a host
reconciles its own sidecar against the chain; in integrated mode an orphan is evidence — a
committed transition deleted or rewritten, or a planted entry — to keep, unless the host's own
`put` wrote it, and removing one is the host's own SQL delete by `transition_digest` against the
store's `signatures` table.

**8.4 Wording and stale comments.** The status record's §12 row and `SqliteStore`'s
`inTransaction` comment describe the savepoint the enlisted body runs in, which ends nothing of the
host's (the review confirmed it is not an inversion: the host's boundary is untouched); the entry
check's rationale for its string checks is silent mis-storage (SQLite stores `42` as the text
`'42.0'`) and a late, backing-specific failure — no longer a host commit landing rows unsigned,
which the SQLite savepoint and the Postgres abort both rule out; `store/semantics.ts` no longer
says three backings carried a copy of the check (`PostgresStore` never did); the api-reference is
re-dated; two over-long guide lines are rewrapped.

**8.5 Pins added.** Each behavior already held, so each pin was shown to discriminate by a
temporary mutation, reverted: separate mode on `SqliteStore` (six refusing calls grow a separate
sidecar from 5 to 11, six orphans, the store's own table untouched — the figure the guide cites,
re-measured on all three backings and unchanged); a non-array `meta.signatures` refused before
anything is written, on `MemoryStore` and `SqliteStore`; `signatureEntriesToWrite` named in the
public-surface pin; the store-postgres enlisted pin asserting the abort itself; the store-postgres
rollback pin releasing its client even when `ROLLBACK` throws; and the probe tier run over an
integrated configuration, reaching the separate configuration's outcome on every probe.

**8.6 Deferred, with its reason.** `PostgresStore` writes an append's entries one statement per
round trip while it holds the record-row lock, so a many-element batch lengthens the hold; one
multi-row upsert would shorten it. Deferred by ruling: the lock order is unchanged — entry rows
are inserted only by the holder of the record-row lock, or of the genesis advisory lock after its
records insert — so no new wait cycle is possible, and the cost is latency under many-element
batches on a hot record.
