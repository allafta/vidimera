// @vidimera/record — test/faults-and-races.test.ts: a fault throws, and the loser of an honest
// race is told what re-invoking would tell it.
//
// The groups of pins:
//   - the redemption seams, their shared clock rung, the reverify `content-drift` edge and
//     `seal`: a `'seq'` conflict has no honest producer there (every CAS target is a state each
//     legitimate competing append leaves, and every backing checks state before seq), so it
//     throws a storage fault that says nothing was appended — the chain is unchanged and the
//     same call then succeeds. A lost CAS whose re-read rejects, or comes back holding another
//     record's rows, throws with that failure as `cause`, where it used to answer
//     `unredeemable-state`. Enlisted on SqliteStore, the host's transaction stays open and
//     usable, and an unmoved re-read answers `unredeemable-state` rather than throwing (the
//     enlisted-read limit, deferral-register row 23). A racing seal still refuses
//     `unsealable-state`;
//   - `finalize`, `decline` and `raiseFinding` losing their clock CAS: the open window answers
//     `record-not-open` when a racer decided the record and `leg-expired` when it only took the
//     seq; the confirmed window answers `leg-expired` when a racer expired the record; a `'seq'`
//     on the confirmed window throws; a failed re-read throws with `cause`;
//   - `raiseFinding` and `acknowledge` losing their OWN append's state check: a racer that
//     expired the record gives `leg-expired`, one that confirmed or declined it
//     `record-not-open`, and no racer at all (the record still open) throws; an `exclusivity`
//     conflict there throws;
//   - `open()` with a blocker that is already terminal when it is read: the pair is free, so the
//     single retry runs and opens the record; `record-exists` only when the retry's own C1 names a
//     live blocker. A blocker a racer moved to another non-terminal state still answers
//     `record-exists` with one genesis attempt;
//   - `open()`'s single retry: a conflict other than exclusivity throws; a failure after this call
//     expired the blocker throws an error naming that blocker, whose edge stands, with the store's
//     error as `cause` — on MemoryStore and SqliteStore — while a failure after this call appended
//     nothing propagates unchanged;
//   - `open()`'s own expiry of a due blocker: a `'seq'` on a confirmed blocker's edge and an
//     `exclusivity` conflict throw and append nothing; a `'seq'` on an open blocker (a finding
//     landed) and an unmoved state-mismatch still answer `record-exists`, inside the owner-gated
//     item (characterizations);
//   - `operator.listDue()`: a store (or clock) that throws synchronously rejects;
//   - the findings seams on a due-confirmed record: a characterization of SPEC §4's lazy
//     resolution at those seams, unchanged by this file.
// The admission pins (a stray `result` on a due record) live in effect-result.test.ts.
//
// The inherited exclusivity pin for a lost own-expire CAS in `open()` (record-exists, one genesis
// attempt) is untouched and still green in exclusivity.test.ts.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import type { ConfirmProfile } from '../src/config.js';
import { create, createWithClock } from '../src/create.js';
import type { Outcome } from '../src/outcome.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import type { AppendMeta, AppendResult, BatchResult, Store } from '../src/store/store.js';
import type { Digest, RecordState, StagedDraft, Transition, TransitionKind } from '../src/types.js';
import { storeNext } from './helpers/chain.js';
import {
  captureProfile,
  effectSeamProfile,
  facts,
  identity,
  liveProfile,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const DRIFTED = { subject: 'week-1', total: 43 };
const D1 = `sha256:${'1'.repeat(64)}`;
const RAISER = { principal: 'checker:1', authority: 'mtls:checker' };
const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);
const HOUR = 3600_000;
const SEQ: AppendResult = { appended: false, conflict: 'seq' };
const LOST: AppendResult = { appended: false, conflict: 'state-mismatch' };

type Handles = ReturnType<typeof create>;
type Clock = { t: number };

// --- the rig ---------------------------------------------------------------------------------

type AppendHook = (
  expected: RecordState | null,
  t: Transition,
  meta: AppendMeta,
  tx: unknown,
) => Promise<AppendResult | undefined>;

/**
 * A Store wrapper over any backing. `onAppend` runs before every append and may return a result
 * that short-circuits it (the inner store never sees the call) or `undefined` to let it through;
 * `onRead`, when set, replaces `readChain`. Every `tx` is passed through, so an enlisted call
 * reaches a SqliteStore's own validation unchanged. `genesisAttempts` counts every append whose
 * expected state is `null`.
 */
class Rig implements Store {
  genesisAttempts = 0;
  onAppend: AppendHook | undefined;
  onRead: ((recordId: string) => Promise<Transition[]>) | undefined;
  constructor(readonly inner: Store) {}
  putStaged(s: StagedDraft, tx?: unknown): Promise<void> {
    return this.inner.putStaged(s, tx);
  }
  getStaged(r: string): Promise<StagedDraft | null> {
    return this.inner.getStaged(r);
  }
  chainHead(r: string): Promise<Digest | null> {
    return this.inner.chainHead(r);
  }
  async appendTransition(
    e: RecordState | null,
    t: Transition,
    m: AppendMeta,
    tx?: unknown,
  ): Promise<AppendResult> {
    if (e === null) this.genesisAttempts += 1;
    const hook = this.onAppend;
    if (hook !== undefined) {
      const short = await hook(e, t, m, tx);
      if (short !== undefined) return short;
    }
    return this.inner.appendTransition(e, t, m, tx);
  }
  appendBatch(
    e: RecordState,
    ts: readonly Transition[],
    m: AppendMeta,
    tx?: unknown,
  ): Promise<BatchResult> {
    return this.inner.appendBatch(e, ts, m, tx);
  }
  readChain(r: string): Promise<Transition[]> {
    const hook = this.onRead;
    return hook === undefined ? this.inner.readChain(r) : hook(r);
  }
  listDue(now: Date): Promise<string[]> {
    return this.inner.listDue(now);
  }
  findNonTerminal(p: string, s: string): Promise<string | null> {
    return this.inner.findNonTerminal(p, s);
  }
}

/** The FIRST append matching `match` runs `run` once; a defined result short-circuits it. */
function armOnce(
  rig: Rig,
  match: (expected: RecordState | null, t: Transition) => boolean,
  run: (t: Transition) => Promise<AppendResult | undefined>,
): void {
  rig.onAppend = async (e, t) => {
    if (!match(e, t)) return undefined;
    rig.onAppend = undefined;
    return run(t);
  };
}

/** A racer's edge, landed straight on the backing (never through the rig). */
async function land(
  store: Store,
  recordId: string,
  expected: RecordState,
  kind: TransitionKind,
  payload: unknown,
  nonTerminal = false,
): Promise<void> {
  const head = (await store.readChain(recordId)).at(-1);
  if (head === undefined) throw new Error('fixture: the chain has a head');
  const res = await store.appendTransition(expected, storeNext(head, kind, payload), {
    nonTerminal,
  });
  assert.ok(res.appended, `fixture: the racer's ${kind} lands`);
}

function on(store: Store, profiles: ConfirmProfile[], clock: Clock): Handles {
  return createWithClock(makeConfig(profiles, { store }), () => new Date(clock.t));
}

function kinds(chain: readonly Transition[]): string[] {
  return chain.map((t) => t.kind);
}

function refusedWith(out: Outcome<unknown>, code: string): void {
  assert.equal(out.status, 'refused', `expected a ${code} refusal, got ${JSON.stringify(out)}`);
  if (out.status === 'refused') assert.equal(out.code, code);
}

/** The storage fault a conflict with no honest producer throws: the chain must be unchanged. */
async function assertSeqFault(
  seam: string,
  call: () => Promise<unknown>,
  store: Store,
  recordId: string,
): Promise<void> {
  const before = await store.readChain(recordId);
  await assert.rejects(call, (err: unknown) => {
    assert.ok(err instanceof Error, 'the thrown value is an Error');
    assert.match(err.message, new RegExp(`^${seam}: append conflict \\('seq'\\)`));
    assert.match(err.message, /storage fault/);
    assert.match(err.message, /nothing was appended and the record is unchanged/);
    return true;
  });
  assert.deepEqual(await store.readChain(recordId), before, `${seam}: the chain is unchanged`);
}

/**
 * A `state-mismatch` with no racer: the re-read finds the record still in `target`, the state
 * the append expected — the storage fault, and the chain unchanged.
 */
