# Atomic batch append — design

**Build-order step 2, first increment.** `docs/concept/SCOPING-GUIDE.md` §7 puts "the store,
for real" next, and gives the reason: *"Do this before more features: every later feature
rides `appendBatch` untouched, which is what keeps the store diff-empty from here on."*

Step 2 as that guide writes it is not one increment — it is the full store contract, plus real
SQL adapters, plus a backing-parameterized conformance suite, plus a cross-backing
byte-identity test. Those have different risk profiles, and one of them changes this
repository's dependency and packaging posture. This design covers **the first piece only**:
the atomic batch, the `meta` object it needs, and the `listDue` read that makes `meta`'s clock
column provable.

## Why this piece first

Three reasons, in the order they matter:

1. **Everything later rides it.** Steps 3–6 each add rungs to finalize's gate ladder and each
   would otherwise re-touch the store. Landing the batch now is what makes the store
   diff-empty from here.
2. **It dissolves a defect rather than patching one.** `finalize()`'s success batch is three
   sequential appends today, so a conflict can leave consultations on the chain with no
   decision edge. Closing that took a whole remediation unit and three fix rounds, and the
   result is honest but intricate: a storage-fault throw whose justification had to be
   rebuilt twice. Under an all-or-nothing batch the situation *cannot arise*, and the
   remaining outcomes are plainly true rather than carefully bounded. Deferral register
   row 12 retires on its own stated trigger.
3. **It costs no new vocabulary.** No new refusal code, no new seam, no new record state.
   The kernel is the only caller of the changed signature, so the breaking change is
   cheapest now and gets more expensive at every later step.

## Scope

**In:** `appendBatch`; the `meta = { nonTerminal, dueAt? }` object on both append methods;
the library-side discipline that maintains `dueAt`; `listDue`; the kernel migration; the test
corpus migration.

**Out:** `findNonTerminal`, `seal`, C4 seal-finality, `tx?`, SQL adapters, the conformance
suite, cross-backing byte-identity, the operator sweep. Each is named again under
"What this does not claim".

**Not in this increment, deliberately:** extracting the gate ladder out of `finalize.ts`
(513 lines, and every remaining build step adds a rung to it). That is a real problem and a
different cluster. Landing it here would make a moved rung and a changed commit path
indistinguishable in review, on a file whose rung *order* is itself a pinned invariant.

---

## 1. The store contract

### The meta object

```ts
export interface AppendMeta {
  nonTerminal: boolean;
  dueAt?: string;   // RFC3339 UTC. Presence sets the record's pending-clock column;
                    // absence clears it. Never authoritative — a listing index only.
}
```

Both append methods take it, replacing the bare `nonTerminal` boolean. SPEC §12: the store
persists these **verbatim** — "the library derives them, the store never recomputes them".

