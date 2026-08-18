# Integrating Vidimera into a host

This page is for wiring the library into a real application. It assumes you have run
[`getting-started.md`](getting-started.md) and hold the model from
[`concepts.md`](concepts.md). Every code shape below was executed against this tree before
being written down; signatures marked *provisional* may still change under the pre-0.1
naming review (deferral register row 6).

## The division of labor

The library records decisions. Everything else is deliberately yours:

| The host owns | The library owns |
|---|---|
| Authentication and sessions — producing the `IdentityAssertion` | Refusing an identity whose authority the leg does not allow |
| Rendering the review UI — and reporting what it rendered (`facts`) | Binding the reviewed-surface digest into the record |
| Executing effects | The at-most-once redemption seam the effect couples through |
| Domain checks (policy engines, validators, LLM judges) | Recording their verdicts as consultations and gating on presence/verdict/freshness |
| Scheduling (cron, queues) | `listDue` and en-passant clock resolution — the library ships no scheduler |
| Key custody (AL2) | Signing every append and enforcing the signature layer on verify |

## The capability split is the first wiring decision

`create(config)` returns `{ agent, operator }`. Give the **agent handle** to the drafting
side — your agent framework, tool executor, or job runner. Keep the **operator handle** in
host code paths that carry authenticated human sessions. The split is in-process
object-capability discipline: the agent handle simply has no transitioning methods. It is
not a sandbox — code that can reach your store or the operator handle is outside its
protection, so treat the operator handle like you treat your database handle.

## Choosing a store

- **`MemoryStore`** — reference semantics for tests and development; nothing survives the
  process. Exported from the package entry point.
- **`SqliteStore(location)`** — the embedded-SQL backing over `node:sqlite`; pass a file
  path, or `':memory:'` for throwaway instances. Note Node still flags `node:sqlite` as
  experimental and prints a warning (this repo's own vitest config suppresses exactly that
  warning class).
- **A server-SQL backing does not exist yet** (deferral register row 15; its trigger is
  the first multi-operator consumer or the 0.1 cut). If you need multi-connection,
  multi-process access today, you are early — say so in an issue, because that is exactly
  the trigger the register is waiting on.
- **Writing your own:** the `Store` interface is exported and the conformance suite that
  holds the two reference backings equivalent lives at
  `packages/record/test/conformance/store-conformance.ts` — wire your adapter into it. The
  contract's *behaviors* are stable; its *method signatures* are explicitly provisional
  pre-1.0.

Both exported stores are marked **public but explicitly unstable pre-1.0** in their own
doc comments. They are exported so hosts wire the reference semantics instead of
hand-rolling a byte-identical copy.

## Canonicalizers

The registry in `config.canonicalizers` is keyed by the `canonicalizerRef` your profiles
name. A canonicalizer projects domain content into a plain, JSON-safe structure *before*
the library's own canonical JSON encoding digests it. Rules of thumb:

- Deterministic: same decision-relevant content in, same structure out. Strip volatile
  fields (fetch timestamps, cache keys) — anything left in changes the digest and will
  refuse as drift later.
- JSON-safe: plain objects, arrays, strings, finite numbers, booleans, null. No `BigInt`,
  no class instances, no functions.
- Versioned: the ref is part of the profile (`'finance.invoice.v1'`); when the projection
  changes meaningfully, mint a new ref and a new profile version rather than silently
  changing what old records' digests meant.

## Profile design

The id convention is `<domain>.<subject>.v<n>`. Fields worth deliberate choices:

- **`expiry`** (`{ ttl }` in seconds, or the literal `'none'`): how long an open record
  may await its decision. Expiry is enforced at the seams and via the sweep (below), never
  by a background timer.
- **`terminalRefusals`** per leg: which refusal codes append a terminal `open → refused`
  edge rather than leaving the record open for retry. List a code when a refusal is
  evidence you want on the chain (e.g. `content-drift` on payment-shaped subjects); leave
  it unlisted when the natural response is a corrected retry by the same or another actor.
- **Multi-leg** (`legs: [maker, checker, …]`): legs conclude in declared order; each leg
  is its own record, opened with verified references to the prior legs
  (`open(stagedRef, { priorRecordRefs })`), and the separation-of-duties gate compares the
  finalizing principal against the *recorded* prior actors. Concurrent legs are out of
  scope pre-1.0 by declaration.
