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

Docs-only repo; git is the only tooling. The one check that matters — the **standalone
contract scan** (run before any commit that edits the documents; it must return nothing):

```powershell
git grep -nE "\.\./|docs/adr|https?://(?!.*example\.com)" -P -- "*.md" ":(exclude)CLAUDE.md"
```

(The pattern targets generic leak vectors — relative paths escaping the repository,
ADR-style internal references, and external links other than the spec's own
`example.com` worked examples. A maintainer working alongside other private repositories
should extend the pattern with those projects' names, package names, and tooling.)

When this project grows code, add its build/test commands here and keep this file the honest
record of how to work in *this* repo.
