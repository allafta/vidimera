# Pre-release code gaps — the full-tree sweep and its brainstorm

**Date: 2026-08-30.** This document records a sweep of every item the repository's own
records name as open, unresolved, undecided, deferred, parked, identified-but-not-built,
carry-forward, or unmeasured — and then asks, of each, three questions against the tree as
it stood at `main = 4e80bf7` on that date: is it still open, is its closing act a code
change, and do the records tie it to the first public release (the 0.1 cut)? The
catalogue below is the complete answer, item by item; the brainstorm after it is what the
catalogue suggests about what to build, in what order, and what to leave alone.

**What this document is not.** It decides nothing and moves nothing. The deferral register
(`docs/process/deferral-register.md`) stays the only ledger where a deferral is retired or
re-scoped; `docs/process/implementation-status.md` stays the authoritative account of what
is built; `docs/process/release-checklist.md` stays release day's list; `docs/process/
next-phases.md` stays the roadmap; `docs/process/open-items-plan.md` stays the staged plan
over the 2026-08-19 survey. Where this document and any of those disagree, this document is
stale and they win. Every line-number citation below was measured against `4e80bf7` on
2026-08-30 and drifts from that moment; every verdict is a reading by an independent
reader, not a proof — re-check at the site before acting on one.

---

## Headline

- **Three code edits gate the cut, and all three belong to the release commit:** drop
  `"private": true` from both manifests, bump both versions from `0.0.0` to `0.1.0` in
  lockstep, and — only if `node:sqlite` has reached Stability 2 on a maintained Node line by
  release day — raise `engines.node`, the two exact-floor workflow legs, and drop the vitest
  `execArgv` warning suppression. Nothing else in the tree blocks a publish.
- **Two register rows fire on the cut and are decisions, not fixes.** Rows 19 and 22a each
  have a pre-argued carry-forward ruling whose closing act is documentation; each also has a
  code path (a sidecar byte pin; the third-horn precheck) that this sweep recommends
  against taking at this cut, for the reasons the register already states.
- **One genuine pre-cut behavioral decision remains:** whether `SqliteStore` stays an eager
  re-export of the entry point (`packages/record/src/index.ts:83`), so that every adopter on
  Node 22.16–24.14 meets `node:sqlite`'s `ExperimentalWarning` at bare import, or moves to a
  lazy load. The recorded default is ship-as-is with the documented flag.
- **The pre-cut code surface beyond that is truth restoration and cheap hardening**, none of
  it gated: six stale claims in shipped source comments (verified against the tree), two
  stale test-corpus comments with the small tests they imply, registry-facing manifest
  metadata, an unpinned public error string, and a handful of adapter-evidence and gate-
  script gaps that are each under a day.
- **The bulk of open code work is documented post-0.1 by the repository's own records:** the
  can-fail campaign over eleven pass-path-only probes, deeper-leg probe driver shapes, the
  AL2 coverage grid's unexercised cells, a durable `SignatureStore` backing (row 22's first
  surviving trigger), prune-at-seal, the PostgreSQL floor leg, non-Linux first-use legs,
  and everything that rides the 1.0 store-interface freeze.

Counts, dated 2026-08-30: 528 raw findings from sixteen readers → 190 canonical items after
merge (24 raw findings dropped as demonstrably closed, each with its proof cited) → 3 more
from the completeness critic → 193 catalogued. Of those: 9 gate the cut, 2 are argued
pre-cut, 71 are code work placed after the cut, 29 are code-shaped but tied to no release,
11 are open but not code, 19 were verified already closed, and 52 were bucketed as
docs-only or owner-action from their documented closing act (four of which the critic
reclassified as code — flagged in place).

## Method, and its bounds

**Sweep.** Sixteen independent readers, one per source family, each reading its sources
whole: the deferral register and `next-phases.md`; the open-items plan and its session log;
`implementation-status.md` in four ranges (current state and outstanding lists;
per-SPEC-section status and named boundaries; the post-build-order increments in two
halves); `docs/concept/OPEN-QUESTIONS.md` with a marker grep over the sealed set; the
analysis records in two date ranges; the increment specs and plans in three date ranges;
`packages/record/src`; `packages/store-postgres`, the gate scripts, manifests and
workflows; the test corpora; and the release checklist with the public docset. Each reader
was told to cast a wide net — docs-only and owner-action items included, classified later —
and to cite `path:line` and a short verbatim phrase for every finding.

**Merge.** One pass over all 528 raw findings produced 190 canonical items, merging
duplicates across readers while keeping genuinely distinct sub-items apart (a durable
sidecar backing, prune-at-seal, the third-horn sanction and `SignatureStore.remove` are four
items, not one). The only permitted drop reason was repository text showing the item
already closed, with the proof cited; those 24 drop notes are reproduced in section H.

**Verification.** Items whose documented closing act was already `docs` or `owner-action`
(52) were bucketed without a further pass — section G. The remaining 138 were verified in
batches of six by independent readers instructed to refute the framing before accepting
it, answering three lenses per item with `path:line` evidence: still open against `HEAD`;
whether the closing act is code (TypeScript, tests, `scripts/*.mjs`, workflows, manifests,
configs) or documentation, a ruling, or an owner action; and whether a register trigger,
the checklist, `next-phases.md`, an open-items-plan stage, or an analysis ruling ties the
item to the cut. A completeness critic then re-read the primary sources looking for misses
and spot-checked the closed and not-code buckets; its three misses were verified the same
way and its five objections are recorded on the items they concern.

**Bucketing rule.** `CLOSED-ALREADY` if still-open is `no`; else `NOT-CODE` if the closing
act is not code; else by release tie: `GATES-CUT` (a documented gate or trigger names the
cut), `BEFORE-CUT` (argued, not gated — the argument is recorded on the item),
`POST-CUT-CODE` (the records place it after the cut or on the horizon),
`NOT-RELEASE-RELEVANT` (tied to no release).

**Quotations.** Every phrase a reader quoted was checked mechanically against the files its
citations name, whitespace-collapsed (the standing trap `CLAUDE.md` names: a quotation that
wraps a line is present in the source and invisible to a naive search). 221 of 287
matched and are marked verified; the 66 that did not are kept but labelled as the
reader's words, never the source's. A verified quotation proves presence, not that the
reader's reading of it is right.

**Bounds, stated plainly.** Live GitHub state — secrets, branch protection, vulnerability
reporting, the Dependabot queue — was not checked; the sweep read the repository only. The
critic did not re-read the specs, plans, guide, or most analysis records whole (it grepped
them), so a miss in those families would be a miss here too. Verdicts are readings by
independent readers under a refute-first instruction; the author spot-checked the shipped-
source staleness claims in sections A–B by hand and found each true, and did not hand-check
the rest. Effort estimates (S under a day, M one to three days, L a week, XL more) are
guesses. Nothing here was run: no gate, test, or build was executed for this record.

---

## Catalogue index

| # | Item | Bucket | Still open | Code | Effort | Release tie |
|---|---|---|---|---|---|---|
| 1 | `drop-private-true-both-manifests` — Drop `private: true` from both package manifests | GATES-CUT | yes | yes | S | gates-0.1 |
| 2 | `bump-version-0-1-0-both-manifests` — Bump both package versions from 0.0.0 to 0.1.0 (lockstep) | GATES-CUT | yes | yes | S | gates-0.1 |
| 3 | `release-commit-compose-tag-push` — Compose the release commit by hand, run every gate, tag v0.1.0, push (8be3fce a precedent to diff, never cherry-pick) | GATES-CUT | yes | yes | M | gates-0.1 |
| 4 | `node-floor-rule-reevaluation` — Re-evaluate the node:sqlite Node-floor rule on release day | GATES-CUT | yes | partial | S | gates-0.1 |
| 5 | `row-19-sidecar-byte-pins-disposition` — Row 19: absolute byte pins over the AL2 detached-signature sidecar — decide at the cut (pre-argued carry-forward) | GATES-CUT | yes | partial | S | gates-0.1 |
| 6 | `row-22a-orphan-sidecar-growth-disposition` — Row 22a: one orphan sidecar entry per no-edge refusing call — open, decide at the cut (pre-argued carry-forward) | GATES-CUT | yes | partial | S | gates-0.1 |
| 7 | `enforcement-pins-sound-after-one-refusing-call` — signing-enforce `entries.length === chain.length` pins sound only after exactly one refusing call | GATES-CUT | partial | partial | S | gates-0.1 |
| 8 | `critic-2-if-the-floor-rule-fires-raise-engines-no` — If the floor rule fires: raise engines.node in root, both packages, and CI exact-floor job | GATES-CUT | partial | partial | S | gates-0.1 |
| 9 | `experimental-warning-lazy-sqlite-load-alternative` — ExperimentalWarning on every import below Node 24.15; lazy SqliteStore load recorded but untaken | GATES-CUT | yes | partial | M | gates-0.1 |
| 10 | `manifests-metadata-fields` — Manifests lack homepage/bugs/keywords/publishConfig | BEFORE-CUT | uncertain | partial | S | should-land-before-0.1 |
| 11 | `redemption-shapes-build-own-and-naming-divergence` — Redemption family build-own shapes and naming divergence: three call names, listDue, begin-time correspondence, redeeming→unredeemable-state, reverify nesting; stale row-6 pointers | BEFORE-CUT | partial | partial | S | should-land-before-0.1 |
| 12 | `first-use-parked-script-improvements` — Three parked scripts/first-use.mjs improvements for the registry-dispatch commit | POST-CUT-CODE | yes | yes | S | documented-post-0.1 |
| 13 | `observedat-payload-byte-pin-excluded` — AL2 in-payload `observedAt` byte pin excluded because it drags the sidecar in | POST-CUT-CODE | yes | yes | S | documented-post-0.1 |
| 14 | `break-helpers-consolidation-and-rehoming` — Three near-duplicate signature-break helpers not consolidated; enlisted redeem signature test not re-homed | POST-CUT-CODE | yes | yes | S | horizon |
| 15 | `probe-driver-open-options` — ProbeDriver refinement: take `open()` options from the driver | POST-CUT-CODE | yes | yes | S | documented-post-0.1 |
| 16 | `decline-probe-candidate` — Decline probe for the self-test tier — candidate follow-up | POST-CUT-CODE | yes | yes | S | horizon |
| 17 | `contract-scan-mjs-yml-not-scanned` — contract-scan never reads .mjs or .yml — gate scripts, their tests, first-use script and workflows are ungated | POST-CUT-CODE | yes | yes | S | documented-post-0.1 |
| 18 | `api-sync-gate-bounds` — api-sync proves presence only; reads root entry point only (subpaths and store-postgres ungated); no reverse check | POST-CUT-CODE | yes | yes | S | documented-post-0.1 |
| 19 | `first-use-probe-tier-not-run` — Probe tier reached but never run in the first-use proof | POST-CUT-CODE | yes | yes | S | horizon |
| 20 | `postgres-11-floor-untested` — PostgreSQL 11 floor is a construct-inventory claim; only PostgreSQL 18 exercised | POST-CUT-CODE | yes | yes | S | documented-post-0.1 |
| 21 | `conformance-factory-no-teardown` — Conformance factory has no teardown; stores and the pg pool never closed | POST-CUT-CODE | yes | yes | S | horizon |
| 22 | `kernel-tx-seams-only-sqlite` — Kernel-level enlisted (tx) seams driven only over SqliteStore | POST-CUT-CODE | partial | yes | S | documented-post-0.1 |
| 23 | `payload-posture-backing-specific-postgres-untested` — Payload posture is backing-specific by design and unbound by conformance; Postgres posture untested | POST-CUT-CODE | partial | yes | S | documented-post-0.1 |
| 24 | `hardcoded-leg-index-expiry` — Residual hardcoded leg index in kernel/expiry.ts | POST-CUT-CODE | yes | yes | S | documented-post-0.1 |
| 25 | `redemption-order-pins-unpinned-cells` — Redemption ladder: token-vs-content order unobservable; (5)->(6) race pair untested; direct-seam CAS re-read pin unstated | POST-CUT-CODE | partial | yes | S | documented-post-0.1 |
| 26 | `prune-at-seal-identified-not-built` — Prune-at-seal: the one horn-free deletion point — identified, not designed, not built | POST-CUT-CODE | yes | yes | M | horizon |
| 27 | `layerverdicts-read-amplification` — Verification read amplification: `layerVerdicts` materializes every sidecar row (no pin) | POST-CUT-CODE | yes | yes | M | documented-post-0.1 |
| 28 | `cross-record-orphan-sweep` — No cross-record orphan view; per-record read only | POST-CUT-CODE | yes | yes | M | horizon |
| 29 | `al2-coverage-grid-bounds` — AL2 signature-break coverage bounds: genesis tampers only; throwing Verifier and non-genesis break untested; unnamed grid cells | POST-CUT-CODE | yes | yes | M | documented-post-0.1 |
| 30 | `benchmarks-hot-paths-unmeasured` — No benchmarks pre-1.0; named hot paths (append under contention, O(chain) verifies) and triggers | POST-CUT-CODE | partial | yes | M | horizon |
| 31 | `first-use-windows-macos-legs` — First-use proof is ubuntu only; Windows/macOS clean-machine legs not run (non-Linux rehearsal agenda item never recorded met) | POST-CUT-CODE | yes | yes | M | documented-post-0.1 |
| 32 | `digest-agility-inert` — Digest agility: sha256 only; deprecation-warning path unreachable and unexercised | POST-CUT-CODE | yes | yes | M | horizon |
| 33 | `profile-digest-no-drift-detector` — profileDigest recorded at open but never compared; no profile-drift detector | POST-CUT-CODE | yes | yes | M | horizon |
| 34 | `durable-signaturestore-backing-unmeasured` — Durable SignatureStore backing: only MemorySignatureStore exists; orphan behavior unmeasured | POST-CUT-CODE | yes | yes | L | horizon |
| 35 | `signing-cost-no-latency-cross-process` — Signing cost is an invocation count; no latency figure; concurrency measured in-process only | POST-CUT-CODE | yes | yes | L | horizon |
| 36 | `can-fail-campaign-eleven-probes` — Can-fail discipline for the eleven pass-path-only probes (stage-6 campaign) | POST-CUT-CODE | yes | yes | L | documented-post-0.1 |
| 37 | `probe-driver-deeper-leg-shapes` — Probe driver shapes: leg-0 / two-leg / single-leg-only narrowing (consultation-genuineness, sod-refuses, redemption, first-leg scans) | POST-CUT-CODE | yes | yes | L | documented-post-0.1 |
| 38 | `finalize-gate-ladder-extraction` — Extract the gate ladder out of finalize.ts — named a real problem, never scheduled | POST-CUT-CODE | yes | yes | L | horizon |
| 39 | `horizon-third-store-adapter` — Horizon: a third store adapter by an outside author | POST-CUT-CODE | yes | yes | XL | horizon |
| 40 | `key-retirement-permanent-minting` — Key retirement puts healthy sealed signing records into permanent orphan minting (no pin, no containment) | POST-CUT-CODE | yes | partial | S | documented-post-0.1 |
| 41 | `conformance-package-internals-transitiondigest` — transitionDigest/adapter-kit internals question for a future conformance package | POST-CUT-CODE | partial | partial | S | documented-post-0.1 |
| 42 | `committed-read-surface-and-isolation-observation` — Committed-read: named-not-built Store surface clause and read isolation under an open caller tx (1.0 freeze observation) | POST-CUT-CODE | partial | partial | S | documented-post-0.1 |
| 43 | `no-coverage-metric-triggers` — No coverage metric — two named re-look triggers | POST-CUT-CODE | partial | partial | S | documented-post-0.1 |
| 44 | `fail-close-cure-path-non-declaring-instance` — Fail-close cure path for the non-declaring same-id instance (C2) — pair may strand | POST-CUT-CODE | partial | partial | S | documented-post-0.1 |
| 45 | `governed-message-head-pin-decision` — Decide whether the GOVERNED unknown-option-key message head is a byte contract (row 7 corrected, not satisfied) | POST-CUT-CODE | yes | partial | S | documented-post-0.1 |
| 46 | `node-24-15-warning-boundary-bracketed` — node:sqlite 24.15 warning boundary bracketed, not measured; runner Node 24 assumed >= 24.15; 25.x unmeasured | POST-CUT-CODE | yes | partial | S | documented-post-0.1 |
| 47 | `types-node-26-vs-floor` — @types/node ^26 while engines floor is Node 22.16 | POST-CUT-CODE | uncertain | partial | S | documented-post-0.1 |
| 48 | `reading-facts-figures-canonicalizer` — facts.figures bypasses the adopter canonicalizer — build's reading of SPEC §3 | POST-CUT-CODE | yes | partial | S | documented-post-0.1 |
| 49 | `consultation-missing-two-producers-unobservable` — `consultation-missing` has two producers indistinguishable from the appended edge | POST-CUT-CODE | yes | partial | S | documented-post-0.1 |
| 50 | `no-general-inert-combination-check` — No general inert/contradictory feature-combination check (SPEC §9.1) | POST-CUT-CODE | partial | partial | S | documented-post-0.1 |
| 51 | `checker-extra-keys-recorded-verbatim` — Checker identity not exact-shaped; extra keys reach the digested payload | POST-CUT-CODE | partial | partial | S | documented-post-0.1 |
| 52 | `cut-decline-reason-payload-digest` — Cut: decline-reason as optional payload digest field — recovery path | POST-CUT-CODE | partial | partial | S | horizon |
| 53 | `signaturestore-remove-ruling` — Re-open the ruling that declined `SignatureStore.remove` (no contract way to vacate an association) | POST-CUT-CODE | yes | partial | M | horizon |
| 54 | `no-probe-for-orphan-reporting` — No operator-assurance probe covers sidecar orphan reporting (needs sealed CONTROLS §4 edit) | POST-CUT-CODE | yes | partial | M | horizon |
| 55 | `signer-memo-assumptions-unenforced` — Signer-result memo: same-object assumption enforced by convention; WeakMap GC property unassertable | POST-CUT-CODE | yes | partial | M | horizon |
| 56 | `listdue-findnonterminal-return-ids-narrowing` — listDue/findNonTerminal return recordIds, narrowing SPEC §12's 'records due' | POST-CUT-CODE | yes | partial | M | documented-post-0.1 |
| 57 | `signaturestore-shapes-provisional-pre-1-0` — SignatureStore/Signer/Verifier/SigningConfig shapes provisional pre-1.0 | POST-CUT-CODE | yes | partial | M | documented-post-0.1 |
| 58 | `probes-subpath-shapes-provisional-pre-1-0` — `@vidimera/record/probes` shapes provisional pre-1.0 | POST-CUT-CODE | yes | partial | M | documented-post-0.1 |
| 59 | `versioning-lockstep-re-ask-changesets` — Versioning: lockstep for 0.x, independent versioning/changesets re-asked at 1.0; honest empty adapter CHANGELOG entry per cut | POST-CUT-CODE | partial | partial | M | horizon |
| 60 | `al2-rehoming-residual` — AL2 rehoming residual: genesis profileId recompute to a non-signing profile — named, not closed | POST-CUT-CODE | yes | partial | M | documented-post-0.1 |
| 61 | `horizon-examples-host-consumer-example` — Horizon: in-repo examples host / consumer-shaped example (example packages need a purpose-trace) | POST-CUT-CODE | yes | partial | M | horizon |
| 62 | `oq6-unknown-staged-unknown-record-unminted` — OPEN-QUESTIONS §6: `unknown-staged`/`unknown-record` refusal codes not minted | POST-CUT-CODE | partial | partial | M | documented-post-0.1 |
| 63 | `enumeration-drift-no-gate-prose-sweep` — No gate covers SPEC §2 / docset enumeration drift; prose claims ungated; prose sweep needs its own increment | POST-CUT-CODE | yes | partial | M | documented-post-0.1 |
| 64 | `markdown-citations-no-gate` — Markdown citations checked by no gate (line-wrap quote trap recurs) | POST-CUT-CODE | yes | partial | M | documented-post-0.1 |
| 65 | `post-review-exports-unreviewed` — Seven exports and two options added after the 2026-08-19 API review are unreviewed by it | POST-CUT-CODE | yes | partial | M | documented-post-0.1 |
| 66 | `divergence-acker-vs-actor-and-nested-acks` — Held divergences on acks: `acker` vs SPEC §2's `actor`; acks nested per finding | POST-CUT-CODE | yes | partial | M | documented-post-0.1 |
| 67 | `self-test-tier-vocabulary-tension` — Self-test tier vocabulary tension (C5) and its lack of a SPEC section | POST-CUT-CODE | partial | partial | M | horizon |
| 68 | `sweep-recipe-not-seam-no-scheduler` — Operator sweep is a documented recipe, not a seam; no scheduler, no public expire() | POST-CUT-CODE | yes | partial | M | horizon |
| 69 | `cut-decline-disposition-field` — Cut: decline disposition field (RETURN/MODIFY/ESCALATE) — revisit point | POST-CUT-CODE | partial | partial | M | horizon |
| 70 | `cut-mandatory-provenance-leg-field` — Cut: mandatory-provenance leg-level requirement field | POST-CUT-CODE | yes | partial | M | horizon |
| 71 | `cut-cross-triple-proposed-refs` — Cut: cross-subject/profile/leg proposed refs — strict same-triple | POST-CUT-CODE | yes | partial | M | horizon |
| 72 | `cut-mandatory-result-presence` — Cut: mandatory effect-result presence — possible future profile field | POST-CUT-CODE | yes | partial | M | horizon |
| 73 | `third-horn-sanction-c3-c4-from-read-chain` — Third-horn sanction: decide C3/C4 from the read chain (chain-local admissibility precheck) — declined at this cut | POST-CUT-CODE | yes | partial | L | documented-post-0.1 |
| 74 | `orphan-delegation-host-reconciliation-unenforced` — Orphan handling delegated to the host: tolerate-and-prune obligation unenforced, same-seq race stated not guarded | POST-CUT-CODE | yes | partial | L | horizon |
| 75 | `store-interface-freeze-1-0-gate` — Store interface signature freeze — OPEN-QUESTIONS §9's 1.0 gate (meta-object form, tx type parameter, listDue signature) | POST-CUT-CODE | yes | partial | L | documented-post-0.1 |
| 76 | `conformance-suite-export-re-ask-1-0` — Store conformance suite export — declined for 0.x, re-asked at the 1.0 freeze (vendoring drift, vitest-major axis) | POST-CUT-CODE | partial | partial | L | documented-post-0.1 |
| 77 | `single-writer-bound-seq-conflict-throw` — Single-writer bound: seq-conflict storage-fault throw survives; lost-CAS refusal arms tolerated; (5.7)->(6) pair unconstructible | POST-CUT-CODE | partial | partial | L | horizon |
| 78 | `cut-proposer-withdrawal-verb` — Cut: proposer withdrawal verb — distinct future promotion case | POST-CUT-CODE | partial | partial | L | horizon |
| 79 | `cut-multi-hop-draft-lineage` — Cut: multi-hop draft lineage inside one record | POST-CUT-CODE | yes | partial | L | horizon |
| 80 | `cut-editor-identity-first-class` — Cut: editor identity on a revision as a first-class field (recipe documented) | POST-CUT-CODE | partial | partial | L | horizon |
| 81 | `cut-structured-effect-result-fields` — Cut: structured effect-result fields (executionId, transactionId, effectTarget) | POST-CUT-CODE | yes | partial | L | horizon |
| 82 | `stage6-stage7-sessions-unscheduled` — Stage-6 architectural sessions and stage-7 scoping sessions — none scheduled, each needs a brainstorm and spec/plan pair | POST-CUT-CODE | yes | partial | XL | documented-post-0.1 |
| 83 | `positional-sidecar-reads-in-tests` — Three loud positional `entries[0]` sidecar reads left in the test corpus | NOT-RELEASE-RELEVANT | yes | yes | S | not-release-relevant |
| 84 | `transitionref-equals-digest-unasserted` — No append site asserts the returned transitionRef equals the appended edge's digest | NOT-RELEASE-RELEVANT | partial | yes | S | not-release-relevant |
| 85 | `signature-site-census-naming-not-testing` — Signature-enforcement-sites census proves naming, not testing; per-line grep evadable | NOT-RELEASE-RELEVANT | yes | yes | S | not-release-relevant |
| 86 | `postgres-probe-driver-missing` — Probe suite driven over Memory and SQLite only; no Postgres ProbeDriver | NOT-RELEASE-RELEVANT | yes | yes | S | not-release-relevant |
| 87 | `probe-target-controls-citation-no-backstop` — Probe target strings quote CONTROLS §4 verbatim with no automated backstop | NOT-RELEASE-RELEVANT | yes | yes | S | not-release-relevant |
| 88 | `gate-scripts-stdout-stderr-divergence` — Gate scripts disagree on findings stream (contract-scan stdout vs siblings stderr) | NOT-RELEASE-RELEVANT | yes | yes | S | not-release-relevant |
| 89 | `provenance-structural-riders-unbuilt` — Provenance LATER-STEP riders unbuilt: kernel/context.ts extraction, mintToken injectable seam, export-completeness policy | NOT-RELEASE-RELEVANT | partial | yes | S | not-release-relevant |
| 90 | `magnitude-never-value-pinned` — `magnitude` payload field never value-pinned | NOT-RELEASE-RELEVANT | yes | yes | S | not-release-relevant |
| 91 | `defensive-unknown-profile-arms-untested` — Defensive unknown-profile arms at finalize/seal not exercised by tests | NOT-RELEASE-RELEVANT | yes | yes | S | not-release-relevant |
| 92 | `findings-composite-pin-test-plan-residuals` — Findings-flow composite pin across every earlier gate tier and its test plan not recorded landed | NOT-RELEASE-RELEVANT | partial | yes | S | not-release-relevant |
| 93 | `inherited-analysis-findings-unverified` — Inherited analysis findings: asymmetric outcome-constructor guard and masking-scope fixture unverified closed | NOT-RELEASE-RELEVANT | uncertain | yes | S | not-release-relevant |
| 94 | `critic-1-gate-scripts-read-only-tracked-files-unt` — Gate scripts read only tracked files; untracked docs invisible until `git add` | NOT-RELEASE-RELEVANT | partial | yes | S | not-release-relevant |
| 95 | `cross-backing-byte-identity-three-flows` — Cross-backing byte identity covers only three scripted flows | NOT-RELEASE-RELEVANT | yes | yes | M | not-release-relevant |
| 96 | `row22-corpus-census-withdrawn` — Row-22 filing-time corpus census (72/64/68) withdrawn, not re-derived | NOT-RELEASE-RELEVANT | yes | partial | S | not-release-relevant |
| 97 | `al2-pins-no-mutation-witness-redemption-prologue` — AL2 pins at the redemption prologue and decline rest on structural proofs, no mutation witness | NOT-RELEASE-RELEVANT | yes | partial | S | not-release-relevant |
| 98 | `contract-scan-resolver-bounds` — contract-scan citation resolver: eight declared unchecked classes (bound 8 a live risk) | NOT-RELEASE-RELEVANT | yes | partial | S | not-release-relevant |
| 99 | `docs-index-sync-bounds-and-dead-branch` — docs-index-sync: presence and arithmetic only, docs/analysis never tabulated; dead `analysisWordOne` branch | NOT-RELEASE-RELEVANT | yes | partial | S | not-release-relevant |
| 100 | `first-use-silent-pg-skip` — first-use.mjs exits 0 with the PostgreSQL half skipped when VIDIMERA_PG_URL is unset | NOT-RELEASE-RELEVANT | partial | partial | S | not-release-relevant |
| 101 | `windows-ci-unpinned-postgres` — Windows CI leg runs against the runner image's unpinned PostgreSQL | NOT-RELEASE-RELEVANT | partial | partial | S | not-release-relevant |
| 102 | `observedat-wider-admission-reading` — `observedAt` admitted on any obtained consultation — wider than SPEC:1312's letter | NOT-RELEASE-RELEVANT | partial | partial | S | not-release-relevant |
| 103 | `record-exists-no-blocker-locator` — `record-exists` Outcome carries no blocking-record locator | NOT-RELEASE-RELEVANT | yes | partial | S | not-release-relevant |
| 104 | `appendbatch-seal-finality-entry-only` — appendBatch seal-finality checked at entry only | NOT-RELEASE-RELEVANT | yes | partial | S | not-release-relevant |
| 105 | `provenance-leak-scan-pattern-owner-call` — Provenance-leak disposition: extend contract-scan with sibling-project name patterns vs out-of-band grep | NOT-RELEASE-RELEVANT | yes | partial | S | not-release-relevant |
| 106 | `due-open-no-argument-free-resolver` — Due-`open` rough edge: no argument-free resolver | NOT-RELEASE-RELEVANT | yes | partial | M | not-release-relevant |
| 107 | `no-redeembound-lost-token-strand` — Omitting redeemBound leaves a begun record with a lost token no exit | NOT-RELEASE-RELEVANT | yes | partial | M | not-release-relevant |
| 108 | `review-pure-reads-unverified` — review() and other pure reads never chain- or signature-verify | NOT-RELEASE-RELEVANT | partial | partial | M | not-release-relevant |
| 109 | `al3-anchoring-sketched-inactive` — AL3 external anchoring: documented-only [SKETCHED], deliberately inactive | NOT-RELEASE-RELEVANT | yes | partial | XL | not-release-relevant |
| 110 | `orphans-report-read-by-no-gate` — `SignatureReport.orphans` is reporting only: read by no gate, bounds nothing | NOT-RELEASE-RELEVANT | partial | partial | n/a | not-release-relevant |
| 111 | `concurrent-legs-out-of-scope-pre-1-0` — Concurrent legs out of scope pre-1.0 (OPEN-QUESTIONS §8); non-admission recording | NOT-RELEASE-RELEVANT | partial | partial | n/a | not-release-relevant |
| 112 | `open-items-plan-sessions-stale-superseded` — open-items-plan/sessions and the release-readiness section still describe the old paused banner (cherry-pick recipe, tag, waiver, 'table empties', stale guard count) | NOT-CODE | partial | no | S | not-release-relevant |
| 113 | `reading-redeem-bounds-seconds-unit` — Seconds unit for confirmToRedeem/redeemBound is the build's convention, spec-silent | NOT-CODE | partial | no | S | not-release-relevant |
| 114 | `reading-ackmode-current-raiser` — ackMode compares against the current re-raise's raiser — SPEC §10.2's singular left unversioned | NOT-CODE | partial | no | S | not-release-relevant |
| 115 | `supersedes-unverified-absent-from-spec-8` — `supersedes-unverified` minted but absent from SPEC §8's sealed enumerations | NOT-CODE | yes | no | S | documented-post-0.1 |
| 116 | `al2-sub-decisions-oq1-docket` — AL2 sub-decisions (detached-signer contract; synchrony and signer-outage class) absent from OPEN-QUESTIONS §1 | NOT-CODE | partial | no | S | horizon |
| 117 | `critic-0-adapter-smoke-coverage-is-packaging-leve` — Adapter smoke coverage is packaging-level only: no live DB, no confirm loop | NOT-CODE | partial | no | S | documented-post-0.1 |
| 118 | `spec-10-3-reverse-cross-instance-fail-close-sealed-text` — SPEC §10.3 reverse cross-instance direction: build decided fail-close; sealed SPEC/CONTROLS/ASSURANCE still say permissive/open | NOT-CODE | yes | no | n/a | horizon |
| 119 | `oq10-al3-interval-disclosure-undesigned` — OPEN-QUESTIONS §10: AL3 interval and disclosure design undesigned | NOT-CODE | yes | no | n/a | horizon |
| 120 | `spec-9-opening-four-calls-omits-decline` — SPEC §9 opening sentence still counts four calls and omits decline() | NOT-CODE | yes | no | n/a | documented-post-0.1 |
| 121 | `spec-6-13a-restatements-without-decline` — SPEC §6 and §13A restatements deliberately left finalize-only (no decline) | NOT-CODE | partial | no | n/a | documented-post-0.1 |
| 122 | `spec-terminal-state-enumerations-non-uniform` — SPEC's terminal/no-edge state enumerations are non-uniform (§5, §8, §12 C3) | NOT-CODE | yes | no | n/a | documented-post-0.1 |
| 123 | `divergence-decisionrecord-status-field` — Held divergence: `DecisionRecord.status` absent from SPEC §2's record table | CLOSED-ALREADY | no | partial | S | documented-post-0.1 |
| 124 | `proposer-multi-leg-only-loosenable` — `proposer` restricted to multi-leg profiles — conservative reading, loosenable later | CLOSED-ALREADY | no | partial | S | not-release-relevant |
| 125 | `clock-id-token-seams-off-public-surface` — Clock, id minter and token source deliberately off the public surface | CLOSED-ALREADY | no | partial | S | not-release-relevant |
| 126 | `coverage-test-proves-mention` — byte-regression coverage.test.ts proves MENTION, not coverage | CLOSED-ALREADY | no | partial | S | not-release-relevant |
| 127 | `cross-record-claims-no-evidence-edge` — verifyPriorLegs/verifySupersedes refuse pre-record, leaving a broken prior leg or predecessor unmarked | CLOSED-ALREADY | no | partial | n/a | not-release-relevant |
| 128 | `no-destroy-retention-seam` — No destroy/retention seam; destroyed-prior posture pinned only by an empty-store stand-in | CLOSED-ALREADY | no | partial | n/a | not-release-relevant |
| 129 | `tamper-evident-probe-not-driven-real-db` — Tamper-evident probe reports not-driven when the host store cannot be seeded | CLOSED-ALREADY | no | no | n/a | not-release-relevant |
| 130 | `outside-party-capabilities-anti-goal` — Outside-party capabilities cut by design (anti-goal #4) — standing exclusion, rescope documented | CLOSED-ALREADY | no | no | n/a | not-release-relevant |
| 131 | `embedded-postgres-beta-pin` — embedded-postgres dev pin is a beta release; behavior changes met only at the weekly bump | CLOSED-ALREADY | no | no | n/a | not-release-relevant |
| 132 | `supersedes-three-way-sealed-divergence` — Three-way sealed divergence on recovery/`supersedes` (CONTROLS vs SPEC §9.1 table vs §2/§9) | CLOSED-ALREADY | no | no | n/a | not-release-relevant |
| 133 | `open-en-passant-blocker-expire-unverified` — open()'s en-passant blocker expire replays without verifying — SPEC §5's verify-first not universal | CLOSED-ALREADY | no | no | n/a | not-release-relevant |
| 134 | `memorystore-rejects-tx` — MemoryStore throws on tx enlistment | CLOSED-ALREADY | no | no | n/a | not-release-relevant |
| 135 | `never-satisfiable-required-kind-holds-pair` — Never-satisfiable required consultation kind holds the pair indefinitely under expiry:'none' | CLOSED-ALREADY | no | no | n/a | not-release-relevant |
| 136 | `sod-same-human-different-principal` — SoD same-human-different-principal residual (§10.1's AL1 limit) | CLOSED-ALREADY | no | no | n/a | not-release-relevant |
| 137 | `cross-leg-content-and-policy-binding-not-verified` — Cross-leg content binding and cross-leg policyDigest equality not verified | CLOSED-ALREADY | no | no | n/a | not-release-relevant |
| 138 | `byte-pin-combination-coverage-bound` — Byte-pin combination coverage — permanent scope bound, no register row | CLOSED-ALREADY | no | no | n/a | not-release-relevant |
| 139 | `conformance-appendbatch-arity-gap` — Conformance-suite appendBatch arity >= 4 coverage — gap to report, outcome unrecorded | CLOSED-ALREADY | no | no | n/a | not-release-relevant |
| 140 | `live-capture-human-anchor-sentence-and-sequencing-record` — Live capture: SPEC §9 human-anchor sentence fork check and the 8.2/8.3 sequencing decision — recording unverified | CLOSED-ALREADY | no | no | n/a | not-release-relevant |
| 141 | `unfrozen-surfaces-construction-read-conveniences` — Unfrozen surfaces: construction and the two handles' read conveniences | CLOSED-ALREADY | no | no | n/a | not-release-relevant |
| 142 | `row-1-release-workflow-first-exercise` — Row 1: exercise release.yml once at the 0.1 cut (first provenance-attested publish) | G (pre-bucketed: owner-action) | — | — | — | — |
| 143 | `changelog-cut-0-1-0-from-unreleased` — Cut CHANGELOG `[0.1.0]` fresh from `[Unreleased]` | G (pre-bucketed: docs) | — | — | — | — |
| 144 | `docset-unpublished-caveats-flip` — Flip the docset's 'unpublished' caveats (README, guide, SECURITY, docs/README, both package READMEs) | G (pre-bucketed: docs) | — | — | — | — |
| 145 | `claude-md-release-day-skim` — CLAUDE.md release-day skim: remove private-workflow residue, update honest-bound paragraph | G (pre-bucketed: docs) | — | — | — | — |
| 146 | `repository-visibility-flip-public` — Flip repository visibility to public before the dispatch (precondition for two other settings) | G (pre-bucketed: owner-action) | — | — | — | — |
| 147 | `npm-scope-and-npm-token-secret` — Register the npm @vidimera scope and create a live granular NPM_TOKEN secret | G (pre-bucketed: owner-action) | — | — | — | — |
| 148 | `private-vulnerability-reporting-setting` — Enable GitHub private vulnerability reporting | G (pre-bucketed: owner-action) | — | — | — | — |
| 149 | `branch-protection-code-owner-review` — Enable require-review-from-code-owners branch protection (CODEOWNERS is advisory) | G (pre-bucketed: owner-action) | — | — | — | — |
| 150 | `owner-readiness-bar-precondition` — Owner's readiness bar: the unticked judgment precondition | G (pre-bucketed: owner-action) | — | — | — | — |
| 151 | `registry-first-use-dispatch-post-publish` — Post-publish: dispatch first-use.yml with `source: registry` and record the run (re-proves packed adapter live) | G (pre-bucketed: owner-action) | — | — | — | — |
| 152 | `post-cut-paperwork-row1-roadmap-measured-block` — Post-cut paperwork: retire row 1, roadmap update in next-phases, refresh the measured block dated | G (pre-bucketed: docs) | — | — | — | — |
| 153 | `row22-trigger-frozen-tier3-copy` — Row-22 trigger: four living copies plus one deliberately frozen divergent Tier 3 copy | G (pre-bucketed: docs) | — | — | — | — |
| 154 | `row-number-derivation-parentheticals` — Rows 19 and 22 row-number derivation parentheticals carried verbatim, not re-run | G (pre-bucketed: docs) | — | — | — | — |
| 155 | `containment-inventory-grep-trap` — 'CONTAINMENT INVENTORY' premise grep now yields a false negative (plan-author trap) | G (pre-bucketed: docs) | — | — | — | — |
| 156 | `same-millisecond-orphan-collapse` — Same-millisecond refusing calls collapse two orphans onto one sidecar key (~1 in 12 observed) | G (pre-bucketed: docs) | — | — | — | — |
| 157 | `sidecar-ordering-defects-latent-reachability` — Sidecar-ordering reader defects pinned under injected ordering; host ProbeDriver shapes not enumerated, shared durable sidecar not modelled | G (pre-bucketed: docs) | — | — | — | — |
| 158 | `session-9-10-pickup-unscheduled` — Sessions 9 (pickup decisions) and 10 (execution run) unscheduled — owner's readiness bar | G (pre-bucketed: owner-action) | — | — | — | — |
| 159 | `delete-merged-adopt-branch` — Delete the fully merged origin/adopt-reference-implementation branch | G (pre-bucketed: owner-action) | — | — | — | — |
| 160 | `contract-scan-paraphrase-bounds-note` — Record the 'wrong paraphrase under a valid section number' lesson in the resolver's bounds list | G (pre-bucketed: docs) | — | — | — | — |
| 161 | `ed448-exclusion-inert` — `ed448` commit-ref exclusion is a documented no-op — **reclassified by the critic as code** | G (pre-bucketed: docs) | — | — | — | — |
| 162 | `pr-template-omits-gates` — PR template not given docs-index-sync (nor api-sync, lint, build, smoke) — parked | G (pre-bucketed: docs) | — | — | — | — |
| 163 | `readme-contributing-fence-alignment` — README/CONTRIBUTING docs-index-sync fence lines misalign neighbor comment columns by two chars — parked | G (pre-bucketed: docs) | — | — | — | — |
| 164 | `release-checklist-line-24-wrap` — release-checklist.md:24 overruns the file's wrap width | G (pre-bucketed: docs) | — | — | — | — |
| 165 | `release-checklist-prose-stale-no-pin` — Release checklist prose is dated and unpinned; re-read against the tree on release day | G (pre-bucketed: docs) | — | — | — | — |
| 166 | `workflow-dispatch-default-branch-trap` — workflow_dispatch registers only from the default branch — trap for later plans | G (pre-bucketed: docs) | — | — | — | — |
| 167 | `getting-started-prose-unproven` — Getting-started prose unproven by a first-time reader | G (pre-bucketed: owner-action) | — | — | — | — |
| 168 | `first-use-no-automatic-rerun` — First-use run is one run on one date; nothing re-runs it — **reclassified by the critic as code** | G (pre-bucketed: owner-action) | — | — | — | — |
| 169 | `zero-one-adopter-stability-statement` — State what 0.1 promises where an adopter reads it (release notes and README mirror the pre-1.0 instability marking) | G (pre-bucketed: docs) | — | — | — | — |
| 170 | `adopter-residual-risk-posture-docs` — ASSURANCE §7 adopter residual-risk obligations — verify the publish-facing docs carry them | G (pre-bucketed: docs) | — | — | — | — |
| 171 | `postgres-tx-pool-custody-bound` — PostgresStore enlisted-tx same-pool custody cannot be verified | G (pre-bucketed: docs) | — | — | — | — |
| 172 | `listdue-no-ordering-promised` — listDue promises no ordering of returned ids | G (pre-bucketed: docs) | — | — | — | — |
| 173 | `dependabot-dev-patch-drift` — Dev-only dependency patch drift left to weekly Dependabot (open PR branch pending) | G (pre-bucketed: owner-action) | — | — | — | — |
| 174 | `node-sqlite-experimental-watch-item` — node:sqlite experimental watch item; remove the vitest ExperimentalWarning suppression when it stabilizes — **reclassified by the critic as code** | G (pre-bucketed: owner-action) | — | — | — | — |
| 175 | `sqlite-single-operator-bound` — SqliteStore is single-operator; no multi-connection safety claimed | G (pre-bucketed: docs) | — | — | — | — |
| 176 | `spec-9-2-reverify-open-wording-stale` — SPEC §9.2 still calls the live-capture reverify seam's append semantics an open decision | G (pre-bucketed: docs) | — | — | — | — |
| 177 | `recovery-flow-details-open-wording-stale` — SPEC §2 / CONTROLS phrase recovery-flow details as still enumerated open | G (pre-bucketed: docs) | — | — | — | — |
| 178 | `whole-record-absence-residual` — Whole-record absence residual unclosed at every shipped level | G (pre-bucketed: docs) | — | — | — | — |
| 179 | `al1-head-bound-windows-non-signing` — AL1 head-bound tamper windows (SoD evidence, policyDigest, last transition) stay open for non-signing profiles; comments still call AL2 'eventual' | G (pre-bucketed: docs) | — | — | — | — |
| 180 | `genuineness-bounds-library-never-verifies` — Genuineness bounds: proofRef, eligibility, consultation/freshness, findings, observedAt, live path-independence never verified by the library | G (pre-bucketed: docs) | — | — | — | — |
| 181 | `host-duties-privacy-retention-key-custody` — Host duties the library cannot enforce: privacy/retention, key generation/distribution/rotation | G (pre-bucketed: docs) | — | — | — | — |
| 182 | `gap-list-guide-recipes-conditions-delegation-policy-verdict` — Gap-list guide recipes not written: conditions, delegation, policy-verdict | G (pre-bucketed: docs) | — | — | — | — |
| 183 | `begin-ok-payload-secret-doc-note` — Host-facing doc note: beginRedemption's ok payload is secret material | G (pre-bucketed: docs) | — | — | — | — |
| 184 | `implementation-status-stale-cells` — implementation-status.md stale cells and counts (§0, §2.1, §4, §5, §8 count-pin, §9.1, §10 heading, 'nine things', governedUnavailable two, thirteen commits, six sites) | G (pre-bucketed: docs) | — | — | — | — |
| 185 | `stale-source-comments` — Stale source comments: appendsOn 'only callers', id.ts Node>=24, store.ts 'once a real Postgres adapter lands', redeem.ts 'until the SoD step', content-binding GOVERNED-throws — **reclassified by the critic as code** | G (pre-bucketed: docs) | — | — | — | — |
| 186 | `public-doc-stale-wording` — Public-doc stale wording: api-reference 'Signing (AL2) — structural today'; CONTRIBUTING 'CI does not necessarily test the floor'; getting-started '750-plus tests' | G (pre-bucketed: docs) | — | — | — | — |
| 187 | `provenance-doc-stale-entries` — adopted-source-provenance.md stale entries: item 10 (OpenOptions) SKIPPED though exported; stage.ts note says unknown-leg producer 'still missing' | G (pre-bucketed: docs) | — | — | — | — |
| 188 | `stage-ts-provenance-asymmetry` — kernel/stage.ts taken from a later reference head — standing provenance asymmetry | G (pre-bucketed: docs) | — | — | — | — |
| 189 | `recovery-predecessor-transitive-pin` — Recovery predecessor encoding pinned only transitively | G (pre-bucketed: docs) | — | — | — | — |
| 190 | `race-fixture-try-catch-hazard` — RaceThenAppendStore fixture preconditions would be swallowed by a future try/catch | G (pre-bucketed: docs) | — | — | — | — |
| 191 | `three-class-widening-record-fixture-provenance` — Record the three-class outcome widening as a decision; byte-stability fixture provenance | G (pre-bucketed: docs) | — | — | — | — |
| 192 | `last-store-perturbing-step-assertion` — Assert 'last store-perturbing step' in step 3's exit note | G (pre-bucketed: docs) | — | — | — | — |
| 193 | `ci-matrix-yaml-first-push-validation` — CI matrix workflow YAML validated only on an actual push (likely closed, unconfirmed) | G (pre-bucketed: owner-action) | — | — | — | — |


## A. Code the cut itself requires (9 items)

### 1. Drop `private: true` from both package manifests

`drop-private-true-both-manifests` · merged from 4 reader finding(s) · readers' guess: code / gates-0.1

**What is open.** Both manifests still carry `private: true`, the single deliberate publish block; release.yml's guard refuses while present. Dropping it also fires one of row 22's trigger disjuncts.

**Where documented.** `docs/process/implementation-status.md:1095-1097`; `docs/analysis/2026-08-19-phase-2-packaging.md:17-24`; `packages/record/package.json:4`; `packages/store-postgres/package.json:4`; `.github/workflows/release.yml:5-6`; `docs/process/release-checklist.md:100`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "`private: true` is the sole release-day gate" — `docs/analysis/2026-08-19-phase-2-packaging.md`
- "Drop `"private": true` from both manifests — the one deliberate publish block." — `docs/process/release-checklist.md`

**Still open?** `yes` — packages/record/package.json:4 and packages/store-postgres/package.json:4 both still read `"private": true`; .github/workflows/release.yml:33 guard refuses while `p.private` is set; docs/process/release-checklist.md:100 checkbox unticked; docs/process/implementation-status.md:1096 'private: true stays as the one deliberate publish block until the 0.1 cut'.

**Is the closing act code?** `yes` (effort S). Delete the `"private": true` line from packages/record/package.json:4 and packages/store-postgres/package.json:4 as part of the single release commit (release-checklist.md:94-116). No test pins the flag; release.yml:29-37's guard is the only check and needs no change. Doing so also fires row 22's second trigger disjunct (deferral-register.md:13), so the same commit must carry a row-22 disposition.

**Release tie.** `gates-0.1` — docs/process/release-checklist.md:100 (File changes, one commit, tagged); .github/workflows/release.yml:5-6 and :29-37 (guard refuses publish while private); docs/analysis/2026-08-19-phase-2-packaging.md:17 'private: true is the sole release-day gate'.

**Risk if 0.1 ships with it open.** There is no 0.1 at all: npm publish is refused by the flag and release.yml's guard exits 1, so the release cannot happen while it stays.

### 2. Bump both package versions from 0.0.0 to 0.1.0 (lockstep)

`bump-version-0-1-0-both-manifests` · merged from 3 reader finding(s) · readers' guess: code / gates-0.1

**What is open.** Both manifests sit at 0.0.0; release.yml refuses 0.0.0. Lockstep ruling: both packages carry the same version and publish together. The bump also gives the adapter's pnpm-rewritten peer range a real value.

**Where documented.** `packages/record/package.json:3`; `packages/store-postgres/package.json:3`; `.github/workflows/release.yml:5,29`; `docs/process/release-checklist.md:95-99`; `docs/process/implementation-status.md:1095-1097`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "bump both versions off 0.0.0" — `.github/workflows/release.yml`
- "Bump `version` to `0.1.0` in `packages/record/package.json` **and** `packages/store-postgres/package.json`" — `docs/process/release-checklist.md`

**Still open?** `yes` — packages/record/package.json:3 and packages/store-postgres/package.json:3 both read `"version": "0.0.0"`; .github/workflows/release.yml:34 refuses `p.version === '0.0.0'`; docs/process/release-checklist.md:95-99 checkbox unticked; docs/process/implementation-status.md:1097 '`version` stays `0.0.0` until then'.

**Is the closing act code?** `yes` (effort S). Set `version` to `0.1.0` in both manifests (lockstep per docs/analysis/2026-08-20-versioning-mechanics.md, cited at release-checklist.md:96-99); release.yml:6-8's tarball-first publish then rewrites the adapter's `workspace:*` peer range to the real value. Root package.json version is not named by the checklist. Manifest-only edit within the release commit.

**Release tie.** `gates-0.1` — docs/process/release-checklist.md:95-99 (File changes); .github/workflows/release.yml:5 'bump both versions off 0.0.0' and :34 guard; docs/process/implementation-status.md:1097.

**Risk if 0.1 ships with it open.** release.yml's guard refuses to publish a 0.0.0 package, so no artifact reaches the registry; if forced, the adapter's peer range would resolve to a meaningless 0.0.0.

### 3. Compose the release commit by hand, run every gate, tag v0.1.0, push (8be3fce a precedent to diff, never cherry-pick)

`release-commit-compose-tag-push` · merged from 7 reader finding(s) · readers' guess: mixed / gates-0.1

**What is open.** The release commit has yet to be authored from the checklist's file list against the current tree; 8be3fce is stale in content and only a diff precedent. Then run all gates, commit, tag v0.1.0 (name free since the stale tag's deletion), push. open-items-plan's 'cherry-pick' wording is superseded by the checklist.

**Where documented.** `docs/process/next-phases.md:95-98`; `docs/process/open-items-plan.md:192-196`; `docs/process/open-items-sessions.md:249-251`; `docs/process/implementation-status.md:3736-3738`; `docs/process/implementation-status.md:3799-3801`; `docs/superpowers/specs/2026-08-29-checklist-refresh-design.md:143`; `docs/process/release-checklist.md:13-18,114-116`; `.github/workflows/release.yml:4-7`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "a precedent to diff against, never a commit to cherry-pick" — `docs/process/next-phases.md`
- "The re-cut recipe is a list of files, not a commit: release day still composes the release commit by hand" — `docs/process/implementation-status.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- compose the release commit fresh from the "File changes" list below against the tree as it stands, using `8be3fce` only as the precedent

**Still open?** `yes` — docs/process/release-checklist.md:13-18 'compose the release commit fresh from the "File changes" list ... Then run every gate, commit, tag `v<version>`, push with the tag' with all File-changes boxes unticked (:95-116); implementation-status.md:3799-3801 'release day still composes the release commit by hand'; next-phases.md:96-98 '`8be3fce` is a precedent to diff against, never a commit to cherry-pick'; git log HEAD=4e80bf7 shows no cut commit and no v0.1.0 tag (tag deleted per release-checklist.md:26-28). Note open-items-plan.md:192-196's 'cherry-pick `8be3fce`' wording is stale and superseded by the checklist banner.

**Is the closing act code?** `yes` (effort M). One hand-composed commit touching: both package.json manifests (version, private), CHANGELOG.md ([0.1.0] section cut from [Unreleased]), and the docset flips listed at release-checklist.md:102-113 (README.md, docs/guide/getting-started.md, api-reference.md, faq.md, SECURITY.md, docs/README.md, both package READMEs, CLAUDE.md honest-bound paragraph); then the gate chain at release-checklist.md:114-116, tag v0.1.0, push. Mixed manifest+docs, but the manifest edits make it a code-shaped change; also a candidate to fix open-items-plan.md:192's stale cherry-pick wording.

**Release tie.** `gates-0.1` — docs/process/release-checklist.md:13-18 and :93-116 (the release commit is the cut); .github/workflows/release.yml:4-7 'bump both versions off 0.0.0, drop both private: true, commit, tag v<version>, then dispatch'; next-phases.md:95-98.

**Risk if 0.1 ships with it open.** This item IS the 0.1 cut; left open there is no release commit, no tag, and nothing for release.yml to publish.

### 4. Re-evaluate the node:sqlite Node-floor rule on release day

`node-floor-rule-reevaluation` · merged from 6 reader finding(s) · readers' guess: decision / gates-0.1

**What is open.** Rule: if a maintained Node line carries a Stability-2 node:sqlite by the cut, raise engines.node (root and both packages) and CI's exact-floor leg; evaluated 2026-08-29 and did NOT fire (Stability 1.2 at 24.15), but the evaluation is dated and must be re-run on the day. Session 9 frames it as a three-way including the lazy-load reshape.

**Where documented.** `docs/process/open-items-plan.md:210-214`; `docs/process/open-items-sessions.md:237-246`; `docs/analysis/2026-08-19-phase-0-decisions.md:31-36`; `docs/process/implementation-status.md:3719-3724`; `docs/process/release-checklist.md:73-91`; `docs/superpowers/specs/2026-08-29-checklist-refresh-design.md:59`; `docs/analysis/2026-08-29-first-use-proof.md:126-128`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "`node:sqlite`'s floor decision is deferred to release day, with the rule fixed now" — `docs/analysis/2026-08-19-phase-0-decisions.md`
- "Re-evaluate on the day against the Node lines THEN: if any maintained line has reached Stability 2, this rule fires as written" — `docs/process/release-checklist.md`

**Still open?** `yes` — docs/process/release-checklist.md:73-91 checkbox unticked; :82-83 'Evaluated 2026-08-29 — the rule did NOT fire' but :89-91 'Re-evaluate on the day against the Node lines THEN'; implementation-status.md:3719-3724 'The item is dated on its face and hands the question back: release day re-evaluates'; next-phases.md:94-96; engines still `>=22.16` at package.json:6, packages/record/package.json:15, packages/store-postgres/package.json:15, and ci.yml:39 floor leg 22.16.0.

**Is the closing act code?** `partial` (effort S). Decision on release day. If a maintained Node line has a Stability-2 node:sqlite by then: raise `engines.node` in root package.json:6 and both packages' package.json:15, change .github/workflows/ci.yml:39 (and first-use.yml's floor leg) exact-floor version, update packages/record/README.md:26 'Requires Node 22.16 or newer' and docs/guide/integrating.md:38-46 warning prose. If not (the 2026-08-29 outcome): tick the box and ship as-is, no code.

**Release tie.** `gates-0.1` — docs/process/release-checklist.md:73-91 (floor rule item on the release-day list); docs/analysis/2026-08-19-phase-0-decisions.md:31-36 'floor decision is deferred to release day, with the rule fixed now'; open-items-plan.md:210-214 (Stage 4, pre-cut).

**Risk if 0.1 ships with it open.** Adopters could be pinned to a floor and warning story (`>=22.16`, ExperimentalWarning below 24.15) that the day's Node lines no longer justify, and the checklist would ship with an unevaluated dated ruling.

### 5. Row 19: absolute byte pins over the AL2 detached-signature sidecar — decide at the cut (pre-argued carry-forward)

`row-19-sidecar-byte-pins-disposition` · merged from 7 reader finding(s) · readers' guess: mixed / gates-0.1

**What is open.** No chain pin reaches the sidecar (transitionDigest has no signature field). Trigger names the cut, so release day must land pins (fixed key pair) or explicitly carry forward, restating the trigger without the cut disjunct and recording the ruling. Pre-argued as carry forward since nothing changed signature encoding or key handling.

**Where documented.** `docs/process/deferral-register.md:12`; `docs/process/next-phases.md:35-37`; `docs/process/implementation-status.md:1152-1157`; `docs/process/implementation-status.md:2263-2270`; `docs/process/implementation-status.md:3683-3710`; `docs/superpowers/specs/2026-08-22-byte-regression-pins-design.md:136-140`; `docs/superpowers/plans/2026-08-22-byte-regression-pins.md:658-662`; `docs/superpowers/plans/2026-08-29-checklist-refresh.md:177`; `docs/process/release-checklist.md:159-171`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Absolute byte pins over the AL2 detached-signature sidecar." — `docs/process/deferral-register.md`
- "Expected ruling, pre-argued 2026-08-29 (release day confirms or overrules; the row is NOT decided here)" — `docs/superpowers/plans/2026-08-29-checklist-refresh.md`

**Still open?** `yes` — docs/process/deferral-register.md:12 row 19 still in the live table with trigger 'or the 0.1 cut'; docs/process/release-checklist.md:159-171 unchecked '[ ] Decide register row 19's disposition' with 'Expected ruling, pre-argued 2026-08-29 ... the row is NOT decided here'; docs/process/next-phases.md:35-37 lists row 19 among the three live rows gating the cut; git log HEAD 4e80bf7 is the checklist refresh, no later commit touches row 19. No sidecar byte pin exists: packages/record/test/byte-regression/ (9 files) and byte-stability.test.ts contain no 'signing: true'/observedAt fixture (grep empty).

**Is the closing act code?** `partial` (effort S). Carry-forward (the pre-argued ruling): docs-only — restate row 19's trigger in docs/process/deferral-register.md:12 without the 'or the 0.1 cut' disjunct and record the ruling in docs/process/implementation-status.md. Retire-by-landing instead: add a byte-regression test under packages/record/test/byte-regression/ with a fixed Ed25519 key pair (test/helpers/signing.ts) pinning SignatureEntry bytes from the MemorySignatureStore sidecar, plus register/status/next-phases edits.

**Release tie.** `gates-0.1` — docs/process/deferral-register.md:12 trigger names 'the 0.1 cut'; docs/process/release-checklist.md:159-163 'release day must retire it or explicitly carry it forward rather than leave it unaddressed'; docs/process/next-phases.md:34-37 'each of their own triggers names the 0.1 cut too, so both belong beside row 1'.

**Risk if 0.1 ships with it open.** A 0.1 adopter would find a register row whose own trigger has fired but was never ruled on, so the process record would be false at the very cut it describes; signature-sidecar byte drift would additionally have no pin behind it.

### 6. Row 22a: one orphan sidecar entry per no-edge refusing call — open, decide at the cut (pre-argued carry-forward)

`row-22a-orphan-sidecar-growth-disposition` · merged from 12 reader finding(s) · readers' guess: mixed / gates-0.1

**What is open.** `appendChainCompromise` signs before delegating the append, so every refusing call against a record admitting no CAS candidate mints a sidecar entry that never lands (5→11 over six calls). 22b closed on behavior; 22a stays open because every measured containment takes the third horn. Trigger names `private: true` lifting and the cut; expected ruling is carry forward with the growth visible, restating the trigger without both disjuncts. Rejected families (digest de-dup, compensating removal) are must-not-change pins.

**Where documented.** `docs/process/deferral-register.md:13`; `docs/process/next-phases.md:48-57,65-79`; `docs/process/implementation-status.md:1189-1244`; `docs/process/implementation-status.md:2543-2552,2703-2708`; `docs/process/implementation-status.md:3069-3079`; `docs/analysis/2026-08-23-signature-enforcement-coverage.md:418-426`; `docs/superpowers/specs/2026-08-29-sidecar-orphans-report-design.md:149`; `docs/superpowers/specs/2026-08-29-checklist-refresh-design.md:43`; `docs/superpowers/specs/2026-08-17-al2-signing-mint-design.md:41-47,130-131`; `packages/record/src/kernel/finalize.ts:680-682`; `packages/record/test/no-edge-containment.test.ts:28-30,342-347`; `docs/process/release-checklist.md:172-219`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Orphan sidecar growth on the no-edge refusal path — the surviving half, 22a" — `docs/process/deferral-register.md`
- "22a stays open on the third horn, with no candidate that escapes it" — `docs/process/implementation-status.md`
- "carry forward, with the growth visible" is the expected ruling" — `docs/process/release-checklist.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- its orphan half — one sidecar entry per refusing call — stays open, and nothing in this file asserts the sidecar stops growing

**Still open?** `yes` — docs/process/deferral-register.md:13 row 22 live, 'the surviving half, 22a' with trigger ending 'or the 0.1 cut'; docs/process/release-checklist.md:172-219 unchecked '[ ] Decide register row 22's disposition' and 'carry forward, with the growth visible is the expected ruling ... the row is NOT decided here'; docs/process/next-phases.md:48-57 'It carries one now ... 22a, which stays open on the third horn'; packages/record/src/signing/store.ts:30-33 contract still states a refusing seam 'leaves one on every call'; git log HEAD 4e80bf7 is the checklist refresh, nothing later.

**Is the closing act code?** `partial` (effort S). Pre-argued carry-forward is docs-only: restate row 22's trigger in deferral-register.md:13 dropping the 'lifts private: true' and 'the 0.1 cut' disjuncts, record the ruling in implementation-status.md and next-phases.md. Any fix path is code but blocked: the chain-local precheck in kernel/finalize.ts (appendChainCompromise) would need a SCOPING-GUIDE §§1-2 sanction and would break the must-not-change pins in packages/record/test/no-edge-containment.test.ts; digest de-dup and compensating removal are rejected by measurement.

**Release tie.** `gates-0.1` — docs/process/deferral-register.md:13 trigger names 'or the 0.1 cut' and 'lifts private: true and publishes the package'; docs/process/release-checklist.md:193-196 'names this cut too, so release day must retire it or explicitly carry it forward'; docs/process/next-phases.md:34-37.

**Risk if 0.1 ships with it open.** An adopter running signing with a durable sidecar would see unbounded orphan growth on refusing calls with the register row's cut-firing trigger never ruled on, so the process record would be stale on day one even though verifySignatures().orphans makes the growth visible.

### 7. signing-enforce `entries.length === chain.length` pins sound only after exactly one refusing call

`enforcement-pins-sound-after-one-refusing-call` · merged from 1 reader finding(s) · readers' guess: code / gates-0.1

**What is open.** Four assertions hold only because each fixture refuses once; they carry row 22 forward and must be rewritten if orphan minting is contained or a second refusing call is added.

**Where documented.** `packages/record/test/signing-enforce.test.ts:99-103,123,376,444`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- Sound only after exactly ONE refusing call — a second would mint another sidecar entry against a digest that never lands

**Still open?** `partial` — The four pins and their caveat comments are current: packages/record/test/signing-enforce.test.ts:99-103 (`entries.length === chain.length`, 'Sound only after exactly ONE refusing call'), :123, :372-376, :444 — each pointing at row 22's open orphan half. Row 22a remains open (deferral-register.md:13 'Re-scoped 2026-08-29 to 22a'; release-checklist.md:172-200 'Decide register row 22's disposition'). The pins themselves are sound as written — they are a carry-forward dependency, not defective tests; they become wrong only if a containment lands or a second refusing call is added to a fixture.

**Is the closing act code?** `partial` (effort S). Contingent test work: if 22a is ever contained (which today needs a fresh SCOPING-GUIDE §§1–2 sanction for the third horn, per deferral-register.md:13 and release-checklist.md:186-190), rewrite the four `entries.length === chain.length` assertions in signing-enforce.test.ts (:99-103, :123, :372-376, :444) to whatever the contained sidecar shape is, alongside the must-not-change divergence pins in no-edge-containment.test.ts. If release day rules 'carry forward' (the pre-argued expectation for row 19; row 22's paragraph asks the same retire-or-carry question), the only change is documentation: restate the row's trigger without the 0.1 disjunct in deferral-register.md and record the ruling in implementation-status.md — no test edit.

**Release tie.** `gates-0.1` — Only via row 22: its trigger names 'the 0.1 cut — whichever lands first' (deferral-register.md:13) and release-checklist.md:172-200 makes a row-22 disposition a release-day checklist item ('release day must retire it or explicitly carry it forward'). The pins themselves gate nothing; they are consumers of that ruling, and a carry-forward ruling leaves them untouched.

**Risk if 0.1 ships with it open.** None directly from the pins; the underlying row-22a behavior (one orphan sidecar entry per refusing call on a no-edge path, unbounded on a durable backing that does not reconcile) is what an adopter would hit, and it is already delegated to the SignatureStore contract and reported via verifySignatures().orphans.

**Critic's objection.** Bucketed GATES-CUT, but nothing in the checklist, register, or next-phases ties test-pin soundness to the 0.1 cut; it is a test-corpus hygiene item with no release tie documented. (Not in the three buckets asked for, flagged as a bucket that does not hold.) Evidence: docs/process/release-checklist.md (whole) and docs/process/deferral-register.md rows 1/19/22 never mention signing-enforce.test.ts's `entries.length === chain.length` pins.

### 8. If the floor rule fires: raise engines.node in root, both packages, and CI exact-floor job

`critic-2-if-the-floor-rule-fires-raise-engines-no` · merged from 1 reader finding(s) · readers' guess: code / gates-0.1

**What is open.** Conditional code work hanging off the release-day floor re-evaluation: three manifests plus ci.yml (and first-use.yml's floor leg, plus the guide/README sentences and the vitest execArgv) all move if a maintained Node line reaches Stability 2 for node:sqlite. The list carries the decision (node-floor-rule-reevaluation, guess=decision) but not the conditional code edit set it triggers.

**Where documented.** `docs/process/release-checklist.md:73-76`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "raise `engines.node` in the root and both packages, and the CI matrix's exact-floor job" — `docs/process/release-checklist.md`

**Still open?** `partial` — The floor-rule checkbox stays unticked and explicitly conditional (release-checklist.md:72-92): "Evaluated 2026-08-29 — the rule did NOT fire" (:80) yet "Re-evaluate on the day against the Node lines THEN: if any maintained line has reached Stability 2, this rule fires as written" (:90-92). next-phases.md:93-96 confirms the 2026-08-29 evaluation did not fire and `>=22.16` stands. `engines` still present in package.json:5, packages/record/package.json:14, packages/store-postgres/package.json:14; ci.yml:39 and first-use.yml:61 still pin 22.16.0. So the conditional edit set is unexecuted and, as of today, not triggered — it becomes code only if the release-day re-evaluation flips.

**Is the closing act code?** `partial` (effort S). Only if the rule fires on release day (a maintained Node line at Stability 2 for node:sqlite): raise `engines.node` in package.json:5, packages/record/package.json:14, packages/store-postgres/package.json:14; move the exact-floor matrix leg in .github/workflows/ci.yml:39 and the floor leg in .github/workflows/first-use.yml:61 (whose warning assertion at first-use.yml:110-117 must then invert or drop, since 24.15+ no longer warns); optionally drop `execArgv = ['--disable-warning=ExperimentalWarning']` in vitest.config.ts:9; and update the warning prose in docs/guide/integrating.md and packages/record/README.md (release-checklist.md:87-89). If it does not fire: no code change, just tick the checkbox.

**Release tie.** `gates-0.1` — release-checklist.md:70-92 is a release-day checklist item ("The floor rule (phase-0 ruling 3 — evaluate, then act)", re-evaluate "on the day"); next-phases.md:89-96 names it as one of "Two engineering preconditions [that] also gate the cut"; open-items-plan.md:220 lists the floor rule among the checklist's exit conditions. The decision itself gates 0.1; the code edits are contingent on that decision going one way.

**Risk if 0.1 ships with it open.** If the rule fired but the edits were skipped, 0.1 would declare an engines floor (22.16) on which every `@vidimera/record` import emits an ExperimentalWarning even though a stable, warning-free floor was available — an avoidable first-impression defect; if the rule does not fire, shipping as-is is the documented, correct outcome.

### 9. ExperimentalWarning on every import below Node 24.15; lazy SqliteStore load recorded but untaken

`experimental-warning-lazy-sqlite-load-alternative` · merged from 6 reader finding(s) · readers' guess: decision / gates-0.1

**What is open.** The entry point eagerly re-exports SqliteStore so every adopter below 24.15 sees node:sqlite's warning; documented workaround is `--disable-warning`. A lazy load would remove it but reshapes the entry point after the closed API review and needs its own recorded reasoning. Readers split on tie: gates-0.1 (3), post-0.1 (2), horizon (1).

**Where documented.** `docs/process/open-items-plan.md:212-214`; `docs/analysis/2026-08-19-phase-6-rehearsal.md:31-42`; `docs/process/implementation-status.md:3535-3536`; `docs/superpowers/specs/2026-08-29-first-use-proof-design.md:200`; `docs/guide/integrating.md:38-46`; `packages/record/README.md:26-31`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "A lazy `SqliteStore` load could also remove it, but that reshapes the entry point after the API review closed" — `docs/analysis/2026-08-19-phase-6-rehearsal.md`
- "every adopter meets it at import whatever store they choose" — `docs/guide/integrating.md`

**Still open?** `yes` — packages/record/src/index.ts:83 still eagerly `export { SqliteStore } from './store/sqlite.js'`; docs/guide/integrating.md:38-44 and packages/record/README.md:26-31 document the warning below 24.15 as current behavior; docs/analysis/2026-08-19-phase-6-rehearsal.md:40-42 lazy load 'noted as an option for the release-day decision, not taken here'; docs/superpowers/specs/2026-08-29-first-use-proof-design.md:199-201 and implementation-status.md:3535-3536 leave it outside; open-items-sessions.md:242-246 frames it as the third horn of the floor three-way.

**Is the closing act code?** `partial` (effort M). Decision folded into the floor-rule three-way (open-items-sessions.md:242-246). If the lazy-load option is taken: reshape packages/record/src/index.ts:83 (and the SqliteStore export path) so `node:sqlite` loads only on first SqliteStore construction, update docs/guide/api-reference.md and integrating.md:38-46, README.md:26-31, first-use.yml:117-119's warning assertions (both legs would then expect silence), and record the reasoning as a fresh ruling since the API review is closed. If ship-as-is or raise-floor is chosen: no code beyond the floor item.

**Release tie.** `gates-0.1` — docs/process/open-items-plan.md:210-214 places it in Stage 4 (the pickup) as one of 'Two decisions ... re-decided at pickup'; release-checklist.md:80-81 weighs it inside the floor-rule item. However, the recorded options include ship-as-is with the documented flag (phase-0-decisions.md:33-35), so only the DECISION gates the cut; the lazy-load code itself is not required for 0.1.

**Risk if 0.1 ships with it open.** Every adopter on Node 22.16–24.14 sees an ExperimentalWarning on bare import regardless of store choice (integrating.md:40-42); the documented `--disable-warning` flag is the shipped answer, so the cost is noise and a reopened entry-point question post-cut.


## B. Should land before the first public release (argued, not gated) (2 items)

### 10. Manifests lack homepage/bugs/keywords/publishConfig

`manifests-metadata-fields` · merged from 1 reader finding(s) · readers' guess: decision / unclear

**What is open.** Both manifests carry repository, engines, exports, files, license, author but no homepage, bugs, keywords or publishConfig; whether to add before publish is undecided.

**Where documented.** `packages/record/package.json:1-41`; `packages/store-postgres/package.json:1-46`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- ""repository": { "type": "git", "url": "git+[the repository url]"" — `packages/record/package.json`

**Still open?** `uncertain` — Fact confirmed at HEAD: packages/record/package.json:1-41 and packages/store-postgres/package.json:1-46 carry name/version/private/type/description/license/author/repository(directory)/engines/sideEffects/types/exports/files/scripts and no homepage, bugs, keywords or publishConfig (grep over *.md/*.json/*.yml finds zero mentions of any of the four). But no repo document names this as open: the phase-2 manifest ruling (docs/analysis/2026-08-19-phase-2-packaging.md:17-23) enumerates the fields it decided and simply omits these; release-checklist.md:100 lists only dropping `private` and bumping version as manifest edits. The item is a reader-inferred gap, not a recorded one — hence 'uncertain', not 'yes'.

**Is the closing act code?** `partial` (effort S). If taken: add `homepage`, `bugs.url` (derivable from the existing repository url), a short `keywords` array, and optionally `publishConfig.access: public` to both package.json files, and re-run `pnpm smoke`; note release.yml already passes `--access public` on the command line (phase-2-packaging.md:37), so publishConfig is redundant unless the workflow changes. If declined: one line in docs/analysis (or the phase-2 ruling's successor) recording the omission as deliberate.

**Release tie.** `should-land-before-0.1` — No document ties it to the cut; the tie is argumentative: these fields are inert after publish until the next release, and the registry page renders them (homepage/bugs links, keyword search) from the 0.1 tarball's manifest — the same reasoning open-items-plan.md:79-86 used to make package READMEs land pre-cut ('both npm registry pages would render blank at 0.1'). Weak tie; a decision to omit is equally acceptable and would move this to not-release-relevant.

**Risk if 0.1 ships with it open.** The 0.1 registry pages show no homepage/issues link and the packages are unfindable by keyword search until 0.2 — cosmetic, but unfixable for that version once published.

### 11. Redemption family build-own shapes and naming divergence: three call names, listDue, begin-time correspondence, redeeming→unredeemable-state, reverify nesting; stale row-6 pointers

`redemption-shapes-build-own-and-naming-divergence` · merged from 6 reader finding(s) · readers' guess: decision / before-0.1-implied

**What is open.** SPEC names one verb redeem() and 'the sweep'; the build ships beginRedemption/completeRedemption and listDue(), plus begin-time correspondence and other readings. Row 6 retired 2026-08-19 ratifying the triad, but the §9 status row and operator-surface.ts still say 'flagged to the pre-0.1 naming review' and do not record whether listDue() was ruled on.

**Where documented.** `docs/process/implementation-status.md:414`; `docs/process/implementation-status.md:441`; `docs/superpowers/specs/2026-08-13-redemption-token-shape-design.md:25`; `docs/superpowers/specs/2026-08-14-redemption-clocks-design.md:196`; `packages/record/src/operator-surface.ts:34-37`; `packages/record/src/kernel/redeem.ts:454-459`; `packages/record/src/config.ts:133-135`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "flagged to the same row 6 review, for the same reason as the two call names above" — `docs/process/implementation-status.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- Begin-time content correspondence is this build's ADDITION, not spec-granted
- the three call names here (`redeem`/`beginRedemption`/ `completeRedemption`) are this build's own, recorded in `docs/process/implementation-status.md` and flagged to the pre-0.1 naming review

**Still open?** `partial` — The naming question itself is CLOSED: row 6 retired 2026-08-19 (docs/process/next-phases.md:101-112) and docs/analysis/2026-08-19-phase-1-api-review.md:41-43 ratifies "The redemption triad ... redeem / beginRedemption / completeRedemption stay — this build's own names". What remains: (a) stale pointers — packages/record/src/operator-surface.ts:34-37 still says the three names are "flagged to the pre-0.1 naming review" (present tense, a retired row), and implementation-status.md:414 still says "flagged to deferral register row 6's pre-0.1 naming review" and extends it to listDue(); (b) the api-review's name-by-name pass (2026-08-19-phase-1-api-review.md:69-76) lists the 28 root exports and never mentions listDue() — the operator-handle method the clocks design (docs/superpowers/specs/2026-08-14-redemption-clocks-design.md:196) explicitly routed to row 6 — so no recorded ruling covers it. The begin-time-correspondence (kernel/redeem.ts:456-459) and reverify-nesting (config.ts:133-135) readings are recorded design decisions at their sites with no reopening trigger — not open in any tracked sense.

**Is the closing act code?** `partial` (effort S). Comment-only code touch: reword packages/record/src/operator-surface.ts:34-37 to say the triad was ratified by the retired row 6 review (docs/analysis/2026-08-19-phase-1-api-review.md) rather than 'flagged to' it; update docs/process/implementation-status.md:414's §9 row likewise and record a ruling on listDue() (either retroactively covered by the whole-surface ratification, or a short dated note). No behavior, test, or manifest change; contract-scan must stay green (the comment already cites the status doc, not a foreign pointer).

**Release tie.** `should-land-before-0.1` — Row 6 was itself a 0.1-cut trigger (implementation-status.md:1085-1086: "the pre-0.1 API naming review over what index.ts exports is row 6, triggered at the 0.1 cut") and is retired (next-phases.md:105). The residue is a published-source comment (operator-surface.ts ships in the tarball's types/dist) that points adopters at a review that has already happened, plus an unrecorded listDue() ruling; a first public release should not ship source comments describing its own public names as pending review. No document formally ties the residue to the cut, so this is an argument, not a recorded gate.

**Risk if 0.1 ships with it open.** A 0.1 adopter reading OperatorSurface's header would believe redeem/beginRedemption/completeRedemption are provisional names awaiting a pre-0.1 review — when the review already ratified them — and no record says whether listDue() was ever ruled on.


## C. Code work the records place after the cut (71 items)

### 12. Three parked scripts/first-use.mjs improvements for the registry-dispatch commit

`first-use-parked-script-improvements` · merged from 4 reader finding(s) · readers' guess: code / post-0.1

**What is open.** Narrow the floor leg's warning grep to `ExperimentalWarning: SQLite`; add a header note that `import pg from 'pg'` resolves only via npm hoisting; add the review view's `subjectRef` assertion. Held so the recorded tarball run's script stays byte-identical. Tie split gates-0.1 vs post-0.1.

**Where documented.** `docs/process/implementation-status.md:3644-3649`; `docs/process/release-checklist.md:151-155`; `docs/superpowers/plans/2026-08-29-checklist-refresh.md:165`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Three improvements are parked for THIS dispatch's own commit so the recorded tarball run's script stayed byte-identical until now" — `docs/process/release-checklist.md`

**Still open?** `yes` — docs/process/release-checklist.md:151-155 names the three improvements as parked for the registry dispatch's own commit (box unticked); implementation-status.md:3644-3649 same; current tree: .github/workflows/first-use.yml:117 still greps the broad `ExperimentalWarning` (not `ExperimentalWarning: SQLite`), scripts/first-use.mjs:19 `import pg from 'pg'` has no hoisting header note, and the script's confirmLoop (:39-41) carries no review-view `subjectRef` assertion (grep found no such assertion).

**Is the closing act code?** `yes` (effort S). In the commit that lands the registry-source first-use dispatch record: narrow .github/workflows/first-use.yml:117's grep to `ExperimentalWarning: SQLite`; add a header comment above scripts/first-use.mjs:19 stating `pg` resolves only via npm hoisting the adapter's dependency; add a `subjectRef` assertion on the review view in scripts/first-use.mjs's flow, mirroring the guide's test. No package src change.

**Release tie.** `documented-post-0.1` — docs/process/release-checklist.md:145-155 places them under 'Verification, then the paperwork' — the registry dispatch runs AFTER the publish (open-items-plan.md:224 Stage 5), and the items are deliberately held so the recorded tarball run's script stays byte-identical until then (implementation-status.md:3648-3649). They are post-publish paperwork, not a cut gate.

**Risk if 0.1 ships with it open.** None for adopters; the floor leg's broad grep could pass on an unrelated ExperimentalWarning and the script's `pg` import could silently break under a non-hoisting installer, weakening the post-publish proof rather than the shipped package.

### 13. AL2 in-payload `observedAt` byte pin excluded because it drags the sidecar in

`observedat-payload-byte-pin-excluded` · merged from 1 reader finding(s) · readers' guess: code / unclear

**What is open.** The digest-covered `observedAt` consultation payload has no absolute byte pin because a freshness profile requires signing; constructible only once row 19 is resolved with a fixed key pair.

**Where documented.** `docs/superpowers/specs/2026-08-22-byte-regression-pins-design.md:141-145`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "excluded here only because a freshness-declaring profile requires `signing: true`, which drags the sidecar problem in with it — not because it is out of reach" — `docs/superpowers/specs/2026-08-22-byte-regression-pins-design.md`

**Still open?** `yes` — docs/superpowers/specs/2026-08-22-byte-regression-pins-design.md:141-145 excludes the observedAt pin 'only because a freshness-declaring profile requires signing: true'; grep for observedAt/'signing: true' in packages/record/test/byte-regression/*.ts and byte-stability.test.ts returns nothing (observedAt appears only in consultations/decline/freshness/probes tests, none of which are byte pins). No register row, checklist line, or open-items-plan entry names this item separately (grep of docs/process/open-items-plan.md for observedAt/sidecar empty) — it is a design-doc exclusion note riding on row 19, not an independently tracked debt.

**Is the closing act code?** `yes` (effort S). New byte-regression test in packages/record/test/byte-regression/ declaring a freshness profile with signing: true, a fixed key pair from test/helpers/signing.ts, and a fixed observedAt, pinning the consultation payload's transitionDigest/bytes; strictly downstream of row 19 since the same fixture must also decide what to do about the sidecar entry bytes.

**Release tie.** `documented-post-0.1` — Only source is docs/superpowers/specs/2026-08-22-byte-regression-pins-design.md:141-145, which places it as a coverage bound of that increment; it inherits row 19's trigger (deferral-register.md:12) but nothing in release-checklist.md:159-171 or next-phases.md names observedAt itself, and the pre-argued row-19 ruling is carry forward, so it would remain unaddressed at the cut by the repo's own expectation.

**Risk if 0.1 ships with it open.** A drift in the digest-covered freshness payload encoding would go unpinned by any absolute byte test, though the chain-level pins and freshness tests would still catch behavioral breakage.

### 14. Three near-duplicate signature-break helpers not consolidated; enlisted redeem signature test not re-homed

`break-helpers-consolidation-and-rehoming` · merged from 2 reader finding(s) · readers' guess: code / horizon

**What is open.** redeem.test.ts was repointed at the shared breakOneSignature; signing.test.ts's helper stays separate; the enlisted signature-broken redeem test remains in redeem.test.ts rather than the declared single home. Housekeeping.

**Where documented.** `docs/process/implementation-status.md:2556-2557`; `docs/superpowers/specs/2026-08-23-al2-signature-enforcement-coverage-design.md:230`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "re-homing the existing enlisted signature test, which is already covered where it sits." — `docs/superpowers/specs/2026-08-23-al2-signature-enforcement-coverage-design.md`

**Still open?** `yes` — packages/record/test/signing.test.ts:244-247 still deliberately keeps its own trailing-bytes tamper ('Deliberately NOT helpers/signing.ts's shared breakOneSignature'); the shared helper lives at packages/record/test/helpers/signing.ts:121 and redeem.test.ts:67 imports it; the enlisted signature-broken redeem test remains in redeem.test.ts (its compromise pins at :238-338). Both the design (docs/superpowers/specs/2026-08-23-al2-signature-enforcement-coverage-design.md:229-231) and the record (implementation-status.md:2556-2557) place this 'outside' the increment; the sidecar-contract increment (3ab669d) later touched breakOneSignature's chain correlation but did not consolidate. No row, checkbox or checklist item tracks it.

**Is the closing act code?** `yes` (effort S). Test-only housekeeping: either fold signing.test.ts's trailing-4-byte tamper into helpers/signing.ts as a parameterized `breakOneSignature(..., { position: 'leading'|'trailing' })` and re-point signing.test.ts:248, and/or move the enlisted signature-broken redeem test from redeem.test.ts into signing-enforce.test.ts. signing.test.ts:244-247 argues the two corruptions should stay distinct, so consolidation may be deliberately rejected rather than owed.

**Release tie.** `horizon` — Explicitly excluded from the coverage increment as non-owed ('already covered where it sits', design.md:229-231); rows 20/21 retired (next-phases.md:122-193); not in release-checklist.md; no trigger names the cut.

**Risk if 0.1 ships with it open.** None observable to an adopter; purely a test-corpus tidiness matter.

### 15. ProbeDriver refinement: take `open()` options from the driver

`probe-driver-open-options` · merged from 1 reader finding(s) · readers' guess: code / pre-1.0

**What is open.** Probes open via plain operator.open(stagedRef); a configuration whose profiles demand policyDigest or supersedes at open refuses and reports fail via the runner catch. Extending the driver is noted, not built.

**Where documented.** `docs/superpowers/plans/2026-08-18-self-test-tier.md:246-251`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "a refinement taking `open` options from the driver is a pre-1.0 shape question, noted in the header, not built" — `docs/superpowers/plans/2026-08-18-self-test-tier.md`

**Still open?** `yes` — packages/record/src/probes/probes.ts:100-103 still opens via plain `handles.operator.open(staged.value.stagedRef)` and throws on refusal; packages/record/src/probes/types.ts:17-31 ProbeDriver carries no open-options hook (only sampleConsultations returning FinalizeOptions for finalize). The plan's claim that the refinement is 'noted in the header' (docs/superpowers/plans/2026-08-18-self-test-tier.md:250-251) is NOT borne out — grep of probes.ts:1-25 header finds no such note; only the generic 'setup throws ... reported fail' paragraph (probes.ts:15-18). Not tracked in open-items-plan.md or any register row.

**Is the closing act code?** `yes` (effort S). packages/record/src/probes/types.ts: add an optional ProbeDriver hook (e.g. sampleOpenOptions?(profileId): OpenOptions) supplying policyDigest / supersedes; packages/record/src/probes/probes.ts openOne (:86-104) and stageOpen (:72-84) thread it into operator.open(); a test in packages/record/test/probes.test.ts with a policySource/supersedes-demanding profile showing probes now reach the attack instead of 'fail' via the runner catch; docs/guide/api-reference.md ProbeDriver entry. Small, but could ride inside the deeper-leg driver-shape session since both reshape ProbeDriver.

**Release tie.** `documented-post-0.1` — docs/superpowers/plans/2026-08-18-self-test-tier.md:250-251 calls it 'a pre-1.0 shape question'; the probe surface is 'PROVISIONAL pre-1.0' (probes.ts:20, types.ts:3) so adding an optional hook post-0.1 is additive. No release-checklist or register tie. Not in the open-items plan at all — the only untracked item of this batch, worth recording alongside the stage-6 driver-shape entry.

**Risk if 0.1 ships with it open.** A 0.1 adopter whose profiles require open-time policyDigest or supersedes sees every probe report 'fail' (setup could not open a record) rather than an attack verdict — a misleading-looking failure, though the plan argues it is 'correct: the probed configuration could not even open a record'.

### 16. Decline probe for the self-test tier — candidate follow-up

`decline-probe-candidate` · merged from 1 reader finding(s) · readers' guess: code / unclear

**What is open.** No probe re-attacks the decline seam; named a candidate follow-up, never scheduled. CONTROLS §4's target list may need a matching quote (sealed).

**Where documented.** `docs/superpowers/plans/2026-08-21-recorded-human-decline.md:1123`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "no probe-tier addition (a decline probe is a candidate follow-up, out of this increment)" — `docs/superpowers/plans/2026-08-21-recorded-human-decline.md`

**Still open?** `yes` — docs/superpowers/plans/2026-08-21-recorded-human-decline.md:1123 'no probe-tier addition (a decline probe is a candidate follow-up, out of this increment)'. Against the tree: grep -rn decline packages/record/src/probes/ returns nothing — no probe touches decline(); the 17-probe registry (probes.ts) has no decline id. Not in open-items-plan.md (stage 6 list :244-270 lacks it), not in next-phases.md, no register row — a plan-only candidate never scheduled. Note the decline follow-ups increment (commits 44d23b0, 89fc8fb) added pins but no probe.

**Is the closing act code?** `yes` (effort S). packages/record/src/probes/probes.ts: a new probe (e.g. 'decline-terminal' — open, decline, then finalize/decline again must refuse the terminal-state code) plus registry entry; packages/record/test/probes.test.ts pins for pass, not-driven (no declining profile shape) and a can-fail broken driver. Constraint: every probe's `target` must QUOTE CONTROLS §4's target list verbatim (probes.ts:6-10); CONTROLS §4 was edited under the decline sanction (801fe7e) but whether it carries a decline target sentence needs a hand check — if it does not, the probe cannot cite one without a FRESH docs/concept/ sanction (CLAUDE.md), making this item partially decision-gated.

**Release tie.** `horizon` — Only source is the decline plan's out-of-scope note (2026-08-21-recorded-human-decline.md:1123) with no timing; no stage placement in open-items-plan.md, no register trigger, no release-checklist line. The probe surface is 'PROVISIONAL pre-1.0' (probes.ts:20) so an added probe post-0.1 is additive. Not tied to 0.1 by any record.

**Risk if 0.1 ships with it open.** A 0.1 operator's self-test tier re-attacks the confirm/redeem/signing seams but never the decline seam, so a broken decline path in a host wiring would go unprobed — a coverage gap in the assurance tier, not a correctness defect.

### 17. contract-scan never reads .mjs or .yml — gate scripts, their tests, first-use script and workflows are ungated

`contract-scan-mjs-yml-not-scanned` · merged from 4 reader finding(s) · readers' guess: code / unclear

**What is open.** The scan globs *.ts/*.mts/*.cts and tracked *.md; scripts/*.mjs (including the five gates), scripts/test/*.test.mjs and .github/workflows/*.yml are held to the standalone contract by hand. No YAML linter exists. Fix is a glob extension after auditing the eight codeOnlyPatterns against existing .mjs text.

**Where documented.** `docs/process/implementation-status.md:2107-2110,2174-2176`; `docs/superpowers/plans/2026-08-22-truth-repairs.md:22-24`; `docs/superpowers/specs/2026-08-29-first-use-proof-design.md:181`; `scripts/test/contract-scan.test.mjs:3-6`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "`.mjs` IS NOT SCANNED, and that is a real gap this increment widens." — `docs/superpowers/plans/2026-08-22-truth-repairs.md`
- "`scripts/contract-scan.mjs` scans tracked `*.md` and `*.ts` — not `.mjs` and not `.yml`." — `docs/superpowers/specs/2026-08-29-first-use-proof-design.md`

**Still open?** `yes` — scripts/contract-scan.mjs:523-524 globs only '*.md' and '*.ts','*.mts','*.cts' at HEAD; scripts/test/contract-scan.test.mjs:3-6 relies on that gap to plant fixtures (".mjs is outside the scan's globs"); docs/process/implementation-status.md:2106-2110 and :2174-2176, docs/superpowers/plans/2026-08-22-truth-repairs.md:22, and docs/superpowers/specs/2026-08-29-first-use-proof-design.md:181 ("not .mjs and not .yml") all state it as current. No yamllint/actionlint in package.json or .github/workflows/*.yml. No later commit on scripts/contract-scan.mjs widens the globs.

**Is the closing act code?** `yes` (effort S). Extend tracked() call at scripts/contract-scan.mjs:524 to add '*.mjs' (and optionally a markdown-style pass over .github/workflows/*.yml), after auditing the eight codeOnlyPatterns against existing scripts/*.mjs text; but scripts/test/contract-scan.test.mjs:3-6 deliberately depends on .mjs being unscanned, so its fixtures must move to a per-file allowlist or a non-tracked/ignored path. Add a test in scripts/test/.

**Release tie.** `documented-post-0.1` — Recorded only as a bound in implementation-status.md:2106-2110/2174-2176 and the two design/plan docs; not a register row, not in release-checklist.md (grep for .mjs empty), not in open-items-plan.md stages 4-5. Hand-held to the contract at each increment.

**Risk if 0.1 ships with it open.** A future edit to scripts/*.mjs or a workflow could carry an external URL or reference-project pointer that reaches the public repo unflagged; today all such files are hand-audited and clean.

### 18. api-sync proves presence only; reads root entry point only (subpaths and store-postgres ungated); no reverse check

`api-sync-gate-bounds` · merged from 2 reader finding(s) · readers' guess: code / horizon

**What is open.** Stale signatures/prose pass; only packages/record/src/index.ts is read so `./probes` and any future subpath, and store-postgres's exports, have no drift gate; documented names that vanished are not caught.

**Where documented.** `docs/analysis/2026-08-20-conformance-export.md:201-202`; `scripts/api-reference-sync.mjs:12-18`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "The api-sync gate reads only the root entry point, so a new subpath's documentation would be ungated" — `docs/analysis/2026-08-20-conformance-export.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- it proves presence, never accuracy — a documented name with a stale signature, wrong prose, or the wrong section passes

**Still open?** `yes` — scripts/api-reference-sync.mjs:12-18 still states presence-only, root-entry-only, one-direction; the script has no `probes` handling at HEAD (grep empty) and store-postgres's exports are documented 'in prose the gate does not parse' (:15). docs/analysis/2026-08-20-conformance-export.md:61-63 records 'the api-sync gate reads only the root entry point' as one reason NOT to add a subpath export. The `./probes` subpath exists (CLAUDE.md: exports `.` and `./probes`), so the ungated subpath is real today, not hypothetical.

**Is the closing act code?** `yes` (effort S). Extend scripts/api-reference-sync.mjs to read every entry named in packages/record/package.json `exports` (today `.` and `./probes`, i.e. src/index.ts and src/probes/index.ts) and optionally packages/store-postgres/src/index.ts, comparing against docs/guide/api-reference.md; add cases to scripts/test/api-reference-sync.test.mjs; update the header's bounds comment. Accuracy (signatures/prose) and the reverse direction remain out of reach by the script's own argument (:16-18) and would stay documented bounds.

**Release tie.** `documented-post-0.1` — No cut tie: docs/process/release-checklist.md:115 runs `pnpm api-sync` as-is; next-phases.md:385 names all three gates 'silent on this class of drift' as a discipline note, not a gate to build; conformance-export ruling (docs/analysis/2026-08-20-conformance-export.md:61) uses the bound to justify deferring a new subpath to 'the 1.0 re-ask' (:55-56). Worth arguing before 0.1 only because `./probes` is a published surface with no doc drift gate, but the guide is hand-verified and the repo already accepts that.

**Risk if 0.1 ships with it open.** An adopter reading docs/guide/api-reference.md could find a `./probes` or store-postgres name missing or stale with no CI gate having caught it.

### 19. Probe tier reached but never run in the first-use proof

`first-use-probe-tier-not-run` · merged from 4 reader finding(s) · readers' guess: code / horizon

**What is open.** 17 probes visible through ./probes, no verdict computed; running them needs a host-declared ProbeDriver the guide does not ask a first-timer to write.

**Where documented.** `docs/process/implementation-status.md:3518-3520,3536-3537`; `docs/analysis/2026-08-29-first-use-proof.md:8-9`; `docs/superpowers/specs/2026-08-29-first-use-proof-design.md:83-91,203`; `scripts/first-use.mjs:89-92`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "The probe tier was reached and not run — 17 probes visible through `./probes`, no verdict computed" — `docs/process/implementation-status.md`

**Still open?** `yes` — scripts/first-use.mjs:89-92 only asserts `ALL_PROBES.length > 0` and that `runProbes`/`assertSatisfied` are functions — the comment reads 'running it needs a host driver (not here)'; docs/process/implementation-status.md:3518-3520 'The probe tier was reached and not run — 17 probes visible through `./probes`, no verdict computed'; :3535-3536 lists 'running the probe tier inside the script' as outside; docs/superpowers/specs/2026-08-29-first-use-proof-design.md:89-91 ruling 7 'It does NOT run the probe tier'. No later commit touches scripts/first-use.mjs (git log: 2a28abe is the only first-use script commit; release-checklist.md:150-151 requires it stay byte-identical until the registry dispatch).

**Is the closing act code?** `yes` (effort S). In scripts/first-use.mjs add a minimal host-declared ProbeDriver backed by the MemoryStore chain the script already builds, call `runProbes(driver)` and `assertSatisfied` over the result, and print the verdict count in the summary line (:118-121); land it in the same commit as the parked registry-dispatch improvements so the tarball run's script stays byte-identical until then (release-checklist.md:150-154), then note it in the dated docs/analysis/ record.

**Release tie.** `horizon` — docs/process/release-checklist.md:144-150's post-publish item only asks to confirm 'the `./probes` subpath resolves', not that verdicts run; :62-64 accepts 'the probe tier not run' as a bound of the discharged precondition; docs/superpowers/specs/2026-08-29-first-use-proof-design.md:203 places it outside on ruling 7. No record schedules it.

**Risk if 0.1 ships with it open.** The packed artifact's probe verdict path is proven only from a checkout (the test suite), never on a clean consumer; a packaging-level break inside `./probes` beyond import resolution would go unseen until an adopter wires a driver.

### 20. PostgreSQL 11 floor is a construct-inventory claim; only PostgreSQL 18 exercised

`postgres-11-floor-untested` · merged from 3 reader finding(s) · readers' guess: code / unclear

**What is open.** The declared range rests on `hashtextextended`'s age; embedded 18.4 beta and the `postgres:18` service are the only servers run; the Windows leg uses an unpinned image version. Closing is a floor CI leg or softening the claim.

**Where documented.** `docs/analysis/2026-08-20-artifact-postures.md:55-58`; `packages/store-postgres/README.md:19-20`; `packages/store-postgres/package.json:43`; `.github/workflows/first-use.yml:67`; `docs/guide/integrating.md:50-53`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "the 11 floor is a static claim from the code's construct inventory, not a tested one — no CI leg runs PostgreSQL 11" — `docs/analysis/2026-08-20-artifact-postures.md`

**Still open?** `yes` — docs/analysis/2026-08-20-artifact-postures.md:55-58 records the limit ("no CI leg runs PostgreSQL 11"); current tree confirms: .github/workflows/ci.yml:40-71 runs embedded 18.x on three legs and the Windows image's service on the fourth; .github/workflows/first-use.yml:67 uses `image: postgres:18`; packages/store-postgres/package.json:43 pins embedded-postgres 18.4.0-beta.17; packages/store-postgres/README.md:19-20 and docs/guide/integrating.md:50-53 still state the 11 floor as a construct-inventory claim exercised only against 18. git log shows no floor leg landed (784eb83, a89f3af are the last CI matrix changes). open-items-plan.md:104-114 marks the DECLARATION [x]; the untested-floor limit was accepted, not closed.

**Is the closing act code?** `yes` (effort S). Add a floor leg: either a `postgres:11` (or oldest-supported) service container on an ubuntu matrix entry in .github/workflows/ci.yml fed through the globalSetup's documented VIDIMERA_PG_URL external-server seam (ci.yml:55-71 already uses that seam for Windows), or a second service image in first-use.yml's matrix. Alternative non-code closure: soften the README/integrating.md claim to 'exercised only on 18'. No src change expected unless PG 11 actually fails.

**Release tie.** `documented-post-0.1` — docs/analysis/2026-08-20-artifact-postures.md:52-58 takes the posture ('Taken: the declaration lands... The limit stated with it') with no trigger naming the cut; docs/process/open-items-plan.md:104-114 closes the item [x] in Stage 2 by declaration; no deferral-register row, no release-checklist.md line (grep 'postgres' at :23,:60,:96,:108,:138,:148 are all publish/first-use mechanics) names a floor test.

**Risk if 0.1 ships with it open.** An adopter on PostgreSQL 11-17 trusts a documented floor that no run has ever exercised; a construct outside the inventory (or a pg driver/server interaction) could fail on an older server with the README saying it is supported.

### 21. Conformance factory has no teardown; stores and the pg pool never closed

`conformance-factory-no-teardown` · merged from 1 reader finding(s) · readers' guess: code / horizon

**What is open.** ~50 Postgres schemas/stores per run leak to process exit; adding teardown changes the suite's signature (relevant if exported).

**Where documented.** `packages/store-postgres/test/helpers/pg.ts:3-5`; `packages/record/test/conformance/store-conformance.ts:24-26`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- The pool is never closed: the suite's process ends and the globalSetup teardown stops the server (the conformance suite deliberately never closes stores

**Still open?** `yes` — packages/store-postgres/test/helpers/pg.ts:1-5 ('The pool is never closed... the conformance suite deliberately never closes stores — its factory is synchronous with no teardown'); packages/record/test/conformance/store-conformance.ts:24-31 ('Synchronous by design... not exported while the Store signatures are provisional pre-1.0... the 1.0 freeze re-asks the question'); `runStoreConformance(label, makeStore: () => Store)` at store-conformance.ts:32 has no teardown hook. No commit in git log or CHANGELOG.md adds one.

**Is the closing act code?** `yes` (effort S). Add an optional third parameter (e.g. `teardown?: (store: Store) => Promise<void>`) or afterEach hook to `runStoreConformance` in packages/record/test/conformance/store-conformance.ts and register `afterAll(() => sharedPool().end())` in packages/store-postgres/test/helpers/pg.ts or the globalSetup teardown in packages/store-postgres/test/setup/. Test-only; touches the suite's signature, which the export ruling (docs/analysis/2026-08-20-conformance-export.md) says stays provisional pre-1.0.

**Release tie.** `horizon` — store-conformance.ts:26-31 ties the suite's shape to 'the 1.0 freeze re-asks the question'; docs/process/open-items-plan.md:263-265 places 'The conformance-suite export — if stage 3 ruled export' in Stage 6 (the pre-1.0 program) unchecked; the suite is not part of the published package (docs/guide/integrating.md:57-58), so the leak is invisible to a 0.1 adopter.

**Risk if 0.1 ships with it open.** None to an adopter of the tarballs; contributors' test runs leak ~50 schemas and one pg pool per process until exit, which the globalSetup teardown already reaps by stopping the server.

### 22. Kernel-level enlisted (tx) seams driven only over SqliteStore

`kernel-tx-seams-only-sqlite` · merged from 2 reader finding(s) · readers' guess: code / unclear

**What is open.** Postgres enlistment is pinned at Store level only; every kernel enlisted test (redeem triad with tx, enlisted signature/tamper refusals, enlisted due-clock) uses SqliteStore. The clocks.test.ts comment saying token seams take no tx is stale and the enlisted due-window shape is untested for the token seams.

**Where documented.** `packages/store-postgres/test/postgres-store.test.ts:1-3`; `packages/record/test/clocks.test.ts:199-202`; `packages/record/test/redeem-token.test.ts:596-604`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- Backing-specific pins for PostgresStore — the tx-seam caller errors and enlistment semantics sqlite-store.test.ts pins for its own backing.
- Only direct redeem(recordId, content, tx) reaches the shared prologue enlisted (the token seams take no tx), so this is the one shape that can hit it.

**Still open?** `partial` — Stale comment CONFIRMED: packages/record/test/clocks.test.ts:200-202 says '(the token seams take no tx)' but packages/record/src/kernel/redeem.ts:186-187 and :275-277 state 'all three redemption seams carry a `tx`, riding `opts.tx` since the effect-result increment' (row 16 retired, next-phases.md:213-232; CHANGELOG.md:88-91). Enlisted due-window for token seams UNTESTED: the only enlisted-due test is clocks.test.ts:195 (direct redeem); the enlisted token tests at redeem-token.test.ts:723,749,774,794 cover rollback/commit/tamper, none a due window (grep for beginRedemption/completeRedemption in clocks.test.ts:143-383 shows no tx). Kernel enlisted over Postgres: no store-postgres test imports create/createWithClock (grep empty); postgres-store.test.ts:1-3 pins enlistment at Store level only; every ENLISTED kernel test uses SqliteStore (redeem-token.test.ts:724, clocks.test.ts:203, redeem.test.ts:158-166). Item's cited redeem-token.test.ts:596-604 is unrelated ladder text; the relevant section is :713-800.

**Is the closing act code?** `yes` (effort S). (a) Rewrite the stale parenthetical at packages/record/test/clocks.test.ts:200-202. (b) Add two tests in clocks.test.ts mirroring :195 for `beginRedemption(recordId, content, { tx })` and `completeRedemption(recordId, token, content, { tx })` against a due-confirmed/due-redeeming SqliteStore record, asserting `unredeemable-state` with no edge and un-enlisted re-invocation resolving (redeem.ts:274-291 branch). (c) Optionally a kernel-driven enlisted test in packages/store-postgres/test/ using createWithClock over `newStore()` with a pg client in an open transaction. No src change unless a test fails.

**Release tie.** `documented-post-0.1` — No record ties this to the cut: deferral-register.md has no row for it, next-phases.md:213-232 records row 16 retired 'pinned by four enlisted-token tests', open-items-plan.md does not list it. The stale comment is a test-file accuracy defect the repo's own discipline (CLAUDE.md 'markers are accuracy claims') would want fixed, but nothing names it release-gating; the enlisted-due branch at redeem.ts:274 is shared `prologue` code already exercised by the direct-seam test.

**Risk if 0.1 ships with it open.** A host enlisting beginRedemption/completeRedemption in its own transaction while a due window has passed relies on a refusal branch pinned only through the direct redeem() shape, and on Postgres enlistment pinned only at the Store level, never through the kernel; a reader of clocks.test.ts:201 is told something false about the API.

### 23. Payload posture is backing-specific by design and unbound by conformance; Postgres posture untested

`payload-posture-backing-specific-postgres-untested` · merged from 2 reader finding(s) · readers' guess: code / post-0.1

**What is open.** MemoryStore throws DataCloneError, SqliteStore drops JCS-invisible members; no shared test binds either and packages/store-postgres/test has no payload-posture pin, so PostgresStore's handling of non-JSON members is unknown.

**Where documented.** `packages/record/src/store/sqlite.ts:18-27`; `packages/record/test/conformance/store-conformance.ts:6-8`; `packages/record/test/sqlite-store.test.ts:107-110`; `packages/store-postgres/src/postgres-store.ts:20`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- Payload posture, BACKING-SPECIFIC by design (the conformance suite deliberately does not bind it)
- a SQL backing rejects a non-serializable payload differently, so that shape is not contract.

**Still open?** `partial` — The posture itself is a recorded, deliberate non-contract, not an open item: packages/record/src/store/sqlite.ts:18-27 ("BACKING-SPECIFIC by design ... the two disagreeing on posture is consistent, not corrupt") and packages/record/test/conformance/store-conformance.ts:6-8. The factual gap stands: packages/store-postgres/src/postgres-store.ts:20-24 asserts "The JCS-invisible-member round-trip behavior is therefore exactly SqliteStore's", but grep of packages/store-postgres/test (postgres-store.test.ts, postgres-store-conformance.test.ts, cross-backing-byte-identity.test.ts, contention.test.ts) finds no payload-posture / function-valued-member pin — the only 'posture' hit is postgres-store.test.ts:72 (pool posture). SqliteStore has one at packages/record/test/sqlite-store.test.ts:107. No process doc (deferral-register, next-phases, open-items-plan, analysis) names this gap.

**Is the closing act code?** `yes` (effort S). Add one test to packages/store-postgres/test/postgres-store.test.ts mirroring sqlite-store.test.ts:107-125 ('payload posture: a function-valued member is dropped CONSISTENTLY with the digest') against the embedded Postgres, proving the comment at postgres-store.ts:20-24 (text column, JSON.stringify round-trip, verifyChain green). No src change expected; if the test surprises, the comment or the store's serialization moves.

**Release tie.** `documented-post-0.1` — Not named anywhere in docs/process/release-checklist.md, deferral-register.md or next-phases.md; open-items-plan.md's appendix (lines ~306-318) lists surveyed non-items and does not name it either. It is an untested comment claim, not a release gate; the conformance suite explicitly excludes posture from contract (store-conformance.ts:6-8).

**Risk if 0.1 ships with it open.** An adopter reading postgres-store.ts:24's claim that the Postgres round-trip posture equals SqliteStore's would be relying on an unpinned assertion; if it were wrong, a JCS-invisible payload member could make persisted bytes and digest disagree only on the Postgres backing.

### 24. Residual hardcoded leg index in kernel/expiry.ts

`hardcoded-leg-index-expiry` · merged from 1 reader finding(s) · readers' guess: code / unclear

**What is open.** The clock-resolution append feeds a constant false flag rather than the leg index; harmless today, named as residual.

**Where documented.** `docs/process/implementation-status.md:423`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "One residual hardcoded leg index remains, at `kernel/expiry.ts`'s single `expired`/`redemption-failed` append" — `docs/process/implementation-status.md`

**Still open?** `yes` — Present in HEAD: packages/record/src/kernel/expiry.ts:135 `nonTerminal(state, isFinalLeg(0, profile.legs.length), effectSeam)` feeds leg index 0 for every input, while the sibling site at expiry.ts:75-76 derives `legIndex` via `profile.legs.findIndex(...)`. Named as residual at docs/process/implementation-status.md:423 ('One residual hardcoded leg index remains, at `kernel/expiry.ts`'s single `expired`/`redemption-failed` append, where the fed flag is `false` for every input either way'). No register row, next-phases entry, open-items-plan stage, or CHANGELOG line names it (grep 'hardcoded'/'expiry.ts' across docs/process and CHANGELOG.md: no hits outside implementation-status).

**Is the closing act code?** `yes` (effort S). In packages/record/src/kernel/expiry.ts `resolveDueClock` (~line 133-135), derive the leg index from the replayed record (`profile.legs.findIndex(l => l.id === record.legId)`, as the `dueAt` producer at :75 already does) and pass it to `isFinalLeg`; since `expired`/`redemption-failed` are terminal by derivation the meta flag is `false` either way, so add a pin in packages/record/test (expiry/clock tests) asserting `nonTerminal:false` on a final-leg multi-leg profile to make the change observable; update implementation-status.md:423's residual sentence. Byte-stability pins are unaffected (meta is not chained).

**Release tie.** `documented-post-0.1` — Only recorded at docs/process/implementation-status.md:423 as a harmless residual ('the fed flag is `false` for every input either way'); absent from deferral-register.md, release-checklist.md, next-phases.md and open-items-plan.md, so the repo's own records place it nowhere near the cut.

**Risk if 0.1 ships with it open.** None observable today — the append's `nonTerminal` meta is `false` for every input regardless of the index; it is a latent forward-compatibility wart that would matter only if a non-terminal clock edge were ever introduced.

### 25. Redemption ladder: token-vs-content order unobservable; (5)->(6) race pair untested; direct-seam CAS re-read pin unstated

`redemption-order-pins-unpinned-cells` · merged from 3 reader finding(s) · readers' guess: code / unclear

**What is open.** Both completion checks refuse effect-mismatch so their order is unpinnable; the mismatch-plus-racing-writer pair is excluded on both ladders (redeem.test.ts still says 'not constructible' though RaceOnceStore exists); whether the direct seam's re-read-once behavior is pinned is not recorded.

**Where documented.** `docs/process/implementation-status.md:441`; `packages/record/test/redeem-token.test.ts:583-586`; `packages/record/test/redeem.test.ts:42-43`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "the internal order between them is unobservable and recorded here rather than pinned by test" — `docs/process/implementation-status.md`
- "that increment's tests deliberately declined a racing store" — `docs/process/implementation-status.md`

**Still open?** `partial` — (a) Token-vs-content internal order: still unpinned by design — redeem-token.test.ts:583-584 'NOT pinnable via codes — both refuse effect-mismatch' and implementation-status.md:441 'unobservable and recorded here rather than pinned by test'; a single shared code makes it genuinely unobservable, so this is not open work. (b) (5)->(6) pair: still excluded on both ladders — redeem.test.ts:42-43 says 'not constructible without a bespoke racing store', which is STALE since `RaceOnceStore` exists (packages/record/test/helpers/stores.ts:142, used in redeem-token.test.ts:633,662,692 and clocks.test.ts:364); redeem-token.test.ts:585-586 defers it to 'the racing task' which covers only the (6) residual, not the mismatch-plus-race pair. (c) Direct-seam CAS re-read pin: NOT unstated — it IS pinned by redeem-token.test.ts:685-711 'direct-vs-direct race: the loser refuses already-redeemed — ... first increment seam included' (commit aa63054), and redeem.test.ts:26-31 documents the re-read-once residual. The item's third sub-claim is refuted.

**Is the closing act code?** `yes` (effort S). Two small test-only edits: (1) fix the stale derivation comment at packages/record/test/redeem.test.ts:42-43 ('not constructible without a bespoke racing store') to point at helpers/stores.ts RaceOnceStore and either add the (5)->(6) pair test (mismatched content + RaceOnceStore firing on the `confirmed → redeemed` append — expected refusal `effect-mismatch`, since correspondence runs before append) or record why it stays excluded; (2) the mirror pair on the complete ladder in redeem-token.test.ts:585-586. No src change; the token-vs-content order stays unpinnable and needs no action.

**Release tie.** `documented-post-0.1` — No register row, checklist item (docs/process/release-checklist.md has no mention), or open-items-plan stage names these pins; implementation-status.md:441 records them as deliberate. A stale test comment is a truth-restoration nit; nothing ties it to the cut.

**Risk if 0.1 ships with it open.** A reader of redeem.test.ts:42-43 is told a racing store does not exist when one does; adopters see no behavioral effect — the (5)->(6) ordering is already implied by the rung order and the residual tests.

### 26. Prune-at-seal: the one horn-free deletion point — identified, not designed, not built

`prune-at-seal-identified-not-built` · merged from 5 reader finding(s) · readers' guess: mixed / horizon

**What is open.** After seal()'s CAS lands, C4 admits no append so every orphan is permanent and race-free to delete. Needs a `remove` on the provisional SignatureStore (ruling declined), bounds only pre-seal orphans (key retirement keeps minting), and is gated on a durable backing to measure against.

**Where documented.** `docs/process/deferral-register.md:13`; `docs/process/next-phases.md:68-69`; `docs/process/implementation-status.md:3290-3300`; `docs/superpowers/specs/2026-08-29-sidecar-orphans-report-design.md:83`; `docs/process/release-checklist.md:207-209`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "IDENTIFIED, NOT BUILT: prune-at-seal" — `docs/process/deferral-register.md`
- "Prune-at-seal is the one deletion point identified that escapes the third horn entirely" — `docs/process/implementation-status.md`

**Still open?** `yes` — docs/process/deferral-register.md:13 'IDENTIFIED, NOT BUILT: prune-at-seal ... it needs a remove on the provisional SignatureStore, which the sidecar-contract increment's first ruling declined'; docs/process/implementation-status.md:3290-3300 'deliberately NOT built'; packages/record/src/signing/store.ts:42-48 SignatureStore has put/list only, and store.ts:40-41 says MemorySignatureStore's delete is 'explicitly NOT part of this contract'; docs/process/next-phases.md:68-69 'identified and gated on a durable backing'.

**Is the closing act code?** `yes` (effort M). Re-open the sidecar-contract ruling in writing, add remove(transitionDigest) (or a prune-by-record method) to SignatureStore in packages/record/src/signing/store.ts and MemorySignatureStore in memory.ts, then in the seal path (packages/record/src/kernel/ seal/finalize) delete every sidecar digest with no chain counterpart once seal's CAS has landed, with tests proving the deletion is race-free and that pre-seal orphans vanish while key-retirement post-seal minting is unaffected; api-reference.md must move in the same change. The record says it is gated on a durable backing to measure against first.

**Release tie.** `horizon` — deferral-register.md:13 and implementation-status.md:3290-3300 gate it on 'a durable SignatureStore backing existing to measure against — one of this row's own trigger disjuncts' and say 'Its design, if ever, must re-open that ruling explicitly'; release-checklist.md:207-209 cites it only as 'recorded in the row as identified, not built' in support of the carry-forward ruling. Not in open-items-plan.md at all.

**Risk if 0.1 ships with it open.** Orphans minted before a seal stay in an adopter's sidecar until the host prunes them from the verifySignatures().orphans report; a bounded-storage guarantee the library could offer for the pre-seal case is absent.

### 27. Verification read amplification: `layerVerdicts` materializes every sidecar row (no pin)

`layerverdicts-read-amplification` · merged from 3 reader finding(s) · readers' guess: code / unclear

**What is open.** Orphans never yield a verdict but are fetched on every verification (290 rows vs 100 over twenty calls). Recorded as measured cost, not soundness; measured on a gone rig, no permanent pin scheduled; closes with 22a or a chain-driven read path.

**Where documented.** `docs/process/deferral-register.md:13`; `docs/process/implementation-status.md:1206-1210`; `docs/analysis/2026-08-24-no-edge-containment-investigation.md:62`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "`layerVerdicts` (`kernel/verify-signatures.ts`) materializing every sidecar row on every verification" — `docs/process/deferral-register.md`

**Still open?** `yes` — packages/record/src/kernel/verify-signatures.ts:83 still fetches the full `listByRecord(recordId)` per verification and line 116 derives orphans from it; deferral-register.md:13 ("`layerVerdicts` ... materializing every sidecar row on every verification, twenty refusing calls fetching 5 to 24 rows, 290 cumulative against 100"); 2026-08-24 analysis:62 Read amplification row: rig Gone, pin "None scheduled". No listByRecord row-count test exists (grep of packages/record/test).

**Is the closing act code?** `yes` (effort M). Either (a) a measurement pin: a counting `SignatureStore` wrapper in packages/record/test/no-edge-containment.test.ts asserting rows fetched across N refusing calls (S), or (b) a chain-driven read path — a new optional `getByDigests(digests)`/per-digest lookup on `SignatureStore` (store.ts:41-49) used by `layerVerdicts` (verify-signatures.ts:83) — which changes the provisional interface, and conflicts with `orphans` (verify-signatures.ts:116) which needs the full listing. Or it closes with 22a. Recorded as measured cost, not soundness (deferral-register.md:13).

**Release tie.** `documented-post-0.1` — Part of row 22a's inventory, whose expected release-day ruling is carry forward (release-checklist.md:172-219, esp. 210-219). release-checklist.md:176-178 calls it "a storage and observability finding, not a soundness one". Analysis:62 schedules no pin. Nothing ties a read-path change to the cut.

**Risk if 0.1 ships with it open.** A 0.1 adopter's verification cost grows linearly with accumulated orphans on records touched repeatedly on the refusal path — a performance/storage cost, not a wrong verdict.

### 28. No cross-record orphan view; per-record read only

`cross-record-orphan-sweep` · merged from 2 reader finding(s) · readers' guess: code / horizon

**What is open.** verifySignatures(recordId).orphans is per record; a host with many records has no library read enumerating which carry orphans. A sweep would be a new surface, explicitly outside.

**Where documented.** `docs/process/implementation-status.md:3314-3316`; `docs/superpowers/specs/2026-08-29-sidecar-orphans-report-design.md:152`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "a host with many records still has to know which records to ask about, and this increment opened no cross-record view" — `docs/process/implementation-status.md`

**Still open?** `yes` — verify-signatures.ts:83,116 — orphans computed per recordId only; `SignatureStore` has only `listByRecord` (store.ts:41-49); implementation-status.md:3314-3316 ("opened no cross-record view — a sweep would be a new surface") and 3330-3332 ("a cross-record orphan sweep or any new read surface beyond the one field" stays outside); 2026-08-29 design:152 ("`listDue`-style sweeps are out of scope"). No landing found in git log or CHANGELOG.

**Is the closing act code?** `yes` (effort M). A new read surface: e.g. an optional `listRecordsWithEntries()`/`listAll()` on the provisional `SignatureStore` (store.ts:41-49) plus `MemorySignatureStore` implementation (memory.ts), a `VidimeraOperator` sweep method in the operator surface iterating records and reusing `verifySignatures` correlation, an index.ts export, api-reference.md/integrating.md updates, and tests. Changes the provisional interface, so it belongs with the pre-1.0 store-interface program.

**Release tie.** `horizon` — Explicitly declined as out of scope by the orphans-report increment (implementation-status.md:3314-3316, 3330-3332; design:152); no register row, no checklist item, no next-phases entry names it; the store/signing method shapes freeze only at 1.0 (open-items-plan.md:257-262, Stage 6).

**Risk if 0.1 ships with it open.** A 0.1 adopter with many records must maintain their own list of records to poll `verifySignatures(recordId).orphans` on, or query their durable backing directly, to find orphans fleet-wide.

### 29. AL2 signature-break coverage bounds: genesis tampers only; throwing Verifier and non-genesis break untested; unnamed grid cells

`al2-coverage-grid-bounds` · merged from 4 reader finding(s) · readers' guess: code / unclear

**What is open.** Every break in the coverage increment tampers the genesis sidecar entry; no test breaks a non-genesis entry or supplies a throwing/rejecting Verifier; seam × break-kind cells rows 20/21 did not name stay untested by scope bound.

**Where documented.** `docs/process/implementation-status.md:2528-2537`; `docs/process/implementation-status.md:2554-2556`; `docs/superpowers/specs/2026-08-23-al2-signature-enforcement-coverage-design.md:166-171,229`; `packages/record/test/signing-enforce.test.ts:20-26`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "The other two are covered nowhere at all" — `docs/process/implementation-status.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- a throwing verifier, and a break at a non-genesis position, are separate inputs again and appear nowhere

**Still open?** `yes` — packages/record/test/signing-enforce.test.ts:20-26 header still states 'a throwing verifier, and a break at a non-genesis position, are separate inputs again and appear nowhere'; packages/record/test/helpers/signing.ts:127-131 breakOneSignature always targets chain[0] (genesis), and every corpus caller uses it (grep: 22 call sites, none passing a position); grep for a throwing/rejecting Verifier across packages/record/test finds none (only throwing SIGNER pins in signing.test.ts); docs/process/implementation-status.md:2528-2537 and :2554-2556 record the bound and 'every cell of the seam and break-kind grid that neither row named' as outside.

**Is the closing act code?** `yes` (effort M). Test-only additions in packages/record/test/signing-enforce.test.ts (or a sibling): (a) a Verifier that throws/rejects wired through enforceableSigningSetup's verifiers registry, asserting finalize/seal/redeem/findings refuse chain-compromise and verifySignatures reports verified:false (kernel/verify-signatures.ts already claims fail-closed on a throwing verifier per implementation-status.md:445); (b) a breakOneSignature variant taking a seq/position (helpers/signing.ts:121-137) to tamper a non-genesis entry, with one refusal pin per seam; optionally the wider seam x break-kind grid. Also the unpinned 'returned transition reference equals appended edge digest' equality (implementation-status.md:2537-2540). No src change expected unless a test reveals a gap.

**Release tie.** `documented-post-0.1` — Rows 20 and 21 retired at this increment and no register row tracks the remaining grid cells (docs/process/implementation-status.md:2554-2557 'coverage here is bounded to what the rows name'); not in release-checklist.md or open-items-plan.md stages 4-5; the nearest recorded program is Stage 6's can-fail discipline (open-items-plan.md:244-250), post-0.1. Arguably cheap enough to land pre-cut, but no document ties it to the cut and the production code path (throwing verifier fail-closed) is claimed in the status record, only unpinned.

**Risk if 0.1 ships with it open.** A regression making a throwing/rejecting Verifier or a mid-chain signature break pass the layer would go unnoticed by the suite; the fail-closed behavior is documented (implementation-status.md:445) but pinned by no test at those two inputs.

### 30. No benchmarks pre-1.0; named hot paths (append under contention, O(chain) verifies) and triggers

`benchmarks-hot-paths-unmeasured` · merged from 2 reader finding(s) · readers' guess: code / horizon

**What is open.** Nothing is timed anywhere. Hot paths: per-append FOR UPDATE row lock and per-(profile, subject) advisory lock in postgres-store.ts; whole-chain verifies on the gate ladder. Triggers: first consumer latency concern, or the stage-7 bench-suite candidate.

**Where documented.** `docs/process/open-items-plan.md:146-154,290-291`; `docs/analysis/2026-08-20-small-postures.md:77-86`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Triggers: the first consumer-reported latency concern, or the stage-7 bench-suite candidate if it is ever selected" — `docs/analysis/2026-08-20-small-postures.md`
- "The append path under contention and the O(chain) verifies are the first candidates" — `docs/process/open-items-plan.md`

**Still open?** `partial` — The posture is CLOSED by ruling (docs/analysis/2026-08-20-small-postures.md:23-31 'now recorded as the deliberate skip it was'; docs/process/open-items-plan.md:146 ticked). The measurement itself remains undone: no bench script or perf test exists (grep of package.json/packages/*/package.json for `bench` returns nothing; git log has no bench commit), and the stage-7 bench-suite candidate is unselected (docs/process/open-items-plan.md:290-291; docs/process/open-items-sessions.md:115-118).

**Is the closing act code?** `yes` (effort M). If ever selected: a `scripts/bench.mjs` or packages/store-postgres/test/bench harness timing concurrent `appendTransition` against the `FOR UPDATE` row lock and per-(profile, subject) advisory lock in packages/store-postgres/src/postgres-store.ts, plus `verifyChain` over long chains in packages/record; results recorded in a dated docs/analysis note. No src change is implied by measurement alone.

**Release tie.** `horizon` — docs/process/open-items-plan.md:280-282 'Stage 7 — The horizon. Candidates only'; :290-291 'A benchmark suite — if stage 3 ruled measure'; docs/analysis/2026-08-20-small-postures.md:29-31 'Triggers: the first consumer-reported latency concern, or the stage-7 bench-suite candidate if it is ever selected'; :151-153 'A pre-0.1 embedded library can legitimately skip this'.

**Risk if 0.1 ships with it open.** An adopter has no published throughput figures for append under contention or whole-chain verification; chains are deliberately short by design (small-postures.md:28-29), so the practical exposure is unquantified rather than known-bad.

### 31. First-use proof is ubuntu only; Windows/macOS clean-machine legs not run (non-Linux rehearsal agenda item never recorded met)

`first-use-windows-macos-legs` · merged from 5 reader finding(s) · readers' guess: code / horizon

**What is open.** Both legs run on ubuntu-latest; consumer behavior elsewhere is inferred from CI's checkout-based matrix. The brainstorm asked for a non-Linux pack-and-consume rehearsal before announcement; likely satisfied in substance, never recorded.

**Where documented.** `docs/process/implementation-status.md:3510-3512,3537-3538`; `docs/analysis/2026-08-29-first-use-proof.md:99-100`; `docs/superpowers/specs/2026-08-29-first-use-proof-design.md:156-158,204`; `docs/process/release-checklist.md:62-64`; `docs/analysis/2026-08-18-release-phase-brainstorm.md:302-305`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "consumer-side behavior on Windows and macOS is inferred from CI's own matrix, which runs from a checkout, rather than proved here" — `docs/process/implementation-status.md`
- "on the declared floor and on at least one non-Linux platform, before any announcement" — `docs/analysis/2026-08-18-release-phase-brainstorm.md`

**Still open?** `yes` — docs/process/implementation-status.md:3510-3512 'Ubuntu only: both legs run on `ubuntu-latest`, and consumer-side behavior on Windows and macOS is inferred from CI's own matrix'; :3536-3538 'Windows and macOS first-use legs, which the record names as a gap and which are a later choice'; .github/workflows/first-use.yml:57 `runs-on: ubuntu-latest` with a two-entry Node-only matrix (:60-64). Partial refutation of the brainstorm framing: docs/analysis/2026-08-18-release-phase-brainstorm.md:302-305's 'pack-and-consume rehearsal ... on at least one non-Linux platform' is substantively met by CI's `pnpm smoke` on windows-latest and macos-latest (.github/workflows/ci.yml:42-44,74), which packs and installs the tarball into a scratch project — from a checkout, not a clean machine. No record states that agenda item met; docs/process/release-checklist.md:62-64 records the bound 'ubuntu only'.

**Is the closing act code?** `yes` (effort M). Extend the `first-use` job matrix in .github/workflows/first-use.yml (currently :57-64, ubuntu-latest, node 22.16.0/24) with windows-latest and macos-latest entries; the `services.postgres` container (:65-75) does not run on non-Linux runners, so either reuse ci.yml:55-62's preinstalled-PostgreSQL-on-Windows step and export VIDIMERA_PG_URL, or let scripts/first-use.mjs's documented skip path (:104-116) run the MemoryStore half only on those legs; then dispatch once and record the run in a dated docs/analysis/ record and implementation-status.md. Any change to scripts/first-use.mjs itself is parked until the `source: registry` dispatch (release-checklist.md:150-154).

**Release tie.** `documented-post-0.1` — docs/process/implementation-status.md:3536-3538 'a later choice'; docs/superpowers/specs/2026-08-29-first-use-proof-design.md:204 'adding them is a later choice'; docs/process/release-checklist.md:62-64 records 'ubuntu only' as an accepted bound of the discharged precondition and the post-publish item (:144-150) re-dispatches the same ubuntu-only workflow. No register row or checklist box requires non-Linux clean-machine legs.

**Risk if 0.1 ships with it open.** A first adopter on Windows or macOS installing from the registry relies on CI's checkout-based smoke rather than a clean-machine proof; a platform-specific install or node:sqlite behavior on those OSes would surface first in the wild.

### 32. Digest agility: sha256 only; deprecation-warning path unreachable and unexercised

`digest-agility-inert` · merged from 4 reader finding(s) · readers' guess: code / horizon

**What is open.** SUPPORTED_ALGORITHMS is [sha256], DEPRECATED_ALGORITHMS empty, so algorithmOf's warning and encodeTransition's migration hook have no producer or end-to-end test.

**Where documented.** `docs/process/implementation-status.md:383`; `packages/record/src/canonical.ts:33-41,95-96`; `packages/record/src/chain/encoding.ts:67,80`; `packages/record/test/canonicalization.test.ts:108-114`; `docs/guide/api-reference.md:399`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "the set is empty, so nothing can fire it — there is no second algorithm to migrate to or from" — `docs/process/implementation-status.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- Empty in this build: `sha256` is the only algorithm that has ever existed, so nothing is deprecated yet.

**Still open?** `yes` — packages/record/src/canonical.ts:36-41 (`DEPRECATED_ALGORITHMS ... Empty in this build`) and :93-96 (`algorithmOf` warning 'currently unreachable since that set is empty'); packages/record/test/canonicalization.test.ts:108-114 pins SUPPORTED=[sha256] and DEPRECATED empty; docs/process/implementation-status.md:383 row 7 'Not built here': 'The deprecation-warning surface exists ... but the set is empty, so nothing can fire it'; docs/guide/api-reference.md:399 `type DigestAlgorithm = 'sha256'`. Explicitly classified as NOT pending: docs/process/open-items-plan.md appendix (~line 308) 'single-algorithm digest agility (room left, nothing pending)'. SPEC §7 (docs/concept/SPEC.md:483-489, sealed) says the deprecation list 'are amended only by a revision of this document' (SPEC.md:11).

**Is the closing act code?** `yes` (effort M). Only becomes work when a second algorithm is adopted: extend `DigestAlgorithm`/`SUPPORTED_ALGORITHMS` in packages/record/src/canonical.ts, move `sha256` into `DEPRECATED_ALGORITHMS`, and add a canonicalization.test.ts case that mints a chain under the old algorithm and asserts `process.emitWarning` fires on `algorithmOf`/`transitionDigest` (chain/encoding.ts:67-84). Because SPEC.md:11 says the list is amended only by a SPEC revision, this needs a fresh sealed-set sanction first; byte-stability digests stay frozen (they pin sha256 chains, which remain valid). A cheaper interim would be a test that monkey-patches the set to prove the warning path once — arguably not worth the coupling.

**Release tie.** `horizon` — docs/process/open-items-plan.md:~308 appendix: 'single-algorithm digest agility (room left, nothing pending)' — surveyed and not open; no deferral-register row, not on release-checklist.md; SPEC.md:11 gates any change behind a spec revision.

**Risk if 0.1 ships with it open.** None for an adopter of 0.1: sha256 is the only algorithm, all records verify, and the agility hook is inert by design; the warning path is merely untested until an algorithm migration ever happens.

### 33. profileDigest recorded at open but never compared; no profile-drift detector

`profile-digest-no-drift-detector` · merged from 2 reader finding(s) · readers' guess: code / horizon

**What is open.** The genesis carries the digest for a future comparison; no seam compares it against the live profile at finalize/redeem, so drift between open and decision is undetected except renamed legs failing closed.

**Where documented.** `packages/record/src/profile-digest.ts:4-6,44`; `packages/record/test/profile-digest.test.ts:3-5`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- there is no automated drift detector yet — comparison is a host concern until one is built.

**Still open?** `yes` — packages/record/src/profile-digest.ts:4-6 'there is no automated drift detector yet — comparison is a host concern until one is built'; :40-44 'a future drift comparison'; packages/record/test/profile-digest.test.ts:3-5 'meant to be COMPARED against a later live read once a drift detector exists (none in this build)'. Grep of packages/record/src for a profileDigest comparison at finalize/redeem finds none (policy-drift compares `policyDigest`, a different field — next-phases.md:330-337). SPEC.md:347-350 (sealed) only says drift 'is detectable on replay' — it does not require the library to detect it. Related but distinct: open-items-plan.md:266-270 names 'a profileDigest-pinning tightening' as one of two AL2 rehoming-residual closures 'candidates a 1.0 review should weigh, not debts'.

**Is the closing act code?** `yes` (effort M). A detector would be a new rung in packages/record/src/kernel/finalize.ts (and likely decline/redeem) comparing `profileDigest(config.profile)` against the `opened` payload's `profileDigest` (chain/replay.ts exposes the opened snapshot), refusing on mismatch — which needs a NEW refusal code in refusal-codes.ts (24 today) and therefore a SPEC §8/§9 ladder change under a fresh sealed-set sanction; tests in packages/record/test/finalize*.test.ts. Alternatively a pure audit helper (`compareProfileDigest(chain, profile)`) exported from index.ts with an api-reference.md entry — no spec change, smaller.

**Release tie.** `horizon` — Not a deferral-register row, not on release-checklist.md; SPEC.md:347-350 frames detection as replay-time, satisfied today by `projectProfile` + `profileDigest` being exported; open-items-plan.md:266-270 places the nearest named tightening ('profileDigest-pinning') at a 1.0 review as 'candidates ... not debts'.

**Risk if 0.1 ships with it open.** An adopter whose profile changes between open() and finalize() gets no library-side refusal; only renamed legs fail closed, and detecting other drift means the host comparing the recorded profileDigest itself, as profile-digest.ts:4-6 documents.

### 34. Durable SignatureStore backing: only MemorySignatureStore exists; orphan behavior unmeasured

`durable-signaturestore-backing-unmeasured` · merged from 8 reader finding(s) · readers' guess: code / horizon

**What is open.** No durable sidecar backing exists in the tree, so orphan growth, read amplification, the orphans report and sidecar-outside-transaction semantics have never been measured where they would matter. Row 22's first trigger disjunct is the first increment adding one; none is planned. Tie split post-0.1/horizon/unclear/gates-0.1.

**Where documented.** `docs/process/deferral-register.md:13`; `docs/process/implementation-status.md:1231-1233`; `docs/process/implementation-status.md:2551-2554`; `docs/process/implementation-status.md:3120-3121,3321-3323`; `docs/analysis/2026-08-24-no-edge-containment-investigation.md:180-183`; `docs/superpowers/specs/2026-08-29-sidecar-orphans-report-design.md:162`; `docs/process/release-checklist.md:200-203`; `packages/record/test/redeem.test.ts:164-166`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "UNMEASURED, and named as such: behavior on a durable `SignatureStore` backing — a coverage bound rather than a mitigation" — `docs/process/deferral-register.md`
- "`MemorySignatureStore` is the only implementation anywhere in the tree, so no other measurement was possible" — `docs/analysis/2026-08-24-no-edge-containment-investigation.md`

**Still open?** `yes` — packages/record/src/signing/ holds only decorate.ts, memory.ts, store.ts (MemorySignatureStore is the sole implementation); packages/store-postgres/src has no SignatureStore implementation (grep empty); docs/process/deferral-register.md:13 'UNMEASURED, and named as such: behavior on a durable SignatureStore backing'; docs/process/release-checklist.md:200-203 'it is unmeasurable in this tree, because MemorySignatureStore is the only implementation'; no plan or spec in docs/superpowers/ names a durable backing increment (git log through 4e80bf7).

**Is the closing act code?** `yes` (effort L). A new durable SignatureStore implementation, most naturally in packages/store-postgres/src (a signatures table keyed by transitionDigest with put/list/upsert semantics per store.ts:42-48), its conformance tests against the embedded Postgres, and a measurement of orphan growth, read amplification, and verifySignatures().orphans against it; landing it fires row 22's first trigger disjunct and forces a fresh row-22 ruling (deferral-register.md:13). SignatureStore method signatures are provisional pre-1.0 (open-items-plan.md:257-262), so the shape may still move.

**Release tie.** `horizon` — deferral-register.md:13 makes it the FIRST trigger disjunct of row 22 that survives the cut ('The first increment that adds a durable SignatureStore backing'), and the same row's trigger explains why no in-repo event fires: 'a host's durable backing arrives through the documented signatures: hook in the operator's own deployment'. release-checklist.md:200-203 treats it as a coverage bound to note before ruling, not as work owed at the cut; open-items-plan.md stages 4-7 do not list it.

**Risk if 0.1 ships with it open.** A 0.1 adopter supplying their own durable signatures: backing would be the first to measure orphan growth and sidecar read amplification, with only the store.ts contract text and the orphans report to guide reconciliation.

### 35. Signing cost is an invocation count; no latency figure; concurrency measured in-process only

`signing-cost-no-latency-cross-process` · merged from 3 reader finding(s) · readers' guess: code / horizon

**What is open.** No wall-clock or signer-latency measurement exists; every concurrency measurement behind the rejected containments and the shipped sign-before-append ordering ran in-process over memory backings, never cross-process against a shared Postgres. Rigs are gone.

**Where documented.** `docs/process/implementation-status.md:3121-3123`; `docs/superpowers/specs/2026-08-24-no-edge-containment-design.md:244-245`; `docs/analysis/2026-08-24-no-edge-containment-investigation.md:185-187`; `docs/superpowers/plans/2026-08-24-row-22-truth-repairs.md:60`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "No latency figure exists anywhere; the signing cost is an invocation count." — `docs/process/implementation-status.md`
- "Every concurrency measurement ... ran in-process against the in-memory backings, never cross-process against a shared Postgres" — `docs/analysis/2026-08-24-no-edge-containment-investigation.md`

**Still open?** `yes` — docs/process/implementation-status.md:3120-3123 ('No latency figure exists anywhere; the signing cost is an invocation count. Every concurrency measurement behind the rejected families was in-process, on prototype arms that are gone'); docs/analysis/2026-08-24-no-edge-containment-investigation.md:185-187; docs/superpowers/specs/2026-08-24-no-edge-containment-design.md:244-245. Neither packages/record/test nor packages/store-postgres/test carries a signing latency or cross-process signing-concurrency fixture (grep on Verifier/throw/latency finds none); SignatureStore has only the memory implementation (packages/record/src/signing/{decorate,memory,store}.ts; no hits in packages/store-postgres/src).

**Is the closing act code?** `yes` (effort L). A benchmark or measurement rig: a timed Signer/Verifier double under packages/record/test (or a bench script under scripts/) reporting wall-clock per mint and per verifySignatures walk, and a cross-process fixture in packages/store-postgres/test driving two create() instances against the embedded Postgres with a shared durable SignatureStore — which does not exist, so it also implies a durable SignatureStore backing (row 22's first trigger disjunct). Results would land in docs/process (the row and the investigation record).

**Release tie.** `horizon` — open-items-plan.md Stage 3 'Performance posture' is checked [x] (:146) as a recorded posture, and 'A benchmark suite' is a Stage 7 horizon candidate (:290-291); the investigation lists these under 'what the investigation did NOT establish' (docs/analysis/2026-08-24-no-edge-containment-investigation.md:185-187) with no trigger; the release checklist's row-22 item (release-checklist.md:172-219) treats the durable-backing case as a coverage bound to note, not to close at the cut.

**Risk if 0.1 ships with it open.** An adopter with a remote key service or a shared Postgres has no published figure for signing overhead or cross-process signing races and must measure both themselves; the docs say so plainly.

### 36. Can-fail discipline for the eleven pass-path-only probes (stage-6 campaign)

`can-fail-campaign-eleven-probes` · merged from 4 reader finding(s) · readers' guess: code / pre-1.0

**What is open.** Of seventeen probes, only four families plus the runner-catch path are shown able to fail against broken drivers; eleven pin only their conforming-host pass path. Needs its own scoping/spec-plan pair; also where the conformance suite hardens and a one-off branch-coverage aid might be used.

**Where documented.** `docs/process/open-items-plan.md:244-250`; `docs/process/open-items-sessions.md:272-274`; `docs/process/implementation-status.md:446`; `docs/analysis/2026-08-20-conformance-export.md:192-196`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "the other eleven refusal-assertion probes pin only their conforming-host pass path" — `docs/process/open-items-plan.md`
- "the pre-1.0 can-fail campaign (the open-items plan's stage 6) is expected to grow and harden it" — `docs/analysis/2026-08-20-conformance-export.md`

**Still open?** `yes` — docs/process/open-items-plan.md:244-250 is an unticked '[ ] Can-fail discipline, suite-wide' in Stage 6; 'the other eleven refusal-assertion probes pin only their conforming-host pass path' (:246-247) and 'no register row tracks closing it' (:248). docs/process/open-items-sessions.md:272-274 pre-declares the design session. git log shows no can-fail campaign commit (only the sidecar-contract probe correlation fix, 3ab669d). docs/analysis/2026-08-20-small-postures.md:19-20 keeps the branch-coverage aid as an open trigger '(1) the stage-6 can-fail design session may adopt branch coverage'.

**Is the closing act code?** `yes` (effort L). Test-only code: in packages/record/test/probes.test.ts (or a new probes-can-fail.test.ts) add one deliberately-broken ProbeDriver / store wrapper per remaining probe family (payload-identity-refused, at-most-once-redeem, effects-match, consultations-present, acks-block, ineligible-refuses, sod-refuses, exclusivity, etc.) proving each returns status 'fail' — 'without stubbing the pass' (open-items-sessions.md:273-274). Possibly a one-off vitest branch-coverage run as a discovery aid (small-postures.md:19-20); no src change required unless a probe proves unable to fail, which would be a probe bug fix in packages/record/src/probes/probes.ts. Needs its own spec/plan pair in docs/superpowers/ first.

**Release tie.** `documented-post-0.1` — open-items-plan.md:238-241 heads Stage 6 'The pre-1.0 program — Post-0.1 work with a recorded basis today'; docs/analysis/2026-08-20-conformance-export.md:53-54 calls it 'the pre-1.0 can-fail campaign (the open-items plan's stage 6)'; implementation-status.md CONTROLS §4 row 'records the bound honestly' (open-items-plan.md:247-248). Nothing in release-checklist.md or the deferral register names it.

**Risk if 0.1 ships with it open.** An operator running the 0.1 probe tier gets 'pass' from eleven probes that have never been shown able to fail — the tier's assurance value is partly unproven, though the bound is documented in implementation-status.md.

### 37. Probe driver shapes: leg-0 / two-leg / single-leg-only narrowing (consultation-genuineness, sod-refuses, redemption, first-leg scans)

`probe-driver-deeper-leg-shapes` · merged from 9 reader finding(s) · readers' guess: code / pre-1.0

**What is open.** openOne always opens leg 0 and builds one prior-leg reference, so consultation-genuineness, sod-refuses, at-most-once-redeem, effects-match, consultations-present, acks-block and ineligible-refuses report not-driven for declarations beyond the driven positions. Deeper shapes are a pre-1.0 driver-shape question.

**Where documented.** `docs/process/open-items-plan.md:251-256`; `docs/process/open-items-sessions.md:275-276`; `docs/process/implementation-status.md:446`; `packages/record/src/probes/probes.ts:296-302`; `packages/record/src/probes/probes.ts:416-434,459-474`; `packages/record/src/probes/probes.ts:501-535`; `packages/record/src/probes/probes.ts:604-609,644-648,687-689`; `packages/record/test/probes.test.ts:507-511,539-545`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "deeper legs/chains are a pre-1.0 driver-shape question" — `docs/process/open-items-plan.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- this probe drives only the two-leg shape (legIndex 1) today; deeper chains are a pre-1.0 driver-shape question
- every effect-seam profile is multi-leg — the probe drives the single-leg effect-seam shape today

**Still open?** `yes` — packages/record/src/probes/probes.ts:298-300 ('this probe drives only the leg-0 shape today ... deeper legs are a pre-1.0 driver-shape question'), :531-532 ('deeper chains are a pre-1.0 driver-shape question'), :416-434 and :459-474 ('every effect-seam profile is multi-leg — the probe drives the single-leg effect-seam shape today'), :609/:648/:689 first-leg-only scans. open-items-plan.md:251-256 unticked '[ ] Deeper-leg and deeper-chain driver shapes'. packages/record/test/probes.test.ts:507-511 pins the leg-0 narrowing as the expected not-driven.

**Is the closing act code?** `yes` (effort L). packages/record/src/probes/probes.ts: generalize openOne (:86-104) / the prior-leg construction used by sod-refuses (:501-575) into a helper that drives a chain to an arbitrary legIndex (stage+open+finalize each prior leg), then lift the leg-0 / legIndex-1 / single-leg narrowings in consultation-genuineness, sod-refuses, at-most-once-redeem, effects-match, consultations-present, acks-block, ineligible-refuses. Likely a ProbeDriver API change in packages/record/src/probes/types.ts (per-leg sample identities are already there; per-leg content/consultations may need to be). Update the not-driven pins in packages/record/test/probes.test.ts:507-545 and docs/guide/api-reference.md if the ProbeDriver shape moves (pnpm api-sync).

**Release tie.** `documented-post-0.1` — open-items-plan.md:238-256 places it in Stage 6 'The pre-1.0 program — Post-0.1 work'; the code's own message names it 'a pre-1.0 driver-shape question' (probes.ts:300,532); open-items-sessions.md:275-276 couples it to the probe driver's API question. The probe shapes are declared 'PROVISIONAL pre-1.0' (probes.ts:20; types.ts:3), so changing them post-0.1 is within the recorded contract.

**Risk if 0.1 ships with it open.** A 0.1 adopter whose profiles declare controls only beyond the driven leg positions gets honest 'not-driven' results rather than coverage from the probe tier — visible, documented, not a false pass.

### 38. Extract the gate ladder out of finalize.ts — named a real problem, never scheduled

`finalize-gate-ladder-extraction` · merged from 1 reader finding(s) · readers' guess: code / horizon

**What is open.** finalize.ts keeps growing rungs; the refactor is its own cluster and must be reviewable as pure relocation against the pinned rung order.

**Where documented.** `docs/superpowers/specs/2026-08-04-atomic-batch-append-design.md:50`; `docs/superpowers/specs/2026-08-05-chain-retirement-design.md:45-47`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "extracting the gate ladder out of `finalize.ts` (513 lines, and every remaining build step adds a rung to it). That is a real problem and a different cluster." — `docs/superpowers/specs/2026-08-04-atomic-batch-append-design.md`

**Still open?** `yes` — packages/record/src/kernel/finalize.ts is now 935 lines (wc), up from the 513 the atomic-batch design cited (docs/superpowers/specs/2026-08-04-atomic-batch-append-design.md:50); git log has no ladder-extraction commit. Only a partial extraction landed: the recorded-human-decline increment exported shared pieces (refuseMaybeAppend :808, sodViolated :846, isValidFacts :918) so decline.ts could reuse them (docs/superpowers/plans/2026-08-21-recorded-human-decline.md:226-285), not a ladder relocation. No process doc schedules the extraction: open-items-plan.md stages 6-7 (:238-297) and appendix (:299-318) do not mention it.

**Is the closing act code?** `yes` (effort L). Move finalize()'s rung bodies (chain-verify through 5.7) out of packages/record/src/kernel/finalize.ts into a ladder module (e.g. kernel/ladder/*.ts) as pure relocation, keeping refuseMaybeAppend/sodViolated/appendChainCompromise imports for decline.ts and redeem.ts intact; byte-stability.test.ts must stay untouched and green and every adjacent-pair ladder-order test (finalize, decline, redeem) must pass unchanged — reviewers diff for zero behavior change.

**Release tie.** `horizon` — Both specs call it 'a real problem and a different cluster' with no timing (…atomic-batch-append-design.md:50-53; …chain-retirement-design.md:45-47); no register row or next-phases entry ties it to 0.1; the ladder order is 'a pinned invariant' so it is a refactor with review cost, not a gate.

**Risk if 0.1 ships with it open.** Adopters see nothing — it is internal structure; maintainers keep paying review cost on a 935-line file where a moved rung and a changed path are hard to distinguish.

### 39. Horizon: a third store adapter by an outside author

`horizon-third-store-adapter` · merged from 1 reader finding(s) · readers' guess: code / horizon

**What is open.** Candidate only, unscoped; premise (an exported conformance suite) declined for 0.x, so doubly conditional.

**Where documented.** `docs/process/open-items-plan.md:283-285`; `docs/process/open-items-sessions.md:288`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Would prove the exported conformance suite (if stage 3 ruled export) against an author who is not this repository" — `docs/process/open-items-plan.md`

**Still open?** `yes` — Only two packages exist (ls packages/: record, store-postgres). The candidate is listed unchecked at docs/process/open-items-plan.md:283-285 under Stage 7; docs/process/open-items-sessions.md:288 says "No session is scheduled". Its premise was declined: docs/analysis/2026-08-20-conformance-export.md:1,14-18 ("Not exported while 0.x"; the 1.0 store-interface freeze "re-asks this question"), so open-items-plan.md:263 ("if stage 3 ruled export") stays inert and the adapter candidate is doubly conditional.

**Is the closing act code?** `yes` (effort XL). A new workspace package (packages/store-<backing>/) implementing SPEC §12's eight Store methods with C1–C4 atomic in the append, wired into the conformance suite (packages/record/test/conformance/store-conformance.ts) via vendoring (the blessed 0.x path per docs/analysis/2026-08-20-conformance-export.md:17-18), plus pnpm-workspace/CI matrix/smoke changes. By definition authored outside this repository, so it is not this repo's build work unless scoped in.

**Release tie.** `horizon` — docs/process/open-items-plan.md:279-285 ("Stage 7 — The horizon ... Candidates only. Each needs its own scoping"); docs/analysis/2026-08-20-conformance-export.md:14-16 pushes the enabling export question to the 1.0 freeze (OPEN-QUESTIONS §9). No register row or checklist item names it.

**Risk if 0.1 ships with it open.** None for a 0.1 adopter — two reference backings ship (memory/sqlite in record, Postgres adapter); an adopter wanting another backing vendors the test-side conformance suite as docs/analysis/2026-08-20-conformance-export.md:17-18 prescribes.

### 40. Key retirement puts healthy sealed signing records into permanent orphan minting (no pin, no containment)

`key-retirement-permanent-minting` · merged from 3 reader finding(s) · readers' guess: mixed / unclear

**What is open.** Dropping a decommissioned keyRef from the verifier registry makes every later call on a sound sealed record take the no-edge path (6→13 over eight calls). Reached in ordinary operation; prune-at-seal does not bound it; the figure was measured on a rig that is gone and nothing pins it.

**Where documented.** `docs/process/deferral-register.md:13`; `docs/process/implementation-status.md:1201-1205`; `docs/analysis/2026-08-24-no-edge-containment-investigation.md:59`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "puts a healthy, untampered, sealed signing record into permanent minting" — `docs/process/deferral-register.md`

**Still open?** `yes` — deferral-register.md:13 ("REACHED IN ORDINARY OPERATION ... permanent minting, sidecar 6 to 13"), implementation-status.md:1208-1212, and 2026-08-24-no-edge-containment-investigation.md:62 (Key-retirement reachability, rig Gone, pin "None scheduled"). No test in packages/record/test mentions decommissioning/key retirement (grep for decommission/key-retire returned nothing); no-edge-containment.test.ts pins only the tampered sealed corner and already-refused corner (lines 197, 342-347). It is a sub-shape of row 22a, which is open.

**Is the closing act code?** `partial` (effort S). Not a separable item: it is one reachability shape of row 22a. Decision-first — the only measured containment takes the third horn (SPEC §5 admission rule, sealed, needs a fresh sanction, deferral-register.md:13). If a pin alone is wanted, it is a new baseline test in packages/record/test/no-edge-containment.test.ts constructing a healthy sealed record, dropping its keyRef from the verifier registry, and asserting one orphan per subsequent finalize() (S). Prune-at-seal would not bound it ("keeps minting after it", deferral-register.md:13).

**Release tie.** `documented-post-0.1` — Row 22's trigger names the 0.1 cut (deferral-register.md:13; release-checklist.md:172-219), but the pre-argued release-day ruling is "carry forward" with the cut disjuncts dropped and the durable-backing and third-horn-sanction disjuncts standing (release-checklist.md:210-219; next-phases.md:66-70). The key-retirement figure itself has no pin scheduled (2026-08-24 analysis:62) and is not a checklist item.

**Risk if 0.1 ships with it open.** An operator who rotates a signing key and drops the old keyRef sees every later seam call on sound sealed records refuse `chain-compromise` and add one sidecar orphan each, with no in-library bound; the guide's tolerate-and-prune obligation is the only mitigation.

### 41. transitionDigest/adapter-kit internals question for a future conformance package

`conformance-package-internals-transitiondigest` · merged from 2 reader finding(s) · readers' guess: decision / pre-1.0

**What is open.** A separate conformance package would need transitionDigest and two test-helper modules: export, vendor-with-drift, or a testing-internals subpath — named the first design problem of the presumptive 1.0 package. The earlier adapter-kit export decision (transitionDigest, genesisPrevHash, algorithmOf) is partly overtaken: transitionDigest is exported today per README.

**Where documented.** `docs/analysis/2026-08-20-conformance-export.md:229-233`; `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md:1243`; `docs/superpowers/plans/2026-08-03-autonomous-step-1-completion.md:211`; `README.md:157-160`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "carrying the internals question (`transitionDigest`) as its first design problem" — `docs/analysis/2026-08-20-conformance-export.md`
- "whether the adapter kit (`transitionDigest`, `genesisPrevHash`, `algorithmOf`) is exported, which the conformance suite forces" — `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md`

**Still open?** `partial` — The original adapter-kit question is OVERTAKEN: packages/record/src/index.ts:23 exports `transitionDigest` and index.ts:70-73 records it as 'part of the adapter-author surface ... `genesisPrevHash`, `encodeTransition` stays unexported'; README.md:158-159 'the adapter-author helpers' landed under the review's rules; commit bb87ad0 'The adapter-author surface: what a conforming Store needs, exported whole'. What remains: conformance-export.md:27-34 and :89-92 name the internals question for a SEPARATE package — the suite also imports two test-helper modules (test/helpers/chain.ts, store-fixtures.ts; store-conformance.ts:17-21) that are not exported — 'carrying the internals question (`transitionDigest`) as its first design problem'. Note the ruling's own text is partly stale: it calls transitionDigest 'an internal the API review deliberately left unexported' (:28) while index.ts:23 exports it today, so only the test-helper coupling is genuinely unresolved.

**Is the closing act code?** `partial` (effort S). Dormant until the 1.0 re-ask rules export (see previous item). If it does: decide export vs vendor-with-drift vs a testing-internals subpath for test/helpers/chain.ts (storeGenesis/storeNext) and test/helpers/store-fixtures.ts (APPROVER, fiveElementBatch, openRecord, successBatch); transitionDigest itself is already public. Possible small docs-only closing act now: correct conformance-export.md:28's stale 'left unexported' claim, or leave as a dated record.

**Release tie.** `documented-post-0.1` — docs/analysis/2026-08-20-conformance-export.md:85-92 'What the 1.0 freeze re-asks ... first design problem'; open-items-plan.md:238-240 Stage 6 'Post-0.1 work'; the 2026-08-02/03 plan mentions (:1243, :211) were pre-build decide-before-starting notes, resolved by bb87ad0.

**Risk if 0.1 ships with it open.** None for a 0.1 adopter: transitionDigest is exported; the residual coupling only matters if a separate conformance package is ever built.

### 42. Committed-read: named-not-built Store surface clause and read isolation under an open caller tx (1.0 freeze observation)

`committed-read-surface-and-isolation-observation` · merged from 3 reader finding(s) · readers' guess: decision / pre-1.0

**What is open.** A same-connection readChain inside a host tx would see uncommitted appends; reads take no tx and the corner is untested. Handed to the 1.0 freeze as an observation, not an obligation. The store.ts header's committed-read clause was ruled on in the 2026-08-20 session (open-items-plan.md:161 ticked).

**Where documented.** `docs/analysis/2026-08-20-committed-read.md:124-131`; `docs/superpowers/specs/2026-08-12-sqlite-adapter-design.md:215`; `docs/superpowers/specs/2026-08-19-store-postgres-design.md:260`; `docs/process/open-items-plan.md:161`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "The 1.0 store-freeze session ... should look at it once while freezing the signatures — as an observation, not a revived obligation" — `docs/analysis/2026-08-20-committed-read.md`

**Still open?** `partial` — The store.ts committed-read clause is CLOSED: packages/record/src/store/store.ts:12-16 now names it 'inherited reference-kernel speculation ... retired by the 2026-08-20 ruling', and docs/process/open-items-plan.md:161 is ticked. What remains is only the read-isolation-under-open-tx observation: docs/analysis/2026-08-20-committed-read.md:44-52 'should look at it once while freezing the signatures — as an observation, not a revived obligation'; reads still take no `tx` and no test covers the corner (no grep hit for an isolation test).

**Is the closing act code?** `partial` (effort S). Decision at the 1.0 store-freeze session. If it rules a read must see only committed state under a caller tx: add an optional `tx?` to the read methods in packages/record/src/store/store.ts and packages/store-postgres/src/postgres-store.ts plus a conformance-suite case; otherwise a one-line note in the store header. Default outcome is docs-only.

**Release tie.** `documented-post-0.1` — docs/analysis/2026-08-20-committed-read.md:50-52 hands it to 'The 1.0 store-freeze session (the open-items plan's stage 6)'; docs/process/open-items-plan.md:238 stage 6 is 'Post-0.1 work'; docs/superpowers/specs/2026-08-19-store-postgres-design.md:258-260 'no committed-read surface ... stays so'.

**Risk if 0.1 ships with it open.** A host that issues `readChain` on the same connection inside its own open transaction could see its uncommitted appends; the documented flow never enters that corner because reads take no tx (docs/analysis/2026-08-20-committed-read.md:47-49).

### 43. No coverage metric — two named re-look triggers

`no-coverage-metric-triggers` · merged from 1 reader finding(s) · readers' guess: decision / pre-1.0

**What is open.** No coverage tooling by decision; kept open by (1) the stage-6 can-fail session possibly adopting branch coverage one-off and (2) a shipped regression a coverage number would plausibly have flagged.

**Where documented.** `docs/analysis/2026-08-20-small-postures.md:71-75`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "the stage-6 can-fail design session may adopt branch coverage as a one-off discovery aid for unexecuted failure arms" — `docs/analysis/2026-08-20-small-postures.md`

**Still open?** `partial` — The posture itself is CLOSED by ruling: docs/analysis/2026-08-20-small-postures.md:10-21 'now deliberate rather than silent' and docs/process/open-items-plan.md:141 is ticked. No coverage config exists (grep of package.json/vitest configs for c8/istanbul/coverage returns nothing). What stays open is only the two named re-look triggers (small-postures.md:17-21), neither of which has fired: no stage-6 can-fail session has run (open-items-sessions.md:99-101, :125) and no shipped regression is recorded.

**Is the closing act code?** `partial` (effort S). Only if a trigger fires: add `@vitest/coverage-v8` as a devDependency and a one-off `vitest --coverage --coverage.reporter=text` invocation (or a `coverage` script in the root package.json) scoped to packages/record/src/probes to list unexecuted failure arms; otherwise nothing to do.

**Release tie.** `documented-post-0.1` — docs/analysis/2026-08-20-small-postures.md:18-21 ties the first trigger to 'the stage-6 can-fail design session', which docs/process/open-items-sessions.md:125 says opens after 0.1; the second trigger is event-driven with no cut tie.

**Risk if 0.1 ships with it open.** None new: the missing metric is a recorded posture; the underlying blind spot (eleven probes never proven able to fail) is separately recorded at docs/process/open-items-plan.md:244-250.

### 44. Fail-close cure path for the non-declaring same-id instance (C2) — pair may strand

`fail-close-cure-path-non-declaring-instance` · merged from 1 reader finding(s) · readers' guess: mixed / unclear

**What is open.** Under fail-close a bound record finalized by a non-declaring instance refuses policy-drift but that instance cannot supply opts.policy; SHOULD-list-terminal guidance is scoped to declaring profiles. Decide: extend guidance, terminal by construction, or state the operator must restore the declaring profile. Only the cost is recorded.

**Where documented.** `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md:1284`; `docs/superpowers/specs/2026-08-16-policy-drift-design.md:24-25`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Decide: extend the guidance to the non-declaring case, make the refusal terminal by construction, or state that the operator must restore the declaring profile." — `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md`

**Still open?** `partial` — C2's three-way decision (docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md:1284) was never recorded as such — no process doc mentions a cure path (grep for "cure path"/"restore the declaring" hits only the plan and design doc). What IS recorded: the cost, "a host retiring a policy source must re-open old records" (docs/superpowers/specs/2026-08-16-policy-drift-design.md:24; packages/record/src/kernel/finalize.ts:336-337; docs/process/implementation-status.md:437). Mechanically the strand is bounded: config.ts:166-175 accepts any registry code in ANY leg's `terminalRefusals` (no declaring-only restriction), so a non-declaring leg CAN list `policy-drift` and go terminal via refuseMaybeAppend (finalize.ts:338, :798); otherwise the record stays open, pair held, bounded by the leg's `expiry.ttl` (implementation-status.md:440 argues the same for unsatisfiable kinds). But the SHOULD guidance stays declaring-scoped (SPEC.md:912-917; SPEC.md:550; finalize.ts:358) and no test pins the non-declaring+terminalRefusals shape (policy-drift.test.ts:159-164 tests the declaring leg only; :293-308 tests the default no-append path).

**Is the closing act code?** `partial` (effort S). If ruled 'extend the guidance': add one test in packages/record/test/policy-drift.test.ts pinning a non-declaring same-id leg with `terminalRefusals: ['policy-drift']` finalizing a bound record to a terminal refused edge, plus a comment at finalize.ts:330-339 and a guide note (docs/guide/integrating.md or faq.md). If ruled 'terminal by construction': change finalize.ts:338 to bypass `refuseMaybeAppend`'s terminalRefusals check for the reverse arm (a behavior change to the refusal matrix; SPEC §8 default-open would then need a sanctioned edit). If ruled 'operator must restore the declaring profile': docs-only. Extending SPEC's SHOULD text itself is sealed (docs/concept/SPEC.md:912-917) and needs a fresh sanction.

**Release tie.** `documented-post-0.1` — No deferral-register row, release-checklist line, next-phases entry, or open-items-plan checkbox carries C2; the adoption plan (docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md:1282-1284) framed it as a pre-Phase-6 owner decision and Phase 6 landed with only the cost recorded (implementation-status.md:437). The behaviour is disclosed (cost stated in code comment and status record) and the register does not tie it to the cut.

**Risk if 0.1 ships with it open.** An operator who drops `policySource` from a same-id profile with bound records open would see `policy-drift` refusals with no documented recovery for THAT profile shape — they would have to discover on their own that listing `policy-drift` in the non-declaring leg's `terminalRefusals` (or waiting out `expiry.ttl`) releases the `(profile, subject)` pair.

### 45. Decide whether the GOVERNED unknown-option-key message head is a byte contract (row 7 corrected, not satisfied)

`governed-message-head-pin-decision` · merged from 3 reader finding(s) · readers' guess: decision / unclear

**What is open.** `governedUnavailable` serves four generic unknown-key throw sites; its 'GOVERNED feature not available' head is asserted by no test and the 'must not diverge again' count is a maintenance rule. Whether to pin, reword or retire the GOVERNED wording is undecided.

**Where documented.** `docs/process/implementation-status.md:2076-2082`; `docs/superpowers/specs/2026-08-22-truth-repairs-design.md:87-90`; `docs/superpowers/plans/2026-08-22-truth-repairs.md:258`; `docs/superpowers/specs/2026-08-22-byte-regression-pins-design.md:146-149`; `packages/record/src/config.ts:98-121,608-609`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "row 7 is corrected, not satisfied" — `docs/process/implementation-status.md`
- "Whether this head SHOULD be byte-preserved is a decision about the GOVERNED message contract and is out of scope here" — `docs/superpowers/plans/2026-08-22-truth-repairs.md`

**Still open?** `yes` — packages/record/src/config.ts:99-106 at HEAD says the head 'is NOT pinned by any test ... Ordinary prose, not a byte contract'; the only test references are the header comment and two `assert.doesNotMatch` negatives (packages/record/test/construction-validation.test.ts:4,83,378) — no positive match exists (grep for the head in test/ finds only those). implementation-status.md:2076-2082 records 'row 7 is corrected, not satisfied'; truth-repairs design :87-90 defers the byte-preservation decision; byte-regression-pins design :146-149 rules it 'not a chain byte' and out of that increment. Note the byte-regression-pins design's claim that 'config.ts still claims the head is pinned' (:148) is STALE — config.ts:99-101 was corrected by truth-repairs b5ea416 — but the decision itself remains untaken. Also the docs' 'must not diverge again' count (config.ts:608-609) is a maintenance rule, not a gate, as framed.

**Is the closing act code?** `partial` (effort S). A decision with three exits: (a) pin — add a positive `assert.match(err.message, /^GOVERNED feature not available in this build \(/)` at one of the four unknown-key sites (open()/finalize()/decline()/validateRedeemOptions) in packages/record/test (e.g. construction-validation.test.ts or decline.test.ts) and flip config.ts:99-106 to say it is pinned; (b) reword — since zero fields are governed, rename the head to an unknown-option-key message in config.ts:119-121 and sweep the four callers plus the two doesNotMatch negatives and docs (CLAUDE.md, implementation-status prose); (c) record 'unpinned by choice' — docs only. Exits (a) and (b) spawn small code; (c) does not.

**Release tie.** `documented-post-0.1` — No cut tie in the records: deferral-register.md and release-checklist.md do not mention the GOVERNED head; truth-repairs design (docs/superpowers/specs/2026-08-22-truth-repairs-design.md:87-90) parks it 'with that question' without naming a trigger. Weak pre-0.1 argument exists because the message text becomes a public error string once published and SPEC §9.1's wording is cited in config.ts:98-100, but the repo has ruled it 'ordinary prose, not a byte contract' (config.ts:105-106), so it need not gate the cut.

**Risk if 0.1 ships with it open.** An adopter matching on the 'GOVERNED feature not available in this build' error text could have it reworded under them in a patch release with no test failing, and the head names a 'GOVERNED feature' at sites that are really unknown-option-key errors.

### 46. node:sqlite 24.15 warning boundary bracketed, not measured; runner Node 24 assumed >= 24.15; 25.x unmeasured

`node-24-15-warning-boundary-bracketed` · merged from 3 reader finding(s) · readers' guess: code / horizon

**What is open.** Public sentences rest on Node's release note plus two legs (22.16.0 warns, 24.19.0 silent); no run at the boundary; the workflow relies on the image resolving `24` above 24.15 rather than pinning.

**Where documented.** `docs/process/implementation-status.md:3493-3503`; `docs/analysis/2026-08-29-first-use-proof.md:95-99`; `.github/workflows/first-use.yml:10-11,63-64`; `packages/record/README.md:26-31`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "This run measures two points, one either side of the boundary; it does not measure the boundary" — `docs/analysis/2026-08-29-first-use-proof.md`
- "resolves to >= 24.15, where the import MUST NOT warn" — `.github/workflows/first-use.yml`

**Still open?** `yes` — docs/analysis/2026-08-29-first-use-proof.md:95-99 'This run measures two points, one either side of the boundary; it does not measure the boundary ... Nor does the run say anything about the 25.x line'; docs/process/implementation-status.md:3499-3503 the 24.15 boundary 'bracketed by the two measured legs ... never at the boundary'; .github/workflows/first-use.yml:63-64 pins `node: 24` with the comment 'resolves to >= 24.15' rather than a patch; :3524-3527 records that a runner image resolving 24 below 24.15 'would falsify the public sentence and be caught only at the next dispatch'. packages/record/README.md:26-31 and the guide carry the 24.15 sentence on Node's release-note account. Nothing later re-measures it.

**Is the closing act code?** `partial` (effort S). If the owner wants the boundary measured rather than bracketed: add a matrix entry `node: 24.15.0` with `expect_warning: 'false'` (and optionally `24.14.x` with 'true') to .github/workflows/first-use.yml:60-64 and dispatch once, recording the result in a dated docs/analysis/ record; if left bracketed, no repo change — the public sentences already state the basis.

**Release tie.** `documented-post-0.1` — docs/process/release-checklist.md:89-91 requires only that the floor rule be re-evaluated 'on the day against the Node lines THEN'; :144-150 re-dispatches the same two-point matrix against the registry. The boundary itself is recorded as an accepted bound (docs/process/implementation-status.md:3499-3503) and no checklist box or register trigger asks for a boundary run.

**Risk if 0.1 ships with it open.** If Node's release note were wrong about 24.15, packages/record/README.md:26-31 and docs/guide/integrating.md would mis-state which Node lines print the ExperimentalWarning; a runner image drifting below 24.15 fails the `24` leg loudly only when someone dispatches.

### 47. @types/node ^26 while engines floor is Node 22.16

`types-node-26-vs-floor` · merged from 1 reader finding(s) · readers' guess: decision / unclear

**What is open.** An API in 26 types but absent at 22.16 typechecks and fails only on the exact-floor CI leg.

**Where documented.** `package.json:5-7,23`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- ""@types/node": "^26.2.0"" — `package.json`

**Still open?** `uncertain` — Fact confirmed at HEAD: package.json:5-7 declares engines `>=22.16` and package.json:23 `"@types/node": "^26.2.0"`; both manifests repeat the floor. Mitigation already exists: the CI matrix runs the exact floor (ubuntu @ 22.16.0, docs/analysis/2026-08-19-phase-3-ci.md:10-15, .github/workflows/ci.yml) and open-items-plan.md:~312 records 'the CI matrix's exact-floor-on-ubuntu-only bound (phase-3 ruling 1, deliberate)'. No repo document names the @types/node major vs floor mismatch itself (grep of docs/process, docs/analysis, CHANGELOG, .github, scripts finds no '@types/node' mention; the only history is commit 078adf4 adding it). The item is a real latent hazard but is not a recorded open item.

**Is the closing act code?** `partial` (effort S). If taken as a tightening: pin root devDependency `@types/node` to the floor major (`^22.x`) in package.json:23 (Dependabot's weekly group at .github/dependabot.yml would then need an ignore rule for that package's majors), so an API absent at 22.16 fails typecheck rather than only the floor CI leg. If declined: record that the exact-floor CI leg is the deliberate runtime gate (extending phase-3 ruling 1's rationale in a docs/analysis posture note). Either way, no src change.

**Release tie.** `documented-post-0.1` — release-checklist.md:71-93 covers the Node floor only as the `node:sqlite` stability rule (evaluated 2026-08-29, did not fire) and says nothing about type declarations; phase-3-ci.md:10-15 treats the exact-floor test job as the floor's gate. Nothing ties the types major to the cut, and the runtime gate already exists, so it is a hygiene follow-up.

**Risk if 0.1 ships with it open.** Nothing at 0.1 itself (the exact-floor CI leg runs test+build+smoke on 22.16.0); the exposure is future: a contributor may use a Node 24/26-only API that typechecks locally and is caught only by the floor leg's runtime failure, later in the loop.

### 48. facts.figures bypasses the adopter canonicalizer — build's reading of SPEC §3

`reading-facts-figures-canonicalizer` · merged from 2 reader finding(s) · readers' guess: decision / horizon

**What is open.** Figures go through library JCS only; SPEC §3 is silent on the figures path. Recorded reading.

**Where documented.** `docs/process/implementation-status.md:370`; `packages/record/src/kernel/finalize.ts:495-500`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "`facts.figures` goes through library JCS only, never the adopter canonicalizer" — `docs/process/implementation-status.md`

**Still open?** `yes` — packages/record/src/kernel/finalize.ts:495-500 still carries the comment "this build's reading of SPEC §3's ownership split... does not name the figures path"; docs/process/implementation-status.md:370 records it as "a reading rather than a transcription". No register row, checklist item, or open-items-plan checkbox mentions figures canonicalization (grep of docs/process/next-phases.md, open-items-plan.md, deferral-register.md, docs/guide returns nothing). It is a recorded reading, not a defect; 'open' only in the sense that the spec is silent.

**Is the closing act code?** `partial` (effort S). Closing act is either a SPEC §3 clarification (sealed edit, fresh sanction, no code) or standing acceptance recorded in the guide (docs/guide/integrating.md — a sentence that `facts.figures` is canonicalized by library JCS only). Only if a ruling went the other way (adopter canonicalizer applies to figures) would code move: `isValidFacts`/gate (5) and the facts-consultation digest in packages/record/src/kernel/finalize.ts, which would also move the pinned finalize digests in tests (byte-stability is frozen — a fork-level change, effectively not available).

**Release tie.** `documented-post-0.1` — No document ties it to 0.1: absent from docs/process/release-checklist.md, deferral-register.md, and open-items-plan.md stages 4–5. implementation-status.md:370 records it as settled reading 'stated at its site'.

**Risk if 0.1 ships with it open.** A second implementation reading SPEC §3 might route figures through its adopter canonicalizer and produce a non-matching facts consultation digest for the same record; a 0.1 adopter using this library alone is unaffected.

### 49. `consultation-missing` has two producers indistinguishable from the appended edge

`consultation-missing-two-producers-unobservable` · merged from 1 reader finding(s) · readers' guess: decision / horizon

**What is open.** Rung 5 facts check and rung 5.5 missing required kind are governed identically; an auditor cannot tell which fired.

**Where documented.** `docs/process/implementation-status.md:384`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "which one fired is unobservable from the appended edge alone" — `docs/process/implementation-status.md`

**Still open?** `yes` — docs/process/implementation-status.md:384: `consultation-missing` 'now has TWO producers ... both `terminalRefusals`-governed the identical way, so which one fired is unobservable from the appended edge alone'. Rung (5) facts check and rung 5.5 missing-required-kind check both live in packages/record/src/kernel/finalize.ts and emit the same code today. No register row, checklist item, open-items-plan checkbox, or next-phases entry proposes distinguishing them (grep 'two producers'/'unobservable' across those files hits only an unrelated 2026-08-03 analysis line). It is a recorded observability bound, not a tracked defect.

**Is the closing act code?** `partial` (effort S). If ever ruled worth closing, code: either mint a distinct code (e.g. a required-kind-missing code) in packages/record/src/refusal-codes.ts plus its `appendsOn`/class map, or add a discriminating `reason`/detail field to the refused edge payload in kernel/finalize.ts's rung 5.5 arm, with tests in the finalize/consultation test files and docs/guide/api-reference.md's refusal table. Minting a new code collides with SPEC §8's sealed registry (SPEC.md:570) — so the realistic path is standing acceptance (docs-only) unless a sanction is sought.

**Release tie.** `documented-post-0.1` — Nothing ties it to 0.1 — not in release-checklist.md, deferral-register.md, next-phases.md, or open-items-plan.md; implementation-status.md:384 records it as a known bound of the ladder, and any new code would need a SPEC §8 revision (sealed), placing it with the 1.0 review at best.

**Risk if 0.1 ships with it open.** An operator auditing a `consultation-missing` refusal cannot tell from the chain whether the facts consultation was absent or a required kind was missing, and must consult host logs.

### 50. No general inert/contradictory feature-combination check (SPEC §9.1)

`no-general-inert-combination-check` · merged from 1 reader finding(s) · readers' guess: code / unclear

**What is open.** Only specific structural validators exist; could close by decision that they are the whole of §9.1's intent.

**Where documented.** `docs/process/implementation-status.md:420`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- ""inert or contradictory feature combinations" is not implemented as a general check" — `docs/process/implementation-status.md`

**Still open?** `partial` — The implementation-status cell is partly STALE: docs/process/implementation-status.md:420 says 'a malformed `terminalRefusals` member is neither rejected nor ever matched', but packages/record/src/config.ts:160-176 (`validateLeg`) now throws for any non-registry `terminalRefusals` member, landed at commit 43fc17e ('terminalRefusals validates at construction (SPEC §9.1's "inert or contradictory feature combinations are construction errors")'). What remains true is only the framing: there is no single general combination check — §9.1 is enforced as named structural validators (`validateSodShape`, `validateRequiredConsultations`, eligibility double-declaration, `validateFreshness`, `validateLiveCapture`, the terminalRefusals loop; config.ts:155-182 and implementation-status.md:420,423). No register row, next-phases entry or open-items-plan stage tracks a remaining named inert combination; open-items-plan's appendix lists only 'freshness gating inert at AL1 by construction' as a recorded limit (docs/process/open-items-plan.md:306). Uncertain whether any concrete unchecked combination is still known.

**Is the closing act code?** `partial` (effort S). If closed by ruling that the per-feature validators are the whole of §9.1's intent: docs-only — correct the stale 'neither rejected' clause in docs/process/implementation-status.md:420 (row 9.1 Not-built column). If a specific unchecked inert combination is identified: add a validator in packages/record/src/config.ts's `validateProfile`/`validateLeg` with a construction-error test in packages/record/test (config/refusal-matrix tests).

**Release tie.** `documented-post-0.1` — Not named in docs/process/deferral-register.md, release-checklist.md, next-phases.md, or open-items-plan stages 4/5; it lives only in implementation-status's row 9.1 Not-built column (implementation-status.md:420). The stale clause is an accuracy defect in the authoritative status record, worth fixing whenever that document is next touched, but no source ties it to the cut.

**Risk if 0.1 ships with it open.** An adopter reading implementation-status row 9.1 would believe a misspelled terminalRefusals member constructs silently, when the build actually throws — a false understatement of the guard, not a runtime hazard.

### 51. Checker identity not exact-shaped; extra keys reach the digested payload

`checker-extra-keys-recorded-verbatim` · merged from 1 reader finding(s) · readers' guess: decision / horizon

**What is open.** Unknown keys inside a supplied checker object are recorded verbatim as host attestation; same posture as actor and facts.checker.

**Where documented.** `packages/record/src/kernel/consultations.ts:135-141`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- Extra keys inside a supplied checker object are not rejected; they reach the digested payload as host attestation

**Still open?** `partial` — packages/record/src/kernel/consultations.ts:135-140 still says checker is 'not, in turn, exact-shaped' and extra keys 'reach the digested payload as host attestation'; isValidIdentity at packages/record/src/kernel/finalize.ts:894 checks only principal/authority. But the same comment frames this as a settled 'recorded posture' shared with actor and facts.checker 'since the kernel increment' (consultations.ts:137-138) — it is a documented bound, not an item any register row, open-items-plan checkbox, or next-phases section tracks (no hit in docs/process/open-items-plan.md or next-phases.md for 'exact-shape'/'extra key').

**Is the closing act code?** `partial` (effort S). Only if someone rules the posture wrong: add an exact-shape key loop for identity objects in isValidIdentity (packages/record/src/kernel/finalize.ts:894) or a wrapper used at consultations.ts:141, finalize.ts:306, decline.ts:140, findings-seams.ts:117, plus refusal/throw tests in packages/record/test (consultation-attach and construction-validation suites). Ruling it intended = a one-line comment/guide note at most. Note: tightening would not move frozen byte-stability digests only if the pinned fixtures carry no extra keys — verify before touching.

**Release tie.** `documented-post-0.1` — No cut tie anywhere: not in docs/process/release-checklist.md, deferral-register.md rows 1/19/22, or open-items-plan.md stages 4/5. It is a code-comment bound only (consultations.ts:135-140); at most a public-surface tightening a 1.0 review of the identity shape would weigh.

**Risk if 0.1 ships with it open.** A host passing a checker object with stray keys gets them silently digested into the record as attestation rather than a caller-error throw, unlike every other consultation-entry field.

### 52. Cut: decline-reason as optional payload digest field — recovery path

`cut-decline-reason-payload-digest` · merged from 2 reader finding(s) · readers' guess: mixed / horizon

**What is open.** Reasons ride as consultations; a present-iff-present digest on the declined payload is the fallback (would touch SPEC §4's row).

**Where documented.** `docs/process/implementation-status.md:1486-1488`; `docs/superpowers/specs/2026-08-20-recorded-human-decline-design.md:207-209`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "the payload can gain an optional digest field later without moving any existing chain" — `docs/process/implementation-status.md`

**Still open?** `partial` — A recorded cut with a fallback, not open work: docs/process/implementation-status.md:1486-1488; design doc 2026-08-20-recorded-human-decline-design.md:207-209 'should the consultation vehicle prove wrong'. The chosen vehicle is live and documented: docs/guide/api-reference.md:187 and docs/guide/integrating.md:183 ('decline-reason' consultation kind); implementation-status.md:1437. Not tracked by any register row or open-items-plan checkbox.

**Is the closing act code?** `partial` (effort S). Only if the consultation vehicle proves wrong: fresh sanction to edit SPEC §4's declined payload row, then add an optional reasonDigest to the declined payload in packages/record/src/kernel/decline.ts and types.ts, replay fold in chain/replay.ts, present-iff-present tests in packages/record/test/decline*.test.ts; byte-stability pins untouched because the field is absent on existing chains.

**Release tie.** `horizon` — Fallback is conditional on field evidence after adoption (implementation-status.md:1488); the working recipe ships in the guide (integrating.md:183); no cut-facing document names it.

**Risk if 0.1 ships with it open.** An adopter records decline reasons as attached consultations, digested but not part of the declined payload itself; nothing is lost, only the shape differs from a dedicated field.

### 53. Re-open the ruling that declined `SignatureStore.remove` (no contract way to vacate an association)

`signaturestore-remove-ruling` · merged from 4 reader finding(s) · readers' guess: decision / post-0.1

**What is open.** SignatureStore is {put, listByRecord}; the sidecar-contract design's first ruling declined a remove/prune method, so the library never prunes and deletion (needed by fixtures and by host pruning) sits outside the contract. Prune-at-seal's design must re-open the ruling explicitly.

**Where documented.** `docs/process/deferral-register.md:13`; `docs/process/implementation-status.md:2918,3316-3320`; `packages/record/src/signing/store.ts:29-41`; `packages/record/src/signing/memory.ts:35-45`; `packages/record/test/signing-enforce.test.ts:127-131`; `docs/superpowers/specs/2026-08-24-sidecar-contract-design.md:174-175`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "it needs a `remove` on the provisional `SignatureStore`, which the sidecar-contract increment's first ruling declined" — `docs/process/deferral-register.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- The library performs no pruning, and this surface is never told which entries are dead

**Still open?** `yes` — packages/record/src/signing/store.ts:41-49 — interface is still {put, listByRecord}; store.ts:36-39 says `MemorySignatureStore` ships a `delete` "explicitly NOT part of this contract" (memory.ts:35-45). implementation-status.md:3330-3333 (sidecar-orphans-report exit): "a `remove` or prune method on `SignatureStore`" stays outside; deferral-register.md:13: "Its design, if ever, must re-open that ruling explicitly." Sidecar-contract design ruling 1 still stands (2026-08-24-sidecar-contract-design.md:174-175).

**Is the closing act code?** `partial` (effort M). The item itself is a ruling: whether to add `remove(transitionDigest)` to `SignatureStore` (store.ts:41-49). Taken 'yes', it adds one method to the provisional interface, promotes `MemorySignatureStore.delete` into the contract (memory.ts:35-45), updates docs/guide/api-reference.md:486-498 and integrating.md, and enables prune-at-seal in kernel/finalize.ts seal path with pins; taken 'no' (current ruling), nothing changes. Also gated on a durable backing to measure against (deferral-register.md:13).

**Release tie.** `horizon` — deferral-register.md:13 gates prune-at-seal (and thus the re-opened ruling) on "a durable `SignatureStore` backing existing to measure against"; implementation-status.md:3301-3302 and release-checklist.md:206-209 record the third horn/prune-at-seal as "identified, not built" and the expected release-day ruling is carry forward (release-checklist.md:210-219). No document asks for a remove method at the 0.1 cut; SignatureStore is provisional pre-1.0 (store.ts:26-27, open-items-plan.md:257-262).

**Risk if 0.1 ships with it open.** A 0.1 adopter with a durable sidecar has no library primitive to delete orphans and must implement pruning against the chain in their own backing, as the contract already tells them.

### 54. No operator-assurance probe covers sidecar orphan reporting (needs sealed CONTROLS §4 edit)

`no-probe-for-orphan-reporting` · merged from 2 reader finding(s) · readers' guess: decision / horizon

**What is open.** Probe targets quote sealed CONTROLS §4 verbatim and none describes sidecar reporting; adding a probe needs a fresh sanction, declined per the design's fifth ruling. The report's honesty is proved only in tests.

**Where documented.** `docs/process/implementation-status.md:3323-3327`; `docs/superpowers/specs/2026-08-29-sidecar-orphans-report-design.md:75`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "none of the seventeen targets in `packages/record/src/probes/probes.ts` describes sidecar reporting" — `docs/process/implementation-status.md`

**Still open?** `yes` — docs/process/implementation-status.md:3323-3327 ("no probe covers it ... none of the seventeen targets in packages/record/src/probes/probes.ts describes sidecar reporting"); docs/superpowers/specs/2026-08-29-sidecar-orphans-report-design.md:74-76 (ruling 5, "No probe"); packages/record/src/probes/probes.ts has zero hits for 'orphan' beyond the comment at :867 (grep), confirming no probe target consumes SignatureReport.orphans. Nothing in git log after a81c7e5/4e3e833 adds a probe.

**Is the closing act code?** `partial` (effort M). Only if a fresh SCOPING-GUIDE §§1-2 sanction adds a sidecar-reporting cell to sealed docs/concept/CONTROLS.md §4 would code follow: a new probe target in packages/record/src/probes/probes.ts (quoting the new §4 text verbatim, per the tier's convention), a counterpart driver hook in probe types, and a pin in packages/record/test/probes*.test.ts (plus a can-fail broken-driver case). Without the sanction the item is a recorded decision with no build consequence; the design explicitly declined it (2026-08-29-sidecar-orphans-report-design.md:74-76).

**Release tie.** `horizon` — No deferral-register row, no release-checklist item, and no open-items-plan checkbox names it; the sidecar-orphans-report design ruled it out by scope (docs/superpowers/specs/2026-08-29-sidecar-orphans-report-design.md:74-76) and any probe addition requires a sealed-set sanction (CLAUDE.md 'What a working agent must not do'). Adjacent probe work (can-fail discipline, deeper-driver shapes) sits in open-items-plan.md Stage 6 (post-0.1, :238-256), so this belongs at or beyond that horizon.

**Risk if 0.1 ships with it open.** An operator running the self-test tier gets no probe-level assurance that verifySignatures().orphans is honest; the only proof is the in-repo test corpus, which the operator does not run against their own host.

### 55. Signer-result memo: same-object assumption enforced by convention; WeakMap GC property unassertable

`signer-memo-assumptions-unenforced` · merged from 4 reader finding(s) · readers' guess: code / horizon

**What is open.** 22b's closure depends on today's two repeat-object paths handing the same transition object to each attempt; a new path rebuilding per attempt would re-mint and only pins notice. Non-mutation between attempts is stated in a pin and a comment, not types; memo memory growth is unmeasurable.

**Where documented.** `docs/process/implementation-status.md:3114-3117`; `packages/record/src/signing/decorate.ts:54-61`; `packages/record/test/no-edge-containment.test.ts:489-493`; `packages/record/test/no-edge-containment.test.ts:532-536`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "a future path that rebuilt its transition per attempt would mint per attempt again, and nothing but this file's pins would notice" — `docs/process/implementation-status.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- Nothing in the type system prevents the mutation; this pin and the comment at the memo are what state the assumption.

**Still open?** `yes` — packages/record/src/signing/decorate.ts:54-61 (the memo comment: 'nothing in the type system enforces them', WeakMap 'has no size ... so no test asserts it'); packages/record/test/no-edge-containment.test.ts:489-493 and :532-536 (the two pins stating the assumptions); docs/process/implementation-status.md:3114-3117 ('a future path that rebuilt its transition per attempt would mint per attempt again, and nothing but this file's pins would notice'). Nothing later (git log through 4e80bf7) changes decorate.ts or adds a type-level guard.

**Is the closing act code?** `partial` (effort M). Closing structurally would mean code: e.g. a readonly/frozen Transition (Object.freeze at build sites in kernel/*.ts and a Readonly<Transition> type on appendTransition), or a digest-at-first-mint check in decorate.ts that throws on mutation, plus test updates; but the design chose the by-convention posture deliberately and the pins already fail closed on the hazard. As it stands the item is a recorded bound with no owed change; the WeakMap GC property is unassertable by construction and has no closing act at all.

**Release tie.** `horizon` — No register row, checklist item, or open-items-plan checkbox names it; docs/process/implementation-status.md:3114-3117 files it under 'The honest limit' of the no-edge containment increment (2026-08-29), and the store interface freeze (where a Readonly transition type would naturally ride) is open-items-plan.md Stage 6, the 1.0 gate (:257-262).

**Risk if 0.1 ships with it open.** A future kernel path that rebuilds its transition per CAS attempt silently regains one signer mint per attempt (a cost regression, not a soundness one); a mutated-between-attempts transition is caught fail-closed by verification, so no unsound record can result.

### 56. listDue/findNonTerminal return recordIds, narrowing SPEC §12's 'records due'

`listdue-findnonterminal-return-ids-narrowing` · merged from 2 reader finding(s) · readers' guess: decision / pre-1.0

**What is open.** Both reads return id strings where SPEC §12 describes records; recorded narrowing, not reconciled, and an input to the 1.0 freeze.

**Where documented.** `docs/process/implementation-status.md:442`; `packages/record/src/store/store.ts:192-216`; `packages/record/src/store/store.ts:118-121`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "NARROWED from SPEC §12, which says this returns the records due." — `packages/record/src/store/store.ts`

**Still open?** `yes` — packages/record/src/store/store.ts:196-200 and 210-216 still carry 'NARROWED from SPEC §12' on both reads returning string / string|null; docs/process/implementation-status.md:442 'The narrowings stand as before (`listDue` and `findNonTerminal` return recordIds)'; docs/process/open-items-plan.md:259-261 folds 'SPEC §12's sweep-signature provisionality' into the unticked 1.0 freeze item. Nothing in git log or CHANGELOG reverses the narrowing; it is a recorded, argued divergence with no register row (implementation-status.md:442 'carries no register row').

**Is the closing act code?** `partial` (effort M). Absorbed by the 1.0 freeze ruling. If the freeze ratifies ids, closing is docs-only (OPEN-QUESTIONS §9 Decided tail under sanction; SPEC §12's 'returns the records due' would stay a recorded narrowing unless SPEC is sanctioned to be edited). If the freeze restores records, code: change `listDue(now): Promise<string[]>` and `findNonTerminal(...): Promise<string|null>` in store/store.ts, all three backings (memory.ts, sqlite.ts, postgres-store.ts), store-conformance.ts pins at listDue/findNonTerminal cases, operator-surface.ts listDue passthrough, and docs/guide/api-reference.md.

**Release tie.** `documented-post-0.1` — docs/process/open-items-plan.md:257-262 (Stage 6 'Post-0.1 work'); implementation-status.md:442 records it as 'the spec's own shape rather than deferred work, so it carries no register row'; no release-checklist mention.

**Risk if 0.1 ships with it open.** An adopter reading SPEC §12 expects records from listDue/findNonTerminal and gets recordIds — a documented, doc-commented narrowing, so the hazard is surprise, not breakage.

### 57. SignatureStore/Signer/Verifier/SigningConfig shapes provisional pre-1.0

`signaturestore-shapes-provisional-pre-1-0` · merged from 2 reader finding(s) · readers' guess: decision / pre-1.0

**What is open.** The AL2 sidecar types follow the Store's provisional-signature discipline; no freeze decision exists.

**Where documented.** `docs/superpowers/specs/2026-08-17-al2-signing-mint-design.md:82-85,229-230`; `packages/record/src/signing/store.ts:26-27`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- Same provisional-signature discipline as the Store: behaviors stable, method shapes pre-1.0.

**Still open?** `yes` — packages/record/src/signing/store.ts:24-27 'Same provisional-signature discipline as the Store: behaviors stable, method shapes pre-1.0'; docs/superpowers/specs/2026-08-17-al2-signing-mint-design.md:229-230 'shapes are provisional pre-1.0 like every §12 surface'; docs/process/open-items-plan.md:261-262 'PUBLIC-BUT-UNSTABLE markings across the store, operator, probe, and signing surfaces stand' (unticked). Also deferral-register.md:13 (row 22) notes prune-at-seal 'needs a `remove` on the provisional `SignatureStore`, which the sidecar-contract increment's first ruling declined' — the shape is still explicitly moving-eligible.

**Is the closing act code?** `partial` (effort M). Not a standalone item — it rides the 1.0 store freeze (open-items-plan.md:257-262 names the signing surface in the same checkbox). If frozen as-is: doc-comment edits in signing/store.ts:24-27 and signing types. If the freeze adds `remove` (row 22's prune-at-seal, deferral-register.md:13) or reshapes Signer/Verifier/SigningConfig: code in packages/record/src/signing/*.ts, MemorySignatureStore, sidecar tests (sidecar-ordering.test.ts, no-edge-containment.test.ts), and api-reference.md.

**Release tie.** `documented-post-0.1` — docs/process/open-items-plan.md:238-262 (Stage 6, 'Post-0.1 work'); the al2 design :229-230 ties it to 'every §12 surface', whose freeze OPEN-QUESTIONS.md:132-133 calls 'a 1.0 gate'; release-checklist.md has no mention. Row 22 (deferral-register.md:13) gates the cut but concerns orphan growth, not the shape freeze.

**Risk if 0.1 ships with it open.** A host implementing a durable SignatureStore against 0.1 may need to adapt when the sidecar interface gains/changes methods (e.g. a `remove`) before 1.0.

### 58. `@vidimera/record/probes` shapes provisional pre-1.0

`probes-subpath-shapes-provisional-pre-1-0` · merged from 4 reader finding(s) · readers' guess: decision / pre-1.0

**What is open.** ProbeDriver, Waiver, ProbeReport, ProbeResult and runner signatures ship under the pre-1.0 provisional-shape discipline; id/target/detail strings are the contract, TypeScript shapes are not frozen.

**Where documented.** `docs/process/implementation-status.md:446`; `docs/concept/OPEN-QUESTIONS.md:95-99`; `docs/superpowers/specs/2026-08-18-self-test-tier-design.md:14-16,62-63,147`; `packages/record/src/probes/probes.ts:20-22`; `packages/record/src/probes/types.ts:2-4`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "versioned with the library under the store contract's own pre-1.0 provisional-shape discipline" — `docs/concept/OPEN-QUESTIONS.md`
- "behaviors stable, shapes provisional" — `docs/process/implementation-status.md`

**Still open?** `yes` — packages/record/src/probes/probes.ts:20-22 'Shapes here are PROVISIONAL pre-1.0 ... the TypeScript shapes around them are not frozen'; packages/record/src/probes/types.ts:2-4 same; docs/concept/OPEN-QUESTIONS.md:95-98 'versioned with the library under the store contract's own pre-1.0 provisional-shape discipline' (a Decided tail, so the DECISION to be provisional is closed — only the freeze itself remains); docs/process/open-items-plan.md:261-262 unticked, names 'probe' among surfaces whose markings stand. Related unticked sibling: open-items-plan.md:251-256 'deeper legs/chains are a pre-1.0 driver-shape question'.

**Is the closing act code?** `partial` (effort M). Rides the 1.0 freeze. If frozen as-is: doc-comment edits in probes/probes.ts:20-22, probes/types.ts:2-4. If the freeze reshapes ProbeDriver (e.g. deeper-leg/deeper-chain driver shapes per open-items-plan.md:251-256): code in packages/record/src/probes/types.ts (ProbeDriver, ProbeResult, ProbeReport, Waiver), probes.ts not-driven arms, the probes test suite, and docs/guide/api-reference.md (`./probes` subpath is outside the api-sync gate per the conformance ruling :61-62, so hand-verify).

**Release tie.** `documented-post-0.1` — docs/process/open-items-plan.md:238-262 (Stage 6 'Post-0.1 work'); OPEN-QUESTIONS.md:95-98 explicitly frames the provisionality as the decided 0.x posture; no release-checklist mention.

**Risk if 0.1 ships with it open.** An operator authoring a ProbeDriver against 0.1 may need to update driver/report types before 1.0; the id/target/detail string contract stays stable.

### 59. Versioning: lockstep for 0.x, independent versioning/changesets re-asked at 1.0; honest empty adapter CHANGELOG entry per cut

`versioning-lockstep-re-ask-changesets` · merged from 4 reader finding(s) · readers' guess: decision / pre-1.0

**What is open.** Both packages publish together; post-1.0 a breaking change in one would major the other, so independent versioning and per-package dispatch are deferred to the 1.0 re-ask. Changesets declined with a post-1.0 cadence trigger. Lockstep creates a standing obligation: any cut with no adapter changes carries an explicit 'no adapter changes' entry.

**Where documented.** `docs/analysis/2026-08-19-phase-2-packaging.md:38-40`; `docs/analysis/2026-08-20-versioning-mechanics.md:131-136,157-160,173-176`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Lockstep, for 0.x. ... The 1.0 store-interface freeze **re-asks** this question" — `docs/analysis/2026-08-20-versioning-mechanics.md`
- "the CHANGELOG says so plainly ("no adapter changes this cut; the version moves in lockstep") — an honest empty entry, never a silent one" — `docs/analysis/2026-08-20-versioning-mechanics.md`
- "Declined, with the trigger named: re-look if post-1.0 cadence ever makes hand-bumping error-prone" — `docs/analysis/2026-08-20-versioning-mechanics.md`

**Still open?** `partial` — The 0.x versioning question itself is CLOSED: docs/process/open-items-plan.md:133 ticks '[x] Multi-package versioning mechanics' and docs/analysis/2026-08-20-versioning-mechanics.md:15-20 rules 'Lockstep, for 0.x'; the closing acts landed (CHANGELOG.md:3-7 states the lockstep posture and the honest-empty-entry rule; docs/process/release-checklist.md:94-98 bumps both to 0.1.0). What remains open is only (a) the 1.0 re-ask ('The 1.0 store-interface freeze re-asks this question', versioning-mechanics.md:17; open-items-plan.md:257-262 stage 6 store freeze), (b) the changesets re-look trigger ('re-look if post-1.0 cadence ever makes hand-bumping error-prone', versioning-mechanics.md:57-60), and (c) the standing per-cut CHANGELOG obligation (versioning-mechanics.md:41-44) — which cannot be discharged at 0.1 since the adapter has changes at the first cut.

**Is the closing act code?** `partial` (effort M). The re-ask is a decision. If it rules independent versioning at 1.0, code follows: .github/workflows/release.yml needs per-package dispatch inputs or already-published skip logic (versioning-mechanics.md:24-31 names exactly this), plus a forked release-checklist bump item and possibly changesets tooling in the root package.json. Lockstep-continued spawns no code; the per-cut 'no adapter changes' entry is a CHANGELOG.md edit only.

**Release tie.** `horizon` — docs/analysis/2026-08-20-versioning-mechanics.md:17 ties the re-ask to 'The 1.0 store-interface freeze'; :47-48 says the cost 'cannot bite before 1.0'; open-items-plan.md:257 places the freeze in Stage 6 'The pre-1.0 program' (post-0.1). The 0.1 cut itself is fully covered by release-checklist.md:94-98.

**Risk if 0.1 ships with it open.** None at 0.1 — both packages carry real changes at the first cut and lockstep is the recorded, workflow-consistent posture; the cost only appears post-1.0 when a breaking change in one package majors the other.

### 60. AL2 rehoming residual: genesis profileId recompute to a non-signing profile — named, not closed

`al2-rehoming-residual` · merged from 5 reader finding(s) · readers' guess: mixed / pre-1.0

**What is open.** A whole-chain recompute rewriting the genesis profileId onto a registered non-signing profile yields a hash-intact chain the signature layer does not apply to, since the obligation keys on the genesis's own claim. verifySignatures reports signingDeclared:false; nothing refuses. Two closures named (signing-only registration; profileDigest-pinning tightening on SPEC §2's versioned-id convention), neither built; a 1.0-review consider, not a debt.

**Where documented.** `docs/process/open-items-plan.md:266-270`; `docs/process/open-items-sessions.md:279`; `docs/process/implementation-status.md:173`; `docs/process/implementation-status.md:445`; `docs/superpowers/specs/2026-08-17-al2-signing-enforce-design.md:61-70,124-126`; `packages/record/src/kernel/verify-signatures.ts:142-143`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "The rehoming residual is named, not closed" — `docs/process/implementation-status.md`
- "its two named closures — a deployment registering only signing profiles, or a profileDigest-pinning tightening — are candidates a 1.0 review should weigh, not debts" — `docs/process/open-items-plan.md`

**Still open?** `yes` — packages/record/src/kernel/verify-signatures.ts:154-155 still says 'The rehoming residual is named in the status doc: the obligation keys on the genesis's own profileId claim' and :162 returns `true` when `!signingDeclared`. docs/process/open-items-plan.md:266-270 lists it as an unticked stage-6 item ('consider, not owed'); docs/process/open-items-sessions.md:104-106 hangs it on the 1.0 store-freeze session. No commit in git log lands a profileDigest-pinning tightening or signing-only registration.

**Is the closing act code?** `partial` (effort M). If the 1.0 review chooses profileDigest pinning: bind a genesis `profileDigest` in kernel/open.ts and check it in `layerVerdicts` (kernel/verify-signatures.ts) before `signingDeclared`, with a new refusal code in refusal-codes.ts and enforcement tests; this touches SPEC §2/§14 semantics and so needs a fresh sealed-set sanction. If it chooses signing-only registration: a `validateProfile` rule in config.ts refusing mixed registries, plus tests. If the review keeps it as a documented limit: docs only.

**Release tie.** `documented-post-0.1` — docs/process/open-items-plan.md:238 places it under 'Stage 6 — The pre-1.0 program' ('Post-0.1 work'), :266-270 'candidates a 1.0 review should weigh, not debts'; docs/process/open-items-sessions.md:104-106 assigns it to the store-freeze session, which 'open[s] after 0.1' (:125).

**Risk if 0.1 ships with it open.** An adopter registering both signing and non-signing profiles could have a rehomed chain verify hash-intact with the signature layer silently not applying, though `verifySignatures` reports `signingDeclared: false` so a composed audit read sees it (docs/superpowers/specs/2026-08-17-al2-signing-enforce-design.md:69-70).

### 61. Horizon: in-repo examples host / consumer-shaped example (example packages need a purpose-trace)

`horizon-examples-host-consumer-example` · merged from 3 reader finding(s) · readers' guess: mixed / horizon

**What is open.** No examples package exists; a living host showing one approval flow end-to-end is a stage-7 candidate. The phase-6 agenda's consumer-shaped example was never ruled on (scripts/first-use.mjs is a proof script, not a documented example). Admitting example packages is a SCOPING-GUIDE scope decision.

**Where documented.** `docs/process/open-items-plan.md:286-289`; `docs/analysis/2026-08-18-release-phase-brainstorm.md:297-301`; `docs/superpowers/specs/2026-08-02-reference-implementation-adoption-design.md:186`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "a small living host showing one real approval flow end-to-end (staging, legs, consultations, a refusal, the audit read)" — `docs/process/open-items-plan.md`
- "admitting them is a scope decision requiring its own purpose-trace" — `docs/superpowers/specs/2026-08-02-reference-implementation-adoption-design.md`

**Still open?** `yes` — No examples package exists (ls packages/: record, store-postgres only; no examples/ dir). The in-repo examples host is an unchecked Stage 7 candidate at docs/process/open-items-plan.md:286-289. The phase-6 brainstorm agenda item (docs/analysis/2026-08-18-release-phase-brainstorm.md:297-301, "A consumer-shaped example ... an `examples/` package fires row 4; a documented scratch project does not") has no recorded ruling: the only later use of "consumer-shaped" is docs/superpowers/specs/2026-08-29-first-use-proof-design.md:66 describing a Postgres server, and docs/analysis/2026-08-29-first-use-proof.md never mentions an example. docs/superpowers/specs/2026-08-02-reference-implementation-adoption-design.md:186 keeps example packages "Not in scope ... a scope decision requiring its own purpose-trace". Partial mitigation exists: docs/guide/ carries executed snippets and scripts/first-use.mjs drives the getting-started flow end-to-end, but neither is a documented consumer example.

**Is the closing act code?** `partial` (effort M). If admitted: a new workspace package (e.g. examples/approval-host) wiring `create`, a Store, a profile with legs/consultations, one refusal, and the audit read, with a vitest or script run in CI; pnpm-workspace.yaml and ci.yml additions; guide cross-links. If declined or satisfied by 'documented scratch project': docs-only (a guide walkthrough), possibly promoting scripts/first-use.mjs into documented status.

**Release tie.** `horizon` — docs/process/open-items-plan.md:279-289 files it under "Stage 7 — The horizon"; docs/process/open-items-sessions.md:288-291 schedules no session; release-checklist.md has zero mentions of examples (grep count 0). The brainstorm agenda item (2026-08-18-release-phase-brainstorm.md:297-301) was a phase-6 idea, but the first-use proof (docs/analysis/2026-08-29-first-use-proof.md) discharged the release-side rehearsal without adopting an example package.

**Risk if 0.1 ships with it open.** A 0.1 adopter has only guide snippets and getting-started to learn composition; there is no runnable end-to-end host showing legs, consultations, a refusal and the audit read together — a learning-curve cost, not a correctness or safety gap.

### 62. OPEN-QUESTIONS §6: `unknown-staged`/`unknown-record` refusal codes not minted

`oq6-unknown-staged-unknown-record-unminted` · merged from 4 reader finding(s) · readers' guess: decision / horizon

**What is open.** Both stay loud caller-error throws (the decision of record); minting is additive if a real host hits the process-boundary case and would need a SPEC §8 revision through the sealed machinery.

**Where documented.** `docs/process/next-phases.md:307-310`; `docs/process/open-items-plan.md:272-274`; `docs/concept/OPEN-QUESTIONS.md:103-108`; `docs/concept/SPEC.md:9-11`; `docs/analysis/2026-08-19-phase-1-api-review.md:45-47`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Not minted; the caller-error posture is the decision of record." — `docs/process/next-phases.md`
- "Minting stays additive if a real host ever hits the process-boundary case §6 hypothesizes" — `docs/analysis/2026-08-19-phase-1-api-review.md`

**Still open?** `partial` — Still unminted against HEAD: grep of packages/record/src for 'unknown-staged'/'unknown-record' hits only comments describing the caller-error posture (packages/record/src/config.ts:704, kernel/open.ts:125, operator-surface.ts:118); no such code exists in packages/record/src/refusal-codes.ts. But it is a decided, dormant posture rather than open work: docs/analysis/2026-08-19-phase-1-api-review.md:45-47 ("OPEN-QUESTIONS §6 is ratified for 0.1"), docs/process/open-items-plan.md:272-276 ("Dormant, with named triggers — watched, not worked"), docs/process/next-phases.md:307-310, docs/concept/OPEN-QUESTIONS.md:103-108 ("the caller-error posture is the decision of record").

**Is the closing act code?** `partial` (effort M). Only if a real host hits the process-boundary case: add two codes to packages/record/src/refusal-codes.ts, route the throws in kernel/open.ts (unresolvable stagedRef) and the read seams (operator-surface.ts) to refusals, add tests, move docs/guide/api-reference.md — and revise SPEC §8's registry through a fresh sealed-set sanction. Otherwise nothing.

**Release tie.** `documented-post-0.1` — docs/analysis/2026-08-19-phase-1-api-review.md:45 ratifies the throw posture FOR 0.1; docs/process/open-items-plan.md:272-276 places it in the dormant/watched tail between Stage 6 and 7, trigger-gated on a real host report.

**Risk if 0.1 ships with it open.** An adopter calling across a process boundary gets a thrown caller error instead of a coded refusal for an unknown stagedRef/recordId — documented behavior, with minting additive later.

### 63. No gate covers SPEC §2 / docset enumeration drift; prose claims ungated; prose sweep needs its own increment

`enumeration-drift-no-gate-prose-sweep` · merged from 3 reader finding(s) · readers' guess: unclear / unclear

**What is open.** A new capability must move SPEC §2 enumerations, the publish-facing docset and §8 registry rows in its own increment, but no scan reads them; three past increments each escaped once. Nine of ten truth-repair rows were prose falsified by later blast radius. A prose sweep of SPEC/README/CHANGELOG/guide enumerations needs its own increment and, for sealed hits, a sanction.

**Where documented.** `docs/process/next-phases.md:376-396`; `docs/process/implementation-status.md:2044-2047`; `docs/superpowers/specs/2026-08-22-truth-repairs-design.md:104-107`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "no scan reads a SPEC §2 enumeration, the publish-facing docset, a §8 registry row, or a sealed honesty cell" — `docs/process/next-phases.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- prose claims that stay ungated by design (no comment-assertion machinery exists here to gate them)

**Still open?** `yes` — docs/process/next-phases.md:376-396 states it as a discipline-not-gate on the current tree ("no scan reads a SPEC §2 enumeration, the publish-facing docset, a §8 registry row, or a sealed honesty cell"); docs/process/implementation-status.md:2044-2047 ("prose claims that stay ungated by design"); docs/superpowers/specs/2026-08-22-truth-repairs-design.md:104-107 explicitly excludes the prose sweep and a rows-1-9 gate from that increment. No later gate landed: scripts/ holds only contract-scan, api-reference-sync, docs-index-sync, smoke-pack, first-use (git log for scripts/contract-scan.mjs ends at 49d720a with no enumeration check). Note the specific §2 escape (resultDigest) was closed by sanction (next-phases.md:390-393) — the remaining item is the missing gate/sweep, not that omission. Not listed in open-items-plan.md stages 4-7 at all (grep for 'enumeration'/'sweep' in docs/process/open-items-plan.md:190-298 is empty), so the repo treats it as a bound rather than a debt.

**Is the closing act code?** `partial` (effort M). If a gate is chosen: a new scripts/*.mjs (pattern of scripts/api-reference-sync.mjs) that cross-checks e.g. the refusal-code registry (packages/record/src/refusal-codes.ts) against SPEC §8 rows / docs/guide/concepts.md governed-controls list, wired into package.json and .github/workflows/ci.yml's checks job, plus a scripts/test/*.test.mjs. A prose sweep alone is docs-only, and any sealed hit (docs/concept/SPEC.md) needs a fresh sanction — so it is partly owner-decision.

**Release tie.** `documented-post-0.1` — No deferral-register row, no release-checklist.md line, and no open-items-plan.md stage entry names it; docs/superpowers/specs/2026-08-22-truth-repairs-design.md:104-107 defers it to 'its own increment' with no date; next-phases.md:376-396 classes it under disciplines that outlive the build order, i.e. a standing bound.

**Risk if 0.1 ships with it open.** An adopter could read a publish-facing enumeration (README, CHANGELOG, guide, SPEC §2/§8) that a future capability silently left under-inclusive — a stale-docs risk, not a behavior defect; three past escapes were all later caught by hand.

### 64. Markdown citations checked by no gate (line-wrap quote trap recurs)

`markdown-citations-no-gate` · merged from 3 reader finding(s) · readers' guess: unclear / horizon

**What is open.** contract-scan resolves citations only in TypeScript; every SPEC quote and section number in process/analysis/guide markdown rests on hand verification against a whitespace-collapsed copy. Either accept as bound or extend the resolver.

**Where documented.** `docs/process/implementation-status.md:2724-2741`; `scripts/contract-scan.mjs:2-4,123`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Markdown is citation-checked by nothing" — `docs/process/implementation-status.md`

**Still open?** `yes` — scripts/contract-scan.mjs:523-524 scopes citation resolution to trackedTypeScript ('*.ts','*.mts','*.cts'); markdown gets only the external-link/ADR/escaping-path checks (scripts/contract-scan.mjs:2-4). docs/process/implementation-status.md:2738-2741 ("Markdown is citation-checked by nothing ... not repeatable by a gate") and :2728-2732 record the trap recurring in a new form as of 2026-08-29. Git log on scripts/contract-scan.mjs shows no markdown-resolver commit after 7bebe02/634a906. CLAUDE.md itself states it as a standing bound.

**Is the closing act code?** `partial` (effort M). If extended: in scripts/contract-scan.mjs, run citationFindings over trackedMarkdown (line 523) with a whitespace-collapsing quote matcher and an exclusion for docs/concept/ self-citations; add fixtures to scripts/test/contract-scan.test.mjs. Risk: a large backlog of historical process/analysis quotes would go red at once, so an accept-as-bound decision is the other branch and spawns no code.

**Release tie.** `documented-post-0.1` — No register row, checklist line, or open-items-plan stage item names it; CLAUDE.md and implementation-status.md:2738-2741 treat it as a documented limit with a hand-verification discipline. Not release-gating.

**Risk if 0.1 ships with it open.** A wrong SPEC quote or section number in a guide/process document reaches adopters unnoticed; docs/guide is already declared derived-and-possibly-stale.

### 65. Seven exports and two options added after the 2026-08-19 API review are unreviewed by it

`post-review-exports-unreviewed` · merged from 1 reader finding(s) · readers' guess: decision / unclear

**What is open.** transitionDigest, GenesisPayload, isCompromiseCarveOut, isStateLeaving, stateOf, DeclineOptions, RedeemOptions plus `proposed`/`redeem.result` landed under the review's rules, not through it; no second pass scheduled.

**Where documented.** `README.md:157-160`; `docs/guide/integrating.md:6-9`; `docs/guide/api-reference.md:6-11`; `docs/guide/faq.md:110-113`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "the seven added since — the adapter-author helpers and the `DeclineOptions`/`RedeemOptions` bags — landed under the review's own rules rather than through it" — `README.md`

**Still open?** `yes` — README.md:157-160, docs/guide/api-reference.md:6-11, docs/guide/integrating.md:6-9 and docs/guide/faq.md:110-113 all state, in the same breath, that the seven names added after 2026-08-19 'landed under the review's own rules rather than through it' / 'are unreviewed by it'. Row 6 is retired (docs/process/next-phases.md:105-111) and no second pass exists anywhere: grep for 'second pass|re-review|second review|unreviewed' across docs/process/*.md, docs/analysis/2026-08-19-phase-1-api-review.md and CHANGELOG.md returns nothing; docs/process/release-checklist.md has no API-review box (grep 'api review' empty). docs/process/open-items-plan.md:128-132 only notes row 6 closed without ruling on the conformance-suite export question.

**Is the closing act code?** `partial` (effort M). Primarily a ruling: either (a) record a dated docs/analysis/ note ratifying the seven names (`transitionDigest`, `GenesisPayload`, `isCompromiseCarveOut`, `isStateLeaving`, `stateOf`, `DeclineOptions`, `RedeemOptions`) and the `proposed`/`redeem.result` options against the 2026-08-19 review's rules (no-unspellable-names, etc.) and drop the 'unreviewed' caveat from README.md:157-160, docs/guide/api-reference.md:6-11, integrating.md:6-9, faq.md:110-113; or (b) if the pass finds a rename, that spawns code in packages/record/src/index.ts plus the surfaces, tests, and docs/guide/api-reference.md via `pnpm api-sync`.

**Release tie.** `documented-post-0.1` — Every public sentence already documents the bound (README.md:157-160; docs/guide/api-reference.md:6-11), and docs/analysis/2026-08-18-release-phase-brainstorm.md:306-308 frames 0.1's promise as 'names may still move before 1.0'; the store contract stays 'explicitly provisional pre-1.0' (docs/guide/integrating.md:9-10). No register trigger or checklist box names a second API pass. An argument for should-land-before-0.1 exists (a published name is harder to rename than an unpublished one) but the repo's own records place renames in the pre-1.0 window, not the cut.

**Risk if 0.1 ships with it open.** An adopter of 0.1 builds on seven exported names and two option bags that could be renamed or reshaped in a later 0.x under the review's rules, with the only warning being the documented 'unreviewed' caveat.

### 66. Held divergences on acks: `acker` vs SPEC §2's `actor`; acks nested per finding

`divergence-acker-vs-actor-and-nested-acks` · merged from 3 reader finding(s) · readers' guess: decision / horizon

**What is open.** AcknowledgedPayload/RecordedAck name the identity `acker`; SPEC §2 names record-level `findings` and `acks` while the build nests acks under each finding. Recorded, not reconciled.

**Where documented.** `docs/process/implementation-status.md:427`; `docs/process/implementation-status.md:361`; `packages/record/src/types.ts:76-88`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "this build carries the latter NESTED per-finding (`RecordedFinding.acks`)" — `docs/process/implementation-status.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- That is a divergence from SPEC §2's Ack structure, recorded rather than reconciled

**Still open?** `yes` — packages/record/src/types.ts:76-88 still names the field `acker` and says the divergence is "recorded rather than reconciled"; docs/process/implementation-status.md:427 restates it; implementation-status.md:361 still records acks "NESTED per-finding (`RecordedFinding.acks`)" against SPEC §2's record-level `findings`/`acks` (docs/concept/SPEC.md:130). No deferral-register row, open-items-plan checkbox, or next-phases entry names either divergence (grep of those files for `acker`/`RecordedFinding.acks` returns nothing) — it is a standing recorded divergence with no closing trigger.

**Is the closing act code?** `partial` (effort M). Two ways to close: (a) revise SPEC §2 to say `acker` and per-finding nesting — a SEALED edit needing a fresh SCOPING-GUIDE §§1–2 sanction, zero code; or (b) reconcile the build to the spec — rename `acker`→`actor` in `AcknowledgedPayload`/`RecordedAck` (packages/record/src/types.ts), `kernel/findings-seams.ts` `acknowledge`, `chain/replay.ts` folding, and every findings test plus docs/guide/api-reference.md; nesting reconciliation would additionally restructure `DecisionRecord.findings`/`acks` in replay and the ack-coverage rung — a persisted-payload/API break. (c) A third option is standing acceptance, recorded — docs only.

**Release tie.** `documented-post-0.1` — Nothing ties it to the cut: docs/process/release-checklist.md has no item for it; docs/process/open-items-plan.md stages 4–7 do not list it; implementation-status.md:427 and types.ts:83 frame it as tracked-not-reconciled with no trigger. The pre-1.0 program (open-items-plan.md:238-265) is where public-shape freezes live, so a rename fits a 1.0 review, not 0.1.

**Risk if 0.1 ships with it open.** An adopter reading SPEC §2 alongside the published types sees `actor` vs `acker` and record-level vs per-finding acks and must consult implementation-status to learn the divergence is deliberate; a later rename after 0.1 would be a breaking payload change.

### 67. Self-test tier vocabulary tension (C5) and its lack of a SPEC section

`self-test-tier-vocabulary-tension` · merged from 1 reader finding(s) · readers' guess: decision / horizon

**What is open.** CONTROLS §4 says 'waiver'/'probe suite' while SCOPING-GUIDE §3 bans 'waiver' from user-facing surfaces; the tier's markers live in CONTROLS alone. Whether the ruling was written down is not stated.

**Where documented.** `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md:1276,1290`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Decide at Phase 8.4 whether catalog vocabulary and shipped API vocabulary are governed by the same rule." — `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md`

**Still open?** `partial` — Behaviorally the build decided it by shipping the vocabulary: the `./probes` subpath exports `Waiver` (packages/record/src/probes/index.ts:19; package.json:24-26) and OPEN-QUESTIONS §5's 'Decided (this build)' tail names 'waiver governance ... waivable only by a dated, unexpired waiver' (docs/concept/OPEN-QUESTIONS.md:95-100), while SCOPING-GUIDE §3 commitment 4 still reads '"waiver," ... appear on no user-facing surface' (docs/concept/SCOPING-GUIDE.md:68-69). No written ruling that catalog and API vocabulary share the rule was found: grep for 'commitment 4'/'C5'/'vocabulary' in the self-test design/plan, implementation-status, next-phases, deferral-register and the API review yields nothing addressing it (the phase-1 API review, which reviewed 52 names, does not mention 'waiver'). 'This tier has no SPEC section' (adoption plan :1279) is unchanged by design — markers live in CONTROLS §4 (CONTROLS.md:66, PROVEN) and OQ §5 carries the contract; CONTROLS.md:14 and SCOPING-GUIDE.md:23 themselves list 'self-waiver governance' inside scope, so the tension is narrower than the plan stated.

**Is the closing act code?** `partial` (effort M). Decision only if ruled 'same rule applies': then rename the `./probes` `Waiver` type and `waivers`/`expiredWaivers`/`unusedWaivers` fields in packages/record/src/probes/types.ts and runner, update docs/guide/api-reference.md (pnpm api-sync) and probes tests; ruled the other way it is a sentence in a process doc (or a sanctioned SCOPING-GUIDE clarification, which is sealed).

**Release tie.** `horizon` — No register row, checklist item, or open-items-plan stage names it; OQ §5's tail is 'Decided (this build)' and next-phases lists §5 as CLOSED (docs/process/next-phases.md:299). The `./probes` shape is under 'pre-1.0 provisional-shape discipline' (OPEN-QUESTIONS.md:97), so a rename would still be admissible post-0.1.

**Risk if 0.1 ships with it open.** A 0.1 adopter sees a public `Waiver` type on the probes subpath while the sealed SCOPING-GUIDE says that word appears on no user-facing surface — an internal inconsistency, not a behavioral defect.

### 68. Operator sweep is a documented recipe, not a seam; no scheduler, no public expire()

`sweep-recipe-not-seam-no-scheduler` · merged from 2 reader finding(s) · readers' guess: decision / horizon

**What is open.** Clock edges resolve en passant or via a host-scheduled sweep through listDue and an ordinary seam call; the recipe's only home is a process doc and the guide.

**Where documented.** `docs/process/implementation-status.md:419,442`; `docs/guide/integrating.md:445-460`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "The operator sweep itself stays a recipe, not a seam" — `docs/process/implementation-status.md`
- "The library ships no scheduler and no public `expire()`." — `docs/guide/integrating.md`

**Still open?** `yes` — No `sweep()`/`expire()` exists in packages/record/src (grep shows only `listDue` as the read surface, redeem.ts:292-298 as the en-passant resolver); docs/process/implementation-status.md:419 'The operator sweep itself stays a recipe, not a seam'; docs/guide/integrating.md:445-468 documents the host-scheduled loop. This is the shape SPEC.md:377-378 mandates ('no scheduler and no public `expire()`'), so it is a recorded spec-conformant limit, not pending work.

**Is the closing act code?** `partial` (effort M). A shipped sweep seam would need a fresh sanction against SPEC.md:377-378 first; if granted, a `sweep()` on the operator surface (packages/record/src/kernel/*.ts, surface interface in index.ts), listDue-driven, with clocks.test.ts pins and api-reference/guide updates. Note SPEC.md:1200 already says the sweep's concrete signature is 'provisional pre-1.0', which is the one thread that could move pre-1.0 without a fork.

**Release tie.** `horizon` — docs/process/open-items-plan.md has no stage-4/5 row for it; SPEC.md:1200 places any sweep-signature settling at 'pre-1.0'; docs/guide/integrating.md:445-468 already ships the recipe for 0.1 adopters. implementation-status.md:168 groups it with the pre-1.0 provisional §12 surfaces.

**Risk if 0.1 ships with it open.** Adopters must own scheduling (cron/queue) and drive `redeem(recordId, {})` per due record themselves; the guide gives the loop, so the risk is operational burden, not a missing capability.

### 69. Cut: decline disposition field (RETURN/MODIFY/ESCALATE) — revisit point

`cut-decline-disposition-field` · merged from 2 reader finding(s) · readers' guess: mixed / horizon

**What is open.** Verbs cut in favor of decline + reason consultation + supersedes re-open; a payload disposition field is the revisit point if hosts prove the recipes insufficient (sealed change, fresh promotion case).

**Where documented.** `docs/process/implementation-status.md:1476-1480`; `docs/superpowers/specs/2026-08-20-recorded-human-decline-design.md:200-203`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "a disposition field on the payload is the revisit point — considered and declined" — `docs/process/implementation-status.md`

**Still open?** `partial` — Recorded as a CUT with a named recovery path, not as open work: docs/process/implementation-status.md:1476-1480 and docs/superpowers/specs/2026-08-20-recorded-human-decline-design.md:200-203 'considered and declined ... not foreclosed'. Trigger is conditional ('if real hosts prove the recipes insufficient'), and no host has. Not in deferral-register.md, open-items-plan.md stages 6/7, or next-phases.md (no 'disposition' hits outside row-19/22 usage: implementation-status.md:2657,3617,3649).

**Is the closing act code?** `partial` (effort M). Only if the trigger fires: a fresh promotion case and sealed SPEC §4/§9 edit for the declined payload row, then packages/record/src/kernel/decline.ts payload shape + types.ts + chain/replay.ts fold + refusal tests; present-iff-present so frozen byte-stability pins are unaffected. Absent a host demand: nothing.

**Release tie.** `horizon` — The recovery path is gated on post-adoption evidence ('if real hosts prove the recipes insufficient', implementation-status.md:1479) which can only arise after a release; no 0.1 document names it.

**Risk if 0.1 ships with it open.** An adopter wanting RETURN/MODIFY/ESCALATE must compose decline + a reason consultation + supersedes re-open (docs/guide/integrating.md:183 shows the recipe) rather than a single verb.

### 70. Cut: mandatory-provenance leg-level requirement field

`cut-mandatory-provenance-leg-field` · merged from 2 reader finding(s) · readers' guess: mixed / horizon

**What is open.** `proposed` is enforced only at the host's open() call site; a LegSpec requirement needs its own promotion case.

**Where documented.** `docs/process/implementation-status.md:1628-1630`; `docs/superpowers/specs/2026-08-21-proposal-provenance-design.md:65-68,149-151`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "a leg-level requirement field with its own promotion case, if a real host needs enforcement" — `docs/process/implementation-status.md`

**Still open?** `yes` — implementation-status.md:1628-1630 records the cut; proposal-provenance-design.md:65-68 ('a leg-level requirement field is a recorded recovery path, not built'), :149-151. Code confirms: `proposed` is an open-time option with no profile/leg requirement (open.ts:128-149; grep for requireProposed/proposedRequired in packages/record/src returns nothing). Not reopened anywhere later; no register row.

**Is the closing act code?** `partial` (effort M). If a real host needs enforcement the call site cannot give: its own promotion case through SCOPING-GUIDE §§1-2 (a new LegSpec field is sealed SPEC §2/§3 + CONTROLS GOVERNED-row text), then a LegSpec boolean in types.ts, validateProfile in config.ts, an open.ts rung refusing/throwing when the leg requires `proposed` and none is supplied (decide refuse-vs-throw per SPEC §8), tests, api-reference/guide. Otherwise no work — hosts enforce at their own open() call site.

**Release tie.** `horizon` — Stated as a recovery path 'if a real host needs enforcement the call site cannot give' (implementation-status.md:1629-1630); precedent cited is `supersedes` (same open-time-option posture, implementation-status.md:1605-1607). Absent from deferral-register live rows, release-checklist, next-phases, open-items-plan stages 6-7.

**Risk if 0.1 ships with it open.** An adopter wanting provenance to be mandatory must enforce it at its own open() call site; a profile cannot declare it, so a forgotten `proposed` records nothing rather than refusing.

### 71. Cut: cross-subject/profile/leg proposed refs — strict same-triple

`cut-cross-triple-proposed-refs` · merged from 2 reader finding(s) · readers' guess: decision / horizon

**What is open.** A proposed ref naming a different (profileId, subjectRef, legId) throws; loosening awaits demonstrated need and would move SPEC §9's sentence.

**Where documented.** `docs/process/implementation-status.md:1631-1632`; `docs/superpowers/specs/2026-08-21-proposal-provenance-design.md:152-153`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "loosen on a demonstrated real-host need, argued at the seam" — `docs/process/implementation-status.md`

**Still open?** `yes` — Cut recorded at implementation-status.md:1631-1632 and proposal-provenance-design.md:152-153; code enforces strict same-triple with a throw at packages/record/src/kernel/open.ts:137-148 ('the proposed reference must name the same (profileId, subjectRef, legId) as the opened draft (SPEC §9)'). No later record loosens it; no register row.

**Is the closing act code?** `partial` (effort M). Loosening = a fresh sanction moving SPEC §9's same-triple sentence (the throw message cites SPEC §9, open.ts:146), then relaxing/removing the triple comparison at open.ts:137-148, deciding what a cross-triple binding means for replay, updating tests that pin the throw and the guide (integrating.md:288-289 names the same-triple rule). Leaving it strict is no work.

**Release tie.** `horizon` — 'loosen on a demonstrated real-host need, argued at the seam' (implementation-status.md:1632); fail-closed rationale 'against host wiring bugs' (proposal-provenance-design.md:63-64). Not named by any deferral-register trigger, the release checklist, next-phases, or open-items-plan stages 6-7.

**Risk if 0.1 ships with it open.** An adopter whose proposal was staged under a different profile/subject/leg gets a loud caller-error throw at open() rather than a binding; the strict posture is fail-closed, so the risk is inconvenience, not silent misrecording.

### 72. Cut: mandatory effect-result presence — possible future profile field

`cut-mandatory-result-presence` · merged from 2 reader finding(s) · readers' guess: mixed / horizon

**What is open.** redeem.result:true admits but never requires a digest; the admission-gate shape was flagged as new normative text with thin precedent, worth revisiting at 1.0.

**Where documented.** `docs/process/implementation-status.md:1827-1829`; `docs/superpowers/specs/2026-08-21-effect-result-design.md:65-76,185-187`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "a future profile field could demand the stricter posture if a real host needs it" — `docs/process/implementation-status.md`

**Still open?** `yes` — Cut recorded at implementation-status.md:1827-1829 and effect-result-design.md:65-76 (admission gate argued, 'new normative text, not an inherited pattern'), :185-187. No profile field requiring a result exists (grep requireResult/resultRequired in packages/record/src: none). HOWEVER the candidate's claim 'worth revisiting at 1.0' is NOT in the sources: grep for '1.0'/'revisit' in effect-result-design.md returns nothing and no process doc ties the admission gate to 1.0 — that framing should be dropped. The sanction grant 'explicitly acknowledging the grant licenses NEW normative text for the admission-gate shape' (implementation-status.md:1832-1833) closes the precedent question, it does not defer it.

**Is the closing act code?** `partial` (effort M). If a real host wants the stricter posture: a promotion case for a new profile field (e.g. `redeem.result: 'required'`) — sealed SPEC §11.2/§10.3-style presence rule plus CONTROLS text under fresh sanction — then config.ts validateProfile, a refusal-or-throw at redeem()/completeRedemption() when a declaring profile supplies no result (kernel/redeem.ts validateRedeemOptions), tests, guide. Otherwise nothing; the admission gate stands as decided.

**Release tie.** `horizon` — 'a future profile field could demand the stricter posture if a real host needs it' (implementation-status.md:1828-1829); the design argues a mandatory contract would be 'the opposite of fail-closed' (effect-result-design.md:71-74). Not in deferral-register live rows, release-checklist, next-phases open list, or open-items-plan stages 6-7; open-items-plan.md:300-316 appendix lists no residue for it either.

**Risk if 0.1 ships with it open.** An adopter declaring `redeem.result: true` gets a redeemed record with no resultDigest if its host forgets to pass one — absence is recorded as non-evidence rather than refused, so enforcement stays at the host's call site.

### 73. Third-horn sanction: decide C3/C4 from the read chain (chain-local admissibility precheck) — declined at this cut

`third-horn-sanction-c3-c4-from-read-chain` · merged from 6 reader finding(s) · readers' guess: decision / post-0.1

**What is open.** The only measured containment predicts the store's answer from an unverified chain, suppressing a compromise evidence edge that lands today (two divergence shapes pinned). Taking it narrows SPEC §5 and needs a fresh SCOPING-GUIDE §§1–2 sanction with the trade stated; declined at this cut, the door stays open via row 22's sanction disjunct. Tie split: post-0.1/horizon majority, one gates-0.1.

**Where documented.** `docs/process/deferral-register.md:13`; `docs/process/next-phases.md:52-57,69-70`; `docs/process/implementation-status.md:1217-1224`; `docs/process/implementation-status.md:3159-3160`; `docs/process/implementation-status.md:2960-2972`; `docs/superpowers/specs/2026-08-29-sidecar-orphans-report-design.md:93`; `docs/superpowers/specs/2026-08-24-no-edge-containment-design.md:130-137,280`; `docs/process/release-checklist.md:186-190,206-207`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Taking that horn narrows SPEC §5's admission rule and needs a fresh sanction" — `docs/process/deferral-register.md`
- "The third-horn sanction is declined at this cut, in writing, in the release checklist." — `docs/superpowers/specs/2026-08-29-sidecar-orphans-report-design.md`
- "the third-horn sanction is DECLINED at this cut unless sought on its own merits" — `docs/process/release-checklist.md`

**Still open?** `yes` — docs/process/deferral-register.md:13 'Taking that horn narrows SPEC §5's admission rule and needs a fresh sanction'; docs/process/release-checklist.md:206-207 'the third-horn sanction is DECLINED at this cut unless sought on its own merits' (unchecked item, pre-argued not decided); docs/process/next-phases.md:69-70 'the third-horn sanction is declined at this cut'; the two divergence pins stand in packages/record/test/no-edge-containment.test.ts (must-not-change). No sanction has been sought: docs/concept/ untouched and no analysis doc post 2026-08-29 in git log.

**Is the closing act code?** `partial` (effort L). Decision first. If declined (the recorded expectation): docs-only, the release-day row-22 ruling in implementation-status.md restates it. If sought and granted: a sealed-set edit to docs/concept/SPEC.md §5 under a fresh SCOPING-GUIDE §§1-2 sanction, a chain-local C3/C4 admissibility precheck in packages/record/src/kernel/finalize.ts (appendChainCompromise), and an explicitly authorized inversion of the two must-not-change pins in packages/record/test/no-edge-containment.test.ts — a fork-adjacent change the record says trades a lost compromise evidence edge for bounded growth.

**Release tie.** `documented-post-0.1` — docs/process/release-checklist.md:206-207 and next-phases.md:69-70 both say the sanction is declined at this cut; it survives only as one standing disjunct of row 22's trigger (deferral-register.md:13) after the cut's disjuncts are dropped (release-checklist.md:214-219). The disposition of row 22 gates the cut; this sanction itself is explicitly placed beyond it.

**Risk if 0.1 ships with it open.** Nothing new at the cut — the repo has already decided not to take this horn for 0.1; the cost is the unbounded orphan growth on refusing calls that row 22a already records and verifySignatures().orphans surfaces.

### 74. Orphan handling delegated to the host: tolerate-and-prune obligation unenforced, same-seq race stated not guarded

`orphan-delegation-host-reconciliation-unenforced` · merged from 5 reader finding(s) · readers' guess: mixed / horizon

**What is open.** The SignatureStore contract tells implementers to tolerate orphans and reconcile against the chain, but no gate reads a host's implementation, api-sync does not check the guide's quoted interface, and pruning carries a documented in-flight same-seq race with no lock or safe-prune primitive.

**Where documented.** `docs/process/implementation-status.md:1228-1231`; `docs/process/implementation-status.md:2886-2890`; `docs/superpowers/specs/2026-08-24-sidecar-contract-design.md:132`; `docs/superpowers/specs/2026-08-29-sidecar-orphans-report-design.md:157`; `docs/guide/integrating.md:516-523`; `docs/guide/api-reference.md:486-498`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "What stands meanwhile is delegation, not prevention" — `docs/process/implementation-status.md`
- "No gate in this repository reads a host's `SignatureStore` implementation." — `docs/process/implementation-status.md`
- "the report is a reconciliation input, not a lock." — `docs/superpowers/specs/2026-08-29-sidecar-orphans-report-design.md`

**Still open?** `yes` — store.ts:29-39 states the obligation in a doc comment; integrating.md:518-523 ("Stated, not enforced: nothing here reads your implementation"; same-seq in-flight caveat); implementation-status.md:2886-2890 ("No gate in this repository reads a host's `SignatureStore` implementation" and api-sync checks presence only); 2026-08-29 orphans-report design:157 ("a reconciliation input, not a lock"). No conformance test kit or safe-prune primitive exists in packages/record/src (interface unchanged, store.ts:41-49).

**Is the closing act code?** `partial` (effort L). The record says this is structurally unenforceable ("nothing here can enforce it", implementation-status.md:2886). Options that would spawn code: a published `SignatureStore` conformance suite (new test-kit export from packages/record/src/index.ts, e.g. runs put-upsert, orphan tolerance, listByRecord order-independence against a host's store) — L; or a library-owned safe-prune primitive requiring `remove` plus in-flight coordination, which is the prune-at-seal/third-horn space. Also a scripts/api-reference-sync.mjs extension to diff quoted interfaces against source (S) would close the api-sync bound at implementation-status.md:2888-2890.

**Release tie.** `horizon` — No checklist item or register trigger asks for enforcement; release-checklist.md:187-189 accepts "the delegation already stated in the `SignatureStore` contract" as one of two ways to dispose of 22a. SignatureStore is provisional pre-1.0 (store.ts:26-27; open-items-plan.md:257-262 places interface freeze at the 1.0 gate).

**Risk if 0.1 ships with it open.** A 0.1 adopter writing a durable SignatureStore can violate the tolerate-orphans/upsert invariants or prune during an in-flight append (same seq) with no library check catching it; only docs warn them.

### 75. Store interface signature freeze — OPEN-QUESTIONS §9's 1.0 gate (meta-object form, tx type parameter, listDue signature)

`store-interface-freeze-1-0-gate` · merged from 17 reader finding(s) · readers' guess: decision / pre-1.0

**What is open.** Store behaviors are stable but method signatures are 'unstable while 0.x and freeze only at 1.0'; MemoryStore/SqliteStore/PostgresStore ship PUBLIC BUT UNSTABLE PRE-1.0. The freeze absorbs the committed-read observation, the conformance-export re-ask, the rehoming closures and the recordId narrowings. SPEC's own 'provisional' wording is sealed and would need a sanction to lift.

**Where documented.** `docs/process/next-phases.md:311-314`; `docs/process/open-items-plan.md:257-262`; `docs/process/open-items-sessions.md:277-279`; `docs/process/implementation-status.md:168`; `docs/process/implementation-status.md:468`; `docs/process/implementation-status.md:2055-2056`; `docs/concept/OPEN-QUESTIONS.md:129-133`; `docs/concept/SPEC.md:24-25,1111-1113,1199-1200`; `docs/analysis/2026-08-18-release-phase-brainstorm.md:326`; `docs/analysis/2026-08-20-committed-read.md:137-139`; `docs/superpowers/specs/2026-08-14-redemption-clocks-design.md:138`; `docs/superpowers/specs/2026-08-19-store-postgres-design.md:258-260`; `packages/record/src/store/store.ts:4-17`; `packages/record/src/index.ts:66-83`; `packages/record/src/operator-surface.ts:108-111`; `packages/store-postgres/src/postgres-store.ts:65-68`; `CONTRIBUTING.md:134-135`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "The freeze decision (what signature set, whether the meta-object form is final, whether a driver-generic transaction type parameter survives) is a 1.0 gate." — `docs/concept/OPEN-QUESTIONS.md`
- "method signatures are unstable while 0.x and freeze only at 1.0" — `docs/process/implementation-status.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- Do not build long-lived external adapters against this exact shape yet.

**Still open?** `yes` — docs/concept/OPEN-QUESTIONS.md:129-133 ('The freeze decision ... is a 1.0 gate', no Decided tail); docs/process/next-phases.md:311-314 lists §9 under 'genuinely open questions that remain'; docs/process/open-items-plan.md:257-262 unticked '[ ] The store interface freeze — the 1.0 gate'; packages/record/src/store/store.ts:4-17 still headed 'PUBLIC BUT EXPLICITLY UNSTABLE PRE-1.0 ... Do not build long-lived external adapters against this exact shape yet'; packages/record/src/index.ts:74-83 same marking on MemoryStore/SqliteStore; CONTRIBUTING.md:134-135 'stay explicitly provisional pre-1.0'. No git log commit or CHANGELOG entry records a freeze.

**Is the closing act code?** `partial` (effort L). The freeze is a ruling first (docs/analysis dated ruling + OPEN-QUESTIONS §9 Decided tail, which is a SEALED-set edit needing a fresh SCOPING-GUIDE §§1-2 sanction, as is lifting SPEC §12's 'provisional pre-1.0' wording). If the ruling keeps shapes as-is, code is doc-comment only: strip 'PUBLIC BUT EXPLICITLY UNSTABLE PRE-1.0' from store/store.ts, memory.ts, sqlite.ts, index.ts:66-83, operator-surface.ts, postgres-store.ts, signing/store.ts, probes/types.ts, and docs/guide/integrating.md:64-66. If it changes the meta-object form, the `tx?: unknown` parameter (a TTx generic), or restores record-returning listDue/findNonTerminal, it is a breaking interface change touching Store, all three backings, store-conformance.ts callers, and api-reference.md.

**Release tie.** `documented-post-0.1` — docs/process/open-items-plan.md:238-240 places it under 'Stage 6 — The pre-1.0 program: Post-0.1 work'; OPEN-QUESTIONS.md:132-133 'a 1.0 gate'; docs/process/release-checklist.md has zero mentions of freeze/provisional (grep); docs/process/next-phases.md:26-40 names only rows 1, 19, 22 as gating the cut.

**Risk if 0.1 ships with it open.** An adopter of 0.1 who builds a long-lived external Store adapter may see method signatures move under them before 1.0, exactly as store.ts:16-17 warns.

### 76. Store conformance suite export — declined for 0.x, re-asked at the 1.0 freeze (vendoring drift, vitest-major axis)

`conformance-suite-export-re-ask-1-0` · merged from 8 reader finding(s) · readers' guess: decision / pre-1.0

**What is open.** runStoreConformance is test-only; adapter authors vendor the file, which misses later tightenings silently. Export was declined 2026-08-20 with a dev-only package the presumptive 1.0 shape; which vitest majors the suite runs under is unmeasured. Must never grow toward badges or a registry.

**Where documented.** `docs/process/open-items-plan.md:263-265`; `docs/process/open-items-sessions.md:129-130,280`; `docs/process/implementation-status.md:442`; `docs/analysis/2026-08-20-conformance-export.md:154-159,202-203,211-214,218-223`; `docs/superpowers/specs/2026-08-12-store-conformance-suite-design.md:37`; `docs/superpowers/plans/2026-08-12-store-conformance-suite.md:468-469`; `packages/record/test/conformance/store-conformance.ts:25-30`; `docs/guide/integrating.md:57-65`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "vendoring gives the pins you took, not the pins added since" — `docs/analysis/2026-08-20-conformance-export.md`
- "which vitest majors the suite works under is a compatibility axis nothing measures" — `docs/analysis/2026-08-20-conformance-export.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- Not exported while 0.x. ... The 1.0 store-interface freeze ... re-asks this question, with a separate dev-only package the presumptive shape

**Still open?** `partial` — The 0.x ruling is CLOSED: docs/process/open-items-plan.md:126 '[x] Conformance-suite export' and docs/analysis/2026-08-20-conformance-export.md:13-19 'Not exported while 0.x ... The 1.0 store-interface freeze re-asks this question'; packages/record/test/conformance/store-conformance.ts:25-30 'RULED now'; docs/guide/integrating.md:57-65 documents vendoring. What REMAINS open: the 1.0 re-ask (open-items-plan.md:263-265 unticked '[ ] The conformance-suite export — if stage 3 ruled export', conditional on a ruling that went the other way, so it is dormant); the unmeasured vitest-major axis (conformance-export.md:62-63 'nothing measures'); the vendoring-drift bound (conformance-export.md:72-74, accepted cost). No commit exports the suite (git log grep).

**Is the closing act code?** `partial` (effort L). Nothing to build now — the 0.x ruling is 'not exported' and vendoring is the blessed path. If the 1.0 re-ask rules export: new dev-only package (`@vidimera/store-conformance` or similar, conformance-export.md:89-91) — move packages/record/test/conformance/store-conformance.ts plus test/helpers/chain.ts and store-fixtures.ts into it, declare vitest as a peer/dep, rewire the three caller files, add it to release.yml and the versioning mechanics, document it, and add a vitest-major compatibility check. Must never grow toward badges or a registry (conformance-export.md:80-81).

**Release tie.** `documented-post-0.1` — docs/analysis/2026-08-20-conformance-export.md:15-17 'The 1.0 store-interface freeze ... re-asks this question'; open-items-plan.md:238-240 Stage 6 'Post-0.1 work'; Stage 7 open-items-plan.md:283-285 'A third store adapter ... if stage 3 ruled export' (it did not); release-checklist.md has no conformance mention.

**Risk if 0.1 ships with it open.** An adapter author on 0.1 vendors the suite and silently misses later behavioral tightenings ('vendoring gives the pins you took, not the pins added since'), and cannot know which vitest majors the file runs under.

### 77. Single-writer bound: seq-conflict storage-fault throw survives; lost-CAS refusal arms tolerated; (5.7)->(6) pair unconstructible

`single-writer-bound-seq-conflict-throw` · merged from 3 reader finding(s) · readers' guess: decision / horizon

**What is open.** A concurrent writer moving max makes batchConflict throw a storage fault (nothing recorded), finalize's lost-CAS path refuses record-not-open; findings-seams records the same. All rest on a stated no-concurrent-finalize bound the library does not enforce; the last adjacent order pair has no test.

**Where documented.** `docs/process/implementation-status.md:982`; `packages/record/src/kernel/finalize.ts:278-284,616-635`; `packages/record/src/kernel/decline.ts:288-295`; `packages/record/src/kernel/findings-seams.ts:185-191`; `packages/record/test/finalize-check-order.test.ts:38-42`; `packages/record/test/terminality.test.ts:190-192`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "A `seq` conflict is still producible" — `docs/process/implementation-status.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- tolerated because it is unreachable under this build's stated single-writer bound
- The surviving refusal still needs a store that violates this build step's single-writer bound: there is no way to construct a RECORD whose data trips it

**Still open?** `partial` — The behavior is landed and deliberate, not a defect awaiting a fix: `batchConflict` throws a storage fault on the `seq` shape (packages/record/src/kernel/finalize.ts:614-635), decline mirrors it (packages/record/src/kernel/decline.ts:288-295), the lost-CAS `record-not-open` arms are "tolerated because it is unreachable under this build's stated single-writer bound" (finalize.ts:278-284; findings-seams.ts:185-191), and the (5.7)->(6) pair is excluded on the same argument (packages/record/test/finalize-check-order.test.ts:38-44). Register row 12 that tracked the mid-batch throw is retired (docs/process/implementation-status.md:978-990; terminality.test.ts:186-190). What stays open is only the STATED BOUND itself: the library does not enforce single-writer-per-record, and SPEC §1 declares "concurrent legs are out of scope pre-1.0" (docs/concept/SPEC.md:70-71), which next-phases.md:274-278 and open-items-plan.md:301-302 list under "deliberately outside the scope"/"surveyed and not open". Note the concurrency bound is about concurrent finalize on ONE record, which is narrower than SPEC's concurrent-legs declaration; no repo document names lifting it. Side note: terminality.test.ts:190 comment still names `midBatchConflict`, which finalize.ts renamed to `batchConflict` (line 208 of the same file acknowledges the removal, so the comment is historical, not wrong).

**Is the closing act code?** `partial` (effort L). Only if a future revision admits concurrent writers: `batchConflict` in packages/record/src/kernel/finalize.ts and the decline.ts:288-295 throw would become bounded-retry/`availability`-style outcomes, the lost-CAS arms in finalize.ts:278-284 and findings-seams.ts:185-191 would need loser-agrees-with-reinvocation semantics, and finalize-check-order.test.ts would need a (5.7)->(6) construction via a racing-store fixture. Admitting concurrent legs also touches sealed SPEC §1/§10.1 (fresh sanction). Keeping the bound: no code, at most a guide sentence stating the no-concurrent-finalize-per-record assumption (docs/guide/integrating.md carries only the concurrent-legs line at :98).

**Release tie.** `horizon` — docs/concept/SPEC.md:71 "concurrent legs are out of scope pre-1.0"; docs/process/next-phases.md:274-278 lists it under "What is deliberately outside the scope"; docs/process/open-items-plan.md:301-302 appendix "surveyed and not open ... concurrent legs (out pre-1.0 by declaration)". No register trigger names the cut.

**Risk if 0.1 ships with it open.** An adopter running two concurrent finalize calls on one record gets a loud storage-fault throw (nothing recorded) or a `record-not-open` refusal that may differ from what re-invocation would say — safe, but the assumption is stated in code comments and the status record rather than prominently in the adopter guide.

### 78. Cut: proposer withdrawal verb — distinct future promotion case

`cut-proposer-withdrawal-verb` · merged from 2 reader finding(s) · readers' guess: mixed / horizon

**What is open.** A proposer cannot decline their own leg; withdrawal is host-modeled; a library verb needs its own case and sanction.

**Where documented.** `docs/process/implementation-status.md:1481-1485`; `docs/superpowers/specs/2026-08-20-recorded-human-decline-design.md:204-206`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "a distinct future verb with its own promotion case, if a real host needs it" — `docs/process/implementation-status.md`

**Still open?** `partial` — A recorded cut with a conditional recovery path, not open work: docs/process/implementation-status.md:1481-1485; design doc 2026-08-20-recorded-human-decline-design.md:204-206 'if a real host needs it'. The sealed spec pins the current behavior as [PROVEN]: docs/concept/SPEC.md:778-779 'a proposer therefore cannot withdraw their own draft through this seam'. No register row or open-items-plan/next-phases entry (grep 'withdraw' hits only unrelated 'withdrawn' census text).

**Is the closing act code?** `partial` (effort L). Only if a host need materializes: a new promotion case and sealed SPEC §9/§10.1 edit, then a new kernel seam (packages/record/src/kernel/withdraw.ts alongside decline.ts) with its own transition kind, replay fold (chain/replay.ts), refusal code (refusal-codes.ts), SoD exemption logic, conformance/probe coverage and guide updates. Otherwise nothing.

**Release tie.** `horizon` — Recovery condition 'if a real host needs it' (implementation-status.md:1484-1485) presupposes adoption; SPEC.md:779 already records the current posture as [PROVEN]; not on release-checklist.md or in the register.

**Risk if 0.1 ships with it open.** Adopters model proposer withdrawal outside the library (their own workflow layer) or via expiry; the record shows no withdrawal edge.

### 79. Cut: multi-hop draft lineage inside one record

`cut-multi-hop-draft-lineage` · merged from 1 reader finding(s) · readers' guess: decision / horizon

**What is open.** One proposedDigest per record; P1→P2→P3 is separate records each with its own proposed.

**Where documented.** `docs/process/implementation-status.md:1618-1622`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Multi-hop draft lineage (P1→P2→P3 inside one record) — cut" — `docs/process/implementation-status.md`

**Still open?** `yes` — docs/process/implementation-status.md:1618-1621 records the cut with a recovery path (multi-round rework as records via decline/refuse + supersedes); docs/superpowers/specs/2026-08-21-proposal-provenance-design.md:142-145 same. Current code binds exactly one proposedDigest per record (packages/record/src/kernel/open.ts:128-149, :195, :218-221); no register row, no open-items-plan stage 6/7 entry names it (docs/process/open-items-plan.md:238-296). It is a recorded, deliberate cut whose 'recovery path' already exists via composition — open only in the sense that no case has ever asked to reopen it.

**Is the closing act code?** `partial` (effort L). If ever taken: a fresh SCOPING-GUIDE §§1-2 sanction to revise SPEC §9's `proposed { stagedRef }` shape, then open.ts would accept a list/chain of staged refs and bind multiple digests (open.ts:128-149, :218-221), replay.ts folding them, byte-stability pins for the new present-iff-supplied shape, and api-reference/integrating guide updates. Taken the other way (leave cut) it is nothing at all — the recorded recipe already works.

**Release tie.** `horizon` — No cut-tying text anywhere: deferral-register.md live rows are 1, 19, 22 only (docs/process/deferral-register.md:13); release-checklist.md and next-phases.md never mention draft lineage; open-items-plan.md stages 6-7 (238-296) do not list it. The rationale is structural ('would mint unverifiable lineage', implementation-status.md:1619), so it is a design boundary, not a debt.

**Risk if 0.1 ships with it open.** An adopter wanting P1→P2→P3 inside one record must model each rework round as a separate record carrying its own `proposed` and `supersedes` — documented, working composition, no gap.

### 80. Cut: editor identity on a revision as a first-class field (recipe documented)

`cut-editor-identity-first-class` · merged from 3 reader finding(s) · readers' guess: mixed / horizon

**What is open.** Staging carries no identity; the `revision` consultation recipe is in the guide; a first-class field awaits real-host need.

**Where documented.** `docs/process/implementation-status.md:1623-1627`; `docs/superpowers/specs/2026-08-21-proposal-provenance-design.md:146-148`; `docs/guide/integrating.md:290-301`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "a first-class field is a later case if hosts prove the recipe insufficient" — `docs/process/implementation-status.md`
- "Editor identity is deliberately not a first-class field here." — `docs/guide/integrating.md`

**Still open?** `partial` — The recipe half is DONE: docs/guide/integrating.md:290-297 documents the `revision` consultation convention (checker = editor identity, payloadDigest over prior version). The first-class-field half stays a recorded cut awaiting demonstrated host need (implementation-status.md:1622-1627, 'a first-class field is a later case if hosts prove the recipe insufficient'; proposal-provenance-design.md:146-148). No later doc reopens it; no register row.

**Is the closing act code?** `partial` (effort L). Only if a real host proves the recipe insufficient: a fresh sanction (SPEC §2 field table, §9 options; likely a CONCEPT identity-by-transport check since 'a host writing the store directly can stage anything', integrating.md:292-293), then a new open-time or staging-time identity field in types.ts, open.ts binding, replay folding, byte-stability pins, guide/api-reference updates. Leaving it cut is documentation already landed.

**Release tie.** `horizon` — Trigger is explicitly conditional on hosts proving the recipe insufficient (implementation-status.md:1626-1627); not in deferral-register (only rows 1/19/22), release-checklist, next-phases open list (next-phases.md:296-322), or open-items-plan stages 6-7. Guide recipe is the pre-cut deliverable and it is already in place (integrating.md:290-297).

**Risk if 0.1 ships with it open.** An adopter needing to attribute who produced a revision uses the documented `revision` consultation; the library never proves authorship of either draft (integrating.md:298-301 states this bound), which is the concept's stated posture.

### 81. Cut: structured effect-result fields (executionId, transactionId, effectTarget)

`cut-structured-effect-result-fields` · merged from 2 reader finding(s) · readers' guess: decision / horizon

**What is open.** Only result.digest crosses the seam; a future case must argue why the library needs to read structured members.

**Where documented.** `docs/process/implementation-status.md:1819-1822`; `docs/superpowers/specs/2026-08-21-effect-result-design.md:178-180`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "a future case would have to argue why the library needs to read them" — `docs/process/implementation-status.md`

**Still open?** `yes` — Cut recorded at implementation-status.md:1819-1821 and effect-result-design.md:178-180; code carries only `resultDigest?: Digest` on the redeemed payload (packages/record/src/types.ts:191-195); grep for executionId/transactionId/effectTarget in packages/record/src returns nothing. Not reopened later; no register row.

**Is the closing act code?** `partial` (effort L). Only if a future case argues the library must READ structured members: a fresh sanction on SPEC §11.2/§4 (the design binds §11.2's 'It carries no identity argument', effect-result-design.md:63-64), then new payload members in types.ts, redeem.ts option validation, replay folding, byte-stability pins, guide/api-reference. Default posture (ride inside the host's digested content) needs nothing.

**Release tie.** `horizon` — 'a future case would have to argue why the library needs to read them' (implementation-status.md:1821) — an argument nobody has filed; the design's own bound is 'digest only, no structured members' (implementation-status.md:1810-1811). Absent from register rows 1/19/22, release-checklist, next-phases, open-items-plan stages 6-7.

**Risk if 0.1 ships with it open.** An adopter wanting executionId/transactionId visible in the record must put them inside its own digested result content; the library notarizes the digest only and cannot index or verify those members.

### 82. Stage-6 architectural sessions and stage-7 scoping sessions — none scheduled, each needs a brainstorm and spec/plan pair

`stage6-stage7-sessions-unscheduled` · merged from 2 reader finding(s) · readers' guess: mixed / post-0.1

**What is open.** No stage-6 item (can-fail campaign, deeper driver shapes, store freeze) or stage-7 candidate (third adapter, examples host, bench suite, SPEC §10.3 revision) is committed; each gets its own brainstorm after 0.1.

**Where documented.** `docs/process/open-items-sessions.md:266-270,286-291,298`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Each is a full architectural brainstorm when its turn comes: questions, 2–3 approaches, sectioned design, then a spec/plan pair in `docs/superpowers/`" — `docs/process/open-items-sessions.md`
- "No session is scheduled. When a candidate is chosen — the third adapter, the examples host, the bench suite, or the SPEC §10.3 normative revision — it gets its own brainstorm" — `docs/process/open-items-sessions.md`

**Still open?** `yes` — docs/process/open-items-plan.md:244-270 shows all five stage-6 checkboxes unticked; :276-292 lists stage-7 candidates as 'Candidates only'; docs/process/open-items-sessions.md:113-118 'No session is scheduled' and :125 'Stage 6's sessions open after 0.1; stage 7's open on selection'. git log shows no brainstorm/spec/plan for can-fail campaign, driver shapes, store freeze, third adapter, examples host, or bench suite.

**Is the closing act code?** `partial` (effort XL). Each session is a brainstorm producing a spec/plan pair in docs/superpowers/ (docs/process/open-items-sessions.md:95-97); the code follows only if a session commits: broken-driver fixtures in packages/record/test/probes.test.ts, ProbeDriver API changes in packages/record/src/probes/types.ts, Store signature freeze in store/store.ts, a new packages/store-* adapter, an examples/ host, or a bench script. The SPEC §10.3 revision requires a sealed-set sanction first.

**Release tie.** `documented-post-0.1` — docs/process/open-items-plan.md:238-240 'Post-0.1 work with a recorded basis today ... none is committed until it gets its own scoping'; docs/process/open-items-sessions.md:125 'Stage 6's sessions open after 0.1; stage 7's open on selection'.

**Risk if 0.1 ships with it open.** None at 0.1 beyond the individually-recorded bounds (eleven pass-path-only probes, provisional store signatures); the umbrella item is a scheduling note, not a defect.


## D. Code-shaped, open, tied to no release (29 items)

### 83. Three loud positional `entries[0]` sidecar reads left in the test corpus

`positional-sidecar-reads-in-tests` · merged from 2 reader finding(s) · readers' guess: code / horizon

**What is open.** signing.test.ts's trailing-bytes break and signing-enforce.test.ts's missing-entry and unresolvable-keyRef fixtures still pick entries[0]; they fail loudly under adverse ordering and were left twice by design scope.

**Where documented.** `docs/process/implementation-status.md:2906-2912,2920`; `docs/superpowers/specs/2026-08-24-sidecar-contract-design.md:135-146,178-181`; `packages/record/test/signing.test.ts:242-248`; `packages/record/test/signing-enforce.test.ts:144,310`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "A loud fixture failure is a different hazard class from a false operator-assurance verdict, which is why they are left rather than folded in." — `docs/superpowers/specs/2026-08-24-sidecar-contract-design.md`

**Still open?** `yes` — grep at HEAD: packages/record/test/signing.test.ts:242, packages/record/test/signing-enforce.test.ts:144 and :310 all still read 'const victim = entries[0];' (the enforce fixtures delete/re-key it, signing.test.ts breaks the trailing four chars at :248); docs/process/implementation-status.md:2904-2914 records them as left by design; docs/superpowers/specs/2026-08-24-sidecar-contract-design.md:135-146 and :178-181 scope them out. The shared helper was fixed (helpers/signing.ts:121-137 correlates through transitionDigest of chain[0]) but these three were not.

**Is the closing act code?** `yes` (effort S). Test-only: replace the three entries[0] picks with a chain-correlated lookup (readChain(recordId)[0] -> transitionDigest -> entries.find), mirroring packages/record/test/helpers/signing.ts:121-137; signing.test.ts:242-248 must keep its trailing-four-character corruption rather than fold into breakOneSignature (the helper's header at :118-120 says why). Three small edits, no src change.

**Release tie.** `not-release-relevant` — docs/superpowers/specs/2026-08-24-sidecar-contract-design.md:143-146 rules them a different hazard class ('fail LOUDLY') and leaves them by scope; docs/process/implementation-status.md:2920 says 'No deferral-register row was written or retired'; no checklist or open-items-plan entry. The tests pass against MemorySignatureStore's insertion order today and only matter if a test-side sidecar's listing order changes.

**Risk if 0.1 ships with it open.** None for adopters: these are in-repo fixtures that would fail loudly, not silently, if the in-memory sidecar's listing order ever changed.

### 84. No append site asserts the returned transitionRef equals the appended edge's digest

`transitionref-equals-digest-unasserted` · merged from 1 reader finding(s) · readers' guess: code / unclear

**What is open.** Compromise-edge assertions accept any defined transitionRef; equality was confirmed by an independent probe but no test states it.

**Where documented.** `docs/process/implementation-status.md:2537-2541`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "no append site ties the returned transition reference to the appended edge's own digest" — `docs/process/implementation-status.md`

**Still open?** `partial` — Still true for the AL2 signature-broken cells: every compromise-edge assertion in packages/record/test/signing-enforce.test.ts accepts any defined value (`assert.notEqual(red.transitionRef, undefined, ...)` at :181, :365, :402, :438, :475, :502; decline.test.ts:136; findings-seams.test.ts:234,256). The record's sentence at docs/process/implementation-status.md:2538-2540 is nonetheless over-broad as literally written: the equality IS pinned for the hash-compromise refused edge at packages/record/test/chain-verify.test.ts:165-169 ('transitionRef = the appended refused edge digest', landed in step-1 corpus commit 7547b12), and for other seams at content-drift.test.ts:89-90 and facts.test.ts:178-179. No later increment (git log through 4e80bf7) added the equality to the signature-broken cells; no register row, next-phases entry, or open-items-plan checkbox tracks it.

**Is the closing act code?** `yes` (effort S). Test-only: in packages/record/test/signing-enforce.test.ts replace the `notEqual(out.transitionRef, undefined)` assertions (~8 sites, plus decline.test.ts:136 and findings-seams.test.ts:234,256) with `assert.equal(out.transitionRef, await handles.operator.readChain(id).at(-1)?.digest)` or `chainHead(recordId)`, mirroring chain-verify.test.ts:165-169. Optionally soften the over-broad sentence at implementation-status.md:2538 to 'no signature-broken cell'. No src change, no sealed-doc touch.

**Release tie.** `not-release-relevant` — Recorded only as an 'honest limit' of the retired rows 20/21 increment (implementation-status.md:2537-2541); rows 20 and 21 are retired (next-phases.md:122-193) and neither release-checklist.md nor deferral-register.md names this; the general equality is already pinned elsewhere (chain-verify.test.ts:168).

**Risk if 0.1 ships with it open.** None for adopters: a wrong transitionRef at a signature-broken seam would go unnoticed by the suite, but an independent probe confirmed equality holds and the same code path is equality-pinned for the hash-broken case.

### 85. Signature-enforcement-sites census proves naming, not testing; per-line grep evadable

`signature-site-census-naming-not-testing` · merged from 2 reader finding(s) · readers' guess: unclear / horizon

**What is open.** The seven-site tripwire compares files calling signatureLayerHolds against a pinned list; a gutted pin stays green and a call wrapped across lines evades it. Guards new sites only.

**Where documented.** `docs/process/implementation-status.md:2523-2527`; `packages/record/test/signature-enforcement-sites.test.ts:5-14`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "The census proves NAMING, not testing" — `docs/process/implementation-status.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- It cannot tell whether a listed site's test still asserts anything — gut a pin and this stays green.

**Still open?** `yes` — The test header at packages/record/test/signature-enforcement-sites.test.ts:6-14 still states both limits verbatim ('proves NAMING, not coverage'; per-LINE match evadable by a wrapped call; 'gut a pin and this stays green'); the SITES list is still seven (:23-31). implementation-status.md:2523-2527 records the same bound. No later commit changed the census; no row or checkbox tracks it — it is a recorded bound of a tripwire, not deferred work.

**Is the closing act code?** `yes` (effort S). If ever closed: (a) make the scan multi-line tolerant in signature-enforcement-sites.test.ts (regex over whole file text for `signatureLayerHolds\s*\(` instead of per-line), and (b) a pin-liveness check would need a mutation harness or a per-site assertion that each named site has a test importing `breakOneSignature` and asserting a delta — a substantially bigger design. (a) is S; (b) is speculative. Alternatively leave as a documented bound (no change).

**Release tie.** `not-release-relevant` — Recorded as 'The honest limit' of a retired-row increment (implementation-status.md:2523-2527) with 'Its own header says so'; absent from deferral-register.md, release-checklist.md, next-phases.md live sections and open-items-plan.md.

**Risk if 0.1 ships with it open.** An eighth enforcement site written across two lines, or a gutted existing pin, would not trip the census — a maintainer-side regression risk, invisible to adopters.

### 86. Probe suite driven over Memory and SQLite only; no Postgres ProbeDriver

`postgres-probe-driver-missing` · merged from 1 reader finding(s) · readers' guess: code / post-0.1

**What is open.** state-survives-restart passes only through the SQLite restart driver; no ProbeDriver over PostgresStore exists, so the operator-assurance tier has never run against the server backing.

**Where documented.** `packages/record/test/probes.test.ts:5-8,255-260,419-426`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- an in-memory Store has nothing durable to restart — a no-op fake would prove nothing). Every probe but `state-survives-restart` must PASS against it; that one honestly reports not-driven

**Still open?** `yes` — No ProbeDriver over PostgresStore exists: grep of packages/store-postgres/src and test for `ProbeDriver`/`runProbes` returns nothing; packages/record/test/probes.test.ts:1-12 names only `makeFullDriver()` (MemoryStore) and `makeSqliteRestartDriver()`. The only Postgres-plus-probes touchpoint is the first-use proof, which merely counts `17 probes visible through ./probes` next to a separate Postgres confirm loop (docs/analysis/2026-08-29-first-use-proof.md:48,52) — it does not run the probes over PostgresStore. CAVEAT: no repo record names this as an open item; it is an inference from the test fixture, not a documented gap (open-items-plan.md stage 6 at :244-256 names can-fail and deeper-driver shapes, not a Postgres driver).

**Is the closing act code?** `yes` (effort S). Add a `makePostgresRestartDriver()` fixture in packages/store-postgres/test (its globalSetup already starts embedded Postgres per run) implementing `ProbeDriver` with `restartPersistence` that closes and reopens the pool; run `runProbes` over it asserting `state-survives-restart` passes and the rest match the Memory driver. No src change required; SignatureStore stays provisional.

**Release tie.** `not-release-relevant` — No deferral-register trigger, release-checklist row, or next-phases item names it (grep of docs/process for `state-survives-restart` hits only implementation-status.md:446's CONTROLS §4 row, which records the SQLite driver as the genuine pass path, not a Postgres gap). Probe-tier follow-ups live in stage 6, post-0.1 (docs/process/open-items-plan.md:238-240).

**Risk if 0.1 ships with it open.** An adopter on the server backing would have no in-repo evidence that the operator-assurance restart probe passes over PostgresStore, though the probe honestly reports not-driven rather than a false pass and the adapter's conformance suite covers persistence separately.

### 87. Probe target strings quote CONTROLS §4 verbatim with no automated backstop

`probe-target-controls-citation-no-backstop` · merged from 1 reader finding(s) · readers' guess: code / horizon

**What is open.** The contract-scan resolver checks SPEC §N and DECISIONS.md #N but not CONTROLS citations; probe targets are hand-verified only.

**Where documented.** `packages/record/src/probes/probes.ts:6-10`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- the contract-scan's citation resolver does not check a `CONTROLS §N` citation the way it checks `SPEC §N`/`DECISIONS.md #N`; the quotes here carry no automated backstop

**Still open?** `yes` — packages/record/src/probes/probes.ts:6-10 still says 'the quotes here carry no automated backstop'; scripts/contract-scan.mjs at HEAD has no CONTROLS citation handling (grep 'CONTROLS' in the script returns nothing) and its bound 4 (:150-154) states only `SPEC §N` and `DECISIONS.md` are recognized citations.

**Is the closing act code?** `yes` (effort S). Add a `CONTROLS §N` citation form to scripts/contract-scan.mjs's citation-integrity section: a `controlsCitationPattern`, a heading resolver over docs/concept/CONTROLS.md (read-only; the sealed set is not edited), and reuse of the existing attributed-quotation check; extend the script's test with a probes.ts-shaped positive and a fabricated-quote negative; then update probes.ts:6-10 and bound 4 to say CONTROLS is now checked. Would also newly gate `docs/concept/CONTROLS.md:64-73` line-range pointers only if a range check were added (not required).

**Release tie.** `not-release-relevant` — No record ties it to the cut: not in docs/process/deferral-register.md, release-checklist.md, next-phases.md or open-items-plan.md; the probes shapes themselves are 'PROVISIONAL pre-1.0' (packages/record/src/probes/probes.ts:20), and the quotes were hand-verified (:7-8). Dev-gate coverage only.

**Risk if 0.1 ships with it open.** None functional; a probe's human-readable `target` string could drift from CONTROLS §4 wording without a gate noticing, a fidelity nit in probe reports.

### 88. Gate scripts disagree on findings stream (contract-scan stdout vs siblings stderr)

`gate-scripts-stdout-stderr-divergence` · merged from 1 reader finding(s) · readers' guess: code / horizon

**What is open.** Documented inconsistency, not marked for fixing.

**Where documented.** `scripts/docs-index-sync.mjs:9-11`; `scripts/contract-scan.mjs:4-5`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- Findings go to stderr, which matches api-reference-sync and differs from contract-scan, which prints to stdout.

**Still open?** `yes` — At HEAD contract-scan prints findings via console.log (scripts/contract-scan.mjs:514,557; header :4-5 'on stdout'), while api-reference-sync (scripts/api-reference-sync.mjs:55) and docs-index-sync (scripts/docs-index-sync.mjs:80) use console.error; docs-index-sync.mjs:10-11 documents the divergence. No commit in git log unifies the streams. The framing 'documented inconsistency, not marked for fixing' holds — no record calls it a defect.

**Is the closing act code?** `yes` (effort S). If unified: change scripts/contract-scan.mjs:514 and :557 to console.error (or the two siblings to console.log), update the three header comments (contract-scan.mjs:4-5, docs-index-sync.mjs:10-11, api-reference-sync.mjs:9-10), and check scripts/test/*.test.mjs and any CI/checklist prose that captures stdout ('diff a new run's output', CLAUDE.md) still hold. Trivial; the recorded stance is that the divergence is acceptable, so a one-line ruling to leave it is the equally valid close.

**Release tie.** `not-release-relevant` — No mention in docs/process/release-checklist.md, deferral-register.md, next-phases.md or open-items-plan.md; CI (.github/workflows/ci.yml) only consumes exit codes. Purely internal tooling ergonomics.

**Risk if 0.1 ships with it open.** None to an adopter; a maintainer piping gate output might miss findings on one stream vs the other.

### 89. Provenance LATER-STEP riders unbuilt: kernel/context.ts extraction, mintToken injectable seam, export-completeness policy

`provenance-structural-riders-unbuilt` · merged from 1 reader finding(s) · readers' guess: code / horizon

**What is open.** Recorded explicitly not as an action list; none exists in the tree (verified).

**Where documented.** `docs/process/adopted-source-provenance.md:383-385,607-612`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "the `kernel/context.ts` extraction (kills a kernel→create.ts type back-edge; type-only, zero behavior), a `mintToken` injectable seam" — `docs/process/adopted-source-provenance.md`

**Still open?** `partial` — Two of the three riders have landed under other names: the `mintToken` injectable seam exists as `tokenSource` (packages/record/src/create.ts:92 'tokenSource is the injectable single-use-token minter', :242 `tokenSource: () => string = defaultTokenSource`), and the named index-export gap `OpenOptions` is exported (packages/record/src/index.ts:40). The `kernel/context.ts` extraction has NOT landed: no such file in packages/record/src/kernel/ (ls shows 14 files, none context.ts) and every kernel module still imports `KernelContext` from '../create.js' (kernel/finalize.ts:108, seal.ts:29, open.ts:23, redeem.ts:83, etc.). The source itself frames them as 'a map of what R1 found, not as an action list' (docs/process/adopted-source-provenance.md:610-611); no register row, next-phases entry, or open-items-plan checkbox names the extraction.

**Is the closing act code?** `yes` (effort S). Only the back-edge rider remains: move the `KernelContext`/`ResolvedProfile` type declarations out of packages/record/src/create.ts into a new packages/record/src/kernel/context.ts and repoint the ~10 `import type { KernelContext, ResolvedProfile } from '../create.js'` lines in kernel/*.ts (type-only, zero behavior; create.ts re-exports or imports them back). No test change beyond typecheck; api-sync unaffected if the names are not public.

**Release tie.** `not-release-relevant` — docs/process/adopted-source-provenance.md:610-611 explicitly 'not as an action list'; absent from docs/process/deferral-register.md rows 1/19/22 (:11-13), docs/process/next-phases.md 'What gates the next cut' (:26), and docs/process/open-items-plan.md stages 4-7. Internal type layout has no publish consequence.

**Risk if 0.1 ships with it open.** None visible to an adopter — a type-only kernel-to-create.ts import back-edge is an internal layering nit with no runtime or API effect.

### 90. `magnitude` payload field never value-pinned

`magnitude-never-value-pinned` · merged from 1 reader finding(s) · readers' guess: code / unclear

**What is open.** Seven of eight post-oracle conditional fields have byte pins; magnitude is only asserted absent.

**Where documented.** `docs/process/implementation-status.md:2201-2205`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "deliberately asserts its ABSENCE rather than pinning a value" — `docs/process/implementation-status.md`

**Still open?** `yes` — packages/record/test/byte-regression/findings.test.ts:158 still asserts `'magnitude' in raisedPayload === false`; no byte-regression file contains a `magnitude:` fixture value (grep over packages/record/test/byte-regression/*.ts hits only that absence line); docs/process/implementation-status.md:2201-2205 records it as 'deliberately asserts its ABSENCE rather than pinning a value'. Git log shows no later pin commit after f7de9ed touching magnitude. Note the source frames this as a deliberate scoping note ('named here rather than folded into that count'), not a declared gap awaiting closure.

**Is the closing act code?** `yes` (effort S). Add one flow to packages/record/test/byte-regression/findings.test.ts (or a sibling) that raises a finding with `magnitude` set (string and/or numeric, per FindingRaisedPayload/AcknowledgedPayload in types.ts) via deterministicSeams, and freeze the resulting transition digest/canonical bytes as a new PINNED_ literal; byte-stability.test.ts stays untouched (frozen oracle, separate compatibility claim).

**Release tie.** `not-release-relevant` — No register row, no next-phases mention, no open-items-plan checkbox; docs/process/implementation-status.md:2201-2205 is the only site and records a choice, not a deferral. Self-regression pins guard future drift, not the 0.1 artifact's correctness (implementation-status.md:2249-2253 'these pins prove non-drift, never correctness').

**Risk if 0.1 ships with it open.** A future encoding change to the `magnitude` field's canonical bytes would not be caught by any pin; a 0.1 adopter sees no difference at release.

### 91. Defensive unknown-profile arms at finalize/seal not exercised by tests

`defensive-unknown-profile-arms-untested` · merged from 1 reader finding(s) · readers' guess: code / unclear

**What is open.** Declared defensive; open() is the runtime producer.

**Where documented.** `packages/record/src/kernel/finalize.ts:209-215`; `packages/record/src/kernel/seal.ts:63-67`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- Not exercised by this build's tests (open() is the runtime producer); defensive.

**Still open?** `yes` — Comments stand verbatim: packages/record/src/kernel/finalize.ts:209-214 'Not exercised by this build's tests (open() is the runtime producer); defensive.' and kernel/seal.ts:63-66 'no test at this build step constructs it'. The only two-instance unknown-profile gate-order test drives `redeem()` (packages/record/test/effect-result.test.ts:237-256, `unaware.operator.redeem`), not finalize or seal; seal.test.ts mentions unknown-profile only in its header ladder (:6, :19) with no test; refusal-matrix.test.ts:285 and unknown-ids.test.ts:37 exercise stage() only. Grep for 'unaware' across packages/record/test finds only effect-result.test.ts:250.

**Is the closing act code?** `yes` (effort S). Two tests reusing effect-result.test.ts:237-256's 'established two-instance shape': open (and for seal, confirm) a record under one create() instance, then call `unaware.operator.finalize(...)` and `unaware.operator.seal(...)` under a second instance sharing the store whose profile catalog lacks the profileId; assert refused/unknown-profile, no append. Then update the two source comments (finalize.ts:212-214, seal.ts:64-65) so they stop claiming the arm is untested.

**Release tie.** `not-release-relevant` — Not named in docs/process/deferral-register.md (rows 1/19/22 at :11-13), docs/process/next-phases.md 'What gates the next cut' (:26), docs/process/release-checklist.md, or any open-items-plan stage; the source calls the arms defensive against a caller/config error a coherent instance never produces (finalize.ts:210-211).

**Risk if 0.1 ships with it open.** A misconfigured multi-instance deployment (record finalized/sealed by an instance not configured with its profile) relies on an untested fail-closed branch; behavior is simple and mirrors the tested redeem() arm, so exposure is low.

### 92. Findings-flow composite pin across every earlier gate tier and its test plan not recorded landed

`findings-composite-pin-test-plan-residuals` · merged from 1 reader finding(s) · readers' guess: code / unclear

**What is open.** Of four §10.2 residuals the shared coverage function landed; the per-tier composite (zero consultation, finding and ack transitions on earlier-gate refusals) and the ~25-item test plan are not recorded as landed.

**Where documented.** `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md:1261`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- the composite pin (an earlier-gate refusal carrying a well-formed consultations list appends zero consultation and zero finding/ack transitions

**Still open?** `partial` — The step-7 exit row records both increments landed and §10.2 'whole in this build' (docs/process/implementation-status.md:172, :424) but names no composite pin and no test plan; grep for 'composite' across docs/process and packages/record/test returns nothing. What exists: one single-tier pin — consultations.test.ts:292 'a refusal path records no consultation: drifted content refuses with the chain untouched' (content-drift only, not 'one representative per earlier tier'); 23 findings tests exist (findings.test.ts:71-388, findings-seams.test.ts:40-348), which is the ~25-item plan in substance though never recorded as such. The finding/ack half is structurally vacuous: finalize() never appends finding-raised/acknowledged transitions on any path — only raiseFinding/acknowledge do (kernel/findings-seams.ts) — so only the per-tier zero-consultation half is a real gap. The plan itself framed these as residuals 'to re-derive' (…adoption.md:1261), not as owed work, and open-items-plan.md stages 1-7 and appendix (:31-318) never list it.

**Is the closing act code?** `yes` (effort S). Add one parameterized test (e.g. in packages/record/test/consultations.test.ts or findings.test.ts) that, with a well-formed consultations bag supplied, drives each earlier-gate refusal — chain-compromise (rung 1), unknown-profile/identity (2-3), sod (3.5), content-drift (4), policy-drift (4.5) — and asserts the appended chain carries zero 'consultation' and zero finding/ack transitions. No src change.

**Release tie.** `not-release-relevant` — No register row, release-checklist item, or next-phases entry mentions it; docs/process/open-items-plan.md:299-318 appendix and stages 6-7 (:238-297) omit it entirely; the only source is a pre-build plan bullet (docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md:1261) that predates the step-7 exit.

**Risk if 0.1 ships with it open.** A future rung reordering could silently start appending consultation transitions on an earlier-gate refusal path without a multi-tier test catching it; no adopter-visible behavior changes today.

### 93. Inherited analysis findings: asymmetric outcome-constructor guard and masking-scope fixture unverified closed

`inherited-analysis-findings-unverified` · merged from 1 reader finding(s) · readers' guess: code / unclear

**What is open.** Of four inherited findings, order tests closed at step 1 and the duplicated reserved-kind literal is likely closed by RESERVED_CONSULTATION_KINDS; the asymmetric misuse guard and masking fixture remain unverified.

**Where documented.** `docs/superpowers/specs/2026-08-02-reference-implementation-adoption-design.md:303`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "a duplicated reserved-kind literal in two modules with no test pinning them equal; an asymmetric misuse guard" — `docs/superpowers/specs/2026-08-02-reference-implementation-adoption-design.md`

**Still open?** `uncertain` — The four findings appear only in the design doc (docs/superpowers/specs/2026-08-02-reference-implementation-adoption-design.md:303-308); no process doc, CHANGELOG entry, or test comment names 'asymmetric misuse guard' or 'masking-scope fixture' (repo-wide grep returns only that design doc). Against the current tree: the reserved-kind literal is one shared constant (packages/record/src/config.ts:128 RESERVED_CONSULTATION_KINDS, imported at kernel/consultations.ts:19) so that finding is closed by construction; the outcome constructors are now symmetric — ok() (outcome.ts:39), refused() and unavailable() (outcome.ts:56-71) none throw, refused()'s code is restricted at the type level (Exclude<RefusalCode,'availability'>), and outcome-model.test.ts:124 pins 'refused() never throws, for any RefusalCode it can mint' — so the asymmetry as described no longer exists, though nothing records it as deliberately closed; the masking-scope fixture has no identifiable counterpart (only signing.test.ts:154-184 uses 'mask', unrelated). Adjacent-pair order tests closed at step 1 (implementation-status.md:166 kernel exit).

**Is the closing act code?** `yes` (effort S). If judged still owed: (a) confirm the constructor asymmetry is gone — possibly add a one-line note in outcome-model.test.ts; (b) identify which validation throw the reference's 'masking-scope fixture' targeted (likely validateProfile/validateConsultations in config.ts or kernel/consultations.ts) and add a test asserting the throw is not masked by an earlier throw. Test-only work.

**Release tie.** `not-release-relevant` — Not in deferral-register.md, release-checklist.md, next-phases.md, or open-items-plan.md; the design doc lists them as content 'held over as content for this repository's own register' (…adoption-design.md:298) and the register never took them.

**Risk if 0.1 ships with it open.** At most an untested masking corner in a construction-time validation throw; no adopter-facing behavior is known to be wrong.

### 94. Gate scripts read only tracked files; untracked docs invisible until `git add`

`critic-1-gate-scripts-read-only-tracked-files-unt` · merged from 1 reader finding(s) · readers' guess: code / horizon

**What is open.** contract-scan and docs-index-sync enumerate via `git ls-files`, so a new untracked spec/plan/analysis document is not scanned or counted until staged; every increment record has had to note 're-run after the untracked documents were staged'. No script change is scheduled to scan the working tree.

**Where documented.** `scripts/docs-index-sync.mjs:17 (also docs/process/implementation-status.md:3549,3752)`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "document is invisible until `git add`" — `scripts/docs-index-sync.mjs`

**Still open?** `partial` — Both scripts still enumerate via `git ls-files`: scripts/contract-scan.mjs:17-24 (`tracked()`), scripts/docs-index-sync.mjs:26-35 (`trackedBasenames`). docs-index-sync.mjs:16-17 states it as a declared bound ("reads tracked files only, so an unstaged new document is invisible until `git add`"). Increment records still work around it (implementation-status.md:3555 "untracked documents were staged, since the scan reaches them only once they are tracked"; :3674; :3834 "re-run after the two untracked"). However NO process document lists it as an open item: no deferral-register row, no open-items-plan checkbox, no next-phases mention (grep for untracked/ls-files across docs/process returns only implementation-status.md narrative). It is a recorded design bound with a working procedure, not a scheduled fix — 'partial' because the behavior exists but nothing frames it as unresolved.

**Is the closing act code?** `yes` (effort S). If closed at all: change `tracked()` in scripts/contract-scan.mjs:17 and `trackedBasenames()` in scripts/docs-index-sync.mjs:26 to also include untracked-but-not-ignored files (`git ls-files -z --others --exclude-standard` merged with the tracked list), keeping the CLAUDE.md exclusion at contract-scan.mjs:23; update each script's bounds comment (docs-index-sync.mjs:13-18) and the CLAUDE.md/implementation-status description of what the gates read. Trade-off: the current tracked-only reading matches exactly what CI sees on a checkout, so a working-tree scan would diverge from the CI gate's own semantics — a reason the bound may be deliberate.

**Release tie.** `not-release-relevant` — No document ties it to the cut: absent from deferral-register.md, release-checklist.md, next-phases.md, and open-items-plan.md (grep confirmed). It affects only maintainer workflow inside this repo, never a published artifact; CI (ci.yml) always runs against a checkout where every file is tracked.

**Risk if 0.1 ships with it open.** None for an adopter of 0.1 — the gates run identically in CI; only a maintainer authoring new docs must remember to `git add` before a local gate run reflects them.

### 95. Cross-backing byte identity covers only three scripted flows

`cross-backing-byte-identity-three-flows` · merged from 1 reader finding(s) · readers' guess: code / post-0.1

**What is open.** Only happyFlow, refusalFlow and tokenFlow are compared across Memory/SQLite/Postgres; decline, findings, multi-leg, recovery, provenance, result, expiry and signing flows have no cross-backing pin.

**Where documented.** `packages/store-postgres/test/cross-backing-byte-identity.test.ts:1-3`; `packages/record/test/helpers/byte-identity-flows.ts:322-375`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- the same scripted flows, under the same fixed clock/id/token knobs, produce chains byte-identical between MemoryStore and PostgresStore

**Still open?** `yes` — packages/record/test/helpers/byte-identity-flows.ts exports exactly happyFlow (:43), refusalFlow (:58), tokenFlow (:80) and assertByteIdentical (:98) in a 113-line file; packages/store-postgres/test/cross-backing-byte-identity.test.ts:14-32 and packages/record/test/cross-backing-byte-identity.test.ts:19-30 drive only those three. No decline/findings/recovery/provenance/result/expiry/signing flow exists there; CHANGELOG.md:111's 'byte-identical' is about pre-decline chains, not cross-backing; commit 536fdba / implementation-status.md:2331-2345 (Finding E) scopes the DECLARATION-gate byte-identity claim, not this test.

**Is the closing act code?** `yes` (effort M). Add further scripted flows to packages/record/test/helpers/byte-identity-flows.ts (e.g. declineFlow, findingsFlow, expiryFlow via createWithClock's fixed clock, signingFlow with a deterministic stub signer) and one test per flow in both cross-backing-byte-identity.test.ts files (record: Memory<->Sqlite; store-postgres: Memory<->Postgres). Test-only; must NOT touch packages/record/test/byte-stability.test.ts's frozen digests.

**Release tie.** `not-release-relevant` — SPEC.md:1228 requires only that backings 'produce byte-identical chains from the same scripted flow under a fixed clock' — satisfied as stated; deferral-register row 15 retired on the three-part shape including 'a third leg added to the cross-backing byte-identity test' (next-phases.md:196-210); no register row, open-items-plan checkbox, or release-checklist line asks for more flows. The conformance suite (50 tests, next-phases.md:206) separately holds the backings equivalent at the Store level.

**Risk if 0.1 ships with it open.** A backing-specific serialization or ordering divergence in a feature-declared flow (decline, findings, recovery, expiry, signing) would not be caught by the byte-identity pin, only indirectly by the Store-level conformance suite; an adopter verifying chains across a Memory-to-Postgres migration could meet a digest mismatch the repo never measured.

### 96. Row-22 filing-time corpus census (72/64/68) withdrawn, not re-derived

`row22-corpus-census-withdrawn` · merged from 5 reader finding(s) · readers' guess: mixed / unclear

**What is open.** The three figures cannot all be true and were withdrawn; re-derivation requires instrumenting store.appendTransition inside the candidate walk and reporting three reconciling counts against the current tree. No document has done so; no trigger attached.

**Where documented.** `docs/process/deferral-register.md:13`; `docs/process/implementation-status.md:2742`; `docs/process/implementation-status.md:2633-2635`; `docs/analysis/2026-08-24-no-edge-containment-investigation.md:85-94`; `docs/superpowers/specs/2026-08-24-no-edge-containment-design.md:62`; `docs/superpowers/specs/2026-08-24-row-22-truth-repairs-design.md:40`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "The corpus census recorded at filing time is WITHDRAWN pending re-derivation" — `docs/process/deferral-register.md`
- "The census stays withdrawn; nothing here re-derives it" — `docs/process/implementation-status.md`

**Still open?** `yes` — docs/process/deferral-register.md:13 (row 22 text still says 'The corpus census recorded at filing time is WITHDRAWN pending re-derivation'); docs/analysis/2026-08-24-no-edge-containment-investigation.md:85-94 states the re-derivation method and 'Until that is done'; docs/process/implementation-status.md:2742 ('The census stays withdrawn; nothing here re-derives it'). No later document (sidecar-contract, no-edge containment, orphans-report, first-use, checklist refresh increments per git log) reports the three reconciling counts; the row's own text at HEAD carries no figure.

**Is the closing act code?** `partial` (effort S). Re-derivation is a measurement, not a shipped change: a scratch counting wrapper around store.appendTransition inside appendChainCompromise's candidate walk (packages/record/src/kernel/finalize.ts), run over the test corpus, reporting total calls / candidate-0 landings / list exhaustions, then a docs edit to deferral-register.md row 22 and the investigation record. Alternative closing act is docs-only: leave the withdrawal standing (which the investigation already does, :85-94 'carried nowhere as a live figure'). No production code changes either way; no trigger attached.

**Release tie.** `not-release-relevant` — docs/analysis/2026-08-24-no-edge-containment-investigation.md:85-94 withdraws the figure and keeps only a qualitative claim; the release-checklist row-22 item (docs/process/release-checklist.md:172-219) never mentions the census and pre-argues carry-forward without it; no open-items-plan checkbox exists. The withdrawal is itself the honest terminal state; re-derivation is optional curiosity.

**Risk if 0.1 ships with it open.** None functional: an adopter reads a row that honestly says a figure was withdrawn; the only cost is a quantitative gap in how often the no-edge path lands versus mints an orphan.

### 97. AL2 pins at the redemption prologue and decline rest on structural proofs, no mutation witness

`al2-pins-no-mutation-witness-redemption-prologue` · merged from 1 reader finding(s) · readers' guess: code / unclear

**What is open.** Decline's rung pair, the acknowledge pin, five deepened sites and four token-seam cells rely on intactness guard plus verifier-call delta rather than a mutation that flips the verdict — recorded as weaker evidence.

**Where documented.** `docs/process/implementation-status.md:2499-2509`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "no mutation anywhere in this increment witnesses the signature disjunct at the redemption prologue" — `docs/process/implementation-status.md`

**Still open?** `yes` — implementation-status.md:2499-2507 and next-phases.md:184-193 (row 21 retirement note) both record that the only redeem.ts mutation neutered the enlistment branch, not the signature disjunct, and that decline's adjacent pair, the acknowledge pin, five deepened sites and four token cells have no mutation witness. Note decline's two signature-broken pins WERE mutation-proved (next-phases.md:154-155) — only its rung-(1)-beats-(2) ladder pair is unwitnessed. No later commit (git log through 4e80bf7: row-22 repairs, sidecar contract, no-edge containment, orphans report, first-use, checklist refresh) records a redemption-prologue signature-disjunct mutation.

**Is the closing act code?** `partial` (effort S). The closing act is a proof run, not a landed change: temporarily rewrite the `!(await signatureLayerHolds(...))` disjunct at the redemption prologue in packages/record/src/kernel/redeem.ts (and the findings prologue for acknowledge) to `false`, run vitest, confirm the four token cells + acknowledge + un-enlisted redeem pins in signing-enforce.test.ts fail, revert, and record the result in implementation-status.md's increment section. If a pin does NOT fail, that spawns a real test fix (strengthening the delta assertions). Zero committed src change in the expected case.

**Release tie.** `not-release-relevant` — Rows 20 and 21 are retired with this weakness explicitly recorded as accepted evidence (next-phases.md:186-193, implementation-status.md:2505-2507 'recorded as such'); no live row, checklist item (release-checklist.md:159-200 covers only rows 19/22) or trigger names it.

**Risk if 0.1 ships with it open.** Adopters get enforcement whose tests rest on structural proofs (intactness guard + verifier-call delta) rather than mutation evidence; the delta already proves the disjunct ran, so the residual is confidence, not behavior.

### 98. contract-scan citation resolver: eight declared unchecked classes (bound 8 a live risk)

`contract-scan-resolver-bounds` · merged from 1 reader finding(s) · readers' guess: decision / horizon

**What is open.** Reverse attribution, unquoted claims, quote-in-wrong-section, other citation forms, attribution across a word, quotations past a run's end, under 6 chars, non-ASCII quotes — all silent by measured choice; bound 5 asks re-measurement before naming a site in-class.

**Where documented.** `scripts/contract-scan.mjs:128-181,209-217`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- That miss is bounds 5 and 6, accepted and documented rather than closed: every widening tried that admits words bought false positives and no true positives.

**Still open?** `yes` — scripts/contract-scan.mjs:128-181 still enumerates all eight bounds at HEAD; bounds 5/6 'accepted and documented rather than closed' (scripts/contract-scan.mjs:208-209); no git log entry narrows the resolver and no register row tracks it (grep of docs/process/deferral-register.md, open-items-plan.md finds nothing). Framing accepted: these are deliberately accepted bounds, not a defect queue — only bound 8 (non-ASCII quotes, :178-181) is called a 'live risk'.

**Is the closing act code?** `partial` (effort S). Only if a bound is ruled worth closing: bound 8 is the cheap one — widen the quotation regex in scripts/contract-scan.mjs's citation-integrity section to accept curly quotes (or add a per-line pattern rejecting non-ASCII quotes in tracked TS), with a probe case in the scan's own test. Bounds 1/5/6 were measured to buy false positives; closing them means re-measuring a widened gap on the corpus per the script's own instruction (:170-173). Bounds 2/3/4/7 are out of the tool's class. Otherwise documentation stays as is.

**Release tie.** `not-release-relevant` — No record ties the resolver's bounds to the cut: docs/process/release-checklist.md:115 only runs `pnpm contract-scan` as-is; deferral-register.md and next-phases.md never mention the resolver's bounds. Internal dev-gate coverage, invisible to a package adopter.

**Risk if 0.1 ships with it open.** None to an adopter — a wrong or curly-quoted SPEC citation in a code comment could pass the scan, a maintainer-facing documentation-fidelity risk only.

### 99. docs-index-sync: presence and arithmetic only, docs/analysis never tabulated; dead `analysisWordOne` branch

`docs-index-sync-bounds-and-dead-branch` · merged from 3 reader finding(s) · readers' guess: mixed / horizon

**What is open.** Wrong dates/names pass; a filename in an unrelated sentence counts; docs/analysis/ has only a count, no rows. The analysisWordOne branch parses a phrasing that no longer occurs and would parse count 1 instead of firing count-absent on regression. Parked.

**Where documented.** `docs/process/implementation-status.md:2102-2105`; `docs/process/implementation-status.md:2171-2174`; `scripts/docs-index-sync.mjs:13-18`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "proves presence and arithmetic, never accuracy" — `docs/process/implementation-status.md`
- "parses a "holds one file" phrasing that no longer occurs anywhere in the tree" — `docs/process/implementation-status.md`

**Still open?** `yes` — scripts/docs-index-sync.mjs:13-18 still states presence/arithmetic-only and 'docs/analysis/ ... has never been tabulated'; the `analysisWordOne` branch is still present at scripts/docs-index-sync.mjs:41,45; docs/process/implementation-status.md:2167-2174 lists it among 'Four items, parked rather than acted on'. No later commit removes it (git log grep shows none).

**Is the closing act code?** `partial` (effort S). Dead branch: delete `analysisWordOne` at scripts/docs-index-sync.mjs:41 and the `: analysisWordOne ? 1` fallback at :45 so a regression to 'holds one file' fires `count-absent`; add a case to scripts/test/docs-index-sync.test.mjs. Tabulating docs/analysis/ would be a docs change to docs/superpowers/INDEX.md plus a new `file-not-indexed` direction in the script. The accuracy bound (wrong dates/names pass) is inherent and stays documented.

**Release tie.** `not-release-relevant` — Explicitly 'parked' in docs/process/implementation-status.md:2167 with no trigger; docs/process/release-checklist.md:115 runs `pnpm docs-index-sync` as-is; not in deferral-register or open-items-plan. Internal increment-record hygiene.

**Risk if 0.1 ships with it open.** None to an adopter — only an internal INDEX.md count could regress silently to a wrong '1' for docs/analysis/.

### 100. first-use.mjs exits 0 with the PostgreSQL half skipped when VIDIMERA_PG_URL is unset

`first-use-silent-pg-skip` · merged from 1 reader finding(s) · readers' guess: decision / unclear

**What is open.** A local or misconfigured dispatch passes without the adapter proof; contrasts with the test globalSetup's deliberate no-skip.

**Where documented.** `scripts/first-use.mjs:104-116`; `packages/store-postgres/test/setup/global-setup.ts:3-4`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "first-use: NOTE — VIDIMERA_PG_URL not set; the PostgreSQL half did not run" — `scripts/first-use.mjs`

**Still open?** `partial` — The behavior exists as described: scripts/first-use.mjs:104-116 skips the PostgreSQL half and exits 0 when VIDIMERA_PG_URL is unset. But the 'silent'/'accidental' framing is refuted: it is a design ruling — docs/superpowers/specs/2026-08-29-first-use-proof-design.md:123-124 'if absent, the Postgres half is skipped WITH a printed notice, never silently (a local dry run without a server should still ...)'; the script prints a stderr NOTE (:115) and the summary line says 'postgres half SKIPPED' (:104,118-121); the workflow always sets VIDIMERA_PG_URL (docs/superpowers/plans/2026-08-29-first-use-proof.md:343). The contrast with packages/store-postgres/test/setup/global-setup.ts:3-4's no-skip discipline is real but the two serve different purposes (a per-run test gate versus a dispatch-only proof with a local dry-run mode). Hardening to fail-closed under CI is not among the three parked script improvements (docs/process/release-checklist.md:150-154) and no record proposes it.

**Is the closing act code?** `partial` (effort S). If ruled fail-closed in CI: in scripts/first-use.mjs:104-116 make the missing-URL branch `process.exit(1)` when `FIRST_USE_SOURCE` is set (the workflow sets it) or add a `FIRST_USE_REQUIRE_PG=1` env exported by .github/workflows/first-use.yml, keeping the local dry-run skip; must ride the registry-dispatch commit so the recorded tarball run's script stays byte-identical until then (release-checklist.md:150-151). If ruled as-designed, nothing changes.

**Release tie.** `not-release-relevant` — docs/process/release-checklist.md:144-154 reuses the workflow with VIDIMERA_PG_URL set by the job and names exactly three parked improvements, none of which is this; the design's ruling (docs/superpowers/specs/2026-08-29-first-use-proof-design.md:123-124) records the skip-with-notice as intended. Nothing ties a fail-closed change to the cut.

**Risk if 0.1 ships with it open.** A future dispatch whose env wiring drops VIDIMERA_PG_URL would report green with the adapter half unproven, visible only to someone reading the summary line or stderr NOTE.

### 101. Windows CI leg runs against the runner image's unpinned PostgreSQL

`windows-ci-unpinned-postgres` · merged from 1 reader finding(s) · readers' guess: decision / horizon

**What is open.** The embedded server cannot start under the elevated token, so the suite uses whatever version/credentials the image ships; neither declared nor pinned.

**Where documented.** `.github/workflows/ci.yml:55-71`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- The runner image preinstalls PostgreSQL as a proper service under a non-admin account: start it and hand the suite its URL

**Still open?** `partial` — .github/workflows/ci.yml:55-71 still starts the runner image's preinstalled `postgresql*` service with hardcoded `postgres:root` credentials and no version pin; docs/analysis/2026-08-20-artifact-postures.md:47-49 and :57-58 acknowledge 'whatever the Windows runner image preinstalls' / 'the Windows image's floating service version' as the recorded evidence bound. The posture is on record (commit 784eb83 'The Windows leg gets a real server'), but no ruling explicitly accepts the floating version as a permanent bound the way ruling 3 does for the beta pin.

**Is the closing act code?** `partial` (effort S). If pinned: edit .github/workflows/ci.yml:55-71 to install a specific PostgreSQL version on the Windows runner (or assert `SELECT version()` matches a declared major and fail otherwise) and stop relying on the image's `postgres:root` default; if accepted: a one-paragraph ruling in docs/analysis (docs-only). Either way no packages/*/src change.

**Release tie.** `not-release-relevant` — docs/analysis/2026-08-20-artifact-postures.md:47-49,57-58 records the floating Windows version as an evidence bound with no trigger; docs/process/open-items-plan.md:308-312 lists 'the CI matrix's exact-floor-on-ubuntu-only bound (phase-3 ruling 1, deliberate)' under surveyed-and-not-open; no deferral-register row or release-checklist line names the Windows server version.

**Risk if 0.1 ships with it open.** A runner-image update could silently change the PostgreSQL major the Windows leg tests (or its default credentials), making a red or green Windows leg mean something different from what the record claims, with no gate noticing.

### 102. `observedAt` admitted on any obtained consultation — wider than SPEC:1312's letter

`observedat-wider-admission-reading` · merged from 1 reader finding(s) · readers' guess: decision / horizon

**What is open.** SPEC §14 admits authority timestamps for required consultations; finalize admits observedAt on any obtained consultation of a signing profile. Defended reading, not reconciled.

**Where documented.** `docs/process/implementation-status.md:910`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "A wider admission than the letter of SPEC:1312 names" — `docs/process/implementation-status.md`

**Still open?** `partial` — docs/process/implementation-status.md:905-912 records the reading as DEFENDED ("defended by a sentence the spec already states elsewhere, not a divergence from either"), i.e. a closed ruling, not an open finding; packages/record/src/kernel/finalize.ts:246-259 and kernel/decline.ts:107-109 implement it (observedAt gated only on profile.signing, any obtained kind). SPEC.md:1311-1312 still reads "AL2 admits authority timestamps inside digested payloads for required consultations". No register row, open-items-plan checkbox, or analysis ruling lists it as open (grep for "wider admission"/"SPEC:1312" hits only implementation-status.md:901,910). What is open is at most a residual spec-letter-vs-build reading with no owner action named.

**Is the closing act code?** `partial` (effort S). If the ruling were reversed (restrict observedAt to required kinds), finalize.ts ~line 246-259 and decline.ts ~107 would gain a required-set check and a new throw or refusal, plus tests in the AL2 freshness suite. If the sealed letter were widened instead, it is a docs-only sanctioned SPEC edit. As recorded (defended), nothing needs to change.

**Release tie.** `not-release-relevant` — No document ties it to the 0.1 cut: next-phases.md:26-100 gates the cut on rows 1/19/22 only; open-items-plan.md stages 3-7 never name it; implementation-status.md:910 closes it as a defended reading at the AL2 freshness increment.

**Risk if 0.1 ships with it open.** An adopter comparing SPEC §11.1's letter against the build would see a non-required consultation's observedAt recorded as evidence rather than rejected — a documented, defended reading with no gate consequence, so no behavioral surprise beyond the spec sentence being narrower than the code.

### 103. `record-exists` Outcome carries no blocking-record locator

`record-exists-no-blocker-locator` · merged from 1 reader finding(s) · readers' guess: decision / horizon

**What is open.** open() discards C1's blockingRecordId; hosts call findNonTerminal. By design, a standing ergonomic bound.

**Where documented.** `docs/process/implementation-status.md:419,442`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "a `record-exists` refusal still names no blocking record in the `Outcome`" — `docs/process/implementation-status.md`

**Still open?** `yes` — packages/record/src/outcome.ts:29-35: the refused `Outcome` shape carries only `code`, `class`, optional `transitionRef` — no blocking-record id. packages/record/src/kernel/open.ts:264-265 consumes the store's `blockingRecordId` internally for the gated expire-then-retry; the `Outcome` returned does not surface it. docs/process/implementation-status.md:419: 'a `record-exists` refusal still names no blocking record in the `Outcome` (§8's model is untouched, by design)' and points hosts at `findNonTerminal`.

**Is the closing act code?** `partial` (effort S). Only if a decision to widen the refusal shape were taken: add an optional locator field to the refused arm in packages/record/src/outcome.ts, populate it at the `record-exists` site in packages/record/src/kernel/open.ts (~line 264), pin in open/exclusivity tests, and update docs/guide/api-reference.md via `pnpm api-sync`. But SPEC.md:517 fixes the §8 refusal model, so widening it is a sealed-set question first.

**Release tie.** `not-release-relevant` — No register row, checklist item, or open-items-plan stage names it; implementation-status.md:419 records it as 'by design' with `findNonTerminal` as the actionable path (CHANGELOG.md:28 notes `findNonTerminal` made exclusivity actionable). Not tied to the 0.1 cut anywhere.

**Risk if 0.1 ships with it open.** A host receiving `record-exists` must make one extra `findNonTerminal` call to locate the blocker — a documented ergonomic step, not a correctness gap.

### 104. appendBatch seal-finality checked at entry only

`appendbatch-seal-finality-entry-only` · merged from 1 reader finding(s) · readers' guess: decision / horizon

**What is open.** A batch with a sealed element followed by more is not stopped per element; unconstructable today since seal() uses appendTransition.

**Where documented.** `docs/process/implementation-status.md:442`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "the per-element loop does not re-evaluate seal-finality against the evolving batch" — `docs/process/implementation-status.md`

**Still open?** `yes` — docs/process/implementation-status.md:442: 'The batch bar is entry-level only — the per-element loop does not re-evaluate seal-finality against the evolving batch ... That is what §12 specifies rather than a narrowing of it, and nothing in this build can construct such a batch: `seal()` is the only producer of a `sealed` transition and sends it as a single `appendTransition`.' SPEC.md:1147-1148 confirms 'Entry-level failures — an entry compare-and-swap mismatch or C4 seal-finality — report element index 0.' A recorded spec-conformant bound, unconstructable today, not pending work.

**Is the closing act code?** `partial` (effort S). None unless a future producer sends a `sealed` element mid-batch. If defensive hardening were chosen anyway: in each `appendBatch` (packages/record/src/store/memory.ts, store/sqlite.ts, packages/store-postgres/src) refuse when an element after a `sealed` one exists (or a batch element's `to` is `sealed` and it is not last), report that element's index, and pin in the shared store conformance suite (packages/record/test/store-conformance*). Would need reconciling with SPEC.md:1145-1148's 'terminal mid-batch' rule text — a sealed-set reading question.

**Release tie.** `not-release-relevant` — No register row, checklist item, or open-items-plan stage; implementation-status.md:442 records it as §12's own specification with no constructible trigger in this build.

**Risk if 0.1 ships with it open.** None reachable for a 0.1 adopter: `seal()` is the only `sealed` producer and uses a single `appendTransition`, so no batch with a mid-batch sealed element can be formed through the public surface.

### 105. Provenance-leak disposition: extend contract-scan with sibling-project name patterns vs out-of-band grep

`provenance-leak-scan-pattern-owner-call` · merged from 1 reader finding(s) · readers' guess: decision / unclear

**What is open.** CLAUDE.md now instructs extending patterns and one extension happened, but the owner call itself is not recorded closed.

**Where documented.** `docs/superpowers/plans/2026-08-03-autonomous-step-1-completion.md:228`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "whether to extend `contract-scan.mjs` with a name pattern, or handle it as a U9 line item plus an out-of-band grep" — `docs/superpowers/plans/2026-08-03-autonomous-step-1-completion.md`

**Still open?** `yes` — scripts/contract-scan.mjs's codeOnlyPatterns (:102-111) and the patterns above them (:60-100) are all generic shapes (design §, slice, task, OQ, commit ref, foreign labels); no sibling-project name pattern exists — the one extension was the ed25519/ed448 negative-lookahead EXCLUSION (:76-85), not a name pattern. CLAUDE.md turns the call into a standing 'should extend' instruction for a maintainer, not a recorded decision; the plan bullet still reads 'the first remains an owner call' (docs/superpowers/plans/2026-08-03-autonomous-step-1-completion.md:228-229). The practical driver is gone: scan exits 0, scrub complete, register row 7 retired (same bullet, :232-234).

**Is the closing act code?** `partial` (effort S). If the owner chooses 'extend': add a private-name pattern (project name, package name, tooling) to scripts/contract-scan.mjs's repoWidePatterns/codeOnlyPatterns with a measured-before-landing comment like the others. If 'out-of-band grep' is ratified, a one-line note in docs/process (or leaving CLAUDE.md as is) closes it with no code.

**Release tie.** `not-release-relevant` — No register row, checklist item, or next-phases entry names it; the standalone-contract scan is already a CI gate and clean (CLAUDE.md; docs/process/next-phases.md:355-357 'measured clean'). A leak would matter for a public repo, but the completed scrub and the green scan already cover the known risk.

**Risk if 0.1 ships with it open.** A future comment naming a private sibling project would pass the scan unflagged; today's tree carries none, so 0.1 adopters see nothing.

### 106. Due-`open` rough edge: no argument-free resolver

`due-open-no-argument-free-resolver` · merged from 3 reader finding(s) · readers' guess: decision / horizon

**What is open.** redeem() cannot expire a due open record and finalize() needs real arguments, so it resolves only at the next genuine finalize()/open(). Spec's own shape; no register row; a future operator seam would be a scope decision.

**Where documented.** `docs/process/implementation-status.md:168`; `docs/process/implementation-status.md:442`; `docs/superpowers/specs/2026-08-14-redemption-clocks-design.md:146`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "no argument-free resolver exists for a due-`open` record" — `docs/process/implementation-status.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- The due-`open` rough edge, recorded honestly: a due-`open` record has no argument-free resolver

**Still open?** `yes` — Still the shipped shape: packages/record/src/kernel/redeem.ts:47-52 and :261-263 pin that `redeem()` refuses `unredeemable-state` on a due-open record without writing an edge (SPEC.md:384 requires this); docs/process/implementation-status.md:442 records the rough edge 'beside the recipe'; docs/superpowers/specs/2026-08-14-redemption-clocks-design.md:146-150 says 'not a register row (it is the spec's own shape, not deferred work)'. docs/process/open-items-plan.md:306 lists it under 'Appendix — surveyed and not open'. So it is a recorded limit, not pending work — 'open' only in the sense that the behavior remains.

**Is the closing act code?** `partial` (effort M). None as a limit. Adding an argument-free due-open resolver (e.g. an operator `expire(recordId)` or a sweep rung) would contradict SPEC.md:377-378 ('no scheduler and no public `expire()`') and SPEC.md:384, so it would be a sealed-set revision via SCOPING-GUIDE §§1-2 first; only if that sanction were granted would code follow in packages/record/src/kernel/redeem.ts or a new kernel/expire.ts, plus clocks.test.ts pins and docs/guide/integrating.md.

**Release tie.** `not-release-relevant` — docs/process/open-items-plan.md:299-307 places it in the 'surveyed and not open' appendix, not in stages 4/5 (pre-cut) nor 6/7; no deferral-register row exists (2026-08-14-redemption-clocks-design.md:149-150); docs/guide/integrating.md:445-461 already documents the sweep bound to adopters.

**Risk if 0.1 ships with it open.** An adopter's due-open record stays `open` until the next genuine `finalize()` or a fresh `open()` for the pair — a lazy, spec-specified shape the guide already describes, not a defect.

### 107. Omitting redeemBound leaves a begun record with a lost token no exit

`no-redeembound-lost-token-strand` · merged from 2 reader finding(s) · readers' guess: decision / horizon

**What is open.** A redeeming record's sole exit is completeRedemption with the token; listDue is blind to it. SHOULD-not-MUST per spec; host's accepted risk; no operator escape hatch.

**Where documented.** `docs/process/implementation-status.md:441`; `packages/record/test/redeem-token.test.ts:523,565`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "a begun record with a lost token has NO exit in this build except completion with the token — a host that declines the redeemBound SHOULD" — `packages/record/test/redeem-token.test.ts`

**Still open?** `yes` — Pinned as current behavior: packages/record/test/redeem-token.test.ts:523 test 'a begun record with a lost token has NO exit in this build except completion with the token' and :565 'no dueAt exists — the sweep is blind to the stranded record'. implementation-status.md:441(d) states 'safe to operate wherever a host declares `redeemBound`'. docs/process/open-items-plan.md:307 lists 'the omitted-`redeemBound` strand risk (a host's recorded choice)' under 'surveyed and not open'.

**Is the closing act code?** `partial` (effort M). None as recorded. An operator escape hatch for an unbounded redeeming record (e.g. an explicit `abandonRedemption()` producing `redeeming → redemption-failed` without a clock) would be a new SPEC §11.2 edge producer — sealed-set sanction first; then packages/record/src/kernel/redeem.ts, refusal/transition kinds, redeem-token.test.ts and clocks.test.ts pins. Alternatively a construction-time warning/refusal when `redeemBound` is omitted on an effect-seam profile (packages/record/src/config.ts `validateProfile`) would be code-only but inverts §9.1's SHOULD.

**Release tie.** `not-release-relevant` — docs/process/open-items-plan.md:299-307 appendix ('surveyed and not open'); no register row; docs/guide/integrating.md:445-461 documents clock resolution for bounded windows. Nothing ties it to the 0.1 cut.

**Risk if 0.1 ships with it open.** An adopter who omits `redeemBound` and loses a token has a permanently `redeeming` record (pair held, not sealable via sweep) — the risk §9.1's SHOULD warns of and the test at redeem-token.test.ts:523 names; the guide could state it more loudly.

### 108. review() and other pure reads never chain- or signature-verify

`review-pure-reads-unverified` · merged from 2 reader finding(s) · readers' guess: mixed / unclear

**What is open.** Only mutating seams enforce; a reviewer can see a projection of a chain a later seam would refuse. Decision to keep (document) or add verify-on-read.

**Where documented.** `docs/process/implementation-status.md:445`; `docs/superpowers/specs/2026-08-17-al2-signing-enforce-design.md:71-73,127`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- `review()` and the pure reads stay unverified, unchanged

**Still open?** `partial` — Still true of the tree: kernel/review.ts folds via `replay()` only (packages/record/src/kernel/review.ts:3-25) with no `verifyChain`/signature check, and the AL2 enforce design fixed the bound deliberately — "The pure reads never gate; `review()` is untouched" (docs/superpowers/specs/2026-08-17-al2-signing-enforce-design.md:127; :71-73). SPEC defines review as "a pure read; it changes no state" returning audit metadata (docs/concept/SPEC.md:609-613) and does not require it to verify, so the current behavior is spec-conformant. No register row, next-phases entry, analysis ruling, or open-items-plan checkbox proposes verify-on-read (greps for 'verify-on-read'/'pure reads' across docs/process return nothing). The guide documents the composition instead: `verifyChain` "checks linkage only" and `verifySignatures` is "the signature layer's own report" (docs/guide/concepts.md:222-223; docs/guide/integrating.md:501-503). It is a recorded bound, not tracked work; 'partial' only because no document explicitly rules the question closed the way the open-items appendix does for others.

**Is the closing act code?** `partial` (effort M). Keep-as-is: at most a guide/FAQ sentence stating that `review()` does not chain- or signature-verify and that auditors compose `verifyChain`+`verifySignatures` (docs/guide/concepts.md:222-223 already implies this). Add verify-on-read: kernel/review.ts would call chain/verify.ts (and signing/verify-signatures.ts on signing profiles) before projecting, changing review's cost from O(replay) to O(verify) and possibly its Outcome union — a SPEC §12/§8 read-surface change touching the sealed set (fresh sanction) plus new tests in packages/record/test.

**Release tie.** `not-release-relevant` — No document ties it to the cut: absent from docs/process/release-checklist.md, the live register rows (deferral-register.md:11-13), next-phases.md's 'What gates the next cut' (:26-100), and open-items-plan stages 4/5. The AL2 design recorded the bound as final for that increment (2026-08-17-al2-signing-enforce-design.md:127).

**Risk if 0.1 ships with it open.** An operator calling `review()` on a tampered chain or sidecar sees a projection that a later mutating seam would refuse; the guide's audit-read guidance mitigates this only if the adopter reads it.

### 109. AL3 external anchoring: documented-only [SKETCHED], deliberately inactive

`al3-anchoring-sketched-inactive` · merged from 8 reader finding(s) · readers' guess: decision / horizon

**What is open.** The concept set's sole remaining non-PROVEN token; out of scope by design (operator-only consumer). Activating it is a rescoping/fork through SCOPING-GUIDE §§1–2, needing a marker move.

**Where documented.** `docs/process/next-phases.md:268-272`; `docs/process/implementation-status.md:221-223,445`; `docs/concept/SPEC.md:1332`; `docs/concept/CONTROLS.md:16-18`; `docs/analysis/2026-08-20-sealed-set-sanction-2.md:32-33`; `docs/superpowers/specs/2026-08-18-self-test-tier-design.md:148`; `docs/superpowers/plans/2026-08-18-post-build-order-housekeeping.md:145-146`; `packages/record/README.md:89-93`; `README.md:113-115`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "AL3 — Anchored (documented upgrade only) [SKETCHED]" — `docs/process/next-phases.md`
- "AL3 remains the set's one genuine `[SKETCHED]`" — `docs/analysis/2026-08-20-sealed-set-sanction-2.md`
- "external anchoring (AL3) is documented and deliberately inactive." — `packages/record/README.md`

**Still open?** `yes` — docs/concept/SPEC.md:1332 still carries "AL3 — Anchored (documented upgrade only) [SKETCHED]" (SKETCHED tokens survive only in SPEC.md and README.md's legend); docs/concept/CONTROLS.md:16-18 places "external anchoring as an active level" out of scope by design; docs/process/next-phases.md:268-272 ("deliberately outside the scope ... Nothing the build order landed touches it"); docs/process/implementation-status.md:221-223 ("AL3 anchoring stays documented-only, `[SKETCHED]`"); README.md:113-115 and packages/record/README.md:91-93 ("documented and deliberately inactive"). No code path anchors chain heads. It is open only in the sense of 'not built by design'.

**Is the closing act code?** `partial` (effort XL). Activating it is a concept fork/rescoping through SCOPING-GUIDE §§1–2 (the operator-only consumer premise, CONTROLS.md:16-18, would change); if taken, code would be a new anchoring seam (periodic head-digest export to an external append-only log, a verify-against-anchor probe alongside packages/record/src/probes, profile field + config.ts guard) plus the SPEC §14 marker move. Leaving it inactive requires nothing.

**Release tie.** `not-release-relevant` — docs/process/next-phases.md:266-272 lists AL3 under "What is deliberately outside the scope"; docs/analysis/2026-08-18-release-phase-brainstorm.md:320-321 names it an edge "inactive by design"; no deferral-register or release-checklist mention of AL3 (grep returned nothing). The [SKETCHED] marker is an accurate claim, not a debt.

**Risk if 0.1 ships with it open.** None new — a 0.1 adopter gets AL1/AL2 as documented; the honesty gradient (README.md:113-115) states AL3 is inactive, so no capability is implied that is not shipped.

### 110. `SignatureReport.orphans` is reporting only: read by no gate, bounds nothing

`orphans-report-read-by-no-gate` · merged from 2 reader finding(s) · readers' guess: unclear / unclear

**What is open.** The orphans field (landed 2026-08-29) names what a host must prune but no probe, gate or self-test consumes it; whether anything should is unrecorded.

**Where documented.** `docs/process/deferral-register.md:13`; `docs/process/next-phases.md:66-68`; `packages/record/test/sidecar-orphans-report.test.ts:4-10`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "reporting only, read by no gate, and it bounds nothing" — `docs/process/deferral-register.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- Nothing here bounds them, deletes them, or lets them gate anything — the never-gates pin below is the load-bearing one, and the row stays open.

**Still open?** `partial` — Landed as reporting: verify-signatures.ts:37-48,116; sidecar-orphans-report.test.ts:8-10 ("Nothing here bounds them, deletes them, or lets them gate anything"); deferral-register.md:13 ("reporting only, read by no gate, and it bounds nothing"). Whether anything SHOULD consume it was decided, not left unrecorded: a probe was declined by the design's fifth ruling (implementation-status.md:3333 "a probe, per the design's fifth ruling"), and the reason is that probe targets quote sealed CONTROLS.md §4 (implementation-status.md:3320-3324). So the framing "unrecorded" is refuted; what remains open is only that no gate reads the field, by design.

**Is the closing act code?** `partial` (effort n/a). Deliberate state, not a defect. Making anything consume it would be (a) a new probe target — blocked because probe targets quote sealed docs/concept/CONTROLS.md §4 verbatim and none names sidecar reporting (implementation-status.md:3320-3324), needing a fresh sanction; or (b) a host-side gate outside the repo. No code change is called for by any record.

**Release tie.** `not-release-relevant` — implementation-status.md:3318-3324 and 3330-3334 record the no-probe decision as this increment's own ruling; release-checklist.md:203-206 treats `orphans` as the visibility that makes carry-forward acceptable, not as something needing a consumer at the cut. next-phases.md:66-68: "made the delegated work visible ... without closing 22a".

**Risk if 0.1 ships with it open.** None beyond row 22a itself: an adopter must read `verifySignatures(recordId).orphans` themselves; no self-test or probe will flag orphan growth for them.

### 111. Concurrent legs out of scope pre-1.0 (OPEN-QUESTIONS §8); non-admission recording

`concurrent-legs-out-of-scope-pre-1-0` · merged from 7 reader finding(s) · readers' guess: decision / horizon

**What is open.** SPEC §1 declares legs conclude in configured order; admitting concurrent legs would reopen exclusivity per leg, prior-reference shape and the SoD base — a sealed-set revision at or after 1.0. The adoption roadmap also asked that the non-admission be recorded as a deliberate act, which the multi-leg/SoD specs do not mention.

**Where documented.** `docs/process/next-phases.md:274-278`; `docs/process/implementation-status.md:223-225`; `docs/concept/OPEN-QUESTIONS.md:123-127`; `docs/concept/SPEC.md:70-71`; `docs/analysis/2026-08-18-release-phase-brainstorm.md:322-323`; `docs/superpowers/plans/2026-08-18-post-build-order-housekeeping.md:145-147`; `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md:1252`; `docs/guide/integrating.md:87-92`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Out of scope pre-1.0 by declaration (legs conclude in configured order). A future revision deciding to admit concurrent legs re-opens" — `docs/concept/OPEN-QUESTIONS.md`
- "record the non-admission of concurrent legs as a deliberate act" — `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md`

**Still open?** `partial` — The exclusion itself is a settled declaration, not open work: docs/concept/SPEC.md:70-71 ("Legs conclude in configured order; concurrent legs are out of scope pre-1.0"), docs/concept/OPEN-QUESTIONS.md:123-127, docs/process/next-phases.md:274-278 and :304 ("a pre-1.0 declaration already made, not a decision pending now"), docs/process/open-items-plan.md:299-304 (Appendix — surveyed and not open). The 'record the non-admission as a deliberate act' ask (docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md:1252) has no hit for 'non-admission' in docs/process/implementation-status.md or CHANGELOG.md, and the phrase 'concurrent legs' appears in no docs/superpowers/specs multi-leg document (only 2026-08-18-self-test-tier-design.md:129); the recording that does exist is next-phases.md:274-278 and open-items-plan.md:304 — arguably discharging the ask, but not at the increment the plan named. docs/guide/integrating.md:87-92 does not mention concurrent legs at all (stale source citation).

**Is the closing act code?** `partial` (effort n/a). None today. Admitting concurrent legs would be a sealed-set revision (SPEC §1/§2 prior-reference shape, SoD base, per-leg exclusivity) needing a fresh SCOPING-GUIDE §§1-2 sanction, then kernel changes in packages/record/src/kernel/open.ts (prior-legs sequencing rung), finalize's SoD gate, and the byte-stability oracle would move — which is why it is at/after 1.0. Keeping the exclusion is docs-only or nothing.

**Release tie.** `not-release-relevant` — docs/process/open-items-plan.md:299-304 lists it under 'surveyed and not open'; docs/process/next-phases.md:304 frames it as already decided; docs/analysis/2026-08-18-release-phase-brainstorm.md:322-323 puts it outside the release. Nothing ties it to the 0.1 cut; the only date named is 'pre-1.0'.

**Risk if 0.1 ships with it open.** None practical — an adopter reads a documented scope line (SPEC §1, faq/README) and gets sequential legs, which is the shipped and pinned behavior.


## E. Verified open, but the closing act is not code (11 items)

### 112. open-items-plan/sessions and the release-readiness section still describe the old paused banner (cherry-pick recipe, tag, waiver, 'table empties', stale guard count)

`open-items-plan-sessions-stale-superseded` · merged from 3 reader finding(s) · readers' guess: decision / unclear

**What is open.** Left alone per tier discipline with the checklist as authority; a cold reader has no in-place pointer that they are superseded. Whether to add a dated reconciliation note or leave as superseded record is undecided.

**Where documented.** `docs/process/open-items-plan.md:8-10`; `docs/process/open-items-sessions.md:246-251`; `docs/process/implementation-status.md:3810-3818`; `docs/process/implementation-status.md:1880-1882,3812`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Measurements below (line numbers, live settings, registry state) were taken against `main` at `1cffe1f` on 2026-08-19 and drift from that moment" — `docs/process/open-items-plan.md`
- "their description of the PAUSED banner — its cherry-pick pickup recipe, and the `v0.1.0` tag as something that might still exist — is an account of what the banner said then" — `docs/process/implementation-status.md`
- "that document explicitly disclaims currency" — `docs/process/implementation-status.md`

**Still open?** `partial` — The staleness is real and current: docs/process/open-items-plan.md:8-10 still carries the 2026-08-19 `1cffe1f` measurements and docs/process/open-items-sessions.md:246-251 still describes the cherry-pick pickup, the stale tag and the old waiver. But the framing 'undecided' is refuted: the checklist-refresh exit record RULED on it — docs/process/implementation-status.md:3810-3818 'per the tier discipline they are left alone; the mentions of `8be3fce` there are history, not instructions ... the checklist itself is the authority'; and open-items-plan.md:11-18 already carries an in-place currency disclaimer ('Where this plan and any of those disagree, they win and this plan is stale'), which implementation-status.md:1880-1882 cites as the reason to leave its counts untouched. What remains is only the optional act of adding a dated superseded-by note to the two documents, which no record schedules.

**Is the closing act code?** `no` (effort S). —

**Release tie.** `not-release-relevant` — docs/process/open-items-plan.md:12-14 names docs/process/release-checklist.md as release day's authority and stages 4-5 defer to it; docs/process/implementation-status.md:3810-3813 places the historical accounts outside the cut ('What stays outside, and why'). Nothing in release-checklist.md references the open-items documents.

**Risk if 0.1 ships with it open.** A cold reader of open-items-plan/sessions could follow the obsolete cherry-pick/tag/waiver recipe, though both documents disclaim currency and point at the checklist, so the risk is a reader who skips the header.

### 113. Seconds unit for confirmToRedeem/redeemBound is the build's convention, spec-silent

`reading-redeem-bounds-seconds-unit` · merged from 2 reader finding(s) · readers' guess: decision / horizon

**What is open.** SPEC §9.1 gives units only for expiry.ttl; a second implementation could read the redeem bounds differently. A spec clarification is a sealed edit; the guide should state the unit.

**Where documented.** `docs/process/implementation-status.md:420`; `docs/superpowers/specs/2026-08-14-redemption-clocks-design.md:36`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- Bounds are in seconds — the spec states units only for `expiry.ttl` (§9.1); the `redeem` block's bounds match it, recorded as this build's convention

**Still open?** `partial` — The 'guide should state the unit' half is DONE: docs/guide/api-reference.md:58-59 annotates `confirmToRedeem` and `redeemBound` as seconds, and docs/guide/integrating.md:335-336 spells it out. What remains is only that SPEC §9.1 states units for `expiry.ttl` alone — docs/superpowers/specs/2026-08-14-redemption-clocks-design.md:36 and implementation-status.md:420 record the seconds convention as 'this build's convention'; the spec itself is unchanged and sealed.

**Is the closing act code?** `no` (effort S). —

**Release tie.** `not-release-relevant` — No cut tie anywhere: not in docs/process/release-checklist.md, deferral-register.md, or open-items-plan.md. The public surface already states the unit (docs/guide/api-reference.md:58-59), so the only residual is a sealed SPEC §9.1 clarification that would need a fresh sanction; the concept set explicitly reserves such edits (CLAUDE.md sealed-set rule).

**Risk if 0.1 ships with it open.** None for a library adopter — the guide and types comment state seconds; only an independent second implementation reading SPEC alone could pick a different unit.

### 114. ackMode compares against the current re-raise's raiser — SPEC §10.2's singular left unversioned

`reading-ackmode-current-raiser` · merged from 2 reader finding(s) · readers' guess: decision / horizon

**What is open.** Recorded reading of an unversioned singular; a clarification would be a sealed edit.

**Where documented.** `docs/process/implementation-status.md:436`; `docs/superpowers/specs/2026-08-16-findings-read-side-design.md:31`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Recorded as this build's reading of a singular the spec leaves unversioned." — `docs/superpowers/specs/2026-08-16-findings-read-side-design.md`

**Still open?** `partial` — The ruling is recorded and deliberately closed against re-litigation: docs/process/implementation-status.md:436 "Two rulings recorded here, so they are not re-litigated: `ackMode` compares against the CURRENT version's raiser"; docs/superpowers/specs/2026-08-16-findings-read-side-design.md:31 same. Nothing in deferral-register.md, open-items-plan.md, next-phases.md, or docs/guide names it as pending (grep 'unversioned'/'current version's raiser' hits none). Open only as a spec ambiguity the sealed SPEC §10.2 still carries.

**Is the closing act code?** `no` (effort S). —

**Release tie.** `not-release-relevant` — implementation-status.md:436 explicitly marks it 'not re-litigated'; no release document (release-checklist.md, deferral-register.md, open-items-plan.md) references it. A SPEC §10.2 clarification would be a sealed edit under a fresh sanction, with no build consequence since the code already implements the recorded reading (kernel ack-coverage rung / findings-seams).

**Risk if 0.1 ships with it open.** A reader of SPEC §10.2's singular 'raiser' might expect the original raiser to govern self-ack detection after a re-raise; the build's behavior differs only in that edge and is documented in the status doc, not the guide.

### 115. `supersedes-unverified` minted but absent from SPEC §8's sealed enumerations

`supersedes-unverified-absent-from-spec-8` · merged from 1 reader finding(s) · readers' guess: decision / horizon

**What is open.** Minted under SPEC §2 and OQ §3, appears in neither §8's table nor never-appends list; §8 changes only by spec revision. A deliberate gap needing a sanctioned §8 revision or standing acceptance.

**Where documented.** `docs/process/implementation-status.md:384`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "a deliberate gap, not a drift" — `docs/process/implementation-status.md`

**Still open?** `yes` — docs/process/implementation-status.md:384 still says the gap in §8's two lists is 'recorded here, not reconciled ... a deliberate gap, not a drift', citing SPEC's Stability clause (SPEC.md:570) that the registry changes only by spec revision. The code is minted (packages/record/src/refusal-codes.ts, 24 codes per CLAUDE.md) and documented in docs/guide/api-reference.md:157,295, but SPEC §8's table and never-appends list remain without it (sealed). No register row or checklist item tracks reconciliation.

**Is the closing act code?** `no` (effort S). —

**Release tie.** `documented-post-0.1` — No cut tie: absent from docs/process/release-checklist.md, deferral-register.md and open-items-plan.md stages 4–5. Closing requires a sanctioned SPEC §8 revision (sealed; SPEC.md:570 Stability clause) or continued standing acceptance; the guide already lists the code (api-reference.md:295), so the public surface is covered for 0.1. The natural home is a 1.0 spec review alongside the store freeze (open-items-plan.md:257-261).

**Risk if 0.1 ships with it open.** An adopter cross-checking the library's refusal codes against SPEC §8's registry finds one code the spec never enumerates and must rely on implementation-status.md to know it is deliberate.

### 116. AL2 sub-decisions (detached-signer contract; synchrony and signer-outage class) absent from OPEN-QUESTIONS §1

`al2-sub-decisions-oq1-docket` · merged from 2 reader finding(s) · readers' guess: mixed / horizon

**What is open.** Two reference-register decisions have no counterpart in the concept set; the design said both belong under OQ §1. AL2 landed at step 8 with sign-before-append; whether the two were ever recorded in a sealed or process docket is not stated.

**Where documented.** `docs/superpowers/specs/2026-08-02-reference-implementation-adoption-design.md:297`; `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md:1273,1286`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "the programmatic contract for a detached signer, and signing synchrony together with the signer-outage failure class" — `docs/superpowers/specs/2026-08-02-reference-implementation-adoption-design.md`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- The synchrony choice can grow the Store contract, which collides with the 1.0 freeze.

**Still open?** `partial` — Substantively decided in code and process record, not in the sealed docket named by the design: the detached-signer programmatic contract shipped as `export type Signer = (bytes: Uint8Array) => Promise<{ keyRef; signature }>` (docs/superpowers/specs/2026-08-17-al2-signing-mint-design.md:95) plus the `SignatureStore` interface (:86); synchrony is 'Sign-before-append is argued, not incidental' with the throwing-signer/orphan posture (docs/process/implementation-status.md:445). But OPEN-QUESTIONS §1's tails cover only four bullets — granularity, missing-signature posture, key custody, authority timestamps (docs/concept/OPEN-QUESTIONS.md:15-33) — with no 'signer contract' or 'synchrony/signer-outage' sub-decision; grep for 'synchron'/'signer-outage' hits only the two 2026-08-02 adoption docs. next-phases treats OQ §1 as CLOSED (docs/process/next-phases.md:299-300). Whether the C3 alternative ('a docs/process/ docket', docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md:1286) was ever taken is not stated — uncertain on the recording, no on the behavior.

**Is the closing act code?** `no` (effort S). —

**Release tie.** `horizon` — No deferral-register row, release-checklist item, or open-items-plan stage names it; the only tie is the adoption plan's 1.0-freeze note ('The synchrony choice can grow the Store contract, which collides with the 1.0 freeze', plans/2026-08-02-reference-implementation-adoption.md:1273) — a pre-1.0 concern, and SignatureStore is already declared provisional (mint design :86ff). Closing = either a fresh sealed-set sanction to add two OQ §1 tails, or a process-doc docket; neither spawns code.

**Risk if 0.1 ships with it open.** An adopter reading OPEN-QUESTIONS §1 alone sees a decided-looking AL2 design that never names the signer contract or signer-outage posture, and must find them in code comments and implementation-status instead.

### 117. Adapter smoke coverage is packaging-level only: no live DB, no confirm loop

`critic-0-adapter-smoke-coverage-is-packaging-leve` · merged from 1 reader finding(s) · readers' guess: mixed / post-0.1

**What is open.** `pnpm smoke` constructs `PostgresStore` over a pool that never connects; the packed adapter's runtime behavior is proven only suite-side and was live-proven once at the 2026-08-19 rehearsal. The header names the post-publish registry install as the re-proof, so the bound stands until that dispatch (or until smoke grows a live-DB leg).

**Where documented.** `scripts/smoke-pack.mjs:26-31`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- its coverage here is PACKAGING-LEVEL ONLY — no live database, no confirm loop

**Still open?** `partial` — The bound is still stated as current in scripts/smoke-pack.mjs:26-31 ("PACKAGING-LEVEL ONLY — no live database, no confirm loop") and constructs `PostgresStore` over a pool that never connects (smoke-pack.mjs:24). But it is a RECORDED, DELIBERATE bound, not an open defect: docs/analysis/2026-08-20-artifact-postures.md:8-33 weighed and REJECTED the live-confirm-loop extension ("rejected: it needs a real server ... to re-prove runtime behavior the conformance suite already proves"). open-items-plan.md:95-101 ticks the record-only-smoke item as closed by the packaging extension. What remains open is only the re-proof leg: release-checklist.md:146-150 (unticked) dispatches first-use.yml with `source: registry` post-publish, which runs a real PostgresStore against a service (release-checklist.md:57-60; first-use.yml:12). Note the first-use tarball run already live-proved the packed adapter on a no-checkout runner on 2026-08-29 (release-checklist.md:57-60), so the item's claim that it was live-proven only at the 2026-08-19 rehearsal is stale.

**Is the closing act code?** `no` (effort S). None required: the ruling at docs/analysis/2026-08-20-artifact-postures.md:8-33 deliberately rejected adding a live-DB leg to smoke-pack.mjs. The only remaining act is the owner dispatching .github/workflows/first-use.yml with `source: registry`, `version: 0.1.0` after publish and writing a dated docs/analysis/ record (release-checklist.md:146-152). That dispatch's own commit also carries three small parked script edits to scripts/first-use.mjs (warning grep narrowed, header note, subjectRef assertion — release-checklist.md:152-156), which is the only code adjacent to this item.

**Release tie.** `documented-post-0.1` — release-checklist.md:146-150 places the registry re-proof AFTER the Release workflow runs (post-publish, "Verification, then the paperwork"); docs/analysis/2026-08-29-first-use-proof.md:7-8,137 says the registry path "waits for the cut". The packaging-level bound itself is not a gate anywhere (deferral-register has no row; next-phases.md:115 describes smoke as-is).

**Risk if 0.1 ships with it open.** An adopter installing @vidimera/store-postgres from the registry relies on the suite-side embedded-Postgres proof plus the 2026-08-29 no-checkout tarball run rather than a registry-sourced live run — a small residual exposure the checklist closes on release day itself.

### 118. SPEC §10.3 reverse cross-instance direction: build decided fail-close; sealed SPEC/CONTROLS/ASSURANCE still say permissive/open

`spec-10-3-reverse-cross-instance-fail-close-sealed-text` · merged from 5 reader finding(s) · readers' guess: decision / horizon

**What is open.** OPEN-QUESTIONS §2 records fail-close as decided and finalize.ts takes it, but normative SPEC §10.3 still specifies the permissive behavior and calls it open; CONTROLS.md and ASSURANCE.md agree with the stale text. Making it normative is a sealed-set revision needing a fresh sanction (stage-7 candidate).

**Where documented.** `docs/process/open-items-plan.md:292-297`; `docs/process/open-items-sessions.md:290-291`; `docs/process/implementation-status.md:437`; `docs/concept/SPEC.md:900-907`; `docs/concept/OPEN-QUESTIONS.md:52-54`; `docs/concept/CONTROLS.md:45`; `docs/concept/ASSURANCE.md:119-121`; `docs/superpowers/specs/2026-08-16-policy-drift-design.md:22`; `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md:1282`; `packages/record/src/kernel/finalize.ts:329-339`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "The reverse cross-instance direction is permissive at AL1 — a named, open decision." — `docs/concept/SPEC.md`
- "SPEC §10.3's own text still frames fail-close as "the recommendation on record", a named open decision about the spec's future revision" — `docs/process/open-items-plan.md`
- "this build answers it in code, not in the spec" — `docs/process/implementation-status.md`

**Still open?** `yes` — docs/concept/SPEC.md:900-907 still reads "The reverse cross-instance direction is permissive at AL1 — a named, open decision" and "Whether to fail-close this direction in code is a named open decision"; docs/concept/CONTROLS.md:45 still says "reverse cross-instance direction is a named open decision"; docs/concept/ASSURANCE.md:119-121 still lists it as a to-decide bullet. The build decided fail-close: packages/record/src/kernel/finalize.ts:330-339 (rung 4.5 arm), packages/record/test/policy-drift.test.ts:293-308, docs/concept/OPEN-QUESTIONS.md:52-54 ("**Decided (this build):** fail-close"), docs/process/implementation-status.md:437 ("this build answers it in code, not in the spec"). Making the SPEC text normative remains an unchecked stage-7 candidate: docs/process/open-items-plan.md:292-297; docs/process/open-items-sessions.md:288-291 ("No session is scheduled").

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `horizon` — docs/process/open-items-plan.md:279-281,292-297 places it under "Stage 7 — The horizon" ("Candidates only"); docs/process/open-items-sessions.md:288-291 says no session scheduled and it "starts at the sanction machinery". No register row or release-checklist item names it. The closing act is a sealed-set SPEC/CONTROLS/ASSURANCE text revision under a fresh SCOPING-GUIDE §§1–2 sanction; code and tests already embody the decision, so no code moves.

**Risk if 0.1 ships with it open.** An adopter reading SPEC §10.3 alone would expect the reverse cross-instance finalize to skip the gate and confirm, while the shipped kernel refuses `policy-drift` — a spec/code disagreement that OPEN-QUESTIONS §2's tail discloses but the normative text does not.

### 119. OPEN-QUESTIONS §10: AL3 interval and disclosure design undesigned

`oq10-al3-interval-disclosure-undesigned` · merged from 4 reader finding(s) · readers' guess: decision / horizon

**What is open.** Distinct from AL3's status: the design work needed the day the level activates, live only under a key-custody threat model. Genuinely open OQ section.

**Where documented.** `docs/process/next-phases.md:315-319`; `docs/process/open-items-plan.md:274-276`; `docs/concept/OPEN-QUESTIONS.md:135-138`; `docs/analysis/2026-08-18-release-phase-brainstorm.md:320-321`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "AL3 anchoring's own interval and disclosure design is undesigned because the level is inactive" — `docs/process/next-phases.md`

**Still open?** `yes` — docs/concept/OPEN-QUESTIONS.md:135-138: "AL3 anchoring (independent append-only log; interval and disclosure design) is documented only — it activates only with a threat model where even key custody is in doubt." docs/process/next-phases.md:315-319 restates it as what "remain[s] open here"; docs/process/open-items-plan.md:274-276 classes it "Dormant, with named triggers — watched, not worked"; docs/analysis/2026-08-18-release-phase-brainstorm.md:320-321. No design document for AL3 interval/disclosure exists in docs/superpowers/specs (only AL2 signing designs).

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `horizon` — docs/process/open-items-plan.md:274-276 ("Dormant, with named triggers — watched, not worked ... activates only with a threat model where key custody itself is in doubt"); docs/process/next-phases.md:315-319 files it among the OPEN-QUESTIONS long-horizon items; the trigger is a threat-model change, not the 0.1 cut. The closing act is a design decision (a sealed OPEN-QUESTIONS/SPEC revision under sanction) that precedes any code and is itself gated on AL3 activation (see al3-anchoring-sketched-inactive).

**Risk if 0.1 ships with it open.** None for 0.1 — the level is inactive, so an undesigned interval/disclosure scheme affects no shipped behaviour; an adopter with a key-custody threat model simply has no AL3 to reach for, which the docs say plainly.

### 120. SPEC §9 opening sentence still counts four calls and omits decline()

`spec-9-opening-four-calls-omits-decline` · merged from 1 reader finding(s) · readers' guess: mixed / unclear

**What is open.** False-by-omission site outside both decline-increment grants; verified present at SPEC.md:575. Closing needs a fresh sanction.

**Where documented.** `docs/process/implementation-status.md:1534-1538`; `docs/concept/SPEC.md:575`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "One further false-by-omission site is recorded here, not fixed" — `docs/process/implementation-status.md`

**Still open?** `yes` — docs/concept/SPEC.md:575-578 still reads "four calls, split across two surfaces" and the operator-only parenthetical lists open()/review()/finalize() (plus seal(), redeem(), findings seams, sweep) with no decline(), while SPEC.md:626 documents decline() as a [PROVEN] operator-only seam. docs/process/implementation-status.md:1534-1538 records it "not fixed" and needing "a fresh, explicit sanction". git log --oneline (HEAD 4e80bf7) shows no sealed-set sanction commit after the 2026-08-20 pass; no analysis/ruling names this site as closed (grep of docs/analysis, next-phases.md, open-items-plan.md for "four calls" returns nothing).

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `documented-post-0.1` — No register row, checklist item, or next-phases gate names it (docs/process/next-phases.md:26-100 gates the cut on rows 1/19/22 only; docs/process/release-checklist.md has no sealed-set item). Its only home is the status record at implementation-status.md:1534-1538, which ties closure to a fresh SCOPING-GUIDE §§1-2 sanction, not to the cut. Closing act is a sanction decision plus a one-sentence sealed edit ("five calls" and adding decline() to the parenthetical) — docs-only, no build consequence.

**Risk if 0.1 ships with it open.** An adopter reading SPEC §9's opening sentence would be told the API has four decision calls and might not discover the operator-only decline() seam until the bullet list at SPEC.md:626 — a false-by-omission accuracy claim in the normative document, with no behavioral consequence.

### 121. SPEC §6 and §13A restatements deliberately left finalize-only (no decline)

`spec-6-13a-restatements-without-decline` · merged from 1 reader finding(s) · readers' guess: decision / unclear

**What is open.** Eleven SPEC sentences gained decline; §6/§13A restatements were consciously left. Residual sealed consistency question, low priority.

**Where documented.** `docs/superpowers/specs/2026-08-20-recorded-human-decline-design.md:159-164`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "eleven finalize-scoped SPEC sentences gained decline where the seam shares the behavior … §6 and §13A restatements deliberately left" — `docs/superpowers/specs/2026-08-20-recorded-human-decline-design.md`

**Still open?** `partial` — docs/superpowers/specs/2026-08-20-recorded-human-decline-design.md:159-164 and implementation-status.md:1530-1532 both record §6 and §13A as "explicitly out of the grant and are untouched"/"deliberately left" — a conscious ruling, not an omission. SPEC.md:456-491 (§6) speaks only of finalize/finalizing (e.g. "carries the decision to `finalize()`", "cannot finalize"), and §13A (SPEC.md:1265+) says "finalize refuses `content-drift`", though decline shares identity (SPEC.md:665 "finalize one, or decline one (§6)") and content-drift (SPEC.md:515). So the sealed text remains finalize-only at those sites; no later sanction touched them (git log shows none after 2026-08-20). It is 'open' only as a residual consistency question the increment itself chose to close by leaving.

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `documented-post-0.1` — Not named by any 0.1 gate (next-phases.md:26-100; release-checklist.md). Closing would be a fresh SCOPING-GUIDE §§1-2 sanction for a docs-only wording pass over §6/§13A, and the increment record already ruled it out of scope (2026-08-20-recorded-human-decline-design.md:164; implementation-status.md:1530-1532). It sits naturally with the SPEC §9 'four calls' site as a single future consistency sanction.

**Risk if 0.1 ships with it open.** An adopter reading SPEC §6/§13A would see identity and content-drift guarantees phrased around finalize alone and might not infer they bind decline() equally — a documentation under-inclusion, with the behavior itself pinned in the decline suite.

### 122. SPEC's terminal/no-edge state enumerations are non-uniform (§5, §8, §12 C3)

`spec-terminal-state-enumerations-non-uniform` · merged from 1 reader finding(s) · readers' guess: decision / horizon

**What is open.** Each names a different subset; none names redeemed or redemption-failed though §2 makes both terminal; §8 has no maturity marker at its heading. Harmonization is a sealed edit.

**Where documented.** `docs/superpowers/specs/2026-08-24-no-edge-containment-design.md:142-150`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "SPEC's own enumerations are NOT uniform and must not be quoted as though they were" — `docs/superpowers/specs/2026-08-24-no-edge-containment-design.md`

**Still open?** `yes` — docs/superpowers/specs/2026-08-24-no-edge-containment-design.md:142-150 records the non-uniformity; verified present in the current SPEC: §5 (SPEC.md:439-440) names terminal expired/refused/declined plus sealed; §8's unredeemable-state row (SPEC.md:523) names open/refused/expired/declined; §12 C3 (SPEC.md:1163-1167) names "never against terminal `expired` or `refused`"; none names redeemed or redemption-failed though SPEC.md:166 makes them terminal; §8's heading (SPEC.md:492) carries no maturity marker. No sanction commit after 2026-08-24 touched SPEC (git log --oneline HEAD 4e80bf7); no register row or open-items-plan checkbox tracks it. The build derives the five-state set in code instead (design doc line 146-149).

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `documented-post-0.1` — No document ties harmonizing the enumerations to the 0.1 cut; the no-edge design's remedy was to derive the set from §2's terminality and to never quote the enumerations as uniform (2026-08-24-no-edge-containment-design.md:143-150), and next-phases.md:376-392 already treats this class of SPEC enumeration drift as a per-increment discipline, not a release gate. Harmonizing is a docs-only sealed edit needing a fresh SCOPING-GUIDE §§1-2 sanction. The behavioral side is closed: the containment increment pinned the derived set (packages/record/test/no-edge-containment.test.ts per next-phases.md:56).

**Risk if 0.1 ships with it open.** An adopter reading SPEC §5, §8 and §12 C3 side by side finds three different terminal-state lists, none mentioning redeemed/redemption-failed, and could wrongly conclude a compromise edge is admissible after those states — the code refuses correctly, but the normative text does not say so uniformly.


## F. Verified already closed against the tree (19 items)

### 123. Held divergence: `DecisionRecord.status` absent from SPEC §2's record table

`divergence-decisionrecord-status-field` · merged from 3 reader finding(s) · readers' guess: decision / horizon

**What is open.** §5/§12 require a sealed record to report retired, so the build derives status; §2 lists state and no status. Recorded for the owner; resolving means a sealed edit under fresh sanction.

**Where documented.** `docs/process/implementation-status.md:355`; `docs/superpowers/specs/2026-08-05-chain-retirement-design.md:212`; `packages/record/src/types.ts:207-217`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "it IS a divergence from §2's own table above, which lists `state` and no `status` row" — `docs/process/implementation-status.md`

**Still open?** `no` — Closed 2026-08-19: docs/concept/SPEC.md:123 now carries '| `status` | enum | Per-record report: `active`, or `retired` once sealed (§5, §12, §13) — distinct from `state`...' (commit 55a87a6, 'The sealed set, corrected under sanction'); the ruling is docs/analysis/2026-08-19-sealed-set-sanction.md:38-43 ('§2's table gains the row'); docs/process/implementation-status.md:1355-1361 records 'the sanctioned corrective pass closed the sealed-set side of all four items ... and `DecisionRecord.status`'. RESIDUE: two stale comments still describe the divergence as live — packages/record/src/types.ts:207-217 ('NOT a field of SPEC §2's record-model table ... held for the repository owner') and implementation-status.md:355 row 2 ('it IS a divergence from §2's own table') and :363. The item as framed (decision needing fresh sanction) is done; only a drift fix to those two texts remains.

**Is the closing act code?** `partial` (effort S). Residue only: rewrite the doc comment at packages/record/src/types.ts:207-217 to cite SPEC §2's `status` row instead of claiming a divergence (comment-only TypeScript edit, contract-scan resolves the §2 citation), and correct implementation-status.md:355/:363 row-2 prose. No behavior, test, or sealed-set change.

**Release tie.** `documented-post-0.1` — The decision itself was tied to and completed by the pre-cut sanctioned pass (sealed-set-sanction.md:38-43; implementation-status.md:1355). The leftover stale comment is not on release-checklist.md; open-items-plan.md Stage 2 (line 33, 'places where a recorded claim contradicts the current tree') is the natural home but does not list it.

**Risk if 0.1 ships with it open.** An adopter reading the published `DecisionRecord.status` doc comment (types.ts:207-217, shipped in dist/index.d.ts) is told the field diverges from SPEC §2 and is 'held for the repository owner', which is false against SPEC.md:123 — a credibility nick, not a behavior issue.

### 124. `proposer` restricted to multi-leg profiles — conservative reading, loosenable later

`proposer-multi-leg-only-loosenable` · merged from 2 reader finding(s) · readers' guess: decision / horizon

**What is open.** A single-leg profile declaring proposer is a construction error by the build's reading of §10.1; the spec is silent.

**Where documented.** `docs/superpowers/specs/2026-08-16-sod-gate-design.md:28`; `packages/record/src/config.ts:364-366`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "The conservative reading: loosening later is compatible; tightening after hosts rely on it is a break." — `docs/superpowers/specs/2026-08-16-sod-gate-design.md`

**Still open?** `no` — This is a settled construction rule, not an open item: packages/record/src/config.ts:364-366 implements it ("the conservative reading, loosenable later without a break"), packages/record/test/construction-validation.test.ts:241 pins it ("proposer on a SINGLE-LEG profile throws — §10.1 is multi-leg-scoped"), and docs/superpowers/specs/2026-08-16-sod-gate-design.md:26-29 records it as the decision. No register row, open-items-plan checkbox, next-phases section, or analysis ruling lists loosening it as pending (grep for "loosen" across docs/process, docs/analysis, OPEN-QUESTIONS.md finds only unrelated hits at implementation-status.md:1604,1632). "Loosenable later" is a compatibility note, not a deferral with a trigger.

**Is the closing act code?** `partial` (effort S). Only if a host ever needs single-leg proposer: drop the multi-leg check in config.ts validateProfile (~line 364-366 comment and its guard), invert the pin at construction-validation.test.ts:241 as an explicitly argued inversion, and add a single-leg proposer-gate test in the SoD suite. Nothing is required today.

**Release tie.** `not-release-relevant` — No record ties it to any cut; the design doc (2026-08-16-sod-gate-design.md:28) frames it as a compatible future loosening, and the build's disciplines (implementation-status.md:1632 pattern: "loosen on a demonstrated real-host need, argued at the seam") make it demand-driven.

**Risk if 0.1 ships with it open.** A 0.1 adopter declaring proposer on a single-leg profile gets a loud construction error — the conservative posture the design chose precisely so that later loosening is not a break; no adopter is harmed by shipping it.

### 125. Clock, id minter and token source deliberately off the public surface

`clock-id-token-seams-off-public-surface` · merged from 1 reader finding(s) · readers' guess: decision / horizon

**What is open.** createWithClock exists for tests only; a host cannot inject deterministic time or ids. Exposing one would be a build decision.

**Where documented.** `packages/record/src/create.ts:76-83`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- Deliberately NOT a public `Config` field and NOT re-exported from `index.ts` — the clock seam stays off the published surface

**Still open?** `no` — Decided, not open: packages/record/src/create.ts:76-79 'Deliberately NOT a public Config field'; docs/analysis/2026-08-19-phase-1-api-review.md:33 'createWithClock stays internal ... its absence was already a decision of record'; docs/guide/api-reference.md:33-34 'that absence is a decision of record, not an omission'. SPEC.md:324 leaves clock reads implementation detail. Nothing in open-items-plan.md or next-phases.md lists re-opening it.

**Is the closing act code?** `partial` (effort S). Only if a real host demand reverses the ruling: add optional clock/mintId/tokenSource fields to Config in packages/record/src/config.ts and index.ts exports, wire through create.ts (currently createWithClock-only, create.ts:74-96), update docs/guide/api-reference.md (api-sync gate) and add tests. Keeping the ruling = zero change.

**Release tie.** `not-release-relevant` — docs/analysis/2026-08-19-phase-1-api-review.md:33 closed the question inside the pre-0.1 API review (register row 6, retired per CLAUDE.md); no checklist or register row names it.

**Risk if 0.1 ships with it open.** None beyond the recorded one: adopters cannot inject deterministic time/ids for their own tests and must wrap or mock at the store or process level.

### 126. byte-regression coverage.test.ts proves MENTION, not coverage

`coverage-test-proves-mention` · merged from 2 reader finding(s) · readers' guess: unclear / horizon

**What is open.** Checks each TransitionKind name occurs in sibling source text; a name in a comment satisfies it; no linkage to PINNED_ arrays.

**Where documented.** `docs/process/implementation-status.md:2241-2247`; `packages/record/test/byte-regression/coverage.test.ts:5-9`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "it proves MENTION, not coverage and not correctness" — `docs/process/implementation-status.md`

**Still open?** `no` — This is a stated bound of a landed tripwire, not an unbuilt item: packages/record/test/byte-regression/coverage.test.ts:5-9 declares 'It proves MENTION, not coverage and not correctness' by design ('A useful tripwire for a newly added kind'), and docs/process/implementation-status.md:2241-2247 records the same limit at the increment's exit. No register row, next-phases entry, or open-items-plan checkbox asks for a stronger linkage check; nothing in git log after f2aab5b/f7de9ed revisits it.

**Is the closing act code?** `partial` (effort S). Only if someone decided the tripwire should prove more: extend coverage.test.ts to import each sibling's exported PINNED_ arrays and assert each TransitionKind appears as a `kind` in at least one pinned literal's decoded chain, rather than grepping source text. That is a new decision, not a recorded obligation; the current bound is deliberately accepted.

**Release tie.** `not-release-relevant` — Recorded as an accepted design bound (packages/record/test/byte-regression/coverage.test.ts:5-9; docs/process/implementation-status.md:2241-2247); not tied to the cut anywhere in deferral-register.md, release-checklist.md, next-phases.md, or open-items-plan.md.

**Risk if 0.1 ships with it open.** A kind name present only in a comment would satisfy the tripwire, so a newly added TransitionKind could go unpinned undetected — a maintainer-side test-quality bound, invisible to a 0.1 adopter.

### 127. verifyPriorLegs/verifySupersedes refuse pre-record, leaving a broken prior leg or predecessor unmarked

`cross-record-claims-no-evidence-edge` · merged from 1 reader finding(s) · readers' guess: decision / unclear

**What is open.** A compromised prior-leg or predecessor chain gets no compromise edge anywhere; pinned as current behavior, whether an evidence edge should land on the referenced chain is undecided.

**Where documented.** `packages/record/test/signing-enforce.test.ts:17-19,297-306`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- which leave even the prior leg or predecessor whose chain was just found broken unmarked

**Still open?** `no` — This is a recorded, pinned DECISION, not an open question. SPEC §8 (sealed) fixes `prior-leg-unverified` as 'a pre-record open()-seam sequencing refusal that never appends' (docs/concept/SPEC.md:548, 563); OPEN-QUESTIONS.md §3 is 'Decided (this build)' that `supersedes-unverified` follows the same pattern and that 'no superseded-by back-reference is recorded on the predecessor — the forward link in the recovering genesis is the evidence, and the predecessor's chain ... stays untouched', with verification 'a PURE READ, deliberately' (implementation-status.md:355). The test at signing-enforce.test.ts:297-306 exists 'to state' that shape ('That is the shape this assertion exists to state'); the header at :17-19 describes, it does not question. Nothing in deferral-register.md, next-phases.md, open-items-plan.md or release-checklist.md lists marking the referenced chain as undecided.

**Is the closing act code?** `partial` (effort n/a). No work owed. If a maintainer ever wanted an evidence edge on the referenced prior leg/predecessor, that is a concept-level change: it mutates a different record's chain inside what SPEC §2 defines as verification and conflicts with §8's never-appends registry (SPEC.md:548,563,570) — a fresh SCOPING-GUIDE §§1–2 sanction, then kernel/prior-legs.ts and kernel/supersedes.ts gaining an append path and store CAS handling on a possibly sealed predecessor. Not a 0.1 item.

**Release tie.** `not-release-relevant` — Settled in the sealed spec (SPEC.md:548,563) and OPEN-QUESTIONS §3 'Decided (this build)' (implementation-status.md:355); the test pins the decision, not an open item; no trigger or checklist entry names it.

**Risk if 0.1 ships with it open.** An operator whose prior leg or predecessor chain is compromised learns it only through the recovering record's refusal code and the audit reads (verifyChain/verifySignatures on the referenced record), never through an edge on the referenced chain — the documented, spec-mandated posture.

### 128. No destroy/retention seam; destroyed-prior posture pinned only by an empty-store stand-in

`no-destroy-retention-seam` · merged from 2 reader finding(s) · readers' guess: decision / horizon

**What is open.** §10.1's 'a destroyed one does not verify' is tested with a fresh store lacking the chain; whether a library destroy seam is ever in scope is undecided.

**Where documented.** `docs/superpowers/specs/2026-08-16-multi-leg-references-design.md:219`; `packages/record/test/multi-leg.test.ts:639-641`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- No destroy/retention seam: the destroyed-prior posture is pinned by its stand-in.

**Still open?** `no` — The absence is by spec, not a gap: docs/concept/SPEC.md:444-446 archival/destruction happens 'under the host's retention schedule'; SPEC.md:795-799 destruction is the host's act under §13; packages/record/test/multi-leg.test.ts:639-641 '§13 retention is the host's'; packages/record/src/kernel/prior-legs.ts:64,81 implements the destroyed-prior refusal. The design doc line (2026-08-16-multi-leg-references-design.md:219) is a 'what this does not claim' bound. No register row, open-items-plan checkbox, or next-phases entry proposes a destroy seam; SPEC §13 retention 'stay host law' (SPEC.md:276).

**Is the closing act code?** `partial` (effort n/a). None on the current ruling. If ever promoted (needs a fresh SCOPING-GUIDE §§1-2 sanction and a sealed SPEC §13 edit), it would be a Store method (packages/record/src/store/memory.ts, packages/store-postgres) plus an operator-handle verb and conformance-suite cases — well beyond a test stand-in swap.

**Release tie.** `not-release-relevant` — Retention is placed with the host by the sealed spec (docs/concept/SPEC.md:276, 446, 797); no 0.1 document references it. The test stand-in (multi-leg.test.ts:639) is adequate to pin the spec's posture as written.

**Risk if 0.1 ships with it open.** None new: adopters destroy chains through their own storage per SPEC §13 and the library already refuses prior-leg-unverified against a missing chain (prior-legs.ts:64-81).

### 129. Tamper-evident probe reports not-driven when the host store cannot be seeded

`tamper-evident-probe-not-driven-real-db` · merged from 1 reader finding(s) · readers' guess: code / unclear

**What is open.** The insider-attack probe seeds a tampered chain copy into a fresh store; against a real host DB it reports not-driven, so the headline probe is unproved where it matters. A corruption hook would touch the frozen store surface.

**Where documented.** `docs/superpowers/plans/2026-08-18-self-test-tier.md:350`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "if `makeConfig()`'s store cannot be seeded (a real host DB), report not-driven with that detail" — `docs/superpowers/plans/2026-08-18-self-test-tier.md`

**Still open?** `no` — REFUTED: the plan's RESOLVE-at-implementation was resolved by wrapping, not seeding. packages/record/src/probes/probes.ts:124-140 defines `tamperedCopyStore(inner, targetRecordId)` — a Store wrapper whose readChain returns a tampered copy — and :360-367 says 'Any conforming Store can be wrapped this way; the not-driven branch above (missing profiles/legs) is the only honest escape this attack has in this build.' The only not-driven branches in tamper-evident are :342 (no profiles) and :345 (no legs); no 'cannot be seeded' branch exists. So against a real host DB the probe DOES drive the attack. Remainder noted, uncertain whether documented anywhere: `runProbes` is exercised only in packages/record/test/probes.test.ts (no store-postgres test runs the probe tier), so the wrapper is unproven against the Postgres backing in-repo — a coverage gap, not the item as framed.

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `not-release-relevant` — No document ties the framed item to the cut; the plan text (docs/superpowers/plans/2026-08-18-self-test-tier.md:350) is a design-time note whose resolution landed in the self-test-tier increment. If the remainder (probe tier never run against store-postgres) were adopted as a new item it would be a small test in packages/store-postgres/test running runProbes over a PostgresStore-backed driver — but that is a different item.

**Risk if 0.1 ships with it open.** None as framed — the tamper-evident probe drives its attack over any conforming Store via the wrapper; the residual risk is only that the wrapper has not been exercised against the Postgres backing inside this repo.

### 130. Outside-party capabilities cut by design (anti-goal #4) — standing exclusion, rescope documented

`outside-party-capabilities-anti-goal` · merged from 2 reader finding(s) · readers' guess: decision / horizon

**What is open.** Conformance claims, assessor re-verification, published formats and active anchoring are excluded by CONCEPT/CONTROLS; a reversal is a fork. Listed as a standing exclusion, not open work.

**Where documented.** `docs/process/next-phases.md:280-294`; `README.md:124-126`; `docs/guide/faq.md:56-64`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "everything that exists only for an outside party is out of scope" — `docs/process/next-phases.md`
- "Proving anything to an outside party — assessor re-verification, published report formats, conformance claims — is out of scope by design, not merely unbuilt." — `README.md`

**Still open?** `no` — This is a standing anti-goal exclusion recorded everywhere it needs to be, not open work: docs/process/next-phases.md:280-294 ("No step of the completed build order reversed that line"), docs/process/open-items-plan.md:299-304 ('surveyed and not open'), README.md:124-126, docs/guide/faq.md:56-64 ("A future project could rescope that ... this one deliberately did not"). The rescope record CONCEPT.md §7 asks for is the concept set's own text (next-phases.md:288-294 quotes it). Reversal would be a fork of the concept per CLAUDE.md, not an item.

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `not-release-relevant` — docs/process/open-items-plan.md:299-304 appendix; docs/analysis/2026-08-18-release-phase-brainstorm.md:324 lists it as excluded for the release phase. No register row, checklist line, or trigger names it.

**Risk if 0.1 ships with it open.** None — the exclusion is already stated to adopters in README.md:124-126 and docs/guide/faq.md:56-64.

### 131. embedded-postgres dev pin is a beta release; behavior changes met only at the weekly bump

`embedded-postgres-beta-pin` · merged from 2 reader finding(s) · readers' guess: decision / horizon

**What is open.** 18.4.0-beta.17 kept because no stable channel exists; pnpm-workspace allowBuilds enumerates its platform packages so a bump revisits that list. Accepted posture with a standing limit.

**Where documented.** `docs/analysis/2026-08-20-artifact-postures.md:72-74`; `packages/store-postgres/package.json:43`; `pnpm-workspace.yaml:2-15`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "a beta-channel wrapper can change behavior between its own betas, and the suite would meet that at the weekly update, not before" — `docs/analysis/2026-08-20-artifact-postures.md`

**Still open?** `no` — docs/analysis/2026-08-20-artifact-postures.md:60-74 rules 'keep the pin, with the posture recorded here' and states the standing limit in the same breath; docs/process/open-items-plan.md:104-114 checks the item [x] ('take a posture on the beta pin... recorded either way'). packages/store-postgres/package.json:43 still pins 18.4.0-beta.17 and pnpm-workspace.yaml:6-15 enumerates the platform packages, exactly as ruled. What remains is a recorded accepted limit, not an open item.

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `not-release-relevant` — docs/analysis/2026-08-20-artifact-postures.md:67-69: 'The dependency is dev-only (the published artifact never depends on it)'; Dependabot weekly group (.github/dependabot.yml per CLAUDE.md) tracks the wrapper. Nothing in deferral-register.md, release-checklist.md or next-phases.md ties it to the cut.

**Risk if 0.1 ships with it open.** None for adopters: the published tarballs do not depend on embedded-postgres; the only exposure is a contributor's test run meeting a wrapper behavior change at a weekly bump, and pnpm-workspace.yaml:6-15's allowBuilds list needing a revisit if the platform-package set changes.

### 132. Three-way sealed divergence on recovery/`supersedes` (CONTROLS vs SPEC §9.1 table vs §2/§9)

`supersedes-three-way-sealed-divergence` · merged from 1 reader finding(s) · readers' guess: decision / horizon

**What is open.** CONTROLS calls recovery a profile-conditional field, §9.1's table has no row, §9 carries it as an open() option, §2 lists it among profile-conditional fields. Step 8 moved §2's tokens; whether the disagreement was reconciled is not stated. Owner's call.

**Where documented.** `docs/superpowers/plans/2026-08-03-autonomous-step-1-completion.md:236`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Doc-vs-doc divergence inside a sealed set: a finding, not a wording nit, and only the owner can rule it." — `docs/superpowers/plans/2026-08-03-autonomous-step-1-completion.md`

**Still open?** `no` — Closed by the 2026-08-19 sanctioned corrective pass, ruling 5: docs/analysis/2026-08-19-sealed-set-sanction.md:47-56 ('`supersedes` — the open()-option shape is ratified ... the two outlier sentences move; §9.1 stands'). The item was one of the six held observations listed at docs/analysis/2026-08-18-release-phase-brainstorm.md (item 2, 'The `supersedes` three-text divergence') and the pass records edits to SPEC §2's list and CONTROLS' Recovery row. The source plan line (docs/superpowers/plans/2026-08-03-autonomous-step-1-completion.md:236) predates the ruling and is a historical plan note, not a live register row; no deferral-register or next-phases entry names it.

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `not-release-relevant` — docs/analysis/2026-08-19-sealed-set-sanction.md:76-84 ('No register row moved. No code changed'); the seal is re-armed and nothing ties a remainder to the cut.

**Risk if 0.1 ships with it open.** None — the divergence no longer exists in the sealed text; an adopter reads a consistent open()-option shape in SPEC §2, §9.1 and CONTROLS.

### 133. open()'s en-passant blocker expire replays without verifying — SPEC §5's verify-first not universal

`open-en-passant-blocker-expire-unverified` · merged from 2 reader finding(s) · readers' guess: code / unclear

**What is open.** The exclusivity blocker branch appends expired to a blocker's chain after replay without verifyChain; held as a finding. Closure is code (verify) or an owner ruling scoping §5 narrower.

**Where documented.** `docs/process/implementation-status.md:381`; `docs/superpowers/specs/2026-08-12-redemption-direct-shape-design.md:94,187-188`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "`open()`'s en-passant expire of a blocking record replays that chain without verifying it — the remaining exception" — `docs/process/implementation-status.md`

**Still open?** `no` — Ruled by the 2026-08-19 sanctioned pass, ruling 6: SPEC §5 now scopes the pre-seam rule to 'the acted-on record's own chain' and names the exception with its limit — docs/concept/SPEC.md:422-425 ('The one en-passant append to a **different** record's chain — `open()`'s exclusivity path expiring a due-`open` blocker (§4) — runs without a pre-verify of the blocker's chain ... caught at the blocker's own next verifying seam'); docs/analysis/2026-08-19-sealed-set-sanction.md:66-74. The code still does not verify (packages/record/src/kernel/open.ts:265-296 replays the blocker with `replay(blockerChain)`, no `verifyChain` call), which is now the spec-stated behavior, so it is a recorded limit, not an open finding. The held-for-owner status quoted from docs/superpowers/specs/2026-08-12-redemption-direct-shape-design.md:94,187 predates the ruling; the brainstorm listed it as held item 4 (docs/analysis/2026-08-18-release-phase-brainstorm.md) and the pass closed all six.

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `not-release-relevant` — docs/analysis/2026-08-19-sealed-set-sanction.md:76-84 — no register row moved, no code changed; nothing in deferral-register.md, release-checklist.md or open-items-plan.md names it.

**Risk if 0.1 ships with it open.** None beyond the documented bound: an expired edge appended to a compromised blocker chain is only as trustworthy as that chain and is caught at the blocker's next verifying seam — stated in SPEC §5 itself.

### 134. MemoryStore throws on tx enlistment

`memorystore-rejects-tx` · merged from 1 reader finding(s) · readers' guess: decision / horizon

**What is open.** tx? is adapter-generic on the interface; MemoryStore has no driver and throws when one is supplied. Known bound.

**Where documented.** `docs/process/implementation-status.md:442`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "`MemoryStore` throws loudly on presence, having no driver" — `docs/process/implementation-status.md`

**Still open?** `no` — This is a spec-conformant, tested behavior, not an open item. SPEC §12 (docs/concept/SPEC.md:1202-1210) makes `tx?` adapter-generic with each backing validating the handle it receives; the Store header states the contract explicitly — "each backing validates the handle it receives and throws a caller error on one it cannot enlist (MemoryStore throws on any handle — it has no driver)" (packages/record/src/store/store.ts:129-130). Implemented at packages/record/src/store/memory.ts:120-127 (`rejectTx`), pinned by packages/record/test/store-constraints.test.ts (grep 'no transaction to enlist'). The source quote (docs/process/implementation-status.md:442) describes a landed feature; no register row, next-phases entry, open-items-plan checkbox, or analysis ruling names it as pending (grep of docs/process/*.md for MemoryStore+tx returns nothing). The only adjacent genuinely-open thread is OPEN-QUESTIONS §9 — whether a driver-generic transaction TYPE PARAMETER survives at the 1.0 store-interface freeze (docs/process/next-phases.md:311-313; docs/process/open-items-plan.md:255-260).

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `not-release-relevant` — Not named by docs/process/release-checklist.md, docs/process/deferral-register.md (rows 1/19/22 only, :11-13), or open-items-plan stages 4/5. The nearest item, the store signature freeze, is placed at Stage 6 as "the 1.0 gate" (docs/process/open-items-plan.md:255).

**Risk if 0.1 ships with it open.** None beyond the documented behavior: a host that passes a handle to MemoryStore gets a loud caller error, exactly as the Store contract states.

### 135. Never-satisfiable required consultation kind holds the pair indefinitely under expiry:'none'

`never-satisfiable-required-kind-holds-pair` · merged from 1 reader finding(s) · readers' guess: decision / horizon

**What is open.** Operator configuration to resolve, not a library fix.

**Where documented.** `docs/process/implementation-status.md:440`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "indefinitely under `expiry: 'none'`, the operator's own configuration to resolve" — `docs/process/implementation-status.md`

**Still open?** `no` — The source frames it as a recorded operator-side bound, not pending library work: "the operator's own configuration to resolve" and "the operator controls every finalize input, so the operator can always choose to end its own wait" (docs/process/implementation-status.md:440). It is the natural consequence of SPEC's own `expiry: 'none'` option (docs/guide/api-reference.md:55; docs/guide/integrating.md:88-90) and §4's no-scheduler stance ("no scheduler and no public `expire()`", docs/process/implementation-status.md:418). Not listed in deferral-register.md, next-phases.md, open-items-plan.md (greps for 'unsatisfiable', "expiry: 'none'" return nothing in those files). Only conceivable residue is a guide sentence warning about the pair-hold under 'none' with an unsatisfiable required kind — docs/guide/integrating.md:88-90 does not carry that specific warning.

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `not-release-relevant` — No cut tie anywhere: absent from release-checklist.md, the three live register rows (deferral-register.md:11-13), and open-items-plan stages 4-7. At most an optional guide-clarity edit (docs/guide/integrating.md:88-90).

**Risk if 0.1 ships with it open.** An operator who declares `expiry: 'none'` plus a required consultation kind the host never produces holds the (profile, subject) pair until they change configuration — a self-inflicted, documented condition, not a library defect.

### 136. SoD same-human-different-principal residual (§10.1's AL1 limit)

`sod-same-human-different-principal` · merged from 1 reader finding(s) · readers' guess: decision / horizon

**What is open.** SoD compares principals only; spec-named limit, recorded not coded around.

**Where documented.** `docs/process/implementation-status.md:423`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "the residual same-human-different-principal case is §10.1's own named AL1 limit, recorded rather than coded around" — `docs/process/implementation-status.md`

**Still open?** `no` — This is the sealed SPEC's own named limit, not a repo work item: "Pair-equality (principal and authority) would let one human re-authenticate under a second authority and pass; the residual same-human-different-principal case is the AL1 limit named below" (docs/concept/SPEC.md:784-787), and the status record says it is "recorded rather than coded around" (docs/process/implementation-status.md:423). It follows from the identity-by-transport principle (the library "never verifies WHO a principal is", implementation-status.md:423). Not named by deferral-register.md, next-phases.md, open-items-plan.md, or any analysis ruling. Closing it would mean the library authenticating humans across principals — a fork of CONCEPT.md's identity-by-transport principle, requiring a fresh sanction; nothing on record proposes it.

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `not-release-relevant` — A spec-declared limit (docs/concept/SPEC.md:784-787); the open-items-plan appendix classifies this family as "a recorded limit or a deliberate exclusion, not pending work" (docs/process/open-items-plan.md:299-302). No cut tie.

**Risk if 0.1 ships with it open.** An adopter whose IdP issues a second principal string to the same human can defeat SoD; the SPEC and guide (docs/guide/integrating.md:98) state that separation evidences distinct principals, not distinct humans.

### 137. Cross-leg content binding and cross-leg policyDigest equality not verified

`cross-leg-content-and-policy-binding-not-verified` · merged from 1 reader finding(s) · readers' guess: decision / horizon

**What is open.** Legs may decide different content; hosts enforce identity in staging (§10.1 non-goal); §10.3 likewise verifies no cross-leg equality.

**Where documented.** `docs/process/implementation-status.md:423,437`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Cross-leg content binding is not verified" — `docs/process/implementation-status.md`

**Still open?** `no` — Both are sealed SPEC non-goals, not open work: "Cross-leg content binding is not verified ... a host that requires the legs to decide identical content enforces that in its own staging" (docs/concept/SPEC.md:789-793) and "Cross-leg policy equality is not verified — as with cross-leg content (§10.1), both are chained and auditable, and a host requiring same-policy legs enforces that in its own staging" (docs/concept/SPEC.md:921-924). The status record restates them as the spec's "own stated non-goal" (docs/process/implementation-status.md:423). No register row, next-phases item, open-items-plan checkbox, or analysis ruling proposes verifying either (greps for 'cross-leg' in docs/process/{deferral-register,next-phases,open-items-plan}.md return nothing). Changing it would be a sealed-set revision through SCOPING-GUIDE §§1-2.

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `not-release-relevant` — Spec-declared non-goals (docs/concept/SPEC.md:789-793, 921-924); absent from release-checklist.md, the three live register rows (deferral-register.md:11-13), and open-items-plan stages 4-7.

**Risk if 0.1 ships with it open.** None beyond the spec's stated posture: a host wanting identical content or policy across legs must enforce it in its own staging; both digests are chained and auditable either way.

### 138. Byte-pin combination coverage — permanent scope bound, no register row

`byte-pin-combination-coverage-bound` · merged from 3 reader finding(s) · readers' guess: unclear / horizon

**What is open.** No literal covers a chain combining features; declared permanent because no trigger could close it.

**Where documented.** `docs/process/implementation-status.md:2259-2263`; `docs/superpowers/specs/2026-08-22-byte-regression-pins-design.md:127-132,151-153`; `packages/record/test/byte-regression/fixtures.ts:18-24`

**Reader quotations NOT found verbatim in a cited file** (paraphrase or wrapped span; treat as the reader's words, not the source's):
- Combination coverage is a permanent scope bound, not a deferral, and takes no register row

**Still open?** `no` — Not an open item by its own sources' framing: docs/superpowers/specs/2026-08-22-byte-regression-pins-design.md:151-153 'Combination coverage is a permanent scope bound, not a deferral, and takes no register row' because 'there is none' (no trigger); packages/record/test/byte-regression/fixtures.ts:18-24 'a deliberate scope bound, not an omission awaiting a later increment'; docs/process/implementation-status.md:2255-2259 'nothing could close it at any future date'. Nothing in the tree is scheduled or owed; the bound is fully recorded in three places.

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `not-release-relevant` — Declared permanent with no trigger and no register row (docs/superpowers/specs/2026-08-22-byte-regression-pins-design.md:151-153; docs/process/implementation-status.md:2255-2259); absent from release-checklist.md, next-phases.md gates, and open-items-plan stages. Any future combination pin would be an optional new test file, not a closure of this bound.

**Risk if 0.1 ships with it open.** A drift that only manifests when two declarable features interact inside one chain is caught by no self-regression literal — a documented, accepted bound with no adopter-visible effect at 0.1.

### 139. Conformance-suite appendBatch arity >= 4 coverage — gap to report, outcome unrecorded

`conformance-appendbatch-arity-gap` · merged from 1 reader finding(s) · readers' guess: code / unclear

**What is open.** finalize's success batch reaches 5 elements; the attach plan told the implementer to check the suite exercises arity >= 4 and report any gap; whether one existed or was closed is unstated.

**Where documented.** `docs/superpowers/plans/2026-08-16-consultation-attach.md:707`; `docs/superpowers/specs/2026-08-16-consultation-attach-design.md:180-182`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "If the conformance suite's largest batch is smaller, REPORT the gap" — `docs/superpowers/plans/2026-08-16-consultation-attach.md`

**Still open?** `no` — The gap was found and closed in the conformance suite itself: packages/record/test/conformance/store-conformance.ts:674-678 'appendBatch: a five-element batch (finalize's obtained-consultations shape, first step-5 increment) lands whole ... Nothing in this suite exercised appendBatch above arity 3 before this case', asserting at :684 'the five-element batch must land as one atomic unit'; the helper `fiveElementBatch` is imported at :21. The plan's report-the-gap instruction (docs/superpowers/plans/2026-08-16-consultation-attach.md:705-709) was therefore acted on with a test rather than left as an unrecorded outcome. The suite runs against MemoryStore, sqlite and store-postgres via the shared conformance file.

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `not-release-relevant` — Closed in packages/record/test/conformance/store-conformance.ts:674-684; never carried in deferral-register.md, next-phases.md, release-checklist.md, or open-items-plan.md.

**Risk if 0.1 ships with it open.** None — the arity >= 4 case is exercised across all three store backings today.

### 140. Live capture: SPEC §9 human-anchor sentence fork check and the 8.2/8.3 sequencing decision — recording unverified

`live-capture-human-anchor-sentence-and-sequencing-record` · merged from 2 reader finding(s) · readers' guess: decision / unclear

**What is open.** If live mode bypassed staging, §9's 'holds without exception' sentence would need restating (a fork); the plan also required recording any reordering of 8.2 behind 8.3. Step 8 landed both; whether staging was preserved and the ordering decision recorded is not stated in these sources.

**Where documented.** `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md:49,1270`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "If it bypasses staging, SPEC section 9's "this holds without exception" human-anchor sentence needs restating" — `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md`
- "If no live host exists here, defer 8.2 behind 8.3 and record the reordering as a documented act" — `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md`

**Still open?** `no` — Both halves are recorded closed. Fork check: docs/concept/OPEN-QUESTIONS.md:110-121 §7 carries 'Decided (this build): the staging contract is unchanged — neither changed nor bypassed', so SPEC §9's 'holds without exception' sentence needed no restating and no fork occurred. Sequencing: docs/process/implementation-status.md:173 records step 8 as 'The first: SPEC §2's recovery linkage… The second: live-mode capture and reverify (SPEC §9.2)… the third of those four — AL2 detached signing', i.e. 8.2 landed before 8.3 in the build order's own sequence, so the plan's conditional 'if no live host exists here, defer 8.2 behind 8.3 and record the reordering' (…adoption.md:49) never fired and there was no reordering to record. next-phases.md:339-343 also lists SPEC §9.2's live-mode marker move at step 8.

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `not-release-relevant` — Closed items; OPEN-QUESTIONS §7 is listed among the sections 'CLOSED' in docs/process/next-phases.md:299-302.

**Risk if 0.1 ships with it open.** None — the item is closed; nothing remains for an adopter to hit.

### 141. Unfrozen surfaces: construction and the two handles' read conveniences

`unfrozen-surfaces-construction-read-conveniences` · merged from 1 reader finding(s) · readers' guess: decision / unclear

**What is open.** SPEC declares them implementation surface not specified call-by-call; whether they are ever specified or frozen at 1.0 is undecided.

**Where documented.** `docs/concept/SPEC.md:5-8`

**Verified quotations** (each found, whitespace-collapsed, in the cited file):
- "Two surfaces are deliberately not frozen here: construction, and the two handles' read conveniences" — `docs/concept/SPEC.md`

**Still open?** `no` — The repo's own survey classifies this as a deliberate stance, not pending work: docs/process/open-items-plan.md:299-318 (Appendix — surveyed and not open) lists 'the deliberately unfrozen construction and read-convenience surfaces (SPEC's own header)' beside other recorded limits 'not pending work'. SPEC.md:5-8 states the surfaces are 'bounded by §9's split… but not specified call-by-call' as a design choice. The only adjacent decision that IS open is the store-interface freeze (OPEN-QUESTIONS.md:129-133 §9, 'a 1.0 gate'; open-items-plan.md:257-262), which concerns Store method signatures, not construction or read conveniences.

**Is the closing act code?** `no` (effort n/a). —

**Release tie.** `not-release-relevant` — Not a register row, not on the release checklist, and open-items-plan.md:299-318 places it under 'surveyed and not open'; any future freezing would be a sealed-set revision through SCOPING-GUIDE §§1-2 at the 1.0 review, alongside OQ §9 (open-items-plan.md:257-262).

**Risk if 0.1 ships with it open.** Adopters get create()/handle read methods as PUBLIC-BUT-UNSTABLE implementation surface pre-1.0, which the docs already state; no unexpected breakage at 0.1.


## G. Pre-bucketed as docs-only or owner-action from the documented closing act (52 items)

These were not verified by a lens pass; the merge's closing-act guess (`docs` or `owner-action`) placed them here. The critic spot-checked the group and reclassified four as code, flagged below.

### 142. Row 1: exercise release.yml once at the 0.1 cut (first provenance-attested publish)

`row-1-release-workflow-first-exercise` · guess: owner-action / gates-0.1

**What is open.** The dispatch-only release workflow has never run; register row 1 (publish tooling) stays open until it publishes both packages once, record first. Its guard refuses `private: true` or `0.0.0`, so it sequences after the release commit and the visibility flip. `--provenance` on a private repo is flagged unverified by one reader.

**Where documented.** `docs/process/deferral-register.md:11`; `docs/process/next-phases.md:30-32`; `docs/process/next-phases.md:113-120`; `docs/process/open-items-plan.md:226-228`; `docs/process/open-items-sessions.md:257-264`; `docs/process/implementation-status.md:94-96`; `docs/process/implementation-status.md:1097-1101`; `docs/process/implementation-status.md:3540-3542`; `docs/analysis/2026-08-19-phase-2-packaging.md:50-54`; `docs/analysis/2026-08-20-versioning-mechanics.md:145-147`; `docs/superpowers/specs/2026-08-29-first-use-proof-design.md:19`; `docs/superpowers/specs/2026-08-22-truth-repairs-design.md:145-149`; `docs/superpowers/plans/2026-08-02-project-scaffold.md:610`; `packages/record/src/probes/index.ts:12-13`; `.github/workflows/release.yml:1-9,36-62`; `docs/process/release-checklist.md:136-141`

**Verified quotations.**
- "The row stays open until the 0.1 cut exercises that workflow once" — `docs/process/next-phases.md`
- "This is the register's row-1 trigger firing: the first exercised publish." — `docs/process/release-checklist.md`

### 143. Cut CHANGELOG `[0.1.0]` fresh from `[Unreleased]`

`changelog-cut-0-1-0-from-unreleased` · guess: docs / gates-0.1

**What is open.** CHANGELOG.md still holds everything under [Unreleased] and opens with 'No release has been cut'; the section must be re-cut from [Unreleased] as it reads on the day, never reused from 8be3fce. The header paragraph and 'Known not-done' block also assert the unpublished state.

**Where documented.** `docs/process/implementation-status.md:1968-1975`; `docs/process/release-checklist.md:9-16,101`; `CHANGELOG.md:8-11,173-177`

**Verified quotations.**
- "the `[0.1.0]` section must be re-cut fresh from `[Unreleased]` at pickup rather than reused" — `docs/process/implementation-status.md`

### 144. Flip the docset's 'unpublished' caveats (README, guide, SECURITY, docs/README, both package READMEs)

`docset-unpublished-caveats-flip` · guess: docs / gates-0.1

**What is open.** Eight named sites still say unpublished: README.md status paragraph, getting-started precondition, api-reference header, faq production-ready answer, SECURITY.md, docs/README.md, both package READMEs. Every install-facing sentence must become true on the day; getting-started also carries a stale '750-plus tests' count. ESM-only bound must stay stated at the flip.

**Where documented.** `docs/analysis/2026-08-18-release-phase-brainstorm.md:265-268,284-285`; `docs/process/release-checklist.md:102-111`; `packages/record/README.md:16-18`; `packages/store-postgres/README.md:13-14`; `README.md:149-160`; `docs/guide/getting-started.md:6-12,42-43`; `SECURITY.md:5-8`; `docs/README.md:26-27`; `docs/analysis/2026-08-19-phase-2-packaging.md:44-46`

**Verified quotations.**
- "Flip the docset's "unpublished" caveats to the published truth" — `docs/process/release-checklist.md`
- "No CJS build exists or is planned; the bound is stated wherever installation is documented" — `docs/analysis/2026-08-19-phase-2-packaging.md`

### 145. CLAUDE.md release-day skim: remove private-workflow residue, update honest-bound paragraph

`claude-md-release-day-skim` · guess: docs / gates-0.1

**What is open.** Phase-0 ruling 6: CLAUDE.md stays tracked and public; its honest-bound paragraph still describes `private: true`, the unexercised workflow and the owner-gated cut, and must be rewritten to the published state at the release commit.

**Where documented.** `docs/analysis/2026-08-19-phase-0-decisions.md:55-57`; `docs/process/release-checklist.md:112-113`

**Verified quotations.**
- "the skim at release removes any private-workflow residue" — `docs/analysis/2026-08-19-phase-0-decisions.md`

### 146. Flip repository visibility to public before the dispatch (precondition for two other settings)

`repository-visibility-flip-public` · guess: owner-action / gates-0.1

**What is open.** The repository is private; `npm publish --provenance` rejects private-source publishes and two settings (private vulnerability reporting, code-owner branch protection) are refused by the platform while private under this plan. Flip is owner-run, blocked from automation by design; ordering is public first, then dispatch.

**Where documented.** `docs/process/next-phases.md:98-99`; `docs/process/open-items-plan.md:202-206`; `docs/process/implementation-status.md:3789-3795`; `docs/process/implementation-status.md:3622-3624`; `docs/superpowers/specs/2026-08-29-checklist-refresh-design.md:38`; `docs/superpowers/plans/2026-08-29-checklist-refresh.md:102-108`; `docs/process/release-checklist.md:33-43,120-122`

**Verified quotations.**
- "the owner-side list in that notice, two items of which cannot even be attempted until the repository is public" — `docs/process/next-phases.md`

### 147. Register the npm @vidimera scope and create a live granular NPM_TOKEN secret

`npm-scope-and-npm-token-secret` · guess: owner-action / gates-0.1

**What is open.** No publish token exists and the scope's registration is an owner act; release.yml reads `secrets.NPM_TOKEN`. Granular tokens expire, so validity must be checked near dispatch.

**Where documented.** `docs/process/open-items-plan.md:200-201`; `docs/process/implementation-status.md:3752-3755`; `docs/analysis/2026-08-19-phase-2-packaging.md:40-42`; `.github/workflows/release.yml:8-9,55,62`; `docs/process/release-checklist.md:123-126`

**Verified quotations.**
- "the secrets list is empty (no `NPM_TOKEN`)" — `docs/process/open-items-plan.md`
- "The workflow needs the `NPM_TOKEN` repository secret and the registered `@vidimera` npm scope" — `docs/analysis/2026-08-19-phase-2-packaging.md`

### 148. Enable GitHub private vulnerability reporting

`private-vulnerability-reporting-setting` · guess: owner-action / gates-0.1

**What is open.** SECURITY.md and the issue-template config route reporters to a setting not yet enabled; unavailable while the repository is private under this plan, so it follows the visibility flip.

**Where documented.** `docs/process/open-items-plan.md:203-206`; `docs/analysis/2026-08-19-phase-0-decisions.md:59-64`; `docs/process/release-checklist.md:127-129`; `SECURITY.md:14-19`

**Verified quotations.**
- "the protection endpoint answers 403, "upgrade or make public"" — `docs/process/open-items-plan.md`
- "a pinned release-checklist action no commit can substitute for" — `docs/analysis/2026-08-19-phase-0-decisions.md`

### 149. Enable require-review-from-code-owners branch protection (CODEOWNERS is advisory)

`branch-protection-code-owner-review` · guess: owner-action / gates-0.1

**What is open.** CODEOWNERS guards docs/concept/ and the frozen byte-stability test but binds nothing until the setting is on; unavailable while private under this plan.

**Where documented.** `docs/process/open-items-plan.md:203-206`; `docs/analysis/2026-08-19-phase-3-ci.md:36-42,50`; `docs/superpowers/specs/2026-08-22-byte-regression-pins-design.md:74-75`; `.github/CODEOWNERS:1-3`; `docs/process/release-checklist.md:130-132`

### 150. Owner's readiness bar: the unticked judgment precondition

`owner-readiness-bar-precondition` · guess: owner-action / gates-0.1

**What is open.** The checklist's second phase-6 precondition — the owner ruling the project ready — is a human judgment no repository act discharges; it stays unticked and every downstream row waits on it.

**Where documented.** `docs/process/implementation-status.md:3734-3736`; `docs/process/release-checklist.md:67-69`; `docs/superpowers/specs/2026-08-29-checklist-refresh-design.md:65`

**Verified quotations.**
- "The owner's-bar precondition directly below it stays UNTICKED deliberately — it is a judgment only the owner makes" — `docs/process/implementation-status.md`
- "nothing goes public before the project is actually ready — this list executes that decision, never substitutes for it" — `docs/process/release-checklist.md`

### 151. Post-publish: dispatch first-use.yml with `source: registry` and record the run (re-proves packed adapter live)

`registry-first-use-dispatch-post-publish` · guess: owner-action / post-0.1

**What is open.** The clean-runner proof ran from tarballs only; after publish the same no-checkout job must install from the registry, reach verified chains over both stores, confirm `./probes` resolves, and be recorded in a dated docs/analysis record. This is also the act that re-proves the adapter's packed artifact live, since `pnpm smoke` covers it at packaging level only.

**Where documented.** `docs/process/open-items-plan.md:228-229`; `docs/process/implementation-status.md:3641-3644`; `docs/analysis/2026-08-29-first-use-proof.md:135-139`; `.github/workflows/first-use.yml:12-13,17-24,96-99`; `docs/process/release-checklist.md:145-151`; `docs/superpowers/specs/2026-08-29-first-use-proof-design.md:159`; `docs/analysis/2026-08-20-artifact-postures.md:32-39`; `scripts/smoke-pack.mjs:26-31,179-184,210`

### 152. Post-cut paperwork: retire row 1, roadmap update in next-phases, refresh the measured block dated

`post-cut-paperwork-row1-roadmap-measured-block` · guess: docs / post-0.1

**What is open.** Once the workflow has run: remove row 1 with a retirement note in implementation-status.md, rewrite next-phases.md to the post-0.1 state, and re-measure the status block (versions, published state). open-items-plan's 'the table empties' is stale — rows 19 and 22 remain.

**Where documented.** `docs/process/open-items-plan.md:229-236`; `docs/process/release-checklist.md:156-158,220-221`; `docs/process/open-items-sessions.md:262-263`

**Verified quotations.**
- "retire register row 1 (the table empties), the retirement note in `docs/process/implementation-status.md`" — `docs/process/open-items-plan.md`
- "Update `docs/process/implementation-status.md`'s measured block (versions, published state) — dated, as always." — `docs/process/release-checklist.md`

### 153. Row-22 trigger: four living copies plus one deliberately frozen divergent Tier 3 copy

`row22-trigger-frozen-tier3-copy` · guess: docs / unclear

**What is open.** The coverage plan's copy (line 985) keeps the old 248-character trigger by INDEX.md's historical rule; a future sweep will find the five divergent and must not fix it. Living copies match only by whitespace-collapsed comparison; no gate enforces it.

**Where documented.** `docs/process/implementation-status.md:2693-2701`

**Verified quotations.**
- "The Tier 3 copy at the coverage plan's line 985 deliberately still reads the old 248-character text" — `docs/process/implementation-status.md`

### 154. Rows 19 and 22 row-number derivation parentheticals carried verbatim, not re-run

`row-number-derivation-parentheticals` · guess: docs / horizon

**What is open.** The write-time derivations inside both rows were never re-derived against the current table through restatement and re-scope.

**Where documented.** `docs/process/implementation-status.md:2750-2752`

**Verified quotations.**
- "the row-number derivation parentheticals in rows 19 and 22, which are write-time records and were carried verbatim rather than re-run" — `docs/process/implementation-status.md`

### 155. 'CONTAINMENT INVENTORY' premise grep now yields a false negative (plan-author trap)

`containment-inventory-grep-trap` · guess: docs / horizon

**What is open.** The no-edge containment plan's premise check greps for a phrase that left with 22b's body and prints 0 today; recorded only in implementation-status, not in any plan template.

**Where documented.** `docs/process/implementation-status.md:3140-3145`

**Verified quotations.**
- "a later plan copying it as a probe would get a false negative, which is why it is named here" — `docs/process/implementation-status.md`

### 156. Same-millisecond refusing calls collapse two orphans onto one sidecar key (~1 in 12 observed)

`same-millisecond-orphan-collapse` · guess: docs / horizon

**What is open.** Sidecar keyed by digest with clock-stamped `at`, so one-orphan-per-call is only usually true on a real clock; pins force a ticking clock. No pin, mitigation or public documentation of the flake.

**Where documented.** `docs/superpowers/plans/2026-08-24-row-22-truth-repairs.md:60`; `packages/record/test/no-edge-containment.test.ts:55-59`

### 157. Sidecar-ordering reader defects pinned under injected ordering; host ProbeDriver shapes not enumerated, shared durable sidecar not modelled

`sidecar-ordering-defects-latent-reachability` · guess: docs / horizon

**What is open.** The probe and helper fixes are proven only against an injected contract-legal orphan-first ordering; no real flow reaching an orphan for the probe's own record was found, and the positional-read census covers this repo, not hosts.

**Where documented.** `docs/process/implementation-status.md:2875-2877,2912-2913`; `docs/analysis/2026-08-24-no-edge-containment-investigation.md:195-197`; `docs/superpowers/specs/2026-08-24-sidecar-contract-design.md:129`; `packages/record/test/sidecar-ordering.test.ts:19-23`

**Verified quotations.**
- "Host `ProbeDriver` shapes were not enumerated, and a driver returning a shared durable sidecar was not modelled." — `docs/process/implementation-status.md`

### 158. Sessions 9 (pickup decisions) and 10 (execution run) unscheduled — owner's readiness bar

`session-9-10-pickup-unscheduled` · guess: owner-action / gates-0.1

**What is open.** The session preparing pickup decisions and walking the owner through settings, tag/branch deletion, commits, gates, tag and push has not been scheduled; sessions 1–8 have run.

**Where documented.** `docs/process/open-items-sessions.md:231-241,257-264,295-299`

**Verified quotations.**
- "scheduled by the owner's readiness bar — no earlier" — `docs/process/open-items-sessions.md`

### 159. Delete the fully merged origin/adopt-reference-implementation branch

`delete-merged-adopt-branch` · guess: owner-action / before-0.1-implied

**What is open.** Still present on the remote (verified via `git branch -r`); zero commits ahead of main; to be deleted at the next owner-instructed push.

**Where documented.** `docs/process/open-items-plan.md:216-218`; `docs/process/open-items-sessions.md:249`

**Verified quotations.**
- "`origin/adopt-reference-implementation` is fully merged (zero commits ahead of `main`) and can be deleted at the next push the owner instructs" — `docs/process/open-items-plan.md`

### 160. Record the 'wrong paraphrase under a valid section number' lesson in the resolver's bounds list

`contract-scan-paraphrase-bounds-note` · guess: docs / unclear

**What is open.** The committed-read ruling names a lesson for the bounds comment; `grep -i paraphrase scripts/contract-scan.mjs` finds nothing, so it is unwritten. One-line addition.

**Where documented.** `docs/analysis/2026-08-20-committed-read.md:118-120`

**Verified quotations.**
- "A lesson for the scan's bounds list, not a defect in it: a wrong paraphrase under a right section number is invisible" — `docs/analysis/2026-08-20-committed-read.md`

### 161. `ed448` commit-ref exclusion is a documented no-op

`ed448-exclusion-inert` · guess: docs / horizon

**What is open.** Below the pattern's 7-char floor; kept as defensive symmetry. Editorial choice whether to keep an inert exclusion.

**Where documented.** `scripts/contract-scan.mjs:78-84`

**Reclassified by the critic as CODE.** Guessed docs, but the item is a regex negative-lookahead in a gate script; closing it (dropping or activating the exclusion) is a script edit. Evidence: scripts/contract-scan.mjs:78-84 carries the `ed25519`/`ed448` exclusions in `codeOnlyPatterns`; CLAUDE.md calls `ed448` 'today below the pattern's own 7-char floor and therefore inert'.

### 162. PR template not given docs-index-sync (nor api-sync, lint, build, smoke) — parked

`pr-template-omits-gates` · guess: docs / unclear

**What is open.** .github/PULL_REQUEST_TEMPLATE.md lists a curated subset of gates; verified today it names neither docs-index-sync nor api-sync.

**Where documented.** `docs/process/implementation-status.md:2166-2169`

**Verified quotations.**
- "deliberately not given the new gate — it lists a curated subset of gates" — `docs/process/implementation-status.md`

### 163. README/CONTRIBUTING docs-index-sync fence lines misalign neighbor comment columns by two chars — parked

`readme-contributing-fence-alignment` · guess: docs / unclear

**What is open.** Cosmetic; parked.

**Where documented.** `docs/process/implementation-status.md:2169-2171`

**Verified quotations.**
- "break the comment-column alignment of their neighboring lines by two characters, a cosmetic effect" — `docs/process/implementation-status.md`

### 164. release-checklist.md:24 overruns the file's wrap width

`release-checklist-line-24-wrap` · guess: docs / horizon

**What is open.** A plan-prescribed blockquote line runs to 98 characters; left because no gate measures markdown line length.

**Where documented.** `docs/process/implementation-status.md:3744-3750`

**Verified quotations.**
- "runs to 98 characters (100 bytes, for one em-dash), the longest line in the file" — `docs/process/implementation-status.md`

### 165. Release checklist prose is dated and unpinned; re-read against the tree on release day

`release-checklist-prose-stale-no-pin` · guess: docs / gates-0.1

**What is open.** The refreshed status notice is dated 2026-08-29 and nothing gates its accuracy; it will go stale like the text it replaced.

**Where documented.** `docs/process/implementation-status.md:3801-3803`

**Verified quotations.**
- "nothing here is executable, no test pins any of it, and it will go stale exactly the way the text it replaced did" — `docs/process/implementation-status.md`

### 166. workflow_dispatch registers only from the default branch — trap for later plans

`workflow-dispatch-default-branch-trap` · guess: docs / horizon

**What is open.** A new dispatch-only workflow cannot be run via --ref from a feature branch until its file is on main; recorded only in implementation-status.

**Where documented.** `docs/process/implementation-status.md:3478-3492`

**Verified quotations.**
- "a later plan that assumes feature-branch dispatch will meet the same 404" — `docs/process/implementation-status.md`

### 167. Getting-started prose unproven by a first-time reader

`getting-started-prose-unproven` · guess: owner-action / unclear

**What is open.** The first-use script follows the flow in substance; whether docs/guide/getting-started.md reads right is a human judgment no run records.

**Where documented.** `docs/process/implementation-status.md:3514-3516`; `docs/analysis/2026-08-29-first-use-proof.md:6-7`; `docs/superpowers/specs/2026-08-29-first-use-proof-design.md:153-155`; `scripts/first-use.mjs:9-10`; `docs/process/release-checklist.md:63`

**Verified quotations.**
- "The prose is unproven — whether the getting-started walkthrough reads right to a first-time reader is a human's judgment" — `docs/process/implementation-status.md`

### 168. First-use run is one run on one date; nothing re-runs it

`first-use-no-automatic-rerun` · guess: owner-action / horizon

**What is open.** The public 'on 24.15 and later nothing prints' sentence rests on run 33242645696; drift is caught only on manual re-dispatch, by design a release act never a per-push gate.

**Where documented.** `docs/process/implementation-status.md:3516-3526`

**Verified quotations.**
- "nothing re-runs it automatically, so a future runner image resolving `24` below 24.15 would falsify the public sentence" — `docs/process/implementation-status.md`

**Reclassified by the critic as CODE.** Guessed owner-action, but the natural closer is a workflow edit (an `on: schedule` trigger or a per-release dispatch step in release.yml) — a code/workflow change, not a setting the owner flips. Evidence: docs/process/implementation-status.md:3522-3526: 'it is ONE run on one date: nothing re-runs it automatically ... caught only at the next dispatch'; .github/workflows/first-use.yml is `workflow_dispatch` only.

### 169. State what 0.1 promises where an adopter reads it (release notes and README mirror the pre-1.0 instability marking)

`zero-one-adopter-stability-statement` · guess: docs / gates-0.1

**What is open.** An adopter-facing statement of which names may move before 1.0 and what is stable-in-behavior vs stable-in-name was a phase-6 agenda item not recorded as landed; the 0.1 release notes that must mirror the store 'unstable pre-1.0' marking do not exist; the README must state Store provisionality at the cut (verify present).

**Where documented.** `docs/analysis/2026-08-18-release-phase-brainstorm.md:306-309`; `docs/analysis/2026-08-19-phase-1-api-review.md:49-53`; `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md:1264`

**Verified quotations.**
- "names may still move before 1.0 ... and which parts are stable-in-behavior versus stable-in-name" — `docs/analysis/2026-08-18-release-phase-brainstorm.md`
- "the api-reference and the eventual 0.1 release notes mirror them" — `docs/analysis/2026-08-19-phase-1-api-review.md`

### 170. ASSURANCE §7 adopter residual-risk obligations — verify the publish-facing docs carry them

`adopter-residual-risk-posture-docs` · guess: docs / unclear

**What is open.** As an adopting project the repo's docs should carry the AL1 bound and blind windows, the §4 out-of-scope list, its reverse-cross-instance decision, idempotent-executor and seam-bypass bounds, and AL2 key-custody/enablement/missing-signature decisions; not checkable from the concept sources alone.

**Where documented.** `docs/concept/ASSURANCE.md:113-124`

**Verified quotations.**
- "An adopting or inheriting project should carry, explicitly, in its own documentation:" — `docs/concept/ASSURANCE.md`

### 171. PostgresStore enlisted-tx same-pool custody cannot be verified

`postgres-tx-pool-custody-bound` · guess: docs / horizon

**What is open.** validateTx checks handle shape and an open transaction but cannot prove the client belongs to the store's pool; a foreign-pool client is accepted. Documented as caller discipline.

**Where documented.** `docs/superpowers/plans/2026-08-19-store-postgres.md:385-387`; `packages/store-postgres/src/postgres-store.ts:131-140`

### 172. listDue promises no ordering of returned ids

`listdue-no-ordering-promised` · guess: docs / horizon

**What is open.** Documented adapter bound; whether callers need an order is unaddressed across backings.

**Where documented.** `packages/store-postgres/src/postgres-store.ts:469-475`

### 173. Dev-only dependency patch drift left to weekly Dependabot (open PR branch pending)

`dependabot-dev-patch-drift` · guess: owner-action / unclear

**What is open.** Appendix names it as the one outstanding thing; an origin/dependabot branch exists, so a PR is likely pending review.

**Where documented.** `docs/process/open-items-plan.md:316-317`

**Verified quotations.**
- "only dev-only patch drift outstanding, which weekly Dependabot already covers" — `docs/process/open-items-plan.md`

### 174. node:sqlite experimental watch item; remove the vitest ExperimentalWarning suppression when it stabilizes

`node-sqlite-experimental-watch-item` · guess: owner-action / horizon

**What is open.** SqliteStore rides an experimental module whose API may move under a Node upgrade; vitest.config suppresses the warning with a flag to remove on stabilization; the conformance suite is the only catch.

**Where documented.** `docs/superpowers/specs/2026-08-12-sqlite-adapter-design.md:182-185,221`; `docs/superpowers/plans/2026-08-12-sqlite-adapter.md:599`; `packages/record/src/store/sqlite.ts:29-32`

**Reclassified by the critic as CODE.** Bucketed NOT-CODE-BY-GUESS / owner-action, but its documented closing act is a code edit: remove the vitest `execArgv` ExperimentalWarning suppression and retire the WATCH ITEM comment once node:sqlite stabilizes. It is also tied to the release-day floor rule (checklist:73-91), so it is not release-irrelevant. Evidence: vitest.config.ts:8-9 (`// silences node:sqlite's ExperimentalWarning (SqliteStore).` / `const execArgv = ['--disable-warning=ExperimentalWarning']`); packages/record/src/store/sqlite.ts:29-32 ('WATCH ITEM: `node:sqlite` is experimental'); docs/process/release-checklist.md:73-91.

### 175. SqliteStore is single-operator; no multi-connection safety claimed

`sqlite-single-operator-bound` · guess: docs / horizon

**What is open.** WAL under one process only; multi-connection concurrency delegated to store-postgres. Known bound by design.

**Where documented.** `packages/record/src/store/sqlite.ts:2-4`

### 176. SPEC §9.2 still calls the live-capture reverify seam's append semantics an open decision

`spec-9-2-reverify-open-wording-stale` · guess: docs / unclear

**What is open.** OQ §7 marks both residuals decided and SPEC §8's row says 'decided on record', but §9.2's paragraph still reads 'among this mode's open decisions'. Sealed wording remainder.

**Where documented.** `docs/concept/SPEC.md:738-740`; `docs/concept/OPEN-QUESTIONS.md:115-121`; `docs/concept/SPEC.md:515`

**Verified quotations.**
- "the seam's append semantics are among this mode's open decisions, `OPEN-QUESTIONS.md`" — `docs/concept/SPEC.md`

### 177. SPEC §2 / CONTROLS phrase recovery-flow details as still enumerated open

`recovery-flow-details-open-wording-stale` · guess: docs / unclear

**What is open.** OQ §3's three sub-questions are decided; SPEC.md:143-144 and CONTROLS.md:48 still read as if open. Minor sealed wording staleness.

**Where documented.** `docs/concept/SPEC.md:143-144`; `docs/concept/CONTROLS.md:48`; `docs/concept/OPEN-QUESTIONS.md:56-72`

**Verified quotations.**
- "Remaining recovery-flow details (the non-terminal-predecessor refusal shape, the exclusivity interaction) are enumerated in `OPEN-QUESTIONS.md`." — `docs/concept/SPEC.md`

### 178. Whole-record absence residual unclosed at every shipped level

`whole-record-absence-residual` · guess: docs / horizon

**What is open.** readChain returns [] for an unknown id and signatures verify only what exists; closures are AL3 or a host-side record index reconciled against the store, neither provided.

**Where documented.** `docs/process/implementation-status.md:444`; `docs/concept/SPEC.md:1275-1282`; `docs/concept/ASSURANCE.md:23-28`

**Verified quotations.**
- "The third residual, whole-record absence, stays unclosed even under AL2" — `docs/process/implementation-status.md`
- "the closures are AL3 anchoring (§14) or a host-side record index reconciled against the store" — `docs/concept/SPEC.md`

### 179. AL1 head-bound tamper windows (SoD evidence, policyDigest, last transition) stay open for non-signing profiles; comments still call AL2 'eventual'

`al1-head-bound-windows-non-signing` · guess: docs / horizon

**What is open.** A storage-writing insider can edit head payloads at AL1; closed only by signing:true. replay.ts and prior-legs.ts comments still phrase detached signing as an eventual upgrade though AL2 landed.

**Where documented.** `docs/process/implementation-status.md:423,437`; `docs/superpowers/specs/2026-08-16-multi-leg-references-design.md:222`; `docs/superpowers/specs/2026-08-16-policy-drift-design.md:304-305`; `packages/record/src/chain/replay.ts:346-355`; `packages/record/src/kernel/prior-legs.ts:13-16`

**Verified quotations.**
- "The AL1 window on this evidence is recorded beside it, not closed" — `docs/process/implementation-status.md`
- "detached signing (SPEC §14) is the eventual upgrade" — `packages/record/src/chain/replay.ts`

### 180. Genuineness bounds: proofRef, eligibility, consultation/freshness, findings, observedAt, live path-independence never verified by the library

`genuineness-bounds-library-never-verifies` · guess: docs / horizon

**What is open.** The library gates on recorded claims: proofRef opaque, eligibility/consultation authority not proven to have run, magnitude opaque, observedAt not verified to be when observation happened (freshness unfireable at AL1), live re-derivation path-independence host-specific (probe pass path shown via a fake). Known bounds to state with each guarantee.

**Where documented.** `docs/process/implementation-status.md:173`; `docs/process/implementation-status.md:382`; `docs/process/implementation-status.md:421`; `docs/process/implementation-status.md:436`; `docs/process/implementation-status.md:438`; `docs/process/implementation-status.md:440`; `docs/concept/CONTROLS.md:50`; `docs/concept/SPEC.md:694,1016-1017`; `packages/record/test/probes.test.ts:217-221`

**Verified quotations.**
- "the library never verifies the observation happened AT `observedAt` — it gates on the recorded, signature-covered CLAIM" — `docs/process/implementation-status.md`
- "`proofRef` is carried and never inspected" — `docs/process/implementation-status.md`
- "PROVEN (AL2-dependent) | Unfireable at AL1 (recording-time stamps); meaningful only with authority timestamps" — `docs/concept/CONTROLS.md`

### 181. Host duties the library cannot enforce: privacy/retention, key generation/distribution/rotation

`host-duties-privacy-retention-key-custody` · guess: docs / horizon

**What is open.** Pseudonymization, retention, purpose limitation (§13) and AL2 key custody/rotation are host-declared; a record whose keyRef's verifier is removed fails closed. Permanent bound; at most guide passages.

**Where documented.** `docs/process/implementation-status.md:443`; `docs/superpowers/specs/2026-08-17-al2-signing-mint-design.md:231-232`

**Verified quotations.**
- "remain host duties this build neither enforces nor could" — `docs/process/implementation-status.md`
- "Key generation, distribution, rotation scheduling: host-declared, out of scope — the library sees `keyRef`s and hooks only." — `docs/superpowers/specs/2026-08-17-al2-signing-mint-design.md`

### 182. Gap-list guide recipes not written: conditions, delegation, policy-verdict

`gap-list-guide-recipes-conditions-delegation-policy-verdict` · guess: docs / unclear

**What is open.** Three of five gap-review items landed; the conditions recipe and delegation/policy-verdict recipes were to get their own documents; grep of docs/guide finds none.

**Where documented.** `docs/superpowers/specs/2026-08-20-recorded-human-decline-design.md:260-262`

**Verified quotations.**
- "the conditions recipe, the delegation and policy-verdict guide recipes) are separate cases with their own documents, not riders on this one" — `docs/superpowers/specs/2026-08-20-recorded-human-decline-design.md`

### 183. Host-facing doc note: beginRedemption's ok payload is secret material

`begin-ok-payload-secret-doc-note` · guess: docs / before-0.1-implied

**What is open.** The token appears once in begin's ok value; verify the guide warns hosts not to log it.

**Where documented.** `docs/superpowers/specs/2026-08-13-redemption-token-shape-design.md:178`

**Verified quotations.**
- "Host-facing doc note: the begin `ok` payload is secret material — do not log it." — `docs/superpowers/specs/2026-08-13-redemption-token-shape-design.md`

### 184. implementation-status.md stale cells and counts (§0, §2.1, §4, §5, §8 count-pin, §9.1, §10 heading, 'nine things', governedUnavailable two, thirteen commits, six sites)

`implementation-status-stale-cells` · guess: docs / unclear

**What is open.** Multiple row cells date to earlier steps and contradict later rows or the tree: §0 names signing unbuilt; §2.1 says only pure-capture constructs; §4 one-direction pin claim; §5 says index.ts exports neither replay nor verifyChain (it does); count-pin lineage stops at 23; §9.1 says malformed terminalRefusals never rejected; §10 heading says all four not built; 'Nine things' vs ~two dozen; governedUnavailable two vs four sites; thirteen vs 26 docs/concept commits; enforcement sites 'six then existing' excludes decline().

**Where documented.** `docs/process/implementation-status.md:353`; `docs/process/implementation-status.md:369`; `docs/process/implementation-status.md:371`; `docs/process/implementation-status.md:381`; `docs/process/implementation-status.md:395`; `docs/process/implementation-status.md:420`; `docs/process/implementation-status.md:422`; `docs/process/implementation-status.md:450`; `docs/process/implementation-status.md:816`; `docs/process/implementation-status.md:869`; `docs/process/implementation-status.md:445`

**Verified quotations.**
- "`index.ts` exports neither — only the operator handle's `recordId`-keyed wrappers" — `docs/process/implementation-status.md`
- "Nine things are called out on their own" — `docs/process/implementation-status.md`
- "it still serves the two generic unknown-option-key throws" — `docs/process/implementation-status.md`
- "THIRTEEN commits touch it, not six" — `docs/process/implementation-status.md`

### 185. Stale source comments: appendsOn 'only callers', id.ts Node>=24, store.ts 'once a real Postgres adapter lands', redeem.ts 'until the SoD step', content-binding GOVERNED-throws

`stale-source-comments` · guess: docs / unclear

**What is open.** refusal-codes.ts says finalize's steps are the only appendsOn callers though decline.ts now calls refuseMaybeAppend; id.ts states a Node >= 24 baseline vs the 22.16 floor; store.ts speaks of the Postgres adapter as future; redeem.ts frames the non-final-leg refusal as provisional; content-binding.test.ts says legs.length>1 still throws and leaves a stage()-level multi-leg distinctness case unpinned.

**Where documented.** `packages/record/src/refusal-codes.ts:209-221`; `packages/record/src/kernel/finalize.ts:808-837`; `packages/record/src/id.ts:16-18`; `packages/record/src/store/store.ts:121-124`; `packages/record/src/kernel/redeem.ts:191-192`; `packages/record/test/content-binding.test.ts:259-263`

**Reclassified by the critic as CODE.** Guessed docs, but every named site is a comment inside a tracked .ts file (refusal-codes.ts, kernel/finalize.ts, id.ts, store.ts, redeem.ts); the repo gates such edits with contract-scan's code-only patterns and records them as code commits. Borderline: comment-only code edit, not a markdown edit. Evidence: packages/record/src/refusal-codes.ts:209-221, packages/record/src/kernel/finalize.ts:808-837, packages/record/src/id.ts:16-18 are TypeScript sources; CLAUDE.md: contract-scan checks 'all tracked *.ts' with eight code-only patterns.

### 186. Public-doc stale wording: api-reference 'Signing (AL2) — structural today'; CONTRIBUTING 'CI does not necessarily test the floor'; getting-started '750-plus tests'

`public-doc-stale-wording` · guess: docs / unclear

**What is open.** The api-reference heading contradicts the guide's own AL2 sections; CONTRIBUTING's floor sentence is stale against ci.yml's exact 22.16.0 leg; getting-started's count is below the measured 821.

**Where documented.** `docs/guide/api-reference.md:458`; `CONTRIBUTING.md:124-126`; `.github/workflows/ci.yml:39`; `docs/guide/getting-started.md:11`

**Verified quotations.**
- "## Signing (AL2) — structural today" — `docs/guide/api-reference.md`
- "CI's Node version does not necessarily test the floor" — `CONTRIBUTING.md`

### 187. adopted-source-provenance.md stale entries: item 10 (OpenOptions) SKIPPED though exported; stage.ts note says unknown-leg producer 'still missing'

`provenance-doc-stale-entries` · guess: docs / unclear

**What is open.** index.ts:40 exports OpenOptions today, and item 5 marks the open() unknown-leg producer APPLIED, yet both entries lack the dated present-tense corrections the doc uses elsewhere.

**Where documented.** `docs/process/adopted-source-provenance.md:357-385`; `docs/process/adopted-source-provenance.md:724-732`; `packages/record/src/index.ts:40`

**Verified quotations.**
- "**Status: SKIPPED — reclassified, not applied.**" — `docs/process/adopted-source-provenance.md`
- "the *second* `unknown-leg` producer, in `open()`, was not brought in the same way and is still missing." — `docs/process/adopted-source-provenance.md`

### 188. kernel/stage.ts taken from a later reference head — standing provenance asymmetry

`stage-ts-provenance-asymmetry` · guess: docs / horizon

**What is open.** One source file's provenance differs from the rest of the adopted kernel; recorded, no work named.

**Where documented.** `docs/process/implementation-status.md:1002`; `docs/process/adopted-source-provenance.md`

**Verified quotations.**
- "`kernel/stage.ts` is the one source file taken from the reference" — `docs/process/implementation-status.md`

### 189. Recovery predecessor encoding pinned only transitively

`recovery-predecessor-transitive-pin` · guess: docs / horizon

**What is open.** The predecessor chain has no literal; only its chainHead reaches the successor genesis literal. Accepted.

**Where documented.** `packages/record/test/byte-regression/multi-leg.test.ts:12-15`

### 190. RaceThenAppendStore fixture preconditions would be swallowed by a future try/catch

`race-fixture-try-catch-hazard` · guess: docs / horizon

**What is open.** Standing maintenance obligation on any refactor wrapping the append seam.

**Where documented.** `packages/record/test/terminality.test.ts:236-239`

### 191. Record the three-class outcome widening as a decision; byte-stability fixture provenance

`three-class-widening-record-fixture-provenance` · guess: docs / unclear

**What is open.** The availability class widening was to be ADR-grade recorded (DECISIONS.md is sealed so it lives in docs/process), and the byte-stability pins need this repo's own fixture provenance; adoption design 0d reframes them as compatibility pins.

**Where documented.** `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md:1255`

**Verified quotations.**
- "The three-class widening is ADR-grade — record it as a decision." — `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md`

### 192. Assert 'last store-perturbing step' in step 3's exit note

`last-store-perturbing-step-assertion` · guess: docs / unclear

**What is open.** The clocks exit record says 'No store changes' for its increment but not the forward-looking claim; later plans carry the operational freeze check instead.

**Where documented.** `docs/superpowers/plans/2026-08-02-reference-implementation-adoption.md:1249`; `docs/superpowers/specs/2026-08-14-redemption-clocks-design.md:225-226`

### 193. CI matrix workflow YAML validated only on an actual push (likely closed, unconfirmed)

`ci-matrix-yaml-first-push-validation` · guess: owner-action / before-0.1-implied

**What is open.** At authoring the windows/macos and exact-floor jobs had never executed; main has been pushed repeatedly since so CI has almost certainly run, but no source read confirms it.

**Where documented.** `docs/analysis/2026-08-19-phase-3-ci.md:46-49`

**Verified quotations.**
- "the workflow YAML itself is the untested surface until then" — `docs/analysis/2026-08-19-phase-3-ci.md`


## H. Dropped at merge as already closed (24 raw findings)

Each line is the merge's own drop note, carrying the citation it took as proof of closure.

- Delete stale remote tag v0.1.0 from the paused attempt — docs/process/release-checklist.md:27-30 ('was deleted on 2026-08-29 on the owner's authorization'); `git tag -l` empty; CLAUDE.md agrees
- Re-decide the clean-machine first-use waiver / Genuine clean-machine first-use run precondition — docs/process/release-checklist.md:20-24 DISCHARGED BY CONSTRUCTION via docs/analysis/2026-08-29-first-use-proof.md (run 33242645696); CLAUDE.md
- Register row 4 (root typecheck / per-package test-runner devDeps), row 5 (biome migrate), row 15 (server-SQL backing), row 16 (enlisted token seams) — docs/process/deferral-register.md:10-13 lists only rows 1, 19, 22 live; biome.json line 2 carries $schema; @vidimera/store-postgres exists; redeem-token.test.ts:596-604 shows token seams take tx (row-16 inversion)
- Pre-0.1 API naming review (register row 6) — docs/analysis/2026-08-19-phase-1-api-review.md; CLAUDE.md: row 6 completed and retired 2026-08-19; packages/record/src/probes/index.ts:10-12
- OPEN-QUESTIONS §5 self-test subpath export shaping the exports map — docs/concept/OPEN-QUESTIONS.md:95-99 decided; packages/record/package.json exports carries `./probes`
- Cut and tag 0.1 without publication unless a real consumer exists — superseded: .github/workflows/release.yml:1-9 and docs/process/release-checklist.md:136-141 make the cut a publish
- `@vidimera/store-postgres` publish decision and peer range — release.yml:36-62 publishes both packages; docs/process/release-checklist.md:95-99 lockstep bump; `workspace:^` peer rewritten by pnpm pack (scripts/smoke-pack.mjs)
- `freshness` / `consultation-stale` stays [SKETCHED] and GOVERNED — docs/concept/CONTROLS.md:50 'PROVEN (AL2-dependent)'; CLAUDE.md: zero GOVERNED guards, SPEC §14 freshness tail moved at step 8
- Second step-7 increment (raiseFinding/acknowledge, marker move) and Step 8 unstarted — CLAUDE.md: all eight steps exited at 84484ba; step-7 marker move recorded; docs/process/implementation-status.md step-7/8 rows
- Recovery (`supersedes`) three residual decisions — docs/concept/OPEN-QUESTIONS.md:56-72 marks all three 'Decided (this build)'
- Reconcile spec-conformance findings into R1–R5 and the register — docs/analysis/2026-08-03-step-1-review.md:296-318 adjudication references register row 12; rows 12/13 and the 2026-08-19 sanction pass cover them
- MemoryStore readChain/append aliasing (INHERIT 1, 2, 4) and readChain fresh-value pin — packages/record/src/store/memory.ts:241,306,398 clone on write; implementation-status row 12 'by deep clone on read and on write'
- open() re-checks staged legId against the resolving profile — packages/record/src/kernel/open.ts:112-120 implements the second unknown-leg producer (provenance item 5 APPLIED, commit 8c78083)
- finalize() gains an opts parameter — packages/record/src/operator-surface.ts:50-55 declares finalize(..., opts?); CLAUDE.md names the unknown-option-key throw in finalize()
- Store implements only five of eight SPEC §12 methods — packages/record/src/store/store.ts:77-78,184,200,215 declare meta, appendBatch, listDue, findNonTerminal; implementation-status row 12
- redeem() stub returns wrong registry codes — packages/record/src/kernel/redeem.ts:18-22,190,225-237 chain-verify/unknown-profile ladder; redemption built at step 3
- Outcome.unavailable unconstructible — packages/record/src/refusal-codes.ts:45 carries 'availability'
- Eight citation defects in scrubbed comments (Class C) and foreign-numbering labels escaping the scan — CLAUDE.md: contract-scan exits 0 with eight code-only patterns and a citation resolver; store.ts:135 documents first-write-wins; config.ts:133 cites §9.2
- Stale intra-repo pointer in store/memory.ts citing kernel/open.ts line numbers — packages/record/src/store/memory.ts:236-239 now reads 'named rather than line-pinned, because the previous pin here went stale'
- Phase 2b CI shape: Postgres service-container job — .github/workflows/ci.yml:55-71 Windows Postgres service, store-postgres globalSetup embedded Postgres, first-use.yml PostgreSQL service; engines >=22.16 in all three manifests
- Dependabot inert until repo on GitHub with file on default branch — `git branch -r` lists origin/dependabot/npm_and_yarn/npm-dependencies-5308eab432, so Dependabot is active
- [PROVEN] legend's server-SQL clause re-opens if row-15 ruling reversed — condition satisfied: @vidimera/store-postgres landed (CLAUDE.md; docs/analysis/2026-08-19-phase-4); row 15 not in deferral-register.md
- Versioning tooling revisit when the adapter package lands — closed by docs/analysis/2026-08-20-versioning-mechanics.md:131-136 (lockstep, no tooling); its 1.0 re-ask is carried in versioning-lockstep-re-ask-changesets
- OPEN-QUESTIONS §§1, 4 inventory — all sub-questions 'Decided (this build)' (docs/concept/OPEN-QUESTIONS.md:10-38,74-87); reader's own note: do not treat as open work


---

# Brainstorm — what the catalogue suggests

Everything below is a proposal or an observation, not a ruling. Where an option touches
`docs/concept/`, it needs a fresh sanction through `SCOPING-GUIDE.md` §§1–2 and is marked
so; where it touches the frozen byte-stability digests, it is out. Items are cited by their
catalogue number and id.

## 1. The shape of the backlog, and what it says

The register is three rows. The catalogue is 193 items, 111 of them code-shaped and open.
That gap is not a defect in the register — the register is a ledger of *deferrals with
triggers*, and almost none of the 111 are deferrals: they are recorded bounds, defended
readings, cuts with named recovery paths, and provisional shapes awaiting a freeze. The
repository's discipline of writing every limit down in the same breath as the guarantee is
exactly what makes the tail this long and this legible.

Two patterns in the tail are worth naming, because they are the ones a first public release
exposes:

- **Truth decays fastest in shipped comments.** Four claims in `packages/record/src` are
  stale against the tree today (item 11 (`redemption-shapes-build-own-and-naming-divergence`),
  item 185 (`stale-source-comments`)): the redemption triad "flagged to the pre-0.1 naming review"
  (`operator-surface.ts:37`) after that review retired; a "Node >= 24" runtime baseline
  (`id.ts:17`) against a `>=22.16` floor; "once a real Postgres adapter lands"
  (`store.ts:122`) after it landed; and finalize's steps named as `appendsOn`'s only callers
  (`refusal-codes.ts:212`) after `decline.ts` joined. Two more — the "not exercised by
  tests" notes at `finalize.ts:212` and `seal.ts:64`
  (item 91 (`defensive-unknown-profile-arms-untested`)) — are true today and are exactly the kind
  of note that outlives its truth. Two truth-repair increments have already run; comments in
  `.ts` files ship in the tarball's declaration output, so at the cut these become the
  package's own words to an adopter.
- **"Documented bound" is where owed tests hide.** The adapter's payload posture is asserted
  in a comment and pinned by no test (item 23 (`payload-posture-backing-specific-postgres-untested`));
  the defensive `unknown-profile` arms at finalize and seal are untested by their own
  admission (item 91 (`defensive-unknown-profile-arms-untested`)); the token seams' enlisted
  due-window shape has no test while the test file's comment says the seams take no `tx`
  (item 22 (`kernel-tx-seams-only-sqlite`)). Each is a day or less. None is gated. All three are
  the sort of thing a first adopter finds.

## 2. Where the pre-cut code surface actually is

Strip the catalogue to what a first public release should not ship without and the surface
is small: the release commit's two manifest edits, one conditional floor edit set, one
entry-point decision, and roughly a dozen sub-day items of truth restoration and hardening.
How to package that surface is the first choice.

**Option A — fold it all into the release commit.** One commit, one review. Against: the
checklist deliberately keeps the release commit to the flip list
(`docs/process/release-checklist.md`, "File changes") so that the diff against `8be3fce` is
legible; twenty unrelated comment and test edits would bury the two lines that matter.

**Option B — one "0.1 readiness" increment before the cut.** One spec/plan pair, one
branch, everything in sections A–B that is not the release commit. Against: it mixes
comment-only truth repairs (zero behavior) with new tests and a manifest metadata change,
and "one cluster per increment" is the standing discipline.

**Option C — three small increments, then the release commit** (recommended):

1. *Truth restoration in shipped source and tests* — the six comment sites, the two stale
   test comments, the two enlisted-token due-window tests, the (5)→(6) race-pair decision
   (item 25 (`redemption-order-pins-unpinned-cells`)), the `expiry.ts:135` leg index with its pin
   (item 24 (`hardcoded-leg-index-expiry`)), the two `unknown-profile` arm tests. Zero behavior
   change; reviewable as "does every changed sentence now match the tree".
2. *Registry-facing hygiene* — `homepage`/`bugs`/`keywords` in both manifests
   (item 10 (`manifests-metadata-fields`)); the `GOVERNED feature not available` message-head
   decision (item 45 (`governed-message-head-pin-decision`): pin, reword, or record unpinned);
   `@types/node` versus the floor (item 47 (`types-node-26-vs-floor`): pin to the floor major, or
   record the exact-floor CI leg as the deliberate gate). Each is a decision with a one-line
   code consequence; they share the property of being unfixable for 0.1 once published.
3. *Adapter and probe evidence* — the Postgres payload-posture test, a Postgres restart
   `ProbeDriver` (item 86 (`postgres-probe-driver-missing`)), the `ProbeDriver` open-options hook
   (item 15 (`probe-driver-open-options`) — the one item no record tracks), and — if wanted before
   rather than after — the PostgreSQL floor leg (item 20 (`postgres-11-floor-untested`)).

Then the release commit as the checklist writes it. Each increment leaves `main` shippable;
if the owner wants to cut after (1) alone, nothing in (2) or (3) blocks it.

## 3. The one behavioral decision: `SqliteStore` at the entry point

item 9 (`experimental-warning-lazy-sqlite-load-alternative`) is the only pre-cut item where the
*behavior* an adopter meets changes with the ruling. Three exits, all recorded somewhere in
the tree:

- **Ship as-is.** Every adopter below Node 24.15 sees `ExperimentalWarning` at bare import
  regardless of store; the flag is documented in `docs/guide/integrating.md`. Cost:
  first-impression noise; the entry point stays exactly what the API review closed on.
- **Lazy-load `SqliteStore`.** `node:sqlite` loads on first construction. Cost: reshapes the
  entry point after the closed review (a fresh ruling, not a slip); the first-use workflow's
  warning assertions must then expect silence on both legs; the guide, README and the
  checklist's floor-rule prose all move. Benefit: the warning becomes opt-in by store choice,
  which is the honest shape — an adopter on `MemoryStore` or Postgres never asked for
  `node:sqlite`.
- **Raise the floor to 24.15.** Drops the 22.x line the floor rule was written to keep; the
  rule keys on Stability 2, not on the warning's disappearance, so this contradicts the
  recorded rule as written.

Recommendation: ship as-is at 0.1 and record the lazy load as the *first* 0.x change to
weigh, with a named trigger — the first adopter report, or the floor rule firing. The
reason not to take the lazy load now is procedural, not technical: it reopens a review the
checklist treats as closed, days before the cut.

## 4. Row 22a and the durable backing — the one post-cut item that changes the cut

Row 22a's expected ruling is carry-forward with the growth visible. The catalogue's largest
cluster is that row's inventory, and one item in it would change what the register can
honestly say on release day: **a durable `SignatureStore` backing**
(item 34 (`durable-signaturestore-backing-unmeasured`)). It is row 22's first surviving trigger
disjunct, the reason orphan growth is "unmeasured", and the precondition the register itself
names for designing prune-at-seal.

Pulling it forward means: a signatures table in `packages/store-postgres` keyed by
`transitionDigest` with `put`/`listByRecord` semantics per `signing/store.ts`, conformance
tests against the embedded server, and a measurement of orphan growth, read amplification,
and `verifySignatures().orphans` against it. Effort L. It fires the trigger, which forces a
fresh row-22 ruling — and that ruling could then be made on measurement rather than on
"unmeasurable in this tree". It also lets `SignatureStore` shapes be tested against a second
implementation before they freeze at 1.0.

Against pulling it forward: it is a week of work in front of a cut that is otherwise
owner-gated only; the register's carry-forward ruling is already honest; and a host's
durable backing "arrives through the documented `signatures:` hook in the operator's own
deployment" — the library does not need to ship one to be correct.

Recommendation: do not block 0.1 on it; make it the *first* post-0.1 increment, before any
sidecar shape moves, so that prune-at-seal (item 26 (`prune-at-seal-identified-not-built`)) and the
`remove` ruling (item 53 (`signaturestore-remove-ruling`)) get decided on a measured backing rather
than a memory map. Everything else in the 22a inventory — the key-retirement pin
(item 40 (`key-retirement-permanent-minting`), S), the read-amplification pin
(item 27 (`layerverdicts-read-amplification`)), the cross-record sweep
(item 28 (`cross-record-orphan-sweep`)) — sequences behind it naturally.

## 5. The probe tier's honesty

Five catalogue items say the same thing from different angles: the operator-assurance tier
is proven to *pass* far more than it is proven to *fail*. Eleven of seventeen probes pin
only their conforming-host pass path (item 36 (`can-fail-campaign-eleven-probes`)); two probes
drive only the leg-0 or two-leg shape and report `not-driven` beyond it
(item 37 (`probe-driver-deeper-leg-shapes`)); no probe re-attacks the decline seam
(item 16 (`decline-probe-candidate`)); no `ProbeDriver` exists over `PostgresStore`
(item 86 (`postgres-probe-driver-missing`)); and a host whose profiles demand `policyDigest` or
`supersedes` at open sees every probe report `fail` from the runner catch rather than a
verdict (item 15 (`probe-driver-open-options`)).

The first three are the pre-1.0 program by the open-items plan's own placement, and each
needs its own scoping. Two are cheap and pre-cut-shaped: the open-options hook is an
additive optional method on a surface already marked provisional, and the Postgres restart
driver is a test fixture over infrastructure the suite already starts. A third idea the
catalogue does not contain as such: the first-use script (item 19 (`first-use-probe-tier-not-run`))
already builds a `MemoryStore` chain — a minimal host-declared driver over it would let the
clean-runner proof *run* the seventeen probes rather than count them, at the cost of one
more parked improvement riding the registry-dispatch commit.

The can-fail campaign itself is L and belongs after the cut, but its cheapest instrument —
a one-off branch-coverage run scoped to `probes/` to list unexecuted failure arms — is one
of the two named re-look triggers of the coverage posture (item 43 (`no-coverage-metric-triggers`))
and costs an afternoon.

## 6. What the gates do not read

Three scripts gate the tree and the catalogue names what each cannot see:
`contract-scan` never reads `*.mjs` or the workflows (item 17 (`contract-scan-mjs-yml-not-scanned`))
— so the five gates, the first-use script and every workflow are held to the standalone
contract by hand; `api-reference-sync` reads only the root entry point
(item 18 (`api-sync-gate-bounds`)), so the `./probes` subpath and the adapter's exports have no
drift gate; both scripts and `docs-index-sync` enumerate tracked files only
(item 94 (`critic-1-gate-scripts-read-only-tracked-files-unt`)), so a new document is invisible
until staged; markdown citations are checked by nothing (item 64 (`markdown-citations-no-gate`));
and `docs-index-sync` carries a dead branch (item 99 (`docs-index-sync-bounds-and-dead-branch`)).
None of these is release-gating and each has a recorded reason.

One increment could widen all of them, and one trap should be named before it is scoped:
`contract-scan.mjs`'s own source *contains* the patterns it hunts, as strings, so scanning
`.mjs` files means either allow-listing the scanner or making it read its pattern list from
data. The test file `scripts/test/contract-scan.test.mjs` also relies on `.mjs` being
unscanned to plant its fixtures. Cheap and clean by comparison: iterate `package.json`'s
`exports` in `api-reference-sync` (S), and add untracked-but-not-ignored files to the two
enumerators if working-tree semantics are wanted — with the counter-argument, also in the
catalogue, that tracked-only matches exactly what CI sees.

## 7. Public strings that are contracts once published

Several items are wording that becomes an interface at the cut, and the catalogue shows
they are decided by silence today: the `GOVERNED feature not available in this build`
message head, asserted by no positive test (item 45 (`governed-message-head-pin-decision`)); the
`Waiver` type on the `./probes` subpath against `SCOPING-GUIDE.md` §3's ban on the word for
user-facing surfaces (item 67 (`self-test-tier-vocabulary-tension`)); `acker` where SPEC §2 says
`actor`, with acks nested per finding (item 66 (`divergence-acker-vs-actor-and-nested-acks`));
`listDue` and `findNonTerminal` returning ids where SPEC §12 says records
(item 56 (`listdue-findnonterminal-return-ids-narrowing`)); seven exports and two option bags that
landed after the API review and are documented as unreviewed by it
(item 65 (`post-review-exports-unreviewed`)). Each is either a 1.0 freeze question or a rename that
only gets more expensive.

Two brainstorm moves. First, the cheap one before the cut: decide the message head — a
rename to an unknown-option-key message costs a dozen lines and removes a word
("GOVERNED") that names a mechanism the tree no longer has. Second, the structural one: the
1.0 freeze will otherwise be archaeology across `implementation-status.md`, the specs, and
source comments. A single *public-shape docket* — one process document listing every
provisional marking, divergence and unreviewed name with its site — costs nothing now and is
what the freeze session reads. It is documentation, so it is outside this sweep's "code
only" frame, but it is the thing that makes the code items in this section cheap later.

## 8. The sealed set is the bottleneck, so batch the asks

A striking number of code items are blocked not on effort but on a sanction: the third-horn
precheck (item 73 (`third-horn-sanction-c3-c4-from-read-chain`), SPEC §5), a profile-drift refusal
code (item 33 (`profile-digest-no-drift-detector`), SPEC §8), a decline probe target
(item 16 (`decline-probe-candidate`), CONTROLS §4), splitting `consultation-missing`'s two producers
(item 49 (`consultation-missing-two-producers-unobservable`), SPEC §8), the decline disposition and
reason-digest fields (item 69 (`cut-decline-disposition-field`), item 52 (`cut-decline-reason-payload-digest`),
SPEC §4), the `record-exists` locator (item 103 (`record-exists-no-blocker-locator`), SPEC §8's
refusal model), a public sweep or `expire()` (item 68 (`sweep-recipe-not-seam-no-scheduler`),
item 106 (`due-open-no-argument-free-resolver`), SPEC §11.2), making the reverse cross-instance
direction normative (item 118 (`spec-10-3-reverse-cross-instance-fail-close-sealed-text`), SPEC
§10.3). None should be taken piecemeal, and none is pre-cut.

The precedent for the alternative is session 8's sanction case
(`docs/analysis/2026-08-19-sealed-set-sanction.md`): several rulings argued together,
granted whole, landed in one commit. A post-0.1 *sealed-set docket* increment that argues
the candidates above as one case — grant some, decline some, each with its trade stated —
would unblock the code that follows in one motion instead of eight. The brainstorm's guess
at what such a case should *not* include: the third horn (its trade is a lost
compromise-evidence edge; the register argues it well), loosening the same-triple
`proposed` rule (item 71 (`cut-cross-triple-proposed-refs`) — fail-closed is right), and anything
touching the four principles.

## 9. Cheap evidence worth converting before release

Items whose closing act is a test, each under a day, none gated, all of which would make a
first adopter's reading of the source true:

- Postgres payload posture pinned (item 23 (`payload-posture-backing-specific-postgres-untested`))
  — proves `postgres-store.ts:20-24`'s claim.
- Two `unknown-profile` arm tests at finalize and seal
  (item 91 (`defensive-unknown-profile-arms-untested`)) — then delete the "not exercised" comments.
- Two enlisted-token due-window tests (item 22 (`kernel-tx-seams-only-sqlite`)) — then fix
  `clocks.test.ts:201`.
- The (5)→(6) race pair on both ladders, now that `RaceOnceStore` exists
  (item 25 (`redemption-order-pins-unpinned-cells`)).
- `transitionRef === chain head digest` at the signature-broken seams
  (item 84 (`transitionref-equals-digest-unasserted`)) — turns eight `notEqual(undefined)`
  assertions into equality.
- A key-retirement orphan pin (item 40 (`key-retirement-permanent-minting`)) — the register's "6 to
  13 over eight calls" figure currently rests on a rig that is gone.
- A `magnitude` byte pin (item 90 (`magnitude-never-value-pinned`)) — the one post-oracle field
  asserted only absent.

Together these are two or three days and could be the whole of increment (1) in section 2
if the comment repairs ride with them.

## 10. What not to do before the cut

The catalogue is as useful for what it argues against. Before 0.1: do not take the third
horn (item 73 (`third-horn-sanction-c3-c4-from-read-chain`) — a lost compromise-evidence edge under
a real tamper, and two must-not-change pins); do not add `SignatureStore.remove` ahead of a
durable backing to measure against (item 53 (`signaturestore-remove-ruling`)); do not touch
`byte-stability.test.ts` for any reason (every byte-pin item says so in its own shape);
do not loosen the same-triple `proposed` rule (item 71 (`cut-cross-triple-proposed-refs`)); do not
mint `unknown-staged`/`unknown-record` (item 62 (`oq6-unknown-staged-unknown-record-unminted`) —
ratified as throws for 0.1); do not add a sweep seam or `expire()`
(item 68 (`sweep-recipe-not-seam-no-scheduler`), item 106 (`due-open-no-argument-free-resolver`) — SPEC's
own shape); do not extract the finalize ladder (item 38 (`finalize-gate-ladder-extraction`) — a week
of pure relocation is the wrong week); and do not reconcile `acker`/`actor` or the ack
nesting (item 66 (`divergence-acker-vs-actor-and-nested-acks`) — a persisted-payload break that
belongs to the freeze, not to a patch).

## 11. Decisions only the owner can take

Collected from the items above so release day is not the first time they are asked:

1. The `SqliteStore` entry-point exit (section 3) — ship-as-is, lazy load, or raise the floor.
2. The `GOVERNED` message head (item 45 (`governed-message-head-pin-decision`)) — pin, reword, or
   record unpinned.
3. `@types/node` versus the floor (item 47 (`types-node-26-vs-floor`)) — pin to `^22` or record the
   CI leg as the gate.
4. Manifest metadata (item 10 (`manifests-metadata-fields`)) — add `homepage`/`bugs`/`keywords` or
   record the omission.
5. Whether the durable `SignatureStore` backing is the first post-0.1 increment (section 4).
6. Whether `listDue()` is retroactively covered by the retired row-6 ratification
   (item 11 (`redemption-shapes-build-own-and-naming-divergence`)).
7. Whether the PostgreSQL 11 floor claim stays as declared or gets a CI leg
   (item 20 (`postgres-11-floor-untested`)).
8. Whether to open a public-shape docket and a sealed-set docket after the cut (sections
   7–8) — both documentation, both cheap, both determine how expensive 1.0 is.

## 12. A proposed sequence

| Step | Content | Size | Gates the cut? |
|---|---|---|---|
| 1 | Truth restoration in shipped source and tests (section 2, increment 1; section 9's tests) | 2–3 days | No — but the source's words ship |
| 2 | Registry-facing hygiene: manifests, message head, `@types/node` (increment 2) | 1 day + 3 rulings | No — but unfixable for 0.1 after |
| 3 | Adapter and probe evidence: posture test, Postgres driver, open-options hook (increment 3) | 1–2 days | No |
| 4 | Release day per the checklist: floor rule, release commit, settings, dispatch, registry first-use, rows 1/19/22 | the checklist's own | Yes |
| 5 | First post-0.1: durable `SignatureStore` backing, then the 22a inventory on measurement | 1 week+ | No |
| 6 | Pre-1.0 program as the open-items plan stages it: can-fail, driver shapes, freeze docket | — | No |

Steps 1–3 are independent of the owner-gated settings that stopped the paused attempt, so
they can land while those are arranged; none of them changes what the release commit
touches. If time is short, step 1 alone is the one this sweep would not skip.
