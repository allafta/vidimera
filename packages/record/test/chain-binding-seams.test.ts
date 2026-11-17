// @vidimera/record — chain-binding-seams.test.ts: every VERIFYING load binds the chain it
// read to the recordId it read it for. A storage-writing insider who makes `readChain(X)`
// return record Y's rows must not get Y's history verified as X's, and no library-built edge
// may land on Y.
//
//   - seams: each mutating seam over a relocated X refuses `chain-compromise` and lands its
//     evidence edge on X, addressed to X, leaving Y's chain exactly as it was — at AL1 and
//     AL2, over `MemoryStore` and `SqliteStore`;
//   - the original attack shapes (a Y whose leg makes `content-drift` terminal, a Y past its
//     open deadline, a finding meant for X) now stop at X's chain-verify rung;
//   - cross-record: a relocated prior leg or predecessor is unverified;
//   - audit: the operator `verifyChain(recordId)` wrapper reports the break at seq 1.
//
// The relocation is `RelocatingStore` (helpers/stores.ts), which is NOT a faithful row copy:
// the inner store keeps X's real rows, so an edge built at `seq = length(Y) + 1` lands on X
// only when X's real chain has Y's length. The seam pins therefore build X and Y identically
// and assert that the edge DID land. chain-binding-sqlite.test.ts is the faithful row copy.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import type { ConfirmProfile, LegSpec } from '../src/config.js';
import { create, createWithClock } from '../src/create.js';
import type { Outcome } from '../src/outcome.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import {
  captureProfile,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
  twoLegProfile,
} from './helpers/profiles.js';
import { enforceableSigningSetup } from './helpers/signing.js';
import { RelocatingStore, TamperingStore } from './helpers/stores.js';

type Handles = ReturnType<typeof create>;
type Backing = 'MemoryStore' | 'SqliteStore';
type Level = 'AL1' | 'AL2';

const CONTENT = { subject: 'week-1', total: 40 };
const SUBJECT_X = 'subject:x';
const SUBJECT_Y = 'subject:y';
const D1 = `sha256:${'1'.repeat(64)}`;
const RAISER = { principal: 'checker:1', authority: 'mtls:checker' };

/** captureProfile with the leg's findings flow declared (findings-seams.test.ts's shape). */
function flowProfile(): ConfirmProfile {
  const p = captureProfile({ id: 'test.flow.v1' });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  const declaring: LegSpec = { ...leg, ackMode: 'any', requiredAcks: ['variance'] };
  p.legs[0] = declaring;
  return p;
}

/** A RelocatingStore over the named backing, and handles at the named level. AL2 declares
 * `signing: true` on every profile, so every record's layer is held to its signatures. */
function rig(backing: Backing, level: Level, profiles: ConfirmProfile[]) {
  const inner = backing === 'MemoryStore' ? new MemoryStore() : new SqliteStore(':memory:');
  const store = new RelocatingStore(inner);
  const handles: Handles =
    level === 'AL1'
      ? create(makeConfig(profiles, { store }))
      : enforceableSigningSetup(
          profiles.map((p) => ({ ...p, signing: true })),
          { store },
        ).handles;
  return { inner, store, handles };
}

function assertOk(out: Outcome<unknown>, what: string): void {
  assert.equal(out.status, 'ok', `fixture: ${what} must succeed — ${JSON.stringify(out)}`);
}

/** One mutating seam: the profile its records live under, how a freshly opened record is
 * brought to the state the seam acts on (returning what the call needs, e.g. a token), and
 * the call itself. */
interface SeamCase {
  seam: string;
  profile: () => ConfirmProfile;
  prepare: (h: Handles, recordId: string) => Promise<string | undefined>;
  call: (h: Handles, recordId: string, prepared: string | undefined) => Promise<Outcome<unknown>>;
}

async function confirm(h: Handles, recordId: string): Promise<undefined> {
  assertOk(await h.operator.finalize(recordId, identity(), CONTENT, facts()), 'finalize');
  return undefined;
}

