# Row 22 truth repairs — design

**Date: 2026-08-24.** **A maintenance increment. No sanction is needed and none is
sought.** Nothing in `docs/concept/` moves, no maturity marker moves, and no capability is
promoted. The increment lands no behavior — which is precisely why it can earn no marker
move: `docs/concept/SCOPING-GUIDE.md` §7's spec-moves-to-truth rule moves a marker only
when behavior lands, and correcting a record is not behavior landing.

**Register row 22 is RESTATED here. It is not split, and it is not retired.** The register's
own rule is that an entry leaves the table only when the behavior lands or the deferral is
explicitly retired, and neither happens in this increment. The increment that follows closes
22b on behavior and re-scopes the row; 22a stays open on the third horn row 13 records.

## The gap, stated from the measurements

Row 22 was opened by the AL2 signature-enforcement coverage increment, which found the
defect while closing rows 20 and 21 and recorded it rather than fixing it. **That was the
right act.** One cluster per increment is this repository's own discipline, and a
containment needs its own design, plan and pins. A second, independent justification was
established afterward and is stronger than the discipline argument: the corpus cannot
adjudicate any candidate containment at all — see "What produced them" below.

**The reason the row records for deferring is wrong, and it is wrong in five documents.**
Row 22 says the containment "either special-cases a path five call sites share or reopens
the deliberately pinned sign-before-append ordering". The disjunction is not exhaustive — one
containment sits off both horns and closes half the finding — but withdrawing it does not leave
the containment unconstrained, because a third horn exists that the sentence never named. Row 13
below is that finding, and it is the most valuable thing this increment records.

The rows below are the corrections this increment owes. Each was verified against the tree
at design time. Line numbers drift; the repair re-locates each claim by content and
re-verifies it before touching anything.

