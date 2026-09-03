// @vidimera/record — identity-shape.test.ts: an IdentityAssertion is EXACTLY
// `{ principal, authority, proofRef? }` (SPEC §6) at every seam that accepts one, and nothing
// else a caller attaches to it reaches the chain. Before this pin the library's one identity
// validator checked a non-empty `principal` and `authority` and nothing more, and every seam
// persisted the object it was handed verbatim — `payload: { actor: identity }` — so a host
// passing its session object wholesale wrote every extra key into a digested, immutable
// transition. The recorded posture was that such keys "reach the digested payload as host
// attestation" (kernel/consultations.ts, since the kernel increment); this file pins the
// inversion of that posture, argued at `isValidIdentity`'s own site: the extra keys are
// exactly where a host leaks an e-mail address or a bearer token into a chain built so that
// the principal can be erased THROUGH an identity map held outside it (SPEC §6, §13), and an
// immutable chain cannot un-swallow what it took.
//
// Each seam keeps its own existing posture toward a malformed identity: finalize and decline
// refuse `identity-authority-refused` (the refusal is recorded; the actor is not), the
// findings seams throw (a caller error, nothing appended), an obtained consultation's
// `checker` throws through `validateConsultations`, and a `facts.checker` fails the facts
// gate (`consultation-missing`). `proofRef` is admitted when it is a string or an explicit
// `undefined` (the shape an optional field takes under a spread), and refused otherwise.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConfirmProfile, LegSpec } from '../src/config.js';
import { create } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import type { IdentityAssertion } from '../src/types.js';
import { captureProfile, facts, identity, makeConfig, openRecord } from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const DIGEST = `sha256:${'a'.repeat(64)}`;
const LEAK = 'leaked-session-secret-7f3a';

/** A well-formed identity with one key the shape does not admit — the leak-shaped input. */
function widened(extra: Record<string, unknown> = { sessionToken: LEAK }): IdentityAssertion {
  return { ...identity(), ...extra } as IdentityAssertion;
}

function flowProfile(extra?: Partial<LegSpec>): ConfirmProfile {
  const p = captureProfile({ id: 'test.shape.flow.v1', decline: true });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  p.legs[0] = { ...leg, ackMode: 'any' as const, requiredAcks: ['variance'], ...extra };
  return p;
}

function setup() {
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  return { store, handles };
}

async function chainNeverCarries(store: MemoryStore, recordId: string, needle: string) {
  const chain = await store.readChain(recordId);
  for (const t of chain) {
    assert.ok(
      !JSON.stringify(t.payload).includes(needle),
      `seq ${t.seq} (${t.kind}): the chain swallowed the extra key's value`,
    );
  }
}

test('finalize: an identity carrying a key outside { principal, authority, proofRef? } refuses identity-authority-refused, and the chain never carries the key', async () => {
  const { store, handles } = setup();
  const recordId = await openRecord(handles, CONTENT, 'test.shape.flow.v1', 'subject:shape-1');
  const out = await handles.operator.finalize(recordId, widened(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'identity-authority-refused');
  await chainNeverCarries(store, recordId, LEAK);
});

test('decline: the same widened identity refuses identity-authority-refused', async () => {
  const { store, handles } = setup();
  const recordId = await openRecord(handles, CONTENT, 'test.shape.flow.v1', 'subject:shape-2');
  const out = await handles.operator.decline(recordId, widened(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'identity-authority-refused');
  await chainNeverCarries(store, recordId, LEAK);
});

test('raiseFinding and acknowledge: a widened identity is a caller error — both throw, nothing is appended', async () => {
  const { store, handles } = setup();
  const recordId = await openRecord(handles, CONTENT, 'test.shape.flow.v1', 'subject:shape-3');
  const before = (await store.readChain(recordId)).length;
  await assert.rejects(
    handles.operator.raiseFinding(
      recordId,
      { findingId: 'f-1', kind: 'variance', findingDigest: DIGEST },
      widened(),
    ),
    /raiseFinding: a malformed identity/,
  );
  // A well-formed raise, so the acknowledge below reaches its own identity check.
  const raised = await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: DIGEST },
    identity({ principal: 'checker:1' }),
  );
  assert.equal(raised.status, 'ok');
  await assert.rejects(
    handles.operator.acknowledge(recordId, { findingId: 'f-1', findingDigest: DIGEST }, widened()),
    /acknowledge: a malformed identity/,
  );
  assert.equal(
    (await store.readChain(recordId)).length,
    before + 1,
    'only the well-formed raise appended',
  );
  await chainNeverCarries(store, recordId, LEAK);
});

test("an obtained consultation's checker carrying an extra key throws through validateConsultations", async () => {
  const { store, handles } = setup();
  const recordId = await openRecord(handles, CONTENT, 'test.shape.flow.v1', 'subject:shape-4');
  await assert.rejects(
    handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
      consultations: [
        {
          kind: 'risk-check',
          checker: {
            principal: 'svc:risk',
            authority: 'mtls:risk',
            note: LEAK,
          } as IdentityAssertion,
          payloadDigest: DIGEST,
          verdict: 'pass',
        },
      ],
    }),
    /checker/,
  );
  await chainNeverCarries(store, recordId, LEAK);
});

test('facts.checker carrying an extra key fails the facts gate: consultation-missing, and the chain never carries the key', async () => {
  const { store, handles } = setup();
  const recordId = await openRecord(handles, CONTENT, 'test.shape.flow.v1', 'subject:shape-5');
  const out = await handles.operator.finalize(
    recordId,
    identity(),
    CONTENT,
    facts({
      checker: {
        principal: 'svc:review',
        authority: 'mtls:review',
        note: LEAK,
      } as IdentityAssertion,
    }),
  );
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'consultation-missing');
  await chainNeverCarries(store, recordId, LEAK);
});

test('proofRef: a non-string is refused; a string, or an explicit undefined, is admitted', async () => {
  const { handles } = setup();
  const bad = await openRecord(handles, CONTENT, 'test.shape.flow.v1', 'subject:shape-6');
  const refused = await handles.operator.finalize(bad, widened({ proofRef: 42 }), CONTENT, facts());
  assert.equal(refused.status, 'refused');
  if (refused.status === 'refused') assert.equal(refused.code, 'identity-authority-refused');

  const withRef = await openRecord(handles, CONTENT, 'test.shape.flow.v1', 'subject:shape-7');
  const ok1 = await handles.operator.finalize(
    withRef,
    identity({ proofRef: 'audit:1' }),
    CONTENT,
    facts(),
  );
  assert.equal(ok1.status, 'ok');

  const explicitUndefined = await openRecord(
    handles,
    CONTENT,
    'test.shape.flow.v1',
    'subject:shape-8',
  );
  const ok2 = await handles.operator.finalize(
    explicitUndefined,
    { ...identity(), proofRef: undefined },
    CONTENT,
    facts(),
  );
  assert.equal(
    ok2.status,
    'ok',
    'an explicit undefined is the shape an optional field takes under a spread',
  );
});
