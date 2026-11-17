// @vidimera/record — chain/binding.ts: the identity check every NON-verifying load makes.
//
// A load that verifies binds the chain it read to the recordId it read it for
// (`verifyChain(chain, recordId)`), so a foreign chain reads as a break and the seam refuses
// `chain-compromise`. A load that does not verify — `getRecord`, `replay`, `review`,
// `verifySignatures`, `open()`'s blocker read, and the two diagnostic re-reads — has no
// refusal to give, so a chain holding another record's rows is foreign persisted data: a
// storage fault, thrown loudly and recorded nowhere (SPEC §8). This is a string comparison,
// not a hash walk, so it adds nothing to the en-passant path SPEC §5 keeps pre-verify-free.

import type { Transition } from '../types.js';

/**
 * Throws when any transition of `chain` carries a `recordId` other than `recordId`. A no-op
 * for an empty chain: each caller keeps its own unknown-record behavior for that case.
 * `seam` names the caller in the message.
 */
export function assertChainFor(chain: readonly Transition[], recordId: string, seam: string): void {
  for (const t of chain) {
    if (t.recordId !== recordId) {
      throw new Error(
        `${seam}: the store returned a chain holding record '${t.recordId}' when asked for ` +
          `'${recordId}' — foreign persisted data is a storage fault, not a domain outcome (SPEC §8)`,
      );
    }
  }
}
