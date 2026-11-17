# The signing-obligation increment — design

**A post-build-order increment (no step). No sealed-set edit, no marker move, no new refusal
code, no change to `index.ts`, either manifest, or any public type. Behavior change: the AL2
signature obligation every verification site applies comes from the profile this instance
HOLDS for the record — the same `kernel/held-profile.ts` comparison every seam already makes —
and, where the instance does not hold it, from the chain's own evidence: a genesis transition
whose sidecar entry verifies. A same-id profile edit that ADDS `signing: true` now refuses
`unknown-profile`, never-append, at every operator seam, instead of writing a terminal
`chain-compromise` edge into untampered records. Sanction: none needed, and none claimed — §3
says why.**

**Status.** Taken on the owner's standing instruction of 2026-11-17 ("make your own
decisions"). Branch `signing-obligation-2026-11-17`, stacked on `identity-snapshot-2026-11-17`
(`1dde68b`). Not merged.

## 1. What this increment answers

An external analysis of the tree at `b2ea16b` reported, and reproduced on `MemoryStore` and on
a single `SqliteStore` redeployed in place, that **the obligation the seams enforce is read from
the live same-id profile, not the held one**:

- `layerVerdicts` (`kernel/verify-signatures.ts`) computes `signingDeclared` as
  `ctx.profiles.get(profileId)?.profile.signing === true` — the profile registered under the
  genesis id, with no comparison against the genesis `profileDigest`. `signatureLayerHolds`
  enforces the layer whenever that reads `true`.
- All seven verification sites consult the layer before profile resolution: rung (1) of
  `finalize`, `decline`, the findings seams, the redemption prologue and `seal`; and, right
  after AL1, `prior-legs` and `supersedes`. That order is what SPEC §4's exception names
  ("chain verification runs before profile resolution").
- So an instance holding `{ ...P, signing: true }` over a store whose records were opened under
  non-signing `P` reads every such record as a signing chain with no signatures. Each operator
  seam appends a terminal `refused { code: 'chain-compromise' }` edge — signed by the edited
  instance — to an untampered record: open records through `finalize`, `decline` and the
  findings seams; completed `confirmed` records through `seal`'s compromise carve-out;
  confirmed effect-seam records through the redemption seams, which can then never be
  redeemed. `supersedes` refuses a genuine declined predecessor. Restoring `P` exactly — the
  documented recovery — then meets `record-not-open`.
