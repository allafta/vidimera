# No-Edge Containment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close deferral-register row 22's redundant-signing half by minting one signature per transition instead of one per CAS candidate, drop the one compromise-append candidate C3 can never admit, and land the divergence fixture that proves why the orphan half cannot be closed the same way.

**Architecture:** Task 1 builds the counting rig, the baselines the fix inverts, and the divergence fixture — which carries a BINDING STOP, because it is the only thing in the tree that can tell an implementer a chain-predicted bar is unsafe, and its result is what re-scoped this increment. Task 2 lands the outcome-preserving narrowing in `packages/record/src/kernel/finalize.ts` and repairs the comments that describe the walk. Task 3 lands the signer-result memo in `packages/record/src/signing/decorate.ts`, which is what actually closes 22b. Task 4 re-scopes row 22 — 22b retired on behavior, 22a left open on the third horn — and writes the record.

**Tech Stack:** TypeScript (NodeNext, strict), ESM, vitest 4, Biome. Node 22.16+ floor; `@vidimera/record` keeps zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-08-24-no-edge-containment-design.md`

## Global Constraints

- **NO SANCTION IS NEEDED AND NONE IS SOUGHT.** No task edits `docs/concept/`. No maturity marker moves. The narrowing drops only a candidate C3 can never admit, so every seam outcome is byte-identical on every shape. **If a change appears to require a `docs/concept/` edit, STOP** — that is the signal that you have drifted from the narrowing back toward the rejected precheck.
- **THE REJECTED DESIGN, NAMED SO IT IS NOT REBUILT.** An earlier draft of this increment proposed a chain-local admissibility precheck that returned before building anything whenever the read chain looked terminal or carried a `sealed` transition. It was MEASURED to suppress a compromise evidence edge that lands today, because C3 and C4 are decided against the backing's persisted row while the precheck read the chain — and on the SQL backing those are different tables. **Do not reintroduce it.** It needs a fresh sanction through `docs/concept/SCOPING-GUIDE.md` §§1–2 and a stated trade.
- **THE PERMITTED `src/` ENVELOPE, as a STOP.** Behavior changes land in exactly two files: `packages/record/src/kernel/finalize.ts` and `packages/record/src/signing/decorate.ts`. Comment-only repairs land in the files Task 2 Step 8 names. **Any other `packages/*/src/` edit is a STOP.**
- **THIS INCREMENT IS THIRD OF THREE AND BOTH PREDECESSORS MUST HAVE LANDED.** Confirm before Task 1:
  ```bash
  grep -c "CONTAINMENT INVENTORY" docs/process/deferral-register.md   # row-22 truth repairs: must print 1
  grep -c "AN IMPLEMENTER MUST TOLERATE ORPHANS" packages/record/src/signing/store.ts  # sidecar contract: must print 1
  ```
  The first correct the row this increment re-scopes; the second states the orphan obligation this increment leaves standing, and with 22a not closing here that obligation has to be on the record before another increment reasons about orphans.
- **A GREEN SUITE IS A NULL RESULT HERE, AND THE PLAN IS BUILT AROUND THAT.** Every corpus tamper is payload-only with kinds intact, so no existing fixture produces read-chain/persisted-state divergence; nothing asserts a signer-invocation count anywhere; nothing pins whether a no-edge refusal mints an orphan in either direction. The rejected precheck passed the whole record project. So did a compensating removal measured to strip signatures from 94 of 100 confirmed records — with its new branch counted at ZERO firings. **"737 tests still pass" is never evidence of safety in this increment.** Each behavior change gets a temporary firing counter, counted and recorded, then removed.
- **`packages/record/test/byte-stability.test.ts` is FROZEN** (`CONTRIBUTING.md` hard rule 4, `.github/CODEOWNERS`) — asserted green, never edited, proved byte-identical by `git diff` at exit. Verified safe: its four literals cover `opened`, two `consultation-recorded` and `confirmed` — no `refused`; its only flow throws on any refusal; and it declares no signing block. **The distinction to hold precisely:** a `refused` transition IS byte-pinned, in `packages/record/test/byte-regression/terminal-refusals.test.ts`, but that is an ordinary content-drift refusal appended via `refuseMaybeAppend` — a path this increment does not touch.
- **THE TWO REPLAY-THROWS PINS ARE THE TRIPWIRE.** `packages/record/test/redeem-token.test.ts`'s genesis-KIND-tamper pin (replay throws, the static list is walked, `redeeming` lands the edge WITH a transitionRef) and its non-throwing twin (replay yields `redeeming`). Both must stay green **unedited**. If either needs editing, the narrowing is wrong — STOP.
- **`codeOnlyPatterns` runs over every LINE of a tracked `.ts` file**, comments and string literals included. Forbidden in anything you write into one: the bare word for a design document (only "by design" is excluded), the bare word for a work slice, `Task <n>`, `<that word> §<n>`, `OQ<n>-<n>`, foreign labels (`M-A`, `S-3`, `O11`, `T1.2`), and 7–40-char hex commit refs. **Never write "Task 2" or "per the ruling in the design" into a source comment.**
- **Keep every citation adjacent to its quotation.** Only an optional possessive and ONE sub-reference token (`C\d+`, `#\d+`, `§N`, `reads`, `says`) may sit between a `SPEC §N` citation and its quotation; anything else silently de-gates the quotation while the scan stays green.
- **Do not cite SPEC as enumerating the no-edge states — it does not, uniformly.** §5, §8 and §12's C3 each name a different subset, and none names `redeemed` or `redemption-failed`, though §2 states both terminal. Note also that §8 carries no maturity marker at its heading, so do not describe it as `[PROVEN]`. The five-state set is DERIVED.
- **C3 and C4 do not live in `store/semantics.ts`.** That file carries C3's carve-out predicate and the kind-to-state map; the GATES are in the backings and the normative text is SPEC §12. **Re-derive the backing line numbers yourself before citing any** — the previous draft of this plan cited four that were wrong.
- **Everything you paste must be Biome-formatted before it is committed.** Run `./node_modules/.bin/biome check --write .` after pasting any block, then re-read the diff.
- **Gates at every commit — never call `pnpm`** (the global shim is broken on this machine): `./node_modules/.bin/vitest run`, `./node_modules/.bin/tsc --noEmit -p packages/record` AND `-p packages/store-postgres`, `./node_modules/.bin/biome check .`, `node scripts/contract-scan.mjs` exit 0, `node scripts/api-reference-sync.mjs` exit 0, `node scripts/docs-index-sync.mjs` exit 0.
- Commit messages via `git commit -F <msgfile>` where the message file is written with the **Write tool** — PowerShell `Set-Content` prepends a BOM. Verify the branch is attached before each commit. **Never push.**
- Commit subjects follow the increment convention: `No-edge containment N/4: <what landed>`.

---

### Task 1: The rig, the baselines, and the divergence fixture with its binding STOP

Nothing in the corpus combines a signing profile with a no-edge shape: the only two no-edge tests, in `packages/record/test/chain-verify.test.ts` (the C3-forced already-expired corner) and `packages/record/test/seal.test.ts` (the C4 already-sealed corner), both build from `captureProfile()` with no `signing: true` and no `config.signing`, so the decorator never wraps their store.

**Files:**
- Create: `packages/record/test/no-edge-containment.test.ts`

**Interfaces:**
- Consumes: `captureProfile`, `makeConfig` from `packages/record/test/helpers/profiles.ts`; `TamperingStore` from `packages/record/test/helpers/stores.ts`; `create`, `MemoryStore`, `MemorySignatureStore` and the `node:crypto` Ed25519 primitives.
- Produces: `countingSigningSetup(extraProfiles?, opts?)` returning `{ handles, signatures, store, signerCalls, putCalls }`, used by Tasks 2 and 3.

- [ ] **Step 1: Verify the premise before writing anything.**

```bash
grep -c "CONTAINMENT INVENTORY" docs/process/deferral-register.md
grep -rn "signCount\|signerCalls\|signCalls" packages/record/src packages/record/test | wc -l
./node_modules/.bin/vitest run --project record 2>&1 | tail -5
```
Expected: `1`; `0` — **nothing in the corpus counts signer invocations, so this pin is genuinely new**; and the record project's file and test totals. **Write those totals down — every later step compares against them, and no number written in this plan may be used in their place.**

- [ ] **Step 2: Write the counting rig.**

Give the file a header stating what it pins and, in the same breath, what it cannot: the corpus asserted no signer count before this file and pinned orphan minting in neither direction, so these numbers are the first of their kind and a green suite proves nothing about them on its own.

```ts
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { SignatureStore, Signer, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Store } from '../src/store/store.js';
import { captureProfile, makeConfig } from './helpers/profiles.js';

function countingSigningSetup(
  extraProfiles: ConfirmProfile[] = [],
  opts: { store?: Store } = {},
) {
  const store = opts.store ?? new MemoryStore();
  const signatures = new MemorySignatureStore();
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  let signerCalls = 0;
  let putCalls = 0;
  const signer: Signer = async (bytes) => {
    signerCalls += 1;
    return { keyRef: 'key-1', signature: edSign(null, bytes, privateKey).toString('base64') };
  };
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  const counted: SignatureStore = {
    put: async (entry) => {
      putCalls += 1;
      return signatures.put(entry);
    },
    listByRecord: (recordId) => signatures.listByRecord(recordId),
  };
  const profiles: ConfirmProfile[] = [
    { ...captureProfile({ id: 'test.noedge.v1' }), signing: true },
    ...extraProfiles.map((p) => ({ ...p, signing: true as const })),
  ];
  const config = {
    ...makeConfig(profiles, { store }),
    signing: { signer, verifiers: { 'key-1': verifier }, signatures: counted },
  };
  return {
    handles: create(config),
    signatures,
    store,
    signerCalls: () => signerCalls,
    putCalls: () => putCalls,
  };
}
```

Three things this shape exists for, all of which the previous draft got wrong: `create()` returns `{ agent, operator }`, so it must be nested under `handles` — the house rig does the same; the `store` parameter is what lets Tasks 1 and 3 inject a `TamperingStore`; and `extraProfiles` must have `signing` stamped onto it, or a profile handed in is not a signing profile and the decorator never signs it.

- [ ] **Step 3: Write the BASELINE measurements as passing tests.**

These assert today's behavior and will be inverted later; that inversion is the proof the change did something. **Measure every number — do not copy one from this plan.** Build each shape step by step and assert the chain length you actually observe after each call, because the fixture recipe determines it.

  - **The sealed no-edge corner.** Drive a record to sealed under a signing profile, break one sidecar signature, then call `finalize()` six times. Assert: the chain length is constant; the sidecar grows by exactly one per call; `signerCalls()` rises by a fixed amount per call (derive it from the deduped candidate list and then confirm it); every refusal is `refused` / `chain-compromise` with `transitionRef` undefined.
  - **The already-refused corner.** Break one signature and `finalize()` once — assert the edge LANDS (chain grows by one, `transitionRef` present) — then call three more times, asserting the sidecar grows by one each time and `signerCalls()` by the four-candidate amount, because the replayed state is now `refused`.
  - **The candidate arithmetic.** Assert the sealed fixture yields THREE signer calls per refusing call, not four: `sealed` is a transition kind, `replay`'s `case 'sealed'` leaves `state` untouched, so the folded state is `confirmed` and the deduped list collapses to three.

- [ ] **Step 4: Build the divergence fixture. This is the task's real obligation.**

The narrowing fires on the folded state; C3 and C4 are decided against the backing's persisted row. Construct both shapes and record what happens TODAY, using the corpus's `TamperingStore` idiom. Both must be **length-preserving**, so C2's seq check still passes — a fabricated extra append is not the shape that matters:

```ts
const tampering = new TamperingStore(inner, recordId, (chain) => {
  const t = structuredClone(chain);
  const head = t[t.length - 1];
  if (head === undefined) throw new Error('fixture: chain has a head');
  t[t.length - 1] = { ...head, kind: 'refused', payload: { code: 'chain-compromise' } };
  return t;
});
```

and its sibling with `kind: 'sealed', payload: { chainHead: head.prevHash }`. The record underneath must be persisted `confirmed` and terminal.

**STOP CONDITION, binding.** If either divergence shape lands an edge WITH a `transitionRef` today, then a bar predicted from the chain would suppress it — a lost compromise evidence edge on the exact population AL2 exists to catch. **Task 2 does not ship anything that predicts a bar from the chain.** The narrowing in Task 2 is safe because it drops only the candidate whose CAS could match a record whose persisted state equals the folded one, and for that record C3 bars the edge; if you find yourself widening it to the other three candidates, STOP.

Mark both tests as recording today's answer, and mark them as tests that **must not change** in Tasks 2 and 3.

- [ ] **Step 5: Gates.**

```bash
./node_modules/.bin/vitest run
./node_modules/.bin/tsc --noEmit -p packages/record && ./node_modules/.bin/tsc --noEmit -p packages/store-postgres
./node_modules/.bin/biome check .
node scripts/contract-scan.mjs; echo "contract-scan exit=$?"
node scripts/api-reference-sync.mjs; echo "api-sync exit=$?"
node scripts/docs-index-sync.mjs; echo "docs-index-sync exit=$?"
```
The first command runs BOTH projects and boots the embedded Postgres, so its totals are the repo-wide ones — the record project's file count rises by one and its test count by however many cases you wrote, and the store-postgres project is unchanged. **Record both the repo-wide and the record-project figures**, and say which is which.

- [ ] **Step 6: Commit.**

Subject: `No-edge containment 1/4: the counting rig, the baselines the fix inverts, and the divergence fixture`

---

### Task 2: The outcome-preserving narrowing

**Files:**
- Modify: `packages/record/src/kernel/finalize.ts` (`appendChainCompromise`'s candidate computation and its doc comment)
- Modify: the comment sites Step 8 names, after verifying each
- Modify: `packages/record/test/no-edge-containment.test.ts`

**Interfaces:**
- Consumes: `countingSigningSetup` from Task 1.
- Produces: no new exported name. `appendChainCompromise`'s signature is unchanged.

- [ ] **Step 1: Write the failing test.**

The narrowing removes exactly one CAS attempt — and therefore one signer call and one `put` — on a refusing call whose folded state is terminal. Assert that count drop on the already-refused corner (four candidates becomes three). Assert also that the refusal is byte-identical: `refused`, `chain-compromise`, `transitionRef` undefined. **Do not assert the sidecar stops growing — it does not.** That is 22a, and this increment does not close it.

- [ ] **Step 2: Run it to verify it fails.**

Run: `./node_modules/.bin/vitest run --project record packages/record/test/no-edge-containment.test.ts`
Expected: the new count test FAILS; every Task 1 test still PASSES.

- [ ] **Step 3: Establish the state set from source, not from this plan.**

```bash
sed -n '1,50p' packages/record/src/nonterminal.ts
grep -n "export type RecordState" -A 12 packages/record/src/types.ts
```
`nonTerminal(state: RecordState, isFinalLeg: boolean, effectSeam: boolean)` takes a `RecordState`; `finalize.ts`'s `nonTerminal('refused', false, false)` passes the RecordState `'refused'`, which merely shares a spelling with a TransitionKind. So the set IS expressible as `!nonTerminal(replayed, true, true)` — with both flags true the function returns true for exactly `open`, `confirmed` and `redeeming`. **The constant below is preferred anyway, for a different reason:** `as const satisfies Record<RecordState, boolean>` makes a new `RecordState` member fail the BUILD here, where a bare call would silently classify it as non-barred. Confirm the exact members and spellings before writing it; if the union differs from the eight assumed here, use what you read.

- [ ] **Step 4: Add the state constant.**

Above `appendChainCompromise`:

```ts
/**
 * The states out of which no `refused` edge can leave — exactly `RecordState` minus the three
 * producible CAS targets the candidate walk tries. C3 bars a state-leaving `refused` append out
 * of a terminal record, and the compromise carve-out admits only an expected `confirmed` or
 * `redeeming`, so for a record whose persisted state is one of these five the same-state
 * candidate can never win its CAS.
 *
 * Written as a `satisfies`-checked record rather than a bare set on purpose: adding a member to
 * `RecordState` then fails the build here, instead of silently classifying it as admissible.
 */
