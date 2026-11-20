# Integrating Vidimera into a host

This page is for wiring the library into a real application. It assumes you have run
[`getting-started.md`](getting-started.md) and hold the model from
[`concepts.md`](concepts.md). Every code shape below was executed against this tree before
being written down. The pre-0.1 API review (deferral register row 6) completed 2026-08-19,
so every name below that predates it is review-ratified — `decline`/`DeclineOptions`,
`open`'s `proposed`, and `RedeemOptions`/`redeem.result` landed after that pass and are
unreviewed by it; the store contract's method signatures stay
explicitly provisional pre-1.0 by the sealed set's own declaration.

Wiring it in is not a compliance claim: adopting the library makes no host compliant with
any law or regulation ([`faq.md`](faq.md)).

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
  path, or `':memory:'` for throwaway instances. Single-operator by design: WAL-mode SQLite
  under one process and one connection, with no multi-connection safety claimed or tested
  and no busy timeout set — a second connection contending for the write lock meets the
  driver's own error. Multi-connection deployments are the server-SQL backing's job. On Node
  below 24.15, importing the package
  prints Node's `ExperimentalWarning` for `node:sqlite` — the entry point re-exports this
  class, so every adopter meets it at import whatever store they choose — and
  `node --disable-warning=ExperimentalWarning` silences it; on 24.15 and later nothing
  prints, since Node marked the module a release candidate there. Measured, not assumed:
  the first-use workflow imports the packed artifact bare on the declared floor and on the
  current LTS line and asserts the warning present on the first and absent on the second
  (`docs/analysis/2026-08-29-first-use-proof.md`).
- **`PostgresStore(pool, { schema })`** — the server-SQL backing
  (`@vidimera/store-postgres`, this workspace's second package; landed 2026-08-19,
  retiring deferral register row 15): multi-connection-safe over a `pg.Pool` you own —
  the store never creates or closes the pool. Size it for at least two clients when you
  enlist writes in your own transaction: the first call's schema bootstrap checks out a client
  of its own while yours is held, and a one-client pool would wait forever. Requires PostgreSQL
  11 or newer — the
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

**The tables a SQL store owns.** `SqliteStore` and `PostgresStore` each own four tables —
`staged`, `records`, `transitions` and `signatures` — in the database file (SQLite) or the
store's schema (Postgres), and two indexes, `records_c1_exclusivity` and `signatures_by_record`.
They are created with `IF NOT EXISTS` and never altered, so keep your own tables out of those
names (on Postgres, give the store a schema of its own). A pre-existing table of one of those
names with another shape makes the store throw: on SQLite at open, and on Postgres at every call
from the first, when an index the store creates names a column the table lacks (`records`, or a
`signatures` without `record_id`); otherwise at the first statement that needs a missing column —
a `signatures` table with `record_id` but not the store's other columns refuses the first append
that carries entries, and that append applies nothing. An existing index of either name is kept
as found, and the store's own is then silently not created.

## Canonicalizers

The registry in `config.canonicalizers` is keyed by the `canonicalizerRef` your profiles
name. A canonicalizer projects domain content into a plain, JSON-safe structure *before*
the library's own canonical JSON encoding digests it. Rules of thumb:

- Deterministic: same decision-relevant content in, same structure out. Strip volatile
  fields (fetch timestamps, cache keys) — anything left in changes the digest and will
  refuse as drift later.
- JSON-safe: plain objects, arrays, strings, finite numbers, booleans, null. No `BigInt`,
  no class instances, no functions.
- Total: it must return for any content a seam will hand it. A canonicalizer is your
  registered code, not caller data, so a throw at `finalize`, `decline` or a redemption seam
  propagates as a configuration fault — nothing is appended and no refusal is minted; it is
  never read as `content-drift`. (The `facts.figures` side is the deliberate contrast: those
  are caller data, and a non-canonicalizable payload there refuses `consultation-missing`.)
- Versioned: the ref is part of the profile (`'finance.invoice.v1'`); when the projection
  changes meaningfully, mint a new ref and a new profile version rather than silently
  changing what old records' digests meant.

