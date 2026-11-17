# Chain Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Red is observed before green for every new pin.

**Goal:** Bind every chain the library loads to the recordId it was loaded for, address every
library-built transition by the caller's id, and pin both so neither can regress.

**Architecture:** `verifyChain` gains an optional requested id and checks identity and the
genesis link against it; every verifying load passes its id, so a relocated chain flows into
each seam's existing failure arm. The edge builders take the id as a parameter. Non-verifying
loads call one shared identity check that throws. A source census pins the shape.

**Tech Stack:** TypeScript (strict), vitest, Biome, `node:sqlite`, pnpm via the local binaries.

**Spec:** `docs/superpowers/specs/2026-11-17-chain-binding-design.md` — its rulings 5.1–5.8
bind every task; read it before starting any task.

**Task 0 (done before execution, by the authoring session):** the design and this plan are
committed together with their `docs/superpowers/INDEX.md` row and file counts.

## Global Constraints

- **Branch:** `chain-binding-2026-11-17` off `main` at `b2ea16b`. Confirm with
  `git branch --show-current` before every commit.
- **Commits:** message written to a BOM-free temp file, committed with `git commit -F <file>`,
  ending with the exact line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Run `pnpm lint` in every task that edits a file**, and `pnpm typecheck` before each commit.
- **STOP, absolute — never edit:** `docs/concept/**`; `packages/record/test/byte-stability.test.ts`;
  `packages/record/src/index.ts`; `packages/record/src/store/**`;
  `packages/record/src/signing/store.ts`; `packages/record/test/conformance/**`;
  `packages/store-postgres/**`; both `package.json` manifests; any existing `PINNED_` literal.
  No push, no merge.
- **No existing assertion may change its truth value.** The only edit allowed to an existing
  test is the comment in `test/replay-verify.test.ts`'s foreign-splice test (Task 1). If any
  existing test goes red, STOP and report — do not adjust it.
- **Honest chains change no byte:** for every chain the store honestly returns,
  `last.recordId === recordId`, so every edge and every digest stays as it was.
- **The read-check error message contains the exact phrase `foreign persisted data`**, names
  the seam, the requested id and the id found, and cites SPEC §8.
- **New comments and markdown reference nothing outside this repository.** Cite SPEC as the
  existing code does (`SPEC §8`, `SPEC.md:555`).
- **Measured figures are measured, never copied** (test counts, file counts).

## Review Focus

1. **Honest stores see no change.** The whole suite and the byte-stability digests stay green
   after Tasks 2, 3 and 4 — each of those tasks ends with a full `pnpm test` run.
2. **A relocation whose source chain has a different length** must still refuse
   `chain-compromise` and leave Y untouched, even though no edge can land on X (Task 3,
   `relocation from a longer chain`).
3. **A mixed chain** — one foreign row in the middle, links recomputed — breaks at that seq in
   `verifyChain(chain, id)` and throws at every read (Task 1, Task 4).
4. **Enlisted redemption over a relocated X** refuses `chain-compromise` with no edge and no
   nested-transaction throw (Task 3).
5. **Empty chains keep their behavior** at every read, and an unknown id is never reported as
   foreign data (Task 4).

---

### Task 1: `verifyChain` binds to an optional requested id

**Files:**
- Modify: `packages/record/src/chain/replay.ts` (`verifyChain` and its doc comment, ~lines 336-410)
- Modify: `packages/record/test/replay-verify.test.ts` (comment only, the foreign-splice test ~line 414)
- Create: `packages/record/test/chain-binding.test.ts`

**Interfaces:**
- Produces: `verifyChain(chain: readonly Transition[], recordId?: string): ChainVerifyReport`
  (still exported from the package root; `index.ts` itself is not edited).

