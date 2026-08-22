// @vidimera/record — byte-regression/declined.test.ts: an absolute pin on a recorded
// human decline (SPEC §9's `open → declined` seam). The `declined` kind has never been
// inside an absolute literal: the frozen oracle's flow ends `confirmed`, and the
// cross-backing comparison is relative, so an encoding change applied to both backings
// leaves it green.
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
const PROFILE_ID = 'byte-regression.declined.v1';
const SUBJECT_REF = 'subject:byte-regression-declined';
const STAGED_CONTENT = { subject: 'week-1', total: 40 };

// The profile is declared inline, never imported from a shared helper: its declarative
// bytes are inside the digests below, through the profile digest written into the
// `opened` payload, so what determines a literal must be readable beside it. No
// `policySource`: this family pins the decline terminal, not the conditional open-time
// fields, which the confirm-declaring pin already covers.
const DECLINING_PROFILE: ConfirmProfile = {
  id: PROFILE_ID,
  subject: { canonicalizerRef: CANONICALIZER_REF },
  legs: [
    {
      id: 'approver-decide',
      allowedAuthorities: ['session:byte-regression-app'],
      decline: true,
    },
  ],
  captureMode: 'staged',
  expiry: { ttl: 3600 },
};

function makeConfig(): Config {
  return {
    profiles: [DECLINING_PROFILE],
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
  'sha256:8ed90e5d303ad288fcab6052cf89f5302e38fde44efd63f9f4db639d3d91f6b3',
  'sha256:8c237325afd6a82a0b0c9f06aa4035959afb9c80fd30fabc8dbb7c3d449db3cf',
  'sha256:25f476f3d48a19446e7d9a1f09c48f19153aced6d8fbee06f59a4320c2f1f1a9',
  'sha256:e013d30a525aaeae2b01816e42127c4f6be4a97b4f0011e0899f1bec62375a52',
];

async function runDecliningFlow(): Promise<Transition[]> {
  const { now, mintId, tokenSource } = deterministicSeams('byte-regression-declined');
  const { agent, operator } = createWithClock(makeConfig(), now, mintId, tokenSource);

  const staged = await agent.stage(STAGED_CONTENT, PROFILE_ID, SUBJECT_REF);
  if (staged.status !== 'ok') throw new Error(`stage() refused: ${JSON.stringify(staged)}`);

  const opened = await operator.open(staged.value.stagedRef);
  if (opened.status !== 'ok') throw new Error(`open() refused: ${JSON.stringify(opened)}`);

  const declined = await operator.decline(
    opened.value.recordId,
    identityAssertion(),
    STAGED_CONTENT,
    factsArg(),
  );
  if (declined.status !== 'ok') throw new Error(`decline() refused: ${JSON.stringify(declined)}`);

  return operator.readChain(opened.value.recordId);
}

test('byte-regression: the decline flow produces the expected kind shape', async () => {
  const chain = await runDecliningFlow();
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'consultation-recorded', 'consultation-recorded', 'declined'],
  );
});

test('byte-regression: the terminal transition carries the deciding actor', async () => {
  const chain = await runDecliningFlow();
  const terminal = chain.at(-1);
  if (terminal === undefined) throw new Error('empty chain');
  const payload = terminal.payload as Record<string, unknown>;
  assert.deepEqual(payload.actor, identityAssertion());
});

test('byte-regression: the decline chain matches its pinned literals', async () => {
  const chain = await runDecliningFlow();
  assert.deepEqual(
    chain.map((t) => transitionDigest(t)),
    [...PINNED_DIGESTS],
  );
});
