# API reference

**Derived from source, 2026-08-21.** This page enumerates the public surface as
`packages/record/src/index.ts` exports it against the current tree. The source and
[`../concept/SPEC.md`](../concept/SPEC.md) are authoritative; if this page disagrees with
either, this page is stale — file it as a bug. Two standing caveats: the pre-0.1 API
review (deferral register row 6) completed 2026-08-19, ratifying the 52 names exported then
(`docs/analysis/2026-08-19-phase-1-api-review.md`); the seven added since — the
adapter-author helpers below (`transitionDigest`, `GenesisPayload`, `isCompromiseCarveOut`,
`isStateLeaving`, `stateOf`) and the `DeclineOptions`/`RedeemOptions` bags — landed under
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
`config.signing` throws. Validation also covers what the types already rule out for a
JavaScript caller — an unrecognized `captureMode` or `ackMode`, an `expiry` or `sod` of the
wrong shape, an empty profile or leg id, a `terminalRefusals` member that could never take
effect — each with the same `invalid profile` message, never a raw `TypeError` (the
review-hardening pass, 2026-09-05). Returns the two frozen capability-split handles. Profiles are
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
  expiry: { ttl: number } | 'none';          // ttl in seconds; any other shape throws at construction
  policySource?: string;                     // switches on policy-drift notarization
  redeem?: {                                 // presence declares the effect seam
    confirmToRedeem?: number;                // seconds: confirm → redemption start
    redeemBound?: number;                    // seconds: a redeeming record may dangle
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
  freshness?: Record<string, number>;        // per-kind max age (seconds) of observedAt claims
  eligibility?: string;                      // eligibility authority — implicit-first consultation
  decline?: true;                            // literal true — opts this leg into operator.decline()
  terminalRefusals?: RefusalCode[];          // codes that append open → refused; a member that is
                                             // not a registry code, a never-appends code,
                                             // `chain-compromise`, or a duplicate throws at
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
staged draft. `legId` omitted means the profile's first leg; a named leg absent from the
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
- `open`'s `proposed: { stagedRef }` binds the agent's original proposal into the genesis
  as `proposedDigest`: the ref resolves through the store exactly as `stagedRef` itself
  does, and the resolved draft's `(profileId, subjectRef, legId)` must equal the opened
  draft's. Both failure modes THROW, never refuse — an unresolvable ref (the ordinary
  unknown-`stagedRef` caller-error posture) and a resolved draft naming a different
  triple (naming both triples in the message) are host wiring bugs, not domain outcomes.
  Same-ref is legal and meaningful — opening the proposal itself with `proposed` naming
  that same draft records unchanged acceptance, digests equal. The honest bound, in the
  same breath: it proves a draft with that digest existed in the store for the same
  triple at open, and — by comparing it against `contentDigest` — whether the decision
  matched or changed it; it never proves who authored either draft, and never that the
  revision was sound. Nothing gates on it, ever; `DecisionRecord.proposedDigest` carries
  it (present-iff-supplied) and `ReviewView` does not project it (the `supersedes`
  precedent — provenance rides `getRecord`/`replay`, never the review projection).
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
  head-edit residuals SPEC §13A names are unchanged, and AL2 closes them only when the signing
  key sits outside that insider's boundary.
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
type Canonicalizer = (content: unknown) => unknown;     // YOUR projection, run before canonicalize

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

## Stores

```ts
class MemoryStore implements Store {}        // reference semantics; nothing durable
class SqliteStore implements Store {         // embedded node:sqlite backing
  constructor(location: string);             // a file path, or ':memory:'
  readonly database: DatabaseSync;           // the connection — the handle an enlisting tx passes
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
}
```

Both store classes are public but explicitly unstable pre-1.0 (their own doc comments say
so). `AppendMeta`, `AppendResult`, and `BatchResult` are exported alongside `Store`. A new
backing proves itself against the conformance suite at
`packages/record/test/conformance/store-conformance.ts`.

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
```

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

**A `Verifier` answers the literal `true`, or the transition is unverified.** The layer
compares with `=== true`: a truthy status string or object is reported `verified: false` and
refuses at every enforcement site, exactly as a throwing verifier does. Two operational
consequences follow, because an unverified transition of a signing record is `chain-compromise`
at the seams — a terminal edge the record never recovers from: a verifier that can fail
transiently (a remote key service, a rate limit, a timeout) should retry inside itself rather
than throw, since the layer has no "unavailable" answer to give; and a retired key's verifier
stays registered under its `keyRef` for as long as any record signed under it may be touched,
because dropping it reads every such record as compromised at its next seam call. And `verifiers` is
read as own keys only (`Object.hasOwn`): a sidecar entry whose `keyRef` is not a key you
registered — including one naming an inherited `Object.prototype` member such as `toString` —
resolves no verifier and fails closed. The sidecar is storage, and storage is what this layer
exists to distrust.

**An implementer must tolerate orphans.** A conforming `SignatureStore` will hold entries
whose `transitionDigest` names no transition in the record's chain. That is a normal state,
not corruption: the library signs *before* it appends, so a lost compare-and-swap or a crash
leaves the entry behind, and a seam that refuses against a record admitting no append
target leaves one on every such call. Two further producers are ordinary operation, not
failure: a `finalize`/`decline` that loses its batch to a concurrent append leaves one entry
per batch element (the batch is signed before the store adjudicates it — the
`record-contended` case), and an `open()` whose expire-then-retry re-stamps its genesis under a
moving clock leaves the first attempt's entry. They are inert to verification — every reader
correlates from the chain to the sidecar, never the reverse, so an orphan is never read for
a verdict — and they are safe to prune whenever no chain transition references them.
The library performs no pruning, but it tells you which entries are dead:
`verifySignatures(recordId).orphans` names every sidecar digest with no chain counterpart,
sorted, at no read the call was not already making. A backing that must not grow without
bound reconciles by deleting what that names — when no seam call on the record is in flight,
since an in-flight append's entry and an orphan carry the same `seq`. This is stated
as an obligation, not enforced: nothing in the library reads your implementation.

All of these names — plus `withSigning` (the store decorator) and the reference
`MemorySignatureStore` — are exported from the entry point: the 2026-08-19 review moved
the whole signing tier onto the root, beside the stores it mirrors. The handle `withSigning`
returns exposes exactly the eight `Store` methods: a `SqliteStore`'s `close()` and `database`
stay on the instance you constructed, so keep that reference for shutdown and enlistment.

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
