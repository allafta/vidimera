# Step-1 whole-branch review

**What this document is.** A six-dimension review of the 43 commits that adopted this
repository's kernel (`packages/record/src`) from a reference implementation and brought it
under test, at the point the branch's own remediation plan
(`docs/superpowers/plans/2026-08-03-step-1-remediation.md`) was written. Six independent
readings of the branch — **comment-fidelity** (compared ~133 rewritten comment blocks against
their pre-scrub originals and checked every re-pointed SPEC citation), **done-criteria**
(re-ran and independently re-derived every "definition of done" criterion), **code-review**
(read all 23 kernel source files and probed behavior directly against a scratch build),
**claim-audit** (independently re-verified every priority claim in the branch's own execution
ledgers by executing code, not by trusting the ledger's prose), **outstanding-risk** (asked
what a cold future reader would be told versus what is actually true), and
**spec-conformance** (read all 1,241 lines of `docs/concept/SPEC.md` and all 23 kernel source
files, then proved eleven behaviours empirically by running vitest against the branch's real
source) — found six risks that a flat list would present as six unrelated bugs. **This
document organizes them by cause instead, using the three-class framework the remediation plan
adopted, because treating them as one list fixes symptoms while leaving the cause in place.**

**A note on how this document was assembled.** The spec-conformance reading was originally
truncated out of the scratch file it was recorded in, so the version of this document first
committed at `ab412e6` carried the other five dimensions' findings in full and named
spec-conformance only in the paragraph above, with nothing attributed to it downstream — an
honest gap, not a claim that the reading never happened. It has since been recovered in full
(12 findings, its methodology note intact) and is folded into the sections below: most of its
findings strengthen or corroborate what the other five dimensions already surfaced (marked
where that happens), one contradicts this document's own prior reasoning outright (adjudicated
explicitly below, not silently resolved), and several are new — genuine mismatches between
shipped code and the sealed SPEC that none of the other five dimensions caught, recorded in a
fourth class because the existing three do not describe them. One further recovered item needs
no new tracking: the stale `README.md:36` status line ("currently red") it flagged is already
on the exit-record unit's own to-do list
(`docs/superpowers/plans/2026-08-03-step-1-remediation.md`, unit R5 — which records it as
having been fixed by a housekeeping sweep ahead of R5 running), and the scan does exit 0
(`node scripts/contract-scan.mjs`).

As of this writing, none of the remediation plan's fix units (R2 apply-the-INHERIT-list, R3
citation repair, R4 the one genuine Class-B defect, R5 the exit record) have run. The
provenance audit that feeds R2 is tracked separately at
`docs/process/adopted-source-provenance.md`; this document is the review that motivated it.
The findings folded in below from spec-conformance are not yet reflected in R1–R5 or in
`docs/process/deferral-register.md` either — reconciling them into those documents is future
work, outside what this document does.

## Terms

Same as the companion provenance document: **the kernel** is `packages/record/src`; **base**
(short hash `c0f0f75`) is the reference-project commit this kernel was adopted from; **head**
(short hash `c688ce4`) is that project's later commit, five increments ahead, that the audit
diffed against; **SPEC §N** is a section of this repository's own normative
`docs/concept/SPEC.md`. The reference project is never named, per this repository's
standalone-contract rule.

---

## Class A — bugs the reference had already fixed, adopted anyway

`MemoryStore` (`packages/record/src/store/memory.ts`) aliases store-internal state at four
sites — `readChain` (`:295`), `putStaged` (`:160`), and both append paths (`:236`, `:281`) —
and the reference project had fixed **all four** at its own head. This repository took base
and inherited its defects. The full, ranked account — what each defect is, why the 218 tests
in this repository do not catch it, and the fix — lives in
`docs/process/adopted-source-provenance.md`; it is not repeated here. What belongs in *this*
document is **why it happened**, because the cause generalizes beyond these four sites.

**Base-file-first was a deliberate, verified-correct policy — for tests.** The branch's own
execution ledger records the reason directly: this repository's `construction-validation.test.ts`
carries all ten `assertGoverned` construction-guard test blocks the reference project's base
commit had (`captureMode`, `legs`, `sod`, `proposer`, `requiredConsultations`, `freshness`,
`requiredAcks`, `ackMode`, `eligibility`, `policySource`). The reference project's own later
head keeps only three of those ten intact as standalone field tests
(`captureMode`/`requiredAcks`/`ackMode`) plus one precedence test — of the seven **per-leg**
guard tests specifically, head retains two and silently drops five
(`sod`/`proposer`/`requiredConsultations`/`freshness`/`eligibility`/`policySource`, minus the
one folded into the precedence test). *(The branch's own ledger states this as "head retains 2
of the 7" without saying which 7-of-what; the correction above — 7 of a full 10, with the
denominator stated — is worth carrying forward if this number is ever repeated, since an
unstated denominator is exactly the kind of imprecision Class C below is about.)* Had this
repository taken head's test files instead of base's, five construction-guard tests this build
step depends on would have silently disappeared. Base-file-first was necessary to avoid that.

**The same preference, applied to *source* rather than tests, means inheriting defects the
reference project already fixed.** Source and tests are not symmetric: a test file dropping
coverage is a silent *loss*, invisible until something regresses; a source file at an older
commit can carry a live *defect*, immediately present. The policy that correctly protected the
test suite from the first failure mode exposed the source tree to the second.

