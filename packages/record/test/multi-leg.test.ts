// @vidimera/record — multi-leg.test.ts (SPEC §10.1 "Maker-checker / separation of
// duties", both halves; §4's opened snapshot): the first step-4 increment's file, joined
// by the second. This file owns the verifier pins, the sequencing-rung pins, the
// interplay pins (first step-4 increment), and the SoD gate's pins at finalize's rung 3.5
// (second step-4 increment) — both halves of §10.1 now.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { AgentSurface } from '../src/agent-surface.js';
import { transitionDigest } from '../src/chain/encoding.js';
import { replay } from '../src/chain/replay.js';
import type { ConfirmProfile, LegSpec } from '../src/config.js';
import type { KernelContext, ResolvedProfile } from '../src/create.js';
import { create, createWithClock } from '../src/create.js';
import { verifyPriorLegs } from '../src/kernel/prior-legs.js';
import type { OperatorSurface } from '../src/operator-surface.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Store } from '../src/store/store.js';
import type { Transition } from '../src/types.js';
import { buildChain } from './helpers/chain.js';
import {
  captureProfile,
  DEFAULT_CANONICALIZER_REF,
  DEFAULT_SUBJECT_REF,
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

/** A minimal KernelContext over a bare `store`, for `verifyPriorLegs` unit tests below
 * that exercise it directly rather than through `create()` (the AL2 enforcement
 * increment widened its signature to accept `ctx` — `signatureLayerHolds` needs
 * `ctx.profiles`/`ctx.signing`). None of these fixtures declare `signing: true`, and the
 * empty `profiles` map here makes `signatureLayerHolds` read the layer as not applying
 * regardless (an unregistered profileId is the id-resolution posture), so behavior is
 * unchanged from before this widening. */
function ctxOf(store: Store): KernelContext {
  return {
    store,
    profiles: new Map(),
    now: () => new Date(),
    mintId: () => 'unused',
    tokenSource: () => 'unused',
  };
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
  assert.deepEqual(await verifyPriorLegs(ctxOf(store), resolved, 0, SUBJECT, undefined), {
    ok: true,
    verified: null,
  });
  assert.deepEqual(await verifyPriorLegs(ctxOf(store), resolved, 0, SUBJECT, []), {
    ok: true,
    verified: null,
  });
  // §10.1: "supplying any is itself a sequencing error that refuses `prior-leg-unverified`"
  // — the caller maps { ok: false } to that code.
  const any = [{ recordId: 'r-x', chainHead: `sha256:${'a'.repeat(64)}` }];
  assert.deepEqual(await verifyPriorLegs(ctxOf(store), resolved, 0, SUBJECT, any), { ok: false });
});

