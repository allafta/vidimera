// @vidimera/record — store-constraints.test.ts (SPEC §12's storage interface): the
// provisional in-memory `Store` — `putStaged`/`getStaged` idempotence, the CAS
// `appendTransition` (`expectedCurrentState`), and the four hand-implemented constraints:
//   C1 exclusivity — partial UNIQUE(profileId, subjectRef) over the persisted
//     `nonTerminal` flag: a second genesis for a still-live subject conflicts
//     `'exclusivity'` and names the BLOCKER's recordId (the minimal locator).
//   C2 sequencing   — UNIQUE(recordId, seq), server-authoritative seq = max+1.
//   C3 monotonicity — no state-leaving append after a terminal record (persisted
//     `nonTerminal === false`), except §12's two carve-outs: the state-preserving
//     `sealed` append, and a compromise-classed `refused` edge against a terminal
//     `confirmed`. (`isCompromiseCarveOut` also accepts a `redeeming` CAS target, but
//     §12's C1 makes any `redeeming` non-terminal, so per §5 that edge is admitted
//     directly and never reaches this gate.)
//   C4 seal-finality — after a `sealed` transition lands, no append of any kind is
//     admitted, not even the C3 compromise carve-out; rejected through the same
//     terminal-state-mismatch conflict shape C3 uses (SPEC §12: "no separate conflict
//     shape"), and its residual maps to `unsealable-state` at the `seal()` seam.
// Transitions are built by hand via `chain/encoding.ts`
// (`genesisPrevHash`/`transitionDigest`), driven one append at a time through the
// Store under test — NOT via `tests/helpers/chain.ts`'s `buildChain`, which
// assembles an already-linked chain independent of any Store and would bypass the
// very CAS/seq mechanics this file exists to exercise.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { genesisPrevHash, transitionDigest } from '../src/chain/encoding.js';
import { MemoryStore } from '../src/store/memory.js';
import type { IdentityAssertion, Transition } from '../src/types.js';
import { storeGenesis, storeNext } from './helpers/chain.js';

// --- fixtures ------------------------------------------------------------------------

const APPROVER: IdentityAssertion = { principal: 'approver:1', authority: 'session:test-app' };

/**
 * The `opened` transition's payload shape, still needed here directly (not via
 * `storeGenesis`) by the DataClone genesis test below, which must splice its own
 * function-valued member into an otherwise-normal payload.
 */
function openedPayload(profileId: string, subjectRef: string) {
  return {
    profileId,
    profileDigest: 'sha256:' + '0'.repeat(64),
    legId: 'approver-decide',
    subjectRef,
    contentDigest: 'sha256:' + '1'.repeat(64),
  };
}

// === putStaged / getStaged ===========================================================

test('putStaged/getStaged: round-trips a StagedDraft by id', async () => {
  const store = new MemoryStore();
  const draft = {
    id: 'staged-1',
    profileId: 'p1',
    legId: 'leg-1',
    subjectRef: 'subj-1',
    contentDigest: 'sha256:' + 'a'.repeat(64),
  };
  await store.putStaged(draft);
  assert.deepEqual(await store.getStaged('staged-1'), draft);
});

test('getStaged: returns null for an unknown stagedRef', async () => {
  const store = new MemoryStore();
  assert.equal(await store.getStaged('nope'), null);
});

test('putStaged: idempotent by staged.id — putting the same id twice does not error and getStaged still returns exactly one value', async () => {
  const store = new MemoryStore();
  const draft = {
    id: 'staged-2',
    profileId: 'p1',
    legId: 'leg-1',
    subjectRef: 'subj-2',
    contentDigest: 'sha256:' + 'b'.repeat(64),
  };
  await store.putStaged(draft);
  await store.putStaged(draft); // second call: must not throw
  assert.deepEqual(await store.getStaged('staged-2'), draft);
});

