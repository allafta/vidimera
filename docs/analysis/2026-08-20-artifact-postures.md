# Session 2 — the release-artifact postures

**Date: 2026-08-20.** The open-items plan's stage-2 posture rulings
(`docs/process/open-items-plan.md`; session 2 of
`docs/process/open-items-sessions.md`), taken after measuring the option space against
the tree. Three rulings, each with its limit in the same breath.

## Ruling 1 — the smoke test covers both packages, the adapter packaging-level only

The smoke test (`scripts/smoke-pack.mjs`) previously packed and consumer-tested
`packages/record` alone; `@vidimera/store-postgres`'s packed artifact had been
consumer-tested exactly once, at the phase-6 rehearsal. Three options were weighed: a
full extension (a live confirm loop in the scratch project — rejected: it needs a real
server, which means carrying the suite's dual-path server logic, embedded elsewhere
and the external-URL seam on Windows, into the smoke on every CI leg, to re-prove
runtime behavior the conformance suite already proves from source against a real
server every run); a record-only bound (rejected: an adapter manifest, exports-map, or
dist regression would ship ungated until the post-publish registry install); and the
middle taken here.

**Taken: the packaging extension.** The smoke now builds both packages, packs the
adapter with pnpm — never npm, because only pnpm's pack rewrites the `workspace:^`
peerDependency to a concrete range, the release workflow's own tarball-first shape —
installs both tarballs into the scratch project with the record tarball satisfying the
rewritten peer range, resolves `@vidimera/store-postgres` through its exports map,
asserts the rewrite in the installed manifest (pinned as a claim, not left as an
install side effect), and constructs `PostgresStore` over a pool that never connects
(construction is synchronous; DDL is lazy). This is exactly the coverage class the
smoke exists for — the built artifact, the exports map, the shipped declarations, the
manifest — at a cost of seconds and no database.

**The bound, recorded in the script's own header:** the adapter's coverage is
packaging-level ONLY. Its live confirm loop stays suite-side (a real embedded Postgres
per test run, the external-server seam on Windows CI); its packed artifact ran one
live loop at the phase-6 rehearsal (`docs/analysis/2026-08-19-phase-6-rehearsal.md`);
and the release checklist's post-publish step installs both packages from the registry
and runs the getting-started flow, re-proving the published artifacts. A green smoke
says the adapter *ships correctly*, never that it *runs correctly* — the suite says
that.

## Ruling 2 — the supported PostgreSQL range is declared: 11 or newer, exercised against 18

No manifest field, document, or comment previously stated which PostgreSQL server
versions the adapter supports. Measured: the oldest version-sensitive construct in
`packages/store-postgres/src/postgres-store.ts` is `hashtextextended` (the advisory
genesis lock's key hash), which requires PostgreSQL 11; everything else it uses —
`ON CONFLICT`, `pg_advisory_xact_lock`, a partial unique index,
`CREATE SCHEMA IF NOT EXISTS` — is older. The evidence side: the suite runs against
PostgreSQL 18 (embedded, per run) on three CI legs and local development, and against
whatever the Windows runner image preinstalls on the fourth.

**Taken:** the declaration lands in `docs/guide/integrating.md`'s store list —
"Requires PostgreSQL 11 or newer — the oldest server construct it uses is
`hashtextextended` — and is exercised in this repository against PostgreSQL 18" — and
the adapter README the plan's stage-2 README item creates carries the same statement.
The limit stated with it: the 11 floor is a static claim from the code's construct
inventory, not a tested one — no CI leg runs PostgreSQL 11, and the routinely
exercised versions are 18.x plus the Windows image's floating service version.

## Ruling 3 — the beta `embedded-postgres` pin stays, on the record

`packages/store-postgres` pins `embedded-postgres` at `18.4.0-beta.17` as a
devDependency. Measured on the registry (2026-08-20): the package publishes **only**
beta-suffixed versions — its `latest` dist-tag IS `18.4.0-beta.17`, and the 16.x and
17.x lines carry the same `-beta.N` suffixes — so "move to a stable line" is not an
available option; there is no stable channel to move to.

**Taken: keep the pin, with the posture recorded here.** The dependency is dev-only
(the published artifact never depends on it); the PostgreSQL 18.4 binaries it wraps
are a stable server release — the beta label is the npm wrapper project's own release
channel, not the database's; and Dependabot's weekly group tracks the package's
`latest` tag, so the pin moves with the wrapper's releases. The limit: a beta-channel
wrapper can change behavior between its own betas, and the suite would meet that at
the weekly update, not before.
