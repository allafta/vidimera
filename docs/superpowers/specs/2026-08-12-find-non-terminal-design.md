# `findNonTerminal` — the eighth Store method — design

**Build-order step 2, third increment.** The first landed SPEC §12's atomic `appendBatch`,
the `meta = { nonTerminal, dueAt? }` object, and `listDue`; the second landed C4
seal-finality and the operator-only `seal()` seam. This one completes the Store method
surface: `findNonTerminal(profileId, subjectRef)`, the one method of the eight §12 gives a
signature to that this build does not have.

## Why this piece now

Deferral register row 13 is explicit about what the absence costs: a store missing
`findNonTerminal` "implements PART of §12's surface and does not conform to §12, and no
reading of the provisionality clause closes that gap." Everything else that remains of step
2 — `tx?`, the SQL adapter, the conformance suite, the cross-backing byte-identity test —
sits either inside §12's provisionality latitude or in proof infrastructure. This is the
last piece of the *contract* itself, and the conformance suite, when it is extracted, should
be extracted over a complete contract rather than a seven-eighths one.

It is also the smallest coherent cluster left, and it converts a recorded cost into a
capability: today "a host that draws `record-exists` has no supported way to find the record
blocking it" (`docs/process/implementation-status.md`, §12 row). §12 names this method as
exactly that way — "the re-emit binding that makes `record-exists` actionable, and the same
record C1 names as the blocker."

## Scope

**In:** the `Store` interface method; the `MemoryStore` implementation via a predicate
shared with C1's genesis scan; delegations in every test double that `implements Store`;
the test file; the record-keeping, including row 13's rewrite.

**Out:** `tx?`, SQL adapters, the conformance suite, the cross-backing byte-identity test,
the operator sweep. Each is named again under "What this does not claim".

**Deliberately not here, stated so nobody adds them by analogy:**

- **No advisory pre-check in `open()`.** C1's atomic check inside the append stays the
  enforcement; `open()` keeps reading `blockingRecordId` from the conflict result. A
  pre-check a concurrent caller could race past is exactly what `store/memory.ts`'s header
  rules out.
- **No `Outcome` shape change.** A `record-exists` refusal still carries no locator field.
  §12 puts actionability in the *read seam* — the host, holding the profile and subject it
  just tried to open, calls `findNonTerminal` itself. §8's outcome model stays untouched.
- **No operator-surface wrapper.** §9 lists the operator-only seams and this is not among
  them; it is a Store read, reached through `Config.store` like every other Store read.

---

## 1. The interface

`store/store.ts`, placed beside `listDue` — §12 groups them: "Two further reads serve
liveness".

```ts
  /**
   * The live non-terminal record for the pair, or `null` — SPEC §12: "the re-emit binding
   * that makes `record-exists` actionable, and the same record C1 names as the blocker".
   *
   * NARROWED from SPEC §12, which says this "returns the live non-terminal record for the
   * pair (or nothing)": this build returns the recordId, on the same reasoning as
   * `listDue` — the id is what every downstream seam takes (`review`, `readChain`,
   * `replay`), and returning a full record would require the store to replay chains it
   * deliberately does not interpret. Freshness (SPEC §12: "All reads return fresh values")
   * is satisfied structurally — a string is immutable, so there is nothing to clone.
   */
  findNonTerminal(profileId: string, subjectRef: string): Promise<string | null>;
```

The exact doc-comment wording is the implementer's, but the three load-bearing parts are
fixed: the §12 citation with its quoted purpose, the recorded narrowing with `listDue`'s
rationale, and the freshness note. Both quoted fragments are verbatim from SPEC §12 and must
survive the contract scan's citation resolver.

The same edit retires two stale sentences in `store/store.ts`: the header's "most likely
gaining a caller-transaction seam and a committed-read surface" stays (both still true), but
the `Store` interface comment's "NOT built in this build step: `findNonTerminal` — the sole
absence" and the shipped-methods list above it move to eight of eight, `tx?` alone
remaining.

## 2. The implementation

`store/memory.ts`. Extract the three-condition predicate from `appendGenesis`'s C1 scan
into one private helper:

```ts
  /**
   * The C1 exclusivity scan (SPEC §12's C1: a partial `UNIQUE(profileId, subjectRef)` over
   * the persisted non-terminal flag), shared by `appendGenesis`'s rejection path and
   * `findNonTerminal` — SPEC §12: "A rejected genesis append names the **blocking**
   * record — the live non-terminal record for the pair, the same record `findNonTerminal`
   * returns." One predicate, so the two agree by construction rather than by parallel code.
   */
  private liveNonTerminalFor(profileId: string, subjectRef: string): StoredRecord | undefined {
    for (const record of this.records.values()) {
      if (record.nonTerminal && record.profileId === profileId && record.subjectRef === subjectRef) {
        return record;
      }
    }
    return undefined;
  }
```

`appendGenesis`'s C1 block becomes a call to it (reading `.id` for `blockingRecordId`);
`findNonTerminal` is:

```ts
  async findNonTerminal(profileId: string, subjectRef: string): Promise<string | null> {
    return this.liveNonTerminalFor(profileId, subjectRef)?.id ?? null;
  }
```

No append-path semantics change. The extraction is the only touch to proven code, and the
existing store-constraints and exclusivity suites stay green over it unmodified — that is
the regression check on the extraction itself.

**The six test doubles.** Adding a method to `Store` breaks every class that `implements
Store`. The command that finds them — a hand-assembled list has been wrong here before —
is:

```
git grep -n "implements Store" -- packages/
```

Measured at design time: `MemoryStore` (the implementation) plus six doubles —
`TamperingStore`, `CountingStore`, `RaceOnceStore` (`test/helpers/stores.ts`), `RaceStore`
(`test/exclusivity.test.ts`), `BatchConflictStore`, `RaceThenAppendStore`
(`test/terminality.test.ts`). Each double gains a one-line delegation to its inner store,
matching how each already delegates `listDue`. `test/helpers/stores.ts`'s header comment
carries the seven-of-eight claim and is rewritten in the same edit. Do not trust this
paragraph's list over the command.

## 3. Tests

New `packages/record/test/find-non-terminal.test.ts`, red-first. Two layers, because the
method has both a store-level contract and a kernel-level purpose:

**Store-level (a `MemoryStore` driven directly, `store-constraints.test.ts` style):**

- Unknown pair → `null`.
- A staged draft alone (no genesis) → `null` — staging creates no record.
- After a genesis append with `meta.nonTerminal: true` → that recordId.
- Same profile / different subject → `null`; different profile / same subject → `null` —
  the predicate is over the pair, not either half.
- **The C1-agreement pin:** a second genesis for the same pair is rejected with
  `conflict: 'exclusivity'`; the test asserts its `blockingRecordId` strictly equals what
  `findNonTerminal` returns from the same store at the same moment. This is §12's "the same
  record C1 names as the blocker" as an executing assertion, on top of the shared-predicate
  construction.
- After an append that flips the persisted flag terminal (`meta.nonTerminal: false`) →
  `null`.

