// @vidimera/record — staged-integrity.test.ts: `open()` binds a persisted staged draft only when
// it re-derives to the reference it was read under — the opened draft and the `proposed` one —
// and reads each caller-supplied option once, at entry.
//
// A staged reference is content-derived (SPEC §3): `deriveStagedRef` over the draft's
// `contentDigest`, `profileId`, `subjectRef` and `legId`. A storage-writing insider who edits a
// pending staged row between `stage()` and `open()` would otherwise redirect the record to another
// profile, subject or leg, or rewrite the digest it binds. The edit reaches `open()` here two
// ways, as it would in a deployment: through a store wrapper whose `getStaged` returns an altered
// copy (the `MemoryStore` route) and by SQL on `SqliteStore`'s own `staged` table. Either way the
// call throws naming the reference and appends nothing — a storage fault, never a refusal
// (SPEC §8's loud-throw posture).
//
// The option snapshot: a value the host changes after `open()` first read it — its own argument
// mutated mid-call, or an accessor whose value changes — never reaches the genesis unverified.
// `verifySupersedes` and `verifyPriorLegs` are pinned directly as well, since `open()`'s own
// snapshot would hide a re-read inside either.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { canonicalize, digest } from '../src/canonical.js';
import { transitionDigest } from '../src/chain/encoding.js';
import type { ConfirmProfile, OpenOptions } from '../src/config.js';
import type { KernelContext, ResolvedProfile } from '../src/create.js';
import { create } from '../src/create.js';
import { verifyPriorLegs } from '../src/kernel/prior-legs.js';
import { verifySupersedes } from '../src/kernel/supersedes.js';
import type { Outcome } from '../src/outcome.js';
import { profileDigest } from '../src/profile-digest.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import type { AppendMeta, AppendResult, BatchResult, Store } from '../src/store/store.js';
import type { DecisionRecord, Digest, RecordState, StagedDraft, Transition } from '../src/types.js';
import {
  captureProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
  twoLegProfile,
} from './helpers/profiles.js';

type Handles = ReturnType<typeof create>;

const SUBJECT = 'subject:staged-integrity';
const CONTENT = { amount: 8.0 };
const OTHER_CONTENT = { amount: 6.5 };
const THIRD_CONTENT = { amount: 1.25 };
const BOUND = `sha256:${'a'.repeat(64)}`;
const NEVER_VERIFIED_HEAD = `sha256:${'e'.repeat(64)}`;

/** Two registered profiles with the same leg ids, so a `profileId` edit lands on a real one. */
const PROFILE_A = twoLegProfile();
const PROFILE_B = twoLegProfile({ id: 'test.twoleg.other.v1' });

/** `stage()`'s content binding under the default (identity) canonicalizer. */
function contentDigestOf(content: unknown): Digest {
  return digest(canonicalize(content));
}

/**
 * The `MemoryStore` route for an insider's edit: `getStaged` returns an altered copy of the
 * stored draft for any reference in `edits`, and `onGetStaged` fires before each read. Every
 * other method delegates to `inner`; appends are counted.
 */
class StagedEditStore implements Store {
  readonly edits = new Map<string, (draft: StagedDraft) => StagedDraft>();
  onGetStaged: ((stagedRef: string) => void) | undefined;
  appendCalls = 0;

  constructor(readonly inner: Store) {}

