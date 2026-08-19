// The one caller file deferral-register row 15 names: the backing-parameterized
// conformance suite runs unchanged over PostgresStore. A fresh Postgres schema per
// factory call is what "fresh, empty store" means for a server backing — the factory
// stays synchronous (the suite's own signature) because construction is lazy: DDL runs
// behind a memoized promise on first use.
import { runStoreConformance } from '../../record/test/conformance/store-conformance.js';
import { newStore } from './helpers/pg.js';

runStoreConformance('PostgresStore (embedded)', () => newStore());
