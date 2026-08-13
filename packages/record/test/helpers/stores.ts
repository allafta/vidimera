// @vidimera/record — test/helpers/stores.ts: shared Store test-doubles over the full
// eight-method Store contract (`putStaged`/`getStaged`/`appendTransition`/`readChain`/
// `chainHead`/`appendBatch`/`listDue`/`findNonTerminal` — every double delegates
// `findNonTerminal` (and every method it does not deliberately intercept) to its inner
// MemoryStore. `seal` is not and never was a Store
// method — it is an operator-only seam built atop these, SPEC §9/§12). Three shapes fold the
// near-identical inline classes that would otherwise be hand-copied across the test corpus:
//   - `TamperingStore` — `readChain` returns a TAMPERED copy of one targeted record's
//     chain (a `tamperFn` over the real chain); every write delegates to a real inner
//     Store (`inner` is typed `Store`, not narrowed to `MemoryStore`, so a fixture can
//     wrap any backing — e.g. redeem.test.ts's enlisted-compromise fixture wraps a
//     SqliteStore). Used here by chain-verify.test.ts and refusal-matrix.test.ts.
//   - `CountingStore` — counts `putStaged`/`appendTransition` calls while delegating to
//     an inner MemoryStore (its own by default, or a caller-supplied one); a batch append
//     counts as one append, same as a single `appendTransition` call. Used here by
//     agent-unreachability.test.ts, content-binding.test.ts and unknown-ids.test.ts.
//   - `RaceOnceStore` — the FIRST `appendTransition` call matching `match` fires a
//     one-shot `run` hook BEFORE delegating; `run` may mutate `inner` directly (a racing
//     writer wins the CAS) and return `undefined`, or return an `AppendResult` to
//     SHORT-CIRCUIT the caller's append. Consumed by redeem-token.test.ts's racing
//     residual tests (the second step-3 increment's family-wide CAS-residual re-read):
//     exclusivity.test.ts's own race scenario stays a hand-rolled, differently-shaped
//     fixture of its own (counts every genesis/expire attempt, not just the matched
//     one), same as terminality.test.ts's ConfirmBlockingStore — neither was rewritten
//     to use this class, only redeem-token.test.ts's new tests.
//
// This is a TEST-ONLY helper module (not `.test.ts`), same convention as
// helpers/chain.ts and helpers/profiles.ts.

import { MemoryStore } from '../../src/store/memory.js';
import type { AppendMeta, AppendResult, BatchResult, Store } from '../../src/store/store.js';
import type { Digest, RecordState, StagedDraft, Transition } from '../../src/types.js';

/**
 * A Store wrapper whose `readChain` returns a TAMPERED copy of the target record's chain
 * (so finalize's pre-seam verify — and the operator `verifyChain()` wrapper — see the
 * tamper), while EVERY write delegates to a real inner Store (so any compromise
 * `refused` edge lands under real CAS/C3 semantics). `inner` is typed `Store`, not
 * narrowed to `MemoryStore` — its methods only ever call interface methods — so a caller
 * may wrap `SqliteStore` (or any other conforming backing) the same way. Callers hold
 * `inner` directly to inspect the REAL (untampered) persisted chain.
 */
export class TamperingStore implements Store {
  constructor(
    public readonly inner: Store,
    private readonly targetRecordId: string,
    private readonly tamperFn: (chain: Transition[]) => Transition[],
  ) {}
  putStaged(s: StagedDraft): Promise<void> {
    return this.inner.putStaged(s);
  }
  getStaged(r: string): Promise<StagedDraft | null> {
    return this.inner.getStaged(r);
  }
  chainHead(r: string): Promise<Digest | null> {
    return this.inner.chainHead(r);
  }
  appendTransition(e: RecordState | null, t: Transition, m: AppendMeta): Promise<AppendResult> {
    return this.inner.appendTransition(e, t, m);
  }
  appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
  ): Promise<BatchResult> {
    return this.inner.appendBatch(expectedCurrentState, transitions, meta);
  }
  async readChain(recordId: string): Promise<Transition[]> {
    const chain = await this.inner.readChain(recordId);
    return recordId === this.targetRecordId ? this.tamperFn(chain) : chain;
  }
  listDue(now: Date): Promise<string[]> {
    return this.inner.listDue(now);
  }
  findNonTerminal(p: string, s: string): Promise<string | null> {
    return this.inner.findNonTerminal(p, s);
  }
}

