# Proposal provenance — design and promotion case

**The second post-build-order promotion candidate.** Status: a design AWAITING its
sanction — nothing in `docs/concept/` moves on this document's strength. Per
`docs/concept/SCOPING-GUIDE.md` §2 this document states the promotion case (both prongs,
the purpose-trace, the tier verdict) and names the exact sealed-set edits a fresh
sanction would license (§7 below). The increment does not start until the maintainer
grants that sanction on this document's case.

## The gap, stated from the code

A record cannot say what the agent proposed. The one content binding is `contentDigest`,
fixed at open from the staged draft the operator chose to open — and when a human
revises an agent's draft before opening, the revision is a NEW staged draft under a new
`stagedRef` (staging is idempotent by content; revised content derives a distinct ref),
with no linkage to the original. The record then binds only the revised content: the
agent's original proposal survives nowhere on the chain, and "the human changed the
draft before approving it" — the effective-challenge evidence review is supposed to
leave — is unrecoverable from the record. The nearest host workaround embeds the
proposed digest inside the decided content itself, polluting the domain content schema
with process metadata and binding an unverified self-claim.

Multi-round rework already has verifiable form — a declined or refused record recovered
via `supersedes` chains real records — but the single most common shape, one agent draft
revised once by its reviewer and then decided, has no first-class trace.

## Promotion case

- **Tier verdict (SCOPING-GUIDE §1): GOVERNED**, switched by an **open-time option**,
  not a profile field — the recovery (`supersedes`) precedent exactly: on iff supplied,
  and a non-supplying chain is byte-identical to today's.
- **Prong 1 — a real governance control.** Effective-challenge norms are a named design
  reference in SCOPING-GUIDE §6: supervisory practice expects review to leave evidence
  of challenge — that the reviewer engaged and changed (or deliberately kept) the draft.
  Distinguishing agent output from human judgment on the durable record is that
  evidence, not a speculative feature.
- **Prong 2 — adopt beats build.** The in-house version embeds the proposed digest in
  the decided content: schema pollution, an unverified self-claim, and invisible to the
  record model. The library binding it at genesis — resolved against the store, checked
  against the opened draft's own (profile, subject, leg), covered by the AL2 signature
  on signing profiles — is precisely the subtle custody machinery an in-house build gets
  wrong silently.
- **Purpose-trace: to the KERNEL confirm loop.** The loop's guarantee is capture of the
  human decision over agent-drafted content. When review revised the draft, capture
  without the proposed digest records half the story: what was decided, but not what the
  decision changed. No new consumer, no outside party, no scope commitment moves.
- **The analytics guard, in the same breath.** Correction analysis over these bindings
  sits under SPEC §13's aggregate-only posture. The "ground-truth boundary for agent
  improvement" purpose evaluated at the gap review is NOT this case — it failed the
  promotion rule's first prong and stays out.

## Rulings taken (at the 2026-08-21 brainstorm), so they are not re-litigated

- **The binding is a resolved staged-draft reference, not a bare digest.**
  `open(stagedRef, { proposed: { stagedRef } })`: the library resolves the proposed ref
  through the store exactly as it consumes its own `stagedRef`, and binds the resolved
  draft's `contentDigest` into the genesis as `proposedDigest`. A bare host-claimed
  digest was considered and declined: resolution buys the existence check, the
  same-triple check below, and the ergonomics of the ref the host already holds.
- **Throw, never refuse.** An unresolvable proposed ref is a caller error (open's own
  unknown-`stagedRef` posture; SPEC §8's throw-rather-than-refuse class). A resolved
  draft naming a different `(profileId, subjectRef, legId)` than the opened draft ALSO
  throws — strict same-triple, fail-closed against host wiring bugs. The refusal
  registry stays at 24.
- **Open-time option, no profile field.** The `supersedes` precedent: presence switches
  it, byte-stability rides present-iff-supplied, and a host wanting it mandatory
  enforces at its own `open` call site (a leg-level requirement field is a recorded
  recovery path, not built).
- **ReviewView does NOT project it.** The `supersedes`/`priorRecordRefs` precedent:
  provenance and linkage evidence ride `getRecord`/`replay`, never the review
  projection — review shows what is being decided, not its pedigree.
- **Names: `proposed` (the option), `proposedDigest` (the bound field).** SPEC §1
  already owns the Proposer vocabulary; this stays inside it.
- **Same-ref is legal and meaningful.** Opening the proposal itself with
  `proposed: { stagedRef }` naming that same draft records unchanged acceptance —
  digests equal, deliberately representable, no special case.

---

## 1. The seam (`kernel/open.ts`, `config.ts`)

`OpenOptions` gains one member beside `priorRecordRefs`/`policyDigest`/`supersedes`:

```ts
proposed?: { stagedRef: string };
```

At `open()`, after the opened draft resolves and before the genesis is built:

- resolve `opts.proposed.stagedRef` via `store.getStaged`; `null` THROWS naming the ref
  (the unknown-`stagedRef` posture, verbatim class);
- require the resolved draft's `profileId`, `subjectRef`, AND `legId` to equal the
  opened draft's; any mismatch THROWS naming both triples (fail-closed wiring
  discipline — a proposal for a different subject, profile, or leg is a host bug, not a
  domain outcome);
- bind `proposedDigest: <resolved draft's contentDigest>` into the genesis `opened`
  payload, present-iff-supplied.

The option's shape is validated at intake (a plain object with exactly `stagedRef`, a
non-empty string — unknown keys throw), matching `supersedes`' shape-validation class.
`open()` is operator-only already; the agent surface is untouched by construction.

