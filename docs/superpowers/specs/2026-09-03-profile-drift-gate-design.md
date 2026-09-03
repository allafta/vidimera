# The profile-drift gate — design and sanction case (a widening of `unknown-profile`)

**A sealed-set widening under a sanction GRANTED 2026-09-03 (§8) — nothing in `docs/concept/`
moved on this document's strength before that grant.** Per `docs/concept/SCOPING-GUIDE.md` §§1–2 this document states the tier
verdict, both promotion prongs and the purpose-trace, and, per the sealed-set discipline
(`docs/process/next-phases.md`), names the exact sealed-set edits a fresh sanction would license,
by site, with the current text and the proposed text side by side. No maturity marker moves:
every touched section is already `[PROVEN]`, and restating a settled marker is not a move, so
this is a sanctioned corrective-and-widening edit in the lineage, not a marker-bearing one. The
increment did not start until the maintainer granted that sanction on this document's case (§8).

## The gap, stated from the code

`kernel/verify-signatures.ts` decides whether the signature layer applies to a record by
resolving the genesis transition's `profileId` against THIS instance's registry and reading
`.signing === true` from whatever profile it finds. Every seam that touches a persisted record
resolves its profile the same way — `profiles.get(record.profileId)` — and refuses
`unknown-profile` only when the id is not registered. So a same-id profile whose `signing: true`
was dropped reads a signing record as plain AL1, and an instance holding that profile finalizes
the record; the same instance need not carry `config.signing` at all, and never reads the
sidecar. The 2026-09-03 security review took exactly that route ("I wiped the sidecar and
finalized successfully" — the wipe was not even needed), recorded in
`docs/analysis/2026-09-03-security-findings.md` as finding 2.

The chain has carried the evidence all along. The `opened` payload binds `profileDigest`, a
digest over the profile's data-only projection — every declarative field, `signing` included —
and SPEC §4 says why: "so the record notarizes the shape of the flow it was decided under; drift
in the governing profile is detectable on replay." Since commit `c3bfdf0`
`verifySignatures(recordId).genesisProfile` performs that comparison and reports it as
`matches`, `drifted` (both digests), or `unresolvable`, and `profileDigest`/`projectProfile`
are exported. Nothing refuses on it. The test that pins the fail-open,
`packages/record/test/profile-drift-report.test.ts`, says in its header that it pins a bound
"so that the day it moves it moves on purpose". This document is that day.

The asymmetry is in-tree. `kernel/finalize.ts`'s policy-drift arm fails closed on the identical
same-id flip for `policySource` — "a bound digest with nothing live to compare is
mismatch-shaped" — and argues so at its site; OPEN-QUESTIONS §2 records that decision. The
profile binding, which covers `policySource` and every other rule the record was decided under,
took the opposite posture with no argument at its site. OPEN-QUESTIONS §1 named a same-id
profile flipping `signing` "the version-discipline violation SPEC §2's convention names" and
left the violation unrefused. The 2026-08-30 catalogue carries the gap as items 33
(`profile-digest-no-drift-detector`) and 60 (`al2-rehoming-residual`).

## Promotion case

- **Tier verdict (SCOPING-GUIDE §1): KERNEL.** Every host binds `profileDigest` at genesis
  today, unconditionally, in every deployment; the confirm loop's guarantee — a record proves
  it was reviewed and decided under the declared profile — is false whenever an instance
  holding other rules can finalize the record. No host feature switches this on; the default
  host runs it. The refusal therefore lands in the CORE registry, not the profile-conditional
  table.
- **Prong 1, a real governance control.** SCOPING-GUIDE §2's own list of recognized controls
  names it verbatim: "decided-under-rules-as-they-were". The rules are the profile; the record
  binds them at genesis; deciding under a different profile is the control's failure mode.
- **Prong 2, adopt beats build.** An in-house build that stores a config hash at record
  creation and never compares it is the ordinary shape; the mis-decision under edited rules is
  silent, and nothing in the record's own bytes shows it later. That is §5's "subtle machinery
  an in-house build gets wrong silently".
- **Purpose-trace:** to the KERNEL confirm loop, directly — the loop's claim is "decided under
  this profile", and the genesis `profileDigest` is that claim's evidence.
- **Not a fork (CONCEPT.md).** The four principles are untouched: fidelity-not-validity is
  about content (refusing to decide under other rules judges no draft); graduated honesty is
  strengthened (a signing record no longer silently downgrades); the human anchor and
  identity-by-transport are unaffected. Anti-goal #1 is met by the purpose-trace above.

## Rulings taken (at the 2026-09-03 brainstorm), so they are not re-litigated

1. **Fold into `unknown-profile`; mint no new code.** Its meaning becomes "this instance does
   not hold the profile the record was opened under", by id or by id-and-digest. The stability
   clause in SPEC §8 ("codes are never reused with changed meaning") is read as satisfied: the
   meaning is the same, and what changes is how "hold" is determined. A consumer branching on
   `unknown-profile` as "this instance is misconfigured for this record" stays right. The
   alternative — a new `profile-drift` code — would have to be never-append (below), widening
   the never-appends definition in three sealed places, adding a 26th registry entry, and
   touching the ladder text and the guide's refusal table; it was declined on blast radius, not
   on merit.
2. **Never-append, at profile resolution.** A drifted instance does not know the record's
   rules: whether to sign, which refusals the leg marks terminal, what the ttl was. It must
   write nothing. Placing the check in the resolution step every seam already has — after
   chain-verify and the signature layer, ahead of every ladder rung — makes that true by
   construction and renumbers nothing.
3. **Accept the stranding as the recovery story.** An in-place edit strands the profile's open
   records: no seam can finalize, decline, expire (expiry is en passant at the seams only;
   there is no public `expire()`) or take findings, and exclusivity blocks re-opening the
   subject. Recovery has two routes, both already the §9.1 `id` convention: restore the
   declarative fields exactly (the projection is deterministic, so a faithful restore resolves
   again), or keep the prior version registered under its id and give the edit a new one. An
   escape hatch that lets a drifted instance decline or expire was declined: it reopens the
   write-under-wrong-rules problem the gate exists to close.

## 1. The outcome

At every operator seam that resolves a persisted record's profile, resolution HOLDS the profile
only if both are true: the record's `profileId` is registered in this instance, and the
registered profile's data-only projection digests to the record's genesis `profileDigest`.
Otherwise the seam refuses `{ status: 'refused', code: 'unknown-profile', class: 'refusal' }`
with no `transitionRef`: never-append, result-first, the record and its chain unchanged.

The check runs at the profile-resolution step each seam already has — after the chain load,
`verifyChain`, and `signatureLayerHolds`, and before the state/expiry rung and every rung after
it. A tampered chain therefore still refuses `chain-compromise` (and appends its evidence edge
where the state admits one) before drift is ever considered; a due-expired record under a
drifted profile refuses `unknown-profile` and does not expire.

## 2. Producers and exact conditions

Eleven sites, one helper. `ResolvedProfile` (`create.ts`) gains `profileDigest: Digest`, computed
once per profile at `create()` by the existing `profileDigest()`; `kernel/open.ts` reads it
instead of digesting per call (byte-identical output, proved by the frozen byte-stability pins
not moving). A shared helper, `heldProfile(profiles, record)`, returns the `ResolvedProfile`
when the id is registered and `resolved.profileDigest === record.profileDigest`, and `undefined`
otherwise. It replaces the bare `profiles.get(record.profileId)` at:

- **The eight operator seams**, each keeping its own refusal wrapping and its `unknown-profile`
  code: `finalize` (`kernel/finalize.ts`), `decline` (`kernel/decline.ts`), `raiseFinding` and
  `acknowledge` (the shared prologue in `kernel/findings-seams.ts`), `redeem`,
  `beginRedemption` and `completeRedemption` (the shared prologue in `kernel/redeem.ts`), and
  `seal` (`kernel/seal.ts`).
- **The two cross-record verifications**, folding a mismatch on the REFERENCED record into
  their own claim refusal, as the missing-signature posture already does (OPEN-QUESTIONS §1):
  `verifyPriorLegs` (`kernel/prior-legs.ts`) refuses `prior-leg-unverified` when a prior
  leg's record binds a `profileDigest` other than the successor's resolved profile's — the
  flow's separation-of-duties rules live in the profile, and a flow decided under two versions
  of them is not decided under rules-as-they-were; `verifySupersedes` (`kernel/supersedes.ts`)
  refuses `supersedes-unverified` when a `confirmed` predecessor's terminality must be derived
  from its profile and that profile is not held — the same "terminality unprovable — fail
  closed" arm it has today, with "resolves" tightened from id to id-and-digest. A predecessor
  in a state terminal regardless of profile (`refused`, `expired`, `declined`, `redeemed`,
  `redemption-failed`) is unaffected: its profile is not consulted today and is not consulted
  after.

- **`open()`'s exclusivity path** (`kernel/open.ts`, the C1 gated expire-then-retry) — found
  while writing the plan, after the grant, and the reason for site 14 below. Before
  `resolveDueClock` reads the live profile's windows to expire a due blocker en passant, the
  blocker's genesis `profileDigest` must equal the resolved profile's; otherwise the blocker
  stands and `open()` refuses `record-exists` — the code it already speaks for a blocker it may
  not resolve (a `redeeming` one). Without this, a drifted instance would decide the blocker's
  expiry under the wrong `ttl` and write an `expired` edge into a record it does not hold — the
  exact write ruling 2 forbids. A drifted instance therefore un-strands nothing; the versioning
  route does, because the exclusivity pair is keyed by profile id and a new id is a new pair.

`open()`'s genesis mint is untouched: the genesis is being minted from the live profile and
there is no bound digest to compare. `stage()` is untouched for the same reason.

## 3. What stays as it was

- **Reads never refuse.** `review`, `getRecord`, `replay`, `verifyChain`, `readChain`,
  `chainHead`, `listDue` and `verifySignatures` answer as they do today;
  `verifySignatures(recordId).genesisProfile` remains the operator's diagnostic, and now names
  exactly why a seam refused (`drifted`, with both digests) or will.
- **The throws stay throws.** Argument-intake throws and the policy presence contract keep
  their depth; a persisted `legId` absent from a held profile still throws (SPEC §8's "loud
  throw" for a garbled or foreign chain) — reachable now only through a whole-chain recompute
  that carries a consistent digest, since any same-id edit that renames a leg drifts first.
- **`unknown-profile`'s unregistered-id producer** is unchanged in every seam, including the
  `refusal-matrix.test.ts` two-instance arm that pins it.
- **The policy-drift arm for a now-non-declaring profile** (`kernel/finalize.ts`, the
  "THE DECIDED OPEN QUESTION" branch) becomes unreachable: dropping `policySource` changes the
  projection, so profile resolution refuses first. It is converted to the house
  unreachable-throw with the reason stated, so a future projection change that stopped covering
  `policySource` would fail loudly rather than silently re-open the corner. The forward
  corner's "absent bound digest" sub-case in the same file is likewise unreachable and is
  re-commented; its "both present and unequal" case — `policy-drift` proper — is untouched.
- **The byte-stability pins do not move.** No payload changes; the cached digest is the same
  function over the same projection.

## 4. Registry: 25 stays 25

No code is minted or retired. One core-registry row's producer text widens (§8 below). The
never-appends set is unchanged in membership and definition — `unknown-profile` is already in
it — so none of the three places that define the set are touched.

## 5. Interactions, all falling out of existing machinery

- **Both §10.3 cross-instance corners are pre-empted.** A same-id profile adding or dropping
  `policySource` is a profile drift, so both directions refuse `unknown-profile` at resolution;
  `policy-drift` becomes purely "both digests present and unequal". OPEN-QUESTIONS §2's
  fail-close decision stands, delivered one step earlier by a different code — a self-authored
  inversion of the recorded form, numbered in the status record (§9).
- **The signing flip is closed on the configuration route.** A same-id profile that dropped
  `signing: true` cannot finalize, decline, take findings, redeem or seal a signing record, and
  cannot append an unsigned edge into its chain. `signingDeclared` is still computed from the
  live profile, but that computation no longer reaches a seam that could act on it.
- **Expiry and exclusivity.** A drifted profile's open records do not expire and hold their
  `(profile, subject)` pair — at the decision seams, which refuse before their clock rung, and
  at `open()`, whose blocker path leaves a blocker it does not hold standing (`record-exists`).
  Ruling 3 above accepts this and names the two recovery routes; the guide and SPEC §4 state
  it plainly, and SPEC §4's en-passant rule gains the exception (site 14).
- **Multi-leg flows** are decided under one profile version: a successor leg opened after an
  in-place edit refuses `prior-leg-unverified`; the host re-runs the flow under the new version
  (the prior leg's `confirmed` record is terminal and is not stranded).
- **Probes.** No probe this increment: a `profile-drift-refuses` probe would need a new target
  sentence in CONTROLS §4's list, which is a sealed touch this document does not request. The
  behavior is pinned by the suite; the probe is a candidate for a later increment.

## 6. Honest bounds (stated wherever the capability is documented)

- **The recompute route stays open at AL1.** A storage-writing insider who rewrites the
  genesis `profileId` AND its `profileDigest` consistently onto a registered non-signing
  profile produces a chain that resolves as `matches`, and the signature layer does not apply
  to it. That is the rehoming residual proper (catalogue item 60); this gate closes the
  configuration route the review took, and only signing-only registration or AL2 key custody
  closes the recompute route. The same insider defeats the policy gate by editing the genesis
  `policyDigest` too — SPEC §10.3 already says so; the amended text names both digests.
- **A stranded record is a stated cost, not a defect.** It is the enforcement of the version
  discipline the concept already asked for.
- **The report, not the refusal, says why.** `unknown-profile` does not distinguish "not
  registered" from "registered, drifted"; `verifySignatures(recordId).genesisProfile` does.

## 7. Cuts, recorded per anti-goal #4

- **No new refusal code** (ruling 1). Recoverable by minting `profile-drift` later; the
  producer text in §8 already isolates the condition, so a future split is a row move.
- **No escape hatch** for a drifted instance (ruling 3). Recoverable as a sanctioned change to
  the never-append posture; not recommended.
- **No `genesisProfile` on `review()`'s view.** The report carries it; adding it to the
  review view is a surface change with an api-reference obligation, deferred until a host asks.
- **No probe** (§5).

## 8. Sanction requested (the exact sealed-set touches, licensed only by a fresh grant)

Fourteen sites — thirteen granted 2026-09-03, and a fourteenth found while writing the
implementation plan, for which a RE-GRANT is requested (site 14; its status line is below the
grant). Each is given as current text and proposed text so the landed sealed text can be diffed
against this section verbatim before the increment exits.

**Site 1 — SPEC §8, core registry, the `unknown-profile` / `unknown-leg` row.**
Current: "unknown identifiers fail closed and never append; `unknown-leg` has two producers — a
caller-named leg absent from the profile at `stage()`, and a staged draft's leg absent from the
profile it resolves under at `open()`".
Proposed: "unknown identifiers fail closed and never append. `unknown-profile` has two producers
— a `profileId` this instance does not register, and, at every seam that resolves a persisted
record, a registered same-id profile whose data-only projection does not digest to the record's
genesis `profileDigest`: the instance does not hold the profile the record was opened under
(§4). `unknown-leg` has two producers — a caller-named leg absent from the profile at
`stage()`, and a staged draft's leg absent from the profile it resolves under at `open()`".

**Site 2 — SPEC §4, the `profileDigest` paragraph.**
Current ends: "so the record notarizes the shape of the flow it was decided under; drift in the
governing profile is detectable on replay."
Proposed ends: "so the record notarizes the shape of the flow it was decided under; drift in the
governing profile is detectable on replay, and refused at the seams: an instance whose
registered same-id profile does not digest to the bound `profileDigest` does not hold the
profile the record was opened under, and every operator seam that resolves the record —
finalize, decline, the findings seams, the redemption seams, seal — refuses `unknown-profile`
(§8) at profile resolution, never-append and ahead of every ladder rung, so a drifted instance
writes nothing into the record, expires nothing en passant, and cannot leave an unsigned edge in
a signing chain (§14); the two cross-record verifications (§10.1, §2) fold the same mismatch on
the referenced record into their own claim refusals. Recovery is the version discipline the
`id` field names (§9.1): restore the profile's declarative fields exactly — the projection is
deterministic, so a faithful restore resolves again — or keep the prior version registered under
its id and give the edit a new one. A stranded open record is the cost of deciding only under
the rules the record binds, and it is stated here rather than softened."

**Site 3 — SPEC §9, the pre-ladder paragraph.**
Current: "so against a tampered chain the call refuses `chain-compromise`, and against an
unconfigured profile `unknown-profile`, before the policy throw can fire (§10.3)."
Proposed: "so against a tampered chain the call refuses `chain-compromise`, and against a
profile this instance does not hold — unregistered, or registered under the record's id with a
binding other than the genesis `profileDigest` (§4) — `unknown-profile`, before the policy
throw can fire (§10.3)."

**Site 4 — SPEC §10.3, the "one coherent corner" sentence.**
Current: "One coherent corner stays a **refusal**, not a throw: a record opened under a
non-declaring profile and later finalized under a same-id instance that *does* declare
(cross-instance config drift) has no bound `policyDigest`; the gate treats a present live
digest against an absent bound one as a mismatch and refuses `policy-drift`, fail-closed, since
the record is coherent evidence of a real prior decision."
Proposed: "The cross-instance corner never reaches this gate: a record opened under a
non-declaring profile and later finalized under a same-id instance that *does* declare binds a
genesis `profileDigest` the live profile does not digest to (`policySource` is a declarative
field), so profile resolution refuses `unknown-profile` first (§4, §8) — fail-closed,
never-append — and `policy-drift` is left purely "both digests present and unequal"."

**Site 5 — SPEC §10.3, the "reverse cross-instance direction" paragraph.**
Current, whole paragraph: "**The reverse cross-instance direction is permissive at AL1 — a
named, open decision.** The gate keys on the **finalize-time** profile, so a record opened under
a *declaring* profile then finalized under a same-id *non-declaring* instance **skips the
gate**: nothing compares the bound digest to a live source, and the decision confirms. This
requires a same-id profile *dropping* `policySource` between open and finalize (a
version-discipline violation, off the honest path), and `profileDigest` is recorded at open and
replayed, so the config flip is auditable after the fact. Whether to fail-close this direction
in code is a named open decision (`OPEN-QUESTIONS.md` — the recommendation on record is
fail-close). Relatedly, for a single-leg record the bound `policyDigest` lives in the
sole-genesis (head) payload, inside the §0/§5 head-bound blind window — a storage-writing
insider who edits that genesis `policyDigest` to match the drifted live policy defeats the gate.
Both are the policy-gate analogs of §10.1's SoD-evidence window; detached signing (AL2, §14) is
the named closure."
Proposed, whole paragraph: "**The reverse cross-instance direction refuses too, one step
earlier.** A record opened under a *declaring* profile then finalized under a same-id
*non-declaring* instance is a profile drift — the same-id profile *dropped* `policySource`, a
version-discipline violation off the honest path — and profile resolution refuses
`unknown-profile` (§4, §8) before this gate runs. This direction was once permissive, its
fail-close was decided on record (`OPEN-QUESTIONS.md` §2), and the profile-binding refusal now
delivers it. For a single-leg record the bound `policyDigest` and `profileDigest` both live in
the sole-genesis (head) payload, inside the §0/§5 head-bound blind window — a storage-writing
insider who edits that genesis to match the drifted live policy and profile consistently
defeats both gates. This is the policy-gate analog of §10.1's SoD-evidence window; detached
signing (AL2, §14) is the named closure."

**Site 6 — SPEC, the maturity legend's example.**
Current: "a separately named open decision about its *future revision* (§10.3's reverse
cross-instance direction, §12's pre-1.0 signature freeze) does not lower it."
Proposed: "a separately named open decision about its *future revision* (§12's pre-1.0
signature freeze) does not lower it."

**Site 7 — SPEC §10.1, the prior-leg verification enumeration.**
Current: "the chain must verify intact, its recomputed head must equal the supplied
`chainHead`, and the replayed record must share the successor's `profileId` and `subjectRef`,
sit at the expected leg in order, and be `confirmed`."
Proposed: "the chain must verify intact, its recomputed head must equal the supplied
`chainHead`, and the replayed record must share the successor's `profileId` and `subjectRef`,
bind the same `profileDigest` the successor's resolved profile digests to (§4 — a flow is
decided under one version of its rules), sit at the expected leg in order, and be
`confirmed`."

**Site 8 — OPEN-QUESTIONS §1, the granularity bullet's decided tail.**
Current ends: "a profile flipping the field is the version-discipline violation SPEC §2's
convention names."
Proposed ends: "a profile flipping the field is the version-discipline violation SPEC §2's
convention names. **Amended (this build, the profile-drift gate):** the violation now refuses
rather than downgrading — a same-id profile whose data-only projection differs from a record's
genesis `profileDigest` (`signing` is a covered field) refuses `unknown-profile` at every seam
that resolves the record (SPEC §4, §8); what remains is the recompute route, a rewritten
genesis carrying a consistent digest, which only signing-only registration or AL2 key custody
closes."

**Site 9 — OPEN-QUESTIONS §2, a superseded tail.**
Appended after the existing "**Decided (this build):** … refuses `policy-drift` rather than
skipping the gate." sentence: "**Superseded (this build, the profile-drift gate):** both
cross-instance directions now refuse `unknown-profile` at profile resolution (SPEC §4, §8) — a
same-id profile adding or dropping `policySource` is a profile drift — so the `policy-drift`
arm for a now-non-declaring profile is unreachable and the code says so; the decision stands as
fail-close, delivered one step earlier."

**Site 10 — CONTROLS, the policy-drift notarization row's honest-bound cell.**
Current: "Notarizes, never evaluates; reverse cross-instance direction is a named open
decision; genesis-head AL1 window".
Proposed: "Notarizes, never evaluates; both cross-instance directions refuse `unknown-profile`
at profile resolution (a same-id profile change is a profile drift, SPEC §4); genesis-head AL1
window".

**Site 11 — CONTROLS §2 (KERNEL), one new row after "Content binding".**
Proposed: "| Profile binding | `profileDigest` over the profile's data-only projection at
genesis; every seam that resolves the record refuses `unknown-profile` unless the registered
same-id profile digests to it (SPEC §4, §8) | PROVEN | Decided-under-rules-as-they-were, by
configuration only: a rewritten genesis carrying a consistent digest (the recompute route)
passes at AL1 — AL2 or signing-only registration closes it; a stranded open record is the stated
cost of an in-place profile edit |". A reviewer may hold that the existing `profileDigest`
prose suffices and decline this row; the design asks for it because a control that now refuses
belongs in the table the tier test placed it in.

**Site 12 — GLOSSARY, the `profileDigest` entry.**
Current ends: "what makes governance drift detectable on replay (SPEC §4)."
Proposed ends: "what makes governance drift detectable on replay — and, since the
profile-drift gate, refused at every seam that resolves the record (`unknown-profile`, SPEC §4,
§8)."

**Site 13 — DECISIONS.md #5.**
Current reason: "— Config drift becomes detectable on replay without hashing unhashable
closures."
Proposed reason: "— Config drift becomes detectable on replay without hashing unhashable
closures, and is refused at every seam that resolves the record (`unknown-profile`, SPEC §4,
§8)."

**Site 14 — SPEC §4, the en-passant rule's "Named exceptions" sentence (RE-GRANT REQUESTED).**
Current: "Named exceptions to this expire-at-every-mutating-seam rule: `seal()` never appends a
clock edge en passant — a record whose bound has elapsed refuses `unsealable-state`, and the
operator sweeps first, then seals (§5); `redeem()` does not treat a due-`open` record as
expired — it refuses `unredeemable-state` without writing an edge (a due-`confirmed` or
due-`redeeming` record it does resolve en passant, §11.2); and `open()`'s exclusivity check
never auto-resolves a `redeeming` blocker, due or not — it refuses `record-exists`, leaving
that edge to the redemption seam's own clock (§9.1, §11.2)."
Proposed: the same sentence with a fourth exception appended before its final period: "; and no
mutating seam appends a clock edge to a record whose profile this instance does not hold (the
`profileDigest` binding, below) — the decision, findings, redemption and seal seams refuse
`unknown-profile` at profile resolution, ahead of their clock rung, and `open()`'s exclusivity
check leaves a due blocker whose binding its resolved profile does not match standing, refusing
`record-exists`". Why it is a site: the sentence enumerates the exceptions to a rule, and the
gate adds one; left as written, the enumeration is false by omission — the blast-radius lesson
the earlier sanctions recorded.

**Not touched, said plainly so a reviewer can disagree:** SPEC §8's `record-exists` row ("a
non-terminal record already exists for this `(profile, subject)`; never appends" stays true of a
blocker this instance cannot resolve); SPEC §2's recovery paragraph ("requires
it intact and terminal" stays true; the tightened resolution sits inside the confirmed-state
terminality derivation the paragraph already delegates); SPEC §8's caller-error paragraph (its
parenthetical "An unknown *profile* is the exception — it is a fail-closed `unknown-profile`
refusal" stays true of both producers); the never-appends list and its three definitions
(membership unchanged); SPEC §14 (the rehoming residual is not named there today and this
document does not introduce it); `ARCHITECTURE.md` line 179 ("`chain-compromise` and
`unknown-profile` precede it" stays true); CONTROLS §4's probe target list (no probe this
increment); `CONCEPT.md` (not a fork, argued above).

