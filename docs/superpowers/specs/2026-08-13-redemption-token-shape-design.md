# Redemption, the token shape — design

**Build-order step 3, second increment.** SPEC §11.2's separated-store half: the single-use
redemption token, `confirmed → redeeming { tokenDigest }` at issuance and
`redeeming → redeemed { via: 'token', tokenDigest }` on presentation, with at-most-once
preserved throughout (DECISIONS #30: tokens digest-only, non-recoverable, at-most-once over
convenience). Deferral-register **row 10 retires by building** — this is "the build step that
first produces a `redeeming` state," its own named trigger.

This design was audited before being written down: four independent reviews (spec fidelity
against the sealed concept set, codebase impact, process record, adversarial design attack)
ran over the presented draft, and every finding is either absorbed below or recorded as a
ruling. The adversarial review found **no Critical defect**: at-most-once survived every
constructible race, and token custody held.

## Rulings taken, so they are not re-litigated

- **Two new operator calls, and the naming divergence is recorded, not silenced.**
  `beginRedemption` / `completeRedemption` join the operator surface. Every enumeration of
  that surface in the sealed set (SPEC §9, ARCHITECTURE, GLOSSARY) names exactly one
  redemption verb, `redeem()`, and §11.2 frames the token shape purely as a chain sequence —
  so the two call names are this build's invention, **recorded in
  `docs/process/implementation-status.md` as a held spec-vs-build naming divergence** and
  flagged to register row 6's pre-0.1 naming review. The single-verb alternative was
  considered and rejected: `redeem()` without `tx` already means the direct shape (shipped
  and pinned at the first step-3 increment), and one verb would hide two different return
  shapes behind a mode flag.
- **`redeemBound` throws GOVERNED at construction until the clock increment.** §4's
  `redeeming` payload row makes `bound` present-**iff**-declared, in digested, append-only
  chain bytes — unlike `confirmToRedeem`'s recorded deferral, which touches only `dueAt`, a
  listing index §12 calls "never authoritative." A second-increment `redeeming` edge minted
  on a declaring profile would permanently lack a spec-required key, unrepairable when the
  clock lands. So `config.ts` gains a GOVERNED guard: `redeem.redeemBound` present
  ⇒ construction throw, lifted by the third step-3 increment (the clocks), which builds the
  `bound` payload, the `dueAt` meta, and the en-passant resolution together.
  `confirmToRedeem` stays accepted-but-inert (its gap is index-only and recorded since the
  first increment) — the asymmetry is argued from bytes-vs-index. The test corpus's
  `effectSeamProfile()` helper today declares `redeemBound: 86400`; dropping it is a
  fixture change, verified against the frozen byte-stability literals (none involve an
  effect-seam profile), and the de-facto acceptance it pinned inverts **with this stated
  authorization**, argued in place at the helper and pinned by a new
  construction-validation test on the GOVERNED throw.
- **The CAS-residual re-read lands family-wide, direct `redeem()` included.** A completion
  losing the race to another completion finds the record `redeemed` — §11.2's literal
  "replayed redemption of an already-redeemed record" — and must refuse `already-redeemed`,
  not a flat `unredeemable-state`. On any `!res.appended`, the seam re-reads the chain once
  (advisory — no append, at-most-once untouched) and re-runs its own state-gate mapping on
  the fresh state. Direct `redeem()` gets the same refinement: an **authorized behavior
  change** to the first increment's seam (its flat residual was never pinned — the first
  increment's tests deliberately declined a racing store), argued in place at the seam and
  recorded in the status doc.
- **The whole clock cluster stays with increment C.** No `bound` payload key, no `dueAt`
  production, no en-passant resolution, no `redemption-timeout` code (a code with no
  producer that can turn a test red does not ship). With the `redeemBound` guard above, no
  chain this increment can mint ever violates §4's present-iff-declared rule.
