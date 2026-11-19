// @vidimera/record — store/semantics.ts: the kind→state mapping and SPEC §12's C3
// carve-out predicate, shared by every backing. Extracted from store/memory.ts when the
// SQLite adapter arrived (the fifth step-2 increment) — two backings evaluating C3/C4
// from two copies of this mapping is drift waiting to happen, the same argument that put
// `findNonTerminal` on C1's own predicate. Behavior is byte-identically what memory.ts
// carried; the conformance suite over MemoryStore is the regression gate on the
// extraction. The integrated sidecar's entry check (`signatureEntriesToWrite`) joined it
// on the same argument, once `MemoryStore` and `SqliteStore` each carried a copy of their
// own. `PostgresStore` never had one: its sidecar landed after the extraction, on this check.

import { transitionDigest } from '../chain/encoding.js';
import { REGISTRY, type RefusalCode } from '../refusal-codes.js';
import type { SignatureEntry } from '../signing/store.js';
import type { RecordState, Transition, TransitionKind } from '../types.js';
import type { AppendMeta } from './store.js';

/**
 * The `opened` transition's payload, read only for the two fields C1 exclusivity
 * needs — `profileId`/`subjectRef` for a record come from its opened
 * transition's payload. Mirrors `chain/replay.ts`'s own local `OpenedPayload`
 * convention: `Transition.payload` is `unknown` by design (the chain is the persisted,
 * opaque wire format), so each module that needs to read specific fields off a
 * transition's payload declares its own minimal local reading-convention interface
 * rather than widening the public contract.
 */
export interface GenesisPayload {
  profileId: string;
  subjectRef: string;
}

/** Mirrors `chain/replay.ts`'s local `RefusedPayload` reading convention. */
interface RefusedPayload {
  code: RefusalCode;
}

/**
 * The `RecordState` a given `TransitionKind` transitions a record TO, or `null` if the
 * kind is state-PRESERVING: the transition kind drives state —
 * opened->open, confirmed->confirmed, refused->refused, expired->expired;
 * consultation-recorded/sealed are state-preserving. Written as an exhaustive
 * `switch` over the full `TransitionKind` union (no `default` arm) so a future kind
 * added to `types.ts` fails this file to COMPILE rather than silently falling through
 * to some guessed behavior — the same fail-loud posture `chain/replay.ts`'s `replay()`
 * takes with an unhandled kind (there it throws at runtime; here the union is closed
 * enough that TypeScript itself catches an omission at build time).
 *
 * `opened` is handled by a dedicated genesis code path before `stateOf` is ever
 * consulted in practice (a non-genesis `opened` transition is not a real scenario),
 * but is still given a real mapping (`'open'`) rather than `null`, for the same
 * completeness-over-narrowing reason `nonterminal.ts` writes its formula's full three
 * disjuncts rather than only the disjuncts this build can reach.
 *
 * `finding-raised`/`acknowledged` (SPEC §10.2's findings-flow annotations, minted by the
 * findings seams as of the second step-7 increment) are read as state-preserving on the
 * same reasoning as `sealed` — they record a fact ABOUT a record without themselves
 * deciding it.
 */
export function stateOf(kind: TransitionKind): RecordState | null {
  switch (kind) {
    case 'opened':
      return 'open';
    case 'consultation-recorded':
      return null;
    case 'confirmed':
      return 'confirmed';
    case 'refused':
      return 'refused';
    case 'expired':
      return 'expired';
    case 'declined':
      return 'declined';
    case 'sealed':
      return null;
    case 'finding-raised':
      return null;
    case 'acknowledged':
      return null;
    case 'redeeming':
      return 'redeeming';
    case 'redeemed':
      return 'redeemed';
    case 'redemption-failed':
      return 'redemption-failed';
  }
}

/** A kind is "state-leaving" (SPEC §12's C3) iff it maps to a new `RecordState`. */
export function isStateLeaving(kind: TransitionKind): boolean {
  return stateOf(kind) !== null;
}

