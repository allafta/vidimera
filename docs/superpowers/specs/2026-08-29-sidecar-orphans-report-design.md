# Sidecar orphans report — design

**Date: 2026-08-29.** **An observability increment. No sanction is needed and none is
sought.** Nothing in `docs/concept/` moves, no maturity marker moves, and no capability is
promoted. One field is added to one provisional report type; no gate, no append, no deletion
and no admission decision changes. Verify at implementation time that no `docs/concept/` text
enumerates `SignatureReport`'s fields — SPEC §14 describes detached signing and never the
report's shape — rather than trusting this sentence.

**The permitted edit envelope, stated as a STOP.** One `packages/*/src/` behavior change:
`packages/record/src/kernel/verify-signatures.ts` (the `SignatureReport` type and the
`layerVerdicts`/`verifySignatures` pair). One `packages/*/src/` comment change:
`packages/record/src/operator-surface.ts` (the `verifySignatures` doc comment). Two guide
documents. **Any other `packages/*/src/` edit is a STOP** — in particular
`signatureLayerHolds` must stay byte-identical, and `packages/record/src/signing/*` is not
opened.

**The register delta: none — and that is the point.** Row 22 keeps its number, its scope
(22a, orphan accumulation) and its trigger. This increment does NOT close 22a and must not be
read as doing so; its containment inventory gains two entries, one landed and one identified,
and the release checklist's expected ruling for the row becomes "carry forward, with the
growth visible". Every sentence written into the report's doc, the guide or the record must
be readable as REPORTING, never as containment.

**Where this sits in the row-22 line of work.** The row-22 truth repairs corrected the record;
the sidecar contract stated the implementer's obligation to tolerate and prune orphans; the
no-edge containment closed the redundant-signing half and pinned why the orphan half cannot be
closed from inside the append path. This increment is the smallest honest next step the
brainstorm of 2026-08-29 ranked first: make the orphans the contract already delegates
VISIBLE, so a host can discharge the obligation with a read the library already performs.

## The gap, stated from the code

`packages/record/src/signing/store.ts`'s `SignatureStore` doc now tells an implementer that
orphans exist and are safe to prune when no chain transition references them (the sentence
wraps a doc-comment line, which is why it is paraphrased here rather than quoted), and
`docs/guide/integrating.md` tells a host that "a durable backing that must stay bounded has
to reconcile against the chain itself". Neither says HOW a host learns which entries those
are. The only library read that touches the sidecar is `verifySignatures`, and it already
computes the answer and throws it away.

| # | Site | Says / does | What is true instead |
|---|---|---|---|
| 1 | `kernel/verify-signatures.ts`, `layerVerdicts` | reads `listByRecord(recordId)` once, builds `byDigest`, walks the chain, and reports a verdict per CHAIN transition | Every sidecar entry whose digest the walk never visits is an orphan by definition, and the map already holds them. The set difference is available in the same pass at zero additional reads; today it is computed implicitly and discarded |
| 2 | `SignatureReport` (`kernel/verify-signatures.ts`), quoted verbatim in `docs/guide/api-reference.md` | `{ recordId, signingDeclared, transitions[] }` — per-transition sign/verify status, and nothing about the sidecar beyond the chain | The report is the operator's one audit surface over the AL2 layer and says nothing about the one AL2 cost register row 22 keeps open |
| 3 | `docs/guide/api-reference.md`'s orphan paragraph and `docs/guide/integrating.md`'s limits bullet | state the obligation to reconcile against the chain | Neither names a read that yields the entries to prune. A host is told to do something the library gives it no direct way to do |

**Both readers of the sidecar stay chain-driven, and this must be said precisely.** The
verdicts are correlated chain→sidecar, exactly as before. The orphan set is DERIVED from the
sidecar — orphans exist nowhere else — but it is used for nothing: no verdict reads it, no
gate consults it, `signatureLayerHolds` never sees it. Reporting a set is not correlating
through it.

## Rulings taken (at the 2026-08-29 brainstorm), so they are not re-litigated

1. **Digests, not a count.** `orphans: Digest[]`. A host prunes by digest; a count would leave
   the guide's obligation as unactionable as before. Full `SignatureEntry` rows are not
   returned — `listByRecord` already yields them, and the report should carry the minimum that
   makes the obligation dischargeable.

