# Parked truths — design

**Date: 2026-09-02.** **A truth-repair increment over four parked items. No sanction is
needed and none is sought.** Nothing in `docs/concept/` moves, no maturity marker moves,
no register row or checklist box moves. Three items were parked with rulings by the
registry-hygiene increment's whole-branch review (2026-09-01) and one by the
truth-restoration increment's final review the same day; the session ledgers that first
recorded them are deleted per that process's own discipline, so this document is their
durable statement. One `packages/*/src/` edit changes an adopter-visible ERROR STRING
(item C) — the same last-chance-before-0.1 logic both parent increments ran on: after the
publish, that string is immutable for 0.1 and matched on by adopters. Everything else is
comments, one documentation sentence, and two test assertions.

## The four items, verified against `main = 740a0aa` on 2026-09-02

**A — `construction-validation.test.ts` speaks of the current throw in the guard era's
vocabulary.** The registry-hygiene sweep's grep patterns (`governedUnavailable`, the full
old head) could not see bare-word mentions, and five present-tense sites survived it:
`:15` ("a DIFFERENT (non-GOVERNED) error"), `:23` ("the generic unknown-key GOVERNED
throw that SURVIVES this file's own sweep"), `:75` (the `assertStructural` docstring
"(NOT the GOVERNED string)" — directly above an assertion that now checks
`/unknown option key/`), `:636` (the section banner "not the GOVERNED string"), and
`:638` (a test title "(NOT the GOVERNED string)"). The file's other sixteen bare
`GOVERNED` mentions are past-tense narration — the header's guard-era history, the
INVERTED-at-increment records, the `:102` section banner naming the era those records
document — and STAY.

**B — `CLAUDE.md`'s measured sentence is stale.** Line ~31 says "67 test files, 821
tests, zero skips"; the suite has measured 832 since the truth-restoration increment, and
this increment's own pin moves it again. The sentence's neighboring parenthetical was
updated by the registry-hygiene increment while the test figure two clauses earlier was
outside that envelope — a half-updated sentence, which is worse than a stale one.

**C — `beginRedemption`'s unknown-option-key tail needs a charitable reading.**
`kernel/redeem.ts`'s shared `validateRedeemOptions` mints
`` `${seam}() accepts only tx and result in this build. Contract: §11.2, §12.` `` for all
three redemption seams — but `beginRedemption` never accepts a `result`: the key loop
admits it and the very next check refuses it unconditionally at issuance, with its own
richer message ("opts.result is not admitted at issuance…", which is true and stays).
An adopter reading the unknown-key string alone is told issuance accepts a key it always
refuses. The parent review called the sentence defensible-but-loose and noted it acquires
0.1's immutability; this increment makes it exactly true instead.

**D — the key-retirement pin counts orphans outside the register's vocabulary.** The
truth-restoration increment's key-retirement baseline
(`no-edge-containment.test.ts`) proves one-orphan-per-refusing-call by
`listByRecord().length` growth against a flat chain — semantically equivalent, but the
register and the sidecar-orphans report speak in `verifySignatures().orphans`. The
parking ruling said: add the report-vocabulary assertion at that file's next touch. This
increment takes the trigger deliberately rather than waiting for an accidental touch.

## Rulings taken (2026-09-02, in the scoping session), so they are not re-litigated

1. **Item C exits by a per-seam tail split, both variants pinned.** `beginRedemption`'s
   unknown-key tail becomes its own true sentence (exact strings below);
   `redeem`/`completeRedemption` keep the current one, whose reading is exact for them.
   The dedicated issuance-refusal message for a PRESENT `result` is already true and does
   not change. The new `beginRedemption` tail gets an anchored positive pin (the same
   `/^Error: …/` form the registry-hygiene increment established); the existing
   `redeem()` tail match (`effect-result.test.ts` ~:107) already pins the shared variant
   and stays.
2. **Item D rides this increment.** Its trigger was "the file's next touch"; taking the
   trigger on purpose beats waiting for an incidental edit, and the assertion is one
   line inside the existing BASELINE test — reporting vocabulary only, still no
   containment claim of any kind (row 22a unchanged, said here so nobody reads the
   stronger assertion as movement).
3. **The vocabulary rule for item A** (the same rule the registry-hygiene sweep applied,
   now extended to bare words): past-tense narration of the guard era — the INVERTED
   records, the header history, the `:102` era-naming banner — stays verbatim;
   present-tense descriptions of the CURRENT thrown string move to unknown-option-key
   vocabulary. Exactly five sites move (listed above); the plan carries a per-hit table
   of all twenty-one and the account records it.
4. **Item B's figures are measured at exit, never copied** — including from this
   document. The test total moves with this increment's own pin, so any number written
   here would be stale on landing; the rule is the content, the exit measurement is the
   value. The sentence's other figures (`refusal-codes.ts`'s count, the four throw
   sites) are re-measured in the same pass.

