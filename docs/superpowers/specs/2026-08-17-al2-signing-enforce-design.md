# AL2 detached signing, the enforcement — design

**AL2 increment 2 of 3.** The mint's signature layer becomes load-bearing: every place
this build verifies a chain — the four seam prologues (finalize, seal, the redemption
family, the findings seams) AND the two cross-record verifications (prior-legs,
supersedes) — now requires, for a record whose genesis profile declares signing, that
EVERY transition carries a sidecar signature that verifies under the host registry.
Failure folds into the code each site already speaks: `chain-compromise` at the seams,
`prior-leg-unverified`/`supersedes-unverified` at the cross-record claims. At exit,
the sanctioned sealed-set bundle executes (the AL2 tokens, OQ §1's tails, the two
decided-on-record clause rewrites, the parked OQ §7 opener), and SPEC §14's AL2 bullet
reads `[PROVEN]`. `freshness`/`consultation-stale`/AL3 tokens stay; authority
timestamps remain the AL2 freshness increment's own design.

## Rulings taken at the enforcement gate, so they are not re-litigated

- **All six verification sites** gain the layer via ONE shared async helper; no chain
  a signing profile owns is trusted unsigned anywhere in the kernel.
- **The audit reads stay separate**: `operator.verifyChain` remains the AL1 report
  (documented as such), `operator.verifySignatures` the AL2 report — graduated
  honesty; the reads never gate; the SEAMS enforce.