**Why the `readChain` case is the sharpest instance.** `readChain` is declared on the frozen
**agent** handle (`agent-surface.ts:26`). SPEC §9's human-anchor principle rests on "holds
against an agent that can reach only the agent handle" — a claim about what the agent *cannot
do*, not what it is denied by permission. Aliasing defeats that claim differently than a
missing check would: the agent is never asked to do anything it isn't allowed to do; it is
simply handed a live reference by a call it is entitled to make. Against a freshly opened
record, SPEC §5's own acknowledged AL1 blind spot (a non-recomputing edit to the chain's
**last** transition is undetectable until a later transition chains over it) means a forged
edit through this path verifies `{intact:true}` — permanently, for a single-transition record.

**This project had never diffed adopted source against the reference project's later head
before the audit that produced `docs/process/adopted-source-provenance.md`.** That audit is
what closed the gap; this review is what established the gap needed closing.

**The recovered spec-conformance dimension corroborates the `readChain` half of this with
direct execution, not just a base-vs-head diff.** It ran two probes against the real
`MemoryStore`: append a genesis transition, read the chain back, then mutate the returned
transition's own payload — a second `readChain` call returns the tampered value, proving the
aliasing at `store/memory.ts:295` (`return existing ? [...existing.chain] : [];`, a shallow
spread that still shares every `Transition` object with the store's own array) reaches stored
state, not just the caller's copy of the reference. SPEC §12 is unambiguous
(`docs/concept/SPEC.md:1092-1094`): "All reads return **fresh values** — a caller mutating a
returned chain, head, or staged draft can never corrupt store-internal state." `getStaged`
already has a test pinning exactly this guarantee (`store-constraints.test.ts:130-160`, added
alongside its own `structuredClone` fix); nothing equivalent exists for `readChain` — the same
SPEC sentence covers both reads, and only one of them is tested.

**The same base-vs-head pattern extends to a fifth confirmed site the recovered dimension
independently rediscovered: `open()` never re-checks a staged draft's `legId` against the
profile it resolves under (`kernel/open.ts:99`).** SPEC §8's registry entry for `unknown-leg`
(`docs/concept/SPEC.md:495`) names two producers — "a caller-named leg absent from the profile
at `stage()`, and a staged draft's leg absent from the profile it resolves under at `open()`."
Only the first is wired (`kernel/stage.ts:50-57`, `legExists` checked against `profile.legs`
before any `putStaged`); the second is not — `open()` copies `staged.legId` straight into the
genesis payload with no check at all. **This is not merely anticipated — it is R1's own
confirmed INHERIT item 5** (`docs/process/adopted-source-provenance.md:188-239`), diffed and
ranked "important" alongside the four aliasing sites above: the reference project's later head
carries the check, this branch's base commit did not, and this repository inherited the gap the
same way it inherited the four `MemoryStore` aliasing defects. R1's own account gives the
concrete consequence: a profile's leg renamed between `stage()` and `open()` (two `create()`
instances sharing one Store, or a redeploy with an outstanding `stagedRef`) mints a record
anyway, and `kernel/finalize.ts:107-113` then throws its loud legId error on every attempt to
decide it, forever — an unrecoverable, permanently-held `(profile, subject)` pair under
`expiry: 'none'`. The recovered spec-conformance dimension reached the identical file:line and
the identical consequence independently — by reading SPEC §8 and probing the running kernel,
not by diffing source against the reference project's head — and adds proof by direct
execution rather than by diff: it staged a draft under one profile shape, constructed a second
instance sharing the same `profileId` with the leg renamed, called `open(stagedRef)` against
it (the record opens), and confirmed `finalize()` then throws on the persisted-legId mismatch,
exactly as R1's fix note predicts. Two independent methods — a base-vs-head diff and a
SPEC-read-plus-execution probe — converged on the same defect from opposite directions; that
convergence is itself evidence this is a real gap, not an artifact of either method.

---

## Class B — step-1 scope boundaries, misreported as defects

Two findings from the review's dimensions describe things that look, in isolation, like bugs.
They are not: they are the visible shape of capability this build step has not reached yet,
and one dimension's report did not carry that context forward. **These get recorded, not
fixed** — except for one genuine defect hiding inside them, which the remediation plan's R4
unit fixes on its own.

**`finalize()` has no `opts` parameter.** `packages/record/src/operator-surface.ts:28-33`
declares `finalize(recordId, identity, content, facts)` — four parameters, no fifth. One
review dimension flagged this as an important finding: a plain-JavaScript caller's fifth
argument is silently dropped, exactly the failure mode `open()`'s own unexpected-key guard
(ruling D4, `kernel/open.ts:65-69`) was built to close, and SPEC §10.3/§11.1 both describe
throws that only an `opts` parameter could carry (a policy-declaring profile's mismatched
`opts.policy`, a reserved-kind consultation input at argument intake). Read in isolation, this
looks like the same gap D4 already closed for `open()`, left open for `finalize()`. **It is
not that gap.** `opts.consultations` and `opts.policy` are the vessels for capabilities that
arrive at future build steps — consultations and policy-drift notarization are steps 5 and 6
respectively — and every profile field that would let a host *reach* either
(`requiredConsultations`, `policySource`) already throws `GOVERNED` at construction
(`config.ts:131-137`, `:191-198`). There is no profile in this build under which the missing
throw could ever fire, because there is no way to construct one that needs it. This is
recorded as a deferral-register entry with a real trigger (the build steps that ship
consultations and policy), not built now.