- [ ] **Step 1: Write the failing tests** in `test/chain-binding.test.ts` (section `verifyChain(chain, recordId)`), building chains with `buildChain` from `test/helpers/chain.ts`:
  - `verifyChain(chain, recordId): a wholly relocated chain breaks at seq 1, naming both ids` — a 3-step chain built for `'rec-Y'`, verified with `'rec-X'` → `intact: false`, `firstBreakSeq: 1`, `detail` matches `/rec-X/` and `/rec-Y/`.
  - `verifyChain(chain, recordId): a relabelled chain breaks at seq 1 on the genesis link` — the `'rec-Y'` chain with every `recordId` rewritten to `'rec-X'` and links 2..n relinked, genesis `prevHash` left as `'rec-Y'`'s → `firstBreakSeq: 1`, `detail` matches `/genesis prevHash/`.
  - `verifyChain(chain, recordId): a mixed chain breaks at the foreign row` — the `'rec-X'` chain with row 2's `recordId` set to `'rec-Y'` and row 3 relinked, verified with `'rec-X'` → `firstBreakSeq: 2`.
  - `verifyChain(chain, recordId): the matching id reports intact` → `{ intact: true }`.
  - `verifyChain(chain): omitting recordId keeps today's behavior` — the `'rec-Y'` chain verified with no id → `{ intact: true }`.

- [ ] **Step 2: Run** `pnpm vitest run packages/record/test/chain-binding.test.ts` — Expected: the relocated, relabelled tests FAIL (reported intact); the others pass.

- [ ] **Step 3: Implement** — `const expected = recordId ?? chain[0]?.recordId`; check 2 compares against `expected`, check 3 against `genesisPrevHash(expected)`. Keep the check order and first-break-only reporting. When `recordId` was supplied, the identity detail says `expected '<X>' (the requested recordId), found '<Y>'`; when omitted, keep today's text exactly. Rewrite the doc comment's check 2: the requested id (or the genesis id when none is given) is what binds a chain to its record, and the SQL backings key the read by a `record_id` column the row's JSON need not match — drop "No store can persist a mixed chain". Document the argument and the offline-audit use. In `test/replay-verify.test.ts`, correct the same premise in the foreign-splice test's comment; leave its assertions untouched.

- [ ] **Step 4: Run** the new file and `test/replay-verify.test.ts` and `test/chain-verify.test.ts` — Expected: all PASS.

- [ ] **Step 5: Commit** — `git add` the three files; message `verifyChain binds a chain to the requested recordId when one is given`.

---

### Task 2: Every builder is addressed by the caller's id

**Files:**
- Modify: `packages/record/src/kernel/finalize.ts` (`appendChainCompromise` ~845, `refuseMaybeAppend` ~920, their calls)
- Modify: `packages/record/src/kernel/expiry.ts` (`resolveDueClock` ~124)
- Modify: `packages/record/src/kernel/findings-seams.ts` (`appendSeamTransition` ~218, its seq-conflict call ~251 and ok result ~259)
- Modify: `packages/record/src/kernel/redeem.ts` (`refuseCorrespondenceMismatch` ~130, its residual call ~164)
- Modify: `packages/record/src/kernel/decline.ts`, `seal.ts`, `open.ts` (call sites only)
- Test: `packages/record/test/chain-binding.test.ts` (section `builders`); update the existing `resolveDueClock` calls in `packages/record/test/clocks.test.ts` to the new signature (an argument added, assertions untouched)

**Interfaces:**
- Produces (the `recordId` parameter always follows `store`/`ctx`):
  - `appendChainCompromise(store: Store, recordId: string, chain: readonly Transition[], now: () => Date): Promise<Outcome<never>>`
  - `refuseMaybeAppend(store: Store, recordId: string, code, leg, chain, resolved, finalLeg, now): Promise<Outcome<never>>`
  - `resolveDueClock(store: Store, recordId: string, chain: readonly Transition[], resolved: ResolvedProfile, now: Date): Promise<ResolveResult>`
  - internal: `appendSeamTransition(ctx, seam, recordId, chain, resolved, kind, payload)`, `refuseCorrespondenceMismatch(store, recordId, chain, resolved, target, finalLeg, now, tx?)`
- Every call site passes the seam's own `recordId`; `open()`'s blocker expiry passes `first.blockingRecordId`. After this task `last.recordId` occurs nowhere in `src/`.