test('putStaged: first-write-wins — a second put under the SAME id with DIFFERENT content does not overwrite the first (SPEC §12: "idempotent, first-write-wins ... keeps the first write rather than overwriting it")', async () => {
  const store = new MemoryStore();
  const first = {
    id: 'staged-collision',
    profileId: 'p1',
    legId: 'leg-1',
    subjectRef: 'subj-first',
    contentDigest: 'sha256:' + 'c'.repeat(64),
  };
  const second = {
    id: 'staged-collision', // SAME id as `first`
    profileId: 'p2', // every other field differs
    legId: 'leg-2',
    subjectRef: 'subj-second',
    contentDigest: 'sha256:' + 'd'.repeat(64),
  };
  await store.putStaged(first);
  await store.putStaged(second); // a genuine same-id collision — must NOT overwrite
  assert.deepEqual(
    await store.getStaged('staged-collision'),
    first,
    'a same-id collision must keep the FIRST write; last-write-wins is the wrong behavior',
  );
});

test('getStaged: returns a FRESH value on every call — mutating a previously returned draft can never corrupt store-internal state (SPEC §12: "a caller mutating a returned chain, head, or staged draft can never corrupt store-internal state")', async () => {
  const store = new MemoryStore();
  const draft = {
    id: 'staged-fresh-read',
    profileId: 'p1',
    legId: 'leg-1',
    subjectRef: 'subj-fresh',
    contentDigest: 'sha256:' + 'e'.repeat(64),
  };
  await store.putStaged(draft);
  // An INDEPENDENT snapshot of the original values, taken before any mutation below and
  // never itself passed to the store — `draft` cannot be reused as the "expected" value
  // here, because `putStaged` may have stored that very object by reference, which would
  // make the assertion vacuously pass (the "expected" value would be mutated right along
  // with the "actual" one, since they'd be the same object).
  const originalSnapshot = { ...draft };

  const firstRead = await store.getStaged('staged-fresh-read');
  if (firstRead === null) {
    throw new Error('expected a staged draft, got null');
  }
  firstRead.profileId = 'tampered-by-caller';
  firstRead.subjectRef = 'tampered-by-caller';

  const secondRead = await store.getStaged('staged-fresh-read');
  assert.deepEqual(
    secondRead,
    originalSnapshot,
    "mutating the first read's returned object must not be visible to a later getStaged call",
  );
});

// === genesis + state CAS =============================================================

test('appendTransition: a well-formed genesis append (expectedCurrentState:null, new recordId) succeeds', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-a', 'profile.p1', 'subject:a');
  const result = await store.appendTransition(null, genesis, { nonTerminal: true });
  assert.deepEqual(result, {
    appended: true,
    seq: 1,
    transitionDigest: transitionDigest(genesis),
  });
});

test('appendTransition: CAS mismatch — a non-genesis append whose expectedCurrentState does not match the record\'s actual current state -> conflict:"state-mismatch"', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-b', 'profile.p1', 'subject:b');
  await store.appendTransition(null, genesis, { nonTerminal: true });

  // Actual current state is 'open'; claim 'confirmed' instead.
  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  const result = await store.appendTransition('confirmed', confirmed, { nonTerminal: false });
  assert.deepEqual(result, { appended: false, conflict: 'state-mismatch' });
});

test('appendTransition: a genesis append against an ALREADY-EXISTING recordId fails -> conflict:"state-mismatch" (expectedCurrentState:null requires the record not to exist yet)', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-c', 'profile.p1', 'subject:c');
  await store.appendTransition(null, genesis, { nonTerminal: true });

  // Re-propose a "genesis" for the SAME recordId (distinct subjectRef so C1
  // exclusivity plays no part — this must fail on the state CAS alone).
  const secondGenesisAttempt = storeGenesis('rec-c', 'profile.p1', 'subject:other');
  const result = await store.appendTransition(null, secondGenesisAttempt, { nonTerminal: true });
  assert.deepEqual(result, { appended: false, conflict: 'state-mismatch' });
});

// === C1 exclusivity ===================================================================

