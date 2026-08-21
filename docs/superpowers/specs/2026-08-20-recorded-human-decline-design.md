# Recorded human decline — design and promotion case

**The first post-build-order promotion candidate.** Status: a design AWAITING its
sanction — nothing in `docs/concept/` moves on this document's strength. Per
`docs/concept/SCOPING-GUIDE.md` §2 this document states the promotion case (both prongs,
the purpose-trace, the tier verdict) and, per the sealed-set discipline
(`docs/process/next-phases.md`), names the exact sealed-set edits a fresh sanction would
license. The increment does not start until the maintainer grants that sanction on this
document's case.

## The gap, stated from the code

A terminal "no" is evidence-free by construction. The `refused` payload is `{ code }`
and nothing else; on every refusal path the finalize `identity` argument, the failing
consultation, and the checker who returned the fail verdict are all discarded —
consultations record only in the success batch. An approval binds actor + reviewed
surface + consultations; a rejection binds a machine code. Yet `CONTROLS.md` §5 already
names "declined trade / payment", "declined order / escalation", "denied benefit /
permit", "rejected requisition" as domain instances of Recorded refusals — instances
that imply a decider the records cannot name. The nearest host workaround (a
`terminalRefusals`-listed `consultation-failed` carrying a fail-verdict human-review
consultation) ends the leg without recording who declined, what they saw, or why: the
failing consultation is not recorded, and the identity never lands.

## Promotion case

- **Tier verdict (SCOPING-GUIDE §1): GOVERNED.** Switched on by a host feature (a
  per-leg `decline` declaration); the default host runs the KERNEL alone and its chains
  stay byte-identical. Not KERNEL: a capture-only host whose "no" is simply the record
  expiring loses nothing it relies on today.
- **Prong 1 — a real governance control.** Documented exception review and
  adverse-action explainability are named design references in SCOPING-GUIDE §6;
  four-eyes practice records the rejection with the rejector, not just the approval with
  the approver. CONTROLS §5's own decline instances (above) presuppose it.
- **Prong 2 — adopt beats build.** The in-house workaround records neither decider nor
  reason nor surface, and looks green while doing it — exactly the silent wrongness §2
  promotes against. Evidence-parity between yes and no requires the same gate ladder,
  batch atomicity, and AL2 coverage the confirm path already has; a host bolting
  identity onto a side table gets none of that.
- **Purpose-trace: to the KERNEL confirm loop.** The loop's guarantee is capture of the
  human decision over the exact reviewed content. Today only the affirmative half of
  that decision is capturable with evidence. The decline verb completes the loop's
  fidelity for the negative half; it adds no new consumer, no outside party, no new
  scope commitment.

## Rulings taken (at the 2026-08-20 brainstorm), so they are not re-litigated

- **Payload is `{ actor }` — the mirror of `confirmed`.** Reasons and
  return/escalate intent are NOT payload fields: they ride as ordinary consultations in
  the decline's success batch (e.g. a host `decline-reason` kind — digest-only custody,
  open vocabulary, at most one per kind per call). No taxonomy enters the sealed set.
- **Gate ladder: authority yes, evidence no.** Rungs about WHO decides and WHAT they
  decided on gate both verdicts; rungs about evidence completeness gate only confirm.
  Gating: chain-verify, state/expiry, identity + `allowedAuthorities`, SoD
  (`sod.notActorOf` AND the proposer rule), content-drift, facts binding, eligibility —
  including eligibility's AL2 `freshness` bound (stale authority is authority not
  established). Skipped: `requiredConsultations`, evidence-kind freshness, findings-ack
  coverage — a "no" must never be blockable by a missing or dead evidence source.
- **No `opts.policy` on decline; rung (4.5) does not run.** The policy gate exists to
  prevent approving under stale rules; a decline disposes the record either way, and
  demanding a live policy attestation to say no recreates the undeclinable-record trap
  through the policy source. The bound `policyDigest` stays on the record as the context
  the decline was made under — notarized at open, untouched here.
