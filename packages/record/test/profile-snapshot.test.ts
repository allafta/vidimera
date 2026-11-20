// @vidimera/record — profile-snapshot.test.ts: `create()` keeps a frozen plain-data SNAPSHOT of
// each profile, read once, validated once and digested once; the host's own object is never
// retained. Pins here: mutation after `create()` changes nothing; a profile that is not plain
// data throws at construction naming the shape; the snapshot's schema (unknown keys, function
// members, explicit `undefined`, a list or object in the wrong slot); the digest invariant
// (the offline `profileDigest(profile)` equals the digest a genesis binds) over this suite's
// own profiles; and the projection keeping an own `__proto__` key.
//
// The snapshot itself is internal (no export), so "frozen" and "detached" are observed through
// behaviour: mutate the host's object and watch every seam decide as before.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { transitionDigest } from '../src/chain/encoding.js';
import type { ConfirmProfile, LegSpec } from '../src/config.js';
import { create } from '../src/create.js';
import { profileDigest, projectProfile } from '../src/profile-digest.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  captureProfile,
  DEFAULT_CANONICALIZER_REF,
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  liveProfile,
  makeConfig,
  openRecord,
  twoLegProfile,
} from './helpers/profiles.js';
import { enforceableSigningSetup } from './helpers/signing.js';

const CONTENT = { subject: 'week-1', total: 40 };

/** A loosely-typed view, for fixtures that add the keys the types rule out. */
function rec(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

/** The `profileDigest` the genesis of `recordId` binds. */
async function boundDigest(store: MemoryStore, recordId: string): Promise<unknown> {
  const genesis = (await store.readChain(recordId))[0];
  assert.ok(genesis !== undefined, 'fixture: the record has a genesis');
  return (genesis.payload as { profileDigest?: unknown }).profileDigest;
}

function throwsCreate(profile: unknown, pattern: RegExp): void {
  assert.throws(
    () => create({ ...makeConfig([captureProfile()]), profiles: [profile as ConfirmProfile] }),
    pattern,
  );
}

// === mutation after create() changes nothing ===========================================

test('mutating a registered profile after create() changes no seam outcome and no bound digest', async () => {
  const store = new MemoryStore();
  const profile = twoLegProfile({ id: 'test.snapshot.mutate.v1' });
  const checker = profile.legs[1] as LegSpec;
  checker.sod = { notActorOf: ['maker-decide'] };
  checker.requiredConsultations = ['rederive'];
  const before = profileDigest(structuredClone(profile));
  const handles = create(makeConfig([profile], { store }));

  // Every mutable part a host could reach: the sod list, the consultation list, the authority
  // list, the leg id, the expiry, and the profile's own scalar.
  (checker.sod as { notActorOf: string[] }).notActorOf.length = 0;
  (checker.requiredConsultations as string[]).length = 0;
  checker.allowedAuthorities.push('session:intruder');
  checker.sod = undefined;
  delete checker.requiredConsultations;
  checker.id = 'renamed';
  (profile.expiry as { ttl: number }).ttl = 1;
  (profile as { captureMode: string }).captureMode = 'live';
  profile.legs.length = 0;

  const makerId = await openRecord(
    handles,
    CONTENT,
    'test.snapshot.mutate.v1',
    DEFAULT_SUBJECT_REF,
    'maker-decide',
  );
  assert.equal(
    await boundDigest(store, makerId),
    before,
    'the genesis binds the registered profile',
  );
  const done = await handles.operator.finalize(makerId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const chain = await store.readChain(makerId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);

  const staged = await handles.agent.stage(
    CONTENT,
    'test.snapshot.mutate.v1',
    DEFAULT_SUBJECT_REF,
    'checker-decide',
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: transitionDigest(last) }],
  });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;

  // The registered sod still bars the maker's principal; the registered consultation list
  // still gates (rederive is required and none was supplied); the registered authority list
  // still refuses the intruder authority.
  const sod = await handles.operator.finalize(opened.value.recordId, identity(), CONTENT, facts());
  assert.equal(sod.status, 'refused');
  if (sod.status === 'refused') assert.equal(sod.code, 'sod-violation');
  const intruder = await handles.operator.finalize(
    opened.value.recordId,
    identity({ principal: 'approver:2', authority: 'session:intruder' }),
    CONTENT,
    facts(),
  );
  assert.equal(intruder.status, 'refused');
  if (intruder.status === 'refused') assert.equal(intruder.code, 'identity-authority-refused');
  const gated = await handles.operator.finalize(
    opened.value.recordId,
    identity({ principal: 'approver:2' }),
    CONTENT,
    facts(),
  );
  assert.equal(gated.status, 'refused', 'the registered requiredConsultations still gates');
  assert.equal(await boundDigest(store, opened.value.recordId), before);
});