async function assertUnmovedFault(
  seam: string,
  target: RecordState,
  call: () => Promise<unknown>,
  store: Store,
  recordId: string,
): Promise<void> {
  const before = await store.readChain(recordId);
  await assert.rejects(call, (err: unknown) => {
    assert.ok(err instanceof Error, 'the thrown value is an Error');
    assert.match(err.message, new RegExp(`^${seam}: append conflict \\('state-mismatch'\\)`));
    assert.ok(err.message.includes(`still '${target}'`), `names the unmoved '${target}'`);
    assert.match(err.message, /storage fault/);
    assert.match(err.message, /nothing was appended and the record is unchanged/);
    return true;
  });
  assert.deepEqual(await store.readChain(recordId), before, `${seam}: the chain is unchanged`);
}

/** A lost CAS whose re-read failed: thrown, naming the seam, with the failure as `cause`. */
function lostReadFault(seam: string, cause: (c: unknown) => void) {
  return (err: unknown): true => {
    assert.ok(err instanceof Error, 'the thrown value is an Error');
    assert.match(err.message, new RegExp(`^${seam}: `));
    assert.match(err.message, /lost its compare-and-swap/);
    assert.match(err.message, /appended nothing/);
    cause(err.cause);
    return true;
  };
}

const READ_DOWN = new Error('store dead: connection lost');

/** The two ways the re-read can fail: it rejects, or it returns another record's rows. */
type ReadFailure = 'rejects' | 'foreign';
const READ_FAILURES: ReadFailure[] = ['rejects', 'foreign'];

function failReads(rig: Rig, how: ReadFailure, foreignId: string): void {
  rig.onRead =
    how === 'rejects' ? () => Promise.reject(READ_DOWN) : () => rig.inner.readChain(foreignId);
}

function causeOf(how: ReadFailure): (c: unknown) => void {
  return how === 'rejects'
    ? (c) => assert.equal(c, READ_DOWN, 'the re-read rejection rides as the cause')
    : (c) => {
        assert.ok(c instanceof Error, 'the foreign-chain throw rides as the cause');
        assert.match(c.message, /foreign persisted data/);
      };
}

// --- fixtures --------------------------------------------------------------------------------

