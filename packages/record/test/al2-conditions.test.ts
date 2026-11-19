// @vidimera/record — test/al2-conditions.test.ts: two conditions AL2's closure holds under,
// and one residual it does not close, measured rather than asserted. SPEC §14 says AL2 closes the recompute residual and the
// head-edit windows because a rebuilt or head-edited chain fails signature verification
// without trusting storage. That holds only while the signature layer APPLIES to the record
// and only over transitions that actually committed. Both limits are pinned here as behavior,
// so the sentences that state them describe what this tree does:
//
//   (i)   every profile the instance registers signs. The layer's obligation keys on the
//         profile the instance holds for the record — the genesis's own `profileId` and
//         `profileDigest` claims. A storage-writing insider who rewrites a signing record's
//         genesis onto a co-registered non-signing profile (its digest is computable from the
//         profile with the exported `profileDigest`, or copied from any genesis under it) and
//         relinks the chain takes the record out of the layer: an edit AL2 catches in place
//         passes once rehomed. Registering only signing profiles closes the route — the
//         rehomed record names a profile the instance does not hold, and the seam refuses
//         `unknown-profile` (a refusal, not a `chain-compromise` edge). The condition binds
//         every instance acting on the store: the pin's signing-only instance refuses the same
//         forgery that a mixed-registry instance over the same store seals.
//   (iii) no signature outlives an uncommitted append. In SEPARATE mode — the configured
//         sidecar is not the store's own, here a `MemorySignatureStore` beside the SQLite
//         backing — the signing decorator writes a transition's sidecar entry before it
//         delegates the append, outside the append's transaction, so a rolled-back enlisted
//         redemption leaves a valid signature over a `redeemed` transition that never
//         committed. Entries correlate to the chain by digest, so a key-less insider who
//         splices that transition back in is not caught: `verifySignatures` reports it signed
//         and verified, the record replays as redeemed, and seal retires it. A lost
//         compare-and-swap leaves the same kind of entry over the losing transition — pinned
//         below too: a finalize batch that loses its race is a signed branch, and with the
//         committed tail deleted (the absence residual) it replaces the recorded decision, with
//         no key and no recompute. So (iii) binds the recompute threat as well as the head
//         edits. The rollback pin reads the attempted row inside the host's own transaction,
//         standing in for whatever the insider can see; the bytes are recoverable without that
//         read too, since for this profile only `at` varies, and a search over `at` against the
//         sidecar digest finds them. Those two pins describe separate mode, the sign-before-
//         append ordering, and stay as they were.
//         In INTEGRATED mode — the configured sidecar IS the store's own (`signatures:
//         sqlite.signatures`) — the entry is written inside the append's own transaction, after
//         every check has passed, so (iii) is MET: the same rollback and the same lost race leave
//         no entry over the transition, and the same splices are refused `chain-compromise`.
//         The two "met, integrated" pins below repeat both splices that way.
//
// Condition (ii), the key sits outside the insider's boundary, needs no pin: a holder of the
// key signs whatever chain it likes. It binds every key whose verifier is registered, retired
// keys included.
//
// The residual: AL2 verifies only what exists (SPEC §13A's absence residual). An insider who
// deletes a record's most recent transitions needs no recomputation and no key; every remaining
// signature verifies, and a deleted `redeemed` head lets the record be redeemed again. The
// deleted head's sidecar entry becomes an orphan, which may be its only trace.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import { verifyChain } from '../src/chain/replay.js';
import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { SignatureStore, Signer, Verifier } from '../src/signing/store.js';
import { SqliteStore } from '../src/store/sqlite.js';
import type { AppendMeta, Store } from '../src/store/store.js';
import type { Transition } from '../src/types.js';
import {
  captureProfile,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
} from './helpers/profiles.js';

const CONTENT = { subject: 'week-1', total: 40 };

