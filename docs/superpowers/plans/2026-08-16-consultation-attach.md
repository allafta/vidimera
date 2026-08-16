# Consultation Attach Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land SPEC §11.1's attach form — finalize's `opts.consultations` input surface
with its argument-intake throw set, and supplied obtained consultations recorded into the
variable-arity success batch with library-stamped recording time — as the first of two
step-5 increments. No guard lifts, no new codes, no outcome change.

**Architecture:** The validator module (`kernel/consultations.ts`) lands inert first with
its unit pins. Then ONE commit threads `opts?: FinalizeOptions` through the surface,
wires the intake guard + validator ahead of the chain load, and records obtained entries
into the batch — surface and recording together, so no commit accepts an input it
silently drops (the silently-dropped-key trap). Unreachable markers validate then stay
inert (nothing is required while `requiredConsultations` is GOVERNED).

**Tech Stack:** TypeScript strict (pnpm workspace, Node >=22.16), vitest, Biome. No new
runtime APIs — the floor does not move.

**Spec:** `docs/superpowers/specs/2026-08-16-consultation-attach-design.md` — read it
before your task; its "Rulings taken" section is binding.

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
  consumer lands later, finalization an explicit step item). **A mandated RED run is
  EXECUTED; if reasoning is substituted, the report SAYS so.**
- **The governed count does NOT move this increment** (stays 7) — no count claims change.
- **Enlisted-branch check, visibly run**: `finalize()` takes no `tx` — nothing to decide.
- Narrow runs: `pnpm exec vitest run packages/record/test/<file>.test.ts` from repo root.

---

### Task 1: The validator module (inert)

**Files:**
- Modify: `packages/record/src/config.ts` (the three input types + `FinalizeOptions` —
  types only, nothing consumes them yet beyond the new module)
- Modify: `packages/record/src/kernel/finalize.ts` (ONE line: `export` on
  `isValidIdentity` — no behavior change)
- Create: `packages/record/src/kernel/consultations.ts`
- Test: create `packages/record/test/consultations.test.ts` (validator unit pins)

**Interfaces:**
- Produces (Task 2 relies on these EXACT shapes):

```ts
// config.ts
export interface ObtainedConsultation {
  kind: string;
  checker: IdentityAssertion;
  payloadDigest: Digest;
  verdict: 'pass' | 'fail';
  proofRef?: string;
}
export interface UnreachableMarker {
  kind: string;
  unreachable: true;
  authority: string;
}
export type ConsultationInput = ObtainedConsultation | UnreachableMarker;
export interface FinalizeOptions {
  consultations?: ConsultationInput[];
}

// kernel/consultations.ts
export interface PartitionedConsultations {
  obtained: ObtainedConsultation[]; // supplied order preserved
  unreachable: UnreachableMarker[];
}
export function validateConsultations(
  inputs: ConsultationInput[] | undefined,
): PartitionedConsultations; // THROWS on any malformed/duplicate/reserved input
```

- [ ] **Step 1: Write the failing tests**

Create `packages/record/test/consultations.test.ts`:

```ts
// @vidimera/record — consultations.test.ts (SPEC §11.1 "Consultations
// (required-consultation gating)", the ATTACH-FORM half; §9's finalize signature): the
// first step-5 increment's file. This file owns the intake-validator pins and, once the
// surface is wired, the attach/recording pins; the gate's pins are the second step-5
// increment's.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConsultationInput } from '../src/config.js';
import { validateConsultations } from '../src/kernel/consultations.js';

const CHECKER = { principal: 'svc:risk-check', authority: 'mtls:risk-check' };
const DIGEST = `sha256:${'a'.repeat(64)}`;

function obtained(kind: string, extra?: Record<string, unknown>): ConsultationInput {
  return {
    kind,
    checker: CHECKER,
    payloadDigest: DIGEST,
    verdict: 'pass',
    ...extra,
  } as ConsultationInput;
}

test('validateConsultations: undefined and empty partition to nothing; order is preserved', () => {
  assert.deepEqual(validateConsultations(undefined), { obtained: [], unreachable: [] });
  assert.deepEqual(validateConsultations([]), { obtained: [], unreachable: [] });

  const parted = validateConsultations([
    obtained('risk-check'),
    { kind: 'sanctions', unreachable: true, authority: 'svc:sanctions' },
    { ...obtained('llm-judge'), verdict: 'fail' } as ConsultationInput,
  ]);
  assert.deepEqual(
    parted.obtained.map((entry) => entry.kind),
    ['risk-check', 'llm-judge'],
  );
  assert.deepEqual(
    parted.unreachable.map((entry) => entry.kind),
    ['sanctions'],
  );
});

test('validateConsultations: duplicate kinds throw — obtained+obtained AND obtained+marker', () => {
  assert.throws(
    () => validateConsultations([obtained('risk-check'), obtained('risk-check')]),
    /duplicate/i,
  );
  assert.throws(
    () =>
      validateConsultations([
        obtained('risk-check'),
        { kind: 'risk-check', unreachable: true, authority: 'svc:risk' },
      ]),
    /duplicate/i,
  );
});

test('validateConsultations: reserved kinds throw on BOTH shapes — a library control cannot be forged', () => {
  // SPEC §11.1: an input naming a reserved library-emitted kind (`facts` or
  // `chain-verify`) "would forge a library control" — a caller error, thrown loud.
  for (const kind of ['facts', 'chain-verify']) {
    assert.throws(() => validateConsultations([obtained(kind)]), /reserved/i);
    assert.throws(
      () => validateConsultations([{ kind, unreachable: true, authority: 'svc:x' }]),
      /reserved/i,
    );
  }
});

test('validateConsultations: malformed entries throw — shape is exact, unknown keys included', () => {
  // A host-supplied `at` is an UNKNOWN KEY: SPEC §11.1's "A consultation's `at` is
  // never accepted from the host" is enforced structurally — the shape has no at field.
  assert.throws(
    () => validateConsultations([obtained('k1', { at: '2026-01-01T00:00:00.000Z' })]),
    /unknown key|at/i,
  );
  // missing field:
  assert.throws(
    () =>
      validateConsultations([
        { kind: 'k1', checker: CHECKER, verdict: 'pass' } as unknown as ConsultationInput,
      ]),
    /payloadDigest|malformed/i,
  );
  // bad verdict:
  assert.throws(
    () => validateConsultations([obtained('k1', { verdict: 'maybe' })]),
    /verdict/i,
  );
  // invalid checker:
  assert.throws(
    () =>
      validateConsultations([
        {
          kind: 'k1',
          checker: { principal: '', authority: '' },
          payloadDigest: DIGEST,
          verdict: 'pass',
        } as ConsultationInput,
      ]),
    /checker/i,
  );
  // empty kind, both shapes:
  assert.throws(() => validateConsultations([obtained('')]), /kind/i);
  assert.throws(
    () => validateConsultations([{ kind: '', unreachable: true, authority: 'svc:x' }]),
    /kind/i,
  );
  // marker with empty authority, marker with unknown key, marker with unreachable !== true:
  assert.throws(
    () => validateConsultations([{ kind: 'k1', unreachable: true, authority: '' }]),
    /authority/i,
  );
  assert.throws(
    () =>
      validateConsultations([
        { kind: 'k1', unreachable: true, authority: 'svc:x', extra: 1 } as unknown as ConsultationInput,
      ]),
    /unknown key/i,
  );
  assert.throws(
    () =>
      validateConsultations([
        { kind: 'k1', unreachable: false, authority: 'svc:x' } as unknown as ConsultationInput,
      ]),
    /unreachable|malformed/i,
  );
  // non-object entry, non-string proofRef:
  assert.throws(
    () => validateConsultations(['nope' as unknown as ConsultationInput]),
    /malformed|entry/i,
  );
  assert.throws(
    () => validateConsultations([obtained('k1', { proofRef: 7 })]),
    /proofRef/i,
  );
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm exec vitest run packages/record/test/consultations.test.ts`
Expected: FAIL — `kernel/consultations.js` does not exist.

- [ ] **Step 3: Implement**

