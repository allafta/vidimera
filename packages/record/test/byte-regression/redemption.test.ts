// @vidimera/record — byte-regression/redemption.test.ts: absolute pins on both redemption
// shapes (SPEC §11.2) — the token pair and the co-located direct call — including the
// token digest inside `redeeming`/`redeemed` and the notarized effect result inside
// `redeemed`. The token digest is why this directory's seams carry a fixed token source:
// an undetermined one makes this family unpinnable.
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
const PROFILE_ID_TOKEN = 'byte-regression.redeem-token.v1';
const PROFILE_ID_DIRECT = 'byte-regression.redeem-direct.v1';
const SUBJECT_REF_TOKEN = 'subject:byte-regression-redeem-token';
const SUBJECT_REF_DIRECT = 'subject:byte-regression-redeem-direct';
const STAGED_CONTENT = { subject: 'week-1', total: 40 };
const RESULT_DIGEST = 'sha256:0000000000000000000000000000000000000000000000000000000000000003';

// Both profiles are declared inline, never imported from a shared helper: their
// declarative bytes are inside the digests below, through the profile digest written into
// each `opened` payload, so what determines a literal must be readable beside it. Neither
// declares `policySource`: this family pins the redemption seams, not the conditional
// open-time fields, which the confirm-declaring pin already covers.
//
// `redeem: { result: true }` both admits `completeRedemption`'s result digest and (via
// `profileDeclaresEffectSeam`) turns on the effect seam at all — without it, `redeem`,
// `beginRedemption`, and `completeRedemption` all refuse `unredeemable-state`.
const TOKEN_PROFILE: ConfirmProfile = {
  id: PROFILE_ID_TOKEN,
  subject: { canonicalizerRef: CANONICALIZER_REF },
  legs: [{ id: 'approver-decide', allowedAuthorities: ['session:byte-regression-app'] }],
  captureMode: 'staged',
  expiry: { ttl: 3600 },
  redeem: { result: true },
};

// The direct chain declares `redeem: {}` — no `confirmToRedeem`, `redeemBound`, `reverify`,
// or `result` — the minimal declaration that still turns on the effect seam, so `redeem()`
// reaches `redeemed` instead of refusing `unredeemable-state`, while admitting no result
// digest at all.
const DIRECT_PROFILE: ConfirmProfile = {
  id: PROFILE_ID_DIRECT,
  subject: { canonicalizerRef: CANONICALIZER_REF },
  legs: [{ id: 'approver-decide', allowedAuthorities: ['session:byte-regression-app'] }],
  captureMode: 'staged',
  expiry: { ttl: 3600 },
  redeem: {},
};

function makeTokenConfig(): Config {
  return {
    profiles: [TOKEN_PROFILE],
    store: new MemoryStore(),
    canonicalizers: { [CANONICALIZER_REF]: (content: unknown) => content },
  };
}

