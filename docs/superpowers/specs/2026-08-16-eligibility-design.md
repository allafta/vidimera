# Eligibility gating — design

**Build-order step 6, first of two increments.** SPEC §10.4 whole: declaring a per-leg
`eligibility` reference makes `'eligibility'` an **implicit-first required consultation
kind** at the just-built rung (5.5), with the trip mapping that turns a `fail` verdict
into `ineligible` (nineteenth code) while missing stays `consultation-missing` and
unreachable stays the availability outcome — both generic. The `eligibility` guard lifts
with the rung extension. Step 6 moves to Started; the second step-6 increment (policy
drift, §10.3 — with the fail-close cross-drift ruling already taken) exits it.

## Rulings taken, so they are not re-litigated

- **Step 6 slices into two increments, eligibility first** (taken at the step-6
  brainstorm): the light half extends rung 5.5 while it is fresh; policy drift (two
  seams, the presence contract, availability's second producer) follows and exits.
- **The cross-drift open decision is FAIL-CLOSE** (taken at the step-6 brainstorm, per
  the recommendation on record) — banked here for the SECOND increment's spec; nothing
  in this increment touches it.
- **`eligibility: ''` is a structural construction error.** Honest rationale: unlike
  `proposer: ''` this is NOT the inertness trap — the gate keys on declaration presence
  and never compares the label — it is the malformed-reference rule (an opaque reference
  that references nothing), consistent with every other non-empty-string rule in the
  build.
- **Declare-once is §10.4's own sentence**: "Declaring `eligibility` **and** also
  listing `'eligibility'` in `requiredConsultations` is a construction error (declare it
  once)." A structural error naming both sites.
- **The guard lifts land WITH the rung extension, in one commit** — the standing
  atomicity discipline.
- **`'eligibility'` is NOT a reserved kind.** Hosts supply it (that is the mechanism);
  the intake validator is untouched. Under a NON-declaring leg it is an ordinary kind
  with the generic codes — §10.4: "a leg that merely lists `'eligibility'` in its
  `requiredConsultations` gates it with the generic codes (`consultation-failed` on a
  `fail`, never `ineligible`)".

---

## 1. The code (`refusal-codes.ts`)

`ineligible` joins `RefusalCode` (nineteenth member; count pins 18 → 19), class
`refusal` in `REGISTRY` — the default `appendsOn` path, NOT never-appends: §8's
conditional table, "`refusal`-class, open-by-default so a different eligible actor may
decide". Producer: the eligibility arm of finalize's rung (5.5), worded with the
standing two-touch discipline if the plan lands the code before the arm.

## 2. Construction (`config.ts`)

- `validateLeg`'s `eligibility` GOVERNED throw deletes (the gate is real from the same
  commit). The governed count moves 6 → 5 (`ackMode`, `requiredAcks`, `freshness` per
  leg; `captureMode`, `policySource` profile-level), stated with the movement named.
- The per-leg structural pass gains the eligibility rules (a sibling of
  `validateRequiredConsultations`, or folded into it — the implementer's shape; the
  RULES are binding):
  - `eligibility` present but empty ⇒ structural error (the malformed-reference rule);
  - `eligibility` present AND `'eligibility'` listed in the same leg's
    `requiredConsultations` ⇒ structural error quoting §10.4's declare-once sentence.
- `LegSpec.eligibility?: string` already exists; no shape changes.

## 3. The rung extension (`kernel/finalize.ts`, rung 5.5)

The rung currently guards on `leg.requiredConsultations !== undefined` and iterates the
declared kinds. It becomes: compute the EFFECTIVE kinds —

```ts
  // §10.4: declaring per-leg `eligibility` makes 'eligibility' an implicit-FIRST
  // required consultation kind — "the effective kinds are the implicit `'eligibility'`
  // followed by the declared `requiredConsultations` in order, so authority-to-decide
  // is checked before the evidence checks". The library never runs the check; the host
  // supplies its result and the library GATES on it (first step-6 increment).
  const effectiveKinds =
    leg.eligibility !== undefined
      ? ['eligibility', ...(leg.requiredConsultations ?? [])]
      : (leg.requiredConsultations ?? []);
```

and the loop runs over `effectiveKinds` (entering whenever the list is non-empty — a
leg may declare `eligibility` with NO `requiredConsultations`). The three arms are
unchanged except the fail arm's code selection:

```ts
      if (obtained.verdict === 'fail') {
        // §10.4's trip mapping: when the tripping kind is the implicit 'eligibility'
        // under a declaring leg, a fail verdict refuses `ineligible` — open-by-default,
        // per-finalize and per-actor, so a DIFFERENT eligible actor may decide the same
        // open record. Every other kind (and 'eligibility' under a NON-declaring leg,
        // where it is an ordinary kind) keeps the generic `consultation-failed`.
        const code =
          requiredKind === 'eligibility' && leg.eligibility !== undefined
            ? 'ineligible'
            : 'consultation-failed';
        return refuseMaybeAppend(store, code, leg, chain, resolved, finalLeg, now);
      }
```

