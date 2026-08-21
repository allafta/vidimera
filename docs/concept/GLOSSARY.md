# Glossary

The concept's vocabulary, in one place. Where a term is normative, the defining section of
`SPEC.md` is cited.

- **Acknowledgment (ack)** — the explicit human acceptance of a finding, covering it only
  while the finding's current digest (and named magnitude, if any) matches (SPEC §10.2).
- **`ackMode`** — per-leg declaration of who may acknowledge, relative to the finding's
  raiser: `self`, `counterparty`, or `any` (SPEC §10.2).
- **Agent draft** — the content an AI agent (or any automated proposer) produces for a human
  to decide over.
- **Agent surface** — the frozen handle exposed to the untrusted drafter: staging plus pure
  reads; nothing that transitions a record (SPEC §9).
- **AL1 / AL2 / AL3** — the assurance ladder: chained (tamper-evident, the default), signed
  (detached signatures, operator-enabled), anchored (external log) (SPEC §14).
- **Append-only** — committed transitions are never updated or deleted by the library; a
  transition written inside an aborted host transaction was never appended (SPEC §5).
- **`appendsOn`** — the single derivation deciding whether a refusal appends a `refused`
  transition (SPEC §8).
- **Availability (class/outcome)** — an external authority unreachable: bounded host retry,
  never fail-open, never an appended edge; carried by the `unavailable` outcome status
  (SPEC §8).
- **Byte-stability** — the invariant that profiles declaring no features produce chains
  byte-identical to the minimal model; feature keys are present-iff-declared (SPEC §4).
- **Canonicalizer (domain)** — the adopter-supplied hook mapping domain content to a stable
  structure, declared re-implementably and fixture-pinned; distinct from the library-owned
  JCS serialization (SPEC §3).
- **Capability split** — one kernel, two frozen handles (agent / operator); the human anchor
  enforced by construction (SPEC §9).
- **Chain head** — the latest transition's digest; the value prior-leg and recovery
  references bind (SPEC §10.1).
- **`chain-verify`** — the library-emitted consultation recording a clean pre-seam chain
  verification; a reserved kind no host may supply (SPEC §5, §11.1).
- **Compare-and-swap (CAS) append** — the store discipline: state check and append as one
  atomic operation, never an advisory pre-check (SPEC §12).
- **Compromise (class)** — evidence of tampering; terminal; the class of `chain-compromise`
  (SPEC §8).
- **ConfirmProfile (profile)** — the adopter-authored configuration giving a flow its shape;
  its declared fields switch on the optional features (SPEC §9.1).
- **Consultation** — a recorded answer from an external or automated checker, attached to a
  human leg as evidence, never as a decision (SPEC §11.1).
- **Content binding** — `contentDigest = digest(canonical(content))`; re-checked at finalize
  (`content-drift`) (SPEC §3).
- **DecisionRecord (record)** — the durable, chained evidence of one human decision at one
  leg over one subject (SPEC §2).
- **Decline** — the recorded human "no": the operator-only `open → declined` seam giving a
  rejection the same bindings as a confirmation (SPEC §9). **[PROVEN]**
- **Digest-only custody** — the library sees digests; the host retains bodies (content,
  consultation payloads, finding content, policy documents) (SPEC §3).
- **`dueAt`** — the store's pending-clock listing index; never authoritative (SPEC §12).
- **Effect seam** — redemption, declared by the profile (`redeem` block or live capture);
  the only place a confirmed decision couples to a host-executed effect (SPEC §11.2).
- **Eligibility (gating) / `ineligible`** — the per-leg authority-to-decide check, declared
  as an opaque reference; an implicit-first required consultation whose `fail` verdict
  refuses `ineligible`, open-by-default so a different eligible actor may decide
  (SPEC §10.4).
- **En passant (clock edges)** — deadline transitions written lazily at the next mutating
  seam that observes the bound has passed; no scheduler (SPEC §4).
- **Exclusivity** — at most one non-terminal record per `(profile, subject)`,
  store-constraint-enforced (SPEC §9, §12 C1).
- **`facts` (reviewed surface)** — the digest of what the reviewer actually saw, required at
  finalize; a reserved consultation kind (SPEC §3).
- **Fail-closed** — unknown, unreachable, failed, or compromised inputs never convert to
  approval (SPEC §8).
- **Fidelity, not validity** — the record proves what was reviewed and confirmed, never that
  it was correct (SPEC §3).
- **Finding** — review-time evidence of an exception (`findingId`, kind, content digest,
  optional named magnitude, raiser), appended mid-lifecycle (SPEC §10.2).
- **Finalize** — the attempt to transition `open → confirmed` under a transport-established
  identity, through the fixed gate ladder (SPEC §9).
- **Genesis** — a record's first transition (`opened`, seq 1); its `prevHash` is the digest
  of `vidimera:genesis:<recordId>` (SPEC §4).
- **Graduated honesty** — the guarantee and its limit stated in the same breath; assurance
  vocabulary never borrowed from a higher level (SPEC §0, §14).