const NO_EDGE_STATE = {
  refused: true,
  expired: true,
  declined: true,
  redeemed: true,
  'redemption-failed': true,
  open: false,
  confirmed: false,
  redeeming: false,
} as const satisfies Record<RecordState, boolean>;
```

- [ ] **Step 5: Narrow the candidate list.**

Replace the `try`/`catch` block that opens `appendChainCompromise` — currently:

```ts
  let candidates: RecordState[];
  try {
    candidates = dedupe([replay(chain).state, 'open', 'confirmed', 'redeeming']);
  } catch {
    // A tampered chain replay cannot fold a state — fall back to the three producible targets.
    candidates = ['open', 'confirmed', 'redeeming'];
  }
```

with:

```ts
  let candidates: RecordState[];
  try {
    const replayed = replay(chain).state;
    // --- drop the one candidate C3 can never admit ---------------------------------------
    // When the folded state is terminal, the same-state candidate is provably dead: its CAS
    // can only match a record whose persisted state equals the folded one, and for such a
    // record C3 bars a state-leaving `refused` append. Dropping it saves one signed CAS
    // attempt per refusing call and cannot change any outcome.
    //
    // The three producible targets are deliberately NOT dropped, and that is the load-bearing
    // limit. They are adjudicated by the backing against its OWN persisted row, which the read
    // chain does not determine — and the chain reaching this function failed verification by
    // construction. On the SQL backing `readChain` reads the transitions table while the C3
    // and C4 gates read the records row, so a tamper that rewrites a transition leaves the
    // persisted state untouched and the two diverge. Measured: a last-element kind rewrite
    // over a record persisted `confirmed` folds to `refused` on read, and the walk still lands
    // the edge through C3's carve-out. A bar predicted from the chain would suppress it.
    candidates = NO_EDGE_STATE[replayed]
      ? ['open', 'confirmed', 'redeeming']
      : dedupe([replayed, 'open', 'confirmed', 'redeeming']);
  } catch {
    // A tampered chain replay cannot fold a state — fall back to the three producible targets.
    // The narrowing above is deliberately INSIDE the try: with no folded state there is nothing
    // to narrow, and skipping it structurally keeps the fallback walk exactly as it was.
    candidates = ['open', 'confirmed', 'redeeming'];
  }
