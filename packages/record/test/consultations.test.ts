// @vidimera/record — consultations.test.ts (SPEC §11.1 "Consultations
// (required-consultation gating)", the ATTACH-FORM half; §9's finalize signature): the
// first step-5 increment's file. This file owns the intake-validator pins and, now that
// the surface is wired, the attach/recording pins too; the gate's pins are the second
// step-5 increment's.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConfirmProfile, ConsultationInput, LegSpec } from '../src/config.js';
import { create } from '../src/create.js';
import { validateConsultations } from '../src/kernel/consultations.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
  twoLegProfile,
} from './helpers/profiles.js';

const CHECKER = { principal: 'svc:risk-check', authority: 'mtls:risk-check' };
const DIGEST = `sha256:${'a'.repeat(64)}`;

function obtained(kind: string, extra?: Record<string, unknown>): ConsultationInput {
  return {
    kind,
    checker: CHECKER,
    payloadDigest: DIGEST,
    verdict: 'pass',
    ...extra,
  } as ConsultationInput;
}

test('validateConsultations: undefined and empty partition to nothing; order is preserved', () => {
  assert.deepEqual(validateConsultations(undefined), { obtained: [], unreachable: [] });
  assert.deepEqual(validateConsultations([]), { obtained: [], unreachable: [] });

  const parted = validateConsultations([
    obtained('risk-check'),
    { kind: 'sanctions', unreachable: true, authority: 'svc:sanctions' },
    { ...obtained('llm-judge'), verdict: 'fail' } as ConsultationInput,
  ]);
  assert.deepEqual(
    parted.obtained.map((entry) => entry.kind),
    ['risk-check', 'llm-judge'],
  );
  assert.deepEqual(
    parted.unreachable.map((entry) => entry.kind),
    ['sanctions'],
  );
});

test('validateConsultations: a non-array consultations value throws — the options bag itself is malformed, not an entry inside it', () => {
  // opts.consultations must be an array when supplied. Before this pin, null/string/object
  // reached `inputs.entries()` directly and threw a raw, unnamed TypeError instead of a
  // caller error naming the fault (distinct from the per-entry non-object pin below, which
  // covers a malformed ELEMENT inside an already-array consultations list).
  assert.throws(() => validateConsultations('nope' as never), /array/i);
  assert.throws(() => validateConsultations(null as never), /array/i);
  assert.throws(() => validateConsultations({ kind: 'x' } as never), /array/i);
});

test('validateConsultations: duplicate kinds throw — obtained+obtained AND obtained+marker', () => {
  assert.throws(
    () => validateConsultations([obtained('risk-check'), obtained('risk-check')]),
    /duplicate/i,
  );
  assert.throws(
    () =>
      validateConsultations([
        obtained('risk-check'),
        { kind: 'risk-check', unreachable: true, authority: 'svc:risk' },
      ]),
    /duplicate/i,
  );
});

test('validateConsultations: reserved kinds throw on BOTH shapes — a library control cannot be forged', () => {
  // SPEC §11.1: an input naming a reserved library-emitted kind (`facts` or
  // `chain-verify`) "would forge a library control" — a caller error, thrown loud.
  for (const kind of ['facts', 'chain-verify']) {
    assert.throws(() => validateConsultations([obtained(kind)]), /reserved/i);
    assert.throws(
      () => validateConsultations([{ kind, unreachable: true, authority: 'svc:x' }]),
      /reserved/i,
    );
  }
});

