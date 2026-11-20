# API reference

**Derived from source, 2026-08-21; its store and signing sections re-derived 2026-11-20.** This
page enumerates the public surface as
`packages/record/src/index.ts` exports it against the current tree. The source and
[`../concept/SPEC.md`](../concept/SPEC.md) are authoritative; if this page disagrees with
either, this page is stale — file it as a bug. Two standing caveats: the pre-0.1 API
review (deferral register row 6) completed 2026-08-19, ratifying the 52 names exported then
(`docs/analysis/2026-08-19-phase-1-api-review.md`); the ten added since — the
adapter-author helpers below (`transitionDigest`, `GenesisPayload`, `isCompromiseCarveOut`,
`isStateLeaving`, `stateOf`, `signatureEntriesToWrite`), the `DeclineOptions`/`RedeemOptions`
bags, and the profile-binding helpers `profileDigest`/`projectProfile` — landed under
the review's own rules rather than through it — the store contract's
method signatures staying explicitly provisional pre-1.0 by the sealed set's own
declaration; and the package builds to `dist/` behind a real `exports` map (`.` and
`./probes`; CI packs and consumer-tests the tarball on every run) but stays `private: true`
and unpublished until the 0.1 cut — inside this workspace you still import from
`packages/record/src/index.js`, and the `@vidimera/record` forms shown here resolve from
the packed tarball. No surface below is a compliance claim: adopting the library makes no
host compliant with any law or regulation ([`faq.md`](faq.md)).

## `create(config)`

```ts
function create(config: Config): Surfaces;

interface Surfaces {                         // the named handle pair
  agent: AgentSurface;
  operator: OperatorSurface;
}
```

Fail-fast, fail-closed at construction: every profile is validated, duplicate profile ids
rejected, every `canonicalizerRef` must resolve, and a `signing: true` profile without
`config.signing` throws. A `config.signing` that is present must also be well-formed — an
object whose `signer` is a function, whose `verifiers` is a plain object of functions (its
prototype `Object.prototype` or `null`, so a null-prototype object or a module namespace is
accepted, while `null`, an array, a `Map` or any other class instance is refused; every own
string key, enumerable or not, must hold a function; empty is allowed), and whose `signatures` has
`put` and `listByRecord` functions — each violation throws a named `create:` error, where it
once constructed and failed at a later seam; `config.store`'s shape is not checked at
construction.
Validation also covers what the types already rule out for a
JavaScript caller — an unrecognized `captureMode` or `ackMode`, an `expiry` or `sod` of the
wrong shape, an empty profile or leg id, a `terminalRefusals` member that could never take
effect — each with the same `invalid profile` message, never a raw `TypeError` (the
review-hardening pass, 2026-09-05). Each profile is read once into a frozen plain-data
copy, and the instance keeps only the copy: a profile must be plain data (object literals,
arrays, primitives — a class instance, accessor, non-enumerable property, `Object.create`
object, `Set`, `Map`, sparse array or `Proxy` throws, naming what it found); an unknown
data-valued key throws (an unknown function-valued key, a host code reference, is ignored; a
function in a profile field, or a redemption field placed outside `redeem`, throws); an
explicit `undefined` is an absent field (a redemption field outside `redeem` still throws)
and `null` is refused; each of `expiry.ttl`, `redeem.confirmToRedeem`, `redeem.redeemBound` and
every `freshness` value is a positive integer of at most 3,155,760,000 seconds (100 years),
the unbounded spelling being to omit the field (`'none'` for expiry); a `terminalRefusals`
member must be producible by the leg (`sod-violation` needs `sod` or `proposer`,
`policy-drift` a `policySource`, `ineligible` `eligibility`, `consultation-failed`
`requiredConsultations`, `consultation-stale` `freshness`, `ack-missing`/`ack-stale`
`ackMode` with `requiredAcks`); and a canonicalizer registry entry must be a function. Mutating
your profile object after `create()` changes nothing the instance enforces or digests, and
`profileDigest(profile)` on a profile as you passed it to `create()` equals the digest the
instance binds. A record opened under a profile this build refuses cannot be served after an
upgrade (see the integration guide's profile design). Returns the two frozen
capability-split handles. Profiles are
never persisted. (`createWithClock` exists in source as an internal test seam and is
deliberately not exported — that absence is a decision of record, not an omission.)

### `Config`

```ts
interface Config {
  profiles: ConfirmProfile[];
  store: Store;
  canonicalizers: Record<string, Canonicalizer>; // keyed by canonicalizerRef
  signing?: SigningConfig;                       // AL2 hook — see Signing below
}
```

### `ConfirmProfile`

```ts
interface ConfirmProfile {
  id: string;                                // RECOMMENDED "<domain>.<subject>.v<n>"; non-empty,
                                             // or construction throws
  subject: { canonicalizerRef: string };     // must resolve in config.canonicalizers
  legs: LegSpec[];                           // ordered; >1 switches on separation of duties;
                                             // an array with at least one leg, or construction throws
  captureMode: 'staged' | 'live';            // anything else throws at construction
  expiry: { ttl: number } | 'none';          // ttl in seconds, at most 3155760000; any other shape
                                             // throws at construction
  policySource?: string;                     // switches on policy-drift notarization
  redeem?: {                                 // presence declares the effect seam
    confirmToRedeem?: number;                // seconds (at most 3155760000): confirm → redemption start
    redeemBound?: number;                    // seconds (at most 3155760000): a redeeming record may dangle
    reverify?: boolean;                      // live mode's re-verification tail
    result?: true;                           // literal true — admits a result digest at
                                             // redeem()/completeRedemption() (below)
  };
  signing?: true;                            // literal true — AL2 per-profile enablement
}

interface LegSpec {
  id: string;                                // non-empty and unique within the profile
  allowedAuthorities: string[];              // identity-authority allowlist — non-empty, distinct,
                                             // non-empty strings; anything else throws at construction
  sod?: { notActorOf: string[] };            // prior legs this leg's actor must differ from;
                                             // notActorOf must be an array, or construction throws
  proposer?: string;                         // a principal barred from finalizing this leg
  ackMode?: 'self' | 'counterparty' | 'any'; // anything else throws at construction
  requiredAcks?: string[];                   // finding kinds whose acks gate finalize
  requiredConsultations?: string[];          // consultation kinds required, in order
  freshness?: Record<string, number>;        // per-kind max age (seconds, at most 3155760000)
                                             // of observedAt claims
  eligibility?: string;                      // eligibility authority — implicit-first consultation
  decline?: true;                            // literal true — opts this leg into operator.decline()
  terminalRefusals?: RefusalCode[];          // codes that append open → refused; a member that is
                                             // not a registry code, a never-appends code,
                                             // `chain-compromise`, a duplicate, or one this leg
                                             // cannot produce throws at
                                             // construction (leg-expired and availability stay
                                             // legal — SPEC §8 names them inert)
}
```

## The agent surface

```ts
interface AgentSurface {
  stage(content: unknown, profileId: string, subjectRef: string, legId?: string):
    Promise<Outcome<{ stagedRef: string }>>;
  getRecord(recordId: string): Promise<DecisionRecord | null>;
  readChain(recordId: string): Promise<Transition[]>;
  chainHead(recordId: string): Promise<Digest | null>;
}
```

`stage` digests the content through the profile's canonicalizer and persists a digest-only
staged draft. `subjectRef` must be a string that is non-empty, well-formed UTF-16, free of
U+0000 and at most 1,024 bytes in UTF-8; anything else **throws** `stage: subjectRef …` before
the profile is resolved and writes no draft (a caller error, not a refusal — there is no code
for it). A canonicalizer that returns a thenable, or output holding a non-plain object or an
ill-formed string, makes `stage` throw (the other content seams refuse the first two the same way and treat an ill-formed string as ordinary drift) as a configuration fault, with no draft written. `legId` omitted means the profile's first leg; a named leg absent from the
profile refuses `unknown-leg`. The three reads are pure. `getRecord` answers `null` for an
unknown `recordId` and **throws** when the store hands back a chain whose rows carry another
record's id — foreign persisted data, a storage fault rather than a domain outcome (SPEC §8;
see the chain-binding note under the operator surface). `readChain` and `chainHead` are the
raw reads: they return what storage holds and check nothing, a transition's own `recordId`
saying whose it is. Nothing on this handle transitions a record — asserted by its own test.

