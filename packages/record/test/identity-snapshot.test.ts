// @vidimera/record — identity-snapshot.test.ts: what a seam validates as an identity is what
// it records. `isValidIdentity` checks the OWN enumerable keys of the object it is handed, then
// reads `principal`, `authority` and `proofRef` through ordinary property access — following
// getters and the prototype chain. Until this pin every seam then embedded the caller's object
// itself, and three serializers saw three different objects: JCS honours an inherited `toJSON`
// and walks own enumerable keys, `MemoryStore` stores a `structuredClone` (which drops the
// prototype), and the SQL backings persist `JSON.stringify`. A getter-backed or
// `Object.create`-built identity was digested and recorded as `{}`, so a `sod.notActorOf`
// successor compared its finalizer against an empty prior actor and separation of duties failed
// open; a class carrying a prototype `toJSON` recorded that view (an extra e-mail key, a
// redacted principal) on the SQL backings and broke the chain on `MemoryStore`.
//
// Pinned here: four TypeScript-legal identity shapes at every identity-taking seam, on
// `MemoryStore` and `SqliteStore`, each recorded as the plain literal of the values the seam
// validated; the literal being read once and fresh per call; separation of duties and ack
// coverage reading that literal; and the read side failing closed on a recorded prior-leg actor
// that is not a valid identity (a storage fault, never a silent SoD pass).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import type { ConfirmProfile, LegSpec } from '../src/config.js';
import { create } from '../src/create.js';
import type { Outcome } from '../src/outcome.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import type { Store } from '../src/store/store.js';
import type { Digest, IdentityAssertion, Transition } from '../src/types.js';
import {
  captureProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
  twoLegProfile,
} from './helpers/profiles.js';
import { TamperingStore } from './helpers/stores.js';

type Handles = ReturnType<typeof create>;

const CONTENT = { subject: 'week-1', total: 40 };
const DIGEST = `sha256:${'a'.repeat(64)}`;
const FLOW_ID = 'test.snapshot.flow.v1';
const APPROVER_AUTHORITY = 'session:test-app';

// --- the four identity shapes ------------------------------------------------------------

/** `principal` and `authority` are prototype getters over `#private` fields: no own keys. */
class GetterIdentity {
  readonly #principal: string;
  readonly #authority: string;
  constructor(principal: string, authority: string) {
    this.#principal = principal;
    this.#authority = authority;
  }
  get principal(): string {
    return this.#principal;
  }
  get authority(): string {
    return this.#authority;
  }
}

/** Own `principal`/`authority` fields, and a prototype `toJSON` returning a different view. */
class ToJsonViewIdentity {
  principal: string;
  authority: string;
  constructor(principal: string, authority: string) {
    this.principal = principal;
    this.authority = authority;
  }
  toJSON(): Record<string, string> {
    return { principal: '[redacted]', authority: this.authority, email: 'x@example.invalid' };
  }
}

type ShapeName = 'inherited' | 'getters' | 'nonEnumerable' | 'toJsonView';

const SHAPES: Record<ShapeName, (principal: string, authority: string) => IdentityAssertion> = {
  inherited: (principal, authority) => Object.create({ principal, authority }) as IdentityAssertion,
  getters: (principal, authority) => new GetterIdentity(principal, authority),
  nonEnumerable: (principal, authority) => {
    const o: Record<string, unknown> = { authority };
    Object.defineProperty(o, 'principal', { value: principal, enumerable: false });
    return o as unknown as IdentityAssertion;
  },
  toJsonView: (principal, authority) => new ToJsonViewIdentity(principal, authority),
};

// --- backings and profiles ----------------------------------------------------------------

type Backing = 'MemoryStore' | 'SqliteStore';

const BACKINGS: Record<Backing, () => Store> = {
  MemoryStore: () => new MemoryStore(),
  SqliteStore: () => new SqliteStore(':memory:'),
};

/** One leg reaching every identity-taking seam: decline declared, a findings flow declared. */
function flowProfile(extra?: Partial<LegSpec>): ConfirmProfile {
  const p = captureProfile({ id: FLOW_ID, decline: true });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  p.legs[0] = { ...leg, ackMode: 'any', requiredAcks: ['variance'], ...extra };
  return p;
}

function payloadOf(chain: readonly Transition[], match: (t: Transition) => boolean): unknown {
  const found = chain.find(match);
  assert.ok(found !== undefined, 'fixture: the expected transition was recorded');
  return found.payload;
}

function consultationNamed(kind: string): (t: Transition) => boolean {
  return (t) =>
    t.kind === 'consultation-recorded' && (t.payload as { kind?: unknown }).kind === kind;
}

