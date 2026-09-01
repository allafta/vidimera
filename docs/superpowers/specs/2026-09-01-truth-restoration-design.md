# Truth restoration in shipped source and tests — design

**Date: 2026-09-01.** **A truth-restoration increment. No sanction is needed and none is
sought.** Nothing in `docs/concept/` moves, no maturity marker moves, no capability is
promoted, and the public surface does not change (`pnpm api-sync` is unaffected and
`docs/guide/` is untouched). The increment's whole claim: every stale sentence the tree
ships or asserts about itself becomes true, and every cheap claim that can become a test
does. One `packages/*/src/` edit is behavior-adjacent (`kernel/expiry.ts`'s leg-index
derivation) and is required to be output-identical; everything else is comments and tests.

**Where this sits.** This is step 1 of the revised pre-cut sequence
(`docs/analysis/2026-09-01-zero-one-cut-gaps.md` §5), assembled from the 2026-08-30
sweep's "increment 1" and its section 9
(`docs/analysis/2026-08-30-pre-release-code-gaps.md` §§2, 9), scoped and approved
2026-09-01. It does not gate the cut — but the sentences it repairs ship in the tarball's
`dist/*.js` under the provenance attestation (the gaps record's §2.3 correction: the
JavaScript carries the comments; the `.d.ts` files do not), so a first adopter reads them.
Catalogue item numbers below (item 11, item 22, …) resolve in the 2026-08-30 sweep.

**The register delta: none.** No deferral-register row moves, no checklist box is ticked,
and nothing here decides any of the release-day rulings. Item 40 lands as a *baseline pin
only* — row 22a's scope, trigger and pre-argued carry-forward ruling are all unchanged.

## Rulings taken (2026-09-01, in the scoping session), so they are not re-litigated

1. **Item 23 rides this increment, not the adapter-evidence increment.** The Postgres
   payload-posture test proves a claim whose comment ships in the attested tarball
   (`packages/store-postgres/src/postgres-store.ts:20-24`); reversibility argued its
   phase-4 placement, but a shipped claim should be true before it ships.
2. **The (5)→(6) race pair is added as tests, not recorded-excluded.** The sweep's item 25
   allowed either; `RaceOnceStore` exists (`packages/record/test/helpers/stores.ts:142`)
   and the tests are small, so the excuse recorded in the stale comments is gone either way.
3. **`listDue()` gets the honest note, not a retroactive claim.** The row-6 API review's
   name-by-name pass never mentions `listDue()`
   (`docs/analysis/2026-08-19-phase-1-api-review.md` lists the root exports without it),
   so this increment records that **no recorded ruling covers the name** and dockets it to
   the 1.0 freeze — where the ids-vs-records question (sweep item 56) already lives. It
   does NOT claim the name "retroactively covered by the whole-surface ratification";
   the review's text does not support that.
4. **Item 22's optional Postgres kernel-enlisted leg is deferred** to the adapter-evidence
   increment. This increment's two new enlisted-token tests run over `SqliteStore`,
   mirroring the existing direct-seam test.
5. **Item 40 is pin-only.** Containment of key-retirement minting stays sequenced behind
   the durable `SignatureStore` backing (first post-0.1 increment), per the register.

## The permitted edit envelope, stated as a STOP

- `packages/record/src/` — comment-only edits in `operator-surface.ts`, `id.ts`,
  `store/store.ts`, `refusal-codes.ts`, `kernel/finalize.ts`, `kernel/seal.ts`; ONE
  behavior-adjacent edit in `kernel/expiry.ts` (cluster A5). **Any other
  `packages/*/src/` edit is a STOP.** In particular: if any new test refuses a different
  code than expected or surprises in any direction, that is a finding to report and argue
  — never source to adjust silently so the test passes.
- `packages/record/test/` — the files named in clusters B and C plus cluster A5's new pin
  (it lives with the expiry/clock tests), and helpers if a helper genuinely needs
  extending (argue it in the plan).
- `packages/store-postgres/test/postgres-store.test.ts` — one new posture test (C5).
- `docs/process/implementation-status.md` — ONLY the three named narrative sentences
  (the §9 row's "flagged to" clauses at line ~414, the §10.1 row's residual-index tail at
  line ~423, the over-broad transitionRef sentence at line ~2538) plus this increment's
  own new account section at exit. **The commit-pinned gate blocks in that file are
  untouchable** — they record past measurements and must not be "refreshed".
- `CHANGELOG.md` `[Unreleased]` and `docs/superpowers/INDEX.md` — the increment's record,
  at exit.
- **STOP, absolute:** `packages/record/test/byte-stability.test.ts` (frozen oracle),
  `docs/concept/**` (sealed), `docs/guide/**` (nothing here changes the public surface),
  both `package.json` manifests, `.github/**`, `scripts/**`,
  `docs/process/release-checklist.md`, `docs/process/deferral-register.md`.

