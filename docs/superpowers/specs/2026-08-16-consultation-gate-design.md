# The required-consultation gate and the availability class — design

**Build-order step 5, second and last increment — and the increment that records step 5's
exit.** SPEC §11.1's gating half at finalize's rung (5.5), consuming the partition the
first step-5 increment built: a required kind missing refuses `consultation-missing` (its
second producer), an obtained `fail` verdict refuses `consultation-failed` (seventeenth
code), and a required kind's unreachable marker produces the **availability outcome** —
the eighteenth code in its own THIRD outcome class, "status `unavailable`, code
`availability`, carrying the marker's named `authority`" — never an appended edge, the
record staying `open` while "the seam re-arms for bounded host retry". The
`requiredConsultations` guard lifts with the rung. Step 5 then exits; step 6 (authority
checks: eligibility + policy drift) becomes the next build-order step.

## Rulings taken, so they are not re-litigated

- **The slicing ruling stands** (taken at the step-5 brainstorm): this increment is the
  gate + the availability class + the lift + step 5's exit; the attach form landed whole
  in the first step-5 increment and is untouched here.
- **The fail-closed construction posture is the settled class** (the `notActorOf` /
  `proposer` rulings, applied three times): `requiredConsultations` must be non-empty,
  pairwise distinct, every kind a non-empty string, and NO reserved kind —
  the last is §11.1's own sentence ("declaring a reserved kind in
  `requiredConsultations` is likewise a profile-construction error, §9.1"); the rest is
  the no-declarable-but-inert rule (an empty list declares the control and requires
  nothing; a duplicate requires nothing twice; memory of the `proposer: ''` escape says
  enumerate every value that could be inert).
