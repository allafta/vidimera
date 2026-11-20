// The PostgresStore legs of record's tamper-shapes.test.ts: a storage-writing insider edits or
// deletes rows straight in the transitions table, and the operator's next ordinary call must
// refuse `chain-compromise` rather than throw, and land its edge wherever the head has a digest
// to chain onto. A sole genesis whose prevHash is garbage has none, so the seam refuses with no
// edge and the chain stays as it was. A middle payload the backing parses back as Infinity is
// the break at its own row, and the edge lands. A deleted middle row or genesis leaves a gap,
// and the edge, proposed first at `head.seq + 1`, lands at the store's `max(seq) + 1`: the
// record goes terminal, the (profile, subject) pair is released, and `verifyChain` still
// reports the original break. A second call refuses with no edge and changes nothing.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { transitionDigest } from '../../record/src/chain/encoding.js';
import type { ConfirmProfile } from '../../record/src/config.js';
import { create } from '../../record/src/create.js';
import type { Outcome } from '../../record/src/outcome.js';
import type { Transition } from '../../record/src/types.js';
import {
  captureProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from '../../record/test/helpers/profiles.js';
import { PostgresStore } from '../src/postgres-store.js';
import { nextSchemaName, sharedPool } from './helpers/pg.js';

const CONTENT = { subject: 'week-1', total: 40 };
const FLOW_ID = 'test.pgtamper.flow.v1';
const PLAIN_ID = 'test.pgtamper.plain.v1';
const RAISER = { principal: 'checker:1', authority: 'mtls:checker' };

type Handles = ReturnType<typeof create>;

/** A capture-terminal leg with the findings flow declared, so an OPEN record can carry three rows. */
function flowProfile(): ConfirmProfile {
  const p = captureProfile({ id: FLOW_ID });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  p.legs[0] = { ...leg, ackMode: 'any', requiredAcks: ['variance'] };
  return p;
}

function rig() {
  const schema = nextSchemaName();
  const store = new PostgresStore(sharedPool(), { schema });
  const handles = create(
    makeConfig([captureProfile({ id: PLAIN_ID, decline: true }), flowProfile()], { store }),
  );
  return { schema, store, handles };
}

/** `[opened, finding-raised, finding-raised]`, still open. */
async function openFlowRecord(handles: Handles, subjectRef: string): Promise<string> {
  const recordId = await openRecord(handles, CONTENT, FLOW_ID, subjectRef);
  for (const [findingId, fill] of [
    ['f-1', '1'],
    ['f-2', '2'],
  ] as const) {
    const raised = await handles.operator.raiseFinding(
      recordId,
      { findingId, kind: 'variance', findingDigest: `sha256:${fill.repeat(64)}` },
      RAISER,
    );
    assert.equal(raised.status, 'ok', 'fixture: the finding is raised');
  }
  return recordId;
}

type RawRow = { seq: number; transition_json: string };

async function rawRows(schema: string, recordId: string): Promise<RawRow[]> {
  const { rows } = await sharedPool().query(
    `SELECT seq, transition_json FROM "${schema}"."transitions" WHERE record_id = $1 ORDER BY seq`,
    [recordId],
  );
  return rows as RawRow[];
}

async function setRowJson(schema: string, recordId: string, seq: number, json: string) {
  const res = await sharedPool().query(
    `UPDATE "${schema}"."transitions" SET transition_json = $1 WHERE record_id = $2 AND seq = $3`,
    [json, recordId, seq],
  );
  assert.equal(res.rowCount, 1, `fixture: row ${seq} rewritten`);
}

async function rowAt(schema: string, recordId: string, seq: number): Promise<Transition> {
  const row = (await rawRows(schema, recordId)).find((r) => r.seq === seq);
  assert.ok(row !== undefined, `fixture: row ${seq} exists`);
  return JSON.parse(row.transition_json) as Transition;
}

async function deleteRow(schema: string, recordId: string, seq: number) {
  const res = await sharedPool().query(
    `DELETE FROM "${schema}"."transitions" WHERE record_id = $1 AND seq = $2`,
    [recordId, seq],
  );
  assert.equal(res.rowCount, 1, `fixture: row ${seq} deleted`);
}

async function persistedState(schema: string, recordId: string): Promise<string | undefined> {
  const { rows } = await sharedPool().query(
    `SELECT state FROM "${schema}"."records" WHERE id = $1`,
    [recordId],
  );
  return (rows[0] as { state: string } | undefined)?.state;
}

function assertNoEdge(out: Outcome<unknown>): void {
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.equal(out.transitionRef, undefined, 'no edge');
}

function assertEdge(out: Outcome<unknown>): string {
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') throw new Error('unreachable: asserted above');
  assert.equal(out.code, 'chain-compromise');
  assert.ok(out.transitionRef !== undefined, 'the compromise edge landed');
  return out.transitionRef;
}

function assertEdgeIsHead(chain: readonly Transition[], seq: number, ref: string): void {
  const head = chain.at(-1);
  assert.ok(head !== undefined);
  assert.equal(head.kind, 'refused');
  assert.deepEqual(head.payload, { code: 'chain-compromise' });
  assert.equal(head.seq, seq, "the edge sits at the store's max(seq) + 1");
  assert.equal(transitionDigest(head), ref, 'the outcome names the edge');
}

async function pairIsFree(handles: Handles, subjectRef: string) {
  const staged = await handles.agent.stage(CONTENT, FLOW_ID, subjectRef);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef);
  assert.equal(opened.status, 'ok', 'open() on the subject succeeds: the pair was released');
}

