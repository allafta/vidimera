# Truth repairs — design

**Date: 2026-08-22.** **A maintenance increment. No sanction is needed and none is
sought.** Nothing in `docs/concept/` moves, no maturity marker moves, and no capability is
promoted. The increment lands no new behavior — which is precisely why it can earn no
marker move: `docs/concept/SCOPING-GUIDE.md` §7's spec-moves-to-truth rule moves a marker
only when behavior lands, and repairing a comment is not behavior landing.

## The gap, stated from the code

This repository's posture is that a documentation claim is a thing that can be true or
false. `CONTRIBUTING.md`'s hard rule 9 binds editorial voice to comments and API names,
not only to prose; `docs/concept/CONCEPT.md` §5's honesty discipline is the reason.

The ten rows below assert a state the tree left behind. Nine sit in tracked source
comments and test headers; one sits in the increment record (`docs/superpowers/INDEX.md`
— the increment record, not a `docs/process/` living record; `CONTRIBUTING.md`'s own
"Where things live" table keeps the two distinct).

Each row was verified against the tree at design time. Line numbers drift; the repair
re-locates each claim by content, and re-verifies it before touching anything.

| # | Site | Asserts | The tree says |
|---|---|---|---|
| 1 | `packages/record/src/probes/index.ts` (header) | three claims: the manifest "declares no `exports` field at all"; wiring a subpath is register row 6's pre-0.1 work; and a published consumer reaches this module by "the package's own file path" | the manifest declares `exports` with both `.` and `./probes`; row 6 retired 2026-08-19; and `files: ["dist", …]`, landed in the same commit as the map, makes the deep-import route impossible |
| 2 | `packages/record/src/index.ts` (header) | `./probes` "lands with the exports map itself (publish tooling, deferral register row 1)"; and the header's FIRST line calls the file "the single `.` export" | it landed 2026-08-19; row 1's remaining scope is the release workflow's first exercise, not the map; and the manifest declares a two-entry map, so line 1 is falsified by the same commit |
| 3 | `packages/record/src/index.ts` (the `MemoryStore` block) | "Chain/encoding internals stay unexported" | the same file exports `transitionDigest` from `./chain/encoding.js` |
| 4 | `packages/record/src/store/memory.ts` (`MemoryStore` doc comment) | chain/encoding internals "remain unexported", naming `transitionDigest` explicitly | same export; `@vidimera/store-postgres`'s `PostgresStore` imports `transitionDigest` from the package entry point, which is its only route to it |
| 5 | `packages/record/test/public-surface.test.ts` (header) | "no exports map exists yet, so a subpath cannot" | the map exists and carries the subpath |
| 6 | `packages/record/src/operator-surface.ts` (the FILE HEADER's `verifySignatures` paragraph — not the interface member's own doc comment lower down, which makes the same folding claim without a count), plus the same count in `packages/record/test/signing-enforce.test.ts`'s header and in `docs/process/implementation-status.md`'s present-tense capability sentences | "the SIX verification sites" | seven sites invoke `signatureLayerHolds`: `finalize`, `decline`, `findings-seams`, `prior-legs`, `redeem`, `seal`, `supersedes` |
| 7 | `packages/record/src/config.ts` (the GOVERNED message doc comment) | the message head is "byte-preserved (pinned by `construction-validation.test.ts`)" | that file names the head in its own header and in two `assert.doesNotMatch` negatives, which assert a STRUCTURAL error is not the governed string. Nothing asserts a governed throw does match the head, so nothing preserves it |
| 8 | `packages/record/src/kernel/finalize.ts` (`appendChainCompromise` doc comment) | enumerates its callers: `seal`, `redeem`, `beginRedemption`, `completeRedemption` | two further callers exist and are unnamed: `kernel/decline.ts` and `kernel/findings-seams.ts` |
| 9 | `packages/record/src/config.ts` (`validateProfile`'s doc comment — ONE block, opening above the numbered list and closing immediately above the function) | the numbered ladder "Order: 1…8"; rung 6 names five per-leg validators and says "all five after"; and the block's AL2-freshness tail names two generic `governedUnavailable` throw sites, "neither of which names a single not-yet-enforceable field" | the body runs three steps the numbered list never reaches — `validateResultDeclaration`, the profile-level `signing`-must-be-literal-`true` check, and the per-leg `validateDecline`; the leg loop runs SIX validators after `validateLeg`, not five; and `governedUnavailable` has four call sites, which this same file's own comment above `governedUnavailable` already states ("None of these four"). The file contradicts itself, two against four |
| 10 | `docs/superpowers/INDEX.md` | "**Counted at write time:** 24 files in `specs/`, 27 in `plans/`"; and `docs/analysis/` "holds one file", then names it, links it, and explains its role | at design time: 30 tracked files in `specs/` (28 at `HEAD`, plus this document and its sibling, already staged), 31 in `plans/`, 16 in `docs/analysis/` — and EIGHT tracked files are named nowhere in the table. Every count here is a design-time observation that this increment's own files move again |

The five validators rung 6 does name are correctly named there; row 9 is not about them.

## What produced them, named once

Nine of the ten are one defect wearing nine faces: **a capability's blast radius reaches
comments in files the capability does not touch.**

Rows 1, 2 and 5 were falsified by one event — the packaging increment adding the `exports`
map, and in the same commit the `files` array that stops `src/` from being published at
all. Rows 3 and 4 by the adapter-author-surface amendment inside the phase-4 increment
(`bb87ad0`), which exported `transitionDigest` so a conforming `Store` author could reach
it — not, as is easy to assume, by the pre-0.1 API review. Row 6 by the
recorded-human-decline increment adding a seventh site. Row 8 has been stale since
`970d837` (2026-08-17, the findings flow), two increments earlier than row 6. Row 9 by the
effect-result increment adding `validateResultDeclaration`, on top of an
already-uncorrected count. Row 10 has been stale since the day after it was written.

**Row 7 is excluded from that count deliberately.** It is a different defect: not a claim
falsified by later work, but a claim that was never true — a pin asserted to exist that
never did. It is repaired here alongside the other nine, and named apart because
mis-filing it would repeat in miniature the error this increment exists to correct.

`docs/process/next-phases.md` already names the prose-enumeration form of this defect and
says why nothing catches it: neither `pnpm contract-scan` nor `pnpm api-sync` reads a
prose enumeration, "so the increment's own sweep is the only defense there is." Rows 1–6
and 8–9 are the same defect one level down, inside code comments, where that sentence
applies verbatim.

## Rulings taken (at the 2026-08-22 brainstorm), so they are not re-litigated

- **Repair in place; do not delete.** Each comment carries real explanation alongside its
  false claim. The explanation survives; only the claim is corrected.
- **Re-verify every row against the tree at repair time.** This document's inventory is
  evidence, not authority. A row that no longer reproduces is itself a finding, recorded
  rather than acted on — the rule this repository applies to every count it publishes,
  including the ones in this document.
- **Only the countable claim gets a gate.** Rows 1–9 are prose; gating them would mean
  inventing a comment-assertion machinery this repository has no use for. Row 10 is
  countable and has been stale since the day after it was written: the count sentence was
  authored once and never re-measured, and `INDEX.md`'s own next edit added a table row
  without touching it.
- **Gating the count retires its hedge.** "Counted at write time" is an honest disclaimer
  for an ungated number and a false one for a gated number. The gate makes the count live,
  so the hedge goes in the same commit.
- **The gate is modeled, not invented.** `scripts/docs-index-sync.mjs` follows
  `scripts/api-reference-sync.mjs` in structure: one direction, pure functions plus a
  `main()`, silent exit 0 when clean and one finding per line with exit 1 when not, an
  explicit bounds comment, and the `process.argv[1]` guard so importing the module does not
  run the gate. It gets its own test in `scripts/test/`, per `CONTRIBUTING.md`'s rule for
  gate scripts — note that `smoke-pack.mjs` has none, so "as both existing gates do" would
  be the wrong generalization.
- **Row 7 is corrected, not satisfied.** The honest alternative is to add the pin the
  comment claims exists. Ruled: correct the comment here. Adding a pin asserts the head
  SHOULD be byte-preserved, which is a decision about the GOVERNED message contract and
  belongs with that question. The corrected comment says the head is unpinned, plainly.
- **No citation targets change.** Several of these comments cite SPEC sections. The repairs
  correct claims about this repository's own tree, never a citation's target.

## Scope bounds — what this increment does not do

- It does not touch `docs/concept/`, and it moves no maturity marker.
- **It changes no library behavior.** `packages/record`'s 48 test files and
  `packages/store-postgres`'s 4 report the same test counts before and after. The suite
  TOTAL does move, and must: `vitest.config.ts` globs `scripts/test/**/*.test.mjs` into the
  `record` project — which is why the present 54 is 48 + 4 + 2 — so the new gate's own test
  makes it 55. The new totals are measured once at exit and carried into the
  `54 test files, 751 tests` sentences in `CLAUDE.md` and
  `docs/process/implementation-status.md`, which carries them twice, in the same commit.
- It does not sweep prose enumerations in `docs/concept/SPEC.md`, `README.md`,
  `CHANGELOG.md` or `docs/guide/` — the separate discipline `docs/process/next-phases.md`
  names, which needs its own increment and, where it reaches the sealed set, its own
  sanction.
- It does not add a gate for rows 1–9.
- It does not renumber or restructure `INDEX.md`'s table. Row 10 is a data repair whose
  SIZE is set by the gate, not by this document: every file then present in `specs/` and
  `plans/` gets a row — the three post-build-order increments' six spec/plan files, plus
  this increment's own pair and the byte-regression-pins pair.
- **These are scope bounds, not deferrals, and are argued as such rather than given
  register rows.** `CONTRIBUTING.md`'s hard rule 7 puts consciously deferred work in
  `docs/process/deferral-register.md` with the trigger that un-defers it. Nothing here is
  postponed with intent to do it later: the row-7 posture is a decision, and rows 1–9 are
  ungateable by design rather than ungated for now. A register row requires a trigger, and
  none of these has one.

## The gate's own bounds, stated before it is written

`docs-index-sync.mjs` proves two things and no more: that `INDEX.md`'s stated counts match
the number of tracked files on disk, and that every file in `specs/` and `plans/` is named
somewhere in `INDEX.md`. It does **not** prove a row is accurate — a row carrying the wrong
date, the wrong increment name, or the wrong build-order step passes. This is the same
presence-only posture `api-reference-sync.mjs` states for the same reason, and it goes in
the script's header so a green run is never mistaken for coverage.

## Risk, and how it is held

- **The contract scan is the live hazard, not the tests.** Rewriting a comment can trip
  `codeOnlyPatterns` — the bare word `design` (everything but "by design"), the bare word
  `slice`, the task-numbering pattern — none of which any test would catch.
  `pnpm contract-scan` runs before each commit, per the standing discipline.
- **The citation resolver's blind spot cuts both ways, with carve-outs.** A letter or digit
  between a `SPEC §N` citation and its quotation ends attribution and silently removes that
  quotation from the gate — but the pattern admits an optional possessive and ONE optional
  sub-reference token (`C\d+`, `#\d+`, `§N`, `reads`, `says`), so `SPEC §4's "…"` and
  `SPEC §12 C3 "…"` keep attribution. A rewritten comment can de-gate its own citation
  while the scan stays green; repairs keep each citation adjacent to its quotation.
- **Adding a gate falsifies seven live enumerations, and they move in the same commit.** An
  eighth root script and a sixth `checks` step contradict: `CONTRIBUTING.md`'s fenced
  seven-gate list and its `scripts/` table row ("the contract scan, the api-reference drift
  gate, the tarball smoke test"); `CLAUDE.md`'s Commands list and its separate
  CI-description sentence; `README.md`'s dev block; `docs/process/release-checklist.md`'s
  single-line gate command; and `.github/workflows/release.yml`'s gate block, whose own
  comment — "Every gate the repository has" — makes the completeness claim explicit in a
  workflow that stays unexercised until the 0.1 cut, so nothing would catch the lie until
  release day. `.github/workflows/ci.yml` is wiring rather than a claim and moves with
  them. Separately, `docs/process/next-phases.md` carries a present-tense sentence that
  `contract-scan` and `api-sync` "are both silent on this class of drift", which a
  docs-index gate makes over-broad; it is narrowed rather than enumerated.
  Nothing scans a prose enumeration — this increment would otherwise create exactly the
  defect class it exists to close. The count was wrong twice while this document was being
  written: first at four sites including `docs/README.md`, which carries no gate list at
  all, then at six, missing `release.yml`. The defect is easy to commit even while writing
  about it.
- **Row 7 sits inside the construction-guard layer** `CONTRIBUTING.md`'s hard rule 5
  governs. The repair changes the comment's claim about test coverage only — never
  `governedUnavailable`, never the message, never a guard. `governedUnavailable` is live at
  four call sites and is not dead code.
- **Rows 3 and 4 are load-bearing for an adapter.** `PostgresStore` reaches
  `transitionDigest` through the package entry point. The repair corrects the comments to
  describe that route; it does not change what is exported, which would be a public surface
  change and a different class of increment entirely.

## Exit

The increment exits when: every row above is repaired, or recorded row by row as
no-longer-reproducing in this increment's section of `docs/process/implementation-status.md`;
`scripts/docs-index-sync.mjs` and its test exist, are wired into the root scripts and CI's
platform-independent `checks` job, and pass; the enumerations that adding a gate falsifies
move in the SAME commit that wires it; and `pnpm test`, `pnpm typecheck`, `pnpm lint`,
`pnpm contract-scan`, `pnpm api-sync` and the new gate are all green with the new test
counts measured and recorded. The `implementation-status.md` edit is proposed explicitly
in the PR description rather than slipped in.
