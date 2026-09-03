// @vidimera/record — profile-drift-gate.test.ts (the profile-drift gate increment, 2026-09-03):
// an instance HOLDS a record's profile only when the record's profileId is registered AND the
// registered profile's data-only projection digests to the record's genesis profileDigest
// (SPEC §4). Every seam that resolves a persisted record refuses `unknown-profile`, never-append,
// at the resolution step it already has — ahead of every ladder rung — when it does not hold the
// profile; the two cross-record verifications fold the same miss into their own claim refusals;
// and open()'s exclusivity path leaves a due blocker it does not hold standing (`record-exists`).
// The recorded fail-open this closes: a same-id profile that dropped `signing: true` read a
// signing record as plain AL1 and finalized it (docs/analysis/2026-09-03-security-findings.md,
// finding 2). The honest bound, in the same breath: an in-place profile edit strands that
// profile's open records until the declarative fields are restored exactly or the edit is given
// a new id — pinned below as behavior, not softened.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';
import { transitionDigest } from '../src/chain/encoding.js';
import type { ConfirmProfile } from '../src/config.js';
import { create, createWithClock } from '../src/create.js';
import { heldProfile } from '../src/kernel/held-profile.js';
import { profileDigest } from '../src/profile-digest.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, SigningConfig, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Store } from '../src/store/store.js';
import type { Transition } from '../src/types.js';
import {
  captureProfile,
  defaultCanonicalizer,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
  tamperNonLast,
  twoLegProfile,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const ID = 'test.drift.gate.v1';
const D1 = `sha256:${'1'.repeat(64)}`;

/** The base profile; a sibling instance edits ONE declarative field and acts on the record. */
function base(overrides: { ttl?: number; decline?: true } = {}): ConfirmProfile {
  return captureProfile({ id: ID, ...overrides });
}

/** `base()` with a findings flow declared, so an open record can carry a second transition. */
function flowProfile(overrides: { ttl?: number } = {}): ConfirmProfile {
  const p = base(overrides);
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  p.legs[0] = { ...leg, ackMode: 'any' as const, requiredAcks: ['variance'] };
  return p;
}

function instance(profile: ConfirmProfile, store: Store, signing?: SigningConfig) {
  return signing === undefined
    ? create(makeConfig([profile], { store }))
    : create({ ...makeConfig([profile], { store }), signing });
}

/** A real Ed25519 signing tier, shared by two instances over one store. */
function signingTier(): SigningConfig {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const signer: Signer = async (bytes) => ({
    keyRef: 'key-1',
    signature: edSign(null, bytes, privateKey).toString('base64'),
  });
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  return { signer, verifiers: { 'key-1': verifier }, signatures: new MemorySignatureStore() };
}

async function chainLength(store: Store, recordId: string): Promise<number> {
  return (await store.readChain(recordId)).length;
}

function lastOf(chain: readonly Transition[]): Transition {
  const t = chain.at(-1);
  assert.ok(t !== undefined, 'fixture: the chain is not empty');
  return t;
}

/** The never-append `unknown-profile` refusal, asserted whole. */
function assertUnknownProfile(out: unknown, seam: string): void {
  const o = out as { status: string; code?: string; class?: string; transitionRef?: unknown };
  assert.equal(o.status, 'refused', `${seam}: a profile this instance does not hold refuses`);
  assert.equal(o.code, 'unknown-profile', `${seam}: the second producer of unknown-profile`);
  assert.equal(o.class, 'refusal');
  assert.equal(o.transitionRef, undefined, `${seam}: never-append — no edge, no ref`);
}

test('heldProfile: the id must be registered AND the registered projection must digest to the binding', () => {
  const p = base();
  const resolved = {
    profile: p,
    canonicalizer: defaultCanonicalizer(),
    effectSeam: false,
    profileDigest: profileDigest(p),
  };
  const profiles = new Map([[ID, resolved]]);
  const bound = { profileId: ID, profileDigest: profileDigest(p) };
  assert.equal(heldProfile(profiles, bound), resolved, 'registered and matching: held');
  assert.equal(
    heldProfile(profiles, { ...bound, profileDigest: profileDigest(base({ ttl: 60 })) }),
    undefined,
    'same id, edited projection: not held',
  );
  assert.equal(
    heldProfile(profiles, { ...bound, profileId: 'test.drift.gate.other.v1' }),
    undefined,
    'unregistered id: not held',
  );
});

test('create() caches each profile digest, and open() binds that cached digest — byte-identical to the per-call digest it replaces', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([base()], { store }));
  const recordId = await openRecord(handles, CONTENT, ID, 'subject:gate-0');
  const genesis = (await store.readChain(recordId))[0];
  assert.ok(genesis !== undefined);
  assert.equal(
    (genesis.payload as { profileDigest: string }).profileDigest,
    profileDigest(base()),
    'the binding is the projection digest, cached or not',
  );
});