- [ ] **Step 1: Write the failing tests** (section `builders`). On a `MemoryStore`, open two records X and Y identically (`openRecord`, distinct subjects), then call each builder with **Y's chain** and the argument **X**:
  - `appendChainCompromise: the edge carries the recordId argument, not the chain's` — outcome `refused`/`chain-compromise` with a `transitionRef`; `store.readChain(X).at(-1)` is `{ recordId: X, seq: 2, kind: 'refused', payload: { code: 'chain-compromise' } }`; `store.readChain(Y)` deep-equals its value before the call.
  - `refuseMaybeAppend: the edge carries the recordId argument` — a leg whose `terminalRefusals` lists `'content-drift'`; same assertions with `payload: { code: 'content-drift' }`.
  - `resolveDueClock: the clock edge carries the recordId argument` — a profile with an open-window bound, `now` past it (build `resolved` as `clocks.test.ts:84-89` does); X's last transition is `expired` and addressed to X; Y unchanged.

- [ ] **Step 2: Run** the file — Expected: FAIL to typecheck/run against the old signatures (the argument order differs), then, once the calls compile, the edge lands on Y.

- [ ] **Step 3: Implement** the signatures above and update every caller. Build each transition with the parameter (`recordId,`), never from chain data.

- [ ] **Step 4: Run** `pnpm typecheck`, then `pnpm test` — Expected: the new tests PASS and every existing test passes unchanged.

- [ ] **Step 5: Commit** — message `Every library-built transition is addressed by the caller's recordId`.

---

### Task 3: Verifying loads bind to the requested id; the AL2 layer lists by it

