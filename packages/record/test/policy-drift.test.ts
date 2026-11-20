// @vidimera/record — policy-drift.test.ts (SPEC §10.3 "Policy-drift notarization"):
// the second step-6 increment's file — the open() binding contract, the finalize
// presence contract, rung (4.5)'s comparisons, both cross-instance corners including
// THE DECIDED OPEN QUESTION (fail-close), and the availability outcome's second
// producer. The library notarizes the policy version; it never evaluates policy.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  facts,
  identity,
  makeConfig,
  openRecord,
  tamperNonLast,
} from './helpers/profiles.js';
import { TamperingStore } from './helpers/stores.js';

const CONTENT = { subject: 'week-1', total: 40 };
const BOUND = `sha256:${'a'.repeat(64)}`;
const LIVE_SAME = BOUND;
const LIVE_DRIFTED = `sha256:${'b'.repeat(64)}`;

function policyProfile(extra?: Partial<ConfirmProfile>): ConfirmProfile {
  return { ...captureProfile({ id: 'test.policy.v1' }), policySource: 'rules.v1', ...extra };
}

/** Stages+opens a policy-bound record; returns handles + recordId. */
async function openBound(store: MemoryStore, profile = policyProfile()) {
  const handles = create(makeConfig([profile], { store }));
  const staged = await handles.agent.stage(CONTENT, profile.id, DEFAULT_SUBJECT_REF);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') throw new Error('fixture: stage must succeed');
  const opened = await handles.operator.open(staged.value.stagedRef, { policyDigest: BOUND });
  assert.equal(opened.status, 'ok');
  if (opened.status !== 'ok') throw new Error('fixture: open must succeed');
  return { handles, recordId: opened.value.recordId };
}

test('open() binds the digest into the genesis, present-iff-declared, and replay folds it', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openBound(store);
  const chain = await store.readChain(recordId);
  const genesis = chain[0];
  assert.ok(genesis !== undefined);
  assert.deepEqual(Object.keys(genesis.payload as object).sort(), [
    'contentDigest',
    'legId',
    'policyDigest',
    'profileDigest',
    'profileId',
    'subjectRef',
  ]);
  assert.equal((genesis.payload as { policyDigest: string }).policyDigest, BOUND);
  const rec = await handles.operator.getRecord(recordId);
  assert.equal(rec?.policyDigest, BOUND);
});

test('the binding contract is loud both directions: declared-without-digest, declared-with-empty, undeclared-with-digest all THROW at open()', async () => {
  const store = new MemoryStore();
  const declaring = create(makeConfig([policyProfile()], { store }));
  const staged = await declaring.agent.stage(CONTENT, 'test.policy.v1', DEFAULT_SUBJECT_REF);
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  await assert.rejects(declaring.operator.open(staged.value.stagedRef), /policyDigest/i);
  await assert.rejects(
    declaring.operator.open(staged.value.stagedRef, { policyDigest: '' }),
    /policyDigest/i,
  );

  const plain = create(makeConfig([captureProfile()], { store: new MemoryStore() }));
  const staged2 = await plain.agent.stage(CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  assert.equal(staged2.status, 'ok');
  if (staged2.status !== 'ok') return;
  await assert.rejects(
    plain.operator.open(staged2.value.stagedRef, { policyDigest: BOUND }),
    /policySource/i,
  );
});

test('a non-declaring genesis key set is unchanged — the byte proof', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([captureProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const genesis = (await store.readChain(recordId))[0];
  assert.ok(genesis !== undefined);
  assert.deepEqual(Object.keys(genesis.payload as object).sort(), [
    'contentDigest',
    'legId',
    'profileDigest',
    'profileId',
    'subjectRef',
  ]);
});

test('the presence contract: declaring-without-policy THROWS at finalize; non-declaring-with-policy THROWS unconditionally', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openBound(store);
  await assert.rejects(
    handles.operator.finalize(recordId, identity(), CONTENT, facts()),
    /opts\.policy/i,
  );

  const plainStore = new MemoryStore();
  const plain = create(makeConfig([captureProfile()], { store: plainStore }));
  const plainId = await openRecord(plain, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  await assert.rejects(
    plain.operator.finalize(plainId, identity(), CONTENT, facts(), {
      policy: { digest: LIVE_SAME },
    }),
    /policySource/i,
  );
});

test('malformed policy shapes THROW at argument intake, before the chain loads', async () => {
  const store = new MemoryStore();
  const { handles } = await openBound(store);
  const bad = [
    {},
    { digest: '' },
    { unreachable: true, authority: '' },
    { digest: LIVE_SAME, unreachable: true, authority: 'svc:x' },
    { digest: LIVE_SAME, extra: 1 },
    { unreachable: false, authority: 'svc:x' },
  ];
  for (const policy of bad) {
    await assert.rejects(
      handles.operator.finalize('rec-none', identity(), CONTENT, facts(), {
        policy,
      } as never),
      /policy/i,
    );
  }
});

test('rung (4.5): a matching live digest confirms; a drifted one refuses policy-drift, open by default', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openBound(store);
  const drifted = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    policy: { digest: LIVE_DRIFTED },
  });
  assert.equal(drifted.status, 'refused');
  if (drifted.status !== 'refused') return;
  assert.equal(drifted.code, 'policy-drift');
  assert.equal(drifted.transitionRef, undefined, 'default path: no appended edge');
  assert.equal((await store.readChain(recordId)).length, 1, 'the record stays open');

  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    policy: { digest: LIVE_SAME },
  });
  assert.equal(done.status, 'ok');
});