  putStaged(staged: StagedDraft, tx?: unknown): Promise<void> {
    return this.inner.putStaged(staged, tx);
  }
  async getStaged(stagedRef: string): Promise<StagedDraft | null> {
    this.onGetStaged?.(stagedRef);
    const draft = await this.inner.getStaged(stagedRef);
    const edit = this.edits.get(stagedRef);
    return draft === null || edit === undefined ? draft : edit(draft);
  }
  appendTransition(
    expectedCurrentState: RecordState | null,
    transition: Transition,
    meta: AppendMeta,
    tx?: unknown,
  ): Promise<AppendResult> {
    this.appendCalls += 1;
    return this.inner.appendTransition(expectedCurrentState, transition, meta, tx);
  }
  appendBatch(
    expectedCurrentState: RecordState,
    transitions: readonly Transition[],
    meta: AppendMeta,
    tx?: unknown,
  ): Promise<BatchResult> {
    this.appendCalls += 1;
    return this.inner.appendBatch(expectedCurrentState, transitions, meta, tx);
  }
  readChain(recordId: string): Promise<Transition[]> {
    return this.inner.readChain(recordId);
  }
  chainHead(recordId: string): Promise<Digest | null> {
    return this.inner.chainHead(recordId);
  }
  listDue(now: Date): Promise<string[]> {
    return this.inner.listDue(now);
  }
  findNonTerminal(profileId: string, subjectRef: string): Promise<string | null> {
    return this.inner.findNonTerminal(profileId, subjectRef);
  }
}

interface Rig {
  handles: Handles;
  /** Rewrites the persisted staged row under `stagedRef`, the way an insider would. */
  editStaged(stagedRef: string, edit: (draft: StagedDraft) => StagedDraft): void;
  /** Appends reaching the backing so far: append calls on the memory route, rows on SQLite. */
  appended(): number;
}

function memoryRig(profiles: ConfirmProfile[]): Rig {
  const store = new StagedEditStore(new MemoryStore());
  return {
    handles: create(makeConfig(profiles, { store })),
    editStaged: (stagedRef, edit) => {
      store.edits.set(stagedRef, edit);
    },
    appended: () => store.appendCalls,
  };
}

function sqliteRig(profiles: ConfirmProfile[]): Rig {
  const store = new SqliteStore(':memory:');
  const db = store.database;
  return {
    handles: create(makeConfig(profiles, { store })),
    editStaged: (stagedRef, edit) => {
      const row = db.prepare('SELECT draft_json FROM staged WHERE id = ?').get(stagedRef) as
        | { draft_json: string }
        | undefined;
      if (row === undefined) throw new Error(`fixture: no staged row under '${stagedRef}'`);
      const edited = edit(JSON.parse(row.draft_json) as StagedDraft);
      db.prepare('UPDATE staged SET draft_json = ? WHERE id = ?').run(
        JSON.stringify(edited),
        stagedRef,
      );
    },
    appended: () => (db.prepare('SELECT COUNT(*) AS n FROM transitions').get() as { n: number }).n,
  };
}

const BACKINGS: readonly { name: string; rig: (profiles: ConfirmProfile[]) => Rig }[] = [
  { name: 'MemoryStore', rig: memoryRig },
  { name: 'SqliteStore', rig: sqliteRig },
];

async function stageRef(
  handles: Handles,
  content: unknown,
  profileId: string,
  subjectRef: string,
  legId?: string,
): Promise<string> {
  const staged = await handles.agent.stage(content, profileId, subjectRef, legId);
  if (staged.status !== 'ok')
    throw new Error(`fixture: stage() refused: ${JSON.stringify(staged)}`);
  return staged.value.stagedRef;
}