- **`redeem` block** — presence declares the effect seam (next section).
- **`captureMode: 'live'`** — for decide-what-exists flows where content cannot be staged
  inert. Construction requires a per-leg required consultation (your independent
  re-derivation check) and a redemption tail; read SPEC §9.2 before reaching for it.
- **`signing: true`** — AL2, below.

## Identity: from the transport, always

Build the `IdentityAssertion` in the host layer that actually authenticated the human —
session middleware, mTLS termination, your OIDC integration:

```ts
// e.g. in an HTTP handler, AFTER your auth middleware established the session
const identity = {
  principal: `user:${session.userId}`,
  authority: `session:${appId}`,     // conventions: oidc:<issuer> | session:<app> | mtls:<service> | dev-stub
  proofRef: session.auditRef,        // optional pointer into YOUR auth system's evidence
};
```

Never construct it from the request body, an agent message, or anything else that rode in
with the payload. The library enforces the leg's `allowedAuthorities` allowlist; the
*truthfulness* of the assertion is exactly as good as your transport layer, and the record
inherits that bound — which is why `authority` names the mechanism.

## Handling outcomes

One shape to handle everywhere:

```ts
const outcome = await operator.finalize(recordId, identity, content, facts);
switch (outcome.status) {
  case 'ok':
    // outcome.value.state === 'confirmed'; proceed to the effect (if any)
    break;
  case 'refused':
    // A domain outcome, not an error. outcome.code says what; outcome.class says how bad
    // ('compromise' means the chain itself failed verification). outcome.transitionRef is
    // present only when the refusal appended a transition.
    break;
  case 'unavailable':
    // A required authority was unreachable (outcome.authority names it). Nothing was
    // appended — an outage is not a decision. Retry when the dependency recovers.
    break;
}
```

Exceptions still happen — for *your* bugs: unknown ids, malformed inputs, construction-time
contract violations, storage faults. Let them crash into your normal error handling; do not
catch them into refusal handling.

## The effect seam

When a profile declares a `redeem` block, `confirmed` is **not terminal** — the record
awaits the host coupling the real effect to it, at most once.

**Direct shape** — effect and record store share a transaction boundary:

```ts
const confirmed = await operator.finalize(recordId, identity, content, facts);
if (confirmed.status !== 'ok') return handle(confirmed);

// Perform the effect and redeem, passing your transaction so the redeemed edge is
// atomic with the effect's own write (the optional third argument threads through
// to the store):
const redeemed = await operator.redeem(recordId, content /*, tx */);
// A second redeem refuses 'already-redeemed'. Different content refuses 'effect-mismatch'.
```

**Token shape** — the executor is remote and shares no transaction:

```ts
const begun = await operator.beginRedemption(recordId, content);
if (begun.status !== 'ok') return handle(begun);
const token = begun.value.token;
// The token is secret material, returned exactly once and never persisted — the chain
// carries only its digest. Do NOT log it. Hand it to the executor out-of-band.

// The executor presents it back to complete:
const done = await operator.completeRedemption(recordId, token, begun-time-content);
```

The bounds: `confirmToRedeem` (seconds from confirm to redemption start) and `redeemBound`
(seconds a `redeeming` record may dangle) — both resolved at the seams and by the sweep.
The honest bound on the whole seam: given an idempotent executor, orphaned, duplicate,
premature, and mismatched effects are *refusable at the seam*; the library never executes
effects and cannot see effects that bypass the seam.

## Clocks, the sweep, and retirement

The library ships no scheduler and no public `expire()`. Clock edges (`open → expired`,
`confirmed → expired`, `redeeming → redemption-failed`) are appended *en passant* at the
next mutating seam that observes a lapsed bound — plus an explicit sweep you schedule:

```ts
// However you schedule things — cron, a queue, an interval:
for (const recordId of await operator.listDue()) {
  // Drive the ordinary seam for the record's pending window; the seam resolves the clock
  // en passant and returns the truthful outcome. For effect-seam windows, any redemption
  // call serves — no token needed, any content serves, because the clock rung runs first:
  await operator.redeem(recordId, {});
  // An elapsed redeeming window (a lost token) resolves to redemption-failed and the call
  // refuses redemption-timeout; an elapsed confirmed window (redemption never started)
  // resolves to expired and the call refuses unredeemable-state. The refusal is the
  // truthful answer; the resolution edge appended en passant is the sweep's real product.
}
```