/** An effect-seam record confirmed at the clock's current instant, over `store`. */
async function confirmedEffect(store: Store, clock: Clock, subject = 'subject:fr-1') {
  const handles = on(store, [effectSeamProfile()], clock);
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', subject);
  assertOk(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  return { handles, recordId };
}

function assertOk(out: Outcome<unknown>): void {
  assert.equal(out.status, 'ok', `fixture: expected ok, got ${JSON.stringify(out)}`);
}

async function begun(handles: Handles, recordId: string): Promise<string> {
  const out = await handles.operator.beginRedemption(recordId, CONTENT);
  if (out.status !== 'ok') throw new Error(`fixture: beginRedemption ${JSON.stringify(out)}`);
  return out.value.token;
}

const CONFIRM_MS = (effectSeamProfile().redeem?.confirmToRedeem ?? 0) * 1000;
const REDEEM_MS = (effectSeamProfile().redeem?.redeemBound ?? 0) * 1000;

function rederive() {
  return {
    consultations: [
      {
        kind: 'rederive',
        checker: { principal: 'svc:rederive', authority: 'mtls:rederive' },
        payloadDigest: `sha256:${'d'.repeat(64)}`,
        verdict: 'pass' as const,
      },
    ],
  };
}

async function confirmedLive(store: Store, clock: Clock, subject = 'subject:fr-live') {
  const handles = on(store, [liveProfile()], clock);
  const recordId = await openRecord(handles, CONTENT, 'test.live.v1', subject);
  assertOk(await handles.operator.finalize(recordId, identity(), CONTENT, facts(), rederive()));
  return { handles, recordId };
}

// ============================================================================================
// The redemption seams, their clock rung, the reverify edge and seal: a 'seq' conflict throws
// ============================================================================================

test("redeem: a 'seq' conflict on the redeemed append throws a storage fault, appends nothing, and the same call then succeeds", async () => {
  const clock = { t: T0 };
  const rig = new Rig(new MemoryStore());
  const { handles, recordId } = await confirmedEffect(rig, clock);
  armOnce(
    rig,
    (e, t) => e === 'confirmed' && t.kind === 'redeemed',
    async () => SEQ,
  );
  await assertSeqFault(
    'redeem',
    () => handles.operator.redeem(recordId, CONTENT),
    rig.inner,
    recordId,
  );
  assertOk(await handles.operator.redeem(recordId, CONTENT));
});

test("beginRedemption: a 'seq' conflict on the redeeming append throws a storage fault, appends nothing, and the same call then succeeds", async () => {
  const clock = { t: T0 };
  const rig = new Rig(new MemoryStore());
  const { handles, recordId } = await confirmedEffect(rig, clock);
  armOnce(
    rig,
    (e, t) => e === 'confirmed' && t.kind === 'redeeming',
    async () => SEQ,
  );
  await assertSeqFault(
    'beginRedemption',
    () => handles.operator.beginRedemption(recordId, CONTENT),
    rig.inner,
    recordId,
  );
  assertOk(await handles.operator.beginRedemption(recordId, CONTENT));
});

test("completeRedemption: a 'seq' conflict on the redeemed append throws a storage fault, appends nothing, and the same call then succeeds", async () => {
  const clock = { t: T0 };
  const rig = new Rig(new MemoryStore());
  const { handles, recordId } = await confirmedEffect(rig, clock);
  const token = await begun(handles, recordId);
  armOnce(
    rig,
    (e, t) => e === 'redeeming' && t.kind === 'redeemed',
    async () => SEQ,
  );
  await assertSeqFault(
    'completeRedemption',
    () => handles.operator.completeRedemption(recordId, token, CONTENT),
    rig.inner,
    recordId,
  );
  assertOk(await handles.operator.completeRedemption(recordId, token, CONTENT));
});

test("the reverify content-drift edge: a 'seq' conflict throws a storage fault, appends nothing, and the same call then lands the edge", async () => {
  const clock = { t: T0 };
  const rig = new Rig(new MemoryStore());
  const { handles, recordId } = await confirmedLive(rig, clock);
  armOnce(
    rig,
    (e, t) => e === 'confirmed' && t.kind === 'refused',
    async () => SEQ,
  );
  await assertSeqFault(
    'redeem',
    () => handles.operator.redeem(recordId, DRIFTED),
    rig.inner,
    recordId,
  );
  const again = await handles.operator.redeem(recordId, DRIFTED);
  refusedWith(again, 'content-drift');
  assert.ok(again.status === 'refused' && again.transitionRef !== undefined, 'the edge lands');
});

test("the redemption clock rung: a 'seq' conflict on the resolution edge throws a storage fault, appends nothing, and the same call then resolves", async () => {
  for (const seam of ['redeem', 'beginRedemption'] as const) {
    const clock = { t: T0 };
    const rig = new Rig(new MemoryStore());
    const { handles, recordId } = await confirmedEffect(rig, clock);
    clock.t = T0 + CONFIRM_MS + 10_000;
    armOnce(
      rig,
      (e, t) => e === 'confirmed' && t.kind === 'expired',
      async () => SEQ,
    );
    const call = () => handles.operator[seam](recordId, CONTENT);
    await assertSeqFault(seam, call, rig.inner, recordId);
    refusedWith(await call(), 'unredeemable-state');
    assert.equal((await rig.inner.readChain(recordId)).at(-1)?.kind, 'expired');
  }
  // The redeeming window's own resolution edge, at completeRedemption.
  const clock = { t: T0 };
  const rig = new Rig(new MemoryStore());
  const { handles, recordId } = await confirmedEffect(rig, clock);
  const token = await begun(handles, recordId);
  clock.t += REDEEM_MS + 10_000;
  armOnce(
    rig,
    (e, t) => e === 'redeeming' && t.kind === 'redemption-failed',
    async () => SEQ,
  );
  const call = () => handles.operator.completeRedemption(recordId, token, CONTENT);
  await assertSeqFault('completeRedemption', call, rig.inner, recordId);
  refusedWith(await call(), 'redemption-timeout');
});

test("seal: a 'seq' conflict on the sealed append throws a storage fault, appends nothing, and the same call then seals", async () => {
  const clock = { t: T0 };
  const rig = new Rig(new MemoryStore());
  const handles = on(rig, [captureProfile()], clock);
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', 'subject:fr-seal');
  assertOk(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  armOnce(
    rig,
    (_e, t) => t.kind === 'sealed',
    async () => SEQ,
  );
  await assertSeqFault('seal', () => handles.operator.seal(recordId), rig.inner, recordId);
  assertOk(await handles.operator.seal(recordId));
});

test('seal: a racing seal still loses to C4 and refuses unsealable-state, appending nothing', async () => {
  const clock = { t: T0 };
  const rig = new Rig(new MemoryStore());
  const handles = on(rig, [captureProfile()], clock);
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', 'subject:fr-seal-2');
  assertOk(await handles.operator.finalize(recordId, identity(), CONTENT, facts()));
  armOnce(
    rig,
    (_e, t) => t.kind === 'sealed',
    async () => {
      const head = (await rig.inner.readChain(recordId)).at(-1);
      if (head === undefined) throw new Error('fixture: a head');
      await land(rig.inner, recordId, 'confirmed', 'sealed', { chainHead: transitionDigest(head) });
      return undefined;
    },
  );
  refusedWith(await handles.operator.seal(recordId), 'unsealable-state');
  const chain = await rig.inner.readChain(recordId);
  assert.equal(chain.filter((t) => t.kind === 'sealed').length, 1, 'only the winner sealed');
});

// ============================================================================================
// The redemption residual: a state-mismatch at a state that never moved throws
// ============================================================================================

/** Each residual call site, its CAS target, and what the same call answers once unarmed. */
interface UnmovedSite {
  name: string;
  seam: 'redeem' | 'beginRedemption' | 'completeRedemption';
  target: 'confirmed' | 'redeeming';
  /** Sets the record up over `rig` and returns the call, its append predicate and a check. */
  setup(
    rig: Rig,
    clock: Clock,
  ): Promise<{
    recordId: string;
    call: () => Promise<Outcome<unknown>>;
    match: (e: RecordState | null, t: Transition) => boolean;
    again: (out: Outcome<unknown>) => Promise<void>;
  }>;
}

const UNMOVED_SITES: UnmovedSite[] = [
  {
    name: 'redeem (its own append)',
    seam: 'redeem',
    target: 'confirmed',
    async setup(rig, clock) {
      const { handles, recordId } = await confirmedEffect(rig, clock);
      return {
        recordId,
        call: () => handles.operator.redeem(recordId, CONTENT),
        match: (e, t) => e === 'confirmed' && t.kind === 'redeemed',
        again: async (out) => assertOk(out),
      };
    },
  },
  {
    name: 'beginRedemption (its own append)',
    seam: 'beginRedemption',
    target: 'confirmed',
    async setup(rig, clock) {
      const { handles, recordId } = await confirmedEffect(rig, clock);
      return {
        recordId,
        call: () => handles.operator.beginRedemption(recordId, CONTENT),
        match: (e, t) => e === 'confirmed' && t.kind === 'redeeming',
        again: async (out) => assertOk(out),
      };
    },
  },
  {
    name: 'completeRedemption (its own append)',
    seam: 'completeRedemption',
    target: 'redeeming',
    async setup(rig, clock) {
      const { handles, recordId } = await confirmedEffect(rig, clock);
      const token = await begun(handles, recordId);
      return {
        recordId,
        call: () => handles.operator.completeRedemption(recordId, token, CONTENT),
        match: (e, t) => e === 'redeeming' && t.kind === 'redeemed',
        again: async (out) => assertOk(out),
      };
    },
  },
  {
    name: 'the clock rung (a due confirmed window)',
    seam: 'redeem',
    target: 'confirmed',
    async setup(rig, clock) {
      const { handles, recordId } = await confirmedEffect(rig, clock);
      clock.t = T0 + CONFIRM_MS + 10_000;
      return {
        recordId,
        call: () => handles.operator.redeem(recordId, CONTENT),
        match: (e, t) => e === 'confirmed' && t.kind === 'expired',
        again: async (out) => {
          refusedWith(out, 'unredeemable-state');
          assert.equal((await rig.inner.readChain(recordId)).at(-1)?.kind, 'expired');
        },
      };
    },
  },
  {
    name: 'the clock rung (a due redeeming window)',
    seam: 'completeRedemption',
    target: 'redeeming',
    async setup(rig, clock) {
      const { handles, recordId } = await confirmedEffect(rig, clock);
      const token = await begun(handles, recordId);
      clock.t += REDEEM_MS + 10_000;
      return {
        recordId,
        call: () => handles.operator.completeRedemption(recordId, token, CONTENT),
        match: (e, t) => e === 'redeeming' && t.kind === 'redemption-failed',
        again: async (out) => {
          refusedWith(out, 'redemption-timeout');
          assert.equal((await rig.inner.readChain(recordId)).at(-1)?.kind, 'redemption-failed');
        },
      };
    },
  },
  {
    name: 'the reverify content-drift edge',
    seam: 'redeem',
    target: 'confirmed',
    async setup(rig, clock) {
      const { handles, recordId } = await confirmedLive(rig, clock);
      return {
        recordId,
        call: () => handles.operator.redeem(recordId, DRIFTED),
        match: (e, t) => e === 'confirmed' && t.kind === 'refused',
        again: async (out) => {
          refusedWith(out, 'content-drift');
          assert.ok(out.status === 'refused' && out.transitionRef !== undefined, 'the edge lands');
        },
      };
    },
  },
];

for (const site of UNMOVED_SITES) {
  test(`the redemption residual at ${site.name}: a state-mismatch with no racer (the record still '${site.target}') throws a storage fault, appends nothing, and the same call then succeeds`, async () => {
    const clock = { t: T0 };
    const rig = new Rig(new MemoryStore());
    const { recordId, call, match, again } = await site.setup(rig, clock);
    armOnce(rig, match, async () => LOST);
    await assertUnmovedFault(site.seam, site.target, call, rig.inner, recordId);
    await again(await call());
  });
}

// ============================================================================================
// The redemption residual: a lost CAS whose re-read fails throws with the failure as cause
// ============================================================================================

/** Each call site of the residual, set up to lose its CAS to a real racer. */
interface ResidualSite {
  name: string;
  seam: 'redeem' | 'beginRedemption' | 'completeRedemption';
  /** Sets the record up over `rig`, arms the racer, and returns the losing call. */
  setup(rig: Rig, clock: Clock): Promise<{ recordId: string; call: () => Promise<unknown> }>;
}

const RESIDUAL_SITES: ResidualSite[] = [
  {
    name: 'redeem (its own append)',
    seam: 'redeem',
    async setup(rig, clock) {
      const { handles, recordId } = await confirmedEffect(rig, clock);
      armOnce(
        rig,
        (e, t) => e === 'confirmed' && t.kind === 'redeemed',
        async () => {
          await land(rig.inner, recordId, 'confirmed', 'redeemed', { via: 'direct' });
          return undefined;
        },
      );
      return { recordId, call: () => handles.operator.redeem(recordId, CONTENT) };
    },
  },
  {
    name: 'beginRedemption (its own append)',
    seam: 'beginRedemption',
    async setup(rig, clock) {
      const { handles, recordId } = await confirmedEffect(rig, clock);
      armOnce(
        rig,
        (e, t) => e === 'confirmed' && t.kind === 'redeeming',
        async () => {
          await land(
            rig.inner,
            recordId,
            'confirmed',
            'redeeming',
            { tokenDigest: `sha256:${'c'.repeat(64)}` },
            true,
          );
          return undefined;
        },
      );
      return { recordId, call: () => handles.operator.beginRedemption(recordId, CONTENT) };
    },
  },
  {
    name: 'completeRedemption (its own append)',
    seam: 'completeRedemption',
    async setup(rig, clock) {
      const { handles, recordId } = await confirmedEffect(rig, clock);
      const token = await begun(handles, recordId);
      armOnce(
        rig,
        (e, t) => e === 'redeeming' && t.kind === 'redeemed',
        async () => {
          await land(rig.inner, recordId, 'redeeming', 'redeemed', { via: 'token' });
          return undefined;
        },
      );
      return {
        recordId,
        call: () => handles.operator.completeRedemption(recordId, token, CONTENT),
      };
    },
  },
  {
    name: 'the clock rung (a due confirmed window)',
    seam: 'redeem',
    async setup(rig, clock) {
      const { handles, recordId } = await confirmedEffect(rig, clock);
      clock.t = T0 + CONFIRM_MS + 10_000;
      armOnce(
        rig,
        (e, t) => e === 'confirmed' && t.kind === 'expired',
        async () => {
          await land(rig.inner, recordId, 'confirmed', 'redeemed', { via: 'direct' });
          return undefined;
        },
      );
      return { recordId, call: () => handles.operator.redeem(recordId, CONTENT) };
    },
  },
  {
    name: 'the reverify content-drift edge',
    seam: 'redeem',
    async setup(rig, clock) {
      const { handles, recordId } = await confirmedLive(rig, clock);
      armOnce(
        rig,
        (e, t) => e === 'confirmed' && t.kind === 'refused',
        async () => {
          await land(rig.inner, recordId, 'confirmed', 'redeemed', { via: 'direct' });
          return undefined;
        },
      );
      return { recordId, call: () => handles.operator.redeem(recordId, DRIFTED) };
    },
  },
];

for (const site of RESIDUAL_SITES) {
  for (const how of READ_FAILURES) {
    test(`the redemption residual at ${site.name}: a lost CAS whose re-read ${how === 'rejects' ? 'rejects' : 'returns a foreign chain'} throws with the failure as cause, never unredeemable-state`, async () => {
      const clock = { t: T0 };
      const rig = new Rig(new MemoryStore());
      // Another record whose rows a relocating read can hand back.
      const other = await confirmedEffect(rig, clock, 'subject:fr-other');
      const { recordId, call } = await site.setup(rig, clock);
      const armed = rig.onAppend;
      assert.ok(armed !== undefined, 'fixture: the racer is armed');
      rig.onAppend = async (e, t, m, tx) => {
        const out = await armed(e, t, m, tx);
        if (rig.onAppend === undefined) failReads(rig, how, other.recordId);
        return out;
      };
      await assert.rejects(call, lostReadFault(site.seam, causeOf(how)));
      rig.onRead = undefined;
      const chain = await rig.inner.readChain(recordId);
      assert.equal(
        chain.at(-1)?.kind,
        site.name.startsWith('beginRedemption') ? 'redeeming' : 'redeemed',
      );
    });
  }
}

// ============================================================================================
// Enlisted on SqliteStore: the fault throws, and the host's transaction stays open and usable
// ============================================================================================

async function enlistedFault(
  seam: 'redeem' | 'beginRedemption' | 'completeRedemption',
  arm: (rig: Rig, recordId: string) => void,
  expect: (err: unknown) => true,
): Promise<void> {
  await enlistedCall(seam, arm, (thrown) => {
    expect(thrown);
  });
}

/**
 * One enlisted call on SqliteStore inside a host transaction the test holds open: `arm` sets the
 * rig up, `check` receives what the call threw (or `undefined`) and what it returned. The host's
 * transaction must still be open and usable afterwards; it is rolled back, the chain must be as
 * it was, and the same call un-enlisted then succeeds.
 */
async function enlistedCall(
  seam: 'redeem' | 'beginRedemption' | 'completeRedemption',
  arm: (rig: Rig, recordId: string) => void,
  check: (thrown: unknown, out: Outcome<unknown> | undefined) => void,
): Promise<void> {
  const sqlite = new SqliteStore(':memory:');
  try {
    const clock = { t: T0 };
    const rig = new Rig(sqlite);
    const { handles, recordId } = await confirmedEffect(rig, clock);
    const token = seam === 'completeRedemption' ? await begun(handles, recordId) : '';
    const call = (opts?: { tx: unknown }) =>
      seam === 'completeRedemption'
        ? handles.operator.completeRedemption(recordId, token, CONTENT, opts)
        : handles.operator[seam](recordId, CONTENT, opts);
    const before = await sqlite.readChain(recordId);
    arm(rig, recordId);
    sqlite.database.exec('BEGIN IMMEDIATE');
    let thrown: unknown;
    let out: Outcome<unknown> | undefined;
    try {
      out = await call({ tx: sqlite.database });
    } catch (e) {
      thrown = e;
    }
    rig.onRead = undefined;
    assert.equal(sqlite.database.isTransaction, true, "the host's transaction is still open");
    // The host's own effect row, written and read inside its still-open transaction.
    sqlite.database.exec(
      'CREATE TABLE host_effect (n INTEGER); INSERT INTO host_effect VALUES (1)',
    );
    assert.deepEqual(
      { ...(sqlite.database.prepare('SELECT COUNT(*) AS n FROM host_effect').get() ?? {}) },
      { n: 1 },
      "the host's transaction is still usable",
    );
    sqlite.database.exec('ROLLBACK');
    check(thrown, out);
    assert.deepEqual(await sqlite.readChain(recordId), before, `${seam}: unchanged`);
    assertOk(await call());
  } finally {
    sqlite.close();
  }
}

test("enlisted on SqliteStore: a 'seq' conflict at each redemption seam throws, and the host's transaction stays open and usable", async () => {
  const appends = {
    redeem: ['confirmed', 'redeemed'],
    beginRedemption: ['confirmed', 'redeeming'],
    completeRedemption: ['redeeming', 'redeemed'],
  } as const;
  for (const seam of ['redeem', 'beginRedemption', 'completeRedemption'] as const) {
    const [state, kind] = appends[seam];
    await enlistedFault(
      seam,
      (rig) =>
        armOnce(
          rig,
          (e, t) => e === state && t.kind === kind,
          async () => SEQ,
        ),
      (err) => {
        assert.ok(err instanceof Error, `${seam}: thrown`);
        assert.match(err.message, new RegExp(`^${seam}: append conflict \\('seq'\\)`));
        return true;
      },
    );
  }
});

test("enlisted on SqliteStore: a lost CAS whose re-read rejects throws with the cause, and the host's transaction stays open and usable", async () => {
  for (const seam of ['redeem', 'beginRedemption', 'completeRedemption'] as const) {
    await enlistedFault(
      seam,
      (rig) =>
        armOnce(
          rig,
          (e, t) => e !== null && t.kind !== 'opened',
          async () => {
            failReads(rig, 'rejects', '');
            return LOST;
          },
        ),
      (err) => lostReadFault(seam, causeOf('rejects'))(err),
    );
  }
});

test("enlisted on SqliteStore: a state-mismatch whose re-read finds the record still in the expected state answers unredeemable-state, not the un-enlisted storage fault (the enlisted-read limit, deferral-register row 23), and the host's transaction stays open and usable", async () => {
  // The kernel cannot tell this from a second enlisted call on a store whose reads skip the
  // host transaction (PostgresStore; its own suite runs that shape for real), so an enlisted
  // call keeps the domain answer. On SqliteStore, whose reads see the transaction, the same
  // answer covers a genuine fault: the stated cost of the ruling.
  const appends = {
    redeem: ['confirmed', 'redeemed'],
    beginRedemption: ['confirmed', 'redeeming'],
    completeRedemption: ['redeeming', 'redeemed'],
  } as const;
  for (const seam of ['redeem', 'beginRedemption', 'completeRedemption'] as const) {
    const [state, kind] = appends[seam];
    await enlistedCall(
      seam,
      (rig) =>
        armOnce(
          rig,
          (e, t) => e === state && t.kind === kind,
          async () => LOST,
        ),
      (thrown, out) => {
        assert.equal(thrown, undefined, `${seam}: nothing thrown`);
        assert.ok(out !== undefined, `${seam}: an outcome`);
        refusedWith(out, 'unredeemable-state');
        assert.ok(out.status === 'refused' && out.transitionRef === undefined, 'no edge');
      },
    );
  }
});

// ============================================================================================
// finalize, decline and raiseFinding: a lost clock CAS answers what re-invocation would
// ============================================================================================

/** A leg that admits all three decision-progress seams (decline, and the findings flow). */
function seamsLeg<P extends ConfirmProfile>(p: P): P {
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: a leg');
  p.legs[0] = { ...leg, ackMode: 'any', requiredAcks: ['variance'] };
  return p;
}
const OPEN_PROFILE = () => seamsLeg(captureProfile({ id: 'test.fr.open.v1', decline: true }));
const EFFECT_PROFILE = () =>
  seamsLeg(effectSeamProfile({ id: 'test.fr.effect.v1', decline: true }));

const DECISION_SEAMS = {
  finalize: (h: Handles, id: string) => h.operator.finalize(id, identity(), CONTENT, facts()),
  decline: (h: Handles, id: string) => h.operator.decline(id, identity(), CONTENT, facts()),
  raiseFinding: (h: Handles, id: string) =>
    h.operator.raiseFinding(id, { findingId: 'f-1', kind: 'variance', findingDigest: D1 }, RAISER),
} as const;
type DecisionSeam = keyof typeof DECISION_SEAMS;
const SEAMS = Object.keys(DECISION_SEAMS) as DecisionSeam[];

/** An open record at T0 and a clock moved past its open window; `racer` decides at T0. */
async function dueOpen(seam: DecisionSeam) {
  const clock = { t: T0 };
  const rig = new Rig(new MemoryStore());
  const handles = on(rig, [OPEN_PROFILE()], clock);
  const racer = on(rig.inner, [OPEN_PROFILE()], { t: T0 });
  const recordId = await openRecord(handles, CONTENT, 'test.fr.open.v1', `subject:fr-${seam}`);
  clock.t = T0 + 2 * HOUR;
  return { rig, handles, racer, recordId, call: () => DECISION_SEAMS[seam](handles, recordId) };
}

const OPEN_EXPIRE = (e: RecordState | null, t: Transition) => e === 'open' && t.kind === 'expired';
const CONFIRMED_EXPIRE = (e: RecordState | null, t: Transition) =>
  e === 'confirmed' && t.kind === 'expired';
const REDEEMING_FAIL = (e: RecordState | null, t: Transition) =>
  e === 'redeeming' && t.kind === 'redemption-failed';

/** An effect-seam record confirmed (and, for 'redeeming', begun) at T0, its window now due. */
async function dueWindow(seam: DecisionSeam, window: 'confirmed' | 'redeeming') {
  const clock = { t: T0 };
  const rig = new Rig(new MemoryStore());
  const handles = on(rig, [EFFECT_PROFILE()], clock);
  const recordId = await openRecord(
    handles,
    CONTENT,
    'test.fr.effect.v1',
    `subject:fw-${window}-${seam}`,
  );
  assertOk(await DECISION_SEAMS.finalize(handles, recordId));
  if (window === 'redeeming') {
    assertOk(await handles.operator.beginRedemption(recordId, CONTENT));
    clock.t += REDEEM_MS + 10_000;
  } else {
    clock.t += CONFIRM_MS + 10_000;
  }
  return { rig, handles, recordId };
}

for (const seam of SEAMS) {
  test(`${seam}: losing the open-window expiry CAS to a racer that CONFIRMED refuses record-not-open, appending nothing`, async () => {
    const { rig, racer, recordId, call } = await dueOpen(seam);
    armOnce(rig, OPEN_EXPIRE, async () => {
      assertOk(await DECISION_SEAMS.finalize(racer, recordId));
      return undefined;
    });
    refusedWith(await call(), 'record-not-open');
    assert.equal((await rig.inner.readChain(recordId)).at(-1)?.kind, 'confirmed');
  });

  test(`${seam}: losing the open-window expiry CAS to a racer that REFUSED refuses record-not-open, appending nothing`, async () => {
    const { rig, recordId, call } = await dueOpen(seam);
    armOnce(rig, OPEN_EXPIRE, async () => {
      await land(rig.inner, recordId, 'open', 'refused', { code: 'identity-authority-refused' });
      return undefined;
    });
    refusedWith(await call(), 'record-not-open');
    assert.equal((await rig.inner.readChain(recordId)).at(-1)?.kind, 'refused');
  });

  test(`${seam}: losing the open-window expiry CAS to a racer that EXPIRED it refuses leg-expired`, async () => {
    const { rig, recordId, call } = await dueOpen(seam);
    armOnce(rig, OPEN_EXPIRE, async () => {
      await land(rig.inner, recordId, 'open', 'expired', {
        bound: new Date(T0 + HOUR).toISOString(),
      });
      return undefined;
    });
    refusedWith(await call(), 'leg-expired');
    const chain = await rig.inner.readChain(recordId);
    assert.equal(
      chain.filter((t) => t.kind === 'expired').length,
      1,
      'one expiry edge: the racer edge',
    );
  });

  test(`${seam}: a 'seq' loss on the open window (a racer raised a finding; the record is still open and due) refuses leg-expired`, async () => {
    const { rig, racer, recordId, call } = await dueOpen(seam);
    armOnce(rig, OPEN_EXPIRE, async () => {
      assertOk(await DECISION_SEAMS.raiseFinding(racer, recordId));
      return undefined;
    });
    refusedWith(await call(), 'leg-expired');
    assert.deepEqual(kinds(await rig.inner.readChain(recordId)), ['opened', 'finding-raised']);
  });

  for (const how of READ_FAILURES) {
    test(`${seam}: a lost open-window expiry CAS whose re-read ${how === 'rejects' ? 'rejects' : 'returns a foreign chain'} throws with the failure as cause`, async () => {
      const { rig, handles, recordId, call } = await dueOpen(seam);
      const other = await openRecord(handles, CONTENT, 'test.fr.open.v1', `subject:fr-x-${seam}`);
      armOnce(rig, OPEN_EXPIRE, async () => {
        await land(rig.inner, recordId, 'open', 'refused', { code: 'identity-authority-refused' });
        failReads(rig, how, other);
        return undefined;
      });
      await assert.rejects(call, lostReadFault(seam, causeOf(how)));
    });
  }

  test(`${seam}: losing the confirmed-window expiry CAS to a racer that EXPIRED the record refuses leg-expired`, async () => {
    const clock = { t: T0 };
    const rig = new Rig(new MemoryStore());
    const handles = on(rig, [EFFECT_PROFILE()], clock);
    const recordId = await openRecord(handles, CONTENT, 'test.fr.effect.v1', `subject:fe-${seam}`);
    assertOk(await DECISION_SEAMS.finalize(handles, recordId));
    clock.t = T0 + CONFIRM_MS + 10_000;
    armOnce(
      rig,
      (e, t) => e === 'confirmed' && t.kind === 'expired',
      async () => {
        await land(rig.inner, recordId, 'confirmed', 'expired', {
          bound: new Date(T0 + CONFIRM_MS).toISOString(),
        });
        return undefined;
      },
    );
    refusedWith(await DECISION_SEAMS[seam](handles, recordId), 'leg-expired');
    // Re-invocation agrees.
    refusedWith(await DECISION_SEAMS[seam](handles, recordId), 'leg-expired');
  });

  test(`${seam}: a 'seq' conflict on the confirmed-window expiry edge throws a storage fault, appends nothing, and the same call then resolves`, async () => {
    const clock = { t: T0 };
    const rig = new Rig(new MemoryStore());
    const handles = on(rig, [EFFECT_PROFILE()], clock);
    const recordId = await openRecord(handles, CONTENT, 'test.fr.effect.v1', `subject:fs-${seam}`);
    assertOk(await DECISION_SEAMS.finalize(handles, recordId));
    clock.t = T0 + CONFIRM_MS + 10_000;
    armOnce(
      rig,
      (e, t) => e === 'confirmed' && t.kind === 'expired',
      async () => SEQ,
    );
    const call = () => DECISION_SEAMS[seam](handles, recordId);
    await assertSeqFault(seam, call, rig.inner, recordId);
    refusedWith(await call(), 'leg-expired');
  });

  test(`${seam}: a lost redeeming-window resolution CAS refuses record-not-open`, async () => {
    const clock = { t: T0 };
    const rig = new Rig(new MemoryStore());
    const handles = on(rig, [EFFECT_PROFILE()], clock);
    const recordId = await openRecord(handles, CONTENT, 'test.fr.effect.v1', `subject:fd-${seam}`);
    assertOk(await DECISION_SEAMS.finalize(handles, recordId));
    assertOk(await handles.operator.beginRedemption(recordId, CONTENT));
    clock.t += REDEEM_MS + 10_000;
    armOnce(
      rig,
      (e, t) => e === 'redeeming' && t.kind === 'redemption-failed',
      async () => {
        await land(rig.inner, recordId, 'redeeming', 'redemption-failed', {
          bound: new Date(clock.t - 10_000).toISOString(),
        });
        return undefined;
      },
    );
    refusedWith(await DECISION_SEAMS[seam](handles, recordId), 'record-not-open');
  });

  for (const how of READ_FAILURES) {
    test(`${seam}: a lost confirmed-window expiry CAS whose re-read ${how === 'rejects' ? 'rejects' : 'returns a foreign chain'} throws with the failure as cause`, async () => {
      const { rig, handles, recordId } = await dueWindow(seam, 'confirmed');
      const other = await openRecord(handles, CONTENT, 'test.fr.effect.v1', `subject:fx-${seam}`);
      armOnce(rig, CONFIRMED_EXPIRE, async () => {
        await land(rig.inner, recordId, 'confirmed', 'expired', {
          bound: new Date(T0 + CONFIRM_MS).toISOString(),
        });
        failReads(rig, how, other);
        return undefined;
      });
      await assert.rejects(
        () => DECISION_SEAMS[seam](handles, recordId),
        lostReadFault(seam, causeOf(how)),
      );
    });
  }

  test(`${seam}: a state-mismatch with no racer on the OPEN window (the record still 'open') throws a storage fault, appends nothing, and the same call then expires it`, async () => {
    const { rig, recordId, call } = await dueOpen(seam);
    armOnce(rig, OPEN_EXPIRE, async () => LOST);
    await assertUnmovedFault(seam, 'open', call, rig.inner, recordId);
    refusedWith(await call(), 'leg-expired');
    assert.equal((await rig.inner.readChain(recordId)).at(-1)?.kind, 'expired');
  });

  test(`${seam}: a state-mismatch with no racer on the CONFIRMED window (the record still 'confirmed') throws a storage fault, appends nothing, and the same call then expires it`, async () => {
    const { rig, handles, recordId } = await dueWindow(seam, 'confirmed');
    armOnce(rig, CONFIRMED_EXPIRE, async () => LOST);
    const call = () => DECISION_SEAMS[seam](handles, recordId);
    await assertUnmovedFault(seam, 'confirmed', call, rig.inner, recordId);
    refusedWith(await call(), 'leg-expired');
    assert.equal((await rig.inner.readChain(recordId)).at(-1)?.kind, 'expired');
  });

  test(`${seam}: a state-mismatch with no racer on the REDEEMING window (the record still 'redeeming') throws a storage fault, appends nothing, and the same call then resolves it`, async () => {
    const { rig, handles, recordId } = await dueWindow(seam, 'redeeming');
    armOnce(rig, REDEEMING_FAIL, async () => LOST);
    const call = () => DECISION_SEAMS[seam](handles, recordId);
    await assertUnmovedFault(seam, 'redeeming', call, rig.inner, recordId);
    refusedWith(await call(), 'record-not-open');
    assert.equal((await rig.inner.readChain(recordId)).at(-1)?.kind, 'redemption-failed');
  });

  test(`${seam}: a 'seq' conflict on the redeeming-window resolution edge throws a storage fault, appends nothing, and the same call then resolves it`, async () => {
    const { rig, handles, recordId } = await dueWindow(seam, 'redeeming');
    armOnce(rig, REDEEMING_FAIL, async () => SEQ);
    const call = () => DECISION_SEAMS[seam](handles, recordId);
    await assertSeqFault(seam, call, rig.inner, recordId);
    refusedWith(await call(), 'record-not-open');
    assert.equal((await rig.inner.readChain(recordId)).at(-1)?.kind, 'redemption-failed');
  });
}

// ============================================================================================
// The findings seams' own append (CAS target 'open'): a lost state check re-reads
// ============================================================================================

const FINDINGS_SEAMS = ['raiseFinding', 'acknowledge'] as const;
type FindingsSeam = (typeof FINDINGS_SEAMS)[number];

/**
 * An open findings-flow record, not due, and the seam's own call. For `acknowledge` the finding
 * it acknowledges is raised first. `racer` writes straight to the backing at the same instant.
 */
async function openForFindings(seam: FindingsSeam) {
  const clock = { t: T0 };
  const rig = new Rig(new MemoryStore());
  const handles = on(rig, [OPEN_PROFILE()], clock);
  const racer = on(rig.inner, [OPEN_PROFILE()], { t: T0 });
  const recordId = await openRecord(handles, CONTENT, 'test.fr.open.v1', `subject:fo-${seam}`);
  if (seam === 'acknowledge') assertOk(await DECISION_SEAMS.raiseFinding(handles, recordId));
  const call = () =>
    seam === 'raiseFinding'
      ? DECISION_SEAMS.raiseFinding(handles, recordId)
      : handles.operator.acknowledge(recordId, { findingId: 'f-1', findingDigest: D1 }, RAISER);
  const ownAppend = (e: RecordState | null, t: Transition) =>
    e === 'open' && t.kind === (seam === 'raiseFinding' ? 'finding-raised' : 'acknowledged');
  return { rig, racer, recordId, call, ownAppend };
}

for (const seam of FINDINGS_SEAMS) {
  test(`${seam}: its own append losing the state check to a racer that EXPIRED the record refuses leg-expired, appending nothing, and re-invoking agrees`, async () => {
    const { rig, recordId, call, ownAppend } = await openForFindings(seam);
    armOnce(rig, ownAppend, async () => {
      await land(rig.inner, recordId, 'open', 'expired', {
        bound: new Date(T0 + HOUR).toISOString(),
      });
      return undefined;
    });
    refusedWith(await call(), 'leg-expired');
    const chain = await rig.inner.readChain(recordId);
    assert.equal(chain.at(-1)?.kind, 'expired', "only the racer's edge landed");
    refusedWith(await call(), 'leg-expired');
  });

  test(`${seam}: its own append losing the state check to a racer that DECLINED the record refuses record-not-open, appending nothing`, async () => {
    const { rig, racer, recordId, call, ownAppend } = await openForFindings(seam);
    armOnce(rig, ownAppend, async () => {
      assertOk(await DECISION_SEAMS.decline(racer, recordId));
      return undefined;
    });
    refusedWith(await call(), 'record-not-open');
    assert.equal((await rig.inner.readChain(recordId)).at(-1)?.kind, 'declined');
    refusedWith(await call(), 'record-not-open');
  });

  test(`${seam}: its own append losing the state check with no racer (the record still 'open') throws a storage fault, appends nothing, and the same call then lands`, async () => {
    const { rig, recordId, call, ownAppend } = await openForFindings(seam);
    armOnce(rig, ownAppend, async () => LOST);
    await assertUnmovedFault(seam, 'open', call, rig.inner, recordId);
    assertOk(await call());
  });
}

test('raiseFinding: its own append losing the state check to a racer that CONFIRMED the record refuses record-not-open, appending nothing', async () => {
  const { rig, racer, recordId, call, ownAppend } = await openForFindings('raiseFinding');
  armOnce(rig, ownAppend, async () => {
    assertOk(await DECISION_SEAMS.finalize(racer, recordId));
    return undefined;
  });
  refusedWith(await call(), 'record-not-open');
  assert.equal((await rig.inner.readChain(recordId)).at(-1)?.kind, 'confirmed');
});

test("raiseFinding: an 'exclusivity' conflict on its own append (C1 binds only a genesis) throws a storage fault and appends nothing", async () => {
  const { rig, recordId, call, ownAppend } = await openForFindings('raiseFinding');
  armOnce(rig, ownAppend, async () => ({
    appended: false,
    conflict: 'exclusivity',
    blockingRecordId: 'rec-elsewhere',
  }));
  const before = await rig.inner.readChain(recordId);
  await assert.rejects(call, /^Error: raiseFinding: append conflict \('exclusivity'\)/);
  assert.deepEqual(await rig.inner.readChain(recordId), before);
});

// ============================================================================================
// open(): a blocker already terminal when read, and the single retry's conflicts and faults
// ============================================================================================

const PAIR = 'subject:fr-open';
const OPEN_ID = 'test.fr.pair.v1';
const pairProfile = () => captureProfile({ id: OPEN_ID, decline: true });

async function stageOn(handles: Handles, total: number, profileId = OPEN_ID): Promise<string> {
  const staged = await handles.agent.stage({ subject: 'week-1', total }, profileId, PAIR);
  if (staged.status !== 'ok') throw new Error(`fixture: stage ${JSON.stringify(staged)}`);
  return staged.value.stagedRef;
}

/**
 * Lets the first genesis attempt through to the backing and, when it comes back with an
 * exclusivity conflict, runs `racer` before handing the conflict to `open()`.
 */
function afterExclusivity(rig: Rig, racer: (blockerId: string) => Promise<void>): void {
  rig.onAppend = async (e, t, m, tx) => {
    if (e !== null) return undefined;
    rig.onAppend = undefined;
    const res = await rig.inner.appendTransition(e, t, m, tx);
    if (!res.appended && res.conflict === 'exclusivity') await racer(res.blockingRecordId);
    return res;
  };
}

async function blockedPair(profile = pairProfile()) {
  const clock = { t: T0 };
  const rig = new Rig(new MemoryStore());
  const handles = on(rig, [profile], clock);
  const racer = on(rig.inner, [profile], { t: T0 });
  const blockerId = await openRecord(handles, CONTENT, profile.id, PAIR);
  const ref = await stageOn(handles, 41, profile.id);
  rig.genesisAttempts = 0;
  return { clock, rig, handles, racer, blockerId, ref };
}

test('open(): a blocker a racer DECLINED before it was read is terminal — the pair is free, so the single retry opens the record (two genesis attempts)', async () => {
  const { rig, handles, racer, blockerId, ref } = await blockedPair();
  afterExclusivity(rig, async (id) => {
    assertOk(await DECISION_SEAMS.decline(racer, id));
  });
  const out = await handles.operator.open(ref);
  assertOk(out);
  assert.equal(rig.genesisAttempts, 2);
  assert.equal(
    await rig.inner.findNonTerminal(OPEN_ID, PAIR),
    out.status === 'ok' ? out.value.recordId : null,
  );
  assert.deepEqual(kinds(await rig.inner.readChain(blockerId)).at(-1), 'declined');
});

test('open(): a blocker a racer CONFIRMED on a capture profile (terminal there) before it was read — the single retry opens the record', async () => {
  const { rig, handles, racer, ref } = await blockedPair();
  afterExclusivity(rig, async (id) => {
    assertOk(await DECISION_SEAMS.finalize(racer, id));
  });
  assertOk(await handles.operator.open(ref));
  assert.equal(rig.genesisAttempts, 2);
});

test("open(): a blocker terminal when read, but a NEW live record holds the pair by the retry — the retry's own C1 answers record-exists (two attempts, no loop)", async () => {
  const { rig, handles, racer, ref } = await blockedPair();
  let thirdId = '';
  afterExclusivity(rig, async (id) => {
    assertOk(await DECISION_SEAMS.decline(racer, id));
    thirdId = await openRecord(racer, { subject: 'week-1', total: 77 }, OPEN_ID, PAIR);
  });
  refusedWith(await handles.operator.open(ref), 'record-exists');
  assert.equal(rig.genesisAttempts, 2, 'one retry, never a loop');
  assert.deepEqual(
    kinds(await rig.inner.readChain(thirdId)),
    ['opened'],
    'the new holder is untouched',
  );
});

test('open(): a blocker a racer moved to another NON-terminal state (an effect-seam confirmed, within its window) still answers record-exists after one genesis attempt', async () => {
  const profile = effectSeamProfile({ id: OPEN_ID });
  const { rig, handles, racer, blockerId, ref } = await blockedPair(profile);
  afterExclusivity(rig, async (id) => {
    assertOk(await DECISION_SEAMS.finalize(racer, id));
  });
  refusedWith(await handles.operator.open(ref), 'record-exists');
  assert.equal(rig.genesisAttempts, 1);
  assert.equal(await rig.inner.findNonTerminal(OPEN_ID, PAIR), blockerId);
});

test("open(): a non-exclusivity conflict on the retry after a terminal blocker throws, as the first attempt's does", async () => {
  const { rig, handles, racer, ref } = await blockedPair();
  afterExclusivity(rig, async (id) => {
    assertOk(await DECISION_SEAMS.decline(racer, id));
    rig.onAppend = async (e) => (e === null ? SEQ : undefined);
  });
  await assert.rejects(
    () => handles.operator.open(ref),
    /^Error: open: unexpected genesis append conflict 'seq'/,
  );
  rig.onAppend = undefined;
  assertOk(await handles.operator.open(ref));
});

/** A lapsed blocker: open() expires it en passant, then retries. */
async function lapsedPair(inner: Store) {
  const clock = { t: T0 };
  const rig = new Rig(inner);
  const handles = on(rig, [pairProfile()], clock);
  const blockerId = await openRecord(handles, CONTENT, OPEN_ID, PAIR);
  const ref = await stageOn(handles, 41);
  clock.t = T0 + 2 * HOUR;
  rig.genesisAttempts = 0;
  return { rig, handles, blockerId, ref };
}

test('open(): a non-exclusivity conflict on the retry after this call expired the blocker throws, naming the blocker whose edge stands', async () => {
  const { rig, handles, blockerId, ref } = await lapsedPair(new MemoryStore());
  rig.onAppend = async (e) => {
    if (e !== null || rig.genesisAttempts < 2) return undefined;
    rig.onAppend = undefined;
    return SEQ;
  };
  await assert.rejects(
    () => handles.operator.open(ref),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes(`'${blockerId}'`), 'names the blocker');
      assert.match(err.message, /that edge stands/);
      assert.ok(err.cause instanceof Error, 'the conflict rides as the cause');
      assert.match(err.cause.message, /^open: unexpected genesis append conflict 'seq'/);
      return true;
    },
  );
  assert.deepEqual(kinds(await rig.inner.readChain(blockerId)), ['opened', 'expired']);
});

