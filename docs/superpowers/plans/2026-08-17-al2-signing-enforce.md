# AL2 Signing Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the mint's signature layer load-bearing at all six chain-verification
sites, execute the sanctioned sealed bundle (the AL2 marker, OQ §1's tails, two clause
rewrites, the OQ §7 opener), and record AL2 increment 2 of 3.

**Architecture:** One shared async helper (`signatureLayerHolds`) factored onto
`kernel/verify-signatures.ts`'s existing correlation core; six call-site swaps that
inherit each site's existing failure discipline; no new codes, outcomes, arguments, or
construction surface.

**Tech Stack:** TypeScript strict, vitest, Biome; pnpm workspace, Node >=22.16.

**Spec:** docs/superpowers/specs/2026-08-17-al2-signing-enforce-design.md (80dcc06).
The gate rulings and in-spec rulings bind (all six sites; reads stay separate; the
rehoming residual NAMED not closed; the failure mapping inherits each site).

## Global Constraints

- Code + tests: ONE commit (Task 1). The sealed bundle its OWN commit (Task 2). The
  record its own (Task 3). Verification only (Task 4).
- Five gates before every commit (scan LAST on the staged tree; escape-free
  SPEC-cited strings). PowerShell for pnpm (`$env:PATH = "$env:APPDATA\npm;$env:PATH"`
  first); git via the Bash tool; branch `main`.
- Frozen, NO exceptions: `src/store/`, `chain/encoding.ts`,
  `test/byte-stability.test.ts`. `docs/concept/` untouched by Tasks 1 and 3; Task 2
  changes EXACTLY the sanctioned bundle — full before/after lines below (lesson 22).
- Comments: explicit increment naming ("the AL2 enforcement increment"); never bare
  "this increment"; ASCII apostrophes; forward refs to "the AL2 freshness increment"
  two-touch. THIS increment falsifies the mint's "nothing enforces" comments — Task 1
  finalizes every one it can reach in code; Task 3 sweeps the docs (lesson 21).
- RED EXECUTED. Trailer: Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

---

### Task 1: The helper and the six swaps — enforcement, tests

**Files:**
- Modify: `packages/record/src/kernel/verify-signatures.ts` (factor the correlation
  core; export `signatureLayerHolds(ctx, chain): Promise<boolean>`)
- Modify the six sites: `packages/record/src/kernel/finalize.ts` (~:174),
  `kernel/seal.ts` (~:51), `kernel/redeem.ts` (~:197, the shared prologue — the
  enlisted arm INHERITS), `kernel/findings-seams.ts` (~:148),
  `kernel/prior-legs.ts` (~:61, signature widened to take what it needs),
  `kernel/supersedes.ts` (~:67, likewise)
- Modify (comment finalizations): the mint's "nothing enforces"-class comments in
  `signing/decorate.ts`, `signing/store.ts`, `kernel/verify-signatures.ts`,
  `test/signing.test.ts` headers — grep `nothing enforces|no enforcement|refuses
  NOTHING|not enforced|enforcement increment` across packages/record and finalize
  every hit truthfully (the enforcement increment is NOW; the freshness increment
  stays future).
- Test: create `packages/record/test/signing-enforce.test.ts`; add the enlisted pin
  to the SQLite suite; the existing signing/mint tests must keep passing UNCHANGED
  (they are the layer-does-not-overreach regression).

**Interfaces:**
- Consumes: the mint's `SigningConfig`/sidecar/`encodeTransition`; each site's
  existing failure arm (`appendChainCompromise`, the enlisted result-first refusal,
  `{ ok: false }`).
- Produces: `signatureLayerHolds(ctx: KernelContext, chain: readonly Transition[]):
  Promise<boolean>` — `true` when the layer does not apply (non-signing or
  unresolvable genesis profile) or when every transition verifies; `false` on any
  missing entry, unresolvable `keyRef`, failing or throwing verifier. AL1 intactness
  is NOT its business — call sites check `verifyChain(chain).intact` FIRST and
  consult the layer only on an intact chain.

- [ ] **Step 1: Write the failing tests**

Create `packages/record/test/signing-enforce.test.ts`:

```ts
// @vidimera/record — signing-enforce.test.ts (SPEC §14, the AL2 enforcement
// increment, second of three): the mint's layer becomes LOAD-BEARING. Every
// chain-verification site — the four seam prologues and the two cross-record
// claims — requires a signing record's every transition to verify under the host
// registry; failure folds into the code each site already speaks. The reads stay
// reads: verifyChain remains the AL1 report, verifySignatures the AL2 report,
// neither gates. Authority timestamps and freshness remain the AL2 freshness
// increment's own work.

import { generateKeyPairSync, sign as edSign, verify as edVerify } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
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
const WRONG = { subject: 'week-1', total: 41 };

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const signer: Signer = async (bytes) => ({
  keyRef: 'key-1',
  signature: edSign(null, bytes, privateKey).toString('base64'),
});
function countingVerifier(): { verifier: Verifier; calls: () => number } {
  let n = 0;
  const verifier: Verifier = async (bytes, signature) => {
    n += 1;
    return edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  };
  return { verifier, calls: () => n };
}

function signedSetup(extraProfiles: ConfirmProfile[] = []) {
  const store = new MemoryStore();
  const signatures = new MemorySignatureStore();
  const { verifier, calls } = countingVerifier();
  const profiles: ConfirmProfile[] = [
    { ...captureProfile({ id: 'test.enf.v1', terminalRefusals: ['content-drift'] }), signing: true },
    ...extraProfiles,
  ];
  const config = {
    ...makeConfig(profiles, { store }),
    signing: { signer, verifiers: { 'key-1': verifier }, signatures },
  };
  return { store, signatures, calls, handles: create(config) };
}

/** Break exactly one sidecar entry (tamper its signature) for the given record. */
async function breakOneSignature(
  signatures: MemorySignatureStore,
  recordId: string,
): Promise<void> {
  const entries = await signatures.listByRecord(recordId);
  const victim = entries[0];
  assert.ok(victim !== undefined, 'fixture: the record has sidecar entries');
  await signatures.put({ ...victim, signature: `AAAA${victim.signature.slice(4)}` });
}

test('finalize refuses chain-compromise on a signature-broken signing record — and the compromise edge is itself signed', async () => {
  const { handles, signatures } = signedSetup();
  const recordId = await openRecord(handles, CONTENT, 'test.enf.v1', 'subject:enf-1');
  await breakOneSignature(signatures, recordId);

  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');

  const chain = await handles.operator.readChain(recordId);
  const last = chain.at(-1);
  assert.equal(last?.kind, 'refused', 'the compromise edge appended');
  const entries = await signatures.listByRecord(recordId);
  assert.equal(
    entries.length,
    chain.length,
    'the compromise edge went through the decorated store and is itself signed',
  );
});

test('seal and raiseFinding refuse the same way; a MISSING entry (not just a tampered one) also fails closed', async () => {
  // seal, tampered:
  const a = signedSetup();
  const sealTarget = await openRecord(a.handles, CONTENT, 'test.enf.v1', 'subject:enf-2');
  const fin = await a.handles.operator.finalize(sealTarget, identity(), CONTENT, facts());
  assert.equal(fin.status, 'ok');
  await breakOneSignature(a.signatures, sealTarget);
  const sealed = await a.handles.operator.seal(sealTarget);
  assert.equal(sealed.status, 'refused');
  if (sealed.status === 'refused') assert.equal(sealed.code, 'chain-compromise');

  // raiseFinding on a findings-flow signing profile, one entry DELETED: build the
  // profile inline (signing + ackMode/requiredAcks), open, delete the genesis entry
  // via a fresh MemorySignatureStore trick — MemorySignatureStore has no delete, so
  // instead re-point the entry at a nonsense digest (equivalent: the REAL digest now
  // has no entry).
  const flowBase = captureProfile({ id: 'test.enf.flow.v1' });
  const flowLeg = flowBase.legs[0];
  assert.ok(flowLeg !== undefined);
  const b = signedSetup([
    {
      ...flowBase,
      signing: true,
      legs: [{ ...flowLeg, ackMode: 'any', requiredAcks: ['variance'] }],
    },
  ]);
  const flowId = await openRecord(b.handles, CONTENT, 'test.enf.flow.v1', 'subject:enf-3');
  const entries = await b.signatures.listByRecord(flowId);
  const victim = entries[0];
  assert.ok(victim !== undefined);
  await b.signatures.put({ ...victim, transitionDigest: `sha256:${'0'.repeat(64)}` });
  const raised = await b.handles.operator.raiseFinding(
    flowId,
    { findingId: 'f-1', kind: 'variance', findingDigest: `sha256:${'1'.repeat(64)}` },
    identity(),
  );
  assert.equal(raised.status, 'refused');
  if (raised.status === 'refused') assert.equal(raised.code, 'chain-compromise');
});

test('the redemption prologue refuses; cross-record claims fold into their own codes', async () => {
  // Direct redeem on a signature-broken signing effect-seam profile:
  const a = signedSetup([
    {
      ...captureProfile({ id: 'test.enf.effect.v1' }),
      signing: true as const,
      redeem: { confirmToRedeem: 3600 },
    },
  ]);
  const redeemId = await openRecord(a.handles, CONTENT, 'test.enf.effect.v1', 'subject:enf-4');
  const fin = await a.handles.operator.finalize(redeemId, identity(), CONTENT, facts());
  assert.equal(fin.status, 'ok');
  await breakOneSignature(a.signatures, redeemId);
  const red = await a.handles.operator.redeem(redeemId, CONTENT);
  assert.equal(red.status, 'refused');
  if (red.status === 'refused') assert.equal(red.code, 'chain-compromise');

  // supersedes: a terminal signing predecessor with a broken signature refuses the
  // CLAIM code, not chain-compromise:
  const b = signedSetup();
  const predId = await openRecord(b.handles, CONTENT, 'test.enf.v1', 'subject:enf-5');
  const drifted = await b.handles.operator.finalize(predId, identity(), WRONG, facts());
  assert.equal(drifted.status, 'refused', 'fixture: content-drift, terminal by profile');
  const head = await b.handles.operator.chainHead(predId);
  assert.ok(head !== null);
  await breakOneSignature(b.signatures, predId);
  const staged = await b.handles.agent.stage(CONTENT, 'test.enf.v1', 'subject:enf-5');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const recovered = await b.handles.operator.open(staged.value.stagedRef, {
    supersedes: { recordId: predId, chainHead: head },
  });
  assert.equal(recovered.status, 'refused');
  if (recovered.status === 'refused') assert.equal(recovered.code, 'supersedes-unverified');
});

test('the layer does not overreach: a NON-signing record with garbage in the sidecar passes every seam; the reads never gate', async () => {
  const { handles, signatures } = signedSetup([captureProfile({ id: 'test.enf.plain.v1' })]);
  const plainId = await openRecord(handles, CONTENT, 'test.enf.plain.v1', 'subject:enf-6');
  const chain = await handles.operator.readChain(plainId);
  const genesis = chain[0];
  assert.ok(genesis !== undefined);
  const { transitionDigest } = await import('../src/chain/encoding.js');
  await signatures.put({
    transitionDigest: transitionDigest(genesis),
    recordId: plainId,
    seq: 1,
    keyRef: 'key-unknown',
    signature: 'garbage',
  });
  const done = await handles.operator.finalize(plainId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'a non-signing profile never consults the layer');

  // The reads: break a SIGNING record and watch verifyChain stay AL1-true while
  // verifySignatures reports the break — neither refuses.
  const sigId = await openRecord(handles, CONTENT, 'test.enf.v1', 'subject:enf-7');
  await breakOneSignature(signatures, sigId);
  const al1 = await handles.operator.verifyChain(sigId);
  assert.equal(al1.intact, true, 'verifyChain is the AL1 report, documented as such');
  const al2 = await handles.operator.verifySignatures(sigId);
  assert.equal(
    al2.transitions.some((t) => t.verified === false),
    true,
    'verifySignatures is the AL2 report',
  );
});

test('a multi-leg successor whose prior-leg reference is signature-broken refuses prior-leg-unverified', async () => {
  const { twoLegProfile } = await import('./helpers/profiles.js');
  const { handles, signatures } = signedSetup([
    { ...twoLegProfile({ id: 'test.enf.two.v1' }), signing: true as const },
  ]);
  const makerId = await openRecord(
    handles,
    CONTENT,
    'test.enf.two.v1',
    'subject:enf-8',
    'maker-decide',
  );
  const fin = await handles.operator.finalize(makerId, identity(), CONTENT, facts());
  assert.equal(fin.status, 'ok');
  const head = await handles.operator.chainHead(makerId);
  assert.ok(head !== null);
  await breakOneSignature(signatures, makerId);

  const staged = await handles.agent.stage(CONTENT, 'test.enf.two.v1', 'subject:enf-8', 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const successor = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: makerId, chainHead: head }],
  });
  assert.equal(successor.status, 'refused');
  if (successor.status === 'refused') assert.equal(successor.code, 'prior-leg-unverified');
});

test('order: the verifier is never consulted on a hash-broken chain; an unresolvable keyRef fails closed', async () => {
  const { handles, signatures } = signedSetup();
  const recordId = await openRecord(handles, CONTENT, 'test.enf.v1', 'subject:enf-9');

  // Unresolvable keyRef: re-key one entry to a registry miss.
  const entries = await signatures.listByRecord(recordId);
  const victim = entries[0];
  assert.ok(victim !== undefined);
  await signatures.put({ ...victim, keyRef: 'key-unknown' });
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'chain-compromise');

  // Hash-broken chain: a sibling signing instance over a tampered copy, with its OWN
  // fresh counting verifier — asserted at ZERO after the refusal, proving AL1 refused
  // before the layer ever ran.
  const chain = await handles.operator.readChain(recordId);
  const { tamperNonLast } = await import('./helpers/profiles.js');
  const tamperedStore = new MemoryStore();
  for (const [i, t] of tamperNonLast(chain).entries()) {
    await tamperedStore.appendTransition(i === 0 ? null : 'open', t, { nonTerminal: true });
  }
  const sibling = countingVerifier();
  const h2 = create({
    ...makeConfig(
      [{ ...captureProfile({ id: 'test.enf.v1' }), signing: true as const }],
      { store: tamperedStore },
    ),
    signing: { signer, verifiers: { 'key-1': sibling.verifier }, signatures },
  });
  const broken = await h2.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(broken.status, 'refused');
  if (broken.status === 'refused') assert.equal(broken.code, 'chain-compromise');
  assert.equal(sibling.calls(), 0, 'AL1 refused first; the layer never ran on the hash-broken chain');
});
```

