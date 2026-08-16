# Eligibility Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land SPEC §10.4 whole — the per-leg `eligibility` lift making `'eligibility'`
an implicit-first required kind at rung (5.5), the `ineligible` code (nineteenth), the
trip mapping, and the ordinary-kind fallback — as the first of two step-6 increments.

**Architecture:** `ineligible` lands inert first. Then ONE commit deletes the GOVERNED
`eligibility` throw, adds the two structural rules (non-empty label; declare-once), and
extends rung 5.5 with the effective-kinds computation and the fail-arm code selection.
The record moves step 6 to Started and lands the two parked one-sentence items from the
previous increment's final review.

**Tech Stack:** TypeScript strict (pnpm workspace, Node >=22.16), vitest, Biome. No new
runtime APIs — the floor does not move.

**Spec:** `docs/superpowers/specs/2026-08-16-eligibility-design.md` — read it before
your task; its "Rulings taken" section is binding.

## Global Constraints

- **Shell**: PowerShell for pnpm (`$env:PATH = "$env:APPDATA\npm;$env:PATH"` FIRST in
  EVERY fresh shell). **Git commits via the Bash tool**, ordinary multi-line `-m`.
  `git branch --show-current` must print `main` before any commit; else STOP, BLOCKED.
- **The five gates** before each task's final commit: `pnpm typecheck` · `pnpm lint` ·
  `pnpm lint:strict` · `pnpm test` (zero skips) · `node scripts/contract-scan.mjs`
  (prints nothing, exits 0).
- **Frozen surfaces**: `packages/record/test/byte-stability.test.ts`,
  `packages/record/src/chain/encoding.ts`, and ALL of `packages/record/src/store/` must
  not appear in any diff of this increment.
- **`docs/concept/` is SEALED.** `docs/superpowers/`/`docs/analysis/` historical
  leave-alone.
