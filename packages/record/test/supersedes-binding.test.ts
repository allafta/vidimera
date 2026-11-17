// @vidimera/record — supersedes-binding.test.ts: recovery (`supersedes`) verifies a predecessor
// only when the instance HOLDS the predecessor's profile — the registered id AND a projection
// that digests to the genesis profileDigest (kernel/held-profile.ts) — for EVERY terminal state,
// as SPEC §4's fold sentence says of the two cross-record verifications. The recorded route this
// closes: the held check ran for a `confirmed` predecessor only, so a forged terminal chain
// naming a profile the instance never held verified, and bound into a new record's genesis.
// The honest bound, in the same breath: an instance that holds the profile still verifies at AL1
// only (a forger who rewrites a genesis consistently onto a held, non-signing profile is not
// stopped here), and recovery now needs the predecessor's profile kept registered.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { transitionDigest } from '../src/chain/encoding.js';
import type { ConfirmProfile } from '../src/config.js';
import { create, createWithClock } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Transition } from '../src/types.js';
import { buildChain } from './helpers/chain.js';
import {
  captureProfile,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const WRONG = { subject: 'week-1', total: 41 };
const ID = 'test.supersedes.binding.v1';
const D1 = `sha256:${'1'.repeat(64)}`;
const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);

type Handles = ReturnType<typeof create>;

function lastOf(chain: Transition[]): Transition {
  const t = chain.at(-1);
  if (t === undefined) throw new Error('fixture: empty chain');
  return t;
}

/** A forged declined chain written straight into the store: an opened genesis and a declined edge. */
async function forgeDeclined(
  store: MemoryStore,
  recordId: string,
  profileId: string,
  profileDigest: string,
  subject: string,
): Promise<void> {
  const chain = buildChain(recordId, [
    {
      kind: 'opened',
      payload: {
        profileId,
        profileDigest,
        legId: 'approver-decide',
        subjectRef: subject,
        contentDigest: D1,
      },
    },
    { kind: 'declined', payload: { actor: identity() } },
  ]);
  for (const [i, t] of chain.entries()) {
    const r = await store.appendTransition(i === 0 ? null : 'open', t, {
      nonTerminal: i < chain.length - 1,
    });
    assert.equal((r as { appended: boolean }).appended, true, `fixture: forged append ${i}`);
  }
}

async function claim(
  h: Handles,
  store: MemoryStore,
  predecessorId: string,
  subject: string,
  profileId = ID,
) {
  const head = transitionDigest(lastOf(await store.readChain(predecessorId)));
  const staged = await h.agent.stage(CONTENT, profileId, subject);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') throw new Error('fixture: stage failed');
  return h.operator.open(staged.value.stagedRef, {
    supersedes: { recordId: predecessorId, chainHead: head },
  });
}

function assertUnverified(out: unknown, what: string): void {
  const o = out as { status: string; code?: string; class?: string; transitionRef?: unknown };
  assert.equal(o.status, 'refused', what);
  assert.equal(o.code, 'supersedes-unverified', what);
  assert.equal(o.class, 'refusal', what);
  assert.equal(o.transitionRef, undefined, `${what}: never-append — no record, no ref`);
}

test('a forged declined chain naming an unregistered profile id refuses supersedes-unverified — no record is created', async () => {
  const store = new MemoryStore();
  const holder = create(makeConfig([captureProfile({ id: ID, decline: true })], { store }));
  await forgeDeclined(store, 'forged-sb-1', 'test.never.registered.v1', D1, 'subject:sb-1');

  assertUnverified(await claim(holder, store, 'forged-sb-1', 'subject:sb-1'), 'unregistered id');
  assert.equal(
    await store.findNonTerminal(ID, 'subject:sb-1'),
    null,
    'the refusal created nothing',
  );
  // The subject is still free: a plain open succeeds.
  await openRecord(holder, CONTENT, ID, 'subject:sb-1');
});

test('a forged declined chain naming a registered id with a non-matching profileDigest refuses supersedes-unverified', async () => {
  const store = new MemoryStore();
  const holder = create(makeConfig([captureProfile({ id: ID, decline: true })], { store }));
  await forgeDeclined(store, 'forged-sb-2', ID, `sha256:${'9'.repeat(64)}`, 'subject:sb-2');

  assertUnverified(await claim(holder, store, 'forged-sb-2', 'subject:sb-2'), 'mismatched digest');
  assert.equal(
    await store.findNonTerminal(ID, 'subject:sb-2'),
    null,
    'the refusal created nothing',
  );
  await openRecord(holder, CONTENT, ID, 'subject:sb-2');
});

interface StateCase {
  state: string;
  profile: (overrides: { ttl?: number }) => ConfirmProfile;
  drive: (h: Handles, recordId: string, clock: { t: number }) => Promise<void>;
}

const capture = (o: { ttl?: number }) =>
  captureProfile({ id: ID, decline: true, terminalRefusals: ['content-drift'], ...o });
const effect = (o: { ttl?: number }) =>
  effectSeamProfile({ id: ID, decline: true, terminalRefusals: ['content-drift'], ...o });
const REDEEM_BOUND = effect({}).redeem?.redeemBound ?? Number.NaN;

