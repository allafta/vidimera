# Vidimera

**Durable, content-bound, hash-chained, operator-replayable records of human confirmations
over AI-drafted actions.**

An AI agent drafts a real action — a timesheet, a payment, an order, a firewall change.
A human says "yes." A downstream system executes it. Vidimera is the library that records
*that yes*: bound to the exact content the human saw, under an identity established by the
transport rather than claimed in the payload, and chained so that a later edit to the
record is detectable on replay.

It does not intercept tool calls, execute the effect, evaluate policy, authenticate anyone,
or render a review UI. Those layers stay the host's. It records the decision over what they
produce, and nothing else.

## The gap it fills

Every agent framework can *gate* an action on human approval — an interrupt, a
`needs-approval` flag, a permission hook. Far fewer can *show, afterwards, to someone who
was not there*, that a specific human took responsibility for a specific action, having
seen specific content, under specific rules. The approval is usually a mutable status field
or an in-memory checkpoint, not durable evidence.

Three failure modes cluster at that seam, and each has a control here:

| Failure | What it looks like | The control |
|---|---|---|
| **Render-to-decide drift** | The content shown to the reviewer is not the content that executes | The confirmation is bound to a digest of the reviewed content; a mismatch at decision time is refused, not confirmed |
| **Payload identity** | The "yes" arrives as unauthenticated data — "the chat says the manager approved" | The deciding identity is read only from the transport-established assertion, never from the payload |
| **Evaporating evidence** | Nobody can reconstruct what exactly was confirmed, by whom, having seen what | Every state change is an append-only, hash-linked transition the operator can replay and verify from storage alone |

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

Each transition carries the digest of the one before it, so deleting or reordering seq 2 is
evident at seq 3. `operator.replay(recordId)` folds the chain back into a record;
`operator.verifyChain(recordId)` recomputes every link and reports the first break. The
content itself is never persisted — only its digest is.

A runnable version of this walkthrough — including what a refused decision looks like — is
in [`docs/guide/getting-started.md`](docs/guide/getting-started.md). Where a host profile
declares them, further controls attach to the same record model — multi-leg separation of
duties, single-use effect redemption, required consultations, eligibility and policy-drift
gating, findings with acknowledgments, live capture, detached signing — plus verified
recovery linkage between records at open time.

## What it deliberately does not promise

Stated here rather than buried, because the honesty discipline is part of the product:

- **It is not non-repudiation.** The base layer (AL1) is tamper-*evident* against
  non-recomputing edits only, and a tamper to the *last* transition in a chain is not
  distinguishable from that transition never having existed — a singly-linked hash chain
  protects a transition through the *next* link. Detached signing (AL2) is the documented
  upgrade for insider resistance, and it is built; external anchoring (AL3) is documented
  and deliberately inactive.
- **It proves fidelity, not validity.** A record shows what was reviewed and confirmed —
  never that the content was correct. A digest binds a hallucinated or malicious draft just
  as faithfully as a good one. Prevention lives upstream, in layers the library does not own.
- **It is not compliance.** Adopting it makes no host compliant with any law or regulation,
  and a record makes no claim about the competence, attention, or independence of the human
  it names.
- **Control operated is not judgment sound.** Separation of duties evidences distinct
  principals; two colluding humans satisfy it.
- **The operator is the sole consumer.** Proving anything to an outside party — assessor
  re-verification, published report formats, conformance claims — is out of scope by
  design, not merely unbuilt.

The full threat model, with its named blind windows, is
[`docs/concept/ASSURANCE.md`](docs/concept/ASSURANCE.md).

## Status

**The concept is complete and normative.** Ten self-contained documents at
[`docs/concept/`](docs/concept/README.md), with
[`docs/concept/SPEC.md`](docs/concept/SPEC.md) as the single normative document the rest
defer to. Maturity markers (`[PROVEN]` / `[DESIGNED]` / `[SKETCHED]`) are accuracy claims,
not aspirations: a marker moves only when the behavior actually lands in this repository.

