# Implementation status

**What this document is.** The running record of what has actually landed **in this
repository**, build-order step by build-order step (`docs/concept/SCOPING-GUIDE.md` §7's
sequence). Per step it carries four things: what landed here, the commit range, the gate
outputs measured at the step's exit, and what is explicitly still outstanding. It is a
record of code, not of intent — every claim below is settled against
`packages/record/src`, and where a section of the spec is partly built the entry says
which part.

**Why it exists.** The process discipline this repository inherited puts
**spec-moves-to-truth** "as an explicit exit step of every increment" — "draft-ahead
markers come off only when the behavior lands" (`docs/concept/SCOPING-GUIDE.md` §7). Here,
that exit step has **nothing to move**. Nothing this kernel lands carries a draft-ahead
marker to retire — every behavior it implements is already marked `[PROVEN]` on the
strength of a reference implementation of the same spec, or sits in unmarked text. The
same holds for build-order steps 2 through 6: the sections they would build (§12, §11.2,
§10.1, §11.1, §10.4, §10.3) are `[PROVEN]` already. The first draft-ahead marker that
could come off is §10.2's `[DESIGNED]`, at step 7. So the inherited exit step is vacuous
at step 1's exit and stays vacuous for the five steps after it — deferral register row 8
recorded that vacuity for steps 2–6 and asked for this artifact because of it. A
discipline whose exit step cannot move needs a substitute that can, and this record is it.
It cannot live in `docs/concept/` — that set is sealed, and it is deliberately about the
spec rather than about any one implementation of it.

**What this document does not do.** It does not move a maturity marker, and nothing in it
should be read as moving one. `[PROVEN]` / `[DESIGNED]` / `[SKETCHED]` live in the sealed
concept set, and `[PROVEN]` says what its legend says it says: "implemented and
test-proven in a reference implementation of the spec"
(`docs/concept/README.md`). That is a claim about a reference implementation, stated as
such in both front doors; it was never a claim about this repository, so nothing landing
here makes it truer and nothing outstanding here makes it false. The per-section table
below is what answers "what does *this* build do", which is the question the markers were
never asked.

---

## Steps at a glance

| Step | Capability | Status here |
|---|---|---|
| 1 | The kernel | **Exited** — five gates green at `74f7e7b`, with the named outstanding list below |
| 2 | The store, for real | **Started, not exited** — an earlier increment landed `appendBatch`, `listDue`, and the `meta = { nonTerminal, dueAt? }` migration on both append methods; this increment added §12's C4 seal-finality bar (barring every append after a `sealed` transition, on both append seams) and the operator-only `seal()` seam itself, all still inside the existing in-memory backing; `findNonTerminal`, the caller-transaction seam, a real SQL adapter, the backing-parameterized conformance suite and the cross-backing byte-identical-chains test are still not built — see the §12 row and the seven-of-eight boundary below |
| 3 | Redemption (the effect seam) | Not started |
| 4 | Multi-leg separation of duties | Not started |
| 5 | Required-consultation gating | Not started |
| 6 | Authority checks (eligibility + policy drift) | Not started |
| 7 | Findings & acknowledgments | Not started |
| 8 | Recovery, live capture, AL2 signing, the self-test tier | Not started |

Exiting step 1 is exiting **one of eight**. A host adopting this repository today gets no
store adapter, no redemption, no multi-leg separation of duties, no consultation input, no
policy or eligibility gating and no findings flow — ten governed profile fields throw at
construction, by design, and the sections below say so in the same breath as the green
gates.

---

## Build-order step 1 — the kernel

### What landed here

The capability split, canonicalization and digests, hash-chained transitions, the
pre-seam chain-verify, and an in-memory store carrying the exclusivity, sequencing and
monotonicity constraints — `docs/concept/SCOPING-GUIDE.md` §7's step 1, less the parts
named under "still outstanding" below.

Concretely, and only what is true of the code: a host can construct a single-leg,
pure-capture or `redeem`-declaring profile; stage a draft from the agent handle; open,
review and finalize it from the operator handle; and replay or verify the resulting chain.
Content never crosses into the store — only digests do. Every decision-bearing state
change is a hash-linked transition, and `replay()` over the chain is the sole
authoritative derivation of a record's state; the store's own `state` column exists to back
its compare-and-swap, never to answer what a record is.

The kernel was **adopted** from a reference implementation of the same spec rather than
written from scratch, and the differences between the two are recorded file by file in
`docs/process/adopted-source-provenance.md`. The whole-branch review that motivated this
step's remediation pass is `docs/analysis/2026-08-03-step-1-review.md`.

### Commit range

`e97ce96..74f7e7b` — 60 commits, of which **42 touch `packages/record`**, from `6d3045d`
(the library-owned RFC 8785 serializer) through `74f7e7b`. The remaining eighteen touch
the concept set, CI, repository tooling, and this repository's own process, analysis and
plan documents. Before this branch, `packages/record` was a walking skeleton: a `create()`
that threw a not-implemented error, and two tests asserting that it did.

### Gate outputs at exit (measured at `74f7e7b`)

Commands and their summary lines. The thirteen Biome diagnostic bodies are elided (read
below for what they are), as are run durations. `74f7e7b` is the last **build-step-1**
commit that touched code — this record itself lands after it and changes no TypeScript, so
the four code-facing gates measure the same tree either way at step 1's own exit; only
`contract-scan`, which reads tracked markdown too, re-runs against this file. Later build
steps have touched `packages/record/src` since — see the per-section table below, which
tracks the current tree rather than this frozen exit snapshot.

