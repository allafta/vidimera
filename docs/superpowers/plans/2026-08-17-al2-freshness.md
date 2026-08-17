# AL2 Freshness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land AL2 increment 3 of 3 — `observedAt` (recorded claim, signing-gated),
rung 5.5's freshness arm refusing the twenty-fourth code `consultation-stale`, and the
LAST GOVERNED guard lifting behind `validateFreshness` (governed count 1 → 0, the
guard era's end) — then the sanctioned sealed bundle and the record.

**Architecture:** The obtained-consultation input and the recorded `Consultation`
payload gain `observedAt?` (present-iff-supplied; digest- and signature-covered by
machinery untouched); the presence contract rides `opts.policy`'s exact
profile-resolution slot; the gate arm sits inside rung 5.5's effective-kinds loop
after verdict-pass; `validateFreshness` is the settled class with the AL2 dependency
made structural (`signing: true` required).

**Tech Stack:** TypeScript strict, vitest, Biome; pnpm workspace, Node >=22.16.

**Spec:** docs/superpowers/specs/2026-08-17-al2-freshness-design.md (0f55ee0). The
gate rulings and in-spec rulings bind. One bundle addition enumerated at pre-flight
(lesson 24): OQ §3's lead-in "Still open:" now heads three decided bullets — it joins
Task 2's edits.

## Global Constraints

- Code + tests: ONE commit (Task 1). The sealed bundle its OWN commit (Task 2). The
  record its own (Task 3). Verification only (Task 4).
- Five gates before every commit (scan LAST on the staged tree; escape-free
  SPEC-cited strings). PowerShell for pnpm (`$env:PATH = "$env:APPDATA\npm;$env:PATH"`
  first); git via the Bash tool; branch `main`.
- Frozen, NO exceptions: `src/store/`, `chain/encoding.ts`,
  `test/byte-stability.test.ts`, `src/signing/` (untouched this increment — the new
  payload byte is covered automatically). `docs/concept/` untouched by Tasks 1 and 3;
  Task 2 changes EXACTLY the bundle below.
- Comments: explicit increment naming ("the AL2 freshness increment"); never bare
  "this increment"; PRESENT-TENSE producers (everything lands in Task 1's commit);
  the guard era's end is the headline — every "one guard remains"-class comment
  Task 1 can reach in code finalizes; Task 3 sweeps the docs.
- RED EXECUTED. Trailer: Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

---

### Task 1: observedAt, the gate arm, the last lift — code and tests

**Files:**
- Modify: `packages/record/src/types.ts` (`Consultation.observedAt?: string` with the
  §14-admission reading comment)
- Modify: `packages/record/src/kernel/consultations.ts` (OBTAINED_KEYS + the
  structural observedAt check; the marker shape unchanged)
- Modify: `packages/record/src/kernel/finalize.ts` (the presence contract beside
  `opts.policy`'s; the freshness arm in rung 5.5's loop; header rung prose)
- Modify: `packages/record/src/config.ts` (delete the `freshness` GOVERNED throw —
  the LAST; add `validateFreshness`; the `validateProfile` header's governed
  narrative takes its terminal form)
- Modify: `packages/record/src/refusal-codes.ts` (the twenty-fourth code)
- Test: create `packages/record/test/freshness.test.ts`; modify
  `packages/record/test/outcome-model.test.ts` + `refusal-matrix.test.ts` (23 → 24 in
  one move + the new section, present-tense producer);
  `packages/record/test/construction-validation.test.ts` (the freshness-GOVERNED test
  inverts; the guard-sweep-total test takes its TERMINAL form — the fully-loaded
  profile constructs; the inversion argued in place per the file's numbered
  convention)

**Interfaces:**
- Consumes: rung 5.5's loop (finalize.ts:~373-411); the policy presence contract's
  slot (~:197-208); `refuseMaybeAppend`; `validateRequiredConsultations`'s shape as
  the settled-class template; `createWithClock` for test clocks; the signing test
  fixtures' Ed25519 pattern (signing.test.ts) for signing-profile fixtures.
- Produces: `Consultation.observedAt?: string`;
  `validateFreshness(profile, leg)`; the `consultation-stale` code; the freshness arm.

- [ ] **Step 1: Write the failing tests**

Create `packages/record/test/freshness.test.ts`:

```ts
// @vidimera/record — freshness.test.ts (SPEC §11.1 "Recording-time, not
// observation-time" + §14's authority-timestamp admission; the AL2 freshness
// increment, third of three — the increment that ends the guard era): the
// recorded-claim, signing-gated observedAt; rung 5.5's freshness arm refusing
// consultation-stale; the last GOVERNED lift. The library gates on the recorded,
// signature-covered CLAIM — it never verifies the observation happened then; that
// genuineness is proofRef plus the operator-assurance probes.

import { generateKeyPairSync, sign as edSign, verify as edVerify } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConfirmProfile } from '../src/config.js';
import { create, createWithClock } from '../src/create.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  captureProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const CHECKER = { principal: 'svc:risk', authority: 'mtls:risk' };
const DIGEST = `sha256:${'a'.repeat(64)}`;
const T0 = new Date('2026-08-17T10:00:00.000Z');

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const signer: Signer = async (bytes) => ({
  keyRef: 'key-1',
  signature: edSign(null, bytes, privateKey).toString('base64'),
});
const verifier: Verifier = async (bytes, signature) =>
  edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));

/** A signing profile with one required, freshness-bounded kind (3600s). */
function freshProfile(id = 'test.fresh.v1'): ConfirmProfile {
  const p = captureProfile({ id });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  return {
    ...p,
    signing: true,
    legs: [{ ...leg, requiredConsultations: ['risk-check'], freshness: { 'risk-check': 3600 } }],
  };
}

function freshSetup(profiles: ConfirmProfile[] = [freshProfile()], at: Date = T0) {
  const store = new MemoryStore();
  const config = {
    ...makeConfig(profiles, { store }),
    signing: {
      signer,
      verifiers: { 'key-1': verifier },
      signatures: new MemorySignatureStore(),
    },
  };
  return { store, handles: createWithClock(config, () => at) };
}

function obtained(observedAt?: string) {
  return {
    consultations: [
      {
        kind: 'risk-check',
        checker: CHECKER,
        payloadDigest: DIGEST,
        verdict: 'pass' as const,
        ...(observedAt === undefined ? {} : { observedAt }),
      },
    ],
  };
}

test('a fresh observedAt passes, records into the signed payload; a stale one refuses consultation-stale and the seam re-arms', async () => {
  const { handles } = freshSetup();
  const recordId = await openRecord(handles, CONTENT, 'test.fresh.v1', 'subject:fr-1');

  const stale = await handles.operator.finalize(
    recordId,
    identity(),
    CONTENT,
    facts(),
    obtained('2026-08-17T08:00:00.000Z'), // two hours old vs the 3600s bound
  );
  assert.equal(stale.status, 'refused');
  if (stale.status === 'refused') assert.equal(stale.code, 'consultation-stale');
  assert.equal((await handles.operator.getRecord(recordId))?.state, 'open', 'open for re-run');

  const fresh = await handles.operator.finalize(
    recordId,
    identity(),
    CONTENT,
    facts(),
    obtained('2026-08-17T09:45:00.000Z'), // 15 minutes old
  );
  assert.equal(fresh.status, 'ok', 'the seam re-armed; a fresh claim confirms');

  const chain = await handles.operator.readChain(recordId);
  const consult = chain.find(
    (t) =>
      t.kind === 'consultation-recorded' &&
      (t.payload as { kind?: unknown }).kind === 'risk-check',
  );
  assert.ok(consult !== undefined);
  const payload = consult.payload as Record<string, unknown>;
  assert.equal(payload.observedAt, '2026-08-17T09:45:00.000Z', 'the claim records verbatim');
});

test('fail-closed: a MISSING observedAt on the bounded kind refuses; a FUTURE one refuses; an unbounded required kind ignores it', async () => {
  const { handles } = freshSetup();
  const r1 = await openRecord(handles, CONTENT, 'test.fresh.v1', 'subject:fr-2');
  const missing = await handles.operator.finalize(r1, identity(), CONTENT, facts(), obtained());
  assert.equal(missing.status, 'refused');
  if (missing.status === 'refused') assert.equal(missing.code, 'consultation-stale');

  const future = await handles.operator.finalize(
    r1,
    identity(),
    CONTENT,
    facts(),
    obtained('2026-08-17T11:00:00.000Z'),
  );
  assert.equal(future.status, 'refused');
  if (future.status === 'refused') assert.equal(future.code, 'consultation-stale');

  // Unbounded required kind: same profile shape but NO freshness record — observedAt
  // present is recorded evidence, never gated.
  const base = freshProfile('test.fresh.free.v1');
  const leg0 = base.legs[0];
  if (leg0 === undefined) throw new Error('fixture');
  const { freshness: _dropped, ...freeLeg } = leg0;
  const { handles: h2 } = freshSetup([{ ...base, legs: [freeLeg] }]);
  const r2 = await openRecord(h2, CONTENT, 'test.fresh.free.v1', 'subject:fr-3');
  const out = await h2.operator.finalize(
    r2,
    identity(),
    CONTENT,
    facts(),
    obtained('2026-08-17T01:00:00.000Z'), // ancient — but unbounded
  );
  assert.equal(out.status, 'ok');
});

test('terminalRefusals can end the leg on consultation-stale', async () => {
  const base = freshProfile('test.fresh.term.v1');
  const leg0 = base.legs[0];
  if (leg0 === undefined) throw new Error('fixture');
  const { handles } = freshSetup([
    { ...base, legs: [{ ...leg0, terminalRefusals: ['consultation-stale'] }] },
  ]);
  const recordId = await openRecord(handles, CONTENT, 'test.fresh.term.v1', 'subject:fr-4');
  const out = await handles.operator.finalize(
    recordId,
    identity(),
    CONTENT,
    facts(),
    obtained('2026-08-17T08:00:00.000Z'),
  );
  assert.equal(out.status, 'refused');
  const rec = await handles.operator.getRecord(recordId);
  assert.equal(rec?.state, 'refused');
  assert.equal(rec?.refusalCode, 'consultation-stale');
});

test('the presence contract: a NON-signing profile refuses observedAt at profile-resolution depth; intake rejects malformed shapes', async () => {
  const store = new MemoryStore();
  const plain = captureProfile({ id: 'test.fresh.plain.v1' });
  const leg0 = plain.legs[0];
  if (leg0 === undefined) throw new Error('fixture');
  const handles = create(
    makeConfig([{ ...plain, legs: [{ ...leg0, requiredConsultations: ['risk-check'] }] }], {
      store,
    }),
  );
  const recordId = await openRecord(handles, CONTENT, 'test.fresh.plain.v1', 'subject:fr-5');
  await assert.rejects(
    handles.operator.finalize(
      recordId,
      identity(),
      CONTENT,
      facts(),
      obtained('2026-08-17T09:00:00.000Z'),
    ),
    /observedAt|signing|AL1/i,
  );

  // Intake, argument depth (before anything loads): malformed observedAt; a marker
  // carrying observedAt is the unknown-key throw.
  const { handles: h2 } = freshSetup();
  const r2 = await openRecord(h2, CONTENT, 'test.fresh.v1', 'subject:fr-6');
  await assert.rejects(
    h2.operator.finalize(r2, identity(), CONTENT, facts(), {
      consultations: [
        {
          kind: 'risk-check',
          checker: CHECKER,
          payloadDigest: DIGEST,
          verdict: 'pass',
          observedAt: 'not-a-time',
        },
      ],
    } as never),
    /observedAt/i,
  );
  await assert.rejects(
    h2.operator.finalize(r2, identity(), CONTENT, facts(), {
      consultations: [
        { kind: 'risk-check', unreachable: true, authority: 'svc:risk', observedAt: T0.toISOString() },
      ],
    } as never),
    /unknown key|observedAt/i,
  );
});
```

Count pins: `outcome-model.test.ts` + `refusal-matrix.test.ts` move 23 → 24 in one
edit each place the count appears (numeric, the word, the arithmetic — re-sum). New
matrix section for `consultation-stale`, its own header, `refusal`-class, default
`appendsOn` (the `consultation-failed` family's open-by-default-for-re-run register,
quoting §8's row prose "can only fire with authority timestamps" — verify verbatim),
producer PRESENT-TENSE (rung 5.5's freshness arm, this same commit).

`construction-validation.test.ts`:
- The freshness-GOVERNED test INVERTS (the file's numbered convention — read the
  sequence, take the next number, argue in place: the arm and the lift land in the
  same commit).
- New settled-class pins: freshness without `signing: true` throws; a key not in the
  leg's required set throws; `'eligibility'` as a key legal iff the leg declares
  `eligibility` and throws otherwise; zero/negative/fractional seconds throw; an
  empty `freshness` record throws.
- The guard-sweep-total test takes its TERMINAL form: a FULLY-LOADED two-leg profile
  declaring every once-governed field — `captureMode: 'live'`, `signing: true`,
  `redeem: { reverify: true }`, per-leg `requiredConsultations`, `eligibility`,
  leg-2 `sod: { notActorOf: [...] }` + `proposer`, `ackMode`/`requiredAcks`,
  `freshness` — constructs cleanly under a full signing config. The comment narrates
  the era's end: every guard the kernel increment installed has lifted behind its own
  behavior; no per-field `governedUnavailable` caller remains (the generic
  unknown-key throws survive — say where). Build the fixture carefully against every
  validator (live needs every-leg requiredConsultations; sod names a strictly-earlier
  leg; freshness keys ⊆ that leg's required kinds; eligibility not double-declared).

- [ ] **Step 2: Run to verify failure — EXECUTE it**

`pnpm exec vitest run packages/record/test/freshness.test.ts` — FAIL:
GOVERNED(freshness) at construction. Capture output.

- [ ] **Step 3: Implement**

1. `types.ts` — `Consultation` gains:

```ts
  /** SPEC §14's AL2 admission — "authority timestamps carried inside the digested
   * payload": the checker-claimed OBSERVATION time, distinct from the library-stamped
   * recording time `at` (which never changes). Present iff the host supplied it —
   * legal only on a signing profile (the presence contract at finalize), so the
   * recorded claim is digest- AND signature-covered. The library gates on the
   * recorded claim (rung 5.5's freshness arm, the AL2 freshness increment); it never
   * verifies the observation happened then — genuineness is proofRef and the
   * operator-assurance probes. §2's Consultation table lists the AL1 shape; this
   * field lands under §14's own admission, an anticipated AL2 extension rather than
   * a recorded divergence. */
  observedAt?: string;
```

2. `kernel/consultations.ts` — `OBTAINED_KEYS` gains `'observedAt'`; after the
   `proofRef` check:

```ts
    if (record.observedAt !== undefined) {
      if (typeof record.observedAt !== 'string' || Number.isNaN(Date.parse(record.observedAt))) {
        throw new Error(
          `finalize: consultations[${index}] (obtained '${kind}') has an unparseable observedAt — ` +
            'the authority-claimed observation time is an RFC 3339 timestamp (SPEC §14, §11.1)',
        );
      }
    }
```

   The MARKER key-set is untouched (an `observedAt` on a marker stays the
   unknown-key throw — no observation happened). The `ObtainedConsultation` type (this
   file) gains `observedAt?: string`, and the partition's push carries it; the
   recording path — wherever the obtained consultation's payload object is built for
   the batch (follow `proofRef`'s present-iff-present idiom) — rides it identically,
   which is what the presence contract and the gate arm read downstream.

3. `kernel/finalize.ts` —
   (a) The presence contract, beside `opts.policy`'s (profile-resolution depth,
   after chain-verify/unknown-profile):

```ts
  // SPEC §11.1/§14 (the AL2 freshness increment): an authority-claimed observation
  // time is admitted ONLY where the signature layer covers it — a non-signing
  // profile supplying observedAt is AL1's clock-trust posture violated, a caller
  // error that throws (the opts.policy presence-contract precedent, same depth and
  // ordering: chain-compromise and unknown-profile outrank it).
  if (resolved.profile.signing !== true) {
    const carrier = supplied.obtained.find((entry) => entry.observedAt !== undefined);
    if (carrier !== undefined) {
      throw new Error(
        `finalize: consultations '${carrier.kind}' carries observedAt but profile '${record.profileId}' ` +
          'does not declare signing — AL1 does not accept a caller-supplied observation time ' +
          '(clock trust, SPEC §11.1; the AL2 admission is §14)',
      );
    }
  }
```

   (Place after `supplied` is partitioned and the profile resolved; adapt the
   variable names to the file.)
   (b) The freshness arm, inside rung (5.5)'s loop, AFTER the verdict-fail check:

```ts
      // SPEC §11.1's freshness gate (the AL2 freshness increment): a bounded required
      // kind demands an evaluable, sane, in-bound observation claim — missing, future,
      // or out-of-bound refuses `consultation-stale`, fail-closed, open-by-default
      // for re-run with a fresh consultation (the family's own register). The gate
      // reads the RECORDED claim; §11.1's recording-time sentence stands untouched.
      const bound = leg.freshness?.[requiredKind];
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
```

   (c) The header's rung prose: rung (5.5) description gains the freshness arm; any
   "governed"/"freshness stays" comment in the file finalizes.

4. `config.ts` — delete the `freshness` GOVERNED throw (the LAST per-field guard);
   add beside the other settled validators:

```ts
/**
 * SPEC §11.1's freshness bounds (the AL2 freshness increment — the LAST governed
 * lift; the guard era the kernel increment opened ends here). AL2-dependent made
 * structural: only a signing profile may declare freshness ("meaningful only for
 * consultation kinds that carry such an authority-supplied time" — and the claim is
 * only tamper-evident under the signature layer). Keys must be bounded-able: each a
 * required kind of the same leg (or the implicit 'eligibility' where declared) — the
 * subset rule also excludes the reserved kinds by construction, since they can never
 * be required. Values are positive integer seconds (the ttl convention).
 */
function validateFreshness(profile: ConfirmProfile, leg: LegSpec): void {
  if (leg.freshness === undefined) return;
  if (profile.signing !== true) {
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' declares freshness without profile signing — ` +
        'freshness gates a recorded observation claim, tamper-evident only under the AL2 signature layer (SPEC §11.1, §14)',
    );
  }
  const entries = Object.entries(leg.freshness);
  if (entries.length === 0) {
    throw new Error(
      `invalid profile '${profile.id}': leg '${leg.id}' declares an empty freshness record — ` +
        'the control must bound at least one kind (non-empty by the fail-closed ruling)',
    );
  }
  const boundable = new Set(leg.requiredConsultations ?? []);
  if (leg.eligibility !== undefined) boundable.add('eligibility');
  for (const [kind, seconds] of entries) {
    if (typeof kind !== 'string' || kind.length === 0 || !boundable.has(kind)) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' bounds freshness of '${kind}', which is not a ` +
          "required kind of this leg — a bound on a never-gated kind is declarable-but-inert (the fail-closed ruling)",
      );
    }
    if (!Number.isInteger(seconds) || seconds <= 0) {
      throw new Error(
        `invalid profile '${profile.id}': leg '${leg.id}' bounds '${kind}' at ${String(seconds)} — ` +
          'a freshness bound is a positive integer of seconds (the ttl convention)',
      );
    }
  }
}
```

   Call it in the per-leg validator sequence. The `validateProfile` header's governed
   narrative takes its TERMINAL form: zero per-field guards remain; the era narrated
   with the movement (1 → 0, the AL2 freshness increment); `governedUnavailable`
   survives only for the generic unknown-key throws (name the callers).

5. `refusal-codes.ts` — `consultation-stale` joins the union (beside
   `consultation-failed`) and `REGISTRY` as `'refusal'`; default `appendsOn`;
   NEVER_APPENDS untouched; producer comment present-tense.

- [ ] **Step 4: Run tests, gates, commit**

Targeted runs, full suite, five gates. Commit:

```bash
git add -A packages/record
git commit -m "AL2 freshness: the recorded claim gates, and the last guard lifts

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: The sanctioned sealed bundle

