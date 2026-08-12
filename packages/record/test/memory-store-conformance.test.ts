// @vidimera/record — memory-store-conformance.test.ts: the in-memory backing's conformance
// proof — one call. The suite itself (and the inventory of what it pins) lives in
// conformance/store-conformance.ts; MemoryStore-specific pins stay in store-constraints.test.ts
// and store-batch.test.ts.

import { MemoryStore } from '../src/store/memory.js';
import { runStoreConformance } from './conformance/store-conformance.js';

runStoreConformance('MemoryStore', () => new MemoryStore());
