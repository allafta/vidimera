import assert from 'node:assert/strict';
import { test } from 'vitest';
import { serializeJcs } from '../src/jcs.js';

test('sorts object keys recursively by UTF-16 code unit', () => {
  assert.equal(serializeJcs({ b: 1, a: { d: 2, c: 3 } }), '{"a":{"c":3,"d":2},"b":1}');
  // A lead surrogate (U+D83D) sorts before U+FB33 under code UNITS, after it
  // under code POINTS. RFC 8785 section 3.2.3 mandates code units.
  assert.deepEqual(['\uFB33', '\u{1F600}'].sort(), ['\u{1F600}', '\uFB33']);
});

test('delegates number and string forms to ECMAScript, as RFC 8785 requires', () => {
  assert.equal(
    serializeJcs([1e20, 1e21, 1e-6, 1e-7, -0]),
    '[100000000000000000000,1e+21,0.000001,1e-7,0]',
  );
  assert.equal(serializeJcs('a\u0000b\tc"d\\e/f'), '"a\\u0000b\\tc\\"d\\\\e/f"');
});

test('throws rather than yielding undefined for values with no JCS form', () => {
  assert.throws(() => serializeJcs(undefined), /undefined/i);
  assert.throws(() => serializeJcs(Symbol('x')), /symbol/i);
  assert.throws(() => serializeJcs(() => 1), /function/i);
  assert.throws(() => serializeJcs(10n), /BigInt/i);
  assert.throws(() => serializeJcs(Number.NaN), /non-finite/i);
  assert.throws(() => serializeJcs(Number.POSITIVE_INFINITY), /non-finite/i);
});

test('applies JSON.stringify structural rules to directly-present unrepresentable values', () => {
  assert.equal(serializeJcs({ a: 1, b: undefined }), '{"a":1}');
  assert.equal(serializeJcs({ a: 1, b: Symbol('s') }), '{"a":1}');
  assert.equal(serializeJcs([1, undefined, 3]), '[1,null,3]');
  // A hole is not a member: for...of yields undefined, so it becomes null.
  // biome-ignore lint/suspicious/noSparseArray: the hole IS the case under test
  assert.equal(serializeJcs([1, , 3]), '[1,null,3]');
});

test('honors toJSON with no arguments, and throws if it yields no JCS form', () => {
  assert.equal(
    serializeJcs({ d: new Date('2030-01-15T10:03:44.612Z') }),
    '{"d":"2030-01-15T10:03:44.612Z"}',
  );
  // Called with NO arguments: JSON.stringify passes the key, this does not.
  assert.equal(serializeJcs({ k: { toJSON: (...a: unknown[]) => a.length } }), '{"k":0}');
  // Applied to the value as given, not to a toJSON result: a loud failure
  // rather than a member that silently vanishes from the digest.
  assert.throws(() => serializeJcs({ x: { toJSON: () => undefined } }), /undefined/i);
  assert.throws(() => serializeJcs([{ toJSON: () => undefined }]), /undefined/i);
});

test('drops symbol-keyed properties and rejects genuine cycles only', () => {
  assert.equal(serializeJcs({ a: 1, [Symbol('k')]: 2 }), '{"a":1}');
  const shared = { v: 1 };
  assert.equal(serializeJcs([shared, shared]), '[{"v":1},{"v":1}]');
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  assert.throws(() => serializeJcs(cyclic), /circular/i);
});