- **Separate seam, not a finalize verdict flag.** `finalize()`'s pinned return shape
  (`state: 'confirmed'`) stays; §9 gains one symmetric call. The ladder core is shared
  internally.
- **Name: `decline`.** `reject` collides with the store's rejected-append language;
  `refuse` with the `refused` state. (The pre-0.1 API review is retired; the name is
  chosen here, not re-flagged.)

---

## 1. The seam (`kernel/decline.ts`, `operator-surface.ts`)

Operator-only:

```ts
decline(
  recordId: string,
  identity: IdentityAssertion,
  content: unknown,
  facts: { figures: unknown; checker: IdentityAssertion },
  opts?: { consultations?: /* FinalizeOptions.consultations' exact shape, shared intake */ },
): Promise<Outcome<{ recordId: string; state: 'declined'; transitionRef: Digest }>>
```

Parameter order mirrors finalize's (recordId, identity, content, facts, opts?) exactly —
corrected at plan time against the real seam.

Never on the agent surface (the standing rule: no gate baseline or transition through
the agent handle). Consultation intake is finalize's own (shared validator: shape
throws, reserved-kind forgery throws, duplicate-kind throws, the AL2 `observedAt`
presence contract enforced identically). There is no `policy` member — supplying one is
an unknown-option-key throw, the standing `governedUnavailable`-style intake posture.

Ladder, keeping finalize's rung numbering with the evidence rungs absent:

- **(1) chain-verify** → `chain-compromise` (AL2 `signatureLayerHolds` folded in);
- **(2) state/expiry** — a due-open record resolves `expired` first and refuses
  `leg-expired`; a non-open record refuses `record-not-open`;
- **(3) identity** + `allowedAuthorities` (identity by transport, unchanged);
- **(3.5) SoD** — `sod.notActorOf` and the proposer rule refuse `sod-violation`;
- **(4) content-drift** — re-canonicalize + re-digest the supplied `content` against the
  bound `contentDigest`; the decline is about THIS content or it does not land;
- **(4.5) does not run** — no policy input, per the ruling above;
- **(5) facts binding** — no fresh reviewed-surface digest refuses
  `consultation-missing`; the decline binds what the decider saw when they said no;
- **(5.5) eligibility ONLY** — the implicit kind with its existing trip mapping (`fail`
  → `ineligible`, missing → `consultation-missing`, unreachable → the availability
  outcome) and its AL2 freshness bound (`consultation-stale`). Declared
  `requiredConsultations` are NOT iterated; rung (5.7) does not run.
- **(6) success batch** `[chain-verify, facts, ...obtained consultations, declined]` —
  one atomic CAS, `declined { actor }` terminal, `nonTerminal` false, `dueAt` cleared by
  omission.

Every refusal routes through the existing `refuseMaybeAppend`/`appendsOn` rule — a
decline refusal appends the terminal `{ code }`-only edge iff the leg's
`terminalRefusals` lists the code, else the record stays open, unchanged semantics.

## 2. The state and kind (`types.ts`, `store/semantics.ts`, `chain/replay.ts`, `nonterminal.ts`)

- `TransitionKind` gains `declined`; `RecordState` gains `declined` (terminal always —
  `nonterminal.ts` returns false for it unconditionally).
- `stateOf('declined')` → `'declined'` — the no-default exhaustive switch forces this at
  compile time, and all three backings inherit it with zero per-backing edits.
- `replay.ts` folds `declined` exactly as `confirmed` is folded — state moves, and the
  actor's projection posture mirrors confirmed's one-for-one (whatever projection the
  confirmed actor has today, the declined actor gets; the implementer verifies against
  the fold, not this sentence). `ReviewView` shows `state: 'declined'`; no new
  projection fields.
- Encoding: untouched — the digest input carries `kind` as an opaque string; no existing
  digest can move.
- C3: no carve-out for `declined` — parity with `refused`/`expired`; the
  compromise-classed edge's target set does not grow. `sealed` may cap a declined chain
  (state-preserving, as everywhere).

