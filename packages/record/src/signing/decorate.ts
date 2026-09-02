// @vidimera/record — signing/decorate.ts: the AL2 mint increment's one mint point.
// create() wraps the injected Store in this decorator iff the instance declares
// signing — every append path (the seams, finalize's batch, the en-passant clock
// edges, the reverify drift edge, sealed) signs by construction, and the seams never
// know. SIGN BEFORE APPEND: a crash or lost CAS after the sidecar write leaves an
// ORPHAN entry — harmless, verification is chain-driven — while the reverse order
// could leave a LANDED transition unsigned on a signing record, which the AL2
// enforcement increment's fail-closed posture DOES condemn (that increment has now
// landed: `kernel/verify-signatures.ts`'s `signatureLayerHolds` treats a missing entry
// as `false`, folded into `chain-compromise` at every verification site); the order
// is pinned.
// The sidecar write is deliberately NOT part of any host transaction an enlisted
// seam passes through (`tx` delegates untouched): an aborted effect's orphan
// signature is the same harmless class.
//
// DELEGATION SHAPE, decided rather than assumed: both shipped Store backings
// (`store/memory.ts`'s `MemoryStore`, `store/sqlite.ts`'s `SqliteStore`) are CLASSES
// whose methods live on the prototype, not as own enumerable properties. A plain
// object-literal spread (`{ ...store, appendTransition: …, appendBatch: … }`) copies
// only OWN enumerable properties — for a class instance that is its private fields,
// never its prototype methods — so `putStaged`/`getStaged`/`readChain`/`chainHead`/
// `listDue`/`findNonTerminal` would all come back `undefined` on the wrapped object.
// This decorator therefore delegates every one of the Store contract's eight methods
// EXPLICITLY, by name, rather than spreading — correct for any conforming Store,
// class-backed or plain-object-backed alike.

import { encodeTransition, transitionDigest } from '../chain/encoding.js';
import type { AppendMeta, AppendResult, BatchResult, Store } from '../store/store.js';
import type { StagedDraft, Transition } from '../types.js';
import type { SigningConfig } from './store.js';

/**
 * The ceiling on `withSigning`'s per-record signs-or-not memo (one boolean per recordId the
 * decorator has seen). Unbounded, that map grew by one entry per record for the life of a
 * long-lived process. At the cap the least-recently-used record is evicted, and its next
 * append pays exactly one genesis re-read to re-derive the answer — the same read a cold
 * decorator restart already pays (see `recordSigns`). Ten thousand is far above any
 * plausible in-flight population and about a megabyte at the ceiling. Exported for the pins
 * in signing.test.ts, deliberately not from the package index.
 */
export const SIGNING_MEMO_CAP = 10_000;

