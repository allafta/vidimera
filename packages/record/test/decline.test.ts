// @vidimera/record — decline.test.ts: the recorded-human-decline increment (SPEC §9's
// decline seam). This file owns the kind/state wiring pins, the construction pins, the
// seam's ladder pins, and the interaction pins.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { isStateLeaving, stateOf } from '../src/store/semantics.js';

test('stateOf: declined maps to the declined state and is state-leaving', () => {
  assert.equal(stateOf('declined'), 'declined');
  assert.equal(isStateLeaving('declined'), true);
});
