# Redemption, the direct shape — design

**Build-order step 3, first increment — and the increment that records step 2's exit.**
SPEC §11.2's co-located half: `confirmed → redeemed` **directly**, enlisted in the host's
transaction through the `tx?` seam the previous increment built, with effect-content
correspondence, the at-most-once replay refusal, and the real release of the held
`(profile, subject)` pair that register row 9 has tracked since step 1.

## The step-2 exit ruling, recorded

The owner rules: **step 2 exits with a recorded deferral.** The embedded and in-memory
backings are held equivalent by the conformance suite and the cross-backing byte-identity
test; the server-SQL backing — SPEC §12's "a server-SQL store (production,
multi-connection-safe)" — is deferred to a **new register row 15** (next never-used number),
trigger: the first multi-operator consumer, or the 0.1 cut, whichever lands first. The
reasons, stated so the ruling reads as a judgment and not an omission: the suite makes a
later backing landable without touching feature code (that was the suite's design purpose);
a Postgres backing needs a reachable server, which collides with the zero-skips discipline
on machines without one; and SPEC's three-backing proof structure is a SHOULD. SCOPING §7's
"real SQL adapters" plural is read as the proof-structure goal the register row now carries,
not a gate on the build order. The status doc's steps table moves step 2 to **Exited (with
the row-15 deferral)** and opens step 3.

## Why this piece now

SCOPING §7 on step 3: "The most intricate API corner; doing it early forces the transaction
seam and outcome model to be right." The transaction seam landed in the previous increment —
this increment is its first real consumer, and §11.2's direct shape is the reason the seam
exists: "so a co-located host can commit a `redeemed` edge in the *same* transaction as the
effect (§11.2)" (SPEC §12). Step 3 decomposes as: **A (this spec)** — the direct shape;
**B** — the token shape (`redeeming`, `tokenDigest`, presentation, register row 10's
fallback arm); **C** — the clock edges (`confirmToRedeem`, `redeemBound`,
`redemption-timeout`, the `dueAt` producers). Each gets its own spec when its turn comes.

## Decisions taken, so they are not re-litigated

- **Codes land with their producers:** `effect-mismatch` and `already-redeemed` join the
  `RefusalCode` union now (both producible in this increment, both never-appends per §8);
  `redemption-timeout` waits for increment C, whose clock is its only producer — a code
  with no test that can turn it red does not ship.
- **`replay` gains the `redeemed` arm only.** `redeeming` and `redemption-failed` keep
  throwing until B and C build their producers — the same one-arm-at-a-time honesty the
  `sealed` arm followed.
- **The authorized inversion inverts back, explicitly.** Step-1's remediation authorized
  inverting the inherited pin so `redeem()` on a confirmed effect-seam record **throws** a
  build-capability error — loudness, not closure, until the seam existed. This increment
  builds the seam, so that throw is deleted and the pin becomes the direct-shape success
  path. Per the standing discipline this is argued in place: the test's inversion note in
  `packages/record/test/terminality.test.ts` is **appended** (never rewritten) to record
  that the loudness-throw completed its purpose and the behavior it stood in for now
  exists; the exit record carries the same note.

---

## 1. The seam (`kernel/redeem.ts`, rebuilt as a ladder)

```ts
redeem(recordId: string, content: unknown, tx?: unknown):
  Promise<Outcome<{ recordId: string; state: 'redeemed'; transitionRef: Digest }>>
```

`tx?: unknown` flows untouched through the kernel to `store.appendTransition(…, tx)` — the
kernel stays backing-agnostic; the adapter validates its own handle (previous increment).
No identity argument, deliberately: §11.2 — "It carries no identity argument — the deciding
actor was bound at finalize (§6); redemption evidences execution, not judgment."

The ladder, mirroring `seal()`'s discipline:

```
load chain → empty ⇒ THROW (unknown recordId is a caller error — §8; fixes the stub)
(1) chain-verify         → break ⇒ chain-compromise, edge where admitted
                           (appendChainCompromise, its third caller)
(2) resolve profile      → unknown-profile (fail-closed; fixes the stub)
(3) effect seam declared? → no ⇒ unredeemable-state (pure-capture: §11.2's "on-iff-effects")
(4) state gate           → 'redeemed' ⇒ already-redeemed (at-most-once, replay half)
                           anything not 'confirmed' ⇒ unredeemable-state
                           (open/refused/expired per §11.2's preamble; redeeming and
                           redemption-failed are unreachable until B/C — defensive arms,
                           commented as such, never claimed as spec-granted)
(5) correspondence       → re-digest supplied content through the SAME path stage() and
                           finalize rung (4) use (adopter canonicalizer → library JCS →
                           digest), compare against the bound contentDigest ⇒
                           effect-mismatch on any difference
(6) append               → confirmed → redeemed, payload { via: 'direct' } (§4's table),
                           meta from the terminality derivation (redeemed is terminal ⇒
                           nonTerminal: false — THE RELEASE), dueAt omitted; tx passed
                           through ⇒ ok({ recordId, state: 'redeemed', transitionRef })
                           store conflict residual ⇒ unredeemable-state (a racing writer
                           moved the record; result-first, nothing appended)
```

