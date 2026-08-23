// @vidimera/record — byte-regression/coverage.test.ts: the claim this directory exists to
// make, asserted rather than stated — every `TransitionKind` appears in at least one
// pinned flow here. A new kind added later fails this test until it is pinned too.
//
// It proves MENTION, not coverage and not correctness: it concatenates the sibling test
// files' SOURCE TEXT and checks that each quoted kind name occurs somewhere in it. A name
// in a label, a comment, or a dead constant satisfies it, and no linkage to a `PINNED_`
// array is checked anywhere. A useful tripwire for a newly added kind; not evidence that
// any kind reaches a literal, and never evidence that a literal is right.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';

const ALL_KINDS = [
  'opened',
  'consultation-recorded',
  'confirmed',
  'refused',
  'expired',
  'declined',
  'sealed',
  'finding-raised',
  'acknowledged',
  'redeeming',
  'redeemed',
  'redemption-failed',
] as const;

test('byte-regression: every TransitionKind is named in a pinned flow in this directory', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const corpus = readdirSync(here)
    .filter((f) => f.endsWith('.test.ts') && f !== 'coverage.test.ts')
    .map((f) => readFileSync(join(here, f), 'utf8'))
    .join('\n');
  const missing = ALL_KINDS.filter((kind) => !corpus.includes(`'${kind}'`));
  assert.deepEqual(missing, [], `unpinned kinds: ${missing.join(', ')}`);
});

test('byte-regression: ALL_KINDS matches the union in types.ts', () => {
  const typesPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'types.ts');
  const source = readFileSync(typesPath, 'utf8');
  const union = source.slice(source.indexOf('export type TransitionKind'));
  const declared = [...union.slice(0, union.indexOf(';')).matchAll(/'([a-z-]+)'/g)].map(
    (m) => m[1],
  );
  assert.deepEqual([...ALL_KINDS].sort(), declared.sort());
});
