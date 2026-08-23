// @vidimera/record — signing-enforce.test.ts (SPEC §14, the AL2 enforcement
// increment, second of three): the mint's layer becomes LOAD-BEARING. Every
// chain-verification site — the four seam prologues then existing (finalize, seal, the
// redemption family's shared prologue, the findings family's shared prologue) and the two
// cross-record claims (verifyPriorLegs, verifySupersedes) — required a signing record's
// every transition to verify under the host
// registry; failure folds into the code each site already speaks. The reads stay
// reads: verifyChain remains the AL1 report, verifySignatures the AL2 report,
// neither gates. Authority timestamps and freshness remain the AL2 freshness
// increment's own work.
//
// A seventh signatureLayerHolds site, kernel/decline.ts's own prologue, joined later
// with the recorded-human-decline increment; this file's six tests predate it and do
// not cover it.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import { verifyChain } from '../src/chain/replay.js';
import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import { captureProfile, facts, identity, makeConfig, openRecord } from './helpers/profiles.js';
import { breakOneSignature, enforceableSigningSetup } from './helpers/signing.js';

const CONTENT = { subject: 'week-1', total: 40 };
const WRONG = { subject: 'week-1', total: 41 };

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const signer: Signer = async (bytes) => ({
  keyRef: 'key-1',
  signature: edSign(null, bytes, privateKey).toString('base64'),
});
function countingVerifier(): { verifier: Verifier; calls: () => number } {
  let n = 0;
  const verifier: Verifier = async (bytes, signature) => {
    n += 1;
    return edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  };
  return { verifier, calls: () => n };
}

function signedSetup(extraProfiles: ConfirmProfile[] = []) {
  const store = new MemoryStore();
  const signatures = new MemorySignatureStore();
  const { verifier, calls } = countingVerifier();
  const profiles: ConfirmProfile[] = [
    {
      ...captureProfile({ id: 'test.enf.v1', terminalRefusals: ['content-drift'] }),
      signing: true,
    },
    ...extraProfiles,
  ];
  const config = {
    ...makeConfig(profiles, { store }),
    signing: { signer, verifiers: { 'key-1': verifier }, signatures },
  };
  return { store, signatures, calls, handles: create(config) };
}

test('finalize refuses chain-compromise on a signature-broken signing record — and the compromise edge is itself signed', async () => {
  const { handles, signatures } = signedSetup();
  const recordId = await openRecord(handles, CONTENT, 'test.enf.v1', 'subject:enf-1');
  await breakOneSignature(signatures, recordId);

  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');

  const chain = await handles.operator.readChain(recordId);
  const last = chain.at(-1);
  assert.equal(last?.kind, 'refused', 'the compromise edge appended');
  const entries = await signatures.listByRecord(recordId);
  assert.equal(
    entries.length,
    chain.length,
    'the compromise edge went through the decorated store and is itself signed',
  );
});

test('seal and raiseFinding refuse the same way; a MISSING entry (not just a tampered one) also fails closed', async () => {
  // seal, tampered:
  const a = signedSetup();
  const sealTarget = await openRecord(a.handles, CONTENT, 'test.enf.v1', 'subject:enf-2');
  const fin = await a.handles.operator.finalize(sealTarget, identity(), CONTENT, facts());
  assert.equal(fin.status, 'ok');
  await breakOneSignature(a.signatures, sealTarget);
  const sealed = await a.handles.operator.seal(sealTarget);
  assert.equal(sealed.status, 'refused');
  if (sealed.status === 'refused') assert.equal(sealed.code, 'chain-compromise');

  // raiseFinding on a findings-flow signing profile, one entry DELETED: build the
  // profile inline (signing + ackMode/requiredAcks), open, delete the genesis entry —
  // `MemorySignatureStore.delete` (a test/host convenience, not part of the
  // `SignatureStore` contract: `put`'s upsert-by-digest semantics give no other way to
  // vacate an association) — leaving the real digest with no entry at all.
  const flowBase = captureProfile({ id: 'test.enf.flow.v1' });
  const flowLeg = flowBase.legs[0];
  assert.ok(flowLeg !== undefined);
  const b = signedSetup([
    {
      ...flowBase,
      signing: true,
      legs: [{ ...flowLeg, ackMode: 'any', requiredAcks: ['variance'] }],
    },
  ]);
  const flowId = await openRecord(b.handles, CONTENT, 'test.enf.flow.v1', 'subject:enf-3');
  const entries = await b.signatures.listByRecord(flowId);
  const victim = entries[0];
  assert.ok(victim !== undefined);
  b.signatures.delete(victim.transitionDigest);
  const raised = await b.handles.operator.raiseFinding(
    flowId,
    { findingId: 'f-1', kind: 'variance', findingDigest: `sha256:${'1'.repeat(64)}` },
    identity(),
  );
  assert.equal(raised.status, 'refused');
  if (raised.status === 'refused') assert.equal(raised.code, 'chain-compromise');
});

