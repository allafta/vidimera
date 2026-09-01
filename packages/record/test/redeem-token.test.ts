// @vidimera/record — redeem-token.test.ts (SPEC §11.2 "Redemption (the effect seam)", the
// TOKEN shape — second step-3 increment): the separated-store coupling —
// `confirmed → redeeming { tokenDigest }` at beginRedemption() (the single-use token,
// library-generated, returned exactly once, never persisted), and
// `redeeming → redeemed { via: 'token', tokenDigest }` at completeRedemption() on
// presenting that token. Both redemption clocks landed at the third step-3 increment
// (kernel/expiry.ts; exercised end-to-end in clocks.test.ts, not here): this file's
// `effectSeamProfile()` declares `redeemBound`, so its beginRedemption pins DO carry a
// `bound` payload key and a `dueAt`, but no test in this file advances the clock past
// either bound or asserts a redemption-failed record — that is clocks.test.ts's own
// ground, not this file's.
//
// ADJACENT-PAIR ORDER TESTS are derived per redeem.test.ts's discipline, per ladder, at
// the bottom of this file — each ladder's derivation comment enumerates the jointly
// constructible pairs and why the rest are excluded.

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { digest } from '../src/canonical.js';
import { create, createWithClock } from '../src/create.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import { storeGenesis, storeNext } from './helpers/chain.js';
import {
  captureProfile,
  DEFAULT_SUBJECT_REF,
  effectSeamProfile,
  facts,
  identity,
  makeConfig,
  openRecord,
  tamperNonLast,
} from './helpers/profiles.js';
import { RaceOnceStore, TamperingStore } from './helpers/stores.js';

const CONTENT = { subject: 'week-1', total: 40 };

/** Opens and finalizes an effect-seam record, leaving it confirmed and NON-terminal. */
async function confirmedEffectRecord(store: MemoryStore | SqliteStore = new MemoryStore()) {
  const handles = create(makeConfig([effectSeamProfile()], { store }));
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok', 'fixture: the record must confirm');
  return { handles, recordId, store };
}

/** Begins a token redemption on a fresh confirmed record; returns the token too. */
async function redeemingRecord(store: MemoryStore | SqliteStore = new MemoryStore()) {
  const { handles, recordId } = await confirmedEffectRecord(store);
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok', 'fixture: beginRedemption must succeed');
  if (begun.status !== 'ok') throw new Error('unreachable');
  return { handles, recordId, store, token: begun.value.token };
}

// === beginRedemption: the issuance ====================================================

test('beginRedemption() on a confirmed effect-seam record appends redeeming { tokenDigest } and returns the token once', async () => {
  const { handles, recordId } = await confirmedEffectRecord();

  const outcome = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;
  assert.equal(outcome.value.state, 'redeeming');
  assert.equal(outcome.value.recordId, recordId);

  // Token format pin: 32 random bytes, base64url, no padding — 43 chars (SPEC §11.2's
  // "enough entropy that its digest is not invertible by guessing", §13's limit).
  assert.match(outcome.value.token, /^[A-Za-z0-9_-]{43}$/);

  const chain = await handles.operator.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'redeeming');
  // PAYLOAD KEY-SET PIN: exactly { tokenDigest, bound } — `effectSeamProfile()` declares
  // `redeemBound`, so §4's present-iff-declared `bound` is present here.
  assert.deepEqual(Object.keys(last.payload as object).sort(), ['bound', 'tokenDigest']);
  assert.equal(
    (last.payload as { tokenDigest: string }).tokenDigest,
    digest(outcome.value.token),
    'the chain carries exactly the digest of the returned token',
  );

  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'redeeming');
  assert.equal(record?.status, 'active');
});

/** An effect-seam profile that deliberately declares NO redeemBound (§9.1's SHOULD is a
 * policy choice, not a MUST): the strand-risk shape, and §4's bound-absent byte pin. */
function noRedeemBoundProfile() {
  return {
    ...effectSeamProfile({ id: 'test.effect.nobound.v1' }),
    redeem: { confirmToRedeem: 3600 },
  };
}

test('beginRedemption without redeemBound: payload stays exactly { tokenDigest } — present-iff-declared, absent half', async () => {
  const store = new MemoryStore();
  const handles = create(makeConfig([noRedeemBoundProfile()], { store }));
  const recordId = await openRecord(
    handles,
    CONTENT,
    'test.effect.nobound.v1',
    DEFAULT_SUBJECT_REF,
  );
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok');
  const last = (await store.readChain(recordId)).at(-1);
  assert.ok(last !== undefined);
  assert.deepEqual(Object.keys(last.payload as object), ['tokenDigest']);
});

