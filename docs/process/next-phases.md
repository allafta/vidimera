# The next phases

This document is a **roadmap**: what gates the next cut and why, never how — no
implementation plan lives here. It is derived from three sources, read whole rather than
sampled: `docs/process/deferral-register.md`'s three live rows, `docs/concept/OPEN-QUESTIONS.md`
(sealed, read-only — quoted here, never edited), and `docs/process/implementation-status.md`'s
"Still outstanding" and "The package is unconsumable today" sections. Nothing below is
invented; every register row, quote, and section number is checked against those sources at
write time. `docs/process/implementation-status.md` stays the authoritative account of what
has landed — read it for the record; read this document for what comes next.

## What is done

The eight-step build order (`docs/concept/SCOPING-GUIDE.md` §7) is complete: all eight steps
are exited, the last of them — recovery, live capture, AL2 detached signing whole, and the
operator-assurance self-test tier — settling at the self-test-tier increment's own fix wave,
commit `84484ba`. Four increments have landed since, all landing 2026-08-21: three governed
capabilities — recorded human decline, proposal provenance, effect-result notarization —
and a release-readiness reconciliation. `docs/process/implementation-status.md` carries the
step-by-step account and is this repository's authoritative record of what landed; this
document does not restate
it. What landed is bounded exactly where the concept says it should be — the embedded,
operator-only scope `docs/concept/CONCEPT.md` §3 and `docs/concept/CONTROLS.md` §1 declare —
and "What is deliberately outside the scope" below says so in the concept's own words.

## What gates the next cut

Three deferral-register rows gate the next cut — down from four: the AL2
signature-enforcement coverage increment retired rows 20 and 21 and opened row 22 in their
place. Row 1, publish tooling, is the one that survives from the build order itself — its
tooling landed at the phase-2 packaging increment, and the row stays open until the release
workflow is exercised once at the 0.1 cut. The other two are both newer, opened by
post-build-order findings rather than by the build order itself, and each of their own
triggers names the 0.1 cut too, so both belong beside row 1 here rather than only in a
build-order account. Row 19, the AL2 detached-signature sidecar pinning deferral, was
opened by the byte-regression-pins increment; its trigger (verbatim): "The first increment
that changes signature encoding or key handling, or the 0.1 cut — whichever lands first".
Row 22, orphan sidecar growth on the no-edge refusal path, was opened by the AL2
signature-enforcement coverage increment, which found it while closing rows 20 and 21 and
recorded it rather than fixing it — the containment either special-cases a path five call
sites share or reopens a deliberately pinned ordering, which is its own increment
(`docs/analysis/2026-08-23-signature-enforcement-coverage.md`, Finding F). Row 22's trigger
(verbatim): "The first increment that changes the signing decorator's
sign-before-append ordering or `appendChainCompromise`'s candidate walk, or that adds a
durable `SignatureStore` backing beyond `MemorySignatureStore` — or the 0.1 cut, whichever
lands first."

Rows 20 and 21 retired 2026-08-23, each with its account in its own section below. Every
other row retired 2026-08-19, likewise each with its account in its
own section below: row 6 (the pre-0.1 API review), row 5 (the Biome migration), row 15
(the server-SQL backing, landed whole as `@vidimera/store-postgres`), row 16 (the token
seams' `tx?`), and row 4 (the workspace shape, its trigger fired deliberately by the
second package) (`docs/process/implementation-status.md`'s own boundary paragraph draws
the same distinction). Each item below names its row and quotes its trigger verbatim.

### Consumability — register row 1 (row 6 completed and retired 2026-08-19)

- **Row 1** — deferred item: "Publish tooling (build, versioning, release) for the record
  package". Trigger (verbatim): "First external consumer, or the 0.1 cut".
