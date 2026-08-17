# AL2 freshness — design

**AL2 increment 3 of 3; the guard era ends.** SPEC §11.1's freshness gate becomes
real: the obtained-consultation input gains `observedAt?` (the recorded-claim,
signing-gated design), rung 5.5 gains the freshness arm refusing the twenty-fourth
code `consultation-stale`, and the LAST GOVERNED construction guard — `freshness`,
guarded since the kernel increment — lifts behind `validateFreshness`. The governed
count reaches ZERO: the feature-guards-from-day-one era the kernel increment opened
closes, and the guard-sweep-total test takes its terminal inverted form. At exit the
sanctioned sealed bundle executes (four tokens, OQ §4's three tails, the parked OQ §1
pointer fix, and — enumerated NOW per lesson 24 — OQ §1's fourth tail completing from
"Still open" to decided). After this increment the step-8 tail holds ONE item: the
self-test tier.

## Rulings taken at the freshness gate, so they are not re-litigated

- **Recorded claim, signing-gated.** `observedAt?` (RFC3339 string) on the OBTAINED
  consultation input only (never the unreachable marker); accepted ONLY on a signing
  profile via a presence contract at profile-resolution depth (the `opts.policy`
  precedent — a non-signing profile's `observedAt` THROWS, preserving AL1's
  clock-trust posture verbatim); recorded into the consultation transition's payload,
  digest- and SIGNATURE-covered — tamper-evident after recording. Genuineness of the
  claim stays the checker's attestation (`proofRef`) and the operator-assurance
  probes — the eligibility/path-independence limit class, stated wherever described.
- **The three OQ §4 answers**: (1) freshness-eligible kinds ⊆ the leg's required
  kinds — every `freshness` key must be in `requiredConsultations`, or `'eligibility'`
  where the leg declares it; a bounded required kind whose input lacks `observedAt`,
  or claims a FUTURE one, refuses `consultation-stale` fail-closed (the bound demands
  an evaluable, sane time). (2) No in-attempt re-entry: inputs are fixed per finalize
  call; the refusal leaves the record open and the seam re-arms per invocation.
  (3) Facts gets NO own bound: the `facts` consultation is library-stamped at the
  finalize instant — recording IS observation at that seam; a host wanting
  surface-age gating models its renderer as an ordinary timestamped kind. All three
  recorded as OQ §4 tails.
