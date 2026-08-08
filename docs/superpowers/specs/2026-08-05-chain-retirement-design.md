# Chain retirement (`seal` / `retired`) — design

**Build-order step 2, second increment.** The first landed SPEC §12's atomic `appendBatch`, the
`meta = { nonTerminal, dueAt? }` object, and `listDue`. This one builds the other half of what
`docs/concept/SCOPING-GUIDE.md` §7 calls step 2's "full contract": **seal-finality**.

## Why this piece now

§7 justified putting step 2 ahead of more features with one reason — *"every later feature
rides `appendBatch` untouched, which is what keeps the store diff-empty from here on."* That
reason is discharged: `appendBatch` landed. What remains of step 2 is valuable but no longer
blocking in the same way, so the choice among its remaining pieces is a judgement rather than a
sequencing constraint.

`seal()` is the largest coherent piece left, the only one that adds user-visible capability,
and the last store-shaped work before SQL adapters force a change in dependency and packaging
posture. It also closes deferral register row 14 by building it, and turns §13's end-of-life
story from entirely-unbuilt into shipped.

## A correction this increment carries

**The Store is 7 of 8, not 7 of 9.** SPEC states no method count anywhere; the nine was ours,
introduced during the original whole-branch review and carried unchallenged through the step-1
remediation, five task reviews and a whole-branch review.

§12 gives signatures to eight methods: `putStaged`, `getStaged`, `appendTransition`,
`appendBatch`, `readChain`, `chainHead`, `findNonTerminal`, `listDue`. `seal` is **not** among
them — §9 lists `seal()` as **operator-only**, alongside `open()`, `review()`, `finalize()`,
`redeem()` "and the sweep — §12". §12 describes it in the storage section because C4 lives
there, the same reason it describes the operator sweep there.

So `findNonTerminal` is the only absent Store method, and **this increment adds no Store method
at all**: `seal()` is a library seam that verifies, then appends through the existing
`appendTransition`, and C4 is a constraint the store enforces on later appends.

## Scope

**In:** C4 seal-finality in the store; the `seal()` operator seam; `unsealable-state`;
`replay`'s `sealed` arm; the derived `status: 'active' | 'retired'` on `DecisionRecord`; the
record-keeping, including the count correction.

**Out:** `findNonTerminal`, `tx?`, SQL adapters, the conformance suite, the cross-backing
byte-identity test, the operator sweep. Each is named again under "What this does not claim".

**Deliberately not here:** extracting the gate ladder out of `finalize.ts`. `seal()` adds no
rung to that ladder — it is its own seam — so the pressure that makes the extraction worth
doing does not increase here. It remains a real problem for steps 3-6 and a different cluster.

---

## 1. C4 in the store

`StoredRecord` gains one field, maintained incrementally exactly as `state` and `nonTerminal`
already are:

```ts
  sealed: boolean;   // C4: set when a `sealed` transition lands; never cleared
```

`appendGenesis` initialises it `false`. Nothing ever clears it.

### The bar

In `appendSubsequent`, immediately after the existing compare-and-swap check:

```ts
    // C4 seal-finality (SPEC §12): after a `sealed` transition, NO further append of any
    // kind is admitted — not even a `compromise` refusal edge, because a sealed record's
    // body may be archived or destroyed as a unit and nothing may extend a chain whose
    // evidence may be gone. C4 rejects through the same terminal-state-mismatch path as C3
    // (SPEC §12: "no separate conflict shape"), so a racing or duplicate seal loses
    // deterministically and the seam maps the residual to `unsealable-state`.
    if (existing.sealed) {
      return { appended: false, conflict: 'state-mismatch' };
    }
```

Placement after the CAS keeps the diff minimal and is behaviourally immaterial: a sealed record
with a mismatched CAS target fails the CAS first, and both paths return the same shape.

In `appendBatch` it is an **entry-level** failure, which §12 states outright — *"Entry-level
failures — an entry compare-and-swap mismatch or C4 seal-finality — report element index 0."*
So it sits with the entry CAS and returns `index: 0`.

