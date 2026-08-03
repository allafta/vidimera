// Tests for the contract scan's citation-integrity resolver (`scripts/contract-scan.mjs`).
//
// Why this file is `.mjs` and not `.ts`: the scan reads tracked `*.ts`/`*.mts`/`*.cts`, so a
// planted violation inside a `.ts` fixture would be scanned by the gate itself and would make
// `pnpm contract-scan` permanently red against its own test data. `.mjs` is outside the scan's
// globs, so the fixtures below can carry the exact defects the resolver is meant to catch.
//
// Why the documents are synthetic: a test that fed the real `docs/concept/SPEC.md` would start
// failing the day someone edits a heading, and would be testing the corpus rather than the
// resolver. `citationFindings` takes both document bodies as arguments precisely so this file
// can be hermetic — no filesystem, no git, no dependence on today's spec wording.
import { describe, expect, test } from 'vitest';
import { citationFindings } from '../contract-scan.mjs';

// A stand-in SPEC. Sections 2, 4, 5 and 12 exist; 99 does not. The prose below is written to
// isolate one matching rule at a time.
const spec = [
  '# Synthetic SPEC (test fixture)',
  '',
  '## 2. The record model **[PROVEN]**',
  '',
  '**States and terminality.** `open` is the only pre-decision state.',
  '',
  '## 4. Transitions & the encoding **[PROVEN]**',
  '',
  '**The digest input, stated exactly.** The JCS serialization of the envelope.',
  '',
  'Every digest field is a string, and the encoding stringifies the sequence number.',
  '',
  '## 5. Chaining & replay/verify **[PROVEN]**',
  '',
  "**Operator audit functions.** The library exposes two functions over a record's",
  'chain, for the operator to audit with.',
  '',
  'The transitioned-from state, **not the payload**, distinguishes one edge from the',
  'next.',
  '',
  'An elided sentence opens with a leading clause and, after a good deal of',
  'intervening text, closes with a trailing clause.',
  '',
  '## 12. Storage interface **[PROVEN]**',
  '',
  'The interface is **provisional pre-1.0**.',
  '',
].join('\n');

// A stand-in DECISIONS.md: one ordered list, entries 10 and 11. Entry 99 does not exist.
const decisions = [
  '# Synthetic DECISIONS (test fixture)',
  '',
  '## Outcomes & errors',
  '',
  '10. **Result-first outcomes; refusals returned, never thrown.** Exceptions are',
  '    reserved for caller/config errors and storage faults.',
  '',
  '11. **Caller errors are loud throws.** An unknown profile identifier throws.',
  '',
].join('\n');

const documents = { spec, decisions };

/** Findings for a synthetic file body given as an array of source lines. */
function scan(lines) {
  return citationFindings(lines.join('\n'), documents);
}

describe('citationFindings — catches', () => {
  test('a fabricated section title quoted against a section that has no such phrase', () => {
    const findings = scan([
      '// The audit surface (SPEC §5 "Chain integrity") recomputes the linkage.',
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].line).toBe(1);
  });

  test('a citation to a section number that does not exist', () => {
    const findings = scan(['// The rule lives in SPEC §99.']);
    expect(findings).toHaveLength(1);
    expect(findings[0].text).toContain('§99');
  });

  test('a DECISIONS.md entry number that does not exist', () => {
    const findings = scan(['// See DECISIONS.md #99 for the rationale.']);
    expect(findings).toHaveLength(1);
    expect(findings[0].text).toContain('#99');
  });

  test('an elided quotation where only the first fragment occurs', () => {
    const findings = scan([
      '// SPEC §5: "An elided sentence opens with a leading clause ... and closes with a',
      '// clause that was never written down anywhere".',
    ]);
    expect(findings).toHaveLength(1);
  });

  test('a fabricated title in a block comment spanning two lines, reported on the citation line', () => {
    const findings = scan([
      'export type ChainVerifyReport = { intact: boolean };',
      '',
      '/**',
      ' * `verifyChain(chain)` (SPEC §5',
      ' * "Chain integrity"): recomputes every transition\'s digest linkage.',
      ' */',
    ]);
    expect(findings).toHaveLength(1);
    // The citation sits on line 4; the quotation opens on line 5. The finding must land on the
    // citation's own line so `path:line:text` stays clickable at the pointer, not at the quote.
    expect(findings[0].line).toBe(4);
  });

  test('the SECOND quotation of an attributed run, when the first one resolves', () => {
    const findings = scan([
      '// (SPEC §5 "Operator audit functions"): "a sentence assembled from the section\'s',
      '// substance and presented as though it were the section\'s own text".',
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].text).toContain('assembled');
  });

  test('a quotation attributed to DECISIONS.md that occurs only in the SPEC', () => {
    const findings = scan(['// DECISIONS.md: "Chaining & replay/verify" is not a decision entry.']);
    expect(findings).toHaveLength(1);
  });

  test('a fabricated quotation attributed through a possessive and a sub-reference token', () => {
    // The accept path, not the reject path: `SPEC §12's C3: "…"` is the shape the largest
    // repaired site in the corpus (`store/memory.ts`) uses. Every other catching case here
    // attributes through plain punctuation, so dropping `(?:'s)?` or the token alternation
    // from `attributionGapPattern` would silently de-gate that site with the suite still
    // green. This assertion is what makes that regression fail.
    const findings = scan(['// C3\'s carve-out (SPEC §12\'s C3): "a phrase §12 never contains".']);
    expect(findings).toHaveLength(1);
    expect(findings[0].line).toBe(1);
  });

  test('a citation inside a vitest test name, which is its own single-line unit', () => {
    const findings = scan([
      'test(\'SPEC §5 "Chain integrity": the chain verifies\', async () => {',
      '  expect(true).toBe(true);',
      '});',
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].line).toBe(1);
  });
});

