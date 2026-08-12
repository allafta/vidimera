# The store conformance suite — design

**Build-order step 2, fourth increment.** The first three landed the eight-method Store
contract (`appendBatch`/`listDue`/meta, C4 + `seal()`, `findNonTerminal`). This one builds
the first half of §12's proof structure: the **backing-parameterized conformance suite** —
SPEC §12's "the executable definition of a correct `Store`" — extracted from the existing
store-level tests and run over the one backing that exists.

## Why this piece now

`docs/concept/SCOPING-GUIDE.md` §7 gives step 2 four remaining pieces: "real SQL adapters,
and the backing-parameterized conformance suite + byte-identity cross-backing test", plus
the `tx?` seam (deferral register row 13). The suite comes first because it is what proves
an adapter: built now, over `MemoryStore` alone, the SQLite increment starts with its proof
already standing and adds one three-line caller file. Built after, the same tests get
reshaped twice. `CONTROLS.md`'s KERNEL exclusivity bound already points here — "the
conformance suite is the proof" — and today that proof does not exist as a runnable thing;
after this increment it exists and runs, over one backing, with the cross-backing half
still honestly absent.

This increment touches **no file under `packages/record/src`** — the src diff is empty, and
that emptiness is a review criterion, not an accident.

## Scope

**In:** the parameterized suite module; the `MemoryStore` caller file; migration of every
store-driven contract pin into the suite, assertions preserved verbatim; a small set of new
store-level `listDue` pins (the one contract area currently pinned only through the
kernel); rewritten headers for the two residual test files; the record updates.

**Out:** the SQLite adapter, `tx?`, the server-SQL adapter, the cross-backing byte-identity
test (it needs a second backing to exist), and any `src` change. Step 2 does not exit here.