## 2. The record model (`types.ts`, `chain/replay.ts`)

- The genesis `opened` payload gains `proposedDigest?: Digest`, present-iff-supplied —
  the same mechanism `supersedes` and `priorRecordRefs` ride, so a non-supplying
  profile's chains stay byte-identical to today's and the frozen byte-stability oracle
  cannot move.
- `DecisionRecord` gains `proposedDigest?: Digest`, folded from the genesis snapshot by
  `chain/replay.ts`, present-iff-present.
- `ReviewView` is untouched.
- NOTHING gates on the field, at any seam, ever: finalize, decline, redemption, the
  findings seams, and seal are all untouched. Notarize, never evaluate.

## 3. Honest bounds (stated wherever the capability is documented)

- The binding proves a draft with the bound digest existed in the store for the same
  (profile, subject, leg) when the record opened — and, by digest comparison against
  `contentDigest`, whether the decided content matched or differed from it. It proves
  nothing else.
- It never proves WHO authored either draft: staging carries no identity, and the
  agent/operator split is in-process object-capability discipline (SPEC §9's own stated
  bound) — a host writing the store directly can stage anything.
- It never proves the revision improved the draft (fidelity, not validity).
- On a signing profile the binding is signature-covered from genesis (the `opened`
  transition is signed); at AL1 it carries AL1's ordinary insider bounds.
- Correction analysis over proposed-vs-decided digests is aggregate control-assurance,
  never per-named-reviewer scoring (SPEC §13's posture, unchanged).

## 4. Composition

- **With recovery:** a rework round's re-opened record may carry BOTH
  `supersedes` (the terminal predecessor) and its own `proposed` (the revised draft's
  provenance) — the two options are independent and compose.
- **With multi-leg:** each leg's record is opened separately and may carry its own
  `proposed`; the same-triple rule keys the proposed draft to THAT leg.
- **With live capture:** live profiles open through the same seam and may carry it
  identically; nothing mode-specific.

## 5. Cuts, recorded per anti-goal #4

- **Multi-hop draft lineage (P1→P2→P3 inside one record)** — cut. Staged drafts are
  store-side and unchained; linking them would mint unverifiable lineage. Recovery
  path: multi-round rework as records (decline/refuse + `supersedes`), each round
  carrying its own `proposed`.
- **Editor identity on the revision** — cut. Recovery path: a host `revision`
  consultation convention (checker = the editor, payloadDigest over the prior version),
  documented in the guide; a first-class field is a later case if hosts need it.
- **A mandatory-provenance profile switch** — cut. Recovery path: a leg-level
  requirement field with its own promotion case, if a real host needs enforcement the
  call site cannot give.
- **Cross-subject/profile/leg proposed refs** — cut (strict same-triple). Recovery
  path: loosen on a demonstrated real-host need, argued at the seam.

## 6. Tests

- Happy path: agent stages P1, revised P2 staged, open P2 with `proposed: P1` — the
  replayed record carries both digests, decided ≠ proposed.
- Unchanged acceptance: open P1 with `proposed: P1` — digests equal.
- Unknown proposed ref throws; wrong-subject, wrong-profile, and wrong-leg refs each
  throw naming the mismatch; malformed option shape throws.
- Byte-stability: the frozen oracle green untouched (non-supplying chains identical);
  a supplying chain's genesis digest differs — asserted as a property, not pinned.
- Multi-leg: per-leg `proposed` on a two-leg profile.
- Recovery composition: decline → `supersedes` re-open carrying its own `proposed`.
- ReviewView non-projection pin; finalize and decline demonstrably ungated by the field.
- One signed-genesis pin (the ed25519 helper): the opened transition carrying
  `proposedDigest` reports signed && verified.

## 7. Sanction requested (the exact sealed-set touches, licensed only by a fresh grant)

- SPEC §2: the record model gains `proposedDigest` (optional), with one provenance
  sentence stating the binding and its bound in the same breath.
- SPEC §4: the `opened` payload row's present-iff-supplied keys gain `proposedDigest`.
- SPEC §9: `open()`'s options gain `proposed { stagedRef }` — the resolution semantics,
  the two throw postures, the same-triple rule, the honest bound, and the §13-posture
  sentence.
- CONTROLS.md §3: one GOVERNED row (Proposal provenance; switch: open-time option;
  honest bound: proves the draft existed and whether the decision changed it — never
  who authored it or that the change was sound); §5: one domain-instance row.
- GLOSSARY.md: one entry.
- Markers: `[DESIGNED]` at entry, `[PROVEN]` at exit — the decline increment's
  two-phase shape, spec-moves-to-truth at the exit step.

## What this does not claim

- No new refusal codes, no new transition kinds, no new states, no store-interface
  changes, no gate-ladder changes anywhere.
- The library never interprets the proposed content or its relationship to the decided
  content beyond digest equality being computable by the host.
- Nothing touches the operator-only scope, the four principles, or the honesty
  discipline; this is a promotion inside the existing scope, and it uses no conformance
  vocabulary.

## Process

One increment, subagent-driven development, standing lessons in force: sealed text
lands `[DESIGNED]` first under the grant; the seam and its tests land TDD with the
full-gate battery (`vitest` zero skips, typecheck, lint, contract-scan, api-sync) at
every commit; the guide moves with the surface, samples vitest-verified; the exit moves
markers, lands the record in `docs/process/implementation-status.md`, and runs the
comment-truth sweep. The increment starts only on the maintainer's explicit sanction
grant recorded against §7 above.
