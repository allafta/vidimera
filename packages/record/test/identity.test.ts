// @vidimera/record — identity.test.ts (design §5 "Identity by transport, both branches →
// identity-authority-refused" / §6 identity test): finalize()'s identity check has TWO
// refusal branches, both → `identity-authority-refused`:
//   (a) the identity ARG is missing/malformed (no principal / no authority) — the library
//       reads identity ONLY from the explicit arg; a payload-carried id is never trusted;
//   (b) `identity.authority` is not in the leg's `allowedAuthorities` (incl. a
//       transport-established low-trust `dev-stub` the leg does not allow).
// Default leg: the refusal does NOT append (record stays open, no transitionRef). A leg
// listing `identity-authority-refused` in `terminalRefusals` appends `open→refused`
// (transitionRef present) — the general refusal-append rule (design §5/§9 appendsOn).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create } from '../src/create.js';
import type { IdentityAssertion } from '../src/types.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const PROFILE_ID = 'test.capture.v1';
const CONTENT = { subject: 'week-1', total: 40 };

// === branch (a): missing / malformed identity arg ====================================

test('finalize() with an EMPTY identity arg (no principal, no authority) → identity-authority-refused, no append', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const badIdentity = {} as unknown as IdentityAssertion;
  const outcome = await handles.operator.finalize(recordId, badIdentity, CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'identity-authority-refused');
  assert.equal(outcome.class, 'refusal');
  assert.equal(outcome.transitionRef, undefined, 'a default-leg identity refusal appends nothing');

  const chain = await handles.operator.readChain(recordId);
  assert.equal(chain.length, 1, 'the record stays open with just [opened]');
  assert.equal((await handles.operator.getRecord(recordId))?.state, 'open');
});

test('finalize() with an identity arg MISSING authority → identity-authority-refused', async () => {
  const handles = create(makeConfig([captureProfile()]));
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const badIdentity = { principal: 'approver:1' } as unknown as IdentityAssertion;
  const outcome = await handles.operator.finalize(recordId, badIdentity, CONTENT, facts());
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'identity-authority-refused');
});

// === branch (b): authority not in the leg's allowedAuthorities =======================

test("finalize() with an authority NOT in the leg's allowedAuthorities → identity-authority-refused", async () => {
  // leg allows only 'session:test-app'; the caller presents a well-formed id under a
  // different authority.
  const handles = create(
    makeConfig([captureProfile({ allowedAuthorities: ['session:test-app'] })]),
  );
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const outcome = await handles.operator.finalize(
    recordId,
    identity({ authority: 'oidc:some-other-issuer' }),
    CONTENT,
    facts(),
  );
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'identity-authority-refused');
  assert.equal(outcome.transitionRef, undefined);
});

test('finalize() with a transport-established low-trust `dev-stub` authority the leg does not allow → identity-authority-refused', async () => {
  const handles = create(
    makeConfig([captureProfile({ allowedAuthorities: ['session:test-app'] })]),
  );
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const outcome = await handles.operator.finalize(
    recordId,
    identity({ authority: 'dev-stub' }),
    CONTENT,
    facts(),
  );
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'identity-authority-refused');
});

// === append semantics: terminalRefusals lists identity-authority-refused =============

test('a leg with terminalRefusals:[identity-authority-refused] appends open→refused with a transitionRef', async () => {
  const handles = create(
    makeConfig([captureProfile({ terminalRefusals: ['identity-authority-refused'] })]),
  );
  const recordId = await openRecord(handles, CONTENT, PROFILE_ID, DEFAULT_SUBJECT_REF);

  const outcome = await handles.operator.finalize(
    recordId,
    identity({ authority: 'dev-stub' }),
    CONTENT,
    facts(),
  );
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'identity-authority-refused');
  assert.ok(
    outcome.transitionRef,
    'a terminalRefusals-listed refusal carries the appended refused edge digest',
  );

  const chain = await handles.operator.readChain(recordId);
  assert.equal(chain.length, 2, 'the refusal appended [opened, refused]');
  const refusedTransition = chain[1];
  if (refusedTransition === undefined)
    throw new Error(
      'identity.test.ts: chain[1] missing — the terminal identity refusal must have appended a second transition',
    );
  assert.equal(refusedTransition.kind, 'refused');
  assert.deepEqual(
    refusedTransition.payload,
    { code: 'identity-authority-refused' },
    'refused payload is {code}-only',
  );
  assert.equal((await handles.operator.getRecord(recordId))?.state, 'refused');
});
