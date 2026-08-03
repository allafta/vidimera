// @vidimera/record — hand-authored PURE-JCS / RFC-8785 vectors. These are LIBRARY-owned
// vectors exercising RFC-8785 behavior
// itself (recursive object-key ordering, number formatting incl. exponentials +
// negative zero, non-ASCII + control-character string escaping) — they are NOT an
// adopter's own domain-canonicalization fixtures (an adopter's array-sort convention
// layered on top of JCS is a different, adopter-owned concern; anchoring the library
// test on adopter-specific fixtures would conflate the two ownership layers, SPEC §3's
// canonicalization split).
//
// Provenance: every `expected` value below was cross-checked before being hardcoded
// here against an independent from-scratch reference JCS serializer (recursive
// descent using `JSON.stringify` for primitives + `Object.keys(...).sort()` for key
// ordering — the RFC-8785 algorithm written out by hand, NOT imported from
// `canonicalize@3.0.0`) and found to agree byte-for-byte. `JSON.stringify` is trusted
// as the primitive (number/string) serializer oracle because it already implements
// the ECMAScript `Number::toString` algorithm and JSON string-escaping rules that RFC
// 8785 itself specifies; the only genuinely JCS-specific step layered
// on top is recursive lexicographic (UTF-16 code unit) object-key sorting, which is
// exactly what these vectors are chosen to exercise.

export interface JcsVector {
  readonly name: string;
  readonly input: unknown;
  /** The exact expected JCS text (this is what `canonicalize()` UTF-8-encodes). */
  readonly expected: string;
}

// --- Vector: recursive object-key ordering -------------------------------------
// Exercises: keys sorted lexicographically (UTF-16 code unit order) at EVERY nesting
// level independently, including a deliberate mix of digit-leading and letter-leading
// keys ("10" vs "2" vs "9" vs "y" vs "z") whose lexicographic order ("10" < "2" < "9"
// < "y" < "z") differs from both (a) plain JS object insertion order and (b) numeric
// order — the two orderings a naive `JSON.stringify` (which follows the JS engine's
// own key-enumeration order, numeric-index keys first) would silently reproduce
// instead of RFC-8785's mandated lexicographic sort. A vector that only used
// alphabetic keys would not catch that substitution bug.
const recursiveKeyOrdering: JcsVector = {
  name: 'recursive-key-ordering',
  input: {
    b: 1,
    a: { z: 1, '10': 2, '2': 3, '9': 4, y: { b: true, a: false } },
    '10': true,
  },
  expected: '{"10":true,"a":{"10":2,"2":3,"9":4,"y":{"a":false,"b":true},"z":1},"b":1}',
};

// --- Vector: number formatting (RFC 8785 §3.2.2.3) ------------------------------
// Exercises: negative zero serializing as "0" (not "-0"); the 1e21 magnitude boundary
// where ECMAScript Number::toString switches from full decimal digits to exponential
// notation (1e20 stays full-digit, 1e21 goes exponential); the symmetric small-side
// boundary at 1e-7 (1e-6 stays full-digit "0.000001", 1e-7 goes exponential "1e-7");
// an exponent that itself needs a sign ("1e+21", "1e+100" — not bare "1e21"); and an
// IEEE-754 double-precision rounding case (333333333.33333329 has more significant
// digits than a double can hold, so the canonical form reflects the ACTUAL stored
// value, 333333333.3333333, not the source literal).
const numberFormatting: JcsVector = {
  name: 'number-formatting',
  input: [
    0, -0, 1, -1, 1.5, -1.5, 100, -100, 1e20, 1e21, 9.999999999999999e20, 100000000000000000000,
    123456789012345680000, 1e-6, 1e-7, 1.1e-7, 3.14159, 2e-3, 4.5, 333333333.33333329, 1e100,
    1e-100,
  ],
  expected:
    '[0,0,1,-1,1.5,-1.5,100,-100,100000000000000000000,1e+21,999999999999999900000,' +
    '100000000000000000000,123456789012345680000,0.000001,1e-7,1.1e-7,3.14159,0.002,' +
    '4.5,333333333.3333333,1e+100,1e-100]',
};

// --- Vector: non-ASCII + control-character string escaping (RFC 8785 §3.2.2.2) --
// Built from an explicit Unicode code-point list (not literal escape sequences typed
// inline) to remove any transcription ambiguity about which character is meant.
// Exercises: non-ASCII BMP characters (é U+00E9, € U+20AC) and an astral character
// (😀 U+1F600, a UTF-16 surrogate pair) passed through UNESCAPED (RFC 8785 forbids
// escaping characters outside the mandatory set — only U+0000-U+001F, U+0022, and
// U+005C are escaped); control characters U+0008/U+000C/U+000A/U+000D/U+0009 using
// their required SHORT escapes (\b \f \n \r \t); control characters U+0001 and
// U+001F, which have NO short escape, falling back to \u00xx with LOWERCASE hex
// (RFC 8785 mandates lowercase); the quotation mark and reverse solidus escaped;
// the solidus (/) left UNESCAPED (JSON/JCS never requires escaping it); and U+007F
// (DEL) — just past the mandatory-escape range — left UNESCAPED, showing the
// mandatory range is exactly U+0000-U+001F, not "all control-ish characters".
const STRING_VECTOR_CODEPOINTS = [
  0x63,
  0x61,
  0x66,
  0xe9,
  0x20,
  0x20ac, // "caf" + é + " " + €
  0x0a,
  0x09,
  0x0d,
  0x08,
  0x0c, // LF TAB CR BS FF (short-escape set)
  0x01,
  0x1f, // SOH, US (no short escape -> \u00xx fallback)
  0x22,
  0x5c,
  0x2f, // " \ /
  0x7f, // DEL (outside the mandatory-escape range -> unescaped)
  0x1f600, // 😀 (astral, surrogate pair -> unescaped)
];
const stringEscaping: JcsVector = {
  name: 'string-escaping-non-ascii-and-control-chars',
  input: String.fromCodePoint(...STRING_VECTOR_CODEPOINTS),
  expected: '"café €\\n\\t\\r\\b\\f\\u0001\\u001f\\"\\\\/😀"',
};

// --- Vector: array of objects — arrays never reordered, member objects still sorted
// Exercises: array element ORDER is preserved verbatim (JCS never reorders arrays —
// only object keys), while each object member's keys are independently sorted,
// including a nested object at array index 1.
const nestedArrayOfObjects: JcsVector = {
  name: 'nested-array-of-objects-key-order',
  input: [
    { z: 1, a: 2 },
    { m: { d: 1, c: 2 }, b: 3 },
  ],
  expected: '[{"a":2,"z":1},{"b":3,"m":{"c":2,"d":1}}]',
};

// --- Vector: empty object/array at a nested position -----------------------------
const emptyObjectAndArray: JcsVector = {
  name: 'empty-object-and-array',
  input: { arr: [], obj: {} },
  expected: '{"arr":[],"obj":{}}',
};

export const JCS_VECTORS: readonly JcsVector[] = [
  recursiveKeyOrdering,
  numberFormatting,
  stringEscaping,
  nestedArrayOfObjects,
  emptyObjectAndArray,
];
