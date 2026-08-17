# AL2 detached signing, the mint — design

**Step 8's third tail item begins: AL2 increment 1 of 3** (the split ruled at the AL2
brainstorm: mint, enforce, freshness). This increment lands the signing LAYER: the
per-profile declaration, the host-injected signer hook and verifier registry, the
detached-signature sidecar (interface + reference implementation), signatures minted
on every append of a signing record, and one audit-time verification surface. AL1
semantics are UNTOUCHED — no seam verifies signatures yet (enforcement is increment
2's own work, where AL2's markers move and OQ §1 gains its tails), and unverified
signatures are not fail-open: every AL1 guarantee holds throughout, AL2 being an
upgrade layer by SPEC §14's own grading. `freshness` stays GOVERNED (increment 3,
gated on OQ §4's own brainstorm).

## Rulings taken at the AL2 brainstorm, so they are not re-litigated

- **Per-profile, record-homogeneous.** The profile declares signing; a record opened
  under a signing profile is signed WHOLE from its genesis — mid-chain enablement
  boundaries never exist. A same-id profile flipping signing is the version-discipline
  violation §2's convention already names (the recovery increment's terminality ruling
  leaned on the same argument); a legacy unsigned record verifies at AL1 as before.
- **Missing-signature posture: fail-closed into chain-compromise** — increment 2's
  enforcement folds an unsigned or unverifiable transition of a signing record into
  the existing chain-verify outcome. Banked here; nothing in THIS increment enforces.
- **Key custody: `keyRef` beside each signature, host registry.** Each detached
  signature carries an opaque `keyRef` (sidecar-only, never in chain bytes);
  verification resolves it against a host-supplied verifier registry (the
  canonicalizers-registry precedent); an unresolvable `keyRef` fails closed. The
  library never holds private keys.
- **Three increments**; THIS one is the mint. The markers do NOT move here; the OQ §7
  "The mode is sketched" opener stays parked for increment 2's sealed-edit sanction
  gate.

## Rulings taken at this spec (the mint's own design), argued in place