**Correction: that "unreachable" claim holds for only half of SPEC's throw requirement, and
the recovered spec-conformance dimension's fuller citation shows the other half fires today.**
SPEC §10.3 states the throw in both directions (`docs/concept/SPEC.md:823-825`): "On a
policy-declaring profile, finalize **throws** when `opts.policy` is absent, and on a
**non-declaring** profile it throws when `opts.policy` is **present**." The paragraph above
verified only the first direction is unreachable — no profile can declare `policySource`, so
the "declaring-without" throw can never have a subject. It did not check the second: because
**every** profile in this build is non-declaring, "a non-declaring profile supplied
`opts.policy`" is not a future case at all — it is true of every profile that exists today, and
SPEC requires finalize to throw on it. The same asymmetry holds for consultations: SPEC §11.1
(`docs/concept/SPEC.md:934-938`) says an `opts.consultations` entry naming a reserved kind
(`facts` or `chain-verify`) "is a caller error that throws at argument intake... before the
chain is loaded — never a refusal," a rule about the *shape* of what the host passes in, gated
on nothing profile-related — the attach form itself "is always available"
(`docs/concept/SPEC.md:906-907`), independent of whether the profile declares
`requiredConsultations`. Because `finalize()` has no `opts` parameter at all, neither throw can
fire: a fifth argument is dropped by ordinary JavaScript parameter elision, never inspected. The
recovered dimension proved this by execution (its Probe F): calling the real operator handle's
`finalize()` with a fifth argument carrying both `{ policy: { digest: 'sha256:whatever' } }`
and a reserved-kind consultation entry returned `{"status":"ok","state":"confirmed"}` — no
throw, both conditions silently discarded. **Adjudication:** this document's original
"unreachable" framing was incomplete, not wrong about what it checked. The *feature* — actually
gating on a required consultation's verdict, actually comparing a policy digest — is genuinely
unbuilt and correctly stays Class B, exactly as argued above. But the *caller-misuse throws*
quoted here do not depend on that feature existing; they are guard rails against a host passing
something the library cannot yet honor, the same category of guard `open()` already has under
ruling D4. That portion is live and reachable on every profile in this build today, and is
recorded under Class D below rather than folded into this paragraph's "not built now"
conclusion.

**The success batch is three sequential appends, not one atomic batch.**
`kernel/finalize.ts:196-249` performs three separate `store.appendTransition` calls (the
chain-verify consultation, the facts consultation, the `confirmed` transition) under an
explicitly stated "single-writer, no-concurrent-finalize-per-record" bound
(`finalize.ts:32-35`). SPEC §9's ladder rung (6) and SPEC §12 both describe this as one atomic,
variable-arity `appendBatch` call — "all-or-nothing … so a conflict never leaves a partial
tail." One dimension demonstrated this concretely: two concurrent `finalize()` calls against
the same record, staggered so the first's chain-verify consultation lands before the second's
call starts, produce a durable orphaned `chain-verify` consultation on a still-open record and
a `record-not-open` refusal for the caller whose work is actually sitting in the chain. **This
is not a bug in the sequential implementation — `appendBatch` is a Store method this build's
`Store` interface (`store/store.ts:53-82`) does not declare at all.** There is no atomic
primitive to call. This is Class B's largest item, and it is what closes when Store v2 lands
(build step 2) — recorded as a deferral-register entry with that trigger, not fixed now.

**The recovered spec-conformance dimension pins the exact SPEC language and reproduces the
race by execution, independently.** SPEC §9's ladder rung (6)
(`docs/concept/SPEC.md:591-593`): "the success batch: one atomic, variable-arity
`appendBatch([chain-verify, facts, …obtained consultations, confirmed])` — all-or-nothing, so a
conflict never leaves a partial tail"; SPEC §12 (`docs/concept/SPEC.md:1043-1045`) repeats it as
a store-contract obligation; SPEC §2.1 (`docs/concept/SPEC.md:216-218`) assumes it in the
worked example's shared `at`. Its probe — a `Store` that yields a microtask inside
`appendTransition`, two `finalize()` calls staggered so the first's chain-verify append lands
before the second call starts — returned exactly the shape already described above: the first
call `{"status":"refused","code":"record-not-open"}`, the second
`{"status":"ok","state":"confirmed"}`, and a final chain carrying an orphaned `chain-verify`
consultation the replayed record's own `consultations` list still reports. This is independent
corroboration of the same finding by a sixth reading, not a new defect. Neither this document
nor the recovered dimension found the gap recorded in `docs/process/deferral-register.md` —
only in this remediation plan's own R4 "Record" list and a roadmap line in the adoption plan
(`docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md:1243`).