### Setting the flag

The store sets `sealed` when it sees `transition.kind === 'sealed'`, in the mutation step,
beside the existing `stateOf(transition.kind)` call. `appendBatch` does the same for any
element of that kind.

This brushes against a load-bearing rule and the reasoning belongs at the site. §12 says the
store persists `meta`'s flags **verbatim** and "never recomputes them" — but that sentence is
about `nonTerminal` and `dueAt`, the two *library-derived* flags. Seal-finality is one of §12's
**"Constraints an adapter MUST provide"** (C1-C4), and constraints are the store's own work: C1
scans records, C2 computes `max+1`, C3 already switches on the transition's kind. Deriving
sealed-ness from the kind is that same move. The alternative — adding `sealed` to `AppendMeta`
— would break the §12 shape the previous increment established exactly.

### A consequence worth naming

This makes `kernel/finalize.ts`'s existing `appendChainCompromise` fallback non-vacuous. It
already walks candidate compare-and-swap targets and falls back to a ref-less refusal when none
is admitted — but against a sealed record that fallback cannot fire today, because nothing bars
the append. After C4 it can, which is what SPEC §5 requires.

---

## 2. The seam

A new `packages/record/src/kernel/seal.ts`. Operator-only (§9), wired through `create.ts` onto
the operator handle; the agent handle stays frozen and untouched.

```ts
seal(recordId: string): Promise<Outcome<{ recordId: string; status: 'retired'; transitionRef: Digest }>>
```

### The gate ladder

```
load chain → empty ⇒ THROW (unknown recordId is a caller error, §8 — finalize's posture)
(1) chain-verify           → break ⇒ chain-compromise, edge where admitted
(2) resolve profile        → unknown-profile (fail-closed, mirrors finalize)
(3) already sealed?        → unsealable-state
(4) derived-terminal?      → if not ⇒ unsealable-state
(5) append `sealed`        → not appended ⇒ unsealable-state
                           → appended ⇒ ok({ recordId, status: 'retired', transitionRef })
```

**(1) is first, and it outranks everything.** §5: *"Verification is first: a record whose chain
fails verification refuses `chain-compromise` and can never be sealed."* That includes an
already-sealed record, which then refuses `chain-compromise` result-first with no edge, because
C4 admits nothing. It is the only place the two new mechanisms interact, and it gets its own
test.

**On a detected break, `seal()` reuses `appendChainCompromise`.** For seal's targets that is
already correct: §12's C3 carve-out admits the edge against a terminal `confirmed`, and nothing
is admitted against terminal `expired`/`refused`, which is exactly §5's rule that no edge is
admitted there and the compromise surfaces result-first with no transition reference.

**(3) before (4) is a readability choice, not a behavioural one.** Both map to
`unsealable-state`, so the order is unobservable in the outcome. It needs stating because a
sealed record is *still* derived-terminal — sealing preserves state — so gate (4) would pass
and gate (3) would catch it either way.

**Derived-terminal** means `!nonTerminal(record.state, isFinalLeg, effectSeam)`, which is why
gate (2) resolves the profile first. In this build that admits `expired`, `refused`, and a
capture-only final-leg `confirmed`; it excludes `open` and an effect-seam final-leg `confirmed`
(non-terminal, awaiting redemption).

### The transition

```ts
    kind: 'sealed',
    payload: { chainHead: headDigest },
    prevHash: headDigest,
```

`payload.chainHead` equals `prevHash`. That is not duplication: §4's payload table and §5 both
require the payload to carry the chain head, because after the body is archived or destroyed
the sealed transition must stand alone as evidence — §5's *"`sealed` chain head standing in for
replayable body evidence"*. The site says so, or a later reader removes it.

`meta.nonTerminal` comes from the `nonTerminal()` helper rather than a hardcoded `false` — gate
(4) guarantees it computes to `false`, and computing it keeps the honesty habit the rest of the
kernel follows. `dueAt` is omitted, so sealing also clears any pending clock; a retired record
must never be swept.

