# The Profile-Drift Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every seam that resolves a persisted record refuses `unknown-profile`, never-append, when the registered same-id profile does not digest to the record's genesis `profileDigest`; the cross-record verifications and `open()`'s blocker path fold the same miss into the codes they already speak; the sealed set says so at the sanctioned sites.

**Architecture:** One helper, `heldProfile(profiles, record)`, replaces the bare `profiles.get(record.profileId)` at eleven kernel sites and compares a digest cached on `ResolvedProfile` at `create()` against the digest the record's genesis bound. No new refusal code, no new ladder rung, no payload change: the check sits in the profile-resolution step every seam already has, after chain-verify and the signature layer and ahead of every rung. Tests land red first; four existing pins invert with their arguments written at the site.

**Tech Stack:** TypeScript (strict, `noUncheckedIndexedAccess`), vitest 4 run as `./node_modules/.bin/vitest run --project record <file>`, Biome, the repo's own gates (`contract-scan`, `api-sync`, `docs-index-sync`, `ci-assert-tests`).

**Spec:** `docs/superpowers/specs/2026-09-03-profile-drift-gate-design.md` — the plan argues from it; read its §1, §2, §8 and §9 before starting. Its §8 records the sanction: sites 1–13 GRANTED; site 14 RE-GRANT REQUESTED. Task 6 lands site 14 only if the spec's §8 records that re-grant by the time Task 6 runs.

## Global Constraints

- **Red first, always.** Every new test is run against the unfixed code and its failure read before the code changes. A test that passes before its implementation is rewritten.
- **The frozen byte-stability digests must not move.** `packages/record/test/byte-stability.test.ts` is an oracle; if it goes red, the change is wrong, never the pin.
- **No sealed-set edit outside Task 6, and none outside the spec's §8 sites.** `docs/concept/` is SEALED; the grant licenses exactly those sites.
- **Contract-scan traps in TypeScript comments:** never the bare word "design" (only "by design"), never "slice", never a `Task N` reference, never a 7-to-40-character hex run (a commit SHA), never a foreign label. Cite as `SPEC §4` / `SPEC §8`; a quoted phrase attached to such a citation must occur in `docs/concept/SPEC.md` — check with a whitespace-collapsed grep.
- **Commit messages** are written to a file with the Write tool (never PowerShell `Set-Content`, which prepends a byte-order mark) and committed with `git commit -F <file>`; end every message with the line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. After committing, `git log --format=%s -1 | od -c | head -1` must start with the subject's first letter.
- **Gates per task:** `./node_modules/.bin/biome check --error-on-warnings <touched files>` (run `--write` first if it reports formatting), `./node_modules/.bin/tsc -p packages/record --noEmit`, `node scripts/contract-scan.mjs` (stage new files with `git add` first — it reads tracked files only). The full suite with the report gate — `pnpm test:ci && node scripts/ci-assert-tests.mjs .vitest-results.json` — runs at Tasks 5, 6 and 7.
- **Branch:** `profile-drift-gate` (cut from `main` at `54d9d1c`; the spec commits are already on it). Verify `git branch --show-current` prints `profile-drift-gate` before every commit; if HEAD is detached, stop and report. Never push.
- **Toolchain on this machine:** `pnpm` is available (11.18.0); if a `pnpm` shim ever fails, run the workspace binaries directly from `./node_modules/.bin/`.

---

## File Structure

- **Create** `packages/record/src/kernel/held-profile.ts` — the one resolution rule (id registered AND digest matches), ~30 lines, no dependencies beyond the `ResolvedProfile` type.
- **Modify** `packages/record/src/create.ts` — `ResolvedProfile` gains `profileDigest`; `create()` computes it once per profile.
- **Modify** `packages/record/src/kernel/open.ts` — genesis mint reads the cached digest; the C1 blocker path checks the blocker's binding before `resolveDueClock`.
- **Modify** the eight seam files at their resolution step: `kernel/finalize.ts`, `kernel/decline.ts`, `kernel/findings-seams.ts`, `kernel/redeem.ts`, `kernel/seal.ts`; and the two verifiers `kernel/prior-legs.ts`, `kernel/supersedes.ts`.
- **Modify** `kernel/finalize.ts` again — the now-unreachable policy reverse arm becomes an unreachable-throw.
- **Modify** doc comments that state the old posture: `kernel/verify-signatures.ts` (the `signingDeclared` and `genesisProfile` field docs), `profile-digest.ts` (header), `refusal-codes.ts` (the never-appends comment).
- **Create** `packages/record/test/profile-drift-gate.test.ts` — every new pin, grown across Tasks 1–4.
- **Modify** four test files for the inversions: `test/policy-drift.test.ts` (two pins), `test/multi-leg.test.ts` (one pin), `test/profile-drift-report.test.ts` (two pins and its header).
- **Modify** the sealed set at the spec's §8 sites (Task 6 only): `docs/concept/SPEC.md`, `OPEN-QUESTIONS.md`, `CONTROLS.md`, `GLOSSARY.md`, `DECISIONS.md`.
- **Modify** the guide: `docs/guide/api-reference.md`, `docs/guide/integrating.md`, `docs/guide/concepts.md`; and `CHANGELOG.md`.
- **Modify** the record: `docs/process/implementation-status.md`, `CLAUDE.md`, `docs/process/next-phases.md`, `docs/process/open-items-plan.md`, `docs/superpowers/INDEX.md`, and the spec's §8 grant status.

---

### Task 1: The cached digest and the `heldProfile` helper

**Files:**
- Create: `packages/record/src/kernel/held-profile.ts`
- Modify: `packages/record/src/create.ts` (the `ResolvedProfile` interface near line 65 and the `profiles.set(...)` call near line 256)
- Modify: `packages/record/src/kernel/open.ts:27` (import) and `:198` (`profileDigest: profileDigest(profile),`)
- Test: `packages/record/test/profile-drift-gate.test.ts` (create)

**Interfaces:**
- Produces: `ResolvedProfile.profileDigest: Digest` (on the interface in `create.ts`); `heldProfile(profiles: ReadonlyMap<string, ResolvedProfile>, bound: { profileId: string; profileDigest: string }): ResolvedProfile | undefined` exported from `kernel/held-profile.ts`. Every later task calls `heldProfile(profiles, record)` where `record` is a replayed `DecisionRecord` (which carries both fields).

- [ ] **Step 1: Write the failing test file**

Create `packages/record/test/profile-drift-gate.test.ts` with exactly this content (later tasks append to it):

```ts
// @vidimera/record — profile-drift-gate.test.ts (the profile-drift gate increment, 2026-09-03):
// an instance HOLDS a record's profile only when the record's profileId is registered AND the
// registered profile's data-only projection digests to the record's genesis profileDigest
// (SPEC §4). Every seam that resolves a persisted record refuses `unknown-profile`, never-append,
// at the resolution step it already has — ahead of every ladder rung — when it does not hold the
// profile; the two cross-record verifications fold the same miss into their own claim refusals;
// and open()'s exclusivity path leaves a due blocker it does not hold standing (`record-exists`).
// The recorded fail-open this closes: a same-id profile that dropped `signing: true` read a
// signing record as plain AL1 and finalized it (docs/analysis/2026-09-03-security-findings.md,
// finding 2). The honest bound, in the same breath: an in-place profile edit strands that
// profile's open records until the declarative fields are restored exactly or the edit is given
// a new id — pinned below as behavior, not softened.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import type { ConfirmProfile } from '../src/config.js';
import { create, createWithClock } from '../src/create.js';
import { heldProfile } from '../src/kernel/held-profile.js';
import { profileDigest } from '../src/profile-digest.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, SigningConfig, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Store } from '../src/store/store.js';
import type { Transition } from '../src/types.js';
import {
  captureProfile,
  defaultCanonicalizer,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
  tamperNonLast,
  twoLegProfile,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const ID = 'test.drift.gate.v1';
const D1 = `sha256:${'1'.repeat(64)}`;

/** The base profile; a sibling instance edits ONE declarative field and acts on the record. */
function base(overrides: { ttl?: number; decline?: true } = {}): ConfirmProfile {
  return captureProfile({ id: ID, ...overrides });
}

/** `base()` with a findings flow declared, so an open record can carry a second transition. */
function flowProfile(overrides: { ttl?: number } = {}): ConfirmProfile {
  const p = base(overrides);
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  p.legs[0] = { ...leg, ackMode: 'any' as const, requiredAcks: ['variance'] };
  return p;
}

function instance(profile: ConfirmProfile, store: Store, signing?: SigningConfig) {
  return signing === undefined
    ? create(makeConfig([profile], { store }))
    : create({ ...makeConfig([profile], { store }), signing });
}

/** A real Ed25519 signing tier, shared by two instances over one store. */
function signingTier(): SigningConfig {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const signer: Signer = async (bytes) => ({
    keyRef: 'key-1',
    signature: edSign(null, bytes, privateKey).toString('base64'),
  });
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  return { signer, verifiers: { 'key-1': verifier }, signatures: new MemorySignatureStore() };
}

async function chainLength(store: Store, recordId: string): Promise<number> {
  return (await store.readChain(recordId)).length;
}

function lastOf(chain: readonly Transition[]): Transition {
  const t = chain.at(-1);
  assert.ok(t !== undefined, 'fixture: the chain is not empty');
  return t;
}

/** The never-append `unknown-profile` refusal, asserted whole. */
function assertUnknownProfile(out: unknown, seam: string): void {
  const o = out as { status: string; code?: string; class?: string; transitionRef?: unknown };
  assert.equal(o.status, 'refused', `${seam}: a profile this instance does not hold refuses`);
  assert.equal(o.code, 'unknown-profile', `${seam}: the second producer of unknown-profile`);
  assert.equal(o.class, 'refusal');
  assert.equal(o.transitionRef, undefined, `${seam}: never-append — no edge, no ref`);
}

test('heldProfile: the id must be registered AND the registered projection must digest to the binding', () => {
  const p = base();
  const resolved = {
    profile: p,
    canonicalizer: defaultCanonicalizer(),
    effectSeam: false,
    profileDigest: profileDigest(p),
  };
  const profiles = new Map([[ID, resolved]]);
  const bound = { profileId: ID, profileDigest: profileDigest(p) };
  assert.equal(heldProfile(profiles, bound), resolved, 'registered and matching: held');
  assert.equal(
    heldProfile(profiles, { ...bound, profileDigest: profileDigest(base({ ttl: 60 })) }),
    undefined,
    'same id, edited projection: not held',
  );
  assert.equal(
    heldProfile(profiles, { ...bound, profileId: 'test.drift.gate.other.v1' }),
    undefined,
    'unregistered id: not held',
  );
});

test('create() caches each profile digest, and open() binds that cached digest — byte-identical to the per-call digest it replaces', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([base()], { store }));
  const recordId = await openRecord(handles, CONTENT, ID, 'subject:gate-0');
  const genesis = (await store.readChain(recordId))[0];
  assert.ok(genesis !== undefined);
  assert.equal(
    (genesis.payload as { profileDigest: string }).profileDigest,
    profileDigest(base()),
    'the binding is the projection digest, cached or not',
  );
});
```

