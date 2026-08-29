// @vidimera/record — store/memory.ts: the in-memory (Map-backed) `Store` implementation
// (DECISIONS.md #24: "reference semantics, never durable evidence"). Zero
// native dep, day-one CI-able. Hand-
// implements C1 exclusivity / C2 sequencing / C3 monotonicity / C4 seal-finality to match
// SQLite/Postgres semantics EXACTLY so a real adapter can port this behavior 1:1 — the
// embedded one now does (`store/sqlite.ts`), sharing this file's own `store/semantics.ts`
// mapping for C3/C4 rather than re-deriving it. A bare `WHERE state=...` predicate is
// explicitly called out by SPEC §12 as wrong (its C1), so every constraint here is
// checked atomically INSIDE `appendTransition`/`appendBatch`, never as a separate
// advisory pre-check a concurrent caller could race past.
//
// Transactional-shape note (self-review requirement): although this Map is accessed
// single-threaded (no real concurrency in-process), `appendTransition`/`appendBatch` still
// MODEL the transactional shape a real DB txn would need — every check below runs
// synchronously against `this.records`/`this.staged`, with the mutation (the `Map.set` /
// `chain.push`) as the LAST step, only after every check AND every other failable
// operation has completed, and with no `await` anywhere in between. `appendBatch`'s own
// mutation step clones every element BEFORE pushing any of them, for exactly this reason:
// `structuredClone` is itself failable (`DataCloneError` on a function- or symbol-valued
// payload member — see the store-clone decision comment above the class), so a clone left
// INSIDE the push loop would let a throw at element k leave elements 0..k-1 already
// applied — a real partial batch, not a rollback. That is what "checked atomically inside
// the append, never an advisory pre-check" means when ported to a real transaction.

import { transitionDigest } from '../chain/encoding.js';
import type { Digest, RecordState, Transition } from '../types.js';
import { type GenesisPayload, isCompromiseCarveOut, isStateLeaving, stateOf } from './semantics.js';
import type { AppendMeta, AppendResult, BatchResult, StagedDraft, Store } from './store.js';

/**
 * A record's Store-side bookkeeping: the fields C1/C3 need to decide future appends
 * (`profileId`/`subjectRef`/`nonTerminal`/`state`), plus the full chain `readChain`
 * serves. `nonTerminal` and `state` are both maintained INCREMENTALLY as transitions
 * are appended (never recomputed by re-folding the whole chain) — `state` from the
 * TransitionKind→RecordState mapping in `store/semantics.ts` (`stateOf`), `nonTerminal` from whatever
 * boolean the library passed to THIS append (SPEC §12: "the library derives them, the
 * store never recomputes them" — persisted verbatim).
 */
interface StoredRecord {
  id: string;
  profileId: string;
  subjectRef: string;
  state: RecordState;
  nonTerminal: boolean;
  dueAt?: string;
  chain: Transition[];
  /**
   * SPEC §12's C4 seal-finality: set when a `sealed` transition lands, never cleared. Unlike
   * `nonTerminal` and `dueAt` — library-derived flags the store persists verbatim from `meta`
   * — this one is the store's own, derived from the transition's kind. C4 is one of §12's
   * "Constraints an adapter MUST provide", and constraints are the store's work: C1 scans
   * records, C2 computes `max+1`, C3 already switches on the kind. Putting `sealed` in
   * `AppendMeta` instead would break the §12 meta shape.
   */
  sealed: boolean;
}

