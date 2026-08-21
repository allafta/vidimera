# Effect-result notarization — design and promotion case

**The third post-build-order promotion candidate.** Status: a design AWAITING its
sanction — nothing in `docs/concept/` moves on this document's strength. Per
`docs/concept/SCOPING-GUIDE.md` §2 this document states the promotion case (both prongs,
the purpose-trace, the tier verdict) and names the exact sealed-set edits a fresh
sanction would license (§7 below). The increment does not start until the maintainer
grants that sanction on this document's case.

## The gap, stated from the code

A redeemed record says how redemption closed, never what the effect did. The `redeemed`
payload is exactly `{ via: 'direct' }` or `{ via: 'token', tokenDigest }` — the coupling
and its shape, nothing about the executed effect. So the chain answers "this decision
was coupled once to an effect" but not "and the effect reported this", and the record's
last word on a governed action is a coupling, not an outcome.

The host's alternatives today are both poor. Embedding the result inside the redemption
`content` is impossible: that argument is re-digested against the record's bound
`contentDigest`, so anything added to it refuses `effect-mismatch`. Appending after the
fact is barred by C3 terminal monotonicity — after `redeemed` the only admissible append
is the state-preserving `sealed` cap. What remains is a side table the record cannot see,
or a successor pure-capture record (a real option, kept below as the late-result recipe).

The honest slot the mechanics leave open is the redemption call itself, in the two shapes
where the outcome is knowable at the seam: the enlisted co-located `redeem()`, whose edge
"commits or rolls back with" the host's effect write in one transaction (SPEC §12), and
token `completeRedemption()`, which the separated executor calls when it executes.

## Promotion case

- **Tier verdict (SCOPING-GUIDE §1): GOVERNED.** Switched by a per-profile declaration
  inside the existing `redeem` block; off by default, and a non-declaring profile's
  chains stay byte-identical.
- **Prong 1 — a real governance control.** Record-keeping and audit-trail integrity
  duties (SCOPING-GUIDE §6's design references) expect the trail to reach the executed
  action, not stop at the authorization; reconciliation practice compares authorized
  effects against executed ones, which is exactly the negative assurance SPEC §11.2
  already frames ("every governed effect that reaches the seam has exactly one matching
  record — the negative assurance an auditor reconciles externally"). Binding the host's
  own result claim at the seam strengthens that reconciliation from one side.
- **Prong 2 — adopt beats build.** The in-house version is a side table keyed by record
  id: unbound, unchained, unsigned, and trivially divergent from the record it annotates.
  The library binding a digest inside the `redeemed` transition puts it under the same
  hash chain, the same atomic CAS, and the same AL2 signature as the coupling itself —
  and the placement constraint (inside the payload, never appended after) is precisely
  the subtle rule an in-house build gets wrong by appending and quietly violating C3.
- **Purpose-trace: to the governed-host bar.** The effect seam is a governed control, and
  this completes its record: the seam already proves at-most-once coupling to an exact
  decision; it now also carries what the host reported the effect did. No new consumer,
  no outside party, no scope commitment moves.

## Rulings taken (at the 2026-08-21 brainstorm), so they are not re-litigated

- **The redemption family gains one options bag; `tx` moves into it.** All three seams
  become `(…, opts?)` with `opts: { tx?, result? }`, aligning them with `finalize`/`open`/
  `decline`. Verified sanction-free: SPEC states parameter lists for `stage`, `open`,
  `review`, `finalize`, `decline` and `seal`, and names redemption only as the bare verb
  `redeem()` — no sealed sentence states a redemption argument list. SPEC §9 positively
  licenses the shape: "Feature options … grow only the **operator-only** options bags".
  Two sealed constraints bind the bag and are honored: §12's handle rule (the field stays
  the driver's own handle type, `tx?: unknown`, never a library-owned transaction
  interface), and §11.2's "It carries no identity argument" (the bag never gains an
  identity field; adding one would be a fork, not an edit).
- **The declaration ADMITS the field; it does not require it.** `redeem.result: true`
  makes a result digest legal on that profile's redemption seams; supplying one on a
  non-declaring profile throws; a declaring profile that supplies nothing simply records
  nothing. **This is new normative text, not an inherited pattern** — stated plainly
  because the honest precedent is thin: the only sealed presence rule is §10.3's
  *mandatory* one ("Presence is a caller contract, checked loud"), and the admission-gate
  shape this design wants exists only as a code pattern (finalize's `observedAt` gate;
  `observedAt` is not sealed vocabulary at all). The argument on its merits: a result the
  host does not know cannot be manufactured, so a mandatory contract would force hosts
  either to fabricate a digest or to leave the capability undeclared — the opposite of
  fail-closed. And absence here is self-evidently non-evidence (no key, no claim),
  unlike policy, where absence would leave a declared gate unrun.
