# The three owner's-grant sentences on AL2's third condition — design

**Date: 2026-11-20.** The repository owner, asked whether three sealed sentences that still call
AL2's third condition "not yet met" may be brought into line with SPEC §14, answered in so many
words: **"granted, update the three sentences too."** This records that sanction and the exact
edit it licenses. No maturity marker moves; no code changes.

## 1. What this answers

SPEC §14's condition (iii) — no signature outlives an uncommitted append — holds where the
sidecar is the configured store's own and that store writes each entry inside the atomic unit of
the append it signs, as the reference stores do, and fails for any other sidecar (the
transactional-sidecar increment, then the AL2 restatement follow-up's sealed commit `e387502`).
Three sentences the owner's 2026-11-19 grant conditioned still say the condition is "not yet
met": ARCHITECTURE §3, ARCHITECTURE §9's AL2 ladder cell and SCOPING-GUIDE §5. They understate,
and now differ from the normative text. The follow-up's design left them for the owner's explicit
word, because the status record calls the 2026-11-19 grant spent.

## 2. The machinery

Applied as the 2026-11-17 sanction calls applied it. AL2 is promoted and `[PROVEN]`; by
SCOPING-GUIDE §1's tier test it is GOVERNED, and nothing here promotes, demotes or re-tiers
anything, so §2's promotion rule is not engaged as a promotion. Its purpose-trace binds: the edit
traces to the governed-host bar (an operator who enabled AL2 because a storage-writing insider is
outside its trust boundary) and makes three sentences say what SPEC §14 already says. CONCEPT.md
is not touched; no principle and no honesty-discipline bullet changes.

## 3. Rulings

- **One sealed commit, `docs/concept/` only, the three sentences and nothing else.** The sanction
  is spent at that commit.
- **The wording is ASSURANCE §6's, already reviewed.** Each "not yet met" becomes "met only where
  the sidecar is the configured store's own and written inside the append's atomic unit, not for
  any other sidecar" — the text A5 of the follow-up put in ASSURANCE's AL2 row, and the shape A4
  put in CONTROLS. It names the class by identity with the configured store, as the code does, so
  the wrapper that hides a store's own sidecar reads as not met (the overclaim PR #26 was closed
  for).
- **Where it understates, recorded, not changed.** As for A4 and A5: a `SqliteStore`'s own
  sidecar behind a wrapper that hides it, appending inside a host transaction, loses the rollback
  half of the residual (a host rollback removes the entry) while a lost compare-and-swap still
  leaves an orphan. The sentences err toward weaker, the safe direction.
- **The store's contract stays where SPEC §14 put it.** These are summary sentences that point at
  §14 by name; §14 carries "as the reference stores do". Repeating it here would widen the edit.
- **No new pins.** Both halves are pinned (`transactional-sidecar.test.ts`, `al2-conditions.test.ts`,
  the store-postgres suite, and separate mode's condition (iii) pins).

## 4. The sentences

Each site: the current text, then the proposed text, checked mechanically at the commit (every
proposed text present, every current text absent, marker token counts unchanged).

**G1 — ARCHITECTURE §3, the AL1 bound's closing sentence** (`docs/concept/ARCHITECTURE.md`).

Current:

> closure for all of it, under the three conditions `SPEC.md` §14 states — every registered
> profile signs, the key sits outside the insider's boundary, and no signature outlives an
> uncommitted append (the last not yet met).

Proposed:

> closure for all of it, under the three conditions `SPEC.md` §14 states — every registered
> profile signs, the key sits outside the insider's boundary, and no signature outlives an
> uncommitted append (the last met only where the sidecar is the configured store's own and
> written inside the append's atomic unit, not for any other sidecar).

**G2 — ARCHITECTURE §9, the AL2 row's closes cell** (`docs/concept/ARCHITECTURE.md`).

Current:

> under `SPEC.md` §14's three conditions (the last, no signature outliving an uncommitted append, not yet met);

Proposed:

> under `SPEC.md` §14's three conditions (the last, no signature outliving an uncommitted append, met only where the sidecar is the configured store's own and written inside the append's atomic unit, not for any other sidecar);

**G3 — SCOPING-GUIDE §5, the AL1 bullet** (`docs/concept/SCOPING-GUIDE.md`).

Current:

>   under the three conditions `SPEC.md` §14 states — every registered profile signs, the key
>   sits outside the insider's boundary, and no signature outlives an uncommitted append (the
>   last not yet met).

Proposed:

>   under the three conditions `SPEC.md` §14 states — every registered profile signs, the key
>   sits outside the insider's boundary, and no signature outlives an uncommitted append (the
>   last met only where the sidecar is the configured store's own and written inside the
>   append's atomic unit, not for any other sidecar).

## 5. Records

The status record gets a section with G1–G3 verbatim and the owner's words; the records that
call these sentences pending (`docs/process/next-phases.md`'s sanction-gated list and the
transactional-sidecar note, the status record's two parentheticals, the CHANGELOG's call 3.2
entry) say they landed; `CLAUDE.md`'s lineage paragraph counts the commit.
