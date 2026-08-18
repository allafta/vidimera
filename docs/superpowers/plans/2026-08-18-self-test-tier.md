# Self-Test Tier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land CONTROLS §4's operator-assurance tier as `src/probes/` (runner, driver
interface, probes that can fail, expiring waivers), take register row 18's bounds
tightening deliberately, execute the sanctioned sealed edit, and record step 8's exit —
the build order complete at its declared scope.

**Architecture:** A self-contained `src/probes/` layer consuming only the PUBLIC
surfaces plus the Store/sidecar handles the host's config already carries (the
insider-attack surface); probes registered `{ id, target, requires, run }` with the
`requires` predicate generalizing `not-driven` to unreached configurations; waivers
convert fail/not-driven only while unexpired.

**Tech Stack:** TypeScript strict, vitest, Biome; pnpm workspace, Node >=22.16.

**Spec:** docs/superpowers/specs/2026-08-18-self-test-tier-design.md (f1e2f7c). The
gate and in-spec rulings bind.

## Global Constraints

- Five commits, one per task: T1 probes+tests · T2 bounds (its own inversion commit) ·
  T3 the sealed edit · T4 the record · T5 verification-only.
- Five gates before every commit (scan LAST on the staged tree; escape-free
  SPEC-cited strings). PowerShell for pnpm (`$env:PATH = "$env:APPDATA\npm;$env:PATH"`
  first); git via the Bash tool; branch `main`.
- Frozen, NO exceptions: `src/store/`, `chain/encoding.ts`,
  `test/byte-stability.test.ts`, `src/signing/`. `docs/concept/` untouched except
  Task 3's enumerated edit.
- Comments: explicit increment naming ("the self-test-tier increment"); never bare
  "this increment"; every probe's `target` string QUOTES CONTROLS §4's target list
  verbatim (whitespace-collapsed — the markdown is hand-verified, the scan does not
  check it); the tier's honest bound stated at the runner header.
- RED EXECUTED (Task 2 especially — today the bad bounds construct).
- Trailer: Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

---

### Task 1: `src/probes/` — the runner, the driver, the probes, the tests

**Files:**
- Create: `packages/record/src/probes/types.ts`, `packages/record/src/probes/runner.ts`,
  `packages/record/src/probes/probes.ts`, `packages/record/src/probes/index.ts`
- Test: create `packages/record/test/probes.test.ts`

**Interfaces:**
- Consumes: `create`/`Config` (create.js, config.js), the operator/agent surfaces,
  `transitionDigest` (chain/encoding.js — import only), the test helpers for
  fixture drivers.
- Produces: `runProbes(driver, opts?)`, `assertSatisfied(report)`, `ProbeDriver`,
  `Waiver`, `ProbeReport`, `ProbeResult`, `ALL_PROBES`.

- [ ] **Step 1: types.ts**

