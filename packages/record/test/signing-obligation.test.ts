// @vidimera/record — signing-obligation.test.ts: the AL2 obligation a verification site applies
// comes from the profile this instance HOLDS for the record (kernel/held-profile.ts), and, where
// the instance does not hold it, from the live same-id profile's declaration only when the
// chain's own genesis carries a sidecar entry the instance's verifier accepts. The recorded bug this closes: the obligation
// was read from the live same-id profile, so an instance holding `{ ...P, signing: true }` read
// every never-signed record opened under `P` as a signing chain with no signatures, and every
// operator seam appended a terminal `chain-compromise` edge to an untampered record. Pinned
// below: the add direction at all seven verification sites, on `MemoryStore` and on one
// `SqliteStore` file redeployed in place; SPEC §4's exception keeping its reach for a same-id
// signing sibling, and the drop direction left exactly as it was (no obligation, no edge); and
// the honest bound — an instance that does not hold the profile cannot tell a never-signed
// record from a signing record whose GENESIS entry is missing, broken, or signed under a key it
// holds no verifier for. It reads all three as carrying no obligation and appends nothing,
// while a holder still draws the edge; the `supersedes` residual that follows from the same
// reading is pinned as current behavior.

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
import { buildChain } from './helpers/chain.js';
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

/**
 * A real Ed25519 signing tier; its `MemorySignatureStore` is returned for direct sidecar edits.
 * With several keys the signer uses the first for the first signature (the genesis) and the
 * last for every later one — a rotation the opener performs and a sibling may not mirror.
 */
