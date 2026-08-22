# Byte-Regression Pins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every one of the twelve `TransitionKind`s, every conditional payload field, and `deriveStagedRef` at least one absolute byte pin — so that "the frozen byte digests protect the encodings" stops being a false sentence.

**Architecture:** A new test directory, `packages/record/test/byte-regression/`, holding one shared deterministic-seams module and seven pin files, one per capability family. Every literal is harvested by running a red pin and pasting the real value — never computed by hand. `test/byte-stability.test.ts` is not edited, because its four literals are byte-COMPATIBILITY evidence against the implementation this kernel was adopted from and the new ones are SELF-REGRESSION evidence about this repository; the two claims are filed under two headers.

**Tech Stack:** TypeScript (NodeNext, strict), vitest 4, `createWithClock`'s three injectable seams, `MemoryStore`.

**Spec:** `docs/superpowers/specs/2026-08-22-byte-regression-pins-design.md`

## Global Constraints

- **THE TRUTH-REPAIRS INCREMENT LANDS FIRST.** This plan assumes a tree that already carries its repairs and its `docs-index-sync` gate. If `node scripts/docs-index-sync.mjs` does not exist, STOP — run `docs/superpowers/plans/2026-08-22-truth-repairs.md` first.
- **NO SANCTION IS NEEDED AND NONE IS SOUGHT.** No task edits `docs/concept/`. No maturity marker moves. No source file under `packages/*/src/` changes at all — this increment is tests plus one register row plus the record. **If you find yourself editing a `src/` file, STOP: that is a behavior change and it is out of scope.**
- **`packages/record/test/byte-stability.test.ts` IS FROZEN — not one byte.** Asserted green every task; verified byte-identical by `git diff` at the exit. It must never import `byte-regression/fixtures.ts`, and `fixtures.ts` must never import from it. `CONTRIBUTING.md` hard rule 4; `.github/CODEOWNERS`.
- **Harvest-then-pin, always.** Write the pin with placeholder literals (`'sha256:PLACEHOLDER-0'` …), run it, read the real digests out of the failure diff, paste them verbatim. **Never** compute a digest by hand, and never write a literal you did not read out of a failing run.
- **A pin freezes whatever is there, including a bug.** Every file header must say so: these literals prove non-drift, never correctness.
- **Zero skips.** A family that turns out not to be constructible as scripted is either built or recorded as a deferral with the trigger that un-defers it — never parked with `.skip`.
- **`codeOnlyPatterns` runs over every LINE of a tracked `.ts` file** — test names, `describe` labels and string literals included, which matters across seven new files. Forbidden: the bare word `design` (only "by design" is excluded), the bare word `slice` (a left guard keeps `.slice()` legal), `Task <n>`, `slice <n>`, `OQ<n>-<n>`, `design §<n>`, foreign labels (`M-A`, `S-3`, `O11`, `T1.2`). **Do not name a test "…the design's…" or write "Task 2" in a comment.**
- **Hex literals are a live contract-scan hazard here.** `commitRefPattern` uses lookaheads with a right-guard: it needs a 7–40 hex run followed by a non-word, non-dot character, containing at least one `a-f` AND one digit. A full 64-char `sha256:` digest fails the guard because hex character 41 is still a word character — so a complete digest is safe, and a TRUNCATED one is not. **Never shorten a digest for readability**, and never write a partial hex fragment in a comment. Verify rather than trust this: `node scripts/contract-scan.mjs` after the first file lands.
- **Everything you paste must be Biome-formatted before it is committed.** Every gate step runs `./node_modules/.bin/biome check .`, `biome.json` enables the formatter, and the code blocks here are written for readability, not to Biome's 100-column and member-chain rules — several lines in Task 2's block exceed the limit as printed. Run `./node_modules/.bin/biome check --write .` after pasting, then re-read the diff.
- **Keep every citation adjacent to its quotation.** `SPEC §N` and `DECISIONS.md #N` citations are resolved; `attributionGapPattern` admits an optional possessive and ONE sub-reference token, nothing more.
- Node floor `>=22.16`; ESM; zero runtime dependencies.
- **Gates at every commit — never call `pnpm`**: `./node_modules/.bin/vitest run` (zero skips), `./node_modules/.bin/tsc --noEmit -p packages/record` AND `-p packages/store-postgres`, `./node_modules/.bin/biome check .`, `node scripts/contract-scan.mjs` exit 0, `node scripts/api-reference-sync.mjs` exit 0, `node scripts/docs-index-sync.mjs` exit 0.
- Commit messages via `git commit -F <msgfile>` written with the **Write tool** (PowerShell `Set-Content` prepends a BOM). Verify the branch before each commit. **Never push.**
- Commit subjects: `Byte-regression pins N/8: <what landed>`.

---

### Task 1: The directory, the shared seams, and the simplest pin

`deriveStagedRef` needs no flow at all, which makes it the right place to establish harvest-then-pin before any chain is involved.

**Files:**
- Create: `packages/record/test/byte-regression/fixtures.ts`
- Create: `packages/record/test/byte-regression/staged-ref.test.ts`