- **No external URLs/project names.** Committed TS comments: no "slice"/"design" words
  (except `.slice()` / "by design"), no `Task N` pointers, no bare 7-40-char hex.
  Explicit increment naming ("the first step-6 increment" / "the second step-6
  increment"), never bare "this increment". ASCII apostrophes. A double-quoted phrase
  right after a `SPEC §N` citation must occur verbatim (whitespace-collapsed, backticks
  ignored) in docs/concept/SPEC.md.
- **Plan-authored comments truthful at the commit that lands them** (two-touch;
  finalization an explicit step item). **A mandated RED run is EXECUTED; a substitution
  is STATED.**
- **Counts stated with the movement named** (governed 6 → 5; codes 18 → 19).
- **Enlisted-branch check, visibly run**: `finalize()` takes no `tx` — nothing to decide.
- Narrow runs: `pnpm exec vitest run packages/record/test/<file>.test.ts` from repo root.

---

### Task 1: The nineteenth code (inert)

**Files:**
- Modify: `packages/record/src/refusal-codes.ts` (union + REGISTRY — the default
  `appendsOn` path, NOT never-appends)
- Modify: `packages/record/test/outcome-model.test.ts` and
  `packages/record/test/refusal-matrix.test.ts` (count pins 18→19; the `ineligible`
  section)

**Interfaces:**
- Produces: `'ineligible'` in `RefusalCode`, class `'refusal'`. Nothing else — the
  default path IS §8's mandated behavior.

- [ ] **Step 1: Write the failing tests**

Bump the two count pins 18 → 19 ("eighteen" → "nineteen"; the matrix arithmetic prose —
read both files first, match on content). Add the `ineligible` matrix section following
the `content-drift`-shape convention (class `refusal`, `terminalRefusals`-able,
open-by-default — SPEC §8: "open-by-default so a different eligible actor may decide"),
producer worded two-touch: the eligibility arm of finalize's required-consultation rung,
landing later in the first step-6 increment.

- [ ] **Step 2: Run to verify failure — EXECUTE it**

Run: `pnpm exec vitest run packages/record/test/outcome-model.test.ts packages/record/test/refusal-matrix.test.ts`
Expected: FAIL — the union has 18 members. Capture output.

- [ ] **Step 3: Implement**

`refusal-codes.ts`: `| 'ineligible'` joins the union beside the profile-conditional
block with its comment (SPEC §8's conditional table row; open-by-default — eligibility
is per-finalize, per actor; producer two-touch as above); `'ineligible': 'refusal'` in
`REGISTRY`. `NEVER_APPENDS` untouched.

- [ ] **Step 4: Run tests, gates, commit**

Run the two named files (PASS), `pnpm test` (PASS — nothing produces the code), all five
gates. Commit (Bash tool):

```bash
git add packages/record/src/refusal-codes.ts packages/record/test/outcome-model.test.ts packages/record/test/refusal-matrix.test.ts
git commit -m "The nineteenth code: ineligible, open by default for the next eligible actor

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: The lift and the rung extension, in one commit

**Files:**
- Modify: `packages/record/src/config.ts` (delete the GOVERNED `eligibility` throw; the
  two structural rules)
- Modify: `packages/record/src/kernel/finalize.ts` (the effective-kinds computation; the
  fail-arm code selection; the header's eligibility-half sentences finalize)
- Modify: `packages/record/src/refusal-codes.ts` + `packages/record/test/refusal-matrix.test.ts`
  (two-touch producer wording goes present-tense)
- Modify: `packages/record/test/construction-validation.test.ts` (invert the GOVERNED
  pin; add the two structural pins)
- Test: `packages/record/test/consultations.test.ts` (the trip-mapping pins)

**Interfaces:**
- Consumes: Task 1's `'ineligible'`; the existing rung 5.5 (its guard at
  `leg.requiredConsultations !== undefined`, its three arms), `refuseMaybeAppend`,
  the existing test helpers (`obtained`, `CHECKER`, `DIGEST`, `CONTENT`,
  `captureProfile`, `openRecord`, `identity`, `facts`).

**All in ONE commit** — the standing atomicity discipline.

- [ ] **Step 1: Write the failing tests**

In `construction-validation.test.ts`, REPLACE the GOVERNED `eligibility` pin (locate by
title) with:

```ts
test('eligibility is accepted at construction — the gate arm is built', () => {
  // INVERTED, at the first step-6 increment: the kernel increment pinned a GOVERNED
  // throw here while no gate consumed the declaration. The implicit-first eligibility
  // arm lands at finalize's required-consultation rung in the same commit as this
  // lift, so the guard's stated trigger has fired.
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assert.doesNotThrow(() =>
    create(makeConfig([{ ...p, legs: [{ ...leg, eligibility: 'hr.approver-check' }] }])),
  );
});

test('structural: an empty eligibility label and a double declaration each throw', () => {
  // Empty: NOT the inertness trap (the gate keys on declaration presence, never the
  // label) — the malformed-reference rule: an opaque reference that references nothing.
  // Double: SPEC §10.4's own sentence — "Declaring `eligibility` **and** also listing
  // `'eligibility'` in `requiredConsultations` is a construction error (declare it
  // once)".
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assertStructural({ ...p, legs: [{ ...leg, eligibility: '' }] }, /empty/i);
  assertStructural(
    {
      ...p,
      legs: [
        { ...leg, eligibility: 'hr.approver-check', requiredConsultations: ['eligibility'] },
      ],
    },
    /declare it once/i,
  );
});
```

(The `ackMode`/`requiredAcks`/`freshness` GOVERNED pins stay untouched — verify.)

In `consultations.test.ts`, append under a banner
`// === the eligibility arm: the implicit-first kind (first step-6 increment) ===`:

```ts
/** captureProfile with the leg's eligibility declared (and optional extras). */
function eligibleProfile(extra?: Partial<LegSpec>): ConfirmProfile {
  const p = captureProfile({ id: 'test.eligible.v1' });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  p.legs[0] = { ...leg, eligibility: 'hr.approver-check', ...extra };
  return p;
}
const ELIGIBLE_SUBJECT = 'subject:elig-1';

async function openEligible(store: MemoryStore, extra?: Partial<LegSpec>) {
  const handles = create(makeConfig([eligibleProfile(extra)], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.eligible.v1', ELIGIBLE_SUBJECT);
  return { handles, recordId };
}

test('the trip mapping: an eligibility fail refuses ineligible, open by default, and a pass-verdict retry confirms', async () => {
  // SPEC §10.4: "a **`fail` verdict refuses `ineligible`**"; open-by-default —
  // eligibility is per-finalize, per actor, so a different eligible actor may decide.
  const store = new MemoryStore();
  const { handles, recordId } = await openEligible(store);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('eligibility', { verdict: 'fail' })],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'ineligible');
  assert.equal(out.transitionRef, undefined, 'default path: no appended edge');
  assert.equal((await store.readChain(recordId)).length, 1, 'the record stays open');

  const retry = await handles.operator.finalize(
    recordId,
    identity({ principal: 'approver:2' }),
    CONTENT,
    facts(),
    { consultations: [obtained('eligibility')] },
  );
  assert.equal(retry.status, 'ok');
});

test('the trip mapping stays generic off the fail arm: missing refuses consultation-missing; unreachable is the availability outcome', async () => {
  // §10.4: "a *missing* input refuses `consultation-missing` (generic); an
  // *unreachable* marker yields the availability outcome (generic)".
  const storeA = new MemoryStore();
  const a = await openEligible(storeA);
  const missing = await a.handles.operator.finalize(a.recordId, identity(), CONTENT, facts());
  assert.equal(missing.status, 'refused');
  if (missing.status !== 'refused') return;
  assert.equal(missing.code, 'consultation-missing');

  const storeB = new MemoryStore();
  const b = await openEligible(storeB);
  const down = await b.handles.operator.finalize(b.recordId, identity(), CONTENT, facts(), {
    consultations: [{ kind: 'eligibility', unreachable: true, authority: 'svc:hr' }],
  });
  assert.deepEqual(down, { status: 'unavailable', code: 'availability', authority: 'svc:hr' });
  assert.equal((await storeB.readChain(b.recordId)).length, 1, 'nothing appended');
});

test('a pass verdict confirms and the eligibility consultation is chained evidence that the check ran', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openEligible(store);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('eligibility')],
  });
  assert.equal(done.status, 'ok');
  const rec = await handles.operator.getRecord(recordId);
  const evidence = rec?.consultations.find((c) => c.kind === 'eligibility');
  assert.ok(evidence !== undefined);
  assert.equal(evidence.verdict, 'pass');
});

test('implicit and FIRST: eligibility trips before the declared kinds; satisfied, the gate proceeds in order', async () => {
  // §10.4: "the effective kinds are the implicit `'eligibility'` followed by the
  // declared `requiredConsultations` in order, so authority-to-decide is checked
  // before the evidence checks".
  const store = new MemoryStore();
  const { handles, recordId } = await openEligible(store, {
    requiredConsultations: ['risk-check'],
  });
  const bothFail = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [
      obtained('eligibility', { verdict: 'fail' }),
      obtained('risk-check', { verdict: 'fail' }),
    ],
  });
  assert.equal(bothFail.status, 'refused');
  if (bothFail.status !== 'refused') return;
  assert.equal(bothFail.code, 'ineligible', 'the implicit kind is first');

  const evidenceFails = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('eligibility'), obtained('risk-check', { verdict: 'fail' })],
  });
  assert.equal(evidenceFails.status, 'refused');
  if (evidenceFails.status !== 'refused') return;
  assert.equal(evidenceFails.code, 'consultation-failed', 'past the implicit kind, generic order');
});

test('terminalRefusals may end the leg on ineligible: the refused edge appends with payload { code }', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openEligible(store, {
    terminalRefusals: ['ineligible'],
  });
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('eligibility', { verdict: 'fail' })],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'ineligible');
  assert.ok(out.transitionRef !== undefined);
  const last = (await store.readChain(recordId)).at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'refused');
  assert.deepEqual(Object.keys(last.payload as object), ['code']);
  assert.equal(await store.findNonTerminal('test.eligible.v1', ELIGIBLE_SUBJECT), null);
});

test('the ordinary-kind fallback: a NON-declaring leg listing eligibility in requiredConsultations gets the generic codes', async () => {
  // §10.4: "a leg that merely lists `'eligibility'` in its `requiredConsultations`
  // gates it with the generic codes (`consultation-failed` on a `fail`, never
  // `ineligible`)".
  const store = new MemoryStore();
  const p = captureProfile({ id: 'test.ordinary-elig.v1' });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  p.legs[0] = { ...leg, requiredConsultations: ['eligibility'] };
  const handles = create(makeConfig([p], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.ordinary-elig.v1', ELIGIBLE_SUBJECT);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('eligibility', { verdict: 'fail' })],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'consultation-failed');
});

test('a voluntary eligibility consultation on an undeclaring, unrequiring leg records as plain evidence', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', ELIGIBLE_SUBJECT);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('eligibility', { verdict: 'fail' })],
  });
  assert.equal(done.status, 'ok', 'nothing requires it — evidence, never a gate');
});
```

- [ ] **Step 2: Run to verify failure — EXECUTE it**

Run: `pnpm exec vitest run packages/record/test/consultations.test.ts packages/record/test/construction-validation.test.ts`
Expected: the inversion pin FAILS (guard throws); every trip pin FAILS at `create()`.
Capture output.

- [ ] **Step 3: Implement**

1. `config.ts`: delete the `eligibility` GOVERNED block from `validateLeg`. Extend the
   per-leg structural pass (a small sibling function or a clearly-bounded addition to
   the existing one — the implementer's shape; the RULES are binding):

```ts
  if (leg.eligibility !== undefined) {
    if (leg.eligibility.length === 0) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' declares an empty eligibility label — ` +
          'an opaque reference that references nothing is malformed config (the label names ' +
          'the host authority-to-decide check; the gate keys on the declaration, SPEC §10.4)',
      );
    }
    if (leg.requiredConsultations?.includes('eligibility')) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' declares eligibility AND lists ` +
          `'eligibility' in requiredConsultations — SPEC §10.4: declare it once`,
      );
    }
  }
