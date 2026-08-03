// @vidimera/record — content-binding.test.ts, HELPERS PORTION (design §5 "Content
// binding": `contentDigest = digest(canonicalize(adopterCanonicalizer(content)))`;
// task-3 brief Step 2). This task (Task 3) covers only the helper-level assertions —
// `canonicalize`/`digest` composed together are order-insensitive on object keys but
// value-sensitive, and a host-side recompute over an independently-constructed but
// content-equal structure reproduces the identical bound digest. The stage()-level
// portions (binding at `stage()`, re-checking at `finalize()`, `content-drift`
// detection, the adopter-canonicalizer seam) arrive in Task 7 — this file is
// structured so Task 7 appends new `test(...)` blocks below rather than restructuring
// what's here (see the "Task 7 extends below" marker at the bottom).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { canonicalize, digest } from '../src/canonical.js';
import { create } from '../src/create.js';
import { deriveStagedRef } from '../src/id.js';
import { captureProfile, DEFAULT_SUBJECT_REF, makeConfig } from './helpers/profiles.js';
import { CountingStore } from './helpers/stores.js';

/** Small helper mirroring the design §5 content-binding formula sans an adopter hook
 * (Task 3 has no adopter canonicalizer yet — that's Task 7's `stage()`). */
function boundDigest(content: unknown): string {
  return digest(canonicalize(content));
}

// --- canonicalize+digest: order-insensitive on object keys ----------------------

test('order-insensitive on object keys: reordering top-level keys does not change the bound digest', () => {
  const a = { entries: [1, 2, 3], subject: 'week-1', total: 40 };
  const b = { total: 40, subject: 'week-1', entries: [1, 2, 3] };
  assert.equal(boundDigest(a), boundDigest(b));
});

test('order-insensitive on object keys: reordering NESTED object keys does not change the bound digest', () => {
  const a = { week: { subject: 'w1', meta: { approver: 'x', ttl: 10 } } };
  const b = { week: { meta: { ttl: 10, approver: 'x' }, subject: 'w1' } };
  assert.equal(boundDigest(a), boundDigest(b));
});

// --- canonicalize+digest: value-sensitive ----------------------------------------

test('value-sensitive: changing one field value changes the bound digest', () => {
  const original = { entries: [1, 2, 3], subject: 'week-1', total: 40 };
  const drifted = { entries: [1, 2, 3], subject: 'week-1', total: 41 };
  assert.notEqual(boundDigest(original), boundDigest(drifted));
});

test('value-sensitive: array ELEMENT ORDER is significant (arrays are never reordered by JCS)', () => {
  const a = { entries: [1, 2, 3] };
  const b = { entries: [3, 2, 1] };
  assert.notEqual(boundDigest(a), boundDigest(b));
});

test('value-sensitive: an added or removed key changes the bound digest', () => {
  const withoutExtra = { subject: 'week-1', total: 40 };
  const withExtra = { subject: 'week-1', total: 40, note: 'late' };
  assert.notEqual(boundDigest(withoutExtra), boundDigest(withExtra));
});

// --- host recompute equals the bound digest --------------------------------------

test('a host recompute over an independently-reconstructed but content-equal structure equals the originally bound digest', () => {
  // Simulates the finalize()-time re-check (Task 8): the "host" builds its own copy
  // of the content from scratch (different key-insertion order, as a real deserialize
  // from a different transport encoding would produce) and recomputes the digest
  // independently; it must land on the SAME digest bound at stage() time.
  const stagedContent = { subject: 'week-42', approverId: 'a1', entries: [{ day: 1, hours: 8 }] };
  const boundAtStage = boundDigest(stagedContent);

  const hostReconstructed = {
    entries: [{ hours: 8, day: 1 }],
    approverId: 'a1',
    subject: 'week-42',
  };
  const recomputedAtFinalize = boundDigest(hostReconstructed);

  assert.equal(
    recomputedAtFinalize,
    boundAtStage,
    'host recompute must equal the digest bound at stage()',
  );
});

