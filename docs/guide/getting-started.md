# Getting started

This walks you from a clean clone to your first verified decision record — including your
first *refused* one, which is half the point of the library.

**Two ways to run this page:** as a consumer, `npm install @vidimera/record` (published
0.1.0, 2026-08-19) and import from `'@vidimera/record'`; or as a contributor, from source
inside this repository's workspace — which is exactly how its own 600-plus tests run, and
what the walkthrough below does (its imports are the workspace-relative form; swap them
for the package name in your own project). The code below was executed against this tree
before being written down.

## Setup

Requires Node 22.16+ and pnpm (`pnpm@11.18.0` is pinned; `corepack enable` honors it, or
`npm install -g pnpm`).

```text
git clone <this repository>
cd vidimera
pnpm install
pnpm test        # everything below assumes a green suite
```

## Where experiment code goes

The zero-friction path is a scratch test file under `packages/record/test/` run with
vitest — you get the workspace's TypeScript config and imports for free:

```text
packages/record/test/scratch.test.ts     # create it
pnpm vitest run packages/record/test/scratch.test.ts
```

Inside the workspace you import from the source entry point:

```ts
import { create, MemoryStore } from '../src/index.js';
```

(`import { create, MemoryStore } from '@vidimera/record'` is the published form your own
project uses; inside this workspace, source-relative imports are the path.) Keep scratch
files out of `git add` — the contract scan and CI
read every *tracked* TypeScript file, and your scratch file is not written to that bar.

## First record, end to end

```ts
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { type Canonicalizer, type ConfirmProfile, create, MemoryStore } from '../src/index.js';

test('my first record', async () => {
  // 1. A canonicalizer projects your domain content into a plain, JSON-safe structure —
  //    the deterministic shape that gets digested. For plain-object content, identity is fine.
  const invoiceCanonicalizer: Canonicalizer = (content) => content;

  // 2. A profile declares what this kind of decision requires.
  const profile: ConfirmProfile = {
    id: 'finance.invoice-approval.v1',
    subject: { canonicalizerRef: 'finance.invoice.v1' },
    legs: [{ id: 'approver-decide', allowedAuthorities: ['session:ap-console'] }],
    captureMode: 'staged',
    expiry: { ttl: 3600 }, // seconds: an open record lapses after an hour
  };

  // 3. Construction is loud: a config the library cannot honor throws HERE, never later.
  const { agent, operator } = create({
    profiles: [profile],
    store: new MemoryStore(),
    canonicalizers: { 'finance.invoice.v1': invoiceCanonicalizer },
  });

  const content = { invoiceId: 'INV-1042', payee: 'Acme AB', amount: 41250, currency: 'SEK' };

  // 4. The agent stages a draft. The content is digested; it is never persisted.
  const staged = await agent.stage(content, 'finance.invoice-approval.v1', 'invoice:INV-1042');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;

  // 5. The operator opens the record: genesis binds profile, leg, subject, content digest.
  const opened = await operator.open(staged.value.stagedRef);
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;
  const recordId = opened.value.recordId;

  // 6. Review: the content-free projection a review surface renders from.
  const view = await operator.review(recordId);
  assert.equal(view.status, 'ok');
  if (view.status !== 'ok') return;
  assert.equal(view.value.state, 'open');
  assert.equal(view.value.subjectRef, 'invoice:INV-1042');

  // 7. The human decides. Identity comes from the transport (your session middleware),
  //    never from the payload. `facts` binds what the review surface actually rendered.
  const decided = await operator.finalize(
    recordId,
    { principal: 'user:alice', authority: 'session:ap-console' },
    content,
    {
      figures: { amountShown: '41 250,00', currencyShown: 'SEK' },
      checker: { principal: 'svc:review-surface', authority: 'mtls:review-surface' },
    },
  );
  assert.equal(decided.status, 'ok');
  if (decided.status !== 'ok') return;
  assert.equal(decided.value.state, 'confirmed');

  // 8. Replay and verify — from durable storage alone.
  const record = await operator.replay(recordId);
  assert.equal(record.state, 'confirmed');
  assert.equal(record.actor?.principal, 'user:alice');

  const report = await operator.verifyChain(recordId);
  assert.equal(report.intact, true);

  const chain = await operator.readChain(recordId);
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'consultation-recorded', 'consultation-recorded', 'confirmed'],
  );
});
```