**Interfaces:**
- Produces: `deterministicSeams(prefix: string): { now: () => Date; mintId: () => string; tokenSource: () => string }` and `advanceableSeams(prefix: string): { now; mintId; tokenSource; advance(ms: number): void }`. Every later task consumes one of these two.

- [ ] **Step 1: Confirm the seam shape before writing against it.**

```bash
grep -n "export function createWithClock" -A6 packages/record/src/create.ts
grep -n "export function deriveStagedRef" -A8 packages/record/src/id.ts
```
Expected: `createWithClock(config, now, mintId = mintRecordId, tokenSource = defaultTokenSource)` — four parameters — and `deriveStagedRef(contentDigest, profileId, subjectRef, legId)` returning `digest(canonicalize({ contentDigest, profileId, subjectRef, legId }))`.

- [ ] **Step 2: Write `fixtures.ts`.**

```ts
// @vidimera/record — byte-regression/fixtures.ts: the deterministic seams every pin file
// in this directory drives `createWithClock` with.
//
// THIS DIRECTORY IS NOT THE FROZEN ORACLE. `test/byte-stability.test.ts` pins four
// literals as byte-COMPATIBILITY evidence against the reference implementation this
// kernel was adopted from, and it is never regenerated. The files here pin
// SELF-REGRESSION literals over encodings built in this repository, where there is no
// external implementation to be compatible with, so a mismatch here means THIS
// repository's own bytes moved — a regression to adjudicate, and possibly a legitimate
// one. Neither `CONTRIBUTING.md`'s hard rule 4 nor `.github/CODEOWNERS` names this
// directory; both name the frozen file by exact path. Do not apply either rule here, and
// do not apply this file's posture there.
//
// EDITING THIS FILE MOVES EVERY LITERAL IN THIS DIRECTORY AT ONCE. That is deliberate —
// six private copies would make one fixture edit look like six independent regressions —
// but it means a change here is never a small one.
//
// COMBINATION COVERAGE IS PERMANENTLY OUTSIDE THIS DIRECTORY. Each file pins ONE flow
// through its own feature set, never the cross-product of features. A drift that
// manifests only when two capabilities interact is caught by no literal here, and that is
// a deliberate scope bound, not an omission awaiting a later increment.

/**
 * The three injectable seams `createWithClock` carries. `tokenSource` is not optional
 * decoration: the token digest sits inside the `redeeming` and `redeemed` payloads, so an
 * undetermined token source makes the redemption family unpinnable.
 *
 * `now()` ticks one second per call from a fixed epoch — the same shape the frozen
 * oracle's own seams use, so a flow's `at` bytes depend only on how many times the kernel
 * reads the clock.
 */
export function deterministicSeams(prefix: string): {
  now: () => Date;
  mintId: () => string;
  tokenSource: () => string;
} {
  const seams = advanceableSeams(prefix);
  return { now: seams.now, mintId: seams.mintId, tokenSource: seams.tokenSource };
}

/**
 * The same three seams plus `advance(ms)` — a FOURTH knob, beyond the three the design
 * doc rules on, added because the terminal-refusals family cannot be built without
 * crossing an expiry deadline and a redeeming bound. Inert for every other family.
 * With no `advance` call the clock behaves exactly as `deterministicSeams` does, so the
 * two are interchangeable for a flow that never crosses one.
 */
export function advanceableSeams(prefix: string): {
  now: () => Date;
  mintId: () => string;
  tokenSource: () => string;
  advance: (ms: number) => void;
} {
  const BASE_MS = Date.parse('2026-01-01T00:00:00.000Z');
  let tick = 0;
  let idSeq = 0;
  let tokenSeq = 0;
  let offset = 0;
  return {
    now: () => new Date(BASE_MS + offset + tick++ * 1000),
    mintId: () => `${prefix}-record-${idSeq++}`,
    tokenSource: () => `${prefix}-token-${tokenSeq++}`,
    advance: (ms: number) => {
      offset += ms;
    },
  };
}
```

- [ ] **Step 3: Write the `deriveStagedRef` pin with a placeholder literal.**

Create `packages/record/test/byte-regression/staged-ref.test.ts`:

```ts
// @vidimera/record — byte-regression/staged-ref.test.ts: an absolute pin on
// `deriveStagedRef`, which keys `Store.putStaged` and is not a transition, so no chain
// digest reaches it. `test/content-binding.test.ts` covers idempotence and collision
// resistance across recomputations; it asserts no literal value, and neither does any
// other file. A change to the canonicalized input shape would move every staged
// reference in existence, silently, and this literal is the only thing that would notice.
//
// SELF-REGRESSION PIN, not a compatibility pin: this proves the value has not drifted
// since it was harvested here. It does not prove the value is correct. See
// `byte-regression/fixtures.ts` for the posture this whole directory takes.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { canonicalize, digest } from '../../src/canonical.js';
import { deriveStagedRef } from '../../src/id.js';

const CONTENT_DIGEST = digest(canonicalize({ subject: 'week-1', total: 40 }));
const PROFILE_ID = 'byte-regression.staged-ref.v1';
const SUBJECT_REF = 'subject:byte-regression-staged-ref';
const LEG_ID = 'approver-decide';

// Harvest-then-pin: run once with the placeholder, read the real value out of the failure
// diff, paste it here verbatim. Do not compute it by hand.
const PINNED_STAGED_REF = 'sha256:PLACEHOLDER-STAGED-REF';

test('byte-regression: deriveStagedRef matches its pinned literal', () => {
  assert.equal(deriveStagedRef(CONTENT_DIGEST, PROFILE_ID, SUBJECT_REF, LEG_ID), PINNED_STAGED_REF);
});

test('byte-regression: the pinned contentDigest input is itself stable', () => {
  assert.equal(CONTENT_DIGEST, digest(canonicalize({ subject: 'week-1', total: 40 })));
});
```