test('a host recompute over a content-DIFFERENT structure does NOT equal the originally bound digest (drift is detectable)', () => {
  const stagedContent = { subject: 'week-42', approverId: 'a1', entries: [{ day: 1, hours: 8 }] };
  const boundAtStage = boundDigest(stagedContent);

  const driftedAtFinalize = {
    subject: 'week-42',
    approverId: 'a1',
    entries: [{ day: 1, hours: 9 }],
  };
  const recomputed = boundDigest(driftedAtFinalize);

  assert.notEqual(
    recomputed,
    boundAtStage,
    'a genuinely different structure must not collide with the bound digest',
  );
});

// --- deriveStagedRef(): idempotent + collision-resistant (id.ts, consumed by stage() in Task 7) --

test('deriveStagedRef() is idempotent: same contentDigest+profileId+subjectRef -> same stagedRef', () => {
  const contentDigest = boundDigest({ subject: 'week-1', total: 40 });
  const a = deriveStagedRef(contentDigest, 'tide.week.v1', 'consultant:42');
  const b = deriveStagedRef(contentDigest, 'tide.week.v1', 'consultant:42');
  assert.equal(a, b);
});

test('deriveStagedRef() is idempotent across the SAME content presented with different key order (via the bound contentDigest)', () => {
  const contentDigestA = boundDigest({ subject: 'week-1', total: 40 });
  const contentDigestB = boundDigest({ total: 40, subject: 'week-1' });
  assert.equal(
    deriveStagedRef(contentDigestA, 'tide.week.v1', 'consultant:42'),
    deriveStagedRef(contentDigestB, 'tide.week.v1', 'consultant:42'),
  );
});

test('deriveStagedRef() emits a Digest-shaped value ("sha256:<64-lowercase-hex>")', () => {
  const contentDigest = boundDigest({ subject: 'week-1' });
  const ref = deriveStagedRef(contentDigest, 'tide.week.v1', 'consultant:42');
  assert.match(ref, /^sha256:[0-9a-f]{64}$/);
});

test('deriveStagedRef() is collision-resistant across a different contentDigest', () => {
  const digestA = boundDigest({ subject: 'week-1', total: 40 });
  const digestB = boundDigest({ subject: 'week-1', total: 41 });
  assert.notEqual(
    deriveStagedRef(digestA, 'tide.week.v1', 'consultant:42'),
    deriveStagedRef(digestB, 'tide.week.v1', 'consultant:42'),
  );
});

test('deriveStagedRef() is collision-resistant across a different profileId (same content+subject)', () => {
  const contentDigest = boundDigest({ subject: 'week-1', total: 40 });
  assert.notEqual(
    deriveStagedRef(contentDigest, 'tide.week.v1', 'consultant:42'),
    deriveStagedRef(contentDigest, 'tide.week.v2', 'consultant:42'),
  );
});

test('deriveStagedRef() is collision-resistant across a different subjectRef (same content+profile)', () => {
  const contentDigest = boundDigest({ subject: 'week-1', total: 40 });
  assert.notEqual(
    deriveStagedRef(contentDigest, 'tide.week.v1', 'consultant:42'),
    deriveStagedRef(contentDigest, 'tide.week.v1', 'consultant:99'),
  );
});

// --- Task 7 extends below: stage()-level content-binding assertions --------------
// (binding at stage() via the adopter canonicalizer, re-check at finalize(),
// content-drift detection through the KERNEL, not just the bare helpers above).

const PROFILE_ID = 'test.capture.v1';

