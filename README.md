# Vidimera

A domain-agnostic verifiable-decision-record library: durable, content-bound,
hash-chained, operator-replayable records of human confirmations over AI-drafted
actions.

## Status

The **concept is complete and normative**; its ten-document set lives in
[`docs/concept/`](docs/concept/README.md), presented whole at its deliberate
embedded, operator-only scope. **Implementation is beginning** in this repository
(TypeScript, pnpm workspaces); no build-order increment has landed yet. The
maturity markers inside the concept set speak to a reference implementation of
the spec and move only when the behavior actually lands here.

## Layout

| Path | What it is |
|---|---|
| `docs/concept/` | The ten-document concept set — `SPEC.md` is the single normative document |
| `docs/process/` | Living process artifacts (deferral register) |
| `packages/record` | `@vidimera/record` — the library (walking skeleton today: `create()` throws not-implemented) |
| `scripts/` | Repo tooling (standalone-contract scan) |

## Development

Requires Node 22+ and pnpm (via corepack).

```text
pnpm install
pnpm typecheck      # tsc strict, no emit
pnpm lint           # Biome
pnpm test           # vitest
pnpm contract-scan  # must print nothing (the standalone contract)
```

Next increment: build-order step 1 — the kernel
(`docs/concept/SCOPING-GUIDE.md` section 7).

## License

Apache-2.0 — see `LICENSE`.
