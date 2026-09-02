# `record-contended` — design and promotion case (a §8 registry amendment)

**A registry amendment AWAITING its sanction — nothing in `docs/concept/` moves on this
document's strength.** Per `docs/concept/SCOPING-GUIDE.md` §§1–2 this document states the
tier verdict, both promotion prongs and the purpose-trace, and, per the sealed-set discipline
(`docs/process/next-phases.md`), names the exact sealed-set edits a fresh sanction would
license. SPEC §8's own stability clause is the rule being exercised: "the registry is amended
only by a revision of this document". The increment does not start until the maintainer grants
that sanction on this document's case (§8 below).

## The gap, stated from the code

The 2026-09-02 code review (branch `code-review-fixes`, merged at `0f5dce4`) established that a
seam can lose its append to a concurrent **state-preserving** append on the same record. The
window is real: `finalize()` and `decline()` read the chain once and suspend at
`signatureLayerHolds` and `resolveDueClock` before their single `appendBatch`; `raiseFinding()`
and `acknowledge()` read once and suspend before their single `appendTransition`. A finding
raised or acknowledged in that window keeps the record `open`, so the loser passes the store's
entry compare-and-swap and fails its sequence check — honestly, since the store did exactly what
SPEC §12 asks. Before the review the losers misreported: the batch seams threw a "storage fault"
whose message asserted the race was unreachable under a single-writer bound the Postgres adapter
never had; the findings seams refused `record-not-open`, false of a record that is open.

The review's fix (commits `4308e86` and `0f5dce4`) made both stories true but left the shape
wrong: a moved head now throws an `Error` whose `name` is `'ContentionError'`, told apart from a
genuine storage fault by one diagnostic re-read. That throw violates the outcome model this
library is built on — DECISIONS.md #10, "Result-first outcomes; refusals returned, never thrown",
with exceptions reserved for caller errors and storage faults where nothing was recorded. A lost
race is neither: the caller made no error, the store did not fault, and the domain outcome is
"your read is stale — look again". It was thrown only because no registry code was true of an
open, intact, undecided record and the registry is spec-fixed. It is also a prose contract: a
host retries on a string. This document mints the code.

## Promotion case

- **Tier verdict (SCOPING-GUIDE §1): GOVERNED.** The outcome belongs to the findings flow's
  seams (SPEC §10.2), switched on per leg by `ackMode`/`requiredAcks`. It is a findings-flow
  phenomenon by construction, not by choice: the only state-preserving appends between
  `opened` and a decision are `finding-raised` and `acknowledged`, so on a profile that
  declares no findings flow no writer exists to lose a sequence race to — two finalizes racing
  each other lose at the **entry** compare-and-swap, which is `record-not-open` and true. The
  default host runs the KERNEL alone and cannot reach this code. (Precisely: four transition
  kinds are state-preserving — `consultation-recorded`, `sealed`, `finding-raised`,
  `acknowledged` — but `consultation-recorded` rides only inside a decision batch that ends
  state-leaving, and `sealed` is gated on derived terminality, so only the findings seams
  can land a state-preserving append on an `open` record; and all three backings adjudicate
  state before sequence, so a `seq` conflict at an `open` entry implies such a racer.)
- **Not a new capability — a missing outcome of a promoted one.** The findings flow is
  `[PROVEN]`; this amends the registry so its seams' concurrency outcome has a truthful,
  machine-readable name. The promotion rule is applied to the amendment all the same.
- **Prong one — real control practice.** A four-eyes flow with informers assumes a checker
  raises while an approver decides. The standard optimistic-concurrency discipline for the
  losing side of a compare-and-swap is "your read is stale; re-read and decide again" — never
  a fabricated state change, and never a silent retry on the human's behalf.
- **Prong two — adopt beats build.** Misreporting a lost race as a state change is exactly the
  subtle thing an in-house build gets wrong silently. This build got it wrong twice, at the
  batch seams and then at the single-append seams, and both stood green for weeks.
