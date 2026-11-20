// @vidimera/record — operator-intake.test.ts: the operator seams and the read methods trust
// the shape of what the host passes. This file pins the argument-depth rules, each a named
// caller error with the seam's head, raised before any store read, lock or append, and the
// same on every backing:
//   - an id argument (`recordId`, `stagedRef`) must be a string — on every seam and every read,
//     on both handles that carry the read; an empty or unknown string keeps today's answer;
//   - an options bag is absent, `undefined`, or an object — `null` and other non-objects throw;
//   - `tx`, when present and not `undefined`, is an object or a function — a primitive throws
//     before anything else in the redemption seam runs;
//   - `open()`'s `priorRecordRefs` is an array of exact `{ recordId, chainHead }` entries.

import assert from 'node:assert/strict';
import { describe, test } from 'vitest';

import { create } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import type { Store } from '../src/store/store.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
  tamperNonLast,
} from './helpers/profiles.js';
import { TamperingStore } from './helpers/stores.js';

const CONTENT = { subject: 'week-1', total: 40 };
const D1 = `sha256:${'1'.repeat(64)}`;

/** Counts every call into the wrapped store, so a test can prove a refused call never reached it. */
function spyStore<T extends Store>(inner: T): { store: Store; calls: () => number } {
  let n = 0;
  const store = new Proxy(inner, {
    get(target, prop, receiver) {
      const value: unknown = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') {
        return (...args: unknown[]) => {
          n += 1;
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      }
      return value;
    },
  }) as Store;
  return { store, calls: () => n };
}

const backings: ReadonlyArray<readonly [string, () => MemoryStore | SqliteStore]> = [
  ['MemoryStore', () => new MemoryStore()],
  ['SqliteStore', () => new SqliteStore(':memory:')],
];