test('verifyPriorLegs: the happy reference — three-field ref recorded, actor derived, paired by index', async () => {
  const store = new MemoryStore();
  const chain = makerConfirmedChain('rec-ml-1');
  await seed(store, chain, false); // confirmed non-final leg: terminal
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  const head = transitionDigest(last);

  const res = await verifyPriorLegs(ctxOf(store), resolvedOf(twoLegShape()), 1, SUBJECT, [
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
    await verifyPriorLegs(ctxOf(store), resolved, 1, SUBJECT, [
      { recordId: 'rec-none', chainHead: head },
    ]),
    { ok: false },
  );
  // head mismatch (a wrong claimed head):
  assert.deepEqual(
    await verifyPriorLegs(ctxOf(store), resolved, 1, SUBJECT, [
      { recordId: 'rec-ml-2', chainHead: `sha256:${'f'.repeat(64)}` },
    ]),
    { ok: false },
  );
  // wrong subject:
  assert.deepEqual(
    await verifyPriorLegs(ctxOf(store), resolved, 1, 'subject:other', [
      { recordId: 'rec-ml-2', chainHead: head },
    ]),
    { ok: false },
  );
  // count mismatch — too few for a third leg, too many for a second:
  assert.deepEqual(
    await verifyPriorLegs(ctxOf(store), resolved, 2, SUBJECT, [
      { recordId: 'rec-ml-2', chainHead: head },
    ]),
    { ok: false },
  );
  assert.deepEqual(
    await verifyPriorLegs(ctxOf(store), resolved, 1, SUBJECT, [
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
    await verifyPriorLegs(ctxOf(store), resolvedOf(twoLegShape()), 1, SUBJECT, [
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
    await verifyPriorLegs(ctxOf(tampering), resolvedOf(twoLegShape()), 1, SUBJECT, [
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
    verifyPriorLegs(ctxOf(store), resolvedOf(twoLegShape()), 1, SUBJECT, [
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

  // NO successor record was created by any of the refusals — the pair has no non-terminal holder:
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

// === the interplay and posture pins (first step-4 increment) ===================

test('a sealed prior still verifies — §10.1: state, not status, is the check', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile()], { store }));
  const { makerId, makerHead } = await makerConcluded(handles, store);
  const sealed = await handles.operator.seal(makerId);
  assert.equal(sealed.status, 'ok', 'fixture: a terminal maker seals');
  if (sealed.status !== 'ok') return;
  assert.equal(sealed.value.status, 'retired');

  // The seal() append moved the chain head — the reference must claim the CURRENT head:
  const chain = await store.readChain(makerId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: transitionDigest(last) }],
  });
  assert.equal(opened.status, 'ok', 'a sealed prior replays confirmed and verifies');

  // And the PRE-seal head no longer verifies (head equality is against the recomputed
  // current head) — the stale-head shape:
  const staged2 = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged2.status, 'ok');
  if (staged2.status !== 'ok') return;
  const stale = await handles.operator.open(staged2.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(stale.status, 'refused');
  if (stale.status === 'refused') assert.equal(stale.code, 'prior-leg-unverified');
});

test('the destroyed-prior stand-in: a reference into a store that lacks the chain refuses', async () => {
  // No destroy seam exists in this build (§13 retention is the host's); the nearest
  // constructible shape is a fresh store that never held the prior — named as the
  // stand-in for §10.1's "a destroyed one does not".
  const emptyStore = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile()], { store: emptyStore }));
  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: 'rec-destroyed', chainHead: `sha256:${'d'.repeat(64)}` }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');
});

test('a two-leg EFFECT-SEAM profile: maker confirmed is terminal, checker confirmed awaits redemption', async () => {
  const store = new MemoryStore();
  const effectTwoLeg: ConfirmProfile = {
    ...twoLegProfile({ id: 'test.twoleg.effect.v1' }),
    redeem: { confirmToRedeem: 3600, redeemBound: 86400 },
  };
  const handles = create(makeConfig([effectTwoLeg], { store }));
  const { makerId, makerHead } = await makerConcluded(handles, store, 'test.twoleg.effect.v1');
  // NON-final leg + effect seam: still terminal — the derivation keys on finalLeg:
  assert.equal(await store.findNonTerminal('test.twoleg.effect.v1', SUBJECT), null);

  const staged = await handles.agent.stage(
    CONTENT,
    'test.twoleg.effect.v1',
    SUBJECT,
    'checker-decide',
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;
  const done = await handles.operator.finalize(opened.value.recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  // FINAL leg + effect seam: non-terminal, awaiting redemption — the hold is real:
  assert.equal(
    await store.findNonTerminal('test.twoleg.effect.v1', SUBJECT),
    opened.value.recordId,
  );
  const redeemed = await handles.operator.redeem(opened.value.recordId, CONTENT);
  assert.equal(redeemed.status, 'ok', 'the direct shape releases the final leg');
});

test('gate order: unknown-leg outranks prior-leg-unverified at open()', async () => {
  // The open()-side unknown-leg producer is the staged-legId RE-check: stage under a
  // config whose profile knows the leg, open under a second create() sharing the store
  // whose same-id profile renamed its legs (the established two-instance shape).
  const store = new MemoryStore();
  const stagingSide = create(makeConfig([twoLegProfile()], { store }));
  const staged = await stagingSide.agent.stage(
    CONTENT,
    'test.twoleg.v1',
    SUBJECT,
    'checker-decide',
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;

  const renamed = twoLegProfile();
  renamed.legs = [
    { id: 'maker-decide', allowedAuthorities: ['session:test-app'] },
    { id: 'checker-renamed', allowedAuthorities: ['session:test-app'] },
  ];
  const openingSide = create(makeConfig([renamed], { store }));
  const out = await openingSide.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: 'rec-any', chainHead: `sha256:${'a'.repeat(64)}` }],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'unknown-leg', 'the staged-legId re-check precedes sequencing');
});

test('gate order: prior-leg-unverified outranks the C1 blocker path — and no clock edge lands on the blocker', async () => {
  const clock = { t: Date.UTC(2026, 0, 1) };
  const store = new MemoryStore();
  const handles = createWithClock(
    makeConfig([twoLegProfile()], { store }),
    () => new Date(clock.t),
  );
  // A maker record left OPEN holds the pair; let its open window lapse:
  const makerId = await openRecord(handles, CONTENT, 'test.twoleg.v1', SUBJECT, 'maker-decide');
  clock.t += 400 * 3600_000;
  const before = (await store.readChain(makerId)).length;

  // A checker open with a BAD ref (the still-open maker cannot verify): sequencing
  // refuses pre-record, so the genesis append never happens, the exclusivity conflict
  // never fires, and the due-open blocker is NOT resolved en passant here.
  const makerChain = await store.readChain(makerId);
  const makerLast = makerChain.at(-1);
  assert.ok(makerLast !== undefined);
  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: transitionDigest(makerLast) }],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'prior-leg-unverified');
  assert.equal((await store.readChain(makerId)).length, before, 'no edge on the blocker');
});