test("finalize, the review's route: a same-id sibling whose profile dropped signing (and carries no config.signing) refuses unknown-profile with no append, and the report says drifted", async () => {
  const store = new MemoryStore();
  const signingProfile: ConfirmProfile = { ...base(), signing: true };
  const opener = instance(signingProfile, store, signingTier());
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:gate-1');
  const before = await chainLength(store, recordId);

  const sibling = instance(base(), store);
  assertUnknownProfile(
    await sibling.operator.finalize(recordId, identity(), CONTENT, facts()),
    'finalize',
  );
  assert.equal(await chainLength(store, recordId), before, 'never-append');
  const report = await sibling.operator.verifySignatures(recordId);
  assert.equal(report.genesisProfile.resolution, 'drifted', 'the report names why');
});

test('finalize and decline, a benign edit: a same-id sibling with a different ttl refuses unknown-profile at both seams, no append', async () => {
  const store = new MemoryStore();
  const opener = instance(base({ decline: true }), store);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:gate-2');
  const before = await chainLength(store, recordId);

  const sibling = instance(base({ decline: true, ttl: 60 }), store);
  assertUnknownProfile(
    await sibling.operator.finalize(recordId, identity(), CONTENT, facts()),
    'finalize',
  );
  assertUnknownProfile(
    await sibling.operator.decline(recordId, identity(), CONTENT, facts()),
    'decline',
  );
  assert.equal(await chainLength(store, recordId), before);
});

test('depth: a hash-broken chain under a drifted sibling refuses chain-compromise and appends its evidence edge — rung (1) precedes profile resolution', async () => {
  const store = new MemoryStore();
  const opener = instance(flowProfile(), store);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:gate-3');
  // A second transition, so a NON-last tamper exists (a last-element tamper is the AL1 blind
  // spot); the record stays open.
  const raised = await opener.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    identity({ principal: 'checker:1' }),
  );
  assert.equal(raised.status, 'ok');

  const tampered = new MemoryStore();
  for (const [i, t] of tamperNonLast(await store.readChain(recordId)).entries()) {
    await tampered.appendTransition(i === 0 ? null : 'open', t, { nonTerminal: true });
  }
  const drifted = instance(flowProfile({ ttl: 60 }), tampered);
  const before = await chainLength(tampered, recordId);
  const out = await drifted.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'chain-compromise');
  assert.equal(
    await chainLength(tampered, recordId),
    before + 1,
    'the evidence edge lands — chain-verify runs before the profile is even resolved',
  );
});

test('depth: a due-expired record under a drifted sibling refuses unknown-profile and does NOT expire — the stranding, as behavior', async () => {
  const clock = { t: Date.UTC(2026, 0, 1) };
  const store = new MemoryStore();
  const opener = createWithClock(
    makeConfig([base({ ttl: 60 })], { store }),
    () => new Date(clock.t),
  );
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:gate-4');
  clock.t += 120 * 1000; // past the 60s window by the record's own rules

  const sibling = createWithClock(
    makeConfig([base({ ttl: 3600 })], { store }),
    () => new Date(clock.t),
  );
  const before = await chainLength(store, recordId);
  assertUnknownProfile(
    await sibling.operator.finalize(recordId, identity(), CONTENT, facts()),
    'finalize',
  );
  assert.equal(
    await chainLength(store, recordId),
    before,
    'no expired edge: an instance that does not hold the rules cannot expire under them',
  );

  // The holder, at the same instant, expires it en passant — the order proof.
  const own = await opener.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(own.status, 'refused');
  if (own.status === 'refused') assert.equal(own.code, 'leg-expired');
  assert.equal(lastOf(await store.readChain(recordId)).kind, 'expired');
});

test('recovery, route 1: an instance whose profile restores the declarative fields exactly holds the record again and finalizes it', async () => {
  const store = new MemoryStore();
  const opener = instance(base(), store);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:gate-5');
  assertUnknownProfile(
    await instance(base({ ttl: 60 }), store).operator.finalize(
      recordId,
      identity(),
      CONTENT,
      facts(),
    ),
    'finalize (drifted)',
  );
  const restored = instance(base(), store); // a fresh object with the same declarative fields
  assert.equal(
    (await restored.operator.finalize(recordId, identity(), CONTENT, facts())).status,
    'ok',
    'the projection is deterministic: a faithful restore holds the record again',
  );
});