- **`CORE` renames to `REGISTRY`**, honoring `refusal-codes.ts`'s own recorded promise
  ("a rename is deferred to the token-shape increment"). DECISIONS #14's language — "the
  refusal registry is a compiler-total map" — supplies the name. The rename is internal:
  `index.ts` exports only the `RefusalCode` type, never the map, so the public surface is
  untouched. Twenty-five sites across seven files (src: `refusal-codes.ts`, `outcome.ts`,
  `store/semantics.ts`, `kernel/open.ts` prose; test: `outcome-model`, `refusal-matrix`,
  `unknown-ids`), `REGISTRY` collision-free.
- **One file, shared prologue.** All three redemption ladders live in `kernel/redeem.ts`
  with the common rungs — load chain (throw on unknown recordId), chain-verify FIRST,
  resolve profile (throw on a persisted legId absent from it), effect-seam/final-leg gate —
  extracted into one local helper, threaded with a seam name for the throw messages. The
  state gates stay out of the helper. The enlisted-`tx` compromise branch remains
  direct-only, simply because the new seams never pass `tx`. Increment C's en-passant clock
  resolution then edits the prologue once, not three ladders.

---

## 1. The two seams

```ts
beginRedemption(recordId: string, content: unknown):
  Promise<Outcome<{ recordId: string; state: 'redeeming'; token: string; transitionRef: Digest }>>
completeRedemption(recordId: string, token: string, content: unknown):
  Promise<Outcome<{ recordId: string; state: 'redeemed'; transitionRef: Digest }>>
```

Both are **operator-only** and **take no `tx`**: the token shape exists for hosts with no
shared transaction (§11.2 — "When no transaction is shared"), §12's `tx` seam states its
purpose as the co-located direct shape, and enlisting an issuance would let a host rollback
erase the recorded `tokenDigest` while the live token is out. Adding an optional trailing
`tx?` later is additive, not breaking; the one architecture this forecloses for now — a
co-located record store with a remote executor wanting the `redeeming` edge atomic with a
host outbox row — goes to the deferral register rather than into this increment.

**Begin**, after the shared prologue:

```
(4) state gate      → 'redeemed'  ⇒ already-redeemed (a begin against a redeemed record IS
                      §11.2's "replayed redemption of an already-redeemed record")
                      'redeeming' ⇒ unredeemable-state — NO RE-ISSUE (DECISIONS #30: "a
                      persisted or re-issuable token would trade the at-most-once guarantee
                      for convenience"); argued in a comment as this build's mapping, since
                      §8's producer enumeration predates the state
                      other non-'confirmed' ⇒ unredeemable-state
(5) correspondence  → the same recompute path as direct rung (5) ⇒ effect-mismatch.
                      This begin-time check is this build's ADDITION, comment-argued, not
                      spec-granted: §11.2's correspondence sentence reads at "the effect
                      being executed" (completion), but the Honest bound's "mismatched
                      effects refusable at the seam" is exactly what refusing BEFORE a token
                      is ever issued buys.
(6) issue + append  → token = tokenSource() (below); tokenDigest = digest(token);
                      append confirmed → redeeming { tokenDigest }, meta from the
                      derivation (nonTerminal('redeeming', finalLeg, effectSeam) — true),
                      dueAt omitted; then return ok({ recordId, state: 'redeeming', token,
                      transitionRef }) — the token's one and only surfacing, generated
                      before the append, returned only after it (a crash between the two
                      strands the record per §11.2's lost-token pricing; the reverse order
                      would hand out a token whose edge never landed, strictly worse).
                      CAS residual ⇒ the re-read refinement (rulings above).
```

**Complete**, after the shared prologue:

```
(4) state gate      → 'redeemed' ⇒ already-redeemed (at-most-once's replay half, checked
                      BEFORE any correspondence — outranks mismatch reporting)
                      'redemption-failed' ⇒ unredeemable-state — DEAD-UNTIL-C, not merely
                      defensive: replay() still throws on that kind upstream, so this arm
                      cannot be reached until C builds the producer AND the replay arm;
                      commented as exactly that
                      non-'redeeming' (a never-began 'confirmed' included) ⇒
                      unredeemable-state
(5) correspondence  → (a) caller-error guard: a non-string `token` THROWS (a caller bug,
                      §8's caller-errors-are-not-refusals — never an incidental TypeError
                      out of the crypto internals);
                      (b) read tokenDigest off the verified chain's redeeming transition
                      payload via a local reading-convention interface; a payload without a
                      string tokenDigest THROWS naming the storage fault (§8's loud-throw
                      posture for garbled persisted data, mirroring the legId throws) —
                      never a permanent effect-mismatch loop;
                      (c) digest(token) !== recorded tokenDigest ⇒ effect-mismatch;
                      (d) content re-digest mismatch ⇒ effect-mismatch.
                      Token before content is unobservable from outside (one code covers
                      both, per §11.2's single effect-mismatch) — recorded here because no
                      test can pin the internal order via codes.
(6) append          → redeeming → redeemed { via: 'token', tokenDigest }, meta from the
                      derivation (terminal — THE RELEASE via the token path), dueAt
                      omitted; CAS residual ⇒ the re-read refinement.
```

Direct `redeem()` changes twice: its `redeeming` state-gate arm stops being defensive — a
direct close of a token-opened window would bypass the presentation the executor
deduplicates on, so it refuses `unredeemable-state`, now reachable and pinned — and its
residual gains the family re-read (rulings above). The chain read at (5)(b) trusts
verify-first: under library emissions a chain holds at most one `redeeming` transition (no
kind returns to `confirmed`; every exit from `redeeming` is terminal), and a multi-`redeeming`
chain requires a hash-recomputing storage adversary AL1 concedes wholesale (§13A).

## 2. The token

`node:crypto` `randomBytes(32)` → base64url: 43 characters, 256 bits, satisfying §11.2's
"enough entropy that its digest is not invertible by guessing" (§13's low-entropy-preimage
limit). `tokenDigest = digest(token)` under the record's recorded algorithm —
`canonical.ts`'s `digest()` takes the plain string directly (UTF-8, no JCS involved: a token
is bytes to hash, not a JSON structure). The convention is internal-only, safely so: tokens
never cross implementations, because they are never persisted.

**The generator is injectable, internally.** `KernelContext` gains a `tokenSource` beside
`now` and `mintId` (default: the `randomBytes` expression above), reachable through the same
internal construction seam as `createWithClock` and, like it, deliberately absent from
`index.ts`. This is what makes the token flow **byte-identity-coverable**: the cross-backing
byte-identity corpus gains a begin+complete leg under a fixed injected token — the first
minted kinds whose payloads exercise the two backings' differing round-trip postures
(JSON-stringify vs structuredClone) — where the presented draft had wrongly written the
corpus off as untouchable under crypto randomness.

**Custody**: the token appears in exactly one place, begin's `ok` value. Refusal outcomes,
throws, the chain, store rows, and the `redeemed` payload (digest only) never carry it — all
pinned (§5 below). The completion compare is `===` over digest strings and stays that way,
with the argument written at the compare so nobody "fixes" it into `timingSafeEqual`: the
compared value is public chain data any reader already holds; the secret is the preimage,
protected by preimage resistance, and a timing oracle on `===` can only recover the
non-secret side. Host-facing doc note: the begin `ok` payload is secret material — do not
log it.

## 3. What moves in existing code

- **`chain/replay.ts`** gains the `redeeming` arm (state only; `tokenDigest`/`bound` are
  evidence, read by no replay rule — the `via` precedent). `redemption-failed` keeps
  throwing until C. The arm quietly fixes two latent throws, both pinned: `open()`'s
  C1-blocker replay over a `redeeming` blocker (pre-B that path threw; now
  `record-exists`), and reads (`getRecord`/`review`) over `redeeming` chains.
