// @vidimera/record — byte-regression/findings.test.ts: an absolute pin on the findings
// write side (SPEC §10.2), the two operator-only mid-lifecycle appends. Neither
// `finding-raised` nor `acknowledged` has ever been inside an absolute literal.
//
// SELF-REGRESSION PIN. A mismatch means this repository's encoding of these payloads
// moved; it is not evidence of divergence from any external implementation, and it does
// not prove the encoding is correct. See `byte-regression/fixtures.ts`.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { transitionDigest } from '../../src/chain/encoding.js';
import type { Config, ConfirmProfile } from '../../src/config.js';
import { createWithClock } from '../../src/create.js';
import type { AckInput, FindingInput } from '../../src/kernel/findings-seams.js';
import { MemoryStore } from '../../src/store/memory.js';
import type { IdentityAssertion, Transition } from '../../src/types.js';
import { deterministicSeams } from './fixtures.js';

const CANONICALIZER_REF = 'byte-regression.canonical.v1';
const PROFILE_ID = 'byte-regression.findings.v1';
const SUBJECT_REF = 'subject:byte-regression-findings';
const STAGED_CONTENT = { subject: 'week-1', total: 40 };
const FINDING_ID = 'finding-1';
const FINDING_KIND = 'data-quality';
const FINDING_DIGEST = 'sha256:0000000000000000000000000000000000000000000000000000000000000002';
const MAGNITUDE = 'material';

// The profile is declared inline, never imported from a shared helper: its declarative
// bytes are inside the digests below, through the profile digest written into the
// `opened` payload, so what determines a literal must be readable beside it. No
// `policySource`: this family pins the findings write side, not the conditional open-time
// fields, which the confirm-declaring pin already covers. The leg's `ackMode`/
// `requiredAcks` are both-or-neither by construction (SPEC §10.2) — declaring one without
// the other is a construction error, so both are present together here.
const FINDINGS_PROFILE: ConfirmProfile = {
  id: PROFILE_ID,
  subject: { canonicalizerRef: CANONICALIZER_REF },
  legs: [
    {
      id: 'approver-decide',
      allowedAuthorities: ['session:byte-regression-app'],
      ackMode: 'any',
      requiredAcks: ['data-quality'],
    },
  ],
  captureMode: 'staged',
  expiry: { ttl: 3600 },
};

function makeConfig(): Config {
  return {
    profiles: [FINDINGS_PROFILE],
    store: new MemoryStore(),
    canonicalizers: { [CANONICALIZER_REF]: (content: unknown) => content },
  };
}

function identityAssertion(): IdentityAssertion {
  return {
    principal: 'approver:byte-regression-1',
    authority: 'session:byte-regression-app',
  };
}

function raiserIdentity(): IdentityAssertion {
  return {
    principal: 'operator:byte-regression-raiser',
    authority: 'session:byte-regression-app',
  };
}

function ackerIdentity(): IdentityAssertion {
  return {
    principal: 'operator:byte-regression-acker',
    authority: 'session:byte-regression-app',
  };
}

function factsArg(): { figures: unknown; checker: IdentityAssertion } {
  return {
    figures: { total: 40, currency: 'SEK' },
    checker: { principal: 'svc:review-surface', authority: 'mtls:review-surface' },
  };
}

// Harvest-then-pin: placeholders first, then paste the values the failure diff reports.
const PINNED_DIGESTS: readonly string[] = [
  'sha256:ffa4232d64cdc2f8df9f31261afb1a62ed1b15bf11d54885aace773dce088aee',
  'sha256:6476e00cdf44ca23766680b758c026c1be2be15f856e31a62d3d152a61de8119',
  'sha256:9810380b18925bc3e0f5f19047cd5833b76801bfb7887ba68bd1f4f952d7cb43',
  'sha256:3104703daa2f74ec1255d5a378f256f680dc5defcaf4ec9bf3fa106461a30757',
  'sha256:f15bcd2e8a37c2746ed68edb34fd2fc74b8326a0f8a53dcaeb6effffa8646a3a',
  'sha256:0efca5812e6f8150118e49af7d60ddc6a520cf7f46e56532e60766e9c01a177d',
];

// Harvest-then-pin, like PINNED_DIGESTS above: placeholders first, then paste the values
// the failure diff reports.
const PINNED_MAGNITUDE_DIGESTS: readonly string[] = [
  'sha256:ad5f556c94fc488c412c978350b4fd9a063cbe843776e1ed5f675335b6142589',
  'sha256:bee47a9e9db055962d645738be4c448e773ffc23bf8e76b817c5a6848930ad3a',
  'sha256:d3cdbd1e88639ca547b03b5b92b4b4ebf3879108c720218508369cab434d3968',
  'sha256:1d59a421f660683ec69f2de459d5ca01d28de294eecad633c4393f2e6f611ae0',
  'sha256:afc78dff9758df27017809f232cca771c681ac27c4948f29914440e46b02d0ae',
  'sha256:aa3a68af319b7fec43876b1010b867a750f115c9166d76f33161292ec7b9d9be',
];

