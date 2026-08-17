// @vidimera/record — live-capture.test.ts (SPEC §9.2's `live` mode, the live-capture
// increment): decide-what-exists over machinery already built. The staged-reference
// contract is UNCHANGED (the OQ §7 decision): stage binds the reviewed rendering,
// finalize's rung (4) recompute is the decide-time re-verification, and the mandated
// independent re-derivation rides rung (5.5) as an ordinary required consultation.
// `reverify` maps the redemption family's CONTENT mismatches to `content-drift`,
// appended terminal (the ordinary non-terminal path — a live profile's confirmed
// awaits redemption); the token half keeps `effect-mismatch`; the enlisted direct
// shape refuses result-first without appending (the family's settled discipline).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import { facts, identity, liveProfile, makeConfig, openRecord } from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const DRIFTED = { subject: 'week-1', total: 43 };
const SUBJ = 'subject:live-1';
const CHECKER = { principal: 'svc:rederive', authority: 'mtls:rederive' };
const DIGEST = `sha256:${'d'.repeat(64)}`;

function rederiveConsultation() {
  return {
    consultations: [
      { kind: 'rederive', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' as const },
    ],
  };
}

/** Opens+finalizes a live-mode record under `profileId` (default `'test.live.v1'`),
 * supplying the mandated re-derivation consultation. Returns the confirmed recordId. */
async function confirmedLive(
  handles: ReturnType<typeof create>,
  subjectRef: string,
  profileId = 'test.live.v1',
) {
  const recordId = await openRecord(handles, CONTENT, profileId, subjectRef);
  const done = await handles.operator.finalize(
    recordId,
    identity(),
    CONTENT,
    facts(),
    rederiveConsultation(),
  );
  assert.equal(done.status, 'ok', 'fixture: the live finalize must confirm');
  return recordId;
}

test('the live happy path: stage -> open -> gated finalize -> non-terminal confirmed -> redeem', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([liveProfile()], { store }));
  const recordId = await confirmedLive(handles, SUBJ);

  // The effect-seam predicate pin: a live final-leg confirmed AWAITS redemption —
  // non-terminal, so seal() refuses it (the seal.test.ts argument, at this mode).
  const sealed = await handles.operator.seal(recordId);
  assert.equal(sealed.status, 'refused');
  if (sealed.status === 'refused') assert.equal(sealed.code, 'unsealable-state');

  const out = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(out.status, 'ok');
  if (out.status === 'ok') assert.equal(out.value.state, 'redeemed');
});

test('the gated obligation fires: a live finalize without its required consultation refuses consultation-missing', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([liveProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.live.v1', 'subject:live-gate');
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'consultation-missing');
});

test('reverify at the direct shape: drift refuses content-drift with an APPENDED terminal edge, releasing the hold', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([liveProfile()], { store }));
  const recordId = await confirmedLive(handles, 'subject:live-drift');

  const out = await handles.operator.redeem(recordId, DRIFTED);
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'content-drift');
  assert.ok(out.transitionRef !== undefined, 'the refusal carries the appended edge');

  const rec = await handles.operator.getRecord(recordId);
  assert.equal(rec?.state, 'refused');
  assert.equal(rec?.refusalCode, 'content-drift');
  // Terminal — the (profile, subject) hold is RELEASED:
  const reopened = await openRecord(handles, CONTENT, 'test.live.v1', 'subject:live-drift');
  assert.ok(reopened.length > 0, 'a fresh record opens for the same pair');
});

test('the composition pin: the drift-refused record is a legal recovery predecessor', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([liveProfile()], { store }));
  const recordId = await confirmedLive(handles, 'subject:live-rec');
  const drift = await handles.operator.redeem(recordId, DRIFTED);
  assert.equal(drift.status, 'refused');
  const head = await handles.operator.chainHead(recordId);
  assert.ok(head !== null);

  const staged = await handles.agent.stage(CONTENT, 'test.live.v1', 'subject:live-rec');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const recovered = await handles.operator.open(staged.value.stagedRef, {
    supersedes: { recordId, chainHead: head },
  });
  assert.equal(recovered.status, 'ok', 'drift kills the decision; supersedes re-opens it');
});

test('reverify at the token shape: begin-time drift appends from confirmed; complete-time content drift appends from redeeming; a wrong token stays effect-mismatch', async () => {
  // Begin-time drift:
  const store1 = new MemoryStore();
  const h1 = create(makeConfig([liveProfile()], { store: store1 }));
  const r1 = await confirmedLive(h1, 'subject:live-b');
  const begun = await h1.operator.beginRedemption(r1, DRIFTED);
  assert.equal(begun.status, 'refused');
  if (begun.status === 'refused') assert.equal(begun.code, 'content-drift');
  assert.equal((await h1.operator.getRecord(r1))?.state, 'refused');

  // Complete-time content drift (begin clean, then drift):
  const store2 = new MemoryStore();
  const h2 = create(makeConfig([liveProfile()], { store: store2 }));
  const r2 = await confirmedLive(h2, 'subject:live-c');
  const issue = await h2.operator.beginRedemption(r2, CONTENT);
  assert.equal(issue.status, 'ok');
  if (issue.status !== 'ok') return;
  const complete = await h2.operator.completeRedemption(r2, issue.value.token, DRIFTED);
  assert.equal(complete.status, 'refused');
  if (complete.status === 'refused') assert.equal(complete.code, 'content-drift');
  assert.equal((await h2.operator.getRecord(r2))?.state, 'refused');

  // Wrong token, matching content — the token half is NOT drift:
  const store3 = new MemoryStore();
  const h3 = create(makeConfig([liveProfile()], { store: store3 }));
  const r3 = await confirmedLive(h3, 'subject:live-d');
  const issue3 = await h3.operator.beginRedemption(r3, CONTENT);
  assert.equal(issue3.status, 'ok');
  if (issue3.status !== 'ok') return;
  const lenBefore = (await h3.operator.readChain(r3)).length;
  const bad = await h3.operator.completeRedemption(r3, 'not-the-token', CONTENT);
  assert.equal(bad.status, 'refused');
  if (bad.status === 'refused') assert.equal(bad.code, 'effect-mismatch');
  assert.equal((await h3.operator.readChain(r3)).length, lenBefore, 'never-append');
});

test('a confirmToRedeem-only live profile keeps effect-mismatch (reverify undeclared)', async () => {
  const store = new MemoryStore();
  const profile = liveProfile({ id: 'test.live.age.v1' });
  profile.redeem = { confirmToRedeem: 3600 };
  const handles = create(makeConfig([profile], { store }));
  const recordId = await confirmedLive(handles, 'subject:live-e', 'test.live.age.v1');
  const lenBefore = (await handles.operator.readChain(recordId)).length;
  const out = await handles.operator.redeem(recordId, DRIFTED);
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'effect-mismatch');
  assert.equal((await handles.operator.readChain(recordId)).length, lenBefore);
});
