#!/usr/bin/env node
// Standalone-contract scan (see CLAUDE.md): tracked markdown, except CLAUDE.md
// itself, must reference nothing outside this repository. Tracked TypeScript is
// scanned too, under the checks that apply to code. Clean: no output, exit 0.
// Findings: path:line:text on stdout, exit 1.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();

function tracked(...globs) {
  return execFileSync('git', ['ls-files', '-z', '--', ...globs], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .split('\0')
    .filter((path) => path !== '' && path !== 'CLAUDE.md');
}

const trackedMarkdown = tracked('*.md');
const trackedTypeScript = tracked('*.ts', '*.mts', '*.cts');

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
const urlPattern = /https?:\/\/([^\s/)\]>"']+)/g;
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

// Code-only checks. Inherited source carries pointers into a design-document,
// per-increment and open-question numbering scheme that does not exist in this
// repository: `design §4`, `slice 7`, `Task 5`, `OQ2-10`. A reader cannot
// resolve them here, so they are external references in the contract's sense.
// These patterns are code-only on purpose: this repository's own plans number
// their tasks, and the escaping-relative-path check is a document contract,
// not a code one — a TypeScript import of `../types.js` is ordinary and stays
// legal.
const designSectionPattern = /\bdesign\s+§/i;
const incrementPattern = /\bslices?[\s-]?\d/i;
const taskPattern = /\btasks?[\s-]\d/i;
const openQuestionPattern = /\bOQ\d*-\d/i;

const codeOnlyPatterns = [designSectionPattern, incrementPattern, taskPattern, openQuestionPattern];

const files = [
  ...trackedMarkdown.map((path) => ({
    path,
    patterns: conceptScope.test(path) ? [escapePattern, ...repoWidePatterns] : repoWidePatterns,
  })),
  ...trackedTypeScript.map((path) => ({
    path,
    patterns: [...repoWidePatterns, ...codeOnlyPatterns],
  })),
];

let findings = 0;
for (const { path, patterns } of files) {
  const lines = readFileSync(join(repoRoot, path), 'utf8').split('\n');
  lines.forEach((line, index) => {
    const flagged = patterns.some((pattern) =>
      typeof pattern === 'function' ? pattern(line) : pattern.test(line),
    );
    if (flagged) {
      findings += 1;
      console.log(`${path}:${index + 1}:${line.trim()}`);
    }
  });
}

process.exit(findings === 0 ? 0 : 1);