test('token custody: the token appears in the begin ok value and NOWHERE else (chain, store rows, refusals)', async () => {
  const store = new SqliteStore(':memory:');
  const { handles, recordId, token } = await redeemingRecord(store);

  const chain = await handles.operator.readChain(recordId);
  assert.ok(!JSON.stringify(chain).includes(token), 'the chain must not carry the raw token');

  // Dump EVERY table generically — robust to schema naming.
  const db = store.database;
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
    name: string;
  }[];
  assert.ok(tables.length > 0, 'fixture: the sqlite schema has tables');
  for (const { name } of tables) {
    const rows = db.prepare(`SELECT * FROM "${name}"`).all();
    assert.ok(
      !JSON.stringify(rows).includes(token),
      `the raw token must not appear in table '${name}'`,
    );
  }

  // A refusal outcome must not echo the token either: a second begin refuses.
  const again = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.ok(!JSON.stringify(again).includes(token));
});

test('two begins on two records issue different tokens (randomness smoke)', async () => {
  const a = await redeemingRecord();
  const b = await redeemingRecord();
  assert.notEqual(a.token, b.token);
});

test('beginRedemption: no re-issue — a second begin on a redeeming record refuses unredeemable-state with no append', async () => {
  // DECISIONS #30: "a persisted or re-issuable token would trade the at-most-once
  // guarantee for convenience". `unredeemable-state` is this build's mapping (§8's
  // enumeration predates the state) — recorded in the status doc.
  const { handles, recordId } = await redeemingRecord();
  const before = (await handles.operator.readChain(recordId)).length;

  const again = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(again.status, 'refused');
  if (again.status !== 'refused') return;
  assert.equal(again.code, 'unredeemable-state');
  assert.equal((await handles.operator.readChain(recordId)).length, before);
});

test('beginRedemption on a pure-capture profile refuses unredeemable-state; on open/refused likewise', async () => {
  // Pure-capture (any state): §11.2's preamble — on-iff-effects.
  const captureHandles = create(makeConfig([captureProfile()]));
  const capId = await openRecord(captureHandles, CONTENT, 'test.capture.v1', DEFAULT_SUBJECT_REF);
  const cap = await captureHandles.operator.beginRedemption(capId, CONTENT);
  assert.equal(cap.status, 'refused');
  if (cap.status === 'refused') assert.equal(cap.code, 'unredeemable-state');

  // Effect-seam but still open:
  const handles = create(makeConfig([effectSeamProfile()]));
  const openId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const stillOpen = await handles.operator.beginRedemption(openId, CONTENT);
  assert.equal(stillOpen.status, 'refused');
  if (stillOpen.status === 'refused') assert.equal(stillOpen.code, 'unredeemable-state');

  // Effect-seam, terminally refused (§11.2's preamble names refused/expired explicitly):
  const refusingHandles = create(
    makeConfig([
      effectSeamProfile({
        id: 'test.effect.refusing.v1',
        terminalRefusals: ['identity-authority-refused'],
      }),
    ]),
  );
  const refId = await openRecord(
    refusingHandles,
    CONTENT,
    'test.effect.refusing.v1',
    DEFAULT_SUBJECT_REF,
  );
  const refFin = await refusingHandles.operator.finalize(
    refId,
    identity({ authority: 'session:wrong-app' }),
    CONTENT,
    facts(),
  );
  assert.equal(refFin.status, 'refused', 'fixture: the record must terminally refuse');
  const onRefused = await refusingHandles.operator.beginRedemption(refId, CONTENT);
  assert.equal(onRefused.status, 'refused');
  if (onRefused.status === 'refused') assert.equal(onRefused.code, 'unredeemable-state');
});

test('beginRedemption with mismatched content refuses effect-mismatch, no append', async () => {
  // Begin-time correspondence is this build's ADDITION (comment-argued at the seam):
  // §11.2's Honest bound makes a MISMATCHED effect refusable at the seam — refusing
  // before a token is ever issued is what that buys in the separated shape.
  const { handles, recordId } = await confirmedEffectRecord();
  const before = (await handles.operator.readChain(recordId)).length;

  const outcome = await handles.operator.beginRedemption(recordId, {
    subject: 'week-1',
    total: 41,
  });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'effect-mismatch');
  assert.equal((await handles.operator.readChain(recordId)).length, before);
});

test('beginRedemption: unknown recordId throws (a caller error, not a refusal)', async () => {
  const handles = create(makeConfig([effectSeamProfile()]));
  await assert.rejects(
    handles.operator.beginRedemption('no-such-record', CONTENT),
    /unknown recordId 'no-such-record'/,
  );
});