- [ ] **Step 2: Run it to verify it fails for the right reason**

Run: `./node_modules/.bin/vitest run --project record packages/record/test/profile-drift-gate.test.ts 2>&1 | tail -20`
Expected: the file fails to load — an error naming `../src/kernel/held-profile.js` as missing (a module-resolution failure, not an assertion). That is the correct red for a helper that does not exist yet.

- [ ] **Step 3: Create the helper**

Create `packages/record/src/kernel/held-profile.ts`:

```ts
// @vidimera/record — kernel/held-profile.ts: the one profile-resolution rule every seam that
// touches a persisted record applies (the profile-drift gate increment, 2026-09-03). An
// instance HOLDS a record's profile only when the record's `profileId` is registered here AND
// the registered profile's data-only projection digests to the record's genesis
// `profileDigest` (SPEC §4) — the same digest `open()` bound. Anything else is a profile this
// instance does not hold: the operator seams refuse `unknown-profile` (SPEC §8's second
// producer of that code), the two cross-record verifications fold the miss into their own
// claim refusals, and `open()`'s exclusivity path leaves a due blocker it does not hold
// standing. The comparison is a string compare against a digest computed once per profile at
// `create()` — no digesting per call, and `open()` binds the same cached value.

import type { ResolvedProfile } from '../create.js';

/** What a replayed record (or a genesis payload) exposes for the comparison. */
export interface ProfileBinding {
  profileId: string;
  profileDigest: string;
}

export function heldProfile(
  profiles: ReadonlyMap<string, ResolvedProfile>,
  bound: ProfileBinding,
): ResolvedProfile | undefined {
  const resolved = profiles.get(bound.profileId);
  if (resolved === undefined) return undefined;
  return resolved.profileDigest === bound.profileDigest ? resolved : undefined;
}
```

- [ ] **Step 4: Cache the digest on `ResolvedProfile`**

In `packages/record/src/create.ts`, change the interface:

```ts
export interface ResolvedProfile {
  profile: ConfirmProfile;
  canonicalizer: Canonicalizer;
  effectSeam: boolean;
  /**
   * `profileDigest(profile)`, computed once here: the digest `open()` binds into every genesis
   * and the digest `kernel/held-profile.ts` compares a record's binding against at every seam.
   */
  profileDigest: Digest;
}
```

Add the imports if absent (check the existing import block first — `Digest` may already be imported from `./types.js`):

```ts
import { profileDigest } from './profile-digest.js';
import type { Digest } from './types.js';
```

And in the `for (const profile of config.profiles)` loop, extend the `profiles.set(...)`:

```ts
    profiles.set(profile.id, {
      profile,
      canonicalizer,
      effectSeam: profileDeclaresEffectSeam(profile),
      profileDigest: profileDigest(profile),
    });
```

- [ ] **Step 5: Make `open()` bind the cached digest**

In `packages/record/src/kernel/open.ts`, change the genesis payload line

```ts
    profileDigest: profileDigest(profile),
```

to

```ts
    profileDigest: resolved.profileDigest,
```

and delete the now-unused import `import { profileDigest } from '../profile-digest.js';` (Biome fails on an unused import). If the surrounding code names the local `profile` only for this call, leave it — other lines use it.

- [ ] **Step 6: Run the new test and the oracles**

Run: `./node_modules/.bin/vitest run --project record packages/record/test/profile-drift-gate.test.ts packages/record/test/byte-stability.test.ts packages/record/test/profile-drift-report.test.ts 2>&1 | tail -8`
Expected: all pass. The byte-stability file proves the cached digest is byte-identical to the per-call one.

- [ ] **Step 7: Gates**

```bash
./node_modules/.bin/biome check --write packages/record/src/kernel/held-profile.ts packages/record/src/create.ts packages/record/src/kernel/open.ts packages/record/test/profile-drift-gate.test.ts
./node_modules/.bin/biome check --error-on-warnings packages/record/src packages/record/test
./node_modules/.bin/tsc -p packages/record --noEmit
git add packages/record/src/kernel/held-profile.ts packages/record/test/profile-drift-gate.test.ts
node scripts/contract-scan.mjs
```
Expected: no output from the scan, `tsc` silent, Biome "No fixes applied" on the second check.

- [ ] **Step 8: Commit**

Message file content:

```
heldProfile and the cached profile digest: the resolution rule, not yet consulted

ResolvedProfile carries profileDigest computed once at create(); open() binds that cached
value (byte-identical, the frozen byte-stability pins unchanged). kernel/held-profile.ts
states the rule every seam will apply next: an instance holds a record's profile only when
the id is registered AND the registered projection digests to the record's binding. No seam
consults it yet; the test file that will pin each seam opens with the helper's own pins.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

```bash
git add packages/record/src/create.ts packages/record/src/kernel/open.ts
git commit -F <message file>
git log --format=%s -1 | od -c | head -1
```

---

### Task 2: finalize and decline refuse, with the depth and recovery pins

**Files:**
- Modify: `packages/record/src/kernel/finalize.ts:213-219` (the `profiles.get` + `unknown-profile` block)
- Modify: `packages/record/src/kernel/decline.ts:84-87`
- Test: `packages/record/test/profile-drift-gate.test.ts` (append)

**Interfaces:**
- Consumes: `heldProfile` from Task 1.
- Produces: nothing new; the seams' outcomes are unchanged in shape.

- [ ] **Step 1: Append the failing tests**

Append to `packages/record/test/profile-drift-gate.test.ts`:

```ts
test("finalize, the review's route: a same-id sibling whose profile dropped signing (and carries no config.signing) refuses unknown-profile with no append, and the report says drifted", async () => {
  const store = new MemoryStore();
  const signingProfile: ConfirmProfile = { ...base(), signing: true };
  const opener = instance(signingProfile, store, signingTier());
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:gate-1');
  const before = await chainLength(store, recordId);

  const sibling = instance(base(), store);
  assertUnknownProfile(
    await sibling.operator.finalize(recordId, identity(), CONTENT, facts()),
    'finalize',
  );
  assert.equal(await chainLength(store, recordId), before, 'never-append');
  const report = await sibling.operator.verifySignatures(recordId);
  assert.equal(report.genesisProfile.resolution, 'drifted', 'the report names why');
});

test('finalize and decline, a benign edit: a same-id sibling with a different ttl refuses unknown-profile at both seams, no append', async () => {
  const store = new MemoryStore();
  const opener = instance(base({ decline: true }), store);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:gate-2');
  const before = await chainLength(store, recordId);

  const sibling = instance(base({ decline: true, ttl: 60 }), store);
  assertUnknownProfile(
    await sibling.operator.finalize(recordId, identity(), CONTENT, facts()),
    'finalize',
  );
  assertUnknownProfile(
    await sibling.operator.decline(recordId, identity(), CONTENT, facts()),
    'decline',
  );
  assert.equal(await chainLength(store, recordId), before);
});

test('depth: a hash-broken chain under a drifted sibling refuses chain-compromise and appends its evidence edge — rung (1) precedes profile resolution', async () => {
  const store = new MemoryStore();
  const opener = instance(flowProfile(), store);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:gate-3');
  // A second transition, so a NON-last tamper exists (a last-element tamper is the AL1 blind
  // spot); the record stays open.
  const raised = await opener.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    identity({ principal: 'checker:1' }),
  );
  assert.equal(raised.status, 'ok');

  const tampered = new MemoryStore();
  for (const [i, t] of tamperNonLast(await store.readChain(recordId)).entries()) {
    await tampered.appendTransition(i === 0 ? null : 'open', t, { nonTerminal: true });
  }
  const drifted = instance(flowProfile({ ttl: 60 }), tampered);
  const before = await chainLength(tampered, recordId);
  const out = await drifted.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'chain-compromise');
  assert.equal(
    await chainLength(tampered, recordId),
    before + 1,
    'the evidence edge lands — chain-verify runs before the profile is even resolved',
  );
});

test('depth: a due-expired record under a drifted sibling refuses unknown-profile and does NOT expire — the stranding, as behavior', async () => {
  const clock = { t: Date.UTC(2026, 0, 1) };
  const store = new MemoryStore();
  const opener = createWithClock(
    makeConfig([base({ ttl: 60 })], { store }),
    () => new Date(clock.t),
  );
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:gate-4');
  clock.t += 120 * 1000; // past the 60s window by the record's own rules

  const sibling = createWithClock(
    makeConfig([base({ ttl: 3600 })], { store }),
    () => new Date(clock.t),
  );
  const before = await chainLength(store, recordId);
  assertUnknownProfile(
    await sibling.operator.finalize(recordId, identity(), CONTENT, facts()),
    'finalize',
  );
  assert.equal(
    await chainLength(store, recordId),
    before,
    'no expired edge: an instance that does not hold the rules cannot expire under them',
  );

  // The holder, at the same instant, expires it en passant — the order proof.
  const own = await opener.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(own.status, 'refused');
  if (own.status === 'refused') assert.equal(own.code, 'leg-expired');
  assert.equal(lastOf(await store.readChain(recordId)).kind, 'expired');
});

test('recovery, route 1: an instance whose profile restores the declarative fields exactly holds the record again and finalizes it', async () => {
  const store = new MemoryStore();
  const opener = instance(base(), store);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:gate-5');
  assertUnknownProfile(
    await instance(base({ ttl: 60 }), store).operator.finalize(recordId, identity(), CONTENT, facts()),
    'finalize (drifted)',
  );
  const restored = instance(base(), store); // a fresh object with the same declarative fields
  assert.equal(
    (await restored.operator.finalize(recordId, identity(), CONTENT, facts())).status,
    'ok',
    'the projection is deterministic: a faithful restore holds the record again',
  );
});

test('recovery, route 2: the prior version stays registered under its id and the edit takes a new id — a record of each finalizes on one instance', async () => {
  const store = new MemoryStore();
  const v1 = instance(base(), store);
  const oldRecord = await openRecord(v1, CONTENT, ID, 'subject:gate-6');
  const V2 = 'test.drift.gate.v2';
  const both = create(makeConfig([base(), captureProfile({ id: V2, ttl: 60 })], { store }));
  // Same subject, new profile id: a new exclusivity pair, so it opens beside the old record.
  const newRecord = await openRecord(both, CONTENT, V2, 'subject:gate-6');
  assert.equal((await both.operator.finalize(oldRecord, identity(), CONTENT, facts())).status, 'ok');
  assert.equal((await both.operator.finalize(newRecord, identity(), CONTENT, facts())).status, 'ok');
});
```

- [ ] **Step 2: Run to verify the new tests fail for the right reason**

Run: `./node_modules/.bin/vitest run --project record packages/record/test/profile-drift-gate.test.ts 2>&1 | grep -E "✓|×|Tests|Expected|Received" | head -40`
Expected: the two Task 1 tests pass; "the review's route", "a benign edit", and "route 1" fail at `assertUnknownProfile` with `status` `'ok'` received where `'refused'` was expected (the sibling finalizes today); "does NOT expire" fails the same way or with `leg-expired` received (the sibling expires it today); "chain-compromise ... precedes" and "route 2" pass already (they pin order and the versioning route, neither of which changes). Read every failure: each must be an assertion, not a thrown fixture error.

- [ ] **Step 3: Swap the resolution at finalize**

In `packages/record/src/kernel/finalize.ts`, add the import beside the other kernel imports:

```ts
import { heldProfile } from './held-profile.js';
```

and replace

```ts
  const resolved = profiles.get(record.profileId);
  if (resolved === undefined) {
    // Fail-closed: the record's profile is not configured in THIS instance (a config/caller
    // error — a coherent instance always resolves a record it opened). No append, matching
    // stage()/open()'s `unknown-profile` posture. Defensive; exercised by
    // refusal-matrix.test.ts's two-instance arm.
    return refused('unknown-profile');
  }
