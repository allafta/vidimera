// @vidimera/record — verifier-faults.test.ts: a host verifier that THROWS or REJECTS is a
// fault, not a verdict. Where the signature layer applies, the seam (or the cross-record
// verification, or the read) propagates the fault and appends nothing; the same call
// succeeds once the verifier answers again. Where the layer does not apply the fault is
// never seen. Before this increment a fault read as `verified: false` and every un-enlisted
// seam appended a terminal `chain-compromise` edge to an untouched record.
//
// The rig's verifier is real Ed25519 behind a switch: with the switch off it verifies, with
// it set it throws synchronously ('throw') or rejects asynchronously ('reject'). Each seam
// pin runs both modes, then clears the switch and calls again.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, SigningConfig, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import type { Store } from '../src/store/store.js';
import {
  captureProfile,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
  twoLegProfile,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const WRONG = { subject: 'week-1', total: 41 };
const D1 = `sha256:${'1'.repeat(64)}`;
type Mode = 'throw' | 'reject';
const MODES: Mode[] = ['throw', 'reject'];

/** A real Ed25519 tier whose verifier can be switched into a fault. */
function faultyTier() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const state: { fault: Mode | undefined; outage: Error; calls: number } = {
    fault: undefined,
    outage: new Error('key service unreachable'),
    calls: 0,
  };
  const signer: Signer = async (bytes) => ({
    keyRef: 'key-1',
    signature: edSign(null, bytes, privateKey).toString('base64'),
  });
  const verifier: Verifier = (bytes, signature) => {
    state.calls += 1;
    if (state.fault === 'throw') throw state.outage;
    if (state.fault === 'reject') return Promise.reject(state.outage);
    return Promise.resolve(edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64')));
  };
  const signatures = new MemorySignatureStore();
  const signing: SigningConfig & { signatures: MemorySignatureStore } = {
    signer,
    verifiers: { 'key-1': verifier },
    signatures,
  };
  return { signing, signatures, state };
}

type Tier = ReturnType<typeof faultyTier>;

function instance(profiles: ConfirmProfile[], store: Store, tier: Tier) {
  return create({ ...makeConfig(profiles, { store }), signing: tier.signing });
}

function signingCapture(id: string, extra: Partial<ConfirmProfile> = {}): ConfirmProfile {
  return { ...captureProfile({ id, decline: true }), signing: true, ...extra };
}

function flowProfile(id: string, extra: Partial<ConfirmProfile> = {}): ConfirmProfile {
  const base = captureProfile({ id });
  const leg = base.legs[0];
  assert.ok(leg !== undefined);
  return {
    ...base,
    signing: true,
    legs: [{ ...leg, ackMode: 'any', requiredAcks: ['variance'] }],
    ...extra,
  };
}

async function chainLen(store: Store, recordId: string): Promise<number> {
  return (await store.readChain(recordId)).length;
}

/** The fault, asserted whole: the shape of the message and the verifier's own error as cause. */
function assertFault(err: unknown, recordId: string, tier: Tier, seq = 1): true {
  assert.ok(err instanceof Error, 'the thrown value is an Error');
  assert.match(err.message, /verifier fault/);
  assert.ok(err.message.includes(recordId), 'names the record');
  assert.ok(err.message.includes(`seq ${seq}`), 'names the seq');
  assert.ok(err.message.includes('key-1'), 'names the keyRef');
  assert.match(err.message, /nothing was appended/);
  assert.strictEqual(err.cause, tier.state.outage, "the verifier's own error is the cause");
  return true;
}

/**
 * One seam, both fault modes. `prepare` builds the record (verifier healthy) and returns the
 * call under test; the fault is then switched on, the call must reject with it and leave the
 * chain and the sidecar as they were, and once the switch clears the SAME call succeeds.
 */
async function pinSeam(
  seam: string,
  build: (
    tier: Tier,
    store: Store,
  ) => Promise<{
    recordId: string;
    call: () => Promise<{ status: string; code?: string }>;
    handles?: unknown;
  }>,
): Promise<void> {
  for (const mode of MODES) {
    const tier = faultyTier();
    const store = new MemoryStore();
    const { recordId, call } = await build(tier, store);
    const chainBefore = await chainLen(store, recordId);
    const sidecarBefore = (await tier.signatures.listByRecord(recordId)).length;

    tier.state.fault = mode;
    await assert.rejects(call(), (e) => assertFault(e, recordId, tier), `${seam} (${mode})`);
    assert.equal(
      await chainLen(store, recordId),
      chainBefore,
      `${seam} (${mode}): chain unchanged`,
    );
    assert.equal(
      (await tier.signatures.listByRecord(recordId)).length,
      sidecarBefore,
      `${seam} (${mode}): sidecar unchanged`,
    );

    tier.state.fault = undefined;
    const out = await call();
    assert.notEqual(out.code, 'chain-compromise', `${seam} (${mode}): recovery is no compromise`);
    assert.equal(out.status, 'ok', `${seam} (${mode}): the same call succeeds once it recovers`);
  }
}

test('finalize: a throwing and a rejecting verifier throw the fault, append nothing, and recover', async () => {
  await pinSeam('finalize', async (tier, store) => {
    const h = instance([signingCapture('test.vf.fin.v1')], store, tier);
    const recordId = await openRecord(h, CONTENT, 'test.vf.fin.v1', 'subject:vf-1');
    return { recordId, call: () => h.operator.finalize(recordId, identity(), CONTENT, facts()) };
  });
});

test('decline: a throwing and a rejecting verifier throw the fault, append nothing, and recover', async () => {
  await pinSeam('decline', async (tier, store) => {
    const h = instance([signingCapture('test.vf.dec.v1')], store, tier);
    const recordId = await openRecord(h, CONTENT, 'test.vf.dec.v1', 'subject:vf-2');
    return { recordId, call: () => h.operator.decline(recordId, identity(), CONTENT, facts()) };
  });
});

test('raiseFinding: a throwing and a rejecting verifier throw the fault, append nothing, and recover', async () => {
  await pinSeam('raiseFinding', async (tier, store) => {
    const h = instance([flowProfile('test.vf.raise.v1')], store, tier);
    const recordId = await openRecord(h, CONTENT, 'test.vf.raise.v1', 'subject:vf-3');
    return {
      recordId,
      call: () =>
        h.operator.raiseFinding(
          recordId,
          { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
          identity({ principal: 'checker:1' }),
        ),
    };
  });
});

test('acknowledge: a throwing and a rejecting verifier throw the fault, append nothing, and recover', async () => {
  await pinSeam('acknowledge', async (tier, store) => {
    const h = instance([flowProfile('test.vf.ack.v1')], store, tier);
    const recordId = await openRecord(h, CONTENT, 'test.vf.ack.v1', 'subject:vf-4');
    const raised = await h.operator.raiseFinding(
      recordId,
      { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
      identity({ principal: 'checker:1' }),
    );
    assert.equal(raised.status, 'ok', 'fixture: a finding to acknowledge');
    return {
      recordId,
      call: () =>
        h.operator.acknowledge(recordId, { findingId: 'f-1', findingDigest: D1 }, identity()),
    };
  });
});

test('seal: a throwing and a rejecting verifier throw the fault, append nothing, and recover', async () => {
  await pinSeam('seal', async (tier, store) => {
    const h = instance([signingCapture('test.vf.seal.v1')], store, tier);
    const recordId = await openRecord(h, CONTENT, 'test.vf.seal.v1', 'subject:vf-5');
    const fin = await h.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(fin.status, 'ok', 'fixture: a confirmed, completed record');
    return { recordId, call: () => h.operator.seal(recordId) };
  });
});

function effectRecord(id: string, subject: string) {
  return async (tier: Tier, store: Store) => {
    const h = instance([{ ...effectSeamProfile({ id }), signing: true }], store, tier);
    const recordId = await openRecord(h, CONTENT, id, subject);
    const fin = await h.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(fin.status, 'ok', 'fixture: a confirmed effect-seam record');
    return { h, recordId };
  };
}

test('redeem: a throwing and a rejecting verifier throw the fault, append nothing, and recover', async () => {
  await pinSeam('redeem', async (tier, store) => {
    const { h, recordId } = await effectRecord('test.vf.redeem.v1', 'subject:vf-6')(tier, store);
    return { recordId, call: () => h.operator.redeem(recordId, CONTENT) };
  });
});

test('beginRedemption: a throwing and a rejecting verifier throw the fault, append nothing, and recover', async () => {
  await pinSeam('beginRedemption', async (tier, store) => {
    const { h, recordId } = await effectRecord('test.vf.begin.v1', 'subject:vf-7')(tier, store);
    return { recordId, call: () => h.operator.beginRedemption(recordId, CONTENT) };
  });
});

test('completeRedemption: a throwing and a rejecting verifier throw the fault, append nothing, and recover', async () => {
  await pinSeam('completeRedemption', async (tier, store) => {
    const { h, recordId } = await effectRecord('test.vf.complete.v1', 'subject:vf-8')(tier, store);
    const begun = await h.operator.beginRedemption(recordId, CONTENT);
    assert.equal(begun.status, 'ok', 'fixture: a redeeming record');
    if (begun.status !== 'ok') throw new Error('unreachable');
    return {
      recordId,
      call: () => h.operator.completeRedemption(recordId, begun.value.token, CONTENT),
    };
  });
});

test('the enlisted seam: the fault propagates, the host transaction stays open and usable, nothing is appended', async () => {
  for (const mode of MODES) {
    const tier = faultyTier();
    const sqlite = new SqliteStore(':memory:');
    try {
      const h = instance(
        [{ ...effectSeamProfile({ id: 'test.vf.tx.v1' }), signing: true }],
        sqlite,
        tier,
      );
      const recordId = await openRecord(h, CONTENT, 'test.vf.tx.v1', 'subject:vf-9');
      assert.equal(
        (await h.operator.finalize(recordId, identity(), CONTENT, facts())).status,
        'ok',
      );
      const chainBefore = await sqlite.readChain(recordId);
      const sidecarBefore = (await tier.signatures.listByRecord(recordId)).length;

      tier.state.fault = mode;
      sqlite.database.exec('BEGIN IMMEDIATE');
      let thrown: unknown;
      try {
        await h.operator.beginRedemption(recordId, CONTENT, { tx: sqlite.database });
      } catch (e) {
        thrown = e;
      }
      assert.equal(sqlite.database.isTransaction, true, "the host's transaction is still open");
      sqlite.database.exec('ROLLBACK');
      assertFault(thrown, recordId, tier);
      assert.deepEqual(
        await sqlite.readChain(recordId),
        chainBefore,
        `enlisted (${mode}): unchanged`,
      );
      assert.equal((await tier.signatures.listByRecord(recordId)).length, sidecarBefore);

      tier.state.fault = undefined;
      const again = await h.operator.beginRedemption(recordId, CONTENT);
      assert.equal(again.status, 'ok', 'recovers once the verifier answers');
    } finally {
      sqlite.close();
    }
  }
});

test('open with priorRecordRefs: a faulting verifier on the prior leg propagates and no record is created', async () => {
  for (const mode of MODES) {
    const tier = faultyTier();
    const store = new MemoryStore();
    const id = 'test.vf.two.v1';
    const h = instance([{ ...twoLegProfile({ id }), signing: true }], store, tier);
    const makerId = await openRecord(h, CONTENT, id, 'subject:vf-10', 'maker-decide');
    assert.equal((await h.operator.finalize(makerId, identity(), CONTENT, facts())).status, 'ok');
    const head = await h.operator.chainHead(makerId);
    assert.ok(head !== null);
    const staged = await h.agent.stage(CONTENT, id, 'subject:vf-10', 'checker-decide');
    assert.equal(staged.status, 'ok');
    if (staged.status !== 'ok') return;
    const makerBefore = await store.readChain(makerId);
    const sidecarBefore = (await tier.signatures.listByRecord(makerId)).length;

    tier.state.fault = mode;
    await assert.rejects(
      h.operator.open(staged.value.stagedRef, {
        priorRecordRefs: [{ recordId: makerId, chainHead: head }],
      }),
      (e) => assertFault(e, makerId, tier),
    );
    assert.deepEqual(await store.readChain(makerId), makerBefore, 'the prior leg is untouched');
    assert.equal((await tier.signatures.listByRecord(makerId)).length, sidecarBefore);

    // Nothing was created or consumed: the same staged draft opens once the verifier recovers.
    tier.state.fault = undefined;
    const opened = await h.operator.open(staged.value.stagedRef, {
      priorRecordRefs: [{ recordId: makerId, chainHead: head }],
    });
    assert.equal(opened.status, 'ok', `prior-leg open recovers (${mode})`);
  }
});

test('open with supersedes: a faulting verifier on the predecessor propagates and no record is created', async () => {
  for (const mode of MODES) {
    const tier = faultyTier();
    const store = new MemoryStore();
    const id = 'test.vf.sup.v1';
    const h = instance(
      [{ ...captureProfile({ id, terminalRefusals: ['content-drift'] }), signing: true }],
      store,
      tier,
    );
    const predId = await openRecord(h, CONTENT, id, 'subject:vf-11');
    const drifted = await h.operator.finalize(predId, identity(), WRONG, facts());
    assert.equal(drifted.status, 'refused', 'fixture: terminal by profile');
    const head = await h.operator.chainHead(predId);
    assert.ok(head !== null);
    const staged = await h.agent.stage(CONTENT, id, 'subject:vf-11');
    assert.equal(staged.status, 'ok');
    if (staged.status !== 'ok') return;
    const predBefore = await store.readChain(predId);
    const sidecarBefore = (await tier.signatures.listByRecord(predId)).length;

    tier.state.fault = mode;
    await assert.rejects(
      h.operator.open(staged.value.stagedRef, {
        supersedes: { recordId: predId, chainHead: head },
      }),
      (e) => assertFault(e, predId, tier),
    );
    assert.deepEqual(await store.readChain(predId), predBefore, 'the predecessor is untouched');
    assert.equal((await tier.signatures.listByRecord(predId)).length, sidecarBefore);

    tier.state.fault = undefined;
    const opened = await h.operator.open(staged.value.stagedRef, {
      supersedes: { recordId: predId, chainHead: head },
    });
    assert.equal(opened.status, 'ok', `supersedes open recovers (${mode})`);
  }
});

test('verifySignatures propagates the fault, the FIRST in chain order, and reports normally once it recovers', async () => {
  for (const mode of MODES) {
    const tier = faultyTier();
    const store = new MemoryStore();
    const h = instance([flowProfile('test.vf.read.v1')], store, tier);
    const recordId = await openRecord(h, CONTENT, 'test.vf.read.v1', 'subject:vf-12');
    const raised = await h.operator.raiseFinding(
      recordId,
      { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
      identity({ principal: 'checker:1' }),
    );
    assert.equal(raised.status, 'ok', 'fixture: a two-transition chain');
    assert.ok((await store.readChain(recordId)).length >= 2);

    // Every verification faults, each with its own error: the first is the genesis's.
    let n = 0;
    const errors: Error[] = [];
    tier.signing.verifiers['key-1'] = () => {
      n += 1;
      const e = new Error(`fault-${n}`);
      errors.push(e);
      return mode === 'throw'
        ? (() => {
            throw e;
          })()
        : Promise.reject(e);
    };
    await assert.rejects(h.operator.verifySignatures(recordId), (e) => {
      assert.ok(e instanceof Error);
      assert.ok(e.message.includes('seq 1'), 'the first fault in chain order is the genesis');
      assert.strictEqual(e.cause, errors[0]);
      assert.equal((e.cause as Error).message, 'fault-1');
      return true;
    });
  }

  // A plain `false` is still REPORTED, never thrown.
  const tier = faultyTier();
  const store = new MemoryStore();
  const h = instance([signingCapture('test.vf.read2.v1')], store, tier);
  const recordId = await openRecord(h, CONTENT, 'test.vf.read2.v1', 'subject:vf-13');
  tier.signing.verifiers['key-1'] = async () => false;
  const report = await h.operator.verifySignatures(recordId);
  assert.ok(report.transitions.every((t) => t.signed && !t.verified));
});

test('no overreach: a non-signing record held as non-signing, with a junk sidecar entry whose verifier throws, finalizes and seals normally', async () => {
  for (const mode of MODES) {
    const tier = faultyTier();
    const store = new MemoryStore();
    const id = 'test.vf.plain.v1';
    const h = instance([captureProfile({ id })], store, tier);
    const recordId = await openRecord(h, CONTENT, id, 'subject:vf-14');
    const genesis = (await store.readChain(recordId))[0];
    assert.ok(genesis !== undefined);
    await tier.signatures.put({
      transitionDigest: transitionDigest(genesis),
      recordId,
      seq: 1,
      keyRef: 'key-1',
      signature: 'junk',
    });
    tier.state.fault = mode;
    const callsBefore = tier.state.calls;

    const fin = await h.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(fin.status, 'ok', `finalize ignores the fault (${mode})`);
    const sealed = await h.operator.seal(recordId);
    assert.equal(sealed.status, 'ok', `seal ignores the fault (${mode})`);
    assert.ok(
      tier.state.calls > callsBefore,
      'the verifier WAS consulted — and its fault never seen',
    );
  }
});

test('the non-holder branch: a same-id signing sibling whose genesis verification faults throws; one whose live profile does not sign ignores the fault', async () => {
  const id = 'test.vf.sib.v1';
  for (const mode of MODES) {
    // The opener holds the profile; the sibling holds a ttl-edited variant of the same id, so
    // it does NOT hold the record's profile and needs the genesis verdict for its obligation.
    const tier = faultyTier();
    const store = new MemoryStore();
    const opener = instance([flowProfile(id)], store, tier);
    const recordId = await openRecord(opener, CONTENT, id, 'subject:vf-15');
    const before = await chainLen(store, recordId);
    const sidecarBefore = (await tier.signatures.listByRecord(recordId)).length;

    const signingSibling = instance([flowProfile(id, { expiry: { ttl: 60 } })], store, tier);
    const live = await signingSibling.operator.verifySignatures(recordId);
    assert.equal(
      live.genesisProfile.resolution,
      'drifted',
      'fixture: the sibling does not hold it',
    );

    tier.state.fault = mode;
    await assert.rejects(
      signingSibling.operator.finalize(recordId, identity(), CONTENT, facts()),
      (e) => assertFault(e, recordId, tier),
      `signing sibling (${mode})`,
    );
    assert.equal(await chainLen(store, recordId), before, 'nothing appended');
    assert.equal((await tier.signatures.listByRecord(recordId)).length, sidecarBefore);

    // A sibling that dropped `signing`: the obligation is false, the fault is never seen,
    // and the outcome is the ordinary non-holder refusal.
    const { signing: _dropped, ...unsigned } = flowProfile(id, { expiry: { ttl: 60 } });
    const plainSibling = instance([unsigned], store, tier);
    const out = await plainSibling.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(out.status, 'refused', `non-signing sibling (${mode})`);
    assert.equal(out.code, 'unknown-profile');
    assert.equal(await chainLen(store, recordId), before, 'still nothing appended');
  }
});
