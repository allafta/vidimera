# The next phases

This document is a **roadmap**: what gates the next cut and why, never how — no
implementation plan lives here. It is derived from three sources, read whole rather than
sampled: `docs/process/deferral-register.md`'s six live rows, `docs/concept/OPEN-QUESTIONS.md`
(sealed, read-only — quoted here, never edited), and `docs/process/implementation-status.md`'s
"Still outstanding" and "The package is unconsumable today" sections. Nothing below is
invented; every register row, quote, and section number is checked against those sources at
write time. `docs/process/implementation-status.md` stays the authoritative account of what
has landed — read it for the record; read this document for what comes next.

## What is done

The eight-step build order (`docs/concept/SCOPING-GUIDE.md` §7) is complete: all eight steps
are exited, the last of them — recovery, live capture, AL2 detached signing whole, and the
operator-assurance self-test tier — settling at the self-test-tier increment's own fix wave,
commit `84484ba`. `docs/process/implementation-status.md` carries the step-by-step account
and is this repository's authoritative record of what landed; this document does not restate
it. What landed is bounded exactly where the concept says it should be — the embedded,
operator-only scope `docs/concept/CONCEPT.md` §3 and `docs/concept/CONTROLS.md` §1 declare —
and "What is deliberately outside the scope" below says so in the concept's own words.

## What gates the next cut

Six deferral-register rows survive the build order. All are pre-0.1/1.0 hygiene or
proof-structure gates that outlive the build order **by design**, never unfinished
build-order work (`docs/process/implementation-status.md`'s own boundary paragraph draws the
same line). Each item below names its row and quotes its trigger verbatim.

### Consumability — register rows 1 and 6

- **Row 1** — deferred item: "Publish tooling (build, versioning, release) for the record
  package". Trigger (verbatim): "First external consumer, or the 0.1 cut".
- **Row 6** — deferred item: the pre-0.1 API naming review "over the whole public surface —
  **every** name `packages/record/src/index.ts` re-exports, values and types alike, read as
  the vocabulary an adopter has to learn" — deliberately left uncounted in the register itself
  ("the file's own export list, counted at review time rather than snapshotted here, is the
  review's scope"). Trigger (verbatim): "The 0.1 cut".
- **What done would look like:** `packages/record/package.json` gains a real `exports` map —
  today it carries exactly five fields (`name`, `version`, `private: true`, `type`,
  `description`; no `exports`, `main`, `types`, `files`, or `scripts`) — pointing at a built
  artifact, a build step that produces that artifact, and a completed pass over every value
  and type `index.ts` currently re-exports, with the asymmetry the row already flags
  (`SignatureReport` unexported where the same-shaped `ChainVerifyReport` is) resolved or
  ratified in writing.

### The server-SQL backing — register row 15

- Deferred item: the third of SPEC §12's reference backings — "a server-SQL store
  (production, multi-connection-safe)" — deferred at step 2's own exit, with two of the
  three (in-memory, embedded-SQL) held equivalent by the backing-parameterized conformance
  suite plus the cross-backing byte-identity test.
- Trigger (verbatim): "The first multi-operator consumer, or the 0.1 cut — whichever lands
  first".
- **What done would look like:** the row's own three-part shape — a third backing (an adapter
  package or module) wired into the existing conformance suite by one caller file, a third leg
  added to the cross-backing byte-identity test, and real multi-connection contention coverage
  that neither existing backing (`store/memory.ts`, `store/sqlite.ts`) can express.

### The token seams' `tx?` — register row 16

- Deferred item: `beginRedemption`/`completeRedemption` (`kernel/redeem.ts`) take no `tx` —
  deliberately: SPEC §12's `tx` seam states its purpose as the co-located direct shape, and
  §11.2 defines the token shape by "no transaction is shared".
- Trigger (verbatim): "The first host architecture that needs it, or the 0.1 cut —
  whichever lands first".
- **What done would look like:** an additive, optional trailing `tx?` on both seams — the
  direct shape's `redeem(recordId, content, tx?)` already has one — giving an enlisted token
  issuance or completion the same host-transaction atomicity, and shrinking the crash-strand
  window between the append and the token's return.

### The Biome migration — register row 5

- Deferred item: `biome migrate --write` to clear the deprecated `linter.rules.recommended`
  field in `biome.json` — the dry-run against biome 2.5.6 confirms one hunk,
  `"recommended": true` becoming `"preset": "recommended"`.
- Trigger (verbatim): "The next commit that edits `biome.json` for any reason, or the Biome
  major release that removes the field — whichever lands first. RETRIGGERED: this said "next
  housekeeping commit", which fired at least twice in the step-1 branch (`8369051`,
  `d8c02e5`) with nobody noticing, because nothing marks a commit as housekeeping. A trigger
  naming a specific file cannot fire silently — the same defect that got row 7 retired only
  after its own trigger had already fired".
- **What done would look like:** `biome migrate --write` run in the same commit as the next
  `biome.json` edit, clearing the deprecation info from `pnpm lint`'s output.

### The workspace-shape gate — register row 4

- Deferred item: generalize the root `typecheck` script beyond `packages/record`, and declare
  per-package test-runner devDependencies rather than relying on the root's.
- Trigger (verbatim): "Second workspace package lands".
- **What done would look like:** `pnpm-workspace.yaml` already globs `packages/*`; `packages/`
  holds exactly one package today. Once a second lands, the root `typecheck` script covers
  every workspace package and each package declares its own test-runner devDependency instead
  of inheriting the root's.

