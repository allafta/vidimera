// @vidimera/record — recovery.test.ts (SPEC §2 "Recovery (`supersedes`)", the step-8
// recovery increment): open() verifies the host's terminal-predecessor claim by replay
// BEFORE the record exists and binds the verified reference into the genesis.
// Decisions of record pinned here: the dedicated never-append code
// `supersedes-unverified`; sequential exclusivity (verify-then-open — terminality is
// one-way); no en-passant resolution of the predecessor's clock (seal's sweeps-first
// posture); same subject required, any successor profile allowed while the instance holds
// the predecessor's own profile (the supersedes-binding increment); no back-reference ever
// appended to the predecessor.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { create, createWithClock } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  captureProfile,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
  tamperNonLast,
  twoLegProfile,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };
const WRONG = { subject: 'week-1', total: 41 };
const SUBJ = 'subject:rec-1';
const HEAD64 = `sha256:${'9'.repeat(64)}`;

type Handles = ReturnType<typeof create>;

/** Drives a record to an APPENDED refused terminal state (content-drift listed
 * terminal), returning { recordId, chainHead }. */
async function refusedPredecessor(
  handles: Handles,
  profileId: string,
  subjectRef: string,
): Promise<{ recordId: string; chainHead: string }> {
  const recordId = await openRecord(handles, CONTENT, profileId, subjectRef);
  const out = await handles.operator.finalize(recordId, identity(), WRONG, facts());
  assert.equal(out.status, 'refused', 'fixture: the drifted finalize must refuse');
  const rec = await handles.operator.getRecord(recordId);
  assert.equal(rec?.state, 'refused', 'fixture: content-drift must be terminal here');
  const head = await handles.operator.chainHead(recordId);
  assert.ok(head !== null);
  return { recordId, chainHead: head };
}

/** captureProfile with content-drift terminal, under a given id. */
function terminalProfile(id: string) {
  return captureProfile({ id, terminalRefusals: ['content-drift'] });
}

test('happy path: a refused predecessor recovers — the genesis binds the verified reference and replay folds it', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([terminalProfile('test.rec.v1')], { store }));
  const pred = await refusedPredecessor(handles, 'test.rec.v1', SUBJ);

  const staged = await handles.agent.stage(CONTENT, 'test.rec.v1', SUBJ);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const opened = await handles.operator.open(staged.value.stagedRef, { supersedes: pred });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') return;

  const rec = await handles.operator.getRecord(opened.value.recordId);
  assert.deepEqual(rec?.supersedes, pred, 'replay folds the verified reference');
  const chain = await handles.operator.readChain(opened.value.recordId);
  const genesis = chain[0];
  assert.ok(genesis !== undefined);
  const payload = genesis.payload as Record<string, unknown>;
  assert.deepEqual(payload.supersedes, pred, 'the genesis snapshot carries it verbatim');
  assert.deepEqual(
    Object.keys(payload).sort(),
    ['contentDigest', 'legId', 'profileDigest', 'profileId', 'subjectRef', 'supersedes'],
    'present-iff-supplied: exactly the base key set plus supersedes',
  );
});

