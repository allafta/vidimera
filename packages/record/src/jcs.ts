// @vidimera/record — jcs.ts: the library-owned RFC 8785 (JSON Canonicalization
// Scheme) serializer.
//
// Zero dependencies by construction. This is not a shortcut: RFC 8785 section 3.2.2
// normatively *delegates* primitive serialization to ECMAScript — numbers to the
// Number::toString algorithm (section 3.2.2.3) and strings to the escaping rules of
// QuoteJSONString (section 3.2.2.2). `JSON.stringify` already implements both
// exactly, including the lowercase \u00xx fallback for control characters with no
// short escape and the ES2019 well-formed escaping of lone surrogates. The only step
// JCS layers on top is recursive object-key ordering by UTF-16 code unit, which is
// what this file adds.
//
// `Array.prototype.sort` with no comparator compares by UTF-16 code unit, which is
// precisely RFC 8785 section 3.2.3's requirement — so the sort is deliberately the
// default one, never `localeCompare` (locale-sensitive) and never a codepoint sort.

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
 * - **No special case for boxed primitives** (`new String('a')`, `new Number(7)`):
 *   they serialize as ordinary objects over their own enumerable keys.
 */
export function serializeJcs(value: unknown): string {
  return write(value, new Set<object>());
}

function write(value: unknown, open: Set<object>): string {
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
      return JSON.stringify(value);
    case 'bigint':
      throw new TypeError('serializeJcs: a BigInt has no JCS representation');
    case 'undefined':
      throw new TypeError('serializeJcs: undefined has no JCS representation');
    case 'symbol':
      throw new TypeError('serializeJcs: a symbol has no JCS representation');
    case 'function':
      throw new TypeError('serializeJcs: a function has no JCS representation');
    default:
      return writeContainer(value, open);
  }
}

function writeContainer(container: object, open: Set<object>): string {
  if (open.has(container)) {
    throw new TypeError('serializeJcs: circular reference — the input is not a finite JSON tree');
  }
  open.add(container);
  try {
    const toJson = (container as { toJSON?: unknown }).toJSON;
    if (typeof toJson === 'function') {
      return write((toJson as (this: object) => unknown).call(container), open);
    }
    if (Array.isArray(container)) {
      const elements: string[] = [];
      for (const element of container as readonly unknown[]) {
        elements.push(hasNoJsonForm(element) ? 'null' : write(element, open));
      }
      return `[${elements.join(',')}]`;
    }
    const members: string[] = [];
    for (const key of Object.keys(container).sort()) {
      const member: unknown = (container as Record<string, unknown>)[key];
      if (hasNoJsonForm(member)) continue;
      members.push(`${JSON.stringify(key)}:${write(member, open)}`);
    }
    return `{${members.join(',')}}`;
  } finally {
    open.delete(container);
  }
}

function hasNoJsonForm(value: unknown): boolean {
  return value === undefined || typeof value === 'symbol' || typeof value === 'function';
}
