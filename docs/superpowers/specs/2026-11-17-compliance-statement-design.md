# The compliance-statement increment — design

**A post-build-order increment (no step), documentation and one test file only. No sealed-set
edit, no source change, no public-surface change.**

**Status.** Taken on the owner's standing instruction of 2026-11-17 ("make your own
decisions"). Branch `compliance-statement-2026-11-17`, stacked on
`supersedes-binding-2026-11-17`. Not merged.

## What it answers, and why

SCOPING-GUIDE §6: "adopting the library makes no host compliant with anything, and every
user-facing document in an inheriting project must say so". Only the root README said so in
those words. The package README — the registry page after the 0.1 cut, and for most consumers
the only page they read — listed three "does not promise" bullets and left this one out, beside
package keywords that include "tamper-evident" and "audit". The store-postgres README, the
documentation front door and four of the five guide pages carried no statement; the FAQ
answered the question without the sentence.

## Goals, non-goals

- Goal: every user-facing page states that adopting the library makes no host compliant with
  any law or regulation, in its intro, where a reader who reads nothing else still meets it.
- Goal: a pin that fails when a user-facing page — including a guide page added later — lacks
  the statement.
- Non-goal: auditing every page for compliance-flavored wording; the pin checks presence only,
  and says so.
- Non-goal: `docs/concept/` (it states the rule) and `docs/process/` (not user-facing).

## Approaches

1. **One sentence per page plus a presence pin (picked).** Each page names the limit in its own
   intro; the pin enumerates the guide directory so a new page is covered on arrival.
2. **A single disclaimer page linked from each.** A link is not a statement, and §6 asks every
   document to say so. Not picked.
3. **Extend `contract-scan`.** It scans all markdown, but its job is the standalone contract; a
   required-content rule for a named page set is a different check. Not picked.

## Rulings

- The package README gains the root README's "It is not compliance." bullet verbatim, in its
  "does not promise" list. The other pages gain one sentence in their intro, linking the FAQ;
  the FAQ's answer gains the sentence itself.
- The pin is `scripts/test/compliance-statement.test.mjs` (the `record` vitest project already
  runs `scripts/test/**`): the phrase "makes no host compliant", matched after collapsing
  whitespace, on the root README, both package READMEs, `docs/README.md` and every
  `docs/guide/*.md`; a guard test keeps the enumeration from passing vacuously.

## Exit

Every gate green except `smoke` (CI). The new pin observed red against the tree before the
edits (eight of ten failed) and green after.
