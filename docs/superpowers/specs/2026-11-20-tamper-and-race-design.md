# Tampering, faults and lost races — design

**Date: 2026-11-20.** A post-build-order increment with no build-order step. It makes no
sealed-set edit, moves no maturity marker and adds no export. It changes three things:

- what verification and the compromise edge do on a damaged chain;
- what a seam does when its append fails for a reason that is not an honest race;
- what a loser in an honest race is told.

## 1. What this closes

### Tampering that crashes verification instead of being reported

- **`verifyChain` throws on rows it cannot digest.** A row that is `null`, or one holding a
  number with no JCS form (`Infinity`), makes `verifyChain` throw, because it digests every row,
  the head included. This breaks two promises: it is supposed to report the first break, and
  seams are supposed to refuse `chain-compromise`.
- **`appendChainCompromise` throws on a damaged head.** It throws when the head's `prevHash` is
  malformed: verification detected the break, yet the seam throws, records nothing, and the
  record keeps holding its (profile, subject) pair.

### A detected break whose edge can never land

- **The compromise edge proposes `chain.length + 1`.** After a middle row or the genesis is
  deleted (SPEC §5 names deletion first), every backing adjudicates `max(seq) + 1`. The edge
  therefore never lands, the record stays open and non-terminal, and it holds C1 permanently:
  `open()` on its subject answers `record-exists` forever, or throws once the genesis is gone.

### Faults reported as domain refusals

- **The redemption residual reports faults as `unredeemable-state`.** That covers a `'seq'`
  conflict, a failed re-read and a foreign chain on the re-read. Each one misstates a record that
  may be confirmed and redeemable. A token executor can read it as "abandon the approved effect".
- **`seal` and the `open()` retry map conflicts the same way.** `seal` maps a `'seq'` conflict
  to `unsealable-state`. `open()`'s retry maps any genesis conflict to `record-exists`, while its
  first attempt throws on a non-exclusivity conflict.
- **`open()`'s retry can throw a raw store or signer error after the call has already appended
  the blocker's expiry edge.** The guide says exceptions mean "storage faults where nothing was
  recorded".
- **`operator.listDue` throws synchronously** when a host store's `listDue` throws synchronously.
  Every other Promise-typed read rejects.

### Lost races that answer a fixed code

- **`finalize`, `decline` and the findings seams.** When they lose the open-window expiry CAS
  they refuse `leg-expired` even if a racer confirmed or refused the record. When they lose the
  confirmed-window CAS they refuse `record-not-open` even if a racer expired it. Re-invoking
  answers differently.
- **`open()` refuses `record-exists` when the blocker it read is already terminal,** that is,
  when the pair is free.

### Smaller items

- **The rung-(4.5) "unreachable" throw in `finalize` is reachable.** A non-recomputing edit of a
  sole genesis, inside the AL1 head-bound window SPEC §5 and §10.3 disclose, reaches it. Its
  message and comment say it cannot happen.
- **The redemption seams' result-admission throw runs after the clock rung.** On a due record,
  a stray `result` on a non-declaring profile resolves the clock and refuses, where SPEC §8 and
  §11.2 make it a caller error that records nothing.
- **The findings seams on a due-confirmed record** append `expired` and refuse `leg-expired`, per
  SPEC §4's lazy resolution and §8's `leg-expired` row. SPEC §10.2's sentence reads otherwise,
  and no test pins the behaviour.

## 2. The design

### Tampering never crashes verification

**`verifyChain` checks each row before digesting it.** At each index, after the
seq, recordId and prevHash checks already in place:

- A row that is not a non-null object is a break at its position.
- A row whose digest throws is a break at its own seq, detailed as "has no canonical encoding".
  No honest writer can persist such a row, because every backing digests on append.

From then on "intact" means that every row, the head included, digests. Every downstream reader
of a verified chain relies on that: the signature layer, the prior-leg and supersedes checks,
and the compromise edge.

**`appendChainCompromise` guards the head.** If the head is not an object, or its digest throws,
the seam refuses `chain-compromise` with no edge, before any CAS attempt. So there is no mint
and no sidecar entry.

- This adds one shape to the no-edge outcomes: a head with no digest has nothing to chain an
  edge onto.
- That reading is recorded in the status record and next-phases. Naming it as a SPEC §5 corner
  would be a sealed edit.

**The signing decorator's cold-cache genesis read** treats a non-object genesis or payload the
way it treats a foreign genesis: it signs, and never throws or caches.

### A detected break lands its edge at the store's next seq

