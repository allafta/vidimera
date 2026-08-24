# No-edge containment — design

**Date: 2026-08-24.** **A containment increment. No sanction is needed and none is sought.**
Nothing in `docs/concept/` moves, no maturity marker moves, and no capability is promoted.
The narrowing this increment lands drops only a candidate C3 can never admit, so every seam
outcome — refusal code, class, and `transitionRef` presence — is byte-identical on every
shape, including the read-chain/persisted-state divergence measured before it shipped. No
sealed sentence becomes true or false differently. And no sealed text describes the mechanism
being changed: SPEC §14 is the normative one and says nothing about sign-before-append ordering,
per-call signing counts, memoization, or the sidecar's key shape, while the other sealed mentions
of detached signing are one-line references in the architecture, assurance, controls and glossary
documents, none of which describes it either. Verify that enumeration against `docs/concept/` at
implementation time rather than trusting this sentence.

**This design was re-scoped after review, and the reason is the increment's most valuable
output.** It originally proposed a chain-local admissibility precheck that would have zeroed
both of row 22's costs. That precheck was measured to suppress a compromise evidence edge
that lands today. It is not in this increment; the finding it produced is, and it is recorded
in the register.

**The permitted edit envelope, stated as a STOP.** Exactly two `packages/*/src/` files carry
behavior changes: `packages/record/src/kernel/finalize.ts` and
`packages/record/src/signing/decorate.ts`. Comment-only repairs land in files named under
"What lands". **Any other `src/` edit is a STOP** — report it as a finding rather than
absorbing it.

**The register delta.** This increment changes `appendChainCompromise`'s candidate walk and
the decorator's `signOne`, so it IS the prompting event row 22's restated trigger names.
**22b retires here, on behavior. 22a does not**: it is re-scoped and stays open, carrying the
third horn below. Row 22 therefore keeps its number and loses half its body rather than
leaving the table.

**This increment is THIRD in a sequence of three and depends on both predecessors having
landed**: the row-22 truth repairs
(`docs/superpowers/specs/2026-08-24-row-22-truth-repairs-design.md`), which correct the row this
increment re-scopes, and the sidecar contract
(`docs/superpowers/specs/2026-08-24-sidecar-contract-design.md`), which states the orphan
obligation this increment leaves standing. The ordering is deliberate: with 22a not closing here,
orphans are a standing property of a signing deployment rather than a transient state, so the
contract governing that surface says so before this increment reasons about it.

## The gap, stated from the code

`appendChainCompromise` (`packages/record/src/kernel/finalize.ts`) computes a candidate list,
builds one `refused` transition stamping `at` from the clock, and walks the list calling
`store.appendTransition` until one CAS succeeds. On a record whose state admits no candidate,
every attempt fails, the append never lands — and under a signing profile the decorator has
already signed and written a sidecar entry for each attempt.

Two costs, proven independent by double dissociation. A signer-result memo zeroes the signing
redundancy and leaves orphan accumulation byte-for-byte identical; a compensating removal
zeroes accumulation and leaves signer invocations untouched. Different drivers too:
accumulation is driven entirely by the `at` timestamp — a fixed instant collapses six calls
onto one key — while the signer cost is driven entirely by the candidate walk and is unchanged
under either clock.

| # | Cost | Measured | Bites |
|---|---|---|---|
| 22a | Orphan accumulation | Sealed signing record, six refusing `finalize()` calls: sidecar 6, 7, 8, 9, 10, 11, chain flat at 5. Twenty calls: rows fetched per verification 5 … 24, 290 cumulative against 100 for a non-accumulating sidecar | Storage, observability, and per-call read amplification. Materially only on a durable backing, which does not exist in this tree |
| 22b | Redundant signer invocations | Three signer calls per refusing call on a sealed record, four on a record already carrying a compromise edge, one on the common landing path. All invocations within one call sign BYTE-IDENTICAL bytes and upsert ONE digest | Today, on every backing including the in-memory reference one. Against a network-bound `Signer`, N round-trips per refused seam call |

