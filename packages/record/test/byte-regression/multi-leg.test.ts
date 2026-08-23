// @vidimera/record — byte-regression/multi-leg.test.ts: absolute pins on the three
// conditional payload fields only a MULTI-RECORD flow reaches — `priorRecordRefs` and
// `priorLegActors` (SPEC §10.1's maker-checker sequencing), and `supersedes` (SPEC §2's
// recovery linkage). This family adds no new transition kind: every kind pinned below was
// already covered elsewhere in this directory. What has never been inside an absolute
// literal is these three fields themselves, each bound only into a successor record's
// GENESIS payload — never the success batch. Recovery mints its own terminal predecessor
// rather than borrowing one: `verifySupersedes` (`kernel/supersedes.ts`) requires the
// predecessor be intact, head-matching, TERMINAL, and same-subjectRef, so the simplest
// constructible predecessor here is a `confirmed` record on its own single-leg profile.
// That predecessor's own four transitions carry no literal of their own — only its
// `chainHead` reaches this file, folded into the successor's genesis payload — so a
// regression inside the predecessor's own encoding is caught only transitively (a failing
// recovery literal, not a failing predecessor literal) and at coarser diagnostic
// granularity than a direct pin would give; acceptable because the predecessor is a plain
// single-leg `confirmed` chain carrying no conditional field this directory exists to pin.
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
import { MemoryStore } from '../../src/store/memory.js';
import type { IdentityAssertion, Transition } from '../../src/types.js';
import { deterministicSeams } from './fixtures.js';

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

// === the maker-checker pair: priorRecordRefs (three-field recorded form) plus
// priorLegActors, both bound only into the checker's genesis ============================

const MULTI_LEG_PROFILE_ID = 'byte-regression.multi-leg.v1';
const MULTI_LEG_SUBJECT_REF = 'subject:byte-regression-multi-leg';
const MULTI_LEG_CONTENT = { subject: 'week-1', total: 40 };

// Neither leg declares `sod` or `proposer`: the same identity may decide both legs (the
// non-declaring precedent), which keeps the flow below to one actor throughout.
const MULTI_LEG_PROFILE: ConfirmProfile = {
  id: MULTI_LEG_PROFILE_ID,
  subject: { canonicalizerRef: CANONICALIZER_REF },
  legs: [
    { id: 'maker-decide', allowedAuthorities: ['session:byte-regression-app'] },
    { id: 'checker-decide', allowedAuthorities: ['session:byte-regression-app'] },
  ],
  captureMode: 'staged',
  expiry: { ttl: 3600 },
};

function makeMultiLegConfig(): Config {
  return {
    profiles: [MULTI_LEG_PROFILE],
    store: new MemoryStore(),
    canonicalizers: { [CANONICALIZER_REF]: (content: unknown) => content },
  };
}

async function runMultiLegFlow(): Promise<{
  legOne: Transition[];
  legTwo: Transition[];
  makerRecordId: string;
  makerHead: string;
}> {
  const { now, mintId, tokenSource } = deterministicSeams('byte-regression-multi-leg');
  const { agent, operator } = createWithClock(makeMultiLegConfig(), now, mintId, tokenSource);

  const stagedMaker = await agent.stage(
    MULTI_LEG_CONTENT,
    MULTI_LEG_PROFILE_ID,
    MULTI_LEG_SUBJECT_REF,
    'maker-decide',
  );
  if (stagedMaker.status !== 'ok')
    throw new Error(`stage(maker) refused: ${JSON.stringify(stagedMaker)}`);

  const openedMaker = await operator.open(stagedMaker.value.stagedRef);
  if (openedMaker.status !== 'ok')
    throw new Error(`open(maker) refused: ${JSON.stringify(openedMaker)}`);

  const finalizedMaker = await operator.finalize(
    openedMaker.value.recordId,
    identityAssertion(),
    MULTI_LEG_CONTENT,
    factsArg(),
  );
  if (finalizedMaker.status !== 'ok')
    throw new Error(`finalize(maker) refused: ${JSON.stringify(finalizedMaker)}`);

  const legOne = await operator.readChain(openedMaker.value.recordId);
  const makerHeadTransition = legOne.at(-1);
  if (makerHeadTransition === undefined) throw new Error('empty maker chain');
  const makerHead = transitionDigest(makerHeadTransition);

  const stagedChecker = await agent.stage(
    MULTI_LEG_CONTENT,
    MULTI_LEG_PROFILE_ID,
    MULTI_LEG_SUBJECT_REF,
    'checker-decide',
  );
  if (stagedChecker.status !== 'ok')
    throw new Error(`stage(checker) refused: ${JSON.stringify(stagedChecker)}`);

  const openedChecker = await operator.open(stagedChecker.value.stagedRef, {
    priorRecordRefs: [{ recordId: openedMaker.value.recordId, chainHead: makerHead }],
  });
  if (openedChecker.status !== 'ok')
    throw new Error(`open(checker) refused: ${JSON.stringify(openedChecker)}`);

  const finalizedChecker = await operator.finalize(
    openedChecker.value.recordId,
    identityAssertion(),
    MULTI_LEG_CONTENT,
    factsArg(),
  );
  if (finalizedChecker.status !== 'ok')
    throw new Error(`finalize(checker) refused: ${JSON.stringify(finalizedChecker)}`);

  const legTwo = await operator.readChain(openedChecker.value.recordId);
  return { legOne, legTwo, makerRecordId: openedMaker.value.recordId, makerHead };
}

