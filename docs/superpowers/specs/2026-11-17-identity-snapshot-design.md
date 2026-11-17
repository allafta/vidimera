# The identity-snapshot increment — design

**A post-build-order increment (no step). No sealed-set edit, no marker move, no new refusal
code, no change to `index.ts` or either manifest. Behavior changes: every seam records a fresh
`{ principal, authority, proofRef? }` literal built from the values it validated, never the
caller's object; `MemoryStore` refuses, loudly and before writing, an append whose stored copy
would digest differently from the digest it returns. Sanction: none needed, and none claimed —
§3 says why.**

**Status.** Taken on the owner's standing instruction of 2026-11-17 ("make your own
decisions"). Branch `identity-snapshot-2026-11-17`, stacked on `chain-binding-2026-11-17`
(`3a1361b`). Not merged.

## 1. What this increment answers

An external analysis of the tree at `b2ea16b` reported, and reproduced on `MemoryStore` and
`SqliteStore`, that **what the library validates as an identity is not what it records**:

- `isValidIdentity` (`kernel/finalize.ts`) checks that the object's OWN enumerable keys sit
  inside `{ principal, authority, proofRef }`, then reads `principal`, `authority` and
  `proofRef` through ordinary property access — following getters and the prototype chain.
- Every seam then embeds the caller's object itself: `payload: { actor: identity }`
  (finalize, decline), `checker: facts.checker` (finalize, decline), `checker: record.checker`
  (`kernel/consultations.ts`, carried into finalize's and decline's consultation transitions),
  `raiser: identity` and `acker: identity` (`kernel/findings-seams.ts`).
- Three serializers then see three different objects. JCS (`jcs.ts`) honors an inherited
  `toJSON` and walks own enumerable keys; `MemoryStore` stores `structuredClone(transition)`,
  which drops the prototype; the SQL backings persist `JSON.stringify(transition)`.

Consequences, each reproduced:

- A getter-backed or `Object.create`-built identity is digested and recorded as `{}`. A
  `sod.notActorOf` successor then receives `priorLegActors: [{}]`, and the same principal
  confirms the checker leg — **separation of duties fails open**.
- A class with a prototype `toJSON` persists that view on the SQL backings: an extra e-mail key
  (the very leak the recorded exact-shape fix closed, commit `bc0a2e1`), a redacted principal,
  or a disallowed authority — none of which is what the seam validated.
- On `MemoryStore`, such a `facts.checker` mid-batch makes the stored chain stop linking
  (the digest the batch chained on was the caller object's; the stored clone digests
  differently): `verifyChain` reports a break on an untampered record, and the next seam
  appends `chain-compromise`. As the batch's last element, the returned `transitionRef`
  differs from `chainHead`; at AL2 the signature is filed under the returned digest and
  orphaned.
- An acknowledgement by a getter-backed acker is recorded as `acker: {}`; `ackCounts`
  (`kernel/findings.ts`) treats its empty principal as non-counting, so a covered finding reads
  as unacknowledged and `finalize` refuses where it should confirm.
- Chains already written with such an `actor` stay fail-open on the read side:
  `verifyPriorLegs` (`kernel/prior-legs.ts`) rejects only an `undefined` actor, and
  `sodViolated` (`kernel/finalize.ts`) compares `priorActor.principal === identity.principal`, so
  a recorded `{}` (or any actor without a string principal) never matches and SoD passes.

