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

**39 files in `specs/`, 42 in `plans/`** — not one-to-one. Three
plans carry no spec: the two step-1 completion/remediation plans
(`2026-08-03-autonomous-step-1-completion.md`, `2026-08-03-step-1-remediation.md`) and
this housekeeping plan's own (`2026-08-18-post-build-order-housekeeping.md`). Each is
noted "no spec" in its row below rather than paired with a design document that does not
exist.

**`docs/analysis/`** holds 21 files, the increment-history artifacts outside that pair
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
