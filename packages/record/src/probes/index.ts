// @vidimera/record — probes/index.ts: the OPERATOR-ASSURANCE subpath's public entry
// point (CONTROLS §4; the self-test-tier increment, the build order's last item).
// Shapes here are PROVISIONAL pre-1.0, the same discipline `types.ts`/`runner.ts` state
// on their own headers: the behaviors are the contract, the signatures are not.
//
// NOTE: this is source convention only today — the package's `exports` map carries no
// `./probes` subpath yet (`packages/record/package.json` declares no `exports` field
// at all; `src/index.ts`'s own header: "No subpath exports"). Wiring one is register
// row 6's own pre-0.1 work (the pre-0.1 API-naming review over the whole public
// surface), not built here. A consumer reaches this module by relative/deep import
// today (`@vidimera/record/src/probes/index.js` from inside the workspace, or the
// package's own file path once published), exactly as this package's own test suite
// does.

export type { Probe } from './probes.js';
export { ALL_PROBES } from './probes.js';
export { assertSatisfied, runProbes } from './runner.js';
export type { ProbeDriver, ProbeReport, ProbeResult, ProbeStatus, Waiver } from './types.js';
