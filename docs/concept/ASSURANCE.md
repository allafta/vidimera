# Assurance — the threat model and the honesty gradient

What the record model defends against, what it explicitly does not, and how the guarantees
grade upward. Non-normative narrative; `SPEC.md` §0/§5/§13A/§14 are the contract.

---

## 1. The base guarantee, stated with its limit

The AL1 chain is **tamper-*evident* against non-recomputing tampering** — and only for a
transition that is **not** the current chain head.

Unpacked:

- Each transition's integrity is pinned by the **next** link's `prevHash`, never its own. A
  non-recomputing edit of any **non-head** transition is caught on replay, at the following
  link.
- The **head** transition's payload — and a **sole genesis**'s, which is both first and last —
  is protected only once a later transition chains over it. Until then, editing the head is
  indistinguishable from that transition never having existed in that form.
- An adversary with unrestricted storage-write access can delete a transition and
  **recompute** every subsequent hash; replay then verifies clean.
- **Whole-record absence is silent.** Replay and verification run over the chain the store
  returns: a record whose entire chain is deleted — or a store restored from an older backup,
  dropping recent records or transitions wholesale — verifies clean on what remains.
  Verified prior-leg references give partial detection (a destroyed prior chain makes a
  not-yet-opened successor unopenable), AL2 signatures verify only what exists, and the
  closures are AL3 anchoring or a host-side record index reconciled against the store.

The chain is **not** cryptographic in the signature sense and is never described as
non-repudiable. These are the sharpest residuals at the base level, and they are stated
wherever the guarantee is stated — the same-breath rule.

## 2. The two named blind windows

The head-bound is not an abstract caveat; it bites at two specific, load-bearing places:

1. **The separation-of-duties evidence window.** A successor leg's `priorLegActors` (who
   decided the prior legs) live in that successor's genesis payload — which *is* the chain
   head from `open()` until the deciding finalize chains over it. In exactly that window, a
   storage-writing insider can edit the recorded prior-leg actors, and the SoD gate reads
   that evidence at exactly that moment of use.
2. **The policy-binding window.** For a single-leg record, the bound `policyDigest` lives in
   the sole-genesis (head) payload. An insider who edits it to match a drifted live policy
   defeats the drift gate.

Both are honestly documented at AL1, and both are closed by the same upgrade: a signed
genesis fails verification when its payload is edited, head or not — while every profile
the instance registers signs and the key sits outside the insider's boundary (`SPEC.md`
§14).

## 3. Threats the model addresses

- **Render-to-decide drift.** Content mutates between the reviewer's screen and the
  confirmation; finalize refuses `content-drift`. Conditional guarantee: drift is refusable
  at the seam *given the host presents content from its bound source* — the library compares
  digests; it never reads the host's source itself.
- **Payload-identity forgery.** A decision message carrying an approver identifier in its
  payload, over an unbound transport, cannot finalize — identity is by transport.
- **Concurrent double-decide.** Store-constraint exclusivity: at most one non-terminal
  record per `(profile, subject)`; a second open refuses.
- **Approve-once / execute-twice.** At-most-once redemption (given an idempotent executor,
  for the separated shape).
- **Deletion / reordering of committed history.** Caught on replay for non-head,
  non-recomputed edits (the §1 bound).
- **Deciding under changed rules.** Policy-drift notarization: the decision binds a policy
  snapshot; a drifted live source refuses.
- **Late-arriving findings.** A warning that appears after the reviewer last looked is
  caught by finding/ack coverage where a findings flow is configured.
- **Self-approval across legs.** Principal-distinctness at the SoD gate, over recorded,
  verify-by-replay evidence.
- **Silent gate degradation.** Fail-closed everywhere: unknown profile, unreachable
  authority, failed consultation, ineligible actor — nothing converts to approval; an
  unhonored config throws at construction.

## 4. Explicitly out of scope — named to prevent overclaiming

- **A lying allow-listed identity authority.** `allowedAuthorities` is blast-radius control,
  not prevention.
- **Policy poisoning before the digest is captured.** `policyDigest` gives drift detection,
  not policy integrity.
- **Transport authentication.** The host's.
- **Human collusion and coercion.** Separation of duties evidences distinct principals, not
  independent judgment.
- **Rubber-stamping and review fatigue.** No record format evidences attention or
  competence; latency analysis can *detect* it but is surveillance data (aggregate use
  only).
- **Model quality and prompt injection.** Mitigated, never closed, by human review plus the
  reviewed-surface binding; prevention lives upstream.
- **Storage confidentiality and access control.** The host's.
- **A host supplying untruthful verdicts.** The consultation and eligibility gates gate on
  what the host supplies; genuineness is proved (if at all) by the operator's own
  live-dependency probes, not by the runtime.

## 5. Clock trust

Timestamps are host-written at AL1; freshness checks are correspondingly host-trusted, which
is why the library stamps consultation times at the recording seam and accepts no
caller-supplied observation time — and why a freshness gate is honest only at AL2, where
authority timestamps ride inside digested payloads.

## 6. The assurance ladder

| Level | Status | Guarantee | Closes | Never claims |
|---|---|---|---|---|
| **AL1 — Chained** | the shipping default | tamper-evident against non-recomputing edits of non-head transitions; replayable from durable storage alone | drift, payload-identity, non-head deletion/reordering, double-decide, double-execute (per §3) | "cryptographic", insider resistance, non-repudiation |
| **AL2 — Signed** | operator-enabled upgrade (proven, `SPEC.md` §14 — enablement decided, `OPEN-QUESTIONS.md` §1) | detached signatures over canonical transitions + consultations | the recompute residual and both §2 blind windows, under `SPEC.md` §14's conditions — every registered profile signs, the key sits outside the insider's boundary, and no signature outlives an uncommitted append (this build's sign-before-append order does not yet meet the last); admits authority timestamps (freshness becomes meaningful) | anything about key custody it doesn't control; detection of whole-record absence (§1); non-repudiation |
| **AL3 — Anchored** | documented upgrade only | chain heads anchored in an independent append-only log | key-holding insiders; long-horizon disputes | — |

Two disciplines make the ladder honest:

1. **"Trustworthy" is always assurance-level-qualified.** No bare claims.
2. **Each level's vocabulary stays at its level.** AL1 material never borrows AL2 words.

## 7. Residual-risk posture for adopters

An adopting or inheriting project should carry, explicitly, in its own documentation:

- The AL1 bound and both blind windows, verbatim in spirit (§1–§2).
- The out-of-scope list (§4) — unedited; trimming it is how overclaiming starts.
- Its own decision on the policy-gate reverse cross-instance direction (see
  `OPEN-QUESTIONS.md`) — fail-close in code, or ratify as by-design with the audit trail as
  compensation.
- If it enables effects: the idempotent-executor obligation and the seam-bypass blindness.
- If it enables AL2: key custody, distribution, and rotation as first-class host duties, and
  the enablement-granularity / missing-signature decisions taken deliberately.