```

- [ ] **Step 6: Run the tests.**

Run: `./node_modules/.bin/vitest run --project record`
Expected: the Step 1 test passes; the Task 1 already-refused baseline now fails on its signer count and is updated to record the old figure as "before" alongside the new one; **the two divergence tests must be UNCHANGED and still passing**; the sealed-corner baseline is unchanged, because a sealed record folds to `confirmed`, which is not in `NO_EDGE_STATE`.

**If `packages/record/test/redeem-token.test.ts` fails at all, STOP.**

- [ ] **Step 7: Prove the branch executed.**

Temporarily add `process.stderr.write('NARROWED\n')` on the narrowing arm, run the record project, and count:

```bash
./node_modules/.bin/vitest run --project record 2>&1 | grep -c '^NARROWED$'
```
Expected: NONZERO. Write it down. Then remove the instrumentation and re-run green. **If the count is zero, the new test is not reaching the branch and the task is unproven** — that is the failure mode measured on a rejected candidate, which passed the whole suite without executing one line of itself.

- [ ] **Step 8: Verify the comment inventory site by site, THEN repair.**

Do not trust this list; check each before editing, because the previous draft of this plan miscounted which comments carry which clause.

```bash
grep -n "mint another sidecar entry\|row 22" packages/record/test/signing-enforce.test.ts
grep -n "walks candidate CAS targets\|fallback" packages/record/src/refusal-codes.ts packages/record/src/outcome.ts
sed -n '1,20p' packages/record/src/signing/decorate.ts
```

Then repair, in this commit: `appendChainCompromise`'s own doc comment, which describes the no-edge corner in several places and is the only place in the tree that enumerates the no-edge shapes — bring its enumeration into line with `NO_EDGE_STATE` and say the set is derived from terminality plus C3's bar, not quoted from a sealed list; `refusal-codes.ts`'s and `outcome.ts`'s descriptions of the fallback walk, which stay outcome-true and gain the fact that a terminal-folded record now tries three candidates rather than four; and each `signing-enforce.test.ts` cardinality comment that actually carries the "a second would mint another sidecar entry" clause. **Leave the decorator's own header alone in this task** — its orphan-harmlessness argument is untouched by the narrowing, and Task 3 is where that file is opened.

**Do not annotate the unannotated cardinality assertion yet.** Its hazard is unchanged by this task: a no-edge refusal still mints one orphan per call. Annotate it in Task 4 with the correct, still-live hazard, not with a claim that the hazard is gone.

- [ ] **Step 9: Gates and commit.** The Task 1 Step 5 battery, all green. Then:

Subject: `No-edge containment 2/4: the dead candidate dropped, the divergence recorded at the site`

---

### Task 3: The signer-result memo — the change that actually closes 22b

**Files:**
- Modify: `packages/record/src/signing/decorate.ts`
- Modify: `packages/record/test/no-edge-containment.test.ts`

**Interfaces:**
- Consumes: `countingSigningSetup` from Task 1, with an injected store where a fixture needs one.
- Produces: no new exported name. `withSigning`'s signature is unchanged.

- [ ] **Step 1: Write the failing tests.** Four, and the last two are the safety argument rather than the saving.

  - **The saving on the compromise walk.** A refusing call makes ONE signer invocation where it made three, while `putCalls()` is unchanged and the sidecar contents are byte-identical. **Build this fixture with `countingSigningSetup`** — the corpus's replay-throws fixture is non-signing and its scaffolding is file-local, so it cannot be reused here.
  - **`open()`'s expire-then-retry.** A C1 exclusivity retry makes ONE signer invocation where it made two, because `open()` passes the same `openedTransition` object to both genesis appends.
  - **The put always runs.** With a `SignatureStore` whose `put` no-ops on its FIRST call only, the landed transition still ends up signed. This is the measured difference between the shape that ships and the digest-keyed shape that does not.
  - **The ordering invariant holds.** With an event-recording store and signer, assert no `appendTransition` is ever observed before a `put` for that transition has COMPLETED. Record the event sequence and assert on the sequence, not on a boolean.

- [ ] **Step 2: Run them to verify they fail.** Expected: the two count tests fail; the two invariant tests PASS already, because today's code satisfies them. Say so explicitly in the test comments — a safety test that was already green is still worth having, because it is exactly what a future digest-keyed rewrite would break.

- [ ] **Step 3: Add the memo.**

`signing/decorate.ts` already binds the name `memo` for the recordId-signs lookup. Declare the new one beside it, at `withSigning` scope — **not inside `signOne`, where it would be recreated per invocation and memoize nothing.**

```ts
  // One signer invocation per transition OBJECT, not per append attempt. Two call paths hand
  // the SAME transition object to `appendTransition` more than once: the compromise append's
  // candidate walk, and open()'s expire-then-retry. The bytes are identical, so the signature
  // is identical and the sidecar upserts one key either way — the repeat buys nothing and, on
  // a host whose signer is a remote key service, costs a round-trip each time.
  //
  // Keyed by object identity, NOT by digest, and it memoizes the SIGNER's promise, not this
  // function's. A digest-keyed memo would weaken the pinned guarantee from "this append is
  // preceded by its OWN completed sidecar write" to "some earlier signing operation for this
  // digest happened", which lands an unsigned transition whenever the earlier entry is no
  // longer there. Memoizing this function's own promise would skip the `put` on every repeat
  // and reach the same place. So the `put` ALWAYS runs, and only the mint is shared; storing
  // the in-flight promise means two concurrent appends of one object await one mint rather
  // than racing.
  const signerResult = new WeakMap<Transition, Promise<{ keyRef: string; signature: string }>>();