test('appendTransition: C1 exclusivity — a second genesis for a subject with a currently-live (nonTerminal) record -> conflict:"exclusivity" naming the BLOCKER\'s recordId', async () => {
  const store = new MemoryStore();
  const first = storeGenesis('rec-blocker', 'profile.p1', 'subject:shared');
  const firstResult = await store.appendTransition(null, first, { nonTerminal: true }); // nonTerminal:true -> still "live"
  assert.equal(firstResult.appended, true);

  const second = storeGenesis('rec-challenger', 'profile.p1', 'subject:shared');
  const result = await store.appendTransition(null, second, { nonTerminal: true });
  assert.deepEqual(result, {
    appended: false,
    conflict: 'exclusivity',
    blockingRecordId: 'rec-blocker',
  });
});

test('appendTransition: C1 exclusivity does not fire across DIFFERENT (profileId, subjectRef) pairs', async () => {
  const store = new MemoryStore();
  await store.appendTransition(null, storeGenesis('rec-x', 'profile.p1', 'subject:x'), {
    nonTerminal: true,
  });
  const other = storeGenesis('rec-y', 'profile.p1', 'subject:y'); // different subjectRef
  const result = await store.appendTransition(null, other, { nonTerminal: true });
  assert.equal(result.appended, true);
});

test('appendTransition: C1 exclusivity does not fire once the blocking record is no longer nonTerminal (e.g. terminal-confirmed) — a fresh genesis for the same subject succeeds', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-done', 'profile.p1', 'subject:reuse');
  await store.appendTransition(null, genesis, { nonTerminal: true });
  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  const confirmResult = await store.appendTransition('open', confirmed, {
    nonTerminal: false,
  }); // capture-terminal: nonTerminal:false
  assert.equal(confirmResult.appended, true);

  const reopened = storeGenesis('rec-reopen', 'profile.p1', 'subject:reuse');
  const result = await store.appendTransition(null, reopened, { nonTerminal: true });
  assert.equal(
    result.appended,
    true,
    'the subject is no longer "live" once its blocking record went terminal',
  );
});

// === C2 sequencing =====================================================================

test('appendTransition: C2 sequencing — a stale seq (not max+1) -> conflict:"seq"', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-seq', 'profile.p1', 'subject:seq');
  await store.appendTransition(null, genesis, { nonTerminal: true });

  const staleSeq: Transition = {
    recordId: 'rec-seq',
    seq: 3, // max+1 would be 2 — this skips ahead
    at: '2026-07-24T00:00:05.000Z',
    kind: 'confirmed',
    payload: { actor: APPROVER },
    prevHash: transitionDigest(genesis),
  };
  const result = await store.appendTransition('open', staleSeq, { nonTerminal: false });
  assert.deepEqual(result, { appended: false, conflict: 'seq' });
});

test('appendTransition: after a seq conflict, retrying with the CORRECT max+1 seq succeeds (the library re-read-and-retry path)', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-seq-retry', 'profile.p1', 'subject:seq-retry');
  await store.appendTransition(null, genesis, { nonTerminal: true });

  const staleSeq = { ...storeNext(genesis, 'confirmed', { actor: APPROVER }), seq: 5 };
  const conflict = await store.appendTransition('open', staleSeq, { nonTerminal: false });
  assert.equal(conflict.appended, false);

  const corrected = storeNext(genesis, 'confirmed', { actor: APPROVER });
  const result = await store.appendTransition('open', corrected, { nonTerminal: false });
  assert.deepEqual(result, {
    appended: true,
    seq: 2,
    transitionDigest: transitionDigest(corrected),
  });
});

// === C3 monotonicity ===================================================================

test('appendTransition: C3 — after a TERMINAL confirmed (capture-only, nonTerminal:false), a further state-leaving non-carve-out append is BLOCKED', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-terminal', 'profile.p1', 'subject:terminal');
  await store.appendTransition(null, genesis, { nonTerminal: true });
  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  const confirmResult = await store.appendTransition('open', confirmed, {
    nonTerminal: false,
  }); // terminal: nonTerminal:false
  assert.equal(confirmResult.appended, true);

  // A plain (non-compromise) refused edge from an already-terminal confirmed record:
  // state-leaving, not a carve-out -> C3 must block it even though expectedCurrentState
  // correctly names the record's actual current state ('confirmed').
  const blocked = storeNext(confirmed, 'refused', { code: 'content-drift' });
  const result = await store.appendTransition('confirmed', blocked, { nonTerminal: false });
  assert.equal(
    result.appended,
    false,
    'C3 must reject a state-leaving, non-carve-out append onto a terminal record',
  );
});