/**
 * One SQLite backing and one sidecar, shared by every instance `instance()` builds over them,
 * so two instances with different registries read the same records. One Ed25519 key signs and
 * verifies for all of them. The sidecar is a separate `MemorySignatureStore` by default —
 * separate mode — or, with `'integrated'`, the SQLite backing's own (`sqlite.signatures`), which
 * selects integrated mode for any store that exposes it: the bare backing, or a wrapper that
 * exposes the backing's sidecar and forwards `meta` intact.
 */
function rig(
  profiles: ConfirmProfile[],
  wrap?: (sqlite: SqliteStore) => Store,
  sidecar: 'separate' | 'integrated' = 'separate',
) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const sqlite = new SqliteStore(':memory:');
  const signatures: SignatureStore =
    sidecar === 'integrated' ? sqlite.signatures : new MemorySignatureStore();
  const signer: Signer = async (bytes) => ({
    keyRef: 'key-1',
    signature: edSign(null, bytes, privateKey).toString('base64'),
  });
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  const signing = { signer, verifiers: { 'key-1': verifier }, signatures };
  const store = wrap === undefined ? sqlite : wrap(sqlite);
  const instance = (registered: ConfirmProfile[]) =>
    create({ ...makeConfig(registered, { store }), signing });
  return { sqlite, signatures, handles: instance(profiles), instance };
}

/** Every `prevHash` after the genesis recomputed — the relink AL1 cannot detect. */
function relink(chain: readonly Transition[]): Transition[] {
  const out = structuredClone([...chain]);
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1];
    const cur = out[i];
    if (prev !== undefined && cur !== undefined) cur.prevHash = transitionDigest(prev);
  }
  return out;
}

/**
 * The insider's write, straight to the tables: replace a record's persisted transitions with
 * `chain`, and set its index row to match. No library code signs anything on this path.
 */
function overwrite(
  sqlite: SqliteStore,
  chain: readonly Transition[],
  row: { profileId?: string; state?: string; nonTerminal?: number },
): void {
  const recordId = chain[0]?.recordId;
  assert.ok(recordId !== undefined, 'fixture: a chain to write');
  const db = sqlite.database;
  db.prepare('DELETE FROM transitions WHERE record_id = ?').run(recordId);
  const insert = db.prepare(
    'INSERT INTO transitions (record_id, seq, transition_json) VALUES (?, ?, ?)',
  );
  for (const t of chain) insert.run(t.recordId, t.seq, JSON.stringify(t));
  if (row.profileId !== undefined) {
    db.prepare('UPDATE records SET profile_id = ? WHERE id = ?').run(row.profileId, recordId);
  }
  if (row.state !== undefined && row.nonTerminal !== undefined) {
    db.prepare('UPDATE records SET state = ?, non_terminal = ?, due_at = NULL WHERE id = ?').run(
      row.state,
      row.nonTerminal,
      recordId,
    );
  }
}

/** The recorded decider rewritten on the `confirmed` transition — the edit under test. */
function forgeDecider(chain: readonly Transition[]): Transition[] {
  const out = structuredClone([...chain]);
  const confirmed = out.find((t) => t.kind === 'confirmed');
  assert.ok(confirmed !== undefined, 'fixture: the record is confirmed');
  (confirmed.payload as { actor: { principal: string } }).actor.principal = 'approver:insider';
  return out;
}

type Handles = ReturnType<typeof create>;

/** A record staged, opened and finalized under `profileId` — confirmed, every transition signed. */
async function confirmedRecord(handles: Handles, profileId: string, subjectRef: string) {
  const recordId = await openRecord(handles, CONTENT, profileId, subjectRef);
  const out = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(out.status, 'ok', 'fixture: the record confirms');
  return recordId;
}

/** The genesis rewritten to name `profileId` and carry `profileDigest` — the rehoming. */
function rehome(chain: readonly Transition[], profileId: string, profileDigest: string) {
  const out = structuredClone([...chain]);
  const payload = out[0]?.payload as { profileId: string; profileDigest: string } | undefined;
  assert.ok(payload !== undefined, 'fixture: a genesis to rewrite');
  payload.profileId = profileId;
  payload.profileDigest = profileDigest;
  return out;
}