```ts
// @vidimera/record — probes/types.ts (CONTROLS §4 "OPERATOR-ASSURANCE — self-run
// verification"; the self-test-tier increment, the build order's last item). Shapes
// are PROVISIONAL pre-1.0, the Store contract's own discipline: the behaviors are the
// contract, the signatures are not. A passing suite "proves the control operated in
// the probed configuration, at probe time" — never third-party assurance, never a
// claim about unprobed configurations.

import type { Config, FinalizeOptions } from '../config.js';
import type { IdentityAssertion } from '../types.js';

/** The host's own wiring, handed to the probes. Isolation is the driver's duty: every
 * makeConfig() call returns an INDEPENDENT instance (fresh store state); probes
 * re-attack the probed configuration, never a library-supplied fixture. */
export interface ProbeDriver {
  makeConfig(): Config;
  /** Content + a UNIQUE subjectRef the given profile accepts (stage-able). */
  sampleContent(profileId: string): { content: unknown; subjectRef: string };
  /** A leg-decider identity the given profile/leg accepts (allowedAuthorities). */
  sampleIdentity(profileId: string, legId: string): IdentityAssertion;
  /** Options satisfying the given leg's required kinds (pass verdicts; observedAt
   * where freshness demands). Probes corrupt COPIES of these. Optional — absent
   * gates the consultation-family probes to not-driven on declaring profiles. */
  sampleConsultations?(profileId: string, legId: string): FinalizeOptions;
  // Host-environment exercises — each optional; absent => not-driven:
  severConsultationAuthority?(kind: string): Promise<() => Promise<void>>;
  disableRenderingCredential?(): Promise<() => Promise<void>>;
  restartPersistence?(): Promise<void>;
}

export type ProbeStatus = 'pass' | 'fail' | 'not-driven' | 'waived';

export interface ProbeResult {
  id: string;
  /** Verbatim from CONTROLS §4's target list. */
  target: string;
  status: ProbeStatus;
  /** For fail: what was expected vs observed. For not-driven: what was missing
   * (a hook, or a declaring profile). For waived: the covering waiver's id+reason. */
  detail: string;
}

/** Dated, expiring self-waivers (CONTROLS §4's waiver-governance row): an UNEXPIRED
 * waiver converts fail/not-driven to waived; an EXPIRED one converts NOTHING and is
 * flagged — the expiry discipline is the row's whole point. */
export interface Waiver {
  probeId: string;
  reason: string;
  /** RFC 3339 with an explicit offset — the freshness increment's intake class. */
  expires: string;
}

export interface ProbeReport {
  results: ProbeResult[];
  /** Every result pass or waived. */
  satisfied: boolean;
  expiredWaivers: Waiver[];
  unusedWaivers: Waiver[];
}
```

- [ ] **Step 2: runner.ts**

```ts
// @vidimera/record — probes/runner.ts: every registered probe runs (a failure never
// aborts the suite — the report is the product); waivers apply per the expiry
// discipline; assertSatisfied() is the CI hook (no CLI ships).

import { ALL_PROBES } from './probes.js';
import type { ProbeDriver, ProbeReport, ProbeResult, Waiver } from './types.js';

const OFFSET_RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export async function runProbes(
  driver: ProbeDriver,
  opts?: { waivers?: Waiver[]; now?: () => Date },
): Promise<ProbeReport> {
  const now = opts?.now ?? (() => new Date());
  const waivers = opts?.waivers ?? [];
  for (const w of waivers) {
    if (!OFFSET_RFC3339.test(w.expires) || Number.isNaN(Date.parse(w.expires))) {
      throw new Error(
        `runProbes: waiver '${w.probeId}' has a malformed expires — an RFC 3339 date-time ` +
          'with an explicit offset (the waiver-governance expiry discipline)',
      );
    }
  }
  const nowMs = now().getTime();
  const live = new Map(
    waivers.filter((w) => Date.parse(w.expires) > nowMs).map((w) => [w.probeId, w]),
  );
  const expiredWaivers = waivers.filter((w) => Date.parse(w.expires) <= nowMs);
  const used = new Set<string>();

  const results: ProbeResult[] = [];
  for (const probe of ALL_PROBES) {
    let result: ProbeResult;
    try {
      result = await probe.run(driver);
    } catch (err) {
      // A throwing probe is a FAIL with the throw recorded — never an aborted suite.
      result = {
        id: probe.id,
        target: probe.target,
        status: 'fail',
        detail: `probe threw: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    if (result.status === 'fail' || result.status === 'not-driven') {
      const waiver = live.get(result.id);
      if (waiver !== undefined) {
        used.add(result.id);
        result = {
          ...result,
          status: 'waived',
          detail: `${result.status} under waiver '${waiver.reason}' (expires ${waiver.expires}); ${result.detail}`,
        };
      }
    }
    results.push(result);
  }
  const unusedWaivers = waivers.filter(
    (w) => !used.has(w.probeId) && !expiredWaivers.includes(w),
  );
  const satisfied = results.every((r) => r.status === 'pass' || r.status === 'waived');
  return { results, satisfied, expiredWaivers, unusedWaivers };
}