The sweep has no append authority of its own — `listDue` is a read over a listing index,
and the authoritative recompute at the seam decides. A record whose lifecycle is over can
be capped: `operator.seal(recordId)` appends a `sealed` transition, after which the record
reports `status: 'retired'` and the store refuses any further append. Sweep first, then
seal — `seal` deliberately never expires en passant.

## AL2: detached signing

Declare `signing: true` on a profile and supply the instance hook — verified end-to-end
against this tree:

```ts
import { generateKeyPairSync, sign as edSign, verify as edVerify } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

const { agent, operator } = create({
  profiles: [{ ...profile, signing: true }],
  store,
  canonicalizers,
  signing: {
    signer: async (bytes) => ({
      keyRef: 'ap-console-2026-08',
      signature: edSign(null, bytes, privateKey).toString('base64'),
    }),
    verifiers: {
      'ap-console-2026-08': async (bytes, sig) =>
        edVerify(null, bytes, publicKey, Buffer.from(sig, 'base64')),
    },
    signatures: mySignatureStore, // { put(entry), listByRecord(recordId) } — the sidecar
  },
});
```

What you get, with its limits in the same breath:

- Every transition a declaring profile's records append is signed **before** the append;
  every *seam* that verifies a chain before acting folds signature verification into its
  own failure arm; and `operator.verifySignatures(recordId)` reports per-transition
  sign/verify status (reporting only — the gate lives at the seams, and the standalone
  `verifyChain` audit read checks linkage only).
- The library does **no crypto itself** — signer and verifier are your hooks, and the
  algorithm, key custody, and rotation (via `keyRef` naming) are yours. AL2 raises the bar
  against a rewriting insider exactly when the key sits outside that insider's boundary.
- A `signing: true` profile on an instance without `config.signing` throws at
  construction — a loud error, never a silent downgrade to AL1.
- No signature material enters the chain — signatures live in the detached sidecar, and a
  signed chain's bytes differ from an unsigned profile's only through the declaring
  profile's own genesis `profileDigest` (and its hash-chain derivations) — so enabling AL2
  does not fork your record format.

Caveats today: the signing config types (`SigningConfig`, `Signer`, `Verifier`,
`SignatureStore`) and the reference `MemorySignatureStore` are not re-exported from the
package entry point — supply the config structurally, or deep-import
`src/signing/memory.js` for the reference sidecar in tests. This asymmetry is recorded in
deferral register row 6 for the pre-0.1 naming review.

## The probe tier in your CI

`packages/record/src/probes/` (deep import today — no subpath export yet) runs seventeen
operator-assurance probes against *your* configuration via a driver you supply:

```ts
import { runProbes, assertSatisfied } from '.../src/probes/index.js';

const report = await runProbes({
  makeConfig: () => myRealConfig(),
  sampleContent: (profileId) => ({ content: …, subjectRef: … }),
  sampleIdentity: (profileId, legId) => …,
  // optional hooks unlock more probes: sampleConsultations, severConsultationAuthority,
  // disableRenderingCredential, restartPersistence
});
assertSatisfied(report); // throws unless every probe passed or is under an unexpired waiver
```

Probes without their optional hook report `not-driven` — visible, never silently skipped.
Waivers name a probe, a reason, and an expiry; an expired waiver fails `assertSatisfied`
even if everything else passed. The bound, once more: a green report proves the controls
operated in the probed configuration at probe time — nothing more.

## Privacy posture

The store never holds reviewed content — only digests (`contentDigest`, consultation
`payloadDigest`s, the `facts` figures digest). That is a deliberate retention stance: the
record proves *what* was confirmed by digest without becoming a second copy of your data.
Two consequences: keep the digested source material retrievable for as long as you need
the record to be checkable against it, and treat reviewer-timing metadata with the
discipline the concept states — aggregate control assurance, never per-named-reviewer
scoring. Retention rules are SPEC §13.
