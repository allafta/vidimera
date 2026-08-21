# Vidimera — Verifiable Decision Records at the AI–Human Boundary

**The normative contract.** This document is the complete data model and API of
`@vidimera/record`, an in-application confirmation-capture library. It is self-contained: a
future project can implement, dissect, or rescope from this text alone. Two surfaces are
deliberately not frozen here: construction, and the two handles' read conveniences — both are
implementation surface, bounded by §9's split (the agent surface is reads and staging only)
but not specified call-by-call.

**Revision.** Concept-set revision 1 (2026-08-02). The refusal registry (§8) and the §7
algorithm deprecation list are amended only by a revision of this document; this line is the
identifier such amendments pin to.

**Maturity markers.** The concept is presented whole. Each behavior carries one of:

- **[PROVEN]** — implemented and test-proven in a reference implementation of this spec.
- **[DESIGNED]** — fully specified; every design decision closed; not yet implemented.
- **[SKETCHED]** — documented direction; named open decisions remain **about the behavior
  itself** (see `OPEN-QUESTIONS.md`).

Unmarked text describes the model itself and applies at every maturity. A marker may carry a
bracketed qualifier naming what the maturity is conditional on (e.g. `[SKETCHED —
AL2-dependent]`). [PROVEN] speaks to the behavior as specified; a separately named open
decision about its *future revision* (§10.3's reverse cross-instance direction, §12's
pre-1.0 signature freeze) does not lower it.

## 0. Abstract & honest scope

`@vidimera/record` captures human confirmations of agent-drafted business actions as
**content-bound, append-only, hash-chained, operator-replayable records**. When an AI agent
drafts a real action — a timesheet, a payment, an order, a firewall change — the load-bearing
control is a human's decision over that draft. The library makes that decision durable and
inspectable: it binds the decision to the exact content reviewed, chains every state change so
deletion or reordering is detectable on replay, and gives the operator functions to replay and
verify its own records. The single consumer is the **operator** who runs it; there is no
second party to satisfy. In one line: portable, content-bound, replayable records of human
confirmations for a single operator, with a signing upgrade when insiders enter the threat
model.

State the guarantee and its limit in the same breath — **graduated honesty**. The chain is
**tamper-*evident* against non-recomputing tampering**, with one bound stated in the same
breath: an adversary who alters a transition that is **not** the current chain head *without*
recomputing every subsequent hash is caught on replay — but each transition's integrity is
pinned by the *next* link, so the **head** transition's payload (and a **sole genesis**'s,
which is both first and last) is protected only once a later transition chains over it; until
then a non-recomputing edit of the head is indistinguishable from that transition never having
existed in that form (§5). It is **not** cryptographic and **not** a signature that binds a
principal irrevocably to the record — a storage-writing insider who recomputes the whole chain
is not caught at the base level (detached signing is the documented upgrade, §14, §13A).

**What this library is not.** It does not intercept tool calls, execute effects or mutate host
stores, evaluate policy, authenticate or authorize anyone, run a workflow or orchestration
engine, or render a review UI. Those layers stay the host's, filled by whatever it has
adopted; the library records the *decision* over what they produce, and nothing else.

**No legal or compliance assurance.** A record is *evidence that a human took responsibility
for a draft* — never a conformity assessment. Building to the bar that heavily regulated
settings set yields a well-understood, high-quality layer, but adopting this library does not
make any host compliant with any law or regulation, and a record makes no claim about the
competence, attention, or independence of the human whose decision it captures.

## 1. Terminology & conventions

- **Host / operator** — the application that adopts the library and runs it; the sole consumer
  of the records it produces.
- **Agent draft** — the content an AI agent (or any automated proposer) produces for a human
  to decide over.
- **Proposer** — the actor or origin a profile names as the source of the content under
  decision.
- **Leg** — one human decision step within a decision flow. Legs conclude in configured order;
  concurrent legs are out of scope pre-1.0.
- **Record (DecisionRecord)** — the primitive the library maintains: the durable, chained
  evidence of one human decision at one leg over one subject (§2). *Unrelated to OMG DMN
  "decisions" or Architecture Decision Records.*
- **Staged content** — an inert agent draft bound by its digest and held for review, before
  any record exists (§9).
- **Finalize** — the attempt to transition a record from `open` to `confirmed` under a
  transport-established identity (§9).
- **Confirm** — the human act that finalize records.
- **Seam** — a boundary where the library meets host machinery, exposed as a library **API**,
  not a wire protocol.
- **Consultation** — a recorded answer from an external or automated checker, attached to a
  human leg as evidence, never as a decision (§10, §11).
- **Finding / Acknowledgment** — review-time evidence of an exception and its explicit human
  acceptance (§10.2).
- **Refusal** — a fail-closed outcome at a seam, carrying a stable code (§8).
- **ConfirmProfile (profile)** — the adopter-authored configuration giving a decision flow its
  shape (§9.1); its declared fields switch on the optional features (§10, §11).

**Conventions (BCP-14 split register).** The library's own behaviour is stated as
**descriptive guarantees** ("finalize refuses on drift"), not as requirements on itself. The
key words MUST, MUST NOT, REQUIRED, SHALL, SHOULD, SHOULD NOT, MAY (BCP 14 — RFC 2119,
RFC 8174, when in all capitals) appear **only** where this document places an obligation on a
party *other than the library*: the adopter-supplied content canonicalizer, a separated host's
idempotent effect executor keyed on the redemption token, a co-located host's duty to `await`
redemption before ending its enlisted transaction, a separated-store host's duty to declare a
redemption bound, the host's transport-identity and independent-access-path duties, the host's
content-retention duty for evidential completeness (§3), the host's handle-composition duty
(§9), the host's identity-form and pseudonymization guidance (§6, §13), profile authors'
declaration guidance (identifier forms, `terminalRefusals` listings — §9.1, §10.3, §8), the
findings flow's raiser and named-magnitude guidance (§10.2), an inheriting project's
proof-structure reproduction (§12), and third-party implementers of the `Store` contract
(§12). Lowercase uses carry their plain-English meaning.

## 2. The record model **[PROVEN]**

A `DecisionRecord` captures one human confirmation at one `(profile, subject, leg)`. All
decision state lives in the durable record — a host does not hold lifecycle state (actor,
acknowledgments, prior-leg evidence, consultation results) only in process memory.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Host-scheme identifier, stable for the record's lifetime |
| `profileId` | string | The governing profile, including its version (§9) |
| `legId` | string | The leg this record decides |
| `subjectRef` | string | Host key naming the decided thing |
| `contentDigest` | digest | Digest over canonical content (§3, §7) |
| `policyDigest` | digest or absent | Policy snapshot binding, bound at `open()` where a policy engine contributed (§10.3) |
| `actor` | IdentityAssertion | The deciding human (§6); never a bare string |
| `consultations` | list of Consultation | Evidence attached to the leg, including the reviewed-surface (`facts`) binding (§3, §11.1) |
| `state` | enum | `open`, `confirmed`, `refused`, `expired`, and — on effect-seam profiles — `redeeming`, `redeemed`, `redemption-failed` |
| `status` | enum | Per-record report: `active`, or `retired` once sealed (§5, §12, §13) — distinct from `state`, which the seal preserves |
| `refusalCode` | string or absent | Registry code (§8) when the state is a refusal, or `redemption-timeout` on a `redemption-failed` record (§11.2) |
| *(chain)* | — | Every state-bearing change is a chained transition (§4) |

**Profile-conditional fields** (present only when the profile switches the feature on):
`priorRecordRefs` and `priorLegActors`, carried on a multi-leg successor record (§10.1)
**[PROVEN]**; `findings` and `acks` (a findings flow, §10.2) **[PROVEN]**. **Flow-conditional
field:** `supersedes` (recovery of a terminal predecessor, below) **[PROVEN]** — present only
when a recovering `open()` supplied the verified reference; no profile field declares it, and
§9.1's table carries none.

**Recovery (`supersedes`) [PROVEN].** `supersedes` names the terminal predecessor record (a
`refused`, `expired`, or `declined` record, or an earlier superseded attempt) that a fresh
record recovers from. The reference is **verified by replay** at the recovering record's
`open()` — the host supplies `{ recordId, chainHead }`, the library replays the
predecessor's chain, requires it intact and **terminal**, and records the verified
reference in the new record's genesis snapshot — the same verify-by-replay discipline as
§10.1's prior-leg references. Remaining recovery-flow details (the non-terminal-predecessor
refusal shape, the exclusivity interaction) are enumerated in `OPEN-QUESTIONS.md`.

Auxiliary structures: **IdentityAssertion** `{ principal, authority, proofRef? }` (§6);
**Consultation** `{ kind, checker, at, payloadDigest, verdict, proofRef? }` where `checker` is
an IdentityAssertion and `verdict` is `pass` or `fail` (§11.1); **Finding**
`{ findingId, kind, findingDigest, magnitude?, raiser, at }` and **Ack**
`{ findingId, findingDigest, magnitude?, actor, at }` (§10.2).

**The human-leg requirement.** A record cannot exist without a human decision. Automated
reviewers — including AI agents — never hold a leg; their assessments enter the record as
Consultations carrying the automated checker's identity (§11.1). The final leg of every flow
is therefore always a human's.

**States and terminality.** `open` is the only pre-decision state. `refused`, `expired`, and
`declined` **[DESIGNED]** are terminal. **Whether a final-leg `confirmed` is terminal depends
on the profile** — the derivation the library reads throughout:

- On a **pure-capture profile** (no effect seam declared, §9.1), a final-leg `confirmed` is
  **terminal**: the decision is captured and the record is complete.
- On an **effect-seam profile** (redemption enabled, §9.1), a final-leg `confirmed` is
  **non-terminal — it awaits redemption**; `redeeming` is likewise non-terminal (decided,
  effect unresolved); `redeemed` and `redemption-failed` are terminal (§11.2).