- [ ] **Step 4: Run it and watch it fail. This is the harvest.**

```bash
./node_modules/.bin/vitest run packages/record/test/byte-regression/staged-ref.test.ts
```
Expected: FAIL on the first test, with an actual value of the form `sha256:<64 hex chars>`. Copy that value verbatim into `PINNED_STAGED_REF`. **Paste the whole digest — never truncate it.**

- [ ] **Step 5: Re-run to green.**

```bash
./node_modules/.bin/vitest run packages/record/test/byte-regression/staged-ref.test.ts
```
Expected: 2 tests, both passing.

- [ ] **Step 6: Gates and commit.**

Full battery. `contract-scan` matters here: it now reads two new tracked `.ts` files line by line. Then commit.

Subject: `Byte-regression pins 1/8: the directory, the shared seams, and deriveStagedRef's first literal`

---

### Task 2: The feature-declaring confirm — `policyDigest` and `proposedDigest`

Same three kinds as the frozen oracle, different payload. That is the point: the oracle's flow declares no conditional-payload feature, so these two fields have never been inside a frozen literal.

**Files:**
- Create: `packages/record/test/byte-regression/confirm-declaring.test.ts`

**Interfaces:**
- Consumes: `deterministicSeams` from `./fixtures.js`.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Confirm both option shapes.**

```bash
grep -n "policyDigest\|proposed?" packages/record/src/config.ts | head
grep -n "policySource" packages/record/src/config.ts | head -3
```
Also run `grep -n "policySource !== undefined" -A12 packages/record/src/kernel/finalize.ts`.

Expected: `OpenOptions.policyDigest?: Digest` and `OpenOptions.proposed?: { stagedRef: string }`; `ConfirmProfile.policySource?: string`. `policyDigest` binds only when the profile declares `policySource` — that is the OPEN-side half of the contract. The RECIPROCAL half is at `kernel/finalize.ts`: on a policy-declaring profile, `finalize()` **throws** (a caller error, not a refusal) when `opts.policy` is absent, and throws again on a non-declaring profile when it IS present. So a declaring profile obliges the flow to pass `{ policy: { digest: POLICY_DIGEST } }` as `finalize`'s fifth argument, with the SAME digest bound at `open()` — rung (4.5) compares them and refuses `policy-drift` if they differ.

- [ ] **Step 2: Write the pin with placeholders.**

The flow: stage a proposal draft, stage the decided content, `open()` with BOTH `policyDigest` and `proposed`, then finalize. The profile declares `policySource` so `policyDigest` binds.