test('validateConsultations: malformed entries throw — shape is exact, unknown keys included', () => {
  // A host-supplied `at` is an UNKNOWN KEY: SPEC §11.1's "A consultation's `at` is
  // never accepted from the host" is enforced structurally — the shape has no at field.
  assert.throws(
    () => validateConsultations([obtained('k1', { at: '2026-01-01T00:00:00.000Z' })]),
    /unknown key|at/i,
  );
  // missing field:
  assert.throws(
    () =>
      validateConsultations([
        { kind: 'k1', checker: CHECKER, verdict: 'pass' } as unknown as ConsultationInput,
      ]),
    /payloadDigest|malformed/i,
  );
  // bad verdict:
  assert.throws(() => validateConsultations([obtained('k1', { verdict: 'maybe' })]), /verdict/i);
  // invalid checker:
  assert.throws(
    () =>
      validateConsultations([
        {
          kind: 'k1',
          checker: { principal: '', authority: '' },
          payloadDigest: DIGEST,
          verdict: 'pass',
        } as ConsultationInput,
      ]),
    /checker/i,
  );
  // present-but-empty payloadDigest (distinct from the missing-field pin above):
  assert.throws(
    () => validateConsultations([obtained('k1', { payloadDigest: '' })]),
    /payloadDigest/i,
  );
  // empty kind, both shapes:
  assert.throws(() => validateConsultations([obtained('')]), /kind/i);
  assert.throws(
    () => validateConsultations([{ kind: '', unreachable: true, authority: 'svc:x' }]),
    /kind/i,
  );
  // marker with empty authority, marker with unknown key, marker with unreachable !== true:
  assert.throws(
    () => validateConsultations([{ kind: 'k1', unreachable: true, authority: '' }]),
    /authority/i,
  );
  assert.throws(
    () =>
      validateConsultations([
        {
          kind: 'k1',
          unreachable: true,
          authority: 'svc:x',
          extra: 1,
        } as unknown as ConsultationInput,
      ]),
    /unknown key/i,
  );
  assert.throws(
    () =>
      validateConsultations([
        { kind: 'k1', unreachable: false, authority: 'svc:x' } as unknown as ConsultationInput,
      ]),
    /unreachable|malformed/i,
  );
  // non-object entry, non-string proofRef:
  assert.throws(
    () => validateConsultations(['nope' as unknown as ConsultationInput]),
    /malformed|entry/i,
  );
  assert.throws(() => validateConsultations([obtained('k1', { proofRef: 7 })]), /proofRef/i);
});

test('validateConsultations: observedAt must be RFC 3339 WITH an explicit offset — offset-less and date-only strings throw at intake (the AL2 freshness increment, final review)', () => {
  // Bare `Date.parse`-ability let an offset-less clock time or a date-only string
  // through, both parsed HOST-LOCAL — staleness would then depend on the machine's
  // timezone rather than the claimed instant. The shape check runs BEFORE Date.parse,
  // so both throw here instead of reaching the freshness gate at all.
  assert.throws(
    () => validateConsultations([obtained('k1', { observedAt: '2026-08-17T09:45:00' })]),
    /observedAt/i,
  );
  assert.throws(
    () => validateConsultations([obtained('k1', { observedAt: '2026-08-17' })]),
    /observedAt/i,
  );
  // An explicit non-Z offset is accepted structurally and records verbatim.
  const parted = validateConsultations([
    obtained('k1', { observedAt: '2026-08-17T09:45:00+02:00' }),
  ]);
  assert.equal(parted.obtained[0]?.observedAt, '2026-08-17T09:45:00+02:00');
});

// === the attach form at the seam (first step-5 increment) ===

const CONTENT = { subject: 'week-1', total: 40 };

