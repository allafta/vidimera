// @vidimera/record — test/conformance/store-conformance.ts: the backing-parameterized
// conformance suite — SPEC §12: an inheriting project's backings are "held equivalent by a
// single **backing-parameterized conformance suite** that is the executable definition of a
// correct `Store`". Every test in here drives a Store instance directly through the
// eight-method interface with hand-supplied meta flags; kernel-driven tests stay in their
// own files, and MemoryStore's own implementation decisions (the structuredClone /
// DataCloneError pins) stay in the backing-specific files — a SQL backing rejects a
// non-serializable payload differently, so that shape is not contract.
//
// TEST-ONLY module (not `.test.ts`): it registers nothing until a per-backing caller file
// invokes it — memory-store-conformance.test.ts is the one backing today; a future adapter
// adds its own caller and inherits every pin below.

import assert from 'node:assert/strict';
import { describe, test } from 'vitest';
import { transitionDigest } from '../../src/chain/encoding.js';
import type { Store } from '../../src/store/store.js';
import type { Transition } from '../../src/types.js';
import { storeGenesis, storeNext } from '../helpers/chain.js';
import { APPROVER, openRecord, successBatch } from '../helpers/store-fixtures.js';

/**
 * Registers the conformance suite for one backing. `makeStore` must return a FRESH, empty
 * store per call — tests share nothing. Synchronous by design: both present and
 * next-increment backings construct synchronously, and the suite is not public API.
 */