async function raiseOne(h: Handles, recordId: string): Promise<undefined> {
  assertOk(
    await h.operator.raiseFinding(
      recordId,
      { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
      RAISER,
    ),
    'raiseFinding',
  );
  return undefined;
}

const SEAMS: SeamCase[] = [
  {
    seam: 'finalize',
    profile: () => captureProfile(),
    prepare: async () => undefined,
    call: (h, id) => h.operator.finalize(id, identity(), CONTENT, facts()),
  },
  {
    // `decline: true` on the leg: the honest seam is reachable at all only on a declaring leg.
    seam: 'decline',
    profile: () => captureProfile({ decline: true }),
    prepare: async () => undefined,
    call: (h, id) => h.operator.decline(id, identity(), CONTENT, facts()),
  },
  {
    seam: 'raiseFinding',
    profile: flowProfile,
    prepare: async () => undefined,
    call: (h, id) =>
      h.operator.raiseFinding(
        id,
        { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
        RAISER,
      ),
  },
  {
    seam: 'acknowledge',
    profile: flowProfile,
    prepare: raiseOne,
    call: (h, id) =>
      h.operator.acknowledge(id, { findingId: 'f-1', findingDigest: D1 }, identity()),
  },
  {
    seam: 'seal',
    profile: () => captureProfile(),
    prepare: confirm,
    call: (h, id) => h.operator.seal(id),
  },
  {
    seam: 'redeem',
    profile: () => effectSeamProfile(),
    prepare: confirm,
    call: (h, id) => h.operator.redeem(id, CONTENT),
  },
  {
    seam: 'beginRedemption',
    profile: () => effectSeamProfile(),
    prepare: confirm,
    call: (h, id) => h.operator.beginRedemption(id, CONTENT),
  },
  {
    seam: 'completeRedemption',
    profile: () => effectSeamProfile(),
    prepare: async (h, id) => {
      await confirm(h, id);
      const begun = await h.operator.beginRedemption(id, CONTENT);
      if (begun.status !== 'ok') throw new Error(`fixture: beginRedemption ${begun.status}`);
      return begun.value.token;
    },
    call: (h, id, token) => {
      if (token === undefined) throw new Error('fixture: a redeeming record carries a token');
      return h.operator.completeRedemption(id, token, CONTENT);
    },
  },
];

// === seams ===========================================================================

for (const c of SEAMS) {
  for (const backing of ['MemoryStore', 'SqliteStore'] as const) {
    for (const level of ['AL1', 'AL2'] as const) {
      test(`${c.seam} over a relocated record refuses chain-compromise and lands its edge on that record (${backing}, ${level})`, async () => {
        const profile = c.profile();
        const { inner, store, handles } = rig(backing, level, [profile]);
        const x = await openRecord(handles, CONTENT, profile.id, SUBJECT_X);
        const y = await openRecord(handles, CONTENT, profile.id, SUBJECT_Y);
        const preparedX = await c.prepare(handles, x);
        await c.prepare(handles, y);

        const xBefore = await inner.readChain(x);
        const yBefore = await inner.readChain(y);
        assert.equal(xBefore.length, yBefore.length, 'fixture: X and Y have equal lengths');

        store.relocate(x, y);
        const out = await c.call(handles, x, preparedX);

        assert.equal(out.status, 'refused');
        if (out.status !== 'refused') return;
        assert.equal(out.code, 'chain-compromise');
        assert.ok(out.transitionRef !== undefined, 'the evidence edge landed');

        const xAfter = await inner.readChain(x);
        assert.equal(xAfter.length, xBefore.length + 1, "X's own chain grew by one");
        const last = xAfter.at(-1);
        assert.ok(last !== undefined);
        assert.equal(last.recordId, x, 'the edge is addressed to X');
        assert.equal(last.kind, 'refused');
        assert.deepEqual(last.payload, { code: 'chain-compromise' });
        assert.equal(out.transitionRef, transitionDigest(last));
        assert.deepEqual(await inner.readChain(y), yBefore, "Y's chain is untouched");
      });
    }
  }
}

test('relocation from a longer chain refuses chain-compromise and leaves Y untouched', async () => {
  // Y carries one more transition than X (a raised finding). Under RelocatingStore the edge
  // built at `seq = length(Y) + 1` cannot land on X's shorter real chain, so this pins the
  // outcome and Y, not the edge — the row-copy pin in chain-binding-sqlite.test.ts lands it.
  const profile = flowProfile();
  const { inner, store, handles } = rig('MemoryStore', 'AL1', [profile]);
  const x = await openRecord(handles, CONTENT, profile.id, SUBJECT_X);
  const y = await openRecord(handles, CONTENT, profile.id, SUBJECT_Y);
  await raiseOne(handles, y);
  const yBefore = await inner.readChain(y);
  assert.equal(yBefore.length, (await inner.readChain(x)).length + 1, 'fixture: Y is longer');

  store.relocate(x, y);
  const out = await handles.operator.finalize(x, identity(), CONTENT, facts());

  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.deepEqual(await inner.readChain(y), yBefore);
});

test('an enlisted redeem over a relocated record refuses chain-compromise with no edge', async () => {
  const sqlite = new SqliteStore(':memory:');
  const store = new RelocatingStore(sqlite);
  const profile = effectSeamProfile();
  const handles = create(makeConfig([profile], { store }));
  const x = await openRecord(handles, CONTENT, profile.id, SUBJECT_X);
  const y = await openRecord(handles, CONTENT, profile.id, SUBJECT_Y);
  await confirm(handles, x);
  await confirm(handles, y);
  const xBefore = await sqlite.readChain(x);
  const yBefore = await sqlite.readChain(y);

  store.relocate(x, y);
  sqlite.database.exec('BEGIN IMMEDIATE');
  const out = await handles.operator.redeem(x, CONTENT, { tx: sqlite.database });
  assert.equal(sqlite.database.isTransaction, true, "the host's transaction is still open");
  sqlite.database.exec('COMMIT');

  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.equal(out.transitionRef, undefined, 'no edge — the enlisted call appends nothing');
  assert.deepEqual(await sqlite.readChain(x), xBefore, 'X is untouched');
  assert.deepEqual(await sqlite.readChain(y), yBefore, 'Y is untouched');
});

// --- the original attack shapes now stop at X's chain-verify rung ---------------------

test('attack shape: X relocated from a Y whose leg makes content-drift terminal refuses chain-compromise; Y untouched', async () => {
  const profile = captureProfile({ terminalRefusals: ['content-drift'] });
  const { inner, store, handles } = rig('MemoryStore', 'AL1', [profile]);
  const contentX = { subject: 'week-1', total: 40 };
  const contentY = { subject: 'week-2', total: 41 };
  const x = await openRecord(handles, contentX, profile.id, SUBJECT_X);
  const y = await openRecord(handles, contentY, profile.id, SUBJECT_Y);
  const yBefore = await inner.readChain(y);

  store.relocate(x, y);
  // X's OWN content: against Y's chain it would drift, and the leg would make that terminal.
  const out = await handles.operator.finalize(x, identity(), contentX, facts());

  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.deepEqual(await inner.readChain(y), yBefore);
});

test('attack shape: X relocated from a Y past its open deadline refuses chain-compromise; Y untouched', async () => {
  const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);
  const clock = { t: T0 };
  const store = new RelocatingStore(new MemoryStore());
  const profile = captureProfile({ ttl: 60 });
  const handles = createWithClock(makeConfig([profile], { store }), () => new Date(clock.t));
  const y = await openRecord(handles, CONTENT, profile.id, SUBJECT_Y);
  clock.t = T0 + 30_000;
  const x = await openRecord(handles, CONTENT, profile.id, SUBJECT_X);
  clock.t = T0 + 61_000; // Y's deadline (T0 + 60s) has passed; X's (T0 + 90s) has not
  const yBefore = await store.inner.readChain(y);

  store.relocate(x, y);
  const out = await handles.operator.finalize(x, identity(), CONTENT, facts());

  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.deepEqual(await store.inner.readChain(y), yBefore);
});

test('attack shape: raiseFinding on a relocated X refuses chain-compromise; Y untouched', async () => {
  const profile = flowProfile();
  const { inner, store, handles } = rig('MemoryStore', 'AL1', [profile]);
  const x = await openRecord(handles, CONTENT, profile.id, SUBJECT_X);
  const y = await openRecord(handles, CONTENT, profile.id, SUBJECT_Y);
  const yBefore = await inner.readChain(y);

  store.relocate(x, y);
  const out = await handles.operator.raiseFinding(
    x,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );

  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.deepEqual(await inner.readChain(y), yBefore);
});

// === cross-record ====================================================================

test('verifyPriorLegs refuses a relocated prior leg', async () => {
  const profile = twoLegProfile();
  const { store, handles } = rig('MemoryStore', 'AL1', [profile]);
  const m = await openRecord(handles, CONTENT, profile.id, SUBJECT_X, 'maker-decide');
  await confirm(handles, m);
  const head = await handles.operator.chainHead(m);
  assert.ok(head !== null);

  store.relocate('rec-ghost', m);
  const staged = await handles.agent.stage(CONTENT, profile.id, SUBJECT_X, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;

  const ghost = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: 'rec-ghost', chainHead: head }],
  });
  assert.equal(ghost.status, 'refused');
  if (ghost.status !== 'refused') return;
  assert.equal(ghost.code, 'prior-leg-unverified');

  // The control: the same claim under the prior leg's own id opens.
  const real = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: m, chainHead: head }],
  });
  assert.equal(real.status, 'ok');
});