## The operator surface

```ts
interface OperatorSurface {
  // lifecycle
  open(stagedRef: string, opts?: OpenOptions): Promise<Outcome<{ recordId: string }>>;
  review(recordId: string): Promise<Outcome<ReviewView>>;
  finalize(
    recordId: string,
    identity: IdentityAssertion,
    content: unknown,
    facts: { figures: unknown; checker: IdentityAssertion },
    opts?: FinalizeOptions,
  ): Promise<Outcome<{ recordId: string; state: 'confirmed'; transitionRef: Digest }>>;
  decline(
    recordId: string,
    identity: IdentityAssertion,
    content: unknown,
    facts: { figures: unknown; checker: IdentityAssertion },
    opts?: DeclineOptions,
  ): Promise<Outcome<{ recordId: string; state: 'declined'; transitionRef: Digest }>>;

  // findings flow (SPEC §10.2) — the only appends between opened and the decision
  raiseFinding(recordId: string, finding: FindingInput, identity: IdentityAssertion):
    Promise<Outcome<{ recordId: string; state: 'open'; transitionRef: Digest }>>;
  acknowledge(recordId: string, ack: AckInput, identity: IdentityAssertion):
    Promise<Outcome<{ recordId: string; state: 'open'; transitionRef: Digest }>>;

  // the effect seam (SPEC §11.2)
  redeem(recordId: string, content: unknown, opts?: RedeemOptions):
    Promise<Outcome<{ recordId: string; state: 'redeemed'; transitionRef: Digest }>>;
  beginRedemption(recordId: string, content: unknown, opts?: RedeemOptions):
    Promise<Outcome<{ recordId: string; state: 'redeeming'; token: string; transitionRef: Digest }>>;
  completeRedemption(recordId: string, token: string, content: unknown, opts?: RedeemOptions):
    Promise<Outcome<{ recordId: string; state: 'redeemed'; transitionRef: Digest }>>;

  // retirement
  seal(recordId: string):
    Promise<Outcome<{ recordId: string; status: 'retired'; transitionRef: Digest }>>;

  // audit (not Outcome-shaped: an unknown record is a caller-error throw; for another
  // record's rows read back under this id, see the chain-binding note below)
  replay(recordId: string): Promise<DecisionRecord>;
  verifyChain(recordId: string): Promise<ChainVerifyReport>;
  verifySignatures(recordId: string): Promise<SignatureReport>;

  // reads
  getRecord(recordId: string): Promise<DecisionRecord | null>;
  readChain(recordId: string): Promise<Transition[]>;
  chainHead(recordId: string): Promise<Digest | null>;
  listDue(): Promise<string[]>;              // the sweep's read: record ids past a pending bound
}
```

Notes that save debugging time:

- `open`'s options carry `priorRecordRefs` (multi-leg) and `supersedes` (recovery) — both
  verified by replay before any append, their failures pre-record refusals
  (`prior-leg-unverified`, `supersedes-unverified`) that never append, and each needs the
  referenced record's profile held (its id registered, its declarative fields unedited) — and
  `policyDigest`,
  which is presence-checked against the profile's `policySource` declaration (a mismatch
  throws) and bound verbatim as the operator's attestation; the drift comparison happens
  at finalize's own gate.
- `open`'s `proposed: { stagedRef }` binds into the genesis, as `proposedDigest`, the
  digest of the draft the store holds under that reference when the record opens: the ref
  resolves through the store exactly as `stagedRef` itself does — re-derivation check
  included (next note) — and the resolved draft's `(profileId, subjectRef, legId)` must
  equal the opened draft's. Both failure modes THROW, never refuse — an unresolvable ref
  (the ordinary unknown-`stagedRef` caller-error posture) and a resolved draft naming a
  different triple (naming both triples in the message) are host wiring bugs, not domain
  outcomes. Same-ref is legal and meaningful — opening the proposal itself with `proposed`
  naming that same draft records unchanged acceptance, digests equal. The honest bound, in
  the same breath: it proves the store held a draft with that digest under the named
  reference, re-deriving to it, for the same triple at open, and — by comparing it against
  `contentDigest` — whether the decision matched or changed it; it never proves who
  authored or staged either draft, and never that the revision was sound. Nothing gates on
  it, ever; `DecisionRecord.proposedDigest` carries
  it (present-iff-supplied) and `ReviewView` does not project it (the `supersedes`
  precedent — provenance rides `getRecord`/`replay`, never the review projection).
- `open` binds a staged draft — the opened one, and the `proposed` one — only if it
  re-derives to the reference it was read under: the draft's `id`, and the content-derived
  reference over its `contentDigest`, `profileId`, `subjectRef` and `legId`, must both equal
  that reference. Otherwise `open` throws naming the reference and appends nothing — a
  draft edited in storage is a storage fault, never a refusal — so a custom `Store`'s
  `getStaged` must return the fields `putStaged` was given (it may add keys; `open` reads
  only those five). The bound: this makes a draft's fields unchangeable under the
  reference the host holds; it never authenticates who staged the draft — a whole new,
  self-consistent draft lives under its own reference, and is bound only if the host
  opens or proposes that one.
