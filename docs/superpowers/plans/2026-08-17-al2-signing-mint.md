# AL2 Signing Mint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land AL2 increment 1 of 3 — the signing layer: per-profile declaration,
signer/verifier hooks, the detached-signature sidecar, sign-before-append via a Store
decorator, and the `verifySignatures` audit read. AL1 semantics untouched; nothing
enforces; no sealed-set edit.

**Architecture:** A new `src/signing/` package-internal layer (interface, memory
reference, decorator) OUTSIDE the frozen `src/store/`; `create()` wraps the injected
store iff `config.signing` is present, so every append path signs with ZERO seam
edits; one new operator read correlates chain-driven.

**Tech Stack:** TypeScript strict, vitest, Biome; pnpm workspace, Node >=22.16
(tests use `node:crypto` Ed25519 for real signer/verifier fixtures — the LIBRARY does
no crypto, hooks only).

**Spec:** docs/superpowers/specs/2026-08-17-al2-signing-mint-design.md (b3c9505).
The brainstorm and in-spec rulings bind.

## Global Constraints

- ONE code commit (Task 1), one record commit (Task 2), verification only (Task 3).
- Five gates before every commit (scan LAST on the staged tree; escape-free
  SPEC-cited strings). PowerShell for pnpm (`$env:PATH = "$env:APPDATA\npm;$env:PATH"`
  first); git via the Bash tool; branch `main`.
