# Security policy

## Supported versions

There are none yet. No release of `@vidimera/record` has been published — the package is
pre-0.1, `private: true`, and consumed only from source. `main` is the only line, and
security fixes land there. If you build on this source today, you are tracking `main` and
its fixes at your own pace.

## Reporting a vulnerability

**Do not open a public issue or pull request for a suspected vulnerability.**

Use GitHub's private vulnerability reporting on this repository (the **Security** tab →
**Report a vulnerability**). That channel reaches the maintainers privately and keeps the
report out of public view until a fix exists. If the button is missing, the feature has
not been enabled yet — in that case open an issue saying only "security — requesting
private contact", with no details of the finding, and a maintainer will arrange a private
channel.

Include what you can: the affected file or seam, a minimal reproduction (a failing test in
this repository's own suite style is ideal), and your assessment of impact. You will get an
acknowledgment as promptly as a small maintainer team can manage, an honest assessment of
severity, and credit in the fix if you want it.

## What counts as a vulnerability here

This library's security claims are deliberately narrow, so the interesting reports are
violations of the claims it *does* make. Examples that are squarely in scope:

- `verifyChain` accepting a chain the documented model says is detectably broken (a
  non-head, non-recomputing tamper going unreported). (`replay` deliberately folds without
  verifying linkage — that split is design, not a gap.)
- The agent handle reaching any record-transitioning capability — the capability split is
  a guarantee, not a convention.
- A refusal gate bypass: a finalize that should refuse (content drift, identity authority,
  separation of duties, required consultations, eligibility, policy drift, ack coverage)
  going through.
- The single-use redemption seam executing coupled state twice, or accepting a mismatched
  effect.
- The signature layer (AL2) reporting a transition verified when it is not, or an
  enforcement site failing to consult it on a declaring profile.
- Secret material leaking: the single-use redemption token being persisted or recoverable
  from storage, or reviewed content being persisted where only its digest should be.
- A store backing violating its append constraints (state CAS, terminal-state protection,
  sealed-chain protection) in a way feature code relies on.

## What is not a vulnerability

The documented limits are the product's honesty, not its bugs. Reports that restate them
will be closed with a pointer here:

- **The AL1 bound.** The base hash chain is tamper-evident against non-recomputing edits
  only. A tamper to the last transition of a chain, or to a transition's own `prevHash`
  field, is not distinguishable from that transition never having existed — this is the
  documented blind spot of a singly-linked chain, and detached signing (AL2) is the
  documented upgrade for it.
- **A recomputing insider.** An operator (or code with the operator's storage access) who
  rewrites and re-digests an entire chain defeats AL1 by construction. AL2 raises that bar
  only when the signing key is held outside the insider boundary; AL3 (external anchoring)
  is documented and deliberately inactive.
- **Fidelity, not validity.** A record faithfully binding a malicious or hallucinated
  draft is the library working as designed. Prevention of bad drafts lives upstream.
- **Effects that bypass the seam.** The library refuses at the redemption seam; it does not
  observe or prevent host effects executed around it.
- **Anything meaningful only to an outside party.** Assessor re-verification, conformance
  claims, published report formats — out of scope by design; the operator is the records'
  sole consumer.

The full threat model — what is defended, the named blind windows, and the assurance-level
gradient — is `docs/concept/ASSURANCE.md`, with security considerations in
`docs/concept/SPEC.md` §13A. When in doubt whether something is a limit or a bug, report it
privately anyway; a wrong report costs a pointer, a swallowed one costs more.
