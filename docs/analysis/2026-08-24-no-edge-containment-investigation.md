# No-edge containment — the investigation behind register row 22's restatement

**Date: 2026-08-24.** A review of whether deferral-register row 22 — orphan sidecar growth on
the no-edge refusal path, opened 2026-08-23 by the AL2 signature-enforcement coverage
increment and recorded as Finding F of
`docs/analysis/2026-08-23-signature-enforcement-coverage.md` — was correctly deferred. The
review ran after that increment exited and before anything about the row was changed; this
record is written at the row-22 truth-repairs increment (2026-08-28), the first increment to
act on what the review found, and every site that increment corrects points here. Two
conclusions, stated apart because they pull in opposite directions. **The deferral was the
right act.** One cluster per increment is this repository's own discipline, a containment
needs its own design, plan and pins, and — the stronger reason, established only by this
review — the test corpus cannot adjudicate any candidate containment in this area at all (the
zero-firing result below). **The reason recorded for deferring was wrong.** Row 22 as filed
says the containment "either special-cases a path five call sites share or reopens the deliberately
pinned sign-before-append ordering". That disjunction is withdrawn as *exhaustive*, not as
wrong: one containment sits on neither horn and closes half the finding, and the only measured
containment for the other half sits on a third horn the sentence never named. The review
changed no file; it executed things. Nothing below required a change of opinion about what
the code does — only measurements the coverage increment had no occasion to take, because it
was closing a coverage row and correctly declined to open a containment investigation in
passing.

**How to read every figure in this record.** Almost every measurement below was taken on a
scratch fixture or a prototype arm — a copy of the tree with one candidate containment
applied — that was reverted and no longer exists. A read-only pass over the repository cannot
reconstruct them, and a figure written into a living register acquires the authority of the
tree whether or not the tree can reproduce it, which is the exact move the row-22 truth
repairs exist to correct. So each figure names the rig that produced it, says whether that rig
still exists, and names where a permanent pin lands if one is scheduled. A figure that could
not carry that sentence has been withdrawn rather than softened; the corpus census below is
the one that was. **Two measurements are the exception and are marked as such**: the two
sidecar-driven readers were reproduced against the current tree during the review of this
sequence's designs, and are reproducible from the tree as it stands.

## The measurements

Scratch fixtures and prototype arms produced them. Three fixtures recur often enough to carry
names here: a **refusing-call series rig** (driving one signing record through repeated
refusing `finalize()` calls and reading sidecar cardinality, chain length, rows fetched per
verification, and signer invocations after each); a **concurrency rig** (running trials of two
concurrent same-record `finalize()` calls against a prototype arm and against the shipped
ordering as control; one of its figures was independently reproduced); and a **divergence
rig** (on the current, unmodified tree: persists a record, rewrites the last transition's
`kind` in place, and drives `appendChainCompromise`). Two further one-off scratch fixtures
appear once each and are named where they do. The arms — copies of the tree with one candidate
containment applied — were the object-keyed signer-result memo, the compensating removal, the
chain-local admissibility precheck, and the digest-keyed de-dup in two variants. **Every
fixture and every arm is gone.** None is in the tree and none is on any branch. Unless a row
says otherwise, no figure in the table below is reproducible from the tree as it stands; the
exceptions are the figures a row marks as readable from source or re-taken on the suite
itself, and any figure whose last column names a pin once that pin has landed.

