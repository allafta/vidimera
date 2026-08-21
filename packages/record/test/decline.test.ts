// @vidimera/record — decline.test.ts: the recorded-human-decline increment (SPEC §9's
// decline seam). This file owns the kind/state wiring pins, the construction pins, the
// seam's ladder pins, and the interaction pins.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import type { ConfirmProfile, LegSpec } from '../src/config.js';
import { create, createWithClock } from '../src/create.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, Verifier } from '../src/signing/store.js';
import { isStateLeaving, stateOf } from '../src/store/semantics.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

test('stateOf: declined maps to the declined state and is state-leaving', () => {
  assert.equal(stateOf('declined'), 'declined');
  assert.equal(isStateLeaving('declined'), true);
});

test('construction: decline must be the literal true when declared — the signing rule class', () => {
  const profile = captureProfile();
  (profile.legs[0] as unknown as Record<string, unknown>).decline = false;
  assert.throws(() => create(makeConfig([profile])), /literal true/i);
});

test('construction: a decline-declaring leg constructs', () => {
  assert.doesNotThrow(() => create(makeConfig([captureProfile({ decline: true })])));
});

const CHECKER = { principal: 'svc:hr-check', authority: 'mtls:hr-check' };
const DIGEST = `sha256:${'b'.repeat(64)}`;
const CONTENT = { amount: 40 };

async function declinable(overrides: Parameters<typeof captureProfile>[0] = {}) {
  const profile = captureProfile({ decline: true, ...overrides });
  const handles = create(makeConfig([profile]));
  const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  return { handles, recordId, profile };
}

test('decline: happy path — terminal declined, actor bound, batch mirrors confirm', async () => {
  const { handles, recordId } = await declinable();
  const res = await handles.operator.decline(recordId, identity(), CONTENT, facts(), {
    consultations: [
      { kind: 'decline-reason', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
    ],
  });
  assert.equal(res.status, 'ok');
  assert.equal(res.status === 'ok' && res.value.state, 'declined');

  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'declined');
  assert.deepEqual(record?.actor, identity());
  assert.deepEqual(
    record?.consultations.map((c) => c.kind),
    ['chain-verify', 'facts', 'decline-reason'],
  );
  const chain = await handles.operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => t.kind),
    [
      'opened',
      'consultation-recorded',
      'consultation-recorded',
      'consultation-recorded',
      'declined',
    ],
  );
});

test('decline: a non-declaring leg throws — the findings-seams posture', async () => {
  const profile = captureProfile(); // no decline
  const handles = create(makeConfig([profile]));
  const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  await assert.rejects(
    () => handles.operator.decline(recordId, identity(), CONTENT, facts()),
    /decline/,
  );
});

test('decline: unknown option keys throw — policy is deliberately not accepted', async () => {
  const { handles, recordId } = await declinable();
  await assert.rejects(
    () =>
      handles.operator.decline(recordId, identity(), CONTENT, facts(), {
        policy: { digest: DIGEST },
      } as never),
    /decline\(\) accepts only consultations/,
  );
});

test('decline: unknown recordId throws — caller error, never a refusal', async () => {
  const { handles } = await declinable();
  await assert.rejects(
    () => handles.operator.decline('rec_none', identity(), CONTENT, facts()),
    /unknown recordId/,
  );
});

test('decline rung (2): a due-open record resolves expired and refuses leg-expired', async () => {
  const profile = captureProfile({ decline: true, ttl: 60 });
  let nowMs = Date.parse('2026-08-21T00:00:00Z');
  const handles = createWithClock(makeConfig([profile]), () => new Date(nowMs));
  const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  nowMs += 120_000; // past the 60s ttl
  const res = await handles.operator.decline(recordId, identity(), CONTENT, facts());
  assert.equal(res.status, 'refused');
  assert.equal(res.status === 'refused' && res.code, 'leg-expired');
  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'expired'); // the en-passant edge landed
});

