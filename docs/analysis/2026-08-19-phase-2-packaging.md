# Phase 2 — packaging and build: the tooling half of register row 1

**Date: 2026-08-19.** The phase-2 session of the release plan
(`docs/analysis/2026-08-18-release-phase-brainstorm.md`), run after phase 1 fixed the
exports-map shape. Four rulings by the repository owner, plus one stated-and-unobjected
posture; everything below landed in this increment except the publish itself, which is the
release event by phase 0's own ruling.

## The rulings

1. **Emit is tsc-only.** `packages/record/tsconfig.build.json` — src only,
   `declaration: true`, `outDir: dist`, extending the base config whose `noEmit` stays
   true for the typecheck path. No bundler: a Node library needs none, the published JS
   maps one-to-one onto source structure (which the `./probes` subpath relies on), and the
   zero-extra-tooling stance holds.

2. **The manifest landed now; `private: true` is the sole release-day gate.**
   `packages/record/package.json` carries `exports` (`.` and `./probes`, each with
   `types`), a top-level `types`, `files` (`dist` + the LICENSE copied into the package),
   `sideEffects: false`, `license: Apache-2.0`, `author: The Vidimera Authors` (phase 0's
   identity ruling), `repository` (with `directory`), `engines` (`>=22.16` — the floor
   itself re-evaluated at release day per phase 0), and a `build` script. `npm pack` works
   under `private: true` — only publish is blocked, which is exactly the flag's job here.

3. **The packed-tarball smoke test runs on every CI push.** `pnpm smoke`
   (`scripts/smoke-pack.mjs`): builds, `npm pack`s into a temp dir, installs the tarball
   into a fresh scratch project, and runs a consumer script that imports
   `@vidimera/record` and `@vidimera/record/probes` through the exports map and drives a
   stage → open → finalize → verify round trip, checking the pure and the handle forms of
   both audit functions. This is the one test category the vitest suite structurally
   cannot cover — its 625 tests all import `../src/*.js` and never see the artifact.
   First run: green (4 transitions, confirmed + intact, 17 probes through `./probes`).

4. **Versioning and release are manual-with-a-workflow.** `version` stays `0.0.0` until
   the cut, bumped by hand to `0.1.0` with a `v0.1.0` tag; publishing runs only through
   the dispatch-only `.github/workflows/release.yml` — every repository gate, then build,
   smoke, and `npm publish --provenance --access public`, behind a guard step that refuses
   a package still carrying `private: true` or `0.0.0`. No changesets: one package today,
   and the hand-written CHANGELOG keeps its own voice; revisit when the row-15 adapter
   package lands. The workflow needs the `NPM_TOKEN` repository secret and the registered
   `@vidimera` npm scope — both release-day checklist items beside phase 0's
   (private-reporting setting, floor re-evaluation, CLAUDE.md skim, drop `private`).

**The stated posture:** the package is ESM-only (`type: module`, NodeNext with explicit
`.js` specifiers). No CJS build exists or is planned; the bound is stated wherever
installation is documented.

## Register row 1's standing

The row's deferred item is "Publish tooling (build, versioning, release)". The tooling has
landed; the row **stays open** until the release workflow is exercised once at the 0.1
cut — an authored-but-never-run publish path does not meet this repository's own bar for
"landed behavior", and the row is the right place to hold that. Release day, in order:
bump the version, drop `private: true`, commit, tag `v0.1.0`, dispatch the workflow.

## What moved with this increment

CI gained `pnpm build` and `pnpm smoke` steps; `README.md`, `CHANGELOG.md` (which was also
carrying a stale row-6 bullet from before the API review — corrected here),
`docs/guide/getting-started.md`, `docs/guide/api-reference.md`,
`docs/guide/integrating.md`, `docs/process/implementation-status.md` (a dated update
paragraph under its consumability section, whose original text stays as the exit record),
`docs/process/next-phases.md`'s row-1 status, and `CLAUDE.md`'s commands and honest-bound
paragraphs were all synchronized to the new truth in the same change.

## What this phase deliberately did not do

No publish (`private: true` stands); no CI matrix change (the floor and non-Linux
platforms are phase 3's session); no second package (row 15 is phase 4); no store
signature movement. The workspace development flow is unchanged — tests and the guide
still run from source; `dist/` exists only when built and stays gitignored.
