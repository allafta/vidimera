// release-guard.test.mjs — unit tests for the release workflow's pre-publish guard. The guard's
// integration (reading the two manifests and the dispatch ref from the runner, exiting non-zero)
// runs only on GitHub, inside `release.yml`; these cover the decision it can get wrong.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { guardFindings } from '../release-guard.mjs';

const pkg = (name, version, extra = {}) => ({ name: `@vidimera/${name}`, version, ...extra });
const released = [pkg('record', '0.1.0'), pkg('store-postgres', '0.1.0')];

test('passes on the matching tag with both packages bumped, public, and in lockstep', () => {
  assert.deepEqual(guardFindings({ packages: released, refType: 'tag', refName: 'v0.1.0' }), []);
});

test('refuses a package that is still private', () => {
  const packages = [pkg('record', '0.1.0', { private: true }), pkg('store-postgres', '0.1.0')];
  const out = guardFindings({ packages, refType: 'tag', refName: 'v0.1.0' });
  assert.deepEqual(out, ['@vidimera/record: private is still true']);
});

test('refuses a package still at 0.0.0', () => {
  const packages = [pkg('record', '0.1.0'), pkg('store-postgres', '0.0.0')];
  const out = guardFindings({ packages, refType: 'tag', refName: 'v0.1.0' });
  assert.ok(out.includes('@vidimera/store-postgres: version is still 0.0.0'), out.join('; '));
});

test('refuses two packages at different versions', () => {
  const packages = [pkg('record', '0.1.0'), pkg('store-postgres', '0.1.1')];
  const out = guardFindings({ packages, refType: 'tag', refName: 'v0.1.0' });
  assert.deepEqual(out, [
    'the packages are not in lockstep: @vidimera/record 0.1.0, @vidimera/store-postgres 0.1.1',
  ]);
});

test('refuses a dispatch from a branch, naming the ref', () => {
  const out = guardFindings({ packages: released, refType: 'branch', refName: 'main' });
  assert.deepEqual(out, ["dispatched from branch 'main', not from the tag v0.1.0"]);
});

test('refuses a tag that does not name the version', () => {
  const out = guardFindings({ packages: released, refType: 'tag', refName: 'v0.2.0' });
  assert.deepEqual(out, ["the tag 'v0.2.0' does not match the version: expected v0.1.0"]);
});

test('reports every reason at once on the pre-release tree dispatched from main', () => {
  const packages = [
    pkg('record', '0.0.0', { private: true }),
    pkg('store-postgres', '0.0.0', { private: true }),
  ];
  const out = guardFindings({ packages, refType: 'branch', refName: 'main' });
  assert.deepEqual(out, [
    '@vidimera/record: private is still true',
    '@vidimera/record: version is still 0.0.0',
    '@vidimera/store-postgres: private is still true',
    '@vidimera/store-postgres: version is still 0.0.0',
    "dispatched from branch 'main', not from the tag v0.0.0",
  ]);
});

test('an absent ref (the runner did not pass one) refuses rather than passing', () => {
  const out = guardFindings({ packages: released, refType: undefined, refName: undefined });
  assert.deepEqual(out, ["dispatched from an unknown ref '', not from the tag v0.1.0"]);
});