Four transitions — and notice you only asked for two of them. The genesis `opened` and the
final `confirmed` bracket two consultations the library recorded on its own: a
`chain-verify` (the pre-decision integrity check, minted under the library's own system
identity) and the `facts` reviewed-surface binding you supplied. Here is the real recorded
`confirmed` transition, verbatim:

```json
{
  "recordId": "29b7dd57-02d0-4eeb-aeb1-ac656661b6b1",
  "seq": 4,
  "at": "2026-08-18T20:58:31.836Z",
  "kind": "confirmed",
  "payload": {
    "actor": { "principal": "user:alice", "authority": "session:ap-console" }
  },
  "prevHash": "sha256:19e37d41447fbae7e6de16b9bb17cb436ed894b595e91fb3dd1cb9ee13cb3456"
}
```

`prevHash` is the digest of transition 3 — the link that makes deletion and reordering
evident. The reviewed content appears nowhere; only `contentDigest` in the genesis payload
does.

## Your first refusal

The refusal path is not an error path — it is the other half of the record model. Give the
approver a tampered payload and watch what gets recorded:

```ts
test('drift is refused, and the refusal itself is evidence', async () => {
  const profile: ConfirmProfile = {
    id: 'finance.invoice-approval.v1',
    subject: { canonicalizerRef: 'finance.invoice.v1' },
    legs: [
      {
        id: 'approver-decide',
        allowedAuthorities: ['session:ap-console'],
        // Listing a code here makes that refusal TERMINAL: it appends open → refused.
        // Unlisted, the record would stay open for a corrected retry instead.
        terminalRefusals: ['content-drift'],
      },
    ],
    captureMode: 'staged',
    expiry: { ttl: 3600 },
  };
  const { agent, operator } = create({
    profiles: [profile],
    store: new MemoryStore(),
    canonicalizers: { 'finance.invoice.v1': (c) => c },
  });

  const reviewed = { invoiceId: 'INV-1042', amount: 41250 };
  const staged = await agent.stage(reviewed, 'finance.invoice-approval.v1', 'invoice:INV-1042');
  if (staged.status !== 'ok') return;
  const opened = await operator.open(staged.value.stagedRef);
  if (opened.status !== 'ok') return;

  // Between review and decision, the content changed. The "yes" must not stick to it.
  const tampered = { invoiceId: 'INV-1042', amount: 91250 };
  const outcome = await operator.finalize(
    opened.value.recordId,
    { principal: 'user:alice', authority: 'session:ap-console' },
    tampered,
    {
      figures: { amountShown: '41 250,00' },
      checker: { principal: 'svc:review-surface', authority: 'mtls:review-surface' },
    },
  );

  // Refusals are RETURNED, never thrown — this is a domain outcome, not an exception.
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'content-drift');
  assert.equal(outcome.class, 'refusal');

  // And because the leg declared it terminal, the refusal is ON THE CHAIN:
  const record = await operator.replay(opened.value.recordId);
  assert.equal(record.state, 'refused');
  assert.equal(record.refusalCode, 'content-drift');
});
```

Both tests above pass against this tree, verbatim.

## What just protected you

- **Content binding:** the confirmation could not attach to bytes the reviewer never saw —
  the digest comparison at finalize refused instead.
- **Identity by transport:** the `identity` argument is the only identity read; a
  payload-carried "approved by manager" is inert. Try finalizing with
  `authority: 'session:something-else'` — you get `identity-authority-refused`.
- **Returned refusals:** your control flow handles decisions and refusals in one shape;
  exceptions stay reserved for genuine caller errors (try `operator.review('nonsense')` —
  that throws, because an unknown record id is a bug in the caller, not a decision).
- **Replayability:** everything you asserted at the end came from the store alone, via
  replay — no in-memory state survived to vouch for anything.

## Where next

- The whole model in ten minutes: [`concepts.md`](concepts.md)
- Real stores, real identity, the effect seam, signing, probes:
  [`integrating.md`](integrating.md)
- Every call and type: [`api-reference.md`](api-reference.md)