`tx?` is deliberately omitted. An in-memory store has no transaction to receive, and a
typed-but-structurally-ignored parameter is the unfireable machinery this project's own
discipline rejects (`DECISIONS.md` #9's shape: ship it when it can mean something). It
re-enters with the first real adapter, which is the increment that can give it a value.

### The batch

```ts
appendBatch(
  expectedCurrentState: RecordState,
  transitions: readonly Transition[],
  meta: AppendMeta,
): Promise<BatchResult>;

export type BatchResult =
  | { appended: true;  transitionDigests: readonly Digest[] }   // one per element, in order
  | { appended: false; conflict: 'state-mismatch' | 'seq'; index: number };
```

`expectedCurrentState` is `RecordState`, not `RecordState | null`: SPEC §12 states that
genesis never appears in a batch, so the `null` target has no meaning here. For the same
reason `BatchResult` carries no `exclusivity` arm — C1 fires only on a genesis append. The
type says what can happen rather than carrying a variant nothing can produce.

### Semantics, from SPEC §12

- `expectedCurrentState` is checked **once** at entry.
- Elements apply in order with per-element sequencing (`seq = max+1 … max+N`,
  **server-verified**). The caller still builds the chain — it must, to compute each
  `prevHash` — and the store checks the arithmetic rather than assigning it.
- Terminal-monotonicity is evaluated against the **evolving** intra-batch state, but with the
  terminality *input* fixed at the entry flag, so a record **cannot become terminal
  mid-batch**.
- `meta` is applied **once**, as the post-batch record flags.
- The **first** conflicting element aborts the whole transaction with nothing applied, the
  outcome naming that element's index. Entry-level failures report index 0.

**The terminality rule is the one that has to be right.** For finalize's batch the entry flag
is `nonTerminal: true` (the record is open), so C3's terminal arm never fires while the batch
applies, and the `confirmed` element lands even though it is the element that makes the record
terminal. `meta` then applies `nonTerminal: false` once, at the end. The plausible wrong
reading — recompute terminality per element — makes finalize's batch reject its own last
element. It gets a named test, not incidental coverage.

---

## 2. The kernel

### Rung (6) becomes one call

`finalize()` builds all three transitions locally, then commits them together:

```ts
const postBatch: AppendMeta = {
  nonTerminal: nonTerminal('confirmed', finalLeg, resolved.effectSeam),
};
const res = await store.appendBatch('open', [cv, facts, confirmed], postBatch);
```

Today each `prevHash` comes from the store's returned digest. With no round-trip, finalize
computes them itself via `transitionDigest` — a pure function the store also uses. That yields
a free invariant worth pinning: **the digests the store returns deep-equal the digests
finalize computed.** Drift there is an encoding divergence, which the byte-stability oracle
otherwise catches only for the one pinned chain.

### What a conflict means now

There is no longer a first/second/third append with different truth conditions. There is one
call and two shapes:

| Conflict | Outcome | Why it is honest |
|---|---|---|
| `state-mismatch` (index 0) | `refused('record-not-open')` | The record is not open, **and** nothing was appended — so the code is true of the state *and* honours its never-appends entry. No residual, no bound, no hedge. |
| `seq` | storage-fault throw | Another writer appended between the chain load and the batch, which this build's single-writer bound forbids. `DECISIONS.md` #11 makes a storage fault a loud throw — and it now sits **inside** #10's "storage faults where nothing was recorded", because nothing was recorded. |

The second row is the interesting one. The equivalent throw today has to state that it sits
*outside* #10's scope, because consultations had landed. Here they have not, so the exception
moves fully inside its stated scope and the justification gets shorter rather than longer.

### Migration

`expireIfDue`, `refuseMaybeAppend`, `appendChainCompromise` and `open()`'s genesis all pass
`{ nonTerminal }` instead of a bare boolean; `open()`'s genesis also carries `dueAt`. Every
hand-rolled `Store` in the test corpus gains `appendBatch` and `listDue`.

### What retires

- **Deferral row 12** — its subject is the sequential batch, and that is what closes. One
  caveat on its own trigger text, which reads *"the batch becomes all-or-nothing and the
  mid-batch throw loses its only producer"*: the first half holds, the second does not. A
  `seq` conflict is still producible — another writer moving `max` between the chain load and
  the batch makes the caller's seqs stale — so the throw survives in simplified form. The row
  retires on its subject, not on that parenthetical, and the parenthetical is corrected when
  the row is retired rather than left as an inherited claim nobody rechecked.
- The three-site asymmetry and its documentation in `finalize.ts`'s header,
  `refusal-codes.ts`'s `record-not-open` note, and row 12's boundary clause.
- `midBatchConflict`'s hardest paragraph. The function survives as a batch-conflict fault; its
  message loses "this call appended N consultations and no decision edge" entirely, because it
  did not.
- `ConfirmBlockingStore` and `FactsConsultationBlockingStore` lose their subject — a conflict
  leaving partial state is now impossible — and become batch-conflict fixtures.
- Register row 13 narrows: the Store becomes **7 of 9**, and the signature divergence reduces
  to `tx?` alone.

`RaceThenAppendStore` survives and gets stronger: it races a real `confirmed` in before the
batch, so the entry CAS fails and `record-not-open` is genuinely true of the state. It stops
pinning a hedged claim and starts pinning a plain one.

---

## 3. `dueAt` and `listDue`

### The discipline

Exactly one producer sets `dueAt`; everything else clears it by omission — which is SPEC §12's
rule that every state-leaving append carrying no new clock clears the column.

| Append | `dueAt` |
|---|---|
| `open()`'s genesis | `openedAt + ttl` as RFC3339, present iff `expiry !== 'none'` |
| finalize's batch (post-batch meta) | absent |
| `expired`, `refused`, chain-compromise `refused` | absent |

The batch needs no special case: it contains two state-preserving consultations and one
state-leaving `confirmed`, and `meta` applies **once**, post-batch. Its net effect is a single
state-leaving append whose meta clears the column.

The effect-seam arm is right today and must not be left right-by-accident: a final-leg
`confirmed` on an effect-seam profile *should* set `dueAt` to the `confirmToRedeem` window,
but that clock is unbuilt (register row 9 records both redemption bounds as inert here), so
absent is the honest value **now**. This is the exact site that must set it when redemption's
clock lands, and the code says so at the site.

### Why `listDue` is in scope

`dueAt` is deliberately **not** part of the record model — SPEC §12 calls it a store column,
"used **only as a listing index**", "never authoritative". So it does not belong on
`DecisionRecord`, `getRecord` cannot observe it, and `readChain` returns transitions rather
than the record row.

Without a reader it is therefore **unobservable through any shipped path**, and could only be
tested by reaching into `MemoryStore`'s internals. This project measures through the shipped
path on purpose. An unobservable persisted value cannot be red-first tested, and "the
library's own meta discipline maintains it" would be a claim with no failing test behind it.

`listDue(now)` is that reader, and it is a filter: SPEC §12 specifies it as **`dueAt`-gated**
— `dueAt ≠ null AND dueAt ≤ now` — with **no state predicate**. It adds no seam, no refusal
code and no state, and it takes the Store to 7 of 9.

It gains no kernel caller. SPEC §12 puts the sweep in the operator's hands, and this build has
no sweep, so `listDue` ships as a store read that tests and a future operator seam drive. That
is stated rather than left for a reader to notice.

---

## 4. Testing

### The oracle

The four byte-stability digest literals in `packages/record/test/byte-stability.test.ts` must
not move. That is what makes this change safe to reason about: the transitions are
byte-identical and only the commit path changes. **A moved digest is a stop-and-halt, never a
literal to update.**

### Store level, red-first

- Happy path: three elements land, `transitionDigests` in order, chain reads back in order,
  `meta` applied once as the post-batch flags.
- **The intra-batch terminality rule**, named explicitly — a batch ending in `confirmed`
  against an open record with entry flag `nonTerminal: true` must land.
- Entry CAS mismatch → `{ appended: false, conflict: 'state-mismatch', index: 0 }`, with the
  chain byte-identical afterward.
- Element conflict → the index names the element, nothing applied.
- Server-verified sequencing rejects a stale seq.
- C3 against an already-terminal record → rejected at entry, index 0.

### `dueAt` / `listDue`

- Genesis under a ttl sets it. Three boundary cases: `now` strictly before `dueAt` → not
  listed; `now` exactly equal to `dueAt` → listed (the gate is `≤`, not `<`); `now` after →
  listed.
- `expiry: 'none'` is never listed, however long.
- A state-leaving append clears it: after finalize, a far-future `listDue` is empty.
- **No state predicate.** In this build only genesis sets `dueAt` and every state-leaving
  append clears it, so no kernel path can produce a due non-open record. The store contract
  still has to honour the rule, so this one test drives the store directly, appending meta
  itself. It is the single test in this increment that deliberately does not go through the
  kernel, and the reason is recorded at the test.

### Kernel level

- The free invariant: the digests the store returns deep-equal the digests finalize computed.
- `RaceThenAppendStore`: the entry conflict maps to a `record-not-open` that is plainly true.
- A `seq` conflict throws, with the chain unchanged.
- `finalize-check-order.test.ts`'s rung (6) derivation is rewritten: rung (6) now emits
  `record-not-open` from a single entry-level conflict, and a throw cannot enter an order
  pair. The `(5)→(6)` exclusion holds and gets simpler.

### Gates

Unchanged, all five: `pnpm typecheck` · `pnpm lint` · `npx biome check --error-on-warnings .`
· `pnpm test` (zero skips) · `node scripts/contract-scan.mjs`. **Diff the scan output, never
compare totals.**

---

## What this does not claim

- The Store reaches **7 of 9**. `findNonTerminal` and `seal` remain absent, so a
  `record-exists` refusal still carries no locator for the record blocking it.
- **C4 seal-finality stays unbuilt** (register row 14). `appendBatch`'s entry-level C4 failure
  therefore has no bar behind it, exactly as `appendTransition`'s already has none.
- `tx?` stays out. Register row 13 **narrows but does not retire**: two of its four absent
  methods land, and of its signature divergence only `tx?` survives — `meta` is fixed. The row
  is rewritten to say 7 of 9 and `tx?`, not deleted.
- `listDue` has no kernel caller; the operator sweep is not built.
- No SQL adapter, no conformance suite, no cross-backing byte-identity test. So
  `CONTROLS.md`'s KERNEL exclusivity bound — *"Holds only under a conforming Store adapter…
  the conformance suite is the proof"* — still points at a proof this repository does not
  have.
- The package remains unconsumable: `private`, `0.0.0`, no `exports`/`types`, no build,
  `noEmit`.
- No maturity marker moves. Every section this increment touches is already `[PROVEN]` in the
  sealed set; `docs/process/implementation-status.md` is where the change is recorded.

## Process

Subagent-driven development, as run through the previous five units — fresh implementer per
unit, adversarial review with fix rounds, halt discipline, red-first tests, byte-stability as
an oracle. Two deliberate changes:

1. **The exit record is the single home for a fact about the build.** The last remediation
   ended with five tracked documents stating overlapping facts, and its final three review
   rounds found contradictions *between documents* rather than in code.
2. **Decision-reasoning gets a tracked home.** The previous unit shipped two comments pointing
   at `(ruled)` — a ruling recorded only in a gitignored ledger, which no reader of this
   repository could open. A decision that governs code lives somewhere tracked or it is not
   recorded at all.

One inherited practice worth restating, because it caught findings four times: **prose claims
in this repository are checked against whitespace-collapsed bodies.** A claim that wraps a
line break defeats `grep -F`, and that failure mode hid a defect in the citation quotations,
in a `seal()`-as-release claim, and in a plan clause — each time until someone collapsed the
text first.
