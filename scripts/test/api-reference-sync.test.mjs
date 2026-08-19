// api-reference-sync.test.mjs — pins for the drift gate's two pure functions. The gate's
// real run (over the live index.ts and api-reference.md) is a CI step beside the
// contract scan; these tests pin the parsing so a refactor of index.ts's export style
// cannot silently blind the gate.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { exportedNames, undocumentedNames } from '../api-reference-sync.mjs';

const FIXTURE_INDEX = `
// a comment
export { alpha, beta } from './a.js';
export type { Gamma } from './b.js';
export type {
  Delta,
  Epsilon,
} from './c.js';
export { zeta as publicZeta } from './d.js';
`;

test('exportedNames: values, types, multi-line blocks, and as-renames (published name wins)', () => {
  assert.deepEqual(exportedNames(FIXTURE_INDEX), [
    'alpha',
    'beta',
    'Gamma',
    'Delta',
    'Epsilon',
    'publicZeta',
  ]);
});

test('undocumentedNames: whole-word presence — substrings do not count', () => {
  const reference = 'Documents alpha and Gamma. Also alphabet (not beta!). Epsilon appears.';
  assert.deepEqual(undocumentedNames(['alpha', 'beta', 'Gamma', 'Delta', 'Epsilon'], reference), [
    'Delta',
  ]);
  // "alphabet" must not satisfy a hypothetical export named "alphabe"; and beta IS
  // present above as a whole word inside the parenthetical — pin the exact semantics.
  assert.deepEqual(undocumentedNames(['alphabe'], reference), ['alphabe']);
});
