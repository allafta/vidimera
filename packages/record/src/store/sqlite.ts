// @vidimera/record — store/sqlite.ts: the embedded-SQL `Store` — SPEC §12's "an
// embedded-SQL store (zero-infra, single-operator)" — on `node:sqlite`'s synchronous
// `DatabaseSync`. Single-operator scoped: WAL-mode SQLite under one process; nothing here
// claims multi-connection safety (that is the server-SQL adapter's job description).
//
// The schema is an implementation artifact — SPEC §12: "A persisted schema is an
// **implementation artifact, not a public query API**" — richer listing is the host's own
// read model over the Store's reads. The persisted `state`/`non_terminal`/`due_at`/
// `sealed` columns are constraint-and-index only, exactly as the memory backing's are:
// replay over the chain stays the sole authoritative derivation.
//
// C1 exclusivity is the real thing §12 prescribes — "A partial `UNIQUE(profileId,
// subjectRef)` over the **persisted non-terminal flag**" (`records_c1_exclusivity`
// below). The genesis path still SELECTs the blocker first, because the conflict must
// NAME `blockingRecordId` and `findNonTerminal` shares the same statement; the index is
// the durable backstop.
//
// Payload posture, BACKING-SPECIFIC by design (the conformance suite deliberately does
// not bind it): transitions persist as `JSON.stringify` text, so any JCS-invisible payload
// member — a function-valued member, an `undefined`-valued member, `-0`, `[undefined]`
// inside an array, and the like — is silently dropped or normalized on the round-trip,
// exactly the same way library JCS drops or normalizes it when digesting, so persisted
// bytes and digest agree and `verifyChain` stays green. The memory backing instead throws
// `DataCloneError` on a function- or symbol-valued member, and otherwise PRESERVES what
// JSON would drop (structuredClone has no notion of JCS); each backing owns its own
// rejection/round-trip shape, and the two disagreeing on posture is consistent, not
// corrupt.
//
// WATCH ITEM: `node:sqlite` is experimental — its API may move under a Node upgrade; the
// conformance suite is what catches it. The engines floor is >=22.16: the module lost its
// CLI flag at 22.13, and `isTransaction` — which `validateTx` relies on — arrived at 22.16
// (and 24.0).

import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { transitionDigest } from '../chain/encoding.js';
import type { Digest, RecordState, StagedDraft, Transition } from '../types.js';
import { type GenesisPayload, isCompromiseCarveOut, isStateLeaving, stateOf } from './semantics.js';
import type { AppendMeta, AppendResult, BatchResult, Store } from './store.js';

