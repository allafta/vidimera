# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## What this project is

The home of **Vidimera** — a domain-agnostic verifiable-decision-record library — in two
parts:

- **The concept set** (`docs/concept/`): ten self-contained markdown documents that
  present the Vidimera concept whole, at its deliberate embedded, operator-only scope —
  the proven kernel, the profile-declared governed controls, sketched upgrades, and the
  operator-assurance tier. The operator is the sole consumer of the records; capabilities
  meaningful only to an outside party are out of scope by design.
- **The implementation** (`packages/`): a TypeScript pnpm-workspace monorepo implementing
  the concept in the proven build order (`docs/concept/SCOPING-GUIDE.md` §7). Build-order
  step 1 — the kernel — was adopted from a reference implementation of the same spec and
  **has reached its exit**; `packages/record/src` is real code today, not a skeleton, and
  `create()` is implemented and exercised by a full suite with zero skips. A base-vs-head
  provenance audit (`docs/process/adopted-source-provenance.md`) found ten fixes the
  reference project had already made that this build had not taken; the nine that were
  genuinely applicable are now applied, and the tenth was reclassified as a local
  improvement rather than an inherited fix (see that document). The remediation plan's
  units R1–R5 (`docs/superpowers/plans/2026-08-03-step-1-remediation.md`) are all
  complete. Step 2 — the store, for real — is **started and has not exited**: two
  increments have landed the atomic `appendBatch`, `listDue`, §12's
  `{ nonTerminal, dueAt? }` meta shape on both append seams, the C4 seal-finality bar,
  and the operator-only `seal()` chain-retirement seam with its derived
  `active`/`retired` status — all still inside the one in-memory backing, which is why
  the step has not exited. **`docs/process/implementation-status.md` is the authoritative
  account** of what this build does and does not implement, section by section, with the
  gate outputs and the outstanding list — read it rather than trusting a count here,
  which is a claim with a shelf life and no way to fail loudly. Seven of the eight
  build-order steps remain, and the package is not consumable by a host today.

## The standalone contract

The concept set's hard rule: **the documents reference nothing outside this repository.**
No external repos, files, projects, commits, or internal development history — the concept
stands on this text alone. Generic mention of "a reference implementation" is permitted;
naming, pathing, or dating one is not. All newly authored markdown in this repository
(README, process docs, specs, plans) stays free of external URLs so the repo-wide scan
keeps holding.

## The document set

`docs/concept/README.md` is the set's front door and maps all ten documents. The
load-bearing structure:

- **`docs/concept/SPEC.md` is the single normative document.** Every other document is
  downstream and defers to it; fix conflicts in the other document unless the spec itself
  is being deliberately revised. Code implements the spec; where code and spec differ,
  one of them is wrong and the difference is a finding, never silently reconciled.
- `docs/concept/CONCEPT.md` holds the identity: the purpose statement, the **four
  non-negotiable principles** (graduated honesty, fidelity-not-validity, human anchor,
  identity-by-transport), the honesty discipline, and the anti-goals. A change that
  touches the principles or honesty discipline is a **fork of the concept**, not an
  edit — it must be called out as such, never slipped in.
- `docs/concept/CONTROLS.md` / `docs/concept/SCOPING-GUIDE.md` carry the scope machinery
  (tier test, promotion rule with purpose-trace, rescoping checklist). Scope changes to
  the concept go through that machinery and get recorded.
- **Maturity markers are accuracy claims.** `[PROVEN]` / `[DESIGNED]` / `[SKETCHED]`
  (legend in `docs/concept/README.md`) must stay truthful: `[PROVEN]` speaks to a
  reference implementation of the spec; a marker moves only when the behavior actually
  lands in this repository.
- Editorial voice: every guarantee is stated with its limit in the same breath; never
  "non-repudiation"; never a compliance claim; domain examples stay generic.

## Commands

pnpm workspace (Node 22+, pnpm via corepack):

