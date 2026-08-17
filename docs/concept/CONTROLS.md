# Controls catalog — every capability, its tier, its switch, its honest bound

The dissection map. Each capability of the Vidimera concept, labeled with its **scope tier**
(see `SCOPING-GUIDE.md` for the tier test), its **profile switch**, its **maturity**
(see `SPEC.md`'s marker legend), and the **honest bound** that must travel with it into any
rescoped project. Where an honest-bound cell shows "—", no capability-specific bound exists
beyond the §6 shared bounds, which travel with every row.

## 1. The tiers, in one line each

- **KERNEL** — the irreducible confirm-capture core every host runs unconditionally.
- **GOVERNED** — switched on by a host feature the profile declares; off by default.
- **OPERATOR-ASSURANCE** — the operator's own self-run verification of the above (probes as
  CI regression, waiver governance); proves operation, adds no runtime behavior.

Capabilities meaningful only with an outside party (conformance claims *as claims*, assessor
re-verification, published report and waiver formats, external anchoring as an active level)
are **out of scope by design**: the operator is the records' sole consumer (`CONCEPT.md` §3).

## 2. KERNEL — unconditional

| Capability | What it does | Maturity | Honest bound |
|---|---|---|---|
| Content binding | `contentDigest` over adopter-canonicalized, JCS-serialized content; re-checked at finalize (`content-drift`) | PROVEN | Fidelity, not validity — binds a wrong draft faithfully |
| Reviewed-surface (`facts`) binding | Digest of what the reviewer actually saw, required at finalize (`consultation-missing`) | PROVEN | Proves what was displayed-and-digested, not what was read or understood |
| Hash-chained transitions + replay/verify | Append-only chain, `replay`/`verifyChain` over durable storage alone | PROVEN | Tamper-evident against non-recomputing edits of non-head transitions only (AL1) |
| Identity by transport | `IdentityAssertion` from session/transport; payload identity refused | PROVEN | The library authenticates no one; it makes the posture visible |
| Capability-split API | Agent surface = staging + reads, by construction | PROVEN | In-process object-capability, not a sandbox; composition is the host's duty |
| Exclusivity | One non-terminal record per `(profile, subject)`, store-constraint-enforced | PROVEN | Holds only under a conforming Store adapter (C1 over the derived non-terminal flag, `SPEC.md` §12); the conformance suite is the proof |
| Recorded refusals + fail-closed outcomes | Stable coded registry; unknown/compromised fails closed | PROVEN | — |
| Expiry (`open` window) | ttl bounding the open state, en-passant resolution | PROVEN | A policy choice, never a truth |
| Sealing / retirement | Verified end-of-life; `retired` status; chain-final | PROVEN | Seal attests a clean replay at seal time, AL1-honest |
| Staged capture mode | Inert draft bound pre-record | PROVEN | — |

## 3. GOVERNED — on by profile declaration

| Capability | Switch | What it does | Maturity | Honest bound |
|---|---|---|---|---|
| Multi-leg separation of duties | `legs.length > 1`, `sod.notActorOf`, `proposer` | Ordered legs; verify-by-replay prior refs; principal-distinctness gate at finalize | PROVEN | Distinct principals, not independent judgment; collusion/coercion out of scope; genesis-head AL1 window on the evidence |
| Effect-binding single-use redemption | `redeem` block (the PROVEN live mode also declares the seam — row below) | At-most-once coupling of a confirmed final-leg decision to its effect; direct and token shapes | PROVEN | Refusable at the seam **given an idempotent executor**; never executes; blind to seam-bypassing effects |
| Required-consultation gating | `requiredConsultations` | Missing/failed required kinds refuse; unreachable yields `availability`, never a pass | PROVEN | Gates and fails closed; does not prove genuineness (that proof is OPERATOR-ASSURANCE) |
| Eligibility gating | `eligibility` (per leg) | Implicit-first required consultation; `fail` → `ineligible`, open-by-default | PROVEN | Gates the supplied verdict; does not run or verify the check |
| Policy-drift notarization | `policySource` | Operator-bound `policyDigest` at open; live-source comparison at finalize | PROVEN | Notarizes, never evaluates; reverse cross-instance direction is a named open decision; genesis-head AL1 window |
| Findings & acknowledgments | `ackMode` + `requiredAcks` (per leg, both-or-neither) | Review-time findings with digest coverage; named-magnitude acks; `ack-missing`/`ack-stale` gate | PROVEN | Coverage of raised findings; does not require findings to exist; records non-counting acks faithfully |
| Live capture + `reverify` | `captureMode: 'live'` | Decide-what-exists; independent re-derivation gated as a required consultation; redemption-time re-verify | PROVEN | No pre-decision immutability — catches change at the decision |
| Recovery (`supersedes`) | profile-conditional field; the verified reference supplied at the recovering record's `open()` | Verify-by-replay link from a fresh record to a terminal predecessor | PROVEN | Recovery linkage evidence; open flow details enumerated (`OPEN-QUESTIONS.md` §3) |
| Consultation freshness | `freshness` (per leg) | Staleness gate over consultation age | SKETCHED (AL2-dependent) | Unfireable at AL1 (recording-time stamps); meaningful only with authority timestamps |
| AL2 detached signing | operator enablement (granularity decided on record — `OPEN-QUESTIONS.md` §1) | Signatures over canonical transitions + consultations | PROVEN | Closes the recompute + head-edit residuals **when the key is outside the insider boundary** |

