// @vidimera/record — verifier-faults.test.ts: a host verifier that THROWS or REJECTS is a
// fault, not a verdict. Where the signature layer applies, the seam (or the cross-record
// verification, or the read) propagates the fault and appends nothing; the same call
// succeeds once the verifier answers again. Where the layer does not apply the fault is
// never seen. Before this increment a fault read as `verified: false` and every un-enlisted
// seam appended a terminal `chain-compromise` edge to an untouched record.
//
// A fault never outranks a DEFINITE MISS: a missing entry, a non-string sidecar field, an
// unregistered keyRef or a non-`true` answer on any transition still fails the layer closed
// while another transition's verifier faults, and a non-string field never reaches the
// verifier at all. The pins after the non-holder branch hold that line, and the cost the mint
// check adds: on a hash-broken chain the compromise edge itself waits for the instance's own
// verifier.
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
import type { SignatureEntry, Signer, SigningConfig, Verifier } from '../src/signing/store.js';
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
  tamperNonLast,
  twoLegProfile,
} from './helpers/profiles.js';
import { breakOneSignature } from './helpers/signing.js';

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
    const plainCallsBefore = tier.state.calls;
    const out = await plainSibling.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(out.status, 'refused', `non-signing sibling (${mode})`);
    assert.equal(out.code, 'unknown-profile');
    assert.equal(await chainLen(store, recordId), before, 'still nothing appended');
    assert.ok(
      tier.state.calls > plainCallsBefore,
      'the verifier WAS consulted by the non-signing sibling — and its fault ignored',
    );
  }
});

// --- a definite miss, a non-string field, and the faults around them ----------------------

/** The sidecar entry for the transition at `seq`, found through the chain (never by position). */
async function entryAt(tier: Tier, store: Store, recordId: string, seq: number) {
  const t = (await store.readChain(recordId))[seq - 1];
  assert.ok(t !== undefined, `fixture: the chain has a transition at seq ${seq}`);
  const digest = transitionDigest(t);
  const entry = (await tier.signatures.listByRecord(recordId)).find(
    (e) => e.transitionDigest === digest,
  );
  assert.ok(entry !== undefined, `fixture: seq ${seq} has a sidecar entry`);
  return entry;
}

/**
 * Makes the tier's verifier fault ONLY over one signature — a single transition's entry — and
 * answer normally over everything else, the mint check's fresh signatures included. Returns how
 * many times the fault fired.
 */
function faultOnly(tier: Tier, mode: Mode, victimSignature: string): () => number {
  const healthy = tier.signing.verifiers['key-1'];
  assert.ok(healthy !== undefined);
  let fired = 0;
  tier.signing.verifiers['key-1'] = (bytes, signature) => {
    if (signature !== victimSignature) return healthy(bytes, signature);
    fired += 1;
    if (mode === 'throw') throw tier.state.outage;
    return Promise.reject(tier.state.outage);
  };
  return () => fired;
}

/** The compromise edge, asserted drawn: refused `chain-compromise` whose ref is the new head. */
async function assertEdgeDrawn(
  out: { status: string; code?: string; transitionRef?: string },
  store: Store,
  recordId: string,
  lengthBefore: number,
  label: string,
): Promise<void> {
  assert.equal(out.status, 'refused', `${label}: refused, not thrown`);
  assert.equal(out.code, 'chain-compromise', `${label}: chain-compromise`);
  const after = await store.readChain(recordId);
  assert.equal(after.length, lengthBefore + 1, `${label}: the compromise edge was appended`);
  const head = after.at(-1);
  assert.ok(head !== undefined);
  assert.equal(head.kind, 'refused', `${label}: the edge is a refused transition`);
  assert.equal(out.transitionRef, transitionDigest(head), `${label}: the refusal names the edge`);
}

