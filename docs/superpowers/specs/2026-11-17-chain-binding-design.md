# The chain-binding increment — design

**A post-build-order increment (no step). No sealed-set edit, no marker move, no new refusal
code. Public-surface changes: the exported `verifyChain` gains an optional `recordId`
argument; `getRecord` (both handles), `replay`, `review`, `verifySignatures` and `open()`
gain a throw on foreign persisted data. One self-authored inversion: `verifySignatures`'s
recorded throw class widens (ruling 5.4). Sanction: none needed, and none claimed — §3 says
why.**

**Status.** Approach and the read-path ruling approved in conversation by the owner on
2026-11-17; the remaining rulings are this document's, taken on the owner's "continue with
recommended", after a builder check whose findings are folded in (rulings 5.4, 5.6, 5.7).
Branch `chain-binding-2026-11-17`, cut from `main` at `b2ea16b`. Not merged and not pushed;
both are owner acts.

## 1. What this increment answers

An external analysis of the tree at `b2ea16b` reported, and reproduced through the public API
on `SqliteStore` at AL1 and AL2, that **no path binds a loaded chain to the recordId it was
loaded for**:

- `verifyChain` (`chain/replay.ts`) compares every transition's `recordId` with `chain[0]`'s
  and derives the genesis link from that same id. It never sees the requested id.
- The operator wrappers (`create.ts` — `getRecord`, `replay`, `verifyChain`), every mutating
  seam's load, `verifyPriorLegs`, `verifySupersedes`, `review`, `verifySignatures` and
  `open()`'s blocker read all run over whatever `store.readChain(id)` returns.
- The AL2 layer lists the sidecar by the chain's own genesis `recordId`
  (`verify-signatures.ts`).
- Five edge builders address their edge with `last.recordId` — data read from the chain —
  instead of the id the operator passed: `appendChainCompromise` and `refuseMaybeAppend`
  (`finalize.ts`), `resolveDueClock` (`expiry.ts`), the findings append
  (`findings-seams.ts`), and `refuseCorrespondenceMismatch` (`redeem.ts`). Three more uses
  re-read or report by `last.recordId`: the findings seq-conflict re-read and the findings
  seams' ok result (`findings-seams.ts`), and the redemption residual re-read (`redeem.ts`).

The SQL backings key the read by the `record_id` column and return the parsed JSON, whose own
`recordId` is independent of that column. A storage-writing insider who copies record Y's rows
under record X's key — no hashing, no signing — therefore gets:

- `verifyChain(X)` intact and `verifySignatures(X)` all-verified, reporting Y's history as
  X's; `getRecord(X)` and `review(X)` showing Y's decision (only `.id` and `.subjectRef` give
  it away);
- the operator's next ordinary call on X appending a library-built — and at AL2,
  library-signed — edge onto the honest record Y: a `chain-compromise` refusal, a
  `terminalRefusals` refusal, an `expired` clock edge, a finding, or a `content-drift` edge.
  A terminal edge costs Y its pending decision, and Y still verifies clean afterwards;
- a relocated prior leg accepted by `verifyPriorLegs`, so the maker of one record can confirm
  the checker leg of another (separation of duties fails open); and a relocated predecessor
  accepted by `verifySupersedes`.

This breaks SPEC §5's single sanctioned cross-record append (`open()`'s due-blocker expiry)
and §14's AL2 claim that a rebuilt chain fails verification "without trusting storage". AL2
exists for exactly this adversary, which is why this is the first fix taken: it is the
cheapest of AL2's open bypasses and needs no SPEC change.

The doc comment at `replay.ts`'s `verifyChain` rests on a premise the SQL backings do not
hold — "No store can persist a mixed chain (each backing keys the chain by the transition's
own recordId)". The same premise is repeated in a comment in `test/replay-verify.test.ts`.

## 2. Goals, non-goals, anti-goals

**Goals.**

1. Every chain the library loads is bound to the id it was loaded for. A verifying load that
   meets a foreign chain reports a break; a non-verifying load throws.
