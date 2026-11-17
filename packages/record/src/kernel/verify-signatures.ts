// @vidimera/record — kernel/verify-signatures.ts: SPEC §14's AL2 surface, now home to
// BOTH signing increments' work. `verifySignatures` (the AL2 mint increment) is a pure
// chain-driven read: it reports, it never refuses, appends, or throws on verification
// failure — fail-closed REPORTING (unresolvable keyRef, failed or throwing verifier,
// missing entry all read `verified: false`). `signatureLayerHolds` (the AL2 enforcement
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
   * comparison through `kernel/held-profile.ts` and refuses `unknown-profile` when it does
   * not hold the profile (SPEC §4, §8) — so `drifted` here names exactly why such a seam
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

/**
 * The one correlation core both `verifySignatures` and `signatureLayerHolds` share:
 * walks `chain` (never the sidecar) and, for each transition, resolves whether it
 * carries a sidecar entry, whether that entry's `keyRef` resolves in `ctx.signing`'s
 * registry, and whether the resolved verifier accepts the canonical bytes — a throwing
 * verifier's own throw never escapes this module, folding instead to `verified: false`,
 * fail-closed; a REJECTING sidecar store (`ctx.signing.signatures.listByRecord`) is a
 * different class and DOES propagate, a storage fault of the same class as a rejecting
 * `readChain`.
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
 * refuses `prior-leg-unverified` (the binding fold). At `supersedes` a `confirmed`
 * predecessor refuses (the binding fold) while a terminal non-`confirmed` predecessor
 * VERIFIES — as it already did for a forged predecessor under an unregistered id, and now for
 * a forged chain naming a registered signing id with a non-matching `profileDigest`. Folding
 * the binding for every predecessor state is what closes that residual. The same resolution
 * is handed back raw
 * (`resolution`: the claimed id, the bound `profileDigest`, the resolved profile's own
 * CACHED digest when the id resolves — never a recompute, so this stays the same value
 * every seam's `held-profile.ts` comparison reads) so `verifySignatures` can report
 * whether the live profile IS the one the record was opened under; `signatureLayerHolds`
 * never digests it — reporting only.
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
  resolution: GenesisResolution;
  transitions: SignatureReport['transitions'];
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
  for (const t of chain) {
    const d = transitionDigest(t);
    const entry = byDigest.get(d);
    if (entry === undefined) {
      transitions.push({ seq: t.seq, transitionDigest: d, signed: false, verified: false });
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
      } catch {
        verified = false; // a throwing verifier is fail-closed reporting, never a throw out
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
  const obligation =
    held !== undefined
      ? held.profile.signing === true
      : signingDeclared && first?.signed === true && first.verified;
  return {
    signingDeclared,
    obligation,
    resolution: { profileId, boundDigest, liveDigest },
    transitions,
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
  const { signingDeclared, resolution, transitions, orphans } = await layerVerdicts(
    ctx,
    recordId,
    chain,
  );
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
 * and whose verifier passes over the canonical bytes. `false` on any miss, unresolvable
 * keyRef (an OWN key of the registry, never an inherited member), failing, THROWING, or
 * non-boolean-answering verifier — fail closed. AL1 intactness is the CALLER's
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
  const { obligation, transitions } = await layerVerdicts(ctx, recordId, chain);
  if (!obligation) return true; // the layer does not apply — nothing to hold it to
  return transitions.every((t) => t.verified);
}
