# Redemption Token Shape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land SPEC §11.2's token shape — `beginRedemption`/`completeRedemption`, the
single-use token, `confirmed → redeeming { tokenDigest }` and
`redeeming → redeemed { via: 'token', tokenDigest }` — as the second step-3 increment,
retiring deferral-register row 10 and honoring every ruling in
`docs/superpowers/specs/2026-08-13-redemption-token-shape-design.md` (the spec; read it
before your task).

**Architecture:** Two new operator-only kernel seams in `kernel/redeem.ts`, sharing an
extracted prologue with the existing direct `redeem()`. A new injectable `tokenSource` on
`KernelContext` (internal, like `now`/`mintId`). A GOVERNED construction guard on
`redeemBound`. The `CORE` refusal map renames to `REGISTRY`. `replay()` gains the
`redeeming` arm; `appendChainCompromise` gains the `redeeming` CAS candidates. A
family-wide CAS-residual re-read makes race losers' refusal codes honest. No store
semantics change; no new refusal codes.

**Tech Stack:** TypeScript strict (pnpm workspace, Node >=22.16), vitest 4,
`node:crypto` `randomBytes`, Biome.

## Global Constraints

- **Shell**: PowerShell. EVERY fresh shell must prepend pnpm's path first:
  `$env:PATH = "$env:APPDATA\npm;$env:PATH"` (corepack is broken on this machine).
