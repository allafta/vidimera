# @vidimera/record

**Durable, content-bound, hash-chained, operator-replayable records of human
confirmations over AI-drafted actions.**

An AI agent drafts a real action — a timesheet, a payment, an order, a firewall change.
A human says "yes." A downstream system executes it. This library records *that yes*:
bound to the exact content the human saw, under an identity established by the transport
rather than claimed in the payload, and chained so that a later edit to the record is
detectable on replay.

It does not intercept tool calls, execute the effect, evaluate policy, authenticate
anyone, or render a review UI. Those layers stay the host's. It records the decision
over what they produce, and nothing else.

> **Status: not yet published.** The package is pre-0.1 and consumed from source in its
> repository — `npm install @vidimera/record` does not exist as an option yet. This
> line flips at the 0.1 cut.

## Install

```text
npm install @vidimera/record
```

Requires Node 22.16 or newer. Importing the package loads `node:sqlite` (the embedded
`SqliteStore` is re-exported from the entry point), which current Node lines still flag
as experimental — the one-line warning on first import is expected, and
`node --disable-warning=ExperimentalWarning` silences it.

## What it looks like

```ts
import { create, MemoryStore } from '@vidimera/record';

const { agent, operator } = create({
  profiles: [
    {
      id: 'finance.invoice-approval.v1',
      subject: { canonicalizerRef: 'finance.invoice.v1' },
      legs: [{ id: 'approver-decide', allowedAuthorities: ['session:ap-console'] }],
      captureMode: 'staged',
      expiry: { ttl: 3600 },
    },
  ],
  store: new MemoryStore(),
  canonicalizers: { 'finance.invoice.v1': (content) => content },
});

const invoice = { invoiceId: 'INV-1042', payee: 'Acme AB', amount: 41250, currency: 'SEK' };

// The agent may stage a draft. It cannot decide anything — its handle has no such method.
const staged = await agent.stage(invoice, 'finance.invoice-approval.v1', 'invoice:INV-1042');
if (staged.status !== 'ok') throw new Error(staged.code);

// The operator opens the record, shows it, and finalizes the human's decision.
const opened = await operator.open(staged.value.stagedRef);
if (opened.status !== 'ok') throw new Error(opened.code);

const decision = await operator.finalize(
  opened.value.recordId,
  { principal: 'user:alice', authority: 'session:ap-console' }, // from the session, not the payload
  invoice,                                                      // re-digested here; drift refuses
  {
    figures: { amountShown: '41 250,00', currencyShown: 'SEK' }, // what the screen actually rendered
    checker: { principal: 'svc:review-surface', authority: 'mtls:review-surface' },
  },
);
```

What lands in storage is a chain, not a status row (real output, elided for width):

```text
seq 1  opened                 { profileId, profileDigest, legId, subjectRef, contentDigest }
seq 2  consultation-recorded  { kind: 'chain-verify', checker: system:chain-verify, verdict: 'pass' }
seq 3  consultation-recorded  { kind: 'facts', checker: svc:review-surface, payloadDigest, verdict: 'pass' }
seq 4  confirmed              { actor: { principal: 'user:alice', authority: 'session:ap-console' } }
```

Each transition carries the digest of the one before it, so deleting or reordering seq 2
is evident at seq 3. `operator.replay(recordId)` folds the chain back into a record;
`operator.verifyChain(recordId)` recomputes every link and reports the first break. The
content itself is never persisted — only its digest is.

## What it deliberately does not promise

- **It is not non-repudiation.** The base layer (AL1) is tamper-*evident* against
  non-recomputing edits only — a tamper to the *last* transition in a chain is not
  distinguishable from that transition never having existed. Detached signing (AL2) is
  the built upgrade for insider resistance; external anchoring (AL3) is documented and
  deliberately inactive.
- **It proves fidelity, not validity.** A record shows what was reviewed and confirmed —
  never that the content was correct. A digest binds a hallucinated or malicious draft
  just as faithfully as a good one. Prevention lives upstream, in layers the library
  does not own.
- **The operator is the records' sole consumer.** Proving anything to an outside party —
  assessor re-verification, published report formats, conformance claims — is out of
  scope by design, not merely unbuilt.

## Documentation

The repository carries the full set: `docs/guide/` (concepts, getting-started,
integrating, api-reference, faq) and `docs/concept/` (the normative `SPEC.md`, and the
threat model with its named blind windows, `ASSURANCE.md`). Every guarantee is stated
with its limit in the same breath — the honesty sections are the product.

## License

Apache-2.0.
