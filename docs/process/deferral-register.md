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
| 15 | The server-SQL backing (SPEC §12: "a server-SQL store (production, multi-connection-safe)") is deferred, and this row carries the step-2 exit ruling that deferred it: step 2 exited at its fifth increment with two of §12's three reference backings (in-memory, embedded-SQL) held equivalent by the backing-parameterized conformance suite plus the cross-backing byte-identity test. The owner read SCOPING §7's "real SQL adapters" as the proof-structure goal this row now carries, not a gate on the build order, because: the conformance suite makes a later backing landable without touching feature code (its design purpose); a server-SQL backing needs a reachable server, which collides with the zero-skips discipline on machines without one; and SPEC §12's three-backing proof structure is a SHOULD. A third backing lands as: an adapter package or module wired to the suite by one caller file, a third leg in the cross-backing byte-identity test, and real multi-connection contention coverage that neither existing backing can express | The first multi-operator consumer, or the 0.1 cut — whichever lands first | 2026-08-12 |
| 16 | The token-shape seams (`beginRedemption`/`completeRedemption`, second step-3 increment) take no `tx`: an enlisted token issuance or completion — a co-located record store with a REMOTE executor, wanting the `redeeming` edge atomic with a host outbox row, which would also shrink the crash-strand window between the append and the token's return — is deliberately unbuilt. SPEC §12's `tx` seam states its purpose as the co-located direct shape, and §11.2 defines the token shape by "no transaction is shared", so this is a scope reading, not an omission. Adding an optional trailing `tx?` later is additive, not breaking; the enlisted-tampered corner's no-edge refusal (the direct seam's rung-(1) shape) is what such a caller would inherit | The first host architecture that needs it, or the 0.1 cut — whichever lands first | 2026-08-13 |
