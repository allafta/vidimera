# Operator intake — design

**Date: 2026-11-20.** A post-build-order increment, no build-order step. No sealed-set edit, no
maturity marker, no new export. It changes what the operator seams accept, and what the read
methods on both handles accept as an id. The subject-and-content intake increment handled the
agent seam. This one handles the rest.

## 1. What this closes

The operator seams trust the shape of what the host passes:

- **Host digest fields are checked only for being a non-empty string.** That covers four
  intakes: a consultation's `payloadDigest`, finalize's `policy.digest`, raiseFinding and
  acknowledge's `findingDigest`, and the redemption seams' `result.digest`. `open()`'s
  `policyDigest` is not even type-checked: a number, an array or `true` is bound into the
  genesis as given. So values that are not SPEC §7 digests (`<algorithm>:<lowercase-hex>`) are
  recorded verbatim in signature-covered payloads.
- **`observedAt` intake accepts impossible calendar instants.** The regex admits
  `2026-02-30T00:00:00Z`, which `Date.parse` silently moves to 2 March. The freshness gate
  then judges an instant the recorded string does not name.
- **A `null` options bag throws a raw `TypeError`** at `finalize`, `decline` and `open`.
  Separately, the storage-fault message for a single append says "the batch is all-or-nothing",
  but there was no batch.
- **`RedeemOptions.tx` is never inspected.** `tx: null`, which `tx?: unknown` allows, counts as
  enlisted. On refusal paths it suppresses the compromise, clock and drift evidence edges an
  un-enlisted call would append. The success path then throws at the store.
- **`open()` does not shape-check `priorRecordRefs`,** although it does shape-check
  `supersedes` and `proposed`. No seam type-checks an id argument either. The same malformed
  id is a domain refusal or caller error on `MemoryStore` but a raw `node:sqlite` `TypeError`
  on `SqliteStore`.
- **Operator strings reach the chain unchecked for well-formedness.** These are identities,
  consultation kinds, finding fields and labels. A lone surrogate in one becomes a non-RFC 8785
  escape in a transition, so a compliant second implementation cannot reproduce that
  transition's digest. The subject-and-content intake closed this for agent input only.

**Requirements broken:**

- SPEC §7: every digest field is `<algorithm>:<lowercase-hex>`.
- SPEC §3: serialization is RFC 8785.
- SPEC §11.1: `observedAt` is an authority-claimed time. The code's own contract is RFC 3339.
- The repository's caller-error posture: a malformed call meets a named message and appends
  nothing, the same way on every backing.

## 2. The design

All of these are caller errors. Each throws a named message with the seam's head
(`finalize: …`) before any chain is read, any lock is taken or anything is appended. No refusal
code is minted; that would be a sealed SPEC §8 edit.

- **Id arguments.** Every seam and read that takes a `recordId` or `stagedRef` requires a
  string:
  - `open`, `finalize`, `decline`, `raiseFinding`, `acknowledge`, `redeem`,
    `beginRedemption`, `completeRedemption`, `seal`, `review` and `verifySignatures`;
  - `getRecord`, `readChain`, `chainHead`, `replay` and `verifyChain`, on whichever handles
    carry them.

  An empty or unknown string keeps today's answer: `null`, an empty chain, or the seam's
  existing domain outcome. Only a non-string throws. The check is one shared helper.
- **Options bags.**
  - `open`, `finalize`, `decline` and the redemption seams accept an absent options bag, an
    explicit `undefined`, or a plain object.
  - `null`, or any other non-object, throws `<seam>: options must be an object when supplied`.
  - The single-append storage-fault message drops "the batch"; the batch message keeps it.
- **`tx`.** When the key is present and not `undefined`, it must be an object or a function. A
  driver's transaction handle is never a primitive, so `null` and the other primitives throw.
  - **Limit, stated:** a non-enlistable object still passes intake. On a refusal path it still
    counts as enlisted and suppresses the evidence edge, and the success path still throws at
    the store. Only the store can judge enlistability, and asking it would mean a new Store
    method.
- **`priorRecordRefs`.**
  - It is an array.
  - Each entry is a plain `{ recordId, chainHead }`. The shape is exact, unknown keys throw,
    and both fields are non-empty strings. These are `supersedes`'s rules, applied per entry.
  - It is read once into the options snapshot (the staged-integrity increment).
- **Host digest fields.** Each must match SPEC §7's form:
  - an algorithm name of lowercase letters, digits or hyphens, starting with a letter;
  - then `:`;
  - then a non-empty, even-length run of lowercase hex.

  This applies to `payloadDigest`, `policy.digest`, `findingDigest`, `result.digest` and
  `open()`'s `policyDigest` (which also gains its missing type check). It also applies to the
  `chainHead` of each `supersedes` and `priorRecordRefs` entry, which today fails only at
  verification. The helper lives in `canonical.ts`, and it accepts any algorithm name. See the
  first ruling below.
