# Proposal Provenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the proposal-provenance increment — a GOVERNED, open-time `proposed { stagedRef }` option that resolves the agent's original draft through the store, checks same-(profileId, subjectRef, legId) fail-closed, and binds its `contentDigest` into the genesis as `proposedDigest`, so a record distinguishes what the agent proposed from what the human decided.

**Architecture:** One new `OpenOptions` member handled inside `kernel/open.ts` (shape-validated at intake, resolved between the leg check and prior-leg verification, bound present-iff-supplied into the `opened` payload); `DecisionRecord.proposedDigest?` folded by `chain/replay.ts`; ReviewView untouched; NOTHING gates on the field at any seam. Zero new refusal codes, kinds, or states.

**Tech Stack:** TypeScript (NodeNext, strict), vitest 4, the existing test helpers.

**Spec:** `docs/superpowers/specs/2026-08-21-proposal-provenance-design.md`

## Global Constraints

- **THE SANCTION GATE:** Tasks 1 and 5 edit `docs/concept/` (exactly the design doc's §7 scope: SPEC §§2, 4, 9; CONTROLS §§3, 5; GLOSSARY). Executable ONLY under the maintainer's explicitly granted fresh sanction for this increment, recorded in the conversation or commit message. Not granted → STOP before Task 1.
- `packages/record/test/byte-stability.test.ts` is FROZEN — asserted green at every task, never edited. `proposedDigest` is present-iff-supplied, so the pinned minimal chain cannot move; a red oracle is a finding to adjudicate.
- Zero new refusal codes (registry stays 24), zero new `TransitionKind`s/`RecordState`s. Both throw postures are caller-error throws, mirroring open()'s unknown-`stagedRef` throw.
- Node floor `>=22.16`; ESM; zero runtime dependencies.
- `node scripts/contract-scan.mjs` before every commit (exit 0; new .ts citations must resolve; NO bare word "design" in code comments — a prior increment tripped this).
- Every gate at every commit: `./node_modules/.bin/vitest run` (zero skips), `./node_modules/.bin/tsc --noEmit -p tsconfig.json`, `./node_modules/.bin/biome check .`; `node scripts/api-reference-sync.mjs` and the packed-tarball smoke (`node scripts/smoke-pack.mjs`) at Task 4 (the exported surface moves). Never call `pnpm` (broken shim on this machine).
- Commit messages via `git commit -F <msgfile>` where the message file is written with the Write tool (PowerShell `Set-Content -Encoding utf8` embeds a BOM that corrupts the subject). Verify the branch before each commit. Never push.

---

### Task 1: The sanctioned sealed-set text lands `[DESIGNED]`

**Files:**
- Modify: `docs/concept/SPEC.md` (§2 one row + one sentence, §4 one key in the opened row, §9 one options block)
- Modify: `docs/concept/CONTROLS.md` (§3 one row, §5 one row)
- Modify: `docs/concept/GLOSSARY.md` (one entry)

**Interfaces:**
- Produces: the normative text Tasks 2–4 cite. Markers move to `[PROVEN]` at Task 5.

- [ ] **Step 1: Confirm the sanction grant is on record.** Not granted → STOP.

- [ ] **Step 2: SPEC §2 — the record model.** Read the record-model field table; after the `policyDigest` row (matching the table's exact columns) insert a row for `proposedDigest`: optional `Digest`, "the agent-proposed draft's content digest, bound at `open()` from a resolved same-triple staged reference (§9) **[DESIGNED]**". Then, near the table (read the section for the natural seat), add one provenance sentence:

```markdown
**Provenance (`proposedDigest`) [DESIGNED].** A record MAY bind, at open, the content
digest of the staged draft the proposal arrived as — resolved through the store, never
host-claimed — so the record distinguishes what was proposed from what was decided by
digest comparison. The binding proves a draft with that digest existed in the store for
the same (profile, subject, leg) when the record opened — never who authored either
draft (staging carries no identity; the capability split is in-process discipline, §9),
and never that the revision was sound. Nothing gates on it: notarize, never evaluate.
```

- [ ] **Step 3: SPEC §4 — the opened payload row.** Read the `opened` row's key enumeration (it lists `policyDigest?`, `priorRecordRefs?`, `priorLegActors?`, `supersedes?` as present-iff-supplied keys); add `proposedDigest?` to that enumeration with a two-word gloss ("provenance, §2 **[DESIGNED]**") folded to the row's format.

- [ ] **Step 4: SPEC §9 — open()'s options.** In the `open(stagedRef, {...})` bullet's options coverage (read the whole bullet first; `priorRecordRefs`/`policyDigest`/`supersedes` each have their sentence or block), add:

```markdown
`proposed { stagedRef }` **[DESIGNED]** — the provenance option (§2): the library
resolves the reference through the store exactly as it consumes its own `stagedRef` —
an unresolvable reference THROWS (the unknown-`stagedRef` posture; §8's caller-error
class) — requires the resolved draft to name the SAME `(profileId, subjectRef, legId)`
as the opened draft (any mismatch THROWS naming both triples: a cross-triple proposal
is host wiring error, not a domain outcome), and binds the resolved draft's
`contentDigest` into the genesis as `proposedDigest`, present-iff-supplied. Passing
the opened draft's own reference is legal and meaningful: it records unchanged
acceptance. Nothing gates on the binding at any seam; correction analysis over
proposed-vs-decided digests sits under §13's aggregate-only posture. On a signing
profile the binding is signature-covered from genesis; at AL1 it carries AL1's
ordinary insider bounds.
```

- [ ] **Step 5: CONTROLS.md.** §3, after the Recovery row, matching its exact columns:

```markdown
| Proposal provenance | `proposed` (open-time option) | §9's resolved same-triple staged reference bound as `proposedDigest` at genesis; record-only | DESIGNED | Proves the draft existed and whether the decision changed it — never who authored it, nor that the change was sound |
```

§5, one domain-instance row: `| Proposal provenance *(GOVERNED)* | trader-adjusted model order | clinician-revised dosage draft | caseworker-corrected benefit calculation | buyer-amended requisition |`

- [ ] **Step 6: GLOSSARY.md.** Alphabetized entry:

```markdown
**Proposed digest** — the provenance binding: the agent-proposed draft's content digest,
resolved and bound at open, distinguishing what was proposed from what was decided
(SPEC §2, §9). **[DESIGNED]**
```

- [ ] **Step 7: Scan and commit.** `node scripts/contract-scan.mjs` exit 0; hand-grep the diff for external names (none). Commit: `Proposal provenance, sanctioned sealed-set text lands [DESIGNED]: SPEC/CONTROLS/GLOSSARY per the design doc's §7 scope` + grant named in the body + trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

### Task 2: The seam — option, resolution, binding, fold

**Files:**
- Modify: `packages/record/src/config.ts` (`OpenOptions`), `packages/record/src/kernel/open.ts`, `packages/record/src/types.ts` (`DecisionRecord`), `packages/record/src/chain/replay.ts` (payload interface + fold)
- Test: `packages/record/test/provenance.test.ts` (new file)

**Interfaces:**
- Consumes: `store.getStaged`, the existing `openedPayload` assembly, `OpenedPayload` fold.
- Produces: `OpenOptions.proposed?: { stagedRef: string }`; `DecisionRecord.proposedDigest?: Digest`; the genesis key `proposedDigest` present-iff-supplied. Tasks 3–4 rely on these names exactly.

- [ ] **Step 1: Write the failing tests** — create `packages/record/test/provenance.test.ts`:

```ts
// @vidimera/record — provenance.test.ts: the proposal-provenance increment (SPEC §2's
// proposedDigest binding, §9's open-time `proposed` option).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create } from '../src/create.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
} from './helpers/profiles.js';

const P1 = { amount: 8.0 };
const P2 = { amount: 6.5, internal: 1.5 };

function handlesFor(profile = captureProfile()) {
  return { handles: create(makeConfig([profile])), profile };
}

async function stageBoth(handles: ReturnType<typeof create>, profileId: string) {
  const p1 = await handles.agent.stage(P1, profileId, DEFAULT_SUBJECT_REF);
  const p2 = await handles.agent.stage(P2, profileId, DEFAULT_SUBJECT_REF);
  assert.equal(p1.status, 'ok');
  assert.equal(p2.status, 'ok');
  return {
    p1: p1.status === 'ok' ? p1.value.stagedRef : '',
    p2: p2.status === 'ok' ? p2.value.stagedRef : '',
  };
}

test('provenance: the revised draft opens carrying the proposal digest — decided differs from proposed', async () => {
  const { handles, profile } = handlesFor();
  const { p1, p2 } = await stageBoth(handles, profile.id);
  const opened = await handles.operator.open(p2, { proposed: { stagedRef: p1 } });
  assert.equal(opened.status, 'ok');
  const recordId = opened.status === 'ok' ? opened.value.recordId : '';

  const record = await handles.operator.getRecord(recordId);
  assert.ok(record?.proposedDigest !== undefined);
  assert.notEqual(record?.proposedDigest, record?.contentDigest);

  // ReviewView does NOT project it (the supersedes precedent).
  const view = await handles.operator.review(recordId);
  assert.equal(view.status, 'ok');
  assert.equal(view.status === 'ok' && 'proposedDigest' in view.value, false);

  // Nothing gates on it: finalize confirms the record unchanged.
  const confirmed = await handles.operator.finalize(recordId, identity(), P2, facts());
  assert.equal(confirmed.status, 'ok');
});

test('provenance: unchanged acceptance — opening the proposal itself, digests equal', async () => {
  const { handles, profile } = handlesFor();
  const { p1 } = await stageBoth(handles, profile.id);
  const opened = await handles.operator.open(p1, { proposed: { stagedRef: p1 } });
  assert.equal(opened.status, 'ok');
  const record = await handles.operator.getRecord(
    opened.status === 'ok' ? opened.value.recordId : '',
  );
  assert.equal(record?.proposedDigest, record?.contentDigest);
});

test('provenance: an unresolvable proposed reference throws — caller error, never a refusal', async () => {
  const { handles, profile } = handlesFor();
  const { p2 } = await stageBoth(handles, profile.id);
  await assert.rejects(
    () => handles.operator.open(p2, { proposed: { stagedRef: 'staged_nothing' } }),
    /unknown proposed stagedRef/,
  );
});

test('provenance: a cross-triple proposed reference throws naming the mismatch — subject and profile arms', async () => {
  const profileA = captureProfile();
  const profileB = captureProfile({ id: 'test.capture.other.v1' });
  const handles = create(makeConfig([profileA, profileB]));
  const { p1 } = await stageBoth(handles, profileA.id);

  // Wrong SUBJECT: a draft for another subject cannot claim p1 as its proposal.
  const otherSubject = await handles.agent.stage(P2, profileA.id, 'subject:other');
  assert.equal(otherSubject.status, 'ok');
  await assert.rejects(
    () =>
      handles.operator.open(otherSubject.status === 'ok' ? otherSubject.value.stagedRef : '', {
        proposed: { stagedRef: p1 },
      }),
    /same/i, // the same-triple rule, both triples named in the message
  );

  // Wrong PROFILE: a draft under another profile cannot claim p1 either.
  const otherProfile = await handles.agent.stage(P2, profileB.id, DEFAULT_SUBJECT_REF);
  assert.equal(otherProfile.status, 'ok');
  await assert.rejects(
    () =>
      handles.operator.open(otherProfile.status === 'ok' ? otherProfile.value.stagedRef : '', {
        proposed: { stagedRef: p1 },
      }),
    /same/i,
  );
});

test('provenance: a malformed proposed option throws at intake', async () => {
  const { handles, profile } = handlesFor();
  const { p2 } = await stageBoth(handles, profile.id);
  await assert.rejects(
    () => handles.operator.open(p2, { proposed: {} } as never),
    /stagedRef/,
  );
  await assert.rejects(
    () => handles.operator.open(p2, { proposed: { stagedRef: '' } } as never),
    /stagedRef/,
  );
  await assert.rejects(
    () =>
      handles.operator.open(p2, {
        proposed: { stagedRef: p2, extra: 1 },
      } as never),
    /unknown key|exactly/i,
  );
});
```

- [ ] **Step 2: Run to verify failure.** `./node_modules/.bin/vitest run packages/record/test/provenance.test.ts` — TypeScript rejects `proposed` (not in `OpenOptions`). Expected RED.

- [ ] **Step 3: Implement.**
  - `config.ts` `OpenOptions`, after `supersedes`:

```ts
  /** SPEC §9's provenance option (§2's proposedDigest): the staged reference the
   * proposal arrived as, resolved through the store at open() and required to name the
   * SAME (profileId, subjectRef, legId) as the opened draft — both failure modes THROW
   * (the unknown-stagedRef caller-error posture). Binds the resolved draft's
   * contentDigest into the genesis, present-iff-supplied. Record-only: nothing gates
   * on it (notarize, never evaluate). Real as of the proposal-provenance increment. */
  proposed?: { stagedRef: string };
```

  - `kernel/open.ts`:
    - the unknown-key allowlist gains `if (key === 'proposed') continue; // REAL as of the proposal-provenance increment` and the throw message becomes `'open() accepts only priorRecordRefs, policyDigest, supersedes, and proposed in this build. Contract: §9.'`
    - after the `validateSupersedesShape` block, shape validation:

```ts
  // Argument-depth shape validation for a present proposed claim (SPEC §9's provenance
  // option): a malformed claim throws here, BEFORE any store read.
  if (opts?.proposed !== undefined) {
    validateProposedShape(opts.proposed);
  }
```

    - after the `unknown-leg` check and BEFORE `verifyPriorLegs`, the resolution:

```ts
  // --- SPEC §9's provenance option (the proposal-provenance increment): resolve the
  // proposed reference BEFORE the record exists. Both failure modes are caller errors
  // (the unknown-stagedRef posture): the host holds both refs, so an unresolvable or
  // cross-triple proposal is wiring error, not a domain outcome. Record-only — nothing
  // downstream gates on the binding (SPEC §2: notarize, never evaluate).
  let proposedDigestBound: string | null = null;
  if (opts?.proposed !== undefined) {
    const proposedDraft = await store.getStaged(opts.proposed.stagedRef);
    if (proposedDraft === null) {
      throw new Error(
        `open: unknown proposed stagedRef '${opts.proposed.stagedRef}' — no staged draft; ` +
          'a proposed reference that resolves to nothing is a caller error, not a domain refusal (SPEC §9)',
      );
    }
    if (
      proposedDraft.profileId !== staged.profileId ||
      proposedDraft.subjectRef !== staged.subjectRef ||
      proposedDraft.legId !== staged.legId
    ) {
      throw new Error(
        `open: proposed draft '${opts.proposed.stagedRef}' names ` +
          `('${proposedDraft.profileId}', '${proposedDraft.subjectRef}', '${proposedDraft.legId}') but the opened draft names ` +
          `('${staged.profileId}', '${staged.subjectRef}', '${staged.legId}') — the proposed reference must name the same ` +
          '(profileId, subjectRef, legId) as the opened draft (SPEC §9); a cross-triple proposal is a caller error',
      );
    }
    proposedDigestBound = proposedDraft.contentDigest;
  }
```

    - the `openedPayload` type literal gains `proposedDigest?: string;` and, beside the `supersedes` conditional:

```ts
  if (proposedDigestBound !== null) {
    // SPEC §2's provenance binding: the resolved proposal digest, present-iff-supplied,
    // so a non-supplying open() stays byte-identical (the supersedes mechanism).
    openedPayload.proposedDigest = proposedDigestBound;
  }
```

    - a file-local validator beside the module's other helpers:

```ts
/** SPEC §9's provenance option shape: a plain object with exactly `stagedRef`, a
 * non-empty string — the validateSupersedesShape class: malformed claims throw at
 * argument depth, before any store read. */
function validateProposedShape(proposed: unknown): asserts proposed is { stagedRef: string } {
  if (proposed === null || typeof proposed !== 'object' || Array.isArray(proposed)) {
    throw new Error('open: proposed must be a plain { stagedRef } object (SPEC §9)');
  }
  const keys = Object.keys(proposed);
  if (keys.length !== 1 || keys[0] !== 'stagedRef') {
    throw new Error(
      `open: proposed carries unknown keys or is missing stagedRef (found: ${keys.join(', ') || 'none'}) — ` +
        'exactly { stagedRef } (SPEC §9)',
    );
  }
  const ref = (proposed as { stagedRef: unknown }).stagedRef;
  if (typeof ref !== 'string' || ref.length === 0) {
    throw new Error('open: proposed.stagedRef must be a non-empty string (SPEC §9)');
  }
}
```

  - `types.ts` `DecisionRecord`, after `supersedes`:

```ts
  /** SPEC §2's provenance binding: the agent-proposed draft's content digest, resolved
   * and bound at open() (§9's `proposed` option) — present iff supplied. Deliberately
   * NOT projected into ReviewView (the supersedes precedent: provenance evidence rides
   * getRecord/replay, never the review projection). Nothing gates on it. */
  proposedDigest?: Digest;
```

  - `chain/replay.ts`: `OpenedPayload` gains `proposedDigest?: Digest;`; the folding-rules doc comment's opened line gains `proposedDigest?` in its key list; beside the `supersedes` fold:

```ts
  if (opened.proposedDigest !== undefined) {
    // SPEC §2's provenance binding, folded verbatim from the genesis snapshot — replay
    // surfaces what open() resolved and bound; it never re-resolves the reference.
    record.proposedDigest = opened.proposedDigest;
  }
```

- [ ] **Step 4: Run** the new file (GREEN), then the FULL suite (zero skips, byte-stability green), typecheck, biome, contract-scan.

- [ ] **Step 5: Commit:** `Proposal provenance 1/4: the open-time option lands — resolved, same-triple-checked, bound at genesis`.

### Task 3: Composition and interplay pins

**Files:**
- Create: `packages/record/test/helpers/signing.ts` (the ed25519 setup extracted from `decline.test.ts`)
- Modify: `packages/record/test/decline.test.ts` (use the shared helper — zero behavioral change), `packages/record/test/provenance.test.ts`

**Interfaces:**
- Consumes: Task 2's option; the decline seam; `supersedes`; `twoLegProfile`; `verifySignatures`.
- Produces: `test/helpers/signing.ts` exporting the setup both test files use (name and exact shape taken from decline.test.ts's existing local helper — behavior-preserving move).

- [ ] **Step 1: Extract the signing helper.** Move decline.test.ts's file-local ed25519 signing setup into `test/helpers/signing.ts` verbatim (exported), update decline.test.ts's two signing tests to import it, and run `./node_modules/.bin/vitest run packages/record/test/decline.test.ts` — all green, zero behavioral change.

- [ ] **Step 2: Write the interplay tests** (append to provenance.test.ts):

```ts
import { transitionDigest } from '../src/chain/encoding.js';
import { twoLegProfile } from './helpers/profiles.js';

test('provenance composes with recovery: a rework re-open carries supersedes AND proposed', async () => {
  const profile = captureProfile({ decline: true });
  const handles = create(makeConfig([profile]));
  const { p1, p2 } = await stageBoth(handles, profile.id);

  const first = await handles.operator.open(p1, { proposed: { stagedRef: p1 } });
  assert.equal(first.status, 'ok');
  const firstId = first.status === 'ok' ? first.value.recordId : '';
  const declined = await handles.operator.decline(firstId, identity(), P1, facts());
  assert.equal(declined.status, 'ok');

  const chain = await handles.operator.readChain(firstId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  const reopened = await handles.operator.open(p2, {
    supersedes: { recordId: firstId, chainHead: transitionDigest(last) },
    proposed: { stagedRef: p1 },
  });
  assert.equal(reopened.status, 'ok');
  const record = await handles.operator.getRecord(
    reopened.status === 'ok' ? reopened.value.recordId : '',
  );
  assert.ok(record?.supersedes !== undefined);
  assert.ok(record?.proposedDigest !== undefined);
  assert.notEqual(record?.proposedDigest, record?.contentDigest);
});

test('provenance is per-leg on a multi-leg profile', async () => {
  const profile = twoLegProfile();
  const handles = create(makeConfig([profile]));
  // Leg 1: proposal and revision for maker-decide.
  const m1 = await handles.agent.stage(P1, profile.id, DEFAULT_SUBJECT_REF, 'maker-decide');
  const m2 = await handles.agent.stage(P2, profile.id, DEFAULT_SUBJECT_REF, 'maker-decide');
  assert.equal(m1.status, 'ok');
  assert.equal(m2.status, 'ok');
  const leg1 = await handles.operator.open(m2.status === 'ok' ? m2.value.stagedRef : '', {
    proposed: { stagedRef: m1.status === 'ok' ? m1.value.stagedRef : '' },
  });
  assert.equal(leg1.status, 'ok');
  const leg1Id = leg1.status === 'ok' ? leg1.value.recordId : '';
  const confirmed = await handles.operator.finalize(leg1Id, identity(), P2, facts());
  assert.equal(confirmed.status, 'ok');

  // A cross-LEG proposed reference throws (the same-triple rule).
  const c1 = await handles.agent.stage(P1, profile.id, DEFAULT_SUBJECT_REF, 'checker-decide');
  assert.equal(c1.status, 'ok');
  const chain = await handles.operator.readChain(leg1Id);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  await assert.rejects(
    () =>
      handles.operator.open(c1.status === 'ok' ? c1.value.stagedRef : '', {
        priorRecordRefs: [{ recordId: leg1Id, chainHead: transitionDigest(last) }],
        proposed: { stagedRef: m1.status === 'ok' ? m1.value.stagedRef : '' },
      }),
    /same/i,
  );
});

test('provenance on a signing profile: the genesis carrying proposedDigest is signed and verified', async () => {
  // Uses the shared helper from ./helpers/signing.js — build a signing capture profile,
  // stage P1/P2, open with proposed, then verifySignatures: signingDeclared true and
  // transitions[0] (the genesis) signed && verified. Exact construction mirrors
  // decline.test.ts's signed-decline test with the decline call replaced by the open.
});
```

  Fill the third test's body by mirroring decline.test.ts's signed-decline test exactly (same helper, same assertions) with `open(p2, { proposed: { stagedRef: p1 } })` as the act under test and the genesis transition (seq 1) as the asserted entry.

  Then one live-capture composition pin (design §4: "live profiles open through the same seam and may carry it identically" — open.ts has zero captureMode branches, verified; the pin makes it regression-proof):

```ts
test('provenance on a live profile: the same seam, identically', async () => {
  const profile = liveProfile();
  const handles = create(makeConfig([profile]));
  const { p1, p2 } = await stageBoth(handles, profile.id);
  const opened = await handles.operator.open(p2, { proposed: { stagedRef: p1 } });
  assert.equal(opened.status, 'ok');
  const record = await handles.operator.getRecord(
    opened.status === 'ok' ? opened.value.recordId : '',
  );
  assert.ok(record?.proposedDigest !== undefined);
});
```

  (`liveProfile` from `./helpers/profiles.js`; its default leg is `approver-decide`, so `stageBoth`'s default-leg staging matches.)

- [ ] **Step 3: Run** the two files, then the FULL suite (zero skips, byte-stability green), typecheck, biome, contract-scan.

- [ ] **Step 4: Commit:** `Proposal provenance 2/4: composition pinned — recovery, multi-leg, cross-leg throw, signed genesis`.

### Task 4: The guide moves with the surface

**Files:**
- Modify: `docs/guide/api-reference.md` (OpenOptions gains `proposed`; DecisionRecord gains `proposedDigest`), `docs/guide/integrating.md` (a "Binding the agent's proposal" subsection)
- Scratch: a temporary vitest file executing the guide sample (deleted before commit)

- [ ] **Step 1:** Write the guide sample as `packages/record/test/scratch-guide-provenance.test.ts` (agent stages P1, human revision staged as P2, open with `proposed`, getRecord shows both digests), run it green, DELETE it (verify via git status).
- [ ] **Step 2:** `api-reference.md`: the OpenOptions entry gains the `proposed` member beside `supersedes`'s (semantics, both throw postures, the honest bound in the same breath); the DecisionRecord/Core-types section gains `proposedDigest?`.
- [ ] **Step 3:** `integrating.md`: the subsection with the verified sample — when to bind it, unchanged acceptance, the rework composition (supersedes + proposed), and the editor-identity recipe pointer (a host `revision` consultation, per the design's recorded cut).
- [ ] **Step 4:** Gates: `node scripts/api-reference-sync.mjs` 0; `node scripts/contract-scan.mjs` 0 (no external names/URLs); FULL suite; typecheck; `node scripts/smoke-pack.mjs` (the exported surface moved).
- [ ] **Step 5: Commit:** `Proposal provenance 3/4: the guide moves with the surface — samples vitest-verified`.

### Task 5: Exit — markers to truth, the record, the sweep

**Files:**
- Modify: `docs/concept/SPEC.md`, `docs/concept/CONTROLS.md`, `docs/concept/GLOSSARY.md` (marker moves ONLY — sanction-covered exit step)
- Modify: `docs/process/implementation-status.md` (the increment's section), `CLAUDE.md` (measured counts only)
- Verify: `docs/process/deferral-register.md` (expect no row moves — read it)

- [ ] **Step 1:** Every `[DESIGNED]` Task 1 introduced becomes `[PROVEN]` (SPEC §2 row + provenance sentence, §4 key gloss, §9 block; CONTROLS §3 Maturity cell; GLOSSARY entry). Grep docs/concept/ for DESIGNED and adjudicate every hit — only this increment's sites move; the two legend-definition sites stay.
- [ ] **Step 2:** `implementation-status.md`: the increment's section in house style — what landed, the rulings (resolved-ref binding; throw-never-refuse; strict same-triple; open-time option; ReviewView non-projection; same-ref legality), the cuts with recovery paths, gate outputs as measured, the spec/plan paths, the sanction grant record.
- [ ] **Step 3:** CLAUDE.md: re-measure the test totals (expect file count 53 — the new provenance.test.ts — and the measured test count); verify the 24-codes sentence and the three-throws sentence (`finalize()`, `open()`, `decline()`) still true — this increment adds no fourth intake, and `open()`'s unknown-key message text changed but its posture did not.
- [ ] **Step 4:** Comment-truth sweep, hit-count == verdict-count per pattern: `"accepts only priorRecordRefs"` (the updated open() message and any comment quoting the old enumeration); `"proposed"` across packages/ (every hit this increment's or adjudicated); `"opened snapshot"`/genesis-key enumerations in comments (open.ts's payload doc, replay's folding rules — updated in Task 2, verify); operator-surface/create.ts headers (open()'s option enumeration if any names the option list).
- [ ] **Step 5:** Full gates one last time (suite zero skips, typecheck, biome, contract-scan 0, api-sync 0). Commit: `Proposal provenance 4/4: markers move to truth; the record and the sweep land the exit`.

---

## What this plan does not do (per the design doc's cuts, recorded there)

No draft-to-draft lineage, no editor-identity field, no mandatory-provenance switch, no cross-triple refs, no new refusal codes/kinds/states, no ReviewView projection, no gating anywhere, no `docs/concept/` edits beyond the sanctioned §7 scope.