- **One increment** (helper + six swaps + sealed bundle + record).
- **The sealed bundle** (executed by this increment's own sealed-edit task):
  SPEC:1227's `[SKETCHED]` → `[PROVEN]` (plain brackets in the bold bullet) and
  CONTROLS:48's bare cell `SKETCHED` → `PROVEN`; OQ §1's four bullets gain tails —
  granularity (**Decided:** per-profile, record-homogeneous; the flip boundary is the
  version-discipline violation §2 names), missing-signature posture (**Decided:**
  fail-closed into each site's existing code — `chain-compromise` at the seams, the
  claim-refusals at prior-legs/supersedes), key custody (**Decided:** `keyRef` beside
  each detached signature, resolved against the host verifier registry; unresolvable
  fails closed), authority timestamps (**explicitly still open** — the AL2 freshness
  increment's own design, §4 below); SPEC:1233's "enablement granularity and the
  missing-signature posture are named open decisions" takes the SPEC:488-precedent
  minimal rewrite to decided-on-record with the §1 pointer; CONTROLS:48's
  "(granularity open — `OPEN-QUESTIONS.md` §1)" likewise; and OQ §7's opener "The
  mode is sketched" takes its parked tense fix ("was sketched at this document's
  writing" or the minimal equivalent). Nothing else in the sealed set changes;
  byte-verified with full before/after lines (lesson 22).

## Rulings taken at this spec, argued in place

- **The helper's contract.** `signatureLayerHolds(ctx, chain): Promise<boolean>`
  (exact name and home at plan time; factored to SHARE its correlation core with
  `kernel/verify-signatures.ts` rather than duplicate it): resolve the chain's
  genesis `profileId` in THIS instance's registry — a non-signing or unresolvable
  profile returns `true` (the layer does not apply; AL1's own posture at that site
  still governs), a signing profile requires `ctx.signing` (guaranteed by `create()`'s
  own invariant: a declaring profile cannot construct without it) and then EVERY chain
  transition to have a sidecar entry whose `keyRef` resolves and whose verifier passes
  over `encodeTransition(t)`; any miss, unresolvable `keyRef`, failing or THROWING
  verifier ⇒ `false`. AL1's `verifyChain(chain).intact` stays each call site's FIRST
  check (cheap, sync); the layer runs only on an intact chain.
- **The failure mapping inherits each site's existing discipline** — no new codes, no
  new outcome classes: the four seams route a `false` through the SAME arm their
  `!intact` takes today (`appendChainCompromise` where they append, the enlisted
  result-first refusal where the redemption prologue already refuses without
  appending — lesson 9's settled branch, inherited not re-decided); prior-legs and
  supersedes fold `false` into `{ ok: false }` → their own refusal codes. The
  compromise edge appended onto a signing record goes through the DECORATED store and
  is therefore itself signed — by construction, pinned.
- **The rehoming residual is NAMED, not closed.** A whole-chain recompute that
  rewrites the genesis `profileId` to a REGISTERED non-signing profile produces a
  hash-intact chain the layer does not apply to — the signature obligation is keyed
  by the genesis's own claim. Closures exist (a deployment registering only signing
  profiles; a future profileDigest-pinning tightening riding §2's
  versioned-id convention) but each has its own blast radius and none is built here.
  Recorded in the status doc §14 row's limit column in the honesty discipline's own
  register — a guarantee stated with its limit in the same breath. `verifySignatures`
  already REPORTS the truth either way (`signingDeclared: false` on the rehomed
  claim), so an auditor composing the two reads sees the rehoming.
- **`review()` and the pure reads stay unverified** — review does not chain-verify
  today (replay's own throws are its integrity floor) and gains nothing here; the
  enforcement bound is the six sites, stated.
- **Threading**: `verifyPriorLegs` and `verifySupersedes` gain the context they need
  (their callers hold `ctx`); their signatures widen rather than a global being
  introduced.

## 1. Tests

- **Seam enforcement** (a signing profile, real Ed25519): tamper ONE sidecar
  signature (or delete one entry) on an otherwise-intact chain → `finalize` refuses
  `chain-compromise`; same for `seal`, `redeem` (un-enlisted: the compromise edge
  appends AND is itself signed — pin the edge's sidecar entry), `raiseFinding`;
  the ENLISTED redeem on the same fixture refuses result-first with NO append
  (lesson 9's inherited branch, pinned on SQLite).
- **Cross-record enforcement**: a recovery (`supersedes`) naming a signing
  predecessor with a tampered/missing signature refuses `supersedes-unverified`; a
  multi-leg successor whose prior-leg reference is a signature-broken signing record
  refuses `prior-leg-unverified`.
- **The layer does not apply where it should not**: a NON-signing profile's garbled
  sidecar entry (hand-inserted) changes nothing at any seam; an intact signing record
  passes every seam (the mint suite's happy paths, now under enforcement — the
  existing signing tests keep passing unchanged).
- **Unresolvable keyRef at a seam** fails closed (`chain-compromise`).
- **The reads stay reads**: `verifyChain` on a signature-broken signing record still
  reports `intact: true` (AL1's report, documented); `verifySignatures` reports the
  break; neither refuses.
- **Order**: the signature layer runs only after AL1 intactness (a hash-broken chain
  refuses identically with or without `config.signing` — no behavior change for the
  AL1 path, and the layer's verifier is never consulted on a hash-broken chain —
  pin via a counting verifier).

## 2. The record

- **Status doc**: step 8 row (AL2 increment 2 of 3 landed; freshness remains); the
  §14 row rewritten — enforcement real at the six sites, the failure mapping, the
  marker EXECUTED with the bundle enumeration, the rehoming residual in the limit
  column, authority timestamps still open; the §5 row's AL1 wording checked against
  the reads-stay-separate ruling; governed count UNCHANGED at 1 (stated).
- **Register row 17**: amended — AL2 enforcement landed; the tail now the AL2
  freshness increment (OQ §4) + the self-test tier (OQ §5).
- **CLAUDE.md / README**: AL2 enforced; the marker moved (the second sanctioned
  sealed edit class); nothing claims freshness lifted.
- **Sweep** (LAST, hit==verdict): the standing list plus `enforce`, `chain-compromise`,
  `signature`, `AL1 only`, `nothing enforces`, `refuses NOTHING`, `no enforcement`,
  `not enforced` (the mint's own absence vocabulary — lesson 21: THIS increment
  falsifies the mint's "nothing enforces" cells), `SKETCHED`, `named open decisions`,
  `granularity open`.

## What this does not claim

- **Authority timestamps and `freshness` remain unbuilt** — OQ §4's brainstorm gates
  the third increment; `consultation-stale`, `freshness`, and AL3 tokens stay.
- **The rehoming residual stands, named.** AL2 closes the recompute residual for a
  chain that keeps its signing genesis; it does not authenticate the genesis's
  profile CLAIM against rehoming onto a registered non-signing profile.
- The pure reads never gate; `review()` is untouched.
- No new codes, arguments, store or encoding changes; the decorator is untouched.

## Process

Subagent-driven development, standing lessons in force: the sealed task's brief
pastes full before/after lines and the controller word-diffs run by run (lesson 22);
a ruling that changes what a test proves sweeps the file header too (lesson 23); the
record task greps the MINT's absence vocabulary (lesson 21 — "nothing enforces" cells
falsify here); escape-free cited strings (lesson 20); counts with movement (governed
stays 1, said); RED executed; frozen surfaces absolute except the sanctioned bundle;
the final review checks the status doc against CODE.
