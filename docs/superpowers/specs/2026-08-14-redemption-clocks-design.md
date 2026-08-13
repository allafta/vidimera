# Redemption, the clocks — design

**Build-order step 3, third and last increment — and the increment that records step 3's
exit.** SPEC §4's two remaining clock-driven edges — `confirmed → expired` (the
`confirmToRedeem` window) and `redeeming → redemption-failed` (the `redeemBound` window) —
with their `dueAt` producers, their en-passant resolutions at the mutating seams, the
`redemption-timeout` code, and the operator's sweep read. This is the increment that ends
the strand window the second step-3 increment priced honestly: a lost token now resolves
when its declared bound elapses, and the `(profile, subject)` pair releases.

## Rulings taken, so they are not re-litigated

- **Step 3 exits with this increment.** §11.2 is then whole in this build: both shapes,
  both clocks, and at-most-once including the elapsed-`redeeming` unknown-outcome half.
  The exit is recorded in `docs/process/implementation-status.md` (spec-moves-to-truth has
  nothing to move — §11.2 is already `[PROVEN]`); step 4 (multi-leg separation of duties,
  SPEC §10.1) becomes the next build-order step. Deferred at exit and recorded as such:
  live-mode `reverify` (§9.2, SKETCHED — a later step's work), the sweep's provisional
  signature (§12's own note), the due-`open` rough edge (§5 below), and register row 16.
- **The sweep is a recipe, not a seam.** §12: the operator "iterates `listDue(now)` and,
  per listed record, drives the ordinary mutating seam for that record's pending window";
  §4 ships "no scheduler and no public `expire()`". The one surface change is a pure read:
  `OperatorSurface.listDue()` (defaulting `now` to the injected clock). No `sweep()`
  method — that would be a public `expire()` in all but name.
- **The resolver reports the timeout.** Whichever redemption seam (`redeem` /
  `beginRedemption` / `completeRedemption`) itself appends the
  `redeeming → redemption-failed` edge refuses `redemption-timeout` — the outcome names
  what this call did. A seam arriving after resolution finds `redemption-failed` and
  refuses `unredeemable-state` (the second increment's dead-until-now arm goes live).
  `finalize()` and `open()` keep their own domain codes when they resolve en passant
  (`leg-expired` / expire-then-retry) — never `redemption-timeout`.
- **One clock module.** `kernel/expiry.ts` generalizes: a single `pendingWindow`
  derivation (which window the record is in — §12's "whichever pending window" — with its
  deadline and edge kind) plus one `resolveDueClock` CAS append. Producers and resolvers
  read the same derivation; deadline math exists once.
- **Bounds are in seconds** — the spec states units only for `expiry.ttl` (§9.1); the
  `redeem` block's bounds match it, recorded as this build's convention in the status doc
  (the fixtures' `3600`/`86400` shapes already assumed it).

---

## 1. The clock module (`kernel/expiry.ts`, generalized)

```ts
type PendingWindow =
  | { window: 'none' }
  | { window: 'open';      deadlineMs: number }   // openedAt   + expiry.ttl        → expired
  | { window: 'confirmed'; deadlineMs: number }   // confirmedAt + confirmToRedeem  → expired
  | { window: 'redeeming'; deadlineMs: number };  // redeemingAt + redeemBound      → redemption-failed

pendingWindow(chain, resolved): PendingWindow
resolveDueClock(store, chain, resolved, now): ResolveResult   // CAS append iff elapsed
```

- The **confirmed window** exists only when the record's state is `confirmed` AND the leg
  is final AND the profile declares an effect seam AND `confirmToRedeem` is declared —
  the §9.1 conditions. `confirmedAt` is the `confirmed` transition's `at`.
- The **redeeming window** exists only when the state is `redeeming` AND `redeemBound` is
  declared. `redeemingAt` is the `redeeming` transition's `at`.
- The resolution edges, per §4's payload table: `confirmed → expired { bound }` — the
  SAME kind and payload shape as the open window's edge ("the transitioned-from state,
  not the payload, distinguishes the expiry clause from `confirmToRedeem`") — and
  `redeeming → redemption-failed { bound }`. Every `bound` is the crossed deadline as an
  ms-precision RFC 3339 UTC timestamp (§4's digest-input rule names all three payloads'
  `bound`). Both edges are terminal by the derivation (`nonTerminal(...)`, never a
  literal) — each is a release of the C1 hold. `dueAt` omitted clears the column.
- The existing `expireIfDue` open-window behavior folds into this shape unchanged
  (`open()`'s blocker path and `finalize()`'s rung 2 keep their exact semantics); its
  header's "covers ONLY `open → expired`" claim retires.
- **A lost resolution CAS re-reads once** and maps from the fresh state — the second
  increment's residual pattern, reused, so a racing resolver's loser reports what
  re-invocation would say.

## 2. The producers

- `open()`: unchanged (genesis `dueAt` from the ttl — the existing producer).
- `finalize()`: the success batch's meta gains
  `dueAt = confirmedAt + confirmToRedeem` iff declared on an effect-seam final-leg
  profile (one clock reading per batch, §2.1 — `confirmedAt` is the batch's own
  `confirmed` transition's `at`). Undeclared, or pure-capture: omitted, clearing the open
  window's column as today.
- `beginRedemption`: iff `redeemBound` is declared, the `redeeming` payload becomes
  `{ tokenDigest, bound }` — closing the second increment's recorded §4
  present-iff-declared gap in BOTH directions (key-set pins for both profile shapes) —
  and `meta.dueAt` is set to the same instant. Undeclared: `{ tokenDigest }` exactly, no
  `dueAt`, as the second increment pinned.
- Every terminal append (both resolutions, `redeemed`, `refused`, `sealed`) still clears
  `dueAt` by omission — §12's rule, unchanged.

## 3. The resolutions, per seam

The redemption seams' shared prologue gains ONE rung, placed after the
effect-seam/final-leg gate (a pure-capture record is untouched; a due-`open` record is
untouched THERE — §4: "`redeem()` does not treat a due-`open` record as expired — it
refuses `unredeemable-state` without writing an edge", vacuous in the second increment,
now pinned non-vacuously) and before the state gates. When the record's window has
elapsed, the seam appends the resolution edge and refuses immediately — no ladder
continuation past a resolution:

| Seam | due-`confirmed` | due-`redeeming` | after someone else resolved |
|---|---|---|---|
| `redeem` / `beginRedemption` / `completeRedemption` | append `expired` ⇒ refuse `unredeemable-state` (§11.2's preamble: the record is now expired) | append `redemption-failed` ⇒ refuse **`redemption-timeout`** | `expired` ⇒ `unredeemable-state`; `redemption-failed` ⇒ `unredeemable-state` |
| `finalize()` (rung 2, beside the open-window gate) | append `expired` ⇒ refuse `leg-expired` (§8's "expired or due-expired record" at a decision-progress seam) | append `redemption-failed` ⇒ refuse `record-not-open` (a non-open, non-expired record) | same codes, no append |
| `open()` (blocker branch) | expire-then-retry-ONCE — the due-open machinery extended to the confirmed window; the un-stranding §9.1 promises | `record-exists`, NO edge, due or not — §4's named exception, now a live pin | n/a (terminal blockers cannot hold C1) |
| `seal()` | refuse `unsealable-state`, NO edge — §4: "the operator sweeps first, then seals"; already built, the due-record pins join | same | n/a |

§11.2's at-most-once, completed: a **correct** token presented after the bound elapsed
gets the resolution and `redemption-timeout` — "an unknown outcome is never retried" now
has an executing pin instead of a stated rule.

## 4. Registry, replay, guard, fixtures

- **`redemption-timeout`** joins `RefusalCode` (fourteenth member; the count pins in
  `outcome-model` / `refusal-matrix` bump 13→14), class `refusal` in `REGISTRY`, member
  of `NEVER_APPENDS` — its edge is the `redemption-failed` KIND, never a `refused`
  transition (§8 lists it in the never-appends set).
- **`replay()`** gains its last redemption arm: `redemption-failed` folds
  `state: 'redemption-failed'` AND `refusalCode: 'redemption-timeout'` (§4's table:
  "folds `refusalCode: redemption-timeout` on replay"); `bound` stays evidence. The
  throws list shrinks to `finding-raised` / `acknowledged` (§10.2's kinds).
- **The GOVERNED `redeemBound` guard lifts** (`config.ts`) — an authorized inversion of
  the second increment's own construction-validation pin, argued in place: the guard's
  stated trigger ("lifted by the third step-3 increment") has fired. Bound-value
  validation mirrors `expiry.ttl`'s existing treatment exactly — no novel validation
  posture is introduced (whatever `ttl` tolerates, the bounds tolerate; the plan verifies
  what that is and matches it).
- **Fixtures**: `effectSeamProfile()` restores `redeemBound: 86400` (the guard is gone)
  and **widens `confirmToRedeem` from `1` to `3600`** — once `finalize` stamps real
  `dueAt`, a one-second fixture bound races every real-clock test; both changes carry
  authorization notes naming this increment. Real-clock tests never sit inside a live
  one-hour window; clock tests use `createWithClock`.

## 5. The sweep

- `OperatorSurface.listDue(): Promise<string[]>` — a pure read delegating to
  `store.listDue(now())` with the injected clock; frozen into the operator literal;
  ABSENT from the agent surface (`agent-unreachability`'s key-set and probe arrays
  grow). §12's "concrete signature is provisional pre-1.0" is quoted where the method is
  documented.
- **The sweep recipe** lands in the status doc, not in code: iterate
  `operator.listDue()`; for each record in a confirmed or redeeming window, drive
  `redeem(recordId, {})` — the resolution rung precedes correspondence, so any content
  serves, and the refusal reports the resolution (`unredeemable-state` /
  `redemption-timeout`); then `seal()` the resolved records — sweep-then-seal, §4/§5's
  own rationale, pinned end-to-end by a test.
- **The due-`open` rough edge, recorded honestly**: a due-`open` record has no
  argument-free resolver — `redeem()` is spec-forbidden from expiring it and
  `finalize()` needs real arguments — so it resolves at its next genuine `finalize()` or
  at a fresh `open()` for its pair (§4's lazy rule). Recorded in the status doc beside
  the recipe; not a register row (it is the spec's own shape, not deferred work).

## 6. Tests (red-first; deterministic via `createWithClock`)

New `packages/record/test/clocks.test.ts` (the windows' own file), plus surgical edits:

- **Producer pins**: after `finalize` on a `confirmToRedeem`-declaring profile,
  `listDue(afterBound)` lists the record and `listDue(beforeBound)` does not; after
  `beginRedemption` on a `redeemBound`-declaring profile, likewise; the `redeeming`
  payload key-set pins split — `{ tokenDigest, bound }` declared (ms-precision `bound`
  byte pin), `{ tokenDigest }` undeclared (the second increment's pin, kept on a
  no-`redeemBound` profile).
- **Resolution pins, per row of §3's table** — each asserting the edge's kind and
  payload, the refusal code, `dueAt` cleared (`listDue` empty after), THE RELEASE
  (`findNonTerminal` null, fresh `open()` succeeds), and `getRecord`/`replay` folding
  `redemption-failed` with `refusalCode: 'redemption-timeout'`.
- **The unknown-outcome pin**: correct token, elapsed bound ⇒ `redemption-timeout`, edge
  is `redemption-failed`, and the token is dead — a further completion refuses
  `unredeemable-state`.
- **The two §4 exception pins, now non-vacuous**: `redeem()` on a due-`open` record —
  refusal with NO edge; `open()` against a due-`redeeming` blocker — `record-exists`
  with NO edge (and against a due-`confirmed` blocker: expire-then-retry succeeds).
- **Resolver-vs-later-arrival**: the first seam to observe reports the resolution; the
  second refuses `unredeemable-state` with no append.
- **The resolution race** (`RaceOnceStore`): a resolver losing the resolution CAS
  re-reads and reports the fresh state's honest code.
- **Sweep end-to-end**: begin, lose the token, advance the clock past `redeemBound`,
  `operator.listDue()` names the record, `redeem(recordId, {})` resolves it,
  `seal()` retires it; the agent surface cannot reach `listDue`.
- **seal-on-due pins**: due-`confirmed` and due-`redeeming` records refuse
  `unsealable-state` with no edge.
- **Order pins**: the resolution rung's place in the ladder — tampered chain + elapsed
  bound ⇒ `chain-compromise` wins (verify-first outranks the clock); pure-capture +
  elapsed nothing ⇒ untouched; per the standing adjacent-pair derivation discipline.
- **Frozen things**: the four byte-stability literals untouched; the cross-backing
  byte-identity token flow now carries a deterministic `bound` under its fixed clock and
  must stay byte-identical across backings; conformance suite untouched unless the plan
  finds a store-behavior gap (none is expected — `listDue` and all three kinds are
  already conformance-covered).
- **Count pins**: 13→14 in the two registry tests.

## 7. The record — step 3 exits

- **Status doc**: the steps table moves step 3 to **Exited**, naming its three
  increments (direct shape; token shape; clocks) and the exit ruling's deferred-at-exit
  list (rulings above). The §4, §8, §9, §9.1, §11.2 and §12 rows move (§4's clock edges
  built; §8 gains `redemption-timeout` with its producers; §9's surface gains the
  `listDue` read — the naming-divergence record extends to it, flagged to row 6; §9.1's
  bounds are enforced, the SHOULD now real advice with teeth; §11.2 whole; §12's sweep
  recipe documented with the due-`open` rough edge). The **"safe to ship, not yet safe
  to operate" statement retires** to its truthful successor: safe to operate when
  `redeemBound` is declared; a host omitting it accepts the strand risk §9.1 names,
  knowingly. The seconds convention for bounds is recorded.
- **CLAUDE.md / README.md**: step 3 exited (three increments); the feature-guard
  paragraph's redemption tail rewrites once more — nothing at the redemption seams is
  governed any longer; "five of the eight build-order steps remain unstarted" SURVIVES
  (it counted steps 4–8); step 4 named as next.
- **Register**: no rows move — row 16's trigger is unchanged; row 11 (finalize `opts`)
  is untouched by clock work; nothing new defers (the due-`open` edge is a recorded spec
  shape, not deferred work).
- **Comment truth passes**: `expiry.ts`'s "covers ONLY open → expired" header; the
  redemption ladders' "no clock sets `dueAt`… until the clock increment" and NO-EN-PASSANT
  vacuity notes (now real, pinned); `types.ts` / `replay.ts` emitted-kinds lists gain
  `expired`-from-confirmed context and `redemption-failed`; `open.ts`'s blocker-branch
  comment (the confirmed arm resolves now); `store/semantics.ts` needs nothing (its
  `redemption-failed` arm was always generic). Sweep patterns per the standing list plus:
  `until the clock increment`, `the third step-3 increment`, `dead-until`, `no producer`,
  `strand`, `not yet safe to operate`, `later increment`, both deixis directions,
  increments named explicitly.
- **Historical docs** (`docs/superpowers/`, `docs/analysis/`): leave-alone, per the
  proven convention.

## What this does not claim

- **No scheduler, no public `expire()`, no `sweep()` method** — the lazy rule plus the
  recipe is the whole mechanism, §4's own posture.
- **No store changes**: `listDue` has existed since step 2; the operator read is a
  passthrough.
- **Live-mode `reverify` does not exist** (§9.2 SKETCHED — with its own `confirmToRedeem`
  live-profile alternative; a later step).
- **Step 4 is unstarted**: no multi-leg profile, no SoD, no `priorRecordRefs`.
- The library still never executes the effect; a host that declares no `redeemBound`
  keeps the strand risk §9.1 names — the bound is a policy choice, never a truth.
- No maturity marker moves; `docs/concept/` untouched.

## Process

Subagent-driven development, standing lessons in force: commands over lists; open every
record cited; whitespace-collapsed quote verification; repo-root sweeps with both deixis
directions; explicit increment naming ("the third step-3 increment"); subagent commits
via `git commit -F` with branch-attached verification; end-of-increment pass over this
increment's own new comments ("later increment" drift); the final review checks the
status doc against CODE, never against task reports; floor verification — no new runtime
API (Date arithmetic and `toISOString` only), so the floor stays `>=22.16`.
