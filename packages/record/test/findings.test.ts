// @vidimera/record — findings.test.ts (SPEC §10.2 "Findings & acknowledgments"): the
// READ half (the first step-7 increment) — the replay folds, the counting-ack predicate,
// the coverage derivation, and the review projection — every chain there is HAND-BUILT
// (buildChain + a seeded store), independent of the seams that mint the transitions those
// folds read. The coverage GATE section below (the second step-7 increment) is the
// refusal matrix's named production-path home for `ack-missing`/`ack-stale`; it drives
// the real seams (`create`/`openRecord`/`raiseFinding`/`acknowledge`) end to end rather
// than hand-building chains. Digest-only throughout: finding content never appears (§3).

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { replay } from '../src/chain/replay.js';
import type { ConfirmProfile, LegSpec } from '../src/config.js';
import { create } from '../src/create.js';
import { ackCounts, findingCoverage } from '../src/kernel/findings.js';
import { MemoryStore } from '../src/store/memory.js';
import type { RecordedAck, RecordedFinding } from '../src/types.js';
import { buildChain } from './helpers/chain.js';
import { captureProfile, facts, identity, makeConfig, openRecord } from './helpers/profiles.js';

const SUBJECT = 'subject:fnd-1';
const D1 = `sha256:${'1'.repeat(64)}`;
const D2 = `sha256:${'2'.repeat(64)}`;
const RAISER = { principal: 'checker:1', authority: 'mtls:checker' };
const OTHER = { principal: 'approver:2', authority: 'session:test-app' };
const CONTENT2 = { subject: 'week-2', total: 41 };

/** captureProfile with the leg's findings flow declared (both-or-neither pair) — the
 * gate section's own local fixture, identical in shape to findings-seams.test.ts's (the
 * established per-file-fixture convention: two test files, two small local builders). */
function flowProfile(extra?: Partial<LegSpec>): ConfirmProfile {
  const p = captureProfile({ id: 'test.flow.v1' });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  p.legs[0] = { ...leg, ackMode: 'any' as const, requiredAcks: ['variance'], ...extra };
  return p;
}

function openedStep(profileId = 'test.capture.v1') {
  return {
    kind: 'opened' as const,
    payload: {
      profileId,
      profileDigest: `sha256:${'0'.repeat(64)}`,
      legId: 'approver-decide',
      subjectRef: SUBJECT,
      contentDigest: `sha256:${'c'.repeat(64)}`,
    },
  };
}
function raise(findingId: string, extra?: Record<string, unknown>) {
  return {
    kind: 'finding-raised' as const,
    payload: {
      findingId,
      kind: 'variance',
      findingDigest: D1,
      raiser: RAISER,
      ...extra,
    },
  };
}
function ackStep(findingId: string, extra?: Record<string, unknown>) {
  return {
    kind: 'acknowledged' as const,
    payload: { findingId, findingDigest: D1, acker: OTHER, ...extra },
  };
}

test('replay folds a raise, an update, and acks — first-raise order, current version, fidelity', () => {
  const chain = buildChain('rec-fnd-1', [
    openedStep(),
    raise('f-1'),
    raise('f-2', { magnitude: '250 SEK' }),
    ackStep('f-1'),
    // f-1 re-raised: digest, magnitude, and raiser all move to the new version; the
    // earlier ack now names a stale version (recorded, visibly non-counting — the
    // predicate's business, never replay's):
    {
      kind: 'finding-raised' as const,
      payload: { findingId: 'f-1', kind: 'variance', findingDigest: D2, raiser: OTHER },
    },
  ]);
  const record = replay(chain);
  assert.ok(record.findings !== undefined);
  assert.deepEqual(
    record.findings.map((f) => f.findingId),
    ['f-1', 'f-2'],
    'first-raise order survives the update',
  );
  const f1 = record.findings[0];
  assert.ok(f1 !== undefined);
  assert.deepEqual(
    Object.keys(f1).sort(),
    ['acks', 'findingDigest', 'findingId', 'kind', 'raiser'],
    'the projected finding key set — magnitude cleared by the update',
  );
  assert.equal(f1.findingDigest, D2, 'current version wins');
  assert.deepEqual(f1.raiser, OTHER, 'the raiser moves with the version');
  assert.equal('magnitude' in f1, false, 'an update without magnitude clears it');
  assert.equal(f1.acks.length, 1, 'the stale ack stays recorded — fidelity, not validity');
  assert.equal(record.state, 'open', 'neither kind moves state');
});