test('an expired predecessor and a terminal redeemed predecessor both qualify — terminality, under a held profile, is the condition', async () => {
  // Expired: clock-driven, swept via the finalize seam observing the lapse.
  const store = new MemoryStore();
  let now = new Date('2026-08-17T10:00:00.000Z');
  const handles = createWithClock(
    makeConfig([terminalProfile('test.rec.v1')], { store }),
    () => now,
  );
  const expiredId = await openRecord(handles, CONTENT, 'test.rec.v1', 'subject:rec-exp');
  now = new Date('2026-08-17T12:00:01.000Z');
  const lapse = await handles.operator.finalize(expiredId, identity(), CONTENT, facts());
  assert.equal(lapse.status, 'refused');
  if (lapse.status === 'refused') assert.equal(lapse.code, 'leg-expired');
  assert.equal((await handles.operator.getRecord(expiredId))?.state, 'expired');
  const expHead = await handles.operator.chainHead(expiredId);
  assert.ok(expHead !== null);
  const staged1 = await handles.agent.stage(CONTENT, 'test.rec.v1', 'subject:rec-exp');
  assert.equal(staged1.status, 'ok');
  if (staged1.status !== 'ok') return;
  const rec1 = await handles.operator.open(staged1.value.stagedRef, {
    supersedes: { recordId: expiredId, chainHead: expHead },
  });
  assert.equal(rec1.status, 'ok', 'an expired predecessor is terminal and recoverable');

  // Redeemed: the effect-seam happy path ends terminal via the release.
  const store2 = new MemoryStore();
  const h2 = create(
    makeConfig([effectSeamProfile({ id: 'test.rec.effect.v1' }), terminalProfile('test.rec.v1')], {
      store: store2,
    }),
  );
  const redeemedId = await openRecord(h2, CONTENT, 'test.rec.effect.v1', 'subject:rec-red');
  const fin = await h2.operator.finalize(redeemedId, identity(), CONTENT, facts());
  assert.equal(fin.status, 'ok');
  const red = await h2.operator.redeem(redeemedId, CONTENT);
  assert.equal(red.status, 'ok');
  const redHead = await h2.operator.chainHead(redeemedId);
  assert.ok(redHead !== null);
  const staged2 = await h2.agent.stage(CONTENT, 'test.rec.v1', 'subject:rec-red');
  assert.equal(staged2.status, 'ok');
  if (staged2.status !== 'ok') return;
  const rec2 = await h2.operator.open(staged2.value.stagedRef, {
    supersedes: { recordId: redeemedId, chainHead: redHead },
  });
  assert.equal(
    rec2.status,
    'ok',
    'a redeemed predecessor is terminal — the parenthetical is illustrative',
  );
});

test('non-terminal predecessors refuse supersedes-unverified: open, LAPSED-open (no en passant), and effect-seam confirmed', async () => {
  const store = new MemoryStore();
  let now = new Date('2026-08-17T10:00:00.000Z');
  const handles = createWithClock(
    makeConfig([terminalProfile('test.rec.v1'), effectSeamProfile({ id: 'test.rec.effect.v1' })], {
      store,
    }),
    () => now,
  );

  async function expectUnverified(predId: string, subjectRef: string) {
    const head = await handles.operator.chainHead(predId);
    assert.ok(head !== null);
    const staged = await handles.agent.stage(CONTENT, 'test.rec.v1', subjectRef);
    assert.equal(staged.status, 'ok');
    if (staged.status !== 'ok') throw new Error('unreachable');
    const before = await handles.operator.readChain(predId);
    const out = await handles.operator.open(staged.value.stagedRef, {
      supersedes: { recordId: predId, chainHead: head },
    });
    assert.equal(out.status, 'refused');
    if (out.status === 'refused') assert.equal(out.code, 'supersedes-unverified');
    assert.deepEqual(
      await handles.operator.readChain(predId),
      before,
      'never-append AND no en-passant edge on the predecessor',
    );
  }

  const openId = await openRecord(handles, CONTENT, 'test.rec.v1', 'subject:rec-open');
  await expectUnverified(openId, 'subject:rec-open2');

  const lapsedId = await openRecord(handles, CONTENT, 'test.rec.v1', 'subject:rec-lapse');
  now = new Date('2026-08-17T12:00:01.000Z');
  // Verification is a pure read: the lapsed record still replays as open — the
  // operator sweeps first, then recovers (seal's own sweeps-first posture).
  await expectUnverified(lapsedId, 'subject:rec-lapse2');

  const confirmedId = await openRecord(handles, CONTENT, 'test.rec.effect.v1', 'subject:rec-eff');
  const fin = await handles.operator.finalize(confirmedId, identity(), CONTENT, facts());
  assert.equal(fin.status, 'ok');
  // A final-leg confirmed on an effect-seam profile is NON-terminal (awaits redemption).
  await expectUnverified(confirmedId, 'subject:rec-eff2');
});

