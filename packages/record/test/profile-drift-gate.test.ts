// @vidimera/record — profile-drift-gate.test.ts (the profile-drift gate increment, 2026-09-03):
// an instance HOLDS a record's profile only when the record's profileId is registered AND the
// registered profile's data-only projection digests to the record's genesis profileDigest
// (SPEC §4). Every seam that resolves a persisted record refuses `unknown-profile`, never-append,
// at the resolution step it already has — ahead of every ladder rung — when it does not hold the
// profile; the two cross-record verifications fold the same miss into their own claim refusals;
// and open()'s exclusivity path leaves a due blocker it does not hold standing (`record-exists`).
// The recorded fail-open this closes: a same-id profile that dropped `signing: true` read a
// signing record as plain AL1 and finalized it (docs/analysis/2026-09-03-security-findings.md,
// finding 2). The honest bound, in the same breath: an in-place profile edit strands that
// profile's open records until the declarative fields are restored exactly or the edit is given
// a new id — pinned below as behavior, not softened.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import { heldProfile } from '../src/kernel/held-profile.js';
import { profileDigest } from '../src/profile-digest.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  captureProfile,
  defaultCanonicalizer,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const ID = 'test.drift.gate.v1';

/** The base profile; a sibling instance edits ONE declarative field and acts on the record. */
function base(overrides: { ttl?: number; decline?: true } = {}): ConfirmProfile {
  return captureProfile({ id: ID, ...overrides });
}

test('heldProfile: the id must be registered AND the registered projection must digest to the binding', () => {
  const p = base();
  const resolved = {
    profile: p,
    canonicalizer: defaultCanonicalizer(),
    effectSeam: false,
    profileDigest: profileDigest(p),
  };
  const profiles = new Map([[ID, resolved]]);
  const bound = { profileId: ID, profileDigest: profileDigest(p) };
  assert.equal(heldProfile(profiles, bound), resolved, 'registered and matching: held');
  assert.equal(
    heldProfile(profiles, { ...bound, profileDigest: profileDigest(base({ ttl: 60 })) }),
    undefined,
    'same id, edited projection: not held',
  );
  assert.equal(
    heldProfile(profiles, { ...bound, profileId: 'test.drift.gate.other.v1' }),
    undefined,
    'unregistered id: not held',
  );
});

test('create() caches each profile digest, and open() binds that cached digest — byte-identical to the per-call digest it replaces', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([base()], { store }));
  const recordId = await openRecord(handles, CONTENT, ID, 'subject:gate-0');
  const genesis = (await store.readChain(recordId))[0];
  assert.ok(genesis !== undefined);
  assert.equal(
    (genesis.payload as { profileDigest: string }).profileDigest,
    profileDigest(base()),
    'the binding is the projection digest, cached or not',
  );
});