- **Purpose-trace: to the governed-host bar, and to the honesty discipline.** A
  findings-declaring host runs informers concurrently with deciders by design, and every
  outcome the library returns must be true of the record it names (`CONCEPT.md`'s graduated
  honesty). The result-first rule is how that honesty reaches a host across a process
  boundary: a code, not a string in an exception.
- **Maturity.** The row lands `[PROVEN]`: the behavior lands in the same commit as the text
  (spec-moves-to-truth with nothing draft-ahead).

## Rulings taken (at the 2026-09-02 brainstorm), so they are not re-litigated

- **Shape: a profile-conditional refusal code, not a fourth `Outcome` status arm.** A new
  status would break every host `switch (outcome.status)` and give one flow's concurrency
  outcome a whole outcome class; a code is additive to `RefusalCode` and rides the existing
  `refused` arm, `appendsOn` rule, and never-appends machinery unchanged.
- **Name: `record-contended`.** The `record-*` family names the record's condition
  (`record-exists`, `record-not-open`); `head-moved` named the mechanism, `concurrent-append`
  the cause. Codes are never reused with changed meaning (SPEC §8), so the name is permanent.
- **Placement: SPEC §8's profile-conditional table, feature "findings flow (§10.2)".** The
  core registry stays at eleven; the argument is the tier verdict above.
- **No kernel retry.** The Phase 1 ruling stands: a confirm is a human act over a head the
  human saw, and a fresh-sequence retry would confirm over a finding they never saw. The
  kernel refuses; the host re-invokes; the ladder re-evaluates against the new head.
- **The storage fault stays a throw.** An unmoved head, or a conflict past element zero, is a
  Store breaking SPEC §12's contract — DECISIONS.md #11's loud throw, inside #10's "nothing
  was recorded" scope. Only the moved-head branch becomes a refusal.
- **`ContentionError` disappears entirely.** Nothing published ever carried the name; no
  alias, no deprecation.
- **The contention-versus-fault split stays inferred from the one-time re-read.** Making it
  exact needs the store to report the head sequence it adjudicated against (`headSeq` on the
  `seq` conflict arms), a Store-interface change that belongs to deferral-register row 23's
  increment, not this one.

---

## 1. The outcome

`record-contended` — a decision-progress or findings seam lost its append to a concurrent
state-preserving append on the same record (a finding raised or acknowledged between the seam's
chain read and its write). The record is unchanged by the call and still `open`; nothing was
recorded; re-invocation re-evaluates against the new head. Class `refusal` — argued, since
§8's defining sentence for the class speaks of an attempt that "fails on its inputs" where
"retrying with corrected inputs is legitimate": here the inputs were right and the READ was
stale, and the correction is the re-read, not the inputs. The class still fits because its
operational contract is exactly what holds — the record stays `open`, a retry is legitimate,
no edge lands — and the two alternatives are plainly wrong (`availability` is an unreachable
authority; `compromise` is tampering). A member of the
never-appends set: no `refused` edge, no `transitionRef`, and — like every never-appends
code — a legal but inert `terminalRefusals` member (`appendsOn` returns `false` for the set
before it consults the leg).

## 2. Producers and exact conditions

Every producer is a site that already exists; only the shape of the moved-head branch changes.

- **`finalize()` and `decline()`, rung (6).** `appendBatch` reports `conflict: 'seq'` at
  element zero and the one-time re-read shows the chain grew past the length this call read →
  `refused('record-contended')`. Rung (5.7) already ran against the head this call read, so a
  required-kind finding raised in the window has not yet gated; re-invocation gates it.
- **`raiseFinding()` and `acknowledge()`, rung (5).** `appendTransition('open', …)` reports
  `conflict: 'seq'` and the re-read shows growth → `refused('record-contended')`. A
  `conflict: 'state-mismatch'` stays `record-not-open`, which is then true of the record.

