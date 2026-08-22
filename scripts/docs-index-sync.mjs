// docs-index-sync.mjs — the increment-record drift gate (the truth-repairs increment):
// docs/superpowers/INDEX.md carries counted claims about docs/superpowers/specs/,
// docs/superpowers/plans/ and docs/analysis/, and a table naming one row per increment.
// Markdown is never citation-checked and no other gate reads a prose count, so this script
// is the only mechanical check behind those claims.
//
// What it checks — TWO directions, both presence-shaped: every tracked file in specs/ and
// plans/ must be named somewhere in INDEX.md (`file-not-indexed`), and each stated count
// must equal the tracked file count for its directory (`count-mismatch`). Clean = no
// output and exit 0, the convention both sibling gates use. Findings go to stderr, which
// matches api-reference-sync and differs from contract-scan, which prints to stdout.
//
// Bounds, stated plainly (read before treating a green run as coverage): it proves
// presence and arithmetic, never accuracy — a row carrying the wrong date, the wrong
// increment name, or the wrong build-order step passes; a file named only inside an
// unrelated sentence counts as named; and it reads tracked files only, so an unstaged new
// document is invisible until `git add`. It does not check docs/analysis/ for rows,
// because that directory has never been tabulated — only its count is claimed.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Tracked files under `dir` matching `*.md`, as basenames. */
export function trackedBasenames(repoRoot, dir) {
  const out = execFileSync('git', ['ls-files', '-z', '--', `${dir}/*.md`], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return out
    .split('\0')
    .filter((p) => p !== '')
    .map((p) => basename(p));
}

/** The three counts INDEX.md states, or null for a sentence that is absent. */
export function statedCounts(indexText) {
  const pair = indexText.match(/(\d+)\s+files?\s+in\s+`specs\/`,\s*(\d+)\s+in\s+`plans\/`/);
  const analysisNumeric = indexText.match(/`docs\/analysis\/`\*\*\s+holds\s+(\d+)\s+files?/);
  const analysisWordOne = /`docs\/analysis\/`\*\*\s+holds\s+one\s+file/.test(indexText);
  return {
    specs: pair === null ? null : Number(pair[1]),
    plans: pair === null ? null : Number(pair[2]),
    analysis: analysisNumeric !== null ? Number(analysisNumeric[1]) : analysisWordOne ? 1 : null,
  };
}

/** The basenames that do NOT occur in the index text. */
export function unlistedFiles(basenames, indexText) {
  return basenames.filter((name) => !indexText.includes(name));
}

function main() {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const indexPath = join('docs', 'superpowers', 'INDEX.md');
  const indexText = readFileSync(join(repoRoot, indexPath), 'utf8');

  const specs = trackedBasenames(repoRoot, 'docs/superpowers/specs');
  const plans = trackedBasenames(repoRoot, 'docs/superpowers/plans');
  const analysis = trackedBasenames(repoRoot, 'docs/analysis');

  const findings = [];
  for (const name of unlistedFiles([...specs, ...plans], indexText)) {
    findings.push(`${indexPath}: file-not-indexed: ${name}`);
  }
  const stated = statedCounts(indexText);
  const actual = { specs: specs.length, plans: plans.length, analysis: analysis.length };
  for (const key of ['specs', 'plans', 'analysis']) {
    if (stated[key] === null) {
      findings.push(`${indexPath}: count-absent: no stated count for ${key}`);
    } else if (stated[key] !== actual[key]) {
      findings.push(
        `${indexPath}: count-mismatch: ${key} states ${stated[key]}, tracked files number ${actual[key]}`,
      );
    }
  }

  for (const finding of findings) {
    console.error(finding);
  }
  if (findings.length > 0) process.exit(1);
}

// Run as a script (`node scripts/docs-index-sync.mjs`); importing the module (the test
// does) must not run the gate — the argv check is the cross-platform way to tell.
if (process.argv[1]?.endsWith('docs-index-sync.mjs')) {
  main();
}
