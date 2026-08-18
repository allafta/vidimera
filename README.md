# Vidimera

A domain-agnostic verifiable-decision-record library: durable, content-bound,
hash-chained, operator-replayable records of human confirmations over AI-drafted
actions.

## Status

The concept is **complete and normative**: ten self-contained documents at
[`docs/concept/`](docs/concept/README.md), presented whole at their deliberate embedded,
operator-only scope — the operator who runs the application is the sole consumer of the
records — with [`docs/concept/SPEC.md`](docs/concept/SPEC.md) as the single normative
document the rest defer to.

The implementation (`packages/record`, TypeScript) has **finished the eight-step build
order** `docs/concept/SCOPING-GUIDE.md` §7 lays out — all eight steps exited, the last
(recovery, live-mode capture, cryptographic chain-signing at AL2, and the
operator-assurance self-test tier) settling at commit `84484ba`. Measured against the
current tree: `pnpm test` — 45 test files, 621 tests, zero skips; `pnpm lint` — 97 files
checked, 14 infos, zero warnings or errors; `pnpm typecheck` and `pnpm contract-scan`
both clean; `refusal-codes.ts` carries 24 refusal codes; every construction guard once
installed to block an unbuilt capability has since been lifted, in favor of the real
behavior it was standing in for.

The package is **not consumable by a host today**, in the same breath as those green
gates: `packages/record/package.json` carries no `exports`, `main`, `types`, `files`, or
`scripts` field, and nothing here is compiled.

For the record and what comes next, read these rather than trusting a count here:

- [`docs/process/implementation-status.md`](docs/process/implementation-status.md) — the
  authoritative, step-by-step account of what this build does and does not implement,
  with gate outputs and the outstanding list.
- [`docs/process/next-phases.md`](docs/process/next-phases.md) — what gates the next
  cut (six live deferral-register rows, each with its own trigger) and what stays
  deliberately out of scope.
- [`docs/concept/README.md`](docs/concept/README.md) — the concept set's own front door.

## Layout

| Path | What it is |
|---|---|
| `docs/concept/` | The ten-document concept set — `SPEC.md` is the single normative document |
| `docs/process/` | Living process artifacts: implementation status, the next-phases roadmap, the deferral register, adopted-source provenance |
| `docs/analysis/` | Point-in-time review documents (the step-1 whole-branch review) |
| `docs/superpowers/` | The increment record — 24 specs, 27 plans (`specs/`, `plans/`; 3 plans have no spec), indexed chronologically at [`docs/superpowers/INDEX.md`](docs/superpowers/INDEX.md) |
| `packages/record` | `@vidimera/record` — the implementation, whole: the capability-split factory (`create.ts`), canonicalization and digests (`canonical.ts`, `jcs.ts`), chain encoding and replay (`chain/`), profile construction and validation (`config.ts`), and the kernel's per-seam logic (`kernel/`) — `open`, `finalize`, `redeem`, `seal`, findings, prior-legs, supersedes, expiry, consultations; two store backings held equivalent by a shared conformance suite (`store/` — in-memory and embedded-SQL); AL2 detached signing (`signing/`); and the operator-assurance self-test tier (`probes/`). `docs/process/implementation-status.md` is the section-by-section account of what it does and does not build |
| `scripts/` | Repo tooling (the standalone-contract scan) |

## Development

Requires Node 22.16+ and pnpm (via corepack; `pnpm@11.18.0` pinned in `package.json`).

```text
pnpm install
pnpm typecheck      # tsc strict, no emit
pnpm lint           # Biome
pnpm test           # vitest
pnpm contract-scan  # exit 0 today, zero findings
```

## License

Apache-2.0 — see `LICENSE`.
