// @vidimera/record — kernel/verify-signatures.ts: SPEC §14's AL2 surface, now home to
// BOTH signing increments' work. `verifySignatures` (the AL2 mint increment) is a pure
// chain-driven read: it reports, it never refuses or appends on a verification FAILURE —
// fail-closed REPORTING (unresolvable keyRef, a verifier answering anything but the literal
// `true`, missing entry, non-string sidecar field all read `verified: false`). A verifier FAULT
// — a throw or a rejection, the verifier saying it could not answer — is a different input and
// is never folded into that reading: the read propagates it, and the gate propagates it where
// the layer applies unless a definite miss has already decided (see `layerVerdicts`, where the
// stance is argued).
// `signatureLayerHolds` (the AL2 enforcement
// increment, second of three) is the one gate primitive built on the SAME correlation
// core (`layerVerdicts` below, factored so neither consumer re-derives it): every
// verification site that already checks AL1 intactness (`verifyChain(chain, recordId)`)
// now widens that same check to also consult this layer on a signing record, folding a
// bad layer into each site's OWN existing failure arm — this file adds no new refusal
// code and appends nothing itself. The read stays a read: `verifySignatures` never
// gates, whatever `signatureLayerHolds` reports elsewhere for the same chain. The
// obligation `signatureLayerHolds` enforces is the HELD profile's `signing` (the same
// `held-profile.ts` comparison every seam makes) and, for an instance that does not hold the
// record's profile, the live same-id profile's declaration ONLY when the chain's own genesis
// transition also carries a sidecar entry that instance's verifier accepts — so an in-place
// edit that ADDS `signing` can no longer read a never-signed record as a signing chain, and
// one that drops it still reads as no obligation. Since the
// security-findings pass (2026-09-03) the report also carries `genesisProfile`: whether
// the live profile the verdicts were computed against is the one the record was opened
// under, by the `opened` payload's own `profileDigest` (SPEC §4) — reporting only, again.
//
// Chain-driven, deliberately: an orphan sidecar entry (no matching chain transition)
// is invisible to BOTH consumers by CONSTRUCTION, not by a filter — the loop below walks
// the chain and looks each transition's digest UP in the sidecar, never the reverse.
// On an instance with no `config.signing` the surface still answers, trivially: every
// transition reports `signed: false, verified: false`, and `signatureLayerHolds` returns
// `true` for the same reason `verifySignatures.signingDeclared` reads false — a
// non-signing record's layer has nothing to hold it to.

import { assertChainFor } from '../chain/binding.js';
import { encodeTransition, transitionDigest } from '../chain/encoding.js';
import type { KernelContext } from '../create.js';
import type { Digest, Transition } from '../types.js';
import { heldProfile } from './held-profile.js';

