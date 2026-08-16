// @vidimera/record — multi-leg.test.ts (SPEC §10.1 "Maker-checker / separation of
// duties", the sequencing-and-references half; §4's opened snapshot): the first step-4
// increment's file. This file owns the verifier pins, the sequencing-rung pins, and the
// interplay pins; the SoD gate's pins are the second step-4 increment's.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { AgentSurface } from '../src/agent-surface.js';
import { transitionDigest } from '../src/chain/encoding.js';
import { replay } from '../src/chain/replay.js';
import type { ConfirmProfile } from '../src/config.js';
import type { ResolvedProfile } from '../src/create.js';
import { create, createWithClock } from '../src/create.js';
import { verifyPriorLegs } from '../src/kernel/prior-legs.js';
import type { OperatorSurface } from '../src/operator-surface.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Transition } from '../src/types.js';
import { buildChain } from './helpers/chain.js';
import {
  DEFAULT_CANONICALIZER_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
  tamperNonLast,
  twoLegProfile,
} from './helpers/profiles.js';
import { TamperingStore } from './helpers/stores.js';

const SUBJECT = 'subject:ml-1';

/** A hand-built two-leg profile OBJECT, used directly by the verifier pins below (never
 * passed through create() — those tests exercise `verifyPriorLegs` in isolation, not the
 * full construction-and-open() path; `twoLegProfile()` in helpers/profiles.ts is the
 * construction-backed profile the sequencing-rung tests further down use instead). */
function twoLegShape(id = 'test.twoleg.v1'): ConfirmProfile {
  return {
    id,
    subject: { canonicalizerRef: DEFAULT_CANONICALIZER_REF },
    legs: [
      { id: 'maker-decide', allowedAuthorities: ['session:test-app'] },
      { id: 'checker-decide', allowedAuthorities: ['session:test-app'] },
    ],
    captureMode: 'staged',
    expiry: { ttl: 3600 },
  };
}
function resolvedOf(profile: ConfirmProfile): ResolvedProfile {
  return { profile, canonicalizer: (c: unknown) => c, effectSeam: false };
}

/** Seeds a store with a correctly-linked chain, one honest append at a time. */
async function seed(store: MemoryStore, chain: Transition[], lastNonTerminal: boolean) {
  for (const [i, t] of chain.entries()) {
    const expected = i === 0 ? null : 'open';
    const nonTerminal = i === chain.length - 1 ? lastNonTerminal : true;
    const res = await store.appendTransition(expected, t, { nonTerminal });
    assert.equal(res.appended, true, `fixture: seed append ${i} must land`);
  }
}

/** A confirmed maker-leg prior for `twoLegShape()` under SUBJECT; returns its chain. */
function makerConfirmedChain(
  recordId: string,
  overrides?: {
    profileId?: string;
    subjectRef?: string;
    legId?: string;
    actorless?: boolean;
  },
): Transition[] {
  return buildChain(recordId, [
    {
      kind: 'opened',
      payload: {
        profileId: overrides?.profileId ?? 'test.twoleg.v1',
        profileDigest: `sha256:${'0'.repeat(64)}`,
        legId: overrides?.legId ?? 'maker-decide',
        subjectRef: overrides?.subjectRef ?? SUBJECT,
        contentDigest: `sha256:${'1'.repeat(64)}`,
      },
    },
    {
      kind: 'confirmed',
      payload: overrides?.actorless
        ? {}
        : { actor: { principal: 'maker:1', authority: 'session:test-app' } },
    },
  ]);
}

test('verifyPriorLegs: a first leg with no refs verifies to null; with any ref it fails', async () => {
  const store = new MemoryStore();
  const resolved = resolvedOf(twoLegShape());
  assert.deepEqual(await verifyPriorLegs(store, resolved, 0, SUBJECT, undefined), {
    ok: true,
    verified: null,
  });
  assert.deepEqual(await verifyPriorLegs(store, resolved, 0, SUBJECT, []), {
    ok: true,
    verified: null,
  });
  // §10.1: "supplying any is itself a sequencing error that refuses `prior-leg-unverified`"
  // — the caller maps { ok: false } to that code.
  const any = [{ recordId: 'r-x', chainHead: `sha256:${'a'.repeat(64)}` }];
  assert.deepEqual(await verifyPriorLegs(store, resolved, 0, SUBJECT, any), { ok: false });
});

