// @vidimera/record — signing/decorate.ts: the AL2 mint increment's one mint point.
// create() wraps the injected Store in this decorator iff the instance declares
// signing — every append path (the seams, finalize's batch, the en-passant clock
// edges, the reverify drift edge, sealed) signs by construction, and the seams never
// know. SIGN BEFORE APPEND: a crash or lost CAS after the sidecar write leaves an
// ORPHAN entry — harmless, verification is chain-driven — while the reverse order
// could leave a LANDED transition unsigned on a signing record, which the AL2
// enforcement increment's fail-closed posture would condemn; the order is pinned.
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

export function withSigning(
  signing: SigningConfig,
  store: Store,
  isSigningProfile: (profileId: string) => boolean,
): Store {
  const memo = new Map<string, boolean>();

  async function recordSigns(transition: Transition): Promise<boolean> {
    const known = memo.get(transition.recordId);
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
    memo.set(transition.recordId, signs);
    return signs;
  }

  async function signOne(transition: Transition): Promise<void> {
    const bytes = encodeTransition(transition);
    const { keyRef, signature } = await signing.signer(bytes);
    await signing.signatures.put({
      transitionDigest: transitionDigest(transition),
      recordId: transition.recordId,
      seq: transition.seq,
      keyRef,
      signature,
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
