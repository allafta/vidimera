// @vidimera/record — test/tamper-shapes.test.ts: tampering never crashes verification, and a
// detected break lands its edge at the store's next seq.
//
// Five groups of pins:
//   - the pure `verifyChain`: a row that is not an object, or one whose digest throws (a number
//     with no JCS form, such as the `Infinity` a SQL backing parses back from a stored `1e999`),
//     is REPORTED as the break at its position, never thrown on;
//   - the compromise edge on a damaged chain, over SqliteStore (raw SQL on the backing's own
//     connection) and over MemoryStore (a read copy through `TamperingStore`, every write landing
//     on the inner store). A head with no digest refuses `chain-compromise` with no edge and
//     leaves the chain as it was. A head that digests gets its edge, proposed first at
//     `head.seq + 1` and then at `chain.length + 1`, so a deleted middle row or genesis no longer
//     strands the record open: the edge lands at the store's `max(seq) + 1`, the pair is
//     released, and `verifyChain` still reports the original break. A second call refuses with
//     no edge and changes nothing;
//   - the walk itself, recorded attempt by attempt: on a contiguous chain it is the single-seq
//     walk it always was (one attempt per state target), and on a gapped one it tries the
//     second seq only after a `'seq'` conflict;
//   - the signing decorator's cold genesis read: a `null` genesis, or a genesis whose payload is
//     `null`, signs the compromise edge instead of throwing;
//   - rung (4.5) in `finalize`: a storage edit of a sole-genesis head that adds a `policyDigest`
//     reaches it at AL1 and throws a storage fault that says so; at AL2 the same edit refuses
//     `chain-compromise`.
// The PostgresStore legs live in packages/store-postgres/test/tamper-shapes.test.ts.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import { verifyChain } from '../src/chain/replay.js';
import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import type { Outcome } from '../src/outcome.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import type { Store } from '../src/store/store.js';
import type { Transition } from '../src/types.js';
import { buildChain } from './helpers/chain.js';
import { captureProfile, facts, identity, makeConfig, openRecord } from './helpers/profiles.js';
import { TamperingStore } from './helpers/stores.js';

const CONTENT = { subject: 'week-1', total: 40 };
const D1 = `sha256:${'1'.repeat(64)}`;
const D2 = `sha256:${'2'.repeat(64)}`;
const POLICY = `sha256:${'3'.repeat(64)}`;
const RAISER = { principal: 'checker:1', authority: 'mtls:checker' };

type Handles = ReturnType<typeof create>;

// --- profiles and fixtures ------------------------------------------------------------------

/** A capture-terminal profile whose leg also admits a recorded decline. */
function plainProfile(): ConfirmProfile {
  return captureProfile({ id: 'test.tamper.plain.v1', decline: true });
}

/** The same leg with the findings flow declared, so an OPEN record can carry three rows. */
function flowProfile(): ConfirmProfile {
  const p = captureProfile({ id: 'test.tamper.flow.v1' });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  p.legs[0] = { ...leg, ackMode: 'any', requiredAcks: ['variance'] };
  return p;
}

/** An open record with two findings raised: `[opened, finding-raised, finding-raised]`. */
async function openFlowRecord(handles: Handles, subjectRef: string): Promise<string> {
  const recordId = await openRecord(handles, CONTENT, 'test.tamper.flow.v1', subjectRef);
  for (const [findingId, findingDigest] of [
    ['f-1', D1],
    ['f-2', D2],
  ] as const) {
    const raised = await handles.operator.raiseFinding(
      recordId,
      { findingId, kind: 'variance', findingDigest },
      RAISER,
    );
    assert.equal(raised.status, 'ok', 'fixture: the finding is raised');
  }
  return recordId;
}

/** A capture-terminal confirmed record (sealable), with at least one row between genesis and head. */
async function confirmedRecord(handles: Handles, subjectRef: string): Promise<string> {
  const recordId = await openRecord(handles, CONTENT, 'test.tamper.plain.v1', subjectRef);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'ok', 'fixture: the record confirms');
  assert.ok(
    (await handles.operator.readChain(recordId)).length >= 3,
    'fixture: a middle row exists',
  );
  return recordId;
}

/** Opens a fresh record on `subjectRef` and requires it to succeed: the pair is free. */
async function pairIsFree(handles: Handles, profileId: string, subjectRef: string) {
  const staged = await handles.agent.stage(CONTENT, profileId, subjectRef);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef);
  assert.equal(opened.status, 'ok', 'open() on the subject succeeds: the pair was released');
}