test('condition (i): a signing record rehomed onto a co-registered non-signing profile leaves the signature layer; registering only signing profiles refuses it', async () => {
  const signingProfile: ConfirmProfile = {
    ...captureProfile({ id: 'test.al2c.signing.v1' }),
    signing: true,
  };
  const plainProfile = captureProfile({ id: 'test.al2c.plain.v1' });
  const { sqlite, handles, instance } = rig([signingProfile, plainProfile]);

  // A genuine record under the non-signing profile: its genesis carries the digest to copy.
  const donor = await openRecord(handles, CONTENT, plainProfile.id, 'subject:al2c-donor');
  const donorGenesis = (await sqlite.readChain(donor))[0];
  assert.ok(donorGenesis !== undefined, 'fixture: the donor has a genesis');
  const plainDigest = (donorGenesis.payload as { profileDigest: string }).profileDigest;

  // Baseline: the decider forged in place, the chain relinked, the genesis untouched. The
  // record stays under its signing profile, so the layer applies and the seam refuses.
  {
    const victim = await confirmedRecord(handles, signingProfile.id, 'subject:al2c-a');
    const forged = relink(forgeDecider(await sqlite.readChain(victim)));
    overwrite(sqlite, forged, {});
    assert.equal(verifyChain(forged, victim).intact, true, 'fixture: AL1 cannot see the relink');

    const out = await handles.operator.seal(victim);
    assert.equal(out.status, 'refused');
    if (out.status !== 'refused') return;
    assert.equal(out.code, 'chain-compromise', 'AL2 catches the forged decider in place');
  }

  // The same forgery, rehomed: the genesis now names the non-signing profile and carries its
  // real digest. The instance holds that profile, the layer does not apply, and seal retires a
  // record whose recorded decider never decided it.
  {
    const victim = await confirmedRecord(handles, signingProfile.id, 'subject:al2c-b');
    const forged = relink(
      rehome(forgeDecider(await sqlite.readChain(victim)), plainProfile.id, plainDigest),
    );
    overwrite(sqlite, forged, { profileId: plainProfile.id });
    assert.equal(verifyChain(forged, victim).intact, true, 'fixture: AL1 cannot see the relink');

    const report = await handles.operator.verifySignatures(victim);
    assert.equal(report.signingDeclared, false, 'the rehomed record reads as non-signing');
    assert.ok(
      report.transitions.some((t) => !t.verified),
      'the forged transitions carry no valid signature — and nothing asks',
    );

    const out = await handles.operator.seal(victim);
    assert.equal(out.status, 'ok', 'rehomed, the forgery passes the seam');
    assert.equal(
      (await handles.operator.replay(victim)).status,
      'retired',
      'the forged record is sealed as genuine',
    );

    // Condition (i) met: an instance registering only signing profiles does not hold the
    // profile the rehomed genesis names, so the seam refuses and writes nothing.
    const signingOnly = instance([signingProfile]);
    const victim2 = await confirmedRecord(handles, signingProfile.id, 'subject:al2c-c');
    const forged2 = relink(
      rehome(forgeDecider(await sqlite.readChain(victim2)), plainProfile.id, plainDigest),
    );
    overwrite(sqlite, forged2, { profileId: plainProfile.id });

    const refused = await signingOnly.operator.seal(victim2);
    assert.equal(refused.status, 'refused');
    if (refused.status !== 'refused') return;
    assert.equal(refused.code, 'unknown-profile', 'an unheld profile refuses at resolution');
    assert.deepEqual(await sqlite.readChain(victim2), forged2, 'nothing was appended');
  }
});