**The missing `appendBatch` is one symptom of a wider gap the recovered dimension frames more
completely: this build's `Store` implements five of SPEC §12's nine described methods.** Absent:
`appendBatch`, `findNonTerminal`, `listDue`, `seal`, and the `meta = { nonTerminal, dueAt? }`
shape (shipped as a bare boolean, `store/store.ts:68-72`). Two of the absences are load-bearing
beyond the atomic-batch question already discussed. `findNonTerminal` is "the re-emit binding
that makes `record-exists` actionable" (`docs/concept/SPEC.md:1082-1083`) — the shipped
`refused('record-exists')` carries no locator at all, so a host cannot act on it without its own
out-of-band lookup for the blocking record. And without `listDue`, SPEC §12's operator sweep
(`docs/concept/SPEC.md:1099-1103`) cannot exist as described — a due record resolves only
opportunistically, when some unrelated `open()` or `finalize()` call happens to touch the same
`(profile, subject)` pair. Both are already implicitly acknowledged in this remediation plan's
own R4 "Record" list ("the shipped `Store` is 5 of 9 of §12's surface... Trigger: build step 2,"
`2026-08-03-step-1-remediation.md`, R4's "Record" list); the spec-conformance dimension's contribution is
the concrete behavioral consequence of each absence, not the inventory itself.

**The one genuine defect inside Class B: the mid-batch conflict mapping is wrong.**
`kernel/finalize.ts:208, 222, 246` map *any* failed append in the success batch to
`refused('record-not-open')`, without inspecting `AppendResult.conflict`. SPEC §8 defines
`record-not-open` as "a decision-progress seam invoked against a non-open, non-expired
record" — but a mid-batch conflict fires precisely when the record's chain moved out from
under this call while it was *still open*, the opposite of what the code claims. This is real,
independent of whether the batch is ever made atomic, and it is not excused by the
single-writer bound (the mapping is wrong on its own terms even as defensive code for a
residual race). **This is the one item Class B does not merely record — the remediation
plan's R4 unit fixes it**, either by narrowing the mapping to genuinely mean
`state-mismatch` → an invariant-violation throw, or by choosing a code that is actually true of
the record's state, pinned with a new test.

**Adjudication (added after R4 ran; the finding above is left exactly as it was written).**
The defect is real and R4 fixed it, but **both halves of the reasoning above were overturned
by the work they prompted**, and neither is this repository's position. They are left standing
because this is a dated review record — but a reader must not carry them forward.

*The §8 inference.* The quotation is verbatim; what is drawn from it is not. §8 does not settle
this case at all, and its silence is structural rather than an omission: SPEC's own finalize
cannot produce the situation. §9's rung (6) is "one atomic, variable-arity" `appendBatch` whose
conflict "never leaves a partial tail", and §12's batch "aborts the whole transaction with
nothing applied" — so a mid-batch conflict with landed appends exists **only** where a build
substitutes sequential appends for that rung, as this one does. What is actually wrong with the
old return is therefore not a SPEC verdict but misrepresentation: a never-appends code carrying
no `transitionRef` tells a host that nothing was recorded, when consultations had landed.

*"While it was still open."* This is false of the shipped Store, and in the opposite direction
to what the paragraph assumes. `nonterminal.ts` makes `open` unconditionally non-terminal, so
`store/memory.ts`'s C3 arm cannot fire against an open record and its state CAS is the only
producer of `state-mismatch` at those appends — a genuine one therefore means the record is
**not** open.

*What R4 actually shipped* is neither of the two options this paragraph offered: a loud throw
naming the conflict shape and what the call had already appended, grounded in the fault (no
conflict is reachable there under this build's single-writer bound and a compare-and-swap-
honouring Store, so reaching one is a storage fault) rather than in any inventory of which
codes are true. Two earlier attempts to ground it by enumerating the union were each
constructibly false at the edges. The durable form lives in `kernel/finalize.ts`'s
`midBatchConflict` and in `docs/process/deferral-register.md` row 12; the exit record
(`docs/process/implementation-status.md`) summarizes it.

**Two smaller items the recovered dimension raised turn out to already be handled.** The
`redeem` configuration block is accepted at construction even though redemption itself is
entirely unimplemented (`config.ts:171-213`) — which looks, on SPEC §9.1's own words ("a
profile the build cannot honor **throws**," `docs/concept/SPEC.md:643-647`), like a
construction-loudness violation. It is a **named, deliberate exception**, not an oversight:
ruling D6 and deferral-register entry 9 already record that a confirmed effect-seam record's
`(profile, subject)` pair "STAYS PERMANENTLY HELD" until a later build step's redemption
edge (SPEC §11.2) or `confirmToRedeem` expiry edge (SPEC §9.1), and that `redeem()` throws
loudly at the seam instead of silently refusing. *(This sentence originally named `seal()`
as one of those edges, faithfully describing what D6 and entry 9 said at the time. R3's
citation audit established that `seal()` is not a release path — SPEC §12 admits it only
against a derived-terminal record, and SPEC §2 makes this record non-terminal — and
corrected both. The description above is updated to match the documents it describes; the
finding itself is unchanged.)* The recovered dimension reached the same construction site independently and flagged
it "because the assignment asks for divergences to be named... not because the ruling is
undocumented" — its own words concede this is corroboration, not a new gap. Separately,
`Outcome`'s `unavailable` branch (`outcome.ts:16-24`) is typed to carry a `code: RefusalCode`,
but SPEC §8 (`docs/concept/SPEC.md:476`) names the single member of that class `availability` —
not currently a member of the shipped `RefusalCode` union, so `unavailable` is unconstructible
as specified. Nothing is wrong at runtime (no producer of `unavailable` exists in this build),
and the adoption plan already flags the eventual widening as ADR-grade
(`2026-08-02-reference-implementation-adoption.md:1255`); this is recorded here as a second,
independently-reached confirmation that the scaffolding is inert, not load-bearing.

---

## Class C — gates that certified less than they appeared to

The branch's U9 unit scrubbed roughly 299 comments that pointed at the reference project's own
internal design documents, task numbers, and open-question ledger — none of them resolvable by
a reader of this repository — replacing each with a citation into this repository's own
`docs/concept/SPEC.md` or `DECISIONS.md`. The review sampled ~133 of those rewritten blocks
(about 44% of the ~299) and independently opened every citation rather than trusting it.

**The headline number: about 22 of 133 sampled blocks (≈17%) carry a defect, and 8 of those
are citation defects** — the cited section does not contain what the comment attributes to it.
The eight:

1. **`SPEC §5 "Chain integrity"`, 3 sites** (`chain/replay.ts:153`, `test/chain-verify.test.ts:1`,
   `test/replay-verify.test.ts:1`). `git grep -n "Chain integrity" -- '*.md'` returns **zero**
   hits in any tracked markdown file. It is the reference project's own internal design
   document's §5 title, carried across when the scrub swapped `design §` for `SPEC §` and left
   the quoted heading untouched — exploiting the coincidence that the section number is 5 in
   both documents. SPEC §5's real bold lead-ins are "Operator audit functions," "Honesty about
   hash chains," "Mandatory pre-seam chain-verify," and "Chain retirement."
2. **`bound` "names which expiry clause fired," 3 sites** (`kernel/expiry.ts:65`,
   `chain/replay.ts:62-63`, `chain/replay.ts:125-126`), citing SPEC §4. SPEC §4's own payload
   table (`docs/concept/SPEC.md:322`) says the opposite: "`{ bound }` — the elapsed deadline
   timestamp; the transitioned-from state, **not the payload**, distinguishes the `expiry`
   clause." The claim is inherited from the reference project's own base commit — the scrub's
   contribution was re-pointing it at the exact section that contradicts it, turning a dangling
   pointer into a confidently wrong one. (Full detail, including the fix text, is in
   `docs/process/adopted-source-provenance.md`, items 8-9.)
3. **`store.ts:23` and `:48`, "verbatim union" / "verbatim interface."** `AppendResult` is
   annotated "SPEC §12's constraints, verbatim union" and `Store` "SPEC §12, verbatim
   interface." SPEC §12 contains neither a TypeScript union nor an interface, and says the
   opposite outright: "method signatures are unstable while 0.x … the contract is the
   *behaviour* each method guarantees, not its argument list." The shipped interface is a
   strict **5-of-9-method subset** of what §12 describes (no `appendBatch`, `findNonTerminal`,
   `listDue`, `seal`), with a different `appendTransition` signature. A reader trusting
   "verbatim" would conclude the adapter contract is fully implemented; it is not.
4. **`store.ts:54`, the branch's own fix is missing from the doc it should appear in.**
   `putStaged` is documented on the `Store` interface as only "Idempotent by `staged.id`" —
   it does not say first-write-wins is required, even though this repository's own
   `MemoryStore` implements first-write-wins and `test/store-constraints.test.ts:122-127` pins
   it as a hard requirement. The fix landed in the implementation's comment
   (`memory.ts:153-156`) but never propagated to the public interface a third-party adapter
   author actually reads. (This is the same gap as provenance-audit item 6 — the two documents
   describe the same finding from different angles; neither repeats it as a second, independent
   defect.)
5. **`memory.ts:114-120`, a misattributed quote broader than the section it names.** A quoted
   sentence about the compromise carve-out is attributed to "SPEC §12's C3," but that text is
   the reference project's own design document's wording; SPEC §12's actual C3 is narrower (it
   names only terminal `confirmed`, with no `redeeming` arm — SPEC §5 explains why:
   `redeeming` is non-terminal and needs no carve-out). Harmless at runtime — the gate only
   fires when the record is genuinely terminal — but a reader opening §12 will not find the
   quoted sentence there.
