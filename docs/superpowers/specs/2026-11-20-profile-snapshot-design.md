# Profile snapshot — design

**Date: 2026-11-20.** A post-build-order increment, no build-order step. No sealed-set edit, no
maturity marker, no new export. It changes what `create()` accepts: some profiles that
construct today will throw, each for a reason stated below.

## 1. What this closes

`create()` validates each profile the host passes, digests it, and then keeps the host's own
object. Every seam reads that object live, through ordinary property access. Three gaps follow
from that:

- **Validation is not total.** It checks presence and length, not type or shape:
  - a misspelled or extra key constructs with the intended control silently off (`SoD`,
    `sigining`, `requiredConsultation`);
  - a non-string `proposer` never fires the SoD bar;
  - a non-object `redeem` turns the profile into an effect seam;
  - a `Set` where a list belongs skips the consultation gate;
  - a bound past the `Date` range throws `RangeError` at the first seam that stamps it;
  - a `terminalRefusals` member the leg can never produce constructs inert.
- **Validation and digest read different things.** The digest projects own enumerable data
  properties; validation and the seams read through `[[Get]]`. A class with getters, or an
  object built with `Object.create`, is enforced but not digested, so the drift gate misses
  edits, including dropping `signing`.
- **Mutation after `create()` changes the rules.** Mutating the profile object changes what
  every seam enforces, bypassing validation and the drift gate. The cached digest stays as it
  was, so `verifySignatures` still reports `matches`.

**Requirements broken.**

- SPEC §9.1: "a profile the build cannot honor throws", and inert or contradictory feature
  combinations are construction errors.
- SPEC §4: `profileDigest` notarizes the configured fields.
- The guide says the drift gate refuses an in-place edit (`docs/guide/integrating.md`,
  `concepts.md`).

## 2. The design

**One snapshot per profile, read once, at `create()`.** A new internal module,
`packages/record/src/profile-snapshot.ts`, turns each host profile into a fresh, deeply frozen
plain-data copy. Validation and the digest then run on the snapshot, and the kernel keeps only
the snapshot:

- `ResolvedProfile.profile` is the frozen snapshot;
- `ResolvedProfile.profileDigest` is `profileDigest(snapshot)`;
- the host's object is never retained.

Mutating it after `create()` changes nothing.

**Plain data only.** Every object in a profile must be one of:

- a plain object, whose prototype is `Object.prototype` or `null` and is not an array;
- an array, whose prototype is `Array.prototype`.

Within those objects, every own string-keyed property must be an enumerable data property. An
array may carry only its elements (indices `0..length-1`, no holes) and `length`. Anything else
throws a named `invalid profile` error that says what was found:

- a class instance;
- an object built with `Object.create(proto)`;
- an accessor;
- a non-enumerable property;
- a `Set` or `Map`;
- a sparse array;
- a `Proxy`, refused wherever it sits.

Symbol-keyed properties are ignored, as the digest and the kernel ignore them. The precedent is
`create()`'s own `config.signing.verifiers` rule (a plain object, its prototype
`Object.prototype` or `null`). The snapshot reads each property's descriptor once, and
everything downstream reads only that copy. A `Proxy` is refused (`types.isProxy` from
`node:util`, checked before any other question is asked of the object, so no trap runs): its
reads can disagree from one read to the next, so no copy of it could be known to equal what the
digest projection reads, and the invariant below then has no exception. The limit: `isProxy` is
a Node API, and so is the library (it already imports `node:crypto`).

**The schema.** The snapshot knows SPEC §9.1's field table, nested:

- **profile:** `id`, `subject`, `legs`, `captureMode`, `expiry`, `policySource`, `redeem`,
  `signing`;
- **`subject`:** `canonicalizerRef`;
- **`expiry`** (when an object): `ttl`;
- **`redeem`:** `confirmToRedeem`, `redeemBound`, `reverify`, `result`;
- **leg:** `id`, `allowedAuthorities`, `sod`, `proposer`, `ackMode`, `requiredAcks`,
  `requiredConsultations`, `freshness`, `eligibility`, `decline`, `terminalRefusals`;
- **`sod`:** `notActorOf`;
- **`freshness`:** a record. Any own string key is allowed, and its values must be primitives.

How each own key is handled:

- **A known key:**
  - holding `undefined` is omitted, treated exactly as an absent key (the digest
    already folds it away);
  - holding a function throws;
  - holding a primitive (including `null`) is copied as is;
  - holding a plain object or array is copied by its child schema.