// Harvest-then-pin: placeholders first, then paste the values the failure diff reports.
const PINNED_LEG_ONE_DIGESTS: readonly string[] = [
  'sha256:30543fdbdcf7d7741015188af0cbb8fb1b2da5d6668b7567717ee9cdef53ca8e',
  'sha256:95b8f89266c283ff2cc3d7c4c07c299efb2d70147e4174baa3a4a33f3af3ae3a',
  'sha256:57dd272534b961b5f2e8297faaf9d224adb1fea7e6d78ca3a957d574a978a9da',
  'sha256:244fc4f9b3fe73e0ffea86e76352386dec43cf8174a27c851c52a889022c2987',
];
const PINNED_LEG_TWO_DIGESTS: readonly string[] = [
  'sha256:55b324ad28ba27d1b20b9ed4bf57da616f25b100f2950da3d5f7c19d80a3d8b0',
  'sha256:d40cc631298c53c20b1f03ba3df1a105af07b30077cd1dc4368bba87bd42b4a0',
  'sha256:cae54ca8dd341c945ed2efd134c50db9a1c538cc5dad6c38b3c42de1e17a1624',
  'sha256:8aace94186853ecad81d3a9c211f7c9910eac4ae52162acbd26136d4aaca0a69',
];

test('byte-regression: the maker-checker pair produces the expected kind shape on both legs', async () => {
  const { legOne, legTwo } = await runMultiLegFlow();
  const expected = ['opened', 'consultation-recorded', 'consultation-recorded', 'confirmed'];
  assert.deepEqual(
    legOne.map((t) => t.kind),
    expected,
  );
  assert.deepEqual(
    legTwo.map((t) => t.kind),
    expected,
  );
});

test('byte-regression: the checker genesis carries both conditional fields; the maker genesis carries neither', async () => {
  const { legOne, legTwo, makerRecordId, makerHead } = await runMultiLegFlow();

  const makerGenesis = legOne[0];
  if (makerGenesis === undefined) throw new Error('empty maker chain');
  assert.deepEqual(Object.keys(makerGenesis.payload as object).sort(), [
    'contentDigest',
    'legId',
    'profileDigest',
    'profileId',
    'subjectRef',
  ]);

  const checkerGenesis = legTwo[0];
  if (checkerGenesis === undefined) throw new Error('empty checker chain');
  assert.deepEqual(Object.keys(checkerGenesis.payload as object).sort(), [
    'contentDigest',
    'legId',
    'priorLegActors',
    'priorRecordRefs',
    'profileDigest',
    'profileId',
    'subjectRef',
  ]);
  // The RECORDED prior-leg reference is the three-field form (types.ts's
  // `RecordedPriorLegRef`) — the library adds `legId` on top of what open()'s two-field
  // `PriorRecordRef` input carried.
  const payload = checkerGenesis.payload as {
    priorRecordRefs: { recordId: string; chainHead: string; legId: string }[];
    priorLegActors: IdentityAssertion[];
  };
  assert.deepEqual(payload.priorRecordRefs, [
    { recordId: makerRecordId, chainHead: makerHead, legId: 'maker-decide' },
  ]);
  // The derived actor is the maker leg's finalizing identity, paired by index — and it
  // lives ONLY here, in the checker's `opened` payload, never in either leg's `confirmed`
  // payload (which carries just `{ actor }` for its OWN leg).
  assert.deepEqual(payload.priorLegActors, [identityAssertion()]);
});

test('byte-regression: the maker leg chain matches its pinned literals', async () => {
  const { legOne } = await runMultiLegFlow();
  assert.deepEqual(
    legOne.map((t) => transitionDigest(t)),
    [...PINNED_LEG_ONE_DIGESTS],
  );
});

test('byte-regression: the checker leg chain matches its pinned literals', async () => {
  const { legTwo } = await runMultiLegFlow();
  assert.deepEqual(
    legTwo.map((t) => transitionDigest(t)),
    [...PINNED_LEG_TWO_DIGESTS],
  );
});

// === recovery: supersedes, bound only into the recovering record's genesis =============

const RECOVERY_PREDECESSOR_PROFILE_ID = 'byte-regression.recovery-predecessor.v1';
const RECOVERY_PROFILE_ID = 'byte-regression.recovery.v1';
const RECOVERY_SUBJECT_REF = 'subject:byte-regression-recovery';
const RECOVERY_CONTENT = { subject: 'week-1', total: 40 };

