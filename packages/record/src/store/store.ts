// @vidimera/record — store/store.ts: the provisional `Store` interface + its
// `AppendResult` union.
//
// PUBLIC BUT EXPLICITLY UNSTABLE PRE-1.0 (SPEC §12: "provisional pre-1.0" —
// "method signatures are unstable while 0.x and freeze only at 1.0"). The header line is
// this file's own paraphrase; the two quoted fragments are §12's own words.
// A host may inject its own `Store` implementation today (there is
// no other way to run the library — `Config.store` is required), but this interface's
// shape is provisional scaffolding for a future real SQLite/Postgres adapter, not
// a frozen contract: it WILL change (most likely gaining a caller-transaction seam and a
// committed-read surface — both named but not built in this build, SPEC §12) at a later
// build step. Do not build long-lived external adapters against this exact shape yet.
//
// Placement note: `StagedDraft` lives in `types.ts` alongside the other core shapes;
// this module RE-EXPORTS the existing `types.ts` definition (so callers can still
// `import type { StagedDraft } from './store/store.js'` and get it grouped alongside
// `AppendResult`) rather than duplicating/redefining it. `AppendResult` has no earlier
// home, so it is defined here.

import type { Digest, RecordState, StagedDraft, Transition } from '../types.js';

export type { StagedDraft };

/**
 * `AppendResult` — this build's encoding of SPEC §12's C1-C3 constraints, NOT a union the
 * SPEC declares. §12 states them as four prose bullets and no result type at all, and calls
 * its own signatures provisional — SPEC §12: "What is durable is the *behaviour* each
 * method guarantees, not its argument list." §12's C4 seal-finality is unbuilt here; a C4
 * rejection would surface through the same terminal-state-mismatch arm as C3 —
 * SPEC §12: "no separate conflict shape".
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
 * The provisional Store — a strict SUBSET of the storage surface SPEC §12 names, not a
 * transcription of it. Shipped here: `putStaged`/`getStaged`/`appendTransition`/
 * `readChain`/`chainHead`. NOT built in this build step: `appendBatch`, `findNonTerminal`,
 * `listDue`, `seal`, and the optional caller-supplied transaction §12 puts on every write;
 * §12's `meta = { nonTerminal, dueAt? }` is narrowed here to a bare `nonTerminal` boolean
 * (no `dueAt` — nothing yet lists due records). §12 is explicit that what is durable is the
 * behaviour each method guarantees rather than its argument list, so this subset conforms
 * behaviourally without mirroring §12's signatures — but a reader must not take it for the
 * whole adapter contract. Async throughout — committing now avoids a breaking sync->async
 * flip once a real Postgres adapter and caller-transaction seam land — even though
 * `store/memory.ts`'s Map-backed implementation has no genuine I/O to await.
 */
export interface Store {
  /**
   * Idempotent by `staged.id` (content-derived — `id.ts`'s `deriveStagedRef`).
   * **First-write-wins** on a same-id collision (SQL `ON CONFLICT DO NOTHING` semantics):
   * a second put with the same id is a no-op, even if its content differs.
   */
  putStaged(staged: StagedDraft): Promise<void>;

  /** Read by `open()`; `null` for an unknown `stagedRef`. Returns a fresh clone. */
  getStaged(stagedRef: string): Promise<StagedDraft | null>;

  /**
   * The one write seam. `expectedCurrentState`: `null` is the genesis CAS target (the
   * record must NOT already exist); any `RecordState` is the CAS target for every
   * subsequent append (the record's actual current state, derived from its chain, must
   * equal it exactly). `nonTerminal` is the library-DERIVED (via `nonterminal.ts`)
   * flag for the record's state AFTER this transition is applied — the Store persists
   * it verbatim; it never recomputes the formula itself.
   */
  appendTransition(
    expectedCurrentState: RecordState | null,
    transition: Transition,
    nonTerminal: boolean,
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
}