test('condition (iii): a signature over a rolled-back enlisted redemption outlives it, and the never-committed transition spliced back in verifies and is sealed as genuine', async () => {
  const profile: ConfirmProfile = {
    ...effectSeamProfile({ id: 'test.al2c.redeem.v1' }),
    signing: true,
  };
  // Separate mode: the configured sidecar is a `MemorySignatureStore`, not the backing's own.
  const { sqlite, handles } = rig([profile]);
  const recordId = await confirmedRecord(handles, profile.id, 'subject:al2c-redeem');
  const committed = await sqlite.readChain(recordId);
  assert.equal(committed.at(-1)?.kind, 'confirmed');

  // The host enlists the redemption in its transaction, then rolls it back.
  sqlite.database.exec('BEGIN IMMEDIATE');
  const redeemed = await handles.operator.redeem(recordId, CONTENT, { tx: sqlite.database });
  assert.equal(redeemed.status, 'ok');
  const attempted = (await sqlite.readChain(recordId)).at(-1); // what the insider observed
  sqlite.database.exec('ROLLBACK');
  assert.ok(attempted !== undefined && attempted.kind === 'redeemed');
  assert.deepEqual(await sqlite.readChain(recordId), committed, 'the redemption never committed');

  // Its signature did not roll back — separate mode put it before the append, outside the
  // host's transaction: the sidecar entry sits there as an orphan.
  const before = await handles.operator.verifySignatures(recordId);
  assert.ok(
    before.orphans.includes(transitionDigest(attempted)),
    "the rolled-back transition's signature survived the rollback",
  );

  // A key-less insider splices the never-committed transition back in. Nothing is signed or
  // recomputed: the transition already chains over the committed head.
  const spliced = [...committed, attempted];
  overwrite(sqlite, spliced, { state: 'redeemed', nonTerminal: 0 });
  assert.equal(verifyChain(spliced, recordId).intact, true);

  const report = await handles.operator.verifySignatures(recordId);
  assert.equal(report.signingDeclared, true, 'the layer applies');
  assert.ok(
    report.transitions.every((t) => t.signed && t.verified),
    'every transition, the spliced one included, verifies',
  );
  assert.equal((await handles.operator.replay(recordId)).state, 'redeemed');

  const sealed = await handles.operator.seal(recordId);
  assert.equal(sealed.status, 'ok', 'the seam accepts the never-committed redemption as genuine');

  // Contrast: a redemption the insider fabricates outright carries no signature, and the
  // same seam refuses it — the splice passes only because the orphan signature exists.
  const other = await confirmedRecord(handles, profile.id, 'subject:al2c-fabricated');
  const otherChain = await sqlite.readChain(other);
  const head = otherChain.at(-1);
  assert.ok(head !== undefined);
  const fabricated: Transition = {
    ...structuredClone(attempted),
    recordId: other,
    seq: head.seq + 1,
    prevHash: transitionDigest(head),
  };
  overwrite(sqlite, [...otherChain, fabricated], { state: 'redeemed', nonTerminal: 0 });
  const refused = await handles.operator.seal(other);
  assert.equal(refused.status, 'refused');
  if (refused.status !== 'refused') return;
  assert.equal(refused.code, 'chain-compromise', 'an unsigned fabrication is caught');
});

