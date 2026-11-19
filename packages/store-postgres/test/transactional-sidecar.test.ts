// The integrated sidecar end to end over PostgresStore — the third backing's leg of what
// record's transactional-sidecar.test.ts pins over MemoryStore and SqliteStore. A signing
// instance configured with `signatures: store.signatures` runs integrated: the decorator mints
// and checks before the append, hands the entries down on it (`AppendMeta.signatures`), and the
// store inserts them through the append's own client — its own pooled transaction, or the
// host's when enlisted — after every check has passed, and only then. The store-level contract
// is pinned in the shared conformance suite (postgres-store-conformance.test.ts registers its
// integrated-sidecar block and enlisted pins); this file pins the measurements end to end, the
// lazy DDL's table on an existing schema, where the entry check runs, and atomicity when the
// entry insert itself fails — on the store's own transaction and on an enlisted one.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';
import { transitionDigest } from '../../record/src/chain/encoding.js';
import { replay } from '../../record/src/chain/replay.js';
import type { ConfirmProfile } from '../../record/src/config.js';
import { createWithClock, type Surfaces } from '../../record/src/create.js';
import type { Outcome } from '../../record/src/outcome.js';
import type {
  SignatureEntry,
  SignatureStore,
  Signer,
  Verifier,
} from '../../record/src/signing/store.js';
import type { AppendMeta, BatchResult, Store } from '../../record/src/store/store.js';
import type { RecordState, Transition } from '../../record/src/types.js';
import { storeGenesis, storeNext } from '../../record/test/helpers/chain.js';
import {
  captureProfile,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from '../../record/test/helpers/profiles.js';
import { breakOneSignature } from '../../record/test/helpers/signing.js';
import { APPROVER, successBatch } from '../../record/test/helpers/store-fixtures.js';
import { PostgresStore } from '../src/postgres-store.js';
import { nextSchemaName, sharedPool } from './helpers/pg.js';

const CONTENT = { subject: 'week-1', total: 40 };
const PROFILE_ID = 'test.pgsidecar.v1';
const SIGNING_PROFILE: ConfirmProfile = { ...captureProfile({ id: PROFILE_ID }), signing: true };
const EFFECT_ID = 'test.pgsidecar.effect.v1';
const EFFECT_PROFILE: ConfirmProfile = { ...effectSeamProfile({ id: EFFECT_ID }), signing: true };
const FLOW_ID = 'test.pgsidecar.flow.v1';
const RACE_RAISER = { principal: 'checker:race', authority: 'mtls:checker' };

/** A fresh store on its own schema, with the schema's name for the pins that reach the SQL. */
function pgStore(): { store: PostgresStore; schema: string } {
  const schema = nextSchemaName();
  return { store: new PostgresStore(sharedPool(), { schema }), schema };
}

/** A clock that advances one second per read and can be jumped forward: two refusing calls
 * never stamp the same `at`, so they never collapse onto one sidecar key. */
function movableClock(startIso = '2026-11-19T00:00:00Z') {
  let ms = Date.parse(startIso);
  return {
    now: () => {
      ms += 1000;
      return new Date(ms);
    },
    advance: (deltaMs: number) => {
      ms += deltaMs;
    },
  };
}

/**
 * A real Ed25519 signer that counts its mints, its verifier, and an instance over `store`
 * configured with the store's OWN sidecar — integrated mode, by identity.
 */
function integratedRig(
  store: PostgresStore,
  opts: { clock?: () => Date; profiles?: ConfirmProfile[] } = {},
) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  let mints = 0;
  const signer: Signer = async (bytes) => {
    mints += 1;
    return { keyRef: 'key-1', signature: edSign(null, bytes, privateKey).toString('base64') };
  };
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  const config = {
    ...makeConfig(opts.profiles ?? [SIGNING_PROFILE], { store }),
    signing: { signer, verifiers: { 'key-1': verifier }, signatures: store.signatures },
  };
  return {
    handles: createWithClock(config, opts.clock ?? movableClock().now),
    mints: () => mints,
  };
}