`appendChainCompromise` proposes the edge first at `head.seq + 1`, when the head's `seq` is a
safe positive integer, and then at `chain.length + 1`. It tries each seq variant only while the
store answers `'seq'`, and moves to the next state target on `'state-mismatch'`.

- Every read is seq-ordered, so `head.seq + 1` is the kernel's best estimate of the store's
  `max + 1`. The fallback covers a head whose own `seq` field was rewritten.
- On a contiguous chain the two candidates are equal, so behaviour is byte-identical.
- Each variant is built once, before the walk, so the signing decorator mints once per variant.
  A failed CAS appends nothing.

**What it means for a record whose row was deleted.** The record gets its terminal `refused`
edge, C1 releases, and `open()` on the subject works.

- `verifyChain` still reports the original break, as SPEC §5 requires.
- Every later seam re-detects the break and refuses `chain-compromise` with no further edge.

**The rung-(4.5) arm** keeps its throw: a garbled chain is a storage fault. Its comment and
message now say it is reachable only through a storage edit of a sole-genesis head inside the
AL1 head-bound window (SPEC §5, §10.3), and that AL2 closes it as `chain-compromise`.

### Faults throw; honest races re-read

**`'seq'` has no honest producer at the redemption seams or `seal`.** Their CAS targets are
`confirmed`, `redeeming` or a terminal state, and every legitimate competing append leaves that
state. Every backing checks state before seq, so a competitor reaches the loser as
`state-mismatch`.

**The redemption residual takes the append result:**

- `'seq'` throws a storage fault. The wording is the existing `seqConflict`'s, saying that
  nothing was appended and the record is unchanged.
- `state-mismatch` re-reads, as it does today:
  - `redeemed` → `already-redeemed`;
  - otherwise → `unredeemable-state`.
- A re-read that fails, a foreign chain or a replay error throws with the failure as `cause`.

**`seal`:**

- `'seq'` throws the same fault.
- `state-mismatch` keeps `unsealable-state`, as SPEC §8 and §12's C4 prescribe.

**`open()`'s retry:**

- An exclusivity conflict → `record-exists`.
- Any other conflict throws, as the first attempt does.

**A shared lost-resolution helper** sits beside `resolveDueClock` in `kernel/expiry.ts`. It serves
`finalize`, `decline` and the findings seams.

- **On the open window:**
  - `'seq'` → `leg-expired` (still open and due).
  - `state-mismatch` → re-read: `expired` → `leg-expired`, else `record-not-open`.
- **On the confirmed window:**
  - `'seq'` throws a fault.
  - `state-mismatch` → re-read, mapping the same way.
- **On the redeeming window** the answer is `record-not-open`.
- **A failed re-read** throws with `cause`.

**`open()` with a blocker already terminal when read.** A racer freed the pair, so `open()` takes
its existing single retry (factored into one local), stamped from a fresh `now()`. It answers
`record-exists` only when the retry's own C1 names a live blocker.

**`open()`'s retry after this call expired the blocker.** The retry is wrapped. On failure it
throws an error that names the blocker whose expiry edge stands, with the store or signer error
as `cause`. When this call appended nothing, the raw error propagates unchanged: that is a
genuine "nothing recorded" fault.

**`listDue` becomes `async`,** so a synchronous throw from the store (or the clock) rejects.

### Admission before the clock

The redemption seams check result admission inside the shared prologue. That is after the
effect-seam gate and before the clock rung, including before the enlisted due guard. A stray
`result` on a non-declaring profile therefore throws and records nothing, whether or not the
record is due. `beginRedemption` passes "no result"; it already refuses one at intake.

### Findings seams on a due-confirmed record