- **`kernel/finalize.ts`'s `appendChainCompromise`** gains the `redeeming` candidate in both
  lists (main: `[replay(chain).state, 'open', 'confirmed', 'redeeming']`; catch fallback:
  `['open', 'confirmed', 'redeeming']`) — **register row 10 retires by building**, and the
  catch branch is where the static entry earns its keep: a genesis-kind-tampered `redeeming`
  chain never reaches replay's state fold. Behavior change pinned: pre-B a tampered
  `redeeming` chain surfaced ref-less through the catch; post-B it lands
  `redeeming → refused` WITH a transitionRef, §5's admitted-directly rule ("both are
  non-terminal states").
- **`config.ts`**: the GOVERNED `redeemBound` guard (rulings above), keyed inside the
  `redeem` block only — the stray-key check already covers misplacement.
- **`refusal-codes.ts` and the rename's six other files**: `CORE` → `REGISTRY`; the
  promise-NOTE is replaced by the plain description; the two producer extensions
  (`unredeemable-state` on `redeeming` at begin and at direct `redeem()`) are recorded in
  the status doc per §8's stability rule, comment-marked at the seam as this build's
  mappings, the way the existing defensive arms already are.
- **`operator-surface.ts` / `create.ts`**: the two seams wired through `Kernel` and the
  frozen operator literal; the agent surface does not grow, and
  `agent-unreachability.test.ts`'s `TRANSITIONING` probe array gains both names (the
  key-set pin would catch a leak regardless; the negative space stays symmetric).
- **`seal()`**: no code edit — its gate (4) derivation already refuses non-terminal
  `redeeming` — but the behavior converts from argued to proven now that the state is
  constructible (`seal.test.ts` pin).

## 4. What deliberately does not move

- **Store semantics**: `stateOf` already maps all three redemption kinds, C1 counts any
  `redeeming` non-terminal via the persisted flag, C3's carve-out predicate already carries
  its defence-in-depth `redeeming` arm. Both backings' files are untouched except
  `semantics.ts`'s mechanical rename import and its now-fulfilled hedge comment ("if a
  later build step made that state reachable" — it did: this one).
- **Byte-stability**: the four frozen digest literals never move — the minimal model
  contains no redemption, and none of the frozen chains involve an effect-seam profile
  (verified against the fixture change to `effectSeamProfile()`).
- **The registry count**: no new codes; the 13-code pins in `outcome-model` and
  `refusal-matrix` hold as-is (modulo the rename).
- **The clocks**, whole, to increment C — including §9.1's "SHOULD declare `redeemBound`"
  advice, which the GOVERNED guard makes loudly unsatisfiable rather than silently inert
  until C.

## 5. Tests (red-first throughout)

New `packages/record/test/redeem-token.test.ts`, plus surgical edits elsewhere:

- **Begin happy path**: ok with `{ recordId, state: 'redeeming', token, transitionRef }`;
  chain ends `[…, confirmed, redeeming]`; **payload key-set pin**: exactly `{ tokenDigest }`
  (the no-`bound` pin, made unconditional by the R2 guard); `digest(token) === tokenDigest`;
  token format pin (43-char base64url); two begins on distinct records differ;
  `getRecord` state `redeeming`, status `active`.
- **Token custody sweep**: after begin and after complete, the serialized chain, the SQLite
  row dumps (`transitions`/`records`/`staged`), and every refusal outcome contain no token
  substring; the begin `ok` value is its only appearance.
- **Complete happy path**: `redeeming → redeemed`, **payload key-set pin**: exactly
  `{ via: 'token', tokenDigest }`; state `redeemed`.
- **THE RELEASE via the token path**: after completion, `findNonTerminal` → null and a
  fresh `open()` for the pair succeeds.
- **Exclusivity while `redeeming`**: second `open()` ⇒ `record-exists` naming the blocker;
  `findNonTerminal` returns it (§4's never-auto-resolves pin, non-due variant — and the
  latent-throw fix pin: pre-B this blocker replay threw).