function assertNoEdge(out: Outcome<unknown>): void {
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.equal(
    out.transitionRef,
    undefined,
    'no edge: nothing to chain onto, or no CAS admits one',
  );
}

function assertEdge(out: Outcome<unknown>): string {
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') throw new Error('unreachable: asserted above');
  assert.equal(out.code, 'chain-compromise');
  assert.ok(out.transitionRef !== undefined, 'the compromise edge landed');
  return out.transitionRef;
}

/** The landed edge is the head, a `{code}`-only `refused` at `seq`, and the outcome names it. */
function assertEdgeIsHead(chain: readonly Transition[], seq: number, ref: string): void {
  const head = chain.at(-1);
  assert.ok(head !== undefined);
  assert.equal(head.kind, 'refused');
  assert.deepEqual(head.payload, { code: 'chain-compromise' });
  assert.equal(head.seq, seq, "the edge sits at the store's max(seq) + 1");
  assert.equal(transitionDigest(head), ref, 'the outcome names the edge');
}

// --- SqliteStore: raw SQL on the backing's own connection -----------------------------------

type RawRow = { seq: number; transition_json: string };

function rawRows(sqlite: SqliteStore, recordId: string): RawRow[] {
  return sqlite.database
    .prepare('SELECT seq, transition_json FROM transitions WHERE record_id = ? ORDER BY seq')
    .all(recordId) as RawRow[];
}

function setRowJson(sqlite: SqliteStore, recordId: string, seq: number, json: string): void {
  const res = sqlite.database
    .prepare('UPDATE transitions SET transition_json = ? WHERE record_id = ? AND seq = ?')
    .run(json, recordId, seq);
  assert.equal(res.changes, 1, `fixture: row ${seq} rewritten`);
}

function editRow(
  sqlite: SqliteStore,
  recordId: string,
  seq: number,
  edit: (t: Transition) => Transition,
): void {
  const row = rawRows(sqlite, recordId).find((r) => r.seq === seq);
  assert.ok(row !== undefined, `fixture: row ${seq} exists`);
  setRowJson(sqlite, recordId, seq, JSON.stringify(edit(JSON.parse(row.transition_json))));
}

/** The row's payload replaced by the JSON number `1e999`, which `JSON.parse` reads as Infinity. */
function nonFinitePayload(sqlite: SqliteStore, recordId: string, seq: number): void {
  const row = rawRows(sqlite, recordId).find((r) => r.seq === seq);
  assert.ok(row !== undefined, `fixture: row ${seq} exists`);
  const marker = '__non_finite__';
  const json = JSON.stringify({ ...JSON.parse(row.transition_json), payload: marker }).replace(
    `"${marker}"`,
    '1e999',
  );
  setRowJson(sqlite, recordId, seq, json);
}

function deleteRow(sqlite: SqliteStore, recordId: string, seq: number): void {
  const res = sqlite.database
    .prepare('DELETE FROM transitions WHERE record_id = ? AND seq = ?')
    .run(recordId, seq);
  assert.equal(res.changes, 1, `fixture: row ${seq} deleted`);
}

function persistedState(sqlite: SqliteStore, recordId: string): string | undefined {
  const row = sqlite.database.prepare('SELECT state FROM records WHERE id = ?').get(recordId) as
    | { state: string }
    | undefined;
  return row?.state;
}

function sqliteRig(profiles: ConfirmProfile[] = [plainProfile(), flowProfile()]) {
  const sqlite = new SqliteStore(':memory:');
  return { sqlite, handles: create(makeConfig(profiles, { store: sqlite })) };
}

// --- MemoryStore: a read copy through TamperingStore ----------------------------------------

/** An instance over `inner` (to build the record) and one over a read copy of `recordId`. */
function memoryRig() {
  const inner = new MemoryStore();
  const profiles = [plainProfile(), flowProfile()];
  const handles = create(makeConfig(profiles, { store: inner }));
  const tampered = (recordId: string, fn: (chain: Transition[]) => Transition[]) =>
    create(makeConfig(profiles, { store: new TamperingStore(inner, recordId, fn) }));
  return { inner, handles, tampered };
}

