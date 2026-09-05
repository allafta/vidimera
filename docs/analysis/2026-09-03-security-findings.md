# 2026-09-03 — The security-findings pass: four findings against the tree

**Status.** Complete on branch `security-findings-2026-09-03`, cut from `main` at `d7d6dcb`:
three code commits — `5a56892`, `bc0a2e1`, `c3bfdf0` — and the commit carrying this record.
Not merged and not pushed; both are owner acts. Every code commit landed test-first, with the
red observed against the unfixed tree and quoted below, per the discipline the CI test-gate
repair made explicit the same morning: a gate is shown red once before its green is believed.

**How to read this.** An owner-driven security review of `@vidimera/record` reported four
findings in one message, each with the route the reviewer took ("I wiped the sidecar and
finalized successfully"). Each was verified against the tree before anything changed, then
classified: a bug, a recorded posture, or a sealed-set question. Two were fixed in code, one
became a report field with its fail-open pinned as a bound, and one turned out to be already
on record. The 2026-08-30 code-gaps catalogue (`2026-08-30-pre-release-code-gaps.md`) had
named three of the four in some form; where it had, this record says how each item stands now.

## Finding 1 — the verifier registry walked the prototype chain

**Verdict: confirmed, fixed (`5a56892`).** The one real defect of the four.

`kernel/verify-signatures.ts` resolved a sidecar entry's `keyRef` with a bare index into the
host's `verifiers` object, and `signatureLayerHolds` then read `verified` for truthiness. A
plain object's bare index walks the prototype chain. Measured with a bare call, the way the
code called it: `toString` answers `"[object Undefined]"`, `constructor` answers the bytes
object it was handed — both truthy, both counted as verified; `valueOf`, `hasOwnProperty` and
`isPrototypeOf` throw when called that way, and `__proto__` is not callable, so those four
already failed closed. Two live members were enough: a sidecar written by a storage-side
insider holding no key at all verified whole, and every enforcement site confirmed the record.

Within the declared threat model, this is the layer's own purpose defeated. SPEC §14 names AL2
as the upgrade "for a single operator who must resist its own storage-writing insiders"; the
sidecar is storage. `SECURITY.md` lists the class squarely in scope: "The signature layer (AL2)
reporting a transition verified when it is not".

The lineage matters. `2026-08-03-step-1-review.md` §1 found the identical trap in
`resolveCanonicalizer` and fixed it with `Object.hasOwn`, and the comment left at
`canonical.ts` calls the guard "load-bearing, not a style choice". The verifier registry
arrived two weeks later with the AL2 mint increment and did not carry it. A sweep of every
string-keyed registry read in `packages/record/src` found this the only unguarded one: the
refusal-code `REGISTRY` reads compare their result against string literals, so a walked
member can never equal `'compromise'`, and the `freshness` map was already guarded.

The fix is two lines: `Object.hasOwn` on the lookup, and `verified` set to the verifier's
answer compared with `=== true`, which also closes a host verifier that answers a truthy status
string or object — the same truthiness read admitted that too. `test/verifier-registry.test.ts`
pins the family: the two members that passed, the four that already failed closed (a boundary
pin, green before the fix and kept so the family is named in one place), and the non-boolean
answer. Red first, against the unfixed tree: `3 failed | 4 passed (7)`, the three failures at
`verified` holding `"[object Undefined]"`, a `Uint8Array`, and the string `'verified'`.

## Finding 2 — signing enforcement reads live configuration, not the chain

**Verdict: confirmed as behavior; a recorded posture, not an oversight; the report now says so
(`c3bfdf0`); the fail-open stays, pinned as a bound.**

`layerVerdicts` computes `signingDeclared` by resolving the genesis transition's `profileId`
against THIS instance's registry and reading `.signing === true` from the profile it finds. The
code comment names this the id-resolution posture and the rehoming residual. OPEN-QUESTIONS §1
decided it ("per profile, record-homogeneous — a record opened under a signing profile is
signed whole from its genesis; a profile flipping the field is the version-discipline violation
SPEC §2's convention names"), the 2026-08-30 catalogue carries it as items 33 and 60 (both
post-cut, "a 1.0-review consider, not a debt"), and `open-items-plan.md` lists the closures a
1.0 review should weigh. The review's route works exactly as described: a same-id profile
without `signing: true`, on an instance with no `config.signing` at all, reads the record as
plain AL1 and finalizes it. Wiping the sidecar is not even needed; that instance never reads it.

What the review added that the record did not have:

- **The asymmetry is in-tree and argued.** `kernel/finalize.ts`'s policy-drift arm fails
  closed on the identical same-id flip for `policySource` — "a bound digest with nothing live
  to compare is mismatch-shaped" — and says why in place. Signing took the opposite posture
  with no argument at its site.
- **The route needs no recompute.** Item 60 frames the residual as a whole-chain rewrite of the
  genesis `profileId` onto a non-signing profile. The review's route is a configuration change
  alone.
- **The chain already holds the evidence.** The genesis `profileDigest` is a digest over the
  data-only projection, which keeps every non-function field — `signing` included. The pinned
  test measures it: the bound digest and the plain profile's digest differ.
- **The host could not make the comparison the code delegated to it.** `profile-digest.ts`
  said "comparison is a host concern until one is built", and neither `profileDigest` nor
  `projectProfile` was exported.

Three ways forward were weighed: report the comparison (no sanction); record the sharper
framing and leave the fix for the 1.0 review; or fail closed, which adds a refusal to SPEC §8's
registry and §9's ladder and moves OPEN-QUESTIONS §1's decided text, so it needs a fresh
sanction through `SCOPING-GUIDE.md` §§1–2. The first two were taken; the third is recorded as
the open question it is.

What landed: `SignatureReport.genesisProfile`, a three-state field — `matches` when the live
profile's projection digests to the bound digest; `drifted` when the id resolves to a profile
that digests differently, both digests carried; `unresolvable` when this instance does not hold
the id or the genesis carries no string id or binding. It is computed only in
`verifySignatures`, so `signatureLayerHolds` pays nothing and reads nothing new; `signingDeclared`
is documented as live-computed and to be read together with it. `profileDigest` and
`projectProfile` are exported from the entry point. Red first: `6 failed (6)` — the field
`undefined` on every read, the exports missing. `test/profile-drift-report.test.ts` also pins
the review's own route with its fail-open **as a bound** — the same-id non-signing sibling still
finalizes — so that the day it moves, it moves on purpose.

Items 33 and 60 stand thus: the comparison the record was built for now runs and is reported,
and the helpers exist; whether to REFUSE on drift is the one question left, and it is
sanction-gated. `next-phases.md`'s sanction-gated list gains it as its fourth entry. The
fail-open closed later the same day, under the profile-drift gate's own fresh sanction
(`docs/superpowers/specs/2026-09-03-profile-drift-gate-design.md`); this record is left as the
history it is.

## Finding 3 — caller identity objects persisted verbatim

**Verdict: confirmed; a recorded posture; inverted (`bc0a2e1`) — the twelfth self-authored
inversion in the status record's numbered sequence.**

`isValidIdentity` (`kernel/finalize.ts`) checked a non-empty `principal` and `authority` and
nothing more, and every seam persisted the object it was handed — `payload: { actor: identity }`
at finalize and decline, `raiser`/`acker` at the findings seams, `checker` in consultations and
in `facts`. `kernel/consultations.ts` recorded the posture in so many words: extra keys "reach
the digested payload as host attestation". The catalogue's item 51 tracked the checker half.

The inversion is argued at `isValidIdentity`'s own site. SPEC §6 defines the shape,
`{ principal, authority, proofRef? }`; §6 and §13 build erasure on the principal being a
pseudonym resolvable through an identity map held outside the chain. The extra keys are exactly
where a host leaks an e-mail address, a display name or a bearer token into a digested,
immutable transition, and an immutable chain cannot un-swallow what it took. Attestation no
seam reads is not a capability anyone lost. Exact-shaping is tighter conformance to §6, not a
SPEC change; but it reverses this build's own recorded stance, so it is argued in place and
numbered here rather than slipped in.

What landed: own keys within `{ principal, authority, proofRef }`; `principal` and `authority`
non-empty strings; `proofRef` absent, an explicit `undefined` (the shape an optional field takes
under a spread), or a string. Every caller keeps its posture toward an invalid identity —
finalize and decline refuse `identity-authority-refused`, the findings seams and an obtained
consultation's checker throw (the findings message now names the shape), `facts.checker` fails
the facts gate with `consultation-missing`; only what counts as valid moved. Red first:
`6 failed (6)`, every seam accepting the widened identity. The record project's other 806
tests were unaffected: no fixture had passed a widened identity. Pre-0.1, the break is free; a
host that passed a richer object projects it to the three fields. Item 51 is closed, and wider
than it was filed — actor, raiser, acker and both checkers, not the consultation checker alone.

## Finding 4 — raiseFinding and acknowledge accept any authority

**Verdict: by design, pinned, and already recorded; nothing changed.**

SPEC §10.2 says the raiser identity "MAY be an automated checker's — raising decides nothing",
and that an acknowledgment counts "by principal-only comparison against the raiser"; §4's
profile table scopes `allowedAuthorities` to the authorities "that may vouch for a leg's actor".
`test/findings-seams.test.ts` pins it under the name "deciders and informers are different
populations". The residual the review points at — no field lets a profile require that a
COUNTING acknowledgment come from a leg-allowed authority, so `requiredAcks` can be satisfied
with no human in the acknowledgment (the finalize actor still needs an allowed authority) — is
already the first entry of `next-phases.md`'s sanction-gated list, surfaced by the 2026-09-02
code review as "A per-leg raiser/acker authority allowlist, consulted at ack-counting time".
The review re-derived it independently; the list entry now says so. Changing the counting rule
is a SPEC §10.2 change and strengthens the human anchor rather than weakening it, so it is a
promotion question for the sealed set's own machinery, not a fork — and not this pass's to make.

## Observed, not acted on

After the store-postgres project's teardown, every full run on this branch printed a stack
trace to the log — `TypeError: done is not a function` at `embedded-postgres/dist/index.js:393`,
the line `done();` — after vitest's own summary and after the JSON report was written. In all
three runs `vitest exit: 0` and the report gate answered `ok`. None of this branch's commits
touch `packages/store-postgres`, so the trace is not this pass's; it is most plausibly the
library's `exit` hook — the one the CI test-gate repair deliberately left in place — invoking a
shutdown that expects a callback it is not given. Recorded here for the owner of deferral
register row 24 to read: it does not touch the exit code the gate now guards, and a green run
carries it as noise.

**Reconciled 2026-09-05.** The cause is the workaround's own: `async-exit-hook` passes a hook
its `done` callback only from the `beforeExit` path, so with that listener removed the library's
`exit`-event hook runs with no callback and, after a clean teardown, throws at its `done()`.
Measured through the real `loadEmbeddedPostgres` in a child process, exit code 1 survives as 1
and 0 as 0, with the trace on stderr both times. Register row 24 now carries the note, and two
pins in `global-setup-exit-hooks.test.ts` hold it — the exit code, and the trace's presence.

## Gate outputs, as measured against the closing commit

`pnpm test:ci` — 889 tests in 72 files, zero skips; `node scripts/ci-assert-tests.mjs` over
the run's report — `ok — 889 tests in 72 files (77 suites): 889 passed, 0 failed, 0 skipped,
0 todo`; `pnpm typecheck` — both packages clean; `biome check --error-on-warnings .` — 141
files, exit 0; `contract-scan`, `api-reference-sync`, `docs-index-sync` — exit 0. Suite
movement across the branch: 69 files and 870 tests at `d7d6dcb`; 70 and 877 after the verifier
fix; 71 and 883 after the identity shape; 72 and 889 after the drift report.

## What remains, and whose it is

- **Merge and push** — owner acts, not done here.
- **Two sanction-gated questions**, both now in `next-phases.md`'s list and neither decided by
  this pass: fail-closing a drifted genesis profile (finding 2, the fourth entry), and the
  raiser/acker authority allowlist (finding 4, the first entry).
- **The exit-time trace** above, for row 24's owner.