test('the injectable tokenSource drives a deterministic token (internal seam, like the clock)', async () => {
  const store = new MemoryStore();
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store }),
    () => new Date(Date.UTC(2026, 0, 1)),
    undefined,
    () => 'fixed-token-under-test-000000000000000000000',
  );
  const recordId = await openRecord(handles, CONTENT, 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const done = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(done.status, 'ok');
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok');
  if (begun.status !== 'ok') return;
  assert.equal(begun.value.token, 'fixed-token-under-test-000000000000000000000');
});

// === row 10: the redeeming chain-compromise candidates =================================

test('verify-first on a tampered redeeming chain: chain-compromise WITH a transitionRef, edge redeeming→refused', async () => {
  // Deferral-register row 10, retired by building at the second step-3 increment: SPEC §5
  // admits `redeeming → refused` DIRECTLY ("both are non-terminal states"). Before this
  // increment, a tampered redeeming chain fell through appendChainCompromise's catch
  // branch (replay threw on the kind) and would have surfaced REF-LESS; the candidate
  // lists now carry 'redeeming'.
  const inner = new MemoryStore();
  const { recordId, token } = await redeemingRecord(inner);

  void token; // the completion-driven twin of this test lands with completeRedemption
  const tampering = new TamperingStore(inner, recordId, tamperNonLast);
  const handles = create(makeConfig([effectSeamProfile()], { store: tampering }));

  const outcome = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
  assert.ok(outcome.transitionRef !== undefined, 'the compromise edge must carry a ref');

  const real = await inner.readChain(recordId);
  const last = real.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'refused');
  assert.deepEqual(last.payload, { code: 'chain-compromise' });
});

test('verify-first on a GENESIS-KIND-tampered redeeming chain (replay throws, forcing the catch-branch candidate fallback): chain-compromise WITH a transitionRef', async () => {
  // The corner row 10 actually names: replay(chain) THROWS on the tampered chain (the
  // genesis kind is corrupted, so replay cannot even seed a DecisionRecord), forcing
  // appendChainCompromise's catch branch — the STATIC candidate list — rather than the
  // dynamic replay(chain).state candidate the test above exercises. Before this
  // increment's kernel/finalize.ts edit, that static list was `['open', 'confirmed']`,
  // neither of which matches the record's true persisted state ('redeeming'), so every
  // candidate CAS would have failed state-mismatch and the compromise would have
  // surfaced result-first with NO transitionRef (the ref-less fallback). The static list
  // now carries 'redeeming' too, so the CAS against the record's true state succeeds.
  const inner = new MemoryStore();
  const { recordId, token } = await redeemingRecord(inner);
  void token; // the completion-driven twin of this test lands with completeRedemption

  const tampering = new TamperingStore(inner, recordId, (chain) => {
    const t = structuredClone(chain);
    const genesis = t[0];
    if (genesis === undefined) throw new Error('fixture: chain has a genesis');
    t[0] = { ...genesis, kind: 'confirmed' }; // genesis KIND tamper — replay() throws
    return t;
  });
  const handles = create(makeConfig([effectSeamProfile()], { store: tampering }));

  const outcome = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
  assert.ok(outcome.transitionRef !== undefined, 'the compromise edge must carry a ref');

  const real = await inner.readChain(recordId);
  const last = real.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'refused');
  assert.deepEqual(last.payload, { code: 'chain-compromise' });
});

test('verify-first at completion: a tampered redeeming chain refuses chain-compromise before any token check', async () => {
  // The completion-driven twin of the two tests above, promised there ("the
  // completion-driven twin of this test lands with completeRedemption").
  const inner = new MemoryStore();
  const { recordId, token } = await redeemingRecord(inner);
  const tampering = new TamperingStore(inner, recordId, tamperNonLast);
  const handles = create(makeConfig([effectSeamProfile()], { store: tampering }));

  const outcome = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
  assert.ok(outcome.transitionRef !== undefined);
});

// === completeRedemption: the presentation ==============================================

test('completeRedemption() with the issued token appends redeemed { via: "token", tokenDigest }', async () => {
  const { handles, recordId, token } = await redeemingRecord();

  const outcome = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(outcome.status, 'ok');
  if (outcome.status !== 'ok') return;
  assert.equal(outcome.value.state, 'redeemed');

  const chain = await handles.operator.readChain(recordId);
  const last = chain.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.kind, 'redeemed');
  // PAYLOAD KEY-SET PIN: exactly { via, tokenDigest } — §4's table row for the token
  // completion; the digest ties completion to issuance in the chain itself.
  assert.deepEqual(Object.keys(last.payload as object).sort(), ['tokenDigest', 'via']);
  assert.deepEqual(last.payload, { via: 'token', tokenDigest: digest(token) });
  assert.ok(!JSON.stringify(chain).includes(token), 'completion must not persist the token');

  const record = await handles.operator.getRecord(recordId);
  assert.equal(record?.state, 'redeemed');
});

