# The AL2 restatement, follow-up commit — design

**Date: 2026-11-20.** Call 3.2 of `docs/analysis/2026-11-17-sanction-calls.md`: "One follow-up
when call 2's increment lands: condition (iii) narrows to the host-supplied sidecar that cannot
join the append's unit, in the same sentences, and nowhere else." Call 2's increment, the
transactional sidecar, has landed (main `75ed531`). No maturity marker moves; no code changes.

## 1. What this answers

Since the transactional sidecar, condition (iii) of SPEC §14 — no signature outlives an
uncommitted append — holds when the configured sidecar is the configured store's own: the
signing decorator selects that mode by identity (`config.signing.signatures ===
config.store.signatures`, decided once), and each reference store writes a signature inside the
atomic unit of the append it signs, after its compare-and-swap and only if the append applies
(pinned on `MemoryStore`, `SqliteStore` and `PostgresStore`; the rollback splice and the
lost-batch splice refuse `chain-compromise`). With any other sidecar the decorator still writes
the entry before the append, outside it. Five sentences call 3.1 wrote say the condition is not
met at all.

## 2. Rulings

- **One sealed commit, under call 3.2; call 3 is then spent.** The sites are call 3.1's five
  sentences that mention condition (iii) — sites 1, 2, 4, 5 and 7 of the AL2 restatement design's
  §6. Sites 3, 6 and 8 do not mention it and do not change.
- **"The configured store's own", not "the host-supplied sidecar".** The code's class is decided
  by identity with the configured store. Call 3.2's "host-supplied sidecar" names part of the
  failing class but misses the rest: the library's own `MemorySignatureStore` configured beside a
  store, and a store's own sidecar reached through a wrapper that does not expose it, both run the
  old order. "Any other sidecar" is exactly the failing class, so the sentences narrow (iii) as
  far as the code does and no further. (A first draft said "a sidecar kept apart from the store";
  an independent review showed the wrapper case reads under it as met, and the draft was closed
  unmerged.)
- **The store's contract is named in the sentence.** (iii) holds only if the store writes the
  entries inside its unit, as the reference stores do; SPEC §12 does not state that contract (it
  lives in `packages/record/src/store/store.ts`), so §14's sentence says "as the reference stores
  do" rather than implying any store that exposes a sidecar meets it.
- **Not in this commit: the three sentences the owner's 2026-11-19 grant conditioned** that still
  say the third condition is "not yet met" (ARCHITECTURE §3 and §9, SCOPING-GUIDE §5). The status
  record calls that grant spent; editing them needs the owner's explicit word. Until then they
  understate: SPEC §14 is normative and now states where (iii) holds.
- **Recorded, not changed:** integrated mode still calls the host's signer before the append, so
  "(iii) holds" is a statement about what this build persists, not about any copy a host's signer
  keeps.
- **No new pins.** Both halves are already pinned.

## 3. The sentences

Each site: the current text, then the proposed text, checked mechanically at the commit (every
proposed text present, every current text absent).

**A1 — SPEC §13A, the closing sentence on AL2 (call 3.1 site 1).**

Current:

> boundary, and no signature outlives an uncommitted append, which this build's
> sign-before-append order does not yet meet; detached signing (AL2, §14) is the upgrade for
> those, stated with the absence caveat and those conditions.

Proposed:

> boundary, and no signature outlives an uncommitted append, which this build meets only where
> the sidecar is the configured store's own and written inside the append's atomic unit (§14);
> detached signing (AL2, §14) is the upgrade for those, stated with the absence caveat and those
> conditions.

**A2 — SPEC §14, the AL2 bullet's condition (iii) (call 3.1 site 2).**

Current:

>   uncommitted append:** this build signs a transition before it appends it, outside the
>   append's atomic unit, so an append that is rolled back or loses its compare-and-swap leaves
>   a valid signature over a transition that never committed, which a key-less insider can
>   splice in where it was signed for. Signing

Proposed:

>   uncommitted append:** it holds where the sidecar is the configured store's own and that
>   store writes each entry inside the atomic unit of the append it signs, after its
>   compare-and-swap and only if the append applies, as the reference stores do; with any other
>   sidecar this build writes the entry before the append, outside it, so an append that is
>   rolled back or loses its compare-and-swap leaves a valid signature over a transition that
>   never committed, which a key-less insider can splice in where it was signed for. Signing

**A3 — CONTROLS §3, the Effect-result notarization row (call 3.1 site 4).**

Current:

> AL2 signing closes the window early, under SPEC §14's conditions — a redemption the host rolls back leaves a valid signature over a `redeemed` transition that never committed (condition (iii)) |

Proposed:

> AL2 signing closes the window early, under SPEC §14's conditions — with a sidecar other than the configured store's own, a redemption the host rolls back leaves a valid signature over a `redeemed` transition that never committed (condition (iii)) |

**A4 — CONTROLS §3, the AL2 detached signing row (call 3.1 site 5).**

Current:

> (SPEC §14) — this build signs before it appends, so the last does not yet hold |

Proposed:

> (SPEC §14) — the last holds only where the sidecar is the configured store's own and written inside the append's atomic unit, not for any other sidecar |

**A5 — ASSURANCE §6, the AL2 row's "Closes" cell (call 3.1 site 7).**

Current:

> (this build's sign-before-append order does not yet meet the last)

Proposed:

> (the last met only where the sidecar is the configured store's own and written inside the append's atomic unit, not for any other sidecar)
