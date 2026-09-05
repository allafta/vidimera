// @vidimera/record — canonicalizer-totality.test.ts: pins a BOUND, green from its first run
// (the review-hardening pass, 2026-09-05). A registered canonicalizer is the host's CODE, not
// caller data: when it throws at a decision seam the throw propagates as a configuration
// fault — nothing is appended, no refusal is minted, and in particular the throw is never read
// as `content-drift`, which would append an edge that reads as evidence about the content.
// The other side of the deliberate asymmetry is `facts.test.ts`'s BigInt pin: `facts.figures`
// are caller-supplied DATA, so a canonicalization failure THERE is a present-but-unusable
// payload and refuses `consultation-missing`, open by default. Stated at the `Canonicalizer`
// type (canonical.ts) and in the guide's canonicalizer rules; pinned here so the posture
// cannot drift silently either way.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { replay } from '../src/chain/replay.js';
import { create } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  captureProfile,
  DEFAULT_CANONICALIZER_REF,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
/** The finalize-time content: drifted AND carrying the marker the canonicalizer rejects. */
const REJECTED = { subject: 'week-1', total: 41, boom: true };

function rejectingCanonicalizer(content: unknown): unknown {
  if (typeof content === 'object' && content !== null && 'boom' in content) {
    throw new Error('host canonicalizer rejected the content');
  }
  return content;
}

function setup() {
  const store = new MemoryStore();
  const handles = create(
    makeConfig([captureProfile({ decline: true })], {
      store,
      canonicalizers: { [DEFAULT_CANONICALIZER_REF]: rejectingCanonicalizer },
    }),
  );
  return { store, handles };
}

test('finalize(): a canonicalizer that throws on the supplied content throws through — nothing appended, the record stays open, never content-drift', async () => {
  const { store, handles } = setup();
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const before = await store.readChain(recordId);

  await assert.rejects(
    () => handles.operator.finalize(recordId, identity(), REJECTED, facts()),
    /host canonicalizer rejected the content/,
  );

  const after = await store.readChain(recordId);
  assert.deepEqual(after, before, 'the chain is untouched');
  assert.equal(replay(after).state, 'open');
});

test('decline(): the same posture — the mirror seam re-digests through the same canonicalizer call', async () => {
  const { store, handles } = setup();
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const before = await store.readChain(recordId);

  await assert.rejects(
    () => handles.operator.decline(recordId, identity(), REJECTED, facts()),
    /host canonicalizer rejected the content/,
  );

  const after = await store.readChain(recordId);
  assert.deepEqual(after, before, 'the chain is untouched');
  assert.equal(replay(after).state, 'open');
});