6. **`store.ts:4`, a quoted phrase not in the cited section.** "PUBLIC BUT EXPLICITLY UNSTABLE
   PRE-1.0 (SPEC §12: 'public, explicitly unstable pre-1.0')" — §12's actual wording is "The
   interface is **provisional pre-1.0**." The quoted phrase was the reference design document's
   own heading.
7. **`nonterminal.ts:10-11`, "verbatim formula" pointed at a section with no formula.** SPEC
   §2's bold run "States and terminality" does exist, but §2 states terminality in three prose
   bullets, not as an expression — the reference project's original correctly cited its own
   design document for the literal formula.
8. **`canonical.ts:20-21`, the same fabricated-title pattern a second time.** `SPEC §7 "Digest
   agility"` — §7's actual title is "Digest identifiers & agility," with no bold run reading
   "Digest agility." Lower-impact than finding 1 (§7 genuinely does discuss agility), but the
   quotation marks are unearned in the same way.

**Beyond the eight**, the same sampling pass found roughly a dozen further, lower-severity
issues that round the sample out to ~22 of 133: 15 surviving lines of foreign-numbering labels
across 6 files (`M-B`, `O1`, `O3`, `S-4`, `design/brief`) that escape all four of
`contract-scan`'s regexes because none of them match `design §`/`slice N`/`Task N`/`OQ N-N`;
one inherited claim about `verifyChain`'s honesty limit that the re-pointing made *more* wrong
than the original (it claims a mutation to any transition's own `prevHash` field is
undetectable, when in fact `verifyChain` compares every stored `prevHash` against a recomputed
digest and only a non-`prevHash` edit to the chain **head** is genuinely blind); one stale
"future" reference in `config.ts:73-74`'s `governedUnavailable` docstring naming `redeem()`'s
capability throw as a future consumer, three commits after that throw actually shipped; and one
section misattribution (`config.ts:81-82` cites SPEC §9.1 alone for `reverify`, which is
actually a §9.2 field).

