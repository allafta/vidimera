# Recorded Human Decline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the recorded-human-decline increment — a GOVERNED, per-leg `decline` verb giving the human "no" the same evidentiary treatment as confirm: `declined { actor }` terminal state, mandatory facts binding, authority rungs gating, evidence rungs skipped, zero new refusal codes.

**Architecture:** A new operator-only seam `kernel/decline.ts` mirroring finalize's ladder with the evidence rungs absent, wired through `Kernel`/`OperatorSurface`; one new `TransitionKind`/`RecordState` (`declined`) forced through `semantics.ts` (compile) and `chain/replay.ts` (runtime); helpers (`refuseMaybeAppend`, `isValidFacts`, `Facts`, an extracted `sodViolated`) exported from `kernel/finalize.ts` so the two ladders share their subtle pieces instead of drifting.

**Tech Stack:** TypeScript (NodeNext, strict), vitest 4, the existing test helpers (`test/helpers/profiles.ts`).

**Spec:** `docs/superpowers/specs/2026-08-20-recorded-human-decline-design.md`

## Global Constraints

- **THE SANCTION GATE:** Tasks 1 and 10 edit `docs/concept/` (SPEC §§2, 4, 9, 9.1, 10.1; CONTROLS §§3, 5; GLOSSARY — exactly the design doc's §8 scope, nothing else). They are executable ONLY under the maintainer's explicitly granted fresh sanction for this increment, recorded in the conversation or commit message. If the grant is not on record, STOP before Task 1.
- `packages/record/test/byte-stability.test.ts` is FROZEN — asserted green at every task, never edited. A red run there is a finding to adjudicate, never a pin update.
- Zero new refusal codes — the registry stays at 24 (`refusal-codes.ts` untouched). A task that seems to need one is a design violation: STOP and report.
- Node floor `>=22.16`; ESM only (NodeNext `.js` specifiers); `@vidimera/record` keeps zero runtime dependencies.
- `node scripts/contract-scan.mjs` before every commit (markdown and TypeScript both move in this plan; new `.ts` files are citation-scanned: `SPEC §N` must name a real section, quoted phrases must occur in the cited doc).
- Every gate at every commit: `./node_modules/.bin/vitest run` (zero skips), typecheck, lint:strict, build; `pnpm smoke`-equivalent at Task 9 (the surface moves).
- Local runner note: use `./node_modules/.bin/vitest`, `./node_modules/.bin/tsc`, `./node_modules/.bin/biome` directly — the global pnpm shim is broken on this machine (`node scripts/<name>.mjs` for repo scripts).
- Guide files move in the same commit as the public-surface change (PR-template rule) — Task 9.
- Commit messages via `git commit -F <file>` (a here-string `'@'` once leaked into a subject on this machine). Verify `git status` shows the branch attached before each commit. Never push.

---

### Task 1: The sanctioned sealed-set text lands `[DESIGNED]`, and the design doc's signature is corrected

**Files:**
- Modify: `docs/concept/SPEC.md` (§2 two sentences, §4 one row, §9 one block, §9.1 one row, §10.1 one sentence)
- Modify: `docs/concept/CONTROLS.md` (§3 one row, §5 one row)
- Modify: `docs/concept/GLOSSARY.md` (one entry)
- Modify: `docs/superpowers/specs/2026-08-20-recorded-human-decline-design.md` (signature order fix)

**Interfaces:**
- Produces: the normative text every later task's code comments cite. The `[DESIGNED]` markers come off in Task 10, at exit, per spec-moves-to-truth.

- [ ] **Step 1: Confirm the sanction grant is on record.** If the maintainer has not explicitly granted the sanction for this increment's §8 scope, STOP.

- [ ] **Step 2: Fix the design doc's seam signature** (it predates reading finalize's real order). In `docs/superpowers/specs/2026-08-20-recorded-human-decline-design.md`, replace the `decline(` signature block's parameter order so it reads `recordId`, `content` → `identity`, `content` swapped — the corrected block:

```ts
decline(
  recordId: string,
  identity: IdentityAssertion,
  content: unknown,
  facts: { figures: unknown; checker: IdentityAssertion },
  opts?: { consultations?: /* FinalizeOptions.consultations' exact shape, shared intake */ },
): Promise<Outcome<{ recordId: string; state: 'declined'; transitionRef: Digest }>>
```

Add one line beneath it: `Parameter order mirrors finalize's (recordId, identity, content, facts, opts?) exactly — corrected at plan time against the real seam.`

- [ ] **Step 3: SPEC §2 — states and terminality.** Read the whole "States and terminality" block first. Two surgical edits:
  - The sentence reading `` `refused` and `expired` are terminal. `` becomes `` `refused`, `expired`, and `declined` **[DESIGNED]** are terminal. ``
  - The recovery sentence fragment `` (a `refused` or `expired` record, or an earlier superseded attempt) `` becomes `` (a `refused`, `expired`, or `declined` record, or an earlier superseded attempt) ``
  - After the terminality-formula prose, add one sentence: `` `declined` — the recorded human decline (§9's `decline`) — is terminal under every leg/effect-seam combination. **[DESIGNED]** ``

- [ ] **Step 4: SPEC §4 — the payload table.** Immediately after the row `` | `refused` | `{ code }` — a §8 registry code; class derivable from the registry | delta | `` insert:

```markdown
| `declined` | `{ actor }` — the deciding IdentityAssertion (§6); the recorded human decline (§9) **[DESIGNED]** | delta |
```

- [ ] **Step 5: SPEC §9 — the surface.** After the finalize call's own block (read the section; the decline block sits beside finalize's, same depth), insert:

```markdown
**`decline(recordId, identity, content, facts, opts?)` [DESIGNED]** — the operator-only
`open → declined` seam: the recorded human "no", with the same evidentiary treatment as
confirm. It runs finalize's ladder with the evidence rungs absent — chain-verify,
state/expiry, identity + `allowedAuthorities`, separation of duties, content-drift, the
reviewed-surface (`facts`) binding, and eligibility (including its AL2 freshness bound)
all gate; `requiredConsultations`, evidence-kind freshness, and ack coverage (§10.2) do
not — a "no" is never blockable by a missing or dead evidence source. It takes no policy
input and rung (4.5) does not run: the policy gate exists to prevent approving under
stale rules; a decline disposes the record either way, and the bound `policyDigest`
stays on the record as the context the decline was made under. The success batch is
`[chain-verify, facts, …obtained consultations, declined]` — one atomic append; reasons
ride as ordinary consultations (§11.1's attach form; e.g. a host `decline-reason` kind),
never as payload fields. Declared per leg (`decline: true`, §9.1); calling the seam on a
non-declaring leg throws (the §10.2 seams' posture), so non-declaring chains stay
byte-identical. A declined record proves the named actor declined this exact content
having seen this surface — never that the decline was justified (fidelity, not
validity). Every refusal reuses an existing §8 code through the `terminalRefusals` rule;
the registry does not grow.
```

- [ ] **Step 6: SPEC §9.1 — the LegSpec table.** After the `eligibility` row (read the table for exact column shape), insert a row:

```markdown
| `decline` | Per-leg literal `true` switching on §9's `decline` seam **[DESIGNED]**; declaring anything other than the literal `true` is a construction error (the `signing` rule's class) | — |
```

Match the actual column count of the table as read — fold the description to fit its columns.

