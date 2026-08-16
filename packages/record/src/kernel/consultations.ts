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
  RESERVED_CONSULTATION_KINDS,
  type UnreachableMarker,
} from '../config.js';
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
]);
const MARKER_KEYS: ReadonlySet<string> = new Set(['kind', 'unreachable', 'authority']);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function validateConsultations(
  inputs: ConsultationInput[] | undefined,
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
      'finalize: consultations must be an array when supplied — a malformed options bag is a caller error (SPEC §11.1)',
    );
  }
  const seenKinds = new Set<string>();
  for (const [index, input] of inputs.entries()) {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new Error(
        `finalize: consultations[${index}] is not a plain object (arrays and primitives are malformed entries) — a caller error (SPEC §11.1)`,
      );
    }
    const record = input as unknown as Record<string, unknown>;
    if (!isNonEmptyString(record.kind)) {
      throw new Error(
        `finalize: consultations[${index}] has a missing or empty kind — a malformed entry is a caller error (SPEC §11.1)`,
      );
    }
    const kind = record.kind;
    if (RESERVED_CONSULTATION_KINDS.has(kind)) {
      throw new Error(
        `finalize: consultations[${index}] names the reserved library-emitted kind '${kind}' — ` +
          'SPEC §11.1: forging a library control is a caller error',
      );
    }
    if (seenKinds.has(kind)) {
      throw new Error(
        `finalize: consultations[${index}] duplicates kind '${kind}' — SPEC §11.1 admits at most one consultation per kind per finalize`,
      );
    }
    seenKinds.add(kind);

    if (record.unreachable !== undefined) {
      // The marker shape: { kind, unreachable: true, authority } and nothing else.
      for (const key of Object.keys(record)) {
        if (!MARKER_KEYS.has(key)) {
          throw new Error(
            `finalize: consultations[${index}] (unreachable marker '${kind}') carries the unknown key '${key}' — the shape is exact (SPEC §11.1)`,
          );
        }
      }
      if (record.unreachable !== true) {
        throw new Error(
          `finalize: consultations[${index}] has unreachable: ${String(record.unreachable)} — a marker declares unreachable: true or is not a marker (SPEC §11.1)`,
        );
      }
      if (!isNonEmptyString(record.authority)) {
        throw new Error(
          `finalize: consultations[${index}] (unreachable marker '${kind}') has a missing or empty authority — the marker names the party that was down (SPEC §11.1)`,
        );
      }
      unreachable.push({ kind, unreachable: true, authority: record.authority });
      continue;
    }

    // The obtained shape: { kind, checker, payloadDigest, verdict, proofRef? } and
    // nothing else — NO at field, deliberately: SPEC §11.1's "A consultation's `at` is
    // never accepted from the host" is enforced by this exact-shape rule, so a supplied
    // recording time is an unknown-key throw, never a silently dropped field.
    for (const key of Object.keys(record)) {
      if (!OBTAINED_KEYS.has(key)) {
        throw new Error(
          `finalize: consultations[${index}] (obtained '${kind}') carries the unknown key '${key}' — the shape is exact, and a host-supplied at is never accepted (SPEC §11.1)`,
        );
      }
    }
    // The exact-shape rule enforced by the two key-set loops above is ENTRY-shape-scoped
    // only: `checker` itself is validated by `isValidIdentity` (a non-empty `principal` and
    // `authority`) but is not, in turn, exact-shaped — the same recorded posture as the
    // `confirmed` payload's `actor` and `facts.checker` since the kernel increment. Extra
    // keys inside a supplied checker object are not rejected; they reach the digested
    // payload as host attestation, not as anything this validator itself vouches for.
    if (!isValidIdentity(record.checker as never)) {
      throw new Error(
        `finalize: consultations[${index}] (obtained '${kind}') has a malformed checker identity — a caller error (SPEC §11.1)`,
      );
    }
    if (!isNonEmptyString(record.payloadDigest)) {
      throw new Error(
        `finalize: consultations[${index}] (obtained '${kind}') has a missing or empty payloadDigest — digest-only custody needs the digest (SPEC §11.1)`,
      );
    }
    if (record.verdict !== 'pass' && record.verdict !== 'fail') {
      throw new Error(
        `finalize: consultations[${index}] (obtained '${kind}') has verdict '${String(record.verdict)}' — a Consultation verdict is 'pass' or 'fail' (SPEC §2)`,
      );
    }
    if (record.proofRef !== undefined && typeof record.proofRef !== 'string') {
      throw new Error(
        `finalize: consultations[${index}] (obtained '${kind}') has a non-string proofRef — a caller error (SPEC §11.1)`,
      );
    }
    obtained.push({
      kind,
      checker: record.checker as ObtainedConsultation['checker'],
      payloadDigest: record.payloadDigest,
      verdict: record.verdict,
      ...(record.proofRef !== undefined ? { proofRef: record.proofRef } : {}),
    });
  }
  return { obtained, unreachable };
}
