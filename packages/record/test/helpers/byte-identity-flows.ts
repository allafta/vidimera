// @vidimera/record — test/helpers/byte-identity-flows.ts: the scripted flows and the
// byte-level comparison behind SPEC §12's cross-backing end-to-end — all backings
// "produce **byte-identical chains** from the same scripted flow under a fixed clock".
// Extracted verbatim from cross-backing-byte-identity.test.ts (which keeps its own
// pairwise Memory ↔ Sqlite pins) so a third backing's package can drive the same flows
// and assert its own leg — the extraction moved code, never assertions.
//
// Byte-level in substance: per-transition library-JCS serialization compared as strings,
// plus head-digest equality — not just deepEqual. Determinism needs all three injectable
// knobs createWithClock carries: the fixed clock (`at` stamps), the fixed recordId
// sequence (recordId sits inside every transition digest), and the fixed token source
// (tokenDigest sits inside the transition digest).

import assert from 'node:assert/strict';

import { canonicalize } from '../../src/canonical.js';
import { transitionDigest } from '../../src/chain/encoding.js';
import { createWithClock } from '../../src/create.js';
import type { Store } from '../../src/store/store.js';
import type { Transition } from '../../src/types.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './profiles.js';

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

export async function happyFlow(store: Store): Promise<Transition[]> {
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

export async function refusalFlow(store: Store): Promise<Transition[]> {
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

const FIXED_TOKEN = 'byte-identity-fixed-token-00000000000000000';

export async function tokenFlow(store: Store): Promise<Transition[]> {
  const clock = () => new Date(T0);
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store }),
    clock,
    fixedMint('cross-token'),
    () => FIXED_TOKEN,
  );
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok', 'fixture: the issuance must succeed');
  const completed = await handles.operator.completeRedemption(recordId, FIXED_TOKEN, CONTENT);
  assert.equal(completed.status, 'ok', 'fixture: the completion must succeed');
  return handles.operator.readChain(recordId);
}

export function assertByteIdentical(a: Transition[], b: Transition[], flow: string): void {
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
