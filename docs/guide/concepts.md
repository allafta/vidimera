# The model in ten minutes

This is the derived, fast version. The normative version is
[`../concept/SPEC.md`](../concept/SPEC.md); the design narrative with the reasoning is
[`../concept/ARCHITECTURE.md`](../concept/ARCHITECTURE.md); the vocabulary is defined once
in [`../concept/GLOSSARY.md`](../concept/GLOSSARY.md). Where this page and those disagree,
this page is wrong.

Nothing in this guide is a compliance claim: adopting the library makes no host compliant
with any law or regulation ([`faq.md`](faq.md)).

## The record and the chain

A **decision record** is not a row you update — it is a fold over an append-only chain of
**transitions**. Each transition carries `{ recordId, seq, at, kind, payload, prevHash }`,
where `prevHash` is the digest of the previous transition (and a derivation of the record
id at genesis). Two operator functions make the chain useful:

- `replay(recordId)` folds the chain back into the record: its state, actor,
  consultations, findings, linkage.
- `verifyChain(recordId)` recomputes every link, checks that every transition is
  `recordId`'s own, and reports `{ intact: true }` or the first break's sequence number.

The guarantee, with its limit in the same breath: the chain is **tamper-evident against
non-recomputing edits**. Deleting, reordering, or editing a non-head transition breaks the
next link and is caught on verify. Another record's rows copied unrewritten under this
record's id are caught too: `verifyChain` reports a break (at seq 1 for a whole copied
chain), the seams refuse `chain-compromise`, and the non-verifying reads throw. A tamper
to the *last* transition — or to a transition's own `prevHash` field — is indistinguishable
from that transition never having existed, because a singly-linked chain protects each
transition through the *next* link.
That is the AL1 bound; see "The assurance ladder" below for what upgrades it.

Content is never persisted. The record binds a **digest** of the reviewed content
(`contentDigest`); at decision time the caller re-supplies the content, the library
re-canonicalizes and re-digests it, and a mismatch is refused as `content-drift`.

## The capability split

`create(config)` returns **two frozen handles** over one shared kernel:

- `agent` — what the drafting side may hold: `stage()` plus three pure reads
  (`getRecord`, `readChain`, `chainHead`). Nothing on this handle transitions a record.
- `operator` — what the host/human side holds: `open`, `review`, `finalize`, `decline`,
  the redemption seams, `raiseFinding`/`acknowledge`, `seal`, the reads, and the audit
  functions.