**Why this matters beyond the individual defects.** `contract-scan.mjs` validates four
syntactic regexes; it has never checked that a citation *resolves*. This is the **third**
blind spot of the same shape found on this branch: exit-0 said nothing about provenance (a
green scan does not mean the reasons in a comment survived a scrub — see done-criteria's own
finding that a bulk-deletion could have produced the same green result); raw-count comparison
said nothing about content (a scan total moving from 314 to 299 could hide an equal-sized
regression in the opposite direction — this happened once, mid-branch, and was caught only by
diffing output rather than totals); and now, syntax says nothing about reference integrity — a
citation can be perfectly well-formed (`SPEC §5 "..."`) and still name a document that does not
say what it is quoted as saying. The remediation plan's R3 unit closes this specific blind spot
by extending `contract-scan.mjs` with a citation resolver: for every `SPEC §N` or
`DECISIONS.md` reference in tracked TypeScript, confirm the section exists; for every *quoted*
title or phrase attached to one, confirm the quoted string actually occurs in that document.

---

## Class D — genuine mismatches the recovered dimension found that the other five did not

Neither Class A, B, nor C describes what the items below are. They are not step-1 scope
boundaries — nothing gates them behind a future build step; each is reachable through calls
this build already exposes, today, on profiles this build can already construct. They are not
citation defects either — the code runs the wrong way, not merely cites the SPEC wrong. Per
this review's own instruction that a genuine mismatch between shipped code and the sealed SPEC
gets its own class when the existing three do not fit: this is that class. Most items below are
marked `[minor]` by the dimension that found them — none is a security hole — but each is a
live divergence between what SPEC says the library does and what it actually does, not a
documentation problem or a deferred feature.

**`finalize()` accepts, and silently drops, two caller-misuse conditions SPEC requires it to
throw on.** Carried forward from the Class B correction above: a non-declaring profile supplied
`opts.policy` (SPEC §10.3 — every profile in this build is non-declaring) and any
`opts.consultations` entry naming a reserved kind (SPEC §11.1 — gated on nothing
profile-related) must both throw, at profile resolution and at argument intake respectively.
Because `operator-surface.ts:28-33` declares no fifth parameter, a caller's fifth argument is
dropped by ordinary JavaScript parameter elision — never inspected, never thrown on. Proven by
execution (the recovered dimension's Probe F): a real `finalize()` call carrying both
conditions returned `{"status":"ok","state":"confirmed"}`. **Fix:** add
`opts?: Record<string, never>` to `finalize`'s signature (matching `OpenOptions`,
`config.ts:234`) and sweep its own keys at the top of `kernel/finalize.ts`, throwing via
`governedUnavailable` with the lifting section named per key — the same shape `open()` already
ships under ruling D4. Not currently in the deferral register under this framing (the existing
Class B entry covers the *feature*; the throw is a distinct, separately-reachable obligation).

**`redeem()`'s stub returns the wrong registry code on three reachable paths.**
`kernel/redeem.ts:39-70` refuses `unredeemable-state` unconditionally except for one carved
exception (a confirmed effect-seam record, which throws — deferral entry 9, corroborated
above). SPEC §8 scopes `unredeemable-state` to "the domain outcome on a pure-capture profile
for an **intact-chain, known-profile, valid-leg** call" (`docs/concept/SPEC.md:496`) — three
qualifiers the stub does not check. **(a)** A `recordId` resolving under a profile this
instance does not configure draws `unredeemable-state` instead of the fail-closed
`unknown-profile` every other seam in this codebase uses for the identical condition (Probe G).
**(b)** A tampered chain also draws `unredeemable-state` instead of `chain-compromise` —
`redeem()` never calls `verifyChain` at all, unlike every other operator-side mutating seam
(SPEC §5's "mandatory pre-seam chain-verify," `docs/concept/SPEC.md:399-400`; Probe H, which
tampers a stored transition and confirms `redeem()` still returns `unredeemable-state` rather
than surfacing the tamper). **(c)** A non-existent `recordId` draws a refusal rather than the
throw SPEC §8 requires of every operator call on a record that does not exist
(`docs/concept/SPEC.md:507-508`; Probe I) — this one is already acknowledged in the module's own
header comment (`redeem.ts:18-21`), so it is a registration gap more than a fresh discovery.
Mitigating factor common to all three: `redeem()` appends nothing on any of these paths, so
every outcome stays fail-closed — only the reported code is wrong. **Fix:** resolve the profile
fail-closed first, run `verifyChain` before the state test, and throw (not refuse) on an empty
chain; register (c) explicitly if it stays a deliberate choice rather than becoming a throw.

