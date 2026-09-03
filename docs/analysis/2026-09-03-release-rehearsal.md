# The release-day rehearsal (2026-09-03)

A dated record. The release checklist (`docs/process/release-checklist.md`) had been repaired
twice on paper and executed never. On 2026-09-03 its "File changes" section was executed as
written on a throwaway branch (`release-rehearsal`, cut from `main` at `74a5828`, pushed,
dispatched, then deleted — nothing merged from it), and the release workflow was dispatched in
dry-run mode against the result. This is what the checklist did and did not survive.

## What was done, in the checklist's order

1. **Versions bumped** to `0.1.0` in both manifests; **`private: true` dropped** from both.
   `pnpm install --frozen-lockfile` still passed on the branch, locally and on the release
   runner — the lockfile records the adapter's dependency on record as a path, so a version bump
   does not move it (the 2026-09-01 gaps record said so; the rehearsal confirms it).
2. **CHANGELOG cut**: a `[0.1.0] - 2026-09-03` section, `[Unreleased]` above it reading
   "Nothing since 0.1.0.", the preamble flipped, the "Known not-done" bullet flipped to the
   registry-side proof that remains after a cut.
3. **The docset flip recipe.** Tier 1 before: **16 hits in 9 files** — the worked example's
   numbers exactly, two days on. Tier 1 after the flips: **empty**. Tier 2 before: 22; after:
   16, every one read and ruled to stay (the list is below).
4. **README headline snippet** (`import { create, MemoryStore } from '@vidimera/record'`):
   literally true for an adopter once published; the smoke test proves the same resolution
   from the packed tarball on every run.
5. **The CLAUDE.md skim**: the honest-bound paragraph rewritten to the published state; no
   other private-workflow residue found.
6. **Every gate, locally**: typecheck; the suite, 870 tests in 69 files, zero skips, through the
   report gate; build; smoke, whose line read `peer range ^0.1.0` — the lockstep rewrite,
   proven; strict lint; contract scan; api-reference sync; docs-index sync. No tag.
7. **The dry run**, dispatched against the branch: run 33718633361, green. The guard ran and
   **passed** on the release shape (no refusal in its log), every gate ran, both publish steps
   were skipped, and the pack step produced `vidimera-record-0.1.0.tgz` and
   `vidimera-store-postgres-0.1.0.tgz`.

## What did not go as written