- **The five gates** (all must pass before any task's final commit):
  `pnpm typecheck` · `pnpm lint` · `pnpm lint:strict` · `pnpm test` (zero skips) ·
  `node scripts/contract-scan.mjs` (prints nothing, exits 0).
- **Byte-stability**: the four frozen digest literals in
  `packages/record/test/byte-stability.test.ts` NEVER move. If any test there goes red,
  STOP and report — do not update a literal.
- **`docs/concept/` is SEALED** — never edit anything under it.
- **No external URLs, repo names, or project names** in any file (standalone contract).
- **Explicit increment naming** in every live doc and comment: write "the second step-3
  increment" (or "the token-shape increment"), never bare "this increment".
- **Commit messages** end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
  (use a PowerShell here-string: `git commit -m @'...multi-line...'@` with the closing
  `'@` at column 0).
- **Never push to origin.**
- **Markdown citations are not machine-checked**: any SPEC phrase you quote in a doc or
  comment must be hand-verified against the source with whitespace collapsed (quotes wrap
  line breaks in SPEC.md — a naive grep produces false "missing" findings).
- Narrow test runs: `pnpm exec vitest run packages/record/test/<file>.test.ts` from the
  repo root.

---

### Task 1: The `redeemBound` GOVERNED construction guard

**Files:**
- Modify: `packages/record/src/config.ts` (validateProfile + its doc comment)
- Modify: `packages/record/test/helpers/profiles.ts:90` (effectSeamProfile drops `redeemBound`)
- Test: `packages/record/test/construction-validation.test.ts`

**Interfaces:**
- Consumes: `governedUnavailable(field, contract)` (config.ts:75), `assertGoverned` /
  `GOVERNED` helpers (construction-validation.test.ts:30-46).
- Produces: a construction throw for any profile whose `redeem` block carries
  `redeemBound`. Later tasks rely on `effectSeamProfile()` being
  `redeem: { confirmToRedeem: 1 }` only.

**Why (from the spec):** §4's `redeeming` payload row is `{ tokenDigest, bound? }` with
`bound` present-iff-declared, in digested chain bytes. The clocks are the third step-3
increment's; a second-increment `redeeming` edge on a declaring profile would permanently
violate the iff. So declaring `redeemBound` throws GOVERNED until the clock increment.
`confirmToRedeem` stays accepted-but-inert (its gap is `dueAt`-only — an index §12 calls
"never authoritative" — recorded since the first step-3 increment).

- [ ] **Step 1: Write the failing test**

Add to `construction-validation.test.ts`, in the GOVERNED section:

```ts
test('GOVERNED: redeem.redeemBound throws (redeemBound) — the redeeming-payload bound is chain bytes, not an index', () => {
  // The token shape (second step-3 increment) mints `redeeming` edges; SPEC §4 makes the
  // payload's `bound` present-IFF-declared. Until the clock increment builds the bound
  // whole (payload + dueAt + resolution), a declaring profile must fail loud, not mint
  // permanently divergent bytes. `confirmToRedeem` stays accepted-but-inert: its gap is
  // dueAt-only, "never authoritative" (SPEC §12), recorded since the first increment.
  const declaring = {
    ...effectSeamProfile(),
    redeem: { confirmToRedeem: 1, redeemBound: 86400 },
  };
  assertGoverned(declaring, 'redeemBound');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run packages/record/test/construction-validation.test.ts`
Expected: the new test FAILS (`create()` currently accepts `redeemBound`).

- [ ] **Step 3: Implement the guard**

In `config.ts`'s `validateProfile`, after the `policySource` guard (line ~192-199) and
before the per-leg loop, add:

```ts
  if (profile.redeem?.redeemBound !== undefined) {
    throw new Error(
      governedUnavailable(
        'redeemBound',
        'the redeeming-window bound is not built in this build — SPEC §4 makes the ' +
          '`redeeming` payload’s `bound` present-iff-declared in chain bytes, and the ' +
          'clock that writes and resolves it is the third step-3 increment. ' +
          '`confirmToRedeem` stays accepted-but-inert (a dueAt-only gap, recorded). ' +
          'Contract: §4, §9.1, §11.2.',
      ),
    );
  }
```

Update `validateProfile`'s numbered doc comment (config.ts:157-171): insert the new guard
as its own numbered entry between 4 (policySource) and the per-leg guards, renumbering the
tail.

- [ ] **Step 4: Update the helper fixture — the authorized inversion, argued in place**

In `test/helpers/profiles.ts`, change line 90 and add the note:

```ts
    // `redeemBound` was declared here (86400) from step 1 until the second step-3
    // increment, riding the accepted-but-inert posture. That increment GOVERNED-guarded
    // it (config.ts): the token shape mints `redeeming` edges, and SPEC §4's
    // present-iff-declared `bound` would make a declaring profile's chain bytes
    // permanently divergent until the clock increment builds the bound whole. Dropping
    // it here is that increment's authorized fixture inversion — construction-
    // validation.test.ts pins the throw.
    redeem: { confirmToRedeem: 1 },
```

- [ ] **Step 5: Run the full suite**

Run: `pnpm test`
Expected: PASS, zero skips (the helper change is invisible to behavior — the bound was
inert; `profile-digest.test.ts` uses its own `redeem: { confirmToRedeem: 1 }` literal and
is unaffected; no frozen digest involves an effect-seam profile).

- [ ] **Step 6: Gates and commit**

Run all five gates. Then:

```powershell
git add packages/record/src/config.ts packages/record/test/helpers/profiles.ts packages/record/test/construction-validation.test.ts
git commit -m @'
Guard redeemBound at construction: chain bytes wait for the clock, loudly

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 2: `CORE` → `REGISTRY`

**Files:**
- Modify: `packages/record/src/refusal-codes.ts` (declaration :52, header :1, doc :41,
  NOTE :48-50, use :123)
- Modify: `packages/record/src/outcome.ts` (:8 import, :11/:40 comments, :50 use)
- Modify: `packages/record/src/store/semantics.ts` (:9 import, :89/:91 comments, :116 use)
- Modify: `packages/record/src/kernel/open.ts` (:14 prose comment)
- Modify: `packages/record/test/outcome-model.test.ts` (:4, :11, :13, :44, :55)
- Modify: `packages/record/test/refusal-matrix.test.ts` (:2, :32, :309, :320-321)
- Modify: `packages/record/test/unknown-ids.test.ts` (:151 prose comment)

**Interfaces:**
- Produces: `export const REGISTRY: Record<RefusalCode, RefusalClass>` — the same
  compiler-total map, renamed. NOT re-exported from `index.ts` (verified: only the
  `RefusalCode` type is public). Later tasks import `REGISTRY` where they would have
  imported `CORE`.

**Why:** `refusal-codes.ts:48-50`'s own NOTE promised "a rename is deferred to the
token-shape increment". DECISIONS.md #14 calls it "the refusal registry"; `REGISTRY` is
that word, and `grep -w REGISTRY` over the package returns zero hits (collision-free).

- [ ] **Step 1: Rename the identifier at every site**

Rename `CORE` → `REGISTRY` in all seven files (declaration, imports, use-sites, and the
prose comments listed above — "CORE registry" becomes "REGISTRY", "No CORE RefusalCode
fits" becomes "No REGISTRY RefusalCode fits", the test-name string at
outcome-model.test.ts:44 becomes `'REGISTRY must cover all thirteen RefusalCodes'`, the
test name at refusal-matrix.test.ts:320 becomes "every REGISTRY RefusalCode is accounted
for in this matrix…").

- [ ] **Step 2: Replace the fulfilled promise-NOTE**

In `refusal-codes.ts`, replace the NOTE block (lines 48-51) inside the doc comment with:

```ts
 * Named `REGISTRY` (DECISIONS.md #14's own word — "the refusal registry is a
 * compiler-total map") since the second step-3 increment: it carries the core set AND the
 * profile-conditional codes (`effect-mismatch`, `already-redeemed`), so the earlier name
 * `CORE` misdescribed it — that increment honored the rename its predecessor recorded
 * here as deferred.
```

Also update the file header (:1) — "the CORE code→class registry" → "the REGISTRY
code→class map".

- [ ] **Step 3: Verify green**

Run: `pnpm typecheck` then `pnpm test`
Expected: PASS — the rename is behavior-free; the 13-code count pins hold untouched.

- [ ] **Step 4: Gates and commit**

Run all five gates. Then commit:

```powershell
git add -A packages/record
git commit -m @'
Rename CORE to REGISTRY: the map outgrew its name, as its own note recorded

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 3: The `redeeming` replay arm

**Files:**
- Modify: `packages/record/src/chain/replay.ts` (switch :113-160, doc comment :75-81)
- Test: `packages/record/test/replay-verify.test.ts`

**Interfaces:**
- Consumes: `storeGenesis(recordId, profileId, subjectRef)` and
  `storeNext(prev, kind, payload)` from `test/helpers/chain.js` (hash-valid transition
  builders — the conformance suite uses them the same way).
- Produces: `replay()` folds `kind: 'redeeming'` to `state: 'redeeming'`;
  `redemption-failed` still throws.

- [ ] **Step 1: Write the failing test**

Add to `replay-verify.test.ts` (follow its existing hand-built-chain conventions; use the
helpers if the file already imports them, otherwise import from `./helpers/chain.js`):

```ts
test('replay: a redeeming transition folds state to "redeeming" — tokenDigest is evidence, not state', () => {
  // New at the second step-3 increment: `redeeming` gets a replay arm (SPEC §2: decided,
  // effect unresolved — non-terminal). The payload's tokenDigest is never folded into
  // DecisionRecord — the same evidence-not-state posture as `redeemed`'s `via`.
  const genesis = storeGenesis('rec-replay-redeeming', 'profile.p1', 'subject:rr');
  const confirmed = storeNext(genesis, 'confirmed', {
    actor: { principal: 'approver:1', authority: 'session:test-app' },
  });
  const redeeming = storeNext(confirmed, 'redeeming', {
    tokenDigest: `sha256:${'a'.repeat(64)}`,
  });
  const record = replay([genesis, confirmed, redeeming]);
  assert.equal(record.state, 'redeeming');
  assert.equal(record.status, 'active');
  assert.equal(record.actor?.principal, 'approver:1');
  assert.equal('tokenDigest' in record, false);
});

test('replay: redemption-failed still throws — no producer until the clock increment', () => {
  const genesis = storeGenesis('rec-replay-rf', 'profile.p1', 'subject:rf');
  const confirmed = storeNext(genesis, 'confirmed', {
    actor: { principal: 'approver:1', authority: 'session:test-app' },
  });
  const redeeming = storeNext(confirmed, 'redeeming', {
    tokenDigest: `sha256:${'b'.repeat(64)}`,
  });
  const failed = storeNext(redeeming, 'redemption-failed', { bound: '2026-01-01T00:00:00.000Z' });
  assert.throws(
    () => replay([genesis, confirmed, redeeming, failed]),
    /unhandled TransitionKind 'redemption-failed'/,
  );
});
```

- [ ] **Step 2: Run to verify the first fails**

Run: `pnpm exec vitest run packages/record/test/replay-verify.test.ts`
Expected: first new test FAILS (`replay: unhandled TransitionKind 'redeeming'`); second
PASSES already.

- [ ] **Step 3: Implement the arm**

In `replay.ts`'s switch, after the `redeemed` case:

```ts
      case 'redeeming': {
        // State-MOVING (SPEC §11.2's token shape, second step-3 increment):
        // `confirmed → redeeming` records the issued token's digest. Non-terminal (§2:
        // decided, effect unresolved). The payload's `tokenDigest` (and, when the clock
        // increment lands it, `bound`) is EVIDENCE — replay reads nothing from it; only
        // `state` moves.
        record.state = 'redeeming';
        break;
      }
```

Update the doc comment (:75-81): move `redeeming` out of the throws list and into its own
bullet mirroring `redeemed`'s; the emitted-kinds sentence becomes "this kernel emits only
opened, consultation-recorded, confirmed, refused, expired, sealed, redeemed, and — as of
the second step-3 increment — redeeming" (note: the current sentence also omits `sealed`,
stale since the chain-retirement increment; fix that here too). Keep `finding-raised`,
`acknowledged`, `redemption-failed` in the throw list.

- [ ] **Step 4: Run tests, gates, commit**

Run: `pnpm exec vitest run packages/record/test/replay-verify.test.ts` (PASS), then
`pnpm test` (PASS), then all five gates.

```powershell
git add packages/record/src/chain/replay.ts packages/record/test/replay-verify.test.ts
git commit -m @'
Fold redeeming on replay: decided, effect unresolved, evidence stays evidence

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 4: The issuance — prologue extraction, `tokenSource`, `beginRedemption`, row 10

**Files:**
- Modify: `packages/record/src/kernel/redeem.ts` (prologue extraction + new seam)
- Modify: `packages/record/src/create.ts` (KernelContext.tokenSource, Kernel wiring,
  createWithClock 4th param)
- Modify: `packages/record/src/operator-surface.ts` (interface + frozen literal + header)
- Modify: `packages/record/src/kernel/finalize.ts:340,343` (candidate lists)
- Modify: `packages/record/src/nonterminal.ts:23-25`,
  `packages/record/src/store/semantics.ts:94-100`, `packages/record/src/types.ts:32,46`
  (comment truth pass — subjects land in this task)
- Modify: `packages/record/test/agent-unreachability.test.ts:23` (TRANSITIONING array)
- Create: `packages/record/test/redeem-token.test.ts`
- Modify: `packages/record/test/redeem.test.ts:1-35` (header split: token shape real,
  clocks remain)

**Interfaces:**
- Consumes: Task 2's `REGISTRY` name (comments only), Task 3's replay arm, Task 1's
  guard (fixtures construct `redeem: { confirmToRedeem: 1 }`).
- Produces (later tasks rely on these EXACT shapes):
  - `KernelContext` gains `tokenSource: () => string`.
  - `createWithClock(config, now, mintId = mintRecordId, tokenSource = defaultTokenSource)`.
  - `kernel/redeem.ts` exports
    `beginRedemption(ctx: KernelContext, recordId: string, content: unknown): Promise<Outcome<{ recordId: string; state: 'redeeming'; token: string; transitionRef: Digest }>>`.
  - `OperatorSurface.beginRedemption(recordId: string, content: unknown)` with that return.
  - A local `prologue()` helper both remaining seams reuse (Task 5 adds the third caller).

- [ ] **Step 1: Extract the shared prologue (pure refactor — suite stays green)**

In `kernel/redeem.ts`, extract rungs (load/throw-unknown, chain-verify-first including the
enlisted-`tx` branch, resolve-profile + legId throw + finalLeg, effect-seam/final-leg gate)
into one local helper, and rewrite `redeem()` to consume it. The helper (not exported):

```ts
/**
 * The shared prologue of every redemption ladder — rungs (1)-(3) of all three seams
 * (direct redeem, beginRedemption, completeRedemption), byte-identical across them:
 *   load chain      -> THROW on unknown recordId (a caller error, SPEC §8)
 *   (1) chain-verify -> chain-compromise — §5: "Every operator-side mutating seam
 *       verifies the chain before acting". ENLISTED callers (tx !== undefined — today
 *       only direct redeem carries tx) refuse result-first with NO edge: see the comment
 *       in place below. Un-enlisted callers append the edge via appendChainCompromise.
 *   (2) resolve profile -> unknown-profile (fail-closed); persisted legId absent -> THROW
 *   (3) effect seam + final leg -> unredeemable-state (§11.2 "on-iff-effects"; the
 *       non-final-leg refusal is structural until the separation-of-duties step)
 * The STATE gates stay in each ladder — they are where the three seams differ.
 * The clock increment's en-passant resolution (due-`confirmed` / due-`redeeming`, §4)
 * lands HERE once, not three times — that is this helper's reason to exist.
 */
async function prologue(
  ctx: KernelContext,
  seam: 'redeem' | 'beginRedemption' | 'completeRedemption',
  recordId: string,
  tx?: unknown,
): Promise<
  | { refusal: Outcome<never> }
  | { gated: { chain: Transition[]; record: DecisionRecord; resolved: ResolvedProfile; finalLeg: boolean } }
> {
  const { store, profiles, now } = ctx;
  const chain = await store.readChain(recordId);
  if (chain.length === 0) {
    throw new Error(
      `${seam}: unknown recordId '${recordId}' — no such record (open() first); a recordId ` +
        'that resolves to no chain is a caller error, not a domain refusal (SPEC §8)',
    );
  }
  if (!verifyChain(chain).intact) {
    if (tx !== undefined) {
      // ENLISTED: [move the existing enlisted-branch comment from redeem() here, verbatim]
      return { refusal: refused('chain-compromise') };
    }
    return { refusal: await appendChainCompromise(store, chain, now) };
  }
  const record = replay(chain);
  const resolved = profiles.get(record.profileId);
  if (resolved === undefined) {
    // Defensive, fail-closed: a coherent instance always resolves a record it opened.
    return { refusal: refused('unknown-profile') };
  }
  const legIndex = resolved.profile.legs.findIndex((l) => l.id === record.legId);
  if (legIndex < 0) {
    throw new Error(
      `${seam}: persisted legId '${record.legId}' is absent from profile '${record.profileId}'`,
    );
  }
  const finalLeg = isFinalLeg(legIndex, resolved.profile.legs.length);
  if (!resolved.effectSeam || !finalLeg) {
    return { refusal: refused('unredeemable-state') };
  }
  return { gated: { chain, record, resolved, finalLeg } };
}
```

(Imports needed: `DecisionRecord` from `../types.js`, `ResolvedProfile` from
`../create.js` — both type-only.) `redeem()` keeps its rungs (4)-(6) exactly as they are,
now over `prologue(ctx, 'redeem', recordId, tx)`. Note the seam-name change inside the
unknown-recordId message is only the `${seam}` prefix — the wording is otherwise
byte-identical, and `redeem.test.ts`'s throw pin matches on content, not prefix; verify.

Run: `pnpm test` — Expected: PASS (pure refactor). Commit:

```powershell
git add packages/record/src/kernel/redeem.ts
git commit -m @'
Extract the redemption prologue: three ladders, one verify-first spine

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

- [ ] **Step 2: Write the failing begin tests**

Create `packages/record/test/redeem-token.test.ts`:

```ts
// @vidimera/record — redeem-token.test.ts (SPEC §11.2 "Redemption (the effect seam)", the
// TOKEN shape — second step-3 increment): the separated-store coupling —
// `confirmed → redeeming { tokenDigest }` at beginRedemption() (the single-use token,
// library-generated, returned exactly once, never persisted), and
// `redeeming → redeemed { via: 'token', tokenDigest }` at completeRedemption() on
// presenting that token. Both redemption clocks are the third step-3 increment; nothing
// here constructs a bound, a dueAt, or a redemption-failed record.
//
// ADJACENT-PAIR ORDER TESTS are derived per redeem.test.ts's discipline, per ladder, at
// the bottom of this file — each ladder's derivation comment enumerates the jointly
// constructible pairs and why the rest are excluded.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { canonicalize, digest } from '../src/canonical.js';
import { create, createWithClock } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
  tamperNonLast,
} from './helpers/profiles.js';
import { TamperingStore } from './helpers/stores.js';

const CONTENT = { subject: 'week-1', total: 40 };

/** Opens and finalizes an effect-seam record, leaving it confirmed and NON-terminal. */
async function confirmedEffectRecord(store: MemoryStore | SqliteStore = new MemoryStore()) {
  const handles = create(makeConfig([effectSeamProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  return { handles, recordId, store };
}

/** Begins a token redemption on a fresh confirmed record; returns the token too. */
async function redeemingRecord(store: MemoryStore | SqliteStore = new MemoryStore()) {
  const { handles, recordId } = await confirmedEffectRecord(store);
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok', 'fixture: beginRedemption must succeed');
  if (begun.status !== 'ok') throw new Error('unreachable');
  return { handles, recordId, store, token: begun.value.token };
}

// === beginRedemption: the issuance ====================================================

test('beginRedemption() on a confirmed effect-seam record appends redeeming { tokenDigest } and returns the token once', async () => {
  const { handles, recordId } = await confirmedEffectRecord();

  const outcome = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;
  assert.equal(outcome.value.state, 'redeeming');
  assert.equal(outcome.value.recordId, recordId);

  // Token format pin: 32 random bytes, base64url, no padding — 43 chars (SPEC §11.2's
  // "enough entropy that its digest is not invertible by guessing", §13's limit).
  assert.match(outcome.value.token, /^[A-Za-z0-9_-]{43}$/);

  const chain = await handles.operator.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'redeeming');
  // PAYLOAD KEY-SET PIN: exactly { tokenDigest } — no bound key exists in this build
  // (redeemBound is GOVERNED-guarded; the clock increment lands the bound whole).
  assert.deepEqual(Object.keys(last.payload as object), ['tokenDigest']);
  assert.equal(
    (last.payload as { tokenDigest: string }).tokenDigest,
    digest(outcome.value.token),
    'the chain carries exactly the digest of the returned token',
  );

  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'redeeming');
  assert.equal(record?.status, 'active');
});

test('token custody: the token appears in the begin ok value and NOWHERE else (chain, store rows, refusals)', async () => {
  const store = new SqliteStore(':memory:');
  const { handles, recordId, token } = await redeemingRecord(store);

  const chain = await handles.operator.readChain(recordId);
  assert.ok(!JSON.stringify(chain).includes(token), 'the chain must not carry the raw token');

  // Dump EVERY table generically — robust to schema naming.
  const db = store.database;
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all() as { name: string }[];
  assert.ok(tables.length > 0, 'fixture: the sqlite schema has tables');
  for (const { name } of tables) {
    const rows = db.prepare(`SELECT * FROM "${name}"`).all();
    assert.ok(
      !JSON.stringify(rows).includes(token),
      `the raw token must not appear in table '${name}'`,
    );
  }

  // A refusal outcome must not echo the token either: a second begin refuses.
  const again = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.ok(!JSON.stringify(again).includes(token));
});

test('two begins on two records issue different tokens (randomness smoke)', async () => {
  const a = await redeemingRecord();
  const b = await redeemingRecord();
  assert.notEqual(a.token, b.token);
});

test('beginRedemption: no re-issue — a second begin on a redeeming record refuses unredeemable-state with no append', async () => {
  // DECISIONS #30: "a persisted or re-issuable token would trade the at-most-once
  // guarantee for convenience". `unredeemable-state` is this build's mapping (§8's
  // enumeration predates the state) — recorded in the status doc.
  const { handles, recordId } = await redeemingRecord();
  const before = (await handles.operator.readChain(recordId)).length;

  const again = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(again.status, 'refused');
  if (again.status !== 'refused') return;
  assert.equal(again.code, 'unredeemable-state');
  assert.equal((await handles.operator.readChain(recordId)).length, before);
});

test('beginRedemption on a pure-capture profile refuses unredeemable-state; on open/refused likewise', async () => {
  // Pure-capture (any state): §11.2's preamble — on-iff-effects.
  const captureHandles = create(makeConfig([captureProfile()]));
  const capId = await openRecord(captureHandles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const cap = await captureHandles.operator.beginRedemption(capId, CONTENT);
  assert.equal(cap.status, 'refused');
  if (cap.status === 'refused') assert.equal(cap.code, 'unredeemable-state');

  // Effect-seam but still open:
  const handles = create(makeConfig([effectSeamProfile()]));
  const openId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const stillOpen = await handles.operator.beginRedemption(openId, CONTENT);
  assert.equal(stillOpen.status, 'refused');
  if (stillOpen.status === 'refused') assert.equal(stillOpen.code, 'unredeemable-state');

  // Effect-seam, terminally refused (§11.2's preamble names refused/expired explicitly):
  const refusingHandles = create(
    makeConfig([
      effectSeamProfile({ id: 'test.effect.refusing.v1', terminalRefusals: ['identity-authority-refused'] }),
    ]),
  );
  const refId = await openRecord(refusingHandles, CONTENT, 'test.effect.refusing.v1', DEFAULT_SUBJECT_REF);
  const refFin = await refusingHandles.operator.finalize(
    refId,
    identity({ authority: 'session:wrong-app' }),
    CONTENT,
    facts(),
  );
  assert.equal(refFin.status, 'refused', 'fixture: the record must terminally refuse');
  const onRefused = await refusingHandles.operator.beginRedemption(refId, CONTENT);
  assert.equal(onRefused.status, 'refused');
  if (onRefused.status === 'refused') assert.equal(onRefused.code, 'unredeemable-state');
});

test('beginRedemption with mismatched content refuses effect-mismatch, no append', async () => {
  // Begin-time correspondence is this build's ADDITION (comment-argued at the seam):
  // §11.2's Honest bound makes a MISMATCHED effect refusable at the seam — refusing
  // before a token is ever issued is what that buys in the separated shape.
  const { handles, recordId } = await confirmedEffectRecord();
  const before = (await handles.operator.readChain(recordId)).length;

  const outcome = await handles.operator.beginRedemption(recordId, { subject: 'week-1', total: 41 });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'effect-mismatch');
  assert.equal((await handles.operator.readChain(recordId)).length, before);
});

test('beginRedemption: unknown recordId throws (a caller error, not a refusal)', async () => {
  const handles = create(makeConfig([effectSeamProfile()]));
  await assert.rejects(
    handles.operator.beginRedemption('no-such-record', CONTENT),
    /unknown recordId 'no-such-record'/,
  );
});

test('the injectable tokenSource drives a deterministic token (internal seam, like the clock)', async () => {
  const store = new MemoryStore();
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store }),
    () => new Date(Date.UTC(2026, 0, 1)),
    undefined,
    () => 'fixed-token-under-test-000000000000000000000',
  );
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok');
  if (begun.status !== 'ok') return;
  assert.equal(begun.value.token, 'fixed-token-under-test-000000000000000000000');
});
```

(Note `createWithClock`'s third parameter stays `mintId` — pass `undefined` to take its
default. The direct `redeem()` state-gate pin for `redeeming`, the exclusivity pins, the
tampered-`redeeming` pins, and both ladders' order pairs are added in Steps 5-6 and Task
5 — this step's file is the begin core only.)

- [ ] **Step 3: Run to verify failure**

Run: `pnpm exec vitest run packages/record/test/redeem-token.test.ts`
Expected: FAIL — `beginRedemption` does not exist (TypeError / type error at compile).

- [ ] **Step 4: Implement `tokenSource`, `beginRedemption`, and the wiring**

**`create.ts`:**
- `KernelContext` gains `tokenSource: () => string;` with a doc sentence in the existing
  comment block: like `now`/`mintId`, deliberately OFF the public surface; the default is
  cryptographic; the injectable seam exists so the cross-backing byte-identity test can
  drive a fixed token (`tokenDigest` sits inside the transition digest).
- Add near `realClock`:

```ts
/** The default token source: 32 bytes of crypto randomness, base64url (43 chars) —
 * SPEC §11.2's "cryptographic randomness and enough entropy that its digest is not
 * invertible by guessing" (§13's low-entropy-preimage limit). */
function defaultTokenSource(): string {
  return randomBytes(32).toString('base64url');
}
```

  with `import { randomBytes } from 'node:crypto';` (precedented: `canonical.ts` /
  `id.ts` already import from `node:crypto`).
- `createWithClock(config, now, mintId = mintRecordId, tokenSource = defaultTokenSource)`
  — pass through to `makeKernel({ store, profiles, now, mintId, tokenSource })`; extend
  its doc comment to name the third knob and why (byte-identity determinism).
- `Kernel` gains `beginRedemption: OperatorSurface['beginRedemption'];` and (now, so Task
  5 only implements the kernel fn) `completeRedemption: OperatorSurface['completeRedemption'];`
  — NO: add `beginRedemption` only in this task; Task 5 adds `completeRedemption`
  end-to-end. Wire in `makeKernel`:

```ts
    beginRedemption: (recordId, content) => beginRedemptionKernel(ctx, recordId, content),
```

**`operator-surface.ts`:** add to the interface, after `redeem`:

```ts
  beginRedemption(
    recordId: string,
    content: unknown, // begin-time correspondence: this build's addition, argued at the seam
  ): Promise<Outcome<{ recordId: string; state: 'redeeming'; token: string; transitionRef: Digest }>>;
```

  add `beginRedemption: kernel.beginRedemption,` to the frozen literal, and update the
  file-header comment (the seam family now has a token half; SPEC names one verb —
  `redeem()` — so the two call names are this build's, recorded in the status doc and
  flagged to the pre-0.1 naming review).

**`kernel/redeem.ts`:** implement, after `redeem()`:

```ts
/**
 * beginRedemption — SPEC §11.2's token shape, the ISSUANCE half (second step-3
 * increment): `confirmed → redeeming { tokenDigest }`. The token is generated by
 * ctx.tokenSource (default: 32 bytes crypto randomness, base64url), its DIGEST is the
 * only thing persisted (DECISIONS #30: digest-only custody), and the raw token is
 * returned in the ok value EXACTLY ONCE — generated before the append, returned only
 * after it (a crash between the two strands the record, §11.2's lost-token pricing; the
 * reverse order would hand out a token whose edge never landed, strictly worse). NO tx
 * parameter: the token shape exists where "no transaction is shared" (§11.2), and
 * enlisting an issuance would let a host rollback erase the recorded tokenDigest while
 * the live token is out. NO re-issue: a begin against a `redeeming` record refuses
 * `unredeemable-state` (DECISIONS #30 — this build's mapping; §8's producer enumeration
 * predates the state, recorded in the status doc). Begin-time content correspondence is
 * this build's ADDITION, not spec-granted: §11.2's correspondence sentence reads at the
 * effect's execution (completion), but the Honest bound's "mismatched effects refusable
 * at the seam" is exactly what refusing BEFORE a token is issued buys.
 * Until the clock increment, a lost token permanently strands the (profile, subject)
 * pair — completeRedemption with the token is the sole exit (status doc: safe to ship,
 * not yet safe to operate).
 */
export async function beginRedemption(
  ctx: KernelContext,
  recordId: string,
  content: unknown,
): Promise<
  Outcome<{ recordId: string; state: 'redeeming'; token: string; transitionRef: Digest }>
> {
  const { store, now, tokenSource } = ctx;
  const pro = await prologue(ctx, 'beginRedemption', recordId);
  if ('refusal' in pro) return pro.refusal;
  const { chain, record, resolved, finalLeg } = pro.gated;

  // --- (4) state gate ------------------------------------------------------------------
  if (record.state === 'redeemed') {
    // A begin against a redeemed record IS §11.2's "replayed redemption of an
    // already-redeemed record" — at-most-once, checked before correspondence.
    return refused('already-redeemed');
  }
  if (record.state === 'redeeming') {
    return refused('unredeemable-state'); // no re-issue — doc comment above
  }
  if (record.state !== 'confirmed') {
    // open/refused/expired per §11.2's preamble; `redemption-failed` has no producer
    // until the clock increment — that arm of this check is dead code until then.
    return refused('unredeemable-state');
  }

  // --- (5) effect-content correspondence (this build's addition — doc comment above) ----
  const recomputed = digest(canonicalize(resolved.canonicalizer(content)));
  if (recomputed !== record.contentDigest) {
    return refused('effect-mismatch');
  }

  // --- (6) issue, then append `confirmed → redeeming` -----------------------------------
  const token = tokenSource();
  const tokenDigest = digest(token);
  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('beginRedemption: empty chain — the prologue length check holds');
  }
  const redeemingTransition: Transition = {
    recordId,
    seq: chain.length + 1,
    at: now().toISOString(),
    kind: 'redeeming',
    payload: { tokenDigest },
    prevHash: transitionDigest(last),
  };
  // `redeeming` is non-terminal (§2) — the derivation, never a literal: the pair's C1
  // hold CONTINUES through the token window. `dueAt` omitted: no clock exists in this
  // build (redeemBound is GOVERNED-guarded at construction).
  const meta: AppendMeta = {
    nonTerminal: nonTerminal('redeeming', finalLeg, resolved.effectSeam),
  };
  const res = await store.appendTransition('confirmed', redeemingTransition, meta);
  if (!res.appended) {
    // A racing writer moved the record between the read and the CAS; result-first.
    // (The family-wide residual re-read refinement replaces this in a later task of the
    // second step-3 increment.)
    return refused('unredeemable-state');
  }
  return ok({ recordId, state: 'redeeming', token, transitionRef: res.transitionDigest });
}
```

**Comment truth pass** (subjects land in this step):
- `nonterminal.ts:23-25`: "`redeeming` is always non-terminal — unreachable in this
  build (no caller…)" → "`redeeming` is always non-terminal — produced by
  `beginRedemption` since the second step-3 increment (the disjunction was written
  complete from step 1, ahead of that producer)."
- `types.ts:32`: → `// last three: effect-seam states (SPEC §2); 'redeemed' produced
  since the first step-3 increment, 'redeeming' since the second; 'redemption-failed'
  awaits the clock increment` (this line was stale BEFORE this increment — it missed
  `redeemed` — a pre-existing defect this increment fixes and records).
- `types.ts:46`: → `// this build's kernel emits: opened, consultation-recorded,
  confirmed, refused, expired, sealed, redeemed, redeeming — not yet redemption-failed
  (the clock increment) nor finding-raised/acknowledged (§10.2)` (also stale before this
  increment: it omitted `sealed` and `redeemed`).
- `store/semantics.ts:94-100`: rewrite the hedge sentence: the arm is now EXERCISED —
  `beginRedemption` (second step-3 increment) produces `redeeming`, and
  `appendChainCompromise`'s candidate walk reaches this predicate with
  `expectedCurrentState: 'redeeming'`; it remains defence-in-depth, not a C3 grant (a
  `redeeming` record is non-terminal and never reaches the terminal branch).
- `kernel/redeem.ts` header (:39-41) and rung-(4) comment (:120-121): split — the token
  shape is REAL as of the second step-3 increment (`beginRedemption`/`completeRedemption`
  below); both clocks remain the third increment's; `redemption-failed` stays a
  defensive, dead-until-clock arm. `redeem.test.ts`'s header (:1-6, :15-16) gets the same
  split.
- `agent-unreachability.test.ts:23`: `TRANSITIONING` gains `'beginRedemption'`,
  `'completeRedemption'` (the key-set pin would catch a leak; the probe stays symmetric —
  and listing `completeRedemption` now is correct: it must be unreachable on the agent
  handle whether or not it exists yet).

- [ ] **Step 5: Run the begin tests, then the suite**

Run: `pnpm exec vitest run packages/record/test/redeem-token.test.ts` — Expected: PASS.
Run: `pnpm test` — Expected: PASS, zero skips. Commit:

```powershell
git add -A packages/record
git commit -m @'
Issue the single-use token: begin the redeeming window, digest-only custody

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

- [ ] **Step 6: Row 10 — the redeeming chain-compromise candidates (red-first)**

Add to `redeem-token.test.ts`:

```ts
test('verify-first on a tampered redeeming chain: chain-compromise WITH a transitionRef, edge redeeming→refused', async () => {
  // Deferral-register row 10, retired by building at the second step-3 increment: SPEC §5
  // admits `redeeming → refused` DIRECTLY ("both are non-terminal states"). Before this
  // increment, a tampered redeeming chain fell through appendChainCompromise's catch
  // branch (replay threw on the kind) and would have surfaced REF-LESS; the candidate
  // lists now carry 'redeeming'.
  const inner = new MemoryStore();
  const { recordId, token } = await redeemingRecord(inner);

  void token; // the completion-driven twin of this test lands with Task 5
  const tampering = new TamperingStore(inner, recordId, tamperNonLast);
  const handles = create(makeConfig([effectSeamProfile()], { store: tampering }));

  const outcome = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
  assert.ok(outcome.transitionRef !== undefined, 'the compromise edge must carry a ref');

  const real = await inner.readChain(recordId);
  const last = real.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'refused');
  assert.deepEqual(last.payload, { code: 'chain-compromise' });
});
```

(If destructuring an unused `token` trips the linter even with the `void`, drop it from
the destructure instead. Task 5 Step 3 adds the completion-driven twin of this test.)

Run it — Expected: FAIL (`refused` lands but `transitionRef` is `undefined`: replay now
folds `redeeming`, so the dynamic candidate IS `'redeeming'`… verify what actually
happens: with Task 3's replay arm, `replay(chain).state` on a payload-tampered chain is
`'redeeming'` and the DYNAMIC candidate already appends — if the test PASSES already,
tamper the GENESIS KIND instead, which forces the catch branch, the corner row 10 names):

```ts
// If the payload tamper passes via the dynamic candidate, pin the CATCH branch instead:
const tampering = new TamperingStore(inner, recordId, (chain) => {
  const t = structuredClone(chain);
  const genesis = t[0];
  if (genesis === undefined) throw new Error('fixture: chain has a genesis');
  t[0] = { ...genesis, kind: 'confirmed' }; // genesis KIND tamper — replay() throws
  return t;
});
```

Both cases belong in the file (dynamic-candidate case and catch-branch case — the second
is the one that red-tests the static list addition).

Then edit `kernel/finalize.ts`:

```ts
    candidates = dedupe([replay(chain).state, 'open', 'confirmed', 'redeeming']);
```

and

```ts
    candidates = ['open', 'confirmed', 'redeeming'];
```

and extend `appendChainCompromise`'s doc comment: the fallback's third producible target
arrived with the second step-3 increment (`redeeming` — a genesis-KIND-tampered
`redeeming` chain still lands `redeeming→refused` WITH a transitionRef), and
`beginRedemption`/`completeRedemption` are further un-enlisted callers.

- [ ] **Step 7: Run tests, gates, commit**

Run: `pnpm exec vitest run packages/record/test/redeem-token.test.ts`, then `pnpm test`,
then all five gates.

```powershell
git add -A packages/record
git commit -m @'
Admit redeeming to the compromise candidates: row 10 retires by building

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 5: The completion — `completeRedemption`, custody, at-most-once, strand pins

**Files:**
- Modify: `packages/record/src/kernel/redeem.ts` (the third ladder)
- Modify: `packages/record/src/create.ts` (Kernel + wiring)
- Modify: `packages/record/src/operator-surface.ts` (interface + literal)
- Test: `packages/record/test/redeem-token.test.ts` (extend)
- Test: `packages/record/test/seal.test.ts` (one pin)

**Interfaces:**
- Consumes: Task 4's `prologue`, `redeemingRecord` fixture, `tokenSource`.
- Produces:
  `completeRedemption(ctx: KernelContext, recordId: string, token: string, content: unknown): Promise<Outcome<{ recordId: string; state: 'redeemed'; transitionRef: Digest }>>`
  exported from `kernel/redeem.ts`; `OperatorSurface.completeRedemption(recordId, token, content)`.

- [ ] **Step 1: Write the failing tests**

Extend `redeem-token.test.ts`:

```ts
// === completeRedemption: the presentation ==============================================

test('completeRedemption() with the issued token appends redeemed { via: "token", tokenDigest }', async () => {
  const { handles, recordId, token } = await redeemingRecord();

  const outcome = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;
  assert.equal(outcome.value.state, 'redeemed');

  const chain = await handles.operator.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'redeemed');
  // PAYLOAD KEY-SET PIN: exactly { via, tokenDigest } — §4's table row for the token
  // completion; the digest ties completion to issuance in the chain itself.
  assert.deepEqual(Object.keys(last.payload as object).sort(), ['tokenDigest', 'via']);
  assert.deepEqual(last.payload, { via: 'token', tokenDigest: digest(token) });
  assert.ok(!JSON.stringify(chain).includes(token), 'completion must not persist the token');

  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'redeemed');
});

test('THE RELEASE via the token path: after completion, the pair is held no longer', async () => {
  const store = new MemoryStore();
  const { handles, recordId, token } = await redeemingRecord(store);

  assert.equal(
    await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF),
    recordId,
    'fixture: the redeeming record holds the pair through the token window',
  );

  const outcome = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(outcome.status, 'ok', 'fixture: the completion must succeed');

  assert.equal(await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF), null);

  const staged = await handles.agent.stage(
    { subject: 'week-2', total: 41 },
    'test.effect.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const reopened = await handles.operator.open(staged.value.stagedRef);
  assert.equal(reopened.status, 'ok', 'a fresh decision for the released pair opens');
});

test('exclusivity through the token window: a second open() refuses record-exists, findNonTerminal names the blocker', async () => {
  // §4: "open()'s exclusivity check never auto-resolves a `redeeming` blocker, due or
  // not — it refuses `record-exists`" (the non-due variant is the only constructible one
  // in this build). ALSO the latent-throw fix pin: before the second step-3 increment,
  // open()'s blocker replay THREW on a redeeming chain; the replay arm fixed it.
  const store = new MemoryStore();
  const { handles } = await redeemingRecord(store);

  const staged = await handles.agent.stage(
    { subject: 'week-2', total: 99 },
    'test.effect.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const second = await handles.operator.open(staged.value.stagedRef);
  assert.equal(second.status, 'refused');
  if (second.status !== 'refused') return;
  assert.equal(second.code, 'record-exists');
});

test('at-most-once, replay half: a second completion refuses already-redeemed (even with the right token)', async () => {
  const { handles, recordId, token } = await redeemingRecord();
  const first = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(first.status, 'ok');

  const again = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(again.status, 'refused');
  if (again.status !== 'refused') return;
  assert.equal(again.code, 'already-redeemed');
});

test('begin after completion refuses already-redeemed (a begin is a redemption attempt too)', async () => {
  const { handles, recordId, token } = await redeemingRecord();
  await handles.operator.completeRedemption(recordId, token, CONTENT);

  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'refused');
  if (begun.status !== 'refused') return;
  assert.equal(begun.code, 'already-redeemed');
});

test('a wrong token refuses effect-mismatch, no append', async () => {
  const { handles, recordId } = await redeemingRecord();
  const before = (await handles.operator.readChain(recordId)).length;

  const outcome = await handles.operator.completeRedemption(
    recordId,
    'A'.repeat(43), // format-plausible, value-wrong
    CONTENT,
  );
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'effect-mismatch');
  assert.equal((await handles.operator.readChain(recordId)).length, before);
});

test('mismatched content at completion refuses effect-mismatch, no append', async () => {
  const { handles, recordId, token } = await redeemingRecord();
  const outcome = await handles.operator.completeRedemption(recordId, token, {
    subject: 'week-1',
    total: 41,
  });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'effect-mismatch');
});

test('content that re-canonicalizes identically completes ok (key order is not content)', async () => {
  const { handles, recordId, token } = await redeemingRecord();
  const outcome = await handles.operator.completeRedemption(recordId, token, {
    total: 40,
    subject: 'week-1', // same content, different key order — JCS canonicalizes
  });
  assert.equal(outcome.status, 'ok');
});

test('completion against a never-began confirmed record refuses unredeemable-state', async () => {
  const { handles, recordId } = await confirmedEffectRecord();
  const outcome = await handles.operator.completeRedemption(recordId, 'A'.repeat(43), CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state');
});

test('direct redeem() on a redeeming record refuses unredeemable-state — no token-bypassing close', async () => {
  // The first increment's defensive arm, now REACHABLE and pinned: a direct close of a
  // token-opened window would bypass the presentation the executor deduplicates on
  // (§11.2's Honest bound).
  const { handles, recordId } = await redeemingRecord();
  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state');
});

test('completeRedemption: a non-string token throws at argument intake (caller bug, not a refusal)', async () => {
  const { handles, recordId } = await redeemingRecord();
  await assert.rejects(
    handles.operator.completeRedemption(recordId, undefined as unknown as string, CONTENT),
    /token must be a string/,
  );
});

test('completeRedemption: a garbled persisted tokenDigest THROWS naming the storage fault, never loops on effect-mismatch', async () => {
  // A hash-intact chain whose redeeming payload lacks a string tokenDigest is a
  // storage/config fault (SPEC §8's loud-throw posture — the legId-throw precedent), not
  // "your token does not correspond": no token could ever correspond, and refusing
  // effect-mismatch would send the operator into a permanent retry loop against a lie.
  //
  // A TamperingStore cannot build this fixture: a payload tamper breaks the hash chain,
  // so rung (1) would refuse chain-compromise before the payload read. Instead the chain
  // is constructed DIRECTLY with storeGenesis/storeNext, which compute VALID hashes over
  // whatever payload they are given — the chain verifies clean and the garbled payload
  // reaches rung (5).
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-garbled', 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const confirmed = storeNext(genesis, 'confirmed', {
    actor: { principal: 'approver:1', authority: 'session:test-app' },
  });
  const redeeming = storeNext(confirmed, 'redeeming', { tokenDigest: 42 });
  await store.appendTransition(null, genesis, { nonTerminal: true });
  await store.appendTransition('open', confirmed, { nonTerminal: true });
  await store.appendTransition('confirmed', redeeming, { nonTerminal: true });

  const handles = create(makeConfig([effectSeamProfile()], { store }));
  await assert.rejects(
    handles.operator.completeRedemption('rec-garbled', 'A'.repeat(43), CONTENT),
    /tokenDigest/,
  );
});
```

**Implementer notes on the garbled test:** import `storeGenesis`/`storeNext` statically
at the top of the file (they join this file's imports when this test lands). The
`opened` genesis built by `storeGenesis` must satisfy `replay()`'s `OpenedPayload` reads
and the kernel's profile resolution: the profileId/legId must line up with
`'test.effect.v1'` / `effectSeamProfile()`'s default leg id (`'approver-decide'`) —
verify `storeGenesis`'s payload shape against `helpers/chain.ts` and pass/patch fields
accordingly (if `storeGenesis` hardcodes a different legId, the seam throws the legId
error instead of the tokenDigest one — the fixture must line the two up; the same
lineup matters for `record.contentDigest`, but the tokenDigest throw fires BEFORE the
content check, so a placeholder contentDigest is fine here).

Also add the strand pins:

```ts
// === safe to ship, not yet safe to operate: the strand set ============================

test('a begun record with a lost token has NO exit in this build except completion with the token', async () => {
  // Until the clock increment lands redeemBound's resolution, a lost token strands the
  // pair (SPEC §11.2 prices exactly this; §9.1's SHOULD-declare-redeemBound is
  // GOVERNED-guarded until the clock exists). Every seam refuses; the sweep is blind
  // (no dueAt was ever written). Pinned so the operational bound is executable fact.
  const store = new MemoryStore();
  const { handles, recordId, token } = await redeemingRecord(store);

  const sealed = await handles.operator.seal(recordId);
  assert.equal(sealed.status, 'refused');
  if (sealed.status === 'refused') assert.equal(sealed.code, 'unsealable-state');

  const direct = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(direct.status, 'refused');
  if (direct.status === 'refused') assert.equal(direct.code, 'unredeemable-state');

  const fin = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(fin.status, 'refused');
  if (fin.status === 'refused') assert.equal(fin.code, 'record-not-open');

  assert.deepEqual(
    await store.listDue(new Date('2999-01-01T00:00:00.000Z')),
    [],
    'no dueAt exists — the sweep is blind to the stranded record',
  );

  // The sole exit works:
  const done = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(done.status, 'ok');
});
```

And in `seal.test.ts`, alongside the existing unsealable pins:

```ts
test('seal() on a redeeming record refuses unsealable-state — the token window is non-terminal (argued → proven)', async () => {
  // SPEC §2: `redeeming` is non-terminal (decided, effect unresolved); §12 admits seal
  // only against a derived-terminal record. Constructible since the second step-3
  // increment — this pin converts seal.ts's gate-(4) argument into an executing proof.
  const store = new MemoryStore();
  const handles = create(makeConfig([effectSeamProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok');

  const sealed = await handles.operator.seal(recordId);
  assert.equal(sealed.status, 'refused');
  if (sealed.status !== 'refused') return;
  assert.equal(sealed.code, 'unsealable-state');
});
```

(Match `seal.test.ts`'s existing imports/fixtures — it already imports the profile
helpers; reuse its local conventions rather than duplicating `CONTENT` if it has one.)

And both ladders' adjacent-pair order tests, with the derivation comment:

```ts
// === adjacent-pair order tests, both ladders ===========================================
// Derived per redeem.test.ts's discipline. BEGIN ladder — jointly constructible pairs:
//   (1)->(4): tampered chain + redeeming state — chain-compromise must win (covered by
//     the tampered-redeeming tests above).
//   (4)->(5): a redeemed record offered WRONG content — already-redeemed must win.
//   (4)->(5) re-issue half: a redeeming record offered wrong content —
//     unredeemable-state must win.
// COMPLETE ladder — jointly constructible pairs:
//   (4)->(5): a redeemed record + WRONG token — already-redeemed must win (at-most-once
//     outranks mismatch reporting).
//   (5) internal (token-vs-content order): NOT pinnable via codes — both refuse
//     effect-mismatch; recorded here, not tested.
//   (5)->(6): a mismatch plus a racing writer — needs the racing store; the racing task
//     covers the (6) residual on its own.
// Not jointly constructible (and why): (2)->(x) — an unconfigured profile is
// defensive-only, as redeem.test.ts's derivation records; (3)->(4) — a pure-capture
// record cannot reach redeeming/redeemed.

test('order (4)->(5), begin ladder: a redeemed record with wrong content refuses already-redeemed', async () => {
  const { handles, recordId, token } = await redeemingRecord();
  await handles.operator.completeRedemption(recordId, token, CONTENT);
  const outcome = await handles.operator.beginRedemption(recordId, { subject: 'week-1', total: 999 });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'already-redeemed');
});

test('order (4)->(5), begin ladder re-issue half: a redeeming record with wrong content refuses unredeemable-state', async () => {
  const { handles, recordId } = await redeemingRecord();
  const outcome = await handles.operator.beginRedemption(recordId, { subject: 'week-1', total: 999 });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state');
});

test('order (4)->(5), complete ladder: a redeemed record with a WRONG token refuses already-redeemed', async () => {
  const { handles, recordId, token } = await redeemingRecord();
  await handles.operator.completeRedemption(recordId, token, CONTENT);
  const outcome = await handles.operator.completeRedemption(recordId, 'A'.repeat(43), CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'already-redeemed');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm exec vitest run packages/record/test/redeem-token.test.ts`
Expected: FAIL — `completeRedemption` does not exist.

- [ ] **Step 3: Implement `completeRedemption` + wiring**

In `kernel/redeem.ts`:

```ts
/**
 * completeRedemption — SPEC §11.2's token shape, the PRESENTATION half (second step-3
 * increment): `redeeming → redeemed { via: 'token', tokenDigest }` on presenting the
 * issued token. At-most-once's replay half is the state gate (`already-redeemed`,
 * checked BEFORE correspondence — outranks mismatch reporting); the correspondence rung
 * checks the token (digest of the presented token vs the chain-recorded tokenDigest)
 * then the content, both refusing `effect-mismatch` — one code by §11.2's own sentence,
 * so the internal order is unobservable and recorded here rather than pinned. The
 * executor's own deduplication, keyed on the token, remains the separated host's MUST
 * (§11.2's Honest bound) — this seam is defense-in-depth beside it, never a substitute.
 * NO tx, deliberately — same argument as beginRedemption's doc comment.
 */
export async function completeRedemption(
  ctx: KernelContext,
  recordId: string,
  token: string,
  content: unknown,
): Promise<Outcome<{ recordId: string; state: 'redeemed'; transitionRef: Digest }>> {
  if (typeof token !== 'string') {
    // A caller bug throws at argument intake, ahead of every outcome — the same depth as
    // finalize's consultation-shape throw (SPEC §8: caller errors are not refusals). An
    // unguarded non-string would surface as an incidental TypeError out of the digest
    // internals, which is the one wrong answer.
    throw new TypeError(
      `completeRedemption: token must be a string (got ${typeof token}) — a caller error, not a domain refusal (SPEC §8)`,
    );
  }
  const { store, now } = ctx;
  const pro = await prologue(ctx, 'completeRedemption', recordId);
  if ('refusal' in pro) return pro.refusal;
  const { chain, record, resolved, finalLeg } = pro.gated;

  // --- (4) state gate ------------------------------------------------------------------
  if (record.state === 'redeemed') {
    // §11.2: "a replayed redemption of an already-redeemed record refuses
    // `already-redeemed`" — checked before any correspondence.
    return refused('already-redeemed');
  }
  if (record.state !== 'redeeming') {
    // A never-began `confirmed`, and open/refused/expired. `redemption-failed` is DEAD
    // CODE until the clock increment — replay() still throws on that kind upstream, so
    // no record can reach this gate carrying it; the arm exists for the day it can.
    return refused('unredeemable-state');
  }

  // --- (5) correspondence: the token, then the content -----------------------------------
  let issued: Transition | undefined;
  for (let i = chain.length - 1; i >= 0; i--) {
    const t = chain[i];
    if (t !== undefined && t.kind === 'redeeming') {
      issued = t;
      break;
    }
  }
  if (issued === undefined) {
    throw new Error(
      `completeRedemption: state is 'redeeming' but no redeeming transition exists in the chain for '${recordId}' — the replay fold guarantees one`,
    );
  }
  const persisted = (issued.payload as { tokenDigest?: unknown }).tokenDigest;
  if (typeof persisted !== 'string') {
    // A hash-intact chain whose redeeming payload carries no string tokenDigest is a
    // storage/config fault — SPEC §8's loud-throw posture (the legId-throw precedent),
    // NEVER `effect-mismatch`: no presentable token could ever correspond, and the
    // refusal would send the operator into a permanent retry loop against a lie.
    throw new Error(
      `completeRedemption: persisted 'redeeming' payload for record '${recordId}' carries no string tokenDigest — a garbled or foreign chain is a storage/config fault, not a domain outcome (SPEC §8)`,
    );
  }
  // Plain `===` over digest strings, DELIBERATELY not a constant-time compare: the
  // compared value (tokenDigest) is public chain data any chain reader already holds;
  // the secret is the PREIMAGE, protected by the digest's preimage resistance. A timing
  // oracle on `===` can only ever recover the non-secret side; `timingSafeEqual` here
  // would defend nothing. (Written down so nobody "fixes" it.)
  if (digest(token) !== persisted) {
    return refused('effect-mismatch');
  }
  const recomputed = digest(canonicalize(resolved.canonicalizer(content)));
  if (recomputed !== record.contentDigest) {
    return refused('effect-mismatch');
  }

  // --- (6) append `redeeming → redeemed { via: 'token', tokenDigest }` ------------------
  const last = chain.at(-1);
  if (last === undefined) {
    throw new Error('completeRedemption: empty chain — the prologue length check holds');
  }
  const redeemedTransition: Transition = {
    recordId,
    seq: chain.length + 1,
    at: now().toISOString(),
    kind: 'redeemed',
    payload: { via: 'token', tokenDigest: persisted },
    prevHash: transitionDigest(last),
  };
  // Terminal by the derivation — THE RELEASE via the token path; dueAt omitted clears
  // nothing (none was ever written in this build) and is §12's omission rule regardless.
  const meta: AppendMeta = {
    nonTerminal: nonTerminal('redeemed', finalLeg, resolved.effectSeam),
  };
  const res = await store.appendTransition('redeeming', redeemedTransition, meta);
  if (!res.appended) {
    // A racing writer; result-first. (The family-wide residual re-read refinement
    // replaces this in a later task of the second step-3 increment.)
    return refused('unredeemable-state');
  }
  return ok({ recordId, state: 'redeemed', transitionRef: res.transitionDigest });
}
```

Wire it: `create.ts` `Kernel` gains
`completeRedemption: OperatorSurface['completeRedemption'];`, `makeKernel` gains
`completeRedemption: (recordId, token, content) => completeRedemptionKernel(ctx, recordId, token, content),`;
`operator-surface.ts` interface gains:

```ts
  completeRedemption(
    recordId: string,
    token: string, // the single-use token beginRedemption returned — presented, never persisted
    content: unknown,
  ): Promise<Outcome<{ recordId: string; state: 'redeemed'; transitionRef: Digest }>>;
```

and the frozen literal gains `completeRedemption: kernel.completeRedemption,`.

Also add the completion-driven tampered-chain case promised in Task 4 Step 6:

```ts
test('verify-first at completion: a tampered redeeming chain refuses chain-compromise before any token check', async () => {
  const inner = new MemoryStore();
  const { recordId, token } = await redeemingRecord(inner);
  const tampering = new TamperingStore(inner, recordId, tamperNonLast);
  const handles = create(makeConfig([effectSeamProfile()], { store: tampering }));

  const outcome = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
  assert.ok(outcome.transitionRef !== undefined);
});
```

- [ ] **Step 4: Run the file, then the suite, then gates; commit**

Run: `pnpm exec vitest run packages/record/test/redeem-token.test.ts packages/record/test/seal.test.ts`
Expected: PASS. Then `pnpm test` (zero skips) and all five gates.

```powershell
git add -A packages/record
git commit -m @'
Complete on presentation: the token returns once, the pair releases

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 6: The honest residual — family-wide CAS re-read

**Files:**
- Modify: `packages/record/src/kernel/redeem.ts` (residual helper + three call sites)
- Test: `packages/record/test/redeem-token.test.ts` (racing pins via `RaceOnceStore`)

**Interfaces:**
- Consumes: `RaceOnceStore` (`test/helpers/stores.ts:141` — purpose-built, so far
  consumer-less: "included so a later phase… has it ready"; this is that phase).
- Produces: a local `residualRefusal(store, recordId)` used by all three ladders.

- [ ] **Step 1: Write the failing racing tests**

```ts
// === the racing residual: the loser's code agrees with what re-invocation says =========

test('complete-vs-complete race: the CAS loser refuses already-redeemed, not unredeemable-state', async () => {
  // §11.2's at-most-once names the loser's true situation: the record IS redeemed. A
  // crash-recovering separated executor needs `already-redeemed` ("the edge landed —
  // consult your idempotency store") to be distinguishable from `unredeemable-state`
  // ("redemption does not apply"). The residual re-reads once (advisory, no append).
  const inner = new MemoryStore();
  const { recordId, token } = await redeemingRecord(inner);

  const { storeNext } = await import('./helpers/chain.js');
  const racing = new RaceOnceStore(
    inner,
    (expected, t) => expected === 'redeeming' && t.kind === 'redeemed',
    async (innerStore, rid) => {
      // The WINNER: land a completed redemption directly before the loser's append.
      const chain = await innerStore.readChain(rid);
      const head = chain.at(-1);
      if (head === undefined) throw new Error('fixture: chain has a head');
      const winner = storeNext(head, 'redeemed', {
        via: 'token',
        tokenDigest: digest(token),
      });
      const res = await innerStore.appendTransition('redeeming', winner, { nonTerminal: false });
      if (!res.appended) throw new Error('fixture: the winner must land');
      return undefined; // loser's append then delegates and CAS-fails
    },
  );
  const handles = create(makeConfig([effectSeamProfile()], { store: racing }));

  const loser = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(loser.status, 'refused');
  if (loser.status !== 'refused') return;
  assert.equal(loser.code, 'already-redeemed');
});

test('begin-vs-begin race: the loser refuses unredeemable-state — agreeing with the no-re-issue gate', async () => {
  const inner = new MemoryStore();
  const { recordId } = await confirmedEffectRecord(inner);

  const { storeNext } = await import('./helpers/chain.js');
  const racing = new RaceOnceStore(
    inner,
    (expected, t) => expected === 'confirmed' && t.kind === 'redeeming',
    async (innerStore, rid) => {
      const chain = await innerStore.readChain(rid);
      const head = chain.at(-1);
      if (head === undefined) throw new Error('fixture: chain has a head');
      const winner = storeNext(head, 'redeeming', {
        tokenDigest: `sha256:${'c'.repeat(64)}`,
      });
      const res = await innerStore.appendTransition('confirmed', winner, { nonTerminal: true });
      if (!res.appended) throw new Error('fixture: the winner must land');
      return undefined;
    },
  );
  const handles = create(makeConfig([effectSeamProfile()], { store: racing }));

  const loser = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(loser.status, 'refused');
  if (loser.status !== 'refused') return;
  assert.equal(loser.code, 'unredeemable-state');
});

test('direct-vs-direct race: the loser refuses already-redeemed — the family-wide refinement, first increment seam included', async () => {
  // An AUTHORIZED behavior change to the first step-3 increment's seam (its flat
  // residual was never pinned — that increment's derivation comment declined a racing
  // store): the refusal now agrees with what re-invocation would say.
  const inner = new MemoryStore();
  const { recordId } = await confirmedEffectRecord(inner);

  const { storeNext } = await import('./helpers/chain.js');
  const racing = new RaceOnceStore(
    inner,
    (expected, t) => expected === 'confirmed' && t.kind === 'redeemed',
    async (innerStore, rid) => {
      const chain = await innerStore.readChain(rid);
      const head = chain.at(-1);
      if (head === undefined) throw new Error('fixture: chain has a head');
      const winner = storeNext(head, 'redeemed', { via: 'direct' });
      const res = await innerStore.appendTransition('confirmed', winner, { nonTerminal: false });
      if (!res.appended) throw new Error('fixture: the winner must land');
      return undefined;
    },
  );
  const handles = create(makeConfig([effectSeamProfile()], { store: racing }));

  const loser = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(loser.status, 'refused');
  if (loser.status !== 'refused') return;
  assert.equal(loser.code, 'already-redeemed');
});
```

(Move the `await import('./helpers/chain.js')` to a static top-of-file import in the
committed code — shown inline here only to keep each test self-contained on the page.
`RaceOnceStore` joins the `TamperingStore` import from `./helpers/stores.js`.)

- [ ] **Step 2: Run to verify failure**

Run: `pnpm exec vitest run packages/record/test/redeem-token.test.ts`
Expected: the complete-vs-complete and direct-vs-direct tests FAIL (`unredeemable-state`
where `already-redeemed` is asserted); begin-vs-begin PASSES already (flat mapping
happens to agree) — keep it as the consistency pin.

- [ ] **Step 3: Implement the residual helper and rewire all three ladders**

In `kernel/redeem.ts`:

```ts
/**
 * The family-wide CAS-residual refusal (second step-3 increment; an authorized behavior
 * change to the first increment's direct seam, whose flat `unredeemable-state` residual
 * was never pinned): when an append's compare-and-swap fails, a racing writer moved the
 * record between the read and the CAS. Re-read ONCE — advisory, no append, at-most-once
 * untouched — and let the fresh state pick the code, so the loser's refusal always
 * agrees with what re-invocation would say: a record now `redeemed` is §11.2's "replayed
 * redemption of an already-redeemed record" (`already-redeemed` — the case a
 * crash-recovering separated executor must be able to distinguish); anything else maps
 * to the seams' own residual, `unredeemable-state`. A chain that no longer replays is
 * not this helper's to diagnose (the caller's NEXT invocation will hit verify-first).
 */
async function residualRefusal(store: Store, recordId: string): Promise<Outcome<never>> {
  try {
    const fresh = replay(await store.readChain(recordId));
    if (fresh.state === 'redeemed') return refused('already-redeemed');
  } catch {
    // fall through — result-first either way
  }
  return refused('unredeemable-state');
}
```

(Import `Store` type from `../store/store.js` if not already imported.) Replace the three
`if (!res.appended) { return refused('unredeemable-state'); }` blocks (direct `redeem`,
`beginRedemption`, `completeRedemption`) with:

```ts
  if (!res.appended) {
    return residualRefusal(store, recordId);
  }
```

and delete each site's "(The family-wide residual re-read refinement replaces this…)"
placeholder comment — the helper's doc comment now carries the argument. Update
`redeem.test.ts`'s ladder-header comment rung (6) line ("store conflict residual ⇒
unredeemable-state") to name the re-read refinement.

- [ ] **Step 4: Run tests, gates, commit**

Run: `pnpm exec vitest run packages/record/test/redeem-token.test.ts`, then `pnpm test`,
then all five gates.

```powershell
git add -A packages/record
git commit -m @'
Re-read on a lost race: the loser's refusal agrees with re-invocation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 7: Cross-backing coverage — conformance arms and the byte-identity token leg

**Files:**
- Modify: `packages/record/test/conformance/store-conformance.ts` (four new pins)
- Modify: `packages/record/test/cross-backing-byte-identity.test.ts` (tokenFlow)

**Interfaces:**
- Consumes: `storeGenesis`/`storeNext` (helpers/chain.js), `APPROVER`
  (helpers/store-fixtures.js), `runStoreConformance`'s `makeStore`; Task 4's
  `createWithClock(…, tokenSource)` 4th parameter.
- Produces: nothing later tasks consume — pure coverage.

- [ ] **Step 1: Add the conformance pins (they should pass immediately — store semantics
  were built ahead; a failure here is a real backing bug, STOP and report)**

Inside `runStoreConformance`'s describe block, in the appendTransition section:

```ts
    test('redeeming: confirmed → redeeming is a CAS-gated state-leaving append; nonTerminal:true persists', async () => {
      // New KINDS first minted by the second step-3 increment — the store semantics
      // (stateOf / C1 / C3) were built ahead of the producer; these pins convert that
      // from argued to executed against EVERY backing.
      const store = makeStore();
      const genesis = storeGenesis('rec-rdm-1', 'profile.p1', 'subject:rdm1');
      await store.appendTransition(null, genesis, { nonTerminal: true });
      const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
      await store.appendTransition('open', confirmed, { nonTerminal: true });

      const redeeming = storeNext(confirmed, 'redeeming', {
        tokenDigest: 'sha256:' + 'f'.repeat(64),
      });
      const wrongCas = await store.appendTransition('open', redeeming, { nonTerminal: true });
      assert.equal(wrongCas.appended, false, 'the CAS gates the redeeming append');
      const result = await store.appendTransition('confirmed', redeeming, { nonTerminal: true });
      assert.equal(result.appended, true);
    });

    test('C1: a redeeming record holds the (profile, subject) pair — a second genesis conflicts, findNonTerminal names it', async () => {
      const store = makeStore();
      const genesis = storeGenesis('rec-rdm-2', 'profile.p1', 'subject:rdm2');
      await store.appendTransition(null, genesis, { nonTerminal: true });
      const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
      await store.appendTransition('open', confirmed, { nonTerminal: true });
      const redeeming = storeNext(confirmed, 'redeeming', {
        tokenDigest: 'sha256:' + '1'.repeat(64),
      });
      await store.appendTransition('confirmed', redeeming, { nonTerminal: true });

      const second = storeGenesis('rec-rdm-2b', 'profile.p1', 'subject:rdm2');
      const conflict = await store.appendTransition(null, second, { nonTerminal: true });
      assert.equal(conflict.appended, false, 'C1 blocks a second live record for the pair');
      assert.equal(await store.findNonTerminal('profile.p1', 'subject:rdm2'), 'rec-rdm-2');
    });

    test('redeeming → redeemed releases the pair (nonTerminal:false persists via meta)', async () => {
      const store = makeStore();
      const genesis = storeGenesis('rec-rdm-3', 'profile.p1', 'subject:rdm3');
      await store.appendTransition(null, genesis, { nonTerminal: true });
      const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
      await store.appendTransition('open', confirmed, { nonTerminal: true });
      const redeeming = storeNext(confirmed, 'redeeming', {
        tokenDigest: 'sha256:' + '2'.repeat(64),
      });
      await store.appendTransition('confirmed', redeeming, { nonTerminal: true });

      const redeemed = storeNext(redeeming, 'redeemed', {
        via: 'token',
        tokenDigest: 'sha256:' + '2'.repeat(64),
      });
      const result = await store.appendTransition('redeeming', redeemed, { nonTerminal: false });
      assert.equal(result.appended, true);
      assert.equal(await store.findNonTerminal('profile.p1', 'subject:rdm3'), null);
    });

    test('C3: a compromise-classed refused edge is admitted against a redeeming record (SPEC §5: directly — both non-terminal)', async () => {
      const store = makeStore();
      const genesis = storeGenesis('rec-rdm-4', 'profile.p1', 'subject:rdm4');
      await store.appendTransition(null, genesis, { nonTerminal: true });
      const confirmed = storeNext(genesis, 'confirmed', { actor: APPROVER });
      await store.appendTransition('open', confirmed, { nonTerminal: true });
      const redeeming = storeNext(confirmed, 'redeeming', {
        tokenDigest: 'sha256:' + '3'.repeat(64),
      });
      await store.appendTransition('confirmed', redeeming, { nonTerminal: true });

      const refusedEdge = storeNext(redeeming, 'refused', { code: 'chain-compromise' });
      const result = await store.appendTransition('redeeming', refusedEdge, { nonTerminal: false });
      assert.equal(result.appended, true, 'a redeeming record admits the compromise edge directly');
    });
```


- [ ] **Step 2: Add the byte-identity token flow**

In `cross-backing-byte-identity.test.ts` (imports gain `effectSeamProfile`):

```ts
const FIXED_TOKEN = 'byte-identity-fixed-token-00000000000000000';

async function tokenFlow(store: Store): Promise<Transition[]> {
  const clock = () => new Date(T0);
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store }),
    clock,
    fixedMint('cross-token'),
    () => FIXED_TOKEN,
  );
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok', 'fixture: the issuance must succeed');
  const completed = await handles.operator.completeRedemption(recordId, FIXED_TOKEN, CONTENT);
  assert.equal(completed.status, 'ok', 'fixture: the completion must succeed');
  return handles.operator.readChain(recordId);
}

test('the token shape produces byte-identical chains over both backings (fixed token via the internal seam)', async () => {
  // The first minted kinds whose payloads exercise the two backings' differing
  // round-trip postures (JSON round-trip vs structuredClone) — exactly where
  // cross-backing encoding drift is likeliest. Determinism needs the THIRD injectable
  // knob (tokenSource) beside the clock and the id minter: tokenDigest sits inside the
  // transition digest, so real randomness would make byte-for-byte comparison
  // impossible.
  const memory = await tokenFlow(new MemoryStore());
  const sqlite = await tokenFlow(new SqliteStore(':memory:'));
  assertByteIdentical(memory, sqlite, 'token path');
});
```

Update the file's header comment: "BOTH injectable knobs" becomes "all three injectable
knobs createWithClock carries" (clock, id minter, token source).

- [ ] **Step 3: Run both conformance callers + the byte-identity file, then suite, gates, commit**

Run: `pnpm exec vitest run packages/record/test/memory-store-conformance.test.ts packages/record/test/sqlite-store-conformance.test.ts packages/record/test/cross-backing-byte-identity.test.ts`
Expected: PASS (both backings inherit the four pins; the token chains match byte-for-byte).
Then `pnpm test`, all five gates.

```powershell
git add -A packages/record
git commit -m @'
Pin redeeming across backings: conformance arms and a fixed-token byte-identity leg

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 8: The record — register, status doc, provenance, CLAUDE.md, README, sweeps

**Files:**
- Modify: `docs/process/deferral-register.md` (row 10 out, row 16 in)
- Modify: `docs/process/implementation-status.md` (the audit's full must-edit list)
- Modify: `docs/process/adopted-source-provenance.md` (:483-486 update note)
- Modify: `CLAUDE.md` (:38, :134-144)
- Modify: `README.md` (:21-24, :38, :68-73)
- Modify: `packages/record/test/exclusivity.test.ts:216` (pre-existing stale comment)

**Interfaces:**
- Consumes: everything landed in Tasks 1-7; the spec's §6 ("The record") is this task's
  requirements list — read it in full before editing.

**Standing discipline:** name the increment explicitly everywhere ("the second step-3
increment" / "the token-shape increment"); never bare "this increment". Historical docs
under `docs/superpowers/` and `docs/analysis/` are LEAVE-ALONE (true when written).
Every SPEC phrase quoted must be hand-verified whitespace-collapsed.

- [ ] **Step 1: Deferral register**

Delete row 10 entirely (retires by building — the register's preamble: a gap is an entry
that has left; the number is never reused). Add row 16 (next never-used number — 12, 13,
14 are retired, 15 is live):

```markdown
| 16 | The token-shape seams (`beginRedemption`/`completeRedemption`, second step-3 increment) take no `tx`: an enlisted token issuance or completion — a co-located record store with a REMOTE executor, wanting the `redeeming` edge atomic with a host outbox row, which would also shrink the crash-strand window between the append and the token's return — is deliberately unbuilt. SPEC §12's `tx` seam states its purpose as the co-located direct shape, and §11.2 defines the token shape by "no transaction is shared", so this is a scope reading, not an omission. Adding an optional trailing `tx?` later is additive, not breaking; the enlisted-tampered corner's no-edge refusal (the direct seam's rung-(1) shape) is what such a caller would inherit | The first host architecture that needs it, or the 0.1 cut — whichever lands first | 2026-08-13 |
```

- [ ] **Step 2: Implementation status**

Work through every row the process audit named, with these content requirements:

- **Steps table, step 3 row (:44):** still "Started, not exited" — now two of three
  increments landed. Name the second: the token shape
  (`beginRedemption`/`completeRedemption`, `confirmed → redeeming { tokenDigest }`,
  `redeeming → redeemed { via: 'token', tokenDigest }`, the single-use token returned
  once and never persisted, the family-wide CAS-residual re-read, the GOVERNED
  `redeemBound` guard, row 10 retired). Only the clock increment (C) remains.
- **Steps-at-a-glance sentence (:51-55):** fix "no redemption" — pre-existing drift,
  stale since the first step-3 increment; say so when fixing it.
- **§2 row (:163):** `redeeming` is now reachable (producer: `beginRedemption`); only
  `redemption-failed` remains typed-but-unreachable (the clock increment).
- **§4 row (:166):** `redeeming` moves to Built (emitted kinds list grows); note the
  `bound?` key is UNMINTABLE in this build by construction (the `redeemBound` GOVERNED
  guard) — the present-iff-declared rule is honored vacuously, not violated;
  `redemption-failed` stays Not-built.
- **§5 row (:167):** `appendChainCompromise` now has the `redeeming` candidates (row 10
  built) and two further un-enlisted callers (`beginRedemption`/`completeRedemption`).
- **§9 row (:171):** the operator surface grew two calls; RECORD THE NAMING DIVERGENCE:
  every sealed-set enumeration names one redemption verb (`redeem()`), the two call
  names are this build's, held as a spec-vs-build difference and flagged to register
  row 6's pre-0.1 naming review. "What remains unbuilt at that seam is both redemption
  clocks."
- **§9.1 row (:172):** only the clock increment remains; `redeemBound` now
  GOVERNED-throws (the SHOULD-declare advice is loudly unsatisfiable until the clock —
  intentionally, bytes-vs-index argument).
- **§11.2 row (:181):** the largest edit. Built: the token shape whole (both seams, the
  entropy/custody contract, at-most-once's replay half at both seams, the token-vs-content
  correspondence, THE RELEASE via the token path, the strand pins). Not-built: both
  clocks, `redemption-timeout`, the elapsed-`redeeming` unknown-outcome half of
  at-most-once. Record these as named items: (a) the two `unredeemable-state` producer
  extensions (begin-on-`redeeming`, direct-`redeem()`-on-`redeeming`) — §8's stability
  rule, extensions documented rather than slipped; (b) begin-time correspondence as this
  build's addition; (c) the family-wide residual re-read as an authorized behavior
  change to the first increment's seam (flat residual was never pinned); (d) **safe to
  ship, not yet safe to operate**: until the clock increment, a lost token permanently
  strands the pair — `completeRedemption` with the token is the sole exit, and
  operator-owned storage makes deliberate tampering the only other C1 release (the
  argument for landing the clock increment promptly).
- **Row-10 bullet (:395-396):** move from "Still outstanding" to a named-boundaries
  retirement paragraph (mirror rows 9/12/14's retirement paragraphs).
- **Raised-by-review list:** add the four-audit pre-review of the second step-3
  increment's design and its headline catches (the CAS-loser honesty finding, the
  garbled-tokenDigest posture, the `redeemBound` bytes-vs-index ruling, the injectable
  token source).

- [ ] **Step 3: Provenance, CLAUDE.md, README, stale comment**

- `adopted-source-provenance.md:483-486` — add the missing "**Update, present tense**"
  note to the "Redemption (the effect seam)" LATER-STEP bullet, matching its neighbors'
  convention: the direct shape and `redeemed` landed at the first step-3 increment (a
  gap that increment's sweep missed — say so); the token shape, `redeeming`, and token
  issuance landed at the second; the two redemption clocks and `redemption-failed`
  remain LATER-STEP.
- `CLAUDE.md:38` — "…the token shape and both redemption clocks remain" → the token
  shape landed at the second step-3 increment (`beginRedemption`/`completeRedemption`);
  both redemption clocks remain.
- `CLAUDE.md:134-144` (feature-guard paragraph) — rewrite the load-bearing sentence:
  the token shape is built (two NEW operator calls — no throwing-stub history to lift,
  unlike `redeem`'s); what remains governed is the clocks: `redeemBound` now throws at
  construction (`config.ts`), `confirmToRedeem` stays accepted-but-inert, and
  `redemption-timeout` has no producer until the clock increment. Keep the
  release-path and `seal()`-is-not-a-release sentences intact — they remain true.
- `README.md:21-24` and `:68-73` — same movement as CLAUDE.md:38 (token shape landed,
  clocks remain, step 3 still started-not-exited at two of three); `:38` layout row
  gains the token-shape seams.
- `packages/record/test/exclusivity.test.ts:216` — "(finalize() does not exist yet):" is
  stale since step 1; fix to "(arranged by DIRECT store appends — this test predates
  finalize() and deliberately keeps store-level arrangement)". Attribute in the commit
  message as pre-existing drift found by the second increment's audit.

- [ ] **Step 4: The sweep**

From the repo root, run each pattern over tracked files and judge every hit (excluding
`docs/concept/` — sealed — and `docs/superpowers/` + `docs/analysis/` historical docs,
which are leave-alone):

```powershell
git grep -nE "token shape|still unbuilt|does not exist( yet)?|not produced in this build|emits only|no producer|unreachable in this build|if a later build step|later step-3 increments|the token and clock increments|until the token|second and third (step-3 )?increments?|re-issu|strand|no test.*can turn it red" -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
git grep -nwE "CORE" -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
```

Every remaining hit must be either (a) still true, (b) already fixed by Tasks 1-7, or
(c) fixed now. Both deixis directions: claims that something WILL land that now HAS, and
claims that something HAS NOT landed that now HAS. Also check
`docs/process/adopted-source-provenance.md`'s LATER-STEP section bullet-by-bullet for
missing update notes (its staleness carries no trigger keyword — the file-list lesson).

- [ ] **Step 5: Verify citations, gates, commit**

Hand-verify every quoted SPEC/DECISIONS phrase in the edited markdown against a
whitespace-collapsed read of the source. Run all five gates (contract-scan gates the
markdown too).

```powershell
git add -A
git commit -m @'
Record the second step-3 increment: row 10 retires, row 16 opens, the divergence is named

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 9: Exit verification

**Files:** none modified (fixes only if a gate fails).

- [ ] **Step 1: Clean-tree gates**

From a fresh shell (`$env:PATH = "$env:APPDATA\npm;$env:PATH"`), confirm
`git status --porcelain` is empty, then run in order:

```powershell
pnpm typecheck
pnpm lint
pnpm lint:strict
pnpm test
node scripts/contract-scan.mjs
```

Expected: all five green; `pnpm test` reports ZERO skipped tests; the scan prints
nothing and exits 0.

- [ ] **Step 2: Freeze verification**

```powershell
git diff 1575938..HEAD -- packages/record/test/byte-stability.test.ts
```

Expected: EMPTY (the four frozen digest literals never moved). Also confirm
`git diff 1575938..HEAD -- packages/record/src/chain/encoding.ts` is empty (the
transition encoding is frozen) and that `packages/record/src/store/` diffs contain only
the `REGISTRY` rename and comment edits in `semantics.ts` (no semantic store change).

- [ ] **Step 3: Report**

Report: the commit list with one line each; test/file counts (expect roughly 30+ new
tests over the pre-increment 372/32/0-skips baseline — report exact numbers, do not
carry these forward as claims); the strand statement ("safe to ship, not yet safe to
operate") as recorded; register rows now live (1, 4, 5, 6, 11, 15, 16); and that
`main` remains unpushed (pushing is user-gated).