function makeDirectConfig(): Config {
  return {
    profiles: [DIRECT_PROFILE],
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
const PINNED_TOKEN_DIGESTS: readonly string[] = [
  'sha256:4d151ba1777823d2a180b41bf01f054d5fb6339ae45fd01c10a3a5d13cc0f1d0',
  'sha256:ab2ef0b25586ffe0d166d7b8592b6e7217d252fc1f8483a9d36c16bb5b545153',
  'sha256:e4dc2c3f77b72fc862fe8bb735d89aa4f874e3005cf76269ffc4624391ff9057',
  'sha256:94cb1996b62a4e1609127f3ea385592f97ce0934dab069c25ac429d90282cbdb',
  'sha256:6e30f6f6e76132bddda128e175dba1f0921c2c580d3cb398d8da0e3ba3a03893',
  'sha256:feb034e167ecf95ebf9f8d0c601e59ae3e0872bf1059223d7db9cddfebcad6b9',
];

const PINNED_DIRECT_DIGESTS: readonly string[] = [
  'sha256:98d764caec8ee5db59384be22df2a1e96f99b567e5f22b9d54faf5d864f55479',
  'sha256:cea5c836baaefbd3d23f227ffa284377c34ea875b6a268f97434ff04e3b3e252',
  'sha256:4bc0363b64a6f670f15418e2d40ac6f556e38191986dab36d1e5588988c0e6ed',
  'sha256:91b904591b19cca2140c5a2bac55f9eca1d2760d222c3be6739fe7a0c5cf8e1f',
  'sha256:29a2419cb3532f9802ac16a226a3c7747dffd459b9514a31100d4bb5637a0e99',
];

async function runTokenFlow(): Promise<Transition[]> {
  const { now, mintId, tokenSource } = deterministicSeams('byte-regression-redeem-token');
  const { agent, operator } = createWithClock(makeTokenConfig(), now, mintId, tokenSource);

  const staged = await agent.stage(STAGED_CONTENT, PROFILE_ID_TOKEN, SUBJECT_REF_TOKEN);
  if (staged.status !== 'ok') throw new Error(`stage() refused: ${JSON.stringify(staged)}`);

  const opened = await operator.open(staged.value.stagedRef);
  if (opened.status !== 'ok') throw new Error(`open() refused: ${JSON.stringify(opened)}`);

  const finalized = await operator.finalize(
    opened.value.recordId,
    identityAssertion(),
    STAGED_CONTENT,
    factsArg(),
  );
  if (finalized.status !== 'ok')
    throw new Error(`finalize() refused: ${JSON.stringify(finalized)}`);

  const begun = await operator.beginRedemption(opened.value.recordId, STAGED_CONTENT);
  if (begun.status !== 'ok') throw new Error(`beginRedemption() refused: ${JSON.stringify(begun)}`);

  const completed = await operator.completeRedemption(
    opened.value.recordId,
    begun.value.token,
    STAGED_CONTENT,
    { result: { digest: RESULT_DIGEST } },
  );
  if (completed.status !== 'ok')
    throw new Error(`completeRedemption() refused: ${JSON.stringify(completed)}`);

  return operator.readChain(opened.value.recordId);
}

async function runDirectFlow(): Promise<Transition[]> {
  const { now, mintId, tokenSource } = deterministicSeams('byte-regression-redeem-direct');
  const { agent, operator } = createWithClock(makeDirectConfig(), now, mintId, tokenSource);

  const staged = await agent.stage(STAGED_CONTENT, PROFILE_ID_DIRECT, SUBJECT_REF_DIRECT);
  if (staged.status !== 'ok') throw new Error(`stage() refused: ${JSON.stringify(staged)}`);

  const opened = await operator.open(staged.value.stagedRef);
  if (opened.status !== 'ok') throw new Error(`open() refused: ${JSON.stringify(opened)}`);

  const finalized = await operator.finalize(
    opened.value.recordId,
    identityAssertion(),
    STAGED_CONTENT,
    factsArg(),
  );
  if (finalized.status !== 'ok')
    throw new Error(`finalize() refused: ${JSON.stringify(finalized)}`);

  const redeemed = await operator.redeem(opened.value.recordId, STAGED_CONTENT);
  if (redeemed.status !== 'ok') throw new Error(`redeem() refused: ${JSON.stringify(redeemed)}`);

  return operator.readChain(opened.value.recordId);
}

test('byte-regression: the token redemption chain produces the expected kind shape', async () => {
  const chain = await runTokenFlow();
  assert.deepEqual(
    chain.map((t) => t.kind),
    [
      'opened',
      'consultation-recorded',
      'consultation-recorded',
      'confirmed',
      'redeeming',
      'redeemed',
    ],
  );
});

test('byte-regression: the direct redemption chain produces the expected kind shape', async () => {
  const chain = await runDirectFlow();
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'consultation-recorded', 'consultation-recorded', 'confirmed', 'redeemed'],
  );
});

test('byte-regression: the token pair carries tokenDigest and the notarized result, the direct redeemed does not', async () => {
  const tokenChain = await runTokenFlow();
  const redeeming = tokenChain[4]?.payload as Record<string, unknown> | undefined;
  const redeemedToken = tokenChain[5]?.payload as Record<string, unknown> | undefined;
  if (redeeming === undefined || redeemedToken === undefined) {
    throw new Error('expected redeeming and redeemed transitions at indices 4 and 5');
  }
  assert.ok(typeof redeeming.tokenDigest === 'string', 'redeeming must carry a tokenDigest');
  assert.equal(redeemedToken.via, 'token');
  assert.equal(redeemedToken.tokenDigest, redeeming.tokenDigest);
  assert.equal(redeemedToken.resultDigest, RESULT_DIGEST);

  const directChain = await runDirectFlow();
  const redeemedDirect = directChain[4]?.payload as Record<string, unknown> | undefined;
  if (redeemedDirect === undefined) throw new Error('expected a redeemed transition at index 4');
  assert.equal(redeemedDirect.via, 'direct');
  assert.equal('resultDigest' in redeemedDirect, false);
  assert.equal('tokenDigest' in redeemedDirect, false);
});

test('byte-regression: the token redemption chain matches its pinned literals', async () => {
  const chain = await runTokenFlow();
  assert.deepEqual(
    chain.map((t) => transitionDigest(t)),
    [...PINNED_TOKEN_DIGESTS],
  );
});

test('byte-regression: the direct redemption chain matches its pinned literals', async () => {
  const chain = await runDirectFlow();
  assert.deepEqual(
    chain.map((t) => transitionDigest(t)),
    [...PINNED_DIRECT_DIGESTS],
  );
});