test('the attach happy path: obtained consultations record in order, library-stamped, and a fail verdict is evidence, never a gate', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);

  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [
      { kind: 'risk-check', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
      {
        kind: 'llm-judge',
        checker: CHECKER,
        payloadDigest: DIGEST,
        verdict: 'fail',
        proofRef: 'trace:42',
      },
    ],
  });
  // SPEC §11.1: a non-required obtained consultation is "recorded as supplied —
  // including a `fail` verdict — as evidence, never a gate". No gate exists in the
  // first step-5 increment at all; finalize CONFIRMS.
  assert.equal(done.status, 'ok');

  const chain = await store.readChain(recordId);
  assert.equal(chain.length, 6); // opened, chain-verify, facts, risk-check, llm-judge, confirmed
  const [, , , third, fourth, confirmed] = chain;
  assert.ok(third !== undefined && fourth !== undefined && confirmed !== undefined);
  assert.equal(third.kind, 'consultation-recorded');
  assert.equal(fourth.kind, 'consultation-recorded');
  assert.equal(confirmed.kind, 'confirmed');

  // Supplied ORDER preserved; payload key-sets pinned (proofRef present-iff-supplied):
  const riskCheck = third.payload as Record<string, unknown>;
  const llmJudge = fourth.payload as Record<string, unknown>;
  assert.equal(riskCheck.kind, 'risk-check');
  assert.equal(llmJudge.kind, 'llm-judge');
  assert.deepEqual(Object.keys(riskCheck).sort(), [
    'at',
    'checker',
    'kind',
    'payloadDigest',
    'verdict',
  ]);
  assert.deepEqual(Object.keys(llmJudge).sort(), [
    'at',
    'checker',
    'kind',
    'payloadDigest',
    'proofRef',
    'verdict',
  ]);
  // Library-stamped recording time — the batch's single clock reading (§2.1):
  assert.equal(riskCheck.at, confirmed.at);
  assert.equal(llmJudge.at, confirmed.at);
  assert.equal(llmJudge.verdict, 'fail');

  // The existing replay fold and review projection carry them for free:
  const rec = await handles.operator.getRecord(recordId);
  assert.deepEqual(
    rec?.consultations.map((c) => c.kind),
    ['chain-verify', 'facts', 'risk-check', 'llm-judge'],
  );
  const view = await handles.operator.review(recordId);
  assert.equal(view.status, 'ok');
  if (view.status !== 'ok') return;
  assert.ok(view.value.consultations.some((c) => c.kind === 'llm-judge'));
});

test('an unreachable marker is inert for a non-required kind: validated, recorded nowhere, and finalize confirms', async () => {
  // SPEC §11.1: "an unreachable marker for a non-required kind is inert" — this leg
  // (captureProfile()) declares no requiredConsultations, so the gate built at the
  // second step-5 increment never sees this kind; the marker validates at intake and
  // then simply has nothing to be consumed by. See "THE AVAILABILITY PIN" below for the
  // gate's own required-kind, marker-present coverage.
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [{ kind: 'sanctions', unreachable: true, authority: 'svc:sanctions' }],
  });
  assert.equal(done.status, 'ok');
  assert.equal((await store.readChain(recordId)).length, 4); // opened, chain-verify, facts, confirmed — nothing extra
});

test('a refusal path records no consultation: drifted content refuses with the chain untouched', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const out = await handles.operator.finalize(
    recordId,
    identity(),
    { subject: 'week-1', total: 999 },
    facts(),
    {
      consultations: [
        { kind: 'risk-check', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
      ],
    },
  );
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'content-drift');
  assert.equal(
    (await store.readChain(recordId)).length,
    1,
    'opened only — evidence records on success alone',
  );
});

test('the intake throw wins over the unknown-record throw: caller bugs throw identically regardless of record state', async () => {
  // SPEC §9: consultation shape "throws at argument intake, before anything is loaded".
  const handles = create(makeConfig([captureProfile()]));
  await assert.rejects(
    handles.operator.finalize('rec-none', identity(), CONTENT, facts(), {
      consultations: [
        { kind: 'k1', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
        { kind: 'k1', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
      ],
    }),
    /duplicate/i,
  );
});

test('unknown opts keys throw, and policy names its own build step', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  await assert.rejects(
    handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
      policy: { digest: DIGEST },
    } as unknown as Parameters<typeof handles.operator.finalize>[4]),
    /policy/i,
  );
  await assert.rejects(
    handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
      nonsense: 1,
    } as unknown as Parameters<typeof handles.operator.finalize>[4]),
    /finalize.*option|accepts only/i,
  );
});

test('the surface is leg-agnostic: a maker-leg finalize on a two-leg profile records its consultation', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([twoLegProfile()], { store }));
  const makerId = await openRecord(
    handles,
    CONTENT,
    'test.twoleg.v1',
    'subject:attach-1',
    'maker-decide',
  );
  const done = await handles.operator.finalize(makerId, identity(), CONTENT, facts(), {
    consultations: [
      { kind: 'risk-check', checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' },
    ],
  });
  assert.equal(done.status, 'ok');
  const rec = await handles.operator.getRecord(makerId);
  assert.ok(rec?.consultations.some((c) => c.kind === 'risk-check'));
});