1. `config.ts`: add the four types from **Interfaces** beside `OpenOptions`, with doc
   comments carrying §11.1's custody sentence (digest-only — the host digests its own
   evidence payload; the library never sees it) and the no-`at`-field rule (recording
   time is library-stamped, §2.1; an unknown entry key throws at intake — "never
   accepted from the host", structurally). `FinalizeOptions`' comment notes `policy`
   (§10.3) remains GOVERNED at the call seam — its build step has not arrived.
2. `kernel/finalize.ts`: `function isValidIdentity` → `export function isValidIdentity`
   (the SYSTEM_CHECKER export precedent — kernel-internal sharing, not public surface).
   Nothing else in the file changes in this task.
3. Create `kernel/consultations.ts`:

```ts
// @vidimera/record — kernel/consultations.ts: SPEC §11.1's consultation INTAKE
// validator (the first step-5 increment). The attach form is unconditional — §11.1:
// "The attach form is always available" — and a consultation is "evidence, never a
// decision": this module validates and partitions the host's supplied list; nothing
// here gates. The required-consultation gate that consumes the partition's markers
// lands at finalize's rung (5.5) in the second step-5 increment.
//
// Every rejection here THROWS at argument intake (SPEC §9: consultation shape "throws
// at argument intake, before anything is loaded"): a malformed entry, a duplicate kind,
// or a reserved kind is a CALLER error that throws identically regardless of record
// state — never a refusal, and never recorded.

import type { ConsultationInput, ObtainedConsultation, UnreachableMarker } from '../config.js';
import { isValidIdentity } from './finalize.js';

export interface PartitionedConsultations {
  obtained: ObtainedConsultation[]; // supplied order preserved — the batch records in this order
  unreachable: UnreachableMarker[];
}

/** SPEC §11.1: `facts` and `chain-verify` are the library-emitted kinds — an input
 * naming one "would forge a library control". */
const RESERVED_KINDS: ReadonlySet<string> = new Set(['facts', 'chain-verify']);

const OBTAINED_KEYS: ReadonlySet<string> = new Set([
  'kind',
  'checker',
  'payloadDigest',
  'verdict',
  'proofRef',
]);
const MARKER_KEYS: ReadonlySet<string> = new Set(['kind', 'unreachable', 'authority']);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function validateConsultations(
  inputs: ConsultationInput[] | undefined,
): PartitionedConsultations {
  const obtained: ObtainedConsultation[] = [];
  const unreachable: UnreachableMarker[] = [];
  if (inputs === undefined) {
    return { obtained, unreachable };
  }
  const seenKinds = new Set<string>();
  for (const [index, input] of inputs.entries()) {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new Error(
        `finalize: consultations[${index}] is not an object — a malformed entry is a caller error (SPEC §11.1)`,
      );
    }
    const record = input as Record<string, unknown>;
    if (!isNonEmptyString(record.kind)) {
      throw new Error(
        `finalize: consultations[${index}] has a missing or empty kind — a malformed entry is a caller error (SPEC §11.1)`,
      );
    }
    const kind = record.kind;
    if (RESERVED_KINDS.has(kind)) {
      throw new Error(
        `finalize: consultations[${index}] names the reserved library-emitted kind '${kind}' — ` +
          'SPEC §11.1: forging a library control is a caller error',
      );
    }
    if (seenKinds.has(kind)) {
      throw new Error(
        `finalize: consultations[${index}] duplicates kind '${kind}' — SPEC §11.1 admits at most one consultation per kind per finalize`,
      );
    }
    seenKinds.add(kind);

    if (record.unreachable !== undefined) {
      // The marker shape: { kind, unreachable: true, authority } and nothing else.
      for (const key of Object.keys(record)) {
        if (!MARKER_KEYS.has(key)) {
          throw new Error(
            `finalize: consultations[${index}] (unreachable marker '${kind}') carries the unknown key '${key}' — the shape is exact (SPEC §11.1)`,
          );
        }
      }
      if (record.unreachable !== true) {
        throw new Error(
          `finalize: consultations[${index}] has unreachable: ${String(record.unreachable)} — a marker declares unreachable: true or is not a marker (SPEC §11.1)`,
        );
      }
      if (!isNonEmptyString(record.authority)) {
        throw new Error(
          `finalize: consultations[${index}] (unreachable marker '${kind}') has a missing or empty authority — the marker names the party that was down (SPEC §11.1)`,
        );
      }
      unreachable.push({ kind, unreachable: true, authority: record.authority });
      continue;
    }

    // The obtained shape: { kind, checker, payloadDigest, verdict, proofRef? } and
    // nothing else — NO at field, deliberately: SPEC §11.1's "A consultation's `at` is
    // never accepted from the host" is enforced by this exact-shape rule, so a supplied
    // recording time is an unknown-key throw, never a silently dropped field.
    for (const key of Object.keys(record)) {
      if (!OBTAINED_KEYS.has(key)) {
        throw new Error(
          `finalize: consultations[${index}] (obtained '${kind}') carries the unknown key '${key}' — the shape is exact, and a host-supplied at is never accepted (SPEC §11.1)`,
        );
      }
    }
    if (!isValidIdentity(record.checker as never)) {
      throw new Error(
        `finalize: consultations[${index}] (obtained '${kind}') has a malformed checker identity — a caller error (SPEC §11.1)`,
      );
    }
    if (!isNonEmptyString(record.payloadDigest)) {
      throw new Error(
        `finalize: consultations[${index}] (obtained '${kind}') has a missing or empty payloadDigest — digest-only custody needs the digest (SPEC §11.1)`,
      );
    }
    if (record.verdict !== 'pass' && record.verdict !== 'fail') {
      throw new Error(
        `finalize: consultations[${index}] (obtained '${kind}') has verdict '${String(record.verdict)}' — a Consultation verdict is 'pass' or 'fail' (SPEC §2)`,
      );
    }
    if (record.proofRef !== undefined && typeof record.proofRef !== 'string') {
      throw new Error(
        `finalize: consultations[${index}] (obtained '${kind}') has a non-string proofRef — a caller error (SPEC §11.1)`,
      );
    }
    obtained.push({
      kind,
      checker: record.checker as ObtainedConsultation['checker'],
      payloadDigest: record.payloadDigest,
      verdict: record.verdict,
      ...(record.proofRef !== undefined ? { proofRef: record.proofRef } : {}),
    });
  }
  return { obtained, unreachable };
}
```

   (`isValidIdentity(record.checker as never)` — the helper takes `IdentityAssertion`;
   the cast admits the unknown for the runtime check. If the implementer prefers,
   loosen `isValidIdentity`'s parameter to `unknown` at its export instead — the checked
   VALUES are binding, the cast style is not. Verify `isValidIdentity` rejects
   non-objects safely before relying on it; if it does not, guard with a typeof check
   first.)

- [ ] **Step 4: Run tests, gates, commit**

Run: `pnpm exec vitest run packages/record/test/consultations.test.ts` (PASS), `pnpm test`
(PASS — the module is unconsumed; the types are unconsumed), all five gates. Commit
(Bash tool):

```bash
git add packages/record/src/config.ts packages/record/src/kernel/finalize.ts packages/record/src/kernel/consultations.ts packages/record/test/consultations.test.ts
git commit -m "The intake validator: exact shapes, one kind each, no forged controls, no host clock

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: The surface and the recording, in one commit

**Files:**
- Modify: `packages/record/src/operator-surface.ts` (finalize signature + doc)
- Modify: `packages/record/src/create.ts` (makeKernel wiring)
- Modify: `packages/record/src/kernel/finalize.ts` (signature, intake guard, batch)
- Test: `packages/record/test/consultations.test.ts` (extend with the seam pins)

**Interfaces:**
- Consumes: Task 1's `validateConsultations`/`PartitionedConsultations`,
  `FinalizeOptions`.
- Produces: `finalize(recordId, identity, content, facts, opts?)` on the operator
  surface; the variable-arity batch.

**Surface and recording land TOGETHER** — no commit accepts a consultation it silently
drops.

- [ ] **Step 1: Write the failing tests**

Append to `consultations.test.ts` (imports join the top: `create`, `createWithClock` if
needed, `MemoryStore`, `makeConfig`, `captureProfile`, `twoLegProfile`, `identity`,
`facts`, `openRecord`, `DEFAULT_SUBJECT_REF` — match the file conventions; a section
banner `// === the attach form at the seam (first step-5 increment) ===`):

```ts
const CONTENT = { subject: 'week-1', total: 40 };

test('the attach happy path: obtained consultations record in order, library-stamped, and a fail verdict is evidence, never a gate', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [
      { kind: 'risk-check', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
      {
        kind: 'llm-judge',
        checker: CHECKER,
        payloadDigest: DIGEST,
        verdict: 'fail',
        proofRef: 'trace:42',
      },
    ],
  });
  // SPEC §11.1: a non-required obtained consultation is "recorded as supplied —
  // including a `fail` verdict — as evidence, never a gate". No gate exists in the
  // first step-5 increment at all; finalize CONFIRMS.
  assert.equal(done.status, 'ok');

  const chain = await store.readChain(recordId);
  assert.equal(chain.length, 6); // opened, chain-verify, facts, risk-check, llm-judge, confirmed
  const [, , , third, fourth, confirmed] = chain;
  assert.ok(third !== undefined && fourth !== undefined && confirmed !== undefined);
  assert.equal(third.kind, 'consultation-recorded');
  assert.equal(fourth.kind, 'consultation-recorded');
  assert.equal(confirmed.kind, 'confirmed');

  // Supplied ORDER preserved; payload key-sets pinned (proofRef present-iff-supplied):
  const riskCheck = third.payload as Record<string, unknown>;
  const llmJudge = fourth.payload as Record<string, unknown>;
  assert.equal(riskCheck.kind, 'risk-check');
  assert.equal(llmJudge.kind, 'llm-judge');
  assert.deepEqual(Object.keys(riskCheck).sort(), [
    'at',
    'checker',
    'kind',
    'payloadDigest',
    'verdict',
  ]);
  assert.deepEqual(Object.keys(llmJudge).sort(), [
    'at',
    'checker',
    'kind',
    'payloadDigest',
    'proofRef',
    'verdict',
  ]);
  // Library-stamped recording time — the batch's single clock reading (§2.1):
  assert.equal(riskCheck.at, confirmed.at);
  assert.equal(llmJudge.at, confirmed.at);
  assert.equal(llmJudge.verdict, 'fail');

  // The existing replay fold and review projection carry them for free:
  const rec = await handles.operator.getRecord(recordId);
  assert.deepEqual(
    rec?.consultations.map((c) => c.kind),
    ['chain-verify', 'facts', 'risk-check', 'llm-judge'],
  );
  const view = await handles.operator.review(recordId);
  assert.equal(view.status, 'ok');
  if (view.status !== 'ok') return;
  assert.ok(view.value.consultations.some((c) => c.kind === 'llm-judge'));
});

test('an unreachable marker is inert this increment: validated, recorded nowhere, and finalize confirms', async () => {
  // SPEC §11.1: "an unreachable marker for a non-required kind is inert" — and no kind
  // can be required while requiredConsultations stays GOVERNED. The second step-5
  // increment's gate is the marker's consumer.
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [{ kind: 'sanctions', unreachable: true, authority: 'svc:sanctions' }],
  });
  assert.equal(done.status, 'ok');
  assert.equal((await store.readChain(recordId)).length, 4); // opened, chain-verify, facts, confirmed — nothing extra
});

test('a refusal path records no consultation: drifted content refuses with the chain untouched', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const out = await handles.operator.finalize(
    recordId,
    identity(),
    { subject: 'week-1', total: 999 },
    facts(),
    {
      consultations: [
        { kind: 'risk-check', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
      ],
    },
  );
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'content-drift');
  assert.equal((await store.readChain(recordId)).length, 1, 'opened only — evidence records on success alone');
});

test('the intake throw wins over the unknown-record throw: caller bugs throw identically regardless of record state', async () => {
  // SPEC §9: consultation shape "throws at argument intake, before anything is loaded".
  const handles = create(makeConfig([captureProfile()]));
  await assert.rejects(
    handles.operator.finalize('rec-none', identity(), CONTENT, facts(), {
      consultations: [
        { kind: 'k1', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
        { kind: 'k1', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
      ],
    }),
    /duplicate/i,
  );
});

test('unknown opts keys throw, and policy names its own build step', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  await assert.rejects(
    handles.operator.finalize(
      recordId,
      identity(),
      CONTENT,
      facts(),
      { policy: { digest: DIGEST } } as unknown as Parameters<typeof handles.operator.finalize>[4],
    ),
    /policy/i,
  );
  await assert.rejects(
    handles.operator.finalize(
      recordId,
      identity(),
      CONTENT,
      facts(),
      { nonsense: 1 } as unknown as Parameters<typeof handles.operator.finalize>[4],
    ),
    /finalize.*option|accepts only/i,
  );
});

test('the surface is leg-agnostic: a maker-leg finalize on a two-leg profile records its consultation', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile()], { store }));
  const makerId = await openRecord(handles, CONTENT, 'test.twoleg.v1', 'subject:attach-1', 'maker-decide');
  const done = await handles.operator.finalize(makerId, identity(), CONTENT, facts(), {
    consultations: [
      { kind: 'risk-check', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
    ],
  });
  assert.equal(done.status, 'ok');
  const rec = await handles.operator.getRecord(makerId);
  assert.ok(rec?.consultations.some((c) => c.kind === 'risk-check'));
});
```

- [ ] **Step 2: Run to verify failure — EXECUTE it**

Run: `pnpm exec vitest run packages/record/test/consultations.test.ts`
Expected: FAIL — finalize takes four arguments (TypeScript rejects the fifth, or the
runtime ignores it and the chain-length pins fail). Capture the actual failure output.

- [ ] **Step 3: Implement**

1. `operator-surface.ts`: `finalize(recordId, identity, content, facts, opts?)` — the
   fifth parameter typed `FinalizeOptions` (import from `./config.js`), the doc comment
   quoting §9's signature line and noting `opts.policy` stays guarded until its build
   step.
2. `create.ts`: `finalize: (recordId, identity, content, facts, opts) =>
   finalizeKernel(ctx, recordId, identity, content, facts, opts),`.
3. `kernel/finalize.ts`:
   - Signature gains `opts?: FinalizeOptions`.
   - FIRST statements of the body, BEFORE `store.readChain` (SPEC §9: intake throws
     land "before anything is loaded"):

```ts
  if (opts !== undefined) {
    for (const key of Object.keys(opts)) {
      if (key === 'consultations') continue; // REAL as of the first step-5 increment
      throw new Error(finalizeOptionMessage(key));
    }
  }
  const supplied = validateConsultations(opts?.consultations);
```

   with the per-key message helper (mirroring `open.ts`'s `openOptionMessage`):

```ts
/** Per-key message for a finalize() options key this build does not accept. */
function finalizeOptionMessage(key: string): string {
  if (key === 'policy') {
    return governedUnavailable(
      key,
      'the policy-drift gate is not implemented in this build; finalize() accepts no policy input. Contract: §10.3.',
    );
  }
  return governedUnavailable(
    key,
    'finalize() accepts only consultations in this build. Contract: §9 and §11.1.',
  );
}
```

   (`governedUnavailable` and `validateConsultations` imports join the file's imports;
   `FinalizeOptions` type import too.)
   - Rung (6): between `factsTransition` and `confirmedTransition`, build the supplied
     consultations (order preserved, `at: nowIso` — §2.1's single clock reading), chain
     prevHash through, and shift `confirmedTransition`'s seq/prevHash:

```ts
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
  const confirmedTransition: Transition = {
    recordId,
    seq: seqBase + 3 + suppliedTransitions.length,
    at: nowIso,
    kind: 'confirmed',
    payload: { actor: identity },
    prevHash: suppliedPrevHash,
  };
```

     and the batch call becomes
     `store.appendBatch('open', [cvTransition, factsTransition, ...suppliedTransitions, confirmedTransition], postBatch)`
     — when nothing is supplied, `suppliedPrevHash` is facts' digest and every seq
     matches today's, leaving the no-consultations batch byte-identical. Beside the
     `supplied.unreachable` non-use, ONE comment: markers are validated then inert —
     §11.1's "an unreachable marker for a non-required kind is inert", and no kind can
     be required while `requiredConsultations` stays GOVERNED; the second step-5
     increment's gate is the consumer.
   - Update the file-header doc: the batch sentence gains the §9 shape
     (`[chain-verify, facts, …obtained consultations, confirmed]`), and the argument
     count in any header prose moves truthfully.
4. `kernel/consultations.ts` needs no edits — but its header's forward sentence ("lands
   at finalize's rung (5.5) in the second step-5 increment") stays TRUE (the gate is
   still future) — verify, do not touch.

- [ ] **Step 4: Run tests, gates, commit**

Run the file, then `pnpm test` (zero skips — every existing finalize call site is
4-argument and stays valid), all five gates. ALSO verify (read, do not edit): the store
conformance suite's `appendBatch` coverage exercises arity >= 4 — the happy-path batch
here is 5 elements. If the conformance suite's largest batch is smaller, REPORT the gap
in your report's concerns (the store surface is frozen this increment; the gap routes to
the controller, never to a silent conformance edit). Commit (Bash):

```bash
git add -A packages/record
git commit -m "The attach form at the seam: opts.consultations recorded in the batch, markers inert

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: The record — step 5 starts

**Files:**
- Modify: `docs/process/implementation-status.md`
- Modify: `CLAUDE.md`, `README.md`
- Modify: stale comments the sweep finds
- No register edits expected (verify by READING `docs/process/deferral-register.md`)

**Interfaces:** consumes Tasks 1-2; the spec's §6 ("The record — step 5 starts") is the
checklist — verify every claim against CODE, never task reports.

- [ ] **Step 1: implementation-status.md**

Per the spec's §6, matching on content: steps table → step 5 **Started** (first of two
increments: the attach form; the gate + the availability class + the
`requiredConsultations` lift remaining, and step 5 exits with them). §11.1 row: the
attach half built (input surface, intake throw set, digest-only custody, library-stamped
recording time, inert markers, variable-arity batch recording), the gate half NOT built
(`consultation-failed`/`availability`/the `unavailable` status do not exist;
`consultation-missing` keeps its single facts-rung producer; rung (5.5) does not exist).
§9 row: finalize's documented five-argument signature real; `opts.policy` still
seam-guarded. §2.1/§4 rows only if they carry batch-arity claims (verify before
editing). **The governed count stays 7 — stated explicitly.** The freshness vacuity
argument (§11.1's own) recorded wherever freshness is mentioned.

- [ ] **Step 2: CLAUDE.md + README.md**

CLAUDE.md: step 5 started (first of two increments); "four of the eight build-order
steps remain unstarted" → **three (steps 6-8)** — verify the arithmetic against the
steps table before writing. README: same movement.

- [ ] **Step 3: The sweep**

```bash
git grep -nE "consultations|opts\b|attach|always available|first step-5|second step-5|requiredConsultations|consultation-missing|four of the eight|this increment|later increment|landing later" -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
git grep -nE "\(5\.5\)|seven-rung|order-pair|four arguments|fourth argument|facts\)\`" -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
```

(The second grep carries the structure-shaped tokens — the standing lesson: ladder and
signature claims live in files feature tokens never hit. `finalize-check-order.test.ts`'s
header enumerates rungs and an order-pair corpus total this increment does NOT change —
verify rather than assume; any file quoting finalize's signature or argument count is a
target.) Judge EVERY hit: still-true / fixed-by-earlier-tasks / fix-now /
historical-leave-alone. THE REPORT MUST SHOW HIT-COUNT == VERDICT-COUNT (number the
grep output; verdict every number). END-OF-INCREMENT OWN-COMMENT PASS:
`git diff 894624b..HEAD -- packages | grep -nE "landing later|later in the first step-5"`
— judge every hit.

- [ ] **Step 4: Verify quotes, gates, commit**

Hand-verify every quoted SPEC phrase in touched markdown whitespace-collapsed. All five
gates. Commit (Bash):

```bash
git add -A
git commit -m "Record step 5 started: the attach form is real, the gate is next

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
git diff 894624b..HEAD -- packages/record/test/byte-stability.test.ts   # MUST be empty
git diff 894624b..HEAD -- packages/record/src/chain/encoding.ts          # MUST be empty
git diff 894624b..HEAD -- packages/record/src/store/                     # MUST be empty
```

Any non-empty result ⇒ BLOCKED with the diff stat.

- [ ] **Step 3: Report**

The increment's commit list (`git log --oneline 894624b..HEAD` — 894624b is the spec
commit), exact counts, register rows live (read the file), step-5-Started confirmation
(read the steps table), and `git status -sb`'s ahead count for the user-gated push.