// A single-leg, non-effect-seam profile: its final-leg `confirmed` is terminal
// immediately — the simplest constructible predecessor `verifySupersedes` will accept.
const RECOVERY_PREDECESSOR_PROFILE: ConfirmProfile = {
  id: RECOVERY_PREDECESSOR_PROFILE_ID,
  subject: { canonicalizerRef: CANONICALIZER_REF },
  legs: [{ id: 'approver-decide', allowedAuthorities: ['session:byte-regression-app'] }],
  captureMode: 'staged',
  expiry: { ttl: 3600 },
};

// The recovering record's own profile — SPEC §2 allows any profile so long as the
// subjectRef matches the predecessor's, so this stays a DIFFERENT profile id.
const RECOVERY_PROFILE: ConfirmProfile = {
  id: RECOVERY_PROFILE_ID,
  subject: { canonicalizerRef: CANONICALIZER_REF },
  legs: [{ id: 'approver-decide', allowedAuthorities: ['session:byte-regression-app'] }],
  captureMode: 'staged',
  expiry: { ttl: 3600 },
};

function makeRecoveryConfig(): Config {
  return {
    profiles: [RECOVERY_PREDECESSOR_PROFILE, RECOVERY_PROFILE],
    store: new MemoryStore(),
    canonicalizers: { [CANONICALIZER_REF]: (content: unknown) => content },
  };
}

async function runRecoveryFlow(): Promise<{
  chain: Transition[];
  predecessorRecordId: string;
  predecessorHead: string;
}> {
  const { now, mintId, tokenSource } = deterministicSeams('byte-regression-recovery');
  const { agent, operator } = createWithClock(makeRecoveryConfig(), now, mintId, tokenSource);

  const stagedPredecessor = await agent.stage(
    RECOVERY_CONTENT,
    RECOVERY_PREDECESSOR_PROFILE_ID,
    RECOVERY_SUBJECT_REF,
  );
  if (stagedPredecessor.status !== 'ok')
    throw new Error(`stage(predecessor) refused: ${JSON.stringify(stagedPredecessor)}`);

  const openedPredecessor = await operator.open(stagedPredecessor.value.stagedRef);
  if (openedPredecessor.status !== 'ok')
    throw new Error(`open(predecessor) refused: ${JSON.stringify(openedPredecessor)}`);

  const finalizedPredecessor = await operator.finalize(
    openedPredecessor.value.recordId,
    identityAssertion(),
    RECOVERY_CONTENT,
    factsArg(),
  );
  if (finalizedPredecessor.status !== 'ok')
    throw new Error(`finalize(predecessor) refused: ${JSON.stringify(finalizedPredecessor)}`);

  const predecessorChain = await operator.readChain(openedPredecessor.value.recordId);
  const predecessorHeadTransition = predecessorChain.at(-1);
  if (predecessorHeadTransition === undefined) throw new Error('empty predecessor chain');
  const predecessorHead = transitionDigest(predecessorHeadTransition);

  const stagedRecovery = await agent.stage(
    RECOVERY_CONTENT,
    RECOVERY_PROFILE_ID,
    RECOVERY_SUBJECT_REF,
  );
  if (stagedRecovery.status !== 'ok')
    throw new Error(`stage(recovery) refused: ${JSON.stringify(stagedRecovery)}`);

  const openedRecovery = await operator.open(stagedRecovery.value.stagedRef, {
    supersedes: { recordId: openedPredecessor.value.recordId, chainHead: predecessorHead },
  });
  if (openedRecovery.status !== 'ok')
    throw new Error(`open(recovery) refused: ${JSON.stringify(openedRecovery)}`);

  const chain = await operator.readChain(openedRecovery.value.recordId);
  return { chain, predecessorRecordId: openedPredecessor.value.recordId, predecessorHead };
}

// Harvest-then-pin: placeholders first, then paste the values the failure diff reports.
const PINNED_RECOVERY_DIGESTS: readonly string[] = [
  'sha256:c7aa536d4c5fb33598e95dece3a36cedc0d66ff5edf7ab23d9f392e2ca225a20',
];

test('byte-regression: the recovery successor produces the expected kind shape', async () => {
  const { chain } = await runRecoveryFlow();
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened'],
  );
});

test('byte-regression: the recovery successor genesis carries the verified supersedes reference', async () => {
  const { chain, predecessorRecordId, predecessorHead } = await runRecoveryFlow();
  const genesis = chain[0];
  if (genesis === undefined) throw new Error('empty chain');
  assert.deepEqual(Object.keys(genesis.payload as object).sort(), [
    'contentDigest',
    'legId',
    'profileDigest',
    'profileId',
    'subjectRef',
    'supersedes',
  ]);
  const payload = genesis.payload as { supersedes: { recordId: string; chainHead: string } };
  assert.deepEqual(payload.supersedes, {
    recordId: predecessorRecordId,
    chainHead: predecessorHead,
  });
});

test('byte-regression: the recovery successor chain matches its pinned literal', async () => {
  const { chain } = await runRecoveryFlow();
  assert.deepEqual(
    chain.map((t) => transitionDigest(t)),
    [...PINNED_RECOVERY_DIGESTS],
  );
});
