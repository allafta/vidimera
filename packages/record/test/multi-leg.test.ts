// @vidimera/record — multi-leg.test.ts (SPEC §10.1 "Maker-checker / separation of
// duties", the sequencing-and-references half; §4's opened snapshot): the first step-4
// increment's file. This file owns the verifier pins, the sequencing-rung pins, and the
// interplay pins; the SoD gate's pins are the second step-4 increment's.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import { replay } from '../src/chain/replay.js';
import type { ConfirmProfile } from '../src/config.js';
import type { ResolvedProfile } from '../src/create.js';
import { verifyPriorLegs } from '../src/kernel/prior-legs.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Transition } from '../src/types.js';
import { buildChain } from './helpers/chain.js';
import { DEFAULT_CANONICALIZER_REF, tamperNonLast } from './helpers/profiles.js';
import { TamperingStore } from './helpers/stores.js';

const SUBJECT = 'subject:ml-1';

/** A hand-built two-leg profile OBJECT (never passed through create() in this task —
 * the GOVERNED legs guard still throws there until the sequencing rung lands with it). */
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
