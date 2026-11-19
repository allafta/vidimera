# AL2 Restatement Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** The eight sealed sentences that call condition (iii) unmet say where it holds — a
sidecar written inside the append's atomic unit — and where it does not — a sidecar kept apart
from the store.

**Architecture:** Documentation only: two sealed-set commits under two grants, then the records.

**Tech Stack:** markdown.

**Spec:** `docs/superpowers/specs/2026-11-20-al2-restatement-followup-design.md` — §3's texts are
exact.

## Global Constraints

- **Branch:** `al2-restatement-followup-2026-11-20`, off `main` at `75ed531`.
- **Commits:** BOM-free message files, `git commit -F`, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never amend.
- **Each sealed commit touches only `docs/concept/`** and only its own sites; no maturity token
  moves; CONCEPT.md is not touched.
- **Gates:** `node scripts/contract-scan.mjs`, `node scripts/docs-index-sync.mjs`, and the whole
  suite once (no code changes, so it must stay at its measured count).

## Review Focus

1. A proposed text that claims more than the pins show.
2. A site outside the eight edited by accident.
3. The records still calling the follow-up pending.

### Task 1: The call 3.2 commit

- [ ] Apply A1–A5 with a script requiring each current text exactly once; check mechanically;
  contract scan; commit (`docs/concept/` only).

### Task 2: The owner's-grant commit

- [ ] Apply B1–B3 the same way; commit (`docs/concept/` only).

### Task 3: The records

- [ ] The status record (a section: both commits, their sentences verbatim, call 3 spent), the
  places that call the follow-up pending (`CHANGELOG.md`, `docs/process/next-phases.md`, the
  transactional-sidecar status section, `CLAUDE.md`'s lineage paragraph), the guide's sentences
  that say the sealed set lags (if any). Run the gates; commit.
