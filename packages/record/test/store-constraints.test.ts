// @vidimera/record — store-constraints.test.ts (design §2 "store/store.ts"/"store/memory.ts",
// §4 "Provisional Store" IN FULL, §6 "store-constraints.test.ts"): the provisional
// in-memory `Store` — `putStaged`/`getStaged` idempotence, the CAS `appendTransition`
// (`expectedCurrentState`), and the three hand-implemented constraints:
//   C1 exclusivity — partial UNIQUE(profileId, subjectRef) over the persisted
//     `nonTerminal` flag: a second genesis for a still-live subject conflicts
//     `'exclusivity'` and names the BLOCKER's recordId (OQ2-10 minimal locator).
//   C2 sequencing   — UNIQUE(recordId, seq), server-authoritative seq = max+1.
//   C3 monotonicity — no state-leaving append after a terminal record (persisted
//     `nonTerminal === false`), except the `sealed` (state-preserving) and
//     compromise-classed-refusal-from-confirmed/redeeming carve-outs.
// Task-5 brief Step 1. Transitions are built by hand via `chain/encoding.ts`
// (`genesisPrevHash`/`transitionDigest`), driven one append at a time through the
// Store under test — NOT via `tests/helpers/chain.ts`'s `buildChain`, which
// assembles an already-linked chain independent of any Store and would bypass the
// very CAS/seq mechanics this file exists to exercise.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { genesisPrevHash, transitionDigest } from '../src/chain/encoding.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Digest, IdentityAssertion, RecordState, Transition } from '../src/types.js';

// --- fixtures ------------------------------------------------------------------------

const APPROVER: IdentityAssertion = { principal: 'approver:1', authority: 'session:tide-web' };

function openedPayload(profileId: string, subjectRef: string) {
  return {
    profileId,
    profileDigest: 'sha256:' + '0'.repeat(64),
    legId: 'approver-decide',
    subjectRef,
    contentDigest: 'sha256:' + '1'.repeat(64),
  };
}

/** Genesis transition for `recordId` (seq 1, prevHash = genesis rule). */
function genesisTransition(
  recordId: string,
  profileId: string,
  subjectRef: string,
  at = '2026-07-24T00:00:00.000Z',
): Transition {
  return {
    recordId,
    seq: 1,
    at,
    kind: 'opened',
    payload: openedPayload(profileId, subjectRef),
    prevHash: genesisPrevHash(recordId),
  };
}

/** Next transition chained honestly onto `prev` (seq+1, prevHash = prev's own digest). */
function nextTransition(
  prev: Transition,
  kind: Transition['kind'],
  payload: unknown,
  at?: string,
): Transition {
  return {
    recordId: prev.recordId,
    seq: prev.seq + 1,
    at: at ?? new Date(Date.UTC(2026, 0, 1, 0, 0, prev.seq)).toISOString(),
    kind,
    payload,
    prevHash: transitionDigest(prev),
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
  const genesis = genesisTransition('rec-a', 'profile.p1', 'subject:a');
  const result = await store.appendTransition(null, genesis, true);
  assert.deepEqual(result, {
    appended: true,
    seq: 1,
    transitionDigest: transitionDigest(genesis),
  });
});

test('appendTransition: CAS mismatch — a non-genesis append whose expectedCurrentState does not match the record\'s actual current state -> conflict:"state-mismatch"', async () => {
  const store = new MemoryStore();
  const genesis = genesisTransition('rec-b', 'profile.p1', 'subject:b');
  await store.appendTransition(null, genesis, true);

  // Actual current state is 'open'; claim 'confirmed' instead.
  const confirmed = nextTransition(genesis, 'confirmed', { actor: APPROVER });
  const result = await store.appendTransition('confirmed', confirmed, false);
  assert.deepEqual(result, { appended: false, conflict: 'state-mismatch' });
});

test('appendTransition: a genesis append against an ALREADY-EXISTING recordId fails -> conflict:"state-mismatch" (expectedCurrentState:null requires the record not to exist yet)', async () => {
  const store = new MemoryStore();
  const genesis = genesisTransition('rec-c', 'profile.p1', 'subject:c');
  await store.appendTransition(null, genesis, true);

  // Re-propose a "genesis" for the SAME recordId (distinct subjectRef so C1
  // exclusivity plays no part — this must fail on the state CAS alone).
  const secondGenesisAttempt = genesisTransition('rec-c', 'profile.p1', 'subject:other');
  const result = await store.appendTransition(null, secondGenesisAttempt, true);
  assert.deepEqual(result, { appended: false, conflict: 'state-mismatch' });
});