| Measurement | Figure | Rig | Rig today | Permanent pin |
|---|---|---|---|---|
| Orphan accumulation: sealed signing record, one broken signature, six refusing `finalize()` calls | Sidecar 6, 7, 8, 9, 10, 11 under the wall clock; chain 5 throughout. This is Finding F's own series, which that record took at the coverage increment on a rig it does not name; the series was reproduced on the rig named here. Finding F's fixed-instant companion (6 flat) stands as Finding F recorded it and is not re-taken here; its rig is unknown to this record and is not in the tree | Refusing-call series rig, baseline tree | Gone | `packages/record/test/no-edge-containment.test.ts`'s sealed no-edge corner, scheduled by the no-edge containment increment. Nothing in the tree pins the series today: `packages/record/test/signing-enforce.test.ts` asserts sidecar cardinality after exactly ONE refusing call |
| Double dissociation, half one: the signer-result memo | Signer invocations per refusing call 3 → 1; accumulation unchanged at 6, 7, 8, 9, 10, 11; put count and sidecar contents byte-identical to baseline | Refusing-call series rig, memo arm | Gone | The same file's signer-count pin, at the no-edge containment increment, which is the one that lands the memo |
| Double dissociation, half two: compensating removal | Accumulation zeroed — sidecar flat at 5; signer invocations unchanged at three per call | Refusing-call series rig, compensating-removal arm | Gone | None scheduled: the arm is rejected, so its figures pin nothing |
| Key-retirement reachability | A healthy, untampered, sealed signing record with `verifySignatures` reporting every transition verified; its decommissioned `keyRef` dropped from the verifier registry and a new one installed — the host-declared key lifecycle SPEC §14 names ("key distribution and rotation are host-declared"). `signatureLayerHolds` is fail-closed on an unresolvable `keyRef`, so every subsequent `finalize()` refused `chain-compromise`: sidecar 6 … 13 over eight calls, chain flat at 5, one orphan and three signer round-trips per call, permanently | Refusing-call series rig, baseline tree | Gone | None scheduled |
| Already-refused steady state | Unsealed record: call 1 LANDS the edge (chain grows by one, `transitionRef` present); the replayed state is now `refused`, outside the static three, so the deduped candidate list is four long; three further calls took the sidecar 5 → 8 at four signer invocations each | Refusing-call series rig, baseline tree | Gone | `no-edge-containment.test.ts`'s already-refused corner, at the no-edge containment increment |
| Candidate arithmetic | The sealed fixture yields THREE signer invocations per refusing call, not four: `sealed` is a `TransitionKind`, never a `RecordState`; `replay`'s `case 'sealed'` leaves `state` untouched, so the folded state is `confirmed` and the deduped list `[confirmed, open, confirmed, redeeming]` collapses to three. Confirms Finding F's "three, on the fixture above" | Refusing-call series rig, baseline tree — and readable from `packages/record/src/kernel/finalize.ts`'s candidate line | Rig gone; the reading from source is reproducible today | `no-edge-containment.test.ts`'s candidate-arithmetic pin |
| Read amplification | Twenty consecutive refusing `finalize()` calls on a sealed signing record: `layerVerdicts` (`packages/record/src/kernel/verify-signatures.ts`) fetched 5, 6, 7 … 24 rows through `listByRecord`, 290 cumulative, where a non-accumulating sidecar fetches 100; chain constant at 5 | Refusing-call series rig, baseline tree, counting rows returned by `listByRecord` | Gone | None scheduled |
| Compensating removal under concurrency, succeeding calls | Two concurrent SUCCEEDING `finalize()` calls, 100 trials: the entire signature set stripped from 94 of 100 legitimately confirmed, hash-intact records, each then taking a terminal compromise edge. An INDEPENDENT reproduction: 88 of 100 | Concurrency rig, compensating-removal arm; the reproduction was a separate measurement of the same shape | Both gone | None scheduled: rejected arm |
| Compensating removal under concurrency, refusing calls | Two concurrent REFUSING calls: 292 of 300 landed-but-unsigned | Concurrency rig, compensating-removal arm | Gone | None |
| Compensating removal on the batch path | The loser's failed CAS stripped three of the winner's four entries | Concurrency rig, compensating-removal arm | Gone | None |
| Shipped ordering, control | 0 across every control run — 0 of 400 on the concurrency rig | Concurrency rig, baseline tree | Gone | None scheduled as a concurrency pin; the ordering itself is pinned by `packages/record/src/signing/decorate.ts`'s header and the AL2 enforcement suite, not by this figure |
| Digest-keyed de-dup | Eager variant: an append reached the store with ZERO completed puts. Awaited-promise variant: the memo reached across seam calls and landed an UNSIGNED transition whenever the entry was absent at the second append, which `signatureLayerHolds` then condemned as compromise | Scratch fixture, digest-keyed arm, both variants | Gone | None: rejected arm |
| The three arms against the record project | Memo, compensating removal and admissibility precheck, each applied to the real tree: 60 test files / 737 tests / 0 failures, `tsc --noEmit` strict clean — identical to baseline | The record project itself (`./node_modules/.bin/vitest run --project record`), run on each arm | Arms gone. The baseline figure is reproducible and was re-taken at this record's writing: 60 files / 737 tests | None scheduled: the baseline is the suite itself, and the arms pin nothing |
| Read-chain / persisted-state divergence, shape (b) | A record persisted `confirmed` and terminal, the read chain's last `kind` rewritten `confirmed` → `refused`, length-preserving. Replay folds `refused`. Today the walk's `refused` and `open` candidates lose the state CAS, `confirmed` passes it, C3's `isCompromiseCarveOut` (`packages/record/src/store/semantics.ts`) admits the compromise-classed `refused` append against an expected `confirmed`, and the edge LANDS WITH a `transitionRef`. A bar predicted from the folded state returns ref-less and appends nothing | Divergence rig, on the current unmodified tree | The fixture is gone; the code it exercised is the tree's own | `no-edge-containment.test.ts`'s divergence pins, built FIRST at that increment under a binding STOP |
| Read-chain / persisted-state divergence, shape (a) | The same record with the last `kind` rewritten to `sealed`. Replay folds `open`, so a terminal-state rule does not even fire — and the walk still lands the edge, because C4 tests the backing's persisted `sealed` flag, about which a fabricated chain kind says nothing | Divergence rig, on the current unmodified tree | Same | Same |