describe('citationFindings — stays silent', () => {
  test('a quotation that is verbatim in the cited document', () => {
    expect(scan(['// The chain rules (SPEC §5 "Chaining & replay/verify") apply here.'])).toEqual(
      [],
    );
  });

  test('a quotation that matches only after whitespace-normalizing across a line break', () => {
    // The document wraps after "record\'s"; the comment wraps after "over a".
    expect(
      scan([
        '// The two audit functions (SPEC §5 "The library exposes two functions over a',
        '// record\'s chain") are the operator surface.',
      ]),
    ).toEqual([]);
  });

  test('a quotation that matches only after markdown stripping', () => {
    // The document sets `not the payload` in bold, so the phrase spans a `**` boundary.
    expect(
      scan(['// SPEC §5: "the transitioned-from state, not the payload, distinguishes".']),
    ).toEqual([]);
  });

  test('a quotation that matches only case-insensitively', () => {
    // The document opens the sentence with a capital; the comment drops it to fit its own.
    expect(scan(['// per SPEC §4: "every digest field is a string".'])).toEqual([]);
  });

  test('an elided quotation where every fragment occurs', () => {
    expect(
      scan([
        '// SPEC §5: "An elided sentence opens with a leading clause ... closes with a',
        '// trailing clause".',
      ]),
    ).toEqual([]);
  });

  test('a quotation that is prose ABOUT the section rather than a quotation OF it', () => {
    // The comment names a misreading the code exists to rule out. Attribution requires the
    // quote to follow the citation with nothing between but punctuation, a possessive, or a
    // single sub-reference token — a verb phrase or a preposition breaks it.
    expect(
      scan([
        '// pins the "raw UTF-8 string" reading of SPEC §4 against a',
        '// "JCS of a wrapper object" misreading.',
      ]),
    ).toEqual([]);
  });

  test('the reverse-attribution form, which is a documented out-of-scope bound', () => {
    // `"phrase" (SPEC §N)` is used in English both for quotation and for "see also"; the
    // resolver deliberately does not check it. This test pins that bound so the omission
    // stays a choice rather than a regression.
    expect(scan(['// "Chain integrity" (SPEC §5) is the property under test.'])).toEqual([]);
  });

  test('a banner line does not join the prose around it and manufacture a quotation', () => {
    // A comment line starting or ending with three or more `=` is a section separator, not
    // prose continuing the comment above. Joined into one block these two lines would read
    // `SPEC §5 "Chain integrity"` and flag; kept apart, neither line carries an attribution.
    expect(
      scan([
        '// === chain corner: SPEC §5',
        '// "Chain integrity" was the name an earlier draft used for it.',
      ]),
    ).toEqual([]);
  });

  test('a quotation attributed to DECISIONS.md that resolves against the decisions body', () => {
    expect(
      scan(['// DECISIONS.md #10 "Result-first outcomes; refusals returned, never thrown".']),
    ).toEqual([]);
  });

  test('a citation carrying a possessive and a single sub-reference token', () => {
    expect(
      scan(['// SPEC §12\'s C3: "provisional pre-1.0" — the posture this build inherits.']),
    ).toEqual([]);
  });

  test('code with no citations at all', () => {
    expect(
      scan(['export const answer = 42;', '// A plain comment with "a quoted phrase".']),
    ).toEqual([]);
  });
});
