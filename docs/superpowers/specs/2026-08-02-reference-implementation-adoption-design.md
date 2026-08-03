# Adopting the reference implementation — design

Date: 2026-08-02
Status: proposed

## Purpose

This repository is the home of the library. A reference implementation of this
specification already exists, in a private repository under the same ownership and the same
licence, built over six of the eight build-order steps in `docs/concept/SCOPING-GUIDE.md`
section 7. This design takes the decision to **adopt that code as this repository's
implementation**, rather than re-derive it from the specification text, and sets the terms
under which the adoption happens.

Scope of this document: the decision, its terms, and build-order **step 1 (the kernel)** in
detail. Steps 2–6 follow the same terms and get their own design/plan cycles.

## The decision, and the anti-goal it must answer

`docs/concept/CONCEPT.md` section 7 anti-goal 2 says: *"Do not keep machinery because it is
already written. Scope decisions are made on purpose-fit, not sunk cost."*

Read precisely, that governs **scope** decisions — which capabilities exist — not **sourcing**
decisions. Adopting an existing kernel is not keeping an out-of-purpose capability: the
kernel is KERNEL tier under this set's own tier test (section 1 of the scoping guide), and
its purpose-trace is the confirm loop itself.

The anti-goal does bite in one specific way, and the terms below are built around it:
**a port's shape can cause scope to be inherited by momentum.** Landing the reference
implementation's whole test corpus at step 1 would drag steps 3–5 material in with it, and
would freeze several API names this set deliberately left unfrozen. The answer is
increment-gating, not abstention.

## Evidence base

The decision rests on measurements, not on the availability of the code. Verified:

- The reference implementation's specification and this repository's `docs/concept/SPEC.md`
  have identical section trees — the same 25 numbered units, same order, same titles. A
  word-level diff is roughly 431 added and 423 removed words across 89KB. **This
  repository's spec is the corrected descendant**: it fixes an overclaim on `verifyChain`'s
  bound, narrows the storage-contract C3 carve-out, fixes a BCP-14 register violation in
  section 7, corrects retention terminology in section 13, adds a third AL1 residual in
  section 13A, and states the finalize gate ladder in one place for the first time.
- The refusal registry in section 8 is the reference implementation's minted set **plus
  exactly the three codes for capabilities it never built** (`ack-missing`, `ack-stale`,
  `consultation-stale`).
- Approximately 120 of 1,189 normative lines describe behaviour the reference
  implementation does not implement — roughly 88% coverage. The honest reading of that
  figure: 88% of the spec's lines describe things the existing code does not contradict.
- Its 453 library tests are therefore tests of **this** specification.

## Phase 0 — decisions taken before any code lands

### 0a. `SPEC.md` section 4 states the transition bytes (blocking)

`docs/concept/ARCHITECTURE.md` section 3 claims that because the transition encoding is
library-owned, *"two independent implementations verify each other's chains."* **That claim
is not currently supported by the normative text.** Re-deriving the reference
implementation's frozen digests from scratch exposed three conventions section 4 does not
state:

| Convention | Reference implementation | `SPEC.md` today |
|---|---|---|
| `seq` in the digest input | stringified before serialization | silent; and section 2.1's worked example shows `"seq": 1` as a JSON number |
| `at` precision | ISO-8601 with 3-digit milliseconds | silent; and section 2.1's example shows second precision, no milliseconds |
| number of clock reads inside `finalize` | three | silent |

Verified: an implementation that satisfies section 4 as written, but stamps the finalize
batch from a single clock read, reproduces the first frozen digest and breaks the other
three.

**Decisions:**

1. Section 4 states that `seq` is serialized as a string in the digest input, **with its
   reason** — the protocol envelope must not depend on ECMAScript-specific number
   formatting, which is precisely what makes cross-implementation verification possible.
   This reasoning currently survives only as a source comment in the reference
   implementation.
2. Section 4 states `at` as ISO-8601 UTC with 3-digit millisecond precision.
3. Section 2.1's worked example is corrected to match both.
4. The number of clock reads is **not** made normative. It is an implementation detail, and
   making it normative would be the wrong fix. The consequence is recorded in 0d below.

This work lands before any implementation code, and is the one item on this list that would
be required even if the adoption were rejected.