- **The checklist contradicted itself on one CHANGELOG line.** The CHANGELOG item says the
  publish-tooling entry's narration ("The package stays `private: true` until the 0.1 cut by
  design") "stays as written — rule on it, do not flip it"; the recipe item says tier 1 "must
  come back EMPTY". The narration matches two tier-1 patterns (`private: true` and `until the
  0\.1 cut`), so both instructions cannot hold. The rehearsal resolved it by rewording the
  narration in the past tense without the literal patterns — "The manifests kept their private
  flag until this cut, by design." — which keeps the entry's own account and empties tier 1.
  The checklist now says so (amended the same day).
- **A stale count hid inside a caveat.** `docs/guide/getting-started.md`'s honest-precondition
  paragraph still said "its own 750-plus tests"; the flip replaced the number with "its own
  suite". The flip sites are where stale numbers live, because they are the sentences nobody
  reads twice.
- **The guard's dry-run verdict is in the log, not the badge.** With `continue-on-error` on the
  dry-run input, a refusing guard shows the step as *success* in the API and the UI, with a
  warning annotation; only the log carries `refusing to publish … private is still true` and
  the `exit code 1`. On the release-shaped branch the same step passed with no refusal. A
  reader of a dry run must open the guard step, not trust its colour. The checklist's
  pre-flight box now says so.

## The tier-2 rulings, all "stays"

Every remaining tier-2 hit is a sentence that is true for a reader inside this repository or a
historical statement, and the wrong sentence for no one:

- `CHANGELOG.md:64` and `CONTRIBUTING.md:132`, `docs/guide/api-reference.md:6`,
  `docs/guide/faq.md:109`, `docs/guide/integrating.md:6` — "the pre-0.1 API review", a dated
  event.
- `CONTRIBUTING.md:149`, `docs/guide/api-reference.md:3` — the guide is "derived from source",
  a property of the document, not of the package.
- `README.md:157` — the review's ratified-names sentence, kept inside the flipped paragraph.
- `docs/README.md:28`, `docs/guide/getting-started.md:8` — "inside this repository you still
  run from source", written by the flip itself.
- `docs/guide/api-reference.md:471`, `docs/guide/integrating.md:48` — "this workspace's" second
  package, a description of the repository.
- `docs/guide/api-reference.md:531`, `docs/guide/integrating.md:539`, `:544`, `:545` — the
  probe tier's deep import inside the workspace, beside the statement that the `./probes`
  subpath is what an adopter uses.

## The flipped sentences, as a worked example for release day

The branch is gone; the text is here so release day copies and re-verifies instead of
re-deriving. Each is the rehearsal's wording against the 2026-09-03 tree — re-read every site
on the day, since the surrounding prose will have moved.

- **CHANGELOG preamble**: "**The first release is 0.1.0 (2026-09-03).** Everything the build
  order and the post-build-order increments landed sits in that section, recorded by
  build-order step rather than by date; `Unreleased` above it holds what has landed since." —
  then the existing sentence about the status document winning on conflict.
- **CHANGELOG publish-tooling narration**: "The manifests kept their private flag until this
  cut, by design."
- **CHANGELOG "Known not-done"**: "The registry-side proof: the published artifacts are proven
  from the tarballs so far (the first-use workflow's tarball source); its `source: registry`
  dispatch against 0.1.0 is the checklist's own verification item after this cut. Deferral
  register row 1 retires with the release workflow's first real run, which this cut is."
- **README status paragraph**: "**Published, in the same breath, with its limits.**
  `@vidimera/record` and `@vidimera/store-postgres` are on npm at 0.1.0, in lockstep — `npm
  install @vidimera/record`, Node 22.16 or newer." — then the tooling sentence unchanged in
  substance, "Publish tooling was row 1 of the deferral register, retired at this cut", the
  review sentence as it stood, and "The store contract's signatures stay explicitly
  provisional until 1.0, by the sealed set's own declaration."
- **SECURITY.md supported versions**: a one-row table — `0.1.x`, "Yes — the only released
  line; fixes ship as the next patch release" — then "`main` is where security fixes land
  first. If you build on this source directly rather than on the published packages, you are
  tracking `main` and its fixes at your own pace."
- **docs/README.md**: "Know before you start: the packages are published at 0.1.0 (`npm install
  @vidimera/record`); inside this repository you still run from source."
- **api-reference.md header caveat**: "… and is published at 0.1.0 — inside this repository you
  still import from `packages/record/src/index.js`, and the `@vidimera/record` forms shown
  here resolve from the published package exactly as they did from the packed tarball."
- **faq.md "Is it production-ready?"**: "Published at 0.1.0, with one stated limit." — the
  behaviors sentence as it stood; "the build, `exports` map, CI-exercised tarball smoke test,
  and dispatch-only, provenance-attested release workflow all ran for the cut
  (deferral-register row 1 retired with it). The limit: the store contract's signatures are
  explicitly provisional pre-1.0 …"; and the closing sentence "Saying hello in an issue is
  still how this repository learns that a first external consumer exists."
- **getting-started.md precondition**: "`@vidimera/record` is published at 0.1.0 — `npm install
  @vidimera/record` on Node 22.16 or newer is the adopter's path, and
  `packages/record/README.md` carries the one-line warning story below Node 24.15. This guide
  runs it from source, inside this repository's workspace, which is exactly how its own suite
  runs; every `@vidimera/record` form resolves the same way from the published package."
- **packages/record/README.md status**: "**Status: published — 0.1.0.** The first release; the
  store contract's signatures stay provisional until 1.0, by the concept set's own
  declaration."
- **packages/store-postgres/README.md status**: "**Status: published — 0.1.0**, in lockstep with
  `@vidimera/record`, which it peer-depends on; install both."
- **CLAUDE.md honest bound**: "Both packages are published at 0.1.0, in lockstep:" — the
  tooling list as it stood, "and the dispatch-only, provenance-attested release workflow ran
  for the cut, retiring register row 1"; the precondition and floor-rule sentences in the past
  tense; "the registry-side first-use dispatch (`source: registry`) is the checklist's own
  verification item after the cut."

## Bounds

The rehearsal proves the checklist's file changes and the release job's structure against the
2026-09-03 tree. It proves nothing about the publish, the provenance attestation, the token,
the registry, or the tree release day will actually cut; the worked example above is a
starting point that must be re-verified site by site, and the recipe — not this list — is
what release day runs. The rehearsal did not perform the checklist's owner acts, its floor
rule and entry-point decisions, or its post-publish paperwork.