test('replay throws on chain shapes the seams forbid: a kind mutation; an ack to an absent findingId', () => {
  const kindMutation = buildChain('rec-fnd-2', [
    openedStep(),
    raise('f-1'),
    {
      kind: 'finding-raised' as const,
      payload: { findingId: 'f-1', kind: 'CHANGED', findingDigest: D2, raiser: RAISER },
    },
  ]);
  assert.throws(() => replay(kindMutation), /kind/i);

  const orphanAck = buildChain('rec-fnd-3', [openedStep(), ackStep('f-none')]);
  assert.throws(() => replay(orphanAck), /findingId|finding/i);
});

test('a findings-free record omits the key', () => {
  const plain = buildChain('rec-fnd-4', [openedStep()]);
  assert.equal('findings' in replay(plain), false);
});

test('ackCounts: current digest, magnitude both directions, principal-only ackMode, missing principal fails closed', () => {
  const finding: RecordedFinding = {
    findingId: 'f-1',
    kind: 'variance',
    findingDigest: D2,
    magnitude: '250 SEK',
    raiser: RAISER,
    acks: [],
  };
  const good: RecordedAck = { findingDigest: D2, magnitude: '250 SEK', acker: OTHER };
  assert.equal(ackCounts(finding, good, 'any'), true);
  assert.equal(ackCounts(finding, good, 'counterparty'), true);
  assert.equal(ackCounts(finding, good, 'self'), false, 'self demands the raiser principal');
  assert.equal(
    ackCounts(finding, { ...good, acker: RAISER }, 'self'),
    true,
    'the raiser acknowledging their own finding',
  );

  // Stale digest never counts:
  assert.equal(ackCounts(finding, { ...good, findingDigest: D1 }, 'any'), false);
  // Magnitude present-iff-present, BOTH directions, exact:
  assert.equal(ackCounts(finding, { findingDigest: D2, acker: OTHER }, 'any'), false);
  assert.equal(ackCounts(finding, { ...good, magnitude: '251 SEK' }, 'any'), false);
  const noMagnitude: RecordedFinding = { ...finding, magnitude: undefined };
  assert.equal(
    ackCounts(noMagnitude, good, 'any'),
    false,
    'an ack naming a magnitude the finding does not carry',
  );
  // Principal-only: the raiser's principal under a DIFFERENT authority is still the
  // raiser — a counterparty ack from it does NOT count (the fail-closed direction the
  // SoD gate established; here in the counting direction):
  assert.equal(
    ackCounts(
      finding,
      { ...good, acker: { ...RAISER, authority: 'session:other' } },
      'counterparty',
    ),
    false,
  );
  // Missing/empty principal fails closed on either side:
  assert.equal(
    ackCounts(finding, { ...good, acker: { principal: '', authority: 'mtls:x' } }, 'any'),
    false,
  );
  assert.equal(
    ackCounts({ ...finding, raiser: { principal: '', authority: 'mtls:x' } }, good, 'counterparty'),
    false,
  );
});