function assertOk(out: Outcome<unknown>, what: string): void {
  assert.equal(out.status, 'ok', `${what} must succeed — ${JSON.stringify(out)}`);
}

// --- the seam matrix ------------------------------------------------------------------------

type SeamOutcome = Outcome<{ transitionRef: Digest }>;

interface Site {
  site: string;
  principal: string;
  authority: string;
  prepare?: (h: Handles, recordId: string) => Promise<void>;
  call: (h: Handles, recordId: string, who: IdentityAssertion) => Promise<SeamOutcome>;
  recorded: (chain: readonly Transition[]) => unknown;
}

const SITES: Site[] = [
  {
    site: 'finalize actor',
    principal: 'approver:snap',
    authority: APPROVER_AUTHORITY,
    call: (h, id, who) => h.operator.finalize(id, who, CONTENT, facts()),
    recorded: (chain) =>
      (payloadOf(chain, (t) => t.kind === 'confirmed') as { actor: unknown }).actor,
  },
  {
    site: 'finalize facts.checker',
    principal: 'svc:review',
    authority: 'mtls:review',
    call: (h, id, who) => h.operator.finalize(id, identity(), CONTENT, facts({ checker: who })),
    recorded: (chain) =>
      (payloadOf(chain, consultationNamed('facts')) as { checker: unknown }).checker,
  },
  {
    site: 'finalize consultation checker',
    principal: 'svc:risk',
    authority: 'mtls:risk',
    call: (h, id, who) =>
      h.operator.finalize(id, identity(), CONTENT, facts(), {
        consultations: [
          { kind: 'risk-check', checker: who, payloadDigest: DIGEST, verdict: 'pass' },
        ],
      }),
    recorded: (chain) =>
      (payloadOf(chain, consultationNamed('risk-check')) as { checker: unknown }).checker,
  },
  {
    site: 'decline actor',
    principal: 'approver:snap',
    authority: APPROVER_AUTHORITY,
    call: (h, id, who) => h.operator.decline(id, who, CONTENT, facts()),
    recorded: (chain) =>
      (payloadOf(chain, (t) => t.kind === 'declined') as { actor: unknown }).actor,
  },
  {
    site: 'raiseFinding raiser',
    principal: 'checker:snap',
    authority: 'mtls:checker',
    call: (h, id, who) =>
      h.operator.raiseFinding(
        id,
        { findingId: 'f-1', kind: 'variance', findingDigest: DIGEST },
        who,
      ),
    recorded: (chain) =>
      (payloadOf(chain, (t) => t.kind === 'finding-raised') as { raiser: unknown }).raiser,
  },
  {
    site: 'acknowledge acker',
    principal: 'approver:snap',
    authority: APPROVER_AUTHORITY,
    prepare: async (h, id) => {
      assertOk(
        await h.operator.raiseFinding(
          id,
          { findingId: 'f-1', kind: 'variance', findingDigest: DIGEST },
          identity({ principal: 'checker:1', authority: 'mtls:checker' }),
        ),
        'fixture raiseFinding',
      );
    },
    call: (h, id, who) =>
      h.operator.acknowledge(id, { findingId: 'f-1', findingDigest: DIGEST }, who),
    recorded: (chain) =>
      (payloadOf(chain, (t) => t.kind === 'acknowledged') as { acker: unknown }).acker,
  },
];

for (const backing of Object.keys(BACKINGS) as Backing[]) {
  for (const shape of Object.keys(SHAPES) as ShapeName[]) {
    for (const site of SITES) {
      test(`${site.site} records the validated literal for a ${shape} identity (${backing})`, async () => {
        const store = BACKINGS[backing]();
        const handles = create(makeConfig([flowProfile()], { store }));
        const recordId = await openRecord(
          handles,
          CONTENT,
          FLOW_ID,
          `subject:${site.site.replace(/\W+/g, '-')}-${shape}`,
        );
        if (site.prepare !== undefined) await site.prepare(handles, recordId);

        const out = await site.call(
          handles,
          recordId,
          SHAPES[shape](site.principal, site.authority),
        );
        assertOk(out, site.site);

        const chain = await store.readChain(recordId);
        assert.deepEqual(site.recorded(chain), {
          principal: site.principal,
          authority: site.authority,
        });
        assert.deepEqual(await handles.operator.verifyChain(recordId), { intact: true });
        if (out.status === 'ok') {
          assert.equal(out.value.transitionRef, await store.chainHead(recordId));
        }
      });
    }
  }
}

// --- the literal: no undefined key, one read, fresh per call ---------------------------------

async function flowRecord(subjectRef: string) {
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, FLOW_ID, subjectRef);
  return { store, handles, recordId };
}

