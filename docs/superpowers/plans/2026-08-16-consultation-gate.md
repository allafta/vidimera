# Consultation Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land SPEC §11.1's gating half — rung (5.5), `consultation-failed` (17th) and
`availability` (18th, its own third class carried by the narrowed `unavailable` outcome),
the `requiredConsultations` lift — and record **step 5's exit** as the second and last
step-5 increment.

**Architecture:** The outcome-model narrowing and both codes land inert first (the
draft-ahead `unavailable` variant narrows to its §8 shape; `refused` excludes
`availability` at compile time). Then ONE commit deletes the GOVERNED
`requiredConsultations` throw, adds its structural validation, and inserts rung 5.5
consuming the attach form's partition — no commit admits a declaring profile whose
control is inert. The record exits step 5; freshness stays [SKETCHED] by the spec's own
vacuity argument.

**Tech Stack:** TypeScript strict (pnpm workspace, Node >=22.16), vitest, Biome. No new
runtime APIs — the floor does not move.

**Spec:** `docs/superpowers/specs/2026-08-16-consultation-gate-design.md` (as amended at
669f639) — read it before your task; its "Rulings taken" section is binding.

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
  Explicit increment naming ("the first step-5 increment" / "the second step-5
  increment"), never bare "this increment". ASCII apostrophes. A double-quoted phrase
  right after a `SPEC §N` citation must occur verbatim (whitespace-collapsed, backticks
  ignored) in docs/concept/SPEC.md.
- **Plan-authored comments truthful at the commit that lands them** (two-touch where a
  producer lands later; finalization an explicit step item). **A mandated RED run is
  EXECUTED; a substitution is STATED.**
- **Counts stated with the movement named** (governed 7 → 6; codes 16 → 18).
- **Enlisted-branch check, visibly run**: `finalize()` takes no `tx` — nothing to decide.
- Narrow runs: `pnpm exec vitest run packages/record/test/<file>.test.ts` from repo root.

---

### Task 1: The outcome model and both codes (inert)

**Files:**
- Modify: `packages/record/src/outcome.ts` (narrow the variant + constructor; Exclude)
- Modify: `packages/record/src/refusal-codes.ts` (two codes; the third class; appendsOn)
- Modify: `packages/record/test/outcome-model.test.ts` (count pins 16→18; the
  @ts-expect-error pin; class assertions)
- Modify: `packages/record/test/refusal-matrix.test.ts` (count + two new sections)

**Interfaces:**
- Produces (Task 2 relies on these EXACT shapes):

```ts
// outcome.ts
| { status: 'unavailable'; code: 'availability'; authority: string }
export function unavailable(authority: string): Outcome<never>;
export function refused(
  code: Exclude<RefusalCode, 'availability'>,
  transitionRef?: Digest,
): Outcome<never>;

// refusal-codes.ts
export type RefusalClass = 'refusal' | 'compromise' | 'availability';
// union gains 'consultation-failed' (class 'refusal') and 'availability' (class 'availability')
// appendsOn: an 'availability'-class code returns false BEFORE the terminalRefusals consult
```

- [ ] **Step 1: Write the failing tests**

In `outcome-model.test.ts` (read the file first; match on content — the count pin is at
the `ALL_REFUSAL_CODES.length` assertion, currently 16/"sixteen"):
- bump 16 → 18 and "sixteen" → "eighteen";
- wherever the file asserts the class set (a pin over REGISTRY's value union or the
  `RefusalClass` type), the third class joins — mirror the file's own conventions;
- add the compile-time exclusion pin beside the `refused()` tests:

```ts
test('refused() cannot mint the availability code — the class is carried by the unavailable status alone', () => {
  // SPEC §8: the availability code "is carried by the `unavailable` outcome status,
  // **never** a `refused` edge". The exclusion is COMPILE-TIME (the second step-5
  // increment's ruling); the runtime half of this pin exercises the narrowed
  // constructor instead.
  // @ts-expect-error — 'availability' is excluded from refused()'s code parameter
  const illegal = () => refused('availability');
  void illegal;
  const out = unavailable('svc:sanctions');
  assert.deepEqual(out, { status: 'unavailable', code: 'availability', authority: 'svc:sanctions' });
});
```

  (`unavailable` joins the file's imports from `../src/outcome.js`.)

In `refusal-matrix.test.ts`: bump the count and arithmetic prose to 18; add TWO
sections following the file's conventions —
- `consultation-failed`: the `content-drift`-shape section (class `refusal`,
  `terminalRefusals`-able, open-by-default), producer worded two-touch (finalize's
  required-consultation rung, landing later in the second step-5 increment);
- `availability`: its own class; NEVER appends (`appendsOn` false even when a leg lists
  it — the legal-but-inert pin, mirroring the file's existing `leg-expired` inert pin;
  read that section and follow its shape); carried by the `unavailable` status, never a
  `refused` edge.

- [ ] **Step 2: Run to verify failure — EXECUTE it**

Run: `pnpm exec vitest run packages/record/test/outcome-model.test.ts packages/record/test/refusal-matrix.test.ts`
Expected: FAIL — the union has 16 members; `unavailable` has a two-parameter signature.
Capture the output.

- [ ] **Step 3: Implement**

1. `refusal-codes.ts`:
   - union gains `| 'consultation-failed'` and `| 'availability'`, each with its own
     comment: `consultation-failed` — SPEC §8's conditional table, "`refusal`-class,
     open-by-default for re-run"; producer worded two-touch (the rung lands later in
     the second step-5 increment). `availability` — §8: the availability class's single
     code, "never appends"; carried by the `unavailable` status; producers named
     two-touch (§11.1's rung later in the second step-5 increment; §10.3's policy gate
     a later build step).
   - `RefusalClass` becomes `'refusal' | 'compromise' | 'availability'`; `REGISTRY`
     gains `'consultation-failed': 'refusal'` and `'availability': 'availability'`.
   - `appendsOn`: after the compromise arm, add

```ts
  if (REGISTRY[code] === 'availability') return false; // never a `refused` edge (SPEC §8)
```

     and extend the doc comment's inert-`terminalRefusals` paragraph: `leg-expired` AND
     `availability` are the two legal-but-inert members §8 names "so an adopter isn't
     trapped configuring a control that can never fire".
2. `outcome.ts`:
   - the variant narrows to `{ status: 'unavailable'; code: 'availability'; authority:
     string }`;
   - `unavailable(authority: string): Outcome<never>` returns
     `{ status: 'unavailable', code: 'availability', authority }` (the zero-caller
     two-parameter form retires);
   - `refused`'s parameter becomes `Exclude<RefusalCode, 'availability'>` with one
     comment sentence (the §8 never-a-refused-edge rule made compile-time);
   - the variant's forward-compat doc comment rewrites two-touch: §11.1's producer (the
     required-consultation rung) lands later in the second step-5 increment; §10.3's
     policy gate remains a later build step's second producer.

- [ ] **Step 4: Run tests, gates, commit**

Run the two named files (PASS), `pnpm test` (PASS — nothing produces either code yet;
`refused`'s narrowing breaks no caller), all five gates. Commit (Bash tool):

```bash
git add packages/record/src/outcome.ts packages/record/src/refusal-codes.ts packages/record/test/outcome-model.test.ts packages/record/test/refusal-matrix.test.ts
git commit -m "The third class, narrowed to its one code: availability never rides a refused edge

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: The gate — guard lift lands with rung 5.5, in one commit

**Files:**
- Modify: `packages/record/src/config.ts` (delete the GOVERNED throw; move
  `RESERVED_CONSULTATION_KINDS` here; add `validateRequiredConsultations`)
- Modify: `packages/record/src/kernel/consultations.ts` (re-import the reserved set)
- Modify: `packages/record/src/kernel/finalize.ts` (rung 5.5 + the header ladder)
- Modify: `packages/record/src/outcome.ts` + `packages/record/src/refusal-codes.ts` +
  `packages/record/test/refusal-matrix.test.ts` (finalize the two-touch §11.1-producer
  wording — the rung is real from this commit; §10.3's half stays future)
- Modify: `packages/record/test/construction-validation.test.ts` (invert the GOVERNED
  pin; add the structural pins)
- Test: `packages/record/test/consultations.test.ts` (the gate pins)

**Interfaces:**
- Consumes: Task 1's `unavailable(authority)`; the attach form's `supplied` partition
  (already computed at finalize's intake); `refuseMaybeAppend`.
- Produces: rung 5.5; `validateRequiredConsultations(profile, leg)` (internal);
  `RESERVED_CONSULTATION_KINDS` exported from config.ts.

**All in ONE commit** — the standing atomicity discipline.

- [ ] **Step 1: Write the failing tests**

In `construction-validation.test.ts`, REPLACE the GOVERNED `requiredConsultations` pin
(locate by title — "GOVERNED: a leg declaring requiredConsultations throws") with:

```ts
test('requiredConsultations is accepted at construction — the gate is built', () => {
  // INVERTED, at the second step-5 increment: the kernel increment pinned a GOVERNED
  // throw here while no gate enforced the declaration. The required-consultation rung
  // lands at finalize's rung 5.5 in the same commit as this lift, so the guard's stated
  // trigger has fired.
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  assert.doesNotThrow(() =>
    create(makeConfig([{ ...p, legs: [{ ...leg, requiredConsultations: ['risk-check'] }] }])),
  );
});

test('structural: requiredConsultations rejects empty, duplicate, empty-string, and reserved kinds', () => {
  // The settled fail-closed class (the notActorOf/proposer rulings): no
  // declarable-but-inert configuration exists. The reserved half is SPEC §11.1's own
  // sentence: "declaring a reserved kind in `requiredConsultations` is likewise a
  // profile-construction error".
  const p = captureProfile();
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  const withReq = (kinds: string[]) => ({
    ...p,
    legs: [{ ...leg, requiredConsultations: kinds }],
  });
  assertStructural(withReq([]), /non-empty/i);
  assertStructural(withReq(['risk-check', 'risk-check']), /duplicate/i);
  assertStructural(withReq(['']), /kind/i);
  assertStructural(withReq(['facts']), /reserved/i);
  assertStructural(withReq(['chain-verify']), /reserved/i);
});
```

(The existing `freshness`/`eligibility` GOVERNED pins stay untouched — verify.)

In `consultations.test.ts`, append under a banner
`// === the required-consultation gate: rung 5.5 (second step-5 increment) ===`:

```ts
/** captureProfile with the leg's requiredConsultations set (and optional extras). */
function gatedProfile(extra?: Partial<LegSpec>): ConfirmProfile {
  const p = captureProfile({ id: 'test.gated.v1' });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  p.legs[0] = { ...leg, requiredConsultations: ['risk-check', 'sanctions'], ...extra };
  return p;
}
const GATED_SUBJECT = 'subject:gate-1';

// Reuse the file's EXISTING `obtained(kind, extra?)` helper (the first step-5
// increment's) for every obtained-consultation fixture below — `obtained('x')` is a
// pass verdict; `obtained('x', { verdict: 'fail' })` the fail shape. Do not add a
// duplicate builder.

async function openGated(store: MemoryStore, extra?: Partial<LegSpec>) {
  const handles = create(makeConfig([gatedProfile(extra)], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.gated.v1', GATED_SUBJECT);
  return { handles, recordId };
}

test('the full pass: both required kinds obtained pass — confirmed, both recorded', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('risk-check'), obtained('sanctions')],
  });
  assert.equal(done.status, 'ok');
  const rec = await handles.operator.getRecord(recordId);
  assert.deepEqual(
    rec?.consultations.map((c) => c.kind),
    ['chain-verify', 'facts', 'risk-check', 'sanctions'],
  );
});

test('missing refuses consultation-missing, open by default, and the corrected retry confirms', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('risk-check')], // sanctions missing
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'consultation-missing');
  assert.equal((await store.readChain(recordId)).length, 1, 'open, no append — the default path');

  const retry = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('risk-check'), obtained('sanctions')],
  });
  assert.equal(retry.status, 'ok');
});

test('an obtained fail on a required kind refuses consultation-failed; the corrected retry confirms', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [{ ...obtained('risk-check'), verdict: 'fail' } as ConsultationInput, obtained('sanctions')],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'consultation-failed');
  assert.equal((await store.readChain(recordId)).length, 1);

  const retry = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('risk-check'), obtained('sanctions')],
  });
  assert.equal(retry.status, 'ok');
});

test('THE AVAILABILITY PIN: a required kind reported unreachable — unavailable status, no edge, the seam re-arms', async () => {
  // SPEC §11.1: "never a fabricated pass"; the availability outcome "never appends":
  // the record stays open "and the seam re-arms for bounded host retry" — the retry
  // budget is the HOST's, not the library's.
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [
      { kind: 'risk-check', unreachable: true, authority: 'svc:risk-check' },
      obtained('sanctions'),
    ],
  });
  assert.deepEqual(out, {
    status: 'unavailable',
    code: 'availability',
    authority: 'svc:risk-check',
  });
  assert.equal((await store.readChain(recordId)).length, 1, 'nothing appended, ever');

  const retry = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('risk-check'), obtained('sanctions')],
  });
  assert.equal(retry.status, 'ok', 'the re-armed seam accepts the recovered authority');
});

test('the FIRST declared kind trips: risk-check missing beats sanctions failing — declaration order, not severity', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [{ ...obtained('sanctions'), verdict: 'fail' } as ConsultationInput],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'consultation-missing'); // risk-check, declared first, is missing
});

test('non-required kinds stay evidence with the gate live: an extra fail records and confirm proceeds', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [
      obtained('risk-check'),
      obtained('sanctions'),
      { kind: 'llm-judge', checker: CHECKER, payloadDigest: DIGEST, verdict: 'fail' },
    ],
  });
  assert.equal(done.status, 'ok');
  const rec = await handles.operator.getRecord(recordId);
  assert.ok(rec?.consultations.some((c) => c.kind === 'llm-judge' && c.verdict === 'fail'));
});

test('terminalRefusals may make consultation-failed terminal: the refused edge appends and the pair releases', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store, {
    terminalRefusals: ['consultation-failed'],
  });
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [{ ...obtained('risk-check'), verdict: 'fail' } as ConsultationInput, obtained('sanctions')],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'consultation-failed');
  assert.ok(out.transitionRef !== undefined, 'terminal path: the refused edge appended');
  const last = (await store.readChain(recordId)).at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'refused');
  assert.deepEqual(Object.keys(last.payload as object), ['code']);
  assert.equal(await store.findNonTerminal('test.gated.v1', GATED_SUBJECT), null);
});

test('availability is legal-but-inert in terminalRefusals AT THE SEAM: still no edge, still open', async () => {
  // SPEC §8 names `availability` (with `leg-expired`) as a legal terminalRefusals
  // member that can never fire — "never a `refused` edge". The matrix pins appendsOn;
  // this pins the seam itself.
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store, {
    terminalRefusals: ['availability'],
  });
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [{ kind: 'risk-check', unreachable: true, authority: 'svc:x' }, obtained('sanctions')],
  });
  assert.equal(out.status, 'unavailable');
  assert.equal((await store.readChain(recordId)).length, 1);
  assert.equal(await store.findNonTerminal('test.gated.v1', GATED_SUBJECT), recordId, 'still open, still held');
});

test('the gate reads the finalizing record\'s OWN leg: an undeclaring maker is ungated on a declaring-checker profile', async () => {
  const store = new MemoryStore();
  const p = twoLegProfile({ id: 'test.gated.twoleg.v1' });
  const checker = p.legs[1];
  if (checker === undefined) throw new Error('fixture: twoLegProfile has two legs');
  p.legs[1] = { ...checker, requiredConsultations: ['risk-check'] };
  const handles = create(makeConfig([p], { store }));
  const makerId = await openRecord(handles, CONTENT, 'test.gated.twoleg.v1', 'subject:gate-2', 'maker-decide');
  const done = await handles.operator.finalize(makerId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'no consultations supplied and none required of THIS leg');
});

test('gate order: (5) facts outranks (5.5) — invalid facts refuses consultation-missing from the facts rung', async () => {
  // The discriminator: were (5.5) first, the obtained fail would say consultation-failed.
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store);
  const out = await handles.operator.finalize(
    recordId,
    identity(),
    CONTENT,
    { figures: 1n, checker: facts().checker } as unknown as ReturnType<typeof facts>,
    { consultations: [{ ...obtained('risk-check'), verdict: 'fail' } as ConsultationInput, obtained('sanctions')] },
  );
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'consultation-missing');
});
```

(`LegSpec`/`ConfirmProfile` type imports and `captureProfile` join the file's imports if
absent. The invalid-facts fixture uses a BigInt figures payload — the established
non-canonicalizable shape `isValidFacts` refuses; verify the file or `facts.test.ts` for
the exact established fixture and reuse its shape.)

- [ ] **Step 2: Run to verify failure — EXECUTE it**

Run: `pnpm exec vitest run packages/record/test/consultations.test.ts packages/record/test/construction-validation.test.ts`
Expected: the inversion pin FAILS (guard throws); every gate pin FAILS at `create()`
(GOVERNED requiredConsultations). Capture output.

- [ ] **Step 3: Implement**

1. `config.ts`:
   - Delete the `requiredConsultations` GOVERNED block from `validateLeg`.
   - Add the exported reserved set (§11.1's pair, one definition upstream — the intake
     validator re-imports it; defining it here rather than importing from the kernel
     avoids a config→kernel→config cycle):

```ts
/** SPEC §11.1: the library-emitted consultation kinds — reserved on BOTH sides of the
 * seam: a supplied input naming one throws at finalize's intake ("would forge a library
 * control"), and a profile declaring one in `requiredConsultations` is a construction
 * error ("declaring a reserved kind in `requiredConsultations` is likewise a
 * profile-construction error"). */
export const RESERVED_CONSULTATION_KINDS: ReadonlySet<string> = new Set([
  'facts',
  'chain-verify',
]);
```

   - Add `validateRequiredConsultations`, called beside `validateSodShape` in the
     indexed per-leg loop:

```ts
/** Structural requiredConsultations validation (SPEC §11.1; second step-5 increment).
 * The settled fail-closed class: no declarable-but-inert configuration exists — the
 * list is non-empty, pairwise distinct, every kind a non-empty string, and never a
 * reserved library-emitted kind. */
function validateRequiredConsultations(profile: ConfirmProfile, leg: LegSpec): void {
  if (leg.requiredConsultations === undefined) return;
  const kinds = leg.requiredConsultations;
  if (kinds.length === 0) {
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' declares requiredConsultations as an empty array — ` +
        'the control must require at least one kind (non-empty by the fail-closed ruling)',
    );
  }
  const seen = new Set<string>();
  for (const kind of kinds) {
    if (typeof kind !== 'string' || kind.length === 0) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' declares a missing or empty consultation kind in requiredConsultations`,
      );
    }
    if (RESERVED_CONSULTATION_KINDS.has(kind)) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' requires the reserved library-emitted kind '${kind}' — ` +
          'SPEC §11.1: declaring a reserved kind in requiredConsultations is a profile-construction error',
      );
    }
    if (seen.has(kind)) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' requires '${kind}' twice in requiredConsultations — ` +
          'entries must be pairwise distinct (duplicate)',
      );
    }
    seen.add(kind);
  }
}
```

     (loop call: `validateRequiredConsultations(profile, leg);` after
     `validateSodShape(profile, index, leg);`; the validateProfile doc list's per-leg
     item extends.)
2. `kernel/consultations.ts`: delete the local `RESERVED_KINDS` const; import
   `RESERVED_CONSULTATION_KINDS` from `../config.js` and use it (message text
   unchanged).
3. `kernel/finalize.ts`: rung 5.5 — the spec's §3 block VERBATIM (the marker/missing/
   verdict arms with their comments), inserted after rung (5)'s facts check and before
   rung (6)'s banner; `unavailable` joins the `outcome.js` import; the file-header
   ladder comment gains `(5.5) required consultations`.
4. Two-touch finalization: `outcome.ts`'s variant doc, `refusal-codes.ts`'s two
   producer comments, and `refusal-matrix.test.ts`'s section wording go present-tense
   for the §11.1 producer (the rung is real from this commit); §10.3's policy-gate half
   stays FUTURE tense (it is). Nothing may still say the §11.1 rung is "landing later".
5. `packages/record/test/finalize-check-order.test.ts`'s header — THIS commit breaks
   its claims, so THIS commit fixes them (the stale-banner lesson made atomic): the rung
   count moves (read `kernel/finalize.ts`'s updated ladder and state the real count);
   any `(5)->(6)` consecutive-pair claim relabels adjacent-but-for-(5.5) with the new
   pair's pin home named (`consultations.test.ts`'s order pin); the order-pair corpus
   total RECOUNTS (enumerate the actual tests before writing the number, the
   established counting-method convention in that header).

- [ ] **Step 4: Run tests, gates, commit**

Run the two named files, then `pnpm test` (zero skips), all five gates. Commit (Bash):

```bash
git add -A packages/record
git commit -m "Lift the requiredConsultations guard with rung 5.5 built: order trips, availability re-arms

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: The record — step 5 exits