// === C1 exclusivity ===================================================================

test('appendTransition: C1 exclusivity — a second genesis for a subject with a currently-live (nonTerminal) record -> conflict:"exclusivity" naming the BLOCKER\'s recordId', async () => {
  const store = new MemoryStore();
  const first = genesisTransition('rec-blocker', 'profile.p1', 'subject:shared');
  const firstResult = await store.appendTransition(null, first, true); // nonTerminal:true -> still "live"
  assert.equal(firstResult.appended, true);

  const second = genesisTransition('rec-challenger', 'profile.p1', 'subject:shared');
  const result = await store.appendTransition(null, second, true);
  assert.deepEqual(result, {
    appended: false,
    conflict: 'exclusivity',
    blockingRecordId: 'rec-blocker',
  });
});

test('appendTransition: C1 exclusivity does not fire across DIFFERENT (profileId, subjectRef) pairs', async () => {
  const store = new MemoryStore();
  await store.appendTransition(null, genesisTransition('rec-x', 'profile.p1', 'subject:x'), true);
  const other = genesisTransition('rec-y', 'profile.p1', 'subject:y'); // different subjectRef
  const result = await store.appendTransition(null, other, true);
  assert.equal(result.appended, true);
});

test('appendTransition: C1 exclusivity does not fire once the blocking record is no longer nonTerminal (e.g. terminal-confirmed) — a fresh genesis for the same subject succeeds', async () => {
  const store = new MemoryStore();
  const genesis = genesisTransition('rec-done', 'profile.p1', 'subject:reuse');
  await store.appendTransition(null, genesis, true);
  const confirmed = nextTransition(genesis, 'confirmed', { actor: APPROVER });
  const confirmResult = await store.appendTransition('open', confirmed, false); // capture-terminal: nonTerminal:false
  assert.equal(confirmResult.appended, true);

  const reopened = genesisTransition('rec-reopen', 'profile.p1', 'subject:reuse');
  const result = await store.appendTransition(null, reopened, true);
  assert.equal(
    result.appended,
    true,
    'the subject is no longer "live" once its blocking record went terminal',
  );
});

// === C2 sequencing =====================================================================

test('appendTransition: C2 sequencing — a stale seq (not max+1) -> conflict:"seq"', async () => {
  const store = new MemoryStore();
  const genesis = genesisTransition('rec-seq', 'profile.p1', 'subject:seq');
  await store.appendTransition(null, genesis, true);

  const staleSeq: Transition = {
    recordId: 'rec-seq',
    seq: 3, // max+1 would be 2 — this skips ahead
    at: '2026-07-24T00:00:05.000Z',
    kind: 'confirmed',
    payload: { actor: APPROVER },
    prevHash: transitionDigest(genesis),
  };
  const result = await store.appendTransition('open', staleSeq, false);
  assert.deepEqual(result, { appended: false, conflict: 'seq' });
});

test('appendTransition: after a seq conflict, retrying with the CORRECT max+1 seq succeeds (the library re-read-and-retry path)', async () => {
  const store = new MemoryStore();
  const genesis = genesisTransition('rec-seq-retry', 'profile.p1', 'subject:seq-retry');
  await store.appendTransition(null, genesis, true);

  const staleSeq = { ...nextTransition(genesis, 'confirmed', { actor: APPROVER }), seq: 5 };
  const conflict = await store.appendTransition('open', staleSeq, false);
  assert.equal(conflict.appended, false);

  const corrected = nextTransition(genesis, 'confirmed', { actor: APPROVER });
  const result = await store.appendTransition('open', corrected, false);
  assert.deepEqual(result, {
    appended: true,
    seq: 2,
    transitionDigest: transitionDigest(corrected),
  });
});

// === C3 monotonicity ===================================================================

test('appendTransition: C3 — after a TERMINAL confirmed (capture-only, nonTerminal:false), a further state-leaving non-carve-out append is BLOCKED', async () => {
  const store = new MemoryStore();
  const genesis = genesisTransition('rec-terminal', 'profile.p1', 'subject:terminal');
  await store.appendTransition(null, genesis, true);
  const confirmed = nextTransition(genesis, 'confirmed', { actor: APPROVER });
  const confirmResult = await store.appendTransition('open', confirmed, false); // terminal: nonTerminal:false
  assert.equal(confirmResult.appended, true);

  // A plain (non-compromise) refused edge from an already-terminal confirmed record:
  // state-leaving, not a carve-out -> C3 must block it even though expectedCurrentState
  // correctly names the record's actual current state ('confirmed').
  const blocked = nextTransition(confirmed, 'refused', { code: 'content-drift' });
  const result = await store.appendTransition('confirmed', blocked, false);
  assert.equal(
    result.appended,
    false,
    'C3 must reject a state-leaving, non-carve-out append onto a terminal record',
  );
});

