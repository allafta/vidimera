// @vidimera/record — byte-regression/fixtures.ts: the deterministic seams every pin file
// in this directory drives `createWithClock` with.
//
// THIS DIRECTORY IS NOT THE FROZEN ORACLE. `test/byte-stability.test.ts` pins four
// literals as byte-COMPATIBILITY evidence against the reference implementation this
// kernel was adopted from, and it is never regenerated. The files here pin
// SELF-REGRESSION literals over encodings built in this repository, where there is no
// external implementation to be compatible with, so a mismatch here means THIS
// repository's own bytes moved — a regression to adjudicate, and possibly a legitimate
// one. Neither `CONTRIBUTING.md`'s hard rule 4 nor `.github/CODEOWNERS` names this
// directory; both name the frozen file by exact path. Do not apply either rule here, and
// do not apply this file's posture there.
//
// EDITING THIS FILE MOVES EVERY LITERAL IN THIS DIRECTORY AT ONCE. That is deliberate —
// six private copies would make one fixture edit look like six independent regressions —
// but it means a change here is never a small one.
//
// COMBINATION COVERAGE IS PERMANENTLY OUTSIDE THIS DIRECTORY. Every flow scripted in this
// directory exercises one feature set on its own, never the cross-product of features — a
// file may script more than one flow (three of the seven do), but no single flow here
// combines capabilities the way a declining, policy-drifting, proposal-provenance-carrying,
// multi-leg record that also redeems with a result would. A drift that manifests only when
// two capabilities interact is caught by no literal here, and that is a deliberate scope
// bound, not an omission awaiting a later increment.

/**
 * The three injectable seams `createWithClock` carries. `tokenSource` is not optional
 * decoration: the token digest sits inside the `redeeming` and `redeemed` payloads, so an
 * undetermined token source makes the redemption family unpinnable.
 *
 * `now()` ticks one second per call from a fixed epoch — the same shape the frozen
 * oracle's own seams use, so a flow's `at` bytes depend only on how many times the kernel
 * reads the clock.
 */
export function deterministicSeams(prefix: string): {
  now: () => Date;
  mintId: () => string;
  tokenSource: () => string;
} {
  const seams = advanceableSeams(prefix);
  return { now: seams.now, mintId: seams.mintId, tokenSource: seams.tokenSource };
}

/**
 * The same three seams plus `advance(ms)` — a FOURTH knob, beyond the three
 * `deterministicSeams` exposes, added because the terminal-refusals family cannot be built without
 * crossing an expiry deadline and a redeeming bound. Inert for every other family.
 * With no `advance` call the clock behaves exactly as `deterministicSeams` does, so the
 * two are interchangeable for a flow that never crosses one.
 */
export function advanceableSeams(prefix: string): {
  now: () => Date;
  mintId: () => string;
  tokenSource: () => string;
  advance: (ms: number) => void;
} {
  const BASE_MS = Date.parse('2026-01-01T00:00:00.000Z');
  let tick = 0;
  let idSeq = 0;
  let tokenSeq = 0;
  let offset = 0;
  return {
    now: () => new Date(BASE_MS + offset + tick++ * 1000),
    mintId: () => `${prefix}-record-${idSeq++}`,
    tokenSource: () => `${prefix}-token-${tokenSeq++}`,
    advance: (ms: number) => {
      offset += ms;
    },
  };
}
