# The supersedes-binding increment — design

**A post-build-order increment (no step). No sealed-set edit, no marker move, no new refusal
code, no change to `index.ts`, either manifest, or any public type. Behavior change:
`verifySupersedes` requires the instance to HOLD the predecessor's profile — the
`kernel/held-profile.ts` comparison, id and digest — for EVERY terminal state, not only for
`confirmed`. A predecessor whose profile the instance does not hold refuses
`supersedes-unverified`, never-append, as `verifyPriorLegs` already does for a prior leg. One
self-authored inversion, the fifteenth. Sanction: none needed, and none claimed — §3 says why.**

**Status.** Taken on the owner's standing instruction of 2026-11-17 ("make your own
decisions"). Branch `supersedes-binding-2026-11-17`, stacked on `signing-obligation-2026-11-17`
(`8db734d`). Not merged.

## 1. What this increment answers

`verifySupersedes` (`kernel/supersedes.ts`) checks AL1, the signature layer, the claimed head,
the subject and terminality. It resolves the predecessor's profile only for a `confirmed`
predecessor, the one state whose terminality depends on the profile (final leg, effect seam).
A `refused`, `expired`, `declined`, `redeemed` or `redemption-failed` predecessor verifies
whatever profile its genesis claims — an id this instance never registered, or a registered id
with a `profileDigest` that does not match it.

That is a route past AL2. The signature layer's obligation, for an instance that does not hold
a record's profile, needs both the live same-id declaration and a verifying genesis entry
(the signing-obligation increment). So a storage-writing insider without keys can write a
whole forged terminal chain — AL1-intact, since AL1 is not cryptographic — that names a
profile the instance does not hold, and `open(…, { supersedes })` binds it as a verified
predecessor in a new record's genesis. With AL2 enabled, SPEC §14 says a rebuilt chain "fails
signature verification without trusting storage", and OPEN-QUESTIONS §1 decided that a
missing signature in a signing scope refuses the claim at the cross-record verifications.
Neither holds for such a predecessor. The signing-obligation increment pinned two shapes of
this residual (a forged chain naming a registered signing id with a mismatched digest; a
same-id signing sibling over a signing predecessor whose genesis entry was removed and whose
head is a forged unsigned edge) and named this increment as the one that closes them. The
original shape — a forged chain naming an unregistered id — predates both.

What the record says. SPEC §4: "the two cross-record verifications (§10.1, §2) fold the same
mismatch on the referenced record into their own claim refusals" — with no state qualifier.
`verifyPriorLegs` folds it for every prior leg. `verifySupersedes` folds it for `confirmed`
only, by the profile-drift gate design's ruling (its "two cross-record verifications" bullet:
a predecessor "in a state terminal regardless of profile … is unaffected: its profile is not
consulted today and is not consulted after"), defended in the 2026-09-05 external-review
triage (`docs/analysis/2026-09-05-external-code-review.md` §5.2), and pinned in
`test/profile-drift-gate.test.ts` ("a declined predecessor recovers regardless").

## 2. Goals, non-goals, anti-goals

**Goals.**

- `verifySupersedes` refuses when the instance does not hold the predecessor's profile, for
  every terminal state.
- A forged terminal predecessor naming an unregistered id, or a registered id with a
  non-matching digest, refuses `supersedes-unverified`; so do the two residual shapes the
  signing-obligation increment pinned.
- Recovery keeps working wherever the instance holds the predecessor's profile: the rework
  recipe (same profile), escalation (a different profile, both registered), and recovery after
  a profile revision registered under a new id with the old one kept.

**Non-goals.**

- **Rehoming** — an insider rewriting a predecessor's genesis consistently onto a profile the
  instance holds and that does not sign — still verifies at AL1. It needs an obligation
  anchored outside the chain (an instance-level policy), a question of its own.
- **A forged predecessor under a held non-signing profile** — the AL1 recompute route, inherent
  to AL1; SPEC §14 names closing "the recompute residual" as AL2's job, for signing profiles.
- `review()`'s findings coverage under the live profile — separate.

**Anti-goals.**

- A recovery route that needs a predecessor's profile the instance does not hold. SPEC §4's
  version discipline (keep the prior version registered under its id) is the route.
- Any change to the other checks' order or to `verifyPriorLegs`.

## 3. Constraints, and why no sanction is needed