**Markers:** none move. Recorded in `docs/process/implementation-status.md` and `CLAUDE.md` as a
sanctioned corrective-and-widening edit in the sealed-set lineage, beside the earlier sanctioned
corrective edits, distinct from the ten marker-bearing commits.

**Grant status: GRANTED 2026-09-03, SPENT at this increment's exit** by the maintainer, in
session, on the words "granted as written, continue" given in answer to the explicit
grant-or-withhold question on this document
(the question named sites 7 and 11 as the two a reviewer might withhold; neither was). The grant
licenses exactly sites 1–13 above and nothing else, and is spent when the increment exits.

**Site 14: RE-GRANT REQUESTED 2026-09-03**, found while writing the implementation plan (the
`open()` blocker path is a write into an existing record that the design's seam list did not
name). Its answer is recorded here on the maintainer's words when given; until then the
sealed-set commit of this increment lands sites 1–13 only, and site 14's sentence is left as
written and named in the record as false by omission.

## 9. Tests

**New pins, red first — `packages/record/test/profile-drift-gate.test.ts`.**

- Each of the eight seams refuses `unknown-profile`, `class: 'refusal'`, no `transitionRef`,
  chain byte-identical before and after, under a same-id sibling instance sharing the store
  whose profile differs by one declarative field — in two shapes: the review's route (a
  signing profile's record, the sibling's profile without `signing`, the sibling without
  `config.signing`), and a benign `ttl` edit. `verifySignatures(recordId).genesisProfile`
  reads `drifted` on the sibling in both.