test('decline rung (2): a decided record refuses record-not-open', async () => {
  const { handles, recordId } = await declinable();
  const confirmed = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(confirmed.status, 'ok');
  const res = await handles.operator.decline(recordId, identity(), CONTENT, facts());
  assert.equal(res.status, 'refused');
  assert.equal(res.status === 'refused' && res.code, 'record-not-open');
});

test('decline rung (3): a disallowed authority refuses identity-authority-refused', async () => {
  const { handles, recordId } = await declinable();
  const res = await handles.operator.decline(
    recordId,
    identity({ authority: 'session:other-app' }),
    CONTENT,
    facts(),
  );
  assert.equal(res.status, 'refused');
  assert.equal(res.status === 'refused' && res.code, 'identity-authority-refused');
});

test('decline rung (3.5): the proposer may not decline their own leg', async () => {
  const profile = captureProfile({ decline: true });
  // `proposer` is construction-scoped to multi-leg profiles (config.ts's validateSodShape:
  // "SPEC §10.1 applies when the profile declares more than one leg" — a deliberate,
  // conservative reading pinned by construction-validation.test.ts's "proposer on a
  // SINGLE-LEG profile throws" test). The leg under test stays first (no prior-leg refs
  // needed to open it); a second leg is added only to satisfy that construction guard.
  profile.legs = [
    { ...profile.legs[0], proposer: 'agent:writer' } as LegSpec,
    { id: 'checker-decide', allowedAuthorities: ['session:test-app'] },
  ];
  const handles = create(makeConfig([profile]));
  const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  const res = await handles.operator.decline(
    recordId,
    identity({ principal: 'agent:writer' }),
    CONTENT,
    facts(),
  );
  assert.equal(res.status, 'refused');
  assert.equal(res.status === 'refused' && res.code, 'sod-violation');
});

test('decline rung (4): content drift refuses open-by-default, terminal when listed', async () => {
  const { handles, recordId } = await declinable();
  const drifted = await handles.operator.decline(recordId, identity(), { amount: 41 }, facts());
  assert.equal(drifted.status, 'refused');
  assert.equal(drifted.status === 'refused' && drifted.code, 'content-drift');
  const stillOpen = await handles.operator.getRecord(recordId);
  assert.equal(stillOpen?.state, 'open'); // no append by default

  const terminal = await declinable({ terminalRefusals: ['content-drift'] });
  const drifted2 = await terminal.handles.operator.decline(
    terminal.recordId,
    identity(),
    { amount: 41 },
    facts(),
  );
  assert.equal(drifted2.status, 'refused');
  const after = await terminal.handles.operator.getRecord(terminal.recordId);
  assert.equal(after?.state, 'refused'); // the appendsOn rule, unchanged
});

test('decline rung (5): missing facts refuses consultation-missing', async () => {
  const { handles, recordId } = await declinable();
  const res = await handles.operator.decline(recordId, identity(), CONTENT, {
    figures: undefined,
    checker: facts().checker,
  } as never);
  assert.equal(res.status, 'refused');
  assert.equal(res.status === 'refused' && res.code, 'consultation-missing');
});

