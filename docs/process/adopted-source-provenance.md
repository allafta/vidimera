# Adopted-source provenance

**What this document answers:** `packages/record/src` — this repository's kernel — was not
written from scratch. It was adopted from a reference implementation of the same spec, at a
commit marking that project's own kernel-increment milestone. This document is the durable
answer to a question nothing else in this repository records: **how does our kernel differ
from the implementation it was adopted from, and why?**

It is the deliverable of an audit internally called **R1**: a systematic, file-by-file diff of
every line we adopted against that reference project's own later history, triaging every
difference into exactly one of three buckets. R1 changed no source — it is a read-only audit.
Where R1 found something we should take, that is recorded here as a to-do for later work.

**R2 status: nine of the ten INHERIT items below are now APPLIED** (each marked with its own
commit in its section heading). The tenth — the `index.ts` `OpenOptions` export — was
**reclassified** rather than applied: on review it is a local completeness improvement this
repository can make on its own terms, not a fix this repository failed to inherit from the
reference project's later history, so it does not belong on R2's INHERIT work-list (see its own
entry for the reasoning). R2 also had to resolve, not just apply, a hazard the audit flagged in
the three-item `structuredClone` fix — see "The `structuredClone` decision, as shipped" below,
appended after the cross-cutting caveat that originally raised it.

Per this repository's standing rule, the source project is never named, linked, or dated
beyond "the reference implementation." Its commits are cited only by short hash.

## Terms, for a reader with no context

- **The kernel** — `packages/record/src`: the capability-split factory (`create()`) and
  everything it depends on (staging, opening, reviewing, finalizing a decision record).
- **A transition** — one appended, hash-linked entry in a record's history (e.g. `opened`,
  `confirmed`, `refused`).
- **The chain** — the ordered list of transitions for one record.
- **The Store** — the pluggable persistence interface (`packages/record/src/store/store.ts`),
  with one reference implementation in this build (`store/memory.ts`, in-process, non-durable).
- **SPEC §N** — a section of this repository's own normative spec, `docs/concept/SPEC.md`.
- **Base** — the reference-project commit we adopted from (short hash `c0f0f75`).
- **Head** — that same project's later commit as it stood when R1 ran (short hash `c688ce4`),
  five increments ahead of base (multi-leg separation of duties, redemption, consultations,
  policy/eligibility gating, and a richer Store — none of which this build has; every profile
  field that would switch one on throws at construction, in `packages/record/src/config.ts`).

  **Update, present tense:** this parenthetical describes the state at audit time (when R1
  ran). As of build-order steps 3 and 4's exits and step 5's first increment, three of the
  five head-ahead capabilities named above are built here too: redemption (SPEC §11.2, both
  shapes and both clocks), multi-leg separation of duties (SPEC §10.1's sequencing rung and
  SoD gate), and the consultation attach form (SPEC §11.1's unconditional half — the
  required-consultation gate itself remains unbuilt). Seven governed profile fields still
  throw at construction today, not "every" field that would switch one of these capabilities
  on. This sentence is left as R1 stated it, since it is a dated audit record;
  `docs/process/implementation-status.md` carries the current, per-section account.

  **Correction, at the second step-5 increment:** the required-consultation gate itself has
  since landed — `finalize()`'s rung 5.5 (SPEC §11.1) now reads a leg's declared
  `requiredConsultations`, so the consultation attach form is whole here, not merely its
  unconditional half. The "seven governed profile fields" count is stale too: it has since
  reached **zero**, as of the AL2 freshness increment. `docs/process/implementation-status.md`
  carries the field-by-field lineage and the current, per-section account.
- **INHERIT** — a bug fix or hardening in the adopted code that base did not have and head did;
  we should take it. **This is the only bucket with action items.**
- **LATER-STEP** — a genuine new capability, correctly excluded because we have not built the
  machinery it depends on.
- **DIVERGENCE** — this repository deliberately does something different, and should keep doing
  so.

## Method

For every file R1 covers, the audit is the equivalent of diffing the reference project's own
base commit against its own later head, restricted to that one file, then reading every
resulting hunk and classifying it with a one-line reason. R1 organized its work into five
clusters of related files; the table below reports each cluster's totals as R1 stated them.

