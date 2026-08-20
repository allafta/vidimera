# Session 4 — the conformance-suite export: declined for 0.x

**Date: 2026-08-20.** The open-items plan's stage-3 first ruling
(`docs/process/open-items-plan.md`; session 4 of
`docs/process/open-items-sessions.md`): whether the backing-parameterized conformance
suite (`packages/record/test/conformance/store-conformance.ts`) is exported as an
adapter-author's tool. The question had dangled since
`docs/process/implementation-status.md`'s §12 row named it "a 0.1-cut question
alongside register row 6's review, deliberately not decided now" — and row 6's review
completed and retired 2026-08-19 without ruling on it.

## The ruling

**Not exported while 0.x.** The suite stays test-side, exactly as its own header has
claimed without a ruling behind it. The 1.0 store-interface freeze
(`docs/concept/OPEN-QUESTIONS.md` §9's own gate) **re-asks this question**, with a
separate dev-only package the presumptive shape if it then rules export. Vendoring is
the blessed 0.x path for a host verifying its own adapter — stated in
`docs/guide/integrating.md` now, not left as folklore.

## What was measured before ruling

- **The runner coupling.** The suite imports `describe`/`test` from vitest. An export
  makes that a consumer concern: an optional peerDependency on a runtime library, or an
  injected-runner rework (`runStoreConformance(label, makeStore, { describe, test })`)
  that changes every caller and adds signature surface of its own.
- **The internals coupling, stated precisely.** The suite imports `transitionDigest`
  from `src/chain/encoding.js` — an internal the API review deliberately left
  unexported — plus two test-helper modules. A **subpath** export (the suite moving
  into `src/conformance/`) would NOT require exporting those internals: package-internal
  imports stay legal, and the subpath would expose only `runStoreConformance`. A
  **separate package** WOULD require solving it (export, vendor-with-drift, or a
  testing-internals subpath). An earlier in-session statement that the subpath route
  forces the internals export was wrong and is corrected here.
- **The reach today.** The one cross-package caller
  (`packages/store-postgres/test/postgres-store-conformance.test.ts`) imports the suite
  by relative path across the workspace — a move no consumer of the published package
  can make. The suite is genuinely internal as it stands.
- **The population.** The export's real audience pre-1.0 is not npm-published adapter
  authors (approximately zero) but **hosts writing an internal `Store` adapter** for
  their own database — `Config.store` is required, and `docs/guide/integrating.md`'s
  "Writing your own" bullet addresses exactly them. That population exists from the
  first publish and is served, under this ruling, by vendoring.

## Why declined — the four reasons, each with its limit

1. **Irreversibility asymmetry.** Declining now and exporting later is additive
   (semver-minor); exporting now and regretting it is breaking. Pre-1.0, with zero
   consumers, the asymmetry is close to decisive alone. The limit: the asymmetry says
   nothing about whether export is *eventually* right — that is the re-ask's question.
2. **A second unstable public surface.** Every pin the suite gains tightens a published
   contract — an adapter that passed yesterday fails today — and the suite is still
   under active construction: the pre-1.0 can-fail campaign
   (the open-items plan's stage 6) is expected to grow and harden it. Exporting before
   that campaign puts its churn on public surface; exporting after it converges on the
   1.0 re-ask anyway.
3. **The invitation hazard.** `store.ts`'s own header says "do not build long-lived
   external adapters against this exact shape yet." An exported suite operationalizes
   exactly what that warning forbids, while the meta-object form and the
   driver-generic transaction type parameter are explicitly provisional.
4. **No gate would hold it.** The api-sync gate reads only the root entry point, so a
   new subpath's documentation would be ungated; which vitest majors the suite works
   under is a compatibility axis nothing measures.

## The vendored path, and why its failure mode is acceptable

A host verifying its own adapter copies the suite file into its own tests
(Apache-2.0). A vendored copy drifts — the accepted cost — but drift here fails
**loudly**: the suite builds its fixture chains through the real digest and append
logic, so a stale copy against a moved interface fails to compile or fails its own
fixtures rather than passing falsely. The limit in the same breath: loud failure is a
property of interface-moving drift; a behavioral tightening the vendored copy never
received simply goes unchecked in the host's suite — vendoring gives the pins you
took, not the pins added since.

## The line this ruling keeps intact

The concept excludes capabilities meaningful only with an outside party, and
"conformance claims *as claims*" is on that list (`docs/concept/CONTROLS.md` §1).
Whatever the 1.0 re-ask decides, the suite is a builder's **self-check** — it must
never grow toward badges, certification, or any registry of "conformant" adapters.
Declining the export keeps that line trivially intact for 0.x; the re-ask inherits the
sentence.

## What the 1.0 freeze re-asks

At the freeze the signatures stop moving, the can-fail campaign has hardened the
suite, and "the frozen contract and its executable definition" becomes a coherent
joint deliverable. The presumptive shape is a separate dev-only package
(`@vidimera/store-conformance` or similar) that can depend on vitest openly and
version independently — carrying the internals question (`transitionDigest`) as its
first design problem, and one more package into whatever versioning mechanics the
stage-3 versioning ruling decides.

## Closing acts

The `implementation-status.md` §12 row's dangling clause is corrected to record this
ruling (and the same cell's "two backings" / "remaining absence is the server-SQL
backing" claims, overtaken by the phase-4 landing a day before this pass and missed by
the survey, are corrected in the same edit, per the stage-1 in-row convention); the
suite's own header gains the ruling behind its "not public API" line and its
caller census moves two to three; `docs/guide/integrating.md`'s "Writing your own"
bullet states the vendoring path; the open-items plan's stage-3 first checkbox ticks.