for (const backing of ['MemoryStore', 'SqliteStore'] as const) {
  test(`open() on ${backing}: the retry failing after this call expired the blocker throws an error naming the blocker, with the store's error as cause; the edge stands and a host retry opens`, async () => {
    const inner = backing === 'MemoryStore' ? new MemoryStore() : new SqliteStore(':memory:');
    try {
      const { rig, handles, blockerId, ref } = await lapsedPair(inner);
      const injected = new Error('ECONNRESET: the connection dropped');
      rig.onAppend = async (e) => {
        if (e !== null || rig.genesisAttempts < 2) return undefined;
        rig.onAppend = undefined;
        throw injected;
      };
      await assert.rejects(
        () => handles.operator.open(ref),
        (err: unknown) => {
          assert.ok(err instanceof Error);
          assert.notEqual(err, injected, 'wrapped, not the raw error');
          assert.ok(err.message.includes(`'${blockerId}'`), 'names the blocker');
          assert.match(err.message, /expired blocker/);
          assert.match(err.message, /that edge stands/);
          assert.equal(err.cause, injected, "the store's error rides as the cause");
          return true;
        },
      );
      assert.deepEqual(kinds(await inner.readChain(blockerId)), ['opened', 'expired']);
      assert.equal(await inner.findNonTerminal(OPEN_ID, PAIR), null, 'the pair is released');
      const again = await handles.operator.open(ref);
      assertOk(again);
    } finally {
      if (inner instanceof SqliteStore) inner.close();
    }
  });
}

