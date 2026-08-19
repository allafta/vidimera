# The pre-0.1 API review — register row 6, completed

**Date: 2026-08-19.** This is the completed review deferral-register row 6 deferred to the
0.1 cut: the pass "over the whole public surface — **every** name
`packages/record/src/index.ts` re-exports, values and types alike, read as the vocabulary
an adopter has to learn." Every ruling below was taken by the repository owner in the
2026-08-19 phase-1 session; the review's scope was the file's own export list at review
time, per the row's own rule. With this record and the changes it describes landed, **row 6
is retired** — the register carries the numbering gap, per its own header.

The session ran after the sealed-set sanction pass
(`docs/analysis/2026-08-19-sealed-set-sanction.md`), by the ordering the phase-0 record
fixed: the `replay`/`verifyChain` export question below and the SPEC §5 ruling there are
the same question seen from two sides.

## The rulings

1. **Entry-point shape: root + `./probes`.** The root `.` entry carries everything runtime,
   the signing tier included (it mirrors the stores already there). `./probes` is the one
   subpath — not newly decided but confirmed: OPEN-QUESTIONS §5's own "Decided (this
   build)" tail already rules the probes tier ships as "a public library subpath". The
   subpath becomes importable when the `exports` map lands (publish tooling, register
   row 1); until then the workspace deep import stands, documented as temporary.

2. **The no-unspellable-names rule.** Every type a public signature names is exported —
   a host can annotate any field and type any wrapper without reaching past the entry
   point. Applied transitively: signature-reachable directly (`OpenOptions`,
   `FinalizeOptions`, `ConsultationInput`, `ObtainedConsultation`, `UnreachableMarker`,
   `PolicyInput`, `PriorRecordRef`, `FindingInput`, `AckInput`, `SignatureReport` — the
   `SignatureReport`/`ChainVerifyReport` asymmetry the register row flagged, resolved in
   the export direction) and reachable through exported record-model fields
   (`RecordedPriorLegRef`, `RecordedFinding`, `RecordedAck`, `SupersedesRef`).
   `createWithClock` stays internal — it appears in no public signature, and its absence
   was already a decision of record.

3. **The pure audit functions export.** `replay(chain)` and `verifyChain(chain)` — which
   exist in source exactly as SPEC §5 writes them — export from the root beside their
   operator-handle forms, for the offline-audit case: an archived chain (a sealed
   record's, say) replays and verifies with no store and no handle.

4. **The redemption triad is ratified.** `redeem` / `beginRedemption` /
   `completeRedemption` stay — this build's own names, mirroring SPEC §11.2's
   direct-vs-token distinction, documented and test-pinned.

5. **OPEN-QUESTIONS §6 is ratified for 0.1.** `unknown-staged`/`unknown-record` stay loud
   caller-error throws — "the caller-error posture is the decision of record". Minting
   stays additive if a real host ever hits the process-boundary case §6 hypothesizes.

6. **Store instability marking stays words, placed well.** The "PUBLIC BUT EXPLICITLY
   UNSTABLE PRE-1.0" doc comments on `Store`/`MemoryStore`/`SqliteStore` ship in the
   declarations (IDEs surface them); the api-reference and the eventual 0.1 release notes
   mirror them. No mechanism beyond words — the signature freeze itself is
   OPEN-QUESTIONS §9's declared 1.0 gate, untouched here.

7. **`terminalRefusals` validates at construction.** A member that is not a registry
   refusal code throws — the footgun the step-8 exit record flagged (an unrecognized
   member constructed silently and never matched, so a leg the operator believed terminal
   was not), closed under SPEC §9.1's own sentence: "inert or contradictory feature
   combinations are construction errors". The two legal-but-inert registry members SPEC §8
   itself names (`leg-expired`, `availability`) stay constructible — their inertness is
   at-the-seam semantics, pinned in `refusal-matrix.test.ts`, not a misspelling.

8. **`Surfaces` names the handle pair.** `create()`'s return shape — previously an
   anonymous `{ agent, operator }` — is the exported `Surfaces` interface, in the set's
   own capability-surface vocabulary.

## The name-by-name pass

All 28 names exported at review time were read as adopter vocabulary and **ratified
unchanged**: `create`, `canonicalize`, `digest`, `MemoryStore`, `SqliteStore` (values);
`AgentSurface`, `OperatorSurface`, `Config`, `ConfirmProfile`, `LegSpec`, `Canonicalizer`,
`DigestAlgorithm`, `ChainVerifyReport`, `Outcome`, `RefusalCode`, `Store`, `AppendMeta`,
`AppendResult`, `BatchResult`, `Consultation`, `DecisionRecord`, `Digest`,
`IdentityAssertion`, `RecordState`, `ReviewView`, `StagedDraft`, `Transition`,
`TransitionKind` (types). The genuine defects were the asymmetries, which rulings 2 and 3
resolve; no rename survived scrutiny as more than taste.

Measured after the rulings landed (2026-08-19, a dated count — re-read `index.ts` rather
than trusting it): 52 exported names — 9 values, 43 types.

## What landed with this review

- `index.ts`: the ruling-2/3 exports, the signing tier, `Surfaces`, and an updated header
  stating the `./probes` decision and where it lands.
- `create.ts`: the exported `Surfaces` interface; both factories' return types name it.
- `config.ts`: the `terminalRefusals` registry check in `validateLeg`, message stating the
  footgun it closes.
- `test/public-surface.test.ts` (new): pins the value exports at runtime and the type
  exports through the typecheck gate; `test/construction-validation.test.ts` gains the
  `terminalRefusals` throw-and-still-constructs pair.
- `docs/guide/api-reference.md` and `docs/guide/integrating.md` moved in the same change,
  per the repository rule; the register, `docs/process/implementation-status.md`,
  `docs/process/next-phases.md`, and `CLAUDE.md` synchronized.

## What this review deliberately did not do

No behavior beyond the construction validation changed; no store signature moved (a 1.0
gate); no exports map exists yet (register row 1 — the `./probes` subpath and the
published `@vidimera/record` form both land there); and nothing in `docs/concept/` was
touched — the one sealed-set interaction (SPEC §5's exposure wording) was handled by the
sanction pass that preceded this session, under its own authority.