(`openRecord`'s optional fifth argument is the legId — verify against
test/helpers/profiles.ts:231 and pass it positionally as its signature demands. If
`makeConfig`'s profile-array typing rejects the spread literals, type the fixtures as
`ConfirmProfile` via an import rather than casting.)

Add the ENLISTED pin to the SQLite suite (the file with the enlisted redeem tests):
an enlisted `redeem(recordId, CONTENT, tx)` against a signature-broken signing
effect-seam record refuses `chain-compromise` result-first with NO appended edge
(chain length unchanged) — the rung-1 enlisted discipline inherited by the layer;
transcribe the neighboring enlisted tests' plumbing. RED FIRST (today it succeeds or
refuses differently — capture the actual wrong behavior).

- [ ] **Step 2: Run to verify failure — EXECUTE it**

`pnpm exec vitest run packages/record/test/signing-enforce.test.ts` — FAIL: every
enforcement assertion sees the un-enforced behavior (`ok` where `chain-compromise`
expected, etc.). The enlisted pin fails for its own captured reason. Record both.

- [ ] **Step 3: Implement**

1. `kernel/verify-signatures.ts` — factor the per-transition correlation +
   verification loop into an internal `layerVerdicts(ctx, chain)` both consumers
   share; export:

```ts
/** The AL2 enforcement increment's one gate primitive: does the signature layer
 * HOLD for this chain? `true` when the layer does not apply — the genesis profile
 * is non-signing or unresolvable in THIS instance (the id-resolution posture the
 * build takes everywhere) — or when EVERY transition carries a sidecar entry whose
 * keyRef resolves and whose verifier passes over the canonical bytes. `false` on
 * any miss, unresolvable keyRef, failing or THROWING verifier — fail closed. AL1
 * intactness is the CALLER's first check; this layer runs only on intact chains.
 * The rehoming residual is named in the status doc: the obligation keys on the
 * genesis's own profileId claim. */
export async function signatureLayerHolds(
  ctx: KernelContext,
  chain: readonly Transition[],
): Promise<boolean>;
```