test("open() under AL2 signing: the signer failing on the re-stamped retry after this call expired the blocker throws naming the blocker, with the signer's error as cause", async () => {
  // A ticking clock, so the retry is re-stamped — a new object, so a fresh mint — and a signer
  // that fails on the second genesis it signs once armed: the first attempt's mints, the
  // blocker's expiry edge mints, and the retry's mint is the one that throws.
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const injected = new Error('signer: the key service is unreachable');
  let openedSigns = 0;
  let failAt = Number.POSITIVE_INFINITY;
  const signer: Signer = async (bytes) => {
    const decoded: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if ((decoded as { kind?: unknown }).kind === 'opened') {
      openedSigns += 1;
      if (openedSigns === failAt) throw injected;
    }
    return { keyRef: 'key-1', signature: edSign(null, bytes, privateKey).toString('base64') };
  };
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  const store = new MemoryStore();
  const profile = { ...pairProfile(), signing: true as const };
  let ms = T0;
  const handles = createWithClock(
    {
      ...makeConfig([profile], { store }),
      signing: { signer, verifiers: { 'key-1': verifier }, signatures: new MemorySignatureStore() },
    },
    () => {
      ms += 1000;
      return new Date(ms);
    },
  );
  const blockerId = await openRecord(handles, CONTENT, OPEN_ID, PAIR);
  const ref = await stageOn(handles, 41);
  ms += 2 * HOUR;
  failAt = openedSigns + 2;
  await assert.rejects(
    () => handles.operator.open(ref),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes(`'${blockerId}'`), 'names the blocker');
      assert.match(err.message, /that edge stands/);
      assert.equal(err.cause, injected, "the signer's error rides as the cause");
      return true;
    },
  );
  assert.deepEqual(kinds(await store.readChain(blockerId)), ['opened', 'expired']);
  assert.equal(await store.findNonTerminal(OPEN_ID, PAIR), null, 'the pair is released');
  failAt = Number.POSITIVE_INFINITY;
  assertOk(await handles.operator.open(ref));
});