test('appendTransition: C3 — the SEALED carve-out (state-preserving) is allowed through even on a terminal record', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-sealed', 'profile.p1', 'subject:sealed');
  await store.appendTransition(null, genesis, { nonTerminal: true });
  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  await store.appendTransition('open', confirmed, { nonTerminal: false }); // terminal

  const sealed = storeNext(confirmed, 'sealed', {
    note: 'not emitted by this kernel build',
  });
  // A sealed append preserves state, so the record's nonTerminal flag is unchanged (false).
  const result = await store.appendTransition('confirmed', sealed, { nonTerminal: false });
  assert.equal(
    result.appended,
    true,
    'sealed is state-preserving — it never leaves the terminal state, so C3 must not block it',
  );
});

test('appendTransition: C3 — the COMPROMISE carve-out (confirmed -> refused, code class "compromise") is allowed through even on a terminal (capture-only) record', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-compromise', 'profile.p1', 'subject:compromise');
  await store.appendTransition(null, genesis, { nonTerminal: true });
  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  await store.appendTransition('open', confirmed, { nonTerminal: false }); // terminal, capture-only

  const compromiseRefusal = storeNext(confirmed, 'refused', { code: 'chain-compromise' });
  const result = await store.appendTransition('confirmed', compromiseRefusal, {
    nonTerminal: false,
  }); // refused is always terminal
  assert.equal(
    result.appended,
    true,
    'a compromise-classed refused edge from confirmed must pass C3',
  );

  // But once the record has settled into 'refused', a further state-leaving append
  // that is NOT itself a compromise-refused edge (e.g. 'confirmed') is blocked, even
  // though 'refused' is exactly the state the compromise carve-out reads from.
  const bogusReconfirm = storeNext(compromiseRefusal, 'confirmed', { actor: APPROVER });
  const blocked = await store.appendTransition('refused', bogusReconfirm, { nonTerminal: false });
  assert.equal(
    blocked.appended,
    false,
    'kind:"confirmed" after "refused" is not a carve-out and must be blocked',
  );
});

test('appendTransition: C3 does NOT block state-leaving appends while the record is still non-terminal (e.g. open -> confirmed)', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-live', 'profile.p1', 'subject:live');
  await store.appendTransition(null, genesis, { nonTerminal: true }); // nonTerminal:true ("open")
  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  const result = await store.appendTransition('open', confirmed, { nonTerminal: true }); // still non-terminal (effect-seam)
  assert.equal(result.appended, true);
});

// === readChain / chainHead =============================================================

test('readChain/chainHead: an unknown recordId -> readChain [] and chainHead null', async () => {
  const store = new MemoryStore();
  assert.deepEqual(await store.readChain('nope'), []);
  assert.equal(await store.chainHead('nope'), null);
});

test("readChain/chainHead: reflect appended transitions in order, and chainHead is the LAST transition's transitionDigest", async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-read', 'profile.p1', 'subject:read');
  await store.appendTransition(null, genesis, { nonTerminal: true });
  assert.deepEqual(await store.readChain('rec-read'), [genesis]);
  assert.equal(await store.chainHead('rec-read'), transitionDigest(genesis));

  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  await store.appendTransition('open', confirmed, { nonTerminal: false });
  assert.deepEqual(await store.readChain('rec-read'), [genesis, confirmed]);
  assert.equal(await store.chainHead('rec-read'), transitionDigest(confirmed));
});