async function recordedActor(store: Store, recordId: string): Promise<unknown> {
  const chain = await store.readChain(recordId);
  return (payloadOf(chain, (t) => t.kind === 'confirmed') as { actor: unknown }).actor;
}

test('proofRef undefined is omitted', async () => {
  const { store, handles, recordId } = await flowRecord('subject:proofref-undefined');
  const out = await handles.operator.finalize(
    recordId,
    { principal: 'approver:snap', authority: APPROVER_AUTHORITY, proofRef: undefined },
    CONTENT,
    facts(),
  );
  assertOk(out, 'finalize');
  assert.deepEqual(await recordedActor(store, recordId), {
    principal: 'approver:snap',
    authority: APPROVER_AUTHORITY,
  });
});

test('a getter read once', async () => {
  class FlippingIdentity {
    #reads = 0;
    get principal(): string {
      this.#reads += 1;
      return this.#reads === 1 ? 'alice' : 'mallory';
    }
    get authority(): string {
      return APPROVER_AUTHORITY;
    }
  }
  const { store, handles, recordId } = await flowRecord('subject:getter-once');
  const out = await handles.operator.finalize(recordId, new FlippingIdentity(), CONTENT, facts());
  assertOk(out, 'finalize');
  const actor = (await recordedActor(store, recordId)) as { principal?: unknown };
  assert.equal(actor.principal, 'alice');
});

test('mutation after the call changes nothing recorded', async () => {
  const { store, handles, recordId } = await flowRecord('subject:mutation-after');
  const who: IdentityAssertion = { principal: 'approver:snap', authority: APPROVER_AUTHORITY };
  const out = await handles.operator.finalize(recordId, who, CONTENT, facts());
  assertOk(out, 'finalize');
  who.principal = 'mallory';
  const actor = (await recordedActor(store, recordId)) as { principal?: unknown };
  assert.equal(actor.principal, 'approver:snap');
});

test('a throwing principal getter propagates', async () => {
  class ThrowingIdentity {
    get principal(): string {
      throw new Error('principal getter exploded');
    }
    get authority(): string {
      return APPROVER_AUTHORITY;
    }
  }
  const { handles, recordId } = await flowRecord('subject:getter-throws');
  await assert.rejects(
    handles.operator.finalize(recordId, new ThrowingIdentity(), CONTENT, facts()),
    /principal getter exploded/,
  );
});

// --- separation of duties and ack coverage read the literal ----------------------------------

const TWO_LEG_ID = 'test.twoleg.v1';
const TWO_LEG_SUBJECT = 'subject:snap-sod';

/** twoLegProfile with the checker leg naming the maker leg in `sod.notActorOf`. */
function sodTwoLeg(): ConfirmProfile {
  const p = twoLegProfile({ id: TWO_LEG_ID });
  const checker = p.legs[1];
  if (checker === undefined) throw new Error('fixture: twoLegProfile has two legs');
  p.legs[1] = { ...checker, sod: { notActorOf: ['maker-decide'] } };
  return p;
}

/** Opens the maker leg and confirms it as `maker`; returns its id and recomputed head. */
async function makerConfirmed(h: Handles, store: Store, maker: IdentityAssertion) {
  const makerId = await openRecord(h, CONTENT, TWO_LEG_ID, TWO_LEG_SUBJECT, 'maker-decide');
  assertOk(await h.operator.finalize(makerId, maker, CONTENT, facts()), 'maker finalize');
  const last = (await store.readChain(makerId)).at(-1);
  assert.ok(last !== undefined);
  return { makerId, makerHead: transitionDigest(last) };
}

async function openChecker(
  h: Handles,
  prior: { recordId: string; chainHead: string },
): Promise<string> {
  const staged = await h.agent.stage(CONTENT, TWO_LEG_ID, TWO_LEG_SUBJECT, 'checker-decide');
  assertOk(staged, 'checker stage');
  if (staged.status !== 'ok') throw new Error('unreachable');
  const opened = await h.operator.open(staged.value.stagedRef, { priorRecordRefs: [prior] });
  assertOk(opened, 'checker open');
  if (opened.status !== 'ok') throw new Error('unreachable');
  return opened.value.recordId;
}

test('separation of duties holds for a getter-backed maker', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([sodTwoLeg()], { store }));
  const { makerId, makerHead } = await makerConfirmed(
    handles,
    store,
    SHAPES.getters('alice', APPROVER_AUTHORITY),
  );
  const checkerId = await openChecker(handles, { recordId: makerId, chainHead: makerHead });

  const out = await handles.operator.finalize(
    checkerId,
    { principal: 'alice', authority: APPROVER_AUTHORITY },
    CONTENT,
    facts(),
  );
  assert.equal(out.status, 'refused', JSON.stringify(out));
  if (out.status === 'refused') assert.equal(out.code, 'sod-violation');
});

