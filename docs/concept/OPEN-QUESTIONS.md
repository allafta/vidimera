# Open questions — the decisions a future project inherits

The concept is presented whole, but not everything is decided. These are the named, honest
open points, each with its context and — where one exists — the recommendation on record.
An inheriting project should decide the ones its scope activates, in writing, before
building the affected area.

---

## 1. AL2 detached signing — the enablement design

The signing hook is scoped (operator-enabled; signatures over canonical transitions and
consultations; closes the recompute residual and both genesis-head blind windows, under the
conditions SPEC §14 states) but its enablement design is deliberately reserved for a
dedicated decision:

- **Granularity** — enabled per deployment, per profile, or per record? What happens at a
  boundary (a profile flipping signing on with unsigned history behind it)? **Decided (this
  build):** per profile, record-homogeneous — a record opened under a signing profile is
  signed whole from its genesis; a profile flipping the field is the version-discipline
  violation SPEC §2's convention names. **Amended (this build, the profile-drift gate):** the
  violation now refuses rather than downgrading — a same-id profile whose data-only projection
  differs from a record's genesis `profileDigest` (`signing` is a covered field) refuses
  `unknown-profile` at every seam that resolves the record (SPEC §4, §8); what remains is the
  recompute route, a rewritten genesis carrying a consistent digest, which only signing-only
  registration with the AL2 key outside the insider's boundary closes — key custody alone
  leaves a genesis rewritten onto a co-registered non-signing profile outside the signature
  layer (SPEC §14's first condition).
- **Missing-signature posture** — when verification encounters an unsigned transition in a
  signing-enabled scope: fail-closed refusal, degraded-trust reporting, or
  enablement-boundary-aware acceptance? **Decided (this build):** fail-closed into each
  site's existing code — `chain-compromise` at the seams, the claim refusals
  (`prior-leg-unverified`, `supersedes-unverified`) at the cross-record verifications.
- **Key custody** — distribution and rotation are host-declared, but the verification story
  across a rotation needs a design (key ids in the record? external key history?). **Decided
  (this build):** an opaque `keyRef` beside each detached signature, resolved against a
  host-supplied verifier registry; an unresolvable `keyRef` fails closed; the library never
  holds keys.
- **Authority timestamps** — AL2 admits authority-supplied times inside digested payloads,
  which is what makes freshness gating meaningful (§4 below); which consultation kinds carry
  them, and how they are attested, is part of this design. **Decided (this build):** the
  recorded-claim, signing-gated design — see §4 below.

Motivating context, recorded: two AL1 blind windows (separation-of-duties genesis evidence;
policy-binding genesis) both name AL2 as their closure, and insider/database-administrator
resistance is a single-operator need — not a multi-party future.

## 2. The policy-gate reverse cross-instance direction

A record opened under a policy-declaring profile, then finalized under a same-id
*non-declaring* instance, **skips** the drift gate (the gate keys on the finalize-time
profile). Off the honest path (requires a same-id profile dropping its policy source between
open and finalize — a version-discipline violation) and auditable after the fact via the
recorded `profileDigest`; but it means removing a policy source disables drift checking by
design at AL1. **Decision:** fail-close in code (a record carrying a bound `policyDigest`
finalized under a now-non-declaring profile refuses) versus ratify as by-design with the
audit trail as compensation. **Recommendation on record: fail-close** — the asymmetry with
the forward direction (which refuses) cuts against the drift-refusal promise. Either way it
is a deliberate behavior decision, not an ad-hoc patch; AL2 is the ultimate closure.
**Decided (this build):** fail-close — the recommendation on record is taken: a record
carrying a bound `policyDigest`, finalized under a same-id instance that no longer declares a
`policySource`, refuses `policy-drift` rather than skipping the gate. **Superseded (this
build, the profile-drift gate):** both cross-instance directions now refuse `unknown-profile`
at profile resolution (SPEC §4, §8) — a same-id profile adding or dropping `policySource` is a
profile drift — so the `policy-drift` arm for a now-non-declaring profile is unreachable and
the code says so; the decision stands as fail-close, delivered one step earlier.

## 3. Recovery (`supersedes`) — the remaining flow details

The reference decision is taken (verify-by-replay, terminal-predecessor-required, recorded
in the recovering record's genesis — `SPEC.md` §2). Open at that writing:

- The refusal shape when the named predecessor is **not** terminal (a dedicated code vs the
  prior-leg-unverified pattern; never-append pre-record either way). **Decided (this build):**
  the dedicated code `supersedes-unverified` — never-append, pre-record; the
  `prior-leg-unverified` pattern at its own name.
- The exclusivity interaction: whether a recovering `open()` and the predecessor's
  terminality are checked under one store constraint or sequentially. **Decided (this build):**
  sequential — verify-then-open under the ordinary exclusivity constraint alone; terminality
  is one-way, so the verified predecessor cannot be raced back to non-terminal.
- Whether a superseded-by back-reference is recorded on the predecessor (it is sealed-or-
  terminal; its chain may not admit appends — likely answer: no, the forward link is the
  evidence). **Decided (this build):** no — the forward link is the evidence; the
  predecessor's chain stays untouched.

## 4. Consultation freshness — semantics at AL2

The gate (`consultation-stale`) is unfireable at AL1 by construction (recording-time
stamps). When AL2 authority timestamps exist: which kinds are freshness-eligible (only
authority-timestamped ones), how a bound interacts with retry (does a stale-then-refreshed
consultation re-enter within the same finalize attempt?), and whether facts-freshness (the
reviewed surface's age) gets its own bound. **Decided (this build):** freshness-eligible
kinds are the leg's own required kinds (or the implicit eligibility where declared) —
the freshness keys must be a subset, and a bounded kind whose input lacks `observedAt`, or
claims a future one, refuses `consultation-stale` fail-closed. No in-attempt re-entry —
inputs are fixed per finalize call; the refusal leaves the record open and the seam re-arms
per invocation. `facts` gets no own bound — the `facts` consultation is library-stamped
at the finalize instant, so recording is observation there; a host wanting surface-age
gating models its renderer as an ordinary timestamped kind.

## 5. The self-test tier (operator-assurance) contract

The tier is scoped (self-run probes as CI regression; genuineness and path-distinctness
proofs; self-waiver governance) but its delivery contract is undecided: a public library
subpath the operator imports, or a documented pattern the operator copies? Either way, the
tier's drivers are authored in the tier's own vocabulary, against the target list in
`CONTROLS.md` §4. **Decided (this build):** a public library subpath — `src/probes/`
ships the runner, the typed driver interface, the probes (authored against the target list),
and waiver governance, versioned with the library under the store contract's own pre-1.0
provisional-shape discipline; a probe the host's driver or configuration cannot drive
reports `not-driven` — unproved, never disproved, waivable only by a dated, unexpired
waiver. Sequencing note on record: the tier is most valuable **after** AL2 exists (a
re-attack suite is strongest when there is a signing layer to re-attack).

## 6. Registry candidates not minted

`unknown-staged` / `unknown-record` as refusal codes (currently loud caller-error throws) —
a possible future registry addition for hosts that want coded outcomes across process
boundaries where the throw boundary is awkward. Not minted; the caller-error posture is the
decision of record.

## 7. Live capture — residual decisions

The mode was sketched (independent re-derivation gated as a required consultation;
`confirmToRedeem`-or-`reverify` at the effect seam). Residual: the `reverify` redemption
surface's exact argument shape, and whether a live profile's staging step (there is no inert
draft) changes the staged-reference contract or bypasses it. **Decided (this build):** the
`reverify` surface takes no new argument — the redemption seams' existing content argument
is the fresh read, and a reverify-declaring profile maps every content-digest mismatch to
`content-drift`, appended and terminal (the token comparison keeps `effect-mismatch`; an
enlisted direct-shape call refuses result-first with no append). **Decided (this build):**
the staging contract is unchanged — neither changed nor bypassed; decide-time binding
is finalize's own recompute plus the gated independent re-derivation consultation.

## 8. Concurrent legs

Out of scope pre-1.0 by declaration (legs conclude in configured order). A future revision
deciding to admit concurrent legs re-opens: exclusivity semantics per leg, prior-reference
shape (a set, not an ordered list), and the SoD comparison base.

## 9. Store interface freeze

The store contract's *behaviors* are stable; its method signatures are explicitly
provisional pre-1.0. The freeze decision (what signature set, whether the meta-object form
is final, whether a driver-generic transaction type parameter survives) is a 1.0 gate.

## 10. Long-horizon items named in the assurance ladder

AL3 anchoring (independent append-only log; interval and disclosure design) is documented
only — it activates only with a threat model where even key custody is in doubt.
