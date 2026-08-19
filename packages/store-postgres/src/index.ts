// @vidimera/store-postgres — public entry point: the server-SQL third reference backing
// (SPEC §12), multi-connection-safe over a caller-owned pg.Pool. Connection custody is
// the host's: the store never creates or closes the pool.

export type { PostgresStoreOptions } from './postgres-store.js';
export { PostgresStore } from './postgres-store.js';