- [ ] **Step 7: SPEC §10.1 — SoD covers declines.** After the sentence `` **the designated proposer may not decide their own leg.** `` add: `` Both SoD rules gate `decline` (§9) identically — deciding includes declining; a proposer therefore cannot withdraw their own draft through this seam. **[DESIGNED]** ``

- [ ] **Step 8: CONTROLS.md.** §3 table, after the eligibility row, matching its exact columns:

```markdown
| Recorded human decline | `decline` (per leg) | §9's `open → declined` seam: the human "no" with confirm's evidentiary treatment — facts binding, authority rungs, atomic batch | DESIGNED | Proves who declined what they saw; never that the decline was sound; a "no" never routed to the seam does not exist |
```

§5 domain-instance table, after the Recorded refusals row:

```markdown
| Recorded human decline *(GOVERNED)* | rejected trade ticket | declined order with reason | denied application by named reviewer | rejected requisition with rework note |
```

- [ ] **Step 9: GLOSSARY.md.** Beside the Confirm entry's style:

```markdown
**Decline** — the recorded human "no": the operator-only `open → declined` seam giving a
rejection the same bindings as a confirmation (SPEC §9). **[DESIGNED]**
```

- [ ] **Step 10: Scan and commit.** Run `node scripts/contract-scan.mjs` (must exit 0, silent). Hand-grep the diff for external project names (must be none). Commit with `-F`: subject `Recorded human decline, sanctioned sealed-set text lands [DESIGNED]: SPEC/CONTROLS/GLOSSARY per the design doc's §8 scope` + body naming the sanction grant + the Co-Authored-By trailer.

### Task 2: The `declined` kind and state, wired through the compile- and runtime-forced touchpoints

**Files:**
- Modify: `packages/record/src/types.ts` (two unions + comments)
- Modify: `packages/record/src/store/semantics.ts` (one `stateOf` case)
- Modify: `packages/record/src/chain/replay.ts` (one fold case)
- Modify: `packages/record/src/nonterminal.ts` (doc comment only)
- Test: `packages/record/test/decline.test.ts` (new file, first tests)

**Interfaces:**
- Produces: `TransitionKind`/`RecordState` gain `'declined'`; `stateOf('declined') === 'declined'`; `replay` folds `declined { actor }` as `record.actor` + `record.state = 'declined'`. Every later task relies on these.

- [ ] **Step 1: Write the failing test** — create `packages/record/test/decline.test.ts`:

```ts
// @vidimera/record — decline.test.ts: the recorded-human-decline increment (SPEC §9's
// decline seam). This file owns the kind/state wiring pins, the construction pins, the
// seam's ladder pins, and the interaction pins.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { isStateLeaving, stateOf } from '../src/store/semantics.js';

test('stateOf: declined maps to the declined state and is state-leaving', () => {
  assert.equal(stateOf('declined'), 'declined');
  assert.equal(isStateLeaving('declined'), true);
});
```

- [ ] **Step 2: Run to verify it fails.** `./node_modules/.bin/vitest run packages/record/test/decline.test.ts` — expected: TypeScript rejects `'declined'` (not in `TransitionKind`).

- [ ] **Step 3: Implement.**
  - `types.ts` `RecordState`: after `| 'expired'` add `| 'declined'`. Extend the trailing comment: the last-three note stays; add `// 'declined': the recorded human decline (SPEC §9's decline seam) — terminal always`.
  - `types.ts` `TransitionKind`: after `| 'expired'` add `| 'declined'`, and extend the "every kind in the union above is a real producer" comment to name `declined` (producer: `kernel/decline.ts`, this increment).
  - `semantics.ts` `stateOf`: after the `case 'expired'` arm add `case 'declined': return 'declined';` (the exhaustive no-default switch was failing compile until this line — that is the designed forcing). Update the module comment's kind-count if it names one.
  - `chain/replay.ts`: after the `case 'expired'` arm add (reusing the local `ConfirmedPayload` reading convention — the `declined` payload is the identical `{ actor }` shape):

```ts
      case 'declined': {
        // SPEC §4's `declined` payload is `{ actor }` — the same shape as `confirmed`'s,
        // deliberately (the decline mirrors the confirm; SPEC §9's decline seam).
        const payload = transition.payload as ConfirmedPayload;
        record.actor = payload.actor;
        record.state = 'declined';
        break;
      }
```

  - `nonterminal.ts`: doc comment's "every other `RecordState`" list gains `declined` (the formula itself is untouched — `declined` matches no disjunct, so it is terminal by derivation).

- [ ] **Step 4: Run the full suite.** `./node_modules/.bin/vitest run` — expected: all green including the frozen byte-stability oracle (the encoding is kind-agnostic; nothing moved). Typecheck green.

- [ ] **Step 5: Commit** (`-F` file): `Recorded human decline 1/9: the declined kind and state, compile- and runtime-forced through semantics and replay`.

### Task 3: Construction — `LegSpec.decline?: true`, literal-true guarded, and the test-helper override

**Files:**
- Modify: `packages/record/src/config.ts` (`LegSpec` + one guard in `validateProfile`'s per-leg loop)
- Modify: `packages/record/test/helpers/profiles.ts` (`ProfileOverrides.decline` + `buildLeg`)
- Test: `packages/record/test/decline.test.ts`

**Interfaces:**
- Produces: `LegSpec.decline?: true`; `captureProfile({ decline: true })` et al. build a declaring leg. Consumed by every seam test from Task 5 on.

- [ ] **Step 1: Write the failing tests** (append to `decline.test.ts`):

```ts
import { create } from '../src/create.js';
import { captureProfile, makeConfig } from './helpers/profiles.js';

test('construction: decline must be the literal true when declared — the signing rule class', () => {
  const profile = captureProfile();
  (profile.legs[0] as Record<string, unknown>).decline = false;
  assert.throws(() => create(makeConfig([profile])), /literal true/i);
});

test('construction: a decline-declaring leg constructs', () => {
  assert.doesNotThrow(() => create(makeConfig([captureProfile({ decline: true })])));
});
```

- [ ] **Step 2: Run to verify failure.** The first test fails (nothing rejects `decline: false` yet); the second fails at the helper (no `decline` override).

- [ ] **Step 3: Implement.**
  - `config.ts` `LegSpec`: after `eligibility?: string;` add `decline?: true;` with the comment `// SPEC §9.1: per-leg switch for §9's decline seam — literal true, the signing rule's class (this increment)`.
  - `validateProfile`'s per-leg loop (beside the other per-leg validators; a small named function matching the house shape):

```ts
function validateDecline(profile: ConfirmProfile, leg: LegSpec): void {
  if (Object.hasOwn(leg, 'decline') && leg.decline !== true) {
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' — decline must be the literal true when declared — ` +
        'any other value would construct as a non-declaring leg, silently disabling the seam ' +
        '(the fail-closed structural class; SPEC §9.1)',
    );
  }
}
```

    and call `validateDecline(profile, leg);` in the loop after `validateEligibility`.
  - `test/helpers/profiles.ts`: `ProfileOverrides` gains `decline?: true;` (comment: `/** SPEC §9.1's per-leg decline switch — the recorded-human-decline increment's own override point. */`) and `buildLeg` gains `if (o.decline === true) leg.decline = true;`.

- [ ] **Step 4: Run the full suite; typecheck.** Green.

- [ ] **Step 5: Commit:** `Recorded human decline 2/9: LegSpec.decline constructs literal-true-guarded; the helper override`.

### Task 4: Behavior-preserving finalize refactor — the shared ladder pieces become importable

**Files:**
- Modify: `packages/record/src/kernel/finalize.ts` only

**Interfaces:**
- Produces (all from `kernel/finalize.js`): `export { refuseMaybeAppend }` (signature unchanged: `(store, code, leg, chain, resolved, finalLeg, now)`), `export { isValidFacts }` (`(facts) => { ok: true; canonical: Uint8Array } | { ok: false }`), `export type { Facts }`, and the newly extracted `export function sodViolated(record: DecisionRecord, leg: LegSpec, identity: IdentityAssertion, recordId: string, seam: 'finalize' | 'decline'): boolean` (throws on the garbled paired-actor invariant, naming `seam` in the message). `appendChainCompromise`, `isValidIdentity`, `SYSTEM_CHECKER` are already exported.

- [ ] **Step 1: Extract SoD.** Move rung (3.5)'s body (both the `notActorOf` loop and the proposer check, comments travelling with it) into:

```ts
/**
 * Rung (3.5)'s shared predicate (SPEC §10.1), extracted at the recorded-human-decline
 * increment so the decline seam gates SoD from the SAME code, not a drifting copy.
 * Returns true when the seam must refuse `sod-violation`; THROWS on the garbled
 * paired-actor invariant (a storage/config fault, SPEC §8) — the boundary comments
 * from finalize's original rung travel here unchanged.
 */