- **`refused('availability')` is unmintable at compile time.** `refused()`'s code
  parameter becomes `Exclude<RefusalCode, 'availability'>` — §8: the availability code
  "is carried by the `unavailable` outcome status, **never** a `refused` edge". The code
  stays in `RefusalCode` (the registry is §8's total code list) and stays a LEGAL but
  INERT `terminalRefusals` member, pinned like `leg-expired` — §8 names both "so an
  adopter isn't trapped configuring a control that can never fire".
- **The guard lifts land WITH the gate, in one commit** — the standing atomicity
  discipline: no commit admits a declaring profile whose control is inert.
- **`freshness` does NOT lift at step 5's exit.** Its gate (`consultation-stale`) is
  [SKETCHED] and AL2-dependent by the spec's own argument — at AL1 the library stamps
  `at` itself, so the bound could never fire ("a dead gate wearing an assurance label").
  Recorded in the exit's deferred list, not lifted. `eligibility` likewise stays
  GOVERNED (step 6's §10.4, with its implicit-first required kind).
- **Step 5 exits with this increment**, recorded in
  `docs/process/implementation-status.md` (spec-moves-to-truth has nothing to move —
  §11.1 is `[PROVEN]` except its freshness tail, which stays [SKETCHED] deliberately).

---

## 1. The outcome model (`outcome.ts`, `refusal-codes.ts`)

- `Outcome<T>`'s third variant ALREADY EXISTS draft-ahead (`{ status: 'unavailable';
  code: RefusalCode; authority: string }`, with a zero-caller `unavailable(code,
  authority)` constructor and a doc comment naming itself forward-compat with no
  producer). This increment NARROWS it to §8's exact shape and wires its first producer:

```ts
| { status: 'unavailable'; code: 'availability'; authority: string }
```

  with the constructor becoming `unavailable(authority: string)` — the code is CONSTANT
  (§8: "The single code in this class is likewise named `availability`"), so it is no
  longer a parameter; the zero-caller status makes the signature change breakage-free.
  The `authority` is the marker's named party; no `transitionRef` ever (nothing
  appends), no `kind` field (§8 and §11.1 name only the authority). The variant's
  forward-compat doc comment updates: §11.1's producer is real as of the second step-5
  increment; §10.3's policy gate remains the future second producer.
- `refused(code: Exclude<RefusalCode, 'availability'>, transitionRef?)` — the exclusion
  ruling above. Existing callers are unaffected (none passes `availability`).
- `RefusalClass` gains `'availability'`; `REGISTRY` maps `'availability':
  'availability'` and `'consultation-failed': 'refusal'` (count pins 16 → 18).
- `appendsOn`: an `'availability'`-class code returns `false` unconditionally (before
  the `terminalRefusals` consult — "never a `refused` edge"), making it the SECOND
  legal-but-inert `terminalRefusals` member; the doc comment's `leg-expired` paragraph
  extends to name both, per §8's own pairing.

## 2. Construction (`config.ts`)

- `validateLeg`'s `requiredConsultations` GOVERNED throw deletes (the gate is real from
  the same commit). The governed count moves 7 → 6, stated with the movement named.
  `freshness` and `eligibility` throws stay verbatim.
- `validateSodShape` gains a sibling — `validateRequiredConsultations(profile, leg)`,
  called from the same indexed per-leg loop (index unused here; the sibling placement
  keeps the per-leg structural checks in one place): non-empty array; pairwise distinct;
  every entry a non-empty string; no entry in the reserved set (`'facts'`,
  `'chain-verify'`) — each violation a plain structural error naming the leg, the entry,
  and the rule. The reserved set MOVES to `config.ts` as an exported
  `RESERVED_CONSULTATION_KINDS` const and `kernel/consultations.ts` re-imports it —
  NOT the other direction: that kernel module already imports its input types FROM
  config.ts, so a config-side import of the kernel module would be a cycle. One
  definition, upstream, both consumers.

## 3. The gate (`kernel/finalize.ts`, rung 5.5)

Placed after rung (5) (facts) and before rung (6) (the batch), exactly §9's ladder
("**(5)** facts → **(5.5)** consultations/eligibility"); the file-header ladder comment
gains the (5.5) entry. By rung 5.5 the `supplied` partition exists (validated at intake)
and `leg` is in scope.

```ts
  // --- (5.5) required consultations (SPEC §11.1; second step-5 increment) --------------
  // The gate reads THIS record's own resolved leg (§11.1: on a multi-leg profile one
  // leg's finalize is never gated by another leg's requiredConsultations) and iterates
  // the declared kinds IN ORDER — "the first kind that trips resolving the call".
  // Non-required supplied consultations are untouched here: evidence, never a gate.
  if (leg.requiredConsultations !== undefined) {
    for (const requiredKind of leg.requiredConsultations) {
      const marker = supplied.unreachable.find((m) => m.kind === requiredKind);
      if (marker !== undefined) {
        // §11.1: a required kind the host reports unreachable produces the availability
        // outcome — "never a fabricated pass", and it NEVER appends: the record stays
        // open and the seam re-arms for bounded host retry (§8). Not a refusal; not
        // terminalRefusals-able (appendsOn is never consulted — no refused edge exists).
        return unavailable(marker.authority);
      }
      const obtained = supplied.obtained.find((entry) => entry.kind === requiredKind);
      if (obtained === undefined) {
        // Missing — consultation-missing's SECOND producer (the facts rung above is the
        // first); terminalRefusals-governed, open by default for a corrected retry.
        return refuseMaybeAppend(store, 'consultation-missing', leg, chain, resolved, finalLeg, now);
      }
      if (obtained.verdict === 'fail') {
        // §11.1: an obtained verdict of fail refuses consultation-failed —
        // terminalRefusals-governed, open by default "for a corrected retry".
        return refuseMaybeAppend(store, 'consultation-failed', leg, chain, resolved, finalLeg, now);
      }
      // verdict 'pass': this required kind is satisfied; it records in the success
      // batch with every other obtained consultation (the first step-5 increment's
      // recording is unchanged — the gate adds no recording of its own).
    }
  }
```

- The per-kind check order (marker, then missing, then verdict) is deliberate: a host
  that supplies BOTH a marker and an obtained entry for one kind cannot exist — the
  intake validator's one-per-kind rule already threw. So within one kind the three arms
  are mutually exclusive, and the outcome is decided by the FIRST declared kind that
  trips, never by severity ranking across kinds.
- On a full pass, rung (6) proceeds unchanged; the required kinds' obtained entries are
  already in the batch's supplied set. Nothing new appends anywhere in this rung.

## 4. What the surface change touches

- `Outcome<T>`'s third variant is a PUBLIC type change: every consumer narrowing on
  `status` keeps compiling (unions widen safely); any exhaustive switch over `status`
  in tests gains the arm. `seal`/`redeem`/`open` and every other seam CANNOT return
  `unavailable` — nothing but finalize's rung 5.5 constructs it; state that in
  `outcome.ts`'s doc (one producer today, §10.3's policy gate joining at step 6).
- No new kinds, no replay change, no store change, no payload change anywhere — a
  declaring profile's chains differ from a non-declaring profile's ONLY by what the host
  supplies; the gate itself never writes.

## 5. Tests (extending `packages/record/test/consultations.test.ts`, plus the registry files)

- **Count pins**: 16 → 18 (both registry tests; the outcome-model file's class
  assertions gain the third class).
- **Matrix sections**: `consultation-failed` (refusal-class, `terminalRefusals`-able,
  open-by-default — the `content-drift`-shape section); `availability` (its own class;
  never appends; the legal-but-inert `terminalRefusals` pin beside `leg-expired`'s).
- **Gate pins** (a capture profile whose leg declares
  `requiredConsultations: ['risk-check', 'sanctions']`):
  - full pass: both kinds obtained `pass` ⇒ confirmed, both recorded in the batch;
  - missing: neither supplied ⇒ `consultation-missing`, record open, NO append
    (default), then the corrected retry with both supplied confirms — the re-arm flow;
  - fail: `risk-check` obtained `fail` ⇒ `consultation-failed`, open, no append; the
    corrected retry confirms;
  - unavailable: `risk-check` marker ⇒ `{ status: 'unavailable', code: 'availability',
    authority }` with the marker's authority, NO append (chain length pinned), record
    open; the retry with `risk-check` obtained confirms — §11.1's bounded-retry shape;
  - FIRST-trip order: `risk-check` missing AND `sanctions` obtained-fail ⇒
    `consultation-missing` (the first declared kind trips; declaration order, not
    severity);
  - non-required unaffected: an extra obtained `fail` kind alongside satisfied required
    kinds ⇒ confirmed, the fail recorded as evidence (the first increment's pin, now
    exercised WITH the gate present);
  - `terminalRefusals: ['consultation-failed']` ⇒ the fail case appends the terminal
    refused edge (payload `{ code }` pinned) and the pair releases;
  - `terminalRefusals: ['availability']` ⇒ the unavailable case STILL appends nothing
    and stays open — the legal-but-inert pin at the seam (not only in the matrix);
  - multi-leg: a two-leg profile where only the checker declares — the maker's finalize
    is ungated (§11.1's own-resolved-leg sentence, pinned).
- **Adjacent-pair order pin (5) > (5.5)**: invalid facts AND an obtained-fail required
  kind ⇒ `consultation-missing` from the FACTS rung (the codes differ — fail would say
  `consultation-failed` — so the pin discriminates).
- **Construction pins**: the GOVERNED inversion (a declaring profile constructs), argued
  in place; structural rejections — empty list; duplicate kinds; empty-string kind;
  reserved kind (`facts`; `chain-verify`) — each `/…/i`-matched to its own message;
  `freshness` and `eligibility` STILL-GOVERNED pins re-verified untouched.
- **Type-level**: `refused('availability')` does not compile — pin with `@ts-expect-error`
  beside the outcome-model tests (the compile-time half of the exclusion ruling).
- **Frozen surfaces**: untouched; the byte-stability fixtures declare no
  `requiredConsultations` and supply no consultations.

## 6. The record — step 5 exits

- **Status doc**: the steps table moves step 5 to **Exited**, naming both increments
  (the attach form; the gate + the availability class) and the deferred-at-exit list:
  `freshness`/`consultation-stale` ([SKETCHED], AL2-dependent — meaningful only with
  authority timestamps inside the digested payload, a later build step's ground) and
  §10.4's implicit-first `eligibility` prepend (step 6's). Step 6 (authority checks:
  eligibility + policy drift) named next. §8 row: eighteen codes, THREE classes, the
  availability class's never-appends/never-terminal shape, `consultation-missing`'s two
  producers. §9 row: the ladder's (5.5) rung real. §11.1 row: whole except the freshness
  tail, said plainly — the gate enforces presence and verdicts and honors unreachability
  without fabricating a pass; it does not prove the authority was genuinely consulted
  (the operator-assurance limit travels with the guarantee). Governed count 7 → 6 with
  the movement named; the construction rulings recorded as the settled fail-closed
  class.
- **CLAUDE.md / README**: step 5 exited (two increments); the feature-guard paragraph's
  count and remainder ("three of the eight build-order steps remain unstarted" SURVIVES
  — step 5 moves started→exited; verify and keep). README: same movement; step 6 named
  next.
- **Register**: no rows expected to move (verify by reading; the freshness deferral is
  the exit record's list, not a register row — it is the spec's own [SKETCHED] marker,
  not deferred buildable work).
- **Comment truth**: the first increment's forward references resolve — sweep patterns
  per the standing list plus `second step-5`, `consultation-failed`, `availability`,
  `unavailable`, `requiredConsultations`, `rung (5.5)`, ladder tokens (`seven-rung` —
  the ladder gains a rung: `finalize-check-order.test.ts`'s header count and corpus
  total are DIRECT targets this time, the standing lesson made mandatory), the OLD-shape
  greps (`(5) facts → (6)`, "single facts-rung producer", "no gate exists",
  "gating nothing", "the gate is next"); hit-count == verdict-count.
- No maturity marker moves; `docs/concept/` untouched.

## What this does not claim

- **No freshness gate**: `consultation-stale` stays [SKETCHED]; at AL1 it could never
  fire, and building it would be the dead gate the spec itself refuses. A `freshness`
  declaration still throws at construction.
- **No eligibility**: §10.4's implicit-first required kind, the `ineligible` code, and
  the trip mapping are step 6's; `eligibility` still throws.
- **The library gates and fails closed; it does not prove consultation authenticity**
  (§11.1's own boundary) — severing a dependency yielding `availability` rather than a
  stubbed pass is the operator's regression exercise, outside the runtime guarantee.
- **`availability` is not retry logic**: the library re-arms the seam by refusing to
  append; the bounded retry budget is the HOST's (§8) — no timer, no counter, no
  scheduler lives here.
- Step 6 unstarted; `opts.policy` still throws at the seam.

## Process

Subagent-driven development, standing lessons in force: the guard lifts land with the
gate in one commit; plan-authored comments truthful at the commit that lands them;
counts stated with the movement named; the record task's sweep shows hit-count ==
verdict-count and greps BOTH the new feature's vocabulary AND the old shapes' literal
text (the stale-banner lesson); a mandated RED run is executed or its substitution
stated; no new rung on a tx-carrying seam without an enlisted-branch decision
(`finalize()` takes no `tx` — nothing to decide, stated); the final review checks the
status doc against CODE; no new runtime APIs — the floor stays `>=22.16`.