- **The sealed bundle**: SPEC:527's row marker `[SKETCHED — AL2-dependent]` →
  `[PROVEN]` (the §8 marker-column convention — the dependency note dissolves into
  the row's own prose, which already says "can only fire with authority timestamps");
  SPEC:634's `**[SKETCHED]**` → `**[PROVEN]**` (the trailing conditional clause
  stays — still true); SPEC:951's inline `[SKETCHED]` → `[PROVEN]` (the sentence
  stays accurate — the gate IS AL2-dependent); CONTROLS:47's cell
  `SKETCHED (AL2-dependent)` → `PROVEN (AL2-dependent)` (the parenthetical stays
  true — construction requires signing); OQ §4's three Decided tails; the parked
  OQ §1 bare-"§2" pointer → "SPEC §2" (disambiguating from OQ's own §2); and OQ §1's
  fourth (authority-timestamps) tail completing: "**Still open:** …" → "**Decided
  (this build):** the recorded-claim, signing-gated design — see §4 below." — the
  lesson-24 enumeration done BEFORE execution this time. The plan's sealed task greps
  the sealed docs for "open decision|Still open|not yet decided|a later|unbuilt"
  stems near freshness/timestamps and enumerates any further hit BEFORE editing;
  none is edited without appearing in the brief's before/after list.
- **One increment; the guard era ends.** The governed count moves 1 → 0. The
  guard-sweep-total test inverts into its terminal pin — argued in place as the
  numbered sequence's next self-authored inversion (count the sequence at plan time):
  a FULLY-LOADED profile declaring every once-governed field constructs cleanly, and
  no per-field `governedUnavailable` caller remains (the helper itself SURVIVES for
  the generic unknown-key throws — `open()`'s — stated precisely).

## Rulings taken at this spec, argued in place

- **The recorded Consultation shape extension is spec-anticipated, not a divergence.**
  §2's Consultation table lists the AL1 shape; §14's own sentence — "AL2 admits
  authority timestamps inside digested payloads for required consultations" — and
  §11.1's "authority timestamps carried inside the digested payload (§14)" are the
  admission the field lands under. `Consultation` (types.ts) gains
  `observedAt?: string`, present-iff-supplied; recorded in the status doc as the
  reading (the §2-lists-AL1 frame), beside the `status`/`acker` divergence entries'
  register but as an ADMITTED extension, not a recorded divergence.
- **The gate arm sits inside rung 5.5's effective-kinds loop, after verdict-pass**:
  a required kind that passed its verdict and carries a `freshness` bound then
  requires `observedAt` present, parseable, not in the future, and
  `now - observedAt <= bound seconds`; any failure refuses `consultation-stale` via
  `refuseMaybeAppend` — `refusal`-class, open-by-default for re-run (the
  `consultation-failed` family's own register), `terminalRefusals`-able.
- **`validateFreshness` (config.ts), the settled class**: declaring `freshness`
  requires `signing: true` on the profile (the AL2 dependency made structural —
  §11.1's "meaningful only" sentence); the record non-empty; every key a non-empty
  string ∈ (the leg's `requiredConsultations` ∪ `'eligibility'` iff the leg declares
  `eligibility`) — the ⊆ rule makes a separate reserved-kind arm unnecessary
  (reserved kinds cannot be required, so they cannot be bounded; stated); every value
  a positive finite integer (seconds — the `ttl` convention). The GOVERNED throw
  deletes in the same commit.
- **Intake vs presence**: `validateConsultations` (argument depth) accepts
  `observedAt` structurally on the obtained shape only — a non-string or unparseable
  value throws there; the unreachable MARKER shape does not gain the key (no
  observation happened — an `observedAt` on a marker stays the unknown-key throw).
  The signing-profile requirement is NOT argument-depth (the validator cannot see the
  profile): it is the presence contract at profile-resolution depth, exactly
  `opts.policy`'s ordering (chain-compromise and unknown-profile still outrank it).
- **The 24th code**: `consultation-stale` joins the union and `REGISTRY` (count pins
  23 → 24 in one move), default `appendsOn` path, NEVER_APPENDS untouched; its own
  matrix section; producer PRESENT-TENSE (the arm lands in the same commit).

## 1. Tests

- **Construction**: freshness without `signing: true` throws (the AL2 dependency);
  a key not in the leg's required set throws; `'eligibility'` as a key legal iff the
  leg declares `eligibility`, throws otherwise; zero/negative/non-integer seconds
  throw; empty record throws; the FULLY-LOADED profile (every once-governed field
  declared: `captureMode:'live'` + `signing` + `redeem{reverify}` + per-leg
  `requiredConsultations` + `eligibility` + `sod`/`proposer` (multi-leg) + `ackMode`/
  `requiredAcks` + `freshness`) constructs cleanly — the guard era's terminal pin,
  with the inversion argued in place; no per-field `governedUnavailable` caller
  remains (the generic unknown-key throws survive, named).
- **Intake/presence**: malformed `observedAt` throws at argument depth; a marker
  carrying it throws unknown-key; a NON-signing profile's obtained `observedAt`
  throws at profile-resolution depth (and a tampered chain still refuses
  `chain-compromise` first — the adjacency pin, the policy contract's own shape).
- **The gate** (createWithClock, a signing profile with
  `freshness: { 'risk-check': 3600 }`): a fresh `observedAt` passes AND records
  (the chain's consultation payload carries it — key-set pin — and the transition is
  signed); a stale one refuses `consultation-stale`, record stays open, a re-invoke
  with a fresh consultation confirms (the re-arm pin); missing `observedAt` on the
  bounded kind refuses; a FUTURE `observedAt` refuses; an unbounded required kind
  ignores `observedAt` entirely; `terminalRefusals: ['consultation-stale']` ends the
  leg (appended refusal).
- **Count pins**: 23 → 24 in one move; the matrix section; the arithmetic.
- **Byte-identity**: a signing profile WITHOUT freshness and without observedAt
  inputs is byte-identical to before (present-iff-supplied); non-declaring profiles
  untouched (frozen pins).

## 2. The record — AL2 whole, the guard era ends

- **Status doc**: step 8 row (AL2 increment 3 of 3 — AL2 WHOLE across its three
  increments; the tail = the self-test tier alone, OQ §5); the §11.1 row (freshness
  real — the design, the three OQ §4 answers, the recorded-claim limit); the §8 row
  (twenty-four codes); the §14 row (authority timestamps decided; the OQ §1 fourth
  tail completed); the Consultation-shape extension reading recorded; **the governed
  count 1 → 0 with the era narrated**: every guard the kernel increment installed has
  now lifted behind its own behavior, each in the same commit as that behavior — the
  discipline's own exit, stated as such. The guard-sweep terminal inversion recorded
  in the numbered sequence.
- **Register row 17**: amended — AL2 whole; the tail = the self-test tier (OQ §5).
- **CLAUDE.md / README**: the guards paragraph gains its terminal sentence (zero
  governed fields; the era closed at the AL2 freshness increment); AL2 whole;
  twenty-four codes where counts appear.
- **Sweep** (LAST, hit==verdict): the standing list plus `freshness`, `observedAt`,
  `consultation-stale`, `twenty-three|23`, `governed`, `cannot fire`, `unfireable`,
  `vacuity|vacuous`, `Still open`, `AL2-dependent`, `last guard|one guard|1 guard`,
  the mint/enforcement rows' "freshness … waits/stays/remains" cells (lesson 21 —
  THIS increment falsifies them), `down to (one|1|zero|0)`.

## What this does not claim

- **The library never verifies the observation happened at `observedAt`** — it gates
  on the recorded, signature-covered CLAIM; genuineness is `proofRef` + the
  operator-assurance probes. Stated wherever the gate is described.
- **Recording-time `at` is unchanged** — library-stamped, never host-supplied; the
  §11.1 sentence stands untouched.
- **The self-test tier remains** (OQ §5) — the step-8 tail's last item; step 8 does
  not exit here.
- No store, encoding, or decorator changes; the sidecar and enforcement are
  untouched (the new consultation payload byte is covered by both automatically).

## Process

Subagent-driven development, standing lessons in force: the sealed task's brief
pastes full before/after lines, the controller word-diffs run by run (lesson 22), and
the going-false stems are grepped and enumerated BEFORE editing (lesson 24, applied
at enumeration this time); escape-free cited strings (lesson 20); the record task
greps the prior increments' freshness-absence vocabulary (lesson 21); a ruling
amending a test sweeps its file header (lesson 23); counts with movement — 1 → 0 IS
the increment's headline and every "one guard remains"-class tail amends; RED
executed; the final review checks the status doc against CODE.
