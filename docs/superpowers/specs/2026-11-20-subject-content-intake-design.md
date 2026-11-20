# Subject and content intake — design

**Date: 2026-11-20.** A post-build-order increment, no build-order step. No sealed-set edit, no
maturity marker, no new export. It changes what `stage()` and the content-binding seams accept,
and what the exported `canonicalize` and `digest` accept.

## 1. What this closes

The agent's one free-form input and the content-binding path took whatever arrived:

- **`stage()` never checks `subjectRef`.** The agent surface is untrusted and often fed from
  JSON tool calls, yet SPEC §2 types the field as a string and nothing enforces it.
  - A number and its string (`42`, `"42"`) are two subjects on `MemoryStore` and on file-backed
    `SqliteStore`. Both open, both confirm and both redeem, so C1 exclusivity splits for one
    real subject.
  - An object subject with a stateful `toJSON` can redirect another stager's draft.
  - A deeply nested object leaves a `MemoryStore` record that `listDue` returns forever and
    that the guide's sweep aborts on.
  - A string containing U+0000 opens on `MemoryStore` and `SqliteStore`, but `PostgresStore`
    throws a raw driver error, as it does in a concurrent race for a split pair.
  - A lone surrogate is collapsed to U+FFFD by `SqliteStore` and kept by `MemoryStore`.
  - A subject of unbounded length is written as given.
- **A canonicalizer's output is serialized whatever it is.**
  - An `async` canonicalizer, whose output is a Promise, serializes as `{}`, so every record
    under that profile binds the same content digest and content drift can never fire.
  - The Promise's rejection is never observed. Agent-chosen content can make it reject, and
    Node's default unhandled-rejection policy then terminates the host process. That happens
    after `stage()` has persisted a draft bound to `digest({})`.
  - A canonicalizer that is only sometimes async yields a false terminal `content-drift`.
  - A `Map`, a `Set`, or a class holding only `#private` state serializes as `{}` too.
- **Lone surrogates break RFC 8785.** RFC 8785 §3.2.2.2 says they MUST make a compliant
  serializer fail. `serializeJcs` instead emits a `\udXXX` escape, and `digest(string)`
  collapses each one to U+FFFD, so two different strings digest the same.

**Requirements broken:**

- SPEC §2: `subjectRef` is a string.
- SPEC §3: serialization is RFC 8785, so two implementations agree byte for byte.
- SPEC §12 C1: one live record per (profile, subject), on every backing.
- The guide's canonicalizer rules ("JSON-safe", "Total").

## 2. The design

**`subjectRef` intake at `stage()`.** Before anything else, `stage()` requires `subjectRef` to
be:

- a string;
- non-empty;
- well-formed UTF-16 (no lone surrogate);
- free of U+0000;
- at most 1,024 bytes in UTF-8.

Anything else throws `stage: subjectRef …`, naming the rule it broke. This is a caller error,
in the same posture as `open()`'s unknown `stagedRef`. There is no refusal code for it, and
minting one would be a sealed SPEC §8 edit.

- **The cap** is the store-relevant measure. It keeps the C1 index entry, (profile id,
  subject), well inside what every reference backing indexes. A host whose natural key is
  longer digests it into one.
- **The same check at `open()`.** `open()` applies it to the draft it resolves and to a
  `proposed` draft. A draft that fails it throws, as a staged-integrity mismatch does. Such a
  draft was persisted before this build or written by someone other than `stage()`.

**One content-binding helper.** The six sites that bind content today each compute
`digest(canonicalize(canonicalizer(content)))`: `stage`, `finalize`, `decline` and the three
redemption seams. They now call one helper in `canonical.ts`, which does three things in order:

1. **Calls the canonicalizer.**
2. **Refuses a thenable.** If the output is an object or function with a callable `then`, the
   helper, when the output is a native promise, first attaches a rejection handler, so a later
   rejection is observed and cannot terminate the process; any other thenable is refused without
   its `then` being called, so a lazy one is never run. It then throws `canonicalizer for '<ref>' returned a thenable — a
   canonicalizer is synchronous`.