test('stage() binds contentDigest = digest(canonicalize(adopterCanonicalizer(content))) and returns a content-derived stagedRef', async () => {
  const store = new CountingStore();
  const { agent } = create(makeConfig([captureProfile()], { store }));
  const content = { subject: 'week-1', entries: [{ day: 1, hours: 8 }], total: 40 };

  const outcome = await agent.stage(content, PROFILE_ID, DEFAULT_SUBJECT_REF);
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;

  // The default test canonicalizer is an identity projection, so contentDigest here is
  // digest(canonicalize(content)) — the bare boundDigest — and stagedRef is
  // deriveStagedRef over that, exactly reproducible from the public helpers.
  const expectedContentDigest = boundDigest(content);
  const expectedRef = deriveStagedRef(expectedContentDigest, PROFILE_ID, DEFAULT_SUBJECT_REF);
  assert.equal(outcome.value.stagedRef, expectedRef);

  // The persisted staged draft carries the bound digest + the internally-derived
  // single-leg legId, and NOTHING content-bearing (digest-only).
  const draft = await store.getStaged(outcome.value.stagedRef);
  assert.ok(draft, 'stage() must write a staged draft via putStaged');
  assert.equal(draft.id, expectedRef);
  assert.equal(draft.profileId, PROFILE_ID);
  assert.equal(draft.subjectRef, DEFAULT_SUBJECT_REF);
  assert.equal(draft.legId, 'approver-decide'); // the single leg's id, derived internally
  assert.equal(draft.contentDigest, expectedContentDigest);
});

test('stage() is PRE-RECORD: exactly one putStaged, ZERO appendTransition (creates no record, no chain)', async () => {
  const store = new CountingStore();
  const { agent } = create(makeConfig([captureProfile()], { store }));

  await agent.stage({ subject: 'week-1', total: 40 }, PROFILE_ID, DEFAULT_SUBJECT_REF);

  assert.equal(store.putStagedCalls, 1, 'stage() writes exactly one staged draft');
  assert.equal(store.appendCalls, 0, 'stage() appends NOTHING — it is pre-record');
});

test('stage() is idempotent: same content+profile+subject twice -> same stagedRef, still no append', async () => {
  const store = new CountingStore();
  const { agent } = create(makeConfig([captureProfile()], { store }));
  const content = { subject: 'week-1', total: 40 };

  const a = await agent.stage(content, PROFILE_ID, DEFAULT_SUBJECT_REF);
  const b = await agent.stage(content, PROFILE_ID, DEFAULT_SUBJECT_REF);
  assert.equal(a.status, 'ok');
  assert.equal(b.status, 'ok');
  if (a.status !== 'ok' || b.status !== 'ok') return;

  assert.equal(a.value.stagedRef, b.value.stagedRef, 'stagedRef is content-derived and idempotent');
  assert.equal(store.appendCalls, 0, 'no append across repeated staging');
});

test('stage() over the SAME content presented with different key order yields the SAME stagedRef', async () => {
  const store = new CountingStore();
  const { agent } = create(makeConfig([captureProfile()], { store }));

  const a = await agent.stage({ subject: 'week-1', total: 40 }, PROFILE_ID, DEFAULT_SUBJECT_REF);
  const b = await agent.stage({ total: 40, subject: 'week-1' }, PROFILE_ID, DEFAULT_SUBJECT_REF);
  assert.equal(a.status, 'ok');
  assert.equal(b.status, 'ok');
  if (a.status !== 'ok' || b.status !== 'ok') return;

  assert.equal(a.value.stagedRef, b.value.stagedRef);
});

test('stage() over content-DIFFERENT input yields a DIFFERENT stagedRef (drift is content-derived)', async () => {
  const store = new CountingStore();
  const { agent } = create(makeConfig([captureProfile()], { store }));

  const a = await agent.stage({ subject: 'week-1', total: 40 }, PROFILE_ID, DEFAULT_SUBJECT_REF);
  const b = await agent.stage({ subject: 'week-1', total: 41 }, PROFILE_ID, DEFAULT_SUBJECT_REF);
  assert.equal(a.status, 'ok');
  assert.equal(b.status, 'ok');
  if (a.status !== 'ok' || b.status !== 'ok') return;

  assert.notEqual(a.value.stagedRef, b.value.stagedRef);
});
