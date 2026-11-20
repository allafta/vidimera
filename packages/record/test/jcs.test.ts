import assert from 'node:assert/strict';
import vm from 'node:vm';
import { test } from 'vitest';
import { digest } from '../src/canonical.js';
import { serializeJcs } from '../src/jcs.js';

test('sorts object keys recursively by UTF-16 code unit', () => {
  assert.equal(serializeJcs({ b: 1, a: { d: 2, c: 3 } }), '{"a":{"c":3,"d":2},"b":1}');
  // A lead surrogate (U+D83D) sorts before U+FB33 under code UNITS, after it
  // under code POINTS. RFC 8785 section 3.2.3 mandates code units.
  assert.deepEqual(['\uFB33', '\u{1F600}'].sort(), ['\u{1F600}', '\uFB33']);
  // The same ordering, driven through serializeJcs itself: a code-POINT
  // comparator would emit these two keys the other way round.
  assert.equal(
    serializeJcs({ '\uFB33': 1, '\u{1F600}': 2 }),
    `{${JSON.stringify('\u{1F600}')}:2,${JSON.stringify('\uFB33')}:1}`,
  );
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
  assert.equal(serializeJcs({ a: 1, b: () => 1 }), '{"a":1}');
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

class Holder {
  #hidden = 1;
  get hidden() {
    return this.#hidden;
  }
}

test('refuses objects with no JSON form, naming the constructor, in both modes', () => {
  for (const options of [undefined, { wellFormed: true }]) {
    assert.throws(() => serializeJcs(new Map([['a', 1]]), options), /Map/);
    assert.throws(() => serializeJcs({ s: new Set([1]) }, options), /Set/);
    assert.throws(() => serializeJcs([Promise.resolve(1)], options), /Promise/);
    assert.throws(() => serializeJcs(new Holder(), options), /Holder/);
    assert.throws(() => serializeJcs(new String('a'), options), /String/);
    assert.throws(() => serializeJcs({ n: new Number(7) }, options), /Number/);
  }
});

test('accepts a null-prototype object, another realm plain object, and a Date through toJSON', () => {
  const bare = Object.create(null) as Record<string, unknown>;
  bare.b = 1;
  bare.a = 2;
  assert.equal(serializeJcs(bare), '{"a":2,"b":1}');
  assert.equal(serializeJcs(vm.runInNewContext('({ k: 1 })')), '{"k":1}');
  assert.equal(serializeJcs(new Date('2030-01-15T10:03:44.612Z')), '"2030-01-15T10:03:44.612Z"');
});

test('default mode still escapes a lone surrogate exactly as before (the read path)', () => {
  // The expected text holds a literal backslash, u, d, 8, 0, 0: an ESCAPE, not the character.
  assert.equal(serializeJcs('a\ud800b'), `"a${'\\'}ud800b"`);
  assert.equal(serializeJcs({ 'k\udc00': 'v\ud83d' }), `{"k${'\\'}udc00":"v${'\\'}ud83d"}`);
  assert.equal(serializeJcs('😀'), '"😀"');
});

test('wellFormed mode refuses a lone surrogate in a key, a value or a toJSON result', () => {
  const strict = { wellFormed: true };
  assert.throws(() => serializeJcs('a\ud800b', strict), TypeError);
  assert.throws(() => serializeJcs({ k: ['x\udc00'] }, strict), /lone surrogate/);
  assert.throws(() => serializeJcs({ 'k\ud800': 1 }, strict), /lone surrogate/);
  assert.throws(() => serializeJcs({ toJSON: () => '\ud83d' }, strict), /lone surrogate/);
  assert.equal(serializeJcs({ k: '\u{1F600}é' }, strict), '{"k":"\u{1F600}é"}');
});

test('digest refuses an ill-formed string and still hashes bytes as given', () => {
  assert.throws(() => digest('a\ud800b'), /lone surrogate/);
  assert.match(digest(new TextEncoder().encode('a\ud800b')), /^sha256:[0-9a-f]{64}$/);
  assert.match(digest('a\u{1F600}b'), /^sha256:[0-9a-f]{64}$/);
});

test('refuses a Map and a class instance built in another realm', () => {
  assert.throws(() => serializeJcs(vm.runInNewContext('new Map()')), /Map/);
  assert.throws(() => serializeJcs(vm.runInNewContext('new (class Foo {})()')), /Foo/);
});

test('names a typed array without a wrong article', () => {
  assert.throws(
    () => serializeJcs({ b: new Uint8Array(2) }),
    /^TypeError: serializeJcs: an instance of 'Uint8Array' has no JCS representation/,
  );
  assert.throws(() => serializeJcs(new Map()), /an instance of 'Map' has no JCS representation/);
});