```

with

```ts
  const resolved = heldProfile(profiles, record);
  if (resolved === undefined) {
    // Fail-closed: this instance does not HOLD the record's profile — the id is unregistered
    // (refusal-matrix.test.ts's two-instance arm), or it is registered under this id with a
    // data-only projection that does not digest to the record's genesis `profileDigest`
    // (the profile-drift gate; test/profile-drift-gate.test.ts). Either way the record was
    // opened under rules this instance does not have, so nothing here may decide, expire, or
    // append under the rules it does have — `unknown-profile`, never-append, ahead of every
    // rung below (SPEC §4, §8). Recovery is the version discipline: restore the declarative
    // fields exactly, or keep the prior version registered under its id.
    return refused('unknown-profile');
  }
```

- [ ] **Step 4: Swap the resolution at decline**

In `packages/record/src/kernel/decline.ts`, add the import `import { heldProfile } from './held-profile.js';` and replace

```ts
  const resolved = profiles.get(record.profileId);
  if (resolved === undefined) {
    return refused('unknown-profile');
  }
```

with

```ts
  const resolved = heldProfile(profiles, record);
  if (resolved === undefined) {
    // Not held: unregistered, or registered with a projection that does not digest to the
    // record's binding (the profile-drift gate — see kernel/finalize.ts's same arm).
    return refused('unknown-profile');
  }
```

- [ ] **Step 5: Run the file green, then the record project**

Run: `./node_modules/.bin/vitest run --project record packages/record/test/profile-drift-gate.test.ts 2>&1 | tail -6`
Expected: all pass.

Run: `./node_modules/.bin/vitest run --project record 2>&1 | grep -E "×|FAIL|Test Files|Tests " | head -20`
Expected: exactly THREE failures, all expected inversions that Task 5 flips — `policy-drift.test.ts` "the forward cross-instance corner" and "THE DECIDED OPEN QUESTION" (each receives `unknown-profile` where it expected `policy-drift`), and `multi-leg.test.ts` "the lookup miss refuses" (receives `unknown-profile` where it expected `sod-violation`). `profile-drift-report.test.ts`'s two bound pins may ALSO fail now (received `refused` where `ok` was pinned) — that makes five expected failures at most. Any OTHER failure is a bug in this task: stop and fix it before continuing. Record the exact failing test names in the commit message.

- [ ] **Step 6: Gates**

```bash
./node_modules/.bin/biome check --write packages/record/src/kernel/finalize.ts packages/record/src/kernel/decline.ts packages/record/test/profile-drift-gate.test.ts
./node_modules/.bin/biome check --error-on-warnings packages/record/src packages/record/test
./node_modules/.bin/tsc -p packages/record --noEmit
node scripts/contract-scan.mjs
```

- [ ] **Step 7: Commit**

Message:

```
finalize and decline refuse unknown-profile for a profile this instance does not hold

The resolution step both seams already have now applies heldProfile: an unregistered id
refuses as before, and a registered same-id profile whose projection does not digest to the
record's genesis profileDigest refuses too — never-append, ahead of every rung, so the
sibling neither decides nor expires under rules the record did not bind. Pinned red first:
the review's route (a signing profile's record under a sibling without signing), a benign
ttl edit at both seams, the depth pair (chain-compromise still lands its edge first; a due
record does not expire under a drifted sibling), and both recovery routes.

Expected inversions now red, flipped with their arguments in a later commit on this branch:
<list the exact failing test names observed in Step 5>.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

```bash
git add packages/record/src/kernel/finalize.ts packages/record/src/kernel/decline.ts packages/record/test/profile-drift-gate.test.ts
git commit -F <message file>
```

---

### Task 3: The findings seams, the redemption family, and seal

**Files:**
- Modify: `packages/record/src/kernel/findings-seams.ts:159-162`
- Modify: `packages/record/src/kernel/redeem.ts:242-246`
- Modify: `packages/record/src/kernel/seal.ts:62-67`
- Test: `packages/record/test/profile-drift-gate.test.ts` (append)

**Interfaces:**
- Consumes: `heldProfile` from Task 1.

- [ ] **Step 1: Append the failing tests**

```ts
test('raiseFinding and acknowledge under a drifted sibling refuse unknown-profile — nothing appended', async () => {
  const store = new MemoryStore();
  const opener = instance(flowProfile(), store);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:gate-7');
  const raised = await opener.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    identity({ principal: 'checker:1' }),
  );
  assert.equal(raised.status, 'ok');
  const before = await chainLength(store, recordId);

  const sibling = instance(flowProfile({ ttl: 60 }), store);
  assertUnknownProfile(
    await sibling.operator.raiseFinding(
      recordId,
      { findingId: 'f-2', kind: 'variance', findingDigest: D1 },
      identity({ principal: 'checker:1' }),
    ),
    'raiseFinding',
  );
  assertUnknownProfile(
    await sibling.operator.acknowledge(recordId, { findingId: 'f-1', findingDigest: D1 }, identity()),
    'acknowledge',
  );
  assert.equal(await chainLength(store, recordId), before);
});

test('redeem, beginRedemption and completeRedemption under a drifted sibling refuse unknown-profile — the confirmed record is untouched by it', async () => {
  const store = new MemoryStore();
  const opener = instance(effectSeamProfile({ id: ID }), store);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:gate-8');
  assert.equal((await opener.operator.finalize(recordId, identity(), CONTENT, facts())).status, 'ok');
  const before = await chainLength(store, recordId);

  const sibling = instance(effectSeamProfile({ id: ID, ttl: 60 }), store);
  assertUnknownProfile(await sibling.operator.redeem(recordId, CONTENT), 'redeem');
  assertUnknownProfile(await sibling.operator.beginRedemption(recordId, CONTENT), 'beginRedemption');
  assert.equal(await chainLength(store, recordId), before, 'the sibling appended nothing');

  // A token minted by the holder, presented by the drifted sibling: still not held.
  const begun = await opener.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok');
  if (begun.status !== 'ok') return;
  assertUnknownProfile(
    await sibling.operator.completeRedemption(recordId, begun.value.token, CONTENT),
    'completeRedemption',
  );
  assert.equal(await chainLength(store, recordId), before + 1, "only the holder's begin appended");
  assert.equal(
    (await opener.operator.completeRedemption(recordId, begun.value.token, CONTENT)).status,
    'ok',
    'the holder completes what it began',
  );
});

test('seal under a drifted sibling refuses unknown-profile; the holder seals', async () => {
  const store = new MemoryStore();
  const opener = instance(base(), store);
  const recordId = await openRecord(opener, CONTENT, ID, 'subject:gate-9');
  // confirmed is terminal on a pure-capture profile, so the record is sealable.
  assert.equal((await opener.operator.finalize(recordId, identity(), CONTENT, facts())).status, 'ok');
  const before = await chainLength(store, recordId);
  assertUnknownProfile(await instance(base({ ttl: 60 }), store).operator.seal(recordId), 'seal');
  assert.equal(await chainLength(store, recordId), before);
  assert.equal((await opener.operator.seal(recordId)).status, 'ok');
});
```

- [ ] **Step 2: Run to verify red**

Run: `./node_modules/.bin/vitest run --project record packages/record/test/profile-drift-gate.test.ts 2>&1 | grep -E "×|Tests|Expected|Received" | head -30`
Expected: the three new tests fail at `assertUnknownProfile` with `status` received as `'ok'` (or, for `beginRedemption` after a `redeem` that succeeded on the sibling, a later assertion) — the sibling acts today. If a fixture line throws instead (for example `effectSeamProfile` rejecting `ttl`), fix the fixture, re-run, and only proceed once every failure is the expected assertion.

- [ ] **Step 3: Swap the resolution in the three prologues**

`packages/record/src/kernel/findings-seams.ts` — add `import { heldProfile } from './held-profile.js';` and replace

```ts
  const resolved = profiles.get(record.profileId);
  if (resolved === undefined) {
    return { ok: false, out: refused('unknown-profile') };
  }
```

with

```ts
  const resolved = heldProfile(profiles, record);
  if (resolved === undefined) {
    // Not held: unregistered, or registered with a projection that does not digest to the
    // record's binding (the profile-drift gate — kernel/finalize.ts's same arm argues it).
    return { ok: false, out: refused('unknown-profile') };
  }
```

`packages/record/src/kernel/redeem.ts` — add the import and replace

```ts
  const resolved = profiles.get(record.profileId);
  if (resolved === undefined) {
    // Defensive, fail-closed: a coherent instance always resolves a record it opened.
    return { refusal: refused('unknown-profile') };
  }
```

with

```ts
  const resolved = heldProfile(profiles, record);
  if (resolved === undefined) {
    // Fail-closed: not held — unregistered, or registered with a projection that does not
    // digest to the record's binding (the profile-drift gate). A redemption bound read from
    // a drifted profile would be the wrong bound; nothing here runs under it.
    return { refusal: refused('unknown-profile') };
  }
```

`packages/record/src/kernel/seal.ts` — add the import and replace

```ts
  const resolved = profiles.get(record.profileId);
  if (resolved === undefined) {
    // Fail-closed, matching finalize's posture. Defensive: a coherent instance always
    // resolves a record it opened; refusal-matrix.test.ts's two-instance arm constructs it.
    return refused('unknown-profile');
  }
```

with

```ts
  const resolved = heldProfile(profiles, record);
  if (resolved === undefined) {
    // Fail-closed, matching finalize's posture: not held — unregistered (refusal-matrix's
    // two-instance arm), or registered with a projection that does not digest to the record's
    // binding (the profile-drift gate). Terminality is derived from the profile; a drifted
    // one derives it wrong.
    return refused('unknown-profile');
  }
```

- [ ] **Step 4: Run green, then the record project**

Run: `./node_modules/.bin/vitest run --project record packages/record/test/profile-drift-gate.test.ts 2>&1 | tail -6` — expected all pass.
Run: `./node_modules/.bin/vitest run --project record 2>&1 | grep -E "×|FAIL|Test Files|Tests " | head -20` — expected: only the same expected inversions as Task 2 Step 5; anything new is a bug in this task.

- [ ] **Step 5: Gates and commit**

```bash
./node_modules/.bin/biome check --write packages/record/src/kernel/findings-seams.ts packages/record/src/kernel/redeem.ts packages/record/src/kernel/seal.ts packages/record/test/profile-drift-gate.test.ts
./node_modules/.bin/biome check --error-on-warnings packages/record/src packages/record/test
./node_modules/.bin/tsc -p packages/record --noEmit
node scripts/contract-scan.mjs
```

