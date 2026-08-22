# Byte-regression pins — design

**Date: 2026-08-22.** **A test-only increment. No sanction is needed and none is sought.**
Nothing in `docs/concept/` moves, no maturity marker moves, no capability is promoted, and
no source file changes. The increment adds absolute byte pins over chain shapes this
repository mints today and does not pin anywhere.

**Landing order: the truth-repairs increment lands first.** This one is written against a
tree that already carries its repairs and its `docs-index-sync` gate, and this increment's
own spec and plan take rows in `INDEX.md` under that gate.

## The gap, stated from the code

`packages/record/test/byte-stability.test.ts` pins four digest literals over exactly one
chain: single-leg, `captureMode:'staged'`, producing
`[opened, consultation-recorded, consultation-recorded, confirmed]`. Its header states the
flow and the compatibility-pin posture; the pinned-baseline comment above the literals,
mid-file, is what states the four-kind shape and cites `docs/concept/DECISIONS.md` #19.

`TransitionKind` (`packages/record/src/types.ts`) is a union of twelve kinds, and the
file's own comment states every one has a real producer in this build. The absolute oracle
covers **three of the twelve**: `opened`, `consultation-recorded`, `confirmed`. Unpinned by
any absolute literal: `refused`, `expired`, `declined`, `sealed`, `finding-raised`,
`acknowledged`, `redeeming`, `redeemed`, `redemption-failed`.

The conditional payload fields are in the same position. The pinned flow declares none of
the conditional-payload features — it declares `expiry: { ttl: 3600 }` and nothing else,
which IS inside literal `[0]` via `profileDigest`, so "declares no features" is the wrong
shorthand for it — and so no conditional payload key appears inside a frozen literal: not
`policyDigest`, `proposedDigest`, `tokenDigest`, `resultDigest`, `priorRecordRefs`,
`priorLegActors` or `supersedes`. Each was added by an increment that landed after the pin
was written.

Two things that look like they close this gap do not:

- **`cross-backing-byte-identity` compares chain against chain.** Memory against Sqlite,
  Memory against Postgres. An encoding change applied uniformly — which is what a change to
  `chain/encoding.ts` or `canonical.ts` is — leaves both sides equal and the comparison
  green.
- **`deriveStagedRef` has no literal pin, and cannot get one from a chain.** It is a store
  key, not a transition. `packages/record/test/content-binding.test.ts` states the position
  in its `deriveStagedRef()` section: none of THOSE tests "ever assert a LITERAL digest
  value (only idempotence/collision-resistance across recomputations)" — and no other test
  in the file does either. It keys `Store.putStaged`, and its input is
  `{contentDigest, profileId, subjectRef, legId}` — a canonicalized object, so a change to
  that shape moves every staged ref in existence, silently.

The practical consequence is a false sentence that is easy to say: *the frozen byte digests
protect the encodings.* They protect the minimal chain. That is exactly what `DECISIONS.md`
entry 19 asks of them, and it is less than the sentence claims.

## The distinction that shapes the design

The four existing literals are **byte-compatibility pins against the reference
implementation this kernel was adopted from**. The file states this directly and then
reasons about what follows: that only the `opened` transition is guaranteed to reproduce by
construction, and that `[1]`–`[3]` reproducing is "a property of THIS kernel's clock-read
pattern matching the source's, not something SPEC requires."

Every field this increment pins was built **here**, past that adoption. There is no source
implementation to be compatible with, so a new literal cannot make the same claim. What it
can make is a different and weaker one: *these bytes, once minted here, do not move* — a
self-regression pin.

Filing a regression pin under a compatibility header would state provenance no evidence
supports. In a project whose first principle is graduated honesty, that is the failure mode
worth designing against.

## Rulings taken (at the 2026-08-22 brainstorm), so they are not re-litigated

