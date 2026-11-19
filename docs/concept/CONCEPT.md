# Vidimera — the concept

**Vidimera is a library inside an agentic application that durably records human confirmations
of AI-drafted actions as governed, operator-consumed accountability evidence.**

This document states the problem, the thesis, the purpose, the non-negotiable principles, and
the honesty discipline. Everything else in this documentation set is downstream of it.

---

## 1. The problem

An AI agent drafts a real action — a timesheet, a payment, an order, a clinical prescription, a
firewall change. Somewhere a human says "yes." Then a downstream system executes it.

The interesting failure modes cluster at the seam between the human's "yes" and the content it
was a "yes" to:

- **Render-to-decide drift.** The content shown to the reviewer differs from the content that
  gets executed.
- **Payload identity.** The "yes" arrives as an unauthenticated payload ("the chat says the
  manager approved") rather than a bound identity established by a session or transport.
- **Evaporating evidence.** The decision, once made, is unrecoverable — no durable,
  tamper-evident record of *what exactly* was confirmed, by whom, under which rules, having
  seen what.

Every agent framework can *gate* an action on human approval — an interrupt, a
`needs-approval` flag, a permission hook. Almost none can *show, later, to someone who wasn't
there,* that a specific human took responsibility for a specific action, having seen specific
content, under specific rules — with durable evidence whose edits are detectable within a
stated, graduated bound (`ASSURANCE.md`; proof to an *outside* party is out of scope of this
concept — the operator is the sole consumer). The approval is a mutable status field or an
operator-internal checkpoint, not durable verifiable evidence. That gap is the product.

## 2. The thesis: govern the decision, not the mutation

Rather than intercepting tool calls or gating the effect, Vidimera captures the **human
decision** over an agent draft as a first-class, verifiable artifact — bound to the exact
content reviewed, chained so non-recomputing tampering is evident on replay (bounded as
principle 1, §4, states), and replayable by the operator from durable storage alone. The mutation is still the host's to execute; what the library owns
is the durable, inspectable record that a responsible human decided over *this* content.

Structurally, this **separates the thing you must not get wrong** (the evidence of human
responsibility) **from the thing that changes constantly** (the framework, the models, the
orchestration). Swap orchestrators, swap models, rewrite the agent — the accountability record
keeps its shape and stays verifiable. That is what framework-agnostic buys.

## 3. The purpose statement

> `@vidimera/record` is a library inside an agentic application that durably records human
> confirmations of agent-drafted actions as **governed, operator-consumed accountability
> evidence**. The unconditional core is the KERNEL confirm loop — an agent stages an inert
> draft, a human reviews it, a human confirms it under a transport-established identity —
> captured as content-bound, append-only, hash-chained, operator-replayable records. Where —
> and only where — a host profile declares them, the GOVERNED controls a
> regulated-industry-shaped host expects attach to the same record model — among them
> multi-leg separation of duties, effect-binding single-use redemption,
> required-consultation / eligibility / policy-drift gating, and findings and acknowledgments
> — gates fail-closed, guarantees honesty-bounded. The consultation-shaped gates **record
> (never perform) the host's own domain checks**; separation-of-duties'
> principal-distinctness comparison and redemption's at-most-once gate are the library's own,
> enforced over host-established identity and host-executed effects. Detached signing (AL2)
> is the **operator-enabled** integrity upgrade of the same records. The operator who runs
> the application is the sole consumer of the records; everything that exists only for an
> outside party is out of scope.

Two consequences of that purpose, stated honestly rather than left implicit:

1. **The bar is a prospective host class, not a present adopter.** The product is built to the
   bar of regulated-industry-shaped hosts — a class any single adopter exercises only a
   fraction of. That position rests partly on an **adopt-beats-build value argument** (the
   subtle failure modes of an in-house build justify a shared, hardened layer —
   `SCOPING-GUIDE.md` §5 states that argument honestly) rather than being derived from the
   confirm loop alone. This is a stated premise, not an inference. The discipline that keeps it
   honest: **every capability promotion states its purpose-trace explicitly** — either to the
   KERNEL confirm loop or to the governed-host bar — in the design document that builds it.
2. **On opt-in gated profiles, the human confirm is necessary but not sufficient.** Machine
   verdicts (required consultations, eligibility, policy-drift) can *refuse* a finalize; they
   can never *approve* one, hold a leg, or produce a positive outcome. The human-anchor
   discipline is precisely the leg-holding / positive-outcome rule, and the default (no
   declared gates) remains pure attach-as-evidence.

## 4. The four preserved principles (non-negotiable)

Any project inheriting this concept keeps these four, whatever else it rescopes:

1. **Graduated honesty.** The hash chain is tamper-*evident* against non-recomputing tampering
   only — bounded further as `ASSURANCE.md` states. The base layer is **never** described as
   "cryptographic" or "non-repudiable" — not in docs, READMEs, or API names. Signing (AL2) and
   anchoring (AL3) are the *documented upgrades* for operators who need insider resistance.
   The guarantee and its limit are stated in the same breath, everywhere.
2. **Fidelity, not validity.** The record proves what was reviewed and confirmed — never that
   the content was correct. A digest binds a hallucinated or malicious draft *faithfully*.
   Prevention of bad drafts lives upstream, in layers the library does not own.
3. **Human anchor.** No record exists without a human leg. Automated reviewers — including AI
   agents and LLM judges — never hold a leg; their assessments enter the record as
   consultations carrying the automated checker's identity: evidence, never a decider. The
   final leg of every flow is a human's.
4. **Identity by transport.** The deciding identity is established by the session or transport
   that carries the decision, never trusted because it rides in the decision payload. An
   identity-free or payload-carried "yes" cannot finalize anything.

## 5. The honesty discipline

These guards bind every document, README, and API name in any inheriting project:

- **No legal or compliance assurance.** A record is *evidence that a human took responsibility
  for a draft* — never a conformity assessment. Building to the bar heavily regulated settings
  set yields a well-understood, high-quality layer, but adopting the library makes no host
  compliant with any law or regulation, and a record makes no claim about the competence,
  attention, or independence of the human whose decision it captures.
- **Control operated ≠ judgment sound.** Control assurance proves the control *operated*,
  never that judgment was *sound or independent*. Separation of duties evidences distinct
  principals, not independent judgment — two colluding humans satisfy it.
- **Never "non-repudiation."** AL1 is tamper-*evident*; AL2 is insider-resistant (when the key
  is outside the insider boundary, every registered profile signs, and no signature
  outlives an uncommitted append — `SPEC.md` §14); AL3 is anchored. None of them is called
  non-repudiation.
- **Redemption is refusable-at-the-seam, not standalone prevention.** Given an idempotent
  executor, orphaned/duplicate/premature/mismatched effects are refusable at the seam; the
  library never executes effects and does not observe effects that bypass the seam.
- **Reviewer analytics are surveillance data.** The same timestamps that prove a control
  operated make per-person performance scoring trivial. Defensible use is **aggregate
  control-assurance, never per-named-reviewer scoring**. The record is not an employee
  monitor.

## 6. What the library is not

It does not:

- intercept tool calls,
- execute effects or mutate host stores (beyond its own storage),
- evaluate policy,
- authenticate or authorize anyone,
- run a workflow or orchestration engine, or
- render a review UI.

Those layers stay the host's, filled by whatever it has already adopted. The library records
the *decision* over what they produce, and nothing else.

## 7. Anti-goals

Inherited disciplines for any rescoping effort:

1. **No features the purpose statement doesn't require.** Every capability traces to the
   KERNEL confirm loop or the governed-host bar, explicitly, in the design that builds it.
2. **Do not keep machinery because it is already written.** Scope decisions are made on
   purpose-fit, not sunk cost.
3. **Do not dress the product up.** No conformance vocabulary, no assurance language beyond
   what the shipped level honestly provides.
4. **Cut in writing, never silently.** Out-of-scope material may be removed, but every
   removal is recorded — what was cut, why, and how it could be recovered or re-derived —
   so scope loss is always a deliberate, documented act.

---

*Where next: `SPEC.md` is the normative contract; `ARCHITECTURE.md` the design narrative;
`SCOPING-GUIDE.md` explains how to dissect and rescope this concept.*
