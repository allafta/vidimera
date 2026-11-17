// @vidimera/record — signing-obligation.test.ts: the AL2 obligation a verification site applies
// comes from the profile this instance HOLDS for the record (kernel/held-profile.ts), and, where
// the instance does not hold it, from the chain's own evidence — a genesis transition whose
// sidecar entry the instance's verifier accepts. The recorded bug this closes: the obligation
// was read from the live same-id profile, so an instance holding `{ ...P, signing: true }` read
// every never-signed record opened under `P` as a signing chain with no signatures, and every
// operator seam appended a terminal `chain-compromise` edge to an untampered record. Pinned
// below: the add direction at all seven verification sites, on `MemoryStore` and on one
// `SqliteStore` file redeployed in place; SPEC §4's exception keeping its reach (and gaining the
// drop direction); and the honest bound — an instance that does not hold the profile cannot tell
// a never-signed record from a signing record whose GENESIS entry is missing or broken, reads
// both as carrying no obligation, and appends nothing, while a holder still draws the edge.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'vitest';
import { transitionDigest } from '../src/chain/encoding.js';
import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, SigningConfig, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import type { Store } from '../src/store/store.js';
import type { Transition } from '../src/types.js';
import {
  captureProfile,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
  twoLegProfile,
} from './helpers/profiles.js';
import { breakOneSignature } from './helpers/signing.js';

const CONTENT = { subject: 'week-1', total: 40 };
const ID = 'test.obligation.v1';
const D1 = `sha256:${'1'.repeat(64)}`;

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

function withSigning(p: ConfirmProfile): ConfirmProfile {
  return { ...p, signing: true };
}

function instance(profile: ConfirmProfile, store: Store, signing?: SigningConfig) {
  return signing === undefined
    ? create(makeConfig([profile], { store }))
    : create({ ...makeConfig([profile], { store }), signing });
}

/** A real Ed25519 signing tier; its `MemorySignatureStore` is returned for direct sidecar edits. */
function signingTier(): SigningConfig & { signatures: MemorySignatureStore } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const signer: Signer = async (bytes) => ({
    keyRef: 'key-1',
    signature: edSign(null, bytes, privateKey).toString('base64'),
  });
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  return { signer, verifiers: { 'key-1': verifier }, signatures: new MemorySignatureStore() };
}

async function chainOf(store: Store, recordId: string): Promise<Transition[]> {
  return store.readChain(recordId);
}

async function chainLength(store: Store, recordId: string): Promise<number> {
  return (await chainOf(store, recordId)).length;
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
  assert.equal(o.code, 'unknown-profile', `${seam}: unknown-profile, not chain-compromise`);
  assert.equal(o.class, 'refusal');
  assert.equal(o.transitionRef, undefined, `${seam}: never-append — no edge, no ref`);
}

test('add-signing: finalize, decline, raiseFinding and acknowledge refuse unknown-profile with no edge, and the opener finalizes afterwards', async () => {
  const store = new MemoryStore();
  const opener = instance({ ...flowProfile(), legs: withDecline(flowProfile()) }, store);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:ob-1');
  const raised = await opener.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    identity({ principal: 'checker:1' }),
  );
  assert.equal(raised.status, 'ok');
  const acked = await opener.operator.acknowledge(
    recordId,
    { findingId: 'f-1', findingDigest: D1 },
    identity(),
  );
  assert.equal(acked.status, 'ok', 'fixture: the required ack is met, so finalize can succeed');
  const before = await chainLength(store, recordId);

  const sibling = instance(
    withSigning({ ...flowProfile(), legs: withDecline(flowProfile()) }),
    store,
    signingTier(),
  );
  assertUnknownProfile(
    await sibling.operator.finalize(recordId, identity(), CONTENT, facts()),
    'finalize',
  );
  assertUnknownProfile(
    await sibling.operator.decline(recordId, identity(), CONTENT, facts()),
    'decline',
  );
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
  assert.equal(await chainLength(store, recordId), before, 'no edge at any of the four seams');

  const own = await opener.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(own.status, 'ok', 'nothing was written: the opener still finalizes');
});

