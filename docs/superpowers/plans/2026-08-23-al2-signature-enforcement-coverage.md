# AL2 Signature-Enforcement Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close deferral-register rows 20 and 21 — every one of the seven `signatureLayerHolds` call sites gets its signature-broken disjunct executed, and every signature-broken test asserts what the seam *did*, not only which code it spoke.

**Architecture:** Two new exports in the shared signing test helper give a fixture the sidecar, the backing store and a verifier call counter. Nine named gaps close on that rig; five existing tests gain edge-shape assertions; one new census test fails the day an eighth call site appears. One comment-only `src/` edit corrects a stale claim. Rows 20 and 21 retire, row 22 opens.

**Tech Stack:** TypeScript (NodeNext, strict, `noUncheckedIndexedAccess`), vitest 4 (`record` project), `node:assert/strict`, `node:crypto` Ed25519, Biome.

**Spec:** `docs/superpowers/specs/2026-08-23-al2-signature-enforcement-coverage-design.md`

## Global Constraints

- **NO BEHAVIOR CHANGES AND NO SANCTION IS SOUGHT.** No task edits `docs/concept/`. No maturity marker moves. **Exactly one `packages/record/src/` edit is permitted in this whole plan** — the comment at `packages/record/src/kernel/redeem.ts:186-188`, in Task 8. **If you find yourself editing any other `src/` file, or changing any line of `redeem.ts` other than that comment, STOP: that is a behavior change and it is out of scope.**
- **`packages/record/test/byte-stability.test.ts` IS FROZEN — not one byte.** Verified byte-identical by `git diff` at the exit. `CONTRIBUTING.md` hard rule 4; `.github/CODEOWNERS`.
- **`packages/record/test/helpers/signing.ts`'s existing `signingSetup` IS FROZEN — not one byte.** Its fixed clock (`2026-08-21T00:00:00Z`) is load-bearing for `decline.test.ts`'s eligibility-freshness fixture, whose `observedAt` is meaningful only as a 2h offset against a 60s bound, and three test files build on it. You may only ADD exports below it. Verified by `git diff` at the exit.
- **THE VERIFIER COUNTER IS READ AS A DELTA, NEVER AS A TOTAL.** `verifySignatures()` consults the verifier itself, so `assert.ok(calls() > 0)` after reading the AL2 report passes vacuously. Always snapshot `const callsBefore = calls()` immediately before the seam call and assert `calls() > callsBefore`.
- **NO TEST MAY MAKE TWO REFUSING CALLS AND THEN ASSERT SIDECAR CARDINALITY.** On a record whose state admits no CAS candidate, each refusing call mints a fresh sidecar entry (`appendChainCompromise` stamps `at: now()`, so each call's digest is a new `put` key). An `entries.length === chain.length` assertion is sound only after exactly ONE refusing call. Where you write that comparison, add a comment saying so.
- **The five Finding D sites split into TWO edge shapes; copying one model to all five asserts something false.** `seal`, `raiseFinding` and un-enlisted `redeem` route through `appendChainCompromise` and take the append model. `verifyPriorLegs` and `verifySupersedes` refuse pre-record and append NOTHING — not to the new record, and not to the prior leg or predecessor whose chain was just found broken. They take the no-append model.
- **TypeScript narrowing:** the one-line guard form `if (x.status === 'refused') assert.equal(...)` does not narrow for subsequent lines. Any multi-line extension must use the early-return form `assert.equal(x.status, 'refused'); if (x.status !== 'refused') return;` before touching `.transitionRef`.
- **`noUncheckedIndexedAccess` is on.** `array[0]` is `T | undefined` and a regex capture `m[1]` is `string | undefined`. Guard before assigning to a typed `string`.
- **`codeOnlyPatterns` runs over every LINE of a tracked `.ts` file** — test names, comments and string literals included. Forbidden: the bare word `design` (only "by design" is excluded), the bare word `slice` (a left guard keeps `.slice()` legal), `Task <n>`, `slice <n>`, `OQ<n>-<n>`, `design §<n>`, foreign labels (`M-A`, `S-3`, `O11`, `T1.2`). **Never write "Task 2" in a comment or name a test "…the design's…".**
- **Never shorten a digest.** A full 64-char `sha256:` digest passes `commitRefPattern`; a TRUNCATED hex run does not. No partial hex fragments in comments.
- **Imports use the `.js` extension** even though files on disk are `.ts` (NodeNext). Biome sorts import members alphabetically inside braces and keeps the blank-line group split (node/vitest, then project-relative). Run `./node_modules/.bin/biome check --write .` after pasting, then re-read the diff.
- **Zero skips.** A cell that will not build as scripted is either built or recorded as a deferral with the trigger that un-defers it — never parked with `.skip`.
- **Figures are measured, never predicted.** Read `vitest run`'s totals off the tree at the exit and write them down then.
- Node floor `>=22.16`; ESM; zero runtime dependencies.
- **Gates at every commit — never call `pnpm`**: `./node_modules/.bin/vitest run` (zero skips), `./node_modules/.bin/tsc --noEmit -p packages/record` AND `-p packages/store-postgres`, `./node_modules/.bin/biome check .`, `node scripts/contract-scan.mjs` exit 0, `node scripts/api-reference-sync.mjs` exit 0, `node scripts/docs-index-sync.mjs` exit 0.
- Commit messages via `git commit -F <msgfile>` written with the **Write tool** (PowerShell `Set-Content` prepends a BOM). Verify the branch before each commit. **Never push.**
- Commit subjects: `AL2 signature-enforcement coverage N/9: <what landed>`.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `packages/record/test/helpers/signing.ts` | MODIFY — add `enforceableSigningSetup` and `breakOneSignature` below the frozen `signingSetup` | 1 |
| `packages/record/test/signing-enforce.test.ts` | MODIFY — repoint to the shared break helper; gains the decline, acknowledge and token-seam pins; five deepenings | 1, 2, 4, 5, 6 |
| `packages/record/test/redeem.test.ts` | MODIFY — repoint to the shared break helper | 1 |
| `packages/record/test/signing.test.ts` | MODIFY — one comment only, naming why its break differs | 1 |
| `packages/record/test/decline.test.ts` | MODIFY — the rung-(1)-beats-rung-(2) adjacent pair | 3 |
| `packages/record/test/signature-enforcement-sites.test.ts` | CREATE — the census | 7 |
| `packages/record/src/kernel/redeem.ts` | MODIFY — one comment, the ONLY `src/` edit in this plan | 8 |
| `docs/analysis/2026-08-23-signature-enforcement-coverage.md` | MODIFY — stale line pins; the orphan-growth section | 8 |
| `docs/process/deferral-register.md` | MODIFY — rows 20, 21 retire; row 22 opens | 9 |
| `docs/process/next-phases.md` | MODIFY — retirement sections; row 22 in the gate list | 9 |
| `docs/process/release-checklist.md` | MODIFY — rows 20/21 items go; row 22 item arrives | 9 |
| `docs/process/implementation-status.md` | MODIFY — increment section; retirement bullets; live figures | 9 |
| `docs/superpowers/INDEX.md` | MODIFY — `plan pending` becomes the plan link; plans count 33 → 34 | 9 |
| `CLAUDE.md` | MODIFY — the live figures sentence | 9 |

---

### Task 1: The shared enforcement rig

**Files:**
- Modify: `packages/record/test/helpers/signing.ts` (append below line 45; do not touch lines 1-45)
- Modify: `packages/record/test/signing-enforce.test.ts:62-71` (delete the local helper, import the shared one)
- Modify: `packages/record/test/redeem.test.ts:226-229` (replace the inlined break with a call)
- Modify: `packages/record/test/signing.test.ts:244` (comment only)

**Interfaces:**
- Produces: `enforceableSigningSetup(profiles: ConfirmProfile[], opts?: { store?: Store })` returning `{ handles, store, signatures, calls }` where `handles` is `{ agent, operator }`, `store` is the `Store` passed or a fresh `MemoryStore`, `signatures` is a `MemorySignatureStore`, and `calls` is `() => number` counting verifier invocations. Every later task consumes this.
- Produces: `breakOneSignature(signatures: MemorySignatureStore, recordId: string): Promise<void>`.

- [ ] **Step 1: Read the frozen helper and record its hash**

Run: `git hash-object packages/record/test/helpers/signing.ts`

Write the hash down. Step 8 re-runs it: the first 45 lines must be untouched, so the only legitimate change to this file is appended text.

- [ ] **Step 2: Append the two exports to `packages/record/test/helpers/signing.ts`**

Add these imports to the existing import block (Biome will re-sort; `assert` joins the node group, `Store` and `Surfaces` are type-only, `create` and `MemoryStore` are value imports):

```ts
import assert from 'node:assert/strict';

import { create } from '../../src/create.js';
import { MemoryStore } from '../../src/store/memory.js';
import type { Store } from '../../src/store/store.js';
```

Then append, after the existing `signingSetup`:

```ts
/**
 * The AL2 rig for signature-ENFORCEMENT fixtures. `signingSetup` above returns `{ handles }`
 * only, so a fixture built on it cannot reach the sidecar to break an entry — which is why
 * no test could drive a signature-broken chain through `decline()` until this landed. This
 * rig hands back three more things:
 *
 *   - `signatures`, the SAME `MemorySignatureStore` instance the config carries, so
 *     `breakOneSignature` below mutates what the kernel actually reads;
 *   - `store`, so an enlisted fixture can pass a `SqliteStore` and open a host transaction;
 *   - `calls`, a verifier invocation counter.
 *
 * READ `calls` AS A DELTA, NEVER AS A TOTAL. `verifySignatures()` consults the verifier too,
 * so `calls() > 0` can be satisfied without the seam under test ever reaching the layer.
 * Snapshot before the seam call and compare. The delta is what distinguishes rung (1)'s two
 * disjuncts: the condition short-circuits on `||`, so a HASH-broken chain never calls
 * `signatureLayerHolds` at all and the delta stays zero.
 *
 * Unlike `signingSetup` this uses the real clock (`create`, not `createWithClock`) — the
 * redemption seams stamp real `dueAt` values from `confirmToRedeem` and a frozen clock makes
 * those fixtures awkward. Nothing here depends on a fixed instant.
 */
export function enforceableSigningSetup(profiles: ConfirmProfile[], opts: { store?: Store } = {}) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const store = opts.store ?? new MemoryStore();
  const signatures = new MemorySignatureStore();
  let verifyCount = 0;
  const signer: Signer = async (bytes) => ({
    keyRef: 'key-1',
    signature: edSign(null, bytes, privateKey).toString('base64'),
  });
  const verifier: Verifier = async (bytes, signature) => {
    verifyCount += 1;
    return edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  };
  const config = {
    ...makeConfig(profiles, { store }),
    signing: { signer, verifiers: { 'key-1': verifier }, signatures },
  };
  return { handles: create(config), store, signatures, calls: () => verifyCount };
}

/**
 * Break exactly one sidecar entry (tamper its signature) for the given record. Lifted from
 * `signing-enforce.test.ts`'s file-local copy, which `redeem.test.ts` had inlined
 * byte-identically; both now call this.
 *
 * The guard on the second assertion is not ceremony: the mutation overwrites the LEADING four
 * base64 characters with `AAAA`, which is a silent no-op on a signature that already begins
 * with them. Without the guard the fixture would assert nothing and the test would pass green.
 *
 * `signing.test.ts` keeps its own variant, which breaks the TRAILING four characters. That is
 * a different corruption, not a duplicate of this one, so it is deliberately not folded in.
 */
export async function breakOneSignature(
  signatures: MemorySignatureStore,
  recordId: string,
): Promise<void> {
  const entries = await signatures.listByRecord(recordId);
  const victim = entries[0];
  assert.ok(victim !== undefined, 'fixture: the record has sidecar entries');
  const broken = `AAAA${victim.signature.slice(4)}`;
  assert.notEqual(broken, victim.signature, 'fixture: the tamper changed the signature');
  await signatures.put({ ...victim, signature: broken });
}
```

- [ ] **Step 3: Run typecheck to verify the new exports compile**

Run: `./node_modules/.bin/tsc --noEmit -p packages/record`
Expected: clean. If `Surfaces` or `Store` resolution fails, check the `.js` extensions on the specifiers.

- [ ] **Step 4: Repoint `signing-enforce.test.ts` to the shared break helper**

Delete lines 62-71 (the local `/** Break exactly one sidecar entry ... */` JSDoc and the whole `async function breakOneSignature` declaration). Add `breakOneSignature` and `enforceableSigningSetup` to a new import line:

```ts
import { breakOneSignature, enforceableSigningSetup } from './helpers/signing.js';
```

Leave the local `signedSetup`, `countingVerifier`, `signer` and the module keypair exactly as they are — the last test in the file calls `countingVerifier()` directly and would break if that factory moved.

- [ ] **Step 5: Repoint `redeem.test.ts` to the shared break helper**

At `packages/record/test/redeem.test.ts:226-229`, replace:

```ts
  const entries = await signatures.listByRecord(recordId);
  const victim = entries[0];
  assert.ok(victim !== undefined, 'fixture: the record has sidecar entries');
  await signatures.put({ ...victim, signature: `AAAA${victim.signature.slice(4)}` });
```

with:

```ts
  await breakOneSignature(signatures, recordId);
```

Add `breakOneSignature` to that file's import from `./helpers/signing.js` (create the import line if the file has none).

- [ ] **Step 6: Add the explanatory comment to `signing.test.ts`**

Immediately above `packages/record/test/signing.test.ts:244`, add:

```ts
  // Deliberately NOT `helpers/signing.ts`'s shared `breakOneSignature`: that one overwrites
  // the LEADING four base64 characters and this breaks the TRAILING four. Two different
  // corruptions of the same entry; folding them together would quietly change which bytes
  // this test exercises.
```

- [ ] **Step 7: Run the full suite**

Run: `./node_modules/.bin/vitest run`
Expected: PASS, zero skips, same test count as before this task (nothing was added yet — three call sites were rewired).

- [ ] **Step 8: Prove `signingSetup` is byte-identical**

Run: `git diff packages/record/test/helpers/signing.ts`
Expected: the diff shows ONLY appended lines and the import-block additions. Confirm no line between the original `export function signingSetup(` and its closing `}` changed. If any did, revert them.

- [ ] **Step 9: Gates and commit**

Run all gates from Global Constraints. Then:

```bash
git add packages/record/test/helpers/signing.ts packages/record/test/signing-enforce.test.ts packages/record/test/redeem.test.ts packages/record/test/signing.test.ts
git commit -F <msgfile>
```

Subject: `AL2 signature-enforcement coverage 1/9: the shared enforcement rig`

---

### Task 2: Row 20 — decline's AL2 disjunct

**Files:**
- Modify: `packages/record/test/signing-enforce.test.ts` (append two tests at the end of the file)

**Interfaces:**
- Consumes: `enforceableSigningSetup`, `breakOneSignature` from Task 1.
- Consumes existing module constants in that file: `CONTENT` (line 27).

- [ ] **Step 1: Write the two failing tests**

Append to `packages/record/test/signing-enforce.test.ts`. Add `verifyChain` to the imports:

```ts
import { verifyChain } from '../src/chain/replay.js';
```

```ts
test('decline refuses chain-compromise on a signature-broken signing record — the AL2 disjunct of rung (1), and the compromise edge is itself signed', async () => {
  // The SEVENTH signatureLayerHolds site (kernel/decline.ts), which this file's original six
  // tests predate and did not cover. Deferral-register row 20's remaining half: the
  // hash-broken disjunct gained a pin at the Finding E adjudication; this is the AL2 one.
  const profile: ConfirmProfile = {
    ...captureProfile({ id: 'test.enf.decline.v1', decline: true }),
    signing: true,
  };
  const { handles, signatures, calls } = enforceableSigningSetup([profile]);
  const recordId = await openRecord(handles, CONTENT, 'test.enf.decline.v1', 'subject:enf-9');
  await breakOneSignature(signatures, recordId);

  const before = await handles.operator.readChain(recordId);
  // AL1 is INTACT. Without this the refusal could be the hash disjunct and the test would
  // prove nothing about the signature layer.
  assert.equal(verifyChain(before).intact, true, 'fixture: hash-intact, signature-broken');
  const callsBefore = calls();

  const out = await handles.operator.decline(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.notEqual(out.transitionRef, undefined, 'an open record admits the edge');

  // The DELTA, never the total: verifySignatures() consults the verifier too.
  assert.ok(calls() > callsBefore, 'the AL2 disjunct ran — the verifier was consulted');

  const after = await handles.operator.readChain(recordId);
  assert.equal(after.length, before.length + 1);
  assert.equal(after.at(-1)?.kind, 'refused');
  assert.deepEqual(after.at(-1)?.payload, { code: 'chain-compromise' });
  // Sound only after exactly ONE refusing call — a second would mint another sidecar entry
  // against a digest that never lands. See deferral-register row 22.
  const entries = await signatures.listByRecord(recordId);
  assert.equal(entries.length, after.length, 'the compromise edge is itself signed');
});

test('decline on a NON-declaring leg over a signature-broken chain appends the compromise edge rather than throwing — rung (1) beats the declaration gate', async () => {
  // The signature-broken half of the corner the Finding E adjudication pinned hash-broken at
  // both twins. Over an INTACT chain this call throws (the declaration gate); over a broken
  // one rung (1) refuses first and control never reaches that gate.
  const profile: ConfirmProfile = {
    ...captureProfile({ id: 'test.enf.nodecline.v1' }), // no decline declared
    signing: true,
  };
  const { handles, signatures, calls } = enforceableSigningSetup([profile]);
  const recordId = await openRecord(handles, CONTENT, 'test.enf.nodecline.v1', 'subject:enf-10');
  await breakOneSignature(signatures, recordId);

  const before = await handles.operator.readChain(recordId);
  assert.equal(verifyChain(before).intact, true, 'fixture: hash-intact, signature-broken');
  const callsBefore = calls();

  // No throw here is the whole point.
  const out = await handles.operator.decline(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.notEqual(out.transitionRef, undefined);
  assert.ok(calls() > callsBefore, 'the AL2 disjunct ran');

  const after = await handles.operator.readChain(recordId);
  assert.equal(after.length, before.length + 1);
  assert.equal(after.at(-1)?.kind, 'refused');
});
```

- [ ] **Step 2: Run the two tests**

Run: `./node_modules/.bin/vitest run packages/record/test/signing-enforce.test.ts`
Expected: PASS. These pin existing behavior — a probe confirmed all of it before this plan was written — so a failure here means the fixture is wrong, not the library.

If the first test fails on `verifyChain(before).intact`, the fixture accidentally broke the hash chain instead of the signature. Check that `breakOneSignature` was called and that nothing tampered a payload.

- [ ] **Step 3: MUTATION PROOF — neuter the AL2 disjunct**

Temporarily edit `packages/record/src/kernel/decline.ts:78`, replacing:

```ts
  if (!report.intact || !(await signatureLayerHolds(ctx, chain))) {
```

with:

```ts
  if (!report.intact) {
```

Run: `./node_modules/.bin/vitest run`
Expected: EXACTLY the two tests added in Step 1 fail, and nothing else. Record the failing test names.

If other tests fail, the mutation reached more than intended. If ZERO tests fail, the new tests are not exercising the disjunct and must be fixed before proceeding.

- [ ] **Step 4: Revert the mutation**

Run: `git checkout packages/record/src/kernel/decline.ts && git diff --stat`
Expected: no output from `git diff --stat` for that file. **Do not proceed until the revert is confirmed** — this plan permits no `src/` edit outside Task 8.

- [ ] **Step 5: Gates and commit**

Subject: `AL2 signature-enforcement coverage 2/9: decline's rung (1) gains its AL2 pin`

Record the mutation-proof result in the commit message body.

---

### Task 3: Row 20 — decline's rung-(1)-beats-rung-(2) adjacent pair

**Files:**
- Modify: `packages/record/test/decline.test.ts:249-319` (the ladder-order test — insert a new first block)

**Interfaces:**
- Consumes: `tamperNonLast`, `storeNext`, `MemoryStore`, `captureProfile`, `makeConfig`, `openRecord`, `identity`, `facts`, `CONTENT`, `CHECKER`, `DIGEST` — all already imported by that file.

- [ ] **Step 1: Write the failing block**

Insert as the FIRST block inside the existing `test('decline ladder order: each rung wins over the one after it (adjacent pairs)', ...)` body, before the existing `// (3) identity beats (3.5) SoD` block:

```ts
  {
    // (1) chain-verify beats (2) state/expiry: a BROKEN chain on a record that is also
    // past its ttl. Rung (2) would refuse leg-expired; rung (1) refuses chain-compromise
    // first. Every other seam ladder in this package pins its own rung-(1) pair; this is
    // decline's.
    const profile = captureProfile({ decline: true, ttl: 60 });
    let nowMs = Date.parse('2026-08-21T00:00:00Z');
    const handles = createWithClock(makeConfig([profile]), () => new Date(nowMs));
    const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
    const genesis = (await handles.operator.readChain(recordId))[0];
    if (genesis === undefined) throw new Error('fixture: genesis exists after openRecord');
    // tamperNonLast needs >= 2 transitions to tamper a NON-last one; the chain right after
    // open() has just the genesis, so a second honestly-chained transition is built by hand
    // onto the real genesis, in this standalone tampered copy only.
    const good = [
      genesis,
      storeNext(genesis, 'consultation-recorded', {
        kind: 'facts' as const,
        checker: CHECKER,
        at: genesis.at,
        payloadDigest: DIGEST,
        verdict: 'pass' as const,
      }),
    ];
    const tamperedStore = new MemoryStore();
    for (const [i, t] of tamperNonLast(good).entries()) {
      await tamperedStore.appendTransition(i === 0 ? null : 'open', t, { nonTerminal: true });
    }
    const h2 = createWithClock(makeConfig([profile], { store: tamperedStore }), () => new Date(nowMs));
    nowMs += 120_000; // past the 60s ttl — rung (2) would fire on an intact chain
    const res = await h2.operator.decline(recordId, identity(), CONTENT, facts());
    assert.equal(res.status, 'refused');
    assert.equal(res.status === 'refused' && res.code, 'chain-compromise');
  }
```

- [ ] **Step 2: Run the test**

Run: `./node_modules/.bin/vitest run packages/record/test/decline.test.ts -t 'ladder order'`
Expected: PASS.

If it refuses `leg-expired` instead, the tampered store was not the one the handles read from — check that `h2` was built over `tamperedStore`.

- [ ] **Step 3: Prove the pair is real — invert the clock advance**

Temporarily move `nowMs += 120_000;` to BEFORE the `const good = [...]` line, so the record is expired at open time. Re-run.
Expected: still `chain-compromise`. This confirms rung (1) wins regardless of when rung (2)'s condition became true.

Then restore the line to its scripted position and re-run to confirm PASS.

- [ ] **Step 4: Gates and commit**

Subject: `AL2 signature-enforcement coverage 3/9: decline's ladder gains its rung-(1) pair`

---

### Task 4: Row 21 — `acknowledge` signature-broken

**Files:**
- Modify: `packages/record/test/signing-enforce.test.ts` (append one test)

**Interfaces:**
- Consumes: `enforceableSigningSetup`, `breakOneSignature`, `verifyChain`.

- [ ] **Step 1: Write the failing test**

The findings-family shared prologue serves both `raiseFinding` and `acknowledge`. `raiseFinding` already has a signature-broken pin in this file; `acknowledge` reaches the same line only hash-broken today.

```ts
test('acknowledge refuses chain-compromise on a signature-broken signing record — the findings prologue reached through its second seam', async () => {
  // kernel/findings-seams.ts's shared rung (1) serves raiseFinding AND acknowledge. The
  // raiseFinding arm above is signature-broken; acknowledge reached this line only over a
  // hash-broken chain until now (deferral-register row 21).
  const base = captureProfile({ id: 'test.enf.ack.v1' });
  const leg = base.legs[0];
  assert.ok(leg !== undefined);
  const profile: ConfirmProfile = {
    ...base,
    signing: true,
    legs: [{ ...leg, ackMode: 'any', requiredAcks: ['variance'] }],
  };
  const { handles, signatures, calls } = enforceableSigningSetup([profile]);
  const recordId = await openRecord(handles, CONTENT, 'test.enf.ack.v1', 'subject:enf-11');
  await breakOneSignature(signatures, recordId);

  const before = await handles.operator.readChain(recordId);
  assert.equal(verifyChain(before).intact, true, 'fixture: hash-intact, signature-broken');
  const callsBefore = calls();

  const out = await handles.operator.acknowledge(
    recordId,
    { findingId: 'f-1', findingDigest: `sha256:${'1'.repeat(64)}` },
    identity(),
  );
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.notEqual(out.transitionRef, undefined, 'an open record admits the edge');
  assert.ok(calls() > callsBefore, 'the AL2 disjunct ran');

  const after = await handles.operator.readChain(recordId);
  assert.equal(after.length, before.length + 1);
  assert.equal(after.at(-1)?.kind, 'refused');
  // Sound only after exactly ONE refusing call — see deferral-register row 22.
  const entries = await signatures.listByRecord(recordId);
  assert.equal(entries.length, after.length, 'the compromise edge is itself signed');
});
```

- [ ] **Step 2: Run it**

Run: `./node_modules/.bin/vitest run packages/record/test/signing-enforce.test.ts -t 'acknowledge refuses'`
Expected: PASS.

- [ ] **Step 3: Gates and commit**

Subject: `AL2 signature-enforcement coverage 4/9: acknowledge's signature-broken pin`

---

### Task 5: Row 21 — the four token-seam cells

**Files:**
- Modify: `packages/record/test/signing-enforce.test.ts` (append two tests, four cells)

**Interfaces:**
- Consumes: `enforceableSigningSetup`, `breakOneSignature`, `verifyChain`, `SqliteStore` from `../src/store/sqlite.js` (check the exact specifier with `grep -n "SqliteStore" packages/record/test/redeem.test.ts` and copy it).

**Design note for the implementer:** all four cells were confirmed constructible by probe. The `redeeming` state that `completeRedemption` needs is reached by running `beginRedemption` CLEAN first and breaking a signature only afterwards.

- [ ] **Step 1: Write the un-enlisted test**

```ts
test('beginRedemption and completeRedemption refuse chain-compromise on a signature-broken signing record, un-enlisted — both append the edge', async () => {
  // kernel/redeem.ts:224's shared prologue serves all THREE redemption seams. Only direct
  // redeem() had signature coverage; the two token seams reached this line hash-broken only
  // (deferral-register row 21).
  const profile: ConfirmProfile = {
    ...effectSeamProfile({ id: 'test.enf.token.v1' }),
    signing: true,
  };

  // (a) beginRedemption
  {
    const { handles, signatures, calls } = enforceableSigningSetup([profile]);
    const recordId = await openRecord(handles, CONTENT, 'test.enf.token.v1', 'subject:enf-12');
    const fin = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(fin.status, 'ok');
    await breakOneSignature(signatures, recordId);
    const before = await handles.operator.readChain(recordId);
    assert.equal(verifyChain(before).intact, true, 'fixture: hash-intact, signature-broken');
    const callsBefore = calls();

    const out = await handles.operator.beginRedemption(recordId, CONTENT);
    assert.equal(out.status, 'refused');
    if (out.status !== 'refused') return;
    assert.equal(out.code, 'chain-compromise');
    assert.notEqual(out.transitionRef, undefined, 'un-enlisted: the edge appended');
    assert.ok(calls() > callsBefore, 'the AL2 disjunct ran');
    const after = await handles.operator.readChain(recordId);
    assert.equal(after.length, before.length + 1);
    assert.equal(after.at(-1)?.kind, 'refused');
  }

  // (c) completeRedemption — the token is issued CLEAN first, then a signature is broken,
  // which is what makes the `redeeming` state reachable at all.
  {
    const { handles, signatures, calls } = enforceableSigningSetup([profile]);
    const recordId = await openRecord(handles, CONTENT, 'test.enf.token.v1', 'subject:enf-13');
    const fin = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(fin.status, 'ok');
    const begun = await handles.operator.beginRedemption(recordId, CONTENT);
    assert.equal(begun.status, 'ok');
    if (begun.status !== 'ok') return;
    const token = begun.value.token;
    await breakOneSignature(signatures, recordId);
    const before = await handles.operator.readChain(recordId);
    assert.equal(verifyChain(before).intact, true, 'fixture: hash-intact, signature-broken');
    const callsBefore = calls();

    const out = await handles.operator.completeRedemption(recordId, token, CONTENT);
    assert.equal(out.status, 'refused');
    if (out.status !== 'refused') return;
    assert.equal(out.code, 'chain-compromise');
    assert.notEqual(out.transitionRef, undefined, 'un-enlisted: the edge appended');
    assert.ok(calls() > callsBefore, 'the AL2 disjunct ran');
    const after = await handles.operator.readChain(recordId);
    assert.equal(after.length, before.length + 1);
    assert.equal(after.at(-1)?.kind, 'refused');
  }
});
```

**If `begun.value.token` is not the accessor:** run `grep -n "beginRedemption" packages/record/test/redeem-token.test.ts | head` and copy the shape that file uses.

- [ ] **Step 2: Write the enlisted test**

```ts
test('beginRedemption and completeRedemption refuse chain-compromise on a signature-broken signing record, ENLISTED — no edge, host transaction intact', async () => {
  // The enlisted branch (kernel/redeem.ts:225) never routes through appendChainCompromise:
  // that append would BEGIN a second transaction on the host's own connection, and enlisting
  // the evidence edge would let a host rollback erase tampering evidence. So the outcome is
  // result-first with no edge, and the host's transaction must survive intact.
  const profile: ConfirmProfile = {
    ...effectSeamProfile({ id: 'test.enf.token.tx.v1' }),
    signing: true,
  };

  // (b) beginRedemption, enlisted
  {
    const sqlite = new SqliteStore(':memory:');
    const { handles, signatures } = enforceableSigningSetup([profile], { store: sqlite });
    const recordId = await openRecord(handles, CONTENT, 'test.enf.token.tx.v1', 'subject:enf-14');
    const fin = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(fin.status, 'ok');
    await breakOneSignature(signatures, recordId);
    const before = await sqlite.readChain(recordId);

    sqlite.database.exec('BEGIN IMMEDIATE');
    const out = await handles.operator.beginRedemption(recordId, CONTENT, { tx: sqlite.database });
    assert.equal(sqlite.database.isTransaction, true, "the host's transaction is still open");
    sqlite.database.exec('ROLLBACK'); // must not throw — the connection is clean and usable

    assert.equal(out.status, 'refused');
    if (out.status !== 'refused') return;
    assert.equal(out.code, 'chain-compromise');
    assert.equal(out.transitionRef, undefined, 'no edge — the append was never attempted');
    assert.deepEqual(await sqlite.readChain(recordId), before, 'the chain is unchanged');
  }

  // (d) completeRedemption, enlisted
  {
    const sqlite = new SqliteStore(':memory:');
    const { handles, signatures } = enforceableSigningSetup([profile], { store: sqlite });
    const recordId = await openRecord(handles, CONTENT, 'test.enf.token.tx.v1', 'subject:enf-15');
    const fin = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(fin.status, 'ok');
    const begun = await handles.operator.beginRedemption(recordId, CONTENT);
    assert.equal(begun.status, 'ok');
    if (begun.status !== 'ok') return;
    const token = begun.value.token;
    await breakOneSignature(signatures, recordId);
    const before = await sqlite.readChain(recordId);

    sqlite.database.exec('BEGIN IMMEDIATE');
    const out = await handles.operator.completeRedemption(recordId, token, CONTENT, {
      tx: sqlite.database,
    });
    assert.equal(sqlite.database.isTransaction, true, "the host's transaction is still open");
    sqlite.database.exec('ROLLBACK');

    assert.equal(out.status, 'refused');
    if (out.status !== 'refused') return;
    assert.equal(out.code, 'chain-compromise');
    assert.equal(out.transitionRef, undefined, 'no edge — the append was never attempted');
    assert.deepEqual(await sqlite.readChain(recordId), before, 'the chain is unchanged');
  }
});
```

- [ ] **Step 3: Run both**

Run: `./node_modules/.bin/vitest run packages/record/test/signing-enforce.test.ts`
Expected: PASS.

- [ ] **Step 4: MUTATION PROOF — neuter the enlisted branch**

Temporarily change `packages/record/src/kernel/redeem.ts:225` from `if (tx !== undefined) {` to `if (false) {`.

Run: `./node_modules/.bin/vitest run`
Expected: the enlisted test from Step 2 fails (it will now attempt an append inside the host transaction), alongside the pre-existing enlisted tests in `redeem-token.test.ts` and `redeem.test.ts`. Record which.

- [ ] **Step 5: Revert the mutation**

Run: `git checkout packages/record/src/kernel/redeem.ts && git diff --stat`
Expected: no output for that file. **Do not proceed until confirmed.**

- [ ] **Step 6: Gates and commit**

Subject: `AL2 signature-enforcement coverage 5/9: the token seams, both enlistment postures`

---

### Task 6: Row 21 — the five assertion-depth deepenings

**Files:**
- Modify: `packages/record/test/signing-enforce.test.ts` at five places (lines shift as you edit — locate by text, never by number)

**Interfaces:** Consumes nothing new.

**CRITICAL:** the five sites take TWO different models. Sites 1-3 append; sites 4-5 append nothing anywhere.

- [ ] **Step 1: Site 1 — the `seal` arm**

Locate `const sealed = await a.handles.operator.seal(sealTarget);`. Replace the one-line guard that follows with:

```ts
  assert.equal(sealed.status, 'refused');
  if (sealed.status !== 'refused') return;
  assert.equal(sealed.code, 'chain-compromise');
  const sealChain = await a.handles.operator.readChain(sealTarget);
  assert.equal(sealChain.at(-1)?.kind, 'refused', 'seal appends the compromise edge');
  // Sound only after exactly ONE refusing call — see deferral-register row 22.
  const sealEntries = await a.signatures.listByRecord(sealTarget);
  assert.equal(sealEntries.length, sealChain.length, 'the compromise edge is itself signed');
```

- [ ] **Step 2: Site 2 — the `raiseFinding` arm**

Locate `const raised = await b.handles.operator.raiseFinding(`. Replace the one-line guard after it with:

```ts
  assert.equal(raised.status, 'refused');
  if (raised.status !== 'refused') return;
  assert.equal(raised.code, 'chain-compromise');
  const raiseChain = await b.handles.operator.readChain(flowId);
  assert.equal(raiseChain.at(-1)?.kind, 'refused', 'raiseFinding appends the compromise edge');
  // OFF BY ONE ON PURPOSE. This arm's break DELETED a sidecar entry rather than tampering it,
  // and the compromise append does not restore the vacated association — so the sidecar
  // carries one fewer entry than the chain has transitions.
  const raiseEntries = await b.signatures.listByRecord(flowId);
  assert.equal(raiseEntries.length, raiseChain.length - 1, 'the deleted entry stays vacated');
```

Note: `const entries` is already bound earlier in this arm — the new names above avoid the collision. Do not reuse `entries`.

- [ ] **Step 3: Site 3 — the un-enlisted `redeem` arm**

Locate `const red = await a.handles.operator.redeem(redeemId, CONTENT);`. Replace the one-line guard with:

```ts
  assert.equal(red.status, 'refused');
  if (red.status !== 'refused') return;
  assert.equal(red.code, 'chain-compromise');
  assert.notEqual(red.transitionRef, undefined, 'un-enlisted redeem appends the edge');
  const redChain = await a.handles.operator.readChain(redeemId);
  assert.equal(redChain.at(-1)?.kind, 'refused');
  // The un-enlisted twin of redeem.test.ts's ENLISTED signature-broken test, which asserts
  // the opposite shape. Asserting both is what pins the split; asserting only codes leaves
  // the two indistinguishable.
```

- [ ] **Step 4: Site 4 — `verifyPriorLegs`, the NO-APPEND model**

Locate `if (successor.status === 'refused') assert.equal(successor.code, 'prior-leg-unverified');`. Before the `open()` call that produces `successor`, add a snapshot:

```ts
  const makerBefore = await handles.operator.readChain(makerId);
```

Then replace the guard with:

```ts
  assert.equal(successor.status, 'refused');
  if (successor.status !== 'refused') return;
  assert.equal(successor.code, 'prior-leg-unverified');
  assert.equal(successor.transitionRef, undefined, 'pre-record: nothing to append to');
  // AND nothing lands on the PRIOR LEG either. A signature-broken prior leg leaves no
  // evidence edge anywhere in the system — the compromised chain it just rejected is not
  // marked. That is the shape this assertion exists to state.
  assert.deepEqual(
    await handles.operator.readChain(makerId),
    makerBefore,
    'the prior leg chain is untouched — no edge anywhere',
  );
```

- [ ] **Step 5: Site 5 — `verifySupersedes`, the NO-APPEND model**

Locate `if (recovered.status === 'refused') assert.equal(recovered.code, 'supersedes-unverified');`. Before the `open()` call producing `recovered`, add:

```ts
  const predBefore = await b.handles.operator.readChain(predId);
```

Then replace the guard with:

```ts
  assert.equal(recovered.status, 'refused');
  if (recovered.status !== 'refused') return;
  assert.equal(recovered.code, 'supersedes-unverified');
  assert.equal(recovered.transitionRef, undefined, 'pre-record: nothing to append to');
  assert.deepEqual(
    await b.handles.operator.readChain(predId),
    predBefore,
    'the superseded predecessor chain is untouched — no edge anywhere',
  );
```

- [ ] **Step 6: Run the file**

Run: `./node_modules/.bin/vitest run packages/record/test/signing-enforce.test.ts`
Expected: PASS. If Site 2 fails on an off-by-one, re-read its comment — the assertion is `- 1` on purpose. If it fails the OTHER way (equal, not one fewer), the deleted-entry fixture changed and the assertion should be re-derived from the run, not guessed.

- [ ] **Step 7: Gates and commit**

Subject: `AL2 signature-enforcement coverage 6/9: five refusal-code sites gain their edge shapes`

---

### Task 7: The site census

**Files:**
- Create: `packages/record/test/signature-enforcement-sites.test.ts`

**Do NOT place this in `packages/record/test/byte-regression/`** — `coverage.test.ts` there concatenates every sibling `*.test.ts` into its corpus, and this file's quoted names would silently satisfy its tripwire.

- [ ] **Step 1: Write the census test**

```ts
// @vidimera/record — signature-enforcement-sites.test.ts: the claim the AL2 enforcement
// surface rests on, asserted rather than stated — `signatureLayerHolds` has exactly these
// seven call sites, and every one of them has a signature-broken pin somewhere in this
// package. An EIGHTH site added later fails this test until it is listed here.
//
// It proves NAMING, not coverage. The check is a source-text scan: it greps
// packages/record/src for lines that CALL `signatureLayerHolds` and compares the set of
// files against the list below. It cannot tell whether a listed site's test still asserts
// anything — gut a pin and this stays green. Its whole value is the tripwire: decline.ts's
// own site sat uncovered across three increments precisely because nothing failed when it
// appeared. A useful guard against a new site; never evidence that an old one is sound.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';

/** The seven files that CALL `signatureLayerHolds`, one call each. */
const SITES = [
  'decline.ts',
  'finalize.ts',
  'findings-seams.ts',
  'prior-legs.ts',
  'redeem.ts',
  'seal.ts',
  'supersedes.ts',
] as const;

/** Every `*.ts` under `dir`, recursively, as absolute paths. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

test('signature enforcement: signatureLayerHolds has exactly the seven call sites listed here', () => {
  const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
  const calling: string[] = [];
  for (const file of sourceFiles(srcRoot)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    // A CALL, not a mention: the name followed by '(' — which excludes every backticked
    // reference in a comment — and not the declaration line, which is the one `function`
    // form that also carries a '('.
    const calls = lines.some(
      (line) => line.includes('signatureLayerHolds(') && !line.includes('function'),
    );
    if (calls) calling.push(file.split(/[\\/]/).at(-1) ?? file);
  }
  assert.deepEqual(
    calling.sort(),
    [...SITES].sort(),
    'a signatureLayerHolds call site appeared or vanished — add its signature-broken pin, then update SITES',
  );
});
```

- [ ] **Step 2: Run it**

Run: `./node_modules/.bin/vitest run packages/record/test/signature-enforcement-sites.test.ts`
Expected: PASS.

If it fails listing an extra file, read that file — either it is a real new call site needing a pin, or the match caught a comment and the filter needs tightening.

- [ ] **Step 3: Prove the tripwire fires**

The scan is textual, so a comment is enough to trip it and nothing needs to compile. Temporarily add this single line at the top of `packages/record/src/chain/replay.ts` (any `src/` file not in `SITES` works; `replay.ts` is convenient because it is nowhere near the seams):

```ts
// signatureLayerHolds(ctx, chain) — tripwire probe, to be reverted
```

Run: `./node_modules/.bin/vitest run packages/record/test/signature-enforcement-sites.test.ts`
Expected: FAIL, with the deepEqual naming `replay.ts` as an extra entry.

This is the assertion that matters most in the whole task: it proves the census would actually have caught decline.ts's site on the day it appeared, rather than merely restating a list.

Then revert: `git checkout packages/record/src && git diff --stat` — expected no output. **Do not proceed until confirmed.**

- [ ] **Step 4: Gates and commit**

Subject: `AL2 signature-enforcement coverage 7/9: the call-site census`

---

### Task 8: The one source comment, and the analysis record

**Files:**
- Modify: `packages/record/src/kernel/redeem.ts:186-188` (THE ONLY `src/` EDIT IN THIS PLAN)
- Modify: `docs/analysis/2026-08-23-signature-enforcement-coverage.md`

- [ ] **Step 1: Correct the stale comment**

Replace `packages/record/src/kernel/redeem.ts` lines 186-188:

```
 *       re-decided. ENLISTED callers (tx !== undefined — today
 *       only direct redeem carries tx) refuse result-first with NO edge: see the comment
 *       in place below. Un-enlisted callers append the edge via appendChainCompromise.
```

with:

```
 *       re-decided. ENLISTED callers (tx !== undefined — all three redemption seams carry
 *       it, riding `opts.tx` since the effect-result increment) refuse result-first with NO
 *       edge: see the comment in place below. Un-enlisted callers append the edge via
 *       appendChainCompromise.
```

The dated "today" is dropped deliberately: it is a claim with a shelf life and no way to fail loudly. The sibling comments at `redeem.ts:441` and `:554` already carry the corrected wording, so this matches their voice.

- [ ] **Step 2: Verify the edit is comment-only**

Run: `git diff packages/record/src/kernel/redeem.ts`
Expected: only lines beginning with ` *` changed. If any code line appears in the diff, revert and redo.

- [ ] **Step 3: Correct the analysis record's three stale line pins**

`docs/analysis/2026-08-23-signature-enforcement-coverage.md` cites `findings-seams.test.ts:190` at two places (its Finding B paragraph and its deferred-tests section) and `findings-seams.test.ts:229` at one. Commit `536fdba` inserted 73 lines above them, so line 190 is now the corner test that commit added and the prologue test moved.

First, re-derive the true numbers against the tree as it stands AFTER Tasks 1-7:

```bash
grep -n "test('the prologue: chain-compromise outranks everything" packages/record/test/findings-seams.test.ts
grep -n "test('a NON-declaring leg over a HASH-BROKEN chain" packages/record/test/findings-seams.test.ts
```

Then update each citation to the number you just read, and add a short parenthetical at the first one noting the pins were re-derived at this increment. **Do not copy the numbers from this plan** — earlier tasks may have shifted them again.

- [ ] **Step 4: Append the orphan-growth section**

Append this to `docs/analysis/2026-08-23-signature-enforcement-coverage.md`, verbatim:

```markdown
## Finding F — orphan sidecar growth on the no-edge path, recorded 2026-08-23

**A later act than the audit above, found while closing rows 20 and 21 rather than by the
original sweep.** It is recorded here so rows 20, 21 and 22 all point at one document.

`appendChainCompromise` (`packages/record/src/kernel/finalize.ts`) builds its `refused`
transition fresh on every call, stamping `at` from the clock. The signing decorator signs
before delegating to the store, and `MemorySignatureStore.put` is keyed by
`transitionDigest` — so a new timestamp is a new key, not an upsert. On a record whose state
admits no CAS candidate the append never lands, and the sidecar keeps the entry anyway.

Measured, not inferred. A sealed signing record with one broken signature, driven through six
consecutive refusing `finalize()` calls:

| clock | sidecar entries after each call | chain |
|---|---|---|
| default (wall) | 6, 7, 8, 9, 10, 11 | 5, 5, 5, 5, 5, 5 |
| fixed instant | 6, 6, 6, 6, 6, 6 | 5, 5, 5, 5, 5, 5 |

The contrast isolates the cause: the only thing differing between the runs is the clock. Under
a fixed instant every call re-signs byte-identical bytes and upserts one key; under a real one
each call mints a fresh orphan. A sealed record's chain can never grow again, so nothing bounds
the accumulation. Each refusing call also performs one signing operation per CAS candidate —
three, on the fixture above — where the answer is statically known to be "no edge can land".

**Stated with its limit, which is the honest part.** This is not a soundness defect.
`verifySignatures` and `signatureLayerHolds` both walk the CHAIN and look each transition's
digest up in the sidecar; the reverse direction is never traversed, so an entry with no chain
counterpart is never visited and cannot make the layer report a false verdict. It cannot fail
open. What it costs is storage, observability, and wasted signing work — on a host whose
`Signer` is a remote key service, three round-trips per refused seam call.

The enlisted redemption branch is exempt: it refuses result-first and never routes through the
append at all.

**Unmeasured, and named as such:** behavior on a durable `SignatureStore` backing. The probe
covered the in-memory reference backing only, and the durable case is where "unbounded" would
actually matter.

**Not fixed here, and recorded as register row 22 instead.** The containment either
special-cases a path five call sites share, or reopens the sign-before-append ordering the
signing decorator pins deliberately — and inverting that order would reintroduce exactly the
landed-but-unsigned transition the AL2 enforcement increment made fail closed. That is its own
increment with its own design, not a change to make in passing while closing a coverage row.
```

- [ ] **Step 5: Gates and commit**

Subject: `AL2 signature-enforcement coverage 8/9: the stale tx comment, and the orphan-growth finding`

---

### Task 9: Register bookkeeping, the record, and the exit

**Files:**
- Modify: `docs/process/deferral-register.md`, `docs/process/next-phases.md`, `docs/process/release-checklist.md`, `docs/process/implementation-status.md`, `docs/superpowers/INDEX.md`, `CLAUDE.md`

- [ ] **Step 1: Derive row 22's number**

Run:

```bash
grep -rnoE "register row [0-9]+|row [0-9]+" docs/process/ docs/superpowers/ CLAUDE.md | grep -oE "[0-9]+$" | sort -n | tail -1
```

Expected: `21`. So the new row takes 22. **State in the row's own text which number was taken and why**, exactly as rows 19, 20 and 21 each do.

- [ ] **Step 2: Retire rows 20 and 21 from the register**

DELETE both rows from the table in `docs/process/deferral-register.md`. The header's own rule: "An entry leaves this table only when the behavior lands or the deferral is explicitly retired. Numbers are stable identifiers, not positions: a gap is an entry that has left." Leave the numbering gap.

- [ ] **Step 3: Write row 22**

Add to the register table. Trigger, verbatim — it names a PROMPTING event, never the work's own completion, which is the error row 20 made twice:

> The first increment that changes the signing decorator's sign-before-append ordering or `appendChainCompromise`'s candidate walk, or that adds a durable `SignatureStore` backing beyond `MemorySignatureStore` — or the 0.1 cut, whichever lands first.

- [ ] **Step 4: Mirror row 22's trigger verbatim into three more files**

The trigger text appears in FOUR files and they must move together — editing one and not the others is the standing trap here and has already required two consecutive fix commits. Write it into:

- `docs/process/deferral-register.md` (canonical, done in Step 3)
- `docs/process/next-phases.md` — the "What gates the next cut" paragraph
- `docs/process/release-checklist.md` — a new disposition checkbox
- `docs/process/implementation-status.md` — the "Still outstanding" bullet

Then verify byte-identity across all four (whitespace-normalized):

```bash
grep -rn "sign-before-append ordering" docs/process/ | wc -l
```

Expected: 4.

- [ ] **Step 5: Remove rows 20 and 21 from the three mirrors**

`docs/process/next-phases.md`'s gate paragraph, `docs/process/release-checklist.md`'s two disposition checkboxes, and `docs/process/implementation-status.md`'s two "Still outstanding" bullets each carry row 20's ~800-word trigger paragraph and row 21's trigger. Replace them with retirement accounts in the house form: a `### <topic> — register row N, retired 2026-08-23` section in `next-phases.md` carrying **What done would look like** and **Done, 2026-08-23 (the AL2 signature-enforcement coverage increment)**, and a `RETIRED 2026-08-23` bullet in `implementation-status.md` noting "Kept here as the record; the register carries the numbering gap".

Update the gate list: FOUR rows gated the 0.1 cut; now rows 1, 19 and 22 do.

- [ ] **Step 6: Write the increment section in `implementation-status.md`**

Follow the house shape: an `## Post-build-order increment — AL2 signature-enforcement coverage` heading; an ordinal + exit-status + commit-range paragraph naming the design and plan paths; **The gap this closed.**; **What landed.** with a per-file bullet list; **The coverage proof.** naming the mutation proofs actually run and their results; **The honest limit** — the census proves naming, not testing, and every break in this increment is a tampered genesis entry; **What stays outside, and why** — including why the orphan growth takes a row rather than a fix; **Cuts.**; and **Gate outputs, as measured against this increment's own exit commit**.

Record explicitly: this increment landed no behavior and moved no maturity marker; its single `src/` edit is comment-only, proved by diff.

- [ ] **Step 7: Move the live figures — and ONLY the live one**

`implementation-status.md` carries the test figures THREE times and only ONE moves. Locate the `**Measured against the current tree**` bullet BY TEXT, never by line number (the pin has drifted before). Move its file count, its test count, and the Biome figure on the following line. The other two hits sit under `**Gate outputs, as measured against this increment's own exit commit**` headings, are pinned to past commits, and MUST be left byte-identical.

Update the same sentence in `CLAUDE.md`.

Read the real numbers from `./node_modules/.bin/vitest run` and `./node_modules/.bin/biome check .`. Do not predict them.

- [ ] **Step 8: Verify the INDEX row (already written)**

`docs/superpowers/INDEX.md` was completed when this plan file landed — `docs-index-sync` gates tracked files, so the row, the `plans/` count (33 → 34) and the removal of the temporary "plan pending" explanation all had to happen in that same commit. Nothing to write here; just confirm:

```bash
node scripts/docs-index-sync.mjs
```

Expected: exit 0, no output. If it reports `count-mismatch`, a spec or plan was added or removed since and the counts need re-deriving from `git ls-files`.

- [ ] **Step 9: Prove the frozen files never moved**

```bash
git diff 89e44ae -- packages/record/test/byte-stability.test.ts
git diff 89e44ae -- packages/record/test/helpers/signing.ts
```

Expected: the first produces NO output. The second shows only appended exports and import-block additions — no change inside `signingSetup`'s own body.

Also confirm the only `src/` change in the whole increment is the comment:

```bash
git diff 89e44ae --stat -- packages/record/src/
```

Expected: exactly one file, `kernel/redeem.ts`, and a diff containing only ` *` comment lines.

- [ ] **Step 10: Full gates, zero skips**

Run every gate from Global Constraints. Record the outputs verbatim for the increment section's gate block.

- [ ] **Step 11: Commit**

Subject: `AL2 signature-enforcement coverage 9/9: rows 20 and 21 retired, row 22 opened, the record lands the exit`

---

## Self-review notes

**Spec coverage.** Every section of the spec maps to a task: the rig (§"The rig") → Task 1; row 20's three pins (§"What lands") → Tasks 2-3; Finding C's five cells → Tasks 4-5; Finding D's five deepenings → Task 6; the census (§"The census test", ruling 3) → Task 7; the single `src/` comment edit and the analysis record → Task 8; row 22, the retirements and the exit (§"Row 22's trigger", §"Exit") → Task 9. The spec's ruling 1 (frozen `signingSetup`) is enforced by Task 1 Steps 1 and 8 and re-proved at Task 9 Step 9; ruling 2 (delta not total) is a Global Constraint and appears in every test that uses the counter; ruling 5 (bounded to what the rows name) is why no task adds an unnamed grid cell.

**Two things the implementer must not "fix".** Task 6 Step 2's assertion is `chain.length - 1` on purpose — that arm's fixture DELETED a sidecar entry. And Tasks 2-3's corner tests assert an APPEND on a non-declaring leg, which is the adjudicated ruling, not a contradiction of the declaration gate's message.

**Line numbers in this plan are indicative.** Tasks 1-7 shift them. Every task after the first locates its edit site by quoted text. Task 8 Step 3 explicitly re-derives the numbers it writes down rather than copying them from here.

**Figures are not predicted anywhere.** The plan never states what the suite total will be; Task 9 Step 7 reads it off the tree.