**A malformed `terminalRefusals` entry is accepted at construction and silently does
nothing.** `config.ts:29` types `terminalRefusals` as `RefusalCode[]` but never validates the
array's members at runtime. SPEC §9.1 (`docs/concept/SPEC.md:643-647`) requires "inert or
contradictory feature combinations" to be construction errors. A typo — `content_drift` for
`content-drift` — constructs without error (Probe J), and `appendsOn`'s `.includes()` check
(`refusal-codes.ts:91`) can then never match it: the operator believes a code is configured
terminal for a leg, and the record silently stays open on that refusal instead. **Fix:**
validate every `terminalRefusals` member against the `CORE` registry's keys inside
`validateLeg` (`config.ts:100`), one loop, consistent with the existing stray-redemption-key
check at `config.ts:89-97`.

**Two further items are genuine code/SPEC mismatches, but each has a plausible reading under
which the SPEC prose, not the code, is what needs to change.** Both are held for the owner
rather than filed as plain code defects, and are listed in full at the end of this document
under "Findings that need a sealed `docs/concept/` decision" rather than repeated here.

---

## Four defects found and fixed during the work

Unlike the items above, these four were caught and closed while the branch was being built —
they are already in the code, not pending. **None of them failed a build.** Recording what
caught each is worth as much as recording the defects themselves, because three different
mechanisms did the catching and none of them was "a gate went red."

### 1 — `resolveCanonicalizer`'s prototype-chain fail-open