/** What a call came to: `threw <message>`, `refused <code>`, or the outcome's status. */
async function settle(call: Promise<Outcome<unknown>>): Promise<string> {
  try {
    const out = await call;
    return out.status === 'refused' ? `refused ${out.code}` : out.status;
  } catch (err) {
    return `threw ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function headOf(handles: Handles, recordId: string): Promise<Digest> {
  const last = (await handles.operator.readChain(recordId)).at(-1);
  if (last === undefined) throw new Error(`fixture: '${recordId}' has no chain`);
  return transitionDigest(last);
}

async function genesisPayloadOf(handles: Handles, recordId: string): Promise<unknown> {
  const genesis = (await handles.operator.readChain(recordId))[0];
  if (genesis === undefined) throw new Error(`fixture: '${recordId}' has no genesis`);
  return genesis.payload;
}

/**
 * A copy of `base` whose `key` is an accessor reading `base[key]` for its first `firstReads`
 * reads and `then` after them: a caller's value that changes after it was first read.
 */
function switching<T extends object>(base: T, key: keyof T, firstReads: number, then: unknown): T {
  const first = base[key];
  let reads = 0;
  const copy = { ...base };
  Object.defineProperty(copy, key, {
    enumerable: true,
    configurable: true,
    get: () => {
      reads += 1;
      return reads <= firstReads ? first : then;
    },
  });
  return copy;
}

/** A draft whose every field reads `draft`'s value once, then `edited`'s on every later read. */
function flickering(draft: StagedDraft, edited: StagedDraft): StagedDraft {
  const out = {} as StagedDraft;
  for (const key of ['id', 'profileId', 'legId', 'subjectRef', 'contentDigest'] as const) {
    let reads = 0;
    Object.defineProperty(out, key, {
      enumerable: true,
      configurable: true,
      get: () => {
        reads += 1;
        return reads === 1 ? draft[key] : edited[key];
      },
    });
  }
  return out;
}

// --- the opened draft ---------------------------------------------------------------------

const OPENED_DRAFT_EDITS: readonly {
  what: string;
  legId: string;
  edit: (draft: StagedDraft) => StagedDraft;
}[] = [
  {
    what: 'profileId (another registered profile with the same leg ids)',
    legId: 'maker-decide',
    edit: (d) => ({ ...d, profileId: PROFILE_B.id }),
  },
  {
    what: 'subjectRef',
    legId: 'maker-decide',
    edit: (d) => ({ ...d, subjectRef: 'subject:redirected' }),
  },
  {
    what: "legId (a successor leg's draft moved to the first leg)",
    legId: 'checker-decide',
    edit: (d) => ({ ...d, legId: 'maker-decide' }),
  },
  {
    what: 'contentDigest',
    legId: 'maker-decide',
    edit: (d) => ({ ...d, contentDigest: contentDigestOf(OTHER_CONTENT) }),
  },
  {
    what: 'id',
    legId: 'maker-decide',
    edit: (d) => ({ ...d, id: contentDigestOf(OTHER_CONTENT) }),
  },
  {
    what: 'profileId (an unregistered profile — the check runs before the profile resolves)',
    legId: 'maker-decide',
    edit: (d) => ({ ...d, profileId: 'test.unregistered.v1' }),
  },
  {
    what: 'legId (a leg the profile lacks — the check runs before the leg check)',
    legId: 'maker-decide',
    edit: (d) => ({ ...d, legId: 'no-such-leg' }),
  },
];

for (const backing of BACKINGS) {
  for (const { what, legId, edit } of OPENED_DRAFT_EDITS) {
    test(`${backing.name}: a staged draft whose ${what} was edited in storage throws naming its reference; nothing is appended`, async () => {
      const rig = backing.rig([PROFILE_A, PROFILE_B]);
      const stagedRef = await stageRef(rig.handles, CONTENT, PROFILE_A.id, SUBJECT, legId);
      rig.editStaged(stagedRef, edit);
      const before = rig.appended();

      const result = await settle(rig.handles.operator.open(stagedRef));

      assert.match(
        result,
        new RegExp(
          `^threw open: the persisted draft under stagedRef '${stagedRef}' does not match it`,
        ),
      );
      assert.equal(rig.appended(), before, 'nothing is appended');
    });
  }
}

// --- the proposed draft -------------------------------------------------------------------

const PROPOSED_DRAFT_EDITS: readonly {
  what: string;
  edit: (draft: StagedDraft) => StagedDraft;
}[] = [
  { what: 'profileId', edit: (d) => ({ ...d, profileId: PROFILE_B.id }) },
  { what: 'subjectRef', edit: (d) => ({ ...d, subjectRef: 'subject:redirected' }) },
  { what: 'legId', edit: (d) => ({ ...d, legId: 'checker-decide' }) },
  { what: 'contentDigest', edit: (d) => ({ ...d, contentDigest: contentDigestOf(THIRD_CONTENT) }) },
  { what: 'id', edit: (d) => ({ ...d, id: contentDigestOf(THIRD_CONTENT) }) },
];

for (const backing of BACKINGS) {
  for (const { what, edit } of PROPOSED_DRAFT_EDITS) {
    test(`${backing.name}: a proposed draft whose ${what} was edited in storage throws naming its reference; nothing is appended`, async () => {
      const rig = backing.rig([PROFILE_A, PROFILE_B]);
      const proposal = await stageRef(rig.handles, CONTENT, PROFILE_A.id, SUBJECT, 'maker-decide');
      const revision = await stageRef(
        rig.handles,
        OTHER_CONTENT,
        PROFILE_A.id,
        SUBJECT,
        'maker-decide',
      );
      rig.editStaged(proposal, edit);
      const before = rig.appended();

      const result = await settle(
        rig.handles.operator.open(revision, { proposed: { stagedRef: proposal } }),
      );

      assert.match(
        result,
        new RegExp(
          `^threw open: the persisted draft under proposed stagedRef '${proposal}' does not match it`,
        ),
      );
      assert.equal(rig.appended(), before, 'nothing is appended');
    });
  }
}

// --- an untampered draft ------------------------------------------------------------------

for (const backing of BACKINGS) {
  test(`${backing.name}: an untampered draft, and an untampered proposal, open to exactly the genesis payload they always did`, async () => {
    const { handles } = backing.rig([PROFILE_A, PROFILE_B]);
    const honest = {
      profileId: PROFILE_A.id,
      profileDigest: profileDigest(PROFILE_A),
      legId: 'maker-decide',
      subjectRef: SUBJECT,
    };

    const plain = await openRecord(handles, CONTENT, PROFILE_A.id, SUBJECT, 'maker-decide');
    assert.deepEqual(await genesisPayloadOf(handles, plain), {
      ...honest,
      contentDigest: contentDigestOf(CONTENT),
    });

    const other = 'subject:staged-integrity-2';
    const proposal = await stageRef(handles, CONTENT, PROFILE_A.id, other, 'maker-decide');
    const revision = await stageRef(handles, OTHER_CONTENT, PROFILE_A.id, other, 'maker-decide');
    const opened = await handles.operator.open(revision, { proposed: { stagedRef: proposal } });
    assert.equal(opened.status, 'ok');
    if (opened.status !== 'ok') return;
    assert.deepEqual(await genesisPayloadOf(handles, opened.value.recordId), {
      ...honest,
      subjectRef: other,
      contentDigest: contentDigestOf(OTHER_CONTENT),
      proposedDigest: contentDigestOf(CONTENT),
    });
  });
}

test('a draft whose fields change between reads binds exactly the values the check covered — opened and proposed alike', async () => {
  const store = new StagedEditStore(new MemoryStore());
  const handles = create(makeConfig([PROFILE_A, PROFILE_B], { store }));
  const proposal = await stageRef(handles, CONTENT, PROFILE_A.id, SUBJECT, 'maker-decide');
  const revision = await stageRef(handles, OTHER_CONTENT, PROFILE_A.id, SUBJECT, 'maker-decide');
  const redirected: StagedDraft = {
    id: contentDigestOf(THIRD_CONTENT),
    profileId: PROFILE_B.id,
    legId: 'checker-decide',
    subjectRef: 'subject:redirected',
    contentDigest: contentDigestOf(THIRD_CONTENT),
  };
  store.edits.set(proposal, (d) => flickering(d, redirected));
  store.edits.set(revision, (d) => flickering(d, redirected));

  const opened = await settle(
    handles.operator.open(revision, { proposed: { stagedRef: proposal } }),
  );

  assert.equal(opened, 'ok');
  const recordId = await store.findNonTerminal(PROFILE_A.id, SUBJECT);
  assert.ok(recordId !== null, 'the record opened under the profile the check covered');
  assert.deepEqual(await genesisPayloadOf(handles, recordId), {
    profileId: PROFILE_A.id,
    profileDigest: profileDigest(PROFILE_A),
    legId: 'maker-decide',
    subjectRef: SUBJECT,
    contentDigest: contentDigestOf(OTHER_CONTENT),
    proposedDigest: contentDigestOf(CONTENT),
  });
});

// --- the option snapshot at open() --------------------------------------------------------

/** Switch points from the first read through one past the most reads any of these fields took
 * before the snapshot (six: `supersedes.recordId` through `open()`). */
const SWITCH_POINTS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Opens `stagedRef` with `opts` and shows what the record carries, or what the call came to. */
async function openAndShow(
  handles: Handles,
  stagedRef: string,
  opts: OpenOptions,
  show: (record: DecisionRecord | null) => string,
): Promise<string> {
  try {
    const out = await handles.operator.open(stagedRef, opts);
    if (out.status !== 'ok') return out.status === 'refused' ? `refused ${out.code}` : out.status;
    return show(await handles.operator.getRecord(out.value.recordId));
  } catch (err) {
    return `threw ${err instanceof Error ? err.message : String(err)}`;
  }
}

test('snapshot: a supersedes claim whose recordId or chainHead changes after its first read records the first-read value, verified', async () => {
  const profile = captureProfile({ decline: true });
  const outcomes: string[] = [];
  const expected: string[] = [];
  for (const field of ['recordId', 'chainHead'] as const) {
    for (const firstReads of SWITCH_POINTS) {
      const handles = create(makeConfig([profile]));
      const predecessor = await openRecord(handles, CONTENT, profile.id, SUBJECT);
      const declined = await handles.operator.decline(predecessor, identity(), CONTENT, facts());
      assert.equal(declined.status, 'ok', 'fixture: the predecessor is declined');
      const claim = { recordId: predecessor, chainHead: await headOf(handles, predecessor) };
      const staged = await stageRef(handles, OTHER_CONTENT, profile.id, SUBJECT);
      const then = field === 'recordId' ? 'rec-never-verified' : NEVER_VERIFIED_HEAD;

      const shown = await openAndShow(
        handles,
        staged,
        { supersedes: switching(claim, field, firstReads, then) },
        (record) => `recorded ${JSON.stringify(record?.supersedes)}`,
      );
      outcomes.push(`${field}@${firstReads}: ${shown}`);
      expected.push(`${field}@${firstReads}: recorded ${JSON.stringify(claim)}`);
    }
  }
  assert.deepEqual(outcomes, expected);
});

test('snapshot: a priorRecordRefs entry whose recordId or chainHead changes after its first read records the first-read value, verified', async () => {
  const profile = twoLegProfile();
  const outcomes: string[] = [];
  const expected: string[] = [];
  for (const field of ['recordId', 'chainHead'] as const) {
    for (const firstReads of SWITCH_POINTS) {
      const handles = create(makeConfig([profile]));
      const maker = await openRecord(handles, CONTENT, profile.id, SUBJECT, 'maker-decide');
      const confirmed = await handles.operator.finalize(maker, identity(), CONTENT, facts());
      assert.equal(confirmed.status, 'ok', 'fixture: the maker leg is confirmed');
      const ref = { recordId: maker, chainHead: await headOf(handles, maker) };
      const staged = await stageRef(handles, CONTENT, profile.id, SUBJECT, 'checker-decide');
      const then = field === 'recordId' ? 'rec-never-verified' : NEVER_VERIFIED_HEAD;

      const shown = await openAndShow(
        handles,
        staged,
        { priorRecordRefs: [switching(ref, field, firstReads, then)] },
        (record) => `recorded ${JSON.stringify(record?.priorRecordRefs)}`,
      );
      outcomes.push(`${field}@${firstReads}: ${shown}`);
      expected.push(
        `${field}@${firstReads}: recorded ${JSON.stringify([{ ...ref, legId: 'maker-decide' }])}`,
      );
    }
  }
  assert.deepEqual(outcomes, expected);
});

function policyProfile(): ConfirmProfile {
  return { ...captureProfile({ id: 'test.policy.v1' }), policySource: 'rules.v1' };
}

test('snapshot: a policyDigest that changes to absent after its first read is bound as first read', async () => {
  const profile = policyProfile();
  const outcomes: string[] = [];
  for (const firstReads of SWITCH_POINTS) {
    const handles = create(makeConfig([profile]));
    const staged = await stageRef(handles, CONTENT, profile.id, SUBJECT);
    const shown = await openAndShow(
      handles,
      staged,
      switching<OpenOptions>({ policyDigest: BOUND }, 'policyDigest', firstReads, undefined),
      (record) => `bound ${record?.policyDigest ?? 'nothing'}`,
    );
    outcomes.push(`@${firstReads}: ${shown}`);
  }
  assert.deepEqual(
    outcomes,
    SWITCH_POINTS.map((firstReads) => `@${firstReads}: bound ${BOUND}`),
  );
});

test('snapshot: a policyDigest the host clears mid-call no longer reaches the genesis as absent', async () => {
  const profile = policyProfile();
  const store = new StagedEditStore(new MemoryStore());
  const handles = create(makeConfig([profile], { store }));
  const proposal = await stageRef(handles, CONTENT, profile.id, SUBJECT);
  const revision = await stageRef(handles, OTHER_CONTENT, profile.id, SUBJECT);
  const opts: OpenOptions = { policyDigest: BOUND, proposed: { stagedRef: proposal } };
  // The host clears its own argument while open() awaits the proposed draft — after the
  // presence check has passed.
  store.onGetStaged = (stagedRef) => {
    if (stagedRef === proposal) Reflect.deleteProperty(opts, 'policyDigest');
  };

  const shown = await openAndShow(
    handles,
    revision,
    opts,
    (record) => `bound ${record?.policyDigest ?? 'nothing'}`,
  );

  assert.equal(shown, `bound ${BOUND}`, 'the genesis binds the digest the check saw');
});

test('snapshot: a proposed.stagedRef that changes after its first read binds the first-read draft', async () => {
  const profile = captureProfile();
  const outcomes: string[] = [];
  for (const firstReads of SWITCH_POINTS) {
    const handles = create(makeConfig([profile]));
    const proposal = await stageRef(handles, CONTENT, profile.id, SUBJECT);
    const revision = await stageRef(handles, OTHER_CONTENT, profile.id, SUBJECT);
    const third = await stageRef(handles, THIRD_CONTENT, profile.id, SUBJECT);
    const shown = await openAndShow(
      handles,
      revision,
      { proposed: switching({ stagedRef: proposal }, 'stagedRef', firstReads, third) },
      (record) => `bound ${record?.proposedDigest}`,
    );
    outcomes.push(`@${firstReads}: ${shown}`);
  }
  assert.deepEqual(
    outcomes,
    SWITCH_POINTS.map((firstReads) => `@${firstReads}: bound ${contentDigestOf(CONTENT)}`),
  );
});

test('snapshot: options are read at entry — the host mutating its own argument while open() awaits the draft changes nothing open() checks or records', async () => {
  const outcomes: string[] = [];
  const expected: string[] = [];

  // A successor leg's priorRecordRefs entry.
  {
    const profile = twoLegProfile();
    const store = new StagedEditStore(new MemoryStore());
    const handles = create(makeConfig([profile], { store }));
    const maker = await openRecord(handles, CONTENT, profile.id, SUBJECT, 'maker-decide');
    const confirmed = await handles.operator.finalize(maker, identity(), CONTENT, facts());
    assert.equal(confirmed.status, 'ok', 'fixture: the maker leg is confirmed');
    const ref = { recordId: maker, chainHead: await headOf(handles, maker) };
    const staged = await stageRef(handles, CONTENT, profile.id, SUBJECT, 'checker-decide');
    const entry = { ...ref };
    store.onGetStaged = () => {
      entry.recordId = 'rec-never-verified';
    };
    const shown = await openAndShow(
      handles,
      staged,
      { priorRecordRefs: [entry] },
      (record) => `recorded ${JSON.stringify(record?.priorRecordRefs)}`,
    );
    outcomes.push(`priorRecordRefs: ${shown}`);
    expected.push(
      `priorRecordRefs: recorded ${JSON.stringify([{ ...ref, legId: 'maker-decide' }])}`,
    );
  }

  // A supersedes claim.
  {
    const profile = captureProfile({ decline: true });
    const store = new StagedEditStore(new MemoryStore());
    const handles = create(makeConfig([profile], { store }));
    const predecessor = await openRecord(handles, CONTENT, profile.id, SUBJECT);
    const declined = await handles.operator.decline(predecessor, identity(), CONTENT, facts());
    assert.equal(declined.status, 'ok', 'fixture: the predecessor is declined');
    const claim = { recordId: predecessor, chainHead: await headOf(handles, predecessor) };
    const staged = await stageRef(handles, OTHER_CONTENT, profile.id, SUBJECT);
    const supersedes = { ...claim };
    store.onGetStaged = () => {
      supersedes.recordId = 'rec-never-verified';
    };
    const shown = await openAndShow(
      handles,
      staged,
      { supersedes },
      (record) => `recorded ${JSON.stringify(record?.supersedes)}`,
    );
    outcomes.push(`supersedes: ${shown}`);
    expected.push(`supersedes: recorded ${JSON.stringify(claim)}`);
  }

  // A policyDigest, and a proposed stagedRef.
  {
    const profile = policyProfile();
    const store = new StagedEditStore(new MemoryStore());
    const handles = create(makeConfig([profile], { store }));
    const proposal = await stageRef(handles, CONTENT, profile.id, SUBJECT);
    const revision = await stageRef(handles, OTHER_CONTENT, profile.id, SUBJECT);
    const third = await stageRef(handles, THIRD_CONTENT, profile.id, SUBJECT);
    const proposed = { stagedRef: proposal };
    const opts: OpenOptions = { policyDigest: BOUND, proposed };
    store.onGetStaged = (stagedRef) => {
      if (stagedRef !== revision) return;
      Reflect.deleteProperty(opts, 'policyDigest');
      proposed.stagedRef = third;
    };
    const shown = await openAndShow(
      handles,
      revision,
      opts,
      (record) => `bound ${record?.policyDigest ?? 'nothing'} and ${record?.proposedDigest}`,
    );
    outcomes.push(`policyDigest, proposed: ${shown}`);
    expected.push(`policyDigest, proposed: bound ${BOUND} and ${contentDigestOf(CONTENT)}`);
  }

  assert.deepEqual(outcomes, expected);
});

test('snapshot: an accessor that throws while open() reads its options propagates as the caller error it is; nothing is appended', async () => {
  const fault = (): never => {
    throw new Error('host accessor fault');
  };
  const throwing = <T extends object>(base: T, key: keyof T): T =>
    Object.defineProperty({ ...base }, key, { enumerable: true, configurable: true, get: fault });

  const profile = captureProfile();
  const store = new StagedEditStore(new MemoryStore());
  const handles = create(makeConfig([profile], { store }));
  const staged = await stageRef(handles, CONTENT, profile.id, SUBJECT);
  const claim = { recordId: 'rec-any', chainHead: NEVER_VERIFIED_HEAD };

  // A supersedes field, and a priorRecordRefs entry's field on a first leg — where the entries
  // are otherwise never verified at all.
  assert.equal(
    await settle(handles.operator.open(staged, { supersedes: throwing(claim, 'recordId') })),
    'threw host accessor fault',
  );
  assert.equal(
    await settle(
      handles.operator.open(staged, { priorRecordRefs: [throwing(claim, 'chainHead')] }),
    ),
    'threw host accessor fault',
  );
  assert.equal(store.appendCalls, 0, 'nothing is appended');
});

// --- the two cross-record verifications, called directly -----------------------------------

function resolvedOf(profile: ConfirmProfile): ResolvedProfile {
  return {
    profile,
    canonicalizer: (c: unknown) => c,
    effectSeam: false,
    profileDigest: profileDigest(profile),
  };
}

function ctxOver(store: Store, profiles: ConfirmProfile[]): KernelContext {
  return {
    store,
    profiles: new Map(profiles.map((p) => [p.id, resolvedOf(p)])),
    now: () => new Date(),
    mintId: () => 'unused',
    tokenSource: () => 'unused',
  };
}

test('verifySupersedes reads its claim once, before its first await, and records what it verified', async () => {
  const profile = captureProfile({ decline: true });
  const store = new MemoryStore();
  const handles = create(makeConfig([profile], { store }));
  const predecessor = await openRecord(handles, CONTENT, profile.id, SUBJECT);
  const declined = await handles.operator.decline(predecessor, identity(), CONTENT, facts());
  assert.equal(declined.status, 'ok', 'fixture: the predecessor is declined');
  const claim = { recordId: predecessor, chainHead: await headOf(handles, predecessor) };
  const ctx = ctxOver(store, [profile]);

  const outcomes: string[] = [];
  const expected: string[] = [];
  for (const field of ['recordId', 'chainHead'] as const) {
    for (const firstReads of SWITCH_POINTS) {
      const then = field === 'recordId' ? 'rec-never-verified' : NEVER_VERIFIED_HEAD;
      const checked = await verifySupersedes(
        ctx,
        switching(claim, field, firstReads, then),
        SUBJECT,
      );
      outcomes.push(`${field}@${firstReads}: ${JSON.stringify(checked)}`);
      expected.push(`${field}@${firstReads}: ${JSON.stringify({ ok: true, verified: claim })}`);
    }
  }
  assert.deepEqual(outcomes, expected);
});

test('verifyPriorLegs reads each reference once, before its first await, and records what it verified', async () => {
  const profile = twoLegProfile();
  const store = new MemoryStore();
  const handles = create(makeConfig([profile], { store }));
  const maker = await openRecord(handles, CONTENT, profile.id, SUBJECT, 'maker-decide');
  const confirmed = await handles.operator.finalize(maker, identity(), CONTENT, facts());
  assert.equal(confirmed.status, 'ok', 'fixture: the maker leg is confirmed');
  const ref = { recordId: maker, chainHead: await headOf(handles, maker) };
  const ctx = ctxOver(store, [profile]);
  const resolved = resolvedOf(profile);

  const outcomes: string[] = [];
  const expected: string[] = [];
  for (const field of ['recordId', 'chainHead'] as const) {
    for (const firstReads of SWITCH_POINTS) {
      const then = field === 'recordId' ? 'rec-never-verified' : NEVER_VERIFIED_HEAD;
      const checked = await verifyPriorLegs(ctx, resolved, 1, SUBJECT, [
        switching(ref, field, firstReads, then),
      ]);
      outcomes.push(
        `${field}@${firstReads}: ${
          checked.ok ? JSON.stringify(checked.verified?.priorRecordRefs) : 'unverified'
        }`,
      );
      expected.push(
        `${field}@${firstReads}: ${JSON.stringify([{ ...ref, legId: 'maker-decide' }])}`,
      );
    }
  }
  assert.deepEqual(outcomes, expected);
});