**Kernel-level (through `create()`, the flags coming from the library's own derivation):**

- An open record → its id.
- After each terminal edge this build can produce — `expired`, a terminal `refused`, a
  pure-capture final-leg `confirmed` — → `null`.
- **An effect-seam `confirmed` record → its id.** SPEC §2 makes that state non-terminal,
  and this is deferral register row 9's hold made visible: `findNonTerminal` is exactly how
  a host discovers which record holds the `(profile, subject)` pair. The test says so.
- A sealed record → `null` — it was derived-terminal before `seal()` would touch it
  (SPEC §12 admits `seal()` only there), and sealing preserves that.
- **End-to-end actionability:** open record A for a pair with a not-yet-due open-window;
  stage and `open()` record B for the same pair → `record-exists` refusal;
  `store.findNonTerminal(profileId, subjectRef)` → record A's id; `review(thatId)`
  succeeds. The flow §12's "re-emit binding" sentence describes, executed.

**The oracle:** the four byte-stability digest literals must not move. `findNonTerminal`
appends nothing and the extraction changes no write path, so any movement is a
stop-and-halt, never a literal to update.

### Gates

Unchanged, all five: `pnpm typecheck` · `pnpm lint` ·
`npx biome check --error-on-warnings .` · `pnpm test` (zero skips) ·
`node scripts/contract-scan.mjs`. **Diff the scan output, never compare totals.**

---

## 4. The record

**Row 13 is rewritten in place, under its own number.** The absent-method nonconformance —
the half of the row no reading of the provisionality clause could close — closes by
building the method. What the row still carries is real deferred work: `tx?`, the optional
caller-supplied transaction §12 puts on every write, absent because an in-memory backing
has no transaction to receive it, sitting inside §12's provisionality latitude exactly as
it always did. The row's trigger moves from "Build step 2" to the first real adapter — the
thing that first has a transaction to pass. The narrowings stay recorded there too:
`listDue` returns recordIds, and `findNonTerminal` now does the same, both against §12's
"returns the … record" wording, both for the recorded reason.

**The sweep, driven by a command, not by a list:**

```
git grep -lni -E "seven of eight|7 of 8|findnonterminal" -- docs/ packages/ CLAUDE.md
```

(Case-insensitive and packages-wide both matter: the previous increment's sweep had to be
widened for exactly those two reasons after review.) Measured at design time, thirteen
files, in four classes:

| Class | Documents | Treatment |
|---|---|---|
| **Live** | `docs/process/deferral-register.md` (row 13), `docs/process/implementation-status.md` (the steps table, the §9 row's "enforced but not *actionable*" clause, the §12 row, the "seven of eight" boundary heading and paragraph, the still-outstanding list), `packages/record/src/store/store.ts`, `packages/record/test/helpers/stores.ts` | Correct in place |
| **Live but unmatched by the grep** | `CLAUDE.md` (its step-2 sentence names neither the count nor the method, but says "two increments have landed" and lists what they landed) | Correct in place: three increments, `findNonTerminal` added to the landed list, step 2 still not exited |
| **Normative** | `docs/concept/SPEC.md` — it *defines* the method | Never touched |
| **Dated / completed** | `docs/analysis/2026-08-03-step-1-review.md`, `docs/process/adopted-source-provenance.md`, the four prior plans and two prior specs | Leave as history — **unless** a claim is written in the present tense about the current tree, in which case correct it the way `f38fd64` corrected the provenance document's stale currentness claims. Check each hit; do not assume this cell |

Re-run the grep afterward and confirm the survivors are the normative and historical
classes. Do not trust the table over the command — sites may move between design and
implementation.

**Exit-record updates** (`docs/process/implementation-status.md`), all in the same
direction:

- **Steps at a glance** — step 2 stays **"Started, not exited"**; the parenthetical list of
  what has landed and what remains both move.
- **§9 row** — "Exclusivity is enforced but not *actionable*" is no longer true and is
  rewritten: enforced *and* actionable, the locator being a Store read the host performs.
  The neighbouring fact that stays true, stated so it is not over-corrected: `open()` still
  holds C1's `blockingRecordId` internally and discards it, and a refused `Outcome` still
  carries no locator field — by design, see the non-goals.
- **§12 row** — eight of eight; the narrowing recorded beside `listDue`'s; "the absence
  still costs a host something concrete" paragraph replaced by what now exists; what
  remains of the signature divergence is `tx?` alone.
- **The named boundary** — "The store is seven of eight" becomes the eight-of-eight record,
  keeping the denominator-correction history it already carries.
- **Still outstanding** — row 13's entry updates to `tx?`-only with its new trigger.

## What this does not claim

- **Step 2 does not exit.** `tx?`, the SQL adapter, the backing-parameterized conformance
  suite and the cross-backing byte-identity test all remain. `CONTROLS.md`'s KERNEL
  exclusivity bound — "the conformance suite is the proof" — still points at a proof this
  repository does not have.
- `record-exists` still carries no locator in the `Outcome`; the host performs the lookup.
  That is §12's design, not a residue.
- The operator sweep is still not built; `listDue` still has no kernel caller.
- The package remains unconsumable: `private`, `0.0.0`, no `exports`/`types`, no build,
  `noEmit`.
- **No maturity marker moves.** §12 is `[PROVEN]` already;
  `docs/process/implementation-status.md` is where this increment is recorded.
- Deferral register **row 9 is untouched**: `findNonTerminal` *locates* the record holding
  a `(profile, subject)` pair; it releases nothing. The row's trigger — the redemption edge
  or the `confirmToRedeem` expiry edge — is unchanged.

## Process

Subagent-driven development, as run through the previous two increments — fresh implementer
per task, adversarial review with fix rounds, halt discipline, red-first tests,
byte-stability as an oracle. The standing lessons, each of which has cost a review round
here before:

1. **Where a task says "every X", the brief names the command that finds them** — both
   sweeps above ship their commands, and the measured tables are advisory only.
2. **Do not write a pointer to a record without opening it.** Row 13's rewrite quotes the
   register's own current text, not a memory of it.
3. **Check prose claims against whitespace-collapsed sources.** Every SPEC quotation in
   this spec was verified against `docs/concept/SPEC.md` §12's actual text, which wraps
   two of them across line breaks.
