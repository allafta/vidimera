// @vidimera/record — byte-stability.test.ts: a REAL stage -> open -> finalize flow driven
// through the kernel via the `@internal` createWithClock seam, with a FIXED clock and a
// FIXED recordId minter (so `at`/`recordId` bytes are deterministic), asserting the four
// produced transition digests against four literals captured from the reference
// implementation this kernel was adopted from (a no-consultations, single-leg capture
// finalize — the three-element success batch [chain-verify, facts, confirmed]).
//
// These four literals are BYTE-COMPATIBILITY PINS against that source implementation, not
// a spec-conformance vector. SPEC §4 states exactly two normative conventions on the
// transition-digest encoding — `seq` serialized as a string, and millisecond-precision
// timestamps — and says plainly that everything else about how a seam reads the clock,
// including how many times finalize's success batch reads it, is implementation detail,
// deliberately left unstated. A conforming reimplementation of finalize() is free to read
// the clock a different number of times (or in a different order) than the source did; doing
// so reproduces the SAME chain shape (kind sequence, payload structure) but can change the
// `at` bytes on any transition after the first, and therefore its digest. That is why only
// [0] (the `opened` transition, minted entirely inside open() before finalize() is ever
// called) is guaranteed to reproduce by construction — [1]-[3] reproducing as well is a
// property of THIS kernel's clock-read pattern matching the source's, not something SPEC
// requires.
//
// A mismatch on any of the four is therefore a FINDING TO ADJUDICATE — either a defect in
// the recordId-minting seam, or a genuine (legal) byte-level divergence from the source
// implementation's finalize() clock-read pattern — never evidence that this repository's
// behavior is wrong. Do not "fix" a mismatch by editing a literal, the fixed clock, the
// injected minter, the profile, or the scripted flow below: doing so would erase the exact
// evidence this file exists to produce.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { transitionDigest } from '../src/chain/encoding.js';
import type { Config, ConfirmProfile } from '../src/config.js';
import { createWithClock } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import type { IdentityAssertion, Transition } from '../src/types.js';

// === the hermetic fixture (single capture profile, one content object) ================

const CANONICALIZER_REF = 'byte-stability.canonical.v1';
const PROFILE_ID = 'byte-stability.capture.v1';
const SUBJECT_REF = 'subject:byte-stability-1';
const CONTENT = { subject: 'week-1', total: 40 };

const CAPTURE_PROFILE: ConfirmProfile = {
  id: PROFILE_ID,
  subject: { canonicalizerRef: CANONICALIZER_REF },
  legs: [{ id: 'approver-decide', allowedAuthorities: ['session:byte-stability-app'] }],
  captureMode: 'staged',
  expiry: { ttl: 3600 },
};

function makeConfig(): Config {
  return {
    profiles: [CAPTURE_PROFILE],
    store: new MemoryStore(),
    canonicalizers: { [CANONICALIZER_REF]: (content: unknown) => content },
  };
}

function identityAssertion(): IdentityAssertion {
  return { principal: 'approver:byte-stability-1', authority: 'session:byte-stability-app' };
}

function factsArg(): { figures: unknown; checker: IdentityAssertion } {
  return {
    figures: { total: 40, currency: 'SEK' },
    checker: { principal: 'svc:review-surface', authority: 'mtls:review-surface' },
  };
}

// === the deterministic seams: fixed clock AND fixed ids ===============================

/**
 * A fresh, zero-reset deterministic `{now, mintId}` pair — the cross-backing-e2e idiom.
 * `now()` ticks one second per call from a fixed epoch; `mintId()` returns a fixed id
 * sequence. The kernel's call pattern to these seams is fixed for the scripted flow, so the
 * produced `at`/`recordId` bytes are reproducible run-to-run — which is what makes the digest
 * literals below a stable pin rather than a snapshot of wall-clock/UUID nondeterminism.
 */
