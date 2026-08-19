# Vidimera documentation

Four areas, four different kinds of authority. Knowing which is which matters more here
than in most repositories, because this project treats documentation claims as things that
can be true or false — and says so when they can drift.

| Area | What it is | Its authority |
|---|---|---|
| [`concept/`](concept/README.md) | The ten-document concept set: the idea, the normative spec, the threat model, the scope machinery | **Normative and sealed.** [`concept/SPEC.md`](concept/SPEC.md) is the single normative document; everything else in the repository — code included — is downstream. The set is edited only under explicit sanction through its own scope machinery |
| [`guide/`](guide/concepts.md) | The public usage guide: concepts in ten minutes, getting started, integration, API reference, FAQ | **Derived.** Written from the source and the spec for a reader's convenience. Where the guide and the source disagree, the guide is stale and the source wins — file it as a bug |
| [`process/`](process/implementation-status.md) | Living records: implementation status, the deferral register, the next-phases roadmap, adopted-source provenance | **Authoritative for what is built.** [`process/implementation-status.md`](process/implementation-status.md) is the step-by-step account of what this build does and does not implement — trust it over any summary, including the README's |
| [`superpowers/`](superpowers/INDEX.md) | The increment record: design specs and implementation plans per increment (a few plans carry no spec), indexed chronologically | **Historical.** How each increment was designed and executed; useful for archaeology, binding on nothing |

(`analysis/` holds the point-in-time review, brainstorm, and phase records — dated
snapshots, also historical.)

## Reading orders

**"Should we use this?"** — [`guide/concepts.md`](guide/concepts.md) for the model, then
the README's "What it deliberately does not promise", then
[`concept/ASSURANCE.md`](concept/ASSURANCE.md) for the threat model, then
[`guide/faq.md`](guide/faq.md). Budget an hour; the honesty sections are the product.

**"Get me running."** — [`guide/getting-started.md`](guide/getting-started.md), then
[`guide/integrating.md`](guide/integrating.md) when wiring a real host, with
[`guide/api-reference.md`](guide/api-reference.md) beside you. Know before you start: the
package is not yet published or installable — you work from source in this workspace.

**"I want to inherit, dissect, or rescope the concept."** — the concept set is built for
exactly that. Start at [`concept/README.md`](concept/README.md), whose "How to inherit
this" section is the procedure; [`concept/SCOPING-GUIDE.md`](concept/SCOPING-GUIDE.md)
carries the tier test, the promotion rule, and the rescoping checklist;
[`concept/DECISIONS.md`](concept/DECISIONS.md) will stop you from re-deciding things that
look arbitrary and are not.

**"I'm contributing."** — [`../CONTRIBUTING.md`](../CONTRIBUTING.md) first (the hard rules
live there), then [`process/implementation-status.md`](process/implementation-status.md)
for the current state and [`process/next-phases.md`](process/next-phases.md) for what gates
the next cut.

## One convention worth knowing everywhere

Maturity markers — `[PROVEN]` / `[DESIGNED]` / `[SKETCHED]` — appear throughout the concept
set and are accuracy claims, not aspirations. The legend is in
[`concept/README.md`](concept/README.md); the rule is that a marker moves only when the
behavior actually lands in this repository.
