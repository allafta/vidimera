# Identity Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Red is observed before green for every new pin.

**Goal:** Record exactly the identity values the library validated — a fresh
`{ principal, authority, proofRef? }` literal at every seam — and make `MemoryStore` refuse an
append whose stored copy would digest differently from the digest it returns.

**Architecture:** One validator returns the literal or `null`; every identity-taking seam uses
the literal for its allowlist check, its SoD comparison and its payload. `MemoryStore` compares
the digest of its clone with the digest of the caller's transition before writing. A conformance
case holds every backing to "the returned digest is the stored transition's digest".

**Tech Stack:** TypeScript (strict), vitest, Biome, `node:sqlite`.

**Spec:** `docs/superpowers/specs/2026-11-17-identity-snapshot-design.md` — rulings 5.1–5.6 bind
every task; read it before starting any task.

**Task 0 (done before execution, by the authoring session):** the design and this plan are
committed together with their `docs/superpowers/INDEX.md` row and file counts.

## Global Constraints

- **Branch:** `identity-snapshot-2026-11-17`, stacked on `chain-binding-2026-11-17` (`3a1361b`).
  Confirm with `git branch --show-current` before every commit.
- **Commits:** message written to a BOM-free temp file (a bash heredoc in the session
  scratchpad), committed with `git commit -F <file>`, ending with the exact line
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Commands — `pnpm` is broken on this machine; run from the repo root:** one test file
  `node_modules/.bin/vitest run <path>`; whole suite `node_modules/.bin/vitest run` (the
  embedded-postgres `TypeError: done is not a function` printed after the results is known
  teardown noise — judge by the summary lines); typecheck
  `node_modules/.bin/tsc -p packages/record --noEmit && node_modules/.bin/tsc -p packages/store-postgres --noEmit`;
  lint `node_modules/.bin/biome check .` (format with `--write <files>`); gates
  `node scripts/contract-scan.mjs`, `node scripts/api-reference-sync.mjs`,
  `node scripts/docs-index-sync.mjs`. `smoke` cannot run here.
- **STOP, absolute — never edit:** `docs/concept/**`; `packages/record/test/byte-stability.test.ts`;
  `packages/record/src/index.ts`; `packages/record/src/store/sqlite.ts`;
  `packages/store-postgres/src/**`; both `package.json` manifests; any existing `PINNED_` literal.
  No push, no merge.
- **No existing assertion may change its truth value.** If an existing test goes red, STOP and
  report. `isValidIdentity` stays exported with its current meaning.
- **A plain literal identity changes no byte.** For `{ principal, authority, proofRef? }`
  literals the recorded payload is unchanged.
- **New comments and markdown reference nothing outside this repository.**
- **Measured figures are measured, never copied.**

## Review Focus

1. **An explicit `proofRef: undefined`** is admitted today and must still be admitted — and must
   not appear in the snapshot (Task 1, `proofRef undefined is omitted`).
2. **A getter that returns a different value on each read** — the snapshot reads each field once,
   so the validated value, the SoD value and the recorded value are the same (Task 1).
3. **Mutation after the call** changes nothing recorded (Task 1).
4. **A plain payload on `MemoryStore`** — the new check must not fire; the whole existing suite
   stays green (Task 2).
5. **A batch whose third element is the non-plain one** — `appendBatch` writes nothing at all
   (Task 2).

---

### Task 1: One validator returns the literal; every seam records it

**Files:**
- Modify: `packages/record/src/kernel/finalize.ts` (`isValidIdentity` ~:1055 and its doc comment; the identity rung ~:321; the facts gate ~:1080-1090; the payload builders ~:544, ~:581, ~:607)
- Modify: `packages/record/src/kernel/decline.ts` (identity rung ~:145; builders ~:254, ~:282, ~:307)
- Modify: `packages/record/src/kernel/consultations.ts` (~:144, ~:179)
- Modify: `packages/record/src/kernel/findings-seams.ts` (`validateSeamIdentity` ~:118 and its two callers; payloads ~:287, ~:324)
- Modify: `packages/record/src/kernel/prior-legs.ts` (the prior-actor check ~:90 — design ruling 5.2a); `sodViolated` in `finalize.ts` (~:984-1030)
- Create: `packages/record/test/identity-snapshot.test.ts`