/** The decline switch on the flow profile's leg, for fixtures that need both findings and decline. */
function withDecline(p: ConfirmProfile): ConfirmProfile['legs'] {
  return p.legs.map((l) => ({ ...l, decline: true as const }));
}

test('add-signing: redeem, beginRedemption and completeRedemption refuse unknown-profile on a confirmed effect-seam record — the record stays confirmed', async () => {
  const store = new MemoryStore();
  const opener = instance(effectSeamProfile({ id: ID }), store);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:ob-2');
  assert.equal(
    (await opener.operator.finalize(recordId, identity(), CONTENT, facts())).status,
    'ok',
  );
  const begun = await opener.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok');
  if (begun.status !== 'ok') return;
  const before = await chainLength(store, recordId);

  const sibling = instance(withSigning(effectSeamProfile({ id: ID })), store, signingTier());
  assertUnknownProfile(await sibling.operator.redeem(recordId, CONTENT), 'redeem');
  assertUnknownProfile(
    await sibling.operator.beginRedemption(recordId, CONTENT),
    'beginRedemption',
  );
  assertUnknownProfile(
    await sibling.operator.completeRedemption(recordId, begun.value.token, CONTENT),
    'completeRedemption',
  );
  assert.equal(await chainLength(store, recordId), before, 'the sibling appended nothing');
  assert.equal(
    lastOf(await chainOf(store, recordId)).kind,
    'redeeming',
    'the record is exactly where the holder left it',
  );
  assert.equal(
    (await opener.operator.completeRedemption(recordId, begun.value.token, CONTENT)).status,
    'ok',
    'the holder completes what it began',
  );
});

test('add-signing: seal refuses unknown-profile on a completed confirmed record — it stays confirmed and the opener seals it', async () => {
  const store = new MemoryStore();
  const opener = instance(base(), store);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:ob-3');
  assert.equal(
    (await opener.operator.finalize(recordId, identity(), CONTENT, facts())).status,
    'ok',
  );
  const before = await chainLength(store, recordId);

  assertUnknownProfile(
    await instance(withSigning(base()), store, signingTier()).operator.seal(recordId),
    'seal',
  );
  assert.equal(await chainLength(store, recordId), before, 'no compromise edge on a clean record');
  assert.equal(lastOf(await chainOf(store, recordId)).kind, 'confirmed', 'it stays confirmed');
  assert.equal((await opener.operator.seal(recordId)).status, 'ok', 'the opener seals it');
});

const TWO = 'test.obligation.twoleg.v1';

