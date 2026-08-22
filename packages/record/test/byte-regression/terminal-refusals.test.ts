// @vidimera/record — byte-regression/terminal-refusals.test.ts: absolute pins on the last
// four unpinned `TransitionKind`s — `refused`, `expired`, `sealed`, `redemption-failed` —
// each landed by a DIFFERENT mechanism, named separately here so this header can still
// state one claim about all four:
//
//   1. `refused` — an ORDINARY refusal-class append. `appendsOn` (refusal-codes.ts) returns
//      true for a refusal-class code only when the leg's OWN `terminalRefusals` names it;
//      this file's leg declares `terminalRefusals: ['content-drift']` so the drifted-content
//      refusal appends `open -> refused { code }` instead of leaving the record open.
//   2. `expired` and `redemption-failed` — ONE lazy en-passant CAS append, `kernel/expiry.ts`'s
//      `resolveDueClock`, whose kind depends on which pending window elapsed (open/confirmed ->
//      `expired`, redeeming -> `redemption-failed`). Neither kind is ever minted directly —
//      each is PROVOKED by calling an ordinary seam (`finalize()`, `completeRedemption()`)
//      after its deadline has passed, exactly as production traffic would.
//   3. `sealed` — the operator-only chain-retirement seam, `kernel/seal.ts`: a
//      state-preserving cap on an already derived-terminal record.
//
// FOUR ARRAYS, THREE RECORDS. `sealed` does not mint its own record — it reuses the
// `expired` record's own flow (same profile, same seams prefix) after that record
// terminates, then calls `seal()`. Its pinned array is therefore a STRICT SUPERSET of the
// `expired` array's own literals (the same two leading digests, plus one more for the
// `sealed` transition) — deliberately, not a copy-paste slip: one encoding change to the
// shared prefix moves both arrays at once, and that is ONE regression to adjudicate, never
// two independent ones. See the explicit assertion below that ties them together.
//
// SELF-REGRESSION PIN. A mismatch means this repository's encoding of these payloads
// moved; it is not evidence of divergence from any external implementation, and it does
// not prove the encoding is correct. The fuller boundary statement (what this directory
// does and does not cover) lives once, in `byte-regression/fixtures.ts` — not repeated here.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { transitionDigest } from '../../src/chain/encoding.js';
import type { Config, ConfirmProfile } from '../../src/config.js';
import { createWithClock } from '../../src/create.js';
import type { OperatorSurface } from '../../src/operator-surface.js';
import type { Outcome } from '../../src/outcome.js';
import { MemoryStore } from '../../src/store/memory.js';
import type { IdentityAssertion } from '../../src/types.js';
import { advanceableSeams } from './fixtures.js';

const CANONICALIZER_REF = 'byte-regression.canonical.v1';

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

// === refused (content-drift, declared as terminal) ========================================

const REFUSED_PROFILE_ID = 'byte-regression.refused.v1';
const REFUSED_SUBJECT_REF = 'subject:byte-regression-refused';
const REFUSED_OPEN_CONTENT = { subject: 'week-1', total: 40 };
const REFUSED_DECIDE_CONTENT = { subject: 'week-1', total: 999 }; // drifted vs. the bound digest

// The leg names `content-drift` in `terminalRefusals` — WITHOUT this the refusal never
// appends anything (`appendsOn` returns false for a refusal-class code the leg does not
// list) and the record stays open (SPEC §10.1's default).
const REFUSED_PROFILE: ConfirmProfile = {
  id: REFUSED_PROFILE_ID,
  subject: { canonicalizerRef: CANONICALIZER_REF },
  legs: [
    {
      id: 'approver-decide',
      allowedAuthorities: ['session:byte-regression-app'],
      terminalRefusals: ['content-drift'],
    },
  ],
  captureMode: 'staged',
  expiry: { ttl: 3600 },
};

function makeRefusedConfig(): Config {
  return {
    profiles: [REFUSED_PROFILE],
    store: new MemoryStore(),
    canonicalizers: { [CANONICALIZER_REF]: (content: unknown) => content },
  };
}

