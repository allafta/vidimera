# First public release — the phase-by-phase brainstorm agenda

**Date: 2026-08-18.** This document is a working agenda: the phases between the completed
eight-step build order and a first public release, each phase carrying the questions its
own brainstorming session must answer before any of its work is designed or built. It was
derived from `docs/process/deferral-register.md`'s six live rows,
`docs/process/implementation-status.md`'s "The package is unconsumable today" and "Still
outstanding" sections, `docs/process/next-phases.md`, and a fresh survey of the tree on the
date above.

**What this document is not.** It decides nothing and moves nothing. The deferral register
stays the ledger of deferred work and the only place a deferral is retired or re-scoped;
`docs/process/implementation-status.md` stays the authoritative account of what is built;
`docs/process/next-phases.md` stays the roadmap of what gates the next cut. Where this
document and any of those disagree, this document is stale and they win. Every count below
is a measurement dated 2026-08-18 with a shelf life and no way to fail loudly — re-measure
at use, never trust a number here over the tree.

---

## The framing decision everything hangs on

Three register rows fire on "the 0.1 cut" by their own verbatim triggers (rows 1, 15, 16 —
row 6 on the 0.1 cut alone). Cutting 0.1 therefore fires, at once: publish tooling, the
API naming review, the server-SQL backing, and the token seams' `tx?`. Making the *repo*
public and publishing the *package* are different events with different bars — the repo's
own docs already state "pre-0.1 and unpublished" honestly, so a public repo is nearly ready
today, while a published package pulls in phases 1 through 4 whole. Phase 0 exists to take
that decision first, because it sizes every phase after it.

---

## Phase 0 — Release-shape decisions

**Goal.** Answer the questions that determine what "first public release" means and how
large the remaining phases are. No code moves in this phase; its output is decisions,
recorded where each decision's own machinery says (register edits in the register,
sealed-set matters only under a fresh sanction through `docs/concept/SCOPING-GUIDE.md`
§§1–2).

**Brainstorm agenda:**

1. **What event is the release?** Repo-public with an honest pre-0.1 status, or an npm
   publish of `@vidimera/record` at 0.1? If both, in which order, and how far apart?
2. **Row 15's fate at 0.1.** The server-SQL backing's trigger (verbatim): "The first
   multi-operator consumer, or the 0.1 cut — whichever lands first". As written, a 0.1 cut
   fires it, and it is the largest single item on the board. Either it is built (phase 4,
   with the CI-hosting question that raises), or its trigger is deliberately re-scoped —
   an explicit register edit under the register's own rule, never a silent skip.
3. **`node:sqlite` in a public 0.1.** The module is experimental at the declared floor;
   this repository suppresses its ExperimentalWarning in its own test runner
   (`vitest.config.ts` `execArgv`), but a consumer sees the warning raw. Ship `SqliteStore`
   as-is with the caveat stated, label it an experimental backing, or split it out — noting
   a split creates a second workspace package and fires register row 4.
4. **Project identity under Apache-2.0.** No copyright holder is named anywhere: the root
   `LICENSE` is the stock text with its notice appendix left as boilerplate, there is no
   NOTICE file, and neither `package.json` carries `license`, `author`, or `repository`.
   Decide the holder, and whether the npm scope for `@vidimera/record` is registered and
   published with public access.
5. **A sealed-set corrective sanction: yes or no.** The observations held for the owner
   (listed at the end of this document) predate this agenda; going public means strangers
   read the concept set with those divergences standing. One deliberate sanction pass
   through the SCOPING-GUIDE machinery, or publish with the divergences standing as
   recorded findings — either is honest; only one can be chosen.
6. **`CLAUDE.md`'s public posture.** It is tracked, agent-facing, and the one file the
   contract scan exempts. Keep, trim, or drop before public eyes — a deliberate call
   either way.
7. **Security contact enablement.** `SECURITY.md` routes reports through the repository
   host's private vulnerability reporting — a repository *setting*, not a file, and its
   documented fallback asks a reporter to open a public issue. Enabling the setting is a
   release action no file change can substitute for.

