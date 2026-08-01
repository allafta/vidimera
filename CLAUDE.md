# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## What this project is

A **standalone concept-inheritance documentation set** for a domain-agnostic
verifiable-decision-record library (Vidimera): ten self-contained markdown documents that
present the Vidimera concept whole, at its deliberate embedded, operator-only scope — the
proven kernel, the profile-declared governed controls, sketched upgrades, and the
operator-assurance tier. The operator is the sole consumer of the records; capabilities
meaningful only to an outside party are out of scope by design. There is no code yet; the
documents are the deliverable and the seed.

## The standalone contract

The set's hard rule: **the documents reference nothing outside this repository.** No external
repos, files, projects, commits, or internal development history — the concept stands on this
text alone. Generic mention of "a reference implementation" is permitted; naming, pathing, or
dating one is not.

## The document set

`README.md` is the front door and maps all ten documents. The load-bearing structure:

- **`SPEC.md` is the single normative document.** Every other document is downstream and
  defers to it; fix conflicts in the other document unless the spec itself is being
  deliberately revised.
- `CONCEPT.md` holds the identity: the purpose statement, the **four non-negotiable
  principles** (graduated honesty, fidelity-not-validity, human anchor,
  identity-by-transport), the honesty discipline, and the anti-goals. A change that touches
  the principles or honesty discipline is a **fork of the concept**, not an edit — it must be
  called out as such, never slipped in.
- `CONTROLS.md` / `SCOPING-GUIDE.md` carry the scope machinery (tier test, promotion rule
  with purpose-trace, rescoping checklist). Scope changes to the concept go through that
  machinery and get recorded.
- **Maturity markers are accuracy claims.** `[PROVEN]` / `[DESIGNED]` / `[SKETCHED]`
  (legend in `README.md`) must stay truthful: `[PROVEN]` speaks to a reference
  implementation of the spec; once this project starts building, a marker moves only when
  the behavior actually lands in this repository.
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