**The corpus census taken at filing time is WITHDRAWN pending re-derivation.** Its three
figures — 72 compromise-append calls, 64 landing the edge, 68 making exactly one CAS attempt
— cannot all be true: the walk returns on the first successful CAS and the shortest candidate
list is three, so a call makes exactly one attempt if and only if candidate 0 lands, making
the one-attempt count a subset of the landing count and therefore at most 64. Re-derive by
instrumenting `store.appendTransition` inside the loop and reporting three reconciling counts
— total calls, calls landing at candidate index 0, and calls that exhaust the list — before
any figure is written down anywhere.

**Reachability is not attacker-shaped, and this is the fact that moves the priority.** An
ordinary key retirement reaches the no-edge corner: a healthy, untampered, sealed signing
record whose decommissioned `keyRef` is dropped from the verifier registry — exactly the
host-declared lifecycle SPEC §14 describes — refuses `chain-compromise` fail-closed on every
subsequent seam call and mints one orphan plus three signer round-trips each time, sidecar
6 … 13 over eight calls, permanently. And the no-edge corner is not confined to sealed
records: on an unsealed record the compromise edge lands correctly the first time, after which
the replayed state is `refused` and every later call takes the four-candidate no-edge path.
On the corpus's compromise appends the majority LAND the edge (count withdrawn with the census
above), so this is the steady state of a compromised record touched again rather than a
sealed-record curiosity.

## The distinction that shapes the design: the third horn

Row 22's original dilemma said the containment must either special-case a path five call sites
share or reopen the pinned sign-before-append ordering. **That disjunction is wrong to be
exhaustive, but it was not wrong to be a dilemma.** The memo closes 22b off both horns. 22a
closes only by predicting the backing's answer from a chain that failed verification by
construction — a third horn nobody named, and the one this increment does not take.

`appendChainCompromise` reads the chain the seam handed it. C3 and C4 are decided by the
backing against its OWN persisted row. On the SQL backing those are different tables:
`readChain` reads the transitions table while the C3 and C4 gates read the records row. **So a
tamper that rewrites a transition leaves the persisted state untouched, and the two diverge —
that divergence is the ordinary shape of a real tamper, not an exotic one.**

Measured against the current tree, both halves of the proposed precheck suppress an edge that
lands today:

- **Rule (b), the terminal-state short-circuit.** A record persisted `confirmed` and terminal,
  with the read chain's last kind rewritten `confirmed` → `refused`. Replay folds `refused`.
  Today: candidates `refused` and `open` lose the state CAS, candidate `confirmed` passes it,
  C3 consults `isCompromiseCarveOut` — which admits a compromise-classed `refused` append
  against an expected `confirmed` — and the edge LANDS with a `transitionRef`. A chain-predicted
  bar returns ref-less and appends nothing.
- **Rule (a), the sealed-transition scan.** The same record with the last kind rewritten to
  `sealed`. Replay folds `open`, so rule (b) does not even fire — yet the walk still lands the
  edge, because C4 tests the backing's persisted `sealed` flag, about which a fabricated chain
  kind says nothing.

The triggering tamper — a length-preserving last-element kind rewrite — is the documented AL1
blind spot that only AL2 catches, which is to say exactly the population this increment exists
to serve. **The corpus cannot see any of it**: every corpus tamper is payload-only with kinds
intact, which is why a green record project is a null result for any candidate in this family,
and why "ran the record project green" must never again be offered as a safety claim here.

What survives is a strictly weaker but provably outcome-preserving narrowing: when the folded
state is terminal, the same-state candidate is dead — C3 bars a state-leaving `refused` append
out of a terminal record, and the carve-out admits only an expected `confirmed` or `redeeming`.
Dropping that one candidate cannot change any outcome. The three producible targets stay,
because they are adjudicated against a persisted row the read chain does not determine.

