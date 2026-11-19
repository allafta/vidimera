// @vidimera/record — test/al2-conditions.test.ts: two conditions AL2's closure holds under,
// measured rather than asserted. SPEC §14 says AL2 closes the recompute residual and the
// head-edit windows because a rebuilt or head-edited chain fails signature verification
// without trusting storage. That holds only while the signature layer APPLIES to the record
// and only over transitions that actually committed. Both limits are pinned here as behavior,
// so the sentences that state them describe what this tree does:
//
//   (i)   every profile the instance registers signs. The layer's obligation keys on the
//         profile the instance holds for the record — the genesis's own `profileId` and
//         `profileDigest` claims. A storage-writing insider who rewrites a signing record's
//         genesis onto a co-registered non-signing profile (copying that profile's real
//         digest from any genuine genesis) and relinks the chain takes the record out of the
//         layer: an edit AL2 catches in place passes once rehomed. Registering only signing
//         profiles closes the route — the rehomed record names a profile the instance does not
//         hold, and the seam refuses.
//   (iii) no signature outlives an uncommitted append. The signing decorator writes a
//         transition's sidecar entry before it delegates the append, outside the append's
//         transaction, so a rolled-back enlisted redemption leaves a valid signature over a
//         `redeemed` transition that never committed. Entries correlate to the chain by
//         digest, so a key-less insider who splices that transition back in is not caught:
//         `verifySignatures` reports it signed and verified, the record replays as redeemed,
//         and seal retires it. A lost compare-and-swap leaves the same kind of entry over the
//         losing transition; the rollback is the shape pinned here. This pin describes the
//         sign-before-append ordering; a change that writes entries inside the append's own
//         atomic unit decides which backings it still describes.
//
// Condition (ii), the key sits outside the insider's boundary, needs no pin: a holder of the
// key signs whatever chain it likes.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import { transitionDigest } from '../src/chain/encoding.js';
import { verifyChain } from '../src/chain/replay.js';
import type { ConfirmProfile } from '../src/config.js';
import { create } from '../src/create.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, Verifier } from '../src/signing/store.js';
import { SqliteStore } from '../src/store/sqlite.js';
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
 * verifies for all of them.
 */
function rig(profiles: ConfirmProfile[]) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const sqlite = new SqliteStore(':memory:');
  const signatures = new MemorySignatureStore();
  const signer: Signer = async (bytes) => ({
    keyRef: 'key-1',
    signature: edSign(null, bytes, privateKey).toString('base64'),
  });
  const verifier: Verifier = async (bytes, signature) =>
    edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));
  const signing = { signer, verifiers: { 'key-1': verifier }, signatures };
  const instance = (registered: ConfirmProfile[]) =>
    create({ ...makeConfig(registered, { store: sqlite }), signing });
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

test('condition (iii): a signature over a rolled-back enlisted redemption outlives it, and the never-committed transition spliced back in passes every seam', async () => {
  const profile: ConfirmProfile = {
    ...effectSeamProfile({ id: 'test.al2c.redeem.v1' }),
    signing: true,
  };
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

  // Its signature did not roll back: the sidecar entry sits there as an orphan.
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
