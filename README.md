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
Step 2 — the store, for real — is under way and **has not exited**, so seven
of the eight build-order steps remain and the package is **not consumable by
a host today** — no build, no published artifact; that record states it in the
same breath as the green gates. The maturity markers inside
the concept set speak to a reference implementation of the spec and move only
when the behavior actually lands here.

## Layout

| Path | What it is |
|---|---|
| `docs/concept/` | The ten-document concept set — `SPEC.md` is the single normative document |
| `docs/process/` | Living process artifacts (implementation status, deferral register, adopted-source provenance) |
| `docs/analysis/` | Point-in-time review documents (the step-1 whole-branch review) |
| `docs/superpowers/` | Design and plan documents for the implementation work |
| `packages/record` | `@vidimera/record` — build-order step 1 (the kernel) whole: the capability-split factory, canonicalization and digests, hash-chained transitions, and an in-memory store; plus the part of step 2 that has landed so far, now proven over two backings — in-memory and embedded-SQL (`store/sqlite.ts`) — with the server-SQL backing still unbuilt. `docs/process/implementation-status.md` is the section-by-section account of what it does and does not build |
| `scripts/` | Repo tooling (standalone-contract scan) |

## Development

Requires Node 22.16+ and pnpm (via corepack).

```text
pnpm install
pnpm typecheck      # tsc strict, no emit
pnpm lint           # Biome
pnpm test           # vitest
pnpm contract-scan  # exit 0 today, zero findings
```

In the build order (`docs/concept/SCOPING-GUIDE.md` section 7), step 2 — the
store, for real — is **started, not exited**. Landed so far: the all-or-nothing
`appendBatch`, the `listDue` due-record query, the `{ nonTerminal, dueAt? }`
metadata shape section 12 gives both append seams, the C4 seal-finality bar,
the operator-only `seal()` chain-retirement seam with the derived
`active`/`retired` status behind it, `findNonTerminal`, completing the
eight-method `Store` interface section 12 describes, the
backing-parameterized conformance suite (test-side, run over that one
backing), and the embedded-SQL adapter (`store/sqlite.ts`) with the
caller-supplied transaction seam (`tx?`) and the cross-backing
byte-identical-chains test. The server-SQL adapter is section 12's one
reference backing still unbuilt; whether step 2 can exit without it is an
owner ruling not yet made.

## License

Apache-2.0 — see `LICENSE`.