test('THE RELEASE via the token path: after completion, the pair is held no longer', async () => {
  const store = new MemoryStore();
  const { handles, recordId, token } = await redeemingRecord(store);

  assert.equal(
    await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF),
    recordId,
    'fixture: the redeeming record holds the pair through the token window',
  );

  const outcome = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(outcome.status, 'ok', 'fixture: the completion must succeed');

  assert.equal(await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF), null);

  const staged = await handles.agent.stage(
    { subject: 'week-2', total: 41 },
    'test.effect.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const reopened = await handles.operator.open(staged.value.stagedRef);
  assert.equal(reopened.status, 'ok', 'a fresh decision for the released pair opens');
});

test('exclusivity through the token window: a second open() refuses record-exists, findNonTerminal names the blocker', async () => {
  // §4: "open()'s exclusivity check never auto-resolves a `redeeming` blocker, due or
  // not — it refuses `record-exists`" (the non-due variant is the only constructible one
  // in this build). ALSO the latent-throw fix pin: before the second step-3 increment,
  // open()'s blocker replay THREW on a redeeming chain; the replay arm fixed it.
  const store = new MemoryStore();
  const { handles, recordId } = await redeemingRecord(store);

  const staged = await handles.agent.stage(
    { subject: 'week-2', total: 99 },
    'test.effect.v1',
    DEFAULT_SUBJECT_REF,
  );
  assert.equal(staged.status, 'ok');
  if (staged.status !== 'ok') return;
  const second = await handles.operator.open(staged.value.stagedRef);
  assert.equal(second.status, 'refused');
  if (second.status !== 'refused') return;
  assert.equal(second.code, 'record-exists');
  assert.equal(await store.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF), recordId);
});

test('at-most-once, replay half: a second completion refuses already-redeemed (even with the right token)', async () => {
  const { handles, recordId, token } = await redeemingRecord();
  const first = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(first.status, 'ok');

  const again = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(again.status, 'refused');
  if (again.status !== 'refused') return;
  assert.equal(again.code, 'already-redeemed');
});

test('begin after completion refuses already-redeemed (a begin is a redemption attempt too)', async () => {
  const { handles, recordId, token } = await redeemingRecord();
  await handles.operator.completeRedemption(recordId, token, CONTENT);

  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'refused');
  if (begun.status !== 'refused') return;
  assert.equal(begun.code, 'already-redeemed');
});

test('a wrong token refuses effect-mismatch, no append', async () => {
  const { handles, recordId } = await redeemingRecord();
  const before = (await handles.operator.readChain(recordId)).length;

  const outcome = await handles.operator.completeRedemption(
    recordId,
    'A'.repeat(43), // format-plausible, value-wrong
    CONTENT,
  );
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'effect-mismatch');
  assert.equal((await handles.operator.readChain(recordId)).length, before);
});

test('mismatched content at completion refuses effect-mismatch, no append', async () => {
  const { handles, recordId, token } = await redeemingRecord();
  const before = (await handles.operator.readChain(recordId)).length;

  const outcome = await handles.operator.completeRedemption(recordId, token, {
    subject: 'week-1',
    total: 41,
  });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'effect-mismatch');
  assert.equal((await handles.operator.readChain(recordId)).length, before);
});

test('content that re-canonicalizes identically completes ok (key order is not content)', async () => {
  const { handles, recordId, token } = await redeemingRecord();
  const outcome = await handles.operator.completeRedemption(recordId, token, {
    total: 40,
    subject: 'week-1', // same content, different key order — JCS canonicalizes
  });
  assert.equal(outcome.status, 'ok');
});