export function sodViolated(
  record: DecisionRecord,
  leg: LegSpec,
  identity: IdentityAssertion,
  recordId: string,
  seam: 'finalize' | 'decline',
): boolean {
  if (leg.sod !== undefined) {
    for (const namedLegId of leg.sod.notActorOf) {
      const refIndex = (record.priorRecordRefs ?? []).findIndex((ref) => ref.legId === namedLegId);
      if (refIndex === -1) {
        return true; // lookup miss — fail closed (the original rung's comment travels here)
      }
      const priorActor = record.priorLegActors?.[refIndex];
      if (priorActor === undefined) {
        throw new Error(
          `${seam}: record '${recordId}' carries a prior-leg reference for '${namedLegId}' with no paired actor — a garbled or foreign chain is a storage/config fault (SPEC §8)`,
        );
      }
      if (priorActor.principal === identity.principal) return true;
    }
  }
  return leg.proposer !== undefined && leg.proposer === identity.principal;
}
```

    Preserve the original block comments verbatim inside the helper (the lookup-miss rationale, the paired-by-index boundary paragraph). Finalize's rung (3.5) becomes:

```ts
  // --- (3.5) separation of duties (SPEC §10.1; second step-4 increment) ----------------
  if (sodViolated(record, leg, identity, recordId, 'finalize')) {
    return refuseMaybeAppend(store, 'sod-violation', leg, chain, resolved, finalLeg, now);
  }
```

    Add `DecisionRecord` to the types import.

- [ ] **Step 2: Add `export` to `refuseMaybeAppend` and `isValidFacts`; change `type Facts = …` to `export type Facts = …`.** Note in each doc comment: `EXPORTED: kernel/decline.ts is the second caller (the recorded-human-decline increment).`

- [ ] **Step 3: Run the FULL suite** — this is a refactor of the most load-bearing seam: every finalize, SoD, multi-leg, and byte-stability test must be green, unchanged. Typecheck, lint green.

- [ ] **Step 4: Commit:** `Recorded human decline 3/9: finalize's shared ladder pieces exported, SoD extracted behavior-preserved`.

### Task 5: The seam lands — happy path, wiring, and the two caller-error postures