A `confirmed` on a *non-final* leg is terminal for that leg but admits the next leg (§10.1).
`declined` — the recorded human decline (§9's `decline`) — is terminal under every
leg/effect-seam combination. **[DESIGNED]**

### 2.1 Worked example (single-leg confirm)

A pure-capture, single-leg confirmation of an expense draft — the base shape, terminal at
`confirmed` because no effect seam is declared. The `opened` snapshot carries `profileDigest`
(§4); content itself never appears — only `contentDigest` (§3).

```json
{
  "id": "rec_7f3a…", "profileId": "example.expense-report.v1",
  "legId": "approver-decide", "subjectRef": "expense:e-4711",
  "contentDigest": "sha256:9c1e…",
  "actor": { "principal": "pseud:a81f", "authority": "oidc:https://login.example.com" },
  "consultations": [
    { "kind": "chain-verify", "verdict": "pass",
      "checker": { "principal": "system:chain-verify", "authority": "system:vidimera-record" },
      "at": "2030-01-15T10:03:44.612Z", "payloadDigest": "sha256:3d9f…" },
    { "kind": "facts", "verdict": "pass",
      "checker": { "principal": "svc:review-surface", "authority": "session:expenses-web" },
      "at": "2030-01-15T10:03:44.612Z", "payloadDigest": "sha256:71aa…" }
  ],
  "transitions": [
    { "recordId": "rec_7f3a…", "seq": 1, "at": "2030-01-15T09:58:00.000Z", "kind": "opened",
      "payload": { "profileId": "example.expense-report.v1", "profileDigest": "sha256:0b7d…",
                   "legId": "approver-decide", "subjectRef": "expense:e-4711",
                   "contentDigest": "sha256:9c1e…" },
      "prevHash": "sha256:ff6a…" },
    { "recordId": "rec_7f3a…", "seq": 2, "at": "2030-01-15T10:03:44.612Z",
      "kind": "consultation-recorded",
      "payload": { "kind": "chain-verify", "verdict": "pass", "payloadDigest": "sha256:3d9f…",
                   "checker": { "principal": "system:chain-verify", "authority": "system:vidimera-record" },
                   "at": "2030-01-15T10:03:44.612Z" },
      "prevHash": "sha256:3d9f…" },
    { "recordId": "rec_7f3a…", "seq": 3, "at": "2030-01-15T10:03:44.612Z",
      "kind": "consultation-recorded",
      "payload": { "kind": "facts", "verdict": "pass", "payloadDigest": "sha256:71aa…",
                   "checker": { "principal": "svc:review-surface", "authority": "session:expenses-web" },
                   "at": "2030-01-15T10:03:44.612Z" },
      "prevHash": "sha256:5c40…" },
    { "recordId": "rec_7f3a…", "seq": 4, "at": "2030-01-15T10:03:44.612Z", "kind": "confirmed",
      "payload": { "actor": { "principal": "pseud:a81f", "authority": "oidc:https://login.example.com" } },
      "prevHash": "sha256:82ce…" }
  ],
  "state": "confirmed"
}
```

Two encoding notes on the JSON above. `seq` is shown as the integer it is in the transition
and in storage; the digest input stringifies it (§4). The timestamps carry the millisecond
precision §4 requires — the example is a record, not a rounding.

The `chain-verify` consultation at seq 2 is not host-supplied: `finalize` appends it itself,
as the first of its confirming appends, recording the mandatory pre-seam chain-verify (§5) — a
clean replay of the chain, stamped `pass` under the library's own `system:chain-verify`
checker with the verified chain head as its `payloadDigest`. The `chain-verify` and `facts`
consultations and the `confirmed` edge (seq 2–4) all carry the same finalize-time `at`:
finalize appends them as one atomic batch (§12) — a batch that also carries any host-supplied
required or voluntary consultations, recorded in input order between `facts` and `confirmed`
(§11.1) — and the library stamps each consultation's `at` at the recording seam, not at the
moment the underlying check was observed (§11.1). An effect-seam profile adds
`redeeming`/`redeemed` transitions after `confirmed` (§11.2); a multi-leg profile adds
`priorRecordRefs`/`priorLegActors` and a prior leg's chain (§10.1); a findings-flow profile
adds `finding-raised`/`acknowledged` transitions between `opened` and the decision (§10.2).

## 3. Content binding **[PROVEN]**

The digest binds a decision to content: `contentDigest = digest(canonical(content))` (§7).
Canonicalization has two layers with a firm ownership split:

- **Domain canonicalization is adopter-supplied.** Field selection, ordering, and
  normalization are domain facts a library cannot know. The adopter's canonicalizer maps
  domain content to a stable structure; it **MUST** be declared precisely enough to
  re-implement independently, and the adopter **SHOULD** publish a fixture suite pinning its
  output. The library ships this as a **hook**, not a domain canonicalizer.
- **Serialization is library-owned.** The final serialization step for JSON-shaped canonical
  content is RFC 8785 (JSON Canonicalization Scheme), shipped by the library so two
  implementations agree byte-for-byte on the same canonical structure.

**Fidelity, not validity.** The digest binds content *faithfully*, including content that is
wrong, hallucinated, or maliciously drafted. A confirmed record proves that this exact content
was reviewed and decided — never that it is correct. The human decision is the load-bearing
control; the upstream threats that produce a bad draft are not ones this binding can close
(§13A).

**Content is digested, never persisted.** Content crosses the library's seams as call
arguments only: `stage()` and `finalize()` receive it, the library canonicalizes and digests
it in-process, and the record stores the **digest alone**. The library never writes domain
content to the chain or the store. It exports its `canonicalize()` and `digest()` helpers so a
host can recompute the digest from content it holds — for example to render a review surface
from canonical content and confirm it matches the bound digest.

**Host content retention (evidential completeness).** Because the record stores the digest
alone, what a replayed record proves *without more* is that content with this digest was
reviewed and decided by this principal — showing **what** was decided requires the content
body, and that custody is the host's. A host that wants its records to answer "what exactly
was confirmed?" for the record's evidential lifetime **SHOULD** retain the canonical content
(or the means to re-derive it byte-identically) for as long as it retains the record, and
render review surfaces from that retained source; a host that chooses not to accepts
digest-only evidence. Retention duty and its interplay with lawful erasure stay host law
(§13).

**Reviewed-surface (`facts`) binding.** The decision binds *what the reviewer actually saw* —
the amount, the payee, the figures the review surface consumed — digested and attached to the
leg as a `facts` consultation. This is the "exact content reviewed" control (WYSIWYS /
dynamic-linking in the payment-services sense), and it is part of the base model, present in
every deployment. It is enforced by default at finalize (§9): a finalize with no fresh
reviewed-surface digest refuses `consultation-missing` (§8).

## 4. Transitions & the encoding **[PROVEN]**

Every state-bearing change appends a **transition**:

| Field | Type | Meaning |
|---|---|---|
| `recordId` | string | Owning record |
| `seq` | integer | 1-based, increments by exactly 1 per record |
| `at` | timestamp | RFC 3339 UTC, millisecond precision (see the digest input below) |
| `kind` | enum | see the payload table |
| `payload` | per-kind structure | below |
| `prevHash` | digest | the preceding transition's `transitionDigest`; genesis per the rule below |

`transitionDigest` is computed over the **library-owned** canonical transition encoding — the
JCS serialization of `{recordId, seq, at, kind, payload, prevHash}` with all digest fields in
their string forms — using the record's recorded algorithm (§7). It is **not** the adopter's
content canonicalizer (§3): because the transition encoding is library-owned, two
implementations verify each other's chains.

**The digest input, stated exactly.** Two conventions of that encoding are not implied by the
field table above, and both are stated here because cross-implementation verification is what
they buy:

- **`seq` is serialized as a string.** It is the envelope's one non-string field, and the
  encoding stringifies it — `1` is fed to JCS as `"1"`. The reason is the claim just made: the
  envelope must not depend on ECMAScript-specific number formatting, so no envelope field ever
  reaches JCS's number rules; only `payload` can, and only where an adopter's own content
  carries numbers. `seq` stays an integer in the transition and in storage (§12's C2) — the
  stringification belongs to the digest input alone.
- **Every timestamp the library stamps carries millisecond precision** — the table's RFC 3339
  UTC form (an ISO-8601 profile), with exactly three fractional-second digits and a `Z` suffix
  (`2030-01-15T10:03:44.612Z`). This covers the envelope's `at`, a recorded Consultation's `at`
  (§11.1), and an `expired`, `redemption-failed` or `redeeming` payload's `bound`. The digest
  is over bytes: the same instant written at a coarser precision is a different digest.

Both are the library's own behaviour, stated descriptively per §1, and both buy exactly
*verification* — a second implementation can recompute the digests of any chain it is handed.
Neither makes a chain *reproducible* from the same inputs: how many times a seam reads the
clock, and which appends share one reading, is implementation detail (§2.1's finalize batch
shares one) and is deliberately left unstated.

**Genesis.** `seq` starts at 1. The genesis transition's `prevHash` is the digest, under the
record's recorded algorithm, of the UTF-8 bytes of `vidimera:genesis:<recordId>`.

**Per-`kind` payloads.** Payloads are deltas against the state implied by the preceding chain,
except `opened`, which snapshots the record's immutable header.

| `kind` | Payload | Form |
|---|---|---|
| `opened` | `{ profileId, profileDigest, legId, subjectRef, contentDigest, policyDigest?, priorRecordRefs?, priorLegActors?, supersedes? }` (`supersedes?` **[PROVEN]**, §2) | snapshot |
| `consultation-recorded` | the Consultation object (§2), including the always-present `facts` binding | delta |
| `confirmed` | `{ actor }` — the deciding IdentityAssertion (§6) | delta |
| `refused` | `{ code }` — a §8 registry code; class derivable from the registry | delta |
| `declined` | `{ actor }` — the deciding IdentityAssertion (§6); the recorded human decline (§9) **[DESIGNED]** | delta |
| `expired` | `{ bound }` — the elapsed deadline timestamp; the transitioned-from state, not the payload, distinguishes the `expiry` clause from `confirmToRedeem` | delta |
| `sealed` | `{ chainHead }` — end-of-life metadata (§5) | delta |
| `finding-raised` / `acknowledged` | the Finding / Ack object (profile-conditional, §10.2) **[PROVEN]** | delta |
| `redeeming` | `{ tokenDigest, bound? }` — digest of the single-use redemption token (the raw token is never persisted, §11.2); `bound` present only when declared (effect-seam profiles only) | delta |
| `redeemed` | `{ via: 'direct' }` or `{ via: 'token', tokenDigest }` — the completed redemption and how it was closed (effect-seam profiles only, §11.2) | delta |
| `redemption-failed` | `{ bound }` — the elapsed redemption bound; folds `refusalCode: redemption-timeout` on replay (effect-seam profiles only, §11.2) | delta |

**`profileDigest`.** The `opened` snapshot carries `profileDigest`, a digest over a
**data-only projection of the profile** — its configured fields, excluding any host code
references — so the record notarizes the shape of the flow it was decided under; drift in the
governing profile is detectable on replay.

**`policyDigest` (policy-declaring profiles only).** On a profile that declares `policySource`
(§10.3), the `opened` snapshot carries `policyDigest` — the policy version the decision is
bound to, attested by the trusted operator at `open()`, **present-iff-declared** (key-absent
otherwise, so a non-declaring profile's genesis payload is byte-identical to a pre-policy
record). Finalize compares it against the live source (§10.3).

**`priorRecordRefs` / `priorLegActors` (multi-leg successors only).** On a multi-leg successor
leg the `opened` snapshot also carries these two — present together or not at all; a first leg
and every single-leg record omit both. Each `priorRecordRefs` element is the **recorded
three-field form** `{ recordId, chainHead, legId }`: the host supplies a two-field
`{ recordId, chainHead }` to `open()`, and the library adds the `legId` it verified against
the profile's leg order while replaying the reference (§10.1), so a finalize-time
separation-of-duties lookup keys the record's own evidence by leg identity rather than a
live-profile position. `priorLegActors[i]` is the actor the library read from prior leg `i`'s
replayed `confirmed` payload — library-derived, never host-supplied — paired by index with
`priorRecordRefs`.

**Byte-stability (the general invariant).** Every profile-conditional key is
**present-iff-declared**, so a profile declaring no features produces chains **byte-identical
to the minimal model** — the general rule the per-field statements above instantiate (§10.2
states the findings-flow instance).

**Clock-driven edges are appended en passant.** The library ships **no scheduler and no public
`expire()`**. The clock-driven edges — `open → expired`, `confirmed → expired`
(confirm-to-redeem bound exceeded), and `redeeming → redemption-failed` (redemption bound
exceeded, outcome unknown, fail-closed) — are appended lazily at the next operator-side
mutating seam that observes the bound has passed. Named exceptions to this
expire-at-every-mutating-seam rule: `seal()` never appends a clock edge en passant — a record
whose bound has elapsed refuses `unsealable-state`, and the operator sweeps first, then seals
(§5); `redeem()` does not treat a due-`open` record as expired — it refuses
`unredeemable-state` without writing an edge (a due-`confirmed` or due-`redeeming` record it
does resolve en passant, §11.2); and `open()`'s exclusivity check never auto-resolves a
`redeeming` blocker, due or not — it refuses `record-exists`, leaving that edge to the
redemption seam's own clock (§9.1, §11.2).

## 5. Chaining & replay/verify **[PROVEN]**

The chain records **committed** history. A transition written inside a host transaction that
aborts was never appended; append-only refers to durable, committed transitions. `prevHash`
links each transition to the previous one's `transitionDigest`, back to genesis (§4).

**Operator audit functions.** The library exposes two functions over a record's chain, for the
operator's own audit path:

- `replay(chain)` — reconstructs record state by folding the transitions from genesis, so
  decision state is always re-derivable from durable storage alone.
- `verifyChain(chain)` — recomputes every `transitionDigest` and `prevHash` link and reports
  the first break. Deletion or reordering of committed transitions **within a surviving
  chain** is detected here; the absence of a whole record is not (§13A).

These are library functions **over** the chain, not `Store` methods (§12) — they run on
whatever the store returns. They are exposed on the operator handle (§9), each taking a
`recordId` and running over the chain the store returns for that record.

**Honesty about hash chains.** `verifyChain` detects **non-recomputing** tampering only, and
only of a transition that is **not** the current chain head. Each transition's integrity is
pinned by the *next* link's `prevHash`, never its own, so a non-recomputing edit of any
non-head transition is caught on replay (at the following link), but the **head** transition's
payload — and a **sole genesis**'s, which is both first and last — is protected only once a
later transition chains over it; until then editing the head is indistinguishable from that
transition never having existed in that form. Separately, an adversary with unrestricted
storage-write access can delete a transition and recompute every subsequent hash, and replay
then verifies clean. Both are the base-level (AL1) limit, stated plainly; detached signing
(§14) is the upgrade that makes recomputation and head-edits detectable without trusting
storage.

**Mandatory pre-seam chain-verify.** Every operator-side mutating seam verifies the chain
before acting — the acted-on record's own chain. The one en-passant append to a **different**
record's chain — `open()`'s exclusivity path expiring a due-`open` blocker (§4) — runs
without a pre-verify of the blocker's chain, so that edge is only as trustworthy as the chain
it extends, and a compromise there is caught at the blocker's own next verifying seam
(`seal()`, a recovering `open()`'s verify-by-replay) or its audit functions, not at the
expiring append. `finalize` (§9) replays from genesis, and on a clean replay records the
verification as a `chain-verify` consultation (`verdict: pass`, under the library's own system
checker) — the first of its confirming appends. On a **detected break** it does not confirm:
it refuses `chain-compromise` (class `compromise`, terminal) and appends a single `refused`
edge at the current head via the ordinary sequencing rules — no separate `verdict: fail`
consultation, the failed verification folding into that one edge. This edge is **AL1-honest**:
because it chains cleanly onto the tampered head it is only as trustworthy as the chain it
extends, and `verifyChain` still reports only the original break — detached signing (§14) is
the upgrade that makes the compromise-refusal independently trustworthy. The edge is admitted
where the current state allows a state-leaving append — `open → refused` and
`redeeming → refused` directly (both are non-terminal states), and `confirmed → refused`
through §12's compromise carve-out where that `confirmed` is terminal (§2), directly
otherwise; against a record already at a terminal `expired` or `refused` state —
or a `sealed` (retired) record, whose chain admits no further append — no edge is admitted,
and the compromise is surfaced result-first with no transition reference.

**Chain retirement (`sealed` / `retired`).** For lawful end-of-life (§13), a record that has
reached a terminal state may be sealed: `seal()` (§12) verifies the full chain, then appends a
state-preserving `sealed` transition carrying the chain head, after which the record body may
be archived or destroyed as a unit under the host's retention schedule. Verification is first:
a record whose chain fails verification refuses `chain-compromise` and can never be sealed —
so a compromised record never reaches `retired`, and its lawful disposal is a host-side act
outside the library (§13). A sealed record reports its per-record status as `retired` (its
`sealed` chain head standing in for replayable body evidence) rather than `active`, and the
seal edge is chain-final — no further transition of any kind extends a sealed chain (§12's
C4). This is AL1-honest like every other append: the seal attests a clean replay at seal time,
only as trustworthy as the chain it caps; detached signing (§14) is the upgrade that makes an
end-of-life attestation independently verifiable.

## 6. Identity **[PROVEN]**

An actor is an **IdentityAssertion** `{ principal, authority, proofRef? }`, never a bare
string. `authority` names the mechanism that vouched for the principal at decision time.
Authority identifiers are host-declared; RECOMMENDED forms are `oidc:<issuer>`,
`session:<application>`, `mtls:<service>`, and `dev-stub`. The library names no vendors.

**Identity by transport (preserved principle).** Identity is established by the **session or
transport** that carries the decision to `finalize()`, never trusted because it rides in the
decision payload. The host **MUST** establish the finalizing principal from transport or
session context and pass it as the finalize identity; the library authenticates no one — it
makes the authentication posture of every decision visible.

Two refusal branches, both fail-closed:

1. **Payload-carried identity.** An identity supplied inside the decision payload with no
   transport or session binding cannot finalize; the library refuses with
   `identity-authority-refused`. It may instead be *recorded* under an explicitly low-trust
   authority, but never silently promoted.
2. **Authority not allowed for the leg.** A recorded authority that is not in the leg's
   `allowedAuthorities` — including a low-trust `dev-stub` authority where the leg does not
   admit it — cannot finalize; the library refuses with `identity-authority-refused`.

`principal` SHOULD be a stable pseudonymous reference resolvable through an identity map held
outside the chain (§13) — this is what makes lawful erasure compatible with chain
verification.

## 7. Digest identifiers & agility **[PROVEN]**

Every digest field is a string `<algorithm>:<lowercase-hex>`, e.g. `sha256:ab12…`. The
algorithm for new records is `sha256` — the library's own behaviour, stated descriptively
per §1. A record is verified under its **own recorded**
algorithm, and the library surfaces a **deprecation warning** for records verified under an
algorithm the current revision deprecates. This algorithm agility is what lets a future hash
migration proceed without invalidating existing history.

## 8. Refusal codes

Every refusal is fail-closed and carries a stable, machine-readable code surfaced losslessly
across process boundaries. Each outcome is classed:

- **`refusal`** — the attempt fails on its inputs; the record stays `open` unless the
  profile's per-leg `terminalRefusals` (§9.1) marks the code terminal for the leg. Retrying
  with corrected inputs is legitimate.
- **`availability`** — an external authority was unreachable. The host retries within a
  bounded budget; availability is **never** converted into approval (never fail-open). On
  budget exhaustion the attempt fails and the seam re-arms for a fresh attempt. The single
  code in this class is likewise named `availability` and is profile-conditional: the
  required-consultation gate (§11.1) emits it for an unreachable *required* kind, and the
  policy gate (§10.3) for an unreachable policy source. It is carried by the `unavailable`
  outcome status, **never** a `refused` edge — so it never appends and is never marked
  terminal by a leg's `terminalRefusals`.
- **`compromise`** — evidence of tampering (a chain break, a digest mismatch). The record
  refuses terminally with a `compromise`-classed code.

**Core registry** (present in every deployment) **[PROVEN]**:

| Code | Meaning |
|---|---|
| `content-drift` | bound content changed between render and finalize (§3, §9); the [PROVEN] live mode also raises it at redemption-time `reverify` (§9.2), whose seam semantics are decided on record (`OPEN-QUESTIONS.md` §7) |
| `identity-authority-refused` | payload-carried identity, or an authority not allowed for the leg (§6) |
| `record-exists` | a non-terminal record already exists for this `(profile, subject)` (§9); never appends |
| `leg-expired` | a decision-progress seam (finalize; the findings seams, §10.2) attempted against an `expired` or due-expired record |
| `record-not-open` | a decision-progress seam invoked against a non-open, non-expired record (§9); never appends — an expired record at those seams draws `leg-expired` instead |
| `consultation-missing` | no fresh reviewed-surface (`facts`) evidence at finalize, or a profile-required consultation kind absent from the finalize inputs (§3, §9, §11.1) |
| `chain-compromise` (class `compromise`) | chain verification failed (§5) |
| `unknown-profile` / `unknown-leg` | unknown identifiers fail closed and never append; `unknown-leg` has two producers — a caller-named leg absent from the profile at `stage()`, and a staged draft's leg absent from the profile it resolves under at `open()` |
| `unredeemable-state` | `redeem()` where no redeemable seam or state applies — the domain outcome on a pure-capture profile for an intact-chain, known-profile, valid-leg call; on an effect-seam profile, a `redeem()` against a non-final leg's record in any state, or on the final leg against an `open`, `refused`, or `expired` record; never appends (§11.2) |
| `unsealable-state` | `seal()` against a record that is not derived-terminal or is already sealed; also a racing-seal residual conflict; never appends (§5, §13) |

`consultation-missing` is in the core registry because the reviewed-surface (`facts`) binding
is enforced by default (§3, §9); the broader required-consultation gating that also raises it
is profile-conditional (§11.1). `unredeemable-state` and `unsealable-state` are core because
`redeem()` and `seal()` are calls on every profile, with fail-closed domain outcomes in every
deployment.

**Caller errors are not refusals.** The registry names *domain* outcomes the library reached
and, on a terminal-marked leg, recorded. A call that names something non-existent is instead a
**caller error that throws and records nothing**: `open()` on an unknown staged reference, and
any operator call on a non-existent `recordId`, throw rather than refuse. The same
**loud-throw** posture covers corrupted or foreign persisted config read back at a seam:
operator seams throw **uniformly** when a record's persisted `legId` is absent from the
profile it resolves under — a garbled or foreign chain is a storage/config fault, not a domain
outcome, and a fail-open clamp onto leg 0 would silently mis-decide it. (An unknown *profile*
is the exception — it is a fail-closed `unknown-profile` refusal.)

**Profile-conditional codes** are present only when their feature is switched on, and are
defined with their sections:

| Code | Feature | Maturity |
|---|---|---|
| `sod-violation` | multi-leg separation of duties (§10.1); `refusal`-class, `terminalRefusals`-able | [PROVEN] |
| `prior-leg-unverified` | multi-leg (§10.1); a pre-record `open()`-seam sequencing refusal that never appends | [PROVEN] |
| `ack-missing` / `ack-stale` | findings flow (§10.2); `refusal`-class, `terminalRefusals`-able, open-by-default | [PROVEN] |
| `policy-drift` | policy notarization (§10.3); `refusal`-class, `terminalRefusals`-able — a policy-declaring profile SHOULD list it (disposal-and-re-open recovery) | [PROVEN] |
| `ineligible` | eligibility gating (§10.4); `refusal`-class, open-by-default so a different eligible actor may decide | [PROVEN] |
| `consultation-failed` | required consultations (§11.1); `refusal`-class, open-by-default for re-run | [PROVEN] |
| `availability` | §11.1 + §10.3; the availability class's single code, never appends | [PROVEN] |
| `consultation-stale` | consultation freshness (§11.1); can only fire with authority timestamps | [PROVEN] |
| `effect-mismatch` / `already-redeemed` / `redemption-timeout` | redemption (§11.2); never append | [PROVEN] |

**Append semantics.** Whether a `refusal`-classed outcome appends a `refused` transition is a
single derivation (the **`appendsOn`** rule): `compromise` appends wherever the current state
admits a state-leaving append (§5) — against already-terminal `expired`/`refused` or sealed
records it is surfaced result-first with no edge; a fixed **never-appends** set — the
pre-record, terminal-record, and redemption/seal codes (`record-exists`, `record-not-open`,
`unknown-profile`, `unknown-leg`, `unredeemable-state`, `unsealable-state`, `effect-mismatch`,
`already-redeemed`, `redemption-timeout`, `prior-leg-unverified`) — never appends; every other
`refusal`-class code appends `open → refused` **iff** the leg's `terminalRefusals` lists it —
otherwise the record stays `open` for retry. Two codes are legal `terminalRefusals` members
but inert: `leg-expired` (resolved at the state/expiry gate, ahead of the
`terminalRefusals`-consulting path) and `availability` (never a `refused` edge). Named so an
adopter isn't trapped configuring a control that can never fire.

**Stability.** Codes are never reused with changed meaning, and the registry is amended only
by a revision of this document. Host extensions are prefixed `x-`.

## 9. Staging → opening → review → finalize (the API surface) **[PROVEN]**

The seams are the library's public API. A decision flows through **four calls, split across
two surfaces**: `stage()` is **agent-reachable**; `open()`, `review()`, and `finalize()` are
**operator-only** (as are `seal()`, `redeem()`, the findings seams of §10.2 **[PROVEN]**,
and the sweep — §12).

- **`stage(content, profileId, subjectRef, legId?)`** — **agent-reachable.** Binds an inert
  agent draft by its `contentDigest` (§3) and holds it for review. `legId` is optional:
  omitted, it names the profile's **first** leg; named, it must resolve against the profile's
  legs — a named leg absent from the profile refuses `unknown-leg` (§8). Staging happens
  **before any record exists**: a staged draft is not a record and can transition nothing, but
  it does bind the named-or-first leg it will open under. This is what keeps the agent surface
  honest without an asterisk.
- **`open(stagedRef, { priorRecordRefs?, policyDigest?, supersedes? })`** — **operator-only.**
  Creates the record from the staged binding and appends the `opened` transition (§4). A
  **successor** leg supplies `priorRecordRefs`, one entry per prior leg in order, each
  verified by replay (§10.1); a **first** leg supplies none. A recovery record supplies
  `supersedes` — the verified terminal-predecessor reference (**[PROVEN]**, §2). A policy-declaring profile (§10.3) binds
  `policyDigest` here — operator-only, fail-closed and loud both directions
  (declaring-without and non-declaring-with both throw). It enforces **exclusivity**: if a
  non-terminal record already exists for the `(profile, subject)`, `open` refuses
  `record-exists` rather than opening a second one (§12).
- **`review(recordId)`** — **operator-only.** Returns the record's audit metadata and content
  **digest** (a `ReviewView`) — never the content body; rendering the content stays the
  host's, recomputed from content it holds (§3). It is a pure read; it changes no state. On a
  findings-flow profile the view includes the digest-only findings projection with per-finding
  coverage (§10.2) **[PROVEN]**.
- **`finalize(recordId, identity, content, facts, opts?)`** — **operator-only.** Transitions
  an already opened record `open → confirmed` under a **transport-established identity** (§6).
  Content binding is re-checked here: finalize re-canonicalizes and re-digests the supplied
  `content` (§3) and compares the result against the record's bound `contentDigest`; on any
  mismatch it refuses `content-drift` rather than confirming stale content. It also enforces,
  by default, that a fresh reviewed-surface (`facts`) digest is present, refusing
  `consultation-missing` when it is not. The optional trailing `opts.consultations` carries
  the host's obtained consultations and unreachability markers, over which the profile's
  required-consultation gating runs (§11.1). On a policy-declaring profile a second
  `opts.policy` field — the current live-source digest, or an `{ unreachable, authority }`
  marker — drives the policy-drift gate (§10.3); a non-declaring profile must not supply
  `opts.policy`, which throws.
- **`decline(recordId, identity, content, facts, opts?)` [DESIGNED]** — the operator-only
  `open → declined` seam: the recorded human "no", with the same evidentiary treatment as
  confirm. It runs finalize's ladder with the evidence rungs absent — chain-verify,
  state/expiry, identity + `allowedAuthorities`, separation of duties, content-drift, the
  reviewed-surface (`facts`) binding, and eligibility (including its AL2 freshness bound)
  all gate; `requiredConsultations`, evidence-kind freshness, and ack coverage (§10.2) do
  not — a "no" is never blockable by a missing or dead evidence source. It takes no policy
  input and rung (4.5) does not run: the policy gate exists to prevent approving under
  stale rules; a decline disposes the record either way, and the bound `policyDigest`
  stays on the record as the context the decline was made under. The success batch is
  `[chain-verify, facts, …obtained consultations, declined]` — one atomic append; reasons
  ride as ordinary consultations (§11.1's attach form; e.g. a host `decline-reason` kind),
  never as payload fields. Declared per leg (`decline: true`, §9.1); calling the seam on a
  non-declaring leg throws (the §10.2 seams' posture), so non-declaring chains stay
  byte-identical. A declined record proves the named actor declined this exact content
  having seen this surface — never that the decline was justified (fidelity, not
  validity). Every refusal reuses an existing §8 code through the `terminalRefusals` rule;
  the registry does not grow.

**The finalize gate ladder.** Finalize's check order is fixed, and every refusal path wins
over the ones after it: **(1)** pre-seam chain-verify → **(2)** state/expiry (en-passant
expire if due) → **(3)** identity → **(3.5)** separation of duties → **(4)** content-drift →
**(4.5)** policy-drift → **(5)** facts → **(5.5)** consultations/eligibility → **(5.7)** ack
coverage **[PROVEN]** → **(6)** the success batch: one atomic, variable-arity
`appendBatch([chain-verify, facts, …obtained consultations, confirmed])` — all-or-nothing, so
a conflict never leaves a partial tail. Two validation *throws* sit deliberately ahead of the
ladder, at different depths. Consultation shape throws at **argument intake**, before
anything is loaded — that caller bug throws identically regardless of record state, ahead of
every outcome including `chain-compromise`. The policy declared-iff-present throw fires at
**profile resolution**, which follows the chain load and its verification — so against a
tampered chain the call refuses `chain-compromise`, and against an unconfigured profile
`unknown-profile`, before the policy throw can fire (§10.3). "First" in the ladder above
orders only the refusal ladder itself.

**The human anchor (preserved principle).** No agent-reachable surface transitions records,
holds a leg, or executes effects. The agent-reachable surface is **reads and staging only**;
everything that transitions a record is operator-only, and because staging happens pre-record
this holds without exception — a chat or voice "yes" arriving as payload can never open a
record or finalize one (§6). The restriction is **in-process object-capability discipline,
not a sandbox**: it holds against an agent that can reach only the agent handle. The host
**MUST** compose the handles so the agent receives only the agent surface — a host that hands
its agent the operator handle, the `Store`, or the construction config has stepped outside
the split. Feature options (policy binding, prior-leg references) grow only the
**operator-only** options bags; the agent-reachable `stage()` surface does not grow with
features. Automated reviewers attach evidence as Consultations; they never decide (§2,
§11.1).

**Exclusivity.** At most one record per `(profile, subject)` is non-terminal at a time; a
second `open` refuses `record-exists`. This closes concurrent double-decide, and is enforced
in the store's constraints, not by an advisory pre-check (§12).

### 9.1 The ConfirmProfile **[PROVEN]**

The adopter-authored configuration that gives a flow its shape. Its declared fields both
parameterize the base model and **switch on the optional features** (§10, §11) —
feature-conditionality is expressed here, through the schema, and marked at each section with
a one-line applicability note, not through a separate tier system.

| Field | Meaning |
|---|---|
| `id` | Versioned identifier, RECOMMENDED `<domain>.<subject>.v<n>` |
| `subject.canonicalizerRef` | Names the adopter's content canonicalizer and its fixture suite (§3) |
| `legs` | Ordered list of legs; more than one switches on separation of duties (§10.1) |
| `captureMode` | `staged` or `live` (§9.2) |
| `expiry` | `{ ttl }` (`ttl` in **seconds**) bounding the `open` state, or `none` — a policy choice, never a truth |
| `requiredConsultations` | Per-leg consultation kinds that must be present and passing at finalize (§11.1) |
| `freshness` | Per-leg max consultation ages (§11.1). **[PROVEN]** — meaningful only with AL2 authority timestamps (§14); at AL1 the staleness gate cannot fire |
| `policySource` | Per-profile opaque label naming the operator's policy authority; declaring it binds a `policyDigest` at `open()` and gates finalize on drift (`policy-drift`). Never fetched or evaluated by the library (§10.3) |
| `redeem` | Effect-seam configuration: the redemption bounds (`confirmToRedeem`, `redeemBound`). Its presence declares an **effect seam** (§11.2) |
| `sod.notActorOf`, `proposer` | Per-leg separation-of-duties controls (§10.1) |
| `ackMode`, `requiredAcks` | Per-leg findings-flow controls (§10.2) **[PROVEN]** — declared both-or-neither |
| `eligibility` | Per-leg opaque authority-to-decide reference; declaring it makes an implicit-first required `eligibility` consultation whose `fail` verdict gates finalize (`ineligible`) (§10.4) |
| `decline` | Per-leg literal `true` switching on §9's `decline` seam **[DESIGNED]**; declaring anything other than the literal `true` is a construction error (the `signing` rule's class) |
| `allowedAuthorities` | Per-leg identity authorities that may vouch for a leg's actor (§6) |
| `terminalRefusals` | Per-leg list of refusal codes the profile marks **terminal** for that leg — a matching `refusal`-classed code (§8) ends the leg instead of leaving the record `open` for retry |

**Construction is loud.** Config validation happens at construction, and a profile the build
cannot honor **throws** — a feature field for an unimplemented capability fails fast with an
explicit "feature not available in this build" error rather than silently degrading. Reserved
consultation kinds (`facts`, `chain-verify`) in `requiredConsultations`, double-declared
eligibility, and inert or contradictory feature combinations are construction errors.

**The effect-seam predicate.** `profile-declares-effect-seam` := *the profile enables
redemption* (a `redeem` configuration is present, or `captureMode: live`). This single
predicate is what the final-leg terminality derivation (§2) and the store's non-terminal
constraint (§12) read.

**Redemption bounds.** Both bounds in the `redeem` block are optional policy choices, never
truths: `confirmToRedeem` bounds the `confirmed`-awaiting-redemption window (after which
`confirmed → expired`), and `redeemBound` bounds the `redeeming`-token window (after which
`redeeming → redemption-failed`). A separated-store host **SHOULD** declare `redeemBound`:
without it, a lost redemption token strands the record — and the `(profile, subject)`
exclusivity it holds — indefinitely, since no clock resolves a `redeeming` record and `open()`
never auto-resolves one.

### 9.2 Capture modes

- **`staged` (the base mode) [PROVEN].** The digest covers a staged proposal that is inert
  until decided — the north-star shape: an agent drafts, the draft is bound, a human confirms.
  A capture-only host runs entirely in this mode.
- **`live` [PROVEN].** The digest covers a fresh read of live state (decide-what-exists).
  Live capture binds at *decision time* and provides no pre-decision immutability: it does not
  prevent the subject changing during review; it catches the change at the decision. A live
  profile requires a decide-time re-derivation from an **independent access path**, and that
  independent path is the **host's** obligation — the host **MUST** supply a re-derivation
  distinct from the path that produced the reviewed rendering. The obligation is gated, not
  merely stated: the re-derivation is declared as a `requiredConsultations` kind under §11.1,
  so a live host that skips or fails it fails closed at finalize instead of silently
  finalizing. A live profile either declares `confirmToRedeem` as a maximum age (after which
  `confirmed → expired`) or declares `reverify`, in which case redemption re-verifies
  `contentDigest` against a fresh read and refuses drift with `content-drift` (registered as
  that code's second producer, §8; the seam's append semantics are among this mode's open
  decisions, `OPEN-QUESTIONS.md`).

## 10. Feature-conditional decision controls

The controls in this section are **feature-conditional**: each applies only when the
ConfirmProfile declares it (§9.1). A host that declares none runs the base model alone.

### 10.1 Maker-checker / separation of duties **[PROVEN]**

*Applies when the profile declares more than one leg.* Legs conclude in order: leg N opens
only after legs 1..N−1 have each concluded `confirmed`, and `open()` enforces the sequencing
before it creates the successor record. A successor leg's `open()` call carries
`priorRecordRefs` binding the prior legs' records — each a `{ recordId, chainHead }` the host
supplies — and the library **verifies every reference by replaying the referenced chain**: the
chain must verify intact, its recomputed head must equal the supplied `chainHead`, and the
replayed record must share the successor's `profileId` and `subjectRef`, sit at the expected
leg in order, and be `confirmed`. On any failure the library refuses `prior-leg-unverified`
and **no record is created** — a never-append, pre-record refusal. A first leg carries no
references; supplying any is itself a sequencing error that refuses `prior-leg-unverified`. On
success the record's `opened` snapshot carries the verified references in their recorded
three-field form `{ recordId, chainHead, legId }` (§4) and `priorLegActors`, the prior legs'
actors **derived by the library from the replayed `confirmed` payloads** — never
host-supplied. The reference, not the copy, is the evidence.

**AL1 window on the SoD evidence.** The `priorLegActors` a successor's `open()` derives live
in that successor's genesis (`opened`) payload — which **is** the chain head from `open()`
until the successor's own final-leg finalize chains a transition over it. Over exactly that
window the head-bound of §0/§5 applies: a storage-writing insider could alter the recorded
prior-leg actors before the deciding confirm without replay catching it — and the SoD gate
reads that evidence at exactly that moment of use. Detached signing (AL2, §14) is the named
upgrade that closes this (a signed genesis fails verification when its payload is edited, head
or not).

A leg declaring `sod.notActorOf` refuses `sod-violation` when the finalizing principal is the
recorded actor of any named prior leg; the lookup keys the record's own recorded references by
their `legId`, so a later profile edit that reorders or renames legs cannot silently re-index
an already-opened record's evidence. A leg declaring a `proposer` refuses `sod-violation` when
the finalizing principal equals that proposer: **the designated proposer may not decide their
own leg.** Both SoD rules gate `decline` (§9) identically — deciding includes declining; a
proposer therefore cannot withdraw their own draft through this seam. **[DESIGNED]** Both
controls raise the single `sod-violation` code and are `refusal`-class — a
leg's `terminalRefusals` may mark it terminal, but by default the record stays `open` so a
**different** approver may decide it.

**Comparison is by principal alone, deliberately.** The same principal string presented under
a different `authority` still refuses — the fail-closed direction. Pair-equality (principal
*and* authority) would let one human re-authenticate under a second authority and pass; the
residual same-human-different-principal case is the AL1 limit named below.

**Cross-leg content binding is not verified.** A successor leg's `contentDigest` binds its own
content; the library never compares it to a prior leg's. Legs may legitimately decide enriched
or different content — a checker approving an annotated draft — so both digests are chained
and auditable, and a host that requires the legs to decide identical content enforces that in
its own staging.

**A sealed prior still verifies; a destroyed one does not.** A prior leg that has been sealed
(§5) still replays `confirmed` and is a valid reference while its chain exists. Once the host
destroys that chain under its retention schedule (§13), the reference can no longer be
replayed and any not-yet-opened successor leg becomes unopenable (`prior-leg-unverified`); a
successor already opened is unaffected, its evidence being the snapshot in its own chain.
Both halves are the accepted posture.

A **retried** decision by the same actor on the *same* leg is not self-approval and is not
refused on separation-of-duties grounds (`sod.notActorOf` names only prior legs). Because the
evidence is in-record and chained, this survives host restarts and store restore. Separation
of duties evidences **distinct principals, not independent judgment** — two colluding humans
satisfy it, and collusion and coercion are out of scope (§13A).

### 10.2 Findings & acknowledgments **[PROVEN]**

*Applies when the profile declares a findings flow — a leg declaring the `ackMode` +
`requiredAcks` pair (both-or-neither; either alone is a construction error).* Findings raised
during review are part of the record, each carrying a `findingDigest` over its content. An
acknowledgment covers a finding only while the finding's current `findingDigest` matches the
ack's — changed content requires re-acknowledgment (`ack-stale`); missing coverage of a
`requiredAcks` kind refuses finalize (`ack-missing`). `ackMode` declares who may acknowledge,
**relative to the finding's raiser**: `self` (the raiser may acknowledge their own finding),
`counterparty` (a different principal than the raiser must acknowledge), or `any`.

**The seams (record-then-gate).** Two operator-only calls append mid-lifecycle transitions —
the only appends between `opened` and the decision:

- `raiseFinding(recordId, finding, identity)` appends one `finding-raised` transition.
  `finding` is `{ findingId, kind, findingDigest, magnitude? }`; finding content is
  digest-only (the host retains it, §3); the raiser identity MAY be an automated checker's —
  raising decides nothing; the human anchor lives in the acknowledgment and the finalize gate.
  Re-raising an existing `findingId` is a content update (the finding's *current* digest
  moves); `kind` is immutable per `findingId` — a re-raise changing it throws.
- `acknowledge(recordId, ack, identity)` appends one `acknowledged` transition. `ack` is
  `{ findingId, findingDigest, magnitude? }` — the digest names the finding *version*
  accepted. An ack naming a `findingId` absent from the record throws (caller error); a digest
  that does not match the current version is *recorded anyway* and never counts (it surfaces
  as `ack-stale` at the gate). Whether an ack **counts** is decided only at finalize — an
  `ackMode`-violating ack is recorded and visibly non-counting (fidelity, not validity).

Both seams follow the uniform seam discipline: mandatory pre-seam chain-verify; only `open`
records accept the append — an already-`expired` or due-open record refuses `leg-expired`
(the expired edge appended en passant where due), any other non-open state refuses
`record-not-open` (never-append, §8); both seams throw on a record whose resolved leg
declares no findings flow — so a non-declaring profile can never acquire finding/ack
transitions, and its chains are byte-identical to a pre-findings implementation.

**The coverage gate.** At finalize, after the consultation gate, the library replays the
record's own findings and acks (no new finalize inputs) and, for each finding whose `kind`
appears in the leg's `requiredAcks`, in first-raise order, first trip refuses: a **counting**
ack names the `findingId`, carries the finding's current `findingDigest`, matches `magnitude`
exactly (present-iff-present, both directions), and satisfies `ackMode` by principal-only
comparison against the raiser (missing principal fails closed). No ack at all → `ack-missing`;
acks present but none counting → `ack-stale`. Zero raised findings of a required kind pass
vacuously — `requiredAcks` gates *raised* findings; it does not require findings to exist.
Findings of non-required kinds are recorded evidence and never gate.

**Named-magnitude acknowledgments** — the ack names the quantity accepted, e.g. "accepted
variance of $X" — SHOULD be used for magnitude-bearing findings. `magnitude` is a single
opaque string compared by exact equality; no parsing, units, or numeric interpretation —
canonicalization is the host's duty. A magnitude mismatch at finalize is `ack-stale`.

Finding kinds are their own namespace — they do not collide with consultation kinds, and the
reserved consultation kinds do not apply to them.

### 10.3 Policy-drift notarization **[PROVEN]**

*Applies when the profile declares a policy source (`policySource`).* `policySource` is an
opaque label naming the policy authority the operator runs (e.g. a rules-engine policy
snapshot), never fetched by the library. The library **notarizes** the policy version; it **never
evaluates** policy. The record carries `policyDigest` identifying the policy snapshot the
decision is bound to.

**Bound at `open()`, operator-only.** The `policyDigest` is bound by the trusted operator at
`open()`, never at the agent-reachable `stage()`: routing the drift baseline through the
untrusted drafter would let a lying agent bind whatever digest it anticipates the live source
will hold and silently defeat the gate. `open()` writes it into the genesis `opened` snapshot
(§4), **present-iff-declared**. Binding is fail-closed **both directions and loud** — a
caller/config error, not a domain refusal: a policy-declaring profile opened without a
(non-empty) `policyDigest`, or a `policyDigest` supplied to a non-declaring profile,
**throws** at `open()`.

**Finalize comparison.** Finalize takes a second `opts.policy` field, either the current
live-source digest the operator read — `{ digest }` — or an attestation that the source was
down — `{ unreachable, authority }`. The gate slots **after content-drift, before facts**: the
record's own content integrity outranks the policy environment (a drifted draft refuses
`content-drift` even under a drifted policy), and policy outranks the evidence gates —
deciding under the wrong policy version moots the evidence. A supplied `{ digest }` unequal to
the record's bound `policyDigest` refuses `policy-drift`; an `{ unreachable, authority }`
marker yields the **availability** outcome (bounded retry, never fail-open, never approval).

**Presence is a caller contract, checked loud.** On a policy-declaring profile, finalize
**throws** when `opts.policy` is absent, and on a non-declaring profile it throws when
`opts.policy` is present (both at profile resolution — so a tampered chain still refuses
`chain-compromise` first and an unconfigured profile `unknown-profile` first). The
absent-but-declared throw is deliberately asymmetric with a *missing required consultation*
(which refuses `consultation-missing`): policy is a single mandatory environment fact with an
explicit `unreachable` escape hatch, so its absence is a host contract violation, not the
domain's "the host omitted evidence" case — and keeping absence out of `policy-drift` leaves
that code purely "the digests differ". One coherent corner stays a **refusal**, not a throw: a
record opened under a non-declaring profile and later finalized under a same-id instance that
*does* declare (cross-instance config drift) has no bound `policyDigest`; the gate treats a
present live digest against an absent bound one as a mismatch and refuses `policy-drift`,
fail-closed, since the record is coherent evidence of a real prior decision.

**The reverse cross-instance direction is permissive at AL1 — a named, open decision.** The
gate keys on the **finalize-time** profile, so a record opened under a *declaring* profile
then finalized under a same-id *non-declaring* instance **skips the gate**: nothing compares
the bound digest to a live source, and the decision confirms. This requires a same-id profile
*dropping* `policySource` between open and finalize (a version-discipline violation, off the
honest path), and `profileDigest` is recorded at open and replayed, so the config flip is
auditable after the fact. Whether to fail-close this direction in code is a named open
decision (`OPEN-QUESTIONS.md` — the recommendation on record is fail-close). Relatedly, for a
single-leg record the bound `policyDigest` lives in the sole-genesis (head) payload, inside
the §0/§5 head-bound blind window — a storage-writing insider who edits that genesis
`policyDigest` to match the drifted live policy defeats the gate. Both are the policy-gate
analogs of §10.1's SoD-evidence window; detached signing (AL2, §14) is the named closure.

**Recovery is disposal + re-open, not retry.** `policy-drift` mirrors `content-drift` — a
bound-vs-reality mismatch with no in-place recovery, because the `policyDigest` is immutable
at `open()` and the live source will not revert. Leaving the record open would strand the
`(profile, subject)` pair under exclusivity (§9), so a policy-declaring profile **SHOULD**
list `policy-drift` in the leg's `terminalRefusals`: the record goes terminal and the host
re-opens the same staged draft under the new policy. (An *unreachable* source is the transient
case that does retry the same open record — that is `availability`, a different code.)

**Multi-leg.** `policyDigest` is **record-level**: each leg's record binds the digest its own
`open()` attested. Cross-leg policy equality is not verified — as with cross-leg content
(§10.1), both are chained and auditable, and a host requiring same-policy legs enforces that
in its own staging.

### 10.4 Eligibility gating **[PROVEN]**

*Applies when the profile declares a per-leg `eligibility` reference.* `eligibility` is an
opaque label naming the host's authority-to-decide check — held in config only, never on the
record (the `eligibility` consultation's `payloadDigest` is the record-side evidence).
Declaring it makes `'eligibility'` an **implicit-first required consultation kind** for that
leg: at the required-consultation gate (§11.1) the effective kinds are the implicit
`'eligibility'` followed by the declared `requiredConsultations` in order, so
authority-to-decide is checked before the evidence checks. The library does not itself run the
check; the host supplies its result as an `eligibility` consultation, and the library
**gates** on it.

**The trip mapping.** When the leg declares `eligibility` and the tripping kind is
`'eligibility'`: a **`fail` verdict refuses `ineligible`**; a *missing* input refuses
`consultation-missing` (generic); an *unreachable* marker yields the availability outcome
(generic). `ineligible` is **open-by-default** — eligibility is per-finalize, per actor, so a
*different* eligible actor may decide the same open record; a leg's `terminalRefusals` may
list `ineligible` to end the leg instead.

**Verdict vs. code.** A `Consultation.verdict` is `'pass'` or `'fail'`, so a failed
eligibility check records verdict `'fail'` — `ineligible` is the refusal **code**, not a
verdict value. A **`pass`**-verdict eligibility consultation is an obtained required input and
is recorded in finalize's success batch — the chain's evidence that the check ran and passed.
A **`fail`** refuses and, like every refusal path, records no consultation; its evidence is
the outcome code. A leg wanting a chain trace of the refusal lists `ineligible` in
`terminalRefusals` (a code-bearing `refused` edge, at the cost of ending the leg).

**When `eligibility` is not declared.** `'eligibility'` is then an ordinary kind with no
special mapping: a voluntary `eligibility` consultation is recorded as supplied, and a leg
that merely lists `'eligibility'` in its `requiredConsultations` gates it with the generic
codes (`consultation-failed` on a `fail`, never `ineligible`). Declaring `eligibility` **and**
also listing `'eligibility'` in `requiredConsultations` is a construction error (declare it
once).

**Honest bound.** The gate ensures a `fail` cannot silently confirm; it does **not** prove the
named authority genuinely ran the check — that the host supplied a truthful verdict stays the
host's, exactly as the required-consultation gate does not prove a consultation was genuinely
obtained (§11.1).

## 11. Feature-conditional evidence & the effect seam

### 11.1 Consultations (required-consultation gating) **[PROVEN]**

*The attach form is always available; required-consultation gating applies when the profile
declares `requiredConsultations`, or a leg declares `eligibility` (§10.4), which prepends an
implicit-first required `eligibility` kind.* An external or automated checker's identity,
recording time (below), digested payload, and verdict are recorded as a **Consultation
attached to the human leg** — evidence, never a decision (the human anchor holds; a
consultation informs it, §9). LLM judges, policy checks, and independent re-derivations
attach; they never decide.

Where a leg declares `requiredConsultations`, finalize enforces them over the host's supplied
consultations: it refuses when a required kind is **missing** (`consultation-missing`) or its
obtained **verdict is `fail`** (`consultation-failed`), and a required kind the host reports
**unreachable** produces the **availability outcome** — status `unavailable`, code
`availability`, carrying the marker's named `authority` — **never a fabricated pass**.
`consultation-missing` and `consultation-failed` are `terminalRefusals`-governed (§9.1); by
default the record stays `open` for a corrected retry. The availability outcome **never
appends**: the record stays `open` and the seam re-arms for bounded host retry (§8). The
library **gates and fails closed**; it does not *prove* that the authority was genuinely
consulted — demonstrating a live dependency (that severing the authority yields
`availability`, not a stubbed pass) is the operator's own regression exercise, outside the
library's runtime guarantee (see the OPERATOR-ASSURANCE tier, `SCOPING-GUIDE.md`).

**The consultation input surface.** The host supplies its consultations to finalize as an
optional `opts.consultations` list, each entry either an *obtained consultation* —
`{ kind, checker, payloadDigest, verdict }`, with an optional `proofRef` — or an *unreachable
marker* — `{ kind, unreachable: true, authority }`, whose `authority` names the party that was
down. Custody is **digest-only**: the host digests its own evidence payload into
`payloadDigest`; the library never sees the payload, matching every other seam (§3). A
consultation's `at` is **never accepted from the host** — the library stamps the recording
moment (§2.1). At most **one consultation per kind** per finalize is admitted; a duplicate
kind, a malformed input, or an input naming a **reserved** library-emitted kind (`facts` or
`chain-verify`, which would forge a library control) is a caller error that **throws at
argument intake**, before the chain is loaded — never a refusal (declaring a reserved kind in
`requiredConsultations` is likewise a profile-construction error, §9.1). The gate reads the
finalizing record's **own resolved leg** (so on a multi-leg profile one leg's finalize is
never gated by another leg's `requiredConsultations`) and iterates the declared kinds **in
order**, the first kind that trips resolving the call. An obtained consultation whose kind is
**not** required is recorded as supplied — including a `fail` verdict — as evidence, never a
gate; an unreachable marker for a non-required kind is inert.

**Recording-time, not observation-time.** A consultation's `at` is **recording-time**: the
library stamps it at the recording seam — never at the moment the underlying check was
observed. The library does not accept a caller-supplied consultation time, which at AL1 would
be caller-trusted (§13A, clock trust). One consequence is named rather than hidden: a
`freshness` bound over a consultation kind the library itself stamps is **vacuous by
construction** — that kind's `at` is always the recording instant, so it can never be found
stale. **For this reason the freshness gate (`consultation-stale`) is [PROVEN] and
AL2-dependent:** at AL1 it would gate on a value the library just stamped to `now` and could
never fire — a dead gate wearing an assurance label. Meaningful facts-freshness and
observation-time fidelity arrive with **AL2** authority timestamps carried inside the digested
payload (§14); `freshness` gating is meaningful only for consultation kinds that carry such an
authority-supplied time.

### 11.2 Redemption (the effect seam) **[PROVEN]**

*Applies only when the profile declares an effect seam (§9.1) — on-iff-effects. Pure-capture
profiles omit redemption entirely; `redeem()` on such a profile refuses `unredeemable-state`.
On a multi-leg effect-seam profile, a `redeem()` against a non-final leg's record — in any
state, including `confirmed` — likewise refuses `unredeemable-state`: redemption couples to
the confirmed FINAL-leg decision (§10.1). On the final leg, a `redeem()` against a record with
no redeemable state — `open`, `refused`, or `expired` — also refuses `unredeemable-state`.*

Redemption is the single-use coupling of a confirmed final-leg decision to its effect:
`confirmed → redeemed` **directly** (for a host whose record store and effect executor share
one transaction boundary), or via `confirmed → redeeming → redeemed` (the **token shape**, for
separated stores). It carries no identity argument — the deciding actor was bound at finalize
(§6); redemption evidences execution, not judgment. Redemption verifies effect-content
correspondence — the record's `(profileId including version, legId, subjectRef,
contentDigest)` tuple against the effect being executed, a re-digest of the supplied content
against the bound `contentDigest`, and, for a token completion, the presented token — and
refuses any mismatch with `effect-mismatch`. It is **at-most-once**: a replayed redemption of
an already-redeemed record refuses `already-redeemed`; a `redeeming` bound elapsing with the
outcome unknown resolves `redeeming → redemption-failed` with `redemption-timeout`, and an
unknown outcome is never retried.

**The direct shape (co-located).** When the host passes its own transaction handle (§12), the
`confirmed → redeemed` edge is enlisted in that transaction, so the record edge and the host's
effect commit or roll back together. The host **MUST** `await` the redemption before ending
that transaction: an enlisted append still in flight when the transaction ends can autocommit
an orphaned `redeemed` edge outside the rolled-back effect. A host rollback erases the edge
entirely — a transition written inside an aborted transaction was never appended (§5) — so
re-attempting a **known** rolled-back redemption is legitimate and is not the
retry-of-an-unknown-outcome the at-most-once rule forbids (that rule governs the token shape's
elapsed-`redeeming` case, where the outcome is genuinely unknown).

**The token shape (separated).** When no transaction is shared, redemption issues a single-use
token, generated by the library with cryptographic randomness and **enough entropy that its
digest is not invertible by guessing** (the same low-entropy-preimage limit §13 names):
`confirmed → redeeming` records the token's digest, and the token itself is returned to
the caller exactly once and is never persisted — the chain carries only `tokenDigest`, so a
chain reader cannot reconstruct a token of that entropy from its digest. Completing `redeeming → redeemed` requires presenting that
token, on which the executor deduplicates. A lost token cannot be recovered: the record stays
`redeeming` until its `redeemBound` elapses and resolves it to `redemption-failed` —
at-most-once is preserved over convenience.

**Honest bound.** Redemption makes orphaned, duplicated, premature, or mismatched effects
**refusable at the seam given an idempotent executor** — the **separated** host's executor
**MUST** be idempotent, keyed on the redemption token, or a retried completion double-applies.
The **co-located** host carries no such executor obligation: its protection is the shared
transaction itself. Neither shape **standalone**-prevents a bad effect, and the library
**never executes** the effect: effect execution stays entirely the host's. A value framing
that follows, stated honestly: *given an idempotent executor gated on redemption*, every
governed effect **that reaches the seam** has exactly one matching record — the negative
assurance an auditor reconciles externally; the library does not observe effects that bypass
the seam.

## 12. Storage interface **[PROVEN]**

Records persist through a pluggable `Store`. The store is **not a blind log**: the uniqueness
and liveness invariants live in its transactional constraints, not in the chain, so a crash or
a race cannot admit a second live decision. A third-party `Store` adapter implementer **MUST**
honor the contract below. The interface is **provisional pre-1.0**: a host may inject its own
adapter (there is no other way to run the library), and reference adapters implement exactly
this shape, but method signatures are unstable while 0.x and freeze only at 1.0. What is
durable is the *behaviour* each method guarantees, not its argument list.

**Staged-draft surface.** Before any record exists, an inert agent draft is held by the store:
`putStaged(staged, tx?)` persists a staged binding and `getStaged(stagedRef)` reads it back —
the read `open()` performs to bring a record into existence (§9). `putStaged` is
**idempotent, first-write-wins** on a same-id collision: a staged reference is content-derived
(§3), so a re-put of the identical draft is the ordinary case, and a genuine same-id collision
keeps the first write rather than overwriting it. `getStaged` returns nothing for an unknown
reference.

**Compare-and-swap append.** `appendTransition(expectedCurrentState, transition, meta, tx?)`
appends a transition **atomically with** the state check — the append succeeds only if the
record's current state still matches `expectedCurrentState` (a genesis append targets a record
that MUST NOT yet exist; any state is the compare target for a subsequent append). It is a
**compare-and-swap**, never a separate advisory pre-check followed by a write (which would
reopen a time-of-check/time-of-use double-decide). `meta = { nonTerminal, dueAt? }` carries
the record-level flags the store persists **verbatim** — the library derives them, the store
never recomputes them: `nonTerminal` is the persisted non-terminal flag the exclusivity
constraint reads, and `dueAt` is a library-computed clock deadline for whichever pending
window the record is in (the `open` ttl window, the `confirmed`-awaiting-redemption window, or
the `redeeming` window, §9.1) used **only as a listing index** — present sets the record's
pending-clock column, absent clears it, and it is never authoritative (`listDue` below). The
compare-and-swap *discipline* is the stable guarantee; the argument list carrying it is not.

**Atomic batch append.** `appendBatch(expectedCurrentState, transitions, meta, tx?)` appends
several transitions **all-or-nothing under one entry compare-and-swap**, so a multi-transition
step (finalize's success batch, §2.1) either lands whole or not at all. Its semantics are
exact: `expectedCurrentState` is checked **once** at entry (genesis never appears in a batch);
the elements then apply in order with per-element sequencing (`seq = max+1 … max+N`,
server-verified) and terminal-monotonicity evaluated against the **evolving** intra-batch
state, but with the terminality *input* fixed at the entry flag so a record **cannot become
terminal mid-batch**; `meta` is applied **once** as the post-batch record flags; and the
**first** conflicting element aborts the whole transaction with nothing applied, the outcome
naming that element's index. Entry-level failures — an entry compare-and-swap mismatch or C4
seal-finality — report element index 0.

**Constraints an adapter MUST provide.**

- **(C1) Exclusivity.** A partial `UNIQUE(profileId, subjectRef)` over the **persisted
  non-terminal flag** (`meta.nonTerminal`) — a flag derived from state **AND** whether this is
  the final leg **AND** whether the profile declares an effect seam (§9.1). A final-leg
  `confirmed` on an effect-seam profile, and any `redeeming`, count as non-terminal (they
  block a second record until redemption resolves); a final-leg `confirmed` on a pure-capture
  profile is terminal; a non-final-leg `confirmed` is terminal for its leg but admits the next
  leg. A bare `WHERE state = …` predicate is **wrong** — terminality is not a function of
  state alone (§2). A rejected genesis append names the **blocking** record — the live
  non-terminal record for the pair, the same record `findNonTerminal` returns.
- **(C2) Sequencing.** `UNIQUE(recordId, seq)` with **server-verified** `seq = max+1` computed
  inside the transaction (§4).
- **(C3) Terminal monotonicity.** No **state-leaving** append after a terminal state, except
  the two carved exceptions: the state-preserving `sealed` metadata append, and a
  `compromise`-classed refusal edge against a terminal **`confirmed`** (decided) record —
  never against terminal `expired` or `refused` (§5's admission rule; the store admits no
  more than the library ever appends).
- **(C4) Seal-finality.** After a `sealed` transition (§5), **no further append of any kind**
  is admitted — not even a `compromise` refusal edge — because a sealed record's body may be
  archived or destroyed as a unit and nothing may extend a chain whose evidence may be gone.
  C4 rejects through the same terminal-state-mismatch path as C3 (no separate conflict
  shape), so a racing or duplicate seal loses deterministically and its residual maps to
  `unsealable-state` (§8).

**Reads.** `readChain(recordId)` returns the full committed chain in sequence order for
`replay`/`verifyChain` (§5), and a cheap `chainHead(recordId)` returns the latest transition
digest for the prior-leg / separation-of-duties binding (§10.1). Two further reads serve
liveness: `findNonTerminal(profileId, subjectRef)` returns the live non-terminal record for
the pair (or nothing) — the re-emit binding that makes `record-exists` actionable, and the
same record C1 names as the blocker — and `listDue(now)` returns the records due for a
clock-driven edge (§4), **`dueAt`-gated** as `dueAt ≠ null AND dueAt ≤ now`, with **no state
predicate**. `dueAt` presence IS the library's declaration of a pending clock, and the
library's own meta discipline maintains it; every state-leaving append that carries no new
clock clears the column by omission. A record with no bound is never listed, regardless of
state, and `dueAt` stays an **index only** — the authoritative chain recompute at the
resolving seam is the decision-maker, so a stale or config-drifted `dueAt` makes only a
harmless sweep candidate that recompute then declines, never a wrongly-forced edge. All reads
return **fresh values** — a caller mutating a returned chain, head, or staged draft can never
corrupt store-internal state. **The persisted `state`, non-terminal, and `dueAt` columns are
constraint-and-index only:** they back the compare-and-swap, the exclusivity index, and the
due query, but they are **never** the authoritative source of decision state — replay over
the chain (§5) is the sole authoritative derivation (§2's all-state-in-the-record rule).

**The sweep (operator-only).** The due-record resolution pass named in §4 and §9: the
operator iterates `listDue(now)` and, per listed record, drives the ordinary mutating seam
for that record's pending window, which resolves the elapsed bound **en passant under the
authoritative chain recompute** (§4) — the sweep grants no append authority of its own, and a
stale candidate is simply declined by the recompute. It exists so `seal()` can stay
clock-edge-free: sweep first, then seal (§4, §5). Like every §12 surface its concrete
signature is provisional pre-1.0; the contract is the behaviour above.

**Caller-transaction seam.** Every write accepts an optional caller-supplied transaction,
**adapter-generic**: its concrete type is the driver's own transaction handle, named only
where an adapter is instantiated, never abstracted behind a library-owned transaction
interface. When a host supplies one, the write is **enlisted in that transaction and commits
or rolls back with it** — so a co-located host can commit a `redeemed` edge in the *same*
transaction as the effect (§11.2). When none is supplied, an adapter uses its own transaction
for the write. **The transaction boundary is never hidden from the caller** — the host's
transaction is enlisted, never silently wrapped or replaced; that honesty is precisely why
the seam is a passed-in handle and not a `withTransaction` callback the library owns.

**Sealing (`seal` / `retired`).** `seal(recordId)` verifies the full chain, then — on a
derived-terminal record — appends the state-preserving `sealed` transition through C3's
carve-out; C4 then freezes the chain and the record reports `retired`, its body free to be
archived or destroyed as a unit under the host's retention schedule (§5, §13). A `seal()`
against a record that is not derived-terminal, or one already sealed, refuses
`unsealable-state` (§8).

**Identity and digests.** `principal` is stored as a **pseudonymous reference resolved outside
the chain** (§13), so lawful erasure does not break replay; digests use the **record's
recorded algorithm** (§7 — no hardcoded `sha256`), and genesis `prevHash` follows §4.

**Reference adapters (implementation guidance).** The reference implementation proved this
contract over three backings — an in-memory store (reference semantics, tests, ephemeral use;
never durable evidence), an embedded-SQL store (zero-infra, single-operator), and a
server-SQL store (production, multi-connection-safe) — held equivalent by a single
**backing-parameterized conformance suite** that is the executable definition of a correct
`Store`, plus a cross-backing end-to-end that asserts all backings produce **byte-identical
chains** from the same scripted flow under a fixed clock. An inheriting project SHOULD
reproduce this proof structure. A persisted schema is an **implementation artifact, not a
public query API** — richer listing is the host's own read model built over the reads above.
**A workflow or agent engine's internal history is not a substitute for the store:** it may be
durable, but it is not the replayable, constraint-guarded chain this contract requires.

## 13. Privacy & retention **[PROVEN]**

Records contain personal data by design — principals, timestamps, and the decision behaviour
of identified humans, in a tamper-evident chain.

- **Pseudonymization.** `principal` SHOULD be a pseudonymous reference resolved through an
  identity map held **outside** the chain. Erasure is then satisfiable by destroying the map
  entry — **de-identification by unlinking** (where the map is encrypted per principal,
  destroying that entry's key is the crypto-shredding variant) — while chain verification
  stays intact. A hash preimage over low-entropy personal data is not anonymization.
- **Retention and end-of-life.** Retention periods are the host's law, never the library's.
  Sealing (§5, §12) exists so lawful end-of-life is a specified, verifiable state — a record
  reports as `active` or, once sealed, `retired` — rather than an unexplained gap in the
  chain. Because sealing verifies the chain first, a record whose chain is compromised can
  never be sealed; disposal of a tampered record is a host-side act under the host's
  retention law, outside the library. One multi-leg interaction is worth naming: because a
  successor leg verifies its prior legs by replaying their chains at `open()` (§10.1),
  destroying a prior record's chain under retention makes any not-yet-opened successor leg
  unopenable; a successor already opened is unaffected.
- **Purpose limitation (surveillance-data guard).** Records evidence *decisions*. Their
  timestamps also make reviewer performance analysis — approval latency, refusal rates per
  named person — technically trivial, and that is **surveillance data**: it carries its own
  legal regime and is out of the library's purpose. Defensible use is **aggregate
  control-assurance, never per-named-reviewer scoring**. Hosts are warned not to repurpose
  the record as an employee monitor.
- **Scope disclaimer.** As stated up front (§0), a record is not a legal conformity assessment
  and asserts nothing about any human's competence, attention, or independence.

## 13A. Security considerations

The threat model is a **single operator** running the library. The base-level limit first and
plainly: the AL1 hash chain is **tamper-*evident* against non-recomputing tampering only** —
and only for a transition that is **not** the current chain head; the head's own payload (and
a sole genesis's) is pinned only once a later transition chains over it. Three residuals
follow. A **storage-writing insider who recomputes the chain** — deletes a transition and
rebuilds every subsequent hash — is **not** caught by `verifyChain` (§5); replay verifies
clean. A non-recomputing edit of the current head is likewise not caught until a later
transition chains over it — §10.1 and §10.3 name the concrete windows where this bites. And
**whole-record absence is silent**: replay and `verifyChain` run over the chain the store
returns, so a record whose entire chain is deleted — or a store restored from an older
backup, dropping recent records or recent transitions wholesale — verifies clean on what
remains; nothing at the base level shows that a record ever existed. §10.1's verified
prior-leg references give partial detection (a destroyed prior chain makes a not-yet-opened
successor unopenable), and detached signing (AL2) verifies only what exists — absence
survives it; the closures are AL3 anchoring (§14) or a host-side record index reconciled
against the store. The first two residuals close at AL2; detached signing (AL2, §14) is the
upgrade for those, stated with the absence caveat.

**Threats this library addresses:**

- **Render-to-decide drift.** Content mutates between the reviewer's screen and the
  confirmation; finalize refuses `content-drift` (§3, §9). Stated as a conditional guarantee:
  **drift is refusable at the seam given the host presents content from its bound source** —
  the library compares digests; it never reads the host's source itself.
- **Payload-identity forgery.** A decision message carrying an approver identifier in its
  payload, over an unbound transport, cannot finalize — identity is by transport, and payload
  identity is refused (§6).
- **Late-arriving findings.** A warning that appears after the reviewer last looked is caught
  by finding/ack coverage where a findings flow is configured (§10.2).
- **Faithful binding of a wrong draft.** The digest binds a hallucinated or malicious draft
  *faithfully* (fidelity, §3); the record proves it was reviewed and decided, never that it
  was correct. Prevention lives upstream, in the agent and interception layers the library
  does not own.

**Explicitly out of scope — named to prevent overclaiming:** a lying allow-listed identity
authority (`allowedAuthorities` is blast-radius control, not prevention); policy poisoning
before the digest is captured (`policyDigest` gives drift detection, not policy integrity);
transport authentication (the host's); human **collusion and coercion** (separation of duties
evidences distinct principals, not independent judgment — §10.1); rubber-stamping and review
fatigue (no record format evidences attention or competence; latency analysis can *detect* it
but is surveillance data — §13); model quality and prompt injection (mitigated, never closed,
by human review plus the reviewed-surface binding); storage confidentiality and access
control (the host's).

**Clock trust.** Timestamps are host-written at AL1; freshness checks are correspondingly
host-trusted. AL2 admits authority timestamps inside digested payloads for required
consultations.

## 14. Signing & anchoring

The library grades its integrity guarantees and never overstates the base level — **graduated
honesty**.

- **AL1 — Chained (the honest default) [PROVEN].** The model as written in §2–§12:
  hash-chained transitions, tamper-*evident* against non-recomputing tampering — bounded per
  §0/§5 to transitions that are not the current chain head. This is what every deployment
  gets, and it is never described as cryptographic.
- **AL2 — Signed (an operator-enabled upgrade) [PROVEN].** Detached signatures over
  canonical transitions and consultations. An operator enables it when insiders — a database
  administrator who could recompute the chain — are outside the trust boundary; it closes the
  recompute residual and the genesis-head blind windows (§13A, §10.1, §10.3), because a
  rebuilt or head-edited chain fails signature verification without trusting storage. Signing
  ships as an optional hook; key distribution and rotation are host-declared; enablement
  granularity and the missing-signature posture are decided on record
  (`OPEN-QUESTIONS.md` §1). AL1 stays the default.
- **AL3 — Anchored (documented upgrade only) [SKETCHED].** External anchoring of chain heads
  in an independent append-only log — anchored history verifiable against a log the operator
  does not solely control, for key-holding insiders and long-horizon disputes. Documented so
  the honesty gradient is complete; not an active level.

Detached signing is the load-bearing upgrade for a single operator who must resist its own
storage-writing insiders; anchoring is the further step when even key custody is in doubt.