- The drop direction (`signing` removed in place) was closed by the profile-drift gate because
  a non-signing live profile reads `signingDeclared: false`, the layer passes, and resolution
  refuses `unknown-profile`. The add direction was never closed. The drift-gate design's §5
  ("`signingDeclared` is still computed from the live profile, but that computation no longer
  reaches a seam that could act on it") holds only for the drop direction.

What the record says. SPEC §4: an instance that does not hold the profile a record was opened
under refuses `unknown-profile` at every operator seam and "writes nothing into the record",
with one exception — a chain that is hash-broken or fails the signature layer draws its
`chain-compromise` edge from a drifted instance "as from any other", "in a signing chain the
break had already compromised". A never-signed record is not a signing chain, and an instance
that holds `P` passes it. OPEN-QUESTIONS §1 names this exact boundary ("a profile flipping
signing on with unsigned history behind it") and, as amended, decides it: `unknown-profile` at
every seam that resolves the record. The guide promises the same, and its own AL2 sample
writes the trigger: `profiles: [{ ...profile, signing: true }]`.

## 2. Goals, non-goals, anti-goals

**Goals.**

- The layer's obligation for an instance that holds the record's profile is that profile's
  `signing` — exactly today's behavior for every holder.
- For an instance that does not hold it (same id, different digest; id unregistered; genesis
  without a string id or binding), the obligation applies exactly when the chain itself shows
  it was signed from its genesis: the genesis transition carries a sidecar entry whose verifier
  accepts it. OPEN-QUESTIONS §1's record-homogeneity ("a record opened under a signing profile
  is signed whole from its genesis") is what makes the genesis the right witness.
- The add direction at all seven sites, on an untampered never-signed record: the five
  operator seams (`finalize`, `decline`, `raiseFinding`/`acknowledge`, `redeem`/
  `beginRedemption`/`completeRedemption`, `seal`) refuse `unknown-profile` with no edge; a
  successor leg's `open()` refuses `prior-leg-unverified` (the binding fold, as for every other
  drift); a `supersedes` claim over a terminal non-`confirmed` predecessor verifies (SPEC §2's
  recovery, which the record says works across a profile revision) and over a `confirmed` one
  refuses `supersedes-unverified` (the binding fold). Restoring `P` exactly then finalizes.
- SPEC §4's exception keeps its reach, and gains the drop direction: a drifted instance that
  holds the verifier for a signing record's genesis enforces the layer, so a later transition
  whose entry is missing or fails draws `chain-compromise` from it as from a holder.

**Non-goals.**

- **A forged predecessor under an unregistered or non-signing profile** still binds through
  `supersedes` for a terminal non-`confirmed` state, as today. Folding the binding for every
  predecessor state, and refusing an unheld predecessor, is the next increment's question — it
  reverses a recorded stance (the confirmed-only fold) and narrows recovery, so it gets its own
  argument.
- **Rehoming** — a storage-writing insider rewriting a signing record's genesis onto a
  co-registered non-signing profile with a consistent digest — is unchanged. Its closure needs
  an obligation anchored outside the chain (an instance-level policy), a design question of its
  own.
- `review()`'s findings coverage under the live profile — separate, low.
- The `verifySignatures` report: unchanged. `signingDeclared` keeps its meaning (the live
  profile's declaration, reporting only); `genesisProfile` keeps naming the drift.
- The signing decorator's decision (`isSigningProfile`, `create.ts`) — unchanged. After this
  increment no seam appends to a record whose profile the instance does not hold except the
  evidence edge SPEC §4's exception names.

**Anti-goals.**

- Any path on which an instance that does not hold a record's profile appends to an
  untampered record.
- Any weakening for a holder: a holder of a signing profile enforces exactly as before, and a
  holder of a non-signing profile still ignores the sidecar ("the layer does not overreach").
- Treating an unverified sidecar entry as evidence of a signing chain: the sidecar is
  insider-writable; only an entry the instance's own verifier accepts counts.

## 3. Constraints, and why no sanction is needed

- The change makes the code meet sealed text it diverges from today: SPEC §4 ("writes nothing
  into the record"; the exception scoped to "a signing chain") and OPEN-QUESTIONS §1 as amended
  (`unknown-profile` at every seam, for the add-signing boundary by name). CONTROLS' profile
  binding row states the same. No sealed-set edit.
- No new refusal code, no outcome-class change, no public type change.
- Recorded stances: the drift-gate design's §5 sentence is a claim this increment makes true,
  not a stance it reverses. The suite carries no pin of a drifted instance holding a verifier
  and refusing `unknown-profile` over a signature-broken signing chain (the drop-direction
  pins run without `config.signing`), so the gained detection of goal 4 inverts nothing. If the
  builder finds such a pin, it is argued at its site as the fifteenth inversion.
- SPEC §4's exception ("a chain that is hash-broken or fails the signature layer") has always
  been read as the layer *this instance* evaluates: today a drop-direction sibling never
  evaluates it at all, and the status record's own claim for the exception names hash-broken
  chains. This increment changes which evidence an instance that does not hold the profile
  evaluates the layer on — from its own live declaration to the chain's verified genesis,
  toward the sealed text's own scope, "a signing chain". One case narrows, named in 5.4: a
  same-id signing sibling (a ttl edit, say) over a signing record whose GENESIS entry is broken
  drew the edge before and refuses `unknown-profile` after; a holder still draws it. No pin
  covers that case.
- Ladder order: unchanged at every site — AL1, then the layer, then profile resolution.
- Public-surface discipline: the guide's sentences on the obligation and on enabling AL2 move
  in the same change (`docs/guide/integrating.md`, `docs/guide/api-reference.md`).

## 4. Approaches

1. **The held profile decides; otherwise the verified genesis decides (picked).** One rule in
   the shared correlation core; all seven sites inherit it; the holder's behavior is untouched;
   the exception keeps its detection for genuinely signing chains.
2. **The held profile only.** An instance that does not hold the profile never enforces the
   layer. Simplest, but it drops SPEC §4's exception for signing chains: today a ttl-edited
   signing sibling detects a broken layer, and it would stop. Not picked.
3. **Resolve the profile before the layer.** Reorder each seam. It contradicts the order SPEC
   §4's exception names and would stop a hash-broken chain from drawing its edge on a drifted
   instance. Not picked.
4. **Any sidecar entry marks a signing chain.** A sidecar-writing insider could plant a garbage
   entry on a non-signing record and make a drifted signing instance write `chain-compromise`
   into it. Not picked; ruling 5.1 counts only a verifying entry.

## 5. Rulings

**5.1 The rule.** In `layerVerdicts`, from the genesis payload's `profileId` and
`profileDigest` (each used only when it is a string): `held = heldProfile(ctx.profiles,
{ profileId, profileDigest })`. The obligation is `held.profile.signing === true` when `held`
is defined; otherwise it is whether the chain's first transition was reported `signed` and
`verified` by the same walk. `layerVerdicts` returns it alongside `signingDeclared`;
`signatureLayerHolds` enforces the layer exactly when it is true. No new sidecar read and no
second verifier call: the walk that already verifies every transition supplies the genesis
verdict.

**5.2 The report is unchanged.** `verifySignatures` keeps `signingDeclared` (computed from the
live profile) and `genesisProfile`. Its doc comments, and `signatureLayerHolds`', stop claiming
that the live reading cannot reach a seam and state the rule instead.

**5.3 No seam code moves.** The seven call sites keep their order and their arguments; only
the obligation inside the shared primitive changes.

**5.4 The honest bound.** An instance that does not hold a record's profile cannot tell a
never-signed record from a signing record whose genesis entry was removed, or whose genesis key
it no longer holds a verifier for, or whose genesis entry fails. It reads all three as carrying
no obligation, refuses `unknown-profile`, and appends nothing; a holder of the profile still
draws the edge. A planted or broken genesis entry is the ambiguous case — a tampered signing
chain, or garbage an insider wrote into a never-signed record's sidecar — and the rule takes the
write-nothing side of it. Stated in `kernel/verify-signatures.ts`, in the status record, and
pinned.

**5.5 Pins** (a new test file; the existing drift, signing and enforcement suites stay green
unchanged):

- the add direction at every site listed in goal 3, on `MemoryStore` shared by an opener
  holding `P` and a sibling holding `{ ...P, signing: true }` with a real Ed25519 tier: the
  outcome, an unchanged chain length at every operator seam, and the opener still finalizing
  afterwards;
- the same on one `SqliteStore` file redeployed in place (the opener closed, then the edited
  instance over the same file): `finalize` and `seal` refuse `unknown-profile` and the record's
  state is unchanged;
- the exception: a ttl-edited signing sibling, and a signing-dropped sibling that keeps the
  verifier, each draw `chain-compromise` (one edge) on a signing record with one later entry
  broken;
- the bound (5.4): with the genesis entry deleted, and separately with it broken, a ttl-edited
  signing sibling refuses `unknown-profile` with no edge while the holder refuses
  `chain-compromise`.

**5.6 Docs in the same change.** `docs/guide/integrating.md`: the AL2 bullet on losing
`signing` in place covers gaining it too, and one sentence after the AL2 sample says enabling
AL2 on a profile that already has records is a profile edit — give the signing version a new
id and keep the old one registered (the sample itself is unchanged, so it needs no re-run).
`docs/guide/api-reference.md`: the `signingDeclared` paragraph states that the seams apply the
held profile's obligation. The record: `CHANGELOG.md` `[Unreleased]`,
`docs/process/implementation-status.md` (this increment's section, naming the drift-gate
design §5 sentence it makes true and the 5.4 bound), `CLAUDE.md`'s measured counts, and
`docs/superpowers/INDEX.md`.

## 6. Left to the builder

Local names; the shape of the extra field `layerVerdicts` returns; test file name and layout;
the fixture used to break one later entry (the existing `breakOneSignature` helper or
`MemorySignatureStore.delete`).

## 7. Exit

Every repository gate green except `smoke`, which cannot run on the authoring machine and runs
in CI on the pull request. No existing assertion changes its truth value; the byte-stability
digests do not move.