Message:

```
The findings seams, the redemption family and seal refuse a profile they do not hold

Same rule, same step, three more prologues: raiseFinding/acknowledge, redeem/beginRedemption/
completeRedemption, and seal now resolve through heldProfile and refuse unknown-profile,
never-append, when the registered same-id profile does not digest to the record's binding.
Pinned red first per seam, each with the holder acting afterwards to show the record itself
is untouched by the refusing sibling.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

```bash
git add packages/record/src/kernel/findings-seams.ts packages/record/src/kernel/redeem.ts packages/record/src/kernel/seal.ts packages/record/test/profile-drift-gate.test.ts
git commit -F <message file>
```

---

### Task 4: The cross-record verifications and `open()`'s blocker path

**Files:**
- Modify: `packages/record/src/kernel/prior-legs.ts` (after `if (prior.profileId !== resolved.profile.id) return { ok: false };`)
- Modify: `packages/record/src/kernel/supersedes.ts:82-83`
- Modify: `packages/record/src/kernel/open.ts` (the C1 blocker path, before `resolveDueClock`)
- Test: `packages/record/test/profile-drift-gate.test.ts` (append)

**Interfaces:**
- Consumes: `heldProfile`; `ResolvedProfile.profileDigest`.

- [ ] **Step 1: Append the failing tests**

```ts
const TWO = 'test.drift.gate.twoleg.v1';
/** The two-leg profile, and a copy with ONE declarative edit on the maker leg. */
function twoLeg(edited = false): ConfirmProfile {
  const p = twoLegProfile({ id: TWO });
  if (!edited) return p;
  return {
    ...p,
    legs: [
      { id: 'maker-decide', allowedAuthorities: ['session:test-app', 'mtls:batch'] },
      { id: 'checker-decide', allowedAuthorities: ['session:test-app'] },
    ],
  };
}

test('prior legs: a successor open() under a sibling whose same-id profile was edited after the maker leg refuses prior-leg-unverified — no record created', async () => {
  const store = new MemoryStore();
  const v1 = instance(twoLeg(), store);
  const makerId = await openRecord(v1, CONTENT, TWO, 'subject:gate-10', 'maker-decide');
  assert.equal((await v1.operator.finalize(makerId, identity(), CONTENT, facts())).status, 'ok');
  const makerHead = transitionDigest(lastOf(await store.readChain(makerId)));

  const edited = instance(twoLeg(true), store);
  const staged = await edited.agent.stage(CONTENT, TWO, 'subject:gate-10', 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await edited.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'prior-leg-unverified');

  // The refused open created nothing: the holder opens the successor for the same pair.
  const stagedV1 = await v1.agent.stage(CONTENT, TWO, 'subject:gate-10', 'checker-decide');
  assert.equal(stagedV1.status, 'ok');
  if (stagedV1.status !== 'ok') return;
  const ok = await v1.operator.open(stagedV1.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: makerHead }],
  });
  assert.equal(ok.status, 'ok', 'a flow is decided under one version of its rules');
});

test('recovery (supersedes): a confirmed predecessor whose profile the sibling does not hold refuses supersedes-unverified; a declined predecessor recovers regardless', async () => {
  const store = new MemoryStore();
  const holder = instance(base({ decline: true }), store);
  const confirmedId = await openRecord(holder, CONTENT, ID, 'subject:gate-11');
  assert.equal((await holder.operator.finalize(confirmedId, identity(), CONTENT, facts())).status, 'ok');
  const cHead = transitionDigest(lastOf(await store.readChain(confirmedId)));

  const sibling = instance(base({ decline: true, ttl: 60 }), store);
  const s1 = await sibling.agent.stage(CONTENT, ID, 'subject:gate-11');
  assert.equal(s1.status, 'ok');
  if (s1.status !== 'ok') return;
  const r1 = await sibling.operator.open(s1.value.stagedRef, {
    supersedes: { recordId: confirmedId, chainHead: cHead },
  });
  assert.equal(r1.status, 'refused');
  if (r1.status === 'refused') assert.equal(r1.code, 'supersedes-unverified');

  const declinedId = await openRecord(holder, CONTENT, ID, 'subject:gate-12');
  assert.equal((await holder.operator.decline(declinedId, identity(), CONTENT, facts())).status, 'ok');
  const dHead = transitionDigest(lastOf(await store.readChain(declinedId)));
  const s2 = await sibling.agent.stage(CONTENT, ID, 'subject:gate-12');
  assert.equal(s2.status, 'ok');
  if (s2.status !== 'ok') return;
  const r2 = await sibling.operator.open(s2.value.stagedRef, {
    supersedes: { recordId: declinedId, chainHead: dHead },
  });
  assert.equal(r2.status, 'ok', 'declined is terminal regardless of profile — nothing to hold');
});

test('open(): a due open blocker under a drifted sibling stands — record-exists, no expired edge — while the same subject under a NEW profile id opens at once', async () => {
  const clock = { t: Date.UTC(2026, 0, 1) };
  const store = new MemoryStore();
  const holder = createWithClock(
    makeConfig([base({ ttl: 60 })], { store }),
    () => new Date(clock.t),
  );
  const blockerId = await openRecord(holder, CONTENT, ID, 'subject:gate-13');
  clock.t += 120 * 1000;

  const sibling = createWithClock(
    makeConfig([base({ ttl: 3600 })], { store }),
    () => new Date(clock.t),
  );
  const before = await chainLength(store, blockerId);
  const staged = await sibling.agent.stage({ subject: 'week-2', total: 41 }, ID, 'subject:gate-13');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await sibling.operator.open(staged.value.stagedRef);
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'record-exists');
  assert.equal(
    await chainLength(store, blockerId),
    before,
    'the blocker is not expired by an instance that does not hold its profile',
  );

  const V2 = 'test.drift.gate.v2';
  const versioned = createWithClock(
    makeConfig([captureProfile({ id: V2, ttl: 3600 })], { store }),
    () => new Date(clock.t),
  );
  const fresh = await openRecord(versioned, CONTENT, V2, 'subject:gate-13');
  assert.equal(typeof fresh, 'string', 'a new profile id is a new pair — new work is not stranded');
});
```

- [ ] **Step 2: Run to verify red**

Run: `./node_modules/.bin/vitest run --project record packages/record/test/profile-drift-gate.test.ts 2>&1 | grep -E "×|Tests|Expected|Received" | head -30`
Expected: "prior legs" fails with `ok` received where `refused` was expected (the edited sibling opens the successor today); "supersedes" fails at `r1` with `ok` received; "blocker" fails with `ok` received where `record-exists` was expected (the sibling expires the blocker and opens today). The `r2` and versioned-open assertions are not reached yet.

- [ ] **Step 3: The prior-leg condition**

In `packages/record/src/kernel/prior-legs.ts`, after

```ts
    if (prior.profileId !== resolved.profile.id) return { ok: false };
```

add

```ts
    // The profile-drift gate: the prior leg's record must bind the same profileDigest the
    // successor's resolved profile digests to (SPEC §4, §10.1) — a flow is decided under one
    // version of its rules, and the separation-of-duties rules live in the profile.
    if (prior.profileDigest !== resolved.profileDigest) return { ok: false };
```

- [ ] **Step 4: The supersedes resolution**

In `packages/record/src/kernel/supersedes.ts`, add `import { heldProfile } from './held-profile.js';` and replace

```ts
    const resolved = profiles.get(record.profileId);
    if (resolved === undefined) return { ok: false }; // terminality unprovable — fail closed
```

with

```ts
    // Held by id AND binding (the profile-drift gate): a drifted profile derives terminality
    // from the wrong effect-seam declaration, so it proves nothing here.
    const resolved = heldProfile(profiles, record);
    if (resolved === undefined) return { ok: false }; // terminality unprovable — fail closed
```

- [ ] **Step 5: The blocker path at `open()`**

In `packages/record/src/kernel/open.ts`, after the two blocker-state checks and before `const resolveNow = now();`, add

```ts
  // The profile-drift gate: this instance may expire the blocker en passant only if it HOLDS
  // the blocker's profile — the blocker's genesis binding must be the digest this instance's
  // same-id profile digests to (SPEC §4). Otherwise the windows `resolveDueClock` would read
  // from `resolved` are not the blocker's rules, and the `expired` edge would be a write into
  // a record this instance does not hold. The blocker stands: `record-exists`, never-append —
  // the code this seam already speaks for a blocker it may not resolve (the `redeeming` one
  // above). Recovery is the version discipline: a new profile id is a new pair.
  if (blocker.profileDigest !== resolved.profileDigest) {
    return refused('record-exists');
  }
```

- [ ] **Step 6: Run green, then the record project**

Run: `./node_modules/.bin/vitest run --project record packages/record/test/profile-drift-gate.test.ts 2>&1 | tail -6` — all pass.
Run: `./node_modules/.bin/vitest run --project record 2>&1 | grep -E "×|FAIL|Test Files|Tests " | head -20` — only the expected inversions from Task 2 Step 5 remain red.

- [ ] **Step 7: Gates and commit**

```bash
./node_modules/.bin/biome check --write packages/record/src/kernel/prior-legs.ts packages/record/src/kernel/supersedes.ts packages/record/src/kernel/open.ts packages/record/test/profile-drift-gate.test.ts
./node_modules/.bin/biome check --error-on-warnings packages/record/src packages/record/test
./node_modules/.bin/tsc -p packages/record --noEmit
node scripts/contract-scan.mjs
```

Message:

```
The cross-record verifications and open()'s blocker path fold a profile they do not hold

verifyPriorLegs requires the prior leg's record to bind the successor's resolved profile
digest (a flow is decided under one version of its rules) and refuses prior-leg-unverified
otherwise; verifySupersedes resolves a confirmed predecessor's profile through heldProfile,
so a drifted one leaves terminality unprovable — supersedes-unverified — while a declined
predecessor recovers regardless. open()'s exclusivity path no longer expires a due blocker
whose binding its resolved profile does not match: the blocker stands, record-exists, no
edge; a new profile id is a new pair and opens at once. All pinned red first.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

```bash
git add packages/record/src/kernel/prior-legs.ts packages/record/src/kernel/supersedes.ts packages/record/src/kernel/open.ts packages/record/test/profile-drift-gate.test.ts
git commit -F <message file>
```

---

### Task 5: The unreachable arm, the stale comments, and the four inversions

**Files:**
- Modify: `packages/record/src/kernel/finalize.ts` (the `record.policyDigest !== undefined && resolved.profile.policySource === undefined` arm, near line 336; and the forward-corner comment near line 360)
- Modify: `packages/record/src/kernel/verify-signatures.ts` (the `signingDeclared` and `genesisProfile` doc comments)
- Modify: `packages/record/src/profile-digest.ts` (header lines 4–10)
- Modify: `packages/record/src/refusal-codes.ts` (the never-appends comment near line 172)
- Modify: `packages/record/test/policy-drift.test.ts` (two tests), `packages/record/test/multi-leg.test.ts` (one test), `packages/record/test/profile-drift-report.test.ts` (header and two tests)

- [ ] **Step 1: Convert the unreachable policy arm**