export function withSigning(
  signing: SigningConfig,
  store: Store,
  isSigningProfile: (profileId: string) => boolean,
): Store {
  // Bounded LRU over `Map`'s insertion order: a hit re-inserts its key so the record becomes
  // the newest entry; an insert at the cap evicts the oldest key first.
  const memo = new Map<string, boolean>();
  function memoGet(recordId: string): boolean | undefined {
    const known = memo.get(recordId);
    if (known === undefined) return undefined;
    memo.delete(recordId);
    memo.set(recordId, known);
    return known;
  }
  function memoSet(recordId: string, signs: boolean): void {
    if (memo.has(recordId)) {
      // A re-insert (two cold misses on one record raced through the genesis re-read):
      // refresh recency, evict nothing — the key already occupies its slot.
      memo.delete(recordId);
    } else if (memo.size >= SIGNING_MEMO_CAP) {
      const oldest = memo.keys().next().value;
      if (oldest !== undefined) memo.delete(oldest);
    }
    memo.set(recordId, signs);
  }

  // One signer invocation per transition OBJECT, not per append attempt. Two call paths hand
  // the SAME transition object to `appendTransition` more than once: the compromise append's
  // candidate walk, and open()'s expire-then-retry when the clock has not moved between the
  // attempt and the retry (a moved clock re-stamps the retry — distinct bytes, minted on its
  // own). The bytes are identical, so the signature is identical and the sidecar upserts one
  // key either way — the repeat buys nothing and, on a host whose signer is a remote key
  // service, costs a round-trip each time.
  //
  // Keyed by object identity, NOT by digest, and it memoizes the SIGNER's promise, not this
  // function's. A digest-keyed memo would weaken the pinned guarantee from "this append is
  // preceded by its OWN completed sidecar write" to "some earlier signing operation for this
  // digest happened", which lands an unsigned transition whenever the earlier entry is no
  // longer there. Memoizing this function's own promise would skip the `put` on every repeat
  // and reach the same place. So the `put` ALWAYS runs, and only the mint is shared; storing
  // the in-flight promise means two concurrent appends of one object await one mint rather
  // than racing.
  //
  // Two things this shape assumes, stated because nothing in the type system enforces them.
  // The signature minted at first-mint time is paired with a `transitionDigest` recomputed at
  // every `put`, which is sound only while the object is not mutated between attempts — the
  // kernel never does that, and verification fails closed on the mismatch if anything else
  // did (`test/no-edge-containment.test.ts` pins both). And a `WeakMap` has no size: "it holds
  // nothing after the object is unreachable" is a garbage-collection property, not a reading,
  // so no test asserts it; what is observable — N distinct transitions produce N mints and N
  // puts — is what gets pinned.
  const signerResult = new WeakMap<Transition, Promise<{ keyRef: string; signature: string }>>();

  async function recordSigns(transition: Transition): Promise<boolean> {
    const known = memoGet(transition.recordId);
    if (known !== undefined) return known;
    let signs: boolean;
    if (transition.seq === 1 && transition.kind === 'opened') {
      const profileId = (transition.payload as { profileId?: unknown }).profileId;
      signs = typeof profileId === 'string' && isSigningProfile(profileId);
    } else {
      // A decorator restart mid-record (or any non-genesis append reaching this memo
      // cold): fall back to ONE genesis read rather than trusting the caller.
      const chain = await store.readChain(transition.recordId);
      const genesis = chain[0];
      const profileId =
        genesis === undefined ? undefined : (genesis.payload as { profileId?: unknown }).profileId;
      signs = typeof profileId === 'string' && isSigningProfile(profileId);
    }
    memoSet(transition.recordId, signs);
    return signs;
  }

  async function signOne(transition: Transition): Promise<void> {
    let pending = signerResult.get(transition);
    if (pending === undefined) {
      pending = signing.signer(encodeTransition(transition));
      signerResult.set(transition, pending);
    }
    let minted: { keyRef: string; signature: string };
    try {
      minted = await pending;
    } catch (err) {
      // A failed mint must not be remembered: the next attempt has to reach the signer again.
      // Delete only if the memo still holds THIS promise — a later caller may already have
      // installed a fresh attempt, and dropping that one would cost it a redundant mint.
      if (signerResult.get(transition) === pending) signerResult.delete(transition);
      throw err;
    }
    await signing.signatures.put({
      transitionDigest: transitionDigest(transition),
      recordId: transition.recordId,
      seq: transition.seq,
      keyRef: minted.keyRef,
      signature: minted.signature,
    });
  }

  return {
    // --- the two append seams: sign BEFORE delegating, tx untouched -------------------
    async appendTransition(
      expectedCurrentState: Parameters<Store['appendTransition']>[0],
      transition: Transition,
      meta: AppendMeta,
      tx?: unknown,
    ): Promise<AppendResult> {
      if (await recordSigns(transition)) await signOne(transition);
      return store.appendTransition(expectedCurrentState, transition, meta, tx);
    },
    async appendBatch(
      expectedCurrentState: Parameters<Store['appendBatch']>[0],
      transitions: readonly Transition[],
      meta: AppendMeta,
      tx?: unknown,
    ): Promise<BatchResult> {
      const first = transitions[0];
      if (first !== undefined && (await recordSigns(first))) {
        for (const t of transitions) await signOne(t);
      }
      return store.appendBatch(expectedCurrentState, transitions, meta, tx);
    },

    // --- every other Store method: delegated verbatim, explicitly (see header) --------
    putStaged: (staged: StagedDraft, tx?: unknown): Promise<void> => store.putStaged(staged, tx),
    getStaged: (stagedRef: string): Promise<StagedDraft | null> => store.getStaged(stagedRef),
    readChain: (recordId: string): Promise<Transition[]> => store.readChain(recordId),
    chainHead: (recordId: string) => store.chainHead(recordId),
    listDue: (now: Date): Promise<string[]> => store.listDue(now),
    findNonTerminal: (profileId: string, subjectRef: string): Promise<string | null> =>
      store.findNonTerminal(profileId, subjectRef),
  };
}