```ts
// @vidimera/record — byte-regression/confirm-declaring.test.ts: an absolute pin on a
// confirm chain whose genesis carries the two open-time conditional fields —
// `policyDigest` (SPEC §10.3, bound when the profile declares a policy source) and
// `proposedDigest` (SPEC §9's provenance option, bound from a resolved staged draft).
// The frozen oracle's own flow declares neither, so neither has ever been inside an
// absolute literal.
//
// SELF-REGRESSION PIN. A mismatch means this repository's encoding of these payloads
// moved; it is not evidence of divergence from any external implementation, and it does
// not prove the encoding is correct. See `byte-regression/fixtures.ts`.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { transitionDigest } from '../../src/chain/encoding.js';
import type { Config, ConfirmProfile } from '../../src/config.js';
import { createWithClock } from '../../src/create.js';
import { MemoryStore } from '../../src/store/memory.js';
import type { IdentityAssertion, Transition } from '../../src/types.js';
import { deterministicSeams } from './fixtures.js';

const CANONICALIZER_REF = 'byte-regression.canonical.v1';
const PROFILE_ID = 'byte-regression.confirm-declaring.v1';
const SUBJECT_REF = 'subject:byte-regression-confirm';
const PROPOSED_CONTENT = { subject: 'week-1', total: 39 };
const DECIDED_CONTENT = { subject: 'week-1', total: 40 };
const POLICY_DIGEST = 'sha256:0000000000000000000000000000000000000000000000000000000000000001';

// The profile is declared inline, never imported from a shared helper: its declarative
// bytes are inside the digests below, through the profile digest written into the
// `opened` payload, so what determines a literal must be readable beside it.
const DECLARING_PROFILE: ConfirmProfile = {
  id: PROFILE_ID,
  subject: { canonicalizerRef: CANONICALIZER_REF },
  legs: [{ id: 'approver-decide', allowedAuthorities: ['session:byte-regression-app'] }],
  captureMode: 'staged',
  expiry: { ttl: 3600 },
  policySource: 'policy:byte-regression-source',
};

function makeConfig(): Config {
  return {
    profiles: [DECLARING_PROFILE],
    store: new MemoryStore(),
    canonicalizers: { [CANONICALIZER_REF]: (content: unknown) => content },
  };
}

function identityAssertion(): IdentityAssertion {
  return {
    principal: 'approver:byte-regression-1',
    authority: 'session:byte-regression-app',
  };
}

function factsArg(): { figures: unknown; checker: IdentityAssertion } {
  return {
    figures: { total: 40, currency: 'SEK' },
    checker: { principal: 'svc:review-surface', authority: 'mtls:review-surface' },
  };
}

// Harvest-then-pin: placeholders first, then paste the values the failure diff reports.
const PINNED_DIGESTS: readonly string[] = [
  'sha256:PLACEHOLDER-0',
  'sha256:PLACEHOLDER-1',
  'sha256:PLACEHOLDER-2',
  'sha256:PLACEHOLDER-3',
];

async function runDeclaringFlow(): Promise<Transition[]> {
  const { now, mintId, tokenSource } = deterministicSeams('byte-regression-confirm');
  const { agent, operator } = createWithClock(makeConfig(), now, mintId, tokenSource);

  const proposal = await agent.stage(PROPOSED_CONTENT, PROFILE_ID, SUBJECT_REF);
  if (proposal.status !== 'ok') throw new Error(`stage(proposal) refused: ${JSON.stringify(proposal)}`);

  const staged = await agent.stage(DECIDED_CONTENT, PROFILE_ID, SUBJECT_REF);
  if (staged.status !== 'ok') throw new Error(`stage(decided) refused: ${JSON.stringify(staged)}`);

  const opened = await operator.open(staged.value.stagedRef, {
    policyDigest: POLICY_DIGEST,
    proposed: { stagedRef: proposal.value.stagedRef },
  });
  if (opened.status !== 'ok') throw new Error(`open() refused: ${JSON.stringify(opened)}`);

  const finalized = await operator.finalize(
    opened.value.recordId,
    identityAssertion(),
    DECIDED_CONTENT,
    factsArg(),
    { policy: { digest: POLICY_DIGEST } },
  );
  if (finalized.status !== 'ok') throw new Error(`finalize() refused: ${JSON.stringify(finalized)}`);

  return operator.readChain(opened.value.recordId);
}

test('byte-regression: the declaring confirm produces the expected kind shape', async () => {
  const chain = await runDeclaringFlow();
  assert.deepEqual(chain.map((t) => t.kind), [
    'opened',
    'consultation-recorded',
    'consultation-recorded',
    'confirmed',
  ]);
});

test('byte-regression: the genesis carries both conditional fields', async () => {
  const chain = await runDeclaringFlow();
  const genesis = chain[0];
  if (genesis === undefined) throw new Error('empty chain');
  const payload = genesis.payload as Record<string, unknown>;
  assert.equal(payload.policyDigest, POLICY_DIGEST);
  assert.ok(typeof payload.proposedDigest === 'string', 'proposedDigest must be bound');
});

test('byte-regression: the declaring confirm chain matches its pinned literals', async () => {
  const chain = await runDeclaringFlow();
  assert.deepEqual(chain.map((t) => transitionDigest(t)), [...PINNED_DIGESTS]);
});
```

- [ ] **Step 3: Run, and read the failure carefully.**

```bash
./node_modules/.bin/vitest run packages/record/test/byte-regression/confirm-declaring.test.ts
```
Two outcomes are both informative:
- The kind-shape test fails → the flow is wrong. Fix the flow before harvesting anything. Do NOT adjust the expected kinds to match what came out.
- Only the literals test fails → harvest. Paste the four reported digests in order.

If `open()` refuses `proposal-mismatch` or similar, the two staged drafts must name the same `(profileId, subjectRef, legId)` — they do here, since both stage under the same profile and subject.

- [ ] **Step 4: Re-run to green.** Expected: 3 tests passing.

- [ ] **Step 5: Gates and commit.**

Subject: `Byte-regression pins 2/8: the declaring confirm — policyDigest and proposedDigest inside a literal`

---

### Task 3: The declined terminal

**Files:**
- Create: `packages/record/test/byte-regression/declined.test.ts`

**Interfaces:**
- Consumes: `deterministicSeams` from `./fixtures.js`.

- [ ] **Step 1: Confirm the declaration and the seam.**

```bash
grep -n "decline?: true" packages/record/src/config.ts
grep -n "  decline(" -A9 packages/record/src/operator-surface.ts
```
Expected: `LegSpec.decline?: true` — a PER-LEG switch, not profile-level — and `decline()`'s parameter list on the operator surface.

- [ ] **Step 2: Write the pin.**

