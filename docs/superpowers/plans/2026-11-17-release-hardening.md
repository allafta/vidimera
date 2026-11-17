# Release Hardening Implementation Plan

> **For agentic workers:** executed inline by the authoring session, then one fresh review on
> the most capable model. Red is observed before green for the new unit pins.

**Goal:** The release guard checks the tag, the ref and lockstep versions; credentials live
only in a publish job that runs no toolchain; first-use stops interpolating inputs into shell.

**Spec:** `docs/superpowers/specs/2026-11-17-release-hardening-design.md`.

## Global Constraints

- Branch `release-hardening-2026-11-17`, stacked on `compliance-statement-2026-11-17`.
- Never edit `docs/concept/**` or any library source. Every action pinned by full SHA.
- `pnpm` is broken on the authoring machine: run vitest, tsc, biome and the `node scripts/*.mjs`
  gates directly; `smoke` and the workflows themselves run only on GitHub.

### Task 1: The guard script and its unit pins

- [ ] `scripts/test/release-guard.test.mjs`: pass on a tag `v0.1.0` with both packages at 0.1.0
  and neither private; one finding each for private, `0.0.0`, versions out of lockstep, a
  branch ref, a tag that does not match; several findings at once on the pre-release tree.
  Run: red (no module).
- [ ] `scripts/release-guard.mjs`: `guardFindings` plus the CLI. Run: green.

### Task 2: The workflows, CODEOWNERS, dependabot

- [ ] `release.yml` split per the design's goals and rulings; header and dispatch text
  corrected.
- [ ] `first-use.yml`: inputs through `env:`, semver check.
- [ ] `CODEOWNERS`, `dependabot.yml`.
- [ ] `scripts/test/workflows.test.mjs`: the release test rewritten over two jobs (the same
  guarantees plus: `build` is `contents: read`; `publish` alone has `id-token: write`, runs in
  `environment: release`, has no checkout/install/cache step, downloads the artifact, publishes
  record first; the guard step runs `scripts/release-guard.mjs` with the ref through `env:`);
  a first-use test that no `run:` block interpolates an input.

### Task 3: The record

- [ ] `docs/process/release-checklist.md`: `workspace:^`, the dispatch section's guard
  description, the two settings steps.
- [ ] `CHANGELOG.md`, a status section, the measured counts (status, `CLAUDE.md`), the INDEX
  row and counts. Every gate; commit.