2. The four seam swaps — each site's `!verifyChain(chain).intact` arm widens to
   `!verifyChain(chain).intact || !(await signatureLayerHolds(ctx, chain))` (or the
   two-step equivalent where the report object is used, finalize:~174), keeping the
   SAME failure arm (`appendChainCompromise(...)`; redeem's enlisted result-first
   refusal). Each site's comment gains one clause: "the AL2 enforcement increment
   folds the signature layer into this same arm".
3. The two cross-record swaps — `verifyPriorLegs` and `verifySupersedes` widen their
   signatures to accept `ctx` (or `{ profiles, signing, store }` — follow each file's
   idiom; the callers hold `ctx`) and add
   `if (!(await signatureLayerHolds(ctx, chain))) return { ok: false };` beside their
   existing intact checks. Their module headers gain the enforcement clause.
4. The comment-finalization grep (Global Constraints) — every reachable "nothing
   enforces"-class comment in code finalized; `git grep -nE "nothing enforces|no
   enforcement|refuses NOTHING|not enforced" -- packages/record` returns ZERO hits
   afterwards (run it, show it).

- [ ] **Step 4: Run tests, gates, commit**

Targeted runs (signing-enforce, signing, the sqlite file — the MINT suite must pass
UNCHANGED), full suite, five gates. Commit:

```bash
git add -A packages/record
git commit -m "AL2 enforcement: the signature layer is load-bearing at every verification site

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: The sanctioned sealed bundle

**Files:** `docs/concept/SPEC.md`, `docs/concept/CONTROLS.md`,
`docs/concept/OPEN-QUESTIONS.md` — EXACTLY the edits below (locate by content; full
before/after; every other character survives). The never-edit rule is LIFTED for
exactly this commit and bundle; it re-arms after.

- [ ] **Step 1: The two tokens**

1. SPEC ~1227: BEFORE `- **AL2 — Signed (an operator-enabled upgrade) [SKETCHED].** Detached signatures over`
   AFTER: the same line with `[PROVEN]` (plain brackets inside the bold span).
2. CONTROLS ~48: the AL2 row's maturity cell, bare `SKETCHED` → `PROVEN`; nothing
   else on the line EXCEPT the clause in Step 2.

- [ ] **Step 2: The two clause rewrites (the SPEC:488 precedent)**

1. SPEC ~1232-1234: BEFORE (whitespace-collapsed) `...enablement granularity and the missing-signature posture are named open decisions (\`OPEN-QUESTIONS.md\`). AL1 stays the default.`
   AFTER: `...enablement granularity and the missing-signature posture are decided on record (\`OPEN-QUESTIONS.md\` §1). AL1 stays the default.`
2. CONTROLS ~48: `(granularity open — \`OPEN-QUESTIONS.md\` §1)` →
   `(granularity decided on record — \`OPEN-QUESTIONS.md\` §1)`.

- [ ] **Step 3: The OQ §1 tails and the OQ §7 opener**

OQ §1's four bullets each gain a tail (reflow to the file's width; the document's
inline-backtick conventions):

1. Granularity: ` **Decided (this build):** per profile, record-homogeneous — a
   record opened under a signing profile is signed whole from its genesis; a profile
   flipping the field is the version-discipline violation §2's convention names.`
2. Missing-signature posture: ` **Decided (this build):** fail-closed into each
   site's existing code — \`chain-compromise\` at the seams, the claim refusals
   (\`prior-leg-unverified\`, \`supersedes-unverified\`) at the cross-record
   verifications.`
3. Key custody: ` **Decided (this build):** an opaque \`keyRef\` beside each detached
   signature, resolved against a host-supplied verifier registry; an unresolvable
   \`keyRef\` fails closed; the library never holds keys.`
