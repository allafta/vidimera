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