Note what `sealed` is and is not: it is a `TransitionKind`, never a `RecordState`. `replay`'s
`case 'sealed'` sets `status` and leaves `state` untouched, and `stateOf('sealed')` returns
null, which is why C3 never consults its carve-out for it. That is why the row's own sealed
fixture yields THREE candidates rather than four: replay folds to `confirmed`.

## Rulings taken (at the 2026-08-24 brainstorm), so they are not re-litigated

1. **The cost-zeroing precheck is NOT taken, and the reason is recorded rather than left as a
   scope note.** It is a deliberate narrowing of SPEC §5's admission rule, which states the
   rule in terms of the record's CURRENT state; substituting the read chain's folded state for
   it is a behavior change against a `[PROVEN]` section. That is a code/spec divergence, which
   this repository classes as a finding, never something silently reconciled. If it is ever
   wanted, it goes through `docs/concept/SCOPING-GUIDE.md` §§1–2's tier test and promotion rule
   first, and the trade it asks for must be stated plainly: a lost compromise evidence edge
   under a real tamper, in exchange for bounded sidecar growth.

2. **What lands instead is the outcome-preserving narrowing**, and its correctness argument is
   that the dropped candidate is one C3 can never admit — never that the chain is authority.

3. **Rule (b)'s five-state set is DERIVED, and the design says so rather than citing a list
   that does not exist.** The set is `refused`, `expired`, `declined`, `redeemed`,
   `redemption-failed` — exactly `RecordState` minus `open`, `confirmed`, `redeeming`, and
   exactly `!nonTerminal(state, true, true)`. **SPEC's own enumerations are NOT uniform and must
   not be quoted as though they were**: §5 names terminal `expired`, `refused`, `declined` plus
   sealed; §8 names already-terminal `expired`/`refused` or sealed; §12's C3 names terminal
   `expired` or `refused`; none enumerates `redeemed` or `redemption-failed`, though §2 states
   both terminal. Note also that §8 carries no maturity marker at its heading, so it must not be
   described as `[PROVEN]`. The set follows from §2's terminality plus C3's general bar.

4. **The narrowing is expressed as a constant with a build-breaking guard, not as a call.**
   `!nonTerminal(replayed, true, true)` would be correct and is the simpler expression; the
   `as const satisfies Record<RecordState, boolean>` constant is preferred because adding a
   member to `RecordState` then fails the BUILD here, where a bare call would silently classify
   the new member as non-barred. That build-break, not expressibility, is the reason.

5. **The narrowing must not fire when `replay` throws.** `packages/record/test/redeem-token.test.ts`'s
   genesis-KIND-tamper pin walks the static candidate list and lands the edge with a
   `transitionRef`. With no folded state there is nothing to narrow; the skip must be structural.

6. **The digest-keyed de-dup is REJECTED, and the rejection is MEASURED rather than argued.**
   The pinned invariant is not "signing happens somewhere before an append"; it is that a given
   append is preceded by its OWN completed sidecar write. A digest-keyed memo weakens that to
   "some earlier signing operation for this digest occurred". Measured: the eager variant let an
   append reach the store with zero completed puts; even the awaited digest-keyed promise
   variant reaches across seam calls and lands an UNSIGNED transition whenever the entry is
   absent at the second append, which `signatureLayerHolds` then condemns as compromise.

7. **Compensating removal is REJECTED and must never land in any variant.** Sign, put, append,
   remove on `appended: false` preserves the literal token order and destroys the property the
   order protects. Measured, no crash involved: two concurrent same-record `finalize()` calls,
   100 trials, drove 88 legitimately confirmed hash-intact records to lose their signature sets
   and take a terminal compromise edge, against 0 of 400 for the shipped ordering; on the batch
   path the loser's failed CAS stripped three of the winner's four entries. It is unrepairable —
   the sidecar is content-addressed and the signature scheme deterministic, so racing writers
   write byte-identical entries under one key.

