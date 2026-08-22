// @vidimera/record — byte-regression/confirm-declaring.test.ts: an absolute pin on a
// confirm chain whose genesis carries the two open-time conditional fields —
// `policyDigest` (SPEC §10.3, bound when the profile declares a policy source) and
// `proposedDigest` (SPEC §9's provenance option, bound from a resolved staged draft).
// The frozen oracle's own flow declares neither, so neither has ever been inside an
// absolute literal.
//
// SELF-REGRESSION PIN. A mismatch means this repository's encoding of these payloads
// moved; it is not evidence of divergence from any external implementation, and it does
// not prove the encoding is correct. See `byte-regression/fixtures.ts`.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { transitionDigest } from '../../src/chain/encoding.js';
import type { Config, ConfirmProfile } from '../../src/config.js';
import { createWithClock } from '../../src/create.js';
import { MemoryStore } from '../../src/store/memory.js';
import type { IdentityAssertion, Transition } from '../../src/types.js';
import { deterministicSeams } from './fixtures.js';

const CANONICALIZER_REF = 'byte-regression.canonical.v1';
const PROFILE_ID = 'byte-regression.confirm-declaring.v1';
const SUBJECT_REF = 'subject:byte-regression-confirm';
const PROPOSED_CONTENT = { subject: 'week-1', total: 39 };
const DECIDED_CONTENT = { subject: 'week-1', total: 40 };
const POLICY_DIGEST = 'sha256:0000000000000000000000000000000000000000000000000000000000000001';

// The profile is declared inline, never imported from a shared helper: its declarative
// bytes are inside the digests below, through the profile digest written into the
// `opened` payload, so what determines a literal must be readable beside it.
const DECLARING_PROFILE: ConfirmProfile = {
  id: PROFILE_ID,
  subject: { canonicalizerRef: CANONICALIZER_REF },
  legs: [{ id: 'approver-decide', allowedAuthorities: ['session:byte-regression-app'] }],
  captureMode: 'staged',
  expiry: { ttl: 3600 },
  policySource: 'policy:byte-regression-source',
};

function makeConfig(): Config {
  return {
    profiles: [DECLARING_PROFILE],
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

function factsArg(): { figures: unknown; checker: IdentityAssertion } {
  return {
    figures: { total: 40, currency: 'SEK' },
    checker: { principal: 'svc:review-surface', authority: 'mtls:review-surface' },
  };
}

// Harvest-then-pin: placeholders first, then paste the values the failure diff reports.
const PINNED_DIGESTS: readonly string[] = [
  'sha256:63ac6f1ae4d91f0d2d932bc3cd8a7f8107746c7570db63e1d5cf17e655ed3a8a',
  'sha256:500be387f9c03076b4ef4957c85729900091f76fe10f770071ff530e9c702f68',
  'sha256:526fcf230b599211a0f75fac29811137dcf57a1d2a43306b95f4876f6ebda7b8',
  'sha256:f0ab314d1869bd8044c794d5e51ad3d20732c912cb1421ab0b7f302673703eff',
];

async function runDeclaringFlow(): Promise<Transition[]> {
  const { now, mintId, tokenSource } = deterministicSeams('byte-regression-confirm');
  const { agent, operator } = createWithClock(makeConfig(), now, mintId, tokenSource);

  const proposal = await agent.stage(PROPOSED_CONTENT, PROFILE_ID, SUBJECT_REF);
  if (proposal.status !== 'ok')
    throw new Error(`stage(proposal) refused: ${JSON.stringify(proposal)}`);

  const staged = await agent.stage(DECIDED_CONTENT, PROFILE_ID, SUBJECT_REF);
  if (staged.status !== 'ok') throw new Error(`stage(decided) refused: ${JSON.stringify(staged)}`);

  const opened = await operator.open(staged.value.stagedRef, {
    policyDigest: POLICY_DIGEST,
    proposed: { stagedRef: proposal.value.stagedRef },
  });
  if (opened.status !== 'ok') throw new Error(`open() refused: ${JSON.stringify(opened)}`);

  const finalized = await operator.finalize(
    opened.value.recordId,
    identityAssertion(),
    DECIDED_CONTENT,
    factsArg(),
    { policy: { digest: POLICY_DIGEST } },
  );
  if (finalized.status !== 'ok')
    throw new Error(`finalize() refused: ${JSON.stringify(finalized)}`);

  return operator.readChain(opened.value.recordId);
}

test('byte-regression: the declaring confirm produces the expected kind shape', async () => {
  const chain = await runDeclaringFlow();
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'consultation-recorded', 'consultation-recorded', 'confirmed'],
  );
});

test('byte-regression: the genesis carries both conditional fields', async () => {
  const chain = await runDeclaringFlow();
  const genesis = chain[0];
  if (genesis === undefined) throw new Error('empty chain');
  const payload = genesis.payload as Record<string, unknown>;
  assert.equal(payload.policyDigest, POLICY_DIGEST);
  assert.ok(typeof payload.proposedDigest === 'string', 'proposedDigest must be bound');
});

test('byte-regression: the declaring confirm chain matches its pinned literals', async () => {
  const chain = await runDeclaringFlow();
  assert.deepEqual(
    chain.map((t) => transitionDigest(t)),
    [...PINNED_DIGESTS],
  );
});