The shared classifier in `kernel/finalize.ts` (today `batchSeqConflict`/`appendSeqConflict`
over one internal `seqConflict`) returns a discriminant instead of an `Error`: contended, or a
fault carrying the storage-fault error. Each caller refuses or throws on that discriminant.

## 3. What stays a throw

- A `seq` conflict whose re-read shows **no growth**: the store reported a conflict nothing
  produced — storage fault, message unchanged (`… batch append conflict ('seq') at element N
  …` / `… append conflict ('seq') …`), "nothing was appended" stated.
- A `seq` conflict **past element zero** of a batch: a kernel-built batch is
  sequence-contiguous from the head it read, so no conforming Store can produce it.
- A diagnostic re-read that **itself fails**: the conflict report is thrown with the read's
  failure as its `cause`, as today — contention cannot be established, and the assurance that
  nothing landed must survive.

## 4. Registry: 24 → 25

`refusal-codes.ts`: the union gains `'record-contended'`; `REGISTRY` maps it to `'refusal'`;
`NEVER_APPENDS` gains it. The comment naming `consultation-stale` "the twenty-fourth and LAST
code of this build" is reworded to its truth (the last of the AL2 freshness increment; this
document's code is the twenty-fifth). `refusal-matrix.test.ts`'s total-accounting pin moves to
twenty-five, naming this code's production-path home (`terminality.test.ts` and
`findings-seams.test.ts`); `outcome-model.test.ts`'s total pin moves with it, and
`refusal-matrix.test.ts`'s own "twenty-fourth and LAST" comment is reworded.

## 5. Interactions, all falling out of existing machinery

