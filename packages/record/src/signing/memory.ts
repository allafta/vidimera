// @vidimera/record — signing/memory.ts: the reference in-memory `SignatureStore` (the
// AL2 mint increment) — the `store/memory.ts` precedent, a Map-backed sidecar with the
// same "reference semantics, never durable evidence" posture (DECISIONS.md #24). Small,
// exercised by every signing test.

import type { SignatureEntry, SignatureStore } from './store.js';

/**
 * A Map-backed `SignatureStore`, keyed by `transitionDigest`. `put` UPSERTS — re-signing
 * the same canonical bytes is idempotent evidence, never a duplicate or a conflict (the
 * same posture `store/memory.ts`'s `putStaged` documents for its own first-write-wins
 * idempotency, deliberately inverted here: THIS surface always takes the newest write,
 * since a later signature over identical bytes is still evidence for the same digest).
 * `listByRecord` filters values by `recordId`; no ordering is promised (chain order is
 * the caller's job — `kernel/verify-signatures.ts` correlates by `transitionDigest`,
 * never by list order).
 */
export class MemorySignatureStore implements SignatureStore {
  private readonly entries = new Map<string, SignatureEntry>();

  async put(entry: SignatureEntry): Promise<void> {
    this.entries.set(entry.transitionDigest, { ...entry });
  }

  async listByRecord(recordId: string): Promise<SignatureEntry[]> {
    const out: SignatureEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.recordId === recordId) {
        out.push({ ...entry });
      }
    }
    return out;
  }

  /**
   * Test/host convenience, NOT part of the `SignatureStore` contract: removes the entry
   * keyed at `transitionDigest`, if any. `put`'s upsert-by-digest semantics give no other
   * way to make an association disappear — re-`put`ting an entry under a DIFFERENT digest
   * adds a second Map entry, it does not vacate the first key — so the AL2 enforcement
   * increment's own tests use this directly to construct a genuinely MISSING-entry
   * fixture, distinct from a tampered-but-present one.
   */
  delete(transitionDigest: string): void {
    this.entries.delete(transitionDigest);
  }
}
