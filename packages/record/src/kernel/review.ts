// @vidimera/record — kernel/review.ts (design §3 OperatorSurface.review / §5 "Facts
// enforced-by-default" (review() stays a pure read) / §9 "review() test coverage" S4):
// `review()` is a PURE content-free read. It reads the chain, folds it with the shared
// `replay` core, and projects a `ReviewView` — metadata + `contentDigest` only, no content
// body, consultations carried as they already are (each holds a `payloadDigest`, never a
// raw payload). It appends NOTHING and changes no state.
//
// Nonexistent-record posture (design/brief): a `recordId` that resolves to an empty chain
// has NO fitting slice-3 RefusalCode (`unknown-profile` names a profile, not a record; the
// union is contract-fixed this slice). `review()` THROWS via `replay()`'s empty-chain guard
// — the same "a record that does not exist is a caller error" posture `open()`
// (missing-stagedRef) and `replay()`/`verifyChain()` (empty chain) already take. Flagged for
// the Task-12 SPEC reconciliation (whether the registry wants an `unknown-record` code).

import { replay } from '../chain/replay.js';
import type { KernelContext } from '../create.js';
import type { Outcome } from '../outcome.js';
import { ok } from '../outcome.js';
import type { ReviewView } from '../types.js';

export async function review(ctx: KernelContext, recordId: string): Promise<Outcome<ReviewView>> {
  const chain = await ctx.store.readChain(recordId);
  // replay() THROWS on an empty chain (nonexistent record) — see the module header.
  const record = replay(chain);

  const view: ReviewView = {
    recordId: record.id,
    profileId: record.profileId,
    legId: record.legId,
    subjectRef: record.subjectRef,
    contentDigest: record.contentDigest,
    state: record.state,
    consultations: record.consultations,
  };
  if (record.policyDigest !== undefined) {
    view.policyDigest = record.policyDigest;
  }
  return ok(view);
}
