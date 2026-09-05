# Review Hardening Implementation Plan

> **For agentic workers:** this plan is executed directly in the authoring session (no
> subagents). Steps use checkbox (`- [ ]`) syntax for tracking. Red is observed before green
> wherever the design says "red first".

**Goal:** Land the five small findings the 2026-09-05 external review surfaced that the
repository's own rules already call for — construction loudness for the named shapes, a
never-inert `terminalRefusals`, one clock read in the redemption prologue, the canonicalizer
totality contract pinned, four nits — plus the guide sentences and the record entries the
design names.

**Spec:** `docs/superpowers/specs/2026-09-05-review-hardening-design.md` — its eight rulings
and its STOP envelope bind every task.

**Tech Stack:** TypeScript (strict), vitest, Biome, the repo's gate scripts, pnpm 11.18.0
via the local binaries.

## Global Constraints

- **Branch:** `review-hardening-2026-09-05` off `main` at `ad97401`. Confirm with
  `git branch --show-current` before every commit.
- **Commits:** message via a BOM-free temp file and `git commit -F`, ending with the exact
  line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- **Run biome in every task that edits a file.**
- **STOP, absolute:** `docs/concept/**`, `packages/record/test/byte-stability.test.ts`,
  `packages/record/src/index.ts`, `packages/store-postgres/**`, both manifests, any
  existing `PINNED_` literal. No push.
- **A pin that flips is a STOP** — argue it at the pin and number it before it lands
  (design §4 expects none).
- **Measured figures are measured, never copied.**

---

### Task 1: Construction loudness and a never-inert `terminalRefusals`

**Files:** `packages/record/src/refusal-codes.ts` (export the never-appends set),
`packages/record/src/config.ts` (validators), `packages/record/test/construction-validation.test.ts`.

- [x] Write the pins listed in design §5 for rulings 1 and 2; run the file; observe red.
- [x] `refusal-codes.ts`: export `NEVER_APPENDS`; its comment names the new consumer.
- [x] `config.ts` `validateLeg`: after the registry check, reject never-appends members,
      `chain-compromise`, and duplicates, each with its own message.
- [x] `config.ts` `validateProfile`: id non-empty and `legs` an array before anything reads
      them; leg ids non-empty in the existing loop; `captureMode` enum right after.
- [x] `validateBounds`: `expiry` must be `'none'` or a non-null object before destructuring.
- [x] `validateSodShape`: `notActorOf` must be an array before `.length`.
- [x] `validateFindingsFlow`: `ackMode` enum after the both-or-neither check.
- [x] Run the file green; run the whole record project; biome; commit.

### Task 2: One clock read in the redemption prologue

**Files:** `packages/record/src/kernel/redeem.ts`, `packages/record/test/clocks.test.ts`.

- [x] Write the straddling-clock enlisted `redeem` pin (design §5); observe the red throw.
- [x] `redeem.ts` prologue: take `now()` once ahead of the state block; hand the same
      `Date` to `dueNow` and `resolveDueClock`; update the comment.
- [x] Green; whole record project; biome; commit.

### Task 3: The canonicalizer totality contract

**Files:** `packages/record/src/canonical.ts` (type comment), new
`packages/record/test/canonicalizer-totality.test.ts`.

- [x] Write the two pins with a header that says they are green from the first run and why.
- [x] Extend the `Canonicalizer` type's comment with the totality sentence.
- [x] Green; biome; commit.

### Task 4: The four nits

**Files:** `packages/record/src/kernel/consultations.ts`, `packages/record/src/canonical.ts`,
`packages/record/src/probes/probes.ts`, `packages/record/src/kernel/expiry.ts`.

- [x] `as never` → `as IdentityAssertion`; module-level `TextEncoder`; first-character flip
      in the tamper probe; `lastOfKind` index loop in `expiry.ts`.
- [x] Whole record project green (byte-stability untouched and green is the proof); typecheck;
      biome; commit.

### Task 5: Documents and exit

**Files:** the list in design §6.

- [x] Guide edits (api-reference annotations + verifier sentences; integrating totality
      bullet + SQLite bound).
- [x] CHANGELOG Changed and Fixed entries.
- [x] Register row 23 widening; next-phases sanction-gated entry and the post-0.1 paragraph.
- [x] Analysis record `docs/analysis/2026-09-05-external-code-review.md`.
- [x] implementation-status increment section; INDEX.md row and counts; CLAUDE.md count.
- [x] All gates: typecheck, lint:strict, contract-scan, api-sync, docs-index-sync, test:ci +
      `node scripts/ci-assert-tests.mjs .vitest-results.json`. Write the figures from output.
- [x] Commit. Report: branch unmerged, unpushed.
