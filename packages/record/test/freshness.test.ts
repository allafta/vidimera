// @vidimera/record — freshness.test.ts (SPEC §11.1 "Recording-time, not
// observation-time" + §14's authority-timestamp admission; the AL2 freshness
// increment, third of three — the increment that ends the guard era): the
// recorded-claim, signing-gated observedAt; rung 5.5's freshness arm refusing
// consultation-stale; the last GOVERNED lift. The library gates on the recorded,
// signature-covered CLAIM — it never verifies the observation happened then; that
// genuineness is proofRef plus the operator-assurance probes.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import type { ConfirmProfile } from '../src/config.js';
import { create, createWithClock } from '../src/create.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import { captureProfile, facts, identity, makeConfig, openRecord } from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const CHECKER = { principal: 'svc:risk', authority: 'mtls:risk' };
const DIGEST = `sha256:${'a'.repeat(64)}`;
const T0 = new Date('2026-08-17T10:00:00.000Z');

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const signer: Signer = async (bytes) => ({
  keyRef: 'key-1',
  signature: edSign(null, bytes, privateKey).toString('base64'),
});
const verifier: Verifier = async (bytes, signature) =>
  edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));

/** A signing profile with one required, freshness-bounded kind (3600s). */
function freshProfile(id = 'test.fresh.v1'): ConfirmProfile {
  const p = captureProfile({ id });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  return {
    ...p,
    signing: true,
    legs: [{ ...leg, requiredConsultations: ['risk-check'], freshness: { 'risk-check': 3600 } }],
  };
}

function freshSetup(profiles: ConfirmProfile[] = [freshProfile()], at: Date = T0) {
  const store = new MemoryStore();
  const config = {
    ...makeConfig(profiles, { store }),
    signing: {
      signer,
      verifiers: { 'key-1': verifier },
      signatures: new MemorySignatureStore(),
    },
  };
  return { store, handles: createWithClock(config, () => at) };
}

function obtained(observedAt?: string) {
  return {
    consultations: [
      {
        kind: 'risk-check',
        checker: CHECKER,
        payloadDigest: DIGEST,
        verdict: 'pass' as const,
        ...(observedAt === undefined ? {} : { observedAt }),
      },
    ],
  };
}

test('a fresh observedAt passes, records into the signed payload; a stale one refuses consultation-stale and the seam re-arms', async () => {
  const { handles } = freshSetup();
  const recordId = await openRecord(handles, CONTENT, 'test.fresh.v1', 'subject:fr-1');

  const stale = await handles.operator.finalize(
    recordId,
    identity(),
    CONTENT,
    facts(),
    obtained('2026-08-17T08:00:00.000Z'), // two hours old vs the 3600s bound
  );
  assert.equal(stale.status, 'refused');
  if (stale.status === 'refused') assert.equal(stale.code, 'consultation-stale');
  assert.equal((await handles.operator.getRecord(recordId))?.state, 'open', 'open for re-run');

  const fresh = await handles.operator.finalize(
    recordId,
    identity(),
    CONTENT,
    facts(),
    obtained('2026-08-17T09:45:00.000Z'), // 15 minutes old
  );
  assert.equal(fresh.status, 'ok', 'the seam re-armed; a fresh claim confirms');

  const chain = await handles.operator.readChain(recordId);
  const consult = chain.find(
    (t) =>
      t.kind === 'consultation-recorded' && (t.payload as { kind?: unknown }).kind === 'risk-check',
  );
  assert.ok(consult !== undefined);
  const payload = consult.payload as Record<string, unknown>;
  assert.equal(payload.observedAt, '2026-08-17T09:45:00.000Z', 'the claim records verbatim');
});

