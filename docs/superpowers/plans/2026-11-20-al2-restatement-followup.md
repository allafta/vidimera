# AL2 Restatement Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** The five call-3.1 sentences that call condition (iii) unmet say where it holds — the
configured store's own sidecar, written inside the append's atomic unit — and that it fails for
any other sidecar.

**Architecture:** Documentation only: one sealed-set commit under call 3.2, then the records.

**Tech Stack:** markdown.

**Spec:** `docs/superpowers/specs/2026-11-20-al2-restatement-followup-design.md` — §3's texts are
exact.

## Global Constraints

- **Branch:** `al2-followup-2026-11-20`, off `main` at `75ed531`.
- **Commits:** BOM-free message files, `git commit -F`, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never amend.
- **The sealed commit touches only `docs/concept/`** and only A1–A5; no maturity token moves;
  CONCEPT.md, ARCHITECTURE and SCOPING-GUIDE are not touched.
- **Gates:** `node scripts/contract-scan.mjs`, `node scripts/docs-index-sync.mjs`, and the whole
  suite once (no code changes, so it stays at its measured count).

## Review Focus

1. A proposed text that claims more than the code's identity rule supports (the wrapper case).
2. A site outside A1–A5 edited.
3. The records still calling the follow-up pending, or calling it landed for sentences it did
   not touch.

### Task 1: The call 3.2 commit

- [ ] Apply A1–A5 with a script requiring each current text exactly once; check mechanically;
  contract scan; commit (`docs/concept/` only).

### Task 2: The records

- [ ] The status record (a section with A1–A5 verbatim, call 3 spent, the three owner's-grant
  sentences pending the owner's word), the records that call the follow-up pending, `CHANGELOG.md`,
  `CLAUDE.md`'s lineage paragraph. Run the gates; commit.
