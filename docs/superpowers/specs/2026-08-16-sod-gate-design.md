# The separation-of-duties gate — design

**Build-order step 4, second and last increment — and the increment that records step 4's
exit.** SPEC §10.1's actor gate at finalize's spec-fixed rung 3.5 (§9's ladder: "**(3)**
identity → **(3.5)** separation of duties → **(4)** content-drift"): `sod.notActorOf`
keyed by the record's own recorded references, `proposer` as the may-not-decide-own-leg
pin, both raising the single `sod-violation` code — the sixteenth member. The first
step-4 increment chained the evidence; this one reads it. Step 4 then exits: §10.1 is
whole in this build, and step 5 (required-consultation gating, SPEC §11.1) becomes the
next build-order step.

## Rulings taken, so they are not re-litigated

- **Lookup miss refuses.** At finalize, a `notActorOf` entry whose legId has no match in
  the record's own recorded references refuses `sod-violation` — fail-closed as a DOMAIN
  outcome: the record's evidence cannot demonstrate the required distinctness. Reachable
  only through profile reconfiguration between open and finalize (construction validates
  the static case); by default non-terminal, so a freshly staged record under the current
  profile recovers. Matches §10.1's "cannot silently re-index an already-opened record's
  evidence" spirit without inventing a code the §8 registry does not have.
- **`sod.notActorOf` entries name distinct, strictly-earlier legs, non-empty.** Anything
  else — an empty array, a later leg, the leg's own id, an unknown id — is a structural
  construction error: each such shape can never match the record's references and would
  be declarable-but-inert at the gate, the fail-open trap. Consequence: a first leg
  cannot declare `sod` (it has no earlier legs).
- **`proposer` is multi-leg-only.** §10.1 opens "Applies when the profile declares more
  than one leg." — the applicability sentence scopes the whole feature, so a single-leg
  profile declaring `proposer` is a structural construction error. The conservative
  reading: loosening later is compatible; tightening after hosts rely on it is a break.
- **The guard lifts land WITH the gate, in one commit.** Deleting the GOVERNED
  `sod`/`proposer` throws before the rung exists would admit a declaring profile whose
  control is silently inert — the exact fail-open the first step-4 increment's atomic
  legs-lift avoided. Same discipline, same shape.
- **Step 4 exits with this increment**, recorded in
  `docs/process/implementation-status.md` (spec-moves-to-truth has nothing to move —
  §10.1 is already `[PROVEN]`).

---

## 1. Construction (`config.ts`)

- `validateLeg`'s `sod` and `proposer` GOVERNED throws delete (the gate is real from the
  same commit). The governed count moves 9 → 7, stated with the movement named.
- NEW structural validation, per the rulings above. `validateProfile` gains a pass that
  runs with leg positions in hand (it already iterates legs with the unique-id check):
  - a leg at index `i` declaring `sod`: `notActorOf` must be non-empty, entries pairwise
    distinct, and each entry must equal `profile.legs[j].id` for some `j < i` — anything
    else throws a plain (non-GOVERNED) structural error naming the leg, the entry, and
    which rule it broke;
  - any leg declaring `proposer` on a single-leg profile throws a structural error naming
    §10.1's applicability. (On a multi-leg profile, `proposer` is legal on ANY leg,
    including the first — it needs no prior legs.)
- No shape changes: `LegSpec.sod?: { notActorOf: string[] }` and `proposer?: string`
  already exist.

## 2. The code (`refusal-codes.ts`)

`sod-violation` joins `RefusalCode` (sixteenth member; count pins 15 → 16), class
`refusal` in `REGISTRY` — and it is deliberately NOT in `NEVER_APPENDS`: SPEC §8's
conditional table says "`refusal`-class, `terminalRefusals`-able", so it takes the
default `appendsOn` path — appends `open → refused { code: 'sod-violation' }` iff the
deciding leg's `terminalRefusals` lists it; otherwise the record stays `open` "so a
**different** approver may decide it" (§10.1). Producer: finalize's rung 3.5
(`kernel/finalize.ts`), named with the standing two-touch discipline if the plan lands
the code in an earlier commit than the rung.

## 3. The gate (`kernel/finalize.ts`, rung 3.5)