/**
 * Store-clone decision: `putStaged`/`readChain`/`appendGenesis`/`appendSubsequent` below
 * all isolate store-internal state from a caller's own object by cloning with
 * `structuredClone` before storing or returning it. `structuredClone` THROWS
 * `DataCloneError` on a function- or symbol-valued member anywhere in the object graph —
 * a STRICTER tolerance than `jcs.ts`'s own JCS pass (`hasNoJsonForm`), which SILENTLY
 * OMITS such a member rather than throwing (matching `JSON.stringify`). Concretely:
 * `kernel/finalize.ts` embeds the caller-supplied `identity` argument verbatim as
 * `payload.actor` (and `facts.checker` into a Consultation payload) — an `IdentityAssertion`
 * that is a plain `{principal, authority, proofRef?}` literal (SPEC §6) clones fine, but one
 * built as a class instance carrying a method would newly THROW at this seam, even though
 * `transitionDigest` already accepts it today (the method is silently dropped by JCS before
 * this clone ever runs, since the digest is always computed BEFORE the clone at both write
 * sites below).
 *
 * DECISION: use plain `structuredClone` and accept the throw as a deliberate narrowing —
 *  1. it is the reference implementation's own choice for this same fix; diverging here
 *     would introduce a fresh, unaudited difference in the very change meant to close an
 *     inherited gap, not close one;
 *  2. a value that `structuredClone` cannot copy cannot be considered durable evidence
 *     either —
 *     this class is documented as "reference semantics, never durable evidence"
 *     (DECISIONS.md #24), so requiring clone-safety is a step TOWARD what any real backing
 *     will need, not an arbitrary new restriction;
 *  3. a helper that faithfully mirrored `jcs.ts`'s tolerance would also have to honor its
 *     `toJSON`-takes-precedence rule to genuinely match "what the digest accepts" (`jcs.ts`
 *     calls `toJSON` before ever checking a member for omission, `jcs.ts:88-91`) —
 *     reimplementing that recursive traversal a second time, on this hot path, is new-code
 *     risk disproportionate to the actual need: SPEC §6's `IdentityAssertion` shape is
 *     plain data, and a host needing a richer object can project it to a literal at the
 *     call site.
 *
 * Pinned by store-constraints.test.ts's "a payload member carrying a FUNCTION ... throws
 * DataCloneError" tests, so this choice cannot drift silently.
 */

/**
 * The provisional in-memory `Store` (DECISIONS.md #24: "reference semantics, never
 * durable evidence"). Re-exported from the
 * library's public index as the seam adopters should wire
 * rather than hand-rolling a byte-identical copy.
 *
 * PUBLIC BUT EXPLICITLY UNSTABLE PRE-1.0 — same marking as the `Store` interface it
 * implements (`store/store.ts`): this class is the reference in-memory backing beside
 * the real embedded adapter (`store/sqlite.ts`) and the server-SQL adapter
 * (`@vidimera/store-postgres`'s `PostgresStore`); none of the three is a frozen
 * contract. One chain/encoding internal IS exported — `transitionDigest`, part of the
 * adapter-author surface a conforming `Store` needs, and the only route
 * `@vidimera/store-postgres` has to it. The rest of `chain/encoding.ts`
 * (`genesisPrevHash`, `encodeTransition`) stays unexported; only this class is
 * the seam.
 */
export class MemoryStore implements Store {
  private readonly staged = new Map<string, StagedDraft>();
  private readonly records = new Map<string, StoredRecord>();

  /**
   * SPEC §12's caller-transaction seam is adapter-generic — "its concrete type is the
   * driver's own transaction handle" — and this backing has no driver: a supplied handle
   * is a caller error, thrown loudly rather than structurally ignored (the silent-ignore
   * risk is why the seam was deferred until a real adapter existed to receive it).
   */
  private static rejectTx(tx: unknown): void {
    if (tx !== undefined) {
      throw new Error('MemoryStore: no transaction to enlist — this backing has no driver');
    }
  }

  async putStaged(staged: StagedDraft, tx?: unknown): Promise<void> {
    MemoryStore.rejectTx(tx);
    // Idempotent, first-write-wins (SPEC §12): a stagedRef is content-derived
    // (id.ts), so a re-put of the identical draft is the ordinary case, but a
    // genuine same-id collision must keep the FIRST write rather than the second —
    // never an error, never a second entry, and never an overwrite.
    if (this.staged.has(staged.id)) {
      return;
    }
    // Clone on write (SPEC §12 freshness — see the store-clone decision comment above the
    // class): the caller's own object must not become a live write handle into
    // store-internal state. Symmetric with `getStaged`'s existing clone-on-read.
    this.staged.set(staged.id, structuredClone(staged));
  }

  async getStaged(stagedRef: string): Promise<StagedDraft | null> {
    // Fresh value (SPEC §12): a caller mutating the returned draft must never
    // corrupt store-internal state, so a structured clone is handed out, never the
    // stored object itself.
    const staged = this.staged.get(stagedRef);
    return staged === undefined ? null : structuredClone(staged);
  }