/** Opens and confirms a record — terminal `confirmed`. */
async function confirmedRecord(handles: Surfaces, subjectRef: string, profileId = PROFILE_ID) {
  const recordId = await openRecord(handles, CONTENT, profileId, subjectRef);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record confirms');
  return recordId;
}

/** The no-edge refusal shape: `chain-compromise`, compromise-classed, and NO transitionRef. */
function assertNoEdgeRefusal(out: Outcome<unknown>, label: string): void {
  assert.equal(out.status, 'refused', `${label}: refused`);
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise', `${label}: chain-compromise`);
  assert.equal(out.class, 'compromise', `${label}: compromise-classed`);
  assert.equal(out.transitionRef, undefined, `${label}: no edge landed, so no transitionRef`);
}

/** The sidecar's digests for a record, sorted — no sidecar promises an order. */
async function sidecarDigests(signatures: SignatureStore, recordId: string): Promise<string[]> {
  return (await signatures.listByRecord(recordId)).map((e) => e.transitionDigest).sort();
}

/** The persisted chain's digests for a record, sorted to compare with `sidecarDigests`. */
async function chainDigests(store: Store, recordId: string): Promise<string[]> {
  return (await store.readChain(recordId)).map((t) => transitionDigest(t)).sort();
}

/** An entry naming `t`, with a placeholder signature (a store never verifies one). */
function entryFor(t: Transition): SignatureEntry {
  return {
    transitionDigest: transitionDigest(t),
    recordId: t.recordId,
    seq: t.seq,
    keyRef: 'key-1',
    signature: `sig:${t.recordId}:${t.seq}`,
  };
}

/** `meta` carrying one entry per transition, in the order given. */
function signed(meta: AppendMeta, ...transitions: Transition[]): AppendMeta {
  return { ...meta, signatures: transitions.map(entryFor) };
}

// === the sidecar is exposed, so the conformance block cannot skip this backing ============

test('PostgresStore exposes its own sidecar — one stable object per store — so the conformance suite registers its integrated-sidecar block, and its enlisted pins, for this backing', () => {
  const { store } = pgStore();
  assert.ok(store.signatures !== undefined, 'the sidecar is exposed');
  assert.equal(typeof store.signatures.put, 'function');
  assert.equal(typeof store.signatures.listByRecord, 'function');
  assert.equal(store.signatures, store.signatures, 'stable: identity is what selects the mode');
  assert.notEqual(pgStore().store.signatures, store.signatures, 'each store has its own');
});

// === row 22, integrated, over Postgres ======================================================

test('ROW 22, integrated, PostgresStore — six refusing finalize() calls against a sealed signing record leave the sidecar table equal to the chain: zero orphans', async () => {
  const { store } = pgStore();
  const rig = integratedRig(store);
  const recordId = await confirmedRecord(rig.handles, 'subject:pg-sealed');
  assert.equal((await rig.handles.operator.seal(recordId)).status, 'ok', 'fixture: sealed');
  // Break the genesis entry, so every later finalize() refuses chain-compromise — and, C4
  // barring every candidate, can land no edge.
  await breakOneSignature(store.signatures, recordId, store);
  const chainLength = (await store.readChain(recordId)).length;
  assert.deepEqual(
    await sidecarDigests(store.signatures, recordId),
    await chainDigests(store, recordId),
    'fixture: one entry per landed transition before the refusing calls',
  );

  const mintsBefore = rig.mints();
  for (let call = 1; call <= 6; call += 1) {
    const out = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assertNoEdgeRefusal(out, `sealed corner, call ${call}`);
    assert.equal((await store.readChain(recordId)).length, chainLength, 'chain flat');
    assert.equal(
      (await store.signatures.listByRecord(recordId)).length,
      chainLength,
      `the sidecar's length is the chain's (call ${call})`,
    );
    assert.equal(rig.mints() - mintsBefore, call, 'one mint per refusing call, unchanged');
  }
  assert.deepEqual(
    await sidecarDigests(store.signatures, recordId),
    await chainDigests(store, recordId),
    'the sidecar is exactly the chain',
  );
  const report = await rig.handles.operator.verifySignatures(recordId);
  assert.deepEqual(report.orphans, [], 'zero orphans');
});

