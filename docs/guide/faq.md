# FAQ

The questions that decide whether this library is for you — answered with the limits in the
same breath, because that discipline is the product. The authoritative versions of these
answers live in [`../concept/CONCEPT.md`](../concept/CONCEPT.md) and
[`../concept/ASSURANCE.md`](../concept/ASSURANCE.md).

## Does adopting this make us compliant with anything?

No, and it never will claim to: adopting the library makes no host compliant with any law
or regulation. A record is evidence that a human took responsibility for a
draft — never a conformity assessment. The library is built to the bar that
regulated-industry-shaped hosts set, which buys you a carefully designed evidence layer,
not a compliance status. It also makes no claim about the competence, attention, or
independence of the human whose decision it captures.

## Is this non-repudiation?

No — and the documentation never uses that word for any level of it. The gradient, stated
honestly: the base layer (AL1) is tamper-*evident* against non-recomputing edits; AL2
(detached signing, built) is insider-resistant when the signing key is held outside the
insider's boundary, every registered profile signs, and no signature outlives an append that
never committed — the last met when the configured sidecar is the store's own on the reference
stores, and open for a separate sidecar; AL3 (external anchoring) is documented and
deliberately inactive.
None of them binds a human in the way "non-repudiation" implies to a lawyer.

## Can it stop a malicious operator?

Mostly no, and it says so. The operator holds the storage; an operator who rewrites a chain
and recomputes every digest defeats AL1 by construction — AL1's claim is that *casual and
non-recomputing* tampering of non-head transitions is evident on replay (the current chain
head is the named blind spot), which already covers most accident and most laziness. AL2 raises the bar to "compromise the signing key too," which is real if the
key custodian is separate from the storage admin and every registered profile signs —
otherwise the insider moves a signing record's genesis onto a non-signing profile and the
signatures stop being checked. And AL2 verifies only what exists: deleting a record's latest
transitions leaves every remaining signature verifying. One more condition binds: no signature
may outlive an append that never committed. It is met when the configured sidecar is the store's
own on the reference stores, which write each signature inside the append's own atomic unit; it
is open for a separate sidecar, which the library writes to before it appends, so a signature over
a transition that never committed (a rolled-back redemption, say) survives, and the insider can
splice that transition back in ([`integrating.md`](integrating.md), AL2). If your threat model says even key
custody is in doubt, that is AL3's territory, and AL3 is inactive. Read
[`../concept/ASSURANCE.md`](../concept/ASSURANCE.md) before relying on any of this — it
names the blind windows explicitly.

## Why not just write an audit log?

Four properties an ordinary log line does not give you, each doing separate work:

1. **Content binding** — the confirmation is bound to a digest of exactly what was
   reviewed, and a drifted payload *refuses at decision time* rather than being logged as
   approved. A log records what someone claimed happened; the seam refuses what did not.
2. **Reviewed-surface binding** — the record carries a digest of what the review surface
   actually rendered, attested by the surface's own identity, so "the approver saw
   different numbers" is a checkable claim.
3. **Chained replayability** — deletion and reordering are detectable on replay (within
   the AL1 bound); a log's integrity is usually exactly the integrity of the box it sits on.
4. **Refusal semantics** — the "no" paths (drift, wrong authority, missing consultation,
   separation-of-duties violation) are first-class structured outcomes with stable codes —
   and, where the profile declares them terminal, recorded on the chain itself — not
   exceptions that vanish into an error tracker.

If you need none of these, a log is genuinely simpler — the scoping guide's build-vs-buy
section ([`../concept/SCOPING-GUIDE.md`](../concept/SCOPING-GUIDE.md)) is honest about
that trade.

## Can an auditor or regulator verify our records?

Not as a designed capability, and this is a scope line, not a gap: the operator who runs
the application is the records' sole consumer. Everything that exists only for an outside
party — assessor re-verification, published report formats, conformance claims as claims —
is out of scope by design. You can of course *show* an outsider your records and your
replay output; what does not exist is machinery that makes those records convincing to
someone who distrusts you. A future project could rescope that (the concept set documents
how); this one deliberately did not.

