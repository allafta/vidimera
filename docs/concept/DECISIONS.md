# Decision rationale corpus

The load-bearing design decisions, each with its *why*. An inheriting project may re-decide
any of them — but should do it against the recorded reasoning, not by accident. Format:
**decision — rationale — what re-deciding costs** (the cost clause is spelled out where it
is not already implicit in the rationale).

---

## Custody & evidence

1. **Digest-only custody, everywhere.** Content, consultation payloads, finding content, and
   policy documents cross the seams as digests; the host retains bodies. — The library can
   make integrity claims without becoming a data store, a privacy liability, or a rendering
   authority; every seam gets the same simple custody story. — Re-deciding means the library
   inherits retention, erasure, and confidentiality duties it is not positioned to hold.
2. **All decision state lives in the durable record.** No host-memory lifecycle state;
   replay over the chain is the sole authoritative derivation; persisted columns are
   constraint-and-index only. — Restart-survival and auditability come from one place;
   there is nothing to desynchronize. — Caching state elsewhere reopens split-brain between
   store and memory.
3. **The reviewed-surface (`facts`) binding is KERNEL, not optional.** — "What the human
   actually saw" is the control that makes the confirm meaningful; without it the record
   binds content nobody necessarily looked at. — Making it optional silently downgrades
   every record's evidential value.
4. **Cross-leg content equality is NOT verified.** Each leg binds its own content digest. —
   A checker may legitimately approve an annotated or enriched draft; both digests are
   chained and auditable. — Enforcing equality in the library forbids legitimate flows;
   hosts that want identical-content legs enforce it in staging.
5. **`profileDigest` is a data-only projection.** The genesis notarizes the profile's
   configured fields, excluding host code references. — Config drift becomes detectable on
   replay without hashing unhashable closures. — Including code refs makes the digest
   unstable across deploys; excluding the digest entirely blinds replay to governance drift.

## Identity & time

6. **Identity by transport; payload identity refused.** The host establishes the principal
   from session/transport and passes it explicitly; the library authenticates no one. — An
   agent can forge any payload field; forging the host's session layer requires compromising
   the host's own authentication, a threat the set places out of scope as the host's
   (`ASSURANCE.md` §4). — Trusting
   payload identity is the single most common way in-house builds void their own evidence.
7. **Principal-only comparison at the SoD gate.** Same principal under a different authority
   still refuses. — Pair-equality would let one human re-authenticate under a second
   authority and pass; fail-closed is the correct direction. — The residual
   (same human, different principal strings) is an AL1 limit, named, not silently accepted.
8. **Recording-time timestamps; no caller-supplied `at`.** The library stamps consultations
   at the recording seam. — At AL1 a caller-supplied observation time is caller-trusted
   fiction; stamping is the only honest time the library has. — Accepting host times
   quietly converts the freshness story into trust-me.
9. **Freshness gating deliberately unbuilt at AL1.** A staleness gate over library-stamped
   times compares `now` to `now` and can never fire — a dead gate wearing an assurance
   label. — Ship it only when authority timestamps (AL2) make it meaningful. — Building it
   early is pure overclaim.

## Outcomes & errors

10. **Result-first outcomes; refusals returned, never thrown.** Exceptions are reserved for
    caller/config errors and storage faults where nothing was recorded. — Domain outcomes
    are data the host routes on; exceptions are bugs the host fixes. Mixing them makes both
    unreliable. — The registry loses meaning if "not found" and "refused" blur.
11. **Caller errors are loud throws — including corrupted persisted config.** An unknown
    record id, an unknown staged ref, a persisted leg id absent from its profile: throw,
    uniformly, recording nothing. — A garbled chain is a storage fault; a fail-open clamp
    onto a default leg would silently mis-decide it. — Converting these to refusals invites
    retry loops against corruption.
12. **`availability` is its own class, carried by its own outcome status, never a `refused`
    edge, never fail-open.** — An unreachable authority is neither a domain refusal nor an
    approval; it is a third thing with bounded-retry semantics, and encoding it as either
    neighbor corrupts both. — Fail-open here is the classic silent security hole.
13. **The policy absent/declared mismatch throws; a missing required consultation refuses.**
    Deliberately asymmetric. — Policy is a single mandatory environment fact with an
    explicit `unreachable` escape hatch — its absence is a host contract violation; a
    missing consultation is the domain's "host omitted evidence" case. Keeping absence out
    of `policy-drift` leaves that code purely "the digests differ". — Collapsing the
    asymmetry muddies both codes' meaning.
14. **The refusal registry is a compiler-total map; append behavior is one shared
    derivation.** Every code has a class or the build fails; whether a refusal appends is
    `appendsOn(code, leg)` in one place. — Registry drift and per-seam append improvisation
    are the failure modes; totality and centralization prevent both.