**Files:** `docs/concept/SPEC.md`, `docs/concept/CONTROLS.md`,
`docs/concept/OPEN-QUESTIONS.md` — EXACTLY these edits (locate by content; every
other character survives). The never-edit rule is LIFTED for exactly this commit and
bundle; it re-arms after.

- [ ] **Step 1: The four tokens**

1. SPEC ~527: `| [SKETCHED — AL2-dependent] |` → `| [PROVEN] |` (the row's prose
   "can only fire with authority timestamps" stays — still true).
2. SPEC ~634: `**[SKETCHED]**` → `**[PROVEN]**` (the trailing clause stays whole).
3. SPEC ~951: `is [SKETCHED] and AL2-dependent:` → `is [PROVEN] and AL2-dependent:`.
4. CONTROLS ~47: the cell `SKETCHED (AL2-dependent)` → `PROVEN (AL2-dependent)`.

- [ ] **Step 2: The OQ tails and completions**

1. OQ §4 (~:71-77, one paragraph): append after "…gets its own bound.":
   ` **Decided (this build):** freshness-eligible kinds are the leg's own required
   kinds (or the implicit eligibility where declared) — the freshness keys must be a
   subset, and a bounded kind whose input lacks observedAt, or claims a future one,
   refuses consultation-stale fail-closed. No in-attempt re-entry — inputs are fixed
   per finalize call; the refusal leaves the record open and the seam re-arms per
   invocation. Facts gets no own bound — the facts consultation is library-stamped at
   the finalize instant, so recording is observation there; a host wanting
   surface-age gating models its renderer as an ordinary timestamped kind.`
   (Write code identifiers — `observedAt`, `consultation-stale`, `facts` — with the
   document's inline backticks; reflow to the file's width.)
