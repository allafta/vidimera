# Recovery (`supersedes`) — design

**Build-order step 8's first item, one increment.** SPEC §2's recovery linkage, whole:
`open()` accepts `supersedes` — the host's `{ recordId, chainHead }` claim naming a
terminal predecessor — verifies it by replay pre-record, and binds the verified
reference into the recovering record's genesis. The twenty-third refusal code
(`supersedes-unverified`) covers every verification failure. The call-seam GOVERNED
guard (`kernel/open.ts`'s `openOptionMessage` supersedes arm) lifts in the same commit
as the behavior. At exit, the five supersedes `SKETCHED` tokens move to `PROVEN` and
OPEN-QUESTIONS.md §3's three bullets gain their decisions of record — the sanctioned
sealed-set edit, ruled at the step-8 brainstorm. Step 8 moves to **Started**; the tail
(live capture/`reverify`, AL2 signing, the self-test tier) is deferred to a new
register row, each item gated on its own OPEN-QUESTIONS enablement design.

## Rulings taken at the step-8 brainstorm, so they are not re-litigated

- **Recovery only; tail deferred.** This increment lands recovery whole and nothing
  else. Step 8 records **Started**, not Exited — SCOPING-GUIDE §7's step 8 is a
  deliberate-order tail, and the build reaches its declared embedded scope with the
  remaining items enumerated as deferrals (one register row), never silently dropped.
- **One new code, `supersedes-unverified`** — `refusal`-class, pre-record,
  never-append (`NEVER_APPENDS`) — ONE code for every recovery-reference failure
  (unreadable or garbled predecessor chain, `chainHead` mismatch, non-terminal
  predecessor, unprovable terminality, subject mismatch): the `prior-leg-unverified`
  pattern at its own name, because codes are never reused with changed meaning and the
  prior-leg code names a different relation.
- **Tokens move + OQ records DECIDED at exit** (its own commit): the supersedes
  `SKETCHED` tokens — SPEC.md ~128 (§2's profile-conditional listing), ~130 (the
  Recovery paragraph heading), ~318 (§4's `opened` payload row), ~564 (§9's `open()`
  bullet), CONTROLS.md ~46 (the recovery row's bare-word cell) — become `PROVEN`,
  tokens only, byte-verified; AND OPEN-QUESTIONS.md §3's three bullets each gain a
  short "**Decided (this build):** …" tail in the document's own decision-of-record
  idiom. SPEC's pointer sentence ("Remaining recovery-flow details … are enumerated in
  `OPEN-QUESTIONS.md`") stays true and untouched — §3 then HOLDS the decisions. No
  other sealed-set character changes.
- **Same subject, any profile.** The predecessor's replayed `subjectRef` must equal the
  recovering record's; a mismatch refuses `supersedes-unverified`. `profileId` may
  differ — §10.3's own "disposal-and-re-open recovery" under a revised profile stays
  possible, and exclusivity is per `(profile, subject)` so a terminal predecessor never
  blocks either way.

## Decisions of record for OPEN-QUESTIONS §3 (what the OQ tails will say)

1. **The refusal shape**: the dedicated code `supersedes-unverified`, never-append
   pre-record — the `prior-leg-unverified` pattern at its own name.
2. **The exclusivity interaction**: SEQUENTIAL — verify-then-open under the ordinary
   store constraint alone. Terminality is one-way in this model (no edge leaves a
   terminal state; `seal()` only caps), so the predecessor's verified terminality
   cannot be raced away between the check and the genesis append; the only live race is
   the ordinary same-`(profile, subject)` open, which the existing exclusivity
   constraint already decides. No new store constraint — `src/store/` stays frozen.
3. **The back-reference**: none. The predecessor is terminal (and may be sealed — §12's
   C4 admits no append); the forward link in the recovering genesis is the evidence.

## 1. The reference and its intake (`config.ts`, `kernel/open.ts`)

`OpenOptions` gains `supersedes?: SupersedesRef` where

```ts
/** SPEC §2's recovery claim: the terminal predecessor `open()` verifies by replay —
 * never adopted unchecked (the §10.1 prior-leg discipline at the recovery relation). */
export interface SupersedesRef {
  recordId: string;
  chainHead: Digest;
}
```

(its own interface beside `PriorRecordRef` — identical shape, distinct relation, and
names carry meaning here). Intake is argument-depth and fail-closed, the established
class: a supplied `supersedes` that is not a plain object, has a missing/empty
`recordId` or `chainHead`, or carries an unknown key THROWS before any chain loads.
`openOptionMessage`'s supersedes GOVERNED arm is deleted in the same commit; the
generic unknown-key arm stays for genuinely unknown keys. Supply-conditional, no
profile switch — the reading `kernel/open.ts`'s own guard comment already records.

## 2. The verification (`kernel/supersedes.ts`, new)

One module, the `kernel/prior-legs.ts` precedent: `verifySupersedes(store, profiles,
ref, subjectRef)` replays the named predecessor and requires ALL of:

1. a non-empty chain at `ref.recordId` (an absent predecessor is an unverifiable
   claim — REFUSED, not thrown: the recordId here is a claim under verification, never
   a plain lookup; `verifyPriorLegs`'s own absent-chain arm takes exactly this posture,
   "a chain that no longer exists cannot be replayed", and a pin mirrors it here);
2. `verifyChain(chain).intact`;
3. `transitionDigest(chain.at(-1)) === ref.chainHead` — the host's head claim matches;
4. the replayed record TERMINAL by the derived formula (SPEC §2), with the
   profile-resolution nuance made explicit: states `refused`, `expired`, `redeemed`,
   `redemption-failed` are terminal regardless of profile; `open` and `redeeming` are
   non-terminal regardless; `confirmed` requires the PREDECESSOR's profile resolved in
   THIS instance (final-leg + effect-seam judgment) — an unresolvable predecessor
   profile on a `confirmed` predecessor FAILS CLOSED (terminality unprovable ⇒
   `supersedes-unverified`);
5. the replayed `subjectRef` equal to the recovering record's (the same-subject
   ruling).

Any failure ⇒ `refused('supersedes-unverified')`, pre-record, never-append. A
predecessor that is itself a recovery record ("an earlier superseded attempt") is
legal — terminality is THE condition; §2's parenthetical is illustrative, and a pin
proves a terminal `redeemed` predecessor qualifies.

## 3. The genesis binding and the fold (`kernel/open.ts`, `types.ts`, `chain/replay.ts`)

`open()`'s ladder gains the recovery rung AFTER the prior-legs sequencing rung and
BEFORE the genesis mint (both are pre-record verifications; prior-legs keeps its
established first position — where both fail jointly, `prior-leg-unverified` wins,
pinned if jointly constructible). The `opened` snapshot binds
`supersedes: { recordId, chainHead }` present-iff-supplied — a non-supplying `open()`
mints a byte-identical genesis (the frozen byte-stability pins keep proving it).
`DecisionRecord` gains `supersedes?: SupersedesRef`, folded by replay from the genesis
snapshot. `ReviewView` does NOT gain it — the established precedent: `priorRecordRefs`
is likewise not projected into review; `getRecord`/`replay` carry the linkage.
Exclusivity is untouched: the genesis append rides the existing constraint (and the
existing lapsed-blocker retry) unchanged — the sequential ruling above.

## 4. The code (`refusal-codes.ts`)

`supersedes-unverified` joins the union and `REGISTRY` (twenty-third; count pins
22 → 23 in one move), class `refusal`, and joins `NEVER_APPENDS` (pre-record: there is
no record to append a refusal to — the `prior-leg-unverified` arm's own reasoning). A
matrix section in the established shape; the matrix arithmetic string moves with it.

## 5. Tests

- **Count pins**: 22 → 23 in one move (both registry files; the arithmetic);
  `NEVER_APPENDS` grows by one; the matrix section.
- **Verification pins** (a real store, real records driven to their states): recover
  from a `refused` predecessor (happy path — genesis carries the ref, payload key-set
  pinned, `getRecord().supersedes` folded); from an `expired` one; from a terminal
  `redeemed` one (the illustrative-parenthetical pin); a chain-of-recovery predecessor
  (itself carrying `supersedes`) is legal; an OPEN predecessor refuses; a `confirmed`
  effect-seam final-leg predecessor refuses (non-terminal by the derivation — the
  seal-precedent pin at the recovery relation); a `confirmed` capture-terminal
  predecessor qualifies; a `confirmed` predecessor under an UNRESOLVABLE profile fails
  closed; a `chainHead` mismatch refuses; a garbled chain refuses; an absent
  predecessor refuses (mirroring `verifyPriorLegs`'s absent-chain arm);
  a subject mismatch refuses; a cross-profile recovery (predecessor under profile A,
  recovering under B, same subject) succeeds.
- **Intake pins**: malformed `supersedes` throws at argument depth (missing/empty
  fields, unknown key, non-object).
- **Order pins**: `prior-leg-unverified` outranks `supersedes-unverified` where jointly
  constructible; exclusivity (`record-exists`) is decided at the genesis append, after
  both verifications.
- **Byte-identity**: a non-supplying `open()` unchanged (the frozen byte-stability
  pins); the guard-lift: `open()` with `supersedes` no longer throws GOVERNED; the
  unknown-key arm still throws.
- **Frozen surfaces**: `byte-stability.test.ts`, `chain/encoding.ts`, `src/store/`
  untouched absolutely this increment (no store change and no authorized exception);
  `docs/concept/` untouched by the code commit — the marker/OQ commit changes exactly
  the five tokens plus the three OQ tails.

## 6. The record — step 8 starts, the build reaches its declared scope

- **Status doc**: steps table → step 8 **Started** (recovery landed; the tail —
  live capture/`reverify`, AL2 signing, self-test tier — deferred to the register row,
  each gated on its own OPEN-QUESTIONS enablement design; step 8 does NOT exit). §2
  row: recovery built, the three OQ decisions recorded, the same-subject/any-profile
  tightening named. §8 row: twenty-three codes. §9 row: `open()`'s options bag whole —
  all three documented keys real; the LAST call-seam GOVERNED guard lifted (the
  construction-guarded count is UNCHANGED at 2 — `captureMode:'live'`, `freshness` —
  and the doc says so with the distinction drawn).
- **Register**: ONE new row — the step-8 tail deferral (live capture/`reverify` per OQ
  §7, AL2 signing per the enablement questions, self-test tier per OQ §5, in the
  guide's deliberate order), with its re-arm trigger (a future brainstorm picking up
  the next tail item).
- **CLAUDE.md / README**: step 8 started at its first item; "one of the eight
  build-order steps remains unstarted" becomes step 8 Started with the tail deferred —
  re-verify the arithmetic and the sentence against the steps table before writing.
- **Sweep** (LAST, committed tree, hit==verdict): the standing list plus `supersedes`,
  `recovery`, `supersedes-unverified`, `twenty-two`/`22`, `SKETCHED` outside
  docs/concept (process docs naming supersedes' marker as future must have moved),
  `unstarted`, `step 8`, `remains GOVERNED at the call seam`, the old §2/§9 status-doc
  row text, `landing`/`will`/`not yet` near supersedes.

## What this does not claim

- **Step 8 does not exit.** Live capture (`captureMode:'live'`, OQ §7), AL2 signing,
  and the self-test tier (OQ §5) remain, deferred with their enablement questions
  open; the two GOVERNED construction guards (`captureMode:'live'`, `freshness`) stay,
  and this build's embedded operator-only scope is otherwise complete.
- **No back-reference is ever written to the predecessor** — its chain is terminal
  (possibly sealed) and stays byte-identical through recovery.
- The recovering record is an ORDINARY record in every other respect: every seam, gate,
  and clock applies to it unchanged; `supersedes` is genesis evidence, never a gate
  input.
- No SPEC prose changes — tokens and the OQ §3 decision tails only.

## Process

Subagent-driven development, standing lessons in force: guard lift in the same commit
as the behavior; the marker/OQ move is its own byte-verified commit; SPEC-cited strings
written with an outer quote style needing no escapes (lesson 20) and the scan run LAST
on the staged tree; the record task greps the status doc for recovery's ABSENCE
vocabulary (lesson 21: "have none", "no producer", "still GOVERNED at the call seam");
plan-authored comments truthful at the commit that lands them; counts with movement;
hit-count == verdict-count; RED executed or its substitution stated; the final review
checks the status doc against CODE; no new runtime APIs — the floor stays `>=22.16`.