### 0b. Provenance and the standalone contract

`CLAUDE.md` binds the concept set to reference nothing outside this repository, and asks all
other authored markdown to stay free of external URLs so the repo-wide scan keeps holding.
It does not forbid engineering documents from describing where inherited code came from.

**Decision:** the concept set stays sealed and untouched. Engineering documents — this one,
its plan, and the increment designs — describe the source as "the reference implementation"
and identify commits by short hash where an instruction depends on it, without URLs and
without naming the external repository, package, or any sibling project. This keeps
`pnpm contract-scan` green and keeps the concept set's self-containment intact, while
leaving the instructions executable.

Recorded honestly: this is a narrower reading of the contract than the concept set applies
to itself, and it is taken deliberately rather than by omission.

### 0c. The policy-gate reverse cross-instance direction — fail-close

`docs/concept/OPEN-QUESTIONS.md` section 2 reopens this with **fail-close as the
recommendation on record**, and `docs/concept/ASSURANCE.md` section 7 requires an adopting
project to carry its own decision explicitly.

The reference implementation ships the **permissive** behaviour: the drift gate keys on the
finalize-time profile, so a record opened under a policy-declaring profile and finalized
under a same-id non-declaring instance skips the gate entirely, and the intake validation
throws nothing either.

**Decision: fail-close.** A record carrying a bound `policyDigest`, finalized under a
now-non-declaring profile, refuses. The asymmetry with the forward direction — which
refuses — cuts against the drift-refusal promise.

This decision is taken **now**, before `finalize` is written, for one reason: porting the
gate unedited ships the un-made decision, and **it passes every test the reference
implementation wrote**. There is no failing test to catch it later.

### 0d. Byte-stability pins are compatibility pins, not conformance vectors

Given 0a.4, the reference implementation's four frozen transition digests encode a clock
discipline this spec does not mandate. They are adopted as **byte-compatibility pins against
the inherited implementation**, and a mismatch is a finding to adjudicate, never evidence
that this repository is wrong.

The day-one conformance vectors with no envelope and no clock dependency are the five
RFC 8785 vectors carried in the reference implementation's fixtures, plus the vectors
published in RFC 8785 itself, which section 4 already cites.

### 0e. `noUncheckedIndexedAccess` stays on

Measured: compiling the inherited source under this repository's `tsconfig.base.json`
produces a 309-error delta, of which `noUncheckedIndexedAccess` accounts for **100%**.
Isolated by control compiles, every other difference — ES2023 to ES2022, `isolatedModules`,
dropping `esModuleInterop` and `declaration`, TypeScript 5.9 to 7.0 — contributes exactly
zero. Of the 283 sites, roughly 226 are test-side and mechanical; the source-side remainder
concentrates in the chain-replay, store, and gate-bearing kernel files.

**Decision: keep the flag on, repository-wide, and fix every site by hand.** The
concentration is the argument: the flag forces a line-by-line review of every index read on
exactly the paths whose correctness is the product. A per-directory exemption for inherited
code would skip the review where it is worth most.

Two constraints on the fix pattern:

- The non-null assertion operator is not an acceptable fix. It defeats the flag, and it
  collides with the linter's `noNonNullAssertion` rule.
- One site is a typing gap rather than a missing guard: the finalize success path reads the
  last element of a batch result that is guarded non-empty a few lines above. There the fix
  is an explicit documented invariant — or a non-empty-array result type — not a defensive
  narrowing that implies a reachable undefined.

### 0f. RFC 8785 serialization is hand-written

`packages/record` declares zero runtime dependencies. The inherited code depends on a
49-line Apache-2.0 canonicalization package at two call sites; its only behaviour beyond
`JSON.stringify` is sorting object keys recursively.

**Decision: hand-write it.** Vendoring would create this port's only attribution
obligation, and an honest attribution names an external project — which is the one thing
0b's narrow reading is meant to avoid. Roughly 50 lines in one file is a proportionate
cost for keeping the zero-dependency posture and the contract simultaneously.

A correct RFC 8785 implementation produces identical bytes, so the digest pins should hold
unchanged; if they do not, the divergence is the finding. The known coverage gap: the five
inherited vectors exercise key ordering, number formatting, string escaping, nesting, and
empty containers, but **not** BigInt, `toJSON`, or symbol-keyed properties. Tests for those
three are authored fresh as part of this increment.

