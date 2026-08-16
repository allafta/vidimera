// @vidimera/record — consultations.test.ts (SPEC §11.1 "Consultations
// (required-consultation gating)", the ATTACH-FORM half; §9's finalize signature): the
// first step-5 increment's file. This file owns the intake-validator pins and, once the
// surface is wired, the attach/recording pins; the gate's pins are the second step-5
// increment's.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConsultationInput } from '../src/config.js';
import { create } from '../src/create.js';
import { validateConsultations } from '../src/kernel/consultations.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
  twoLegProfile,
} from './helpers/profiles.js';

const CHECKER = { principal: 'svc:risk-check', authority: 'mtls:risk-check' };
const DIGEST = `sha256:${'a'.repeat(64)}`;

function obtained(kind: string, extra?: Record<string, unknown>): ConsultationInput {
  return {
    kind,
    checker: CHECKER,
    payloadDigest: DIGEST,
    verdict: 'pass',
    ...extra,
  } as ConsultationInput;
}

test('validateConsultations: undefined and empty partition to nothing; order is preserved', () => {
  assert.deepEqual(validateConsultations(undefined), { obtained: [], unreachable: [] });
  assert.deepEqual(validateConsultations([]), { obtained: [], unreachable: [] });

  const parted = validateConsultations([
    obtained('risk-check'),
    { kind: 'sanctions', unreachable: true, authority: 'svc:sanctions' },
    { ...obtained('llm-judge'), verdict: 'fail' } as ConsultationInput,
  ]);
  assert.deepEqual(
    parted.obtained.map((entry) => entry.kind),
    ['risk-check', 'llm-judge'],
  );
  assert.deepEqual(
    parted.unreachable.map((entry) => entry.kind),
    ['sanctions'],
  );
});

test('validateConsultations: duplicate kinds throw — obtained+obtained AND obtained+marker', () => {
  assert.throws(
    () => validateConsultations([obtained('risk-check'), obtained('risk-check')]),
    /duplicate/i,
  );
  assert.throws(
    () =>
      validateConsultations([
        obtained('risk-check'),
        { kind: 'risk-check', unreachable: true, authority: 'svc:risk' },
      ]),
    /duplicate/i,
  );
});

test('validateConsultations: reserved kinds throw on BOTH shapes — a library control cannot be forged', () => {
  // SPEC §11.1: an input naming a reserved library-emitted kind (`facts` or
  // `chain-verify`) "would forge a library control" — a caller error, thrown loud.
  for (const kind of ['facts', 'chain-verify']) {
    assert.throws(() => validateConsultations([obtained(kind)]), /reserved/i);
    assert.throws(
      () => validateConsultations([{ kind, unreachable: true, authority: 'svc:x' }]),
      /reserved/i,
    );
  }
});

test('validateConsultations: malformed entries throw — shape is exact, unknown keys included', () => {
  // A host-supplied `at` is an UNKNOWN KEY: SPEC §11.1's "A consultation's `at` is
  // never accepted from the host" is enforced structurally — the shape has no at field.
  assert.throws(
    () => validateConsultations([obtained('k1', { at: '2026-01-01T00:00:00.000Z' })]),
    /unknown key|at/i,
  );
  // missing field:
  assert.throws(
    () =>
      validateConsultations([
        { kind: 'k1', checker: CHECKER, verdict: 'pass' } as unknown as ConsultationInput,
      ]),
    /payloadDigest|malformed/i,
  );
  // bad verdict:
  assert.throws(() => validateConsultations([obtained('k1', { verdict: 'maybe' })]), /verdict/i);
  // invalid checker:
  assert.throws(
    () =>
      validateConsultations([
        {
          kind: 'k1',
          checker: { principal: '', authority: '' },
          payloadDigest: DIGEST,
          verdict: 'pass',
        } as ConsultationInput,
      ]),
    /checker/i,
  );
  // present-but-empty payloadDigest (distinct from the missing-field pin above):
  assert.throws(
    () => validateConsultations([obtained('k1', { payloadDigest: '' })]),
    /payloadDigest/i,
  );
  // empty kind, both shapes:
  assert.throws(() => validateConsultations([obtained('')]), /kind/i);
  assert.throws(
    () => validateConsultations([{ kind: '', unreachable: true, authority: 'svc:x' }]),
    /kind/i,
  );
  // marker with empty authority, marker with unknown key, marker with unreachable !== true:
  assert.throws(
    () => validateConsultations([{ kind: 'k1', unreachable: true, authority: '' }]),
    /authority/i,
  );
  assert.throws(
    () =>
      validateConsultations([
        {
          kind: 'k1',
          unreachable: true,
          authority: 'svc:x',
          extra: 1,
        } as unknown as ConsultationInput,
      ]),
    /unknown key/i,
  );
  assert.throws(
    () =>
      validateConsultations([
        { kind: 'k1', unreachable: false, authority: 'svc:x' } as unknown as ConsultationInput,
      ]),
    /unreachable|malformed/i,
  );
  // non-object entry, non-string proofRef:
  assert.throws(
    () => validateConsultations(['nope' as unknown as ConsultationInput]),
    /malformed|entry/i,
  );
  assert.throws(() => validateConsultations([obtained('k1', { proofRef: 7 })]), /proofRef/i);
});