**Interfaces:**
- Produces: `export function identitySnapshot(identity: IdentityAssertion): IdentityAssertion | null` in `kernel/finalize.ts`; `isValidIdentity(i)` becomes `identitySnapshot(i) !== null`.
- `validateSeamIdentity(seam: string, identity: IdentityAssertion): IdentityAssertion` returns the snapshot (throws as today).
- The facts gate's ok arm gains `checker: IdentityAssertion` (the snapshot) beside `canonical`.

- [ ] **Step 1: Write the failing tests** in `test/identity-snapshot.test.ts`. Define the four shapes as factories taking `(principal, authority)`:
  - `inherited` — `Object.create({ principal, authority })`;
  - `getters` — a class with `#principal`/`#authority` and `get principal()`/`get authority()`;
  - `nonEnumerable` — `{ authority }` plus `Object.defineProperty(o, 'principal', { value: principal, enumerable: false })`;
  - `toJsonView` — a class with own `principal`/`authority` fields and a prototype `toJSON()` returning `{ principal: '[redacted]', authority, email: 'x@example.invalid' }`.

  For each shape, on `MemoryStore` and `SqliteStore(':memory:')`, test name `<site> records the validated literal for a <shape> identity (<backing>)`, for each site: finalize `actor`; finalize `facts.checker`; an obtained consultation's `checker` passed to finalize; decline `actor`; `raiseFinding` `raiser`; `acknowledge` `acker`. Assertions: the outcome is `ok`; the recorded member (read from `readChain`) deep-equals `{ principal, authority }` exactly; `verifyChain(recordId)` is `{ intact: true }`; where the outcome carries a `transitionRef`, it equals `chainHead(recordId)`.

  Also:
  - `proofRef undefined is omitted` — a plain `{ principal, authority, proofRef: undefined }` finalizes ok and `actor` deep-equals `{ principal, authority }`.
  - `a getter read once` — a class whose `principal` getter returns `'alice'` on the first read and `'mallory'` after; finalize ok, `actor.principal === 'alice'`.
  - `mutation after the call changes nothing recorded` — a plain identity object mutated (`principal = 'mallory'`) after `finalize` resolves; `readChain`'s `actor.principal` is still the original.
  - `separation of duties holds for a getter-backed maker` — `twoLegProfile` with `sod: { notActorOf: [<first leg id>] }` (see `test/multi-leg.test.ts` for the shape); maker leg confirmed with a `getters` identity of principal `'alice'`; checker leg opened with its `priorRecordRefs` and finalized by plain `{ principal: 'alice', authority }` → `refused` with code `sod-violation`.
  - `a getter-backed acker counts toward coverage` — raise with a plain identity, acknowledge with a `getters` identity on a profile whose finalize requires coverage; `finalize` confirms (today it refuses, because the recorded `acker: {}` does not count).
  - `a recorded {} prior actor is a storage fault` — a `TamperingStore` (`test/helpers/stores.ts`) whose `tamperFn` sets the maker record's `confirmed` payload `actor` to `{}` (relink the following digests so the chain still verifies — see `test/helpers/chain.ts`); opening the checker leg rejects with `/garbled or foreign chain/`. And a successor whose genesis `priorLegActors` is `[{}]` (same technique): `finalize` rejects with the `sodViolated` storage-fault message.
  - `a throwing principal getter propagates` — finalize rejects with the getter's own error.

- [ ] **Step 2: Run** the file — Expected: FAIL (recorded `{}` for inherited/getter/non-enumerable shapes; the `toJsonView` shape records the redacted view on `SqliteStore` and breaks the chain on `MemoryStore`; the SoD test confirms).

- [ ] **Step 3: Implement** `identitySnapshot` (today's checks in today's order, each field read once into a local; it catches nothing) and use the snapshot at every site in design ruling 5.2 — the allowlist check, `sodViolated` and every embedded `actor`/`checker`/`raiser`/`acker` — then ruling 5.2a's two read-side throws. `isValidFacts` is internal (not exported from `index.ts`), so widening its ok arm is safe.