- **`byte-stability.test.ts` is not edited — not one byte.** The new pins live in a new
  directory, `packages/record/test/byte-regression/`. This is not merely deference to
  `CONTRIBUTING.md`'s hard rule 4, the pull-request template's own checkbox, and
  `.github/CODEOWNERS` (advisory until the require-review-from-code-owners branch
  protection lands, per its own header); it is the honest filing of two different claims
  under two different headers.
- **The new files are NOT covered by hard rule 4, and their headers say so.** Rule 4 and
  the CODEOWNERS entry both name `byte-stability.test.ts` by exact path; neither reaches a
  new directory. A regression pin is meant to be re-adjudicated when this repository
  deliberately changes an encoding — the OPPOSITE posture from the frozen oracle, which is
  never regenerated. Stating that in each header is what keeps a reader from applying the
  wrong rule to the wrong file in either direction.
- **Harvest-then-pin, unchanged.** Run once with placeholder literals, read the real values
  out of the failure diff, paste them verbatim — the discipline `byte-stability.test.ts`
  already states.
- **A shared seams helper, but never a shared profile.** The directory gets one
  `fixtures.ts` holding the deterministic `{now, mintId, tokenSource}` triple — the three
  injectable knobs `createWithClock(config, now, mintId?, tokenSource?)` carries, and the
  same three `test/helpers/byte-identity-flows.ts` already drives, because `tokenDigest`
  sits inside the `redeeming` and `redeemed` payloads and an undetermined token source
  makes those two families unpinnable. Six copies of the triple would make one fixture edit
  look like six independent regressions.
- **Each family file declares its own profile inline.** A profile's DECLARATIVE bytes are
  inside the digests it produces — `profileDigest` over the data-only projection, written
  into the `opened` payload, with function members stripped by that projection and never
  reaching a digest. The bytes that determine a literal must be readable beside it.
- **`byte-stability.test.ts` never imports `fixtures.ts`.** The dependency runs one way.
  Refactoring the frozen oracle onto shared helpers is the single most natural-looking
  cleanup in this suite and the one that would silently destroy the evidence it exists to
  produce.
- **Seven files, not the six sketched at the brainstorm.** The sketch left `refused`,
  `expired`, `sealed` and `redemption-failed` with no home, which would have left the
  increment carrying the shape of the gap it exists to close.
- **Seven files is still ONE cluster.** `docs/concept/SCOPING-GUIDE.md` §7's one-cluster
  rule is about coherence, not file count: this is one capability — absolute pins over the
  chain shapes this repository mints — added once, in one new directory, under one
  discipline, with one shared fixture. Splitting it per family would produce seven
  increments that each leave the stated gap open, which is the worse artifact.

## The families