2. Every transition the library builds is addressed by the caller's id, never by chain data.
3. The AL2 layer lists the sidecar by the requested id.
4. Regression pins that fail if any of the above is undone, including a source census in the
   style of `test/signature-enforcement-sites.test.ts`, so a future seam cannot reintroduce an
   unbound load or a `last.recordId` address.

**Non-goals.**

- The other AL2 bypasses the same analysis reported — the signing obligation read from the
  live registry rather than the bound profile, and signatures persisted outside the append's
  transaction. Each is its own increment, and two of them are sanction questions.
- Whole-record absence, AL1 recompute and head-edit windows: SPEC §13A residuals, unchanged.
- The Store backings and the vendorable conformance suite. An honest store already returns
  only the requested record's transitions; the scenario here is a tampered store, which only
  the kernel can defend against. No backing, and no `Store` method, changes.
- The raw reads `readChain` and `chainHead` on both handles. They return what storage holds,
  by contract; each transition's own `recordId` shows whose it is.

**Anti-goals** — outcomes that would make this a failure even if relocation were caught:

- A tampered chain at a mutating seam becoming a **throw**. SPEC §5: a detected break refuses
  `chain-compromise` and appends a `refused` edge at the head (no edge when enlisted). That
  stays exactly so.
- Any change of behavior for an honest store: the frozen byte-stability digests do not move,
  and no existing test's assertion changes its truth value.
- Any edit to `docs/concept/`.

## 3. Constraints, and why no sanction is needed

- **SPEC already requires the binding.** §5 defines the operator audit functions as "each
  taking a `recordId` and running over the chain the store returns **for that record**"
  (SPEC.md:425-426), and §4 defines the genesis link as the digest of
  `vidimera:genesis:<recordId>` (SPEC.md:327) — the record's id, not whatever id the first row
  carries. Binding the check to the requested id is the code meeting the text; the code
  diverges today.
- **§10.1 and §2 gain no condition.** Prior-leg and `supersedes` verification already require
  the referenced chain to "verify intact". Once `verifyChain` binds to the referenced id,
  intactness includes identity, so §10.1's enumerated list of checks is unchanged. (Adding a
  separately enumerated condition to that list is the kind of change
  `docs/process/next-phases.md` treats as a sanction question; this design does not.)
- **§8's loud-throw posture covers the reads.** SPEC.md:555 — "The same loud-throw posture
  covers corrupted or foreign persisted config read back at a seam". A read that meets
  another record's chain throws; it records nothing.
- **§5's en-passant rule stays.** `open()` expires a due blocker "without a pre-verify of the
  blocker's chain". This design adds an identity check (a string comparison, no hashing) to
  that read, not a verify; see ruling 5.4.
- **Public-surface discipline.** A change to the public surface moves
  `docs/guide/api-reference.md` and any affected walkthrough in the same change, and `api-sync`
  must pass. Any guide sample touched is executed as a scratch vitest file before it is written
  down.
- **Standalone contract.** New markdown references nothing outside the repository.

## 4. Approaches

Three were considered. The owner picked the first on 2026-11-17.

1. **Pass the id through (picked).** `verifyChain(chain, recordId)` binds identity; every
   kernel caller passes the id it loaded by; the builders take a `recordId` parameter; the
   non-verifying reads call one shared identity check that throws; a source census pins all of
   it. Small, reviewable diff in a codebase where most functions carry pinned behavior; every
   seam keeps its existing outcomes.
2. **A bound-chain type.** One `loadChain(store, recordId)` returning
   `{ recordId, transitions }`, threaded through every kernel function so the compiler
   guarantees no unbound chain is used. The same behavior as approach 1, bought with a refactor
   of most kernel signatures and the tests that call them. Not picked: the churn buys nothing
   the census does not.
3. **Check inside a Store decorator** (in the shape of `withSigning`). Dropped: it would make
   tampering **throw** at the mutating seams — the first anti-goal — and it does not fix the
   builders' addressing.

