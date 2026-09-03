// @vidimera/record — kernel/verify-signatures.ts: SPEC §14's AL2 surface, now home to
// BOTH signing increments' work. `verifySignatures` (the AL2 mint increment) is a pure
// chain-driven read: it reports, it never refuses, appends, or throws on verification
// failure — fail-closed REPORTING (unresolvable keyRef, failed or throwing verifier,
// missing entry all read `verified: false`). `signatureLayerHolds` (the AL2 enforcement
// increment, second of three) is the one gate primitive built on the SAME correlation
// core (`layerVerdicts` below, factored so neither consumer re-derives it): every
// verification site that already checks AL1 intactness (`verifyChain(chain).intact`)
// now widens that same check to also consult this layer on a signing record, folding a
// bad layer into each site's OWN existing failure arm — this file adds no new refusal
// code and appends nothing itself. The read stays a read: `verifySignatures` never
// gates, whatever `signatureLayerHolds` reports elsewhere for the same chain. Since the
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

import { encodeTransition, transitionDigest } from '../chain/encoding.js';
import type { ConfirmProfile } from '../config.js';
import type { KernelContext } from '../create.js';
import { profileDigest } from '../profile-digest.js';
import type { Digest, Transition } from '../types.js';

export interface SignatureReport {
  recordId: string;
  /**
   * Whether the genesis profile, resolved against THIS instance's registry, declares
   * `signing: true`. Computed from the LIVE profile, never from the chain: a same-id profile
   * that omits `signing` — or an instance that does not hold the id at all — reads `false`
   * here for a record that WAS opened under a signing profile. `genesisProfile` below says
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
   * it and `signatureLayerHolds` never computes it; a drifted non-signing sibling still
   * finalizes — the recorded residual, which `test/profile-drift-report.test.ts` pins AS A
   * BOUND so that it moves on purpose. Fail-closing it changes the SPEC §8 refusal registry
   * and the §9 ladder, and OPEN-QUESTIONS §1's decided granularity text, so it waits on a
   * fresh sanction. The comparison itself is what SPEC §4 promised the binding for ("the
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

/** The raw genesis resolution `layerVerdicts` hands back; only `verifySignatures` digests it. */
interface GenesisResolution {
  profileId: string | undefined;
  boundDigest: Digest | undefined;
  live: ConfirmProfile | undefined;
}

function resolveGenesisProfile(r: GenesisResolution): SignatureReport['genesisProfile'] {
  const { profileId, boundDigest, live } = r;
  if (profileId === undefined || boundDigest === undefined || live === undefined) {
    return { resolution: 'unresolvable', profileId, boundDigest };
  }
  const liveDigest = profileDigest(live);
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
 * THIS instance's profile registry — the id-resolution posture named at the two
 * call sites below: an instance that cannot resolve the genesis profile treats the
 * chain as non-signing rather than guessing. The same resolution is handed back raw
 * (`resolution`: the claimed id, the bound `profileDigest`, the live profile when the id
 * resolves) so `verifySignatures` can report whether the live profile IS the one the
 * record was opened under; `signatureLayerHolds` never digests it — reporting only.
 */
async function layerVerdicts(
  ctx: KernelContext,
  chain: readonly Transition[],
): Promise<{
  signingDeclared: boolean;
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
  const live = profileId === undefined ? undefined : ctx.profiles.get(profileId)?.profile;
  const signingDeclared = live?.signing === true;

  const recordId = genesis?.recordId;
  const entries =
    ctx.signing === undefined || recordId === undefined
      ? []
      : await ctx.signing.signatures.listByRecord(recordId);
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
  return { signingDeclared, resolution: { profileId, boundDigest, live }, transitions, orphans };
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
  const { signingDeclared, resolution, transitions, orphans } = await layerVerdicts(ctx, chain);
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
 * this chain? `true` when the layer does not apply — the genesis profile is non-signing
 * or unresolvable in THIS instance (the id-resolution posture the build takes
 * everywhere) — or when EVERY transition carries a sidecar entry whose keyRef resolves
 * and whose verifier passes over the canonical bytes. `false` on any miss, unresolvable
 * keyRef (an OWN key of the registry, never an inherited member), failing, THROWING, or
 * non-boolean-answering verifier — fail closed. AL1 intactness is the CALLER's
 * first check; this layer runs only on intact chains. The rehoming residual is named in
 * the status doc: the obligation keys on the genesis's own profileId claim.
 */
export async function signatureLayerHolds(
  ctx: KernelContext,
  chain: readonly Transition[],
): Promise<boolean> {
  const { signingDeclared, transitions } = await layerVerdicts(ctx, chain);
  if (!signingDeclared) return true; // the layer does not apply — nothing to hold it to
  return transitions.every((t) => t.verified);
}
