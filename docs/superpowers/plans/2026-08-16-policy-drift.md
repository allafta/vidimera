# Policy Drift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land SPEC §10.3 whole — the open-time binding, the finalize presence contract,
rung (4.5) with `policy-drift` (twentieth code) and the availability outcome's second
producer, and the FAIL-CLOSE decision of §10.3's named open question — and record
**step 6's exit** as the second and last step-6 increment.

**Architecture:** `policy-drift` lands inert first. Then ONE commit carries all three
seam obligations together — the `policySource` lift + structural rule, `open()`'s
binding contract + genesis key, `finalize()`'s intake shape check + resolution-depth
presence contract + rung (4.5) including the fail-close arm — plus the ladder/header
recounts the rung breaks. The record exits step 6.

**Tech Stack:** TypeScript strict (pnpm workspace, Node >=22.16), vitest, Biome. No new
runtime APIs — the floor does not move.

**Spec:** `docs/superpowers/specs/2026-08-16-policy-drift-design.md` — read it before
your task; its "Rulings taken" section is binding, and its §3/§4 code blocks are
transcribed verbatim.

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
- **Counts stated with the movement named** (governed 5 → 4; codes 19 → 20).
- **Enlisted-branch check, visibly run**: `finalize()` and `open()` take no `tx` —
  nothing to decide.
- The record task: the EIGHTH-inversion boundary paragraph; superseded count tails
  amended; the sweep runs LAST against the committed tree.
- Narrow runs: `pnpm exec vitest run packages/record/test/<file>.test.ts` from repo
  root.

---

### Task 1: The twentieth code (inert)

**Files:**
- Modify: `packages/record/src/refusal-codes.ts` (union + REGISTRY — default `appendsOn`
  path)
- Modify: `packages/record/test/outcome-model.test.ts` and
  `packages/record/test/refusal-matrix.test.ts` (count pins 19→20; the `policy-drift`
  section)

**Interfaces:**
- Produces: `'policy-drift'` in `RefusalCode`, class `'refusal'`.

- [ ] **Step 1: Write the failing tests**

Bump the two count pins 19 → 20 ("nineteen" → "twenty"; the matrix arithmetic — read
both files first, match on content). Add the `policy-drift` matrix section
(`content-drift`-shape: refusal-class, `terminalRefusals`-able), quoting §8's row —
"`refusal`-class, `terminalRefusals`-able — a policy-declaring profile SHOULD list it
(disposal-and-re-open recovery)" — with the note that the SHOULD is recorded guidance,
never a construction rule; producer worded two-touch (finalize's policy rung, landing
later in the second step-6 increment). Do NOT touch the availability section's §10.3
future-tense half in this task — the NEXT task's producer finalizes it.

- [ ] **Step 2: Run to verify failure — EXECUTE it**

Run: `pnpm exec vitest run packages/record/test/outcome-model.test.ts packages/record/test/refusal-matrix.test.ts`
Expected: FAIL — the union has 19 members. Capture output.

- [ ] **Step 3: Implement**

`refusal-codes.ts`: `| 'policy-drift'` joins the union with its comment (§8's row quoted
as above; recovery is disposal + re-open, mirroring `content-drift`; producer
two-touch); `'policy-drift': 'refusal'` in `REGISTRY`. `NEVER_APPENDS` untouched.

- [ ] **Step 4: Run tests, gates, commit**

Run the two named files (PASS), `pnpm test` (PASS), all five gates. Commit (Bash tool):

