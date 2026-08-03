// @vidimera/record — facts.test.ts (SPEC §3's reviewed-surface (`facts`) binding,
// enforced by default per SPEC §9): finalize() requires a fresh
// reviewed-surface digest — missing/malformed `facts` → `consultation-missing`. Present
// facts are recorded as a `consultation-recorded` kind:`facts` whose `checker` is the
// REVIEW-SURFACE identity `facts.checker` (distinct from the finalizing actor) and whose
// `payloadDigest = digest(canonicalize(facts.figures))` through LIBRARY JCS ONLY — NOT the
// profile's content-adopter canonicalizer (figures are the reviewed-surface rendering
// artifact, not the bound content, O1). On success the batch appends [chain-verify, facts,
// confirmed].

import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Canonicalizer } from '../src/canonical.js';
import { canonicalize, digest } from '../src/canonical.js';
import { create } from '../src/create.js';
import type { Consultation } from '../src/types.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const PROFILE_ID = 'test.capture.v1';
const CONTENT = { subject: 'week-1', total: 40 };

// === missing / malformed facts → consultation-missing ================================

test('finalize() with facts MISSING figures → consultation-missing (default leg: no append)', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const noFigures = {
    figures: undefined,
    checker: identity({ principal: 'svc:review', authority: 'mtls:review' }),
  };
  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, noFigures);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'consultation-missing');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined);

  const chain = await handles.operator.readChain(recordId);
  assert.equal(chain.length, 1, 'the record stays open — no consultation, no confirm');
});

test('finalize() with facts MISSING checker → consultation-missing', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const noChecker = {
    figures: { total: 40 },
    checker: undefined as unknown as ReturnType<typeof identity>,
  };
  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, noChecker);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'consultation-missing');
});

test('T3.3: finalize() with facts figures that are NOT canonicalizable (a BigInt) → consultation-missing, NO throw, the record stays open', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  // figures carry a BigInt — library JCS (`canonicalize`, RFC-8785) THROWS on it ("Do not know
  // how to serialize a BigInt"). A present-but-UNUSABLE facts payload is not a valid facts
  // payload: isValidFacts must guard canonicalizability and refuse `consultation-missing`, NOT
  // let the throw escape mid-batch at the facts-digest step. (Pre-T3.3 isValidFacts returned a
  // bare boolean without canonicalizing, so the BigInt threw uncaught at the batch digest.)
  const bigIntFigures = {
    figures: { total: 10n },
    checker: identity({ principal: 'svc:review-surface', authority: 'mtls:review-surface' }),
  };
  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, bigIntFigures);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'consultation-missing');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined);

  const chain = await handles.operator.readChain(recordId);
  assert.equal(
    chain.length,
    1,
    'the record stays open — no consultation, no confirm (default leg does not list consultation-missing terminal)',
  );
});

// === present facts → recorded consultation + success batch ===========================

test('finalize() with present facts records a kind:facts consultation whose checker is facts.checker (≠ the finalizing actor)', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const actor = identity({ principal: 'approver:1', authority: 'session:test-app' });
  const reviewSurface = {
    figures: { total: 40, currency: 'SEK' },
    checker: { principal: 'svc:review-surface', authority: 'mtls:review-surface' },
  };

  const outcome = await handles.operator.finalize(recordId, actor, CONTENT, reviewSurface);
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;
  assert.equal(outcome.value.state, 'confirmed');

  const chain = await handles.operator.readChain(recordId);
  // success batch order: [opened, chain-verify consultation, facts consultation, confirmed]
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'consultation-recorded', 'consultation-recorded', 'confirmed'],
  );

  const t2 = chain[2];
  if (t2 === undefined) throw new Error('facts.test.ts: chain[2] out of range');
  const factsConsultation = t2.payload as Consultation;
  assert.equal(factsConsultation.kind, 'facts');
  assert.equal(factsConsultation.verdict, 'pass');
  // checker is the review-surface identity, NOT the finalizing actor.
  assert.deepEqual(factsConsultation.checker, {
    principal: 'svc:review-surface',
    authority: 'mtls:review-surface',
  });
  assert.notEqual(
    factsConsultation.checker.principal,
    actor.principal,
    'the facts checker is not the actor',
  );

  // payloadDigest is the LIBRARY-JCS digest of the figures.
  assert.equal(
    factsConsultation.payloadDigest,
    digest(canonicalize({ total: 40, currency: 'SEK' })),
  );

  // The confirmed edge's actor is the finalizing identity.
  const t3 = chain[3];
  if (t3 === undefined) throw new Error('facts.test.ts: chain[3] out of range');
  assert.deepEqual((t3.payload as { actor: unknown }).actor, actor);
});

