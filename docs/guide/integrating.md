# Integrating Vidimera into a host

This page is for wiring the library into a real application. It assumes you have run
[`getting-started.md`](getting-started.md) and hold the model from
[`concepts.md`](concepts.md). Every code shape below was executed against this tree before
being written down. The pre-0.1 API review (deferral register row 6) completed 2026-08-19,
so every name below that predates it is review-ratified — `decline`/`DeclineOptions`,
`open`'s `proposed`, and `RedeemOptions`/`redeem.result` landed after that pass and are
unreviewed by it; the store contract's method signatures stay
explicitly provisional pre-1.0 by the sealed set's own declaration.

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
- **`PostgresStore(pool, { schema })`** — the server-SQL backing
  (`@vidimera/store-postgres`, this workspace's second package; landed 2026-08-19,
  retiring deferral register row 15): multi-connection-safe over a `pg.Pool` you own —
  the store never creates or closes the pool. Requires PostgreSQL 11 or newer — the
  oldest server construct it uses is `hashtextextended` — and is exercised in this
  repository against PostgreSQL 18. Its suite runs against a real embedded Postgres and
  includes real multi-connection contention coverage.
- **Writing your own:** the `Store` interface and the adapter-author helpers are exported,
  and the conformance suite that holds the three reference backings equivalent lives at
  `packages/record/test/conformance/store-conformance.ts` — wire your adapter into it. The
  contract's *behaviors* are stable; its *method signatures* are explicitly provisional
  pre-1.0. The suite is deliberately not part of the published package while that
  provisionality holds (the 2026-08-20 ruling,
  `docs/analysis/2026-08-20-conformance-export.md`): working from this repository, add a
  caller file beside the three existing ones; consuming the published package, vendor the
  suite file into your own tests — it is Apache-2.0, and a vendored copy gone stale fails
  loudly against a moved interface rather than passing falsely.

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

## Recording a human decline

A leg that opts in (`decline: true`) gets a second decision call beside `finalize`:
`operator.decline(recordId, identity, content, facts, opts?)`. It runs finalize's ladder
with the **evidence** rungs removed — every **authority** rung still gates (chain-verify,
state/expiry, identity + `allowedAuthorities`, separation of duties including the declared
proposer, content-drift, `facts`, eligibility including its AL2 freshness bound) — but
`requiredConsultations` is not iterated, ack coverage does not run, and the seam takes no
policy input at all. A "no" is never blockable by a missing or dead evidence source:

```ts
const profile: ConfirmProfile = {
  id: 'hr.leave-request.v1',
  subject: { canonicalizerRef: 'hr.leave-request.v1' },
  legs: [
    {
      id: 'manager-decide',
      allowedAuthorities: ['session:hr-console'],
      decline: true,                     // opts this leg into the decline seam (SPEC §9.1)
      terminalRefusals: ['content-drift'], // a drifted decline lands ON the chain too
    },
  ],
  captureMode: 'staged',
  expiry: { ttl: 3600 },
};

// … stage and open as usual, then:
const declined = await operator.decline(recordId, identity, content, facts, {
  // decline has no reason field of its own — a reason rides as an ordinary consultation,
  // via the same attach form finalize's consultations use (SPEC §11.1).
  consultations: [
    {
      kind: 'decline-reason',
      checker: { principal: 'svc:hr-review-surface', authority: 'mtls:hr-review-surface' },
      payloadDigest: reasonDigest, // digest the reason text yourself; the library never sees it
      verdict: 'pass',
    },
  ],
});
// declined.value.state === 'declined'; the chain's `declined { actor }` payload mirrors
// `confirmed`'s.
```

A non-declaring leg's `decline` call **throws** rather than refusing — a leg that never
declared `decline: true` keeps a chain byte-identical to a pre-decline implementation, so
reaching the seam on it is a caller/config error, not a domain outcome.

