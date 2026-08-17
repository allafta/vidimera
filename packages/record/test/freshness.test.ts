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
import { isFinalLeg, nonTerminal } from '../src/nonterminal.js';
import { profileDigest } from '../src/profile-digest.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Consultation } from '../src/types.js';
import { buildChain } from './helpers/chain.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
  tamperNonLast,
} from './helpers/profiles.js';
import { TamperingStore } from './helpers/stores.js';

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

test('an explicit non-Z offset claim gates on its converted UTC instant (the AL2 freshness increment, final review)', async () => {
  const { handles } = freshSetup();
  const recordId = await openRecord(handles, CONTENT, 'test.fresh.v1', 'subject:fr-offset');
  // 2026-08-17T11:45:00+02:00 === 2026-08-17T09:45:00.000Z — 15 minutes before T0
  // (2026-08-17T10:00:00.000Z), well inside the 3600s bound.
  const out = await handles.operator.finalize(
    recordId,
    identity(),
    CONTENT,
    facts(),
    obtained('2026-08-17T11:45:00+02:00'),
  );
  assert.equal(out.status, 'ok');
  assert.equal(
    Date.parse('2026-08-17T11:45:00+02:00'),
    Date.parse('2026-08-17T09:45:00.000Z'),
    "sanity: the offset converts to the same instant as the equivalent 'Z' claim",
  );
});

test('the prototype-key guard: a leg requiring "toString" alongside a freshness-bound kind is not spuriously bound by inherited Object.prototype.toString (the AL2 freshness increment, final review)', async () => {
  const p = captureProfile({ id: 'test.fresh.proto.v1' });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture');
  const protoProfile: ConfirmProfile = {
    ...p,
    signing: true,
    legs: [
      {
        ...leg,
        requiredConsultations: ['toString', 'risk-check'],
        freshness: { 'risk-check': 3600 }, // bounds a DIFFERENT key — 'toString' stays unbounded
      },
    ],
  };
  const { handles } = freshSetup([protoProfile]);
  const recordId = await openRecord(handles, CONTENT, 'test.fresh.proto.v1', 'subject:fr-proto');
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [
      { kind: 'toString', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
      {
        kind: 'risk-check',
        checker: CHECKER,
        payloadDigest: DIGEST,
        verdict: 'pass',
        observedAt: '2026-08-17T09:45:00.000Z', // 15 minutes old, inside the 3600s bound
      },
    ],
  });
  assert.equal(
    out.status,
    'ok',
    "leg.freshness has no OWN 'toString' key — a plain-object lookup must say so via " +
      'Object.hasOwn, never inherit Object.prototype.toString',
  );
});

test('the marker arm precedes the freshness arm: an UNREACHABLE marker on a required, freshness-bounded kind yields availability, never consultation-stale', async () => {
  const { handles } = freshSetup();
  const recordId = await openRecord(handles, CONTENT, 'test.fresh.v1', 'subject:fr-unavail');
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [{ kind: 'risk-check', unreachable: true, authority: 'svc:risk' }],
  });
  assert.equal(out.status, 'unavailable');
  if (out.status === 'unavailable') assert.equal(out.code, 'availability');
  assert.equal(
    (await handles.operator.getRecord(recordId))?.state,
    'open',
    'no observation exists to evaluate — the record stays open for bounded retry',
  );
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