- **At-most-once**: complete replay on `redeemed` ⇒ `already-redeemed`; begin on
  `redeemed` ⇒ `already-redeemed`; begin on `redeeming` ⇒ `unredeemable-state` (no
  re-issue); wrong token ⇒ `effect-mismatch`, no append; altered content ⇒
  `effect-mismatch`, no append; content that re-canonicalizes identically ⇒ ok.
- **The racing residual** (the refinement's own pin): a wrapping store (the
  `TamperingStore` pattern) makes the winner's completion land between the loser's read and
  CAS — the loser refuses `already-redeemed`, agreeing with re-invocation. One direct-shape
  case pins the family-wide change.
- **Never-began / wrong-state**: complete on `confirmed` ⇒ `unredeemable-state`; begin on
  pure-capture, `open`, `refused` ⇒ `unredeemable-state`; direct `redeem()` on `redeeming`
  ⇒ `unredeemable-state` (the formerly-defensive arm, now pinned).
- **Loud throws**: unknown `recordId` throws on both seams; non-string `token` throws;
  a hash-intact chain whose `redeeming` payload lacks a string `tokenDigest` throws naming
  the storage fault.
- **Verify-first + row 10**: tampered `redeeming` chain at a mutating seam ⇒
  `chain-compromise` WITH a transitionRef, edge `redeeming → refused`; adjacent-pair order
  tests for both new ladders per the standing derivation discipline, including complete's
  `redeemed`+wrong-token ⇒ `already-redeemed` pair (at-most-once outranks mismatch), with
  non-constructible pairs excluded in a derivation comment.
- **Strand pins** (safe to ship, not yet safe to operate): on a begun record, `seal()` ⇒
  `unsealable-state`, direct `redeem()` ⇒ `unredeemable-state`, `finalize()` ⇒
  `record-not-open`, `open()` ⇒ `record-exists`, and `listDue(anything)` never lists it
  (no `dueAt` exists) — `completeRedemption` with the token is the sole exit, stated in
  the status doc together with the honest note that operator-owned storage makes deliberate
  tampering the only other C1 release, which is the argument for landing C promptly.
- **Construction**: `redeemBound` ⇒ GOVERNED throw (new pin); `effectSeamProfile()` drops
  the field with the authorization note argued in place.
- **Conformance suite** (store-behavior, run over both backings): `confirmed → redeeming`
  CAS; C1 holding under a persisted non-terminal `redeeming`; `redeeming → redeemed`
  releasing; the `redeeming → refused` compromise admission both backings' C3 gates already
  pass but nothing pins today.
- **Cross-backing byte-identity**: a begin+complete leg under a fixed injected token — the
  new kinds' first cross-backing encoding coverage.
- **`seal.test.ts`**: seal-on-`redeeming` ⇒ `unsealable-state` (argued → proven).

## 6. The record

- **Register**: row 10 deleted (retires by building; number never reused). One new row: the
  enlisted-token-shape architecture deferral (co-located store + remote executor, `tx?` on
  the token seams), next never-used number, trigger: the first host that needs it, or the
  0.1 cut.