export function assertSatisfied(report: ProbeReport): void {
  if (report.satisfied && report.expiredWaivers.length === 0) return;
  const bad = report.results
    .filter((r) => r.status === 'fail' || r.status === 'not-driven')
    .map((r) => `${r.id} [${r.status}]: ${r.detail}`);
  const expired = report.expiredWaivers.map((w) => `expired waiver ${w.probeId} (${w.expires})`);
  throw new Error(`probe suite unsatisfied:\n${[...bad, ...expired].join('\n')}`);
}
```

  (Note `assertSatisfied` ALSO throws on expired waivers even when every probe
  passed — an expired waiver lying around is a governance failure by the row's own
  discipline; the comment says so.)

- [ ] **Step 3: probes.ts — the registry**

Header comment: the tier's vocabulary; every `target` quotes CONTROLS §4's list; the
`requires` predicate generalizes not-driven ("the probed configuration reaches no
profile declaring the control"); probes consume ONLY public surfaces + the config's
own Store/sidecar handles (the insider surface — the point); each probe uses FRESH
`driver.makeConfig()` state.

The probe shape and THREE fully-worked templates (write these verbatim, then the
rest to the same shape from the contract table below):

```ts
export interface Probe {
  id: string;
  target: string;
  run(driver: ProbeDriver): Promise<ProbeResult>;
}

function pass(p: Probe, detail: string): ProbeResult {
  return { id: p.id, target: p.target, status: 'pass', detail };
}
function fail(p: Probe, detail: string): ProbeResult {
  return { id: p.id, target: p.target, status: 'fail', detail };
}
function notDriven(p: Probe, detail: string): ProbeResult {
  return { id: p.id, target: p.target, status: 'not-driven', detail };
}

/** Stage+open under the profile's first leg — the shared setup every probe uses. */
async function openOne(driver: ProbeDriver, profileId: string) {
  const config = driver.makeConfig();
  const handles = create(config);
  const profile = config.profiles.find((p) => p.id === profileId);
  const legId = profile?.legs[0]?.id;
  if (profile === undefined || legId === undefined) {
    throw new Error(`openOne: profile '${profileId}' or its first leg is missing`);
  }
  const { content, subjectRef } = driver.sampleContent(profileId);
  const staged = await handles.agent.stage(content, profileId, subjectRef);
  if (staged.status !== 'ok') {
    throw new Error(`openOne: stage refused: ${JSON.stringify(staged)}`);
  }
  const opened = await handles.operator.open(staged.value.stagedRef);
  if (opened.status !== 'ok') {
    throw new Error(`openOne: open refused: ${JSON.stringify(opened)}`);
  }
  return { handles, recordId: opened.value.recordId, content, subjectRef, legId };
}
```

(A probe whose setup throws reports `fail` via the runner's catch — correct: the
probed configuration could not even open a record, which IS a finding. Policy- or
supersedes-demanding profiles that refuse plain opens surface there honestly; a
refinement taking `open` options from the driver is a pre-1.0 shape question, noted
in the header, not built.)

```ts

const driftRefuses: Probe = {
  id: 'drift-refuses',
  target: 'drifted content refuses',
  async run(driver) {
    const config = driver.makeConfig();
    const profile = config.profiles[0];
    if (profile === undefined) return notDriven(this, 'the configuration has no profiles');
    const { handles, recordId, content, legId } = await openOne(driver, profile.id);
    const identity = driver.sampleIdentity(profile.id, legId);
    const consultations = driver.sampleConsultations?.(profile.id, legId);
    const out = await handles.operator.finalize(
      recordId, identity, { DRIFTED: true, was: content }, probeFacts(), consultations,
    );
    return out.status === 'refused' && out.code === 'content-drift'
      ? pass(this, 'altered content refused content-drift')
      : fail(this, `expected refused/content-drift, observed ${JSON.stringify(out)}`);
  },
};

const exclusivityHolds: Probe = {
  id: 'exclusivity-holds',
  target: 'at most one non-terminal record per subject',
  async run(driver) {
    const config = driver.makeConfig();
    const profile = config.profiles[0];
    if (profile === undefined) return notDriven(this, 'the configuration has no profiles');
    const handles = createFrom(config);
    const { content, subjectRef } = driver.sampleContent(profile.id);
    const first = await stageOpen(handles, content, profile.id, subjectRef);
    if (first.status !== 'ok') return fail(this, `first open refused: ${JSON.stringify(first)}`);
    const second = await stageOpen(handles, content, profile.id, subjectRef);
    return second.status === 'refused' && second.code === 'record-exists'
      ? pass(this, 'the second open refused record-exists')
      : fail(this, `expected refused/record-exists, observed ${JSON.stringify(second)}`);
  },
};