test('verifyPriorLegs: the happy reference — three-field ref recorded, actor derived, paired by index', async () => {
  const store = new MemoryStore();
  const chain = makerConfirmedChain('rec-ml-1');
  await seed(store, chain, false); // confirmed non-final leg: terminal
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  const head = transitionDigest(last);

  const res = await verifyPriorLegs(store, resolvedOf(twoLegShape()), 1, SUBJECT, [
    { recordId: 'rec-ml-1', chainHead: head },
  ]);
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.ok(res.verified !== null);
  assert.deepEqual(res.verified.priorRecordRefs, [
    { recordId: 'rec-ml-1', chainHead: head, legId: 'maker-decide' },
  ]);
  assert.deepEqual(res.verified.priorLegActors, [
    { principal: 'maker:1', authority: 'session:test-app' },
  ]);
});

test('verifyPriorLegs: every verification condition fails closed to { ok: false }', async () => {
  const store = new MemoryStore();
  const chain = makerConfirmedChain('rec-ml-2');
  await seed(store, chain, false);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  const head = transitionDigest(last);
  const resolved = resolvedOf(twoLegShape());

  // unknown recordId — host DATA, refused, never a caller-error throw:
  assert.deepEqual(
    await verifyPriorLegs(store, resolved, 1, SUBJECT, [{ recordId: 'rec-none', chainHead: head }]),
    { ok: false },
  );
  // head mismatch (a wrong claimed head):
  assert.deepEqual(
    await verifyPriorLegs(store, resolved, 1, SUBJECT, [
      { recordId: 'rec-ml-2', chainHead: `sha256:${'f'.repeat(64)}` },
    ]),
    { ok: false },
  );
  // wrong subject:
  assert.deepEqual(
    await verifyPriorLegs(store, resolved, 1, 'subject:other', [
      { recordId: 'rec-ml-2', chainHead: head },
    ]),
    { ok: false },
  );
  // count mismatch — too few for a third leg, too many for a second:
  assert.deepEqual(
    await verifyPriorLegs(store, resolved, 2, SUBJECT, [{ recordId: 'rec-ml-2', chainHead: head }]),
    { ok: false },
  );
  assert.deepEqual(
    await verifyPriorLegs(store, resolved, 1, SUBJECT, [
      { recordId: 'rec-ml-2', chainHead: head },
      { recordId: 'rec-ml-2', chainHead: head },
    ]),
    { ok: false },
  );
});

test('verifyPriorLegs: a still-open prior fails; a tampered prior chain fails', async () => {
  const store = new MemoryStore();
  const openOnly = buildChain('rec-ml-3', [
    {
      kind: 'opened',
      payload: {
        profileId: 'test.twoleg.v1',
        profileDigest: `sha256:${'0'.repeat(64)}`,
        legId: 'maker-decide',
        subjectRef: SUBJECT,
        contentDigest: `sha256:${'1'.repeat(64)}`,
      },
    },
  ]);
  await seed(store, openOnly, true);
  const openHead = openOnly.at(-1);
  assert.ok(openHead !== undefined);
  assert.deepEqual(
    await verifyPriorLegs(store, resolvedOf(twoLegShape()), 1, SUBJECT, [
      { recordId: 'rec-ml-3', chainHead: transitionDigest(openHead) },
    ]),
    { ok: false },
  );

  // Tampered: seed an honest confirmed chain on its OWN fresh store — reusing `store`
  // above would collide with C1 exclusivity, since rec-ml-3's still-open genesis never
  // leaves its (profileId, subjectRef) pair nonTerminal — then read it through the
  // established TamperingStore wrapper (helpers/stores.ts) — a NON-LAST payload tamper,
  // so verifyChain reports intact:false at the break (the AL1 next-link rule).
  const honestStore = new MemoryStore();
  const honest = makerConfirmedChain('rec-ml-4');
  await seed(honestStore, honest, false);
  const tampering = new TamperingStore(honestStore, 'rec-ml-4', tamperNonLast);
  const honestLast = honest.at(-1);
  assert.ok(honestLast !== undefined);
  assert.deepEqual(
    await verifyPriorLegs(tampering, resolvedOf(twoLegShape()), 1, SUBJECT, [
      { recordId: 'rec-ml-4', chainHead: transitionDigest(honestLast) },
    ]),
    { ok: false },
  );
});