**Files:**
- Create: `packages/record/src/kernel/decline.ts`
- Modify: `packages/record/src/config.ts` (`DeclineOptions`), `packages/record/src/create.ts` (Kernel + makeKernel), `packages/record/src/operator-surface.ts` (interface + freeze list), `packages/record/src/index.ts` (mirror `FinalizeOptions`' export status for `DeclineOptions`)
- Test: `packages/record/test/decline.test.ts`

**Interfaces:**
- Consumes: Task 4's exports; `validateConsultations` (`kernel/consultations.js`); `resolveDueClock` (`kernel/expiry.js`); `signatureLayerHolds` (`kernel/verify-signatures.js`).
- Produces: `OperatorSurface.decline(recordId, identity, content, facts, opts?) → Promise<Outcome<{ recordId: string; state: 'declined'; transitionRef: Digest }>>`; `DeclineOptions { consultations?: <copy FinalizeOptions.consultations' member type verbatim> }`; kernel closure `decline`.

- [ ] **Step 1: Write the failing tests:**

```ts
import type { OperatorSurface } from '../src/operator-surface.js';
import { DEFAULT_SUBJECT_REF, facts, identity, openRecord } from './helpers/profiles.js';

const CHECKER = { principal: 'svc:hr-check', authority: 'mtls:hr-check' };
const DIGEST = `sha256:${'b'.repeat(64)}`;
const CONTENT = { amount: 40 };

async function declinable(overrides: Parameters<typeof captureProfile>[0] = {}) {
  const profile = captureProfile({ decline: true, ...overrides });
  const handles = create(makeConfig([profile]));
  const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  return { handles, recordId, profile };
}

test('decline: happy path — terminal declined, actor bound, batch mirrors confirm', async () => {
  const { handles, recordId } = await declinable();
  const res = await handles.operator.decline(recordId, identity(), CONTENT, facts(), {
    consultations: [
      { kind: 'decline-reason', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
    ],
  });
  assert.equal(res.status, 'ok');
  assert.equal(res.status === 'ok' && res.value.state, 'declined');

  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'declined');
  assert.deepEqual(record?.actor, identity());
  assert.deepEqual(
    record?.consultations.map((c) => c.kind),
    ['chain-verify', 'facts', 'decline-reason'],
  );
  const chain = await handles.operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'consultation-recorded', 'consultation-recorded', 'consultation-recorded', 'declined'],
  );
});

test('decline: a non-declaring leg throws — the findings-seams posture', async () => {
  const profile = captureProfile(); // no decline
  const handles = create(makeConfig([profile]));
  const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  await assert.rejects(
    () => handles.operator.decline(recordId, identity(), CONTENT, facts()),
    /decline/,
  );
});

test('decline: unknown option keys throw — policy is deliberately not accepted', async () => {
  const { handles, recordId } = await declinable();
  await assert.rejects(
    () =>
      handles.operator.decline(recordId, identity(), CONTENT, facts(), {
        policy: { digest: DIGEST },
      } as never),
    /decline\(\) accepts only consultations/,
  );
});

test('decline: unknown recordId throws — caller error, never a refusal', async () => {
  const { handles } = await declinable();
  await assert.rejects(
    () => handles.operator.decline('rec_none', identity(), CONTENT, facts()),
    /unknown recordId/,
  );
});
```

- [ ] **Step 2: Run to verify failure** — `decline` is not on the surface; TypeScript fails first. Expected.

- [ ] **Step 3: Implement `kernel/decline.ts`.** The whole seam:

```ts
// @vidimera/record — kernel/decline.ts: the operator-only `open → declined` seam (SPEC
// §9's decline call; the recorded-human-decline increment). The recorded human "no" with
// confirm's evidentiary treatment: finalize's ladder with the EVIDENCE rungs absent —
//
//   intake → load chain → (1) pre-seam chain-verify → declaration + observedAt contracts
//   → (2) state/expiry gate → (3) identity → (3.5) separation of duties →
//   (4) content-drift → (5) facts → (5.5) eligibility ONLY → (6) success append batch.
//
// Deliberately absent, per the design ruling "authority yes, evidence no":
// requiredConsultations iteration, evidence-kind freshness, rung (5.7) ack coverage —
// a "no" is never blockable by a missing or dead evidence source — and rung (4.5): the
// seam takes NO policy input (the policy gate exists to prevent approving under stale
// rules; a decline disposes the record either way; the bound policyDigest stays as the
// context the decline was made under). Eligibility DOES gate (authority-to-decide covers
// deciding either way), including its AL2 freshness bound (stale authority is authority
// not established). Every refusal reuses an existing §8 code through the same
// refuseMaybeAppend/appendsOn rule — the registry does not grow at this increment.

import { canonicalize, digest } from '../canonical.js';
import { transitionDigest } from '../chain/encoding.js';
import { replay, verifyChain } from '../chain/replay.js';
import { type DeclineOptions, governedUnavailable } from '../config.js';
import type { KernelContext } from '../create.js';
import { isFinalLeg, nonTerminal } from '../nonterminal.js';
import type { Outcome } from '../outcome.js';
import { ok, refused, unavailable } from '../outcome.js';
import type { AppendMeta } from '../store/store.js';
import type { Consultation, Digest, IdentityAssertion, Transition } from '../types.js';
import { validateConsultations } from './consultations.js';
import { resolveDueClock } from './expiry.js';
import {
  appendChainCompromise,
  type Facts,
  isValidFacts,
  isValidIdentity,
  refuseMaybeAppend,
  sodViolated,
  SYSTEM_CHECKER,
} from './finalize.js';
import { signatureLayerHolds } from './verify-signatures.js';

export async function decline(
  ctx: KernelContext,
  recordId: string,
  identity: IdentityAssertion,
  content: unknown,
  facts: Facts,
  opts?: DeclineOptions,
): Promise<Outcome<{ recordId: string; state: 'declined'; transitionRef: Digest }>> {
  const { store, profiles, now } = ctx;

  // --- intake (finalize's posture: throws before anything is loaded) -------------------
  if (opts !== undefined) {
    for (const key of Object.keys(opts)) {
      if (key === 'consultations') continue;
      throw new Error(
        governedUnavailable(
          key,
          'decline() accepts only consultations in this build — the seam takes no policy ' +
            'input by design (SPEC §9). Contract: §9 and §11.1.',
        ),
      );
    }
  }
  const supplied = validateConsultations(opts?.consultations);

  // --- load the chain -------------------------------------------------------------------
  const chain = await store.readChain(recordId);
  if (chain.length === 0) {
    throw new Error(
      `decline: unknown recordId '${recordId}' — no such record (open() first); ` +
        'a recordId that resolves to no chain is a caller error, not a domain refusal',
    );
  }

  // --- (1) pre-seam chain-verify (SPEC §5: verification is first) ----------------------
  const report = verifyChain(chain);
  if (!report.intact || !(await signatureLayerHolds(ctx, chain))) {
    return appendChainCompromise(store, chain, now);
  }

  const record = replay(chain);
  const resolved = profiles.get(record.profileId);
  if (resolved === undefined) {
    return refused('unknown-profile');
  }
  const legIndex = resolved.profile.legs.findIndex((l) => l.id === record.legId);
  const leg = resolved.profile.legs[legIndex];
  if (leg === undefined) {
    throw new Error(
      `decline: persisted legId '${record.legId}' is absent from profile '${record.profileId}'`,
    );
  }
  const finalLeg = isFinalLeg(legIndex, resolved.profile.legs.length);

  // --- the declaration gate (the findings-seams posture, SPEC §9.1) --------------------
  if (leg.decline !== true) {
    throw new Error(
      `decline: leg '${leg.id}' of profile '${record.profileId}' does not declare the decline ` +
        'seam — declare decline: true on the leg (SPEC §9.1); a non-declaring chain stays ' +
        'byte-identical to a pre-decline implementation',
    );
  }

  // --- the observedAt presence contract (SPEC §11.1/§14 — finalize's own, shared) ------
  if (resolved.profile.signing !== true) {
    const carrier = supplied.obtained.find((entry) => entry.observedAt !== undefined);
    if (carrier !== undefined) {
      throw new Error(
        `decline: consultations '${carrier.kind}' carries observedAt but profile ` +
          `'${record.profileId}' does not declare signing — AL1 does not accept a ` +
          'caller-supplied observation time (clock trust, SPEC §11.1; the AL2 admission is §14)',
      );
    }
  }

  // --- (2) state/expiry gate (the shape mirrors finalize's rung (2); the adjacent-pair
  //     tests pin both ladders) ----------------------------------------------------------
  if (record.state === 'expired') {
    return refused('leg-expired');
  }
  if (record.state === 'confirmed' || record.state === 'redeeming') {
    const due = await resolveDueClock(store, chain, resolved, now());
    if (due.due && due.result.appended) {
      return refused(due.window === 'confirmed' ? 'leg-expired' : 'record-not-open');
    }
    return refused('record-not-open');
  }
  if (record.state !== 'open') {
    return refused('record-not-open');
  }
  const ex = await resolveDueClock(store, chain, resolved, now());
  if (ex.due) {
    return refused('leg-expired');
  }

  // --- (3) identity ---------------------------------------------------------------------
  if (!isValidIdentity(identity) || !leg.allowedAuthorities.includes(identity.authority)) {
    return refuseMaybeAppend(
      store,
      'identity-authority-refused',
      leg,
      chain,
      resolved,
      finalLeg,
      now,
    );
  }

  // --- (3.5) separation of duties (SPEC §10.1: deciding includes declining) ------------
  if (sodViolated(record, leg, identity, recordId, 'decline')) {
    return refuseMaybeAppend(store, 'sod-violation', leg, chain, resolved, finalLeg, now);
  }

  // --- (4) content-drift — the decline is about THIS content or it does not land -------
  const recomputed = digest(canonicalize(resolved.canonicalizer(content)));
  if (recomputed !== record.contentDigest) {
    return refuseMaybeAppend(store, 'content-drift', leg, chain, resolved, finalLeg, now);
  }

  // --- (5) facts — the decline binds what the decider saw when they said no ------------
  const factsCheck = isValidFacts(facts);
  if (!factsCheck.ok) {
    return refuseMaybeAppend(store, 'consultation-missing', leg, chain, resolved, finalLeg, now);
  }

  // --- (5.5) eligibility ONLY (SPEC §10.4; the "authority yes, evidence no" ruling):
  //     declared requiredConsultations are NOT iterated and rung (5.7) does not run —
  //     those rungs protect the approval. Eligibility's own trip mapping and its AL2
  //     freshness bound apply unchanged. ------------------------------------------------
  if (leg.eligibility !== undefined) {
    const marker = supplied.unreachable.find((m) => m.kind === 'eligibility');
    if (marker !== undefined) {
      return unavailable(marker.authority);
    }
    const obtained = supplied.obtained.find((entry) => entry.kind === 'eligibility');
    if (obtained === undefined) {
      return refuseMaybeAppend(store, 'consultation-missing', leg, chain, resolved, finalLeg, now);
    }
    if (obtained.verdict === 'fail') {
      return refuseMaybeAppend(store, 'ineligible', leg, chain, resolved, finalLeg, now);
    }
    const bound =
      leg.freshness !== undefined && Object.hasOwn(leg.freshness, 'eligibility')
        ? leg.freshness.eligibility
        : undefined;
    if (bound !== undefined) {
      const claimed = obtained.observedAt;
      const nowMs = now().getTime();
      const observedMs = claimed === undefined ? Number.NaN : Date.parse(claimed);
      if (
        claimed === undefined ||
        Number.isNaN(observedMs) ||
        observedMs > nowMs ||
        nowMs - observedMs > bound * 1000
      ) {
        return refuseMaybeAppend(store, 'consultation-stale', leg, chain, resolved, finalLeg, now);
      }
    }
  }

  // --- (6) success batch: [chain-verify, facts, …obtained consultations, declined] -----
  const nowIso = now().toISOString();
  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('decline: empty chain — callers hold a loaded chain');
  }
  const headDigest = transitionDigest(last);

  const chainVerifyConsultation: Consultation = {
    kind: 'chain-verify',
    checker: SYSTEM_CHECKER,
    at: nowIso,
    payloadDigest: headDigest,
    verdict: 'pass',
  };
  const factsConsultation: Consultation = {
    kind: 'facts',
    checker: facts.checker,
    at: nowIso,
    payloadDigest: digest(factsCheck.canonical),
    verdict: 'pass',
  };

  const seqBase = chain.length;
  const cvTransition: Transition = {
    recordId,
    seq: seqBase + 1,
    at: nowIso,
    kind: 'consultation-recorded',
    payload: chainVerifyConsultation,
    prevHash: headDigest,
  };
  const factsTransition: Transition = {
    recordId,
    seq: seqBase + 2,
    at: nowIso,
    kind: 'consultation-recorded',
    payload: factsConsultation,
    prevHash: transitionDigest(cvTransition),
  };
  const suppliedTransitions: Transition[] = [];
  let suppliedPrevHash = transitionDigest(factsTransition);
  for (const [i, entry] of supplied.obtained.entries()) {
    const consultation: Consultation = {
      kind: entry.kind,
      checker: entry.checker,
      at: nowIso,
      payloadDigest: entry.payloadDigest,
      verdict: entry.verdict,
      ...(entry.proofRef !== undefined ? { proofRef: entry.proofRef } : {}),
      ...(entry.observedAt !== undefined ? { observedAt: entry.observedAt } : {}),
    };
    const t: Transition = {
      recordId,
      seq: seqBase + 3 + i,
      at: nowIso,
      kind: 'consultation-recorded',
      payload: consultation,
      prevHash: suppliedPrevHash,
    };
    suppliedTransitions.push(t);
    suppliedPrevHash = transitionDigest(t);
  }
  // `declined` is terminal under every leg/effect-seam combination (SPEC §2) — the
  // derivation, never a literal: nonTerminal matches no disjunct for it.
  const declinedTransition: Transition = {
    recordId,
    seq: seqBase + 3 + suppliedTransitions.length,
    at: nowIso,
    kind: 'declined',
    payload: { actor: identity },
    prevHash: suppliedPrevHash,
  };

  const postBatch: AppendMeta = {
    nonTerminal: nonTerminal('declined', finalLeg, resolved.effectSeam), // false
    // no dueAt: a terminal append clears the pending-clock column by omission (SPEC §12)
  };
  const res = await store.appendBatch(
    'open',
    [cvTransition, factsTransition, ...suppliedTransitions, declinedTransition],
    postBatch,
  );
  if (!res.appended) {
    if (res.conflict === 'seq') {
      throw new Error(
        `decline: batch append conflict ('seq') at element ${res.index}. Under this build's ` +
          'single-writer bound, with a Store honouring the compare-and-swap contract, no ' +
          'conflict is reachable here — a storage fault; the batch is all-or-nothing: ' +
          'nothing was appended and the record is unchanged.',
      );
    }
    return refused('record-not-open');
  }
  const declinedDigest = res.transitionDigests.at(-1);
  if (declinedDigest === undefined) {
    throw new Error(
      'decline: appendBatch reported success with no digests — a conforming Store returns ' +
        'one digest per element',
    );
  }
  return ok({ recordId, state: 'declined', transitionRef: declinedDigest });
}
```

- [ ] **Step 4: Wire it.**
  - `config.ts`, beside `FinalizeOptions`: `export interface DeclineOptions { consultations?: <the same member type FinalizeOptions.consultations declares, copied verbatim>; }` with a comment `// SPEC §9's decline seam: consultations only — no policy member, by design (this increment).`
  - `operator-surface.ts` `OperatorSurface`, after `finalize`:

```ts
  decline(
    recordId: string,
    identity: IdentityAssertion,
    content: unknown,
    facts: { figures: unknown; checker: IdentityAssertion },
    // SPEC §9's decline seam (the recorded-human-decline increment): consultations only —
    // reasons ride §11.1's attach form; the seam takes no policy input by design.
    opts?: DeclineOptions,
  ): Promise<Outcome<{ recordId: string; state: 'declined'; transitionRef: Digest }>>;
```

    plus `decline: kernel.decline,` in `makeOperatorSurface`'s frozen literal and `DeclineOptions` in the config type import.
  - `create.ts`: `Kernel` gains `decline: OperatorSurface['decline'];`; `makeKernel` gains `decline: (recordId, identity, content, facts, opts) => declineKernel(ctx, recordId, identity, content, facts, opts),` with the import `import { decline as declineKernel } from './kernel/decline.js';`.
  - `index.ts`: export `DeclineOptions` exactly where and how `FinalizeOptions` is exported (mirror its status precisely; if `FinalizeOptions` is not exported there, export neither).
  - `agent-surface.ts`: UNTOUCHED — verify by reading that `decline` is absent from the frozen agent handle.

- [ ] **Step 5: Run the tests from Step 1** — green. Full suite green (byte-stability included). Typecheck, lint.

- [ ] **Step 6: Contract-scan** (`decline.ts` is new tracked TypeScript — its `SPEC §` citations must resolve; run `node scripts/contract-scan.mjs`, expect exit 0).

- [ ] **Step 7: Commit:** `Recorded human decline 4/9: the seam lands — happy path, wiring, caller-error postures`.

### Task 6: The authority rungs gate the decline

**Files:**
- Test: `packages/record/test/decline.test.ts`
- Modify: `packages/record/src/kernel/decline.ts` only if a test exposes a defect

**Interfaces:**
- Consumes: Task 5's seam. Produces: the pinned ladder order for rungs (2)–(5).

- [ ] **Step 1: Write the failing/pinning tests:**

