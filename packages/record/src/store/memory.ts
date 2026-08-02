// @vidimera/record — store/memory.ts (design §2 "store/memory.ts" / §4 "Provisional
// Store" IN FULL): the slice-3 in-memory (Map-backed) `Store` implementation. Zero
// native dep, day-one CI-able (design §4 "Slice-3 backing = in-memory only"). Hand-
// implements C1 exclusivity / C2 sequencing / C3 monotonicity to match SQLite/Postgres
// semantics EXACTLY so the slice-4 real adapters port this behavior 1:1 — a bare
// `WHERE state=...` predicate is explicitly called out by the design as wrong (design
// §4 C1), so every constraint here is checked atomically INSIDE `appendTransition`,
// never as a separate advisory pre-check a concurrent caller could race past.
//
// Transactional-shape note (self-review requirement): although this Map is accessed
// single-threaded (no real concurrency in-process), `appendTransition` still MODELS
// the transactional shape a real DB txn would need — every check below runs
// synchronously against `this.records`/`this.staged`, with the mutation (the `Map.set`
// / `chain.push`) as the LAST step, only after every check has passed, and with no
// `await` anywhere in between. That is what "checked atomically inside the append,
// never an advisory pre-check" means when ported to a real transaction.

import type { Digest, RecordState, Transition, TransitionKind } from '../types.js';
import { transitionDigest } from '../chain/encoding.js';
import { CORE, type RefusalCode } from '../refusal-codes.js';
import type { AppendResult, Store, StagedDraft } from './store.js';

/**
 * The `opened` transition's payload, read only for the two fields C1 exclusivity
 * needs (design task-5 brief: "profileId/subjectRef for a record come from its opened
 * transition's payload"). Mirrors `chain/replay.ts`'s own local `OpenedPayload`
 * convention: `Transition.payload` is `unknown` by design (the chain is the persisted,
 * opaque wire format), so each module that needs to read specific fields off a
 * transition's payload declares its own minimal local reading-convention interface
 * rather than widening the public contract.
 */
interface GenesisPayload {
  profileId: string;
  subjectRef: string;
}

/** Mirrors `chain/replay.ts`'s local `RefusedPayload` reading convention. */
interface RefusedPayload {
  code: RefusalCode;
}

/**
 * A record's Store-side bookkeeping: the fields C1/C3 need to decide future appends
 * (`profileId`/`subjectRef`/`nonTerminal`/`state`), plus the full chain `readChain`
 * serves. `nonTerminal` and `state` are both maintained INCREMENTALLY as transitions
 * are appended (never recomputed by re-folding the whole chain) — `state` from the
 * TransitionKind→RecordState mapping below (`stateOf`), `nonTerminal` from whatever
 * boolean the library passed to THIS append (design §4: "library-derived nonTerminal"
 * — the Store persists it verbatim, never recomputes the formula itself).
 */
interface StoredRecord {
  id: string;
  profileId: string;
  subjectRef: string;
  state: RecordState;
  nonTerminal: boolean;
  chain: Transition[];
}

/**
 * The `RecordState` a given `TransitionKind` transitions a record TO, or `null` if the
 * kind is state-PRESERVING (design task-5 brief: "the transition kind drives state:
 * opened->open, confirmed->confirmed, refused->refused, expired->expired;
 * consultation-recorded/sealed are state-preserving"). Written as an exhaustive
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
 * disjuncts rather than only the slice-3-reachable ones.
 *
 * `finding-raised`/`acknowledged` (slice-5+ GOVERNED annotations, not emitted by the
 * slice-3 kernel) are read as state-preserving on the same reasoning as `sealed` —
 * they record a fact ABOUT a record without themselves deciding it.
 */