The AL2 row sits in GOVERNED by the tier test (a host-declared feature), not by profile
declaration — its switch is operator enablement, with the granularity
(deployment/profile/record) a named open decision; every other row's switch is a profile
field.

## 4. OPERATOR-ASSURANCE — self-run verification

| Capability | What it does | Maturity | Honest bound |
|---|---|---|---|
| Self-run probe runner + driver interface | The operator re-attacks the promoted behaviors (drift, forge, replay, fail-closed, exclusivity) as a CI regression suite, catching config drift that silently reopens a path | SKETCHED | Proves the control operated in the probed configuration, at probe time |
| Consultation-genuineness proof | The live-dependency exercise: sever the authority; a required consultation must yield `availability`, not a stubbed pass | SKETCHED | A probe-proved property, not a library-enforced one |
| Live-path distinctness proof | Disable the rendering credential; the independent re-derivation must still succeed | SKETCHED | Probe-proved, host-specific |
| Waiver governance (self) | Dated, expiring waivers for the operator's own accepted-open gaps | SKETCHED | Self-attestation with expiry discipline — not third-party assurance |

**The probe suite's target list** — the behaviors worth re-attacking first-party, in one
place: decision state survives restart; tampering is evident on replay; drifted content
refuses; a payload-carried identity cannot finalize; a confirmation redeems at most once;
cross-leg self-approval refuses; stale or missing acknowledgments block finalize; required
consultations are present and genuine (a severed authority yields `availability`, never a
pass); effects require redemption and match the redeemed record; at most one non-terminal
record per subject; nothing agent-reachable decides; unknown inputs and compromise fail
closed; the decision binds what the reviewer saw; an ineligible actor refuses. Each behavior
lives normatively in `SPEC.md`; this list exists so the probe suite is written against the
promoted behaviors, not against whatever was convenient to test.

## 5. Cross-industry applicability (illustrative — never compliance mappings)

The controls are generic governance controls; industries are examples, not the scope.

| Capability (tier) | Finance | Healthcare | Government | HR |
|---|---|---|---|---|
| Maker-checker / SoD *(GOVERNED)* | dual payment authorization | second-clinician / pharmacist verification | segregation in benefit / procurement decisions | dual sign-off on termination / comp change |
| Effect-binding redemption *(GOVERNED)* | payment release | medication / procedure order execution | benefit disbursement / permit issuance | offer / termination action |
| Consultations + gating *(GOVERNED)* | sanctions / AML screen | drug-interaction / allergy check | eligibility verification | background / reference check |
| Policy-drift notarization *(GOVERNED)* | spend-limit tables | clinical-guideline version | benefit-rule set | HR-policy version |
| Eligibility gating *(GOVERNED)* | delegation-of-authority | clinical credentialing / privileges | delegated authority | approval authority |
| Findings / named-magnitude acks *(GOVERNED)* | accepted variance on a reconciliation | acknowledged contraindication override | documented exception to a rule | acknowledged deviation from banding |
| Reviewed-surface / `facts` *(KERNEL)* | dynamic-linking of amount/payee | "sign what the chart showed" | record of what was decided on | offer terms as shown |
| Recorded refusals *(KERNEL)* | declined trade / payment | declined order / escalation | denied benefit / permit | rejected requisition |

Reviewed-surface binding is the tell that the model was always domain-agnostic: payment-
services dynamic linking is just the finance instance of the general "bind what the human
saw" principle.

## 6. The honesty bounds that travel with every control

Restated once, because every row above depends on them:

1. Control **operated** ≠ judgment **sound**.
2. Tamper-**evident** ≠ tamper-**proof**; never "non-repudiation."
3. Gate **on** a verdict ≠ **perform** the check.
4. Refusable **at the seam** ≠ prevention; the library executes nothing and observes nothing
   that bypasses the seam.
5. Evidence **of decision** ≠ surveillance of the decider — aggregate use only.
