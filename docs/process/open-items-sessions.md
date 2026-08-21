# The open-items sessions

The working method over `docs/process/open-items-plan.md`: that document says WHAT is
open and what closing looks like; this one schedules HOW each item gets worked — as a
sequence of brainstorming sessions, one per decision cluster, each run with the
`superpowers:brainstorming` skill invoked at the session's start. This document is the
agenda, never the decisions: no ruling below is pre-taken, and a session is free to
land somewhere this agenda did not sketch. Where this document and the open-items plan
disagree, the plan wins; where either disagrees with `docs/process/release-checklist.md`
on release-day matters, the checklist wins.

**How a session runs.**

- Each session opens by invoking the brainstorming skill; the **path** named below
  (spike / bounded / decision / architectural, in that skill's classification sense —
  "decision" is a bounded session whose deliverable is a ruling, not code) is
  pre-declared here so the session starts on the right footing, and is overridable in
  the session itself. When in doubt, the heavier path.
- One session per sitting. A session ends with its output landed — the edit committed,
  the ruling recorded — or explicitly parked with what blocked it written into the
  open-items plan's item. No session ends on intention.
- Rulings land as dated records under `docs/analysis/` (the batch precedent is
  `docs/analysis/2026-08-19-phase-0-decisions.md`: several small rulings, one dated
  record). A ruling's closing edit lands in the same commit as its record wherever
  possible, so the behavior and its account never drift apart.
- Every commit runs the gates (`pnpm typecheck`, `pnpm lint`, `pnpm lint:strict`,
  `pnpm test`, and the contract scan last on the staged tree); `docs/concept/` is
  read and quoted, never edited outside a fresh, explicit sanction — session 8 prepared
  a sanction case; the owner granted it whole and its four edits landed at commit
  `ebe69b8`.
- Preparation measurements below were taken 2026-08-19 against `main` at `1cffe1f`
  (with the open-items documents staged); re-measure at session time — every "prepare"
  list names its sources for exactly that reason.

## Session 1 — the drift fixes (stage 1, whole)

- **Covers:** all four stage-1 items — the two "server-SQL adapter is still future"
  comments, the "freshness is the third, still future" header, and the two stale
  `docs/process/implementation-status.md` table-row claims.
- **Path:** bounded. Short design in chat, approval, one commit.
- **Prepare:** read the four sites (`packages/record/src/store/store.ts` header,
  `packages/record/src/store/memory.ts` class comment,
  `packages/record/src/signing/store.ts` header, the status document's §8 and §9
  rows); read how `implementation-status.md` has recorded its own past corrections, so
  the row edits follow the document's existing convention rather than inventing one.