test('verifySupersedes refuses a relocated predecessor', async () => {
  const profile = captureProfile({ decline: true });
  const { store, handles } = rig('MemoryStore', 'AL1', [profile]);
  const p = await openRecord(handles, CONTENT, profile.id, SUBJECT_X);
  assertOk(await handles.operator.decline(p, identity(), CONTENT, facts()), 'decline');
  const head = await handles.operator.chainHead(p);
  assert.ok(head !== null);

  store.relocate('rec-ghost', p);
  const staged = await handles.agent.stage(CONTENT, profile.id, SUBJECT_X);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;

  const ghost = await handles.operator.open(staged.value.stagedRef, {
    supersedes: { recordId: 'rec-ghost', chainHead: head },
  });
  assert.equal(ghost.status, 'refused');
  if (ghost.status !== 'refused') return;
  assert.equal(ghost.code, 'supersedes-unverified');

  // The control: the same claim under the predecessor's own id opens.
  const real = await handles.operator.open(staged.value.stagedRef, {
    supersedes: { recordId: p, chainHead: head },
  });
  assert.equal(real.status, 'ok');
});

// === audit ===========================================================================

test('operator verifyChain reports a relocated record as a break at seq 1', async () => {
  const profile = captureProfile();
  const { store, handles } = rig('MemoryStore', 'AL1', [profile]);
  const x = await openRecord(handles, CONTENT, profile.id, SUBJECT_X);
  const y = await openRecord(handles, CONTENT, profile.id, SUBJECT_Y);

  store.relocate(x, y);
  const report = await handles.operator.verifyChain(x);
  assert.equal(report.intact, false);
  if (report.intact) return;
  assert.equal(report.firstBreakSeq, 1);
  assert.ok(report.detail.includes(x), 'the detail names the requested id');
  assert.ok(report.detail.includes(y), 'the detail names the id found');
  assert.deepEqual(await handles.operator.verifyChain(y), { intact: true }, 'Y itself verifies');
});

