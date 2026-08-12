// @vidimera/record — sqlite-store-conformance.test.ts: the embedded backing's conformance
// proof — one call, the same suite MemoryStore answers. An in-memory SQLite database per
// test keeps the suite's fresh-store-per-test contract without filesystem litter; the
// file-backed durability pin lives in sqlite-store.test.ts, backing-specific.

import { SqliteStore } from '../src/store/sqlite.js';
import { runStoreConformance } from './conformance/store-conformance.js';

runStoreConformance('SqliteStore (:memory:)', () => new SqliteStore(':memory:'));