## The permitted edit envelope, stated as a STOP

- `packages/record/src/kernel/redeem.ts` — `validateRedeemOptions`'s tail string only:
  the loop, the admitted keys, the throw sites, and the issuance-refusal message are all
  unchanged. Any other `packages/*/src/` edit is a STOP.
- `packages/record/test/construction-validation.test.ts` — the five item-A sites
  (comments, one docstring, one banner, one test title; no assertion logic).
- One new anchored pin for the `beginRedemption` tail — the plan locates the natural
  file (`redeem-token.test.ts` holds the seam's tests; `effect-result.test.ts` holds the
  sibling tail pin) and the pin must be shown to fire.
- `packages/record/test/no-edge-containment.test.ts` — item D's assertion added inside
  the existing key-retirement BASELINE test; no new test, no fixture change.
- `CLAUDE.md` — the measured-claims sentence only.
- Exit records: `docs/process/implementation-status.md` (the increment's account
  section), `CHANGELOG.md` `[Unreleased]` (item C is adopter-visible and goes under the
  same `### Changed` discipline the registry-hygiene head change used),
  `docs/superpowers/INDEX.md`.
- **STOP, absolute:** `docs/concept/**`, `docs/guide/**`,
  `docs/process/deferral-register.md`, `docs/process/release-checklist.md`,
  `.github/**`, both manifests, `packages/record/test/byte-stability.test.ts`, every
  existing `PINNED_` literal.

## Item C's exact strings

`validateRedeemOptions`'s tail becomes seam-dependent:

- `beginRedemption`:
  `` `beginRedemption() accepts only tx in this build — a result is refused at issuance and belongs to completeRedemption (SPEC §11.2). Contract: §11.2, §12.` ``
- `redeem` / `completeRedemption` (unchanged):
  `` `${seam}() accepts only tx and result in this build. Contract: §11.2, §12.` ``

Read the seams' whole sentences after the change, per the registry-hygiene review bar:
for `beginRedemption`, an unknown key like `nope` now gets a sentence that is true of the
seam (only `tx` is honored; a present `result` is refused by the arity check with the
dedicated message, which the tail now points toward); for the other two seams nothing
moves. The new pin asserts the anchored head-plus-tail form at the `beginRedemption`
seam; the key loop still `continue`s on `result` for all three seams, so passing
`result` to `beginRedemption` still produces the DEDICATED refusal, never the
unknown-key one — assert that adjacency too (one `assert.rejects` on each side), so the
two messages' division of labor is pinned, not narrated.

## Item D's exact assertion

Inside the key-retirement BASELINE test's per-call loop, after the sidecar-growth
assertion:

```ts
    const report = await rig.handles.operator.verifySignatures(recordId);
    assert.equal(report.orphans.length, call, 'the report names each minted orphan');
```

`rig.handles` (full verifier registry) rather than the retired instance, so the read is
the operator's ordinary audit read; `orphans` is derived chain-vs-sidecar and
verifier-independent either way. The existing `listByRecord` growth assertions stay —
the two counts agreeing is the point.

## Verification

- **Gates, all green at exit:** typecheck (both packages), the full test run, lint:strict,
  contract-scan, api-sync, docs-index-sync, build, and smoke — item C changes a shipped
  string, so the full set runs, smoke included, per the standing rule both parent
  increments ended on.
- **The new pin fires** (anchored red-first against the current shared tail, or a
  deliberate-break check — the plan picks the honest one given the string exists only
  after the split).
- **Item A's per-hit table** (all 21 bare-`GOVERNED` mentions, five moved, sixteen ruled
  to stand with their tense named) goes in the account.
- **Item B's sentence is re-measured at exit** — the test total after this increment's
  own pin lands, the refusal-code count from the registry itself.
- **Item D's two counts agree** in the same loop, same run.

## Out of scope, deliberately

- Any containment for key-retirement minting (item D strengthens reporting vocabulary
  only; row 22a's scope and trigger are untouched).
- The `redeem`/`completeRedemption` tail wording — exact as it stands.
- Every other stale-comment candidate in the tree: this increment closes the four PARKED
  items, and nothing else; a broader comment sweep would be its own scoped pass.
- `docs/guide/` — none of the four items appears in the publish-facing docset (the guide
  documents the options bags behaviorally, not by error-string).

## Exit

The account lands in `docs/process/implementation-status.md` (its own section: the four
items with their parking provenance, the per-hit table, the measured figures, the
pinned strings), `CHANGELOG.md` gains its entries (item C under `### Changed`, the rest
under `### Fixed`), and `docs/superpowers/INDEX.md` gains the row. The implementation
plan follows at `docs/superpowers/plans/2026-09-02-parked-truths.md`.
