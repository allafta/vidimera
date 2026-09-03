// @vidimera/record — verifier-registry.test.ts: the verifier registry is a plain object
// keyed by the host's opaque keyRefs, and a sidecar entry's keyRef is data read back from
// storage. Under the signature layer's own threat model (SPEC §14, "a single operator who
// must resist its own storage-writing insiders") that data is the adversary's to write. A
// bare index into a plain object walks the prototype chain, so a forged entry whose keyRef
// named an inherited Object.prototype member resolved to that member instead of missing;
// two of them (`toString`, `constructor`) return a truthy value when called with transition
// bytes and a signature, and the layer read truthiness. A sidecar could therefore be forged
// with no key at all, and every enforcement site confirmed the record.
//
// `canonical.ts`'s `resolveCanonicalizer` closed this same trap at the 2026-08-03 step-1
// review with `Object.hasOwn`, calling it "load-bearing, not a style choice"; the verifier
// registry arrived with the AL2 mint increment and did not carry the guard. These pins cover
// the family whole: the two members that returned truthy (red before the fix), the members
// that already failed closed by throwing or by not being callable (a boundary pin — green
// before the fix, kept so the family is named in one place), and a host verifier whose
// answer is truthy but not the literal `true`, which the same truthiness read admitted.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { SignatureStore, Signer, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import { captureProfile, facts, identity, makeConfig, openRecord } from './helpers/profiles.js';
import { enforceableSigningSetup } from './helpers/signing.js';

const CONTENT = { subject: 'week-1', total: 40 };
const PROFILE_ID = 'test.vreg.v1';

function signingProfile(): ConfirmProfile {
  return { ...captureProfile({ id: PROFILE_ID }), signing: true };
}

/**
 * Re-key EVERY sidecar entry of the record to `keyRef` — the forged-sidecar shape: no entry
 * names a registered key, so nothing in the sidecar was made by the operator's signer. `put`
 * is keyed by transitionDigest, so each call replaces the entry it re-keys.
 */
async function rekeyAll(
  signatures: SignatureStore,
  recordId: string,
  keyRef: string,
): Promise<void> {
  const entries = await signatures.listByRecord(recordId);
  assert.ok(entries.length > 0, 'fixture: the signing record has sidecar entries to re-key');
  for (const entry of entries) {
    await signatures.put({ ...entry, keyRef });
  }
}

async function assertLayerRefuses(
  handles: ReturnType<typeof create>,
  recordId: string,
  expectedKeyRef: string,
): Promise<void> {
  const report = await handles.operator.verifySignatures(recordId);
  assert.equal(report.signingDeclared, true, 'the genesis profile declares signing');
  assert.ok(report.transitions.length > 0);
  for (const t of report.transitions) {
    assert.equal(
      t.signed,
      true,
      `seq ${t.seq}: the forged entry is PRESENT — a keyRef miss, not a missing entry`,
    );
    assert.equal(t.keyRef, expectedKeyRef);
    assert.strictEqual(
      t.verified,
      false,
      `seq ${t.seq}: a keyRef that is not an own key of the registry resolves no verifier`,
    );
  }

  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(
    out.status,
    'refused',
    'no registered key signed this record; the layer must not hold',
  );
  if (out.status === 'refused') assert.equal(out.code, 'chain-compromise');
}

for (const keyRef of ['toString', 'constructor']) {
  test(`a sidecar keyRef naming the inherited member '${keyRef}' resolves no verifier: the report says unverified and finalize refuses chain-compromise`, async () => {
    const { handles, signatures } = enforceableSigningSetup([signingProfile()]);
    const recordId = await openRecord(handles, CONTENT, PROFILE_ID, `subject:vreg-${keyRef}`);
    await rekeyAll(signatures, recordId, keyRef);
    await assertLayerRefuses(handles, recordId, keyRef);
  });
}

for (const keyRef of ['valueOf', 'hasOwnProperty', 'isPrototypeOf', '__proto__']) {
  test(`boundary: the inherited member '${keyRef}' fails closed — it throws when called or is not callable — pinned so the family is whole`, async () => {
    const { handles, signatures } = enforceableSigningSetup([signingProfile()]);
    const recordId = await openRecord(handles, CONTENT, PROFILE_ID, `subject:vreg-${keyRef}`);
    await rekeyAll(signatures, recordId, keyRef);
    await assertLayerRefuses(handles, recordId, keyRef);
  });
}

test('a host verifier answering a truthy non-boolean does not verify: the layer requires the literal true', async () => {
  // A rig whose ONLY verifier answers with a truthy string — a host bug, or a verifier
  // library whose "success" is a status value. `Verifier` promises a boolean; anything else
  // is not a verification, and the report must say so rather than pass it on truthiness.
  const store = new MemoryStore();
  const signatures = new MemorySignatureStore();
  const signer: Signer = async () => ({ keyRef: 'key-1', signature: 'unused-by-this-verifier' });
  const truthy = (async () => 'verified') as unknown as Verifier;
  const handles = create({
    ...makeConfig([signingProfile()], { store }),
    signing: { signer, verifiers: { 'key-1': truthy }, signatures },
  });
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, 'subject:vreg-truthy');

  const report = await handles.operator.verifySignatures(recordId);
  assert.ok(report.transitions.length > 0);
  for (const t of report.transitions) {
    assert.equal(t.signed, true);
    assert.strictEqual(t.verified, false, `seq ${t.seq}: 'verified' is not the literal true`);
  }
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'chain-compromise');
});
