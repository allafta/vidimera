// @vidimera/record — chain-binding-sqlite.test.ts: the faithful row copy. A storage-writing
// insider on `SqliteStore` deletes record X's transition rows and copies honest record Y's rows
// under X's `record_id` — no hashing, no signing — then edits one non-head payload in the copy.
// X's records row is left as it was. `readChain(X)` now returns Y's transitions, each still
// carrying Y's own `recordId`. The operator's next ordinary call on X must refuse
// `chain-compromise` with its signed evidence edge on X, addressed to X, and Y — its chain, its
// state and its signatures — must come out exactly as it went in, still able to decide.
//
// Unlike `RelocatingStore` (helpers/stores.ts), the copy here replaces X's real rows, so the
// backing's seq check counts the copied chain: the edge lands at `seq = length(Y) + 1` even
// though X and Y started at different lengths.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import { replay } from '../src/chain/replay.js';
import type { ConfirmProfile, LegSpec } from '../src/config.js';
import { create } from '../src/create.js';
import { SqliteStore } from '../src/store/sqlite.js';
import { captureProfile, facts, identity, makeConfig, openRecord } from './helpers/profiles.js';
import { enforceableSigningSetup } from './helpers/signing.js';

const CONTENT = { subject: 'week-1', total: 40 };
const D1 = `sha256:${'1'.repeat(64)}`;
const RAISER = { principal: 'checker:1', authority: 'mtls:checker' };

/** captureProfile with the leg's findings flow declared (findings-seams.test.ts's shape),
 * signing at AL2. */
function signedFlowProfile(): ConfirmProfile {
  const p = captureProfile({ id: 'test.flow.v1' });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  const declaring: LegSpec = { ...leg, ackMode: 'any', requiredAcks: ['variance'] };
  p.legs[0] = declaring;
  return { ...p, signing: true };
}

