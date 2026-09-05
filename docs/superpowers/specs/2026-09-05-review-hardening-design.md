# The review-hardening pass — design

**A post-build-order increment (no step). No sealed-set edit, no marker move, no new refusal
code, no public-surface change. Sanction: none needed, and none claimed.**

**Status at write time (2026-09-05).** Design approved in conversation on the owner's "do as
recommended"; nothing implemented yet. Branch `review-hardening-2026-09-05`, to be cut from
`main` at `ad97401`.

## 1. What this increment answers

An external code review of the tree at `ad97401` reported seventeen findings. The reviewer
stripped every comment and JSDoc from the source before reading and excluded `docs/`
entirely, so the review saw the code's behavior and none of the record behind it. Every
finding was verified here against both — the code by execution, the record by citation —
before this design was written. The full triage is the dated analysis record this increment
also lands, `docs/analysis/2026-09-05-external-code-review.md`; this document carries only
what the increment builds and why.

The triage's outcome, in one paragraph: nine findings restate rulings already recorded (three
of the reviewer's recommendations would reverse a sanctioned ruling or repeat an approach the
repository measured and rejected); two restate recorded horizon items; one is real and
sanction-gated; five are new, small, and consistent with the repository's own rules. This
increment builds the five, lands the cheap mitigation for the sanction-gated one, and records
the rest where the repository keeps such things.

## 2. Rulings taken

1. **Construction is loud, finished for the shapes the review named.** SPEC §9.1: "inert or
   contradictory feature combinations are construction errors." `config.ts` already rejects,
   for a non-TypeScript caller, a missing or non-array `allowedAuthorities` and non-string
   members; it does not reject a `captureMode` outside its two values, an `ackMode` outside
   its three, an `expiry` that is neither `'none'` nor an object, a `sod` without a
   `notActorOf` array, an empty profile or leg `id`, or a `legs` that is not an array. Two of
   those fail as raw `TypeError`s from destructuring; the rest construct. The worst of them,
   an unrecognized `ackMode`, falls through `ackCounts` to the permissive `'any'` branch — a
   silently weakened gate, the fail-open direction. All become construction errors with the
   file's own `invalid profile '<id>': …` message shape.
2. **`terminalRefusals` rejects what can never take effect.** `appendsOn` consults the leg's
   list only after the compromise class, the availability class, and the fixed never-appends
   set have each returned; a member drawn from those returns nothing. SPEC §8 names exactly
   two legal-but-inert members, `leg-expired` and `availability`, and those two stay
   constructible — the reviewer's recommendation to reject `availability` is declined on the
   sealed text. Every never-appends member, `chain-compromise` (appends regardless of any
   listing), and a duplicate become construction errors. The `appendsOn` unit pins that hand
   the pure function a leg literal listing a never-appends code stay as they are: they pin the
   function's own override, which construction now makes unreachable through `create()` but
   which stays true of the function.
3. **One clock read for the redemption prologue's clock rung.** `kernel/redeem.ts`'s shared
   prologue reads the clock once for the enlisted due-guard and again for `resolveDueClock`.
   An enlisted call whose window's deadline falls between the two reads passes the guard and
   then resolves — appending a clock edge through the store's own transaction path while the
   host's transaction is open on the same connection, which the embedded backing rejects with
   a throw. The window is sub-millisecond and reached only with a `tx`; the fix is one `Date`
   taken once and handed to both. Finalize's several reads are out of scope here and recorded
   beside catalogue item 38, the ladder extraction, as the place a single-read discipline
   would land whole.