```bash
git add packages/record/src/refusal-codes.ts packages/record/test/outcome-model.test.ts packages/record/test/refusal-matrix.test.ts
git commit -m "The twentieth code: policy-drift, a bound-vs-reality mismatch with no in-place recovery

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: All three seams, in one commit

**Files:**
- Modify: `packages/record/src/config.ts` (guard delete; `policySource: ''` structural;
  `OpenOptions.policyDigest`; `PolicyInput` + `FinalizeOptions.policy`)
- Modify: `packages/record/src/kernel/consultations.ts` (`validatePolicyInput` — the
  intake shape check, beside `validateConsultations`)
- Modify: `packages/record/src/kernel/open.ts` (`openOptionMessage` arm removal; the
  opts loop; the binding contract; the genesis key)
- Modify: `packages/record/src/kernel/finalize.ts` (intake shape call;
  `finalizeOptionMessage` policy-arm retirement; the presence contract; rung (4.5); the
  ladder header)
- Modify: `packages/record/src/outcome.ts` + `packages/record/src/refusal-codes.ts` +
  `packages/record/test/refusal-matrix.test.ts` (availability's §10.3-producer wording
  finalizes; Task 1's policy-drift two-touch finalizes)
- Modify: `packages/record/test/finalize-check-order.test.ts` (the header: rung count,
  the broken (4)->(5) adjacency, the order-pair corpus RECOUNT with method shown)
- Modify: `packages/record/test/construction-validation.test.ts` (the inversion + the
  structural pin)
- Test: `packages/record/test/policy-drift.test.ts` (NEW — the seam pins; the file owns
  §10.3's pins)

**Interfaces:**
- Consumes: Task 1's `'policy-drift'`; `unavailable(authority)`; `refuseMaybeAppend`;
  the helpers (`captureProfile`, `openRecord`, `identity`, `facts`, `obtained` is NOT
  needed here — build policy fixtures directly).
- Produces:

```ts
// config.ts
export type PolicyInput = { digest: Digest } | { unreachable: true; authority: string };
// OpenOptions gains policyDigest?: Digest; FinalizeOptions gains policy?: PolicyInput

// kernel/consultations.ts
export function validatePolicyInput(policy: PolicyInput | undefined): void; // THROWS on malformed shape
```

**All in ONE commit** — a declaring profile must never be constructible while any of
its three obligations (construction validity, open-time binding, finalize-time gate) is
missing.

- [ ] **Step 1: Write the failing tests**

In `construction-validation.test.ts`, REPLACE the GOVERNED `policySource` pin (locate by
title) with:

```ts
test('policySource is accepted at construction — the notarization contract is built end to end', () => {
  // INVERTED, at the second step-6 increment (the EIGHTH self-authored inversion): the
  // kernel increment pinned a GOVERNED throw here while nothing bound or compared a
  // policy digest. The open() binding contract, the finalize presence contract, and
  // rung (4.5) land in the same commit as this lift, so the guard's stated trigger has
  // fired for the whole three-seam obligation.
  const p = captureProfile();
  assert.doesNotThrow(() => create(makeConfig([{ ...p, policySource: 'rules.v1' }])));
});

test('structural: an empty policySource label throws — the malformed-reference rule', () => {
  const p = captureProfile();
  assertStructural({ ...p, policySource: '' }, /empty/i);
});
```

Create `packages/record/test/policy-drift.test.ts`:

```ts
// @vidimera/record — policy-drift.test.ts (SPEC §10.3 "Policy-drift notarization"):
// the second step-6 increment's file — the open() binding contract, the finalize
// presence contract, rung (4.5)'s comparisons, both cross-instance corners including
// THE DECIDED OPEN QUESTION (fail-close), and the availability outcome's second
// producer. The library notarizes the policy version; it never evaluates policy.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  DEFAULT_SUBJECT_REF,
  captureProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const BOUND = `sha256:${'p'.repeat(64)}`;
const LIVE_SAME = BOUND;
const LIVE_DRIFTED = `sha256:${'q'.repeat(64)}`;

function policyProfile(extra?: Partial<ConfirmProfile>): ConfirmProfile {
  return { ...captureProfile({ id: 'test.policy.v1' }), policySource: 'rules.v1', ...extra };
}