- `pnpm install` — install dev dependencies
- `pnpm typecheck` — tsc strict, no emit
- `pnpm lint` — Biome (`pnpm lint:fix` to apply safe fixes)
- `pnpm test` — vitest, all packages
- `pnpm contract-scan` — the **standalone contract scan**: run before any commit that
  touches markdown or TypeScript. Prints nothing and exits 0 when clean; prints
  `path:line:text` and exits 1 on findings (`scripts/contract-scan.mjs`). Scans all
  tracked `*.md` except this file, and all tracked `*.ts`/`*.mts`/`*.cts`: external-link
  and ADR-style checks repo-wide; the escaping-relative-path check on the concept set and
  root README, where self-containment is the contract (a document-only check — a
  TypeScript relative import stays legal). Tracked code is additionally checked for
  pointers into a design-document, slice/increment, task and open-question numbering
  scheme that has no counterpart here (`design §4`, `slice 7`, `Task 5`, `OQ2-10`) — such
  a reader-unresolvable pointer is an external reference in the contract's sense. A
  maintainer working alongside other private repositories should extend the script's
  patterns with those projects' names, package names, and tooling. **Exits 0 today, zero
  findings** — the imported kernel's comment scrub that rewrote every reference-project
  pointer is complete. The scan also **resolves** citations in tracked code: a `SPEC §N`
  must name a section that exists, and a quoted phrase attached to a citation must occur
  in the document it is attributed to. That resolver ships with a bounds list in the
  script's own header naming what it deliberately does **not** check — read it before
  treating a green scan as coverage. **Markdown is not citation-checked at all**, so a
  wrong citation in a process document, plan or README has no gate behind it and must be
  hand-verified against a whitespace-collapsed copy of the source: a quoted SPEC phrase
  that wraps a line break is present in the source and invisible to a naive `grep -F`,
  which is a standing trap here and has repeatedly produced false "missing quotation"
  findings. A reader should diff a new run's output, never just compare totals, before
  treating any red result as a regression — a scan total moving has hidden an equal-sized
  regression in the opposite direction here before.

CI (`.github/workflows/ci.yml`) runs typecheck, test, lint, contract-scan, and the
stricter `lint:strict` (`biome check --error-on-warnings`) on every push to `main` and
every pull request, with read-only token permissions and one cancel-on-supersede
concurrency group per ref.

## Process disciplines (inherited from the concept)

From `docs/concept/SCOPING-GUIDE.md` §7, binding on implementation work here:

- One cluster per increment; **spec-moves-to-truth** at every increment's exit (a
  maturity marker moves only when the behavior lands in this repository). That exit step
  has **nothing to move** at steps 1–6: every section those steps build is already
  `[PROVEN]`, and the first draft-ahead marker that could come off is §10.2's `[DESIGNED]`
  at step 7. `docs/process/implementation-status.md` is the substitute exit record that
  can move, and each step's exit is written there — do not expect a marker change and do
  not manufacture one.
- **Inverting an inherited pinned assertion is authorized explicitly, never slipped in.**
  The kernel arrived with the reference implementation's test corpus; adopting a corpus
  and quietly changing what it pins is how a build drifts while its suite stays green. Two
  inversions have been authorized so far, both during the step-1 remediation, each argued
  in place at `packages/record/test/terminality.test.ts` and recorded in the exit record.
- Feature guards from day one — an unimplemented capability throws at construction
  (`config.ts` `validateProfile`; ten governed profile fields throw there). `redeem` is
  the eleventh governed capability: it throws at the call seam instead
  (`kernel/redeem.ts`), on a confirmed effect-seam record, rather than at construction.
  Neither throw nor a refusal releases the `(profile, subject)` pair such a record
  holds — the hold lives in the Store's C1 exclusivity, not in what `redeem()` returns or
  throws — so the throw is loud, not silent; real closure needs a later build step's
  redemption edge (SPEC §11.2) or a `confirmToRedeem` expiry edge (SPEC §9.1). `seal()`
  is **not** a release path: SPEC §12 admits it only against a derived-terminal record,
  and a final-leg `confirmed` on an effect-seam profile is non-terminal (SPEC §2). That
  last claim is no longer argued only in prose — now that `seal()` is built, it is pinned
  by an executing test in `packages/record/test/seal.test.ts`. Recorded in the deferral
  register (an earlier framing of this remedy was itself wrong and has been corrected
  there; the `seal()`-as-release half was a second error, found by the citation audit and
  corrected in the same place).
- Byte-stability pins and adjacent-pair gate-order tests, from the kernel increment on.
- The living deferral register: `docs/process/deferral-register.md`.
