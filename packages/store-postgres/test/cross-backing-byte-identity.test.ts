// The third byte-identity leg deferral-register row 15 names: the same scripted flows,
// under the same fixed clock/id/token knobs, produce chains byte-identical between
// MemoryStore and PostgresStore. With Memory ↔ Sqlite already pinned in record's own
// test, identity is transitive across all three backings.
import { test } from 'vitest';
import { MemoryStore } from '../../record/src/store/memory.js';
import {
  assertByteIdentical,
  happyFlow,
  refusalFlow,
  tokenFlow,
} from '../../record/test/helpers/byte-identity-flows.js';
import { newStore } from './helpers/pg.js';

test('the happy path produces byte-identical chains: Memory and Postgres', async () => {
  const memory = await happyFlow(new MemoryStore());
  const postgres = await happyFlow(newStore());
  assertByteIdentical(memory, postgres, 'happy path');
});

test('a terminal refusal produces byte-identical chains: Memory and Postgres', async () => {
  const memory = await refusalFlow(new MemoryStore());
  const postgres = await refusalFlow(newStore());
  assertByteIdentical(memory, postgres, 'refusal path');
});

test('the token shape produces byte-identical chains: Memory and Postgres (fixed token via the internal seam)', async () => {
  const memory = await tokenFlow(new MemoryStore());
  const postgres = await tokenFlow(newStore());
  assertByteIdentical(memory, postgres, 'token path');
});