test('completion against a never-began confirmed record refuses unredeemable-state', async () => {
  const { handles, recordId } = await confirmedEffectRecord();
  const outcome = await handles.operator.completeRedemption(recordId, 'A'.repeat(43), CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state');
});

test('direct redeem() on a redeeming record refuses unredeemable-state — no token-bypassing close', async () => {
  // The first increment's defensive arm, now REACHABLE and pinned: a direct close of a
  // token-opened window would bypass the presentation the executor deduplicates on
  // (§11.2's Honest bound).
  const { handles, recordId } = await redeemingRecord();
  const outcome = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state');
});

test('completeRedemption: a non-string token throws at argument intake (caller bug, not a refusal)', async () => {
  const { handles, recordId } = await redeemingRecord();
  await assert.rejects(
    handles.operator.completeRedemption(recordId, undefined as unknown as string, CONTENT),
    /token must be a string/,
  );
});

test('completeRedemption: a garbled persisted tokenDigest THROWS naming the storage fault, never loops on effect-mismatch', async () => {
  // A hash-intact chain whose redeeming payload lacks a string tokenDigest is a
  // storage/config fault (SPEC §8's loud-throw posture — the legId-throw precedent), not
  // "your token does not correspond": no token could ever correspond, and refusing
  // effect-mismatch would send the operator into a permanent retry loop against a lie.
  //
  // A TamperingStore cannot build this fixture: a payload tamper breaks the hash chain,
  // so rung (1) would refuse chain-compromise before the payload read. Instead the chain
  // is constructed DIRECTLY with storeGenesis/storeNext, which compute VALID hashes over
  // whatever payload they are given — the chain verifies clean and the garbled payload
  // reaches rung (5).
  const store = new MemoryStore();
  const genesis = storeGenesis('rec-garbled', 'test.effect.v1', DEFAULT_SUBJECT_REF);
  const confirmed = storeNext(genesis, 'confirmed', {
    actor: { principal: 'approver:1', authority: 'session:test-app' },
  });
  const redeeming = storeNext(confirmed, 'redeeming', { tokenDigest: 42 });
  await store.appendTransition(null, genesis, { nonTerminal: true });
  await store.appendTransition('open', confirmed, { nonTerminal: true });
  await store.appendTransition('confirmed', redeeming, { nonTerminal: true });

  // A fixed clock just after `redeeming.at`, INSIDE the declared redeemBound window (third
  // step-3 increment's clock rung is now live): the fixture's hand-built transitions carry
  // fixed 2026-01-01 timestamps unrelated to wall-clock "now", so an un-pinned clock would
  // let the redeemBound window go due by the time this suite runs and have the shared
  // prologue's clock rung resolve `redemption-timeout` before rung (5)'s garbled-payload
  // throw — the thing this test actually pins — is ever reached.
  const handles = createWithClock(
    makeConfig([effectSeamProfile()], { store }),
    () => new Date(Date.parse(redeeming.at) + 60_000),
  );
  await assert.rejects(
    handles.operator.completeRedemption('rec-garbled', 'A'.repeat(43), CONTENT),
    /tokenDigest/,
  );
});

// === the no-redeemBound strand set: the risk a host accepts by declining §9.1's SHOULD ===

test('a begun record with a lost token has NO exit in this build except completion with the token — a host that declines the redeemBound SHOULD', async () => {
  // REWORKED at the third step-3 increment: this pinned across the whole effect-seam
  // surface while the second step-3 increment's guard blocked every declaring profile.
  // Now that the clock is built, a profile that DOES declare `redeemBound`
  // (`effectSeamProfile()`) sets `dueAt` at begin (pinned in clocks.test.ts) and its
  // strand closes on its own bound — the third step-3 increment's own producer,
  // kernel/expiry.ts's resolveDueClock, lands that closing edge (pinned end-to-end in
  // clocks.test.ts, not this file). The strand shape survives ONLY for a host that declines §9.1's SHOULD and
  // declares no `redeemBound` at all — `noRedeemBoundProfile()` above. Its seal/direct/
  // finalize refusals and the sole-exit assertion keep their force unchanged under that
  // profile; the `listDue`-blind assertion stays true there too: no bound means no dueAt
  // (§4's present-iff-declared), and §12: "A record with no bound is never listed".
  const store = new MemoryStore();
  const handles = create(makeConfig([noRedeemBoundProfile()], { store }));
  const recordId = await openRecord(
    handles,
    CONTENT,
    'test.effect.nobound.v1',
    DEFAULT_SUBJECT_REF,
  );
  const confirmed = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(confirmed.status, 'ok', 'fixture: the record must confirm');
  const begun = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(begun.status, 'ok', 'fixture: beginRedemption must succeed');
  if (begun.status !== 'ok') throw new Error('unreachable');
  const token = begun.value.token;

  const sealed = await handles.operator.seal(recordId);
  assert.equal(sealed.status, 'refused');
  if (sealed.status === 'refused') assert.equal(sealed.code, 'unsealable-state');

  const direct = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(direct.status, 'refused');
  if (direct.status === 'refused') assert.equal(direct.code, 'unredeemable-state');

  const fin = await handles.operator.finalize(recordId, identity(), CONTENT, facts());
  assert.equal(fin.status, 'refused');
  if (fin.status === 'refused') assert.equal(fin.code, 'record-not-open');

  assert.deepEqual(
    await store.listDue(new Date('2999-01-01T00:00:00.000Z')),
    [],
    'no dueAt exists — the sweep is blind to the stranded record',
  );

  // The sole exit works:
  const completed = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(completed.status, 'ok');
});

// === adjacent-pair order tests, both ladders ===========================================
// Derived per redeem.test.ts's discipline. BEGIN ladder — jointly constructible pairs:
//   (1)->(4): tampered chain + redeeming state — chain-compromise must win (covered by
//     the tampered-redeeming tests above).
//   (4)->(5): a redeemed record offered WRONG content — already-redeemed must win.
//   (4)->(5) re-issue half: a redeeming record offered wrong content —
//     unredeemable-state must win.
// COMPLETE ladder — jointly constructible pairs:
//   (4)->(5): a redeemed record + WRONG token — already-redeemed must win (at-most-once
//     outranks mismatch reporting).
//   (5) internal (token-vs-content order): NOT pinnable via codes — both refuse
//     effect-mismatch; recorded here, not tested.
//   (5)->(6): a mismatch plus a racing writer — pinned in the racing section below
//     (2026-09-01): effect-mismatch wins and the racer never fires; the racing residual
//     tests cover the (6) residual on its own.
// Not jointly constructible (and why): (2)->(x) — an unconfigured profile is
// defensive-only, as redeem.test.ts's derivation records; (3)->(4) — a pure-capture
// record cannot reach redeeming/redeemed.

test('order (4)->(5), begin ladder: a redeemed record with wrong content refuses already-redeemed', async () => {
  const { handles, recordId, token } = await redeemingRecord();
  await handles.operator.completeRedemption(recordId, token, CONTENT);
  const outcome = await handles.operator.beginRedemption(recordId, {
    subject: 'week-1',
    total: 999,
  });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'already-redeemed');
});