## 5. Rulings

**5.1 `verifyChain(chain, recordId?)`.** When `recordId` is given:

- check 2 (record identity) compares each `chain[i].recordId` with `recordId`, not with
  `chain[0].recordId`;
- check 3 (genesis) compares `chain[0].prevHash` with `genesisPrevHash(recordId)`.

The check order (seq, identity, genesis, links) and the first-break-only report are
unchanged. A wholly relocated chain therefore breaks at `firstBreakSeq: 1`, and the detail
names both the requested id and the id found. When `recordId` is omitted, the function behaves
exactly as today. The argument is exported (`index.ts` already exports `verifyChain`), because
an offline audit of an archived chain for a named record faces the same question. The doc
comment's false "no store can persist a mixed chain" premise is replaced with the truth: the
SQL backings key by a column the row's JSON need not match, so the identity check is what
binds a chain to its record.

**5.2 Every verifying load passes the id it loaded by.** With unchanged outcomes:

| Site | Id passed | Outcome on a foreign chain |
|---|---|---|
| `finalize`, `decline`, the findings prologue (`raiseFinding`, `acknowledge`), the redemption prologue (`redeem`, `beginRedemption`, `completeRedemption`), `seal` | the operator's `recordId` | `chain-compromise`; un-enlisted, a `refused` edge addressed to that `recordId` (ruling 5.3); enlisted redemption, no edge |
| `verifyPriorLegs` | `ref.recordId` | `prior-leg-unverified`, no record created |
| `verifySupersedes` | `ref.recordId` | `supersedes-unverified`, no record created |
| the operator `verifyChain(recordId)` wrapper | `recordId` | `{ intact: false, firstBreakSeq: 1, detail }` |

A note on where the compromise edge lands on a relocated X: it is built at
`seq = chain.length + 1` with `prevHash` = the foreign head's digest, addressed to X, and
offered to the backing's CAS against X's **own** records row — exactly as for any tampered
chain today. If no candidate state admits it, `appendChainCompromise`'s existing fallback
returns `chain-compromise` without a `transitionRef`. Either way nothing lands on Y.

**5.3 Every builder is addressed by the caller's id.** `appendChainCompromise`,
`refuseMaybeAppend`, `resolveDueClock`, the findings append and `refuseCorrespondenceMismatch`
take a `recordId: string` parameter and build `recordId` from it. The findings seq-conflict
re-read, the findings ok result and the redemption residual re-read use the caller's id. After
this increment `last.recordId` appears nowhere in `src/`. For honest chains this changes no
byte: after a bound verify, `last.recordId === recordId`.

**5.4 Non-verifying loads check identity and throw.** One shared helper (name and home are the
builder's) throws an `Error` when any transition in a non-empty chain carries a `recordId`
other than the requested one. The message names the seam, the requested id and the id found,
and says this is foreign persisted data — a storage fault, not a domain outcome (SPEC §8).
Empty chains keep today's behavior at every site (`getRecord` → `null`; the others throw their
existing unknown-recordId error). It applies at:

- `getRecord` — the one closure both handles share, so the agent's `getRecord` throws too;
- the operator `replay(recordId)` wrapper;
- `review`;
- `verifySignatures` — an audit read whose per-transition verdicts would otherwise describe
  another record's transitions;
- `open()`'s blocker read, before the blocker is replayed. A foreign blocker chain makes
  `open()` throw, and no edge is appended anywhere. This is an identity check, not the
  pre-verify SPEC §5 says the en-passant path skips; `resolveDueClock` is also addressed by
  `first.blockingRecordId` (ruling 5.3), as a second line;
- the redemption residual re-read (`residualRefusal`), inside its existing `try` — a foreign
  chain falls through to `unredeemable-state`, so it can never make the seam say
  `already-redeemed`;
- the seq-conflict diagnostic re-read (`seqConflict` in `finalize.ts`), inside its existing
  `try` — a foreign chain is carried as the re-read failure, so the conflict is reported as a
  fault, never as contention.

