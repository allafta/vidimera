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
Step 2 — the store, for real — has **exited, with a recorded deferral**: two
of the three reference backings SPEC §12 names are built and held equivalent
by the conformance suite and the byte-identity test, and the third — the
server-SQL backing — is deferred to the deferral register, which carries the
exit ruling. Step 3 — redemption (the effect seam) — is **under way**: two
of its three increments have landed — SPEC §11.2's direct redemption shape,
then its token shape (`beginRedemption`/`completeRedemption`); both
redemption clocks remain. So five of the eight build-order steps
remain unstarted, and the package is **not consumable by a host today** — no
build, no published artifact; that record states it in the same breath as the
green gates. The maturity markers inside the concept set speak to a reference
implementation of the spec and move only when the behavior actually lands
here.

## Layout

| Path | What it is |
|---|---|
| `docs/concept/` | The ten-document concept set — `SPEC.md` is the single normative document |
| `docs/process/` | Living process artifacts (implementation status, deferral register, adopted-source provenance) |
| `docs/analysis/` | Point-in-time review documents (the step-1 whole-branch review) |
| `docs/superpowers/` | Design and plan documents for the implementation work |
| `packages/record` | `@vidimera/record` — the kernel whole: the capability-split factory, canonicalization and digests, hash-chained transitions; the store's two backings — in-memory and embedded-SQL (`store/sqlite.ts`) — held equivalent by the conformance suite, with the server-SQL backing still unbuilt; and step 3's two landed increments, the direct-shape and token-shape redemption seams (`redeem()`, `beginRedemption()`/`completeRedemption()`, SPEC §11.2). `docs/process/implementation-status.md` is the section-by-section account of what it does and does not build |
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
store, for real — has **exited, with a recorded deferral**. Landed across its
five increments: the all-or-nothing `appendBatch`, the `listDue` due-record
query, the `{ nonTerminal, dueAt? }` metadata shape section 12 gives both
append seams, the C4 seal-finality bar, the operator-only `seal()`
chain-retirement seam with the derived `active`/`retired` status behind it,
`findNonTerminal`, completing the eight-method `Store` interface section 12
describes, the backing-parameterized conformance suite (test-side, run over
that one backing), and the embedded-SQL adapter (`store/sqlite.ts`) with the
caller-supplied transaction seam (`tx?`) and the cross-backing
byte-identical-chains test — two of section 12's three reference backings,
held equivalent by the suite and the byte-identity test. The server-SQL
adapter is deferred to the deferral register, which carries the ruling that
exited the step without it.

Step 3 — redemption (the effect seam) — is **started, not exited**: two of
its three increments have landed. The first built section 11.2's direct
shape, `redeem(recordId, content, tx?)` as a verify-first gate ladder ending
in `confirmed → redeemed { via: 'direct' }`, enlisted through the caller's
own transaction handle where supplied. The second built its token shape,
`beginRedemption()`/`completeRedemption()`, a single-use token issued on
`confirmed → redeeming` and presented on `redeeming → redeemed`, returned to
the caller exactly once and never persisted. Both redemption clocks are the
third increment, not yet built.

## License

Apache-2.0 — see `LICENSE`.
