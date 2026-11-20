# The increment record — index

**What this is.** `docs/superpowers/specs/` and `docs/superpowers/plans/` hold the record
of how the eight-step build order ([`docs/concept/SCOPING-GUIDE.md`](../concept/SCOPING-GUIDE.md)
§7) actually ran: one design document (a "spec", in this repository's own working sense —
not `docs/concept/SPEC.md`, the single normative spec) and one implementation plan per
increment, written in the order the increments landed. Every row below is derived from
the files' own headers — each names its own build-order step and its place in that
step's sequence — not from memory or a count carried from prose.

**What this is not.** These documents are historical. The authoritative account of what
this build does and does not implement is
[`docs/process/implementation-status.md`](../process/implementation-status.md) — read it,
not a spec or a plan, for current behavior. A spec/plan pair is superseded by the code
the moment its increment lands, and none of these documents is maintained afterward: a
plan's "Global Constraints" or a design's "Rulings taken" describe the state at the time
the increment was written, which the code and the status doc may have since moved past.
A reader chasing current behavior reads the code and the status doc; a reader chasing how
a past decision was reached reads the matching row below.

**57 files in `specs/`, 60 in `plans/`** — not one-to-one. Three
plans carry no spec: the two step-1 completion/remediation plans
(`2026-08-03-autonomous-step-1-completion.md`, `2026-08-03-step-1-remediation.md`) and
this housekeeping plan's own (`2026-08-18-post-build-order-housekeeping.md`). Each is
noted "no spec" in its row below rather than paired with a design document that does not
exist.

**`docs/analysis/`** holds 25 files, the increment-history artifacts outside that pair
structure — earliest is
[`2026-08-03-step-1-review.md`](../analysis/2026-08-03-step-1-review.md), the
whole-branch review of step 1 that the step-1-remediation plan below was written to
close.

## The increments, chronologically