- **The questions:** the exact rewording of each site, in each file's own voice —
  naming what exists (`@vidimera/store-postgres`; the landed freshness increment)
  while keeping every provisional marking intact; whether the status-row edits carry a
  dated correction note or silently align with the resolution the same document
  already records elsewhere; how to cut `store.ts`'s coupled sentence so the
  server-SQL clause is fixed now without pre-judging the committed-read clause
  (session 7's ruling) — the default shape is to fix the false half and leave the
  undecided half standing verbatim.
- **Output:** one commit, comment-and-doc-only, gates green.
- **Done when:** stage 1's four checkboxes tick.

## Session 2 — release-artifact postures (stage 2: smoke scope, PostgreSQL range)

- **Covers:** the smoke test's record-only bound; the undeclared PostgreSQL range; the
  beta `embedded-postgres` pin posture.
- **Path:** decision, then bounded implementation of whatever is ruled.
- **Prepare:** read `scripts/smoke-pack.mjs` whole; measure what consumer-testing the
  store-postgres tarball would actually require — its consumer test needs a running
  PostgreSQL, so "extend the smoke" is not symmetric with the record leg (the scratch
  project would need the embedded server or the `VIDIMERA_PG_URL` seam); read the
  phase-6 rehearsal's account of the one time the adapter tarball was consumer-tested;
  confirm the current `embedded-postgres` pin and what stable lines exist.
- **The questions:** extend the smoke to both tarballs (real coverage, real CI cost
  and complexity — an embedded server start inside the smoke's scratch project) or
  record the record-only bound in the script's own header the way
  `scripts/api-reference-sync.mjs` records its bounds — and if recorded, whether the
  release checklist gains a one-time manual adapter-tarball check at the cut; what
  PostgreSQL floor to declare and on what evidence (the code floor is
  `hashtextextended`, PostgreSQL 11+; the tested evidence is 18.x embedded plus the
  Windows leg's unpinned service — an honest declaration states both: what is
  required, what is exercised); whether the beta-channel pin is acceptable on record
  for a dev-only dependency or moves to a stable line.
- **Output:** a dated ruling (may share a record with session 3's small edits if they
  land the same day) plus the ruled edits: the smoke extension or the recorded bound,
  and the declared range landing where session 3 puts the adapter README (or in
  `docs/guide/integrating.md` if that session has not run yet).
- **Done when:** stage 2's third and fourth checkboxes tick.

## Session 3 — the package READMEs and the flip list (stage 2, remainder)

- **Covers:** the two missing package READMEs; the two files missing from the release
  checklist's flip list.
- **Path:** bounded content design.
- **Prepare:** read the root `README.md` (the voice to inherit, not the content to
  copy); re-read the standalone contract's markdown rule — it binds these files too,
  and they ship to a registry page where relative links do not resolve, which is the
  interesting constraint; read `docs/process/release-checklist.md`'s "File changes"
  section for the flip item's current wording.
- **The questions:** what an npm-page README says under a no-external-URL contract —
  the working shape is: name, one honest paragraph (every guarantee with its limit, in
  the docset's own discipline), install line, a minimal true example, and a pointer to
  `docs/guide/` phrased as a repository path rather than a link; how the two READMEs
  differ (the record package leads with what the library is; the adapter leads with
  the peer dependency, the declared PostgreSQL range from session 2, and what its
  tests run against); whether the READMEs join the `files` arrays explicitly or ride
  npm's always-include behavior (verify, don't assume — the smoke's tarball listing is
  the check); the flip-list edit's exact wording for `SECURITY.md` and
  `docs/README.md`.
- **Output:** two READMEs, the checklist edit, and a smoke run whose tarball listing
  shows the record README packed.
- **Done when:** stage 2's first and second checkboxes tick — with session 2, that
  closes stage 2.

## Session 4 — the conformance-suite export (stage 3, its own session)

- **Covers:** the dangling 0.1-cut question: whether
  `packages/record/test/conformance/store-conformance.ts` is exported as an
  adapter-author's tool.
- **Path:** decision — the survey's biggest API-surface consequence, so it gets a full
  approaches-with-trade-offs treatment.
- **Prepare:** read the suite's own header and how the two in-repo backings and
  store-postgres wire into it (one caller file each); read the
  PUBLIC-BUT-UNSTABLE-PRE-1.0 markings on the Store surface; note the framework
  coupling — the suite is written against the test runner, so exporting it makes that
  coupling a consumer concern (a subpath export that needs vitest, or a
  runner-agnostic rework).
- **The questions:** who the consumer is and whether one exists before 1.0; the
  tension the export creates — `store.ts`'s own header says "do not build long-lived
  external adapters against this exact shape yet", and an exported suite is an
  invitation to do exactly that — versus the counter-argument that an adapter author
  who will build anyway is safer with the suite than without it; the shape if
  exported (a `./conformance` subpath under the same provisional discipline, or a
  separate dev-only package); the shape if declined (a recorded not-before-1.0
  posture, re-opened by the freeze). This session couples forward to the store freeze
  (stage 6): whichever way it rules, the ruling should say what the 1.0 gate re-asks.
- **Output:** a dated ruling. If export: the build work is a stage-6 increment with
  its own spec/plan pair, not this session's.
- **Done when:** stage 3's first checkbox ticks.

## Session 5 — versioning mechanics for two packages (stage 3)

- **Covers:** the fired-and-unrevisited trigger from the phase-2 packaging ruling.
- **Path:** decision.
- **Prepare:** read the phase-2 ruling's own words ("No changesets: one package today,
  and the hand-written CHANGELOG keeps its own voice; revisit when the row-15 adapter
  package lands"); read how the release workflow orders the two publishes and how the
  adapter's `workspace:^` peer range rewrites at pack time; read `CHANGELOG.md`'s
  single-file shape and its semver line.
- **The questions:** lockstep versions (simple; the peer range stays trivially
  honest; adapter versions bump on record-only changes — a cost in noise) versus
  independent (honest per-package history; the peer range and the single CHANGELOG
  both get harder); whether the hand-written single CHANGELOG stays one file with two
  packages' entries or splits; whether any tooling arrives or the checklist stays the
  mechanism (the repo's voice has favored manual-with-a-list — the question is whether
  two packages change that); what the release checklist's next-cut wording becomes
  under the chosen scheme.
- **Output:** a dated ruling; a checklist wording edit if the ruling requires one.
- **Done when:** stage 3's second checkbox ticks.

## Session 6 — the small postures, batched (stage 3)

- **Covers:** coverage posture; performance posture; actions pinning; the 13 Biome
  lint infos.
- **Path:** decision batch — four rulings, one sitting, one dated record (the
  phase-0-decisions precedent).
- **Prepare:** list the 13 infos (`pnpm lint` output) and what rules they are; check
  what the test runner's built-in coverage costs to enable; list the exact action
  pins both workflows carry and what a SHA pin changes for Dependabot's weekly
  updates; have the open-items plan's named hot paths at hand for the performance
  discussion.
- **The questions, per item:** coverage — measure-without-gating, gate, or a recorded
  no-metric posture (the probe-tier can-fail hole is the argument a number could have
  surfaced; the counter is that a number invites chasing it); performance — a
  recorded skip naming the hot paths, with the bench suite staying a stage-7
  candidate, or nothing-until-a-consumer-asks; pinning — SHA-pin `release.yml` at
  minimum (the workflow holding `id-token: write` and the npm token), decide whether
  `ci.yml` follows, or record tag-pinning as accepted; Biome infos — clear them or
  record leaving them, having actually read what they are.
- **Output:** one dated postures record; whatever small edits the rulings require
  (workflow pin edits, a coverage script, or nothing but the record).
- **Done when:** stage 3's third, fourth, fifth, and eighth checkboxes tick.

## Session 7 — the committed-read clause (stage 3)

- **Covers:** `store.ts`'s claim that "a committed-read surface is still
  named-not-built, SPEC §12" will land "at a later build step" that no longer exists.
- **Path:** decision, with an archaeology step first.
- **Prepare — and the finding that reshapes this session, measured 2026-08-19:** the
  phrase "committed-read" occurs nowhere in `docs/concept/` — SPEC §12's "Reads"
  paragraph specifies `readChain(recordId)` returning "the full committed chain in
  sequence order" and names no further read surface. The phrase's lineage is this
  build's own artifacts: the 2026-08-12 sqlite-adapter increment's plan wrote the
  current comment wording, and the 2026-08-19 store-postgres design carried
  "named-not-built stays so" forward. The citation resolver never caught it because
  §12 exists and the phrase is not a quotation. So the session's first question is
  prior to build-vs-defer: was there ever a spec obligation here, or is the comment
  citing SPEC §12 for a surface the spec does not name?
- **The questions:** what the comment was actually gesturing at (a read view scoped
  to committed-only under an open caller transaction? a batch read? — reconstruct
  from the 2026-08-12 pair before ruling); if it is a real, wanted capability —
  build it (then it needs a deferral-register row with a trigger, per the register's
  own rule) or hang it on the 1.0 freeze beside OPEN-QUESTIONS §9; if it was never a
  spec obligation — reword the comment to stop attributing it to SPEC §12, which is
  the honest minimal closure. This completes the `store.ts` sentence session 1 left
  half-fixed.
- **Output:** a dated ruling plus the comment edit (and a register row only if the
  ruling is build).
- **Done when:** stage 3's sixth checkbox ticks.

## Session 8 — the sealed-set sanction case (stage 3)

- **Covers:** the four stale narrative descriptors inside the sealed set (ASSURANCE
  §6's "sketched" AL2; SCOPING-GUIDE §5's "AL2/AL3 — both sketched" and §7's
  "steps 7–8 are the designed/sketched continuation"; ARCHITECTURE's "(findings-flow
  only; designed)" rung tag).
- **Path:** decision — and the most careful session on this list: it prepares a
  sanction case, it does not edit. The sanctioning authority is the owner.
- **Prepare:** read `docs/analysis/2026-08-19-sealed-set-sanction.md` whole — the one
  precedent for a sanctioned corrective pass, including how it argued each edit and
  what it deliberately declined to edit; read SCOPING-GUIDE §§1–2's own machinery
  (tier test, promotion rule) and §7's spec-moves-to-truth discipline; read each of
  the four passages in place, with the SPEC §14 / §10.2 markers they contradict.
- **The questions:** whether these four are the same class the precedent pass
  corrected (descriptor drift against markers the machinery already moved — arguably
  corrective, not scope-moving) or a different class needing more; the exact minimal
  edit per passage, argued per passage the way the precedent argued; the alternative
  if sanction is declined — recording the drift visibly outside the set (the
  open-items plan already carries it; the question is whether anything reader-facing
  should too); and explicitly: this session's output is a CASE, and "the owner
  declines" is a valid closure recorded like any other.
- **Output:** a written sanction case put to the owner; then either the sanctioned
  corrective pass (its own record, the precedent's shape) or a recorded decline.
- **Done when:** stage 3's seventh checkbox ticks — with sessions 4–7, that closes
  stage 3.

## Session 9 — pickup decisions (stage 4, with the owner)

- **Covers:** the two re-decide-at-pickup decisions and the owner-side walkthrough.
  The release checklist is authoritative here; this session prepares its decisions, it
  does not replace its list.
- **Path:** decision review, scheduled by the owner's readiness bar — no earlier.
- **Prepare:** re-measure the floor rule's fact at the actual date (does any
  maintained Node line carry a stable `node:sqlite`?); re-read the phase-6
  rehearsal's finding (the ExperimentalWarning fires on any `@vidimera/record`
  import) and its recorded untaken alternative; confirm the live state of the four
  owner-side settings, the stale remote tag, and the merged stray branch.
- **The questions:** the floor decision as a genuine three-way — raise the floor (if
  the fact now supports it), ship-as-is with the documented warning, or take the
  lazy-`SqliteStore`-load reshape (weighing that it reopens an entry-point decision
  the API review closed — if taken, it needs its own recorded reasoning, not a
  side-effect); the clean-machine precondition as a real two-way — actually run the
  pass on a machine that never held this checkout, or re-waive on record (the banner
  is explicit that the old waiver does not carry); then the owner's own sequence:
  settings, tag deletion, branch deletion, cherry-pick with the date refresh, the fresh
  `[0.1.0]` re-cut from `[Unreleased]` (the banner's 2026-08-21 amendment), and the
  (session-3-extended) flip list, gates, tag, push.
- **Output:** the pickup decisions recorded; the pickup commit series per the
  checklist; the owner's settings flipped by the owner.
- **Done when:** the checklist's sections through "Repository and registry settings"
  are complete — by its checkboxes, not this document's.

## Session 10 — dispatch and paperwork (stage 5)

Not a brainstorm — an execution run of the checklist's closing sections: the
dispatch, the clean-machine registry verification with the `./probes` subpath check,
then the paperwork (retire register row 1 so the table empties; the retirement note
in `docs/process/implementation-status.md`; the roadmap update in
`docs/process/next-phases.md`; the measured block refreshed and dated). Listed so the
sequence runs to the end. **Done when** stage 5's exit holds.

## The stage-6 sessions — scheduled by reaching them, not by date

Each is a full architectural brainstorm when its turn comes: questions, 2–3
approaches, sectioned design, then a spec/plan pair in `docs/superpowers/`, the
increment convention. Pre-declared paths, one line of shape each:

- **Can-fail, suite-wide** — design the deliberately-broken-driver campaign for the
  eleven pass-path-only probes: per-family increments or one campaign, and what
  "broken" means per probe without stubbing the pass.
- **Deeper-leg and deeper-chain driver shapes** — the probe driver's API question;
  couples to whatever session 4 ruled about external adapter authors.
- **The store freeze** — the 1.0 gate itself: the meta-object form, the transaction
  type parameter, the sweep signature; absorbs session 7's outcome and session 4's
  re-ask, and weighs the rehoming-residual closures (a consider, not a debt).
- **The export landing** — only if session 4 ruled export.

The two dormant items stay watched, not worked: OPEN-QUESTIONS §6's registry
candidates (trigger: a real host across a process boundary) and §10's AL3 design
(trigger: the key-custody threat model).

## Stage 7 — a scoping session per candidate, on selection only

No session is scheduled. When a candidate is chosen — the third adapter, the examples
host, the bench suite, or the SPEC §10.3 normative revision — it gets its own
brainstorm starting at classification, and the SPEC revision starts at the sanction
machinery, same as session 8's discipline.

## The sequence at a glance

**Sessions 1–8 have run** (commits `05d0b8c`, `868cb3c`, `ffbb14e`, `0c549e9`,
`3be4e71`, `558623a`, `ddcfeaa`, `ebe69b8` — closing the open-items plan's stages 1–3);
what remains is 9 → 10, gated on the owner's readiness bar, which close the register.
Stage 6's sessions open after 0.1; stage 7's open on selection. Nothing below session 9
requires the owner; everything from session 9 on is theirs to schedule.