test('verified references do not bypass C1: a live successor still blocks a second one', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile()], { store }));
  const { makerId, makerHead } = await makerConcluded(handles, store);
  const staged1 = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged1.status, 'ok');
  if (staged1.status !== 'ok') return;
  const first = await handles.operator.open(staged1.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(first.status, 'ok');

  const staged2 = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged2.status, 'ok');
  if (staged2.status !== 'ok') return;
  const second = await handles.operator.open(staged2.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(second.status, 'refused');
  if (second.status !== 'refused') return;
  assert.equal(
    second.code,
    'record-exists',
    'good refs verify but the live checker holds the pair',
  );
});

test('single-leg chains stay byte-shaped: the opened payload key set gains nothing', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const chain = await store.readChain(recordId);
  const genesis = chain[0];
  assert.ok(genesis !== undefined);
  assert.deepEqual(Object.keys(genesis.payload as object).sort(), [
    'contentDigest',
    'legId',
    'profileDigest',
    'profileId',
    'subjectRef',
  ]);
});

// === the SoD gate: finalize's rung 3.5 (second step-4 increment) ===

/** twoLegProfile with the checker leg extended (sod / proposer / terminalRefusals). */
function gatedTwoLeg(checkerExtra: Partial<LegSpec>, id = 'test.twoleg.v1'): ConfirmProfile {
  const p = twoLegProfile({ id });
  const checker = p.legs[1];
  if (checker === undefined) throw new Error('fixture: twoLegProfile has two legs');
  p.legs[1] = { ...checker, ...checkerExtra };
  return p;
}

test("sod.notActorOf: the maker's actor may not decide the checker leg; a different principal may", async () => {
  const store = new MemoryStore();
  const handles = create(
    makeConfig([gatedTwoLeg({ sod: { notActorOf: ['maker-decide'] } })], { store }),
  );
  const { makerId, makerHead } = await makerConcluded(handles, store);
  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;
  const checkerId = opened.value.recordId;
  const before = (await store.readChain(checkerId)).length;

  // makerConcluded finalized the maker leg with identity() — principal 'approver:1'.
  const blocked = await handles.operator.finalize(checkerId, identity(), CONTENT, facts());
  assert.equal(blocked.status, 'refused');
  if (blocked.status !== 'refused') return;
  assert.equal(blocked.code, 'sod-violation');
  assert.equal(blocked.transitionRef, undefined, 'default path: no appended edge');
  assert.equal((await store.readChain(checkerId)).length, before, 'the record stays open');

  // The default-open recovery: a DIFFERENT principal decides — §10.1's "so a different
  // approver may decide it".
  const done = await handles.operator.finalize(
    checkerId,
    identity({ principal: 'approver:2' }),
    CONTENT,
    facts(),
  );
  assert.equal(done.status, 'ok');
});

