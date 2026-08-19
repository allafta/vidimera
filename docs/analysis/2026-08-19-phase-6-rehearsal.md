# Phase 6 — the first-use rehearsal

**Date: 2026-08-19.** The release plan's last phase before release day, run to the edge of
what this machine can honestly prove. **The bound, first:** phase 6's real bar — one
reproduced first-use run on a machine that never held this checkout — is a
release-checklist precondition this rehearsal deliberately does NOT claim; everything
below ran on the development machine, and the embedded Postgres binaries for part 2 were
borrowed from the workspace checkout (a consumer brings their own server). Everything
else resolved from the packed artifacts alone.

## What ran

1. **Both packages built and packed** (`pnpm pack` per package). The adapter tarball's
   manifest was inspected: the `workspace:*` peerDependency on `@vidimera/record` was
   rewritten to the concrete version at pack time — the release workflow's tarball-first
   design (`pnpm pack`, then `npm publish <tarball>`) proven end to end, not assumed.
2. **A scratch consumer project outside the repository** installed both tarballs together
   with npm — the record tarball satisfying the adapter's rewritten peer range.
3. **`first-use.mjs`** — the getting-started flow in substance against the installed
   `@vidimera/record`: stage → open → review → finalize → confirmed; replay and
   verifyChain in both their operator-handle and pure offline forms; the refused half
   (`identity-authority-refused` on a wrong-authority identity, returned, never thrown);
   and the probes tier through the `./probes` subpath (17 probes visible, the runner and
   `assertSatisfied` importable). Green.
4. **`postgres-use.mjs`** — the same confirm loop over the installed
   `@vidimera/store-postgres` against a real Postgres server (borrowed embedded
   binaries): construct `PostgresStore` over a consumer-owned `pg.Pool`, stage → open →
   finalize → verifyChain intact, 4 transitions. Green.

## The one finding

**The `node:sqlite` ExperimentalWarning fires on ANY `@vidimera/record` import**, not
only when `SqliteStore` is used — the entry point re-exports the class, so the module
loads at import time. Phase 0's floor ruling anticipated a consumer seeing the warning;
this rehearsal confirms every consumer sees it on their first import, whatever store they
choose. That sharpens release day's floor rule (`docs/process/release-checklist.md`): if
a maintained Node line has stabilized `node:sqlite` by then, raising the floor removes a
warning every single adopter would otherwise meet at hello. If not, the guide's
documented `--disable-warning=ExperimentalWarning` is the answer, and the greeting-level
visibility of the warning is worth knowing when weighing how hard to chase the floor.
(A lazy `SqliteStore` load could also remove it, but that reshapes the entry point after
the API review closed — noted as an option for the release-day decision, not taken here.)

## Standing after this phase

Phases 0–6 of the release plan are done to their in-session limits. What remains is
release day itself, entirely `docs/process/release-checklist.md`: its first precondition
is the genuine clean-machine run this rehearsal rehearsed for, and its last act retires
register row 1 — the register's final live row — when the release workflow has run once.