Placed between rung (3) (identity — both branches `identity-authority-refused`) and rung
(4) (content-drift), exactly where §9's ladder fixes it; the file's header ladder comment
gains the (3.5) entry. By rung 3.5 the identity argument is well-formed and its authority
allowed, and `record` (the replayed `DecisionRecord`) and `leg` are in scope.

```ts
  // --- (3.5) separation of duties (SPEC §10.1; second step-4 increment) ----------------
  if (leg.sod !== undefined) {
    for (const namedLegId of leg.sod.notActorOf) {
      const refIndex = (record.priorRecordRefs ?? []).findIndex(
        (ref) => ref.legId === namedLegId,
      );
      if (refIndex === -1) {
        // Lookup miss — the record's own evidence carries no entry for the named leg
        // (profile reconfigured between open() and finalize(); construction validates
        // the static case). Fail-closed: distinctness cannot be demonstrated from the
        // record's own chain, so refuse rather than skip — SPEC §10.1: the lookup keys
        // the record's evidence precisely so a profile edit "cannot silently re-index
        // an already-opened record's evidence".
        return refuseMaybeAppend(store, 'sod-violation', leg, chain, resolved, finalLeg, now);
      }
      const priorActor = record.priorLegActors?.[refIndex];
      if (priorActor === undefined) {
        // A found reference with no paired actor breaks the recorded paired-by-index
        // invariant (SPEC §4) — a garbled or foreign chain is a storage/config fault,
        // not a domain outcome (SPEC §8's loud-throw posture).
        throw new Error(
          `finalize: record '${recordId}' carries a prior-leg reference for '${namedLegId}' with no paired actor — a garbled or foreign chain is a storage/config fault (SPEC §8)`,
        );
      }
      if (priorActor.principal === identity.principal) {
        return refuseMaybeAppend(store, 'sod-violation', leg, chain, resolved, finalLeg, now);
      }
    }
  }
  if (leg.proposer !== undefined && leg.proposer === identity.principal) {
    // "the designated proposer may not decide their own leg" (SPEC §10.1).
    return refuseMaybeAppend(store, 'sod-violation', leg, chain, resolved, finalLeg, now);
  }
```

- **Comparison is by principal alone, deliberately** (§10.1): the same principal under a
  different allowed authority still refuses — the fail-closed direction; pair-equality
  would let one human re-authenticate under a second authority and pass. The residual
  same-human-different-principal case is §10.1's named AL1 limit, recorded, not coded
  around. The argument lives in the rung's comment so nobody "fixes" it.
- The refusals flow through the existing `refuseMaybeAppend`/`appendsOn` machinery — no
  new append shapes, no payload changes anywhere, so every non-declaring profile's chain
  stays byte-identical (the frozen fixtures never declare `sod`/`proposer`).
- A retried decision by the same actor on the SAME leg is untouched: `notActorOf` names
  only prior legs, and `proposer` compares only the declared principal — §10.1: "A
  **retried** decision by the same actor on the *same* leg is not self-approval".

## 4. Tests (extending `packages/record/test/multi-leg.test.ts`, whose header reserves the gate's pins for the second step-4 increment)

- **Construction pins**: the two GOVERNED inversions (sod; proposer), argued in place —
  each guard's stated trigger has fired, the gate lands in the same commit. Structural
  rejections, one pin each: empty `notActorOf`; an entry naming a LATER leg; the leg's
  OWN id; an unknown id; duplicate entries; `proposer` on a single-leg profile. And the
  acceptance shapes: a checker leg with `sod: { notActorOf: ['maker-decide'] }`; a
  multi-leg FIRST leg with `proposer` (legal — no prior legs needed).
- **Gate pins** (a two-leg fixture whose checker declares
  `sod: { notActorOf: ['maker-decide'] }`):
  - the maker's actor finalizing the checker leg refuses `sod-violation`, record stays
    `open`, NO append (default path), and a DIFFERENT principal then confirms — the
    default-open recovery flow end to end;
  - the principal-only pin: the maker's principal under a second authority (both in
    `allowedAuthorities`) still refuses;
  - `terminalRefusals: ['sod-violation']` on the checker leg: the same violation appends
    `open → refused { code: 'sod-violation' }`, terminal, payload key-set pinned;
  - `proposer`: a leg declaring `proposer: 'approver:1'` refuses when `approver:1`
    decides it and confirms under a different principal;
  - the retried-same-leg pin: an actor whose finalize refused NON-terminally on their own
    leg (e.g. content-drift, default-open) retries the SAME leg and confirms — no
    SoD refusal;
  - the lookup-miss pin: stage+open the checker's record under a profile whose maker leg
    is named one way, finalize under a second `create()` instance whose same-id profile
    RENAMED the maker leg (the established two-instance drift shape, with `notActorOf`
    naming the new name) — refuses `sod-violation`, no append;
  - the paired-actor storage fault: hand-built chain (helpers/chain.ts) whose opened
    payload carries a ref with no paired actor — finalize THROWS.
