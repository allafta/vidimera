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
**spec-conformance** (read the normative spec in full against the source) — found six risks
that a flat list would present as six unrelated bugs. **This document organizes them by
cause instead, using the three-class framework the remediation plan adopted, because treating
them as one list fixes symptoms while leaving the cause in place.**

As of this writing, none of the remediation plan's fix units (R2 apply-the-INHERIT-list, R3
citation repair, R4 the one genuine Class-B defect, R5 the exit record) have run. The
provenance audit that feeds R2 is tracked separately at
`docs/process/adopted-source-provenance.md`; this document is the review that motivated it.

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
