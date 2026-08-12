// @vidimera/record — cross-backing-byte-identity.test.ts: SPEC §12's cross-backing
// end-to-end — all backings "produce **byte-identical chains** from the same scripted
// flow under a fixed clock". Byte-level in substance: per-transition library-JCS
// serialization compared as strings, plus head-digest equality — not just deepEqual.
// Determinism needs BOTH injectable knobs createWithClock carries: the fixed clock (`at`
// stamps) and the fixed recordId sequence (recordId sits inside every transition digest,
// so real randomness would make byte-for-byte comparison impossible — create.ts's own
// words for why the minter seam exists).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { canonicalize } from '../src/canonical.js';
import { transitionDigest } from '../src/chain/encoding.js';
import { createWithClock } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import type { Store } from '../src/store/store.js';
import type { Transition } from '../src/types.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);

/** A deterministic recordId sequence — identical across backings by construction. */
function fixedMint(prefix: string): () => string {
  let n = 0;
  return () => {
    n += 1;
    return `${prefix}-${String(n).padStart(4, '0')}`;
  };
}

async function happyFlow(store: Store): Promise<Transition[]> {
  const clock = () => new Date(T0);
  const handles = createWithClock(
    makeConfig([captureProfile()], { store }),
    clock,
    fixedMint('cross-happy'),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  const sealed = await handles.operator.seal(recordId);
  assert.equal(sealed.status, 'ok', 'fixture: the record must seal');
  return handles.operator.readChain(recordId);
}

async function refusalFlow(store: Store): Promise<Transition[]> {
  const clock = () => new Date(T0);
  const handles = createWithClock(
    makeConfig([captureProfile({ terminalRefusals: ['identity-authority-refused'] })], {
      store,
    }),
    clock,
    fixedMint('cross-refusal'),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const refused = await handles.operator.finalize(
    recordId,
    identity({ authority: 'session:wrong-app' }),
    CONTENT,
    facts(),
  );
  assert.equal(refused.status, 'refused', 'fixture: the identity must be refused');
  return handles.operator.readChain(recordId);
}

function assertByteIdentical(a: Transition[], b: Transition[], flow: string): void {
  assert.equal(a.length, b.length, `${flow}: same chain length`);
  for (const [i, ta] of a.entries()) {
    const tb = b[i];
    assert.ok(tb !== undefined);
    assert.deepEqual(
      canonicalize(ta),
      canonicalize(tb),
      `${flow}: transition ${i} must be byte-identical under library JCS`,
    );
  }
  const headA = a.at(-1);
  const headB = b.at(-1);
  assert.ok(headA !== undefined && headB !== undefined);
  assert.equal(transitionDigest(headA), transitionDigest(headB), `${flow}: same head digest`);
}

test('the happy path produces byte-identical chains over both backings', async () => {
  const memory = await happyFlow(new MemoryStore());
  const sqlite = await happyFlow(new SqliteStore(':memory:'));
  assertByteIdentical(memory, sqlite, 'happy path');
});

test('a terminal refusal produces byte-identical chains over both backings', async () => {
  const memory = await refusalFlow(new MemoryStore());
  const sqlite = await refusalFlow(new SqliteStore(':memory:'));
  assertByteIdentical(memory, sqlite, 'refusal path');
});
