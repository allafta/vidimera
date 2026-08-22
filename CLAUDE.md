# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## What this project is

The home of **Vidimera** — a domain-agnostic verifiable-decision-record library — in two
parts:

- **The concept set** (`docs/concept/`): ten self-contained markdown documents that
  present the Vidimera concept whole, at its deliberate embedded, operator-only scope —
  the proven kernel, the profile-declared governed controls, sketched upgrades, and the
  operator-assurance tier. The operator is the sole consumer of the records; capabilities
  meaningful only to an outside party are out of scope by design.
- **The implementation** (`packages/`): a TypeScript pnpm-workspace monorepo implementing
  the concept in the proven build order (`docs/concept/SCOPING-GUIDE.md` §7), plus the
  GOVERNED capabilities promoted past it through §§1–2's own machinery.

**State.** The eight-step build order is complete — all eight steps exited, the last
(recovery, live capture, AL2 detached signing, and the operator-assurance self-test tier)
settling at the self-test-tier increment, commit `84484ba`. Three GOVERNED capabilities have
since been promoted PAST the build order, each on its own fresh sanction and each exited:
recorded human decline (SPEC §9's `open → declined` seam), proposal provenance (§9's
open-time `proposed { stagedRef }`, bound as `proposedDigest`), and effect-result
notarization (§11.2's `redeem.result`, bound as `resultDigest`), followed by a
release-readiness reconciliation pass over the publish-facing docset. The workspace holds two
packages: `@vidimera/record` and `@vidimera/store-postgres` (the server-SQL third
reference backing, tested against a real embedded Postgres the suite starts per run).
Measured against the current
tree: `pnpm test` — 54 test files, 751 tests, zero skips; `packages/record/src/refusal-codes.ts`
carries 24 refusal codes; zero GOVERNED construction guards remain in `config.ts` — every
field the feature-guard era installed has lifted behind real behavior at its own seam
(`governedUnavailable` survives only for four generic unknown-option-key throw sites, in
`finalize()`, `open()`, `decline()`, and the shared `validateRedeemOptions`
(`kernel/redeem.ts`) serving all three redemption seams — `redeem()`, `beginRedemption()`,
`completeRedemption()` — none naming a not-yet-enforceable field).

**The honest bound, in the same breath.** The package is not yet published — deliberately:
the manifest carries the full publish shape (`exports` with `.` and `./probes`, `types`,
`files`, a `build` script), `pnpm build` emits `dist/`, and `pnpm smoke` packs and
consumer-tests the tarball in CI, but `private: true` stays as the one publish block until
the 0.1 cut. Register row 1 stays open until the release workflow
(`.github/workflows/release.yml`, dispatch-only) is exercised at that cut; the pre-0.1 API
review (row 6) completed and retired 2026-08-19
(`docs/analysis/2026-08-19-phase-1-api-review.md`).

**Read these, not this file, for the record and the plan.**
`docs/process/implementation-status.md` is the authoritative account of what this build
does and does not implement, step by step, with gate outputs and the outstanding list —
read it rather than trusting any count here, which is a claim with a shelf life and no way
to fail loudly. `docs/process/next-phases.md` names what gates the next cut (one live
deferral-register row — publish tooling, held open until the release workflow runs once)
and what stays deliberately out of scope; `docs/process/release-checklist.md` is release
day's authoritative list.

**The public docset.** The repo carries a public-repo documentation set beyond the concept
and process docs: root `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`,
`CHANGELOG.md`, `.github/` templates, `docs/README.md` (the documentation front door), and
`docs/guide/` (concepts, getting-started, integrating, api-reference, faq). `docs/guide/`
is **derived from source**: where it and the source disagree, the guide is stale and the
source wins. A change to the public surface (`packages/record/src/index.ts` or either
surface interface) must move `docs/guide/api-reference.md` and any affected walkthroughs in
the same change — the PR template asks for this. Every code sample in the guide was
verified by executing it as a scratch vitest file before being written down; hold edits to
the samples to the same bar. Guide markdown is not citation-checked by the contract scan
(same trap as all markdown — see below), so hand-verify quotes and section numbers.

**What a working agent must not do here:** edit `docs/concept/` — it is SEALED, and the
marker-move sanctions that licensed each past edit were per-increment and are spent, so a
new edit needs a fresh, explicit sanction through `SCOPING-GUIDE.md` §§1–2's own machinery,
never assumed from a past one; touch the frozen byte-stability digests in
`packages/record/test/byte-stability.test.ts` — an oracle, not an assertion to update,
since a mismatch means the minimal chain moved, not that the pin is stale; or push to any
remote without instruction.

## The standalone contract

The concept set's hard rule: **the documents reference nothing outside this repository.**
No external repos, files, projects, commits, or internal development history — the concept
stands on this text alone. Generic mention of "a reference implementation" is permitted;
naming, pathing, or dating one is not. All newly authored markdown in this repository
(README, process docs, specs, plans) stays free of external URLs so the repo-wide scan
keeps holding.

## The document set

`docs/concept/README.md` is the set's front door and maps all ten documents. The
load-bearing structure:

- **`docs/concept/SPEC.md` is the single normative document.** Every other document is
  downstream and defers to it; fix conflicts in the other document unless the spec itself
  is being deliberately revised. Code implements the spec; where code and spec differ,
  one of them is wrong and the difference is a finding, never silently reconciled.
- `docs/concept/CONCEPT.md` holds the identity: the purpose statement, the **four
  non-negotiable principles** (graduated honesty, fidelity-not-validity, human anchor,
  identity-by-transport), the honesty discipline, and the anti-goals. A change that
  touches the principles or honesty discipline is a **fork of the concept**, not an
  edit — it must be called out as such, never slipped in.
- `docs/concept/CONTROLS.md` / `docs/concept/SCOPING-GUIDE.md` carry the scope machinery
  (tier test, promotion rule with purpose-trace, rescoping checklist). Scope changes to
  the concept go through that machinery and get recorded.
- **Maturity markers are accuracy claims.** `[PROVEN]` / `[DESIGNED]` / `[SKETCHED]`
  (legend in `docs/concept/README.md`) must stay truthful: `[PROVEN]` speaks to a
  reference implementation of the spec; a marker moves only when the behavior actually
  lands in this repository.
- Editorial voice: every guarantee is stated with its limit in the same breath; never
  "non-repudiation"; never a compliance claim; domain examples stay generic.

## Commands

pnpm workspace (Node 22.16+, pnpm via corepack):

- `pnpm install` — install dev dependencies
- `pnpm typecheck` — tsc strict, no emit
- `pnpm build` — compile both packages to `dist/` (tsc, each package's `tsconfig.build.json`)
- `pnpm smoke` — the packed-artifact smoke test: builds both packages, packs record with
  `npm pack` and store-postgres with `pnpm pack` (only pnpm rewrites the `workspace:^` peer
  range), installs both tarballs into a scratch project, and drives a confirm loop through
  record's exports map; the adapter's coverage there is packaging-level only, by recorded
  bound (`scripts/smoke-pack.mjs`)
- `pnpm lint` — Biome (`pnpm lint:fix` to apply safe fixes)
- `pnpm test` — vitest, all packages (the store-postgres project starts a real embedded
  Postgres per run via its globalSetup — no Docker, no external database)
- `pnpm api-sync` — the api-reference drift gate: every name `packages/record/src/index.ts`
  exports must occur in `docs/guide/api-reference.md` (`scripts/api-reference-sync.mjs`;
  presence only, never accuracy — read its bounds comment)
- `pnpm docs-index-sync` — the increment-record drift gate: every tracked file in
  `docs/superpowers/specs/` and `docs/superpowers/plans/` must be named in
  `docs/superpowers/INDEX.md`, and its stated counts must match
  (`scripts/docs-index-sync.mjs`; presence and arithmetic only, never accuracy — read its
  bounds comment)
- `pnpm contract-scan` — the **standalone contract scan**: run before any commit that
  touches markdown or TypeScript. Prints nothing and exits 0 when clean; prints
  `path:line:text` and exits 1 on findings (`scripts/contract-scan.mjs`). Scans all
  tracked `*.md` except this file, and all tracked `*.ts`/`*.mts`/`*.cts`: external-link
  and ADR-style checks repo-wide; the escaping-relative-path check on the concept set and
  root README, where self-containment is the contract (a document-only check — a
  TypeScript relative import stays legal). Tracked code is additionally checked against
  EIGHT code-only patterns (`scripts/contract-scan.mjs`'s `codeOnlyPatterns`): pointers
  into a design-document, slice/increment, task and open-question numbering scheme with no
  counterpart here (`design §4`, `slice 7`, `Task 5`, `OQ2-10`); an abbreviated commit ref;
  and three BARE-WORD/label traps that need no number — the word `slice`/`pre-slice`, the
  word `design` (everything but "by design"), and foreign labels (`M-A`, `S-3`, `O11`,
  `T1.2`). A code comment saying "per the design ruling" fails this gate. Such a
  reader-unresolvable pointer is an external reference in the contract's sense. A
  maintainer working alongside other private repositories should extend the script's
  patterns with those projects' names, package names, and tooling — the AL2 mint
  increment did exactly this itself: the commit-reference pattern gained two exact
  negative-lookahead exclusions, `ed25519`/`ed448`, for the Ed-curve algorithm names,
  public identifiers hex-shaped only by coincidence: `ed25519` is the excluded name the
  AL2 mint increment's tests actually pass to `node:crypto`; `ed448` rides as defensive
  symmetry for the sibling Ed-curve name, today below the pattern's own 7-char floor and
  therefore inert (the trailing guard on each keeps `ed25519abc` still a hit). **Exits 0
  today, zero findings** — the imported kernel's comment scrub that rewrote every reference-project
  pointer is complete. The scan also **resolves** citations in tracked code: a `SPEC §N`
  must name a section that exists, a `DECISIONS.md #N` must name an entry that exists, and
  a quoted phrase attached to either citation must occur in the document it is attributed
  to. That resolver ships with a bounds list in the
  script's citation-integrity section comment naming what it deliberately does **not**
  check — read it before
  treating a green scan as coverage. **Markdown is not citation-checked at all**, so a
  wrong citation in a process document, plan or README has no gate behind it and must be
  hand-verified against a whitespace-collapsed copy of the source: a quoted SPEC phrase
  that wraps a line break is present in the source and invisible to a naive `grep -F`,
  which is a standing trap here and has repeatedly produced false "missing quotation"
  findings. A reader should diff a new run's output, never just compare totals, before
  treating any red result as a regression — a scan total moving has hidden an equal-sized
  regression in the opposite direction here before.

CI (`.github/workflows/ci.yml`) is two-tier on every push to `main` and every pull
request: a Linux `checks` job runs the platform-independent gates (typecheck, lint,
contract-scan, `api-sync`, `docs-index-sync`, `lint:strict`), and a `test` matrix runs test + build + the packed-tarball
smoke test on the exact declared Node floor (ubuntu @ 22.16.0), current Node
(ubuntu @ 24), and Windows/macOS @ 22 — with pnpm caching, read-only token permissions,
and one cancel-on-supersede concurrency group per ref. `.github/workflows/release.yml` is
the dispatch-only, provenance-attested publish workflow (both packages, record first),
unexercised until the 0.1 cut; `docs/process/release-checklist.md` is release day's
authoritative list.
`.github/dependabot.yml` groups weekly npm and actions updates; `.github/CODEOWNERS`
guards `docs/concept/` and the frozen byte-stability test (binding once the
require-review-from-code-owners branch protection is enabled — a release-day checklist
item).

## Process disciplines (inherited from the concept)

From `docs/concept/SCOPING-GUIDE.md` §7, binding on implementation work here:

- One cluster per increment; **spec-moves-to-truth** at every increment's exit (a
  maturity marker moves only when the behavior lands in this repository). Every
  build-order step whose section carried a draft-ahead marker has had it move: SPEC
  §10.2's nine `[DESIGNED]` tokens at step 7 (the first such move in this repository),
  then SPEC §2's recovery tokens, SPEC §9.2's live-mode tokens, and SPEC §14's AL2 bullet
  and freshness tail, all at step 8, and finally CONTROLS.md §4's four operator-assurance
  cells (commit `07dd900`) — the only non-SPEC move, and the build order's last. Three more
  followed, one per post-build-order promotion: recorded human decline (`801fe7e`), proposal
  provenance (`e974242`), and effect-result notarization (`35de662`), each moving SPEC.md,
  CONTROLS.md and GLOSSARY.md tokens — nine marker-move commits in total, each a separate,
  explicit, per-increment authorization, spent at the increment it covered. A new
  `docs/concept/` edit needs a FRESH sanction through `SCOPING-GUIDE.md` §§1–2's own
  tier-test and promotion-rule machinery, never assumed from a past one.
  `docs/process/implementation-status.md` is the substitute exit record for every step
  whose own exit step was vacuous (steps 1–6, whose sections were already `[PROVEN]`); the
  full lineage — which commit moved which token, which commits were sanctioned corrective
  edits rather than moves, which predate the sealing convention — is recorded in its
  step-7 and step-8 rows and its three post-build-order increment sections, not restated
  here.
- **Inverting an inherited pinned assertion is authorized explicitly, never slipped in.**
  The kernel arrived with the reference implementation's test corpus; adopting a corpus
  and quietly changing what it pins is how a build drifts while its suite stays green. Two
  such inversions were authorized, both during the step-1 remediation, argued in place at
  `packages/record/test/terminality.test.ts` and recorded in
  `docs/process/implementation-status.md`. A separate, larger numbered sequence tracks
  this build inverting its OWN earlier recorded stance instead of an inherited one — also
  recorded there, each instance argued at its own site.
- **Feature guards from day one** — an unimplemented capability throws at construction
  (`config.ts`'s `validateProfile`) until its own seam behavior lands, in the same commit
  as that behavior. Every profile field the kernel increment marked GOVERNED has since
  lifted this way; measured against the current tree, zero fields are governed
  (`governedUnavailable` survives only for four generic unknown-option-key throw sites, in
  `finalize()`, `open()`, `decline()`, and the shared `validateRedeemOptions`
  (`kernel/redeem.ts`) serving all three redemption seams — `redeem()`, `beginRedemption()`,
  `completeRedemption()` — none naming a not-yet-enforceable field). `redeem` was
  the one capability originally guarded at its call seam instead of construction
  (`kernel/redeem.ts`); that throw is gone too, since the first two step-3 increments. The
  field-by-field lineage — which field lifted at which increment, and the
  construction-guarded count's own movement (ten at the kernel increment, zero at the AL2
  freshness increment) — is recorded in `docs/process/implementation-status.md`'s
  step-by-step accounts; do not re-derive or re-count it here.
- Byte-stability pins and adjacent-pair gate-order tests, from the kernel increment on.
- The living deferral register: `docs/process/deferral-register.md`. See also
  `docs/process/next-phases.md`'s own "disciplines that outlive the build order" section,
  which draws these same threads together for what comes next.