3. **Serializes and digests.** It serializes the output in `serializeJcs`'s strict mode where
   the caller asks for it (only `stage()` does; see the amendment in §3), then digests the bytes. Strict mode is an internal option. Every string it writes
   (any key, any value, and any string a `toJSON` returns) must be well-formed, or it throws.
   The public `canonicalize` and the transition encoding stay in the default mode.

A throw from the helper takes the path a throwing canonicalizer takes today: a configuration
fault that propagates, writes no draft and appends nothing. It is never read as
`content-drift`.

**`serializeJcs` refuses objects that have no JSON form.** A value that is not an array, does
not carry a callable `toJSON`, and is not a plain object throws. A plain object is one whose
prototype is `Object.prototype`, `null`, or another realm's `Object.prototype`. The throw names
the constructor. It covers:

- `Map`, `Set` and Promises;
- class instances, including those holding only `#private` state;
- boxed primitives, which used to serialize as `{"0":"a"}` and now throw.

`toJSON` stays honored, so a `Date` is still its ISO string. The three reference backings
return plain data, so no persisted chain read through them is affected; a custom `Store` must
keep that contract (return plain data, never class instances), or `verifyChain` would throw on
its payloads. One caller-data path changes visibly: a
`facts.figures` entry holding a `Map` used to digest as `{}` and now refuses
`consultation-missing`, the documented answer for non-canonicalizable figures.

**`digest(string)` refuses an ill-formed string,** instead of collapsing each lone surrogate to
U+FFFD.

## 3. Rulings

- **Strict at intake, not at read.** `serializeJcs` keeps escaping lone surrogates, so
  `canonicalize` on persisted data behaves exactly as before. If it threw instead:
  - a record that legitimately carries a lone surrogate (an agent subject staged before this
    build) would become a chain that cannot be verified;
  - every verifying seam on it would throw, or worse, refuse `chain-compromise` on an
    untampered record;
  - a tampered transition carrying one would make `verifyChain` throw instead of reporting a
    break.

  So new subjects and new content cannot carry an ill-formed string, and the read path stays
  as it was.
  - **The remaining gap, stated:** other strings that enter transitions (identities,
    consultation kinds, finding fields, labels) are operator inputs. They still reach the
    chain unchecked until the operator-intake increment.
- **Non-plain objects throw everywhere in `serializeJcs`.** Unlike lone surrogates, the
  three reference backings never return one, so the general rule costs the read path nothing; a
  custom `Store` that materialized payloads as class instances would now make `verifyChain`
  throw, so returning plain data is the contract a custom `Store` must keep. It is the library's own
  rule: every input with no JCS representation throws.
- **The thenable handler is attached to a native top-level promise only.** A non-native
  thenable is refused without calling its `then`, and a Promise nested deeper is refused by
  `serializeJcs`; in both cases a rejection of its own stays the host's. Observing it would mean
  walking host objects and calling `then` on them.
- **A `null` `legId` at `stage()` still means the first leg,** as `??` reads it. JSON tool
  calls send `null` for an omitted field, and that reading is the friendly one. A non-string
  `legId` or `profileId` already fails closed with `unknown-leg` or `unknown-profile`.
- **Upgrade consequences, stated, not migrated:**
  - A record whose content was bound through a void canonicalizer (async, a `Map`, a `Set`, a
    `#private`-only class: output that serialized as `{}`) cannot re-bind under this build. Its
    seams throw a configuration fault until the canonicalizer is fixed, and a fixed canonicalizer
    digests differently, which refuses `content-drift`. Drive these to a terminal state first.
  - A record bound through a non-plain output that carried content (a class instance with public
    fields, a boxed primitive, a typed array) re-binds exactly if the canonicalizer returns a
    plain object with the same own enumerable fields (`{ ...instance }`, or the numbered-key
    object); those records need not be driven to a terminal state.
  - A record bound by an older build from content holding a lone surrogate re-binds as before at
    the five re-bind seams (see the amendment below). New content holding one throws at
    `stage()`; a host that wants such agent-sourced content accepted makes the strings
    well-formed in its canonicalizer (`String.prototype.toWellFormed()`, Node 20 or later).
  - A staged draft or open record whose subject breaks the new rule throws at `open()` (the
    draft), or binds as before (an open record, whose `subjectRef` is never re-checked).
  - Drive such records to a terminal state before upgrading.