This is in-process object-capability discipline, not a sandbox: the agent handle simply
*has no method* that decides anything, the handles are frozen plain objects, and every function
on them is that handle's own frozen closure, so nothing reachable from the agent handle is the
same object as anything on the operator handle. What it does not cover: every function inherits from the realm's shared
`Function.prototype`, so agent code running in the same process that can patch it (in a
default Node realm, any code can) still reaches whatever your operator code passes to `bind`,
`call` or `apply`. The split confines in-process agent code only when you confine that code —
frozen built-ins (for example Node's experimental `--frozen-intrinsics` flag) and no ambient module loading. Handing
your agent framework the `agent` handle and keeping `operator` on the host side is the
integration's one non-negotiable move.

## Profiles: declaring what a decision requires

A `ConfirmProfile` declares, per kind of decision, what confirmation requires:

```ts
{
  id: 'finance.invoice-approval.v1',        // convention: <domain>.<subject>.v<n>
  subject: { canonicalizerRef: 'finance.invoice.v1' },
  legs: [{ id: 'approver-decide', allowedAuthorities: ['session:ap-console'] }],
  captureMode: 'staged',                    // or 'live'
  expiry: { ttl: 3600 },                    // seconds; or 'none'
}
```

Everything beyond the kernel is **feature-conditional on declared fields** — there is no
separate tier system in the code. Declare more than one leg and separation of duties
switches on; declare a `redeem` block and the effect seam switches on, and `redeem.result`
inside it admits the effect's outcome digest; declare `decline: true` on a leg and the
human-decline seam switches on; declare `policySource`, `requiredConsultations`,
`eligibility`, `freshness`, or `signing: true` and those controls attach. Declare nothing
and you have the base confirm loop.

**Construction is loud.** `create()` validates every profile fail-closed and throws on
anything it cannot honor — a bad shape, an unresolvable canonicalizer reference, a
`signing: true` profile on an instance with no signing configuration. A config the library
cannot enforce fails at startup, never by silently degrading at decision time. The rules are
stricter than a type check: a profile is plain data (object literals or parsed JSON — a class
instance, accessor, `Object.create` object, `Set` or `Map` is refused); an unknown data-valued
key throws (a function-valued one is ignored); an explicit `undefined` is an absent field and
`null` is refused; each time bound is at most 3,155,760,000 seconds (100 years); a
`terminalRefusals` member the leg cannot produce throws; and a canonicalizer must be a function.
`create()` keeps a frozen copy of each profile, so mutating your object afterwards changes
nothing the instance enforces or digests, and `profileDigest(profile)` on an accepted profile
equals the digest the instance binds.

Profiles are code, not persisted state — but each record's genesis carries a
`profileDigest` of the profile it was opened under, so later drift between the record and
the code is detectable: `verifySignatures(recordId).genesisProfile` reports whether the
profile this instance holds under that id is the one the record was opened under, and the
exported `profileDigest`/`projectProfile` let you make the same comparison offline.
Detected and refused: a seam that does not hold the profile a record was opened under — a
registered same-id profile whose projection no longer digests to the record's binding —
refuses `unknown-profile`, never-append. Version your profiles; an in-place edit strands its
open records until restored or versioned. An in-place edit or a retired version also blocks
recovery (`supersedes`) of that profile's terminal records, so keep prior versions registered for
as long as you may want to supersede their records; what is lost is the verified link, not the
subject.

## The lifecycle

```text
stage (agent)  →  open (operator)  →  review (operator, pure read)  →  finalize (operator)
                                                                          │
                             ┌────────────────────────────────────────────┤
                             ▼                                            ▼
                          refused                                     confirmed
                                                                          │  (effect-seam
                                                                          │   profiles only)
                                              redeem ── or ── beginRedemption → redeeming
                                                 │                             │
                                                 ▼                             ▼
                                             redeemed          completeRedemption → redeemed
```

- `stage(content, profileId, subjectRef)` digests the content and stores an inert staged
  draft — digest only, no record yet, nothing to approve against yet.
- `open(stagedRef)` mints the record: the genesis transition binds profile, leg, subject,
  and content digest — from a staged draft that must re-derive to `stagedRef`, so a draft
  edited in storage throws instead of binding. Options carry multi-leg prior references
  and the `supersedes` recovery claim — both verified by replay before anything is
  appended — a policy digest, which is presence-checked and bound as the operator's
  attestation (the drift comparison against it happens at finalize), and a `proposed`
  reference, resolved through the store and bound as `proposedDigest`.
- `review(recordId)` is the content-free projection a review surface renders from: digests
  and state, never content.
- `finalize(recordId, identity, content, facts, opts?)` is the decision. `identity` is the
  transport-established assertion of who decides; `content` is re-verified against the
  bound digest; `facts` is the reviewed-surface binding — a digest of what the screen
  actually rendered, attested by the review surface's own identity, so the record can
  later show not just *what* was approved but *what the approver saw*.

Record states: `open`, `confirmed`, `refused`, `expired`, `declined`, and — on effect-seam
profiles — `redeeming`, `redeemed`, `redemption-failed`. Once a record is terminal, its chain can be
capped with a `sealed` transition (`seal()` refuses `unsealable-state` against anything
still live), after which the record reports `status: 'retired'` and admits no further
append.

## The outcome model

Domain refusals are **returned, never thrown**:

```ts
type Outcome<T> =
  | { status: 'ok'; value: T }
  | { status: 'refused'; code: RefusalCode; class: 'refusal' | 'compromise'; transitionRef?: Digest }
  | { status: 'unavailable'; code: 'availability'; authority: string };
```

Exceptions are reserved for **caller and config errors** (unknown `recordId`, malformed
input, a construction-time contract violation) and storage faults — cases where nothing
was recorded and the caller has a bug or an outage, not a decision outcome. A lost race is
neither: a concurrent `raiseFinding` or `acknowledge` can cost `finalize`, `decline`, or a
findings seam its append, which surfaces as the refusal `record-contended` — nothing recorded,
re-invoke (the integration guide has the shape).

A refusal *may* append a `refused` transition — that is itself a recorded decision — or
may leave the record open for retry. The rule: `chain-compromise` records itself wherever
the record's state still admits an append; a fixed never-appends set (the pre-record
failures, the state-gate refusals, the contention refusal, and every redemption-seam refusal)
never does; every
other refusal appends `open → refused` only if the leg's `terminalRefusals` lists that
code, and otherwise leaves the record open. `unavailable` (a required authority
unreachable) never appends — an outage is not a decision.