| File | Covers | Kinds FIRST reached here (every family's chain also reaches `opened` and `consultation-recorded`) |
|---|---|---|
| `confirm-declaring.test.ts` | a feature-declaring confirm: `policyDigest`, `proposedDigest` | none new — same kinds as the oracle, different payload. That is the point |
| `declined.test.ts` | the recorded human decline | `declined` |
| `redemption.test.ts` | both redemption shapes, direct and token, plus `resultDigest` | `redeeming`, `redeemed` |
| `findings.test.ts` | the findings write side | `finding-raised`, `acknowledged` |
| `multi-leg.test.ts` | `priorRecordRefs`, `priorLegActors`, and recovery's `supersedes` — whose predecessor must be a verified TERMINAL record, minted locally in this file rather than borrowed from the terminals family | none new |
| `terminal-refusals.test.ts` | three unrelated mechanisms under one header, named so the header can still state one claim: the gate ladder's refusal, `kernel/expiry.ts`'s clock-driven lazy append (which must be PROVOKED by a read past the deadline, never called directly), and `seal()`'s state-preserving cap | `refused`, `expired`, `sealed`, `redemption-failed` |
| `staged-ref.test.ts` | `deriveStagedRef` — a store key, not a transition | none; one standalone literal |

## Coverage this adds, stated with its limit

After this increment every one of the twelve transition kinds appears in at least one
absolute literal, and `deriveStagedRef` has one. That is the whole claim.

What it is not: **combination coverage.** Each family pins one flow through its own feature
set, never the cross-product — a declining profile that also declares policy drift and
proposal provenance, a multi-leg record whose second leg redeems with a result. Nothing
here could: the cross-product of the declarable features is large enough that pinning it
exhaustively would be a worse artifact than the gap. A drift that manifests only when two
features interact stays outside these pins, and the headers say so.

Also outside:

- **AL2 signature sidecars.** `transitionDigest`'s input is
  `{recordId, seq, at, kind, payload, prevHash}` — no signature field. Signatures are
  detached by construction, so no chain pin reaches them. This one is genuine future work
  with a real trigger (a fixed key pair), so it gets a `docs/process/deferral-register.md`
  row rather than an argument.
- **AL2's in-payload `observedAt`, which is a different case.** Unlike a sidecar it IS
  digest-covered: authority timestamps ride inside the digested consultation payload, so
  the recorded claim is digest- and signature-covered both. It is excluded here only
  because a freshness-declaring profile requires `signing: true`, which drags the sidecar
  problem in with it — not because it is out of reach.
- **The GOVERNED construction message head.** Named in the truth-repairs increment's row 7
  and deliberately left unpinned there — a repair that has not landed at the time of
  writing, so `config.ts` still claims the head is pinned. It is not a chain byte and does
  not belong here.

**Combination coverage is a permanent scope bound, not a deferral**, and takes no register
row: `CONTRIBUTING.md`'s hard rule 7 requires a trigger that un-defers, and there is none —
the argument above is that nothing here could close it, at any future date.

## Risk, and how it is held

- **A pin freezes whatever is there, including a bug.** This is the honest limit and it
  goes in every header: these literals prove non-drift, never correctness. If an encoding is
  wrong today, this increment freezes it wrong and makes the wrongness visible only as a
  future conflict. That is still worth having — a silent change and an adjudicated one are
  different things — but it is not the stronger claim.
- **First authoring fails by design, and that is the discipline working.** Harvest-then-pin
  means each new file is red once before it is green. A red run mid-increment is the
  intended path, not a defect.
- **Both increments move `pnpm test`'s totals, so neither may pin the other's figure.** The
  truth-repairs increment moves them by exactly one gate test in `scripts/test/`, which
  `vitest.config.ts` globs into the `record` project; this one by seven pin files and their
  tests. The base here is whatever the tree reports once truth-repairs has landed, measured
  then — and both `CLAUDE.md` and `docs/process/implementation-status.md` carry a file
  count in the same sentence as the test count.
- **Zero skips still binds.** A family that turns out not to be constructible as scripted is
  not parked with `.skip` — it is either built, or recorded as a deferral with the trigger
  that un-defers it, per the register's own rule.
- **`pnpm contract-scan` reads these as tracked TypeScript, line by line.** Its eight
  `codeOnlyPatterns` run over every LINE of a tracked `.ts` file — test names, `describe`
  labels and string literals included, not only comments, which matters across seven new
  test files. Live for this work: the bare word `design` (with "by design" excluded), the
  bare word `slice` (the left guard keeps `.slice()` legal), and the task-numbering
  pattern. The headers will carry `SPEC §N` and `DECISIONS.md #N` citations, which the
  resolver checks: the section must exist, and any quotation attributed to a citation must
  occur in the document, adjacent to it.

## Exit

The increment exits when: all seven files exist with harvested literals; every one of the
twelve transition kinds appears in at least one absolute literal and `deriveStagedRef` has
one; `byte-stability.test.ts` is byte-identical to its pre-increment state, verified by
diff and not by inspection; the AL2-sidecar register row is written; and `pnpm test`,
`pnpm typecheck`, `pnpm lint`, `pnpm contract-scan`, `pnpm api-sync` and
`pnpm docs-index-sync` are green with the new counts recorded.
`docs/process/implementation-status.md` gains an increment section, proposed explicitly.