/** Each read copy is built fresh from the inner chain; nothing here mutates what it was given. */
const at = (index: number, edit: (t: Transition) => unknown) => (chain: Transition[]) =>
  chain.map((t, i) => (i === index ? (edit(t) as Transition) : t));
const atHead = (edit: (t: Transition) => unknown) => (chain: Transition[]) =>
  at(chain.length - 1, edit)(chain);
const without = (index: number) => (chain: Transition[]) => chain.filter((_, i) => i !== index);

// ============================================================================================
// The pure verifyChain
// ============================================================================================

function pureChain(): Transition[] {
  return buildChain('rec-tamper-pure', [
    { kind: 'opened', payload: { profileId: 'p', subjectRef: 's' } },
    { kind: 'finding-raised', payload: { findingId: 'f-1' } },
    { kind: 'finding-raised', payload: { findingId: 'f-2' } },
    { kind: 'refused', payload: { code: 'chain-compromise' } },
  ]);
}

function assertBreak(chain: Transition[], seq: number, detail: RegExp): void {
  let report: ReturnType<typeof verifyChain> | undefined;
  assert.doesNotThrow(() => {
    report = verifyChain(chain, 'rec-tamper-pure');
  }, 'a garbled row is the break, never a throw');
  assert.ok(report !== undefined);
  assert.equal(report.intact, false);
  if (report.intact) return;
  assert.equal(report.firstBreakSeq, seq);
  assert.match(report.detail, detail);
}

test('verifyChain: Infinity in a middle payload is a break at that row, not a throw', () => {
  assertBreak(
    at(1, (t) => ({ ...t, payload: { total: Infinity } }))(pureChain()),
    2,
    /seq 2 has no canonical encoding/,
  );
});

test('verifyChain: Infinity in the head payload is a break at the head — the head is digested too', () => {
  assertBreak(
    atHead((t) => ({ ...t, payload: { total: Infinity } }))(pureChain()),
    4,
    /seq 4 has no canonical encoding/,
  );
});

test('verifyChain: `at: Infinity` is a break at that row', () => {
  assertBreak(at(2, (t) => ({ ...t, at: Infinity }))(pureChain()), 3, /no canonical encoding/);
});

test('verifyChain: a null middle row is a break at its position', () => {
  assertBreak(at(1, () => null)(pureChain()), 2, /position 2 is not a transition \(found null\)/);
});

test('verifyChain: a null head is a break at its position', () => {
  assertBreak(atHead(() => null)(pureChain()), 4, /position 4 is not a transition/);
});

test('verifyChain: a null genesis is a break at seq 1, with or without the requested recordId', () => {
  const chain = at(0, () => null)(pureChain());
  assertBreak(chain, 1, /position 1 is not a transition/);
  const unbound = verifyChain(chain);
  assert.equal(unbound.intact, false);
  if (unbound.intact) return;
  assert.equal(unbound.firstBreakSeq, 1);
});

test('verifyChain: a sparse row is a break at its position', () => {
  const full = pureChain();
  const sparse: Transition[] = new Array(full.length);
  for (const [i, t] of full.entries()) if (i !== 2) sparse[i] = t;
  assert.equal(2 in sparse, false, 'fixture: index 2 is a hole');
  assertBreak(sparse, 3, /position 3 is not a transition \(found undefined\)/);
});

test('verifyChain: the existing checks keep their order and messages; an empty chain still throws', () => {
  // A seq break and a digest-throwing row at the SAME index: the seq check names it first.
  const chain = at(1, (t) => ({ ...t, seq: 7, payload: { total: Infinity } }))(pureChain());
  assertBreak(chain, 2, /^expected seq 2 at chain position 2, found seq 7$/);
  // A digest-throwing row whose OWN prevHash also broke: the link check names it first.
  const linked = at(1, (t) => ({ ...t, prevHash: D1, payload: { total: Infinity } }))(pureChain());
  assertBreak(linked, 2, /^prevHash mismatch at seq 2/);
  assert.equal(verifyChain(pureChain()).intact, true, 'an honest chain verifies intact');
  assert.throws(() => verifyChain([]), /verifyChain: empty chain/);
});

// ============================================================================================
// SqliteStore
// ============================================================================================