**Done looks like:** each question above has a written answer — in the register where it
re-scopes a row, in this directory or `docs/process/` otherwise — before phases 1 and 4
are designed.

---

## Phase 1 — The API-surface freeze (register row 6)

**Register row 6** — the pre-0.1 API naming review over the whole public surface. Trigger
(verbatim): "The 0.1 cut". The row's own rule governs this phase's scope: the file's
export list, counted at review time, is the review's scope — never a snapshot carried
elsewhere. For sizing only, measured 2026-08-18: `packages/record/src/index.ts` exports
28 names (5 values — `create`, `canonicalize`, `digest`, `MemoryStore`, `SqliteStore` —
and 23 types), behind which sit 20 surface methods (4 on `AgentSurface`, 16 on
`OperatorSurface`) and the 24-member `RefusalCode` union.

**Not built / unresolved today:**

- **Types named in public signatures a consumer cannot spell.** `OpenOptions`,
  `FinalizeOptions`, `FindingInput`, `AckInput`, and — the asymmetry row 6 itself
  records — `SignatureReport`, which `verifySignatures` returns while the same-shaped
  `ChainVerifyReport` is exported. The register carries the pattern-reading (input/hook
  shapes stay internal; produced reports export); the review resolves or ratifies it in
  writing.
- **The signing tier is entirely unexported** (`SigningConfig`, `Signer`, `Verifier`,
  `MemorySignatureStore`, `withSigning`) — `docs/guide/integrating.md` currently and
  honestly instructs a deep import of `src/signing/memory.js`. **The probes tier likewise**
  (`src/probes/`: `runProbes`, `ALL_PROBES`, the report types) — reachable only from this
  repository's own tests.
- **`create` returns an unnamed inline shape** `{ agent, operator }` — no exported name
  for the handle pair.
- **The `terminalRefusals` silent mismatch** (recorded in
  `docs/process/implementation-status.md`'s exit adjunct, deliberately outside the
  register): a member that is not a real refusal code constructs without error and then
  never matches, so a leg the operator believes is configured terminal is not. A
  construction-time validation would fit the feature-guard tradition; the decision belongs
  here because it changes the constructor's contract.

**Brainstorm agenda:**

1. Single `.` entry preserved (today's deliberate shape — the agent/operator split is a
   runtime capability split, not a module split) versus subpath exports for signing and
   probes? The answer shapes phase 2's `exports` map directly.
2. Each unexportable-but-referenced type: export, rename-then-export, or ratify internal
   with the reason argued at the site?
3. The `redeem` / `beginRedemption` / `completeRedemption` triad — this build's own names
   against the spec's single seam: ratify or rename, before the names are load-bearing for
   an adopter.
4. `replay`/`verifyChain` unexported from `index.ts` against SPEC §5's "The library exposes
   two functions" — an owner-held sealed-set item (the reference implementation's later
   head reads the wording the same way this build does); the review either exports them or
   records the ratified reading.
5. The sealed set's OPEN-QUESTIONS §6 (registry candidates not minted:
   `unknown-staged`/`unknown-record` stay loud caller-error throws — "the caller-error
   posture is the decision of record"): ratify at 0.1 or mint.
6. How loudly do `Store`, `MemoryStore`, `SqliteStore` carry their existing "PUBLIC BUT
   EXPLICITLY UNSTABLE PRE-1.0" marking in published types and docs? (The signature freeze
   itself is OPEN-QUESTIONS §9's declared 1.0 gate — out of scope here; only the marking's
   visibility is a 0.1 question.)
7. `terminalRefusals`: validate at construction, or ratify the current posture with the
   reason argued at the seam?

**Done looks like:** a completed pass over every name the file exports at review time,
each rename landed or each current name ratified in writing, the flagged asymmetries
resolved, and `docs/guide/api-reference.md` moved in the same change (the PR template
already demands this).

---

## Phase 2 — Packaging and build (register row 1)

**Register row 1** — "Publish tooling (build, versioning, release) for the record
package". Trigger (verbatim): "First external consumer, or the 0.1 cut".