**What it was.** During the kernel import, an instruction (not the reference project's own
code) replaced the reference's `if (!Object.hasOwn(registry, ref)) throw` with `const c =
registry[ref]; if (c === undefined) throw` — believed to preserve the same message and the
same behavior. It preserved the message; it inverted the behavior. `registry[ref]` walks the
prototype chain, so a canonicalizer reference naming an inherited `Object.prototype` member —
`toString`, `valueOf`, `constructor`, `hasOwnProperty` — resolves to that inherited function
instead of throwing. The severity is worse than "a bad reference resolves": `toString` as a
canonicalizer collapses **every** content object to the literal string `"[object Undefined]"`
before it is hashed — every record built under such a profile would share one content digest,
regardless of actual content.

**What caught it, and what did not.** It passed two independent reviews and five separate gate
runs — `typecheck`, `lint`, `contract-scan`, and CI on Linux, across the commits between its
introduction and its discovery — none of which exercises the kernel's own runtime behavior.
It was caught only when the reference project's own inherited base test corpus was imported and
**executed the kernel for the first time in this repository** (build unit U2): the test titled
"`resolveCanonicalizer` FAILS CLOSED on an inherited `Object.prototype` member" failed on its
first run. This is the strongest available argument for adopting the reference project's own
tests rather than re-deriving new ones — a static gate cannot see a wrong runtime decision; a
test that actually calls the function can.

**The fix.** `Object.hasOwn(registry, ref) ? registry[ref] : undefined`, then the `undefined`
check — genuinely fail-closed and satisfying this repository's `noUncheckedIndexedAccess`
typing at the same time (`canonical.ts:134`).

### 2 — `putStaged`'s last-write-wins overwrite

**What it was.** The reference project's own base commit implemented `putStaged` as a plain
`Map.set` — an unconditional overwrite. SPEC §12 requires **idempotent, first-write-wins** on
a same-id collision (a staged reference is content-derived, so a genuine same-id collision with
*different* content must keep the first write, never the second). No test — inherited or
otherwise — distinguished the two behaviors before this build step.

**What caught it.** A test written specifically to pin the SPEC §12 contract, red before it was
green (build unit U6) — not an inherited test, and not a gate; someone had to write it because
the contract said so.

**The fix.** `if (this.staged.has(staged.id)) return;` before the `Map.set`
(`memory.ts:157-159`).

### 3 — `getStaged`'s by-reference return

**What it was.** The reference project's base commit returned the live stored `StagedDraft`
object directly. SPEC §12: "a caller mutating a returned draft can never corrupt
store-internal state."

**What caught it — including a self-caught vacuous test worth recording on its own.** The same
unit (U6) that fixed item 2 wrote this test alongside it. Its **first draft passed on the first
run** — not because the code was already correct, but because the test compared the read-back
draft against `draft`, the very same object `putStaged` had stored by reference, so mutating
the read-back value also mutated the "expected" value it was compared against: a vacuous
green. Rather than banking that pass, the test was rewritten against an independent
pre-mutation snapshot, produced a genuine red, and only then a genuine green. This is exactly
the discipline the remediation plan's halt condition "a test the plan says must be RED passes
instead" exists to force — applied here by the implementer to its own work, unprompted.

**The fix.** `structuredClone(staged)` on read (`memory.ts:168`).

### 4 — The provenance leak that the token grep caught, not the scan

**What it was.** While authoring a discretionary test (build unit U3), an implementer copied a
literal placeholder value that happened to match the reference project's own naming
convention for a worked example — the kind of string `contract-scan.mjs` cannot see, because
it checks syntactic patterns (`design §`, `slice N`, `Task N`, `OQ N-N`), never literal
project-identifying strings. Landing it would have pushed the forbidden-token grep's count from
25 to 27 without moving `contract-scan`'s own count at all — a leak invisible to every gate
except the one built specifically to catch this shape of thing.

**What caught it.** The forbidden-token grep, run **before** the commit — added at unit U0
precisely because `contract-scan` exiting 0 certifies nothing about a project-identifying
string surviving in the code. The implementer noticed the count move, diagnosed the cause, and
substituted a repository-local placeholder before committing. This is the gate's first live
opportunity to catch something real, and it did.

---

## Reconciling the two prior sources this document draws on

Two independent readings fed this document — a comment-level fidelity pass and a from-scratch
code-review pass — and where they described the same code, they agreed. One place is worth
flagging explicitly because it could otherwise read as a contradiction: the code-review
dimension's account of the `readChain`/`putStaged`/`getStaged` aliasing defects names them as
newly discovered; the claim-audit dimension subsequently established that the reference
project had **already fixed all four aliasing sites** (including the two this repository
independently closed — `getStaged`'s clone and `putStaged`'s first-write-wins behavior) at its
own head, in the same file, with near-identical reasoning in its comments. Both readings are
correct as far as they go — the defects are real, and two of the four were independently
re-derived here rather than copied — but "newly discovered" is the less complete framing.
`docs/process/adopted-source-provenance.md` records the complete, reconciled version: two of
four aliasing fixes were independently reached here (`putStaged` first-write-wins,
`getStaged`'s clone — both DIVERGENCE items, convergent with the reference's later head by
separate reasoning, not by copying it), and two remain open (`readChain`, and the write side of
both append paths — INHERIT items 1, 2, and 4). Where this document and the provenance document
overlap, the provenance document's file-by-file account is the one to trust for exact line
numbers and fix text; this document is the narrative of *why* the branch's own process produced
each class of finding.

**A third, independent reading now confirms the open half of this reconciliation.** The
recovered spec-conformance dimension's two probes against `readChain` — mutate-after-read and
mutate-after-append, both landing in stored state, not just the returned reference — reached
the same conclusion as the claim-audit/provenance work by direct execution rather than by
diffing source: a different method arriving at the same place, agreeing rather than
contradicting. It adds one thing neither prior reading recorded: `getStaged`'s SPEC §12
fresh-value guarantee has a pinned test (`store-constraints.test.ts:130-160`); `readChain`'s
does not — worth closing alongside the `structuredClone` fix itself in R2, not only after it.

---

## Findings that need a sealed `docs/concept/` decision

Two items from the recovered spec-conformance dimension are genuine mismatches between shipped
code and `docs/concept/SPEC.md`, but the dimension's own analysis — and an independent read of
the cited SPEC text for this document — found a plausible reading under which the fix is a
change to the sealed SPEC prose, not to the code. `docs/concept/` is sealed; choosing between
these two readings is the repository owner's decision, not something this document resolves or
acts on. Both are also absent from `docs/process/deferral-register.md` and from the
remediation plan's R1–R5 units.

**1 — the two operator audit functions are not exported from the package
(`index.ts:11`).** SPEC §5 (`docs/concept/SPEC.md:375-385`) says: "The library exposes two
functions over a record's chain, for the operator's own audit path: `replay(chain)` ...
`verifyChain(chain)` ... These are library functions **over** the chain, not `Store` methods
(§12) — they run on whatever the store returns." `index.ts` exports only the
`ChainVerifyReport` *type*; `replay`/`verifyChain` themselves (`chain/replay.ts:83,179`,
exported from that module but not re-exported from the package's `index.ts`) are not part of
the public API surface, and the only public form is the recordId-keyed wrapper on the operator
handle (`operator-surface.ts:35-36`), which can only verify a chain the live store currently
returns — an operator holding an exported or restored chain cannot verify it with this package.
Against this: the reference project's own later head also does not export these functions from
its equivalent `index.ts` — both implementations agree with each other and disagree with SPEC
§5's sentence. That agreement is what makes this plausibly a §5 wording defect rather than a
code defect independently introduced on this branch. **Owner decision:** either export
`replay`/`verifyChain` as chain-taking functions from `index.ts`, or amend §5 to say the
chain-taking forms are internal and the operator handle's recordId wrappers are the exposed
audit path — the two texts should not go on disagreeing.

**2 — `open()`'s blocker-chain expiry runs without a pre-seam chain-verify
(`kernel/open.ts:131-149`).** When exclusivity blocks a new `open()`, the code reads the
blocking record's chain, replays it, and appends an en-passant `expired` transition via
`expireIfDue` — without calling `verifyChain` on that chain first. SPEC §5's "mandatory
pre-seam chain-verify" (`docs/concept/SPEC.md:399-400`) reads as a blanket rule: "Every
operator-side mutating seam verifies the chain before acting." Taken literally, a tampered
blocker chain receives a silent `expired` append with no `chain-compromise` ever surfaced.
Against this: the reference project's later head imports `verifyChain` in its equivalent
`open()` but uses it only for prior-leg reference verification, not before the blocker's
en-passant expire — the same gap exists there too, suggesting §5's blanket wording is what
needs a carve-out for this specific en-passant path, not that this branch introduced a new
omission. **Owner decision:** either verify the blocker chain before `expireIfDue` and surface
`chain-compromise` on a detected break, or amend §5 to scope "the chain" to the seam's own
target record and name the en-passant blocker-expire as a stated exception.
