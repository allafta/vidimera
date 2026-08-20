# Architecture & design narrative

How the pieces of `@vidimera/record` fit together and why. This document orients and explains;
it is **not normative** — `SPEC.md` is the single normative contract, and where they differ,
`SPEC.md` wins.

---

## 1. The shape of the system

One library, embedded in a host application, with five moving ideas:

1. A **capability-split API** — two frozen handles over one kernel, so the untrusted drafter
   can never reach a state-changing call.
2. An **append-only hash chain** per record — every state change a canonical, digested,
   linked transition.
3. A **result-first outcome model** — domain refusals as returned values with stable codes,
   exceptions reserved for caller/config errors.
4. A **fixed finalize gate ladder** — the safety-critical seam's checks in one deliberate
   precedence order.
5. A **constraint-guarded pluggable store** — compare-and-swap appends, with the liveness and
   uniqueness invariants in transactional constraints rather than in application code.

## 2. The capability split

The public API is `create(config)`, which returns **two frozen, capability-split handles over
one shared kernel**:

```ts
const { agent, operator } = create(config);
```

| Handle | Trust | Methods |
|---|---|---|
| **`agent`** | untrusted drafter (an AI agent, any automated proposer) | `stage()` + pure reads (an illustrative reference shape — `SPEC.md` §9 bounds this surface as *reads and staging only* without freezing the read set) |
| **`operator`** | trusted host (the human/host machinery) | `open` · `review` · `finalize` · `seal` · `redeem` · the findings seams · a due-record sweep · `replay` · `verifyChain` + the same pure reads |

A decision flows through four calls across the two surfaces: `stage` (agent) → `open` →
`review` → `finalize` (operator). Effect-seam profiles add `redeem`; findings-flow profiles
add `raiseFinding`/`acknowledge`; end-of-life adds `seal`.

**Why frozen plain-object handles.** The split is enforced **by construction, not by a runtime
guard.** The agent surface is a frozen plain-object literal carrying *exactly* its declared
keys — no record-transitioning method is present, own or inherited, so there is no code path,
and no runtime check, for an agent to bypass. A chat or voice "yes" arriving as a payload
cannot open or finalize a record, because staging happens pre-record and the transitioning
calls simply are not on the handle the agent holds. The behaviors themselves are shared kernel
closures assembled once at construction; each surface is a pure select-and-freeze over them.

Feature options (policy binding, prior-leg references) grow only the operator-side options
bags. The agent surface does not grow with features — routing any gate baseline through the
untrusted drafter would defeat the gate.

**The honest bound:** this is in-process object-capability discipline, not a sandbox. It holds
against an agent that can reach only the agent handle; a host that hands the agent the
operator handle, the store, or the construction config has stepped outside the split.
Composition is the host's obligation.

## 3. The chain model

A record is an append-only, hash-chained sequence of transitions
`{ recordId, seq, at, kind, payload, prevHash }`:

- `seq` is 1-based and increments by exactly 1 (store constraint C2).
- `prevHash` links each transition to the previous one's `transitionDigest`, back to a genesis
  whose `prevHash` is the digest of `vidimera:genesis:<recordId>`.