## Cluster A — shipped-source comment repairs

Five sites, each verified stale against `main = ead1f0b` on 2026-09-01. The review bar for
every one of them is the sweep's own phrase: *does the changed sentence now match the tree*.

| # | Site | Says today | True instead |
|---|---|---|---|
| A1 | `packages/record/src/operator-surface.ts:34-37` | the three redemption call names are "flagged to the pre-0.1 naming review" | that review is retired: it **ratified** the triad on 2026-08-19 (`docs/analysis/2026-08-19-phase-1-api-review.md` — citing that path from a test/source comment has precedent at `test/public-surface.test.ts:2`) |
| A2 | `packages/record/src/id.ts:17` | `node:crypto` is "the project's runtime baseline (Node >= 24 …)" | the declared floor is Node 22.16 (`engines` in both manifests) |
| A3 | `packages/record/src/store/store.ts:122` | a sync→async flip is anticipated "once a real Postgres adapter lands" | `@vidimera/store-postgres` landed 2026-08-19; reword against the adapter that exists |
| A4 | `packages/record/src/refusal-codes.ts:~210-212` | finalize's "steps (3)-(5.7)" are "the only callers of `appendsOn`" | `decline.ts` also calls it, since the recorded-human-decline increment |
| A5 | `packages/record/src/kernel/expiry.ts:135-136` | `isFinalLeg(0, profile.legs.length)` — a hardcoded leg index fed to the `expired`/`redemption-failed` append's meta | derive the leg index as the sibling producer at `expiry.ts:75` already does (`profile.legs.findIndex(...)`) |

A1 carries two paired documentation edits: the same "flagged to" tense fix in
`implementation-status.md`'s §9 row (which extends the divergence item to `listDue()`),
and ruling 3's dated note recording that `listDue()`'s name has no recorded ruling and is
docketed to the 1.0 freeze.

A5 is the one behavior-adjacent edit and it must be output-identical: both `expired` and
`redemption-failed` are terminal, so the fed `nonTerminal` flag is `false` for every input
under either derivation, and the append's meta is not chained, so no byte pin can move.
What makes the change observable is a **new pin**: a test asserting `nonTerminal: false`
on that append for a final-leg, multi-leg profile — the shape where a hardcoded `0` and
the derived index could ever disagree. `implementation-status.md:423`'s "One residual
hardcoded leg index remains" tail is updated in the same change (the residual is gone).

## Cluster B — test-comment repairs, each paired with the test that makes the repair honest