test('a getter-backed acker counts toward coverage', async () => {
  const { handles, recordId } = await flowRecord('subject:acker-counts');
  assertOk(
    await handles.operator.raiseFinding(
      recordId,
      { findingId: 'f-1', kind: 'variance', findingDigest: DIGEST },
      identity({ principal: 'checker:1', authority: 'mtls:checker' }),
    ),
    'raiseFinding',
  );
  assertOk(
    await handles.operator.acknowledge(
      recordId,
      { findingId: 'f-1', findingDigest: DIGEST },
      SHAPES.getters('approver:snap', APPROVER_AUTHORITY),
    ),
    'acknowledge',
  );
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assertOk(out, 'finalize under ack coverage');
});

// --- the read side fails closed ---------------------------------------------------------------

/** Re-chains every transition after `index` onto its (possibly rewritten) predecessor, so a
 * rewritten payload still verifies — the shape a storage-writing insider leaves behind. */
function relinkAfter(chain: Transition[], index: number): Transition[] {
  for (let i = index + 1; i < chain.length; i += 1) {
    const prev = chain[i - 1];
    const t = chain[i];
    if (prev === undefined || t === undefined) throw new Error('fixture: dense chain');
    chain[i] = { ...t, prevHash: transitionDigest(prev) };
  }
  return chain;
}

/** Rewrites the payload of the first transition of `kind`, then relinks what follows it. */
function rewritePayload(
  kind: Transition['kind'],
  rewrite: (payload: Record<string, unknown>) => Record<string, unknown>,
): (chain: Transition[]) => Transition[] {
  return (chain) => {
    const copy = structuredClone(chain);
    const index = copy.findIndex((t) => t.kind === kind);
    const target = copy[index];
    if (target === undefined) throw new Error(`fixture: no ${kind} transition to rewrite`);
    copy[index] = { ...target, payload: rewrite(target.payload as Record<string, unknown>) };
    return relinkAfter(copy, index);
  };
}

test('a recorded {} prior actor is a storage fault: opening the successor leg throws', async () => {
  const inner = new MemoryStore();
  const honest = create(makeConfig([sodTwoLeg()], { store: inner }));
  const { makerId } = await makerConfirmed(honest, inner, identity({ principal: 'alice' }));

  const tampering = new TamperingStore(
    inner,
    makerId,
    rewritePayload('confirmed', (payload) => ({ ...payload, actor: {} })),
  );
  const tampered = await tampering.readChain(makerId);
  const last = tampered.at(-1);
  assert.ok(last !== undefined);
  const handles = create(makeConfig([sodTwoLeg()], { store: tampering }));
  assert.deepEqual(
    await handles.operator.verifyChain(makerId),
    { intact: true },
    'fixture: the rewritten maker chain still verifies',
  );

  const staged = await handles.agent.stage(CONTENT, TWO_LEG_ID, TWO_LEG_SUBJECT, 'checker-decide');
  assertOk(staged, 'checker stage');
  if (staged.status !== 'ok') return;
  await assert.rejects(
    handles.operator.open(staged.value.stagedRef, {
      priorRecordRefs: [{ recordId: makerId, chainHead: transitionDigest(last) }],
    }),
    /garbled or foreign chain/,
  );
});

test('a recorded {} prior actor is a storage fault: a successor whose genesis priorLegActors is [{}] throws at finalize', async () => {
  const inner = new MemoryStore();
  const honest = create(makeConfig([sodTwoLeg()], { store: inner }));
  const { makerId, makerHead } = await makerConfirmed(
    honest,
    inner,
    identity({ principal: 'alice' }),
  );
  const checkerId = await openChecker(honest, { recordId: makerId, chainHead: makerHead });

  const tampering = new TamperingStore(
    inner,
    checkerId,
    rewritePayload('opened', (payload) => ({ ...payload, priorLegActors: [{}] })),
  );
  const handles = create(makeConfig([sodTwoLeg()], { store: tampering }));
  assert.deepEqual(
    await handles.operator.verifyChain(checkerId),
    { intact: true },
    'fixture: the rewritten successor chain still verifies',
  );

  await assert.rejects(
    handles.operator.finalize(
      checkerId,
      { principal: 'alice', authority: APPROVER_AUTHORITY },
      CONTENT,
      facts(),
    ),
    /prior-leg actor .* is not a valid identity — a garbled or foreign chain/,
  );
});