test('open(): the retry failing after a blocker that was already terminal — this call appended nothing, so the raw error propagates unchanged', async () => {
  const { rig, handles, racer, ref } = await blockedPair();
  const injected = new Error('ECONNRESET: the connection dropped');
  afterExclusivity(rig, async (id) => {
    assertOk(await DECISION_SEAMS.decline(racer, id));
    rig.onAppend = async () => {
      rig.onAppend = undefined;
      throw injected;
    };
  });
  await assert.rejects(
    () => handles.operator.open(ref),
    (err: unknown) => {
      assert.equal(err, injected, 'the raw error, unwrapped');
      return true;
    },
  );
});

// ============================================================================================
// open()'s own expiry of a due blocker: a conflict with no honest producer throws
// ============================================================================================

/** A due blocker for `profile` (confirmed first when `confirm`), and a second draft on its pair. */
async function dueBlocker(profile: ConfirmProfile, confirm: boolean) {
  const clock = { t: T0 };
  const rig = new Rig(new MemoryStore());
  const handles = on(rig, [profile], clock);
  const racer = on(rig.inner, [profile], { t: T0 });
  const blockerId = await openRecord(handles, CONTENT, profile.id, PAIR);
  if (confirm) assertOk(await DECISION_SEAMS.finalize(handles, blockerId));
  const ref = await stageOn(handles, 41, profile.id);
  clock.t = T0 + (confirm ? CONFIRM_MS : HOUR) + 10_000;
  rig.genesisAttempts = 0;
  return { rig, handles, racer, blockerId, ref };
}