function makeDeterministicSeams(): { now: () => Date; mintId: () => string } {
  const BASE_MS = Date.parse('2026-01-01T00:00:00.000Z');
  let tick = 0;
  let idSeq = 0;
  return {
    now: () => new Date(BASE_MS + tick++ * 1000),
    mintId: () => `byte-stability-fixed-record-${idSeq++}`,
  };
}

// === the pinned baseline digests (frozen fixtures; the oracle, never regenerated) ======
//
// The FOUR transitions of a no-consultations single-leg capture finalize, in chain order:
//   [0] opened
//   [1] consultation-recorded (chain-verify)
//   [2] consultation-recorded (facts)
//   [3] confirmed
// Each literal is `transitionDigest(chain[i])` under the record's recorded algorithm (sha256).
// DO NOT regenerate these values later — a change here would mean the no-consultations
// chain moved, which the byte-stability invariant forbids (DECISIONS.md #19: a profile
// declaring no features produces chains byte-identical to the minimal model; every
// feature addition must be provably non-breaking, so drift shows up here as a digest
// change). Harvest-then-pin: run once with placeholder literals, read the real values
// out of the failure diff, then paste them here verbatim.
const PINNED_DIGESTS: readonly [string, string, string, string] = [
  'sha256:5cfbf8015d7fc4396bc623f79248747d81c2ec3e7ec82d0f8cba287c87fbc0e6',
  'sha256:1a64963fb5ae2c0e0bed6c762077d0fa8afdbbbe8cd6fe02e19e8c1033741557',
  'sha256:3b4a151c7304801f8aac047e86cc32f823024b51da9b3b57ff0e6369282df317',
  'sha256:a4b0a0f9400ea925f01f47b0e83b06ca3c1067e2a9b0be691e5239ae239a4b6f',
];

// === the scripted flow ================================================================

async function runNoConsultationFlow(): Promise<Transition[]> {
  const { now, mintId } = makeDeterministicSeams();
  const { agent, operator } = createWithClock(makeConfig(), now, mintId);

  const staged = await agent.stage(CONTENT, PROFILE_ID, SUBJECT_REF);
  if (staged.status !== 'ok') {
    throw new Error(`byte-stability: stage() refused unexpectedly: ${JSON.stringify(staged)}`);
  }

  const opened = await operator.open(staged.value.stagedRef);
  if (opened.status !== 'ok') {
    throw new Error(`byte-stability: open() refused unexpectedly: ${JSON.stringify(opened)}`);
  }
  const { recordId } = opened.value;

  const finalized = await operator.finalize(recordId, identityAssertion(), CONTENT, factsArg());
  if (finalized.status !== 'ok') {
    throw new Error(
      `byte-stability: finalize() refused unexpectedly: ${JSON.stringify(finalized)}`,
    );
  }

  return operator.readChain(recordId);
}

// === the pin ==========================================================================

test('byte-stability: a no-consultations finalize produces the pinned 4-transition kind shape', async () => {
  const chain = await runNoConsultationFlow();
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'consultation-recorded', 'consultation-recorded', 'confirmed'],
    'the no-consultations success batch is exactly [opened, chain-verify, facts, confirmed]',
  );
});

test('byte-stability: the four transition digests match the pinned baseline literals (byte-for-byte)', async () => {
  const chain = await runNoConsultationFlow();
  const digests = chain.map((t) => transitionDigest(t));
  assert.deepEqual(
    digests,
    [...PINNED_DIGESTS],
    'the no-consultations chain must stay digest-identical to the pinned baseline (DECISIONS.md #19: byte-stability)',
  );
});

test('byte-stability: the fixed minter yields the same recordId every run (determinism guard)', async () => {
  const chain = await runNoConsultationFlow();
  const openedTransition = chain[0];
  if (openedTransition === undefined) {
    throw new Error(
      'byte-stability.test.ts: chain[0] missing — the scripted flow must produce a chain',
    );
  }
  assert.equal(openedTransition.recordId, 'byte-stability-fixed-record-0');
});
