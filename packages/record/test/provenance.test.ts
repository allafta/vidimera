// @vidimera/record — provenance.test.ts: the proposal-provenance increment (SPEC §2's
// proposedDigest binding, §9's open-time `proposed` option).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  liveProfile,
  makeConfig,
  twoLegProfile,
} from './helpers/profiles.js';
import { signingSetup } from './helpers/signing.js';

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

// --- composition and interplay pins (this task): provenance against the other kernel
// seams — recovery, multi-leg, signing, live capture -------------------------------------

test('provenance composes with recovery: a rework re-open carries supersedes AND proposed', async () => {
  // Also the decline-ungated-by-provenance pin: `first` carries a proposedDigest and its
  // decline() call below succeeds unconditionally — decline's ladder (SPEC §9: state,
  // identity, SoD, drift, facts, eligibility) never gates on provenance.
  const profile = captureProfile({ decline: true });
  const handles = create(makeConfig([profile]));
  const { p1, p2 } = await stageBoth(handles, profile.id);

  const first = await handles.operator.open(p1, { proposed: { stagedRef: p1 } });
  assert.equal(first.status, 'ok');
  const firstId = first.status === 'ok' ? first.value.recordId : '';
  const declined = await handles.operator.decline(firstId, identity(), P1, facts());
  assert.equal(declined.status, 'ok');

  const chain = await handles.operator.readChain(firstId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  const reopened = await handles.operator.open(p2, {
    supersedes: { recordId: firstId, chainHead: transitionDigest(last) },
    proposed: { stagedRef: p1 },
  });
  assert.equal(reopened.status, 'ok');
  const record = await handles.operator.getRecord(
    reopened.status === 'ok' ? reopened.value.recordId : '',
  );
  assert.ok(record?.supersedes !== undefined);
  assert.ok(record?.proposedDigest !== undefined);
  assert.notEqual(record?.proposedDigest, record?.contentDigest);
});

test('provenance is per-leg on a multi-leg profile', async () => {
  const profile = twoLegProfile();
  const handles = create(makeConfig([profile]));
  // Leg 1: proposal and revision for maker-decide.
  const m1 = await handles.agent.stage(P1, profile.id, DEFAULT_SUBJECT_REF, 'maker-decide');
  const m2 = await handles.agent.stage(P2, profile.id, DEFAULT_SUBJECT_REF, 'maker-decide');
  assert.equal(m1.status, 'ok');
  assert.equal(m2.status, 'ok');
  const leg1 = await handles.operator.open(m2.status === 'ok' ? m2.value.stagedRef : '', {
    proposed: { stagedRef: m1.status === 'ok' ? m1.value.stagedRef : '' },
  });
  assert.equal(leg1.status, 'ok');
  const leg1Id = leg1.status === 'ok' ? leg1.value.recordId : '';
  const confirmed = await handles.operator.finalize(leg1Id, identity(), P2, facts());
  assert.equal(confirmed.status, 'ok');

  // A cross-LEG proposed reference throws (the same-triple rule).
  const c1 = await handles.agent.stage(P1, profile.id, DEFAULT_SUBJECT_REF, 'checker-decide');
  assert.equal(c1.status, 'ok');
  const chain = await handles.operator.readChain(leg1Id);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  await assert.rejects(
    () =>
      handles.operator.open(c1.status === 'ok' ? c1.value.stagedRef : '', {
        priorRecordRefs: [{ recordId: leg1Id, chainHead: transitionDigest(last) }],
        proposed: { stagedRef: m1.status === 'ok' ? m1.value.stagedRef : '' },
      }),
    /same/i,
  );
});

test('provenance on a signing profile: the genesis carrying proposedDigest is signed and verified', async () => {
  // Mirrors decline.test.ts's signed-decline test exactly (same signingSetup helper, same
  // SignatureReport assertions), with open()'s proposed option as the act under test in
  // place of decline(). No finalize is needed for the pin — verifySignatures reads
  // whatever chain exists, and with no finalize that chain is just the genesis (seq 1),
  // which is where this pin's focus lands.
  const profile: ConfirmProfile = { ...captureProfile(), signing: true };
  const { handles } = signingSetup(profile);
  const { p1, p2 } = await stageBoth(handles, profile.id);
  const opened = await handles.operator.open(p2, { proposed: { stagedRef: p1 } });
  assert.equal(opened.status, 'ok');
  const recordId = opened.status === 'ok' ? opened.value.recordId : '';

  const report = await handles.operator.verifySignatures(recordId);
  assert.equal(report.signingDeclared, true);
  const chain = await handles.operator.readChain(recordId);
  assert.equal(report.transitions.length, chain.length);
  assert.ok(
    report.transitions.every((t) => t.signed === true && t.verified === true),
    'the genesis transition (seq 1) is signed and verified',
  );
});

test('provenance on a live profile: the same seam, identically', async () => {
  const profile = liveProfile();
  const handles = create(makeConfig([profile]));
  const { p1, p2 } = await stageBoth(handles, profile.id);
  const opened = await handles.operator.open(p2, { proposed: { stagedRef: p1 } });
  assert.equal(opened.status, 'ok');
  const record = await handles.operator.getRecord(
    opened.status === 'ok' ? opened.value.recordId : '',
  );
  assert.ok(record?.proposedDigest !== undefined);
});

// --- evidence gaps closed at final review: a supplying-genesis key-set pin (mirrors
// recovery.test.ts's exact-key-set assertion) and a gate-order pin for the new throw ------

test('genesis key-set pin: an open() WITH proposed adds exactly one key to the base genesis payload', async () => {
  const { handles, profile } = handlesFor();
  const { p1, p2 } = await stageBoth(handles, profile.id);
  const opened = await handles.operator.open(p2, { proposed: { stagedRef: p1 } });
  assert.equal(opened.status, 'ok');
  const recordId = opened.status === 'ok' ? opened.value.recordId : '';

  const chain = await handles.operator.readChain(recordId);
  const genesis = chain[0];
  assert.ok(genesis !== undefined);
  const payload = genesis.payload as Record<string, unknown>;
  assert.deepEqual(
    Object.keys(payload).sort(),
    ['contentDigest', 'legId', 'profileDigest', 'profileId', 'proposedDigest', 'subjectRef'],
    'present-iff-supplied: exactly the base key set plus proposedDigest',
  );
});

test('gate order: the provenance throw wins over a later prior-leg-unverified refusal', async () => {
  // open()'s landed order: intake -> unknown-stagedRef -> unknown-profile -> policy ->
  // unknown-leg -> PROVENANCE -> prior-leg-unverified -> supersedes-unverified
  // (kernel/open.ts). The checker leg below carries BOTH a cross-triple `proposed`
  // (which on its own THROWS at the provenance rung) and no `priorRecordRefs` at all
  // (which on its own would REFUSE `prior-leg-unverified` at the later rung,
  // kernel/prior-legs.ts). Provenance runs first, so the throw wins.
  const profile = twoLegProfile();
  const handles = create(makeConfig([profile]));
  const c1 = await handles.agent.stage(P1, profile.id, DEFAULT_SUBJECT_REF, 'checker-decide');
  assert.equal(c1.status, 'ok');
  // A maker-leg draft: the wrong legId, so `proposed` mismatches the checker draft's
  // triple (SPEC §9's same-triple rule).
  const m1 = await handles.agent.stage(P1, profile.id, DEFAULT_SUBJECT_REF, 'maker-decide');
  assert.equal(m1.status, 'ok');

  await assert.rejects(
    () =>
      handles.operator.open(c1.status === 'ok' ? c1.value.stagedRef : '', {
        // priorRecordRefs deliberately absent: on a non-first leg this alone would
        // refuse `prior-leg-unverified` — but never gets the chance to.
        proposed: { stagedRef: m1.status === 'ok' ? m1.value.stagedRef : '' },
      }),
    /same/i,
  );
});
