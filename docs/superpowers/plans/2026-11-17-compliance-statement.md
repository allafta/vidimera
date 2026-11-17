# Compliance Statement Implementation Plan

> **For agentic workers:** executed inline by the authoring session (a documentation-sized
> change), then one fresh review. Red was observed before green for the new pin.

**Goal:** Every user-facing page says adopting the library makes no host compliant with any law
or regulation, held by a presence pin.

**Spec:** `docs/superpowers/specs/2026-11-17-compliance-statement-design.md`.

## Global Constraints

- Branch `compliance-statement-2026-11-17`, stacked on `supersedes-binding-2026-11-17`.
- Never edit `docs/concept/**`. No source change. Guide code samples untouched. Preserve each
  file's line endings. No external references in new markdown.
- `pnpm` is broken on the authoring machine: run `node_modules/.bin/vitest run`, `tsc`, `biome`
  and the three `node scripts/*.mjs` gates directly; `smoke` runs in CI.

### Task 1: The statements, the pin, the record

- [ ] Write `scripts/test/compliance-statement.test.mjs` (the phrase "makes no host compliant",
  whitespace-collapsed, on the root README, both package READMEs, `docs/README.md` and every
  `docs/guide/*.md`, plus a non-vacuity guard). Run it against the unedited pages: red.
- [ ] Add the package README bullet (verbatim from the root README) and one intro sentence to
  each other page; the FAQ answer gains the sentence. Run the pin: green.
- [ ] Record: `CHANGELOG.md` `[Unreleased]` `Fixed`; a status section after the
  supersedes-binding section; the measured counts in the status "Current state" block and
  `CLAUDE.md`; this pair's `docs/superpowers/INDEX.md` row and file counts.
- [ ] Every gate; commit.
