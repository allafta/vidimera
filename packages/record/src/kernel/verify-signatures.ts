// @vidimera/record — kernel/verify-signatures.ts: the AL2 mint increment's one audit
// surface (SPEC §14). A pure chain-driven read: it reports, it never refuses,
// appends, or throws on verification failure — fail-closed REPORTING (unresolvable
// keyRef, failed or throwing verifier, missing entry all read `verified: false`).
// Enforcement — folding a signing record's bad layer into chain-compromise at the
// seams — is the AL2 enforcement increment's own work.
//
// Chain-driven, deliberately: an orphan sidecar entry (no matching chain transition)
// is invisible to the report by CONSTRUCTION, not by a filter — the loop below walks
// the chain and looks each transition's digest UP in the sidecar, never the reverse.
// On an instance with no `config.signing` the surface still answers, trivially: every
// transition reports `signed: false, verified: false` — a report is a read, never a
// capability gate.

import { encodeTransition, transitionDigest } from '../chain/encoding.js';
import type { KernelContext } from '../create.js';
import type { Digest } from '../types.js';

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
  const genesis = chain[0];
  const profileId =
    genesis === undefined ? undefined : (genesis.payload as { profileId?: unknown }).profileId;
  const signingDeclared =
    typeof profileId === 'string' && ctx.profiles.get(profileId)?.profile.signing === true;

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
  return { recordId, signingDeclared, transitions };
}
