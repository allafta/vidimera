# Deferral register

The living register of consciously deferred work, per the process discipline in
`docs/concept/SCOPING-GUIDE.md` section 7: every deferral carries the trigger that
un-defers it. An entry leaves this table only when the behavior lands or the
deferral is explicitly retired. Numbers are stable identifiers, not positions: a
gap is an entry that has left, and a new entry takes the next number never yet used.

| # | Deferred item | Trigger to un-defer | Recorded |
|---|---|---|---|
| 1 | Publish tooling (build, versioning, release) for the record package | First external consumer, or the 0.1 cut | 2026-08-02 |
| 4 | Generalize root `typecheck` beyond packages/record and declare per-package test-runner devDependencies | Second workspace package lands | 2026-08-02 |
| 5 | `biome migrate --write` to clear deprecated `linter.rules.recommended` (dry-run against biome 2.5.6 confirms one hunk: `"recommended": true` becomes `"preset": "recommended"`; it does **not** add a `$schema` field — that must be added by hand if wanted) | Next housekeeping commit | 2026-08-02 |
| 6 | Pre-0.1 API naming review — the names actually exported from `packages/record/src/index.ts`: `MemoryStore`, `AgentSurface`, `OperatorSurface`, `Store`, `AppendResult`, `DecisionRecord`, `ReviewView`, `StagedDraft` (not `createWithClock` — internal by design, not re-exported from `index.ts`) | The 0.1 cut | 2026-08-03 |
| 7 | The expected-red contract-scan baseline — 210 findings, all under `packages/record/src` | `node scripts/contract-scan.mjs` exits 0 (the plan's comment-scrub task) | 2026-08-03 |
| 8 | A substitute increment-exit artifact — an implementation-status record tracking what has landed *here*, needed because build-order steps 2-6 move zero maturity markers and the inherited "spec-moves-to-truth at every exit" discipline is vacuous for five consecutive steps; cannot live in `docs/concept/` (sealed) | Before build-order step 2 begins | 2026-08-03 |
| 9 | The `redeem` effect-seam strand remedy — construction stays permissive (matching the reference implementation and the base test corpus it shipped); `open()` or `redeem()` must instead make the permanent `(profile, subject)` strand impossible for an effect-seam record that no build can advance. Needs a fresh RED test that exists in neither repository | Build-order step 1's exit | 2026-08-03 |