The full registry is 25 codes; the API reference lists them all. The ones you will meet
first: `content-drift`, `identity-authority-refused`, `consultation-missing`,
`record-not-open`, `leg-expired`, `chain-compromise`.

## The finalize gate ladder

`finalize` checks in a fixed order, and the precedence is the design — every adjacent pair
of gates is pinned by an explicit order test:

1. **Chain verify** — a tampered record refuses `chain-compromise` before anything else is
   considered; integrity outranks everything.
2. **State / expiry** — a decided or expired record resolves here (a due-open record is
   expired *en passant*).
3. **Identity** — read only from the explicit argument; the authority must be in the leg's
   `allowedAuthorities`.
4. **Separation of duties** (multi-leg) — the finalizer must not be the recorded actor of
   any prior leg the leg's `sod` declaration names, nor the declared proposer.
5. **Content drift** — re-canonicalize, re-digest, compare.
6. **Policy drift** (policy-declaring profiles) — the live policy digest against the bound
   one.
7. **Facts** — the reviewed-surface binding must be present and well-formed.
8. **Consultations / eligibility** — required kinds in declared order, first trip wins.
9. **Ack coverage** (findings flow) — raised findings of required kinds must carry
   counting acknowledgments.
10. **The success batch** — one atomic append of `[chain-verify, facts, …consultations,
    confirmed]`; all-or-nothing, so a conflict never leaves a partial tail.

## Consultations, findings, and the governed controls

A **consultation** is recorded machine evidence: `{ kind, checker, at, payloadDigest,
verdict }`. The library mints two kinds itself (`chain-verify` and `facts` — reserved, a
host cannot forge them); every other kind is the host's own domain check, *recorded, never
performed* by the library. Machine verdicts can refuse a finalize; they can never approve
one — the final leg of every flow is a human's (the human-anchor principle).

The other governed controls, one line each — the catalog with tiers and honest bounds is
[`../concept/CONTROLS.md`](../concept/CONTROLS.md); the section numbers below are
[`../concept/SPEC.md`](../concept/SPEC.md)'s:

- **Separation of duties** (§10.1): distinct principals across legs, evidenced —
  distinctness, not independence; two colluding humans satisfy it.
- **Findings & acknowledgments** (§10.2): operator-raised findings between `opened` and
  the decision, with named-magnitude acknowledgments gating finalize.
- **Policy-drift notarization** (§10.3): the decision binds a policy digest; deciding
  under a changed policy refuses.
- **Eligibility** (§10.4): a host-checked eligibility verdict as an implicit-first
  consultation, refusing `ineligible`.
- **Recorded human decline** (§9): the operator-only `open → declined` seam, giving a
  rejection confirmation's own evidentiary treatment — the authority rungs
  (chain-verify, state/expiry, identity, separation of duties, content-drift, `facts`,
  eligibility) gate exactly as finalize's do, while required consultations and ack
  coverage are deliberately skipped and the seam takes no policy input. Proves who
  declined what they saw, never that the decline was sound — a "no" never routed to the
  seam does not exist.