- `open` also re-checks the `subjectRef` rule (the one `stage` applies) on the opened draft and
  on a `proposed` one, after that re-derivation check, and throws `open: subjectRef …` (appending
  nothing) when a persisted draft breaks it — such a draft predates the rule or was written by
  something other than `stage`. An open record's own subject is never re-checked.
- `open` reads each option it uses once, on entry — each `priorRecordRefs` entry's
  `recordId` and `chainHead` included — and checks and binds only those values: for options
  of the declared types, a host that changes its options object, or an accessor on it,
  while the call is in flight changes nothing `open` verifies or records. An accessor that
  throws propagates as a caller error.
- `finalize`'s options carry `consultations` (the host's obtained domain checks, or
  per-kind unreachable markers) and `policy` (the live policy digest for the drift gate,
  or an unreachable marker — either unreachable form surfaces as the `unavailable`
  outcome).
- `decline` runs finalize's ladder with the evidence rungs removed: the authority rungs
  gate exactly as they do at finalize (chain-verify, state/expiry, identity +
  `allowedAuthorities`, separation of duties including the declared proposer,
  content-drift, `facts`, eligibility including its AL2 freshness bound), while
  `requiredConsultations` iteration and ack coverage are skipped — a "no" is never
  blockable by a missing or dead evidence source — and the seam takes no policy input at
  all (`DeclineOptions` carries only `consultations`; the presence contract there is the
  same attach form `FinalizeOptions.consultations` uses, so a reason rides as an ordinary
  consultation, e.g. a `decline-reason` kind). The recorded `declined { actor }` payload
  mirrors `confirmed`'s. Calling `decline` against a leg that does not declare
  `decline: true` **throws** — a non-declaring chain stays byte-identical to a
  pre-decline implementation over decline's own keys and transitions, so this is a
  caller/config error, never a domain refusal. That guarantee does not cover an
  already-broken chain: chain-verify runs first, so a leg that never declared
  `decline: true` can still acquire a `chain-compromise` refusal — with its own appended
  edge — if the chain itself fails verification before this check ever runs.
  The honest bound, in the same breath: a decline proves who declined what they saw —
  never that the decline was sound, and a "no" that never routed through this seam does
  not exist in the record.
- `beginRedemption`'s `token` is secret material returned exactly once and never
  persisted — the chain and store carry only its digest. Do not log it.
- All three redemption seams take an optional `opts: RedeemOptions`, whose `tx` field is
  the driver's own transaction handle: an enlisted issuance or completion commits or rolls
  back with the host's own outbox/effect row, and the enlisted-tampered corner refuses
  `chain-compromise` result-first with no edge, same as the direct shape.
- `opts.result`'s `digest` is admitted only where `redeem.result: true` is declared on the
  profile — declaring the field is what admits it, never a value; a declaring profile that
  redeems without supplying one records nothing (`resultDigest` stays absent). Two throw
  postures guard it: supplying `result` on a profile that does not declare `redeem.result`
  throws (a caller error at profile-resolution depth), and supplying `result` at
  `beginRedemption` throws unconditionally, declared or not — issuance precedes execution,
  so a result at issuance time would claim an outcome for an effect that has not run yet;
  supply it at `redeem()` or `completeRedemption()`, where the executor actually knows it.
  The honest bound, in the same breath: the digest notarizes that the host asserted this
  outcome at the moment it closed the coupling — the library never observes the effect,
  never verifies the claim (fidelity, not validity; verifying it would make the library the
  business system), and never mirrors business state that moves afterward. It is
  meaningful only where the outcome is genuinely known at the call — the enlisted
  co-located `redeem()` or a token `completeRedemption()` — never in an un-enlisted
  gate-then-execute flow, where the outcome is unknown at `redeem()` and the library cannot
  tell the difference; that is exactly why this is a stated discipline, not an enforced one.
  On a signing profile the binding is signature-covered like every transition; at AL1 it
  carries AL1's ordinary insider bounds.
- `verifySignatures` reports and never gates; enforcement is folded into the chain-verify
  arm at every seam on signing profiles. Its report type (`SignatureReport`) is exported
  from the entry point — the review's no-unspellable-names rule.
- **Every chain the library folds or verifies is bound to the `recordId` it was loaded for**
  (the chain-binding increment, 2026-11-17). The SQL backings key a read by a `record_id`
  column that the stored row's own JSON need not match, so a store can answer `readChain(X)`
  with another record's rows — the shape a storage-writing insider produces by copying record
  Y's rows under X's key, with no hashing and no signing. `verifyChain(X)` reports
  `{ intact: false, firstBreakSeq: 1, detail }`, the detail naming both ids (one foreign row
  inside X's own chain breaks at that row's seq). Every seam that acts on X — `finalize`,
  `decline`, `raiseFinding`, `acknowledge`, the three redemption seams, `seal` — refuses
  `chain-compromise` at its chain-verify rung, and the `refused` edge it appends, when the
  store admits one, is addressed to X, never to Y — Y is left exactly as it was (an enlisted
  redemption appends nothing, as for any compromised chain). `open()`'s `priorRecordRefs` and
  `supersedes` checks refuse `prior-leg-unverified` and `supersedes-unverified`. The reads that
  use a chain without verifying it — `getRecord` (both handles), `replay`, `review`,
  `verifySignatures` — and `open()`'s read of the record already holding the same
  `(profileId, subjectRef)` **throw** instead: the message contains `foreign persisted data`
  and names the read and both ids, and nothing is recorded on either record. An empty chain
  keeps its existing answer (`null` from `getRecord`, the unknown-record throw elsewhere), and
  `readChain`/`chainHead` stay raw. That throw compares each row's `recordId` only, so a
  relabelled copy — every row's `recordId` rewritten to X in place, links not recomputed —
  passes `getRecord`, `replay` and `review` silently, as any in-place edit always has;
  `verifyChain` and the seams catch it at the genesis link. With `config.signing` set, that compromise edge is signed
  even on a record whose profile does not sign, when the process has not yet cached that
  record's own signing decision: the decorator will not take the decision from another
  record's genesis, and signing is the fail-safe direction. The honest bound, in the same
  breath: this detects a chain relocated under another record's id. It does not make
  whole-record absence visible, and an insider who rewrites every copied row's `recordId` and
  recomputes every link still produces a chain that verifies at AL1 — the recompute and
  head-edit residuals SPEC §13A names are unchanged, and AL2 closes them only under SPEC §14's
  three conditions — the signing key outside that insider's boundary, every registered profile
  signing, and no signature outliving an uncommitted append, which this build does not yet
  meet.
