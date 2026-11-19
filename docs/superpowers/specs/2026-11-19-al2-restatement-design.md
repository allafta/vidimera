# The AL2 restatement, first commit — design

**Date: 2026-11-19.** A corrective edit to the sealed set under call 3 of
`docs/analysis/2026-11-17-sanction-calls.md` ("restating AL2 with its conditions: GRANTED"),
its first of at most two sealed-set commits. No maturity marker moves, no scope changes, no
code behavior changes. The grant's order is kept: call 1's increment (verifier faults) has
landed; call 2's (the transactional sidecar) has not.

## 1. What this increment answers

The sealed set states AL2's closure without the conditions the build depends on. SPEC §13A
says the recompute and head-edit residuals "close at AL2"; §14's AL2 bullet says it "closes
the recompute residual and the genesis-head blind windows". CONTROLS' profile-binding row and
OPEN-QUESTIONS §1's amended paragraph each offer AL2 key custody as a closure of the
recompute route on its own. Three conditions hold the closure up, and the sealed set states
only the second — explicitly in CONTROLS' AL2 row and CONCEPT.md's honesty discipline, and in
substance in ASSURANCE §6's AL2 and AL3 rows and SPEC §14's closing paragraph:

- **(i) Every profile the instance registers signs.** The signature layer's obligation keys
  on the profile the instance holds for a record, which is the genesis's own `profileId` and
  `profileDigest` claims. A storage-writing insider who rewrites a signing record's genesis
  onto a co-registered non-signing profile, carrying that profile's genuine digest, and
  relinks the chain takes the record out of the layer. Version discipline (SPEC §9.1) leaves
  exactly such an unsigned twin registered while signing is enabled for an existing flow.
- **(ii) The key sits outside the insider's boundary.** A key holder signs whatever chain it
  writes.
- **(iii) No signature outlives an uncommitted append.** The signing decorator writes a
  transition's sidecar entry before it delegates the append, outside the append's atomic
  unit. A rolled-back enlisted append, or one that lost its compare-and-swap, leaves a valid
  signature over a transition that never committed; entries correlate to the chain by
  digest, so a key-less insider who splices that transition in where it was signed for is
  not caught.

## 2. Goals, non-goals, anti-goals

- **Goal.** Every sealed sentence the grant names states the conditions as they stand on this
  tree, and each condition the code exhibits is pinned on behavior first, so the sealed text
  describes what the code does rather than what an analysis said.
- **Goal.** The guide states the same conditions where it states AL2's guarantee.
- **Non-goal.** Closing any condition. Condition (iii) narrows when call 2's increment lands,
  and the grant's second commit restates it then. Condition (i) stays as the trade call 3
  records (an instance-level signing policy was declined).
- **Anti-goal.** Widening any claim, or touching any sentence outside the grant. An edit that
  reads more broadly than what the code does, or a sentence outside the named sites, fails
  this increment even if it is true.

## 3. Constraints

- The grant's sites only (call 3.1): SPEC §13A's closing sentence on AL2 and §14's AL2
  bullet; CONTROLS' profile-binding row and any CONTROLS or ASSURANCE sentence stating the AL2
  closure unconditionally; OPEN-QUESTIONS §1's amended paragraph; GLOSSARY or DECISIONS only
  where a sentence there repeats an unconditional closure (none does — checked, §6).
- One sealed-set commit, containing only `docs/concept/` changes.
- No `[PROVEN]`/`[DESIGNED]`/`[SKETCHED]` token moves.
- CONCEPT.md's principles and honesty discipline are untouched.

## 4. Approaches

- **(a) Condition each sentence in place, pinned first (chosen).** Each site keeps its claim
  and gains its limit in the same breath; SPEC §14 states the three conditions whole, and
  the downstream sites state the ones that bind them and cite §14. A new test file pins
  (i) and (iii) as behavior before the sealed commit lands.
- **(b) State the conditions once in SPEC §14 and replace the other sites with a pointer.**
  Shorter, but it removes each downstream sentence's own limit, which the honesty discipline
  forbids ("every guarantee stated with its limit in the same breath").
- **(c) Restate without pins, from the sanction calls' text.** Faster, but a sealed sentence
  would then rest on an analysis rather than on behavior measured in this tree.

## 5. The pins (`packages/record/test/al2-conditions.test.ts`)

Both run over a SQLite backing with an Ed25519 key, a shared sidecar, and the insider's writes
made straight to the tables.