test('SqliteStore: a sole genesis whose prevHash is garbage — finalize and decline refuse chain-compromise with no edge, the chain unchanged', async () => {
  const { sqlite, handles } = sqliteRig();
  const recordId = await openRecord(handles, CONTENT, 'test.tamper.plain.v1', 'subject:s-a1');
  editRow(sqlite, recordId, 1, (t) => ({ ...t, prevHash: 'tampered' }));
  const before = rawRows(sqlite, recordId);

  assertNoEdge(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  assert.deepEqual(rawRows(sqlite, recordId), before, 'finalize appended nothing');
  assertNoEdge(await handles.operator.decline(recordId, identity(), CONTENT, facts()));
  assert.deepEqual(rawRows(sqlite, recordId), before, 'decline appended nothing');
  assertNoEdge(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  assert.deepEqual(rawRows(sqlite, recordId), before, 'a second call appends nothing');
  assert.equal(persistedState(sqlite, recordId), 'open');
});

test("SqliteStore: a confirmed record's head prevHash set to md5:00 — seal refuses chain-compromise with no edge, the chain unchanged", async () => {
  const { sqlite, handles } = sqliteRig();
  const recordId = await confirmedRecord(handles, 'subject:s-a2');
  const headSeq = rawRows(sqlite, recordId).length;
  editRow(sqlite, recordId, headSeq, (t) => ({ ...t, prevHash: 'md5:00' }));
  const before = rawRows(sqlite, recordId);

  assertNoEdge(await handles.operator.seal(recordId));
  assert.deepEqual(rawRows(sqlite, recordId), before);
  assertNoEdge(await handles.operator.seal(recordId));
  assert.deepEqual(rawRows(sqlite, recordId), before, 'a second call appends nothing');
});

test('SqliteStore: a middle payload set to 1e999 — finalize lands the edge; a second call refuses with no edge', async () => {
  const { sqlite, handles } = sqliteRig();
  const recordId = await openFlowRecord(handles, 'subject:s-b1');
  nonFinitePayload(sqlite, recordId, 2);
  const report = await handles.operator.verifyChain(recordId);
  assert.equal(report.intact, false);
  if (report.intact) return;
  assert.equal(report.firstBreakSeq, 2, 'fixture: the non-finite row is the break');

  const ref = assertEdge(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  assertEdgeIsHead(await sqlite.readChain(recordId), 4, ref);
  assert.equal(persistedState(sqlite, recordId), 'refused');

  const after = rawRows(sqlite, recordId);
  assertNoEdge(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  assert.deepEqual(rawRows(sqlite, recordId), after, 'a second call appends nothing');
});

test('SqliteStore: a middle row set to null — seal lands the edge; a second call refuses with no edge', async () => {
  const { sqlite, handles } = sqliteRig();
  const recordId = await confirmedRecord(handles, 'subject:s-b3');
  const length = rawRows(sqlite, recordId).length;
  setRowJson(sqlite, recordId, 2, 'null');

  const ref = assertEdge(await handles.operator.seal(recordId));
  assertEdgeIsHead(await sqlite.readChain(recordId), length + 1, ref);
  assert.equal(persistedState(sqlite, recordId), 'refused');

  const after = rawRows(sqlite, recordId);
  assertNoEdge(await handles.operator.seal(recordId));
  assert.deepEqual(rawRows(sqlite, recordId), after, 'a second call appends nothing');
});

test("SqliteStore: a confirmed record's middle row deleted — seal lands the edge at max(seq) + 1, the state is refused, verifyChain still breaks at the deleted seq", async () => {
  const { sqlite, handles } = sqliteRig();
  const recordId = await confirmedRecord(handles, 'subject:s-c1');
  const maxSeq = rawRows(sqlite, recordId).length;
  deleteRow(sqlite, recordId, 2);

  const ref = assertEdge(await handles.operator.seal(recordId));
  const chain = await sqlite.readChain(recordId);
  assertEdgeIsHead(chain, maxSeq + 1, ref);
  assert.deepEqual(
    chain.map((t) => t.seq),
    [1, ...Array.from({ length: maxSeq - 2 }, (_, i) => i + 3), maxSeq + 1],
    'the gap stays; the edge follows the highest seq',
  );
  assert.equal(persistedState(sqlite, recordId), 'refused');
  const report = await handles.operator.verifyChain(recordId);
  assert.equal(report.intact, false);
  if (report.intact) return;
  assert.equal(report.firstBreakSeq, 2, 'verifyChain still reports the original break');

  const after = rawRows(sqlite, recordId);
  assertNoEdge(await handles.operator.seal(recordId));
  assert.deepEqual(rawRows(sqlite, recordId), after, 'a second call appends nothing');
});

test('SqliteStore: an open findings-flow record with its middle row deleted — finalize lands the edge, and open() on the subject then succeeds', async () => {
  const { sqlite, handles } = sqliteRig();
  const subject = 'subject:s-c2';
  const recordId = await openFlowRecord(handles, subject);
  deleteRow(sqlite, recordId, 2);

  const ref = assertEdge(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  assertEdgeIsHead(await sqlite.readChain(recordId), 4, ref);
  assert.equal(persistedState(sqlite, recordId), 'refused');
  assert.equal(await sqlite.findNonTerminal('test.tamper.flow.v1', subject), null);
  const report = await handles.operator.verifyChain(recordId);
  assert.equal(report.intact, false);
  if (report.intact) return;
  assert.equal(report.firstBreakSeq, 2);

  const after = rawRows(sqlite, recordId);
  assertNoEdge(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  assert.deepEqual(rawRows(sqlite, recordId), after, 'a second call appends nothing');
  await pairIsFree(handles, 'test.tamper.flow.v1', subject);
});

test('SqliteStore: the genesis deleted — finalize lands the edge, and open() on the subject then succeeds', async () => {
  const { sqlite, handles } = sqliteRig();
  const subject = 'subject:s-c3';
  const recordId = await openFlowRecord(handles, subject);
  deleteRow(sqlite, recordId, 1);

  const ref = assertEdge(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  const chain = await sqlite.readChain(recordId);
  assertEdgeIsHead(chain, 4, ref);
  assert.deepEqual(
    chain.map((t) => t.seq),
    [2, 3, 4],
  );
  assert.equal(persistedState(sqlite, recordId), 'refused');
  const report = await handles.operator.verifyChain(recordId);
  assert.equal(report.intact, false);
  if (report.intact) return;
  assert.equal(report.firstBreakSeq, 1);

  const after = rawRows(sqlite, recordId);
  assertNoEdge(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  assert.deepEqual(rawRows(sqlite, recordId), after, 'a second call appends nothing');
  await pairIsFree(handles, 'test.tamper.flow.v1', subject);
});

// ============================================================================================
// MemoryStore, through a read copy (the edge lands on the inner store)
// ============================================================================================

test('MemoryStore read copy: a sole genesis whose prevHash is garbage — finalize and decline refuse with no edge, the inner chain unchanged', async () => {
  const { inner, handles, tampered } = memoryRig();
  const recordId = await openRecord(handles, CONTENT, 'test.tamper.plain.v1', 'subject:m-a1');
  const copy = tampered(
    recordId,
    at(0, (t) => ({ ...t, prevHash: 'tampered' })),
  );
  const before = await inner.readChain(recordId);

  assertNoEdge(await copy.operator.finalize(recordId, identity(), CONTENT, facts()));
  assertNoEdge(await copy.operator.decline(recordId, identity(), CONTENT, facts()));
  assertNoEdge(await copy.operator.finalize(recordId, identity(), CONTENT, facts()));
  assert.deepEqual(await inner.readChain(recordId), before, 'nothing was appended');
});

test("MemoryStore read copy: a confirmed record's head prevHash set to md5:00 — seal refuses with no edge", async () => {
  const { inner, handles, tampered } = memoryRig();
  const recordId = await confirmedRecord(handles, 'subject:m-a2');
  const copy = tampered(
    recordId,
    atHead((t) => ({ ...t, prevHash: 'md5:00' })),
  );
  const before = await inner.readChain(recordId);

  assertNoEdge(await copy.operator.seal(recordId));
  assertNoEdge(await copy.operator.seal(recordId));
  assert.deepEqual(await inner.readChain(recordId), before, 'nothing was appended');
});

test('MemoryStore read copy: a non-canonical head payload — seal refuses with no edge', async () => {
  const { inner, handles, tampered } = memoryRig();
  const recordId = await confirmedRecord(handles, 'subject:m-a3');
  const copy = tampered(
    recordId,
    atHead((t) => ({ ...t, payload: { total: Infinity } })),
  );
  const before = await inner.readChain(recordId);
  const report = await copy.operator.verifyChain(recordId);
  assert.equal(report.intact, false, 'the head is digested too: a non-canonical head is the break');

  assertNoEdge(await copy.operator.seal(recordId));
  assert.deepEqual(await inner.readChain(recordId), before, 'nothing was appended');
});

test('MemoryStore read copy: a null head — finalize refuses with no edge', async () => {
  const { inner, handles, tampered } = memoryRig();
  const recordId = await openFlowRecord(handles, 'subject:m-a4');
  const copy = tampered(
    recordId,
    atHead(() => null),
  );
  const before = await inner.readChain(recordId);

  assertNoEdge(await copy.operator.finalize(recordId, identity(), CONTENT, facts()));
  assert.deepEqual(await inner.readChain(recordId), before, 'nothing was appended');
});

test('MemoryStore read copy: Infinity in a middle payload — finalize lands the edge on the inner store', async () => {
  const { inner, handles, tampered } = memoryRig();
  const recordId = await openFlowRecord(handles, 'subject:m-b1');
  const copy = tampered(
    recordId,
    at(1, (t) => ({ ...t, payload: { total: Infinity } })),
  );

  const ref = assertEdge(await copy.operator.finalize(recordId, identity(), CONTENT, facts()));
  assertEdgeIsHead(await inner.readChain(recordId), 4, ref);
  const after = await inner.readChain(recordId);
  assertNoEdge(await copy.operator.finalize(recordId, identity(), CONTENT, facts()));
  assert.deepEqual(await inner.readChain(recordId), after, 'a second call appends nothing');
});

test('MemoryStore read copy: a null middle row — seal lands the edge on the inner store', async () => {
  const { inner, handles, tampered } = memoryRig();
  const recordId = await confirmedRecord(handles, 'subject:m-b3');
  const length = (await inner.readChain(recordId)).length;
  const copy = tampered(
    recordId,
    at(1, () => null),
  );

  const ref = assertEdge(await copy.operator.seal(recordId));
  assertEdgeIsHead(await inner.readChain(recordId), length + 1, ref);
  const after = await inner.readChain(recordId);
  assertNoEdge(await copy.operator.seal(recordId));
  assert.deepEqual(await inner.readChain(recordId), after, 'a second call appends nothing');
});

test("MemoryStore read copy: a confirmed record's middle row missing — seal lands the edge at the inner store's next seq", async () => {
  const { inner, handles, tampered } = memoryRig();
  const recordId = await confirmedRecord(handles, 'subject:m-c1');
  const length = (await inner.readChain(recordId)).length;
  const copy = tampered(recordId, without(1));

  const ref = assertEdge(await copy.operator.seal(recordId));
  assertEdgeIsHead(await inner.readChain(recordId), length + 1, ref);
  const report = await copy.operator.verifyChain(recordId);
  assert.equal(report.intact, false);
  if (report.intact) return;
  assert.equal(report.firstBreakSeq, 2, 'verifyChain still reports the original break');

  const after = await inner.readChain(recordId);
  assertNoEdge(await copy.operator.seal(recordId));
  assert.deepEqual(await inner.readChain(recordId), after, 'a second call appends nothing');
});

test('MemoryStore read copy: an open record missing its middle row — finalize lands the edge, and open() on the subject then succeeds', async () => {
  const { inner, handles, tampered } = memoryRig();
  const subject = 'subject:m-c2';
  const recordId = await openFlowRecord(handles, subject);
  const copy = tampered(recordId, without(1));

  const ref = assertEdge(await copy.operator.finalize(recordId, identity(), CONTENT, facts()));
  assertEdgeIsHead(await inner.readChain(recordId), 4, ref);
  const after = await inner.readChain(recordId);
  assertNoEdge(await copy.operator.finalize(recordId, identity(), CONTENT, facts()));
  assert.deepEqual(await inner.readChain(recordId), after, 'a second call appends nothing');
  await pairIsFree(copy, 'test.tamper.flow.v1', subject);
});

test('MemoryStore read copy: the genesis missing — finalize lands the edge, and open() on the subject then succeeds', async () => {
  const { inner, handles, tampered } = memoryRig();
  const subject = 'subject:m-c3';
  const recordId = await openFlowRecord(handles, subject);
  const copy = tampered(recordId, without(0));

  const ref = assertEdge(await copy.operator.finalize(recordId, identity(), CONTENT, facts()));
  assertEdgeIsHead(await inner.readChain(recordId), 4, ref);
  const report = await copy.operator.verifyChain(recordId);
  assert.equal(report.intact, false);
  if (report.intact) return;
  assert.equal(report.firstBreakSeq, 1);

  const after = await inner.readChain(recordId);
  assertNoEdge(await copy.operator.finalize(recordId, identity(), CONTENT, facts()));
  assert.deepEqual(await inner.readChain(recordId), after, 'a second call appends nothing');
  await pairIsFree(copy, 'test.tamper.flow.v1', subject);
});

test("non-regression: a read copy with the head's seq rewritten to 99 still lands the edge, through the chain.length + 1 fallback", async () => {
  const { inner, handles, tampered } = memoryRig();
  const recordId = await openFlowRecord(handles, 'subject:m-d1');
  const copy = tampered(
    recordId,
    atHead((t) => ({ ...t, seq: 99 })),
  );

  const ref = assertEdge(await copy.operator.finalize(recordId, identity(), CONTENT, facts()));
  assertEdgeIsHead(await inner.readChain(recordId), 4, ref);
  const after = await inner.readChain(recordId);
  assertNoEdge(await copy.operator.finalize(recordId, identity(), CONTENT, facts()));
  assert.deepEqual(await inner.readChain(recordId), after, 'a second call appends nothing');
});

// ============================================================================================
// The walk itself: which (state target, seq) attempts the compromise append makes
// ============================================================================================

/** A read copy whose compromise attempts all lose with `conflict`, each one recorded. */
class LosingCompromiseStore extends TamperingStore {
  readonly attempts: string[] = [];
  constructor(
    inner: Store,
    recordId: string,
    tamperFn: (chain: Transition[]) => Transition[],
    private readonly conflict: 'seq' | 'state-mismatch',
  ) {
    super(inner, recordId, tamperFn);
  }
  override appendTransition(
    ...[expected, t, meta]: Parameters<TamperingStore['appendTransition']>
  ): ReturnType<TamperingStore['appendTransition']> {
    if (t.kind !== 'refused') return super.appendTransition(expected, t, meta);
    this.attempts.push(`${expected}@${t.seq}`);
    return Promise.resolve({ appended: false, conflict: this.conflict });
  }
}

async function compromiseAttempts(
  tamperFn: (chain: Transition[]) => Transition[],
  conflict: 'seq' | 'state-mismatch',
): Promise<string[]> {
  const inner = new MemoryStore();
  const profiles = [flowProfile()];
  const recordId = await openFlowRecord(create(makeConfig(profiles, { store: inner })), 'subj:w');
  const store = new LosingCompromiseStore(inner, recordId, tamperFn, conflict);
  const out = await create(makeConfig(profiles, { store })).operator.finalize(
    recordId,
    identity(),
    CONTENT,
    facts(),
  );
  assertNoEdge(out);
  return store.attempts;
}

test('the walk on a CONTIGUOUS chain is the single-seq walk it always was: one attempt per state target, at chain.length + 1, even when every attempt loses on seq', async () => {
  // A payload tamper of the genesis keeps the chain contiguous: head.seq + 1 === length + 1.
  const tamperGenesis = at(0, (t) => ({ ...t, payload: { ...(t.payload as object), x: 1 } }));
  assert.deepEqual(await compromiseAttempts(tamperGenesis, 'seq'), [
    'open@4',
    'confirmed@4',
    'redeeming@4',
  ]);
  assert.deepEqual(await compromiseAttempts(tamperGenesis, 'state-mismatch'), [
    'open@4',
    'confirmed@4',
    'redeeming@4',
  ]);
});

test("the walk on a GAPPED chain tries head.seq + 1 then chain.length + 1 per state target, the second only after a 'seq' conflict", async () => {
  // The middle row missing from the read: head.seq + 1 = 4, chain.length + 1 = 3.
  assert.deepEqual(await compromiseAttempts(without(1), 'seq'), [
    'open@4',
    'open@3',
    'confirmed@4',
    'confirmed@3',
    'redeeming@4',
    'redeeming@3',
  ]);
  assert.deepEqual(
    await compromiseAttempts(without(1), 'state-mismatch'),
    ['open@4', 'confirmed@4', 'redeeming@4'],
    'a state-mismatch moves to the next state target without trying the other seq',
  );
});

// ============================================================================================
// AL2: the signing decorator's cold genesis read
// ============================================================================================

/** Two signing instances over one SqliteStore and one separate sidecar, sharing one key. The
 * second instance's signs-or-not memo is cold for every record the first one built. */
function signingRig(profile: ConfirmProfile) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const sqlite = new SqliteStore(':memory:');
  const signer: Signer = async (bytes) => ({
    keyRef: 'key-1',
    signature: edSign(null, bytes, privateKey).toString('base64'),
  });
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  const signatures = new MemorySignatureStore();
  const instance = (store: Store = sqlite) =>
    create({
      ...makeConfig([profile], { store }),
      signing: { signer, verifiers: { 'key-1': verifier }, signatures },
    });
  return { sqlite, signatures, instance };
}

const SIGNING_PLAIN: ConfirmProfile = { ...plainProfile(), signing: true };

test('AL2 cold genesis read: a null genesis row — the compromise edge is signed and lands, never a throw', async () => {
  const { sqlite, signatures, instance } = signingRig(SIGNING_PLAIN);
  const recordId = await confirmedRecord(instance(), 'subject:al2-a');
  const length = rawRows(sqlite, recordId).length;
  setRowJson(sqlite, recordId, 1, 'null');

  const cold = instance();
  const ref = assertEdge(await cold.operator.seal(recordId));
  assertEdgeIsHead(await sqlite.readChain(recordId), length + 1, ref);
  assert.ok(
    (await signatures.listByRecord(recordId)).some((e) => e.transitionDigest === ref),
    'the edge is signed',
  );
});

test('AL2 cold genesis read: a genesis whose payload is null — the compromise edge is signed and lands, never a throw', async () => {
  const { sqlite, signatures, instance } = signingRig(SIGNING_PLAIN);
  const recordId = await confirmedRecord(instance(), 'subject:al2-b');
  const length = rawRows(sqlite, recordId).length;
  editRow(sqlite, recordId, 1, (t) => ({ ...t, payload: null }));

  const cold = instance();
  const ref = assertEdge(await cold.operator.seal(recordId));
  assertEdgeIsHead(await sqlite.readChain(recordId), length + 1, ref);
  assert.ok(
    (await signatures.listByRecord(recordId)).some((e) => e.transitionDigest === ref),
    'the edge is signed',
  );
});

// ============================================================================================
// Rung (4.5): reachable only through a storage edit inside the AL1 head-bound window
// ============================================================================================

const RUNG_45 =
  /storage edit of a sole-genesis head inside the AL1 head-bound window.*AL2 closes it as chain-compromise/;

/** The sole genesis given a bound `policyDigest` its profile never declared — no recompute. */
const bindPolicy = (t: Transition): Transition => ({
  ...t,
  payload: { ...(t.payload as Record<string, unknown>), policyDigest: POLICY },
});

test('rung (4.5), MemoryStore read copy: a sole genesis edited to bind a policyDigest throws the storage-fault message, appending nothing', async () => {
  const { inner, handles, tampered } = memoryRig();
  const recordId = await openRecord(handles, CONTENT, 'test.tamper.plain.v1', 'subject:r-1');
  const copy = tampered(recordId, at(0, bindPolicy));
  assert.equal(
    (await copy.operator.verifyChain(recordId)).intact,
    true,
    'fixture: AL1 cannot see a sole-genesis edit',
  );
  const before = await inner.readChain(recordId);

  await assert.rejects(copy.operator.finalize(recordId, identity(), CONTENT, facts()), RUNG_45);
  assert.deepEqual(await inner.readChain(recordId), before, 'nothing was appended');
});

test('rung (4.5), SqliteStore: the same edit as a raw UPDATE throws the storage-fault message, appending nothing', async () => {
  const { sqlite, handles } = sqliteRig();
  const recordId = await openRecord(handles, CONTENT, 'test.tamper.plain.v1', 'subject:r-2');
  editRow(sqlite, recordId, 1, bindPolicy);
  const before = rawRows(sqlite, recordId);

  await assert.rejects(handles.operator.finalize(recordId, identity(), CONTENT, facts()), RUNG_45);
  assert.deepEqual(rawRows(sqlite, recordId), before, 'nothing was appended');
});

test('rung (4.5), AL2: the same raw UPDATE under a signing profile refuses chain-compromise, and the edge lands', async () => {
  const { sqlite, instance } = signingRig(SIGNING_PLAIN);
  const handles = instance();
  const recordId = await openRecord(handles, CONTENT, SIGNING_PLAIN.id, 'subject:r-3');
  editRow(sqlite, recordId, 1, bindPolicy);

  const ref = assertEdge(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  assertEdgeIsHead(await sqlite.readChain(recordId), 2, ref);
});