- **Accepted at `redeem()` and `completeRedemption()`; rejected at `beginRedemption()`.**
  Issuance precedes execution, so a result at begin-time would be a claim about an
  unexecuted effect: supplying one there throws.
- **Declaring `result` declares the effect seam.** `profileDeclaresEffectSeam` keys on the
  `redeem` block's presence, never its contents, so `redeem: { result: true }` is an
  effect-seam profile exactly as `redeem: {}` is. This is correct, not a trap: a result
  digest exists only on a `redeemed` transition, so there is nothing to notarize without
  redemption. It is documented, never guarded — requiring a clock tail alongside `result`
  would contradict §9.1's treatment of the clocks as optional policy choices.
- **`resultDigest` is the payload key; `result: { digest }` is the input shape.** Digest
  only — no structured members (`executionId`, `transactionId` and friends ride inside
  the host's own digested result content, exactly as evidence rides `payloadDigest`).

---

## 1. The surface refactor (no sanction; its own commit)

Three seams move from a trailing positional `tx?` to a trailing `opts?`:

```ts
redeem(recordId, content, opts?)
beginRedemption(recordId, content, opts?)
completeRedemption(recordId, token, content, opts?)

interface RedeemOptions { tx?: unknown; result?: { digest: Digest } }
```

Blast radius, measured: **11** call sites pass a real `tx` today (5 in `redeem.test.ts`,
5 in `redeem-token.test.ts`, 1 in `clocks.test.ts`) and become `{ tx: … }`; **91** call
sites pass no `tx` and are untouched; `create.ts`'s three delegations and the nine
kernel-internal positional pass-throughs inside `kernel/redeem.ts` thread `opts?.tx`
instead; one `integrating.md` fence mentions `tx` in a comment and is reworded. The
refactor lands behavior-preserving, gated by the existing suite, before the capability.

`RedeemOptions` is exported beside `FinalizeOptions`/`DeclineOptions`/`OpenOptions`, so
`api-reference.md` must name it (the api-sync gate). Deferral-register **row 16** —
already the record for `tx` on the token halves — is updated in place rather than joined
by a new row.

## 2. The capability

- `ConfirmProfile.redeem` gains `result?: true`, guarded structurally: any declared value
  other than the literal `true` is a construction error (the `signing` / `LegSpec.decline`
  class). `REDEMPTION_KEYS` gains `'result'`, so a stray `result` key on the profile or a
  leg is caught by the existing misplacement check.
- **Intake (argument depth, before any chain load):** a malformed `opts.result` throws —
  a plain object with exactly `digest`, a non-empty string. This is the
  consultation-shape depth SPEC §9's ladder paragraph fixes for argument-shape faults.
- **Admission (profile-resolution depth, after `prologue()` resolves the profile):**
  `opts.result` present on a profile that does not declare `redeem.result` throws;
  present at `beginRedemption()` throws regardless of declaration. Both sit after the
  prologue, so `chain-compromise`, `unknown-profile` and the effect-seam/final-leg gate
  win first — the depth convention the existing presence contracts follow and the
  adjacent-pair tests pin.
- **Binding:** the `redeemed` payload gains `resultDigest`, present-iff-supplied, in both
  shapes: `{ via: 'direct', resultDigest? }` and `{ via: 'token', tokenDigest,
  resultDigest? }`. Absent when unsupplied, so every existing chain — including the
  cross-backing byte-identity flow, which does drive a redemption — stays byte-identical.
- **Fold:** `DecisionRecord.resultDigest?`, folded from the `redeemed` payload by
  `chain/replay.ts`. Not projected into `ReviewView` (review shows what is being decided;
  a redeemed record is past review). Nothing gates on it — `redeemed` is terminal, so
  there is no downstream to gate.
- Zero new refusal codes, kinds, or states.

## 3. Honest bounds (stated wherever the capability is documented)

- The binding notarizes **a host-claimed result digest at the redemption seam** — that
  the host asserted this outcome, digest-bound, at the moment it closed the coupling.
- It does **not** observe the effect. The library executes nothing and sees nothing that
  bypasses the seam; that blindness is unchanged.
- It does **not** verify the claim. A host binding a false digest is recorded faithfully
  binding a false digest (fidelity, not validity) — and library-side verification is a
  permanent non-goal, because performing it would make the library the business system.
- It does **not** mirror later business state. A result true at completion may be
  reversed, amended, or settled differently afterward; the record neither knows nor
  claims otherwise.
- It is meaningful only where the outcome is genuinely known **at the call** — the
  enlisted co-located `redeem()` and token `completeRedemption()`. In the un-enlisted
  gate-then-execute flow the outcome is unknown at `redeem()`, so a digest supplied there
  would be a claim about an unexecuted effect. The library cannot detect the difference,
  which is exactly why the discipline is written down rather than enforced.
- At AL1 the binding carries AL1's ordinary insider bounds; on a signing profile it is
  signature-covered like every transition.

## 4. Composition

- **Token shape:** the result rides the `redeemed` payload minted at completion; the
  `redeeming` payload is untouched.
- **Enlisted direct shape:** the result digest and the effect row commit together, which
  is the strongest form this capability takes.
- **Live capture / reverify:** untouched — a content-drift refusal at redemption
  precedes any result binding, since the correspondence check runs first.
- **Sealing:** a `sealed` cap over a result-carrying `redeemed` chain is unchanged.
- **Late results:** out of this capability by construction, and handled by composition —
  a successor pure-capture record whose `subjectRef` names the executed effect and whose
  content carries the outcome. That recipe is documented, not built.

## 5. Cuts, recorded per anti-goal #4

- **Post-`redeemed` result append, and any C3 carve-out for it** — rejected outright.
  Recovery path: the successor-record recipe above.
- **Structured result fields** (`executionId`, `transactionId`, `effectTarget`, `result`)
  — cut. Recovery path: they ride inside the host's digested result content; a future
  case would have to argue why the library needs to read them.
- **Library-side result verification** — cut permanently (it would make the library the
  business system; the proposal-review criterion F rejects it too).
- **Result at `beginRedemption()`** — cut, with its rationale (issuance precedes
  execution).
- **A mandatory presence contract** — cut in favor of the admission gate, argued above.
  Recovery path: a future profile field could demand it if a real host wants the
  stricter posture.

## 6. Tests

- The refactor: the existing suite unchanged and green is the whole gate (11 call sites
  rewritten, 91 untouched).
- Happy paths: enlisted direct `redeem()` with a result, and token
  `completeRedemption()` with a result — the digest folded onto the replayed record in
  both shapes.
- Declared-but-absent records no key; the `redeemed` payload key-set pinned in both
  shapes (base keys plus exactly `resultDigest`), mirroring the recovery/provenance
  key-set idiom.
- Non-declaring profile plus supplied result throws; `beginRedemption` plus result throws
  even when declared; malformed `result` shapes throw at intake.
- Construction: `result: false` (and any non-`true` value) throws; a stray `result` key
  on the profile or a leg throws.
- Adjacent-pair order pins: the intake throw beats the admission throw; the admission
  throw sits behind `chain-compromise`, `unknown-profile` and the effect-seam gate.
- A signed-redemption pin: a result-carrying `redeemed` transition reports signed and
  verified.
- The frozen byte-stability oracle and the cross-backing byte-identity flow asserted
  green untouched (the latter drives a real redemption, so it is the second guard that a
  non-supplying chain did not move).

## 7. Sanction requested (the exact sealed-set touches, licensed only by a fresh grant)

- SPEC §4: the `redeemed` payload row gains `resultDigest?` in both shapes.
- SPEC §9.1: the `redeem` block's field coverage gains `result` (the admission-gate
  declaration, literal `true`).