```text
$ pnpm typecheck
$ tsc -p packages/record --noEmit
EXIT=0

$ pnpm lint
$ biome check .
Checked 57 files. No fixes applied.
Found 13 infos.
EXIT=0

$ npx biome check --error-on-warnings .
Checked 57 files. No fixes applied.
Found 13 infos.
EXIT=0

$ pnpm test
$ vitest run
 Test Files  23 passed (23)
      Tests  257 passed (257)
EXIT=0

$ node scripts/contract-scan.mjs
(no output)
EXIT=0
```

Read with their bounds, in the same breath:

- The **13 infos** are not one thing. Twelve are `lint/style/useTemplate` in three test
  files (`outcome-model.test.ts`, `store-constraints.test.ts`,
  `transition-encoding.test.ts`) — string concatenation where a template literal would do,
  each carrying an *unsafe* fix that this repository does not apply automatically. The
  thirteenth is a Biome configuration deprecation on `biome.json`'s
  `linter.rules.recommended`, carried in the deferral register. None is a warning or an
  error, which is why `--error-on-warnings` is also green.
- **23 test files / 257 tests, zero skips.** Twenty-two of those files and 228 of those
  tests are the record package's own suite; the twenty-third file is
  `scripts/test/contract-scan.test.mjs`, which tests the contract scan's citation
  resolver, not the library.
- **`contract-scan` exit 0, no output** means no finding under the checks that scan
  actually runs. Its citation resolver reads tracked **TypeScript** only, and its own
  header enumerates eight things it deliberately does not check. Markdown — including this
  document — is scanned for external links and ADR-style references, never for whether a
  citation resolves. A reader comparing a later run against this one should **diff the
  output, not the totals**: a total moving has hidden an equal-sized regression in the
  opposite direction on this branch before.
- The four byte-compatibility digest literals in
  `packages/record/test/byte-stability.test.ts` are byte-for-byte what they were when they
  were pinned at `4e3405f`; no later commit on this branch changed one. They are an
  oracle, not an assertion to be updated — a mismatch means the minimal chain moved.

### Per-SPEC-section status

This table tracks the **current tree**, not a snapshot frozen at step 1's exit two sections
above: its §12 and §2.1 rows already describe `appendBatch`, `listDue`, and the `meta`
migration, all landed by a later increment inside build-order step 2, not by step 1. Twenty-
five sections, settled against the code. "Not built here" means exactly that — not
that the behavior is wrong, and not that a marker should move.