test('deleting `signing` from the host object after create() leaves the instance signing and verifySignatures matching', async () => {
  const profile = captureProfile({ id: 'test.snapshot.signing.v1' });
  profile.signing = true;
  const rig = enforceableSigningSetup([profile]);
  delete profile.signing;
  const recordId = await openRecord(
    rig.handles,
    CONTENT,
    'test.snapshot.signing.v1',
    DEFAULT_SUBJECT_REF,
  );
  const report = await rig.handles.operator.verifySignatures(recordId);
  assert.equal(report.signingDeclared, true, 'the snapshot still declares signing');
  assert.equal(report.genesisProfile.resolution, 'matches');
  assert.ok(report.transitions.every((t) => t.signed && t.verified));
});

test('the host object is not retained: a deep-frozen input is accepted, and the snapshot is a distinct copy', async () => {
  const profile = captureProfile({ id: 'test.snapshot.frozen-input.v1' });
  Object.freeze(profile.subject);
  Object.freeze(profile.legs[0]);
  Object.freeze(profile.legs);
  Object.freeze(profile);
  const store = new MemoryStore();
  const handles = create(makeConfig([profile], { store }));
  const recordId = await openRecord(
    handles,
    CONTENT,
    'test.snapshot.frozen-input.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(await boundDigest(store, recordId), profileDigest(profile));
});

test('a null-prototype profile and a null-prototype leg are plain data and construct', () => {
  const leg = Object.assign(Object.create(null), {
    id: 'approver-decide',
    allowedAuthorities: ['session:test-app'],
  }) as LegSpec;
  const profile = Object.assign(Object.create(null), {
    id: 'test.snapshot.nullproto.v1',
    subject: { canonicalizerRef: DEFAULT_CANONICALIZER_REF },
    legs: [leg],
    captureMode: 'staged',
    expiry: { ttl: 3600 },
  }) as ConfirmProfile;
  create(makeConfig([profile]));
});

// === plain data only ====================================================================

test('a class instance with getters throws at create(), naming the shape', () => {
  class Getters {
    get id() {
      return 'test.snapshot.getters.v1';
    }
    subject = { canonicalizerRef: DEFAULT_CANONICALIZER_REF };
    legs = [{ id: 'l', allowedAuthorities: ['a'] }];
    captureMode = 'staged';
    expiry = { ttl: 60 };
  }
  throwsCreate(new Getters(), /invalid profile .*class instance.*plain data/s);
});

test('an Object.create(base) profile throws at create(), naming the shape', () => {
  const base = captureProfile({ id: 'test.snapshot.inherit.v1' });
  throwsCreate(Object.create(base), /invalid profile .*non-plain prototype.*plain data/s);
});

test('an Object.create(base) leg throws, naming the leg', () => {
  const p = captureProfile({ id: 'test.snapshot.inherit-leg.v1' });
  p.legs = [Object.create(p.legs[0] as LegSpec)];
  throwsCreate(p, /invalid profile 'test\.snapshot\.inherit-leg\.v1'.*legs.*non-plain prototype/s);
});

test('an own accessor throws, naming the property', () => {
  const p = captureProfile({ id: 'test.snapshot.accessor.v1' });
  Object.defineProperty(p, 'policySource', { get: () => 'x', enumerable: true });
  throwsCreate(p, /invalid profile 'test\.snapshot\.accessor\.v1'.*policySource.*accessor/s);
});

test('a non-enumerable own `signing` throws (it would be enforced but never digested)', () => {
  const p = captureProfile({ id: 'test.snapshot.hidden.v1' });
  Object.defineProperty(p, 'signing', { value: true, enumerable: false });
  throwsCreate(p, /invalid profile 'test\.snapshot\.hidden\.v1'.*signing.*non-enumerable/s);
});

test('a sparse requiredConsultations throws, naming the shape', () => {
  const p = captureProfile({ id: 'test.snapshot.sparse.v1' });
  // biome-ignore lint/suspicious/noSparseArray: the sparse shape is the fixture.
  (p.legs[0] as LegSpec).requiredConsultations = ['a', , 'b'] as string[];
  throwsCreate(p, /invalid profile 'test\.snapshot\.sparse\.v1'.*requiredConsultations.*sparse/s);
});

test('a Set in a list slot throws, naming the shape', () => {
  const p = captureProfile({ id: 'test.snapshot.set.v1' });
  (p.legs[0] as LegSpec).requiredConsultations = new Set(['a']) as unknown as string[];
  throwsCreate(p, /invalid profile 'test\.snapshot\.set\.v1'.*requiredConsultations.*Set/s);
});

test('a Map as the profile, an array as a leg and an array carrying an extra property each throw', () => {
  throwsCreate(new Map(), /invalid profile at position 0 of config\.profiles.*Map/s);
  const p = captureProfile({ id: 'test.snapshot.arrleg.v1' });
  p.legs = [[] as unknown as LegSpec];
  throwsCreate(p, /invalid profile 'test\.snapshot\.arrleg\.v1'.*array/s);
  const q = captureProfile({ id: 'test.snapshot.extra-prop.v1' });
  const list = ['a'] as string[] & { tag?: string };
  list.tag = 'x';
  (q.legs[0] as LegSpec).allowedAuthorities = list;
  throwsCreate(
    q,
    /invalid profile 'test\.snapshot\.extra-prop\.v1'.*allowedAuthorities.*extra property/s,
  );
});

test('a profile that is not an object throws naming its position when it has no id', () => {
  assert.throws(
    () =>
      create({ ...makeConfig([captureProfile()]), profiles: [captureProfile(), null as never] }),
    /invalid profile at position 1 of config\.profiles/,
  );
  assert.throws(
    () => create({ ...makeConfig([captureProfile()]), profiles: [[] as never] }),
    /invalid profile at position 0 of config\.profiles.*array/s,
  );
});

test('a non-string id is reported by position', () => {
  const p = captureProfile();
  (p as { id: unknown }).id = 42;
  rec(p).extra = { nested: true };
  assert.throws(
    () => create({ ...makeConfig([captureProfile()]), profiles: [p] }),
    /invalid profile at position 0 of config\.profiles: unknown key 'extra' on the profile/,
  );
});

// === the schema ========================================================================

test('an unknown data-valued key is refused on the profile, a leg, subject, expiry, redeem and sod', () => {
  const onProfile = captureProfile({ id: 'test.snapshot.unk.v1' });
  (onProfile as { SoD?: unknown }).SoD = { notActorOf: ['x'] };
  throwsCreate(
    onProfile,
    /invalid profile 'test\.snapshot\.unk\.v1': unknown key 'SoD' on the profile/,
  );

  const onLeg = twoLegProfile({ id: 'test.snapshot.unk.v1' });
  rec(onLeg.legs[1]).requiredConsultation = ['a'];
  throwsCreate(
    onLeg,
    /invalid profile 'test\.snapshot\.unk\.v1': unknown key 'requiredConsultation' on leg 'checker-decide'/,
  );

  const onSubject = captureProfile({ id: 'test.snapshot.unk.v1' });
  rec(onSubject.subject).label = 'x';
  throwsCreate(onSubject, /unknown key 'label' on subject/);

  const onExpiry = captureProfile({ id: 'test.snapshot.unk.v1' });
  rec(onExpiry.expiry).ttlSeconds = 5;
  throwsCreate(onExpiry, /unknown key 'ttlSeconds' on expiry/);

  const onRedeem = effectSeamProfile({ id: 'test.snapshot.unk.v1' });
  rec(onRedeem.redeem).redeemBounds = 5;
  throwsCreate(onRedeem, /unknown key 'redeemBounds' on redeem/);

  const onSod = twoLegProfile({ id: 'test.snapshot.unk.v1' });
  (onSod.legs[1] as LegSpec).sod = { notActorOf: ['maker-decide'], also: ['x'] } as never;
  throwsCreate(onSod, /unknown key 'also' on sod of leg 'checker-decide'/);
});

test('a function-valued unknown key is accepted and dropped (a host code reference, SPEC §4)', async () => {
  const p = captureProfile({ id: 'test.snapshot.fn-unknown.v1' });
  rec(p).onDecision = () => 'host callback';
  rec(p.legs[0]).hook = () => 'x';
  rec(p.subject).project = () => 'x';
  const store = new MemoryStore();
  const handles = create(makeConfig([p], { store }));
  const recordId = await openRecord(
    handles,
    CONTENT,
    'test.snapshot.fn-unknown.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(await boundDigest(store, recordId), profileDigest(p));
});

test('a function-valued known key is refused', () => {
  const p = captureProfile({ id: 'test.snapshot.fn-known.v1' });
  rec(p).policySource = () => 'x';
  throwsCreate(p, /invalid profile 'test\.snapshot\.fn-known\.v1'.*policySource.*function/s);
  const q = captureProfile({ id: 'test.snapshot.fn-known.v1' });
  rec(q.legs[0]).allowedAuthorities = [() => 'x'];
  throwsCreate(q, /allowedAuthorities.*function/s);
});

test('explicit undefined on signing, decline and redeem.result constructs as absent', async () => {
  const p = effectSeamProfile({ id: 'test.snapshot.undef.v1' });
  (p as { signing?: unknown }).signing = undefined;
  (p.legs[0] as { decline?: unknown }).decline = undefined;
  (p.redeem as { result?: unknown }).result = undefined;
  (p.legs[0] as { proposer?: unknown }).proposer = undefined;
  (p as { policySource?: unknown }).policySource = undefined;
  const store = new MemoryStore();
  const handles = create(makeConfig([p], { store }));
  const recordId = await openRecord(
    handles,
    CONTENT,
    'test.snapshot.undef.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(await boundDigest(store, recordId), profileDigest(p));
  // Absent, not declared: the seam the declaration would switch on stays off.
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
});

test('a stray redemption key keeps its existing message text, on the profile and on a leg', () => {
  const onLeg = captureProfile({ id: 'test.snapshot.stray.v1' });
  rec(onLeg.legs[0]).confirmToRedeem = 60;
  throwsCreate(
    onLeg,
    /invalid profile 'test\.snapshot\.stray\.v1': redemption key 'confirmToRedeem' must live inside a 'redeem' block, not as a leg key$/,
  );
  const onProfile = captureProfile({ id: 'test.snapshot.stray.v1' });
  rec(onProfile).reverify = true;
  throwsCreate(
    onProfile,
    /invalid profile 'test\.snapshot\.stray\.v1': redemption key 'reverify' must live inside a 'redeem' block, not as a top-level profile key$/,
  );
});

test('primitives in any slot pass to validateProfile and meet its existing message', () => {
  const p = captureProfile({ id: 'test.snapshot.prim.v1' });
  (p as { captureMode: unknown }).captureMode = 'sometimes';
  throwsCreate(p, /invalid profile 'test\.snapshot\.prim\.v1': captureMode is "sometimes"/);
  const q = captureProfile({ id: 'test.snapshot.prim.v1' });
  (q as { legs: unknown }).legs = 'one';
  throwsCreate(
    q,
    /invalid profile 'test\.snapshot\.prim\.v1': legs must be an array.*found string/s,
  );
  const r = captureProfile({ id: 'test.snapshot.prim.v1' });
  (r as { expiry: unknown }).expiry = 7;
  throwsCreate(r, /invalid profile 'test\.snapshot\.prim\.v1': expiry is 7/);
});

test('an object or array in a scalar slot, and an array in an object slot, throw naming the field', () => {
  const a = captureProfile({ id: 'test.snapshot.slot.v1' });
  (a as { policySource: unknown }).policySource = { label: 'x' };
  throwsCreate(a, /invalid profile 'test\.snapshot\.slot\.v1'.*policySource.*plain object/s);
  const b = captureProfile({ id: 'test.snapshot.slot.v1' });
  (b as { captureMode: unknown }).captureMode = ['staged'];
  throwsCreate(b, /captureMode.*array/s);
  const c = captureProfile({ id: 'test.snapshot.slot.v1' });
  (c as { subject: unknown }).subject = [];
  throwsCreate(c, /subject.*array/s);
  const d = effectSeamProfile({ id: 'test.snapshot.slot.v1' });
  (d as { redeem: unknown }).redeem = [];
  throwsCreate(d, /redeem.*array/s);
  const e = captureProfile({ id: 'test.snapshot.slot.v1' });
  (e.legs[0] as { allowedAuthorities: unknown }).allowedAuthorities = { 0: 'a', length: 1 };
  throwsCreate(e, /allowedAuthorities.*plain object.*expected an array/s);
  const f = captureProfile({ id: 'test.snapshot.slot.v1' });
  (f.legs[0] as { allowedAuthorities: unknown }).allowedAuthorities = [{ a: 1 }];
  throwsCreate(f, /allowedAuthorities.*element 0/s);
  const g = captureProfile({ id: 'test.snapshot.slot.v1' });
  (g as { legs: unknown }).legs = { 0: g.legs[0], length: 1 };
  throwsCreate(g, /legs.*expected an array/s);
});

test('a cyclic structure meets an unknown key or a non-primitive element, never a loop', () => {
  const p = captureProfile({ id: 'test.snapshot.cycle.v1' });
  rec(p).self = p;
  throwsCreate(p, /unknown key 'self'/);
  const q = captureProfile({ id: 'test.snapshot.cycle.v1' });
  const list: unknown[] = [];
  list.push(list);
  (q.legs[0] as { allowedAuthorities: unknown }).allowedAuthorities = list;
  throwsCreate(q, /allowedAuthorities.*element 0/s);
});

test('a freshness record holds primitive values only', () => {
  const bad = captureProfile({ id: 'test.snapshot.fresh.v1' });
  bad.signing = true;
  const badLeg = bad.legs[0] as LegSpec;
  badLeg.requiredConsultations = ['rederive'];
  badLeg.freshness = { rederive: { n: 60 } } as never;
  assert.throws(() => enforceableSigningSetup([bad]), /freshness.*rederive.*plain object/s);
});

// === the digest invariant ===============================================================

function signedProfile(): ConfirmProfile {
  const p = captureProfile({
    id: 'test.snapshot.inv-signed.v1',
    requiredConsultations: ['rederive'],
  });
  p.signing = true;
  (p.legs[0] as LegSpec).freshness = { rederive: 60 };
  return p;
}

const INVARIANT_PROFILES: Array<[string, () => ConfirmProfile]> = [
  ['captureProfile', () => captureProfile()],
  ['captureProfile, expiry none', () => captureProfile({ id: 'test.inv.none.v1', expiry: 'none' })],
  ['effectSeamProfile', () => effectSeamProfile()],
  ['liveProfile', () => liveProfile()],
  ['twoLegProfile', () => twoLegProfile()],
  [
    'decline + eligibility + terminalRefusals',
    () =>
      captureProfile({
        id: 'test.inv.flags.v1',
        decline: true,
        eligibility: 'eligible.v1',
        terminalRefusals: ['availability'],
      }),
  ],
  [
    'sod + proposer on a two-leg profile',
    () => {
      const p = twoLegProfile({ id: 'test.inv.sod.v1' });
      (p.legs[1] as LegSpec).sod = { notActorOf: ['maker-decide'] };
      (p.legs[1] as LegSpec).proposer = 'agent:1';
      return p;
    },
  ],
  [
    'effect seam with result',
    () => {
      const p = effectSeamProfile({ id: 'test.inv.result.v1' });
      p.redeem = { confirmToRedeem: 60, redeemBound: 120, result: true };
      return p;
    },
  ],
  [
    'findings flow',
    () => {
      const p = captureProfile({ id: 'test.inv.acks.v1' });
      (p.legs[0] as LegSpec).ackMode = 'any';
      (p.legs[0] as LegSpec).requiredAcks = ['risk'];
      return p;
    },
  ],
  ['signing + freshness', signedProfile],
  [
    'host function members and explicit undefined',
    () => {
      const p = captureProfile({ id: 'test.inv.noise.v1' });
      rec(p).callback = () => 1;
      (p as { signing?: unknown }).signing = undefined;
      (p.legs[0] as { proposer?: unknown }).proposer = undefined;
      return p;
    },
  ],
];

for (const [name, build] of INVARIANT_PROFILES) {
  test(`digest invariant: profileDigest(profile) equals the genesis's bound digest after stage and open (${name})`, async () => {
    const profile = build();
    const store = new MemoryStore();
    const handles =
      profile.signing === true
        ? enforceableSigningSetup([profile], { store }).handles
        : create(makeConfig([profile], { store }));
    const offline = profileDigest(profile);
    const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
    assert.equal(await boundDigest(store, recordId), offline);
  });
}

// === the projection keeps an own __proto__ key ============================================

test('projectProfile keeps an own __proto__ key, and a differing freshness["__proto__"] digests differently', () => {
  const freshness = (n: number): Record<string, number> =>
    Object.fromEntries([
      ['rederive', 60],
      ['__proto__', n],
    ]);
  const make = (n: number): ConfirmProfile => {
    const p = captureProfile({ id: 'test.snapshot.proto.v1' });
    (p.legs[0] as LegSpec).freshness = freshness(n);
    return p;
  };
  const projected = projectProfile(make(1)) as { legs: Array<{ freshness: object }> };
  const kept = projected.legs[0]?.freshness;
  assert.ok(kept !== undefined);
  assert.ok(Object.hasOwn(kept, '__proto__'), 'the own __proto__ key survives the projection');
  assert.notEqual(profileDigest(make(1)), profileDigest(make(2)));
});

// === create() reads its config once =====================================================

test('config.profiles must be an array: a Set, an object, nothing and null each throw a create: error', () => {
  const base = makeConfig([captureProfile()]);
  for (const profiles of [new Set([captureProfile()]), {}, undefined, null, 'p']) {
    assert.throws(
      () => create({ ...base, profiles: profiles as never }),
      /^Error: create: config\.profiles must be an array/,
    );
  }
});

test('config itself must be an object', () => {
  assert.throws(() => create(null as never), /^Error: create: config must be an object/);
});

test('config.profiles, store, canonicalizers and signing are each read once', () => {
  let reads = 0;
  const base = makeConfig([captureProfile()]);
  const config = {
    get profiles() {
      reads += 1;
      return base.profiles;
    },
    get store() {
      reads += 1;
      return base.store;
    },
    get canonicalizers() {
      reads += 1;
      return base.canonicalizers;
    },
    get signing() {
      reads += 1;
      return undefined;
    },
  };
  create(config);
  assert.equal(reads, 4);
});