- `transitionDigest` is computed over the **library-owned** canonical transition encoding —
  the RFC 8785 (JCS) serialization of the transition — under the record's recorded algorithm.
  Because the transition encoding is library-owned (not the adopter's domain canonicalizer),
  two independent implementations verify each other's chains.

**Two canonicalization layers, one ownership split:** domain canonicalization (field
selection, ordering, normalization) is adopter-supplied through a declared hook with a
published fixture suite; the final serialization is library-owned JCS. Content itself is
digested in-process and never persisted — the store sees only opaque canonical payload text.

**The mandatory pre-seam chain-verify.** Every operator-side mutating seam replays and
verifies the whole chain before acting. On a clean replay, finalize records the verification
as a `chain-verify` consultation under the library's own system checker — the first of its
confirming appends. On a detected break it refuses `chain-compromise` (class `compromise`,
terminal). The compromise-refusal edge is itself AL1-honest: it chains onto the tampered head
and is only as trustworthy as the chain it extends.

**The AL1 bound, always in the same breath.** The chain is tamper-*evident* against
non-recomputing tampering, with the head-transition bound and the recompute residual stated
wherever the guarantee is stated (`SPEC.md` §0/§5/§13A; `ASSURANCE.md` for the full threat
treatment). Two concrete windows are named where they bite: the separation-of-duties genesis
evidence window and the policy-binding genesis window. Detached signing (AL2) is the named
closure for all of it.

## 4. The outcome model

Every seam returns a **result-first `Outcome<T>`**:

```ts
type Outcome<T> =
  | { status: 'ok'; value: T }
  | { status: 'refused'; code: RefusalCode; class: RefusalClass }
  | { status: 'unavailable'; code: 'availability'; authority: string };
```

Domain refusals are **returned values, never thrown.** Exceptions are reserved for
construction-time config errors and for caller errors / storage faults where nothing was
recorded (an unknown record id, a corrupted persisted leg id). "Caller errors are not
refusals": the registry names *domain* outcomes the library reached, not "not found".

The refusal registry is a **compiler-total map** from code to class — every code must have a
class or the build fails — split across three classes:

- **`refusal`** — fails on inputs; record stays `open` unless the leg's `terminalRefusals`
  marks the code terminal; retry with corrected inputs is legitimate.
- **`compromise`** — evidence of tampering; terminal; sole member `chain-compromise`.
- **`availability`** — an external authority unreachable; carried **only** by the
  `unavailable` outcome status, never a `refused` edge, and **never converted into approval**.

**Whether a `refusal` appends** a `refused` transition is one shared derivation
(`appendsOn(code, leg)`): compromise appends wherever the current state admits an edge
(terminal `expired`/`refused` and sealed records surface result-first with no edge —
`SPEC.md` §5); a fixed never-appends set (pre-record,
terminal-record, and redemption/seal codes) never appends; every other refusal-class code
appends **iff** the leg's `terminalRefusals` lists it — otherwise the record stays open for
retry. Codes that are legal but inert in `terminalRefusals` are documented as such rather
than silently accepted.

## 5. The finalize gate ladder

`finalize` is the safety-critical seam. Its check order is **fixed** and every refusal path
wins over the ones after it — the precedence *is* the design:

```
INTAKE   validate host consultations (throw)
  ↓      load chain  →  empty ⇒ THROW (unknown recordId)
 (1)   pre-seam chain-verify        →  break ⇒ chain-compromise (terminal)
  ·    [policy declared-iff-present]→  throws at profile resolution (a caller/config contract)
 (2)   state / expiry gate          →  record-not-open / leg-expired (en-passant expire if due)
 (3)   identity (both branches)     →  identity-authority-refused
 (3.5) separation of duties         →  sod-violation            (multi-leg only)
 (4)   content-drift                →  content-drift
 (4.5) policy-drift                 →  policy-drift / availability  (policy-declaring only)
 (5)   facts (reviewed-surface)     →  consultation-missing
 (5.5) consultations / eligibility  →  consultation-missing / consultation-failed
                                       / ineligible / availability
 (5.7) ack coverage                 →  ack-missing / ack-stale  (findings-flow only)
 (6)   success batch                →  ok  (one atomic appendBatch)
```

Why each gate sits where it does:

- **(1) chain-verify first** — a tampered non-open record refuses `chain-compromise`, not
  `record-not-open`; integrity outranks everything.
- **(2) state/expiry** — a decided or expired record is resolved before any input is trusted;
  a due-open record is expired *en passant* here.
- **(3) identity** — read **only** from the explicit argument (never a payload-carried id);
  the authority must be in the leg's `allowedAuthorities`.
- **(3.5) SoD** — the finalizing principal must not be a named prior leg's recorded actor,
  nor the declared proposer; keyed on the record's *own recorded* leg ids, so profile edits
  cannot re-index already-opened evidence.
- **(4) content-drift** — re-canonicalize + re-digest the supplied content; a mismatch
  refuses rather than confirming stale content. The record's own content integrity outranks
  the policy environment.
- **(4.5) policy-drift** — the operator-supplied live digest vs. the record's bound
  `policyDigest`; policy outranks the evidence gates (deciding under the wrong policy moots
  the evidence).
- **(5) facts** — a fresh reviewed-surface digest must be present (the always-on control).
- **(5.5) consultations / eligibility** — the profile's required kinds, in declared order,
  first trip wins; a declared `eligibility` prepends an implicit-first `'eligibility'` kind
  and specializes its `fail` to `ineligible`.
- **(5.7) ack coverage** — derived purely from the record's own chained findings and acks;
  consultations outrank acks because an unreachable required source (`unavailable`, no
  append) makes an ack-coverage judgment premature.
- **(6) success batch** — one atomic, variable-arity
  `appendBatch([chain-verify, facts, …obtained consultations, confirmed])`; all-or-nothing,
  so a conflict never leaves a partial tail of stray transitions.

The two validation *throws* are deliberately placed at different depths: the intake throw
wins over everything; the profile-resolution throw follows chain verification, so
`chain-compromise` and `unknown-profile` precede it (`SPEC.md` §9).
The testing convention that keeps this honest: **every adjacent gate pair carries an explicit
order test**, so precedence is pinned, not incidental.

## 6. Feature-conditionality

Optional controls are switched on **by the ConfirmProfile's declared fields** — no separate
tier system in the code. A host that declares none runs the base model alone. A field for a
capability the build does not implement **throws at construction** with an explicit
"feature not available in this build" error, so a config the library cannot honor fails fast
rather than silently degrading.

The controls, their switches, and their honest bounds are cataloged in `CONTROLS.md`; their
normative semantics live in `SPEC.md` §10–§11.

## 7. Clock edges: en passant, never a scheduler

The library ships **no scheduler and no public `expire()`**. The clock-driven edges
(`open → expired`, `confirmed → expired`, `redeeming → redemption-failed`) are appended lazily
at the next operator-side mutating seam that observes the bound has passed — plus an explicit
operator sweep that resolves all currently-due records. Named exceptions: `seal()` never
expires en passant (sweep first, then seal); `redeem()` does not resolve a due-`open` record;
`open()`'s exclusivity check never auto-resolves a `redeeming` blocker.

The store's `dueAt` column is a **listing index only** — the authoritative chain recompute at
the resolving seam decides; a stale index entry is a harmless sweep candidate the recompute
declines, never a wrongly-forced edge.

## 8. The store abstraction

Records persist through a pluggable `Store`. The store is **not a blind log**: uniqueness and
liveness invariants live in its transactional constraints (C1 exclusivity over a derived
non-terminal flag, C2 server-verified sequencing, C3 terminal monotonicity with two
carve-outs, C4 seal-finality), so a crash or race cannot admit a second live decision. The
key discipline is **compare-and-swap append** — the state check and the append are one atomic
operation, never an advisory pre-check followed by a write.

Custody is digest-only end to end: the store persists transition payloads as opaque canonical
text and never sees domain content. Persisted `state` / non-terminal / `dueAt` columns are
constraint-and-index only; **replay over the chain is the sole authoritative derivation** of
decision state.

Every write accepts an optional caller-supplied transaction handle, adapter-generic and never
hidden — which is what lets a co-located host commit a `redeemed` edge in the same
transaction as its effect.

**The proof structure an implementation should reproduce:** one in-memory reference store
plus real adapters, all held equivalent by a **backing-parameterized conformance suite** (the
executable definition of a correct store), plus a cross-backing end-to-end asserting
**byte-identical chains** from the same scripted flow under a fixed clock. Byte-identity
across backings is the strongest cheap invariant this design admits — it catches encoding,
ordering, and timestamp drift in one assertion.

## 9. The assurance ladder

| Level | What it is | Closes |
|---|---|---|
| **AL1 — Chained** (the default) | hash-chained transitions, tamper-*evident* against non-recomputing tampering, bounded to non-head transitions | render-to-decide drift, payload-identity forgery, reordering/deletion of non-head transitions |
| **AL2 — Signed** (operator-enabled upgrade) | detached signatures over canonical transitions + consultations | the storage-writing-insider recompute residual **and** the head/sole-genesis edit windows (SoD evidence, policy binding); admits authority timestamps that make freshness gating meaningful |
| **AL3 — Anchored** (documented only) | external anchoring of chain heads in an independent append-only log | key-holding insiders, long-horizon disputes |

The ladder is a **product of the honesty discipline**: each level names exactly what it
guarantees and what it does not, and no level is ever described with the vocabulary of a
higher one. Full threat treatment in `ASSURANCE.md`.

## 10. Design invariants worth naming

Cross-cutting invariants that hold everywhere and that a rescoping project should preserve or
consciously re-decide (rationale catalog in `DECISIONS.md`):

- **Digest-only custody.** Domain content, consultation payloads, finding content, policy
  documents — the library sees digests, the host retains bodies.
- **All decision state in the record.** No host-memory lifecycle state; everything re-derives
  from the durable chain.
- **Identity by transport; recording-time timestamps.** Nothing identity- or time-sensitive
  is caller-trusted at AL1.
- **Loud throws for caller/config faults; coded refusals for domain outcomes.** The
  boundary between the two is deliberate and documented per seam.
- **Fail-closed, never fail-open.** Unknown profile, unreachable authority, failed
  consultation, ineligible actor — nothing converts to approval.
- **En-passant clocks.** No scheduler; deadlines resolve at observation moments.
- **Verify-by-replay references.** Any cross-record reference (prior legs, recovery
  predecessors) is verified by replaying the referenced chain, never trusted as supplied.
- **Byte-stability.** A profile that declares no features produces chains byte-identical to
  the minimal model — feature payload keys are present-iff-declared.
