# Changelog

Notable changes to the Vidimera packages — `@vidimera/record` and, since 2026-08-19,
`@vidimera/store-postgres` (both publish together at the 0.1 cut, and version in
lockstep thereafter — the 2026-08-20 versioning ruling,
`docs/analysis/2026-08-20-versioning-mechanics.md`; a cut with no changes in one
package says so here plainly rather than silently). The format loosely follows the
widely used keep-a-changelog shape; versions will follow semantic versioning once a
version exists to follow it.

**No release has been cut.** The package is pre-0.1 and unpublished — everything below sits
in `Unreleased`, recorded by build-order step rather than by date. The authoritative,
step-by-step account with gate outputs is `docs/process/implementation-status.md`; this file
is the summary, and that file wins on conflict.

## [Unreleased]

### Added

- **The kernel confirm loop** (build-order step 1): `create()` with fail-closed profile
  validation; the agent/operator capability split as two frozen handles; `stage` → `open` →
  `review` → `finalize`; content binding through registered canonicalizers and library JCS,
  including the always-on reviewed-surface (`facts`) binding; hash-chained transitions with
  `replay`/`verifyChain`; the result-first outcome model with the refusal registry and
  per-leg `terminalRefusals`; the open-window ttl with en-passant expiry; byte-stability
  pins and adjacent-pair gate-order tests.
- **Storage and retirement** (step 2): the `Store` contract completed to its eight methods
  (`appendBatch`, `listDue`, and `findNonTerminal` — which also made record exclusivity
  actionable — landed here); the in-memory and embedded-SQL (`node:sqlite`) reference
  backings, held equivalent by a backing-parameterized conformance suite and a
  cross-backing byte-identity test; chain retirement via the operator-only `seal()` and
  the store's seal-finality bar. The server-SQL third backing was consciously deferred at
  that step (deferral register row 15) and landed 2026-08-19 — see its own entry below.
- **The effect seam** (step 3): single-use redemption in both shapes — direct
  (`redeem`, host-transaction enlistable) and token (`beginRedemption` /
  `completeRedemption`, single-use token returned exactly once and never persisted) —
  plus the two remaining pending-window clocks (confirm-to-redeem, redeem bound) with
  their en-passant resolution, and the operator surface's sweep read over the store's due
  listing.
- **Multi-leg separation of duties** (step 4): ordered legs with verified prior-leg
  references, and the SoD gate over recorded actors and declared proposers.
- **Consultations** (step 5): the attach form for host-obtained consultations; required
  consultations with declared-order gating; the availability outcome.
- **Eligibility and policy drift** (step 6): the eligibility consultation kind with
  `ineligible`; policy-drift notarization with fail-close on the removed-policy-source
  corner.
- **Findings and acknowledgments** (step 7): `raiseFinding`/`acknowledge` as the only
  mid-lifecycle appends; ack-coverage gating (`ack-missing`/`ack-stale`); the findings
  projection on review.