| Cluster | Files | INHERIT | LATER-STEP | DIVERGENCE |
|---|---|---|---|---|
| chain | `chain/replay.ts`, `chain/encoding.ts` | 1 | 7 | 4 |
| store | `store/memory.ts`, `store/store.ts` | 6 | 17 | 6 |
| kernel-seams | `kernel/open.ts`, `kernel/finalize.ts` | 1 actionable (+2 already-converged, see below) | 18 | 3 |
| kernel-rest | `kernel/expiry.ts`, `kernel/stage.ts`, `kernel/review.ts`, `kernel/redeem.ts` | 1 | 17 | 6 |
| leaf-and-config | `refusal-codes.ts`, `index.ts`, `config.ts`, `create.ts`, `types.ts`, `canonical.ts`, `nonterminal.ts`, `outcome.ts`, `operator-surface.ts`, `agent-surface.ts`, `id.ts`, `profile-digest.ts` | 2 (one is a doc-companion of kernel-seams' item — see below) | 20 | 5 |

**Reconciling "11 INHERIT across the table" with "10 confirmed items" below:** one of
leaf-and-config's two INHERIT rows is the `refusal-codes.ts` comment update that documents
`kernel/open.ts`'s missing leg check — the *same underlying defect* the kernel-seams cluster
found from the `open.ts` side, not a second, independent bug. Counted once, the audit confirms
**10 distinct INHERIT items**, ranked below. `chain/encoding.ts` and `profile-digest.ts`
contribute zero deltas each (see "Two negative results") and are not separate rows.

---

## The 10 confirmed INHERIT items, ranked

Ranked by consequence: aliasing defects that let a caller silently corrupt persisted evidence
first, then a missing fail-closed check, then documentation-only corrections. This was R1's
work-list for a follow-up unit, R2; each item below now carries its own status.

### 1 — `readChain` hands out live references to stored transitions (critical)

**Status: APPLIED (commit `201ccb7`).**

**File:** `packages/record/src/store/memory.ts:290-296` (the return at line 295).

```ts
async readChain(recordId: string): Promise<Transition[]> {
  const existing = this.records.get(recordId);
  // A defensive copy: ...
  return existing ? [...existing.chain] : [];
}
```

**The defect in our code.** `[...existing.chain]` copies the *array* but not its *elements* —
every `Transition` (and its `payload`) handed back is the exact object the Store holds
internally. `readChain` is declared on the frozen **agent** handle
(`packages/record/src/agent-surface.ts:26`, delegated straight through by
`agent-surface.ts:40` and `create.ts:121`), so an agent that can reach *only* the agent handle
can do `(await agent.readChain(id))[n].payload.code = 'whatever'` and silently rewrite
persisted chain state. Because `verifyChain` cannot detect a non-recomputing edit to the
**last** transition in a chain (`chain/replay.ts:164-173`'s own documented AL1 honesty limit)
and `chainHead()` recomputes its digest straight from the mutated object
(`memory.ts:298-303`), a rewrite of the terminal `confirmed`/`refused` payload is undetectable:
`verifyChain` reports `{intact:true}` before *and after*. `getRecord()` leaks the same
references a second way, via `replay()`'s `consultations.push(transition.payload)`
(`chain/replay.ts:109`). This does not defeat the capability split through a missing
permission check — every call is one the agent is allowed to make — it defeats it by
**aliasing**: the agent-reachable read hands back a write handle into store-internal state,
collapsing SPEC §9's "holds against an agent that can reach only the agent handle" into
SPEC §5's storage-insider threat model.

**Why our 218 tests do not catch it.** No test mutates a value returned from `readChain` or
`getRecord` and re-reads. `store-constraints.test.ts:375` ("a failed append does not mutate
the stored chain") asserts only that a *rejected* append leaves the chain alone — it never
mutates a *returned* chain. Every existing chain assertion elsewhere
(`store-constraints.test.ts:366,371`, `expiry.test.ts:155`) is `assert.deepEqual`/`.length` —
structural comparisons that cannot see whether the returned objects are the store's own or
copies.

**The fix.** `return existing ? structuredClone(existing.chain) : [];`, matching the
clone-on-read discipline `getStaged` already has (`memory.ts:168`); update the comment from
"a defensive copy" to "a deep clone." Add the missing SPEC §12 freshness test for `readChain`
(and `chainHead`) beside the existing `getStaged` one at `store-constraints.test.ts:130`.

**Read the cross-cutting caveat below before landing this fix** — it interacts with item 2.

### 2 — `appendSubsequent` stores the caller's own `Transition` object (important)

**Status: APPLIED (commit `201ccb7`).**

**File:** `packages/record/src/store/memory.ts:254-288` (the mutation at line 281:
`existing.chain.push(transition)`).

**The defect in our code.** The Store retains the exact object the caller assembled, not a
copy — so whoever built that transition keeps a live write handle into persisted chain state.
This is reachable **in-library**, not merely by a hypothetical hostile Store user:
`kernel/finalize.ts:229-236` builds the `confirmed` transition as `payload: { actor: identity
}`, where `identity` is the **caller-supplied** `IdentityAssertion` argument to `finalize()`
(`finalize.ts:72`); `finalize.ts:184-190` likewise embeds `checker: facts.checker` — another
caller-owned object — into the `facts` consultation payload. After `finalize()` returns, the
host still holds live references *into* the stored chain: mutating its own `identity` or
`facts.checker` object afterward rewrites the stored `confirmed`/consultation payload. Since
`confirmed` is the chain head at that point, this is the write-side half of item 1's blind
spot.

**Why our 218 tests do not catch it.** No test retains a caller-built `identity` or
`facts.checker` object after a successful `finalize()` and mutates it before re-reading the
chain.

**The fix.** `existing.chain.push(structuredClone(transition))` at `memory.ts:281`, with a
comment naming the caller-retention risk (finalize's embedded `identity`/`checker`).

### 3 — `putStaged` stores the caller's `StagedDraft` object (important)

**Status: APPLIED (commit `201ccb7`).**

**File:** `packages/record/src/store/memory.ts:152-161` (the store at line 160:
`this.staged.set(staged.id, staged)`).

**The defect in our code.** The Store's own contract sentence — quoted correctly in
`test/store-constraints.test.ts:130` from SPEC §12 — is "a caller mutating a returned chain,
head, or staged draft can never corrupt store-internal state." We honor only the **read**
half: `getStaged` already clones (`memory.ts:168`). `putStaged` does not, so a holder of the
draft object can mutate `contentDigest`/`profileId`/`legId`/`subjectRef` **after** the write —
exactly the fields `open()` reads at `kernel/open.ts:73` to bind the record — meaning a staged
draft can be silently swapped between `stage()` and `open()`. In-library reach is nil today
(`kernel/stage.ts:67-73` builds the object literal inline at the call site, so nothing else
retains it), but `MemoryStore` and `Store` are both public exports
(`packages/record/src/index.ts:26-27`) and `Config.store` is host-supplied, so any host that
builds a `StagedDraft` and calls the injected `Store` directly hits this.

**Why our 218 tests do not catch it — and the corpus was written *around* the gap.**
`test/store-constraints.test.ts:140-145` builds `const originalSnapshot = { ...draft }` with
the explicit in-file comment that "`putStaged` may have stored that very object by reference,
which would make the assertion vacuously pass." The test passes today either way — it was
written to be safe against this exact defect rather than to expose it.

**The fix.** `this.staged.set(staged.id, structuredClone(staged))` at `memory.ts:160`,
symmetric with `getStaged`. Once landed, `store-constraints.test.ts:140-145`'s defensive
snapshot can be deleted and `draft` used directly as the expected value.

### 4 — `appendGenesis` stores the caller's genesis `Transition` object (important)

**Status: APPLIED (commit `201ccb7`).**

**File:** `packages/record/src/store/memory.ts:193-239` (the insert at line 236:
`chain: [transition]`).

**The defect in our code.** Same aliasing family as items 2 and 3, on the genesis insert.
Reachable from `kernel/open.ts:105-116` and `:157`, which append `openedTransition` — whose
payload carries `profileId`/`profileDigest`/`legId`/`subjectRef`/`contentDigest`, the fields
every later gate binds against (`finalize`'s content-drift check reads `record.contentDigest`
folded from this exact payload). `open.ts` deliberately **reuses the same
`openedTransition` object** across the first append attempt and the expire-then-retry append
(lines 116 and 157 at the time of this record; since the 2026-09-02 code-review fixes the
retry is re-stamped from a fresh clock reading and reuses the object only when the clock did
not move) — exactly the pattern that makes retained-reference aliasing easy to introduce by
accident. A genesis payload edit is caught by chain-verify once a second
transition exists (the seq-2 link), but on a one-transition record the genesis *is* the head
and is therefore undetectable, same as item 1.

**Why our 218 tests do not catch it.** No test mutates a transition object after a successful
genesis append and re-reads.

**The fix.** `chain: [structuredClone(transition)]` at `memory.ts:236`, with a comment
cross-referencing the `appendSubsequent` fix (item 2).

### 5 — `open()` never re-validates the staged draft's `legId` (important)

**Status: APPLIED (commit `8c78083`).**

**Files:** `packages/record/src/kernel/open.ts` (insertion point: after line 86 — `const {
profile, effectSeam } = resolved;` — and before line 88); companion doc fix in
`packages/record/src/refusal-codes.ts:21-24`.

**The defect in our code.** SPEC §8 names two producers of the `unknown-leg` refusal: a
caller-named leg absent from the profile at `stage()` (built — `kernel/stage.ts:50-57`), and
**a staged draft's leg absent from the profile it resolves under at `open()`** (not built).
`open()` copies `staged.legId` straight into the genesis payload (`open.ts:99`) with no check
that it still names a leg of the profile it just resolved. If a profile's leg is renamed
between `stage()` and `open()` — two `create()` instances sharing one Store with different leg
ids for the same profile id, or a redeploy while an old `stagedRef` is still outstanding — the
record is minted anyway, and `kernel/finalize.ts:107-113` then throws its loud legId error on
**every** attempt to decide it, forever. Because the record is `open`, MemoryStore's C1
exclusivity keeps it holding `(profileId, subjectRef)` for the whole expiry window — and
permanently under `expiry:'none'`, since `expireIfDue` never fires for a record whose profile
declares no expiry. This is not a security bypass (our `finalize` already throws rather than
silently clamping to leg 0 — see "already-converged," below) — the harm is an unrecoverable
record and a permanent subject-level denial of service, and the loss of a SPEC-named
fail-closed producer.

**Why our 218 tests do not catch it.** `test/unknown-ids.test.ts:11-14` explicitly documents
this producer as unbuilt, and `refusal-codes.ts:21-24` says outright: "Only the first is built
in this build ...; the second is not yet wired." No test constructs the two-`create()`-
instances-sharing-one-Store scenario needed to reach it.

**The fix.** Insert, after `open.ts:86` and before the genesis-build comment at line 88:

```ts
const legIndex = profile.legs.findIndex((leg) => leg.id === staged.legId);
if (legIndex === -1) {
  return refused('unknown-leg'); // never-appends: no record, no transitionRef
}
```

Ordering is load-bearing: it must sit *after* the `unknown-profile` return (`open.ts:81-85`)
so `unknown-profile` still wins when both are wrong —
`test/unknown-ids.test.ts:79-107` already pins that precedence for a related case. The fix
should also change `open.ts:114` from the hardcoded `isFinalLeg(0, profile.legs.length)` to
`isFinalLeg(legIndex, profile.legs.length)` (behaviorally inert today — every configured leg
resolves to index 0 in a single-leg build — but it stops the hardcoded `0` from silently
surviving into a future multi-leg build), and update `refusal-codes.ts:21-24` to say both
producers are built.

**⚠ This defect was written up twice in R1's raw findings** — once by the audit's
kernel-seams cluster (which owns `open.ts`) and once by its leaf-and-config cluster (which
owns `refusal-codes.ts` and flagged the same gap from the registry-comment side, bundled with
its own copy of the `open.ts` hunk). **It is one defect with one insertion point.** A reader
applying R1's raw notes must take exactly one of the two `open.ts` hunks — applying both in
sequence would declare `legIndex` twice — plus the `refusal-codes.ts` comment update, which
only the leaf-and-config write-up carries.

### 6 — `store.ts`'s `putStaged` doc omits the collision rule it implements (minor)

**Status: APPLIED (commit `b159a9f`).**

**File:** `packages/record/src/store/store.ts:54`.

**The defect in our code.** The public `Store` interface documents `putStaged` as only
"Idempotent by `staged.id`" — it does not say *which* write wins on a genuine same-id
collision. `Store` is a public export (`index.ts:27`) and `Config.store` is host-supplied, so
a conforming third-party adapter could legally be last-write-wins under this text, even though
`MemoryStore` is first-write-wins (`memory.ts:157-159`) and
`test/store-constraints.test.ts:122-127` pins first-write-wins as a hard requirement. The
interface should state the rule the tests already enforce.

**Why our 218 tests do not catch it.** This is a documentation gap, not a behavior gap — no
test can fail on interface prose.

**The fix.** Amend `store.ts:54` to add: "**First-write-wins** on a same-id collision (SQL
`ON CONFLICT DO NOTHING` semantics): a second put with the same id is a no-op, even if its
content differs."

### 7 — `store.ts`'s `getStaged`/`readChain` docs omit the freshness requirement (minor)

**Status: APPLIED (commit `b159a9f`).**

**File:** `packages/record/src/store/store.ts:57-58` and `:74-75`.

**The defect in our code.** Neither doc comment states a no-aliasing requirement, even though
`MemoryStore` implements one for `getStaged` today and `test/store-constraints.test.ts:130`
treats freshness as the SPEC §12 contract. Since `Store` is public and hosts inject their own,
an adapter returning live internals is *conforming under our current text* — which would
reopen the exact agent-reachable write path items 1 and 3 above exist to close, regardless of
what `MemoryStore` does. This hunk should land together with items 1 and 3 so the interface and
the reference implementation state the same contract.

**Why our 218 tests do not catch it.** Documentation gap; no runtime assertion is possible.

**The fix.** Add "Returns a fresh clone." to `getStaged`'s doc (`store.ts:57-58`) and "FRESH
(deep-cloned) transitions — a caller mutating a returned transition or its payload can never
corrupt store-internal state. This is a REQUIREMENT on every conforming Store, not an
implementation detail of the memory backing" to `readChain`'s doc (`store.ts:74-75`).

### 8 — `chain/replay.ts`'s two `bound` comments contradict our own SPEC (minor, doc-only)

**Status: APPLIED (commit `b159a9f`).**

**Files:** `packages/record/src/chain/replay.ts:62-63` (the `replay` docblock bullet) and
`:125-126` (the `case 'expired'` comment).

**The defect in our code.** Both comments say the `expired` payload's `bound` field "names
which expiry clause fired." It does not: `kernel/expiry.ts:91` writes
`new Date(deadline).toISOString()` into it — an RFC 3339 **timestamp**, never a clause name —
and our own `docs/concept/SPEC.md:322` states the opposite directly: "`{ bound }` — the elapsed
deadline timestamp; the transitioned-from state, **not the payload**, distinguishes the
`expiry` clause." The second comment even cites SPEC §4 while contradicting it.

**Why our 218 tests do not catch it.** Categorically cannot: comments carry no runtime
behavior, and no assertion in `expiry.test.ts` or `replay-verify.test.ts` observes a comment's
text, only `bound`'s value.

**The fix.** Replace both with wording matching SPEC §4: "`bound` is the elapsed deadline
timestamp, not a clause name — the transitioned-from state distinguishes which expiry clause
fired."

### 9 — `kernel/expiry.ts`'s own `bound` comment has the same error (minor, doc-only)

**Status: APPLIED (commit `b159a9f`).**

**File:** `packages/record/src/kernel/expiry.ts:65`.

**The defect in our code.** The same misdescription as item 8, in the file that actually
*produces* `bound` — arguably the more important of the three sites to fix, since this is
where a future reader is most likely to look before adding a second expiry clause (e.g. a
`confirmToRedeem` edge) that could be tempted to treat `bound` as a discriminator.

**Why our 218 tests do not catch it.** Same as item 8 — comment-only.

**The fix.** Replace the clause "`bound` names which expiry clause fired, SPEC §4" with
"`bound` is the elapsed deadline timestamp, not a clause name — the transitioned-from state
distinguishes which expiry clause fired, SPEC §4," keeping this repository's `SPEC §4` anchor.

### 10 — `index.ts` does not export `OpenOptions` (minor)

**Status: SKIPPED — reclassified, not applied.** On review this is not an INHERIT item: it is
not a fix the reference project's later history made and this repository failed to take, it is
a completeness improvement this repository could choose to make on its own terms at any time,
independent of anything the reference project did or did not do. R2 left it as recorded R1
output rather than folding it into the nine genuine inherited fixes above.

**File:** `packages/record/src/index.ts:13`.

**The defect in our code.** `OperatorSurface.open`'s second parameter is typed `OpenOptions`
(`config.ts:234`), and `OperatorSurface` is itself exported (`index.ts:16`) — but
`OpenOptions` is not re-exported alongside it. It is the *only* constituent of an exported
interface in this codebase that is unnameable by an adopter (every other interface's
constituent types — `Config`/`ConfirmProfile`/`LegSpec`/`AgentSurface`/`Outcome`/`Store`/
`AppendResult`/`ChainVerifyReport`/`DecisionRecord`/`ReviewView`/`StagedDraft`'s constituents —
are all exported). An adopter writing a typed wrapper or mock operator handle cannot import
the parameter type and must fall back to
`Parameters<OperatorSurface['open']>[1]`.

**Why our 218 tests do not catch it.** No test in this corpus imports from the package entry
point with an eye to export completeness; the omission is compile-clean.

**The fix, if ever applied.** Add `OpenOptions` to the re-export at `index.ts:13`: `export type
{ Canonicalizer, Config, ConfirmProfile, LegSpec, OpenOptions } from './config.js';`. Type-only;
zero runtime effect. This would close exactly one gap under a broader export-completeness
policy the reference implementation later adopted in full (see the LATER-STEP summary) — but
that broader policy is itself LATER-STEP work, not something this build step reaches, which is
why R2 left this one piece of it unapplied rather than singling it out ahead of the rest (see
the status note above).

---

## ⚠ Cross-cutting caveat: the `structuredClone` fix is not purely additive

Items 1, 2, and 4 above all propose replacing a live reference with
`structuredClone(...)`. **This is not a drop-in change and must be resolved, not just applied,
before it lands.**

`structuredClone` throws a `DataCloneError` on any function- or symbol-valued member anywhere
in the object graph it is given. This repository's own canonicalizer, `jcs.ts`, deliberately
does **not** do that: `hasNoJsonForm` (in `jcs.ts`) treats a function or symbol member the
same way `JSON.stringify` does — it is silently **omitted** from an object, or turned into
`null` in an array (the `serializeJcs` header documents this as a deliberate, tested decision, matching
`JSON.stringify`'s own structural rules).

Concretely: a caller-supplied `IdentityAssertion` (the `identity` argument to `finalize()`, or
`facts.checker`) is stored today as `payload.actor` / `payload.checker` and is only ever run
through JCS when `transitionDigest()` computes its hash — which silently drops any function-
valued own property such an object might carry, exactly like `JSON.stringify`. If a host passes
an object with a method as an own property (a class instance rather than a plain `{principal,
authority}` literal, say), that works today. Item 2's naive fix —
`existing.chain.push(structuredClone(transition))` — would make that same call **start
throwing** the moment it lands, because `structuredClone` does not tolerate what JCS tolerates.
Item 1's `readChain` clone has the same exposure on the read side, for any already-stored
transition carrying such an object.

This must be resolved — by validating `identity`/`checker` shape more strictly at intake, by
cloning only the parts that need write-isolation rather than the whole transition, or by an
explicit decision that this narrows an accepted input shape — **before** any of items 1, 2, or
4's hunks land, not as a follow-up.

## The `structuredClone` decision, as shipped (R2, commit `201ccb7`)

**Resolved: plain `structuredClone`, with the `DataCloneError` throw accepted as a deliberate
behaviour narrowing, not designed around.** A host's `identity`/`facts.checker` argument that
carries a function- or symbol-valued own property — a class instance with a method, rather than
a plain `{principal, authority, proofRef?}` literal — now throws `DataCloneError` at the
clone-on-write seam (`store/memory.ts`'s `putStaged`/`appendGenesis`/`appendSubsequent`) and at
the clone-on-read seam (`readChain`), where the identical call shape silently succeeded before
this fix landed. This is narrower than what `transitionDigest()`'s own JCS pass tolerates (JCS
*omits* such a member rather than throwing, matching `JSON.stringify`) — the two seams now
disagree on purpose, not by oversight.

The reasoning recorded beside the decision in `store/memory.ts`: this is the reference
implementation's own choice for this same fix, so diverging here would introduce a fresh,
unaudited difference in the very change meant to close an inherited gap; a value
`structuredClone` cannot copy cannot be considered durable evidence either, under this
repository's own "reference semantics, never durable evidence" class of decision; and a
clone helper that faithfully mirrored JCS's tolerance (including its `toJSON`-takes-precedence
rule) would be new-code risk disproportionate to the actual need, since SPEC's identity shape is
plain data and a host needing a richer object can project it to a literal at the call site.

Pinned by three tests in `packages/record/test/store-constraints.test.ts` (the "DataCloneError
decision pin" block): a function-valued payload member throws `DataCloneError` on the
non-genesis append path, on the genesis append path, and on `putStaged`, so this choice cannot
drift silently in either direction.

## The byte-safety answer

**None of the ten INHERIT items above moves a single canonical byte.** For the two write-path
clones that touch appended transitions (items 2 and 4), `memory.ts` computes
`transitionDigest(transition)` — the value that becomes the chain's next `prevHash` and the
`transitionRef` callers receive — **before** the clone-or-store step in both functions:
`appendGenesis`'s `const digest = transitionDigest(transition);` (line 229) precedes
`chain: [transition]` (line 236); `appendSubsequent`'s identical line (line 280) precedes
`existing.chain.push(transition)` (line 281). Whether the pushed/stored value is the original
object or a clone of it, the digest was already computed from the original. Items 1 and 3
(read-side clones) and items 6-10 (documentation) touch no digest input at all. The four
byte-compatibility digests pinned in `test/byte-stability.test.ts` are therefore unaffected by
landing any or all of the ten items.

## Two negative results

Findings are not the only thing worth recording — R1 produced two negative results that answer
questions a reader would otherwise have to re-derive themselves:

1. **`chain/encoding.ts` has zero base→head deltas, and `verifyChain` is byte-identical across
   all five reference increments.** Despite five increments and a large scrub finding count on
   this general area, the reference project never changed a single line of the genesis rule,
   the six-field digest input, `encodeTransition`, `transitionDigest`, or — inside
   `chain/replay.ts` — the `verifyChain` function or the `ChainVerifyReport` shape. Every one
   of the five increments touching `replay.ts` lands entirely inside `replay()`'s fold (new
   `TransitionKind` cases for capabilities this build does not have). Our chain-verification
   posture is at head parity, full stop — there is nothing to inherit here beyond item 8's
   comment fix.
2. **A full read of every LATER-STEP and DIVERGENCE entry, checked for a defect hiding under a
   "this is just a new feature" or "this is just a deliberate difference" label, found none.**
   Each LATER-STEP entry's stated reason traces to a capability this build genuinely does not
   have — a profile field that throws `GOVERNED` at construction, a type that does not exist in
   `types.ts`, or a Store method this build's `Store` interface does not declare — never to an
   existing behavior that was quietly wrong. Each DIVERGENCE entry's stated reason argues
   equivalence or a deliberately stronger posture, never "we meant to fix this and didn't."
   This was checked across all ~90 non-INHERIT entries in R1's output, not a small sample.

---

## The LATER-STEP summary

Roughly 80 of R1's triaged deltas are LATER-STEP — genuinely new capability, correctly
excluded because the profile fields that would switch it on all throw `GOVERNED` at
construction in `packages/record/src/config.ts` today. They group into five capabilities, each
arriving with its own future build step:

- **Store v2** — `meta`/`dueAt`, the caller-transaction seam (`tx?`), atomic `appendBatch`,
  `findNonTerminal`, `listDue`, and **C4 seal-finality** (`store/store.ts`, `store/memory.ts`).
  This is the largest single cluster and is what closes Class B's two recorded-not-fixed items
  in the companion whole-branch-review document (`docs/analysis/2026-08-03-step-1-review.md`).
  **Update, present tense:** five of these six — `meta`/`dueAt`, atomic `appendBatch`,
  `listDue`, **C4 seal-finality** (commit `e969e24`), and `findNonTerminal` (commit
  `baf88fe`) — have since landed, inside the same in-memory backing; `tx?` alone remains
  outstanding. This bullet is left as R1/R2 stated it, since it is a dated audit record;
  `docs/process/implementation-status.md` carries the current account.

  **Correction, dated at commit `f681e92`:** `tx?` is no longer outstanding either. Commit
  `04ab306` opened the seam on the `Store` interface itself — adapter-generic across all
  three writes (`putStaged`, `appendTransition`, `appendBatch`), with `MemoryStore`
  validating first and throwing loudly on any supplied handle, having no driver to enlist a
  write in; commit `f681e92` made the seam real on a driver, enlisting `SqliteStore`'s
  writes on the caller's own connection rather than a loud throw. The count is six of six as
  of the fifth step-2 increment's exit (commit `8a03c45`), and the cross-backing
  byte-identity test (commit `368e6ba`) holds across the divide.
  `docs/process/implementation-status.md` carries the current account.
- **Redemption (the effect seam)** — the real `redeeming`/`redeemed`/`redemption-failed`
  transition kinds and their payload shapes, `kernel/redeem.ts`'s full gate ladder, token
  issuance, and the residual-conflict resolver (`chain/replay.ts`, `kernel/redeem.ts`,
  `kernel/expiry.ts`'s two redemption clocks, `refusal-codes.ts`'s four redemption codes).

  **Update, present tense:** most of this has since landed, across two increments. The
  first (commit `77cbc8d`) landed the direct shape: `redeeming`/`redeemed` transition kinds
  real for that path, `kernel/redeem.ts`'s gate ladder, and the `effect-mismatch` /
  `already-redeemed` codes — a gap this bullet's own increment's sweep missed, corrected
  only now. The second landed the token shape: `beginRedemption`/`completeRedemption`
  (`kernel/redeem.ts`), the token's issuance and presentation, and the family-wide
  residual-conflict resolver (the CAS-residual re-read). What remains LATER-STEP: the two
  redemption clocks (`kernel/expiry.ts`'s `confirmToRedeem`/`redeemBound` resolution) and
  `redemption-failed`'s producer, including the fourth redemption code,
  `redemption-timeout`. `docs/process/implementation-status.md` carries the current
  account.

  **Correction, dated at commit `266bd86`:** nothing named above remains LATER-STEP either —
  the third step-3 increment landed the whole remaining bundle. `kernel/expiry.ts`'s shared
  `pendingWindow`/`resolveDueClock` (built at commit `8626692`) resolves both clocks —
  `confirmed → expired` (the `confirmToRedeem` window) and `redeeming → redemption-failed`
  (the `redeemBound` window) — with the `redeemBound` construction guard lifted alongside its
  clock (commit `b3ca3e8`) and the fourth redemption code, `redemption-timeout`, folded on
  replay (commit `e28f368`); the three redemption seams' own resolver-reports rule (commit
  `0ccf20f`) is `redemption-failed`'s producer. SPEC §11.2 is whole across all three step-3
  increments: both shapes, both clocks, at-most-once including the elapsed-`redeeming`
  unknown-outcome half. `docs/process/implementation-status.md` carries the current account.
- **Multi-leg separation of duties** — `PriorRecordRef`/`RecordedPriorRef`, `open()`'s
  prior-leg verification step, the finalize SoD gate, and the `sealed`/status-retirement fold
  (`kernel/open.ts`, `kernel/finalize.ts`, `types.ts`, `chain/replay.ts`).

  **Correction:** the `sealed`/status-retirement fold has since landed (commit `e53ec7e`,
  `chain/replay.ts`'s `replay()` folding a `sealed` transition and `types.ts`'s new
  `DecisionRecord.status` field) — it is no longer part of this bundle's unbuilt set. That
  left three items named above still unbuilt at the time this correction was first
  written — `PriorRecordRef`/`RecordedPriorRef`, `open()`'s prior-leg verification step, and
  the finalize SoD gate — all three since landed too, across build-order step 4's two
  increments (`docs/process/implementation-status.md`'s §10.1 row carries the current
  account), so nothing named in this bundle remains unbuilt. This one item was also never
  actually covered by this section's own "excluded because the profile fields that would
  switch it on all throw `GOVERNED` at construction" framing: `seal()` is gated by no profile
  field at all, unlike the other three, which really are gated by `legs.length > 1`.
- **Consultations, policy-drift, and eligibility gating** — `finalize()`'s `opts` parameter
  (consultations and policy inputs), the argument-intake validation, gates (4.5)/(5.5), and the
  `availability` outcome class (`kernel/finalize.ts`, `outcome.ts`, `refusal-codes.ts`).

  **Update, present tense:** part of this has since landed, at build-order step 5's first
  increment: `finalize()`'s `opts` parameter is real (`opts?: FinalizeOptions`), carrying its
  own first key, `consultations`, and the argument-intake validation for that half
  (`kernel/consultations.ts`'s `validateConsultations`) is built and tested — a malformed
  entry, a reserved kind, or a duplicate kind throws at intake exactly as this bundle named.
  What remains LATER-STEP: gates (4.5)/(5.5) themselves (no consultation or eligibility gate
  exists — a supplied consultation records as evidence and never gates), the `availability`
  outcome class, and the policy half of `opts` (`opts.policy` still throws unconditionally —
  no profile can declare `policySource` to give its own argument-intake validation anything
  to check). This bullet is left as R1/R2 stated it, since it is a dated audit record;
  `docs/process/implementation-status.md` carries the current account.

  **Correction, at the second step-5 increment:** the required-consultation half of gate
  (5.5) and the `availability` outcome class have since landed too. `finalize()`'s rung 5.5
  (SPEC §11.1) now refuses `consultation-missing`/`consultation-failed` on a required
  kind's absence or `fail` verdict and produces the narrowed `unavailable` outcome
  (`{ status: 'unavailable'; code: 'availability'; authority }`) on a required kind's
  reported-unreachable marker, never appending; the `requiredConsultations` GOVERNED throw
  lifted with the gate in the same commit. What remains LATER-STEP: gate (4.5) policy-drift
  itself and its own second producer of the `availability` class (SPEC §10.3, no profile
  can yet declare `policySource`), the eligibility half of gate (5.5) — §10.4's
  implicit-first required kind — and the policy half of `opts` named above, unchanged.
  `docs/process/implementation-status.md` carries the current account.

  **Correction, at the first step-6 increment:** the eligibility half of gate (5.5) has
  since landed too. A leg declaring `eligibility` (SPEC §10.4) gets an implicit
  `'eligibility'` required kind prepended ahead of its own declared `requiredConsultations`,
  checked FIRST at the same rung — a `fail` verdict on that implicit kind refuses the
  nineteenth code, `ineligible` (`refusal`-class, `terminalRefusals`-able, open-by-default so
  a different eligible actor may decide), while a missing or reported-unreachable input keeps
  the generic codes, and a NON-declaring leg that merely lists `'eligibility'` in
  `requiredConsultations` keeps the generic codes too. The `eligibility` GOVERNED throw
  lifted with the gate in the same commit. What remains LATER-STEP: gate (4.5) policy-drift
  itself and its own second producer of the `availability` class (SPEC §10.3, no profile can
  yet declare `policySource`), and the policy half of `opts` named above, unchanged — the
  second step-6 increment's own ground. `docs/process/implementation-status.md` carries the
  current account.

  **Correction, at the second step-6 increment: nothing named in this bundle remains
  unbuilt.** Gate (4.5) policy-drift and its own second producer of the `availability`
  class, and the policy half of `opts`, have since landed too. `policySource` is accepted
  at construction (the eighth self-authored inversion); `open()`'s options bag binds the
  operator-attested `policyDigest` into the genesis, present-iff-declared and fail-closed
  loud both directions; `finalize()`'s `opts?: FinalizeOptions` gains its second real key,
  `policy` (SPEC §10.3's `PolicyInput`), shape-checked at intake and presence-checked at
  profile-resolution depth exactly as this bundle named; and `finalize()`'s rung (4.5)
  compares the live digest against the record's bound one, raising the twentieth code,
  `policy-drift`, on a mismatch (including both cross-instance corners) and the
  `availability` outcome (its second producer) on a reported-unreachable source. This bullet
  is left as R1/R2 stated it, since it is a dated audit record;
  `docs/process/implementation-status.md` carries the current account.
- **Structural riders** — the `kernel/context.ts` extraction (kills a kernel→create.ts type
  back-edge; type-only, zero behavior), a `mintToken` injectable seam, and a handful of
  index-export additions for types that do not exist here yet.

None of these is fixable now — the machinery each depends on does not exist. They are recorded
here as a map of what R1 found, not as an action list.

## Already-converged: two entries that need no action

Two of R1's kernel-seams findings are labeled "already inherited — do not apply" in the raw
audit. They are recorded here so a future reader searching for them gets a definitive answer
rather than re-deriving it:

- **`kernel/finalize.ts:107-113`** already throws on an unresolvable persisted `legId`, rather
  than the base behavior R1 diffed against (`Math.max(0, ...)`, which silently clamped an
  unresolvable leg onto leg 0). This repository independently carries the equivalent fix the
  reference project made; only the message text differs. (Note: this is *why* item 5 above is a
  denial-of-service defect rather than a wrong-leg mis-decision — the record becomes stuck, not
  silently misdirected.)
- **`kernel/finalize.ts:160-163, 188, 377-390`** — `isValidFacts` already returns the widened
  `{ok:true; canonical} | {ok:false}` shape with a try/catch around canonicalization, and
  already reuses the carried canonical bytes rather than re-canonicalizing. This repository
  independently carries the equivalent of the reference project's own fix here.

## The DIVERGENCE list — never "fix" these back

Every item below is a place this repository deliberately does something different from the
reference implementation. None is a gap; each was a considered choice, and reverting any of
them to match the reference project more closely would be a regression, not a correction.

- **`governedUnavailable(field, contract)` is arity-2** (`config.ts:76-78`), not the arity-1
  form some earlier reference states used. It is the one shape that serves all three
  consumers in this build: the ten per-field construction guards, `open()`'s unexpected-key
  guard, and `redeem()`'s build-capability throw.

  **Correction, dated at commit `77cbc8d`:** the third consumer is gone. That commit landed
  SPEC §11.2's direct redemption shape, replacing the loudness-throw this bullet named with
  the redemption ladder itself — `kernel/redeem.ts` calls `governedUnavailable` nowhere today
  (verified by grep across `packages/record/src`). Two consumers remain live: the ten
  per-field construction guards and `open()`'s unexpected-key guard. The arity-2 shape itself
  is unaffected; this is a count-of-callers correction, not a reason to revisit it.

  **Further update, at the second step-3 increment:** the per-field count itself moved, from
  ten to **eleven** — `redeemBound` joined the construction-time guards (`config.ts`) as an
  eleventh field guarded the same way the original ten are; this does not change the
  two-consumer count the correction above states.

  **Correction, at the AL2 freshness increment:** the first of the two consumers named
  above is gone too. The per-field construction-guard count reached **zero** at the AL2
  freshness increment, `freshness` being the last field to lift, alongside its own gate
  (`docs/process/implementation-status.md` carries the field-by-field lineage from eleven
  down). `governedUnavailable` has exactly two live consumers today, and neither is a
  per-field guard: `finalize()`'s own `finalizeOptionMessage` and `kernel/open.ts`'s
  unknown-open-option-key message — both generic unknown-option-key throws (`config.ts`'s
  own comment names both by name). `docs/process/implementation-status.md` carries the
  current account.

  **Further correction, at the effect-result increment:** the two-consumer count above
  was already stale before this increment landed — the recorded-human-decline increment
  added a third live consumer this document never recorded, `decline()`'s own
  unknown-option-key guard (`kernel/decline.ts`: "decline() accepts only consultations in
  this build"). This increment adds a fourth: `kernel/redeem.ts`'s
  `validateRedeemOptions`, one call site in the source shared by all three redemption
  seams (`redeem()`, `beginRedemption()`, `completeRedemption()`, each of which calls it
  at argument-intake depth — `redeem()` and `beginRedemption()` as their first statement,
  `completeRedemption()` immediately after its own token-type throw). `governedUnavailable`
  has four live consumers today — `finalize()`'s `finalizeOptionMessage`, `open()`'s
  unknown-open-option-key message, `decline()`'s own, and `redeem.ts`'s shared
  `validateRedeemOptions` — and none is a
  per-field guard. `docs/process/implementation-status.md` carries the current account.
- **`redeem()` throws a build-capability error** on a confirmed effect-seam record
  (`kernel/redeem.ts:57-66`), rather than silently returning `unredeemable-state` or attempting
  to "close the strand." Neither a throw nor a refusal can release the `(profile, subject)`
  pair such a record holds — the hold lives in the Store's C1 exclusivity constraint, not in
  anything `redeem()` returns — so the throw's purpose is to make the missing capability loud
  at the seam, immediately, rather than letting a host discover the stranded pair later via an
  unrelated `open()`'s `record-exists`. `docs/process/deferral-register.md` entry 9 records
  that the pair stays permanently held either way.

  **Correction, dated at commit `77cbc8d`:** the throw is gone, and the pair is no longer
  permanently held. That commit landed SPEC §11.2's direct redemption shape: `redeem()` on a
  confirmed effect-seam record now performs the redemption ladder instead of throwing, and its
  `confirmed → redeemed` edge releases the pair (deferral register row 9, retired by that same
  landing — the entry this bullet cites no longer exists). The divergence this bullet named no
  longer describes the current build; it is kept above as the record of the choice made at the
  time this audit ran.
- **A hand-written, zero-dependency RFC 8785 (JCS) serializer** (`jcs.ts`), in place of an
  external canonicalization package the reference project depends on. Byte-output equivalence
  is pinned by this repository's own JCS vector tests and by the four byte-compatibility
  digests in `test/byte-stability.test.ts`.
- **`Object.hasOwn(registry, ref) ? registry[ref] : undefined`** in
  `resolveCanonicalizer` (`canonical.ts:134`), rather than a bare indexed read. This is
  load-bearing, not stylistic: a bare `registry[ref]` walks the prototype chain, so a
  canonicalizer reference naming an inherited `Object.prototype` member (`toString`,
  `constructor`, `valueOf`, `hasOwnProperty`, …) would silently resolve to that inherited
  function instead of throwing. (This exact class of defect was found and fixed live during
  the work that produced this branch — see the companion whole-branch-review document's
  account of it.)
- **`putStaged` is first-write-wins** (`memory.ts:157-159`), where the reference project's own
  base commit was plain last-write-wins overwrite. This happens to converge with the
  reference's later head, which is also first-write-wins — but it was reached independently
  here, and `test/store-constraints.test.ts:122-127` pins it as a hard requirement.
- **`getStaged` returns `structuredClone(staged)`** (`memory.ts:163-169`), where the reference
  project's base commit returned the live stored object. Same shape as the previous item —
  independently reached, convergent with the reference's later head, and pinned by
  `test/store-constraints.test.ts:130`.
- **`open()` throws on any unexpected key in its `opts` bag** (`kernel/open.ts`'s unknown-key
  loop, ahead of the recovery rung), rather than relying on TypeScript's
  static type to silently drop an unrecognized key at runtime. A plain-JavaScript caller
  passing an unrecognized key today would otherwise have it silently dropped and believe it
  took effect — type-level absence is not a runtime guard for a
  JavaScript caller. `priorRecordRefs` (build-order step 4), `policyDigest` (the second
  step-6 increment), and `supersedes` (the step-8 recovery increment) are no longer examples
  of this: all three are real, documented `OpenOptions` fields now (`config.ts`'s
  `OpenOptions` interface — no longer `Record<string, never>`), honored rather than silently
  dropped. Every documented `open()` key is real as of the step-8 recovery increment; the
  note this bullet kept for `supersedes` retires here, its own trigger having fired.
- **`kernel/stage.ts` was taken from the reference project's *head*, not its base** — the one
  file in this kernel where that is true. Every other adopted source file is base-first
  (deliberately — see the companion whole-branch-review document's account of why base-file-
  first was essential for tests but costly for source). `stage.ts` was the deliberate
  exception, taken specifically to bring in the `legId?` parameter and the stage-side
  `unknown-leg` producer (SPEC §8's *first* producer) together with its fan-out to `id.ts`'s
  leg-folded `deriveStagedRef` and `agent-surface.ts`'s optional `legId`. (Item 5 above is the
  reminder that the *second* `unknown-leg` producer, in `open()`, was not brought in the same
  way and is still missing.)
