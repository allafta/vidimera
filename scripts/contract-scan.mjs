#!/usr/bin/env node
// Standalone-contract scan (see CLAUDE.md): tracked markdown, except CLAUDE.md
// itself, must reference nothing outside this repository. Clean: no output,
// exit 0. Findings: path:line:text on stdout, exit 1.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();

const trackedMarkdown = execFileSync('git', ['ls-files', '-z', '--', '*.md'], {
  cwd: repoRoot,
  encoding: 'utf8',
})
  .split('\0')
  .filter((path) => path !== '' && path !== 'CLAUDE.md');

// Self-containment (no relative paths escaping scope) is the contract for the
// concept set and the root README; engineering docs elsewhere may quote code
// with intra-repo relative imports. The external-link and ADR-style checks
// apply repo-wide.
const conceptScope = /^(docs\/concept\/|README\.md$)/;

const escapePattern = /\.\.\//; // relative path escaping the self-contained scope
const repoWidePatterns = [
  /docs\/adr/, // ADR-style internal reference
  /https?:\/\/(?!.*example\.com)/, // external link (spec's worked examples excepted)
];

let findings = 0;
for (const path of trackedMarkdown) {
  const activePatterns = conceptScope.test(path)
    ? [escapePattern, ...repoWidePatterns]
    : repoWidePatterns;
  const lines = readFileSync(join(repoRoot, path), 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (activePatterns.some((pattern) => pattern.test(line))) {
      findings += 1;
      console.log(`${path}:${index + 1}:${line.trim()}`);
    }
  });
}

process.exit(findings === 0 ? 0 : 1);