**Decided, so it is not re-litigated:** the suite is **test-side only** —
`packages/record/test/conformance/`, not a public export. The package is private and
unconsumable (deferral register row 1), so an exported suite has no possible consumer;
whether to ship it as an adapter-author's tool is part of the 0.1-cut API review's
question set (row 6's territory), recorded in the status doc's §12 row rather than decided
now.

---

## 1. The suite module

`packages/record/test/conformance/store-conformance.ts` — a TEST-ONLY helper module (not
`.test.ts`), the same convention as `helpers/chain.ts` and `helpers/profiles.ts`, one
directory deeper so the thing SPEC names is a thing a reader can point at.

```ts
export function runStoreConformance(label: string, makeStore: () => Store): void
```

It registers `describe('Store conformance: ' + label, …)` (or template-literal equivalent —
Biome's `useTemplate` applies) containing every contract pin, each test constructing a
fresh store via `makeStore()`. No shared state between tests; no clock dependence beyond
the fixed timestamps the chain helpers already stamp. `makeStore` is synchronous today
because both present and next-increment backings construct synchronously; if a future
backing needs async setup, widening the factory type is the kind of signature change §12's
own provisionality posture tolerates — the suite is not public API either way.

The suite imports `storeGenesis`/`storeNext` from `../helpers/chain.js` and the `Store`
type from `../../src/store/store.js`. It never imports `MemoryStore` — a suite that
constructs its own backing would not be parameterized, just relocated.

## 2. The caller

`packages/record/test/memory-store-conformance.test.ts`:

```ts
import { MemoryStore } from '../src/store/memory.js';
import { runStoreConformance } from './conformance/store-conformance.js';

runStoreConformance('MemoryStore', () => new MemoryStore());
```

Plus the repo-standard header comment naming what the file is. When the SQLite adapter
lands, its conformance proof is one more file of this shape.

## 3. The migration

**The criterion, stated once and applied mechanically:** a test migrates into the suite iff
it drives a `Store` instance directly through the eight-method interface with hand-supplied
`meta` flags. A test that reaches the store through `create()`/`createWithClock()` pins the
*kernel's* use of the store and stays where it is. A test that pins `MemoryStore`'s own
documented implementation decisions stays behind as backing-specific.

Applied to the current tree (the plan re-derives this with a command; counts here are
design-time measurements):

- **`store-constraints.test.ts` — 27 of 30 migrate.** The staged round-trip / idempotency /
  first-write-wins / freshness pins, the genesis and CAS pins, C1/C2/C3, the
  readChain/chainHead pins, the no-retention (clone-on-write) pins, and the three C4 pins.
  **The three `DataCloneError` tests stay**: they pin `MemoryStore`'s documented
  `structuredClone` decision (the store-clone decision comment in `store/memory.ts`) — a
  SQL backing would reject a function-valued payload member differently, so imposing that
  exact error shape suite-wide would be writing `MemoryStore`'s implementation into the
  contract. The residual file keeps its name and gets a rewritten header saying what it now
  holds: the memory backing's own clone-decision pins.
- **`store-batch.test.ts` — 9 of 10 migrate.** The atomic-batch contract pins (happy path,
  entry-flag terminality, entry CAS at index 0, per-element seq, C3-at-entry, empty-batch
  throw, cross-record throw, genesis-in-batch throw, post-batch state). **The
  "throwing clone applies nothing" test stays** — same `structuredClone` reasoning.
- **`find-non-terminal.test.ts` — the 5 store-level tests migrate** (unknown pair, genesis
  → id, pair-not-halves, C1 agreement, flag-flip → null); the 8 kernel-level tests stay.
  The file header's two-layer description updates to say the store layer now lives in the
  suite.
- **`due-listing.test.ts` — 1 of 4 migrates.** The "NO state predicate" test drives the
  store directly and says so in its own comment ("the only test in this file that does not
  go through the kernel") — under the criterion it belongs to the suite. The three
  kernel-driven tests stay, and the file header's "only test" sentence is rewritten to say
  the store-driven pin now lives in the suite.

**Verbatim means verbatim:** assertions, fixture values, and test titles move unchanged
(titles may gain nothing; the describe label carries the backing name). No pin is inverted,
so the inherited-corpus inversion rule is not in play — this is relocation, and the review
checks it as relocation: the migration diff must show no assertion edits, and the sorted
test-title inventory before/after must differ only by the deliberate additions below.

## 4. New pins: `listDue` at the store level

`listDue` is the method whose store-level contract is thinnest today: of
`due-listing.test.ts`'s four tests, three drive `create()` and only the no-state-predicate
test drives the store (it migrates, section 3). A future adapter's `listDue` needs the rest
of the gate pinned without the kernel too, so the suite adds a small section beside the
migrated pin, hand-supplying `meta.dueAt`:

- the gate verbatim — a record with `dueAt ≤ now` is listed, one with `dueAt > now` is not
  (boundary: `dueAt === now` IS listed, per SPEC §12's `dueAt ≠ null AND dueAt ≤ now`);
- no `dueAt`, never listed;
- presence sets, absence clears — an append whose `meta` omits `dueAt` clears the pending
  clock (mirrored at the meta level, not through `finalize()`).

These are additive pins on existing behavior — they should pass on first run against
`MemoryStore`, and the plan's TDD posture for them is stated honestly: they are regression
pins on built behavior, not red-first tests of new behavior, and each must be
mutation-checked once at authoring time (temporarily flip the comparison locally, see it
fail, restore) so none is vacuous. `due-listing.test.ts` itself stays untouched — it pins
the kernel's flag *production*; the suite pins the store's flag *consumption*.

## 5. Testing the increment itself

- **Counts:** moves keep the total flat; the only growth is the new `listDue` section.
  The plan pins exact before/after numbers measured at execution time (design-time: 301
  tests / 27 files before; after = 301 + the new pins, in 28 files — the suite module is
  not a test file; the caller is).
- **The oracle:** the four byte-stability digest literals are untouched — this increment
  cannot move them (no src change) and the exit check says so explicitly.
- **Gates:** all five green at every commit; **diff the contract-scan output, never
  totals**. The suite module carries SPEC §12 citations; they must resolve through the
  scan's TypeScript citation resolver.
- **Order:** migration lands first and green (pure relocation, suite over `MemoryStore`),
  the new `listDue` pins land second — so a migration mistake is not maskable by new-test
  noise.

## 6. The record

Per the sweep lessons from the previous increment (final-review recommendation, recorded in
the increment ledger before its deletion): the record sweep runs **repo-root-wide**
(`git grep … -- .`), its patterns include `this increment` alongside the topic phrases, and
every new status-doc claim names its increment explicitly ("the fourth step-2 increment"),
never the bare deictic.

- **`docs/process/implementation-status.md`:** the steps-at-a-glance step-2 row (four
  increments; the suite exists and runs over the in-memory backing; SQL adapters, `tx?`,
  and the cross-backing byte-identity test still absent — step 2 still not exited); the
  §12 row's proof-structure sentence ("has nothing to run over" is no longer true — the
  suite exists and runs over one backing; what the cross-backing proof still lacks is a
  second backing); a one-clause note that the suite is test-side by decision, its possible
  export being 0.1-cut territory.
- **`CLAUDE.md` / `README.md`:** the step-2 sentences move from three increments to four,
  naming the suite.
- **Deferral register:** no row changes. Row 13 (`tx?`) is untouched — nothing this
  increment builds or defers touches it. No new row: the suite is step-2 work being done,
  not deferred.
- **`docs/concept/` untouched**, as always; no maturity marker moves; the substitute exit
  record is the status doc.

## What this does not claim

- **Step 2 does not exit.** The embedded-SQL and server-SQL adapters, `tx?`, and the
  cross-backing byte-identity test remain. SPEC §12's full proof structure — three backings
  "held equivalent" by this suite plus the byte-identity end-to-end — is one-third real
  after this increment: the suite runs, over one backing, and "An inheriting project SHOULD
  reproduce this proof structure" is still ahead of this repository, not behind it.
- The suite proves **store conformance**, not kernel correctness — the kernel-level tests
  stay where they are and keep doing that job.
- The `DataCloneError` pins deliberately do **not** bind future backings; each backing owns
  its rejection shape for non-serializable payloads, and the suite stays silent there.
- The package remains unconsumable; nothing is exported.

## Process

Subagent-driven development, as run through the previous three increments — fresh
implementer per task, task review, scoped re-review fix rounds, final whole-branch review.
The standing lessons carry (commands over hand-lists; open every record you cite; verify
quotes against whitespace-collapsed sources), plus the two this project just paid for:
sweep the repo root, and never write "this increment" into a document that outlives it.