/** Stages+opens a policy-bound record; returns handles + recordId. */
async function openBound(store: MemoryStore, profile = policyProfile()) {
  const handles = create(makeConfig([profile], { store }));
  const staged = await handles.agent.stage(CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') throw new Error('fixture: stage must succeed');
  const opened = await handles.operator.open(staged.value.stagedRef, { policyDigest: BOUND });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') throw new Error('fixture: open must succeed');
  return { handles, recordId: opened.value.recordId };
}

test('open() binds the digest into the genesis, present-iff-declared, and replay folds it', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openBound(store);
  const chain = await store.readChain(recordId);
  const genesis = chain[0];
  assert.ok(genesis !== undefined);
  assert.deepEqual(Object.keys(genesis.payload as object).sort(), [
    'contentDigest',
    'legId',
    'policyDigest',
    'profileDigest',
    'profileId',
    'subjectRef',
  ]);
  assert.equal((genesis.payload as { policyDigest: string }).policyDigest, BOUND);
  const rec = await handles.operator.getRecord(recordId);
  assert.equal(rec?.policyDigest, BOUND);
});

test('the binding contract is loud both directions: declared-without-digest, declared-with-empty, undeclared-with-digest all THROW at open()', async () => {
  const store = new MemoryStore();
  const declaring = create(makeConfig([policyProfile()], { store }));
  const staged = await declaring.agent.stage(CONTENT, 'test.policy.v1', DEFAULT_SUBJECT_REF);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  await assert.rejects(declaring.operator.open(staged.value.stagedRef), /policyDigest/i);
  await assert.rejects(
    declaring.operator.open(staged.value.stagedRef, { policyDigest: '' }),
    /policyDigest/i,
  );

  const plain = create(makeConfig([captureProfile()], { store: new MemoryStore() }));
  const staged2 = await plain.agent.stage(CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  assert.equal(staged2.status, 'ok');
  if (staged2.status !== 'ok') return;
  await assert.rejects(
    plain.operator.open(staged2.value.stagedRef, { policyDigest: BOUND }),
    /policySource/i,
  );
});

test('a non-declaring genesis key set is unchanged — the byte proof', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const genesis = (await store.readChain(recordId))[0];
  assert.ok(genesis !== undefined);
  assert.deepEqual(Object.keys(genesis.payload as object).sort(), [
    'contentDigest',
    'legId',
    'profileDigest',
    'profileId',
    'subjectRef',
  ]);
});

test('the presence contract: declaring-without-policy THROWS at finalize; non-declaring-with-policy THROWS unconditionally', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openBound(store);
  await assert.rejects(
    handles.operator.finalize(recordId, identity(), CONTENT, facts()),
    /opts\.policy/i,
  );

  const plainStore = new MemoryStore();
  const plain = create(makeConfig([captureProfile()], { store: plainStore }));
  const plainId = await openRecord(plain, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  await assert.rejects(
    plain.operator.finalize(plainId, identity(), CONTENT, facts(), {
      policy: { digest: LIVE_SAME },
    }),
    /policySource/i,
  );
});

test('malformed policy shapes THROW at argument intake, before the chain loads', async () => {
  const store = new MemoryStore();
  const { handles } = await openBound(store);
  const bad = [
    {},
    { digest: '' },
    { unreachable: true, authority: '' },
    { digest: LIVE_SAME, unreachable: true, authority: 'svc:x' },
    { digest: LIVE_SAME, extra: 1 },
    { unreachable: false, authority: 'svc:x' },
  ];
  for (const policy of bad) {
    await assert.rejects(
      handles.operator.finalize('rec-none', identity(), CONTENT, facts(), {
        policy,
      } as never),
      /policy/i,
    );
  }
});

test('rung (4.5): a matching live digest confirms; a drifted one refuses policy-drift, open by default', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openBound(store);
  const drifted = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    policy: { digest: LIVE_DRIFTED },
  });
  assert.equal(drifted.status, 'refused');
  if (drifted.status !== 'refused') return;
  assert.equal(drifted.code, 'policy-drift');
  assert.equal(drifted.transitionRef, undefined, 'default path: no appended edge');
  assert.equal((await store.readChain(recordId)).length, 1, 'the record stays open');

  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    policy: { digest: LIVE_SAME },
  });
  assert.equal(done.status, 'ok');
});

