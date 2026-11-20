# The next phases

This document is a **roadmap**: what gates the next cut and why, never how — no
implementation plan lives here. It is derived from three sources, read whole rather than
sampled: `docs/process/deferral-register.md`'s four live rows, `docs/concept/OPEN-QUESTIONS.md`
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

Two deferral-register rows gate the next cut — down from three: the transactional-sidecar
increment (2026-11-19) retired row 22 on measured behavior on all three reference backings, its
account in its own section below. Row 1, publish tooling, is the one that survives from the
build order itself — its tooling landed at the phase-2 packaging increment, and the row stays
open until the release workflow is exercised once at the 0.1 cut. Row 19 is newer, opened by a
post-build-order increment rather than by the build order itself, and its own trigger names the
0.1 cut too, so it belongs beside row 1 here rather than only in a build-order account. Row 19,
the AL2 detached-signature sidecar pinning deferral, was opened by the byte-regression-pins
increment; its trigger (verbatim): "The first increment that changes signature encoding or key
handling, or the 0.1 cut — whichever lands first". The transactional-sidecar increment did not
fire it: it moved where and when a sidecar entry is written, never what is signed, how an entry
is encoded, or how a key is handled.

Rows 20 and 21 retired 2026-08-23, and row 22 2026-11-19, each with its account in its own
section below. Every other row retired 2026-08-19, likewise each with its account in its
own section below: row 6 (the pre-0.1 API review), row 5 (the Biome migration), row 15
(the server-SQL backing, landed whole as `@vidimera/store-postgres`), row 16 (the token
seams' `tx?`), and row 4 (the workspace shape, its trigger fired deliberately by the
second package) (`docs/process/implementation-status.md`'s own boundary paragraph draws
the same distinction). Each item below names its row and quotes its trigger verbatim.

Two engineering preconditions also gate the cut, and both moved on 2026-08-29 (the
checklist is the authority; this is the pointer). The clean-machine first-use pass is
discharged by construction — `.github/workflows/first-use.yml`'s no-checkout job and
`First-use run 33242645696 on origin` (`docs/analysis/2026-08-29-first-use-proof.md`) —
and its checkbox is ticked against that record. The floor rule was evaluated and did not
fire: `node:sqlite` is Stability 1.2 since Node 24.15.0, not 2, so `>=22.16` stands; the
warning it was written to weigh no longer fires on 24.15+, and the guide says so. The
paused release commit `8be3fce` is a precedent to diff against, never a commit to
cherry-pick — the checklist's notice says why; and the stale `v0.1.0` tag from the paused
attempt is gone. What still gates the cut outside this repository is the owner-side list in
that notice, two items of which cannot even be attempted until the repository is public.

A third engineering question joined the checklist on 2026-09-01, having previously been
weighed inside the floor rule's prose rather than asked: whether the entry point keeps
re-exporting `SqliteStore` eagerly, so that `node:sqlite` loads — and, below Node 24.15,
warns — on any `@vidimera/record` import whatever store the adopter chose. It is the only
cut-gating decision that changes what an adopter meets at `import`, its recorded default is
ship-as-is, and it now carries its own item because the floor rule can fail to fire, as it
did, while this question still wants an answer. The same day's checklist repair also gave
release day a pre-flight section before the irreversible dispatch and turned the docset
flip from a hand-maintained enumeration into a grep recipe;
`docs/analysis/2026-09-01-zero-one-cut-gaps.md` is the argument, the checklist is the list.

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

### Orphan sidecar growth on the no-edge refusal path — register row 22, retired 2026-11-19