## The port boundary

The line is drawn at **whether an artifact encodes a decision**.

| Class | Treatment |
|---|---|
| Tests, test helpers, canonicalization vectors | Adopt, increment-gated |
| Pure leaf source — transition encoding, profile digest, terminality derivation, id generation, agent surface, kernel context, outcome constructors | Adopt |
| Configuration schema and its construction-time feature guards | Adopt, with guards **re-armed** |
| Storage conformance suite | Adopt at step 2, memory-backed first |
| Gate-bearing kernel — finalize, open, redeem, memory store, chain replay | Adopt as the starting text, then **review every gate against `SPEC.md` section 9 before it lands**, because these carry decisions 0c and 0e |
| Specification, changelog, architecture archive, per-slice design corpus, review diffs | Leave behind — this repository's concept set already supersedes them |
| Example packages | Not in scope; the build order does not mention examples, and admitting them is a scope decision requiring its own purpose-trace |

## Build-order step 1 — the kernel

### Base

Take the source tree as it stood at the reference implementation's **kernel-increment
close** (short hash `c0f0f75`), not its head. That commit is a pre-cut, self-consistent,
green step 1: 22 files, roughly 2,300 lines, a 10-code registry, the five-method storage
interface, and a sequential `finalize` that has not yet had steps 3 through 6 threaded
through it. It typechecks with 26 errors under this repository's settings against 61 at
head, and it matches the build order's step 1 description almost word for word.

This is what removes the hardest problem in the port: at head, `finalize` spans build steps
1, 3, 4, 5 and 6, and `open` spans 1, 2, 3, 4 and 6. The cut already exists in history.

### Deltas to apply on top of the base

1. Take the **head** version of the staging module, so the stage-side producer of
   `unknown-leg` exists at step 1 and section 8's core registry claim stays true.
2. Re-apply four fixes made after the base commit: the canonicalizability guard on the
   reviewed-surface input; `refusalCode` present-iff-present on the review view; the
   `redeeming` arm of the compromise fallback; and the loud-throw closure that replaced two
   fail-open clamps onto a default leg.
3. **Re-arm the construction-time feature guards.** The reference implementation
   progressively lifted them as capabilities landed; this repository is at step 1 and needs
   them armed. The base commit's configuration module already has them in that state. Every
   guard names the spec section that will lift it.
4. Apply decision 0e to all 26 typecheck sites.
5. Reserve the `(5.7)` rung in the gate ladder's numbering now. The findings increment adds
   it at step 7; if the slot is not reserved, that increment renumbers a ladder whose
   adjacent-pair order tests are already pinned.
6. Substitute the hand-written serializer per 0f.

### Tests for this increment

Adopt only the step-1 subset. The inherited corpus is 26 files and 10,435 lines, but roughly
3,350 of those lines are redemption, multi-leg and consultation material belonging to steps
3 through 5.

Runner migration is one import line per file — measured, with the full corpus passing 453 of
453 in 1.3 seconds under this repository's test runner against `src/`, with no build step and
no changes to any of its 1,525 assertion calls or module specifiers.

Two additional adoptions at this increment:

- The three shared test doubles — a tampering store, a counting store, and a
  race-once store — which are what make tamper cases, append-count invariants and race arms
  writable at all.
- A storage-constraints test file that exists **only** at the base commit; it was deleted at
  head when the conformance suite replaced it, and the conformance suite does not arrive
  until step 2.

### The API-surface consequence, accepted explicitly

Adopting the tests fixes several names that the concept set deliberately left unfrozen —
among them the in-memory store's exported name, the clock-injecting constructor, the sweep
entry point, the effect descriptor type, a record read, and both surface types. None appears
anywhere in `docs/concept/`, and `ARCHITECTURE.md` section 2 states the read set is
deliberately not frozen.

**Decision: accept the inherited names at step 1, and record them in the deferral register
as a naming review due before the 0.1 cut.** The alternative — renaming during the port —
mixes two kinds of change in one increment.