test('comparison is by principal alone: the same principal under a second ALLOWED authority still refuses', async () => {
  const store = new MemoryStore();
  const handles = create(
    makeConfig(
      [
        gatedTwoLeg({
          sod: { notActorOf: ['maker-decide'] },
          allowedAuthorities: ['session:test-app', 'mtls:second'],
        }),
      ],
      { store },
    ),
  );
  const { makerId, makerHead } = await makerConcluded(handles, store);
  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;

  // Same principal as the maker's actor, re-authenticated under mtls: — the fail-closed
  // direction (SPEC §10.1: pair-equality would let one human re-authenticate and pass).
  const blocked = await handles.operator.finalize(
    opened.value.recordId,
    identity({ authority: 'mtls:second' }),
    CONTENT,
    facts(),
  );
  assert.equal(blocked.status, 'refused');
  if (blocked.status !== 'refused') return;
  assert.equal(blocked.code, 'sod-violation');
});

test('terminalRefusals may make sod-violation terminal: the refused edge appends with payload { code }', async () => {
  const store = new MemoryStore();
  const handles = create(
    makeConfig(
      [gatedTwoLeg({ sod: { notActorOf: ['maker-decide'] }, terminalRefusals: ['sod-violation'] })],
      { store },
    ),
  );
  const { makerId, makerHead } = await makerConcluded(handles, store);
  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;

  const blocked = await handles.operator.finalize(
    opened.value.recordId,
    identity(),
    CONTENT,
    facts(),
  );
  assert.equal(blocked.status, 'refused');
  if (blocked.status !== 'refused') return;
  assert.equal(blocked.code, 'sod-violation');
  assert.ok(blocked.transitionRef !== undefined, 'terminal path: the refused edge appended');

  const chain = await store.readChain(opened.value.recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'refused');
  assert.deepEqual(Object.keys(last.payload as object), ['code']);
  assert.equal((last.payload as { code: string }).code, 'sod-violation');
  assert.equal(
    await store.findNonTerminal('test.twoleg.v1', SUBJECT),
    null,
    'terminal — the pair releases',
  );
});

test('proposer: the designated proposer may not decide their own leg; a colleague may', async () => {
  const store = new MemoryStore();
  const p = twoLegProfile({ id: 'test.twoleg.prop.v1' });
  const maker = p.legs[0];
  if (maker === undefined) throw new Error('fixture: twoLegProfile has two legs');
  p.legs[0] = { ...maker, proposer: 'approver:1' };
  const handles = create(makeConfig([p], { store }));

  const makerId = await openRecord(
    handles,
    CONTENT,
    'test.twoleg.prop.v1',
    SUBJECT,
    'maker-decide',
  );
  const blocked = await handles.operator.finalize(makerId, identity(), CONTENT, facts());
  assert.equal(blocked.status, 'refused');
  if (blocked.status !== 'refused') return;
  assert.equal(blocked.code, 'sod-violation');

  const done = await handles.operator.finalize(
    makerId,
    identity({ principal: 'approver:2' }),
    CONTENT,
    facts(),
  );
  assert.equal(done.status, 'ok');
});