**(1) outranks everything** — §5's blanket rule ("Every operator-side mutating seam verifies
the chain before acting"), which the stub violated; building it resolves the redeem half of
the held-for-owner §5 finding (the `open()` en-passant half stays held, untouched).
**(4) before (5)**: a replayed redemption refuses `already-redeemed` whatever content it
carries — at-most-once outranks mismatch reporting.
**Multi-leg** (§11.2's non-final-leg refusal) is structural only: no multi-leg profile can
be constructed until step 4, so the final-leg check rides `isFinalLeg` as `open()` already
does, defensive and commented.
**En-passant**: §4 exempts `redeem()` from expiring a due-`open` record (it refuses
`unredeemable-state` with no edge) — vacuous in this increment (no clock sets `dueAt` on
any state redeem() examines until C) and stated in a comment so nobody adds `expireIfDue`
by analogy; §4's due-`confirmed` resolution is C's work.

**The enlistment contract is the host's, restated at the seam:** §11.2 — the host "MUST
`await` the redemption before ending that transaction"; a host rollback "erases the edge
entirely", and re-attempting a **known** rolled-back redemption is legitimate (not the
forbidden unknown-outcome retry, which is the token shape's case). The doc comment carries
this; a test pins the rollback-erases-then-retry-succeeds flow on `SqliteStore`.

## 2. The registry

`effect-mismatch` and `already-redeemed` join `RefusalCode` as the union's first
profile-conditional codes (§8's conditional table, both `[PROVEN]` there), class
`refusal`, members of the never-appends set (§8 lists both). `appendsOn` returns `false`
for both; the compiler-total code→class map grows two rows. The registry's own comments
mark them conditional-with-producers rather than core.

## 3. The record model

`replay` gains the `redeemed` arm: state moves to `redeemed` (terminal per §2 —
`nonterminal.ts` already carries the disjunct whole and needs no edit), `status` untouched
(sealing is the only `retired` producer). The `via` payload field is evidence, not state —
replay reads nothing from it. `DecisionRecord` needs no new field.

## 4. Tests (red-first throughout)

New `packages/record/test/redeem.test.ts` (the seam's own file), plus surgical edits:

- **Happy path:** effect-seam profile → confirm → `redeem(recordId, CONTENT)` → ok;
  chain ends `[…, confirmed, redeemed]` with payload `{ via: 'direct' }`; `getRecord`
  state `redeemed`.
- **THE RELEASE (row 9's pin inverts to its fulfillment):** after `redeemed`,
  `findNonTerminal(profile, subject)` → `null`, and a fresh `open()` for the same pair
  **succeeds** — the pair that was "permanently held" is held no longer.
- **Enlistment on `SqliteStore`:** host `BEGIN` → `redeem(…, store.database)` ok → host
  `ROLLBACK` → chain has no `redeemed` edge and the pair is still held; re-attempt without
  rollback → succeeds (§11.2's legitimate known-rollback retry, pinned).
- **At-most-once, replay half:** second `redeem()` → `already-redeemed`, no append.
- **Correspondence:** altered content → `effect-mismatch`, no append; content that
  re-canonicalizes identically → ok (the adopter-canonicalizer path is the one under test).
- **`unredeemable-state`, now correctly scoped:** pure-capture profile (any state);
  effect-seam record in `open`/`refused`/`expired`.
- **Caller errors:** unknown `recordId` throws (stub fix pinned).
- **Verify-first:** tampered chain → `chain-compromise` with an edge where C3 admits one
  (state `confirmed`, non-terminal → the ordinary append path) — and the adjacent-pair
  order tests per the standing derivation discipline, with the non-constructible pairs
  excluded in a comment that shows the derivation.
- **`terminality.test.ts`:** the loudness-throw pin is replaced by the success pin, with
  the inversion note appended in place (see Decisions).
- **Conformance suite and byte-stability: untouched.** No store semantics change (the
  `redeemed` kind's `stateOf` mapping already exists), and the feature-free minimal chain
  contains no redemption — the four digest literals must not move.

## 5. The record

- **Register row 9 retires** — built, not reclassified: its own text names "the redemption
  edge itself (SPEC §11.2)" as the first release path, and that edge now exists with a test
  pinning the release. Deleted per the preamble; the number is not reused.
- **Register row 15 (new):** the server-SQL backing deferral carrying the step-2 exit
  ruling (text per the ruling section above).
- **Row 10 stays** — its trigger is the build step that first produces a `redeeming` state,
  which is increment B, not this one.
- **Status doc:** steps table — step 2 **Exited (with the row-15 deferral)** citing the
  five increments and the two-backing proof; step 3 **Started, not exited** (first
  increment: the direct shape; token shape and clocks named as B and C). The §11.2, §8, §4,
  §2 and §5 rows move (the redeem half of the §5 finding resolves; the `open()` half stays
  held). `config.ts`'s and the register's stale row-9 cross-references sweep.
- **CLAUDE.md / README.md:** step 2 exited-with-deferral, step 3 started; the feature-guard
  paragraph's `redeem`-throws sentence rewrites (the eleventh governed capability is now
  partially built: direct shape real, token shape and clocks still guarded).
- Sweep repo-root, patterns per the plan (at minimum: `this increment|started and has not
  exited|permanently held|awaiting redemption|throws at the call seam`), both deixis
  directions, increments named explicitly.

## What this does not claim

- **The token shape does not exist** — no `redeeming`, no token, no `tokenDigest`, no
  presentation, no executor-idempotence contract. A separated-store host has no shape here.
- **No clocks** — `confirmToRedeem` and `redeemBound` remain accepted-but-inert
  (the register's old row-9 framing of that inertness moves to the status doc's §9.1 row);
  `redemption-timeout` is not in the union.
- **The sweep is still unbuilt**; `listDue` still has no kernel caller.
- **Step 3 does not exit** — one of its three increments.
- The library still never executes the effect; §11.2's "Honest bound" is quoted where the
  seam's doc comment states what the direct shape does and does not prevent.
- No maturity marker moves; `docs/concept/` untouched; the four held sealed-set divergences
  stay held (minus the redeem half of the §5 one, resolved by building).

## Process

Subagent-driven development, standing lessons in force (commands over lists; open every
record cited; whitespace-collapsed quote verification; repo-root sweeps; explicit increment
names; both-direction deixis; floor verification — no new runtime API this increment, so
the floor stays `>=22.16`).