test('readChain: a failed append does not mutate the stored chain', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-immut', 'profile.p1', 'subject:immut');
  await store.appendTransition(null, genesis, { nonTerminal: true });

  const badSeq: Transition = {
    ...storeNext(genesis, 'confirmed', { actor: APPROVER }),
    seq: 99,
  };
  const conflict = await store.appendTransition('open', badSeq, { nonTerminal: false });
  assert.equal(conflict.appended, false);
  assert.deepEqual(await store.readChain('rec-immut'), [genesis]);
});

// === SPEC §12 freshness — readChain / appendTransition / putStaged must not alias ======
//
// `readChain` used to return `[...existing.chain]` — a copy of the ARRAY, but not of its
// elements, handing back the store's own Transition objects (and their payloads) by
// reference. `readChain` is agent-reachable (agent-surface.ts), so an agent holding only
// that handle could silently rewrite persisted chain state through the returned
// reference. Each test below captures an INDEPENDENT snapshot of the expected values
// BEFORE any mutation (never itself passed to the store) — a snapshot built from the same
// object the store might retain by reference would be mutated right along with it,
// making the assertion vacuously pass regardless of whether the defect is fixed.

test('readChain: returns FRESH transitions — mutating a returned transition\'s payload can never corrupt store-internal state (SPEC §12: "a caller mutating a returned chain, head, or staged draft can never corrupt store-internal state")', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-fresh-read', 'profile.p1', 'subject:fresh-read');
  await store.appendTransition(null, genesis, { nonTerminal: true });
  const confirmed = storeNext(genesis, 'confirmed', { actor: { ...APPROVER } });
  await store.appendTransition('open', confirmed, { nonTerminal: false });

  // Independent snapshot, taken BEFORE any mutation.
  const expectedHead = transitionDigest(confirmed);
  const expectedActorPrincipal = APPROVER.principal;

  const firstRead = await store.readChain('rec-fresh-read');
  const target = firstRead[1];
  if (target === undefined) throw new Error('expected the confirmed transition at index 1');
  (target.payload as { actor: { principal: string } }).actor.principal = 'tampered-by-caller';

  const secondRead = await store.readChain('rec-fresh-read');
  const secondTransition = secondRead[1];
  if (secondTransition === undefined) {
    throw new Error('expected the confirmed transition at index 1');
  }
  assert.equal(
    (secondTransition.payload as { actor: { principal: string } }).actor.principal,
    expectedActorPrincipal,
    "mutating a previously-read transition's payload must not be visible to a later readChain call",
  );
  assert.equal(
    await store.chainHead('rec-fresh-read'),
    expectedHead,
    'chainHead must recompute from the STORED (untampered) transition, not a mutated live reference',
  );
});

test("appendTransition (non-genesis): does NOT retain the caller's own Transition object — mutating the ORIGINAL object after a successful append does not corrupt store-internal state (kernel/finalize.ts's real risk: `payload: { actor: identity }` embeds the caller-supplied identity verbatim)", async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-write-retain', 'profile.p1', 'subject:write-retain');
  await store.appendTransition(null, genesis, { nonTerminal: true });

  const confirmed = storeNext(genesis, 'confirmed', { actor: { ...APPROVER } });
  const result = await store.appendTransition('open', confirmed, { nonTerminal: false });
  assert.equal(result.appended, true);

  // Mutate the CALLER's OWN object directly (not something returned by the store).
  (confirmed.payload as { actor: { principal: string } }).actor.principal = 'tampered-by-caller';

  const chain = await store.readChain('rec-write-retain');
  const stored = chain[1];
  if (stored === undefined) throw new Error('expected the confirmed transition at index 1');
  assert.equal(
    (stored.payload as { actor: { principal: string } }).actor.principal,
    APPROVER.principal,
    "mutating the caller's own transition object after a successful append must not corrupt the stored chain",
  );
});