**Not built today** (per `docs/process/implementation-status.md`'s own "The package is
unconsumable today"): `packages/record/package.json` carries exactly five fields (`name`,
`version` `0.0.0`, `private: true`, `type`, `description`); no `exports`, `main`, `types`,
`files`, or `scripts`; `private: true` blocks publication outright; and nothing is
compiled — `noEmit` is set in `tsconfig.base.json` itself and the repository's only tsc
invocation is `--noEmit`. No git tag exists; no release workflow exists.

**Brainstorm agenda:**

1. **Emit mechanism**: a `tsconfig.build.json` (declaration + outDir, tsc-only, zero new
   dev dependencies — closest to the house's zero-dependency stance) versus a bundler.
   Either way the base config's `noEmit` must stay true for the typecheck path, which
   typechecks `src` and `test` together today.
2. **ESM-only, stated plainly?** Source is NodeNext with explicit `.js` specifiers; an
   ESM-only publish is coherent. If so, the no-CJS bound is stated in the same breath
   wherever installation is documented.
3. **Manifest completion**: drop `private`; add `exports` (shaped by phase 1's subpath
   decision), `types`, `files` (the test directory — roughly 15k lines — sits inside the
   package and ships on a naive publish), `sideEffects: false`, `license`, `engines`,
   `repository`; copy `LICENSE` into the package; choose the first version and the tagging
   convention.
4. **The missing test category — a published-artifact smoke test.** All 44 package test
   files import `../src/*.js`; nothing anywhere exercises a built artifact. A
   pack-the-tarball, install-into-a-scratch-project, import-and-run check is the one test
   the suite lacks, and the one that catches `exports`-map mistakes. Where does it run —
   CI-only, or wired into the release workflow as a gate?
5. **Versioning/release mechanics**: manual version bumps with a hand-run publish, or
   release automation? (`CHANGELOG.md` already states the conditional policy: semantic
   versioning "once a version exists to follow it".)
6. **`engines` on the package itself**: the floor lives only in the root manifest today; a
   consumer currently inherits no floor at all.

**Done looks like:** `docs/process/next-phases.md`'s own statement of it — a real
`exports` map pointing at a built artifact, a build step that produces that artifact — plus
a smoke test proving a consumer's import path works, and register row 1 retired at the
landing.

---

## Phase 3 — CI and infrastructure hardening (touches rows 5 and 4)

**What exists today:** one workflow, one job, `ubuntu-latest`, a single `node-version: 22`,
running the five gates (`typecheck`, `test`, `lint`, `contract-scan`, `lint:strict`) with
read-only permissions and cancel-on-supersede concurrency. No release workflow, no
dependency-update automation, no CODEOWNERS, no pnpm cache.

**Brainstorm agenda:**

1. **Test the declared floor.** `node-version: 22` resolves to current 22.x and never
   tests `>=22.16` itself; the floor is where `node:sqlite`'s availability and behavior
   matter most. Add the floor to a matrix — and Windows (this repository is developed on
   Windows but never CI-tested there) and macOS, or record why not.
2. **Register row 5 rides along.** Trigger (verbatim, head): "The next commit that edits
   `biome.json` for any reason, or the Biome major release that removes the field —
   whichever lands first" — the row's own RETRIGGERED note records how a vaguer trigger
   fired silently twice. Any lint-config change in this phase carries
   `biome migrate --write` in the same commit.
3. **Register row 4 is conditional, not scheduled.** Trigger (verbatim): "Second workspace
   package lands". Phases 0 and 4 can cause exactly that (a store-adapter package); if one
   does, the root `typecheck` generalizes and per-package test-runner devDependencies land
   with it — planned together, not discovered after.
4. Dependency-update automation, CODEOWNERS, a pnpm cache in CI, blank-issue policy — each
   a small deliberate keep-or-skip, decided once rather than defaulted.

**Done looks like:** CI exercising the floor and at least one non-Linux platform (or the
narrower choice recorded), row 5 retired at the next `biome.json` edit, and row 4's
landing plan attached to whichever phase creates the second package — or nothing, if the
brainstorm decides the single-platform posture is the honest scope and says so.

---

## Phase 4 — Proof-structure gates named on the 0.1 trigger (rows 15 and 16)

**Register row 15** — the server-SQL backing, SPEC §12's third reference backing. Trigger
(verbatim): "The first multi-operator consumer, or the 0.1 cut — whichever lands first".
The row itself carries step 2's exit ruling and the shape of done: an adapter package or
module wired to the existing conformance suite by one caller file, a third leg in the
cross-backing byte-identity test, and real multi-connection contention coverage that
neither existing backing can express.

**Register row 16** — `beginRedemption`/`completeRedemption` take no `tx`. Trigger
(verbatim): "The first host architecture that needs it, or the 0.1 cut — whichever lands
first". The row records that adding an optional trailing `tx?` later is additive, not
breaking.

**Brainstorm agenda (contingent on phase 0's rulings):**

1. **Row 15, if built:** which server engine; adapter as a module inside `record` (a
   driver dependency would end the package's zero-runtime-dependency stance) or as a
   separate workspace package (keeps the core dependency-free; fires row 4); and how CI
   hosts a reachable server so the suite keeps its zero-skips discipline — the collision
   the row itself names. A service container in CI is the obvious candidate; local runs
   need an answer too, stated with its limit (a developer without the server must still
   get a loud, explained failure, never a silent skip).
2. **Row 15, if re-scoped instead:** the register edit that changes the trigger, with the
   reasoning recorded in the row — the register's own rule ("An entry leaves this table
   only when the behavior lands or the deferral is explicitly retired") governs the form.
3. **Row 16:** build the additive `tx?` (small — the direct seam's `redeem()` already has
   one; the enlisted-tampered corner's refusal shape is already ruled at rung (1)) or
   retire the row with recorded reasoning. Building looks cheap enough that building is
   the default to argue against, not for.

**Done looks like:** both rows either landed (with their tests — the third byte-identity
leg for row 15; a pinned enlisted-token test for row 16) or explicitly re-scoped in the
register. No third state.

---

## Phase 5 — Public docs and community mechanics

**What exists today** is unusually complete and honest: README with an explicit
not-installable status, `CONTRIBUTING.md` with the nine repository rules, `SECURITY.md`
that refuses to invent a support matrix, a bespoke `CODE_OF_CONDUCT.md`, a
keep-a-changelog `CHANGELOG.md` opening with "No release has been cut", repo-specific
issue templates and a rule-enforcing PR template. The gaps are omissions, not overclaims.

**Brainstorm agenda:**

1. **Sequence the README flip with the publish.** The headline snippet imports
   `@vidimera/record`, corrected only further down the page; it becomes true the moment
   phase 2 lands and should flip in the same change. The development block also omits
   `lint:strict`, which CI enforces.
2. **Give the api-reference checkbox a gate.** `docs/guide/api-reference.md` is
   hand-maintained and dated, and markdown is deliberately outside the contract scan's
   citation checks — so its drift risk is structural. A small script diffing `index.ts`'s
   export list against the reference's enumerated names would put a real gate behind the
   PR template's existing checkbox, without touching anything sealed. Decide: build it, or
   record that hand-verification stays the discipline.
3. **Contact channels made real**: the private-reporting setting enabled (phase 0's
   question 7), an issue-template config routing security reports to a contact link
   instead of the public-issue fallback, and the blank-issue decision.
4. **NOTICE/copyright** landed per phase 0's identity ruling, in `LICENSE`'s appendix, a
   NOTICE file, or the manifests — one consistent answer, not three.
5. **Guide re-verification after phase 1.** Every code sample in `docs/guide/` was
   verified by execution before being written down; any surface rename re-runs that bar on
   the affected walkthroughs in the same change.

**Done looks like:** every install-facing sentence true on the day the package resolves,
a working private-report path, and the guide re-verified against the frozen surface.

---

## Phase 6 — First-use validation

**Goal.** Proof that a stranger can use the thing — the step no amount of green internal
gates substitutes for. This phase is deliberately last: it validates phases 1–5 rather
than adding scope.

**Brainstorm agenda:**

1. **A consumer-shaped example**: a minimal host wiring `create`, a store, a profile, and
   the outcome handling — inside the repo (an `examples/` package fires row 4; a
   documented scratch project does not) or outside it. The standalone contract constrains
   the form: newly authored markdown here carries no external URLs, so an external example
   cannot be linked, only described.
2. **The pack-and-consume rehearsal** on the declared floor and on at least one non-Linux
   platform, before any announcement: install the tarball in a clean project, run the
   getting-started flow as written, and record what a first-run consumer actually sees —
   including `node:sqlite`'s ExperimentalWarning if phase 0 shipped it as-is.
3. **What "0.1" promises.** The version's own honest bound, stated where an adopter will
   read it: names may still move before 1.0 (the store contract's signatures are
   explicitly provisional pre-1.0 by the sealed set's own declaration), and which parts
   are stable-in-behavior versus stable-in-name.

**Done looks like:** one documented, reproduced first-use run from artifact to verified
chain, on a machine that never held this repository's checkout.

---

## What deliberately stays out — so no brainstorm reopens it

Named here once, with sources, so the phases above stay honest about their edges:

- **AL3 anchoring** — documented upgrade only, inactive by design; its interval and
  disclosure design stays open (OPEN-QUESTIONS §10) until a threat model activates it.
- **Concurrent legs** — out of scope pre-1.0 by SPEC §1's own declaration;
  OPEN-QUESTIONS §8 names what a future revision would reopen.
- **Outside-party capabilities** — excluded by the concept's purpose statement
  (`docs/concept/CONCEPT.md` §3); the operator is the records' sole consumer.
- **The store signature freeze** — OPEN-QUESTIONS §9's declared 1.0 gate, not a 0.1 one.

## Sealed-set observations held for the owner — recorded, not proposed

These are observations a phase-0 sanction decision would cover; none is a proposal, and
none can be acted on without a fresh sanction through `docs/concept/SCOPING-GUIDE.md`
§§1–2. The first four are already on record in
`docs/process/implementation-status.md` and `docs/process/next-phases.md`; the last two
were surfaced by this survey:

1. OPEN-QUESTIONS §2 lacks the "Decided (this build)" tail its five sibling sections
   carry, while the fail-close recommendation it records is taken in code — the recording
   gap `docs/process/next-phases.md` documents.
2. The `supersedes` three-text divergence (CONTROLS' recovery row, SPEC §2's
   profile-conditional list, SPEC §9.1's field table).
3. `DecisionRecord.status` — required by SPEC §5, §12, §13; absent from §2's field table.
4. `replay`/`verifyChain` unexported against SPEC §5's wording (also phase 1's question 4),
   and `open()`'s en-passant expire against §5's blanket pre-seam chain-verify.
5. `docs/concept/README.md`'s document table still describes the build order as "proven
   through step 6 (7–8 the designed continuation)", while SPEC's own markers have since
   moved for steps 7 and 8 under sanctioned per-increment authorizations — the sealed
   set's front door and its normative core no longer say the same thing.
6. The `[PROVEN]` legend in the same README defines the marker to include cross-backing
   proofs "over in-memory, embedded-SQL, and server-SQL stores" — a claim about the
   reference implementation that this repository can neither verify nor currently match
   (row 15), and that a stranger will read against this repository's two backings.

## Measurement appendix — dated 2026-08-18, re-measure at use

| Measurement | Value | How to re-measure |
|---|---|---|
| Tests | 45 files, 621 tests, zero skips | `pnpm test` |
| Package test files | 44 in `packages/record/test` (the 45th is the contract scan's own, under `scripts/test/`) | count `*.test.ts` / `*.test.mjs` |
| Exported names | 28 (5 values, 23 types) | read `packages/record/src/index.ts` |
| Surface methods | 4 agent-side, 16 operator-side | read the two surface interfaces |
| Refusal codes | 24 | `packages/record/src/refusal-codes.ts` |
| Package manifest | 5 fields, `private: true`, `version` `0.0.0` | `packages/record/package.json` |
| Live register rows | 1, 4, 5, 6, 15, 16 | `docs/process/deferral-register.md` |