Copy Task 2's file HEADER POSTURE and harvest comment, with these differences: `PROFILE_ID` is `byte-regression.declined.v1`, the seams prefix is `byte-regression-declined`, the leg declares `decline: true`, and the flow calls `operator.decline(...)` in place of `finalize(...)` with the argument list Step 1 printed.

**The profile DROPS `policySource`, and the flow calls the plain `operator.open(staged.value.stagedRef)` with no options bag** — this family pins the decline terminal, not the conditional open-time fields, which Task 2 already covers. Do NOT copy Task 2's `policySource` without also copying its `policyDigest` argument: `kernel/open.ts` fail-closes loudly in BOTH directions.

The expected kind sequence is `['opened', 'consultation-recorded', 'consultation-recorded', 'declined']` — write that into the kind-shape assertion BEFORE the first run, and if the run disagrees, fix the FLOW, never the expectation. Only `sha256:` literals are harvested; a kind sequence that is already known is an assertion, not a harvest.

Header first paragraph:

```ts
// @vidimera/record — byte-regression/declined.test.ts: an absolute pin on a recorded
// human decline (SPEC §9's `open → declined` seam). The `declined` kind has never been
// inside an absolute literal: the frozen oracle's flow ends `confirmed`, and the
// cross-backing comparison is relative, so an encoding change applied to both backings
// leaves it green.
```

- [ ] **Step 3: Run, fix the flow if the kind shape is wrong, then harvest.** Same discipline as Task 2 Step 3.

- [ ] **Step 4: Re-run to green.**

- [ ] **Step 5: Gates and commit.**

Subject: `Byte-regression pins 3/8: the declined terminal gets its first literal`

---

### Task 4: The findings family — `finding-raised` and `acknowledged`

**Files:**
- Create: `packages/record/test/byte-regression/findings.test.ts`

**Interfaces:**
- Consumes: `deterministicSeams` from `./fixtures.js`.

- [ ] **Step 1: Confirm the declaration shape.**

```bash
grep -n "function validateFindingsFlow" -A12 packages/record/src/config.ts
grep -n "export interface FindingInput" -A12 packages/record/src/kernel/findings-seams.ts
grep -n "  raiseFinding(" -A5 packages/record/src/operator-surface.ts
grep -n "  acknowledge(" -A5 packages/record/src/operator-surface.ts
```
Expected: the findings flow is declared **both-or-neither** — a leg must set BOTH `ackMode` and `requiredAcks`, and `requiredAcks` must be a non-empty array of non-empty strings. Declaring one alone is a construction error. And the two input interfaces, whose keys are validated exactly.

- [ ] **Step 2: Write the pin.**

Same structure as Task 2. The leg declares:

```ts
  legs: [
    {
      id: 'approver-decide',
      allowedAuthorities: ['session:byte-regression-app'],
      ackMode: 'any',
      requiredAcks: ['data-quality'],
    },
  ],
```

The flow: stage, open (plain, no options bag — this profile declares no `policySource`), `raiseFinding(...)`, `acknowledge(...)`, then finalize.

Both seams take `(recordId, input, identity)` and both validate their input shape EXACTLY — an unknown key throws rather than refusing. The shapes are `FindingInput { findingId, kind, findingDigest, magnitude? }` and `AckInput { findingId, findingDigest, magnitude? }` — note the ack carries **no** `kind`, and neither carries a `by`; the identity is the third positional argument. Both types are exported from `../../src/kernel/findings-seams.js`. The ack's `findingId` and `findingDigest` must match the finding's, or the ack throws.

The expected kind sequence is `['opened', 'finding-raised', 'acknowledged', 'consultation-recorded', 'consultation-recorded', 'confirmed']` — the two findings appends are mid-lifecycle, between `opened` and the success batch. Write that in BEFORE the first run; if the run disagrees, fix the flow, never the expectation.

Header first paragraph:

```ts
// @vidimera/record — byte-regression/findings.test.ts: an absolute pin on the findings
// write side (SPEC §10.2), the two operator-only mid-lifecycle appends. Neither
// `finding-raised` nor `acknowledged` has ever been inside an absolute literal.
```

- [ ] **Step 3: Run, fix the flow, harvest.**
- [ ] **Step 4: Re-run to green.**
- [ ] **Step 5: Gates and commit.**

Subject: `Byte-regression pins 4/8: the findings write side — finding-raised and acknowledged pinned`

---

### Task 5: The redemption family — `redeeming`, `redeemed`, and `resultDigest`

The one family that genuinely needs `tokenSource`: the token digest sits inside both payloads.

**Files:**
- Create: `packages/record/test/byte-regression/redemption.test.ts`

**Interfaces:**
- Consumes: `deterministicSeams` from `./fixtures.js`.

- [ ] **Step 1: Confirm the declaration and all three seams.**

```bash
grep -n "redeem?: {" -A6 packages/record/src/config.ts
grep -n "  redeem(" -A5 packages/record/src/operator-surface.ts
grep -n "  beginRedemption(" -A9 packages/record/src/operator-surface.ts
grep -n "  completeRedemption(" -A6 packages/record/src/operator-surface.ts
grep -n "export interface RedeemOptions" -A10 packages/record/src/config.ts
```
Expected: `redeem?: { confirmToRedeem?, redeemBound?, reverify?, result?: true }`; the three seams each taking a trailing `opts?: RedeemOptions` carrying `tx?` and `result?`. `redeem.result: true` ADMITS a result digest; it does not require one.