In `packages/record/src/kernel/finalize.ts`, replace the whole block

```ts
  if (record.policyDigest !== undefined && resolved.profile.policySource === undefined) {
    // THE DECIDED OPEN QUESTION (§10.3 names it; the recommendation on record is
    // fail-close, and this build takes it): a record opened under a DECLARING profile,
    // finalized under a same-id non-declaring instance, does NOT skip the gate — a
    // bound digest with nothing live to compare is mismatch-shaped, the same
    // fail-closed reading §10.3 itself gives the forward corner. The config flip is a
    // version-discipline violation either way; profileDigest makes it auditable. Cost,
    // accepted: a host retiring a policy source re-opens old records.
    return refuseMaybeAppend(store, 'policy-drift', leg, chain, resolved, finalLeg, now);
  }
```

with

```ts
  if (record.policyDigest !== undefined && resolved.profile.policySource === undefined) {
    // UNREACHABLE since the profile-drift gate: a record binding a policyDigest was opened
    // under a profile declaring policySource, and policySource is a declarative field the
    // genesis profileDigest covers — so a same-id profile that dropped it does not digest to
    // the binding and profile resolution above refused `unknown-profile` first (SPEC §4, §10.3
    // as amended; OPEN-QUESTIONS §2's fail-close decision stands, delivered one step earlier).
    // Until that gate this arm refused `policy-drift`, the decided open question of record. It
    // throws now so that a projection change that stopped covering policySource would fail
    // loudly here rather than silently re-open the corner.
    throw new Error(
      'finalize: unreachable — a bound policyDigest under a profile declaring no policySource ' +
        'cannot pass profile resolution; the profile-drift gate refuses unknown-profile first (SPEC §4)',
    );
  }
```

Then update the forward-corner comment inside `if (policy.digest !== record.policyDigest) {`:

```ts
      // Mismatch: both digests present and unequal — `policy-drift` proper. The "present
      // live digest against an ABSENT bound one" sub-case §10.3 once named here is
      // unreachable since the profile-drift gate (a same-id instance that newly declares
      // policySource does not digest to the record's binding and refuses unknown-profile at
      // resolution). Recovery is disposal + re-open, not retry (§10.3) — a declaring profile
      // SHOULD list policy-drift in terminalRefusals.
```

- [ ] **Step 2: Bring the doc comments to the new truth**

`packages/record/src/kernel/verify-signatures.ts` — the `signingDeclared` field doc: replace

```ts
   * here for a record that WAS opened under a signing profile. `genesisProfile` below says
   * whether the live profile is the one the record was opened under; read the two together.
```

with

```ts
   * here for a record that WAS opened under a signing profile — and, since the profile-drift
   * gate, no seam acts on that reading: an instance that does not hold the record's profile
   * refuses `unknown-profile` at resolution. `genesisProfile` below says whether the live
   * profile is the one the record was opened under; read the two together.
```

and the `genesisProfile` field doc: replace

```ts
   * binding), so there is nothing to compare. REPORTING ONLY, like `orphans`: no gate reads
   * it and `signatureLayerHolds` never computes it; a drifted non-signing sibling still
   * finalizes — the recorded residual, which `test/profile-drift-report.test.ts` pins AS A
   * BOUND so that it moves on purpose. Fail-closing it changes the SPEC §8 refusal registry
   * and the §9 ladder, and OPEN-QUESTIONS §1's decided granularity text, so it waits on a
   * fresh sanction. The comparison itself is what SPEC §4 promised the binding for ("the
   * governing profile is detectable on replay").
```

with

```ts
   * binding), so there is nothing to compare. REPORTING ONLY, like `orphans`: no gate reads
   * THIS field and `signatureLayerHolds` never computes it. The refusal lives elsewhere: since
   * the profile-drift gate every seam that resolves a persisted record applies the same
   * comparison through `kernel/held-profile.ts` and refuses `unknown-profile` when it does
   * not hold the profile (SPEC §4, §8) — so `drifted` here names exactly why such a seam
   * refused, or will. The comparison itself is what SPEC §4 promised the binding for ("the
   * governing profile is detectable on replay").
```

`packages/record/src/profile-digest.ts` — replace the header's last sentences

```ts
// archived chain. Still no GATE reads the comparison: a drifted profile refuses nothing
// — a recorded residual whose fail-close would change the refusal ladder and so waits on
// a fresh sanction (`kernel/verify-signatures.ts`, the `genesisProfile` field's own note).
```

with

```ts
// archived chain. And since the profile-drift gate every seam that resolves a persisted
// record makes the comparison too (`kernel/held-profile.ts`, against a digest cached on the
// resolved profile at `create()`) and refuses `unknown-profile` when this instance does not
// hold the profile the record was opened under (SPEC §4, §8).
```

`packages/record/src/refusal-codes.ts` — in the never-appends comment, replace

```ts
 * never-appends set): `record-exists` / `unknown-profile` / `unknown-leg` (pre-record) and
```

with

```ts
 * never-appends set): `record-exists` / `unknown-profile` / `unknown-leg` (pre-record —
 * `unknown-profile` also fires at every seam that resolves a persisted record whose profile
 * this instance does not hold, by id or by binding: the profile-drift gate, SPEC §4/§8) and
```

- [ ] **Step 3: Flip the two policy pins, with the argument**

In `packages/record/test/policy-drift.test.ts`, replace the forward-corner test's name and its final assertion:

```ts
test('the forward cross-instance corner is pre-empted: a same-id instance that newly declares policySource is a drifted profile — unknown-profile at resolution, never policy-drift', async () => {
  // §10.3 once had this corner refuse policy-drift ("a present live digest against an absent
  // bound one as a mismatch"). Since the profile-drift gate, policySource is a declarative
  // field the genesis profileDigest covers: the declaring instance does not digest to the
  // record's binding and refuses unknown-profile at profile resolution, before rung (4.5).
```

and

```ts
  assert.equal(out.code, 'unknown-profile');
```

Replace the decided-open-question test's name, comment and assertion:

```ts
test('THE DECIDED OPEN QUESTION, superseded: a bound record under a same-id non-declaring instance refuses unknown-profile at resolution — fail-close kept, delivered before rung (4.5)', async () => {
  // OPEN-QUESTIONS §2 decided fail-close and this build delivered it as policy-drift at rung
  // (4.5). The profile-drift gate delivers the same fail-close one step earlier: dropping
  // policySource changes the profile's projection, so the non-declaring instance does not
  // hold the record's profile and refuses unknown-profile at profile resolution. The
  // rung-(4.5) arm is unreachable and throws if ever reached (kernel/finalize.ts). This is
  // the THIRTEENTH self-authored inversion in the status record's numbered sequence: the
  // decided FORM moved, the decision did not.
```

and

```ts
  assert.equal(out.code, 'unknown-profile');
```

Keep the trailing no-append assertion exactly as it is.

- [ ] **Step 4: Flip the renamed-maker SoD pin**

In `packages/record/test/multi-leg.test.ts`, the test currently named `'the lookup miss refuses: a profile drifted between open() and finalize() cannot demonstrate distinctness'`: rename it and replace its refusal-code assertion.

```ts
test('the lookup miss is pre-empted: a same-id profile renamed between open() and finalize() is a drifted profile — unknown-profile at resolution, before the SoD gate can run', async () => {
```

and, where the test asserts the code:

```ts
  assert.equal(blocked.code, 'unknown-profile');
```

Above the `drifted` instance's construction, replace the existing comment with:

```ts
  // A second instance whose same-id profile RENAMED the maker leg. Before the profile-drift
  // gate this exercised the SoD lookup keying the record's own recorded legIds (the renamed
  // instance refused `sod-violation`). Renaming a leg changes the profile's projection, so
  // the instance no longer holds the record's profile and refuses `unknown-profile` at
  // resolution — the SoD lookup is unchanged, and unobservable through this shape now.
```

Keep the `'no append'` assertion.

- [ ] **Step 5: Flip the two bound pins and rewrite the header**

In `packages/record/test/profile-drift-report.test.ts`, replace the header's second paragraph

```ts
// REPORTING ONLY, stated as loudly as `orphans` is: no gate reads it, `signatureLayerHolds`
// never sees it, and the same-id non-signing sibling still finalizes. Fail-closing that
// sibling changes the SPEC §8/§9 refusal ladder and OPEN-QUESTIONS §1's decided text, so it
// needs a fresh sanction; the fail-open is pinned below AS A BOUND, so that the day it moves
// it moves on purpose. `profileDigest` and `projectProfile` are exported from the entry
// point so a host can make the same comparison offline over an archived chain.
```

with

```ts
// REPORTING ONLY, stated as loudly as `orphans` is: no gate reads THIS field and
// `signatureLayerHolds` never sees it. When this file was written the same-id non-signing
// sibling still finalized, and that fail-open was pinned here AS A BOUND "so that the day it
// moves it moves on purpose". It moved with the profile-drift gate increment (2026-09-03),
// under a sanction recorded in its specification: every seam that resolves a persisted record now
// refuses `unknown-profile` when it does not hold the profile — the two pins below say so.
// `profileDigest` and `projectProfile` are exported from the entry point so a host can make
// the same comparison offline over an archived chain.
```

In the test named `drifted, the finding's own route ...`, replace the tail

```ts
  // THE BOUND, pinned so it moves on purpose: nothing refuses. Fail-closing this is a
  // refusal-ladder change under a fresh sanction (file header), not a fix this pass may make.
  const out = await sibling.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'ok', 'recorded residual — see the file header before changing this');
```

with

```ts
  // THE BOUND MOVED (the profile-drift gate): the sibling does not hold the record's profile
  // and refuses at resolution — never-append, the record untouched.
  const out = await sibling.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'unknown-profile');
```

and rename it `"drifted, the finding's own route: a same-id sibling whose profile omits signing reads the record as non-signing, the report says drifted, and — since the profile-drift gate — the sibling refuses unknown-profile"`.

In the test named `drifted on the signing side is reporting only ...`, replace

```ts
  const out = await sibling.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'ok', 'drift gates nothing — reporting only');
```

with

```ts
  const out = await sibling.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused', 'the report is reporting only; the SEAM refuses');
  if (out.status === 'refused') assert.equal(out.code, 'unknown-profile');
```

and rename it `'drifted on the signing side: a same-id signing sibling with a different ttl verifies every signature, the report names the drift, and the seam refuses unknown-profile'`.

- [ ] **Step 6: Run the whole suite with the report gate**

```bash
pnpm test:ci > <scratch>/suite-task5.log 2>&1; echo "vitest exit: $?" >> <scratch>/suite-task5.log
node scripts/ci-assert-tests.mjs .vitest-results.json >> <scratch>/suite-task5.log 2>&1; echo "gate exit: $?" >> <scratch>/suite-task5.log
tail -3 <scratch>/suite-task5.log
```
Expected: `ci-assert-tests: ok — N tests in 73 files ...`, zero failed, zero skipped, `gate exit: 0`. Record N. If anything fails, it is a bug in Tasks 1–5: fix it here, never by loosening a pin.

- [ ] **Step 7: Gates and commit**

