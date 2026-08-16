# Findings and acknowledgments, the read side — design

**Build-order step 7, first of two increments.** SPEC §10.2's read half, all of it
dead-until-producer: `ack-missing` and `ack-stale` (twenty-first and twenty-second
codes), `replay()`'s two throwing arms becoming folds, the findings projection on
`DecisionRecord` and `ReviewView`, and the counting-ack predicate the second increment's
coverage gate will consume — every piece exercisable today only over hand-built chains,
because no seam mints either kind until the second step-7 increment lands
`raiseFinding`/`acknowledge` + rung (5.7) + the `ackMode`/`requiredAcks` lift
atomically, exits step 7, and executes the marker ruling. Step 7 moves to Started.

## Rulings taken, so they are not re-litigated

- **The marker MOVES at step 7's exit** (step-7 brainstorm): §10.2's `[DESIGNED]` →
  `[PROVEN]` and the §8 conditional-table rows for `ack-missing`/`ack-stale` likewise —
  marker tokens only, the one sanctioned sealed-set edit class per spec-moves-to-truth's
  own text; the SECOND increment's exit executes it. Nothing in THIS increment touches
  `docs/concept/`.
- **Two increments** (step-7 brainstorm): the read side inert first (this document);
  then seams + gate + lift in one atomic commit — the seams cannot precede the lift
  (unreachable code) and the lift cannot precede the gate (fail-open).
- **`requiredAcks` takes the settled fail-closed class whole** (step-7 brainstorm):
  non-empty, pairwise distinct, non-empty-string kinds — the SECOND increment's
  construction rules; banked here. Finding kinds are their own namespace (§10.2's own
  sentence: "the reserved consultation kinds do not apply to them") — no reserved-kind
  check, and a pin will prove `'facts'` is a LEGAL finding kind.
- **`ackMode` compares against the CURRENT version's raiser.** §10.2 says the comparison
  is "relative to the finding's raiser" and a counting ack "carries the finding's
  current `findingDigest`" — the ack accepts a VERSION, so the self/counterparty
  question is asked of the identity that raised that version. A re-raise moves the
  raiser with the digest; both raisers stay chained regardless (fidelity). Recorded as
  this build's reading of a singular the spec leaves unversioned.
- **Replay throws on chain shapes the seams forbid** — a re-raise changing `kind`, an
  ack naming an absent `findingId`: the second increment's seams make both impossible
  on honest chains, so replay meeting one is a garbled/foreign chain — a storage/config
  fault (the paired-actor and garbled-tokenDigest precedents), never a fold.

---

## 1. The codes (`refusal-codes.ts`)

`ack-missing` and `ack-stale` join `RefusalCode` (twenty-first and twenty-second; count
pins 20 → 22 in one move), both class `refusal` in `REGISTRY` — the default `appendsOn`
path: §8's conditional table, "`refusal`-class, `terminalRefusals`-able,
open-by-default". Producers worded two-touch: finalize's ack-coverage rung (5.7),
landing in the second step-7 increment. `NEVER_APPENDS` untouched.

## 2. The recorded shapes (`types.ts`)

The §4 table's "the Finding / Ack object" payloads and the projection, defined here so
replay can read them; the second increment's seams mint them byte-identically:

```ts
/** The finding-raised payload (SPEC §4's Finding object; §10.2). `raiser` is embedded
 * the way `confirmed` embeds `actor` — the seam's identity argument, chained. */
export interface FindingRaisedPayload {
  findingId: string;
  kind: string; // immutable per findingId — the seam throws on a re-raise changing it
  findingDigest: Digest; // digest-only custody: the host retains the content (§3)
  magnitude?: string; // opaque, exact-equality; canonicalization is the host's duty
  raiser: IdentityAssertion;
}
/** The acknowledged payload (SPEC §4's Ack object; §10.2). The digest names the finding
 * VERSION accepted; a stale one is recorded anyway and never counts (fidelity). */
export interface AcknowledgedPayload {
  findingId: string;
  findingDigest: Digest;
  magnitude?: string;
  acker: IdentityAssertion;
}

/** One recorded acknowledgment, projected (order = chain order). */
export interface RecordedAck {
  findingDigest: Digest;
  magnitude?: string;
  acker: IdentityAssertion;
}
/** One finding, projected: the CURRENT version (last raise wins) plus every recorded
 * ack. First-raise order across the record. */
export interface RecordedFinding {
  findingId: string;
  kind: string;
  findingDigest: Digest; // current
  magnitude?: string; // current version's, present-iff-present
  raiser: IdentityAssertion; // current version's — the ackMode ruling above
  acks: RecordedAck[];
}
```

