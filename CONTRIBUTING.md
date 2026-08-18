# Contributing to Vidimera

Thank you for considering a contribution. This document is short, but most of it is about
rules you could not guess from convention — read it before opening a pull request, because
several of them are hard gates that CI or a maintainer will enforce.

## Setup

Requires Node 22.16+ and pnpm. `pnpm@11.18.0` is pinned in `package.json`, so
`corepack enable` is the intended path; if corepack is unavailable on your machine,
`npm install -g pnpm` works too.

```text
pnpm install
```

## The gates

Every pull request must pass all of these — CI runs them on every push to `main` and every
PR:

```text
pnpm typecheck      # tsc strict, no emit
pnpm lint           # Biome (pnpm lint:fix applies safe fixes)
pnpm test           # vitest — the suite runs with zero skipped tests, keep it that way
pnpm contract-scan  # the standalone-contract scan (see below)
```

CI additionally runs `pnpm lint:strict` (`biome check --error-on-warnings`), so a warning
that `pnpm lint` merely reports will fail CI.

The **zero-skips discipline** is deliberate: a skipped test is a claim with no gate behind
it. If a test cannot run in some environment, the design question is why, not how to skip
it.

## The standalone contract

This repository's documentation set references nothing outside the repository. That is a
scanned, enforced contract, not a style preference: `pnpm contract-scan`
(`scripts/contract-scan.mjs`) fails the build on findings. In practice:

- **No external URLs in tracked markdown or TypeScript.** The one exception is
  `example.com` and its subdomains, used for the spec's worked examples (and `CLAUDE.md`
  itself is excluded from the scan). Name outside things; do not link them.
- **No pointers into documents that do not exist here.** Tracked code must not reference a
  foreign numbering scheme (design sections, slice/task/open-question numbers) or carry
  bare commit hashes at all — the scan cannot tell whose git history a hash points into,
  so none belong in code.
- **Citations in code must resolve.** A `SPEC §N` in a comment must name a section that
  exists, and a quoted phrase attached to a citation must occur in the document it is
  attributed to. The script's citation-integrity section carries a bounds list naming what
  it deliberately does not check — read it before treating a green scan as full coverage.
- **Markdown is not citation-checked.** A wrong citation in a process document or guide has
  no gate behind it and must be hand-verified. Standing trap: a quoted phrase that wraps a
  line break in the source is invisible to a naive `grep -F` — verify against a
  whitespace-collapsed copy before declaring a quotation missing.

New files count: the scan reads tracked files, so `git add` your files before trusting a
clean run.

## Hard rules

These are the rules that make this repository unusual. Violating them is the fastest way to
have a PR declined.

1. **`docs/concept/` is sealed.** The ten concept documents are read, quoted, and never
   edited. Every edit since the set was sealed — marker moves and corrective un-seals
   alike — was licensed by its own explicit sanction through the scope machinery in
   `docs/concept/SCOPING-GUIDE.md` §§1–2, and each sanction was spent at the increment it
   covered. A PR that touches `docs/concept/` without a fresh, explicit sanction argued
   through that machinery will be declined regardless of merit.
2. **`docs/concept/SPEC.md` is the single normative document.** Everything else — including
   the code — is downstream. Where code and spec differ, one of them is wrong and the
   difference is a *finding* to be reported and recorded, never silently reconciled in
   either direction.
3. **A change to the four principles or the honesty discipline is a fork, not a PR.**
   Graduated honesty, fidelity-not-validity, human anchor, identity-by-transport
   (`docs/concept/CONCEPT.md` §4–§5) are non-negotiable in this repository. A project that
   wants different principles forks knowingly; it does not amend them here.
4. **The byte-stability digests are an oracle, not an assertion.** The frozen digests in
   `packages/record/test/byte-stability.test.ts` pin the minimal chain's exact bytes. If
   your change makes them mismatch, the minimal chain's bytes moved — that is a finding to
   investigate (the test's own header names what a mismatch can mean), never a constant to
   update so the test goes green.
5. **Feature guards from day one.** An unimplemented capability throws at construction
   (`packages/record/src/config.ts`) until its real behavior lands — and the guard lifts in
   the *same commit* as that behavior, never before.
6. **Never silently invert a pinned assertion.** The test corpus records decided stances.
   Changing what an existing test pins requires an explicit, argued authorization at the
   test site, recorded in `docs/process/implementation-status.md` — this has happened, and
   every instance is written down.
7. **Deferrals get register rows.** Consciously deferred work goes in
   `docs/process/deferral-register.md` with the trigger that un-defers it. A row leaves the
   table only when the behavior lands or the deferral is explicitly retired. Row numbers
   are stable identifiers; a new row takes the next number never yet used.
8. **Gate-order changes get adjacent-pair tests.** The finalize gate ladder's precedence is
   pinned by an explicit order test for every jointly constructible adjacent gate pair. A
   change to the ladder carries the tests that pin the new order.
9. **Editorial voice.** Every guarantee is stated with its limit in the same breath. Never
   "non-repudiation." Never a compliance claim. Domain examples stay generic. This binds
   documentation, comments, and API names alike.

## Dependencies

`@vidimera/record` currently has **zero runtime dependencies** — it uses `node:crypto` and
`node:sqlite` from the platform. Adding a runtime dependency is a design decision with a
rationale, not a convenience; expect to argue it.

When touching runtime-API usage, remember the declared floor is Node 22.16: verify the API
exists at that version, not just on your machine — CI's Node version does not necessarily
test the floor.

## Making a change

1. Open an issue (or a draft PR) describing the problem before investing in a large change —
   especially anything touching the spec's semantics, the store contract, or the public
   surface. The pre-0.1 naming review (deferral register row 6) is still open, so surface
   naming is deliberately unsettled.
2. Write the test first where practical; the suite is the repository's memory.
3. Keep increments small and focused — this repository was built one cluster per increment,
   and reviews assume that shape.
4. Run all the gates locally before pushing.
5. Do not commit generated artifacts, and do not update `docs/process/` records casually —
   `implementation-status.md` is an authoritative record with its own conventions; propose
   edits to it explicitly in the PR description.

## Where things live

| Path | What it is |
|---|---|
| `docs/concept/` | The sealed ten-document concept set — `SPEC.md` is normative |
| `docs/guide/` | The public usage guide — derived from source; source wins on conflict |
| `docs/process/` | Living records: implementation status, deferral register, next phases, provenance |
| `docs/superpowers/` | The increment record: design specs and implementation plans per increment (a few plans carry no spec) |
| `packages/record/` | The implementation and its test suite |
| `scripts/` | Repo tooling, including the contract scan and its own test |

## Conduct and security

Conduct expectations are in `CODE_OF_CONDUCT.md`. Security reports go through
`SECURITY.md` — never a public issue.