**Files:**
- Modify: `packages/record/src/kernel/finalize.ts`, `decline.ts`, `findings-seams.ts`, `redeem.ts`, `seal.ts` (each load's chain-verify rung)
- Modify: `packages/record/src/kernel/prior-legs.ts` (~65-67), `supersedes.ts` (~73-75)
- Modify: `packages/record/src/kernel/verify-signatures.ts` (`layerVerdicts`, `signatureLayerHolds`)
- Modify: `packages/record/src/create.ts` (the operator `verifyChain` wrapper, ~216)
- Modify: `packages/record/test/helpers/stores.ts` (add `RelocatingStore`)
- Test: `packages/record/test/chain-binding.test.ts` (sections `seams`, `cross-record`, `audit`); create `packages/record/test/chain-binding-sqlite.test.ts`

**Interfaces:**
- Consumes: `verifyChain(chain, recordId)` (Task 1); the Task 2 builder signatures.
- Produces:
  - `signatureLayerHolds(ctx: KernelContext, recordId: string, chain: readonly Transition[]): Promise<boolean>`; `layerVerdicts(ctx, recordId, chain)` lists the sidecar with `listByRecord(recordId)`. Every caller passes the id it loaded by (`ref.recordId` in prior-legs and supersedes).
  - `class RelocatingStore implements Store` in `test/helpers/stores.ts`: `constructor(readonly inner: Store)`; `relocate(targetRecordId: string, sourceRecordId: string): void` — afterwards `readChain(target)` returns `inner.readChain(source)`; `restore(): void` undoes it. Every other method, and every `tx` argument, delegates to `inner` unchanged. Its doc comment states the fidelity limit in design 5.7 (the inner store keeps X's real rows).

- [ ] **Step 1: Write the failing seam tests** (section `seams`), parameterized over backing — `new MemoryStore()` and `new SqliteStore(':memory:')`, each wrapped in a `RelocatingStore` — and over level — AL1 (`create(makeConfig(profiles, { store }))`) and AL2 (`enforceableSigningSetup(profiles, { store })`). Build X and Y **identically** so their chains have equal length, then `store.relocate(X, Y)`:

  | Seam | X and Y before the call |
  |---|---|
  | `finalize`, `decline` | open, `captureProfile()` |
  | `raiseFinding` | open, a findings-declaring profile as `findings-seams.test.ts` builds it |
  | `acknowledge` | as above, one finding raised on each |
  | `seal` | confirmed, `captureProfile()` |
  | `redeem`, `beginRedemption` | confirmed, `effectSeamProfile()` |
  | `completeRedemption` | redeeming, `effectSeamProfile()` |

  Test name: `<seam> over a relocated record refuses chain-compromise and lands its edge on that record (<backing>, <level>)`. Assertions: outcome `refused`/`chain-compromise` **with** a `transitionRef`; `inner.readChain(X)` grew by one and its last transition has `recordId: X`, `kind: 'refused'`, `payload: { code: 'chain-compromise' }`; `inner.readChain(Y)` deep-equals its value before the call.

- [ ] **Step 2: Write the remaining failing tests:**
  - `relocation from a longer chain refuses chain-compromise and leaves Y untouched` — Y has one more transition than X (a raised finding); `finalize(X)` → `chain-compromise`; Y deep-equals before.
  - `an enlisted redeem over a relocated record refuses chain-compromise with no edge` — `SqliteStore`, `tx` = `store.database` inside `BEGIN IMMEDIATE` (as `clocks.test.ts:224` does); outcome has no `transitionRef`; X and Y unchanged; `COMMIT` afterwards.
  - Three confirmations that the original attack shapes leave Y untouched: Y's leg lists `content-drift` in `terminalRefusals` and `finalize(X)` is called with X's own content; Y is past its open deadline; `raiseFinding(X)` on a relocated X. Each: Y deep-equals before.
  - Section `cross-record`: `verifyPriorLegs refuses a relocated prior leg` — a two-leg profile; M confirmed at leg 1; relocate an unused id `'rec-ghost'` to M; opening leg 2 with `priorRecordRefs: [{ recordId: 'rec-ghost', chainHead: <M's head> }]` → `prior-leg-unverified`; the control with `recordId: M` opens. `verifySupersedes refuses a relocated predecessor` — the same shape with a declined predecessor P and `supersedes` → `supersedes-unverified`; the control opens.
  - Section `audit`: `operator verifyChain reports a relocated record as a break at seq 1` → `{ intact: false, firstBreakSeq: 1 }`.

- [ ] **Step 3: Write the failing end-to-end pin** in `test/chain-binding-sqlite.test.ts`: `a row-copying insider on SqliteStore can no longer redirect a signed edge (AL2)`. `SqliteStore(':memory:')` under `enforceableSigningSetup` with a findings-declaring profile; Y open with one finding raised (length 2); X open (length 1). Through `store.database`: `DELETE FROM transitions WHERE record_id = X`; `INSERT INTO transitions (record_id, seq, transition_json) SELECT X, seq, transition_json FROM transitions WHERE record_id = Y`; then rewrite the copy's seq-1 `transition_json` with one extra payload key. Assert: `finalize(X, …)` → `chain-compromise` with a `transitionRef`; `readChain(X)` has length 3 and its last transition is addressed to X; `readChain(Y)` deep-equals before; `verifySignatures(Y)` reports every transition verified; `replay(readChain(Y)).state === 'open'`; `finalize(Y, …)` refuses neither `record-not-open` nor `chain-compromise`.

- [ ] **Step 4: Run** both files — Expected: FAIL (edges land on Y or verification reports intact).

- [ ] **Step 5: Implement** — pass the loaded id to `verifyChain` and `signatureLayerHolds` at all seven sites and in the `create.ts` wrapper, and to the Task 2 builders in each compromise arm.

- [ ] **Step 6: Run** `pnpm typecheck`, then `pnpm test` — Expected: everything PASSES, existing tests unchanged.

- [ ] **Step 7: Commit** — message `Verifying loads bind to the requested recordId, and the AL2 layer lists by it`.

---

### Task 4: Non-verifying loads check identity and throw

**Files:**
- Create: `packages/record/src/chain/binding.ts`
- Modify: `packages/record/src/create.ts` (`getRecord`, `replay` wrapper)
- Modify: `packages/record/src/kernel/review.ts`, `verify-signatures.ts` (`verifySignatures`), `open.ts` (blocker read ~269), `redeem.ts` (`residualRefusal` ~106), `finalize.ts` (`seqConflict` ~715)
- Test: `packages/record/test/chain-binding.test.ts` (section `reads`)

**Interfaces:**
- Produces: `assertChainFor(chain: readonly Transition[], recordId: string, seam: string): void` in `src/chain/binding.ts` (not exported from the package root). Throws an `Error` when any transition's `recordId !== recordId`; a no-op for an empty chain. Message: `${seam}: the store returned a chain holding record '${found}' when asked for '${recordId}' — foreign persisted data is a storage fault, not a domain outcome (SPEC §8)`.

- [ ] **Step 1: Write the failing tests** (section `reads`), over a `RelocatingStore` on `MemoryStore`, X relocated to Y:
  - `getRecord throws on a relocated record, on both handles` — `operator.getRecord(X)` and `agent.getRecord(X)` reject with `/foreign persisted data/`.
  - `replay, review and verifySignatures throw on a relocated record` — each rejects with `/foreign persisted data/` (`verifySignatures` under `enforceableSigningSetup`). Above the `verifySignatures` test, a comment opens `FOURTEENTH SELF-AUTHORED INVERSION —` and argues it: the recorded stance "throws only on the caller-error/unknown-record class every other read takes" keeps its parallel, since every other read now throws on foreign data too (design ruling 5.4).
  - `a mixed chain makes every read throw` — a `TamperingStore` whose `tamperFn` sets row 2's `recordId` to Y; `getRecord(X)` rejects with `/foreign persisted data/`.
  - `empty chains keep their behavior` — `getRecord('rec-none')` resolves `null`; `replay`, `review`, `verifySignatures` on `'rec-none'` reject with their existing unknown-recordId messages, **not** `/foreign persisted data/`.
  - `open() throws on a relocated blocker and appends nothing` — use `createWithClock` and a profile with an open-window bound, as `exclusivity.test.ts` does for its due blocker: B open on subject S; Z open on another subject; advance the clock past the bound; `relocate(B, Z)`; staging and opening a new draft on S rejects with `/foreign persisted data/`; `inner.readChain(B)` and `inner.readChain(Z)` are unchanged.

- [ ] **Step 2: Run** the file — Expected: the `reads` tests FAIL (no throw; `open()` expires a record).

- [ ] **Step 3: Implement** `assertChainFor` and call it right after each load at: `getRecord` (after the empty check), the `replay` wrapper, `review`, `verifySignatures` (after its empty-chain throw), `open()`'s blocker read (before `replay`), and inside the existing `try` blocks of `residualRefusal` and `seqConflict` so a foreign chain takes those blocks' existing fallback paths. Update `operator-surface.ts`/`agent-surface.ts` doc comments for the throwing reads in the same change.

- [ ] **Step 4: Run** `pnpm typecheck`, then `pnpm test` — Expected: everything PASSES.

- [ ] **Step 5: Commit** — message `Non-verifying reads throw on foreign persisted data`.

---

### Task 5: The signing decorator never caches a foreign genesis

**Files:**
- Modify: `packages/record/src/signing/decorate.ts` (`recordSigns`, ~105-130, and its comment)
- Test: `packages/record/test/chain-binding.test.ts` (section `decorator`)

**Interfaces:**
- Consumes: `RelocatingStore` (Task 3); `withSigning(signing, store, isSigningProfile)` from `src/signing/decorate.ts`.

- [ ] **Step 1: Write the failing tests.** Records come from `enforceableSigningSetup([S, N], { store: inner })`, where S declares `signing: true` and N does not. Each test then builds a **fresh** `withSigning` over a `RelocatingStore(inner)` with its own `MemorySignatureStore` and `isSigningProfile = (id) => id === S.id`, and appends one `refused`/`chain-compromise` transition addressed to X directly through it (seq and `prevHash` from X's real chain; whether it lands does not matter, since the decorator signs before delegating):
  - `decorator: a foreign genesis on a cold read signs the transition` — X on S, Y on N, `relocate(X, Y)`; the fresh sidecar's `listByRecord(X)` holds an entry for the appended transition's digest.
  - `decorator: a foreign genesis is never cached` — X on N, Y on S, `relocate(X, Y)`; the first append to X is signed; `restore()`; a second append to X adds **no** sidecar entry.

- [ ] **Step 2: Run** — Expected: the first test FAILS (unsigned: Y's genesis decided), the second FAILS (cached `true`).

- [ ] **Step 3: Implement** — in the cold-read branch, when `genesis.recordId !== transition.recordId`, return `true` without calling `memoSet`. Never throw there. State ruling 5.6 in the comment.

- [ ] **Step 4: Run** `pnpm test` — Expected: PASS, including `test/signing.test.ts`'s memo pins unchanged.

- [ ] **Step 5: Commit** — message `The signing decorator signs, and never caches, a foreign genesis`.

---

### Task 6: The source census

**Files:**
- Create: `packages/record/test/chain-binding-census.test.ts` (in the style of `test/signature-enforcement-sites.test.ts`)

- [ ] **Step 1: Write the census** over every `.ts` file under `packages/record/src`:
  - `no source reads last.recordId` — zero occurrences of `last.recordId`.
  - `every transition the library builds takes its recordId from a parameter` — every object literal containing a `prevHash:` key in `src/kernel/**` writes its `recordId` as the shorthand `recordId,` (no `recordId: <expression>`). Where a
    literal legitimately takes a caller-supplied id held under another name, rename that
    variable to `recordId` rather than weakening the rule.
  - `every verifyChain call outside chain/replay.ts passes the requested id` — every `verifyChain(` call has two arguments.
  - `every readChain call site is listed with its binding` — the `.readChain(` call counts per file equal this list, and each identity-checked file calls `assertChainFor(` that many times:

    | File | Calls | Binding |
    |---|---|---|
    | `create.ts` | 4 | `getRecord`, `replay`: identity; `verifyChain`: verify; `readChain`: raw by contract |
    | `signing/decorate.ts` | 2 | `recordSigns`: ruling 5.6; the `readChain` pass-through: raw |
    | `probes/probes.ts` | 1 | the probe's tampering wrapper: pass-through |
    | `kernel/finalize.ts` | 2 | load: verify; `seqConflict`: identity |
    | `kernel/redeem.ts` | 2 | prologue: verify; `residualRefusal`: identity |
    | `kernel/decline.ts`, `findings-seams.ts`, `seal.ts`, `prior-legs.ts`, `supersedes.ts` | 1 each | verify |
    | `kernel/review.ts`, `open.ts`, `verify-signatures.ts` | 1 each | identity |

    If the tree's counts differ from this list, STOP and report rather than editing the list to match.

- [ ] **Step 2: Prove it can fail** — temporarily revert one call site (for example, drop the id from `seal.ts`'s `verifyChain`), run the census, observe FAIL, restore.

- [ ] **Step 3: Run** the census — Expected: PASS.

- [ ] **Step 4: Commit** — message `A source census pins every chain load and every built transition's address`.

---

### Task 7: Documentation, the record, and the gates

**Files:**
- Modify: `docs/guide/api-reference.md` (`verifyChain`'s signature ~line 440 and description; the throws on `getRecord`, `replay`, `review`, `verifySignatures`, `open()`); any other `docs/guide/` passage that states what these functions do with a foreign chain (search `docs/guide` for `verifyChain`, `getRecord`, `foreign`)
- Modify: `CHANGELOG.md` (`[Unreleased]` — a `Fixed` entry for the binding and addressing, a `Changed` entry for the new throws and the optional argument)
- Modify: `docs/process/implementation-status.md` — a new `## Post-build-order increment — Chain binding` section after the review-hardening section (~line 5257), modelled on it: what landed per commit, the gate figures as measured, and an **Inversions** paragraph recording the fourteenth self-authored inversion (ruling 5.4); the §14 row's `verifySignatures` stance (~line 480); the "Current state" block's counts
- Modify: `docs/superpowers/INDEX.md` only if Task 0's row needs its status updated

- [ ] **Step 1:** Write the guide and CHANGELOG edits. Any guide code sample added or changed is first run as a scratch vitest file and deleted afterwards.
- [ ] **Step 2:** Run every gate and record the measured figures: `pnpm typecheck`, `pnpm lint`, `pnpm lint:strict`, `pnpm test`, `pnpm build`, `pnpm smoke`, `pnpm contract-scan`, `pnpm api-sync`, `pnpm docs-index-sync` — Expected: all exit 0.
- [ ] **Step 3:** Write the implementation-status section with those figures.
- [ ] **Step 4:** Re-run `pnpm contract-scan` and `pnpm docs-index-sync` — Expected: exit 0.
- [ ] **Step 5: Commit** — message `The chain-binding increment's record: guide, changelog, status`.