const CASES: StateCase[] = [
  {
    state: 'refused',
    profile: capture,
    drive: async (h, id) => {
      const out = await h.operator.finalize(id, identity(), WRONG, facts());
      assert.equal(out.status, 'refused');
    },
  },
  {
    state: 'expired',
    profile: capture,
    drive: async (h, id, clock) => {
      clock.t += 2 * 3600_000;
      const out = await h.operator.finalize(id, identity(), CONTENT, facts());
      assert.equal(out.status, 'refused');
    },
  },
  {
    state: 'declined',
    profile: capture,
    drive: async (h, id) => {
      assert.equal((await h.operator.decline(id, identity(), CONTENT, facts())).status, 'ok');
    },
  },
  {
    state: 'redeemed',
    profile: effect,
    drive: async (h, id) => {
      assert.equal((await h.operator.finalize(id, identity(), CONTENT, facts())).status, 'ok');
      assert.equal((await h.operator.redeem(id, CONTENT)).status, 'ok');
    },
  },
  {
    state: 'redemption-failed',
    profile: effect,
    drive: async (h, id, clock) => {
      assert.equal((await h.operator.finalize(id, identity(), CONTENT, facts())).status, 'ok');
      const begun = await h.operator.beginRedemption(id, CONTENT);
      assert.equal(begun.status, 'ok');
      if (begun.status !== 'ok') return;
      clock.t += (REDEEM_BOUND + 10) * 1000;
      const out = await h.operator.completeRedemption(id, begun.value.token, CONTENT);
      assert.equal(out.status, 'refused');
    },
  },
  {
    state: 'confirmed',
    profile: capture,
    drive: async (h, id) => {
      assert.equal((await h.operator.finalize(id, identity(), CONTENT, facts())).status, 'ok');
    },
  },
];

for (const c of CASES) {
  test(`every terminal state the fixtures reach verifies for the holder and refuses for a same-id instance at a different digest: ${c.state}`, async () => {
    const clock = { t: T0 };
    const store = new MemoryStore();
    const now = () => new Date(clock.t);
    const holder = createWithClock(makeConfig([c.profile({})], { store }), now);
    const sibling = createWithClock(makeConfig([c.profile({ ttl: 60 })], { store }), now);
    const subject = `subject:sb-state-${c.state}`;

    const predecessorId = await openRecord(holder, CONTENT, ID, subject);
    await c.drive(holder, predecessorId, clock);
    const state = (await holder.operator.getRecord(predecessorId))?.state;
    assert.equal(state, c.state, 'fixture: the predecessor reached the named terminal state');

    assertUnverified(await claim(sibling, store, predecessorId, subject), `${c.state}: sibling`);
    assert.equal(await store.findNonTerminal(ID, subject), null, 'the refusal created nothing');

    const out = await claim(holder, store, predecessorId, subject);
    assert.equal(out.status, 'ok', `${c.state}: the holder recovers`);
  });
}

test("escalation: an instance holding both the declined record's profile and a stricter one supersedes under the stricter one", async () => {
  const store = new MemoryStore();
  const plain = captureProfile({ id: ID, decline: true });
  const strictId = 'test.supersedes.binding.strict.v1';
  const strict = captureProfile({ id: strictId, decline: true });
  const leg = strict.legs[0];
  assert.ok(leg !== undefined);
  strict.legs[0] = { ...leg, ackMode: 'any' as const, requiredAcks: ['variance'] };

  const first = create(makeConfig([plain], { store }));
  const declinedId = await openRecord(first, CONTENT, ID, 'subject:sb-esc');
  assert.equal(
    (await first.operator.decline(declinedId, identity(), CONTENT, facts())).status,
    'ok',
  );

  const both = create(makeConfig([plain, strict], { store }));
  const out = await claim(both, store, declinedId, 'subject:sb-esc', strictId);
  assert.equal(out.status, 'ok', "escalation verifies: the predecessor's profile is held");
  if (out.status !== 'ok') return;
  const rec = await both.operator.getRecord(out.value.recordId);
  assert.equal(rec?.profileId, strictId, 'the successor was opened under the stricter profile');

  // The stricter profile alone does not hold the predecessor's: it refuses.
  const declined2 = await openRecord(first, CONTENT, ID, 'subject:sb-esc-2');
  assert.equal(
    (await first.operator.decline(declined2, identity(), CONTENT, facts())).status,
    'ok',
  );
  const onlyStrict = create(makeConfig([strict], { store }));
  assertUnverified(
    await claim(onlyStrict, store, declined2, 'subject:sb-esc-2', strictId),
    'only the stricter profile registered',
  );
});

test("a registry without the predecessor's id refuses; re-registering the id unchanged recovers", async () => {
  const store = new MemoryStore();
  const plain = captureProfile({ id: ID, decline: true });
  const otherId = 'test.supersedes.binding.other.v1';
  const other = captureProfile({ id: otherId });

  const first = create(makeConfig([plain], { store }));
  const declinedId = await openRecord(first, CONTENT, ID, 'subject:sb-reg');
  assert.equal(
    (await first.operator.decline(declinedId, identity(), CONTENT, facts())).status,
    'ok',
  );

  const without = create(makeConfig([other], { store }));
  assertUnverified(
    await claim(without, store, declinedId, 'subject:sb-reg', otherId),
    'registry lacks the predecessor id',
  );
  assert.equal(await store.findNonTerminal(otherId, 'subject:sb-reg'), null);

  const restored = create(makeConfig([other, plain], { store }));
  const out = await claim(restored, store, declinedId, 'subject:sb-reg', otherId);
  assert.equal(out.status, 'ok', 're-registering the id unchanged restores recovery');
});