/** The `'seq'` fault names the blocker and both causes; it never blames a concurrent writer alone. */
function assertBlockerSeqFault(err: Error, blockerId: string): void {
  assert.match(String(err), /^Error: open: append conflict \('seq'\) on the expiry edge/);
  assert.ok(err.message.includes(`blocker '${blockerId}'`), 'names the blocker');
  assert.match(err.message, /storage fault, or a damaged blocker chain/);
  assert.match(err.message, /open\(\) does not verify its blocker/);
  assert.match(err.message, /This call appended nothing: the blocker is unchanged and no record/);
  assert.ok(
    err.message.includes(`a verifying seam on '${blockerId}'`),
    'names the seam that reports the break',
  );
}

const OWN_EXPIRE_FAULTS: {
  name: string;
  result: AppendResult;
  check: (err: Error, blockerId: string) => void;
}[] = [
  { name: "'seq'", result: SEQ, check: assertBlockerSeqFault },
  {
    name: "'exclusivity'",
    result: { appended: false, conflict: 'exclusivity', blockingRecordId: 'rec-elsewhere' },
    check: (err) => {
      assert.match(String(err), /^Error: open: append conflict \('exclusivity'\)/);
      assert.match(err.message, /storage fault/);
      assert.match(err.message, /nothing was appended and the record is unchanged/);
    },
  },
];

