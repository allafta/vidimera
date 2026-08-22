// docs-index-sync.test.mjs — unit tests for the increment-record drift gate's two pure
// functions. The gate's integration behavior (git ls-files, process.exit) is exercised by
// running it in CI, not here; these cover the parsing and comparison it can get wrong.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { statedCounts, unlistedFiles } from '../docs-index-sync.mjs';

test('statedCounts reads the specs/plans pair', () => {
  const text = '**Counted at write time:** 24 files in `specs/`, 27 in `plans/` — not one-to-one.';
  const counts = statedCounts(text);
  assert.equal(counts.specs, 24);
  assert.equal(counts.plans, 27);
});

test('statedCounts reads a numeric analysis count', () => {
  assert.equal(statedCounts('**`docs/analysis/`** holds 16 files, each').analysis, 16);
});

test('statedCounts reads the word "one" as 1, the pre-repair phrasing', () => {
  assert.equal(statedCounts('**`docs/analysis/`** holds one file,').analysis, 1);
});

test('statedCounts returns null for an absent sentence rather than guessing', () => {
  const counts = statedCounts('no counts here at all');
  assert.equal(counts.specs, null);
  assert.equal(counts.plans, null);
  assert.equal(counts.analysis, null);
});

test('unlistedFiles returns only the basenames absent from the index', () => {
  const index = 'a row naming 2026-01-01-alpha-spec.md and nothing else';
  const missing = unlistedFiles(['2026-01-01-alpha-spec.md', '2026-01-02-beta.md'], index);
  assert.deepEqual(missing, ['2026-01-02-beta.md']);
});

test('unlistedFiles returns an empty array when every basename occurs', () => {
  assert.deepEqual(unlistedFiles(['x.md'], 'mentions x.md once'), []);
});