for (const [backingName, makeStore] of backings) {
  async function fixture() {
    const inner = makeStore();
    const spy = spyStore(inner);
    const handles = create(makeConfig([effectSeamProfile()], { store: spy.store }));
    const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
    const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(done.status, 'ok', 'fixture: the record confirms');
    return { inner, spy, handles, recordId };
  }

  describe(`operator intake on ${backingName}`, () => {
    // --- ids ------------------------------------------------------------------------------
    test('a non-string id throws a named error at every seam and read, before any store call, appending nothing', async () => {
      const { inner, spy, handles, recordId } = await fixture();
      const before = await inner.readChain(recordId);
      const op = handles.operator;
      const ag = handles.agent;
      const finding = { findingId: 'f-1', kind: 'variance', findingDigest: D1 };
      const ack = { findingId: 'f-1', findingDigest: D1 };
      const calls: Array<[string, string, (bad: never) => unknown]> = [
        ['open', 'stagedRef', (b) => op.open(b)],
        ['finalize', 'recordId', (b) => op.finalize(b, identity(), CONTENT, facts())],
        ['decline', 'recordId', (b) => op.decline(b, identity(), CONTENT, facts())],
        ['raiseFinding', 'recordId', (b) => op.raiseFinding(b, finding, identity())],
        ['acknowledge', 'recordId', (b) => op.acknowledge(b, ack, identity())],
        ['redeem', 'recordId', (b) => op.redeem(b, CONTENT)],
        ['beginRedemption', 'recordId', (b) => op.beginRedemption(b, CONTENT)],
        ['completeRedemption', 'recordId', (b) => op.completeRedemption(b, 'token', CONTENT)],
        ['seal', 'recordId', (b) => op.seal(b)],
        ['review', 'recordId', (b) => op.review(b)],
        ['verifySignatures', 'recordId', (b) => op.verifySignatures(b)],
        ['getRecord', 'recordId', (b) => op.getRecord(b)],
        ['readChain', 'recordId', (b) => op.readChain(b)],
        ['chainHead', 'recordId', (b) => op.chainHead(b)],
        ['replay', 'recordId', (b) => op.replay(b)],
        ['verifyChain', 'recordId', (b) => op.verifyChain(b)],
        ['getRecord', 'recordId', (b) => ag.getRecord(b)],
        ['readChain', 'recordId', (b) => ag.readChain(b)],
        ['chainHead', 'recordId', (b) => ag.chainHead(b)],
      ];
      const callsBefore = spy.calls();
      for (const bad of [42, {}, null]) {
        for (const [seam, name, call] of calls) {
          await assert.rejects(
            async () => call(bad as never),
            (err: unknown) => {
              assert.ok(err instanceof Error, `${seam}: an Error`);
              assert.equal(err.message, `${seam}: ${name} must be a string`);
              return true;
            },
            `${seam}(${JSON.stringify(bad)})`,
          );
        }
      }
      assert.equal(spy.calls(), callsBefore, 'no store call for any refused id');
      assert.deepEqual(await inner.readChain(recordId), before, 'the chain is unchanged');
    });

    test("an empty or unknown string id keeps today's answer", async () => {
      const { handles, recordId } = await fixture();
      for (const id of ['', 'no-such-record']) {
        assert.equal(await handles.operator.getRecord(id), null);
        assert.equal(await handles.agent.getRecord(id), null);
        assert.deepEqual(await handles.operator.readChain(id), []);
        assert.deepEqual(await handles.agent.readChain(id), []);
        assert.equal(await handles.operator.chainHead(id), null);
        await assert.rejects(async () => handles.operator.open(id), /open: unknown stagedRef/);
        await assert.rejects(
          async () => handles.operator.finalize(id, identity(), CONTENT, facts()),
          /finalize: unknown recordId/,
        );
        await assert.rejects(async () => handles.operator.seal(id), /seal: unknown recordId/);
      }
      assert.notEqual(await handles.operator.getRecord(recordId), null);
    });

    // --- options bags ---------------------------------------------------------------------
    test('a null options bag throws a named error at each options-taking seam; undefined is accepted', async () => {
      const { inner, spy, handles, recordId } = await fixture();
      const before = await inner.readChain(recordId);
      const op = handles.operator;
      const callsBefore = spy.calls();
      for (const bad of [null, 5, 'x', true]) {
        const withBad: Array<[string, () => unknown]> = [
          ['open', () => op.open('staged', bad as never)],
          ['finalize', () => op.finalize(recordId, identity(), CONTENT, facts(), bad as never)],
          ['decline', () => op.decline(recordId, identity(), CONTENT, facts(), bad as never)],
          ['redeem', () => op.redeem(recordId, CONTENT, bad as never)],
          ['beginRedemption', () => op.beginRedemption(recordId, CONTENT, bad as never)],
          [
            'completeRedemption',
            () => op.completeRedemption(recordId, 'token', CONTENT, bad as never),
          ],
        ];
        for (const [seam, call] of withBad) {
          await assert.rejects(
            async () => call(),
            (err: unknown) => {
              assert.ok(err instanceof Error);
              assert.equal(err.message, `${seam}: options must be an object when supplied`);
              return true;
            },
            `${seam}(${String(bad)})`,
          );
        }
      }
      assert.equal(spy.calls(), callsBefore, 'no store call for any refused bag');
      assert.deepEqual(await inner.readChain(recordId), before, 'the chain is unchanged');
      // Absent and explicit-undefined bags stay legal.
      const ok = await op.redeem(recordId, CONTENT, undefined);
      assert.equal(ok.status, 'ok');
    });

    // --- tx -------------------------------------------------------------------------------
    test('a primitive tx throws at each redemption seam before anything runs; nothing is appended', async () => {
      const { inner, spy, handles, recordId } = await fixture();
      const before = await inner.readChain(recordId);
      const op = handles.operator;
      const callsBefore = spy.calls();
      for (const bad of [null, false, 'x', 0, Symbol('tx'), 1n, true]) {
        const calls: Array<[string, () => unknown]> = [
          ['redeem', () => op.redeem(recordId, CONTENT, { tx: bad })],
          ['beginRedemption', () => op.beginRedemption(recordId, CONTENT, { tx: bad })],
          [
            'completeRedemption',
            () => op.completeRedemption(recordId, 'token', CONTENT, { tx: bad }),
          ],
        ];
        for (const [seam, call] of calls) {
          await assert.rejects(
            async () => call(),
            (err: unknown) => {
              assert.ok(err instanceof Error);
              assert.ok(
                err.message.startsWith(`${seam}: opts.tx must be an object or a function`),
                err.message,
              );
              return true;
            },
            `${seam}(tx: ${String(bad)})`,
          );
        }
      }
      assert.equal(spy.calls(), callsBefore, 'no store call for any refused tx');
      assert.deepEqual(await inner.readChain(recordId), before, 'no edge appended');
    });

    test('a primitive tx over a tampered record throws instead of suppressing the compromise edge, and appends nothing', async () => {
      const inner = makeStore();
      const first = create(makeConfig([effectSeamProfile()], { store: inner }));
      const recordId = await openRecord(first, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
      const done = await first.operator.finalize(recordId, identity(), CONTENT, facts());
      assert.equal(done.status, 'ok');
      const before = await inner.readChain(recordId);

      const tampering = new TamperingStore(inner, recordId, tamperNonLast);
      const handles = create(makeConfig([effectSeamProfile()], { store: tampering }));
      for (const bad of [null, false, 'x']) {
        await assert.rejects(
          async () => handles.operator.redeem(recordId, CONTENT, { tx: bad }),
          /^Error: redeem: opts\.tx must be an object or a function/,
        );
      }
      assert.deepEqual(await inner.readChain(recordId), before, 'no edge on the tampered record');
    });

    test('tx: undefined is accepted as absent', async () => {
      const { handles, recordId } = await fixture();
      const out = await handles.operator.redeem(recordId, CONTENT, { tx: undefined });
      assert.equal(out.status, 'ok');
    });

    // --- priorRecordRefs ------------------------------------------------------------------
    test('open() shape-checks priorRecordRefs before any store read: non-array, non-object entry, unknown key, empty fields', async () => {
      const inner = makeStore();
      const spy = spyStore(inner);
      const handles = create(makeConfig([captureProfile()], { store: spy.store }));
      const staged = await handles.agent.stage(CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
      assert.equal(staged.status, 'ok');
      if (staged.status !== 'ok') return;
      const { stagedRef } = staged.value;
      const good = { recordId: 'r-1', chainHead: D1 };
      const cases: Array<[unknown, RegExp]> = [
        ['not-an-array', /open: priorRecordRefs must be an array when supplied/],
        [null, /open: priorRecordRefs must be an array when supplied/],
        [{ 0: good, length: 1 }, /open: priorRecordRefs must be an array when supplied/],
        [[null], /open: priorRecordRefs\[0\] must be a plain \{ recordId, chainHead \} object/],
        [['r-1'], /open: priorRecordRefs\[0\] must be a plain/],
        [[good, []], /open: priorRecordRefs\[1\] must be a plain/],
        [[{ ...good, extra: 1 }], /open: priorRecordRefs\[0\] carries the unknown key 'extra'/],
        [
          [{ recordId: '', chainHead: D1 }],
          /open: priorRecordRefs\[0\] has a missing or empty recordId/,
        ],
        [[{ chainHead: D1 }], /open: priorRecordRefs\[0\] has a missing or empty recordId/],
        [
          [{ recordId: 'r-1', chainHead: '' }],
          /open: priorRecordRefs\[0\] has a missing or empty chainHead/,
        ],
        [
          [{ recordId: 'r-1', chainHead: 5 }],
          /open: priorRecordRefs\[0\] has a missing or empty chainHead/,
        ],
      ];
      const callsBefore = spy.calls();
      for (const [bad, pattern] of cases) {
        await assert.rejects(
          async () => handles.operator.open(stagedRef, { priorRecordRefs: bad as never }),
          pattern,
        );
      }
      assert.equal(spy.calls(), callsBefore, 'no store call for any refused priorRecordRefs');
    });
  });
}
