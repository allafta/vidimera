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

// The same class of unresolvable pointer, in four shapes the patterns above miss. Each
// was measured over the whole tracked-TypeScript corpus before landing: every hit was a
// true positive, and the sweep that cleared all 24 of them is what took this file back
// to exit 0.

// A git-style abbreviated object name. The left/right guards stop an exponent tail
// inside a numeric literal (9.999999999999999e20) reading as one; requiring both a
// letter and a digit stops all-digit literals and all-letter words. A bare SHA in a
// comment points into a git history, and the scan cannot tell whose — so none belong in
// code, and a provenance claim is deleted rather than repointed. Two EXACT exclusions,
// `ed25519` and `ed448`: the Ed-curve algorithm names are public identifiers that are
// hex-shaped by coincidence — the AL2 mint increment's tests pass them to node:crypto —
// and are excluded exactly (the trailing guard on each keeps `ed25519abc` still a hit).
const commitRefPattern =
  /(?<![\w.])(?!ed25519(?![\w.]))(?!ed448(?![\w.]))(?=[0-9a-f]{7,40}(?![\w.]))(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{7,40}(?![\w.])/;

// The increment vocabulary, with or without a number. The left guard keeps the ordinary
// `.slice()` method call legal.
const sliceWordPattern = /(?<![.\w-])(?:pre-)?slices?\b/i;

// `design` as a document referent. "by design" is ordinary English and is excluded.
const designWordPattern = /(?<!\bby\s)\bdesign\b/i;

// The specific foreign matrix/ledger/task label shapes. Deliberately NOT "any short
// tag": C1-C4 are docs/concept/SPEC.md §12's own store-constraint names and T0 is a
// local test date constant (`const T0 = '2026-07-24T00:00:00.000Z'`), and a broader
// pattern flags all nine of them. `O\d+` not `O\d` — otherwise `O11` slips through the
// word boundary.
const foreignLabelPattern = /\b(?:M-[A-Z]\b|S-\d\b|O\d+\b|T\d+\.\d+\b)/;

const codeOnlyPatterns = [
  designSectionPattern,
  incrementPattern,
  taskPattern,
  openQuestionPattern,
  commitRefPattern,
  sliceWordPattern,
  designWordPattern,
  foreignLabelPattern,
];

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
// What it deliberately does NOT check. A gate that silently checks less than a
// reader assumes is the failure this check exists to fix, so its bounds are
// stated here rather than left to be discovered. Every one below was probed
// against this resolver and confirmed SILENT — none is a supposition:
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
//      quoted under `SPEC §9` still passes. Nor is it checked whether the
//      quotation supports the sentence built around it: occurrence is all this
//      verifies.
//   4. CITATIONS OUTSIDE THE TWO RECOGNIZED FORMS. Only `SPEC §N` and
//      `DECISIONS.md` are citations here. A bare `§N` with no `SPEC` prefix, a
//      bare `SPEC` with no section number (`The SPEC says "…"`), and prose
//      references to any other document are all unrecognized — so nothing they
//      attribute is checked either.
//   5. FORWARD ATTRIBUTION ACROSS A WORD — the largest bound by far, and the one
//      most likely to be mistaken for coverage. Apart from an optional
//      possessive and ONE optional sub-reference token, a letter or a digit
//      anywhere between the citation and the opening quote ends attribution, and
//      the quotation goes unchecked. That includes honest attribution phrased
//      with a connective clause: `SPEC §5 says the rule is that the "Total Chain
//      Integrity Doctrine" governs it` passes silently. `kernel/expiry.ts`'s
//      header is the in-repo example — its two §4 clauses ("no scheduler and no
//      public `expire()`", and the lazy-append clause) are verbatim §4 and are
//      NOT checked, because prose separates each from the citation. The window
//      is narrow because widening it to admit words reintroduces the measured
//      false positives bound 1 describes, not because the excluded class is
//      unfaithful. Whether any given site sits in this class is MEASURABLE
//      rather than guessable — diff these findings against those from a copy
//      whose gap admits words — so measure before naming one, and re-measure
//      after editing it. An earlier revision of this list named two files that
//      its own commit had already moved back inside the window.
//   6. QUOTATIONS PAST THE END OF A RUN. A run continues only while the gaps
//      between quotations carry neither a letter nor a digit; the first gap that
//      does ends the run, and quotations after it are unchecked — UNLESS a later
//      citation in the same comment unit re-opens attribution at its own
//      position. So `(SPEC §4 "Clock-driven edges…"): the library ships "a full
//      background scheduler and a public expire() entry point"` verifies the
//      real heading and waves the fabrication through, while the same
//      fabrication written after a second, abutting `SPEC §4:` is caught. Both
//      halves of that were probed.
//   7. SHORT QUOTATIONS. A quoted fragment under 6 characters carries too little
//      to search on and is discarded, so `SPEC §5 "C3ish"` passes.
//   8. NON-ASCII QUOTATION MARKS. Only the ASCII `"` opens and closes a
//      quotation here, so a quotation in curly quotes is invisible. That is a
//      live risk rather than a hypothetical one — this corpus already carries
//      `—`, `→` and `§`, so typographic quotes could arrive the same way.

// A section number as SPEC.md heads them: `## 13A.`, `### 2.1`, `## 5.`.
const specHeadingPattern = /^#{2,3}\s+(\d+[A-Za-z]?(?:\.\d+)?)[.\s]/;
// DECISIONS.md is ONE ordered list numbered 1-30 continuing across its six `##`
// headings, so the entry number is the list marker, not a per-heading restart.
const decisionEntryPattern = /^(\d+)\.\s/;

const specCitationPattern = /SPEC\s+§(\d+[A-Za-z]?(?:\.\d+)?)/g;
const decisionsCitationPattern = /DECISIONS\.md(?:\s*#(\d+))?/g;

// The gap the attribution rule allows between a citation and an opening quote:
// an optional possessive, an optional SINGLE sub-reference token, and any run of
// characters that are neither letters nor digits. A LETTER OR DIGIT is what ends
// attribution — that is the whole rule, and bound 5 states it in those terms.
//
// The complement of the class matters as much as the class. An earlier version
// enumerated the punctuation it accepted (`[\s)\]}>,:;—–-]`) and documented
// itself as "any word ends attribution", which was false in a direction a reader
// could not see: a backtick, a slash, an arrow, a paren or a `**` emphasis
// marker between the citation and the quote all ended attribution too. This
// codebase backticks identifiers everywhere, so `(SPEC §12's \`C3\`): "…"` — a
// purely cosmetic edit to the corpus's largest repaired quotation — silently
// de-gated it with the suite green. Enumerating an accept set and describing it
// as its much larger complement is the same defect class this whole check
// exists to remove. Both gaps now use the same complement form, so "punctuation"
// means one thing here.
//
// It is still a HEURISTIC with a known failure direction, not a fact about
// English, and it under-approximates on purpose. An intervening word is treated
// as evidence that the quotation is prose ABOUT something rather than a
// quotation OF the cited section — right for `pins the "raw UTF-8 string"
// reading of SPEC §4 against a "JCS of a wrapper object" misreading`, the case
// that forced the narrowness, and WRONG whenever an author attributes faithfully
// through a connective clause, which this corpus does in several places. That
// miss is bounds 5 and 6, accepted and documented rather than closed: every
// widening tried that admits words bought false positives and no true positives.
// No count here on purpose. An earlier revision said "two" and was wrong the day
// it was written — the sites were already enumerated in the review record it was
// drawn from. A bare number in a comment is a claim with a shelf life, and this
// one has no way to fail loudly; bound 5 gives the measurement that answers it
// at any point in time, which is the durable form of the same information.
//
// One behaviour changed with the class. The period is no longer excluded, so a
// sentence break no longer ends attribution — `SPEC §5. "…"` is now checked.
// That is a widening, measured at zero findings over the tracked corpus, and it
// is stated here because the previous comment claimed the opposite.
//
// `"` must stay out of the class or the gap walks straight past the opening
// quote it is supposed to stop at — pinned by a test, because the mutant with
// `"` in the class mis-attributes without failing anything else. The `u` flag is
// required for `\p{…}`. The possessive accepts U+2019 as well as ASCII `'`:
// nothing here smart-quotes today, so that is latent rather than live, but it is
// the `(SPEC §12's C3)` de-gating shape reached through one substituted
// character, and bound 8 already names typographic drift as the risk class.
const attributionGapPattern =
  /^(?:['’]s)?[^\p{L}\p{N}"]*(?:(?:C\d+|#\d+|§\d+[A-Za-z]?(?:\.\d+)?|reads|says)[^\p{L}\p{N}"]*)?"/u;
// Between one closing quote and the next opening quote: anything that is neither
// a letter nor a digit continues the run; the first gap carrying one ends it.
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

// Does the quoted string occur in the document? Five allowances, all of which
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

    // Any other line is its own unit, so a citation inside a runtime `throw`
    // string or a vitest `test('…')` name is checked along with whatever it
    // attributes ON THAT LINE — probed both ways. A string literal broken across
    // lines by concatenation is several units, and a citation on one line never
    // reaches a quotation on the next; that is the same one-unit limit that
    // applies to every construct here, not a gap specific to these two.
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
