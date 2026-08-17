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
}