| # | Site | Asserts | What is true instead |
|---|---|---|---|
| 1 | The dilemma sentence, in **five non-identical variants** (their tiers differ — see the Rulings): `docs/process/deferral-register.md:13`; `docs/process/next-phases.md:40-42`; `docs/process/implementation-status.md:2497-2501`; `docs/analysis/2026-08-23-signature-enforcement-coverage.md:399-403`; `docs/superpowers/specs/2026-08-23-al2-signature-enforcement-coverage-design.md:212-216` | that the containment is EITHER a special-case of a shared path OR a reopening of the pinned ordering — an exhaustive disjunction | Withdrawn as EXHAUSTIVE rather than as wrong. A signer-result memo keyed by transition OBJECT identity sits on neither horn and closes 22b outright; it was applied to the real tree and ran the record project green. But a chain-local admissibility precheck — the only measured containment for 22a — sits on a THIRD horn the disjunction never named: it predicts C3 and C4 from the READ chain, which on this path failed verification by construction, while C3 and C4 are decided against the backing's own persisted row. See row 13 |
| 2 | The same five sentences | "special-cases a path five call sites share" | `appendChainCompromise(store, chain, now)` receives no caller identity, and none of the five call sites — `kernel/finalize.ts:203`, `kernel/decline.ts:79`, `kernel/seal.ts:56`, `kernel/redeem.ts:239`, `kernel/findings-seams.ts:152` — passes anything distinguishing. Every candidate containment is a UNIFORM change to one shared function and all five callers get identical behavior. The real cost is blast radius, which is a different and more precise objection |
| 3 | `docs/process/deferral-register.md:13`; `docs/process/implementation-status.md:1188-1190`; `docs/analysis/2026-08-23-signature-enforcement-coverage.md` (Finding F, whose own wording is "an entry with no chain counterpart is never visited") | "an orphan is never visited" | Literally false; "an orphan never produces a verdict" is true. `layerVerdicts` (`kernel/verify-signatures.ts:63-67`) calls `listByRecord(recordId)` and materializes every returned row on every verification — i.e. on every seam call on a signing record. Measured: twenty consecutive refusing `finalize()` calls on a sealed signing record fetched 5, 6, 7 … 24 rows, 290 cumulative where a non-accumulating sidecar would have fetched 100, with the chain constant at 5 |
| 4 | `docs/process/deferral-register.md:13`; `docs/process/release-checklist.md:130-132`; `docs/process/implementation-status.md:99-101`; the coverage design doc's "inert to both AL2 consumers" | that the sidecar's consumers are exhaustively the two kernel readers | A THIRD reader exists in production source: `packages/record/src/probes/probes.ts:862`, the `signature-tamper-refuses` operator-assurance probe, takes `entries[0]` with no chain correlation — the exact idiom `signing/store.ts:34` forbids. Measured: under a contract-legal orphan-first `listByRecord` ordering, which `signing/store.ts:33` explicitly permits ("chain order not guaranteed") while `:34` carries the forbidding half, it returns a FAIL against a sound build. Its safety today is accidental, not structural |
| 5 | `docs/process/deferral-register.md:13`; `docs/process/release-checklist.md:129`; `docs/process/implementation-status.md:97-99` | "performs one signing operation per CAS candidate", with no statement of what those operations buy | Accurate as an invocation count, misleading as a cost. All invocations within one call sign BYTE-IDENTICAL bytes and upsert ONE `transitionDigest`, so three or four signer round-trips produce exactly ONE orphan — a reader can otherwise infer three orphans per call, which the row's own 6, 7, 8, 9, 10, 11 already contradicts. The per-candidate cost applies only where candidate 0 loses. The census taken for this is NOT reconcilable and is withdrawn: 68 one-attempt calls against 64 landing calls over the same 72 is impossible, since the walk returns on the first successful CAS and the shortest candidate list is three, so a call makes exactly one attempt only when candidate 0 lands. Re-derive by instrumenting `store.appendTransition` inside the loop and reporting three reconciling counts — total calls, calls landing at candidate index 0, and calls that exhaust the list — before any figure is written down. Finding F's own "three, on the fixture above" is CONFIRMED correct — a sealed record's replay folds to `confirmed`, so the deduped list is three long, not four |
| 6 | `docs/process/deferral-register.md:13`; `docs/analysis/…` (Finding F's "A sealed record's chain can never grow again") | that the sealed record is the canonical no-edge shape | The commoner shape is a record that has ALREADY taken the compromise edge. Measured on an unsealed record: call 1 lands the edge correctly, after which the replayed state is `refused` — outside the static three — so the deduped list is FOUR long and every subsequent seam call mints an orphan at four signer invocations. On the corpus's compromise appends the majority LAND the edge (count withdrawn with the census in row 5), so orphan minting is the steady state of every compromised record touched again |
| 7 | All five dilemma sites, and the row body | describe the no-edge path only via a deliberately broken signature, implying an attacker | An ORDINARY KEY RETIREMENT reaches it. Measured: a healthy, untampered, sealed signing record with `verifySignatures` reporting all verified had its decommissioned `keyRef` dropped from the verifier registry and a new one installed — exactly the host-declared lifecycle SPEC §14 describes. `signatureLayerHolds` is fail-closed on an unresolvable `keyRef`, so every subsequent `finalize()` refused and minted one orphan plus three signer round-trips: sidecar 6 … 13 over eight calls, chain flat at 5, permanently |
| 8 | `docs/process/release-checklist.md:137-139`; the coverage design doc | deploys "behavior on a durable `SignatureStore` backing is UNMEASURED" as though it lessened the finding | Accurate as a coverage bound, not as a mitigation. `MemorySignatureStore` is the ONLY `SignatureStore` implementation anywhere in the tree, so no other measurement was possible. And its own "reference semantics, never durable evidence" header speaks to evidentiary durability, not to unbounded growth plus growing per-call reads in a long-lived process, which is what was measured |
| 9 | The trigger, in **five byte-identical copies** (248 characters each): `docs/process/deferral-register.md:13`; `docs/process/next-phases.md:43-46`; `docs/process/release-checklist.md:132-135`; `docs/process/implementation-status.md:1193-1196`; `docs/superpowers/plans/2026-08-23-al2-signature-enforcement-coverage.md:985` | that "the first increment that … adds a durable `SignatureStore` backing beyond `MemorySignatureStore`" is a prompting event this repository will reach | It is not. `docs/guide/integrating.md:487` instructs hosts to supply their own sidecar. The condition that makes "unbounded" matter is met in the OPERATOR's deployment, where the trigger fires nothing. The trigger needs a disjunct naming an in-repo event after which that becomes reachable by strangers: lifting `private: true` and publishing. Its own limit, stated with it: `docs/process/release-checklist.md` makes dropping `private: true` a release-day step, so the publication disjunct can never fire EARLIER than the 0.1-cut disjunct already present — it is a clarification of which event actually matters, not a new earlier trigger |
| 10 | The same five trigger copies | — | The trigger names NO condition that makes the wasted-signing cost material, even though Finding F itself states that cost ("on a host whose `Signer` is a remote key service, three round-trips per refused seam call"). Disjuncts 1 and 2 name the two expensive containments; disjunct 3 names the condition that makes the ORPHAN cost material; nothing names a network-bound `Signer`. The redundant-signing defect is deferred under the orphan defect's trigger |
| 11 | `docs/superpowers/specs/2026-08-23-al2-signature-enforcement-coverage-design.md:184` | "every site making that comparison carries a comment saying why" | `packages/record/test/signing-enforce.test.ts:98-102`, the file's FIRST test, asserts sidecar cardinality after a refusing `finalize()` with no comment. Three siblings do carry it (`:118`, `:369-370`, `:438`). Read narrowly the sentence is defensible — that assertion predates the coverage increment, so it was not "written here" — but as written it is false, and the uncovered site is the highest-traffic place a future author lands |
| 12 | `docs/analysis/2026-08-23-signature-enforcement-coverage.md` (Finding F's enlisted-exemption sentence) | reads as though the exemption covered only direct `redeem()` | A clarification, not an error. The exemption is total for all three redemption seams: `redeem`, `beginRedemption` and `completeRedemption` each reach `kernel/redeem.ts:226`'s `tx !== undefined` guard and return before `appendChainCompromise`, so each costs zero signer invocations and zero puts under enlistment |
| 13 | The dilemma sentence, all five variants — the finding this investigation produced rather than a claim it corrects | that withdrawing the disjunction leaves the containment unconstrained | **The disjunction is wrong to be EXHAUSTIVE, but it was not wrong to be a dilemma.** There is a THIRD horn, and 22a sits on it. Every measured containment for orphan accumulation predicts C3 and C4 from the read chain — a chain that reached `appendChainCompromise` precisely because it failed verification — while C3 and C4 are decided against the backing's own persisted row. On the SQL backing `readChain` reads the transitions table and the gates read the records row, so a tamper that rewrites a transition leaves the persisted state untouched. Measured against the current tree: a length-preserving last-element kind rewrite over a record persisted `confirmed` folds to `refused` on read, and the walk lands the compromise edge through C3's carve-out WITH a `transitionRef` today; a chain-predicted bar suppresses it. The sibling shape with the last kind rewritten to `sealed` folds to `open` — so a terminal-state rule does not even fire — and the walk still lands the edge, because C4 tests a persisted flag. The triggering tamper is the documented AL1 blind spot only AL2 catches, i.e. this defect's own population, and the corpus cannot see it because every corpus tamper is payload-only with kinds intact |

Row 12 is a clarification and is listed apart so that recording it does not inflate the
count of things that were wrong.

## What produced them, named once

**Eleven of the first twelve rows are one defect wearing eleven faces: a finding was recorded
with its containment's cost estimated rather than measured.** Row 13 is not one of them — it is
a finding this increment produces rather than a claim it corrects. Every claim in the "What is true
instead" column above came from executing something. Not one required a change of opinion
about what the code does — only a measurement the original increment had no occasion to
take, because it was closing a coverage row and correctly declined to open a containment
investigation in passing.

**The decisive measurement is the one that vindicates the deferral.** All three candidate
containments applied to the real tree returned 60 test files / 737 tests / 0 failures in the
record project, `tsc --noEmit` strict clean — identical to baseline. For the most dangerous
of them, the new branch was instrumented with a raw `process.stderr.write` and counted
across the full record run: **zero firings.** The corpus never once produces an
`appended: false` on a signing record through the decorator. The identical instrumented
build emitted thirty firings against a scratch fixture, so the probe is sound and the zero
is real. A change measured to strip every signature from 94 of 100 legitimately confirmed
records passes this suite without executing a single line of the new code.

That is why "the containment is expensive and dilemma-bound" was the wrong reason. It is NOT,
however, why "cheap containment identified" would be the right one — that reading was drafted
and then falsified by this increment's own review. The precheck that measured green against the
record project was afterwards measured to SUPPRESS a compromise evidence edge that lands today,
on a tamper shape the corpus contains no fixture for. **The investigation named "a green suite
is a null result here" and then relied on a green suite anyway.** The accurate reason is row 13's:
the disjunction was not exhaustive, one containment does sit off both horns and closes 22b, and
22a sits on a third horn that was never named. Had all of that been on the table at filing time,
file-don't-fix would still have won on increment discipline — but on a different argument again.

**One rejected family is recorded rather than left unnamed.** Compensating removal — sign,
put, append, then remove the entry on an explicit `appended: false` — preserves the literal
put-before-append token order and destroys the property that order is pinned to protect.
Two independent measurements agree: 100 trials of two concurrent same-record `finalize()`
calls drove 88 legitimately confirmed, hash-intact records to lose their signatures and take
a terminal compromise edge, against 0 of 400 for the shipped ordering; on the batch path the
loser's failed CAS stripped three of the winner's four entries. It is unrepairable, because
the sidecar is content-addressed and the signature scheme is deterministic, so racing writers
write byte-identical entries under one key and a "remove only what I wrote" guard has
nothing to discriminate on. Recording a rejected family with its measurement is cheaper than
having the next author rediscover it.

## Rulings taken (at the 2026-08-24 brainstorm), so they are not re-litigated

- **Row 22 is restated, not split.** The finding decomposes into two defects — orphan
  accumulation and redundant signer invocations — proven independent by double dissociation:
  the memo zeroes the signing redundancy and leaves accumulation byte-for-byte identical,
  while compensating removal zeroes accumulation and leaves signer invocations untouched. But
  the recommended containment dominates BOTH, so two rows would leave the dominant fix
  belonging to neither and would invite two half-fixes where one small edit suffices. The
  decomposition is stated INSIDE the restated row.
- **Horn 2 is restated by its hazard, never by its mechanism.** The row currently forbids one
  mechanism, inverting the order. What is actually forbidden is any change that makes the
  sidecar entry's survival conditional on the append's outcome. Compensating removal obeys the
  mechanism and violates the hazard, which is exactly why the mechanism-shaped wording failed.
- **The dilemma is withdrawn as an exhaustive disjunction and replaced by a named containment
  inventory** with per-horn coverage: the one containment measured to sit on neither horn (the
  memo, which closes 22b), the THIRD horn 22a sits on (row 13),
  and the digest-keyed de-dup measured to sit ON horn 2, so the distinction between it and the
  object-keyed memo cannot be lost by a later reader.
- **Five dilemma variants, five separate edits.** The five sentences are NOT byte-identical —
  `next-phases.md` says "a deliberately pinned ordering" with the mechanism dropped, and
  `implementation-status.md:2498` says "order" where the register says "ordering". No
  find-and-replace exists that touches all five. Their tiers differ too, and the ruling does not
  assert a count: `deferral-register.md` and `next-phases.md` are Tier 1 and are rewritten;
  `implementation-status.md`'s variant sits inside the coverage increment's own section and is
  Tier 2, reconciled by a dated note; the analysis record's is Tier 2; the coverage design doc's
  is Tier 3 and is not touched. **Assign each site's tier by reading where it sits, never by
  counting.** The phrase "special-cases a path five call sites share" also occurs in more files
  than the dilemma sentence does — presence of the phrase is not presence of the claim.
- **The trigger gains two disjuncts and keeps its shape.** A cost-bearing `Signer`, and
  publication. Both are prompting EVENTS, never the work's own completion — the error the
  design doc records row 20 making twice.
- **A new analysis record carries the measurements.** The corrections above cite figures that
  exist nowhere in the tracked tree, so the register cannot point at them. A dated record in
  `docs/analysis/` is written here and every corrected site points to it, exactly as row 22
  today points at the coverage record. Without it this increment would replace one unsupported
  claim with another.
- **No new register row.** Nothing here is postponed with intent to do it later, so nothing
  here has a trigger. `CONTRIBUTING.md`'s hard rule 7 puts consciously deferred work in the
  register; the scope bounds below are decisions, not deferrals.

## The three tiers, and which document gets which treatment

This is the increment's central ruling, and every per-file decision follows from it. This
repository already keeps three kinds of document, each with its own stated amendment rule,
and the thirteen rows above land in all three.

**Tier 1 — living records, corrected in place.** `CLAUDE.md`, `docs/process/deferral-register.md`,
`docs/process/next-phases.md`, `docs/process/release-checklist.md`, and the present-tense
sections of `docs/process/implementation-status.md`. **`CLAUDE.md` is Tier 1 and is easy to miss**
— it carries a present-tense sentence naming row 22 and its old title, outside `docs/process/`
where every completeness sweep in this sequence is scoped (its header bullets, its "live
deferral-register rows" bullet, its "Still outstanding" row-22 bullet, and the boundary
paragraph that follows). These make claims about the tree as it is now. A false present-tense
claim is repaired, not annotated.

**Tier 2 — historical accounts inside living documents, preserved and reconciled by a dated
note.** The coverage increment's own section in `docs/process/implementation-status.md`
(its "What stays outside, and why" paragraph), and `docs/analysis/2026-08-23-signature-enforcement-coverage.md`'s
Finding F. This is not an invention: `docs/process/implementation-status.md:2426-2428` states
the rule for the analysis record in that document's own words — "the original framing is
preserved and reconciled by dated notes rather than rewritten, so the history stays legible"
— and the analysis record says the same of itself at its lines 12-18. The same document
already carries an inline dated reconciliation at `:2272-2275`. Finding B's own closure note
is the model: the original paragraph is left exactly as the audit wrote it, and the note says
what is true now.

**Tier 3 — historical spec and plan pairs, not touched at all.**
`docs/superpowers/INDEX.md:11-19` states the rule: "These documents are historical. … A
spec/plan pair is superseded by the code the moment its increment lands, and none of these
documents is maintained afterward". So neither
`docs/superpowers/specs/2026-08-23-al2-signature-enforcement-coverage-design.md` nor
`docs/superpowers/plans/2026-08-23-al2-signature-enforcement-coverage.md` is edited, including
the fifth trigger copy at the plan's line 985 and the plan's fenced duplicate of Finding F at
its lines 910-953. Rows 1, 2, 8 and 11 therefore have sites this increment deliberately
leaves standing, and the trigger's "five byte-identical copies" becomes four moved and one
frozen. **That asymmetry is stated in this increment's own record rather than left for a
reader to trip over**, because a future sweep comparing the five copies will find them
divergent and must be able to learn that the divergence is correct.

## Scope bounds — what this increment does not do

- **It changes no library behavior and touches no `packages/*/src/` file.** The record
  project's 60 test files / 737 tests and the store-postgres project's 4 files report the same
  counts before and after. The repo-wide figure stays 64 files / 802 tests.
- **It does not fix the defect.** Row 22 stays open, with its containment inventory naming
  what the next increment lands.
- **It does not annotate `packages/record/test/signing-enforce.test.ts:98-102`,** the
  uncommented cardinality assertion row 11 names. Adding the sibling comment there would state
  a hazard that the very next increment removes, so the annotation lands with the behavior
  change, in the increment that owns it. Row 11 is recorded here and discharged there.
- **It does not harden the third sidecar reader** at `packages/record/src/probes/probes.ts:862`
  or the corpus's shared `breakOneSignature` at `packages/record/test/helpers/signing.ts:108`.
  Both use the sidecar-driven idiom `signing/store.ts:34` forbids, and both are findings in
  their own right rather than parts of row 22. They are recorded in the new analysis record and
  named in `docs/process/next-phases.md`; they are closed by the sidecar-contract increment
  (`docs/superpowers/specs/2026-08-24-sidecar-contract-design.md`), which follows this one.
- **It does not add the tolerate-and-prune sentence to `packages/record/src/signing/store.ts`,**
  nor the matching operator-facing warning to `docs/guide/`. That is a source and public-docset
  change with its own review surface, and it has its own pair
  (`docs/superpowers/specs/2026-08-24-sidecar-contract-design.md`), landing immediately after this
  increment and before the containment one.
- **It does not REWRITE the row-number derivation parentheticals** in register rows 19 and 22.
  Each records a derivation performed at its own row's write time; re-running it today would
  legitimately return a different high-water mark precisely because the row now exists. They are
  write-time records, not present-tense claims, and rewriting them would erase the derivation
  rather than correct it. Row 22's parenthetical is carried through VERBATIM into the restated
  row and gains one appended restatement clause saying the number is unchanged and the derivation
  above is the write-time one — carrying it is not touching it, and the plan's replacement row
  must contain the original words. **This is a considered non-change, stated so a reader does not
  read it as an oversight.**
- **These are scope bounds, not deferrals, and are argued as such rather than given register
  rows.**

## Risk, and how it is held

- **The four-file consistency check is occurrence-blind and will pass while proving less than
  it appears to.** `grep -rn "sign-before-append ordering" docs/process/ | wc -l` returns 4
  today, but `deferral-register.md:13` contains the phrase TWICE and counts once, and the
  command excludes `docs/superpowers/` where the fifth copy lives. If the restatement moves the
  dilemma away from that phrase, the count still reads 4. **The verification must extract the
  248-character trigger string from each copy, collapse whitespace, and compare programmatically.**
  Measured at design time: all five copies are currently identical, 248 characters each; the two
  Finding F copies (analysis and the plan's fence) are raw-byte identical line for line.
- **Markdown is not citation-checked by anything.** `scripts/contract-scan.mjs` resolves
  citations in tracked TypeScript only, and this increment writes nothing but markdown. Every
  SPEC section number and every quoted phrase must be hand-verified against a
  whitespace-collapsed copy of the source — a quoted phrase that wraps a line break is present
  and invisible to a naive fixed-string grep, which is a standing trap here and has repeatedly
  produced false "missing quotation" findings.
- **`docs-index-sync` gates the counts and its regexes are brittle.** The specs-and-plans
  sentence must keep the exact shape "N files in `specs/`, M in `plans/`" and the analysis
  sentence the exact shape "**`docs/analysis/`** holds N files"; the gate reads them with two
  literal patterns. Adding one spec, one plan and one analysis record moves all three numbers,
  and the gate reads TRACKED files only, so the counts and the `git add` must land in one
  commit.
- **The increment is at risk of committing its own defect.** It exists because a record
  asserted something nobody had measured. Every figure it writes down was measured; where a
  claim is reasoned rather than executed, the record says so in the same breath. The new
  analysis record carries an explicit list of what the investigation did NOT establish —
  including that no durable `SignatureStore` exists to measure against, that no latency figure
  was taken anywhere, and that every concurrency measurement is in-process.
- **Two sites are load-bearing for release day.** `docs/process/release-checklist.md:126-139`
  schedules row 22's disposition, and its own "Note before ruling" concedes the decisive
  evidence will still be missing then. The restatement must leave the checklist item coherent
  for a reader who arrives at it cold on release day, including the fact that the containment
  is now identified and scheduled BEFORE the cut.

## Exit

The increment exits when: all thirteen rows above are repaired at their Tier 1 sites, or
reconciled by a dated note at their Tier 2 sites, or recorded as deliberately untouched at
their Tier 3 sites; row 22 is restated in `docs/process/deferral-register.md` carrying the
22a/22b decomposition, the hazard-shaped horn 2, the THIRD horn of row 13, the containment
inventory with each family's horn named, and the two new trigger disjuncts; the restated trigger is byte-identical across its four living copies, proved by a
whitespace-collapsed programmatic comparison rather than an occurrence count, with the fifth
copy's deliberate divergence recorded; the new `docs/analysis/` record exists and every
corrected site points at it; `docs/superpowers/INDEX.md` gains its row and all three counts
move in the same commit as the `git add`; the increment's section is written in
`docs/process/implementation-status.md`; and `pnpm test`, `pnpm typecheck`, `pnpm lint`,
`pnpm contract-scan`, `pnpm api-sync` and `pnpm docs-index-sync` are all green with the test
counts unchanged, and every withdrawn figure is withdrawn rather than replaced by a guess.
The `implementation-status.md` edit is proposed explicitly in the PR
description rather than slipped in.