test('appendTransition: C3 — the SEALED carve-out (state-preserving) is allowed through even on a terminal record', async () => {
  const store = new MemoryStore();
  const genesis = genesisTransition('rec-sealed', 'profile.p1', 'subject:sealed');
  await store.appendTransition(null, genesis, true);
  const confirmed = nextTransition(genesis, 'confirmed', { actor: APPROVER });
  await store.appendTransition('open', confirmed, false); // terminal

  const sealed = nextTransition(confirmed, 'sealed', {
    note: 'slice-4, not emitted by the slice-3 kernel',
  });
  // A sealed append preserves state, so the record's nonTerminal flag is unchanged (false).
  const result = await store.appendTransition('confirmed', sealed, false);
  assert.equal(
    result.appended,
    true,
    'sealed is state-preserving — it never leaves the terminal state, so C3 must not block it',
  );
});

test('appendTransition: C3 — the COMPROMISE carve-out (confirmed -> refused, code class "compromise") is allowed through even on a terminal (capture-only) record', async () => {
  const store = new MemoryStore();
  const genesis = genesisTransition('rec-compromise', 'profile.p1', 'subject:compromise');
  await store.appendTransition(null, genesis, true);
  const confirmed = nextTransition(genesis, 'confirmed', { actor: APPROVER });
  await store.appendTransition('open', confirmed, false); // terminal, capture-only

  const compromiseRefusal = nextTransition(confirmed, 'refused', { code: 'chain-compromise' });
  const result = await store.appendTransition('confirmed', compromiseRefusal, false); // refused is always terminal
  assert.equal(
    result.appended,
    true,
    'a compromise-classed refused edge from confirmed must pass C3',
  );

  // But once the record has settled into 'refused', a further state-leaving append
  // that is NOT itself a compromise-refused edge (e.g. 'confirmed') is blocked, even
  // though 'refused' is exactly the state the compromise carve-out reads from.
  const bogusReconfirm = nextTransition(compromiseRefusal, 'confirmed', { actor: APPROVER });
  const blocked = await store.appendTransition('refused', bogusReconfirm, false);
  assert.equal(
    blocked.appended,
    false,
    'kind:"confirmed" after "refused" is not a carve-out and must be blocked',
  );
});

test('appendTransition: C3 does NOT block state-leaving appends while the record is still non-terminal (e.g. open -> confirmed)', async () => {
  const store = new MemoryStore();
  const genesis = genesisTransition('rec-live', 'profile.p1', 'subject:live');
  await store.appendTransition(null, genesis, true); // nonTerminal:true ("open")
  const confirmed = nextTransition(genesis, 'confirmed', { actor: APPROVER });
  const result = await store.appendTransition('open', confirmed, true); // still non-terminal (effect-seam)
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
  const genesis = genesisTransition('rec-read', 'profile.p1', 'subject:read');
  await store.appendTransition(null, genesis, true);
  assert.deepEqual(await store.readChain('rec-read'), [genesis]);
  assert.equal(await store.chainHead('rec-read'), transitionDigest(genesis));

  const confirmed = nextTransition(genesis, 'confirmed', { actor: APPROVER });
  await store.appendTransition('open', confirmed, false);
  assert.deepEqual(await store.readChain('rec-read'), [genesis, confirmed]);
  assert.equal(await store.chainHead('rec-read'), transitionDigest(confirmed));
});

test('readChain: a failed append does not mutate the stored chain', async () => {
  const store = new MemoryStore();
  const genesis = genesisTransition('rec-immut', 'profile.p1', 'subject:immut');
  await store.appendTransition(null, genesis, true);

  const badSeq: Transition = {
    ...nextTransition(genesis, 'confirmed', { actor: APPROVER }),
    seq: 99,
  };
  const conflict = await store.appendTransition('open', badSeq, false);
  assert.equal(conflict.appended, false);
  assert.deepEqual(await store.readChain('rec-immut'), [genesis]);
});
