# 2026-09-05 — An external code review of `ad97401`: seventeen findings against the record

**Status.** Complete on branch `review-hardening-2026-09-05`, cut from `main` at `ad97401`:
a design commit, three code commits, and the commit carrying this record with the rest of the
paperwork — `git log main..HEAD` enumerates them. Not merged and not pushed; both are owner
acts. Where behavior moved, the code landed test-first with the red observed against the
unfixed tree and quoted below; where a posture was pinned as a bound, the pin is green from
its first run and its header says so.

**How to read this.** An external reviewer read the tree at `ad97401` with every comment and
JSDoc stripped from the source and `docs/` excluded entirely, ran the project's gates and
eighteen hypothesis tests of their own, and reported seventeen findings ranked by operator
impact. The review's evidence is sound where it verified code. What it could not see was the
record — the sealed concept set, the deferral register, the 2026-08-30 catalogue
(`2026-08-30-pre-release-code-gaps.md`), the increment designs, the guide — so several
findings restate rulings already taken, and three of its recommendations would reverse a
sanctioned ruling or repeat an approach this repository measured and rejected. Every finding
was verified here against the code by execution and against the record by citation before
anything changed, then classified. The design this pass executed is
`docs/superpowers/specs/2026-09-05-review-hardening-design.md`; the owner chose its
recommended shape ("record plus the small pre-cut increment") over record-only, over opening
the finding-5.1 sanction conversation before the cut, and over reopening `createWithClock`.

## The tally

