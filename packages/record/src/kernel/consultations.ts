// @vidimera/record — kernel/consultations.ts: SPEC §11.1's consultation INTAKE
// validator (the first step-5 increment). The attach form is unconditional — §11.1:
// "The attach form is always available" — and a consultation is "evidence, never a
// decision": this module validates and partitions the host's supplied list; nothing
// here gates. The required-consultation gate that consumes the partition's markers
// is real as of the second step-5 increment, at finalize's rung (5.5) — extended there
// for eligibility (SPEC §10.4) at the first step-6 increment, this module unchanged by
// that extension.
//
// Every rejection here THROWS at argument intake (SPEC §9: consultation shape "throws
// at argument intake, before anything is loaded"): a malformed entry, a duplicate kind,
// or a reserved kind is a CALLER error that throws identically regardless of record
// state — never a refusal, and never recorded.

import {
  type ConsultationInput,
  type ObtainedConsultation,
  type PolicyInput,
  RESERVED_CONSULTATION_KINDS,
  type UnreachableMarker,
} from '../config.js';
import type { IdentityAssertion } from '../types.js';
import { isValidIdentity } from './finalize.js';

export interface PartitionedConsultations {
  obtained: ObtainedConsultation[]; // supplied order preserved — the batch records in this order
  unreachable: UnreachableMarker[];
}

