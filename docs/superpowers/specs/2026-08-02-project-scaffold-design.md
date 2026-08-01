# Project scaffold design — Vidimera begins development

Date: 2026-08-02
Status: approved

## Purpose

Turn the docs-only Vidimera repository into a development-ready TypeScript monorepo,
preserving the concept set whole and untouched as the normative seed, and proving the
toolchain end-to-end with a minimal honest walking skeleton. Kernel implementation
(build-order step 1, SCOPING-GUIDE §7) is explicitly out of scope — it gets its own
design/plan cycle on this foundation.

## Decisions taken (with the user, 2026-08-02)

1. **Stack:** TypeScript / Node. The spec is written in TS idiom; zero translation loss.
2. **Depth:** infrastructure + walking skeleton. No kernel behavior in this effort.
3. **Packaging:** pnpm workspaces monorepo. `packages/record` now (zero runtime deps);
   `packages/adapter-*` arrive at build-order step 2.
4. **Docs:** the ten-document concept set moves whole to `docs/concept/` (including its
   own README, which remains the set's front door and map). Root `README.md` is rewritten
   as the project front door.
5. **Toolchain:** standard weight — tsc strict + vitest + Biome + editorconfig/gitattributes
   + GitHub Actions CI + the contract scan as a repo script. No build/publish tooling yet.

## Repository layout (target)

```
vidimera/
├── README.md                  new: project front door (status, commands, pointer to set)
├── CLAUDE.md                  updated: new paths + real commands
├── LICENSE
├── .gitignore                 extended: node_modules, dist, coverage, tsbuildinfo
├── .gitattributes             * text=auto eol=lf
├── .editorconfig
├── .github/workflows/ci.yml   typecheck · lint · test · contract-scan
├── biome.json
├── package.json               workspace root, private, scripts only
├── pnpm-workspace.yaml
├── tsconfig.base.json         strict, NodeNext
├── docs/
│   ├── concept/               the ten documents, moved whole, content unchanged
│   └── process/
│       └── deferral-register.md   seeded empty with format (item · trigger · date)
├── scripts/
│   └── contract-scan.mjs      cross-platform standalone-contract scan
└── packages/
    └── record/
        ├── package.json       @vidimera/record, type module, zero runtime deps
        ├── tsconfig.json      extends base
        ├── src/index.ts       create(config) — throws not-implemented at construction
        └── test/create.test.ts
```

## The walking skeleton — honest by construction

`src/index.ts` exports the spec's public entry point `create(config)`, which throws a loud
construction-time "not implemented" error. This is the docs' own feature-guard discipline
(SCOPING-GUIDE §7: unimplemented capability declared in config throws at construction)
applied to the whole library at day zero. It claims no behavior; the smoke test asserts
the throw. Maturity markers in the concept set do not move — nothing has landed in this
repository yet (per CLAUDE.md's marker rule).

## Contract scan as tooling

`scripts/contract-scan.mjs` replaces the PowerShell one-liner with identical semantics:
scan all git-tracked `*.md` except `CLAUDE.md` for (a) relative paths escaping the
repository, (b) ADR-style internal references, (c) external links other than the spec's
`example.com` worked examples; exit non-zero with findings, print nothing and exit zero
when clean. Node is the runner so the same command works on Windows and CI (JS regex has
native lookahead — no git-grep PCRE dependency). Wired as `pnpm contract-scan` and as a
CI job. All newly authored markdown (root README, process docs, this spec) stays free of
external URLs so the broad scan scope keeps holding.

## Toolchain details

- **pnpm** via corepack; workspace glob `packages/*`.
- **tsconfig.base.json**: `strict`, `module`/`moduleResolution` NodeNext, ES2022 target,
  `isolatedModules`, `noUncheckedIndexedAccess`.
- **vitest** run per-package from the root.
- **Biome**: single tool for lint + format, config at root.
- **CI** (GitHub Actions): on push/PR — install, typecheck, lint, test, contract-scan.
  Activates when a remote exists; inert until then.
- **Line endings**: `.gitattributes` normalizes to LF, ending the CRLF warnings.

## Commit sequence

1. **Reorganize** — `git mv` the ten documents to `docs/concept/`, update CLAUDE.md
   paths, write the new root README, add the design doc. Contract scan before commit.
2. **Scaffold** — toolchain files, workspace, `packages/record` skeleton + test, CI,
   deferral register. Contract scan + full pipeline green before commit.

## Verification

- `pnpm install && pnpm typecheck && pnpm lint && pnpm test` all green on Windows.
- `pnpm contract-scan` returns nothing.
- Concept set diff shows renames only (no content changes).
- CLAUDE.md commands section matches reality (the file's own closing instruction).

## Out of scope

Kernel implementation, store adapters, any SPEC behavior, publish tooling, remote/CI
activation. Next step after this scaffold: design/plan cycle for build-order step 1.
