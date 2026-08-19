# Phase 4 — the server-SQL backing, the enlisted token seams, the workspace shape

**Date: 2026-08-19.** The phase-4 increment of the release plan
(`docs/analysis/2026-08-18-release-phase-brainstorm.md`), run as a full spec-then-plan
increment (`docs/superpowers/specs/2026-08-19-store-postgres-design.md`;
`docs/superpowers/plans/2026-08-19-store-postgres.md`). Three deferral-register rows
retired: **15** (the server-SQL third reference backing), **16** (the token seams' `tx?`),
and **4** (the workspace shape, its trigger fired deliberately). The register's one
surviving row is 1 — publish tooling, held open until the release workflow is exercised
at the 0.1 cut.

## The owner's session rulings

PostgreSQL with the `pg` driver (`@vidimera/store-postgres`, the second workspace
package); an **embedded-Postgres devDependency** as the test server — real per-platform
binaries, one server per test run started by a project-scoped vitest globalSetup, which
dissolved row 15's recorded zero-skips-versus-reachable-server collision rather than
waiving it; adapter tests inside the default `pnpm test`; row 16 bundled into the same
increment. The design was approved in session before the spec was written; the spec was
approved before the plan; the plan executed in seven committed tasks.

## What landed, against row 15's own three-part shape

1. **The backing.** `PostgresStore` ports `SqliteStore` arm-for-arm — every check keeps
   its order and conflict shape — with the concurrency made real: every append locks its
   record row (`SELECT … FOR UPDATE`), so the CAS, the C3/C4 arms, and the
   server-verified seq read state no concurrent writer can move; the genesis path
   serializes per `(profile, subject)` on a transaction-scoped advisory lock, keeping the
   C1 blocker SELECT and the insert race-free without ever tripping the unique index
   inside a host's enlisted transaction (the partial unique index stays the durable
   backstop). Transitions persist as JSON `text`, never `jsonb` — jsonb normalizes, and
   the byte-identity proof is about the stored bytes. Construction is synchronous over a
   caller-owned `pg.Pool` plus a lazily-created schema — connection custody is the
   host's, and the synchronous factory is what let the conformance suite run unchanged.
2. **The proofs.** The one caller file the row names wires all 50 conformance tests
   (suite untouched); the third byte-identity leg (flows extracted verbatim to a shared
   helper; record's own Memory ↔ Sqlite pins unchanged) holds Memory ↔ Postgres
   byte-identical, transitively equal across all three backings; five contention
   scenarios neither prior backing could express (CAS race, genesis-exclusivity race
   naming the blocker, seq race, batch atomicity under a concurrent reader,
   cross-connection enlisted rollback) pass, flake-shaken over repeated runs.
3. **The adapter-author surface.** `record` gained one grouped post-review amendment —
   `transitionDigest`, `stateOf`, `isStateLeaving`, `isCompromiseCarveOut`,
   `GenesisPayload` — argued from SPEC §12's own third-party-adapter sentence, pinned in
   `public-surface.test.ts`, documented under the api-reference's "Adapter authors"
   heading. The surface is 57 names (13 values, 44 types), measured 2026-08-19.

## Row 16 — the TWELFTH inversion, stated plainly

`beginRedemption`/`completeRedemption` gained the additive trailing `tx?`. This inverted
the seams' own recorded "NO tx, deliberately" doc comments — the twelfth entry of
`docs/process/implementation-status.md`'s numbered self-authored-inversion sequence,
argued in place at `kernel/redeem.ts`: an enlisted issuance commits or rolls back with
the host's own outbox row, so a rollback erases edge and outbox together — the host
declining the issuance whole, never a strand (a token returned from a rolled-back
issuance corresponds to no persisted digest and can never complete, which is
fail-closed) — and SPEC §11.2's "no transaction is shared" defines the executor
relationship, not the issuance's own persistence. Four enlisted-token tests pin it,
mirroring the direct seam's enlisted suite, including both seams' result-first no-edge
`chain-compromise` inside a host transaction.

## Row 4, and the build/test shape

Root `typecheck` and `build` cover both packages; `vitest` is declared per-package; the
vitest config runs two projects, the adapter's carrying the globalSetup and the one
`@vidimera/record`-to-source alias that keeps the whole workspace running from source
(the adapter's build config alone clears the tsc `paths` mapping and resolves the peer
against record's built `dist`, which the root build produces first).

## Incidents worth remembering

- The session's own Write embedded a **literal NUL character** in the advisory-lock key
  template — invisible in every file read, surfacing as a Postgres "invalid byte
  sequence" error and an unmatchable Edit; found by a byte scan, fixed by JSON-encoding
  the lock key (which ids containing legal control characters need anyway). All other
  changed files byte-scanned clean.
- An early failed adapter build emitted compiled JS/d.ts **into `packages/record/src/`**
  (tsc emits even on rootDir errors); cleaned, and both build configs now carry
  `noEmitOnError` so a failed build cannot litter again.
- The embedded server booted first try on this Windows machine — the plan's designated
  bail-out point was passed without needing its fallback.

## Measured at exit (2026-08-19, dated — re-measure, never trust)

`pnpm test` — 50 test files, 691 tests, zero skips (both projects); `pnpm lint` — 112
files, 13 infos; typecheck and build clean over both packages; smoke green; contract scan
exit 0. What remains before the 0.1 cut is phases 5 and 6 of the release plan (docs and
community mechanics; first-use validation) plus release day itself — register row 1's
exercised publish and the phase-0 checklist.