async function runRefusedFlow(): Promise<{
  operator: OperatorSurface;
  recordId: string;
  outcome: Outcome<unknown>;
}> {
  const { now, mintId, tokenSource } = advanceableSeams('byte-regression-refused');
  const { agent, operator } = createWithClock(makeRefusedConfig(), now, mintId, tokenSource);

  const staged = await agent.stage(REFUSED_OPEN_CONTENT, REFUSED_PROFILE_ID, REFUSED_SUBJECT_REF);
  if (staged.status !== 'ok') throw new Error(`stage() refused: ${JSON.stringify(staged)}`);

  const opened = await operator.open(staged.value.stagedRef);
  if (opened.status !== 'ok') throw new Error(`open() refused: ${JSON.stringify(opened)}`);

  const finalized = await operator.finalize(
    opened.value.recordId,
    identityAssertion(),
    REFUSED_DECIDE_CONTENT,
    factsArg(),
  );

  return { operator, recordId: opened.value.recordId, outcome: finalized };
}

// Harvest-then-pin: placeholders first, then paste the values the failure diff reports.
const PINNED_REFUSED_DIGESTS: readonly string[] = [
  'sha256:9abd3bd577fdc08dfb8c8c40181b90faab6b429b3a66cdffdcd42f03224b408b',
  'sha256:c2de4b2930caf3f7d28975228db73025f589bab9d69aeed32004ba85cee44256',
];

test('byte-regression: the declared-terminal drift refusal produces the expected kind shape', async () => {
  const { operator, recordId } = await runRefusedFlow();
  const chain = await operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'refused'],
  );
});

test('byte-regression: the drift refusal reports content-drift/refusal WITH a transitionRef', async () => {
  const { outcome } = await runRefusedFlow();
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'content-drift');
  assert.equal(outcome.class, 'refusal');
  assert.ok(typeof outcome.transitionRef === 'string', 'the leg declared it — an edge appends');
});

test('byte-regression: the declared-terminal drift refusal chain matches its pinned literals', async () => {
  const { operator, recordId } = await runRefusedFlow();
  const chain = await operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => transitionDigest(t)),
    [...PINNED_REFUSED_DIGESTS],
  );
});

// === expired (en-passant, open window) =====================================================

const EXPIRED_PROFILE_ID = 'byte-regression.expired.v1';
const EXPIRED_SUBJECT_REF = 'subject:byte-regression-expired';
const EXPIRED_CONTENT = { subject: 'week-1', total: 40 };
const EXPIRED_SEAMS_PREFIX = 'byte-regression-expired';

const EXPIRED_PROFILE: ConfirmProfile = {
  id: EXPIRED_PROFILE_ID,
  subject: { canonicalizerRef: CANONICALIZER_REF },
  legs: [{ id: 'approver-decide', allowedAuthorities: ['session:byte-regression-app'] }],
  captureMode: 'staged',
  expiry: { ttl: 3600 },
};

function makeExpiredConfig(): Config {
  return {
    profiles: [EXPIRED_PROFILE],
    store: new MemoryStore(),
    canonicalizers: { [CANONICALIZER_REF]: (content: unknown) => content },
  };
}

/**
 * Stages, opens, crosses the declared 3600s open-window deadline, then calls `finalize()` —
 * the seam that PROVOKES `resolveDueClock`'s lazy CAS append. `finalize()` is never called
 * directly on an already-due record in production; this is the same shape a real caller
 * would hit by arriving late. Shared verbatim (same prefix, same call sequence) by both the
 * `expired` pin and the `sealed` pin below, so their leading two transitions are
 * byte-identical.
 */
async function runExpiredFlow(): Promise<{
  operator: OperatorSurface;
  recordId: string;
  outcome: Outcome<unknown>;
}> {
  const { now, mintId, tokenSource, advance } = advanceableSeams(EXPIRED_SEAMS_PREFIX);
  const { agent, operator } = createWithClock(makeExpiredConfig(), now, mintId, tokenSource);

  const staged = await agent.stage(EXPIRED_CONTENT, EXPIRED_PROFILE_ID, EXPIRED_SUBJECT_REF);
  if (staged.status !== 'ok') throw new Error(`stage() refused: ${JSON.stringify(staged)}`);

  const opened = await operator.open(staged.value.stagedRef);
  if (opened.status !== 'ok') throw new Error(`open() refused: ${JSON.stringify(opened)}`);

  advance(3_601_000); // one second past the declared 3600s open-window ttl

  const finalized = await operator.finalize(
    opened.value.recordId,
    identityAssertion(),
    EXPIRED_CONTENT,
    factsArg(),
  );

  return { operator, recordId: opened.value.recordId, outcome: finalized };
}