## Profile design

The id convention is `<domain>.<subject>.v<n>`.

Treat the convention as load-bearing. Each record's genesis binds a digest of the profile it
was opened under, and every seam refuses `unknown-profile` for a record whose registered
same-id profile no longer digests to that binding. So an in-place edit to a profile — a new
allowed authority, a longer ttl, dropping `signing` — strands that profile's open records:
nothing can finalize, decline, expire or take findings on them, and their subjects stay held
by exclusivity, until you either restore the declarative fields exactly or register the edit
under a new id and keep the old version registered for the records still under it. The second
route is the convention; the first is the escape when you edited by mistake. The same discipline
governs recovery: an in-place edit or a retired version also blocks `supersedes` of that profile's
terminal records, so keep prior versions registered for as long as you may want to supersede their
records. What is lost is the verified `supersedes` link, not the subject: a terminal predecessor
releases exclusivity, and a plain `open` still works.

`create()` reads each profile once and keeps a frozen copy; it does not keep your object.
Mutating the object after `create()` changes nothing the instance enforces or digests, so a
profile is changed by registering a new one (above), not by editing the one you passed. To
make that copy unambiguous, a profile is **plain data**: object literals, arrays and primitives
(parsed JSON qualifies). A class instance, an object built with `Object.create`, an accessor, a
`Set` or `Map`, or a sparse array throws at construction, naming what it found; a TypeScript
class that `implements ConfirmProfile` is among them, so pass a literal. A key the library
does not know throws too, because it is either a typo (`sigining`) or metadata that would enter
the digest while governing nothing: keep your metadata beside the profile. (A function-valued
key is a host code reference, which the digest excludes, and is ignored.) An explicit
`undefined` is an absent field; `null` is not, and throws. Each time bound
(`expiry.ttl`, `redeem.confirmToRedeem`, `redeem.redeemBound`, each `freshness` value) is a
positive integer of at most 3,155,760,000 seconds (100 years); for no bound, omit the field
(`'none'` for expiry). So `profileDigest(profile)` computed on a profile `create()` accepted
equals the digest the instance binds.

Fields worth deliberate choices:

- **`expiry`** (`{ ttl }` in seconds, or the literal `'none'`): how long an open record
  may await its decision. Expiry is enforced at the seams and via the sweep (below), never
  by a background timer.
- **`terminalRefusals`** per leg: which refusal codes append a terminal `open → refused`
  edge rather than leaving the record open for retry. List a code when a refusal is
  evidence you want on the chain (e.g. `content-drift` on payment-shaped subjects); leave
  it unlisted when the natural response is a corrected retry by the same or another actor.
  A member the leg could never produce (`sod-violation` without `sod` or `proposer`,
  `ineligible` without `eligibility`, and so on) throws at construction rather than sitting inert.
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

And pass exactly those fields. The library rejects an identity carrying any key other than
`principal`, `authority` and `proofRef` (at `finalize`/`decline` as the refusal
`identity-authority-refused`) — so a session or user object passed through wholesale fails
closed rather than writing its e-mail addresses and tokens into a chain that cannot forget
them.

