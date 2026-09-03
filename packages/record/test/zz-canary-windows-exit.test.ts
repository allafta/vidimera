// CANARY — never to be merged. This test fails on purpose so that one CI run shows which
// matrix legs turn a vitest failure into a failed step. The Windows leg has reported
// failed tests while its `pnpm test` step still concluded success (runs 33581965455,
// 33659771611, 33703094044); this file, with the diagnostic steps in ci.yml, pins where
// the exit code is lost.

import assert from 'node:assert/strict';
import { test } from 'vitest';

test('CANARY: a deliberately failing test — the step running this MUST fail', () => {
  assert.equal(1, 2, 'canary: this failure must fail the CI step');
});
