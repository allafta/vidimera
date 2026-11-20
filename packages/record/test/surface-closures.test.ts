// @vidimera/record — test/surface-closures.test.ts: each handle carries its own frozen
// function objects. The agent and operator handles used to share the kernel's read closures
// (`getRecord`, `readChain`, `chainHead`) as the same, unfrozen function objects. Code holding
// only the agent handle could then plant an own `bind`, `call` or `apply` on one of them, and
// operator-side code that wrote `operator.getRecord.bind(operator)` ran the agent's function
// with the operator handle as its argument — enough to decide records. Freezing the handle
// object did not freeze the functions on it. Now every function on both handles is a fresh
// closure per handle, frozen, so nothing on the agent handle is reachable from the operator
// handle and nothing can be planted on either. Patching a shared primordial
// (`Function.prototype.bind` itself) stays outside this, as SPEC §9 says: the split is
// in-process object-capability discipline, not a sandbox.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create } from '../src/create.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const READS = ['getRecord', 'readChain', 'chainHead'] as const;

function handles() {
  return create(makeConfig([captureProfile()]));
}

test('the agent and operator handles share no function object', () => {
  const { agent, operator } = handles();
  for (const name of READS) {
    assert.notEqual(agent[name], operator[name], `${name} is a distinct function per handle`);
  }
  const agentFns = new Set(Object.values(agent));
  for (const [name, fn] of Object.entries(operator)) {
    assert.ok(!agentFns.has(fn), `operator.${name} is not also on the agent handle`);
  }
});

test('every function on both handles is frozen', () => {
  const { agent, operator } = handles();
  for (const [name, fn] of [...Object.entries(agent), ...Object.entries(operator)]) {
    assert.equal(typeof fn, 'function', `${name} is a function`);
    assert.ok(Object.isFrozen(fn), `${name} is frozen`);
  }
});

test('two instances share no function object either', () => {
  const a = handles();
  const b = handles();
  for (const name of READS) {
    assert.notEqual(a.agent[name], b.agent[name]);
    assert.notEqual(a.operator[name], b.operator[name]);
  }
});

test("an agent cannot plant bind, call or apply on its reads, and the operator's .bind(operator) reads the real record", async () => {
  const { agent, operator } = handles();
  const recordId = await openRecord(
    { agent, operator },
    CONTENT,
    'test.capture.v1',
    DEFAULT_SUBJECT_REF,
  );
  let captured: unknown;
  for (const name of READS) {
    for (const method of ['bind', 'call', 'apply'] as const) {
      assert.throws(
        () =>
          Object.defineProperty(agent[name], method, {
            value: (thisArg: unknown) => {
              captured = thisArg;
              return () => Promise.resolve(null);
            },
          }),
        TypeError,
        `agent.${name}.${method} cannot be planted`,
      );
    }
  }
  const record = await operator.getRecord.bind(operator)(recordId);
  assert.notEqual(record, null, 'the real record is read');
  assert.deepEqual(record, await operator.getRecord(recordId));
  const head = await operator.chainHead.call(operator, recordId);
  assert.equal(head, await operator.chainHead(recordId));
  assert.equal(captured, undefined, 'no planted function ever received the operator handle');
  const fin = await operator.finalize.bind(operator)(recordId, identity(), CONTENT, facts());
  assert.equal(fin.status, 'ok', 'the bound operator calls behave as before');
});

test('the per-handle reads answer exactly as the kernel does', async () => {
  const { agent, operator } = handles();
  const recordId = await openRecord(
    { agent, operator },
    CONTENT,
    'test.capture.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.deepEqual(await agent.getRecord(recordId), await operator.getRecord(recordId));
  assert.deepEqual(await agent.readChain(recordId), await operator.readChain(recordId));
  assert.equal(await agent.chainHead(recordId), await operator.chainHead(recordId));
  assert.equal(await agent.getRecord('no-such-record'), null);
});
