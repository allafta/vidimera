// @vidimera/record — store/store.ts: the provisional `Store` interface + its
// `AppendResult`, `AppendMeta`, and `BatchResult` types.
//
// PUBLIC BUT EXPLICITLY UNSTABLE PRE-1.0 (SPEC §12: "provisional pre-1.0" —
// "method signatures are unstable while 0.x and freeze only at 1.0"). The header line is
// this file's own paraphrase; the two quoted fragments are §12's own words.
// A host may inject its own `Store` implementation today (there is
// no other way to run the library — `Config.store` is required), but this interface's
// shape is still provisional, not a frozen contract: a real embedded adapter now exists
// (`store/sqlite.ts`), a server-SQL adapter is still future, and the shape itself WILL
// change (a committed-read surface is still named-not-built, SPEC §12; the
// caller-transaction seam `tx?` is on every write as of the fifth step-2 increment) at a
// later build step. Do not build long-lived external adapters against this exact shape
// yet.
//
// Placement note: `StagedDraft` lives in `types.ts` alongside the other core shapes;
// this module RE-EXPORTS the existing `types.ts` definition (so callers can still
// `import type { StagedDraft } from './store/store.js'` and get it grouped alongside
// `AppendResult`) rather than duplicating/redefining it. `AppendResult`, `AppendMeta`, and
// `BatchResult` all have no earlier home, so they are defined here.

import type { Digest, RecordState, StagedDraft, Transition } from '../types.js';

export type { StagedDraft };

/**
 * `AppendResult` — this build's encoding of SPEC §12's C1-C3 constraints, NOT a union the
 * SPEC declares. §12 states them as four prose bullets and no result type at all, and calls
 * its own signatures provisional — SPEC §12: "What is durable is the *behaviour* each
 * method guarantees, not its argument list." §12's C4 seal-finality is built in
 * `store/memory.ts`: a C4 rejection surfaces through the same terminal-state-mismatch arm
 * as C3, not a separate shape — SPEC §12: "no separate conflict shape".
 *
 *  - `{appended:true; seq; transitionDigest}` — the accepted transition's own
 *    server-authoritative `seq` (§12's C2) and its `transitionDigest` (computed the same way
 *    `chainHead` computes one — via `chain/encoding.ts`'s `transitionDigest`, never a
 *    caller-supplied value the Store merely echoes back unchecked).
 *  - `{appended:false; conflict:'state-mismatch'}` — the CAS `expectedCurrentState`
 *    check failed (including: genesis attempted against an already-existing recordId;
 *    C3 monotonicity blocking a state-leaving, non-carve-out append on an already
 *    terminal record — see `store/memory.ts` for why C3 reuses this conflict arm
 *    rather than inventing a fourth).
 *  - `{appended:false; conflict:'seq'}` — §12's C2 sequencing: the proposed `transition.seq`
 *    was not the store's authoritative `max+1` for that record.
 *  - `{appended:false; conflict:'exclusivity'; blockingRecordId}` — §12's C1 exclusivity: a
 *    GENESIS append was rejected because another record for the same
 *    `(profileId, subjectRef)` is currently flagged `nonTerminal`; `blockingRecordId`
 *    names THAT blocker (never the rejected/new record) — the minimal locator
 *    `open()`'s expire-then-retry path reads to decide whether
 *    to auto-expire and retry.
 */
export type AppendResult =
  | { appended: true; seq: number; transitionDigest: Digest }
  | { appended: false; conflict: 'state-mismatch' | 'seq' }
  | { appended: false; conflict: 'exclusivity'; blockingRecordId: string };