- The change makes the code meet sealed text it diverges from today: SPEC §4's fold sentence,
  and OPEN-QUESTIONS §1's missing-signature posture at the cross-record verifications. No
  sealed-set edit; SPEC §2's recovery paragraph ("verified by replay … requires it intact and
  **terminal**") says nothing that the fold contradicts.
- No new refusal code, no outcome-class change, no public type change.
- **It reverses a recorded stance — the fifteenth self-authored inversion.** The drift gate's
  ruling was argued from terminality: only `confirmed` needs the profile to prove terminality.
  That argument is right about terminality and does not reach the question SPEC §4 asks, which
  is whether the instance holds the rules the referenced record was decided under — and, since
  AL2, whether it can hold the predecessor to its signature obligation at all. The 2026-09-05
  triage defended the asymmetry against a reviewer who called it unmotivated; it did not
  consider the signature layer, which is where the asymmetry turns into a forged binding. The
  inverted pin is argued at its site and recorded in the status record's numbered sequence.
- The cost, stated: recovery now needs the predecessor's profile held. A host that edited a
  profile in place, or retired an id, must restore or re-register the prior version to
  supersede its records — the same version discipline every operator seam already demands.

## 4. Approaches

1. **Fold for every state (picked).** One check, the same comparison `verifyPriorLegs` makes,
   the sealed sentence read as written.
2. **Fold only when the instance has `config.signing`, or the sidecar lists entries for the
   predecessor.** Keeps AL1-only recovery permissive. Two behaviors for one claim, and the
   sidecar condition hands the decision to insider-writable data. Not picked.
3. **Keep the asymmetry and document the route.** Leaves the AL2 overclaim standing and the
   sealed sentence unmet. Not picked.

## 5. Rulings

**5.1 The check.** In `verifySupersedes`, after the subject check and before the state checks:
`const resolved = heldProfile(profiles, record)`; `undefined` refuses (`{ ok: false }`). The
`confirmed` branch then uses `resolved` — no second lookup. The checks before it (AL1, the
layer, the head, the subject) keep their order.

**5.2 The inversion.** `test/profile-drift-gate.test.ts`'s supersedes test: its declined half
flips from `ok` to `supersedes-unverified`, retitled, with the argument at its site and the
recovery route (the holder recovers) asserted beside it. `test/signing-obligation.test.ts`'s
three pins of the residual flip to `supersedes-unverified` and are retitled: they recorded the
residual this increment closes, on an unmerged stacked branch, and are not a further inversion.

**5.3 New pins** (a new test file):

- a forged `declined` chain written straight into the store, AL1-intact, naming an
  unregistered profile id → `supersedes-unverified`, no record created; the same chain naming a
  registered id with a non-matching digest → the same;
- for each terminal state the store can produce under a held profile (`refused`, `expired`,
  `declined`, `redeemed`, `redemption-failed`, `confirmed`) → the holder's supersedes verifies,
  and an instance holding the same id at a different digest refuses;
- the routes: escalation (an instance registering both the declined record's profile and a
  stricter one opens under the stricter one) verifies; an instance whose registry lacks the
  predecessor's id refuses, and re-registering that id unchanged verifies.

**5.4 Docs in the same change.** `kernel/supersedes.ts`'s header and its state-check comment;
any `kernel/verify-signatures.ts` comment that names the supersedes residual;
`docs/guide/integrating.md` (the per-site outcomes in the AL2 bullet, and one sentence in the
escalation paragraph: the instance must hold the predecessor's profile);
`docs/guide/api-reference.md` (the per-site outcomes in the `signingDeclared` paragraph);
`CHANGELOG.md` `[Unreleased]`; `docs/process/implementation-status.md` (this increment's
section with the fifteenth inversion; the signing-obligation section's open item marked closed
here); `CLAUDE.md`'s measured counts; `docs/superpowers/INDEX.md`.

## 6. Left to the builder

Local names; how the forged chain is built (the signing-obligation test file's `forgeDeclined`
fixture is a model); test file name; which terminal states are reachable with existing
fixtures (a state the fixtures cannot reach is named in the report, not faked).

## 7. Exit

Every repository gate green except `smoke`, which runs in CI on the pull request. Exactly the
four pins of 5.2 change their truth value — measured before this design was written by
applying the check and running the suite: those four failed and every other test passed. The
byte-stability digests do not move.
