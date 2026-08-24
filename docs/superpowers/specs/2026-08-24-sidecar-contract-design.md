# Sidecar contract — design

**Date: 2026-08-24.** **A maintenance increment. No sanction is needed and none is sought.**
Nothing in `docs/concept/` moves, no maturity marker moves, and no capability is promoted. No
interface gains or loses a member: `SignatureStore` keeps `put` and `listByRecord` exactly as
they are. What changes is what the contract SAYS, and two readers that do not obey what it
already says.

**The permitted edit envelope, stated as a STOP.** One `packages/*/src/` behavior change:
`packages/record/src/probes/probes.ts`. One `packages/*/src/` comment change:
`packages/record/src/signing/store.ts`. One test helper: `packages/record/test/helpers/signing.ts`,
plus its call sites. Two guide documents. **Any other `src/` edit is a STOP.**

**This increment is SECOND of three and depends on the row-22 truth repairs having landed**
(`docs/superpowers/specs/2026-08-24-row-22-truth-repairs-design.md`). That increment creates
`docs/analysis/2026-08-24-no-edge-containment-investigation.md`, which this design cites in the
present tense, and it indexes its own pair in `docs/superpowers/INDEX.md`. It also writes the three
present-tense sentences describing the two reader defects as open findings — the sentences this
increment must repair when it closes them.

**Why this lands BEFORE the no-edge containment increment.** That increment closes row 22's
redundant-signing half and leaves 22a — one orphan sidecar entry per refusing call — open, because
every measured containment for it predicts the backing's answer from a chain that failed
verification. So orphans are not a transient state this repository is about to eliminate; they are
a standing property of a signing deployment. The contract that governs the surface where they
accumulate should say so before another increment reasons about them, and the two readers that
would misbehave in their presence should stop doing so first.

**The register delta: none.** This increment opens no row and retires none. Row 22 is untouched;
the two reader defects are findings in their own right, recorded in
`docs/analysis/2026-08-24-no-edge-containment-investigation.md`, and they are closed here rather
than deferred, so neither needs a trigger.

## The gap, stated from the code

`packages/record/src/signing/store.ts:33-34` already tells a caller how to read the sidecar: "All
entries for a record, chain order not guaranteed — the caller correlates by transitionDigest
(chain-driven, never sidecar-driven)." Two things are wrong around that sentence. It does not
tell an IMPLEMENTER that entries with no chain counterpart will exist. And two readers in this
repository — one of them in production source — do exactly what it forbids.

| # | Site | Says / does | What is true instead |
|---|---|---|---|
| 1 | `packages/record/src/signing/store.ts:24-36`, the `SignatureStore` interface doc | states the correlation rule for CALLERS, and nothing about what an IMPLEMENTER must tolerate | A conforming sidecar will hold entries for transitions that never landed. The decorator signs BEFORE delegating, so a lost CAS leaves an orphan — argued as harmless at `signing/decorate.ts` and true, but only for the two kernel readers. Deferral-register row 22 measures six consecutive refusing `finalize()` calls against one sealed signing record taking the sidecar from 5 entries to 11 — one orphan per call on a record whose state admits no CAS candidate — and reasons, rather than measures, that nothing bounds the accumulation on a record whose chain can never grow again. Nothing in the contract prepares an implementer for that, and 22a is not being closed |
| 2 | `docs/guide/api-reference.md:465-468`, which quotes the interface verbatim with the comment `// upsert by transitionDigest` | reproduces the shape and the upsert rule | Reproduces neither of the source's two bounds — not "chain order not guaranteed", not "chain-driven, never sidecar-driven" — and says nothing about orphans. A host implementing `SignatureStore` from the guide alone learns neither the ordering freedom it has nor the correlation obligation its callers assume |
| 3 | `docs/guide/integrating.md:487` and the "What you get, with its limits in the same breath" list at `:492-507` | `signatures: mySignatureStore, // { put(entry), listByRecord(recordId) } — the sidecar`, then four limit bullets | The bullet list is the document's own graduated-honesty register and carries no orphan bullet. A host wiring a durable sidecar here is told signatures live beside the chain and never told the store will accumulate entries the chain does not reference, nor that it may prune them safely |
| 4 | `packages/record/src/probes/probes.ts:862-866` — the `signature-tamper-refuses` operator-assurance probe | `const entries = await config.signing.signatures.listByRecord(recordId); const victim = entries[0];` | Sidecar-driven, the exact idiom `signing/store.ts:34` forbids, in PRODUCTION source. Measured: under an orphan-first `listByRecord` ordering — which `:33` explicitly permits — the probe tampers an orphan, the real signatures stay intact, and it returns a FAIL against a sound build. The operator-assurance tier reporting a false failure is the one outcome that tier exists to not produce |
| 5 | `packages/record/test/helpers/signing.ts:107-108` — the corpus's shared `breakOneSignature` | the same `listByRecord` / `entries[0]` idiom | Under the same ordering it tampers the orphan while BOTH its guard assertions pass — the entry exists, and the tamper changed its bytes — so the fixture proves nothing and the test goes green. Fourteen call sites across `signing-enforce.test.ts` and `redeem.test.ts` depend on it |

