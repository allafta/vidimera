# The self-test tier — design

**The build order's last item.** CONTROLS §4's OPERATOR-ASSURANCE tier lands as a
library subpath (`src/probes/`): a probe runner, a typed driver interface, probe
implementations authored against the target list in the tier's own vocabulary,
and waiver governance. With it — and with register row 18's bounds tightening taken
deliberately as this increment's own task — **step 8 exits and the build order is
complete at its declared embedded, operator-only scope**: rows 17 and 18 retire, the
four tier cells and OQ §5 move, and the record closes the arc the kernel increment
opened.

## Rulings taken at the self-test gate, so they are not re-litigated

- **Delivery: the library subpath.** `src/probes/` ships versioned with the library
  under the Store contract's own pre-1.0 discipline (behaviors stable, shapes
  provisional — stated in the module header). The exports-map wiring belongs to
  register row 6's pre-0.1 consumability work; the subpath is source convention until
  then, stated.
- **'not-driven', waivable** — and GENERALIZED: a probe reports `not-driven` when the
  host's driver lacks the exercise hook it needs **or when the probed configuration
  reaches no profile declaring the control it re-attacks** (a config with no
  multi-leg profile cannot prove SoD refusal — and the report SAYS so, which is
  itself the drift-visibility the tier exists for). Graduated honesty applied to the
  tier: `not-driven` is "unproved", never "disproved" and never a silent skip.
- **The sealed edit**: CONTROLS §4's four `SKETCHED` cells → `PROVEN` (each row's
  honest bound stays — still true: probe-proved, host-specific, at probe time), and
  OQ §5's paragraph gains its Decided tail (the subpath contract; the
  not-driven/waiver posture). Lesson-24 stem grep enumerated into the sealed brief.
- **Row 18 taken here**: `validateBounds` — `expiry.ttl` (when not `'none'`),
  `redeem.confirmToRedeem`, `redeemBound` all positive finite integers (seconds, the
  settled class `validateFreshness` set) — RED-first, with
  `construction-validation.test.ts:514`'s recorded-stance comment amended IN PLACE as
  the sequence's ELEVENTH self-authored inversion (verify the sequence number at plan
  time against the status doc), its own commit; row 18 retires with the trigger noted
  fired.

## The design, argued in place

- **The driver is the host's own wiring, probes demand isolation per call**:

```ts
export interface ProbeDriver {
  /** A FRESH, independent instance of the host's REAL wiring per call — the probes
   * re-attack the probed configuration, never a test fixture. Isolation is the
   * driver's duty: two makeConfig() results must not share live state. */
  makeConfig(): Config;
  /** Content + subject the given profile accepts (stage-able); distinct subjects per
   * call so exclusivity probes do not collide. */
  sampleContent(profileId: string): { content: unknown; subjectRef: string };
  /** A leg-decider identity the given profile/leg ACCEPTS (allowedAuthorities). */
  sampleIdentity(profileId: string, legId: string): IdentityAssertion;
  /** Consultation inputs satisfying the given leg's required kinds (pass verdicts,
   * observedAt where freshness demands) — the probes then corrupt copies of these. */
  sampleConsultations?(profileId: string, legId: string): FinalizeOptions;
  // The host-environment exercise hooks — each optional; absent ⇒ not-driven:
  severConsultationAuthority?(kind: string): Promise<() => Promise<void>>; // restore
  disableRenderingCredential?(): Promise<() => Promise<void>>;
  restartPersistence?(): Promise<void>;
}
```

  (Exact shape provisional pre-1.0 like every tier surface; the plan finalizes
  member-by-member against what the probes genuinely consume.)