```bash
./node_modules/.bin/biome check --write packages/record/src/kernel/finalize.ts packages/record/src/kernel/verify-signatures.ts packages/record/src/profile-digest.ts packages/record/src/refusal-codes.ts packages/record/test/policy-drift.test.ts packages/record/test/multi-leg.test.ts packages/record/test/profile-drift-report.test.ts
./node_modules/.bin/biome check --error-on-warnings .
./node_modules/.bin/tsc -p packages/record --noEmit
node scripts/contract-scan.mjs
```

Message:

```
The policy reverse arm is unreachable; four pins invert with their arguments at the site

Dropping or adding policySource is a profile drift, so both of SPEC 10.3's cross-instance
corners refuse unknown-profile at profile resolution before rung (4.5) can run: the
now-non-declaring arm in finalize throws as unreachable (so a projection that stopped
covering policySource would fail loudly), and the forward corner's absent-bound sub-case is
re-commented. Two policy-drift pins flip to unknown-profile — the THIRTEENTH self-authored
inversion: OPEN-QUESTIONS 2's decided form moved, the decision did not. The renamed-maker
SoD pin flips for the same reason (the shape no longer passes resolution). The two
profile-drift-report bound pins flip as their header promised. Doc comments in
verify-signatures.ts, profile-digest.ts and refusal-codes.ts state the new truth.

Full suite: <N> tests in 73 files, report gate ok.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

```bash
git add packages/record/src/kernel/finalize.ts packages/record/src/kernel/verify-signatures.ts packages/record/src/profile-digest.ts packages/record/src/refusal-codes.ts packages/record/test/policy-drift.test.ts packages/record/test/multi-leg.test.ts packages/record/test/profile-drift-report.test.ts
git commit -F <message file>
```

---

### Task 6: The sealed-set edits at the sanctioned sites, the guide, and the changelog

**Files:**
- Modify: `docs/concept/SPEC.md` (sites 1–7, and 14 only if re-granted), `docs/concept/OPEN-QUESTIONS.md` (sites 8–9), `docs/concept/CONTROLS.md` (sites 10–11), `docs/concept/GLOSSARY.md` (site 12), `docs/concept/DECISIONS.md` (site 13)
- Modify: `docs/guide/api-reference.md`, `docs/guide/integrating.md`, `docs/guide/concepts.md`, `CHANGELOG.md`
- Create (scratch, not committed): `<scratch>/check-sites.mjs`

**Before starting:** open the spec's §8 and read its grant lines. Sites 1–13 are GRANTED. Site 14 is landed ONLY if its status line reads GRANTED (re-granted); if it still reads RE-GRANT REQUESTED, skip Step 15 and say so in the commit message. Every edit below is the spec's "Proposed" text verbatim; if a "Current" anchor is not found exactly, stop — the sealed text has moved since the spec was written, and the grant does not cover a different sentence.

- [ ] **Step 1: Site 1 — SPEC §8, the core-registry row**

In `docs/concept/SPEC.md`, replace the cell text

```
unknown identifiers fail closed and never append; `unknown-leg` has two producers — a caller-named leg absent from the profile at `stage()`, and a staged draft's leg absent from the profile it resolves under at `open()`
```

with

```
unknown identifiers fail closed and never append. `unknown-profile` has two producers — a `profileId` this instance does not register, and, at every seam that resolves a persisted record, a registered same-id profile whose data-only projection does not digest to the record's genesis `profileDigest`: the instance does not hold the profile the record was opened under (§4). `unknown-leg` has two producers — a caller-named leg absent from the profile at `stage()`, and a staged draft's leg absent from the profile it resolves under at `open()`
```

- [ ] **Step 2: Site 2 — SPEC §4, the `profileDigest` paragraph**

Replace the paragraph's ending

```
so the record notarizes the shape of the flow it was decided under; drift in the
governing profile is detectable on replay.
```

with (re-wrapped to the file's line width)

```
so the record notarizes the shape of the flow it was decided under; drift in the governing profile is detectable on replay, and refused at the seams: an instance whose registered same-id profile does not digest to the bound `profileDigest` does not hold the profile the record was opened under, and every operator seam that resolves the record — finalize, decline, the findings seams, the redemption seams, seal — refuses `unknown-profile` (§8) at profile resolution, never-append and ahead of every ladder rung, so a drifted instance writes nothing into the record, expires nothing en passant, and cannot leave an unsigned edge in a signing chain (§14); the two cross-record verifications (§10.1, §2) fold the same mismatch on the referenced record into their own claim refusals. Recovery is the version discipline the `id` field names (§9.1): restore the profile's declarative fields exactly — the projection is deterministic, so a faithful restore resolves again — or keep the prior version registered under its id and give the edit a new one. A stranded open record is the cost of deciding only under the rules the record binds, and it is stated here rather than softened.
```

- [ ] **Step 3: Site 3 — SPEC §9, the pre-ladder paragraph**

Replace

```
so against a
tampered chain the call refuses `chain-compromise`, and against an unconfigured profile
`unknown-profile`, before the policy throw can fire (§10.3).
```

with (re-wrapped)

```
so against a tampered chain the call refuses `chain-compromise`, and against a profile this instance does not hold — unregistered, or registered under the record's id with a binding other than the genesis `profileDigest` (§4) — `unknown-profile`, before the policy throw can fire (§10.3).
```

- [ ] **Step 4: Site 4 — SPEC §10.3, the "one coherent corner" sentence**

Replace the sentence beginning `One coherent corner stays a **refusal**, not a throw:` through `since the record is coherent evidence of a real prior decision.` with

```
The cross-instance corner never reaches this gate: a record opened under a non-declaring profile and later finalized under a same-id instance that *does* declare binds a genesis `profileDigest` the live profile does not digest to (`policySource` is a declarative field), so profile resolution refuses `unknown-profile` first (§4, §8) — fail-closed, never-append — and `policy-drift` is left purely "both digests present and unequal".
```

- [ ] **Step 5: Site 5 — SPEC §10.3, the reverse-direction paragraph**

Replace the whole paragraph beginning `**The reverse cross-instance direction is permissive at AL1 — a named, open decision.**` and ending `detached signing (AL2, §14) is the named closure.` with

```
**The reverse cross-instance direction refuses too, one step earlier.** A record opened under a *declaring* profile then finalized under a same-id *non-declaring* instance is a profile drift — the same-id profile *dropped* `policySource`, a version-discipline violation off the honest path — and profile resolution refuses `unknown-profile` (§4, §8) before this gate runs. This direction was once permissive, its fail-close was decided on record (`OPEN-QUESTIONS.md` §2), and the profile-binding refusal now delivers it. For a single-leg record the bound `policyDigest` and `profileDigest` both live in the sole-genesis (head) payload, inside the §0/§5 head-bound blind window — a storage-writing insider who edits that genesis to match the drifted live policy and profile consistently defeats both gates. This is the policy-gate analog of §10.1's SoD-evidence window; detached signing (AL2, §14) is the named closure.
```

- [ ] **Step 6: Site 6 — SPEC, the maturity legend**

Replace `(§10.3's reverse cross-instance direction, §12's pre-1.0 signature freeze)` with `(§12's pre-1.0 signature freeze)`.

- [ ] **Step 7: Site 7 — SPEC §10.1, the prior-leg enumeration**

Replace `share the successor's `profileId` and `subjectRef`, sit at the expected leg in order, and be `confirmed`.` (in the sentence beginning `the chain must verify intact`) with

```
share the successor's `profileId` and `subjectRef`, bind the same `profileDigest` the successor's resolved profile digests to (§4 — a flow is decided under one version of its rules), sit at the expected leg in order, and be `confirmed`.
```

- [ ] **Step 8: Site 8 — OPEN-QUESTIONS §1, the granularity tail**

After `a profile flipping the field is the version-discipline violation SPEC §2's convention names.` append

```
 **Amended (this build, the profile-drift gate):** the violation now refuses rather than downgrading — a same-id profile whose data-only projection differs from a record's genesis `profileDigest` (`signing` is a covered field) refuses `unknown-profile` at every seam that resolves the record (SPEC §4, §8); what remains is the recompute route, a rewritten genesis carrying a consistent digest, which only signing-only registration or AL2 key custody closes.
```

- [ ] **Step 9: Site 9 — OPEN-QUESTIONS §2, the superseded tail**

After `refuses `policy-drift` rather than skipping the gate.` append

```
 **Superseded (this build, the profile-drift gate):** both cross-instance directions now refuse `unknown-profile` at profile resolution (SPEC §4, §8) — a same-id profile adding or dropping `policySource` is a profile drift — so the `policy-drift` arm for a now-non-declaring profile is unreachable and the code says so; the decision stands as fail-close, delivered one step earlier.
```

- [ ] **Step 10: Site 10 — CONTROLS, the policy-drift row's honest-bound cell**

Replace `Notarizes, never evaluates; reverse cross-instance direction is a named open decision; genesis-head AL1 window` with

```
Notarizes, never evaluates; both cross-instance directions refuse `unknown-profile` at profile resolution (a same-id profile change is a profile drift, SPEC §4); genesis-head AL1 window
```

- [ ] **Step 11: Site 11 — CONTROLS §2, the new KERNEL row**

Immediately after the `| Content binding | ... |` row, insert

```
| Profile binding | `profileDigest` over the profile's data-only projection at genesis; every seam that resolves the record refuses `unknown-profile` unless the registered same-id profile digests to it (SPEC §4, §8) | PROVEN | Decided-under-rules-as-they-were, by configuration only: a rewritten genesis carrying a consistent digest (the recompute route) passes at AL1 — AL2 or signing-only registration closes it; a stranded open record is the stated cost of an in-place profile edit |
```

- [ ] **Step 12: Site 12 — GLOSSARY, the `profileDigest` entry**

Replace `what makes governance drift detectable on replay (SPEC §4).` with

```
what makes governance drift detectable on replay — and, since the profile-drift gate, refused at every seam that resolves the record (`unknown-profile`, SPEC §4, §8).
```

- [ ] **Step 13: Site 13 — DECISIONS #5**

Replace `— Config drift becomes detectable on replay without hashing unhashable closures.` with

```
— Config drift becomes detectable on replay without hashing unhashable closures, and is refused at every seam that resolves the record (`unknown-profile`, SPEC §4, §8).
```

- [ ] **Step 14: Verify the landed sealed text against the spec, mechanically**

Create `<scratch>/check-sites.mjs`:

```js
// The exit check the sealed-set discipline asks for: every Proposed text in the spec's §8 is
// present in its sealed source, whitespace-collapsed, and every Current text it replaced is gone.
import { readFileSync } from 'node:fs';
const root = 'C:/Users/a/Documents/GitHub/allafta/vidimera/';
const collapse = (s) => s.replace(/\s+/g, ' ').trim();
const src = (p) => collapse(readFileSync(root + p, 'utf8'));
const SPEC = 'docs/concept/SPEC.md';
const OQ = 'docs/concept/OPEN-QUESTIONS.md';
const CONTROLS = 'docs/concept/CONTROLS.md';
const GLOSSARY = 'docs/concept/GLOSSARY.md';
const DECISIONS = 'docs/concept/DECISIONS.md';
const present = [
  [SPEC, 'the instance does not hold the profile the record was opened under (§4). `unknown-leg` has two producers'],
  [SPEC, 'detectable on replay, and refused at the seams: an instance whose registered same-id profile does not digest to the bound `profileDigest`'],
  [SPEC, 'A stranded open record is the cost of deciding only under the rules the record binds, and it is stated here rather than softened.'],
  [SPEC, 'against a profile this instance does not hold — unregistered, or registered under the record\'s id with a binding other than the genesis `profileDigest` (§4) — `unknown-profile`, before the policy throw can fire (§10.3).'],
  [SPEC, 'The cross-instance corner never reaches this gate:'],
  [SPEC, '`policy-drift` is left purely "both digests present and unequal".'],
  [SPEC, '**The reverse cross-instance direction refuses too, one step earlier.**'],
  [SPEC, 'edits that genesis to match the drifted live policy and profile consistently defeats both gates.'],
  [SPEC, 'about its *future revision* (§12\'s pre-1.0 signature freeze) does not lower it.'],
  [SPEC, 'bind the same `profileDigest` the successor\'s resolved profile digests to (§4 — a flow is decided under one version of its rules), sit at the expected leg in order, and be `confirmed`.'],
  [OQ, '**Amended (this build, the profile-drift gate):** the violation now refuses rather than downgrading'],
  [OQ, '**Superseded (this build, the profile-drift gate):** both cross-instance directions now refuse `unknown-profile` at profile resolution'],
  [CONTROLS, 'both cross-instance directions refuse `unknown-profile` at profile resolution (a same-id profile change is a profile drift, SPEC §4); genesis-head AL1 window'],
  [CONTROLS, '| Profile binding | `profileDigest` over the profile\'s data-only projection at genesis;'],
  [GLOSSARY, 'and, since the profile-drift gate, refused at every seam that resolves the record (`unknown-profile`, SPEC §4, §8).'],
  [DECISIONS, 'and is refused at every seam that resolves the record (`unknown-profile`, SPEC §4, §8).'],
];
const absent = [
  [SPEC, 'unknown identifiers fail closed and never append; `unknown-leg` has two producers'],
  [SPEC, 'drift in the governing profile is detectable on replay. '],
  [SPEC, 'against an unconfigured profile `unknown-profile`'],
  [SPEC, 'One coherent corner stays a **refusal**, not a throw'],
  [SPEC, '**The reverse cross-instance direction is permissive at AL1 — a named, open decision.**'],
  [SPEC, '(§10.3\'s reverse cross-instance direction, §12\'s pre-1.0 signature freeze)'],
  [CONTROLS, 'reverse cross-instance direction is a named open decision'],
  [GLOSSARY, 'what makes governance drift detectable on replay (SPEC §4).'],
  [DECISIONS, 'without hashing unhashable closures. —'],
];
let bad = 0;
for (const [f, q] of present) { const ok = src(f).includes(collapse(q)); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'MISS'} present ${f} :: ${q.slice(0, 60)}`); }
for (const [f, q] of absent) { const ok = !src(f).includes(collapse(q)); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'STILL'} absent  ${f} :: ${q.slice(0, 60)}`); }
console.log(bad === 0 ? 'sealed text matches the spec' : `${bad} mismatch(es)`);
process.exitCode = bad === 0 ? 0 : 1;
```