```ts
import { createWithClock } from '../src/create.js';
import { effectSeamProfile } from './helpers/profiles.js';

test('decline rung (2): a due-open record resolves expired and refuses leg-expired', async () => {
  const profile = captureProfile({ decline: true, ttl: 60 });
  let nowMs = Date.parse('2026-08-21T00:00:00Z');
  const handles = createWithClock(makeConfig([profile]), () => new Date(nowMs));
  const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  nowMs += 120_000; // past the 60s ttl
  const res = await handles.operator.decline(recordId, identity(), CONTENT, facts());
  assert.equal(res.status, 'refused');
  assert.equal(res.status === 'refused' && res.code, 'leg-expired');
  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'expired'); // the en-passant edge landed
});

test('decline rung (2): a decided record refuses record-not-open', async () => {
  const { handles, recordId } = await declinable();
  const confirmed = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(confirmed.status, 'ok');
  const res = await handles.operator.decline(recordId, identity(), CONTENT, facts());
  assert.equal(res.status, 'refused');
  assert.equal(res.status === 'refused' && res.code, 'record-not-open');
});

test('decline rung (3): a disallowed authority refuses identity-authority-refused', async () => {
  const { handles, recordId } = await declinable();
  const res = await handles.operator.decline(
    recordId,
    identity({ authority: 'session:other-app' }),
    CONTENT,
    facts(),
  );
  assert.equal(res.status, 'refused');
  assert.equal(res.status === 'refused' && res.code, 'identity-authority-refused');
});

test('decline rung (3.5): the proposer may not decline their own leg', async () => {
  const profile = captureProfile({ decline: true });
  profile.legs[0] = { ...profile.legs[0], proposer: 'agent:writer' } as LegSpec;
  const handles = create(makeConfig([profile]));
  const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  const res = await handles.operator.decline(
    recordId,
    identity({ principal: 'agent:writer' }),
    CONTENT,
    facts(),
  );
  assert.equal(res.status, 'refused');
  assert.equal(res.status === 'refused' && res.code, 'sod-violation');
});

test('decline rung (4): content drift refuses open-by-default, terminal when listed', async () => {
  const { handles, recordId } = await declinable();
  const drifted = await handles.operator.decline(recordId, identity(), { amount: 41 }, facts());
  assert.equal(drifted.status, 'refused');
  assert.equal(drifted.status === 'refused' && drifted.code, 'content-drift');
  const stillOpen = await handles.operator.getRecord(recordId);
  assert.equal(stillOpen?.state, 'open'); // no append by default

  const terminal = await declinable({ terminalRefusals: ['content-drift'] });
  const drifted2 = await terminal.handles.operator.decline(
    terminal.recordId,
    identity(),
    { amount: 41 },
    facts(),
  );
  assert.equal(drifted2.status, 'refused');
  const after = await terminal.handles.operator.getRecord(terminal.recordId);
  assert.equal(after?.state, 'refused'); // the appendsOn rule, unchanged
});

test('decline rung (5): missing facts refuses consultation-missing', async () => {
  const { handles, recordId } = await declinable();
  const res = await handles.operator.decline(
    recordId,
    identity(),
    CONTENT,
    { figures: undefined, checker: facts().checker } as never,
  );
  assert.equal(res.status, 'refused');
  assert.equal(res.status === 'refused' && res.code, 'consultation-missing');
});
```

    Import `LegSpec` from `../src/config.js`. Adjust the `identity({ authority: … })` value to any string absent from the default `allowedAuthorities` (`['session:test-app']`).

- [ ] **Step 2: Run** — expect green if Task 5's ladder is right; any red is a seam defect to fix in `decline.ts` (not in the tests). `resolveDueClock`'s call/return shape must match finalize's usage exactly — if the compiler objects, read `kernel/expiry.ts` and mirror finalize's call verbatim.