4. Authority timestamps: ` **Still open:** the AL2 freshness increment's own design —
   see §4 below.`

(Backslash-backticks above are plan-fence escaping — write plain backticks.)

OQ §7's opener: BEFORE `The mode is sketched (independent re-derivation gated as a required consultation;`
AFTER `The mode was sketched (independent re-derivation gated as a required consultation;`
— ONE word (`is` → `was`), nothing else on the line.

- [ ] **Step 4: Byte-verify, gates, commit**

`git diff -- docs/concept/` must show ONLY: the SPEC:1227 token pair, the
SPEC:1232-1234 clause pair, the CONTROLS:48 pair (token + clause on that row), the
four OQ §1 tail insertions, the OQ §7 opener pair. `grep -rn "SKETCHED"
docs/concept/` afterwards: NO AL2/signing hits (survivors: freshness,
consultation-stale, AL3, live-capture's §9.2 staged references if any, self-test
rows, legends — LIST them). Five gates. Commit (Bash):

```bash
git add docs/concept/SPEC.md docs/concept/CONTROLS.md docs/concept/OPEN-QUESTIONS.md
git commit -m "Move the AL2 marker and record OQ 1 decided: two tokens, four tails, two clauses, one opener

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: The record — enforcement lands

**Files:** `docs/process/implementation-status.md`,
`docs/process/deferral-register.md` (row 17), `CLAUDE.md`, `README.md`, stale
comments the sweep finds. `docs/concept/` sealed again.

- [ ] **Step 1: implementation-status.md** — per the spec's §2: step 8 row (AL2
  increment 2 of 3; the tail = the AL2 freshness increment + the self-test tier);
  the §14 row rewritten (enforcement real at the six sites; the failure mapping; the
  marker EXECUTED with the full bundle enumeration; the REHOMING RESIDUAL in the
  limit column, stated in the honesty register; authority timestamps still open);
  the §5 row checked against the reads-stay-separate ruling; governed count
  UNCHANGED at 1 (stated); the MINT's own "nothing enforces" cells in this file
  falsified by this increment — find and finalize every one (lesson 21).
- [ ] **Step 2: register row 17** (AL2 enforcement landed; freshness + self-test
  remain) + CLAUDE.md + README (AL2 enforced; the marker moved).
- [ ] **Step 3: The sweep — LAST**

```bash
git grep -nE 'enforce|chain-compromise|signature|signing|AL2|nothing enforces|refuses NOTHING|no enforcement|not enforced|named open decisions|granularity open|this increment|later increment|landing|will |not yet' -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis'
git grep -nE 'SKETCHED|The mode is sketched|still open|have none|no producer|down to (one|1)' -- ':!docs/concept' ':!docs/superpowers' ':!docs/analysis' -- '*.md'
```

Judge EVERY hit; HIT-COUNT == VERDICT-COUNT from THIS run.
- [ ] **Step 4:** quotes hand-verified; five gates; commit
  ("Record AL2 enforced: the layer is load-bearing, the marker moved").

---

### Task 4: Exit verification

**Files:** none modified.

- [ ] **Step 1:** porcelain empty, `main`, ALL FIVE gates by name, exact counts.
- [ ] **Step 2: Freeze (against the spec commit 80dcc06)**

```bash
git diff 80dcc06..HEAD -- packages/record/test/byte-stability.test.ts   # MUST be empty
git diff 80dcc06..HEAD -- packages/record/src/chain/encoding.ts          # MUST be empty
git diff 80dcc06..HEAD -- packages/record/src/store/                     # MUST be empty
git diff 80dcc06..HEAD -- docs/concept/                                  # EXACTLY the sanctioned bundle
```

The concept diff must show: 2 token pairs, 2 clause pairs (one shared with
CONTROLS:48's token line), 4 OQ §1 tails, 1 OQ §7 opener pair — and NOTHING else.
Any other content ⇒ BLOCKED with the diff stat.
- [ ] **Step 3: Report** — commit list, exact counts, register rows (17 quoted), the
  step-8 cell, a zero-line for AL2/signing SKETCHED hits in docs/concept, ahead
  count.