- **Gate order (5.7) → (6).** Constructible only by a race, and pinned in
  `terminality.test.ts`: with a required-kind finding raced in between, the losing `finalize`
  refuses `record-contended` (rung 5.7 saw the old head) and the re-invocation refuses
  `ack-missing`; with a non-gating kind, the re-invocation confirms. Note the inversion this
  pair carries: on the losing call the LATER rung's code surfaces, because (5.7) ran against
  the stale head — the adjacent-pair definition ("the earlier code wins when one record's data
  trips both") does not apply to a pair only a race can construct. Today
  `finalize-check-order.test.ts`'s header says the conflict throws, excludes the pair, and
  names no home; it is rewritten to name the pair, the carve-out, and the home.
- **Loser-agrees-with-reinvocation.** Unlike the redemption family's residual, re-invocation
  here may *succeed*; the code is honest about exactly that — nothing landed, the head moved,
  run again. It does not predict the re-run's verdict, and must not.
- **Reach.** On a profile with no findings flow the only reachable rung-(6) conflict is an
  entry `state-mismatch` → `record-not-open`. The structural witness is the findings seams'
  own (2.5) declaring check, which throws on a non-declaring leg before any append — so no
  state-preserving racer exists there; the plain-profile entry-CAS race pin shows a
  state-changing racer yields `record-not-open`, which is the other half of the picture.
- **The decorated store.** Under a signing profile the batch is signed before the store
  adjudicates it, so a contention loss leaves one sidecar entry per element — the orphan
  class register row 22 already names (widened 2026-09-02); `verifySignatures().orphans`
  reports them. Unchanged by this document.

## 6. Honest bounds (stated wherever the capability is documented)

- The split between contention and storage fault is **inferred** from a read after the store
  adjudicated. A legitimate writer landing between adjudication and re-read makes a genuine
  fault at an unmoved head read as contention. Nothing lands either way and re-invocation
  re-evaluates, so the cost is a quieter diagnosis, never a wrong record. The exact signal
  is register row 23's `headSeq`.
- The code is present in the one `RefusalCode` union for every host at the type level, like
  every profile-conditional code; its *reach* is findings-declaring profiles.
- The code names a condition of the record at the instant the store adjudicated; it makes no
  claim about the record's state at the instant the host reads the outcome.

## 7. Cuts, recorded per anti-goal #4

No fourth `Outcome` arm. No kernel-internal retry (human anchor). No `headSeq` on the store's
conflict arms (row 23). No alias or deprecation path for `ContentionError` (never published).
No change to `refuseMaybeAppend`'s lost-CAS posture. Its verdict is true of the head the call
read, and for every rung but (5.7) it is head-independent; at (5.7) a concurrent acknowledgment
may have covered the finding since, so a sequence-lost `ack-missing`/`ack-stale` is a
conservative refusal — no edge landed, the record stays open, re-invocation re-evaluates.
Mapping that one loss to `record-contended` as well is defensible and recorded as a residual,
not taken here: the refusal there is never false, only possibly stale.

## 8. Sanction requested (the exact sealed-set touches, licensed only by a fresh grant)

**GRANTED 2026-09-02** by the maintainer, in session, on the words "continue as recommended"
given in answer to the explicit grant-or-withhold question on this document. The grant
licenses exactly the touches listed below and nothing else; it is spent when the increment
exits. **Re-granted 2026-09-02** for the three definitional touches the spec review surfaced
(SPEC §8's defining clause, `GLOSSARY.md`'s entry, `DECISIONS.md` #15), on the maintainer's
words in session.

- **SPEC §8, profile-conditional table:** one new row after `ack-missing` / `ack-stale` —
  `record-contended` | findings flow (§10.2); `refusal`-class; a decision-progress or findings
  seam lost its append to a concurrent finding or acknowledgment on the same record — nothing
  recorded, the record still `open`, re-invocation re-evaluates against the new head; never
  appends | `[PROVEN]`.
- **SPEC §8, append semantics:** `record-contended` joins the parenthesized never-appends list.
- **SPEC §9, rung (6):** after "all-or-nothing, so a conflict never leaves a partial tail", one
  sentence: an entry conflict on state refuses `record-not-open`; a sequence conflict against
  a head a concurrent finding or acknowledgment moved refuses `record-contended` (§10.2, never
  appends) — the seam never re-sends the batch, and re-invocation re-evaluates the ladder
  against the new head.
- **SPEC §10.2, the seam discipline sentence:** after "any other non-open state refuses
  `record-not-open` (never-append, §8)", one clause: an append that loses its sequence to a
  concurrent finding or acknowledgment refuses `record-contended` (never-append, §8) — the
  record unchanged and still open.
- **ARCHITECTURE §5:** the ladder's rung-(6) line gains "/ record-contended (findings-flow
  only)" and its (6) bullet gains the same clause.
- **Found at review, ruled separately (see the dated note below §8):** the never-appends
  set is not only a list — SPEC §8 DEFINES it as "the pre-record, terminal-record, and
  redemption/seal codes", and `GLOSSARY.md`'s Never-append set entry and `DECISIONS.md` #15
  restate that definition; `record-contended` (an open, undecided record; no redemption, no
  seal) is none of the three. Joining the list without widening the definition leaves the
  sealed set contradicting itself in three places.
- **Widened at review, re-granted (below):** the never-appends DEFINITION gains the contention
  code as a fourth category in all three places that state it — SPEC §8's defining clause
  ("the pre-record, terminal-record, contention, and redemption/seal codes"), `GLOSSARY.md`'s
  Never-append set entry, and `DECISIONS.md` #15 (its reason gains "or a lost sequence race
  whose call landed nothing") — so the set's definition and its list agree everywhere.
- **Not touched, said plainly so a reviewer can disagree:** `CONTROLS.md` (its findings row
  describes the control's gate codes, not the seams' concurrency outcome); `GLOSSARY.md` (no
  per-code entries); `OPEN-QUESTIONS.md` (no open question decides this); `CONCEPT.md` (the
  amendment serves the honesty discipline; it does not change it — not a fork).
- **Markers:** the row lands `[PROVEN]` in the same commit as the behavior — the tenth
  marker-bearing sealed-set edit in this repository's lineage, recorded as such in
  `docs/process/implementation-status.md` and `CLAUDE.md`.

## 9. Tests

- **The moved-head branch, all four producers, RED first:** the four `terminality.test.ts`
  contention pins and the `findings-seams.test.ts` `raiseFinding` race pin flip from a thrown
  name to a refusal, and `acknowledge` — which no existing pin races — gains its own: two
  concurrent acknowledgments of one finding, the loser refusing `record-contended`. All to
  `status: 'refused'`, `code: 'record-contended'`, `class: 'refusal'`, no `transitionRef`;
  each keeps its post-state assertions (chain unchanged by the call, record `open`).
- **The throws that stay:** the fabricated-conflict pin (unmoved head → storage-fault
  message) and the failed-re-read pin (conflict report with `cause`) keep their throws; their
  `err.name !== 'ContentionError'` assertions, vacuous once the name is gone, become
  `err.name === 'Error'` — throw, not refusal, pinned positively.
- **Gate order:** the (5.7) → (6) race pin keeps both re-invocation outcomes (`ok` for a
  non-gating kind, `ack-missing` for a required one), now against a refusal rather than a
  throw.
- **Registry:** the total-accounting pin at twenty-five; `appendsOn('record-contended', leg)`
  is `false` whatever the leg declares; `refused('record-contended')` carries class
  `refusal`.
- **Reach:** the plain-profile entry-CAS race pin stands as the unreachability witness.
- **Byte-stability:** the frozen oracle untouched and green — nothing appends on this path.

## 10. Records and guide (the same commit)

`docs/guide/api-reference.md`: the codes table gains the row and its count reads twenty-five;
the `ContentionError` paragraph becomes the code's, and the orphan paragraph's "the
`ContentionError` case" becomes the code's too. `integrating.md`: the same paragraph.
`concepts.md`: the same sentence, and its "The full registry is 24 codes" reads twenty-five.
`CHANGELOG.md`: one Added entry for the code; the two Unreleased entries that describe the
throw gain a pointer to it (nothing shipped; no migration note). `CLAUDE.md`: twenty-five
codes; ten marker-bearing edits. `docs/process/implementation-status.md`: the increment's
section and the current-state block. `docs/process/next-phases.md`: the first sanction-gated
bullet retires. `docs/process/deferral-register.md`: row 22's phrase "the `ContentionError`
path" becomes "the `record-contended` path" — the name disappears everywhere; the row's
scope, trigger and number do not move. Source comments the shape change makes false move with
it: the rung-(6) header and both classifier doc comments in `kernel/finalize.ts`, the
`decline.ts` call-site comment, `findings-seams.ts`'s ladder header line for rung (5) ("a lost
CAS refuses record-not-open") and its call-site comment.

## What this does not claim

- No new capability, no encoding change, no store-interface change, no new outcome class.
- The library still never retries on the human's behalf and never predicts a re-run's verdict.
- Nothing here touches the operator-only scope, the four principles, or the honesty
  discipline; the amendment is made *under* the honesty discipline. No conformance vocabulary.
- The other sanction-gated questions the review surfaced (a per-leg raiser/acker allowlist,
  content equality across legs, sidecar two-phase cleanup) are separate cases with their own
  documents, not riders on this one.

## Process

One increment: this document, a plan, and one implementation commit in which the sealed-set
text and the behavior land together. TDD with a mandated RED run at every flipped pin;
`pnpm contract-scan` before the commit (SPEC citations in code must resolve — the new row is a
section-level citation, `SPEC §8`, and no quoted phrase is introduced); the byte-stability
oracle asserted, never edited; no push without instruction. The increment starts only on the
maintainer's explicit sanction grant recorded against §8 above.
