// @vidimera/record — exclusivity.test.ts (SPEC §9 "Exclusivity" / §12's minimal
// locator): one non-terminal record per
// (profile, subject). The five open()-under-exclusivity paths:
//   (1) clean open — a first open() on a free (profile, subject) succeeds;
//   (2) a live (still-open, not-lapsed) blocker — second open() -> record-exists directly,
//       NO append, NO transitionRef;
//   (3) a LAPSED open blocker — open() auto-expires-and-admits: on conflict:'exclusivity'
//       it reads the blocker via blockingRecordId, and ONLY when blocker.state==='open' &&
//       openedAt+ttl < now appends `expired` (expectedCurrentState:'open') then retries the
//       genesis open EXACTLY ONCE -> a NEW record opens; the blocker chain gains `expired`;
//   (4) a NON-open non-terminal blocker (effect-seam `confirmed` awaiting redemption) ->
//       record-exists directly, with NO open-state CAS (blocker chain unchanged);
//   (5) an expire-CAS state-mismatch (a race flips the blocker between the exclusivity
//       conflict and the expire CAS) -> record-exists, NEVER re-loop (exactly one genesis
//       attempt, no retry).
// The clock is injected via createWithClock (internal test seam) so lapse is deterministic
// with NO sleeps.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { transitionDigest } from '../src/chain/encoding.js';
import { create, createWithClock } from '../src/create.js';
import { isFinalLeg, nonTerminal } from '../src/nonterminal.js';
import { profileDigest } from '../src/profile-digest.js';
import { MemoryStore } from '../src/store/memory.js';
import type { AppendMeta, AppendResult, BatchResult, Store } from '../src/store/store.js';
import type { Digest, RecordState, StagedDraft, Transition } from '../src/types.js';
import { buildChain } from './helpers/chain.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  identity,
  makeConfig,
} from './helpers/profiles.js';

const TTL_SECONDS = 3600; // 1h — matches the profile builders' default expiry
const T0 = '2026-07-24T00:00:00.000Z';
const T_DEADLINE = '2026-07-24T01:00:00.000Z'; // T0 + 3600s
const T_LATE = '2026-07-24T02:00:00.000Z'; // > deadline -> lapsed

// === (1) clean open ====================================================================