8. **The memo's shape is fixed here so the implementer does not re-derive it.** A
   `WeakMap<Transition, Promise<{ keyRef: string; signature: string }>>` keyed by transition
   object identity, DECLARED at `withSigning` scope beside the existing `memo`, storing the
   SIGNER's in-flight promise, awaited by every caller, deleted on rejection before the rethrow
   — with `signing.signatures.put(...)` ALWAYS executed, because only the signer call is
   memoized and `signOne` itself is not. The memo lookup sits INSIDE `signOne`, which is what
   covers both append seams with one edit. Memoizing `signOne`'s own `Promise<void>` would skip
   the put on every repeat and reintroduce exactly the shape ruling 6 rejects.

9. **The divergence fixture is built FIRST and carries a binding STOP.** It is not a formality:
   it is the only thing in the tree that can tell an implementer the precheck is unsafe, and its
   result is what re-scoped this design. It lands as a permanent pin, so a future author
   proposing a chain-predicted bar meets it immediately.

10. **Instrumentation proves the branch ran; it does not ship.** The firing counters are
    temporary `process.stderr.write` probes, added, counted, recorded and removed within their
    own step. What ships is the recorded count in the increment record, not a counter in the
    source. The corpus asserted no signer count and pinned orphan minting in neither direction,
    so without the counts a green suite would be indistinguishable from code that never ran —
    the failure mode measured on compensating removal, which passed the whole record project
    with its new branch firing zero times.

11. **Row 22 is re-scoped, not retired.** 22b closes on behavior. 22a stays open with the third
    horn recorded and its trigger re-derived. Retiring the whole row would assert a containment
    that does not exist.

## What lands

- `packages/record/src/kernel/finalize.ts` — the outcome-preserving narrowing, structured so a
  `replay` throw skips it; the `NO_EDGE_STATE` constant with its build-breaking guard; and the
  doc-comment repairs below.
- `packages/record/src/signing/decorate.ts` — the signer-result memo of ruling 8.
- Comment repairs, in the same commits as the behavior they describe: `appendChainCompromise`'s
  own doc comment, which describes the no-edge corner in several places and is the only place in
  the tree that enumerates the no-edge shapes; `packages/record/src/refusal-codes.ts`'s and
  `packages/record/src/outcome.ts`'s descriptions of the fallback walk; the decorator's own file
  header, whose orphan-harmlessness argument the memo does not change but which the increment
  opens anyway and must be read against; and the cardinality comments in
  `packages/record/test/signing-enforce.test.ts`, exactly one of which today carries the
  "a second would mint another sidecar entry" clause — **verify which before editing any of them.**
- `packages/record/test/no-edge-containment.test.ts` — the counting rig, the baselines, the
  divergence pins, the memo's ordering and host-loss pins, and the signer-count pin.
- `docs/process/` — row 22 re-scoped, 22b's retirement recorded, 22a's trigger re-derived; and
  `CLAUDE.md`'s live-deferral-rows sentence, which names row 22 and would otherwise be left
  describing a row whose scope has changed.

## Coverage this adds, stated with its limit

The memo, measured on the real tree and then reverted, took the sealed no-edge corner from three
signer invocations per refusing call to one, leaving put counts and sidecar contents untouched.
The narrowing removes one signed CAS attempt per refusing call on a terminal-folded record.

**The limits, stated in the same breath:**

- **22a is NOT closed by this increment.** Orphan accumulation continues at one entry per
  refusing call. The only containment measured to stop it predicts the backing's answer from an
  untrusted chain, and ruling 1 declines it.
- **With the memo, the narrowing's own saving is small.** Once one mint serves all candidates,
  dropping a candidate saves a CAS attempt and a `put`, not a signer round-trip. It is kept
  because it is free and provably outcome-preserving, not because it is the point.
- **Nothing in the corpus could have caught the precheck's defect**, and nothing in the corpus
  validates the narrowing either. The divergence fixture is the only evidence in either
  direction, which is why ruling 9 builds it first.
- **Behavior on a durable `SignatureStore` backing stays UNMEASURED** — not deferred,
  unmeasurable in this tree, since `MemorySignatureStore` is the only implementation.