2. OQ §1's fourth tail: `**Still open:** the AL2 freshness increment's own design —
   see §4 below.` → `**Decided (this build):** the recorded-claim, signing-gated
   design — see §4 below.`
3. OQ §1's granularity tail (the parked pointer): `the version-discipline violation
   §2's convention names` → `the version-discipline violation SPEC §2's convention
   names` (ONE word inserted, disambiguating from OQ's own §2).
4. OQ §3's lead-in (~:56): `Still open:` → `Open at that writing:` (the §7-opener
   class — its three bullets all carry Decided tails).

- [ ] **Step 3: Byte-verify, gates, commit**

`git diff -- docs/concept/` shows ONLY the four token pairs and the four OQ edits.
`grep -rn "SKETCHED" docs/concept/` afterwards: survivors are AL3 + the self-test
rows + legends + live-capture §9.2 prose ONLY — LIST them; zero
freshness/consultation-stale/AL2 hits. Five gates. Commit (Bash):

```bash
git add docs/concept/SPEC.md docs/concept/CONTROLS.md docs/concept/OPEN-QUESTIONS.md
git commit -m "Move the freshness markers and complete OQ 1 and 4: four tokens, the tails, the pointer

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: The record — AL2 whole, the guard era ends

**Files:** `docs/process/implementation-status.md`,
`docs/process/deferral-register.md` (row 17), `CLAUDE.md`, `README.md`, stale
comments the sweep finds. `docs/concept/` sealed again.

