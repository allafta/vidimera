# Deferral register

The living register of consciously deferred work, per the process discipline in
`docs/concept/SCOPING-GUIDE.md` section 7: every deferral carries the trigger that
un-defers it. An entry leaves this table only when the behavior lands or the
deferral is explicitly retired. Numbers are stable identifiers, not positions: a
gap is an entry that has left, and a new entry takes the next number never yet used.

| # | Deferred item | Trigger to un-defer | Recorded |
|---|---|---|---|
| 1 | Publish tooling (build, versioning, release) for the record package | First external consumer, or the 0.1 cut | 2026-08-02 |
| 19 | Absolute byte pins over the AL2 detached-signature sidecar. `transitionDigest`'s input is `{recordId, seq, at, kind, payload, prevHash}` — no signature field — so no chain pin reaches a sidecar. (Row number 19: the highest row number ever used across `docs/process/`, `docs/superpowers/`, and `CLAUDE.md` is 18, so this entry takes the next number never yet used.) | The first increment that changes signature encoding or key handling, or the 0.1 cut — whichever lands first | 2026-08-23 |
| 20 | `kernel/decline.ts`'s rung (1) (pre-seam chain-verify plus the AL2 signature-layer check, and its `chain-compromise` append) is unexecuted by the entire test corpus, proved by mutation: deleting the rung wholesale leaves the full suite passing. Its ladder-order test is also missing the rung-(1)-beats-rung-(2) adjacent pair every other seam ladder pins. Full account: `docs/analysis/2026-08-23-signature-enforcement-coverage.md` (Findings A and B). (Row number 20: the highest row number ever used across `docs/process/`, `docs/superpowers/`, and `CLAUDE.md` is 19, so this entry takes the next number never yet used.) | The next increment that touches `packages/record/src/kernel/decline.ts`, or the 0.1 cut — whichever lands first | 2026-08-23 |
| 21 | Three AL2 signature-enforcement call paths (`acknowledge`'s shared prologue, `beginRedemption`, `completeRedemption`) are exercised only over a hash-broken chain, never a signature-broken one; and five of the seven signature-broken sites this package does test assert the refusal code only, not whether the compromise edge appended or was withheld. Full account: `docs/analysis/2026-08-23-signature-enforcement-coverage.md` (Findings C and D). (Row number 21: the highest row number ever used, once row 20 above is recorded, is 20, so this entry takes the next number never yet used.) | The next increment that touches AL2 signature enforcement, or the 0.1 cut — whichever lands first | 2026-08-23 |
