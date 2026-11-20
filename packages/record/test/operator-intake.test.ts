// @vidimera/record — operator-intake.test.ts: the operator seams and the read methods trust
// the shape of what the host passes. This file pins the argument-depth rules, each a named
// caller error with the seam's head, raised before any store read, lock or append, and the
// same on every backing:
//   - an id argument (`recordId`, `stagedRef`) must be a string — on every seam and every read,
//     on both handles that carry the read; an empty or unknown string keeps today's answer;
//   - an options bag is absent, `undefined`, or an object — `null` and other non-objects throw;
//   - `tx`, when present and not `undefined`, is an object or a function — a primitive throws
//     before anything else in the redemption seam runs;
//   - `open()`'s `priorRecordRefs` is an array of exact `{ recordId, chainHead }` entries;
//   - every host digest field has SPEC §7's form, and `observedAt` names a real instant;
//   - every operator string a seam records is well-formed UTF-16, and the read path that
//     re-reads persisted identities is unchanged.

import assert from 'node:assert/strict';
import { describe, test } from 'vitest';

import { create } from '../src/create.js';
import { validateConsultations } from '../src/kernel/consultations.js';
import { sodViolated } from '../src/kernel/finalize.js';
import { identitySnapshot } from '../src/kernel/identity.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import type { Store } from '../src/store/store.js';
import type { IdentityAssertion } from '../src/types.js';
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
      for (const bad of [null, 5, 'x', true, []]) {
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

// --- digest form, observedAt, well-formed operator strings --------------------------------
// One fixture: a capture profile declaring decline, a policy source and a findings flow, so a
// single record reaches every seam whose intake these pins exercise.

const GOOD_DIGESTS = [`sha256:${'a'.repeat(64)}`, `sha512:${'0f'.repeat(64)}`];
const BAD_FORM_DIGESTS: unknown[] = ['NOT A DIGEST', 'sha256:ABC', 'sha256:abc'];
const BAD_OTHER_DIGESTS: unknown[] = [5, ''];
const LONE = 'x\ud800';

function intakeProfile() {
  const p = captureProfile({ id: 'test.intake.v1', decline: true });
  p.policySource = 'rules.v1';
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: no leg');
  p.legs[0] = { ...leg, ackMode: 'any' as const, requiredAcks: ['variance'] };
  return p;
}

async function intakeFixture(opts: { open: boolean } = { open: true }) {
  const inner = new MemoryStore();
  const spy = spyStore(inner);
  const handles = create(makeConfig([intakeProfile()], { store: spy.store }));
  const staged = await handles.agent.stage(CONTENT, 'test.intake.v1', DEFAULT_SUBJECT_REF);
  if (staged.status !== 'ok') throw new Error('fixture: stage refused');
  const { stagedRef } = staged.value;
  if (!opts.open) return { inner, spy, op: handles.operator, stagedRef, recordId: '' };
  const opened = await handles.operator.open(stagedRef, { policyDigest: D1 });
  if (opened.status !== 'ok') throw new Error('fixture: open refused');
  return { inner, spy, op: handles.operator, stagedRef, recordId: opened.value.recordId };
}
type IntakeFixture = Awaited<ReturnType<typeof intakeFixture>>;

/** A refused call must throw the expected message, reach no store and append nothing. */
async function assertRefusedAtIntake(
  f: IntakeFixture,
  run: () => Promise<unknown>,
  pattern: RegExp,
  label: string,
  opts: { storeFree: boolean } = { storeFree: true },
): Promise<void> {
  const before = f.recordId === '' ? [] : await f.inner.readChain(f.recordId);
  const callsBefore = f.spy.calls();
  await assert.rejects(
    async () => run(),
    (err: unknown) => {
      assert.ok(err instanceof Error, `${label}: an Error`);
      assert.match(err.message, pattern, label);
      return true;
    },
    label,
  );
  if (opts.storeFree) {
    assert.equal(f.spy.calls(), callsBefore, `${label}: no store call after intake`);
  }
  if (f.recordId !== '') {
    assert.deepEqual(await f.inner.readChain(f.recordId), before, `${label}: nothing appended`);
  }
}

type DigestSite = {
  name: string;
  field: RegExp;
  open: boolean;
  /** An empty string keeps the seam's own message, which is reached after a store read. */
  emptyReadsStore?: boolean;
  run: (f: IntakeFixture, v: unknown) => Promise<unknown>;
};

const obtained = (payloadDigest: unknown) => ({
  kind: 'k1',
  checker: { principal: 'c', authority: 'mtls:c' },
  payloadDigest,
  verdict: 'pass' as const,
});

const digestSites: DigestSite[] = [
  {
    name: 'finalize consultations[].payloadDigest',
    field: /finalize: consultations\[0\].*payloadDigest/,
    open: true,
    run: (f, v) =>
      f.op.finalize(f.recordId, identity(), CONTENT, facts(), {
        consultations: [obtained(v) as never],
        policy: { digest: D1 },
      }),
  },
  {
    name: 'decline consultations[].payloadDigest',
    field: /decline: consultations\[0\].*payloadDigest/,
    open: true,
    run: (f, v) =>
      f.op.decline(f.recordId, identity(), CONTENT, facts(), {
        consultations: [obtained(v) as never],
      }),
  },
  {
    name: 'finalize policy.digest',
    field: /finalize: opts\.policy\.digest/,
    open: true,
    run: (f, v) =>
      f.op.finalize(f.recordId, identity(), CONTENT, facts(), { policy: { digest: v as never } }),
  },
  {
    name: 'raiseFinding findingDigest',
    field: /raiseFinding: .*findingDigest/,
    open: true,
    run: (f, v) =>
      f.op.raiseFinding(
        f.recordId,
        { findingId: 'f-1', kind: 'variance', findingDigest: v as never },
        identity(),
      ),
  },
  {
    name: 'acknowledge findingDigest',
    field: /acknowledge: .*findingDigest/,
    open: true,
    run: (f, v) =>
      f.op.acknowledge(f.recordId, { findingId: 'f-1', findingDigest: v as never }, identity()),
  },
  {
    name: 'completeRedemption result.digest',
    field: /completeRedemption: opts\.result\.digest/,
    open: true,
    run: (f, v) =>
      f.op.completeRedemption(f.recordId, 'token', CONTENT, { result: { digest: v as never } }),
  },
  {
    name: 'open policyDigest',
    field: /open: .*policyDigest/,
    open: false,
    emptyReadsStore: true,
    run: (f, v) => f.op.open(f.stagedRef, { policyDigest: v as never }),
  },
  {
    name: 'open supersedes.chainHead',
    field: /open: supersedes .*chainHead/,
    open: false,
    run: (f, v) =>
      f.op.open(f.stagedRef, {
        policyDigest: D1,
        supersedes: { recordId: 'r-1', chainHead: v as never },
      }),
  },
  {
    name: 'open priorRecordRefs[].chainHead',
    field: /open: priorRecordRefs\[0\] .*chainHead/,
    open: false,
    run: (f, v) =>
      f.op.open(f.stagedRef, {
        policyDigest: D1,
        priorRecordRefs: [{ recordId: 'r-1', chainHead: v as never }],
      }),
  },
];

describe('operator intake: digest form', () => {
  for (const site of digestSites) {
    test(`${site.name} refuses a non-digest and accepts sha256 and sha512 forms`, async () => {
      for (const bad of BAD_FORM_DIGESTS) {
        const f = await intakeFixture({ open: site.open });
        await assertRefusedAtIntake(
          f,
          () => site.run(f, bad),
          new RegExp(`${site.field.source}.*digest form`, 's'),
          `${site.name} ${JSON.stringify(bad)}`,
        );
      }
      for (const bad of BAD_OTHER_DIGESTS) {
        const f = await intakeFixture({ open: site.open });
        await assertRefusedAtIntake(
          f,
          () => site.run(f, bad),
          site.field,
          `${site.name} ${JSON.stringify(bad)}`,
          { storeFree: !(bad === '' && site.emptyReadsStore === true) },
        );
      }
      for (const good of GOOD_DIGESTS) {
        const f = await intakeFixture({ open: site.open });
        try {
          await site.run(f, good);
        } catch (err) {
          // A domain error downstream is fine; the digest-form refusal is not.
          assert.doesNotMatch((err as Error).message, /digest form/, `${site.name} ${good}`);
        }
      }
    });
  }
});

describe('operator intake: observedAt', () => {
  const REFUSED = [
    '2027-02-30T10:00:00Z',
    '2027-04-31T10:00:00Z',
    '2027-02-29T10:00:00Z',
    '2100-02-29T10:00:00Z',
    '2027-01-01T24:00:00Z',
    '2027-01-01T10:00:00+24:00',
    '2027-01-01T10:00:00+05:60',
    '2027-13-01T10:00:00Z',
    '2027-00-10T10:00:00Z',
    '2027-01-00T10:00:00Z',
    '2027-01-01T10:60:00Z',
    '2027-01-01T23:59:60Z',
  ];
  const ACCEPTED = [
    '2028-02-29T10:00:00Z',
    '2000-02-29T00:00:00.5-23:59',
    '2027-12-31T23:59:59+23:59',
    '2027-04-30T10:00:00Z',
  ];
  const withObservedAt = (observedAt: unknown) => [{ ...obtained(D1), observedAt }] as never;

  test('an impossible calendar or clock value throws at intake and appends nothing', async () => {
    for (const bad of REFUSED) {
      const f = await intakeFixture();
      await assertRefusedAtIntake(
        f,
        () =>
          f.op.finalize(f.recordId, identity(), CONTENT, facts(), {
            consultations: withObservedAt(bad),
            policy: { digest: D1 },
          }),
        /finalize: consultations\[0\].*malformed observedAt/s,
        bad,
      );
    }
  });

  test('real instants are accepted, including 29 February 2028', () => {
    for (const good of ACCEPTED) {
      assert.doesNotThrow(() => validateConsultations(withObservedAt(good), 'finalize'), good);
    }
  });
});

describe('operator intake: well-formed operator strings', () => {
  type Case = [string, string, (f: IntakeFixture, bad: string) => Promise<unknown>];
  const id = (part: 'principal' | 'authority' | 'proofRef', bad: string) => ({
    principal: part === 'principal' ? bad : 'approver:1',
    authority: part === 'authority' ? bad : 'session:test-app',
    ...(part === 'proofRef' ? { proofRef: bad } : {}),
  });
  const finalizeWith = (
    f: IntakeFixture,
    opts: object,
    factsArg: ReturnType<typeof facts> = facts(),
    who: IdentityAssertion = identity(),
  ) =>
    f.op.finalize(f.recordId, who, CONTENT, factsArg, {
      policy: { digest: D1 },
      ...opts,
    } as never);
  const declineWith = (f: IntakeFixture, consultations: object[]) =>
    f.op.decline(f.recordId, identity(), CONTENT, facts(), { consultations } as never);
  const marker = (m: object) => ({ kind: 'k2', unreachable: true, authority: 'svc:x', ...m });
  const finding = (m: object) => ({
    findingId: 'f-1',
    kind: 'variance',
    findingDigest: D1,
    ...m,
  });

  const cases: Case[] = [];
  for (const part of ['principal', 'authority', 'proofRef'] as const) {
    cases.push(
      ['finalize', `identity.${part}`, (f, b) => finalizeWith(f, {}, facts(), id(part, b))],
      [
        'decline',
        `identity.${part}`,
        (f, b) => f.op.decline(f.recordId, id(part, b), CONTENT, facts()),
      ],
      [
        'raiseFinding',
        `identity.${part}`,
        (f, b) => f.op.raiseFinding(f.recordId, finding({}) as never, id(part, b)),
      ],
      [
        'acknowledge',
        `identity.${part}`,
        (f, b) =>
          f.op.acknowledge(f.recordId, { findingId: 'f-1', findingDigest: D1 }, id(part, b)),
      ],
      [
        'finalize',
        `facts.checker.${part}`,
        (f, b) => finalizeWith(f, {}, { ...facts(), checker: id(part, b) }),
      ],
      [
        'finalize',
        `consultations[0].checker.${part}`,
        (f, b) => finalizeWith(f, { consultations: [{ ...obtained(D1), checker: id(part, b) }] }),
      ],
      [
        'decline',
        `consultations[0].checker.${part}`,
        (f, b) => declineWith(f, [{ ...obtained(D1), checker: id(part, b) }]),
      ],
    );
  }
  cases.push(
    [
      'finalize',
      'consultations[0].kind',
      (f, b) => finalizeWith(f, { consultations: [{ ...obtained(D1), kind: b }] }),
    ],
    ['decline', 'consultations[0].kind', (f, b) => declineWith(f, [{ ...obtained(D1), kind: b }])],
    [
      'finalize',
      'consultations[0].proofRef',
      (f, b) => finalizeWith(f, { consultations: [{ ...obtained(D1), proofRef: b }] }),
    ],
    [
      'finalize',
      'consultations[0].kind',
      (f, b) => finalizeWith(f, { consultations: [marker({ kind: b })] }),
    ],
    [
      'finalize',
      'consultations[0].authority',
      (f, b) => finalizeWith(f, { consultations: [marker({ authority: b })] }),
    ],
    ['decline', 'consultations[0].authority', (f, b) => declineWith(f, [marker({ authority: b })])],
    [
      'finalize',
      'opts.policy.authority',
      (f, b) =>
        f.op.finalize(f.recordId, identity(), CONTENT, facts(), {
          policy: { unreachable: true, authority: b },
        }),
    ],
    [
      'raiseFinding',
      'findingId',
      (f, b) => f.op.raiseFinding(f.recordId, finding({ findingId: b }) as never, identity()),
    ],
    [
      'raiseFinding',
      'kind',
      (f, b) => f.op.raiseFinding(f.recordId, finding({ kind: b }) as never, identity()),
    ],
    [
      'raiseFinding',
      'magnitude',
      (f, b) => f.op.raiseFinding(f.recordId, finding({ magnitude: b }) as never, identity()),
    ],
    [
      'acknowledge',
      'findingId',
      (f, b) => f.op.acknowledge(f.recordId, { findingId: b, findingDigest: D1 }, identity()),
    ],
    [
      'acknowledge',
      'magnitude',
      (f, b) =>
        f.op.acknowledge(
          f.recordId,
          { findingId: 'f-1', findingDigest: D1, magnitude: b },
          identity(),
        ),
    ],
    [
      'open',
      'supersedes.recordId',
      (f, b) =>
        f.op.open(f.stagedRef, { policyDigest: D1, supersedes: { recordId: b, chainHead: D1 } }),
    ],
    [
      'open',
      'priorRecordRefs[0].recordId',
      (f, b) =>
        f.op.open(f.stagedRef, {
          policyDigest: D1,
          priorRecordRefs: [{ recordId: b, chainHead: D1 }],
        }),
    ],
  );

  test('a lone surrogate in any recorded operator string throws at intake and appends nothing', async () => {
    for (const [seam, field, run] of cases) {
      const f = await intakeFixture({ open: seam !== 'open' });
      const escaped = field.replace(/[[\]().]/g, '\\$&');
      await assertRefusedAtIntake(
        f,
        () => run(f, LONE),
        new RegExp(`^${seam}: ${escaped} holds a lone surrogate`),
        `${seam} ${field}`,
      );
    }
  });

  test('a well-formed astral string is accepted', async () => {
    const f = await intakeFixture();
    const out = await f.op.raiseFinding(
      f.recordId,
      { findingId: 'f-\u{1F600}', kind: 'variance', findingDigest: D1 },
      identity({ principal: 'p-\u{1F600}' }),
    );
    assert.equal(out.status, 'ok');
  });

  test('an invalid identity that is not an ill-formed string keeps its own path', async () => {
    const f = await intakeFixture();
    const refused = await finalizeWith(f, {}, facts(), { principal: '', authority: 'x' });
    assert.equal(refused.status, 'refused');
    await assert.rejects(
      async () =>
        f.op.raiseFinding(f.recordId, finding({}) as never, { principal: '', authority: 'x' }),
      /raiseFinding: a malformed identity/,
    );
  });
});

describe('operator intake: the read path is unchanged', () => {
  test('identitySnapshot and the prior-leg SoD read still accept a persisted lone-surrogate identity', () => {
    const planted = { principal: 'maker\ud800', authority: 'session:test-app' };
    assert.deepEqual(identitySnapshot(planted), planted);
    const record = {
      priorRecordRefs: [{ recordId: 'r-0', chainHead: D1, legId: 'maker-decide' }],
      priorLegActors: [planted],
    };
    const leg = {
      id: 'checker-decide',
      allowedAuthorities: [],
      sod: { notActorOf: ['maker-decide'] },
    };
    const other = { principal: 'checker:1', authority: 'session:test-app' };
    assert.equal(sodViolated(record as never, leg as never, other, 'r-1', 'finalize'), false);
    assert.equal(sodViolated(record as never, leg as never, planted, 'r-1', 'finalize'), true);
  });
});
