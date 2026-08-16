# The consultation attach form — design

**Build-order step 5, first of two increments.** SPEC §11.1's unconditional half: "The
attach form is always available" — finalize gains its first options bag
(`opts.consultations`), the intake throws land at argument depth, and supplied obtained
consultations record into the success batch as chain evidence with library-stamped
recording time. **No guard lifts, no new codes, no outcome-model change**: the
required-consultation gate (rung 5.5), `consultation-failed`, the `availability`
outcome class, and the `requiredConsultations` lift are the second step-5 increment's,
which also records step 5's exit. This increment moves step 5 to Started.

## Rulings taken, so they are not re-litigated

- **Step 5 slices into two increments along §11.1's own sentence boundary.** First: the
  attach form — spec-complete unconditional behavior with zero guard lifts, so nothing is
  declarable-but-inert (`requiredConsultations`, `freshness`, and `eligibility` all keep
  their GOVERNED throws). Second: the gate + the availability class + the lift + step 5's
  exit.
- **"Never accepted from the host" is enforced structurally.** The input shapes carry no
  `at` field at all, and strict entry validation throws on unknown keys — so a
  host-supplied consultation time is a malformed-input throw, not a silently ignored
  field. §11.1: "A consultation's `at` is **never accepted from the host** — the library
  stamps the recording moment (§2.1)."
- **Unreachable markers are inert this increment — validated, then dropped.** §11.1: "an
  unreachable marker for a non-required kind is inert", and no kind can be required while
  `requiredConsultations` is unconstructible. The marker shape is still fully validated
  at intake (the surface is complete; only the gate that would consume a required
  marker is deferred).
- **The intake validator is its own module** (`kernel/consultations.ts`) — the
  `prior-legs.ts` precedent: one module, one job, and the second step-5 increment's gate
  consumes the same parsed partition rather than re-validating.
- **`isValidIdentity` is exported from `kernel/finalize.ts`** for the checker-shape check
  (the `SYSTEM_CHECKER`/`appendChainCompromise` export precedent — kernel-internal
  sharing, not public surface).

---

## 1. The input surface (`config.ts`, beside `OpenOptions`)

```ts
/** An obtained consultation the host supplies to finalize (SPEC §11.1): digest-only
 * custody — the host digests its own evidence payload; the library never sees it. NO
 * `at` field, deliberately: recording time is library-stamped (§2.1), and an unknown
 * key on an entry throws at intake — "never accepted from the host", structurally. */
export interface ObtainedConsultation {
  kind: string;
  checker: IdentityAssertion;
  payloadDigest: Digest;
  verdict: 'pass' | 'fail';
  proofRef?: string;
}
/** An unreachable marker (SPEC §11.1): `authority` names the party that was down. */
export interface UnreachableMarker {
  kind: string;
  unreachable: true;
  authority: string;
}
export type ConsultationInput = ObtainedConsultation | UnreachableMarker;

export interface FinalizeOptions {
  consultations?: ConsultationInput[];
  // `policy` (§10.3's live-source digest / unreachable marker) remains GOVERNED at the
  // call seam (kernel/finalize.ts's runtime guard) — its build step has not arrived.
}
```

- `OperatorSurface.finalize` gains the optional trailing `opts?: FinalizeOptions` (§9's
  documented signature: `finalize(recordId, identity, content, facts, opts?)`);
  `Kernel`/`makeKernel`/the kernel `finalize` signature thread it through.
- The runtime guard mirrors `open()`'s options loop: unknown `opts` keys THROW with a
  per-key message (`policy` gets its own §10.3-naming message; anything else the generic
  one). A typed caller sees the shape; a plain-JavaScript caller hits the loud guard.

## 2. Intake validation (`kernel/consultations.ts`, new)

One exported function, called at argument depth — SPEC §9: consultation shape "throws at
**argument intake**, before anything is loaded — that caller bug throws identically
regardless of record state":

```ts
export interface PartitionedConsultations {
  obtained: ObtainedConsultation[]; // in supplied order
  unreachable: UnreachableMarker[];
}
export function validateConsultations(
  inputs: ConsultationInput[] | undefined,
): PartitionedConsultations;
```