// === the required-consultation gate: rung 5.5 (second step-5 increment) ===

/** captureProfile with the leg's requiredConsultations set (and optional extras). */
function gatedProfile(extra?: Partial<LegSpec>): ConfirmProfile {
  const p = captureProfile({ id: 'test.gated.v1' });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  p.legs[0] = { ...leg, requiredConsultations: ['risk-check', 'sanctions'], ...extra };
  return p;
}
const GATED_SUBJECT = 'subject:gate-1';

// Reuse the file's EXISTING `obtained(kind, extra?)` helper (the first step-5
// increment's) for every obtained-consultation fixture below — `obtained('x')` is a
// pass verdict; `obtained('x', { verdict: 'fail' })` the fail shape. Do not add a
// duplicate builder.

async function openGated(store: MemoryStore, extra?: Partial<LegSpec>) {
  const handles = create(makeConfig([gatedProfile(extra)], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.gated.v1', GATED_SUBJECT);
  return { handles, recordId };
}

test('the full pass: both required kinds obtained pass — confirmed, both recorded', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('risk-check'), obtained('sanctions')],
  });
  assert.equal(done.status, 'ok');
  const rec = await handles.operator.getRecord(recordId);
  assert.deepEqual(
    rec?.consultations.map((c) => c.kind),
    ['chain-verify', 'facts', 'risk-check', 'sanctions'],
  );
});

test('missing refuses consultation-missing, open by default, and the corrected retry confirms', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('risk-check')], // sanctions missing
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'consultation-missing');
  assert.equal((await store.readChain(recordId)).length, 1, 'open, no append — the default path');

  const retry = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('risk-check'), obtained('sanctions')],
  });
  assert.equal(retry.status, 'ok');
});

test('an obtained fail on a required kind refuses consultation-failed; the corrected retry confirms', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [
      { ...obtained('risk-check'), verdict: 'fail' } as ConsultationInput,
      obtained('sanctions'),
    ],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'consultation-failed');
  assert.equal((await store.readChain(recordId)).length, 1);

  const retry = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('risk-check'), obtained('sanctions')],
  });
  assert.equal(retry.status, 'ok');
});

test('THE AVAILABILITY PIN: a required kind reported unreachable — unavailable status, no edge, the seam re-arms', async () => {
  // SPEC §11.1: "never a fabricated pass"; the availability outcome "never appends":
  // the record stays open "and the seam re-arms for bounded host retry" — the retry
  // budget is the HOST's, not the library's.
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [
      { kind: 'risk-check', unreachable: true, authority: 'svc:risk-check' },
      obtained('sanctions'),
    ],
  });
  assert.deepEqual(out, {
    status: 'unavailable',
    code: 'availability',
    authority: 'svc:risk-check',
  });
  assert.equal((await store.readChain(recordId)).length, 1, 'nothing appended, ever');

  const retry = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('risk-check'), obtained('sanctions')],
  });
  assert.equal(retry.status, 'ok', 'the re-armed seam accepts the recovered authority');
});

test('the FIRST declared kind trips: risk-check missing beats sanctions failing — declaration order, not severity', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [{ ...obtained('sanctions'), verdict: 'fail' } as ConsultationInput],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'consultation-missing'); // risk-check, declared first, is missing
});

test('non-required kinds stay evidence with the gate live: an extra fail records and confirm proceeds', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [
      obtained('risk-check'),
      obtained('sanctions'),
      { kind: 'llm-judge', checker: CHECKER, payloadDigest: DIGEST, verdict: 'fail' },
    ],
  });
  assert.equal(done.status, 'ok');
  const rec = await handles.operator.getRecord(recordId);
  assert.ok(rec?.consultations.some((c) => c.kind === 'llm-judge' && c.verdict === 'fail'));
});

test('terminalRefusals may make consultation-failed terminal: the refused edge appends and the pair releases', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store, {
    terminalRefusals: ['consultation-failed'],
  });
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [
      { ...obtained('risk-check'), verdict: 'fail' } as ConsultationInput,
      obtained('sanctions'),
    ],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'consultation-failed');
  assert.ok(out.transitionRef !== undefined, 'terminal path: the refused edge appended');
  const last = (await store.readChain(recordId)).at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'refused');
  assert.deepEqual(Object.keys(last.payload as object), ['code']);
  assert.equal(await store.findNonTerminal('test.gated.v1', GATED_SUBJECT), null);
});

