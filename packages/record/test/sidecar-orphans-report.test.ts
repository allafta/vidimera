// @vidimera/record — sidecar-orphans-report.test.ts (the sidecar-orphans-report increment).
// Pins over `SignatureReport.orphans`: every sidecar digest for the record that names no
// transition in the chain, sorted, computed inside the one pass `verifySignatures` already
// makes. Deferral-register row 22's open half is one orphan per refusing seam call against a
// record admitting no CAS candidate; the `SignatureStore` contract tells a host to prune
// entries no chain transition references, and this field is how a host learns which those are.
//
// What these pins prove, and in the same breath what they cannot: the report NAMES orphans.
// Nothing here bounds them, deletes them, or lets them gate anything — the never-gates pin
// below is the load-bearing one, and the row stays open.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { SignatureStore, Signer, Verifier } from '../src/signing/store.js';
import type { Digest } from '../src/types.js';
import { captureProfile, facts, identity, makeConfig, openRecord } from './helpers/profiles.js';
import { breakOneSignature, enforceableSigningSetup } from './helpers/signing.js';

const CONTENT = { subject: 'week-1', total: 40 };
const PROFILE_ID = 'test.orphans.v1';
const PROFILE: ConfirmProfile = { ...captureProfile({ id: PROFILE_ID }), signing: true };
/** Built, never written as a literal: a 64-char hex run is what the contract scan flags. */
const FABRICATED: Digest = `sha256:${'0'.repeat(64)}`;

test('a clean signing record reports no orphans', async () => {
  const rig = enforceableSigningSetup([PROFILE]);
  const recordId = await openRecord(rig.handles, CONTENT, PROFILE_ID, 'subject:orph-clean');
  assert.equal(
    (await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts())).status,
    'ok',
  );
  const report = await rig.handles.operator.verifySignatures(recordId);
  assert.deepEqual(report.orphans, []);
  assert.ok(report.transitions.every((t) => t.signed && t.verified));
});

test('the already-refused corner: one refusing call with no edge leaves exactly one orphan, and the report names it', async () => {
  const rig = enforceableSigningSetup([PROFILE]);
  const recordId = await openRecord(rig.handles, CONTENT, PROFILE_ID, 'subject:orph-refused');
  assert.equal(
    (await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts())).status,
    'ok',
  );
  await breakOneSignature(rig.signatures, recordId, rig.store);

  // First refusing call LANDS the compromise edge (C3's carve-out admits it out of a terminal
  // `confirmed`), so every sidecar entry still has a chain counterpart.
  const landed = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(landed.status, 'refused');
  if (landed.status !== 'refused') return;
  assert.ok(landed.transitionRef !== undefined, 'fixture: the edge landed');
  assert.deepEqual((await rig.handles.operator.verifySignatures(recordId)).orphans, []);

  // Second refusing call: the record is terminal `refused`, no candidate can win its CAS, and
  // the decorator has already written the attempt's entry — ONE orphan.
  const noEdge = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(noEdge.status, 'refused');
  if (noEdge.status !== 'refused') return;
  assert.equal(noEdge.transitionRef, undefined, 'fixture: no edge landed');

  const chain = await rig.store.readChain(recordId);
  const chainDigests = new Set(chain.map((t) => transitionDigest(t)));
  const report = await rig.handles.operator.verifySignatures(recordId);
  assert.equal(report.orphans.length, 1, 'exactly one orphan');
  const orphan = report.orphans[0];
  assert.ok(orphan !== undefined);
  assert.equal(chainDigests.has(orphan), false, 'the orphan names no chain transition');
  const entry = (await rig.signatures.listByRecord(recordId)).find(
    (e) => e.transitionDigest === orphan,
  );
  assert.ok(entry !== undefined, 'the orphan is a real sidecar entry');
  assert.equal(entry.seq, chain.length + 1, 'minted for the append that never landed');
  // The verdicts are unaffected: every chain transition still reports as before.
  assert.equal(report.transitions.length, chain.length);
});

test('orphans never gate: an open record carrying a fabricated orphan still finalizes ok, and its verdicts are unchanged', async () => {
  const rig = enforceableSigningSetup([PROFILE]);
  const recordId = await openRecord(rig.handles, CONTENT, PROFILE_ID, 'subject:orph-gate');
  const before = await rig.handles.operator.verifySignatures(recordId);
  assert.deepEqual(before.orphans, []);

  await rig.signatures.put({
    transitionDigest: FABRICATED,
    recordId,
    seq: 99,
    keyRef: 'key-1',
    signature: 'AAAA',
  });
  const after = await rig.handles.operator.verifySignatures(recordId);
  assert.deepEqual(after.orphans, [FABRICATED], 'the report names the fabricated orphan');
  assert.deepEqual(after.transitions, before.transitions, 'the chain verdicts are byte-identical');

  // The seam consults `signatureLayerHolds`, which walks the CHAIN; an orphan is never visited.
  const done = await rig.handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'an orphan gates nothing');
});

/**
 * A `SignatureStore` wrapper that returns the real entries in ALTERNATING order on successive
 * `listByRecord` calls — insertion order, then reversed, then insertion order again. Legal:
 * `signing/store.ts` promises "chain order not guaranteed". Two consecutive reports over it
 * must be deep-equal, or the report would be a sidecar-driven artifact.
 */
function alternatingOrder(inner: SignatureStore): SignatureStore {
  let flip = false;
  return {
    put: (entry) => inner.put(entry),
    listByRecord: async (id) => {
      const real = await inner.listByRecord(id);
      flip = !flip;
      return flip ? [...real].reverse() : real;
    },
  };
}

test('the report is deterministic under a contract-legal reordering of the sidecar: sorted, and deep-equal across calls', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const signer: Signer = async (bytes) => ({
    keyRef: 'key-1',
    signature: edSign(null, bytes, privateKey).toString('base64'),
  });
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  const inner = new MemorySignatureStore();
  const handles = create({
    ...makeConfig([PROFILE]),
    signing: { signer, verifiers: { 'key-1': verifier }, signatures: alternatingOrder(inner) },
  });
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, 'subject:orph-order');
  assert.equal(
    (await handles.operator.finalize(recordId, identity(), CONTENT, facts())).status,
    'ok',
  );
  // Two orphans, put in an order that is NOT sorted, so sorting is observable.
  const second: Digest = `sha256:${'f'.repeat(64)}`;
  await inner.put({
    transitionDigest: second,
    recordId,
    seq: 98,
    keyRef: 'key-1',
    signature: 'AAAA',
  });
  await inner.put({
    transitionDigest: FABRICATED,
    recordId,
    seq: 99,
    keyRef: 'key-1',
    signature: 'AAAA',
  });

  const first = await handles.operator.verifySignatures(recordId);
  const again = await handles.operator.verifySignatures(recordId);
  assert.deepEqual(first.orphans, [FABRICATED, second], 'sorted lexicographically');
  assert.deepEqual(first, again, 'the whole report is identical under the reordering');
  assert.ok(first.transitions.every((t) => t.signed && t.verified));
});

test('a non-signing instance reports no orphans and does not overreach', async () => {
  const handles = create(makeConfig([captureProfile({ id: 'test.orphans.plain.v1' })]));
  const recordId = await openRecord(
    handles,
    CONTENT,
    'test.orphans.plain.v1',
    'subject:orph-plain',
  );
  const report = await handles.operator.verifySignatures(recordId);
  assert.equal(report.signingDeclared, false);
  assert.deepEqual(report.orphans, []);
});