// === reads ===========================================================================
// The NON-verifying loads (`getRecord`, `replay`, `review`, `verifySignatures`, `open()`'s
// blocker read) cannot refuse `chain-compromise` — they verify nothing. A chain whose rows
// carry another record's id is foreign persisted data, a storage fault, so they throw
// (SPEC §8's loud-throw posture) and record nothing. An EMPTY chain keeps its old behavior.

const FOREIGN = /foreign persisted data/;

test('getRecord throws on a relocated record, on both handles', async () => {
  const profile = captureProfile();
  const { store, handles } = rig('MemoryStore', 'AL1', [profile]);
  const x = await openRecord(handles, CONTENT, profile.id, SUBJECT_X);
  const y = await openRecord(handles, CONTENT, profile.id, SUBJECT_Y);
  store.relocate(x, y);
  await assert.rejects(handles.operator.getRecord(x), FOREIGN);
  await assert.rejects(handles.agent.getRecord(x), FOREIGN);
  assert.equal((await handles.operator.getRecord(y))?.id, y, 'Y itself still reads');
});

test('replay, review and verifySignatures throw on a relocated record', async () => {
  const profile = { ...captureProfile(), signing: true as const };
  const { store, handles } = rig('MemoryStore', 'AL2', [profile]);
  const x = await openRecord(handles, CONTENT, profile.id, SUBJECT_X);
  const y = await openRecord(handles, CONTENT, profile.id, SUBJECT_Y);
  store.relocate(x, y);
  await assert.rejects(handles.operator.replay(x), FOREIGN);
  await assert.rejects(handles.operator.review(x), FOREIGN);
  // FOURTEENTH SELF-AUTHORED INVERSION — `verifySignatures` used to throw "only on the
  // caller-error/unknown-record class every other read takes" (its doc comment, and the
  // implementation status's §14 row). It now also throws on foreign persisted data. The
  // recorded stance's own parallel — "every other read" — is KEPT, not abandoned: every other
  // read (`getRecord`, `replay`, `review`, `open()`'s blocker read) now throws on foreign data
  // too, so verifySignatures is still exactly as strict as they are, and the class widens for
  // all of them together. Without this the audit would describe another record's transitions
  // under X's name. It stays a read: it appends nothing and still never throws on a
  // verification failure — only on a chain that is not the requested record's at all.
  await assert.rejects(handles.operator.verifySignatures(x), FOREIGN);
  assert.equal((await handles.operator.verifySignatures(y)).recordId, y, 'Y itself reports');
});