test('a row-copying insider on SqliteStore can no longer redirect a signed edge (AL2)', async () => {
  const store = new SqliteStore(':memory:');
  const profile = signedFlowProfile();
  const { handles, signatures: sidecar } = enforceableSigningSetup([profile], { store });

  const y = await openRecord(handles, CONTENT, profile.id, 'subject:y');
  const raised = await handles.operator.raiseFinding(
    y,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(raised.status, 'ok', 'fixture: the finding is raised on Y');
  const x = await openRecord(handles, CONTENT, profile.id, 'subject:x');
  const yBefore = await store.readChain(y);
  assert.equal(yBefore.length, 2, 'fixture: Y is open with one finding raised');
  assert.equal((await store.readChain(x)).length, 1, 'fixture: X is open');

  // --- the insider: plain SQL on the backing's own connection ---------------------------
  const db = store.database;
  db.prepare('DELETE FROM transitions WHERE record_id = ?').run(x);
  db.prepare(
    'INSERT INTO transitions (record_id, seq, transition_json) ' +
      'SELECT ?, seq, transition_json FROM transitions WHERE record_id = ?',
  ).run(x, y);
  const row = db
    .prepare('SELECT transition_json FROM transitions WHERE record_id = ? AND seq = 1')
    .get(x) as { transition_json: string } | undefined;
  assert.ok(row !== undefined, 'fixture: the copy has a seq-1 row');
  const copied = JSON.parse(row.transition_json) as { payload: Record<string, unknown> };
  copied.payload = { ...copied.payload, insider: true };
  db.prepare('UPDATE transitions SET transition_json = ? WHERE record_id = ? AND seq = 1').run(
    JSON.stringify(copied),
    x,
  );

  // --- the operator's next ordinary call on X -------------------------------------------
  const out = await handles.operator.finalize(x, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.ok(out.transitionRef !== undefined, 'the evidence edge landed');

  const xChain = await store.readChain(x);
  assert.equal(xChain.length, 3, 'the edge sits at seq = length(Y) + 1');
  const last = xChain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.recordId, x, 'the edge is addressed to X');
  assert.equal(last.kind, 'refused');
  assert.deepEqual(last.payload, { code: 'chain-compromise' });
  assert.equal(transitionDigest(last), out.transitionRef, 'the outcome names the edge');
  const xEntries = await sidecar.listByRecord(x);
  assert.ok(
    xEntries.some((e) => e.transitionDigest === out.transitionRef),
    "the edge is SIGNED: X's sidecar holds an entry for it",
  );

  // --- Y: chain, signatures and state as they were, and still able to decide ------------
  assert.deepEqual(await store.readChain(y), yBefore, "Y's chain is untouched");
  const signatures = await handles.operator.verifySignatures(y);
  assert.equal(signatures.transitions.length, 2);
  assert.ok(
    signatures.transitions.every((t) => t.verified),
    "every one of Y's transitions verifies",
  );
  assert.equal(replay(await store.readChain(y)).state, 'open');
  const decided = await handles.operator.finalize(y, identity(), CONTENT, facts());
  if (decided.status === 'refused') {
    assert.notEqual(decided.code, 'record-not-open', 'Y is still open');
    assert.notEqual(decided.code, 'chain-compromise', 'Y still verifies');
  }
});

test('a verbatim row copy on SqliteStore (no payload edit) still refuses chain-compromise on X (AL2)', async () => {
  const store = new SqliteStore(':memory:');
  const profile = signedFlowProfile();
  const { handles, signatures: sidecar } = enforceableSigningSetup([profile], { store });

  const y = await openRecord(handles, CONTENT, profile.id, 'subject:y');
  const raised = await handles.operator.raiseFinding(
    y,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(raised.status, 'ok', 'fixture: the finding is raised on Y');
  const x = await openRecord(handles, CONTENT, profile.id, 'subject:x');
  const yBefore = await store.readChain(y);

  // The copy is verbatim: every row keeps Y's own `recordId`, no payload is touched, so the
  // ONLY thing wrong with X's chain is whose chain it is.
  const db = store.database;
  db.prepare('DELETE FROM transitions WHERE record_id = ?').run(x);
  db.prepare(
    'INSERT INTO transitions (record_id, seq, transition_json) ' +
      'SELECT ?, seq, transition_json FROM transitions WHERE record_id = ?',
  ).run(x, y);

  const out = await handles.operator.finalize(x, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.ok(out.transitionRef !== undefined, 'the evidence edge landed');

  const xChain = await store.readChain(x);
  assert.equal(xChain.length, 3, 'the edge sits at seq = length(Y) + 1');
  const last = xChain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.recordId, x, 'the edge is addressed to X');
  assert.equal(last.kind, 'refused');
  assert.deepEqual(last.payload, { code: 'chain-compromise' });
  assert.equal(transitionDigest(last), out.transitionRef, 'the outcome names the edge');
  const xEntries = await sidecar.listByRecord(x);
  assert.ok(
    xEntries.some((e) => e.transitionDigest === out.transitionRef),
    "the edge is SIGNED: X's sidecar holds an entry for it",
  );

  assert.deepEqual(await store.readChain(y), yBefore, "Y's chain is untouched");
});

// At AL2 the two tests above are caught twice over: the binding refuses, and the sidecar
// listed by X's id holds no entry for Y's transitions. This AL1 twin has no sidecar, so the
// chain binding is the ONLY thing standing between X's call and Y's history.
test('a verbatim row copy on SqliteStore refuses chain-compromise on X at AL1, where only the binding catches it', async () => {
  const store = new SqliteStore(':memory:');
  const { signing: _signing, ...profile } = signedFlowProfile();
  const handles = create(makeConfig([profile], { store }));

  const y = await openRecord(handles, CONTENT, profile.id, 'subject:y');
  const raised = await handles.operator.raiseFinding(
    y,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  assert.equal(raised.status, 'ok', 'fixture: the finding is raised on Y');
  const x = await openRecord(handles, CONTENT, profile.id, 'subject:x');
  const yBefore = await store.readChain(y);

  const db = store.database;
  db.prepare('DELETE FROM transitions WHERE record_id = ?').run(x);
  db.prepare(
    'INSERT INTO transitions (record_id, seq, transition_json) ' +
      'SELECT ?, seq, transition_json FROM transitions WHERE record_id = ?',
  ).run(x, y);

  const out = await handles.operator.finalize(x, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.ok(out.transitionRef !== undefined, 'the evidence edge landed');
  const last = (await store.readChain(x)).at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.recordId, x, 'the edge is addressed to X');
  assert.equal(transitionDigest(last), out.transitionRef, 'the outcome names the edge');
  assert.deepEqual(await store.readChain(y), yBefore, "Y's chain is untouched");
});