`DecisionRecord` gains `findings?: RecordedFinding[]` — present iff the chain carries at
least one `finding-raised` (a findings-free record omits the key; a non-declaring
profile can never acquire one once the seams exist, §10.2's byte-identity sentence).

## 3. The replay arms (`chain/replay.ts`)

The two `throw` arms become folds:

- `finding-raised`: upsert into `record.findings` by `findingId` — a NEW id appends (in
  first-raise order); an EXISTING id is a content update, moving `findingDigest`,
  `magnitude` (present-iff-present on the raise — an update without magnitude CLEARS
  it), and `raiser` to the new version's, order unmoved. A re-raise whose `kind`
  differs THROWS (the storage-fault ruling — the seam forbids it on honest chains).
- `acknowledged`: append `{ findingDigest, magnitude?, acker }` to the named finding's
  `acks`. A `findingId` absent from the record THROWS (same ruling). Stale digests and
  `ackMode`-violating acks fold like any other — "recorded and visibly non-counting
  (fidelity, not validity)"; counting is the predicate's business, never replay's.
- Neither kind moves `state` (the store already maps both state-preserving).

## 4. The predicate and the coverage derivation (`kernel/findings.ts`, new)

One module, pure functions, no store access — the second increment's gate and this
increment's review projection consume the SAME derivation (the prior-legs/consultations
module precedent):

```ts
/** Does `ack` COUNT for `finding` under `ackMode`? SPEC §10.2's counting rules:
 * current-digest equality; `magnitude` exact and present-iff-present BOTH directions;
 * ackMode by principal-only comparison against the (current version's) raiser —
 * `self`: acker.principal === raiser.principal; `counterparty`: !==; `any`: either.
 * A missing/empty principal on either side fails closed (never counts). */
export function ackCounts(
  finding: RecordedFinding,
  ack: RecordedAck,
  ackMode: 'self' | 'counterparty' | 'any',
): boolean;

export type FindingCoverage = 'covered' | 'ack-missing' | 'ack-stale' | 'not-required';
/** Per-finding coverage for a leg's config (SPEC §9's review projection; §10.2's gate
 * semantics): a finding whose kind is not in `requiredAcks` is `not-required` (recorded
 * evidence, never gates); zero acks ⇒ `ack-missing`; acks but none counting ⇒
 * `ack-stale`; any counting ack ⇒ `covered`. The gate's trip is the FIRST non-covered
 * required finding in first-raise order — derived by the caller from this array. */
export function findingCoverage(
  findings: readonly RecordedFinding[] | undefined,
  ackMode: 'self' | 'counterparty' | 'any' | undefined,
  requiredAcks: readonly string[] | undefined,
): { finding: RecordedFinding; coverage: FindingCoverage }[];
```

(An undeclared flow — `ackMode`/`requiredAcks` undefined — coverage-classifies every
finding `not-required`; §10.2's vacuous-pass rule falls out: zero raised findings of a
required kind produce zero non-covered entries.)

## 5. The review projection (`kernel/review.ts`, `types.ts`)

`ReviewView` gains the digest-only findings projection §9's row promises —
`findings?: { findingId, kind, findingDigest, magnitude?, coverage }[]`, present iff the
record has findings, coverage from `findingCoverage` under the record's own resolved
leg. Digest-only throughout: content never appears (§3). Reachable this increment only
over hand-built chains — the pins seed a store with correctly-linked
finding/ack-bearing chains (the established `buildChain`/`seed` shape) and read
`getRecord`/`review` through a real instance.

## 6. Tests

- **Count pins**: 20 → 22 in one move (both registry files; the arithmetic prose); TWO
  matrix sections (`content-drift`-shape each), producers two-touch.