test('a confirmed capture-terminal predecessor qualifies; under an UNRESOLVABLE profile it fails closed', async () => {
  const store = new MemoryStore();
  const handles = create(
    makeConfig([captureProfile({ id: 'test.rec.cap.v1' }), terminalProfile('test.rec.v1')], {
      store,
    }),
  );
  const capId = await openRecord(handles, CONTENT, 'test.rec.cap.v1', 'subject:rec-cap');
  const fin = await handles.operator.finalize(capId, identity(), CONTENT, facts());
  assert.equal(fin.status, 'ok');
  const head = await handles.operator.chainHead(capId);
  assert.ok(head !== null);

  const staged = await handles.agent.stage(CONTENT, 'test.rec.v1', 'subject:rec-cap');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const ok = await handles.operator.open(staged.value.stagedRef, {
    supersedes: { recordId: capId, chainHead: head },
  });
  assert.equal(ok.status, 'ok', 'single-leg capture confirmed is terminal — and cross-profile');

  // Same store, an instance that does NOT register the predecessor's profile: a
  // confirmed predecessor's terminality needs its profile — unprovable fails closed.
  const h2 = create(makeConfig([terminalProfile('test.rec.v1')], { store }));
  const staged2 = await h2.agent.stage(CONTENT, 'test.rec.v1', 'subject:rec-cap2');
  assert.equal(staged2.status, 'ok');
  if (staged2.status !== 'ok') return;
  const out = await h2.operator.open(staged2.value.stagedRef, {
    supersedes: { recordId: capId, chainHead: head },
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'supersedes-unverified');
});

test('claim failures refuse: head mismatch, absent predecessor, garbled chain, subject mismatch', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([terminalProfile('test.rec.v1')], { store }));
  const pred = await refusedPredecessor(handles, 'test.rec.v1', SUBJ);

  async function expectRefusal(
    supersedes: { recordId: string; chainHead: string },
    subjectRef = SUBJ,
  ) {
    const staged = await handles.agent.stage(CONTENT, 'test.rec.v1', subjectRef);
    assert.equal(staged.status, 'ok');
    if (staged.status !== 'ok') throw new Error('unreachable');
    const out = await handles.operator.open(staged.value.stagedRef, { supersedes });
    assert.equal(out.status, 'refused');
    if (out.status === 'refused') assert.equal(out.code, 'supersedes-unverified');
  }

  await expectRefusal({ recordId: pred.recordId, chainHead: HEAD64 }); // head mismatch
  await expectRefusal({ recordId: 'rec-none', chainHead: pred.chainHead }); // absent
  // Subject mismatch: the predecessor decided SUBJ; recovering a DIFFERENT subject.
  await expectRefusal(pred, 'subject:rec-other');

  // Garbled: a tampered copy of the predecessor chain in its own store.
  const tampered = new MemoryStore();
  const chain = await handles.operator.readChain(pred.recordId);
  for (const [i, t] of tamperNonLast(chain).entries()) {
    await tampered.appendTransition(i === 0 ? null : 'open', t, {
      nonTerminal: i < chain.length - 1,
    });
  }
  const h2 = create(makeConfig([terminalProfile('test.rec.v1')], { store: tampered }));
  const staged = await h2.agent.stage(CONTENT, 'test.rec.v1', SUBJ);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await h2.operator.open(staged.value.stagedRef, { supersedes: pred });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'supersedes-unverified');
});

test('a chain of recovery is legal: a terminal recovery record is itself a valid predecessor', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([terminalProfile('test.rec.v1')], { store }));
  const first = await refusedPredecessor(handles, 'test.rec.v1', SUBJ);

  const staged = await handles.agent.stage(CONTENT, 'test.rec.v1', SUBJ);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const second = await handles.operator.open(staged.value.stagedRef, { supersedes: first });
  assert.equal(second.status, 'ok');
  if (second.status !== 'ok') return;
  // Drive the recovery record terminal too, then recover THAT.
  const out = await handles.operator.finalize(second.value.recordId, identity(), WRONG, facts());
  assert.equal(out.status, 'refused');
  const head = await handles.operator.chainHead(second.value.recordId);
  assert.ok(head !== null);
  const staged2 = await handles.agent.stage(CONTENT, 'test.rec.v1', SUBJ);
  assert.equal(staged2.status, 'ok');
  if (staged2.status !== 'ok') return;
  const third = await handles.operator.open(staged2.value.stagedRef, {
    supersedes: { recordId: second.value.recordId, chainHead: head },
  });
  assert.equal(third.status, 'ok', 'an earlier superseded attempt is a legal predecessor');
});