- **Row 6 — retired.** The pre-0.1 API review completed 2026-08-19 over the whole surface
  (`docs/analysis/2026-08-19-phase-1-api-review.md`): every prior name ratified; every
  signature-reachable type exported (the no-unspellable-names rule — the `SignatureReport`
  asymmetry the row flagged resolved in the export direction); the signing tier moved onto
  the root; the pure audit functions exported beside their operator-handle forms;
  `Surfaces` naming `create()`'s handle pair; and the `terminalRefusals` footgun closed at
  construction. `./probes` is the one decided subpath (OPEN-QUESTIONS §5's own tail),
  landing with row 1's exports map.
- **Row 1 status (2026-08-19, the phase-2 packaging increment): the tooling has landed.**
  The manifest carries the full publish shape with the decided `./probes` subpath;
  `pnpm build` emits `dist/`; `pnpm smoke` packs both packages' tarballs and consumer-tests them on
  every CI run; and the dispatch-only, provenance-attested release workflow exists,
  guarded against publishing the pre-release shape (and, per the phase-5 ruling,
  publishing BOTH packages — record first). The row stays open until the 0.1 cut
  exercises that workflow once; `docs/process/release-checklist.md` is release day's
  authoritative list.

### Decline's rung-(1) coverage gap — register row 20, retired 2026-08-23

- Deferred item: `kernel/decline.ts`'s rung (1) — its pre-seam chain-verify plus the AL2
  signature-layer check, and the `chain-compromise` append it guards — was unexecuted by the
  entire test corpus, proved by mutation (deleting the rung wholesale left the full suite
  passing). The Finding E adjudication increment closed the hash-broken disjunct
  (`!report.intact`); the AL2 signature-broken disjunct
  (`!(await signatureLayerHolds(...))`) stayed unexecuted for this seam, and decline's
  ladder-order test was still missing the rung-(1)-beats-rung-(2) adjacent pair every other
  seam ladder in this package pins. Full account:
  `docs/analysis/2026-08-23-signature-enforcement-coverage.md` (Findings A and B).
- Trigger (verbatim): "The next increment that touches AL2 signature enforcement at
  `decline()`'s rung (1), or that extends `signing-enforce.test.ts`'s local rig or
  `packages/record/test/helpers/signing.ts`'s shared `signingSetup` to expose the sidecar
  alongside decline's handles — or the 0.1 cut, whichever lands first" — the row's THIRD
  trigger text, and the one that finally fired as a prompting event. The original ("the next
  increment that touches `packages/record/src/kernel/decline.ts`") fired at the Finding E
  adjudication increment (commit `536fdba`) without the deferred work landing; the first
  replacement (fix commit `98584e1`) named the deferred work's own completion rather than a
  prompting event and so un-deferred nothing, and was corrected in turn.
- **What done would look like:** the AL2 disjunct of decline's rung (1) executed by at least
  one test that proves it was the SIGNATURE half rather than the hash half — the condition
  short-circuits on `||`, so a hash-broken fixture never calls `signatureLayerHolds` at
  all — and decline's ladder-order test carrying the rung-(1)-beats-rung-(2) adjacent pair.
- **Done, 2026-08-23 (the AL2 signature-enforcement coverage increment):** both halves
  landed. `signing-enforce.test.ts` gained two signature-broken decline pins — the declaring
  leg, and the non-declaring corner where rung (1) refuses before the declaration gate can
  throw — each asserting the appended edge's shape (refusal code, a defined `transitionRef`,
  chain growth of exactly one, the appended transition's `kind` and `payload`, the edge
  itself signed) rather than only the refusal code, and each carrying a verifier-call DELTA
  above zero, which is the only mechanical proof that the signature disjunct ran rather than
  the hash one. `decline.test.ts`'s ladder-order test gained the rung-(1)-beats-rung-(2)
  pair. Mutation-proved: neutering decline's AL2 disjunct failed exactly the two new tests,
  and the revert was confirmed clean. The row is retired;
  `docs/process/implementation-status.md`'s increment section carries the account.

### The AL2 caller-input and assertion-depth gaps — register row 21, retired 2026-08-23

- Deferred item: three AL2 signature-enforcement call paths (`acknowledge`'s shared
  prologue, `beginRedemption`, `completeRedemption`) were exercised only over a hash-broken
  chain, never a signature-broken one; and five of the seven signature-broken sites this
  package does test asserted the refusal code only, never whether the compromise edge
  appended or was withheld. Full account:
  `docs/analysis/2026-08-23-signature-enforcement-coverage.md` (Findings C and D).
- Trigger (verbatim): "The next increment that touches AL2 signature enforcement, or the
  0.1 cut — whichever lands first".
- **What done would look like:** the three missing call paths driven over a signature-broken
  chain — five cells rather than three, since both token seams double on enlistment — and
  the five refusal-code-only sites deepened to state what the seam did with the evidence
  edge, not merely which code it spoke.
- **Done, 2026-08-23 (the AL2 signature-enforcement coverage increment):** `acknowledge` and
  both token seams in both enlistment postures gained signature-broken pins, the enlisted
  cells additionally asserting that the host transaction survives, that a host `ROLLBACK`
  does not throw, that the record's state is untouched, and — for `beginRedemption` — that
  no token is minted on a compromise refusal (the refused outcome carries no `value`, so
  there is no token to hand back; that assertion was added at this increment's own final
  review, the claim having briefly outrun the test). The five refusal-code-only sites were
  deepened in place: `seal`, `raiseFinding` and un-enlisted `redeem` now assert the append,
  while the two that append NOTHING ANYWHERE — `verifyPriorLegs` and `verifySupersedes` —
  now assert exactly that, including that the prior leg or predecessor whose chain was just
  found broken is itself left unmarked, which no test in this package previously stated; both
  also read a verifier-call delta, added at the same final review, so neither can pass on one
  of the other causes their single refusal code folds together. One mutation was run at
  `kernel/redeem.ts`, and it neutered the ENLISTMENT branch (`if (tx !== undefined)` rewritten
  to `if (false)`), NOT the signature disjunct: exactly five tests failed, every one on
  "cannot start a transaction within a transaction", and the revert was confirmed clean. That
  proves the result-first, no-edge shape is load-bearing at all three redemption seams; it is
  no witness for the AL2 disjunct — and neither the `acknowledge` pin, nor the five deepened
  sites, nor any of the four token-seam cells has one: the un-enlisted pair was never touched
  by that mutation at all, and the enlisted pair's contact witnessed the no-edge shape rather
  than the signature arm. `docs/process/implementation-status.md`'s increment section carries the full
  account of what was and was not mutation-proved. The row is retired.

### The server-SQL backing — register row 15, retired 2026-08-19

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
- **Done, 2026-08-19 (the phase-4 store-postgres increment):** all three parts landed as
  `@vidimera/store-postgres` — the one-caller-file conformance wiring (all 50 tests,
  suite unchanged), the Memory ↔ Postgres byte-identity leg, and five multi-connection
  contention scenarios — over an embedded Postgres the suite's own globalSetup starts per
  run, dissolving the zero-skips collision the row recorded rather than waiving it. The
  row is retired; `docs/analysis/2026-08-19-phase-4-store-postgres.md` carries the account.

### The token seams' `tx?` — register row 16, retired 2026-08-19

- Deferred item: `beginRedemption`/`completeRedemption` (`kernel/redeem.ts`) take no `tx` —
  deliberately: SPEC §12's `tx` seam states its purpose as the co-located direct shape, and
  §11.2 defines the token shape by "no transaction is shared".
- Trigger (verbatim): "The first host architecture that needs it, or the 0.1 cut —
  whichever lands first".
- **What done would look like:** an additive, optional trailing `tx?` on both seams — the
  direct shape's `redeem(recordId, content, tx?)` already has one — giving an enlisted token
  issuance or completion the same host-transaction atomicity, and shrinking the crash-strand
  window between the append and the token's return.
- **Done, 2026-08-19 (the phase-4 store-postgres increment):** exactly that shape landed,
  inverting the seams' own recorded "NO tx, deliberately" comments — the TWELFTH entry of
  `docs/process/implementation-status.md`'s numbered inversion sequence, argued at the
  seam and pinned by four enlisted-token tests. The row is retired.
- **Shape update, 2026-08-21 (the effect-result increment's Task 1):** that trailing
  `tx?` — by then present on all three redemption seams, not only the token pair this row
  named — moved into `RedeemOptions.tx`, one options bag `redeem`, `beginRedemption`, and
  `completeRedemption` now share. Behavior-preserving, gated by the existing suite; the
  row stays retired.

### The Biome migration — register row 5, retired 2026-08-19

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
- **Done, 2026-08-19 (the phase-3 CI increment):** the trigger was fired deliberately
  rather than tripped — the migration produced exactly the dry-run's one hunk, the
  `$schema` field was added by hand, and the deprecation left `pnpm lint`'s output. The
  row is retired.

### The workspace-shape gate — register row 4, retired 2026-08-19

- Deferred item: generalize the root `typecheck` script beyond `packages/record`, and declare
  per-package test-runner devDependencies rather than relying on the root's.
- Trigger (verbatim): "Second workspace package lands".
- **What done would look like:** `pnpm-workspace.yaml` already globs `packages/*`; `packages/`
  holds exactly one package today. Once a second lands, the root `typecheck` script covers
  every workspace package and each package declares its own test-runner devDependency instead
  of inheriting the root's.
- **Done, 2026-08-19 (the phase-4 store-postgres increment):** the second package fired the
  trigger deliberately; root `typecheck` and `build` cover both packages, `vitest` is
  declared per-package, and the vitest config runs per-package projects. The row is retired.

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
Sections §1, §2, §3, §4, §5, and §7 each now carry a "**Decided (this build):**" tail and
are CLOSED — they do not appear below (§2's tail is the newest, added by the 2026-08-19
sanctioned corrective pass; its entry below records the history of that gap). Of the
remaining sections, §6, §9, and §10 carry no such tail and are genuinely open, listed here;
§8 is addressed above under "What is deliberately outside the scope" rather than repeated
here (the section frames concurrent legs as a pre-1.0 declaration already made, not a
decision pending now).

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

### OQ §2 — decided in code; the recording gap closed 2026-08-19

This is not a genuinely open question and not a closed one either — a third state. The
sealed `docs/concept/OPEN-QUESTIONS.md` §2 still reads as a live decision: "**Decision:**
fail-close in code ... versus ratify as by-design with the audit trail as compensation."
"**Recommendation on record: fail-close**" — and, unlike §1/§3/§4/§5/§7 above, §2 carries no
"Decided (this build)" tail anywhere in its text.

The recommendation has already been taken in code. `finalize()`'s rung (4.5) refuses
`policy-drift` on exactly this corner — a record carrying a bound `policyDigest`, finalized
under a resolved profile whose `policySource` is now undefined — and the arm's own comment
names the question it closes: "THE DECIDED OPEN QUESTION (§10.3 names it; the recommendation
on record is fail-close, and this build takes it)" (`packages/record/src/kernel/finalize.ts`,
the guard at line 330 through the refusal at line 338). `docs/process/implementation-status.md`'s
step-6 account records the same fact in prose: "The cross-drift open decision named at the
step-6 brainstorm is now DECIDED in code: FAIL-CLOSE, so a bound record finalized under a
same-id non-declaring instance still refuses `policy-drift` rather than skipping the gate."