- **No latency figure exists anywhere.** The signing cost is an invocation count.
- **Every concurrency measurement behind rulings 6 and 7 is in-process.**
- **The enlisted redemption seams are exempt and gain nothing here** — their `tx !== undefined`
  guard returns before `appendChainCompromise`, so all three token seams already cost zero signer
  invocations under enlistment.

## Risk, and how it is held

- **The narrowing's own divergence exposure, stated rather than assumed.** It fires on the
  folded state, which can diverge from the persisted row. It is safe anyway because the dropped
  candidate could only ever match a record whose persisted state equals the folded one, and for
  that record C3 bars the edge. **That argument must be written at the site**, because it is the
  whole difference between this narrowing and the precheck that was rejected.
- **The replay-throws pins are the tripwire.** Both `redeem-token.test.ts` pins must stay green
  **unedited**. If either needs editing, the narrowing is wrong — STOP.
- **`packages/record/test/byte-stability.test.ts` cannot move, and this was verified rather than
  assumed.** Its four literals cover `opened`, two `consultation-recorded` and `confirmed` — no
  `refused`; its only flow throws on any refusal; and it declares no signing block. **The
  distinction to hold precisely:** a `refused` transition IS byte-pinned, in
  `byte-regression/terminal-refusals.test.ts`, but that is an ordinary content-drift refusal via
  `refuseMaybeAppend`, a path this increment does not touch.
- **The memo pairs a signature minted at first-mint time with a digest recomputed at every put.**
  Sound only because the transition object is not mutated between attempts. Nothing enforces
  that; the pin that would catch a future mutation is worth writing.
- **The contract scan runs over every line of a tracked TypeScript file, comments included.** The
  new comments must avoid the bare word that names a design document, the bare word for a work
  slice, and task-numbering forms.
- **Citation adjacency.** Only an optional possessive and one sub-reference token may sit between
  a citation and its quotation; anything else silently de-gates the quotation while the scan
  stays green.
- **`CLAUDE.md` is outside `docs/process/`** and names row 22. A completeness sweep scoped to
  `docs/process/` will miss it and leave the repository's own governing instruction file
  describing a row whose scope has changed.

## What stays outside, and why

- **The cost-zeroing precheck**, per ruling 1 — it needs a sanction and a stated trade.
- **22a's containment**, which has no candidate that does not take the third horn. The row stays
  open for it.
- **The tolerate-and-prune sentence in `packages/record/src/signing/store.ts`** and the matching
  operator-facing warning in `docs/guide/`. With 22a unclosed this is the highest-value change
  available, which is why it is no longer merely outside this increment: it has its own pair
  (`docs/superpowers/specs/2026-08-24-sidecar-contract-design.md`) and lands BEFORE this one.
- **Hardening the two sidecar-DRIVEN readers** — the operator-assurance probe and the corpus's
  shared break helper — to correlate through the chain. A finding in its own right, and it lands
  with the sidecar-contract increment ahead of this one.
- **The stale intra-repo pointer in `packages/record/src/store/memory.ts`** citing `kernel/open.ts`
  at two line numbers that have moved.

## Exit

The increment exits when: the divergence fixture is built and its binding STOP discharged before
any behavior change ships; the narrowing lands with its correctness argument written at the site
and both `redeem-token.test.ts` pins green unedited; the memo lands in its ruled shape with its
ordering, host-loss and digest-stability pins; both firing counts are recorded with their nonzero
controls; the comment inventory is verified site by site before editing and repaired in the same
commits as the behavior; row 22 is re-scoped in `docs/process/deferral-register.md` with 22b's
retirement noted in `docs/process/implementation-status.md`, `docs/process/next-phases.md` and
`docs/process/release-checklist.md`, 22a's trigger re-derived, and `CLAUDE.md`'s live-rows
sentence moved with them; the frozen oracle is proved untouched by `git diff` rather than by
inspection; and `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm contract-scan`, `pnpm api-sync`
and `pnpm docs-index-sync` are green with the new figures measured at exit rather than carried
forward.
