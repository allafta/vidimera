// @vidimera/record — Outcome<T> (result-first; DECISIONS.md #10 "Result-first outcomes;
// refusals returned, never thrown"). Domain refusals are RETURNED VALUES: constructors
// never throw for a domain refusal. Exceptions are reserved for store/infra faults where
// nothing was recorded.

import { CORE, type RefusalCode } from './refusal-codes.js';
import type { Digest } from './types.js';

// `class` is DERIVED from `code` via the CORE registry — never a caller-supplied
// field. `transitionRef` is present ONLY when a transition was actually appended
// (compromise always; record-exists / unknown-profile / unknown-leg / pre-record /
// terminal-record (incl. record-not-open) never; a refusal-class code only when
// appended per `appendsOn`). `unavailable` has no producer in this build — forward-compat
// for external-authority availability (SPEC §8's `availability` class; not built until a
// later build step wires §11.1/§10.3's consultation and policy gates).
export type Outcome<T> =
  | { status: 'ok'; value: T }
  | {
      status: 'refused';
      code: RefusalCode;
      class: 'refusal' | 'compromise';
      transitionRef?: Digest;
    }
  | { status: 'unavailable'; code: RefusalCode; authority: string };

export function ok<T>(value: T): Outcome<T> {
  return { status: 'ok', value };
}

/**
 * Never throws for a domain refusal — a refusal is a RETURNED value. `class` is looked
 * up from the CORE registry by `code` (never a parameter). `transitionRef` is optional:
 * pass it only when the caller actually appended a transition for this refusal; omit
 * it (leave undefined) otherwise — the field is genuinely ABSENT from the returned
 * object in that case, not merely `undefined`-valued.
 *
 * Return type is `Outcome<never>`, which is structurally assignable to `Outcome<T>`
 * for any `T` (the refused/unavailable branches don't mention `T`), so callers don't
 * need to thread a generic through call sites that never produce an `ok` value.
 */
export function refused(code: RefusalCode, transitionRef?: Digest): Outcome<never> {
  const refusalClass = CORE[code];
  return transitionRef === undefined
    ? { status: 'refused', code, class: refusalClass }
    : { status: 'refused', code, class: refusalClass, transitionRef };
}

export function unavailable(code: RefusalCode, authority: string): Outcome<never> {
  return { status: 'unavailable', code, authority };
}