```

and replace `signOne` with:

```ts
  async function signOne(transition: Transition): Promise<void> {
    let pending = signerResult.get(transition);
    if (pending === undefined) {
      pending = signing.signer(encodeTransition(transition));
      signerResult.set(transition, pending);
    }
    let minted: { keyRef: string; signature: string };
    try {
      minted = await pending;
    } catch (err) {
      // A failed mint must not be remembered: the next attempt has to reach the signer again.
      signerResult.delete(transition);
      throw err;
    }
    await signing.signatures.put({
      transitionDigest: transitionDigest(transition),
      recordId: transition.recordId,
      seq: transition.seq,
      keyRef: minted.keyRef,
      signature: minted.signature,
    });
  }
```

- [ ] **Step 4: Run the tests.** Expected: all four pass; the record project green. **`packages/record/test/signing.test.ts`'s throwing-signer order test must still pass** — it pins that a failed mint leaves the append unlanded, which is why the `catch` deletes the memo entry before rethrowing. Confirm both awaiters of a rejected shared promise see the rejection.

- [ ] **Step 5: Prove the memo engaged.** Same discipline as Task 2 Step 7: temporarily instrument the memo-hit path, count firings across the record project, require nonzero, record the number, remove, re-run green.

- [ ] **Step 6: Pin the digest-stability assumption the memo introduces.**

The memo pairs a signature minted over the object's bytes at FIRST-MINT time with a `transitionDigest` recomputed at every `put`. That is sound only because the transition object is not mutated between attempts, and nothing in the type system enforces it. Write a test that mutates a transition object between two appends and asserts the mismatch is caught — or, if the shape proves unconstructible through the public seams, say so in a comment at the memo and record it in Task 4. **Do not leave the assumption unstated.**

- [ ] **Step 7: Do not assert what a `WeakMap` cannot expose.**

A `WeakMap` has no size, so "it holds nothing" is a garbage-collection argument and not a reading. Write the comment saying that plainly, and pin only what is observable: that driving N distinct transitions through the decorator produces N mints and N puts, with no growth in any structure the test can inspect. **Do not write an assertion against a `Map` the test builds itself** — that is a fact about the test's own scaffolding.

- [ ] **Step 8: Gates and commit.** The Task 1 Step 5 battery, all green. Then:

Subject: `No-edge containment 3/4: the signer-result memo — one mint per transition, the put unchanged`

---

### Task 4: Row 22 re-scoped, the record, and the exit

**Files:**
- Modify: `docs/process/deferral-register.md` (row 22 re-scoped — 22b removed, 22a retained)
- Modify: `docs/process/next-phases.md`, `docs/process/release-checklist.md`, `docs/process/implementation-status.md`
- Modify: `CLAUDE.md` (the State paragraph's test-count figures AND the live-deferral-rows sentence)
- Modify: `packages/record/test/signing-enforce.test.ts` (the unannotated cardinality assertion)

**Interfaces:**
- Consumes: the measured figures from Tasks 1, 2 and 3, including both firing counts.
- Produces: nothing.

- [ ] **Step 1: Confirm which half of the trigger fired, in writing.**

The restated trigger names "the first increment that changes `appendChainCompromise`'s candidate walk, the signing decorator's `signOne`, or the order in which the decorator's append seams sign and delegate". This increment did the first two. Quote the trigger and name the two commits. **That discharges the trigger for 22b only.** 22a's containment did not land and its own trigger must be re-derived, not inherited.

- [ ] **Step 2: Re-scope the row.**

Row 22 stays in the table. Remove 22b's body and its inventory entry for the memo; state that 22b closed on behavior at this increment with the commit named; keep 22a's body, its measurements, the third horn, and the rejected families. **Write 22a's own trigger fresh** — the disjuncts that fired are spent, and what remains must name a prompting event for the orphan half specifically: a durable `SignatureStore` backing, publication, or the 0.1 cut. Derive nothing from the old text by copying.

- [ ] **Step 3: Mirror the re-scoping everywhere, including outside `docs/process/`.**

```bash
grep -rn "row 22\|Row 22" CLAUDE.md docs/ packages/
```
Every hit must describe the row as it now is. Two that a `docs/process/`-scoped sweep would miss: `CLAUDE.md`'s live-deferral-rows sentence, which names row 22 and its old title; and the cardinality comments in `packages/record/test/signing-enforce.test.ts` that cite the row. **Expect hits that are correct as they stand** — the coverage increment's historical sections and the truth-repair increment's own record describe the row as it was on the day they were written, and per the tier discipline they are not rewritten. List them and say why each is left.

- [ ] **Step 4: Annotate the unannotated cardinality assertion.**

`packages/record/test/signing-enforce.test.ts`'s first test asserts sidecar cardinality after a refusing call with no comment. Annotate it to match its siblings — and state the hazard as it is **after** this increment: a second refusing call still mints another sidecar entry, because 22a is not closed. Verify the sibling wording before copying it.

- [ ] **Step 5: Move the count sentences — and only the present-tense ones.**

```bash
grep -rn "test files\|tests, zero skips\|files checked" CLAUDE.md docs/process/implementation-status.md | head -20
```
Classify every hit. `CLAUDE.md`'s State paragraph and `implementation-status.md`'s `**Measured against the current tree**` bullet are PRESENT-TENSE and move to the figures measured at Task 3's gate run. Every hit under a `**Gate outputs, as measured against this increment's own exit commit**` heading is pinned to a past commit and **stays byte-identical**. Re-measure the Biome file count from actual output rather than incrementing by hand.