function signingTier(
  keys: readonly string[] = ['key-1'],
): SigningConfig & { signatures: MemorySignatureStore } {
  const pairs = new Map(keys.map((k) => [k, generateKeyPairSync('ed25519')]));
  let signed = 0;
  const signer: Signer = async (bytes) => {
    const keyRef = (signed === 0 ? keys[0] : keys.at(-1)) ?? 'key-1';
    signed += 1;
    const pair = pairs.get(keyRef);
    assert.ok(pair !== undefined, 'fixture: the key exists');
    return { keyRef, signature: edSign(null, bytes, pair.privateKey).toString('base64') };
  };
  const allVerifiers: Record<string, Verifier> = {};
  for (const [keyRef, pair] of pairs) {
    allVerifiers[keyRef] = async (bytes, signature) =>
      edVerify(null, bytes, pair.publicKey, Buffer.from(signature, 'base64'));
  }
  return { signer, verifiers: allVerifiers, signatures: new MemorySignatureStore() };
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

test('add-signing: redeem and beginRedemption refuse unknown-profile on a confirmed effect-seam record, completeRedemption on a redeeming one — nothing is appended', async () => {
  const store = new MemoryStore();
  const opener = instance(effectSeamProfile({ id: ID }), store);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:ob-2');
  assert.equal(
    (await opener.operator.finalize(recordId, identity(), CONTENT, facts())).status,
    'ok',
  );
  const confirmedLength = await chainLength(store, recordId);

  const sibling = instance(withSigning(effectSeamProfile({ id: ID })), store, signingTier());
  assertUnknownProfile(await sibling.operator.redeem(recordId, CONTENT), 'redeem');
  assertUnknownProfile(
    await sibling.operator.beginRedemption(recordId, CONTENT),
    'beginRedemption',
  );
  assert.equal(
    await chainLength(store, recordId),
    confirmedLength,
    'no edge on the confirmed record',
  );
  assert.equal(
    lastOf(await chainOf(store, recordId)).kind,
    'confirmed',
    'the record stays confirmed',
  );

  const begun = await opener.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok', 'the refusals consumed nothing: the holder begins');
  if (begun.status !== 'ok') return;
  const redeemingLength = await chainLength(store, recordId);
  assertUnknownProfile(
    await sibling.operator.completeRedemption(recordId, begun.value.token, CONTENT),
    'completeRedemption',
  );
  assert.equal(await chainLength(store, recordId), redeemingLength, 'the sibling appended nothing');
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
    assert.equal(
      (r2 as { transitionRef?: unknown }).transitionRef,
      undefined,
      'never-append: no record, no ref',
    );
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

test('the exception keeps its reach for a same-id signing sibling: a ttl-edited signing sibling draws chain-compromise on a signing record whose later entry is broken — one edge', async () => {
  const store = new MemoryStore();
  const tier = signingTier();
  const { recordId } = await signingRecordWithBrokenLaterEntry(store, tier, 'subject:ob-9');
  const before = await chainLength(store, recordId);

  const sibling = instance(withSigning(flowProfile({ ttl: 60 })), store, tier);
  assert.equal(
    (await sibling.operator.verifySignatures(recordId)).genesisProfile.resolution,
    'drifted',
    'fixture: the sibling does not hold the record profile — the non-holder branch is exercised',
  );
  const out = await sibling.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') {
    assert.equal(out.code, 'chain-compromise');
    assert.equal(out.class, 'compromise');
  }
  assert.equal(await chainLength(store, recordId), before + 1, 'exactly one evidence edge');
});

test('the drop direction is unchanged: a sibling that dropped signing but keeps the verifier refuses unknown-profile with no edge over a signing record whose later entry is broken', async () => {
  const store = new MemoryStore();
  const tier = signingTier();
  const { recordId } = await signingRecordWithBrokenLaterEntry(store, tier, 'subject:ob-10');
  const before = await chainLength(store, recordId);

  const sibling = instance(flowProfile(), store, tier);
  assertUnknownProfile(
    await sibling.operator.finalize(recordId, identity(), CONTENT, facts()),
    'finalize (drop-direction sibling)',
  );
  assert.equal(await chainLength(store, recordId), before, 'no edge: the layer is not enforced');
});

test('the drop direction with a key gap: a sibling that dropped signing and holds only the genesis key refuses unknown-profile with no edge over an untampered record whose later entry is signed under a second key', async () => {
  const store = new MemoryStore();
  const tier = signingTier(['key-1', 'key-2']);
  const opener = instance(withSigning(flowProfile()), store, tier);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:ob-13');
  const raised = await opener.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    identity({ principal: 'checker:1' }),
  );
  assert.equal(raised.status, 'ok');
  const report = await opener.operator.verifySignatures(recordId);
  assert.deepEqual(
    report.transitions.map((t) => [t.keyRef, t.verified]),
    [
      ['key-1', true],
      ['key-2', true],
    ],
    'fixture: the holder reads every transition verified, under two keys',
  );
  const before = await chainLength(store, recordId);

  const genesisOnly: SigningConfig = {
    signer: tier.signer,
    verifiers: { 'key-1': tier.verifiers['key-1'] as Verifier },
    signatures: tier.signatures,
  };
  const sibling = instance(flowProfile(), store, genesisOnly);
  assertUnknownProfile(
    await sibling.operator.finalize(recordId, identity(), CONTENT, facts()),
    'finalize (key-gap sibling)',
  );
  assert.equal(await chainLength(store, recordId), before, 'no unsigned compromise edge');
});

test('the bound: with the genesis entry deleted, broken, or signed under a key the sibling has no verifier for, a ttl-edited signing sibling refuses unknown-profile with no edge, while the holder refuses chain-compromise', async () => {
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

  // Case 3: the genesis entry is intact but names a keyRef the sibling holds no verifier for,
  // over a signing record with a later entry broken.
  const gapTier = signingTier();
  const gap = await signingRecordWithBrokenLaterEntry(store, gapTier, 'subject:ob-14');
  const otherKey: SigningConfig = {
    signer: gapTier.signer,
    verifiers: { 'other-key': gapTier.verifiers['key-1'] as Verifier },
    signatures: gapTier.signatures,
  };
  const noVerifierSibling = instance(withSigning(flowProfile({ ttl: 60 })), store, otherKey);
  assert.equal(
    (await noVerifierSibling.operator.verifySignatures(gap.recordId)).genesisProfile.resolution,
    'drifted',
    'fixture: the no-verifier sibling does not hold the record profile either',
  );
  const gapBefore = await chainLength(store, gap.recordId);
  assertUnknownProfile(
    await noVerifierSibling.operator.finalize(gap.recordId, identity(), CONTENT, facts()),
    'finalize (no-verifier sibling)',
  );
  assert.equal(await chainLength(store, gap.recordId), gapBefore, 'no edge');
  const gapHolder = await gap.opener.operator.finalize(gap.recordId, identity(), CONTENT, facts());
  assert.equal(gapHolder.status, 'refused');
  if (gapHolder.status === 'refused') assert.equal(gapHolder.code, 'chain-compromise');
  assert.equal(await chainLength(store, gap.recordId), gapBefore + 1, 'the holder draws the edge');

  for (const recordId of [deletedId, brokenId]) {
    assert.equal(
      (await sibling.operator.verifySignatures(recordId)).genesisProfile.resolution,
      'drifted',
      'fixture: the sibling does not hold the record profile — the non-holder branch is exercised',
    );
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

async function claimSupersedes(
  h: ReturnType<typeof instance>,
  store: Store,
  predecessorId: string,
  subject: string,
) {
  const head = transitionDigest(lastOf(await chainOf(store, predecessorId)));
  const staged = await h.agent.stage(CONTENT, ID, subject);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') throw new Error('fixture: stage failed');
  return h.operator.open(staged.value.stagedRef, {
    supersedes: { recordId: predecessorId, chainHead: head },
  });
}

test('the recorded residual at supersedes: a terminal non-confirmed predecessor verifies for a same-id signing sibling over a signing record with its genesis entry deleted and a forged declined head, where a holder refuses', async () => {
  const store = new MemoryStore();
  const tier = signingTier();
  const holder = instance(withSigning(base({ decline: true })), store, tier);
  const sibling = instance(withSigning(base({ decline: true, ttl: 60 })), store, tier);

  const recordId = await openRecord(holder, CONTENT, ID, 'subject:ob-15');
  const chain = await chainOf(store, recordId);
  const genesis = chain[0];
  assert.ok(genesis !== undefined);
  // The insider appends a forged unsigned declined edge, AL1-intact (correct prevHash), and
  // removes the genesis sidecar entry.
  const forged: Transition = {
    recordId,
    seq: 2,
    at: new Date(Date.parse(genesis.at) + 1000).toISOString(),
    kind: 'declined',
    payload: { actor: identity() },
    prevHash: transitionDigest(genesis),
  };
  const appended = await store.appendTransition('open', forged, { nonTerminal: false });
  assert.equal((appended as { appended: boolean }).appended, true, 'fixture: forged edge appended');
  tier.signatures.delete(transitionDigest(genesis));
  assert.equal(
    (await sibling.operator.verifySignatures(recordId)).genesisProfile.resolution,
    'drifted',
    'fixture: the sibling does not hold the record profile — the non-holder branch is exercised',
  );

  const refused = await claimSupersedes(holder, store, recordId, 'subject:ob-15');
  assert.equal(refused.status, 'refused', 'the holder enforces the layer');
  if (refused.status === 'refused') {
    assert.equal(refused.code, 'supersedes-unverified');
    assert.equal(refused.class, 'refusal');
    assert.equal((refused as { transitionRef?: unknown }).transitionRef, undefined);
  }
  const verified = await claimSupersedes(sibling, store, recordId, 'subject:ob-15');
  assert.equal(verified.status, 'ok', 'recorded residual: the sibling reads no obligation');
});

test('the recorded residual at supersedes: a forged declined chain naming a registered signing id with a non-matching profileDigest verifies on an instance registering that id', async () => {
  const store = new MemoryStore();
  const holder = instance(withSigning(base({ decline: true })), store, signingTier());
  await forgeDeclined(store, 'forged-ob-16', ID, `sha256:${'9'.repeat(64)}`, 'subject:ob-16');

  const out = await claimSupersedes(holder, store, 'forged-ob-16', 'subject:ob-16');
  assert.equal(out.status, 'ok', 'recorded residual: no binding check on a declined predecessor');
});