test("putStaged: does NOT retain the caller's own StagedDraft object — mutating the ORIGINAL draft after a successful put does not corrupt store-internal state", async () => {
  const store = new MemoryStore();
  const draft = {
    id: 'staged-caller-retain',
    profileId: 'p1',
    legId: 'leg-1',
    subjectRef: 'subj-caller-retain',
    contentDigest: 'sha256:' + 'f'.repeat(64),
  };
  // Independent snapshot, taken BEFORE the put (and before any mutation) — see the
  // section comment above for why `draft` itself cannot serve as the expected value.
  const originalSnapshot = { ...draft };
  await store.putStaged(draft);

  // Mutate the CALLER's OWN object directly (not something returned by getStaged) — the
  // risk this test names: a host builds a StagedDraft, calls the Store, then mutates its
  // own object afterward.
  draft.profileId = 'tampered-by-caller';
  draft.subjectRef = 'tampered-by-caller';

  const read = await store.getStaged('staged-caller-retain');
  assert.deepEqual(
    read,
    originalSnapshot,
    "mutating the caller's own draft object after a successful put must not corrupt the stored draft",
  );
});

test("appendTransition (genesis): does NOT retain the caller's own Transition object — mutating the ORIGINAL object after a successful genesis append does not corrupt store-internal state (kernel/open.ts reuses one openedTransition object across its first attempt and an expire-then-retry, so aliasing here is easy to introduce by accident)", async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-genesis-retain', 'profile.p1', 'subject:genesis-retain');
  const result = await store.appendTransition(null, genesis, { nonTerminal: true });
  assert.equal(result.appended, true);

  // Mutate the CALLER's OWN genesis object directly.
  (genesis.payload as { profileId: string }).profileId = 'tampered-by-caller';

  const chain = await store.readChain('rec-genesis-retain');
  const stored = chain[0];
  if (stored === undefined) throw new Error('expected the genesis transition at index 0');
  assert.equal(
    (stored.payload as { profileId: string }).profileId,
    'profile.p1',
    "mutating the caller's own genesis transition object after a successful append must not corrupt the stored chain",
  );
});

// === DataCloneError decision pin (see store/memory.ts's store-clone decision comment) ==
//
// `structuredClone` — used above to isolate store-internal state from a caller's own
// object — THROWS `DataCloneError` on a function- or symbol-valued member anywhere in the
// object graph. This is a DELIBERATE choice (memory.ts documents the full reasoning): a
// payload that digests fine today (JCS silently OMITS such a member rather than throwing,
// jcs.ts's `hasNoJsonForm`) now fails LOUDLY at the store seam instead of being silently
// accepted by reference. These tests pin that choice so it cannot change by accident.

test('appendTransition (non-genesis): a payload member carrying a FUNCTION (e.g. a class-instance identity with a method, not a plain literal) throws DataCloneError rather than being silently stored', async () => {
  const store = new MemoryStore();
  const genesis = storeGenesis(
    'rec-dataclone-subsequent',
    'profile.p1',
    'subject:dataclone-subsequent',
  );
  await store.appendTransition(null, genesis, { nonTerminal: true });

  const actorWithMethod = {
    principal: 'approver:1',
    authority: 'session:test-app',
    describe(): string {
      return this.principal;
    },
  };
  const confirmed = storeNext(genesis, 'confirmed', { actor: actorWithMethod });

  await assert.rejects(
    () => store.appendTransition('open', confirmed, { nonTerminal: false }),
    (err: unknown) => err instanceof Error && err.name === 'DataCloneError',
    'a function-valued payload member must throw DataCloneError at the clone-on-write seam',
  );
});

test('appendTransition (genesis): a payload member carrying a FUNCTION throws DataCloneError rather than being silently stored', async () => {
  const store = new MemoryStore();
  const genesisPayloadWithMethod = {
    ...openedPayload('profile.p1', 'subject:dataclone-genesis'),
    describe(): string {
      return 'not a plain literal';
    },
  };
  const genesis: Transition = {
    recordId: 'rec-dataclone-genesis',
    seq: 1,
    at: '2026-07-24T00:00:00.000Z',
    kind: 'opened',
    payload: genesisPayloadWithMethod,
    prevHash: genesisPrevHash('rec-dataclone-genesis'),
  };

  await assert.rejects(
    () => store.appendTransition(null, genesis, { nonTerminal: true }),
    (err: unknown) => err instanceof Error && err.name === 'DataCloneError',
    'a function-valued payload member must throw DataCloneError at the genesis clone-on-write seam',
  );
});

