# Per-handle Frozen Closures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** No function object is shared between the agent and operator handles, and none can be
extended.

**Architecture:** A one-function module wraps each kernel function in a fresh frozen closure per
handle; both surfaces use it.

**Tech Stack:** TypeScript (strict), vitest, Biome.

**Spec:** `docs/superpowers/specs/2026-11-20-surface-closures-design.md`.

**Execution:** native (small), then one review on the most capable model.

## Global Constraints

- Branch `surface-closures-2026-11-20`, off `main` at `49b4417`; BOM-free commit messages ending
  with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; never amend.
- Never edit `docs/concept/**`, the frozen byte-stability digests, `packages/record/src/index.ts`.
- No existing assertion changes its truth value.

### Task 1: The closures, the pins, the record

- [ ] Write `surface-closures.test.ts`; observe red against the old source.
- [ ] Add `handle-fn.ts`; wrap every function in `agent-surface.ts` and `operator-surface.ts`.
- [ ] Whole suite, typecheck, lint, contract scan; the guide's capability-split sentence, the
  CHANGELOG, the status record, `CLAUDE.md`'s counts; commit.
