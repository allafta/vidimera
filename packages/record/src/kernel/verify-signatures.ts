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
// gates, whatever `signatureLayerHolds` reports elsewhere for the same chain.
//
// Chain-driven, deliberately: an orphan sidecar entry (no matching chain transition)
// is invisible to BOTH consumers by CONSTRUCTION, not by a filter — the loop below walks
// the chain and looks each transition's digest UP in the sidecar, never the reverse.
// On an instance with no `config.signing` the surface still answers, trivially: every
// transition reports `signed: false, verified: false`, and `signatureLayerHolds` returns
// `true` for the same reason `verifySignatures.signingDeclared` reads false — a
// non-signing record's layer has nothing to hold it to.

import { encodeTransition, transitionDigest } from '../chain/encoding.js';
import type { KernelContext } from '../create.js';
import type { Digest, Transition } from '../types.js';

export interface SignatureReport {
  recordId: string;
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
 * chain as non-signing rather than guessing.
 */
async function layerVerdicts(
  ctx: KernelContext,
  chain: readonly Transition[],
): Promise<{
  signingDeclared: boolean;
  transitions: SignatureReport['transitions'];
  orphans: Digest[];
}> {
  const genesis = chain[0];
  const profileId =
    genesis === undefined ? undefined : (genesis.payload as { profileId?: unknown }).profileId;
  const signingDeclared =
    typeof profileId === 'string' && ctx.profiles.get(profileId)?.profile.signing === true;

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
    const verifier = ctx.signing?.verifiers[entry.keyRef];
    if (verifier !== undefined) {
      try {
        verified = await verifier(encodeTransition(t), entry.signature);
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
  // holds every entry, so this costs no read; the Set collapses the duplicate-digest shape
  // `signing/store.ts` calls out of contract rather than reporting it twice.
  const chainDigests = new Set(transitions.map((t) => t.transitionDigest));
  const orphans = Array.from(
    new Set(entries.map((e) => e.transitionDigest).filter((d) => !chainDigests.has(d))),
  ).sort();
  return { signingDeclared, transitions, orphans };
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
  const { signingDeclared, transitions, orphans } = await layerVerdicts(ctx, chain);
  return { recordId, signingDeclared, transitions, orphans };
}

/**
 * The AL2 enforcement increment's one gate primitive: does the signature layer HOLD for
 * this chain? `true` when the layer does not apply — the genesis profile is non-signing
 * or unresolvable in THIS instance (the id-resolution posture the build takes
 * everywhere) — or when EVERY transition carries a sidecar entry whose keyRef resolves
 * and whose verifier passes over the canonical bytes. `false` on any miss, unresolvable
 * keyRef, failing or THROWING verifier — fail closed. AL1 intactness is the CALLER's
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