2. **Sorted, so the report is deterministic.** `listByRecord` promises no order and the
   contract permits any. The array is sorted lexicographically by digest. A report that
   changed shape under a legal reordering would be a sidecar-driven artifact of exactly the
   kind the sidecar-contract increment removed.

3. **Zero additional reads.** The set is computed inside `layerVerdicts` from the `byDigest`
   map it already builds. No second `listByRecord`, no second `readChain`. The row's own
   read-amplification finding (every sidecar row is fetched on every verification) is not made
   worse by one byte.

4. **The gate is untouched.** `signatureLayerHolds` consumes only the per-transition verdicts,
   as it does today, and its body is byte-identical at exit. Orphans never gate — pinned by a
   test that finalizes a record carrying a fabricated orphan and gets `ok`.

5. **No probe.** The operator-assurance tier's probe targets quote CONTROLS §4 verbatim and that
   document is sealed; none of its targets describes sidecar reporting. The proof that the
   report is honest lives in the test corpus.

6. **Not a containment, and the record says so in every place it could be misread.** The row
   stays open with its trigger unchanged. The inventory entry reads "observability landed", not
   "contained".

7. **Prune-at-seal is RECORDED as identified, not designed and not built.** It is the one
   horn-free deletion point found — after `seal()`'s CAS lands, C4 admits no further append of
   any kind, so every sidecar entry without a chain counterpart is an orphan forever, including
   a concurrent refusing call's entry whose append is still in flight — but it needs a
   `remove(transitionDigest)` on the provisional `SignatureStore`, which the sidecar-contract
   design's ruling 1 declined, and it bounds only pre-seal orphans while the key-retirement
   shape keeps minting after the seal. It goes in row 22's inventory gated on a durable
   `SignatureStore` backing existing to measure against — one of the row's own trigger
   disjuncts — and its own design, if ever, must re-open that ruling explicitly.

8. **The third-horn sanction is declined at this cut, in writing, in the release checklist.**
   The trade — a lost compromise evidence edge under a real head-rewrite tamper, for bounded
   growth the contract already delegates and this increment makes visible — is not taken by
   default. The row's sanction disjunct stays as the door.

## What lands

- `packages/record/src/kernel/verify-signatures.ts` — `SignatureReport` gains
  `orphans: Digest[]`; `layerVerdicts` returns the set alongside the verdicts, computed from
  `byDigest` minus the chain's digests, sorted; `verifySignatures` carries it into the report.
  The doc comment states what the field is, what it is not (no verdict, no gate), and why it
  is sorted.
- `packages/record/src/operator-surface.ts` — the `verifySignatures` doc gains one sentence
  naming the field and its limit.
- `packages/record/test/sidecar-orphans-report.test.ts` — new. Built on
  `enforceableSigningSetup` and `breakOneSignature`:
  - a clean signing record reports `orphans: []`;
  - after the already-refused corner — break one signature, `finalize()` once to LAND the
    compromise edge, `finalize()` again to refuse with no edge — the report names exactly one
    digest, absent from the chain, equal to the sidecar entry whose `seq` is
    `chain.length + 1`;
  - **orphans never gate**: an OPEN record with a fabricated orphan entry `put` into its
    sidecar still finalizes `ok`, and its `transitions[]` verdicts are deep-equal with and
    without the orphan;
  - determinism: under an adversarial `listByRecord` order (an orphan-first wrapper in the
    shape `sidecar-ordering.test.ts` uses) the report names the fabricated digest and the array
    is sorted;
  - a non-signing record on an instance without `config.signing` reports `orphans: []`.
- `docs/guide/api-reference.md` — the quoted `SignatureReport` block gains the field with its
  comment, diffed against the source by hand; the orphan paragraph says which read yields the
  entries to prune.
- `docs/guide/integrating.md` — the limits bullet gains the same pointer, in its own voice,
  together with the concurrency caveat: prune from a report only when no seam call on that
  record is in flight, because an in-flight append's entry and an orphan carry the same
  `seq`.
- `docs/process/deferral-register.md` — row 22's containment inventory gains "(observability,
  LANDED)" and "(prune-at-seal, IDENTIFIED, gated)" entries; scope, trigger and every other
  clause byte-identical, proved by the whitespace-collapsed trigger comparison.
- `docs/process/release-checklist.md` — the row-22 item's expected ruling becomes "carry
  forward, with the growth visible", and states the third-horn sanction is declined at this
  cut unless sought on its own merits.