test('order: exclusivity is decided at the genesis append, AFTER verification — a live blocker still refuses record-exists', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([terminalProfile('test.rec.v1')], { store }));
  const pred = await refusedPredecessor(handles, 'test.rec.v1', SUBJ);
  // A second, LIVE record now holds the (profile, subject) pair:
  const blocker = await openRecord(handles, CONTENT, 'test.rec.v1', SUBJ);
  assert.ok(blocker.length > 0);
  // Recovery names a perfectly valid terminal predecessor — verification passes, the
  // genesis append hits the ordinary exclusivity constraint:
  const staged = await handles.agent.stage(CONTENT, 'test.rec.v1', SUBJ);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await handles.operator.open(staged.value.stagedRef, { supersedes: pred });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'record-exists');
});

test('order: the sequencing rung outranks the recovery rung — jointly failing refuses prior-leg-unverified', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile({ id: 'test.rec.two.v1' })], { store }));
  // A successor-leg open with BAD prior-leg references AND a bad supersedes claim:
  const staged = await handles.agent.stage(CONTENT, 'test.rec.two.v1', SUBJ, 'checker-decide');
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await handles.operator.open(staged.value.stagedRef, {
    priorRecordRefs: [{ recordId: 'rec-none', chainHead: HEAD64 }],
    supersedes: { recordId: 'rec-none', chainHead: HEAD64 },
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') {
    assert.equal(out.code, 'prior-leg-unverified', 'the earlier pre-record rung wins');
  }
});

test('intake THROWS at argument depth on a malformed supersedes; the GOVERNED guard is gone; unknown keys still throw', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([terminalProfile('test.rec.v1')], { store }));
  const staged = await handles.agent.stage(CONTENT, 'test.rec.v1', SUBJ);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const ref = staged.value.stagedRef;

  for (const bad of [
    { recordId: '', chainHead: HEAD64 },
    { recordId: 'rec-1', chainHead: '' },
    { recordId: 'rec-1' },
    { recordId: 'rec-1', chainHead: HEAD64, extra: 'x' },
    'rec-1',
  ]) {
    await assert.rejects(handles.operator.open(ref, { supersedes: bad as never }), /supersedes/i);
  }
  // The lifted guard: a WELL-FORMED supersedes no longer throws GOVERNED (it refuses
  // or succeeds on its merits — here the predecessor is absent, so it refuses):
  const out = await handles.operator.open(ref, {
    supersedes: { recordId: 'rec-none', chainHead: HEAD64 },
  });
  assert.equal(out.status, 'refused');
  if (out.status === 'refused') assert.equal(out.code, 'supersedes-unverified');
  // Genuinely unknown keys keep the generic GOVERNED throw:
  await assert.rejects(
    handles.operator.open(ref, { nonsense: true } as never),
    /GOVERNED|nonsense/,
  );
});

test('a non-final-leg confirmed predecessor qualifies too — terminal FOR THAT LEG even though its own flow may continue', async () => {
  // Pin of ALREADY-LANDED behavior, not TDD: a mid-flow leg's `confirmed` is terminal
  // for THAT LEG by the derived formula (`isFinalLeg` false ⇒
  // `nonTerminal('confirmed', false, …)` false), a non-final confirmed leg admitting
  // the next leg without ceasing to be terminal for its own — SPEC §2's own reading —
  // so it already qualifies as a recovery predecessor under kernel/supersedes.ts's
  // `verifySupersedes`, even on `twoLegProfile`, whose own flow may still proceed to
  // the checker leg.
  const store = new MemoryStore();
  const handles = create(
    makeConfig([twoLegProfile({ id: 'test.rec.two.v1' }), terminalProfile('test.rec.v1')], {
      store,
    }),
  );
  // First leg: no priorRecordRefs needed (mirrors multi-leg.test.ts's own makerConcluded).
  const makerId = await openRecord(handles, CONTENT, 'test.rec.two.v1', SUBJ, 'maker-decide');
  const done = await handles.operator.finalize(makerId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the maker leg must confirm');
  assert.equal((await handles.operator.getRecord(makerId))?.state, 'confirmed');
  const head = await handles.operator.chainHead(makerId);
  assert.ok(head !== null);

  const staged = await handles.agent.stage(CONTENT, 'test.rec.v1', SUBJ);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const out = await handles.operator.open(staged.value.stagedRef, {
    supersedes: { recordId: makerId, chainHead: head },
  });
  assert.equal(
    out.status,
    'ok',
    'a non-final-leg confirmed is terminal FOR THAT LEG — a legal recovery predecessor',
  );
});