- [ ] **Step 2: Write the pin — TWO chains in one file.**

Chain A, the token shape with a result: profile declares `redeem: { result: true }`; flow is stage → open → finalize → `beginRedemption(...)` → `completeRedemption(...)` supplying a result digest in the options bag. This reaches `redeeming` and `redeemed`, and puts both `tokenDigest` and `resultDigest` inside literals.

Chain B, the direct shape: a second profile id and a second seams prefix, flow stage → open → finalize → `redeem(...)`, reaching `redeemed` with `{ via: 'direct' }`.

Give each chain its own `PINNED_*` array and its own kind-shape test, so a failure names which shape moved. Use a distinct seams prefix per chain (`byte-regression-redeem-token`, `byte-regression-redeem-direct`) so record ids and token values never collide.

Header first paragraph:

```ts
// @vidimera/record — byte-regression/redemption.test.ts: absolute pins on both redemption
// shapes (SPEC §11.2) — the token pair and the co-located direct call — including the
// token digest inside `redeeming`/`redeemed` and the notarized effect result inside
// `redeemed`. The token digest is why this directory's seams carry a fixed token source:
// an undetermined one makes this family unpinnable.
```

- [ ] **Step 3: Assert the payload fields before harvesting.**

Add a test that reads the `redeemed` transition's payload and asserts `resultDigest` is present on chain A and `via` is `'direct'` on chain B. A literal that passes while the field is silently absent would pin the wrong thing — that is the failure mode this whole increment exists to prevent.

- [ ] **Step 4: Run, fix the flows, harvest both arrays.**
- [ ] **Step 5: Re-run to green.**
- [ ] **Step 6: Gates and commit.**

Subject: `Byte-regression pins 5/8: both redemption shapes — tokenDigest and resultDigest inside literals`

---

### Task 6: The terminal refusals — `refused`, `expired`, `sealed`, `redemption-failed`

Three unrelated mechanisms under one header. Name them separately in the file so the header still states one claim.

**Files:**
- Create: `packages/record/test/byte-regression/terminal-refusals.test.ts`

**Interfaces:**
- Consumes: `advanceableSeams` from `./fixtures.js` — this is the family that must cross deadlines.

- [ ] **Step 1: Confirm each mechanism.**

```bash
grep -n "export function appendsOn" -A8 packages/record/src/refusal-codes.ts
grep -n "const kind = win.window === 'redeeming'" -B4 -A4 packages/record/src/kernel/expiry.ts
grep -n "  seal(" -A4 packages/record/src/operator-surface.ts
```
Expected — three distinct facts:
1. `appendsOn` returns true only for a `compromise`-class code or a code the leg lists in `terminalRefusals`. So a `refused` EDGE requires the leg to declare the code it will refuse with.
2. `expired` and `redemption-failed` come from ONE lazy en-passant CAS append in `resolveDueClock`, whose kind depends on whether the pending window is `redeeming`. It must be PROVOKED by calling a seam after the deadline — never called directly.
3. `seal()` caps a derived-terminal record with a state-preserving `sealed` transition.

- [ ] **Step 2: Write FOUR pinned arrays over THREE records** — `sealed` extends the `expired` record rather than minting its own, so it shares that record's profile and seams prefix, and its array is a strict superset of the expired one's literals. That duplication is deliberate, not a copy-paste error: one encoding change moves both arrays, and that is one regression, not two. Say so in the file, so a later reader is not misled.

- **`refused`:** leg declares `terminalRefusals: ['content-drift']`. Stage and open with `DECIDED_CONTENT`, then finalize with DIFFERENT content so the rung-4 recompute refuses `content-drift` — which now appends because the leg declared it. Confirm against `packages/record/test/refusal-matrix.test.ts`'s `content-drift` test for the exact drift setup.
- **`expired`:** profile `expiry: { ttl: 3600 }`. Stage, open, then `advance(3_601_000)` and call `finalize(...)`. The en-passant append lands `expired` and the seam refuses `leg-expired`. Assert the refusal outcome as well as the appended kind.
- **`redemption-failed`:** profile `redeem: { redeemBound: 60 }`. Stage, open, finalize, `beginRedemption(...)` to reach `redeeming`, then `advance(61_000)` and call `completeRedemption(...)` with the correct token. The window resolves `redeeming → redemption-failed` and the seam reports `redemption-timeout`.
- **`sealed`:** any terminal chain — reuse the `expired` one after it terminates — then `seal(...)`.

Each chain gets its own kind-shape test naming the full expected sequence, and its own literals array.

- [ ] **Step 3: Run each chain in isolation first.**

```bash
./node_modules/.bin/vitest run packages/record/test/byte-regression/terminal-refusals.test.ts -t "expired"
```
The clock-driven ones are the likeliest to be scripted wrong. Get every kind-shape test green BEFORE harvesting any literal — a harvested digest over a wrong flow pins the wrong bytes forever, and nothing downstream would catch it.

