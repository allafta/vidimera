// @vidimera/record — kernel/review.ts: `review()` is a PURE content-free read (SPEC §9
// `review(recordId)`). It reads the chain, folds it with the shared
// `replay` core, and projects a `ReviewView` — metadata + `contentDigest` only, no content
// body, consultations carried as they already are (each holds a `payloadDigest`, never a
// raw payload). It appends NOTHING and changes no state.
//
// Nonexistent-record posture: a `recordId` that resolves to an empty chain
// has NO fitting RefusalCode (`unknown-profile` names a profile, not a record; the
// union is contract-fixed). `review()` THROWS via `replay()`'s empty-chain guard
// — the same "a record that does not exist is a caller error" posture `open()`
// (missing-stagedRef) and `replay()`/`verifyChain()` (empty chain) already take (SPEC §8).

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
  // present-iff-present, same rule as policyDigest above: a refused record's replay sets
  // `refusalCode` (chain/replay.ts's `refused` fold); open/confirmed records leave it
  // undefined, so the KEY is genuinely absent — an audit surface must not hide the refusal
  // reason on a refused record.
  if (record.refusalCode !== undefined) {
    view.refusalCode = record.refusalCode;
  }
  return ok(view);
}