`terminalRefusals` interacts with decline exactly as it does with finalize: content-drift
during a decline — the reviewer said no to bytes that are not what is bound to the record —
refuses `content-drift`, and if the leg lists that code, the refusal is terminal
(`open → refused`) rather than leaving the record open for a retry.

**The rework recipe.** `declined` is always terminal, which releases the (profile, subject)
slot (C1) for a fresh `open`. A corrected re-submission can leave that implicit, or cite the
declined chain explicitly for an audit trail that shows *why* a new record exists:

```ts
const declinedHead = await operator.chainHead(recordId);
if (declinedHead === null) throw new Error('declined record has a chain head'); // narrows
                                                          // Digest | null to Digest for supersedes
const reopened = await operator.open(revisedStagedRef, {
  supersedes: { recordId, chainHead: declinedHead }, // verified by replay, not trusted blind
});
```

`supersedes` verification is same-subject/any-profile: the predecessor must have decided
*this* `subjectRef`, but the successor is free to open under a different profile —
escalation is exactly that: re-open the same subject under a stricter profile (an added
leg, a narrower `allowedAuthorities`, an eligibility check) instead of the one that was
declined. There is no separate escalation call; it is the ordinary `open` + `supersedes`
recipe with a different profile id.

The honest bound, in the same breath: `decline` proves who declined what they saw — never
that the decline was *sound*. And a "no" that is never routed through this seam does not
exist in the record — a reviewer who says no out of band, or a UI that swallows the
rejection instead of calling `decline`, leaves nothing for anyone to audit later.

## Binding the agent's proposal

An agent drafts, a human reviewer may revise before opening, and today's one content
binding — `contentDigest`, fixed at open from whichever staged draft you open — captures
only the revised content. Staging is idempotent by content, so a real revision always
mints a distinct `stagedRef`; without saying more, the agent's original proposal survives
nowhere on the chain. Bind it explicitly with `open`'s `proposed: { stagedRef }` option:
it resolves the agent's original staged draft through the store, exactly as `stagedRef`
itself is resolved, and binds its digest into the genesis as `proposedDigest`:

```ts
// The agent drafts and stages a proposal:
const proposal = await agent.stage(agentDraft, profileId, subjectRef);
if (proposal.status !== 'ok') return handle(proposal);

// A human reviewer revises it before the operator opens — a NEW staged draft under a new
// stagedRef:
const revised = await agent.stage(humanRevision, profileId, subjectRef);
if (revised.status !== 'ok') return handle(revised);

// Open the REVISED draft, naming the ORIGINAL as its proposal:
const opened = await operator.open(revised.value.stagedRef, {
  proposed: { stagedRef: proposal.value.stagedRef },
});
if (opened.status !== 'ok') return handle(opened);

const record = await operator.getRecord(opened.value.recordId);
// record.contentDigest is the revision's digest; record.proposedDigest is the agent's
// original — different here, because review changed the draft.
```

Both failure modes are caller errors, thrown rather than refused (`open`'s own
unknown-`stagedRef` posture): an unresolvable `proposed.stagedRef`, and a resolved draft
naming a different `(profileId, subjectRef, legId)` than the draft being opened — the
message names both triples, fail-closed against host wiring bugs. **Same-ref is legal and
meaningful:** opening a draft with `proposed` naming that very same `stagedRef` records
unchanged acceptance — `proposedDigest` equal to `contentDigest`, no special case.

`proposedDigest` rides `getRecord`/`replay` only — `review()`'s content-free `ReviewView`
does not project it (the `supersedes` precedent: linkage and provenance evidence stay off
the review surface, which shows what is being decided, not its pedigree). Nothing gates
on the binding, anywhere: finalize and decline confirm or decline exactly as they would
without it.