test('terminalRefusals may end the leg on policy-drift: the disposal-and-re-open flow, first half', async () => {
  const store = new MemoryStore();
  const profile = policyProfile();
  const leg = profile.legs[0];
  assert.ok(leg !== undefined);
  profile.legs[0] = { ...leg, terminalRefusals: ['policy-drift'] };
  const { handles, recordId } = await openBound(store, profile);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    policy: { digest: LIVE_DRIFTED },
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'policy-drift');
  assert.ok(out.transitionRef !== undefined);
  const last = (await store.readChain(recordId)).at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'refused');
  assert.deepEqual(Object.keys(last.payload as object), ['code']);
  assert.equal(
    await store.findNonTerminal('test.policy.v1', DEFAULT_SUBJECT_REF),
    null,
    'the pair releases for re-open',
  );
});

test('THE AVAILABILITY PIN, second producer: an unreachable source is the transient case that retries the SAME record', async () => {
  // SPEC §10.3: an { unreachable, authority } marker yields the availability outcome —
  // "bounded retry, never fail-open, never approval" — a DIFFERENT code from
  // policy-drift precisely because this one legitimately retries the same open record.
  const store = new MemoryStore();
  const { handles, recordId } = await openBound(store);
  const down = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    policy: { unreachable: true, authority: 'svc:rules-engine' },
  });
  assert.deepEqual(down, {
    status: 'unavailable',
    code: 'availability',
    authority: 'svc:rules-engine',
  });
  assert.equal((await store.readChain(recordId)).length, 1, 'nothing appended, ever');

  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    policy: { digest: LIVE_SAME },
  });
  assert.equal(done.status, 'ok', 'the re-armed seam accepts the recovered source');
});

test('order: (4) content-drift outranks (4.5) — a drifted draft refuses content-drift even under a drifted policy', async () => {
  const store = new MemoryStore();
  const { handles, recordId } = await openBound(store);
  const out = await handles.operator.finalize(
    recordId,
    identity(),
    { subject: 'week-1', total: 999 },
    facts(),
    { policy: { digest: LIVE_DRIFTED } },
  );
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'content-drift');
});

test('order: (4.5) outranks (5) — a drifted policy moots even malformed facts', async () => {
  // The discriminator: were rung (5) first, the non-canonicalizable BigInt figures would
  // say consultation-missing instead — the same discriminator consultations.test.ts's own
  // "gate order: (5) facts outranks (5.5)" pin uses for the (5)->(5.5) boundary.
  const store = new MemoryStore();
  const { handles, recordId } = await openBound(store);
  const out = await handles.operator.finalize(
    recordId,
    identity(),
    CONTENT,
    { figures: 1n, checker: facts().checker } as unknown as ReturnType<typeof facts>,
    { policy: { digest: LIVE_DRIFTED } },
  );
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'policy-drift');
});