Missing stays `consultation-missing` (generic — §10.4: "a *missing* input refuses
`consultation-missing` (generic)"); an unreachable marker stays the availability outcome
(generic). A `pass`-verdict eligibility consultation is an obtained required input and
records in the success batch exactly as every obtained consultation already does —
§10.4: the chain's evidence "that the check ran and passed"; a `fail` refuses and, like
every refusal path, records no consultation (its evidence is the outcome code; a leg
wanting a chain trace lists `ineligible` in `terminalRefusals`, "at the cost of ending
the leg").

## 4. What stays as it is, said plainly

- The intake validator: untouched — `'eligibility'` is a legal supplied kind on any
  profile (the attach form's generality is the mechanism §10.4 rides).
- The recording path, replay, review: untouched — a pass-verdict eligibility
  consultation flows through the existing batch recording.
- `availability`, `consultation-missing`, `consultation-failed`: unchanged semantics;
  the eligibility arm only SELECTS between existing behaviors plus the one new code.
- **Honest bound** (§10.4's, recorded wherever the gate is documented): the gate ensures
  a `fail` cannot silently confirm; it does not prove the named authority genuinely ran
  the check — the truthful-verdict burden stays the host's, exactly as §11.1's gate does
  not prove a consultation was genuinely obtained.

## 5. Tests (extending `packages/record/test/consultations.test.ts`, plus the registry files)

- **Count pins**: 18 → 19; the `refusal-matrix` gains the `ineligible` section
  (`content-drift`-shape: refusal-class, `terminalRefusals`-able, open-by-default),
  producer named per the two-touch discipline.
- **Trip-mapping pins** (a capture profile whose leg declares
  `eligibility: 'hr.approver-check'`, initially with NO `requiredConsultations`):
  - fail ⇒ `ineligible`, record open, NO append (default), and the retry with a
    pass verdict confirms — the different-eligible-actor recovery flow;
  - missing (no eligibility consultation supplied) ⇒ `consultation-missing` (generic);
  - unreachable marker for `'eligibility'` ⇒ the availability outcome with the marker's
    authority (generic), no append, re-arm retry confirms;
  - pass ⇒ confirmed, the eligibility consultation recorded in the batch (kind, verdict
    `pass`, key-set).
- **Implicit-FIRST pin** (the leg declares `eligibility` AND
  `requiredConsultations: ['risk-check']`): eligibility fail + risk-check fail supplied
  together ⇒ `ineligible` (the implicit kind trips first — authority-to-decide before
  the evidence checks); and eligibility pass + risk-check fail ⇒ `consultation-failed`
  (the gate proceeds past the satisfied implicit kind in order).
- **terminalRefusals pin**: `terminalRefusals: ['ineligible']` ⇒ the fail appends the
  terminal `refused { code: 'ineligible' }` edge and the pair releases.
- **Ordinary-kind pins** (§10.4's non-declaring paragraph): a leg with NO `eligibility`
  but `requiredConsultations: ['eligibility']` (legal — declare-once only forbids BOTH)
  gates with the GENERIC codes — a fail refuses `consultation-failed`, never
  `ineligible`; and a voluntary `eligibility` consultation on a leg requiring nothing
  records as supplied evidence with finalize confirming.
- **Construction pins**: the GOVERNED inversion (a declaring profile constructs),
  argued in place; structural — `eligibility: ''` (the malformed-reference note in the
  pin's comment); declare-once (both sites named in the message); the still-GOVERNED
  pins for `ackMode`/`requiredAcks`/`freshness` verified untouched.
- **Frozen surfaces**: untouched; no payload shape moves anywhere (the eligibility
  consultation is an ordinary Consultation object).

## 6. The record — step 6 starts

- **Status doc**: steps table → step 6 **Started** (first of two increments:
  eligibility; policy drift remaining and exiting, with the fail-close cross-drift
  ruling named as already taken). §10.4 row: WHOLE — the implicit-first rule, the trip
  mapping, verdict-vs-code, the ordinary-kind fallback, the honest bound (with its
  limit in the same breath). §8 row: nineteen codes; `ineligible`'s producer and
  open-by-default shape. §11.1 row: the effective-kinds extension noted. Governed count
  6 → 5 with the movement named.
- **The two parked one-sentence items from the previous increment's final review land
  HERE** (their designated home): `kernel/consultations.ts:~6`'s header wording aligns
  to "real as of the second step-5 increment"; the status doc's §11.1 row gains the
  unsatisfiable-required-kind interplay sentence (a never-satisfiable required kind
  keeps the record open and the pair held, bounded by the open `ttl` — or indefinitely
  under `expiry: 'none'`, the operator's own configuration to resolve, no lost-artifact
  strand existing since the operator controls every finalize input).
- **CLAUDE.md / README**: step 6 started; five governed fields with the movement;
  "three of the eight build-order steps remain unstarted" → **two (steps 7-8)** —
  verify the arithmetic before writing.
- **Register**: no rows expected to move (verify by reading).
- **Comment truth**: sweep patterns per the standing list plus `eligibility`,
  `ineligible`, `implicit-first`, `first step-6`, `second step-6`, the OLD-shape greps
  (`effective kinds` absent before this increment; "the gate is the second step-5
  increment's" class survivors; `eighteen`/old counts; `requiredConsultations !== undefined`
  as the rung's OLD guard text); hit-count == verdict-count.
- No maturity marker moves; `docs/concept/` untouched.

## What this does not claim

- **No policy drift**: `policySource`/`opts.policy`/`opts.policyDigest`/`policy-drift`
  and availability's §10.3 producer are the second step-6 increment's; both stay
  guarded at their seams.
- **The library never runs the eligibility check** — the host supplies the verdict, the
  library gates on it, and the honest bound above travels with every statement of the
  guarantee.
- **No freshness** ([SKETCHED], AL2-dependent — unchanged); `ackMode`/`requiredAcks`
  are step 7's.
- Step 7 unstarted.

## Process

Subagent-driven development, standing lessons in force: the guard lifts land with the
rung extension in one commit; plan-authored comments truthful at the commit that lands
them; counts stated with the movement named; the record task's sweep shows hit-count ==
verdict-count and greps old shapes' literal text; a mandated RED run is executed or its
substitution stated; no new rung on a tx-carrying seam without an enlisted-branch
decision (`finalize()` takes no `tx` — nothing to decide, stated); the final review
checks the status doc against CODE; no new runtime APIs — the floor stays `>=22.16`.