**Why the two divergence shapes are the ordinary shape of a real tamper, not an exotic one.**
`appendChainCompromise` reads the chain the seam handed it; C3 and C4 are decided by the
backing against its OWN persisted row. On the server-SQL backing those are different tables,
verified against the current tree: `readChain` reads the `transitions` table, while
`appendTransition`'s gate reads the `records` row's `state`, `non_terminal` and `sealed` under
`FOR UPDATE` (`packages/store-postgres/src/postgres-store.ts`). A tamper that rewrites a
transition leaves the persisted state untouched, so the two diverge. The triggering tamper —
a length-preserving rewrite of the chain HEAD — is the base-level limit SPEC §5 states plainly
(the head transition "is protected only once a later transition chains over it") and the one
detached signing exists to catch, which is to say this defect's own population. **The corpus
cannot see it**: every corpus tamper is payload-only with kinds intact, and the divergence rig
was the first fixture anywhere to build either shape.

**The corpus census is WITHDRAWN and is NOT carried.** At filing time three figures were taken
over the record project's own compromise appends: 72 compromise-append calls, 64 landing the
edge, 68 making exactly one CAS attempt. They cannot all be true. The walk returns on the
first successful CAS and the shortest candidate list is three long, so a call makes exactly one
attempt if and only if candidate 0 lands — the one-attempt count is a subset of the landing
count and can be at most 64. The rig that produced them is gone, and a figure that cannot be
reconciled is withdrawn rather than corrected by inference. They may be re-derived only by
instrumenting `store.appendTransition` inside `appendChainCompromise`'s walk and reporting
three counts that reconcile with each other: total calls, calls landing at candidate index 0,
and calls that exhaust the list. Until that is done, the one census-derived claim this record
keeps is qualitative and follows from the arithmetic alone: on the corpus's compromise appends
the majority land the edge, so a compromised record touched again is on the already-refused
steady state above, and orphan minting is that state's ordinary behavior rather than a
sealed-record curiosity.

**The two sidecar-DRIVEN readers — the exception: reproduced against the current tree.**
`packages/record/src/signing/store.ts`'s `SignatureStore` contract says `listByRecord` returns
all of a record's entries "chain order not guaranteed", and that the caller correlates by
digest — "chain-driven, never sidecar-driven" (the two fragments sit on consecutive lines of
one doc comment). Two readers in this repository do the reverse, and both were driven against
the current tree under an injected, contract-legal orphan-first `listByRecord` ordering:

- `packages/record/src/probes/probes.ts`'s `signature-tamper-refuses` operator-assurance probe
  takes `entries[0]` from `listByRecord` with no chain correlation, in PRODUCTION source. Under
  the orphan-first ordering it tampers the orphan, the real signatures stay intact, the
  attacking `finalize()` succeeds, and the probe returns a **FAIL against a sound build** — the
  one verdict the operator-assurance tier exists never to produce.
