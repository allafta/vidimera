// @vidimera/record — canonicalization.test.ts: the library
// `canonicalize()`/`digest()` output matches the pure-JCS / RFC-8785 vectors
// byte-for-byte; the wrapper THROWS on a top-level `undefined`; `digest()` emits
// `"sha256:<64-lowercase-hex>"`.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  algorithmOf,
  type Canonicalizer,
  canonicalize,
  DEPRECATED_ALGORITHMS,
  digest,
  resolveCanonicalizer,
  SUPPORTED_ALGORITHMS,
} from '../src/canonical.js';
import { JCS_VECTORS } from './fixtures/jcs-vectors.js';

const textDecoder = new TextDecoder('utf-8', { fatal: true });

// --- canonicalize() vs the pure-JCS / RFC-8785 vectors --------------------------

test('canonicalize() returns a Uint8Array', () => {
  const result = canonicalize({ a: 1 });
  assert.ok(result instanceof Uint8Array, 'canonicalize() must return a Uint8Array');
});

for (const vector of JCS_VECTORS) {
  test(`canonicalize() matches the pure-JCS vector: ${vector.name}`, () => {
    const bytes = canonicalize(vector.input);
    const text = textDecoder.decode(bytes);
    assert.equal(text, vector.expected, `JCS text mismatch for vector '${vector.name}'`);
  });
}

test('canonicalize() is byte-for-byte UTF-8: the encoded bytes decode back to the exact expected text', () => {
  // Re-derive the expected byte length independently via Buffer's own UTF-8 encoder
  // (Node built-in, independent of TextEncoder) to catch any encoding-length drift.
  for (const vector of JCS_VECTORS) {
    const bytes = canonicalize(vector.input);
    const expectedBytes = Buffer.from(vector.expected, 'utf8');
    assert.equal(Buffer.from(bytes).toString('hex'), expectedBytes.toString('hex'), vector.name);
  }
});

test('canonicalize() THROWS on a top-level undefined (never silently passes it through)', () => {
  assert.throws(() => canonicalize(undefined), /undefined/i);
});

test('canonicalize() does NOT throw for null, which has a JCS representation ("null")', () => {
  const bytes = canonicalize(null);
  assert.equal(textDecoder.decode(bytes), 'null');
});

test('canonicalize() applied twice to structurally-equal-but-differently-ordered input is byte-identical (key order is normalized)', () => {
  const a = canonicalize({ x: 1, y: 2 });
  const b = canonicalize({ y: 2, x: 1 });
  assert.equal(Buffer.from(a).toString('hex'), Buffer.from(b).toString('hex'));
});

// --- digest() format + known-answer vectors --------------------------------------

test('digest() emits exactly "sha256:<64-lowercase-hex>"', () => {
  const result = digest('anything');
  assert.match(result, /^sha256:[0-9a-f]{64}$/);
});

test('digest("") matches the well-known NIST SHA-256 empty-string vector', () => {
  assert.equal(
    digest(''),
    'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  );
});

test('digest("abc") matches the well-known NIST SHA-256 test vector', () => {
  assert.equal(
    digest('abc'),
    'sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});

test('digest() accepts Uint8Array input and agrees with the equivalent UTF-8 string input', () => {
  const fromString = digest('abc');
  const fromBytes = digest(new TextEncoder().encode('abc'));
  assert.equal(fromBytes, fromString);
});

test('digest() defaults algorithm to sha256', () => {
  assert.equal(digest('abc'), digest('abc', 'sha256'));
});

test('digest() throws on an unsupported algorithm rather than deferring to node:crypto', () => {
  // @ts-expect-error — deliberately passing an algorithm outside the DigestAlgorithm union.
  assert.throws(() => digest('abc', 'md5'), /unsupported algorithm/);
});

test('digest() is deterministic: same input, same algorithm -> same output', () => {
  assert.equal(digest('repeat-me'), digest('repeat-me'));
});

test('digest() is content-sensitive: different bytes -> (overwhelmingly likely) different digest', () => {
  assert.notEqual(digest('a'), digest('b'));
});

// --- SUPPORTED_ALGORITHMS / DEPRECATED_ALGORITHMS (digest-agility surfaces) ------

test('SUPPORTED_ALGORITHMS is exactly [sha256] in this build', () => {
  assert.deepEqual([...SUPPORTED_ALGORITHMS], ['sha256']);
});

test('DEPRECATED_ALGORITHMS is empty in this build (nothing has been superseded yet)', () => {
  assert.equal(DEPRECATED_ALGORITHMS.size, 0);
});

// --- algorithmOf(): recorded-algorithm resolution --------------------------------

test('algorithmOf() resolves the algorithm segment of a recorded digest', () => {
  const recorded = digest('some content');
  assert.equal(algorithmOf(recorded), 'sha256');
});

test('algorithmOf() throws on a malformed digest (no ":" separator)', () => {
  assert.throws(() => algorithmOf('not-a-digest'), /malformed digest/);
});

test('algorithmOf() throws on an unrecognized algorithm', () => {
  assert.throws(() => algorithmOf('md5:deadbeef'), /unrecognized digest algorithm/);
});

// --- resolveCanonicalizer(): registry resolution (fail-closed) ------------------

test('resolveCanonicalizer() returns the registered canonicalizer for a resolvable ref', () => {
  const passthrough: Canonicalizer = (content) => content;
  const registry: Record<string, Canonicalizer> = { 'test.canonicalWeek.v1': passthrough };
  assert.equal(resolveCanonicalizer(registry, 'test.canonicalWeek.v1'), passthrough);
});

test('resolveCanonicalizer() FAILS CLOSED: throws on a missing ref rather than returning undefined', () => {
  const registry: Record<string, Canonicalizer> = {};
  assert.throws(
    () => resolveCanonicalizer(registry, 'unregistered.ref'),
    /unresolved canonicalizerRef/,
  );
});

test('resolveCanonicalizer() FAILS CLOSED: throws on a ref that names an inherited Object.prototype member (e.g. "toString") rather than resolving it through the prototype chain', () => {
  const registry: Record<string, Canonicalizer> = {};
  assert.throws(() => resolveCanonicalizer(registry, 'toString'), /unresolved canonicalizerRef/);
});
