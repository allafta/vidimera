// @vidimera/record — utf16.ts: the one well-formedness check for UTF-16 strings, a leaf module
// shared by the serializer, the digest primitive and the subject rule. Internal: not exported
// from the package index.

/**
 * True when `s` holds no lone surrogate. Written out because `String.prototype.isWellFormed`
 * is not in the ES2022 type lib this package compiles against.
 */
export function isWellFormedUtf16(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
      if (next < 0xdc00 || next > 0xdfff) return false;
      i++; // a valid pair: skip its low half
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      return false;
    }
  }
  return true;
}
