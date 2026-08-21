// @vidimera/record — decline.test.ts: the recorded-human-decline increment (SPEC §9's
// decline seam). This file owns the kind/state wiring pins, the construction pins, the
// seam's ladder pins, and the interaction pins.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create } from '../src/create.js';
import { isStateLeaving, stateOf } from '../src/store/semantics.js';
import { captureProfile, makeConfig } from './helpers/profiles.js';

test('stateOf: declined maps to the declined state and is state-leaving', () => {
  assert.equal(stateOf('declined'), 'declined');
  assert.equal(isStateLeaving('declined'), true);
});

test('construction: decline must be the literal true when declared — the signing rule class', () => {
  const profile = captureProfile();
  (profile.legs[0] as unknown as Record<string, unknown>).decline = false;
  assert.throws(() => create(makeConfig([profile])), /literal true/i);
});

test('construction: a decline-declaring leg constructs', () => {
  assert.doesNotThrow(() => create(makeConfig([captureProfile({ decline: true })])));
});
