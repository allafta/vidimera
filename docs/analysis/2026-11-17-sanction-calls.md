# The 2026-11-17 sanction calls — AL2's three open questions

**Date: 2026-11-17.** The record of three calls the repository owner delegated in so many
words — "review, merge and make the sanction calls first" — after six remediation increments
(chain binding, identity snapshot, signing obligation, supersedes binding, compliance statement,
release hardening) merged. The calls were made by the authoring session under that delegation,
through `docs/concept/SCOPING-GUIDE.md` §§1–2's own machinery, and are recorded here so the
owner can read and revoke any of them before the increment it licenses lands. One of the three
is a sanction in the sealed-set sense — an authorization to edit `docs/concept/`; the other two
turned out, on reading the sealed text, to need none, and the call is which design to build.

**The machinery, applied once for all three.** Every question here is about AL2 (detached
signing, SPEC §14), a capability already promoted and `[PROVEN]`: by the tier test it is
GOVERNED ("an insider-resistance/signing need", §1), and nothing below promotes, demotes or
re-tiers anything. The promotion rule (§2) is therefore not engaged as a promotion; its
purpose-trace still binds each change — every one traces to the governed-host bar (an operator
who enabled AL2 because a storage-writing insider is outside its trust boundary) and to SPEC
§13A's own threat model. No maturity marker moves under any call. CONCEPT.md's principles and
honesty discipline are untouched — the one sealed edit granted below is the honesty discipline
applied to AL2's own sentences ("every guarantee stated with its limit in the same breath").

## Call 1 — verifier faults (the `unavailable` question): build the propagating design; no sanction needed

**The question** (`docs/process/next-phases.md`, the sanction-gated list, "An `unavailable`
answer for the signature layer"). A `Verifier` that throws — a remote key service down for a
minute — is folded into `verified: false`, and every un-enlisted seam turns that into a
terminal `chain-compromise` edge on a healthy record, including `confirmed` records through
`seal` and the redemption seams. A rejecting `listByRecord`, a fault of the same kind, throws
and appends nothing.

**The two designs.** (a) **Propagate**: a throwing verifier is a fault, like a rejecting
sidecar read — the seam throws, nothing is appended, the host retries; a verifier that answers
anything but `true` (a `false`, a status string, an object) stays fail-closed exactly as today.
(b) **Route to SPEC §8's availability class**: a new producer of the `unreachable` outcome,
appending nothing. (b) widens §8's producer list, touches §14's AL2 bullet and reopens
OPEN-QUESTIONS §1's key-custody tail — a sealed edit.

**The call: (a), and (b) is declined.** (a) needs no sealed edit: OPEN-QUESTIONS §1's decided
postures cover a missing signature ("fail-closed into each site's existing code") and an
unresolvable `keyRef` ("fails closed"), and both stay exactly as decided; a verifier that cannot
answer is neither. SPEC §8 names no verifier posture. It reverses a recorded self-authored
stance — the AL2 enforcement increment's "a throwing verifier is fail-closed reporting" — so the
increment that builds it argues that reversal at its pins and numbers it in the status record's
self-authored sequence. The contract the guide then states: a verifier returns `false` for a
signature that does not verify and throws only when it cannot answer; a verifier that throws on
malformed input turns a tampered entry into a stuck record (the seam throws until the entry is
repaired) rather than an evidence edge — a host-side defect the guide names. The rest of the
roadmap's item rides with it: verify what is minted (a signer whose key the registry cannot
verify makes the seam throw before anything lands), check `config.signing`'s shape at
`create()`, document two-phase key rotation, and pin a throwing verifier at every seam.

**Cost if wrong:** an operator who wanted transient verifier faults to surface as a domain
outcome rather than an exception gets an exception; (b) remains available to a later, sanctioned
increment.

## Call 2 — signature entries and the append (the transactional sidecar): build it; no sanction needed

**The question.** The signing decorator signs a transition and writes its sidecar entry BEFORE
it delegates the append, outside any transaction. Three consequences, each recorded: an enlisted
redemption the host rolls back leaves a valid library signature over a `redeemed` transition
that never committed, which a keyless insider can splice back (it verifies — signatures
correlate by digest); a lost compare-and-swap leaves a valid signature over the losing
transition, which can replace the head and defeat AL2's head-edit closure; and a refusing call
on the no-edge path mints one orphan per call (deferral-register row 22, one of the three rows
gating the 0.1 cut, held open on a "third horn" — deciding C3/C4 from the read chain — that
needs a sanction).