test("add-signing: a successor leg's open() refuses prior-leg-unverified — no record created", async () => {
  const store = new MemoryStore();
  const v1 = instance(twoLegProfile({ id: TWO }), store);
  const makerId = await openRecord(v1, CONTENT, TWO, 'subject:ob-4', 'maker-decide');
  assert.equal((await v1.operator.finalize(makerId, identity(), CONTENT, facts())).status, 'ok');
  const makerHead = transitionDigest(lastOf(await chainOf(store, makerId)));

  const edited = instance(withSigning(twoLegProfile({ id: TWO })), store, signingTier());
  const staged = await edited.agent.stage(CONTENT, TWO, 'subject:ob-4', 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await edited.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') {
    assert.equal(out.code, 'prior-leg-unverified');
    assert.equal(out.class, 'refusal');
    assert.equal(
      (out as { transitionRef?: unknown }).transitionRef,
      undefined,
      'never-append: no record, no ref',
    );
  }

  const stagedV1 = await v1.agent.stage(CONTENT, TWO, 'subject:ob-4', 'checker-decide');
  assert.equal(stagedV1.status, 'ok');
  if (stagedV1.status !== 'ok') return;
  const ok = await v1.operator.open(stagedV1.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(ok.status, 'ok', 'the refused open created nothing: the holder opens the successor');
});

test('add-signing: supersedes over a declined predecessor verifies and the new record opens; over a confirmed predecessor it refuses supersedes-unverified', async () => {
  const store = new MemoryStore();
  const holder = instance(base({ decline: true }), store);
  const sibling = instance(withSigning(base({ decline: true })), store, signingTier());

  const declinedId = await openRecord(holder, CONTENT, ID, 'subject:ob-5');
  assert.equal(
    (await holder.operator.decline(declinedId, identity(), CONTENT, facts())).status,
    'ok',
  );
  const dHead = transitionDigest(lastOf(await chainOf(store, declinedId)));
  const s1 = await sibling.agent.stage(CONTENT, ID, 'subject:ob-5');
  assert.equal(s1.status, 'ok');
  if (s1.status !== 'ok') return;
  const r1 = await sibling.operator.open(s1.value.stagedRef, {
    supersedes: { recordId: declinedId, chainHead: dHead },
  });
  assert.equal(r1.status, 'ok', 'declined is terminal regardless of profile — the claim verifies');

  const confirmedId = await openRecord(holder, CONTENT, ID, 'subject:ob-6');
  assert.equal(
    (await holder.operator.finalize(confirmedId, identity(), CONTENT, facts())).status,
    'ok',
  );
  const cHead = transitionDigest(lastOf(await chainOf(store, confirmedId)));
  const s2 = await sibling.agent.stage(CONTENT, ID, 'subject:ob-6');
  assert.equal(s2.status, 'ok');
  if (s2.status !== 'ok') return;
  const r2 = await sibling.operator.open(s2.value.stagedRef, {
    supersedes: { recordId: confirmedId, chainHead: cHead },
  });
  assert.equal(r2.status, 'refused');
  if (r2.status === 'refused') {
    assert.equal(r2.code, 'supersedes-unverified');
    assert.equal(r2.class, 'refusal');
  }
});

test('add-signing on one SqliteStore file redeployed in place: finalize and seal refuse unknown-profile and the records keep their state', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'vidimera-obligation-'));
  const path = join(dir, 'store.db');
  try {
    const openerStore = new SqliteStore(path);
    let openId: string;
    let confirmedId: string;
    try {
      const opener = instance(base(), openerStore);
      openId = await openRecord(opener, CONTENT, ID, 'subject:ob-7');
      confirmedId = await openRecord(opener, CONTENT, ID, 'subject:ob-8');
      assert.equal(
        (await opener.operator.finalize(confirmedId, identity(), CONTENT, facts())).status,
        'ok',
      );
    } finally {
      openerStore.close();
    }

    const editedStore = new SqliteStore(path);
    try {
      const openBefore = await chainLength(editedStore, openId);
      const confirmedBefore = await chainLength(editedStore, confirmedId);
      const edited = instance(withSigning(base()), editedStore, signingTier());
      assertUnknownProfile(
        await edited.operator.finalize(openId, identity(), CONTENT, facts()),
        'finalize',
      );
      assertUnknownProfile(await edited.operator.seal(confirmedId), 'seal');
      assert.equal(await chainLength(editedStore, openId), openBefore);
      assert.equal(await chainLength(editedStore, confirmedId), confirmedBefore);
      assert.equal(lastOf(await chainOf(editedStore, openId)).kind, 'opened');
      assert.equal(lastOf(await chainOf(editedStore, confirmedId)).kind, 'confirmed');
    } finally {
      editedStore.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** Opens a signing record with a findings edge, then corrupts the SECOND entry's signature. */
async function signingRecordWithBrokenLaterEntry(
  store: Store,
  tier: SigningConfig & { signatures: MemorySignatureStore },
  subject: string,
): Promise<{ recordId: string; opener: ReturnType<typeof instance> }> {
  const opener = instance(withSigning(flowProfile()), store, tier);
  const recordId = await openRecord(opener, CONTENT, ID, subject);
  const raised = await opener.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    identity({ principal: 'checker:1' }),
  );
  assert.equal(raised.status, 'ok');
  const chain = await chainOf(store, recordId);
  assert.ok(chain.length >= 2, 'fixture: at least two transitions');
  const later = chain[1];
  assert.ok(later !== undefined);
  const digest = transitionDigest(later);
  const victim = (await tier.signatures.listByRecord(recordId)).find(
    (e) => e.transitionDigest === digest,
  );
  assert.ok(victim !== undefined, 'fixture: the later transition has a sidecar entry');
  const broken = `AAAA${victim.signature.slice(4)}`;
  assert.notEqual(broken, victim.signature, 'fixture: the corruption changed the signature');
  await tier.signatures.put({ ...victim, signature: broken });
  const genesisEntry = (await tier.signatures.listByRecord(recordId)).find(
    (e) => chain[0] !== undefined && e.transitionDigest === transitionDigest(chain[0]),
  );
  assert.ok(genesisEntry !== undefined, 'fixture: the genesis entry stays in place');
  return { recordId, opener };
}

test('the exception keeps its reach: a ttl-edited signing sibling draws chain-compromise on a signing record whose later entry is broken — one edge', async () => {
  const store = new MemoryStore();
  const tier = signingTier();
  const { recordId } = await signingRecordWithBrokenLaterEntry(store, tier, 'subject:ob-9');
  const before = await chainLength(store, recordId);

  const sibling = instance(withSigning(flowProfile({ ttl: 60 })), store, tier);
  const out = await sibling.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') {
    assert.equal(out.code, 'chain-compromise');
    assert.equal(out.class, 'compromise');
  }
  assert.equal(await chainLength(store, recordId), before + 1, 'exactly one evidence edge');
});