`verifySignatures` is an inversion of this build's own recorded stance:
`docs/process/implementation-status.md` (its §14 row) and the function's doc comment record
that it "throws only on the caller-error/unknown-record class every other read takes". The
owner's read-path ruling makes every other read throw on foreign data too, so the stance's
own parallel ("every other read") is kept and its class widens. It is recorded as the next
entry in that document's numbered self-authored-inversion sequence and argued at its pinning
test, per the repository's discipline. The paperwork task checks the other four reads'
recorded stances the same way and records any further inversion it finds.

**5.5 The AL2 layer lists by the requested id.** `layerVerdicts` and `signatureLayerHolds`
take the requested `recordId` and call `listByRecord` with it. Every caller has already bound
the chain (5.2) or checked it (5.4), so for an intact chain this is equivalent; it removes the
last address derived from chain data.

**5.6 The signing decorator's cold genesis read.** `recordSigns` (`signing/decorate.ts`)
decides whether to sign a transition from the genesis of `readChain(transition.recordId)`, and
caches that decision per `transition.recordId` in a bounded LRU (`SIGNING_MEMO_CAP`, 10,000).
Once ruling 5.3 addresses a compromise edge to X, a cold read of X's relocated chain would
cache **Y's** signing decision under X for the life of the process. If X's profile signs and
Y's does not, X's later appends in that process — after a restore from backup, say — land
unsigned, and X then refuses `chain-compromise` permanently. So: when the read genesis's
`recordId` differs from `transition.recordId`, the decorator **signs** the transition and
**does not cache** a decision. Signing is the fail-safe direction: an extra signature on a
non-signing record is harmless, while a missing one on a signing record is permanent. It
never throws there — a throw would turn the seam's `chain-compromise` refusal into a crash,
the first anti-goal.

**5.6a Deliberately untouched.**

- The raw `readChain` and `chainHead` on both handles (§2, non-goals).
- The probes' tampering wrapper and the probes themselves.
- `Store`, the three backings, the `SignatureStore` contract and the conformance suite.

**5.7 Regression pins.**

- A test-helper store that returns another record's chain for a target id and passes every
  write through to the inner store. It lives beside `TamperingStore` in
  `test/helpers/stores.ts`. It is **not** a faithful model of a SQL row copy: the inner store
  keeps X's real chain, so its seq check counts X's real rows, and an edge built at
  `seq = length(Y) + 1` lands on X only when X's real chain has Y's length. Pins that use it
  therefore give X and Y equal chain lengths and assert that the edge **did** land, on X,
  addressed to X — otherwise they would only reach `appendChainCompromise`'s no-edge
  fallback and prove nothing about addressing. The faithful row copy is the end-to-end pin
  below.
- Each mutating seam — `finalize`, `decline`, `raiseFinding`, `acknowledge`, `seal`, `redeem`,
  `beginRedemption`, `completeRedemption` — over a relocated X refuses `chain-compromise`; Y's
  chain is unchanged (length and head digest); the edge lands on X, addressed to X. At AL1 and
  AL2, on `MemoryStore` and `SqliteStore`. The enlisted `redeem` lands no edge anywhere.