/**
 * SPEC §12's append metadata — the record-level flags the store persists **verbatim**:
 * SPEC §12 "the library derives them, the store never recomputes them".
 *
 *  - `nonTerminal` — the derived (`nonterminal.ts`) flag for the record's state AFTER this
 *    append, which C1 exclusivity reads.
 *  - `dueAt` — the library-computed clock deadline for whichever pending window the record
 *    is in, in `Date.prototype.toISOString()`'s exact grammar (`YYYY-MM-DDTHH:mm:ss.sssZ` —
 *    constant length, so lexicographic order IS chronological order — a property
 *    `listDue`'s SQL backing relies on). Presence sets the record's pending-clock column;
 *    **absence clears it**. It is a listing index only and never authoritative — SPEC §12.
 *
 * §12's optional caller-supplied transaction rides beside this as `tx?` on each write
 * method — adapter-generic, validated by each backing (`store/sqlite.ts` enlists its own
 * connection's open transaction; `MemoryStore` throws on presence, having no driver).
 */
export interface AppendMeta {
  nonTerminal: boolean;
  dueAt?: string;
}

/**
 * `appendBatch`'s outcome. SPEC §12: the first conflicting element "aborts the whole
 * transaction with nothing applied, the outcome naming that element's index", and
 * entry-level failures "report element index 0".
 *
 * No `exclusivity` arm: C1 fires only on a genesis append, and SPEC §12 states that
 * genesis never appears in a batch. The type says what can happen rather than carrying a
 * variant nothing can produce.
 *
 * Same as `AppendResult` above, restated here because this is a second reader of it: §12's
 * C4 seal-finality is built in `store/memory.ts`. The entry-level C4 rejection half of
 * "entry-level failures report element index 0" has a bar behind it: `appendBatch` rejects
 * with `index: 0` once the entry record is already sealed, through this same
 * `state-mismatch` arm as C3, not a distinct shape — the same arm `appendTransition` uses.
 *
 * Its REACH is entry-level, which is what SPEC §12 asks for rather than a narrowing of it:
 * "Entry-level failures — an entry compare-and-swap mismatch or C4 seal-finality — report
 * element index 0." The check runs once, before the element loop, and the loop does not
 * re-evaluate seal-finality against the evolving batch — so C4 is barred-at-entry for a batch
 * and barred-per-append for `appendTransition`.
 */
export type BatchResult =
  | { appended: true; transitionDigests: readonly Digest[] }
  | { appended: false; conflict: 'state-mismatch' | 'seq'; index: number };

/**
 * The provisional Store — SPEC §12's storage surface, complete at the method level: all
 * eight methods §12 gives a signature to are shipped here — `putStaged`/`getStaged`/
 * `appendTransition`/`readChain`/`chainHead`/`appendBatch`/`listDue`/`findNonTerminal`.
 * `seal` is not a Store method at all: SPEC §9 lists
 * `seal()` operator-only, alongside `open()`/`review()`/`finalize()`/`redeem()`, built atop
 * this interface rather than part of it (`kernel/seal.ts`). `appendTransition`'s `meta`
 * parameter (`AppendMeta` above) now matches §12's `meta = { nonTerminal, dueAt? }` shape
 * exactly, and `tx?` (below) is likewise no longer narrowed as of the fifth step-2
 * increment — nothing about either parameter is narrowed anymore. `dueAt` now has both a
 * producer (the genesis `opened` append, from the profile's open-window ttl —
 * `kernel/open.ts`) and a reader (`listDue` itself,
 * narrowed to recordIds — see its own doc comment). §12 is explicit that what is durable is
 * the behaviour each method guarantees rather than its argument list, so this narrowed surface
 * conforms behaviourally without mirroring §12's signatures — but a reader must not take it
 * for the whole adapter contract. Async throughout — committing now avoids a breaking
 * sync->async flip once a real Postgres adapter lands — even though `store/memory.ts`'s
 * Map-backed implementation has no genuine I/O to await.
 *
 * `tx?` on every write is SPEC §12's caller-supplied transaction — adapter-generic: "its
 * concrete type is the driver's own transaction handle, named only where an adapter is
 * instantiated, never abstracted behind a library-owned transaction interface". When a
 * host supplies one, the write is "enlisted in that transaction and commits or rolls
 * back with it"; each backing validates the handle it receives and throws a caller error
 * on one it cannot enlist (MemoryStore throws on any handle — it has no driver).
 */