  async appendTransition(
    expectedCurrentState: RecordState | null,
    transition: Transition,
    meta: AppendMeta,
    tx?: unknown,
  ): Promise<AppendResult> {
    MemoryStore.rejectTx(tx);
    const existing = this.records.get(transition.recordId);

    if (expectedCurrentState === null) {
      return this.appendGenesis(transition, meta, existing);
    }
    return this.appendSubsequent(expectedCurrentState, transition, meta, existing);
  }

  /**
   * The C1 exclusivity scan (SPEC §12's C1: a partial `UNIQUE(profileId, subjectRef)` over
   * the persisted non-terminal flag), shared by `appendGenesis`'s rejection path and
   * `findNonTerminal` — SPEC §12: "A rejected genesis append names the **blocking**
   * record — the live non-terminal record for the pair, the same record `findNonTerminal`
   * returns." ONE predicate, so the two agree by construction rather than by parallel
   * code; find-non-terminal.test.ts pins the agreement observably as well. A linear scan,
   * hand-simulating the partial unique index a real adapter would query — correct for the
   * provisional in-memory backing.
   */
  private liveNonTerminalFor(profileId: string, subjectRef: string): StoredRecord | undefined {
    for (const record of this.records.values()) {
      if (
        record.nonTerminal &&
        record.profileId === profileId &&
        record.subjectRef === subjectRef
      ) {
        return record;
      }
    }
    return undefined;
  }

  /**
   * Genesis append (SPEC §12: "null" is the genesis CAS target). Check order
   * (all inside this one synchronous call, no `await`):
   *  1. state CAS — the record must NOT already exist.
   *  2. C1 exclusivity — no OTHER record sharing (profileId, subjectRef) may currently
   *     be flagged nonTerminal.
   *  3. C2 sequencing — a genesis transition's seq must be exactly 1.
   * Only once all three pass does the record get inserted (the mutation).
   */
  private appendGenesis(
    transition: Transition,
    meta: AppendMeta,
    existing: StoredRecord | undefined,
  ): AppendResult {
    if (existing) {
      // expectedCurrentState:null requires the record not to exist yet (SPEC §12: "a
      // genesis append targets a record that MUST NOT yet exist"). Modeled as
      // 'state-mismatch' — the same arm a non-genesis CAS
      // failure uses — since this genuinely IS a CAS failure (claimed target state
      // "does not exist" vs. actual "exists"), not a distinct fourth conflict shape.
      return { appended: false, conflict: 'state-mismatch' };
    }

    const payload = transition.payload as GenesisPayload;

    // C1 exclusivity (SPEC §12's C1) — the scan lives in `liveNonTerminalFor`, shared with
    // `findNonTerminal` so the blocker named here and the record that method returns agree
    // by construction (see the helper's own doc comment).
    const blocker = this.liveNonTerminalFor(payload.profileId, payload.subjectRef);
    if (blocker !== undefined) {
      return { appended: false, conflict: 'exclusivity', blockingRecordId: blocker.id };
    }

    // C2 sequencing (genesis case): the first transition of any record is always seq 1.
    if (transition.seq !== 1) {
      return { appended: false, conflict: 'seq' };
    }

    // The digest is computed from the ORIGINAL object, before the clone-on-write below —
    // the two write paths' clone choice (see the store-clone decision comment above the
    // class) never moves a canonical byte, because it runs strictly after this line.
    const digest = transitionDigest(transition);
    this.records.set(transition.recordId, {
      id: transition.recordId,
      profileId: payload.profileId,
      subjectRef: payload.subjectRef,
      state: 'open',
      nonTerminal: meta.nonTerminal,
      dueAt: meta.dueAt,
      // Clone on write: `open()` deliberately reuses the same `openedTransition` object
      // across its first attempt and an expire-then-retry (kernel/open.ts's `first` and
      // `retry` genesis appends, both `store.appendTransition(null, openedTransition, …)`;
      // named rather than line-pinned, because the previous pin here went stale) — the
      // caller's object must not become a live write handle into what gets persisted here.
      chain: [structuredClone(transition)],
      sealed: false,
    });
    return { appended: true, seq: transition.seq, transitionDigest: digest };
  }