**Files:**
- Modify: `docs/process/implementation-status.md`
- Modify: `CLAUDE.md`, `README.md`
- Modify: stale comments the sweep finds
- No register edits expected (verify by READING `docs/process/deferral-register.md`; the
  freshness deferral is the exit record's list — the spec's own [SKETCHED] marker, not
  register work)

**Interfaces:** consumes Tasks 1-2; the spec's §6 ("The record — step 5 exits") is the
checklist — verify every claim against CODE, never task reports.

- [ ] **Step 1: implementation-status.md**

Per the spec's §6, matching on content: steps table → step 5 **Exited** (both increments
named: the attach form; the gate + the availability class) with the deferred-at-exit
list (`freshness`/`consultation-stale` [SKETCHED], AL2-dependent — the spec's own
vacuity argument restated; §10.4's implicit-first `eligibility` prepend — step 6's);
step 6 (authority checks: eligibility + policy drift, SPEC §10.4 + §10.3) named next.
§8 row: eighteen codes, THREE classes, the availability class's never-appends/
never-terminal shape, `consultation-missing`'s two producers. §9 row: the ladder's
(5.5) rung real. §11.1 row: whole except the freshness tail, said plainly — the gate
enforces presence, verdicts, and unreachability honestly ("never a fabricated pass");
it does not prove the authority was genuinely consulted (the operator-assurance limit
travels with the guarantee). Governed count 7 → 6 with the movement named; the
construction rulings recorded as the settled class.