### The en-passant omission

§4: *"`seal()` never appends a clock edge en passant — a record whose bound has elapsed refuses
`unsealable-state`, and the operator sweeps first, then seals."*

In this build that falls out for free — a due-but-still-`open` record is non-terminal, so gate
(4) refuses it. But `seal.ts` must **not** call `expireIfDue`, and the reason belongs in a
comment: `open()` and `finalize()` both do call it, so the next reader will otherwise add it by
analogy and quietly break a stated rule. It gets a test that asserts the chain is byte-identical
afterward.

### The registry

`unsealable-state` joins the `RefusalCode` union, `CORE` as `'refusal'`, and `NEVER_APPENDS`
(§8 lists it among the codes that never append). `appendsOn` must return `false` for it. That
takes the build from ten of §8's eleven core codes to **eleven of eleven**.

---

## 3. The record model

`replay` currently **throws** on `sealed` via its default arm. It gains:

```ts
      case 'sealed': {
        // State-PRESERVING (§4's delta payload; §5's chain retirement): sealing never moves
        // `state` — a sealed `confirmed` record is still `confirmed`. What it changes is the
        // per-record status §5 reports as `retired` rather than `active`.
        record.status = 'retired';
        break;
      }
```

`DecisionRecord` gains one derived field, seeded `'active'`:

```ts
  status: 'active' | 'retired';
```

Derived by `replay` from the chain — never stored, never a caller input, the same discipline
`state` already follows.

**Its doc comment must carry the divergence.** §2's field table names `state` and **no status**;
§5 and §12 both require a sealed record to report `retired`. The field exists because §5/§12
demand it, and the gap in §2's own table is recorded as a finding rather than assumed away.

It goes on `DecisionRecord` only, **not** `ReviewView` — a retired record is precisely one no
longer under review, so the review projection is the wrong home.

This is a public type change (`DecisionRecord` is exported), but nothing constructs one — it is
`replay`'s output — so no caller breaks.

---

## 4. Testing

### The oracle

The four byte-stability digest literals must not move: a feature-free finalize chain contains no
`sealed` transition, so nothing in the pinned minimal chain changes. **A moved digest is a
stop-and-halt, never a literal to update.**

### C4, at the store

The sharpest test is the one §12 names: *"not even a `compromise` refusal edge."* That edge is
exactly what C3's carve-out **would** admit against a terminal `confirmed` record, so it is the
one case where C4 has to override a rule that otherwise says yes.

Alongside it: any subsequent append barred with the chain unchanged; `appendBatch` against a
sealed record rejected at `index: 0` with nothing applied; and the `sealed` append itself
admitted against a terminal record, since `stateOf('sealed')` is null so `isStateLeaving` is
false and C3 never fires on it.

### The seam

Happy path through to `getRecord().status === 'retired'`. Non-terminal → `unsealable-state`.
Double-seal → `unsealable-state`. Tampered chain in both shapes: terminal `confirmed` yields an
edge and a `transitionRef`; terminal `refused`/`expired` yields neither.

Three tests earn their place beyond coverage:

- **Tampered *and* already sealed** → `chain-compromise`, no edge. The only place the two new
  mechanisms meet, and it pins that verification outranks `unsealable-state`.
- **A due-but-open record** → `unsealable-state` **and the chain byte-identical afterward**.
  That is what proves the en-passant omission is deliberate rather than forgotten.
- **An effect-seam `confirmed` record** → `unsealable-state`. This converts deferral row 9's
  most-corrected claim — that `seal()` is not a release path for the held `(profile, subject)`
  pair — from prose that was twice written wrongly into a pinned assertion.

### Order tests

Adjacent-pair order tests per the standing discipline, with the derivation written out the way
`finalize-check-order.test.ts` does it. (1)→(3) and (1)→(4) are constructible. (2)→(3) likely is
not — an unconfigured profile is defensive-only here, exactly as finalize's own derivation
records for its (5)→(6) pair — and the comment should say so rather than leave a reader counting.

### Gates

