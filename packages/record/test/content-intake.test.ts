// @vidimera/record — content-intake.test.ts: content binding. Every seam that binds content
// (`stage`, `finalize`, `decline` and the three redemption seams) runs the registered
// canonicalizer through one helper, which refuses a thenable (a canonicalizer is synchronous),
// serializes the output strictly (a lone surrogate or a non-plain object throws), and digests.
// A refusal is the same configuration fault a throwing canonicalizer already is: it propagates,
// `stage()` writes no draft and every other seam appends nothing. A refused promise must also
// have its later rejection OBSERVED, or it would end the process as an unhandled rejection.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { bindContent, canonicalize, digest } from '../src/canonical.js';
import { create } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  captureProfile,
  DEFAULT_CANONICALIZER_REF,
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };

/** Lets microtasks and two macrotasks run, so a late rejection would have surfaced. */
async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

/** Runs `body` and returns every unhandled rejection the process saw meanwhile. */
async function unhandledDuring(body: () => Promise<void>): Promise<unknown[]> {
  const seen: unknown[] = [];
  const listener = (reason: unknown) => {
    seen.push(reason);
  };
  process.on('unhandledRejection', listener);
  try {
    await body();
    await flush();
  } finally {
    process.off('unhandledRejection', listener);
  }
  return seen;
}

/** Synchronous until `turnAsync()`, then an async function whose promise REJECTS. */
function turningAsync() {
  let asyncNow = false;
  return {
    canonicalizer: (content: unknown): unknown => {
      if (!asyncNow) return content;
      return (async () => {
        throw new Error('late rejection');
      })();
    },
    turnAsync: () => {
      asyncNow = true;
    },
  };
}

class Counting extends MemoryStore {
  puts = 0;
  override putStaged(...args: Parameters<MemoryStore['putStaged']>) {
    this.puts++;
    return super.putStaged(...args);
  }
}

function stagingSetup(canonicalizer: (c: unknown) => unknown) {
  const store = new Counting();
  const handles = create(
    makeConfig([captureProfile()], {
      store,
      canonicalizers: { [DEFAULT_CANONICALIZER_REF]: canonicalizer },
    }),
  );
  return { store, handles };
}

// === stage ============================================================================

test('stage(): an async canonicalizer throws the thenable refusal and writes no draft', async () => {
  const { canonicalizer, turnAsync } = turningAsync();
  const { store, handles } = stagingSetup(canonicalizer);
  turnAsync();
  await assert.rejects(
    () => handles.agent.stage(CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF),
    new RegExp(
      `canonicalizer for '${DEFAULT_CANONICALIZER_REF.replaceAll('.', '\\.')}' returned a thenable — a canonicalizer is synchronous`,
    ),
  );
  assert.equal(store.puts, 0, 'no draft was written');
  await flush();
});

test('stage(): the refused promise rejection is observed — no unhandledRejection fires', async () => {
  const { canonicalizer, turnAsync } = turningAsync();
  const { handles } = stagingSetup(canonicalizer);
  turnAsync();
  const seen = await unhandledDuring(async () => {
    await assert.rejects(
      () => handles.agent.stage(CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF),
      /returned a thenable/,
    );
  });
  assert.deepEqual(seen, [], 'the rejection was handled');
});

test('a plain thenable that rejects later is observed too, and a function thenable is refused', async () => {
  const seen = await unhandledDuring(async () => {
    const plain = {
      // biome-ignore lint/suspicious/noThenProperty: a thenable is the input under test
      then(_resolve: unknown, reject: (e: unknown) => void) {
        setTimeout(() => reject(new Error('late')), 0);
      },
    };
    assert.throws(() => bindContent(() => plain, 'ref.a', CONTENT), /returned a thenable/);
    const fn = Object.assign(() => 1, {
      // biome-ignore lint/suspicious/noThenProperty: a thenable is the input under test
      then(_resolve: unknown, reject: (e: unknown) => void) {
        reject(new Error('immediate'));
      },
    });
    assert.throws(() => bindContent(() => fn, 'ref.b', CONTENT), /returned a thenable/);
  });
  assert.deepEqual(seen, []);
});

test('a thenable whose then throws is still refused as a thenable', () => {
  const hostile = {
    // biome-ignore lint/suspicious/noThenProperty: a thenable is the input under test
    then() {
      throw new Error('hostile then');
    },
  };
  assert.throws(() => bindContent(() => hostile, 'ref.c', CONTENT), /returned a thenable/);
});