test('fail-closed: a MISSING observedAt on the bounded kind refuses; a FUTURE one refuses; an unbounded required kind ignores it', async () => {
  const { handles } = freshSetup();
  const r1 = await openRecord(handles, CONTENT, 'test.fresh.v1', 'subject:fr-2');
  const missing = await handles.operator.finalize(r1, identity(), CONTENT, facts(), obtained());
  assert.equal(missing.status, 'refused');
  if (missing.status === 'refused') assert.equal(missing.code, 'consultation-stale');

  const future = await handles.operator.finalize(
    r1,
    identity(),
    CONTENT,
    facts(),
    obtained('2026-08-17T11:00:00.000Z'),
  );
  assert.equal(future.status, 'refused');
  if (future.status === 'refused') assert.equal(future.code, 'consultation-stale');

  // Unbounded required kind: same profile shape but NO freshness record — observedAt
  // present is recorded evidence, never gated.
  const base = freshProfile('test.fresh.free.v1');
  const leg0 = base.legs[0];
  if (leg0 === undefined) throw new Error('fixture');
  const { freshness: _dropped, ...freeLeg } = leg0;
  const { handles: h2 } = freshSetup([{ ...base, legs: [freeLeg] }]);
  const r2 = await openRecord(h2, CONTENT, 'test.fresh.free.v1', 'subject:fr-3');
  const out = await h2.operator.finalize(
    r2,
    identity(),
    CONTENT,
    facts(),
    obtained('2026-08-17T01:00:00.000Z'), // ancient — but unbounded
  );
  assert.equal(out.status, 'ok');
});

test('terminalRefusals can end the leg on consultation-stale', async () => {
  const base = freshProfile('test.fresh.term.v1');
  const leg0 = base.legs[0];
  if (leg0 === undefined) throw new Error('fixture');
  const { handles } = freshSetup([
    { ...base, legs: [{ ...leg0, terminalRefusals: ['consultation-stale'] }] },
  ]);
  const recordId = await openRecord(handles, CONTENT, 'test.fresh.term.v1', 'subject:fr-4');
  const out = await handles.operator.finalize(
    recordId,
    identity(),
    CONTENT,
    facts(),
    obtained('2026-08-17T08:00:00.000Z'),
  );
  assert.equal(out.status, 'refused');
  const rec = await handles.operator.getRecord(recordId);
  assert.equal(rec?.state, 'refused');
  assert.equal(rec?.refusalCode, 'consultation-stale');
});

test('the presence contract: a NON-signing profile refuses observedAt at profile-resolution depth; intake rejects malformed shapes', async () => {
  const store = new MemoryStore();
  const plain = captureProfile({ id: 'test.fresh.plain.v1' });
  const leg0 = plain.legs[0];
  if (leg0 === undefined) throw new Error('fixture');
  const handles = create(
    makeConfig([{ ...plain, legs: [{ ...leg0, requiredConsultations: ['risk-check'] }] }], {
      store,
    }),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.fresh.plain.v1', 'subject:fr-5');
  await assert.rejects(
    handles.operator.finalize(
      recordId,
      identity(),
      CONTENT,
      facts(),
      obtained('2026-08-17T09:00:00.000Z'),
    ),
    /observedAt|signing|AL1/i,
  );

  // Intake, argument depth (before anything loads): malformed observedAt; a marker
  // carrying observedAt is the unknown-key throw.
  const { handles: h2 } = freshSetup();
  const r2 = await openRecord(h2, CONTENT, 'test.fresh.v1', 'subject:fr-6');
  await assert.rejects(
    h2.operator.finalize(r2, identity(), CONTENT, facts(), {
      consultations: [
        {
          kind: 'risk-check',
          checker: CHECKER,
          payloadDigest: DIGEST,
          verdict: 'pass',
          observedAt: 'not-a-time',
        },
      ],
    } as never),
    /observedAt/i,
  );
  await assert.rejects(
    h2.operator.finalize(r2, identity(), CONTENT, facts(), {
      consultations: [
        {
          kind: 'risk-check',
          unreachable: true,
          authority: 'svc:risk',
          observedAt: T0.toISOString(),
        },
      ],
    } as never),
    /unknown key|observedAt/i,
  );
});
