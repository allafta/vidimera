// @vidimera/store-postgres — the server-SQL `Store`: SPEC §12's "a server-SQL store
// (production, multi-connection-safe)", on a caller-owned `pg.Pool`. Connection custody
// is the host's: the store never creates or closes the pool.
//
// The port is arm-for-arm from record's store/sqlite.ts — every check keeps its order
// and its conflict shape — with the concurrency made real: sqlite gets serialization
// free from BEGIN IMMEDIATE on one connection, while here every append locks its record
// row (SELECT … FOR UPDATE) so the compare-and-swap, the C3/C4 arms, and the
// server-verified seq all read state no concurrent writer can move underneath them. The
// genesis path — where there is no row to lock — serializes per (profile, subject) on a
// transaction-scoped advisory lock, so the C1 blocker SELECT and the insert are
// race-free without ever tripping the unique index inside a host's enlisted
// transaction; the partial unique index stays the durable backstop.
//
// The schema is an implementation artifact — SPEC §12: "A persisted schema is an
// **implementation artifact, not a public query API**". The persisted `state`/
// `non_terminal`/`due_at`/`sealed` columns are constraint-and-index only: replay over
// the chain stays the sole authoritative derivation.
//
// Payload posture, BACKING-SPECIFIC by design (the conformance suite deliberately does
// not bind it): transitions persist as `JSON.stringify` text — `text`, never `jsonb`,
// because jsonb normalizes key order and number forms and the cross-backing
// byte-identity proof is about the stored transition bytes replaying identically. The
// JCS-invisible-member round-trip behavior is therefore exactly SqliteStore's.

import type {
  AppendMeta,
  AppendResult,
  BatchResult,
  Digest,
  GenesisPayload,
  RecordState,
  StagedDraft,
  Store,
  Transition,
} from '@vidimera/record';
import { isCompromiseCarveOut, isStateLeaving, stateOf, transitionDigest } from '@vidimera/record';
import type pg from 'pg';

export interface PostgresStoreOptions {
  /** The Postgres schema this store owns. Created lazily on first use; one store, one
   * schema — isolation between stores is by schema, never by connection. */
  schema: string;
}

/** The subset of a pg client this store needs — Pool and Client both satisfy it. */
interface Queryable {
  query(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: Record<string, unknown>[]; rowCount?: number | null }>;
}

interface RecordRow {
  id: string;
  state: RecordState;
  non_terminal: boolean;
  sealed: boolean;
}

// Identifiers are interpolated into SQL (DDL and table references cannot be
// parameterized), so the schema name is constrained instead of escaped.
const SCHEMA_NAME = /^[a-z_][a-z0-9_]*$/;

/**
 * The provisional server-SQL `Store`. Same public marking as `MemoryStore`/`SqliteStore`:
 * PUBLIC BUT EXPLICITLY UNSTABLE PRE-1.0 (SPEC §12's provisionality clause).
 */
export class PostgresStore implements Store {
  readonly #pool: pg.Pool;
  readonly #schema: string;
  #ready: Promise<void> | undefined;

  constructor(pool: pg.Pool, options: PostgresStoreOptions) {
    if (!SCHEMA_NAME.test(options.schema)) {
      throw new Error(
        `PostgresStore: schema name '${options.schema}' must match ${String(SCHEMA_NAME)} — ` +
          'identifiers are interpolated, so the name is constrained instead of escaped',
      );
    }
    this.#pool = pool;
    this.#schema = options.schema;
  }