test('the lookup miss refuses: a profile drifted between open() and finalize() cannot demonstrate distinctness', async () => {
  const store = new MemoryStore();
  const stagingSide = create(
    makeConfig([gatedTwoLeg({ sod: { notActorOf: ['maker-decide'] } })], { store }),
  );
  const { makerId, makerHead } = await makerConcluded(stagingSide, store);
  const staged = await stagingSide.agent.stage(
    CONTENT,
    'test.twoleg.v1',
    SUBJECT,
    'checker-decide',
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await stagingSide.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;

  // A second instance whose same-id profile RENAMED the maker leg; the checker's sod
  // names the NEW name — construction-valid (strictly-earlier), but the record's own
  // recorded refs carry the OLD legId. Fail-closed: refuse, no append (default path).
  const drifted = create(
    makeConfig(
      [
        {
          ...twoLegProfile(),
          legs: [
            { id: 'maker-renamed', allowedAuthorities: ['session:test-app'] },
            {
              id: 'checker-decide',
              allowedAuthorities: ['session:test-app'],
              sod: { notActorOf: ['maker-renamed'] },
            },
          ],
        },
      ],
      { store },
    ),
  );
  const before = (await store.readChain(opened.value.recordId)).length;
  const blocked = await drifted.operator.finalize(
    opened.value.recordId,
    identity({ principal: 'approver:9' }),
    CONTENT,
    facts(),
  );
  assert.equal(blocked.status, 'refused');
  if (blocked.status !== 'refused') return;
  assert.equal(blocked.code, 'sod-violation');
  assert.equal((await store.readChain(opened.value.recordId)).length, before, 'no append');
});

test('a found reference with no paired actor THROWS — the recorded paired-by-index invariant is a storage fault', async () => {
  const store = new MemoryStore();
  const handles = create(
    makeConfig([gatedTwoLeg({ sod: { notActorOf: ['maker-decide'] } }, 'test.twoleg.v1')], {
      store,
    }),
  );
  // Hand-built checker record whose opened payload carries a ref but an EMPTY actors
  // array — present (so replay folds both) but unpaired at the ref's index. `at` is
  // stamped to the real "now": this file's other hand-built chains feed `verifyPriorLegs`
  // directly, never `finalize()`, so buildChain's fixed default date never mattered for
  // them — this fixture is the first to run the real gate ladder under the real clock,
  // and it must survive rung (2)'s expiry gate to reach rung 3.5.
  const chain = buildChain('rec-sod-garbled', [
    {
      kind: 'opened',
      at: new Date().toISOString(),
      payload: {
        profileId: 'test.twoleg.v1',
        profileDigest: `sha256:${'0'.repeat(64)}`,
        legId: 'checker-decide',
        subjectRef: 'subject:sod-garbled',
        contentDigest: `sha256:${'1'.repeat(64)}`,
        priorRecordRefs: [
          { recordId: 'rec-gone', chainHead: `sha256:${'a'.repeat(64)}`, legId: 'maker-decide' },
        ],
        priorLegActors: [],
      },
    },
  ]);
  await seed(store, chain, true);
  await assert.rejects(
    handles.operator.finalize('rec-sod-garbled', identity(), CONTENT, facts()),
    /no paired actor/i,
  );
});

test('gate order: (3) identity outranks (3.5) sod — a disallowed authority refuses identity-authority-refused', async () => {
  const store = new MemoryStore();
  const handles = create(
    makeConfig([gatedTwoLeg({ sod: { notActorOf: ['maker-decide'] } })], { store }),
  );
  const { makerId, makerHead } = await makerConcluded(handles, store);
  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;

  // The maker's own principal AND a disallowed authority: rung (3) wins.
  const out = await handles.operator.finalize(
    opened.value.recordId,
    identity({ authority: 'oidc:unlisted' }),
    CONTENT,
    facts(),
  );
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'identity-authority-refused');
});

test('gate order: (3.5) sod outranks (4) content-drift — the blocked actor with drifted content refuses sod-violation', async () => {
  const store = new MemoryStore();
  const handles = create(
    makeConfig([gatedTwoLeg({ sod: { notActorOf: ['maker-decide'] } })], { store }),
  );
  const { makerId, makerHead } = await makerConcluded(handles, store);
  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;

  const out = await handles.operator.finalize(
    opened.value.recordId,
    identity(),
    { subject: 'week-1', total: 999 },
    facts(),
  );
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'sod-violation');
});