test('order (4)->(5), begin ladder re-issue half: a redeeming record with wrong content refuses unredeemable-state', async () => {
  const { handles, recordId } = await redeemingRecord();
  const outcome = await handles.operator.beginRedemption(recordId, {
    subject: 'week-1',
    total: 999,
  });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'unredeemable-state');
});

test('order (4)->(5), complete ladder: a redeemed record with a WRONG token refuses already-redeemed', async () => {
  const { handles, recordId, token } = await redeemingRecord();
  await handles.operator.completeRedemption(recordId, token, CONTENT);
  const outcome = await handles.operator.completeRedemption(recordId, 'A'.repeat(43), CONTENT);
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'already-redeemed');
});

// === the racing residual: the loser's code agrees with what re-invocation says =========

test('complete-vs-complete race: the CAS loser refuses already-redeemed, not unredeemable-state', async () => {
  // §11.2's at-most-once names the loser's true situation: the record IS redeemed. A
  // crash-recovering separated executor needs `already-redeemed` ("the edge landed —
  // consult your idempotency store") to be distinguishable from `unredeemable-state`
  // ("redemption does not apply"). The residual re-reads once (advisory, no append).
  const inner = new MemoryStore();
  const { recordId, token } = await redeemingRecord(inner);

  const racing = new RaceOnceStore(
    inner,
    (expected, t) => expected === 'redeeming' && t.kind === 'redeemed',
    async (innerStore, rid) => {
      // The WINNER: land a completed redemption directly before the loser's append.
      const chain = await innerStore.readChain(rid);
      const head = chain.at(-1);
      if (head === undefined) throw new Error('fixture: chain has a head');
      const winner = storeNext(head, 'redeemed', {
        via: 'token',
        tokenDigest: digest(token),
      });
      const res = await innerStore.appendTransition('redeeming', winner, { nonTerminal: false });
      if (!res.appended) throw new Error('fixture: the winner must land');
      return undefined; // loser's append then delegates and CAS-fails
    },
  );
  const handles = create(makeConfig([effectSeamProfile()], { store: racing }));

  const loser = await handles.operator.completeRedemption(recordId, token, CONTENT);
  assert.equal(loser.status, 'refused');
  if (loser.status !== 'refused') return;
  assert.equal(loser.code, 'already-redeemed');
});