**What the sealed text says.** SPEC's Store contract fixes the compare-and-swap DISCIPLINE and
says outright that "the argument list carrying it is not" stable; it says nothing about when a
sidecar entry is written. SPEC §11.2 already states that "a transition written inside an aborted
transaction was never appended" — a signature written inside the same aborted transaction is the
same fact one table over. So persisting a transition's signature entries inside its append's
atomic unit, after the compare-and-swap passes, contradicts no sealed sentence.

**The call: build it, as its own increment, and do not take the third horn.** Signature entries
are persisted atomically with the append they sign, after its compare-and-swap, on every backing
that can provide that — the library's three reference backings with a store-integrated sidecar.
Then no entry outlives an uncommitted append: rolled-back and lost transitions leave nothing to
splice, and the no-edge path mints nothing — which retires row 22 on measured behavior rather
than by narrowing SPEC §5's admission rule. The hazard row 22 names stays the design's hard
constraint: no change may make an entry's survival conditional on the append's outcome WITHOUT
atomicity (a post-CAS write outside the append's unit reopens the landed-but-unsigned
transition). A host-supplied sidecar that cannot join the append's unit keeps today's ordering,
and its residual is stated (call 3). The Store and `SignatureStore` signatures are provisional
pre-1.0 by the sealed set's own declaration; the increment's design fixes the shape.

**Cost if wrong:** an L-sized change to the store adapters and the decorator. If it stalls, the
residual stays stated (call 3) and row 22 keeps gating the cut on its existing trigger.

## Call 3 — restating AL2 with its conditions: GRANTED (the one sealed-set sanction)

**The question.** SPEC §13A says the recompute and head-edit residuals "close at AL2", and §14's
AL2 bullet says it "closes the recompute residual and the genesis-head blind windows". Three
conditions the build depends on are stated nowhere in the sealed set: (i) **every registered
profile signs** — a storage-writing insider can rehome a signing record onto a co-registered
non-signing profile by copying a genuine genesis's `profileId` and `profileDigest`, and the
layer stops applying (and the supersedes-binding increment closes forged predecessors only where
every registered profile signs); version discipline leaves exactly such an unsigned twin while
AL2 is being enabled for an existing flow; (ii) **the key sits outside the insider's boundary**;
(iii) **no signature outlives an uncommitted append** — today's sign-before-append ordering
leaves spliceable signatures (call 2). CONTROLS' profile-binding row and OPEN-QUESTIONS §1's
amended paragraph offer "AL2 key custody" as a closure of the recompute route by itself, which
(i) refutes.

**The grant.** A corrective edit to the sealed set, no marker move, no scope change, in at most
TWO sealed-set commits:

1. **Now-true conditions** (lands after call 1's increment, before call 2's): SPEC §13A's closing
   sentence on AL2 and §14's AL2 bullet state conditions (i)–(iii) as they then stand; CONTROLS'
   profile-binding row and any CONTROLS or ASSURANCE sentence that states the AL2 closure
   unconditionally; OPEN-QUESTIONS §1's amended paragraph ("which only signing-only registration
   or AL2 key custody closes"); GLOSSARY or DECISIONS only where a sentence there repeats an
   unconditional closure. Each edit shrinks or conditions a sentence to what the code does; none
   widens a claim.
2. **One follow-up** when call 2's increment lands: condition (iii) narrows to the host-supplied
   sidecar that cannot join the append's unit, in the same sentences, and nowhere else.

Each commit's increment records its exact sentences, before and after, in its design and in the
status record's sealed-history account; the sanction is spent at the second commit (or at the
first, if call 2 is abandoned). Anything outside these sentences needs a new sanction.

**Cost if wrong:** the sealed set states conditions an adopter must meet that a later design
might have relaxed; the cost runs toward underclaim, the direction the honesty discipline
prefers.

## Not a sanction question, decided alongside

**An instance-level signing policy** (anchoring the obligation outside the chain-carried
`profileId`) is **declined for now.** In a mixed registry it can only refuse every non-signing
record, which makes it signing-only registration by another name — a lever every host already
has (register only signing profiles) — and it does not help the enablement window, where the
unsigned twin must stay registered for the records still under it. Call 3's condition (i)
states the trade instead. A later design may revisit it if a host needs a mixed registry with
the closure.

## Order of the increments these calls license

1. Verifier faults (call 1) — small; reverses one self-authored stance.
2. The AL2 restatement, first commit (call 3.1).
3. The transactional sidecar (call 2) — large; retires register row 22 if measured.
4. The AL2 restatement, follow-up commit (call 3.2).