What is missing is only the sealed document's own closing mark: §2 has never received a
"Decided (this build)" tail the way its five sibling sections did. Adding one is a
sealed-set edit, and this housekeeping directive grants no sanction to make it — the gap is
recorded here, not closed here.

**Closed 2026-08-19:** the sanctioned corrective pass
(`docs/analysis/2026-08-19-sealed-set-sanction.md`) added exactly that tail, in the sibling
form; the account above stands as the history of the gap.

## The disciplines that outlive the build order

- **The sealed set stays sealed.** `docs/concept/` is read, quoted, never edited — outside the
  tier-test and promotion-rule machinery `docs/concept/SCOPING-GUIDE.md` §§1–2 define. The
  maturity-marker moves the build order made (SPEC §10.2's nine `[DESIGNED]` tokens at step 7;
  then SPEC §2's recovery tokens, SPEC §9.2's live-mode tokens, SPEC §14's AL2 bullet and
  freshness tail, all at step 8; and CONTROLS.md §4's four operator-assurance cells, the only
  non-SPEC move and the build order's last — six marker-move commits in total) were each an
  explicit, per-increment authorization, recorded at the increment that earned it
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
  served; `docs/analysis/` carries the increment-history artifacts outside that pair
  structure — `2026-08-03-step-1-review.md`, the 2026-08-18/19 release-phase records, the
  two sealed-set sanction records (2026-08-19 and 2026-08-20), and the 2026-08-20
  session-ruling / posture-decision records.
- **A new capability moves its own enumerations, in its own increment.** A capability or
  record-model field that adds a conditional field must, in the same increment, move: (1)
  `docs/concept/SPEC.md` §2's enumerations — the record-model field table and the
  profile-conditional/flow-conditional sentences — wherever it adds a conditional field;
  (2) the publish-facing docset (`CHANGELOG.md`'s `[Unreleased]`, `README.md`, and
  `docs/guide/concepts.md`'s governed-controls list); and (3) any SPEC §8 registry
  producer-note row or other §-scoped sentence whose enumeration the capability widens.
  This is a discipline, not a gate, because no scan reads a SPEC §2 enumeration, the
  publish-facing docset, a §8 registry row, or a sealed honesty cell — `pnpm
  contract-scan`, `pnpm api-sync`, and `pnpm docs-index-sync` are all silent on this class
  of drift — so the increment's own sweep is the only defense there is. The
  recorded-human-decline, proposal-provenance, and effect-result-notarization increments
  each landed a capability that left a SPEC §2-adjacent enumeration under-inclusive by
  omission: the first two were caught and fixed within their own increment's review before
  exit; the third escaped its own increment entirely and surfaced only at a later, separate
  fix wave, recorded rather than fixed for want of an in-scope sanction — then closed the
  same day by a fresh, explicit sanction (SPEC §2's field table and profile-conditional
  list now name `resultDigest`). The same three
  capabilities also went unrecorded in the publish-facing docset until a later, separate
  increment caught all three at once. `docs/process/implementation-status.md`'s own
  increment sections carry the full account; it is not restated here.