export interface Store {
  /**
   * Idempotent by `staged.id` (content-derived — `id.ts`'s `deriveStagedRef`).
   * **First-write-wins** on a same-id collision (SQL `ON CONFLICT DO NOTHING` semantics):
   * a second put with the same id is a no-op, even if its content differs.
   */
  putStaged(staged: StagedDraft, tx?: unknown): Promise<void>;

  /** Read by `open()`; `null` for an unknown `stagedRef`. Returns a fresh clone. */
  getStaged(stagedRef: string): Promise<StagedDraft | null>;

  /**
   * The one write seam. `expectedCurrentState`: `null` is the genesis CAS target (the
   * record must NOT already exist); any `RecordState` is the CAS target for every
   * subsequent append (the record's actual current state, derived from its chain, must
   * equal it exactly). `meta` is SPEC §12's per-append metadata (`AppendMeta` above) —
   * the record-level flags the library derives; the Store persists them verbatim and
   * never recomputes them itself.
   */
  appendTransition(
    expectedCurrentState: RecordState | null,
    transition: Transition,
    meta: AppendMeta,
    tx?: unknown,
  ): Promise<AppendResult>;

  /**
   * The full chain in seq order; `[]` for an unknown recordId (never throws). Returns
   * FRESH (deep-cloned) transitions — a caller mutating a returned transition or its
   * payload can never corrupt store-internal state. This is a REQUIREMENT on every
   * conforming Store, not an implementation detail of the memory backing.
   */
  readChain(recordId: string): Promise<Transition[]>;

  /**
   * The last transition's `transitionDigest`, computed via
   * `chain/encoding.ts`'s `transitionDigest`; `null` for an unknown recordId.
   */
  chainHead(recordId: string): Promise<Digest | null>;

  /**
   * All-or-nothing multi-append under ONE entry compare-and-swap (SPEC §12). The caller
   * builds the chain — it must, since each element's `prevHash` is the previous element's
   * digest — and the store verifies the sequencing rather than assigning it.
   *
   * `expectedCurrentState` is `RecordState`, never `null`: SPEC §12 states that genesis
   * never appears in a batch, so the genesis CAS target has no meaning here.
   *
   * An empty `transitions` array is a caller error and THROWS — a batch that appends
   * nothing has no honest result to report, and returning `appended:true` with no digests
   * would let a caller mistake it for success.
   */
  appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
    tx?: unknown,
  ): Promise<BatchResult>;

  /**
   * The recordIds with a pending clock that has come due — SPEC §12's gate, verbatim:
   * `dueAt ≠ null AND dueAt ≤ now`, with **no state predicate**. `dueAt` presence is the
   * library's declaration of a pending clock; the store never derives one.
   *
   * NARROWED from SPEC §12, which says this returns the records due. Ids are what the
   * operator sweep needs — every seam it would drive takes a recordId — and returning full
   * records would require the store to replay chains it deliberately does not interpret.
   */
  listDue(now: Date): Promise<string[]>;

  /**
   * The live non-terminal record for the pair, or `null` — SPEC §12: "the re-emit binding
   * that makes `record-exists` actionable, and the same record C1 names as the blocker".
   * A host that draws `record-exists` from `open()` holds the `(profileId, subjectRef)` it
   * just tried; this read turns that pair into the blocking record's id.
   *
   * NARROWED from SPEC §12, which says this "returns the live non-terminal record for the
   * pair (or nothing)": this build returns the recordId, on the same reasoning as
   * `listDue` — the id is what every downstream seam takes (`review`, `readChain`,
   * `replay`), and returning a full record would require the store to replay chains it
   * deliberately does not interpret. Freshness (SPEC §12: "All reads return fresh values")
   * is satisfied structurally — a string is immutable, so there is nothing to clone.
   */
  findNonTerminal(profileId: string, subjectRef: string): Promise<string | null>;
}
