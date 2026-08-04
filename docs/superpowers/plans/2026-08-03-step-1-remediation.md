# Step-1 remediation — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Runs
> unit-by-unit under the halt discipline in `2026-08-03-autonomous-step-1-completion.md`, which
> still governs. This plan adds units R1–R5 and moves that plan's U10 to the end.

**Goal:** Close the findings of the whole-branch review at `f831d4d`, then exit build-order step 1
with an honest record of what it did and did not deliver.

**Why this exists:** a six-dimension review of 42 commits found six ranked risks. They are not one
kind of problem, and treating them as one list would fix the symptoms while leaving the cause.

---

## The three classes

**Class A — bugs the reference had already fixed, which we adopted anyway.**
`MemoryStore` aliases store-internal state at four sites (`readChain` `:290`, `putStaged` `:152`,
`append` `:235` and `:281`); the reference had fixed **all of them** at head `c688ce4`. We took
`c0f0f75` and inherited its defects.

This happened for a defensible reason that was applied too broadly. "Base-file-first" was verified
essential for **tests** — head had deleted five of seven armed-guard tests from
`construction-validation.test.ts`. Applied to **source**, the same preference means inheriting
known-fixed bugs.

`readChain` is on the **agent handle**, so aliasing there collapses SPEC §9's "holds against an
agent that can reach only the agent handle" into §5's storage-insider threat model. Against a
freshly-opened record, §5's acknowledged AL1 blind spot means a forgery verifies `{intact:true}`
permanently.

**Nothing in this project has ever diffed adopted source against the reference's head.** R1 does.

**Class B — step-1 scope boundaries, misreported as defects.**
`finalize()` has no `opts` because consultations and policy arrive at steps 5–6. Its success batch
is three sequential appends because atomic `appendBatch` is a **step-2 Store method that does not
exist yet**. Neither is fixable now; both are the shape of an incomplete build. They get
**recorded**, not fixed — which is what the exit record is for.

One genuine defect hides inside: a mid-batch conflict reports `record-not-open`. This sentence
originally said SPEC §8 defines that code as meaning the opposite; the R4 review measured that
claim and it over-reaches, so it is bounded here rather than left standing. §8 does not settle
the case at all — SPEC's own finalize is one atomic batch that cannot leave a partial tail, so
the situation does not arise in its model. What is wrong is what the return tells a host: a
never-appends code with no `transitionRef` says nothing was recorded, when consultations had
landed. That is wrong today and fixed in R4.

**Class C — gates that certified less than they appeared to.**
The U9 scrub's `design §` → `SPEC §` substitution carried a foreign document's heading across in
quotation marks. `SPEC §5 "Chain integrity"` appears at three sites and has **zero hits in any
tracked markdown**. Three more comments claim `bound` "names which expiry clause fired" citing
SPEC §4, which says the payload explicitly does *not* distinguish the clause. Sampled error rate:
**~17% of 133 blocks**, 8 of them citation defects.

`contract-scan` validates four syntactic regexes and never checks that a citation **resolves**.
This is the third blind spot of the same shape: scan-exit-0 said nothing about provenance;
count-comparison said nothing about content; syntax says nothing about reference integrity.

---

## Rulings taken 2026-08-03

| # | Decision | Ruling |
|---|---|---|
| R-A | Class A handling | **Systematic audit first.** Enumerate every base-vs-head delta before fixing anything, so siblings are found in one pass rather than one per review cycle. |
| R-B | Class B handling | **Record, do not fix.** Deferral rows with real triggers, plus the exit record. Fix only the `record-not-open` mis-mapping. |

---

## Units

### R1 — the base-vs-head source audit (no code changes) — COMPLETE (`ab412e6`..`cde4b5b`)

For every file in `packages/record/src`, diff the adopted version against the reference's head
(`git -C <REF> diff c0f0f75 c688ce4 -- packages/record/src/<path>`). Triage **every** delta into
exactly one bucket, with a one-line reason:

- **INHERIT** — a bug fix or hardening we should have taken. Feeds R2.
- **LATER-STEP** — a capability belonging to build step 2+, correctly excluded.
- **DIVERGENCE** — deliberately different here (e.g. the `governedUnavailable` arity-2 change, the
  `redeem()` throw, the hand-written serializer). Record why.

Deliverable: a triage table at `docs/process/adopted-source-provenance.md`, tracked. It is also the
durable answer to "how does our kernel differ from its source", which nothing currently records.

**Exit:** every delta classified; the INHERIT list is R2's work-list. **No source edited in R1.**

**Done:** the triage table landed at `docs/process/adopted-source-provenance.md` (`ab412e6`),
then gained the recovered spec-conformance dimension's findings, folded into a fourth class
(`cde4b5b`) and into the companion whole-branch review at
`docs/analysis/2026-08-03-step-1-review.md`. Ten INHERIT items confirmed, ranked; no source
touched.

### R2 — apply the INHERIT list — COMPLETE (`201ccb7`..`b159a9f`)

Fix everything R1 bucketed INHERIT. Known members before the audit runs:

- **`MemoryStore` aliasing, all four sites** — `structuredClone` at `readChain`, `putStaged`,
  and both `append` paths. Add the two missing SPEC §12 freshness tests beside the existing
  `getStaged` one at `store-constraints.test.ts:130`. **RED first**, each.
- **`open()`'s staged-`legId` re-check** — SPEC §8's second `unknown-leg` producer is unwired, so a
  leg renamed between deploys mints a record that can never finalize, never expires under
  `expiry:'none'`, and holds its `(profile, subject)` pair under C1 forever. Five lines mirroring
  `stage.ts:50-57`; pre-record, never-append. **RED first.**

Any further INHERIT items land here too. Each needs its own failing test before its fix.

**Exit:** every INHERIT item fixed with a red-first test; 218+ tests green; digests unmoved.