- **Adjacent-pair order pins**: (3) outranks (3.5) — a disallowed authority whose
  principal is also the maker's refuses `identity-authority-refused`; (3.5) outranks
  (4) — the maker's actor presenting DRIFTED content refuses `sod-violation`, not
  `content-drift`.
- **Count pins**: 15 → 16 in the two registry tests; the refusal-matrix section follows
  the `terminalRefusals`-able convention (the `content-drift`-style section, not the
  never-appends one) with the producer named.
- **Frozen surfaces**: untouched; no payload shape moves anywhere (the refused edge is
  the standard `{ code }` delta the kernel has minted since step 1).

## 5. The record — step 4 exits

- **Status doc**: the steps table moves step 4 to **Exited**, naming both increments
  (sequencing + references; the SoD gate) — step 5 (required-consultation gating, SPEC
  §11.1) named next. §10.1 row: whole — both controls enforced at rung 3.5, the
  principal-only comparison and its named residual, the lookup-miss posture, the
  retried-same-leg posture, the AL1 window carried forward unchanged; the row's rewrite
  standardizes the six-condition enumeration (resolving the parked label-wobble item from
  the first step-4 increment: one canonical numbering, stated once). §8 row: sixteen
  codes, `sod-violation`'s producer and append behavior. §9 row: the ladder's (3.5) rung
  real. The three construction rulings recorded as this build's fail-closed posture (the
  spec is silent on all three; none is a divergence — each is a permitted tightening).
  Governed count 9 → 7 with the movement named.
- **CLAUDE.md / README**: step 4 exited (two increments); the feature-guard paragraph's
  count and remainder; "four of the eight build-order steps remain unstarted" survives
  only if still true — step 5 is next and unstarted, steps 5-8 remain: verify and keep,
  the count does not move at this increment.
- **Register**: no rows expected to move (verify by reading; nothing new defers). The
  parked export-surface item (OpenOptions/PriorRecordRef/RecordedPriorLegRef) stays
  parked for the pre-0.1 surface review — this increment adds no new public shapes.
- **Comment truth passes**: the first increment's "the second step-4 increment's" forward
  references (multi-leg.test.ts's header line 4 and interplay banner context,
  construction-validation's still-GOVERNED pins, config.ts's validateLeg comments,
  CLAUDE.md's step-4 sentences) all resolve — sweep patterns per the standing list plus
  `second step-4`, `sod`, `proposer`, `SoD`, `notActorOf`, both deixis directions; the
  record task's report must show hit-count == verdict-count (the standing lesson).
- **Historical docs** leave-alone; no maturity marker moves; `docs/concept/` untouched.

## What this does not claim

- **Distinct principals, not independent judgment** — §10.1: two colluding humans satisfy
  the gate; collusion and coercion are out of scope (§13A). The
  same-human-different-principal residual is the named AL1 limit.
- **The AL1 window on the evidence is unchanged** — the gate reads `priorLegActors` at
  exactly the moment §10.1's window discussion names; detached signing remains the
  upgrade, a later build step.
- **No cross-leg content binding** (§10.1 states it), no consultation/ack controls (steps
  5 and 7), no eligibility (step 6). Step 5 is unstarted.
- The library still never verifies WHO a principal is — identity remains transport-established
  (SPEC §6); the gate compares recorded strings, and that limit is stated wherever the
  gate is documented.

## Process

Subagent-driven development, standing lessons in force: the guard lifts land with the
gate in one commit; plan-authored comments truthful at the commit that lands them
(two-touch written into the plan); counts stated with the movement named; the record
task's sweep shows hit-count == verdict-count; no new rung on a tx-carrying seam without
an enlisted-branch decision (`finalize()` takes no `tx` — nothing to decide, stated so
the check is visibly run); the final review checks the status doc against CODE; no new
runtime APIs — the floor stays `>=22.16`.
