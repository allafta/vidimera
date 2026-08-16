# Policy-drift notarization — design

**Build-order step 6, second and last increment — and the increment that records step 6's
exit.** SPEC §10.3 whole: `policySource` lifts, `open()` binds the operator-attested
`policyDigest` into the genesis (present-iff-declared, fail-closed both directions and
LOUD), finalize's rung (4.5) compares the live digest against the record's bound one —
`policy-drift` (twentieth code) on mismatch, the availability outcome (its SECOND
producer) on an unreachable source — and the banked FAIL-CLOSE ruling decides §10.3's
named open question in code. The library notarizes the policy version; it never
evaluates policy. Step 6 then exits; step 7 (findings & acknowledgments, SPEC §10.2 —
the first draft-ahead marker that can move) becomes the next build-order step.

## Rulings taken, so they are not re-litigated

- **The slicing and order rulings stand** (step-6 brainstorm): this is the second
  half; eligibility landed first.
- **The cross-drift open decision is FAIL-CLOSE** (step-6 brainstorm, per §10.3's own
  "the recommendation on record is fail-close"): a record carrying a bound
  `policyDigest`, finalized under a same-id NON-declaring instance, refuses
  `policy-drift` — mismatch-shaped, a bound digest with nothing live to compare,
  mirroring the forward corner §10.3 itself fail-closes. Recorded as this build's
  DECISION of the named open question (the sealed set is untouched; the spec marks the
  question open and this build answers it), argued in place at the rung. The cost,
  stated: a host retiring a policy source must re-open old records rather than finalize
  them gate-free.
- **Presence is a caller contract at PROFILE RESOLUTION; shape is an intake check.**
  §10.3 fixes the presence throws "both at profile resolution — so a tampered chain
  still refuses `chain-compromise` first and an unconfigured profile `unknown-profile`
  first" — deliberately DIFFERENT from the consultations bag's intake-depth throw, and
  §10.3 argues the asymmetry (policy is a single mandatory environment fact with an
  explicit unreachable escape hatch; its absence is a host contract violation, not
  omitted evidence). A PRESENT `opts.policy`'s malformed shape, though, is a plain
  caller bug and throws at argument intake beside the consultations validation —
  whether it MAY be present is resolution-time; whether it is WELL-FORMED is not.
- **`policySource: ''` is a structural construction error** — the malformed-reference
  rule (the eligibility-label precedent, same rationale: an opaque reference that
  references nothing).
- **The guard lifts land WITH the gate, in one commit** — the standing atomicity
  discipline, all three seams together (construction lift, open's binding, finalize's
  rung): a declaring profile must never be constructible while any of its three
  obligations is missing.
- **Step 6 exits with this increment**, recorded in
  `docs/process/implementation-status.md` (spec-moves-to-truth has nothing to move —
  §10.3 is `[PROVEN]`).

---

## 1. The code (`refusal-codes.ts`)