test('condition (iii) met, integrated: a redemption rolled back with its host transaction takes its signature with it, and the never-committed transition spliced back in is refused chain-compromise', async () => {
  const profile: ConfirmProfile = {
    ...effectSeamProfile({ id: 'test.al2c.redeem.integrated.v1' }),
    signing: true,
  };
  // Integrated mode: the configured sidecar is the backing's own table.
  const { sqlite, handles } = rig([profile], undefined, 'integrated');
  const recordId = await confirmedRecord(handles, profile.id, 'subject:al2c-redeem-integrated');
  const committed = await sqlite.readChain(recordId);
  assert.equal(committed.at(-1)?.kind, 'confirmed');

  // The same host transaction, enlisted and rolled back.
  sqlite.database.exec('BEGIN IMMEDIATE');
  const redeemed = await handles.operator.redeem(recordId, CONTENT, { tx: sqlite.database });
  assert.equal(redeemed.status, 'ok');
  const attempted = (await sqlite.readChain(recordId)).at(-1); // what the insider observed
  const inside = await sqlite.signatures.listByRecord(recordId);
  sqlite.database.exec('ROLLBACK');
  assert.ok(attempted !== undefined && attempted.kind === 'redeemed');
  assert.ok(
    inside.some((e) => e.transitionDigest === transitionDigest(attempted)),
    'integrated: the entry was written inside the host transaction, with its transition',
  );
  assert.deepEqual(await sqlite.readChain(recordId), committed, 'the redemption never committed');

  // Its signature rolled back with it: no entry names the attempted transition, so no orphan.
  const before = await handles.operator.verifySignatures(recordId);
  assert.deepEqual(before.orphans, [], 'no signature outlived the append');
  assert.ok(
    (await sqlite.signatures.listByRecord(recordId)).every(
      (e) => e.transitionDigest !== transitionDigest(attempted),
    ),
    'the attempted transition has no entry',
  );

  // The same splice as the separate-mode pin above: AL1 still cannot see it.
  const spliced = [...committed, attempted];
  overwrite(sqlite, spliced, { state: 'redeemed', nonTerminal: 0 });
  assert.equal(verifyChain(spliced, recordId).intact, true);

  const report = await handles.operator.verifySignatures(recordId);
  assert.equal(report.signingDeclared, true, 'the layer applies');
  assert.deepEqual(
    report.transitions.filter((t) => !t.signed).map((t) => t.seq),
    [attempted.seq],
    'the spliced transition, and only it, carries no signature',
  );

  const sealed = await handles.operator.seal(recordId);
  assert.equal(sealed.status, 'refused');
  if (sealed.status !== 'refused') return;
  assert.equal(sealed.code, 'chain-compromise', 'the never-committed redemption is caught');
});

test('the absence residual: a deleted redemption head leaves every remaining signature verifying, and the record redeems again', async () => {
  const profile: ConfirmProfile = {
    ...effectSeamProfile({ id: 'test.al2c.truncate.v1' }),
    signing: true,
  };
  const { sqlite, handles } = rig([profile]);
  const recordId = await confirmedRecord(handles, profile.id, 'subject:al2c-truncate');
  const beforeRedeem = await sqlite.readChain(recordId);
  assert.equal((await handles.operator.redeem(recordId, CONTENT)).status, 'ok');
  const head = (await sqlite.readChain(recordId)).at(-1);
  assert.ok(head !== undefined && head.kind === 'redeemed');

  // The insider deletes the committed head and resets the index row. Nothing is recomputed and
  // nothing is signed.
  overwrite(sqlite, beforeRedeem, { state: 'confirmed', nonTerminal: 1 });
  assert.equal(verifyChain(beforeRedeem, recordId).intact, true);

  const report = await handles.operator.verifySignatures(recordId);
  assert.ok(
    report.transitions.every((t) => t.signed && t.verified),
    'every remaining transition verifies',
  );
  assert.ok(
    report.orphans.includes(transitionDigest(head)),
    "the deleted head's entry is an orphan now — the only trace it existed",
  );
  assert.equal((await handles.operator.replay(recordId)).state, 'confirmed');
  assert.equal(
    (await handles.operator.redeem(recordId, CONTENT)).status,
    'ok',
    'the record is redeemed a second time',
  );
});

/**
 * A backing that holds the FIRST `appendBatch` until a second one arrives, then lets both
 * through: both batches are built and signed over the same head before either is adjudicated,
 * so exactly one wins and the other loses its compare-and-swap, deterministically. It records
 * every batch it was handed — what an insider watching the writes would see — and the `meta`
 * each carried. It exposes the inner backing's own sidecar and forwards `meta` and `tx` intact,
 * so the mode is the configuration's: an instance configured with `inner.signatures` runs
 * integrated, one configured with any other sidecar runs separate.
 */
