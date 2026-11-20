// @vidimera/record — signing/decorate.ts: the AL2 mint increment's one mint point.
// create() wraps the injected Store in this decorator iff the instance declares
// signing — every append path (the seams, finalize's batch, the en-passant clock
// edges, the reverify drift edge, sealed) signs by construction, and the seams never
// know.
//
// TWO MODES, decided ONCE, when the decorator is built — never per append, so an instance
// cannot change mode under itself, and a deployment can read which ordering it runs from its
// own configuration:
//   - INTEGRATED when `signing.signatures !== undefined && signing.signatures ===
//     store.signatures`: the configured sidecar IS the store's own (`store/store.ts`'s
//     `Store.signatures`, which each reference backing exposes). A signed append mints and
//     checks BEFORE it is delegated, exactly as in separate mode, but writes nothing itself:
//     its entries ride the append as `meta.signatures`, one per transition and in order, and
//     the store writes them inside that append's own atomic unit, after every compare-and-swap
//     and constraint check has passed, and only then — through the host's `tx` when a seam is
//     enlisted in one.
//   - SEPARATE otherwise: a sidecar over other storage, or a store — or a wrapper around one —
//     that exposes no `signatures`. SIGN BEFORE APPEND: each entry is `put` first, then the
//     append is delegated with `meta` and `tx` untouched.
// A record that does not sign carries no `meta.signatures` in either mode.
//
// WHY SEPARATE MODE WRITES FIRST, and what that costs. A crash or lost CAS after the sidecar
// write leaves an ORPHAN entry — inert to verification, which is chain-driven, but not
// harmless: it is a valid signature over a transition that never committed, which a
// storage-writing insider can splice back in where it was signed for (SPEC §14's third
// condition, which this order does not meet) — while the reverse order could leave a LANDED
// transition unsigned on a signing record, which the AL2 enforcement increment's fail-closed
// posture DOES condemn (`kernel/verify-signatures.ts`'s `signatureLayerHolds` treats a
// missing entry as `false`, folded into `chain-compromise` at every verification site). A
// write after a successful append but outside its unit IS that reverse order, so neither mode
// ever takes it. The separate-mode order is pinned.
//
// THE SEVENTEENTH SELF-AUTHORED INVERSION, argued here. The stance recorded until now read:
// "The sidecar write is deliberately NOT part of any host transaction an enlisted
// seam passes through (`tx` delegates untouched): an aborted effect's orphan
// signature is the same class — inert to verification, and spliceable."
// It held because the only alternative to writing first was writing after the append, and
// that is the landed-but-unsigned hazard above. It REVERSES for integrated mode. An orphan is
// a valid signature over a transition that never committed, and SPEC §14's third condition
// (no signature outlives an uncommitted append) makes that a gap in the closure, not an inert
// leftover: calling it "the same class" accepted the gap on every rolled-back enlisted seam,
// every lost CAS and every no-edge refusal. Atomicity removes the orphan without reopening the
// hazard the stance guarded against. The entry and the transition are written in ONE unit, so
// neither survives without the other: a transition that lands carries its entry (nothing
// landed is unsigned), and an append that does not land — it lost its CAS, it threw, or the
// host's transaction rolled it back — takes its entry with it (nothing unlanded is signed).
// Separate mode keeps the stance, and its orphans: a sidecar over other storage cannot join
// the append's unit, and moving its write after the append would be the hazard itself.
//
// THE MINT CHECK, the same in both modes: the one signer call is followed, inside the same
// memoized promise, by a check against this instance's own `verifiers` — the minted keyRef
// must be an own key whose verifier answers the literal `true` over the same bytes — and
// nothing is written or appended unless it passes (`mintAndCheck` below). A failed check is a
// THROWN Error, never a `refused` outcome, and it applies wherever the decorator signs: an
// instance that cannot verify its own key throws even at an append that would have drawn or
// refused a `chain-compromise` edge. A configuration whose signer this instance cannot verify
// is refused at the first append, not discovered as `chain-compromise` later. The cost, in the
// same breath: every signed append, `open()` included, now needs this instance's own verifier
// answering, so an outage of it defers even a hash-break compromise edge (AL1, which never
// consults the layer) until the verifier recovers — the seam throws and appends nothing
// meanwhile. A BATCH mints and checks every element before it writes any entry or hands any
// down (`appendBatch` below): a failure on any element leaves the sidecar as it found it.
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
// class-backed or plain-object-backed alike. The optional `signatures` member is
// deliberately NOT re-exposed on the decorated Store: the entries an integrated append
// carries are this decorator's own, minted and checked here, and nothing composed above it
// has any to supply. The kernel reads the sidecar through `config.signing.signatures`, never
// through the store, so nothing is lost by its absence.