- Depth: a hash-broken chain under a drifted sibling refuses `chain-compromise` and appends
  its evidence edge (rung (1) precedes resolution); a due-expired record under a drifted
  sibling refuses `unknown-profile` and its chain shows no `expired` edge (the stranding,
  pinned as behavior).
- Recovery: a sibling whose profile restores the declarative fields exactly finalizes the
  record; an instance registering the prior version under its id and the edit under a new id
  finalizes a record of each.
- Cross-record: a successor `open()` whose prior leg's record was opened under a since-edited
  same-id profile refuses `prior-leg-unverified` with no record created; a recovering `open()`
  whose `confirmed` predecessor's profile has drifted refuses `supersedes-unverified`; a
  recovering `open()` over a `declined` predecessor under a drifted profile succeeds (its
  terminality needs no profile).
- The blocker path: a due `open` blocker under a drifted sibling refuses `record-exists` at
  `open()` and the blocker's chain gains no `expired` edge; the same subject staged under a NEW
  profile id opens at once (the versioning route un-strands new work).
- The cached digest: `open()`'s genesis `profileDigest` equals `profileDigest(profile)` (the
  existing `profile-drift-report.test.ts` export pin already asserts this and must stay green),
  and the frozen `byte-stability.test.ts` pins do not move.

**Inversions, each argued at its site in the test file and counted in the status record.**

