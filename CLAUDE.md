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
  the concept in the proven build order (`docs/concept/SCOPING-GUIDE.md` §7). Currently a
  walking skeleton — no build-order increment has landed yet.

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
  patterns with those projects' names, package names, and tooling.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, test, and contract-scan on every
push to `main` and every pull request, with read-only token permissions and one
cancel-on-supersede concurrency group per ref.

## Process disciplines (inherited from the concept)

From `docs/concept/SCOPING-GUIDE.md` §7, binding on implementation work here:

- One cluster per increment; **spec-moves-to-truth** at every increment's exit (a
  maturity marker moves only when the behavior lands in this repository).
- Feature guards from day one — an unimplemented capability throws at construction
  (today `create()` itself throws: walking skeleton, nothing implemented).
- Byte-stability pins and adjacent-pair gate-order tests, from the kernel increment on.
- The living deferral register: `docs/process/deferral-register.md`.