Unchanged, all five: `pnpm typecheck` · `pnpm lint` ·
`npx biome check --error-on-warnings .` · `pnpm test` (zero skips) ·
`node scripts/contract-scan.mjs`. **Diff the scan output, never compare totals.**

---

## 5. The record

**Deferral row 14 retires** — C4 seal-finality is its entire subject. It is the first row this
project retires by *building* the thing rather than by reclassifying it.

**Row 13 is rewritten** with the count correction above: 7 of 8, `findNonTerminal` the only
absent method, `tx?` the only surviving signature divergence, and `listDue`'s recordIds
narrowing unchanged.

**The correction must sweep, and the sweep is driven by a command, not by a list.** This
project's recurring failure — three times on the previous branch — is fixing a claim downstream
and leaving it standing at its origin; its sibling is enumerating sites by hand and missing
some. Both apply here, so:

```
git grep -ln "of 9\|of the 9\|nine methods" -- docs/
```

Measured at design time that returns **six** documents, in three classes:

| Class | Documents | Treatment |
|---|---|---|
| **Live** | `docs/process/deferral-register.md` (row 13), `docs/process/implementation-status.md` (**four** sites: the steps table, the §12 row, the named boundary heading, the still-outstanding list) | Correct in place |
| **Origin, dated** | `docs/analysis/2026-08-03-step-1-review.md` | Append a labelled `**Correction:**` in that document's own convention — it appends and never rewrites, and it is where the count entered |
| **Completed** | the step-1 remediation plan, the atomic-batch plan, the atomic-batch design | Leave as history |

Re-run the grep afterward and confirm the only survivors are the historical class. Do not trust
the table above over the command — Task ordering may move a site.

**Exit record updates**, all false in the same direction after this increment:

- **§5** — chain retirement is no longer "entirely absent".
- **§8** — eleven of eleven core codes; `unsealable-state` leaves the not-built column.
- **§12** — C4 built; the 7-of-8 correction.
- **§13** — the `active`/`retired` distinction exists, so §13's specified end-of-life state is
  no longer absent.
- **§2** — the new `status` field and its divergence from §2's table.
- **Steps at a glance** — step 2 stays **"Started, not exited"**. `findNonTerminal`, `tx?`,
  adapters, the conformance suite and the cross-backing test all remain.

**Row 9 is untouched but changes character**: its most-corrected claim becomes a passing test
rather than prose.

## What this does not claim

- `findNonTerminal` remains absent, so a `record-exists` refusal still carries no locator for
  the record blocking it. The Store is 7 of 8.
- `tx?` remains absent; row 13 survives.
- **No SQL adapter, no conformance suite, no cross-backing byte-identity test.** So
  `CONTROLS.md`'s KERNEL exclusivity bound — *"Holds only under a conforming Store adapter…
  the conformance suite is the proof"* — still points at a proof this repository does not have.
- §13's actual retention duties — pseudonymisation, retention periods, the purpose-limitation
  guard — remain host duties. `seal()` makes lawful disposal *possible*; it does not perform it,
  and the library never touches the body.
- The operator sweep is still not built; `listDue` still has no kernel caller.
- The package remains unconsumable: `private`, `0.0.0`, no `exports`/`types`, no build, `noEmit`.
- **No maturity marker moves.** `CONTROLS.md` already marks Sealing/retirement `PROVEN`, and
  `docs/process/implementation-status.md` is where this increment is recorded.

## Process

Subagent-driven development, as run through the previous increment — fresh implementer per
task, adversarial review with fix rounds, halt discipline, red-first tests, byte-stability as an
oracle. Three lessons from that increment are worth carrying, because each cost a review round:

1. **Where a task says "every X", the brief must name the command that finds them** — a
   hand-assembled list of call sites was wrong twice.
2. **Do not write a pointer to a record without opening it.** A comment claiming something is
   "recorded in the deferral register" shipped false once.
3. **Check prose claims against whitespace-collapsed sources.** A phrase that wraps a line break
   is present in the source and invisible to `grep -F`; that produced two false results.