interface RecordRow {
  id: string;
  state: RecordState;
  non_terminal: number;
  sealed: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS staged (
  id         TEXT PRIMARY KEY,
  draft_json TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS records (
  id           TEXT PRIMARY KEY,
  profile_id   TEXT NOT NULL,
  subject_ref  TEXT NOT NULL,
  state        TEXT NOT NULL,
  non_terminal INTEGER NOT NULL,
  due_at       TEXT,
  sealed       INTEGER NOT NULL DEFAULT 0
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS records_c1_exclusivity
  ON records(profile_id, subject_ref) WHERE non_terminal = 1;
CREATE TABLE IF NOT EXISTS transitions (
  record_id       TEXT NOT NULL,
  seq             INTEGER NOT NULL,
  transition_json TEXT NOT NULL,
  PRIMARY KEY (record_id, seq)
) STRICT;
`;

/**
 * The provisional embedded `Store`. Same public marking as `MemoryStore`: PUBLIC BUT
 * EXPLICITLY UNSTABLE PRE-1.0 (SPEC §12's provisionality clause).
 */
export class SqliteStore implements Store {
  private readonly db: DatabaseSync;
  /** One prepared statement per SQL text, prepared on first use and reused: `StatementSync`
   * is reusable across runs and across transactions, so re-preparing per call bought nothing. */
  private readonly statements = new Map<string, StatementSync>();

  constructor(location: string) {
    this.db = new DatabaseSync(location);
    this.db.exec(SCHEMA);
    if (location !== ':memory:') {
      // Durability under the single-operator concurrency this backing is scoped to.
      this.db.exec('PRAGMA journal_mode = WAL');
    }
  }

  /**
   * Every write runs inside one transaction with the mutation last — the transactional
   * shape `store/memory.ts`'s header MODELS is literal here. SPEC §12: "When none is
   * supplied, an adapter uses its own transaction for the write." (Enlistment in a
   * caller-supplied transaction is `inTransaction`'s job, below — this is only the
   * no-`tx` fallback it delegates to.)
   */
  private inOwnTransaction<T>(body: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = body();
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      try {
        this.db.exec('ROLLBACK');
      } catch {
        // ROLLBACK itself can throw (e.g. a failed COMMIT already auto-rolled back, leaving
        // no open transaction) — swallow it and surface the ORIGINAL error, never this one.
      }
      throw err;
    }
  }

  /**
   * The adapter's own connection — the enlistment surface. SPEC §12's tx is "the driver's
   * own transaction handle"; node:sqlite has no separate transaction object, so the handle
   * IS the connection carrying an open transaction, and co-location (§11.2) means the host
   * runs its own effect statements on THIS connection inside its BEGIN/COMMIT. A foreign
   * connection is refused outright: for ':memory:' it is a different database entirely,
   * and for a file it is a different transaction scope — either way a silent wrong-place
   * write, which is exactly what loud validation exists to prevent.
   */
  get database(): DatabaseSync {
    return this.db;
  }

  /**
   * Closes the adapter's own connection. Deliberately NOT a `Store` method: the memory
   * backing has nothing to close and the Postgres backing never owns its pool, so it lives
   * on this class alone. After it every call throws node:sqlite's own not-open error — the
   * statement cache is cleared here too, since a cached `StatementSync` outlives its
   * connection only as a finalized handle that would throw a different error; the file-backed
   * chain is what the durability pin shows survives to a reopen.
   */
  close(): void {
    this.statements.clear();
    this.db.close();
  }

  private stmt(sql: string): StatementSync {
    let statement = this.statements.get(sql);
    if (statement === undefined) {
      statement = this.db.prepare(sql);
      this.statements.set(sql, statement);
    }
    return statement;
  }

  private validateTx(tx: DatabaseSync): void {
    if (tx !== this.db) {
      throw new Error(
        "SqliteStore: tx is not this store's own connection — enlistment is same-connection " +
          'by design (a foreign connection is a different database or transaction scope)',
      );
    }
    if (!tx.isTransaction) {
      throw new Error(
        'SqliteStore: tx has no open transaction — the caller owns BEGIN/COMMIT (SPEC §12: ' +
          '"The transaction boundary is never hidden from the caller")',
      );
    }
  }

  /** Enlisted (SPEC §12: "enlisted in that transaction and commits or rolls back with
   * it") — the body runs on the open transaction with NO BEGIN/COMMIT/ROLLBACK of our
   * own; or, with no tx, inside our own transaction. */
  private inTransaction<T>(tx: DatabaseSync | undefined, body: () => T): T {
    if (tx !== undefined) {
      this.validateTx(tx);
      return body();
    }
    return this.inOwnTransaction(body);
  }

  private recordRow(recordId: string): RecordRow | undefined {
    return this.stmt('SELECT id, state, non_terminal, sealed FROM records WHERE id = ?').get(
      recordId,
    ) as RecordRow | undefined;
  }

  private maxSeq(recordId: string): number {
    const row = this.stmt(
      'SELECT COALESCE(MAX(seq), 0) AS m FROM transitions WHERE record_id = ?',
    ).get(recordId) as { m: number };
    return row.m;
  }

  /** The C1 scan — shared by the genesis rejection path and `findNonTerminal`, the same
   * one-predicate discipline `store/memory.ts` uses (SPEC §12: "the same record
   * `findNonTerminal` returns"). */
  private liveNonTerminalId(profileId: string, subjectRef: string): string | null {
    const row = this.stmt(
      'SELECT id FROM records WHERE profile_id = ? AND subject_ref = ? AND non_terminal = 1',
    ).get(profileId, subjectRef) as { id: string } | undefined;
    return row?.id ?? null;
  }

  private insertTransition(t: Transition): void {
    this.stmt('INSERT INTO transitions (record_id, seq, transition_json) VALUES (?, ?, ?)').run(
      t.recordId,
      t.seq,
      JSON.stringify(t),
    );
  }

  async putStaged(staged: StagedDraft, tx?: DatabaseSync): Promise<void> {
    // Idempotent, first-write-wins (SPEC §12) — literally ON CONFLICT DO NOTHING, the SQL
    // semantics the memory backing's comment names as its model.
    this.inTransaction(tx, () => {
      this.stmt('INSERT INTO staged (id, draft_json) VALUES (?, ?) ON CONFLICT(id) DO NOTHING').run(
        staged.id,
        JSON.stringify(staged),
      );
    });
  }

  async getStaged(stagedRef: string): Promise<StagedDraft | null> {
    const row = this.stmt('SELECT draft_json FROM staged WHERE id = ?').get(stagedRef) as
      | { draft_json: string }
      | undefined;
    // Fresh value (SPEC §12): parsing from text mints a new object graph per call.
    return row === undefined ? null : (JSON.parse(row.draft_json) as StagedDraft);
  }

  async appendTransition(
    expectedCurrentState: RecordState | null,
    transition: Transition,
    meta: AppendMeta,
    tx?: DatabaseSync,
  ): Promise<AppendResult> {
    return this.inTransaction(tx, () => {
      if (expectedCurrentState === null) {
        return this.appendGenesis(transition, meta);
      }
      return this.appendSubsequent(expectedCurrentState, transition, meta);
    });
  }

  /** Check order mirrors `store/memory.ts` exactly: state CAS, C1, C2, then the insert. */
  private appendGenesis(transition: Transition, meta: AppendMeta): AppendResult {
    if (this.recordRow(transition.recordId) !== undefined) {
      return { appended: false, conflict: 'state-mismatch' };
    }
    const payload = transition.payload as GenesisPayload;
    const blockingRecordId = this.liveNonTerminalId(payload.profileId, payload.subjectRef);
    if (blockingRecordId !== null) {
      return { appended: false, conflict: 'exclusivity', blockingRecordId };
    }
    if (transition.seq !== 1) {
      return { appended: false, conflict: 'seq' };
    }
    const digest = transitionDigest(transition);
    this.stmt(
      'INSERT INTO records (id, profile_id, subject_ref, state, non_terminal, due_at, sealed) VALUES (?, ?, ?, ?, ?, ?, 0)',
    ).run(
      transition.recordId,
      payload.profileId,
      payload.subjectRef,
      'open',
      meta.nonTerminal ? 1 : 0,
      meta.dueAt ?? null,
    );
    this.insertTransition(transition);
    return { appended: true, seq: transition.seq, transitionDigest: digest };
  }

  /** Check order mirrors `store/memory.ts` exactly: state CAS, C4, C3, C2, then insert. */
  private appendSubsequent(
    expectedCurrentState: RecordState,
    transition: Transition,
    meta: AppendMeta,
  ): AppendResult {
    const row = this.recordRow(transition.recordId);
    if (row === undefined || row.state !== expectedCurrentState) {
      return { appended: false, conflict: 'state-mismatch' };
    }
    if (row.sealed === 1) {
      // C4 seal-finality (SPEC §12): same terminal-state-mismatch shape as C3.
      return { appended: false, conflict: 'state-mismatch' };
    }
    if (
      row.non_terminal === 0 &&
      isStateLeaving(transition.kind) &&
      !isCompromiseCarveOut(transition, expectedCurrentState)
    ) {
      return { appended: false, conflict: 'state-mismatch' };
    }
    if (transition.seq !== this.maxSeq(transition.recordId) + 1) {
      return { appended: false, conflict: 'seq' };
    }
    const digest = transitionDigest(transition);
    this.insertTransition(transition);
    const nextState = stateOf(transition.kind);
    this.stmt(
      'UPDATE records SET state = ?, non_terminal = ?, due_at = ?, sealed = ? WHERE id = ?',
    ).run(
      nextState ?? row.state,
      meta.nonTerminal ? 1 : 0,
      meta.dueAt ?? null,
      row.sealed === 1 || transition.kind === 'sealed' ? 1 : 0,
      transition.recordId,
    );
    return { appended: true, seq: transition.seq, transitionDigest: digest };
  }

  async appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
    tx?: DatabaseSync,
  ): Promise<BatchResult> {
    if (tx !== undefined) {
      // Validate a supplied tx BEFORE the empty-batch check, to match `store/memory.ts`'s
      // `appendBatch` order (`MemoryStore.rejectTx` runs first there) — a caller-error
      // precedence should not depend on which backing is behind the interface.
      this.validateTx(tx);
    }
    const first = transitions[0];
    if (first === undefined) {
      throw new Error(
        'appendBatch: empty batch — a batch that appends nothing has no honest result to ' +
          'report, and is a caller error rather than a domain outcome',
      );
    }
    return this.inTransaction(tx, () => {
      const row = this.recordRow(first.recordId);
      if (row === undefined || row.state !== expectedCurrentState) {
        return { appended: false, conflict: 'state-mismatch', index: 0 };
      }
      if (row.sealed === 1) {
        // C4 is an ENTRY-level failure (SPEC §12: "report element index 0").
        return { appended: false, conflict: 'state-mismatch', index: 0 };
      }
      const entryNonTerminal = row.non_terminal === 1;

      let state: RecordState = row.state;
      let seq = this.maxSeq(first.recordId);
      const digests: Digest[] = [];
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

      for (const t of transitions) {
        this.insertTransition(t);
      }
      this.stmt(
        'UPDATE records SET state = ?, non_terminal = ?, due_at = ?, sealed = ? WHERE id = ?',
      ).run(
        state,
        meta.nonTerminal ? 1 : 0,
        meta.dueAt ?? null,
        transitions.some((t) => t.kind === 'sealed') ? 1 : 0,
        first.recordId,
      );
      return { appended: true, transitionDigests: digests };
    });
  }

  async readChain(recordId: string): Promise<Transition[]> {
    const rows = this.stmt(
      'SELECT transition_json FROM transitions WHERE record_id = ? ORDER BY seq',
    ).all(recordId) as { transition_json: string }[];
    // Fresh values (SPEC §12): every call parses a new object graph from text.
    return rows.map((r) => JSON.parse(r.transition_json) as Transition);
  }

  async chainHead(recordId: string): Promise<Digest | null> {
    const row = this.stmt(
      'SELECT transition_json FROM transitions WHERE record_id = ? ORDER BY seq DESC LIMIT 1',
    ).get(recordId) as { transition_json: string } | undefined;
    if (row === undefined) return null;
    return transitionDigest(JSON.parse(row.transition_json) as Transition);
  }

  async listDue(now: Date): Promise<string[]> {
    // SPEC §12's gate verbatim: `dueAt ≠ null AND dueAt ≤ now`, no state predicate.
    // SQLite compares TEXT lexicographically, not numerically — the string `<=` below is
    // correct ONLY because `AppendMeta.dueAt` (store.ts) is constrained to
    // `Date.prototype.toISOString()`'s exact grammar (`YYYY-MM-DDTHH:mm:ss.sssZ`): fixed
    // 'Z', always-present millisecond precision, constant length, so lexicographic order
    // IS chronological order. A second-precision RFC3339 string ('…T12:00:00Z') would
    // diverge under this comparison; nothing here produces one. No ordering of the
    // returned ids is promised.
    const rows = this.stmt('SELECT id FROM records WHERE due_at IS NOT NULL AND due_at <= ?').all(
      now.toISOString(),
    ) as { id: string }[];
    return rows.map((r) => r.id);
  }

  async findNonTerminal(profileId: string, subjectRef: string): Promise<string | null> {
    return this.liveNonTerminalId(profileId, subjectRef);
  }
}