**The implementation has finished its eight-step build order.** The kernel confirm loop,
three store backings held equivalent by a shared conformance suite and cross-backing
byte-identity proofs (in-memory, embedded-SQL, and the server-SQL
`@vidimera/store-postgres`), multi-leg separation of
duties, the effect seam with single-use redemption, required consultations, eligibility and
policy-drift gating, findings and acknowledgments, recovery, live capture, AL2 detached
signing, and an operator-assurance self-test tier are all built and tested.

**The package is not yet published, in the same breath — deliberately.** The publish
tooling exists: `packages/record/package.json` carries a real `exports` map (`.` and
`./probes`), `types`, `files`, and a `build` script; `pnpm build` compiles `dist/`; and
every CI run packs the tarball and installs it into a scratch consumer project
(`pnpm smoke`). But the package stays `private: true` until the 0.1 cut, so
`npm install @vidimera/record` does not exist as an option yet — you can read it, run it,
fork it, and build on it from source in this workspace. Publish tooling is row 1 of
[the deferral register](docs/process/deferral-register.md), held open until the release
workflow is exercised at the cut; the pre-0.1 API review (row 6) completed 2026-08-19, so
the exported names are review-ratified.

For the record itself rather than a summary of it, read
[`docs/process/implementation-status.md`](docs/process/implementation-status.md) — the
authoritative, step-by-step account of what this build does and does not implement, with
gate outputs. [`docs/process/next-phases.md`](docs/process/next-phases.md) names what gates
the next cut and what stays deliberately out of scope.

## Documentation

Start at [`docs/README.md`](docs/README.md), which maps the whole set. The short version:

| If you want to | Read |
|---|---|
| Understand the model in ten minutes | [`docs/guide/concepts.md`](docs/guide/concepts.md) |
| Run your first record | [`docs/guide/getting-started.md`](docs/guide/getting-started.md) |
| Wire it into a host application | [`docs/guide/integrating.md`](docs/guide/integrating.md) |
| Look up a call or a type | [`docs/guide/api-reference.md`](docs/guide/api-reference.md) |
| Know what it refuses to promise | [`docs/guide/faq.md`](docs/guide/faq.md) |
| Read the normative contract | [`docs/concept/SPEC.md`](docs/concept/SPEC.md) |
| Inherit, dissect, or rescope the concept | [`docs/concept/SCOPING-GUIDE.md`](docs/concept/SCOPING-GUIDE.md) |
| Contribute | [`CONTRIBUTING.md`](CONTRIBUTING.md) |

## Development

Requires Node 22.16+ and pnpm (`pnpm@11.18.0` is pinned in `package.json`; corepack honors
the pin).

```text
pnpm install
pnpm typecheck      # tsc strict, no emit — both packages
pnpm lint           # Biome (CI also runs the stricter lint:strict)
pnpm test           # vitest — includes a real embedded Postgres for the server backing
pnpm build          # compile both packages to dist/
pnpm smoke          # pack, install into a scratch project, run — the consumability gate
pnpm contract-scan  # the standalone-contract scan — exit 0, no output, when clean
pnpm api-sync       # every exported name must appear in the API reference
```

All of these run in CI on every push to `main` and every pull request. `pnpm contract-scan`
is the one that will surprise you: this repository's documentation references nothing
outside itself, so an external URL in tracked markdown is a build failure by design (the
spec's `example.com` worked examples are the intended exception).
[`CONTRIBUTING.md`](CONTRIBUTING.md) explains why, and what else here is load-bearing.

## Contributing

Issues and pull requests are welcome — read [`CONTRIBUTING.md`](CONTRIBUTING.md) first. It
is short, but this repository has rules that are not guessable from convention: the concept
set is sealed, the byte-stability digests are an oracle rather than an assertion to update,
and a change to the four principles is a fork of the concept, not a pull request.

Conduct expectations are in [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Security reports go
through [`SECURITY.md`](SECURITY.md) — please do not open a public issue for a
vulnerability.

## License

Apache-2.0 — see [`LICENSE`](LICENSE). The name, the model, and every honesty guard travel
together: whatever an inheriting project keeps, it keeps the discipline of stating each
guarantee with its limit in the same breath.
