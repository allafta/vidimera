// Shared pg.Pool for the adapter suite. Small max: the embedded server's
// max_connections is finite and the conformance suite creates ~50 stores — stores share
// this pool, isolated by schema, never by connection. The pool is never closed: the
// suite's process ends and the globalSetup teardown stops the server (the conformance
// suite deliberately never closes stores — its factory is synchronous with no teardown).
import pg from 'pg';
import { PostgresStore } from '../../src/postgres-store.js';

function dsn(): string {
  const url = process.env.VIDIMERA_PG_URL;
  if (url === undefined) {
    throw new Error('VIDIMERA_PG_URL unset — the globalSetup did not run or did not start');
  }
  return url;
}

let shared: pg.Pool | undefined;
export function sharedPool(): pg.Pool {
  shared ??= new pg.Pool({ connectionString: dsn(), max: 5 });
  return shared;
}

let n = 0;
export function nextSchemaName(): string {
  n += 1;
  return `s${process.pid}_${n}`;
}

export function newStore(): PostgresStore {
  return new PostgresStore(sharedPool(), { schema: nextSchemaName() });
}
