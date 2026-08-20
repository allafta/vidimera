# Session 7 — the committed-read clause: an inherited speculation, retired

**Date: 2026-08-20.** The open-items plan's stage-3 sixth ruling
(`docs/process/open-items-plan.md`; session 7 of
`docs/process/open-items-sessions.md`). The question as the plan carried it: the `Store`
interface header (`packages/record/src/store/store.ts`) claimed "a committed-read
surface is still named-not-built, SPEC §12" and that it would land "at a later build
step" — but the eight-step build order is complete, so no later build step exists. The
session's archaeology found the question was mis-posed: there was never anything to
build.

## The ruling

**Reworded, not built and not deferred.** The clause was inherited speculation, never a
spec obligation: it is retired from the header, no deferral-register row is opened
(there is nothing to defer), and nothing hangs on the 1.0 freeze from this clause —
except one observation, below, handed to the freeze session's agenda as an observation
rather than an obligation.

## The archaeology

- **The phrase arrived with the kernel.** `git log -S 'committed-read'` on
  `store/store.ts` returns exactly one commit: `ce16eb1`, "Import the base kernel from
  the reference implementation". The original header speculated the interface would
  "most likely gain a caller-transaction seam and a committed-read surface" — the
  reference project's guess about its own future, imported wholesale.
- **Half the guess came true, which kept the other half alive.** The
  caller-transaction seam (`tx?`) landed at the fifth step-2 increment; the 2026-08-12
  increments then re-worded the surviving half from "most likely gaining" to
  "still named-not-built, SPEC §12" (the sqlite-adapter increment's plan wrote the
  final wording; its design said "it stays future"; the find-non-terminal design said
  "stays (both still true)"), and the 2026-08-19 store-postgres design carried
  "named-not-built stays so" once more. Each carry treated the header's own inherited
  speculation as a fact about this build's future.
- **The spec contains no such surface.** SPEC §12's Reads paragraph names exactly four
  reads — `readChain`, `chainHead`, `findNonTerminal`, `listDue` — and all four are
  built. "The full committed chain" is a property of `readChain` (a transition written
  inside an aborted host transaction was never appended, SPEC §3), not a fifth
  surface.
- **Why nothing caught it.** The comment scrub that removed every reference-project
  pointer left this one standing because it wears a valid section number; the contract
  scan's citation resolver verified that §12 exists and had no quotation to resolve —
  the misattribution is a paraphrase, and paraphrases are outside the resolver's
  documented bounds. A lesson for the scan's bounds list, not a defect in it: a wrong
  paraphrase under a right section number is invisible to every automated gate this
  repository has.

## The one genuine residual — an observation for the freeze agenda

The only real semantics the phrase could gesture at: read isolation **under an open
caller transaction**. A same-connection `readChain` issued mid-transaction would see
the transaction's own uncommitted appends — in tension with "the full committed chain"
if a host ever reads inside its own `tx`. Nothing documented, tested, or shipped
depends on that corner, and the reads take no `tx` parameter, so the documented flow
never enters it. The 1.0 store-freeze session (the open-items plan's stage 6, which
already absorbs this session's outcome) should look at it once while freezing the
signatures — as an observation, not a revived obligation.

## Closing acts

The `store.ts` header sentence is completed (the stage-1 session deliberately fixed
only its server-SQL clause and left this one verbatim for this ruling): the
committed-read clause and "at a later build step" are retired, the provisional-shape
statement now points at the 1.0 freeze, and the retired claim is named in place as
inherited speculation with a pointer here. The open-items plan's stage-3 sixth
checkbox ticks.