test('the exception gains the drop direction: a sibling that dropped signing but keeps the verifier draws chain-compromise on the same break — one edge', async () => {
  const store = new MemoryStore();
  const tier = signingTier();
  const { recordId } = await signingRecordWithBrokenLaterEntry(store, tier, 'subject:ob-10');
  const before = await chainLength(store, recordId);

  const sibling = instance(flowProfile(), store, tier);
  const out = await sibling.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') {
    assert.equal(out.code, 'chain-compromise');
    assert.equal(out.class, 'compromise');
  }
  assert.equal(await chainLength(store, recordId), before + 1, 'exactly one evidence edge');
});

test('the bound: with the genesis entry deleted, and separately broken, a ttl-edited signing sibling refuses unknown-profile with no edge, while the holder refuses chain-compromise', async () => {
  const store = new MemoryStore();
  const tier = signingTier();
  const holder = instance(withSigning(base()), store, tier);
  const sibling = instance(withSigning(base({ ttl: 60 })), store, tier);

  // Case 1: the genesis entry is removed from the sidecar.
  const deletedId = await openRecord(holder, CONTENT, ID, 'subject:ob-11');
  const genesis = (await chainOf(store, deletedId))[0];
  assert.ok(genesis !== undefined);
  const genesisDigest = transitionDigest(genesis);
  assert.ok(
    (await tier.signatures.listByRecord(deletedId)).some(
      (e) => e.transitionDigest === genesisDigest,
    ),
    'fixture: the genesis entry existed',
  );
  tier.signatures.delete(genesisDigest);
  assert.equal(
    (await tier.signatures.listByRecord(deletedId)).some(
      (e) => e.transitionDigest === genesisDigest,
    ),
    false,
    'fixture: the genesis entry is gone',
  );

  // Case 2: the genesis entry is present but fails.
  const brokenId = await openRecord(holder, CONTENT, ID, 'subject:ob-12');
  await breakOneSignature(tier.signatures, brokenId, store);

  for (const recordId of [deletedId, brokenId]) {
    const before = await chainLength(store, recordId);
    assertUnknownProfile(
      await sibling.operator.finalize(recordId, identity(), CONTENT, facts()),
      'finalize (sibling)',
    );
    assert.equal(await chainLength(store, recordId), before, 'the sibling appended no edge');
  }

  for (const recordId of [deletedId, brokenId]) {
    const before = await chainLength(store, recordId);
    const out = await holder.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(out.status, 'refused');
    if (out.status === 'refused') {
      assert.equal(out.code, 'chain-compromise');
      assert.equal(out.class, 'compromise');
    }
    assert.equal(await chainLength(store, recordId), before + 1, 'the holder draws the edge');
  }
});