const OBTAINED_KEYS: ReadonlySet<string> = new Set([
  'kind',
  'checker',
  'payloadDigest',
  'verdict',
  'proofRef',
  'observedAt',
]);
const MARKER_KEYS: ReadonlySet<string> = new Set(['kind', 'unreachable', 'authority']);
// RFC 3339 date-time WITH an explicit offset ('Z' or '+HH:MM'/'-HH:MM') — plain
// `Date.parse`-ability alone would also accept an offset-less clock time or a
// date-only string, both parsed HOST-LOCAL, making staleness locale-dependent (found
// at the AL2 freshness increment's final review). Required at intake; `Date.parse`
// (below) still does the actual value parse once the shape is confirmed.
const RFC3339_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function validateConsultations(
  inputs: ConsultationInput[] | undefined,
  seam: 'finalize' | 'decline',
): PartitionedConsultations {
  const obtained: ObtainedConsultation[] = [];
  const unreachable: UnreachableMarker[] = [];
  if (inputs === undefined) {
    return { obtained, unreachable };
  }
  if (!Array.isArray(inputs)) {
    // A non-array `consultations` (null/string/object) is a malformed OPTIONS BAG, not a
    // malformed entry inside one — reached here before the per-entry loop below so it never
    // falls through to `inputs.entries()`, which throws an unnamed TypeError on anything
    // that is not itself an array (SPEC §9's "throws at argument intake" applies to the whole
    // bag, not just its elements).
    throw new Error(
      `${seam}: consultations must be an array when supplied — a malformed options bag is a caller error (SPEC §11.1)`,
    );
  }
  const seenKinds = new Set<string>();
  for (const [index, input] of inputs.entries()) {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new Error(
        `${seam}: consultations[${index}] is not a plain object (arrays and primitives are malformed entries) — a caller error (SPEC §11.1)`,
      );
    }
    const record = input as unknown as Record<string, unknown>;
    if (!isNonEmptyString(record.kind)) {
      throw new Error(
        `${seam}: consultations[${index}] has a missing or empty kind — a malformed entry is a caller error (SPEC §11.1)`,
      );
    }
    const kind = record.kind;
    if (RESERVED_CONSULTATION_KINDS.has(kind)) {
      throw new Error(
        `${seam}: consultations[${index}] names the reserved library-emitted kind '${kind}' — ` +
          'SPEC §11.1: forging a library control is a caller error',
      );
    }
    if (seenKinds.has(kind)) {
      throw new Error(
        `${seam}: consultations[${index}] duplicates kind '${kind}' — SPEC §11.1 admits at most one consultation per kind per ${seam}`,
      );
    }
    seenKinds.add(kind);

    if (record.unreachable !== undefined) {
      // The marker shape: { kind, unreachable: true, authority } and nothing else.
      for (const key of Object.keys(record)) {
        if (!MARKER_KEYS.has(key)) {
          throw new Error(
            `${seam}: consultations[${index}] (unreachable marker '${kind}') carries the unknown key '${key}' — the shape is exact (SPEC §11.1)`,
          );
        }
      }
      if (record.unreachable !== true) {
        throw new Error(
          `${seam}: consultations[${index}] has unreachable: ${String(record.unreachable)} — a marker declares unreachable: true or is not a marker (SPEC §11.1)`,
        );
      }
      if (!isNonEmptyString(record.authority)) {
        throw new Error(
          `${seam}: consultations[${index}] (unreachable marker '${kind}') has a missing or empty authority — the marker names the party that was down (SPEC §11.1)`,
        );
      }
      unreachable.push({ kind, unreachable: true, authority: record.authority });
      continue;
    }

    // The obtained shape: { kind, checker, payloadDigest, verdict, proofRef?, observedAt? }
    // and nothing else — NO at field, deliberately: SPEC §11.1's "A consultation's `at`
    // is never accepted from the host" is enforced by this exact-shape rule, so a
    // supplied recording time is an unknown-key throw, never a silently dropped field.
    // `observedAt` (the AL2 freshness increment) is the one exception to "the library
    // stamps every timestamp itself" — SPEC §14's admission — checked structurally
    // below (RFC 3339 with an explicit offset, enforced at intake) at this
    // argument-depth intake; WHETHER a signing profile may accept a present one is
    // `kernel/finalize.ts`'s presence contract, a different depth entirely, not this
    // validator's concern.
    for (const key of Object.keys(record)) {
      if (!OBTAINED_KEYS.has(key)) {
        throw new Error(
          `${seam}: consultations[${index}] (obtained '${kind}') carries the unknown key '${key}' — the shape is exact, and a host-supplied at is never accepted (SPEC §11.1)`,
        );
      }
    }
    // The exact-shape rule enforced by the two key-set loops above covers the ENTRY; the
    // `checker` inside it is exact-shaped in turn by `isValidIdentity`, since the
    // security-findings pass (2026-09-03). Until then this comment recorded the opposite
    // posture, shared with the `confirmed` payload's `actor` and `facts.checker` since the
    // kernel increment: extra keys inside a supplied checker were not rejected and reached
    // the digested payload as host attestation. The inversion is argued at
    // `isValidIdentity`'s own site (kernel/finalize.ts); this throw's posture — a caller
    // error, nothing appended — is unchanged.
    if (!isValidIdentity(record.checker as IdentityAssertion)) {
      throw new Error(
        `${seam}: consultations[${index}] (obtained '${kind}') has a malformed checker identity — a caller error (SPEC §11.1)`,
      );
    }
    if (!isNonEmptyString(record.payloadDigest)) {
      throw new Error(
        `${seam}: consultations[${index}] (obtained '${kind}') has a missing or empty payloadDigest — digest-only custody needs the digest (SPEC §11.1)`,
      );
    }
    if (record.verdict !== 'pass' && record.verdict !== 'fail') {
      throw new Error(
        `${seam}: consultations[${index}] (obtained '${kind}') has verdict '${String(record.verdict)}' — a Consultation verdict is 'pass' or 'fail' (SPEC §2)`,
      );
    }
    if (record.proofRef !== undefined && typeof record.proofRef !== 'string') {
      throw new Error(
        `${seam}: consultations[${index}] (obtained '${kind}') has a non-string proofRef — a caller error (SPEC §11.1)`,
      );
    }
    if (record.observedAt !== undefined) {
      if (
        typeof record.observedAt !== 'string' ||
        !RFC3339_WITH_OFFSET.test(record.observedAt) ||
        Number.isNaN(Date.parse(record.observedAt))
      ) {
        throw new Error(
          `${seam}: consultations[${index}] (obtained '${kind}') has a malformed observedAt — ` +
            'the authority-claimed observation time is an RFC 3339 date-time with an explicit ' +
            'offset — a caller error (SPEC §14, §11.1)',
        );
      }
    }
    obtained.push({
      kind,
      checker: record.checker as ObtainedConsultation['checker'],
      payloadDigest: record.payloadDigest,
      verdict: record.verdict,
      ...(record.proofRef !== undefined ? { proofRef: record.proofRef } : {}),
      ...(record.observedAt !== undefined ? { observedAt: record.observedAt } : {}),
    });
  }
  return { obtained, unreachable };
}

