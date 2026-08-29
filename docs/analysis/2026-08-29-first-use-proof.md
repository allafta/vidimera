# The first-use proof — the getting-started flow on a machine that never held this checkout

**Date: 2026-08-29.** The release checklist's first precondition, met for real rather than
rehearsed. **The bound, first:** this run proves the packed artifacts install and work on a
machine that never held this checkout — on ubuntu only, from tarballs only, at two Node
points. It does not prove the guide's prose reads right (that stays a human's judgment), does
not exercise the registry install path (that waits for the cut and the same workflow's
`source: registry` input), does not run the probe tier's verdicts (running probes needs a
host-declared driver), and measures the `24` line only at the patch the runner resolved on
this date, `v24.19.0`. Every line quoted below is quoted verbatim from the run's own log, or
from the dispatch attempt that preceded it.

## What ran

`First-use run 33242645696 on origin` — the `First-use` workflow, dispatched with
`source: tarball` against ref `first-use-proof` at commit `5c036d0`, which `main` also pointed
at. Three jobs, all `success`: `pack`, `first-use (22.16.0, true)`, `first-use (24, false)`.

**What satisfied "a machine that never held this checkout."** The `first-use` job has no
`actions/checkout` step, and that absence is the proof: the repository is not on the runner,
so nothing the job does can resolve from it. Its only inputs are the artifact `pack` uploaded
— both tarballs plus the consumer script — and the public package registry for the transitive
dependencies. Per the owner's ruling of 2026-08-29, a freshly provisioned, GitHub-hosted
`ubuntu-latest` runner with no checkout step satisfies the release checklist's precondition:
it holds no prior state from this project and cannot see the working tree. That is the honest
reading of the precondition — not a machine anyone owns, but a machine that demonstrably never
held the checkout.

`pack` built both packages and packed them the release workflow's own way — npm for the record
package, pnpm for the adapter, because only pnpm rewrites the adapter's `workspace:^` peer
range — producing `vidimera-record-0.0.0.tgz` (164713 bytes) and
`vidimera-store-postgres-0.0.0.tgz` (11521 bytes).

Each `first-use` leg then, with no checkout: set up its Node, downloaded that one artifact,
created a scratch `app/` project, installed both tarballs with
`npm install ../artifact/*.tgz` — `added 16 packages` on both legs, differing only in the
elapsed time each reported: `added 16 packages in 1s` on the floor leg and
`added 16 packages in 2s` on the LTS leg — and drove `first-use.mjs` against a `postgres:18`
service container the job owned (`starting PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2)`).

## The measurement

### The declared floor — `v22.16.0`

Install source: the two tarballs. The consumer script's summary line, verbatim:

```
first-use: OK - source=tarball; memory: 4 transitions, confirmed + intact; 17 probes visible through ./probes; adapter peer range ^0.0.0; postgres half OK (4 transitions, confirmed + intact)
```

Four transitions over `MemoryStore`, confirmed and chain-intact; four more over the real
PostgreSQL server through `PostgresStore`, likewise; 17 probes reachable through the
`./probes` subpath — reachable, not run; and the adapter's peer range on `@vidimera/record`
observed as `^0.0.0`, pnpm's pack-time rewrite of `workspace:^` into a concrete range,
satisfied by the record tarball installed beside it.

Then the bare import — `node -e "await import('@vidimera/record')"`, stderr captured — which
printed `imported @vidimera/record` on stdout and this on stderr:

```
--- stderr of a bare import ---
(node:2417) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
--- end ---
```

### The current LTS line — `v24.19.0`

Same install source, same script, and a byte-identical summary line:

```
first-use: OK - source=tarball; memory: 4 transitions, confirmed + intact; 17 probes visible through ./probes; adapter peer range ^0.0.0; postgres half OK (4 transitions, confirmed + intact)
```

Then the same bare import, which printed the same `imported @vidimera/record` on stdout, and
on stderr:

```
--- stderr of a bare import ---
--- end ---
```

Nothing. The block is empty.

### What the two blocks license, and what they do not

They license this and no more: importing `@vidimera/record` prints Node's
`ExperimentalWarning` for `node:sqlite` on the declared floor, `v22.16.0`, and prints nothing
on `v24.19.0`. The warning is an import-time property of the **package**, not of
`SqliteStore` — the entry point re-exports the class, so the module loads whatever store the
adopter chooses. The 2026-08-19 rehearsal (`docs/analysis/2026-08-19-phase-6-rehearsal.md`)
found that on the development machine and named it its one finding; this run confirms it on a
machine that never held the checkout, and shows it retired on the current LTS line.

**The limit, in the same breath.** This run measures two points, one either side of the
boundary; it does not measure the boundary. That `node:sqlite` stopped being flagged when it
reached release-candidate status at 24.15 is Node's own published account, not an observation
here — the public sentences this record licenses name 24.15 on that account, and are bracketed,
not proven, by `v22.16.0` and `v24.19.0`. Nor does the run say anything about the 25.x line,
about non-ubuntu platforms, or about what a registry install will do after the cut.

## One deviation the plan did not anticipate, and two anticipated risks that did not fire

**The deviation: a `workflow_dispatch` workflow is dispatchable only from the default
branch.** The plan assumed the workflow could be dispatched from the feature branch as soon as
the branch was pushed. It cannot: `gh workflow run first-use.yml --ref first-use-proof`
returned `HTTP 404: workflow first-use.yml not found on the default branch`, and the raw
dispatch endpoint returned the same. A dispatchable workflow is registered only from the
default branch; the `ref` then selects which branch's file runs, but registration must happen
first. On the owner's ruling, the consumer script and the workflow were fast-forwarded onto
`main` **before** this run — so the increment's first two commits landed on the default branch
ahead of the record that cites them, and the run's commit `5c036d0` was the head of both `main`
and `first-use-proof`.

**Two anticipated risks that did not fire, once the workflow was registered.**

1. **That `--ref` might not select the feature branch's own copy of the workflow.** It did:
   the re-dispatch named `--ref first-use-proof` and was accepted, so the workflow file that
   ran is the branch's, not a separately maintained copy on `main`. No fix-up to the workflow
   was needed.
2. **The anticipated top-level-`await`-under-`-e` risk on 22.16.0.** It did not materialize —
   the bare import ran clean on both legs, module-syntax detection accepting it.

## Standing after this run

The release checklist's first precondition is met, at the scope stated in the bound above —
though its own checkbox, and its floor-rule text, are not ticked or touched by this record:
that edit belongs to the next increment, and this record is what that edit will cite. The
two public sentences this run licenses — the `SqliteStore` bullet in
`docs/guide/integrating.md` and the install paragraph in `packages/record/README.md` — were
rewritten only after the measurement existed, and say what it showed: the warning present
below 24.15, absent at 24.15 and later, with the flag named for the adopters still on the
floor.

What remains unproven is named above and stays named: the prose, the registry path, the probe
verdicts, every platform but ubuntu, and the boundary version itself. The registry half is a
single re-dispatch of this same workflow with `source: registry` once the packages are
published — the job is already written for it, so release day inherits a rehearsed act rather
than a new one.
