# Live Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift `captureMode:'live'` behind SPEC §9.2's real construction rules and give
`reverify` its redemption semantics — a content mismatch on a reverify profile refuses
`content-drift` with an appended terminal edge (result-first, no edge, when enlisted) —
then execute the sanctioned sealed-set edit and record the tail's second landing.

**Architecture:** `validateLiveCapture` (config.ts, the settled class) replaces the
GOVERNED throw; one mapping helper in `kernel/redeem.ts` serves the family's three
CONTENT comparisons (complete's token half untouched); nothing else changes — stage,
open, finalize, expiry, store, replay, and the codes are all already what the mode
needs.

**Tech Stack:** TypeScript strict, vitest, Biome; pnpm workspace, Node >=22.16.

**Spec:** docs/superpowers/specs/2026-08-17-live-capture-design.md (5311128, amended
with the enlisted-branch ruling in this plan's commit). The rulings bind.

## Global Constraints

- Code + guard lift + tests: ONE commit (Task 1). The sealed-set edit its OWN commit
  (Task 2). The record its own (Task 3).
- Five gates before every commit: `pnpm typecheck` · `pnpm lint` · `pnpm lint:strict` ·
  `pnpm test` (zero skips) · `node scripts/contract-scan.mjs` (silent, LAST on the
  staged tree). PowerShell for pnpm (`$env:PATH = "$env:APPDATA\npm;$env:PATH"`
  first); git via the Bash tool; branch `main`.
- Frozen, NO exceptions: `packages/record/test/byte-stability.test.ts`,
  `packages/record/src/chain/encoding.ts`, `packages/record/src/store/`.
  `docs/concept/` untouched by Tasks 1 and 3; Task 2 changes EXACTLY four tokens, OQ
  §7's decided tails, and SPEC:488's one clause — full before/after lines below
  (lesson 22).
- SPEC-cited strings in code escape-free (template literals/double quotes).
- Comments: explicit increment naming ("the live-capture increment"), never bare
  "this increment"; ASCII apostrophes; no "Task N"/"slice". Producer wording
  PRESENT-TENSE (everything lands in Task 1's own commit).
- RED is EXECUTED — including the enlisted SQLite pin RED-FIRST (lesson 9).
- Trailer on every commit: Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

---

### Task 1: The lift and the reverify arm — construction, mapping, tests

**Files:**
- Modify: `packages/record/src/config.ts` (remove the `captureMode:'live'` GOVERNED
  throw; add `validateLiveCapture`; rewrite the reverify-on-non-live check's message;
  the `validateProfile` header's order/count prose moves with it)
- Modify: `packages/record/src/kernel/redeem.ts` (the mapping helper + three arm
  edits)
- Modify: `packages/record/src/create.ts` ONLY IF `profileDeclaresEffectSeam`'s
  comment needs its finalization (config.ts:53-61 — the "even though in this build a
  `captureMode:'live'` …" clause: rewrite truthfully, live constructs now)
- Test: create `packages/record/test/live-capture.test.ts`; modify
  `packages/record/test/helpers/profiles.ts` (a `liveProfile` builder);
  `packages/record/test/construction-validation.test.ts` (the guard-sweep reshape +
  the live construction pins; the reverify-on-staged pin's message regex updated if
  needed); `packages/record/test/refusal-matrix.test.ts` (comment-truth only: the
  `content-drift` section's producer note gains the second producer with the
  terminalRefusals-not-consulted-at-redemption distinction; the `effect-mismatch`
  section's wording stays true — verify, adjust minimally if not)

**Interfaces:**
- Consumes: `resolved.profile.redeem?.reverify` (config.ts:40 — already typed);
  `refused(code, transitionRef?)` (outcome.ts); `nonTerminal`/`isFinalLeg`
  (nonterminal.js); `transitionDigest` (chain/encoding.js); the family's
  `residualRefusal` helper (kernel/redeem.ts — read its exact signature before use).
- Produces: `liveProfile(overrides?)` test helper; no public API change.

- [ ] **Step 1: Write the failing tests**

Add to `packages/record/test/helpers/profiles.ts` (beside `effectSeamProfile`,
mirroring its shape):

```ts
/** SPEC §9.2's live mode (the live-capture increment): decide-what-exists. Declares
 * the mode's two construction obligations — a per-leg required consultation (the
 * host-named independent re-derivation kind) and the redemption tail (`reverify` by
 * default here; override `redeem` for the `confirmToRedeem`-only shape). */
export function liveProfile(overrides: ProfileOverrides = {}): ConfirmProfile {
  const leg = buildLeg(overrides);
  return {
    id: overrides.id ?? 'test.live.v1',
    subject: { canonicalizerRef: overrides.canonicalizerRef ?? DEFAULT_CANONICALIZER_REF },
    legs: [{ ...leg, requiredConsultations: leg.requiredConsultations ?? ['rederive'] }],
    captureMode: 'live',
    expiry: resolveExpiry(overrides),
    redeem: { reverify: true },
  };
}
```

(Adapt to `ProfileOverrides`'s actual fields — if it has no `requiredConsultations`
member, extend it the way the other optional members are declared, or take the kinds
from a dedicated override; follow the file's own conventions. If a `redeem` override
member exists, honor it before the default.)

Create `packages/record/test/live-capture.test.ts`:

```ts
// @vidimera/record — live-capture.test.ts (SPEC §9.2's `live` mode, the live-capture
// increment): decide-what-exists over machinery already built. The staged-reference
// contract is UNCHANGED (the OQ §7 decision): stage binds the reviewed rendering,
// finalize's rung (4) recompute is the decide-time re-verification, and the mandated
// independent re-derivation rides rung (5.5) as an ordinary required consultation.
// `reverify` maps the redemption family's CONTENT mismatches to `content-drift`,
// appended terminal (the ordinary non-terminal path — a live profile's confirmed
// awaits redemption); the token half keeps `effect-mismatch`; the enlisted direct
// shape refuses result-first without appending (the family's settled discipline).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  facts,
  identity,
  liveProfile,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const DRIFTED = { subject: 'week-1', total: 43 };
const SUBJ = 'subject:live-1';
const CHECKER = { principal: 'svc:rederive', authority: 'mtls:rederive' };
const DIGEST = `sha256:${'d'.repeat(64)}`;

function rederiveConsultation() {
  return {
    consultations: [
      { kind: 'rederive', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' as const },
    ],
  };
}

async function confirmedLive(handles: ReturnType<typeof create>, subjectRef: string) {
  const recordId = await openRecord(handles, CONTENT, 'test.live.v1', subjectRef);
  const done = await handles.operator.finalize(
    recordId,
    identity(),
    CONTENT,
    facts(),
    rederiveConsultation(),
  );
  assert.equal(done.status, 'ok', 'fixture: the live finalize must confirm');
  return recordId;
}

test('the live happy path: stage -> open -> gated finalize -> non-terminal confirmed -> redeem', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([liveProfile()], { store }));
  const recordId = await confirmedLive(handles, SUBJ);

  // The effect-seam predicate pin: a live final-leg confirmed AWAITS redemption —
  // non-terminal, so seal() refuses it (the seal.test.ts argument, at this mode).
  const sealed = await handles.operator.seal(recordId);
  assert.equal(sealed.status, 'refused');
  if (sealed.status === 'refused') assert.equal(sealed.code, 'unsealable-state');

  const out = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(out.status, 'ok');
  if (out.status === 'ok') assert.equal(out.value.state, 'redeemed');
});

test('the gated obligation fires: a live finalize without its required consultation refuses consultation-missing', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([liveProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.live.v1', 'subject:live-gate');
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'consultation-missing');
});

test('reverify at the direct shape: drift refuses content-drift with an APPENDED terminal edge, releasing the hold', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([liveProfile()], { store }));
  const recordId = await confirmedLive(handles, 'subject:live-drift');

  const out = await handles.operator.redeem(recordId, DRIFTED);
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'content-drift');
  assert.ok(out.transitionRef !== undefined, 'the refusal carries the appended edge');

  const rec = await handles.operator.getRecord(recordId);
  assert.equal(rec?.state, 'refused');
  assert.equal(rec?.refusalCode, 'content-drift');
  // Terminal — the (profile, subject) hold is RELEASED:
  const reopened = await openRecord(handles, CONTENT, 'test.live.v1', 'subject:live-drift');
  assert.ok(reopened.length > 0, 'a fresh record opens for the same pair');
});

test('the composition pin: the drift-refused record is a legal recovery predecessor', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([liveProfile()], { store }));
  const recordId = await confirmedLive(handles, 'subject:live-rec');
  const drift = await handles.operator.redeem(recordId, DRIFTED);
  assert.equal(drift.status, 'refused');
  const head = await handles.operator.chainHead(recordId);
  assert.ok(head !== null);

  const staged = await handles.agent.stage(CONTENT, 'test.live.v1', 'subject:live-rec');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const recovered = await handles.operator.open(staged.value.stagedRef, {
    supersedes: { recordId, chainHead: head },
  });
  assert.equal(recovered.status, 'ok', 'drift kills the decision; supersedes re-opens it');
});

test('reverify at the token shape: begin-time drift appends from confirmed; complete-time content drift appends from redeeming; a wrong token stays effect-mismatch', async () => {
  // Begin-time drift:
  const store1 = new MemoryStore();
  const h1 = create(makeConfig([liveProfile()], { store: store1 }));
  const r1 = await confirmedLive(h1, 'subject:live-b');
  const begun = await h1.operator.beginRedemption(r1, DRIFTED);
  assert.equal(begun.status, 'refused');
  if (begun.status === 'refused') assert.equal(begun.code, 'content-drift');
  assert.equal((await h1.operator.getRecord(r1))?.state, 'refused');

  // Complete-time content drift (begin clean, then drift):
  const store2 = new MemoryStore();
  const h2 = create(makeConfig([liveProfile()], { store: store2 }));
  const r2 = await confirmedLive(h2, 'subject:live-c');
  const issue = await h2.operator.beginRedemption(r2, CONTENT);
  assert.equal(issue.status, 'ok');
  if (issue.status !== 'ok') return;
  const complete = await h2.operator.completeRedemption(r2, issue.value.token, DRIFTED);
  assert.equal(complete.status, 'refused');
  if (complete.status === 'refused') assert.equal(complete.code, 'content-drift');
  assert.equal((await h2.operator.getRecord(r2))?.state, 'refused');

  // Wrong token, matching content — the token half is NOT drift:
  const store3 = new MemoryStore();
  const h3 = create(makeConfig([liveProfile()], { store: store3 }));
  const r3 = await confirmedLive(h3, 'subject:live-d');
  const issue3 = await h3.operator.beginRedemption(r3, CONTENT);
  assert.equal(issue3.status, 'ok');
  if (issue3.status !== 'ok') return;
  const lenBefore = (await h3.operator.readChain(r3)).length;
  const bad = await h3.operator.completeRedemption(r3, 'not-the-token', CONTENT);
  assert.equal(bad.status, 'refused');
  if (bad.status === 'refused') assert.equal(bad.code, 'effect-mismatch');
  assert.equal((await h3.operator.readChain(r3)).length, lenBefore, 'never-append');
});

test('a confirmToRedeem-only live profile keeps effect-mismatch (reverify undeclared)', async () => {
  const store = new MemoryStore();
  const profile = liveProfile({ id: 'test.live.age.v1' });
  profile.redeem = { confirmToRedeem: 3600 };
  const handles = create(makeConfig([profile], { store }));
  const recordId = await confirmedLive(handles, 'subject:live-e');
  // (confirmedLive stages under 'test.live.v1' — inline the flow here instead:)
  // NOTE FOR THE IMPLEMENTER: parameterize confirmedLive by profileId; this test
  // passes 'test.live.age.v1'. Adjust the helper signature accordingly.
  const lenBefore = (await handles.operator.readChain(recordId)).length;
  const out = await handles.operator.redeem(recordId, DRIFTED);
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'effect-mismatch');
  assert.equal((await handles.operator.readChain(recordId)).length, lenBefore);
});
```

(The `confirmedLive` helper takes `profileId` as a third parameter with
`'test.live.v1'` as its default — apply that from the start so the last test reads
cleanly; the inline NOTE then disappears.)

The enlisted pin goes in the EXISTING SQLite-side suite where the lesson-9 clock pin
lives (find it: `git grep -ln "cannot start a transaction" packages/record/test` or
the sqlite test file's enlisted section) — RED FIRST:

```ts
test('enlisted reverify drift refuses result-first WITHOUT appending (the family discipline at the reverify arm)', async () => {
  // Fixture shape: the file's existing enlisted-redeem fixture, under liveProfile()
  // instead of effectSeamProfile(); drive to confirmed with the rederive
  // consultation, then redeem(recordId, DRIFTED, <the enlisted tx the file's other
  // enlisted tests pass>). Assert: refused, code 'content-drift', NO transitionRef,
  // and the chain length unchanged after the tx commits/aborts per the file's own
  // enlisted-test convention. Mirror the surrounding tests' tx plumbing exactly.
});
```

(Prose fixture directive, deliberately: the sqlite enlisted plumbing is file-specific;
transcribe the neighboring enlisted test's setup rather than inventing one. The
assertion contract above is exact.)

Construction pins (`construction-validation.test.ts`):

```ts
// === validateLiveCapture: SPEC §9.2's live mode (the live-capture increment) ===

test('live capture: every leg requires a consultation, and the redemption tail is declared', () => {
  const missingConsultations = liveProfile();
  missingConsultations.legs[0] = {
    ...(missingConsultations.legs[0] as LegSpec),
    requiredConsultations: undefined,
  };
  assert.throws(() => create(cfg(missingConsultations)), /requiredConsultations|re-derivation/i);

  const noRedeem = liveProfile();
  noRedeem.redeem = undefined;
  assert.throws(() => create(cfg(noRedeem)), /redeem|confirmToRedeem|reverify/i);

  const emptyRedeem = liveProfile();
  emptyRedeem.redeem = {};
  assert.throws(() => create(cfg(emptyRedeem)), /confirmToRedeem|reverify/i);

  assert.doesNotThrow(() => create(cfg(liveProfile())));
  const ageOnly = liveProfile();
  ageOnly.redeem = { confirmToRedeem: 3600 };
  assert.doesNotThrow(() => create(cfg(ageOnly)));
  const both = liveProfile();
  both.redeem = { confirmToRedeem: 3600, reverify: true };
  assert.doesNotThrow(() => create(cfg(both)));
});
```

(`cfg(profile)` — reuse the file's existing single-profile config builder, whatever
its name. The guard-sweep-total test loses `captureMode:'live'` — its LAST reshape:
a `freshness`-declaring profile alone throws GOVERNED, and the comment names the
movement, two down to one at the live-capture increment. The reverify-on-staged pin
stays; update its message regex if the rewritten message no longer matches.)

- [ ] **Step 2: Run to verify failure — EXECUTE it**

`pnpm exec vitest run packages/record/test/live-capture.test.ts` — FAIL:
GOVERNED(captureMode) at construction. The enlisted pin — FAIL RED-FIRST (it must
fail for the RIGHT reason: today the drifted enlisted redeem refuses
`effect-mismatch`, so the `content-drift` assertion fails). Capture both outputs.

- [ ] **Step 3: Implement**

1. `config.ts` — delete the `captureMode === 'live'` GOVERNED throw from
   `validateProfile`; add:

```ts
/**
 * SPEC §9.2's live-mode construction rules (the live-capture increment — the
 * captureMode:'live' lift). "The obligation is gated, not merely stated: the
 * re-derivation is declared as a `requiredConsultations` kind under §11.1" — so every
 * leg of a live profile must DECLARE required consultations (which declared kind is
 * the independent re-derivation is the host's semantics; that its access path is
 * genuinely independent is not library-checkable — that proof is the
 * operator-assurance tier's live-path-distinctness probe, CONTROLS §4). And the
 * redemption tail: "A live profile either declares `confirmToRedeem` as a maximum
 * age" or declares `reverify` — at least one; both is legal.
 */
function validateLiveCapture(profile: ConfirmProfile): void {
  if (profile.captureMode !== 'live') return;
  for (const leg of profile.legs) {
    if (leg.requiredConsultations === undefined) {
      throw new Error(
        `invalid profile '${profile.id}': captureMode 'live' requires leg '${leg.id}' to declare ` +
          'requiredConsultations — the decide-time independent re-derivation is gated, not merely stated (SPEC §9.2)',
      );
    }
  }
  if (profile.redeem?.confirmToRedeem === undefined && profile.redeem?.reverify !== true) {
    throw new Error(
      `invalid profile '${profile.id}': captureMode 'live' requires the redemption tail — ` +
        "declare redeem.confirmToRedeem as a maximum age, redeem.reverify, or both (SPEC §9.2)",
    );
  }
}
```

   Call it in `validateProfile` where the GOVERNED throw sat (order preserved: after
   the leg-id checks, before the per-leg loop — the header's numbered order rewrites
   accordingly, and its governed-count paragraph gains the 2 → 1 movement with
   `validateLiveCapture` named). The reverify-on-non-live check at the function's
   tail: its comment and message rewrite truthfully (reverify is live's own control;
   declaring it on a staged profile is the misdeclaration — no longer "not built in
   this build").

2. `kernel/redeem.ts` — the mapping helper (place near `residualRefusal`, matching
   the family's helper idiom; read `residualRefusal`'s signature first and mirror its
   plumbing):

```ts
/**
 * The correspondence-mismatch mapping (SPEC §9.2, the live-capture increment): a
 * reverify-declaring profile treats a CONTENT-digest mismatch as state drift —
 * `content-drift` ("registered as that code's second producer, §8"), appended
 * terminal from the seam's current state, releasing the (profile, subject) hold; the
 * appended edge rides the ORDINARY non-terminal path (a live profile's confirmed
 * awaits redemption — the effect-seam predicate). Every other profile keeps §11.2's
 * `effect-mismatch`, never-append. `terminalRefusals` is finalize's machinery and is
 * NOT consulted here — the redemption-time drift append is unconditional (the OQ §7
 * decision). ENLISTED (tx supplied), the drift refusal is result-first with NO
 * append: an edge inside the host's transaction would roll back with the aborted
 * effect — the family's settled enlisted discipline (its chain-verify and clock
 * rungs both). The token comparison at completeRedemption is never routed here: a
 * wrong token is not state drift.
 */
async function refuseCorrespondenceMismatch(
  store: Store,
  chain: readonly Transition[],
  resolved: ResolvedProfile,
  target: 'confirmed' | 'redeeming',
  finalLeg: boolean,
  now: () => Date,
  tx?: unknown,
): Promise<Outcome<never>> {
  if (resolved.profile.redeem?.reverify !== true) {
    return refused('effect-mismatch');
  }
  if (tx !== undefined) {
    return refused('content-drift');
  }
  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('redeem: empty chain — the caller length checks hold');
  }
  const edge: Transition = {
    recordId: last.recordId,
    seq: chain.length + 1,
    at: now().toISOString(),
    kind: 'refused',
    payload: { code: 'content-drift' },
    prevHash: transitionDigest(last),
  };
  // Terminal by the derivation; dueAt omitted clears the pending clock (SPEC §12).
  const meta: AppendMeta = {
    nonTerminal: nonTerminal('refused', finalLeg, resolved.effectSeam),
  };
  const res = await store.appendTransition(target, edge, meta);
  if (!res.appended) {
    // A racing writer moved the state — the family's CAS-residual discipline.
    return residualRefusal(store, last.recordId);
  }
  return refused('content-drift', res.transitionDigest);
}
```

   (Adapt: if `residualRefusal`'s real signature differs, follow it; if the direct
   arm's `finalLeg` is not in scope at the call sites, thread it the way the seam
   already derives it. Then the three call-site edits — each replaces its
   `return refused('effect-mismatch');` on the CONTENT comparison:)

   - direct rung (5) (~:246): `return refuseCorrespondenceMismatch(store, chain, resolved, 'confirmed', finalLeg, now, tx);`
   - begin's correspondence (~:330): same, `'confirmed'`, no tx (begin takes none).
   - complete's CONTENT comparison (the `recomputed !== record.contentDigest` one,
     ~:448): same, `'redeeming'`, no tx. Complete's TOKEN comparison
     (`digest(token) !== persisted`) is untouched.
   - The module-header ladder comments (~:14, ~:373-375) rewrite truthfully: rung
     (5)'s mapping is `effect-mismatch`, or `content-drift` appended on a reverify
     profile (the live-capture increment).

3. `create.ts`'s `profileDeclaresEffectSeam` comment (config.ts:53-61 — it lives in
   config.ts; check both): finalize the "even though in this build …" clause — a
   `captureMode:'live'` profile constructs as of the live-capture increment.

4. `refusal-matrix.test.ts` comment-truth: the `content-drift` section notes the
   second producer (the redemption family's reverify mapping, live-capture increment,
   unconditional append — `terminalRefusals` not consulted at that seam); verify the
   `effect-mismatch` section's text stays true and adjust minimally if not.

- [ ] **Step 4: Run tests, gates, commit**

Targeted runs (live-capture, construction-validation, the sqlite enlisted file,
refusal-matrix), full suite, five gates. Commit (Bash):

```bash
git add -A packages/record
git commit -m "Live capture: the mode lifts behind its gated obligations; reverify makes drift die terminal

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: The sealed-set edit — four tokens, the OQ §7 decisions, one clause

**Files:** `docs/concept/SPEC.md`, `docs/concept/CONTROLS.md`,
`docs/concept/OPEN-QUESTIONS.md` — EXACTLY the edits below, full before/after lines
(locate by content; line numbers advisory). The never-edit rule is LIFTED for exactly
this commit and these edits (the user's live-capture brainstorm ruling); it re-arms
after.

- [ ] **Step 1: The four tokens + the one clause**

1. SPEC ~488 (the `content-drift` row) — ONE line, two changes (the token AND the
   sanctioned clause):
   BEFORE: `| content-drift | bound content changed between render and finalize (§3, §9); the [SKETCHED] live mode also raises it at redemption-time reverify (§9.2), whose seam semantics are among that mode's open decisions (OPEN-QUESTIONS.md) |`
   AFTER: `| content-drift | bound content changed between render and finalize (§3, §9); the [PROVEN] live mode also raises it at redemption-time reverify (§9.2), whose seam semantics are decided on record (OPEN-QUESTIONS.md §7) |`
   (Reproduce the line's actual backtick formatting exactly — the BEFORE/AFTER here
   omit inline backticks for plan-fence legibility; only the token and the final
   clause change.)
2. SPEC ~667: BEFORE `- **\`live\` [SKETCHED].** The digest covers a fresh read of live state (decide-what-exists).`
   AFTER: the same line with `[PROVEN]` (plain brackets inside the bold span).
3. CONTROLS ~40 (the redemption row's prose): the words `the SKETCHED live mode` →
   `the PROVEN live mode`; nothing else on the line.
4. CONTROLS ~45 (the live row's maturity cell): bare `SKETCHED` → `PROVEN`; nothing
   else on the line.

- [ ] **Step 2: The OQ §7 tails**

OPEN-QUESTIONS.md §7's paragraph gains its decided answers (reflow to the file's line
width; minimal tense adjustment of the existing sentences is permitted — this section
is the edit's own home): append after the existing "Residual: …" sentence:

`**Decided (this build):** the reverify surface takes no new argument — the redemption
seams' existing content argument is the fresh read, and a reverify-declaring profile
maps every content-digest mismatch to content-drift, appended and terminal (the token
comparison keeps effect-mismatch; an enlisted direct-shape call refuses result-first
with no append). **Decided (this build):** the staging contract is unchanged — neither
changed nor bypassed; decide-time binding is finalize's own recompute plus the gated
independent re-derivation consultation.`

(Write with the document's inline-backtick conventions for code identifiers.)

- [ ] **Step 3: Byte-verify, gates, commit**

`git diff -- docs/concept/` must show: the SPEC:488 line pair (token + clause only),
the SPEC:667 token pair, the two CONTROLS pairs, and ONLY the §7 additions in
OPEN-QUESTIONS.md. `grep -rn "SKETCHED" docs/concept/` afterwards shows NO
live/reverify/captureMode hits; list the survivors (freshness, AL2, self-test,
recovery-none, legends) in the report. Five gates. Commit (Bash):

```bash
git add docs/concept/SPEC.md docs/concept/CONTROLS.md docs/concept/OPEN-QUESTIONS.md
git commit -m "Move the live-mode marker and record OQ 7 decided: four tokens, two tails, one clause

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: The record — the tail's second landing

**Files:** `docs/process/implementation-status.md`,
`docs/process/deferral-register.md` (row 17 AMENDED in place),
`CLAUDE.md`, `README.md`, stale comments the sweep finds.

- [ ] **Step 1: implementation-status.md**

Step 8 row: second tail item landed (live capture + `reverify`, the live-capture
increment); the remaining tail = AL2 signing + self-test tier. §9.2 row → live
PROVEN: the construction rules, the two OQ §7 decisions, the enlisted result-first
ruling, the never-verifies-path-independence limit (the operator-assurance probe named).
§8's `content-drift` row: the second producer real — the redemption family's reverify
mapping, appended UNCONDITIONALLY there (`terminalRefusals` is finalize's machinery,
not consulted at redemption — the distinction drawn). The governed count 2 → 1 WITH
movement and every "two … remain governed"-class tail amended (lesson 15);
`freshness` named as the last, AL2-dependent by the vacuity argument. The sealed-set
edit recorded (four tokens, two tails, one clause).

- [ ] **Step 2: register + CLAUDE.md + README**

Register row 17: amend in place — live capture/`reverify` landed at the live-capture
increment; the row now defers AL2 signing (OQ §1) + the self-test tier (OQ §5), order
preserved. CLAUDE.md: the governed narrative gains "two down to one"; the "Four
fields are governed today" lineage sentence ends at one (`freshness`); step 8's cell.
README: same movement.

- [ ] **Step 3: The sweep — LAST, against the committed tree**

```bash
git grep -nE 'captureMode|live capture|reverify|effect-mismatch|content-drift|two per-leg|remain governed|not implemented in this build|only staged capture|this increment|later increment|landing|will make|not yet' -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
git grep -nE 'SKETCHED|down to (two|2|one|1)|where it stands today|have none|no producer|nothing mints|still absent|cannot construct' -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis' -- '*.md'
```

(Single-quoted; the second markdown-scoped — lessons 15/21.) Judge EVERY hit;
HIT-COUNT == VERDICT-COUNT from THIS run.

- [ ] **Step 4: Verify quotes, gates, commit**

Quotes hand-verified whitespace-collapsed. Five gates. Commit (Bash):

```bash
git add -A
git commit -m "Record the tail's second landing: live capture whole, one guard remains

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Exit verification

**Files:** none modified (BLOCKED with evidence on any failure).

- [ ] **Step 1: Clean-tree gates** — porcelain empty, branch `main`, ALL FIVE gates by
  name with exit codes and exact counts (zero skips).

- [ ] **Step 2: Freeze verification (against the spec commit 5311128)**

```bash
git diff 5311128..HEAD -- packages/record/test/byte-stability.test.ts   # MUST be empty
git diff 5311128..HEAD -- packages/record/src/chain/encoding.ts          # MUST be empty
git diff 5311128..HEAD -- packages/record/src/store/                     # MUST be empty
git diff 5311128..HEAD -- docs/concept/                                  # EXACTLY: 4 token pairs (one carrying the sanctioned clause) + the OQ §7 additions
```

Any other content ⇒ BLOCKED with the diff stat.

- [ ] **Step 3: Report** — commit list (`git log --oneline 5311128..HEAD`), exact
  counts, register rows live (row 17's amended text quoted), the step-8 cell, a
  zero-line for `grep -rn "SKETCHED" docs/concept/ | grep -ci "live\|reverify\|captureMode"`,
  and `git status -sb`'s ahead count for the user-gated push.