export interface SignatureReport {
  recordId: string;
  /**
   * Whether the genesis profile, resolved against THIS instance's registry, declares
   * `signing: true`. Computed from the LIVE profile, never from the chain: a same-id profile
   * that omits `signing` — or an instance that does not hold the id at all — reads `false`
   * here for a record that WAS opened under a signing profile, and one that adds it reads
   * `true` for a record that never was. REPORTING ONLY: no seam enforces on this reading
   * alone. The obligation a seam applies is the held profile's `signing` when this instance
   * holds the record's profile, and otherwise this reading AND a genesis sidecar entry this
   * instance's verifier accepts (see `layerVerdicts`); an operator seam on an instance that
   * does not hold the profile then refuses `unknown-profile` at resolution, except where the
   * obligation applies and the layer fails (SPEC §4's exception). `genesisProfile` below says
   * whether the live profile is the one the record was opened under; read the two together.
   */
  signingDeclared: boolean;
  transitions: {
    seq: number;
    transitionDigest: Digest;
    signed: boolean;
    keyRef?: string;
    verified: boolean;
  }[];
  /**
   * Every sidecar digest for this record that names NO transition in the chain — orphans.
   * REPORTING ONLY: no verdict reads this, no gate consults it, `signatureLayerHolds` never
   * sees it; the layer stays chain-driven and an orphan is never visited for a verdict. The
   * set is derived from the sidecar because orphans exist nowhere else, and it is SORTED
   * lexicographically so the report is identical under any `listByRecord` order the contract
   * permits. It is computed inside the one pass that already lists the sidecar — zero
   * additional reads. A host discharges `SignatureStore`'s prune obligation by deleting what
   * this names, when no seam call on the record is in flight (an in-flight append's entry and
   * an orphan carry the same `seq`). Deferral-register row 22's open half is why this exists;
   * naming orphans does not bound them.
   */
  orphans: Digest[];
  /**
   * The genesis profile as the chain binds it and as THIS instance holds it. `matches`: the
   * live profile's data-only projection digests to the `opened` payload's `profileDigest`.
   * `drifted`: the id resolves here, but to a profile whose projection digests differently —
   * `signing` is one of the covered fields, so a same-id profile that dropped it lands here,
   * and so does any other declarative edit between open and now. `unresolvable`: this
   * instance does not hold the genesis `profileId` (or the genesis carries no string id or
   * binding), so there is nothing to compare. REPORTING ONLY, like `orphans`: no gate reads
   * THIS field and `signatureLayerHolds` never computes it. The refusal lives elsewhere: since
   * the profile-drift gate every seam that resolves a persisted record applies the same
   * comparison through `kernel/held-profile.ts` and, at the operator seams, refuses
   * `unknown-profile` when it does not hold the profile (SPEC §4, §8) — the cross-record
   * verifications fold the miss into their own claim refusals — so `drifted` here names exactly why such a seam
   * refused, or will. The comparison itself is what SPEC §4 promised the binding for ("the
   * governing profile is detectable on replay").
   */
  genesisProfile:
    | { resolution: 'matches'; profileId: string; digest: Digest }
    | { resolution: 'drifted'; profileId: string; boundDigest: Digest; liveDigest: Digest }
    | {
        resolution: 'unresolvable';
        profileId: string | undefined;
        boundDigest: Digest | undefined;
      };
}

/** The raw genesis resolution `layerVerdicts` hands back; only `verifySignatures` digests it.
 * `liveDigest` is the CACHED digest `ResolvedProfile.profileDigest` holds (computed once at
 * `create()`), never a recompute over the live profile object — the same value every seam's
 * `kernel/held-profile.ts` comparison reads, so this report and the seams can never disagree
 * over a host that mutates a registered profile object in place after `create()` (see
 * `create.ts`'s own doc comment on `ResolvedProfile.profileDigest`). */
interface GenesisResolution {
  profileId: string | undefined;
  boundDigest: Digest | undefined;
  liveDigest: Digest | undefined;
}

function resolveGenesisProfile(r: GenesisResolution): SignatureReport['genesisProfile'] {
  const { profileId, boundDigest, liveDigest } = r;
  if (profileId === undefined || boundDigest === undefined || liveDigest === undefined) {
    return { resolution: 'unresolvable', profileId, boundDigest };
  }
  return liveDigest === boundDigest
    ? { resolution: 'matches', profileId, digest: boundDigest }
    : { resolution: 'drifted', profileId, boundDigest, liveDigest };
}

/** One verifier fault: the position of the transition in the chain walk and the error to throw. */
interface VerifierFault {
  index: number;
  error: Error;
}

/** The thrown value for a verifier fault: names the record, the `seq` and the `keyRef`, says
 * that nothing was appended, and carries the verifier's own error as `cause`. It does not
 * claim the fault is an outage: a verifier that throws on a malformed or planted signature
 * string looks exactly like one from here, so the message names both readings and the entry
 * that tells them apart. */