- **Condition (i).** A confirmed signing record whose recorded decider is forged and whose
  chain is relinked refuses `chain-compromise` at `seal` (baseline: the layer applies). The
  same forgery with the genesis rewritten onto a co-registered non-signing profile and its
  digest copied from a genuine genesis: `verifySignatures` reports `signingDeclared: false`
  and an unverified transition, and `seal` retires the record. An instance registering only
  the signing profile refuses the rehomed record `unknown-profile` and appends nothing.
- **Condition (iii).** A signing effect-seam record is confirmed; the host enlists `redeem`
  in a SQLite transaction and rolls it back. The chain is unchanged and the `redeemed`
  transition's digest is among `verifySignatures(...).orphans`. Spliced back in, unsigned and
  unrecomputed: AL1 is intact, every transition reports signed and verified, the record
  replays `redeemed`, and `seal` retires it. Contrast: the same transition fabricated onto
  another record carries no signature and `seal` refuses `chain-compromise`.

Measured on this branch before any sealed edit: both pass.

## 6. The sealed-set edits (the exact sentences)

Each site: the current text, then the proposed text. Checked mechanically at exit: every
Proposed text present, every Current text absent.

**Site 1 — SPEC §13A, the closing sentence on AL2.**

Current:

> The first two residuals close at AL2; detached signing (AL2, §14) is the
> upgrade for those, stated with the absence caveat.

Proposed:

> The first two residuals close at AL2 under the three conditions §14
> states — every profile the instance registers signs, the key sits outside the insider's
> boundary, and no signature outlives an uncommitted append, which this build's
> sign-before-append order does not yet meet; detached signing (AL2, §14) is the upgrade for
> those, stated with the absence caveat and those conditions.

**Site 2 — SPEC §14, the AL2 bullet.** The sentence "it closes the recompute residual … without
trusting storage." gains the conditions; the bullet's other sentences are unchanged.

Current:

> it closes the
> recompute residual and the genesis-head blind windows (§13A, §10.1, §10.3), because a
> rebuilt or head-edited chain fails signature verification without trusting storage. Signing

Proposed:

> it closes the
> recompute residual and the genesis-head blind windows (§13A, §10.1, §10.3), because a
> rebuilt or head-edited chain fails signature verification without trusting storage — under
> three conditions, each a limit of the closure. (i) **Every profile the instance registers
> signs:** the layer applies to a record through the profile its genesis names, so a
> storage-writing insider who rewrites a signing record's genesis onto a co-registered
> non-signing profile, carrying that profile's genuine digest, takes the record out of the
> layer — and version discipline (§9.1) leaves exactly such an unsigned twin registered while
> signing is enabled for an existing flow. (ii) **The key sits outside the insider's
> boundary:** a key holder signs whatever chain it writes. (iii) **No signature outlives an
> uncommitted append:** this build signs a transition before it appends it, outside the
> append's atomic unit, so an append that is rolled back or loses its compare-and-swap leaves
> a valid signature over a transition that never committed, which a key-less insider can
> splice in where it was signed for. Signing

**Site 3 — CONTROLS §2, the Profile binding row's honest bound.**

Current:

> a rewritten genesis carrying a consistent digest (the recompute route) passes at AL1 — AL2 or signing-only registration closes it;

Proposed:

> a rewritten genesis carrying a consistent digest (the recompute route) passes at AL1 — only signing-only registration under AL2, with the key outside the insider boundary, closes it: AL2 alone leaves a genesis rewritten onto a co-registered non-signing profile outside the signature layer (SPEC §14);

**Site 4 — CONTROLS §3, the Effect-result notarization row's honest bound.**

Current:

> AL2 signing closes the window early |

Proposed:

> AL2 signing closes the window early, under SPEC §14's conditions — a redemption the host rolls back leaves a valid signature over a `redeemed` transition that never committed (condition (iii)) |

**Site 5 — CONTROLS §3, the AL2 detached signing row's honest bound.**

Current:

> Closes the recompute + head-edit residuals **when the key is outside the insider boundary** |

Proposed:

> Closes the recompute + head-edit residuals **when the key is outside the insider boundary, every registered profile signs, and no signature outlives an uncommitted append** (SPEC §14) — this build signs before it appends, so the last does not yet hold |