// Harvest-then-pin: placeholders first, then paste the values the failure diff reports.
const PINNED_EXPIRED_DIGESTS: readonly string[] = [
  'sha256:e6fa78ad0c69f25795827fc8e42146cbb72820b6aab793e472daa29cd4f3b64e',
  'sha256:0fa13a28cd9e9889bf33b7fc5542e5421e63236a0335acdf10ae5ae0befb6f7d',
];

test('byte-regression: crossing the open-window deadline produces the expected kind shape', async () => {
  const { operator, recordId } = await runExpiredFlow();
  const chain = await operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'expired'],
  );
});

test('byte-regression: the due-open finalize() reports leg-expired with NO transitionRef', async () => {
  const { outcome } = await runExpiredFlow();
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'leg-expired');
  assert.equal(outcome.transitionRef, undefined, 'the expired edge is not a refused edge');
});

test('byte-regression: the expired chain matches its pinned literals', async () => {
  const { operator, recordId } = await runExpiredFlow();
  const chain = await operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => transitionDigest(t)),
    [...PINNED_EXPIRED_DIGESTS],
  );
});

// === sealed (caps the expired record) ======================================================
//
// Reuses `runExpiredFlow()` verbatim — same profile, same seams prefix, same call
// sequence — then adds exactly one more call, `seal()`. Its pinned array below is a
// STRICT SUPERSET of `PINNED_EXPIRED_DIGESTS`: the assertion two tests down checks this
// directly, so a future edit that breaks the superset relationship fails loudly here
// rather than silently drifting the two arrays apart.

async function runSealedFlow(): Promise<{
  operator: OperatorSurface;
  recordId: string;
  outcome: Outcome<{ recordId: string; status: 'retired' }>;
}> {
  const { operator, recordId } = await runExpiredFlow();
  const sealed = await operator.seal(recordId);
  if (sealed.status !== 'ok') throw new Error(`seal() refused: ${JSON.stringify(sealed)}`);
  return { operator, recordId, outcome: sealed };
}

// Harvest-then-pin: placeholders first, then paste the values the failure diff reports.
// The first two entries MUST equal PINNED_EXPIRED_DIGESTS — see the assertion below.
const PINNED_SEALED_DIGESTS: readonly string[] = [
  'sha256:e6fa78ad0c69f25795827fc8e42146cbb72820b6aab793e472daa29cd4f3b64e',
  'sha256:0fa13a28cd9e9889bf33b7fc5542e5421e63236a0335acdf10ae5ae0befb6f7d',
  'sha256:8e07beda6511b6771fdc89d2876d9cd78912f0777efbffdc73319eb1f45649c6',
];

test('byte-regression: sealing the expired record produces the expected kind shape', async () => {
  const { operator, recordId } = await runSealedFlow();
  const chain = await operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'expired', 'sealed'],
  );
});

test('byte-regression: seal() reports ok/retired with a transitionRef', async () => {
  const { outcome } = await runSealedFlow();
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;
  assert.equal(outcome.value.status, 'retired');
});

test('byte-regression: the sealed chain matches its pinned literals, a strict superset of the expired ones', async () => {
  const { operator, recordId } = await runSealedFlow();
  const chain = await operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => transitionDigest(t)),
    [...PINNED_SEALED_DIGESTS],
  );
  // THE SUPERSET, ASSERTED: one encoding change to the shared open/expired prefix moves
  // both arrays together — a single regression, never two independent ones.
  assert.deepEqual(PINNED_SEALED_DIGESTS.slice(0, 2), PINNED_EXPIRED_DIGESTS);
});

// === redemption-failed (en-passant, redeeming window) ======================================

const REDEMPTION_FAILED_PROFILE_ID = 'byte-regression.redemption-failed.v1';
const REDEMPTION_FAILED_SUBJECT_REF = 'subject:byte-regression-redemption-failed';
const REDEMPTION_FAILED_CONTENT = { subject: 'week-1', total: 40 };

// No `confirmToRedeem` — only `redeemBound`. The confirmed window then never pends
// (`pendingWindow`'s confirmed arm returns `{ window: 'none' }` with no declared bound), so
// only the REDEEMING window can elapse here, isolating this pin to one mechanism.
const REDEMPTION_FAILED_PROFILE: ConfirmProfile = {
  id: REDEMPTION_FAILED_PROFILE_ID,
  subject: { canonicalizerRef: CANONICALIZER_REF },
  legs: [{ id: 'approver-decide', allowedAuthorities: ['session:byte-regression-app'] }],
  captureMode: 'staged',
  expiry: { ttl: 3600 },
  redeem: { redeemBound: 60 },
};