test('recovery, route 2: the prior version stays registered under its id and the edit takes a new id — a record of each finalizes on one instance', async () => {
  const store = new MemoryStore();
  const v1 = instance(base(), store);
  const oldRecord = await openRecord(v1, CONTENT, ID, 'subject:gate-6');
  const V2 = 'test.drift.gate.v2';
  const both = create(makeConfig([base(), captureProfile({ id: V2, ttl: 60 })], { store }));
  // Same subject, new profile id: a new exclusivity pair, so it opens beside the old record.
  const newRecord = await openRecord(both, CONTENT, V2, 'subject:gate-6');
  assert.equal(
    (await both.operator.finalize(oldRecord, identity(), CONTENT, facts())).status,
    'ok',
  );
  assert.equal(
    (await both.operator.finalize(newRecord, identity(), CONTENT, facts())).status,
    'ok',
  );
});

test('raiseFinding and acknowledge under a drifted sibling refuse unknown-profile — nothing appended', async () => {
  const store = new MemoryStore();
  const opener = instance(flowProfile(), store);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:gate-7');
  const raised = await opener.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    identity({ principal: 'checker:1' }),
  );
  assert.equal(raised.status, 'ok');
  const before = await chainLength(store, recordId);

  const sibling = instance(flowProfile({ ttl: 60 }), store);
  assertUnknownProfile(
    await sibling.operator.raiseFinding(
      recordId,
      { findingId: 'f-2', kind: 'variance', findingDigest: D1 },
      identity({ principal: 'checker:1' }),
    ),
    'raiseFinding',
  );
  assertUnknownProfile(
    await sibling.operator.acknowledge(
      recordId,
      { findingId: 'f-1', findingDigest: D1 },
      identity(),
    ),
    'acknowledge',
  );
  assert.equal(await chainLength(store, recordId), before);
});

test('redeem, beginRedemption and completeRedemption under a drifted sibling refuse unknown-profile — the confirmed record is untouched by it', async () => {
  const store = new MemoryStore();
  const opener = instance(effectSeamProfile({ id: ID }), store);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:gate-8');
  assert.equal(
    (await opener.operator.finalize(recordId, identity(), CONTENT, facts())).status,
    'ok',
  );
  const before = await chainLength(store, recordId);

  const sibling = instance(effectSeamProfile({ id: ID, ttl: 60 }), store);
  assertUnknownProfile(await sibling.operator.redeem(recordId, CONTENT), 'redeem');
  assertUnknownProfile(
    await sibling.operator.beginRedemption(recordId, CONTENT),
    'beginRedemption',
  );
  assert.equal(await chainLength(store, recordId), before, 'the sibling appended nothing');

  // A token minted by the holder, presented by the drifted sibling: still not held.
  const begun = await opener.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok');
  if (begun.status !== 'ok') return;
  assertUnknownProfile(
    await sibling.operator.completeRedemption(recordId, begun.value.token, CONTENT),
    'completeRedemption',
  );
  assert.equal(await chainLength(store, recordId), before + 1, "only the holder's begin appended");
  assert.equal(
    (await opener.operator.completeRedemption(recordId, begun.value.token, CONTENT)).status,
    'ok',
    'the holder completes what it began',
  );
});

test('seal under a drifted sibling refuses unknown-profile; the holder seals', async () => {
  const store = new MemoryStore();
  const opener = instance(base(), store);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:gate-9');
  // confirmed is terminal on a pure-capture profile, so the record is sealable.
  assert.equal(
    (await opener.operator.finalize(recordId, identity(), CONTENT, facts())).status,
    'ok',
  );
  const before = await chainLength(store, recordId);
  assertUnknownProfile(await instance(base({ ttl: 60 }), store).operator.seal(recordId), 'seal');
  assert.equal(await chainLength(store, recordId), before);
  assert.equal((await opener.operator.seal(recordId)).status, 'ok');
});

const TWO = 'test.drift.gate.twoleg.v1';
/** The two-leg profile, and a copy with ONE declarative edit on the maker leg. */
function twoLeg(edited = false): ConfirmProfile {
  const p = twoLegProfile({ id: TWO });
  if (!edited) return p;
  return {
    ...p,
    legs: [
      { id: 'maker-decide', allowedAuthorities: ['session:test-app', 'mtls:batch'] },
      { id: 'checker-decide', allowedAuthorities: ['session:test-app'] },
    ],
  };
}

