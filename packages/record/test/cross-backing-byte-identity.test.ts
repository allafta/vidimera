// @vidimera/record — cross-backing-byte-identity.test.ts: SPEC §12's cross-backing
// end-to-end — all backings "produce **byte-identical chains** from the same scripted
// flow under a fixed clock". The flows and the byte-level comparison live in
// helpers/byte-identity-flows.ts (extracted verbatim so a third backing's package can
// drive them for its own leg — the store-postgres package does); this file keeps this
// package's own pairwise pins, Memory ↔ Sqlite, assertions unchanged by the extraction.

import { test } from 'vitest';

import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import {
  assertByteIdentical,
  happyFlow,
  refusalFlow,
  tokenFlow,
} from './helpers/byte-identity-flows.js';

test('the happy path produces byte-identical chains over both backings', async () => {
  const memory = await happyFlow(new MemoryStore());
  const sqlite = await happyFlow(new SqliteStore(':memory:'));
  assertByteIdentical(memory, sqlite, 'happy path');
});

test('a terminal refusal produces byte-identical chains over both backings', async () => {
  const memory = await refusalFlow(new MemoryStore());
  const sqlite = await refusalFlow(new SqliteStore(':memory:'));
  assertByteIdentical(memory, sqlite, 'refusal path');
});

test('the token shape produces byte-identical chains over both backings (fixed token via the internal seam)', async () => {
  // The first minted kinds whose payloads exercise the two backings' differing
  // round-trip postures (JSON round-trip vs structuredClone) — exactly where
  // cross-backing encoding drift is likeliest. Determinism needs the THIRD injectable
  // knob (tokenSource) beside the clock and the id minter: tokenDigest sits inside the
  // transition digest, so real randomness would make byte-for-byte comparison
  // impossible.
  const memory = await tokenFlow(new MemoryStore());
  const sqlite = await tokenFlow(new SqliteStore(':memory:'));
  assertByteIdentical(memory, sqlite, 'token path');
});
