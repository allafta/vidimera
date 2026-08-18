# Vidimera — the concept, standalone

**A domain-agnostic verifiable-decision-record library: durable, content-bound, hash-chained,
operator-replayable records of human confirmations over AI-drafted actions.**

This is a **concept-inheritance documentation set**. It is completely standalone — no
external repositories, files, or projects are referenced — and it presents the Vidimera
concept whole, at its deliberate scope: an embedded library, built to the bar of
regulated-industry-shaped hosts, whose records are consumed by the operator alone. That
scope spans the shipped-and-proven kernel, the profile-declared governed controls, and the
operator's own assurance tier; capabilities meaningful only to an outside party are out of
scope by design. A future project can take this set and implement it whole, dissect it, or
rescope it — with the reasoning that produced this shape available rather than lost.

## The concept in one paragraph

An AI agent drafts a real action; a human decides over it; the decision — not the mutation —
is what Vidimera governs. The library binds the confirmation to the exact content reviewed
(and to what the reviewer actually saw), establishes the decider's identity from the
transport rather than the payload, chains every state change so deletion or reordering is
detectable on replay (tamper-evident against non-recomputing edits of non-head transitions —
the AL1 bound; signing is the documented upgrade), and gives the operator functions to
replay and verify its own records from durable storage alone. Where a host declares them, governance controls attach to the same record
model — multi-party separation of duties, single-use effect redemption, required
consultations, eligibility and policy-drift gating, findings with named-magnitude
acknowledgments — every gate fail-closed, every guarantee stated with its limit in the same
breath.

## The document set

| Document | Type | What it holds |
|---|---|---|
| [`CONCEPT.md`](CONCEPT.md) | identity | Problem, thesis, purpose statement, the four non-negotiable principles, the honesty discipline, anti-goals |
| [`SPEC.md`](SPEC.md) | **normative** | The complete data model and API: records, transitions, chaining, identity, the refusal registry, profiles, all controls, the store contract, privacy, security, the assurance ladder |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | narrative | How it fits and why: capability split, chain model, outcome model, the gate ladder, the store, design invariants |
| [`CONTROLS.md`](CONTROLS.md) | catalog | Every capability with tier, switch, maturity, honest bound; cross-industry applicability |
| [`ASSURANCE.md`](ASSURANCE.md) | threat model | What is defended, the named blind windows, what is out of scope, the AL1→AL3 gradient |
| [`SCOPING-GUIDE.md`](SCOPING-GUIDE.md) | method | The tier test, promotion rule, the four scope commitments, build-vs-buy honesty, a proven eight-step build order, the rescoping checklist |
| [`DECISIONS.md`](DECISIONS.md) | rationale | Thirty load-bearing design decisions with their whys and re-deciding costs (costs spelled out where not implicit) |
| [`OPEN-QUESTIONS.md`](OPEN-QUESTIONS.md) | honesty | The named open decisions an inheriting project must take |
| [`GLOSSARY.md`](GLOSSARY.md) | vocabulary | The working vocabulary, defined once |

## Maturity legend (used throughout)

- **[PROVEN]** — implemented and test-proven in a reference implementation of the spec
  (including cross-backing byte-identical-chain proofs over in-memory, embedded-SQL, and
  server-SQL stores).
- **[DESIGNED]** — fully specified with every design decision closed; not yet implemented.
- **[SKETCHED]** — documented direction; named open decisions about the behavior itself
  remain (`OPEN-QUESTIONS.md`).

A marker may carry a bracketed qualifier naming what its maturity is conditional on
(e.g. `[SKETCHED — AL2-dependent]`).

The committed scope is presented *whole* at every maturity: an inheriting project decides
its own scope against the full picture, not against what happened to be built first.

## How to inherit this

1. Read `CONCEPT.md` — if the four principles or the honesty discipline don't fit your
   goal, this is not your concept; fork knowingly.
2. Read `SPEC.md` for the model and `ARCHITECTURE.md` for the shape.
3. Run the rescoping checklist in `SCOPING-GUIDE.md` §8: state your host class and
   consumer, tier every capability in `CONTROLS.md`, write purpose-traces for what you
   keep, decide the `OPEN-QUESTIONS.md` items your scope activates, and record — never
   silently drop — what you cut (anti-goal #4, `CONCEPT.md`).
4. Build in the proven order (`SCOPING-GUIDE.md` §7), with the process disciplines that
   made it work: construction-time feature guards, byte-stability pins, adjacent-pair
   order tests, spec-moves-to-truth at every increment's exit.
5. Re-read `DECISIONS.md` before changing anything that feels arbitrary — most of it
   isn't.

## License

This documentation set is licensed **Apache-2.0**; the license text ships in this
repository's `LICENSE` file. The name, the model, and every honesty guard travel together:
whatever an inheriting project keeps, it keeps the discipline of stating each guarantee with
its limit in the same breath.