- Frozen, NO exceptions: `src/store/`, `chain/encoding.ts` (IMPORT `encodeTransition`
  from it; never edit it), `test/byte-stability.test.ts`, `docs/concept/` (no marker
  moves this increment — they are increment 2's).
- Comments: explicit increment naming ("the AL2 mint increment"; forward references
  to "the AL2 enforcement increment"/"the AL2 freshness increment" two-touch); never
  bare "this increment"; ASCII apostrophes.
- RED EXECUTED. Trailer: Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

---

### Task 1: The layer — types, sidecar, decorator, wiring, audit read, tests

**Files:**
- Create: `packages/record/src/signing/store.ts`, `packages/record/src/signing/memory.ts`,
  `packages/record/src/signing/decorate.ts`, `packages/record/src/kernel/verify-signatures.ts`
- Modify: `packages/record/src/config.ts` (`ConfirmProfile.signing?: true`;
  `Config.signing?: SigningConfig`), `packages/record/src/create.ts` (the
  requires-config check; the wrap; `KernelContext.signing?`; the Kernel closure),
  `packages/record/src/operator-surface.ts` (`verifySignatures` on the interface +
  frozen literal)
- Test: create `packages/record/test/signing.test.ts`

**Interfaces:**
- Consumes: `encodeTransition`/`transitionDigest` (chain/encoding.js — frozen,
  import-only); the `Store` type (store/store.js — frozen, import-only; the decorator
  delegates EVERY method); `replay` only if needed for genesis reads (prefer raw
  `chain[0]`).
- Produces: `SignatureEntry`/`SignatureStore`/`Signer`/`Verifier`/`SigningConfig`
  (signing/store.ts); `MemorySignatureStore`; `withSigning(signing, store,
  isSigningProfile)`; `operator.verifySignatures(recordId): Promise<SignatureReport>`.

- [ ] **Step 1: Write the failing tests**

Create `packages/record/test/signing.test.ts`:

```ts
// @vidimera/record — signing.test.ts (SPEC §14 "AL2 — Signed", the AL2 mint
// increment, first of three): the detached-signature LAYER — per-profile declaration,
// sign-before-append via the create()-level Store decorator, the chain-driven
// verifySignatures read. NOTHING enforces yet: no seam consults signatures (the AL2
// enforcement increment's own work), and AL1's guarantees hold throughout — the
// signed chain's BYTES are identical to an unsigned one's, pinned below. The tests
// sign with real Ed25519 via node:crypto; the library itself does no crypto — the
// signer/verifier are host hooks.

import { generateKeyPairSync, sign as edSign, verify as edVerify } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
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
const SUBJ = 'subject:sig-1';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
function makeSigner(keyRef = 'key-1'): { signer: Signer; calls: Uint8Array[] } {
  const calls: Uint8Array[] = [];
  const signer: Signer = async (bytes) => {
    calls.push(bytes);
    return { keyRef, signature: edSign(null, bytes, privateKey).toString('base64') };
  };
  return { signer, calls };
}
const ed25519Verifier: Verifier = async (bytes, signature) =>
  edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));

function signingProfile(id = 'test.signed.v1') {
  const p = captureProfile({ id });
  return { ...p, signing: true as const };
}

function signingSetup(profiles = [signingProfile()]) {
  const store = new MemoryStore();
  const signatures = new MemorySignatureStore();
  const { signer, calls } = makeSigner();
  const config = {
    ...makeConfig(profiles, { store }),
    signing: { signer, verifiers: { 'key-1': ed25519Verifier }, signatures },
  };
  return { store, signatures, calls, handles: create(config) };
}

test('construction: a signing profile without config.signing throws loud; a prepared instance without a declaring profile constructs', () => {
  const store = new MemoryStore();
  assert.throws(
    () => create(makeConfig([signingProfile()], { store })),
    /signing/i,
  );
  const prepared = {
    ...makeConfig([captureProfile()], { store: new MemoryStore() }),
    signing: {
      signer: makeSigner().signer,
      verifiers: {},
      signatures: new MemorySignatureStore(),
    },
  };
  assert.doesNotThrow(() => create(prepared));
});

test('mint coverage: every transition of a signing record gets a sidecar entry — the batch and a clock edge included; a non-signing profile mints nothing', async () => {
  const store = new MemoryStore();
  const signatures = new MemorySignatureStore();
  const { signer } = makeSigner();
  let now = new Date('2026-08-17T10:00:00.000Z');
  const config = {
    ...makeConfig([signingProfile(), captureProfile({ id: 'test.plain.v1' })], { store }),
    signing: { signer, verifiers: { 'key-1': ed25519Verifier }, signatures },
  };
  const handles = createWithClock(config, () => now);

  const recordId = await openRecord(handles, CONTENT, 'test.signed.v1', SUBJ);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const chain = await handles.operator.readChain(recordId);
  const entries = await signatures.listByRecord(recordId);
  assert.equal(entries.length, chain.length, 'one entry per transition, batch included');
  for (const t of chain) {
    const entry = entries.find((e) => e.transitionDigest === transitionDigest(t));
    assert.ok(entry, `transition seq ${t.seq} is signed`);
    assert.equal(entry?.keyRef, 'key-1');
    assert.equal(entry?.seq, t.seq);
  }

  // An en-passant clock edge signs too: a second signing record lapses open.
  const lapsingId = await openRecord(handles, CONTENT, 'test.signed.v1', 'subject:sig-lapse');
  now = new Date('2026-08-17T12:00:01.000Z');
  const lapse = await handles.operator.finalize(lapsingId, identity(), CONTENT, facts());
  assert.equal(lapse.status, 'refused');
  const lapsedChain = await handles.operator.readChain(lapsingId);
  const lapsedEntries = await signatures.listByRecord(lapsingId);
  assert.equal(lapsedEntries.length, lapsedChain.length, 'the expired edge is signed');

  // Non-signing profile in the SAME instance: nothing minted.
  const plainId = await openRecord(handles, CONTENT, 'test.plain.v1', 'subject:sig-plain');
  assert.equal((await signatures.listByRecord(plainId)).length, 0);
});

test('byte-identity, stated precisely: the chains differ ONLY in the genesis profileDigest — no signature material anywhere', async () => {
  async function run(withSigning: boolean) {
    const store = new MemoryStore();
    const base = captureProfile({ id: 'test.bi.v1' });
    const profile = withSigning ? { ...base, signing: true as const } : base;
    const config = withSigning
      ? {
          ...makeConfig([profile], { store }),
          signing: {
            signer: makeSigner().signer,
            verifiers: {},
            signatures: new MemorySignatureStore(),
          },
        }
      : makeConfig([profile], { store });
    // Fixed clock AND a deterministic mintId counter: both runs mint identical id
    // sequences (mintId may serve staged refs too), so the ONLY legitimate
    // divergence left is the declared control's own profileDigest (and the prevHash
    // chaining it forces downstream) — everything else must match.
    let n = 0;
    const handles = createWithClock(
      config,
      () => new Date('2026-08-17T10:00:00.000Z'),
      () => `id-bi-${++n}`,
    );
    const recordId = await openRecord(handles, CONTENT, 'test.bi.v1', SUBJ);
    const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(done.status, 'ok');
    return handles.operator.readChain(recordId);
  }
  const signed = await run(true);
  const plain = await run(false);
  const gs = (signed[0]?.payload as { profileDigest?: string }).profileDigest;
  const gp = (plain[0]?.payload as { profileDigest?: string }).profileDigest;
  assert.notEqual(gs, gp, 'the declaration IS visible to profileDigest, like every declared control');
  // Mask the one sanctioned divergence (genesis profileDigest) and the hash chaining
  // it forces (prevHash), then demand byte-for-byte equality — proving no signature
  // material rides in ANY transition of the signed chain.
  const mask = (chain: typeof signed) =>
    chain.map((t) => ({
      ...t,
      prevHash: 'masked',
      payload:
        t.seq === 1
          ? { ...(t.payload as Record<string, unknown>), profileDigest: 'masked' }
          : t.payload,
    }));
  assert.deepEqual(mask(signed), mask(plain));
});

test('sign-before-append: a throwing signer PREVENTS the append (order proven, not narrated)', async () => {
  const store = new MemoryStore();
  const config = {
    ...makeConfig([signingProfile()], { store }),
    signing: {
      signer: (async () => {
        throw new Error('signer down');
      }) as Signer,
      verifiers: {},
      signatures: new MemorySignatureStore(),
    },
  };
  const handles = create(config);
  const staged = await handles.agent.stage(CONTENT, 'test.signed.v1', SUBJ);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  await assert.rejects(handles.operator.open(staged.value.stagedRef), /signer down/);
  // Append-then-sign would have landed the genesis before the throw; sign-before-
  // append leaves NO chain — the order pin. (findNonTerminal is C1's read — adapt
  // the null/absence assertion to its real signature and return shape.)
  const anyChain = await store.findNonTerminal('test.signed.v1', SUBJ);
  assert.equal(anyChain, null, 'nothing landed');
});

test('orphan sidecar entries are invisible to the report (chain-driven correlation)', async () => {
  const { handles, signatures } = signingSetup();
  const recordId = await openRecord(handles, CONTENT, 'test.signed.v1', SUBJ);

  await signatures.put({
    transitionDigest: `sha256:${'f'.repeat(64)}`,
    recordId,
    seq: 99,
    keyRef: 'key-1',
    signature: 'orphan',
  });
  const report = await handles.operator.verifySignatures(recordId);
  assert.equal(
    report.transitions.some((t) => t.seq === 99),
    false,
    'chain-driven: an orphan entry never appears',
  );
});

test('verifySignatures: verified under the registry; fail-closed on unresolvable keyRef, tampered signature, missing entry', async () => {
  const { handles, signatures } = signingSetup();
  const recordId = await openRecord(handles, CONTENT, 'test.signed.v1', SUBJ);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');

  const good = await handles.operator.verifySignatures(recordId);
  assert.equal(good.signingDeclared, true);
  assert.ok(good.transitions.length >= 3);
  assert.ok(good.transitions.every((t) => t.signed && t.verified && t.keyRef === 'key-1'));

  // Tamper one signature: that seq alone fails, fail-closed reporting, no throw.
  const entries = await signatures.listByRecord(recordId);
  const victim = entries[0];
  assert.ok(victim !== undefined);
  await signatures.put({ ...victim, signature: victim.signature.slice(0, -4) + 'AAAA' });
  const tampered = await handles.operator.verifySignatures(recordId);
  const victimRow = tampered.transitions.find((t) => t.transitionDigest === victim.transitionDigest);
  assert.equal(victimRow?.signed, true);
  assert.equal(victimRow?.verified, false);

  // Unresolvable keyRef: rebuild the entry under a key the registry lacks.
  await signatures.put({ ...victim, keyRef: 'key-unknown' });
  const unresolvable = await handles.operator.verifySignatures(recordId);
  assert.equal(
    unresolvable.transitions.find((t) => t.transitionDigest === victim.transitionDigest)?.verified,
    false,
  );
});

test('the signer receives exactly encodeTransition bytes; the enlisted tx passes through untouched', async () => {
  const { handles, calls } = signingSetup();
  const recordId = await openRecord(handles, CONTENT, 'test.signed.v1', SUBJ);
  const chain = await handles.operator.readChain(recordId);
  const genesis = chain[0];
  assert.ok(genesis !== undefined);
  const { encodeTransition } = await import('../src/chain/encoding.js');
  assert.deepEqual(
    Buffer.from(calls[0] as Uint8Array),
    Buffer.from(encodeTransition(genesis)),
    'the hook signs the canonical bytes, nothing else',
  );
  // The enlisted-passthrough pin lives in the sqlite suite (Task 1 adds it there) —
  // this file pins the byte contract only.
});
```

Add ONE enlisted pin to the SQLite suite (the file the enlisted redeem tests live
in — `git grep -ln "cannot start a transaction" packages/record/test`): an enlisted
`redeem(recordId, CONTENT, tx)` on a SIGNING effect-seam profile (spread `signing:
true` onto `effectSeamProfile()` and add the signing config block) succeeds, the
redeemed edge gets a sidecar entry, and the tx semantics of the surrounding tests are
unchanged — transcribe the neighboring enlisted test's plumbing.

- [ ] **Step 2: Run to verify failure — EXECUTE it**

`pnpm exec vitest run packages/record/test/signing.test.ts` — FAIL: `signing/memory.js`
does not exist; `create` throws no signing error; `verifySignatures` is not a
function. Capture output.

- [ ] **Step 3: Implement**

1. `src/signing/store.ts` — the spec §1 block VERBATIM (SignatureEntry,
   SignatureStore, Signer, Verifier), plus:

```ts
/** The instance-level signing block (SPEC §14: "Signing ships as an optional hook;
 * key distribution and rotation are host-declared"). The library holds no keys:
 * `signer` mints, `verifiers` (keyed by the opaque keyRef) check, `signatures` is
 * the detached sidecar — an evidence layer BESIDE the chain, never inside its bytes. */
export interface SigningConfig {
  signer: Signer;
  verifiers: Record<string, Verifier>;
  signatures: SignatureStore;
}
```

2. `src/signing/memory.ts` — `MemorySignatureStore implements SignatureStore`:
   a `Map<string, SignatureEntry>` keyed by `transitionDigest` (put upserts —
   re-signing the same bytes is idempotent evidence); `listByRecord` filters values.

3. `src/signing/decorate.ts`:

```ts
// @vidimera/record — signing/decorate.ts: the AL2 mint increment's one mint point.
// create() wraps the injected Store in this decorator iff the instance declares
// signing — every append path (the seams, finalize's batch, the en-passant clock
// edges, the reverify drift edge, sealed) signs by construction, and the seams never
// know. SIGN BEFORE APPEND: a crash or lost CAS after the sidecar write leaves an
// ORPHAN entry — harmless, verification is chain-driven — while the reverse order
// could leave a LANDED transition unsigned on a signing record, which the AL2
// enforcement increment's fail-closed posture would condemn; the order is pinned.
// The sidecar write is deliberately NOT part of any host transaction an enlisted
// seam passes through (`tx` delegates untouched): an aborted effect's orphan
// signature is the same harmless class.

import { encodeTransition, transitionDigest } from '../chain/encoding.js';
import type { Store } from '../store/store.js';
import type { Transition } from '../types.js';
import type { SigningConfig } from './store.js';

export function withSigning(
  signing: SigningConfig,
  store: Store,
  isSigningProfile: (profileId: string) => boolean,
): Store {
  const memo = new Map<string, boolean>();

  async function recordSigns(transition: Transition): Promise<boolean> {
    const known = memo.get(transition.recordId);
    if (known !== undefined) return known;
    let signs: boolean;
    if (transition.seq === 1 && transition.kind === 'opened') {
      const profileId = (transition.payload as { profileId?: unknown }).profileId;
      signs = typeof profileId === 'string' && isSigningProfile(profileId);
    } else {
      const chain = await store.readChain(transition.recordId);
      const genesis = chain[0];
      const profileId =
        genesis === undefined
          ? undefined
          : (genesis.payload as { profileId?: unknown }).profileId;
      signs = typeof profileId === 'string' && isSigningProfile(profileId);
    }
    memo.set(transition.recordId, signs);
    return signs;
  }

  async function signOne(transition: Transition): Promise<void> {
    const bytes = encodeTransition(transition);
    const { keyRef, signature } = await signing.signer(bytes);
    await signing.signatures.put({
      transitionDigest: transitionDigest(transition),
      recordId: transition.recordId,
      seq: transition.seq,
      keyRef,
      signature,
    });
  }

  return {
    ...store,
    appendTransition: async (expectedState, transition, meta, tx) => {
      if (await recordSigns(transition)) await signOne(transition);
      return store.appendTransition(expectedState, transition, meta, tx);
    },
    appendBatch: async (expectedState, transitions, meta, tx) => {
      const first = transitions[0];
      if (first !== undefined && (await recordSigns(first))) {
        for (const t of transitions) await signOne(t);
      }
      return store.appendBatch(expectedState, transitions, meta, tx);
    },
  };
}
```

   (Adapt to the real `Store` type: if its methods are declared as required
   properties, the spread + two overrides above is total; if `...store` spreads a
   CLASS INSTANCE whose methods live on the prototype, the spread loses them — in
   that case delegate every method explicitly, listing all eight; check MemoryStore's
   shape and do whichever is CORRECT, saying which in the report. Signature drift
   between the plan's lambdas and the real method signatures: follow the type.)

4. `config.ts`: `ConfirmProfile` gains `signing?: true` (doc comment: SPEC §14
   per-profile enablement, record-homogeneous from genesis — the AL2 brainstorm
   ruling; the literal `true` closes the `signing: false` inertness at the type
   level). `Config` gains `signing?: SigningConfig` (import type from
   signing/store.js).

5. `create.ts`: in the profiles loop (or after it), the fail-closed check —

```ts
    if (profile.signing === true && config.signing === undefined) {
      throw new Error(
        `create: profile '${profile.id}' declares signing but the instance supplies no ` +
          'config.signing (signer, verifiers, signatures) — SPEC §14: signing is an ' +
          'operator-enabled hook, and a declaring profile without the hook is a loud ' +
          'construction error, never a silent AL1 downgrade',
      );
    }
```

   Then the wrap, before `makeKernel` captures the store:

```ts
  const isSigningProfile = (profileId: string) =>
    profiles.get(profileId)?.profile.signing === true;
  const store =
    config.signing === undefined
      ? config.store
      : withSigning(config.signing, config.store, isSigningProfile);
```

   (`makeKernel({ store, profiles, now, mintId, tokenSource, signing: config.signing })`
   — `KernelContext` gains `signing?: SigningConfig`.) The Kernel/OperatorSurface gain
   `verifySignatures: (recordId) => verifySignaturesKernel(ctx, recordId)` wired the
   same way every operator read is.

6. `kernel/verify-signatures.ts` — the spec §4 semantics:

```ts
// @vidimera/record — kernel/verify-signatures.ts: the AL2 mint increment's one audit
// surface (SPEC §14). A pure chain-driven read: it reports, it never refuses,
// appends, or throws on verification failure — fail-closed REPORTING (unresolvable
// keyRef, failed or throwing verifier, missing entry all read `verified: false`).
// Enforcement — folding a signing record's bad layer into chain-compromise at the
// seams — is the AL2 enforcement increment's own work.

import { encodeTransition, transitionDigest } from '../chain/encoding.js';
import type { KernelContext } from '../create.js';
import type { Digest } from '../types.js';

export interface SignatureReport {
  recordId: string;
  signingDeclared: boolean;
  transitions: {
    seq: number;
    transitionDigest: Digest;
    signed: boolean;
    keyRef?: string;
    verified: boolean;
  }[];
}

export async function verifySignatures(
  ctx: KernelContext,
  recordId: string,
): Promise<SignatureReport> {
  const chain = await ctx.store.readChain(recordId);
  if (chain.length === 0) {
    throw new Error(
      `verifySignatures: unknown recordId '${recordId}' — no such record; a recordId that ` +
        'resolves to no chain is a caller error, not a domain refusal (SPEC §8)',
    );
  }
  const genesis = chain[0];
  const profileId =
    genesis === undefined ? undefined : (genesis.payload as { profileId?: unknown }).profileId;
  const signingDeclared =
    typeof profileId === 'string' && ctx.profiles.get(profileId)?.profile.signing === true;

  const entries =
    ctx.signing === undefined ? [] : await ctx.signing.signatures.listByRecord(recordId);
  const byDigest = new Map(entries.map((e) => [e.transitionDigest, e]));

  const transitions = [];
  for (const t of chain) {
    const d = transitionDigest(t);
    const entry = byDigest.get(d);
    if (entry === undefined) {
      transitions.push({ seq: t.seq, transitionDigest: d, signed: false, verified: false });
      continue;
    }
    let verified = false;
    const verifier = ctx.signing?.verifiers[entry.keyRef];
    if (verifier !== undefined) {
      try {
        verified = await verifier(encodeTransition(t), entry.signature);
      } catch {
        verified = false; // a throwing verifier is fail-closed reporting, never a throw out
      }
    }
    transitions.push({
      seq: t.seq,
      transitionDigest: d,
      signed: true,
      keyRef: entry.keyRef,
      verified,
    });
  }
  return { recordId, signingDeclared, transitions };
}
```

   (Wire the export/import names to the tree's conventions; `operator-surface.ts`'s
   interface entry documents it as a pure read beside `replay`/`verifyChain`.)

- [ ] **Step 4: Run tests, gates, commit**

Targeted runs (signing.test.ts, the sqlite file), full suite, five gates. Commit:

```bash
git add -A packages/record
git commit -m "AL2 mint: a decorator signs every append of a signing record; nothing enforces yet

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: The record — AL2 begins

**Files:** `docs/process/implementation-status.md`,
`docs/process/deferral-register.md` (row 17 amended), `CLAUDE.md`, `README.md`,
stale comments the sweep finds. `docs/concept/` untouched.

- [ ] **Step 1: implementation-status.md** — step 8 row: the third tail item BEGINS
  (AL2 increment 1 of 3, the mint; enforcement — with the marker move and OQ §1
  tails — and freshness remain, the latter on OQ §4's own brainstorm); a NEW §14 row
  per the spec's §6 (the four brainstorm rulings, sign-before-append with the
  orphan-harmless argument, the decorator mint point, the audit read's
  fail-closed-reporting posture, AL1-untouched); the governed count UNCHANGED at 1,
  said explicitly with the `signing`-arrives-with-its-behavior distinction (the
  `reverify`-arrival class, never governed).
- [ ] **Step 2: register row 17** (AL2 in progress, 1 of 3) + CLAUDE.md + README
  (AL2 begun; NO marker moved — stated; the steps arithmetic re-verified).
- [ ] **Step 3: The sweep — LAST**

```bash
git grep -nE 'signing|signature|keyRef|sidecar|AL2|detached|verifySignatures|withSigning|this increment|later increment|landing|will make|not yet' -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
git grep -nE 'SKETCHED|no signing|never signed|AL1 only|cannot sign|have none|no producer|down to (one|1)' -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis' -- '*.md'
```

Judge EVERY hit; HIT-COUNT == VERDICT-COUNT from THIS run.
- [ ] **Step 4:** quotes hand-verified; five gates; commit
  ("Record AL2 begun: the mint landed, enforcement carries the marker").

---

### Task 3: Exit verification

**Files:** none modified.

- [ ] **Step 1:** porcelain empty, branch `main`, ALL FIVE gates by name with exit
  codes and exact counts (zero skips).
- [ ] **Step 2: Freeze (against the spec commit b3c9505)**

```bash
git diff b3c9505..HEAD -- packages/record/test/byte-stability.test.ts   # MUST be empty
git diff b3c9505..HEAD -- packages/record/src/chain/encoding.ts          # MUST be empty
git diff b3c9505..HEAD -- packages/record/src/store/                     # MUST be empty
git diff b3c9505..HEAD -- docs/concept/                                  # MUST be empty (no sealed edit this increment)
```

Any content ⇒ BLOCKED with the diff stat.
- [ ] **Step 3: Report** — commit list, exact counts, register rows (row 17's amended
  text quoted), the step-8 cell, ahead count.