- [ ] **Step 2: CLAUDE.md + README.md**

CLAUDE.md: step 5 exited (two increments); the feature-guard paragraph's count (six
governed fields) with the movement; verify "three of the eight build-order steps remain
unstarted" SURVIVES (step 5 moves started→exited — the count does not change; verify and
keep). README: same movement; step 6 named next.

- [ ] **Step 3: The sweep**

```bash
git grep -nE "second step-5|consultation-failed|availability|unavailable|requiredConsultations|consultation-missing|single facts-rung|no gate|gating nothing|the gate is next|landing later|this increment|later increment|seven governed|six governed" -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
git grep -nE "\(5\.5\)|seven-rung|eight-rung|order-pair|forward-compat|no producer in this build|sixteen|seventeen|eighteen" -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
```

(The second grep carries the structure/OLD-shape tokens — the standing lessons:
`finalize-check-order.test.ts`'s header rung count and order-pair corpus total are
DIRECT targets (the ladder gained a rung; the (5)->(6) adjacency broke); `outcome.ts`'s
old "no producer in this build" forward-compat text; old count words.) Judge EVERY hit:
still-true / fixed-by-earlier-tasks / fix-now / historical-leave-alone. THE REPORT MUST
SHOW HIT-COUNT == VERDICT-COUNT. END-OF-INCREMENT OWN-COMMENT PASS:
`git diff 669f639..HEAD -- packages | grep -nE "landing later|later in the second step-5"`
— judge every hit.

- [ ] **Step 4: Verify quotes, gates, commit**

Hand-verify every quoted SPEC phrase in touched markdown whitespace-collapsed. All five
gates. Commit (Bash):

```bash
git add -A
git commit -m "Record step 5's exit: attach then gate, the third class honest about what it cannot prove

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
git diff 2d31c6e..HEAD -- packages/record/test/byte-stability.test.ts   # MUST be empty
git diff 2d31c6e..HEAD -- packages/record/src/chain/encoding.ts          # MUST be empty
git diff 2d31c6e..HEAD -- packages/record/src/store/                     # MUST be empty
```

Any non-empty result ⇒ BLOCKED with the diff stat.

- [ ] **Step 3: Report**

The increment's commit list (`git log --oneline 2d31c6e..HEAD` — 2d31c6e is the spec
commit; 669f639 its amendment), exact counts, register rows live (read the file),
step-5-Exited confirmation (read the steps table), and `git status -sb`'s ahead count
for the user-gated push.