test('order: (4.5) outranks (5.5) — deciding under the wrong policy version moots the evidence', async () => {
  const store = new MemoryStore();
  const profile = policyProfile();
  const leg = profile.legs[0];
  assert.ok(leg !== undefined);
  profile.legs[0] = { ...leg, requiredConsultations: ['risk-check'] };
  const { handles, recordId } = await openBound(store, profile);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    policy: { digest: LIVE_DRIFTED },
    // risk-check deliberately missing — were (5.5) first this would say consultation-missing
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'policy-drift');
});

test('the depth pin: a tampered declaring-profile chain refuses chain-compromise BEFORE the absent-policy throw', async () => {
  // SPEC §10.3: the presence throws sit "both at profile resolution — so a tampered
  // chain still refuses `chain-compromise` first". Fixture: confirm the record once so
  // the chain has non-last transitions to tamper (tamperNonLast needs >= 2), then
  // re-finalize through a TamperingStore with NO opts.policy — the tampered read must
  // refuse at rung (1), never reach the presence contract's throw.
  const store = new MemoryStore();
  const { handles, recordId } = await openBound(store);
  const good = await handles.operator.finalize(recordId, identity(), CONTENT, facts(), {
    policy: { digest: LIVE_SAME },
  });
  assert.equal(good.status, 'ok', 'fixture: confirm to grow the chain');
  const tampering = new TamperingStore(store, recordId, tamperNonLast);
  const viaTampered = create(makeConfig([policyProfile()], { store: tampering }));
  const out = await viaTampered.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'chain-compromise', 'no throw — rung (1) wins over the presence contract');
});

test('the forward cross-instance corner is pre-empted: a same-id instance that newly declares policySource is a drifted profile — unknown-profile at resolution, never policy-drift', async () => {
  // §10.3 once had this corner refuse policy-drift ("a present live digest against an absent
  // bound one as a mismatch"). Since the profile-drift gate, policySource is a declarative
  // field the genesis profileDigest covers: the declaring instance does not digest to the
  // record's binding and refuses unknown-profile at profile resolution, before rung (4.5).
  const store = new MemoryStore();
  const nonDeclaring = create(
    makeConfig([{ ...captureProfile({ id: 'test.policy.v1' }) }], { store }),
  );
  const recordId = await openRecord(nonDeclaring, CONTENT, 'test.policy.v1', DEFAULT_SUBJECT_REF);
  const declaring = create(makeConfig([policyProfile()], { store }));
  const out = await declaring.operator.finalize(recordId, identity(), CONTENT, facts(), {
    policy: { digest: LIVE_SAME },
  });
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'unknown-profile');
});

test('THE DECIDED OPEN QUESTION, superseded: a bound record under a same-id non-declaring instance refuses unknown-profile at resolution — fail-close kept, delivered before rung (4.5)', async () => {
  // OPEN-QUESTIONS §2 decided fail-close and this build delivered it as policy-drift at rung
  // (4.5). The profile-drift gate delivers the same fail-close one step earlier: dropping
  // policySource changes the profile's projection, so the non-declaring instance does not
  // hold the record's profile and refuses unknown-profile at profile resolution. The
  // rung-(4.5) arm is unreachable on an honest chain; only a storage edit of a sole-genesis
  // head inside the AL1 head-bound window reaches it, and it throws there as a storage fault
  // (kernel/finalize.ts; pinned in tamper-shapes.test.ts, where AL2 refuses the same edit as
  // chain-compromise). This is the THIRTEENTH self-authored inversion in the status record's
  // numbered sequence: the decided FORM moved, the decision did not.
  const store = new MemoryStore();
  const { recordId } = await openBound(store);
  const nonDeclaring = create(
    makeConfig([{ ...captureProfile({ id: 'test.policy.v1' }) }], { store }),
  );
  const out = await nonDeclaring.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'refused');
  if (out.status !== 'refused') return;
  assert.equal(out.code, 'unknown-profile');
  assert.equal((await store.readChain(recordId)).length, 1, 'default path: no append');
});
