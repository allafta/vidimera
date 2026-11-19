// @vidimera/record — sqlite-store-conformance.test.ts: the embedded backing's conformance
// proof — one call, the same suite MemoryStore answers. An in-memory SQLite database per
// test keeps the suite's fresh-store-per-test contract without filesystem litter; the
// file-backed durability pin lives in sqlite-store.test.ts, backing-specific.
//
// The host transaction is the store's own connection carrying an open transaction — this
// backing's enlistment surface (`SqliteStore.database`): the host owns BEGIN and its end.

import { SqliteStore } from '../src/store/sqlite.js';
import { runStoreConformance } from './conformance/store-conformance.js';

runStoreConformance('SqliteStore (:memory:)', () => new SqliteStore(':memory:'), {
  begin: async (store) => {
    store.database.exec('BEGIN IMMEDIATE');
    return store.database;
  },
  commit: async (store) => {
    store.database.exec('COMMIT');
  },
  rollback: async (store) => {
    store.database.exec('ROLLBACK');
  },
});