- **Amended after the whole-branch review: strict at stage, default at re-bind and read.** The
  strict well-formed serialization is applied at `stage()` only. `bindContent` keeps the thenable
  refusal and the plain-object rule at all six sites, but takes an explicit `wellFormed` option,
  true only at `stage()`; `finalize`, `decline`, `redeem`, `beginRedemption` and
  `completeRedemption` re-bind in the default (escaping) mode. Why: `stage()` guarantees that
  every new binding is well-formed, and the escape is injective, so a re-bind only compares. A
  record bound by an older build from content holding a lone surrogate therefore re-binds exactly
  as before, instead of being stranded while it holds its C1 slot; and an ill-formed value
  introduced between `stage()` and a later seam is recorded as `content-drift` (finalize and
  decline refuse it; the redemption seams map the correspondence mismatch per their own rule,
  `effect-mismatch`, or `content-drift` on a `reverify` profile) instead of an unrecorded
  throw. The limit: the escape is the default serializer's, so two different ill-formed strings
  never collide, but a host that changes content to an ill-formed form after staging sees drift,
  not an error. A serializer throw is also wrapped to name the canonicalizer and keeps the
  original as `cause`.
- **Not in this increment:**
  - **A staged-draft prune.** It would be a new Store method on SPEC §12's staged-draft
    surface, a sealed edit, so it is recorded as needing the owner's sanction.
  - **Operator-seam intake:** digest-field formats, `observedAt` calendar validity, a `null`
    options bag, `RedeemOptions.tx`, the shape of `priorRecordRefs`, id-argument types, and
    well-formedness of operator strings. That is the next increment.

## 4. Pins

Red first against `38ed58e` where the old behaviour differs.

- **`subjectRef`** (`packages/record/test/subject-intake.test.ts`, new):
  - each bad subject throws at `stage()` and writes no draft: `42`, `{}`, an object with
    `toJSON`, `''`, a lone surrogate, U+0000, and 1,025 UTF-8 bytes;
  - a subject at exactly 1,024 bytes, including multi-byte characters, stages and opens;
  - `42` and `"42"` can no longer yield two live records;
  - `open()` throws on a planted draft whose subject breaks the rule.
  - **Backings.** Each runs on `MemoryStore` and `SqliteStore`. The PostgresStore leg (a NUL
    subject and a 1,024-byte multi-byte subject) goes in the store-postgres suite.
- **Content** (`packages/record/test/content-intake.test.ts`, new):
  - an `async` canonicalizer throws at `stage()` and writes no draft;
  - its rejection is observed: no `unhandledRejection` fires;
  - the same at `finalize`, `decline` and each redemption seam, appending nothing;
  - canonicalizer output holding a `Map`, a `Set`, a `#private` class or a boxed primitive
    throws at `stage()`;
  - output holding a lone surrogate, in a key or a value, throws at `stage()`; at the five
    re-bind seams the same content refuses (`content-drift` at finalize and decline,
    `effect-mismatch` at the redemption seams on a profile without `reverify`), and a record
    staged by an older build over such content finalizes `ok`.
- **Serializer** (`jcs.test.ts`, additions):
  - `serializeJcs` refuses `Map`, `Set`, a Promise, a class instance and `new String('a')`;
  - it accepts a null-prototype object and a `Date` (via `toJSON`);
  - it still escapes a lone surrogate (the read path, pinned so the ruling is visible);
  - `digest` refuses an ill-formed string.
- **No existing assertion changes.** The byte-stability and byte-regression suites pass
  untouched.

## 5. Docs and records

- **`docs/guide/integrating.md`:**
  - the canonicalizer rules: "JSON-safe" is now enforced for thenables, non-plain objects and
    ill-formed strings;
  - the `stage()` and subject passages: the `subjectRef` rule and the 1,024-byte cap;
  - the upgrade consequences.
- **`docs/guide/api-reference.md`:** `stage`, `canonicalize` and `digest`.
- **`CHANGELOG.md`:** Changed, and Fixed.
- **`docs/process/next-phases.md`:**
  - the staged-draft prune, added to the sanction-gated list;
  - the operator-intake increment, as the next item.
- **The status record's section, and the measured counts.**
- **No finding IDs** from any external review anywhere: not in files, test titles or commit
  messages.