export function runStoreConformance(label: string, makeStore: () => Store): void {
  describe(`Store conformance: ${label}`, () => {
    // === putStaged / getStaged ======================================================

    test('putStaged/getStaged: round-trips a StagedDraft by id', async () => {
      const store = makeStore();
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
      const store = makeStore();
      assert.equal(await store.getStaged('nope'), null);
    });

    test('putStaged: idempotent by staged.id — putting the same id twice does not error and getStaged still returns exactly one value', async () => {
      const store = makeStore();
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
      const store = makeStore();
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
      const store = makeStore();
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

    // === appendTransition: CAS, C1, C2, C3 ==========================================

    test('appendTransition: a well-formed genesis append (expectedCurrentState:null, new recordId) succeeds', async () => {
      const store = makeStore();
      const genesis = storeGenesis('rec-a', 'profile.p1', 'subject:a');
      const result = await store.appendTransition(null, genesis, { nonTerminal: true });
      assert.deepEqual(result, {
        appended: true,
        seq: 1,
        transitionDigest: transitionDigest(genesis),
      });
    });

    test('appendTransition: CAS mismatch — a non-genesis append whose expectedCurrentState does not match the record\'s actual current state -> conflict:"state-mismatch"', async () => {
      const store = makeStore();
      const genesis = storeGenesis('rec-b', 'profile.p1', 'subject:b');
      await store.appendTransition(null, genesis, { nonTerminal: true });

      // Actual current state is 'open'; claim 'confirmed' instead.
      const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
      const result = await store.appendTransition('confirmed', confirmed, { nonTerminal: false });
      assert.deepEqual(result, { appended: false, conflict: 'state-mismatch' });
    });

    test('appendTransition: a genesis append against an ALREADY-EXISTING recordId fails -> conflict:"state-mismatch" (expectedCurrentState:null requires the record not to exist yet)', async () => {
      const store = makeStore();
      const genesis = storeGenesis('rec-c', 'profile.p1', 'subject:c');
      await store.appendTransition(null, genesis, { nonTerminal: true });

      // Re-propose a "genesis" for the SAME recordId (distinct subjectRef so C1
      // exclusivity plays no part — this must fail on the state CAS alone).
      const secondGenesisAttempt = storeGenesis('rec-c', 'profile.p1', 'subject:other');
      const result = await store.appendTransition(null, secondGenesisAttempt, {
        nonTerminal: true,
      });
      assert.deepEqual(result, { appended: false, conflict: 'state-mismatch' });
    });

    test('appendTransition: C1 exclusivity — a second genesis for a subject with a currently-live (nonTerminal) record -> conflict:"exclusivity" naming the BLOCKER\'s recordId', async () => {
      const store = makeStore();
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
      const store = makeStore();
      await store.appendTransition(null, storeGenesis('rec-x', 'profile.p1', 'subject:x'), {
        nonTerminal: true,
      });
      const other = storeGenesis('rec-y', 'profile.p1', 'subject:y'); // different subjectRef
      const result = await store.appendTransition(null, other, { nonTerminal: true });
      assert.equal(result.appended, true);
    });

    test('appendTransition: C1 exclusivity does not fire once the blocking record is no longer nonTerminal (e.g. terminal-confirmed) — a fresh genesis for the same subject succeeds', async () => {
      const store = makeStore();
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

    test('appendTransition: C2 sequencing — a stale seq (not max+1) -> conflict:"seq"', async () => {
      const store = makeStore();
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
      const store = makeStore();
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

    test('appendTransition: C3 — after a TERMINAL confirmed (capture-only, nonTerminal:false), a further state-leaving non-carve-out append is BLOCKED', async () => {
      const store = makeStore();
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
      const store = makeStore();
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
      const store = makeStore();
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
      const blocked = await store.appendTransition('refused', bogusReconfirm, {
        nonTerminal: false,
      });
      assert.equal(
        blocked.appended,
        false,
        'kind:"confirmed" after "refused" is not a carve-out and must be blocked',
      );
    });

    test('appendTransition: C3 does NOT block state-leaving appends while the record is still non-terminal (e.g. open -> confirmed)', async () => {
      const store = makeStore();
      const genesis = storeGenesis('rec-live', 'profile.p1', 'subject:live');
      await store.appendTransition(null, genesis, { nonTerminal: true }); // nonTerminal:true ("open")
      const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
      const result = await store.appendTransition('open', confirmed, { nonTerminal: true }); // still non-terminal (effect-seam)
      assert.equal(result.appended, true);
    });

    // === readChain / chainHead ======================================================

    test('readChain/chainHead: an unknown recordId -> readChain [] and chainHead null', async () => {
      const store = makeStore();
      assert.deepEqual(await store.readChain('nope'), []);
      assert.equal(await store.chainHead('nope'), null);
    });

    test("readChain/chainHead: reflect appended transitions in order, and chainHead is the LAST transition's transitionDigest", async () => {
      const store = makeStore();
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
      const store = makeStore();
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

    // === freshness / no-retention ===================================================

    test('readChain: returns FRESH transitions — mutating a returned transition\'s payload can never corrupt store-internal state (SPEC §12: "a caller mutating a returned chain, head, or staged draft can never corrupt store-internal state")', async () => {
      const store = makeStore();
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
      const store = makeStore();
      const genesis = storeGenesis('rec-write-retain', 'profile.p1', 'subject:write-retain');
      await store.appendTransition(null, genesis, { nonTerminal: true });

      const confirmed = storeNext(genesis, 'confirmed', { actor: { ...APPROVER } });
      const result = await store.appendTransition('open', confirmed, { nonTerminal: false });
      assert.equal(result.appended, true);

      // Mutate the CALLER's OWN object directly (not something returned by the store).
      (confirmed.payload as { actor: { principal: string } }).actor.principal =
        'tampered-by-caller';

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
      const store = makeStore();
      const draft = {
        id: 'staged-caller-retain',
        profileId: 'p1',
        legId: 'leg-1',
        subjectRef: 'subj-caller-retain',
        contentDigest: 'sha256:' + 'f'.repeat(64),
      };
      // Independent snapshot, taken BEFORE the put (and before any mutation) — see the
      // independent-snapshot note on the getStaged freshness test above for why `draft` itself
      // cannot serve as the expected value.
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
      const store = makeStore();
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

    // === C4 seal-finality ============================================================

    /** An open record advanced to terminal `confirmed`, then sealed. Returns the sealed chain. */
    async function sealedRecord(store: Store, recordId = 'rec-sealed') {
      const genesis = storeGenesis(recordId, 'profile.p1', 'subject:s1');
      assert.equal(
        (await store.appendTransition(null, genesis, { nonTerminal: true })).appended,
        true,
      );
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
      // MUST be a kind C3 would otherwise ADMIT against a terminal record, or this test cannot
      // discriminate C4 from C3: a state-LEAVING kind (e.g. `expired`) is already blocked by C3
      // alone on an already-terminal record, so it would pass even with the C4 bar deleted. A
      // state-PRESERVING kind (`isStateLeaving` false) sails past C3's gate — C3's `if` never
      // fires for it — so only C4 can bar it here.
      const store = makeStore();
      const { sealed, recordId } = await sealedRecord(store);
      const before = await store.readChain(recordId);

      const later = storeNext(sealed, 'finding-raised', {
        note: 'not emitted by this kernel build',
      });
      const res = await store.appendTransition('confirmed', later, { nonTerminal: false });

      assert.deepEqual(res, { appended: false, conflict: 'state-mismatch' });
      assert.deepEqual(await store.readChain(recordId), before, 'nothing landed');
    });

    test('C4 bars even a compromise refusal edge — the one append C3 would otherwise admit', async () => {
      // SPEC §12 names this case: "not even a `compromise` refusal edge". It is the one place C4
      // has to override a rule that says yes — C3's carve-out admits `confirmed → refused` for a
      // compromise-classed code, and C4 must refuse it once the record is sealed.
      const store = makeStore();
      const { sealed, recordId } = await sealedRecord(store);
      const before = await store.readChain(recordId);

      const compromise = storeNext(sealed, 'refused', { code: 'chain-compromise' });
      const res = await store.appendTransition('confirmed', compromise, { nonTerminal: false });

      assert.deepEqual(res, { appended: false, conflict: 'state-mismatch' });
      assert.deepEqual(await store.readChain(recordId), before, 'nothing landed');
    });

    test('C4 in appendBatch is an ENTRY-level failure and reports index 0', async () => {
      const store = makeStore();
      const { sealed, recordId } = await sealedRecord(store);
      const before = await store.readChain(recordId);

      const a = storeNext(sealed, 'consultation-recorded', { kind: 'facts', verdict: 'pass' });
      const b = storeNext(a, 'refused', { code: 'chain-compromise' });
      const res = await store.appendBatch('confirmed', [a, b], { nonTerminal: false });

      assert.deepEqual(res, { appended: false, conflict: 'state-mismatch', index: 0 });
      assert.deepEqual(await store.readChain(recordId), before, 'all-or-nothing: nothing landed');
    });

    // === appendBatch =================================================================

    test('appendBatch: the happy path lands every element in order and returns their digests', async () => {
      const store = makeStore();
      const genesis = await openRecord(store);
      const batch = successBatch(genesis);

      const res = await store.appendBatch('open', batch, { nonTerminal: false });
      assert.equal(res.appended, true);
      if (!res.appended) return;
      assert.deepEqual(
        res.transitionDigests,
        batch.map((t) => transitionDigest(t)),
        'the store returns each element’s own digest, in order',
      );

      const chain = await store.readChain(genesis.recordId);
      assert.deepEqual(
        chain.map((t) => t.kind),
        ['opened', 'consultation-recorded', 'consultation-recorded', 'confirmed'],
      );
      assert.deepEqual(
        chain.map((t) => t.seq),
        [1, 2, 3, 4],
        'seqs are contiguous from max+1',
      );
    });

    test('appendBatch: terminality is fixed at the ENTRY flag, so a batch may end in the transition that makes the record terminal', async () => {
      // The rule the batch section exists for. The entry flag is nonTerminal:true (the record is open),
      // so C3's terminal arm cannot fire while the batch applies — even though the LAST element
      // is `confirmed`, which is exactly what makes the record terminal. Recomputing terminality
      // per element rejects that element and breaks finalize's only batch.
      const store = makeStore();
      const genesis = await openRecord(store);

      const res = await store.appendBatch('open', successBatch(genesis), { nonTerminal: false });
      assert.equal(
        res.appended,
        true,
        'a batch ending in `confirmed` against an open record must land',
      );

      // And the post-batch flag is the META's, applied once — not recomputed per element.
      const second = storeGenesis('rec-other', 'profile.p1', 'subject:s1');
      const blocked = await store.appendTransition(null, second, { nonTerminal: true });
      assert.equal(
        blocked.appended,
        true,
        'the batched record is terminal now, so C1 no longer blocks the pair',
      );
    });

    test('appendBatch: an entry compare-and-swap mismatch reports index 0 and applies nothing', async () => {
      const store = makeStore();
      const genesis = await openRecord(store);
      const before = await store.readChain(genesis.recordId);

      const res = await store.appendBatch('confirmed', successBatch(genesis), {
        nonTerminal: false,
      });
      assert.deepEqual(res, { appended: false, conflict: 'state-mismatch', index: 0 });

      const after = await store.readChain(genesis.recordId);
      assert.deepEqual(after, before, 'all-or-nothing: the chain is byte-for-byte unchanged');
    });

    test('appendBatch: a stale seq conflicts at the element that carries it, and applies nothing', async () => {
      const store = makeStore();
      const genesis = await openRecord(store);
      const batch = successBatch(genesis);
      const [first, second] = batch;
      assert.ok(
        first !== undefined && second !== undefined,
        'fixture: the batch has three elements',
      );
      const stale: Transition = { ...second, seq: second.seq + 5 };
      const before = await store.readChain(genesis.recordId);

      const res = await store.appendBatch('open', [first, stale], { nonTerminal: true });
      assert.deepEqual(res, { appended: false, conflict: 'seq', index: 1 });

      const after = await store.readChain(genesis.recordId);
      assert.deepEqual(after, before, 'the first element does not land either');
    });

    test('appendBatch: against an already-terminal record, C3 rejects at entry', async () => {
      const store = makeStore();
      const genesis = await openRecord(store);
      await store.appendBatch('open', successBatch(genesis), { nonTerminal: false });
      const head = (await store.readChain(genesis.recordId)).at(-1);
      assert.ok(head !== undefined);

      // The record is terminal `confirmed`. A state-leaving append that is not the compromise
      // carve-out is barred — and because the entry flag is the terminality input, it is barred
      // at the FIRST element rather than discovered part-way through.
      const expired = storeNext(head, 'expired', { bound: '2026-07-25T00:00:00.000Z' });
      const res = await store.appendBatch('confirmed', [expired], { nonTerminal: false });
      assert.deepEqual(res, { appended: false, conflict: 'state-mismatch', index: 0 });
    });

    test('appendBatch: an empty batch is a caller error, not a silent success', async () => {
      const store = makeStore();
      await openRecord(store);
      await assert.rejects(
        () => store.appendBatch('open', [], { nonTerminal: true }),
        /appendBatch: empty batch/,
      );
    });

    test('appendBatch: an element naming a different recordId throws, and applies nothing', async () => {
      const store = makeStore();
      const genesis = await openRecord(store);
      const batch = successBatch(genesis);
      const [cv, facts] = batch;
      assert.ok(cv !== undefined && facts !== undefined, 'fixture: the batch has three elements');
      const foreign: Transition = { ...facts, recordId: 'rec-other' };
      const before = await store.readChain(genesis.recordId);

      await assert.rejects(
        () => store.appendBatch('open', [cv, foreign], { nonTerminal: true }),
        /appendBatch: every element must name the same recordId/,
      );

      const after = await store.readChain(genesis.recordId);
      assert.deepEqual(after, before, 'a batch spanning records leaves the chain untouched');
    });

    test('appendBatch: a genesis element inside a batch throws (SPEC §12: genesis never appears in a batch), and applies nothing', async () => {
      const store = makeStore();
      const genesis = await openRecord(store);
      const before = await store.readChain(genesis.recordId);

      // Shaped so every OTHER check would pass: same recordId, and a seq that lines up with
      // `chain.length + 1` — the exact shape that let this element slip through before the guard
      // existed. Only the new `kind === 'opened'` check catches it.
      const secondOpen = storeNext(genesis, 'opened', {
        profileId: 'profile.p1',
        profileDigest: `sha256:${'0'.repeat(64)}`,
        legId: 'approver-decide',
        subjectRef: 'subject:s1',
        contentDigest: `sha256:${'1'.repeat(64)}`,
      });

      await assert.rejects(
        () => store.appendBatch('open', [secondOpen], { nonTerminal: true }),
        /appendBatch: genesis never appears in a batch/,
      );

      const after = await store.readChain(genesis.recordId);
      assert.deepEqual(
        after,
        before,
        'a genesis element inside a batch leaves the chain untouched',
      );
    });

    test("appendBatch: the post-batch record state is the last element's, provably — a later CAS targets it", async () => {
      const store = makeStore();
      const genesis = await openRecord(store);

      const res = await store.appendBatch('open', successBatch(genesis), { nonTerminal: false });
      assert.equal(res.appended, true, 'fixture: the batch must land');

      // Discriminating probe. Asserting the chain's contents cannot distinguish an implementation
      // that advances `state` from one that does not — both leave the same transitions. A CAS on
      // 'confirmed' can: it succeeds only if the batch actually moved the record's state there.
      // `sealed` is state-preserving, so C3 admits it against a terminal `confirmed` record.
      const head = (await store.readChain(genesis.recordId)).at(-1);
      assert.ok(head !== undefined, 'fixture: the chain is non-empty');
      const sealed = storeNext(head, 'sealed', { chainHead: transitionDigest(head) });

      const after = await store.appendTransition('confirmed', sealed, { nonTerminal: false });
      assert.equal(after.appended, true, 'the record really is `confirmed` after the batch');
    });

    // === findNonTerminal ==============================================================

    test('findNonTerminal() on an unknown pair -> null', async () => {
      const store = makeStore();
      assert.equal(await store.findNonTerminal('p-none', 's-none'), null);
    });

    test('findNonTerminal() after a non-terminal genesis -> that recordId', async () => {
      const store = makeStore();
      const genesis = storeGenesis('rec-1', 'p-1', 's-1');
      const landed = await store.appendTransition(null, genesis, { nonTerminal: true });
      assert.equal(landed.appended, true, 'fixture: the genesis must land');
      assert.equal(await store.findNonTerminal('p-1', 's-1'), 'rec-1');
    });

    test('findNonTerminal() matches the PAIR, not either half', async () => {
      const store = makeStore();
      const landed = await store.appendTransition(null, storeGenesis('rec-1', 'p-1', 's-1'), {
        nonTerminal: true,
      });
      assert.equal(landed.appended, true, 'fixture: the genesis must land');
      assert.equal(await store.findNonTerminal('p-1', 's-other'), null);
      assert.equal(await store.findNonTerminal('p-other', 's-1'), null);
    });

    test('C1 AGREEMENT: a rejected genesis names the same record findNonTerminal returns', async () => {
      // SPEC §12's C1: "A rejected genesis append names the **blocking** record — the live
      // non-terminal record for the pair, the same record `findNonTerminal` returns." The
      // implementation shares one predicate between the two; this test pins the agreement
      // OBSERVABLY, so a future backing that implements them separately still has to honor it.
      const store = makeStore();
      await store.appendTransition(null, storeGenesis('rec-blocker', 'p-1', 's-1'), {
        nonTerminal: true,
      });
      const rejected = await store.appendTransition(
        null,
        storeGenesis('rec-second', 'p-1', 's-1'),
        {
          nonTerminal: true,
        },
      );
      assert.equal(rejected.appended, false);
      if (rejected.appended) return;
      assert.equal(rejected.conflict, 'exclusivity');
      if (rejected.conflict !== 'exclusivity') return;
      assert.equal(rejected.blockingRecordId, await store.findNonTerminal('p-1', 's-1'));
    });

    test('findNonTerminal() after the persisted flag flips terminal -> null', async () => {
      const store = makeStore();
      const genesis = storeGenesis('rec-1', 'p-1', 's-1');
      await store.appendTransition(null, genesis, { nonTerminal: true });
      const expired = storeNext(genesis, 'expired', { deadline: '2026-07-24T01:00:00.000Z' });
      const landed = await store.appendTransition('open', expired, { nonTerminal: false });
      assert.equal(landed.appended, true, 'fixture: the expired edge must land');
      assert.equal(await store.findNonTerminal('p-1', 's-1'), null);
    });

    // === listDue =======================================================================

    test('listDue applies NO state predicate — a due record is listed whatever state it is in', async () => {
      // SPEC §12 states the gate as `dueAt` alone, with no state predicate. In this build only
      // the genesis sets `dueAt` and every state-leaving append clears it, so no kernel path can
      // produce a due non-open record. The STORE contract still has to honour the rule, so this
      // one test drives the store directly and sets the meta itself. That scenario is therefore
      // constructible only by driving the store directly.
      const store = makeStore();
      const genesis = storeGenesis('rec-due', 'profile.p1', 'subject:s1');
      await store.appendTransition(null, genesis, { nonTerminal: true });

      const confirmed: Transition = storeNext(genesis, 'confirmed', {
        actor: { principal: 'a', authority: 'session:t' },
      });
      await store.appendTransition('open', confirmed, {
        nonTerminal: false,
        dueAt: '2026-01-01T00:00:00.000Z',
      });

      assert.deepEqual(
        await store.listDue(new Date(Date.UTC(2026, 5, 1))),
        ['rec-due'],
        'terminal `confirmed`, and still listed — the gate reads `dueAt`, never `state`',
      );
    });

    test('listDue: the gate is dueAt ≤ now, boundary INCLUSIVE — at-the-instant is due, one ms later is not yet', async () => {
      // SPEC §12's gate, verbatim: `dueAt ≠ null AND dueAt ≤ now`. The migrated
      // no-state-predicate pin covers the state half; this one pins the comparison itself,
      // including equality, with the meta supplied by hand.
      const store = makeStore();
      const genesis = storeGenesis('rec-boundary', 'profile.p1', 'subject:s1');
      const dueAt = '2026-07-24T12:00:00.000Z';
      await store.appendTransition(null, genesis, { nonTerminal: true, dueAt });

      const justBefore = new Date(Date.parse(dueAt) - 1);
      assert.deepEqual(await store.listDue(justBefore), [], 'not due one ms early');
      assert.deepEqual(
        await store.listDue(new Date(dueAt)),
        ['rec-boundary'],
        'due AT the instant — ≤, not <',
      );
      const justAfter = new Date(Date.parse(dueAt) + 1);
      assert.deepEqual(await store.listDue(justAfter), ['rec-boundary'], 'still due after');
    });

    test('listDue: a record whose meta never carried dueAt is never listed', async () => {
      // SPEC §12: "A record with no bound is never listed, regardless of state."
      const store = makeStore();
      const genesis = storeGenesis('rec-unclocked', 'profile.p1', 'subject:s1');
      await store.appendTransition(null, genesis, { nonTerminal: true });
      assert.deepEqual(await store.listDue(new Date(Date.UTC(2100, 0, 1))), []);
    });

    test('listDue: presence sets, absence clears — an append whose meta omits dueAt clears the pending clock', async () => {
      // SPEC §12: "every state-leaving append that carries no new clock clears the column by
      // omission" — pinned here at the meta level, with no kernel involved: the store must
      // treat absence as clearing, not as keep-previous.
      const store = makeStore();
      const genesis = storeGenesis('rec-clearing', 'profile.p1', 'subject:s1');
      const dueAt = '2026-07-24T12:00:00.000Z';
      await store.appendTransition(null, genesis, { nonTerminal: true, dueAt });
      const past = new Date(Date.parse(dueAt) + 1000);
      assert.deepEqual(
        await store.listDue(past),
        ['rec-clearing'],
        'fixture: listed while the clock is set',
      );

      const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
      const res = await store.appendTransition('open', confirmed, { nonTerminal: false });
      assert.equal(res.appended, true, 'fixture: the state-leaving append must land');
      assert.deepEqual(await store.listDue(past), [], 'the omitted dueAt cleared the clock');
    });
  });
}