| Date | Increment | Build-order step served | Spec | Plan |
|---|---|---|---|---|
| 2026-08-02 | Project scaffold | Pre-step-1 (repository scaffold) | [design](specs/2026-08-02-project-scaffold-design.md) | [plan](plans/2026-08-02-project-scaffold.md) |
| 2026-08-02 | Reference-implementation adoption | Step 1 (kernel) | [design](specs/2026-08-02-reference-implementation-adoption-design.md) | [plan](plans/2026-08-02-reference-implementation-adoption.md) |
| 2026-08-03 | Autonomous step-1 completion | Step 1 (kernel) | no spec | [plan](plans/2026-08-03-autonomous-step-1-completion.md) |
| 2026-08-03 | Step-1 remediation | Step 1 (kernel) — exit | no spec | [plan](plans/2026-08-03-step-1-remediation.md) |
| 2026-08-04 | Atomic batch append | Step 2 (store), 1st of 5 | [design](specs/2026-08-04-atomic-batch-append-design.md) | [plan](plans/2026-08-04-atomic-batch-append.md) |
| 2026-08-05 | Chain retirement (`seal` / `retired`) | Step 2, 2nd of 5 | [design](specs/2026-08-05-chain-retirement-design.md) | [plan](plans/2026-08-05-chain-retirement.md) |
| 2026-08-12 | `findNonTerminal` — the eighth Store method | Step 2, 3rd of 5 | [design](specs/2026-08-12-find-non-terminal-design.md) | [plan](plans/2026-08-12-find-non-terminal.md) |
| 2026-08-12 | Store conformance suite | Step 2, 4th of 5 | [design](specs/2026-08-12-store-conformance-suite-design.md) | [plan](plans/2026-08-12-store-conformance-suite.md) |
| 2026-08-12 | Embedded-SQL adapter (`SqliteStore`) | Step 2, 5th of 5 | [design](specs/2026-08-12-sqlite-adapter-design.md) | [plan](plans/2026-08-12-sqlite-adapter.md) |
| 2026-08-12 | Redemption, the direct shape | Step 3 (redemption), 1st of 3 — records step 2's exit | [design](specs/2026-08-12-redemption-direct-shape-design.md) | [plan](plans/2026-08-12-redemption-direct-shape.md) |
| 2026-08-13 | Redemption, the token shape | Step 3, 2nd of 3 | [design](specs/2026-08-13-redemption-token-shape-design.md) | [plan](plans/2026-08-13-redemption-token-shape.md) |
| 2026-08-14 | Redemption, the clocks | Step 3, 3rd of 3 — exit | [design](specs/2026-08-14-redemption-clocks-design.md) | [plan](plans/2026-08-14-redemption-clocks.md) |
| 2026-08-16 | Multi-leg sequencing and the verified reference | Step 4 (multi-leg SoD), 1st of 2 | [design](specs/2026-08-16-multi-leg-references-design.md) | [plan](plans/2026-08-16-multi-leg-references.md) |
| 2026-08-16 | Separation-of-duties gate | Step 4, 2nd of 2 — exit | [design](specs/2026-08-16-sod-gate-design.md) | [plan](plans/2026-08-16-sod-gate.md) |
| 2026-08-16 | Consultation attach form | Step 5 (required consultation), 1st of 2 | [design](specs/2026-08-16-consultation-attach-design.md) | [plan](plans/2026-08-16-consultation-attach.md) |
| 2026-08-16 | Required-consultation gate and the availability class | Step 5, 2nd of 2 — exit | [design](specs/2026-08-16-consultation-gate-design.md) | [plan](plans/2026-08-16-consultation-gate.md) |
| 2026-08-16 | Eligibility gating | Step 6 (authority checks), 1st of 2 | [design](specs/2026-08-16-eligibility-design.md) | [plan](plans/2026-08-16-eligibility.md) |
| 2026-08-16 | Policy-drift notarization | Step 6, 2nd of 2 — exit | [design](specs/2026-08-16-policy-drift-design.md) | [plan](plans/2026-08-16-policy-drift.md) |
| 2026-08-16 | Findings and acknowledgments, the read side | Step 7 (findings/acks), 1st of 2 | [design](specs/2026-08-16-findings-read-side-design.md) | [plan](plans/2026-08-16-findings-read-side.md) |
| 2026-08-17 | Findings and acknowledgments, the write side | Step 7, 2nd of 2 — exit | [design](specs/2026-08-17-findings-write-side-design.md) | [plan](plans/2026-08-17-findings-write-side.md) |
| 2026-08-17 | Recovery (`supersedes`) | Step 8 (tail), 1st item | [design](specs/2026-08-17-recovery-supersedes-design.md) | [plan](plans/2026-08-17-recovery-supersedes.md) |
| 2026-08-17 | Live capture and `reverify` | Step 8, 2nd item | [design](specs/2026-08-17-live-capture-design.md) | [plan](plans/2026-08-17-live-capture.md) |
| 2026-08-17 | AL2 detached signing, the mint | Step 8, 3rd item — AL2, 1st of 3 | [design](specs/2026-08-17-al2-signing-mint-design.md) | [plan](plans/2026-08-17-al2-signing-mint.md) |
| 2026-08-17 | AL2 detached signing, the enforcement | Step 8, 3rd item — AL2, 2nd of 3 | [design](specs/2026-08-17-al2-signing-enforce-design.md) | [plan](plans/2026-08-17-al2-signing-enforce.md) |
| 2026-08-17 | AL2 freshness | Step 8, 3rd item — AL2, 3rd of 3 — guard era ends | [design](specs/2026-08-17-al2-freshness-design.md) | [plan](plans/2026-08-17-al2-freshness.md) |
| 2026-08-18 | Self-test tier | Step 8, last item — exit; build order complete | [design](specs/2026-08-18-self-test-tier-design.md) | [plan](plans/2026-08-18-self-test-tier.md) |
| 2026-08-18 | Post-build-order housekeeping | Post-build-order (no step) | no spec | [plan](plans/2026-08-18-post-build-order-housekeeping.md) |
| 2026-08-19 | The Postgres backing, the token seams' `tx?`, the workspace shape | Post-build-order — release-plan phase 4 (register rows 15/16/4) | [design](specs/2026-08-19-store-postgres-design.md) | [plan](plans/2026-08-19-store-postgres.md) |
| 2026-08-20 | Recorded human decline | Post-build-order (no step) | [design](specs/2026-08-20-recorded-human-decline-design.md) | [plan](plans/2026-08-21-recorded-human-decline.md) |
| 2026-08-21 | Proposal provenance | Post-build-order (no step) | [design](specs/2026-08-21-proposal-provenance-design.md) | [plan](plans/2026-08-21-proposal-provenance.md) |
| 2026-08-21 | Effect-result notarization | Post-build-order (no step) | [design](specs/2026-08-21-effect-result-design.md) | [plan](plans/2026-08-21-effect-result.md) |
| 2026-08-22 | Truth repairs | Post-build-order (no step) | [design](specs/2026-08-22-truth-repairs-design.md) | [plan](plans/2026-08-22-truth-repairs.md) |
| 2026-08-22 | Byte-regression pins | Post-build-order (no step) | [design](specs/2026-08-22-byte-regression-pins-design.md) | [plan](plans/2026-08-22-byte-regression-pins.md) |
| 2026-08-23 | AL2 signature-enforcement coverage | Post-build-order (no step) | [design](specs/2026-08-23-al2-signature-enforcement-coverage-design.md) | [plan](plans/2026-08-23-al2-signature-enforcement-coverage.md) |
| 2026-08-24 | Row 22 truth repairs | Post-build-order (no step) | [design](specs/2026-08-24-row-22-truth-repairs-design.md) | [plan](plans/2026-08-24-row-22-truth-repairs.md) |
| 2026-08-24 | Sidecar contract | Post-build-order (no step) | [design](specs/2026-08-24-sidecar-contract-design.md) | [plan](plans/2026-08-24-sidecar-contract.md) |
| 2026-08-24 | No-edge containment | Post-build-order (no step) | [design](specs/2026-08-24-no-edge-containment-design.md) | [plan](plans/2026-08-24-no-edge-containment.md) |
| 2026-08-29 | Sidecar orphans report | Post-build-order (no step) | [design](specs/2026-08-29-sidecar-orphans-report-design.md) | [plan](plans/2026-08-29-sidecar-orphans-report.md) |
| 2026-08-29 | First-use proof | Post-build-order (no step) | [design](specs/2026-08-29-first-use-proof-design.md) | [plan](plans/2026-08-29-first-use-proof.md) |
| 2026-08-29 | Checklist refresh | Post-build-order (no step) | [design](specs/2026-08-29-checklist-refresh-design.md) | [plan](plans/2026-08-29-checklist-refresh.md) |
| 2026-09-01 | Truth restoration in shipped source and tests | Post-build-order (no step) | [design](specs/2026-09-01-truth-restoration-design.md) | [plan](plans/2026-09-01-truth-restoration.md) |
| 2026-09-01 | Registry-facing hygiene | Post-build-order (no step) | [design](specs/2026-09-01-registry-hygiene-design.md) | [plan](plans/2026-09-01-registry-hygiene.md) |
| 2026-09-02 | Parked truths | Post-build-order (no step) | [design](specs/2026-09-02-parked-truths-design.md) | [plan](plans/2026-09-02-parked-truths.md) |
| 2026-09-02 | `record-contended` — a §8 registry amendment (design and promotion case; sanction granted, re-granted for the definition, and spent) | Post-build-order (no step) | [design](specs/2026-09-02-record-contended-design.md) | [plan](plans/2026-09-02-record-contended.md) |
| 2026-09-03 | The profile-drift gate — `unknown-profile` widened to the record's binding (design and sanction case; sanction granted 2026-09-03 and spent; site 14 re-granted 2026-09-04 and landed; site 15, the corrective narrowing of site 2's clause, granted 2026-09-04 and landed) | Post-build-order (no step) | [design](specs/2026-09-03-profile-drift-gate-design.md) | [plan](plans/2026-09-03-profile-drift-gate.md) |
| 2026-09-05 | The review-hardening pass — five small findings from an external code review, built where the repository's own rules already called for them (construction loudness, a never-inert `terminalRefusals`, one clock read in the redemption prologue, the canonicalizer totality contract pinned, four nits); the other twelve findings triaged against the record in `docs/analysis/2026-09-05-external-code-review.md` | Post-build-order (no step) | [design](specs/2026-09-05-review-hardening-design.md) | [plan](plans/2026-09-05-review-hardening.md) |
| 2026-11-17 | Chain binding — every loaded chain bound to the recordId it was loaded for, every library-built transition addressed by the caller's id, and the non-verifying reads throwing on foreign persisted data, closing a relocation route past AL1 and AL2 reported by an external analysis | Post-build-order (no step) | [design](specs/2026-11-17-chain-binding-design.md) | [plan](plans/2026-11-17-chain-binding.md) |
| 2026-11-17 | Identity snapshot — every seam records the `{ principal, authority, proofRef? }` literal it validated, never the caller's object; the read side fails closed on a recorded actor that is not a valid identity; `MemoryStore` refuses an append whose stored copy would digest differently | Post-build-order (no step) | [design](specs/2026-11-17-identity-snapshot-design.md) | [plan](plans/2026-11-17-identity-snapshot.md) |
| 2026-11-17 | Signing obligation — the AL2 obligation every verification site enforces comes from the profile the instance holds for the record, or, where it does not hold it, from the live same-id declaration only when the chain's own genesis verifies (amended after the whole-branch review), so a same-id edit that adds `signing: true` refuses `unknown-profile` with no edge instead of writing `chain-compromise` into untampered records | Post-build-order (no step) | [design](specs/2026-11-17-signing-obligation-design.md) | [plan](plans/2026-11-17-signing-obligation.md) |
| 2026-11-17 | Supersedes binding — `verifySupersedes` requires the instance to hold the predecessor's profile (id and digest) for every terminal state, not only `confirmed`, as SPEC §4's fold sentence states, so a forged terminal predecessor naming a profile the instance does not hold refuses `supersedes-unverified`; the fifteenth self-authored inversion | Post-build-order (no step) | [design](specs/2026-11-17-supersedes-binding-design.md) | [plan](plans/2026-11-17-supersedes-binding.md) |
| 2026-11-17 | Compliance statement — every user-facing page (both package READMEs, the documentation front door, every guide page) says adopting the library makes no host compliant with any law or regulation, as SCOPING-GUIDE §6 requires, held by a presence pin over the guide directory | Post-build-order (no step) | [design](specs/2026-11-17-compliance-statement-design.md) | [plan](plans/2026-11-17-compliance-statement.md) |
| 2026-11-17 | Release hardening — the release guard refuses unless dispatched from the `v<version>` tag with both packages in lockstep; build and publish split so only the two publish jobs, which run no toolchain, hold `id-token: write` and the token, in a `release` environment (a dry run publishes nothing and runs the same commands under `--dry-run`); the toolchain still produces the packed bytes; first-use stops interpolating dispatch inputs into shell; CODEOWNERS owns `.github/` and `scripts/`; a dependabot cooldown | Post-build-order (no step) | [design](specs/2026-11-17-release-hardening-design.md) | [plan](plans/2026-11-17-release-hardening.md) |
| 2026-11-17 | Verifier faults — a host verifier that throws or rejects is a fault wherever the signature layer applies (the seam throws, nothing is appended) rather than a terminal `chain-compromise` edge on a healthy record; the instance refuses to land a transition it cannot verify itself; `create()` refuses a malformed `config.signing`; two-phase key rotation documented; the sixteenth self-authored inversion | Post-build-order (no step) | [design](specs/2026-11-17-verifier-faults-design.md) | [plan](plans/2026-11-17-verifier-faults.md) |
| 2026-11-19 | AL2 restatement, first commit — call 3.1 of the 2026-11-17 sanction calls: SPEC §13A and §14, CONTROLS, ASSURANCE and OPEN-QUESTIONS §1 state AL2's closure with its three conditions (every registered profile signs; the key outside the insider's boundary; no signature outliving an uncommitted append, which the sign-before-append order does not yet meet), after two pins show conditions (i) and (iii) as behavior; two further sealed-set commits, under the owner's own grant, condition the ten sentences outside call 3 (CONCEPT.md's honesty-discipline bullet among them — a fork of the concept by the repository's rule, called out); four pins; no marker moves | Post-build-order (no step) | [design](specs/2026-11-19-al2-restatement-design.md) | [plan](plans/2026-11-19-al2-restatement.md) |
| 2026-11-19 | Transactional sidecar — call 2 of the 2026-11-17 sanction calls: each reference store exposes its own `signatures` sidecar and writes a signed append's entries inside that append's atomic unit, after its compare-and-swap and only then, when the configured sidecar is the store's own; a separate sidecar keeps today's order; retires deferral-register row 22 on measured behavior; the seventeenth self-authored inversion | Post-build-order (no step) | [design](specs/2026-11-19-transactional-sidecar-design.md) | [plan](plans/2026-11-19-transactional-sidecar.md) |
| 2026-11-20 | AL2 restatement, follow-up — call 3.2 of the 2026-11-17 sanction calls: the five call-3.1 sentences that called condition (iii) unmet say it holds where the sidecar is the configured store's own and written inside the append's atomic unit, and fails for any other sidecar; call 3 spent; three owner's-grant sentences left for the owner's word; no marker moves | Post-build-order (no step) | [design](specs/2026-11-20-al2-restatement-followup-design.md) | [plan](plans/2026-11-20-al2-restatement-followup.md) |
| 2026-11-20 | Staged integrity — `open()` binds only a staged draft (the opened one and the `proposed` one) that re-derives to the reference it was asked for, throwing on a mismatch (SPEC §8's loud-throw posture), and reads each caller-supplied option once into a snapshot, so the genesis never carries a value that was not verified | Post-build-order (no step) | [design](specs/2026-11-20-staged-integrity-design.md) | [plan](plans/2026-11-20-staged-integrity.md) |
| 2026-11-20 | Per-handle frozen closures — every function on the agent and operator handles is that handle's own frozen closure, so the handles share no function object and code holding only the agent handle can no longer plant `bind`/`call`/`apply` on a read the operator invokes with its own handle | Post-build-order (no step) | [design](specs/2026-11-20-surface-closures-design.md) | [plan](plans/2026-11-20-surface-closures.md) |
| 2026-11-20 | AL2 grant sentences — under the owner's word of 2026-11-20, the three sealed sentences the owner's 2026-11-19 grant conditioned (ARCHITECTURE §3 and §9, SCOPING-GUIDE §5) say AL2's third condition is met only where the sidecar is the configured store's own and written inside the append's atomic unit, not for any other sidecar, instead of "not yet met"; no marker moves | Post-build-order (no step) | [design](specs/2026-11-20-al2-grant-sentences-design.md) | [plan](plans/2026-11-20-al2-grant-sentences.md) |
| 2026-11-20 | Profile snapshot — `create()` keeps a frozen plain-data snapshot of each profile, validated and digested once, so mutating the host's object afterwards changes nothing and a class- or accessor-built profile is refused instead of escaping the digest; unknown data-valued keys, wrong types, non-array lists, bounds over 100 years and `terminalRefusals` members the leg can never produce throw at construction | Post-build-order (no step) | [design](specs/2026-11-20-profile-snapshot-design.md) | [plan](plans/2026-11-20-profile-snapshot.md) |
