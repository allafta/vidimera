// first-use.mjs — the clean-runner first-use proof (the first-use-proof increment; the
// release checklist's first precondition). This file is CONSUMER code: it is shipped inside
// the workflow artifact and run in a scratch project that installed `@vidimera/record` and
// `@vidimera/store-postgres` from tarballs or from the registry, on a runner that never
// checked this repository out. Everything it imports resolves through the packages' exports
// maps or fails. It is the getting-started flow in substance — stage → open → review →
// finalize → confirmed, the offline and handle-form audit reads, the refused half, the
// ./probes subpath — and the same confirm loop over a real PostgreSQL server the consumer
// owns. What it does NOT prove: that the guide's prose reads right (a human's judgment), or
// anything about the probe tier's verdicts (running probes needs a host-declared driver).
//
// Exit 0 with one summary line on success; the first failed assertion exits non-zero.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { create, MemoryStore, replay, verifyChain } from '@vidimera/record';
import { ALL_PROBES, assertSatisfied, runProbes } from '@vidimera/record/probes';
import { PostgresStore } from '@vidimera/store-postgres';
import pg from 'pg';

const source = process.env.FIRST_USE_SOURCE ?? 'unknown';

const profile = {
  id: 'finance.invoice-approval.v1',
  subject: { canonicalizerRef: 'finance.invoice.v1' },
  legs: [{ id: 'approver-decide', allowedAuthorities: ['session:ap-console'] }],
  captureMode: 'staged',
  expiry: { ttl: 3600 },
};
const canonicalizers = { 'finance.invoice.v1': (content) => content };
const content = { invoiceId: 'INV-1042', payee: 'Acme AB', amount: 41250, currency: 'SEK' };
const alice = { principal: 'user:alice', authority: 'session:ap-console' };
const facts = {
  figures: { amountShown: '41 250,00', currencyShown: 'SEK' },
  checker: { principal: 'svc:review-surface', authority: 'mtls:review-surface' },
};

/** The getting-started flow, in substance, over whichever store is handed in. */
async function confirmLoop(store, subjectRef) {
  const { agent, operator } = create({ profiles: [profile], store, canonicalizers });
  const staged = await agent.stage(content, profile.id, subjectRef);
  assert.equal(staged.status, 'ok', 'stage');
  const opened = await operator.open(staged.value.stagedRef);
  assert.equal(opened.status, 'ok', 'open');
  const recordId = opened.value.recordId;
  const view = await operator.review(recordId);
  assert.equal(view.status, 'ok', 'review');
  assert.equal(view.value.state, 'open');
  const decided = await operator.finalize(recordId, alice, content, facts);
  assert.equal(decided.status, 'ok', 'finalize');
  assert.equal(decided.value.state, 'confirmed');

  const chain = await operator.readChain(recordId);
  assert.equal(verifyChain(chain).intact, true, 'offline verifyChain');
  assert.equal(replay(chain).state, 'confirmed', 'offline replay');
  assert.equal((await operator.verifyChain(recordId)).intact, true, 'handle verifyChain');
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'consultation-recorded', 'consultation-recorded', 'confirmed'],
    'the four transitions the guide shows',
  );
  return { operator, recordId, chain };
}

// --- the record half: MemoryStore -------------------------------------------------------
const memory = await confirmLoop(new MemoryStore(), 'invoice:INV-1042');

// The refused half: a wrong-authority identity is RETURNED as a refusal, never thrown.
{
  const { agent, operator } = create({
    profiles: [profile],
    store: new MemoryStore(),
    canonicalizers,
  });
  const staged = await agent.stage(content, profile.id, 'invoice:INV-1043');
  const opened = await operator.open(staged.value.stagedRef);
  assert.equal(opened.status, 'ok');
  const refused = await operator.finalize(
    opened.value.recordId,
    { principal: 'user:mallory', authority: 'session:someone-else' },
    content,
    facts,
  );
  assert.equal(refused.status, 'refused', 'a wrong authority refuses');
  assert.equal(refused.code, 'identity-authority-refused');
  assert.equal(refused.class, 'refusal');
}

// The ./probes subpath: the tier is reachable; running it needs a host driver (not here).
assert.ok(ALL_PROBES.length > 0, 'the ./probes subpath resolves and carries probes');
assert.equal(typeof runProbes, 'function');
assert.equal(typeof assertSatisfied, 'function');

// --- the adapter: peer range, then a REAL confirm loop when a server is given ----------
const adapterManifest = JSON.parse(
  readFileSync('./node_modules/@vidimera/store-postgres/package.json', 'utf8'),
);
const peerRange = adapterManifest.peerDependencies['@vidimera/record'];
assert.ok(
  !peerRange.startsWith('workspace:'),
  `adapter peer range must be a concrete range, got: ${peerRange}`,
);

let postgresNote = 'postgres half SKIPPED (no VIDIMERA_PG_URL)';
if (process.env.VIDIMERA_PG_URL) {
  const pool = new pg.Pool({ connectionString: process.env.VIDIMERA_PG_URL });
  try {
    const store = new PostgresStore(pool, { schema: 'first_use' });
    const pgRun = await confirmLoop(store, 'invoice:INV-2042');
    postgresNote = `postgres half OK (${pgRun.chain.length} transitions, confirmed + intact)`;
  } finally {
    await pool.end();
  }
} else {
  console.error('first-use: NOTE — VIDIMERA_PG_URL not set; the PostgreSQL half did not run');
}

console.log(
  `first-use: OK - source=${source}; memory: ${memory.chain.length} transitions, confirmed + intact; ` +
    `${ALL_PROBES.length} probes visible through ./probes; adapter peer range ${peerRange}; ${postgresNote}`,
);