| § | Section | Built here | Not built here |
|---|---|---|---|
| 0 | Abstract & honest scope | No behavior of its own. The AL1 bound it states — "tamper-*evident* against non-recomputing tampering", and only for a transition that is not the current head — is what `chain/replay.ts`'s `verifyChain` actually delivers, and that function's own doc comment states the same limit | The signing upgrade §0 names as the closure for the recompute residual (§14) |
| 1 | Terminology & conventions | Definitional. Its BCP-14 obligations fall on parties other than the library; the adopter-canonicalizer one is honored as a hook (`Config.canonicalizers`, resolved fail-closed) | — |
| 2 | The record model | `types.ts`'s `DecisionRecord` carries every unconditional field of §2's table; `IdentityAssertion` and `Consultation` match their auxiliary shapes; `nonterminal.ts` writes §2's terminality derivation whole — all three disjuncts, not the reachable subset — and every `appendTransition` call the kernel makes takes its persisted non-terminal flag from it, none hardcoding one; the human-leg requirement holds structurally, the frozen agent handle carrying `{stage, getRecord, readChain, chainHead}` and nothing that transitions a record. `DecisionRecord` also carries `status: 'active' \| 'retired'`, new this increment: derived by `chain/replay.ts` from the chain — `retired` once a `sealed` transition caps it, `active` before that — never stored, never a caller input, the same discipline `state` follows. This is not a gap against §5 or §12, both of which require a sealed record to report `retired`; it IS a divergence from §2's own table above, which lists `state` and no `status` row — the field exists to satisfy a requirement §2's own table does not carry a line for | The three effect-seam states are typed but unreachable: nothing appends `redeeming`/`redeemed`/`redemption-failed`, and `replay` throws on those kinds. No profile-conditional field is represented — `priorRecordRefs`/`priorLegActors`, `findings`/`acks`, `supersedes` are absent from `types.ts`, as are the `Finding` and `Ack` structures |
| 2.1 | Worked example | This build produces the example's shape. A pure-capture single-leg profile is the only kind it can construct; `finalize()`'s rung (6) appends `chain-verify`, then `facts`, then `confirmed` as one atomic `appendBatch` call — matching the example's own "one atomic batch (§12)" shape now, not only its transition sequence — all stamped from one clock read (`kernel/finalize.ts`'s `nowIso`), and each payload matches §4's table | Its named continuations (effect-seam, multi-leg, findings-flow transitions) have no producers |
| 3 | Content binding | `contentDigest = digest(canonicalize(adopterCanonicalizer(content)))` at `stage()`, recomputed and compared at finalize's rung (4); the adopter canonicalizer is a hook, never a domain canonicalizer; RFC 8785 serialization is library-owned and zero-dependency (`jcs.ts`); content is digested and never persisted; `canonicalize`/`digest` are exported so a host can recompute; the reviewed-surface (`facts`) binding is enforced by default at rung (5), refusing `consultation-missing` | One narrowing, stated at its site: `facts.figures` goes through library JCS only, never the adopter canonicalizer — §3's ownership split scopes that canonicalizer to domain content and does not name the figures path, so this is a reading rather than a transcription. Host content retention is a host duty either way |
| 4 | Transitions & the encoding | The `Transition` shape; `transitionDigest` over JCS of `{recordId, seq, at, kind, payload, prevHash}` with `seq` stringified; the genesis rule over the UTF-8 bytes of `vidimera:genesis:<recordId>`; millisecond-precision UTC stamps; `profileDigest` over "a data-only projection of the profile". §4's byte-stability invariant is exercised in the only direction this build can exercise it: `test/byte-stability.test.ts` pins the four transition digests of a feature-free finalize, so drift in the minimal chain surfaces as a digest change — with no declarable feature there is no second profile shape to compare it against. Emitted kinds: `opened`, `consultation-recorded`, `confirmed`, `refused`, `expired`. Of §4's clock-driven edges, `open → expired` is built and appended en passant — "no scheduler and no public `expire()`" holds here literally | `sealed`, `finding-raised`, `acknowledged`, `redeeming`, `redeemed`, `redemption-failed` are union members with no producer, and `replay` throws on them. The `opened` payload's optional keys (`policyDigest`, `priorRecordRefs`, `priorLegActors`, `supersedes`) are never written. The `confirmed → expired` and `redeeming → redemption-failed` clock edges are unbuilt |
| 5 | Chaining & replay/verify | `replay(chain)` and `verifyChain(chain)` as pure functions over a chain; `verifyChain` recomputes every link and seq and reports the first break; `finalize()` runs the pre-seam verify as rung (1) and records it as a `chain-verify` consultation on a clean replay; on a detected break it refuses `chain-compromise` and appends one `refused` edge where the store's C3 admits one, falling back to a result-first refusal with no `transitionRef` where none is admitted. **Chain retirement is built, new this increment**: `seal(recordId)` on the operator handle verifies the chain first — SPEC §5: "Verification is first: a record whose chain fails verification refuses `chain-compromise` and can never be sealed" — then, against a derived-terminal record, appends a state-preserving `sealed` transition through C3's carve-out; the store's C4 bar then admits no further append of any kind, and `replay` folds a `sealed` transition to `status: 'retired'` without moving `state` (a sealed `confirmed` record is still `confirmed`, §2 row above). Verification's priority holds even against an already-sealed record: a broken chain over one still refuses `chain-compromise`, with no edge (C4 admits none against a sealed record either), reusing `finalize.ts`'s `appendChainCompromise` (now exported) rather than a copy. `seal()` never calls `expireIfDue`, deliberately — SPEC §4 names this an exception, not an omission | §5 says "The library exposes two functions over a record's chain"; `index.ts` exports neither — only the operator handle's `recordId`-keyed wrappers, which can verify only a chain the live store returns. "Every operator-side mutating seam verifies the chain before acting" is not universal here: `open()`'s en-passant expire of a blocking record replays that chain without verifying it, and `redeem()` never verifies at all |
| 6 | Identity | `IdentityAssertion {principal, authority, proofRef?}`; identity is read only from `finalize()`'s explicit argument and never from a decision payload; both of §6's refusal branches map to `identity-authority-refused` at rung (3) — a missing or malformed identity argument, and an `authority` outside the leg's `allowedAuthorities`, including a low-trust one where the leg does not list it | `proofRef` is carried and never inspected. Pseudonymous `principal` is host guidance (§13), unenforced and unenforceable here |
| 7 | Digest identifiers & agility | `<algorithm>:<lowercase-hex>` throughout; `sha256` is the only minting algorithm and `digest()` throws on any other rather than deferring to the runtime's list; `algorithmOf()` resolves a recorded digest's own algorithm, so every `transitionDigest` after genesis is computed under the algorithm its own `prevHash` carries | The deprecation-warning surface exists (`DEPRECATED_ALGORITHMS` plus `process.emitWarning`) but the set is empty, so nothing can fire it — there is no second algorithm to migrate to or from |
| 8 | Refusal codes | **Eleven of §8's eleven core codes** — `unsealable-state` is built this increment, the union's eleventh member — as a union with a compiler-total code→class map; `appendsOn` implements §8's append semantics — compromise appends wherever the state admits a state-leaving append, a fixed never-appends set never does (`unsealable-state` is in it: `seal()`'s only append is the `sealed` transition itself, folded into its own success path, never a byproduct of this refusal), and every other refusal-class code appends `open → refused` iff the leg's `terminalRefusals` lists it; `leg-expired`'s inertness as a `terminalRefusals` member is real and pinned. Both `unknown-leg` producers are built. Caller errors throw rather than refuse at `open()` (unknown `stagedRef`), `finalize()` (unknown `recordId`), `seal()` (unknown `recordId`) and `review`/`replay`/`verifyChain` (empty chain), and finalize throws on a persisted `legId` absent from its profile | Every profile-conditional code is absent. The `availability` class has no code in the union, so `Outcome`'s `unavailable` branch is unconstructible as §8 specifies and has no producer. `redeem()` refuses `unredeemable-state` on a non-existent `recordId` instead of throwing, and refuses it without checking §8's "intact-chain, known-profile, valid-leg" qualifiers. A `terminalRefusals` entry that is not a real code is accepted at construction and then never matches |
| 9 | The API surface | All four decision calls, split as §9 splits them: `stage()` agent-reachable, `open()`/`review()`/`finalize()` operator-only. `seal()` is built too, new this increment, and also operator-only — §9 groups it with `open()`/`review()`/`finalize()`/`redeem()` "and the sweep — §12"; see the §5 and §12 rows for its own gate ladder. The human anchor holds by construction — the agent handle is frozen and carries nothing that transitions a record. Exclusivity is enforced in the store's constraint, not by an advisory pre-check. Of the finalize gate ladder, rungs (1) chain-verify, (2) state/expiry, (3) identity, (4) content-drift, (5) facts and (6) the success batch — now one atomic `appendBatch` call rather than three sequential appends — are built, and their adjacent-pair order is pinned by `test/finalize-check-order.test.ts` | `finalize()` takes four parameters; §9's fifth (`opts?`) is absent, so a plain-JavaScript caller's fifth argument is dropped by parameter elision and neither throw §9 places ahead of the ladder has an argument that could carry its input (deferral register row 11). `open()`'s options bag is declared empty and throws on any key. Ladder rungs (3.5) SoD, (4.5) policy-drift, (5.5) consultations/eligibility and (5.7) ack coverage are unbuilt. The findings seams and the operator sweep do not exist; `redeem()` is a stub. Exclusivity is enforced but not *actionable*: a `record-exists` refusal names no blocking record, §12's `findNonTerminal` being absent — see the §12 row |
| 9.1 | The ConfirmProfile | The profile and leg types carry §9.1's field table. "Construction is loud" is real: `create()` validates every profile, rejects duplicate ids, requires every `canonicalizerRef` to resolve, and throws a byte-preserved "feature not available in this build" error naming the section that lifts each of **ten** governed fields. `expiry` drives the only clock this build has. The effect-seam predicate is written whole. `allowedAuthorities` and `terminalRefusals` are honored | §9.1's individually named construction errors are not individually checked: reserved consultation kinds in `requiredConsultations` and double-declared eligibility sit behind wholesale governed throws, and "inert or contradictory feature combinations" is not implemented as a check — a malformed `terminalRefusals` member is neither rejected nor ever matched. A `redeem` block is accepted at construction and both its bounds are inert: no clock resolves `confirmToRedeem` or `redeemBound` here (the deliberate exception; deferral register row 9) |
| 9.2 | Capture modes | `staged` — the only mode this build runs, and the mode every profile it can construct is in | `live` throws at construction, and `reverify` is a structural construction error on any profile that gets past that throw — so no profile this build can construct is in live mode, and none can carry `reverify` either |
| 10 | Feature-conditional decision controls | The shape of the rule: a host declaring none of §10's fields runs the base model, and every field that would switch one on throws at construction | All four controls below |
| 10.1 | Maker-checker / SoD | None of the control. Forward shape only: `isFinalLeg(legIndex, totalLegs)` is an index comparison rather than a hardcoded final-leg answer, and `open()` passes the resolved leg's index | `legs.length > 1`, `sod.notActorOf` and `proposer` all throw at construction; there is no prior-leg reference verification, no `priorLegActors` derivation, no SoD gate, and no `sod-violation` / `prior-leg-unverified` code. One residual hardcoded leg index remains, at `kernel/expiry.ts`'s `expired` append, where the flag it feeds is `false` for every input it could take |
| 10.2 | Findings & acknowledgments | None. `finding-raised` and `acknowledged` exist as `TransitionKind` members, and `store/memory.ts` maps both state-preserving | `ackMode`/`requiredAcks` throw at construction; no `raiseFinding` or `acknowledge` seam; no coverage gate; no `ack-missing`/`ack-stale`; `review()` has no findings projection; and `replay` throws on either kind, so no such transition can be read back |
| 10.3 | Policy-drift notarization | None of the gate. `policyDigest` is a typed, present-iff-present field on `DecisionRecord` and `ReviewView`, and `replay` folds it when a genesis payload carries one | `policySource` throws at construction, so nothing ever writes the field this build can read; there is no live-source comparison and no `policy-drift` code. Of §10.3's loud throws: the `open()`-side one is met only by coincidence — `open()` does throw when a `policyDigest` is supplied to a non-declaring profile, but as a governed-capability error rather than §10.3's binding contract, and its declaring-without half has no profile that could reach it — while the finalize-side `opts.policy` contract has no argument that could carry its input at all (deferral register row 11) |
| 10.4 | Eligibility gating | None | `eligibility` throws at construction; no implicit-first required kind, no gate, no `ineligible` code |
| 11 | Feature-conditional evidence & the effect seam | A heading with no normative text of its own; its two subsections carry it | — |
| 11.1 | Consultations | The attach form as the *library* uses it: `finalize()` records its own `chain-verify` and `facts` consultations; a consultation's `at` is stamped at the recording seam and never accepted from a host; custody is digest-only (`payloadDigest`); `replay` accumulates consultations in chain order | The host's `opts.consultations` input surface does not exist, so no host-supplied consultation can be attached at all. Required-consultation gating, the reserved-kind argument-intake throw, the one-per-kind rule, the availability outcome and `consultation-failed` are unbuilt; `freshness` throws at construction, and its `consultation-stale` gate is AL2-dependent in the spec itself |
| 11.2 | Redemption (the effect seam) | `redeem(recordId, content)` is exported on every profile, as §8 requires of it, and refuses `unredeemable-state` result-first, appending nothing — with one deliberate exception this build added: on a confirmed effect-seam record it throws a build-capability error at the seam rather than refusing silently | The seam itself: no `redeeming`/`redeemed`/`redemption-failed` edges, no token issuance, no effect-content correspondence check, no at-most-once machinery, no `effect-mismatch`/`already-redeemed`/`redemption-timeout`, and neither redemption clock. Neither that throw nor a refusal releases the `(profile, subject)` pair a confirmed effect-seam record holds — the hold lives in the store's C1 exclusivity (deferral register row 9) |
| 12 | Storage interface | Seven of the eight `Store` methods §12 gives a signature to, with C1 exclusivity over the persisted non-terminal flag, C2 server-verified sequencing, C3 terminal monotonicity (including the compromise carve-out) and **C4 seal-finality** all checked atomically inside the append rather than as an advisory pre-check; `putStaged` is "idempotent, first-write-wins"; "All reads return **fresh values**" is honored on every write and read seam, by deep clone on read *and* on write; the persisted `state`, non-terminal and `dueAt` columns are "constraint-and-index only", backing the compare-and-swap, the exclusivity index and the due query, replay over the chain staying the authoritative derivation; digests use the record's recorded algorithm. `appendTransition`'s `meta` argument now matches §12's `{ nonTerminal, dueAt? }` shape exactly, rather than the bare `nonTerminal` boolean it took before. `appendBatch` lands §12's atomic-batch rung whole: the entry compare-and-swap is checked **once** (genesis never appears in a batch); per-element sequencing is server-verified `max+1 … max+N`; terminal-monotonicity runs against the evolving intra-batch state with the terminality input fixed at the entry flag, so a record "cannot become terminal mid-batch"; `meta` is applied once as the post-batch record flags; and the first conflicting element aborts the whole transaction with nothing applied, naming that element's index. `listDue(now)` implements §12's gate verbatim — `dueAt ≠ null AND dueAt ≤ now`, with no state predicate — and `dueAt` has exactly one producer in this build, the genesis `opened` append carrying the profile's open-window deadline, with every state-leaving append clearing it by omission. **C4, built this increment**: after a `sealed` transition lands, set from the transition's kind rather than from `meta`, no further append is admitted through either write seam, each at the reach §12 gives it: `appendTransition` checks seal-finality on every call and reports `state-mismatch`, while `appendBatch` checks it **once at entry** and reports `state-mismatch` at `index: 0`, matching SPEC §12's own words exactly: "Entry-level failures — an entry compare-and-swap mismatch or C4 seal-finality — report element index 0." The batch bar is entry-level only — the per-element loop does not re-evaluate seal-finality against the evolving batch, so a batch carrying a `sealed` element followed by further elements would not be stopped element-by-element. That is what §12 specifies rather than a narrowing of it, and nothing in this build can construct such a batch: `seal()` is the only producer of a `sealed` transition and sends it as a single `appendTransition`. The storage-section "Sealing" paragraph's `seal(recordId)` — verify, resolve profile, already-sealed check, derived-terminal check, then append — is also built (`kernel/seal.ts`), adding no Store method of its own and calling exactly two of them, `readChain` and `appendTransition`, over `chain/replay.ts`'s pure functions; see the §5 row and the seven-of-eight boundary below | `findNonTerminal` is the one absent method. What remains of the signature divergence is `tx?` alone: §12 puts an optional caller-supplied transaction on every write, and neither `appendTransition` nor `appendBatch` accepts one — an in-memory backing has no transaction to receive it. `listDue` is narrowed from §12, which says the method "returns the records due": this build's version returns recordIds instead, because ids are what the operator sweep needs and full records would require the store to replay chains it deliberately does not interpret. The absence of `findNonTerminal` still costs a host something concrete: without it — "the re-emit binding that makes `record-exists` actionable, and the same record C1 names as the blocker" — a host that draws `record-exists` has no supported way to find the record blocking it. `open()` holds C1's `blockingRecordId` internally and discards it; no field of a refused `Outcome` could carry it out. `listDue`'s arrival clears the store-side blocker for the sweep — the due-record resolution pass §12 describes, iterating `listDue(now)` — but the sweep itself, an operator-facing orchestration, is not built here; see the §9 row. One backing ships (in-memory), so §12's reference-adapter proof structure — SQL adapters, a "backing-parameterized conformance suite", a cross-backing "byte-identical chains" test — has nothing to run over. See the seven-of-eight boundary below |
| 13 | Privacy & retention | Digest-only custody is real — content never reaches the store — which is what makes §13's pseudonymization guidance implementable by a host. `principal` is stored exactly as supplied. Sealing and the `active`/`retired` distinction are built this increment (§5, §12 rows), so §13's specified end-of-life state — "a record reports as `active` or, once sealed, `retired` — rather than an unexplained gap in the chain" — now exists here | Pseudonymization, retention periods and the purpose-limitation guard remain host duties this build neither enforces nor could |
| 13A | Security considerations | Descriptive, and accurate of this build: the AL1 limit is what `verifyChain` delivers, and "whole-record absence is silent" holds here too — `readChain` returns `[]` for an unknown id, and every audit path runs over what the store returns. Two of the threats §13A says the library addresses are live: render-to-decide drift (rung (4)) and payload-identity forgery (rung (3)) | Late-arriving findings depend on §10.2's flow, which is unbuilt. The AL2 closure §13A names for its first two residuals is unbuilt |
| 14 | Signing & anchoring | AL1 is what ships, and nothing in this build describes it as cryptographic | AL2 detached signing — there is no signer seam; `Config` names one only in a comment — and AL3 anchoring, which §14 itself keeps as documented-only |