- **A list slot** (`allowedAuthorities`, `notActorOf`, `requiredConsultations`,
  `requiredAcks`, `terminalRefusals`) holds primitives only. **`legs`** holds leg objects.
- **A scalar slot** (every known key not named above as an object, list or record) holding an
  object or array throws, naming the field: it has no child schema to copy by.
- **An unknown key:**
  - holding a function is dropped (SPEC §4: the projection excludes host code references);
  - holding `undefined` is dropped;
  - holding a redemption field (`confirmToRedeem`, `redeemBound`, `reverify`, `result`) off
    `redeem` throws the existing "must live inside a 'redeem' block" message;
  - anything else throws `invalid profile '<id>': unknown key '<key>' on <where>`, which
    names the profile, the leg or the nested block.

Because the schema is bounded and list elements are never recursed into, a cyclic structure
cannot loop: it meets an unknown key or a non-primitive element first.

**The digest invariant.** For every profile `create()` accepts, `profileDigest(profile)`
computed on the host's object at that moment equals the digest the instance binds. That holds
because the snapshot keeps exactly the own enumerable data the projection reads: functions
and `undefined` drop in both, and accessors, Proxies and non-plain objects are refused before
either runs. So the exported offline helpers and the instance never disagree about a
registrable profile, for a profile as the host passes it to `create()`.

**The projection keeps an own `__proto__` key.** `dataOnly` builds objects with `out[key] = …`, which for an
own key named `__proto__` sets the prototype instead of copying the key. It now builds them with
`Object.fromEntries`, which creates an own property. The digest changes only for a profile that
has an own `__proto__` key, which is also the only profile it used to get wrong.

**Type, shape and bound rules in `validateProfile`** (on the snapshot):

- **Scalar types.**
  - `proposer`, `eligibility` and `policySource`, when declared, are strings. `null` is a
    declared non-string and throws, with a message saying to omit the field instead.
  - `reverify`, when declared, is a boolean.
  - Every `terminalRefusals` member is a string before the registry lookup, since
    `Object.hasOwn` would otherwise coerce `['sod-violation']` to a key.
- **`redeem` is an object.** `redeem`, when declared, is an object. `null`, `false`, `0`, `'none'` and `[]`
  throw.
- **Lists are arrays.** Every list field is an array. A `Set` already throws at the snapshot, and a
  non-array primitive meets the field's existing message.
- **Named messages, never a raw TypeError.** `subject` is an object with a `canonicalizerRef` string. `legs` elements are
  objects. `null` optional fields meet a named message, never a raw `TypeError`.
- **An upper bound.** `expiry.ttl`, `redeem.confirmToRedeem`, `redeem.redeemBound` and
  each `freshness` value is a positive integer of seconds, at most 3,155,760,000 (100 Julian
  years).
  - **Why this cap.** The three stamping bounds then keep every deadline the build stamps
    (`now` plus the bound) inside RFC 3339's four-digit years for any clock before 9899. A
    longer bound is the unbounded idiom, and its documented spelling is to omit the field
    (`'none'` for expiry).
  - **Freshness.** It stamps nothing, but it takes the same rule, so "the ttl convention"
    stays one convention.
- **Feature-conditional `terminalRefusals`.** A member whose producer the leg or profile
  does not declare throws, as the never-appends and compromise members already do. The
  producers, from `kernel/finalize.ts` and `kernel/decline.ts`:

  | Member | Producing declaration |
  |---|---|
  | `sod-violation` | the leg declares `sod` or `proposer` |
  | `policy-drift` | the profile declares `policySource` |
  | `ineligible` | the leg declares `eligibility` |
  | `consultation-failed` | the leg declares `requiredConsultations` |
  | `consultation-stale` | the leg declares `freshness` |
  | `ack-missing`, `ack-stale` | the leg declares the findings flow (`ackMode` + `requiredAcks`) |

  `leg-expired` and `availability` stay legal and inert, as SPEC §8 names them. Every other
  member is unchanged.

**`create()` reads its config once.** `config.profiles`, `config.store`,
`config.canonicalizers` and `config.signing` are each read once into a local:

- `config` must be an object;
- `config.profiles` must be an array;
- `config.canonicalizers` must be a non-null object.

Each check throws a named `create:` error. The profile list is
iterated by index over that one read.

**The canonicalizer is a function.** `resolveCanonicalizer` refuses a registry entry that is not a function, with its
existing `unresolved`-style message head. A `null`, string or object canonicalizer used to
construct and fail at the first `stage()`.