test('verifyPriorLegs: an intact, confirmed prior with no derivable actor THROWS — storage fault, not a refusal', async () => {
  const store = new MemoryStore();
  const chain = makerConfirmedChain('rec-ml-5', { actorless: true });
  await seed(store, chain, false);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  await assert.rejects(
    verifyPriorLegs(store, resolvedOf(twoLegShape()), 1, SUBJECT, [
      { recordId: 'rec-ml-5', chainHead: transitionDigest(last) },
    ]),
    /no actor/i,
  );
});

test('replay folds priorRecordRefs/priorLegActors from the opened snapshot; absent means absent', () => {
  const withRefs = buildChain('rec-ml-6', [
    {
      kind: 'opened',
      payload: {
        profileId: 'test.twoleg.v1',
        profileDigest: `sha256:${'0'.repeat(64)}`,
        legId: 'checker-decide',
        subjectRef: SUBJECT,
        contentDigest: `sha256:${'1'.repeat(64)}`,
        priorRecordRefs: [
          { recordId: 'rec-ml-1', chainHead: `sha256:${'a'.repeat(64)}`, legId: 'maker-decide' },
        ],
        priorLegActors: [{ principal: 'maker:1', authority: 'session:test-app' }],
      },
    },
  ]);
  const record = replay(withRefs);
  assert.deepEqual(record.priorRecordRefs, [
    { recordId: 'rec-ml-1', chainHead: `sha256:${'a'.repeat(64)}`, legId: 'maker-decide' },
  ]);
  assert.deepEqual(record.priorLegActors, [
    { principal: 'maker:1', authority: 'session:test-app' },
  ]);

  const without = buildChain('rec-ml-7', [
    {
      kind: 'opened',
      payload: {
        profileId: 'test.twoleg.v1',
        profileDigest: `sha256:${'0'.repeat(64)}`,
        legId: 'maker-decide',
        subjectRef: SUBJECT,
        contentDigest: `sha256:${'1'.repeat(64)}`,
      },
    },
  ]);
  const plain = replay(without);
  assert.equal('priorRecordRefs' in plain, false);
  assert.equal('priorLegActors' in plain, false);
});

// === the sequencing rung: open()'s real priorRecordRefs (first step-4 increment) ======

const CONTENT = { subject: 'week-1', total: 40 };

/** Opens+finalizes the maker leg of twoLegProfile(); returns ids and the maker's head.
 * (`AgentSurface`/`OperatorSurface` type imports join the file's top — the same handles
 * shape helpers/profiles.ts's openRecord takes.) */
async function makerConcluded(
  handles: { agent: AgentSurface; operator: OperatorSurface },
  store: MemoryStore,
  profileId = 'test.twoleg.v1',
) {
  const makerId = await openRecord(handles, CONTENT, profileId, SUBJECT, 'maker-decide');
  const done = await handles.operator.finalize(makerId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the maker leg must confirm');
  const chain = await store.readChain(makerId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  return { makerId, makerHead: transitionDigest(last) };
}

test('the two-leg happy path: maker concludes terminal, the pair releases, the checker opens with the verified ref', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile()], { store }));
  const { makerId, makerHead } = await makerConcluded(handles, store);

  // A non-final-leg confirmed is TERMINAL by the derivation — the C1 hold releases:
  assert.equal(await store.findNonTerminal('test.twoleg.v1', SUBJECT), null);

  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;

  // KEY-SET PIN on the successor's opened snapshot (SPEC §4): the five base keys plus
  // the two evidence keys, present together — and nothing else.
  const successorChain = await store.readChain(opened.value.recordId);
  const genesis = successorChain[0];
  assert.ok(genesis !== undefined);
  assert.deepEqual(Object.keys(genesis.payload as object).sort(), [
    'contentDigest',
    'legId',
    'priorLegActors',
    'priorRecordRefs',
    'profileDigest',
    'profileId',
    'subjectRef',
  ]);
  const payload = genesis.payload as {
    priorRecordRefs: { recordId: string; chainHead: string; legId: string }[];
    priorLegActors: { principal: string; authority: string }[];
  };
  // The recorded three-field form — the library ADDED the legId it verified:
  assert.deepEqual(payload.priorRecordRefs, [
    { recordId: makerId, chainHead: makerHead, legId: 'maker-decide' },
  ]);
  // The derived actor is the maker leg's finalizing identity, paired by index:
  assert.deepEqual(payload.priorLegActors, [
    { principal: 'approver:1', authority: 'session:test-app' },
  ]);
  // And replay folds both onto the record:
  const rec = await handles.operator.getRecord(opened.value.recordId);
  assert.deepEqual(rec?.priorRecordRefs, payload.priorRecordRefs);
  assert.deepEqual(rec?.priorLegActors, payload.priorLegActors);

  // The checker leg concludes the decision:
  const done = await handles.operator.finalize(opened.value.recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
});