test("PostgresStore, integrated — open()'s expire-then-retry under a moving clock leaves no orphan genesis", async () => {
  const { store } = pgStore();
  const clock = movableClock();
  const rig = integratedRig(store, { clock: clock.now });
  const subjectRef = 'subject:pg-retry';
  const blocker = await openRecord(rig.handles, CONTENT, PROFILE_ID, subjectRef);
  clock.advance(2 * 3600 * 1000); // past the capture profile's one-hour open window

  const mintsBefore = rig.mints();
  const second = await openRecord(rig.handles, CONTENT, PROFILE_ID, subjectRef);
  assert.notEqual(second, blocker, 'a new record opened after the lapsed blocker expired');
  assert.equal(replay(await store.readChain(blocker)).state, 'expired', 'blocker expired');
  assert.equal(rig.mints() - mintsBefore, 3, 'three mints: attempt, expiry, retry');

  for (const [label, recordId] of [
    ['the blocker', blocker],
    ['the retried record', second],
  ] as const) {
    assert.deepEqual(
      await sidecarDigests(store.signatures, recordId),
      await chainDigests(store, recordId),
      `${label}: the sidecar is exactly the chain`,
    );
    const report = await rig.handles.operator.verifySignatures(recordId);
    assert.deepEqual(report.orphans, [], `${label}: no orphan`);
    assert.ok(
      report.transitions.every((t) => t.signed && t.verified),
      `${label}: every landed transition is signed and verifies`,
    );
  }
});

/**
 * A PostgresStore whose next `appendBatch` first runs a one-shot hook — a second writer landing
 * between a seam's chain read and its batch — and that records each batch's `meta`. A subclass,
 * so it IS the store: its `signatures` is its own, and `meta` reaches the store intact.
 */
class RacingPostgresStore extends PostgresStore {
  readonly batches: { transitions: readonly Transition[]; meta: AppendMeta }[] = [];
  beforeNextBatch: (() => Promise<void>) | undefined;

  override async appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
    tx?: unknown,
  ): Promise<BatchResult> {
    const before = this.beforeNextBatch;
    if (before !== undefined) {
      this.beforeNextBatch = undefined;
      await before();
    }
    this.batches.push({ transitions, meta });
    return super.appendBatch(expectedCurrentState, transitions, meta, tx);
  }
}

