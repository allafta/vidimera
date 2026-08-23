# Signature-enforcement coverage — findings, recorded and deferred

**Date: 2026-08-23.** An audit of `kernel/decline.ts`'s rung (1) — its pre-seam
chain-verify and AL2 signature-layer check — found the rung's own branch structure
unexecuted by the entire test corpus, proved by mutation. Reading outward from that
finding turned up four adjacent gaps in the same signature-enforcement surface, of two
different classes. **This record documents all five. It writes no test and changes no
`packages/*/src/` file** — the maintainer's own choice, recorded here rather than acted
on in passing. Two of the five findings are deferred with fresh register rows (20 and 21,
below); the fifth is a code/spec question left for adjudication, not a deferral.

**Later additions, recorded after the audit above.** This record opened with the five
findings the 2026-08-23 audit produced, and the paragraph above describes that audit as it
stood — it is left as written. Two things have been appended since, each dated at its own
site: Finding E's adjudication, and Finding F below. Finding F was recorded at the
increment that closed register rows 20 and 21, which also made comment-only edits at TWO
sites in `packages/record/src/kernel/redeem.ts` — so the "changes no `packages/*/src/` file"
claim above is true of the audit, not of everything this document now records.

## Finding A — `kernel/decline.ts`'s rung (1) was unexecuted by the entire corpus (hash-broken half closed since — see the Finding E adjudication below)

`packages/record/src/kernel/decline.ts` lines 76–80:

```ts
  // --- (1) pre-seam chain-verify (SPEC §5: verification is first) ----------------------
  const report = verifyChain(chain);
  if (!report.intact || !(await signatureLayerHolds(ctx, chain))) {
    return appendChainCompromise(store, chain, now);
  }
```

**Evidence, verified against the tree at `f7de9ed`:**

- `grep -c 'chain-compromise' packages/record/test/decline.test.ts` → **0**.
- `grep -cE 'tamper|compromise' packages/record/test/decline.test.ts` → **0**.
- Exactly three files call `decline()`: `decline.test.ts`, `provenance.test.ts`,
  `byte-regression/declined.test.ts`. The latter two also return **0** for
  `grep -cE 'tamper|chain-compromise'`. No test anywhere in the corpus exercises a
  tampered or signature-broken chain through `decline()`.
- **Mutation test (the decisive evidence):** deleting the whole rung — replacing the
  four lines above with a bare `verifyChain(chain);` (the report discarded, no branch, no
  append) — leaves the full suite at **63 files / 794 tests, 0 failures**. The rung's own
  first gate can be removed wholesale and nothing in the corpus notices. The mutation was
  made and reverted on the working tree before this record was written; `git status` and
  `git diff --stat` were both empty afterward, confirming the revert. (True of the tree at
  this record's own commit; the hash-broken disjunct has since gained a corpus test of its
  own — see the Finding E adjudication below, which re-ran this exact mutation and got a
  single, expected failure.)

This is stronger than "the AL2 arm is untested": **both** disjuncts of the
`!report.intact || !(await signatureLayerHolds(...))` condition, and the
`appendChainCompromise` call they guard, are dead to the corpus. Every other
`signatureLayerHolds` call site — `finalize()`, `seal()`, the redemption family's shared
prologue, the findings family's shared prologue, and the two cross-record claims
(`verifyPriorLegs`, `verifySupersedes`) — has at least the hash-broken disjunct exercised,
and most have the signature-broken one too: `signing-enforce.test.ts`'s own header
describes those six as the sites the AL2 enforcement increment made load-bearing, and adds
that "a seventh `signatureLayerHolds` site, `kernel/decline.ts`'s own prologue, joined
later with the recorded-human-decline increment; this file's six tests predate it and do
not cover it." `decline()`'s rung (1) is that seventh site, and no test written since has
covered it either.

## Finding B — decline's ladder is missing its rung-(1) adjacent pair