```

2. `kernel/finalize.ts`, rung 5.5: replace the guard-and-loop head with the
   effective-kinds computation (the spec's §3 block VERBATIM — the `effectiveKinds`
   const with its §10.4 comment; the loop over `effectiveKinds`, entered whenever the
   list is non-empty) and the fail arm's code selection (the spec's block VERBATIM —
   `requiredKind === 'eligibility' && leg.eligibility !== undefined` ⇒ `'ineligible'`,
   else `'consultation-failed'`, with its comment). The rung's opening comment extends:
   the eligibility half is real as of the first step-6 increment. The FILE HEADER's two
   eligibility sentences finalize in the same commit (line ~13-14's "the SPEC's
   eligibility half of the same rung is not built ... step 6's own ground" and the
   (5.5) description at ~37-44 gain the implicit-first arm; the refusal-class summary
   at ~62 gains `ineligible` on its list).
3. Two-touch finalization: `refusal-codes.ts`'s producer comment and the matrix
   section's wording go present-tense (the arm is real from this commit).

- [ ] **Step 4: Run tests, gates, commit**

Run the two named files, then `pnpm test` (zero skips), all five gates. Commit (Bash):

```bash
git add -A packages/record
git commit -m "Lift the eligibility guard with the arm built: implicit, first, and honest about who ran the check

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: The record — step 6 starts