test('begin-vs-begin race: the loser refuses unredeemable-state — agreeing with the no-re-issue gate', async () => {
  const inner = new MemoryStore();
  const { recordId } = await confirmedEffectRecord(inner);

  const racing = new RaceOnceStore(
    inner,
    (expected, t) => expected === 'confirmed' && t.kind === 'redeeming',
    async (innerStore, rid) => {
      const chain = await innerStore.readChain(rid);
      const head = chain.at(-1);
      if (head === undefined) throw new Error('fixture: chain has a head');
      const winner = storeNext(head, 'redeeming', {
        tokenDigest: `sha256:${'c'.repeat(64)}`,
      });
      const res = await innerStore.appendTransition('confirmed', winner, { nonTerminal: true });
      if (!res.appended) throw new Error('fixture: the winner must land');
      return undefined;
    },
  );
  const handles = create(makeConfig([effectSeamProfile()], { store: racing }));

  const loser = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(loser.status, 'refused');
  if (loser.status !== 'refused') return;
  assert.equal(loser.code, 'unredeemable-state');
});

test('direct-vs-direct race: the loser refuses already-redeemed — the family-wide refinement, first increment seam included', async () => {
  // An AUTHORIZED behavior change to the first step-3 increment's seam (its flat
  // residual was never pinned — that increment's derivation comment declined a racing
  // store): the refusal now agrees with what re-invocation would say.
  const inner = new MemoryStore();
  const { recordId } = await confirmedEffectRecord(inner);

  const racing = new RaceOnceStore(
    inner,
    (expected, t) => expected === 'confirmed' && t.kind === 'redeemed',
    async (innerStore, rid) => {
      const chain = await innerStore.readChain(rid);
      const head = chain.at(-1);
      if (head === undefined) throw new Error('fixture: chain has a head');
      const winner = storeNext(head, 'redeemed', { via: 'direct' });
      const res = await innerStore.appendTransition('confirmed', winner, { nonTerminal: false });
      if (!res.appended) throw new Error('fixture: the winner must land');
      return undefined;
    },
  );
  const handles = create(makeConfig([effectSeamProfile()], { store: racing }));

  const loser = await handles.operator.redeem(recordId, CONTENT);
  assert.equal(loser.status, 'refused');
  if (loser.status !== 'refused') return;
  assert.equal(loser.code, 'already-redeemed');
});

// === order (5)->(6), both ladders: mismatch beats the racer, and the racer NEVER fires ==

test('order (5)->(6), direct ladder: a mismatch plus an ARMED racing writer — effect-mismatch wins and the racer never fires', async () => {
  // The pair cell is an ORDER claim: rung (5) correspondence refuses before rung (6)'s
  // append, so the armed racer — which fires only on that append — must stay cold. The
  // hook flag is the firing counter; the same match predicate fires in the
  // direct-vs-direct race test above, so a cold racer here is order, not a dead rig.
  const inner = new MemoryStore();
  const { recordId } = await confirmedEffectRecord(inner);
  let raced = false;
  const racing = new RaceOnceStore(
    inner,
    (expected, t) => expected === 'confirmed' && t.kind === 'redeemed',
    async () => {
      raced = true;
      return undefined;
    },
  );
  const handles = create(makeConfig([effectSeamProfile()], { store: racing }));

  const loser = await handles.operator.redeem(recordId, { subject: 'week-1', total: 999 });
  assert.equal(loser.status, 'refused');
  if (loser.status !== 'refused') return;
  assert.equal(loser.code, 'effect-mismatch', 'rung (5) wins the pair');
  assert.equal(raced, false, 'the racer never fired — no append was ever attempted');
});

test('order (5)->(6), complete ladder: wrong content with a CORRECT token plus an ARMED racing writer — effect-mismatch wins and the racer never fires', async () => {
  const inner = new MemoryStore();
  const { recordId, token } = await redeemingRecord(inner);
  let raced = false;
  const racing = new RaceOnceStore(
    inner,
    (expected, t) => expected === 'redeeming' && t.kind === 'redeemed',
    async () => {
      raced = true;
      return undefined;
    },
  );
  const handles = create(makeConfig([effectSeamProfile()], { store: racing }));

  const loser = await handles.operator.completeRedemption(recordId, token, {
    subject: 'week-1',
    total: 999,
  });
  assert.equal(loser.status, 'refused');
  if (loser.status !== 'refused') return;
  assert.equal(loser.code, 'effect-mismatch', 'rung (5) wins the pair');
  assert.equal(raced, false, 'the racer never fired — no append was ever attempted');
});

// === the enlisted token seams (register row 16, the TWELFTH inversion) ================
// beginRedemption/completeRedemption gain the additive trailing tx? the direct seam has
// had all along. This INVERTS the seams' own earlier "NO tx, deliberately" doc-comment
// stance — argued in place at kernel/redeem.ts and recorded as the TWELFTH entry of
// implementation-status.md's numbered self-authored-inversion sequence: an enlisted
// issuance/completion commits or rolls back with the host's own outbox row, so a
// rollback erases the edge AND the outbox entry together — the host declining the
// issuance whole, never a strand — and the crash-strand window between the append and
// the token's return shrinks to the host's own transaction.