Run: `node <scratch>/check-sites.mjs` — expected: every line `ok`, final line `sealed text matches the spec`. Fix any MISS/STILL by re-reading the spec's §8 for that site; never by editing the spec's Proposed text.

- [ ] **Step 15: Site 14 — ONLY if the spec's §8 records its re-grant**

Check: `grep -n "Site 14: RE-GRANT" docs/superpowers/specs/2026-09-03-profile-drift-gate-design.md`. If the status line still reads `RE-GRANT REQUESTED`, skip this step and note in the commit message: "Site 14 not landed: re-grant pending; SPEC §4's exception list is false by omission until it is." If it reads `RE-GRANTED`, in `docs/concept/SPEC.md` replace

```
leaving
that edge to the redemption seam's own clock (§9.1, §11.2).
```

(the end of the "Named exceptions" sentence) with

```
leaving that edge to the redemption seam's own clock (§9.1, §11.2); and no mutating seam appends a clock edge to a record whose profile this instance does not hold (the `profileDigest` binding, below) — the decision, findings, redemption and seal seams refuse `unknown-profile` at profile resolution, ahead of their clock rung, and `open()`'s exclusivity check leaves a due blocker whose binding its resolved profile does not match standing, refusing `record-exists`.
```

and add to `check-sites.mjs`'s `present` list `[SPEC, 'and no mutating seam appends a clock edge to a record whose profile this instance does not hold']`, re-run it.

- [ ] **Step 16: The guide**

`docs/guide/api-reference.md`:

Replace the refusal-table row `| `unknown-profile` / `unknown-leg` | Pre-record resolution failures (never append) |` with

```
| `unknown-profile` / `unknown-leg` | Resolution failures (never append): an unknown id — or, for `unknown-profile`, a registered same-id profile whose data-only projection does not digest to the record's genesis `profileDigest`, at every seam that resolves a record |
```

In the `genesisProfile` paragraph (the bold-led paragraph beginning `**`signingDeclared` is computed from the live profile`), replace

```
`signingDeclared: false`, and a same-id non-signing instance will finalize it as plain AL1.
```

with

```
`signingDeclared: false` — and that instance does not HOLD the record's profile, so every seam it resolves the record at refuses `unknown-profile`, never-append.
```

and replace the paragraph's ending

```
Reporting only, exactly as `orphans` is: nothing refuses on drift. That fail-open is a
recorded residual — closing it changes the refusal registry and waits on a fresh sanction —
so read the two fields together, and treat `drifted` on a record you believed signed as a
configuration event to investigate.
```

with

```
The field itself is reporting only, exactly as `orphans` is; the refusal lives at the seams, which make the same comparison and refuse `unknown-profile` when they do not hold the profile. So `drifted` names exactly why a seam refused, or will — read the two fields together, and treat `drifted` on any record as a configuration event: restore the profile's declarative fields exactly, or keep the old version registered under its id and give the edit a new one. An in-place edit strands that profile's open records until you do one of those.
```

`docs/guide/integrating.md`:

Replace the AL2 bullet text

```
  `operator.verifySignatures(recordId).genesisProfile` reports `drifted` there, with the
  bound and live digests; nothing refuses, by recorded decision, until a sanctioned change
  says otherwise — so alert on `drifted` for any record you believed signed.
```

with

```
  Since the profile-drift gate that instance does not hold the record's profile at all: every
  seam refuses `unknown-profile`, never-append, and
  `operator.verifySignatures(recordId).genesisProfile` reports `drifted` with the bound and
  live digests so you can see why.
```

and, in the `## Profile design` section, after the sentence `The id convention is `<domain>.<subject>.v<n>`.` insert a new paragraph:

```
Treat the convention as load-bearing. Each record's genesis binds a digest of the profile it was opened under, and every seam refuses `unknown-profile` for a record whose registered same-id profile no longer digests to that binding. So an in-place edit to a profile — a new allowed authority, a longer ttl, dropping `signing` — strands that profile's open records: nothing can finalize, decline, expire or take findings on them, and their subjects stay held by exclusivity, until you either restore the declarative fields exactly or register the edit under a new id and keep the old version registered for the records still under it. The second route is the convention; the first is the escape when you edited by mistake.
```

`docs/guide/concepts.md`: replace

```
Detectable, not refused — a drifted profile gates nothing today.
```

with

```
Detected and refused: a seam that does not hold the profile a record was opened under — a registered same-id profile whose projection no longer digests to the record's binding — refuses `unknown-profile`, never-append. Version your profiles; an in-place edit strands its open records until restored or versioned.
```

- [ ] **Step 17: CHANGELOG**

In `CHANGELOG.md`, at the top of `### Changed`, insert:

```
- **A record refuses under a profile this instance does not hold — the profile-drift gate**
  (2026-09-03, branch `profile-drift-gate`; a sealed-set widening under a fresh sanction
  recorded in `docs/superpowers/specs/2026-09-03-profile-drift-gate-design.md` §8 — no
  maturity marker moves): every seam that resolves a persisted record (`finalize`, `decline`,
  `raiseFinding`, `acknowledge`, `redeem`, `beginRedemption`, `completeRedemption`, `seal`)
  now refuses `unknown-profile`, never-append, when the registered same-id profile's data-only
  projection does not digest to the record's genesis `profileDigest`; the two cross-record
  verifications fold the same miss into `prior-leg-unverified` and `supersedes-unverified`;
  and `open()` leaves a due blocker it does not hold standing (`record-exists`) rather than
  expiring it. This closes the configuration route the 2026-09-03 security review took — a
  same-id profile that dropped `signing: true` finalizing a signing record — and enforces the
  version discipline the concept always asked for: an in-place profile edit strands that
  profile's open records until the declarative fields are restored exactly or the edit gets a
  new id. Not closed, said plainly: the recompute route (a rewritten genesis with a consistent
  digest) stays the rehoming residual at AL1. Consequences inside the tree: both SPEC §10.3
  cross-instance policy corners are pre-empted (the now-non-declaring arm is an unreachable
  throw), two `policy-drift` pins and the renamed-maker SoD pin flip to `unknown-profile` —
  the thirteenth self-authored inversion — and `profile-drift-report.test.ts`'s bound pins
  flip as their header promised. `packages/record/test/profile-drift-gate.test.ts` pins every
  seam, the depth pair, both recovery routes, the cross-record verifiers and the blocker path,
  red first.
```

- [ ] **Step 18: Gates and commit**

```bash
git add docs/concept docs/guide CHANGELOG.md
node scripts/contract-scan.mjs
pnpm -s api-sync
pnpm -s docs-index-sync
./node_modules/.bin/biome check --error-on-warnings .
```
Expected: all silent/clean. Then a last look: `git diff --cached --stat docs/concept` must list ONLY `SPEC.md`, `OPEN-QUESTIONS.md`, `CONTROLS.md`, `GLOSSARY.md`, `DECISIONS.md`. Any other concept file staged is outside the grant — unstage and revert it.

Message:

```
The profile-drift gate's sealed-set edits at the sanctioned sites, the guide, the changelog

Sites 1–13 of the design's section 8 land verbatim: SPEC 8's unknown-profile row gains its
second producer; SPEC 4's profileDigest paragraph says refused, never-append, with the two
recovery routes and the stranding stated; SPEC 9's pre-ladder sentence, both SPEC 10.3
cross-instance paragraphs, the maturity legend's example and SPEC 10.1's prior-leg
enumeration move; OPEN-QUESTIONS 1 is amended and 2 superseded; CONTROLS' policy row and a
new KERNEL Profile-binding row; GLOSSARY's profileDigest entry; DECISIONS #5. No marker
moves. Site 14 (SPEC 4's en-passant exceptions): <landed on the re-grant recorded in the
spec | NOT landed — re-grant pending, the enumeration is false by omission until it is>.
The landed text was checked mechanically against the spec's Proposed texts (present) and
Current texts (absent). Guide: api-reference's refusal row and genesisProfile paragraph,
integrating's AL2 bullet and a Profile-design paragraph on the stranding, concepts. The
grant is spent with this commit.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

```bash
git commit -F <message file>
```

---

### Task 7: The record

**Files:**
- Modify: `docs/process/implementation-status.md` (append a section; the "Measured against the current tree" bullet near line 116)
- Modify: `CLAUDE.md` (the count near line 31; the lineage sentence near line 241)
- Modify: `docs/process/next-phases.md` (the sanction-gated list's fourth entry)
- Modify: `docs/process/open-items-plan.md` (the rehoming-residual bullet)
- Modify: `docs/superpowers/INDEX.md` (this plan's link)
- Modify: `docs/superpowers/specs/2026-09-03-profile-drift-gate-design.md` (grant status: spent)

- [ ] **Step 1: Run the full suite once more and capture the figures**

```bash
pnpm test:ci > <scratch>/suite-task7.log 2>&1; echo "vitest exit: $?" >> <scratch>/suite-task7.log
node scripts/ci-assert-tests.mjs .vitest-results.json >> <scratch>/suite-task7.log 2>&1
./node_modules/.bin/biome check . 2>&1 | grep Checked
pnpm -s typecheck && echo "typecheck: clean"
```
Record: tests, files, the `ci-assert-tests` line, biome's file count.

- [ ] **Step 2: The status-doc section**

Append to `docs/process/implementation-status.md` (write it to a scratch file with the Write tool and `cat` it onto the end; the file ends with a newline). Fill the angle-bracketed figures from Step 1 and the branch's commit list from `git log --format='%h %s' main..HEAD`.

```markdown

## Post-build-order increment — The profile-drift gate (a sanctioned widening of `unknown-profile`)

**The twenty-third post-build-order increment, exited (branch `profile-drift-gate`, cut from
`main` at `54d9d1c`: <N> commits, listed in the design's own record).** A sealed-set widening
under a fresh sanction — `docs/superpowers/specs/2026-09-03-profile-drift-gate-design.md`,
whose §8 records the grant on the maintainer's words and the exact sites, and whose §9 names
every pin — and NOT a marker move: every touched section was already `[PROVEN]`. It joins the
lineage as a sanctioned corrective-and-widening edit, beside the earlier sanctioned corrective
edits and distinct from the ten marker-bearing commits.

**What it closes.** The security-findings pass (the twenty-second increment) left one finding
reported rather than refused: `signingDeclared` is computed from the profile THIS instance
holds, so a same-id profile that dropped `signing: true` read a signing record as plain AL1 and
finalized it. Now an instance HOLDS a record's profile only when the id is registered AND the
registered profile's data-only projection digests to the record's genesis `profileDigest`
(`kernel/held-profile.ts`, against a digest cached on `ResolvedProfile` at `create()`, which
`open()` also binds — byte-identical, the frozen pins unmoved). Every seam that resolves a
persisted record — finalize, decline, raiseFinding, acknowledge, redeem, beginRedemption,
completeRedemption, seal — refuses `unknown-profile`, never-append, at the resolution step it
already had, ahead of every rung; `verifyPriorLegs` and `verifySupersedes` fold the miss into
`prior-leg-unverified` and `supersedes-unverified`; `open()`'s exclusivity path leaves a due
blocker it does not hold standing, `record-exists`, rather than expiring it under the wrong
rules. No new code, no new rung: SCOPING-GUIDE §1 places the control in the KERNEL and §2
names it verbatim, "decided-under-rules-as-they-were".

**What it costs, stated as behavior.** An in-place profile edit strands that profile's open
records: nothing finalizes, declines, expires or takes findings on them, and exclusivity holds
their subjects, until the declarative fields are restored exactly or the edit is registered
under a new id with the old version kept under its own. Pinned, not softened
(`test/profile-drift-gate.test.ts`: the due record that does not expire; the blocker that
stands; both recovery routes).

**What it does not close.** The recompute route: a storage-writing insider who rewrites the
genesis `profileId` AND `profileDigest` consistently onto a registered non-signing profile
still resolves as held. That is the rehoming residual proper (the 2026-08-30 catalogue's item
60), open at AL1; only signing-only registration or AL2 key custody closes it.

**The thirteenth self-authored inversion.** OPEN-QUESTIONS §2 decided the policy-gate reverse
direction fail-close, and this build delivered it as `policy-drift` at rung (4.5). Dropping
`policySource` is a profile drift, so both §10.3 cross-instance corners now refuse
`unknown-profile` at resolution before rung (4.5) can run; the now-non-declaring arm in
`kernel/finalize.ts` throws as unreachable, and two `policy-drift.test.ts` pins flip. The
decision did not move; its form did — argued at the pins. Two further pins flipped for the
same mechanical reason without a numbered inversion: `multi-leg.test.ts`'s renamed-maker
separation-of-duties pin (the shape no longer passes resolution) and
`profile-drift-report.test.ts`'s two bound pins, as that file's header promised.

**The sealed-set edits.** Sites 1–13 of the design's §8, verbatim, checked mechanically at
exit against the Proposed texts (present) and the Current texts (absent). Site 14 — SPEC §4's
en-passant exceptions, found while writing the plan — <landed on the re-grant recorded in the
design | is NOT landed: its re-grant is pending and the enumeration is false by omission until
it is, named here so no reader mistakes the omission for an oversight>.

**Gate outputs, as measured against the closing commit.** `pnpm test:ci` — <tests> tests in
<files> files, zero skips (`<the ci-assert-tests line>`); `pnpm typecheck` — both packages
clean; `biome check --error-on-warnings .` — <N> files, exit 0; `contract-scan`,
`api-reference-sync`, `docs-index-sync` — exit 0.
```

- [ ] **Step 3: The measured bullet, and CLAUDE.md**

In `docs/process/implementation-status.md`'s `**Measured against the current tree**` bullet, set the file and test counts and biome's file count to Step 1's figures. In `CLAUDE.md`, do the same on the `tree: `pnpm test` — 72 test files, 889 tests, zero skips;` line, and in the process-disciplines bullet append to the sentence ending `spent at the increment it covered.` this clause:

```
 One sanctioned corrective-and-widening edit followed with no marker move — the profile-drift gate (2026-09-03), which widened `unknown-profile`'s producer text and the sentences it falsified across SPEC §§4, 8, 9, 10.1, 10.3 and the legend, OPEN-QUESTIONS §§1–2, CONTROLS, GLOSSARY and DECISIONS #5, under the grant recorded in its design's §8.
```

- [ ] **Step 4: next-phases, open-items-plan, INDEX, the spec**

`docs/process/next-phases.md`: replace the bullet beginning `- **Fail-closing a drifted genesis profile.**` with

```
- **Fail-closing a drifted genesis profile — DECIDED and landed 2026-09-03** (the profile-drift
  gate, `docs/superpowers/specs/2026-09-03-profile-drift-gate-design.md`, sanction granted on
  that document): every seam that resolves a persisted record refuses `unknown-profile` when
  the registered same-id profile does not digest to the record's binding; `open()` leaves a
  blocker it does not hold standing. What remains for the 1.0 review is the recompute route
  alone (catalogue item 60), which no configuration gate can close.
```

and change the introductory sentence's `all are recorded as **sanction-gated, not decided**` to `three remain **sanction-gated, not decided** and the fourth was decided and landed`.

`docs/process/open-items-plan.md`: in the rehoming-residual bullet, replace `With the report in place the tightening's one remaining question is whether to REFUSE on drift; `packages/record/test/profile-drift-report.test.ts` pins today's fail-open as a bound.` with

```
The profile-drift gate (2026-09-03) took the profileDigest-pinning tightening on the
      configuration route: every seam refuses `unknown-profile` for a profile it does not
      hold. The recompute route — a rewritten genesis with a consistent digest — is what
      this bullet still names, and only signing-only registration closes it.
```

`docs/superpowers/INDEX.md`: the plan link and the counts are already in place. In this increment's row, replace `sanction granted 2026-09-03; site 14 re-grant requested` with `sanction granted 2026-09-03 and spent` followed by site 14's outcome in a short parenthesis (`site 14 re-granted` or `site 14 withheld`).

The spec: replace `**Grant status: GRANTED 2026-09-03**` with `**Grant status: GRANTED 2026-09-03, SPENT at this increment's exit**` (leave the rest of the paragraph).

- [ ] **Step 5: Gates and commit**

```bash
git add docs/process/implementation-status.md CLAUDE.md docs/process/next-phases.md docs/process/open-items-plan.md docs/superpowers/INDEX.md docs/superpowers/specs/2026-09-03-profile-drift-gate-design.md
node scripts/contract-scan.mjs
pnpm -s docs-index-sync
pnpm -s api-sync
```

Message:

```
The profile-drift gate: its record, and the counts and lists it moves

implementation-status.md gains the twenty-third post-build-order section — what the gate
closes, what it costs as behavior, what it does not close (the recompute route), the
thirteenth self-authored inversion, the sealed-set edits and their mechanical check, and
the gate outputs — and moves its measured bullet; CLAUDE.md's count moves and its lineage
sentence names the sanctioned widening; next-phases marks the fourth sanction-gated entry
decided and landed; open-items-plan's rehoming bullet narrows to the recompute route;
INDEX.md links this plan; the spec's grant is marked spent.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

```bash
git commit -F <message file>
git log --format='%h %s' main..HEAD
```

Then stop: merging and pushing are the owner's acts.

---

## Self-review against the spec

- **§1 The outcome** → Tasks 2–4 (every seam), Task 5 (the arm), Task 6 site 1.
- **§2 Producers, eleven sites** → Tasks 2 (finalize, decline), 3 (findings ×2, redemption ×3, seal), 4 (prior-legs, supersedes, open blocker).
- **§3 What stays** → Task 5 (unreachable throw; comments); reads untouched by construction (no task edits them).
- **§4 Registry unchanged** → no task adds a code; Task 5 edits only a comment in `refusal-codes.ts`.
- **§5 Interactions** → Task 2 depth pins, Task 4 blocker pin, Task 5 corners.
- **§6 Honest bounds** → Task 6 (SPEC §4 text, guide), Task 7 (record).
- **§8 Sites 1–13** → Task 6 Steps 1–13; site 14 → Step 15 conditional on the re-grant.
- **§9 Tests** → Tasks 1–4 (new pins), Task 5 (the four inversions). The spec's "export pin already asserts this" refers to `profile-drift-report.test.ts`'s existing helper test, which Task 1 Step 6 runs.
- **§10 Records and guide** → Tasks 6 and 7.
- **Type consistency:** `heldProfile(profiles, record)` — `record` is the replayed `DecisionRecord`, which has `profileId` and `profileDigest` (the `ProfileBinding` shape); `ResolvedProfile.profileDigest` is used in Tasks 1, 4 (`resolved.profileDigest`) and by the helper. `blocker.profileDigest` in Task 4 is on the replayed blocker.
- **Placeholders:** the only angle-bracketed items are figures the executor measures (test counts, the `ci-assert-tests` line, the commit list) and the two-way site-14 sentence chosen by the recorded re-grant status — each says exactly what to fill in.
