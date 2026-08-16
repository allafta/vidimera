// @vidimera/record — consultations.test.ts (SPEC §11.1 "Consultations
// (required-consultation gating)", the ATTACH-FORM half; §9's finalize signature): the
// first step-5 increment's file. This file owns the intake-validator pins and, once the
// surface is wired, the attach/recording pins; the gate's pins are the second step-5
// increment's.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConsultationInput } from '../src/config.js';
import { validateConsultations } from '../src/kernel/consultations.js';

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