`packages/record/test/decline.test.ts:197`'s test, `'decline ladder order: each rung wins
over the one after it (adjacent pairs)'`, opens its first case with the comment `// (3)
identity beats (3.5) SoD` — it begins at rung (3). No `(1) beats (2)` case exists in that
test, and no other test in the file supplies one.

Every other seam ladder in the package pins its rung-(1) adjacent pair. The test at
`packages/record/test/findings-seams.test.ts:263` is titled `'the prologue:
chain-compromise outranks everything; expired refuses leg-expired; confirmed refuses
record-not-open (never-append)'` — chain-compromise (rung 1) against the state gate (rung
2) is exactly the missing shape. (That line pin was re-derived at the AL2
signature-enforcement coverage increment: a later commit had inserted 73 lines above the
test cited here, making the original `:190` pointer stale.) `decline()` is the only seam ladder in this repository
missing its own rung-(1) pair. `CLAUDE.md` names "byte-stability pins and adjacent-pair
gate-order tests" as a standing discipline "from the kernel increment on"; this is a gap
against that discipline, not merely an isolated oversight.

Findings A and B are the same underlying gap seen from two angles: A is that rung (1)'s
own body never runs on a broken chain; B is that the ladder-order suite, whose whole job
is proving each rung outranks the next, never asked rung (1) to prove it outranks rung
(2).

## Finding C — three AL2 caller-input gaps (a different, lesser class; all three closed since — see the dated note at the end of this section)

These three sites' bodies DO execute on a broken chain — unlike Finding A, the code runs
— but only ever over a **hash-broken** chain, never a signature-broken one:

- `kernel/findings-seams.ts:151` (`loadOpenDeclaringRecord`'s shared rung (1),
  `if (!verifyChain(chain).intact || !(await signatureLayerHolds(ctx, chain)))`), reached
  via `acknowledge`, is exercised signature-broken only through `raiseFinding`
  (`signing-enforce.test.ts:127–156`, the "seal and raiseFinding refuse the same way… a
  MISSING entry… also fails closed" test) — `acknowledge` itself reaches the same line
  only hash-broken, at `findings-seams.test.ts:302`.
- `kernel/redeem.ts:225` (the shared redemption prologue's matching condition), reached
  via `beginRedemption`, is exercised hash-broken only —
  `redeem-token.test.ts:774`, `'ENLISTED beginRedemption over a tampered chain:
  chain-compromise result-first, NO edge, host transaction intact (the inherited rung-(1)
  shape)'`.
- The same `kernel/redeem.ts:225`, reached via `completeRedemption`, is exercised
  hash-broken only, at `redeem-token.test.ts:794` (the completion twin of the test above)
  and `redeem-token.test.ts:311` (`'verify-first at completion: a tampered redeeming
  chain refuses chain-compromise before any token check'`).

Distinguish this class from Finding A explicitly: **these three lack an input** (a
signature-broken fixture over these three call paths), while **decline lacks the line**
(its rung's body never runs on ANY broken chain, hash- or signature-). Finding A is the
more serious gap of the two.

**Closed, 2026-08-23 (a later act than the audit above, recorded the same calendar day).**
All three call paths gained signature-broken pins at the AL2 signature-enforcement coverage
increment — `acknowledge` in `signing-enforce.test.ts`, and both token seams there in each
enlistment posture, five cells rather than three because the token pair doubles on
enlistment. Each of the five asserts `verifyChain(before).intact === true` before the seam
call and reads the verifier-call counter as a delta across it, so none can be the hash
disjunct wearing the signature disjunct's name. The present-tense readings above ("is
exercised hash-broken only") are left exactly as the audit wrote them: they were true of the
tree the audit ran against and are not true of the tree now. Register row 21, which carried
this finding together with Finding D, RETIRED at that same increment and is gone from
`docs/process/deferral-register.md`; `docs/process/next-phases.md`'s row-21 retirement
section is where a reader should now look for the trigger text and the account of what
landed.

## Finding D — five of seven signature-enforcement sites assert the refusal code only, not the edge shape (all five deepened since — see the dated note at the end of this section)

`signing-enforce.test.ts` and `redeem.test.ts` between them exercise seven
signature-broken sites. Two assert the full shape of what the seam did in response;
five assert only that the refusal carried the right code:

- **Code-only** (five sites): `seal` (`signing-enforce.test.ts:111–115`, culminating in
  `assert.equal(sealed.code, 'chain-compromise')` with nothing about the appended edge);
  `raiseFinding` (`:147–149`); un-enlisted `redeem` (`:173–175`); `open()`'s
  `verifyPriorLegs` claim, over a signature-broken prior leg (`:279–281`,
  `assert.equal(successor.code, 'prior-leg-unverified')`); and `open()`'s
  `verifySupersedes` claim (`:200–202`, `assert.equal(recovered.code,
  'supersedes-unverified')`). The last two assert their own cross-record claim code
  rather than `chain-compromise` — the AL2 enforcement increment's own inherited-fold
  shape, not a gap in itself — but both still assert code only, nothing about the batch
  shape underneath.
- **Shape-asserted** (two sites): `finalize` (`:96–102`) is the only signature-broken
  case that asserts the compromise edge actually appended (`last?.kind === 'refused'`)
  AND that the edge itself went through the signing decorator (`entries.length ===
  chain.length`, i.e. the compromise edge is itself signed). Enlisted `redeem`
  (`redeem.test.ts:238–243`) is the only case that asserts the opposite shape — NO edge —
  checking `outcome.transitionRef === undefined` and that the stored chain is
  byte-unchanged.

A regression that flipped one of the five code-only sites from "append the compromise
edge" to "refuse result-first with no edge" (or vice versa) would keep all five green.
Only `finalize` and enlisted `redeem` would catch that class of regression at their own
sites.

**Closed, 2026-08-23 (a later act than the audit above, recorded the same calendar day).**
All five code-only sites were deepened in place at the AL2 signature-enforcement coverage
increment: `seal`, `raiseFinding` and un-enlisted `redeem` now assert the appended edge,
while `verifyPriorLegs` and `verifySupersedes` — the two that append NOTHING ANYWHERE — now
assert exactly that, including that the prior leg or predecessor whose chain was just found
broken is itself left unmarked, which no test in this package previously stated. Those two
additionally read a verifier-call delta, added at that increment's own final review, because
each folds several distinct causes into one refusal code and nothing else in either test
said which one had fired. The counts above ("five of seven … assert the refusal code only")
are left exactly as the audit wrote them. Register row 21 retired at that same increment —
see the note under Finding C.

## Finding E — a code/spec question for the maintainer, raised undecided here, adjudicated 2026-08-23

`decline()`'s rung (1) (lines 76–80, quoted under Finding A) runs **before** the
leg-declaration gate at `kernel/decline.ts:96–103`:

```ts
  // --- the declaration gate (the findings-seams posture, SPEC §9.1) --------------------
  if (leg.decline !== true) {
    throw new Error(
      `decline: leg '${leg.id}' of profile '${record.profileId}' does not declare the decline ` +
        'seam — declare decline: true on the leg (SPEC §9.1); a non-declaring chain stays ' +
        'byte-identical to a pre-decline implementation',
    );
  }
```

That gate's own message (lines 99–101) asserts a byte-identity property: "a non-declaring
chain stays byte-identical to a pre-decline implementation." That holds for an intact
chain — a non-declaring leg's `decline()` call throws before touching the store, so
nothing is appended and the chain is untouched. **It does not hold in one corner**: call
`decline()` against a leg that does NOT declare `decline: true`, over a chain that is
hash- or signature-broken. Rung (1) runs first, finds the chain compromised, and
**appends a `chain-compromise` edge and refuses** — a byte the "byte-identical" claim
says should never land, on a leg where `decline()` was never even declared reachable.

`grep -rn "does not declare the decline" packages/record/` finds the message only at
`src/kernel/decline.ts:99` (and its compiled `dist/` copy) — no test exercises this
corner in either direction, so it is also uncovered, in the same sense as Findings A–C,
but its bug-or-not status is genuinely unsettled, so it is recorded separately rather
than folded into those findings' register rows.

**This is recorded as a finding requiring adjudication, not as a resolved question, and
not as "fixed" in passing.** `CLAUDE.md`: "where code and spec differ, one of them is
wrong and the difference is a finding, never silently reconciled." Two readings, stated
fairly, with neither chosen:

- **(a) A defect.** The declaration gate states an unqualified byte-identity property —
  "a non-declaring chain stays byte-identical to a pre-decline implementation" — with no
  corner carved out, and that property is the stated reason the gate throws rather than
  refuses. This corner falsifies it as written: a leg that never declared the seam
  reachable nonetheless acquires an appended `chain-compromise` edge, so its chain is no
  longer byte-identical to what a pre-decline build would have produced. Under this
  reading, either the message claims more than the code delivers, or the gate is ordered
  wrongly relative to rung (1).
- **(b) SPEC §5 working exactly as intended.** `decline.ts`'s own rung-(1) comment
  attributes the ordering to "SPEC §5: verification is first" — the principle SPEC §5
  states for `seal()`'s ladder: "Verification is first: a record whose chain fails
  verification refuses `chain-compromise` and can never be sealed — so a compromised
  record never reaches `retired`, and its lawful disposal is a host-side act outside the
  library (§13)" (`docs/concept/SPEC.md:446–449`). Under this reading, chain integrity is
  checked ahead of whether the seam is even declared, and the byte-identity message is
  simply scoped more broadly than the corner it was written for.

Neither reading is developed further here, and the symmetry is deliberate: this document
records the question, and the length of each case is not a vote.

No adjudication is taken here. Finding E gets no deferral-register row — see "Register
rows opened by this record" below for why.

**Adjudicated, 2026-08-23 (a later act than the audit above, recorded the same calendar
day).** The maintainer has ruled: **reading (b)**. The byte-identity promise the
declaration gate's message asserts is scoped to the feature's own payload keys and
transitions — the reading `SPEC.md:369-372` already carries: "Every profile-conditional
key is present-iff-declared … The invariant is over profile-declared features." A
universal §5 `chain-compromise` edge is neither a profile-conditional key nor a
decline/findings transition, so it sits outside that promise. The ordering itself is
required, not merely permitted: `SPEC.md:421-426`'s "Mandatory pre-seam chain-verify"
binds every operator-side mutating seam to verify its own chain before acting (`open()`'s
one named exception does not apply to `decline`), and the exact competition between a
chain-verify refusal and a declaration-conditional throw is adjudicated at decline's own
section, `SPEC.md:652-658` ("The policy declared-iff-present throw fires at profile
resolution, which follows the chain load and its verification"). No behavior changes, no
bytes move, and `docs/concept/` is untouched by this ruling — no marker moves.

What WAS wrong, and is fixed at this same increment: the two throw messages — this one
(`kernel/decline.ts`) and its twin at `kernel/findings-seams.ts`'s declaring check
(SPEC §10.2), which states the identical unqualified claim over the identical ordering —
asserted byte-identity without the qualifier that makes it true. A one-site fix would have
left the sibling standing, so both are reworded together to scope the claim to the
feature's own keys/transitions and name the universal §5 edge as the carve-out. The corner
both messages glossed is pinned, over its **hash-broken** half, by a test at each site
(`packages/record/test/decline.test.ts`, `packages/record/test/findings-seams.test.ts`),
each asserting the appended edge itself (code, `transitionRef`, chain growth, and the
appended kind), not merely the refusal code; the **signature-broken** half of the same
corner is not pinned here. This closes the hash-broken half of deferral-register row 20 —
decline's rung (1) now has its first execution in the corpus — and row 20's text is
narrowed to name only the signature-broken half as still unexercised.

The fix itself edits `kernel/decline.ts`, which is exactly what row 20's original trigger
(quoted below, under "Register rows opened by this record", as "the next increment that
touches `packages/record/src/kernel/decline.ts`") names — so that trigger fires here
without the row's deferred work (the AL2 signature-broken half) landing. Per the
register's own rule that a trigger firing without the work landing gets RETRIGGERED
rather than silently re-armed (the house form row 5 in `docs/process/next-phases.md`
already uses), row 20 is retriggered by this same fix: it keeps its number and stays
open, but its trigger is replaced. A first replacement (fix round 1) named the deferred
work's own completion — a signature-broken fixture driving `decline()`'s rung (1) — which
turned out tautological, since a trigger that fires exactly when the work lands un-defers
nothing; fix round 2 corrects it to a genuine prompting event instead: the next increment
that touches AL2 signature enforcement at `decline()`'s rung (1), or that extends the
shared AL2 signing test rig sketched below under "Design considered and deferred" to
reach it. (**Updated 2026-08-23:** row 20 has since RETIRED, at the increment that closed it, and
is gone from `docs/process/deferral-register.md` — the register carries the numbering gap.
The trigger text this paragraph describes survives verbatim in
`docs/process/next-phases.md`'s own row-20 retirement section, which is where a reader
should now look; the paragraph above stays as the fix-round narrative it was, its present
tense true at its own writing.)

## Design considered and deferred, so a later reader does not redo this analysis

Two tests were sketched, not written, to close Findings A/B:

1. A signature-broken decline test in `signing-enforce.test.ts`, reusing that file's
   local `signedSetup` helper — the only rig in this package exposing the sidecar
   (`signatures`) alongside the handles. The shared
   `packages/record/test/helpers/signing.ts`'s `signingSetup` (used by
   `decline.test.ts`'s own two AL2 tests) returns only `{ handles }` — no `signatures`
   handle — so a signature-broken decline fixture built on the shared helper cannot reach
   the sidecar to break an entry; the local rig
   in `signing-enforce.test.ts` would need to be used or the shared helper extended.
2. A rung-(1) adjacent-pair test in `decline.test.ts`, beside the existing ladder-order
   test, pinning `(1) beats (2)` the way `findings-seams.test.ts:263` does for its own
   seams.

**The argued conclusion: no byte-regression pin is warranted for this gap**, even were
the tests above written. `chain/encoding.ts`'s `TransitionDigestInput` — the exact shape
digested per SPEC §4 — is `{recordId, seq, at, kind, payload, prevHash}`: no signature
field. A signature never enters `encodeTransition`, so no `transitionDigest` literal can
distinguish a signed compromise edge from an unsigned one; a byte pin over this corner
would pin nothing beyond what the existing hash-broken `declined.test.ts` byte-regression
pin already covers. Separately, `packages/record/test/byte-regression/fixtures.ts`'s own
header states that "COMBINATION COVERAGE IS PERMANENTLY OUTSIDE THIS DIRECTORY" — a
signing-declared, decline-declaring chain broken at the signature layer combines two
capabilities in one fixture, exactly the shape that directory's own recorded bound
forbids scripting. Both arguments point the same way; neither test was written.

## What was deliberately NOT done

- No test was written, in any file.
- No `packages/*/src/` file was changed. The mutation described under Finding A was made
  and reverted on the working tree while auditing; it never landed in any commit.
- No `docs/concept/` file was touched.
- No maturity marker moved.
- Finding E was not adjudicated in either direction.

## Register rows opened by this record

Two new rows are added to `docs/process/deferral-register.md`. Per that register's own
header, "a gap is an entry that has left, and a new entry takes the next number never yet
used" — the visible rows (1 and 19) do not give the high-water mark. Derived:

```
grep -rnoE "register row [0-9]+|row [0-9]+" docs/process/ docs/superpowers/ CLAUDE.md \
  | grep -oE "[0-9]+$" | sort -n | tail -1
```

This returns **19** against the tree at `f7de9ed` (row 19's own text, plus every other
tracked reference to it, are the highest hits; no tracked document names 20 or above).
So:

- **Row 20** takes the next number never yet used above 19. It carries Findings A and B —
  decline's rung (1) coverage. Trigger: the next increment that touches
  `packages/record/src/kernel/decline.ts`, or the 0.1 cut — whichever lands first.
- **Row 21** takes the next number never yet used once row 20 is added (re-running the
  derivation above against a tree that already carries row 20 returns 20, so row 21 is
  next). It carries Findings C and D — the AL2 caller-input gaps and the
  assertion-depth sites. Trigger: the next increment that touches AL2 signature
  enforcement, or the 0.1 cut — whichever lands first.

(**Updated 2026-08-23:** neither row is in `docs/process/deferral-register.md` any more. Row
20 was retriggered once, at the Finding E adjudication above, and then RETIRED alongside row
21 at the increment that closed them both — the register carries the numbering gap its own
header describes, and `docs/process/next-phases.md`'s two retirement sections hold each row's
trigger text and the account of what landed. The paragraph and the two bullets above stay as
written: they are the derivation that produced the two numbers, and it is the derivation, not
the rows' present whereabouts, that a later reader needs from this section.)

**Finding E gets no row.** It is a question for the maintainer to adjudicate, not work
being deferred — there is no future increment whose landing would "close" it the way a
register trigger closes a row; adjudicating it is itself the closing act, and that act is
a decision, not a build.

## Finding F — orphan sidecar growth on the no-edge path, recorded 2026-08-23

**A later act than the audit above, found while closing rows 20 and 21 rather than by the
original sweep.** It is recorded here so rows 20, 21 and 22 all point at one document.

`appendChainCompromise` (`packages/record/src/kernel/finalize.ts`) builds its `refused`
transition fresh on every call, stamping `at` from the clock. The signing decorator signs
before delegating to the store, and `MemorySignatureStore.put` is keyed by
`transitionDigest` — so a new timestamp is a new key, not an upsert. On a record whose state
admits no CAS candidate the append never lands, and the sidecar keeps the entry anyway.

Measured, not inferred. A sealed signing record with one broken signature, driven through six
consecutive refusing `finalize()` calls:

| clock | sidecar entries after each call | chain |
|---|---|---|
| default (wall) | 6, 7, 8, 9, 10, 11 | 5, 5, 5, 5, 5, 5 |
| fixed instant | 6, 6, 6, 6, 6, 6 | 5, 5, 5, 5, 5, 5 |

The contrast isolates the cause: the only thing differing between the runs is the clock. Under
a fixed instant every call re-signs byte-identical bytes and upserts one key; under a real one
each call mints a fresh orphan. A sealed record's chain can never grow again, so nothing bounds
the accumulation. Each refusing call also performs one signing operation per CAS candidate —
three, on the fixture above — where the answer is statically known to be "no edge can land".

**Stated with its limit, which is the honest part.** This is not a soundness defect.
`verifySignatures` and `signatureLayerHolds` both walk the CHAIN and look each transition's
digest up in the sidecar; the reverse direction is never traversed, so an entry with no chain
counterpart is never visited and cannot make the layer report a false verdict. It cannot fail
open. What it costs is storage, observability, and wasted signing work — on a host whose
`Signer` is a remote key service, three round-trips per refused seam call.

The enlisted redemption branch is exempt: it refuses result-first and never routes through the
append at all.

**Unmeasured, and named as such:** behavior on a durable `SignatureStore` backing. The probe
covered the in-memory reference backing only, and the durable case is where "unbounded" would
actually matter.

**Not fixed here, and recorded as register row 22 instead.** The containment either
special-cases a path five call sites share, or reopens the sign-before-append ordering the
signing decorator pins deliberately — and inverting that order would reintroduce exactly the
landed-but-unsigned transition the AL2 enforcement increment made fail closed. That is its own
increment with its own design, not a change to make in passing while closing a coverage row.