### Named boundaries and divergences

Eight things are called out on their own because a reader would otherwise have to
reconstruct them from the table.

**The store is seven of eight.** `putStaged`, `getStaged`, `appendTransition`, `appendBatch`,
`readChain`, `chainHead` and `listDue` are built; `findNonTerminal` alone is not. **The
denominator is corrected this increment: it was nine before, and the ninth was `seal`, counted
as a second absent Store method.** `seal` never was one. SPEC §9 lists it operator-only,
alongside `open()`/`review()`/`finalize()`/`redeem()` "and the sweep — §12," and §12 discusses
`seal(recordId)` in the storage section only because C4 seal-finality — the constraint that
makes both of them true — lives there. `seal()` is built now (see the §5 row and the next
boundary below) and adds no Store method of its own: it calls exactly two of the eight,
`readChain` and `appendTransition`, over `chain/replay.ts`'s pure functions. It could not run
"atop all eight" in any case — `findNonTerminal` is not there to be called. Its arrival is what
surfaced the miscount, not what caused it — the count was wrong
from this row's first version, long before `seal()` existed to demonstrate it. The distinction
that matters is recorded in full at **deferral register row 13** and is summarized here rather
than restated differently: §12's provisionality clause — "method signatures are unstable while
0.x and freeze only at 1.0", the durable thing being the behavior rather than the argument
list — covers what remains of the signature divergence, now `tx?` alone (`appendTransition`
and `appendBatch` both take §12's `meta = { nonTerminal, dueAt? }` exactly). It does **not**
cover the **one absent method**: a store missing it implements part of §12's surface and does
not conform to §12, and no reading of the provisionality clause closes that. `Store` is a
public export and `Config.store` is host-supplied, so a third-party adapter author must not
read this subset as the whole contract. Row 13 itself does not retire at this increment's
exit: `findNonTerminal` is still absent, and it is not renumbered — the register's own
preamble treats numbers as stable identifiers, and a row that still names a real gap stays on
the table under its own number.

**Chain retirement is built, and deferral register row 14 retires.** §5's "sealed"/"retired"
pair and §12's C4 seal-finality bar are real: `seal(recordId)` on the operator handle verifies
the chain first — SPEC §5: "Verification is first: a record whose chain fails verification
refuses `chain-compromise` and can never be sealed" — then, against a derived-terminal record,
appends a state-preserving `sealed` transition through C3's carve-out; the store's C4 bar then
admits no further append of any kind, through either write seam, and `replay` folds a `sealed`
transition to `status: 'retired'` without moving `state` — a sealed `confirmed` record is still
`confirmed` (§2 row above). This closes **deferral register row 14**, now retired and deleted
per the register's own preamble (a gap is an entry that has left; the number is not reused).
Row 14's trigger predicted the wrong sequencing, and the correction belongs here since the row
itself is gone: it read "The build step that first ships `seal()` — the same step must add the
C4 bar and its test, because shipping `seal()` makes this gap reachable in the same commit."
That did not happen, and did not need to — C4 seal-finality and its test landed one build task
*ahead* of `seal()`, deliberately, so the store already refused correctly before the one seam
that could reach it existed. The prediction was reasonable (nothing demonstrates a bar with no
producer of what it bars) and wrong: building the bar first and proving it defensively, then
adding the caller that can trigger it, is the safer order, and it is the order this increment
actually used.

**A false claim in `11f6527`'s commit body needs correcting here, because the commit itself
can't be.** That commit's body says shipping `seal()` "is what makes that function's
no-candidate fallback reachable for the first time — before the C4 bar existed, nothing
stopped an append against an already-sealed record, so a tampered chain over one could not
arise as a scenario," speaking of `kernel/finalize.ts`'s `appendChainCompromise`. **This is
false.** That fallback — the result-first `chain-compromise` refusal with no `transitionRef` —
was already reachable before this branch existed, against a terminal `expired`/`refused`
record under §12's C3 carve-out, with no `sealed` transition or C4 involved at all:
`packages/record/test/chain-verify.test.ts:292` ("a tampered chain on an ALREADY-EXPIRED
record: NO candidate CAS target is admitted — chain-compromise with NO append, NO
transitionRef (C3-forced corner)") has pinned exactly that scenario since `7547b12`, part of
build-order step 1's own test corpus. What C4 actually added is a *second* route into the same
fallback — a sealed record is now also a no-candidate case — not the first one. The claim
traces to this increment's own plan, `docs/superpowers/plans/2026-08-05-chain-retirement.md`,
whose Step 5 directed the implementer to "add one line to its doc comment saying `seal()` is now
a second caller and that C4 makes its no-candidate fallback reachable where it previously could
not fire" — quoted as that line then read, because this branch's final fix round corrected it in
place, it being the tracked sentence the false doc comment came from. From there the claim was
carried into `kernel/finalize.ts`'s `appendChainCompromise` doc comment itself (the same file
the commit body describes) — reworded
once in `b779517` (to the weaker, still partly false claim that `seal()`'s own tamper test was
"the first fixture in this corpus" to construct the fallback) and the surviving sentence deleted
outright in `8a64b0d`; that doc comment now carries neither claim. The commit body can't be
corrected without rewriting history, so this paragraph is the correction, recorded where a
reader auditing the commit will find it.

**The finalize success batch is one atomic `appendBatch` call.** §9's ladder rung (6) is
"one atomic, variable-arity" `appendBatch`, "all-or-nothing, so a conflict never leaves a
partial tail"; this build's rung (6) now IS that call — `[chain-verify, facts, confirmed]`
sent under one entry compare-and-swap rather than as three ordinary sequential appends,
which is what **deferral register row 12** (now retired) named as its own trigger. That
row's trigger read: "Build step 2, when `appendBatch` lands: the batch becomes
all-or-nothing and the mid-batch throw loses its only producer." The first half held; the
second did not. A `seq` conflict is still producible — another writer can move the store's
`max` between finalize's chain load and its batch send — so the throw survives, in
simplified form: only the `seq` shape still reaches `batchConflict` (`kernel/finalize.ts`)
and throws a storage fault naming the shape and index, with nothing recorded; an entry
`state-mismatch` now refuses `record-not-open` instead, true of the record's state AND its
never-appends registry entry both, for the first time at this seam, because the batch is
all-or-nothing and applies nothing under either conflict shape. The asymmetry the retired
row recorded — the first append's refusal against the later two appends' throw — is
retired with it: there is no longer a "later append" for anything to be.

**`unknown-leg`: the divergence is closed.** SPEC §8 names two producers of this code —
"a caller-named leg absent from the profile at `stage()`, and a staged draft's leg absent
from the profile it resolves under at `open()`". At the point this step's remediation plan
was written, only the first was wired. The gap was never a deliberate difference from the
spec: it was inherited, and it was a difference from the **reference implementation** this
kernel was adopted from — that project's later history carried `open()`'s re-check and the
commit this kernel was taken from did not, so the second producer arrived unwired. It is
INHERIT item 5 in `docs/process/adopted-source-provenance.md`, applied at `8c78083`. Both
producers are built and tested today (`packages/record/test/unknown-ids.test.ts`), with
`unknown-profile` still winning where both are wrong. What remains from the same family is
about a different thing: `kernel/stage.ts` is the one source file taken from the reference
project's later head rather than from the commit the rest came from — a deliberate
divergence, recorded as such in the provenance document.

**Two inherited pinned assertions were inverted, both authorized.** This kernel arrived
with the reference implementation's own test corpus, and adopting a corpus and then
quietly changing what it pins is how a build drifts from the thing it adopted while its
suite stays green. So an **inversion** — overturning an assertion the inherited corpus
pinned, replacing a passing test's expectation with the opposite one — is authorized
explicitly and argued at the test itself, never folded in silently. This branch authorized
exactly two, both recorded in place in `packages/record/test/terminality.test.ts`:

1. **`redeem()` on a confirmed effect-seam record.** The inherited assertion pinned a
   silent `unredeemable-state` refusal. It now throws a build-capability error at the
   seam. This is **loudness, not closure**: the throw releases nothing, and the
   `(profile, subject)` pair stays held exactly as it did under the refusal, because the
   hold lives in the store's C1 exclusivity rather than in what `redeem()` returns.
2. **A mid-batch conflict in finalize's success batch.** The inherited assertion pinned
   `record-not-open` returned after a conflict on the `confirmed` append — a never-appends
   code carrying no `transitionRef`, which tells a host that the call recorded nothing
   while two of its consultations sit on the chain. At this build step's own exit it threw
   instead, naming the conflict shape and what the call appended, with nothing rolled back
   (no rollback existed) and a retry appending its own consultation pair on top of what had
   already landed. **UPDATED, this increment:** the three-append sequence that description
   depends on is gone — rung (6) is now one atomic `appendBatch` call (deferral register row
   12, now retired) — so there is no longer a scenario where something already landed for a
   retry to append on top of. The throw-not-refuse mapping this inversion argued for is
   still in force, reached differently: a `seq` conflict throws and a `state-mismatch`
   refuses `record-not-open`, full stop, because nothing is ever partially applied for
   either shape to misrepresent. `packages/record/test/terminality.test.ts`'s own inversion
   note is appended in place to say the same thing, rather than rewritten, and this entry
   follows the same discipline.

**Deferral register row 9's most-corrected claim is now a passing test.** The row already
states, after two prior corrections, that `seal()` is not a release path for a confirmed
effect-seam record's permanently held `(profile, subject)` pair — SPEC §12 admits `seal()`
only against a derived-terminal record, and SPEC §2 makes a final-leg `confirmed` on an
effect-seam profile non-terminal. `packages/record/test/seal.test.ts`'s "seal() on an
EFFECT-SEAM confirmed record -> unsealable-state (it is non-terminal, awaiting redemption)"
now proves it by execution, not only by argument: that test pins the refusal and its code,
`unsealable-state`, and `kernel/seal.ts` returns it at the terminality gate, ahead of the
`sealed` append — so the hold, which lives in the store's C1 exclusivity rather than in
what any call returns or throws, is untouched.

**Row 9 did need one edit, and it is not the claim above.** The row carried a second
sentence — a statement of fact about the shipped code, that there was "no `seal()` on the
operator surface and no `unsealable-state` in the shipped `RefusalCode` union" — which was
true when it was written and false the moment this increment shipped both
(`packages/record/src/operator-surface.ts`, `packages/record/src/refusal-codes.ts`). The
release-path claim was the part that was merely argued and is now pinned; the currentness
claim beside it was the part that went stale, and it is rewritten in place. An earlier version
of this paragraph concluded that the row needed no edit at all, having checked only the first
of the two. `packages/record/test/terminality.test.ts` carried the same stale sentence and is
corrected with it.

### The package is unconsumable today

Stated plainly, in the same breath as the green gates, because that is what an exit record
is for: **there is no artifact here a host could install or import.**

`packages/record/package.json` carries exactly five fields — `name`, `version` (`0.0.0`),
`private: true`, `type: module`, and `description`. There is no `exports`, no `main`, no
`types`, no `files`, no `scripts`, and no dependency of any kind. `private: true` blocks
publication; with no entry-point field, nothing tells a resolver what to load even if it
were published. And nothing is compiled: the repository's only TypeScript invocation is
`tsc -p packages/record --noEmit`, and `noEmit` is set in `tsconfig.base.json` itself, so
no JavaScript artifact is produced anywhere by any script here.

What runs today is the TypeScript source, inside this workspace, under this repository's
own test runner. That is enough to prove the kernel's behavior and not enough for anyone
else to use it. Publish tooling is **deferral register row 1**, triggered by the first
external consumer or the 0.1 cut; the pre-0.1 API naming review over what `index.ts`
exports is row 6, triggered at the 0.1 cut.

### Still outstanding

Carried in the deferral register, with triggers:

- **Row 1** — publish tooling (build, versioning, release).
- **Row 4** — generalizing the root `typecheck` beyond `packages/record`, and per-package
  test-runner devDependencies.
- **Row 5** — `biome migrate` for the deprecated `linter.rules.recommended` field (one of
  the thirteen infos above).
- **Row 6** — the pre-0.1 API naming review over what `index.ts` actually exports.
- **Row 9** — the `redeem` effect-seam strand: a confirmed effect-seam record's
  `(profile, subject)` pair stays permanently held, and no call on either surface can
  release it. Real closure needs a later step's redemption edge or a `confirmToRedeem`
  expiry edge.
- **Row 10** — the `redeeming` arm of `finalize()`'s chain-compromise fallback, which no
  path in this build can reach.
- **Row 11** — `finalize()`'s missing `opts` argument, and the two SPEC-mandated throws
  that therefore have no reachable call path.
- **Row 13** — the seven-of-eight store: `findNonTerminal` remains absent, and the
  caller-supplied transaction seam (`tx?`) is the one signature divergence left. `seal` was
  never a Store method and the row's denominator is corrected accordingly this increment; see
  the seven-of-eight boundary above.

Raised by this step's own review and planning documents and **not in the deferral register** —
recorded here so the step does not exit with them unstated, and left as their sources state
them rather than adjudicated again:

- `redeem()`'s stub returns `unredeemable-state` on three paths §8 scopes elsewhere: an
  unconfigured profile, a tampered chain (it never verifies), and a non-existent
  `recordId` (which §8 makes a throw). Every one of those paths appends nothing, so each
  stays fail-closed; only the reported code is wrong.
- A `terminalRefusals` member that is not a real refusal code constructs without error and
  then never matches, so a leg the operator believes is configured terminal is not.
- **Four items are held for the repository owner rather than acted on**, because in each
  the plausible fix touches the **sealed** concept set. This record neither resolves nor
  adjudicates any of them.

  Two come from the whole-branch review, and in both the reference implementation's later
  head does what this build does — which is what makes the spec-wording reading plausible
  rather than this branch having introduced a defect: `replay`/`verifyChain` not being
  exported from `index.ts` against §5's "The library exposes two functions over a record's
  chain", and `open()`'s en-passant blocker expire running without the pre-seam
  chain-verify §5 states as a blanket rule.

  The third is a divergence *inside* the sealed set, and it is carried in the autonomous
  step-1 plan's own known-open list rather than in the review. Verified live here:
  `docs/concept/CONTROLS.md`'s Recovery (`supersedes`) row calls it a "profile-conditional
  field", and §9.1's ConfirmProfile field table — the table that decides what a profile can
  declare — has no row for it, while §9 carries `supersedes` as an `open()` option. A
  reader deciding what a profile is allowed to declare gets two answers. **One thing an
  owner should know before ruling**, because it means the divergence is not the
  two-document affair it first looks like: §2 also lists `supersedes` among
  "Profile-conditional fields", "present only when the profile switches the feature on" —
  so §9.1's table and §2's list do not obviously agree with each other either. Which of the
  three texts moves is the owner's call; nothing here can be settled from the code, since
  `supersedes` throws at `open()` in this build and no profile can declare anything.

  **The fourth is also a divergence inside the sealed set, and it is new at this increment:
  `DecisionRecord.status`.** §5 (`docs/concept/SPEC.md:422`) — "A sealed record reports its
  per-record status as `retired`" — §12 (`:1119`) and §13 (`:1151-1152`) all require a sealed
  record to report `retired`, while §2's record-model field table (`:111-123`) has no `status`
  row: it lists `state` and nothing that could carry a lifecycle status beside it. So the field
  this build ships to satisfy §5, §12 and §13 is a field §2's own table does not carry a line
  for — the same thing the §2 row of the table above records. The code cannot settle it and is
  not waiting on it: three sections require the field, so removing it is not an option this
  build has, and it ships. What is open is only which text should have named it — §2's table
  gaining a `status` row, or §5/§12/§13 wording their requirement against `state` — and both
  candidate fixes are edits to `docs/concept/`.

Full accounts: `docs/analysis/2026-08-03-step-1-review.md` (Class D and "Findings that
need a sealed `docs/concept/` decision"),
`docs/superpowers/plans/2026-08-03-autonomous-step-1-completion.md`'s "Known-open,
deliberately" list, and `docs/process/deferral-register.md`.
