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
exit ruling. Step 3 — redemption (the effect seam) — has **exited**: all three
of its increments have landed — SPEC §11.2's direct redemption shape, its
token shape (`beginRedemption`/`completeRedemption`), and the clocks that
resolve both of SPEC §4's remaining clock-driven edges
(`confirmed → expired`, `redeeming → redemption-failed`), so a lost
redemption token now resolves on its declared bound rather than stranding
the record indefinitely. Step 4 — multi-leg separation of duties — has
**started**: the first of two increments landed `open()`'s SPEC §10.1
sequencing rung, which verifies every prior-leg reference by replay before
a successor record is created and chains the verified evidence into the
successor's `opened` snapshot; the second increment — the SoD gate itself —
remains. So four of the eight build-order steps remain unstarted (steps
5–8), and the
package is **not consumable by a host today** — no build, no published
artifact; that record states it in the same breath as the green gates. The
maturity markers inside the concept set speak to a reference implementation
of the spec and move only when the behavior actually lands here.

## Layout

| Path | What it is |
|---|---|
| `docs/concept/` | The ten-document concept set — `SPEC.md` is the single normative document |
| `docs/process/` | Living process artifacts (implementation status, deferral register, adopted-source provenance) |
| `docs/analysis/` | Point-in-time review documents (the step-1 whole-branch review) |
| `docs/superpowers/` | Design and plan documents for the implementation work |
| `packages/record` | `@vidimera/record` — the kernel whole: the capability-split factory, canonicalization and digests, hash-chained transitions; the store's two backings — in-memory and embedded-SQL (`store/sqlite.ts`) — held equivalent by the conformance suite, with the server-SQL backing still unbuilt; step 3, exited: the direct-shape and token-shape redemption seams plus both redemption clocks (`redeem()`, `beginRedemption()`/`completeRedemption()`, `operator.listDue()`, SPEC §11.2); and step 4, started: `open()`'s SPEC §10.1 sequencing rung, verifying every prior-leg reference by replay and chaining the evidence into a successor record's `opened` snapshot, with the SoD gate itself still to come. `docs/process/implementation-status.md` is the section-by-section account of what it does and does not build |
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

Step 3 — redemption (the effect seam) — has **exited**: all three of
its increments have landed. The first built section 11.2's direct
shape, `redeem(recordId, content, tx?)` as a verify-first gate ladder ending
in `confirmed → redeemed { via: 'direct' }`, enlisted through the caller's
own transaction handle where supplied. The second built its token shape,
`beginRedemption()`/`completeRedemption()`, a single-use token issued on
`confirmed → redeeming` and presented on `redeeming → redeemed`, returned to
the caller exactly once and never persisted. The third built both
redemption clocks: a generalized clock module resolving section 4's two
remaining clock-driven edges (`confirmed → expired`,
`redeeming → redemption-failed`), the `redemption-timeout` refusal code, and
`operator.listDue()`, the operator's one read over records whose pending
window has elapsed.

Step 4 — multi-leg separation of duties — has **started**. The first of two
increments landed section 10.1's sequencing half: a successor leg's
`open()` call carries one `{ recordId, chainHead }` reference per prior
leg, and the library verifies every one by replaying the referenced
chain — six conditions, failing closed to the new `prior-leg-unverified`
refusal (a pre-record, never-append code) on any mismatch. On success the
successor's `opened` snapshot carries the verified references in their
recorded three-field form plus the library-derived `priorLegActors`,
chaining the evidence for later audit. The second increment — the
separation-of-duties gate itself, reading that evidence — is next.

## License

Apache-2.0 — see `LICENSE`.