- **Human anchor** — no record without a human leg; automated reviewers attach evidence,
  never decide, never hold a leg (SPEC §2, §9).
- **IdentityAssertion** — `{ principal, authority, proofRef? }`; never a bare string
  (SPEC §6).
- **Identity by transport** — the deciding identity is established by session/transport,
  never trusted from the payload (SPEC §6).
- **JCS** — RFC 8785 JSON Canonicalization Scheme; the library-owned serialization layer
  (SPEC §3, §4).
- **Leg** — one human decision step within a flow; legs conclude in configured order
  (SPEC §1, §10.1).
- **Named magnitude** — the quantity an acknowledgment explicitly accepts ("accepted
  variance of $X"); an opaque string compared by exact equality (SPEC §10.2).
- **Never-append set** — the fixed refusal codes that never write a `refused` edge
  (pre-record, terminal-record, redemption/seal codes) (SPEC §8).
- **Non-terminal flag** — the store-persisted, library-derived flag backing exclusivity;
  terminality is not a function of state alone (SPEC §12 C1).
- **Operator** — the application/party that runs the library; the sole consumer of the
  records (SPEC §1).
- **Operator surface** — the trusted handle: open, review, finalize, seal, redeem, the
  findings seams, the sweep, replay/verify, reads (SPEC §9).
- **Outcome** — the result-first return shape: `ok` / `refused` (code + class) /
  `unavailable` (SPEC §8).
- **`policyDigest` / `policySource`** — the notarized policy snapshot binding and the opaque
  label naming the operator's policy authority; notarize, never evaluate (SPEC §10.3).
- **`priorRecordRefs` / `priorLegActors`** — a successor record's verify-by-replay evidence
  of its prior legs: recorded three-field references plus library-derived actors (SPEC §4,
  §10.1).
- **`profileDigest`** — the genesis-notarized digest over the profile's data-only projection
  (configured fields, excluding host code references); what makes governance drift
  detectable on replay (SPEC §4).
- **Proposed digest** — the provenance binding: the agent-proposed draft's content digest,
  resolved and bound at open, distinguishing what was proposed from what was decided
  (SPEC §2, §9). **[PROVEN]**
- **Proposer** — the actor or origin a profile names as the source of the content under
  decision; a designated proposer may not decide their own leg (SPEC §1, §10.1).
- **Pseudonymous principal** — a stable reference resolved through an identity map held
  outside the chain; what makes lawful erasure compatible with verification (SPEC §6, §13).
- **Redemption** — single-use, at-most-once coupling of a confirmed final-leg decision to
  its effect; direct (co-located transaction) or token (separated) shape (SPEC §11.2).
- **Refusal** — a fail-closed domain outcome at a seam, carrying a stable registry code
  (SPEC §8).
- **Replay** — reconstructing record state by folding the chain from genesis; the sole
  authoritative derivation of decision state (SPEC §5).
- **Seam** — a boundary where the library meets host machinery, exposed as API (SPEC §1).
- **Scope tiers (KERNEL / GOVERNED / OPERATOR-ASSURANCE)** — the dissection vocabulary: the
  unconditional core; profile-declared features; the operator's self-run verification
  (`CONTROLS.md` §1, `SCOPING-GUIDE.md` §1). Capabilities meaningful only with an outside
  party are out of scope by design.
- **Seal / `retired`** — verified end-of-life: a state-preserving, chain-final transition
  after which the body may be archived or destroyed as a unit (SPEC §5, §13).
- **Staged content / staged reference** — an inert agent draft bound by digest and held
  pre-record; content-derived, idempotent first-write-wins (SPEC §9, §12).
- **`supersedes`** — the verify-by-replay reference from a fresh record to the terminal
  predecessor it recovers from (SPEC §2).
- **Sweep** — the operator-only due-record resolution pass: iterate `listDue(now)` and drive
  each listed record's ordinary mutating seam, which resolves the elapsed bound en passant
  under the authoritative recompute; sweep first, then seal (SPEC §12, §4).
- **Terminal / non-terminal** — whether a record's flow is complete; profile-dependent for a
  final-leg `confirmed` (pure-capture: terminal; effect-seam: awaits redemption) (SPEC §2).
- **`terminalRefusals`** — the per-leg list of refusal codes that end the leg instead of
  leaving the record open for retry (SPEC §9.1).
- **Transition** — one state-bearing change: `{ recordId, seq, at, kind, payload, prevHash }`
  (SPEC §4).
- **`transitionDigest`** — the digest of a transition's library-owned canonical encoding;
  what the next link's `prevHash` binds (SPEC §4).
- **Verify-by-replay** — the reference discipline: any cross-record reference is verified by
  replaying the referenced chain, never trusted as supplied (SPEC §10.1, §2).
- **WYSIWYS** — "what you see is what you sign"; the general principle the reviewed-surface
  binding instantiates (SPEC §3).
