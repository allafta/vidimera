# Vidimera

A domain-agnostic verifiable-decision-record library: durable, content-bound,
hash-chained, operator-replayable records of human confirmations over AI-drafted
actions.

## Status

The **concept is complete and normative**; its ten-document set lives in
[`docs/concept/`](docs/concept/README.md), presented whole at its deliberate
embedded, operator-only scope. **Implementation is under way** in this
repository (TypeScript, pnpm workspaces): build-order step 1 — the kernel,
adopted from a reference implementation of the same spec — has reached its
exit, recorded with its gate outputs, a per-spec-section account of what is and
is not built, and its outstanding list at
[`docs/process/implementation-status.md`](docs/process/implementation-status.md).
Seven of the eight build-order steps remain, and the package is **not
consumable by a host today** — no build, no published artifact; that record
states it in the same breath as the green gates. The maturity markers inside
the concept set speak to a reference implementation of the spec and move only
when the behavior actually lands here.

## Layout

| Path | What it is |
|---|---|
| `docs/concept/` | The ten-document concept set — `SPEC.md` is the single normative document |
| `docs/process/` | Living process artifacts (implementation status, deferral register, adopted-source provenance) |
| `docs/analysis/` | Point-in-time review documents (the step-1 whole-branch review) |
| `docs/superpowers/` | Design and plan documents for the implementation work |
| `packages/record` | `@vidimera/record` — build-order step 1 (the kernel): the capability-split factory, canonicalization and digests, hash-chained transitions, and an in-memory store. `docs/process/implementation-status.md` is the section-by-section account of what it does and does not build |
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

Next in the build order (`docs/concept/SCOPING-GUIDE.md` section 7): step 2 —
the store, for real. Not started.

## License

Apache-2.0 — see `LICENSE`.