- `packages/record/test/helpers/signing.ts`'s shared `breakOneSignature` uses the same
  positional idiom. Under the same ordering it tampers the orphan while BOTH of its guard
  assertions pass — the entry exists, and the tamper changed its bytes — so the fixture proves
  nothing and the test it serves goes green. Fourteen call sites in
  `packages/record/test/signing-enforce.test.ts` and `packages/record/test/redeem.test.ts`
  depend on it.

Both defects are LATENT today, not live: `MemorySignatureStore` iterates a `Map` in insertion
order, so the first entry is the genesis and both readers happen to pick a real transition.
Nothing pins that, the contract permits any order, and row 22 guarantees orphans are there to
be picked. The permanent pins — an orphan-first ordering under which the probe must still PASS
and the helper must still tamper a real entry — land as
`packages/record/test/sidecar-ordering.test.ts` at the sidecar-contract increment, which also
repairs both readers; neither is closed by the row-22 truth repairs.

## The zero-firing result

Compensating removal — sign, put, append, then remove the entry on an explicit
`appended: false` — was measured on two distinct shapes, and this record keeps them apart. On
two concurrent SUCCEEDING `finalize()` calls it stripped the entire signature set from 94 of
100 legitimately confirmed, hash-intact records and, in an independent reproduction, from 88 of
100, each stripped record then taking a terminal compromise edge. On two concurrent REFUSING
calls it left 292 of 300 landed-but-unsigned. The shipped ordering scored 0 across every
control run (concurrency rig and its reproduction, both gone; table above). That same arm — a
change measured to destroy the signature layer on the overwhelming majority of contended
records — **passed the full record project, 60 test files / 737 tests / 0 failures, with its
new branch instrumented by a raw `process.stderr.write` and counted at ZERO firings.** The
identical instrumented build emitted thirty firings against a one-off scratch fixture, so the
probe was sound and the zero is real: the corpus never once produces an `appended: false` on a
signing record through the decorator. Both firing counts were taken on the compensating-removal
arm, which is gone, and that one-off fixture is gone with it; no pin is scheduled for either
count — the no-edge containment increment counts its OWN branches' firings afresh, and its
counters do not ship either. The conclusion is stated explicitly because the investigation itself
then failed to honor it: **a green suite is a null result in this area.** The admissibility
precheck below was measured green against the record project and, on that basis, drafted as
the recommended containment — and was afterwards measured to suppress a compromise evidence
edge that lands today. "Ran the record project green" is not a safety claim for any change
on this path, and must never again be offered as one here.

## The containment inventory

Row 22's dilemma named two horns: horn 1, special-casing a path five call sites share; horn 2,
reopening the pinned sign-before-append ordering. Horn 1 was never real as stated —
`appendChainCompromise(store, chain, now)` receives no caller identity and none of its five
callers (`kernel/finalize.ts`, `kernel/decline.ts`, `kernel/seal.ts`, `kernel/redeem.ts`,
`kernel/findings-seams.ts`) passes anything distinguishing, so every candidate is a UNIFORM
change to one shared function; the real objection is blast radius. Horn 2 is real, but is
stated by its hazard rather than its mechanism: what is forbidden is any change that makes a
sidecar entry's survival conditional on the append's outcome. Horn 3, which the dilemma never
named: predicting C3's and C4's answers from the READ chain, which on this path failed
verification by construction, when the backing decides them against its own persisted row.