// === the attach form at the seam (first step-5 increment) ===

const CONTENT = { subject: 'week-1', total: 40 };

test('the attach happy path: obtained consultations record in order, library-stamped, and a fail verdict is evidence, never a gate', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [
      { kind: 'risk-check', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
      {
        kind: 'llm-judge',
        checker: CHECKER,
        payloadDigest: DIGEST,
        verdict: 'fail',
        proofRef: 'trace:42',
      },
    ],
  });
  // SPEC §11.1: a non-required obtained consultation is "recorded as supplied —
  // including a `fail` verdict — as evidence, never a gate". No gate exists in the
  // first step-5 increment at all; finalize CONFIRMS.
  assert.equal(done.status, 'ok');

  const chain = await store.readChain(recordId);
  assert.equal(chain.length, 6); // opened, chain-verify, facts, risk-check, llm-judge, confirmed
  const [, , , third, fourth, confirmed] = chain;
  assert.ok(third !== undefined && fourth !== undefined && confirmed !== undefined);
  assert.equal(third.kind, 'consultation-recorded');
  assert.equal(fourth.kind, 'consultation-recorded');
  assert.equal(confirmed.kind, 'confirmed');

  // Supplied ORDER preserved; payload key-sets pinned (proofRef present-iff-supplied):
  const riskCheck = third.payload as Record<string, unknown>;
  const llmJudge = fourth.payload as Record<string, unknown>;
  assert.equal(riskCheck.kind, 'risk-check');
  assert.equal(llmJudge.kind, 'llm-judge');
  assert.deepEqual(Object.keys(riskCheck).sort(), [
    'at',
    'checker',
    'kind',
    'payloadDigest',
    'verdict',
  ]);
  assert.deepEqual(Object.keys(llmJudge).sort(), [
    'at',
    'checker',
    'kind',
    'payloadDigest',
    'proofRef',
    'verdict',
  ]);
  // Library-stamped recording time — the batch's single clock reading (§2.1):
  assert.equal(riskCheck.at, confirmed.at);
  assert.equal(llmJudge.at, confirmed.at);
  assert.equal(llmJudge.verdict, 'fail');

  // The existing replay fold and review projection carry them for free:
  const rec = await handles.operator.getRecord(recordId);
  assert.deepEqual(
    rec?.consultations.map((c) => c.kind),
    ['chain-verify', 'facts', 'risk-check', 'llm-judge'],
  );
  const view = await handles.operator.review(recordId);
  assert.equal(view.status, 'ok');
  if (view.status !== 'ok') return;
  assert.ok(view.value.consultations.some((c) => c.kind === 'llm-judge'));
});

test('an unreachable marker is inert in the first step-5 increment: validated, recorded nowhere, and finalize confirms', async () => {
  // SPEC §11.1: "an unreachable marker for a non-required kind is inert" — and no kind
  // can be required while requiredConsultations stays GOVERNED. The second step-5
  // increment's gate is the marker's consumer.
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [{ kind: 'sanctions', unreachable: true, authority: 'svc:sanctions' }],
  });
  assert.equal(done.status, 'ok');
  assert.equal((await store.readChain(recordId)).length, 4); // opened, chain-verify, facts, confirmed — nothing extra
});

test('a refusal path records no consultation: drifted content refuses with the chain untouched', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const out = await handles.operator.finalize(
    recordId,
    identity(),
    { subject: 'week-1', total: 999 },
    facts(),
    {
      consultations: [
        { kind: 'risk-check', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
      ],
    },
  );
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'content-drift');
  assert.equal(
    (await store.readChain(recordId)).length,
    1,
    'opened only — evidence records on success alone',
  );
});

test('the intake throw wins over the unknown-record throw: caller bugs throw identically regardless of record state', async () => {
  // SPEC §9: consultation shape "throws at argument intake, before anything is loaded".
  const handles = create(makeConfig([captureProfile()]));
  await assert.rejects(
    handles.operator.finalize('rec-none', identity(), CONTENT, facts(), {
      consultations: [
        { kind: 'k1', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
        { kind: 'k1', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
      ],
    }),
    /duplicate/i,
  );
});

test('unknown opts keys throw, and policy names its own build step', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  await assert.rejects(
    handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
      policy: { digest: DIGEST },
    } as unknown as Parameters<typeof handles.operator.finalize>[4]),
    /policy/i,
  );
  await assert.rejects(
    handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
      nonsense: 1,
    } as unknown as Parameters<typeof handles.operator.finalize>[4]),
    /finalize.*option|accepts only/i,
  );
});

test('the surface is leg-agnostic: a maker-leg finalize on a two-leg profile records its consultation', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile()], { store }));
  const makerId = await openRecord(
    handles,
    CONTENT,
    'test.twoleg.v1',
    'subject:attach-1',
    'maker-decide',
  );
  const done = await handles.operator.finalize(makerId, identity(), CONTENT, facts(), {
    consultations: [
      { kind: 'risk-check', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
    ],
  });
  assert.equal(done.status, 'ok');
  const rec = await handles.operator.getRecord(makerId);
  assert.ok(rec?.consultations.some((c) => c.kind === 'risk-check'));
});