test('a retried decision by the same actor on the SAME leg is not self-approval', async () => {
  // SPEC §10.1: "A retried decision by the same actor on the same leg is not
  // self-approval" — sod names only PRIOR legs, so approver:2's second attempt at the
  // checker leg passes rung 3.5 both times; only the content changed.
  const store = new MemoryStore();
  const handles = create(
    makeConfig([gatedTwoLeg({ sod: { notActorOf: ['maker-decide'] } })], { store }),
  );
  const { makerId, makerHead } = await makerConcluded(handles, store);
  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;

  const drifted = await handles.operator.finalize(
    opened.value.recordId,
    identity({ principal: 'approver:2' }),
    { subject: 'week-1', total: 999 },
    facts(),
  );
  assert.equal(drifted.status, 'refused');
  if (drifted.status !== 'refused') return;
  assert.equal(drifted.code, 'content-drift', 'fixture: the first attempt drifts, default-open');

  const retried = await handles.operator.finalize(
    opened.value.recordId,
    identity({ principal: 'approver:2' }),
    CONTENT,
    facts(),
  );
  assert.equal(retried.status, 'ok', 'the same actor retries their OWN leg and confirms');
});

test("a non-declaring multi-leg profile is untouched by the gate: the maker's actor decides the checker leg freely", async () => {
  // The byte-and-behavior control: twoLegProfile declares neither sod nor proposer, so
  // rung 3.5 is a no-op — the same actor deciding both legs was legal before the second
  // step-4 increment and stays legal.
  const store = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile()], { store }));
  const { makerId, makerHead } = await makerConcluded(handles, store);
  const staged = await handles.agent.stage(CONTENT, 'test.twoleg.v1', SUBJECT, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;
  const done = await handles.operator.finalize(opened.value.recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
});

// === content across legs: the verifier compares none — pinned as an OMISSION, not a ruling ==
//
// `verifyPriorLegs` checks a prior's intactness, signature layer, recomputed head, profileId,
// subjectRef, leg order and `confirmed` state (kernel/prior-legs.ts), and never its
// `contentDigest`, so a checker leg may open and confirm over content the maker never saw.
// Nothing on record says whether a profile's legs bind one artifact: id.ts folds the legId
// into the stagedRef precisely because two legs staging IDENTICAL content would otherwise
// collide — the derivation presumes shared content is the normal case — and nothing enforces it.
// This test pins what holds TODAY so a change in either direction is authorized rather than
// slipped in: the admission, and the fidelity property that makes it tolerable — the
// divergence is derivable from the recorded reference alone, because the successor's genesis
// pins the prior's `chainHead` and that pins the prior's own `contentDigest`. Closing the
// omission (equality at open() refusing `prior-leg-unverified`, or a per-profile switch)
// would add a condition to the verifier's spec-enumerated list and needs its own sanction; it
// would change no recorded bytes, since every pinned multi-leg flow binds identical content.

test('a checker leg opens and confirms over DIFFERENT content than the maker confirmed — admitted today, and the divergence is derivable from the recorded reference alone', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile()], { store }));
  const { makerId, makerHead } = await makerConcluded(handles, store); // the maker bound CONTENT

  const OTHER_CONTENT = { subject: 'week-1', total: 41 };
  const staged = await handles.agent.stage(
    OTHER_CONTENT,
    'test.twoleg.v1',
    SUBJECT,
    'checker-decide',
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(opened.status, 'ok', 'the verifier compares no content — the reference verifies');
  if (opened.status !== 'ok') return;
  const done = await handles.operator.finalize(
    opened.value.recordId,
    identity({ principal: 'approver:2' }),
    OTHER_CONTENT,
    facts(),
  );
  assert.equal(done.status, 'ok', "rung (4) binds the checker's OWN draft, not the maker's");

  // Fidelity: a reader holding only the successor reaches the prior's bound content through
  // the recorded reference, and sees the two legs disagree.
  const checker = replay(await store.readChain(opened.value.recordId));
  const ref = checker.priorRecordRefs?.[0];
  assert.ok(ref !== undefined, 'the successor records the verified reference');
  const priorChain = await store.readChain(ref.recordId);
  const priorHead = priorChain.at(-1);
  assert.ok(priorHead !== undefined);
  assert.equal(
    transitionDigest(priorHead),
    ref.chainHead,
    'the recorded head pins the prior chain',
  );
  const prior = replay(priorChain);
  assert.equal(prior.contentDigest, (await handles.operator.getRecord(makerId))?.contentDigest);
  assert.notEqual(
    prior.contentDigest,
    checker.contentDigest,
    'the divergence is visible from the two recorded digests alone — fidelity, not validity',
  );
});
