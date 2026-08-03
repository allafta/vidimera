// @vidimera/record — transition-encoding.test.ts (design §2 "chain/encoding.ts" / §3
// PURE CORE / §5 "Transition encoding" / §6): the genesis rule, `transitionDigest`'s
// exact digest-over-JCS shape (`{recordId,seq,at,kind,payload,prevHash}`, digest
// fields serialized as strings), algorithm derivation via `algorithmOf` (never a
// hardcoded 'sha256'), and `encodeTransition`'s canonical-bytes contract. Task-4
// brief Step 1.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'vitest';

import { algorithmOf, canonicalize, digest } from '../src/canonical.js';
import { encodeTransition, genesisPrevHash, transitionDigest } from '../src/chain/encoding.js';
import type { Transition } from '../src/types.js';

// --- genesis rule: prevHash = digest(UTF-8 "vidimera:genesis:<recordId>") ----------

test('genesisPrevHash() matches an INDEPENDENT sha256 recomputation over the UTF-8 bytes of "vidimera:genesis:<recordId>"', () => {
  const recordId = 'rec-abc-123';
  const result = genesisPrevHash(recordId);

  // Independent recomputation: node:crypto directly, not via canonical.ts's digest()
  // (real recomputation, not "compare a digest to itself").
  const expectedHex = createHash('sha256')
    .update(Buffer.from(`vidimera:genesis:${recordId}`, 'utf8'))
    .digest('hex');
  assert.equal(result, `sha256:${expectedHex}`);
});

test('genesisPrevHash() is a Digest-shaped value ("sha256:<64-lowercase-hex>")', () => {
  assert.match(genesisPrevHash('rec-1'), /^sha256:[0-9a-f]{64}$/);
});

test('genesisPrevHash() is sensitive to recordId: different recordIds produce different genesis prevHash', () => {
  assert.notEqual(genesisPrevHash('rec-a'), genesisPrevHash('rec-b'));
});

test('genesisPrevHash() is deterministic: same recordId -> same genesis prevHash', () => {
  assert.equal(genesisPrevHash('rec-same'), genesisPrevHash('rec-same'));
});

test('genesisPrevHash() does NOT go through library JCS (it is a raw-string digest, not a canonicalized-structure digest)', () => {
  // If it were canonicalize({recordId})-based instead of the literal
  // "vidimera:genesis:<recordId>" string, it would collide with a differently-shaped
  // recordId whose JSON-quoted form matches the raw string. This pins the "raw UTF-8
  // string" reading of design §4/§5 against a "JCS of a wrapper object" misreading.
  const viaRawString = createHash('sha256')
    .update(Buffer.from('vidimera:genesis:rec-x', 'utf8'))
    .digest('hex');
  const viaJcsWrapper = createHash('sha256')
    .update(canonicalize({ genesis: 'rec-x' }))
    .digest('hex');
  assert.notEqual(
    viaRawString,
    viaJcsWrapper,
    'sanity: the two encodings must actually differ for this test to mean anything',
  );
  assert.equal(genesisPrevHash('rec-x'), `sha256:${viaRawString}`);
});

// --- transitionDigest(): digest over library JCS of the exact 6-field shape --------

function sampleTransition(overrides: Partial<Transition> = {}): Transition {
  return {
    recordId: 'rec-777',
    seq: 1,
    at: '2026-07-24T00:00:00.000Z',
    kind: 'opened',
    payload: { profileId: 'tide.week.v1', legId: 'approver-decide' },
    prevHash: genesisPrevHash('rec-777'),
    ...overrides,
  };
}

test('transitionDigest() equals an INDEPENDENT canonicalize+digest recomputation of {recordId,seq,at,kind,payload,prevHash} with seq AS A STRING', () => {
  const transition = sampleTransition();
  const result = transitionDigest(transition);

  // Independent recomputation built by hand from canonical.ts primitives (not by
  // calling encodeTransition/transitionDigest again) — a real cross-check, not a
  // digest-compared-to-itself tautology.
  const independentInput = {
    recordId: transition.recordId,
    seq: String(transition.seq), // <-- the "digest fields serialized as strings" clause
    at: transition.at,
    kind: transition.kind,
    payload: transition.payload,
    prevHash: transition.prevHash,
  };
  const expected = digest(canonicalize(independentInput));
  assert.equal(result, expected);
});