**B1 — the enlisted-token due-window shape (item 22).**
`packages/record/test/clocks.test.ts:200-202` says the shared prologue's enlisted branch
is reachable only through direct `redeem()` "(the token seams take no tx)" — false since
the effect-result increment: all three redemption seams carry `opts.tx`
(`kernel/redeem.ts` states it at both seams). The repair: rewrite the parenthetical, and
add the two tests whose absence let it stay wrong — `beginRedemption(recordId, content,
{ tx })` against a due `confirmed` record and `completeRedemption(recordId, token,
content, { tx })` against a due `redeeming` record, both over `SqliteStore`, mirroring the
direct-seam enlisted-due test at `clocks.test.ts:195`: assert the due refusal
(`unredeemable-state`), **no edge appended** (enlisted calls must not write through the
caller's open tx on this branch), and that an un-enlisted re-invocation then resolves the
clock. Expected shapes are the plan's to pin by executing first — the memory here is that
seam input shapes get verified by running them, not derived from prose.

**B2 — the (5)→(6) race pair (item 25).**
`packages/record/test/redeem.test.ts:42-43` says the mismatch-plus-racing-writer pair is
"not constructible without a bespoke racing" store — false since `RaceOnceStore`. The
repair on both ladders: fix the comment at `redeem.test.ts:42-43`, fix the deferral note
at `redeem-token.test.ts:585-586`, and add the pair test each ladder lacks — mismatched
content presented while `RaceOnceStore` is armed on the success append
(`confirmed → redeemed` on the direct ladder; the completion append on the token ladder).
**Expected: refusal `effect-mismatch`, and the racer never fires** — correspondence is
checked before the append the racer would intercept, so the pair cell is an ORDER claim,
and the test must assert both halves: the refusal code AND `RaceOnceStore`'s fired-state
staying false (the firing assertion is what makes this a pin on order rather than a pin on
outcome). If the observed refusal differs, STOP: that is a code-vs-record finding to
argue, not an expectation to adjust.

## Cluster C — new evidence tests (the sweep's section 9 conversions)

**C1 — the unknown-profile arms at finalize and seal (item 91).**
`kernel/finalize.ts:209-215` and `kernel/seal.ts:63-67` declare their `unknown-profile`
arms defensive and untested. Add the two tests reusing the established two-instance shape
(`packages/record/test/effect-result.test.ts:237-256`): open (and for seal, confirm) a
record under one `create()` instance, then drive `finalize` / `seal` from a second
instance sharing the store whose profile catalog lacks the `profileId`; assert the
`unknown-profile` refusal and no append. Then delete the two "not exercised" comment
sentences — the repair is licensed by the tests, in the same commit.

**C2 — `transitionRef` equality at the signature-broken seams (item 84).**
Upgrade the nine defined-only assertions to equality with the appended edge's digest,
mirroring `chain-verify.test.ts:165-169`: `signing-enforce.test.ts:181, 365, 402, 438,
475, 502`, `decline.test.ts:136`, `findings-seams.test.ts:234, 256`. The mechanics of
reading the chain head in each fixture are the plan's to verify by executing. Soften
`implementation-status.md`'s over-broad sentence at ~2538 ("no append site ties…") to the
true bound: no *signature-broken cell* did — the general equality was already pinned.

**C3 — the key-retirement orphan baseline pin (item 40, pin only).**
The register's "6 to 13 over eight calls" figure rests on a rig that is gone. Add one
baseline test beside the existing corners in
`packages/record/test/no-edge-containment.test.ts`: construct a healthy, untampered,
**sealed** signing record; drop its `keyRef` from the verifier registry; drive repeated
seam calls; assert the `chain-compromise` refusals and **one sidecar orphan minted per
call** (via `verifySignatures().orphans`). No containment, no source change — the pin
states the growth the register describes so the figure stops resting on nothing.

**C4 — the `magnitude` byte pin (item 90).**
The one post-oracle conditional payload field asserted only absent
(`byte-regression/findings.test.ts:158`). Add one flow raising a finding with `magnitude`
set (`magnitude?: string` on both `FindingRaisedPayload` and `AcknowledgedPayload` in
`types.ts` — string only, verified 2026-09-01; the sweep's "string and/or numeric" hedge
does not survive the type) via the deterministic seams, freezing the resulting canonical
bytes/digest as a new `PINNED_` literal.
`byte-stability.test.ts` is not touched; no existing pinned literal may change.

**C5 — the Postgres payload-posture pin (item 23).**
`postgres-store.ts:20-24` asserts the JCS-invisible-member round-trip behavior "is
therefore exactly `SqliteStore`'s" — untested. Mirror
`packages/record/test/sqlite-store.test.ts:107-125` (function-valued member dropped
consistently with the digest) in `packages/store-postgres/test/postgres-store.test.ts`
against the embedded server. Expected: no source change. If the test surprises, STOP —
whether the comment or the serialization moves is an argued finding, not this increment's
call. Posture stays backing-specific by design; this pins the one backing whose claim is
a comparison to another backing.

## Verification

- **Gates:** `pnpm typecheck && pnpm test && pnpm lint:strict && pnpm contract-scan &&
  pnpm api-sync && pnpm docs-index-sync && pnpm build && pnpm smoke`, all green at exit.
  The reworded source comments must keep `contract-scan` green — its code-only patterns
  (bare `design`, `slice`, foreign labels, abbreviated commit refs) apply to every edited
  `.ts` line, and citations of `SPEC §N` in touched comments must still resolve.
- **Every new pin must be shown to fire.** The standing lesson (a green suite with a new
  branch firing zero times) applies: each new test is broken deliberately once (or carries
  a firing assertion, as B2 does by design) before it is trusted.
- **The A5 edit must be provably output-identical:** the full suite green with no byte-pin
  movement, plus the new `nonTerminal: false` pin.
- **Review bar for every comment edit:** read the changed sentence against the tree it
  describes — the increment fails its own purpose if any repaired sentence is merely
  *differently* wrong.

## Out of scope, deliberately

- The token-vs-content internal order (item 25's first sub-claim): unpinnable by design —
  both checks refuse the same code; stays recorded, not tested.
- Item 22's kernel-enlisted-over-Postgres leg: the adapter-evidence increment's.
- Everything in the registry-hygiene increment (manifest metadata, the GOVERNED message
  head, `@types/node`) — ratified 2026-09-01 but landing in their own increment.
- `acker`/`actor`, ack nesting, `listDue`'s ids-vs-records shape, and every other
  freeze-bound naming question — the 1.0 freeze's, per the sweep's own do-not list.
- Any containment for key-retirement minting; any `SignatureStore` shape change.

## Exit

The increment's account lands in `docs/process/implementation-status.md` (its own
section, plus the three repaired narrative sentences), `CHANGELOG.md`'s `[Unreleased]`
gains its entries, and `docs/superpowers/INDEX.md` gains the plan link beside this
design's row. The implementation plan follows at
`docs/superpowers/plans/2026-09-01-truth-restoration.md`.