4. **A canonicalizer is total, and the code says so.** `isValidFacts` catches a
   canonicalization throw on `facts.figures` and reads it as a present-but-unusable payload
   (`consultation-missing`, open by default). The content path at finalize, decline and the
   three redemption seams does not catch: a host canonicalizer that throws propagates, and
   nothing is appended. Measured this session: finalize rejected with the host's own error and
   the chain stayed at length one. The asymmetry is deliberate and is kept: figures are
   caller-supplied DATA whose canonicalizability is a property of the data, while the
   canonicalizer is the host's CODE, registered at construction, and its failure is a
   configuration fault — the class SPEC §8 and DECISIONS.md #11 route to a loud throw, never
   to an appended edge that would read as evidence about the content. This increment states
   the contract at the `Canonicalizer` type and in the guide, and pins the posture: a throwing
   canonicalizer at finalize and at decline throws through, appends nothing, leaves the record
   `open`. Pinned as a bound, green from the first run — nothing here changes behavior.
5. **The verifier contract gains its operational consequence in the guide, not a new
   outcome.** A throwing or failing `Verifier` is unverified, and an unverified transition of
   a signing record is `chain-compromise` at every enforcement site — decided at the AL2 mint
   and enforce increments, recorded in OPEN-QUESTIONS §1's key-custody tail, and documented at
   `docs/guide/api-reference.md`'s "answers the literal `true`" paragraph. What that paragraph
   does not say is what follows for a verifier that can fail transiently, or for a retired
   key. Two sentences say it now: retry inside the verifier rather than throw; keep a retired
   key's verifier registered for as long as any record signed under it may be touched. An
   `unavailable` route for the signature layer — the reviewer's structural recommendation —
   would widen SPEC §8's producer list for the availability class and touch §14 and
   OPEN-QUESTIONS §1's decided tail, so it goes to `next-phases.md`'s sanction-gated list, the
   fifth entry, not into this increment.
6. **Four nits land because they are free and behavior-preserving.** `consultations.ts`'s
   `as never` cast becomes the `as IdentityAssertion` its sibling site in `finalize.ts`
   already uses; `canonical.ts` allocates one `TextEncoder` at module load instead of one per
   call; `probes.ts`'s signature-tamper probe replaces its `AAAA` prefix — a no-op on a
   signature that already begins with those four characters, once in roughly sixteen million
   runs against a real signer — with a first-character flip that always changes the string;
   `expiry.ts`'s two reversed-copy scans become the index loop `redeem.ts` already uses. The
   frozen byte-stability pins are the proof that none of the four moved a byte.

## 3. What is deliberately NOT in this increment

- **No sealed-set edit.** Rulings 1 and 2 implement SPEC §9.1's existing sentence; ruling 2
  respects SPEC §8's two-member legal-but-inert enumeration verbatim. Ruling 4 states a
  contract SPEC §3 already implies. Nothing in `docs/concept/` moves.
- **No reopening of `createWithClock`** (review §5.4). Decided at the pre-0.1 API review and
  restated in the guide as a decision of record; the owner chose not to reopen it here. The
  analysis record notes the reviewer's argument for the day a host demand arrives.
- **No `busy_timeout` on `SqliteStore`** (review §5.7). The backing is single-operator by
  recorded bound (catalogue item 175); a timeout would imply the multi-connection support the
  repository does not claim or test. The bound's DOCS half is open — the guide's "Choosing a
  store" section never says single-operator — and one sentence closes it here.
- **No adapter change** (review §5.16). The `due_at` index, the doubled `#validateTx` round
  trip on an enlisted batch, an opt-out for the lazy DDL, and the undocumented isolation
  assumption are all real and all post-0.1; they widen deferral register row 23's inventory,
  the increment that has the adapter open, and land nowhere else.
- **No transition-legality table in `replay`** (review §5.12). It pulls against the fold's
  own "fidelity, not validity" argument and would change an exported audit function's
  behavior on foreign chains. Recorded as a 1.0-review consideration in `next-phases.md`.
- **No finalize/decline extraction** (review §5.5). Catalogue item 38, horizon, effort L.
- **No freshness skew tolerance** (review §5.10). A future `observedAt` refuses by the AL2
  freshness design's own ruling; a tolerance knob is a profile-table question.