- **`observedAt`.**
  - Beyond the regex and `Date.parse`, the date-time's fields must name a real instant:
    - month 1–12, and day within the month (leap years by the Gregorian rule);
    - hour ≤ 23 and minute ≤ 59;
    - offset hour ≤ 23 and offset minute ≤ 59.
  - Second 60 already fails `Date.parse`.
- **Operator strings, well-formed at intake.** At each seam's intake, before anything is
  appended, every string the seam will record from its inputs must be well-formed UTF-16:
  - the acting identity (`principal`, `authority`, `proofRef`);
  - each obtained consultation (`kind`, `checker`, `proofRef`, `observedAt`);
  - each unreachable marker (`kind`, `authority`);
  - `policy`'s `authority`;
  - the finding and acknowledgement fields.

  An ill-formed one throws (`<seam>: <field> holds a lone surrogate`).
  - **`identitySnapshot` itself does not change.** Finalize reads persisted prior actors
    through it, and the read path stays as it was. That is the subject-and-content intake's
    ruling.

## 3. Rulings

- **The form, not an algorithm list.** SPEC §7 fixes the form of every digest field and says
  the algorithm for *new records* is `sha256`, which is the library's own behaviour. A host
  digests its own evidence, and the library never re-verifies a host digest. Requiring
  `sha256` there would refuse a host whose evidence system uses another algorithm, for no
  check the library makes. Requiring the form closes the letter of §7 without that cost.
  - **Limit, stated:** a form-valid string is still the host's claim. Nothing checks it
    digests anything.
- **Caller errors throw, the same on every backing.** A non-string id now throws a named
  error before any store call. Before, it was a domain refusal on `MemoryStore` and a raw
  driver `TypeError` on `SqliteStore`.
- **`null` is not "absent" for an options bag.** TypeScript excludes it, and treating it as
  absent would hide a host bug. The message says what to pass.
- **Write-path strings only.** Well-formedness is checked where an operator string enters the
  write path. A persisted string, read back through `identitySnapshot` or a replay, is never
  re-judged.
- **Upgrade consequence, stated.**
  - Host code passing a non-form digest, a `null` options bag, `tx: null` or an ill-formed
    string now throws where it used to record or behave oddly.
  - Records already bound with such values keep them, since nothing re-reads a host digest
    for form.
  - The guide's "bound verbatim" sentence for `policyDigest` is corrected.

## 4. Pins

Red first against the base where behaviour differs.

- **`packages/record/test/operator-intake.test.ts`** (new):
  - **Non-string ids.** Every seam and read listed in §2 throws a named error for `42`, `{}`
    and `null`, on both `MemoryStore` and `SqliteStore`, with nothing appended. An empty or
    unknown string keeps today's answer.
  - **Options bags.** `null` throws a named error at each options-taking seam.
  - **`tx`.** `null`, `false` and `'x'` throw at each redemption seam, before any edge.
  - **`priorRecordRefs`.** A non-array, a non-object entry, an unknown key, and an empty
    `recordId` or `chainHead` each throw.
  - **Digest fields.** Each digest field refuses `'NOT A DIGEST'`, `'sha256:ABC'` (uppercase),
    `'sha256:abc'` (odd length), `5` and `''`. It accepts `sha256:<64 hex>` and
    `sha512:<128 hex>`.
  - **`observedAt`.** It refuses 30 February, 31 April, 29 February in a non-leap year, hour
    24 and offset `+24:00`, and accepts 29 February 2028.
  - **Ill-formed strings.** A lone surrogate in each operator string field listed in §2
    throws at intake and appends nothing.
  - **Read path.** A planted persisted prior-actor identity with a lone surrogate behaves
    exactly as it did before.
- **Existing tests.**
  - No existing assertion changes; an assertion that must change is an inversion, argued at
    its pin.
  - An existing test that feeds a non-form placeholder digest whose subject is unrelated to
    digest form may have its input made form-valid. Each such test is listed in the status
    record. A test pinning the old leniency is an inversion.
  - The byte-stability and byte-regression suites pass untouched. Their digests are already
    form-valid.

## 5. Docs and records

- **`docs/guide/integrating.md` and `api-reference.md`:**
  - the digest form;
  - `policyDigest` is no longer "bound verbatim";
  - `observedAt` validity;
  - id and options-bag shapes;
  - `tx`;
  - well-formed operator strings.
- **`CHANGELOG.md`.**
- **The status record's section,** the fortieth post-build-order increment.
- **`next-phases.md`:** operator intake marked done.
- **`CLAUDE.md`'s counts.**
- **No external review IDs anywhere.**
