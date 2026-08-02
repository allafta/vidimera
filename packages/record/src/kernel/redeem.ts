// @vidimera/record — kernel/redeem.ts (design §3 OperatorSurface.redeem / §5 "`redeem()`
// slice-3 stub" / §9 "unredeemable-state always-present (O2)"): the operator-only
// redemption seam is EXPORTED ON EVERY PROFILE (capture-only AND effect-seam alike — §8's
// profile-conditional redemption is reconciled by O2 in favor of §11.2/OQ2-7's
// every-profile export), but at slice 3 it is a STUB: it unconditionally refuses
// `unredeemable-state`, result-first, on EVERY profile and EVERY record state. The real
// effect-seam edges (`redeeming`/`redeemed`/`redemption-failed`) are GOVERNED, slice 5.
//
// Load-or-not (task brief): this stub does NOT load the record. Every path refuses the
// same way regardless of what `readChain(recordId)` would show, so a load buys nothing —
// it would be a read performed only to throw its result away. The honest consequence: a
// `recordId` that does not exist ALSO gets `unredeemable-state` rather than a
// caller-error throw (unlike open()'s missing-stagedRef or finalize()'s unknown-recordId,
// which DO need to load to do anything useful and so THROW on a genuinely nonexistent
// target). That asymmetry is fine here — redeem() has no "useful" path yet at slice 3;
// every state, real or not, is unredeemable. Slice 5, when this stub grows a real
// effect-seam body, will need to load the chain and will regain the same
// caller-error-on-nonexistent-record posture the other operator seams already have.
//
// Result-first (Outcome, never throws for a domain refusal) and NOT APPENDED: `refused()`
// is called with no `transitionRef` argument, so the field is genuinely ABSENT (never
// `undefined`-valued) per outcome.ts's contract — matching `unredeemable-state`'s
// registration in refusal-codes.ts's NEVER_APPENDS set. Nothing is written to the Store.

import type { KernelContext } from '../create.js';
import type { Outcome } from '../outcome.js';
import { refused } from '../outcome.js';
import type { RecordState } from '../types.js';

export async function redeem(
  _ctx: KernelContext,
  _recordId: string,
  _content: unknown,
): Promise<Outcome<{ state: RecordState }>> {
  return refused('unredeemable-state');
}