- SPEC §11.2: the result semantics — which seams admit it, the admission gate and its two
  throw postures, the digest-only custody, the honest bounds above, and the sentence that
  declaring `result` declares the effect seam like any `redeem` block.
- CONTROLS.md §3: one new GOVERNED row (Effect-result notarization; switch
  `redeem.result`; honest bound: notarizes the host's claimed outcome at the seam, never
  observes or verifies it, never mirrors later business state); §5: one domain-instance
  row.
- GLOSSARY.md: one entry.
- Markers: `[DESIGNED]` at entry, `[PROVEN]` at exit.
- Explicitly NOT requested: §12 (the handle rule is honored, not changed), §13
  (no new purpose-limitation vector — a result digest is effect metadata, not reviewer
  metadata), and any §11.2 sentence about identity (untouched by construction).

## What this does not claim

- No new refusal codes, transition kinds, states, or store-interface changes.
- The library never reads, interprets, or verifies the result content — only its digest
  crosses the seam, and only to be recorded.
- Nothing gates on the binding, at any seam, ever.
- Nothing touches the operator-only scope, the four principles, or the honesty
  discipline; this is a promotion inside the existing scope, and it uses no conformance
  vocabulary.

## Process

One increment, subagent-driven: the surface refactor first (no sanction, behavior-
preserving, gated by the existing suite), then the sealed text `[DESIGNED]`, then the
capability TDD, the pins, the guide, and an exit that moves markers, lands the record,
updates deferral-register row 16, and runs the comment-truth sweep. The increment starts
only on the maintainer's explicit sanction grant recorded against §7 above.