test('the success batch is [chain-verify, facts, confirmed] and the resulting chain verifies intact', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  // The chain-verify consultation's payloadDigest is the verified head (the chainHead BEFORE finalize).
  const headBefore = await handles.operator.chainHead(recordId);

  const outcome = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;

  const chain = await handles.operator.readChain(recordId);
  const t1 = chain[1];
  if (t1 === undefined) throw new Error('facts.test.ts: chain[1] out of range');
  const chainVerify = t1.payload as Consultation;
  assert.equal(chainVerify.kind, 'chain-verify');
  assert.equal(chainVerify.verdict, 'pass');
  assert.equal(
    chainVerify.payloadDigest,
    headBefore,
    'chain-verify consultation payloadDigest = the verified head',
  );
  assert.equal(
    chainVerify.checker.principal,
    'system:chain-verify',
    'chain-verify checker is the well-known SYSTEM_CHECKER',
  );

  // The whole resulting chain (built with sequential seq/prevHash chaining) verifies intact.
  const report = await handles.operator.verifyChain(recordId);
  assert.equal(report.intact, true);

  // The returned transitionRef is the confirmed edge's digest (the chain head after finalize).
  assert.equal(outcome.value.transitionRef, await handles.operator.chainHead(recordId));
});

// === O1 pin: an adopter canonicalizer does NOT affect the facts figures digest =======

test('the facts payloadDigest goes through LIBRARY JCS ONLY — an adopter canonicalizer that WOULD change the figures encoding does not affect it (O1)', async () => {
  // A NON-identity adopter canonicalizer: it injects a marker key. It is the profile's
  // CONTENT canonicalizer — used to bind/re-check content — but MUST NOT touch facts.figures.
  const touchingCanonicalizer: Canonicalizer = (c) => ({
    ...(c as object),
    __adopterTouched: true,
  });
  const CANON_REF = 'test.touching.v1';
  const profile = captureProfile({ canonicalizerRef: CANON_REF });
  const handles = create(
    makeConfig([profile], { canonicalizers: { [CANON_REF]: touchingCanonicalizer } }),
  );

  // stage + open with the touching canonicalizer applied to CONTENT (so contentDigest reflects it).
  const staged = await handles.agent.stage(CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef);
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;
  const recordId = opened.value.recordId;

  const figures = { total: 40, currency: 'SEK' };
  // finalize with the SAME content (so it re-binds through the adopter and does not drift).
  const outcome = await handles.operator.finalize(
    recordId,
    identity(),
    CONTENT,
    facts({ figures }),
  );
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;

  const chain = await handles.operator.readChain(recordId);
  const t2 = chain[2];
  if (t2 === undefined) throw new Error('facts.test.ts: chain[2] out of range');
  const factsConsultation = t2.payload as Consultation;

  // The facts digest is LIBRARY-JCS over the RAW figures — NOT the adopter-touched figures.
  const libraryOnly = digest(canonicalize(figures));
  const ifAdopterHadTouched = digest(canonicalize(touchingCanonicalizer(figures)));
  assert.equal(
    factsConsultation.payloadDigest,
    libraryOnly,
    'facts digest = library JCS over the raw figures',
  );
  assert.notEqual(
    factsConsultation.payloadDigest,
    ifAdopterHadTouched,
    'the adopter canonicalizer never touches figures',
  );
});