test('putStaged: a StagedDraft carrying an extra FUNCTION-valued property throws DataCloneError rather than being silently stored', async () => {
  const store = new MemoryStore();
  const draftWithMethod = {
    id: 'staged-dataclone',
    profileId: 'p1',
    legId: 'leg-1',
    subjectRef: 'subj-dataclone',
    contentDigest: 'sha256:' + '2'.repeat(64),
    describe(): string {
      return 'not a plain StagedDraft literal';
    },
  };

  await assert.rejects(
    () => store.putStaged(draftWithMethod),
    (err: unknown) => err instanceof Error && err.name === 'DataCloneError',
    'a function-valued extra property must throw DataCloneError at the clone-on-write seam',
  );
});

// === C4 seal-finality ==================================================================

/** An open record advanced to terminal `confirmed`, then sealed. Returns the sealed chain. */
async function sealedRecord(store: MemoryStore, recordId = 'rec-sealed') {
  const genesis = storeGenesis(recordId, 'profile.p1', 'subject:s1');
  assert.equal((await store.appendTransition(null, genesis, { nonTerminal: true })).appended, true);
  const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
  assert.equal(
    (await store.appendTransition('open', confirmed, { nonTerminal: false })).appended,
    true,
  );
  const sealed = storeNext(confirmed, 'sealed', { chainHead: transitionDigest(confirmed) });
  const res = await store.appendTransition('confirmed', sealed, { nonTerminal: false });
  // The seal itself must be ADMITTED: `sealed` maps to null in `stateOf`, so
  // `isStateLeaving('sealed')` is false and C3's terminal gate never reaches its predicate.
  assert.equal(res.appended, true, 'the seal append is admitted against a terminal record');
  return { sealed, recordId };
}

test('C4: after a `sealed` transition, no further append of any kind is admitted', async () => {
  const store = new MemoryStore();
  const { sealed, recordId } = await sealedRecord(store);
  const before = await store.readChain(recordId);

  const later = storeNext(sealed, 'expired', { bound: '2026-01-01T00:00:00.000Z' });
  const res = await store.appendTransition('confirmed', later, { nonTerminal: false });

  assert.deepEqual(res, { appended: false, conflict: 'state-mismatch' });
  assert.deepEqual(await store.readChain(recordId), before, 'nothing landed');
});

test('C4 bars even a compromise refusal edge — the one append C3 would otherwise admit', async () => {
  // SPEC §12 names this case: "not even a `compromise` refusal edge". It is the one place C4
  // has to override a rule that says yes — C3's carve-out admits `confirmed → refused` for a
  // compromise-classed code, and C4 must refuse it once the record is sealed.
  const store = new MemoryStore();
  const { sealed, recordId } = await sealedRecord(store);
  const before = await store.readChain(recordId);

  const compromise = storeNext(sealed, 'refused', { code: 'chain-compromise' });
  const res = await store.appendTransition('confirmed', compromise, { nonTerminal: false });

  assert.deepEqual(res, { appended: false, conflict: 'state-mismatch' });
  assert.deepEqual(await store.readChain(recordId), before, 'nothing landed');
});

test('C4 in appendBatch is an ENTRY-level failure and reports index 0', async () => {
  const store = new MemoryStore();
  const { sealed, recordId } = await sealedRecord(store);
  const before = await store.readChain(recordId);

  const a = storeNext(sealed, 'consultation-recorded', { kind: 'facts', verdict: 'pass' });
  const b = storeNext(a, 'refused', { code: 'chain-compromise' });
  const res = await store.appendBatch('confirmed', [a, b], { nonTerminal: false });

  assert.deepEqual(res, { appended: false, conflict: 'state-mismatch', index: 0 });
  assert.deepEqual(await store.readChain(recordId), before, 'all-or-nothing: nothing landed');
});