**Files:**
- Modify: `docs/process/implementation-status.md`
- Modify: `CLAUDE.md`, `README.md`
- Modify: `packages/record/src/kernel/consultations.ts` (ONE parked sentence — below)
- Modify: stale comments the sweep finds
- No register edits expected (verify by READING `docs/process/deferral-register.md`)

**Interfaces:** consumes Tasks 1-2; the spec's §6 ("The record — step 6 starts") is the
checklist — verify every claim against CODE, never task reports.

- [ ] **Step 1: implementation-status.md**

Per the spec's §6, matching on content: steps table → step 6 **Started** (first of two
increments: eligibility; policy drift remaining and exiting, the fail-close cross-drift
ruling named as already taken at the step-6 brainstorm); §10.4 row: WHOLE (the
implicit-first rule, the trip mapping, verdict-vs-code, the ordinary-kind fallback, the
honest bound with its limit in the same breath); §8 row: nineteen codes, `ineligible`'s
producer and open-by-default shape; §11.1 row: the effective-kinds extension noted, PLUS
the parked interplay sentence (a never-satisfiable required kind keeps the record open
and the pair held, bounded by the open `ttl` — or indefinitely under `expiry: 'none'`,
the operator's own configuration to resolve; no lost-artifact strand exists since the
operator controls every finalize input). Governed count 6 → 5 with the movement named.