test('availability is legal-but-inert in terminalRefusals AT THE SEAM: still no edge, still open', async () => {
  // SPEC §8 names `availability` (with `leg-expired`) as a legal terminalRefusals
  // member that can never fire — "never a `refused` edge". The matrix pins appendsOn;
  // this pins the seam itself.
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store, {
    terminalRefusals: ['availability'],
  });
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [
      { kind: 'risk-check', unreachable: true, authority: 'svc:x' },
      obtained('sanctions'),
    ],
  });
  assert.equal(out.status, 'unavailable');
  assert.equal((await store.readChain(recordId)).length, 1);
  assert.equal(
    await store.findNonTerminal('test.gated.v1', GATED_SUBJECT),
    recordId,
    'still open, still held',
  );
});

test("the gate reads the finalizing record's OWN leg: an undeclaring maker is ungated on a declaring-checker profile", async () => {
  const store = new MemoryStore();
  const p = twoLegProfile({ id: 'test.gated.twoleg.v1' });
  const checker = p.legs[1];
  if (checker === undefined) throw new Error('fixture: twoLegProfile has two legs');
  p.legs[1] = { ...checker, requiredConsultations: ['risk-check'] };
  const handles = create(makeConfig([p], { store }));
  const makerId = await openRecord(
    handles,
    CONTENT,
    'test.gated.twoleg.v1',
    'subject:gate-2',
    'maker-decide',
  );
  const done = await handles.operator.finalize(makerId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'no consultations supplied and none required of THIS leg');
});

test('gate order: (5) facts outranks (5.5) — invalid facts refuses consultation-missing from the facts rung', async () => {
  // The discriminator: were (5.5) first, the obtained fail would say consultation-failed.
  const store = new MemoryStore();
  const { handles, recordId } = await openGated(store);
  const out = await handles.operator.finalize(
    recordId,
    identity(),
    CONTENT,
    { figures: 1n, checker: facts().checker } as unknown as ReturnType<typeof facts>,
    {
      consultations: [
        { ...obtained('risk-check'), verdict: 'fail' } as ConsultationInput,
        obtained('sanctions'),
      ],
    },
  );
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'consultation-missing');
});

// === the eligibility arm: the implicit-first kind (first step-6 increment) ===

/** captureProfile with the leg's eligibility declared (and optional extras). */
function eligibleProfile(extra?: Partial<LegSpec>): ConfirmProfile {
  const p = captureProfile({ id: 'test.eligible.v1' });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  p.legs[0] = { ...leg, eligibility: 'hr.approver-check', ...extra };
  return p;
}
const ELIGIBLE_SUBJECT = 'subject:elig-1';

async function openEligible(store: MemoryStore, extra?: Partial<LegSpec>) {
  const handles = create(makeConfig([eligibleProfile(extra)], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.eligible.v1', ELIGIBLE_SUBJECT);
  return { handles, recordId };
}

test('the trip mapping: an eligibility fail refuses ineligible, open by default, and a pass-verdict retry confirms', async () => {
  // SPEC §10.4: "a **`fail` verdict refuses `ineligible`**"; open-by-default —
  // eligibility is per-finalize, per actor, so a different eligible actor may decide.
  const store = new MemoryStore();
  const { handles, recordId } = await openEligible(store);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('eligibility', { verdict: 'fail' })],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'ineligible');
  assert.equal(out.transitionRef, undefined, 'default path: no appended edge');
  assert.equal((await store.readChain(recordId)).length, 1, 'the record stays open');

  const retry = await handles.operator.finalize(
    recordId,
    identity({ principal: 'approver:2' }),
    CONTENT,
    facts(),
    { consultations: [obtained('eligibility')] },
  );
  assert.equal(retry.status, 'ok');
});

