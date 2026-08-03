# Autonomous completion of build-order step 1 — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to
> execute this plan unit-by-unit. This plan is designed to run WITHOUT a human in the loop.
> Every decision that would otherwise force a stop is resolved below. The conditions under
> which you MUST nevertheless halt are in "Halt discipline" — treat that section as binding.

**Goal:** Finish build-order step 1 (the kernel) autonomously, ending with the imported kernel
under test, the contract scan at zero, and an objectively checkable exit record.

**Relationship to the earlier plan:** `2026-08-02-reference-implementation-adoption.md` remains
the source of task detail. **This document supersedes its task ORDER and its unit boundaries**,
and corrects five defects in it that were measured, not guessed. Where the two conflict, this
one wins; where this one is silent, that one governs.

**Tech Stack:** unchanged — TypeScript 7.0.2 (strict, `noUncheckedIndexedAccess`,
`isolatedModules`, `noEmit`, ES2022, NodeNext), vitest 4.1.10, Biome 2.5.6, pnpm 11.18.0,
Node ≥22, zero runtime dependencies in `packages/record`.

---

## Global Constraints

Unchanged from the earlier plan, plus three additions forced by measurement:

- **Zero runtime dependencies** in `packages/record`.
- **`noUncheckedIndexedAccess` stays on.** No non-null assertions (`!`).
- **Test directory is singular `test/`.**
- **Commit style:** imperative sentence-case subject, body explaining *why*, trailer
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`, no conventional-commit
  prefixes.
- **Never `biome check --write --unsafe`.** Prove autofixes with the suite, never the typechecker.
- **Obtain inherited files with `git show <commit>:<path>`, never `git archive`** (CRLF).
- **Never retype a fixture — `git show` it.**
- **NEW — the lint gate is `npx biome check --error-on-warnings .`**, not `pnpm lint`.
  Measured: `noNonNullAssertion` is warn-level, and `biome check` exits 0 on warnings, so the
  no-`!` constraint had **no gate at all** — a `!` passed typecheck, lint, test, CI and the scan.
  Adopting this makes the unused `interface ExpiredPayload` (`chain/replay.ts:43`) an exit item.
- **NEW — a `!` diff gate per unit:**
  `git diff <BASE> HEAD -- '*.ts' | grep -nE '^\+.*[A-Za-z_)\]]!\.'` must return nothing.
- **NEW — a forbidden-token grep with a re-baselined count per unit.** The contract scan
  structurally cannot see provenance leaks. Measured baseline: **1 today**
  (`packages/record/src/index.ts:22` names a sibling project), **25 expected after U2**, and
  **0 required at U9's exit**. `contract-scan` exiting 0 certifies nothing about this.
  **This is a single-token grep for one sibling project's name — it is not a general
  provenance detector.** If a later unit imports material naming a *different* external
  project, this grep stays silent about it; only that one name is checked.
- **U0 baselines, recorded 2026-08-03 at HEAD `061f38f` before any implementation unit starts**
  — later units compare against these, not against a re-derivation:
  - `node scripts/contract-scan.mjs | wc -l` → **210**.
  - `grep -rn "tide" packages/record/src --include=*.ts | wc -l` → **1**
    (`packages/record/src/index.ts:22`, the same sibling-project name the bullet above pins).
    **Resolved (fix round 1): the jump to 25 lands at U2, not U3.** The bullet above and the
    halt-discipline table below disagreed on this until an owner ruling settled it — the 24
    additional occurrences are carried by the base test corpus, and that corpus lands in U2
    (Task 17); U3 (Task 14 — head's `stage.ts` and its fan-out) touches four source files and
    one test file and carries none of them. The halt-discipline table's "U2" reading was
    right; the Global Constraints bullet's "U3" was corrected to match.
  - `npx biome check --error-on-warnings .` → **exit 1**. Biome's own report: "Found 1 warning.
    Found 1 info." — one `lint/correctness/noUnusedVariables` on `interface ExpiredPayload`
    (`packages/record/src/chain/replay.ts:43`, unused, scheduled for U9), one pre-existing
    `deserialize`/DEPRECATED info on `biome.json`'s `linter.rules.recommended` field (deferral
    entry 5, untouched by U0). `--error-on-warnings` promotes the warning to a failing exit
    code; Biome's text still calls it a warning, not an error.

---

## Decisions resolved — do not re-ask these

| # | Decision | Ruling |
|---|---|---|
| D1 | Guard-message helper shape | **Arity-2: `governedUnavailable(field: string, contract: string)`.** It is the only shape serving all three consumers (the ten construction guards, an `open()` options guard, a `redeem()` capability throw), and it is what the reference implementation itself converged on. |
| D2 | Guard message text | Message **head byte-preserved**, new prose **appended**: `GOVERNED feature not available in this build (<field>) — <what>. Contract: <where>.` Measured: only ONE inherited assertion is exact-equality; the other three are unanchored regexes and survive unchanged. |
| D3 | Which SPEC section lifts each guard | `legs`/`sod`/`proposer` → §10.1; `ackMode`/`requiredAcks` → §10.2; `policySource` → §10.3; `eligibility` → §10.4; `requiredConsultations` → §11.1; `freshness` → **§11.1 and §14** (unliftable at AL1 by construction); `captureMode` → §9.2. |
| D4 | `supersedes` guard | `open()` throws on an unexpected options key, via the same arity-2 helper. Type-level absence is not a guard for a JavaScript caller. |
| D5 | Post-base fix (iii) | **Defer.** It has no producer at this build step, and the plan forbids a test that pretends to prove it. Trigger: the build step that first produces a `redeeming` state (Phase 3). Record in the deferral register. |
| D6 | The `redeem` strand | **Ship loudness, rename the goal.** `redeem()` throws a build-capability error on a confirmed effect-seam record. Collateral is exactly ONE inherited test (`terminality.test.ts:149`), verified by enumerating every `redeem(` call site in the base corpus. **The exit note and register entry 9 MUST state plainly that the pair remains permanently held** — the hold is the Store's C1 exclusivity, and real closure needs `seal()` (Phase 2a) or `confirmToRedeem`'s expiry edge (Phase 3). Do not claim the deadlock is closed. |
| D7 | Task ordering | **Task 17 runs BEFORE Task 14.** Task 18 needs Task 17's corpus. Task 22 is last. See the unit table. |
| D8 | `ExpiredPayload` | Decide in U9 (the scrub), where its naming comment is rewritten anyway. Do not delete it separately. |

---

## The five pre-fixes — U0, before any implementation

All five were measured. Leaving them in guarantees the halt budget is spent on plan defects
rather than real findings.

| Defect | Correction |
|---|---|
| Task 21 says insert `(5.7)` between the `(5.5)` and `(6)` rungs | **`(5.5)` does not exist.** `finalize.ts:6-8` is a **six**-rung ladder (`load chain → (1) chain-verify → (2) state/expiry → (3) identity → (4) content-drift → (5) facts → (6) success batch`); `grep -n '3\.5\|4\.5\|5\.5\|5\.7'` exits 1. Rewrite Task 21 to reserve `(5.7)` after rung **(5)**. |
| Task 17 says "one import line per file, nothing else changes" | It lands **66 typecheck errors**, 0 in `src` — TS2532×33, TS2345×16, TS2322×12, TS18048×5, concentrated in chain-verify 19, exclusivity 12, replay-verify 9, construction-validation 8. Add an explicit error budget and the single repair idiom. |
| Task 15 edits `construction-validation.test.ts` | That file arrives at Task 17. Reorder per D7. |
| Task 16 references `kernel/context.ts` | It does not exist here. Remove the reference; the `mintId` seam lands in `create.ts` + `open.ts`. (Corrected, fix round 1: Task 14 was named here too, but its Files line never referenced `kernel/context.ts` — verified during U0. Only Task 16 carried the defect.) |
| "No non-null assertions" | Ungated. Adopt `--error-on-warnings` and the `!` diff grep (Global Constraints). |

---

## Execution units

Each unit is one dispatch, one review, and commits independently. Model tier per the
subagent-driven-development skill: cheapest when the plan text carries the complete code,
mid-tier for integration, highest only for design.

| Unit | Covers | Deliverable | Exit condition | Tier |
|---|---|---|---|---|
| **U0** | The five pre-fixes + gate hardening | Plan text corrected; `--error-on-warnings` adopted; `!` and token greps wired | All three new gates run and their baselines recorded (lint may go red on `ExpiredPayload` — that is expected and becomes a U9 item) | cheap |
| **U1** | Task 16 | The `mintId` seam in `create.ts` + `open.ts` | `pnpm typecheck` clean | cheap |
| **U2** | Task 17 | The 17 base test files, `helpers/{chain,profiles}.ts`, `fixtures/jcs-vectors.ts`, the down-ported `helpers/stores.ts` | **66 → 0** typecheck errors; 189 adopted tests + 6 local = 195 pass; a `biome.json` `overrides` block scoped to `test/fixtures/**` disabling `noPrecisionLoss`, reason recorded (RFC 8785 vectors are byte-normative) | **mid** |
| **U3** | Task 14 | Head's `stage.ts` + fan-out to `id.ts`, `agent-surface.ts`, `create.ts`, plus the named 12-site patch to `content-binding.test.ts` | typecheck clean; suite green | mid |
| **U4** | Task 15 (D1–D4) | Arity-2 helper, ten new messages, `open()` unexpected-key guard | Ten messages match D2/D3 exactly; the one exact-equality assertion updated; three regex assertions **unchanged** | mid |
| **U5** | Task 18 | The two step-1-reachable post-base fixes, red first | Both proven RED before green; fix (iii) **deferred** per D5, no test written for it | mid |
| **U6** | Task 19 + Task 20 | Byte-stability reframed as compatibility pins; the two §12 RED tests (`putStaged` first-write-wins, `getStaged` fresh values) | Four digests reproduce byte-for-byte; both §12 tests proven RED then green | mid |
| **U7** | Task 21 (corrected) | Adjacent-pair order tests | One test per jointly-constructible consecutive-rung ordered pair. `(1)→(2)` ×2 already exist (`chain-verify.test.ts:158`, `:224`); the rest are new. `(5.7)` reserved after rung (5) | mid |
| **U8** | D6 | `redeem()` build-capability throw; `terminality.test.ts:149` inverted with its reason recorded; register entry 9 rewritten to state the pair stays held | New RED test passes; exactly one inherited assertion inverted | mid |
| **U9** | Task 22 + D8 | The comment scrub | `contract-scan` exit 0 **AND** the forbidden-token grep returns zero. Scan-exit-0 alone is not sufficient | **mid, with routing** |
| **U10** | Task 23 | Final gates + the exit record | Every criterion in "Definition of done" satisfied | cheap |

---

## U9 — the scrub, and why it is only semi-autonomous

210 findings across **105 comment blocks / 859 lines**. Measured: **79 of 210 flagged lines
(38%) have unbalanced parentheses**, so per-line editing is wrong for over a third; **6 are not
comments**, of which two are runtime `throw` strings (`chain/replay.ts:136`, `config.ts:140`).

The decision procedure, applied per **block** (never per line):

- **R0 — block scope.** Edit the whole comment block, never a single line. Load-bearing: 38% of
  flagged lines are mid-expression.
- **R1** — the citation supports a **reason**: keep the reason, drop the pointer.
- **R2** — the citation is the whole content: delete the comment.
- **R3** — the citation names a decision this repository holds: re-cite as `SPEC §N` or
  `DECISIONS.md`.
- **R4** — a runtime string, not a comment: rewrite the message; it is user-facing.
- **R5** — the citation is the **subject** of the block (the block exists to record a deviation
  from, or reconciliation with, an external document): rewrite as a self-contained statement of
  what the code does and why, with no external referent. **If that cannot be done in one
  sentence, ROUTE TO HUMAN.**
- **R6** — a WHEN-claim ("arrives at slice N"): becomes a SPEC-section reference if §8/§9.1/§12
  names the field, else "not built in this build" plus the lifting section. **Never** a
  build-order ordinal.

Honest bound: on a deterministic sample this procedure resolved roughly **half** cleanly. R5's
routing arm is therefore expected to fire, and U9 is budgeted for it. **A green scan does not
prove the reasons survived** — that is why the token grep is a separate gate.

---

## Halt discipline

**Halt budget: three unplanned halts across U1–U10.** On the fourth, do not ask a fourth
question — stop and return a *plan-revision proposal* instead.

**MUST halt** (each mechanically detectable):

1. A byte-stability digest mismatches. **Never repair by editing the literals** — it is either a
   U1 defect or a real byte incompatibility, and telling those apart is adjudication. This is
   the one gate where the normal fix loop destroys the evidence.
2. A test the plan says must be RED passes instead. A vacuous test is worse than a missing one.
3. Overturning any inherited pinned assertion beyond the ONE authorized in D6.
4. Any edit to `docs/concept/` becomes necessary.
5. `contract-scan` count moves **up**, or the forbidden-token count moves up outside U2's
   expected 1 → 25.
6. A review finding is labelled **plan-mandated**.
7. An implementer returns BLOCKED twice on the same unit.
8. A decision arises with no ruling in the table above.

**MUST NOT halt:**

- `contract-scan` failing at 210 (expected until U9) or the token grep at 1/25 (until U9).
- The `ExpiredPayload` lint error under `--error-on-warnings` (a known U9 item).
- Any Minor review finding — ledger it, do not loop.
- Fix rounds up to the skill's cap of five.

**A halt message must contain:** the unit, the exact gate output, the plan text it collides
with, what was already tried, and two or three named options with their costs. A halt that
makes the human re-derive the context has failed.

---

## Definition of done

Every criterion is a command whose output is compared, not a judgment:

- `pnpm typecheck` → clean.
- `npx biome check --error-on-warnings .` → exit 0.
- `pnpm test` → all adopted tests plus the local suite pass, zero skips.
- `node scripts/contract-scan.mjs` → **exit 0**.
- The forbidden-token grep → **zero hits**.
- `git diff` `!`-grep over the whole branch → nothing.
- The refusal registry is **10 codes** and compiler-total.
- The four byte-compatibility digests reproduce byte-for-byte.
- An adjacent-pair order test exists for every jointly-constructible consecutive-rung pair.
- `git diff --stat e97ce96 HEAD -- docs/concept/` shows **only** the authorized section 4 / 2.1 hunks.
- No maturity marker moved — record the absence as a decision, not an omission.

**The exit record** lands at `docs/process/implementation-status.md` (deferral register entry 8;
it cannot live in `docs/concept/`, which is sealed). It exists because build-order steps 2–6
move **zero** maturity markers, so the inherited "spec-moves-to-truth at every exit" discipline
is vacuous for five consecutive steps and needs a substitute. Format: one row per build step —
step, what landed *here*, the commit range, the gate outputs at exit, and what is explicitly
still outstanding.

---

## Handoff to Phase 2a

Decisions due before the store increment begins, per the earlier plan's roadmap: the substitute
exit artifact (satisfied above), the sweep surface (SPEC §12 says the operator iterates
`listDue`; the inherited code ships it as a library call, and the surface follows the spec),
and whether the adapter kit is exported — which the conformance suite forces. Deferral entry 4's
trigger fires when the second workspace package lands.

---

## Known-open, deliberately

- **Register entry 9** — the effect-seam pair remains permanently held. Closure is Phase 2a's
  `seal()` or Phase 3's `confirmToRedeem`.
- **The provenance-leak disposition** — whether to extend `contract-scan.mjs` with a name pattern
  (which moves the 210 baseline entry 7 pins) or handle it as a U9 line item plus an out-of-band
  grep. This plan takes the second; the first remains an owner call.
- **A concept-set conflict** — `CONTROLS.md:46` calls recovery a "profile-conditional field",
  while SPEC §9.1's field table has no such row and §2/§9 describe `supersedes` purely as an
  `open()` argument. Doc-vs-doc divergence inside a sealed set: a finding, not a wording nit,
  and only the owner can rule it.