The recorded fix (the twelfth self-authored inversion, argued at `isValidIdentity`) was
verified against the extra-own-key variant only. `MemoryStore`'s store-clone decision
(`store/memory.ts`'s header) rests on a premise the analysis disproved: that "a class instance
carrying a method would newly THROW" — `structuredClone` throws on function-valued OWN members
only, and silently drops a prototype, its methods and its `toJSON`.

## 2. Goals, non-goals, anti-goals

**Goals.**

1. Every seam validates an identity once, reading each field once, and records a fresh plain
   literal of exactly the values it validated. The SoD comparison, the authority allowlist and
   the recorded payload all use that literal.
2. The read side fails closed: a recorded prior-leg actor that is not a valid identity is a
   storage fault, never a silent SoD pass.
3. `MemoryStore` never stores a transition whose stored copy digests differently from the digest
   it returns or links on.
4. Pins for the four identity shapes the analysis named, at every identity-taking seam, on
   `MemoryStore` and `SqliteStore`; a store-level pin; and a conformance case every backing runs.

**Non-goals.**

- Snapshotting other host values (profiles, options, canonicalizer output, consultation
  payloads beyond the checker). The analysis groups them under the same root cause, but they
  are separate findings with separate fixes, on the roadmap's next tier.
- The SQL backings. They persist `JSON.stringify(t)` and digest `t` through JCS; both honor
  `toJSON` and walk own enumerable keys, and the analysis measured them consistent for these
  inputs. The conformance case (ruling 5.4) checks that on every backing.
- JCS serializer behavior. The analysis found JCS's own edges behaving as documented.

**Anti-goals.**

- Rejecting TypeScript-legal identities that carry no extra own keys. A class with getters, an
  `Object.create`-built object and a non-enumerable field are all legal `IdentityAssertion`s;
  the fix is to record what was validated, not to narrow what is accepted.
- Any change for a plain literal identity: its recorded bytes, and every existing pin, stay
  exactly as they are. The frozen byte-stability digests do not move.
- Turning a validation failure's posture at any seam: finalize and decline still refuse
  `identity-authority-refused`, the findings seams and a consultation's checker still throw,
  `facts.checker` still fails the facts gate.

## 3. Constraints, and why no sanction is needed

- SPEC §6 defines the identity as `{ principal, authority, proofRef? }`; SPEC §10.1 derives
  `priorLegActors` from the replayed `confirmed` payloads. Recording the validated values is
  the code meeting that text; recording `{}` diverges from it.
- No sealed-set edit; no new refusal code; no outcome-class change.
- The store-clone decision's posture (plain `structuredClone`, its throw accepted as a
  deliberate narrowing) is kept. This increment adds a second loud refusal in the same
  direction — the narrowing the decision's own premise assumed it already had — and corrects
  the premise in place. It is not an inversion of a recorded stance.
- The exact-own-key check (the twelfth inversion) is kept unchanged.
- Public-surface discipline: the guide sentence that states what happens to an identity
  (`docs/guide/integrating.md`, "pass exactly those fields") moves in the same change.

## 4. Approaches

1. **Snapshot at validation (picked).** One function validates and returns a fresh literal
   (or a failure); every seam uses the literal from then on. It closes the divergence at its
   root for every backing, accepts every legal shape, and keeps each seam's failure posture.
2. **Reject non-plain identities.** Refuse any identity whose prototype is not
   `Object.prototype` or `null`, or that has accessor properties. Closes the divergence too,
   but narrows what TypeScript accepts, turns working hosts into refusals, and still leaves a
   window between validation and embedding for a mutable plain object. Not picked.
3. **Fix it in the stores only.** Make every backing persist the JCS view. It would keep a
   getter identity recorded as `{}` — the SoD failure is in the kernel's reading, not the
   storage. Not picked; the store half (ruling 5.3) is defense in depth on top of approach 1.

## 5. Rulings

**5.1 One validator returns the literal.** `identitySnapshot(identity): IdentityAssertion |
null` in `kernel/finalize.ts`, next to `isValidIdentity`. It applies today's checks in today's
order — a non-null object; every own enumerable key inside the identity key set; a non-empty
string `principal`; a non-empty string `authority`; `proofRef` absent, `undefined` or a string —
reading each field exactly once into a local, and returns
`{ principal, authority, ...(proofRef !== undefined ? { proofRef } : {}) }`, or `null`.
`isValidIdentity(i)` becomes `identitySnapshot(i) !== null`, so its existing callers and pins
keep their meaning. A getter or proxy that throws while being read propagates, exactly as it
does today — the snapshot catches nothing, so no seam's failure posture moves.

**5.2 Every seam embeds the literal.**