**Site 6 — ASSURANCE §2, the sentence closing both blind windows.** Condition (iii) does not
reach these two windows. Each is an edit of a genesis *payload* (`priorLegActors`,
`policyDigest`). The one path that signs two different geneses for one record — `open()`'s
expire-then-retry, which re-stamps the retry when the clock has moved — keeps the payload and
varies only `at`, so no orphan genesis carries a different payload. The sentence therefore
states (i) and (ii). (Corrected after the whole-branch review: this paragraph first argued that
a never-committed genesis belongs to a record id never created. That is false — see §10.)

Current:

> Both are honestly documented at AL1, and both are closed by the same upgrade: a signed
> genesis fails verification when its payload is edited, head or not.

Proposed:

> Both are honestly documented at AL1, and both are closed by the same upgrade: a signed
> genesis fails verification when its payload is edited, head or not — while every profile
> the instance registers signs and the key sits outside the insider's boundary (`SPEC.md`
> §14).

**Site 7 — ASSURANCE §6, the AL2 row's "Closes" cell.**

Current:

> the recompute residual; both §2 blind windows; admits authority timestamps (freshness becomes meaningful)

Proposed:

> the recompute residual and both §2 blind windows, under `SPEC.md` §14's conditions — every registered profile signs, the key sits outside the insider's boundary, and no signature outlives an uncommitted append (this build's sign-before-append order does not yet meet the last); admits authority timestamps (freshness becomes meaningful)

**Site 8 — OPEN-QUESTIONS §1, the amended Granularity paragraph's last clause.**

Current:

> what remains is the
>   recompute route, a rewritten genesis carrying a consistent digest, which only signing-only
>   registration or AL2 key custody closes.

Proposed:

> what remains is the
>   recompute route, a rewritten genesis carrying a consistent digest, which only signing-only
>   registration with the AL2 key outside the insider's boundary closes — key custody alone
>   leaves a genesis rewritten onto a co-registered non-signing profile outside the signature
>   layer (SPEC §14's first condition).

**GLOSSARY and DECISIONS.** Checked: neither repeats an unconditional closure. GLOSSARY's
ladder entry names the levels only; DECISIONS mentions AL2 once, as what makes freshness
meaningful. No edit.

**Found outside call 3's grant.** Ten sentences state the closure without its conditions and
sit outside the sentences call 3 names, so the first sealed commit left them (call 3: "anything
outside these sentences needs a new sanction"):

- OPEN-QUESTIONS §1's opening scope sentence ("closes the recompute residual and both
  genesis-head blind windows").
- SPEC §5, three sentences: detached signing "makes recomputation and head-edits detectable
  without trusting storage", "makes the compromise-refusal independently trustworthy", and
  "makes an end-of-life attestation independently verifiable".
- SPEC §10.1 ("Detached signing (AL2, §14) is the named upgrade that closes this") and §10.3
  ("detached signing (AL2, §14) is the named closure").
- ARCHITECTURE §3 ("Detached signing (AL2) is the named closure for all of it") and §9's ladder
  table, the AL2 "Closes" cell.
- SCOPING-GUIDE §5's "The insider-recompute threat closes at **AL2 signing**."
- CONCEPT.md §5's honesty-discipline bullet ("AL2 is insider-resistant (when the key is outside
  the insider boundary)"), which states condition (ii) only.

The owner granted conditioning them on 2026-11-19; the second sealed commit does, §11. Two
near-misses make no closure claim and stay: OPEN-QUESTIONS §1's "Motivating context" (it reports
that the two windows "both name AL2 as their closure", which they still do) and SPEC §0's
"detached signing is the documented upgrade". (The first draft of this list counted six and
held seven, and missed SPEC §5's three; the whole-branch review found both, §10.)

## 7. The guide (same increment, after the sealed commit)

- `docs/guide/concepts.md`, the AL2 bullet: the three conditions, briefly.
- `docs/guide/integrating.md`: the "raises the bar" bullet states (i) and (iii); the enabling
  paragraph says the unsigned twin it tells the reader to keep registered is condition (i)'s
  gap while it stays registered; the orphan bullet says an entry over an attempted, never
  committed transition is inert to verification but spliceable, and pruning it removes that
  route.
- `docs/guide/faq.md`: both AL2 answers state the conditions.

## 8. Records

- `docs/process/implementation-status.md`: a new section after "Verifier faults", with the
  sealed-history account — every site of both sealed commits, before and after, verbatim, as
  call 3 requires ("its exact sentences, before and after, in its design and in the status
  record's sealed-history account"), and that call 3's sanction is half spent (its second
  commit remains, for call 2's increment).
- `CLAUDE.md`'s lineage paragraph: a second sanctioned corrective edit with no marker move,
  beside the profile-drift gate; the measured counts.
- `CHANGELOG.md` `[Unreleased]`: a `Changed` entry (documentation; no behavior change).
- `docs/analysis/2026-11-17-sanction-calls.md` is not edited — it is the record of the calls,
  and the status record carries what was spent.

## 9. Exit

The full suite, typecheck, lint (`--error-on-warnings`), build, contract scan, api-reference
sync and docs-index sync are clean; the sealed commit contains only `docs/concept/` changes;
every Proposed text is present and every Current text absent; a whole-branch review on the
most capable model has read the sealed diff against the code and the pins.

## 10. Amended after the whole-branch review

A fresh review on the most capable model read the branch against the code and found the sealed
text of sites 1–8 true, no claim widened, and the grant's scope kept, with four Important
findings outside the sealed text, each fixed:

- **The site-6 rationale was false.** `open()` mints a record id once and, on an exclusivity
  conflict with a due blocker, re-stamps its retry when the clock has moved; the decorator signs
  the first attempt before its append loses, then signs the retry. So a record that IS created
  carries a valid orphan genesis (`no-edge-containment.test.ts` already pins it), and a key-less
  insider who swaps it in makes the record read as opened before its blocker expired. The sealed
  sentence stands, because the two geneses share a payload and both §2 windows are payload
  edits; the rationale is corrected in §6, and the `at`-only swap is an instance of condition
  (iii), which SPEC §14 states.
- **The outside-the-grant inventory missed SPEC §5's three sentences and miscounted** (it said
  six and listed seven). Corrected in §6.
- **The guide's new advice to unregister the old version left out its cost** — the old
  version's open records strand and its terminal records lose verified `supersedes` recovery —
  and contradicted the same page's "Profile design". The guide now states the trade.
- **The status record paraphrased the sealed sentences** where call 3 asks for them verbatim.
  It now carries every pair.

Minor findings fixed in the same wave: §1 now says where condition (ii) was already stated in
substance; the guide and the pin's comment say the rehoming digest is computable with the
exported `profileDigest`, not only copied from a donor record; the guide says condition (i)
binds every instance acting on the records and condition (ii) every key whose verifier is
registered, retired keys included; the guide's sidecar bullet says the splice route is open
until the prune, a made splice is no longer an orphan, and an orphan may be the only trace of a
deleted head, so keep what you prune; `concepts.md` drops "exactly when"; `api-reference.md`
and `SECURITY.md` state the three conditions; the pin's title and its observation comment are
exact. One Minor is left: ASSURANCE §6 and SPEC §14 attach the three conditions to the closure
as a whole, while ASSURANCE §2 states two for the genesis windows — the underclaim direction;
call 3's second commit touches those sentences and can align them.

Found by this session while the review ran, and fixed in the same wave: `signing/decorate.ts`
called an orphan entry "harmless" three times and `signing/store.ts` and the guide's
"An implementer must tolerate orphans" paragraph called orphans safe to prune without the
splice route. Comment and prose only; no behavior changes.

**The absence residual, pinned.** The review observed that deleting a committed `redeemed`
head leaves every remaining signature verifying and lets the record be redeemed again. SPEC
§13A already names this: AL2 "verifies only what exists — absence survives it", and a restored
backup drops "recent transitions wholesale". No sealed sentence is needed. A third pin in
`al2-conditions.test.ts` measures it, and the guide states it beside the conditions.

## 11. The owner's grant: the ten sentences outside call 3

On 2026-11-19 the owner granted conditioning the sentences §6 lists outside call 3 ("granted,
condition the six too"). The list the owner read named seven; the review then found SPEC §5's
three of the same class. This commit reads the grant as covering the inventory it was given as —
every sentence outside call 3 that states AL2's closure without its conditions — and conditions
all ten, recorded here so the owner can revoke any of them. It is a separate sealed-set commit,
not one of call 3's two. No maturity marker moves.

Which conditions each site states: a site whose claim includes head edits (SPEC §5's three,
ARCHITECTURE §3 and §9, OPEN-QUESTIONS §1's opener) cites §14's three conditions; a site about a
genesis payload window (SPEC §10.1 and §10.3) states (i) and (ii), by §6's site-6 argument; the
recompute threat alone (SCOPING-GUIDE §5) states (i) and (ii), because an orphan signature
chains over the head it was signed against and cannot re-sign the transitions a recompute
rebuilds; CONCEPT.md's bullet names all three.

**CONCEPT.md, called out as the repository requires.** Site 18 sits in CONCEPT.md §5, the
honesty discipline, which CLAUDE.md says no edit may touch without being called out. This edit
lengthens one parenthetical qualifier of an existing rule. The rule itself ("Never
'non-repudiation'"), every principle and the discipline's other bullets are unchanged; it is not
a fork of the concept. It makes the bullet's claim smaller, which is the discipline applied.

**Site 9 — OPEN-QUESTIONS §1, the opening scope sentence.**

Current:

> consultations; closes the recompute residual and both genesis-head blind windows) but its
> enablement design is deliberately reserved for a dedicated decision:

Proposed:

> consultations; closes the recompute residual and both genesis-head blind windows, under the
> conditions SPEC §14 states) but its enablement design is deliberately reserved for a
> dedicated decision:

**Site 10 — SPEC §5, the AL1-bound paragraph.**

Current:

> detached signing
> (§14) is the upgrade that makes recomputation and head-edits detectable without trusting
> storage.

Proposed:

> detached signing
> (§14) is the upgrade that makes recomputation and head-edits detectable without trusting
> storage, under the three conditions §14 states.

**Site 11 — SPEC §5, the compromise edge.**

Current:

> detached signing (§14) is
> the upgrade that makes the compromise-refusal independently trustworthy.

Proposed:

> detached signing (§14) is
> the upgrade that makes the compromise-refusal independently trustworthy, under the three
> conditions §14 states.

**Site 12 — SPEC §5, chain retirement.**

Current:

> detached signing (§14) is the upgrade that makes an
> end-of-life attestation independently verifiable.

Proposed:

> detached signing (§14) is the upgrade that makes an
> end-of-life attestation independently verifiable, under the three conditions §14 states.

**Site 13 — SPEC §10.1, the SoD-evidence window.**

Current:

> Detached signing (AL2, §14) is the named
> upgrade that closes this (a signed genesis fails verification when its payload is edited, head
> or not).

Proposed:

> Detached signing (AL2, §14) is the named
> upgrade that closes this (a signed genesis fails verification when its payload is edited, head
> or not), while every registered profile signs and the key sits outside the insider's boundary
> (§14's first two conditions).

**Site 14 — SPEC §10.3, the policy-binding window.**

Current:

> This
> is the policy-gate analog of §10.1's SoD-evidence window; detached signing (AL2, §14) is the
> named closure.

Proposed:

> This
> is the policy-gate analog of §10.1's SoD-evidence window; detached signing (AL2, §14) is the
> named closure, under the same two of §14's conditions.

**Site 15 — ARCHITECTURE §3, the AL1-bound paragraph.**

Current:

> Detached signing (AL2) is the named
> closure for all of it.

Proposed:

> Detached signing (AL2) is the named
> closure for all of it, under the three conditions `SPEC.md` §14 states — every registered
> profile signs, the key sits outside the insider's boundary, and no signature outlives an
> uncommitted append (the last not yet met).

**Site 16 — ARCHITECTURE §9, the ladder's AL2 "Closes" cell.**

Current:

> the storage-writing-insider recompute residual **and** the head/sole-genesis edit windows (SoD evidence, policy binding); admits authority timestamps that make freshness gating meaningful

Proposed:

> the storage-writing-insider recompute residual **and** the head/sole-genesis edit windows (SoD evidence, policy binding), under `SPEC.md` §14's three conditions (the last, no signature outliving an uncommitted append, not yet met); admits authority timestamps that make freshness gating meaningful

**Site 17 — SCOPING-GUIDE §5, the build-vs-buy picture.**

Current:

> The insider-recompute threat closes at **AL2 signing**.

Proposed:

> The insider-recompute threat closes at **AL2 signing**,
>   while every registered profile signs and the key sits outside the insider's boundary
>   (`SPEC.md` §14).

**Site 18 — CONCEPT.md §5, the honesty discipline's "Never non-repudiation" bullet.**

Current:

> AL2 is insider-resistant (when the key
>   is outside the insider boundary);

Proposed:

> AL2 is insider-resistant (when the key
>   is outside the insider boundary, every registered profile signs, and no signature
>   outlives an uncommitted append — `SPEC.md` §14);