- `policy-drift.test.ts`, "THE DECIDED OPEN QUESTION: a bound record under a non-declaring
  instance refuses policy-drift": the code becomes `unknown-profile`. **The thirteenth
  self-authored inversion** in the status record's numbered sequence: OPEN-QUESTIONS §2's
  decided FORM (refuse `policy-drift`) is superseded; fail-close is kept and delivered one step
  earlier. The test's name and comment say so.
- `policy-drift.test.ts`, "the forward cross-instance corner": the code becomes
  `unknown-profile`, same reason (not separately numbered — one inversion, two pins).
- `multi-leg.test.ts`, the same-id RENAMED-maker separation-of-duties test: `sod-violation`
  becomes `unknown-profile`. The renamed-leg shape can no longer pass resolution, so the
  property that test used the shape to show — the SoD lookup keys recorded legIds, not live
  positions — is unobservable through the public surface; the implementation is unchanged and
  the test's comment records why the vehicle changed.
- `profile-drift-report.test.ts`: the two "finalizes" bound pins become `refused` /
  `unknown-profile`, and the file header's "the day it moves" sentence is rewritten in the past
  tense naming this increment.
- Any other red in the whole suite is a bug, not an inversion, and is fixed as one.

**Gate-order corpus.** No new rung, so `finalize-check-order.test.ts`'s adjacent-pair set is
unchanged; the two depth pins above are the order evidence for the resolution step.