test('PostgresStore: a sole genesis whose prevHash is garbage — finalize and decline refuse chain-compromise with no edge, the chain unchanged', async () => {
  const { schema, handles } = rig();
  const recordId = await openRecord(handles, CONTENT, PLAIN_ID, 'subject:pg-a1');
  const genesis = await rowAt(schema, recordId, 1);
  await setRowJson(schema, recordId, 1, JSON.stringify({ ...genesis, prevHash: 'tampered' }));
  const before = await rawRows(schema, recordId);

  assertNoEdge(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  assertNoEdge(await handles.operator.decline(recordId, identity(), CONTENT, facts()));
  assertNoEdge(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  assert.deepEqual(await rawRows(schema, recordId), before, 'nothing was appended');
  assert.equal(await persistedState(schema, recordId), 'open');
});

test('PostgresStore: a middle payload set to 1e999 — finalize lands the edge; a second call refuses with no edge', async () => {
  const { schema, store, handles } = rig();
  const recordId = await openFlowRecord(handles, 'subject:pg-b1');
  const marker = '__non_finite__';
  const json = JSON.stringify({ ...(await rowAt(schema, recordId, 2)), payload: marker }).replace(
    `"${marker}"`,
    '1e999',
  );
  await setRowJson(schema, recordId, 2, json);

  const ref = assertEdge(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  assertEdgeIsHead(await store.readChain(recordId), 4, ref);
  assert.equal(await persistedState(schema, recordId), 'refused');

  const after = await rawRows(schema, recordId);
  assertNoEdge(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  assert.deepEqual(await rawRows(schema, recordId), after, 'a second call appends nothing');
});

test('PostgresStore: a middle row deleted — finalize lands the edge at max(seq) + 1, verifyChain still breaks at the deleted seq, and open() on the subject then succeeds', async () => {
  const { schema, store, handles } = rig();
  const subject = 'subject:pg-c2';
  const recordId = await openFlowRecord(handles, subject);
  await deleteRow(schema, recordId, 2);

  const ref = assertEdge(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  const chain = await store.readChain(recordId);
  assertEdgeIsHead(chain, 4, ref);
  assert.deepEqual(
    chain.map((t) => t.seq),
    [1, 3, 4],
  );
  assert.equal(await persistedState(schema, recordId), 'refused');
  const report = await handles.operator.verifyChain(recordId);
  assert.equal(report.intact, false);
  if (report.intact) return;
  assert.equal(report.firstBreakSeq, 2, 'verifyChain still reports the original break');

  const after = await rawRows(schema, recordId);
  assertNoEdge(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  assert.deepEqual(await rawRows(schema, recordId), after, 'a second call appends nothing');
  await pairIsFree(handles, subject);
});

test('PostgresStore: the genesis deleted — finalize lands the edge, and open() on the subject then succeeds', async () => {
  const { schema, store, handles } = rig();
  const subject = 'subject:pg-c3';
  const recordId = await openFlowRecord(handles, subject);
  await deleteRow(schema, recordId, 1);

  const ref = assertEdge(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  const chain = await store.readChain(recordId);
  assertEdgeIsHead(chain, 4, ref);
  assert.deepEqual(
    chain.map((t) => t.seq),
    [2, 3, 4],
  );
  assert.equal(await persistedState(schema, recordId), 'refused');
  const report = await handles.operator.verifyChain(recordId);
  assert.equal(report.intact, false);
  if (report.intact) return;
  assert.equal(report.firstBreakSeq, 1);

  const after = await rawRows(schema, recordId);
  assertNoEdge(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  assert.deepEqual(await rawRows(schema, recordId), after, 'a second call appends nothing');
  await pairIsFree(handles, subject);
});
