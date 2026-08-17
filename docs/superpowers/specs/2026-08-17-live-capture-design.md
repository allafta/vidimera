# Live capture and `reverify` — design

**Step 8's second tail item, one increment.** SPEC §9.2's `live` mode, whole: the
`captureMode:'live'` GOVERNED throw lifts behind real construction rules, and
`reverify` gains its redemption-seam semantics — on a reverify-declaring profile, a
content-digest mismatch at redemption refuses `content-drift` with an APPENDED refused
edge, terminal, releasing the exclusivity hold. No new codes, no new seams, no new
arguments: the mode falls out of machinery already built — required-consultation
gating (§11.1, rung 5.5), finalize's content recompute (rung 4), the redemption family
and its clocks, and the effect-seam predicate, which has read `captureMode === 'live'`
since the kernel increment. At exit, the live-mode maturity tokens move, OQ §7 records
its two residuals decided, and SPEC:488's one now-false clause takes its minimal
amendment — the user-sanctioned sealed-set edit. Step 8 stays **Started**; register
row 17's tail shrinks to AL2 signing + the self-test tier.

## Rulings taken at the live-capture brainstorm, so they are not re-litigated

- **The staged-reference contract is UNCHANGED** (OQ §7's second residual): `stage()`
  binds the reviewed rendering's digest exactly as today; finalize's existing rung (4)
  re-digests the decide-time fresh read the host supplies as `content` (drift refuses
  `content-drift` — §9.2's "it catches the change at the decision"); the mandated
  independent re-derivation is evidenced by the required consultation. "Binds at
  decision time" is satisfied because a finalize that succeeds proves the decide-time
  recompute matched the bound digest. Zero changes to `stage`/`open`/`finalize`.
- **reverify: no new argument; content-drift APPENDED terminal** (OQ §7's first
  residual): the redemption seams' existing `content` argument IS the fresh read
  (decide-what-exists — the state being executed). On a reverify-declaring profile,
  every CONTENT-digest comparison in the redemption family maps a mismatch to
  `content-drift` with an appended `refused { code: 'content-drift' }` edge — CAS from
  the current state (`confirmed` at the direct and begin arms, `redeeming` at
  complete's content arm), `nonTerminal: false`, `dueAt` omitted (clears the pending
  clock), the refusal carrying the edge's `transitionRef`. The append rides the
  ORDINARY non-terminal path — a live profile is an effect-seam profile, so its
  `confirmed` is non-terminal (the same store-legality as `redeeming →
  redemption-failed`); no C3 carve-out is involved. Drifted state cannot un-drift: the
  decision dies terminally, and the just-built recovery flow (`supersedes`) re-opens
  it under a fresh read — pinned by a composition test. Complete's TOKEN comparison
  keeps `effect-mismatch` on every profile: a wrong token is not state drift.
- **The enlisted branch (the direct shape's `tx?`) refuses result-first WITHOUT
  appending** — the family's settled discipline (its chain-verify and clock rungs
  both): an appended drift edge inside the host's transaction would roll back WITH
  the aborted effect and vanish, so an enlisted `redeem(…, tx)` meeting drift on a
  reverify profile returns `refused('content-drift')` with no edge and no
  `transitionRef`; a subsequent unenlisted invocation lands the terminal edge (the
  loser-agrees-with-reinvocation shape). Pinned RED-first on the SQLite backing
  (the lesson-9 precedent).
- **One increment.**
- **The sealed-set edit is tokens + OQ §7 tails + ONE clause**: the live-mode
  `SKETCHED` tokens move to `PROVEN` — SPEC:488's inline `[SKETCHED]` (plain brackets,
  prose), SPEC:667's `**`live` [SKETCHED].**` (plain brackets inside the bold span,
  the Recovery-heading precedent), CONTROLS:40's bare-word prose mention ("the
  SKETCHED live mode"), CONTROLS:45's row cell (bare word) — four tokens; OQ §7's
  residual sentence gains its "**Decided (this build):**" tails (and §7's paragraph
  may be minimally rephrased for tense-truth — the tails' own home admits it); and
  SPEC:488's trailing clause "whose seam semantics are among that mode's open
  decisions (`OPEN-QUESTIONS.md`)" — false once decided — takes a minimal rewrite
  pointing at OQ §7's recorded decisions. Nothing else in the sealed set changes;
  byte-verified with full before/after lines in the brief (lesson 22).

## Decisions of record for OPEN-QUESTIONS §7 (what the tails will say)

1. **The `reverify` surface's argument shape**: none new — the redemption seams'
   existing `content` argument is the fresh read; a reverify profile maps every
   content-digest mismatch to `content-drift`, appended and terminal (the refused edge
   from `confirmed`/`redeeming` rides the ordinary non-terminal path); the token
   comparison keeps `effect-mismatch`.
2. **The staging contract**: unchanged — neither changed nor bypassed; decide-time
   binding is enforced by finalize's recompute plus the gated independent
   re-derivation consultation.

## 1. Construction (`config.ts`)

The `captureMode:'live'` GOVERNED throw is removed in the same commit as the reverify
seam semantics — the construction-guarded count moves 2 → 1 (`freshness` alone
remains, deliberately: the AL1 vacuity argument). What replaces the guard is
`validateLiveCapture(profile)`, the settled fail-closed class:

- **Every leg declares `requiredConsultations`** (non-empty — already guaranteed
  non-empty by `validateRequiredConsultations` when present; this rule requires
  PRESENCE on every leg): §9.2's own sentence — "The obligation is gated, not merely
  stated: the re-derivation is declared as a `requiredConsultations` kind under
  §11.1, so a live host that skips or fails it fails closed at finalize". Which
  declared kind IS the re-derivation is the host's semantics; that its access path is
  genuinely independent is not library-checkable — that proof is the operator-assurance
  tier's live-path-distinctness probe (CONTROLS §4), and the module comment says so.
- **The `redeem` block is present with `confirmToRedeem` or `reverify: true`, at
  least one** (both is legal — a max age AND drift re-verification): §9.2's "either
  declares `confirmToRedeem` as a maximum age … or declares `reverify`".
- The existing structural rules stay: `reverify` on a non-live profile remains a
  construction refusal (already built — its check no longer sits behind the GOVERNED
  throw, so its message's "not built in this build" framing is rewritten truthfully:
  reverify is now live's own control, and declaring it without `captureMode:'live'`
  is the misdeclaration); stray-redemption-key checks unchanged.

The guard-sweep-total test (`construction-validation.test.ts`) loses its second
governed feature AGAIN (the FW-T1 swap left it `freshness` + `captureMode:'live'`):
it reshapes to the one that remains — a `freshness`-declaring profile throws GOVERNED
— and its comment names the movement (2 → 1 at the live-capture increment).

## 2. The reverify arm (`kernel/redeem.ts`)

One helper decides the mapping at each of the three CONTENT comparisons (direct rung
(5); begin's begin-time correspondence; complete's content half — NOT its token half):

- resolved profile declares `redeem.reverify` → mismatch appends
  `refused { code: 'content-drift' }` from the seam's current state and returns
  `refused('content-drift', transitionRef)`; a lost CAS follows the family's residual
  discipline (the racing writer moved the state; re-invocation re-reads).
- otherwise → `refused('effect-mismatch')`, never-append, exactly today's behavior.

`content-drift` at this seam appends UNCONDITIONALLY — `terminalRefusals` is
finalize's per-leg machinery (`appendsOn`/`refuseMaybeAppend`) and is not consulted
here; the refusal-matrix comments state the distinction so the matrix stays truthful.
The clock prologue is untouched and runs first (a due window resolves before any
correspondence, as today).

## 3. What does not change (stated, so the diff can be checked against it)

`stage()`, `open()`, `finalize()`, `kernel/expiry.ts`, `src/store/` (frozen, no
exception), `chain/*` (frozen encoding; replay untouched), the codes (23 — no new
code; `content-drift` gains its second PRODUCER, not a row), `ReviewView`,
`profileDeclaresEffectSeam` (already reads live — its comment's "in this build a
`captureMode:'live'` …" clause is finalized truthfully).

## 4. Tests

- **Construction**: live without per-leg `requiredConsultations` throws; live without
  a `redeem` block throws; live with `redeem: {}` (neither bound nor reverify)
  throws; live + `reverify` + required consultations constructs cleanly; live +
  `confirmToRedeem`-only constructs; `reverify` on a staged profile still refuses
  (the existing pin, message updated); the guard-sweep reshape (freshness alone).
- **End-to-end (the mode's happy path)**: a live+reverify profile — stage → open →
  finalize with the required consultation supplied → `confirmed` and NON-terminal
  (the effect-seam predicate pin: `seal()` refuses `unsealable-state` on it) →
  `redeem(recordId, sameContent)` → `redeemed`.
- **The reverify drift pins**: direct-shape drifted content → `content-drift`,
  refused edge APPENDED (state `refused`, `refusalCode` `content-drift`, terminal —
  a subsequent `open()` for the same `(profile, subject)` succeeds: the hold
  released); begin-time drift → same, from `confirmed`; complete-time content drift →
  same, from `redeeming`; complete with a WRONG TOKEN but matching content →
  `effect-mismatch`, never-append (the token half untouched); a live
  `confirmToRedeem`-only profile's drifted redeem → `effect-mismatch`, never-append
  (reverify undeclared ⇒ today's mapping).
- **The composition pin**: recover (`supersedes`) from the drift-refused record —
  `ok` (a terminal refused predecessor; the step-8 recovery flow closes the loop).
- **Byte-identity**: staged profiles' chains unchanged (the frozen byte-stability
  pins); a live profile's chain uses only existing transition kinds.
- **Finalize interplay**: a live leg's finalize without its required consultation
  refuses `consultation-missing` (rung 5.5, machinery unchanged — one pin proving the
  gated obligation fires).

## 5. The record

- **Status doc**: step 8 row — second tail item landed (live capture + `reverify`);
  the §9.2 row → live PROVEN with the two OQ decisions and the construction rules;
  §8's content-drift row note (second producer real; append-at-redemption
  unconditional, `terminalRefusals` not consulted there); the governed count 2 → 1
  WITH movement and tail amendments (lesson 15); the marker/OQ/clause edit recorded.
- **Register row 17**: amended in place — live capture done, the tail now AL2 signing
  + self-test tier (the row's own text names what landed and when).
- **CLAUDE.md / README**: the governed narrative gains 2 → 1; "Two per-leg/profile
  fields remain governed"-class sentences become one (`freshness`); step 8's cell.
- **Sweep** (LAST, hit==verdict): the standing list plus `captureMode`, `live`,
  `reverify`, `effect-mismatch`, `content-drift`, `two per-leg`, `2 →` /
  `down to 2`-class tails, `not implemented in this build` (the deleted GOVERNED
  message's text), `only staged capture is supported`, absence vocabulary (lesson
  21): `live capture is not`, `cannot construct`, `SKETCHED` outside docs/concept.

## What this does not claim

- **`freshness` stays GOVERNED and `[SKETCHED]`** — the last guard, AL2-dependent by
  the spec's own vacuity argument; it does NOT lift when AL2 signing is not built.
- **Step 8 does not exit** — AL2 signing and the self-test tier remain on register
  row 17, each gated on its own enablement design (OQ §1, OQ §5).
- **The library never verifies path-independence** of the host's re-derivation — the
  consultation gates its PRESENCE and verdict; genuineness is the operator-assurance
  tier's probe (CONTROLS §4). Stated wherever the mode is described.
- No new codes; no store change; no encoding change.

## Process

Subagent-driven development, standing lessons in force: the guard lift in the same
commit as the seam semantics; the sealed-set task's brief pastes full before/after
lines for every edit and the controller word-diffs run by run (lesson 22); SPEC-cited
strings escape-free (lesson 20); the record task greps absence vocabulary (lesson 21)
and runs its sweep LAST with hit==verdict; counts with movement; RED executed or its
substitution stated; the final review checks the status doc against CODE; no new
runtime APIs — the floor stays `>=22.16`.
