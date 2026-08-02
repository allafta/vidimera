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
const adrPattern = /docs\/adr/; // ADR-style internal reference

// External link exception applies per URL, not per line: a line can carry
// more than one URL, and a substring match on "example.com" anywhere in the
// line would blanket-whitelist a real leak sharing the line, or wave through
// a lookalike host that merely contains the string. Extract every URL and
// flag the line unless each one resolves to example.com or a subdomain of it
// (the spec's worked examples are the intended exception).
const urlPattern = /https?:\/\/([^\s\/)\]>"']+)/g;
const allowedHost = /(^|\.)example\.com$/;

function hasExternalLink(line) {
  for (const match of line.matchAll(urlPattern)) {
    const host = match[1].split(':')[0]; // drop a port, if present
    if (!allowedHost.test(host)) {
      return true;
    }
  }
  return false;
}

const repoWidePatterns = [adrPattern, hasExternalLink];

let findings = 0;
for (const path of trackedMarkdown) {
  const activePatterns = conceptScope.test(path)
    ? [escapePattern, ...repoWidePatterns]
    : repoWidePatterns;
  const lines = readFileSync(join(repoRoot, path), 'utf8').split('\n');
  lines.forEach((line, index) => {
    const flagged = activePatterns.some((pattern) =>
      typeof pattern === 'function' ? pattern(line) : pattern.test(line),
    );
    if (flagged) {
      findings += 1;
      console.log(`${path}:${index + 1}:${line.trim()}`);
    }
  });
}

process.exit(findings === 0 ? 0 : 1);