Throw set, each a caller error naming the offense (never a refusal):
1. an entry that is not a plain object, or matches NEITHER shape exactly — an obtained
   entry must have `kind`/`checker`/`payloadDigest`/`verdict` (+optional `proofRef`) and
   nothing else; a marker must have `kind`/`unreachable: true`/`authority` and nothing
   else (the no-`at`, no-unknown-keys rule lives here);
2. a non-string/empty `kind`, a `verdict` outside `'pass' | 'fail'`, a checker failing
   `isValidIdentity`, a non-string/empty `payloadDigest` or `authority`, a
   non-string `proofRef` when present;
3. a RESERVED kind — `'facts'` or `'chain-verify'` — on either shape: §11.1, it "would
   forge a library control";
4. a duplicate `kind` across the whole list (obtained or marker alike): "At most **one
   consultation per kind** per finalize".

`undefined` input returns `{ obtained: [], unreachable: [] }`. The module's header
carries §11.1's evidence-never-a-decision sentence and names the second step-5
increment as the gate's home (two-touch: this module validates and partitions; nothing
here gates).

## 3. `kernel/finalize.ts`

- Signature gains `opts?: FinalizeOptions`. FIRST statements, before the chain load
  (mirroring the placement the ladder doc fixes — ahead of rung (1), beside nothing
  else): the unknown-key guard, then
  `const supplied = validateConsultations(opts?.consultations);`.
- Rung (6): the success batch becomes variable-arity per §9's documented shape —
  `appendBatch([chain-verify, facts, …obtained consultations, confirmed])`:

```ts
  const suppliedConsultations: Consultation[] = supplied.obtained.map((entry) => ({
    kind: entry.kind,
    checker: entry.checker,
    at: nowIso, // library-stamped recording time — the batch's single clock reading (§2.1)
    payloadDigest: entry.payloadDigest,
    verdict: entry.verdict,
    ...(entry.proofRef !== undefined ? { proofRef: entry.proofRef } : {}),
  }));
```

  built into `Transition`s between `factsTransition` and `confirmedTransition` (seq
  `seqBase+3 … seqBase+2+N`, prevHash chained through; `confirmedTransition` moves to
  `seqBase+3+N`, its prevHash the last consultation's digest — or facts' when N is 0,
  leaving the no-consultations batch byte-identical to today's). `supplied.unreachable`
  is deliberately unused in this increment — a comment states the inert-marker rule and
  names the second step-5 increment as the consumer (two-touch).
- Refusal paths are untouched: they run before rung (6), so supplied consultations are
  recorded ONLY on success — a refusal records no consultation (§10.4's stated shape for
  the generic case: "like every refusal path, records no consultation").
- `replay()`/`ReviewView` need zero changes: `consultation-recorded` already folds into
  `record.consultations`, and review's projection carries them.

## 4. What stays guarded, said plainly

`requiredConsultations`, `freshness`, `eligibility`: their GOVERNED construction throws
are untouched and re-pinned untouched. A fail-verdict consultation supplied this
increment is **recorded as evidence and finalize still confirms** — §11.1: "recorded as
supplied — including a `fail` verdict — as evidence, never a gate". That sentence is the
increment's sharpest truth and gets its own executing pin.

## 5. Tests (new `packages/record/test/consultations.test.ts`, plus surgical edits)

- **Intake throw matrix**, each a `assert.rejects`/`assert.throws` pin: duplicate kind
  (obtained+obtained, obtained+marker); malformed entries (missing field; unknown extra
  key; an `at` field — the structural never-accepted pin; bad verdict; invalid checker;
  empty kind; non-string authority); reserved kinds (`facts`, `chain-verify`, on both
  shapes); unknown `opts` key; `opts.policy` (its own message). Thrown BEFORE the chain
  loads: pin with an unknown recordId — the intake throw wins over the unknown-record
  throw when both apply.
- **The attach happy path** (capture profile): finalize with two obtained consultations
  (one `pass`, one `fail`, distinct kinds) confirms; the chain is
  `[opened, consultation-recorded (chain-verify), consultation-recorded (facts),
  consultation-recorded, consultation-recorded, confirmed]`; each supplied consultation's
  payload KEY-SET pinned (sorted; `proofRef` present-iff-supplied); `at` equals the
  `confirmed` transition's `at` (the single clock reading); the supplied ORDER preserved;
  `getRecord().consultations` includes them (the existing fold); `review()` projects
  them.
- **The never-a-gate pin**: the fail-verdict consultation above did not refuse —
  `status: 'ok'` asserted in the same test, named in its title.
- **Inert marker pin**: a marker (non-required kind — every kind is, this increment)
  validates, records NOTHING, and finalize confirms; chain length identical to a
  no-consultations finalize.
- **Refusal-path pin**: finalize with consultations AND drifted content refuses
  `content-drift` with NO consultation recorded (chain untouched on the default path).
- **Byte-shape pins**: a no-consultations finalize's batch is byte-identical in shape to
  today's (the existing suite is this pin, staying green untouched); frozen fixtures
  never supply consultations — byte-stability holds by construction.
- **Two-leg attach**: the surface is leg-agnostic — a maker-leg finalize with a
  consultation records it (multi-leg fixture, no gating implied).
- **GOVERNED pins re-verified**: `requiredConsultations` (and `freshness`,
  `eligibility`) still throw — the existing construction-validation pins stay untouched;
  cite them in the record rather than duplicating.
- **Conformance**: the store already accepts N-element batches (the conformance suite's
  appendBatch coverage); if the plan finds arity ≥ 4 unexercised there, it reports the
  gap rather than silently extending the frozen store surface.

## 6. The record — step 5 starts

- **Status doc**: steps table → step 5 **Started** (first of two increments: the attach
  form; the gate + the availability class + the lift remaining, and step 5 exits with
  them). §11.1 row: the attach half built (input surface, intake throws, digest-only
  custody, library-stamped recording time, inert markers, batch recording), the gate
  half not; §9 row: finalize's documented five-argument signature real, `opts.policy`
  still seam-guarded; §2.1/§4 rows only if they carry batch-arity claims (verify before
  editing). **Governed count UNCHANGED at 7** — stated explicitly so no count moves
  wrongly.
- **CLAUDE.md / README**: step 5 started; "four of the eight build-order steps remain
  unstarted" moves to THREE (steps 6-8) — verify the arithmetic against the steps table
  before writing it.
- **Register**: no rows expected to move (verify by reading).
- **Comment truth**: sweep patterns per the standing list plus `consultations`,
  `opts`, `attach`, `always available`, `first step-5`, `second step-5`, ladder-shaped
  tokens (the standing lesson: `(5.5)`, rung counts, corpus totals —
  `finalize-check-order.test.ts`'s header now enumerates seven rungs and an order-pair
  corpus total that this increment does NOT change, verify rather than assume); the
  record task's report shows hit-count == verdict-count.
- No maturity marker moves; `docs/concept/` untouched.

## What this does not claim

- **No gating**: `consultation-missing` keeps its single facts-rung producer;
  `consultation-failed`, `availability`, and the `unavailable` outcome status do not
  exist in this build; rung (5.5) does not exist — the ladder's built rungs are
  unchanged.
- **No freshness**: `consultation-stale` stays [SKETCHED] and AL2-dependent — at AL1 the
  library stamps `at` itself, so a freshness bound over a library-stamped kind is
  vacuous by construction (§11.1's own argument, recorded wherever freshness is
  mentioned).
- **The library gates nothing and proves nothing about consultation authenticity** — it
  records what the host attests, digest-only; demonstrating a live dependency is the
  operator's regression exercise (§11.1 names it), and that limit travels with every
  guarantee stated here.
- Step 6 (eligibility, policy drift) unstarted; `opts.policy` throws.

## Process

Subagent-driven development, standing lessons in force: plan-authored comments truthful
at the commit that lands them (two-touch written into the plan); counts stated with the
movement named (the governed count does NOT move here — said explicitly); the record
task's sweep shows hit-count == verdict-count and includes structure-shaped tokens; a
mandated RED run is executed, or its substitution is STATED in the implementer's report;
no new rung on a tx-carrying seam without an enlisted-branch decision (`finalize()` takes
no `tx` — nothing to decide, stated so the check is visibly run); the final review
checks the status doc against CODE; no new runtime APIs — the floor stays `>=22.16`.
