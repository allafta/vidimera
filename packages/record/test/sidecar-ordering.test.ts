// @vidimera/record — sidecar-ordering.test.ts (the sidecar-contract increment). Two pins over
// the ONE ordering freedom `signing/store.ts` grants a `SignatureStore`: `listByRecord`
// returns "chain order not guaranteed", and the caller "correlates by transitionDigest
// (chain-driven, never sidecar-driven)". Two readers in this repository took the list's first
// element instead — the `signature-tamper-refuses` operator-assurance probe in production
// source, and the corpus's shared `breakOneSignature` helper — and both happened to work only
// because `MemorySignatureStore` iterates its `Map` in insertion order, so the first entry
// was the genesis. Nothing pinned that. A signing deployment can also hold entries whose digest
// names no transition in the chain — in separate mode, which every pin in this file runs (its
// sidecars are `MemorySignatureStore`s, not the store's own), because the decorator writes the
// compromise append's entry before delegating, so every refusing call against a record admitting
// no CAS candidate leaves one (deferral-register row 22); and in either mode once a committed
// transition is deleted or rewritten — so under any other legal ordering a positional reader can
// pick an orphan.
//
// Each pin injects an orphan-FIRST ordering through a contract-legal wrapper and asserts the
// reader still did its job: the probe still PASSES against a sound build, and the helper still
// tampers a REAL entry. Both were written red first — the probe reported a false FAIL and the
// helper's own two guard assertions passed while it garbled the orphan — and went green when
// each reader was made to correlate through the chain.
//
// The bound, in the same breath: both defects were LATENT, not live. These pins INJECT an
// ordering the contract permits; they do not demonstrate a deployment that produces it, and no
// real flow was found that reaches an orphan for the probe's own freshly-minted record. Row
// 22's orphan half is not touched here — the orphan these pins fabricate is exactly the kind a
// conforming sidecar is now documented to hold.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import type { ConfirmProfile } from '../src/config.js';
import type { ProbeDriver } from '../src/probes/index.js';
import { ALL_PROBES } from '../src/probes/index.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { SignatureEntry, SignatureStore, Signer, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Digest } from '../src/types.js';
import { captureProfile, identity, makeConfig, openRecord } from './helpers/profiles.js';
import { breakOneSignature, enforceableSigningSetup } from './helpers/signing.js';

/**
 * A `SignatureStore` wrapper that returns a fabricated orphan entry AHEAD of every real one.
 * Contract-legal, and it STAYS legal while the pin runs: `signing/store.ts` promises "chain
 * order not guaranteed", and the wrapper stops injecting once its own digest is present in the
 * backing, so `listByRecord` never returns two entries for one `transitionDigest` — the one
 * thing `signing/store.ts` calls out of contract. The orphan's digest names no transition in
 * the chain, which is the state a signing deployment in separate mode reaches on its own: the
 * decorator writes the compromise append's entry before delegating, so every refusing call
 * against a record admitting no CAS candidate leaves one behind. (Integrated mode leaves none on
 * that path; a deleted or rewritten committed transition leaves one in either mode.)
 *
 * ID-AGNOSTIC ON PURPOSE. The probe mints its own record inside `run()`, after `makeConfig()`
 * has already handed this store over, so no caller can gate the injection on a recordId.
 * Every non-empty listing gets the orphan.
 *
 * The re-entrancy guard (`real.some(...)`) is load-bearing, not tidiness: a positional reader
 * writes its tamper back through `put`, so without the guard the very next `listByRecord`
 * would return two entries carrying `ORPHAN_DIGEST` — an ILLEGAL store, and the pin would then
 * be exercising a contract violation rather than a legal ordering.
 */
const ORPHAN_DIGEST: Digest = `sha256:${'0'.repeat(64)}`;

