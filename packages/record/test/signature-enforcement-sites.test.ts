// @vidimera/record — signature-enforcement-sites.test.ts: the claim the AL2 enforcement
// surface rests on, asserted rather than stated — `signatureLayerHolds` has exactly these
// seven call sites, and every one of them has a signature-broken pin somewhere in this
// package. An EIGHTH site added later fails this test until it is listed here.
//
// It proves NAMING, not coverage. The check is a source-text scan: it greps
// packages/record/src for lines that CALL `signatureLayerHolds` and compares the set of
// files against the list below. The match is per LINE, so a call wrapped across two of them
// — the name on one, its `(` on the next — would evade the scan entirely; all seven calls
// are single-line today and nothing holds them that way. It cannot tell whether a listed
// site's test still asserts anything — gut a pin and this stays green. Its whole value is
// the tripwire: decline.ts's own site sat uncovered across three increments precisely
// because nothing failed when it appeared. A useful guard against a new site; never
// evidence that an old one is sound.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';

/** The seven files that CALL `signatureLayerHolds`, one call each. */
const SITES = [
  'decline.ts',
  'finalize.ts',
  'findings-seams.ts',
  'prior-legs.ts',
  'redeem.ts',
  'seal.ts',
  'supersedes.ts',
] as const;

/** Every `*.ts` under `dir`, recursively, as absolute paths. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

test('signature enforcement: signatureLayerHolds has exactly the seven call sites listed here', () => {
  const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
  const calling: string[] = [];
  for (const file of sourceFiles(srcRoot)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    // A CALL, not a mention: the name followed by '(' — which excludes every backticked
    // reference in a comment — and not the declaration line, which is the one `function`
    // form that also carries a '('.
    const calls = lines.some(
      (line) => line.includes('signatureLayerHolds(') && !line.includes('function'),
    );
    if (calls) calling.push(file.split(/[\\/]/).at(-1) ?? file);
  }
  assert.deepEqual(
    calling.sort(),
    [...SITES].sort(),
    'a signatureLayerHolds call site appeared or vanished — add its signature-broken pin, then update SITES',
  );
});