test('PostgresStore, integrated — a finalize batch that loses to a concurrent finding refuses record-contended, and its entries, handed down with it, are never written', async () => {
  const store = new RacingPostgresStore(sharedPool(), { schema: nextSchemaName() });
  const base = captureProfile({ id: FLOW_ID });
  const flowProfile: ConfirmProfile = {
    ...base,
    legs: base.legs.map((leg) => ({ ...leg, ackMode: 'any' as const, requiredAcks: ['variance'] })),
    signing: true,
  };
  const rig = integratedRig(store, { profiles: [flowProfile] });
  const recordId = await openRecord(rig.handles, CONTENT, FLOW_ID, 'subject:pg-contended');
  store.beforeNextBatch = async () => {
    const raised = await rig.handles.operator.raiseFinding(
      recordId,
      { findingId: 'f-race', kind: 'note', findingDigest: `sha256:${'a'.repeat(64)}` },
      RACE_RAISER,
    );
    assert.equal(raised.status, 'ok', 'fixture: the racing finding genuinely lands');
  };

  const out = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused', 'the batch lost its race');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'record-contended');
  assert.equal(out.transitionRef, undefined, 'never-appends: no edge landed');
  assert.deepEqual(
    (await store.readChain(recordId)).map((t) => t.kind),
    ['opened', 'finding-raised'],
    'only the racing finding is on the chain',
  );

  const lost = store.batches[0];
  assert.ok(lost !== undefined, 'fixture: the batch was handed down');
  assert.equal(
    lost.meta.signatures?.length,
    lost.transitions.length,
    'integrated: the losing batch carried one entry per element down to the store',
  );
  const written = await sidecarDigests(store.signatures, recordId);
  assert.deepEqual(
    written,
    await chainDigests(store, recordId),
    'the sidecar is exactly the chain',
  );
  for (const t of lost.transitions) {
    assert.ok(!written.includes(transitionDigest(t)), `no entry for the losing ${t.kind}`);
  }
  const report = await rig.handles.operator.verifySignatures(recordId);
  assert.deepEqual(report.orphans, [], 'zero orphans');

  const again = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(again.status, 'ok', 'fixture: re-invoked, the seam confirms over the new head');
  assert.deepEqual(
    await sidecarDigests(store.signatures, recordId),
    await chainDigests(store, recordId),
    'the batch that lands writes its entries',
  );
});

test("PostgresStore, integrated — a redemption enlisted in a host client's transaction writes its entry through that client, and the ROLLBACK takes the entry with the transition: no orphan, and the record still redeems, signed", async () => {
  const { store, schema } = pgStore();
  const rig = integratedRig(store, { profiles: [EFFECT_PROFILE] });
  const recordId = await confirmedRecord(rig.handles, 'subject:pg-rollback', EFFECT_ID);
  const committed = await chainDigests(store, recordId);
  assert.deepEqual(
    await sidecarDigests(store.signatures, recordId),
    committed,
    'fixture: the confirmed record is fully signed',
  );

  const client = await sharedPool().connect();
  try {
    await client.query('BEGIN');
    const redeemed = await rig.handles.operator.redeem(recordId, CONTENT, { tx: client });
    assert.equal(
      redeemed.status,
      'ok',
      'fixture: the enlisted redemption lands in the transaction',
    );
    // The store's reads go through the pool and cannot see the open transaction; read the
    // table through the host's own client instead.
    const { rows } = await client.query(
      `SELECT transition_digest FROM "${schema}"."signatures" WHERE record_id = $1`,
      [recordId],
    );
    assert.equal(
      rows.length,
      committed.length + 1,
      'inside the transaction, on its client, the entry is written with the transition',
    );
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }

  assert.deepEqual(await chainDigests(store, recordId), committed, 'the redemption rolled back');
  assert.deepEqual(
    await sidecarDigests(store.signatures, recordId),
    committed,
    'and its entry with it',
  );
  const report = await rig.handles.operator.verifySignatures(recordId);
  assert.deepEqual(report.orphans, [], 'zero orphans: no signature outlived the append');

  const again = await rig.handles.operator.redeem(recordId, CONTENT);
  assert.equal(again.status, 'ok', 'fixture: the record is still confirmed, and redeems');
  assert.deepEqual(
    await sidecarDigests(store.signatures, recordId),
    await chainDigests(store, recordId),
    'the redemption that commits is signed',
  );
});

// === the lazy DDL, and the entry check's place ==============================================