test('open() refuses prior-leg-unverified for every bad reference, and no record is created', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile()], { store }));
  const { makerId, makerHead } = await makerConcluded(handles, store);

  async function openChecker(opts: Parameters<typeof handles.operator.open>[1]) {
    const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
    assert.equal(staged.status, 'ok');
    if (staged.status !== 'ok') throw new Error('unreachable');
    return handles.operator.open(staged.value.stagedRef, opts);
  }

  // No refs at all for a successor:
  let out = await openChecker(undefined);
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');
  // Too many:
  out = await openChecker({
    priorRecordRefs: [
      { recordId: makerId, chainHead: makerHead },
      { recordId: makerId, chainHead: makerHead },
    ],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');
  // Unknown recordId:
  out = await openChecker({
    priorRecordRefs: [{ recordId: 'rec-none', chainHead: makerHead }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');
  // Head mismatch:
  out = await openChecker({
    priorRecordRefs: [{ recordId: makerId, chainHead: `sha256:${'f'.repeat(64)}` }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');

  // NO successor record was created by any of the refusals — the pair still has no
  // non-terminal holder and no due entries beyond none:
  assert.equal(await store.findNonTerminal('test.twoleg.v1', SUBJECT), null);
});

test('a first leg supplying refs refuses prior-leg-unverified — §10.1 names it a sequencing error', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile()], { store }));
  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'maker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: 'rec-any', chainHead: `sha256:${'a'.repeat(64)}` }],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'prior-leg-unverified');
});

test('a still-open, an expired, and a refused-terminal prior each refuse prior-leg-unverified', async () => {
  // still-open — the maker has not concluded:
  const storeA = new MemoryStore();
  const a = create(makeConfig([twoLegProfile()], { store: storeA }));
  const openMaker = await openRecord(a, CONTENT, 'test.twoleg.v1', SUBJECT, 'maker-decide');
  const openChain = await storeA.readChain(openMaker);
  const openLast = openChain.at(-1);
  assert.ok(openLast !== undefined);
  let staged = await a.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  let out = await a.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: openMaker, chainHead: transitionDigest(openLast) }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');

  // expired — the maker lapsed and finalize resolved it en passant:
  const clock = { t: Date.UTC(2026, 0, 1) };
  const storeB = new MemoryStore();
  const b = createWithClock(
    makeConfig([twoLegProfile()], { store: storeB }),
    () => new Date(clock.t),
  );
  const lapsedMaker = await openRecord(b, CONTENT, 'test.twoleg.v1', SUBJECT, 'maker-decide');
  clock.t += 400 * 3600_000;
  const lapsed = await b.operator.finalize(lapsedMaker, identity(), CONTENT, facts());
  assert.equal(lapsed.status, 'refused', 'fixture: the lapsed maker resolves to expired');
  const expiredChain = await storeB.readChain(lapsedMaker);
  const expiredLast = expiredChain.at(-1);
  assert.ok(expiredLast !== undefined);
  assert.equal(expiredLast.kind, 'expired');
  staged = await b.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  out = await b.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: lapsedMaker, chainHead: transitionDigest(expiredLast) }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');

  // refused-terminal — the maker leg lists content-drift terminal and drifts:
  const storeC = new MemoryStore();
  const drifting = twoLegProfile();
  const makerLeg = drifting.legs[0];
  assert.ok(makerLeg !== undefined);
  drifting.legs[0] = { ...makerLeg, terminalRefusals: ['content-drift'] };
  const c = create(makeConfig([drifting], { store: storeC }));
  const draftId = await openRecord(c, CONTENT, 'test.twoleg.v1', SUBJECT, 'maker-decide');
  const drifted = await c.operator.finalize(
    draftId,
    identity(),
    { subject: 'week-1', total: 99 },
    facts(),
  );
  assert.equal(drifted.status, 'refused', 'fixture: drifted content refuses terminal');
  const refusedChain = await storeC.readChain(draftId);
  const refusedLast = refusedChain.at(-1);
  assert.ok(refusedLast !== undefined);
  assert.equal(refusedLast.kind, 'refused');
  staged = await c.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  out = await c.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: draftId, chainHead: transitionDigest(refusedLast) }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');
});