  /**
   * Non-genesis append. Check order (all inside this one synchronous call, no
   * `await`):
   *  1. state CAS — the record must exist AND its current `state` must equal
   *     `expectedCurrentState` exactly.
   *  2. C4 seal-finality — once a `sealed` transition has landed, every further append is
   *     rejected outright, ahead of C3 and unconditional on it: C4 admits nothing C3 would
   *     otherwise carve out (SPEC §12: "not even a `compromise` refusal edge").
   *  3. C3 monotonicity — if the record is currently TERMINAL (persisted
   *     `nonTerminal === false`), a state-leaving append is rejected unless it is the
   *     compromise carve-out (the `sealed` carve-out needs no separate check here —
   *     see `isCompromiseCarveOut`'s doc comment).
   *  4. C2 sequencing — the proposed `transition.seq` must equal the store's
   *     authoritative `max+1` (`existing.chain.length + 1`).
   * Only once all four pass does the append land (push + flag/state update).
   */
  private appendSubsequent(
    expectedCurrentState: RecordState,
    transition: Transition,
    meta: AppendMeta,
    existing: StoredRecord | undefined,
  ): AppendResult {
    if (!existing || existing.state !== expectedCurrentState) {
      return { appended: false, conflict: 'state-mismatch' };
    }

    // C4 seal-finality (SPEC §12): after a `sealed` transition, NO further append of any kind
    // is admitted — not even a `compromise` refusal edge, because a sealed record's body may
    // be archived or destroyed as a unit and nothing may extend a chain whose evidence may be
    // gone. C4 rejects through the same terminal-state-mismatch path as C3 (SPEC §12: "no
    // separate conflict shape"), so a racing or duplicate seal loses deterministically and
    // `kernel/seal.ts` maps the residual to `unsealable-state`.
    if (existing.sealed) {
      return { appended: false, conflict: 'state-mismatch' };
    }

    if (!existing.nonTerminal) {
      // The record is TERMINAL. SPEC §12's C3: "no state-leaving append after a
      // terminal state ... except the two carved exceptions."
      if (
        isStateLeaving(transition.kind) &&
        !isCompromiseCarveOut(transition, expectedCurrentState)
      ) {
        return { appended: false, conflict: 'state-mismatch' };
      }
    }

    const expectedSeq = existing.chain.length + 1;
    if (transition.seq !== expectedSeq) {
      return { appended: false, conflict: 'seq' };
    }

    // The digest is computed from the ORIGINAL object, before the clone-on-write below —
    // see the note in `appendGenesis` and the store-clone decision comment above the class.
    const digest = transitionDigest(transition);
    // Clone on write: `kernel/finalize.ts` embeds the caller-supplied `identity` argument
    // verbatim as `payload.actor` (and `facts.checker` into a consultation payload) — after
    // a successful append the host still holds live references INTO those objects; without
    // cloning, mutating them afterward would rewrite the stored chain's head.
    existing.chain.push(structuredClone(transition));
    existing.nonTerminal = meta.nonTerminal;
    // Presence sets the pending-clock column, absence clears it (SPEC §12). Assigning
    // `meta.dueAt` unconditionally IS the clearing rule — an append that carries no new
    // clock writes `undefined` over whatever was there.
    existing.dueAt = meta.dueAt;
    const nextState = stateOf(transition.kind);
    if (nextState !== null) {
      existing.state = nextState;
    }
    if (transition.kind === 'sealed') {
      existing.sealed = true;
    }
    return { appended: true, seq: transition.seq, transitionDigest: digest };
  }

