// @vidimera/record — probes/index.ts: the OPERATOR-ASSURANCE subpath's public entry
// point (CONTROLS §4; the self-test-tier increment, the build order's last item).
// Shapes here are PROVISIONAL pre-1.0, the same discipline `types.ts`/`runner.ts` state
// on their own headers: the behaviors are the contract, the signatures are not.
//
// The package's `exports` map carries this subpath: `packages/record/package.json`
// declares both `.` and `./probes`, so a consumer imports this module as
// `@vidimera/record/probes`. It landed at the phase-2 packaging increment, together with
// the `files` array — whose first entry is `dist` — so `src/` is never published and no
// deep path into source is reachable from a published tarball. Deferral-register row 6
// (the pre-0.1 API-naming review) retired 2026-08-19 having decided this as the one
// subpath; row 1's own remaining scope is the release workflow's first exercise at the
// 0.1 cut, not the map. This package's own suite imports the module by relative path from
// inside the workspace, which is a workspace convenience and not the published route.

export type { Probe } from './probes.js';
export { ALL_PROBES } from './probes.js';
export { assertSatisfied, runProbes } from './runner.js';
export type { ProbeDriver, ProbeReport, ProbeResult, ProbeStatus, Waiver } from './types.js';
