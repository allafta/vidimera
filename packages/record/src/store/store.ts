// @vidimera/record — store/store.ts: the provisional `Store` interface + its
// `AppendResult`, `AppendMeta`, and `BatchResult` types.
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
// `AppendResult`) rather than duplicating/redefining it. `AppendResult`, `AppendMeta`, and
// `BatchResult` all have no earlier home, so they are defined here.

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
 * SPEC §12's append metadata — the record-level flags the store persists **verbatim**:
 * SPEC §12 "the library derives them, the store never recomputes them".
 *
 *  - `nonTerminal` — the derived (`nonterminal.ts`) flag for the record's state AFTER this
 *    append, which C1 exclusivity reads.
 *  - `dueAt` — the library-computed clock deadline for whichever pending window the record
 *    is in, RFC3339 UTC. Presence sets the record's pending-clock column; **absence clears
 *    it**. It is a listing index only and never authoritative — SPEC §12.
 *
 * §12 also puts an optional caller-supplied transaction on every write. It is NOT built
 * here: an in-memory backing has no transaction to receive, so the parameter would be
 * structurally ignored. It arrives with the first real adapter. Deferral register row 13.
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
 * Same limit as `AppendResult` above, restated here because this is a second reader of it:
 * §12's C4 seal-finality is unbuilt in this build (deferral register row 14), so the
 * entry-level C4 rejection half of "entry-level failures report element index 0" has no bar
 * behind it — a C4 rejection would surface through this same `state-mismatch` arm as C3, not
 * as a distinct shape, exactly as it would at `appendTransition`.
 */
export type BatchResult =
  | { appended: true; transitionDigests: readonly Digest[] }
  | { appended: false; conflict: 'state-mismatch' | 'seq'; index: number };

/**
 * The provisional Store — a strict SUBSET of the storage surface SPEC §12 names, not a
 * transcription of it. Shipped here: `putStaged`/`getStaged`/`appendTransition`/
 * `readChain`/`chainHead`/`appendBatch`/`listDue`. NOT built in this build step:
 * `findNonTerminal`, `seal`. `appendTransition`'s `meta` parameter (`AppendMeta` above) now
 * matches §12's `meta = { nonTerminal, dueAt? }` shape exactly — nothing about the parameter
 * itself is narrowed anymore. What IS still narrowed is `tx?`, the optional caller-supplied
 * transaction §12 puts on every write: omitted here because an in-memory backing has no
 * transaction to receive it. `dueAt` now has both a producer (the genesis `opened` append,
 * from the profile's open-window ttl — `kernel/open.ts`) and a reader (`listDue` itself,
 * narrowed to recordIds — see its own doc comment). §12 is explicit that what is durable is
 * the behaviour each method guarantees rather than its argument list, so this subset
 * conforms behaviourally without mirroring §12's signatures — but a reader must not take it
 * for the whole adapter contract. Async throughout — committing now avoids a breaking
 * sync->async flip once a real Postgres adapter and caller-transaction seam land — even
 * though `store/memory.ts`'s Map-backed implementation has no genuine I/O to await.
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
   * equal it exactly). `meta` is SPEC §12's per-append metadata (`AppendMeta` above) —
   * the record-level flags the library derives; the Store persists them verbatim and
   * never recomputes them itself.
   */
  appendTransition(
    expectedCurrentState: RecordState | null,
    transition: Transition,
    meta: AppendMeta,
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
}