  /** Schema-qualified, quoted table reference. */
  #t(name: string): string {
    return `"${this.#schema}"."${name}"`;
  }

  /** Lazy DDL behind a memoized promise — construction stays synchronous (the
   * conformance suite's `() => Store` factory), and every public method awaits this.
   * A REJECTED run resets the memo before surfacing the original error, so a transient
   * failure (the database still coming up, a network blip) fails that one call loudly
   * and the next call retries — a cached rejection would brick the instance for its
   * lifetime, against the backing's own production posture. */
  #ensureReady(): Promise<void> {
    this.#ready ??= this.#runDdl().catch((err) => {
      this.#ready = undefined;
      throw err;
    });
    return this.#ready;
  }

  /** The DDL runs on ONE checked-out client, inside a transaction that first takes a
   * transaction-scoped advisory lock keyed by the schema name: `CREATE … IF NOT EXISTS`
   * alone races on the catalog when two processes bootstrap one schema at once (the loser
   * can see a unique violation despite the IF NOT EXISTS); behind the lock the bootstraps
   * serialize and the loser finds the objects present. The lock's salt differs from the
   * genesis path's, so the two families never contend with each other. */
  async #runDdl(): Promise<void> {
    await this.#withPooledTx(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 7))', [
        JSON.stringify(['ddl', this.#schema]),
      ]);
      // One simple-protocol query for every CREATE — unparameterized, so the multi-statement
      // form is legal, and the schema rides in the same round-trip as its tables.
      await client.query(`
        CREATE SCHEMA IF NOT EXISTS "${this.#schema}";
        CREATE TABLE IF NOT EXISTS ${this.#t('staged')} (
          id         text PRIMARY KEY,
          draft_json text NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ${this.#t('records')} (
          id           text PRIMARY KEY,
          profile_id   text NOT NULL,
          subject_ref  text NOT NULL,
          state        text NOT NULL,
          non_terminal boolean NOT NULL,
          due_at       text,
          sealed       boolean NOT NULL DEFAULT false
        );
        CREATE UNIQUE INDEX IF NOT EXISTS records_c1_exclusivity
          ON ${this.#t('records')} (profile_id, subject_ref) WHERE non_terminal;
        CREATE TABLE IF NOT EXISTS ${this.#t('transitions')} (
          record_id       text NOT NULL,
          seq             integer NOT NULL,
          transition_json text NOT NULL,
          PRIMARY KEY (record_id, seq)
        );
      `);
    });
  }

  /**
   * The one pooled-transaction primitive: check out a client, BEGIN, run `body`, COMMIT;
   * on failure ROLLBACK and surface the ORIGINAL error. A client whose ROLLBACK itself
   * failed may be sitting in an aborted transaction, so it is released WITH that error —
   * pg destroys such a client rather than handing it to the next borrower, whose first
   * statement would otherwise fail with "current transaction is aborted". Shared by the
   * no-tx write path (`#inTransaction`) and the DDL bootstrap (`#runDdl`), which is why it
   * carries no readiness gate of its own.
   */
  async #withPooledTx<T>(body: (c: Queryable) => Promise<T>): Promise<T> {
    const client = await this.#pool.connect();
    let poisoned: Error | undefined;
    try {
      await client.query('BEGIN');
      const result = await body(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        poisoned = rollbackErr instanceof Error ? rollbackErr : new Error(String(rollbackErr));
      }
      throw err;
    } finally {
      if (poisoned === undefined) client.release();
      else client.release(poisoned);
    }
  }

  /**
   * The enlistment surface (SPEC §12: tx is "the driver's own transaction handle" —
   * here a pg client whose transaction the caller owns). Two loud caller errors, the
   * SqliteStore posture: a non-client object, and a client with no open transaction.
   * The open-transaction probe is a SAVEPOINT round-trip — outside a transaction block
   * Postgres refuses SAVEPOINT outright, which is the one deterministic, public-SQL
   * signal; inside one it is a harmless no-op pair. One honest bound, stated plainly:
   * pg's public API cannot prove the client came from THIS store's pool universe, so
   * the same-connection custody SqliteStore can enforce is here the caller's own
   * discipline.
   */
  async #validateTx(tx: unknown): Promise<Queryable> {
    if (
      tx === null ||
      typeof tx !== 'object' ||
      typeof (tx as { query?: unknown }).query !== 'function'
    ) {
      throw new Error(
        "PostgresStore: tx is not a pg client — enlistment takes the driver's own handle " +
          '(SPEC §12: adapter-generic, "the driver\'s own transaction handle")',
      );
    }
    const client = tx as Queryable;
    try {
      await client.query('SAVEPOINT vidimera_tx_probe');
      await client.query('RELEASE SAVEPOINT vidimera_tx_probe');
    } catch {
      throw new Error(
        'PostgresStore: tx has no open transaction — the caller owns BEGIN/COMMIT (SPEC §12: ' +
          '"The transaction boundary is never hidden from the caller")',
      );
    }
    return client;
  }

  /** Enlisted (SPEC §12: "enlisted in that transaction and commits or rolls back with
   * it") — the body runs on the caller's open transaction with NO BEGIN/COMMIT/ROLLBACK
   * of our own; or, with no tx, inside our own transaction on a pooled client. */
  async #inTransaction<T>(tx: unknown, body: (c: Queryable) => Promise<T>): Promise<T> {
    await this.#ensureReady();
    if (tx !== undefined) {
      const client = await this.#validateTx(tx);
      return body(client);
    }
    return this.#withPooledTx(body);
  }

  /** The record-row read every append gates on — locked (FOR UPDATE) so a concurrent
   * writer cannot move state, seq, or flags between this read and the write. */
  async #recordRowForUpdate(c: Queryable, recordId: string): Promise<RecordRow | undefined> {
    const { rows } = await c.query(
      `SELECT id, state, non_terminal, sealed FROM ${this.#t('records')} WHERE id = $1 FOR UPDATE`,
      [recordId],
    );
    return rows[0] as RecordRow | undefined;
  }

  async #maxSeq(c: Queryable, recordId: string): Promise<number> {
    const { rows } = await c.query(
      `SELECT COALESCE(MAX(seq), 0) AS m FROM ${this.#t('transitions')} WHERE record_id = $1`,
      [recordId],
    );
    return Number((rows[0] as { m: number | string }).m);
  }

  /** The C1 scan — shared by the genesis rejection path and `findNonTerminal`, the same
   * one-predicate discipline the other backings use (SPEC §12: "the same record
   * `findNonTerminal` returns"). */
  async #liveNonTerminalId(
    c: Queryable,
    profileId: string,
    subjectRef: string,
  ): Promise<string | null> {
    const { rows } = await c.query(
      `SELECT id FROM ${this.#t('records')} WHERE profile_id = $1 AND subject_ref = $2 AND non_terminal`,
      [profileId, subjectRef],
    );
    const row = rows[0] as { id: string } | undefined;
    return row?.id ?? null;
  }

  async #insertTransition(c: Queryable, t: Transition): Promise<void> {
    await c.query(
      `INSERT INTO ${this.#t('transitions')} (record_id, seq, transition_json) VALUES ($1, $2, $3)`,
      [t.recordId, t.seq, JSON.stringify(t)],
    );
  }

  async putStaged(staged: StagedDraft, tx?: unknown): Promise<void> {
    // Idempotent, first-write-wins (SPEC §12) — literally ON CONFLICT DO NOTHING.
    await this.#inTransaction(tx, async (c) => {
      await c.query(
        `INSERT INTO ${this.#t('staged')} (id, draft_json) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [staged.id, JSON.stringify(staged)],
      );
    });
  }

  async getStaged(stagedRef: string): Promise<StagedDraft | null> {
    await this.#ensureReady();
    const { rows } = await this.#pool.query(
      `SELECT draft_json FROM ${this.#t('staged')} WHERE id = $1`,
      [stagedRef],
    );
    const row = rows[0] as { draft_json: string } | undefined;
    // Fresh value (SPEC §12): parsing from text mints a new object graph per call.
    return row === undefined ? null : (JSON.parse(row.draft_json) as StagedDraft);
  }

  async appendTransition(
    expectedCurrentState: RecordState | null,
    transition: Transition,
    meta: AppendMeta,
    tx?: unknown,
  ): Promise<AppendResult> {
    return this.#inTransaction(tx, async (c) => {
      if (expectedCurrentState === null) {
        return this.#appendGenesis(c, transition, meta);
      }
      return this.#appendSubsequent(c, expectedCurrentState, transition, meta);
    });
  }

  /** Check order mirrors the other backings exactly: state CAS, C1, C2, then the
   * insert. There is no record row to lock yet, so concurrent genesis appends for one
   * (profile, subject) serialize on a transaction-scoped advisory lock — making the
   * blocker SELECT and the insert one atomic step without ever tripping the C1 index
   * inside a caller's enlisted transaction. The partial unique index (and the records
   * PK) remain the durable backstop underneath. */
  async #appendGenesis(
    c: Queryable,
    transition: Transition,
    meta: AppendMeta,
  ): Promise<AppendResult> {
    const payload = transition.payload as GenesisPayload;
    // The lock key is JSON-encoded: ids may legally contain characters a Postgres text
    // parameter cannot carry raw (a NUL, say); stringify escapes them to ASCII, and the
    // array form keeps the three parts unambiguous.
    await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 42))', [
      JSON.stringify([this.#schema, payload.profileId, payload.subjectRef]),
    ]);
    const existing = await this.#recordRowForUpdate(c, transition.recordId);
    if (existing !== undefined) {
      return { appended: false, conflict: 'state-mismatch' };
    }
    const blockingRecordId = await this.#liveNonTerminalId(
      c,
      payload.profileId,
      payload.subjectRef,
    );
    if (blockingRecordId !== null) {
      return { appended: false, conflict: 'exclusivity', blockingRecordId };
    }
    if (transition.seq !== 1) {
      return { appended: false, conflict: 'seq' };
    }
    const digest = transitionDigest(transition);
    // ON CONFLICT (id) DO NOTHING closes the one race the advisory lock does not cover:
    // two concurrent geneses sharing a recordId but NOT a (profile, subject) pair take
    // different pair locks, and FOR UPDATE locks nothing when no row exists — so the
    // loser must land on the records PK as the contract's state-mismatch conflict, never
    // as a thrown constraint violation (the shape SqliteStore's single-connection
    // serialization returns for the same interleaving).
    const inserted = await c.query(
      `INSERT INTO ${this.#t('records')} (id, profile_id, subject_ref, state, non_terminal, due_at, sealed)
       VALUES ($1, $2, $3, 'open', $4, $5, false)
       ON CONFLICT (id) DO NOTHING`,
      [
        transition.recordId,
        payload.profileId,
        payload.subjectRef,
        meta.nonTerminal,
        meta.dueAt ?? null,
      ],
    );
    if (inserted.rowCount === 0) {
      return { appended: false, conflict: 'state-mismatch' };
    }
    await this.#insertTransition(c, transition);
    return { appended: true, seq: transition.seq, transitionDigest: digest };
  }

  /** Check order mirrors the other backings exactly: state CAS, C4, C3, C2, then
   * insert — all behind the FOR UPDATE row lock taken by the first read. */
  async #appendSubsequent(
    c: Queryable,
    expectedCurrentState: RecordState,
    transition: Transition,
    meta: AppendMeta,
  ): Promise<AppendResult> {
    const row = await this.#recordRowForUpdate(c, transition.recordId);
    if (row === undefined || row.state !== expectedCurrentState) {
      return { appended: false, conflict: 'state-mismatch' };
    }
    if (row.sealed) {
      // C4 seal-finality (SPEC §12): same terminal-state-mismatch shape as C3.
      return { appended: false, conflict: 'state-mismatch' };
    }
    if (
      !row.non_terminal &&
      isStateLeaving(transition.kind) &&
      !isCompromiseCarveOut(transition, expectedCurrentState)
    ) {
      return { appended: false, conflict: 'state-mismatch' };
    }
    if (transition.seq !== (await this.#maxSeq(c, transition.recordId)) + 1) {
      return { appended: false, conflict: 'seq' };
    }
    const digest = transitionDigest(transition);
    await this.#insertTransition(c, transition);
    const nextState = stateOf(transition.kind);
    await c.query(
      `UPDATE ${this.#t('records')} SET state = $1, non_terminal = $2, due_at = $3, sealed = $4 WHERE id = $5`,
      [
        nextState ?? row.state,
        meta.nonTerminal,
        meta.dueAt ?? null,
        row.sealed || transition.kind === 'sealed',
        transition.recordId,
      ],
    );
    return { appended: true, seq: transition.seq, transitionDigest: digest };
  }

  async appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
    tx?: unknown,
  ): Promise<BatchResult> {
    if (tx !== undefined) {
      // Validate a supplied tx BEFORE the empty-batch check, to match the other
      // backings' order — a caller-error precedence should not depend on which backing
      // is behind the interface.
      await this.#ensureReady();
      await this.#validateTx(tx);
    }
    const first = transitions[0];
    if (first === undefined) {
      throw new Error(
        'appendBatch: empty batch — a batch that appends nothing has no honest result to ' +
          'report, and is a caller error rather than a domain outcome',
      );
    }
    return this.#inTransaction(tx, async (c) => {
      const row = await this.#recordRowForUpdate(c, first.recordId);
      if (row === undefined || row.state !== expectedCurrentState) {
        return { appended: false, conflict: 'state-mismatch', index: 0 };
      }
      if (row.sealed) {
        // C4 is an ENTRY-level failure (SPEC §12: "report element index 0").
        return { appended: false, conflict: 'state-mismatch', index: 0 };
      }
      const entryNonTerminal = row.non_terminal;

      let state: RecordState = row.state;
      let seq = await this.#maxSeq(c, first.recordId);
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
        await this.#insertTransition(c, t);
      }
      await c.query(
        `UPDATE ${this.#t('records')} SET state = $1, non_terminal = $2, due_at = $3, sealed = $4 WHERE id = $5`,
        [
          state,
          meta.nonTerminal,
          meta.dueAt ?? null,
          transitions.some((t) => t.kind === 'sealed'),
          first.recordId,
        ],
      );
      return { appended: true, transitionDigests: digests };
    });
  }

  async readChain(recordId: string): Promise<Transition[]> {
    await this.#ensureReady();
    const { rows } = await this.#pool.query(
      `SELECT transition_json FROM ${this.#t('transitions')} WHERE record_id = $1 ORDER BY seq`,
      [recordId],
    );
    // Fresh values (SPEC §12): every call parses a new object graph from text.
    return rows.map((r) => JSON.parse((r as { transition_json: string }).transition_json));
  }

  async chainHead(recordId: string): Promise<Digest | null> {
    await this.#ensureReady();
    const { rows } = await this.#pool.query(
      `SELECT transition_json FROM ${this.#t('transitions')} WHERE record_id = $1 ORDER BY seq DESC LIMIT 1`,
      [recordId],
    );
    const row = rows[0] as { transition_json: string } | undefined;
    if (row === undefined) return null;
    return transitionDigest(JSON.parse(row.transition_json) as Transition);
  }

  async listDue(now: Date): Promise<string[]> {
    // SPEC §12's gate verbatim: `dueAt ≠ null AND dueAt ≤ now`, no state predicate. The
    // text `<=` is correct only because `AppendMeta.dueAt` is constrained to
    // `Date.prototype.toISOString()`'s exact grammar (fixed length, fixed 'Z',
    // always-present milliseconds), under which lexicographic order IS chronological
    // order — the same argument SqliteStore's listDue carries. No ordering of the
    // returned ids is promised.
    await this.#ensureReady();
    const { rows } = await this.#pool.query(
      `SELECT id FROM ${this.#t('records')} WHERE due_at IS NOT NULL AND due_at <= $1`,
      [now.toISOString()],
    );
    return rows.map((r) => (r as { id: string }).id);
  }

  async findNonTerminal(profileId: string, subjectRef: string): Promise<string | null> {
    await this.#ensureReady();
    return this.#liveNonTerminalId(this.#pool, profileId, subjectRef);
  }
}