- Deferred item: on the no-edge refusal path, `appendChainCompromise` (`kernel/finalize.ts`)
  rebuilds its `refused` transition on every call, and the signing decorator wrote each sidecar
  entry BEFORE delegating the append, so a refusing seam call against a record whose persisted
  state admits no compare-and-swap candidate left one orphan entry per call — six refusing
  `finalize()` calls against a sealed signing record took the sidecar from 5 entries to 11 with
  the chain flat at 5. Two further producers were named 2026-09-02: a `finalize`/`decline` batch
  that loses to a concurrent append (`record-contended`), one entry per element; and `open()`'s
  expire-then-retry under a moving clock, the first attempt's genesis entry. Opened 2026-08-23 by
  the AL2 signature-enforcement coverage increment, which found it while closing rows 20 and 21
  (`docs/analysis/2026-08-23-signature-enforcement-coverage.md`, Finding F); restated 2026-08-28
  by the row-22 truth repairs with a measured containment inventory
  (`docs/analysis/2026-08-24-no-edge-containment-investigation.md`); re-scoped 2026-08-29 to its
  orphan half, 22a, once the no-edge containment increment closed the redundant-signing half,
  22b, on behavior (one mint per transition object, one dead candidate dropped from the walk).
  22a was then held open on a THIRD horn: every measured containment predicted the store's C3
  and C4 answer from a chain that failed verification by construction, a chain-local precheck
  was measured to suppress a compromise evidence edge that lands today, and the two divergence
  shapes became permanent must-not-change pins in `packages/record/test/no-edge-containment.test.ts`.
  Along the way the sidecar-contract increment closed two findings that took no row (the
  sidecar-DRIVEN probe reader and the corpus's break helper, both now chain-correlated and
  pinned in `packages/record/test/sidecar-ordering.test.ts`) and stated the orphan obligation in
  the `SignatureStore` contract, and the sidecar-orphans-report increment made the growth
  visible as `verifySignatures(recordId).orphans` — delegation and visibility, not a fix.
- Trigger (verbatim, as re-derived for 22a): "The first increment that adds a durable
  `SignatureStore` backing beyond `MemorySignatureStore` — the only implementation in the tree,
  and the reason unbounded growth is unmeasured here; or that lifts `private: true` and
  publishes the package, since a host's durable backing arrives through the documented
  `signatures:` hook in the operator's own deployment, where no in-repo event fires; or that
  seeks a sanction through `docs/concept/SCOPING-GUIDE.md` §§1–2 to decide C3 and C4 from the
  read chain, the third horn; or the 0.1 cut — whichever lands first." Its first disjunct fired
  as a prompting event: the transactional-sidecar increment adds durable `SignatureStore`
  backings, one on each durable reference store, and the deferred behavior landed with them.
- **What done would look like:** call 2 of `docs/analysis/2026-11-17-sanction-calls.md` licensed
  the transactional-sidecar route as its own increment, with no sealed edit — signature entries
  persisted atomically with the append they sign, after its compare-and-swap, on every backing
  that can provide that — and declined the third horn; the row was to retire only on measured
  behavior on all three reference backings.
- **Done, 2026-11-19 (the transactional-sidecar increment, branch
  `transactional-sidecar-2026-11-19`):** each reference store — `MemoryStore`, `SqliteStore`,
  `PostgresStore` — exposes its own sidecar as `signatures`, and a signing instance configured
  with that very object (`signatures: store.signatures`) runs INTEGRATED: the decorator still
  mints and checks before the append, then hands the entries down on it, and the store writes
  them inside the append's own atomic unit, after every check, only when it applies — through a
  host's transaction when enlisted. Measured on all three backings, the row's own rig: six
  refusing `finalize()` calls against a sealed signing record whose genesis entry was broken
  leave chain 5 and sidecar 5 after every call, one mint per call, zero orphans; the same rig
  with a separate `MemorySignatureStore` still goes 6, 7, 8, 9, 10, 11 — six orphans. Pinned on
  each backing: the integrated measurement, `open()`'s retry and a `record-contended` lost batch
  leaving no orphan, and an enlisted redemption rolled back leaving none (SQLite and Postgres);
  the separate series is pinned on `MemoryStore` (`no-edge-containment.test.ts`'s baselines)
  and, since the fix wave after the whole-branch review, on `SqliteStore`, and was re-measured on
  all three backings then, unchanged. The third horn was not taken: both divergence pins stand
  unchanged. **What stays open, stated:** SEPARATE mode — any sidecar that is not the store's
  own — keeps the write-first order and every consequence, one orphan per refusing call
  included; an existing deployment switching modes, in either direction, must stop every instance
  that writes to the store, copy the entries with `put` into the sidecar the new configuration
  will read, and only then start the new configuration alone — two configurations run against one
  store at once (a rolling restart) each write entries the other cannot see, and the next
  verifying seam appends a terminal `chain-compromise` edge on a healthy record (the library does
  not migrate); and a store wrapper must expose the inner store's `signatures` and forward `meta`
  intact, or it runs separate. The row is retired; `docs/process/implementation-status.md`'s
  section of that name carries the account. The sealed-set restatement of condition (iii) that
  call 3.2 reserved for this increment landed on 2026-11-20 for call 3.1's five sentences (the
  AL2 restatement follow-up); the three sentences the owner's grant conditioned (ARCHITECTURE §3
  and §9, SCOPING-GUIDE §5) followed the same day under the owner's word (`df7a32e`, the AL2
  grant sentences).

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