- [ ] **Step 4: Run** typecheck, the new file, `test/identity-shape.test.ts`, `test/identity.test.ts`, then the whole suite — Expected: all PASS.

- [ ] **Step 5: Commit** — message `Every seam records the identity literal it validated, never the caller's object`.

---

### Task 2: `MemoryStore` digests what it stores; a conformance case for every backing

**Files:**
- Modify: `packages/record/src/store/memory.ts` (the write sites ~:228, ~:302-307, ~:388-399; the store-clone header comment ~:56-92)
- Modify: `packages/record/test/conformance/store-conformance.ts` (one new case)
- Test: `packages/record/test/store-constraints.test.ts` (new tests beside the existing `DataCloneError` pins)

**Interfaces:**
- Consumes: nothing from Task 1.

- [ ] **Step 1: Write the failing tests:**
  - In `store-constraints.test.ts`: `MemoryStore refuses an append whose clone would digest differently` — a genesis appended normally; then `appendTransition` with a subsequent transition whose payload holds an instance of a class with a prototype `toJSON` returning a different view → rejects with `/MemoryStore/`; `readChain` unchanged; `chainHead` unchanged. The same for the genesis append path, and for `appendBatch` with the non-plain member in the batch's last element → rejects; nothing from the batch is stored.
  - `a plain payload is unaffected` — the same transitions with plain payloads append and return digests equal to `chainHead`.
  - Place the new `MemoryStore` check after every conflict check at each write site (a conflict still wins, as with today's `DataCloneError`).
  - In `store-conformance.ts`, a case `an append's returned digest is the stored transition's digest, or the append throws and writes nothing` — payload member with a prototype `toJSON`; if the append resolves, `result.transitionDigest === await store.chainHead(id)` and equals `transitionDigest(chain.at(-1))` of `readChain`; if it rejects, `readChain` is unchanged. (Follow the suite's existing case shape and its backing factory.)

- [ ] **Step 2: Run** `test/store-constraints.test.ts` and `test/memory-store-conformance.test.ts` — Expected: the `MemoryStore` refusal tests FAIL (the append succeeds and the stored chain diverges); the conformance case FAILS on `MemoryStore` (returned digest differs from `chainHead`).

- [ ] **Step 3: Implement** design ruling 5.3: clone first, compare digests, throw before any state change; return the digest of what is stored. Rewrite the header comment's premise per 5.3.

- [ ] **Step 4: Run** typecheck, both files, `test/sqlite-store-conformance.test.ts`, `packages/store-postgres/test/postgres-store-conformance.test.ts`, then the whole suite — Expected: all PASS (the SQL backings take the conformance case's second arm).

- [ ] **Step 5: Commit** — message `MemoryStore stores only what digests the same; a conformance case holds every backing to it`.

---

### Task 3: Documentation, the record, and the gates

**Files:**
- Modify: `docs/guide/integrating.md` (the "pass exactly those fields" paragraph, ~:147-152)
- Modify: `CHANGELOG.md` (`[Unreleased]`, `Fixed`)
- Modify: `docs/process/implementation-status.md` — a new `## Post-build-order increment — Identity snapshot` section after the chain-binding section, modelled on it: what landed per commit, the measured gates, an **Inversions** paragraph (none expected: say why — the exact-own-key check and the store-clone posture are kept; the `bc0a2e1` fix is completed, not reversed), the record that the twelfth inversion's fix was incomplete for inherited, accessor and `toJSON` shapes and is now complete, and the store-clone decision's corrected premise; the "Current state" counts
- Modify: `CLAUDE.md` — the measured suite counts only (precedent: past increments' record commits)

- [ ] **Step 1:** Write the guide sentence per design ruling 5.6, the CHANGELOG entry (what it fixes for a host, with its limit: other host values — profiles, options, canonicalizer output — are not yet snapshotted), and the status section.
- [ ] **Step 2:** Run every gate and record the measured figures — Expected: all exit 0 (`smoke` recorded as not run here; CI runs it).
- [ ] **Step 3: Commit** — message `The identity-snapshot increment's record: guide, changelog, status`.