test('the redemption prologue refuses; cross-record claims fold into their own codes', async () => {
  // Direct redeem on a signature-broken signing effect-seam profile:
  const a = signedSetup([
    {
      ...captureProfile({ id: 'test.enf.effect.v1' }),
      signing: true as const,
      redeem: { confirmToRedeem: 3600 },
    },
  ]);
  const redeemId = await openRecord(a.handles, CONTENT, 'test.enf.effect.v1', 'subject:enf-4');
  const fin = await a.handles.operator.finalize(redeemId, identity(), CONTENT, facts());
  assert.equal(fin.status, 'ok');
  await breakOneSignature(a.signatures, redeemId);
  const red = await a.handles.operator.redeem(redeemId, CONTENT);
  assert.equal(red.status, 'refused');
  if (red.status === 'refused') assert.equal(red.code, 'chain-compromise');

  // supersedes: a terminal signing predecessor with a broken signature refuses the
  // CLAIM code, not chain-compromise:
  const b = signedSetup();
  const predId = await openRecord(b.handles, CONTENT, 'test.enf.v1', 'subject:enf-5');
  const drifted = await b.handles.operator.finalize(predId, identity(), WRONG, facts());
  assert.equal(drifted.status, 'refused', 'fixture: content-drift, terminal by profile');
  const head = await b.handles.operator.chainHead(predId);
  assert.ok(head !== null);
  await breakOneSignature(b.signatures, predId);
  const staged = await b.handles.agent.stage(CONTENT, 'test.enf.v1', 'subject:enf-5');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const recovered = await b.handles.operator.open(staged.value.stagedRef, {
    supersedes: { recordId: predId, chainHead: head },
  });
  assert.equal(recovered.status, 'refused');
  if (recovered.status === 'refused') assert.equal(recovered.code, 'supersedes-unverified');
});

test('the layer does not overreach: a NON-signing record with garbage in the sidecar passes every seam; the reads never gate', async () => {
  const { handles, signatures } = signedSetup([captureProfile({ id: 'test.enf.plain.v1' })]);
  const plainId = await openRecord(handles, CONTENT, 'test.enf.plain.v1', 'subject:enf-6');
  const chain = await handles.operator.readChain(plainId);
  const genesis = chain[0];
  assert.ok(genesis !== undefined);
  const { transitionDigest } = await import('../src/chain/encoding.js');
  await signatures.put({
    transitionDigest: transitionDigest(genesis),
    recordId: plainId,
    seq: 1,
    keyRef: 'key-unknown',
    signature: 'garbage',
  });
  const done = await handles.operator.finalize(plainId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'a non-signing profile never consults the layer');

  // The reads: break a SIGNING record and watch verifyChain stay AL1-true while
  // verifySignatures reports the break — neither refuses.
  const sigId = await openRecord(handles, CONTENT, 'test.enf.v1', 'subject:enf-7');
  await breakOneSignature(signatures, sigId);
  const al1 = await handles.operator.verifyChain(sigId);
  assert.equal(al1.intact, true, 'verifyChain is the AL1 report, documented as such');
  const al2 = await handles.operator.verifySignatures(sigId);
  assert.equal(
    al2.transitions.some((t) => t.verified === false),
    true,
    'verifySignatures is the AL2 report',
  );
});

test('a multi-leg successor whose prior-leg reference is signature-broken refuses prior-leg-unverified', async () => {
  const { twoLegProfile } = await import('./helpers/profiles.js');
  const { handles, signatures } = signedSetup([
    { ...twoLegProfile({ id: 'test.enf.two.v1' }), signing: true as const },
  ]);
  const makerId = await openRecord(
    handles,
    CONTENT,
    'test.enf.two.v1',
    'subject:enf-8',
    'maker-decide',
  );
  const fin = await handles.operator.finalize(makerId, identity(), CONTENT, facts());
  assert.equal(fin.status, 'ok');
  const head = await handles.operator.chainHead(makerId);
  assert.ok(head !== null);
  await breakOneSignature(signatures, makerId);

  const staged = await handles.agent.stage(
    CONTENT,
    'test.enf.two.v1',
    'subject:enf-8',
    'checker-decide',
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const successor = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: head }],
  });
  assert.equal(successor.status, 'refused');
  if (successor.status === 'refused') assert.equal(successor.code, 'prior-leg-unverified');
});