One name is **not** accepted silently: `SPEC.md` section 12 describes the sweep as the
operator iterating due records, granting no append authority of its own, while the inherited
code ships it as a library call. That is the same behaviour behind a different surface, and
the surface follows the spec.

## Standing rules for the whole port

| Rule | Reason |
|---|---|
| Run the linter's safe autofix only; **never** its unsafe mode | Verified: unsafe mode rewrites a decimal literal in the canonicalization vectors to a named mathematical constant, changing its serialization. The tree still typechecks with zero errors while two tests fail. |
| Prove every autofix with the test suite, never the typechecker | Same reason, stated as a discipline |
| Extend `scripts/contract-scan.mjs` to TypeScript sources | The inherited source carries **313 pointers** (210 in `src`, 103 in tests) into a design-document and task numbering scheme that does not exist here — not the "roughly 900" first estimated here. Measured directly: running the scan against this repository's imported `packages/record/src` returns exactly 210 findings, all in `src`; the 103-in-tests figure is carried consistently elsewhere in the companion plan (Tasks 6 and 22), which this repository's test corpus has not yet reached. The scan reads tracked markdown only, so those land invisibly. Its own header anticipates the extension. |
| Adding `@types/node` takes **two** edits | The devDependency **and** a `types` entry in `tsconfig.base.json`. TypeScript 7 does not auto-discover where 5.9 did. Verified: without both, the first adopted test file fails `pnpm typecheck`. |
| A maturity marker moves only on a green run **here** | Already `CLAUDE.md`'s rule. It is the honest resolution: the tests survive the runner change untouched, but nothing survives the 283 strictness edits untouched. |
| One cluster per increment; spec-moves-to-truth at each exit | The inherited process discipline, unchanged |

## Verification for step 1

- `pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm contract-scan` green
  locally and on CI.
- The adopted step-1 test subset passes with no skips.
- The five canonicalization vectors pass against the hand-written serializer, plus fresh
  BigInt, `toJSON` and symbol-key tests.
- The four byte-compatibility digests either match or produce an adjudicated finding.
- Adjacent-pair order tests exist for every adjacent gate pair present at step 1.
- Every construction-time feature guard for an unimplemented capability throws, with the
  spec section that lifts it named in the message.
- No `docs/concept/` file is modified by this increment, except the section 4 and 2.1
  corrections of decision 0a, which land as their own commit before any code.

## Register items this design touches

- Deferral entries 2 and 3 have both **fired** — the repository has a remote and CI has run
  green. Entry 2 is satisfied and retires; entry 3's hardening (a permissions block, a
  concurrency group, branch-filtered push triggers) is still absent from the workflow and
  becomes actionable now.
- Entry 4's trigger fires when a second workspace package lands, which is step 2, not this
  increment.
- New entries this design creates: the API naming review before the 0.1 cut; the contract
  scan's extension to TypeScript sources; the BigInt / `toJSON` / symbol vector gap if those
  tests are not authored in this increment.

## Knowledge to re-author, not port

Held over as content for this repository's own register and documents, in its own words:

- Two open decisions from the reference implementation's registers have **no counterpart
  here**: the programmatic contract for a detached signer, and signing synchrony together
  with the signer-outage failure class. Both belong under `OPEN-QUESTIONS.md` section 1 as
  named sub-decisions, and the reference implementation's record says the enablement
  granularity question must be settled first. Roughly one page; it is the only decision work
  otherwise lost.
- Four concrete findings from the reference implementation's own analyses, which a fresh
  build would otherwise re-discover: a duplicated reserved-kind literal in two modules with
  no test pinning them equal; an asymmetric misuse guard where one outcome constructor
  throws and its neighbour accepts anything; **missing adjacent-pair order tests on two
  gates**, which is a violation of the exact discipline this repository adopts as binding;
  and a masking-scope fixture for a validation throw.
- Its findings-and-acknowledgments design is already carried normatively by `SPEC.md`
  section 10.2. Four residuals are not: a test plan, a composite pin asserting that an
  earlier-gate refusal appends **zero** consultation and zero finding transitions, the
  requirement that the coverage gate and the review view's derived coverage be one shared
  function, and a worked example.

## Out of scope

Steps 2 through 8; example packages; publish tooling; the assurance-level-2 signing design;
any change to the concept set beyond decision 0a.