| Family | Horn | What it addresses | Verdict | Basis |
|---|---|---|---|---|
| Object-keyed signer-result memo — a `WeakMap` keyed by transition OBJECT identity, storing the signer's in-flight promise, with `put` still executed on every attempt | Neither. The put precedes every append exactly as before; only the signer call is memoized | 22b, the redundant signer invocations: 3 → 1 per refusing call on the sealed corner | **RECOMMENDED. Closes 22b.** Lands at the no-edge containment increment | Measured on the memo arm (gone): signer count 3 → 1, puts and sidecar contents untouched, record project green — which, per the section above, is necessary and not sufficient; the increment that lands it pins the signer count and the ordering directly |
| Chain-local admissibility precheck — bar the append when the folded chain state predicts that no candidate can land | **The THIRD horn.** Predicts C3 and C4 from a chain that failed verification, while both are decided against the backing's persisted row | 22a and 22b together — it would have zeroed both costs | **REJECTED.** Not in any increment. It is also a narrowing of SPEC §5's admission rule, which speaks of the record's current state, and so a code/spec divergence needing a sanction and a stated trade | Measured green against the record project on the precheck arm (gone), then measured on the divergence rig (gone) to SUPPRESS a compromise evidence edge that lands today, on both shapes, on a tamper the corpus contains no fixture for |
| Digest-keyed de-dup — memoize on `transitionDigest` instead of object identity | ON horn 2. The pinned invariant is that a given append is preceded by its OWN completed sidecar write; a digest key weakens that to "some earlier signing for this digest occurred" | 22b | **REJECTED.** Measured, not argued | Eager variant let an append reach the store with zero completed puts; the awaited variant landed an unsigned transition across seam calls (digest-keyed arm, gone) |
| Compensating removal — sign, put, append, remove on `appended: false` | ON horn 2 by hazard while obeying it by mechanism, which is why the mechanism-shaped wording of horn 2 failed | 22a | **REJECTED, and must never land in any variant.** Unrepairable: the sidecar is content-addressed and the signature scheme deterministic, so racing writers write byte-identical entries under one key and a "remove only what I wrote" guard has nothing to discriminate on | The concurrency figures above (gone), and the zero-firing result |
| Deterministic `at` — stamp the `refused` transition with a fixed or derived instant so repeat calls upsert one key | Neither horn | 22a | **REJECTED**, against the fidelity principle: `at` records when the refusal was observed, and a manufactured instant is a record of something that did not happen | Reasoned, not measured — and said so |
| A failure-reason field on the Store contract — let `appendTransition` tell the decorator why a CAS lost so it can decide about the entry | Neither horn as such | 22a | **REJECTED**: needs an edit to the frozen Store contract and the sealed set behind it, for which no sanction exists | Reasoned, not measured — and said so |

What survives for 22a is honest delegation rather than prevention: the `SignatureStore`
contract will state that orphans exist and are safe to prune when no chain transition
references them (the sidecar-contract increment), and 22a stays open on the third horn with
its trigger re-derived (the no-edge containment increment).

## What this investigation did NOT establish

- **Behavior on a durable `SignatureStore` backing.** `MemorySignatureStore` is the only
  implementation anywhere in the tree, so no other measurement was possible. This is a
  coverage bound, not a mitigation: the durable case is where unbounded growth and the growing
  per-call read would actually matter, and it is exactly the case that could not be measured.
- **Any latency figure, anywhere.** The signing cost is an invocation count. Nothing was timed.
- **Any cross-process concurrency.** Every concurrency measurement — the compensating-removal
  figures and the shipped-ordering control — ran in-process against the in-memory backings,
  never cross-process against a shared Postgres.
- **A pin for the read-chain / persisted-state divergence.** It WAS measured against the
  current tree, but it is pinned by NO fixture in it: both shapes — the length-preserving
  last-element `kind` rewrite to `refused`, and its `sealed` sibling folding to `open` — were
  built on a scratch tree that no longer exists. The no-edge containment increment is what
  lands them as permanent pins, and until it does the divergence is a measured claim with no
  gate behind it.
- **A reconciled corpus census.** Withdrawn above; the re-derivation method is stated there.
- **Whether the two reader defects are reachable by any real flow.** The orphan-first ordering
  was injected; no deployment producing it was demonstrated, host `ProbeDriver` shapes were not
  enumerated, and a driver returning a shared durable sidecar was not modelled.
- **A steady wall clock.** In roughly one run in twelve on the refusing-call series rig, two
  consecutive refusing calls landed in the same millisecond, their `at` stamps coincided, and
  two orphans collapsed into one upsert — a flake in the measurement, not in the defect, and
  the reason the series figures are read as "one fresh orphan per distinct millisecond" rather
  than per call without qualification.