There is no code change. A comment names the reading (SPEC §4 and §8 over §10.2's "any other
non-open state"), a characterization pin records the behaviour, and the SPEC sentence goes on the
sanction-gated list.

## 3. Rulings

- **Self-authored stances inverted, each argued at its site and numbered** (the seventeenth is
  in `signing/decorate.ts`):
  - **Eighteenth:** the redemption residual's "result-first either way", together with the
    recorded "foreign chain on the re-read falls through to `unredeemable-state`".
  - **Nineteenth:** the decision seams' "deliberate divergence … still true of the record" for
    the confirmed-window lost CAS.

  No test assertion inverts. Only the recorded stances move.
- **Deferred, not decided here:**
  - **A lost own-expire CAS in `open()` → `record-exists`.** The fix would take the single
    retry, as above, but it inverts an inherited pinned assertion
    (`exclusivity.test.ts`, "an expire-CAS state-mismatch … record-exists, NEVER re-loop").
    CLAUDE.md requires an explicit authorization to invert an inherited pin, so it waits for the
    owner's word and is recorded in next-phases.
  - **A batch-append state-mismatch at rung (6) → `record-not-open`,** even after a racer
    expired the record. SPEC §9 prescribes it, so changing it is a sealed edit.
  - **SPEC §10.2's due-record sentence, and DECISIONS #10 / ARCHITECTURE §4's "storage faults
    where nothing was recorded".** Both are sealed wording. The non-sealed docs are narrowed, and
    the difference is recorded on the sanction-gated list.
  - **A store-reported adjudicated `max(seq)`.** That is a Store-contract change across three
    backings. `head.seq + 1` with a `length + 1` fallback suffices without it.
- **Not changed:**
  - Paths that never verify keep their storage-fault throws on a garbled chain: `open()`'s
    blocker read, `replay`, `getRecord`, `review`, `verifySignatures` and the store's
    `chainHead`. Only their docs say so.
  - `refuseMaybeAppend`'s best-effort lost CAS stays an already-recorded residual.
- **A buggy custom Store** that returns non-plain data now reads as tampering, and a seam appends
  a terminal compromise edge where it used to throw. That is inherent at AL1, where any
  store-corrupted row is tampering. It is stated in `jcs.ts` and the guide, as the contract a
  custom Store keeps.
- **Separate-mode signing:** a `'seq'`-failed compromise attempt on a gapped chain leaves one more
  sidecar orphan. Integrated mode leaves none. The no-edge comment states this.

## 4. Pins

Each pin is red against `c5e4fe6` where behaviour differs. Where a backing is named, the pin
runs there.

### Verification and the compromise edge

- **Pure `verifyChain`:** `Infinity` in a middle payload and in the head payload, `at: Infinity`,
  a `null` middle row, a `null` head and a sparse row each give a break at the right seq.
- **SqliteStore** (raw `UPDATE` / `DELETE`):
  - a sole-genesis `prevHash` set to garbage → `finalize` and `decline` refuse `chain-compromise`
    with no ref, chain unchanged;
  - a confirmed record's head `prevHash` set to `md5:00` → `seal` refuses with no ref;
  - a middle payload set to `1e999` or `null` → the edge lands;
  - a middle row deleted → the edge lands at `max + 1`, the state is `refused`, and
    `verifyChain` still breaks at the deleted seq;
  - an open findings-flow record with its middle row deleted → `finalize` lands the edge, and
    `open()` on the subject then succeeds;
  - the genesis deleted → the edge lands, and `open()` succeeds;
  - a second call on each → `chain-compromise` with no ref, chain unchanged.
- **PostgresStore:** the sole-genesis `prevHash` case, the middle payload, and the middle and
  genesis deletions, in the store-postgres suite.
- **MemoryStore:** the same shapes through a read-copy tampering wrapper. The edge lands on the
  inner store.
- **AL2 cold-cache genesis:** a `null` genesis read refuses rather than throwing.
- **Rung (4.5):** its new message, on MemoryStore and SqliteStore. The AL2 variant refuses
  `chain-compromise`.

### Faults and races

- **Redemption seams, prologue clock, reverify edge and `seal`:**
  - a synthetic `'seq'` conflict rejects with the storage-fault message, chain unchanged,
    re-invocation succeeds;
  - a lost CAS whose re-read rejects, or returns a foreign chain, rejects with `cause`;
  - enlisted on SqliteStore, the host transaction stays usable.
- **`seal`:** a racing seal still refuses `unsealable-state`.
- **`open()` retry:** a non-exclusivity conflict throws.
- **`finalize`, `decline`, `raiseFinding`:**
  - open-window lost CAS with a racer that confirmed or refused → `record-not-open`;
  - confirmed-window lost CAS with a racer that expired the record → `leg-expired`;
  - a `'seq'` open-window variant → `leg-expired`;
  - a lost CAS whose re-read fails rejects with `cause`.
- **`open()`, blocker terminal at read** → ok, after two genesis attempts. A blocker moved to a
  non-terminal state → `record-exists`.
- **`open()` retry failing after this call expired the blocker** (MemoryStore and SqliteStore):
  rejects, naming the blocker, with `cause`. The blocker is `[opened, expired]` and a host retry
  succeeds.
- **`listDue`:** a store whose `listDue` throws synchronously → a rejection.

### Admission and findings

- A due-confirmed and a due-redeeming record on a non-declaring effect-seam profile:
  `redeem` / `completeRedemption` with a `result` reject and append nothing, including enlisted
  on SqliteStore.
- The existing admission pin that cannot fail as written moves to a non-declaring profile.
- **Findings on a due-confirmed record** (characterization):
  - before the bound → `record-not-open`, no append;
  - after it → `leg-expired` with `expired` appended, for both seams.

### Guard rails

- No existing assertion changes.
- The byte-stability and byte-regression suites pass untouched.
- The chain-binding census tally gains the helper's one read.

## 5. Docs and records

- **`docs/guide/api-reference.md` and `concepts.md`:**
  - `verifyChain` never throws except on an empty chain, and a garbled row is the break;
  - `chain-compromise` records itself wherever the state still admits an append and the head has
    a digest;
  - the exception contract is narrowed to "the failing write recorded nothing", noting that
    `open()` can stand a clock edge before a failing retry;
  - the redemption fault arms throw;
  - lost races answer what re-invocation would.
- **Code comments:** `jcs.ts`, `chain/binding.ts`, `outcome.ts`, `operator-surface.ts`.
- **`CHANGELOG.md`.**
- **The status record's section** (the forty-first post-build-order increment), with the two
  stance inversions argued and the deferred items.
- **`next-phases.md`:**
  - the owner-gated inherited-pin item (`open()`'s lost own-expire CAS);
  - the sealed wording items (§10.2's sentence, DECISIONS #10 / ARCHITECTURE §4, the
    digestless-head corner of §5);
  - the store `max(seq)` signal.
- **`CLAUDE.md`'s counts.**
- **No external review IDs anywhere.**

## 6. Amended after the whole-branch review

The text above stands as designed. The whole-branch review found the points below, and the
controller ruled on each; the status record's section for this increment carries the full
account.

- **§3's "Not changed" bullet misreads the paths that never verify.** It says they "keep their
  storage-fault throws on a garbled chain". `replay`, `getRecord`, `review` and `open()`'s blocker
  read never digest a row: they throw only on a row they cannot read (`null`, a primitive, another
  record's row, a chain with no genesis first), and over a row with no canonical encoding they
  return a state with no throw while `verifyChain` reports the break. So a successful replay is
  not evidence that the chain digests. Only `verifySignatures` and a store's `chainHead` throw on a
  row they cannot digest.
- **The redemption residual's unmoved-state throw is un-enlisted only.** The throw assumes the
  re-read sees at least the state the compare-and-swap was judged against. That is true of the
  reference stores for un-enlisted calls, but an enlisted call's reads skip the host transaction on
  `PostgresStore` (deferral-register row 23). So a second enlisted redemption call on one record
  inside one host transaction lost `state-mismatch` and re-read the committed, unmoved state on a
  conforming store. An enlisted call keeps the pre-increment domain answer (`unredeemable-state`).
- **The findings seams' own append re-reads when it loses its state check.** §2's lost-race
  mapping covered only their clock-resolution append. Their own `open`-target append now maps the
  same way: `expired` gives `leg-expired`, any other moved state `record-not-open`, and the record
  still `open` or a failed re-read throws. Rung (6) of `finalize` and `decline` keeps SPEC §9's
  `record-not-open`, as §3 defers.
- **`open()`'s own expiry of a due blocker throws on a conflict with no honest producer.** A
  `'seq'` on a confirmed blocker's edge and an exclusivity conflict throw a storage fault, with
  nothing appended. The `'seq'` message names the blocker and both possible causes: a store
  misreporting, or a blocker chain damaged in storage, since `open()` does not verify its blocker
  and a deleted row makes the proposed seq miss the store's next one. §3's deferred own-expire
  item is otherwise unchanged. A `state-mismatch`, and a `'seq'` on an open blocker, still answer
  `record-exists`.
- **The released-subject limit.** A deleted non-head row lands its edge, where the state admits
  an append, once a verifying seam runs on the holder. `open()` does not verify its blocker, so it
  never lands the edge itself.
- **The TWENTIETH self-authored stance inversion.** §3 numbers two inversions. `open()`'s arm for a
  blocker already terminal when read reverses a third stance this build recorded: "Defensive: a
  terminal blocker cannot hold C1; a coherent store never names one." That inversion is now argued
  and numbered at the site.
- **§5's `max(seq)` signal is register row 23's `headSeq` signal.** `next-phases.md` records it
  under that row's section, not as an item of its own.