test('PostgresStore: a schema from before the sidecar gains its table on first use — its chain intact and unsigned, and the next append carrying entries writes them', async () => {
  const schema = nextSchemaName();
  const earlier = new PostgresStore(sharedPool(), { schema });
  const genesis = storeGenesis('rec-pg-legacy', 'profile.p1', 'subject:pg-legacy');
  await earlier.appendTransition(null, genesis, { nonTerminal: true });
  // The schema as an earlier build left it: a record on its chain, and no sidecar table.
  await sharedPool().query(`DROP TABLE IF EXISTS "${schema}"."signatures"`);

  const later = new PostgresStore(sharedPool(), { schema });
  assert.deepEqual(await later.readChain('rec-pg-legacy'), [genesis], 'the chain is intact');
  const { rows } = await sharedPool().query(
    'SELECT indexdef FROM pg_indexes WHERE schemaname = $1 AND tablename = $2',
    [schema, 'signatures'],
  );
  assert.ok(rows.length > 0, 'first use created the table');
  assert.ok(
    rows.some((r) => /\(record_id\)/.test(String(r.indexdef))),
    'with its index on record_id',
  );
  assert.deepEqual(
    await later.signatures.listByRecord('rec-pg-legacy'),
    [],
    'and unsigned: first use migrates nothing',
  );

  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  const res = await later.appendTransition(
    'open',
    confirmed,
    signed({ nonTerminal: false }, confirmed),
  );
  assert.equal(res.appended, true, 'fixture: the append lands');
  assert.deepEqual(await later.signatures.listByRecord('rec-pg-legacy'), [entryFor(confirmed)]);
});

test('PostgresStore: a refused meta.signatures names this store, and is checked before any other check — an append that would also have conflicted throws instead', async () => {
  const { store } = pgStore();
  const genesis = storeGenesis('rec-pg-check', 'profile.p1', 'subject:pg-check');
  await assert.rejects(
    () => store.appendTransition(null, genesis, { nonTerminal: true, signatures: [] }),
    /^Error: PostgresStore: meta\.signatures/,
    'a genesis, miscounted',
  );
  assert.equal((await store.appendTransition(null, genesis, { nonTerminal: true })).appended, true);
  await assert.rejects(
    () =>
      store.appendTransition(null, genesis, {
        nonTerminal: true,
        signatures: [{ ...entryFor(genesis), keyRef: 42 } as unknown as SignatureEntry],
      }),
    /PostgresStore: meta\.signatures/,
    'a genesis against an existing record (a state-mismatch), a numeric keyRef',
  );
  const batch = successBatch(genesis);
  await assert.rejects(
    () => store.appendBatch('confirmed', batch, signed({ nonTerminal: false }, ...batch.slice(1))),
    /PostgresStore: meta\.signatures/,
    'a batch against the wrong state (a state-mismatch), one entry short',
  );
  assert.deepEqual(await store.readChain('rec-pg-check'), [genesis], 'nothing applied');
  assert.deepEqual(await store.signatures.listByRecord('rec-pg-check'), []);
});

// === atomicity: the store's own transaction, and an enlisted one ============================
//
// The conformance suite's enlisted pins show the entries ride a HOST transaction. These show
// they ride the store's OWN: a trigger refuses every insert into the sidecar table, so each
// append that carries entries fails at its entry insert — after its transition rows — and the
// store's own ROLLBACK must take those rows with it. An insert moved after the store's COMMIT
// would still reject, but would leave the transition landed, unsigned. The last pin here is the
// enlisted counterpart: the failed insert leaves the host's transaction aborted, so a host that
// commits after the throw lands nothing either.

/** Installs, in `schema`, a trigger that refuses every insert into the sidecar table. The
 * schema must already exist (the store's first use creates it). */
async function refuseEveryEntryInsert(schema: string): Promise<void> {
  await sharedPool().query(`
    CREATE FUNCTION "${schema}".refuse_entry() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'entry insert refused by the test trigger'; END
    $$;
    CREATE TRIGGER refuse_entry BEFORE INSERT ON "${schema}"."signatures"
      FOR EACH ROW EXECUTE FUNCTION "${schema}".refuse_entry();
  `);
}

