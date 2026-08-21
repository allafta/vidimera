// @vidimera/record — provenance.test.ts: the proposal-provenance increment (SPEC §2's
// proposedDigest binding, §9's open-time `proposed` option).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create } from '../src/create.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
} from './helpers/profiles.js';

const P1 = { amount: 8.0 };
const P2 = { amount: 6.5, internal: 1.5 };

function handlesFor(profile = captureProfile()) {
  return { handles: create(makeConfig([profile])), profile };
}

async function stageBoth(handles: ReturnType<typeof create>, profileId: string) {
  const p1 = await handles.agent.stage(P1, profileId, DEFAULT_SUBJECT_REF);
  const p2 = await handles.agent.stage(P2, profileId, DEFAULT_SUBJECT_REF);
  assert.equal(p1.status, 'ok');
  assert.equal(p2.status, 'ok');
  return {
    p1: p1.status === 'ok' ? p1.value.stagedRef : '',
    p2: p2.status === 'ok' ? p2.value.stagedRef : '',
  };
}

test('provenance: the revised draft opens carrying the proposal digest — decided differs from proposed', async () => {
  const { handles, profile } = handlesFor();
  const { p1, p2 } = await stageBoth(handles, profile.id);
  const opened = await handles.operator.open(p2, { proposed: { stagedRef: p1 } });
  assert.equal(opened.status, 'ok');
  const recordId = opened.status === 'ok' ? opened.value.recordId : '';

  const record = await handles.operator.getRecord(recordId);
  assert.ok(record?.proposedDigest !== undefined);
  assert.notEqual(record?.proposedDigest, record?.contentDigest);

  // ReviewView does NOT project it (the supersedes precedent).
  const view = await handles.operator.review(recordId);
  assert.equal(view.status, 'ok');
  assert.equal(view.status === 'ok' && 'proposedDigest' in view.value, false);

  // Nothing gates on it: finalize confirms the record unchanged.
  const confirmed = await handles.operator.finalize(recordId, identity(), P2, facts());
  assert.equal(confirmed.status, 'ok');
});

test('provenance: unchanged acceptance — opening the proposal itself, digests equal', async () => {
  const { handles, profile } = handlesFor();
  const { p1 } = await stageBoth(handles, profile.id);
  const opened = await handles.operator.open(p1, { proposed: { stagedRef: p1 } });
  assert.equal(opened.status, 'ok');
  const record = await handles.operator.getRecord(
    opened.status === 'ok' ? opened.value.recordId : '',
  );
  assert.equal(record?.proposedDigest, record?.contentDigest);
});

test('provenance: an unresolvable proposed reference throws — caller error, never a refusal', async () => {
  const { handles, profile } = handlesFor();
  const { p2 } = await stageBoth(handles, profile.id);
  await assert.rejects(
    () => handles.operator.open(p2, { proposed: { stagedRef: 'staged_nothing' } }),
    /unknown proposed stagedRef/,
  );
});

test('provenance: a cross-triple proposed reference throws naming the mismatch — subject and profile arms', async () => {
  const profileA = captureProfile();
  const profileB = captureProfile({ id: 'test.capture.other.v1' });
  const handles = create(makeConfig([profileA, profileB]));
  const { p1 } = await stageBoth(handles, profileA.id);

  // Wrong SUBJECT: a draft for another subject cannot claim p1 as its proposal.
  const otherSubject = await handles.agent.stage(P2, profileA.id, 'subject:other');
  assert.equal(otherSubject.status, 'ok');
  await assert.rejects(
    () =>
      handles.operator.open(otherSubject.status === 'ok' ? otherSubject.value.stagedRef : '', {
        proposed: { stagedRef: p1 },
      }),
    /same/i, // the same-triple rule, both triples named in the message
  );

  // Wrong PROFILE: a draft under another profile cannot claim p1 either.
  const otherProfile = await handles.agent.stage(P2, profileB.id, DEFAULT_SUBJECT_REF);
  assert.equal(otherProfile.status, 'ok');
  await assert.rejects(
    () =>
      handles.operator.open(otherProfile.status === 'ok' ? otherProfile.value.stagedRef : '', {
        proposed: { stagedRef: p1 },
      }),
    /same/i,
  );
});

test('provenance: a malformed proposed option throws at intake', async () => {
  const { handles, profile } = handlesFor();
  const { p2 } = await stageBoth(handles, profile.id);
  await assert.rejects(() => handles.operator.open(p2, { proposed: {} } as never), /stagedRef/);
  await assert.rejects(
    () => handles.operator.open(p2, { proposed: { stagedRef: '' } } as never),
    /stagedRef/,
  );
  await assert.rejects(
    () =>
      handles.operator.open(p2, {
        proposed: { stagedRef: p2, extra: 1 },
      } as never),
    /unknown key|exactly/i,
  );
});
