# API reference

**Derived from source, 2026-08-19.** This page enumerates the public surface as
`packages/record/src/index.ts` exports it against the current tree. The source and
[`../concept/SPEC.md`](../concept/SPEC.md) are authoritative; if this page disagrees with
either, this page is stale — file it as a bug. Two standing caveats: the pre-0.1 API
review (deferral register row 6) completed 2026-08-19 — every name below is
review-ratified (`docs/analysis/2026-08-19-phase-1-api-review.md`), the store contract's
method signatures staying explicitly provisional pre-1.0 by the sealed set's own
declaration; and the package builds to `dist/` behind a real `exports` map (`.` and
`./probes`; CI packs and consumer-tests the tarball on every run) but stays `private: true`
and unpublished until the 0.1 cut — inside this workspace you still import from
`packages/record/src/index.js`, and the `@vidimera/record` forms shown here resolve from
the packed tarball.

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
`config.signing` throws. Returns the two frozen capability-split handles. Profiles are
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
  id: string;                                // RECOMMENDED "<domain>.<subject>.v<n>"
  subject: { canonicalizerRef: string };
  legs: LegSpec[];                           // ordered; >1 switches on separation of duties
  captureMode: 'staged' | 'live';
  expiry: { ttl: number } | 'none';          // ttl in seconds
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
  id: string;
  allowedAuthorities: string[];              // identity-authority allowlist
  sod?: { notActorOf: string[] };            // prior legs this leg's actor must differ from
  proposer?: string;                         // a principal barred from finalizing this leg
  ackMode?: 'self' | 'counterparty' | 'any';
  requiredAcks?: string[];                   // finding kinds whose acks gate finalize
  requiredConsultations?: string[];          // consultation kinds required, in order
  freshness?: Record<string, number>;        // per-kind max age (seconds) of observedAt claims
  eligibility?: string;                      // eligibility authority — implicit-first consultation
  decline?: true;                            // literal true — opts this leg into operator.decline()
  terminalRefusals?: RefusalCode[];          // codes that append open → refused; a member
                                             // that is not a registry code throws at construction
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
profile refuses `unknown-leg`. The three reads are pure. Nothing on this handle
transitions a record — asserted by its own test.

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

  // audit (not Outcome-shaped: an unknown record is a caller-error throw)
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
  (`prior-leg-unverified`, `supersedes-unverified`) that never append — and `policyDigest`,
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
  pre-decline implementation, so this is a caller/config error, never a domain refusal.
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

### Refusal codes

24 codes against the current tree. Class `refusal` unless noted.

| Code | Fires when |
|---|---|
| `content-drift` | Supplied content re-digests differently from the bound digest |
| `identity-authority-refused` | The asserted authority is not in the leg's allowlist |
| `record-exists` | Opening over an existing non-terminal record for the same profile+subject (never appends) |
| `leg-expired` | The record is expired, or a lapsed expiry window just resolved it en passant at the seam |
| `consultation-missing` | Missing/malformed `facts`, or a required consultation absent |
| `chain-compromise` | Chain verification failed — class **`compromise`**; records itself wherever the record's state still admits an append |
| `record-not-open` | Finalize against a record not in `open` (never appends) |
| `unknown-profile` / `unknown-leg` | Pre-record resolution failures (never append) |
| `unredeemable-state` / `unsealable-state` | The seam's state gate: nothing redeemable/sealable there (never append) |
| `effect-mismatch` | Redemption content differs from the confirmed content (never appends) |
| `already-redeemed` | The at-most-once gate (never appends) |
| `redemption-timeout` | A redeeming record's bound lapsed — the resolution edge is `redemption-failed`; this code itself never appends a refused edge |
| `prior-leg-unverified` / `supersedes-unverified` | A multi-leg or recovery reference failed verification at `open` (pre-record, never append) |
| `sod-violation` | The finalizer is a recorded prior-leg actor or the declared proposer |
| `consultation-failed` | A required consultation's verdict is `fail` |
| `availability` | Class **`availability`** — a required authority unreachable; carried by the `unavailable` status, never a refused edge |
| `ineligible` | The eligibility check refused this actor |
| `policy-drift` | The live policy digest differs from the bound one |
| `ack-missing` / `ack-stale` | Findings-flow coverage: no ack, or no *counting* ack, for a required-kind finding |
| `consultation-stale` | A freshness-bounded consultation's `observedAt` claim is missing, future, or out of bound |

Append behavior: `chain-compromise` appends wherever the state admits it; `availability`
never appends; the codes marked "never appends" (a set that includes every redemption-seam
refusal) never do; every other refusal appends `open → refused` iff the leg's
`terminalRefusals` lists it, else the record stays open. `leg-expired` and `availability`
are legal in `terminalRefusals` but inert — SPEC §8 names them so an adopter is not
trapped configuring a control that can never fire.

## Core types

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
function verifyChain(chain: readonly Transition[]): ChainVerifyReport;
```

## Stores

```ts
class MemoryStore implements Store {}        // reference semantics; nothing durable
class SqliteStore implements Store {         // embedded node:sqlite backing
  constructor(location: string);             // a file path, or ':memory:'
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
interface GenesisPayload { profileId: string; subjectRef: string }  // what a genesis
                                                            // append's payload carries
```

`@vidimera/store-postgres` (this workspace's server-SQL backing) is the reference consumer
of this surface.

## Signing (AL2) — structural today

`Config.signing` takes `{ signer, verifiers, signatures }`:

```ts
type Signer   = (bytes: Uint8Array) => Promise<{ keyRef: string; signature: string }>;
type Verifier = (bytes: Uint8Array, signature: string) => Promise<boolean>;
interface SignatureStore {
  put(entry: SignatureEntry): Promise<void>;             // upsert by transitionDigest
  listByRecord(recordId: string): Promise<SignatureEntry[]>;
}
interface SignatureEntry {
  transitionDigest: Digest; recordId: string; seq: number; keyRef: string; signature: string;
}
interface SignatureReport {                              // verifySignatures()'s return
  recordId: string;
  signingDeclared: boolean;
  transitions: { seq: number; transitionDigest: Digest; signed: boolean;
                 keyRef?: string; verified: boolean }[];
}
```

All of these names — plus `withSigning` (the store decorator) and the reference
`MemorySignatureStore` — are exported from the entry point: the 2026-08-19 review moved
the whole signing tier onto the root, beside the stores it mirrors.

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