const POLICY_DIGEST_KEYS: ReadonlySet<string> = new Set(['digest']);
const POLICY_UNREACHABLE_KEYS: ReadonlySet<string> = new Set(['unreachable', 'authority']);

/**
 * SPEC §10.3's finalize-time policy INTAKE validator (the second step-6 increment),
 * beside `validateConsultations` above: a PRESENT `opts.policy` must be exactly one of
 * the two shapes — `{ digest }` with a non-empty string, or `{ unreachable: true,
 * authority }` with a non-empty authority; unknown keys, both-shapes, neither-shape, and
 * empty strings all THROW as caller errors, at argument intake, before the chain loads —
 * whether `opts.policy` MAY be present is `kernel/finalize.ts`'s resolution-time presence
 * contract; whether a present one is WELL-FORMED is this function's job alone.
 * `policy === undefined` is not itself malformed here — an absent policy on a
 * non-declaring profile is legal, and an absent one on a declaring profile is the
 * presence contract's throw, not this shape check's.
 */
export function validatePolicyInput(policy: PolicyInput | undefined): void {
  if (policy === undefined) return;
  if (typeof policy !== 'object' || policy === null || Array.isArray(policy)) {
    throw new Error(
      'finalize: opts.policy is not a plain object (arrays and primitives are malformed) — a caller error (SPEC §10.3)',
    );
  }
  const record = policy as unknown as Record<string, unknown>;
  const hasDigest = Object.hasOwn(record, 'digest');
  const hasUnreachable = Object.hasOwn(record, 'unreachable');
  if (hasDigest && hasUnreachable) {
    throw new Error(
      'finalize: opts.policy carries both digest and unreachable — the two policy shapes are mutually exclusive (SPEC §10.3)',
    );
  }
  if (hasDigest) {
    for (const key of Object.keys(record)) {
      if (!POLICY_DIGEST_KEYS.has(key)) {
        throw new Error(
          `finalize: opts.policy (digest shape) carries the unknown key '${key}' — the shape is exact (SPEC §10.3)`,
        );
      }
    }
    if (!isNonEmptyString(record.digest)) {
      throw new Error(
        'finalize: opts.policy.digest is missing or empty — a caller error (SPEC §10.3)',
      );
    }
    return;
  }
  if (hasUnreachable) {
    for (const key of Object.keys(record)) {
      if (!POLICY_UNREACHABLE_KEYS.has(key)) {
        throw new Error(
          `finalize: opts.policy (unreachable shape) carries the unknown key '${key}' — the shape is exact (SPEC §10.3)`,
        );
      }
    }
    if (record.unreachable !== true) {
      throw new Error(
        `finalize: opts.policy has unreachable: ${String(record.unreachable)} — the marker declares unreachable: true or is not a marker (SPEC §10.3)`,
      );
    }
    if (!isNonEmptyString(record.authority)) {
      throw new Error(
        'finalize: opts.policy (unreachable marker) has a missing or empty authority — the marker names the party that was down (SPEC §10.3)',
      );
    }
    return;
  }
  throw new Error(
    'finalize: opts.policy matches neither policy shape ({ digest } or { unreachable, authority }) — a caller error (SPEC §10.3)',
  );
}
