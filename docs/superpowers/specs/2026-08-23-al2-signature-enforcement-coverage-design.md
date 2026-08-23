# AL2 signature-enforcement coverage — design

**Date: 2026-08-23.** **No behavior changes and no sanction is sought.** Nothing in
`docs/concept/` moves, no maturity marker moves, and no capability is promoted. Exactly one
`packages/record/src/` edit is permitted — a stale doc comment at
`packages/record/src/kernel/redeem.ts:186-188`, corrected to say what the code already does.
Any other `src/` edit is a STOP.

The increment retires deferral-register rows 20 and 21, opens row 22, and leaves rows 1 and
19 gating the 0.1 cut — down from four.

## The gap, stated from the code

`signatureLayerHolds` has exactly seven call sites, one per file:

| # | Site | On failure |
|---|---|---|
| 1 | `kernel/finalize.ts:202` | appends a `chain-compromise` edge |
| 2 | `kernel/seal.ts:55` | appends |
| 3 | `kernel/decline.ts:78` | appends |
| 4 | `kernel/findings-seams.ts:151` (serves `raiseFinding` **and** `acknowledge`) | appends |
| 5 | `kernel/redeem.ts:224` (serves `redeem`, `beginRedemption`, `completeRedemption`) | **splits on enlistment** — un-enlisted appends, enlisted refuses result-first with no store write at all |
| 6 | `kernel/prior-legs.ts:67` (`open`'s `verifyPriorLegs`) | **appends nothing anywhere**, and folds to `prior-leg-unverified` |
| 7 | `kernel/supersedes.ts:74` (`open`'s `verifySupersedes`) | **appends nothing anywhere**, and folds to `supersedes-unverified` |

`docs/analysis/2026-08-23-signature-enforcement-coverage.md` records five findings against
this surface. Two carry live register rows: row 20 (Findings A and B — decline's rung (1)) and
row 21 (Findings C and D — three caller-input gaps and five assertion-depth sites).

The condition at every site is a short-circuiting disjunction — `!verifyChain(chain).intact ||
!(await signatureLayerHolds(ctx, chain))`. A hash-broken fixture therefore never calls
`signatureLayerHolds` at all, so it exercises only the first operand. Every coverage claim
about rung (1) must say which disjunct it means.

Measured against the current tree, the signature-broken column stands like this:

| Seam path | Signature-broken coverage today |
|---|---|
| `finalize` | covered, shape-asserted |
| `seal` | covered, refusal code only |
| `decline` | **absent** (row 20) |
| `raiseFinding` | covered, code only |
| `acknowledge` | **absent** (row 21) |
| `redeem`, un-enlisted | covered, code only |
| `redeem`, enlisted | covered, shape-asserted |
| `beginRedemption`, either posture | **absent** (row 21) |
| `completeRedemption`, either posture | **absent** (row 21) |
| `verifyPriorLegs` | covered, code only |
| `verifySupersedes` | covered, code only |

Nine rows of that table need work — four absent, five covered by refusal code alone. Counted as
*cells* rather than rows the four absent ones are six, because both token seams double on
enlistment. Decline additionally lacks the rung-(1)-beats-rung-(2) adjacent pair every other
seam ladder in this package pins, which belongs to no cell of the grid at all.

## The distinction that shapes the design

**A missing input is not a missing line.** Row 21's three caller-input gaps run their site's
body on every call — they simply never arrive over a signature-broken chain. Row 20's decline
site is different in kind: until the Finding E adjudication increment added a hash-broken
corner test, the rung's body had never executed at all, proved by mutation. The hash-broken
half is closed; the AL2 half is the narrowed remainder.

**The seven sites do not share one shape.** Finding D asks for "the edge shape" as though it
were one assertion repeated five times. It is not. Sites 1-4 append; site 5 appends or
withholds depending on whether the caller brought a transaction; sites 6-7 append nothing —
not to the record being opened, which does not exist yet, and not to the prior leg or
predecessor whose chain was just found broken. A signature-broken prior leg leaves no evidence
edge anywhere in the system. That is the most interesting fact on this surface and no test
states it.

**`transitionRef` presence is not a proxy for appending.** `appendChainCompromise`
(`kernel/finalize.ts:696`) walks CAS candidates and falls through to a no-edge refusal when the
record's state admits none — already-terminal, already-sealed, already-redeemed. "Un-enlisted
implies a `transitionRef`" is false as a blanket claim and must never be written as one.

## Rulings taken (at the 2026-08-23 brainstorm), so they are not re-litigated

1. **`signingSetup` is frozen.** `packages/record/test/helpers/signing.ts:44` returns
   `{ handles }` and cannot reach the sidecar — the reason no signature-broken decline fixture
   exists. It is nonetheless left byte-identical, proved by `git diff` at exit rather than
   asserted: its fixed clock is load-bearing for `decline.test.ts`'s eligibility-freshness
   fixture, whose `observedAt` is meaningful only as a 2h offset against a 60s bound, and three
   test files build on it. New capability arrives as new exports beside it, never as a rewrite
   of it.

2. **The counting verifier is read as a delta, never as a total.** `verifySignatures()`
   consults the verifier itself, so a test that reads the AL2 report and then asserts
   `calls() > 0` passes vacuously. Snapshot before the seam call, subtract after. This delta is
   the only mechanical proof that the *signature* disjunct ran rather than the hash one.

3. **The census proves naming, not testing.** The new site-census test asserts that the set of
   `signatureLayerHolds` call sites equals a pinned list of seven, so an eighth site fails on
   the day it lands. It cannot tell whether a listed site is still *covered* — a gutted test
   leaves it green. Its header says so, in the same voice `scripts/api-reference-sync.mjs`
   states its own bound.

4. **The orphan-growth finding is recorded, not fixed.** See "What stays outside" below.

5. **Coverage is bounded to what the rows name.** The full grid is 13 seam cells across two
   break kinds; the rows name nine gaps. The other cells are not written here. A row retires
   when its own behavior lands, and inventing adjacent work would blur which.

## What lands

**The rig** — two new exports in `packages/record/test/helpers/signing.ts`:

- `enforceableSigningSetup(profiles, opts?: { store? })`, returning
  `{ handles, store, signatures, calls }`. The `store` option is what lets the enlisted cells
  supply a `SqliteStore` so a host transaction can be opened.
- `breakOneSignature(signatures, recordId)`, lifted from `signing-enforce.test.ts:63`, plus a
  guard asserting the mutation actually changed the signature. The existing helper overwrites
  the first four base64 characters, which is a silent no-op if the signature already begins
  with them.

Three near-duplicate break helpers exist today — `signing-enforce.test.ts:63`,
`redeem.test.ts`, and `signing.test.ts:244`, the last of which breaks the *trailing* four
characters instead of the leading four. All three import the shared one. The local `signedSetup`
in `signing-enforce.test.ts` stays where it is; its profile is specialised to that file.

**The tests.** `signing-enforce.test.ts` becomes the single home for all seven sites'
signature-broken pins — it already claims that job, and its header currently disclaims the
seventh site in so many words. That header is rewritten to match what the file then covers.

Row 20 (Findings A and B):

- signature-broken `decline()`, shape-asserted: refusal code, `transitionRef` equal to the
  appended edge's own digest, chain growth of exactly one, the appended transition's kind and
  payload, the compromise edge itself carrying a sidecar entry, and a verifier-call delta above
  zero.
- the same over a leg that does **not** declare `decline: true` — the §5 edge appends rather
  than the declaration gate throwing. This is the signature-broken half of Finding E's corner,
  which the analysis record states outright is not pinned there.
- decline's rung-(1)-beats-rung-(2) adjacent pair, in `decline.test.ts`'s ladder-order test,
  carrying the separate `status` assertion that test's idiom currently omits.

Row 21, Finding C — five cells: `acknowledge`; `beginRedemption` un-enlisted and enlisted;
`completeRedemption` un-enlisted and enlisted. The enlisted cells assert the host transaction
is still open, that a host `ROLLBACK` does not throw, and that the record's state is untouched.
`beginRedemption` additionally asserts that no token is minted on a compromise refusal.

Row 21, Finding D — five deepenings in place: `seal`, `raiseFinding` and un-enlisted `redeem`
gain append assertions; `verifyPriorLegs` and `verifySupersedes` assert no edge anywhere,
including on the compromised chain they just rejected.

**The census test**, per ruling 3.

**The one `src/` edit.** `kernel/redeem.ts:186-188` says ENLISTED callers are "today only
direct redeem carries tx". All three redemption seams read `opts?.tx` and pass it to the shared
prologue. The statement was true when written and was falsified by the increment that wired
`tx` into the token seams; two sibling comments in the same file already describe it correctly.
The correction drops the dated "today", which is a claim with a shelf life and no way to fail
loudly.

## Coverage this adds, stated with its limit

After this increment every one of the seven sites has its signature-broken disjunct executed by
at least one test, and every one of those tests asserts what the seam did rather than only
which code it spoke. The two sites that append nothing are pinned as appending nothing.

The limits, stated in the same breath:

- The census guards against a *new* site appearing uncovered. It does not guard an existing
  site's test against being weakened.
- Every signature break in this increment is a tampered sidecar entry at the genesis
  transition. A missing entry, an unresolvable `keyRef`, a throwing verifier and a break at a
  non-genesis transition are separate inputs, and only the ones already covered elsewhere stay
  covered.
- These tests prove enforcement, never that the enforcement is the right policy.
- No byte-regression pin is added, for the reason the analysis record already argued: the
  digested transition shape carries no signature field, so no byte literal can distinguish a
  signed compromise edge from an unsigned one. Combination coverage is a permanent scope bound
  of that directory, not a deferral, and takes no register row.

## Risk, and how it is held

**The orphan-growth constraint binds this increment's own tests.** On a record whose state
admits no CAS candidate, each refusing seam call mints a fresh sidecar entry. An existing
assertion comparing sidecar length to chain length is sound only because it fires after exactly
one refusing call. No test written here may make two refusing calls and then assert sidecar
cardinality; every site making that comparison carries a comment saying why.

**Mutation proof per new test.** For each new pin, neuter the disjunct it claims to cover and
confirm that exactly the intended tests fail. Assertions alone cannot distinguish a test that
exercises rung (1) from one that passes because some later gate refused for its own reasons —
the Finding E adjudication increment established this practice and this increment inherits it.

**The frozen oracle and the frozen helper** are both proved by `git diff` at exit, not by
inspection.

**Contract-scan hazards.** Every pattern the scan enforces over tracked code runs over every
line of a `.ts` file, test titles and string literals included. No bare forbidden word reaches
a test name, and no digest is ever shortened for readability.

**Zero skips.** A cell that turns out not to be constructible as scripted is either built or
recorded as a deferral with the trigger that un-defers it. It is not parked.

**Figures are measured, never predicted.** The suite totals move; they are read off the tree at
exit and written down then.

## What stays outside, and why

**The orphan-growth defect gets register row 22, not a fix.** Each refusing seam call against a
compromised record whose state admits no CAS candidate mints one sidecar entry that names a
transition which never landed, and performs one signing operation per candidate. On a sealed
record the chain can never grow again, so nothing bounds the accumulation; the driver is the
timestamp stamped into each freshly built refused transition. It is inert to both AL2 consumers
— verification correlates from the chain to the sidecar and never the reverse — so this is a
storage, observability and wasted-work finding, not a soundness one. It is not fixed here
because the containment either special-cases a path shared by five call sites or reopens the
deliberately pinned sign-before-append ordering, whose inversion would reintroduce exactly the
landed-but-unsigned transition the AL2 enforcement increment made fail closed. Behavior on a
durable sidecar backing is unmeasured and the row says so.

The account is appended to `docs/analysis/2026-08-23-signature-enforcement-coverage.md` as a
dated section, the way that record's own adjudication addendum was appended, so rows 20, 21 and
22 all point at one document.

Row 22's trigger names a prompting event, never the work's own completion — the error row 20
made twice: *the first increment that changes the signing decorator's sign-before-append
ordering or the compromise-append candidate walk, or that adds a durable signature-store
backing beyond the in-memory one — or the 0.1 cut, whichever lands first.* Its number is derived
by the register's own high-water-mark procedure, and the row states which number it took and
why.

**Also outside:** every grid cell neither row names; a fix for the three near-duplicate
break helpers beyond pointing them at one shared function; and re-homing the existing enlisted
signature test, which is already covered where it sits.

## Exit

The increment exits when: the two new helper exports exist and `signingSetup` is byte-identical
by diff; all nine named gaps are closed and each new pin has had its mutation proof run and
recorded; the census test names all seven sites and fails on an eighth; the `redeem.ts` comment
is corrected and no other `src/` file has changed, proved by diff; rows 20 and 21 are retired
from `docs/process/deferral-register.md` with their retirement notes in
`docs/process/implementation-status.md` and `docs/process/next-phases.md` and their
release-checklist items updated; row 22 is written, with its trigger text byte-identical across
the register, `docs/process/next-phases.md`, `docs/process/release-checklist.md` and
`docs/process/implementation-status.md`; the orphan-growth section is appended to the analysis
record and that record's three stale line pins are corrected; and `pnpm test`, `pnpm typecheck`,
`pnpm lint`, `pnpm contract-scan`, `pnpm api-sync` and `pnpm docs-index-sync` are green with the
new figures recorded. `docs/superpowers/INDEX.md` gains this pair's row and both of its counted
claims move. `docs/process/implementation-status.md` gains an increment section, proposed
explicitly.