/**
 * C3's second carve-out (SPEC §12's C3): "a `compromise`-classed refusal edge against a
 * terminal `confirmed` (decided) record — never against terminal `expired` or `refused`".
 * Implemented here as: a `kind:'refused'` append whose `expectedCurrentState` is
 * `'confirmed'` is allowed past the backings' C3 gates (it still must pass the state CAS).
 * Deliberately keyed off the code's CLASS (via the `refusal-codes.ts` `REGISTRY`),
 * not the literal string `'chain-compromise'` — "compromise-classed" is the SPEC's own
 * framing, and `REGISTRY` is already the single source of truth for which codes are
 * compromise-classed.
 *
 * The predicate ALSO accepts `expectedCurrentState === 'redeeming'`, which §12's C3 does
 * not name. The arm it services is now EXERCISED, not merely hypothetical: `beginRedemption`
 * (second step-3 increment) produces real `redeeming` records, and
 * `appendChainCompromise`'s candidate walk (kernel/finalize.ts, deferral-register row 10)
 * now attempts a live CAS with `expectedCurrentState: 'redeeming'` against one. It remains
 * defence in depth, not a C3 grant, though: §12's C1 counts any `redeeming` as non-terminal,
 * so a `redeeming` record's persisted `non_terminal` flag is always 1, and a `redeeming`
 * record therefore still never reaches the terminal branch that actually CONSULTS this
 * predicate — that CAS succeeds through the ordinary non-terminal path instead. SPEC §5
 * admits `redeeming → refused` directly — "both are non-terminal states" — rather than
 * through the carve-out. Keeping the arm costs nothing and would still be correct if a
 * later build step made a terminal-but-redeeming combination reachable; claiming C3
 * grants it would not be.
 *
 * The FIRST carve-out (a state-preserving `sealed` append) needs no corresponding
 * check here: `sealed` maps to `null` in `stateOf`, so `isStateLeaving('sealed')` is
 * already `false` and the backings' C3 gates never even reach this predicate for it. That
 * is `sealed`'s carve-out implemented honestly — the true reason a
 * `sealed` append is never blocked is that it never leaves the state in the first
 * place, not a hardcoded `kind === 'sealed'` bypass that would say otherwise.
 */
export function isCompromiseCarveOut(
  transition: Transition,
  expectedCurrentState: RecordState,
): boolean {
  if (transition.kind !== 'refused') return false;
  if (expectedCurrentState !== 'confirmed' && expectedCurrentState !== 'redeeming') return false;
  const payload = transition.payload as RefusedPayload;
  return REGISTRY[payload.code] === 'compromise';
}

/**
 * The integrated sidecar's entry check (`Store.signatures`, `store/store.ts`), one rule for
 * every backing that exposes the sidecar. `storeName` opens every error message (`MemoryStore`,
 * `SqliteStore`, `PostgresStore`).
 *
 * Returns `undefined` when the append carries no `meta.signatures`. Otherwise the field must
 * be an array with exactly one entry per appended transition, in order; each entry must be an
 * object naming that transition's own `transitionDigest`, `recordId` and `seq`, with a string
 * `keyRef` and a string `signature`. Unchecked, a non-string would be mis-stored silently —
 * SQLite stores 42 as the text '42.0' — or, a null say, refused only at the entry insert, after
 * the transition rows: a late failure the append's unit still undoes (SQLite's savepoint or its
 * own transaction; on Postgres, the aborted transaction), but a different one on each backing.
 * So the strings are checked here with the rest, for every backing alike, before any write.
 *
 * Anything else throws an `Error` whose message starts `<storeName>: meta.signatures`. On
 * success it returns, per entry, a FRESH object holding exactly the five `SignatureEntry`
 * fields, each read from the caller's entry once: what was checked is what the store writes,
 * a caller's extra members are not carried along, and a caller mutating its own entry objects
 * afterwards cannot reach what was stored.
 *
 * Pure — it touches no store state — so a backing calls it before any other check of the
 * append: a throw then writes nothing, and wins over every conflict the append would otherwise
 * have reported.
 */
export function signatureEntriesToWrite(
  storeName: string,
  transitions: readonly Transition[],
  meta: AppendMeta,
): SignatureEntry[] | undefined {
  const carried: unknown = meta.signatures;
  if (carried === undefined) return undefined;
  if (!Array.isArray(carried) || carried.length !== transitions.length) {
    const count = Array.isArray(carried) ? `${carried.length} entries` : 'no array';
    throw new Error(
      `${storeName}: meta.signatures must carry exactly one entry per appended transition, ` +
        `in order — it carries ${count} for ${transitions.length} transition(s); nothing was ` +
        'applied',
    );
  }
  return transitions.map((t, i) => {
    const raw: unknown = carried[i];
    const entry =
      typeof raw === 'object' && raw !== null
        ? {
            transitionDigest: (raw as SignatureEntry).transitionDigest,
            recordId: (raw as SignatureEntry).recordId,
            seq: (raw as SignatureEntry).seq,
            keyRef: (raw as SignatureEntry).keyRef,
            signature: (raw as SignatureEntry).signature,
          }
        : undefined;
    if (
      entry === undefined ||
      entry.transitionDigest !== transitionDigest(t) ||
      entry.recordId !== t.recordId ||
      entry.seq !== t.seq
    ) {
      throw new Error(
        `${storeName}: meta.signatures[${i}] does not name appended transition ${i} (record ` +
          `'${t.recordId}', seq ${t.seq}) — each entry must carry its own transition's ` +
          'transitionDigest, recordId and seq; nothing was applied',
      );
    }
    if (typeof entry.keyRef !== 'string' || typeof entry.signature !== 'string') {
      throw new Error(
        `${storeName}: meta.signatures[${i}] carries a non-string keyRef or signature; ` +
          'nothing was applied',
      );
    }
    return entry;
  });
}
