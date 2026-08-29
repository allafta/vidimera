# First-use proof — design

**Date: 2026-08-29.** **A release-readiness increment. No sanction is needed and none is
sought.** Nothing in `docs/concept/` moves, no maturity marker moves, and no capability is
promoted. The increment adds one dispatch-only workflow and the consumer script it runs,
corrects two public sentences that a measurement has made stale, and records one run. It
changes no library behavior.

**The permitted edit envelope, stated as a STOP.** **No `packages/*/src/` file is touched.**
What lands: `.github/workflows/first-use.yml` (new), `scripts/first-use.mjs` (new),
`docs/guide/integrating.md` and `packages/record/README.md` (one sentence each),
`CLAUDE.md`'s CI paragraph (one sentence), `docs/analysis/2026-08-29-first-use-proof.md`
(new), `docs/superpowers/INDEX.md`, and `docs/process/implementation-status.md`. **Any
`packages/*/src/` edit, any `docs/process/release-checklist.md` edit, and any change to
`.github/workflows/ci.yml` or `release.yml` is a STOP** — the checklist, the stale tag, and
the pickup instructions belong to the next increment (approach B of the 2026-08-29
brainstorm), and the existing workflows are not this increment's to reshape.

**The register delta: none.** No row opens, none retires, none is restated. Row 1's trigger
(the release workflow's first exercise) does not fire here — this workflow publishes nothing.

**Where this sits.** The 0.1 cut was paused on 2026-08-19 with two engineering preconditions
still open: the clean-machine first-use pass, and the floor rule's evaluation. This increment
discharges the first by construction and takes the measurement the second needs; the
checklist itself is refreshed by the increment that follows, once this one's run exists to
point at.

## The gap, stated from the record

| # | Site | Says | What is true instead |
|---|---|---|---|
| 1 | `docs/process/release-checklist.md`, first precondition | "one documented, reproduced first-use pass from packed artifact to verified chain on a machine that never held this checkout" — unticked | The 2026-08-19 rehearsal ran on the development machine and said so; the CI smoke test runs in a scratch directory on a runner that checked the repository out, so the checkout is present on disk — the doubt the bar exists to remove. No run on a machine without the checkout exists. |
| 2 | `docs/guide/integrating.md:38-41` | "Node still flags `node:sqlite` as experimental and prints a warning" | True on Node below 24.15. `node:sqlite` moved to Stability 1.2 (release candidate) in Node 24.15.0 (2026-04-15; backport of the change that landed in 25.7.0), and that change removed the runtime `ExperimentalWarning`. Every adopter on the current LTS patch line sees nothing at import. The pause's measurement (24.12.0) and this machine's (also 24.12.0) both predate it. |
| 3 | `packages/record/README.md:26-29` | "Importing the package loads `node:sqlite` … `node --disable-warning=ExperimentalWarning` silences it" | Same as row 2: correct on Node below 24.15, stale as a blanket statement. |
| 4 | `docs/process/release-checklist.md`, the floor rule | "Check whether a maintained Node line carries a **stable** `node:sqlite`" — with the pause's measurement recorded as "ship as-is" | Stability 1.2 is not 2, so the rule's own trigger has not fired; the floor stays `>=22.16`. But the fact the rule was written to weigh — a warning every adopter meets at hello — is no longer true on 24.15+. The rule's text is the next increment's to refresh; this increment supplies the measurement it will cite. |

## Rulings taken (at the 2026-08-29 brainstorm), so they are not re-litigated

1. **A no-checkout GitHub-hosted runner meets the bar.** The owner ruled that "a machine
   that never held this checkout" is satisfied by a job with no `actions/checkout` step,
   receiving only an uploaded artifact. The proof is structural: the job cannot resolve
   anything from the repository because the repository is not there.

2. **Two jobs, one artifact.** Job `pack` checks out, installs, builds, packs both packages
   — `npm pack` for the record package, `pnpm pack` for the adapter, because only pnpm
   rewrites the `workspace:^` peer range (the release workflow's own tarball-first shape) —
   and uploads the two tarballs plus `scripts/first-use.mjs` as one artifact. Job `first-use`
   downloads that artifact and nothing else. The script ships inside the artifact because it
   is consumer code: it must not be read from a checkout the job does not have.

3. **The floor is NOT raised.** Phase-0 ruling 3's trigger is a *stable* `node:sqlite`;
   Stability 1.2 is not that, and Node 22 stays in maintenance LTS until April 2027. The
   floor stays `>=22.16`, and CI's exact-floor leg stays 22.16.0. What changes is the STORY,
   and the story is pinned rather than believed: see ruling 4.

4. **The warning claim is pinned both ways, at first-use time.** Job `first-use` runs on a
   two-entry matrix: `22.16.0` (the declared floor, exactly) and `24` (the current LTS line,
   resolved to its latest patch). Each leg imports `@vidimera/record` from the installed
   artifact in a bare `node -e` (no vitest, no `--disable-warning`) and captures stderr. The
   floor leg asserts the `ExperimentalWarning` IS present; the 24 leg asserts it is ABSENT.
   The two public sentences (rows 2–3 above) are rewritten to say exactly that, and this pin
   is what makes them true statements rather than beliefs. If a runner image ever resolves
   `24` to a patch below 24.15, the 24 leg fails loudly — a correct failure, because the
   sentence would then be false for that image.

5. **The Postgres half runs against a consumer-shaped server.** Job `first-use` declares a
   `services:` container running the PostgreSQL major the suite already exercises (18), with a
   health check, and the script drives the same confirm loop through `PostgresStore` over a
   consumer-owned `pg.Pool` to a verified chain. Nothing is borrowed from the workspace — the
   rehearsal's one honest gap ("borrowed embedded binaries") closes here. `pg` arrives as the
   adapter's own dependency, not a separate install.

6. **The workflow is dispatch-only, and reusable after the cut.** It runs on
   `workflow_dispatch` with one input, `source` (`tarball` | `registry`, default `tarball`),
   plus `version` for the registry case. `tarball` is this increment's precondition run;
   `registry` is the checklist's post-publish verification item ("in a scratch project on a
   clean machine: `npm install @vidimera/record @vidimera/store-postgres`, run the
   getting-started flow, confirm the `./probes` subpath resolves") — the same job, the same
   script, a different `npm install` line. It does not run on push: it takes minutes, needs a
   service container, and is a deliberate release act like `release.yml`, not a per-commit gate
   — `pnpm smoke` stays that.

7. **The script is the getting-started flow in substance, not a copy of the smoke script.**
   It drives stage → open → review → finalize → `confirmed` on `MemoryStore`; the offline
   `replay`/`verifyChain` and the handle-form `verifyChain`; the refused half
   (`identity-authority-refused` returned, never thrown); the `./probes` subpath (`ALL_PROBES`
   visible, `runProbes` and `assertSatisfied` importable); and the adapter — the peer range
   rewritten (tarball source) or resolved (registry source), then a real confirm loop over
   `PostgresStore` against the service. It exits non-zero on the first failed assertion and
   prints one summary line on success. It does NOT run the probe tier — that needs a
   host-declared driver the guide does not ask a first-time reader to write.

8. **One documented run is the deliverable, and its record states what it proves.** The run's
   URL, both legs' outcomes and both stderr measurements go into
   `docs/analysis/2026-08-29-first-use-proof.md`. The record says in the same breath what the
   run does not prove: that the getting-started *prose* reads right (a human's judgment), that
   Windows or macOS consumers behave the same (the job is ubuntu-only), or anything about the
   registry artifacts (until the cut, `source: registry` has nothing to install).

9. **`CLAUDE.md`'s CI paragraph names the new workflow** — it is a living record that
   enumerates the workflows, and a third one appearing without a sentence there would leave
   the repository's own guidance stale. One sentence; no other `CLAUDE.md` change.

## What lands

- `.github/workflows/first-use.yml` — new. `on: workflow_dispatch` with inputs `source`
  (choice: `tarball`, `registry`; default `tarball`) and `version` (string, used only for
  `registry`). `permissions: contents: read`. Job `pack` (`ubuntu-latest`, Node 22): checkout,
  pnpm setup, `pnpm install --frozen-lockfile`, `pnpm build`, `npm pack` in
  `packages/record`, `pnpm pack` in `packages/store-postgres`, upload `first-use-<run_id>`
  containing both tarballs and `scripts/first-use.mjs`. Job `first-use` (`needs: pack`,
  `ubuntu-latest`, matrix `node: [22.16.0, 24]`, `services.postgres` on the suite's major
  with a `pg_isready` health check; **no checkout step**): setup-node, download the artifact,
  `npm init -y` a scratch project with `"type": "module"`, install — `npm install ./*.tgz` for
  `tarball`, `npm install @vidimera/record@<version> @vidimera/store-postgres@<version>` for
  `registry` — run `node first-use.mjs` with `VIDIMERA_PG_URL` pointing at the service, then
  the warning pin: `node -e "await import('@vidimera/record')" 2>stderr.txt` and a step that
  asserts presence (22.16.0) or absence (24) of `ExperimentalWarning`. Every action pinned by
  full SHA with its version in a trailing comment, as `ci.yml` and `release.yml` do; the plan
  resolves the SHAs for `actions/upload-artifact` and `actions/download-artifact` from their
  release pages at implementation time and records them.
- `scripts/first-use.mjs` — new, per ruling 7. Header comment states what it proves and what
  it cannot. Reads `VIDIMERA_PG_URL` from the environment; if absent, the Postgres half is
  skipped WITH a printed notice, never silently (a local dry run without a server should still
  exercise the record half).
- `docs/guide/integrating.md` — the `SqliteStore` bullet's warning sentence becomes: on Node
  below 24.15 (and 25.x below 25.7) importing the package prints Node's `ExperimentalWarning`
  for `node:sqlite`, silenced by `--disable-warning=ExperimentalWarning`; on 24.15 and later
  nothing prints, since Node marked the module a release candidate there — measured by the
  first-use workflow on both the floor and the current LTS line.
- `packages/record/README.md` — the same correction in its own voice.
- `CLAUDE.md` — one sentence in the CI paragraph naming `first-use.yml`, what it is (the
  dispatch-only clean-runner first-use proof, reusable against the registry), and what it is
  not (a per-push gate).
- `docs/analysis/2026-08-29-first-use-proof.md` — new, per ruling 8. Dated; the run URL; per
  leg: Node version resolved, install source, first-use outcome, chain length, probes visible,
  Postgres confirm loop outcome, and the stderr measurement; the bound.
- `docs/superpowers/INDEX.md` — this pair's row; the `specs/`/`plans/` counts; the
  `docs/analysis/` count moves by one. All in the same commit as the `git add`.
- `docs/process/implementation-status.md` — the increment section (thirteenth
  post-build-order), plus the present-tense counts only if they move (they should not: no
  test file is added; the Biome count moves by the new `.mjs`, so verify).

## Coverage this adds, stated with its limit

A reproducible, re-runnable proof that both packed artifacts resolve and behave — through
their exports maps, to a verified chain, over both a memory store and a real PostgreSQL
server — on a machine that never held the checkout; and a two-way pin of the `node:sqlite`
warning story that makes the guide's sentence a measured claim.

**The limits, stated in the same breath:**

- **It proves resolution and behavior, not prose.** Whether `getting-started.md` reads right
  to a first-time reader is a human's judgment; the script follows the flow in substance,
  not the reader's eyes.
- **Ubuntu only.** Both first-use legs run on `ubuntu-latest`. The CI matrix already covers
  Windows and macOS from a checkout; consumer-side behavior on those is inferred, not proved
  here.
- **Tarball source until the cut.** `source: registry` is wired but has nothing to install
  until the packages exist on npm; the record says so.
- **The warning pin measures the runner's resolved `24`.** It is a claim about Node 24.15+,
  verified on whatever patch the runner image carries; the floor leg's positive assertion is
  exact (22.16.0).
- **The floor stays where it was.** This increment corrects a sentence; it does not decide the
  floor. The rule's re-evaluation, and whether "no warning on the current LTS line" changes
  the release-day weighing, are the next increment's to record.
- **`pnpm smoke` is unchanged and still the per-push gate.** The first-use workflow adds a
  second, deliberate proof; it does not replace the first.

## Risk, and how it is held

- **Action pins.** Two actions new to this repository must be pinned by SHA. The plan
  resolves them from the actions' release pages and records SHA + version in the trailing
  comment, exactly as the existing workflows do; a tag-pinned action is a STOP.
- **Service readiness.** The Postgres service needs a health check the job waits on;
  `pg_isready` with a short interval and enough retries. A flaky connect must fail the job
  visibly, never be retried into silence by the script.
- **The warning capture must be bare.** No vitest, no `execArgv`, no `NODE_OPTIONS` carrying
  `--disable-warning` — a leg that inherits a suppression would prove nothing and pass. The
  step echoes the captured stderr into the log before asserting on it.
- **Scan coverage.** `scripts/contract-scan.mjs` scans tracked `*.md` and `*.ts` — not `.mjs`
  and not `.yml`. The new script and workflow are therefore hand-held to the standalone
  contract: no external URLs in comments, no pointers to work outside this repository.
  Action references (`owner/action@sha`) are not URLs and already appear in `ci.yml`.
- **A run that fails on the 24 leg for the wrong reason.** If setup-node resolves `24` to a
  patch below 24.15 on some image, the absence assertion fails. That is the pin doing its job;
  the record names the resolved version so a reader can tell "story wrong" from "image old".
- **Markdown is citation-checked by nothing.** Every quoted phrase written into the guide,
  the README, the record or the section is hand-verified against a whitespace-collapsed copy
  of its source.
- **`byte-stability.test.ts` cannot move** — no code changes — and is proved untouched by
  `git diff` at exit.

## What stays outside, and why

- **The release checklist** — its precondition tick, its floor-rule text, its pickup
  instructions (re-cut fresh, not cherry-pick), rows 19 and 22's carry-forward notes, and the
  stale `v0.1.0` tag's deletion — all the next increment's, so that it can cite this one's run.
- **Raising the floor** — ruling 3.
- **A lazy `SqliteStore` load** to remove the warning on old Nodes — reshapes the entry point
  after the API review closed; the rehearsal named it as an option and this increment leaves
  it there.
- **Running the probe tier in the first-use script** — needs a host driver; ruling 7.
- **Windows/macOS first-use legs** — the record names the gap; adding them is a later choice.
- **Any change to `ci.yml`, `release.yml`, or `scripts/smoke-pack.mjs`.**

## Exit

The increment exits when: `first-use.yml` and `scripts/first-use.mjs` exist as specified,
with every action SHA-pinned; one `source: tarball` dispatch has run green on both legs, the
22.16.0 leg showing the `ExperimentalWarning` present and the 24 leg showing it absent, both
legs reaching a verified chain on `MemoryStore` and on `PostgresStore` against the service;
the run's URL and both measurements are recorded in `docs/analysis/2026-08-29-first-use-proof.md`;
the two public sentences are corrected and `CLAUDE.md`'s CI paragraph names the workflow;
`docs/superpowers/INDEX.md` carries this pair's row with all moved counts in the same commit
as the `git add`; the increment's section is written in `docs/process/implementation-status.md`
and proposed explicitly in the commit body; `git diff` proves `packages/` untouched; and
`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm contract-scan`, `pnpm api-sync` and
`pnpm docs-index-sync` are green with the figures measured at exit rather than carried
forward.