test('ENLISTED beginRedemption: a host ROLLBACK erases the redeeming edge — the record is back to confirmed, and an un-enlisted retry mints a fresh token', async () => {
  const sqlite = new SqliteStore(':memory:');
  const { handles, recordId } = await confirmedEffectRecord(sqlite);

  sqlite.database.exec('BEGIN IMMEDIATE');
  const enlisted = await handles.operator.beginRedemption(recordId, CONTENT, {
    tx: sqlite.database,
  });
  assert.equal(enlisted.status, 'ok', 'the enlisted issuance succeeds inside the host tx');
  assert.equal(sqlite.database.isTransaction, true, "the host's transaction is still open");
  sqlite.database.exec('ROLLBACK'); // must not throw

  const record = await handles.operator.replay(recordId);
  assert.equal(record.state, 'confirmed', 'the rollback erased the redeeming edge');
  assert.equal(
    await sqlite.findNonTerminal('test.effect.v1', DEFAULT_SUBJECT_REF),
    recordId,
    'the pair is still held by the confirmed record',
  );

  const retry = await handles.operator.beginRedemption(recordId, CONTENT);
  assert.equal(retry.status, 'ok', 'an un-enlisted retry issues cleanly');
  if (retry.status !== 'ok' || enlisted.status !== 'ok') return;
  assert.notEqual(retry.value.token, enlisted.value.token, 'a fresh token, never a reuse');
});

test('ENLISTED begin + COMMIT, then ENLISTED complete + COMMIT: the full token flow rides two host transactions', async () => {
  const sqlite = new SqliteStore(':memory:');
  const { handles, recordId } = await confirmedEffectRecord(sqlite);

  sqlite.database.exec('BEGIN IMMEDIATE');
  const begun = await handles.operator.beginRedemption(recordId, CONTENT, {
    tx: sqlite.database,
  });
  assert.equal(begun.status, 'ok');
  sqlite.database.exec('COMMIT');
  if (begun.status !== 'ok') return;
  assert.equal((await handles.operator.replay(recordId)).state, 'redeeming');

  sqlite.database.exec('BEGIN IMMEDIATE');
  const completed = await handles.operator.completeRedemption(
    recordId,
    begun.value.token,
    CONTENT,
    { tx: sqlite.database },
  );
  assert.equal(completed.status, 'ok');
  sqlite.database.exec('COMMIT');
  assert.equal((await handles.operator.replay(recordId)).state, 'redeemed');
});

test('ENLISTED beginRedemption over a tampered chain: chain-compromise result-first, NO edge, host transaction intact (the inherited rung-(1) shape)', async () => {
  const sqlite = new SqliteStore(':memory:');
  const { recordId } = await confirmedEffectRecord(sqlite);
  const tampering = new TamperingStore(sqlite, recordId, tamperNonLast);
  const handles = create(makeConfig([effectSeamProfile()], { store: tampering }));

  const before = await sqlite.readChain(recordId);
  sqlite.database.exec('BEGIN IMMEDIATE');
  const outcome = await handles.operator.beginRedemption(recordId, CONTENT, {
    tx: sqlite.database,
  });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
  assert.equal(outcome.transitionRef, undefined, 'no edge — the append was never attempted');
  assert.equal(sqlite.database.isTransaction, true, "the host's transaction is still open");
  sqlite.database.exec('ROLLBACK'); // must not throw
  assert.deepEqual(await sqlite.readChain(recordId), before, 'the chain is unchanged');
});

test('ENLISTED completeRedemption over a tampered chain: chain-compromise result-first, NO edge, host transaction intact', async () => {
  const sqlite = new SqliteStore(':memory:');
  const { recordId, token } = await redeemingRecord(sqlite);
  const tampering = new TamperingStore(sqlite, recordId, tamperNonLast);
  const handles = create(makeConfig([effectSeamProfile()], { store: tampering }));

  const before = await sqlite.readChain(recordId);
  sqlite.database.exec('BEGIN IMMEDIATE');
  const outcome = await handles.operator.completeRedemption(recordId, token, CONTENT, {
    tx: sqlite.database,
  });
  assert.equal(outcome.status, 'refused');
  if (outcome.status !== 'refused') return;
  assert.equal(outcome.code, 'chain-compromise');
  assert.equal(outcome.transitionRef, undefined, 'no edge — the append was never attempted');
  assert.equal(sqlite.database.isTransaction, true, "the host's transaction is still open");
  sqlite.database.exec('ROLLBACK'); // must not throw
  assert.deepEqual(await sqlite.readChain(recordId), before, 'the chain is unchanged');
});