async function runFindingsFlow(): Promise<Transition[]> {
  const { now, mintId, tokenSource } = deterministicSeams('byte-regression-findings');
  const { agent, operator } = createWithClock(makeConfig(), now, mintId, tokenSource);

  const staged = await agent.stage(STAGED_CONTENT, PROFILE_ID, SUBJECT_REF);
  if (staged.status !== 'ok') throw new Error(`stage() refused: ${JSON.stringify(staged)}`);

  const opened = await operator.open(staged.value.stagedRef);
  if (opened.status !== 'ok') throw new Error(`open() refused: ${JSON.stringify(opened)}`);

  const finding: FindingInput = {
    findingId: FINDING_ID,
    kind: FINDING_KIND,
    findingDigest: FINDING_DIGEST,
  };
  const raised = await operator.raiseFinding(opened.value.recordId, finding, raiserIdentity());
  if (raised.status !== 'ok') throw new Error(`raiseFinding() refused: ${JSON.stringify(raised)}`);

  const ack: AckInput = {
    findingId: FINDING_ID,
    findingDigest: FINDING_DIGEST,
  };
  const acked = await operator.acknowledge(opened.value.recordId, ack, ackerIdentity());
  if (acked.status !== 'ok') throw new Error(`acknowledge() refused: ${JSON.stringify(acked)}`);

  const finalized = await operator.finalize(
    opened.value.recordId,
    identityAssertion(),
    STAGED_CONTENT,
    factsArg(),
  );
  if (finalized.status !== 'ok')
    throw new Error(`finalize() refused: ${JSON.stringify(finalized)}`);

  return operator.readChain(opened.value.recordId);
}

test('byte-regression: the findings flow produces the expected kind shape', async () => {
  const chain = await runFindingsFlow();
  assert.deepEqual(
    chain.map((t) => t.kind),
    [
      'opened',
      'finding-raised',
      'acknowledged',
      'consultation-recorded',
      'consultation-recorded',
      'confirmed',
    ],
  );
});

test('byte-regression: the two findings payloads carry the raising and acking identities', async () => {
  const chain = await runFindingsFlow();
  const raisedPayload = chain[1]?.payload as Record<string, unknown> | undefined;
  const ackedPayload = chain[2]?.payload as Record<string, unknown> | undefined;
  if (raisedPayload === undefined || ackedPayload === undefined) {
    throw new Error('expected findings transitions at indices 1 and 2');
  }
  assert.equal(raisedPayload.findingId, FINDING_ID);
  assert.equal(raisedPayload.kind, FINDING_KIND);
  assert.equal(raisedPayload.findingDigest, FINDING_DIGEST);
  assert.deepEqual(raisedPayload.raiser, raiserIdentity());
  assert.equal('magnitude' in raisedPayload, false);

  assert.equal(ackedPayload.findingId, FINDING_ID);
  assert.equal(ackedPayload.findingDigest, FINDING_DIGEST);
  assert.deepEqual(ackedPayload.acker, ackerIdentity());
  assert.equal('kind' in ackedPayload, false);
});

test('byte-regression: the findings chain matches its pinned literals', async () => {
  const chain = await runFindingsFlow();
  assert.deepEqual(
    chain.map((t) => transitionDigest(t)),
    [...PINNED_DIGESTS],
  );
});

async function runFindingsFlowWithMagnitude(): Promise<Transition[]> {
  const { now, mintId, tokenSource } = deterministicSeams('byte-regression-findings-magnitude');
  const { agent, operator } = createWithClock(makeConfig(), now, mintId, tokenSource);

  const staged = await agent.stage(STAGED_CONTENT, PROFILE_ID, SUBJECT_REF);
  if (staged.status !== 'ok') throw new Error(`stage() refused: ${JSON.stringify(staged)}`);
  const opened = await operator.open(staged.value.stagedRef);
  if (opened.status !== 'ok') throw new Error(`open() refused: ${JSON.stringify(opened)}`);

  const finding: FindingInput = {
    findingId: FINDING_ID,
    kind: FINDING_KIND,
    findingDigest: FINDING_DIGEST,
    magnitude: MAGNITUDE,
  };
  const raised = await operator.raiseFinding(opened.value.recordId, finding, raiserIdentity());
  if (raised.status !== 'ok') throw new Error(`raiseFinding() refused: ${JSON.stringify(raised)}`);

  const ack: AckInput = {
    findingId: FINDING_ID,
    findingDigest: FINDING_DIGEST,
    magnitude: MAGNITUDE,
  };
  const acked = await operator.acknowledge(opened.value.recordId, ack, ackerIdentity());
  if (acked.status !== 'ok') throw new Error(`acknowledge() refused: ${JSON.stringify(acked)}`);

  const finalized = await operator.finalize(
    opened.value.recordId,
    identityAssertion(),
    STAGED_CONTENT,
    factsArg(),
  );
  if (finalized.status !== 'ok')
    throw new Error(`finalize() refused: ${JSON.stringify(finalized)}`);

  return operator.readChain(opened.value.recordId);
}

test('byte-regression: magnitude rides both findings payloads, value-pinned', async () => {
  const chain = await runFindingsFlowWithMagnitude();
  const raisedPayload = chain[1]?.payload as Record<string, unknown> | undefined;
  const ackedPayload = chain[2]?.payload as Record<string, unknown> | undefined;
  if (raisedPayload === undefined || ackedPayload === undefined) {
    throw new Error('expected findings transitions at indices 1 and 2');
  }
  assert.equal(raisedPayload.magnitude, MAGNITUDE);
  assert.equal(ackedPayload.magnitude, MAGNITUDE);
});

test('byte-regression: the magnitude-carrying findings chain matches its pinned literals', async () => {
  const chain = await runFindingsFlowWithMagnitude();
  assert.deepEqual(
    chain.map((t) => transitionDigest(t)),
    PINNED_MAGNITUDE_DIGESTS,
  );
});