function orphanFirst(inner: SignatureStore): SignatureStore {
  return {
    put: (entry) => inner.put(entry),
    listByRecord: async (id) => {
      const real = await inner.listByRecord(id);
      if (real.length === 0 || real.some((e) => e.transitionDigest === ORPHAN_DIGEST)) {
        return real;
      }
      const sample = real[0] as SignatureEntry;
      return [{ ...sample, transitionDigest: ORPHAN_DIGEST, seq: real.length + 1 }, ...real];
    },
  };
}

// === the probe pin ======================================================================

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const signer: Signer = async (bytes) => ({
  keyRef: 'key-1',
  signature: edSign(null, bytes, privateKey).toString('base64'),
});
const verifier: Verifier = async (bytes, signature) =>
  edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));

/**
 * A minimal conforming `ProbeDriver`: one signing capture profile, an independent
 * `MemoryStore` per `makeConfig()` call, and the sidecar wrapped by `orphanFirst`. The wrapper
 * has to be installed HERE — `makeConfig()` is the only handle the probe takes, and it mints
 * its own record afterwards.
 */
function makeOrphanFirstDriver(): ProbeDriver {
  const profile: ConfirmProfile = { ...captureProfile({ id: 'probe.ord.v1' }), signing: true };
  let counter = 0;
  return {
    makeConfig() {
      return {
        ...makeConfig([profile], { store: new MemoryStore() }),
        signing: {
          signer,
          verifiers: { 'key-1': verifier },
          signatures: orphanFirst(new MemorySignatureStore()),
        },
      };
    },
    sampleContent(profileId: string) {
      counter += 1;
      return {
        content: { probedProfile: profileId, n: counter },
        subjectRef: `subject:ord-${counter}`,
      };
    },
    sampleIdentity() {
      return identity();
    },
  };
}

test('signature-tamper-refuses PASSES against a sound build under an orphan-first listByRecord ordering', async () => {
  const probe = ALL_PROBES.find((p) => p.id === 'signature-tamper-refuses');
  assert.ok(probe !== undefined, 'fixture: the probe exists');
  const result = await probe.run(makeOrphanFirstDriver());
  // Red before the fix: the probe garbled the orphan, every real signature survived, and its
  // attacking finalize() reached the state guard instead of the signature gate — a FAIL
  // against a sound build, the one verdict the operator-assurance tier exists never to give.
  assert.equal(result.status, 'pass', `the probe must not fail a sound build: ${result.detail}`);
});

// === the helper pin =====================================================================

const CONTENT = { subject: 'week-1', total: 40 };

test('breakOneSignature tampers a REAL entry under an orphan-first ordering — the genesis signature changes', async () => {
  const profile: ConfirmProfile = { ...captureProfile({ id: 'test.ord.v1' }), signing: true };
  const rig = enforceableSigningSetup([profile]);
  const recordId = await openRecord(rig.handles, CONTENT, 'test.ord.v1', 'subject:ord-1');

  const chain = await rig.store.readChain(recordId);
  const genesis = chain[0];
  assert.ok(genesis !== undefined, 'fixture: the record has a chain');
  const genesisDigest = transitionDigest(genesis);
  const before = (await rig.signatures.listByRecord(recordId)).find(
    (e) => e.transitionDigest === genesisDigest,
  );
  assert.ok(before !== undefined, 'fixture: the genesis transition has a sidecar entry');

  // The wrapped sidecar is what a caller under an adverse-but-legal ordering would hand in.
  await breakOneSignature(orphanFirst(rig.signatures), recordId, rig.store);

  // What makes this defect nasty: BOTH of the helper's own guard assertions pass while it does
  // the wrong thing — an orphan is an entry, and overwriting its leading four characters does
  // change bytes — so the fixture proves nothing and the test it serves goes green.
  const after = (await rig.signatures.listByRecord(recordId)).find(
    (e) => e.transitionDigest === genesisDigest,
  );
  assert.ok(after !== undefined, 'the genesis entry is still present');
  assert.notEqual(
    after.signature,
    before.signature,
    'the helper must tamper a REAL entry: the genesis signature did not change, so it garbled the orphan',
  );
});
