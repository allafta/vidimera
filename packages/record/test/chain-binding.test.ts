// @vidimera/record — chain-binding.test.ts: a loaded chain is bound to the recordId it was
// requested for. `verifyChain(chain, recordId)` compares every row, and the genesis link,
// against the requested id rather than against whatever the first row claims.

import assert from 'node:assert/strict';
import { sign as edSign, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import { verifyChain } from '../src/chain/replay.js';
import type { ConfirmProfile } from '../src/config.js';
import { createWithClock } from '../src/create.js';
import { resolveDueClock } from '../src/kernel/expiry.js';
import { appendChainCompromise, refuseMaybeAppend } from '../src/kernel/finalize.js';
import { profileDigest } from '../src/profile-digest.js';
import { withSigning } from '../src/signing/decorate.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { SigningConfig } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Transition } from '../src/types.js';
import { buildChain } from './helpers/chain.js';
import { captureProfile, makeConfig, openRecord } from './helpers/profiles.js';
import { enforceableSigningSetup } from './helpers/signing.js';
import { RelocatingStore } from './helpers/stores.js';

function chainFor(recordId: string): Transition[] {
  return buildChain(recordId, [
    { kind: 'opened', payload: { n: 1 } },
    { kind: 'consultation-recorded', payload: { n: 2 } },
    { kind: 'confirmed', payload: { n: 3 } },
  ]);
}

// === verifyChain(chain, recordId) ====================================================

test('verifyChain(chain, recordId): a wholly relocated chain breaks at seq 1, naming both ids', () => {
  const result = verifyChain(chainFor('rec-Y'), 'rec-X');
  assert.equal(result.intact, false);
  if (result.intact) return;
  assert.equal(result.firstBreakSeq, 1);
  assert.match(result.detail, /rec-X/);
  assert.match(result.detail, /rec-Y/);
});

test('verifyChain(chain, recordId): a relabelled chain breaks at seq 1 on the genesis link', () => {
  // Every row claims 'rec-X' and links 2..n are recomputed, but the genesis prevHash is still
  // the one derived from 'rec-Y'.
  const [a, b, c] = chainFor('rec-Y');
  assert.ok(a !== undefined && b !== undefined && c !== undefined);
  const first: Transition = { ...a, recordId: 'rec-X' };
  const second: Transition = { ...b, recordId: 'rec-X', prevHash: transitionDigest(first) };
  const third: Transition = { ...c, recordId: 'rec-X', prevHash: transitionDigest(second) };

  const result = verifyChain([first, second, third], 'rec-X');
  assert.equal(result.intact, false);
  if (result.intact) return;
  assert.equal(result.firstBreakSeq, 1);
  assert.match(result.detail, /genesis prevHash/);
});

test('verifyChain(chain, recordId): a mixed chain breaks at the foreign row', () => {
  const [a, b, c] = chainFor('rec-X');
  assert.ok(a !== undefined && b !== undefined && c !== undefined);
  const foreign: Transition = { ...b, recordId: 'rec-Y' };
  const relinked: Transition = { ...c, prevHash: transitionDigest(foreign) };

  const result = verifyChain([a, foreign, relinked], 'rec-X');
  assert.equal(result.intact, false);
  if (result.intact) return;
  assert.equal(result.firstBreakSeq, 2);
});

test('verifyChain(chain, recordId): the matching id reports intact', () => {
  assert.deepEqual(verifyChain(chainFor('rec-X'), 'rec-X'), { intact: true });
});

test("verifyChain(chain): omitting recordId keeps today's behavior", () => {
  assert.deepEqual(verifyChain(chainFor('rec-Y')), { intact: true });
});

// === builders: every library-built transition is addressed by the caller's recordId ===

const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);

/** Opens two identical records X and Y on one store; the builders get Y's chain and X's id. */
async function twoRecords(profile = captureProfile()) {
  const clock = { t: T0 };
  const store = new MemoryStore();
  const handles = createWithClock(makeConfig([profile], { store }), () => new Date(clock.t));
  const content = { subject: 'week-1', total: 40 };
  const x = await openRecord(handles, content, profile.id, 'subject:x');
  const y = await openRecord(handles, content, profile.id, 'subject:y');
  const yChain = await store.readChain(y);
  const resolved = {
    profile,
    canonicalizer: (c: unknown) => c,
    effectSeam: false,
    profileDigest: profileDigest(profile),
  };
  return { clock, store, x, y, yChain, resolved };
}