  /**
   * SPEC §12's atomic batch. Every check and every failable operation runs before any
   * mutation, so the "nothing applied" guarantee is structural rather than a rollback: the
   * first `chain.push` happens only after the last element has been checked and cloned.
   *
   * The terminality INPUT is `existing.nonTerminal` read once at entry, while the state the
   * checks run against EVOLVES element by element (SPEC §12: a record "cannot become
   * terminal mid-batch"). That is what lets finalize's batch end in the `confirmed` edge
   * that makes the record terminal.
   */
  async appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
    tx?: unknown,
  ): Promise<BatchResult> {
    MemoryStore.rejectTx(tx);
    const first = transitions[0];
    if (first === undefined) {
      throw new Error(
        'appendBatch: empty batch — a batch that appends nothing has no honest result to ' +
          'report, and is a caller error rather than a domain outcome',
      );
    }
    const existing = this.records.get(first.recordId);

    // Entry compare-and-swap, checked ONCE. Entry-level failures report index 0.
    if (!existing || existing.state !== expectedCurrentState) {
      return { appended: false, conflict: 'state-mismatch', index: 0 };
    }

    // C4 is an ENTRY-level failure — SPEC §12: "Entry-level failures — an entry
    // compare-and-swap mismatch or C4 seal-finality — report element index 0."
    if (existing.sealed) {
      return { appended: false, conflict: 'state-mismatch', index: 0 };
    }
    const entryNonTerminal = existing.nonTerminal;

    let state: RecordState = existing.state;
    let seq = existing.chain.length;
    const digests: Digest[] = [];
    // `entries()` rather than an index loop: it yields `Transition`, not
    // `Transition | undefined`, so `noUncheckedIndexedAccess` needs no unreachable
    // narrowing branch here.
    for (const [i, t] of transitions.entries()) {
      if (t.recordId !== first.recordId) {
        throw new Error(
          'appendBatch: every element must name the same recordId — a batch spanning ' +
            'records has no single entry compare-and-swap target',
        );
      }
      if (!entryNonTerminal && isStateLeaving(t.kind) && !isCompromiseCarveOut(t, state)) {
        return { appended: false, conflict: 'state-mismatch', index: i };
      }
      seq += 1;
      if (t.seq !== seq) {
        return { appended: false, conflict: 'seq', index: i };
      }
      if (t.kind === 'opened') {
        throw new Error(
          'appendBatch: genesis never appears in a batch (SPEC §12) — a genesis append has ' +
            'no entry compare-and-swap target and needs the C1 exclusivity check ' +
            '`appendTransition` runs',
        );
      }
      digests.push(transitionDigest(t));
      const next = stateOf(t.kind);
      if (next !== null) state = next;
    }

    // Every check passed. Clone BEFORE the first push, not inside the push loop:
    // `structuredClone` is failable — it throws `DataCloneError` on a non-cloneable payload,
    // which this store deliberately lets propagate — and a throw interleaved with the pushes
    // would leave the earlier elements on the chain. Every failable operation happens before
    // any mutation, which is what makes "nothing applied" structural rather than a rollback.
    // A conflict still wins over a throw, because the check loop above returns first.
    const cloned = transitions.map((t) => structuredClone(t));
    for (const c of cloned) {
      existing.chain.push(c);
    }
    existing.state = state;
    existing.nonTerminal = meta.nonTerminal;
    existing.dueAt = meta.dueAt;
    if (cloned.some((t) => t.kind === 'sealed')) {
      existing.sealed = true;
    }
    return { appended: true, transitionDigests: digests };
  }

  async readChain(recordId: string): Promise<Transition[]> {
    const existing = this.records.get(recordId);
    // A deep clone (SPEC §12 freshness — see the store-clone decision comment above the
    // class): `[...existing.chain]` alone would copy only the ARRAY, handing back the
    // store's own Transition objects (and their payloads) by reference. `readChain` is
    // agent-reachable (agent-surface.ts) — an agent holding only that handle could
    // otherwise silently rewrite persisted chain state through the returned reference.
    return existing ? structuredClone(existing.chain) : [];
  }

  async chainHead(recordId: string): Promise<Digest | null> {
    const existing = this.records.get(recordId);
    if (!existing) return null;
    const last = existing.chain.at(-1);
    return last === undefined ? null : transitionDigest(last);
  }

  async listDue(now: Date): Promise<string[]> {
    const nowMs = now.getTime();
    const due: string[] = [];
    for (const record of this.records.values()) {
      if (record.dueAt !== undefined && Date.parse(record.dueAt) <= nowMs) {
        due.push(record.id);
      }
    }
    return due;
  }

  async findNonTerminal(profileId: string, subjectRef: string): Promise<string | null> {
    return this.liveNonTerminalFor(profileId, subjectRef)?.id ?? null;
  }
}