- [ ] **Step 6: Write the increment section.** Beyond the standard paragraphs it must record:

  - **That the increment was re-scoped before implementation, and why.** The chain-local precheck it originally proposed was measured to suppress a compromise evidence edge that lands today. That finding, and the divergence fixture that now pins it, are the increment's most durable output.
  - **Both firing counts, with their nonzero controls**, and why they are in the record: the corpus asserted no signer count and pinned orphan minting in neither direction, so the suite could not have noticed this change had it been wrong.
  - **What the divergence fixture found**, including whether either shape turned out unconstructible.
  - **What is NOT closed**: 22a, and why every measured containment for it takes the third horn.
  - **The rejected families with their measurements** — the digest-keyed de-dup and compensating removal — so a later author does not rediscover them.
  - **The digest-stability assumption** from Task 3 Step 6, and how it was pinned or why it could not be.

- [ ] **Step 7: Prove the frozen oracle and the envelope.**

Tasks 1, 2 and 3 have each committed once, so the pre-increment baseline is `HEAD~3` at this point — this step runs BEFORE Task 4's own commit.

```bash
git diff HEAD~3 --stat -- packages/record/test/byte-stability.test.ts ; echo "empty means untouched"
git diff HEAD~3 --name-only -- 'packages/*/src/*'
```
Expected: no output from the first. The second must list exactly the files the envelope permits — `kernel/finalize.ts`, `signing/decorate.ts`, and whichever comment-only files Task 2 Step 8 verified. Any other path is a STOP.