class WithPrivate {
  #secret = 1;
  get secret() {
    return this.#secret;
  }
}

const VOID_OUTPUTS: readonly { what: string; output: unknown; pattern: RegExp }[] = [
  { what: 'a Map', output: { m: new Map([['a', 1]]) }, pattern: /Map/ },
  { what: 'a Set', output: { s: new Set([1]) }, pattern: /Set/ },
  {
    what: 'a class holding only #private state',
    output: new WithPrivate(),
    pattern: /WithPrivate/,
  },
  { what: 'a boxed primitive', output: { s: new String('a') }, pattern: /String/ },
  { what: 'a lone surrogate in a value', output: { a: 'x\ud800y' }, pattern: /lone surrogate/ },
  { what: 'a lone surrogate in a key', output: { 'k\udc00': 1 }, pattern: /lone surrogate/ },
  {
    what: 'a lone surrogate returned by toJSON',
    output: { toJSON: () => 'z\ud83d' },
    pattern: /lone surrogate/,
  },
  { what: 'a nested promise', output: { p: Promise.resolve(1) }, pattern: /Promise/ },
];

for (const { what, output, pattern } of VOID_OUTPUTS) {
  test(`stage(): canonicalizer output holding ${what} throws and writes no draft`, async () => {
    const { store, handles } = stagingSetup(() => output);
    await assert.rejects(
      () => handles.agent.stage(CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF),
      pattern,
    );
    assert.equal(store.puts, 0);
  });
}

test('well-formed supplementary characters and a Date (via toJSON) still bind', async () => {
  const { store, handles } = stagingSetup(() => ({ e: '\u{1F600}', at: new Date(0) }));
  const staged = await handles.agent.stage(CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  assert.equal(staged.status, 'ok');
  assert.equal(store.puts, 1);
});

test('bindContent digests exactly what the default canonicalize path digests for clean content', () => {
  const c = { b: 2, a: [1, 'é', '\u{1F600}'] };
  assert.equal(
    bindContent((x) => x, 'ref', c),
    digest(canonicalize(c)),
  );
});

// === the five other seams ==============================================================

type Seam = 'finalize' | 'decline' | 'redeem' | 'beginRedemption' | 'completeRedemption';

async function seamSetup(seam: Seam) {
  const { canonicalizer, turnAsync } = turningAsync();
  const store = new MemoryStore();
  const profile =
    seam === 'finalize' || seam === 'decline'
      ? captureProfile({ decline: true })
      : effectSeamProfile();
  const handles = create(
    makeConfig([profile], {
      store,
      canonicalizers: { [DEFAULT_CANONICALIZER_REF]: canonicalizer },
    }),
  );
  const recordId = await openRecord(handles, CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  let token = '';
  if (seam !== 'finalize' && seam !== 'decline') {
    const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
    assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  }
  if (seam === 'completeRedemption') {
    const begun = await handles.operator.beginRedemption(recordId, CONTENT);
    assert.equal(begun.status, 'ok', 'fixture: beginRedemption must succeed');
    if (begun.status !== 'ok') throw new Error('unreachable');
    token = begun.value.token;
  }
  const call = (): Promise<unknown> => {
    switch (seam) {
      case 'finalize':
        return handles.operator.finalize(recordId, identity(), CONTENT, facts());
      case 'decline':
        return handles.operator.decline(recordId, identity(), CONTENT, facts());
      case 'redeem':
        return handles.operator.redeem(recordId, CONTENT);
      case 'beginRedemption':
        return handles.operator.beginRedemption(recordId, CONTENT);
      case 'completeRedemption':
        return handles.operator.completeRedemption(recordId, token, CONTENT);
    }
  };
  return { store, recordId, call, turnAsync };
}

for (const seam of [
  'finalize',
  'decline',
  'redeem',
  'beginRedemption',
  'completeRedemption',
] as const) {
  test(`${seam}(): a canonicalizer that turns async throws the thenable refusal, appends nothing and leaves no unobserved rejection`, async () => {
    const { store, recordId, call, turnAsync } = await seamSetup(seam);
    const before = await store.readChain(recordId);
    turnAsync();
    const seen = await unhandledDuring(async () => {
      await assert.rejects(call, /returned a thenable — a canonicalizer is synchronous/);
    });
    assert.deepEqual(seen, [], 'the rejection was handled');
    assert.deepEqual(await store.readChain(recordId), before, 'the chain is untouched');
  });
}