- **Replay pins** (hand-built chains): a raise folds (key-set of the projected finding);
  re-raise updates digest+magnitude+raiser with ORDER preserved and a
  magnitude-clearing update pinned; kind-mutation THROWS; an ack appends in order;
  ack-to-absent-findingId THROWS; a stale-digest ack folds (fidelity — recorded,
  visible); neither kind moves `state`; a findings-free record omits the key.
- **Predicate pins** (pure): counting requires current digest (stale fails); magnitude
  present-iff-present BOTH directions (ack-with vs finding-without and the reverse both
  fail; exact-equality mismatch fails); `self`/`counterparty`/`any` principal-only
  (same principal under a different authority still matches — the §10.1-established
  principal-only posture, here in the COUNTING direction; a counterparty ack by the
  raiser's principal under another authority does NOT count); missing/empty principal
  fails closed on either side.
- **Coverage pins**: not-required never gates; ack-missing vs ack-stale distinguished;
  covered on any counting ack; first-raise order preserved in the array; the undeclared
  flow classifies everything not-required; `'facts'` as a finding kind is LEGAL (the
  own-namespace pin).
- **Review projection pin**: a seeded chain's `review()` carries the digest-only
  projection with coverage; no content field anywhere.
- **Frozen surfaces**: untouched; the suite stays green (nothing mints the kinds — the
  two-touch wording holds until the second step-7 increment).

## 7. The record — step 7 starts

- **Status doc**: steps table → step 7 **Started** (first of two increments: the read
  side; the seams + rung (5.7) + the lift + THE MARKER MOVE remaining, exiting step 7).
  §10.2 row: the read half built (arms, shapes, predicate, projection), the seams/gate
  NOT (`ackMode`/`requiredAcks` still GOVERNED — governed count UNCHANGED at 4, stated);
  the marker explicitly NOT yet moved (it moves at the exit, per the ruling). §8 row:
  twenty-two codes. §9 row: review's findings projection real (over chains only a
  future seam can mint — said plainly). The ackMode-current-raiser reading and the
  replay-throws rulings recorded.
- **CLAUDE.md / README**: step 7 started; "two of the eight build-order steps remain
  unstarted" → **one (step 8)** — verify the arithmetic before writing.
- **Register**: no rows expected to move (verify by reading).
- **Comment truth**: sweep LAST against the committed tree; patterns per the standing
  list plus `finding-raised`, `acknowledged`, `findings`, `ack-missing`, `ack-stale`,
  `ackMode`, `requiredAcks`, `first step-7`, `second step-7`, the OLD shapes' literal
  text (replay's "throws on `finding-raised`/`acknowledged`" doc sentences; "no
  `raiseFinding` or `acknowledge` seam"; "replay throws on either kind"; `twenty`/old
  counts; the §10.2 status-doc row's prior text); hit-count == verdict-count.
- No maturity marker moves in THIS increment; `docs/concept/` untouched.

## What this does not claim

- **No seams**: `raiseFinding`/`acknowledge` do not exist; no chain a host can mint
  carries either kind; the projection and predicate execute only over hand-built
  chains. `ackMode`/`requiredAcks` still throw at construction.
- **No gate**: rung (5.7) does not exist; nothing at finalize reads findings; a
  declaring profile is not yet constructible, so no fail-open window exists.
- **The library never interprets magnitude** — an opaque string, exact equality,
  host-canonicalized (§10.2's own bound, travelling with every statement).
- Step 8 unstarted; the marker unmoved.

## Process

Subagent-driven development, standing lessons in force: plan-authored comments truthful
at the commit that lands them (two-touch); counts stated with the movement named (the
governed count does NOT move here — said explicitly); fence balance verified after any
plan edit touching code blocks; every code identifier written into docs verified
against the tree first; the record task's sweep runs LAST, once, against the committed
tree, greps old shapes' literal text, and shows hit-count == verdict-count; a mandated
RED run is executed or its substitution stated; no new rung on a tx-carrying seam
without an enlisted-branch decision (nothing here touches a seam at all — stated); the
final review checks the status doc against CODE; no new runtime APIs — the floor stays
`>=22.16`.