function raceBatches(inner: SqliteStore): {
  store: Store;
  batches: Transition[][];
  metas: AppendMeta[];
} {
  const batches: Transition[][] = [];
  const metas: AppendMeta[] = [];
  let release: (() => void) | undefined;
  const store: Store = {
    signatures: inner.signatures,
    putStaged: (staged, tx) => inner.putStaged(staged, tx as DatabaseSync | undefined),
    getStaged: (ref) => inner.getStaged(ref),
    appendTransition: (expected, transition, meta, tx) =>
      inner.appendTransition(expected, transition, meta, tx as DatabaseSync | undefined),
    async appendBatch(expected, transitions, meta, tx) {
      batches.push(structuredClone([...transitions]));
      metas.push(meta);
      if (batches.length === 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      } else if (batches.length === 2) {
        release?.();
      }
      return inner.appendBatch(expected, transitions, meta, tx as DatabaseSync | undefined);
    },
    readChain: (recordId) => inner.readChain(recordId),
    chainHead: (recordId) => inner.chainHead(recordId),
    listDue: (now) => inner.listDue(now),
    findNonTerminal: (profileId, subjectRef) => inner.findNonTerminal(profileId, subjectRef),
  };
  return { store, batches, metas };
}

test('condition (iii), the lost compare-and-swap: a finalize batch that loses its race is a signed branch, and with the committed tail deleted it replaces the recorded decision', async () => {
  const profile: ConfirmProfile = {
    ...effectSeamProfile({ id: 'test.al2c.race.v1' }),
    signing: true,
  };
  // Separate mode: the configured sidecar is a `MemorySignatureStore`, not the backing's own, so
  // each batch's entries are put before it is handed to the race.
  let race: ReturnType<typeof raceBatches> | undefined;
  const { sqlite, handles } = rig([profile], (inner) => {
    race = raceBatches(inner);
    return race.store;
  });
  assert.ok(race !== undefined);
  const recordId = await openRecord(handles, CONTENT, profile.id, 'subject:al2c-race');
  const base = await sqlite.readChain(recordId); // [opened]: the head both batches chain over

  const outcomes = await Promise.all([
    handles.operator.finalize(recordId, identity({ principal: 'approver:A' }), CONTENT, facts()),
    handles.operator.finalize(recordId, identity({ principal: 'approver:B' }), CONTENT, facts()),
  ]);
  assert.deepEqual(
    outcomes.map((o) => o.status).sort(),
    ['ok', 'refused'],
    'one decision lands, the other loses its compare-and-swap',
  );
  assert.equal(race.batches.length, 2, 'both batches were built and signed');
  const decider = (chain: readonly Transition[]): string => {
    const confirmed = chain.find((t) => t.kind === 'confirmed');
    assert.ok(confirmed !== undefined, 'fixture: a confirmed transition');
    return (confirmed.payload as { actor: { principal: string } }).actor.principal;
  };
  const winner = decider(await sqlite.readChain(recordId));
  const lost = race.batches.find((b) => decider(b) !== winner);
  assert.ok(lost !== undefined, 'the losing batch differs from the committed one');

  // The committed decision is buried under a redemption.
  assert.equal((await handles.operator.redeem(recordId, CONTENT)).status, 'ok');

  // The insider deletes everything after the shared genesis and writes the losing batch in.
  // Nothing is signed and nothing is recomputed: the losing batch chains over that genesis.
  const rewritten = [...base, ...lost];
  overwrite(sqlite, rewritten, { state: 'confirmed', nonTerminal: 1 });
  assert.equal(verifyChain(rewritten, recordId).intact, true);

  const report = await handles.operator.verifySignatures(recordId);
  assert.ok(
    report.transitions.every((t) => t.signed && t.verified),
    "every transition verifies, the losing batch's included",
  );
  assert.notEqual(decider(await sqlite.readChain(recordId)), winner, 'the decider is rewritten');
  assert.equal(
    (await handles.operator.redeem(recordId, CONTENT)).status,
    'ok',
    'and the record redeems a second time',
  );
});