## 10. Records and guide (the same commits)

- `docs/guide/api-reference.md`: the refusal table's `unknown-profile` / `unknown-leg` row
  ("Pre-record resolution failures (never append)") gains the second producer; the
  `genesisProfile` paragraph loses "nothing refuses on drift" and gains the refusal and the two
  recovery routes; the Verifier/genesis paragraphs' "recorded residual" wording is updated.
- `docs/guide/integrating.md`: the AL2 bullet added on 2026-09-03 ("nothing refuses, by
  recorded decision, until a sanctioned change says otherwise") becomes the refusal statement;
  the "Profile design" section gains the in-place-edit cost and the two recovery routes.
- `docs/guide/concepts.md`: "Detectable, not refused — a drifted profile gates nothing today"
  becomes the refusal statement.
- `CHANGELOG.md`, Changed: the behavior, the sealed-set edit named as such, the inversions.
- `docs/process/implementation-status.md`: the twenty-third post-build-order section, the
  measured bullet, the thirteenth self-authored inversion, and the lineage note (a sanctioned
  corrective-and-widening edit, no marker move); `CLAUDE.md`: the count and the lineage
  sentence.
- `docs/process/next-phases.md`: the sanction-gated list's fourth entry (fail-closing a
  drifted genesis profile) moves out as DECIDED with the grant's date; the first entry's
  cross-reference is unchanged.