for (const fault of OWN_EXPIRE_FAULTS) {
  test(`open(): its own expiry of a due CONFIRMED blocker losing on ${fault.name} (no honest producer there) throws a storage fault, appends nothing and opens nothing; a host retry then opens`, async () => {
    const profile = effectSeamProfile({ id: OPEN_ID });
    const { rig, handles, blockerId, ref } = await dueBlocker(profile, true);
    const before = await rig.inner.readChain(blockerId);
    armOnce(rig, CONFIRMED_EXPIRE, async () => fault.result);
    await assert.rejects(
      () => handles.operator.open(ref),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        fault.check(err, blockerId);
        return true;
      },
    );
    assert.deepEqual(await rig.inner.readChain(blockerId), before, 'the blocker is unchanged');
    assert.equal(rig.genesisAttempts, 1, 'no retry');
    assert.equal(await rig.inner.findNonTerminal(OPEN_ID, PAIR), blockerId, 'nothing opened');
    assertOk(await handles.operator.open(ref));
    assert.equal((await rig.inner.readChain(blockerId)).at(-1)?.kind, 'expired');
  });
}

test("open(): its own expiry of a due OPEN blocker losing on 'seq' to a racer's finding (an honest race; the blocker is still open) still answers record-exists after one genesis attempt — inside the owner-gated item", async () => {
  const profile = seamsLeg(captureProfile({ id: OPEN_ID, decline: true }));
  const { rig, handles, racer, blockerId, ref } = await dueBlocker(profile, false);
  armOnce(rig, OPEN_EXPIRE, async () => {
    assertOk(await DECISION_SEAMS.raiseFinding(racer, blockerId));
    return undefined;
  });
  refusedWith(await handles.operator.open(ref), 'record-exists');
  assert.equal(rig.genesisAttempts, 1);
  assert.deepEqual(kinds(await rig.inner.readChain(blockerId)), ['opened', 'finding-raised']);
});

test('open(): its own expiry of a due OPEN blocker losing a state check with no racer (the blocker still open) still answers record-exists — the fault the owner-gated item leaves inside the inherited arm', async () => {
  const { rig, handles, blockerId, ref } = await dueBlocker(pairProfile(), false);
  armOnce(rig, OPEN_EXPIRE, async () => LOST);
  refusedWith(await handles.operator.open(ref), 'record-exists');
  assert.equal(rig.genesisAttempts, 1);
  assert.deepEqual(kinds(await rig.inner.readChain(blockerId)), ['opened']);
});

// ============================================================================================
// operator.listDue(): a synchronous throw rejects
// ============================================================================================

test('operator.listDue(): a store whose listDue throws synchronously yields a rejection, not a throw', async () => {
  class SyncThrowingListDue extends MemoryStore {
    override listDue(): Promise<string[]> {
      throw new Error('listDue: thrown synchronously');
    }
  }
  const handles = create(makeConfig([captureProfile()], { store: new SyncThrowingListDue() }));
  let pending: Promise<string[]> | undefined;
  assert.doesNotThrow(() => {
    pending = handles.operator.listDue();
  });
  assert.ok(pending instanceof Promise);
  await assert.rejects(pending, /thrown synchronously/);
});

test('operator.listDue(): a clock that throws yields a rejection, not a throw', async () => {
  const handles = createWithClock(makeConfig([captureProfile()]), () => {
    throw new Error('clock: unavailable');
  });
  let pending: Promise<string[]> | undefined;
  assert.doesNotThrow(() => {
    pending = handles.operator.listDue();
  });
  assert.ok(pending instanceof Promise);
  await assert.rejects(pending, /clock: unavailable/);
});

// ============================================================================================
// The findings seams on a due-confirmed record (characterization: SPEC §4's lazy resolution)
// ============================================================================================

test('the findings seams on a confirmed record: before the confirmed bound they refuse record-not-open and append nothing; after it each resolves the window, appends expired and refuses leg-expired', async () => {
  for (const seam of ['raiseFinding', 'acknowledge'] as const) {
    const clock = { t: T0 };
    const store = new MemoryStore();
    const handles = on(store, [EFFECT_PROFILE()], clock);
    const recordId = await openRecord(handles, CONTENT, 'test.fr.effect.v1', `subject:fc-${seam}`);
    assertOk(await DECISION_SEAMS.finalize(handles, recordId));
    const call = () =>
      seam === 'raiseFinding'
        ? DECISION_SEAMS.raiseFinding(handles, recordId)
        : handles.operator.acknowledge(
            recordId,
            { findingId: 'f-1', findingDigest: D1 },
            identity(),
          );
    const confirmedChain = await store.readChain(recordId);

    clock.t = T0 + CONFIRM_MS - 1;
    refusedWith(await call(), 'record-not-open');
    assert.deepEqual(await store.readChain(recordId), confirmedChain, `${seam}: no append`);

    clock.t = T0 + CONFIRM_MS + 10_000;
    const out = await call();
    refusedWith(out, 'leg-expired');
    assert.ok(out.status === 'refused' && out.transitionRef === undefined);
    const chain = await store.readChain(recordId);
    assert.equal(chain.length, confirmedChain.length + 1);
    assert.equal(chain.at(-1)?.kind, 'expired', `${seam}: the expired edge appended en passant`);
  }
});
