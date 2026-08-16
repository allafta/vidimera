// @vidimera/record — outcome-model.test.ts (DECISIONS.md #10 "Result-first outcomes"):
// Outcome<T> constructors are
// result-first (never throw for a domain refusal), `class` is derived from `code` via
// the REGISTRY (never caller-supplied), and `transitionRef` is representable as
// present-or-absent per that same result-first discipline.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Outcome } from '../src/outcome.js';
import { ok, refused, unavailable } from '../src/outcome.js';
import { appendsOn, REGISTRY, type RefusalCode } from '../src/refusal-codes.js';

const ALL_REFUSAL_CODES = Object.keys(REGISTRY) as RefusalCode[];
// The codes `refused()` can actually mint — everything except `availability`, which is
// excluded from its parameter at compile time (SPEC §8: carried by the `unavailable`
// status alone). Filtered once here so every loop below stays in sync with that exclusion.
const REFUSABLE_CODES = ALL_REFUSAL_CODES.filter((code) => code !== 'availability') as Exclude<
  RefusalCode,
  'availability'
>[];

// Runtime-checks status==='refused' (a real assertion, not a type-only cast) and then
// narrows so the branch-specific `code`/`class`/`transitionRef` fields compile.
function assertRefused(
  result: Outcome<unknown>,
): asserts result is Extract<Outcome<unknown>, { status: 'refused' }> {
  assert.equal(result.status, 'refused');
}

test('ok() wraps a value under status "ok"', () => {
  const result = ok({ recordId: 'r1' });
  assert.equal(result.status, 'ok');
  assert.deepEqual(result, { status: 'ok', value: { recordId: 'r1' } });
});

test("refused('chain-compromise') derives class 'compromise'", () => {
  const result = refused('chain-compromise');
  assertRefused(result);
  assert.equal(result.code, 'chain-compromise');
  assert.equal(result.class, 'compromise');
});

test("refused('content-drift') derives class 'refusal'", () => {
  const result = refused('content-drift');
  assertRefused(result);
  assert.equal(result.code, 'content-drift');
  assert.equal(result.class, 'refusal');
});

test('class derivation is total: every RefusalCode maps to a class, ONLY chain-compromise is compromise, and ONLY availability is availability', () => {
  assert.equal(ALL_REFUSAL_CODES.length, 20, 'REGISTRY must cover all twenty RefusalCodes');
  for (const code of REFUSABLE_CODES) {
    const result = refused(code);
    assertRefused(result);
    const expectedClass = code === 'chain-compromise' ? 'compromise' : 'refusal';
    assert.equal(
      result.class,
      expectedClass,
      `code ${code} should derive class '${expectedClass}'`,
    );
    assert.equal(
      REGISTRY[code],
      expectedClass,
      `registry entry for ${code} should be '${expectedClass}'`,
    );
  }
  assert.equal(
    REGISTRY.availability,
    'availability',
    "REGISTRY must classify 'availability' as the third class, 'availability' — the only member",
  );
});

test('refused() never lets the caller supply class directly — it is always looked up from code', () => {
  // @ts-expect-error — `class` is not a parameter of refused(); this is a runtime-behavior
  // guard too: passing an extra arg has no effect on the derived class.
  const result = refused('content-drift', undefined, 'compromise');
  assertRefused(result);
  assert.equal(result.class, 'refusal');
});

test('refused() omits transitionRef when none is supplied (never-appended refusal)', () => {
  const result = refused('record-exists');
  assertRefused(result);
  assert.equal(
    'transitionRef' in result,
    false,
    'transitionRef must be absent, not undefined-but-present',
  );
});

test('refused() carries transitionRef when one is supplied (appended refusal)', () => {
  const digest = 'sha256:' + 'a'.repeat(64);
  const result = refused('chain-compromise', digest);
  assertRefused(result);
  assert.equal(result.transitionRef, digest);
});

test('unavailable() carries the availability code + authority, and is a distinct status from ok/refused', () => {
  const result = unavailable('ext:payments');
  assert.deepEqual(result, {
    status: 'unavailable',
    code: 'availability',
    authority: 'ext:payments',
  });
});

test('refused() cannot mint the availability code — the class is carried by the unavailable status alone', () => {
  // SPEC §8: the availability code "is carried by the `unavailable` outcome status,
  // **never** a `refused` edge". The exclusion is COMPILE-TIME (the second step-5
  // increment's ruling); the runtime half of this pin exercises the narrowed
  // constructor instead.
  // @ts-expect-error — 'availability' is excluded from refused()'s code parameter
  const illegal = () => refused('availability');
  void illegal;
  const out = unavailable('svc:sanctions');
  assert.deepEqual(out, {
    status: 'unavailable',
    code: 'availability',
    authority: 'svc:sanctions',
  });
});

test('domain refusals are returned values: refused() never throws, for any RefusalCode it can mint', () => {
  for (const code of REFUSABLE_CODES) {
    assert.doesNotThrow(() => refused(code));
    assert.doesNotThrow(() => refused(code, 'sha256:' + 'b'.repeat(64)));
  }
});

// --- refusal-codes.ts: appendsOn() append-decision helper (SPEC §8) ---

test('appendsOn: compromise-class code always appends, regardless of leg config', () => {
  assert.equal(appendsOn('chain-compromise', {}), true);
  assert.equal(appendsOn('chain-compromise', { terminalRefusals: [] }), true);
  assert.equal(appendsOn('chain-compromise', { terminalRefusals: ['content-drift'] }), true);
});

test('appendsOn: the never-append codes never append, even if a leg lists them in terminalRefusals', () => {
  const neverAppendCodes: RefusalCode[] = [
    'record-exists',
    'unknown-profile',
    'unknown-leg',
    'record-not-open',
    'unredeemable-state',
    'unsealable-state',
  ];
  for (const code of neverAppendCodes) {
    assert.equal(appendsOn(code, {}), false, `${code} must never append (no leg config)`);
    assert.equal(
      appendsOn(code, { terminalRefusals: [code] }),
      false,
      `${code} must never append even when leg lists it as terminal`,
    );
  }
});

test('appendsOn: other refusal-class codes append open→refused iff the leg lists them as terminal', () => {
  assert.equal(
    appendsOn('content-drift', {}),
    false,
    'no terminalRefusals -> record stays open, no append',
  );
  assert.equal(appendsOn('content-drift', { terminalRefusals: [] }), false);
  assert.equal(
    appendsOn('content-drift', { terminalRefusals: ['leg-expired'] }),
    false,
    'a different code listed does not trigger append',
  );
  assert.equal(appendsOn('content-drift', { terminalRefusals: ['content-drift'] }), true);
  assert.equal(
    appendsOn('identity-authority-refused', { terminalRefusals: ['identity-authority-refused'] }),
    true,
  );
  assert.equal(appendsOn('leg-expired', { terminalRefusals: ['leg-expired'] }), true);
  assert.equal(
    appendsOn('consultation-missing', { terminalRefusals: ['consultation-missing'] }),
    true,
  );
});