test('findingCoverage: not-required never gates; ack-missing vs ack-stale; covered; the undeclared flow; order', () => {
  const covered: RecordedFinding = {
    findingId: 'f-a',
    kind: 'variance',
    findingDigest: D1,
    raiser: RAISER,
    acks: [{ findingDigest: D1, acker: OTHER }],
  };
  const unacked: RecordedFinding = {
    findingId: 'f-b',
    kind: 'variance',
    findingDigest: D1,
    raiser: RAISER,
    acks: [],
  };
  const staleOnly: RecordedFinding = {
    findingId: 'f-c',
    kind: 'variance',
    findingDigest: D2,
    raiser: RAISER,
    acks: [{ findingDigest: D1, acker: OTHER }],
  };
  const informational: RecordedFinding = {
    findingId: 'f-d',
    kind: 'note',
    findingDigest: D1,
    raiser: RAISER,
    acks: [],
  };

  const rows = findingCoverage([covered, unacked, staleOnly, informational], 'any', ['variance']);
  assert.deepEqual(
    rows.map((r) => [r.finding.findingId, r.coverage]),
    [
      ['f-a', 'covered'],
      ['f-b', 'ack-missing'],
      ['f-c', 'ack-stale'],
      ['f-d', 'not-required'],
    ],
  );

  // The undeclared flow classifies everything not-required (§10.2's vacuous-pass rule
  // falls out: zero non-covered entries):
  const undeclared = findingCoverage([unacked], undefined, undefined);
  assert.deepEqual(
    undeclared.map((r) => r.coverage),
    ['not-required'],
  );
  assert.deepEqual(findingCoverage(undefined, 'any', ['variance']), []);
});

test('findingCoverage: ackMode undefined with a required kind fails closed — no ack ever counts', () => {
  // A required kind with no declared `ackMode` is a half-declared state no profile this
  // build can construct (ackMode/requiredAcks both still GOVERNED, config.ts) — reachable
  // here only as a direct call, since findingCoverage is an exported pure function. It must
  // fail CLOSED: the ack below would count under 'any' (current digest, no magnitude on
  // either side), yet with no declared mode it still doesn't.
  const wouldCountUnderAny: RecordedFinding = {
    findingId: 'f-e',
    kind: 'variance',
    findingDigest: D1,
    raiser: RAISER,
    acks: [{ findingDigest: D1, acker: OTHER }],
  };
  const unacked: RecordedFinding = {
    findingId: 'f-f',
    kind: 'variance',
    findingDigest: D1,
    raiser: RAISER,
    acks: [],
  };
  assert.deepEqual(
    findingCoverage([wouldCountUnderAny, unacked], undefined, ['variance']).map((r) => r.coverage),
    ['ack-stale', 'ack-missing'],
  );
});

test('replay folds two acks onto one finding in chain order', () => {
  const chain = buildChain('rec-fnd-7', [
    openedStep(),
    raise('f-1'),
    ackStep('f-1', { acker: RAISER }),
    ackStep('f-1', { acker: OTHER }),
  ]);
  const record = replay(chain);
  assert.ok(record.findings !== undefined);
  const f1 = record.findings[0];
  assert.ok(f1 !== undefined);
  assert.deepEqual(
    f1.acks.map((a) => a.acker.principal),
    [RAISER.principal, OTHER.principal],
    'acks preserve chain order, first-appended first',
  );
});

test('the own-namespace pin: a finding kind named facts is LEGAL — reserved consultation kinds do not apply', () => {
  // SPEC §10.2: "the reserved consultation kinds do not apply to them".
  const chain = buildChain('rec-fnd-5', [
    openedStep(),
    {
      kind: 'finding-raised' as const,
      payload: { findingId: 'f-1', kind: 'facts', findingDigest: D1, raiser: RAISER },
    },
  ]);
  const record = replay(chain);
  assert.equal(record.findings?.[0]?.kind, 'facts');
});

test('review() projects the findings digest-only with per-finding coverage', async () => {
  const store = new MemoryStore();
  const chain = buildChain('rec-fnd-6', [openedStep(), raise('f-1'), ackStep('f-1')]);
  for (const [i, t] of chain.entries()) {
    const res = await store.appendTransition(i === 0 ? null : 'open', t, {
      nonTerminal: true,
    });
    assert.equal(res.appended, true, `fixture: seed append ${i} must land`);
  }
  const handles = create(makeConfig([captureProfile()], { store }));
  const view = await handles.operator.review('rec-fnd-6');
  assert.equal(view.status, 'ok');
  if (view.status !== 'ok') return;
  assert.ok(view.value.findings !== undefined);
  const row = view.value.findings[0];
  assert.ok(row !== undefined);
  assert.deepEqual(Object.keys(row).sort(), ['coverage', 'findingDigest', 'findingId', 'kind']);
  assert.equal(row.coverage, 'not-required', 'captureProfile declares no flow — conservative read');
  // Digest-only: no content field anywhere in the projection.
});

