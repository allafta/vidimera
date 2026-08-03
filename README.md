# Vidimera

A domain-agnostic verifiable-decision-record library: durable, content-bound,
hash-chained, operator-replayable records of human confirmations over AI-drafted
actions.

## Status

The **concept is complete and normative**; its ten-document set lives in
[`docs/concept/`](docs/concept/README.md), presented whole at its deliberate
embedded, operator-only scope. **Implementation is under way** in this
repository (TypeScript, pnpm workspaces): build-order step 1 — the kernel,
adopted from a reference implementation of the same spec — is landing
increment by increment, and no step has reached its exit yet. A base-vs-head
provenance audit and its fixes have since landed
(`docs/process/adopted-source-provenance.md`); a citation-integrity repair,
one remaining scope-boundary defect, and the step's own exit record are still
outstanding (`docs/superpowers/plans/2026-08-03-step-1-remediation.md`). The
maturity markers inside the concept set speak to a reference implementation of
the spec and move only when the behavior actually lands here.

## Layout

| Path | What it is |
|---|---|
| `docs/concept/` | The ten-document concept set — `SPEC.md` is the single normative document |
| `docs/process/` | Living process artifacts (deferral register, adopted-source provenance) |
| `docs/analysis/` | Point-in-time review documents (the step-1 whole-branch review) |
| `docs/superpowers/` | Design and plan documents for the implementation work |
| `packages/record` | `@vidimera/record` — build-order step 1 (the kernel) in progress: the capability-split factory, canonicalization and digests, hash-chained transitions, and an in-memory store (23 source files, ~2,850 lines; 226 tests across 22 files) |
| `scripts/` | Repo tooling (standalone-contract scan) |

## Development

Requires Node 22+ and pnpm (via corepack).

```text
pnpm install
pnpm typecheck      # tsc strict, no emit
pnpm lint           # Biome
pnpm test           # vitest
pnpm contract-scan  # exit 0 today, zero findings
```

Current work: closing out build-order step 1's remediation pass —
citation-integrity repair, one remaining scope-boundary defect, and the
step's exit record (`docs/concept/SCOPING-GUIDE.md` section 7).

## License

Apache-2.0 — see `LICENSE`.
