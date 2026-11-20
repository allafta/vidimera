# AL2 Grant Sentences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** ARCHITECTURE §3 and §9 and SCOPING-GUIDE §5 say where AL2's third condition holds, as
SPEC §14 does, instead of "not yet met".

**Architecture:** Documentation only: one sealed-set commit under the owner's word of 2026-11-20,
then the records.

**Tech Stack:** markdown.

**Spec:** `docs/superpowers/specs/2026-11-20-al2-grant-sentences-design.md` — §4's texts are exact.

## Global Constraints

- **Branch:** `al2-grant-sentences-2026-11-20`, off `main` at `5e5f8b1`.
- **Commits:** BOM-free message files, `git commit -F`, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never amend.
- **The sealed commit touches only `docs/concept/ARCHITECTURE.md` and
  `docs/concept/SCOPING-GUIDE.md`**, and only G1–G3; no maturity token moves; CONCEPT.md is not
  touched.
- **Gates:** `node scripts/contract-scan.mjs`, `node scripts/docs-index-sync.mjs`,
  `node scripts/api-reference-sync.mjs`, biome; no code changes, so the suite stays at its measured
  count (1282 tests in 90 files at `5e5f8b1`).

## Review Focus

1. A proposed text that claims more than SPEC §14 (the wrapper case read as met).
2. A site outside G1–G3 edited, or a marker token moved.
3. A record still calling the three sentences pending, or one calling the 2026-11-19 grant the
   source of this edit.

### Task 1: The sealed commit

- [ ] Apply G1–G3 with a script requiring each current text exactly once; check every proposed
  text present and every current text absent; compare marker token counts before and after;
  contract scan; commit (`docs/concept/` only).

### Task 2: The records

- [ ] The status record (a section with G1–G3 verbatim and the owner's words), the records that
  call the sentences pending, `CHANGELOG.md`, `CLAUDE.md`'s lineage paragraph. Run the gates;
  commit.