- Three end-to-end confirmations that the original attack shapes now leave an honest Y
  untouched: X relocated from a Y whose leg lists `content-drift` in `terminalRefusals`
  (`finalize(X)` with X's own content); from a Y past its open deadline; and from a Y on which
  `raiseFinding(X)` would have written. After ruling 5.2 these all stop at X's chain-verify
  rung, so they confirm the outcome, not the addressing.
- Addressing is pinned directly. The exported builders — `appendChainCompromise`,
  `refuseMaybeAppend`, `resolveDueClock` — are called with a chain whose rows carry one
  `recordId` and a `recordId` argument naming another; the appended edge carries the argument.
  The non-exported builders (the findings append, `refuseCorrespondenceMismatch`) are covered
  by the census below.
- The decorator (ruling 5.6): with a cold memo, an append addressed to X over a chain whose
  genesis is Y's is signed, and the next append to X re-reads rather than using a cached
  decision.
- `verifyPriorLegs`: a relocated prior refuses `prior-leg-unverified`, including the
  separation-of-duties variant (a maker's confirmed record copied under the referenced prior).
  `verifySupersedes`: a relocated predecessor refuses `supersedes-unverified`.
- The pure `verifyChain(chain, recordId)`: a relocated chain breaks at seq 1, naming both ids;
  a recomputed relabel (every `recordId` rewritten to X with relinked digests but the genesis
  link left as Y's) breaks at seq 1 on the genesis check; omitting `recordId` reproduces every
  existing case exactly. The operator wrapper reports the break.
- The reads: `getRecord` on both handles, `replay`, `review` and `verifySignatures` throw on a
  relocated X and keep their empty-chain behavior. `open()` with a relocated due blocker
  throws, and no record's chain grows.
- One end-to-end pin on a real `SqliteStore` at AL2 that does what the insider does. Y is an
  honest open record with one finding raised; X is another existing record. With SQL, delete
  X's transition rows, then insert Y's transition rows under X's `record_id` (X's records row is
  untouched; the transitions table's key is `(record_id, seq)`, so X's rows must go first), and
  change one non-head payload in the copy. Then `finalize(X)` refuses `chain-compromise` with a
  `transitionRef`; the edge sits on X at `seq = length(Y) + 1`, addressed to X; Y's chain, state
  and signatures are unchanged; and `finalize(Y)` still decides.
- A source census: `last.recordId` occurs nowhere in `src/`; every transition object the
  kernel or `seal` builds takes its `recordId` from a parameter or a caller-supplied id, never
  from a loaded transition or a replayed record (`last.recordId`, `genesis.recordId`,
  `record.id` and the like); every `verifyChain(` call in `src/` outside `chain/replay.ts`
  passes two arguments; every `.readChain(` call site in `src/` is on an explicit list with its
  binding — verify-bound, identity-checked, raw by contract, or the decorator's ruling-5.6
  check — with the pass-through wrappers named and justified. Mechanics are the builder's.
- `test/byte-stability.test.ts` is not touched, and stays green.

**5.8 Documentation.**

- `chain/replay.ts`: `verifyChain`'s doc comment (the argument, and the corrected premise).
  The premise in `test/replay-verify.test.ts`'s foreign-splice comment is corrected too; its
  assertion is unchanged.
- `docs/guide/api-reference.md`: the optional argument on `verifyChain`, and the new throw on
  `getRecord`, `replay`, `review`, `verifySignatures` and `open()` (a foreign blocker chain).
  Any other guide passage that states what these functions do with a foreign chain moves with
  it. The doc comments on the operator and agent interfaces for the same functions move too.
- `signing/decorate.ts`: `recordSigns`'s comment states ruling 5.6.
- `CHANGELOG.md` (`[Unreleased]`), `docs/process/implementation-status.md` (an increment
  section with the gate figures, the "Current state" counts, the §14 row's `verifySignatures`
  stance, and the inversion entry of ruling 5.4), and `docs/superpowers/INDEX.md` (this
  design's and its plan's rows, and the file counts).
- The external analysis behind §1 is not checked in by this increment; §1 states the defect
  in full on its own. Whether to land that analysis in `docs/analysis/` is the owner's
  separate call.

## 6. Left to the builder

The helper's name and home; the exact error text within 5.4's content; parameter position in
the builders; test file names and layout; the census mechanics; how the end-to-end pin reaches
the SQLite file; commit boundaries (a design commit first, a paperwork commit last).

## 7. Exit

Every repository gate green: `pnpm typecheck`, `pnpm lint`, `pnpm lint:strict`, `pnpm test`,
`pnpm build`, `pnpm smoke`, `pnpm contract-scan`, `pnpm api-sync`, `pnpm docs-index-sync`. The
test count rises; no existing assertion changes its truth value; the byte-stability digests do
not move.