test('appendChainCompromise: the edge carries the recordId argument, not the chain', async () => {
  const { store, x, y, yChain } = await twoRecords();
  const yBefore = await store.readChain(y);
  const out = await appendChainCompromise(store, x, yChain, () => new Date(T0));
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise');
  assert.ok(out.transitionRef !== undefined);
  const last = (await store.readChain(x)).at(-1);
  assert.equal(last?.recordId, x);
  assert.equal(last?.seq, 2);
  assert.equal(last?.kind, 'refused');
  assert.deepEqual(last?.payload, { code: 'chain-compromise' });
  assert.deepEqual(await store.readChain(y), yBefore);
});

test('refuseMaybeAppend: the edge carries the recordId argument', async () => {
  const profile = captureProfile({ terminalRefusals: ['content-drift'] });
  const { store, x, y, yChain, resolved } = await twoRecords(profile);
  const yBefore = await store.readChain(y);
  const leg = profile.legs[0];
  assert.ok(leg !== undefined);
  const out = await refuseMaybeAppend(
    store,
    x,
    'content-drift',
    leg,
    yChain,
    resolved,
    true,
    () => new Date(T0),
  );
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.ok(out.transitionRef !== undefined);
  const last = (await store.readChain(x)).at(-1);
  assert.equal(last?.recordId, x);
  assert.equal(last?.seq, 2);
  assert.equal(last?.kind, 'refused');
  assert.deepEqual(last?.payload, { code: 'content-drift' });
  assert.deepEqual(await store.readChain(y), yBefore);
});

test('resolveDueClock: the clock edge carries the recordId argument', async () => {
  const { store, x, y, yChain, resolved } = await twoRecords();
  const yBefore = await store.readChain(y);
  const res = await resolveDueClock(store, x, yChain, resolved, new Date(T0 + 400 * 3600_000));
  assert.equal(res.due, true);
  if (!res.due) return;
  assert.equal(res.result.appended, true);
  const last = (await store.readChain(x)).at(-1);
  assert.equal(last?.recordId, x);
  assert.equal(last?.kind, 'expired');
  assert.deepEqual(await store.readChain(y), yBefore);
});

// === decorator: the signing decision is never cached from a foreign genesis ============

/**
 * X and Y on one inner store (S signs, N does not), a FRESH decorator over a relocating
 * wrapper with its own sidecar, and a `refused`/`chain-compromise` transition addressed to X.
 */
async function decoratorRig(xProfile: 'S' | 'N') {
  const S: ConfirmProfile = { ...captureProfile({ id: 'test.dec.s.v1' }), signing: true };
  const N: ConfirmProfile = captureProfile({ id: 'test.dec.n.v1' });
  const inner = new MemoryStore();
  const { handles } = enforceableSigningSetup([S, N], { store: inner });
  const content = { subject: 'week-1', total: 40 };
  const [xp, yp] = xProfile === 'S' ? [S, N] : [N, S];
  const x = await openRecord(handles, content, xp.id, 'subject:x');
  const y = await openRecord(handles, content, yp.id, 'subject:y');
  const relocating = new RelocatingStore(inner);
  const signatures = new MemorySignatureStore();
  const { privateKey } = generateKeyPairSync('ed25519');
  const signing: SigningConfig = {
    signer: async (bytes) => ({
      keyRef: 'key-1',
      signature: edSign(null, bytes, privateKey).toString('base64'),
    }),
    verifiers: {},
    signatures,
  };
  const decorated = withSigning(signing, relocating, (id) => id === S.id);
  const edge = async (): Promise<Transition> => {
    const chain = await inner.readChain(x);
    const last = chain.at(-1);
    assert.ok(last !== undefined);
    return {
      recordId: x,
      seq: last.seq + 1,
      at: new Date(T0).toISOString(),
      kind: 'refused',
      payload: { code: 'chain-compromise' },
      prevHash: transitionDigest(last),
    };
  };
  const append = async (t: Transition): Promise<void> => {
    await decorated.appendTransition('open', t, { nonTerminal: false }).catch(() => undefined);
  };
  return { x, y, relocating, signatures, edge, append };
}

test('decorator: a foreign genesis on a cold read signs the transition', async () => {
  const { x, y, relocating, signatures, edge, append } = await decoratorRig('S');
  relocating.relocate(x, y);
  const t = await edge();
  await append(t);
  const entries = await signatures.listByRecord(x);
  assert.ok(entries.some((e) => e.transitionDigest === transitionDigest(t)));
});

test('decorator: a foreign genesis is never cached', async () => {
  const { x, y, relocating, signatures, edge, append } = await decoratorRig('N');
  relocating.relocate(x, y);
  await append(await edge());
  assert.equal((await signatures.listByRecord(x)).length, 1, 'the foreign read signed');
  relocating.restore();
  await append(await edge());
  assert.equal(
    (await signatures.listByRecord(x)).length,
    1,
    'X is honestly non-signing: the second append adds no entry',
  );
});
