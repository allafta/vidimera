// @vidimera/record — store/store.ts (design §2 "store/store.ts" / §4 "Provisional
// Store" IN FULL): the provisional `Store` interface + its `AppendResult` union.
//
// PUBLIC BUT EXPLICITLY UNSTABLE PRE-1.0 (design §4 heading: "public, explicitly
// unstable pre-1.0"). A host may inject its own `Store` implementation today (there is
// no other way to run the library — `Config.store` is required), but this interface's
// shape is provisional scaffolding for the slice-4 real SQLite/Postgres adapters, not
// a frozen contract: it WILL change (most likely gaining a caller-transaction seam,
// OQ2-9, and a committed-read surface, OQ2-10-full) when slice 4 lands. Do not build
// long-lived external adapters against this exact shape yet.
//
// Placement note (task-5 report): `StagedDraft` already lives in `types.ts` (added
// under Task 2's core-types file, ahead of this module, per that file's own doc
// comment). Design §2 nominally places `StagedDraft`/`AppendResult` together under
// "store/store.ts" — here that is satisfied by RE-EXPORTING the existing `types.ts`
// definition (so callers can still `import type { StagedDraft } from
// './store/store.js'` and get the design's intended grouping) rather than
// duplicating/redefining it. `AppendResult` has no earlier home, so it is defined here,
// as the design's file listing implies.

import type { Digest, RecordState, StagedDraft, Transition } from '../types.js';

export type { StagedDraft };

/**
 * `AppendResult` (design §4, verbatim union):
 *  - `{appended:true; seq; transitionDigest}` — the accepted transition's own
 *    server-authoritative `seq` (C2) and its `transitionDigest` (computed the same way
 *    `chainHead` computes one — via `chain/encoding.ts`'s `transitionDigest`, never a
 *    caller-supplied value the Store merely echoes back unchecked).
 *  - `{appended:false; conflict:'state-mismatch'}` — the CAS `expectedCurrentState`
 *    check failed (including: genesis attempted against an already-existing recordId;
 *    C3 monotonicity blocking a state-leaving, non-carve-out append on an already
 *    terminal record — see `store/memory.ts` for why C3 reuses this conflict arm
 *    rather than inventing a fourth).
 *  - `{appended:false; conflict:'seq'}` — C2 sequencing: the proposed `transition.seq`
 *    was not the store's authoritative `max+1` for that record.
 *  - `{appended:false; conflict:'exclusivity'; blockingRecordId}` — C1 exclusivity: a
 *    GENESIS append was rejected because another record for the same
 *    `(profileId, subjectRef)` is currently flagged `nonTerminal`; `blockingRecordId`
 *    names THAT blocker (never the rejected/new record) — the OQ2-10 minimal locator
 *    `open()`'s expire-then-retry path (design §5/§9, Task 7) reads to decide whether
 *    to auto-expire and retry.
 */
export type AppendResult =
  | { appended: true; seq: number; transitionDigest: Digest }
  | { appended: false; conflict: 'state-mismatch' | 'seq' }
  | { appended: false; conflict: 'exclusivity'; blockingRecordId: string };

/**
 * The provisional Store (design §4, verbatim interface). Async throughout (design §9
 * "Sync vs async": "uniformly async ... committing now avoids a breaking sync->async
 * flip" once slice 4's Postgres adapter and OQ2-9 caller-txn seam land) even though
 * `store/memory.ts`'s Map-backed implementation has no genuine I/O to await.
 */
export interface Store {
  /** Idempotent by `staged.id` (content-derived — `id.ts`'s `deriveStagedRef`). */
  putStaged(staged: StagedDraft): Promise<void>;

  /** Read by `open()` (Task 7); `null` for an unknown `stagedRef`. */
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

  /** The full chain in seq order; `[]` for an unknown recordId (never throws). */
  readChain(recordId: string): Promise<Transition[]>;

  /**
   * The last transition's `transitionDigest` (design task-5 brief: "compute via
   * chain/encoding's transitionDigest"); `null` for an unknown recordId.
   */
  chainHead(recordId: string): Promise<Digest | null>;
}