- [ ] **Step 4: Harvest all four arrays, re-run to green.**
- [ ] **Step 5: Gates and commit.**

Subject: `Byte-regression pins 6/8: the four terminals — refused, expired, sealed, redemption-failed`

---

### Task 7: Multi-leg and recovery — `priorRecordRefs`, `priorLegActors`, `supersedes`

No new kind; three conditional fields that only a multi-record flow reaches.

**Files:**
- Create: `packages/record/test/byte-regression/multi-leg.test.ts`

**Interfaces:**
- Consumes: `deterministicSeams` from `./fixtures.js`.

- [ ] **Step 1: Confirm both mechanisms.**

```bash
grep -n "priorRecordRefs?" -A5 packages/record/src/config.ts
grep -n "supersedes?" -A8 packages/record/src/config.ts
grep -n "export async function verifySupersedes" -A14 packages/record/src/kernel/supersedes.ts
```
Expected: `priorRecordRefs` is one entry per prior leg in leg order on a successor leg's `open()`; `supersedes` is `{ recordId, chainHead }` and `verifySupersedes` requires the predecessor be intact, head-matching, **TERMINAL**, and same-`subjectRef`.

- [ ] **Step 2: Write two chains.**

- **Multi-leg:** a two-leg profile. Run leg 1 to `confirmed`, then `open()` leg 2 with `priorRecordRefs` naming leg 1's record. Leg 2's genesis carries BOTH conditional fields — `open()` binds the verified prior-leg snapshot into the `opened` payload (`kernel/open.ts`), so `priorRecordRefs` AND `priorLegActors` are in the GENESIS; `finalize()` only READS `priorLegActors`, and the success batch's `confirmed` payload carries only `{ actor }`. Note also that the RECORDED `priorRecordRefs` entries are the THREE-field `RecordedPriorLegRef` shape `{ recordId, chainHead, legId }` (`src/types.ts`), while `open()`'s INPUT is the two-field `PriorRecordRef` (`src/config.ts`) — a naive round-trip assertion against the input shape fails. Pin both records' chains, with separate arrays.
- **Recovery:** the predecessor must be a verified TERMINAL record, so this file mints its own rather than borrowing one — the simplest terminal is a `confirmed` record on a single-leg profile with the same `subjectRef`. Then `open()` a fresh record with `supersedes: { recordId, chainHead }` read from that predecessor. Its genesis carries the verified reference.

Use a distinct seams prefix per chain so record ids never collide.

- [ ] **Step 3: Assert the fields are present before harvesting**, as in Task 5 Step 3 — `priorRecordRefs`, `priorLegActors` and `supersedes` all read off the relevant GENESIS payloads (`chain[0].payload`). Do NOT assert `priorLegActors` on a success-batch transition — it is written only into the `opened` payload and would fail there.
- [ ] **Step 4: Run, fix the flows, harvest.**
- [ ] **Step 5: Re-run to green.**
- [ ] **Step 6: Gates and commit.**

Subject: `Byte-regression pins 7/8: multi-leg and recovery — priorRecordRefs, priorLegActors, supersedes`

---

### Task 8: The coverage proof, the register row, the record, and the exit