test('the implicit-first eligibility kind is bound by its own freshness entry too: a stale eligibility consultation refuses consultation-stale; a fresh one proceeds', async () => {
  // SPEC §10.4's implicit-FIRST 'eligibility' kind is just another entry in rung 5.5's
  // effective-kinds loop — this profile declares NO ordinary requiredConsultations at
  // all, so 'eligibility' is the only kind the gate ever checks, isolating that the
  // freshness arm runs on the implicit kind exactly as it does on a declared one.
  const p = captureProfile({ id: 'test.fresh.elig.v1' });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  const eligibilityProfile: ConfirmProfile = {
    ...p,
    signing: true,
    legs: [{ ...leg, eligibility: 'hr.approver-check', freshness: { eligibility: 3600 } }],
  };
  const { handles } = freshSetup([eligibilityProfile]);
  const recordId = await openRecord(handles, CONTENT, 'test.fresh.elig.v1', 'subject:fr-elig-1');

  const stale = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [
      {
        kind: 'eligibility',
        checker: CHECKER,
        payloadDigest: DIGEST,
        verdict: 'pass',
        observedAt: '2026-08-17T08:00:00.000Z', // two hours old vs the 3600s bound
      },
    ],
  });
  assert.equal(stale.status, 'refused');
  if (stale.status === 'refused') assert.equal(stale.code, 'consultation-stale');
  assert.equal((await handles.operator.getRecord(recordId))?.state, 'open', 'open for re-run');

  const fresh = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [
      {
        kind: 'eligibility',
        checker: CHECKER,
        payloadDigest: DIGEST,
        verdict: 'pass',
        observedAt: '2026-08-17T09:45:00.000Z', // 15 minutes old
      },
    ],
  });
  assert.equal(fresh.status, 'ok', 'a fresh eligibility claim clears rung 5.5 and confirms');
});

test('the presence contract: a NON-signing profile throws on observedAt at profile-resolution depth; intake rejects malformed shapes', async () => {
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

test('the adjacency pin: a tampered chain refuses chain-compromise BEFORE the observedAt presence contract ever runs (non-signing profile)', async () => {
  // Rung (1) chain-verify precedes EVERY later rung, presence contracts included — the
  // same ordering shape §10.3's own policy presence contract already stands on. A
  // non-signing profile's observedAt-carrying consultation WOULD throw the presence
  // contract's error if that rung were ever reached; a tampered chain must never let it
  // get there — the compromise wins, result-first, no throw.
  const inner = new MemoryStore();
  const plain = captureProfile({ id: 'test.fresh.adj.v1' });
  const leg0 = plain.legs[0];
  if (leg0 === undefined) throw new Error('fixture');
  const profile: ConfirmProfile = {
    ...plain,
    legs: [{ ...leg0, requiredConsultations: ['risk-check'] }],
  };
  const legId = leg0.id;
  const recordId = 'rec-fresh-adjacency';
  const openedPayload = {
    profileId: profile.id,
    profileDigest: profileDigest(profile),
    legId,
    subjectRef: DEFAULT_SUBJECT_REF,
    contentDigest: 'sha256:adjacency1',
  };
  const factsConsultation: Consultation = {
    kind: 'facts',
    checker: { principal: 'svc:review-surface', authority: 'mtls:review-surface' },
    at: '2026-07-24T00:30:00.000Z',
    payloadDigest: 'sha256:adjacency2',
    verdict: 'pass',
  };
  // [opened, consultation-recorded] — a non-last transition to tamper (tamperNonLast
  // needs >= 2 transitions; a last-element tamper is the documented AL1 blind spot).
  const chain = buildChain(recordId, [
    { kind: 'opened', payload: openedPayload },
    { kind: 'consultation-recorded', payload: factsConsultation },
  ]);
  const openedTransition = chain[0];
  const consultationTransition = chain[1];
  if (openedTransition === undefined || consultationTransition === undefined) {
    throw new Error('freshness.test.ts: buildChain must return transitions at index 0 and 1');
  }
  const openNT = nonTerminal('open', isFinalLeg(0, 1), false);
  assert.equal(
    (await inner.appendTransition(null, openedTransition, { nonTerminal: openNT })).appended,
    true,
  );
  assert.equal(
    (await inner.appendTransition('open', consultationTransition, { nonTerminal: openNT }))
      .appended,
    true,
  );

  const store = new TamperingStore(inner, recordId, (c) => tamperNonLast(c));
  const { operator } = create(makeConfig([profile], { store }));

  const outcome = await operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [
      {
        kind: 'risk-check',
        checker: CHECKER,
        payloadDigest: DIGEST,
        verdict: 'pass',
        observedAt: T0.toISOString(),
      },
    ],
  });
  assert.equal(outcome.status, 'refused');
  if (outcome.status === 'refused') assert.equal(outcome.code, 'chain-compromise');
});