## Does it prevent bad actions from executing?

No. It proves fidelity, not validity: what was reviewed and confirmed, never that the
content was correct — a digest binds a hallucinated draft just as faithfully as a good
one. On effect-seam profiles it adds one enforcement tooth: given an idempotent executor,
orphaned, duplicate, premature, and mismatched effects are *refusable at the redemption
seam*. But the library never executes effects, and an effect that bypasses the seam is
invisible to it. Prevention of bad drafts lives upstream, in layers the library
deliberately does not own.

## Can an AI agent be the approver?

No — this is a non-negotiable principle, not a configuration. No record exists without a
human leg, and automated reviewers (including LLM judges) never hold one; their
assessments enter as *consultations* — evidence carrying the automated checker's identity,
able to refuse a finalize but never to approve one. If you want AI-approves-AI, you want a
different concept, and forking this one to get it means saying so out loud (the fork rule
is stated at the concept set's front door, [`../concept/README.md`](../concept/README.md),
and its principles are [`../concept/CONCEPT.md`](../concept/CONCEPT.md)'s).

## Why does the agent get a handle at all?

So the drafting side can *stage* and *read* without any possibility of deciding. The agent
handle carries `stage` plus three pure reads and nothing else — the record-transitioning
calls are unreachable by construction, which is a stronger statement than "the agent is
told not to call them." It is in-process object-capability discipline, not a sandbox: code
that can reach your store or the operator handle is outside its protection.

## Do I need an AI agent to use it?

No. "Agent" names the drafting party; the seam being governed is human-confirms-drafted-
content. A rules engine, a batch job, or another team's service drafting actions for human
sign-off fits the same model. The library was shaped by the AI-drafts-human-decides
problem, but nothing in the record model checks who did the drafting.

## Is it production-ready?

Not yet, on publishing grounds rather than behavioral ones. The behaviors are built and
tested (the suite runs with zero skips; the step-by-step account is
[`../process/implementation-status.md`](../process/implementation-status.md)), but: the
package is deliberately `private: true` and unpublished until the 0.1 cut (the build,
`exports` map, and a CI-exercised tarball smoke test exist; the release workflow is
dispatch-only and unexercised — deferral-register row 1); and
the store contract's signatures are explicitly provisional pre-1.0, the concept set's own
named 1.0 gate (open-questions §9). The pre-0.1 API review completed 2026-08-19 (ratifying
the 52 names exported then; the seven added since — the adapter-author helpers and the
`DeclineOptions`/`RedeemOptions` bags — landed under the review's own rules rather than
through it), and the server-SQL backing exists (`@vidimera/store-postgres`), so
multi-process deployment has a supported store. "First external consumer" is literally
row 1's trigger, so saying hello in an issue moves the register.

## Can I use the records to evaluate my reviewers?

The concept's answer: the same timestamps that prove a control operated make per-person
performance scoring trivial, and the defensible use is **aggregate control assurance,
never per-named-reviewer scoring**. The record is not an employee monitor, and a host that
uses it as one is outside the concept's stated posture. Technically nothing stops you —
which is exactly why the discipline is written down.

## What happens if the process crashes mid-decision?

The design leans on atomicity and derived state: a finalize appends its whole batch
all-or-nothing, so a crash never leaves a partial decision tail; record state is always
recomputed from the chain, never cached authority. The named residual risk is the token
shape's crash-strand window — a crash between the `redeeming` append and the token
reaching the executor strands the redemption until its bound lapses and the sweep resolves
it (`redemption-failed`), after which recovery is a new record that verifiably
`supersedes` the stranded one. A co-located host can shrink that window to its own
transaction: the token seams take an optional `opts.tx` (landed 2026-08-19, retiring
deferral-register row 16), so the `redeeming` append commits or rolls back with the
host's own outbox row.

## Why does the documentation keep saying what things are NOT?

Because the failure mode of evidence systems is overclaiming. A record that is believed to
prove more than it proves is worse than no record — it manufactures misplaced confidence
exactly where the stakes justify a library like this. The editorial rule ("every guarantee
with its limit in the same breath") is enforced across the concept set, and contributions
are held to it.