## 3. Construction (`config.ts`)

- `LegSpec` gains `decline?: true` — present-iff-declared. Feature guard from day one:
  the field ships in the same commit as the seam behavior (the standing atomicity
  discipline), so no construction throw ever exists for it; a non-declaring leg's
  `decline()` call THROWS at the seam (the findings-seams posture, keeping non-declaring
  chains byte-identical to today's).
- No interaction rules needed: `decline: true` composes with every existing leg field.
  A live-capture profile declines symmetrically (content binds at decision time;
  live-mode construction rules are untouched).

## 4. Refusal codes: the registry stands at 24

Zero new codes. Every decline refusal reuses an existing code and producer style:
`chain-compromise`, `leg-expired`, `record-not-open`, `sod-violation`, `content-drift`,
`consultation-missing` (absent facts or absent eligibility input), `ineligible`,
`consultation-stale`, `availability`. SPEC §8 is untouched by this increment. (Amended at
exit: under the controller ruling recorded in the increment ledger, SPEC §8's
`unredeemable-state` enumeration and §5's chain-admission sentence each gained `declined`
— consistency edits under the same grant; the registry's codes themselves stand at 24,
untouched.)

(Second amendment, the follow-ups pass: under the maintainer's Class-A-plus-authoritative-B
grant, eleven finalize-scoped SPEC sentences gained decline where the seam shares the
behavior — the §8 producer notes for content-drift/leg-expired/consultation-missing, §3's
content-crossing and facts-default sentences, §9's capability-split sentence and its own
refusal-routing sentence, §9.1's eligibility row, §10.4's per-call and success-batch
sentences, §11.1's one-per-kind rule; §6 and §13A restatements deliberately left.)

## 5. Interactions, all falling out of existing machinery

- **C1**: a declined record's `(profile, subject)` pair releases — terminal.
- **Recovery**: `supersedes` accepts a declined predecessor (it joins the
  terminal-regardless-of-profile set beside `refused`/`expired`/`redeemed`/
  `redemption-failed`), so decline → re-open composes: return-for-rework and
  escalate-to-another-profile are recipes, not verbs (§7 below).
- **Redemption**: refuses `unredeemable-state` on state grounds; nothing to add.
- **Findings seams**: refuse `record-not-open` against a declined record; nothing to
  add. Findings raised BEFORE the decline stay on the chain — a decline over open
  findings is legal (ack coverage does not gate the decline) and the un-acked findings
  remain visible replay evidence of what was outstanding when the human said no.
- **AL2**: the signing decorator mints signatures over the decline batch exactly as over
  every append; `verifySignatures` and all six verification sites cover `declined`
  transitions with no new work.

## 6. Honest bounds (stated wherever the capability is documented)

- A declined record proves the named actor declined this exact content having seen this
  surface — never that the decline was justified or correct (fidelity, not validity).
- The decline is tamper-evident under the record's assurance level exactly like every
  transition: AL1's recompute residual applies; AL2 closes it; absence survives AL2.
- A "no" the host never routes to the seam does not exist — the library observes no
  out-of-band abandonment; the expiry clock remains the only other end of an open leg.
- An unreachable eligibility source yields the availability outcome and the record stays
  open: no authority established, no decision recorded either way — fail-closed posture,
  not a trap; the open `ttl` bounds it as everywhere.
- Evidence of decision, not surveillance of the decider: aggregate use only (SPEC §13's
  posture covers decliners exactly as it covers confirmers).

## 7. Cuts, recorded per anti-goal #4

- **DEFER as a verb** — cut. Deferral is the `open` state plus `expiry`; the host's
  workflow layer waits. Recovery path: none needed; the chain already shows the wait.
- **RETURN / MODIFY / ESCALATE as verbs** — cut. Each is decline + a reason consultation
  + `supersedes` re-open (any-profile re-open covers escalation by design). Recovery
  path: if real hosts prove the recipes insufficient, a disposition field on the payload
  is the revisit point — it was considered and declined at this design's brainstorm.
- **Proposer withdrawal** — cut. The proposer rule gates declines, so a proposer cannot
  decline their own leg; withdrawal stays a host-modeled flow. Recovery path: a distinct
  future verb with its own promotion case, if a real host needs it.
- **Decline-reason as a payload field** — cut in favor of the consultation vehicle.
  Recovery path: the payload can gain an optional digest field later without moving any
  existing chain (present-iff-present), should the consultation vehicle prove wrong.

## 8. Sanction requested (the exact sealed-set touches, licensed only by a fresh grant)

- SPEC §2: `declined` joins the states and the terminality formula; the recovery
  sentence's terminal-predecessor list gains it.
- SPEC §4: one payload row — `declined` | `{ actor }` — the deciding IdentityAssertion
  (§6) | delta.
- SPEC §9: the surface gains `decline(...)` with the ladder subset stated (authority
  rungs gate, evidence rungs do not, no policy input — each with its rationale in one
  sentence).
- SPEC §9.1: `LegSpec` gains the `decline` switch row.
- SPEC §10.1: the SoD sentences extend to "decides or declines".
- CONTROLS.md §3: one GOVERNED row (Recorded human decline; switch `decline` per leg;
  honest bound: proves who declined what they saw, never that the decline was sound);
  §5: one domain-instance row.
- GLOSSARY.md: a Decline entry.
- Markers: the new text lands and the increment exits in ONE increment — spec and
  behavior in the same change, `[PROVEN]` at exit (spec-moves-to-truth with nothing
  draft-ahead). If the maintainer prefers spec-first, the text lands `[DESIGNED]` and
  the marker move is the exit step; the single-increment shape is recommended.

## 9. Tests

- **Ladder pins**, adjacent-pair gate-order style (the standing discipline): each
  gating rung's refusal produced at its rung with the rung below unreached; the three
  skipped rungs pinned as skipped (a leg with a failing `requiredConsultations` kind, a
  stale evidence freshness bound, and an un-acked required finding all DECLINE
  successfully).
- **Evidence-parity property**: a declined record replays with actor, facts consultation,
  and the supplied `decline-reason` consultation intact — the mirror assertion of
  confirm's batch test.
- **Byte-stability**: the frozen oracle untouched and green — the pinned minimal chain
  declares no `decline` and cannot move (assert, do not edit).
- **Store conformance**: the new kind through all three backings via the shared suite
  (C1 release on decline; C3 refuses any state-leaving append after `declined`;
  compromise edge refused against `declined`; `sealed` caps it).
- **Recovery**: `supersedes` accepts a declined predecessor; the C1 pair re-opens.
- **Seam posture**: non-declaring leg throws; agent surface has no `decline`; unknown
  option key (`policy`) throws.
- **Construction**: `decline: true` composes with every leg field it can co-declare.

## What this does not claim

- No new refusal codes, no encoding changes, no store-interface changes (the frozen
  eight methods stand — relevant to the open store-interface freeze question, which
  this increment does not activate).
- The library never judges the decline — no reason is required, none is interpreted.
- Nothing here touches the operator-only scope, the four principles, or the honesty
  discipline; this is a promotion inside the existing scope, not a rescope, and it uses
  no conformance vocabulary.
- The other brainstormed gap-list items (proposed-digest provenance, effect-result
  digest at completion, the conditions recipe, the delegation and policy-verdict guide
  recipes) are separate cases with their own documents, not riders on this one.

## Process

One increment, subagent-driven development, standing lessons in force: feature ships
with its seam in one commit; TDD with a mandated RED run; plan-authored comments
truthful at the commit that lands them; the status doc's new row checked against CODE at
final review; `pnpm contract-scan` before every commit; the byte-stability oracle is
asserted, never edited; no push without instruction. The increment starts only on the
maintainer's explicit sanction grant recorded against §8 above.