function verifierFaultError(recordId: string, seq: number, keyRef: string, cause: unknown): Error {
  return new Error(
    `verifier fault: the verifier for keyRef '${keyRef}' could not answer (it threw or ` +
      `rejected) for seq ${seq} of record '${recordId}', and nothing was appended. A transient ` +
      'outage clears on retry; a fault that persists while the verifier is otherwise healthy ' +
      `means the sidecar entry at seq ${seq} under keyRef '${keyRef}' may be malformed or planted`,
    { cause },
  );
}

/**
 * The one correlation core both `verifySignatures` and `signatureLayerHolds` share:
 * walks `chain` (never the sidecar) and, for each transition, resolves whether it
 * carries a sidecar entry, whether that entry's `keyRef` resolves in `ctx.signing`'s
 * registry, and whether the resolved verifier accepts the canonical bytes. An entry whose
 * `keyRef` or `signature` is not a string is a DEFINITE MISS (`signed`, never `verified`, the
 * verifier never called), as is a missing entry, an unresolvable `keyRef` or a non-`true`
 * answer. A verifier that THROWS or REJECTS is recorded as a FAULT beside its transition
 * (`faults`, in chain order) and leaves that transition `verified: false`; this walk never
 * decides what the fault means — its two consumers do (`signatureLayerHolds` lets a definite
 * miss decide first and rethrows only where the obligation applies and nothing else decided,
 * `verifySignatures` always rethrows). A REJECTING sidecar store
 * (`ctx.signing.signatures.listByRecord`) propagates from here directly, a storage fault of
 * the same class as a rejecting `readChain`.
 *
 * The sixteenth self-authored inversion, argued here. The stance recorded until now was that a
 * throwing verifier is fail-closed REPORTING: its throw never left this module and read as
 * `verified: false`. On a signing record that reading made every un-enlisted seam append a
 * terminal `refused { code: 'chain-compromise' }` after a verifier outage, to a record nobody
 * had touched, and once the outage ended every transition verified, the compromise edge
 * included. The reading was wrong because the two inputs are not the same. `false` is the
 * verifier ANSWERING that these bytes and this signature do not match; a throw or a rejection
 * is the verifier saying it could not answer at all — a key service down, a network call
 * timing out. Recording "could not answer" as "did not verify" is recording tampering that
 * never happened, and a terminal edge is the one outcome no host can undo. The posture
 * already taken for a rejecting `listByRecord` is the precedent: the same kind of fault one
 * hook over propagates and appends nothing, so a transient outage clears when the call is made
 * again. A fault propagates only where the answer was needed and nothing else decides: on a
 * record the layer does not apply to the gate never acts on a junk entry's fault, so it changes
 * no seam's outcome there (the read, `verifySignatures`, still propagates it); and where the
 * layer applies, a definite miss on any transition decides the gate before any fault is
 * rethrown. The limit, stated at its width: where this instance holds the record's profile, a
 * seam persistently throws rather than drawing the edge (an outage of the verifier the instance
 * signs under only delays the edge, through the mint check) only when no transition is a
 * definite miss and some
 * entry is a string the verifier cannot answer for — a malformed or planted signature string
 * that makes the host's verifier throw is that case, and it persists until the entry is
 * repaired, which is why the fault message names the entry's `seq` and `keyRef` and the
 * `Verifier` contract asks for `false` on input that does not parse; where it does not, a
 * genesis fault also throws (the obligation rests on it — see `signatureLayerHolds`).
 * Fail-closed is untouched: `false`, a non-boolean answer, an unresolvable `keyRef` and a
 * non-string field still read `verified: false` and still refuse.
 * `signingDeclared` reads the GENESIS transition's own `profileId`, resolved against
 * THIS instance's profile registry — the live profile's declaration, REPORTING ONLY on its
 * own. The `obligation` it hands back is what the gate enforces: when this instance HOLDS the
 * record's profile (`held-profile.ts`: the id registered AND its projection digesting to the
 * genesis `profileDigest`), the held profile's `signing`; otherwise `signingDeclared` AND the
 * chain's first transition reported `signed` and `verified` by the walk below — a genesis
 * entry this instance's own verifier accepts, never a bare sidecar entry, which a
 * storage-writing insider can plant. Against the rule before the held profile decided, the
 * only case that changes is "not held, live profile signing, genesis not verified": an
 * in-place edit that ADDS `signing` over a never-signed record (now no obligation), and a
 * same-id signing sibling over a signing record whose genesis entry is missing, fails, or
 * names a key it holds no verifier for (narrowed). The drop direction is unchanged: a
 * non-signing live profile never carries an obligation for a record it does not hold.
 * The bound, per site. Such an instance cannot tell a never-signed record from a signing one
 * whose genesis entry is missing, fails, or names a key it holds no verifier for, and reads
 * all three as carrying no obligation. At the five operator seams (`finalize`, `decline`,
 * the findings seams, the redemption seams, `seal`) it refuses `unknown-profile` and appends
 * nothing, where a holder of the profile still draws `chain-compromise`. At `prior-legs` it
 * refuses `prior-leg-unverified` (the binding fold). At `supersedes` a predecessor of ANY
 * terminal state refuses `supersedes-unverified` (the binding fold, since the supersedes-binding
 * increment: before it a terminal non-`confirmed` predecessor VERIFIED there, including a
 * forged chain naming an unregistered id or a registered signing id with a non-matching
 * `profileDigest`). The cost, stated: recovery needs the predecessor's profile held.
 * The same resolution is handed back raw (`resolution`: the claimed id, the bound
 * `profileDigest`, the resolved profile's own CACHED digest when the id resolves — never a
 * recompute, so this stays the same value every seam's `held-profile.ts` comparison reads)
 * so `verifySignatures` can report whether the live profile IS the one the record was
 * opened under; `signatureLayerHolds` never digests it — reporting only.
 * The sidecar is listed by `recordId`, the id the caller loaded the chain FOR — never by an
 * id read from the chain's own rows, which a storage-writing insider controls. Every caller
 * has already bound the chain to that id, so for an intact chain the two are the same: the
 * mutating seams (`finalize`, `decline`, `redeem`, `seal`, `findings-seams`) through a
 * `verifyChain(chain, recordId)` whose intactness gates this call, `prior-legs` and
 * `supersedes` the same way against the referenced id, and `verifySignatures` through
 * `assertChainFor`.
 */