| Class | Findings | What this pass did |
|---|---|---|
| Decided and recorded before the review | 5.2, 5.4, 5.6, 5.10, 5.13, 5.14, 5.15, and three of 5.17's nits | Nothing; each section below cites where the ruling lives and names the recommendation it would have reversed |
| Recorded horizon items | 5.5 (catalogue item 38), 5.7 (catalogue item 175) | Nothing in code; 5.7's open docs half closed with one guide sentence |
| Real, sanction-gated | 5.1 | Two guide sentences (the host-side mitigation); a fifth entry on `next-phases.md`'s sanction-gated list |
| New, landed | 5.3, 5.8, 5.9, 5.11, the actionable nits of 5.17 | The review-hardening pass's three code commits |
| New, recorded elsewhere | 5.16 (deferral register row 23's inventory), 5.12 (`next-phases.md`, a post-0.1 consideration) | Recorded, not fixed |

Two of the review's factual claims did not survive verification and are named where they fall:
5.2's "impossible — ids are unique", and 5.8's reading of `proposer` as a leg name.

## 5.1 — A transient verifier failure is indistinguishable from tampering

**Verdict: correct on the code; a decided posture; the structural fix is sanction-gated; the
operational mitigation lands here.**

`kernel/verify-signatures.ts` folds a throwing or `false`-answering `Verifier` to
`verified: false`, and every one of the seven `signatureLayerHolds` sites folds that into its
own failure arm — `chain-compromise` at the five seams, the claim refusals at the two
cross-record verifications. Decided at the AL2 mint and enforce increments
(`docs/superpowers/specs/2026-08-17-al2-signing-enforce-design.md`: "any miss, unresolvable
`keyRef`, failing or THROWING" verifier reads unverified), recorded in OPEN-QUESTIONS §1's
key-custody tail ("an unresolvable `keyRef` fails closed"), restated in
`docs/process/implementation-status.md`'s §14 row (ruling 3), and documented at
`docs/guide/api-reference.md`'s "answers the literal `true`" paragraph. The key-retirement
shape the reviewer names is on record too: deferral register row 22 measured "an ordinary key
retirement — dropping a decommissioned `keyRef` from the verifier registry — puts a healthy,
untampered, sealed signing record into permanent minting", reached in ordinary operation.

What no document weighed is the transient case: a key service down for a minute marks a healthy
record compromised, and only the host's own retry discipline prevents it. The reviewer's
structural recommendation — a three-valued verifier, or a typed unavailability error, routed to
the `unavailable` outcome — would widen SPEC §8's availability-class producer list, touch §14's
AL2 bullet, and reopen OPEN-QUESTIONS §1's decided tail: a fresh pass through SCOPING-GUIDE
§§1–2, now the fifth entry on `next-phases.md`'s sanction-gated list. The cheap mitigation is
two sentences in the guide's `Verifier` paragraph, landed here: retry inside the verifier rather
than throw; keep a retired key's verifier registered for as long as any record signed under it
may be touched. The review rated this High; that rating stands for a host that has not read
those two sentences.

## 5.2 — Profile edits lock out all existing confirmed records

**Verdict: decided 2026-09-03/04 under a sanction; the recommendation would reverse it.**

This is the profile-drift gate (`docs/superpowers/specs/2026-09-03-profile-drift-gate-design.md`,
sanction granted on that document, SPEC §4 text landed at sites 1–15). Its ruling 3 is titled
"Accept the stranding as the recovery story", and it names the two recovery routes: restore
the declarative fields exactly, or keep the prior version registered under its id and give the
edit a new one. The guide says the same at `docs/guide/integrating.md`'s "Profile design" and
`docs/guide/concepts.md` ("Version your profiles; an in-place edit strands its …").

The reviewer's "keeping the old profile registered forever under the same `id` (impossible —
ids are unique)" misreads the route: the old profile stays under its OLD id unchanged and the
edit takes a NEW id. Under that route a confirmed record seals under the profile it was opened
under. The confirmed-versus-other asymmetry in `verifySupersedes` the reviewer calls
"no obvious rationale" is argued at `kernel/supersedes.ts`'s header and in the design's
§"Where the check sits": `confirmed` is the one state whose terminality is derived FROM the
profile (final leg, effect seam), so it needs the profile held; `refused`, `expired`,
`declined`, `redeemed` and `redemption-failed` are terminal regardless. Recommendation (b),
letting `seal` and `supersedes` operate on the recorded digest alone, would undo the landed
SPEC §4 sentence; (a), a version list per id, is the versioning route by another mechanism; (c)
is already the case. Nothing changed.

## 5.3 — `terminalRefusals` accepts inert and redundant codes

**Verdict: confirmed by execution; new; landed (the first code commit).**

`validateLeg` checked registry membership only. Measured this session: `validateProfile`
accepted `record-not-open`, `unknown-leg`, `record-exists`, `chain-compromise`, and a
duplicated `content-drift` without a throw. `appendsOn` consults the leg's list only after the
compromise class, the availability class, and the fixed never-appends set have each answered,
so a member drawn from the first or the third could never take effect — SPEC §9.1's "inert or
contradictory feature combinations are construction errors", the sentence the same file already
cites for a misspelled member.

One correction to the recommendation: it asks to reject `availability` too. SPEC §8 says "Two
codes are legal `terminalRefusals` members but inert" and names `leg-expired` and
`availability`; rejecting either would move sealed text. Both stay constructible, and the
boundary is pinned. The `appendsOn` unit pins in `outcome-model.test.ts` and
`refusal-matrix.test.ts` hand the pure function a leg literal listing a never-appends code and
assert it still never appends; they stay — they pin the function's override, which construction
now makes unreachable through `create()` but which remains true of the function. `NEVER_APPENDS`
is exported from `refusal-codes.ts` for the validator. Red first: three pins failing "Missing
expected exception".

## 5.4 — The deterministic clock is not reachable by consumers

**Verdict: decided; the owner declined to reopen it here.**

`createWithClock` "stays internal — it appears in no public signature, and its absence was
already a decision of record" (`2026-08-19-phase-1-api-review.md`); `create.ts` says
"Deliberately NOT a public Config field"; `docs/guide/api-reference.md` says "that absence is a
decision of record, not an omission". Catalogue item 125 closes it the same way and names the
reopening condition: a real host demand. The reviewer's argument — twenty-six of the library's
own test files import the seam, so consumers will need it — is the strongest statement of that
demand on record and is left here for the day it is weighed. Nothing changed.

## 5.5 — `finalize` and `decline` are 71% duplicated

**Verdict: a recorded horizon item, now quantified.**

Catalogue item 38, "Extract the gate ladder out of finalize.ts — named a real problem, never
scheduled", effort L, release tie `horizon`: the refactor "must be reviewable as pure relocation
against the pinned rung order". The recorded-human-decline design chose to mirror finalize's
prologue and batch constructor and shared three helpers (`refuseMaybeAppend`, `sodViolated`,
`isValidFacts`); the reviewer's 111-of-156-lines figure is the first measurement of what that
choice left. The single-clock-read discipline the review also asks for in `finalize` (5.9)
belongs with this extraction and is recorded beside it in `next-phases.md`. Nothing changed.

## 5.6 — Sign-before-append leaves orphan signatures

**Verdict: deferral register row 22a, in full; the first recommendation was measured and
rejected there.**

Row 22 carries the whole account: the ordering is argued ("any change that makes the sidecar
entry's survival conditional on the append's outcome reintroduces the landed-but-unsigned
transition"), observability landed (`verifySignatures(recordId).orphans`), and the reviewer's
first recommendation — a `SignatureStore.delete` called on rejected appends — is the
"compensating removal after a failed CAS, which stripped signatures from 88 of 100
concurrently-confirmed records against 0 of 400 for the shipped ordering". The second, a
`pruneOrphans` helper, is the row's prune-at-seal: identified, not built, gated on a durable
`SignatureStore` backing and on re-opening the sidecar contract's first ruling. Nothing changed.

## 5.7 — SQLite has no `busy_timeout`

**Verdict: a recorded bound (catalogue item 175); its docs half was open and is closed here.**

"SqliteStore is single-operator; no multi-connection safety claimed" — `store/sqlite.ts`'s
header says so; the guide's "Choosing a store" entry did not, which is the half the reviewer's
"the constructor should say so" correctly points at. One sentence in
`docs/guide/integrating.md` now states the bound, including that no busy timeout is set. A
`busy_timeout` itself would imply multi-connection support the repository neither claims nor
tests, so it does not land.

## 5.8 — Shallow runtime validation of enums and container shapes

**Verdict: confirmed by execution for five of seven shapes; new; landed (the first code commit).
Two of the seven fall away.**

Measured this session, each against `create()`: `captureMode: 'bogus'` ACCEPTED;
`ackMode: 'bogus'` (with `requiredAcks`) ACCEPTED, and `kernel/findings.ts`'s `ackCounts`
reads any unrecognized mode as the permissive `'any'` — the one fail-open shape in the review;
`expiry: undefined` threw `TypeError: Cannot destructure property 'ttl'`; `sod: {}` threw
`TypeError: Cannot read properties of undefined (reading 'length')`; an empty profile `id`
ACCEPTED. The two that fall away: an empty `canonicalizerRef` was already rejected
(`resolveCanonicalizer: unresolved canonicalizerRef ''`), and `proposer` is a principal string
barred from finalizing the leg, not a leg name, so a `proposer` matching no leg is the intended
shape rather than an inert typo. `config.ts` already checked `allowedAuthorities`' shape "for a
non-TS caller"; the same rule now covers `captureMode`, `ackMode`, `expiry`, `sod`, both ids,
and a non-array `legs`, each with the file's own `invalid profile` message. Red first: seven
pins failing, three of them on a raw `TypeError` message where the pin demanded
`invalid profile`.

## 5.9 — Multiple clock reads per operation

**Verdict: confirmed by reading and reproduced under a straddling clock; the redemption-prologue
half landed (the second code commit); the finalize half recorded.**

`kernel/redeem.ts`'s shared prologue read `now()` for the enlisted due-guard and again for
`resolveDueClock`. An enlisted call whose window deadline falls between the reads passes the
guard and then resolves, and the resolver's own-transaction append `BEGIN`s on the connection
the host holds open — the embedded backing throws "cannot start a transaction within a
transaction" mid-host-transaction, exactly the failure the guard exists to prevent. The new pin
in `clocks.test.ts` drives it with a clock whose first in-call read sits one millisecond before
the deadline and whose later reads sit after; red first with exactly that throw. One `Date` is
now handed to both. Finalize's six reads and the decision-versus-stamp millisecond are real and
low; they belong with the ladder extraction (5.5) and are recorded in `next-phases.md`.

## 5.10 — Freshness has zero clock-skew tolerance

**Verdict: decided by the AL2 freshness design; a tolerance knob is sanction-adjacent.**

`docs/superpowers/specs/2026-08-17-al2-freshness-design.md` rules that a FUTURE `observedAt`
refuses `consultation-stale`, fail-closed; SPEC §13A's "Clock trust" paragraph places the
timestamps under host trust. A configurable tolerance is a new profile-table knob under SPEC
§9.1 and §11.1. Not decided here; hosts whose authorities share a clock source do not meet it.

## 5.11 — A host canonicalizer throw at finalize is not a refusal

**Verdict: confirmed by execution; the asymmetry is deliberate and is now stated and pinned
(the third code commit).**

Measured: a canonicalizer that throws on the finalize content made `finalize()` reject with the
host's own error and left the chain at length one. `isValidFacts` catches the same class on
`facts.figures` and refuses `consultation-missing`. The difference is what each input IS:
figures are caller-supplied data whose canonicalizability is a property of the data; the
canonicalizer is the host's registered code, and its failure is a configuration fault — the
class SPEC §8 and DECISIONS.md #11 route to a loud throw. Mapping it to `content-drift`, as the
reviewer suggests, would append a terminal edge that reads as evidence about the content on
what is actually a code fault. The `Canonicalizer` type's comment and the guide's canonicalizer
rules now state totality; `canonicalizer-totality.test.ts` pins the posture at finalize and
decline, green from its first run.

## 5.12 — `replay` accepts hash-intact, state-invalid chains

**Verdict: correct; new; recorded as a post-0.1 consideration, not landed.**

`replay` folds kinds without a transition table; `verifyChain` checks linkage and `seq`. A
foreign chain reading `opened → refused → confirmed` replays as `confirmed`. The fold does
throw on the garbling it can detect (an ack for an unraised finding, a kind change on re-raise),
so the precedent exists, but a legality table pulls against the fold's own "fidelity, not
validity" argument and changes an exported audit function's behavior on foreign chains. The
store's constraints make the shape unreachable for chains it wrote; the recompute residual that
could produce it is the AL1 limit AL2 exists for. Recorded in `next-phases.md`.

## 5.13 — `review()` on an unknown id throws the wrong error

**Verdict: the throw is by design; only the message differs.**

`kernel/review.ts`'s header argues the posture: a `recordId` resolving to an empty chain "has NO
fitting RefusalCode … `review()` THROWS via `replay()`'s empty-chain guard — the same 'a record
that does not exist is a caller error' posture" the other reads take; the chain-retirement
design records the same for `seal`. The reviewer, reading without comments, saw the wrapper as
vestigial; it is the surface's uniform `Outcome` shape. The message text — `replay: empty chain`
rather than the seam-named `unknown recordId` the mutating seams throw — is a cosmetic
inconsistency, left as is.

## 5.14 — Sealed records anchor later legs and supersession

**Verdict: sealed text says exactly this.**

SPEC §10.1: "A sealed prior still verifies; a destroyed one does not." `kernel/prior-legs.ts`
quotes it at the check the reviewer read stripped. For `supersedes`, SPEC §2 requires the
predecessor "intact and terminal", and `sealed` is state-preserving, so a sealed terminal
predecessor verifies by the same rule. The reviewer's "the code does not say so" is the comment
they removed. Nothing changed.

## 5.15 — Identity equality is `principal`-only

**Verdict: sealed text, deliberately; the counterparty half is already sanction-gated.**

SPEC §10.1: "Comparison is by principal alone, deliberately. The same principal string presented
under a different `authority` still refuses — the fail-closed direction." SPEC §10.2 says the
findings flow "satisfies `ackMode` by principal-only comparison against the raiser". The
weakness the reviewer names for `ackMode: 'counterparty'` is entry 1 of `next-phases.md`'s
sanction-gated list, re-derived independently by the 2026-09-03 security review's finding 4.
Nothing changed.

## 5.16 — Postgres adapter operational gaps

**Verdict: four real items, all post-0.1; recorded in deferral register row 23's inventory.**

Confirmed by reading `packages/store-postgres/src/postgres-store.ts`: no index on `due_at`
(only the C1 exclusivity index exists, in both SQL backings); `#validateTx` runs at the top of
an enlisted `appendBatch` and again inside `#inTransaction`; the lazy DDL has no opt-out (the
adapter README documents the laziness, not an alternative); and no document states the READ
COMMITTED assumption under `FOR UPDATE` plus `MAX(seq)` — the failure mode under another
isolation level is reasoned here, not executed. Row 23 is the increment that has the adapter
open; its inventory is widened, dated, and none of the four gates the cut.

## 5.17 — Nits

Landed (the third code commit): `consultations.ts`'s `as never` cast becomes the
`as IdentityAssertion` its sibling site already used; `canonical.ts` allocates one
`TextEncoder` at module load; `probes.ts`'s signature-tamper probe flips the first character
instead of writing a fixed `AAAA` prefix — a no-op on a signature already beginning so, once in
roughly sixteen million runs against a real signer; `expiry.ts` scans from the head with the
index loop `redeem.ts` already uses. The frozen byte-stability pins, untouched and green, are
the proof none moved a byte.

By design, nothing changed: `DEPRECATED_ALGORITHMS` is SPEC §7's algorithm-agility room
(catalogue item 32: the set is amended only by a SPEC revision); the enlisted `redeem`'s
`unredeemable-state` against the un-enlisted `redemption-timeout` is argued at `redeem.ts`'s
clock rung and pinned in `clocks.test.ts` (`redemption-timeout` is reserved for the call that
appends the resolution); `effect-mismatch` against `content-drift` under `reverify` is SPEC
§9.2 and §11.2 with OPEN-QUESTIONS §7's decided tail.

## What this pass did not do

It did not edit `docs/concept/`, move a marker, add a refusal code, change an export, or touch
the store adapter, the byte-stability pins, or any `PINNED_` literal. It did not reopen
`createWithClock`, add a `busy_timeout`, wrap the content canonicalizer, add a transition table
to `replay`, extract the finalize ladder, or add a freshness tolerance — each is named above
with where its question now lives. No pinned assertion changed its truth value; the
self-authored-inversion sequence does not advance.

## Gate outputs at the closing commit

Written from the run's own output, not copied: `pnpm test:ci` — 921 tests in 74 files
(`ci-assert-tests: ok — 921 tests in 74 files (79 suites): 921 passed, 0 failed, 0 skipped, 0
todo`), up from 907 in 73 at `ad97401` by the eleven construction pins, the one clock pin, and
the two totality pins; `pnpm typecheck` — both packages clean; `biome check
--error-on-warnings .` — exit 0; `pnpm contract-scan`, `pnpm api-sync`, `pnpm docs-index-sync`
— exit 0; `pnpm build` — both packages emit.