function stateOf(kind: TransitionKind): RecordState | null {
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

/** A kind is "state-leaving" (design §4 C3) iff it maps to a new `RecordState`. */
function isStateLeaving(kind: TransitionKind): boolean {
  return stateOf(kind) !== null;
}

/**
 * C3's second carve-out (design §4/task-5 brief): "a compromise-classed refusal edge
 * (`confirmed->refused`, `redeeming->refused`) — i.e. a `kind:'refused'` append whose
 * `expectedCurrentState` is `'confirmed'` or `'redeeming'` is allowed through C3 (it
 * still must pass the state CAS)." Deliberately keyed off the code's CLASS (via the
 * `refusal-codes.ts` `CORE` registry), not the literal string `'chain-compromise'` —
 * "compromise-classed" is the design's own framing, and `CORE` is already the single
 * source of truth for which codes are compromise-classed.
 *
 * The FIRST carve-out (a state-preserving `sealed` append) needs no corresponding
 * check here: `sealed` maps to `null` in `stateOf`, so `isStateLeaving('sealed')` is
 * already `false` and the C3 gate below never even reaches this predicate for it. That
 * is `sealed`'s carve-out "implemented honestly" (task-5 brief) — the true reason a
 * `sealed` append is never blocked is that it never leaves the state in the first
 * place, not a hardcoded `kind === 'sealed'` bypass that would say otherwise.
 */
function isCompromiseCarveOut(transition: Transition, expectedCurrentState: RecordState): boolean {
  if (transition.kind !== 'refused') return false;
  if (expectedCurrentState !== 'confirmed' && expectedCurrentState !== 'redeeming') return false;
  const payload = transition.payload as RefusedPayload;
  return CORE[payload.code] === 'compromise';
}

/**
 * The provisional in-memory `Store` (design §4 slice-3 backing). Re-exported from the
 * library's public index (Task 10 review, adjudicated) as the seam adopters should wire
 * rather than hand-rolling a byte-identical copy.
 *
 * PUBLIC BUT EXPLICITLY UNSTABLE PRE-1.0 — same marking as the `Store` interface it
 * implements (`store/store.ts`): this class is provisional scaffolding standing in for
 * the slice-4 real SQLite/Postgres adapters, not a frozen contract. Chain/encoding
 * internals (`chain/encoding.ts`'s `transitionDigest`, etc.) remain unexported; only
 * this class is the seam.
 */
export class MemoryStore implements Store {
  private readonly staged = new Map<string, StagedDraft>();
  private readonly records = new Map<string, StoredRecord>();

  async putStaged(staged: StagedDraft): Promise<void> {
    // Idempotent by staged.id (design §4): re-putting the same id simply overwrites
    // with (by construction, since stagedRef is content-derived — id.ts) an
    // identical value — never an error, never a second entry.
    this.staged.set(staged.id, staged);
  }

  async getStaged(stagedRef: string): Promise<StagedDraft | null> {
    return this.staged.get(stagedRef) ?? null;
  }

  async appendTransition(
    expectedCurrentState: RecordState | null,
    transition: Transition,
    nonTerminal: boolean,
  ): Promise<AppendResult> {
    const existing = this.records.get(transition.recordId);

    if (expectedCurrentState === null) {
      return this.appendGenesis(transition, nonTerminal, existing);
    }
    return this.appendSubsequent(expectedCurrentState, transition, nonTerminal, existing);
  }

  /**
   * Genesis append (design §4: "null for genesis; the CAS target state"). Check order
   * (all inside this one synchronous call, no `await`):
   *  1. state CAS — the record must NOT already exist.
   *  2. C1 exclusivity — no OTHER record sharing (profileId, subjectRef) may currently
   *     be flagged nonTerminal.
   *  3. C2 sequencing — a genesis transition's seq must be exactly 1.
   * Only once all three pass does the record get inserted (the mutation).
   */
  private appendGenesis(
    transition: Transition,
    nonTerminal: boolean,
    existing: StoredRecord | undefined,
  ): AppendResult {
    if (existing) {
      // expectedCurrentState:null requires the record not to exist yet (design §4
      // "State CAS: ... Genesis: expectedCurrentState null requires the record NOT to
      // exist yet"). Modeled as 'state-mismatch' — the same arm a non-genesis CAS
      // failure uses — since this genuinely IS a CAS failure (claimed target state
      // "does not exist" vs. actual "exists"), not a distinct fourth conflict shape.
      return { appended: false, conflict: 'state-mismatch' };
    }

    const payload = transition.payload as GenesisPayload;

    // C1 exclusivity (design §4: "Fires on a GENESIS append (new record) when another
    // record for the same (profileId, subjectRef) is currently flagged nonTerminal ->
    // conflict:'exclusivity' + that blocker's recordId"). A partial-UNIQUE-index scan,
    // hand-simulated as a linear scan over every currently-tracked record — correct
    // for the provisional in-memory backing; a real adapter enforces the same
    // predicate via an actual partial unique index.
    for (const other of this.records.values()) {
      if (other.nonTerminal && other.profileId === payload.profileId && other.subjectRef === payload.subjectRef) {
        return { appended: false, conflict: 'exclusivity', blockingRecordId: other.id };
      }
    }

    // C2 sequencing (genesis case): the first transition of any record is always seq 1.
    if (transition.seq !== 1) {
      return { appended: false, conflict: 'seq' };
    }

    const digest = transitionDigest(transition);
    this.records.set(transition.recordId, {
      id: transition.recordId,
      profileId: payload.profileId,
      subjectRef: payload.subjectRef,
      state: 'open',
      nonTerminal,
      chain: [transition],
    });
    return { appended: true, seq: transition.seq, transitionDigest: digest };
  }

  /**
   * Non-genesis append. Check order (all inside this one synchronous call, no
   * `await`):
   *  1. state CAS — the record must exist AND its current `state` must equal
   *     `expectedCurrentState` exactly.
   *  2. C3 monotonicity — if the record is currently TERMINAL (persisted
   *     `nonTerminal === false`), a state-leaving append is rejected unless it is the
   *     compromise carve-out (the `sealed` carve-out needs no separate check here —
   *     see `isCompromiseCarveOut`'s doc comment).
   *  3. C2 sequencing — the proposed `transition.seq` must equal the store's
   *     authoritative `max+1` (`existing.chain.length + 1`).
   * Only once all three pass does the append land (push + flag/state update).
   */
  private appendSubsequent(
    expectedCurrentState: RecordState,
    transition: Transition,
    nonTerminal: boolean,
    existing: StoredRecord | undefined,
  ): AppendResult {
    if (!existing || existing.state !== expectedCurrentState) {
      return { appended: false, conflict: 'state-mismatch' };
    }

    if (!existing.nonTerminal) {
      // The record is TERMINAL. Design §4 C3: "no state-leaving append after a
      // terminal state ... EXCEPT the two carve-outs."
      if (isStateLeaving(transition.kind) && !isCompromiseCarveOut(transition, expectedCurrentState)) {
        return { appended: false, conflict: 'state-mismatch' };
      }
    }

    const expectedSeq = existing.chain.length + 1;
    if (transition.seq !== expectedSeq) {
      return { appended: false, conflict: 'seq' };
    }

    const digest = transitionDigest(transition);
    existing.chain.push(transition);
    existing.nonTerminal = nonTerminal;
    const nextState = stateOf(transition.kind);
    if (nextState !== null) {
      existing.state = nextState;
    }
    return { appended: true, seq: transition.seq, transitionDigest: digest };
  }

  async readChain(recordId: string): Promise<Transition[]> {
    const existing = this.records.get(recordId);
    // A defensive copy: callers must not be able to corrupt store-internal state by
    // mutating the array they get back (the Transition objects themselves are treated
    // as immutable once appended, same as every other module in this codebase).
    return existing ? [...existing.chain] : [];
  }

  async chainHead(recordId: string): Promise<Digest | null> {
    const existing = this.records.get(recordId);
    if (!existing) return null;
    const last = existing.chain.at(-1);
    return last === undefined ? null : transitionDigest(last);
  }
}