test('order: the verifier is never consulted on a hash-broken chain; an unresolvable keyRef fails closed', async () => {
  const { handles, signatures } = signedSetup();
  const recordId = await openRecord(handles, CONTENT, 'test.enf.v1', 'subject:enf-9');

  // Unresolvable keyRef: re-key one entry to a registry miss.
  const entries = await signatures.listByRecord(recordId);
  const victim = entries[0];
  assert.ok(victim !== undefined);
  await signatures.put({ ...victim, keyRef: 'key-unknown' });
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'chain-compromise');

  // Hash-broken chain: a sibling signing instance over a tampered copy, with its OWN
  // fresh counting verifier — asserted at ZERO after the refusal, proving AL1 refused
  // before the layer ever ran.
  const chain = await handles.operator.readChain(recordId);
  const { tamperNonLast } = await import('./helpers/profiles.js');
  const tamperedStore = new MemoryStore();
  for (const [i, t] of tamperNonLast(chain).entries()) {
    await tamperedStore.appendTransition(i === 0 ? null : 'open', t, { nonTerminal: true });
  }
  const sibling = countingVerifier();
  const h2 = create({
    ...makeConfig([{ ...captureProfile({ id: 'test.enf.v1' }), signing: true as const }], {
      store: tamperedStore,
    }),
    signing: { signer, verifiers: { 'key-1': sibling.verifier }, signatures },
  });
  const broken = await h2.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(broken.status, 'refused');
  if (broken.status === 'refused') assert.equal(broken.code, 'chain-compromise');
  assert.equal(
    sibling.calls(),
    0,
    'AL1 refused first; the layer never ran on the hash-broken chain',
  );
});

test('decline refuses chain-compromise on a signature-broken signing record — the AL2 disjunct of rung (1), and the compromise edge is itself signed', async () => {
  // The SEVENTH signatureLayerHolds site (kernel/decline.ts), which this file's original six
  // tests predate and did not cover. Deferral-register row 20's remaining half: the
  // hash-broken disjunct gained a pin at the Finding E adjudication; this is the AL2 one.
  const profile: ConfirmProfile = {
    ...captureProfile({ id: 'test.enf.decline.v1', decline: true }),
    signing: true,
  };
  const { handles, signatures, calls } = enforceableSigningSetup([profile]);
  const recordId = await openRecord(handles, CONTENT, 'test.enf.decline.v1', 'subject:enf-9');
  await breakOneSignature(signatures, recordId);

  const before = await handles.operator.readChain(recordId);
  // AL1 is INTACT. Without this the refusal could be the hash disjunct and the test would
  // prove nothing about the signature layer.
  assert.equal(verifyChain(before).intact, true, 'fixture: hash-intact, signature-broken');
  const callsBefore = calls();

  const out = await handles.operator.decline(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.notEqual(out.transitionRef, undefined, 'an open record admits the edge');

  // The DELTA, never the total: verifySignatures() consults the verifier too.
  assert.ok(calls() > callsBefore, 'the AL2 disjunct ran — the verifier was consulted');

  const after = await handles.operator.readChain(recordId);
  assert.equal(after.length, before.length + 1);
  assert.equal(after.at(-1)?.kind, 'refused');
  assert.deepEqual(after.at(-1)?.payload, { code: 'chain-compromise' });
  // Sound only after exactly ONE refusing call — a second would mint another sidecar entry
  // against a digest that never lands. See deferral-register row 22.
  const entries = await signatures.listByRecord(recordId);
  assert.equal(entries.length, after.length, 'the compromise edge is itself signed');
});

test('decline on a NON-declaring leg over a signature-broken chain appends the compromise edge rather than throwing — rung (1) beats the declaration gate', async () => {
  // The signature-broken half of the corner the Finding E adjudication pinned hash-broken at
  // both twins. Over an INTACT chain this call throws (the declaration gate); over a broken
  // one rung (1) refuses first and control never reaches that gate.
  const profile: ConfirmProfile = {
    ...captureProfile({ id: 'test.enf.nodecline.v1' }), // no decline declared
    signing: true,
  };
  const { handles, signatures, calls } = enforceableSigningSetup([profile]);
  const recordId = await openRecord(handles, CONTENT, 'test.enf.nodecline.v1', 'subject:enf-10');
  await breakOneSignature(signatures, recordId);

  const before = await handles.operator.readChain(recordId);
  assert.equal(verifyChain(before).intact, true, 'fixture: hash-intact, signature-broken');
  const callsBefore = calls();

  // No throw here is the whole point.
  const out = await handles.operator.decline(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.notEqual(out.transitionRef, undefined);
  assert.ok(calls() > callsBefore, 'the AL2 disjunct ran');

  const after = await handles.operator.readChain(recordId);
  assert.equal(after.length, before.length + 1);
  assert.equal(after.at(-1)?.kind, 'refused');
});