test('a definite miss outranks a verifier fault: finalize on an open record with one entry deleted and another transition faulting refuses chain-compromise and draws the edge, in either chain order; the fault alone still throws', async () => {
  const id = 'test.vf.miss.fin.v1';
  for (const mode of MODES) {
    for (const [missSeq, faultSeq] of [
      [2, 1],
      [1, 2],
    ] as const) {
      const label = `${mode}, miss at seq ${missSeq}, fault at seq ${faultSeq}`;
      const tier = faultyTier();
      const store = new MemoryStore();
      const h = instance([flowProfile(id)], store, tier);
      const recordId = await openRecord(h, CONTENT, id, 'subject:vf-18');
      const raised = await h.operator.raiseFinding(
        recordId,
        { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
        identity({ principal: 'checker:1' }),
      );
      assert.equal(raised.status, 'ok', 'fixture: a two-transition open record');
      const missing = await entryAt(tier, store, recordId, missSeq);
      const victim = await entryAt(tier, store, recordId, faultSeq);
      tier.signatures.delete(missing.transitionDigest);
      const fired = faultOnly(tier, mode, victim.signature);
      const lengthBefore = await chainLen(store, recordId);

      const out = await h.operator.finalize(recordId, identity(), CONTENT, facts());
      await assertEdgeDrawn(out, store, recordId, lengthBefore, label);
      assert.ok(fired() > 0, `${label}: the other transition's verifier did fault`);
    }

    // The fault alone, with no miss anywhere: nothing decides the layer, so the seam throws.
    const tier = faultyTier();
    const store = new MemoryStore();
    const h = instance([flowProfile(id)], store, tier);
    const recordId = await openRecord(h, CONTENT, id, 'subject:vf-18');
    const raised = await h.operator.raiseFinding(
      recordId,
      { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
      identity({ principal: 'checker:1' }),
    );
    assert.equal(raised.status, 'ok');
    faultOnly(tier, mode, (await entryAt(tier, store, recordId, 2)).signature);
    const lengthBefore = await chainLen(store, recordId);
    await assert.rejects(
      h.operator.finalize(recordId, identity(), CONTENT, facts()),
      (e) => assertFault(e, recordId, tier, 2),
      `the fault alone throws (${mode})`,
    );
    assert.equal(await chainLen(store, recordId), lengthBefore, 'the fault alone appends nothing');
  }
});

test('a definite miss outranks a verifier fault at seal: a confirmed record with its last entry deleted and its genesis verification faulting refuses chain-compromise and draws the edge; the fault alone still throws', async () => {
  const id = 'test.vf.miss.seal.v1';
  for (const mode of MODES) {
    const tier = faultyTier();
    const store = new MemoryStore();
    const h = instance([signingCapture(id)], store, tier);
    const recordId = await openRecord(h, CONTENT, id, 'subject:vf-19');
    const fin = await h.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(fin.status, 'ok', 'fixture: a confirmed, completed record');
    const lengthBefore = await chainLen(store, recordId);
    const missing = await entryAt(tier, store, recordId, lengthBefore);
    const victim = await entryAt(tier, store, recordId, 1);
    tier.signatures.delete(missing.transitionDigest);
    const fired = faultOnly(tier, mode, victim.signature);

    const out = await h.operator.seal(recordId);
    await assertEdgeDrawn(out, store, recordId, lengthBefore, `seal (${mode})`);
    assert.ok(fired() > 0, `seal (${mode}): the genesis verifier did fault`);

    // The fault alone: a second, healthy record on a fresh tier.
    const tier2 = faultyTier();
    const store2 = new MemoryStore();
    const h2 = instance([signingCapture(id)], store2, tier2);
    const recordId2 = await openRecord(h2, CONTENT, id, 'subject:vf-19');
    const fin2 = await h2.operator.finalize(recordId2, identity(), CONTENT, facts());
    assert.equal(fin2.status, 'ok');
    faultOnly(tier2, mode, (await entryAt(tier2, store2, recordId2, 1)).signature);
    const length2 = await chainLen(store2, recordId2);
    await assert.rejects(
      h2.operator.seal(recordId2),
      (e) => assertFault(e, recordId2, tier2, 1),
      `seal: the fault alone throws (${mode})`,
    );
    assert.equal(await chainLen(store2, recordId2), length2, 'the fault alone appends nothing');
  }
});

test('a non-string sidecar field is a definite miss and never reaches the verifier: a planted null signature and a JSON-object keyRef report verified: false and refuse chain-compromise, with no throw', async () => {
  const id = 'test.vf.typed.v1';
  const plants: Array<[string, (e: SignatureEntry) => unknown, string | undefined]> = [
    ['keyRef: a JSON object', (e) => ({ ...e, keyRef: JSON.parse('{"toString":"x"}') }), undefined],
    ['signature: null', (e) => ({ ...e, signature: null }), 'key-1'],
  ];
  for (const [label, plant, reportedKeyRef] of plants) {
    // The rig's healthy verifier is the guide's sample shape — `Buffer.from(signature,
    // 'base64')` — which throws on a non-string signature.
    const tier = faultyTier();
    const store = new MemoryStore();
    const h = instance([signingCapture(id)], store, tier);
    const recordId = await openRecord(h, CONTENT, id, 'subject:vf-20');
    const genesis = await entryAt(tier, store, recordId, 1);
    await tier.signatures.put(plant(genesis) as SignatureEntry);

    const callsBefore = tier.state.calls;
    const report = await h.operator.verifySignatures(recordId);
    assert.equal(tier.state.calls, callsBefore, `${label}: the verifier is never called`);
    const t1 = report.transitions[0];
    assert.ok(t1 !== undefined);
    assert.equal(t1.signed, true, `${label}: an entry is present`);
    assert.equal(t1.verified, false, `${label}: and it does not verify`);
    assert.equal(t1.keyRef, reportedKeyRef, `${label}: a non-string keyRef is never reported`);

    const lengthBefore = await chainLen(store, recordId);
    const out = await h.operator.finalize(recordId, identity(), CONTENT, facts());
    await assertEdgeDrawn(out, store, recordId, lengthBefore, label);
  }
});

test('the non-holder branch with no genesis fault: a signing sibling over a record whose genesis entry is missing, fails, or names an unknown key, and whose LATER transition faults, refuses unknown-profile without throwing', async () => {
  const id = 'test.vf.sib2.v1';
  const shapes = ['missing', 'fails', 'unknown keyRef'] as const;
  for (const mode of MODES) {
    for (const shape of shapes) {
      const label = `${mode}, genesis ${shape}`;
      const tier = faultyTier();
      const store = new MemoryStore();
      const opener = instance([flowProfile(id)], store, tier);
      const recordId = await openRecord(opener, CONTENT, id, 'subject:vf-21');
      const raised = await opener.operator.raiseFinding(
        recordId,
        { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
        identity({ principal: 'checker:1' }),
      );
      assert.equal(raised.status, 'ok', 'fixture: a two-transition open record');
      const genesis = await entryAt(tier, store, recordId, 1);
      const later = await entryAt(tier, store, recordId, 2);
      if (shape === 'missing') tier.signatures.delete(genesis.transitionDigest);
      if (shape === 'fails') await breakOneSignature(tier.signatures, recordId, store);
      if (shape === 'unknown keyRef') {
        await tier.signatures.put({ ...genesis, keyRef: 'key-unknown' });
      }
      const fired = faultOnly(tier, mode, later.signature);
      const lengthBefore = await chainLen(store, recordId);

      const sibling = instance([flowProfile(id, { expiry: { ttl: 60 } })], store, tier);
      const out = await sibling.operator.finalize(recordId, identity(), CONTENT, facts());
      assert.equal(out.status, 'refused', `${label}: refused, not thrown`);
      assert.equal(out.code, 'unknown-profile', `${label}: the ordinary non-holder refusal`);
      assert.equal(await chainLen(store, recordId), lengthBefore, `${label}: nothing appended`);
      assert.ok(fired() > 0, `${label}: the later transition's verifier did fault`);
    }
  }
});

test("a hash-broken signing chain while the instance's OWN verifier faults: the seam throws, since the compromise edge's mint check cannot run, and appends nothing; once the verifier recovers the same call draws chain-compromise", async () => {
  const id = 'test.vf.hash.v1';
  for (const mode of MODES) {
    const tier = faultyTier();
    const source = new MemoryStore();
    const opener = instance([flowProfile(id)], source, tier);
    const recordId = await openRecord(opener, CONTENT, id, 'subject:vf-22');
    const raised = await opener.operator.raiseFinding(
      recordId,
      { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
      identity({ principal: 'checker:1' }),
    );
    assert.equal(raised.status, 'ok', 'fixture: a two-transition open record');
    // A payload tamper of the genesis, copied into a second store: AL1 fails at seq 2.
    const tampered = new MemoryStore();
    for (const [i, t] of tamperNonLast(await source.readChain(recordId)).entries()) {
      await tampered.appendTransition(i === 0 ? null : 'open', t, { nonTerminal: true });
    }
    const h = instance([flowProfile(id)], tampered, tier);
    const chainBefore = await tampered.readChain(recordId);
    const sidecarBefore = (await tier.signatures.listByRecord(recordId)).length;

    tier.state.fault = mode;
    let thrown: unknown;
    try {
      await h.operator.finalize(recordId, identity(), CONTENT, facts());
    } catch (e) {
      thrown = e;
    }
    assert.ok(thrown instanceof Error, `the seam threw (${mode})`);
    assert.match(thrown.message, /signing: the verifier for keyRef 'key-1' threw or rejected/);
    assert.strictEqual(thrown.cause, tier.state.outage, "the verifier's own error is the cause");
    assert.deepEqual(await tampered.readChain(recordId), chainBefore, 'nothing appended');
    assert.equal(
      (await tier.signatures.listByRecord(recordId)).length,
      sidecarBefore,
      'nothing put to the sidecar',
    );

    tier.state.fault = undefined;
    const out = await h.operator.finalize(recordId, identity(), CONTENT, facts());
    await assertEdgeDrawn(out, tampered, recordId, chainBefore.length, `recovered (${mode})`);
  }
});