**Both reader defects are LATENT, not live, and the increment says so rather than dramatising.**
`MemorySignatureStore` iterates a `Map` in insertion order, so today the first entry is the genesis
and both readers happen to pick a real transition. Nothing pins that. The contract permits any
order, a durable backing supplying `listByRecord` from a SQL query with no `ORDER BY` would be
conforming and arbitrary, and row 22 guarantees orphans are there to be picked.

## Rulings taken (at the 2026-08-24 brainstorm), so they are not re-litigated

1. **The contract states an obligation, not a mechanism.** `SignatureStore` gains no `remove`
   method and no pruning hook. Implementers are told that orphans exist, that they are safe to
   prune when no chain transition references them, and that a sidecar which cannot grow unboundedly
   must provide its own reconciliation — because the library has no way to tell it which entries
   are dead. Adding a `remove` to the interface was measured to be dangerous in a different shape
   (compensating removal, rejected in the no-edge containment design) and is not what this
   increment does.

2. **The guide moves in the same change as the source — as a decision, not as an obligation
   misread.** `CLAUDE.md`'s same-change rule fires on "a change to the public surface
   (`packages/record/src/index.ts` or either surface interface)", and no interface member moves
   here, so the rule does NOT compel this. It is chosen anyway: `docs/guide/api-reference.md`
   quotes the interface verbatim and would otherwise reproduce a contract that no longer matches
   its source, and the guide is derived from source, so where they disagree the guide is stale.
   Recording it as a choice matters, because a later reader who checks the rule will find it does
   not apply and should not conclude the increment misunderstood it.

3. **The probe is made genuinely chain-driven, not merely deterministic.** It already builds
   `handles`, so `handles.operator.verifySignatures(recordId)` is available — a chain-driven read
   by construction, reporting per-transition `transitionDigest` and `signed`. The probe picks a
   digest from THAT and then looks it up in the sidecar. Correlation in the direction the contract
   names, using a read the file already has.

4. **The test helper is made chain-driven too, at the cost of a third parameter and fourteen
   mechanical call-site edits.** The cheaper alternative — pick the entry with the lowest `seq`,
   since an orphan minted by the compromise append always carries `chain.length + 1` and therefore
   a HIGHER seq than any landed transition — is correct today and is rejected anyway. It is an
   unstated dependence on a property of one append path, which is precisely the class of thing this
   whole line of work exists to stop writing down as if it were guaranteed. A fixture whose job is
   to prove it tampered a real signature must be able to prove it.

5. **`signingSetup` stays byte-identical, and the proof method is a SUBSTITUTE that is stated
   rather than inherited.** The AL2 signature-enforcement coverage increment froze it and proved
   the freeze over the whole file. This increment edits that file — `breakOneSignature` is a
   different export in it and is not frozen — so a whole-file diff cannot serve. The substitute is
   a hash over `signingSetup`'s own extracted text, taken before and after. Say so at the site: a
   narrower proof than the precedent's, chosen because the precedent's is unavailable, not because
   it is better.

6. **Neither reader defect gets a register row.** Both are closed here. A register row requires a
   trigger, and nothing is being postponed.

7. **This increment does not close 22a and must not appear to.** The contract sentence makes orphan
   growth a declared obligation on the implementer who will actually hit it. That is containment by
   honest delegation, not containment by prevention, and the record says which.

## What lands

- `packages/record/src/signing/store.ts` — the `SignatureStore` doc gains the tolerate-and-prune
  obligation, beside the correlation rule it already states.
- `packages/record/src/probes/probes.ts` — `signature-tamper-refuses` correlates through
  `verifySignatures` before touching the sidecar.
- `packages/record/test/helpers/signing.ts` — `breakOneSignature` gains a chain source and
  correlates through it; its doc comment gains the reason.
- Fourteen call sites in `packages/record/test/signing-enforce.test.ts` and
  `packages/record/test/redeem.test.ts`.
- New pins: an orphan-first `listByRecord` ordering under which the probe must still PASS and the
  helper must still tamper a real entry. Both fail before the fix — that is the point of writing
  them first.
- `docs/guide/api-reference.md` and `docs/guide/integrating.md`.

## Coverage this adds, stated with its limit

The two readers stop depending on an ordering the contract does not promise, and the contract
starts telling implementers what they will actually receive.

**The limits, stated in the same breath:**

- **Latent, not live.** No real flow was found that reaches an orphan for the probe's own record:
  `open()` mints a fresh identifier per probe run, and the probe's own refusal appends rather than
  orphaning. The new pins inject the ordering the contract permits; they do not demonstrate a
  deployment that produces it. Host `ProbeDriver` shapes were not exhaustively enumerated, and a
  driver returning a shared durable sidecar was not modelled.