test('decline ladder order: each rung wins over the one after it (adjacent pairs)', async () => {
  {
    // (3) identity beats (3.5) SoD: disallowed authority AND proposer-violating principal
    const profile = captureProfile({ decline: true });
    // Two legs, same construction-scoping reason as above — the leg under test stays first.
    profile.legs = [
      { ...profile.legs[0], proposer: 'agent:writer' } as LegSpec,
      { id: 'checker-decide', allowedAuthorities: ['session:test-app'] },
    ];
    const handles = create(makeConfig([profile]));
    const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
    const res = await handles.operator.decline(
      recordId,
      { principal: 'agent:writer', authority: 'session:other-app' },
      CONTENT,
      facts(),
    );
    assert.equal(res.status === 'refused' && res.code, 'identity-authority-refused');
  }
  {
    // (3.5) SoD beats (4) drift: proposer-violating principal AND drifted content
    const profile = captureProfile({ decline: true });
    // Two legs, same construction-scoping reason as above — the leg under test stays first.
    profile.legs = [
      { ...profile.legs[0], proposer: 'agent:writer' } as LegSpec,
      { id: 'checker-decide', allowedAuthorities: ['session:test-app'] },
    ];
    const handles = create(makeConfig([profile]));
    const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
    const res = await handles.operator.decline(
      recordId,
      identity({ principal: 'agent:writer' }),
      { amount: 41 },
      facts(),
    );
    assert.equal(res.status === 'refused' && res.code, 'sod-violation');
  }
  {
    // (4) drift beats (5) facts: drifted content AND missing facts
    const { handles, recordId } = await declinable();
    const res = await handles.operator.decline(recordId, identity(), { amount: 41 }, {
      figures: undefined,
      checker: facts().checker,
    } as never);
    assert.equal(res.status === 'refused' && res.code, 'content-drift');
  }
  {
    // (5) facts beats (5.5) eligibility: missing facts AND missing eligibility input
    const { handles, recordId } = await declinable({ eligibility: 'hr.decliner-check' });
    const res = await handles.operator.decline(recordId, identity(), CONTENT, {
      figures: undefined,
      checker: facts().checker,
    } as never);
    assert.equal(res.status === 'refused' && res.code, 'consultation-missing');
    // Distinguishable from eligibility's own consultation-missing only by the rung — this
    // pair pins that a facts-less call refuses at (5) BEFORE (5.5) is consulted: supply the
    // eligibility consultation and the SAME facts-less call still refuses consultation-missing.
    const res2 = await handles.operator.decline(
      recordId,
      identity(),
      CONTENT,
      { figures: undefined, checker: facts().checker } as never,
      {
        consultations: [
          { kind: 'eligibility', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
        ],
      },
    );
    assert.equal(res2.status === 'refused' && res2.code, 'consultation-missing');
  }
});

const ELIGIBLE = {
  kind: 'eligibility',
  checker: CHECKER,
  payloadDigest: DIGEST,
  verdict: 'pass' as const,
};

test('decline (5.5): eligibility trip mapping — missing, fail, unreachable, pass', async () => {
  const setup = () => declinable({ eligibility: 'hr.decliner-check' });

  {
    // missing → consultation-missing, record stays open
    const { handles, recordId } = await setup();
    const res = await handles.operator.decline(recordId, identity(), CONTENT, facts());
    assert.equal(res.status === 'refused' && res.code, 'consultation-missing');
    assert.equal((await handles.operator.getRecord(recordId))?.state, 'open');
  }
  {
    // fail → ineligible, open-by-default; a different eligible actor may still decline
    const { handles, recordId } = await setup();
    const res = await handles.operator.decline(recordId, identity(), CONTENT, facts(), {
      consultations: [{ ...ELIGIBLE, verdict: 'fail' }],
    });
    assert.equal(res.status === 'refused' && res.code, 'ineligible');
    const retry = await handles.operator.decline(recordId, identity(), CONTENT, facts(), {
      consultations: [ELIGIBLE],
    });
    assert.equal(retry.status, 'ok');
  }
  {
    // unreachable → the availability outcome, no append, seam re-arms
    const { handles, recordId } = await setup();
    const res = await handles.operator.decline(recordId, identity(), CONTENT, facts(), {
      consultations: [{ kind: 'eligibility', unreachable: true, authority: 'svc:hr' }],
    });
    assert.equal(res.status, 'unavailable');
    assert.equal(res.status === 'unavailable' && res.authority, 'svc:hr');
    assert.equal((await handles.operator.getRecord(recordId))?.state, 'open');
  }
  {
    // pass → declined, the eligibility consultation recorded in the batch
    const { handles, recordId } = await setup();
    const res = await handles.operator.decline(recordId, identity(), CONTENT, facts(), {
      consultations: [ELIGIBLE],
    });
    assert.equal(res.status, 'ok');
    const record = await handles.operator.getRecord(recordId);
    assert.ok(record?.consultations.some((c) => c.kind === 'eligibility'));
  }
});

test('decline: evidence rungs are SKIPPED — a failing required consultation, an un-acked required finding, and a policy profile all still decline', async () => {
  {
    // requiredConsultations not iterated: no risk-check supplied, decline succeeds
    const { handles, recordId } = await declinable({ requiredConsultations: ['risk-check'] });
    const res = await handles.operator.decline(recordId, identity(), CONTENT, facts());
    assert.equal(res.status, 'ok');
  }
  {
    // ack coverage (5.7) skipped: an un-acked requiredAcks finding blocks finalize, not decline
    const profile = captureProfile({ decline: true });
    profile.legs[0] = { ...profile.legs[0], ackMode: 'any', requiredAcks: ['variance'] } as LegSpec;
    const handles = create(makeConfig([profile]));
    const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
    const raised = await handles.operator.raiseFinding(
      recordId,
      { findingId: 'f1', kind: 'variance', findingDigest: DIGEST },
      identity(),
    );
    assert.equal(raised.status, 'ok');
    const res = await handles.operator.decline(recordId, identity(), CONTENT, facts());
    assert.equal(res.status, 'ok'); // the finding stays visible on the declined chain
    const record = await handles.operator.getRecord(recordId);
    assert.equal(record?.findings?.length, 1);
  }
  {
    // policy: a declaring profile's decline takes no policy input and does not drift-gate
    const profile = captureProfile({ decline: true });
    profile.policySource = 'spend-limits';
    const handles = create(makeConfig([profile]));
    const staged = await handles.agent.stage(CONTENT, profile.id, DEFAULT_SUBJECT_REF);
    assert.equal(staged.status, 'ok');
    const opened = await handles.operator.open(
      staged.status === 'ok' ? staged.value.stagedRef : '',
      { policyDigest: DIGEST },
    );
    assert.equal(opened.status, 'ok');
    const recordId = opened.status === 'ok' ? opened.value.recordId : '';
    const res = await handles.operator.decline(recordId, identity(), CONTENT, facts());
    assert.equal(res.status, 'ok'); // no policy option required, none accepted
  }
});

test('decline: observedAt on a non-signing profile throws — the AL2 presence contract shared with finalize', async () => {
  const { handles, recordId } = await declinable();
  await assert.rejects(
    () =>
      handles.operator.decline(recordId, identity(), CONTENT, facts(), {
        consultations: [
          {
            kind: 'decline-reason',
            checker: CHECKER,
            payloadDigest: DIGEST,
            verdict: 'pass',
            observedAt: '2026-08-21T00:00:00Z',
          },
        ],
      } as never),
    /observedAt/,
  );
});

test('decline (5.5), AL2: a signing profile with an eligibility freshness bound refuses a stale claim consultation-stale', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const signer: Signer = async (bytes) => ({
    keyRef: 'key-1',
    signature: edSign(null, bytes, privateKey).toString('base64'),
  });
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  const base = captureProfile({ decline: true, eligibility: 'hr.decliner-check' });
  const leg = base.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  const profile: ConfirmProfile = {
    ...base,
    signing: true,
    legs: [{ ...leg, freshness: { eligibility: 60 } }],
  };
  const config = {
    ...makeConfig([profile]),
    signing: { signer, verifiers: { 'key-1': verifier }, signatures: new MemorySignatureStore() },
  };
  const nowMs = Date.parse('2026-08-21T00:00:00Z');
  const handles = createWithClock(config, () => new Date(nowMs));
  const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  const res = await handles.operator.decline(recordId, identity(), CONTENT, facts(), {
    consultations: [{ ...ELIGIBLE, observedAt: '2026-08-20T22:00:00Z' }], // 2h old vs 60s bound
  });
  assert.equal(res.status === 'refused' && res.code, 'consultation-stale');
});