import { encodeTransition, transitionDigest } from '../chain/encoding.js';
import type { AppendMeta, AppendResult, BatchResult, Store } from '../store/store.js';
import type { StagedDraft, Transition } from '../types.js';
import type { SignatureEntry, SigningConfig } from './store.js';

/**
 * The ceiling on `withSigning`'s per-record signs-or-not memo (one boolean per recordId the
 * decorator has seen). Unbounded, that map grew by one entry per record for the life of a
 * long-lived process. At the cap the least-recently-used record is evicted, and its next
 * append pays exactly one chain re-read (`readChain`, the whole chain — the Store has no
 * genesis-only read) to re-derive the answer — the same read a cold decorator restart
 * already pays (see `recordSigns`). Ten thousand is far above any
 * plausible in-flight population and about a megabyte at the ceiling. Exported for the pins
 * in signing.test.ts, deliberately not from the package index.
 */
export const SIGNING_MEMO_CAP = 10_000;

export function withSigning(
  signing: SigningConfig,
  store: Store,
  isSigningProfile: (profileId: string) => boolean,
): Store {
  // The mode, decided here and never again (see the header): integrated exactly when the
  // configured sidecar IS the store's own. The `undefined` guard is not redundant —
  // `withSigning` is exported and `create()`'s shape check is not on this path, so an
  // absent sidecar must never match a store that exposes none.
  const integrated = signing.signatures !== undefined && signing.signatures === store.signatures;

  // Bounded LRU over `Map`'s insertion order: a hit re-inserts its key so the record becomes
  // the newest entry; an insert at the cap evicts the oldest key first.
  const memo = new Map<string, boolean>();
  let newest: string | undefined; // the most recently inserted or promoted key
  function memoGet(recordId: string): boolean | undefined {
    const known = memo.get(recordId);
    if (known === undefined) return undefined;
    if (recordId !== newest) {
      // Promote on a hit — but consecutive appends to one record (a batch after its
      // findings, the redemption legs) skip the delete+set: it is already the newest.
      memo.delete(recordId);
      memo.set(recordId, known);
      newest = recordId;
    }
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
    newest = recordId;
  }

  // One signer invocation per transition OBJECT, not per append attempt. Two call paths hand
  // the SAME transition object to `appendTransition` more than once: the compromise append's
  // candidate walk, and open()'s expire-then-retry when the clock has not moved between the
  // attempt and the retry (a moved clock re-stamps the retry — distinct bytes, minted on its
  // own). The bytes are identical, so the signature is identical and the sidecar upserts one
  // key either way — the repeat buys nothing and, on a host whose signer is a remote key
  // service, costs a round-trip each time.
  //
  // Keyed by object identity, NOT by digest, and it memoizes the MINT's promise (the signer's
  // call plus the mint check that follows it, `mintAndCheck`), not the whole signing step's
  // (`mintChecked` then `putEntry`). A digest-keyed memo would weaken the pinned guarantee
  // from "this append is preceded by its OWN completed sidecar write" to "some earlier signing
  // operation for this digest happened", which lands an unsigned transition whenever the
  // earlier entry is no longer there. Memoizing the whole step's promise would skip the `put`
  // on every repeat and reach the same place. So the WRITE ALWAYS HAPPENS on every attempt —
  // in separate mode the `put` runs, in integrated mode the entry rides that attempt's own
  // append — and only the mint is shared; storing the in-flight promise means two concurrent
  // appends of one object await one mint rather than racing.
  //
  // Two things this shape assumes, stated because nothing in the type system enforces them.
  // The signature minted at first-mint time is paired with a `transitionDigest` recomputed at
  // every attempt (`entryFor`), which is sound only while the object is not mutated between
  // attempts — the kernel never does that, and verification fails closed on the mismatch if
  // anything else did (`test/no-edge-containment.test.ts` pins both, in separate mode). And a
  // `WeakMap` has no size: "it holds nothing after the object is unreachable" is a
  // garbage-collection property, not a reading, so no test asserts it; what is observable — N
  // distinct transitions produce N mints and N puts — is what gets pinned.
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
      if (chain.length === 0) {
        // No record yet: the store will refuse this non-genesis append (state-mismatch), and
        // an empty chain teaches the memo NOTHING — caching `false` here would pin the record
        // as non-signing before its genuine genesis arrives, and that genesis would then land
        // unsigned, which the fail-closed layer reads as chain-compromise.
        return false;
      }
      const genesis: unknown = chain[0];
      const payload: unknown =
        typeof genesis === 'object' && genesis !== null
          ? (genesis as { payload?: unknown }).payload
          : undefined;
      if (typeof payload !== 'object' || payload === null) {
        // A garbled genesis — a row that is not an object (the `null` a SQL backing parses back
        // from a stored `'null'`, a hole), or one whose payload is not — says nothing about
        // whether this record signs. A verifying seam reports it as a break, so the append
        // reaching here is in practice the chain-compromise edge that records it — and whatever
        // it is, signing it costs at most an orphan, while an unsigned landed edge on a signing
        // record is condemned. Treated as the foreign-genesis arm below treats a chain it cannot
        // trust: sign, never throw, never cache.
        return true;
      }
      if ((genesis as Transition).recordId !== transition.recordId) {
        // The store answered this record's read with ANOTHER record's chain (SPEC §5: the audit
        // functions run "over the chain the store returns for that record", and §4's genesis
        // rule binds a chain's first link to its own id; a foreign answer is §8's storage
        // fault). Its genesis says nothing about whether THIS record signs, so the decision
        // must not be cached under this id — a cached answer would outlive the fault and bind
        // the wrong profile to the record.
        // Sign: an extra sidecar entry is an orphan (inert to verification), an unsigned
        // landed edge on a signing record is condemned. Never throw here: the append is the very
        // chain-compromise edge that reports the fault.
        return true;
      }
      const profileId = (payload as { profileId?: unknown }).profileId;
      signs = typeof profileId === 'string' && isSigningProfile(profileId);
    }
    memoSet(transition.recordId, signs);
    return signs;
  }

  // Mint, then verify what was minted, as ONE promise: the signer's output is only worth
  // memoizing (and putting) once the instance's own registry accepts it. The check is the
  // mint's other half — the keyRef must be an OWN key of `verifiers` (an inherited name such
  // as `toString` never counts) and that verifier must answer the literal `true` over the very
  // bytes that were signed. A signer whose key this instance cannot verify would otherwise land
  // an entry every later seam reads as `chain-compromise`; refused here, nothing reaches the
  // sidecar or the chain, and the host sees a named error at the append that caused it. A
  // verifier that throws or rejects is a fault, as in `kernel/verify-signatures.ts`: it
  // propagates wrapped, with the verifier's error as `cause`. Any failure drops the memo entry
  // (in `mintChecked`), so a repaired configuration mints and checks anew; a success is memoized
  // and not repeated for the next CAS candidate.
  async function mintAndCheck(
    transition: Transition,
  ): Promise<{ keyRef: string; signature: string }> {
    const bytes = encodeTransition(transition);
    const minted = await signing.signer(bytes);
    const { keyRef } = minted;
    if (!Object.hasOwn(signing.verifiers, keyRef)) {
      throw new Error(
        `signing: the signer minted keyRef '${String(keyRef)}' for record ` +
          `'${transition.recordId}' ` +
          `at seq ${transition.seq}, but config.signing.verifiers holds no verifier for it; ` +
          'nothing was put to the sidecar and nothing was appended',
      );
    }
    let ok: unknown;
    try {
      ok = await signing.verifiers[keyRef]?.(bytes, minted.signature);
    } catch (cause) {
      throw new Error(
        `signing: the verifier for keyRef '${keyRef}' threw or rejected while checking a fresh ` +
          `signature over record '${transition.recordId}' at seq ${transition.seq}; nothing was ` +
          'put to the sidecar and nothing was appended',
        { cause },
      );
    }
    if (ok !== true) {
      throw new Error(
        `signing: the signature the signer minted under keyRef '${keyRef}' for record ` +
          `'${transition.recordId}' at seq ${transition.seq} does not verify under the ` +
          'registered verifier for that keyRef; nothing was put to the sidecar and nothing ' +
          'was appended',
      );
    }
    return minted;
  }

  // The mint half of signing one transition: the memoized mint-and-check, with no sidecar
  // write. Kept apart from `putEntry` so a batch can mint and check EVERY element before it
  // writes any of them.
  async function mintChecked(
    transition: Transition,
  ): Promise<{ keyRef: string; signature: string }> {
    let pending = signerResult.get(transition);
    if (pending === undefined) {
      pending = mintAndCheck(transition);
      signerResult.set(transition, pending);
    }
    try {
      return await pending;
    } catch (err) {
      // A failed mint or mint check must not be remembered: the next attempt has to reach the
      // signer again.
      // Delete only if the memo still holds THIS promise — a later caller may already have
      // installed a fresh attempt, and dropping that one would cost it a redundant mint.
      if (signerResult.get(transition) === pending) signerResult.delete(transition);
      throw err;
    }
  }

  // One transition's sidecar entry: the memoized mint paired with a digest recomputed now, at
  // this attempt (the memo's comment says why that pairing is sound).
  function entryFor(
    transition: Transition,
    minted: { keyRef: string; signature: string },
  ): SignatureEntry {
    return {
      transitionDigest: transitionDigest(transition),
      recordId: transition.recordId,
      seq: transition.seq,
      keyRef: minted.keyRef,
      signature: minted.signature,
    };
  }

  // The separate-mode write half: ALWAYS runs, on every attempt, before the append it precedes
  // (see above).
  async function putEntry(
    transition: Transition,
    minted: { keyRef: string; signature: string },
  ): Promise<void> {
    await signing.signatures.put(entryFor(transition, minted));
  }

  // One transition, both halves, separate mode: mint and check, then write.
  async function signOne(transition: Transition): Promise<void> {
    await putEntry(transition, await mintChecked(transition));
  }

  return {
    // --- the two append seams: mint and check BEFORE delegating, tx untouched; separate
    // --- mode writes first, integrated mode hands the entries down on the append itself ---
    async appendTransition(
      expectedCurrentState: Parameters<Store['appendTransition']>[0],
      transition: Transition,
      meta: AppendMeta,
      tx?: unknown,
    ): Promise<AppendResult> {
      if (await recordSigns(transition)) {
        if (integrated) {
          const entry = entryFor(transition, await mintChecked(transition));
          return store.appendTransition(
            expectedCurrentState,
            transition,
            { ...meta, signatures: [entry] },
            tx,
          );
        }
        await signOne(transition);
      }
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
        // Every element is minted AND checked before any is written or handed down: a mint or
        // check failure on element k throws with no entry put for elements 1..k-1 and nothing
        // appended, so a refused batch leaves the sidecar as it found it. Only then, in
        // separate mode, are all the entries put, in order, and only then does the append run
        // — sign-before-append holds for the batch as a whole; in integrated mode the entries
        // ride the append instead, one per element, in order.
        const minted: [Transition, { keyRef: string; signature: string }][] = [];
        for (const t of transitions) minted.push([t, await mintChecked(t)]);
        if (integrated) {
          const signatures = minted.map(([t, m]) => entryFor(t, m));
          return store.appendBatch(expectedCurrentState, transitions, { ...meta, signatures }, tx);
        }
        for (const [t, m] of minted) await putEntry(t, m);
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