async function layerVerdicts(
  ctx: KernelContext,
  recordId: string,
  chain: readonly Transition[],
): Promise<{
  signingDeclared: boolean;
  obligation: boolean;
  /** True when this instance does not hold the record's profile, the live same-id profile
   * declares `signing`, and the genesis verification FAULTED: the obligation then depends on
   * a verdict that does not exist, so `obligation` reads false only as a placeholder. Only
   * the gate consults it. */
  obligationUndecided: boolean;
  resolution: GenesisResolution;
  transitions: SignatureReport['transitions'];
  /** Verifier faults in chain order; `index` is the transition's position in the walk. */
  faults: VerifierFault[];
  orphans: Digest[];
}> {
  const genesis = chain[0];
  const payload =
    genesis === undefined
      ? undefined
      : (genesis.payload as { profileId?: unknown; profileDigest?: unknown });
  const profileId = typeof payload?.profileId === 'string' ? payload.profileId : undefined;
  const boundDigest =
    typeof payload?.profileDigest === 'string' ? payload.profileDigest : undefined;
  const resolvedProfile = profileId === undefined ? undefined : ctx.profiles.get(profileId);
  const signingDeclared = resolvedProfile?.profile.signing === true;
  const liveDigest = resolvedProfile?.profileDigest;

  const entries =
    ctx.signing === undefined ? [] : await ctx.signing.signatures.listByRecord(recordId);
  const byDigest = new Map(entries.map((e) => [e.transitionDigest, e]));

  const transitions: SignatureReport['transitions'] = [];
  const faults: VerifierFault[] = [];
  for (const [index, t] of chain.entries()) {
    const d = transitionDigest(t);
    const entry = byDigest.get(d);
    if (entry === undefined) {
      transitions.push({ seq: t.seq, transitionDigest: d, signed: false, verified: false });
      continue;
    }
    // The entry's fields are TYPED before anything uses them, by the same reasoning as the
    // own-key guard below: the sidecar is storage, and storage is what this layer distrusts. A
    // non-string `keyRef` or `signature` is a definite miss — `signed`, never `verified` — and
    // the verifier is never called with it: a host verifier that decodes the signature (the
    // guide's sample does) would throw on a `null` and turn a planted entry into a fault, and an
    // object `keyRef` would throw a raw TypeError out of `Object.hasOwn` before any verdict.
    // A non-string `keyRef` is not reported either; the report's `keyRef` is a string or absent.
    if (typeof entry.keyRef !== 'string' || typeof entry.signature !== 'string') {
      transitions.push({
        seq: t.seq,
        transitionDigest: d,
        signed: true,
        ...(typeof entry.keyRef === 'string' ? { keyRef: entry.keyRef } : {}),
        verified: false,
      });
      continue;
    }
    let verified = false;
    // `Object.hasOwn`, never a bare index — the same load-bearing guard as `canonical.ts`'s
    // `resolveCanonicalizer`, for a sharper reason here: `verifiers` is a plain object keyed
    // by the host's opaque keyRefs, and `entry.keyRef` is sidecar DATA, which under this
    // layer's own threat model (SPEC §14, "storage-writing insiders") the adversary writes.
    // A bare index walks the prototype chain, so a forged entry naming an inherited
    // Object.prototype member (`toString`, `constructor`) resolved to a callable that returns
    // a truthy value over any bytes and any signature — counted as verified with no key
    // involved. The literal-`true` comparison is the other half of the same fail-closed
    // reading: `Verifier` promises a boolean, and a status string or object a host's verifier
    // answers instead is not a verification. `test/verifier-registry.test.ts` pins both.
    const verifiers = ctx.signing?.verifiers;
    const verifier =
      verifiers !== undefined && Object.hasOwn(verifiers, entry.keyRef)
        ? verifiers[entry.keyRef]
        : undefined;
    if (verifier !== undefined) {
      try {
        verified = (await verifier(encodeTransition(t), entry.signature)) === true;
      } catch (cause) {
        // A fault, not a verdict: the transition stays unverified, and the fault is carried
        // out for the consumer that needs the answer to decide what it means.
        verified = false;
        faults.push({ index, error: verifierFaultError(recordId, t.seq, entry.keyRef, cause) });
      }
    }
    transitions.push({
      seq: t.seq,
      transitionDigest: d,
      signed: true,
      keyRef: entry.keyRef,
      verified,
    });
  }
  // The orphan set: sidecar digests the chain walk above never visited. `byDigest` already
  // holds every entry — one key per digest, so the duplicate-digest shape `signing/store.ts`
  // calls out of contract collapses here rather than being reported twice — and reading its
  // keys costs no further read.
  const chainDigests = new Set(transitions.map((t) => t.transitionDigest));
  const orphans = [...byDigest.keys()].filter((d) => !chainDigests.has(d)).sort();
  const held =
    profileId === undefined || boundDigest === undefined
      ? undefined
      : heldProfile(ctx.profiles, { profileId, profileDigest: boundDigest });
  const first = transitions[0];
  const obligationUndecided =
    held === undefined && signingDeclared && faults.some((f) => f.index === 0);
  const obligation =
    held !== undefined
      ? held.profile.signing === true
      : signingDeclared && first?.signed === true && first.verified;
  return {
    signingDeclared,
    obligation,
    obligationUndecided,
    resolution: { profileId, boundDigest, liveDigest },
    transitions,
    faults,
    orphans,
  };
}

