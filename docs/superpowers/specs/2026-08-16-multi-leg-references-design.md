# Multi-leg sequencing and the verified reference — design

**Build-order step 4, first of two increments.** SPEC §10.1's multi-leg machinery without
its actor gate: legs conclude in order, a successor leg's `open()` verifies every prior-leg
reference by replay, `prior-leg-unverified` becomes the fifteenth refusal code, and the
successor's `opened` snapshot carries the recorded three-field references plus the
library-derived `priorLegActors`. The separation-of-duties gate itself (`sod.notActorOf`,
`proposer`, `sod-violation`) is the second step-4 increment's; this increment lands the
evidence that gate will read.

## Rulings taken, so they are not re-litigated

- **Step 4 slices into two increments.** First: sequencing + references (this document) —
  lifting the GOVERNED `legs.length>1` and the `priorRecordRefs` call-seam throw. Second:
  the SoD gate — lifting per-leg `sod` and `proposer`. The `opened` snapshot lands WHOLE
  here (references and actors together, §4's present-together-or-not-at-all), so the second
  increment moves no chain bytes; `sod`/`proposer` stay GOVERNED through this increment the
  same way `redeemBound` stayed governed until its clock existed to honor it.
- **Duplicate leg ids become a structural construction error.** §10.1 keys the recorded
  evidence "by their `legId`", and both `unknown-leg` producers resolve legs by id — a
  profile with two legs sharing an id has no well-defined evidence keying, fail-closed at
  construction. The single-leg build never had to care; the lift makes it load-bearing.
- **Every verification failure refuses; one storage fault throws.** All six spec-named
  conditions refuse `prior-leg-unverified` — including an unknown `recordId`, because a
  reference is host-supplied *data* at a mutating seam, unlike `replay()`/`verifyChain()`'s
  audit-read caller-error throw. The single loud throw: an intact chain that verified and
  replayed `confirmed` whose `confirmed` payload carries no actor to derive — a
  storage/config fault (the garbled-tokenDigest precedent, SPEC §8's loud-throw posture),
  never a domain refusal.
- **`replay()` folds the evidence onto the record.** `DecisionRecord` gains optional
  `priorRecordRefs`/`priorLegActors`, present together or not at all — the second
  increment's gate and any host read the record, never a raw genesis payload.

---

## 1. Construction (`config.ts`)

- The GOVERNED `legs` throw (`legs.length > 1`) retires, and with it the structural
  "exactly one leg is required" error message narrows to its true remainder: zero legs is
  still structural. The governed-field count moves 10 → 9, stated with the movement named.
- NEW structural check, before the per-leg loop: every `leg.id` unique within the profile;
  a duplicate throws a plain (non-GOVERNED) construction error naming both positions.
- `validateLeg`'s `sod` and `proposer` GOVERNED throws stay verbatim — their gate is the
  second step-4 increment. `ackMode`/`requiredAcks`/`requiredConsultations` etc. unchanged.
- `OpenOptions` gains its first real key:

```ts
export interface PriorRecordRef {
  recordId: string;
  chainHead: Digest; // the host's claimed head — verified, never trusted
}
export interface OpenOptions {
  priorRecordRefs?: PriorRecordRef[];
  // policyDigest / supersedes: still GOVERNED at the call seam (open.ts), unchanged.
}
```

  `open.ts`'s options loop now passes `priorRecordRefs` through and keeps throwing for
  `policyDigest`, `supersedes`, and unknown keys — the `Record<string, never>` declaration
  and its silently-dropped-key rationale retire with the first real key.

## 2. The code (`refusal-codes.ts`)

`prior-leg-unverified` joins `RefusalCode` (fifteenth member; count pins in
`outcome-model` / `refusal-matrix` bump 14 → 15), class `refusal` in `REGISTRY`, member of
`NEVER_APPENDS` — SPEC §8's conditional table names it "a pre-record `open()`-seam
sequencing refusal that never appends". Producer: `kernel/prior-legs.ts` consumed by
`kernel/open.ts`. If the plan lands the code in an earlier commit than the rung, the
producer comment takes the two-touch wording (future-tense at first landing, finalized by
the commit that makes it real) — the standing discipline, written into the plan up front.

## 3. The verifier (`kernel/prior-legs.ts`, new)

One module, one job: turn the host's claimed references into recorded evidence or one
refusal. Shape:

```ts
export interface VerifiedPriorLegs {
  priorRecordRefs: { recordId: string; chainHead: Digest; legId: string }[]; // three-field, library adds legId
  priorLegActors: IdentityAssertion[]; // paired by index with priorRecordRefs
}
export async function verifyPriorLegs(
  store: Store,
  resolved: ResolvedProfile,
  legIndex: number, // the successor's own leg index (0-based)
  subjectRef: string, // the successor's subject, from the staged draft — condition 4
  refs: PriorRecordRef[] | undefined,
): Promise<{ ok: true; verified: VerifiedPriorLegs | null } | { ok: false }>;
```

- `legIndex === 0`: `refs` undefined or empty ⇒ `{ ok: true, verified: null }` (a first
  leg carries no references and its `opened` payload omits both keys); any supplied ref ⇒
  `{ ok: false }` — §10.1: "supplying any is itself a sequencing error that refuses
  `prior-leg-unverified`".
- `legIndex >= 1`: `refs` must exist with length exactly `legIndex` (one entry per prior
  leg, in leg order). Then per entry `i`:
  1. `store.readChain(refs[i].recordId)` non-empty (empty ⇒ refuse — host data, not a
     caller error);
  2. `verifyChain(chain).intact` (§10.1: "the chain must verify intact");
  3. `transitionDigest(chain.at(-1))` equals the supplied `chainHead` ("its recomputed
     head must equal the supplied `chainHead`") — the host's claim is checked against the
     recomputation, never adopted;
  4. the replayed record's `profileId` and `subjectRef` equal the successor's;
  5. its `legId` equals `resolved.profile.legs[i].id` — "sit at the expected leg in
     order" against the profile's declared order;
  6. its `state` is `confirmed` — status is deliberately NOT consulted, so a sealed prior
     (state-preserving `sealed`, status `retired`) still verifies: §10.1's "A sealed prior
     still verifies; a destroyed one does not." The destroyed half falls out of check 1.
- Any check failing ⇒ `{ ok: false }` and the CALLER refuses `prior-leg-unverified` —
  which failed is deliberately not distinguished in the outcome (one code by the spec; the
  refusal carries no transitionRef, and no record exists to carry one).
- On success, actor derivation: the replayed record's `actor` (replay folds it from the
  `confirmed` payload). A verified-`confirmed` record with no folded actor THROWS (the
  storage-fault ruling above). `priorLegActors[i]` pairs by index with the ref — §4's
  "paired by index with `priorRecordRefs`".

## 4. `open()` (`kernel/open.ts`)

Gate order, the new rung placed pre-record:

1. options-bag guard (unknown/GOVERNED keys still throw; `priorRecordRefs` passes);
2. staged-draft load (unknown stagedRef throws, unchanged);
3. profile resolution fail-closed (`unknown-profile`, unchanged);
4. staged-legId re-check (`unknown-leg`, unchanged) — this also fixes `legIndex`;
5. **NEW: `verifyPriorLegs(store, resolved, legIndex, opts?.priorRecordRefs)`** —
   `{ ok: false }` ⇒ `refused('prior-leg-unverified')`, NO append, no record: §10.1
   enforces the sequencing "before it creates the successor record", so a bad reference
   refuses even when a C1 blocker also holds the pair;
6. genesis build + append, unchanged except the payload: when `verified` is non-null the
   `opened` payload gains `priorRecordRefs` (three-field form) and `priorLegActors` —
   present together or not at all; a first leg and every single-leg record omit both, so
   every chain this build could already mint stays byte-identical;
7. the C1 exclusivity blocker path, unchanged (the third step-3 increment's clock arms
   included). A non-final-leg `confirmed` is terminal by the derivation, so a concluded
   leg releases the pair and the successor's genesis appends cleanly — no store change.

Re-opening an already-concluded leg is the inherited single-leg posture, not new ground:
C1 admits a fresh record once no non-terminal holder exists, and §10.1 orders openings
relative to prior legs only — a host that re-runs a decision cycle governs that itself.

## 5. Replay and the record model

- `chain/replay.ts`'s `opened` arm folds `priorRecordRefs`/`priorLegActors` onto the
  record when present (snapshot fields, same discipline as `contentDigest`).
- `types.ts`: `DecisionRecord` gains both optional fields; the `opened` payload type
  comment gains the two keys. Emitted-kinds lists are untouched (no new kind).
- The AL1 window on this evidence is recorded honesty, not code: the successor's genesis
  IS the chain head until its own next append, and §10.1 names detached signing as the
  closure. The status doc carries it; `kernel/prior-legs.ts`'s header states it in one
  sentence.

## 6. Tests (new `packages/record/test/multi-leg.test.ts`, plus surgical edits)

- **Fixture**: `twoLegProfile()` in `helpers/profiles.ts` (`maker-decide`,
  `checker-decide`; capture-mode) and a three-leg variant built inline where order pins
  need it. `effectSeamProfile()` stays single-leg — the frozen byte-stability fixture is
  hermetic and separate, and stays untouched.
- **Happy path, end to end**: stage+open+finalize leg 1 (its `confirmed` is TERMINAL —
  `findNonTerminal` null, the pair released); stage leg 2, open with the verified ref;
  KEY-SET PIN on the successor's `opened` payload (sorted keys including both new fields,
  and the three-field ref shape with the library-added `legId`); `priorLegActors[0]`
  equals leg 1's finalizing actor; finalize leg 2 concludes the decision.
- **Order pin**: a three-leg profile — refs out of leg order refuse; the expected-leg
  check keys the profile's declared order.
- **Refusal pins**, one per verification condition: prior still `open`; prior `expired`;
  prior `refused`-terminal; wrong `subjectRef`; wrong `profileId` (a second profile, same
  subject); head mismatch (a stale head after a later append — supply the pre-append
  head); tampered prior chain (TamperingStore or direct construction — `intact:false`);
  unknown `recordId`; too few refs; too many refs; first-leg-with-refs. Each: refused
  `prior-leg-unverified`, NO record created (`getRecord` of a minted id is not observable
  — assert via `findNonTerminal` null and `listDue` empty where applicable, and that
  `open()` returned no recordId).
- **Sealed prior verifies**: seal leg 1 (`retired`), open leg 2 — ok.
- **Destroyed prior does not**: no destroy seam exists in this build — pin the shape with
  a fresh store lacking the prior chain (the same unknown-recordId refusal), named as the
  destroyed-prior stand-in.
- **Effect-seam interplay**: a two-leg profile WITH a `redeem` block — leg 1 `confirmed`
  terminal (non-final), leg 2 `confirmed` NON-terminal awaiting redemption, redeemed via
  the direct shape; pins that `isFinalLeg` and the redemption seams need no edits.
- **Byte-stability**: untouched (single-leg fixtures); a single-leg `opened` key-set pin
  proves no new key leaks into undeclaring chains.
- **Adjacent-pair order pins**: unknown-leg vs prior-leg-unverified (a staged legId absent
  from the profile refuses `unknown-leg` even with bad refs supplied);
  prior-leg-unverified vs record-exists (bad refs + a live blocker ⇒
  `prior-leg-unverified`, and NO clock resolution is attempted on the blocker).
- **Construction pins**: multi-leg accepted (the GOVERNED inversion, argued in place —
  the guard's own message promised the lift at §10.1's build step); duplicate leg ids
  throw structural; `sod`/`proposer` STILL throw (pins keep the second increment honest);
  zero legs still structural.
- **Count pins**: 14 → 15 in the two registry tests; the matrix section mirrors the
  never-appends convention with `kernel/prior-legs.ts`/`kernel/open.ts` named.

## 7. The record

- **Status doc**: step 4 moves to **Started** (first of two increments named; the second —
  the SoD gate — named as remaining). §10.1 row: sequencing + verify-by-replay references
  built; the gate not yet; the AL1 window recorded beside the evidence it qualifies. §8
  row: fifteen codes. §9 row: `open()`'s options bag carries its first real key. §4 row:
  the `opened` payload's profile-conditional keys now have a producer. Governed count 10 →
  9 with the movement named (CLAUDE.md's feature-guard paragraph likewise).
- **Register**: no rows expected to move (verify by reading; nothing new defers — the
  second increment is sequenced work, not a deferral).
- **Comment truth passes**: `config.ts`'s OpenOptions doc block rewrites (the
  unreachable-in-practice argument dies with the lift); `open.ts`'s
  `openOptionMessage` loses its `priorRecordRefs` arm; sweep patterns per the standing
  list plus `multi-leg`, `single-leg`, `only single-leg profiles`, `exactly one leg`,
  `Record<string, never>`, both deixis directions, increments named explicitly
  ("the first step-4 increment").
- No maturity marker moves (§10.1 is already `[PROVEN]`); `docs/concept/` untouched.

## What this does not claim

- **No SoD gate**: `sod`/`proposer` still throw at construction; `sod-violation` does not
  exist in this build; nothing at `finalize()` reads `priorLegActors` yet. The evidence is
  chained and audit-readable, consumed by the second step-4 increment.
- **Cross-leg content binding is not verified** — §10.1 states it: legs may decide
  enriched or different content; both digests are chained; a host wanting identical
  content enforces it in staging.
- **No destroy/retention seam**: the destroyed-prior posture is pinned by its stand-in.
- **Comparison semantics, actor identity, and collusion limits** are the second
  increment's and §13A's ground — nothing here claims them.
- The AL1 window on the SoD evidence remains open (detached signing is the named
  upgrade, a later build step); this increment records it, nothing more.

## Process

Subagent-driven development, standing lessons in force: commands over lists;
whitespace-collapsed quote verification for markdown; repo-root sweeps, both deixis
directions; explicit increment naming; plan-authored comments truthful at the commit that
lands them (two-touch wording written into the plan itself); counts stated with the
movement named; any new rung on a tx-carrying seam decides its enlisted branch explicitly
(`open()` takes no tx — nothing to decide here, stated so the check is visibly run); the
final review checks the status doc against CODE, never task reports; no new runtime APIs —
the floor stays `>=22.16`.