- [ ] **Step 1: implementation-status.md** — per the spec's §2: step 8 row (AL2
  WHOLE across three increments; the tail = the self-test tier alone, OQ §5); the
  §11.1 row (freshness real: the design, the three OQ §4 answers, the recorded-claim
  limit stated); §8 row (twenty-four codes); §14 row (authority timestamps decided;
  the fourth tail completed); the Consultation-extension reading recorded; **the
  governed count 1 → 0 with the era narrated as the discipline's own exit**; the
  terminal guard-sweep inversion in the numbered sequence; every prior row's
  "freshness … stays/waits/remains" cell finalized (lesson 21).
- [ ] **Step 2: register row 17** (AL2 whole; the tail = the self-test tier) +
  CLAUDE.md (the guards paragraph's terminal sentence — zero governed fields, the
  era closed at the AL2 freshness increment; twenty-four codes where counts appear)
  + README (same movement).
- [ ] **Step 3: The sweep — LAST**

```bash
git grep -nE 'freshness|observedAt|consultation-stale|twenty-three|governed|cannot fire|unfireable|vacuous|vacuity|Still open|AL2-dependent|this increment|later increment|landing|will |not yet' -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
git grep -nE 'SKETCHED|last guard|one guard|1 guard|down to (one|1|zero|0)|remains governed|remain governed|stays governed|stays GOVERNED' -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
```