`policy-drift` joins `RefusalCode` (twentieth member; count pins 19 → 20), class
`refusal` in `REGISTRY` — the default `appendsOn` path: §8's conditional table,
"`refusal`-class, `terminalRefusals`-able — a policy-declaring profile SHOULD list it
(disposal-and-re-open recovery)". The SHOULD is guidance the record carries, never a
construction validation rule (a host may legitimately leave it open-by-default and eat
the strand §10.3 describes — their configuration). Producer: finalize's rung (4.5), worded
two-touch if the plan lands the code first. `availability`'s §10.3-producer comments
(outcome.ts's variant doc; refusal-codes.ts; the matrix section) finalize to
present-tense in the commit that lands the rung.

## 2. Construction (`config.ts`)

- `validateProfile`'s `policySource` GOVERNED throw deletes. The governed count moves
  5 → 4 (`ackMode`, `requiredAcks`, `freshness` per-leg; `captureMode` profile-level),
  stated with the movement named.
- NEW structural rule beside the profile-level checks: `policySource` present but empty
  ⇒ structural error (the malformed-reference rationale, named in the message).
- No shape changes: `ConfirmProfile.policySource?: string` exists.

## 3. `open()` binds the digest (`kernel/open.ts`, `config.ts`)

- `OpenOptions` gains its second real key:

```ts
export interface OpenOptions {
  priorRecordRefs?: PriorRecordRef[];
  /** SPEC §10.3: the policy snapshot digest the OPERATOR attests at open() — bound into
   * the genesis, present-iff-declared. Never routed through the agent-reachable
   * stage(): "routing the drift baseline through the untrusted drafter would let a
   * lying agent bind whatever digest it anticipates the live source will hold". */
  policyDigest?: Digest;
  // `supersedes` (§2's recovery linkage) remains GOVERNED at the call seam — its build
  // step has not arrived.
}
```

- `openOptionMessage` loses its `policyDigest` arm; the opts loop passes the key
  through; `supersedes` and unknown keys keep throwing.
- After profile resolution, the presence contract — fail-closed BOTH directions and
  LOUD (§10.3: "a policy-declaring profile opened without a (non-empty) `policyDigest`,
  or a `policyDigest` supplied to a non-declaring profile, **throws** at `open()`"):

```ts
  // --- §10.3: the policy binding contract (second step-6 increment) --------------------
  // Fail-closed BOTH directions and loud — a caller/config error, never a refusal: the
  // operator is the only party who may attest the drift baseline, and an unbound
  // declaring record (or a bound non-declaring one) is a host contract violation.
  if (resolved.profile.policySource !== undefined) {
    if (opts?.policyDigest === undefined || opts.policyDigest.length === 0) {
      throw new Error(
        `open: profile '${staged.profileId}' declares policySource but no policyDigest was supplied — ` +
          'the operator binds the drift baseline at open(), fail-closed and loud (SPEC §10.3)',
      );
    }
  } else if (opts?.policyDigest !== undefined) {
    throw new Error(
      `open: profile '${staged.profileId}' declares no policySource but a policyDigest was supplied — ` +
        'binding a drift baseline on a non-declaring profile is a caller error (SPEC §10.3)',
    );
  }
```

  and the genesis payload gains the key present-iff-declared (the draft-ahead
  `OpenedPayload.policyDigest` and its replay fold have existed since the kernel — the
  producer arrives):

```ts
  if (resolved.profile.policySource !== undefined && opts?.policyDigest !== undefined) {
    openedPayload.policyDigest = opts.policyDigest;
  }
```

  (the existing "policyDigest: omitted — no policySource in this build" comment in the
  payload literal retires; the field joins the literal's optional keys like the
  prior-leg evidence pair). Non-declaring chains stay byte-identical; the frozen
  fixtures never declare.

## 4. `finalize()` — the shape check, the presence contract, and rung (4.5)

- `FinalizeOptions` gains its second key:

```ts
export type PolicyInput = { digest: Digest } | { unreachable: true; authority: string };
export interface FinalizeOptions {
  consultations?: ConsultationInput[];
  policy?: PolicyInput;
}
```

- **Shape at intake** (beside `validateConsultations`, before the chain loads): a
  PRESENT `opts.policy` must be exactly one of the two shapes — `{ digest }` with a
  non-empty string, or `{ unreachable: true, authority }` with a non-empty authority;
  unknown keys, both-shapes, neither-shape, or empty strings THROW as caller errors.
  `finalizeOptionMessage`'s `policy` arm retires (the key is real); unknown keys keep
  throwing.
- **Presence at profile resolution** (§10.3's fixed depth — after rung (1)'s
  chain-verify and the profile resolve, so `chain-compromise` and `unknown-profile`
  still win):

```ts
  // --- §10.3: the policy presence contract (second step-6 increment) -------------------
  // "On a policy-declaring profile, finalize throws when `opts.policy` is absent, and
  // on a non-declaring profile it throws when `opts.policy` is present" — deliberately
  // asymmetric with a missing required consultation (§10.3 argues it: policy is a
  // single mandatory environment fact with an explicit unreachable escape hatch, so its
  // absence is a host contract violation, not omitted evidence — and keeping absence
  // out of `policy-drift` leaves that code purely "the digests differ").
  if (resolved.profile.policySource !== undefined) {
    if (opts?.policy === undefined) {
      throw new Error(
        `finalize: profile '${record.profileId}' declares policySource but no opts.policy was supplied — ` +
          'the operator attests the live source (or its unreachability) at every finalize (SPEC §10.3)',
      );
    }
  } else if (opts?.policy !== undefined) {
    throw new Error(
      `finalize: profile '${record.profileId}' declares no policySource but opts.policy was supplied — ` +
        'a caller error (SPEC §10.3)',
    );
  }
```

  (The non-declaring throw is UNCONDITIONAL, exactly §10.3's sentence — bound record or
  not. The fail-close ruling's case arrives with `opts.policy` ABSENT, which is legal
  on a non-declaring profile, and falls through to rung 4.5's first arm.)
- **Rung (4.5)**, after (4) content-drift and before (5) facts (§9's ladder: "(4)
  content-drift → (4.5) policy-drift → (5) facts" — content integrity outranks the
  policy environment; policy outranks the evidence gates, "deciding under the wrong
  policy version moots the evidence"):

```ts
  // --- (4.5) policy drift (SPEC §10.3; second step-6 increment) ------------------------
  if (record.policyDigest !== undefined && resolved.profile.policySource === undefined) {
    // THE DECIDED OPEN QUESTION (§10.3 names it; the recommendation on record is
    // fail-close, and this build takes it): a record opened under a DECLARING profile,
    // finalized under a same-id non-declaring instance, does NOT skip the gate — a
    // bound digest with nothing live to compare is mismatch-shaped, the same
    // fail-closed reading §10.3 itself gives the forward corner. The config flip is a
    // version-discipline violation either way; profileDigest makes it auditable. Cost,
    // accepted: a host retiring a policy source re-opens old records.
    return refuseMaybeAppend(store, 'policy-drift', leg, chain, resolved, finalLeg, now);
  }
  if (resolved.profile.policySource !== undefined) {
    const policy = opts?.policy;
    if (policy === undefined) {
      throw new Error(
        'finalize: unreachable — the §10.3 presence contract above admits no absent policy on a declaring profile',
      );
    }
    if ('unreachable' in policy) {
      // §10.3: an { unreachable, authority } marker yields the availability outcome —
      // "bounded retry, never fail-open, never approval". The SECOND producer of the
      // unavailable status (§11.1's consultation gate was the first).
      return unavailable(policy.authority);
    }
    if (policy.digest !== record.policyDigest) {
      // Mismatch — including §10.3's fail-closed forward corner: a present live digest
      // against an ABSENT bound one (a record opened under a non-declaring same-id
      // instance) "as a mismatch", policy-drift, since the record is coherent evidence
      // of a real prior decision. Recovery is disposal + re-open, not retry (§10.3) — a
      // declaring profile SHOULD list policy-drift in terminalRefusals.
      return refuseMaybeAppend(store, 'policy-drift', leg, chain, resolved, finalLeg, now);
    }
  }
```

  (The `policy.digest !== record.policyDigest` comparison covers the forward corner
  because `record.policyDigest` may be `undefined` there — a string never equals
  `undefined`. The ladder header and `finalize-check-order.test.ts`'s rung count,
  adjacency claims, and order-pair corpus total ALL break at this commit and are fixed
  in this commit — the standing lesson.)

## 5. What the record carries honestly

- **The library notarizes; it never evaluates** — `policySource` is an opaque label,
  never fetched; the gate compares digests the operator attests. The head-bound window
  (§10.3's own AL1 analog of the SoD-evidence window): a single-leg record's bound
  `policyDigest` lives in the genesis (head) payload until the next append — a
  storage-writing insider edit defeats the gate inside that window; detached signing
  (AL2, §14) is the named closure. Recorded beside the guarantee.
- **Recovery guidance**: `policy-drift` mirrors `content-drift` (bound-vs-reality, no
  in-place recovery) — the SHOULD-list-terminal guidance and the strand argument
  recorded; `availability` is the transient case that DOES retry the same open record.
- **Multi-leg**: `policyDigest` is record-level (each leg's own `open()` binds); no
  cross-leg equality verified — as with cross-leg content, chained and auditable.

## 6. Tests

- **Count pins**: 19 → 20; the matrix gains `policy-drift` (`content-drift`-shape,
  with the SHOULD guidance quoted) and the availability section's §10.3 half goes
  present-tense.
- **Construction pins**: the GOVERNED inversion (a declaring profile constructs),
  argued in place (the EIGHTH self-authored inversion — the record task appends the
  boundary paragraph per the standing checklist); `policySource: ''` structural;
  still-GOVERNED pins (`ackMode`/`requiredAcks`/`freshness`) verified untouched.
- **`open()` binding pins**: declared + digest ⇒ the genesis payload key-set gains
  `policyDigest` (sorted pin) and `getRecord().policyDigest` folds (the draft-ahead
  fold's first exercise); declared + absent ⇒ throw; declared + `''` ⇒ throw;
  non-declaring + supplied ⇒ throw; the non-declaring genesis key-set unchanged.
- **Finalize contract pins**: declaring + absent `opts.policy` ⇒ throw — AND the depth
  pin: a TAMPERED declaring-profile record + absent policy refuses `chain-compromise`
  (the §10.3-fixed ordering, the contract sits after rung (1)); non-declaring +
  supplied + unbound record ⇒ throw; malformed shapes (`{}`, both-shapes, empty digest,
  empty authority, unknown key) ⇒ intake throws.
- **Rung (4.5) pins**: match ⇒ confirmed; mismatch ⇒ `policy-drift` open-by-default
  (no append) and the `terminalRefusals: ['policy-drift']` variant appends the terminal
  edge with payload `{ code }` and releases the pair (the disposal-and-re-open flow's
  first half); unreachable ⇒ the availability outcome with the attested authority, no
  append, and the re-arm retry with a matching digest confirms.
- **Order pins**: (4) outranks (4.5) — drifted content + drifted policy ⇒
  `content-drift` ("a drifted draft refuses `content-drift` even under a drifted
  policy"); (4.5) outranks (5.5) — drifted policy + a missing required consultation ⇒
  `policy-drift` ("deciding under the wrong policy version moots the evidence").
- **The cross-instance pins**: forward — a record opened under a NON-declaring same-id
  instance, finalized under a declaring one with `{ digest }` ⇒ `policy-drift`
  (fail-closed, §10.3's own corner); reverse — THE DECIDED-OPEN-QUESTION PIN: a record
  opened under a DECLARING instance, finalized under a same-id non-declaring one (no
  `opts.policy` — legal there) ⇒ `policy-drift`, the fail-close ruling executing.
- **Frozen surfaces**: untouched — the frozen fixtures never declare `policySource`,
  and the non-declaring key-set pin is the byte proof.

## 7. The record — step 6 exits

- **Status doc**: steps table → step 6 **Exited** (both increments named: eligibility;
  policy drift) — step 7 (findings & acknowledgments, SPEC §10.2, where the FIRST
  draft-ahead maturity marker — §10.2's [DESIGNED] — could finally move) named next.
  §10.3 row: WHOLE — the binding contract, the presence asymmetry argued, rung (4.5),
  both cross-instance corners with THE DECIDED OPEN QUESTION recorded as this build's
  answer (fail-close, the recommendation on record; the sealed set untouched; the cost
  stated), the head-bound window, the SHOULD guidance, multi-leg record-level binding.
  §8 row: twenty codes; `availability`'s two producers both real. §9 row: the (4.5)
  rung real; `open()`'s options bag at two real keys (`supersedes` alone still
  guarded). Governed count 5 → 4 with the movement named; **the EIGHTH-inversion
  boundary paragraph appended and every superseded count tail amended forward-pointer
  style** (the standing checklist from the previous increment's lesson).
- **CLAUDE.md / README**: step 6 exited (two increments); four governed fields with
  movement; "two of the eight build-order steps remain unstarted" SURVIVES (step 6
  moves started→exited — verify and keep). README: same; step 7 named next.
- **Register**: no rows expected to move (verify by reading).
- **Comment truth**: sweep patterns per the standing list plus `policy-drift`,
  `policySource`, `policyDigest`, `opts.policy`, `second step-6`, ladder tokens
  (`(4.5)`, the rung count, the order-pair corpus total), the OLD shapes'
  literal text (`(4) content-drift → (5) facts` adjacency claims; outcome.ts's and
  refusal-codes.ts's "§10.3 ... future/later" phrasings; `policyDigest: omitted`;
  `no policySource in this build`; `nineteen`; `five governed`; "down to five, where it
  stands today" — the superseded-tail pattern); hit-count == verdict-count, the sweep
  run LAST against the committed tree.
- No maturity marker moves; `docs/concept/` untouched.

## What this does not claim

- **The library never fetches or evaluates policy** — it notarizes an operator-attested
  digest and compares strings; whether the live source was honestly read stays the
  operator's, the same honest bound every gate carries.
- **The head-bound window is open at AL1** (named, recorded); detached signing is the
  upgrade, a later build step.
- **`supersedes` stays guarded** (§2's recovery, step 8's ground); `ackMode`/
  `requiredAcks` are step 7's; `freshness` stays [SKETCHED]-gated.
- Step 7 unstarted; no maturity marker moves in THIS increment (step 7 is where §10.2's
  [DESIGNED] first could).

## Process

Subagent-driven development, standing lessons in force: the guard lifts land with all
three seam obligations in one commit; plan-authored comments truthful at the commit
that lands them; counts stated with the movement named; the record task appends the
inversion-boundary paragraph and amends superseded count tails; the sweep runs LAST,
once, against the exact committed tree, greps old shapes' literal text, and shows
hit-count == verdict-count; a mandated RED run is executed or its substitution stated;
no new rung on a tx-carrying seam without an enlisted-branch decision (`finalize()` and
`open()` take no `tx` — nothing to decide, stated); the final review checks the status
doc against CODE; no new runtime APIs — the floor stays `>=22.16`.