- `docs/process/next-phases.md` — one sentence in the row-22 passage.
- `docs/process/implementation-status.md` — the increment section (twelfth post-build-order),
  and the present-tense counts.
- `CLAUDE.md` — the State paragraph's counts, if they move.
- `docs/superpowers/INDEX.md` — this pair's row and both counts, in the same commit as the
  `git add`.

## Coverage this adds, stated with its limit

A host can now discharge the contract's prune obligation with a read the library already
performs: `verifySignatures(recordId).orphans` names exactly the entries that are safe to
delete. The row's "observability" cost becomes a number.

**The limits, stated in the same breath:**

- **22a is not closed.** Orphan accumulation continues at one entry per refusing call. The
  report shows it; nothing here stops it.
- **The read is per record.** A host with many records still has to know which records to
  ask about; the report gives no cross-record view, and adding one would be a new surface
  this increment does not open. `listDue`-style sweeps are out of scope.
- **The report is as fresh as the read.** An orphan minted by a refusing call that completes
  after the host's `verifySignatures` returns is not in that report. A host pruning from a
  report must accept that the next refusing call may mint another; the report is a
  reconciliation input, not a lock.
- **Deleting what the report names is still the host's act**, with the host's own race
  discipline: a `put` for a legitimately in-flight append carries `seq = chain.length + 1`,
  exactly what an orphan carries, so the host's pruning must not run concurrently with seam
  calls on that record. The guide says so.
- **Behavior on a durable `SignatureStore` backing stays UNMEASURED** — the report was
  exercised against `MemorySignatureStore` only.
- **No probe covers it**, by ruling 5.

## Risk, and how it is held

- **Drifting from reporting into gating.** The temptation is to have `signatureLayerHolds`
  refuse when orphans exceed some bound, or to have a seam warn. Neither happens: the gate's
  body is proved byte-identical at exit, and the never-gates pin holds.
- **A sidecar-driven artifact sneaking back in.** The array's ORDER is the only place the
  sidecar's own ordering could leak; ruling 2 sorts it, and the adversarial-order pin proves
  the report is identical under a legal reordering.
- **`api-sync` gates presence only.** The quoted `SignatureReport` block must be diffed against
  the source by hand; a wrong quote has no gate behind it.
- **Markdown is citation-checked by nothing.** Every quoted phrase written into the guide or
  the record is hand-verified against a whitespace-collapsed copy of its source.
- **The contract scan runs over every line of a tracked `.ts` file.** New comments avoid the
  bare word that names a design document, the bare word for a work slice, task-numbering
  forms and hex-shaped tokens.
- **`byte-stability.test.ts` cannot move** — no chain bytes change — and is proved untouched by
  `git diff` at exit rather than by inspection.
- **The record must not oversell.** Every sentence about this increment in the register, the
  checklist and the status doc is checked against ruling 6 before commit: reporting, not
  containment.

## What stays outside, and why

- **Closing 22a.** No candidate off the third horn; the sanction is declined at this cut.
- **Prune-at-seal.** Recorded in the inventory as identified; needs its own design, a
  re-opened ruling, and a durable backing to measure against.
- **A `remove`/prune method on `SignatureStore`**, for the same reason.
- **A cross-record orphan sweep** or any new read surface beyond the one field.
- **A probe**, by ruling 5.
- **Any change to `signatureLayerHolds`, the seams, or the decorator.**

## Exit

The increment exits when: `SignatureReport.orphans` is present, sorted, computed at zero
additional reads, and carried by `verifySignatures`; the never-gates pin, the already-refused
pin, the adversarial-order pin, the clean-record pin and the non-signing pin all pass;
`signatureLayerHolds`'s body is proved byte-identical by `git diff`; the two guide documents
carry the field and the pointer with the interface quote diffed against its source by hand;
row 22's inventory carries both entries with its scope and trigger proved unchanged; the
release checklist's ruling is restated; the increment's section is written in
`docs/process/implementation-status.md` and proposed explicitly in the commit body;
`docs/superpowers/INDEX.md` gains this pair's row with both counts moved in the same commit as
the `git add`; and `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm contract-scan`,
`pnpm api-sync` and `pnpm docs-index-sync` are green with the new figures measured at exit
rather than carried forward.
