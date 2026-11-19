# The AL2 restatement, follow-up commit — design

**Date: 2026-11-20.** Call 3.2 of `docs/analysis/2026-11-17-sanction-calls.md`: "One follow-up
when call 2's increment lands: condition (iii) narrows to the host-supplied sidecar that cannot
join the append's unit, in the same sentences, and nowhere else." Call 2's increment, the
transactional sidecar, has landed (main `75ed531`). No maturity marker moves; no code changes.

## 1. What this answers

Since the transactional sidecar, condition (iii) of SPEC §14 — no signature outlives an
uncommitted append — holds when the configured sidecar is the store's own: each reference store
writes a signature inside the atomic unit of the append it signs, after its compare-and-swap and
only if the append applies (pinned on `MemoryStore`, `SqliteStore` and `PostgresStore`; the
rollback splice and the lost-batch splice refuse `chain-compromise`). It still fails for a
sidecar kept apart from the store, which is written before the append and outside it. The sealed
set says the condition is not met at all, in five sentences call 3.1 wrote and three the owner's
grant of 2026-11-19 wrote. Each now says where it holds and where it does not.

## 2. Rulings

- **Two commits, two grants.** A1–A5 are call 3.1's own sentences (sites 1, 2, 4, 5, 7 of the
  AL2 restatement design's §6) and land under call 3.2, which this spends. B1–B3 are sentences
  the owner's grant conditioned (sites 15, 16 and 17b of that design's §11 and §12). The owner
  granted conditioning them and, the same day, said to continue autonomously with all
  permissions granted; keeping those sentences' conditions accurate once the code moved is read
  as within that grant, and is called out here, in the status record and to the owner, who can
  revoke it. Sites 3, 6 and 8 of call 3.1 do not mention condition (iii) and do not change.
- **"A sidecar kept apart from the store", not "the host-supplied sidecar".** Call 3.2 names the
  host-supplied sidecar. The accurate class is wider: the library's own `MemorySignatureStore`,
  configured beside a store rather than as its sidecar, is written before the append too
  (separate mode). The sentences name the class the code defines, which narrows (iii) exactly
  as far as the code does and no further.
- **No new pins.** Both halves are already pinned: integrated mode in
  `packages/record/test/transactional-sidecar.test.ts`, `al2-conditions.test.ts` and the
  store-postgres suite; separate mode by the existing condition (iii) pins.

## 3. The sentences

Each site: the current text, then the proposed text, checked mechanically at the commit (every
proposed text present, every current text absent).

### Under call 3.2

**A1 — SPEC §13A, the closing sentence on AL2 (call 3.1 site 1)** (call 3.2).

Current:

> boundary, and no signature outlives an uncommitted append, which this build's
> sign-before-append order does not yet meet; detached signing (AL2, §14) is the upgrade for
> those, stated with the absence caveat and those conditions.

Proposed:

> boundary, and no signature outlives an uncommitted append, which this build meets only where
> the sidecar is written inside the append's atomic unit (§14); detached signing (AL2, §14) is
> the upgrade for those, stated with the absence caveat and those conditions.

**A2 — SPEC §14, the AL2 bullet's condition (iii) (call 3.1 site 2)** (call 3.2).

Current:

>   uncommitted append:** this build signs a transition before it appends it, outside the
>   append's atomic unit, so an append that is rolled back or loses its compare-and-swap leaves
>   a valid signature over a transition that never committed, which a key-less insider can
>   splice in where it was signed for. Signing

Proposed:

>   uncommitted append:** where the sidecar is the store's own, this build writes a signature
>   inside the atomic unit of the append it signs, after its compare-and-swap and only if the
>   append applies; a sidecar kept apart from the store cannot join that unit and is written
>   before the append, outside it, so there an append that is rolled back or loses its
>   compare-and-swap leaves a valid signature over a transition that never committed, which a
>   key-less insider can splice in where it was signed for. Signing

**A3 — CONTROLS §3, the Effect-result notarization row (call 3.1 site 4)** (call 3.2).

Current:

> AL2 signing closes the window early, under SPEC §14's conditions — a redemption the host rolls back leaves a valid signature over a `redeemed` transition that never committed (condition (iii)) |

Proposed:

> AL2 signing closes the window early, under SPEC §14's conditions — with a sidecar kept apart from the store, a redemption the host rolls back leaves a valid signature over a `redeemed` transition that never committed (condition (iii)) |

**A4 — CONTROLS §3, the AL2 detached signing row (call 3.1 site 5)** (call 3.2).

Current:

> (SPEC §14) — this build signs before it appends, so the last does not yet hold |

Proposed:

> (SPEC §14) — the last holds where the sidecar is written inside the append's atomic unit, not for a sidecar kept apart from the store |

**A5 — ASSURANCE §6, the AL2 row's "Closes" cell (call 3.1 site 7)** (call 3.2).

Current:

> (this build's sign-before-append order does not yet meet the last)

Proposed:

> (the last met where the sidecar is written inside the append's atomic unit, not for a sidecar kept apart from the store)

### Under the owner's grant

**B1 — ARCHITECTURE §3, the AL1-bound paragraph (site 15)** (owner's grant).

Current:

> uncommitted append (the last not yet met).

Proposed:

> uncommitted append (the last met only where the sidecar is written inside the append's
> atomic unit).

**B2 — ARCHITECTURE §9, the ladder's AL2 "Closes" cell (site 16)** (owner's grant).

Current:

> (the last, no signature outliving an uncommitted append, not yet met)

Proposed:

> (the last, no signature outliving an uncommitted append, met only where the sidecar is written inside the append's atomic unit)

**B3 — SCOPING-GUIDE §5, the build-vs-buy picture (site 17b)** (owner's grant).

Current:

>   sits outside the insider's boundary, and no signature outlives an uncommitted append (the
>   last not yet met).

Proposed:

>   sits outside the insider's boundary, and no signature outlives an uncommitted append (the
>   last met only where the sidecar is written inside the append's atomic unit).