test('the trip mapping stays generic off the fail arm: missing refuses consultation-missing; unreachable is the availability outcome', async () => {
  // §10.4: "a *missing* input refuses `consultation-missing` (generic); an
  // *unreachable* marker yields the availability outcome (generic)".
  const storeA = new MemoryStore();
  const a = await openEligible(storeA);
  const missing = await a.handles.operator.finalize(a.recordId, identity(), CONTENT, facts());
  assert.equal(missing.status, 'refused');
  if (missing.status !== 'refused') return;
  assert.equal(missing.code, 'consultation-missing');

  const storeB = new MemoryStore();
  const b = await openEligible(storeB);
  const down = await b.handles.operator.finalize(b.recordId, identity(), CONTENT, facts(), {
    consultations: [{ kind: 'eligibility', unreachable: true, authority: 'svc:hr' }],
  });
  assert.deepEqual(down, { status: 'unavailable', code: 'availability', authority: 'svc:hr' });
  assert.equal((await storeB.readChain(b.recordId)).length, 1, 'nothing appended');
});

test('a pass verdict confirms and the eligibility consultation is chained evidence that the check ran', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openEligible(store);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('eligibility')],
  });
  assert.equal(done.status, 'ok');
  const rec = await handles.operator.getRecord(recordId);
  const evidence = rec?.consultations.find((c) => c.kind === 'eligibility');
  assert.ok(evidence !== undefined);
  assert.equal(evidence.verdict, 'pass');
});

test('implicit and FIRST: eligibility trips before the declared kinds; satisfied, the gate proceeds in order', async () => {
  // §10.4: "the effective kinds are the implicit `'eligibility'` followed by the
  // declared `requiredConsultations` in order, so authority-to-decide is checked
  // before the evidence checks".
  const store = new MemoryStore();
  const { handles, recordId } = await openEligible(store, {
    requiredConsultations: ['risk-check'],
  });
  const bothFail = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [
      obtained('eligibility', { verdict: 'fail' }),
      obtained('risk-check', { verdict: 'fail' }),
    ],
  });
  assert.equal(bothFail.status, 'refused');
  if (bothFail.status !== 'refused') return;
  assert.equal(bothFail.code, 'ineligible', 'the implicit kind is first');

  const evidenceFails = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('eligibility'), obtained('risk-check', { verdict: 'fail' })],
  });
  assert.equal(evidenceFails.status, 'refused');
  if (evidenceFails.status !== 'refused') return;
  assert.equal(evidenceFails.code, 'consultation-failed', 'past the implicit kind, generic order');
});

test('terminalRefusals may end the leg on ineligible: the refused edge appends with payload { code }', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openEligible(store, {
    terminalRefusals: ['ineligible'],
  });
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('eligibility', { verdict: 'fail' })],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'ineligible');
  assert.ok(out.transitionRef !== undefined);
  const last = (await store.readChain(recordId)).at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'refused');
  assert.deepEqual(Object.keys(last.payload as object), ['code']);
  assert.equal(await store.findNonTerminal('test.eligible.v1', ELIGIBLE_SUBJECT), null);
});

test('the ordinary-kind fallback: a NON-declaring leg listing eligibility in requiredConsultations gets the generic codes', async () => {
  // §10.4: "a leg that merely lists `'eligibility'` in its `requiredConsultations`
  // gates it with the generic codes (`consultation-failed` on a `fail`, never
  // `ineligible`)".
  const store = new MemoryStore();
  const p = captureProfile({ id: 'test.ordinary-elig.v1' });
  const leg = p.legs[0];
  if (leg === undefined) throw new Error('fixture: captureProfile has a leg');
  p.legs[0] = { ...leg, requiredConsultations: ['eligibility'] };
  const handles = create(makeConfig([p], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.ordinary-elig.v1', ELIGIBLE_SUBJECT);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('eligibility', { verdict: 'fail' })],
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'consultation-failed');
});

test('a voluntary eligibility consultation on an undeclaring, unrequiring leg records as plain evidence', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', ELIGIBLE_SUBJECT);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    consultations: [obtained('eligibility', { verdict: 'fail' })],
  });
  assert.equal(done.status, 'ok', 'nothing requires it — evidence, never a gate');
});
