# Deferral register

The living register of consciously deferred work, per the process discipline in
`docs/concept/SCOPING-GUIDE.md` section 7: every deferral carries the trigger that
un-defers it. An entry leaves this table only when the behavior lands or the
deferral is explicitly retired.

| # | Deferred item | Trigger to un-defer | Recorded |
|---|---|---|---|
| 1 | Publish tooling (build, versioning, release) for the record package | First external consumer, or the 0.1 cut | 2026-08-02 |
| 2 | CI remote activation (workflow is inert until a remote exists) | Repository pushed to a hosting remote | 2026-08-02 |
| 3 | CI hardening (permissions block, concurrency group, branch-filtered push triggers) | Repository pushed to a hosting remote (same trigger as entry 2) | 2026-08-02 |
| 4 | Generalize root `typecheck` beyond packages/record and declare per-package test-runner devDependencies | Second workspace package lands | 2026-08-02 |
| 5 | `biome migrate --write` to clear deprecated `linter.rules.recommended` and add the schema field | Next housekeeping commit | 2026-08-02 |
