# Signature-enforcement coverage — five findings, recorded and deferred

**Date: 2026-08-23.** An audit of `kernel/decline.ts`'s rung (1) — its pre-seam
chain-verify and AL2 signature-layer check — found the rung's own branch structure
unexecuted by the entire test corpus, proved by mutation. Reading outward from that
finding turned up four adjacent gaps in the same signature-enforcement surface, of two
different classes. **This record documents all five. It writes no test and changes no
`packages/*/src/` file** — the maintainer's own choice, recorded here rather than acted
on in passing. Two of the five findings are deferred with fresh register rows (20 and 21,
below); the fifth is a code/spec question left for adjudication, not a deferral.

## Finding A — `kernel/decline.ts`'s rung (1) is unexecuted by the entire corpus

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
  `git diff --stat` were both empty afterward, confirming the revert.

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

Every other seam ladder in the package pins its rung-(1) adjacent pair.
`packages/record/test/findings-seams.test.ts:190`'s test is titled `'the prologue:
chain-compromise outranks everything; expired refuses leg-expired; confirmed refuses
record-not-open (never-append)'` — chain-compromise (rung 1) against the state gate (rung
2) is exactly the missing shape. `decline()` is the only seam ladder in this repository
missing its own rung-(1) pair. `CLAUDE.md` names "byte-stability pins and adjacent-pair
gate-order tests" as a standing discipline "from the kernel increment on"; this is a gap
against that discipline, not merely an isolated oversight.

Findings A and B are the same underlying gap seen from two angles: A is that rung (1)'s
own body never runs on a broken chain; B is that the ladder-order suite, whose whole job
is proving each rung outranks the next, never asked rung (1) to prove it outranks rung
(2).

## Finding C — three AL2 caller-input gaps (a different, lesser class)

These three sites' bodies DO execute on a broken chain — unlike Finding A, the code runs
— but only ever over a **hash-broken** chain, never a signature-broken one:

- `kernel/findings-seams.ts:151` (`loadOpenDeclaringRecord`'s shared rung (1),
  `if (!verifyChain(chain).intact || !(await signatureLayerHolds(ctx, chain)))`), reached
  via `acknowledge`, is exercised signature-broken only through `raiseFinding`
  (`signing-enforce.test.ts:110–131`, the "seal and raiseFinding refuse the same way… a
  MISSING entry… also fails closed" test) — `acknowledge` itself reaches the same line
  only hash-broken, at `findings-seams.test.ts:229`.
- `kernel/redeem.ts:224` (the shared redemption prologue's matching condition), reached
  via `beginRedemption`, is exercised hash-broken only —
  `redeem-token.test.ts:774`, `'ENLISTED beginRedemption over a tampered chain:
  chain-compromise result-first, NO edge, host transaction intact (the inherited rung-(1)
  shape)'`.
- The same `kernel/redeem.ts:224`, reached via `completeRedemption`, is exercised
  hash-broken only, at `redeem-token.test.ts:794` (the completion twin of the test above)
  and `redeem-token.test.ts:311` (`'verify-first at completion: a tampered redeeming
  chain refuses chain-compromise before any token check'`).

Distinguish this class from Finding A explicitly: **these three lack an input** (a
signature-broken fixture over these three call paths), while **decline lacks the line**
(its rung's body never runs on ANY broken chain, hash- or signature-). Finding A is the
more serious gap of the two.

## Finding D — five of seven signature-enforcement sites assert the refusal code only, not the edge shape

`signing-enforce.test.ts` and `redeem.test.ts` between them exercise seven
signature-broken sites. Two assert the full shape of what the seam did in response;
five assert only that the refusal carried the right code:

- **Code-only** (five sites): `seal` (`signing-enforce.test.ts:100–103`, culminating in
  `assert.equal(sealed.code, 'chain-compromise')` with nothing about the appended edge);
  `raiseFinding` (`:130–131`); un-enlisted `redeem` (`:148–149`); `open()`'s
  `verifyPriorLegs` claim, over a signature-broken prior leg (`:230–231`,
  `assert.equal(successor.code, 'prior-leg-unverified')`); and `open()`'s
  `verifySupersedes` claim (`:166–167`, `assert.equal(recovered.code,
  'supersedes-unverified')`). The last two assert their own cross-record claim code
  rather than `chain-compromise` — the AL2 enforcement increment's own inherited-fold
  shape, not a gap in itself — but both still assert code only, nothing about the batch
  shape underneath.
- **Shape-asserted** (two sites): `finalize` (`:85–91`) is the only signature-broken
  case that asserts the compromise edge actually appended (`last?.kind === 'refused'`)
  AND that the edge itself went through the signing decorator (`entries.length ===
  chain.length`, i.e. the compromise edge is itself signed). Enlisted `redeem`
  (`redeem.test.ts:240–245`) is the only case that asserts the opposite shape — NO edge —
  checking `outcome.transitionRef === undefined` and that the stored chain is
  byte-unchanged.

A regression that flipped one of the five code-only sites from "append the compromise
edge" to "refuse result-first with no edge" (or vice versa) would keep all five green.
Only `finalize` and enlisted `redeem` would catch that class of regression at their own
sites.

## Finding E — a code/spec question for the maintainer, left undecided here

`decline()`'s rung (1) (lines 76–80, quoted under Finding A) runs **before** the
leg-declaration gate at `kernel/decline.ts:96–102`:

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

That gate's own comment (lines 100–102) asserts a byte-identity property: "a non-declaring
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

- **(a) A defect.** The declaration gate's own comment states an unqualified
  byte-identity property ("a non-declaring chain stays byte-identical to a pre-decline
  implementation") and this corner falsifies it as stated — either the comment is too
  broad, or the gate is ordered wrong relative to rung (1).
- **(b) SPEC §5 working exactly as intended.** `decline.ts`'s own rung-(1) comment
  attributes the ordering to "SPEC §5: verification is first" — the same principle SPEC
  §5 states for `seal()`'s ladder: "Verification is first: a record whose chain fails
  verification refuses `chain-compromise` and can never be sealed — so a compromised
  record never reaches `retired`, and its lawful disposal is a host-side act outside the
  library (§13)" (`docs/concept/SPEC.md:446–449`). Under this reading, chain integrity is
  checked before ANYTHING else, including whether the seam is even declared, by design
  across every seam in this build — and the declaration gate's comment is simply scoped
  more broadly than it should be, not evidence the ordering itself is wrong.

No adjudication is taken here. Finding E gets no deferral-register row — see "Register
rows opened by this record" below for why.

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
   test, pinning `(1) beats (2)` the way `findings-seams.test.ts:190` does for its own
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

**Finding E gets no row.** It is a question for the maintainer to adjudicate, not work
being deferred — there is no future increment whose landing would "close" it the way a
register trigger closes a row; adjudicating it is itself the closing act, and that act is
a decision, not a build.
