# Effect-Result Notarization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the effect-result increment — the redemption family gains one options bag (`tx` moving in), and a GOVERNED `redeem.result` declaration admits a host-claimed result digest that binds inside the `redeemed` payload as `resultDigest`, present-iff-supplied, at the two seams where the outcome is knowable.

**Architecture:** Task 1 is a behavior-preserving surface refactor needing no sanction (SPEC states no redemption argument list; §9 licenses operator-only bag growth). Tasks 2–6 land the capability: a profile declaration guarded literal-`true`, shape validation at argument intake, an admission gate at profile-resolution depth, the payload key in both redemption shapes, and the replay fold. Nothing gates on the binding; zero new refusal codes, kinds, or states.

**Tech Stack:** TypeScript (NodeNext, strict), vitest 4, the existing test helpers.

**Spec:** `docs/superpowers/specs/2026-08-21-effect-result-design.md`

## Global Constraints

- **THE SANCTION GATE:** Tasks 2 and 6 edit `docs/concept/` (exactly the design doc's §7 scope: SPEC §§4, 9.1, 11.2; CONTROLS §§3, 5; GLOSSARY). Executable ONLY under the maintainer's explicitly granted fresh sanction for this increment. Not granted → STOP before Task 2. **Task 1 needs no sanction and touches no `docs/concept/` file.**
- Two sealed constraints bind the options bag and must not be violated: SPEC §12 — the transaction field stays the driver's own handle type (`tx?: unknown`), never a library-owned transaction interface; SPEC §11.2 — "It carries no identity argument", so the bag must NEVER gain an identity field (adding one would be a fork, not an edit).
- `packages/record/test/byte-stability.test.ts` is FROZEN — asserted green, never edited. `packages/record/test/cross-backing-byte-identity.test.ts` DOES drive a real redemption (via `test/helpers/byte-identity-flows.ts:91-93`): it is the second oracle proving a non-supplying chain did not move. Assert it green; never adjust it to accommodate a change.
- Zero new refusal codes (registry stays 24), zero new `TransitionKind`s/`RecordState`s. Every new failure mode is a caller-error THROW.
- Node floor `>=22.16`; ESM; `@vidimera/record` keeps zero runtime dependencies.
- Gates at every commit: `./node_modules/.bin/vitest run` (zero skips), `./node_modules/.bin/tsc --noEmit -p packages/record` AND `-p packages/store-postgres` (there is NO root tsconfig), `./node_modules/.bin/biome check .`, `node scripts/contract-scan.mjs` exit 0, `node scripts/api-reference-sync.mjs` exit 0. `node scripts/smoke-pack.mjs` at Tasks 1 and 5 (the exported surface moves in both). Never call `pnpm`.
- Commit messages via `git commit -F <msgfile>` where the message file is written with the **Write tool** — PowerShell `Set-Content` prepends a BOM that corrupts subjects. Insert no special bytes. Verify the branch before each commit. Never push.

---

### Task 1: The surface refactor — one options bag, `tx` moves in (no sanction)

**Files:**
- Modify: `packages/record/src/config.ts` (new `RedeemOptions`), `packages/record/src/kernel/redeem.ts` (three signatures + internal `tx` extraction), `packages/record/src/operator-surface.ts` (three signatures), `packages/record/src/create.ts` (three delegations), `packages/record/src/index.ts` (export `RedeemOptions`)
- Modify (11 call sites): `packages/record/test/redeem.test.ts` (lines ~140, ~183, ~233, ~264, ~298-302), `packages/record/test/redeem-token.test.ts` (~728, ~752, ~759-764, ~778, ~796-801), `packages/record/test/clocks.test.ts` (~216)
- Modify (docs move with the surface): `docs/guide/api-reference.md` (the operator-surface fence + `RedeemOptions` named for the api-sync gate), `docs/guide/integrating.md` (~305-309, the fence whose comment describes "the optional third argument")
- Modify: `docs/process/deferral-register.md` (row 16 updated in place — it is already the `tx`-on-token-halves record; do NOT add a new row)

**Interfaces:**
- Produces: `RedeemOptions { tx?: unknown }` exported from `index.ts` beside `FinalizeOptions`/`DeclineOptions`; `redeem(recordId, content, opts?)`, `beginRedemption(recordId, content, opts?)`, `completeRedemption(recordId, token, content, opts?)` on `OperatorSurface`, kernel counterparts taking `opts?` after their existing positional args. Task 3 adds `result` to the same interface.

- [ ] **Step 1: Add the interface.** In `config.ts`, beside `FinalizeOptions`/`DeclineOptions` (read their placement first):

```ts
/**
 * The redemption seams' options bag (SPEC §11.2, §12; this build's own shape — SPEC
 * states no redemption argument list, and §9 licenses growth through the operator-only
 * bags). `tx` moved in from a trailing positional parameter at the effect-result
 * increment; deferral-register row 16 is its record.
 */
export interface RedeemOptions {
  /** SPEC §12's caller-transaction seam: the DRIVER'S OWN transaction handle. Typed
   * `unknown` deliberately — §12 requires the concrete type stay the driver's, "never
   * abstracted behind a library-owned transaction interface", so this field must never
   * become a library transaction type. When supplied, the append is enlisted and
   * commits or rolls back with the host's own write. */
  tx?: unknown;
}
```

- [ ] **Step 2: Move the three kernel signatures.** In `kernel/redeem.ts`, each of `redeem`, `beginRedemption`, `completeRedemption` replaces its trailing `tx?: unknown` with `opts?: RedeemOptions`, and extracts once at the top of the body, immediately before the `prologue()` call:

```ts
  const tx = opts?.tx;
```

  Every downstream use (the `prologue(ctx, seam, recordId, tx)` call, the `refuseCorrespondenceMismatch(..., tx)` calls, the `store.appendTransition(..., meta, tx)` calls, the `tx !== undefined` branch predicates) then reads that local and is otherwise UNCHANGED — nine positional pass-throughs in total. `prologue()` and `refuseCorrespondenceMismatch()` keep their own positional `tx` parameters (they are file-internal helpers, not the public seam). Import `RedeemOptions` from `../config.js`.

- [ ] **Step 3: Move the surface and wiring.** `operator-surface.ts`'s three seams take `opts?: RedeemOptions` in place of `tx?: unknown`; move each existing `tx` comment onto the bag's own line, noting the field. `create.ts`'s three delegations become `(recordId, content, opts) => redeemKernel(ctx, recordId, content, opts)` and so on. `index.ts` exports `RedeemOptions` in the same type-export block and style as `FinalizeOptions` (read it; keep alphabetical order if that block is alphabetical).

- [ ] **Step 4: Update the 11 tx-passing call sites.** Each `redeem(recordId, CONTENT, store.database)` becomes `redeem(recordId, CONTENT, { tx: store.database })`; likewise `sqlite.database`, and the multi-line `completeRedemption(recordId, token, CONTENT, sqlite.database)` forms become `..., { tx: sqlite.database })`. Do NOT touch the 91 call sites that pass no `tx` — they are unaffected by construction, and any diff there is a defect.

- [ ] **Step 5: Move the guide with the surface.** In `api-reference.md`'s operator-surface code fence, update the three signatures and name `RedeemOptions` (the api-sync gate requires every `index.ts` export to occur in that file). In `integrating.md` (~305-309), reword the comment that says "the optional third argument threads through to the store" to describe the bag, and update the sample line to `await operator.redeem(recordId, content /*, { tx } */)` (or the equivalent that reads naturally — the executed-sample discipline applies to any fence you make executable).

- [ ] **Step 6: Update deferral-register row 16 in place.** Read the row; amend its text so it records that `tx` now rides `RedeemOptions` rather than a trailing positional parameter, keeping its trigger/date columns intact.

- [ ] **Step 7: Gates.** FULL suite (the existing suite IS the refactor's whole gate — 11 rewritten call sites, 91 untouched, zero behavior change), both typechecks, biome, contract-scan, api-sync, and `node scripts/smoke-pack.mjs` (the exported surface moved).

- [ ] **Step 8: Commit.** Subject: `Effect-result 1/6: the redemption family gains one options bag — tx moves in, behavior-preserving`. Body: note that SPEC states no redemption argument list and §9 licenses bag growth, so no sanction was needed; name register row 16.

### Task 2: The sanctioned sealed-set text lands `[DESIGNED]`

**Files:**
- Modify: `docs/concept/SPEC.md` (§4 one payload row, §9.1 the redeem-block coverage, §11.2 one block)
- Modify: `docs/concept/CONTROLS.md` (§3 one row, §5 one row)
- Modify: `docs/concept/GLOSSARY.md` (one entry)

**Interfaces:**
- Produces: the normative text Tasks 3–5 cite. Markers move at Task 6.

- [ ] **Step 1: Confirm the sanction grant is on record.** Not granted → STOP.

- [ ] **Step 2: SPEC §4 — the payload table.** The `redeemed` row currently reads:

```
| `redeemed` | `{ via: 'direct' }` or `{ via: 'token', tokenDigest }` — the completed redemption and how it was closed (effect-seam profiles only, §11.2) | delta |
```

  Splice minimally so both shapes carry the optional key and the marker rides the addition — e.g. `` `{ via: 'direct', resultDigest? }` or `{ via: 'token', tokenDigest, resultDigest? }` `` with the tail gaining `` ; `resultDigest` present iff supplied under a `result`-declaring profile (§11.2) **[DESIGNED]** ``. Leave the `redeeming` and `redemption-failed` rows untouched.

- [ ] **Step 3: SPEC §9.1 — the redeem block.** Read the row(s) covering `confirmToRedeem`/`redeemBound`/`reverify` and add `result` in the same shape: a per-profile literal-`true` declaration admitting a result digest at the redemption seams (§11.2), **[DESIGNED]**, with the note that declaring anything other than the literal `true` is a construction error (the `signing` rule's class).

- [ ] **Step 4: SPEC §11.2 — the semantics block.** Read §11.2 in full first; place this after the direct/token shape paragraphs and before the honest-bound tail (match the section's own paragraph style):

```markdown
**Result notarization (`resultDigest`) [DESIGNED].** A profile declaring `redeem.result`
(§9.1) admits an optional host-claimed outcome digest at the two seams where the outcome
is knowable when the coupling closes: the enlisted direct shape, whose edge commits with
the host's own effect write (§12), and the token shape's completion, which the separated
executor calls when it executes. Issuance admits none — a result at
`redeeming`-minting time would be a claim about an unexecuted effect, and supplying one
there is a caller error. The declaration **admits** the field rather than requiring it: a
declaring profile that supplies nothing records nothing, and supplying one on a
non-declaring profile is a caller error (deliberately unlike §10.3's mandatory policy
contract — a result the host does not know cannot be manufactured, and absence here is
self-evidently non-evidence, where policy absence would leave a declared gate unrun).
Custody is digest-only: the host digests its own result content and the library never
sees it. The binding lands inside the `redeemed` payload (§4), never as a later append —
C3 admits no state-leaving append after a terminal state, and the state-preserving
`sealed` cap is not a growth point. Declaring `result` declares the effect seam, as any
`redeem` block does (§9.1's predicate keys on the block's presence): there is nothing to
notarize without a redemption. Nothing gates on the binding.

Its bound, in the same breath: this notarizes **that the host asserted this outcome,
digest-bound, when it closed the coupling** — no more. The library does not observe the
effect (it executes nothing and sees nothing that bypasses the seam), does not verify the
claim (a host binding a false digest is recorded faithfully binding a false digest —
fidelity, not validity; verifying it would make the library the business system), and
does not mirror later business state (a result true at completion may be reversed
afterward). It is meaningful only where the outcome is genuinely known at the call; in a
gate-then-execute flow the outcome is unknown at redemption time, and the library cannot
tell the difference — which is why that discipline is stated rather than enforced.
```

- [ ] **Step 5: CONTROLS.md.** §3, after the redemption row, matching its exact columns:

```markdown
| Effect-result notarization | `redeem.result` | §11.2's host-claimed outcome digest bound inside the `redeemed` payload at the enlisted direct seam and token completion; record-only | DESIGNED | Notarizes the host's claim at the seam; never observes or verifies the effect, never mirrors later business state; genesis-head AL1 window on the evidence |
```

  §5, one domain-instance row: `| Effect-result notarization *(GOVERNED)* | settlement confirmation reference | administration record for the executed order | disbursement confirmation | issued-PO acknowledgement |`

- [ ] **Step 6: GLOSSARY.md.** Alphabetized entry:

```markdown
**Result digest** — the effect-result binding: the host's claimed outcome digest,
notarized inside the `redeemed` payload where the outcome is known when the coupling
closes (SPEC §9.1, §11.2). **[DESIGNED]**
```

- [ ] **Step 7: Scan and commit.** `node scripts/contract-scan.mjs` exit 0 (additive edits should break no tracked-TypeScript citation; if one flags, realign only that quoted string and disclose it). Hand-grep the diff for external names. Commit: `Effect-result 2/6: sanctioned sealed-set text lands [DESIGNED]: SPEC/CONTROLS/GLOSSARY per the design doc's §7 scope`, naming the grant.

### Task 3: The capability — declaration, intake, admission, binding, fold

**Files:**
- Modify: `packages/record/src/config.ts` (`ConfirmProfile.redeem` gains `result`; `RedeemOptions` gains `result`; `REDEMPTION_KEYS` gains `'result'`; a literal-`true` guard), `packages/record/src/kernel/redeem.ts` (intake validator + two admission gates + both payload splices), `packages/record/src/types.ts` (`DecisionRecord.resultDigest?`), `packages/record/src/chain/replay.ts` (a local payload interface + the fold)
- Test: `packages/record/test/effect-result.test.ts` (new file)

**Interfaces:**
- Consumes: Task 1's `RedeemOptions`; `prologue()`'s `{ gated: { chain, record, resolved, finalLeg } }` shape.
- Produces: `redeem.result?: true`; `RedeemOptions.result?: { digest: Digest }`; the `redeemed` payload key `resultDigest`; `DecisionRecord.resultDigest?: Digest`. Task 4's pins rely on these names exactly.

- [ ] **Step 1: Write the failing tests** — create `packages/record/test/effect-result.test.ts`:

```ts
// @vidimera/record — effect-result.test.ts: the effect-result increment (SPEC §11.2's
// result notarization, §9.1's `redeem.result` declaration, §4's `redeemed` payload key).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import {
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 42 };
const RESULT = `sha256:${'c'.repeat(64)}`;

/** An effect-seam profile that declares result notarization. */
function resultProfile(): ConfirmProfile {
  const profile = effectSeamProfile();
  profile.redeem = { ...profile.redeem, result: true };
  return profile;
}

async function confirmed(profile: ConfirmProfile) {
  const handles = create(makeConfig([profile]));
  const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  return { handles, recordId };
}

test('result notarization: the direct seam binds the claimed digest and replay folds it', async () => {
  const { handles, recordId } = await confirmed(resultProfile());
  const res = await handles.operator.redeem(recordId, CONTENT, { result: { digest: RESULT } });
  assert.equal(res.status, 'ok');

  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'redeemed');
  assert.equal(record?.resultDigest, RESULT);
});

test('result notarization: the token completion binds it; issuance never does', async () => {
  const { handles, recordId } = await confirmed(resultProfile());
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok');
  const token = begun.status === 'ok' ? begun.value.token : '';
  const done = await handles.operator.completeRedemption(recordId, token, CONTENT, {
    result: { digest: RESULT },
  });
  assert.equal(done.status, 'ok');
  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.resultDigest, RESULT);
});

test('result notarization: a declaring profile that supplies nothing records nothing', async () => {
  const { handles, recordId } = await confirmed(resultProfile());
  const res = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(res.status, 'ok');
  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.resultDigest, undefined);
});

test('result notarization: supplying one on a non-declaring profile throws', async () => {
  const { handles, recordId } = await confirmed(effectSeamProfile()); // no result declaration
  await assert.rejects(
    () => handles.operator.redeem(recordId, CONTENT, { result: { digest: RESULT } }),
    /does not declare/i,
  );
});

test('result notarization: beginRedemption rejects a result even on a declaring profile', async () => {
  const { handles, recordId } = await confirmed(resultProfile());
  await assert.rejects(
    () => handles.operator.beginRedemption(recordId, CONTENT, { result: { digest: RESULT } }),
    /issuance/i,
  );
});

test('result notarization: malformed result shapes throw at intake', async () => {
  const { handles, recordId } = await confirmed(resultProfile());
  await assert.rejects(
    () => handles.operator.redeem(recordId, CONTENT, { result: {} } as never),
    /digest/i,
  );
  await assert.rejects(
    () => handles.operator.redeem(recordId, CONTENT, { result: { digest: '' } } as never),
    /digest/i,
  );
  await assert.rejects(
    () =>
      handles.operator.redeem(recordId, CONTENT, {
        result: { digest: RESULT, extra: 1 },
      } as never),
    /unknown key|exactly/i,
  );
  await assert.rejects(
    () => handles.operator.redeem(recordId, CONTENT, { nope: 1 } as never),
    /accepts only tx and result/i,
  );
});

test('construction: redeem.result must be the literal true when declared', async () => {
  const profile = resultProfile();
  (profile.redeem as Record<string, unknown>).result = false;
  assert.throws(() => create(makeConfig([profile])), /literal true/i);
});
```

- [ ] **Step 2: Run to verify failure.** `./node_modules/.bin/vitest run packages/record/test/effect-result.test.ts` — TypeScript rejects `result` on both the profile block and the options bag. Expected RED.

- [ ] **Step 3: Implement — config.** `ConfirmProfile.redeem` becomes `redeem?: { confirmToRedeem?: number; redeemBound?: number; reverify?: boolean; result?: true };` (keep the trailing `// presence ⇒ effect seam` comment and add a short note that `result` admits §11.2's outcome digest). `RedeemOptions` gains:

```ts
  /** SPEC §11.2's result notarization (the effect-result increment): the host's CLAIMED
   * outcome digest, admitted iff the profile declares `redeem.result` (§9.1) — supplying
   * one on a non-declaring profile is a caller error, and issuance (`beginRedemption`)
   * admits none at all. Digest-only custody: the host digests its own result content and
   * the library never sees it, never verifies the claim, and never gates on it. */
  result?: { digest: Digest };
```

  `REDEMPTION_KEYS` gains `'result'` (so a stray `result` key on the profile or a leg is caught by the existing `assertNoStrayRedemptionKeys` misplacement check). Add the literal-`true` guard beside `validateBounds`'s redemption checks (or as its own small named function, matching the house shape):

```ts
  if (Object.hasOwn(profile.redeem ?? {}, 'result') && profile.redeem?.result !== true) {
    throw new Error(
      `invalid profile '${profile.id}': redeem.result must be the literal true when declared — ` +
        'any other value would construct as a non-declaring profile, silently disabling the ' +
        'admission gate (the fail-closed structural class; SPEC §9.1)',
    );
  }
```

- [ ] **Step 4: Implement — intake validation.** In `kernel/redeem.ts`, a file-local validator called FIRST in all three seams, before `prologue()` (argument-shape depth, the ladder convention for shape faults):

```ts
/**
 * SPEC §11.2/§12: the redemption options bag's shape, validated at ARGUMENT depth —
 * before any chain loads — so a caller bug throws identically regardless of record
 * state (finalize's consultation-intake precedent). The `beginRedemption` rejection
 * lives here rather than at profile depth because it is arity, not admission: issuance
 * NEVER accepts a result, declaration notwithstanding.
 */
function validateRedeemOptions(
  seam: 'redeem' | 'beginRedemption' | 'completeRedemption',
  opts: RedeemOptions | undefined,
): void {
  if (opts === undefined) return;
  for (const key of Object.keys(opts)) {
    if (key === 'tx' || key === 'result') continue;
    throw new Error(
      governedUnavailable(
        key,
        `${seam}() accepts only tx and result in this build. Contract: §11.2, §12.`,
      ),
    );
  }
  if (opts.result === undefined) return;
  if (seam === 'beginRedemption') {
    throw new Error(
      'beginRedemption: opts.result is not admitted at issuance — a result at ' +
        'redeeming-minting time would claim an outcome for an unexecuted effect; supply it ' +
        'at completeRedemption, where the executor knows it (SPEC §11.2)',
    );
  }
  const result = opts.result as unknown;
  if (result === null || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error(`${seam}: opts.result must be a plain { digest } object (SPEC §11.2)`);
  }
  const keys = Object.keys(result);
  if (keys.length !== 1 || keys[0] !== 'digest') {
    throw new Error(
      `${seam}: opts.result carries unknown keys or is missing digest (found: ${keys.join(', ') || 'none'}) — ` +
        'exactly { digest } (SPEC §11.2)',
    );
  }
  const digest = (result as { digest: unknown }).digest;
  if (typeof digest !== 'string' || digest.length === 0) {
    throw new Error(`${seam}: opts.result.digest must be a non-empty string (SPEC §11.2)`);
  }
}
```

  Import `governedUnavailable` from `../config.js` if it is not already imported.

- [ ] **Step 5: Implement — the admission gate.** In `redeem()` and `completeRedemption()` ONLY, immediately after the prologue's gated destructuring (so `chain-compromise`, `unknown-profile` and the effect-seam/final-leg gate win first — the profile-resolution depth the existing presence contracts use):

```ts
  // SPEC §11.2's admission gate (the effect-result increment): the declaration ADMITS
  // the field. A non-declaring profile supplying one is a caller error at
  // profile-resolution depth — chain-compromise, unknown-profile and the seam gate
  // outrank it, matching finalize's own presence-contract depth.
  if (opts?.result !== undefined && resolved.profile.redeem?.result !== true) {
    throw new Error(
      `redeem: opts.result supplied but profile '${record.profileId}' does not declare ` +
        'redeem.result — declaring it is what admits an outcome digest (SPEC §9.1, §11.2)',
    );
  }
```

  In `completeRedemption()`'s copy the leading literal reads `completeRedemption:` instead; everything else is identical. Read the surrounding code for the exact local names the prologue's destructuring binds (`resolved`, `record`) before writing either copy.

- [ ] **Step 6: Implement — both payload splices.** Extract once per seam beside the `tx` extraction: `const resultDigest = opts?.result?.digest;`. Then, in `redeem()`'s direct build (the `payload: { via: 'direct' }` line) and `completeRedemption()`'s token build (the `payload: { via: 'token', tokenDigest: persisted }` line), use the house present-iff-supplied spread:

```ts
    payload: { via: 'direct', ...(resultDigest === undefined ? {} : { resultDigest }) },
```

```ts
    payload: {
      via: 'token',
      tokenDigest: persisted,
      ...(resultDigest === undefined ? {} : { resultDigest }),
    },
```

  Add one comment at each site naming §4's present-iff-supplied rule and that an absent result leaves the payload byte-identical to a pre-increment chain.

- [ ] **Step 7: Implement — the record model and fold.** `types.ts`'s `DecisionRecord` gains, after `actor` (read the neighbours and match placement/style):

```ts
  /** SPEC §11.2's result notarization: the host's CLAIMED outcome digest, notarized
   * inside the `redeemed` payload (§4) — present iff supplied under a `result`-declaring
   * profile. Deliberately NOT projected into ReviewView (a redeemed record is past
   * review). Nothing gates on it; the library never verifies the claim. */
  resultDigest?: Digest;
```

  In `chain/replay.ts`, read the file's local reading-convention interfaces (`OpenedPayload`, `ConfirmedPayload`, `RefusedPayload`) and the current `case 'redeemed':` arm. Add a local interface following that convention and fold the key present-iff-present:

```ts
/** Mirrors this file's local reading-convention interfaces (SPEC §4's `redeemed` payload). */
interface RedeemedPayload {
  via: 'direct' | 'token';
  tokenDigest?: Digest;
  resultDigest?: Digest;
}
```

  and inside the `redeemed` arm, alongside whatever it already does:

```ts
        const payload = transition.payload as RedeemedPayload;
        if (payload.resultDigest !== undefined) {
          // SPEC §11.2: the host's claimed outcome digest, folded verbatim — replay
          // surfaces what the seam recorded and never re-verifies the claim.
          record.resultDigest = payload.resultDigest;
        }
```

  Update the folding-rules doc comment's `redeemed` line to name the new optional key.

- [ ] **Step 8: Run** the new file (GREEN), then the FULL suite (zero skips; the frozen oracle AND `cross-backing-byte-identity.test.ts` must both stay green — a non-supplying redemption chain has not moved), both typechecks, biome, contract-scan, api-sync.

- [ ] **Step 9: Commit.** Subject: `Effect-result 3/6: the capability lands — declaration, intake, admission gate, both payload splices, the fold`.

### Task 4: Pins — key sets, order, construction, signatures, oracles

**Files:**
- Modify: `packages/record/test/effect-result.test.ts`
- Modify: `packages/record/src/kernel/redeem.ts` ONLY if a pin exposes a genuine defect (report prominently)

- [ ] **Step 1: Write the pins.** Append to `effect-result.test.ts`:

```ts
import { MemorySignatureStore } from './helpers/signing.js'; // adjust to the helper's real exports

test('the redeemed payload key set: base keys plus exactly resultDigest, both shapes', async () => {
  // Direct shape.
  {
    const { handles, recordId } = await confirmed(resultProfile());
    const res = await handles.operator.redeem(recordId, CONTENT, { result: { digest: RESULT } });
    assert.equal(res.status, 'ok');
    const chain = await handles.operator.readChain(recordId);
    const last = chain.at(-1);
    assert.ok(last !== undefined);
    const payload = last.payload as Record<string, unknown>;
    assert.deepEqual(
      Object.keys(payload).sort(),
      ['resultDigest', 'via'],
      'present-iff-supplied: exactly the direct base key set plus resultDigest',
    );
  }
  // Token shape.
  {
    const { handles, recordId } = await confirmed(resultProfile());
    const begun = await handles.operator.beginRedemption(recordId, CONTENT);
    assert.equal(begun.status, 'ok');
    const done = await handles.operator.completeRedemption(
      recordId,
      begun.status === 'ok' ? begun.value.token : '',
      CONTENT,
      { result: { digest: RESULT } },
    );
    assert.equal(done.status, 'ok');
    const chain = await handles.operator.readChain(recordId);
    const last = chain.at(-1);
    assert.ok(last !== undefined);
    const payload = last.payload as Record<string, unknown>;
    assert.deepEqual(
      Object.keys(payload).sort(),
      ['resultDigest', 'tokenDigest', 'via'],
      'present-iff-supplied: exactly the token base key set plus resultDigest',
    );
  }
  // Absent: the pre-increment shapes, unchanged.
  {
    const { handles, recordId } = await confirmed(resultProfile());
    const res = await handles.operator.redeem(recordId, CONTENT);
    assert.equal(res.status, 'ok');
    const chain = await handles.operator.readChain(recordId);
    const last = chain.at(-1);
    assert.ok(last !== undefined);
    assert.deepEqual(Object.keys(last.payload as Record<string, unknown>).sort(), ['via']);
  }
});

test('gate order: the intake throw beats the admission throw; both sit behind the seam gate', async () => {
  // Intake beats admission: a malformed result on a NON-declaring profile throws the
  // shape error (intake depth), never the admission error (profile depth).
  {
    const { handles, recordId } = await confirmed(effectSeamProfile());
    await assert.rejects(
      () => handles.operator.redeem(recordId, CONTENT, { result: {} } as never),
      /digest/i,
    );
  }
  // The seam gate outranks admission: a pure-capture profile has no redeemable seam, so
  // a supplied result on it refuses `unredeemable-state` rather than throwing.
  {
    const profile = captureProfile();
    const handles = create(makeConfig([profile]));
    const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
    const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(done.status, 'ok');
    const res = await handles.operator.redeem(recordId, CONTENT, {
      result: { digest: RESULT },
    } as never);
    assert.equal(res.status, 'refused');
    assert.equal(res.status === 'refused' && res.code, 'unredeemable-state');
  }
});

test('construction: a stray result key outside the redeem block throws', async () => {
  const profile = resultProfile();
  (profile as Record<string, unknown>).result = true;
  assert.throws(() => create(makeConfig([profile])), /redeem/i);
});
```

  Import `captureProfile` alongside the other helpers. **VERIFY the seam-gate sub-case before asserting it:** read `prologue()`'s effect-seam/final-leg gate and confirm a capture profile's `redeem()` refuses `unredeemable-state` BEFORE the admission gate runs. If the admission gate would fire first, either move the gate after the prologue (it already is) or adjust the assertion to what the code actually does — and say so in your report.

- [ ] **Step 2: Add the two composition pins the design's §4 claims** (read `kernel/redeem.ts`'s correspondence rung first to confirm the ordering before asserting it):

```ts
test('correspondence precedes the binding: a drifted redemption carrying a result binds nothing', async () => {
  const { handles, recordId } = await confirmed(resultProfile());
  const res = await handles.operator.redeem(recordId, { subject: 'week-1', total: 43 }, {
    result: { digest: RESULT },
  });
  assert.equal(res.status, 'refused');
  assert.equal(res.status === 'refused' && res.code, 'effect-mismatch');
  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'confirmed'); // still awaiting redemption
  assert.equal(record?.resultDigest, undefined); // nothing bound
});

test('sealing caps a result-carrying redeemed chain and reports retired', async () => {
  const { handles, recordId } = await confirmed(resultProfile());
  const res = await handles.operator.redeem(recordId, CONTENT, { result: { digest: RESULT } });
  assert.equal(res.status, 'ok');
  const sealed = await handles.operator.seal(recordId);
  assert.equal(sealed.status, 'ok');
  assert.equal(sealed.status === 'ok' && sealed.value.status, 'retired');
  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.resultDigest, RESULT); // the cap preserves the binding
});
```

- [ ] **Step 3: Add a signed-redemption pin** reusing `test/helpers/signing.ts` — import exactly the members `decline.test.ts` and `provenance.test.ts` import from it (read one of them for the import line and the setup call). A signing + result-declaring effect-seam profile, a result-carrying direct redemption, then `verifySignatures(recordId)` asserting `signingDeclared === true` and every transition `signed && verified`.

- [ ] **Step 3: Assert the two oracles.** Run `./node_modules/.bin/vitest run packages/record/test/byte-stability.test.ts packages/record/test/cross-backing-byte-identity.test.ts` and record the output in your report — both green, neither file edited. These are the proof that a non-supplying chain did not move.

- [ ] **Step 4: FULL suite, both typechecks, biome, contract-scan. Commit:** `Effect-result 4/6: pins — payload key sets both shapes, gate order, construction, signed redemption, oracles asserted`.

### Task 5: The guide moves with the surface

**Files:**
- Modify: `docs/guide/api-reference.md` (`RedeemOptions.result`, `DecisionRecord.resultDigest`, the `redeem.result` profile field), `docs/guide/integrating.md` (a result subsection + the late-result recipe)
- Scratch: a temporary vitest file executing each new sample (deleted before commit)

- [ ] **Step 1:** Write every new guide sample as `packages/record/test/scratch-guide-result.test.ts`, run green, DELETE (verify via `git status`). Samples: (a) the declaring profile plus an enlisted direct redemption carrying a result; (b) the token completion carrying one; (c) the late-result successor record (a pure-capture profile whose `subjectRef` names the executed effect and whose content carries the outcome, referencing the decision's record id).
- [ ] **Step 2:** `api-reference.md`: `RedeemOptions` gains its `result` member; the profile-field coverage gains `redeem.result`; the `DecisionRecord` coverage gains `resultDigest?`. Each with the honest bound in the same breath (notarizes the host's claim; never observed, never verified, never a mirror of later state) and the two throw postures.
- [ ] **Step 3:** `integrating.md`: a "Notarizing what the effect did" subsection with samples (a) and (b), the discipline sentence (supply it only where the outcome is known at the call — enlisted direct, or token completion; not in a gate-then-execute flow), and a short "when the result arrives later" passage carrying sample (c) as the recorded recipe.
- [ ] **Step 4:** Gates: api-sync 0, contract-scan 0 (no external URLs/names), FULL suite, both typechecks, `node scripts/smoke-pack.mjs`.
- [ ] **Step 5: Commit:** `Effect-result 5/6: the guide moves with the surface — result samples and the late-result recipe, vitest-verified`.

### Task 6: Exit — markers to truth, the record, the sweep

**Files:**
- Modify: `docs/concept/SPEC.md`, `docs/concept/CONTROLS.md`, `docs/concept/GLOSSARY.md` (marker moves ONLY)
- Modify: `docs/process/implementation-status.md`, `CLAUDE.md` (measured counts only)
- Verify: `docs/process/deferral-register.md` (row 16 already amended at Task 1 — confirm it reads true and that no other row moves)

- [ ] **Step 1:** Every `[DESIGNED]`/`DESIGNED` this increment introduced becomes `[PROVEN]`/`PROVEN`. Grep `docs/concept/` for DESIGNED and adjudicate every hit: expected movers are the SPEC §4 row tail, the §9.1 `result` row, the §11.2 block, the CONTROLS §3 Maturity cell, and the GLOSSARY entry; the two legend-definition sites stay; anything else unexpected → STOP and report.
- [ ] **Step 2:** `implementation-status.md` gains the increment's section in house style: what landed (the options-bag refactor with its 11 rewritten call sites, the declaration and its guards, the intake validator, the admission gates, both payload splices, the fold, the new test file's pins, the guide), the rulings (bag with `tx` moved in, sanction-free with the §9/§12/§11.2 reasoning; admission gate as NEW normative text with its merits argument; the two accepting seams and the issuance rejection; declaring `result` declares the seam), the cuts with recovery paths (post-terminal append; structured fields; library-side verification; result at issuance; a mandatory contract), gate outputs as measured, the spec/plan paths, and the sanction grant record.
- [ ] **Step 3:** CLAUDE.md: re-measure and update ONLY moved claims (the test-file/test counts — expect 54 files; the measured test total). Verify still-true: the 24-codes sentence, and the throws sentence naming `finalize()`/`open()`/`decline()` — this increment adds `governedUnavailable` throws at the three redemption seams, so that sentence's enumeration MUST be extended (it is a measured claim about the code, and `validateRedeemOptions` is a fourth-through-sixth site).
- [ ] **Step 4:** Comment-truth sweep, hit-count == verdict-count per pattern, repo-root pathspec: `accepts only tx` (the new messages); `tx?: unknown` (any comment still describing a positional parameter); `third argument|trailing positional` near redemption; `result` across `packages/` (every hit this increment's or adjudicated); `redeemed payload|via: 'direct'` enumerations in comments; `governedUnavailable` count literals anywhere.
- [ ] **Step 5:** Full gates (suite zero skips, both typechecks, biome, contract-scan 0, api-sync 0). Commit: `Effect-result 6/6: markers move to truth; the record and the sweep land the exit`.

---

## What this plan does not do (per the design doc's cuts, recorded there)

No post-`redeemed` append and no C3 carve-out; no structured result fields; no library-side result verification, ever; no result at `beginRedemption`; no mandatory presence contract; no identity field on the options bag (SPEC §11.2 forbids it — adding one would be a fork); no `docs/concept/` edits beyond the sanctioned §7 scope; no change to SPEC §12's handle rule.