- **The runner**: `runProbes(driver, opts?: { waivers?: Waiver[] }): Promise<ProbeReport>`
  — every registered probe runs (failures never abort the suite); `Waiver =
  { probeId, reason, expires }` with `expires` an offset-required RFC 3339 string
  (the freshness increment's own intake class, reused); an UNEXPIRED waiver converts
  `fail`/`not-driven` to `waived`; an EXPIRED waiver converts NOTHING and the report
  flags it (`expiredWaivers`) — the expiry discipline is the row's whole point;
  unused waivers are listed (`unusedWaivers`), never silently absorbed.
  `ProbeReport = { results: ProbeResult[]; satisfied: boolean }` where `satisfied`
  ⇔ every result is `pass` or `waived`. `assertSatisfied(report)` throws a listing —
  the CI hook (no CLI ships; YAGNI).
- **The probes** (each `{ id, target, requires, run }`, `target` quoting CONTROLS
  §4's list, `requires` the config predicate that gates not-driven): the
  library-orchestratable set — tamper-evident-on-replay (corrupt a mid-chain
  transition through the STORE handle — the insider surface — then the seam refuses
  `chain-compromise`); drifted-content-refuses; payload-carried-identity-cannot-
  finalize (an identity outside `allowedAuthorities` refuses); at-most-once-redeem;
  effects-match (a wrong-content redemption refuses, `effect-mismatch` or the
  reverify mapping per the profile's own declaration); cross-leg-self-approval-
  refuses (needs a multi-leg SoD profile); stale-or-missing-acks-block (needs a
  findings-flow profile); required-consultations-present (needs
  `requiredConsultations`); ineligible-refuses (needs `eligibility`);
  exclusivity-holds (a second open refuses `record-exists`); nothing-agent-reachable-
  decides (the agent surface's own key set is stage-only — pinned live);
  unknown-inputs-fail-closed (a garbage consultations bag and an unknown open-options
  key both THROW); binds-what-the-reviewer-saw (review()'s digest equals the bound
  digest, and only matching content finalizes); signature-tamper-refuses (needs a
  signing profile + `config.signing`: corrupt one sidecar entry, the seam refuses —
  the AL2 re-attack OQ §5's sequencing note anticipated). The host-exercise set —
  consultation-genuineness (sever → the required kind must yield the `availability`
  outcome, never a pass; restore after), live-path-distinctness (disable the
  rendering credential → the independent re-derivation still passes), state-survives-
  restart (open+confirm, `restartPersistence()`, the record replays confirmed).
- **The probes prove they can FAIL**: the test suite drives each probe class to
  `fail` through deliberately-broken drivers (a constant-digest canonicalizer makes
  drift invisible — the drift probe must fail; a lying severed-authority hook that
  stubs a pass — the genuineness probe must fail; a driver whose profiles declare
  nothing — the declaring probes must report not-driven, not pass). A probe suite
  that cannot fail is the stubbed-pass trap wearing a runner.

## 1. Tests

- **Runner/waivers**: all-pass ⇒ satisfied; one fail ⇒ unsatisfied with the listing;
  an unexpired waiver converts fail→waived and not-driven→waived; an EXPIRED waiver
  converts nothing and is flagged; unused waivers listed; `assertSatisfied` throws
  with the failing ids; failures never abort the run (every probe reports).
- **Per-probe**: each probe's pass path over a full-featured fake driver
  (MemoryStore + the fixture profiles this suite already owns, incl. signing); each
  probe class's demonstrated FAIL path (the broken drivers above); the not-driven
  paths (missing hooks; non-declaring configs); the three host-exercise probes
  exercised via fake hooks both directions (a genuine sever → availability → pass;
  the stubbed-pass lie → fail).
- **Bounds (the row-18 task, its own commit)**: NaN/Infinity/negative/zero/fractional
  `ttl`/`confirmToRedeem`/`redeemBound` all THROW at construction (RED-first — today
  they construct); valid profiles unchanged; the :514 comment amended in place as the
  inversion; the eleventh-inversion entry follows the file's numbered convention.
- **Frozen surfaces**: src/store/, chain/encoding.ts, byte-stability.test.ts,
  src/signing/ untouched; docs/concept/ touched ONLY by the sealed task.

## 2. The record — step 8 exits; the build order is complete at its declared scope

- **Status doc**: steps table → step 8 **Exited** (all four tail items landed); a
  CONTROLS-§4 row (the tier's shape, the not-driven generalization, the
  can-fail discipline, the provisional-shape note); the bounds inversion recorded;
  **the closing narrative**: eight of eight build-order steps exited, the build
  complete at the concept's declared embedded operator-only scope — what remains
  outside it stays outside BY DESIGN (AL3 documented-only; concurrent legs out of
  scope pre-1.0; the §12 signature freeze and consumability at the 1.0/0.1 gates,
  register rows 5, 6, 15), stated with the honesty register.
- **Register**: rows 17 AND 18 RETIRE (triggers fired, noted in place per the
  register's convention); the surviving rows enumerated in the report.
- **CLAUDE.md / README**: step 8 exited; the build-order arc closed; the tier
  paragraph; counts (24 codes; the suite's new totals) where they appear.
- **Sweep** (LAST, hit==verdict): the standing list plus `self-test`, `probe`,
  `operator-assurance`, `OPERATOR-ASSURANCE`, `waiver`, `not-driven`, `tail`,
  `remains unstarted|remaining tail|one item|last item`, `Started`, `row 17|row 18`,
  absence vocabulary (`no probe`, `tier is not`, `unbuilt`), `SKETCHED`.

## What this does not claim

- **The tier proves properties in the probed configuration, at probe time** — every
  row's honest bound survives verbatim; a passing suite is not third-party assurance
  and says nothing about unprobed configurations. Stated at the runner's header and
  the record.
- **The subpath's shapes are provisional pre-1.0**; the exports map is row 6's work.
- AL3 stays documented-only, `[SKETCHED]`; the pre-1.0 gates (rows 5, 6, 15) remain
  the register's live residue — the BUILD ORDER ends; the pre-0.1/1.0 hygiene gates
  do not.
- The probes gain no privileged access: everything runs through the public surfaces
  plus the Store/sidecar handles the host's own config already contains — the
  insider-attack surface, which is the point.

## Process

Subagent-driven development, standing lessons in force: enumerations DERIVED from the
tracking docs (lesson 25 — the probe list is written against CONTROLS §4's own text,
quoted); the sealed task's full before/afters + run-by-run word-diff (lesson 22) +
stem grep (lesson 24); escape-free cited strings (lesson 20); the record task greps
the tier's absence vocabulary (lesson 21); counts with movement; RED executed (the
bounds task especially); the final review checks the status doc against CODE; no new
runtime APIs — the floor stays `>=22.16`.
