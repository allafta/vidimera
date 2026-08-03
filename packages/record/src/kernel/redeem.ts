// @vidimera/record — kernel/redeem.ts: the operator-only
// redemption seam is EXPORTED ON EVERY PROFILE (capture-only AND effect-seam alike —
// SPEC §8: "`redeem()` and `seal()` are calls on every profile, with fail-closed domain
// outcomes in every deployment"). It is still mostly a stub in this build: it refuses
// `unredeemable-state`, result-first, on every profile and every record state — WITH ONE
// EXCEPTION. A confirmed effect-seam record (the exact "awaiting redemption" case) now
// throws a build-capability error instead of silently refusing (below). The real
// effect-seam edges (`redeeming`/`redeemed`/`redemption-failed`) remain unimplemented
// either way — the throw does not build them, it only stops the caller discovering their
// absence by surprise. See the throw's own comment for what it does and does not do.
//
// Load-or-not: this stub now loads the chain (`store.readChain`) because the one new
// path needs it — telling a confirmed effect-seam record apart from every other state.
// Every OTHER path still ignores what the load showed, exactly as before: an unknown
// recordId, an open/refused/expired record, and a confirmed capture-only record all fall
// through to the same `unredeemable-state` refusal the load never needed to reach for
// them. A `recordId` that does not exist still gets `unredeemable-state` rather than a
// caller-error throw (unlike open()'s missing-stagedRef or finalize()'s unknown-recordId,
// which DO throw on a genuinely nonexistent target) — this build step does not extend
// that posture to redeem() generally; it adds a throw for exactly the one state that
// would otherwise strand a host silently.
//
// Result-first (Outcome, never throws) on the refusal path: `refused()` is called with no
// `transitionRef` argument, so the field is genuinely ABSENT (never `undefined`-valued)
// per outcome.ts's contract — matching `unredeemable-state`'s registration in
// refusal-codes.ts's NEVER_APPENDS set. Nothing is written to the Store on that path
// either. The new throw below is the one exception to "never throws": a genuine `Error`
// rejection, not a domain refusal — the caller must handle it as an exception. Nothing is
// written to the Store there either; a throw is not an append, and it is not a release of
// anything the Store already holds (see the throw's comment).

import { replay } from '../chain/replay.js';
import { governedUnavailable } from '../config.js';
import type { KernelContext } from '../create.js';
import type { Outcome } from '../outcome.js';
import { refused } from '../outcome.js';
import type { RecordState } from '../types.js';

export async function redeem(
  ctx: KernelContext,
  recordId: string,
  _content: unknown,
): Promise<Outcome<{ state: RecordState }>> {
  const chain = await ctx.store.readChain(recordId);
  if (chain.length > 0) {
    const record = replay(chain);
    const resolved = ctx.profiles.get(record.profileId);
    if (resolved?.effectSeam === true && record.state === 'confirmed') {
      // Loudness, not closure (an earlier framing of this remedy was corrected: neither
      // this throw nor a refusal releases anything). The `(profile, subject)` pair this
      // record holds stays held — the hold lives in the Store's C1 exclusivity, a
      // structural property of the append log, not in whatever redeem() returns or
      // throws. Nothing this function does can lift it. Real closure needs a later build
      // step's redemption edge (§11.2) or a `confirmToRedeem` expiry edge (§9.1); neither
      // exists yet. `seal()` is NOT a release path — §12 admits it only against a
      // derived-terminal record, and this record is non-terminal by §2. What DOES
      // change here: the host finds out at the seam, now, instead of discovering an
      // unopenable subject much later via an unrelated open()'s `record-exists`.
      throw new Error(
        governedUnavailable(
          'redeem',
          'the effect-seam redemption seam (redeeming/redeemed/redemption-failed) is not ' +
            'implemented in this build. A confirmed record on this profile stays held — ' +
            'its (profile, subject) pair remains exclusive under the Store — until ' +
            'redemption resolves it or a declared confirmToRedeem bound expires it ' +
            '(confirmed -> expired). seal() is not a release path: §12 admits seal() only ' +
            'against a derived-terminal record, and a final-leg confirmed on an ' +
            'effect-seam profile is non-terminal (§2). Contract: §11.2, §12 and §9.1.',
        ),
      );
    }
  }
  return refused('unredeemable-state');
}
