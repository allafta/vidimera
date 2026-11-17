# The verifier-faults increment — design

**A post-build-order increment (no step). No sealed-set edit, no marker move, no new refusal
code, no change to `index.ts`, either manifest, or any public type. Behavior changes: a host
`Verifier` that throws or rejects is a FAULT — the seam throws and appends nothing — wherever the
signature layer applies, where today it is folded into `verified: false` and drawn as a terminal
`chain-compromise` edge on a healthy record; the instance refuses to land a transition it cannot
verify itself (the mint check); `create()` refuses a malformed `config.signing`. One self-authored
inversion, the sixteenth. Sanction: none needed — `docs/analysis/2026-11-17-sanction-calls.md`,
call 1, says why.**

**Status.** Licensed by call 1 of the 2026-11-17 sanction calls (made under the owner's
delegation and merged in #21). Branch `verifier-faults-2026-11-17`, off `main` at `eedcd3a`.

## 1. What this increment answers

- **A transient verifier fault is recorded as tampering.** `layerVerdicts`
  (`kernel/verify-signatures.ts`) wraps each verifier call in a `catch` that reads a throw or a
  rejection as `verified: false`. On a signing record every un-enlisted seam then appends a
  terminal `refused { code: 'chain-compromise' }` — open records at `finalize`, `decline` and the
  findings seams; `confirmed` records at `seal` and the redemption seams, through the compromise
  carve-out. After the outage every transition verifies, the compromise edge included. A
  rejecting `listByRecord`, a fault of the same kind one hook over, already propagates and
  appends nothing. The guide's mitigation ("retry inside the verifier") fails once an outage
  outlasts the retry budget.
- **Nothing checks that the instance can verify what it mints.** `signOne`
  (`signing/decorate.ts`) stores whatever `{ keyRef, signature }` the signer returns, then the
  append lands. A signer `keyRef` missing from `verifiers`, a signer whose key differs from
  `verifiers[keyRef]`, or a buggy signer opens records the same instance then reads as
  compromised at its next seam call.
- **`create()` checks only that `config.signing` is present.** `signing: null`, a missing
  `verifiers`, a `Map` for `verifiers`, a non-function `signer`, a sidecar without `put` all
  construct and fail later — one of them (no usable verifier) silently and destructively, by the
  route above.
- **The guide leaves out the new-key half of rotation.** It says a retired key's verifier must
  stay registered; it does not say a NEW key's verifier must reach every instance — and every
  configuration a deployment may roll back to — before any instance signs with it. A rolling
  rotation done as the guide describes has an old instance read the new key's entries as
  unverified (an unresolvable `keyRef` fails closed, OPEN-QUESTIONS §1) and draw
  `chain-compromise` on untampered records.
- **No test supplies a throwing verifier.** Deleting the `catch` keeps every test green; the
  verifier-registry "boundary" tests are titled as if they call the inherited member, and stop at
  the lookup.

## 2. Goals, non-goals, anti-goals

**Goals.**

- Where the signature layer applies to a chain, a verifier fault on any of its transitions
  propagates out of the seam (or the cross-record verification), with nothing appended. Where it
  does not apply, the verifier's fault is never seen — the layer consults nothing it does not
  need.
- `verifySignatures` (the read) propagates a verifier fault too, as it already propagates a
  rejecting `listByRecord`: a report that said "unverified" for "could not ask" would be false.
- A verifier answer that is not the literal `true` stays `verified: false`; an unresolvable
  `keyRef` stays `verified: false` (OPEN-QUESTIONS §1's decided postures, unchanged).
- The instance never lands a transition it cannot verify: a mint whose `keyRef` is not an own key
  of `verifiers`, or whose signature its own verifier does not accept with the literal `true`,
  throws before the sidecar write and before the append.
- `create()` refuses a malformed `config.signing` with a named error.
- The guide states the verifier contract (`true`, `false`, throw), the fault posture, and the
  two-phase rotation; the shipped `Verifier`/`SigningConfig` JSDoc says the same.

**Non-goals.**

- Routing verifier unavailability to SPEC §8's availability class — declined by call 1.
- `config.store`'s shape at `create()` — the same class of late failure, a different hook; named
  open.
- Rotation tooling (a key-history registry) — the host's, per SPEC §14 ("key distribution and
  rotation are host-declared").

**Anti-goals.**

- A verifier fault on a record the layer does not apply to (a non-signing record held as
  non-signing, with junk in its sidecar) changing that record's outcome at any seam.
- A fault being swallowed anywhere, or any path where a fault appends.
- Weakening fail-closed: a `false`, a non-boolean, or an unresolvable `keyRef` still refuses.

## 3. Constraints

- No sealed-set edit (call 1): OPEN-QUESTIONS §1's postures cover a missing signature and an
  unresolvable `keyRef`, both kept; SPEC §8 names no verifier posture.
- **The sixteenth self-authored inversion.** The recorded stance — "a throwing verifier is
  fail-closed reporting" (`kernel/verify-signatures.ts`'s header and `layerVerdicts` comment; the
  guide's "exactly as a throwing verifier does") — is reversed. Argued at its site in
  `kernel/verify-signatures.ts`: a throw is the verifier saying it could not answer, and
  recording "could not answer" as a terminal tampering edge is the one outcome no host can undo;
  the fault posture already taken for a rejecting sidecar is the precedent. No existing assertion
  pins the old posture (no test supplied a throwing verifier), so none flips.
- The order at every site is unchanged: AL1 bound to the id, the signature layer, profile
  resolution.

## 4. Approaches

1. **Capture, then decide by obligation (picked).** `layerVerdicts` keeps its one walk, records a
   verifier fault per transition instead of reading it as `false`, and the two consumers decide:
   the gate rethrows only where the obligation applies (or where computing it needs the faulted
   genesis verdict), the report rethrows always.
2. **Remove the `catch`.** Simplest, but a fault on a non-signing record's junk entry would then
   throw at every seam on that record — the anti-goal.
3. **Verify lazily, only once the obligation is known.** Splits the one correlation core into
   two walks; more code for the same outcome as 1. Not picked.

## 5. Rulings

**5.1 The fault.** In `layerVerdicts`, a verifier that throws or rejects for a transition leaves
that transition `verified: false` and records the fault beside it (internal; the report type does
not change). A verifier is consulted only for an entry whose `keyRef` is an own key of
`verifiers`, as today.

**5.2 The gate.** `signatureLayerHolds`: where the instance holds the profile, the obligation is
the held profile's `signing`, as today. Where it does not, and the live same-id profile declares
`signing` and the genesis verification faulted, the obligation cannot be computed — rethrow that
fault. If the obligation is false, return `true` and never rethrow. If it is true and any
transition's verification faulted, rethrow the first fault in chain order; otherwise hold iff every
transition verified.

**5.3 The read.** `verifySignatures` rethrows the first fault in chain order, after the chain is
bound to its id and the sidecar listed.

**5.4 The thrown value.** An `Error` naming the record, the `seq` and the `keyRef`, saying it is a
verifier fault and that nothing was appended, with the verifier's own error as `cause`.

**5.5 The mint check.** In `signing/decorate.ts`, the memoized per-transition promise becomes
"mint, then verify": after the signer resolves, the minted `keyRef` must be an own key of
`verifiers` whose verifier answers the literal `true` over the same bytes; otherwise throw a named
error (no sidecar write, no append). A verifier fault during the check propagates with `cause`. On
any failure the memo entry is dropped, exactly as for a failed mint.

**5.6 `create()`.** When `config.signing` is present it must be a non-null object; `signer` a
function; `verifiers` a plain object (prototype `Object.prototype` or `null`, not an array, not a
`Map`) whose every own enumerable value is a function — an empty registry is allowed (a prepared
instance; the mint check refuses its first signature); `signatures` an object whose `put` and
`listByRecord` are functions. Each violation throws a named `create:` error.

**5.7 Pins** (new test files; existing suites unchanged except retitling the two verifier-registry
boundary tests to say what they assert):

- a throwing verifier and a rejecting verifier on a signing record at each of the eight
  un-enlisted seams (`finalize`, `decline`, `raiseFinding`, `acknowledge`, `seal`, `redeem`,
  `beginRedemption`, `completeRedemption`): the call rejects with the fault (cause asserted), the
  chain length and the sidecar size are unchanged, and the same call succeeds once the verifier
  recovers;
- an enlisted seam and both cross-record verifications (`open` with `priorRecordRefs`, with
  `supersedes`): the fault propagates, no record is created;
- `verifySignatures` propagates the fault;
- no overreach: a non-signing record held as non-signing, with a junk sidecar entry whose
  verifier throws, finalizes and seals normally;
- the non-holder branch: a same-id signing sibling whose genesis verification faults throws; one
  whose live profile does not sign ignores the fault;
- the mint check: a signer `keyRef` absent from `verifiers`, a signer key that does not match its
  verifier, and a verifier that throws during the check each make `open()` throw with nothing
  appended and no sidecar entry;
- `create()`: each malformed shape in 5.6 throws its named error; an empty registry constructs;
- rotation: a two-phase rollout (every instance holds both verifiers before any signs with the
  new key) leaves every record untouched-healthy across instances; the one-phase hazard — an
  instance without the new key's verifier reads the new entries as unverified and refuses
  `chain-compromise` — is pinned as the documented, decided behavior.

**5.8 Docs.** `kernel/verify-signatures.ts` (header, `layerVerdicts`, `signatureLayerHolds`,
`verifySignatures` comments — the inversion argued there); `signing/decorate.ts`'s header (the
mint check); `signing/store.ts`'s `Verifier`/`SigningConfig` JSDoc (the contract);
`docs/guide/api-reference.md` (the Verifier paragraph rewritten: the contract, the fault
posture, the two-phase rotation, the stuck-record hazard of a verifier that throws on malformed
input); `docs/guide/integrating.md` (the AL2 bullets); `CHANGELOG.md`;
`docs/process/implementation-status.md` (this increment's section, the sixteenth inversion);
`docs/process/next-phases.md` (the sanction-gated entry marked built); `CLAUDE.md`'s counts;
`docs/superpowers/INDEX.md`.

## 6. Left to the builder

Local names; the internal shape that carries a fault beside a verdict; test file names; fixtures.

## 7. Exit

Every gate green except `smoke` (CI). No existing assertion changes its truth value; the
byte-stability digests do not move.