test('a mixed chain makes every read throw', async () => {
  const profile = captureProfile();
  const inner = new MemoryStore();
  const plain = create(makeConfig([profile], { store: inner }));
  const x = await openRecord(plain, CONTENT, profile.id, SUBJECT_X);
  const y = await openRecord(plain, CONTENT, profile.id, SUBJECT_Y);
  assertOk(await plain.operator.finalize(x, identity(), CONTENT, facts()), 'finalize X');
  // Row 2 of X's chain claims to be Y's: a chain that is only partly the requested record's.
  const handles = create(
    makeConfig([profile], {
      store: new TamperingStore(inner, x, (chain) =>
        chain.map((t) => (t.seq === 2 ? { ...t, recordId: y } : t)),
      ),
    }),
  );
  await assert.rejects(handles.operator.getRecord(x), FOREIGN);
  await assert.rejects(handles.agent.getRecord(x), FOREIGN);
  await assert.rejects(handles.operator.replay(x), FOREIGN);
  await assert.rejects(handles.operator.review(x), FOREIGN);
});

test('empty chains keep their behavior', async () => {
  const profile = { ...captureProfile(), signing: true as const };
  const { handles } = rig('MemoryStore', 'AL2', [profile]);
  assert.equal(await handles.operator.getRecord('rec-none'), null);
  for (const call of [
    handles.operator.replay('rec-none'),
    handles.operator.review('rec-none'),
    handles.operator.verifySignatures('rec-none'),
  ]) {
    await assert.rejects(call, (e: Error) => !FOREIGN.test(e.message));
  }
});

test('open() throws on a relocated blocker and appends nothing', async () => {
  const profile = captureProfile({ ttl: 3600 });
  const inner = new MemoryStore();
  const store = new RelocatingStore(inner);
  let now = new Date('2026-07-24T00:00:00.000Z');
  const handles = createWithClock(makeConfig([profile], { store }), () => now);
  const b = await openRecord(handles, CONTENT, profile.id, 'subject:s');
  const z = await openRecord(handles, CONTENT, profile.id, 'subject:z');
  now = new Date('2026-07-24T02:00:00.000Z'); // past both open windows
  const bBefore = await inner.readChain(b);
  const zBefore = await inner.readChain(z);
  store.relocate(b, z);

  const staged = await handles.agent.stage(CONTENT, profile.id, 'subject:s');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  await assert.rejects(handles.operator.open(staged.value.stagedRef), FOREIGN);
  assert.deepEqual(await inner.readChain(b), bBefore, "B's chain is unchanged");
  assert.deepEqual(await inner.readChain(z), zBefore, "Z's chain is unchanged");
});
