// @vidimera/record — jcs.ts: the library-owned RFC 8785 (JSON Canonicalization
// Scheme) serializer.
//
// Zero dependencies by construction. This is not a shortcut: RFC 8785 section 3.2.2
// normatively *delegates* primitive serialization to ECMAScript — numbers to the
// Number::toString algorithm (section 3.2.2.3) and strings to the escaping rules of
// QuoteJSONString (section 3.2.2.2). `JSON.stringify` already implements both,
// including the lowercase \u00xx fallback for control characters with no short escape.
// RFC 8785 requires a lone surrogate to be REFUSED; `JSON.stringify` escapes it (ES2019).
// The default mode here keeps that escape deliberately, so the read path and every
// re-bind seam stay byte-identical and a persisted chain carrying one still verifies; the strict
// mode (`wellFormed: true`), used only where content enters (`stage()`), refuses it. The only step
// JCS layers on top is recursive object-key ordering by UTF-16 code unit, which is
// what this file adds.
//
// `Array.prototype.sort` with no comparator compares by UTF-16 code unit, which is
// precisely RFC 8785 section 3.2.3's requirement — so the sort is deliberately the
// default one, never `localeCompare` (locale-sensitive) and never a codepoint sort.

import { isWellFormedUtf16 } from './utf16.js';

/** Options for `serializeJcs`. Internal: not exported from the package index. */
export interface SerializeJcsOptions {
  /**
   * When true, every string written (each key, each value, and any string a `toJSON` returns)
   * must be well-formed UTF-16, or the call throws. The default (false) keeps the ES2019
   * escaping of a lone surrogate, which is what lets a persisted chain that carries one keep
   * verifying: only `stage()` opts in; the read path and the re-bind seams never do.
   */
  wellFormed?: boolean;
}

/**
 * Serializes `value` to RFC 8785 canonical JSON **text**. Always returns a `string`:
 * every input with no JCS representation throws instead of yielding `undefined`, so
 * no caller can silently hash zero bytes by accident.
 *
 * Deliberate, tested decisions — each is a byte-level commitment, not a detail:
 *
 * - **`toJSON` is honored**, called with no arguments. Changing this changes bytes:
 *   a `Date` member serializes as its ISO string rather than as `{}`.
 * - **BigInt throws.** RFC 8785 numbers are IEEE-754 doubles; a BigInt has no
 *   round-trippable JCS form, and silently coercing one would produce a digest over
 *   a value the host did not supply.
 * - **Non-finite numbers throw** (`NaN`, `Infinity`, `-Infinity`). `JSON.stringify`
 *   would emit `null` for these; RFC 8785 section 3.2.2.3 does not admit them at all,
 *   and a digest over a silently-nulled figure is exactly the failure this library
 *   exists to prevent.
 * - **`undefined` has no top-level form and throws**; a directly-present `undefined`
 *   member is omitted and a directly-present `undefined` array element becomes `null`,
 *   matching `JSON.stringify`'s structural rules. A `toJSON` that RETURNS `undefined`
 *   (or a symbol or a function) throws in every position — the structural rules are
 *   applied to the value as given, not to a `toJSON` result, so an adopter whose
 *   `Canonicalizer` emits such a wrapper gets a loud failure rather than a member that
 *   silently vanishes from the digest.
 * - **Symbols** behave identically to `undefined` (throw / `null` / omitted), and
 *   **symbol-keyed properties are silently dropped**, because `Object.keys` never
 *   returns them. That is `JSON.stringify`'s behavior too; a host that needs a
 *   symbol-keyed field recorded must project it to a string key in its own
 *   `Canonicalizer`.
 * - **Functions** behave identically to `undefined` (throw / `null` / omitted).
 * - **Circular references throw.** Only genuine cycles: the same object appearing
 *   twice in sibling positions is a finite tree and serializes fine.
 * - **Only plain objects serialize.** An object that is not an array, carries no callable
 *   `toJSON`, and whose prototype is not `Object.prototype`, `null`, or another realm's
 *   `Object.prototype` throws, naming its constructor (as "an instance of 'Name'", or the generic
 *   'a non-plain object' when it has no named one): a `Map`, a `Set`, a Promise, a class
 *   instance (including one holding only `#private` state) and a boxed primitive
 *   (`new String('a')`, which once serialized as `{"0":"a"}`) have no JSON form. A `Date`
 *   still serializes through its `toJSON`. The three reference backings return plain data, so
 *   the chain-verify read path never meets one. A custom `Store` must keep that contract (return
 *   plain data, never class instances). One that does not is read as tampering, not as a fault:
 *   `verifyChain` reports a row it cannot serialize as the break at that row rather than
 *   throwing, and a verifying seam then refuses `chain-compromise` and appends a terminal
 *   compromise edge where the head still digests. That is inherent at AL1, where any
 *   store-corrupted row reads as tampering. The reads that digest rows without verifying the
 *   chain first — `verifySignatures`, and a store's `chainHead` over its head row — still throw.
 * - **Lone surrogates are escaped by default** (the ES2019 well-formed escaping, so the read
 *   path is byte-identical to before) and **refused under `wellFormed: true`**, the strict
 *   mode `stage()` alone uses. It checks every key, every string value and every string a
 *   `toJSON` returns.
 */
