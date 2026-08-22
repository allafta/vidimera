// @vidimera/record — byte-regression/staged-ref.test.ts: an absolute pin on
// `deriveStagedRef`, which keys `Store.putStaged` and is not a transition, so no chain
// digest reaches it. `test/content-binding.test.ts` covers idempotence and collision
// resistance across recomputations; it asserts no literal value, and neither does any
// other file. A change to the canonicalized input shape would move every staged
// reference in existence, silently, and this literal is the only thing that would notice.
//
// SELF-REGRESSION PIN, not a compatibility pin: this proves the value has not drifted
// since it was harvested here. It does not prove the value is correct. See
// `byte-regression/fixtures.ts` for the posture this whole directory takes.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { canonicalize, digest } from '../../src/canonical.js';
import { deriveStagedRef } from '../../src/id.js';

const CONTENT_DIGEST = digest(canonicalize({ subject: 'week-1', total: 40 }));
const PROFILE_ID = 'byte-regression.staged-ref.v1';
const SUBJECT_REF = 'subject:byte-regression-staged-ref';
const LEG_ID = 'approver-decide';

// Harvest-then-pin: run once with the placeholder, read the real value out of the failure
// diff, paste it here verbatim. Do not compute it by hand.
const PINNED_STAGED_REF = 'sha256:8db41802f91e0d43c1a400b60ce200e4737d08f0a74582b907475c934235b7cd';

test('byte-regression: deriveStagedRef matches its pinned literal', () => {
  assert.equal(deriveStagedRef(CONTENT_DIGEST, PROFILE_ID, SUBJECT_REF, LEG_ID), PINNED_STAGED_REF);
});

test('byte-regression: the pinned contentDigest input is itself stable', () => {
  assert.equal(CONTENT_DIGEST, digest(canonicalize({ subject: 'week-1', total: 40 })));
});
