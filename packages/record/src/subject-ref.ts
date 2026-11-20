// @vidimera/record — subject-ref.ts: the one rule a `subjectRef` must meet to be staged or
// opened. The agent surface is untrusted and often fed from JSON tool calls, and the subject is
// half of the C1 exclusivity key (SPEC §12), so a value the backings would store differently —
// a number versus its string, a string with U+0000, a lone surrogate — would split one real
// subject into two live records, or fail only on one backing. Internal: not exported from the
// package index.

/**
 * The longest `subjectRef`, in UTF-8 bytes. It keeps the C1 index entry (profile id, subject)
 * well inside what every reference backing indexes; a host whose natural key is longer digests
 * it into one.
 */
import { isWellFormedUtf16 } from './utf16.js';

export const SUBJECT_REF_MAX_BYTES = 1024;

/** A short phrase naming the rule `value` breaks, or undefined when it is a legal subject. */
export function subjectRefProblem(value: unknown): string | undefined {
  if (typeof value !== 'string') return 'must be a string';
  if (value.length === 0) return 'must not be empty';
  if (!isWellFormedUtf16(value)) return 'must be well-formed UTF-16 (it holds a lone surrogate)';
  if (value.includes('\u0000')) return 'must not contain U+0000';
  if (Buffer.byteLength(value, 'utf8') > SUBJECT_REF_MAX_BYTES) {
    return `must be at most ${SUBJECT_REF_MAX_BYTES} bytes in UTF-8`;
  }
  return undefined;
}