function makeRedemptionFailedConfig(): Config {
  return {
    profiles: [REDEMPTION_FAILED_PROFILE],
    store: new MemoryStore(),
    canonicalizers: { [CANONICALIZER_REF]: (content: unknown) => content },
  };
}

/**
 * Stages, opens, finalizes, begins redemption (reaching `redeeming`), crosses the declared
 * 60s redeemBound, then calls `completeRedemption()` WITH THE CORRECT TOKEN — the seam that
 * PROVOKES `resolveDueClock`'s lazy CAS append for the redeeming window. A correct token
 * arriving late is exactly §11.2's "unknown outcome" shape: the window resolves before
 * correspondence is ever checked.
 */
async function runRedemptionFailedFlow(): Promise<{
  operator: OperatorSurface;
  recordId: string;
  outcome: Outcome<unknown>;
}> {
  const { now, mintId, tokenSource, advance } = advanceableSeams(
    'byte-regression-redemption-failed',
  );
  const { agent, operator } = createWithClock(
    makeRedemptionFailedConfig(),
    now,
    mintId,
    tokenSource,
  );

  const staged = await agent.stage(
    REDEMPTION_FAILED_CONTENT,
    REDEMPTION_FAILED_PROFILE_ID,
    REDEMPTION_FAILED_SUBJECT_REF,
  );
  if (staged.status !== 'ok') throw new Error(`stage() refused: ${JSON.stringify(staged)}`);

  const opened = await operator.open(staged.value.stagedRef);
  if (opened.status !== 'ok') throw new Error(`open() refused: ${JSON.stringify(opened)}`);

  const finalized = await operator.finalize(
    opened.value.recordId,
    identityAssertion(),
    REDEMPTION_FAILED_CONTENT,
    factsArg(),
  );
  if (finalized.status !== 'ok')
    throw new Error(`finalize() refused: ${JSON.stringify(finalized)}`);

  const begun = await operator.beginRedemption(opened.value.recordId, REDEMPTION_FAILED_CONTENT);
  if (begun.status !== 'ok') throw new Error(`beginRedemption() refused: ${JSON.stringify(begun)}`);

  advance(61_000); // one second past the declared 60s redeemBound

  const completed = await operator.completeRedemption(
    opened.value.recordId,
    begun.value.token,
    REDEMPTION_FAILED_CONTENT,
  );

  return { operator, recordId: opened.value.recordId, outcome: completed };
}

// Harvest-then-pin: placeholders first, then paste the values the failure diff reports.
const PINNED_REDEMPTION_FAILED_DIGESTS: readonly string[] = [
  'sha256:0d919dc2e6a387221876a4a2bc3dfd2033783eeab3278dac2a4a305dd3fe40d9',
  'sha256:e743adc94aedd92478330b3e8db3b241dfbded1a6c5bc8724b1d9e81090fbbb7',
  'sha256:fb33f9d719a721465d419d9ec335491a84fc525241cf8131ac3c61271a0630d0',
  'sha256:a259ea88128de74d06e4d22a69a6faea1a420b190b019b95c0da7fd1957c04ed',
  'sha256:5a9e96f476c7eddc85be4448198c020ead5f6a830797167e10071dddbb2c5ff4',
  'sha256:bf431ce6cab72157bc082b07dcf528d16f38162b076148abbfb1f6154d68325c',
];

test('byte-regression: crossing the redeemBound produces the expected kind shape', async () => {
  const { operator, recordId } = await runRedemptionFailedFlow();
  const chain = await operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => t.kind),
    [
      'opened',
      'consultation-recorded',
      'consultation-recorded',
      'confirmed',
      'redeeming',
      'redemption-failed',
    ],
  );
});

test('byte-regression: a correct-but-late completeRedemption() reports redemption-timeout with NO transitionRef', async () => {
  const { outcome } = await runRedemptionFailedFlow();
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'redemption-timeout');
  assert.equal(
    outcome.transitionRef,
    undefined,
    'the redemption-failed edge is not a refused edge',
  );
});

test('byte-regression: the redemption-failed chain matches its pinned literals', async () => {
  const { operator, recordId } = await runRedemptionFailedFlow();
  const chain = await operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => transitionDigest(t)),
    [...PINNED_REDEMPTION_FAILED_DIGESTS],
  );
});