- `docs/process/open-items-plan.md`: the rehoming-residual bullet says the configuration route
  is closed by this increment and the recompute route remains for the 1.0 review.
- `docs/superpowers/INDEX.md`: this spec and its plan, and the counts.
- No deferral-register row.

## What this does not claim

- Not that AL2's rehoming residual is closed. The recompute route is open at AL1 and stays
  named as such (catalogue item 60, `open-items-plan.md`).
- Not that a host can tell "unregistered" from "drifted" by the refusal alone. The report does.
- Not that an operator's in-place profile edit is safe. It strands the profile's open records
  until restored or versioned; the guide says so in the section where profiles are designed.

## Process

- **Order of commits, one increment:** (1) the behavior — `ResolvedProfile.profileDigest`, the
  helper, the ten sites, the unreachable-throw conversion, the new test file red then green,
  the four inversions argued and flipped; (2) the sealed-set edits at exactly the thirteen sites
  of §8, plus the guide and CHANGELOG, in one commit so the grant is spent whole; (3) the
  record. The behavior may not merge without (2): the SPEC would otherwise describe a refusal
  the code does not make and a permissiveness the code no longer has.
- **Gates at each commit:** `pnpm test:ci` with `ci-assert-tests`, `pnpm typecheck`,
  `biome check --error-on-warnings .`, `contract-scan`, `api-sync`, `docs-index-sync`.
- **Exit check:** diff the landed sealed text against §8 of this document verbatim
  (whitespace-collapsed), per the sealed-set discipline.