test("PostgresStore: atomicity on the store's own transaction — an entry insert that fails takes the append's transition rows with it, for a genesis, a subsequent append and a batch", async () => {
  const { store, schema } = pgStore();
  const genesis = storeGenesis('rec-pg-atomic', 'profile.p1', 'subject:pg-atomic');
  // First use runs the DDL. An append carrying no entries inserts none, so the trigger never
  // fires for this one.
  assert.equal((await store.appendTransition(null, genesis, { nonTerminal: true })).appended, true);
  await refuseEveryEntryInsert(schema);

  const other = storeGenesis('rec-pg-atomic-2', 'profile.p1', 'subject:pg-atomic-2');
  await assert.rejects(
    () => store.appendTransition(null, other, signed({ nonTerminal: true }, other)),
    /refused by the test trigger/,
    'a genesis',
  );
  assert.deepEqual(await store.readChain('rec-pg-atomic-2'), [], 'no genesis landed');
  assert.equal(
    await store.findNonTerminal('profile.p1', 'subject:pg-atomic-2'),
    null,
    'nor its record row',
  );

  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  await assert.rejects(
    () => store.appendTransition('open', confirmed, signed({ nonTerminal: false }, confirmed)),
    /refused by the test trigger/,
    'a subsequent append',
  );
  assert.deepEqual(
    await store.readChain('rec-pg-atomic'),
    [genesis],
    'no subsequent append landed',
  );
  const batch = successBatch(genesis);
  await assert.rejects(
    () => store.appendBatch('open', batch, signed({ nonTerminal: false }, ...batch)),
    /refused by the test trigger/,
    'a batch',
  );
  assert.deepEqual(await store.readChain('rec-pg-atomic'), [genesis], 'no batch element landed');
  assert.deepEqual(await store.signatures.listByRecord('rec-pg-atomic'), []);
  assert.deepEqual(await store.signatures.listByRecord('rec-pg-atomic-2'), []);

  // The control: without the trigger the same appends land, with their entries — the record
  // was left `open` and live, exactly where it was.
  await sharedPool().query(`DROP TRIGGER refuse_entry ON "${schema}"."signatures"`);
  const opened = await store.appendTransition(null, other, signed({ nonTerminal: true }, other));
  assert.equal(opened.appended, true, 'the genesis lands');
  const landed = await store.appendBatch('open', batch, signed({ nonTerminal: false }, ...batch));
  assert.equal(landed.appended, true, 'the batch lands');
  assert.deepEqual(
    await sidecarDigests(store.signatures, 'rec-pg-atomic'),
    batch.map((t) => transitionDigest(t)).sort(),
  );
  assert.deepEqual(await store.signatures.listByRecord('rec-pg-atomic-2'), [entryFor(other)]);
});

test("PostgresStore, enlisted: an entry insert that fails leaves the host's transaction aborted — a host that commits after the throw lands neither the transition rows nor the entries", async () => {
  const { store, schema } = pgStore();
  const genesis = storeGenesis('rec-pg-atomic-tx', 'profile.p1', 'subject:pg-atomic-tx');
  assert.equal((await store.appendTransition(null, genesis, { nonTerminal: true })).appended, true);
  await refuseEveryEntryInsert(schema);
  const batch = successBatch(genesis);

  const client = await sharedPool().connect();
  try {
    await client.query('BEGIN');
    await assert.rejects(
      () => store.appendBatch('open', batch, signed({ nonTerminal: false }, ...batch), client),
      /refused by the test trigger/,
      'an enlisted batch',
    );
    await client.query('COMMIT'); // the host commits regardless
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
  assert.deepEqual(
    await store.readChain('rec-pg-atomic-tx'),
    [genesis],
    "the host's commit landed no batch element",
  );
  assert.deepEqual(await store.signatures.listByRecord('rec-pg-atomic-tx'), []);

  await sharedPool().query(`DROP TRIGGER refuse_entry ON "${schema}"."signatures"`);
  const landed = await store.appendBatch('open', batch, signed({ nonTerminal: false }, ...batch));
  assert.equal(landed.appended, true, 'the control: the record was left where it was');
});
