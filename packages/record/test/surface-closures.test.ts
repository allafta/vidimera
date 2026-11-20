// @vidimera/record — test/surface-closures.test.ts: each handle carries its own frozen
// function objects. The agent and operator handles used to share the kernel's read closures
// (`getRecord`, `readChain`, `chainHead`) as the same, unfrozen function objects. Code holding
// only the agent handle could then plant an own `bind`, `call` or `apply` on one of them, and
// operator-side code that wrote `operator.getRecord.bind(operator)` ran the agent's function
// with the operator handle as its argument — enough to decide records. Freezing the handle
// object did not freeze the functions on it. Now every function on both handles is a fresh
// closure per handle, frozen, so nothing reachable from the agent handle is the same object as
// anything on the operator handle, and nothing can be planted on either. The limit: every
// function inherits from the realm's shared `Function.prototype`, so in-process agent code that
// patches `Function.prototype.bind` (writable in a default Node realm) still reaches what
// operator code passes to it; the split confines such code only where the host does. SPEC §9:
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
  // The agent tries every plant; each attempt is caught, so against a handle whose functions
  // could be extended the plants land and the operator calls below hand them the operator.
  let captured: unknown;
  const planted: string[] = [];
  for (const name of READS) {
    for (const method of ['bind', 'call', 'apply'] as const) {
      try {
        Object.defineProperty(agent[name], method, {
          value: (thisArg: unknown, ...rest: unknown[]) => {
            captured = thisArg;
            return method === 'bind' ? () => Promise.resolve(null) : Promise.resolve(rest);
          },
        });
        planted.push(`${name}.${method}`);
      } catch (error) {
        assert.ok(error instanceof TypeError, `agent.${name}.${method}: a TypeError`);
      }
    }
  }
  const record = await operator.getRecord.bind(operator)(recordId);
  const head = await operator.chainHead.call(operator, recordId);
  const chain = await operator.readChain.apply(operator, [recordId]);
  assert.equal(captured, undefined, 'no planted function ever received the operator handle');
  assert.deepEqual(planted, [], 'no plant landed');
  assert.notEqual(record, null, 'the real record is read');
  assert.deepEqual(record, await operator.getRecord(recordId));
  assert.equal(head, await operator.chainHead(recordId), 'the real head is read');
  assert.deepEqual(chain, await operator.readChain(recordId), 'the real chain is read');
  const fin = await operator.finalize.bind(operator)(recordId, identity(), CONTENT, facts());
  assert.equal(fin.status, 'ok', 'the bound operator calls behave as before');
});

test('the agent handle and the operator handle read the same answers', async () => {
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

test("each handle function keeps its kernel function's name and length", () => {
  const { agent, operator } = handles();
  const arity: Record<string, number> = {
    stage: 4,
    getRecord: 1,
    readChain: 1,
    chainHead: 1,
    open: 2,
    review: 1,
    finalize: 5,
    decline: 5,
    raiseFinding: 3,
    acknowledge: 3,
    redeem: 3,
    beginRedemption: 3,
    completeRedemption: 4,
    seal: 1,
    replay: 1,
    verifyChain: 1,
    listDue: 0,
    verifySignatures: 1,
  };
  for (const [key, fn] of [...Object.entries(agent), ...Object.entries(operator)]) {
    assert.equal(fn.name, key, `${key}'s name`);
    assert.equal(fn.length, arity[key], `${key}'s length`);
  }
});