export async function verifySignatures(
  ctx: KernelContext,
  recordId: string,
): Promise<SignatureReport> {
  const chain = await ctx.store.readChain(recordId);
  if (chain.length === 0) {
    throw new Error(
      `verifySignatures: unknown recordId '${recordId}' — no such record; a recordId that ` +
        'resolves to no chain is a caller error, not a domain refusal (SPEC §8)',
    );
  }
  assertChainFor(chain, recordId, 'verifySignatures');
  const { signingDeclared, resolution, transitions, faults, orphans } = await layerVerdicts(
    ctx,
    recordId,
    chain,
  );
  // A report that said "unverified" for "could not ask" would be false: the first fault in
  // chain order propagates, as a rejecting `listByRecord` already does — even beside a definite
  // miss, since the read decides nothing and the gate's miss-first rule has nothing to settle
  // here. The error names the `seq` and `keyRef`, which locates the entry. A `false` verdict and
  // a non-string field are still reported, never thrown.
  const fault = faults[0];
  if (fault !== undefined) throw fault.error;
  return {
    recordId,
    signingDeclared,
    transitions,
    orphans,
    genesisProfile: resolveGenesisProfile(resolution),
  };
}

/**
 * The AL2 enforcement increment's one gate primitive: does the signature layer HOLD for
 * this chain? `true` when the layer does not apply — this instance holds the record's profile
 * and it is non-signing, or it does not hold it and either its live same-id profile does not
 * declare `signing` or the genesis transition carries no entry its verifier accepts
 * (`layerVerdicts` states the rule and its bound, per site) — or when EVERY transition
 * carries a sidecar entry whose keyRef resolves
 * and whose verifier passes over the canonical bytes. `false` on any DEFINITE MISS — a missing
 * entry, a non-string `keyRef` or `signature`, an unresolvable keyRef (an OWN key of the
 * registry, never an inherited member), or a verifier answering anything but the literal
 * `true` — fail closed. A verifier that THROWS or REJECTS is not a miss but a fault, and it
 * propagates only where the answer was needed and nothing else decides: when the obligation
 * applies, a definite miss on ANY transition already makes the layer fail, so it returns
 * `false` and the caller fails closed into its own code — `chain-compromise` at a seam, the
 * claim refusal at a cross-record verification — exactly as OPEN-QUESTIONS §1 decided for a
 * missing signature or an unresolvable key, whatever another transition's verifier did (the
 * seam's edge itself still passes the mint check, so an outage of the verifier the instance
 * signs under delays it until recovery); only
 * when no transition is a definite miss and some transition faulted is the
 * first fault in chain order rethrown, and then no caller appends. When the obligation is false
 * a fault is never seen. For an instance that does not hold the record's profile, a fault in
 * the genesis verification rethrows when the live same-id profile declares `signing` (the
 * obligation then rests on a verdict that does not exist, so not even a definite miss can
 * decide: a miss would draw `chain-compromise` under an obligation and resolve as
 * `unknown-profile` without one) and is ignored when it does not. AL1 intactness is the CALLER's
 * first check — `verifyChain(chain, recordId)`, bound to the same `recordId` passed here —
 * so this layer runs only on intact chains loaded for `recordId`, and lists the sidecar by
 * that id. The rehoming residual is named in the status doc: the obligation keys on the
 * genesis's own profileId and profileDigest claims.
 */
export async function signatureLayerHolds(
  ctx: KernelContext,
  recordId: string,
  chain: readonly Transition[],
): Promise<boolean> {
  const { obligation, obligationUndecided, transitions, faults } = await layerVerdicts(
    ctx,
    recordId,
    chain,
  );
  const genesisFault = faults.find((f) => f.index === 0);
  if (obligationUndecided && genesisFault !== undefined) throw genesisFault.error;
  if (!obligation) return true; // the layer does not apply — nothing to hold it to
  // A definite miss outranks a fault: an unverified transition whose verification did NOT
  // fault is an answer, and one such answer already decides the layer.
  const faulted = new Set(faults.map((f) => f.index));
  if (transitions.some((t, index) => !t.verified && !faulted.has(index))) return false;
  const fault = faults[0];
  if (fault !== undefined) throw fault.error;
  return true; // no miss and no fault: every transition verified
}