What the library records is not the object you pass. It checks the identity once, reads
`principal`, `authority` and `proofRef` once each through ordinary property access, and records
a fresh `{ principal, authority, proofRef? }` literal built from exactly those values — at
`finalize` and `decline` (the actor, `facts.checker`, and each obtained consultation's
`checker`) and at `raiseFinding` and `acknowledge`. A class with getters, an object built with
`Object.create`, or a prototype `toJSON` is recorded as the values it validated: never as its
`toJSON` view, and never changed by mutating your object after the call. Profiles are
snapshotted too, once, at `create()` (see Profile design), and `open()` reads its options bag
once. The limit: those are the only host values snapshotted this way. The options you pass to
`finalize`, `decline` and the redemption seams, and what your canonicalizers return, are
still read where they are used, so keep those plain data.

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
catch them into refusal handling. One storage fault is worth an alert of its own: a call that
throws with `foreign persisted data` in its message means the store answered one record's id
with rows that name another record — corruption, tampering, or a backing that keys its reads
wrongly, never a bad argument. The throw recorded nothing; that record's seams refuse
`chain-compromise` (the api-reference's chain-binding note has the full list).

One refusal is neither an input problem nor a state change. A `finalize`, `decline`,
`raiseFinding` or `acknowledge` that loses its append to a concurrent `raiseFinding` or
`acknowledge` on the same record refuses `record-contended`. Nothing was recorded and the record
is still open. Re-invoke it: the ladder re-evaluates against the new head, so a required-kind
finding raised in between now gates. If your surface shows the human the record before they
decide, consider re-prompting first — the library will not confirm on their behalf over
evidence they never saw, and neither should you.

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
declared `decline: true` keeps a chain byte-identical to a pre-decline implementation over
decline's own keys and transitions, so reaching the seam on it is a caller/config error, not
a domain outcome. That guarantee is not universal, though: chain-verify runs before this
check, as it does at every operator-side seam, so a chain that is already broken can still
acquire the one edge every seam can append no matter what it declares — a
`chain-compromise` refusal, with its own appended edge — instead of the throw.

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
recipe with a different profile id. The limit, in the same breath: the instance must still
hold the predecessor's profile — registered under its id, unedited — or the claim refuses
`supersedes-unverified`, so keep the declined record's profile registered alongside the
stricter one.

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
it resolves the staged draft the store holds under that reference, exactly as `stagedRef`
itself is resolved — the draft must re-derive to the reference it is read under — and binds
that draft's digest into the genesis as `proposedDigest`:

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
// record.contentDigest is the revision's digest; record.proposedDigest is the digest of the
// draft the store held under the proposal's stagedRef when the record opened, which had to
// re-derive to that ref — different here, because review changed the draft.
```

Both failure modes are caller errors, thrown rather than refused (`open`'s own
unknown-`stagedRef` posture): an unresolvable `proposed.stagedRef`, and a resolved draft
naming a different `(profileId, subjectRef, legId)` than the draft being opened — the
message names both triples, fail-closed against host wiring bugs. A third throw is a
storage fault rather than a wiring bug: a staged draft — the opened one or the proposed
one — whose `id`, or the reference its fields re-derive to, is not the reference it was
read under was edited in storage, and `open` throws naming that reference, appending
nothing. **Same-ref is legal and
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

The honest bound, in the same breath: the binding proves the store held, under the
reference the host named, a draft with that digest for the same `(profile, subject, leg)`
when the record opened — a draft that re-derives to that reference, so its fields were not
edited under it — and, by comparing it against `contentDigest`, whether the decision matched
or changed it. It never proves who authored or staged either draft (anyone who can write the
store can stage a whole new, self-consistent draft under its own reference), and never that
the revision was an improvement.
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
    signatures: store.signatures, // the store's own sidecar: integrated mode (below)
  },
});
```

`store` is the reference store you constructed — a `MemoryStore`, `SqliteStore` or
`PostgresStore` — and each exposes its own sidecar as `signatures`, over its own storage (a
map, a `signatures` table on the same connection, a `signatures` table in the same schema).
Pass the instance itself: the `Store` interface types the member optional, so a `Store`-typed
reference does not satisfy `signatures` here. An existing SQLite file gains the table when
`SqliteStore` opens it, and an existing Postgres schema on the store's first use; nothing already
in another sidecar is copied into it. A table already named `signatures` there with another shape
is not altered, and the store throws instead (the tables each SQL store owns are under "Choosing
a store" above).

**The sidecar you pass selects one of two modes**, decided once when `create()` builds the
instance and never per append. Nothing reports the mode back at runtime: your configuration is
the record of which one you run.

- **Integrated** — `config.signing.signatures` *is* `config.store.signatures`, the same object.
  Each signature is still minted and checked before the append, but its entry is not written
  ahead of it: the entry rides the append (`AppendMeta.signatures`), and the store writes it
  inside that append's own atomic unit, after every compare-and-swap and constraint check has
  passed, and only then — through your transaction when a seam is enlisted in one. An append
  that does not land (it lost its compare-and-swap, it threw, or your transaction rolled it
  back) leaves no entry, and one that lands always carries its own. Measured on all three
  reference stores: six refusing `finalize` calls on a sealed signing record whose genesis
  signature was broken leave the sidecar equal to the chain — 5 entries for 5 transitions after
  every call, no orphan — where separate mode grows it from 5 to 11. The limit, in the same
  breath: this holds only for those three stores, or a store of your own that keeps the same
  contract (`Store.signatures` in the [API reference](api-reference.md#stores)).
- **Separate** — any other sidecar: one over other storage (a `MemorySignatureStore`, your own
  table on another connection), which cannot join the append's unit. The decorator writes each
  entry with `put` *before* it delegates the append, outside any transaction — the order every
  signing instance ran before integrated mode existed — with every consequence the orphans
  bullet below states.

**Switching an existing deployment between modes**, in either direction — from a separate
sidecar to the store's own, or back from the store's own to a separate one (to move signatures
onto storage of their own, say) — leaves the entries already written where they were: under the
new configuration the records they sign read unsigned, and their next seam refuses
`chain-compromise`, appending that edge. So switch in three steps: stop every instance that
writes to the store; copy the entries — `put` every entry the old sidecar lists for each record
into the sidecar the new configuration will read (`store.signatures` going integrated, your own
going separate); then start instances on the new configuration only. Never run the two
configurations against one store at once, a rolling restart included: instances on each write
entries the other cannot see, and the next seam that verifies such a record appends a terminal
`chain-compromise` edge on a record nobody tampered with. The library does not migrate them.

**A store wrapper** — one you put around a reference store for instrumentation, tenancy or
retries — must expose the inner store's own `signatures` object, or it runs in separate mode,
and must forward `meta` to the inner store intact. A wrapper that exposes `signatures` but
rebuilds `meta` from `nonTerminal` and `dueAt` alone drops the entries: its transitions land
unsigned, and the next seam refuses `chain-compromise` — loud rather than silent, but a terminal
edge on a record nobody tampered with. The handle `withSigning` returns does not re-expose
`signatures` either; the instance reads the sidecar from `config.signing`, never through the
store.

**If a seam throws inside your transaction, roll the transaction back.** An enlisted seam
(`redeem`, `beginRedemption` or `completeRedemption` with `opts.tx`) writes through your
transaction — its transitions, and in integrated mode their entries — and the backings leave
different things behind when it throws: `SqliteStore` runs every enlisted write in a savepoint
and undoes the whole append, leaving your transaction open and usable; on `PostgresStore` a
failed statement aborts your whole transaction, so a COMMIT after it lands nothing. Rolling back
is the one response correct on both.

Enabling AL2 on a profile that already has records is a profile edit, not a switch: give
the signing version a new id and keep the old one registered, because editing the profile in
place under its id leaves its unsigned records held by no profile this instance registers
and every operator seam refuses `unknown-profile` on them. While the old, unsigned version
stays registered, AL2's closure does not cover the signing version's records: a
storage-writing insider can rewrite one's genesis onto the unsigned twin, and the signature
layer stops applying to it (the conditions below). That is a trade, not a step to skip:
keeping the old version registered keeps its records workable and their verified
`supersedes` recovery (see "Profile design" above), and keeps that route open; unregistering
it closes the route, strands its open records and gives up verified recovery of its terminal
ones.

What you get, with its limits in the same breath:

- Every transition a declaring profile's records append is signed — minted and checked —
  **before** the append, in either mode; every *seam* that verifies a chain before acting
  folds signature verification into its own failure arm; and
  `operator.verifySignatures(recordId)` reports per-transition sign/verify status (reporting
  only — the gate lives at the seams, and the standalone `verifyChain` audit read checks
  linkage and record identity only).
- The library does **no crypto itself** — signer and verifier are your hooks, and the
  algorithm, key custody, and rotation (via `keyRef` naming) are yours. AL2 raises the bar
  against a rewriting insider under three conditions
  ([`../concept/SPEC.md`](../concept/SPEC.md) §14): every key whose verifier is registered,
  retired keys included, sits outside that insider's boundary; every profile registered on
  any instance that acts on these records declares `signing: true` — the layer applies
  through the profile a record's genesis names, and a genesis rewritten onto a registered
  non-signing profile (its digest is computable with the exported `profileDigest`, or
  copied from any record under it) leaves the layer, while an instance registering only
  signing profiles refuses that record `unknown-profile` rather than flagging it; and no
  signature outlives an append that never committed — met when the configured sidecar is the
  store's own on the three reference stores (integrated mode, above), open for a separate
  sidecar (the orphans bullet below). Under all three, AL2 still verifies only what exists:
  an insider who deletes a record's most recent transitions needs neither a key nor a
  recomputation, every remaining signature verifies, and a deleted `redeemed` head lets the
  record be redeemed again (SPEC §13A's absence residual, which AL2 does not close).
- A `signing: true` profile on an instance without `config.signing` throws at
  construction — a loud error, never a silent downgrade to AL1.
  A profile can also lose `signing: true` — or gain it — in place, under the same id, and
  that is not a silent downgrade in either direction: the instance holding the edited
  profile does not hold the record's profile at all, so every operator seam refuses
  `unknown-profile`, never-append, and
  `operator.verifySignatures(recordId).genesisProfile` reports `drifted` with the bound and
  live digests so you can see why. The obligation a seam applies to the signature layer is
  the profile the instance HOLDS for that record, so an edit that adds `signing: true` does
  not turn your existing unsigned records into signing chains with missing signatures and
  does not write `chain-compromise` into them. The limit, in the same breath, per site: an instance
  that does not hold a record's profile applies the layer only when its own live profile
  declares `signing: true` AND the record's genesis transition carries a sidecar entry its
  verifier accepts. A signing record whose genesis entry was removed, fails, or names a key
  that instance has no verifier for therefore reads there as carrying no obligation: the
  operator seams refuse `unknown-profile` and append nothing, where an instance that holds
  the profile still draws `chain-compromise`; a successor leg's `open()` refuses
  `prior-leg-unverified`; and a `supersedes` claim over a predecessor of any terminal state
  refuses `supersedes-unverified`, because recovery needs the instance to hold the
  predecessor's profile. Recover by restoring the profile's declarative fields exactly, or
  by giving the edit a new id (see "Profile design" above).
- A malformed `config.signing` (a non-function `signer`, a `verifiers` that is not a plain
  object of functions — every own string key is checked, enumerable or not — a sidecar
  without `put` or `listByRecord`) throws a named `create:` error at construction too.
- A verifier answers `true`, answers `false` — including for any signature it cannot parse —
  or throws only when it cannot answer. A throw or a rejection is a fault: where the layer
  applies and nothing else decides it, the seam throws and appends nothing, and a transient
  outage clears when the host makes the call again; `verifySignatures` throws too, naming the
  `seq` and `keyRef` that locate the entry. A fault is never read as tampering, and it does not
  hide tampering either: a definite miss on any transition — no entry, a sidecar `keyRef` or
  `signature` that is not a string (never handed to your verifier), an unregistered `keyRef`,
  a `false` or other non-`true` answer — still fails the layer closed (`chain-compromise` at a
  seam) even while another transition's verifier faults — unless that verifier is the one the
  instance signs under, whose outage delays the edge's own mint check until it recovers. The
  limit, at its true width: on an instance that holds the record's profile, a seam persistently
  throws instead of drawing the edge only when
  no transition is a definite miss and some entry is a string your verifier cannot answer for
  — a malformed or planted signature string that makes it throw is exactly that — and the
  record stays that way until the entry is repaired; on an instance that does not hold it, a
  fault at the genesis throws as well, because whether the layer applies there rests on that
  answer. Answer `false` for input that does not parse and the malformed case does not arise.
- The instance refuses to land a signature its own registry cannot verify: the signer's
  `keyRef` must be an own key of `verifiers` and its verifier must accept the signature, or the
  seam throws with nothing put or appended — even where it would have drawn `chain-compromise`.
  A batch (`finalize`, `decline`) is minted and checked whole before any entry is written, so a
  failure on one element leaves the sidecar untouched. The cost: every signed append, `open()`
  included, needs the instance's own verifier answering, and an outage of it defers even a
  hash-break `chain-compromise` edge until it recovers.
- Rotate keys in two phases: a NEW key's verifier must reach every instance, and every
  configuration you may roll back to, before any instance signs with it; a retired key's
  verifier stays registered while records it signed may be touched. An instance lacking a
  signer's verifier reads those entries as unverified and refuses `chain-compromise` on
  untampered records.
- No signature material enters the chain — signatures live in the detached sidecar, and a
  signed chain's bytes differ from an unsigned profile's only through the declaring
  profile's own genesis `profileDigest` (and its hash-chain derivations) — so enabling AL2
  does not fork your record format.
- **Orphans** — sidecar entries whose digest names no transition in the chain — depend on the
  mode. They are inert to verification in both, because correlation runs chain-to-sidecar and
  never the reverse; inert is not harmless.
  - *Integrated mode:* no entry outlives an append that did not commit. A lost
    compare-and-swap, a seam refusing against a record admitting no append target, `open()`'s
    retry under a moving clock and a redemption your transaction rolled back each leave none,
    because the entry and the transition are written in one unit, and the condition-(iii)
    splice is refused `chain-compromise` (the spliced transition has no entry). Orphans arise
    only from committed transitions an insider deleted or rewrote — their entries stay behind —
    or from entries written into the sidecar by something other than an append (planted, or
    your own `put`). The orphan of a deleted head may be the only trace that the head existed,
    so keep it (below).
  - *Separate mode:* your sidecar **will accumulate entries for transitions that never
    landed** — the library writes each entry before it appends, so a lost compare-and-swap or a
    crash leaves an entry behind, and a seam that refuses against a record admitting no append
    target leaves one on every such call (six refusing calls, six orphans: 5 entries become 11,
    measured on all three reference stores and pinned on `MemoryStore` and `SqliteStore`). An
    entry over a transition that was attempted and never committed (a redemption your
    transaction rolled back, a compare-and-swap that lost) is a valid signature over that
    transition, and an insider who writes it back into the chain where it was signed for is not
    caught. That route is open from the signature until the entry is pruned, and a splice
    already made is no longer an orphan, so pruning cannot undo it. An orphan can also be
    evidence: when an insider deletes a committed head, its entry becomes an orphan and may be
    the only trace that the head existed, so keep or archive what you prune.

  In either mode they are safe to prune, for verification, whenever no chain transition
  references them, and `operator.verifySignatures(recordId).orphans` names exactly those
  entries, sorted. The library does no pruning, and the `SignatureStore` contract has no
  delete: only the reference `MemorySignatureStore` carries one, outside the contract, and the
  three integrated sidecars carry none. In separate mode, a durable sidecar that must stay
  bounded reconciles against the chain itself, deleting what that read lists from your own
  storage. In integrated mode, keep them: an orphan there is evidence — a committed transition
  deleted or rewritten, or an entry planted — unless your own `put` wrote it (an entry copied
  in when you switched modes, say). Removing one is your own act, a SQL `DELETE` by
  `transition_digest` against the store's `signatures` table, which the store treats as its
  implementation rather than an API; `MemoryStore`'s sidecar cannot be pruned, and holds
  nothing past the process. Run any reconciliation only when no seam call on that record is in
  flight: in separate mode an in-flight append's entry and an orphan carry the same `seq`, and
  in either mode `verifySignatures` reads the chain before it lists the sidecar, so an append
  that commits between the two reads lists as an orphan. Stated, not enforced: nothing here
  reads your implementation.

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