**Done:** all nine applicable INHERIT items fixed, each red-first. The four `MemoryStore`
aliasing sites (items 1-4: `readChain`, `putStaged`, `appendGenesis`, `appendSubsequent`) landed
in `201ccb7`, along with the two missing SPEC §12 freshness tests and the resolution of the
`structuredClone`/`DataCloneError` hazard the audit flagged (see
`docs/process/adopted-source-provenance.md`'s "as shipped" section). `open()`'s staged-`legId`
re-check (item 5) landed in `8c78083`. The three documentation-only items (6-9: `store.ts`'s
`putStaged` collision rule and `getStaged`/`readChain` freshness docs; the three `bound`
comments) landed in `b159a9f`. Item 10 (`index.ts`'s missing `OpenOptions` export) was
reclassified as a local improvement rather than an inherited fix and left unapplied — see its
own entry in the provenance document. 226 tests green (up from 218), zero skips; the four
byte-compatibility digests unmoved.

### R3 — citation repair and a resolver gate

Fix the eight citation defects, then **close the blind spot that let them through**.

Repairs: the three `SPEC §5 "Chain integrity"` sites (use §5's real bold runs — *Operator audit
functions* and *Honesty about hash chains*); `finalize-check-order.test.ts:1` citing §5 for the §9
ladder; `store.ts`'s two "verbatim union"/"verbatim interface" claims (§12 contains no code and
says signatures are provisional — and the built interface is **5 of 9 methods** with a different
`appendTransition` signature); the three `bound` comments contradicted by `SPEC.md:322`; and
`store.ts:54`'s `putStaged` doc, which omits the first-write-wins clause this branch *fixed in the
implementation* but never propagated to the interface a third-party adapter author reads.

Then extend `scripts/contract-scan.mjs` with a **citation resolver**: for every `SPEC §N` or
`DECISIONS.md` reference in tracked TypeScript, confirm the section exists; for every *quoted*
title or phrase attached to one, confirm the quoted string occurs in that document. A quoted
citation that does not resolve is a finding.

Also sweep the 15 surviving foreign labels (`M-B`, `O1`, `O3`, `S-4`, `design/brief`) in 6 files —
they escape the four existing regexes.

**Exit:** scan exit 0 under the extended gate; every quoted citation resolves; the resolver has a
planted-violation test proving it catches and a clean-code test proving it stays silent.

### R4 — record Class B, fix the one real defect

**Fix:** the mid-batch conflict mapping. A partial success batch currently returns
`record-not-open` — which this text originally called the opposite of SPEC §8:492's condition,
an over-reach the R4 review measured and this line now bounds: §8 is silent on a case its own
atomic-batch finalize cannot produce, and the defect is that the return misrepresents a call
that has already appended. Choose a code that is true,
or throw — and pin it with a test.

**Record** (deferral rows with real triggers, not "later"):

- `finalize` takes no `opts`, so SPEC §10.3's non-declaring-profile throw and §11.1's reserved-kind
  intake throw are structurally unreachable. Trigger: the steps that ship policy and consultations.
- The success batch is sequential, not the atomic `appendBatch` SPEC §9 rung (6) and §12 mandate.
  Trigger: build step 2, when `appendBatch` lands.
- The shipped `Store` is **5 of 9** of §12's surface, with `appendTransition` taking
  `(expected, transition, nonTerminal)` where §12 specifies `(expectedCurrentState, transition,
  meta, tx?)`. Trigger: build step 2.

**Exit:** the mis-mapping fixed and tested; three rows added; no Class B item silently carried.

### R5 — the exit record (was U10), and the stale signals it unblocks

Create `docs/process/implementation-status.md`. It exists because build-order steps 2–6 move
**zero** maturity markers, so the inherited "spec-moves-to-truth at every exit" discipline is
vacuous for five consecutive steps and needs a substitute (deferral row 8).

It must carry, per build step: what landed **here**, the commit range, the gate outputs at exit,
and what is explicitly still outstanding. For step 1 specifically:

- a **per-SPEC-section implemented-here / not-implemented-here table** — this is the real answer to
  the `[PROVEN]`-marker readability concern, and it is why the markers themselves need no change
  (their legend is already explicit in both front doors);
- the Store's 5-of-9 subset, the sequential-batch and `unknown-leg` divergences;
- that the package is **unconsumable today** — `private`, version `0.0.0`, no `exports`/`types`, no
  build, `noEmit`.

**Partly pre-empted by a documentation housekeeping sweep, ahead of this unit running:** the
stale `README.md:36` "currently red" line, `CLAUDE.md`'s stale status claims, and deferral row
7's already-fired trigger were all fixed and retired outside R5, once it became clear their
staleness did not need to wait on the exit-record artifact itself. What R5 still owes: the
`docs/process/implementation-status.md` record itself, and retiring row 8 once that record
exists.

**Exit:** the record exists and is accurate; row 8 retired.

---

## Gates — unchanged, plus one

`pnpm typecheck` clean · `pnpm test` all pass, zero skips · `pnpm lint` exit 0 ·
`npx biome check --error-on-warnings .` exit 0 · `node scripts/contract-scan.mjs` exit 0 ·
forbidden-token grep **0** · no non-null assertion in any diff ·
**new at R3:** every quoted `SPEC §N` / `DECISIONS.md` citation resolves.

**Standing rules that keep earning their place:** never compare scan totals — diff the output, and
expect line-number shifts to dominate whenever a header changes size. Never `--unsafe`. Never
retype a fixture. `git show`, never `git archive`.

**Halt budget: 2 remaining**, carried from the previous plan. A byte-stability digest mismatch
remains a must-halt that may never be repaired by editing the literals.

---

## What this plan does not claim

Closing R1–R5 exits **build-order step 1 of eight**. A host still gets no store adapter, no
redemption, no multi-leg separation of duties, no consultations, no policy or eligibility gating,
no findings flow — ten governed profile fields throw at construction, by design. The exit record
says so in the same breath as the green gates, which is the point of having one.