test('condition (iii) met, integrated: a finalize batch that loses its race leaves no signature, and the losing batch written in over the deleted tail is refused chain-compromise', async () => {
  const profile: ConfirmProfile = {
    ...effectSeamProfile({ id: 'test.al2c.race.integrated.v1' }),
    signing: true,
  };
  // Integrated mode through the race wrapper: the configured sidecar is the backing's own, and
  // the wrapper exposes it and forwards `meta` intact.
  let race: ReturnType<typeof raceBatches> | undefined;
  const { sqlite, handles } = rig(
    [profile],
    (inner) => {
      race = raceBatches(inner);
      return race.store;
    },
    'integrated',
  );
  assert.ok(race !== undefined);
  const recordId = await openRecord(handles, CONTENT, profile.id, 'subject:al2c-race-integrated');
  const base = await sqlite.readChain(recordId); // [opened]: the head both batches chain over

  const outcomes = await Promise.all([
    handles.operator.finalize(recordId, identity({ principal: 'approver:A' }), CONTENT, facts()),
    handles.operator.finalize(recordId, identity({ principal: 'approver:B' }), CONTENT, facts()),
  ]);
  assert.deepEqual(
    outcomes.map((o) => o.status).sort(),
    ['ok', 'refused'],
    'one decision lands, the other loses its compare-and-swap',
  );
  assert.equal(race.batches.length, 2, 'both batches were built and signed');
  assert.deepEqual(
    race.metas.map((m) => m.signatures?.length),
    race.batches.map((b) => b.length),
    'integrated: each batch carried one entry per element down to the store',
  );
  const decider = (chain: readonly Transition[]): string => {
    const confirmed = chain.find((t) => t.kind === 'confirmed');
    assert.ok(confirmed !== undefined, 'fixture: a confirmed transition');
    return (confirmed.payload as { actor: { principal: string } }).actor.principal;
  };
  const committed = await sqlite.readChain(recordId);
  const winner = decider(committed);
  const lost = race.batches.find((b) => decider(b) !== winner);
  assert.ok(lost !== undefined, 'the losing batch differs from the committed one');

  // The store wrote the winner's entries and none of the loser's. Two batches stamped in the same
  // millisecond share their consultation bytes, so "the loser's" means the losing transitions the
  // committed chain does not also hold — the losing decision at least.
  const committedDigests = committed.map((t) => transitionDigest(t));
  const lostOnly = lost.filter((t) => !committedDigests.includes(transitionDigest(t)));
  assert.ok(
    lostOnly.some((t) => t.kind === 'confirmed'),
    'fixture: the losing decision is its own',
  );
  const sidecarDigests = (await sqlite.signatures.listByRecord(recordId))
    .map((e) => e.transitionDigest)
    .sort();
  assert.deepEqual(
    sidecarDigests,
    [...committedDigests].sort(),
    'the sidecar is exactly the chain',
  );
  assert.ok(
    lostOnly.every((t) => !sidecarDigests.includes(transitionDigest(t))),
    'no entry names a losing transition',
  );

  // The committed decision is buried under a redemption, then the same rewrite as the
  // separate-mode pin above: everything after the shared genesis deleted, the losing batch in.
  assert.equal((await handles.operator.redeem(recordId, CONTENT)).status, 'ok');
  const rewritten = [...base, ...lost];
  overwrite(sqlite, rewritten, { state: 'confirmed', nonTerminal: 1 });
  assert.equal(verifyChain(rewritten, recordId).intact, true);

  const report = await handles.operator.verifySignatures(recordId);
  assert.deepEqual(
    report.transitions.filter((t) => !t.signed).map((t) => t.seq),
    lostOnly.map((t) => t.seq),
    "the losing batch's own transitions, and only they, carry no signature",
  );
  const refused = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(refused.status, 'refused');
  if (refused.status !== 'refused') return;
  assert.equal(refused.code, 'chain-compromise', 'the losing branch is caught');
});