- **22a is untouched.** Orphan accumulation continues at one entry per refusing call.
- **The contract sentence is unenforced, and nothing can enforce it.** No gate in this repository
  reads a host's `SignatureStore` implementation. It is an obligation stated in a doc comment and
  in the guide, which is the only place it can live.
- **FIVE positional sidecar reads exist in this repository, and the census is over this repository,
  not over hosts.** They are `packages/record/src/probes/probes.ts`, `packages/record/test/helpers/signing.ts`,
  `packages/record/test/signing.test.ts`, and TWO more in `packages/record/test/signing-enforce.test.ts`
  — its missing-entry fixture and its unresolvable-keyRef fixture, both in a file this increment
  already opens for its call-site edits. **The two corrected here are the two that fail QUIETLY**
  under an adverse ordering: the probe reports a false FAIL against a sound build, and the helper's
  fixture goes green while proving nothing. The other three fail LOUDLY — a deleted, re-keyed or
  trailing-tampered orphan leaves every real signature intact, so the seam assertion each carries
  fails outright. A loud fixture failure is a different hazard class from a false
  operator-assurance verdict, which is why they are left rather than folded in. Verify each site's
  line number at implementation time; they are named by file here on purpose. A host is free to read
  the sidecar however it likes; the contract now tells it not to.

## Risk, and how it is held

- **Fourteen mechanical call-site edits are where a silent mistake hides.** They compile-check, so
  a wrong argument is caught — but passing the WRONG rig's store (`a.store` where `b.signatures` is
  meant) type-checks fine and would tamper the wrong record. The pins that catch it are the
  existing tests: each already asserts a specific seam refuses, and a mis-paired store makes the
  break land on a record the assertion does not name. Run the full record project after the batch,
  not after each edit, and read the failures rather than the count.
- **`docs/guide/api-reference.md` is gated for PRESENCE only.** `pnpm api-sync` checks that every
  exported name occurs in the guide; it never checks that a quoted interface matches its source. A
  wrong quote here has no gate behind it and must be diffed against the source by hand.
- **Markdown is not citation-checked at all**, so every quoted phrase written into the guide or
  into this pair must be hand-verified against a whitespace-collapsed copy of its source.
- **The contract scan runs over every line of a tracked TypeScript file, comments included.** The
  new comments must avoid the bare word that names a design document, the bare word for a work
  slice, and task-numbering forms.
- **The probe runs in an operator's CI against an operator's driver.** A change that makes it throw
  rather than return a verdict would be worse than the defect it fixes. `verifySignatures` reports
  and never throws on a verification failure, but it does throw on the caller-error and
  unknown-record class every read takes — the probe must reach it with a record it has just
  created, which it does, and the plan must not move that call above the record's creation.

## What stays outside, and why

- **Closing 22a.** No candidate exists that does not predict the backing's answer from an untrusted
  chain. Row 22 stays open for it.
- **A `remove` or prune method on `SignatureStore`.** Ruling 1. The obligation is stated; the
  mechanism stays the implementer's.
- **The no-edge containment increment's own work** — the signer-result memo and the candidate
  narrowing. Separate cluster, lands next.
- **`signing.test.ts`'s own trailing-four-character break variant**, deliberately not folded into
  the shared helper by the increment that extracted it. It has the same sidecar-driven shape; it is
  named here so the next author knows it was seen, and left because folding it in is the
  three-near-duplicate-helpers question that increment already declined.
- **The stale intra-repo pointer in `packages/record/src/store/memory.ts`**, which cites
  `kernel/open.ts` at two line numbers that have moved — the real sites are the two genesis appends
  of the C1 expire-then-retry. Named here with its shape so the next author does not re-derive it;
  `contract-scan`'s citation resolver checks `SPEC §N` and `DECISIONS.md #N` only, never intra-repo
  file:line pointers, so nothing catches it.

## Exit

The increment exits when: the ordering-injection pins exist and are shown failing before the fix;
`signature-tamper-refuses` correlates through `verifySignatures` and passes under an orphan-first
ordering; `breakOneSignature` correlates through a chain source, all fourteen call sites pass it,
and the full record project is green; `signingSetup` is proved byte-identical by hash rather than
by inspection; the `SignatureStore` doc carries the tolerate-and-prune obligation and both guide
documents carry it too, with the interface quote diffed against its source by hand; the increment's
section is written in `docs/process/implementation-status.md`; `docs/superpowers/INDEX.md` gains this pair's row and both
of its counts move in the same commit as the `git add`; and `pnpm test`, `pnpm typecheck`,
`pnpm lint`, `pnpm contract-scan`, `pnpm api-sync` and `pnpm docs-index-sync` are green with the
new figures measured at exit rather than carried forward. The `implementation-status.md` edit is
proposed explicitly in the PR description rather than slipped in.