test('transitionDigest() serializes seq AS A STRING, not as a JSON number: the digest differs from a number-seq encoding of the same logical transition', () => {
  const transition = sampleTransition({ seq: 7 });
  const result = transitionDigest(transition);

  const withNumberSeq = digest(
    canonicalize({
      recordId: transition.recordId,
      seq: 7, // number, not "7" — the contract this test pins as WRONG
      at: transition.at,
      kind: transition.kind,
      payload: transition.payload,
      prevHash: transition.prevHash,
    }),
  );
  assert.notEqual(
    result,
    withNumberSeq,
    'seq must be serialized as a string in the digest input, not a bare JSON number',
  );

  const withStringSeq = digest(
    canonicalize({
      recordId: transition.recordId,
      seq: '7',
      at: transition.at,
      kind: transition.kind,
      payload: transition.payload,
      prevHash: transition.prevHash,
    }),
  );
  assert.equal(result, withStringSeq);
});

test('transitionDigest() covers EXACTLY the 6 named fields: an extra field on the Transition object (e.g. a stray extra property) does not leak into the digest input', () => {
  const transition = sampleTransition();
  const withExtra = { ...transition, extra: 'should-not-affect-digest' } as Transition;
  assert.equal(transitionDigest(withExtra), transitionDigest(transition));
});

test('transitionDigest() is payload-sensitive: changing the payload changes the digest', () => {
  const a = sampleTransition({ payload: { x: 1 } });
  const b = sampleTransition({ payload: { x: 2 } });
  assert.notEqual(transitionDigest(a), transitionDigest(b));
});

test('transitionDigest() is prevHash-sensitive: changing prevHash changes the digest (chain-linkage is part of what gets hashed)', () => {
  const a = sampleTransition({ prevHash: genesisPrevHash('rec-777') });
  const b = sampleTransition({ prevHash: genesisPrevHash('rec-different') });
  assert.notEqual(transitionDigest(a), transitionDigest(b));
});

test('transitionDigest() is order-insensitive on payload object keys (JCS key-sorting applies inside payload too)', () => {
  const a = sampleTransition({ payload: { alpha: 1, beta: 2 } });
  const b = sampleTransition({ payload: { beta: 2, alpha: 1 } });
  assert.equal(transitionDigest(a), transitionDigest(b));
});

test('transitionDigest() emits a Digest-shaped value ("sha256:<64-lowercase-hex>") at slice 3', () => {
  assert.match(transitionDigest(sampleTransition()), /^sha256:[0-9a-f]{64}$/);
});

// --- algorithm derivation: via algorithmOf(prevHash), never a hardcoded 'sha256' ---

test("transitionDigest() DERIVES its algorithm from prevHash rather than hardcoding sha256: an unrecognized algorithm prefix on prevHash propagates algorithmOf()'s own error", () => {
  const transition = sampleTransition({ prevHash: 'md5:' + '0'.repeat(32) });
  // If the algorithm were hardcoded to 'sha256', this would silently succeed
  // (ignoring prevHash's own claimed algorithm) instead of surfacing algorithmOf()'s
  // "unrecognized digest algorithm" guard.
  assert.throws(() => transitionDigest(transition), /unrecognized digest algorithm/);
});

test('transitionDigest() propagates algorithmOf()\'s malformed-digest error for a prevHash with no ":" separator', () => {
  const transition = sampleTransition({ prevHash: 'not-a-digest' });
  assert.throws(() => transitionDigest(transition), /malformed digest/);
});

// --- encodeTransition(): the canonical encoding bytes, standalone -----------------

test('encodeTransition() returns a Uint8Array', () => {
  const bytes = encodeTransition(sampleTransition());
  assert.ok(bytes instanceof Uint8Array);
});

test('encodeTransition() bytes, when digested under the algorithm derived from prevHash, equal transitionDigest()', () => {
  const transition = sampleTransition();
  const bytes = encodeTransition(transition);
  const expected = digest(bytes, algorithmOf(transition.prevHash));
  assert.equal(transitionDigest(transition), expected);
});

test('encodeTransition() is deterministic and content-addressed: identical transitions encode to identical bytes', () => {
  const a = encodeTransition(sampleTransition());
  const b = encodeTransition(sampleTransition());
  assert.equal(Buffer.from(a).toString('hex'), Buffer.from(b).toString('hex'));
});