test('a wrong-profile and a wrong-subject prior each refuse prior-leg-unverified', async () => {
  const store = new MemoryStore();
  const handles = create(
    makeConfig([twoLegProfile(), twoLegProfile({ id: 'test.twoleg.other.v1' })], { store }),
  );
  // wrong profile: a maker concluded under the OTHER profile id, same subject:
  const other = await makerConcluded(handles, store, 'test.twoleg.other.v1');
  let staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  let out = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: other.makerId, chainHead: other.makerHead }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');

  // wrong subject: a maker concluded for a DIFFERENT subject under the same profile:
  const otherSubject = await openRecord(
    handles,
    CONTENT,
    'test.twoleg.v1',
    'subject:ml-2',
    'maker-decide',
  );
  const done = await handles.operator.finalize(otherSubject, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const chain = await store.readChain(otherSubject);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  out = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: otherSubject, chainHead: transitionDigest(last) }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');
});

test('a three-leg profile: refs out of leg order refuse; in order they verify', async () => {
  const store = new MemoryStore();
  const threeLeg: ConfirmProfile = {
    ...twoLegProfile({ id: 'test.threeleg.v1' }),
    legs: [
      { id: 'maker-decide', allowedAuthorities: ['session:test-app'] },
      { id: 'checker-decide', allowedAuthorities: ['session:test-app'] },
      { id: 'signer-decide', allowedAuthorities: ['session:test-app'] },
    ],
  };
  const handles = create(makeConfig([threeLeg], { store }));
  const maker = await makerConcluded(handles, store, 'test.threeleg.v1');
  // The middle leg is itself a successor — it opens WITH the maker ref:
  const stagedChecker = await handles.agent.stage(
    CONTENT,
    'test.threeleg.v1',
    SUBJECT,
    'checker-decide',
  );
  assert.equal(stagedChecker.status, 'ok');
  if (stagedChecker.status !== 'ok') return;
  const checkerOpened = await handles.operator.open(stagedChecker.value.stagedRef, {
    priorRecordRefs: [{ recordId: maker.makerId, chainHead: maker.makerHead }],
  });
  assert.equal(checkerOpened.status, 'ok', 'fixture: the middle leg opens with the maker ref');
  if (checkerOpened.status !== 'ok') return;
  const checkerId = checkerOpened.value.recordId;
  const done = await handles.operator.finalize(checkerId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const checkerChain = await store.readChain(checkerId);
  const checkerLast = checkerChain.at(-1);
  assert.ok(checkerLast !== undefined);
  const checkerHead = transitionDigest(checkerLast);

  const staged = await handles.agent.stage(CONTENT, 'test.threeleg.v1', SUBJECT, 'signer-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  // Out of order — [checker, maker] where the profile declares [maker, checker]:
  const reversed = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [
      { recordId: checkerId, chainHead: checkerHead },
      { recordId: maker.makerId, chainHead: maker.makerHead },
    ],
  });
  assert.equal(reversed.status, 'refused');
  if (reversed.status === 'refused') assert.equal(reversed.code, 'prior-leg-unverified');

  // In order — verifies, and the recorded refs carry both legIds in order:
  const staged2 = await handles.agent.stage(CONTENT, 'test.threeleg.v1', SUBJECT, 'signer-decide');
  assert.equal(staged2.status, 'ok');
  if (staged2.status !== 'ok') return;
  const opened = await handles.operator.open(staged2.value.stagedRef, {
    priorRecordRefs: [
      { recordId: maker.makerId, chainHead: maker.makerHead },
      { recordId: checkerId, chainHead: checkerHead },
    ],
  });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;
  const rec = await handles.operator.getRecord(opened.value.recordId);
  assert.deepEqual(
    rec?.priorRecordRefs?.map((r) => r.legId),
    ['maker-decide', 'checker-decide'],
  );
});