- **Redemption — the effect seam** (§11.2): a confirmed effect-seam record is *not
  terminal* until the host couples the effect to it, at most once — direct shape
  (enlistable in the host's transaction) or token shape (a single-use token returned
  exactly once, only its digest ever recorded). Refusable-at-the-seam, not standalone
  prevention: the library never executes effects and cannot see effects that bypass the
  seam.
- **Effect-result notarization** (§11.2): a profile declaring `redeem.result` admits an
  optional host-claimed outcome digest at `redeem()` and `completeRedemption()` — never
  at issuance — bound as `resultDigest` inside the `redeemed` payload. Notarizes that the
  host asserted this outcome when it closed the coupling; the library never observes the
  effect, never verifies the claim, and never mirrors business state that moves
  afterward.
- **Recovery** (`supersedes`, §2): a new record verifiably linked to the terminal
  predecessor it replaces.
- **Proposal provenance** (`proposed`, §9/§2): the staged draft the host names as the
  proposal, resolved at `open()` — it must re-derive to that reference — with its digest
  bound as `proposedDigest`, so the record shows whether the decision matched or changed
  what was proposed. Record-only — nothing gates on it; it proves the store held that draft
  under that reference for the same (profile, subject, leg) when the record opened, never
  who authored or staged either draft nor that the revision was sound.
- **Live capture** (§9.2): decide-what-exists mode for content that cannot be staged
  inert, with mandatory re-derivation consultation and redemption tail.

## The assurance ladder

- **AL1 — chained** (the default): tamper-evident against non-recomputing edits, with the
  last-transition blind spot named above. An insider who can rewrite storage *and*
  recompute digests defeats it by construction.
- **AL2 — signed** (built; operator-enabled): every transition of a declaring profile's
  records gets a detached signature at append, and every *seam* that verifies a chain
  before acting folds the signature layer into its verdict. (The standalone `verifyChain`
  audit read checks linkage and record identity only; `verifySignatures` is the signature
  layer's own report.)
  Raises the bar against a rewriting insider under three conditions
  ([`../concept/SPEC.md`](../concept/SPEC.md) §14). Every key whose verifier is registered,
  retired keys included, is held outside that insider's boundary — key custody is the host's
  problem, and the guarantee is only as good as it. Every profile registered on an instance
  that acts on the records signs: the layer applies through the profile a record's genesis
  names, so an insider who rewrites a signing record's genesis onto a registered non-signing
  profile takes the record out of the layer. And no signature outlives an append that never
  committed — met when the configured sidecar is the store's own on the three reference
  stores, which then write each signature inside the atomic unit of the append it signs; open
  for a separate sidecar, which the library writes to before it appends, so a rolled-back append,
  or one that lost its compare-and-swap, leaves a valid signature an insider can splice back in.
  Even under all three, AL2 verifies only what exists: an insider who deletes
  a record's most recent transitions leaves a chain whose every signature verifies.
- **AL3 — anchored** (documented, deliberately inactive): chain heads in an external
  append-only log the operator does not solely control. Documented so the honesty gradient
  is complete.

None of these levels is non-repudiation, and the documentation never calls them that.
The threat model with the named blind windows is
[`../concept/ASSURANCE.md`](../concept/ASSURANCE.md).

## The self-test tier

`packages/record/src/probes/` ships an operator-assurance probe suite: seventeen probes
that drive a *host-supplied* driver (your config, your store, your identities) and check
that the controls actually operate in your configuration — drift refuses, the agent handle
cannot decide, tamper is evident, redemption is at-most-once, state survives a restart,
and so on. `runProbes(driver)` returns a report; `assertSatisfied(report)` is the CI hook;
waivers exist and expire. The honest bound: a passing report proves the control operated
*in the probed configuration, at probe time* — never third-party assurance.

## Where to go next

- Run it: [`getting-started.md`](getting-started.md)
- Wire it into a host: [`integrating.md`](integrating.md)
- Look something up: [`api-reference.md`](api-reference.md)
- The questions everyone asks: [`faq.md`](faq.md)