### Enlisted reads — register row 23, opened 2026-09-02

The one item the 2026-09-02 code review deferred as its own increment rather than fixing in
place. The `Store`'s five reads take no transaction handle, so an enlisted seam on
`PostgresStore` reads committed state through the pool while its append rides the host's
transaction; a host therefore cannot chain two enlisted seam calls on one record inside one
transaction (`SqliteStore` is unaffected — its handle is the connection). The fix is an
optional `tx` on the five read signatures, honored by Postgres, validated by SQLite, rejected
by the memory backing, threaded by the redemption prologue and its residual re-read, with
enlisted-read pins in both adapter suites — a provisional-interface change across eight files.
A `COLLATE "C"` hardening on the text `due_at` comparison rides with it. Trigger (verbatim):
"The first host that needs two enlisted seam calls on one record inside one transaction; or the
first increment that changes any `Store` read signature; or the 1.0 freeze of the `Store`
contract (`docs/concept/OPEN-QUESTIONS.md` §9's gate) — whichever lands first. Does not gate
the 0.1 cut." It does not gate the cut, so it sits here beside the rows that do rather
than among them. Two related signals ride with it: the `seq` conflict arms carrying the
head seq the store adjudicated against, which would make the kernel's contention-versus-fault
split exact rather than inferred from a later re-read; and a detected pool-size floor for
enlisted use, which the guide states today.

### The embedded-postgres exit-hook workaround — register row 24, opened 2026-09-03

The one deferral the CI test-gate repair left behind. `embedded-postgres` registers an
`async-exit-hook` handler at module load, and that library's `beforeExit` listener exits the
process with code 0 over the non-zero exit code vitest sets for a failed run; imported at the
top of the adapter's vitest global setup, in vitest's main process, it made every failed
`pnpm test` exit 0 on every CI leg. The repair works around it in the global setup —
`loadEmbeddedPostgres` imports the library dynamically and removes exactly the listener the
import adds — and pins the hazard itself in a child process, so the day the library stops
needing the workaround is the day that pin fails. The upstream fix is not made here: the
workaround is test infrastructure only, and no published package carries the library.
Trigger (verbatim): "The hazard pin failing — the library, or its exit hook, no longer exits 0
over the process's exit code — or the library being replaced; either removes the workaround
and both pins together. Does not gate the 0.1 cut." Like row 23, it sits here beside the
rows that gate the cut rather than among them.

A note added 2026-09-05, recorded in the row itself: the workaround has a visible side effect.
With the `beforeExit` listener gone, the library's `exit`-event hook runs with no callback, and
after a clean teardown it throws `TypeError: done is not a function` — a stack trace after
vitest's summary on every leg that loads the library. Measured through the real
`loadEmbeddedPostgres` in a child process: exit code 1 survives as 1 and 0 as 0, with the trace
on stderr both times, so it is noise a green run carries and not a gate concern; the
still-running-server case never reaches the throw, so graceful shutdown is untouched. Two
further pins in `global-setup-exit-hooks.test.ts` hold both halves, and the trace half fails the
day the library fixes its exit path. The trigger is unchanged — its "both pins" names the two
that existed at filing, and the two added here leave with them.

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

Three further questions were surfaced by the 2026-09-02 code review, a fourth by the
2026-09-03 security review, and a fifth by the 2026-09-05 external code review; four remain
**sanction-gated, not decided** and the fourth was decided and landed — each of the four would
move a sealed enumeration or narrow a sealed rule, so each needs a fresh pass through
`docs/concept/SCOPING-GUIDE.md` §§1–2. The argument for the first three is in its phase's
commit message on `code-review-fixes`; for the fourth, in
`docs/analysis/2026-09-03-security-findings.md` (finding 2); for the fifth, in
`docs/analysis/2026-09-05-external-code-review.md` (finding 5.1):

- **A per-leg raiser/acker authority allowlist**, consulted at ack-counting time. Today the
  findings seams admit any well-formed transport identity — the informing population is
  distinct from the deciders `allowedAuthorities` governs — and a host that wants the library
  to enforce ack provenance has no field to declare it with. Re-derived independently by the
  2026-09-03 security review (finding 4 of the same record), which confirmed the code matches
  SPEC §10.2 and changed nothing.
- **Fail-closing a drifted genesis profile — DECIDED and landed 2026-09-03** (the profile-drift
  gate, `docs/superpowers/specs/2026-09-03-profile-drift-gate-design.md`, sanction granted on
  that document): every seam that resolves a persisted record refuses `unknown-profile` when
  the registered same-id profile does not digest to the record's binding; `open()` leaves a
  blocker it does not hold standing. What remains for the 1.0 review is the recompute route
  alone (catalogue item 60), which no configuration gate can close.
- **Content equality across legs at `open()`.** The prior-leg verifier compares no
  `contentDigest`; the divergence is derivable from the recorded reference, and equality would
  change no bytes and break no test, but it adds a condition to the verifier's enumerated list.
- **Two-phase sidecar cleanup and orphan classification.** Ruled out today by the sidecar
  contract's "the library performs no pruning", and by register row 22's third horn while that
  row was open; the `seq`-based split a host can compute (beyond-head means never landed; an
  occupied slot means a competing signed transition) never changes a verdict. Since the
  transactional-sidecar increment (2026-11-19) the question matters for separate mode only: a
  sidecar that is the store's own holds no entry for a transition that never landed, so its
  orphans are entries of deleted or rewritten committed transitions, or planted ones.
- **An `unavailable` answer for the signature layer — DECIDED 2026-11-17**
  (`docs/analysis/2026-11-17-sanction-calls.md`, call 1: a throwing verifier propagates as a
  fault and appends nothing, a non-`true` answer stays fail-closed; the availability-class
  route below is declined; no sealed edit is needed; the increment that builds it reverses
  the self-authored "throwing verifier fails closed" posture and argues it at its pins) —
  **built at the verifier-faults increment** (2026-11-17, branch `verifier-faults-2026-11-17`;
  `docs/process/implementation-status.md`'s section of that name). The
  question as it was recorded: a `Verifier` returns a boolean; a throw
  or a `false` is unverified, and an unverified transition of a signing record is
  `chain-compromise` at every enforcement site — a terminal edge. A verifier that fails
  transiently (a remote key service down for a minute) therefore marks a healthy record
  compromised, and only the host's own retry discipline prevents it (the guide now says so).
  Routing verifier unavailability to SPEC §8's availability class — the `unreachable` marker's
  own outcome, appending nothing — would widen that class's producer list, touch §14's AL2
  bullet, and reopen OPEN-QUESTIONS §1's key-custody tail. Real, and the 2026-09-05 review's
  one High-rated finding that survived triage; not decided here.
- **Three sealed sentences that called AL2's third condition unmet — GRANTED and landed
  2026-11-20** (the owner: "granted, update the three sentences too"; sealed commit `df7a32e`,
  `docs/process/implementation-status.md`'s "AL2 grant sentences" section). ARCHITECTURE §3,
  ARCHITECTURE §9's ladder cell and SCOPING-GUIDE §5, conditioned under the owner's 2026-11-19
  grant, said no signature outliving an uncommitted append is "not yet met". Since the
  transactional sidecar it holds where the sidecar is the configured store's own (SPEC §14,
  restated by the AL2 restatement follow-up); the three now say so in ASSURANCE §6's wording.
  The owner's 2026-11-20 word is spent at that commit.

(A fourth, a never-appends contention refusal code, was decided the same day: `record-contended`,
minted under its own sanction — `docs/superpowers/specs/2026-09-02-record-contended-design.md`.)

Two further items from the 2026-09-05 review are recorded as post-0.1 considerations, not
sanction questions, because each changes an exported function's behavior without moving a
sealed rule: a transition-legality table in `replay` (today the fold checks linkage and the
findings shapes it can detect, and a foreign chain reading `opened → refused → confirmed`
replays as `confirmed` — a fidelity-not-validity posture the store's constraints make
unreachable for chains it wrote), and one clock read per kernel operation in `finalize` (six
reads today; the decision rung and the stamp can straddle a deadline by a millisecond), which
belongs with the ladder extraction the 2026-08-30 catalogue's item 38 already names.

Three items the transactional-sidecar reviews (2026-11-19/20) found, none introduced by that
increment and none a sanction question, are recorded here so they are not lost:

- **A failed `SqliteStore` open leaves its connection open.** When the schema statements throw
  (for instance against a pre-existing table of one of the store's names with another shape),
  the `DatabaseSync` the constructor opened is never closed, which on Windows keeps the file
  locked for the life of the process.
- **A same-named index silently replaces a backing's own.** Each SQL store creates its indexes
  with `IF NOT EXISTS`, so an existing index named `records_c1_exclusivity` (or
  `signatures_by_record`) on another table makes the store skip its own. For
  `records_c1_exclusivity` that loses the durable backstop for C1 exclusivity under concurrency
  without a word; a check at open that the index exists on the store's own table would make it
  loud. The guide states the table-name collision; this index case is the quieter one.
- **`PostgresStore` writes an append's signature entries one round trip at a time** while it holds
  the record-row lock. Lock order is unchanged, so no new deadlock risk; a single multi-row
  insert would shorten the time the lock is held for a many-element batch.

### OQ §2 — decided in code; the recording gap closed 2026-08-19; the corner itself
superseded 2026-09-03

This was not a genuinely open question and not a closed one either — a third state, now
closed twice over. The sealed `docs/concept/OPEN-QUESTIONS.md` §2 recorded a live decision:
"**Decision:** fail-close in code ... versus ratify as by-design with the audit trail as
compensation." "**Recommendation on record: fail-close**" — and, unlike §1/§3/§4/§5/§7, it
carried no "Decided (this build)" tail anywhere in its text until 2026-08-19.

The recommendation was taken in code first: `finalize()`'s rung (4.5) refused `policy-drift`
on exactly this corner — a record carrying a bound `policyDigest`, finalized under a resolved
profile whose `policySource` was now undefined — and the arm's own (now superseded) comment
named the question it closed as the decided open question, fail-close, on record.
`docs/process/implementation-status.md`'s step-6 account records the same fact in prose: "The
cross-drift open decision named at the step-6 brainstorm is now DECIDED in code: FAIL-CLOSE,
so a bound record finalized under a same-id non-declaring instance still refuses
`policy-drift` rather than skipping the gate."

**Closed 2026-08-19:** the sanctioned corrective pass
(`docs/analysis/2026-08-19-sealed-set-sanction.md`) added the sealed document's own "Decided
(this build)" tail, in the sibling form — the recording gap named above is closed.

**Superseded 2026-09-03 (the profile-drift gate):** the corner this rung answered is no
longer reached at all. Dropping (or adding) `policySource` changes a profile's data-only
projection, so a same-id profile that does so no longer digests to a bound record's genesis
`profileDigest` — every seam that resolves a persisted record now refuses `unknown-profile`
at profile resolution, before rung (4.5) runs (the profile-drift gate,
`docs/superpowers/specs/2026-09-03-profile-drift-gate-design.md`). The rung-(4.5) arm for
this corner in `kernel/finalize.ts` is now an unreachable throw, not a live refusal path.
`docs/concept/OPEN-QUESTIONS.md` §2 itself now carries a second tail recording this —
"Superseded (this build, the profile-drift gate)" — alongside its 2026-08-19 "Decided (this
build)" tail; both stand as the section's history, neither edited away.

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
- **A gate is evidence only once it has been seen to fail.** The CI test step concluded
  success on every leg, for every failed run, from the adapter's first commit until the CI
  test-gate repair (2026-09-03) — the suite was green because nothing could turn it red, and
  no reader noticed because a passing gate looks identical to an inert one. The repair's
  method is the discipline: a canary with one always-failing test proved the gate inert, the
  same canary proves the repaired gate live, and the gate now reads vitest's own report
  (`scripts/ci-assert-tests.mjs`) instead of an exit code that had to survive three programs.
  Any new gate added here earns its place the same way — shown red once, on purpose, before
  its green is believed.