test('a first open() on a free (profile, subject) succeeds and mints a record', async () => {
  const { agent, operator } = create(makeConfig([captureProfile()]));
  const staged = await agent.stage(
    { subject: 'week-1', total: 40 },
    'test.capture.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;

  const opened = await operator.open(staged.value.stagedRef);
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;

  const chain = await operator.readChain(opened.value.recordId);
  assert.equal(chain.length, 1);
  const openedTransition = chain[0];
  if (openedTransition === undefined)
    throw new Error(
      'exclusivity.test.ts: chain[0] missing — a freshly-opened record must have one transition',
    );
  assert.equal(openedTransition.kind, 'opened');
  const record = await operator.getRecord(opened.value.recordId);
  assert.equal(record?.state, 'open');
});

// === (2) live blocker -> record-exists directly =======================================

test('a second open() on a LIVE (still-open, not-lapsed) (profile, subject) -> record-exists (no append, no transitionRef)', async () => {
  // Fixed clock: both opens at T0, deadline is T0+ttl in the future -> blocker never lapses.
  const clock = () => new Date(T0);
  const { agent, operator } = createWithClock(
    makeConfig([captureProfile({ ttl: TTL_SECONDS })]),
    clock,
  );

  const staged = await agent.stage(
    { subject: 'week-1', total: 40 },
    'test.capture.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;

  const first = await operator.open(staged.value.stagedRef);
  assert.equal(first.status, 'ok');
  if (first.status !== 'ok') return;
  const recordIdA = first.value.recordId;

  const second = await operator.open(staged.value.stagedRef);
  assert.equal(second.status, 'refused');
  if (second.status !== 'refused') return;
  assert.equal(second.code, 'record-exists');
  assert.equal(second.class, 'refusal');
  assert.equal(second.transitionRef, undefined, 'record-exists NEVER carries a transitionRef');

  // No append landed anywhere: the blocker's chain is still just its `opened` transition,
  // and no `expired` was written (it was open but not due).
  const chainA = await operator.readChain(recordIdA);
  assert.equal(chainA.length, 1, 'the live blocker gains no transition');
  const chainAOpened = chainA[0];
  if (chainAOpened === undefined)
    throw new Error(
      'exclusivity.test.ts: chainA[0] missing — the live blocker must retain its opened transition',
    );
  assert.equal(chainAOpened.kind, 'opened');
});

// === (3) lapsed open blocker -> auto-expire-and-admit =================================

test('a LAPSED open blocker auto-expires-and-admits: blocker gains `expired`, a NEW record opens', async () => {
  // A mutable clock: the blocker opens at T0, the second open() happens at T_LATE (> deadline).
  let clockNow = new Date(T0);
  const clock = () => clockNow;
  const { agent, operator } = createWithClock(
    makeConfig([captureProfile({ ttl: TTL_SECONDS })]),
    clock,
  );

  const staged = await agent.stage(
    { subject: 'week-1', total: 40 },
    'test.capture.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;

  const first = await operator.open(staged.value.stagedRef);
  assert.equal(first.status, 'ok');
  if (first.status !== 'ok') return;
  const recordIdA = first.value.recordId;

  // Advance past the blocker's open window, then re-open the identical staged draft.
  clockNow = new Date(T_LATE);
  const second = await operator.open(staged.value.stagedRef);
  assert.equal(second.status, 'ok', 'the lapsed blocker is auto-expired and the new open admitted');
  if (second.status !== 'ok') return;
  const recordIdB = second.value.recordId;

  assert.notEqual(
    recordIdB,
    recordIdA,
    'open() mints a fresh recordId, never reusing the expired blocker',
  );

  // The blocker chain gained exactly one `expired` transition; it now replays as expired.
  const chainA = await operator.readChain(recordIdA);
  assert.equal(chainA.length, 2, 'blocker chain: [opened, expired]');
  const chainAOpened = chainA[0];
  const chainAExpired = chainA[1];
  if (chainAOpened === undefined || chainAExpired === undefined) {
    throw new Error(
      'exclusivity.test.ts: chainA[0]/chainA[1] missing — the lapsed blocker must carry [opened, expired]',
    );
  }
  assert.equal(chainAOpened.kind, 'opened');
  assert.equal(chainAExpired.kind, 'expired');
  const bound = (chainAExpired.payload as { bound: string }).bound;
  assert.equal(
    bound,
    T_DEADLINE,
    '`expired` payload {bound} is the crossed deadline (openedAt + ttl)',
  );
  const recordA = await operator.getRecord(recordIdA);
  assert.equal(recordA?.state, 'expired');

  // The new record is the live one now.
  const chainB = await operator.readChain(recordIdB);
  assert.equal(chainB.length, 1);
  const chainBOpened = chainB[0];
  if (chainBOpened === undefined)
    throw new Error(
      'exclusivity.test.ts: chainB[0] missing — the freshly-opened record must have one transition',
    );
  assert.equal(chainBOpened.kind, 'opened');
  const recordB = await operator.getRecord(recordIdB);
  assert.equal(recordB?.state, 'open');
});

test('expiry:"none" blocker NEVER lapses: even far in the future, a second open() -> record-exists', async () => {
  let clockNow = new Date(T0);
  const clock = () => clockNow;
  const { agent, operator } = createWithClock(
    makeConfig([captureProfile({ expiry: 'none' })]),
    clock,
  );

  const staged = await agent.stage(
    { subject: 'week-1', total: 40 },
    'test.capture.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;

  const first = await operator.open(staged.value.stagedRef);
  assert.equal(first.status, 'ok');
  if (first.status !== 'ok') return;

  clockNow = new Date('2999-01-01T00:00:00.000Z'); // arbitrarily far future
  const second = await operator.open(staged.value.stagedRef);
  assert.equal(second.status, 'refused');
  if (second.status !== 'refused') return;
  assert.equal(second.code, 'record-exists');

  const chainA = await operator.readChain(first.value.recordId);
  assert.equal(chainA.length, 1, 'a no-expiry blocker never gains an `expired` transition');
});

// === (4) non-open non-terminal blocker -> record-exists, NO expire attempt ============

test('a NON-open non-terminal blocker (effect-seam `confirmed` awaiting redemption) -> record-exists directly, blocker chain unchanged', async () => {
  // Arrange the blocker state by DIRECT store appends (finalize() does not exist yet):
  // an effect-seam profile's final-leg `confirmed` is NON-terminal (awaits redemption).
  const store = new MemoryStore();
  const profile = effectSeamProfile();
  const leg = profile.legs[0];
  if (leg === undefined)
    throw new Error(
      'exclusivity.test.ts: profile.legs[0] missing — effectSeamProfile() must have at least one leg',
    );
  const legId = leg.id;
  const blockerId = 'blocker-effect-1';

  const openedPayload = {
    profileId: profile.id,
    profileDigest: profileDigest(profile),
    legId,
    subjectRef: DEFAULT_SUBJECT_REF,
    contentDigest: 'sha256:1111',
  };
  const confirmedPayload = { actor: identity() };
  const blockerChain = buildChain(blockerId, [
    { kind: 'opened', payload: openedPayload },
    { kind: 'confirmed', payload: confirmedPayload },
  ]);

  // effect-seam => confirmed is non-terminal (awaits redemption).
  const blockerOpened = blockerChain[0];
  const blockerConfirmed = blockerChain[1];
  if (blockerOpened === undefined || blockerConfirmed === undefined) {
    throw new Error('exclusivity.test.ts: buildChain must return transitions at index 0 and 1');
  }
  const openedNonTerminal = nonTerminal('open', isFinalLeg(0, 1), true); // true
  const confirmedNonTerminal = nonTerminal('confirmed', isFinalLeg(0, 1), true); // true (effect seam)
  const g = await store.appendTransition(null, blockerOpened, { nonTerminal: openedNonTerminal });
  assert.equal(g.appended, true);
  const c = await store.appendTransition('open', blockerConfirmed, {
    nonTerminal: confirmedNonTerminal,
  });
  assert.equal(c.appended, true);

  const { agent, operator } = create(makeConfig([profile], { store }));

  // A new open() for the SAME (profile, subject) — different content is irrelevant, C1
  // keys on (profileId, subjectRef) only.
  const staged = await agent.stage(
    { subject: 'other', total: 99 },
    profile.id,
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;

  const outcome = await operator.open(staged.value.stagedRef);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'record-exists');
  assert.equal(outcome.transitionRef, undefined);

  // NO open-state CAS was attempted: the blocker chain is unchanged (still [opened, confirmed]).
  const chain = await operator.readChain(blockerId);
  assert.equal(chain.length, 2, 'a non-open blocker gets NO `expired` append');
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'confirmed'],
  );
});

// === (5) expire-CAS state-mismatch -> record-exists, never re-loop =====================

/**
 * A Store that simulates a race: right before open()'s expire CAS on the blocker
 * lands, it flips the blocker OUT of 'open' (a competing `expired` append through the inner
 * store), so the real expire CAS sees state-mismatch. It also counts genesis attempts
 * (expectedCurrentState === null) and expire attempts so the test can assert open() made
 * EXACTLY ONE genesis attempt (no retry after the mismatch).
 */
class RaceStore implements Store {
  genesisAttempts = 0;
  expireAttempts = 0;
  blockerId: string | null = null;
  private injected = false;
  private readonly inner = new MemoryStore();

  putStaged(staged: StagedDraft): Promise<void> {
    return this.inner.putStaged(staged);
  }
  getStaged(stagedRef: string): Promise<StagedDraft | null> {
    return this.inner.getStaged(stagedRef);
  }
  readChain(recordId: string): Promise<Transition[]> {
    return this.inner.readChain(recordId);
  }
  chainHead(recordId: string): Promise<Digest | null> {
    return this.inner.chainHead(recordId);
  }

  async appendTransition(
    expectedCurrentState: RecordState | null,
    transition: Transition,
    meta: AppendMeta,
  ): Promise<AppendResult> {
    if (expectedCurrentState === null) this.genesisAttempts += 1;

    const isExpireCas =
      expectedCurrentState === 'open' &&
      transition.kind === 'expired' &&
      transition.recordId === this.blockerId;

    if (isExpireCas) {
      this.expireAttempts += 1;
      if (!this.injected && this.blockerId !== null) {
        this.injected = true;
        // Flip the blocker out of 'open' via a competing `expired` — THROUGH inner, so it
        // does not recurse this wrapper — so the real CAS below fails the state check.
        const chain = await this.inner.readChain(this.blockerId);
        const last = chain[chain.length - 1];
        if (last === undefined) {
          throw new Error(
            'exclusivity.test.ts: RaceStore — the blocker chain must have at least one transition to race against',
          );
        }
        const competing: Transition = {
          recordId: this.blockerId,
          seq: chain.length + 1,
          at: new Date(Date.parse(last.at) + 1000).toISOString(),
          kind: 'expired',
          payload: { bound: last.at },
          prevHash: transitionDigest(last),
        };
        await this.inner.appendTransition('open', competing, { nonTerminal: false });
      }
    }

    return this.inner.appendTransition(expectedCurrentState, transition, meta);
  }
  appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
  ): Promise<BatchResult> {
    return this.inner.appendBatch(expectedCurrentState, transitions, meta);
  }
  listDue(now: Date): Promise<string[]> {
    return this.inner.listDue(now);
  }
}

test('an expire-CAS state-mismatch (a race flipped the blocker) -> record-exists, NEVER re-loop (exactly one genesis attempt)', async () => {
  const store = new RaceStore();
  let clockNow = new Date(T0);
  const clock = () => clockNow;
  const { agent, operator } = createWithClock(
    makeConfig([captureProfile({ ttl: TTL_SECONDS })], { store }),
    clock,
  );

  const staged = await agent.stage(
    { subject: 'week-1', total: 40 },
    'test.capture.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;

  const first = await operator.open(staged.value.stagedRef);
  assert.equal(first.status, 'ok');
  if (first.status !== 'ok') return;
  store.blockerId = first.value.recordId;

  // Reset the attempt counters so only the SECOND open()'s attempts are measured.
  store.genesisAttempts = 0;
  store.expireAttempts = 0;

  // Lapse the blocker, then re-open: the exclusivity conflict fires, open() decides to
  // expire, but the injected race flips the blocker so the expire CAS state-mismatches.
  clockNow = new Date(T_LATE);
  const second = await operator.open(staged.value.stagedRef);

  assert.equal(second.status, 'refused');
  if (second.status !== 'refused') return;
  assert.equal(second.code, 'record-exists', 'an expire-CAS mismatch resolves to record-exists');
  assert.equal(second.transitionRef, undefined);

  // "Never re-loop": exactly ONE genesis attempt (the initial one). Had open() retried
  // after the mismatch, the retry would have SUCCEEDED (the blocker is now expired) and
  // genesisAttempts would be 2 — the record-exists verdict + the count both prove no retry.
  assert.equal(store.expireAttempts, 1, 'exactly one expire CAS was attempted');
  assert.equal(
    store.genesisAttempts,
    1,
    'exactly one genesis attempt — no retry after the expire-CAS mismatch',
  );
});