## 3. Rulings

- **Plain data, not a `[[Get]]` snapshot.** The identity snapshot reads through getters. For
  profiles, reading through getters would make the exported `profileDigest(profile)` disagree
  with the bound digest for a class-built profile. That is a trap for exactly the offline
  comparison the guide recommends.
  - Profiles are configuration, and `create()` already demands plain data for its other
    configuration object, so plain data is the rule that keeps one projection everywhere.
  - Cost: a TypeScript class that `implements ConfirmProfile` and is legal today throws at
    construction, loudly, with the fix in the message (pass an object literal or JSON).
  - Objects from another realm (a `vm` context) are refused too. Their prototype is not
    this realm's `Object.prototype`.
- **Unknown data-valued keys throw, functions do not.** SPEC §4 projects "configured fields,
  excluding any host code references". A function-valued member is a host code reference, and
  rejecting it would change what hosts may attach for their own use. A data-valued key the
  library does not know is either a typo or host metadata that would enter the digest
  while governing nothing. A host that wants metadata keeps it beside the profile.
- **`undefined` is absent, `null` is a value.** `undefined` folds away in the digest and in
  TypeScript's optional fields. `null` is digested and is not a declaration, so a `null` field
  throws rather than being silently dropped, which would change the digest the invariant
  promises.
- **Messages already pinned keep their text.** The snapshot hands primitives through, so a
  wrong primitive meets the existing message, and the stray-redemption-key message is reused.
  New messages use the file's `invalid profile '<id>': …` register.
- **Not in scope, stated.**
  - **Prototype pollution** (an in-process write to `Object.prototype`) is outside the threat
    model, by this increment's own ruling. The snapshot's objects keep `Object.prototype`.
  - **`config.signing`'s inner fields** (`signer`, `verifiers`, `signatures`) are still read
    where used. The block is read once at the top level only.
  - **Options bags other than `open()`'s** and canonicalizer output remain the host's to keep
    plain.

## 4. Pins

Red first against `0bfe7e2`'s source, where the old behavior differs.

- **The snapshot** (`packages/record/test/profile-snapshot.test.ts`):
  - mutating every mutable part of a registered profile after `create()` (a leg's `sod`,
    `signing`, `requiredConsultations`, `allowedAuthorities`, `expiry.ttl`) leaves every seam
    deciding as before, and the bound digest unchanged;
  - the snapshot is frozen;
  - a getter-class profile and an `Object.create` profile throw at construction, naming the
    shape;
  - a non-enumerable own `signing` throws;
  - a sparse list and a `Set` list throw;
  - the digest invariant holds over the repository's own test profiles: `profileDigest(input)`
    equals the digest a genesis binds;
  - `projectProfile` keeps an own `__proto__` key.
- **Construction** (`construction-validation.test.ts`, additions only), one pin per field:
  - an unknown key on the profile, a leg, `subject`, `expiry`, `redeem` and `sod`;
  - a function-valued unknown key accepted, and a function-valued known key refused;
  - explicit `undefined` on `signing`, `decline` and `redeem.result` accepted as absent;
  - `null` optional fields named;
  - a non-string `proposer`, `eligibility` and `policySource`; a non-boolean `reverify`; a
    non-string `terminalRefusals` member;
  - a non-object `redeem` (each of `null`, `false`, `0`, `'none'`, `[]`);
  - a missing `subject`;
  - each bound at the cap (constructs) and one past it (throws);
  - each of the seven feature-conditional `terminalRefusals` members, without its feature
    (throws) and with it (constructs);
  - a non-function canonicalizer;
  - `config.profiles` not an array.
- **Existing pins.** None change. Any that must is an inversion, argued at the pin. The
  byte-stability and byte-regression suites must pass untouched.

## 5. Docs and records

- **`docs/guide/integrating.md`** (the identity paragraph's "only identities are snapshotted"
  sentence, and the profile-drift paragraphs):
  - profiles are snapshotted at `create()` and must be plain data;
  - unknown data keys throw;
  - mutating a profile after `create()` has no effect;
  - `open()`'s options are read once (staged integrity).
- **`docs/guide/api-reference.md`:** the construction paragraph lists the new rules.
- **`docs/guide/concepts.md`:** the "Construction is loud" paragraph.
- **`ResolvedProfile`'s comment.**
- **`CHANGELOG.md`:** under Changed, the profiles that now throw.
- **The status record's section, and `CLAUDE.md`'s counts.**
