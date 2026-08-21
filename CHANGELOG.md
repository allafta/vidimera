# Changelog

Notable changes to the Vidimera packages — `@vidimera/record` and, since 2026-08-19,
`@vidimera/store-postgres` (both publish together at the 0.1 cut, and version in
lockstep thereafter — the 2026-08-20 versioning ruling,
`docs/analysis/2026-08-20-versioning-mechanics.md`; a cut with no changes in one
package says so here plainly rather than silently). The format loosely follows the
widely used keep-a-changelog shape; versions will follow semantic versioning once a
version exists to follow it.

**No release has been cut.** The package is pre-0.1 and unpublished — everything below sits
in `Unreleased`, recorded by build-order step rather than by date. The authoritative,
step-by-step account with gate outputs is `docs/process/implementation-status.md`; this file
is the summary, and that file wins on conflict.

## [Unreleased]

### Added

- **The kernel confirm loop** (build-order step 1): `create()` with fail-closed profile
  validation; the agent/operator capability split as two frozen handles; `stage` → `open` →
  `review` → `finalize`; content binding through registered canonicalizers and library JCS,
  including the always-on reviewed-surface (`facts`) binding; hash-chained transitions with
  `replay`/`verifyChain`; the result-first outcome model with the refusal registry and
  per-leg `terminalRefusals`; the open-window ttl with en-passant expiry; byte-stability
  pins and adjacent-pair gate-order tests.
- **Storage and retirement** (step 2): the `Store` contract completed to its eight methods
  (`appendBatch`, `listDue`, and `findNonTerminal` — which also made record exclusivity
  actionable — landed here); the in-memory and embedded-SQL (`node:sqlite`) reference
  backings, held equivalent by a backing-parameterized conformance suite and a
  cross-backing byte-identity test; chain retirement via the operator-only `seal()` and
  the store's seal-finality bar. The server-SQL third backing was consciously deferred at
  that step (deferral register row 15) and landed 2026-08-19 — see its own entry below.
- **The effect seam** (step 3): single-use redemption in both shapes — direct
  (`redeem`, host-transaction enlistable) and token (`beginRedemption` /
  `completeRedemption`, single-use token returned exactly once and never persisted) —
  plus the two remaining pending-window clocks (confirm-to-redeem, redeem bound) with
  their en-passant resolution, and the operator surface's sweep read over the store's due
  listing.
- **Multi-leg separation of duties** (step 4): ordered legs with verified prior-leg
  references, and the SoD gate over recorded actors and declared proposers.
- **Consultations** (step 5): the attach form for host-obtained consultations; required
  consultations with declared-order gating; the availability outcome.
- **Eligibility and policy drift** (step 6): the eligibility consultation kind with
  `ineligible`; policy-drift notarization with fail-close on the removed-policy-source
  corner.
- **Findings and acknowledgments** (step 7): `raiseFinding`/`acknowledge` as the only
  mid-lifecycle appends; ack-coverage gating (`ack-missing`/`ack-stale`); the findings
  projection on review.