## What is deliberately outside the scope

**AL3 anchoring (documented-only).** `docs/concept/SPEC.md` §14: "AL3 — Anchored (documented
upgrade only) [SKETCHED]. External anchoring of chain heads in an independent append-only
log — anchored history verifiable against a log the operator does not solely control, for
key-holding insiders and long-horizon disputes. Documented so the honesty gradient is
complete; not an active level." Nothing the build order landed touches it.

**Concurrent legs (out pre-1.0 by declaration).** `docs/concept/SPEC.md` §1: "Legs conclude
in configured order; concurrent legs are out of scope pre-1.0." `docs/concept/OPEN-QUESTIONS.md`
§8 carries the same declaration and names what a future revision admitting them would reopen:
"exclusivity semantics per leg, prior-reference shape (a set, not an ordered list), and the
SoD comparison base."

**Capabilities meaningful only with an outside party.** The concept's own purpose statement
draws the line (`docs/concept/CONCEPT.md` §3): "The operator who runs the application is the
sole consumer of the records; everything that exists only for an outside party is out of
scope." `docs/concept/CONTROLS.md` §1 names what that excludes concretely: "Capabilities
meaningful only with an outside party (conformance claims *as claims*, assessor
re-verification, published report and waiver formats, external anchoring as an active level)
are **out of scope by design**: the operator is the records' sole consumer (`CONCEPT.md` §3)."
`docs/concept/SCOPING-GUIDE.md` §1's tier test ties the exclusion to the concept's anti-goals
directly: a capability meaningful "only with an outside party" — its own examples are
"conformance claims as claims, assessor re-verification, published report formats, waiver
signing/publication, external anchoring as an active level" — "is not built, and cutting it
is recorded per anti-goal #4," `docs/concept/CONCEPT.md` §7's own rule: "Cut in writing,
never silently. Out-of-scope material may be removed, but every removal is recorded — what
was cut, why, and how it could be recovered or re-derived — so scope loss is always a
deliberate, documented act." No step of the completed build order reversed that line.

## The genuinely open questions that remain

`docs/concept/OPEN-QUESTIONS.md` is the sealed set's own inventory of undecided points.
Sections §1, §3, §4, §5, and §7 each now carry a "**Decided (this build):**" tail on every
one of their sub-questions and are CLOSED — they do not appear below. The remaining sections
carry no such tail:

- **§2 — The policy-gate reverse cross-instance direction.** A record opened under a
  policy-declaring profile, then finalized under a same-id non-declaring instance: fail-close
  in code, or ratify the skip as by-design with the recorded `profileDigest` as compensating
  audit trail. "Recommendation on record: fail-close" — recorded as a recommendation, not
  (in this document) a decided tail.
- **§6 — Registry candidates not minted.** Whether `unknown-staged`/`unknown-record` — today
  loud caller-error throws — become coded refusal-registry outcomes for hosts that want them
  across a process boundary where the throw boundary is awkward: "Not minted; the caller-error
  posture is the decision of record."
- **§9 — Store interface freeze.** "The store contract's *behaviors* are stable; its method
  signatures are explicitly provisional pre-1.0." Whether the meta-object form (`{ nonTerminal,
  dueAt? }`) is final, and whether a driver-generic transaction type parameter survives, is
  "a 1.0 gate."
- **§10 — Long-horizon items named in the assurance ladder.** AL3 anchoring's own interval and
  disclosure design is undesigned because the level is inactive, not merely undocumented: "it
  activates only with a threat model where even key custody is in doubt." (Its present,
  inactive status is quoted above under "outside the scope"; the design questions for the day
  it activates are what remain open here.)

§8 (concurrent legs) also carries no tail, but is addressed above under "What is deliberately
outside the scope" rather than repeated here: the section itself frames concurrent legs as a
pre-1.0 declaration already made, not a decision pending now.

## The disciplines that outlive the build order

- **The sealed set stays sealed.** `docs/concept/` is read, quoted, never edited — outside the
  tier-test and promotion-rule machinery `docs/concept/SCOPING-GUIDE.md` §§1–2 define. The
  maturity-marker moves the build order made (SPEC §10.2's nine `[DESIGNED]` tokens at step 7;
  SPEC §14's AL2 bullet, and later its freshness tail, at step 8) were each an explicit,
  per-increment authorization, recorded at the increment that earned it
  (`docs/process/implementation-status.md`'s step-7 and step-8 rows). That authorization was
  spent at the increment it covered; it licenses no further edit on its own strength — a new
  edit needs a fresh, explicit sanction through the same machinery.
- **The contract scan.** `pnpm contract-scan` (`scripts/contract-scan.mjs`) runs before any
  commit touching markdown or TypeScript; measured clean (exit 0, no output) against the
  current tree.
- **Byte-stability pins and adjacent-pair gate-order tests** — e.g.
  `packages/record/test/byte-stability.test.ts` — from the kernel increment on, on every
  gate-ladder change.
- **The register's own trigger rule.** `docs/process/deferral-register.md`'s own header:
  "every deferral carries the trigger that un-defers it. An entry leaves this table only when
  the behavior lands or the deferral is explicitly retired." That rule governs every row in
  "What gates the next cut" above.
- **Where the increment history lives.** `docs/superpowers/specs/` and
  `docs/superpowers/plans/` carry one spec/plan pair per increment, named by the increment it
  served; `docs/analysis/2026-08-03-step-1-review.md` is the one historical review artifact
  outside that pair structure.