- SPEC §11.2 names one redemption verb; the three names here (`redeem`, `beginRedemption`,
  `completeRedemption`) are this build's own, ratified at the 2026-08-19 review.

The option and input types those signatures name — all exported (the review's
no-unspellable-names rule):

```ts
interface OpenOptions {
  priorRecordRefs?: PriorRecordRef[];        // multi-leg successor evidence, verified by replay
  policyDigest?: Digest;                     // the operator's open-time policy attestation
  supersedes?: SupersedesRef;                // recovery claim — { recordId, chainHead }
  proposed?: { stagedRef: string };          // provenance binding — resolved, same-triple-checked
}
interface PriorRecordRef { recordId: string; chainHead: Digest }

interface FinalizeOptions {
  consultations?: ConsultationInput[];       // the host's obtained consultations, attach-form
  policy?: PolicyInput;                      // required iff the profile declares policySource
}
interface DeclineOptions {
  consultations?: ConsultationInput[];       // same attach-form as FinalizeOptions.consultations;
                                              // no policy member — the seam takes no policy input
}
interface RedeemOptions {
  tx?: unknown;                              // the driver's own transaction handle (SPEC §12) —
                                              // never a library-owned transaction interface
  result?: { digest: Digest };               // the host's CLAIMED outcome digest, admitted iff the
                                              // profile declares redeem.result — see below
}
type ConsultationInput = ObtainedConsultation | UnreachableMarker;
interface ObtainedConsultation {
  kind: string; checker: IdentityAssertion; payloadDigest: Digest;
  verdict: 'pass' | 'fail'; proofRef?: string;
  observedAt?: string;                       // AL2's checker-claimed observation time
}
interface UnreachableMarker { kind: string; unreachable: true; authority: string }
type PolicyInput = { digest: Digest } | { unreachable: true; authority: string };
```

## The outcome model

```ts
type Outcome<T> =
  | { status: 'ok'; value: T }
  | { status: 'refused'; code: RefusalCode; class: 'refusal' | 'compromise'; transitionRef?: Digest }
  | { status: 'unavailable'; code: 'availability'; authority: string };
```

Domain refusals are returned, never thrown. Exceptions are reserved for caller/config
errors and storage faults where nothing was recorded. `transitionRef` is present only when
the refusal actually appended a transition.