test('terminalRefusals may end the leg on policy-drift: the disposal-and-re-open flow, first half', async () => {
  const store = new MemoryStore();
  const profile = policyProfile();
  const leg = profile.legs[0];
  assert.ok(leg !== undefined);
  profile.legs[0] = { ...leg, terminalRefusals: ['policy-drift'] };
  const { handles, recordId } = await openBound(store, profile);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    policy: { digest: LIVE_DRIFTED },
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'policy-drift');
  assert.ok(out.transitionRef !== undefined);
  const last = (await store.readChain(recordId)).at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'refused');
  assert.deepEqual(Object.keys(last.payload as object), ['code']);
  assert.equal(await store.findNonTerminal('test.policy.v1', DEFAULT_SUBJECT_REF), null, 'the pair releases for re-open');
});

test('THE AVAILABILITY PIN, second producer: an unreachable source is the transient case that retries the SAME record', async () => {
  // SPEC §10.3: an { unreachable, authority } marker yields the availability outcome —
  // "bounded retry, never fail-open, never approval" — a DIFFERENT code from
  // policy-drift precisely because this one legitimately retries the same open record.
  const store = new MemoryStore();
  const { handles, recordId } = await openBound(store);
  const down = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    policy: { unreachable: true, authority: 'svc:rules-engine' },
  });
  assert.deepEqual(down, {
    status: 'unavailable',
    code: 'availability',
    authority: 'svc:rules-engine',
  });
  assert.equal((await store.readChain(recordId)).length, 1, 'nothing appended, ever');

  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    policy: { digest: LIVE_SAME },
  });
  assert.equal(done.status, 'ok', 'the re-armed seam accepts the recovered source');
});

test('order: (4) content-drift outranks (4.5) — a drifted draft refuses content-drift even under a drifted policy', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openBound(store);
  const out = await handles.operator.finalize(
    recordId,
    identity(),
    { subject: 'week-1', total: 999 },
    facts(),
    { policy: { digest: LIVE_DRIFTED } },
  );
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'content-drift');
});

test('order: (4.5) outranks (5.5) — deciding under the wrong policy version moots the evidence', async () => {
  const store = new MemoryStore();
  const profile = policyProfile();
  const leg = profile.legs[0];
  assert.ok(leg !== undefined);
  profile.legs[0] = { ...leg, requiredConsultations: ['risk-check'] };
  const { handles, recordId } = await openBound(store, profile);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    policy: { digest: LIVE_DRIFTED },
    // risk-check deliberately missing — were (5.5) first this would say consultation-missing
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'policy-drift');
});

test('the depth pin: a tampered declaring-profile chain refuses chain-compromise BEFORE the absent-policy throw', async () => {
  // SPEC §10.3: the presence throws sit "both at profile resolution — so a tampered
  // chain still refuses `chain-compromise` first". Fixture: confirm the record once so
  // the chain has non-last transitions to tamper (tamperNonLast needs >= 2), then
  // re-finalize through a TamperingStore with NO opts.policy — the tampered read must
  // refuse at rung (1), never reach the presence contract's throw.
  const store = new MemoryStore();
  const { handles, recordId } = await openBound(store);
  const good = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    policy: { digest: LIVE_SAME },
  });
  assert.equal(good.status, 'ok', 'fixture: confirm to grow the chain');
  const tampering = new TamperingStore(store, recordId, tamperNonLast);
  const viaTampered = create(makeConfig([policyProfile()], { store: tampering }));
  const out = await viaTampered.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise', 'no throw — rung (1) wins over the presence contract');
});
```

(`TamperingStore` joins the top-of-file imports from `./helpers/stores.js` and
`tamperNonLast` from `./helpers/profiles.js` — top-level imports, the file convention;
no dynamic `await import`.)

test('the forward cross-instance corner: a live digest against an absent bound one refuses policy-drift, fail-closed', async () => {
  // §10.3: a record opened under a NON-declaring same-id instance, finalized under a
  // declaring one — "the gate treats a present live digest against an absent bound one
  // as a mismatch".
  const store = new MemoryStore();
  const nonDeclaring = create(
    makeConfig([{ ...captureProfile({ id: 'test.policy.v1' }) }], { store }),
  );
  const recordId = await openRecord(nonDeclaring, CONTENT, 'test.policy.v1', DEFAULT_SUBJECT_REF);
  const declaring = create(makeConfig([policyProfile()], { store }));
  const out = await declaring.operator.finalize(recordId, identity(), CONTENT, facts(), {
    policy: { digest: LIVE_SAME },
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'policy-drift');
});

test('THE DECIDED OPEN QUESTION: a bound record under a non-declaring instance refuses policy-drift — fail-close, as ruled', async () => {
  // §10.3 names this direction an open decision ("the recommendation on record is
  // fail-close") and this build takes it: the gate does NOT skip. opts.policy is
  // absent here — legal on a non-declaring profile — so the refusal comes from rung
  // (4.5)'s fail-close arm, not the presence contract.
  const store = new MemoryStore();
  const { recordId } = await openBound(store);
  const nonDeclaring = create(
    makeConfig([{ ...captureProfile({ id: 'test.policy.v1' }) }], { store }),
  );
  const out = await nonDeclaring.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'policy-drift');
  assert.equal((await store.readChain(recordId)).length, 1, 'default path: no append');
});
```