const consultationGenuineness: Probe = {
  id: 'consultation-genuineness',
  target:
    'required consultations are present and genuine (a severed authority yields `availability`, never a pass)',
  async run(driver) {
    if (driver.severConsultationAuthority === undefined) {
      return notDriven(this, 'the driver supplies no severConsultationAuthority hook');
    }
    const config = driver.makeConfig();
    const declaring = config.profiles.find((p) =>
      p.legs.some((l) => (l.requiredConsultations?.length ?? 0) > 0),
    );
    if (declaring === undefined) {
      return notDriven(this, 'no profile declares requiredConsultations');
    }
    const leg = declaring.legs.find((l) => (l.requiredConsultations?.length ?? 0) > 0);
    const kind = leg?.requiredConsultations?.[0];
    if (leg === undefined || kind === undefined) return notDriven(this, 'unreachable');
    const { handles, recordId, content } = await openOne(driver, declaring.id);
    const restore = await driver.severConsultationAuthority(kind);
    try {
      // The HOST's consultation path is severed; the host's own gathering should now
      // produce an unreachable marker — the driver's sampleConsultations is asked
      // again UNDER the severed condition:
      const consultations = driver.sampleConsultations?.(declaring.id, leg.id);
      const out = await handles.operator.finalize(
        recordId,
        driver.sampleIdentity(declaring.id, leg.id),
        content,
        probeFacts(),
        consultations,
      );
      if (out.status === 'unavailable') {
        return pass(this, `severed '${kind}' yielded the availability outcome`);
      }
      if (out.status === 'ok') {
        return fail(this, `severed '${kind}' still finalized — a stubbed pass`);
      }
      return fail(this, `severed '${kind}' produced ${JSON.stringify(out)}, not availability`);
    } finally {
      await restore();
    }
  },
};
```

(The implementer resolves the elided argument plumbing (`probeFacts()` — a canonical
facts fixture the probes own; `createFrom`/`stageOpen` — thin wrappers over the public
surfaces) once, in the shared helpers, and reuses them. The templates' SHAPE is
binding: config-requirement checks → not-driven with a plain-language detail; the
attack; a pass/fail with expected-vs-observed detail.)

The remaining probes, same shape — the contract table (id · target quote · requires ·
the attack · expected):

| id | target (CONTROLS §4, verbatim) | requires | attack → expected |
|---|---|---|---|
| tamper-evident | "tampering is evident on replay" | any profile | open, corrupt a NON-last transition via `config.store.appendTransition`-adjacent means — mutate a stored copy by seeding a tampered chain is NOT possible through the public store; instead corrupt via the store handle's own append of a forged next transition with a WRONG prevHash… if the Store's CAS rejects forgeries, corrupt by constructing a second store? RESOLVE at implementation: the honest insider attack this build's own tests use is seeding a tampered COPY (tamperNonLast) into a fresh store from the config's own factory — if `makeConfig()`'s store cannot be seeded (a real host DB), report not-driven with that detail. Then finalize → refused/chain-compromise |
| payload-identity-refused | "a payload-carried identity cannot finalize" | any profile | finalize with an identity whose authority is NOT in the leg's allowedAuthorities → refused/identity-authority-refused |
| at-most-once-redeem | "a confirmation redeems at most once" | an effect-seam profile | confirm, redeem, redeem again → second refused/already-redeemed |
| effects-match | "effects require redemption and match the redeemed record" | an effect-seam profile | redeem with WRONG content → refused (effect-mismatch, or content-drift when the profile declares reverify — accept the profile's own mapping) |
| sod-refuses | "cross-leg self-approval refuses" | a multi-leg profile with sod | drive leg 1 to confirmed with identity A; open leg 2 with the prior ref; finalize leg 2 with the SAME principal → refused/sod-violation |
| acks-block | "stale or missing acknowledgments block finalize" | a findings-flow profile | raise a required-kind finding, no ack, finalize → refused/ack-missing |
| consultations-present | "required consultations are present" (the first half of the genuineness row) | requiredConsultations + sampleConsultations | finalize WITHOUT the consultations → refused/consultation-missing; WITH them → ok |
| ineligible-refuses | "an ineligible actor refuses" | an eligibility-declaring leg + sampleConsultations | corrupt the eligibility consultation's verdict to fail → refused/ineligible |
| agent-cannot-decide | "nothing agent-reachable decides" | always | the agent handle's own key set is exactly the stage surface (no finalize/redeem/seal reachable) → pass on the pinned key set |
| unknown-fails-closed | "unknown inputs and compromise fail closed" | any profile | a garbage consultations bag THROWS; an unknown open-options key THROWS → pass on both throwing |
| binds-reviewed | "the decision binds what the reviewer saw" | any profile | review()'s contentDigest equals the staged binding; matching content finalizes; the probe asserts the digest equality then the confirm |
| signature-tamper-refuses | "tampering is evident on replay" (the AL2 re-attack, OQ §5's sequencing note) | a signing profile + config.signing | corrupt one sidecar signature via `config.signing.signatures` (put a garbled entry over a real digest), then finalize/seal → refused/chain-compromise |
| path-distinctness | "Disable the rendering credential; the independent re-derivation must still succeed" (the row's own words) | disableRenderingCredential + a live profile (captureMode 'live') | disable, then sampleConsultations under the disabled condition still yields the re-derivation kind passing and finalize succeeds → pass; a failure under disablement → fail |
| state-survives-restart | "decision state survives restart" | restartPersistence | open+confirm, restartPersistence(), getRecord → still confirmed |

(For tamper-evident: implement the resolve-note honestly — try the seeded-copy attack
when the store factory yields seedable stores, else not-driven; the DETAIL string
explains which. Do not fake it.)

`probes.ts` ends with the registry the runner consumes:
`export const ALL_PROBES: readonly Probe[] = [driftRefuses, exclusivityHolds, …];` —
every probe listed, order stable (the report reads in registry order).

- [ ] **Step 4: index.ts** — re-export the public shapes + `runProbes`/`assertSatisfied`
  with the provisional-shape header; NOTE in a comment that the package exports-map
  wiring is register row 6's pre-0.1 work (the subpath is source convention today).

- [ ] **Step 5: probes.test.ts** — the fixture drivers over MemoryStore + the helper
  profiles (a full-featured driver: capture + effect-seam + two-leg-SoD +
  findings-flow + eligibility + a signing+live+reverify profile with
  sampleConsultations incl. observedAt; fake sever/disable/restart hooks); the pass
  path for EVERY probe; the demonstrated FAIL paths (a constant-digest canonicalizer
  driver → drift-probe fails; a stubbed-pass sever hook → genuineness fails; a
  minimal-config driver → the declaring probes report not-driven); the runner/waiver
  pins (per the spec's §1 list, incl. the expired-waiver flag and
  assertSatisfied-throws-on-expired); RED first (the module does not exist).

- [ ] **Step 6: gates + commit** — full suite + five gates;
  `git add -A packages/record` ; commit "The self-test tier: probes that can fail,
  waivers that expire".

---

### Task 2: Register row 18 taken — the bounds tightening (its own commit)

**Files:** `packages/record/src/config.ts` (validateBounds + wiring),
`packages/record/test/construction-validation.test.ts` (the :514 recorded-stance
comment amended IN PLACE as the ELEVENTH self-authored inversion — verify the number
against the status doc's sequence first — plus the RED-first pins),
`packages/record/test/clocks.test.ts`/others ONLY if a fixture used an invalid bound
(none expected — verify).

- [ ] Steps: RED-first pins (NaN/Infinity/negative/zero/fractional for `expiry.ttl`
  (when not `'none'`), `redeem.confirmToRedeem`, `redeemBound` — today they
  construct; capture the run) → `validateBounds(profile)` beside the other
  structural validators (positive finite integers; message register matching
  `validateFreshness`'s) → the :514 comment amended in place (the old stance quoted,
  the trigger named: `validateFreshness` ended the no-numeric-rules symmetry at the
  AL2 freshness increment; the inversion argued per the numbered convention) → full
  suite + five gates → commit "Take row 18: bounds validate, the recorded stance
  inverts in place".

---

### Task 3: The sanctioned sealed edit

**Files:** `docs/concept/CONTROLS.md`, `docs/concept/OPEN-QUESTIONS.md` — EXACTLY:

1. CONTROLS §4's FOUR maturity cells (rows :59-62): bare `SKETCHED` → `PROVEN`, each
   row's every other character intact (the honest bounds stay — still true). Full
   before/after lines in your report.
2. OQ §5's paragraph gains: ` **Decided (this build):** a public library subpath —
   \`src/probes/\` ships the runner, the typed driver interface, the probes (authored
   against the target list), and waiver governance, versioned with the library under
   the store contract's own pre-1.0 provisional-shape discipline; a probe the host's
   driver or configuration cannot drive reports \`not-driven\` — unproved, never
   disproved, waivable only by a dated, unexpired waiver.` (Plain backticks; reflow
   to the file's width.)
3. The lesson-24 stem grep (`open decision|still open|not yet decided|undecided|
   unbuilt` near the tier/probes) runs BEFORE editing; any hit beyond the two above
   is enumerated in the report and NOT edited without appearing here — expected: OQ
   §5's own "its delivery contract is undecided" clause is INSIDE the paragraph
   gaining the tail; the tail's "Decided (this build)" supersedes it in place per the
   §3/§4 precedent (the paragraph text itself stays).

- [ ] Byte-verify (`git diff -- docs/concept/` = the four cell pairs + the one tail),
  survivors listed (AL3 + legends only should remain SKETCHED — zero tier hits),
  five gates, commit "Move the tier's four cells and record OQ 5 decided".

---

### Task 4: The record — step 8 exits; the build order is complete

**Files:** `docs/process/implementation-status.md`,
`docs/process/deferral-register.md` (rows 17 AND 18 RETIRE per the register's
retirement convention — READ retired rows 9-11 for the form), `CLAUDE.md`,
`README.md`, stale comments the sweep finds.

- [ ] Per the spec's §2: the steps table → step 8 **Exited**; the CONTROLS-§4 row
  (the tier's shape; not-driven generalized; the can-fail discipline; provisional
  shapes; the honest bound verbatim); the bounds inversion recorded (the eleventh);
  **the closing narrative** — eight of eight exited, complete at the declared
  embedded operator-only scope, the remaining register residue (rows 5, 6, 15) named
  as the pre-0.1/1.0 gates that outlive the build order BY DESIGN; rows 17+18
  retired in place with triggers noted fired.
- [ ] CLAUDE.md/README: step 8 exited; the arc closed; counts moved (the suite's new
  totals; probes named).
- [ ] The sweep — LAST, hit==verdict:

```bash
git grep -nE 'self-test|probe|operator-assurance|OPERATOR-ASSURANCE|waiver|not-driven|tail|remains unstarted|remaining tail|one item|last item|Started|row 17|row 18|this increment|later increment|landing|will |not yet' -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
git grep -nE 'SKETCHED|no probe|tier is not|unbuilt|have none|no producer|does not exit|step 8' -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
```

- [ ] Quotes hand-verified; five gates; commit "Record the exit: eight of eight, the
  build order complete at its declared scope".

---

### Task 5: Exit verification

- [ ] porcelain empty, `main`, ALL FIVE gates by name, exact counts (zero skips).
- [ ] Freeze (against the spec commit f1e2f7c):

```bash
git diff f1e2f7c..HEAD -- packages/record/test/byte-stability.test.ts   # MUST be empty
git diff f1e2f7c..HEAD -- packages/record/src/chain/encoding.ts          # MUST be empty
git diff f1e2f7c..HEAD -- packages/record/src/store/                     # MUST be empty
git diff f1e2f7c..HEAD -- packages/record/src/signing/                   # MUST be empty
git diff f1e2f7c..HEAD -- docs/concept/                                  # EXACTLY: 4 cell pairs + the OQ §5 tail
```

- [ ] Report: commit list, exact counts, the steps table's step-8 cell (Exited), the
  register's LIVE rows (5, 6, 15 expected) and retired rows 17/18 quoted, a zero-line
  for tier SKETCHED hits in docs/concept, ahead count.
