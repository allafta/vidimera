// api-reference-sync.mjs — the api-reference drift gate (the phase-5 ruling,
// docs/analysis/2026-08-19-phase-5-docs.md): docs/guide/api-reference.md is derived from
// source and markdown carries no citation gate, so this script is the one mechanical
// check behind the PR template's "api-reference moved with the surface" checkbox.
//
// What it checks — ONE direction, deliberately: every name
// packages/record/src/index.ts exports (values and types alike) must occur, as a whole
// word, somewhere in docs/guide/api-reference.md. A missing name is a finding
// (`name-not-documented`), printed one per line, exit 1; clean is silent exit 0, the
// contract-scan convention.
//
// Bounds, stated plainly (read before treating a green run as coverage): it proves
// presence, never accuracy — a documented name with a stale signature, wrong prose, or
// the wrong section passes; it reads only record's entry point (the store-postgres
// package's two exports are documented in prose the gate does not parse); and it does
// not check the reverse direction, because the reference legitimately names many
// non-exported things (inline field types, deliberately-internal names like
// createWithClock).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Every identifier exported by an `export { ... } from` or `export type { ... } from`
 * clause in the given source text. Multi-line blocks supported; `a as b` re-exports
 * would surface as `b` (none exist today, but the published name is the documented
 * name, so `b` is the right answer if one appears). */
export function exportedNames(indexSource) {
  const names = [];
  const clause = /export\s+(?:type\s+)?\{([^}]*)\}\s*from/g;
  for (const match of indexSource.matchAll(clause)) {
    const body = match[1];
    if (body === undefined) continue;
    for (const raw of body.split(',')) {
      const entry = raw.trim();
      if (entry === '') continue;
      const asMatch = entry.match(/\bas\s+(\w+)$/);
      names.push(asMatch?.[1] ?? entry);
    }
  }
  return names;
}

/** The exported names that do NOT occur as a whole word in the reference text. */
export function undocumentedNames(names, referenceText) {
  return names.filter((name) => !new RegExp(`\\b${name}\\b`).test(referenceText));
}

function main() {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const index = readFileSync(join(repoRoot, 'packages', 'record', 'src', 'index.ts'), 'utf8');
  const reference = readFileSync(join(repoRoot, 'docs', 'guide', 'api-reference.md'), 'utf8');
  const missing = undocumentedNames(exportedNames(index), reference);
  for (const name of missing) {
    console.error(`docs/guide/api-reference.md: name-not-documented: ${name}`);
  }
  if (missing.length > 0) process.exit(1);
}

// Run as a script (`node scripts/api-reference-sync.mjs`); importing the module (the
// test does) must not run the gate — the argv check is the cross-platform way to tell.
if (process.argv[1]?.endsWith('api-reference-sync.mjs')) {
  main();
}
