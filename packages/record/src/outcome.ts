// @vidimera/record — Outcome<T> (result-first; DECISIONS.md #10 "Result-first outcomes;
// refusals returned, never thrown"). Domain refusals are RETURNED VALUES: constructors
// never throw for a domain refusal. Exceptions are reserved for caller/config errors and
// storage faults where the failing write recorded nothing — one call can append a clock edge
// en passant before it, and that edge stands: `open()` expires a due blocker, then its
// retried genesis fails, and the error it throws names that blocker. This build's narrowing of
// #10's "storage faults where nothing was recorded", recorded rather than reconciled since
// #10's wording is sealed — the loud-throw half of #10 (see #11 and SPEC §8's "Caller errors
// are not refusals."; e.g. config.ts's construction guards and open.ts's missing-stagedRef
// throw).

import { REGISTRY, type RefusalCode } from './refusal-codes.js';
import type { Digest } from './types.js';

// `class` is DERIVED from `code` via the REGISTRY — never a caller-supplied
// field. `transitionRef` is present ONLY when a transition was actually appended
// (compromise wherever the record's state admits a state-leaving append, per SPEC §8 — §12's
// C3 admits no edge against an already-terminal `expired`/`refused` record and its C4 admits
// none against a sealed one, and the compromise then surfaces result-first with no ref, via
// `appendChainCompromise`'s fallback in kernel/finalize.ts — a walk that tries three
// candidates rather than four when the chain folds to a terminal state, because that state's
// own candidate could never win, and that is outcome-preserving. C4 IS BUILT in this build's
// `store/memory.ts` (see `store/store.ts`'s `AppendResult` doc) — `seal.test.ts`'s "chain-
// compromise with NO edge" test is a passing demonstration of it; record-exists /
// unknown-profile / unknown-leg / pre-record /
// terminal-record (incl. record-not-open) never; a refusal-class code only when
// appended per `appendsOn`). `unavailable` has TWO producers, both real: SPEC §8's
// `availability` class's single code is produced by finalize's rung (5.5) (SPEC §11.1)
// when a required consultation's authority is reported unreachable, real as of the second
// step-5 increment, and by finalize's rung (4.5) (SPEC §10.3) when the live policy
// source is reported unreachable, real as of the second step-6 increment. NEVER appends,
// either producer.
export type Outcome<T> =
  | { status: 'ok'; value: T }
  | {
      status: 'refused';
      code: RefusalCode;
      class: 'refusal' | 'compromise';
      transitionRef?: Digest;
    }
  | { status: 'unavailable'; code: 'availability'; authority: string };

export function ok<T>(value: T): Outcome<T> {
  return { status: 'ok', value };
}

/**
 * Never throws for a domain refusal — a refusal is a RETURNED value. `class` is looked
 * up from the REGISTRY by `code` (never a parameter). `transitionRef` is optional:
 * pass it only when the caller actually appended a transition for this refusal; omit
 * it (leave undefined) otherwise — the field is genuinely ABSENT from the returned
 * object in that case, not merely `undefined`-valued. `code` excludes `'availability'`
 * — the second step-5 increment's compile-time form of SPEC §8's never-a-refused-edge
 * rule for that class.
 *
 * Return type is `Outcome<never>`, which is structurally assignable to `Outcome<T>`
 * for any `T` (the refused/unavailable branches don't mention `T`), so callers don't
 * need to thread a generic through call sites that never produce an `ok` value.
 */
export function refused(
  code: Exclude<RefusalCode, 'availability'>,
  transitionRef?: Digest,
): Outcome<never> {
  // REGISTRY is keyed by the full RefusalCode union, so its lookup type is the full
  // RefusalClass; the cast narrows back to what a refused outcome's `class` field
  // admits, which the excluded parameter type above guarantees is safe.
  const refusalClass = REGISTRY[code] as 'refusal' | 'compromise';
  return transitionRef === undefined
    ? { status: 'refused', code, class: refusalClass }
    : { status: 'refused', code, class: refusalClass, transitionRef };
}

export function unavailable(authority: string): Outcome<never> {
  return { status: 'unavailable', code: 'availability', authority };
}