Judge EVERY hit; HIT-COUNT == VERDICT-COUNT from THIS run. (The second grep is
repo-wide including code — CLAUDE.md's and config.ts's guard narratives BOTH move.)
- [ ] **Step 4:** quotes hand-verified; five gates; commit
  ("Record AL2 whole: the guard era ends at zero").

---

### Task 4: Exit verification

**Files:** none modified.

- [ ] **Step 1:** porcelain empty, `main`, ALL FIVE gates by name, exact counts.
- [ ] **Step 2: Freeze (against the spec commit 0f55ee0)**

```bash
git diff 0f55ee0..HEAD -- packages/record/test/byte-stability.test.ts   # MUST be empty
git diff 0f55ee0..HEAD -- packages/record/src/chain/encoding.ts          # MUST be empty
git diff 0f55ee0..HEAD -- packages/record/src/store/                     # MUST be empty
git diff 0f55ee0..HEAD -- packages/record/src/signing/                   # MUST be empty
git diff 0f55ee0..HEAD -- docs/concept/                                  # EXACTLY the bundle: 4 token pairs + 4 OQ edits
```

Any other content ⇒ BLOCKED with the diff stat.
- [ ] **Step 3: Report** — commit list, exact counts, `git grep -c governedUnavailable
  -- packages/record/src/config.ts` (the per-field-guard zero-line, generic callers
  listed), register rows (17 quoted), the step-8 cell, ahead count.