- **Nothing on §§5.2, 5.6, 5.13, 5.14, 5.15** and the three by-design nits — each restates a
  recorded ruling; the analysis record cites where.

## 4. Inversions

None expected. No pinned assertion changes its truth value: the `appendsOn` unit pins keep
their leg literals (ruling 2); every existing profile fixture uses a legal shape; no test
counts clock reads in the redemption prologue; the four nit sites have no pins of their own
beyond the byte-stability oracle, which must stay untouched and green. If execution finds a
pin that flips, the plan stops and the flip is argued at the pin and numbered in
`implementation-status.md`'s sequence before it lands.

## 5. Pins this increment adds

In `packages/record/test/construction-validation.test.ts` (rulings 1 and 2), red first:

- each of the twelve never-appends codes in `terminalRefusals` throws at construction;
- `chain-compromise` in `terminalRefusals` throws;
- a duplicate member throws;
- `['leg-expired', 'availability']` still constructs (the boundary, green before and after);
- `captureMode` outside `'staged' | 'live'` throws;
- `ackMode` outside its three values throws (with `requiredAcks` present, so the
  both-or-neither rule is not what fires);
- `expiry: undefined` and `expiry: null` throw a construction error whose message begins
  `invalid profile`, never a `TypeError`;
- `sod: {}` likewise;
- an empty profile `id`, an empty leg `id`, and a non-array `legs` each throw.

In `packages/record/test/clocks.test.ts` (ruling 3), red first: an enlisted `redeem` on
`SqliteStore` under a clock whose first read inside the call sits one millisecond before the
confirmed window's deadline and whose later reads sit after it. Before the fix the call
throws from the embedded backing's nested `BEGIN`; after it the call returns `ok`, the
redeemed edge lands inside the host's transaction, and the chain head is `redeemed`.

In a new `packages/record/test/canonicalizer-totality.test.ts` (ruling 4), green from the
first run and said so in its header: a canonicalizer that throws on the finalize content
throws through `finalize()` and through `decline()`, appends nothing, leaves the record
`open`; the header cites `facts.test.ts`'s BigInt pin as the other side of the asymmetry.

## 6. Documents this increment moves

- `docs/guide/api-reference.md`: the `ConfirmProfile`/`LegSpec` annotations name the new
  construction errors; the `Verifier` paragraph gains ruling 5's two sentences.
- `docs/guide/integrating.md`: the "Canonicalizers" rules of thumb gain a totality bullet;
  the `SqliteStore` bullet states the single-operator bound.
- `CHANGELOG.md` `[Unreleased]`: one Changed entry (construction loudness, the canonicalizer
  contract, the guide sentences) and one Fixed entry (the redemption prologue's clock read,
  the probe's tamper).
- `docs/process/deferral-register.md` row 23: a dated widening of its adapter inventory.
- `docs/process/next-phases.md`: the sanction-gated list gains the signature layer's
  `unavailable` route; a short paragraph records the two post-0.1 considerations.
- `docs/process/implementation-status.md`: a new post-build-order increment section.
- `docs/analysis/2026-09-05-external-code-review.md`: the triage record, all seventeen
  findings with verdicts and citations.
- `docs/superpowers/INDEX.md`: the row for this pair; the three counts.
- `CLAUDE.md`: the measured suite count.

## 7. STOP envelope

`docs/concept/**` is not touched. `packages/record/test/byte-stability.test.ts` is not
touched. `packages/record/src/index.ts` and both surface interfaces are not touched (no
export moves, so `pnpm api-sync` is a check, not an edit). `packages/store-postgres/**` is
not touched. No push.

## 8. Exit

All gates green on the closing commit — `pnpm typecheck`, `pnpm lint:strict`, `pnpm
contract-scan`, `pnpm api-sync`, `pnpm docs-index-sync`, `pnpm test:ci` with
`scripts/ci-assert-tests.mjs` — with the figures written from the run's own output. The
branch stays unmerged and unpushed; both are owner acts.