test('prior legs: a successor open() under a sibling whose same-id profile was edited after the maker leg refuses prior-leg-unverified — no record created', async () => {
  const store = new MemoryStore();
  const v1 = instance(twoLeg(), store);
  const makerId = await openRecord(v1, CONTENT, TWO, 'subject:gate-10', 'maker-decide');
  assert.equal((await v1.operator.finalize(makerId, identity(), CONTENT, facts())).status, 'ok');
  const makerHead = transitionDigest(lastOf(await store.readChain(makerId)));

  const edited = instance(twoLeg(true), store);
  const staged = await edited.agent.stage(CONTENT, TWO, 'subject:gate-10', 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await edited.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');

  // The refused open created nothing: the holder opens the successor for the same pair.
  const stagedV1 = await v1.agent.stage(CONTENT, TWO, 'subject:gate-10', 'checker-decide');
  assert.equal(stagedV1.status, 'ok');
  if (stagedV1.status !== 'ok') return;
  const ok = await v1.operator.open(stagedV1.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(ok.status, 'ok', 'a flow is decided under one version of its rules');
});

test('recovery (supersedes): a confirmed predecessor whose profile the sibling does not hold refuses supersedes-unverified; a declined predecessor recovers regardless', async () => {
  const store = new MemoryStore();
  const holder = instance(base({ decline: true }), store);
  const confirmedId = await openRecord(holder, CONTENT, ID, 'subject:gate-11');
  assert.equal(
    (await holder.operator.finalize(confirmedId, identity(), CONTENT, facts())).status,
    'ok',
  );
  const cHead = transitionDigest(lastOf(await store.readChain(confirmedId)));

  const sibling = instance(base({ decline: true, ttl: 60 }), store);
  const s1 = await sibling.agent.stage(CONTENT, ID, 'subject:gate-11');
  assert.equal(s1.status, 'ok');
  if (s1.status !== 'ok') return;
  const r1 = await sibling.operator.open(s1.value.stagedRef, {
    supersedes: { recordId: confirmedId, chainHead: cHead },
  });
  assert.equal(r1.status, 'refused');
  if (r1.status === 'refused') assert.equal(r1.code, 'supersedes-unverified');

  const declinedId = await openRecord(holder, CONTENT, ID, 'subject:gate-12');
  assert.equal(
    (await holder.operator.decline(declinedId, identity(), CONTENT, facts())).status,
    'ok',
  );
  const dHead = transitionDigest(lastOf(await store.readChain(declinedId)));
  const s2 = await sibling.agent.stage(CONTENT, ID, 'subject:gate-12');
  assert.equal(s2.status, 'ok');
  if (s2.status !== 'ok') return;
  const r2 = await sibling.operator.open(s2.value.stagedRef, {
    supersedes: { recordId: declinedId, chainHead: dHead },
  });
  assert.equal(r2.status, 'ok', 'declined is terminal regardless of profile — nothing to hold');
});

test("open(): a blocker the drifted sibling's shorter ttl would call due — but which is not due under its own rules — stands: record-exists, no expired edge; the same subject under a NEW profile id opens at once", async () => {
  const clock = { t: Date.UTC(2026, 0, 1) };
  const store = new MemoryStore();
  const holder = createWithClock(
    makeConfig([base({ ttl: 3600 })], { store }),
    () => new Date(clock.t),
  );
  const blockerId = await openRecord(holder, CONTENT, ID, 'subject:gate-13');
  clock.t += 120 * 1000;

  const sibling = createWithClock(
    makeConfig([base({ ttl: 60 })], { store }),
    () => new Date(clock.t),
  );
  const before = await chainLength(store, blockerId);
  const staged = await sibling.agent.stage({ subject: 'week-2', total: 41 }, ID, 'subject:gate-13');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await sibling.operator.open(staged.value.stagedRef);
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'record-exists');
  assert.equal(
    await chainLength(store, blockerId),
    before,
    "the blocker is neither expired under the sibling's ttl nor touched: an instance that does not hold its profile writes nothing",
  );

  const V2 = 'test.drift.gate.v2';
  const versioned = createWithClock(
    makeConfig([captureProfile({ id: V2, ttl: 3600 })], { store }),
    () => new Date(clock.t),
  );
  const fresh = await openRecord(versioned, CONTENT, V2, 'subject:gate-13');
  assert.equal(typeof fresh, 'string', 'a new profile id is a new pair — new work is not stranded');
});

test('reads never refuse: review, getRecord, replay, readChain and listDue answer under a drifted sibling', async () => {
  const store = new MemoryStore();
  const opener = instance(base(), store);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:gate-14');

  const sibling = instance(base({ ttl: 60 }), store);

  const reviewed = await sibling.operator.review(recordId);
  assert.equal(reviewed.status, 'ok', 'review is a pure read that never fails on config drift');

  const record = await sibling.agent.getRecord(recordId);
  assert.ok(record !== null, 'getRecord answers regardless of profile drift');

  const replayed = await sibling.operator.replay(recordId);
  assert.equal(replayed.id, recordId, 'replay folds the chain regardless of profile drift');

  const chain = await sibling.agent.readChain(recordId);
  assert.ok(chain.length > 0, 'readChain answers regardless of profile drift');

  const due = await sibling.operator.listDue();
  assert.ok(Array.isArray(due), 'listDue resolves regardless of profile drift');
});
