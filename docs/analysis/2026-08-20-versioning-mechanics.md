# Session 5 — versioning mechanics: lockstep for 0.x

**Date: 2026-08-20.** The open-items plan's stage-3 second ruling
(`docs/process/open-items-plan.md`; session 5 of
`docs/process/open-items-sessions.md`). The phase-2 packaging ruling deferred the
versioning-tooling question with a named trigger — "No changesets: one package today,
and the hand-written CHANGELOG keeps its own voice; revisit when the row-15 adapter
package lands" (`docs/analysis/2026-08-19-phase-2-packaging.md`, ruling 4) — and the
adapter landed the same day without the revisit ever being recorded. This is that
revisit; the phase-2 record stays untouched as the point-in-time account whose trigger
this ruling answers.

## The ruling

**Lockstep, for 0.x.** Both packages carry the same version number, bump together, and
publish together at every cut — one CHANGELOG, no versioning tooling, the release
workflow unchanged. The 1.0 store-interface freeze **re-asks** this question, alongside
the conformance-export re-ask it already carries
(`docs/analysis/2026-08-20-conformance-export.md`) and the presumptive third package
that re-ask names.

## The mechanical fact that weighed heaviest

`.github/workflows/release.yml` structurally assumes both packages publish at every
dispatch: its guard refuses if either manifest still carries `private: true` or
`0.0.0`, and both publish steps always run. Under independent versioning, a dispatch
after a record-only change would re-publish an adapter version that already exists on
the registry — which npm refuses — so independence requires per-package dispatch
inputs or already-published skip logic in a workflow that has never yet run once.
Lockstep keeps the never-exercised path exactly as authored until the cut exercises
it.

## Why lockstep — and its costs, in the same breath

- The tarball-first peer rewrite always yields an exactly-true `^X.Y.Z`: under
  lockstep, "which record versions does the adapter support" stays a pack-time truth
  rather than a maintained claim.
- The single hand-written CHANGELOG stays one coherent file; the repo already speaks
  in repository events ("the 0.1 cut"), and the version number now says the same
  thing.
- **The accepted noise cost:** the adapter will publish version numbers carrying no
  changes of its own. When that happens the CHANGELOG says so plainly ("no adapter
  changes this cut; the version moves in lockstep") — an honest empty entry, never a
  silent one.
- **The semver implication:** a breaking change in either package moves both.
  Throughout 0.x this is painless (0.x minors signal breakage by convention).
  Post-1.0 it majors the innocent package — a real cost that cannot bite before 1.0,
  which is exactly why the freeze is the re-ask.

## The alternatives, declined with their reasons

- **Independent versions:** honest per-package history and no empty publishes — but
  every cost lands before a single release exists (workflow rework, a forked
  checklist, the peer range becoming a maintained claim), for a benefit that only
  materializes if the packages' cadences actually diverge, which nothing can
  demonstrate pre-publish.
- **Changesets (or similar):** earns its keep on frequent multi-package releases;
  this repository has a hand-authored CHANGELOG with its own voice, a
  zero-extra-tooling stance, and a release cadence of zero so far. Declined, with the
  trigger named: re-look if post-1.0 cadence ever makes hand-bumping error-prone.

## Closing acts

`CHANGELOG.md`'s header states the lockstep posture; the release checklist's bump item
extends "both to 0.1.0" to every later cut; the open-items plan's stage-3 second
checkbox ticks.