**Files:**
- Create: `packages/record/test/byte-regression/coverage.test.ts`
- Modify: `docs/process/deferral-register.md`
- Modify: `docs/process/implementation-status.md`
- Modify: `CLAUDE.md` (the test figures)
- Modify: `docs/superpowers/INDEX.md` (the specs/plans COUNTS only — the truth-repairs increment already wrote this increment's row and both its cells; nothing new is added here, but any file this increment adds under `docs/` moves the gated counts)

- [ ] **Step 1: Write the coverage proof.**

The increment's central claim is that every kind is now pinned. Make that claim itself a test rather than a sentence:

```ts
// @vidimera/record — byte-regression/coverage.test.ts: the claim this directory exists to
// make, asserted rather than stated — every `TransitionKind` appears in at least one
// pinned flow here. A new kind added later fails this test until it is pinned too.
//
// It proves MENTION, not coverage and not correctness: it concatenates the sibling test
// files' SOURCE TEXT and checks that each quoted kind name occurs somewhere in it. A name
// in a label, a comment, or a dead constant satisfies it, and no linkage to a `PINNED_`
// array is checked anywhere. A useful tripwire for a newly added kind; not evidence that
// any kind reaches a literal, and never evidence that a literal is right.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';

const ALL_KINDS = [
  'opened',
  'consultation-recorded',
  'confirmed',
  'refused',
  'expired',
  'declined',
  'sealed',
  'finding-raised',
  'acknowledged',
  'redeeming',
  'redeemed',
  'redemption-failed',
] as const;

test('byte-regression: every TransitionKind is named in a pinned flow in this directory', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const corpus = readdirSync(here)
    .filter((f) => f.endsWith('.test.ts') && f !== 'coverage.test.ts')
    .map((f) => readFileSync(join(here, f), 'utf8'))
    .join('\n');
  const missing = ALL_KINDS.filter((kind) => !corpus.includes(`'${kind}'`));
  assert.deepEqual(missing, [], `unpinned kinds: ${missing.join(', ')}`);
});

test('byte-regression: ALL_KINDS matches the union in types.ts', () => {
  const typesPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'types.ts');
  const source = readFileSync(typesPath, 'utf8');
  const union = source.slice(source.indexOf('export type TransitionKind'));
  const declared = [...union.slice(0, union.indexOf(';')).matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
  assert.deepEqual([...ALL_KINDS].sort(), declared.sort());
});
```

- [ ] **Step 2: Run it.**

```bash
./node_modules/.bin/vitest run packages/record/test/byte-regression/coverage.test.ts
```
Expected: 2 passing. A failure on the first test names exactly which kind was missed — go back and pin it. A failure on the second means `TransitionKind` moved and `ALL_KINDS` must follow.

- [ ] **Step 3: Write the deferral-register row for AL2 sidecar pinning.**

This one IS genuine future work with a real trigger, unlike the combination-coverage bound, which takes no row (the design doc argues why). Add a row taking the next number never yet used — read the register's own header first: numbers are stable identifiers and a gap is an entry that has left, so the table's single visible row does NOT tell you the high-water mark. Derive it:

```bash
grep -rnoE "register row [0-9]+|row [0-9]+" docs/process/ docs/superpowers/ CLAUDE.md | grep -oE "[0-9]+$" | sort -n | tail -1
```
Take the next integer above the highest number any document has ever used, and say in the row's own text which number you took and why.

- Deferred item: absolute byte pins over the AL2 detached-signature sidecar. `transitionDigest`'s input is `{recordId, seq, at, kind, payload, prevHash}` — no signature field — so no chain pin reaches a sidecar.
- Trigger: the first increment that changes signature encoding or key handling, or the 0.1 cut — whichever lands first.

- [ ] **Step 4: Update the test figures.**

```bash
./node_modules/.bin/vitest run
grep -n "test files\|tests" CLAUDE.md | head -3
grep -rn "test files" docs/process/implementation-status.md | head -3
```
`implementation-status.md` carries the figures THREE times, and only ONE moves. Line 41's `**Measured against the current tree**` bullet is the present-tense claim — move its file count, its test count, AND the `119 files checked` biome figure on the next line, since this increment adds tracked test files that Biome checks. The other two hits sit under `**Gate outputs, as measured against this increment's own exit commit**` headings, are pinned to past commits, and MUST be left byte-identical. This increment's own new gate-outputs block (Step 5) is where the new figures appear a second time.

- [ ] **Step 5: Write the increment section in `docs/process/implementation-status.md`.**

Record: that this increment landed no behavior and moved no maturity marker; the eight new files and what each pins; that every one of the twelve kinds now appears in an absolute literal and `deriveStagedRef` has one; the honest limit — these prove non-drift, never correctness, and combination coverage is deliberately outside; the new register row; and the new figures.

- [ ] **Step 6: Prove the frozen oracle never moved.**

```bash
git diff HEAD~7 --stat -- packages/record/test/byte-stability.test.ts; echo "empty means untouched"
grep -rn "from '\.\./byte-stability" packages/record/test/byte-regression/ || echo "no import — correct"
grep -rn "byte-regression" packages/record/test/byte-stability.test.ts || echo "no reference — correct"
```
Expected: no diff, and no IMPORT in either direction. Note the grep matches an import specifier, not the bare word: `fixtures.ts`'s mandated header names `byte-stability.test.ts` three times in prose, deliberately, so a bare-word grep would report the plan's own required text as a violation. If the frozen file appears in the `git diff`, STOP — hard rule 4 was violated.

- [ ] **Step 7: Full gates.** The whole battery including `docs-index-sync`. Zero skips.

- [ ] **Step 8: Commit.**

Subject: `Byte-regression pins 8/8: coverage asserted, the sidecar deferral recorded, the record lands the exit`

---

## Self-review notes

- **Spec coverage.** The seven families map to Tasks 1–7 (`staged-ref` in 1, `confirm-declaring` 2, `declined` 3, `findings` 4, `redemption` 5, `terminal-refusals` 6, `multi-leg` 7); `fixtures.ts` and its three-knob ruling to Task 1; the coverage claim, the AL2-sidecar register row and the record to Task 8. The design's "byte-stability.test.ts is not edited" ruling is enforced by Task 8 Step 6 mechanically, not by inspection.
- **The eighth file.** The design names seven; this plan adds `coverage.test.ts`, which pins no bytes and asserts the increment's own claim. It is bookkeeping made executable, not a family.
- **The one thing most likely to go wrong** is harvesting a literal over a mis-scripted flow. Every task therefore gets its kind-shape test green BEFORE any literal is pasted. A digest harvested from the wrong flow is wrong forever and no downstream gate would notice.
- **Test-count arithmetic is deliberately not predicted here.** Task 8 Step 4 measures it. Both increments move the suite total, so neither may pin the other's absolute figure.