- [ ] **Step 3: The adjacent-pair gate-order pins** (the standing discipline — a rung's refusal wins over every rung after it). Append:

```ts
test('decline ladder order: each rung wins over the one after it (adjacent pairs)', async () => {
  { // (3) identity beats (3.5) SoD: disallowed authority AND proposer-violating principal
    const profile = captureProfile({ decline: true });
    profile.legs[0] = { ...profile.legs[0], proposer: 'agent:writer' } as LegSpec;
    const handles = create(makeConfig([profile]));
    const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
    const res = await handles.operator.decline(
      recordId,
      { principal: 'agent:writer', authority: 'session:other-app' },
      CONTENT,
      facts(),
    );
    assert.equal(res.status === 'refused' && res.code, 'identity-authority-refused');
  }
  { // (3.5) SoD beats (4) drift: proposer-violating principal AND drifted content
    const profile = captureProfile({ decline: true });
    profile.legs[0] = { ...profile.legs[0], proposer: 'agent:writer' } as LegSpec;
    const handles = create(makeConfig([profile]));
    const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
    const res = await handles.operator.decline(
      recordId,
      identity({ principal: 'agent:writer' }),
      { amount: 41 },
      facts(),
    );
    assert.equal(res.status === 'refused' && res.code, 'sod-violation');
  }
  { // (4) drift beats (5) facts: drifted content AND missing facts
    const { handles, recordId } = await declinable();
    const res = await handles.operator.decline(
      recordId,
      identity(),
      { amount: 41 },
      { figures: undefined, checker: facts().checker } as never,
    );
    assert.equal(res.status === 'refused' && res.code, 'content-drift');
  }
  { // (5) facts beats (5.5) eligibility: missing facts AND missing eligibility input
    const { handles, recordId } = await declinable({ eligibility: 'hr.decliner-check' } as never);
    const res = await handles.operator.decline(
      recordId,
      identity(),
      CONTENT,
      { figures: undefined, checker: facts().checker } as never,
    );
    assert.equal(res.status === 'refused' && res.code, 'consultation-missing');
    // Distinguishable from eligibility's own consultation-missing only by the rung — this
    // pair pins that a facts-less call refuses at (5) BEFORE (5.5) is consulted: supply the
    // eligibility consultation and the SAME facts-less call still refuses consultation-missing.
    const res2 = await handles.operator.decline(
      recordId,
      identity(),
      CONTENT,
      { figures: undefined, checker: facts().checker } as never,
      { consultations: [{ kind: 'eligibility', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' }] },
    );
    assert.equal(res2.status === 'refused' && res2.code, 'consultation-missing');
  }
});
```

    (The `eligibility` ProfileOverrides extension lands in Task 7 Step 2 — if executing strictly in order, move that helper edit here, keeping Task 7's note as a verification.)

- [ ] **Step 4: Full suite, typecheck, lint. Commit:** `Recorded human decline 5/9: authority rungs pinned — state/expiry, identity, SoD, drift, facts, adjacent pairs`.

### Task 7: Eligibility gates; evidence rungs pinned as skipped

**Files:**
- Test: `packages/record/test/decline.test.ts`
- Modify: `packages/record/src/kernel/decline.ts` only if a test exposes a defect

- [ ] **Step 1: Write the tests:**

```ts
const ELIGIBLE = { kind: 'eligibility', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' as const };

test('decline (5.5): eligibility trip mapping — missing, fail, unreachable, pass', async () => {
  const setup = () => declinable({ eligibility: 'hr.decliner-check' } as never);
  // NOTE: ProfileOverrides has no eligibility member — extend it in helpers/profiles.ts
  // exactly as Task 3 extended it for decline: `eligibility?: string;` on ProfileOverrides,
  // `if (o.eligibility !== undefined) leg.eligibility = o.eligibility;` in buildLeg.

  { // missing → consultation-missing, record stays open
    const { handles, recordId } = await setup();
    const res = await handles.operator.decline(recordId, identity(), CONTENT, facts());
    assert.equal(res.status === 'refused' && res.code, 'consultation-missing');
    assert.equal((await handles.operator.getRecord(recordId))?.state, 'open');
  }
  { // fail → ineligible, open-by-default; a different eligible actor may still decline
    const { handles, recordId } = await setup();
    const res = await handles.operator.decline(recordId, identity(), CONTENT, facts(), {
      consultations: [{ ...ELIGIBLE, verdict: 'fail' }],
    });
    assert.equal(res.status === 'refused' && res.code, 'ineligible');
    const retry = await handles.operator.decline(recordId, identity(), CONTENT, facts(), {
      consultations: [ELIGIBLE],
    });
    assert.equal(retry.status, 'ok');
  }
  { // unreachable → the availability outcome, no append, seam re-arms
    const { handles, recordId } = await setup();
    const res = await handles.operator.decline(recordId, identity(), CONTENT, facts(), {
      consultations: [{ kind: 'eligibility', unreachable: true, authority: 'svc:hr' }],
    });
    assert.equal(res.status, 'unavailable');
    assert.equal(res.status === 'unavailable' && res.authority, 'svc:hr');
    assert.equal((await handles.operator.getRecord(recordId))?.state, 'open');
  }
  { // pass → declined, the eligibility consultation recorded in the batch
    const { handles, recordId } = await setup();
    const res = await handles.operator.decline(recordId, identity(), CONTENT, facts(), {
      consultations: [ELIGIBLE],
    });
    assert.equal(res.status, 'ok');
    const record = await handles.operator.getRecord(recordId);
    assert.ok(record?.consultations.some((c) => c.kind === 'eligibility'));
  }
});

test('decline: evidence rungs are SKIPPED — a failing required consultation, an un-acked required finding, and a policy profile all still decline', async () => {
  { // requiredConsultations not iterated: no risk-check supplied, decline succeeds
    const { handles, recordId } = await declinable({ requiredConsultations: ['risk-check'] });
    const res = await handles.operator.decline(recordId, identity(), CONTENT, facts());
    assert.equal(res.status, 'ok');
  }
  { // ack coverage (5.7) skipped: an un-acked requiredAcks finding blocks finalize, not decline
    const profile = captureProfile({ decline: true });
    profile.legs[0] = { ...profile.legs[0], ackMode: 'any', requiredAcks: ['variance'] } as LegSpec;
    const handles = create(makeConfig([profile]));
    const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
    const raised = await handles.operator.raiseFinding(
      recordId,
      { findingId: 'f1', kind: 'variance', findingDigest: DIGEST },
      identity(),
    );
    assert.equal(raised.status, 'ok');
    const res = await handles.operator.decline(recordId, identity(), CONTENT, facts());
    assert.equal(res.status, 'ok'); // the finding stays visible on the declined chain
    const record = await handles.operator.getRecord(recordId);
    assert.equal(record?.findings?.length, 1);
  }
  { // policy: a declaring profile's decline takes no policy input and does not drift-gate
    const profile = captureProfile({ decline: true });
    profile.policySource = 'spend-limits';
    const handles = create(makeConfig([profile]));
    const staged = await handles.agent.stage(CONTENT, profile.id, DEFAULT_SUBJECT_REF);
    assert.equal(staged.status, 'ok');
    const opened = await handles.operator.open(
      staged.status === 'ok' ? staged.value.stagedRef : '',
      { policyDigest: DIGEST },
    );
    assert.equal(opened.status, 'ok');
    const recordId = opened.status === 'ok' ? opened.value.recordId : '';
    const res = await handles.operator.decline(recordId, identity(), CONTENT, facts());
    assert.equal(res.status, 'ok'); // no policy option required, none accepted
  }
});

test('decline: observedAt on a non-signing profile throws — the AL2 presence contract shared with finalize', async () => {
  const { handles, recordId } = await declinable();
  await assert.rejects(
    () =>
      handles.operator.decline(recordId, identity(), CONTENT, facts(), {
        consultations: [
          { kind: 'decline-reason', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass', observedAt: '2026-08-21T00:00:00Z' },
        ],
      } as never),
    /observedAt/,
  );
});
```

    Note `stage()`'s return value shape: read `agent-surface.ts`'s `stage` signature for the exact ok-value key (`stagedRef` vs `id`) and match it; `openRecord` cannot be used for the policy case because it passes no open options.

- [ ] **Step 2: First, extend `ProfileOverrides`/`buildLeg` with `eligibility?: string` (as noted inline). Run; fix any seam defect in `decline.ts`.**

- [ ] **Step 3: Full suite, typecheck, lint. Commit:** `Recorded human decline 6/9: eligibility gates the no; the evidence rungs pinned skipped`.

### Task 8: Interactions — C1 release, supersedes, redemption, findings seams, seal, multi-leg block, store conformance

**Files:**
- Test: `packages/record/test/decline.test.ts`
- Modify: `packages/record/test/conformance/store-conformance.ts` (one scenario)
- Modify: `packages/record/src/kernel/supersedes.ts` (comment only — behavior needs no change)

- [ ] **Step 1: Write the interaction tests:**

```ts
import { transitionDigest } from '../src/chain/encoding.js';

test('declined releases C1: the same (profile, subject) re-opens', async () => {
  const { handles, recordId, profile } = await declinable();
  await handles.operator.decline(recordId, identity(), CONTENT, facts());
  const again = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  assert.notEqual(again, recordId);
});

test('supersedes accepts a declined predecessor — decline → re-open composes', async () => {
  const { handles, recordId, profile } = await declinable();
  await handles.operator.decline(recordId, identity(), CONTENT, facts());
  const chain = await handles.operator.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  const staged = await handles.agent.stage({ amount: 41 }, profile.id, DEFAULT_SUBJECT_REF);
  assert.equal(staged.status, 'ok');
  const reopened = await handles.operator.open(staged.status === 'ok' ? staged.value.stagedRef : '', {
    supersedes: { recordId, chainHead: transitionDigest(last as never) },
  });
  assert.equal(reopened.status, 'ok');
});

test('a declined effect-seam record refuses redemption on state grounds', async () => {
  const profile = effectSeamProfile();
  profile.legs[0] = { ...profile.legs[0], decline: true } as LegSpec;
  const handles = create(makeConfig([profile]));
  const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  await handles.operator.decline(recordId, identity(), CONTENT, facts());
  const res = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(res.status === 'refused' && res.code, 'unredeemable-state');
});

test('the findings seams refuse record-not-open against a declined record', async () => {
  const { handles, recordId } = await declinable();
  await handles.operator.decline(recordId, identity(), CONTENT, facts());
  const res = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f1', kind: 'variance', findingDigest: DIGEST },
    identity(),
  );
  assert.equal(res.status === 'refused' && res.code, 'record-not-open');
});

test('seal caps a declined chain and reports retired', async () => {
  const { handles, recordId } = await declinable();
  await handles.operator.decline(recordId, identity(), CONTENT, facts());
  const sealed = await handles.operator.seal(recordId);
  assert.equal(sealed.status, 'ok');
  assert.equal(sealed.status === 'ok' && sealed.value.status, 'retired');
});

test('multi-leg: a declined leg blocks the successor open', async () => {
  const profile = twoLegProfile();
  profile.legs[0] = { ...profile.legs[0], decline: true } as LegSpec;
  const handles = create(makeConfig([profile]));
  const leg1 = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF, 'maker-decide');
  await handles.operator.decline(leg1, identity(), CONTENT, facts());
  const chain = await handles.operator.readChain(leg1);
  const last = chain.at(-1);
  const staged = await handles.agent.stage(CONTENT, profile.id, DEFAULT_SUBJECT_REF, 'checker-decide');
  assert.equal(staged.status, 'ok');
  const opened = await handles.operator.open(staged.status === 'ok' ? staged.value.stagedRef : '', {
    priorRecordRefs: [{ recordId: leg1, chainHead: transitionDigest(last as never) }],
  });
  assert.equal(opened.status, 'refused'); // the prior leg did not conclude confirmed
});
```

    For the multi-leg pin, read `kernel/open.ts`'s prior-leg refusal code and assert it exactly (expected `prior-leg-unverified`; verify against the code before writing the assertion).

- [ ] **Step 2: The findings-seam pin may surface a real question** — read `kernel/findings-seams.ts`'s non-open mapping: `expired → leg-expired, other non-open → record-not-open`. `declined` lands in "other non-open" with zero code changes; if the seams switch exhaustively on state instead, add the `declined` arm mapping to `record-not-open`.

- [ ] **Step 3: `supersedes.ts` comment.** The terminal-regardless comment reading `// refused / expired / redeemed / redemption-failed: terminal regardless of profile.` gains `declined` in its list — behavior is already correct (the state falls through the open/redeeming/confirmed arms into the terminal default), which the supersedes test above proves. Comment-truth only.

- [ ] **Step 4: Store conformance.** Read `packages/record/test/conformance/store-conformance.ts` first; following its existing terminal-state scenario pattern and its store-factory parameter name exactly, add one scenario: append `opened` (genesis CAS), then a `declined { actor }` edge via `appendTransition('open', …, { nonTerminal: false })`, then assert (a) a subsequent state-leaving append (e.g. a `confirmed` edge with `expectedCurrentState: 'declined'`) is rejected by C3 (`state-mismatch`), (b) a compromise-classed `refused` edge against the terminal `declined` is ALSO rejected (the carve-out covers `confirmed`/`redeeming` only), and (c) a genesis for the same `(profileId, subjectRef)` succeeds (C1 released). The suite runs this against all three backings by construction.

- [ ] **Step 5: Live-mode symmetry — verify before writing.** The design doc's §5 claims "Live-capture profiles decline symmetrically (content binds at decision time)". Before testing it, read `docs/superpowers/specs/2026-08-17-live-capture-design.md` and finalize's live-mode content handling (how a `captureMode: 'live'` record's `contentDigest` is bound and compared — SPEC §9.2). If finalize carries ANY live-specific branch at its content rung, `decline.ts` must mirror it exactly; if the mechanics make symmetric decline impossible without divergence, STOP and report — that is a design-doc finding, not an implementer's call. Then add one test: `liveProfile(…)` with `decline: true` on its leg (the live builder requires a `requiredConsultations` kind — which the decline SKIPS, a deliberate pin: a live profile's decline succeeds without the `rederive` consultation), driving stage → open → decline and asserting terminal `declined`.

- [ ] **Step 6: Full suite (memory + sqlite + postgres projects), typecheck, lint. Commit:** `Recorded human decline 7/9: interactions pinned — C1, supersedes, redemption, findings, seal, multi-leg, live mode, C3 conformance`.

### Task 9: The public docset moves with the surface

**Files:**
- Modify: `docs/guide/api-reference.md` (decline entry beside finalize's), `docs/guide/integrating.md` (the decline + rework recipe)
- Scratch: a temporary vitest file to execute the guide sample (deleted before commit)

- [ ] **Step 1: Write the guide sample as a scratch test first** (`packages/record/test/scratch-guide-decline.test.ts`), asserting it runs green — the sample: create a decline-declaring profile, stage/open, `decline(recordId, identity, content, facts, { consultations: [declineReason] })`, then supersedes re-open — mirroring the integrating guide's existing sample style. Run it; then DELETE the scratch file.

- [ ] **Step 2: `docs/guide/api-reference.md`** — add the `decline` entry beside `finalize`'s, same heading depth and shape: signature, the ladder-subset sentence (authority rungs gate, evidence rungs do not, no policy input), the return shape, the non-declaring throw, and the honest bound in the same breath ("proves who declined what they saw — never that the decline was sound"). Mention `DeclineOptions` iff Task 5 exported it from `index.ts`.

- [ ] **Step 3: `docs/guide/integrating.md`** — a short "Recording a human decline" subsection with the verified sample: the `decline: true` leg, the `decline-reason` consultation, `terminalRefusals` interplay (drift during decline), and the rework recipe (decline → `supersedes` re-open; escalation = re-open under a different profile).

- [ ] **Step 4: Gates.** `node scripts/api-reference-sync.mjs` green; `node scripts/contract-scan.mjs` exit 0; full suite; build; run the packed-tarball smoke (`node scripts/smoke-pack.mjs`) since the surface moved.

- [ ] **Step 5: Commit:** `Recorded human decline 8/9: the guide moves with the surface — api-reference and integrating, samples vitest-verified`.

### Task 10: Exit — markers move to truth, the record lands, comment-truth sweep

**Files:**
- Modify: `docs/concept/SPEC.md`, `docs/concept/CONTROLS.md`, `docs/concept/GLOSSARY.md` (marker moves only — sanction-covered, the increment's exit step)
- Modify: `docs/process/implementation-status.md` (the increment's section), `CLAUDE.md` (measured counts only, if any moved)
- Verify: `docs/process/deferral-register.md` (expect no row moves — read it)

- [ ] **Step 1: Move the markers.** Every `**[DESIGNED]**` Task 1 introduced (SPEC §2 ×2 sites, §4 row, §9 block, §9.1 row, §10.1 sentence; CONTROLS §3 row's `DESIGNED` cell → `PROVEN`; GLOSSARY entry) becomes `**[PROVEN]**` — the behavior landed in this repository; spec-moves-to-truth is this increment's exit step. Touch NOTHING else in `docs/concept/`.

- [ ] **Step 2: The record.** `docs/process/implementation-status.md` gains the increment's section in its own established row style: what landed (the seam, the kind/state, the exports, the conformance scenario), the ruling set (payload `{ actor }`; authority-yes/evidence-no; no policy input; separate seam; the four cuts with recovery paths per anti-goal #4), the gate outputs (test totals as measured), the design doc path, and the sanction's grant record.

- [ ] **Step 3: CLAUDE.md accuracy pass.** Re-measure and update only claims that moved: the test-file/test counts ("51 test files, 695 tests" will have grown — state the new measured numbers), and verify the refusal-code count sentence still reads 24 (it must — this increment adds none). Nothing else in CLAUDE.md's claims moves.

- [ ] **Step 4: Comment-truth sweep** (repo-root pathspec, per the standing lesson). Grep and adjudicate every hit — hit-count must equal verdict-count:
  - `"the only appends between"` — SPEC §10.2's findings-seams sentence: still TRUE (a decline is the decision, not an append between opened and it); verify wording survives.
  - `"eleven kinds"` / any kind-count literal in `semantics.ts`/`replay.ts` comments → twelve where counted.
  - `operator-surface.ts` and `create.ts` header enumerations of the handle's calls → gain `decline`.
  - `"refused edge"` claims about who records identity — `refusal-codes.ts`/SPEC comments saying a refusal records no identity remain TRUE (declined is not a refusal); confirm no comment claims "no terminal state carries an actor".
  - `"decline"` across `packages/` — every hit either this increment's or adjudicated.
- [ ] **Step 5: Full gates one last time** — suite (zero skips), typecheck, lint:strict, build, contract-scan exit 0, api-sync green.

- [ ] **Step 6: Commit:** `Recorded human decline 9/9: markers move to truth; the record and the sweep land the exit`.

---

## What this plan does not do (per the design doc's cuts, recorded there)

No DEFER/RETURN/ESCALATE verbs, no proposer withdrawal, no reason payload field, no new refusal codes, no probe-tier addition (a decline probe is a candidate follow-up, out of this increment), no `docs/concept/` edits beyond the sanctioned §8 scope.