- **Recovery, live capture, AL2 signing, and the self-test tier** (step 8): the
  `supersedes` recovery relation; live capture mode with its construction obligations;
  detached per-transition signing as an operator-enabled upgrade (mint, enforcement at the
  seams' chain-verify gates, and consultation freshness); and the operator-assurance probe
  tier (`runProbes`/`assertSatisfied` over a host-supplied driver).
- Repository-level: CI (typecheck, lint, strict lint, tests, build, the tarball smoke
  test, the contract scan, and the api-reference drift gate), the standalone-contract
  scan with citation resolution over tracked code, and the public documentation set
  (`README.md`, `docs/guide/`, contributor and security policies).
- **The pre-0.1 API review** (2026-08-19, retiring deferral register row 6): every
  signature-reachable type exported (no unspellable names), the signing tier and the pure
  `replay`/`verifyChain` audit functions moved onto the root entry, `Surfaces` naming
  `create()`'s handle pair, all prior names ratified unchanged, and `terminalRefusals`
  members validated at construction (a non-registry code now throws instead of silently
  never matching).
- **Publish tooling** (2026-08-19, deferral register row 1's tooling half): the full
  manifest shape (`exports` with `.` and `./probes`, `types`, `files`, `sideEffects`,
  `license`, `engines`, `repository`), a tsc build to `dist/`, a packed-tarball smoke test
  on every CI run (`pnpm smoke` — installs the tarball into a scratch project and drives a
  confirm loop through the exports map), and a dispatch-only, provenance-attested release
  workflow. The package stays `private: true` until the 0.1 cut by design.
- **CI hardening** (2026-08-19): a two-tier workflow — the platform-independent gates once
  on Linux; tests, build, and the tarball smoke test on a matrix covering the exact
  declared Node floor (22.16.0), current Node, and all three OSes — plus pnpm caching,
  weekly grouped Dependabot updates, and a CODEOWNERS guard over the sealed concept set
  and the frozen byte-stability digests. The Biome config migration landed with it
  (deferral register row 5, its trigger fired deliberately), clearing the deprecation
  notice from lint output.
- **The server-SQL backing** (2026-08-19, retiring deferral register rows 15 and 4):
  `@vidimera/store-postgres`, a second workspace package — `PostgresStore` over a
  caller-owned `pg.Pool`, row locks and a genesis advisory lock making the append CAS and
  the exclusivity constraint race-free under real concurrency. Proven three ways: the
  backing-parameterized conformance suite wired by one caller file (unchanged), a third
  cross-backing byte-identity leg, and five multi-connection contention scenarios —
  all against a real embedded Postgres the suite starts per run, on every CI OS. The
  second package fired row 4's workspace-shape work in the same increment, and `record`
  gained the adapter-author exports (`transitionDigest` and the C3/C4 semantic arms) a
  conforming third-party backing needs.
- **Enlisted token seams** (2026-08-19, retiring deferral register row 16):
  `beginRedemption`/`completeRedemption` gained the additive trailing `tx?` the direct
  `redeem` has — an enlisted issuance or completion commits or rolls back with the host's
  own outbox/effect row, and the enlisted-tampered corner refuses `chain-compromise`
  result-first with no edge.
- **Release mechanics and the docset gates** (2026-08-19): the api-reference drift gate
  (`pnpm api-sync`, in CI and the release workflow — its first run caught five
  undocumented exports, since documented); NOTICE files carrying the copyright (root and
  both packages); blank issues disabled with security reports routed to private
  reporting; the release workflow publishing both packages tarball-first with provenance;
  and `docs/process/release-checklist.md` as release day's one authoritative list. The
  phase-6 first-use rehearsal consumed both packed tarballs in a scratch project — full
  confirm loops green on both stores — and recorded that the `node:sqlite`
  ExperimentalWarning greets every `@vidimera/record` import.
- **Recorded human decline** (2026-08-21, the first post-build-order promotion): the
  operator-only `open → declined` seam (`decline()`, switched on by a leg's
  `decline: true`) giving a rejection the same evidentiary treatment as a confirmation —
  the authority rungs (chain-verify, state/expiry, identity, separation of duties,
  content-drift, the mandatory `facts` binding, eligibility including its AL2 freshness
  bound) gate exactly as finalize's do, while the evidence rungs (required
  consultations, ack coverage) are deliberately skipped and the seam takes no policy
  input. `declined { actor }` is terminal under every leg/effect-seam combination; zero
  new refusal codes, every decline refusal reusing an existing one; a non-declaring
  leg's chain stays byte-identical. The honest bound: proves who declined what they saw,
  never that the decline was sound — a "no" never routed to the seam does not exist.
- **Proposal provenance** (2026-08-21, the second post-build-order promotion): `open()`'s
  `proposed: { stagedRef }` option resolves the agent's original staged draft through the
  store, requires it to name the same `(profileId, subjectRef, legId)` as the opened
  draft (either mismatch throws, the same caller-error posture as an unresolvable
  `stagedRef`), and binds the resolved draft's digest into the genesis as
  `proposedDigest`, present-iff-supplied. The honest bound: proves a draft with that
  digest existed for the same triple at open, and — by comparing digests — whether the
  decision changed it; never who authored either draft, never that the revision was
  sound. Nothing gates on it.
- **Effect-result notarization** (2026-08-21, the third post-build-order promotion): a
  profile declaring `redeem.result: true` admits an optional host-claimed outcome digest
  at `redeem()` and `completeRedemption()` — `beginRedemption()` rejects it
  unconditionally, since issuance precedes execution — binding it as `resultDigest`
  inside the `redeemed` payload, present-iff-supplied. The honest bound: notarizes that
  the host asserted this outcome when it closed the coupling — the library never
  observes the effect, never verifies the claim, never mirrors later business state; the
  digest lands in the chain head, head-exposed until a `sealed` cap chains over it (AL2
  signing closes the window early).
- **`SignatureReport.orphans`** (2026-08-29): `verifySignatures(recordId)` now names
  every sidecar digest with no chain counterpart, sorted, computed inside the read it
  already makes — the entries a host's `SignatureStore` reconciliation should remove.
  Reporting only: no gate, verdict, or seam reads it, and deferral-register row 22's
  orphan-accumulation half stays open — the field makes the growth visible, it does not
  bound it.
- **`record-contended`** (2026-09-02, the record-contended increment — a SPEC §8 registry
  amendment under its own fresh sanction, the tenth marker-bearing sealed-set edit): the
  twenty-fifth refusal code. A `finalize`, `decline`, `raiseFinding` or `acknowledge` that loses
  its append to a concurrent finding or acknowledgment on the same record now returns
  `{ status: 'refused', code: 'record-contended' }` — nothing recorded, the record still open,
  re-invoke — where the code-review fixes earlier in this same unreleased span had thrown an
  `Error` named `ContentionError`. Profile-conditional under the findings flow, the only source
  of state-preserving appends; never appends (the never-appends set's definition widens to name
  contention as its fourth category); a genuine storage fault at the same site keeps its
  throw. The two `ContentionError` entries below describe that interim shape and are left as the
  history they are.
- **`SignatureReport.genesisProfile`, and the exported `profileDigest`/`projectProfile`**
  (2026-09-03, branch `security-findings-2026-09-03`, from the same security review): the
  report now says whether the profile this instance holds under the genesis `profileId` is the
  one the record was opened under — `matches`, `drifted` (both digests), or `unresolvable`. The
  review's route: `signingDeclared` has always been computed from the LIVE profile, so a
  same-id profile that dropped `signing: true` reads a signing record as plain AL1 and
  finalizes it, and the report said only `signingDeclared: false`, which a reader takes as
  "not a signing record". The chain carried the evidence all along — the genesis
  `profileDigest` covers `signing` — but nothing compared it, and the helpers a host would need
  to compare it offline were not exported. Now both are true. Reporting only, like `orphans`:
  no gate reads the field and the drifted sibling still finalizes — that fail-open is the
  rehoming residual the record already names (a fail-close changes the refusal registry and
  OPEN-QUESTIONS §1's decided text, so it waits on a fresh sanction), and
  `packages/record/test/profile-drift-report.test.ts` pins it as a bound beside the new field
  (red first: the field absent, the exports missing). The profile-drift gate (under Changed,
  2026-09-03) closed the configuration route that same day; this entry is left as the history
  it is.

### Changed

- **A record refuses under a profile this instance does not hold — the profile-drift gate**
  (2026-09-03, branch `profile-drift-gate`; a sealed-set widening under a fresh sanction
  recorded in `docs/superpowers/specs/2026-09-03-profile-drift-gate-design.md` §8 — no
  maturity marker moves): every seam that resolves a persisted record (`finalize`, `decline`,
  `raiseFinding`, `acknowledge`, `redeem`, `beginRedemption`, `completeRedemption`, `seal`)
  now refuses `unknown-profile`, never-append, when the registered same-id profile's data-only
  projection does not digest to the record's genesis `profileDigest`; the two cross-record
  verifications fold the same miss into `prior-leg-unverified` and `supersedes-unverified`;
  and `open()` leaves a due blocker it does not hold standing (`record-exists`) rather than
  expiring it. This closes the configuration route the 2026-09-03 security review took — a
  same-id profile that dropped `signing: true` finalizing a signing record — and enforces the
  version discipline the concept always asked for: an in-place profile edit strands that
  profile's open records until the declarative fields are restored exactly or the edit gets a
  new id. Not closed, said plainly: the recompute route (a rewritten genesis with a consistent
  digest) stays the rehoming residual at AL1. Consequences inside the tree: both SPEC §10.3
  cross-instance policy corners are pre-empted (the now-non-declaring arm is an unreachable
  throw), two `policy-drift` pins and the renamed-maker SoD pin flip to `unknown-profile` —
  the thirteenth self-authored inversion — and `profile-drift-report.test.ts`'s bound pins
  flip as their header promised. `packages/record/test/profile-drift-gate.test.ts` pins every
  seam, the depth pair, both recovery routes, the cross-record verifiers and the blocker path,
  red first. The one public-surface change: `DecisionRecord` (the `replay()` fold) gains a
  required `profileDigest: Digest` carrying the genesis binding — additive on a derived,
  read-only type, so no reader breaks; the api-reference lists it.
- **An identity is exactly `{ principal, authority, proofRef? }`** (2026-09-03, branch
  `security-findings-2026-09-03`, found by the same security review as the verifier fix under
  Fixed): every seam that takes an `IdentityAssertion` — `finalize`/`decline`'s actor,
  `raiseFinding`/`acknowledge`'s identity, an obtained consultation's `checker`, and
  `facts.checker` — now rejects an object carrying any other key, or a `proofRef` that is not
  a string (an explicit `undefined` is admitted, the shape an optional field takes under a
  spread). Until now the one validator checked a non-empty `principal` and `authority` and
  nothing more, and every seam persisted the object verbatim into a digested, immutable
  transition — the recorded posture called the extra keys host attestation. This inverts that
  posture (the twelfth self-authored inversion, argued at `isValidIdentity`'s own site in
  `kernel/finalize.ts`): the extra keys are exactly where a host leaks an e-mail address or a
  bearer token into a chain whose erasure story rests on the principal being a pseudonym held
  outside it. Each seam keeps its existing posture toward an invalid identity — the refusal
  `identity-authority-refused` at `finalize`/`decline`, a thrown caller error at the findings
  seams and the obtained-consultation checker, `consultation-missing` from the facts gate;
  only what counts as valid moved. A host that passed a richer object must now project it
  down to the three fields. Pinned in `packages/record/test/identity-shape.test.ts` (red
  first: all six against the old validator).
- **Code-review fixes, six phases** (2026-09-02, branch `code-review-fixes`; each phase is
  one commit whose message carries the argument). `finalize`/`decline` losing their single
  batch append to a concurrent state-preserving append (`raiseFinding`/`acknowledge`) on the
  same record now throw an `Error` named `ContentionError` — nothing recorded, re-invoke; since
  minted as the refusal `record-contended`, see Added —
  where they threw a storage-fault error whose message asserted the race was unreachable
  under a single-writer bound the Postgres adapter never had; a genuine storage fault keeps
  its own throw, told apart by a one-time re-read. `verifyChain` gains a fourth check, record
  identity (every transition names the genesis's recordId), for the exported offline read.
  The kernel's definition of "due" now matches the stores' inclusive listing gate at the exact
  instant (`now >= deadline`), in `resolveDueClock` and the enlisted guard alike. `open()`'s
  expire-then-retry re-stamps the retried genesis from a fresh clock reading, so the new
  record never claims to have opened before the expiry edge that admitted it (under a moving
  clock that is one extra signature mint on that path, and the first attempt's sidecar entry
  becomes a lost-genesis orphan that `verifySignatures().orphans` names; the no-edge memo pin
  was inverted, authorized, from two mints to three). `withSigning`'s per-record memo is a
  bounded LRU of ten thousand. `allowedAuthorities` joins the settled construction class:
  an empty list, an empty string, or a duplicate throws at construction. `SqliteStore` gains
  `close()` and prepares each statement once. `PostgresStore`'s lazy DDL runs on one client
  under a transaction-scoped advisory lock, closing a catalog race two processes bootstrapping
  one schema could hit — reproduced deterministically before the fix.
- **The unknown-option-key error head** (2026-09-01, the registry-hygiene increment): an
  unknown options-bag key at `open()`, `finalize()`, `decline()`, or any redemption seam
  now throws `unknown option key (<key>) — <the seam's accepted keys>` where it threw the
  feature-guard era's `GOVERNED feature not available in this build (<key>)`. The guard
  era closed with zero governed fields; the old head named a mechanism the tree no longer
  has, was recorded as unpinned prose, and this reword lands before 0.1 — the package's
  first release, none having shipped yet — ships the string an adopter could come to match
  on. The new head IS pinned. Each seam's tail is unchanged.
- **`beginRedemption`'s unknown-option-key tail** (2026-09-02, the parked-truths
  increment): an unknown key at issuance now says `beginRedemption() accepts only tx in
  this build — a result is refused at issuance and belongs to completeRedemption (SPEC
  §11.2)` where it shared the family-wide "accepts only tx and result" sentence —
  issuance never accepted a result (the dedicated refusal for a present one is
  unchanged), and this was the one seam whose unknown-key sentence needed a charitable
  reading. Pinned on both sides: the new tail, and that a present result still gets the
  dedicated message, never the unknown-key one.
- **Manifest metadata** (same increment): both packages gain `homepage`, `bugs`, and
  `keywords` so the 0.1 registry pages render links and are keyword-findable;
  `publishConfig` deliberately omitted (the release workflow passes `--access public`
  itself). `@types/node` pinned to the floor major (`^22`, resolved `22.20.1`, both
  packages' typecheck clean including the `node:sqlite` surface) with a new Dependabot
  ignore rule blocking `@types/node` semver-major bumps; the pin narrows the
  types-vs-floor gap by a major line, it does not close it — the exact-floor CI leg
  (ubuntu @ 22.16.0) remains the runtime gate regardless.

- **Construction loudness finished for the shapes an external review found still lax** (the
  review-hardening pass, 2026-09-05): `create()` now throws its own `invalid profile` error —
  never a raw `TypeError`, never silent acceptance — for a `captureMode` outside
  `'staged' | 'live'`, an `ackMode` outside its three values (which `ackCounts` had been
  reading as the permissive `'any'`), an `expiry` that is neither `'none'` nor an object, a
  `sod` without a `notActorOf` array, an empty profile or leg id, and a non-array `legs`. A
  `terminalRefusals` member that could never take effect is a construction error too: every
  never-appends code, `chain-compromise` (the compromise class appends regardless), and a
  duplicate; `leg-expired` and `availability`, the two members SPEC §8 names legal-but-inert,
  stay constructible. The `Canonicalizer` contract now states totality — a registered
  canonicalizer that throws at a decision seam propagates as a configuration fault, appends
  nothing, and is never read as `content-drift` — pinned as a bound. The guide's `Verifier`
  paragraph names the two operational consequences of fail-closed verification (retry inside
  a transiently failing verifier; keep a retired key's verifier registered), and its
  `SqliteStore` entry states the single-operator bound.

- **`verifyChain` takes the record's id, and the non-verifying reads throw on another
  record's rows** (the chain-binding increment, 2026-11-17, branch `chain-binding-2026-11-17`
  — the public-surface half of the binding fix under Fixed): the exported pure
  `verifyChain(chain, recordId?)` gains an optional `recordId`. Given, every transition must
  carry it and the genesis link must derive from it, so another record's chain reports
  `{ intact: false, firstBreakSeq: 1 }` with both ids in the detail; omitted, the function
  behaves exactly as before — identity is checked against the genesis row's own id, which a
  wholly relocated chain passes — so pass the id whenever you know it, an offline audit of an
  archived chain included. The reads that use a chain without verifying it — `getRecord` on
  both handles, `replay`, `review`, `verifySignatures` — and `open()`'s read of the record
  blocking its `(profileId, subjectRef)` now throw an `Error` whose message contains
  `foreign persisted data` and names the read and both ids, when the store returns rows whose
  `recordId` is not the one asked for: a storage fault under SPEC §8's loud-throw posture,
  nothing recorded. An empty chain keeps its old answer at each of them, `readChain` and
  `chainHead` stay raw, and an honest store sees no change — the frozen byte-stability
  digests did not move and no existing assertion changed its truth value.
  `verifySignatures`'s recorded throw class ("only on the caller-error/unknown-record class
  every other read takes") widens with the other reads' — the fourteenth self-authored
  inversion, argued at its pin in `packages/record/test/chain-binding-seams.test.ts`.

### Fixed

- **The verifier registry could be satisfied with no key** (2026-09-03, branch
  `security-findings-2026-09-03`, found by a security review of the tree): `verifySignatures`
  and the enforcement primitive behind every seam looked a sidecar entry's `keyRef` up with a
  bare index into the host's `verifiers` object, and a plain object's bare index walks the
  prototype chain. A forged entry whose `keyRef` named an inherited `Object.prototype` member
  resolved to that member instead of missing; two of them (`toString`, `constructor`) return a
  truthy value when called with transition bytes and any signature, and the layer read
  truthiness — so a sidecar written by a storage-side insider holding no signing key verified
  whole, and every enforcement site confirmed the record. This is exactly the trap
  `resolveCanonicalizer` closed at the 2026-08-03 review, in the one registry that arrived
  after it. The lookup is now `Object.hasOwn` (an own key of the registry, never an inherited
  member), and a verification is the literal `true` — a host verifier answering a truthy
  status string or object no longer verifies either. `packages/record/test/verifier-registry.test.ts`
  pins the family: the two members that passed (red first, against the unfixed tree), the four
  that already failed closed, and the non-boolean answer. Squarely inside `SECURITY.md`'s
  stated scope ("The signature layer (AL2) reporting a transition verified when it is not");
  pre-publication, so there is no advisory to issue.
- **The CI test gate was inert** (2026-09-03, branch `ci-windows-test-gate`): every `pnpm test`
  step in the CI matrix and the release workflow concluded success whatever the tests did, on
  every OS, since the adapter's first commit. `embedded-postgres` registers an `async-exit-hook`
  handler at module load, and that library's `beforeExit` listener exits 0 once the event loop
  drains — over the non-zero exit code vitest had set; the adapter's vitest global setup
  imported the library at the top of the module, in vitest's main process. Found by a canary
  pull request carrying one always-failing test (CI run 33705059031: four green test legs),
  bisected locally to a global setup that did nothing but import the library. Fixed at the
  source — the global setup loads it through a guarded dynamic import that removes exactly the
  `beforeExit` listener the import added, pinned in both directions (the hazard itself in a
  child process, so the pin fails the day the library no longer needs the workaround; the
  guarded path leaving the listeners untouched) — and guarded independently: `pnpm test:ci`
  writes vitest's JSON report and `scripts/ci-assert-tests.mjs` fails the job on any failed,
  skipped or todo test, in CI and the release workflow alike. The four SQLite restart-driver
  probe tests, which the Windows runner had been timing out at the 5s default (the visible
  symptom that led here), get a 20s budget. The honest bound: every earlier CI green on a test
  leg proved the step ran, not that its tests passed; locally reported results were never
  wrong, only the process's exit code. Re-measured: 68 files, 864 tests. Follow-ups, the
  same day (branch `ci-followups`): the release workflow gained a `dry_run` dispatch input
  that runs every gate and packs both tarballs while skipping the guard and both publish
  steps, dispatched once so the never-yet-executed job has run; deferral-register row 24
  records the embedded-postgres exit-hook workaround with its trigger; the 2026-08-19 CI
  design record carries a dated addendum; and every remaining CI tool's exit code was
  shown non-zero on its own failure class, with the table in the status document. Then a
  workflow-file parse gate (branch `workflow-parse-gate`): `scripts/test/workflows.test.mjs`
  parses every workflow with `yaml` and asserts the facts the documents rely on, after
  GitHub's parser had rejected the dry-run input's first push and nothing in this tree could
  have said why; and the dry run's guard now reports without blocking, so a dry run against
  a release-shaped tree shows it passing — which a release-day rehearsal then did
  (`docs/analysis/2026-09-03-release-rehearsal.md`): the checklist's file changes executed on
  a throwaway branch, the docset recipe run to empty, every gate green, the dry run's guard
  passing on the release shape with both tarballs named 0.1.0, one checklist
  self-contradiction found and amended, and the flipped sentences kept as a worked example.
- **Code-review, second round** (2026-09-02, the same branch): the findings seams mapped
  EVERY lost compare-and-swap to `record-not-open`, false of a record that lost only a seq
  race and is still open — two concurrent `raiseFinding` calls now leave the loser with the
  same `ContentionError` the decision seams then threw (since the refusal `record-contended`),
  and re-invocation lands its finding; the
  signing decorator no longer learns from an empty chain (a non-genesis append arriving before
  its genesis had pinned the record as non-signing, so the genuine genesis landed unsigned and
  the fail-closed layer read chain-compromise — reachable only through `withSigning` composed
  directly with host-chosen ids); `SqliteStore`'s statement cache follows the connection, so
  closing through the documented `database` handle no longer leaves finalized statements
  behind; a Postgres client whose ROLLBACK failed is released as poisoned rather than handed
  back to the pool in an aborted transaction; the DDL bootstrap and the no-tx write path share
  one pooled-transaction primitive; the retried genesis is stamped from the same reading as
  the expiry edge that admitted it; `verifyChain`'s documented check order now matches the
  loop's, with the same-index precedence (seq, recordId, prevHash) pinned; the signing memo
  skips its recency promotion for consecutive appends to one record; and the memo pins run
  over an O(1) stub store instead of MemoryStore's linear exclusivity scan. Re-measured: 67
  files, 860 tests.
- **Code-review pins and truth repairs** (2026-09-02, the same branch): principal-only
  identity comparison in the SoD gate and the ack-counting predicate, and the findings seams'
  host-trusted identity, pinned end to end as the rulings they already were; the prior-leg
  verifier's silence on content across legs pinned as an omission awaiting a ruling, with the
  divergence shown derivable from the recorded reference alone; three source comments and one
  test header that asserted a single-writer bound reworded to the reachable truth; the guide
  caught up (`ContentionError`, since `record-contended`; `SqliteStore.close()`, `verifyChain`'s
  fourth check, the
  `allowedAuthorities` rule); `CLAUDE.md`'s measured sentence re-measured (67 files, 860
  tests). Deferral-register row 23 opened for the one item deferred as its own increment: an
  optional `tx` on the `Store`'s five reads (it does not gate the cut).
- **Parked truths** (2026-09-02): `construction-validation.test.ts` stopped describing
  the current unknown-option-key throw in the guard era's vocabulary (five present-tense
  sites; the sixteen past-tense guard-era records stand); `CLAUDE.md`'s measured
  sentence re-measured (67 files, 833 tests; the refusal-code count stood at 24 as
  measured); the key-retirement orphan pin now also counts
  `verifySignatures().orphans` — the register's own vocabulary, reporting only, row 22a
  unchanged.
- **Truth restoration** (2026-09-01, post-build-order): every stale shipped-source and
  test sentence found by the pre-cut sweep repaired against what the tree actually does —
  the retired naming-review pointer (`operator-surface.ts`), the Node floor (`id.ts`), the
  adapter-anticipation note (`store/store.ts`), the `appendsOn` caller set
  (`refusal-codes.ts`), and the enlisted-token and racing-store claims (`clocks.test.ts`,
  `redeem.test.ts`, `redeem-token.test.ts`) — plus the one behavior-adjacent edit,
  `kernel/expiry.ts`'s last hardcoded leg index replaced with the derived index the
  sibling `dueAt` producer already computes, output-identical (both `expired` and
  `redemption-failed` are terminal, so the fed flag is `false` under either derivation)
  and pinned. New evidence: the enlisted-token due-window twins over both token seams, the
  (5)→(6) race pair on both redemption ladders (a fired-state assertion pinning the
  order, not only the outcome), the unknown-profile arms exercised at `finalize()` and
  `seal()`, `transitionRef` upgraded to equality against the appended edge's digest at all
  nine signature-broken cells, the key-retirement orphan baseline (one sidecar orphan
  minted per call — a pin, not containment), a `magnitude` byte pin, and the Postgres
  payload-posture pin proving its JCS-invisible-member round-trip really matches
  `SqliteStore`'s. `listDue()` is recorded as carrying no naming ruling of its own,
  docketed to the 1.0 freeze rather than claimed retroactively covered. No public-surface
  change; no deferral-register row moves; no checklist box ticked.
- **The `signature-tamper-refuses` operator-assurance probe no longer picks its tamper
  victim by sidecar position** (2026-08-29, the sidecar-contract increment): `SignatureStore`'s
  `listByRecord` promises no order, and under an orphan-first order the contract permits the
  probe garbled an entry no chain transition names, left every real signature intact, and
  reported a FAIL against a sound build — the one verdict that tier exists never to give. It
  now correlates through `verifySignatures`, and the corpus's shared break helper does the
  same. In the same change the `SignatureStore` contract states what it had left unsaid: a
  conforming sidecar holds entries for transitions that never landed, they are safe to prune
  when no chain transition references them, and the library never prunes. The honest bound:
  both defects were latent, not live — the in-memory sidecar lists in insertion order, and no
  real flow was found producing the adverse order; the pins inject it.
- **A refusing seam call against a record admitting no append target no longer asks the
  signer once per CAS candidate** (2026-08-29, the no-edge containment increment): the
  signing decorator minted a signature for every attempt of the compromise walk — three on a
  sealed record, four on an already-refused one — over byte-identical bytes, and twice for
  `open()`'s expire-then-retry genesis. It now mints once per transition object, with the
  sidecar write still made before every attempt; the walk also drops the one candidate C3 can
  never admit, so a terminal-folded record tries three rather than four. Outcome-preserving:
  no refusal code, class, or `transitionRef` changes on any shape. The honest bound, in the
  same breath: the orphan sidecar entry such a call leaves behind is unchanged — deferral
  register row 22's orphan half stays open, and `SignatureReport.orphans` (above) is how a
  host sees it.
- **A transient database failure no longer bricks a `PostgresStore` instance**
  (2026-08-19, found by the full-project review): the lazy-DDL memo cached a rejection
  and replayed the stale error forever; it now resets on failure so the next call
  retries.
- **A genesis race on one `recordId` across different `(profile, subject)` pairs now
  reports the contract's `state-mismatch` conflict** instead of surfacing a thrown
  unique-constraint violation (same review; pinned by a repeated-round contention test).
- The adapter's peer range on `@vidimera/record` publishes as a caret range
  (`workspace:^`), not an exact pin — a record-only patch release no longer breaks fresh
  adapter installs.

- **The redemption prologue reads the clock once** (the review-hardening pass, 2026-09-05):
  the enlisted due-guard and `resolveDueClock` had each read `now()`, so a window deadline
  falling between the two reads let an enlisted call pass the guard and then resolve — routing
  the resolver's own-transaction append onto the connection the host held open, which the
  embedded backing rejects with a throw. One `Date` is now handed to both; pinned under a
  straddling clock. The signature-tamper probe flips the first character of the persisted
  signature instead of writing a fixed `AAAA` prefix, which was a no-op on a signature that
  already began so (one run in roughly sixteen million against a real signer).

- **Another record's rows read back under a record's id no longer pass as that record, and
  no library-built edge lands on the record they came from** (the chain-binding increment,
  2026-11-17, branch `chain-binding-2026-11-17`): nothing bound a loaded chain to the
  `recordId` it was loaded for. The SQL backings key a read by a `record_id` column that the
  stored row's own JSON need not match, so a storage-writing insider who copied honest record
  Y's rows under record X's key — no hashing, no signing — got `verifyChain(X)` intact and,
  at AL2, `verifySignatures(X)` all-verified, Y's history passing as X's. The operator's
  next ordinary call on X then built its edge — a `chain-compromise` refusal, a
  `terminalRefusals` refusal, an `expired` clock edge, a finding, a `content-drift` edge;
  signed, at AL2 — addressed from the loaded chain's last row, so it landed on Y: a terminal
  edge could cost Y its pending decision, and Y still verified clean. A relocated prior leg
  or predecessor also satisfied `priorRecordRefs` or `supersedes`, so a reference could
  borrow another record's verified history — for a prior leg, another record's recorded
  actor, which separation of duties then checked against. Now every verifying load binds to
  the id it loaded by (each seam's chain-verify rung, `verifyPriorLegs` and
  `verifySupersedes` against the referenced id, and the operator `verifyChain` wrapper); the
  AL2 layer lists the sidecar by that id; and every edge the library builds is addressed by
  the id the operation names (the caller's, or the blocker id the store named for `open()`'s
  en-passant expiry), never by one read off the chain. A relocated X refuses
  `chain-compromise` at every seam that acts on it, with the edge, when the store admits one,
  on X and addressed to X; Y comes out exactly as it went in; the cross-record checks refuse
  `prior-leg-unverified` and `supersedes-unverified`. The signing decorator, which reads a
  record's signing decision from its genesis when its cache is cold, now signs — and caches
  nothing — when that genesis belongs to another record, so the fault cannot pin Y's signing
  decision on X for the rest of the process (where X signs and Y does not, X's later appends
  would have landed unsigned, and X would then refuse `chain-compromise` for good). Pinned on
  `MemoryStore` and `SqliteStore` at AL1 and AL2, by a real SQL row copy on `SqliteStore`,
  and by a source census (`packages/record/test/chain-binding-census.test.ts`) that fails
  when an unbound chain load or a chain-derived address appears. The honest bound, in the
  same breath: this detects a chain relocated under another record's id. Whole-record
  absence stays silent, and at AL1 an insider who rewrites every copied `recordId` and
  recomputes every link — or edits the head — is still not caught: SPEC §13A's residuals,
  unchanged. Pre-publication, so there is no advisory to issue.

### Known not-done

- The release itself: the package is `private: true` and unpublished by design until the
  0.1 cut — the publish tooling landed 2026-08-19, and deferral register row 1 stays open
  until the release workflow is exercised once at that cut.