- [ ] **Step 2: The second parked item + CLAUDE.md + README.md**

- `packages/record/src/kernel/consultations.ts:~6`: the header sentence "The
  required-consultation gate that consumes the partition's markers lands at finalize's
  rung (5.5) in the second step-5 increment." aligns to the landed form ("is real as of
  the second step-5 increment", or equivalent present-truth wording).
- CLAUDE.md: step 6 started (first of two increments); five governed fields with the
  movement; "three of the eight build-order steps remain unstarted" → **two (steps
  7-8)** — verify the arithmetic against the steps table before writing. README: same
  movement.

- [ ] **Step 3: The sweep**

```bash
git grep -nE "eligibility|ineligible|implicit-first|first step-6|second step-6|step 6|six governed|five governed|landing later|this increment|later increment" -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
git grep -nE "requiredConsultations !== undefined|effective kinds|effectiveKinds|eighteen|nineteen|\(5\.5\)" -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
```

(The second grep carries the OLD-shape tokens — the rung's old guard text, old count
words, the ladder token.) Judge EVERY hit: still-true / fixed-by-earlier-tasks /
fix-now / historical-leave-alone. THE REPORT MUST SHOW HIT-COUNT == VERDICT-COUNT.
END-OF-INCREMENT OWN-COMMENT PASS:
`git diff a67f9d5..HEAD -- packages | grep -nE "landing later|later in the first step-6"`
— judge every hit.

- [ ] **Step 4: Verify quotes, gates, commit**

Hand-verify every quoted SPEC phrase in touched markdown whitespace-collapsed. All five
gates. Commit (Bash):

```bash
git add -A
git commit -m "Record step 6 started: eligibility whole, the policy gate next with its ruling banked

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Exit verification

**Files:** none modified (fixes only if a gate fails).

- [ ] **Step 1: Clean-tree gates**

Fresh PowerShell (`$env:PATH = "$env:APPDATA\npm;$env:PATH"`), `git status --porcelain`
empty, `git branch --show-current` = main, then: `pnpm typecheck` · `pnpm lint` ·
`pnpm lint:strict` · `pnpm test` (exact counts, zero skips) · `node scripts/contract-scan.mjs`
(silent, exit 0).

- [ ] **Step 2: Freeze verification**

```bash
git diff a67f9d5..HEAD -- packages/record/test/byte-stability.test.ts   # MUST be empty
git diff a67f9d5..HEAD -- packages/record/src/chain/encoding.ts          # MUST be empty
git diff a67f9d5..HEAD -- packages/record/src/store/                     # MUST be empty
```

Any non-empty result ⇒ BLOCKED with the diff stat.

- [ ] **Step 3: Report**

The increment's commit list (`git log --oneline a67f9d5..HEAD` — a67f9d5 is the spec
commit), exact counts, register rows live (read the file), step-6-Started confirmation
(read the steps table), and `git status -sb`'s ahead count for the user-gated push.
