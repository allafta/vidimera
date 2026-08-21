// @vidimera/record — agent-unreachability.test.ts: the
// object-capability freeze-enumerate-attack. The `agent` handle exposes ONLY
// `stage` + the three pure reads; the record-transitioning calls (`open`/`review`/
// `finalize`/`decline`/`redeem`/`seal`) live SOLELY on `operator`. This is in-process
// discipline, not sandbox confinement (SPEC §9: "in-process object-capability discipline,
// not a sandbox") — asserted here by:
//   (1) the agent handle's own+inherited key set is EXACTLY {stage, getRecord, readChain,
//       chainHead} (no open/review/finalize/redeem anywhere reachable),
//   (2) the handle is FROZEN (mutation attempts throw under ESM strict mode),
//   (3) the transitioning calls are undefined / not callable through the agent handle,
//   (4) the append-count invariant: exercising every agent-reachable method appends NO
//       transition. `stage` is a REAL pre-record `putStaged` — it runs to `ok`
//       and still never calls `appendTransition`, so the invariant is a genuine one.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create } from '../src/create.js';
import { captureProfile, makeConfig } from './helpers/profiles.js';
import { CountingStore } from './helpers/stores.js';

const ALLOWED_AGENT_KEYS = ['chainHead', 'getRecord', 'readChain', 'stage'];
const TRANSITIONING = [
  'open',
  'review',
  'finalize',
  'decline',
  'redeem',
  'beginRedemption',
  'completeRedemption',
  'seal',
  'replay',
  'verifyChain',
  'listDue',
];

function agentHandle() {
  const { agent } = create(makeConfig([captureProfile()]));
  return agent;
}

// === (1) key-set enumeration ==========================================================

// The recorded-human-decline increment added `decline` to the OPERATOR surface only
// (operator-surface.ts) — `captureProfile()` here never declares `decline` on its leg,
// and even a declaring profile's agent handle would still resolve to this SAME frozen
// {stage, getRecord, readChain, chainHead} literal (agent-surface.ts selects a fixed key
// set, never profile-conditional). So the assertion right below already proves `decline`
// absent from the agent handle's own keys — a dedicated `'decline' in agent === false`
// test would be redundant with it; `decline` joins TRANSITIONING above instead, so the
// "no transitioning method reachable" and "calling throws TypeError" loops below name it
// explicitly too. Its presence on the OPERATOR handle is the counterpart pinned in its
// own test right below.
test('agent handle own keys are EXACTLY {stage, getRecord, readChain, chainHead}', () => {
  const agent = agentHandle();
  assert.deepEqual(Object.keys(agent).sort(), ALLOWED_AGENT_KEYS);
});

test('decline lives on the operator handle — the counterpart to its absence from the agent handle above', () => {
  const { operator } = create(makeConfig([captureProfile({ decline: true })]));
  assert.equal('decline' in operator, true);
  assert.equal(typeof (operator as unknown as Record<string, unknown>).decline, 'function');
});

test('agent handle is a plain object (prototype is Object.prototype) — no class instance leaking methods', () => {
  const agent = agentHandle();
  assert.equal(Object.getPrototypeOf(agent), Object.prototype);
});

test('no transitioning method is reachable on the agent handle (own, inherited, or via `in`)', () => {
  const agent = agentHandle() as unknown as Record<string, unknown>;
  for (const name of TRANSITIONING) {
    assert.equal(name in agent, false, `'${name}' must not be reachable on the agent handle`);
    assert.equal(agent[name], undefined, `agent.${name} must be undefined`);
  }
});

// === (2) frozen handle ================================================================

test('agent handle is frozen', () => {
  assert.equal(Object.isFrozen(agentHandle()), true);
});

test('mutating the agent handle throws (cannot reassign an existing method)', () => {
  const agent = agentHandle() as unknown as Record<string, unknown>;
  assert.throws(() => {
    agent.stage = () => Promise.resolve();
  }, TypeError);
});

test('mutating the agent handle throws (cannot ADD a transitioning method)', () => {
  const agent = agentHandle() as unknown as Record<string, unknown>;
  assert.throws(() => {
    agent.open = () => Promise.resolve();
  }, TypeError);
});

// === (3) transitions are not callable via the agent handle ============================

test('attempting a transition through the agent handle is a TypeError (undefined is not a function)', () => {
  const agent = agentHandle() as unknown as Record<string, unknown>;
  for (const name of TRANSITIONING) {
    assert.throws(
      () => (agent[name] as () => unknown)(),
      TypeError,
      `calling agent.${name}() must throw TypeError`,
    );
  }
});

// === (4) append-count invariant =======================================================

test('exercising every agent-reachable method appends NO transition (append-count invariant)', async () => {
  const store = new CountingStore();
  const { agent } = create(makeConfig([captureProfile()], { store }));

  // stage() is a REAL pre-record putStaged now: it returns ok and writes a digest-only
  // staged draft, but never calls appendTransition — so the append count stays 0.
  const staged = await agent.stage({ any: 'content' }, 'test.capture.v1', 'subject:test-1');
  assert.equal(staged.status, 'ok', 'stage() succeeds (pre-record) — it is not a throwing stub');

  // The pure reads against absent records never append either.
  assert.equal(await agent.getRecord('nope'), null);
  assert.deepEqual(await agent.readChain('nope'), []);
  assert.equal(await agent.chainHead('nope'), null);

  assert.equal(store.appendCalls, 0, 'no agent-reachable method may append a transition');
});