**Composes with rework.** The declined-and-reopened record from the rework recipe above
may carry BOTH `supersedes` (the terminal predecessor) and its own `proposed` (the
revised round's provenance) — the two options are independent and compose on one `open`:

```ts
const reopened = await operator.open(revisedStagedRef, {
  supersedes: { recordId, chainHead: declinedHead }, // the rework recipe, above
  proposed: { stagedRef: secondRoundProposalRef },   // this round's own provenance
});
```

It composes with multi-leg identically — each leg's record opens separately and may
carry its own `proposed`, keyed to that leg by the same same-triple rule.

**Editor identity is deliberately not a first-class field here.** Staging carries no
identity, so the library cannot attribute who produced the revision (the agent/operator
split is in-process object-capability discipline, not a sandbox — a host writing the
store directly can stage anything). If your host needs that trace, the recorded recipe
is a `revision` consultation attached at `finalize` or `decline`: `checker` names the
editor's identity, and `payloadDigest` digests the prior version — an ordinary
consultation, not a new field.

The honest bound, in the same breath: the binding proves a draft with that digest existed
in the store for the same `(profile, subject, leg)` when the record opened, and — by
comparing it against `contentDigest` — whether the decision matched or changed it. It
never proves who authored either draft, and never that the revision was an improvement.
Correction analysis over proposed-vs-decided digests stays aggregate control assurance,
never per-named-reviewer scoring — the same posture the privacy section below states.

## The effect seam

When a profile declares a `redeem` block, `confirmed` is **not terminal** — the record
awaits the host coupling the real effect to it, at most once.

**Direct shape** — effect and record store share a transaction boundary:

```ts
const confirmed = await operator.finalize(recordId, identity, content, facts);
if (confirmed.status !== 'ok') return handle(confirmed);

// Perform the effect and redeem, passing your transaction on the options bag so the
// redeemed edge is atomic with the effect's own write:
const redeemed = await operator.redeem(recordId, content /*, { tx } */);
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
const done = await operator.completeRedemption(recordId, token, content); // the same content begun with
```

The bounds: `confirmToRedeem` (seconds from confirm to redemption start) and `redeemBound`
(seconds a `redeeming` record may dangle) — both resolved at the seams and by the sweep.

The token seams enlist too: `beginRedemption` and `completeRedemption` take the same
optional `opts.tx` the direct `redeem` has, so a co-located host can commit the
`redeeming` edge in the same transaction as its own outbox row, and the completion edge
with the effect row — a rollback then declines the issuance whole, edge and outbox
together. Over a tampered chain an enlisted call refuses `chain-compromise` result-first
with no edge, same as the direct shape.
The honest bound on the whole seam: given an idempotent executor, orphaned, duplicate,
premature, and mismatched effects are *refusable at the seam*; the library never executes
effects and cannot see effects that bypass the seam.

### Notarizing what the effect did

Add `result: true` to the `redeem` block and either redemption seam gains a place to
notarize what the effect reported — a digest, bound inside the same `redeemed` transition:

```ts
const profile: ConfirmProfile = {
  // ...as above, plus:
  redeem: { result: true }, // declares the effect seam AND admits a result digest
};
```

Direct shape, enlisted, carrying a result — the effect row and the notarization commit
together, the strongest form this takes:

```ts
const outcomeDigest = digest(canonicalize({ transferId: 'xfer-77021', status: 'settled' }));
const redeemed = await operator.redeem(recordId, content, {
  // tx,                                  // enlists the edge with the effect's own write —
                                           // see the direct-shape sample above
  result: { digest: outcomeDigest },
});
```

Token completion, carrying a result — the executor supplies it once it actually knows:

```ts
const done = await operator.completeRedemption(recordId, token, content, {
  result: { digest: outcomeDigest },
});
```

A declaring profile that redeems without supplying `result` records nothing —
`resultDigest` stays absent, byte-identical to a pre-increment chain. Two throws guard
misuse: supplying `result` on a profile that never declared `redeem.result` throws, and
supplying it at `beginRedemption` throws unconditionally, declared or not — issuance
precedes execution, so a result at issuance time would claim an outcome for an effect that
has not run.

**Supply it only where the outcome is genuinely known at the call** — the enlisted
co-located `redeem()` above, or a token `completeRedemption()` the executor calls once it
has actually executed. Not in a gate-then-execute flow: there the outcome is unknown when
`redeem()` runs, and the library cannot tell a caller who genuinely knows from one that is
guessing — which is exactly why this is a discipline you keep, not one the library
enforces.

The honest bound, in the same breath: the digest notarizes that the host asserted this
outcome at the moment it closed the coupling. The library never observes the effect, never
verifies the claim (fidelity, not validity — verifying it would make the library the
business system), and never mirrors business state that moves afterward. On a signing
profile the binding is signature-covered like every transition; at AL1 it carries AL1's
ordinary insider bounds.

**When the result arrives later.** A separated executor with an async settlement genuinely
does not know the outcome at redemption time — declining to notarize a guess there is
correct, not incomplete. The recorded recipe is a successor **pure-capture** record (no
`redeem` block at all, registered alongside the decision profile in your `profiles: [...]`
array) whose `subjectRef` names the executed effect and whose content carries the outcome,
citing the decision's `recordId`:

```ts
const outcomeProfile: ConfirmProfile = {
  id: 'finance.payout-outcome.v1',
  subject: { canonicalizerRef: 'finance.payout-outcome.v1' },
  legs: [{ id: 'system-record', allowedAuthorities: ['mtls:payout-executor'] }],
  captureMode: 'staged',
  expiry: { ttl: 3600 },
  // no redeem block: pure capture
};

const outcomeContent = {
  decisionRecordId: recordId,             // cites the decision this outcome belongs to
  transferId: 'xfer-77023',
  status: 'settled',
};
const stagedOutcome = await agent.stage(outcomeContent, outcomeProfile.id, 'effect:xfer-77023');
if (stagedOutcome.status !== 'ok') return handle(stagedOutcome);
const openedOutcome = await operator.open(stagedOutcome.value.stagedRef);
if (openedOutcome.status !== 'ok') return handle(openedOutcome);
await operator.finalize(
  openedOutcome.value.recordId,
  { principal: 'svc:payout-executor', authority: 'mtls:payout-executor' },
  outcomeContent,
  {
    figures: outcomeContent,
    checker: { principal: 'svc:payout-executor', authority: 'mtls:payout-executor' },
  },
);
```

This composes entirely from `open`/`finalize` over an ordinary pure-capture profile — no
new library mechanism. Post-`redeemed` appends stay barred (terminal monotonicity, C3), so
the decision's own record never gains the late result; a reader reconciles the two records
by `decisionRecordId`.

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

The signing tier is root-reachable: `SigningConfig`, `Signer`, `Verifier`,
`SignatureStore`, `SignatureEntry`, the reference `MemorySignatureStore`, and the
`withSigning` store decorator all export from the package entry point (the 2026-08-19 API
review moved them there) — no deep import needed.

## The probe tier in your CI

`packages/record/src/probes/` (the `./probes` subpath — real in the exports map and
exercised by CI's packed-tarball smoke test; inside this workspace, where you run from
source, the deep import below still applies) runs seventeen operator-assurance probes
against *your* configuration via a driver you supply:

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
`payloadDigest`s, the `facts` figures digest, `proposedDigest`, `resultDigest`). That is a deliberate
retention stance: the record proves *what* was confirmed by digest without becoming a
second copy of your data. Two consequences: keep the digested source material retrievable
for as long as you need the record to be checkable against it, and treat reviewer-timing
metadata — including any correction-rate vector derived from comparing `proposedDigest`
against `contentDigest` (how often a named reviewer changed the agent's draft) — with the
discipline the concept states: aggregate control assurance, never per-named-reviewer
scoring. Retention rules are SPEC §13.
