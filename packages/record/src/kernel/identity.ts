// @vidimera/record — kernel/identity.ts: the one identity validator (SPEC §6). A leaf
// module: it imports only a type, so every seam that records an identity — finalize, decline,
// consultations, findings, the findings seams and the prior-leg read — can import it without
// importing finalize.ts or each other.

import type { IdentityAssertion } from '../types.js';

const IDENTITY_KEYS: ReadonlySet<string> = new Set(['principal', 'authority', 'proofRef']);

/**
 * An identity is valid iff it is EXACTLY an IdentityAssertion (SPEC §6): an object whose own
 * keys are a subset of `{ principal, authority, proofRef }`, with `principal` and `authority`
 * non-empty strings and `proofRef` either absent, an explicit `undefined` (the shape an
 * optional field takes under a spread), or a string. The arg is typed `IdentityAssertion`,
 * but the library must fail closed against a malformed/absent arg supplied at runtime (a
 * payload-carried or empty id) — hence the defensive runtime shape check.
 *
 * The exact-shape half is the TWELFTH self-authored inversion in the status record's own
 * numbered sequence, argued here at its site. From the kernel increment until the
 * security-findings pass (2026-09-03) the recorded posture was the opposite: extra keys on
 * an `actor`, a `checker`, a `raiser` or an `acker` were not rejected and reached the
 * digested payload as host attestation (kernel/consultations.ts, as it then read), and every
 * seam persisted the object it was handed — `payload: { actor: identity }`. The inversion's
 * argument: those extra keys are exactly where a host leaks an e-mail address, a display
 * name or a bearer token into a digested, immutable transition, in a record whose erasure
 * story (SPEC §6, §13) rests on the principal being a pseudonym resolvable OUTSIDE the
 * chain. An immutable chain cannot un-swallow what it took, and attestation no seam reads is
 * not a capability anyone lost. Every caller keeps its own posture toward an invalid
 * identity — finalize and decline refuse `identity-authority-refused`, the findings seams and
 * an obtained consultation's checker throw, `facts.checker` fails the facts gate; only what
 * counts as valid moved. Pinned in `test/identity-shape.test.ts`.
 *
 * That fix was verified against the extra-own-key shape only, and it stayed incomplete until
 * the identity-snapshot increment: the check reads OWN enumerable keys, but the fields through
 * ordinary property access — getters and the prototype chain — while every seam still embedded
 * the caller's object, which each serializer then read its own way (JCS honours an inherited
 * `toJSON`, `MemoryStore`'s `structuredClone` drops the prototype, the SQL backings persist
 * `JSON.stringify`). A getter-backed or `Object.create`-built identity was recorded as `{}`,
 * and a prototype `toJSON` view reached the SQL backings. The completion is
 * `identitySnapshot` below: the one validator, returning a fresh literal of exactly the values
 * it validated, which every seam records in place of the object it was handed. This predicate
 * is that function's non-null test, so its callers and pins keep their meaning.
 */
export function isValidIdentity(identity: IdentityAssertion): boolean {
  return identitySnapshot(identity) !== null;
}

/**
 * The one identity validator (SPEC §6): `isValidIdentity`'s checks, in its order — a non-null
 * object; every own enumerable key inside `{ principal, authority, proofRef }`; a non-empty
 * string `principal`; a non-empty string `authority`; `proofRef` absent, `undefined` or a
 * string — reading each field exactly ONCE into a local, and returning a fresh plain literal
 * `{ principal, authority, proofRef? }` of those values (`proofRef` omitted when `undefined`),
 * or `null` when any check fails. Every seam records this literal, never the object it was
 * handed: whatever shape a caller's identity takes — a class with getters, an
 * `Object.create`-built object, a non-enumerable field, a prototype `toJSON` — the bytes
 * digested and stored are the values validated here, and a caller mutating its object after
 * the call changes nothing recorded. It catches nothing: a getter or proxy that throws while
 * being read propagates, exactly as the property reads it replaces did, so no seam's failure
 * posture moves.
 */
export function identitySnapshot(identity: IdentityAssertion): IdentityAssertion | null {
  const i = identity as unknown as Record<string, unknown> | null | undefined;
  if (i == null || typeof i !== 'object') return null;
  for (const key of Object.keys(i)) {
    if (!IDENTITY_KEYS.has(key)) return null;
  }
  const principal = i.principal;
  if (typeof principal !== 'string' || principal.length === 0) return null;
  const authority = i.authority;
  if (typeof authority !== 'string' || authority.length === 0) return null;
  const proofRef = i.proofRef;
  if (proofRef !== undefined && typeof proofRef !== 'string') return null;
  return { principal, authority, ...(proofRef !== undefined ? { proofRef } : {}) };
}