/**
 * A Store decorator that counts `putStaged` calls and append calls — `appendTransition`
 * and `appendBatch` both increment the same `appendCalls` counter, a batch counting as one
 * append, same as a single `appendTransition` call — while delegating everything to an
 * inner MemoryStore (a fresh one unless the caller supplies its own — needed when the test
 * must reach the SAME backing store by another route).
 */
export class CountingStore implements Store {
  putStagedCalls = 0;
  appendCalls = 0;
  private readonly inner: MemoryStore;

  constructor(inner: MemoryStore = new MemoryStore()) {
    this.inner = inner;
  }

  putStaged(staged: StagedDraft): Promise<void> {
    this.putStagedCalls += 1;
    return this.inner.putStaged(staged);
  }
  getStaged(stagedRef: string): Promise<StagedDraft | null> {
    return this.inner.getStaged(stagedRef);
  }
  appendTransition(
    expectedCurrentState: RecordState | null,
    transition: Transition,
    meta: AppendMeta,
  ): Promise<AppendResult> {
    this.appendCalls += 1;
    return this.inner.appendTransition(expectedCurrentState, transition, meta);
  }
  appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
  ): Promise<BatchResult> {
    this.appendCalls += 1;
    return this.inner.appendBatch(expectedCurrentState, transitions, meta);
  }
  readChain(recordId: string): Promise<Transition[]> {
    return this.inner.readChain(recordId);
  }
  chainHead(recordId: string): Promise<Digest | null> {
    return this.inner.chainHead(recordId);
  }
  listDue(now: Date): Promise<string[]> {
    return this.inner.listDue(now);
  }
  findNonTerminal(profileId: string, subjectRef: string): Promise<string | null> {
    return this.inner.findNonTerminal(profileId, subjectRef);
  }
}

/**
 * A Store wrapper whose FIRST `appendTransition` matching `match` fires a one-shot `run`
 * hook BEFORE delegating. `run` may mutate `inner` (a racing writer wins the CAS) and
 * return `undefined` — the caller's append then delegates and now conflicts against the
 * moved state — OR return an `AppendResult` to SHORT-CIRCUIT the caller's append (a
 * synthetic residual conflict with the record left byte-for-byte untouched). Every other
 * method delegates straight through; the hook never re-fires, so a plain re-invoke after
 * a refusal behaves like an unwrapped store.
 */
export class RaceOnceStore implements Store {
  private fired = false;
  constructor(
    public readonly inner: MemoryStore,
    private readonly match: (expected: RecordState | null, t: Transition) => boolean,
    private readonly run: (
      inner: MemoryStore,
      recordId: string,
    ) => Promise<AppendResult | undefined>,
  ) {}
  putStaged(s: StagedDraft): Promise<void> {
    return this.inner.putStaged(s);
  }
  getStaged(r: string): Promise<StagedDraft | null> {
    return this.inner.getStaged(r);
  }
  chainHead(r: string): Promise<Digest | null> {
    return this.inner.chainHead(r);
  }
  async appendTransition(
    e: RecordState | null,
    t: Transition,
    m: AppendMeta,
  ): Promise<AppendResult> {
    if (!this.fired && this.match(e, t)) {
      this.fired = true;
      const short = await this.run(this.inner, t.recordId);
      if (short !== undefined) return short;
    }
    return this.inner.appendTransition(e, t, m);
  }
  appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
  ): Promise<BatchResult> {
    return this.inner.appendBatch(expectedCurrentState, transitions, meta);
  }
  readChain(recordId: string): Promise<Transition[]> {
    return this.inner.readChain(recordId);
  }
  listDue(now: Date): Promise<string[]> {
    return this.inner.listDue(now);
  }
  findNonTerminal(p: string, s: string): Promise<string | null> {
    return this.inner.findNonTerminal(p, s);
  }
}