| Site | Today | After |
|---|---|---|
| finalize identity rung | `isValidIdentity(identity)`, then `identity.authority`, SoD and `payload: { actor: identity }` read the caller's object | snapshot once; the allowlist check, `sodViolated` and `payload.actor` use the snapshot |
| decline identity rung | the same | the same |
| the facts gate (`facts.checker`) | validated, then `checker: facts.checker` embedded | the gate returns the checker snapshot with the canonical bytes; finalize and decline embed it |
| `validateConsultations` (an obtained consultation's `checker`) | validated, then `checker: record.checker` carried | carries the snapshot |
| `raiseFinding` / `acknowledge` (`validateSeamIdentity`) | validated, then `raiser: identity` / `acker: identity` | returns the snapshot; the payload embeds it |

`sodViolated` receives the snapshot, never the caller's object. The findings seams validate
before their chain load and hold the snapshot across the awaits. The literal is fresh per call,
so a caller mutating its object after the call changes nothing recorded.

**5.2a The read side fails closed.** Two sites read a recorded actor back:

- `verifyPriorLegs` (`kernel/prior-legs.ts`) today throws when a replayed `confirmed` prior has
  an `undefined` actor ("a garbled or foreign chain is a storage/config fault, not a domain
  outcome (SPEC §8)"). It throws the same way when the recorded actor is not a valid identity
  (`identitySnapshot(actor) === null`), and records the snapshot into `priorLegActors`.
- `sodViolated` (`kernel/finalize.ts`) today throws on the garbled paired-actor invariant. It
  throws the same way when any `priorLegActors` entry is not a valid identity, before comparing
  principals.

Both widen an existing storage-fault throw to the shape the write side now guarantees; neither
moves an honest chain's outcome, because an honest chain written after this increment never
carries such an actor. Chains written before it with a `{}` actor are exactly the corrupted
evidence the throw exists for.

**5.3 `MemoryStore` digests what it stores.** At each write site — the genesis append, a
subsequent append, and `appendBatch` — after every conflict check (a conflict still wins over a
throw, as it does over today's `DataCloneError`), the store clones, then compares
`transitionDigest(clone)` with `transitionDigest(caller's transition)`. On any difference it
throws, before any state changes (a batch is all-or-nothing, as today), with a message naming
`MemoryStore`, the `seq`, and that the transition does not survive a structured clone with the
same digest (a prototype `toJSON` or another non-plain member). The returned digest and the
stored transition therefore always agree. The header comment's false premise is corrected: the
clone throws on function- or symbol-valued own members, and this check is what makes a
prototype-carried difference loud. The existing `DataCloneError` pins stay as they are.

**5.4 A conformance case.** `test/conformance/store-conformance.ts` gains a case run by every
backing (`MemoryStore`, `SqliteStore`, and `PostgresStore` through its own conformance test): an append whose payload carries an object with a prototype `toJSON` either throws and
leaves the chain unchanged, or returns a `transitionDigest` equal to `chainHead` and to the
digest of the transition `readChain` returns. (`MemoryStore` takes the first arm after 5.3; the
SQL backings, which persist the `toJSON` view, are expected to take the second.)

**5.5 Pins.**

- Four identity shapes — an `Object.create({ principal, authority })` object; a class whose
  `principal` and `authority` are getters over `#private` fields; a plain object with a
  non-enumerable own `principal`; a class with a prototype `toJSON` that returns a different
  view (an extra `email` key and a redacted principal) — at each of: finalize's `actor`,
  finalize's `facts.checker`, an obtained consultation's `checker`, decline's `actor`,
  `raiseFinding`'s `raiser`, `acknowledge`'s `acker`. On `MemoryStore` and `SqliteStore`. Each
  asserts: the outcome is `ok`; the recorded member deep-equals the plain literal of the
  validated values (no `email`, the real principal); `verifyChain` is intact; the outcome's
  `transitionRef` equals `chainHead`.
- SoD: a two-leg profile with `sod.notActorOf`; the maker leg confirmed with a getter-backed
  identity of principal P; the checker leg finalized by a plain identity of principal P refuses
  `sod-violation` (today it confirms).
- Mutation after the call: mutating the identity object after `finalize` returns changes
  nothing in `readChain`.
- A getter-backed acker counts: a finding raised and acknowledged by a getters-shaped acker
  satisfies coverage, and `finalize` confirms (today it refuses).
- The read side: a prior leg whose recorded `confirmed` actor is `{}` (written through a test
  double) makes opening the successor leg throw the storage-fault error; a successor whose
  recorded `priorLegActors` holds `{}` makes `finalize` throw it too. A throwing `principal`
  getter at finalize propagates its own error.
- `MemoryStore` directly: `appendTransition` and `appendBatch` with a prototype-`toJSON` payload
  member throw and leave the chain unchanged; a plain payload is unaffected.
- `test/byte-stability.test.ts` is not touched and stays green.

**5.6 Documentation.**

- `docs/guide/integrating.md`'s "pass exactly those fields" paragraph: the library records a
  fresh `{ principal, authority, proofRef? }` built from the values it validated, read once
  through property access — never the object passed, and never its `toJSON` view; extra own keys
  still refuse or throw as today.
- `isValidIdentity`'s doc comment: the snapshot, and that the twelfth inversion's fix is now
  complete for inherited, accessor and `toJSON` shapes.
- `store/memory.ts`'s header (ruling 5.3).
- `CHANGELOG.md` (`[Unreleased]`, `Fixed`), `docs/process/implementation-status.md` (an increment
  section; the record that `bc0a2e1`'s fix was incomplete and is now completed; the corrected
  premise of the store-clone decision), `CLAUDE.md`'s measured counts, and
  `docs/superpowers/INDEX.md` (this pair's row and the file counts).

## 6. Left to the builder

Local names; the exact error text within 5.3's content; test file names and layout; how the
facts gate returns the snapshot alongside its canonical bytes.

## 7. Exit

Every repository gate green except `smoke`, which cannot run on the authoring machine and runs
in CI on the pull request. No existing assertion changes its truth value; the byte-stability
digests do not move.
