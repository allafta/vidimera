# Changelog

Notable changes to `@vidimera/record`. The format loosely follows the widely used
keep-a-changelog shape; versions will follow semantic versioning once a version exists to
follow it.

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
  the store's seal-finality bar. The server-SQL third backing is consciously deferred
  (deferral register row 15).
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
- Repository-level: CI (typecheck, lint, strict lint, tests, contract scan), the
  standalone-contract scan with citation resolution over tracked code, and the public
  documentation set (`README.md`, `docs/guide/`, contributor and security policies).

### Known not-done

- No publish tooling: no `exports`/`main`/`types`/`files` fields, no build — the package is
  not installable (deferral register row 1).
- The pre-0.1 API naming review over the whole public surface is open (row 6); exported
  names may change before 0.1.
- Server-SQL backing (row 15), token-seam `tx?` (row 16), workspace-shape generalization
  (row 4), and the Biome config migration (row 5) are consciously deferred, each with a
  recorded trigger.