export function serializeJcs(value: unknown, options?: SerializeJcsOptions): string {
  return write(value, new Set<object>(), options?.wellFormed === true);
}

function checked(text: string, strict: boolean, what: string): string {
  if (strict && !isWellFormedUtf16(text)) {
    throw new TypeError(
      `serializeJcs: ${what} holds a lone surrogate — it is not well-formed UTF-16`,
    );
  }
  return text;
}

function write(value: unknown, open: Set<object>, strict: boolean): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (!Number.isFinite(value)) {
        throw new TypeError(
          `serializeJcs: the non-finite number ${String(value)} has no JCS representation`,
        );
      }
      return JSON.stringify(value);
    case 'string':
      return JSON.stringify(checked(value, strict, 'a string value'));
    case 'bigint':
      throw new TypeError('serializeJcs: a BigInt has no JCS representation');
    case 'undefined':
      throw new TypeError('serializeJcs: undefined has no JCS representation');
    case 'symbol':
      throw new TypeError('serializeJcs: a symbol has no JCS representation');
    case 'function':
      throw new TypeError('serializeJcs: a function has no JCS representation');
    default:
      return writeContainer(value, open, strict);
  }
}

function writeContainer(container: object, open: Set<object>, strict: boolean): string {
  if (open.has(container)) {
    throw new TypeError('serializeJcs: circular reference — the input is not a finite JSON tree');
  }
  open.add(container);
  try {
    const toJson = (container as { toJSON?: unknown }).toJSON;
    if (typeof toJson === 'function') {
      return write((toJson as (this: object) => unknown).call(container), open, strict);
    }
    if (Array.isArray(container)) {
      const elements: string[] = [];
      for (const element of container as readonly unknown[]) {
        elements.push(hasNoJsonForm(element) ? 'null' : write(element, open, strict));
      }
      return `[${elements.join(',')}]`;
    }
    if (!isPlainObject(container)) {
      throw new TypeError(
        `serializeJcs: ${describeNonPlain(container)} has no JCS representation — only plain objects, arrays and values with a toJSON serialize`,
      );
    }
    const members: string[] = [];
    for (const key of Object.keys(container).sort()) {
      const member: unknown = (container as Record<string, unknown>)[key];
      if (hasNoJsonForm(member)) continue;
      members.push(
        `${JSON.stringify(checked(key, strict, 'an object key'))}:${write(member, open, strict)}`,
      );
    }
    return `{${members.join(',')}}`;
  } finally {
    open.delete(container);
  }
}

function hasNoJsonForm(value: unknown): boolean {
  return value === undefined || typeof value === 'symbol' || typeof value === 'function';
}

/**
 * True for an object whose prototype is `Object.prototype`, null, or another realm's
 * `Object.prototype` (a prototype that itself has no prototype and whose `constructor` is
 * a function named 'Object'). Anything else is a class instance, a collection, a Promise
 * or a boxed primitive.
 */
function isPlainObject(value: object): boolean {
  const proto: unknown = Object.getPrototypeOf(value);
  if (proto === null || proto === Object.prototype) return true;
  if (Object.getPrototypeOf(proto) !== null) return false;
  const ctor = Object.getOwnPropertyDescriptor(proto, 'constructor')?.value as unknown;
  return typeof ctor === 'function' && ctor.name === 'Object';
}

/** Names the refused object by its constructor, with no article to get wrong. */
function describeNonPlain(value: object): string {
  try {
    const ctor = (Object.getPrototypeOf(value) as { constructor?: unknown } | null)?.constructor;
    if (typeof ctor === 'function' && ctor.name !== '') return `an instance of '${ctor.name}'`;
  } catch {
    // fall through to the generic name
  }
  return 'a non-plain object';
}