- [ ] **Step 8: Full gates, commit, and discharge the explicit-proposal condition.**

Subject: `No-edge containment 4/4: 22b closed on behavior, 22a re-scoped on the third horn`

Then write the PR description — or a note in this commit's body — naming every `docs/process/` file touched, what changed in each and why, per `CONTRIBUTING.md`'s requirement that `implementation-status.md` edits be proposed explicitly rather than slipped in.

---

## Self-review notes

- **Spec coverage.** Design ruling 1 (precheck not taken) → Global Constraints' named-rejection bullet and Task 1 Step 4's STOP; ruling 2 (the narrowing) → Task 2 Step 5; ruling 3 (derived state set) → Task 2 Step 3; ruling 4 (constant not call) → Task 2 Step 4; ruling 5 (skip on replay throw) → Task 2 Step 5's `try` placement plus the tripwire; rulings 6 and 7 (rejected families) → recorded in Task 4 Step 6, with ruling 6's hazard pinned by Task 3 Step 1's third and fourth tests; ruling 8 (memo shape) → Task 3 Step 3; ruling 9 (fixture first, binding STOP) → Task 1 Step 4; ruling 10 (instrumentation does not ship) → Task 2 Step 7 and Task 3 Step 5; ruling 11 (row re-scoped) → Task 4 Steps 2 and 3.
- **The one thing most likely to be got wrong** is drifting from the narrowing back to the rejected precheck, because the precheck is what actually zeroes the visible cost and the narrowing looks like a half-measure. It is a half-measure. The other half needs a sanction.
- **The second most likely** is the firing counters being skipped as ceremony next to a green suite. They are the only evidence the suite cannot give.
- **Type consistency.** `NO_EDGE_STATE` (Task 2 Steps 4 and 5); `signerResult`, a `WeakMap<Transition, Promise<{ keyRef: string; signature: string }>>` at `withSigning` scope (Task 3 Step 3); `countingSigningSetup(extraProfiles?, opts?)` returning `handles`, `signatures`, `store`, `signerCalls()`, `putCalls()` (Task 1 Step 2), with `handles` nested because `create()` returns `{ agent, operator }`.
- **No figure in this plan may be used as a measurement.** Every count — test totals, signer invocations per call, candidate-list lengths — is measured at the step that needs it. The previous draft carried a corpus census that was arithmetically impossible; that is the standard this plan is held to.
