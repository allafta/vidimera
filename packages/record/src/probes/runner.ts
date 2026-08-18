// @vidimera/record — probes/runner.ts: every registered probe runs (a failure never
// aborts the suite — the report is the product); waivers apply per the expiry
// discipline; assertSatisfied() is the CI hook (no CLI ships). The honest bound a
// passing report carries (CONTROLS §4): it "proves the control operated in the probed
// configuration, at probe time" — never third-party assurance, never a claim about an
// unprobed configuration.

import { ALL_PROBES } from './probes.js';
import type { ProbeDriver, ProbeReport, ProbeResult, Waiver } from './types.js';

const OFFSET_RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export async function runProbes(
  driver: ProbeDriver,
  opts?: { waivers?: Waiver[]; now?: () => Date },
): Promise<ProbeReport> {
  const now = opts?.now ?? (() => new Date());
  const waivers = opts?.waivers ?? [];
  for (const w of waivers) {
    if (!OFFSET_RFC3339.test(w.expires) || Number.isNaN(Date.parse(w.expires))) {
      throw new Error(
        `runProbes: waiver '${w.probeId}' has a malformed expires — an RFC 3339 date-time ` +
          'with an explicit offset (the waiver-governance expiry discipline)',
      );
    }
  }
  const nowMs = now().getTime();
  const live = new Map(
    waivers.filter((w) => Date.parse(w.expires) > nowMs).map((w) => [w.probeId, w]),
  );
  const expiredWaivers = waivers.filter((w) => Date.parse(w.expires) <= nowMs);
  const used = new Set<string>();

  const results: ProbeResult[] = [];
  for (const probe of ALL_PROBES) {
    let result: ProbeResult;
    try {
      result = await probe.run(driver);
    } catch (err) {
      // A throwing probe is a FAIL with the throw recorded — never an aborted suite.
      result = {
        id: probe.id,
        target: probe.target,
        status: 'fail',
        detail: `probe threw: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    if (result.status === 'fail' || result.status === 'not-driven') {
      const waiver = live.get(result.id);
      if (waiver !== undefined) {
        used.add(result.id);
        result = {
          ...result,
          status: 'waived',
          detail: `${result.status} under waiver '${waiver.reason}' (expires ${waiver.expires}); ${result.detail}`,
        };
      }
    }
    results.push(result);
  }
  const unusedWaivers = waivers.filter((w) => !used.has(w.probeId) && !expiredWaivers.includes(w));
  const satisfied = results.every((r) => r.status === 'pass' || r.status === 'waived');
  return { results, satisfied, expiredWaivers, unusedWaivers };
}

/** The CI hook. Throws unless EVERY result is pass/waived AND no waiver has expired —
 * two independent conditions, not one: `report.satisfied` alone covers only the first,
 * so a report can read `satisfied: true` while still carrying an expired waiver this
 * function throws on (the waiver-governance expiry discipline's own point — an expired
 * waiver must not silently keep covering the probe it named). Call this, or check both
 * fields yourself; `satisfied` by itself is not the CI verdict. */
export function assertSatisfied(report: ProbeReport): void {
  if (report.satisfied && report.expiredWaivers.length === 0) return;
  const bad = report.results
    .filter((r) => r.status === 'fail' || r.status === 'not-driven')
    .map((r) => `${r.id} [${r.status}]: ${r.detail}`);
  const expired = report.expiredWaivers.map((w) => `expired waiver ${w.probeId} (${w.expires})`);
  throw new Error(`probe suite unsatisfied:\n${[...bad, ...expired].join('\n')}`);
}