- **What is signed: the canonical transition bytes** — `encodeTransition(transition)`
  (chain/encoding.ts:69, already exported; the frozen file is not touched). SPEC §14's
  "Detached signatures over canonical transitions and consultations" is satisfied
  transition-granularly: in this build consultations ARE transitions (the
  `consultation-recorded` kind and finalize's batch), so signing every transition of a
  signing record covers them; stated wherever the layer is described.
- **Sign BEFORE append.** The signature is computed and written to the sidecar before
  the store CAS. A crash or lost CAS between the two leaves an ORPHAN signature — an
  entry for a transition that never landed — which is harmless: verification is
  chain-driven (it looks up signatures FOR chain transitions, never trusts the sidecar
  as an index). The reverse order would risk an unsigned landed transition on a
  signing record, which increment 2's posture would then condemn as compromise —
  fail-closed would punish a crash, so the order matters and is pinned.
- **The mint point is a Store decorator, not per-seam edits.** `create()` wraps the
  injected store in a signing decorator when the instance declares signing:
  `appendTransition`/`appendBatch` intercept, decide by the RECORD's profile
  (genesis-payload `profileId`, memoized per record; a non-genesis append reads the
  chain's genesis once), sign each transition, write the sidecar, then delegate. One
  place; ZERO seam edits; every append path — the seams, the batch, the en-passant
  clock edges, the reverify drift edge, `sealed` — is covered by construction.
- **Instance config vs profile declaration, fail-closed loud both directions where it
  matters**: `ConfirmProfile.signing?: true` (the literal `true` type — `signing:
  false` is unrepresentable, closing the declarable-but-inert trap at the type level);
  `Config.signing?: { signer, verifiers, signatures }`. A signing-declaring profile in
  an instance WITHOUT `config.signing` throws at `create()` (loud — the profile
  demands a capability the instance cannot supply). `config.signing` with NO declaring
  profile is LEGAL (a prepared instance, the unused-canonicalizer-registry-entry
  class) — stated, not silent.
- **The audit surface is a pure read**: `operator.verifySignatures(recordId)` returns
  a per-transition report and never refuses, appends, or throws on verification
  failure (it throws only on the caller-error/unknown-record class every read takes).
  Enforcement semantics belong to increment 2.

## 1. The types and hooks (`src/signing/store.ts`, new; `config.ts`)

```ts
/** One detached signature, keyed by the transition's own digest (content-addressed —
 * the signature is OVER the canonical bytes that digest names). recordId/seq ride
 * along for listing; they never key anything. */
export interface SignatureEntry {
  transitionDigest: Digest;
  recordId: string;
  seq: number;
  keyRef: string;
  signature: string;
}

/** The detached-signature sidecar. Deliberately NOT part of the frozen Store
 * contract: signatures are an additive evidence layer beside the chain, stored and
 * injected separately (SPEC §14's "detached"). Same provisional-signature discipline
 * as the Store: behaviors stable, method shapes pre-1.0. */
export interface SignatureStore {
  put(entry: SignatureEntry): Promise<void>;
  /** All entries for a record, chain order not guaranteed — the caller correlates by
   * transitionDigest (chain-driven, never sidecar-driven). */
  listByRecord(recordId: string): Promise<SignatureEntry[]>;
}

/** The host's signer hook: canonical transition bytes in, keyRef + signature out.
 * The library never sees key material. */
export type Signer = (bytes: Uint8Array) => Promise<{ keyRef: string; signature: string }>;

/** The host's verifier for ONE key: canonical bytes + signature in, boolean out. */
export type Verifier = (bytes: Uint8Array, signature: string) => Promise<boolean>;
```

`config.ts`: `ConfirmProfile` gains `signing?: true`; `Config` gains
`signing?: { signer: Signer; verifiers: Record<string, Verifier>; signatures: SignatureStore }`.
Construction (in `create()`, where cross-profile/instance concerns already live): a
`signing: true` profile with `config.signing` absent throws loud; the verifier
registry may be empty at mint time only in the degenerate sense — an empty or missing
registry makes `verifySignatures` report every entry unverifiable, which is the
fail-closed direction, not a construction error (the operator may verify on a
different instance than the one that signs; stated).

## 2. The reference sidecar (`src/signing/memory.ts`, new)

`MemorySignatureStore`: a Map-backed `SignatureStore`, the `MemoryStore` precedent —
`put` upserts by `transitionDigest` (re-signing the same bytes is idempotent
evidence), `listByRecord` filters. Small, exercised by every test.

## 3. The decorator (`src/signing/decorate.ts`, new; `create.ts`)

`withSigning(store, signing, isSigningProfile)` returns a `Store` whose
`appendTransition` and `appendBatch`:

1. resolve whether the record signs — a genesis append (`seq === 1`, `kind:
   'opened'`) reads `payload.profileId` and consults `isSigningProfile` (a
   `(profileId: string) => boolean` closure `create()` builds from its resolved
   profiles); a non-genesis append resolves via a per-decorator
   `Map<recordId, boolean>` memo, falling back to ONE `readChain` genesis read on a
   miss (a decorator restart mid-record);
2. for a signing record: for EACH transition to append, `signer(encodeTransition(t))`
   → sidecar `put` — SIGN BEFORE APPEND (the orphan-harmless ruling above);
3. delegate to the wrapped store unchanged (the same arguments, the same return —
   the decorator adds no semantics to the append itself, and a lost CAS after a
   sidecar write is the harmless orphan).

Every other `Store` method delegates verbatim. `create()` wraps the injected store
iff `config.signing` is present, BEFORE the kernel closures capture it — the seams
never know. `tx` passthrough: the enlisted direct-shape `redeem` passes `tx` through
`appendTransition` — the decorator signs and delegates with `tx` untouched (the
sidecar write is NOT part of the host transaction, deliberately: an aborted effect's
orphan signature is the same harmless class; stated in the decorator's header).

## 4. The audit surface (`kernel/verify-signatures.ts`, new; the operator surface)

`operator.verifySignatures(recordId): Promise<SignatureReport>` where

```ts
export interface SignatureReport {
  recordId: string;
  signingDeclared: boolean; // the record's own genesis profile, resolved in THIS instance
  transitions: {
    seq: number;
    transitionDigest: Digest;
    signed: boolean;          // a sidecar entry exists for this digest
    keyRef?: string;
    verified: boolean;        // signed AND the keyRef resolved AND the verifier passed
  }[];
}
```

Chain-driven: read the chain (empty ⇒ the caller-error throw every read takes),
resolve the genesis profile in THIS instance (`signingDeclared`; an unresolvable
profile reports `false` — a pure read never refuses), list the sidecar, correlate by
`transitionDigest`, run each entry's verifier (`verifiers[keyRef]`; unresolvable
`keyRef` or a failed/throwing verifier ⇒ `verified: false` — fail-closed reporting,
never a throw). Orphan sidecar entries (no matching chain transition) are IGNORED by
construction — chain-driven correlation; a pin proves it. On an instance WITHOUT
`config.signing` there is no sidecar or registry to consult: the surface still
answers, trivially — every transition `signed: false`, `verified: false` — because a
report is a read, never a capability gate. With `config.signing` present, the report
states what the sidecar holds regardless of whether the record's own profile
declares signing — the report never editorializes; increment 2's enforcement is
where posture lives.

## 5. Tests (`test/signing.test.ts`, new)

- **Construction**: a `signing: true` profile without `config.signing` throws loud at
  `create()`; with it, constructs; `config.signing` without any declaring profile
  constructs (the prepared-instance ruling); `signing: false` does not typecheck
  (a compile-time-only pin: a comment, not a runtime assert — the `true` literal).
- **Mint coverage**: a signing profile's full lifecycle (stage → open → finalize →
  seal-or-redeem per fixture) leaves EVERY chain transition with a sidecar entry —
  including the batch's entries and an en-passant clock edge (drive one lapse) — each
  entry keyed by the transition's real `transitionDigest`, carrying the signer's
  `keyRef`; a NON-signing profile in the same instance mints NOTHING.
- **Byte-identity**: the same flow under the same profile ± `signing: true` produces
  IDENTICAL chain bytes (transition-by-transition deepEqual) — the sidecar is the
  only difference; the frozen byte-stability pins keep passing untouched.
- **Sign-before-append / orphans**: a signer that records call order proves signing
  precedes the append; a hand-inserted orphan sidecar entry (a digest no chain
  carries) never appears in `verifySignatures`' report.
- **The audit surface**: a fully-signed record reports all `verified: true` under a
  registry holding the keyRef; an unresolvable `keyRef` reports `verified: false`
  (fail-closed reporting); a tampered SIGNATURE string reports `verified: false`; a
  record under a non-declaring profile reports `signingDeclared: false`; a
  hand-deleted sidecar entry reports `signed: false` for exactly that seq (the
  increment-2 posture's future evidence, visible today).
- **The enlisted passthrough**: an enlisted (`tx`) redeem on a signing effect-seam
  profile still signs its edge and delegates the tx untouched (the sqlite backing).
- **The signer hook contract**: the signer receives EXACTLY
  `encodeTransition(transition)`'s bytes (capture and compare).

## 6. The record

- **Status doc**: step 8 row — the third tail item BEGINS (AL2 increment 1 of 3:
  the mint; enforcement and its marker move next; freshness after, on OQ §4's own
  brainstorm); a NEW §14 row (the layer's shape, the four brainstorm rulings, the
  sign-before-append and decorator rulings, the AL1-untouched honesty); the governed
  count UNCHANGED at 1 (said explicitly — `signing` is a new capability arriving
  WITH its behavior, never governed, the `reverify`-arrival class).
- **Register row 17**: amended — AL2 signing IN PROGRESS (increment 1 of 3 landed);
  self-test tier still deferred.
- **CLAUDE.md / README**: the AL2 work begun; no marker moved (stated).
- **Sweep** (LAST, hit==verdict): the standing list plus `signing`, `signature`,
  `keyRef`, `sidecar`, `AL2`, `detached`, `verifySignatures`, `withSigning`,
  absence vocabulary (`no signing`, `never signed`, `AL1 only`), `SKETCHED` outside
  docs/concept.

## What this does not claim

- **No enforcement**: no seam consults signatures; `verifyChain` and every
  chain-verify rung are byte-identical in behavior; a garbled signature refuses
  NOTHING today. Increment 2's own work — with the marker move and OQ §1's tails.
- **`freshness` stays GOVERNED**; authority timestamps do not exist yet (increment
  3, its own OQ §4 brainstorm).
- **docs/concept/ untouched entirely** this increment.
- The sidecar is NOT the frozen Store and its shapes are provisional pre-1.0 like
  every §12 surface.
- Key generation, distribution, rotation scheduling: host-declared, out of scope —
  the library sees `keyRef`s and hooks only.

## Process

Subagent-driven development, standing lessons in force: escape-free SPEC-cited
strings; the record task's sweep LAST with hit==verdict and absence vocabulary;
counts with movement (the governed count does NOT move — said explicitly);
plan-authored comments truthful at their commit (everything lands in one code
commit + one record commit — two-touch wording only for increments 2/3 references);
RED executed; NO frozen-surface edits (src/store/, chain/encoding.ts,
byte-stability.test.ts, docs/concept/ — the decorator lives OUTSIDE src/store/); the
final review checks the status doc against CODE; no new runtime APIs beyond what
Node >=22.16 ships.