15. **A fixed never-appends set.** Pre-record, terminal-record, contention, and
    redemption/seal codes never write a `refused` edge. — There is either no record to append
    to, a terminal chain that must not grow, or a lost sequence race whose call landed nothing;
    appending "refusals" there fabricates history. — Inert
    `terminalRefusals` members are documented rather than silently accepted.

## The chain

16. **The transition encoding is library-owned (JCS); the domain canonicalizer is
    adopter-supplied.** — Two implementations must verify each other's chains (library-owned
    serialization), but no library can know domain field semantics (adopter hook, declared
    re-implementable, fixture-pinned). — Owning both couples the library to domains; owning
    neither forfeits cross-implementation verification.
17. **Pre-seam chain-verify at every mutating seam; a clean verify is recorded as a
    consultation; a break folds into one compromise-refusal edge.** — Verification evidence
    belongs in the chain; but a failed verify must not decorate a tampered chain with
    trusted-looking artifacts — one AL1-honest edge, and the honest admission that
    `verifyChain` still reports only the original break.
18. **Sealing verifies first, and a sealed chain admits no append of any kind (C4).** — A
    compromised record must never reach `retired`; and a sealed record's body may be
    destroyed, so nothing may extend a chain whose evidence may be gone. — Softening C4
    reopens append-after-erasure.
19. **Byte-stability: feature keys are present-iff-declared.** A profile declaring no
    features produces chains byte-identical to the minimal model, pinned by frozen digest
    fixtures. — Every feature addition is provably non-breaking for existing adopters; drift
    shows up as a digest change in CI. — Losing this makes every feature a silent migration.

## Concurrency & the store

20. **Compare-and-swap append, never advisory pre-check.** The state check and append are
    one atomic operation. — A pre-check reopens time-of-check/time-of-use double-decide
    under concurrency; CAS closes it at the only layer that can. — Re-deciding moves the
    double-decide guarantee into application code, the layer that cannot win the race.
21. **Exclusivity lives in a store constraint over a library-derived non-terminal flag.** —
    Terminality is not a function of state alone (it depends on final-leg-ness and the
    effect-seam predicate), so a bare state predicate is wrong; and application-level checks
    race. The library derives, the store persists verbatim, the constraint enforces.
22. **The transaction seam is a passed-in handle, never a library-owned callback.** — The
    host must be able to commit a redemption edge in the *same* transaction as its effect,
    and the transaction boundary must never be hidden — enlist, don't wrap. — A
    `withTransaction` callback inverts ownership and hides commit points.
23. **`dueAt` is an index, never authority; clock edges resolve en passant; no scheduler.**
    — A scheduler is a second writer with its own failure modes; lazy resolution at
    observation moments (plus an explicit sweep) keeps one writer and makes a stale index
    harmless — the authoritative recompute declines bad candidates. — Re-deciding toward a
    scheduler adds a second writer with its own liveness and failure modes, for nothing the
    sweep does not already provide.
24. **The in-memory store is reference semantics, never durable evidence.** — It defines
    correct behavior for the conformance suite and serves tests; calling it evidence would
    be the exact overclaim the honesty discipline forbids.

## Feature posture

25. **Unimplemented profile fields throw at construction.** — A config the build cannot
    honor must fail fast, not silently degrade — the spec can then document ahead of code
    without shipping dead switches.
26. **Config validation is loud and declare-once; no silent least-restrictive defaults.**
    Reserved kinds are rejected; double-declared eligibility is an error; findings-flow
    fields are both-or-neither. — A governance control that defaults permissive on omission
    is a footgun; explicitness is cheaper than the incident.
27. **Open-time, operator-only policy binding.** The drift baseline is bound at `open()`,
    never at agent-reachable `stage()`. — Routing the baseline through the untrusted drafter
    lets a lying agent pre-bind whatever digest defeats the gate. — This is the pattern for
    every future gate baseline: never through the agent surface.
28. **Record-then-gate for findings/acks.** The seams record structurally-valid findings and
    acks faithfully (even non-counting ones); all counting judgment lives in the finalize
    coverage gate. — Fidelity-not-validity applied to evidence capture: the record shows
    what happened; the gate judges it at the decision moment — and staleness must be
    re-checked at finalize anyway, so seam-time validation would duplicate, not replace,
    the gate.
29. **Eligibility rides the consultation machinery as an implicit-first required kind.** —
    Authority-to-decide is evidence-shaped (an external check with a verdict); specializing
    the existing gate (`fail` → `ineligible`, open-by-default so a different eligible actor
    can decide) beats building parallel machinery.
30. **Redemption couples to the confirmed final-leg decision only; tokens are digest-only
    and non-recoverable; at-most-once over convenience.** — Effect release binds to the
    completed decision flow, not any leg's confirm; a persisted or re-issuable token would
    trade the at-most-once guarantee for convenience, which is the wrong trade for an
    evidence layer.

---

*Process decisions — one cluster per increment, feature guards from day one, byte-stability
pins, adjacent-pair order tests, a living deferral register, spec-moves-to-truth at exit —
are in `SCOPING-GUIDE.md` §7.*
