# Scoping guide — how to dissect and rescope this concept

Vidimera's scope was not found; it was **decided**, with the reasoning recorded. This
document hands an inheriting project the decision machinery itself: the tier test, the
promotion rule, the levers that were pulled to get here (and can be pulled the other way),
the honest build-vs-buy picture, and a proven build order.

---

## 1. The tier test

Classify every capability by asking, in order:

- **KERNEL** — does *every* host need it unconditionally for the confirm loop's guarantee to
  hold? (Content binding, reviewed-surface binding, the chain, identity-by-transport, the
  capability split, exclusivity, fail-closed refusals.)
- **GOVERNED** — is it switched on by a **host feature**? (Multi-leg approval, effect
  execution, deciding over live state, a policy engine, a findings flow, required
  consultations, an eligibility source, an insider-resistance/signing need.) On iff declared;
  the default host runs the KERNEL alone.
- **OPERATOR-ASSURANCE** — is it the operator *verifying its own deployment* rather than new
  runtime behavior? (Self-run probes as CI regression, genuineness and path-distinctness
  proofs, self-waiver governance.)
- **OUT OF SCOPE** — is it meaningful **only with an outside party**? (Conformance claims as
  claims, assessor re-verification, published report formats, waiver signing/publication,
  external anchoring as an active level.) The operator is the records' sole consumer
  (`CONCEPT.md` §3): a capability landing here is not built, and cutting it is recorded per
  anti-goal #4.

Grade by the test, not by informal "pull" — informal grading misplaces borderline
capabilities (a self-run probe suite is the classic borderline case).

## 2. The promotion rule

A capability is promoted into scope only when **both** hold:

1. It is a **real governance control** — it exists in recognized control practice
   (four-eyes, at-most-once release, documented exception review, decided-under-rules-as-
   they-were, authority-to-decide), not a speculative feature; and
2. It makes **adopt beat build** — it is precisely the kind of subtle machinery an in-house
   build gets wrong silently (see §5).

And the discipline that keeps promotions honest: **every promotion states its purpose-trace
explicitly** — to the KERNEL confirm loop or to the governed-host bar — in the design
document that builds it. A capability that cannot state its trace does not ship.

## 3. The four scope commitments — and what reversing them costs

The embedded, operator-only scope rests on four commitments. Each has a coherent opposite —
the shape a spec-first, outside-party-verified program would take — and a rescoper may push
any of them the other way, but must do it knowingly: each direction has a bound, and the
outside-party side is not designed in this set, so reversing a commitment means designing
that side, not switching to it:

1. **A single canonical library; the spec is its documented data model.** The opposite — the
   spec as the product, with no privileged implementation — requires canonicalization to be
   independently mirror-proven. *The privileged-implementation objection applies exactly
   when an outside party must re-derive independently; with the operator as sole consumer,
   it does not arise.*
2. **Deployment behaviors are first-party tests.** Durability, replay, drift refusal,
   fail-closed, exclusivity are proven by the project's own integration tests. The opposite
   is adversarial probes run by a potentially hostile assessor, with a genuineness
   obligation. *The middle position — operator-run probes as CI regression — is the
   OPERATOR-ASSURANCE tier, and this scope keeps it.*
3. **Decision seams are the library's public API.** The opposite declares them in a
   published manifest so external probes know where to attack. *The profile/leg
   configuration is the same either way; only its publication changes.*
4. **Plain guarantees, never conformance vocabulary.** "Conformant," "assessor," "waiver,"
   "conformance report" appear on no user-facing surface; what is stated is stated plainly
   (content-bound, append-only, hash-chained, operator-replayable). Assurance-level
   vocabulary (AL1/AL2/AL3) is retained as doc-wide qualification of every trust claim.
   *Conformance vocabulary belongs only to an outside-party program, which this concept does
   not carry.*

## 4. What is deliberately NOT scope-dependent

Whatever the rescoping direction, these do not move (the first two are the concept's
identity — `CONCEPT.md` §4–§5; the last two are design invariants of the same rank —
`ARCHITECTURE.md` §10):

- The four preserved principles (graduated honesty with its same-breath rule;
  fidelity-not-validity; human anchor; identity-by-transport).
- The honesty discipline's five guards (no legal or compliance assurance;
  control-operated ≠ judgment-sound; never "non-repudiation"; redemption
  refusable-at-the-seam, not standalone prevention; the surveillance-data guard).
- Fail-closed posture and the caller-error/domain-refusal boundary.
- Digest-only custody.

## 5. The honest build-vs-buy picture

The failure modes an in-house build gets wrong are real, and they void the evidence
*silently*: payload-carried approver identity (forgeable); binding to a description instead
of a digest; head-only chain verification hiding interior deletion; approval state lost on
restart; approve-once/execute-twice; a chat or voice "yes" finalizing. But the honest
picture cuts both ways:

- **The spec is the cheapest win.** The threat catalog and control checklist are
  implementable from the text; that is a feature, not a leak.
- At **AL1** the tamper-evidence is non-recomputing-only — a competent team gets most of it
  by replaying its own chain. The insider-recompute threat closes at **AL2 signing**,
  under the three conditions `SPEC.md` §14 states — every registered profile signs, the key
  sits outside the insider's boundary, and no signature outlives an uncommitted append (the
  last met only where the sidecar is the configured store's own and written inside the
  append's atomic unit, not for any other sidecar).
- **Adopt clearly wins when:** the host needs **multi-party SoD** (restart-surviving
  four-eyes evidence, verify-by-replay references, and the retry-is-not-self-approval
  false-positive are subtle); **effect-binding redemption** (at-most-once under crashes and
  races is the hardest corner of the model); **portability** (records that mean the same
  thing across teams and stacks); or the **documented higher-assurance path** (AL2 proven,
  AL3 sketched — `SPEC.md` §14) rather than invented crypto. A **prospective** adopt-win —
  live only if independently-verifiable evidence ships (AL2+): proving the property to an
  outside party.
- **Build is honestly fine** for a single-operator, trusted-infra, one-confirm,
  no-outside-consumer, no-SoD flow.

The value concentrates exactly where the action is consequential and will face scrutiny.

## 6. Regulatory expectations as design references (never compliance)

The bar the concept builds to is informed by recognizable regulatory expectations across
industries — effective human oversight of consequential automated decisions, documentation
and logging duties, record-keeping and audit-trail integrity, authorization and segregation
objectives, effective-challenge norms, adverse-action explainability. The common thread the
design targets: **documented, effective, reconstructable human control** — a durable,
content-bound, replayable record, not a status flag. These expectations are a **design
reference for quality understanding, never a conformity claim**: adopting the library makes
no host compliant with anything, and every user-facing document in an inheriting project
must say so.

## 7. A proven build order

The reference implementation proved this concept buildable in small, individually-reviewed
increments, each landing green on a full fresh-install test aggregate — all eight steps
below were executed that way.
The generalized sequence, with its logic:

1. **The kernel** — capability split, canonicalization + digests, hash-chained transitions,
   pre-seam chain-verify, an in-memory store with the exclusivity/sequencing/monotonicity
   constraints. *Everything else composes onto this.*
2. **The store, for real** — the full contract (batch append, due-listing, seal-finality),
   real SQL adapters, and the backing-parameterized conformance suite + byte-identity
   cross-backing test. *Do this before more features: every later feature rides
   `appendBatch` untouched, which is what keeps the store diff-empty from here on.*
3. **Redemption (the effect seam)** — both host shapes, the clock edges, at-most-once. *The
   most intricate API corner; doing it early forces the transaction seam and outcome model
   to be right.*
4. **Multi-leg separation of duties** — verify-by-replay references, the SoD gate.
5. **Required-consultation gating** — the consultation input surface, the availability
   class.
6. **Authority checks** — eligibility (as consultation specialization) + policy-drift
   (open-time operator-only binding, the drift gate).
7. **Findings & acknowledgments** — the first mid-lifecycle append paths (design closed;
   see `SPEC.md` §10.2).
8. **Then, in deliberate order:** recovery (`supersedes`), live capture/`reverify`, **AL2
   signing** (design its enablement questions first — `OPEN-QUESTIONS.md`), and the
   self-test tier last (it is most valuable once signing exists to re-attack).

Disciplines that made the sequence work, worth inheriting as process:

- **One cluster per increment**, cut ruthlessly.
- **Feature guards from day one** — unimplemented profile fields throw at construction, so
  the spec can document ahead of code without silent degradation.
- **Byte-stability pins** — frozen digest fixtures prove every new feature leaves
  undeclaring profiles' chains byte-identical.
- **Adjacent-pair order tests** on every gate ladder change.
- **A living deferral register** with per-item triggers, and **spec-moves-to-truth** as an
  explicit exit step of every increment (draft-ahead markers come off only when the
  behavior lands).
- **Full-system analyses between phases**, with findings dispositioned in writing.

## 8. Rescoping checklist

For a future project deciding what to keep:

1. State your host class and your consumer. (Operator-only? A second party?)
2. Run the tier test (§1) over every capability in `CONTROLS.md`; record each verdict.
3. For every promotion, write the purpose-trace (§2). For every demotion or cut, check §4 —
   if it touches the identity list, you are forking the concept, not rescoping it; say so.
4. Decide the named open decisions (`OPEN-QUESTIONS.md`) that your scope activates.
5. Record what you cut — the capability, the reason, and the recovery path — so every cut
   is a documented act (anti-goal #4, `CONCEPT.md`).
6. Re-state the purpose in one paragraph and check every kept capability traces to it.