- **Recovery, live capture, AL2 signing, and the self-test tier** (step 8): the
  `supersedes` recovery relation; live capture mode with its construction obligations;
  detached per-transition signing as an operator-enabled upgrade (mint, enforcement at the
  seams' chain-verify gates, and consultation freshness); and the operator-assurance probe
  tier (`runProbes`/`assertSatisfied` over a host-supplied driver).
- Repository-level: CI (typecheck, lint, strict lint, tests, build, the tarball smoke
  test, the contract scan, and the api-reference drift gate), the standalone-contract
  scan with citation resolution over tracked code, and the public documentation set
  (`README.md`, `docs/guide/`, contributor and security policies).
- **The pre-0.1 API review** (2026-08-19, retiring deferral register row 6): every
  signature-reachable type exported (no unspellable names), the signing tier and the pure
  `replay`/`verifyChain` audit functions moved onto the root entry, `Surfaces` naming
  `create()`'s handle pair, all prior names ratified unchanged, and `terminalRefusals`
  members validated at construction (a non-registry code now throws instead of silently
  never matching).
- **Publish tooling** (2026-08-19, deferral register row 1's tooling half): the full
  manifest shape (`exports` with `.` and `./probes`, `types`, `files`, `sideEffects`,
  `license`, `engines`, `repository`), a tsc build to `dist/`, a packed-tarball smoke test
  on every CI run (`pnpm smoke` — installs the tarball into a scratch project and drives a
  confirm loop through the exports map), and a dispatch-only, provenance-attested release
  workflow. The package stays `private: true` until the 0.1 cut by design.
- **CI hardening** (2026-08-19): a two-tier workflow — the platform-independent gates once
  on Linux; tests, build, and the tarball smoke test on a matrix covering the exact
  declared Node floor (22.16.0), current Node, and all three OSes — plus pnpm caching,
  weekly grouped Dependabot updates, and a CODEOWNERS guard over the sealed concept set
  and the frozen byte-stability digests. The Biome config migration landed with it
  (deferral register row 5, its trigger fired deliberately), clearing the deprecation
  notice from lint output.
- **The server-SQL backing** (2026-08-19, retiring deferral register rows 15 and 4):
  `@vidimera/store-postgres`, a second workspace package — `PostgresStore` over a
  caller-owned `pg.Pool`, row locks and a genesis advisory lock making the append CAS and
  the exclusivity constraint race-free under real concurrency. Proven three ways: the
  backing-parameterized conformance suite wired by one caller file (unchanged), a third
  cross-backing byte-identity leg, and five multi-connection contention scenarios —
  all against a real embedded Postgres the suite starts per run, on every CI OS. The
  second package fired row 4's workspace-shape work in the same increment, and `record`
  gained the adapter-author exports (`transitionDigest` and the C3/C4 semantic arms) a
  conforming third-party backing needs.
- **Enlisted token seams** (2026-08-19, retiring deferral register row 16):
  `beginRedemption`/`completeRedemption` gained the additive trailing `tx?` the direct
  `redeem` has — an enlisted issuance or completion commits or rolls back with the host's
  own outbox/effect row, and the enlisted-tampered corner refuses `chain-compromise`
  result-first with no edge.
- **Release mechanics and the docset gates** (2026-08-19): the api-reference drift gate
  (`pnpm api-sync`, in CI and the release workflow — its first run caught five
  undocumented exports, since documented); NOTICE files carrying the copyright (root and
  both packages); blank issues disabled with security reports routed to private
  reporting; the release workflow publishing both packages tarball-first with provenance;
  and `docs/process/release-checklist.md` as release day's one authoritative list. The
  phase-6 first-use rehearsal consumed both packed tarballs in a scratch project — full
  confirm loops green on both stores — and recorded that the `node:sqlite`
  ExperimentalWarning greets every `@vidimera/record` import.
- **Recorded human decline** (2026-08-21, the first post-build-order promotion): the
  operator-only `open → declined` seam (`decline()`, switched on by a leg's
  `decline: true`) giving a rejection the same evidentiary treatment as a confirmation —
  the authority rungs (chain-verify, state/expiry, identity, separation of duties,
  content-drift, the mandatory `facts` binding, eligibility including its AL2 freshness
  bound) gate exactly as finalize's do, while the evidence rungs (required
  consultations, ack coverage) are deliberately skipped and the seam takes no policy
  input. `declined { actor }` is terminal under every leg/effect-seam combination; zero
  new refusal codes, every decline refusal reusing an existing one; a non-declaring
  leg's chain stays byte-identical. The honest bound: proves who declined what they saw,
  never that the decline was sound — a "no" never routed to the seam does not exist.
- **Proposal provenance** (2026-08-21, the second post-build-order promotion): `open()`'s
  `proposed: { stagedRef }` option resolves the agent's original staged draft through the
  store, requires it to name the same `(profileId, subjectRef, legId)` as the opened
  draft (either mismatch throws, the same caller-error posture as an unresolvable
  `stagedRef`), and binds the resolved draft's digest into the genesis as
  `proposedDigest`, present-iff-supplied. The honest bound: proves a draft with that
  digest existed for the same triple at open, and — by comparing digests — whether the
  decision changed it; never who authored either draft, never that the revision was
  sound. Nothing gates on it.
- **Effect-result notarization** (2026-08-21, the third post-build-order promotion): a
  profile declaring `redeem.result: true` admits an optional host-claimed outcome digest
  at `redeem()` and `completeRedemption()` — `beginRedemption()` rejects it
  unconditionally, since issuance precedes execution — binding it as `resultDigest`
  inside the `redeemed` payload, present-iff-supplied. The honest bound: notarizes that
  the host asserted this outcome when it closed the coupling — the library never
  observes the effect, never verifies the claim, never mirrors later business state; the
  digest lands in the chain head, head-exposed until a `sealed` cap chains over it (AL2
  signing closes the window early).

### Fixed

- **A transient database failure no longer bricks a `PostgresStore` instance**
  (2026-08-19, found by the full-project review): the lazy-DDL memo cached a rejection
  and replayed the stale error forever; it now resets on failure so the next call
  retries.
- **A genesis race on one `recordId` across different `(profile, subject)` pairs now
  reports the contract's `state-mismatch` conflict** instead of surfacing a thrown
  unique-constraint violation (same review; pinned by a repeated-round contention test).
- The adapter's peer range on `@vidimera/record` publishes as a caret range
  (`workspace:^`), not an exact pin — a record-only patch release no longer breaks fresh
  adapter installs.

### Known not-done

- The release itself: the package is `private: true` and unpublished by design until the
  0.1 cut — the publish tooling landed 2026-08-19, and deferral register row 1 (the
  register's one live row) stays open until the release workflow is exercised once at
  that cut.