- [ ] **Step 2: Run to verify failure — EXECUTE it**

Run: `pnpm exec vitest run packages/record/test/policy-drift.test.ts packages/record/test/construction-validation.test.ts`
Expected: the inversion pin FAILS (guard throws); every seam pin FAILS at `create()`
(GOVERNED policySource) or at `open()` (the policyDigest key still throws). Capture
output.

- [ ] **Step 3: Implement**

1. `config.ts`: delete the `policySource` GOVERNED block; add the empty-label
   structural check beside it (`profile.policySource !== undefined &&
   profile.policySource.length === 0` ⇒ throw, message naming the malformed-reference
   rule and SPEC §10.3); add `PolicyInput` and the two options-bag keys (the spec's §3
   `OpenOptions` block and §4 `FinalizeOptions` block verbatim, doc comments included);
   the validateProfile doc-comment list updates (the policySource item moves from
   GOVERNED to structural; governed count wording).
2. `kernel/consultations.ts`: add `validatePolicyInput` (exact-shape: `{ digest }` with
   non-empty string XOR `{ unreachable: true, authority }` with non-empty authority; no
   unknown keys; both-shapes/neither-shape/empty throw with messages containing
   "policy"), exported beside `validateConsultations`, with a §10.3 header sentence.
3. `kernel/open.ts`: `openOptionMessage` loses the `policyDigest` arm and its fallback
   rewords ("accepts only priorRecordRefs and policyDigest in this build");
   the opts loop skips both real keys; the binding contract (the spec's §3 block
   VERBATIM) after profile resolution; the genesis payload literal's type gains
   `policyDigest?: string` and the conditional assignment (the spec's §3 snippet); the
   stale "policyDigest: omitted — no policySource in this build" comment retires.
4. `kernel/finalize.ts`: `validatePolicyInput(opts?.policy)` joins the intake block
   (after `validateConsultations`); `finalizeOptionMessage`'s `policy` arm retires and
   the fallback rewords ("accepts only consultations and policy in this build"); the
   presence contract (the spec's §4 block VERBATIM — the non-declaring throw
   UNCONDITIONAL) placed immediately after the `finalLeg` computation; rung (4.5) (the
   spec's §4 block VERBATIM — the fail-close arm FIRST, then the declaring branch)
   between rung (4) and rung (5); the file-header ladder and rung descriptions gain
   (4.5); the refusal-class summary gains `policy-drift`.
5. `finalize-check-order.test.ts` header: the rung count moves; the (4)->(5) pair
   relabels adjacent-but-for-(4.5) naming `policy-drift.test.ts` as the new pairs' home
   ((4)->(4.5) and (4.5)->(5.5) live there); the corpus total RECOUNTS by enumeration
   with the method shown.
6. Two-touch finalizations: `outcome.ts`'s variant doc (§10.3's second producer REAL —
   both producers now), `refusal-codes.ts`'s availability + policy-drift producer
   comments, and the matrix's availability-section §10.3 half go present-tense. Nothing
   may still say the §10.3 gate is future.

- [ ] **Step 4: Run tests, gates, commit**

Run the two named files, then `pnpm test` (zero skips), all five gates. Commit (Bash):

```bash
git add -A packages/record
git commit -m "Lift policySource with all three obligations: bind at open, attest at finalize, compare at 4.5

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: The record — step 6 exits

**Files:**
- Modify: `docs/process/implementation-status.md`
- Modify: `CLAUDE.md`, `README.md`
- Modify: stale comments the sweep finds
- No register edits expected (verify by READING `docs/process/deferral-register.md`)

**Interfaces:** consumes Tasks 1-2; the spec's §7 ("The record — step 6 exits") is the
checklist — verify every claim against CODE, never task reports.

- [ ] **Step 1: implementation-status.md**

Per the spec's §7, matching on content: steps table → step 6 **Exited** (both
increments named); step 7 (findings & acknowledgments, SPEC §10.2 — where the FIRST
draft-ahead maturity marker, §10.2's [DESIGNED], could finally move) named next. §10.3
row: WHOLE — the binding contract both directions, the presence asymmetry argued, rung
(4.5), BOTH cross-instance corners with THE DECIDED OPEN QUESTION recorded (fail-close,
the recommendation on record, the sealed set untouched, the cost stated), the
head-bound window beside the guarantee, the SHOULD guidance, record-level multi-leg
binding. §8 row: twenty codes; availability's TWO producers real. §9 row: (4.5) real;
`open()` at two real keys (`supersedes` alone guarded). Governed 5 → 4 with movement;
**the EIGHTH-inversion boundary paragraph appended and every superseded count tail
("down to five, where it stands today") amended forward-pointer style** — the standing
checklist.

- [ ] **Step 2: CLAUDE.md + README.md**

CLAUDE.md: step 6 exited (two increments); four governed fields with movement; verify
"two of the eight build-order steps remain unstarted" SURVIVES (started→exited — verify
and keep). README: same; step 7 named next.

- [ ] **Step 3: The sweep — LAST, against the committed tree**

Only after every other edit in this task is final:

```bash
git grep -nE "policy-drift|policySource|policyDigest|opts\.policy|second step-6|step 7|five governed|four governed|landing later|this increment|later increment" -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
git grep -nE "\(4\.5\)|order-pair|nineteen|twenty|down to five|where it stands today|no policySource in this build|policyDigest: omitted|future second producer|§10\.3.*later|a later build step" -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
```

Judge EVERY hit: still-true / fixed-by-earlier-tasks / fix-now / historical-leave-alone.
THE REPORT MUST SHOW HIT-COUNT == VERDICT-COUNT, the counts derived from THIS run at
the final tree. END-OF-INCREMENT OWN-COMMENT PASS:
`git diff 7ce3be4..HEAD -- packages | grep -nE "landing later|later in the second step-6"`
— judge every hit.

- [ ] **Step 4: Verify quotes, gates, commit**

Hand-verify every quoted SPEC phrase in touched markdown whitespace-collapsed. All five
gates. Commit (Bash):

```bash
git add -A
git commit -m "Record step 6's exit: notarized versions, both corners closed, the open question answered

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
git diff 7ce3be4..HEAD -- packages/record/test/byte-stability.test.ts   # MUST be empty
git diff 7ce3be4..HEAD -- packages/record/src/chain/encoding.ts          # MUST be empty
git diff 7ce3be4..HEAD -- packages/record/src/store/                     # MUST be empty
```

Any non-empty result ⇒ BLOCKED with the diff stat.

- [ ] **Step 3: Report**

The increment's commit list (`git log --oneline 7ce3be4..HEAD` — 7ce3be4 is the spec
commit), exact counts, register rows live (read the file), step-6-Exited confirmation
(read the steps table), and `git status -sb`'s ahead count for the user-gated push.