// === the coverage gate: rung (5.7) (SPEC §10.2; the second step-7 increment) ===

test('ack-missing: a raised required-kind finding with zero acks refuses at finalize; an ack re-arms it', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT2, 'test.flow.v1', 'subject:gate-a');
  await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  const out = await handles.operator.finalize(recordId, identity(), CONTENT2, facts());
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'ack-missing');
  assert.equal((await handles.operator.getRecord(recordId))?.state, 'open', 'open by default');

  await handles.operator.acknowledge(recordId, { findingId: 'f-1', findingDigest: D1 }, identity());
  const retry = await handles.operator.finalize(recordId, identity(), CONTENT2, facts());
  assert.equal(retry.status, 'ok', 'a counting ack re-arms the same open record');
});

test('ack-stale: stale digest, magnitude mismatch, and an ackMode-violating ack each refuse', async () => {
  for (const [ack, mode] of [
    [{ findingId: 'f-1', findingDigest: D1 }, 'any'], // stale digest (current is D2)
    [{ findingId: 'f-1', findingDigest: D2 }, 'any'], // finding has magnitude, ack has none
    [{ findingId: 'f-1', findingDigest: D2, magnitude: '250 SEK' }, 'counterparty'], // acker below = raiser
  ] as const) {
    const store = new MemoryStore();
    const handles = create(
      makeConfig([flowProfile({ ackMode: mode as 'any' | 'counterparty' })], { store }),
    );
    const recordId = await openRecord(handles, CONTENT2, 'test.flow.v1', 'subject:gate-b');
    await handles.operator.raiseFinding(
      recordId,
      { findingId: 'f-1', kind: 'variance', findingDigest: D2, magnitude: '250 SEK' },
      RAISER,
    );
    const acker = mode === 'counterparty' ? RAISER : identity();
    await handles.operator.acknowledge(recordId, ack as never, acker);
    const out = await handles.operator.finalize(recordId, identity(), CONTENT2, facts());
    assert.equal(out.status, 'refused');
    if (out.status === 'refused') assert.equal(out.code, 'ack-stale');
  }
});

test('vacuous pass and non-required kinds: zero raised required findings pass; a non-required kind never gates', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT2, 'test.flow.v1', 'subject:gate-c');
  await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-note', kind: 'note', findingDigest: D1 },
    RAISER,
  );
  const out = await handles.operator.finalize(recordId, identity(), CONTENT2, facts());
  assert.equal(out.status, 'ok', 'requiredAcks gates raised findings of REQUIRED kinds only');
});

test('first trip in first-raise order: the FIRST non-covered required finding names the code', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([flowProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT2, 'test.flow.v1', 'subject:gate-d');
  await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  ); // will be ack-missing
  await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-2', kind: 'variance', findingDigest: D2 },
    RAISER,
  );
  await handles.operator.acknowledge(recordId, { findingId: 'f-2', findingDigest: D1 }, identity()); // stale
  const out = await handles.operator.finalize(recordId, identity(), CONTENT2, facts());
  assert.equal(out.status, 'refused');
  if (out.status === 'refused')
    assert.equal(out.code, 'ack-missing', "f-1's code, not f-2's ack-stale");
});

test('terminalRefusals can end the leg on ack-missing: the refusal appends and the record refuses', async () => {
  const store = new MemoryStore();
  const handles = create(
    makeConfig([flowProfile({ terminalRefusals: ['ack-missing'] })], { store }),
  );
  const recordId = await openRecord(handles, CONTENT2, 'test.flow.v1', 'subject:gate-e');
  await handles.operator.raiseFinding(
    recordId,
    { findingId: 'f-1', kind: 'variance', findingDigest: D1 },
    RAISER,
  );
  const out = await handles.operator.finalize(recordId, identity(), CONTENT2, facts());
  assert.equal(out.status, 'refused');
  const rec = await handles.operator.getRecord(recordId);
  assert.equal(rec?.state, 'refused');
  assert.equal(rec?.refusalCode, 'ack-missing');
});
