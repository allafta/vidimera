# Session 6 — the small postures, four rulings in one record

**Date: 2026-08-20.** The open-items plan's stage-3 batch session
(`docs/process/open-items-plan.md`; session 6 of
`docs/process/open-items-sessions.md`), in the phase-0-decisions shape: several small
rulings, one dated record. Each posture was undecided-by-silence — unusual in a
repository that records every other bound it accepts — and each now closes by decision,
two by record alone and two by landed edits.

## Ruling 1 — no coverage metric, on the record

No coverage tooling, no configuration, no CI gate — now deliberate rather than silent.
The suite's disciplines are behavioral (zero skips, backing-parameterized conformance,
byte-stability pins, the can-fail requirement), and a line-coverage percentage would
have measured the wrong thing here: the known blind-spot class — probes able only to
pass — executes its pass-path lines under test, so line coverage would have read near
full while the trap stood. The honest nuance in the same breath: **branch** coverage of
the probes' failure arms could have hinted at it, so the posture carries two named
triggers rather than a closed door: (1) the stage-6 can-fail design session may adopt
branch coverage as a one-off discovery aid for unexecuted failure arms; (2) re-look if
a shipped regression is one a coverage number would plausibly have flagged.

## Ruling 2 — no benchmarks pre-1.0, on the record

No benchmark, perf test, or throughput documentation exists; now recorded as the
deliberate skip it was. The hot paths, named so the skip is informed: the per-append
`FOR UPDATE` row lock and the per-(profile, subject) advisory genesis lock in
`packages/store-postgres/src/postgres-store.ts`; and the O(chain) whole-chain verifies
on the gate ladder — bounded in practice by deliberately short chains, which is a
design property, not a measurement. Triggers: the first consumer-reported latency
concern, or the stage-7 bench-suite candidate if it is ever selected. The limit: an
unmeasured bound is a belief; this record makes it a stated belief, not a number.

## Ruling 3 — both workflows SHA-pin their actions

`ci.yml` and `release.yml` pinned all three actions by mutable major tag; `release.yml`
holds `id-token: write` and the npm token, which makes a mutable pin a supply-chain
exposure in the one workflow that publishes. **Landed with this record:** all three
actions in both workflows pin to full commit SHAs with version comments —
`actions/checkout` at v7.0.1, `pnpm/action-setup` at v6.0.10 (the annotated tag's
peeled commit), `actions/setup-node` at v7.0.0 — resolved from the actions'
repositories at ruling time. Dependabot's weekly actions group updates SHA pins the
same way it updates tags, so the posture carries no ongoing cost. One posture for both
workflows, deliberately: two pinning disciplines in one repository would need its own
explanation forever.

## Ruling 4 — the 13 Biome infos are cleared, not carried

All 13 were `lint/style/useTemplate` (string concatenation where a template literal is
preferred) across five test files, every one a mechanical rewrite producing an
identical runtime string. **Landed with this record:** the 13 rewrites, so `pnpm lint`
reports nothing and any future info is signal rather than the fourteenth line of
standing noise. The frozen byte-stability test was not among the five files and is
untouched. The declined alternative — recording the infos as accepted — was honest but
left every future info hiding among them.

## Closing acts

The two edit-bearing rulings landed in this record's own commit (workflow pins; the 13
rewrites, with the suite re-run proving nothing moved); the two record-only rulings
close by this document; the open-items plan's stage-3 third, fourth, fifth, and eighth
checkboxes tick.
