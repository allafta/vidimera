# The sealed-set sanction — one corrective pass, six rulings

**Date: 2026-08-19.** This is the record of the sanctioned corrective pass that phase 0 of
the release plan decided (`docs/analysis/2026-08-19-phase-0-decisions.md`, ruling 5). It is
the fourth sanctioned corrective commit in the sealed-set convention's lineage
(`docs/process/implementation-status.md`'s sealed-history account: six marker moves, four
correctives, two pre-convention commits) — a deliberate, owner-ruled un-seal of
`docs/concept/` for exactly one commit and exactly the edits below, the seal re-armed at
that commit. The sanction is spent with it: this record licenses no further edit.

**Scope.** Exactly the six recorded observations the release-phase agenda listed
(`docs/analysis/2026-08-18-release-phase-brainstorm.md`, "Sealed-set observations held for
the owner"). Every ruling was taken by the repository owner in the 2026-08-19 session, each
argued against the sealed text read in place. Nothing outside the six was touched; five
produced edits and one produced a deliberate no-edit.

## The rulings

1. **OPEN-QUESTIONS §2 — the tail lands.** §2's fail-close recommendation was taken in code
   at the step-6 increment (`finalize()`'s rung (4.5)); alone among the decided sections it
   carried no "Decided (this build)" tail. Ruling: add the tail in the sibling form. Edit:
   one tail appended to §2 — fail-close, the recommendation on record.

2. **The front-door build-order line — corrected.** `docs/concept/README.md`'s document
   table described SCOPING-GUIDE as carrying "a build order proven through step 6 (7–8 the
   designed continuation)", stale against the set's own SPEC markers, moved for steps 7–8
   under six per-increment marker-move sanctions. Ruling: reword minimally. Edit: the line
   now reads "a proven eight-step build order".

3. **The [PROVEN] legend — deliberately untouched.** The legend's cross-backing clause
   names "in-memory, embedded-SQL, and server-SQL stores"; this repository holds two
   backings today. Ruling: **no edit** — phase 0's own row-15 ruling builds the server-SQL
   adapter before the release this pass serves, which satisfies the clause; editing the
   sentence that defines every marker's meaning, to buy accuracy that phase 4 restores
   anyway, was rejected. The dependency is recorded: if the row-15 ruling is ever reversed,
   this item re-opens.

4. **`DecisionRecord.status` — §2's table gains the row.** SPEC §5, §12, and §13 all
   require a per-record report of `active`/`retired`; §2's field table carried no row that
   could hold it, and the build ships the field because three sections require it. Ruling:
   the table moves (the alternative — rewording three sections against `state` — would
   contradict §5's own state-preserving seal). Edit: one `status` row in §2's field table,
   named distinct from `state`.

5. **`supersedes` — the open()-option shape is ratified.** SPEC §2's profile-conditional
   list and CONTROLS' Recovery row both said "profile-conditional", while SPEC §9.1's
   ConfirmProfile table — the text that decides what a profile declares — carries no such
   field, §2's own Recovery paragraph describes the host supplying the verified reference
   at the recovering record's `open()`, and both this build and the reference
   implementation's later head ship exactly that. Ruling: the two outlier sentences move;
   §9.1 stands. Edits: §2's list now carries `supersedes` as a flow-conditional field
   (present only when a recovering `open()` supplied it; no profile field declares it), and
   CONTROLS' Recovery row's switch column now reads "`supersedes` supplied at the recovering
   record's `open()` (an open-time option, never a profile field)".

6. **The SPEC §5 pair — minimal clarifying additions, quotes preserved.** Two
   wording-versus-code readings, each taken identically by this build and the reference
   implementation's later head, are now stated in §5 itself:
   - The audit functions: `replay(chain)`/`verifyChain(chain)` exist exactly as §5 writes
     them (the pure chain functions the kernel calls throughout); what §5 did not say is
     where a consumer reaches them. Edit: one added sentence — they are exposed on the
     operator handle (§9), each taking a `recordId` and running over the chain the store
     returns for that record. The signatures and the "run on whatever the store returns"
     sentence stand unchanged. Whether the pure functions are *also* re-exported from the
     package entry point stays a pre-0.1 API-review question (register row 6), deliberately
     not decided here.
   - The pre-seam rule: "Every operator-side mutating seam verifies the chain before
     acting" stands **verbatim** (it is quoted in `kernel/redeem.ts`, and the citation
     resolver holds it there); the addition scopes it to the acted-on record's own chain
     and names the one append outside the rule with its limit in the same breath —
     `open()`'s exclusivity path expiring a due-`open` blocker (§4's en-passant rule)
     appends to the blocker's chain without a pre-verify, so that edge is only as
     trustworthy as the chain it extends, caught at the blocker's own next verifying seam
     or audit, not at the expiring append.

## What this pass did not do

No maturity marker moved (this is a corrective commit, not a marker move). No register row
moved. No code changed — every edit is markdown in `docs/concept/`, plus the process-doc
synchronization (`docs/process/implementation-status.md`'s sealed-history account and
four-items closure; `docs/process/next-phases.md`'s OQ §2 entry) and this record. The
byte-stability digests, the tests, and the public surface are untouched. The seal is
re-armed: the next `docs/concept/` edit needs its own fresh sanction through
`docs/concept/SCOPING-GUIDE.md` §§1–2's machinery.
