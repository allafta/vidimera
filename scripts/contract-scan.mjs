#!/usr/bin/env node
// Standalone-contract scan (see CLAUDE.md): tracked markdown, except CLAUDE.md
// itself, must reference nothing outside this repository. Tracked TypeScript is
// scanned too, under the checks that apply to code. Clean: no output, exit 0.
// Findings: path:line:text on stdout, exit 1.
//
// Two kinds of check run here:
//   - per-line patterns (a regex or a `(line) => boolean` predicate), and
//   - per-file checks, `(text) => [{ line, text }]`, for anything structural.
// Findings from both kinds are merged and sorted by line before printing, so the
// output format stays exactly `path:line:text` whichever kind produced it.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

function tracked(repoRoot, ...globs) {
  return execFileSync('git', ['ls-files', '-z', '--', ...globs], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .split('\0')
    .filter((path) => path !== '' && path !== 'CLAUDE.md');
}

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

// ---------------------------------------------------------------------------
// Citation integrity (per-file, code-only)
// ---------------------------------------------------------------------------
//
// The four patterns above are syntactic: they say a citation is not shaped like
// a pointer into some other project's documents. They say nothing about whether
// a citation RESOLVES. A bulk comment scrub that rewrote foreign pointers into
// `SPEC §N` / `DECISIONS.md` form passed all of them while carrying foreign
// section TITLES across inside quotation marks. This check closes that gap.
//
// What it checks, for tracked TypeScript only:
//   - `SPEC §N` names a section that exists in docs/concept/SPEC.md;
//   - `DECISIONS.md #N` names an entry that exists in docs/concept/DECISIONS.md;
//   - a quotation ATTRIBUTED to a citation occurs in the document cited.
//
// What it deliberately does NOT check — a gate that silently checks less than a
// reader assumes is the failure this check exists to fix, so the bounds are
// stated here rather than left to be discovered:
//
//   1. REVERSE ATTRIBUTION — `"phrase" (SPEC §N)`. English uses that form both
//      for quotation and for "see also", and on this corpus including it
//      produced false positives and no true positives. Out of scope by measured
//      choice, not oversight.
//   2. UNQUOTED CLAIMS. `SPEC §9.1's redeem block` naming a field §9.1 does not
//      define is a semantic defect this check cannot see. A wrong claim without
//      quotation marks stays a reader's job.
//   3. WHETHER THE QUOTED TEXT IS IN THE CITED SECTION. The check searches the
//      whole document, not the section's line range, so a real §4 sentence
//      quoted under `SPEC §9` still passes.
//   4. Bare `§N` with no `SPEC` prefix, and prose references to any document
//      other than these two.

// A section number as SPEC.md heads them: `## 13A.`, `### 2.1`, `## 5.`.
const specHeadingPattern = /^#{2,3}\s+(\d+[A-Za-z]?(?:\.\d+)?)[.\s]/;
// DECISIONS.md is ONE ordered list numbered 1-30 continuing across its six `##`
// headings, so the entry number is the list marker, not a per-heading restart.
const decisionEntryPattern = /^(\d+)\.\s/;

const specCitationPattern = /SPEC\s+§(\d+[A-Za-z]?(?:\.\d+)?)/g;
const decisionsCitationPattern = /DECISIONS\.md(?:\s*#(\d+))?/g;

// The gap the attribution rule allows between a citation and an opening quote:
// an optional possessive, an optional SINGLE sub-reference token, and closing
// punctuation. Anything else — a preposition, an article, a verb phrase, a
// sentence break — means the quotation is prose ABOUT something rather than a
// quotation OF the cited section. Note the period is NOT in the punctuation
// class: a sentence break ends attribution.
const attributionGapPattern =
  /^(?:'s)?[\s)\]}>,:;—–-]*(?:(?:C\d+|#\d+|§\d+[A-Za-z]?(?:\.\d+)?|reads|says)[\s)\]}>,:;—–-]*)?"/;
// Between one closing quote and the next opening quote, pure punctuation and
// whitespace continues the run; the first gap carrying a word ends it.
const quotationRunGapPattern = /^[^\p{L}\p{N}]*$/u;

function collapse(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function stripMarkdown(text) {
  return text.replace(/[*_`]/g, '');
}

function haystacks(body) {
  return {
    raw: collapse(body).toLowerCase(),
    stripped: collapse(stripMarkdown(body)).toLowerCase(),
  };
}

function parseSpecSections(spec) {
  const sections = new Set();
  for (const line of spec.split('\n')) {
    const match = specHeadingPattern.exec(line);
    if (match) {
      sections.add(match[1]);
    }
  }
  return sections;
}

function parseDecisionEntries(decisions) {
  const entries = new Set();
  for (const line of decisions.split('\n')) {
    const match = decisionEntryPattern.exec(line);
    if (match) {
      entries.add(match[1]);
    }
  }
  return entries;
}

// Does the quoted string occur in the document? Four allowances, all of which
// were needed to reach zero false positives on this corpus:
//   - whitespace-normalize both sides (comment blocks and the document wrap
//     differently);
//   - match case-insensitively (a dropped capital fitting a quotation into a
//     sentence is ordinary editorial practice);
//   - try the raw document and a markdown-stripped copy (a quotation spanning a
//     `**bold**` boundary resolves only against the stripped copy);
//   - split on elisions (`...` / `…`): the comment asserts each fragment occurs,
//     not the joined string. Fragments under 6 characters carry no evidence and
//     are discarded, and `[editorial brackets]` are dropped before comparing;
//   - drop a single trailing sentence-final period. Putting the sentence's own
//     period inside the closing quote is ordinary editorial practice, the same
//     class of allowance as the dropped capital above: `memory.ts`'s C3 quote
//     ends `…the two carved exceptions."` where SPEC §12 has a colon there, and
//     the rest of it is verbatim. The allowance only ever adds permissiveness —
//     every fabricated quotation on this corpus still fails without its period.
function quotationResolves(quoted, doc) {
  const fragments = quoted
    .split(/\.\.\.|…/)
    .map((fragment) => collapse(fragment.replace(/\[[^\]]*\]/g, ' ')).replace(/\.$/, ''))
    .filter((fragment) => fragment.length >= 6);
  if (fragments.length === 0) {
    return true; // nothing substantive was asserted
  }
  return fragments.every((fragment) => {
    const plain = fragment.toLowerCase();
    const stripped = collapse(stripMarkdown(fragment)).toLowerCase();
    return doc.raw.includes(plain) || doc.stripped.includes(stripped);
  });
}

// Comment BLOCKS, not lines: 2 of the 3 known fabricated-title defects span a
// line break and a per-line scan cannot see them. Each unit carries the joined
// text plus the offset->source-line map that puts a finding back on the line the
// citation actually sits on.
function commentUnits(text) {
  const lines = text.split('\n');
  const units = [];
  let current = null;

  const open = () => {
    current = { text: '', pieces: [] };
    units.push(current);
  };
  const push = (piece, lineNumber) => {
    if (current === null) {
      open();
    }
    if (current.text !== '') {
      current.text += ' ';
    }
    current.pieces.push({ start: current.text.length, line: lineNumber });
    current.text += piece;
  };
  const close = () => {
    current = null;
  };

  let inBlockComment = false;
  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;

    if (inBlockComment) {
      const end = line.indexOf('*/');
      const body = end === -1 ? line : line.slice(0, end);
      push(body.replace(/^\s*\*+/, '').trim(), lineNumber);
      if (end !== -1) {
        inBlockComment = false;
        close();
      }
      continue;
    }

    const trimmed = line.trim();
    const blockStart = line.indexOf('/*');
    const lineComment = /^\/\//.test(trimmed);

    if (blockStart !== -1 && !lineComment) {
      close();
      const end = line.indexOf('*/', blockStart + 2);
      open();
      if (end === -1) {
        push(
          line
            .slice(blockStart + 2)
            .replace(/^\*+/, '')
            .trim(),
          lineNumber,
        );
        inBlockComment = true;
      } else {
        push(
          line
            .slice(blockStart + 2, end)
            .replace(/^\*+/, '')
            .trim(),
          lineNumber,
        );
        close();
      }
      continue;
    }

    if (lineComment) {
      const body = trimmed.replace(/^\/\/+/, '').trim();
      // A banner is a section separator, not prose continuing the comment above
      // it. Without this, a banner's text joins the prose around it and
      // manufactures quotations that were never adjacent.
      if (/^={3,}/.test(body) || /={3,}$/.test(body)) {
        close();
        open();
        push(body, lineNumber);
        close();
      } else {
        push(body, lineNumber);
      }
      continue;
    }

    // Any other line is its own unit, so citations inside runtime `throw`
    // strings and inside vitest `test('…')` names are still checked.
    close();
    open();
    push(line.trim(), lineNumber);
    close();
  }

  return units.filter((unit) => unit.text !== '');
}

function lineFor(unit, offset) {
  let line = unit.pieces.length > 0 ? unit.pieces[0].line : 1;
  for (const piece of unit.pieces) {
    if (piece.start <= offset) {
      line = piece.line;
    } else {
      break;
    }
  }
  return line;
}

// Every quotation attributed to the citation ending at `from`, as a run: keep
// consuming quotations while the gap between one closing `"` and the next
// opening `"` is pure punctuation and whitespace. A citation can attribute more
// than one quotation, and checking only the first misses the second.
function attributedQuotations(text, from) {
  const gap = attributionGapPattern.exec(text.slice(from));
  if (gap === null) {
    return [];
  }
  const quotations = [];
  let cursor = from + gap[0].length; // just past the opening quote
  for (;;) {
    const close = text.indexOf('"', cursor);
    if (close === -1) {
      break;
    }
    quotations.push(text.slice(cursor, close));
    const next = text.indexOf('"', close + 1);
    if (next === -1 || !quotationRunGapPattern.test(text.slice(close + 1, next))) {
      break;
    }
    cursor = next + 1;
  }
  return quotations;
}

/**
 * Citation findings for one file's text. Pure: no filesystem, no git, no exit.
 * `documents` carries the two document bodies so a test can feed synthetic ones.
 */
export function citationFindings(text, documents) {
  const { spec, decisions } = documents;
  const sections = parseSpecSections(spec);
  const entries = parseDecisionEntries(decisions);
  const specDoc = haystacks(spec);
  const decisionsDoc = haystacks(decisions);
  const findings = [];

  for (const unit of commentUnits(text)) {
    const citations = [];
    for (const match of unit.text.matchAll(specCitationPattern)) {
      citations.push({
        label: `SPEC §${match[1]}`,
        exists: sections.has(match[1]),
        missing: `SPEC §${match[1]}: no such section in docs/concept/SPEC.md`,
        doc: specDoc,
        end: match.index + match[0].length,
      });
    }
    for (const match of unit.text.matchAll(decisionsCitationPattern)) {
      const entry = match[1];
      citations.push({
        label: entry === undefined ? 'DECISIONS.md' : `DECISIONS.md #${entry}`,
        exists: entry === undefined || entries.has(entry),
        missing: `DECISIONS.md #${entry}: no such entry in docs/concept/DECISIONS.md`,
        doc: decisionsDoc,
        end: match.index + match[0].length,
      });
    }

    for (const citation of citations) {
      const line = lineFor(unit, citation.end);
      if (!citation.exists) {
        findings.push({ line, text: citation.missing });
        continue;
      }
      for (const quoted of attributedQuotations(unit.text, citation.end)) {
        if (!quotationResolves(quoted, citation.doc)) {
          findings.push({
            line,
            text: `${citation.label}: attributed quotation not found in the cited document: "${collapse(quoted)}"`,
          });
        }
      }
    }
  }

  return findings;
}

function runScan(repoRoot) {
  const specPath = join(repoRoot, 'docs/concept/SPEC.md');
  const decisionsPath = join(repoRoot, 'docs/concept/DECISIONS.md');
  const missing = [specPath, decisionsPath].filter((path) => !existsSync(path));
  if (missing.length > 0) {
    // A missing concept document is a finding, not a crash: the citation check
    // cannot run, and silently skipping it would be the blind spot again.
    for (const path of missing) {
      console.log(`${path}:0:citation check cannot run — the document is missing`);
    }
    return 1;
  }
  const documents = {
    spec: readFileSync(specPath, 'utf8'),
    decisions: readFileSync(decisionsPath, 'utf8'),
  };

  const trackedMarkdown = tracked(repoRoot, '*.md');
  const trackedTypeScript = tracked(repoRoot, '*.ts', '*.mts', '*.cts');

  const files = [
    ...trackedMarkdown.map((path) => ({
      path,
      patterns: conceptScope.test(path) ? [escapePattern, ...repoWidePatterns] : repoWidePatterns,
      fileChecks: [],
    })),
    ...trackedTypeScript.map((path) => ({
      path,
      patterns: [...repoWidePatterns, ...codeOnlyPatterns],
      fileChecks: [(text) => citationFindings(text, documents)],
    })),
  ];

  let total = 0;
  for (const { path, patterns, fileChecks } of files) {
    const text = readFileSync(join(repoRoot, path), 'utf8');
    const findings = [];
    text.split('\n').forEach((line, index) => {
      const flagged = patterns.some((pattern) =>
        typeof pattern === 'function' ? pattern(line) : pattern.test(line),
      );
      if (flagged) {
        findings.push({ line: index + 1, text: line.trim() });
      }
    });
    for (const check of fileChecks) {
      findings.push(...check(text, path));
    }
    findings.sort((a, b) => a.line - b.line);
    for (const finding of findings) {
      total += 1;
      console.log(`${path}:${finding.line}:${finding.text}`);
    }
  }
  return total === 0 ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim();
  process.exit(runScan(repoRoot));
}