One refusal describes a race rather than an input. When `finalize`, `decline`, `raiseFinding`
or `acknowledge` loses its append to a concurrent state-preserving append on the same record (a
finding raised or acknowledged between the seam's chain read and its write), it returns
`{ status: 'refused', code: 'record-contended' }`: nothing was recorded, the record is unchanged
and still open, and re-invoking re-runs the whole gate ladder against the new head — so a
required-kind finding raised in between now gates. The seam never retries the append itself. A
genuine storage fault at the same site stays a throw, told apart by a one-time re-read.

### Refusal codes

25 codes against the current tree. Class `refusal` unless noted.

| Code | Fires when |
|---|---|
| `content-drift` | Supplied content re-digests differently from the bound digest |
| `identity-authority-refused` | The asserted authority is not in the leg's allowlist |
| `record-exists` | Opening over an existing non-terminal record for the same profile+subject (never appends) |
| `leg-expired` | The record is expired, or a lapsed expiry window just resolved it en passant at the seam |
| `consultation-missing` | Missing/malformed `facts`, or a required consultation absent |
| `chain-compromise` | Chain verification failed — class **`compromise`**; records itself wherever the record's state still admits an append |
| `record-not-open` | Finalize or decline against a record not in `open` (never appends) |
| `unknown-profile` / `unknown-leg` | Resolution failures (never append): an unknown id — or, for `unknown-profile`, a registered same-id profile whose data-only projection does not digest to the record's genesis `profileDigest`, at every seam that resolves a record |
| `unredeemable-state` / `unsealable-state` | The seam's state gate: nothing redeemable/sealable there (never append) |
| `effect-mismatch` | Redemption content differs from the confirmed content (never appends) |
| `already-redeemed` | The at-most-once gate (never appends) |
| `redemption-timeout` | A redeeming record's bound lapsed — the resolution edge is `redemption-failed`; this code itself never appends a refused edge |
| `prior-leg-unverified` / `supersedes-unverified` | A multi-leg or recovery reference failed verification at `open` (pre-record, never append) |
| `sod-violation` | The finalizing or declining actor is a recorded prior-leg actor or the declared proposer |
| `consultation-failed` | A required consultation's verdict is `fail` |
| `availability` | Class **`availability`** — a required authority unreachable; carried by the `unavailable` status, never a refused edge |
| `ineligible` | The eligibility check refused this actor |
| `policy-drift` | The live policy digest differs from the bound one |
| `ack-missing` / `ack-stale` | Findings-flow coverage: no ack, or no *counting* ack, for a required-kind finding |
| `record-contended` | A decision or findings seam lost its append to a concurrent finding or acknowledgment on the same record — nothing recorded, the record still open; re-invoke (never appends; findings-flow profiles only) |
| `consultation-stale` | A freshness-bounded consultation's `observedAt` claim is missing, future, or out of bound |

Append behavior: `chain-compromise` appends wherever the state admits it; `availability`
never appends; the codes marked "never appends" (a set that includes every redemption-seam
refusal) never do; every other refusal appends `open → refused` iff the leg's
`terminalRefusals` lists it, else the record stays open. `leg-expired` and `availability`
are legal in `terminalRefusals` but inert — SPEC §8 names them so an adopter is not
trapped configuring a control that can never fire.

## Core types

**`IdentityAssertion` is exact.** Every seam that takes one — the finalize/decline actor, the
finding raiser and acker, an obtained consultation's `checker`, `facts.checker` — rejects an
object carrying any key other than `principal`, `authority` and `proofRef`, or a `proofRef`
that is not a string (an explicit `undefined` is fine). Build it from the three fields; never
pass a session or user object through. The chain is immutable and digested, and an extra key
is how an e-mail address or a bearer token ends up in it for good (SPEC §6, §13). At
`finalize`/`decline` the rejection is the refusal `identity-authority-refused`; at
`raiseFinding`/`acknowledge` and for a consultation's `checker` it is a thrown caller error;
for `facts.checker` it is `consultation-missing`.

```ts
type Digest = string;                        // "sha256:<hex>"

interface IdentityAssertion {
  principal: string;
  authority: string;                         // conventions: oidc:<issuer> | session:<app> | mtls:<service> | dev-stub
  proofRef?: string;
}

interface Transition {
  recordId: string;
  seq: number;                               // 1-based, +1 per transition
  at: string;                                // RFC 3339 UTC
  kind: TransitionKind;
  payload: unknown;
  prevHash: Digest;
}

type RecordState =
  | 'open' | 'confirmed' | 'refused' | 'expired' | 'declined'
  | 'redeeming' | 'redeemed' | 'redemption-failed';   // last three: effect-seam profiles
                                                       // 'declined': terminal always

type TransitionKind =
  | 'opened' | 'consultation-recorded' | 'confirmed' | 'refused' | 'expired' | 'declined' | 'sealed'
  | 'finding-raised' | 'acknowledged'
  | 'redeeming' | 'redeemed' | 'redemption-failed';

interface DecisionRecord {                   // the replay fold — derived, never stored
  id: string;
  profileId: string;
  profileDigest: Digest;                     // the profile's data-only projection digest bound at genesis (SPEC §4); the seams compare their registered profile against it
  legId: string;
  subjectRef: string;
  contentDigest: Digest;
  policyDigest?: Digest;
  priorRecordRefs?: RecordedPriorLegRef[];   // multi-leg evidence — { recordId, chainHead, legId }
  priorLegActors?: IdentityAssertion[];      // (RecordedPriorLegRef, RecordedFinding, RecordedAck,
                                             //  and SupersedesRef are all exported names)
  supersedes?: SupersedesRef;                // { recordId, chainHead }
  proposedDigest?: Digest;                   // agent-proposed draft's digest, resolved+bound at
                                             // open()'s `proposed` option — never projected into
                                             // ReviewView (the supersedes precedent)
  actor?: IdentityAssertion;
  resultDigest?: Digest;                     // the host's CLAIMED effect-outcome digest, folded
                                             // from the redeemed payload — present iff supplied
                                             // under a result-declaring profile; never projected
                                             // into ReviewView (a redeemed record is past review)
  findings?: RecordedFinding[];
  consultations: Consultation[];
  state: RecordState;
  status: 'active' | 'retired';              // 'retired' once a sealed transition caps the chain
  refusalCode?: RefusalCode;
}

interface ReviewView {                       // review()'s content-free projection
  recordId: string; profileId: string; legId: string; subjectRef: string;
  contentDigest: Digest; state: RecordState; consultations: Consultation[];
  policyDigest?: Digest; refusalCode?: RefusalCode;
  findings?: { findingId: string; kind: string; findingDigest: Digest; magnitude?: string;
               coverage: 'covered' | 'ack-missing' | 'ack-stale' | 'not-required' }[];
}

interface Consultation {
  kind: string;                              // 'facts' and 'chain-verify' are library-reserved
  checker: IdentityAssertion;
  at: string;                                // library-stamped recording time
  payloadDigest: Digest;
  verdict: 'pass' | 'fail';
  proofRef?: string;
  observedAt?: string;                       // checker-claimed observation time (signing profiles)
}

interface StagedDraft {                      // digest-only; content never persisted
  id: string; profileId: string; legId: string; subjectRef: string; contentDigest: Digest;
}

type ChainVerifyReport =
  | { intact: true }
  | { intact: false; firstBreakSeq: number; detail: string };
```

## Helpers

```ts
function canonicalize(structure: unknown): Uint8Array;  // the library's canonical JSON bytes
function digest(input: Uint8Array | string, algorithm?: DigestAlgorithm): Digest;
type DigestAlgorithm = 'sha256';                        // the supported set today
type Canonicalizer = (content: unknown) => unknown;     // YOUR projection: synchronous, run before canonicalize

// The pure audit functions (SPEC §5), exported beside their operator-handle forms for
// the offline case: an archived chain — a sealed record's, say — replays and verifies
// with no store and no handle.
function replay(chain: readonly Transition[]): DecisionRecord;
// verifyChain recomputes four things: the genesis link, every prevHash, seq continuity, and
// record identity. Pass the recordId the chain should belong to — the id you fetched it for,
// or the one an archived chain is supposed to be — and every transition must name it and the
// genesis link must derive from it, so another record's chain reports a break at seq 1. Omit
// it and identity is checked against the genesis row's own recordId: a spliced foreign
// transition with recomputed links still reports a break, but a whole chain belonging to
// another record verifies intact, because it is compared only with itself.
function verifyChain(chain: readonly Transition[], recordId?: string): ChainVerifyReport;

// The profile binding (SPEC §4's `profileDigest`): the data-only projection of a profile —
// every declarative field, every function member stripped — and its digest, which is what the
// `opened` payload's `profileDigest` holds. Exported so you can compare an archived chain's
// genesis binding against the profile you hold; `verifySignatures(recordId).genesisProfile`
// makes the same comparison for a live record.
function projectProfile(profile: ConfirmProfile): unknown;
function profileDigest(profile: ConfirmProfile): Digest;
```

`canonicalize` serializes with RFC 8785 and **throws** on a value with no JSON form: a `Map`,
a `Set`, a Promise, a class instance (one holding only `#private` state included) or a boxed
primitive anywhere in the structure, naming the constructor. A plain object (one from another realm included), an object with a
`null` prototype and an array serialize; `toJSON` is honored, so a `Date` is its ISO string.
It **escapes** a lone surrogate (as a "backslash-u" escape, which RFC 8785 would refuse)
rather than throwing, so a chain persisted with one still verifies; only `stage`'s content
binding (a canonicalizer's output) refuses an ill-formed string instead, and `canonicalize` has
no mode to ask for that. A canonicalizer must be synchronous: a
returned thenable is a configuration fault at the seam that binds it. `digest` hashes a
`Uint8Array` as given; a `string` input is hashed as UTF-8 and must be well-formed UTF-16, or
`digest` throws a `TypeError` (it used to collapse each lone surrogate to U+FFFD, so two
different strings digested the same). The bytes a well-formed string hashes to are unchanged.

## Stores

```ts
class MemoryStore implements Store {         // reference semantics; nothing durable
  readonly signatures: SignatureStore;       // its own sidecar, a map beside its records
}
class SqliteStore implements Store {         // embedded node:sqlite backing
  constructor(location: string);             // a file path, or ':memory:'
  readonly database: DatabaseSync;           // the connection — the handle an enlisting tx passes
  readonly signatures: SignatureStore;       // its own sidecar: a table on this connection
  close(): void;                             // closes it; not a Store method (the other backings
                                             // have nothing of their own to close)
}

interface Store {                            // behaviors stable; signatures provisional pre-1.0
  putStaged(staged: StagedDraft, tx?: unknown): Promise<void>;
  getStaged(stagedRef: string): Promise<StagedDraft | null>;
  appendTransition(expectedCurrentState: RecordState | null, transition: Transition,
                   meta: AppendMeta, tx?: unknown): Promise<AppendResult>;
  appendBatch(expectedCurrentState: RecordState, transitions: readonly Transition[],
              meta: AppendMeta, tx?: unknown): Promise<BatchResult>;
  readChain(recordId: string): Promise<Transition[]>;
  chainHead(recordId: string): Promise<Digest | null>;
  listDue(now: Date): Promise<string[]>;
  findNonTerminal(profileId: string, subjectRef: string): Promise<string | null>;
  readonly signatures?: SignatureStore;      // OPTIONAL: a sidecar persisted atomically with
}                                            // this store's own appends (below)

interface AppendMeta {                       // SPEC §12's per-append metadata, persisted verbatim
  nonTerminal: boolean;
  dueAt?: string;                            // presence sets the pending clock; absence clears it
  signatures?: readonly SignatureEntry[];    // not one of §12's fields: the entries a store
}                                            // exposing `signatures` writes with this append
```

Both store classes are public but explicitly unstable pre-1.0 (their own doc comments say
so). `AppendMeta`, `AppendResult`, and `BatchResult` are exported alongside `Store`. A new
backing proves itself against the conformance suite at
`packages/record/test/conformance/store-conformance.ts`.

**`Store.signatures` — the integrated sidecar.** Optional, and not one of the eight methods
SPEC §12 names: a `SignatureStore` the store persists atomically with its own appends. A store
that exposes it and receives `meta.signatures` on `appendTransition` or `appendBatch` requires
exactly one entry per appended transition, in order, each naming that transition's own
`transitionDigest`, `recordId` and `seq`, or it throws a caller error before writing anything;
writes the entries inside the append's atomic unit, after every compare-and-swap and constraint
check has passed, upserting by `transitionDigest` as `put` does; writes none when the append
does not apply (every conflict arm); and, with a host `tx`, writes them through that
transaction, so they commit or roll back with it. Outside an append it is an ordinary
`SignatureStore` over the same storage. It must be one stable object for the store's lifetime,
because identity is what selects it: the signing decorator hands entries down as
`meta.signatures` only when `config.signing.signatures` IS this object, decided once when the
instance is built, and otherwise writes each entry itself with `put` before the append (separate
mode) — so a store without `signatures` never receives the field. All three reference stores
expose it — `MemoryStore` over a private map, `SqliteStore` over a `signatures` table on its own
connection (created with the schema, so an existing file gains it on open), and
`@vidimera/store-postgres`'s `PostgresStore` over a `signatures` table in its schema (created by
the lazy DDL on first use) — and the conformance suite registers an integrated-sidecar block for
every backing that exposes one. Each SQL store owns four tables, `staged`, `records`,
`transitions` and `signatures`, in its database file (SQLite) or schema (Postgres), creating them
with `IF NOT EXISTS` and never altering one: a pre-existing table of one of those names with
another shape makes the store throw — on SQLite at open and on Postgres at every call when an
index it creates names a missing column, otherwise at the first statement that needs one
(`integrating.md`'s "Choosing a store" gives the cases). Two limits, stated with it: an existing
deployment switching modes, in either direction, must stop every instance that writes to the
store, copy the entries with `put` into the sidecar the new configuration will read, and only
then start instances on the new configuration alone — an entry left in the other sidecar makes
its record read unsigned and refuse `chain-compromise`, and two configurations run against one
store at once (a rolling restart, say) each write entries the other cannot see, so the next
verifying seam appends a terminal `chain-compromise` edge on a healthy record (the library
migrates nothing); and a store wrapper must expose the inner store's `signatures` and forward
`meta` intact, or it runs in separate mode — or, exposing `signatures` while dropping
`meta.signatures`, lands its transitions unsigned, which the next seam refuses
`chain-compromise`. `integrating.md`'s AL2 section states both modes.

### Adapter authors

SPEC §12 contemplates third-party `Store` adapters directly ("A third-party `Store`
adapter implementer MUST honor the contract below"), and the helpers a conforming backing
needs — and cannot re-derive without drifting — are exported for exactly that use:

```ts
function transitionDigest(transition: Transition): Digest;  // the store recomputes each
                                                            // appended transition's digest
                                                            // for its AppendResult
function stateOf(kind: TransitionKind): RecordState | null; // null = state-preserving kind
function isStateLeaving(kind: TransitionKind): boolean;     // C3's subject
function isCompromiseCarveOut(transition: Transition,       // C3's second carve-out
                              expectedCurrentState: RecordState): boolean;
interface GenesisPayload { profileId: string; subjectRef: string }  // the two genesis-payload
                                                            // fields C1 exclusivity reads
                                                            // (the payload itself carries more)
function signatureEntriesToWrite(storeName: string,         // the integrated sidecar's
  transitions: readonly Transition[],                       // entry check, for a store that
  meta: AppendMeta): SignatureEntry[] | undefined;          // exposes `signatures`
```

`signatureEntriesToWrite` is the one entry check all three reference backings run on an
append's `meta.signatures`. It returns `undefined` when the field is absent. Otherwise it
requires an array with exactly one entry per appended transition, in order, each an object
naming that transition's own `transitionDigest`, `recordId` and `seq`, with a string `keyRef`
and a string `signature`; anything else throws an `Error` whose message starts
`<storeName>: meta.signatures`. On success it returns one fresh object per entry holding exactly
the five `SignatureEntry` fields, each read from the caller's entry once — extra members are
dropped. It touches no store state, so a backing calls it before any other check and writes
what it returns.

`@vidimera/store-postgres` (this workspace's server-SQL backing) is the reference consumer
of this surface.

## Signing (AL2) — structural today

`Config.signing` takes `{ signer, verifiers, signatures }`:

```ts
type Signer   = (bytes: Uint8Array) => Promise<{ keyRef: string; signature: string }>;
type Verifier = (bytes: Uint8Array, signature: string) => Promise<boolean>;
interface SignatureStore {
  put(entry: SignatureEntry): Promise<void>;             // upsert by transitionDigest: at most one
                                                         // entry per digest, never two
  listByRecord(recordId: string): Promise<SignatureEntry[]>;
                                                         // chain order NOT guaranteed — the caller
                                                         // correlates by transitionDigest
                                                         // (chain-driven, never sidecar-driven)
}
interface SignatureEntry {
  transitionDigest: Digest; recordId: string; seq: number; keyRef: string; signature: string;
}
interface SignatureReport {                              // verifySignatures()'s return
  recordId: string;
  signingDeclared: boolean;
  transitions: { seq: number; transitionDigest: Digest; signed: boolean;
                 keyRef?: string; verified: boolean }[];
  orphans: Digest[];                                     // sidecar digests naming no chain
                                                         // transition — sorted; reporting only
  genesisProfile:                                        // the genesis profile, as the chain binds
    | { resolution: 'matches'; profileId: string; digest: Digest }        // it and as THIS
    | { resolution: 'drifted'; profileId: string;                          // instance holds it;
        boundDigest: Digest; liveDigest: Digest }                          // reporting only
    | { resolution: 'unresolvable'; profileId: string | undefined;
        boundDigest: Digest | undefined };
}
```

**`signingDeclared` is computed from the live profile, and `genesisProfile` says whether that
profile is the one the record was opened under.** The genesis `profileId` is resolved against
the profiles *this instance* holds; a same-id profile that has since dropped `signing: true`
— or an instance that does not hold the id at all — makes a signing record read
`signingDeclared: false` — and that instance does not HOLD the record's profile, so every
operator seam it resolves the record at refuses `unknown-profile`, never-append (a successor
leg's `open()` refuses `prior-leg-unverified` and a `supersedes` claim is checked as
this paragraph goes on to state). `genesisProfile` qualifies
that reading: `matches` when the live profile's data-only projection digests to the genesis
`profileDigest`, `drifted` when the id resolves to a profile that digests differently
(`signing` is a covered field, so is every other declarative field — a `ttl` edit lands here
too), `unresolvable` when there is nothing to compare against.
The field itself is reporting only, exactly as `orphans` is, and it reads the same way in the
other direction: a same-id profile that has since ADDED `signing: true` makes a never-signed
record read `signingDeclared: true`. No seam enforces on this reading alone. The obligation a
seam applies to the signature layer is the held profile's `signing` when the instance holds
the record's profile, and otherwise `signingDeclared` AND a genesis transition whose sidecar
entry this instance's verifier accepts. So an instance that does not hold the profile
enforces the layer only on a chain whose genesis entry verifies under its own live signing
profile; a signing record whose genesis entry was removed, fails, or names a key it holds no
verifier for reads there as carrying no obligation. Per site: the operator seams refuse
`unknown-profile` and append nothing, where a holder would draw `chain-compromise`; a
successor leg's `open()` refuses `prior-leg-unverified`; and a `supersedes` claim over a
predecessor of any terminal state refuses `supersedes-unverified` (recovery needs the
predecessor's profile held). Where the obligation does apply and the layer fails, an
operator seam draws its `chain-compromise` evidence edge first, holder or not (SPEC §4's
exception), and the cross-record verifications refuse their claims.
So `drifted` names exactly why a seam refused, or will — read the two fields together, and
treat `drifted` on any record as a configuration event: restore the profile's declarative
fields exactly, or keep the old version registered under its id and give the edit a new one.
An in-place edit strands that profile's open records until you do one of those, and it (or a
retired version) also blocks recovery (`supersedes`) of that profile's terminal records: keep prior
versions registered for as long as you may want to supersede their records. What is lost is the
verified `supersedes` link, not the subject — a terminal predecessor releases exclusivity, and a
plain `open` still works.

**A `Verifier` answers `true`, answers `false`, or throws only when it cannot answer.** The
contract has three outcomes and the layer treats each differently. `true` — the literal
`true`, compared with `===` — verifies the transition. Anything else it returns (`false`, or a
truthy status string or object) is an answer that the bytes and signature do not match: the
transition reads `verified: false` and refuses at every enforcement site. A signature the
verifier cannot parse — the wrong length, not valid base64 — is such a case: answer `false`
for it. A throw or a rejection is the verifier saying it could not answer at all — a key
service down, a timeout, a rate limit — and is a FAULT, not a verdict: wherever the signature
layer applies to a record and nothing else has decided it (below), the seam that needed the
answer throws and appends nothing, and a transient outage clears when the host makes the call
again; no retry inside the verifier is needed for that, and a verifier that cannot reach its
key should throw rather than guess. `operator.verifySignatures(recordId)` propagates the same
fault rather than report "could not ask" as "unverified". The thrown `Error` names the record,
the `seq` and the `keyRef`, says nothing was appended, and carries the verifier's own error as
`cause`; it says a transient outage clears on retry and that a fault which persists while the
verifier is otherwise healthy means the sidecar entry at that `seq` under that `keyRef` may be
malformed or planted — the `seq` and `keyRef` are how the operator finds it.

**A fault never outranks a definite miss.** Before any fault is rethrown, the layer looks for
a transition that is definitely unverified: no sidecar entry, an entry whose `keyRef` or
`signature` is not a string (it is never handed to your verifier, so a verifier that decodes
the signature cannot be made to throw by a planted `null`), a `keyRef` that is not one you
registered, or an answer other than the literal `true`. One such transition fails the layer
closed — the seam draws or refuses `chain-compromise`, a cross-record verification refuses its
claim — whatever another transition's verifier did (unless the faulting verifier is the one this instance signs under: its outage stops the
compromise edge's own mint check, which delays the edge until the verifier recovers), which is OPEN-QUESTIONS
§1's decided posture for a missing signature and an unresolvable key. The limits, in the same breath: the
fault is seen only where the layer applies — on a record held as non-signing, a junk sidecar
entry whose verifier throws changes no seam's outcome (the `verifySignatures` read still
propagates it); and on an instance that does not hold the record's profile, a fault at the
genesis throws even beside a miss elsewhere, because whether the layer applies there rests on
the genesis answer. Earlier versions read a throw as `verified: false`, which on a healthy
signing record drew a terminal `chain-compromise` edge during any outage — an edge the record
never recovers from.

**The mint check.** An instance refuses to land a signature its own registry cannot verify.
After the signer returns, the minted `keyRef` must be an own key of `verifiers` and that
verifier must answer the literal `true` over the same bytes; otherwise the seam throws and
nothing is put to the sidecar or appended. This holds even where the seam would have drawn a
`chain-compromise` edge: an instance that cannot verify its own key throws instead of
recording that edge. A batch (`finalize`'s success batch, `decline`'s) is minted and checked
whole before any entry is written, so a failure on one element leaves the sidecar as it was.
An empty `verifiers` registry still constructs (a prepared instance), and its first mint
throws. Limits: the check proves this instance's verifier accepts this signature, not that any
other instance holds that verifier — which is the rotation hazard below; and it couples
availability to that verifier — every signed append, `open()` included, needs the instance's
own verifier answering, so an outage of it makes those seams throw and defers even a
hash-break (AL1) `chain-compromise` edge, which never consults the layer, until the verifier
recovers.

**Key rotation takes two phases.** The library does no rotation; `keyRef` naming and key
distribution are yours, and a safe rollout has two halves. First, a NEW key's verifier must
reach every instance — including every configuration a deployment may roll back to — before
any instance signs with it. Second, a retired key's verifier stays registered under its
`keyRef` for as long as any record signed under it may be touched. An instance that lacks a
signer's verifier reads those entries as unverified (an unresolvable `keyRef` fails closed)
and refuses `chain-compromise` on records nobody tampered with: that is the hazard of a
one-phase rollout, a decided behavior and not a fault. A rolling deploy that signs with the
new key on the first instance, before the others hold its verifier, is exactly that rollout.

**The stuck-record limit, at its true width.** On an instance that holds the record's
profile, a seam persistently throws instead of drawing the evidence edge only when no
transition is a definite miss and some entry is a string your verifier cannot answer for (an
outage of the verifier this instance signs under delays any edge, by the mint check, until it
recovers — a delay, not a stuck record). A verifier that
throws on a malformed or planted signature string, rather than answering `false`, produces
exactly that: a record whose seams throw until the entry is repaired, with nothing appended
and nothing recording the tampering. (On an instance that does not hold the profile, a
genesis fault throws too, as above.) Have the verifier answer `false` for any signature it
cannot parse, and reserve a throw for being unable to ask; `verifySignatures` names the `seq`
and `keyRef` of the entry to inspect.

And `verifiers` is read as own keys only (`Object.hasOwn`), with the `keyRef` typed first: a
sidecar entry whose `keyRef` is not a string, or not a key you registered — including one
naming an inherited `Object.prototype` member such as `toString` — resolves no verifier and
fails closed. The sidecar is storage, and storage is what this layer exists to distrust.

**An implementer must tolerate orphans — how many depends on the mode.** An orphan is an entry
whose `transitionDigest` names no transition in the record's chain. Which mode an instance runs
is decided once, at construction: **integrated** when `config.signing.signatures` is
`config.store.signatures` (the store's own sidecar, `Store.signatures` above), **separate**
otherwise.

- *Integrated mode:* the store writes each entry inside the atomic unit of the append it signs,
  only once that append's checks have passed, so no entry outlives an uncommitted append — a
  lost compare-and-swap, a refusing seam against a record admitting no append target, a
  `record-contended` batch, `open()`'s re-stamped retry and a rolled-back enlisted seam all
  leave none. Orphans arise only from committed transitions an insider deleted or rewrote,
  whose entries stay behind, and from entries written by something other than an append (a
  planted entry, or a host's own `put`); the orphan of a deleted head may be the only trace of
  it, so keep or archive what you prune.
- *Separate mode:* a conforming `SignatureStore` will hold orphans as a normal state, not
  corruption: the library writes each entry *before* it appends, so a lost compare-and-swap or
  a crash leaves the entry behind, and a seam that refuses against a record admitting no append
  target leaves one on every such call. Two further producers are ordinary operation, not
  failure: a `finalize`/`decline` that loses its batch to a concurrent append leaves one entry
  per batch element (the batch is signed before the store adjudicates it — the
  `record-contended` case), and an `open()` whose expire-then-retry re-stamps its genesis under
  a moving clock leaves the first attempt's entry. Inert is not harmless: an orphan over a
  transition that was attempted and never committed is a valid signature over it, so an
  insider who writes that transition back into the chain where it was signed for is not caught
  (SPEC §14's third condition, which this mode does not meet); and the orphan of a head an
  insider deleted may be the only trace of it, so keep or archive what you prune.

In both modes orphans are inert to verification — every reader correlates from the chain to the
sidecar, never the reverse, so an orphan is never read for a verdict — and they are safe to
prune whenever no chain transition references them. The library performs no pruning, but it
tells you which entries are dead: `verifySignatures(recordId).orphans` names every sidecar
digest with no chain counterpart, sorted, at no read the call was not already making.
`SignatureStore` has no delete — only the reference `MemorySignatureStore` carries one, outside
the contract, and the three integrated sidecars expose none. In separate mode, a sidecar of your
own that must not grow without bound reconciles by deleting what that names. In integrated mode,
an orphan is evidence to keep — a committed transition deleted or rewritten, or a planted
entry — unless your own `put` wrote it; removing one is the host's own act, a SQL `DELETE` by
`transition_digest` against the store's `signatures` table (an implementation artifact, not an
API), and `MemoryStore`'s map cannot be pruned. Reconcile only when no seam call on the record is
in flight: in separate mode an in-flight append's entry and an orphan carry the same `seq`, and
in either mode the call reads the chain before it lists the sidecar, so an append that commits
between the two reads lists as an orphan. This is stated as an obligation, not enforced: nothing
in the library reads your implementation.

All of these names — plus `withSigning` (the store decorator) and the reference
`MemorySignatureStore` — are exported from the entry point: the 2026-08-19 review moved
the whole signing tier onto the root, beside the stores it mirrors. The handle `withSigning`
returns exposes exactly the eight `Store` methods — not `signatures`, which the instance reads
from `config.signing` — and a `SqliteStore`'s `close()` and `database` stay on the instance you
constructed, so keep that reference for shutdown and enlistment; on every reference store, take
the integrated sidecar from that reference too.

## Probes — the `./probes` subpath

`./probes` is the decided delivery shape (the sealed set's own ruling, OPEN-QUESTIONS §5's
"a public library subpath", confirmed at the 2026-08-19 review), and it is real in the
exports map — the packed tarball resolves it, and CI's smoke test exercises it on every
run. Inside this workspace, where everything runs from source, the deep import
`src/probes/index.js` is still how the tier is reached:

```ts
const ALL_PROBES: readonly Probe[];          // seventeen probes against the current tree
function runProbes(driver: ProbeDriver, opts?: { waivers?: Waiver[]; now?: () => Date }):
  Promise<ProbeReport>;
function assertSatisfied(report: ProbeReport): void;   // the CI hook — throws on fail,
                                                       // not-driven, or an expired waiver

interface ProbeDriver {
  makeConfig(): Config;
  sampleContent(profileId: string): { content: unknown; subjectRef: string };
  sampleIdentity(profileId: string, legId: string): IdentityAssertion;
  sampleConsultations?(profileId: string, legId: string): FinalizeOptions;   // optional hooks:
  severConsultationAuthority?(kind: string): Promise<() => Promise<void>>;   // absent hook ⇒
  disableRenderingCredential?(): Promise<() => Promise<void>>;               // probe reports
  restartPersistence?(): Promise<void>;                                      // 'not-driven'
}

type ProbeStatus = 'pass' | 'fail' | 'not-driven' | 'waived';
interface Waiver { probeId: string; reason: string; expires: string }        // RFC 3339, offset required
interface ProbeReport {
  results: { id: string; target: string; status: ProbeStatus; detail: string }[];
  satisfied: boolean;                        // NOT the CI verdict alone — check expiredWaivers too,
  expiredWaivers: Waiver[];                  // or just call assertSatisfied
  unusedWaivers: Waiver[];
}
```