- **Status doc** (`docs/process/implementation-status.md`), per the audit's must-edit list:
  steps-table step-3 row (two of three increments landed); §2, §4, §5, §9, §9.1, §11.2 rows
  move; the row-10 bullet leaves "Still outstanding" for a named-boundaries retirement
  paragraph; new recorded items — the API-naming divergence (flagged to row 6's review),
  the two `unredeemable-state` producer extensions, the family-wide residual refinement as
  an authorized change to the first increment's seam, the begin-time correspondence
  addition, and the safe-to-ship-not-yet-safe-to-operate statement with the sole-exit and
  tampering-incentive notes. The steps-at-a-glance sentence (":51 — no redemption") is
  fixed as pre-existing drift, attributed to the first increment's sweep, not this one.
- **`docs/process/adopted-source-provenance.md`**: the redemption LATER-STEP bullet gains
  the "Update, present tense" note its neighbors already have — covering what the first
  increment landed (direct shape, `redeemed`) and what this one lands (token shape,
  `redeeming`, token issuance), leaving the clocks and the residual-conflict resolver as
  the remaining LATER-STEP items. A pre-existing gap: the first increment's sweep never
  touched this file.
- **CLAUDE.md / README.md**: the feature-guard paragraph rewrites (more than a word swap —
  the two calls are new, with no throwing-stub history; the governed remainder at the seam
  is the clocks, and `redeemBound` now also guards at construction); the step-3 sentences
  and the layout row gain the second increment; "five of the eight steps unstarted" is
  verified still true and left alone.
- **Pre-existing stale comments, fixed and attributed**: `types.ts:32` and `:46` (stale
  since the first step-3 increment and the seal increment respectively — missed by two
  sweeps), `exclusivity.test.ts:216` ("finalize() does not exist yet" — stale since step 1;
  fixed by this increment, recorded as pre-existing drift rather than this increment's).
- **Stale-after-this-increment comments**, per the audit's list: `nonterminal.ts:23-25`
  ("unreachable in this build"), `store/semantics.ts:94-100` (the fulfilled hedge),
  `chain/replay.ts:76-78` (the emitted-kinds list), `kernel/redeem.ts:39-41,120-121` (the
  defensive-arms framing splits: `redeeming` real, `redemption-failed` dead-until-C),
  `redeem.test.ts`'s header, and the `refusal-codes.ts` promise-NOTE.
- **Sweep** (repo root, both deixis directions, increments named explicitly — "the second
  step-3 increment", never bare "this increment"): the standing patterns plus the audit's
  additions — `CORE\b`, `unreachable in this build`, `if a later build step`,
  `no test.*can turn it red`, `second and third (step-3 )?increments?`,
  `does not exist( yet)?`, `not produced in this build`, `emits only`, `no producer`,
  `token shape`, `still unbuilt`, `re-issu`, `strand` — and one file-list addition: the
  provenance doc's LATER-STEP section is checked bullet-by-bullet for missing update notes
  whenever a LATER-STEP bucket partially lands, because its staleness carries no trigger
  keyword.
- **Leave-alone** (the historical convention, confirmed by commit-history audit): every
  `docs/superpowers/specs|plans` document from earlier increments — including the first
  step-3 increment's "the token shape does not exist" — and `docs/analysis/`'s
  point-in-time review. True when written; never swept.

## What this does not claim

- **No clocks**: `confirmToRedeem` stays accepted-but-inert (index-only gap, recorded);
  `redeemBound` is now GOVERNED-thrown; `redemption-timeout` is not in the union; no
  `dueAt` is ever produced; the elapsed-`redeeming` half of at-most-once (§11.2's
  unknown-outcome rule) has no producer. All increment C.
- **Not yet safe to operate**: until C, a lost token permanently strands its
  `(profile, subject)` pair — `completeRedemption` with the token is the sole exit, and the
  record says so in those words.
- **The sweep is still unbuilt**; `listDue` still has no kernel caller.
- **Step 3 does not exit** — two of its three increments.
- The library still never executes the effect; the separated host's executor MUST be
  idempotent, keyed on the token (§11.2's Honest bound) — the completion's state gate is
  defense-in-depth beside that obligation, never a substitute for it.
- No maturity marker moves; `docs/concept/` untouched; the held sealed-set divergences stay
  held, and this increment adds one recorded divergence of its own (the API naming).

## Process

Subagent-driven development, standing lessons in force: commands over lists; open every
record cited; whitespace-collapsed quote verification against the concept set; repo-root
sweeps with the pattern list above; explicit increment names; both-direction deixis; floor
verification — `randomBytes` and base64url encoding long predate the `>=22.16` floor
(checked against the floor, not the local Node), so the floor does not move.
