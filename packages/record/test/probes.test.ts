// @vidimera/record — probes.test.ts (CONTROLS §4's OPERATOR-ASSURANCE tier; the
// self-test-tier increment, the build order's last item). The fixture drivers:
//   - `makeFullDriver()` — declares one profile per attacked feature (capture,
//     effect-seam, requiredConsultations, eligibility, findings-flow, two-leg SoD, and
//     a combined live+reverify+signing profile), plus every optional host hook EXCEPT
//     restartPersistence (an in-memory Store has nothing durable to restart — a no-op
//     fake would prove nothing). Every probe but `state-survives-restart` must PASS
//     against it; that one honestly reports not-driven here.
//   - `makeSqliteRestartDriver()` — the SAME declared surface, over a REAL file-backed
//     `SqliteStore` whose `restartPersistence()` closes and reopens that file (the
//     `test/sqlite-store.test.ts` close-reopen pattern) — `state-survives-restart`'s
//     genuine pass path, proving actual persistence, not an in-memory no-op.
//   - broken drivers, each demonstrating that a probe CAN fail (never a suite that only
//     ever reports pass): a constant-digest canonicalizer (`drift-refuses` fails), a
//     stubbed-pass sever hook (`consultation-genuineness` fails), a restart hook that
//     swaps in a FRESH empty store instead of reopening (`state-survives-restart`
//     fails), a disabled-credential path that lies — the re-derivation itself starts
//     failing once "disabled" (`path-distinctness` fails), and a minimal
//     single-profile, no-optional-hooks config (every declaring/hook-gated probe
//     reports not-driven, honestly, never a fabricated pass).
//   - `makeDeclaringNoHooksDriver()` isolates the OTHER not-driven reason: every
//     declaring profile is present, but the optional host hooks are not, so the
//     hook-gated probes' own not-driven detail names the missing hook, not a missing
//     profile.
// The runner/waiver pins close the file.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'vitest';

import type { Canonicalizer } from '../src/canonical.js';
import type { Config, ConfirmProfile, ConsultationInput, FinalizeOptions } from '../src/config.js';
import type { ProbeDriver, Waiver } from '../src/probes/index.js';
import { ALL_PROBES, assertSatisfied, runProbes } from '../src/probes/index.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
import { SqliteStore } from '../src/store/sqlite.js';
import type { Store } from '../src/store/store.js';
import type { IdentityAssertion } from '../src/types.js';

// === shared fixture vocabulary =========================================================

const CANONICALIZER_REF = 'probe.canonical.v1';

function identityCanonicalizer(): Canonicalizer {
  return (content: unknown) => content;
}

const IDENTITY: IdentityAssertion = { principal: 'probe-actor', authority: 'session:probe' };
const CHECKER: IdentityAssertion = { principal: 'probe-checker', authority: 'mtls:probe-checker' };
const DIGEST = `sha256:${'a'.repeat(64)}`;

function obtainedPass(kind: string): ConsultationInput {
  return { kind, checker: CHECKER, payloadDigest: DIGEST, verdict: 'pass' };
}

/** The seven profiles the full-featured driver declares, one per attacked feature.
 * `probe.capture.v1` sits first — it is `config.profiles[0]`, the generic profile the
 * profile-agnostic probes attack. */
function fullProfiles(): ConfirmProfile[] {
  return [
    {
      id: 'probe.capture.v1',
      subject: { canonicalizerRef: CANONICALIZER_REF },
      legs: [{ id: 'decide', allowedAuthorities: ['session:probe'] }],
      captureMode: 'staged',
      expiry: { ttl: 3600 },
    },
    {
      id: 'probe.effect.v1',
      subject: { canonicalizerRef: CANONICALIZER_REF },
      legs: [{ id: 'decide', allowedAuthorities: ['session:probe'] }],
      captureMode: 'staged',
      expiry: { ttl: 3600 },
      redeem: { confirmToRedeem: 3600, redeemBound: 86400 },
    },
    {
      id: 'probe.gated.v1',
      subject: { canonicalizerRef: CANONICALIZER_REF },
      legs: [
        {
          id: 'decide',
          allowedAuthorities: ['session:probe'],
          requiredConsultations: ['risk-check'],
        },
      ],
      captureMode: 'staged',
      expiry: { ttl: 3600 },
    },
    {
      id: 'probe.eligible.v1',
      subject: { canonicalizerRef: CANONICALIZER_REF },
      legs: [
        {
          id: 'decide',
          allowedAuthorities: ['session:probe'],
          eligibility: 'probe.eligibility-check',
        },
      ],
      captureMode: 'staged',
      expiry: { ttl: 3600 },
    },
    {
      id: 'probe.flow.v1',
      subject: { canonicalizerRef: CANONICALIZER_REF },
      legs: [
        {
          id: 'decide',
          allowedAuthorities: ['session:probe'],
          ackMode: 'any',
          requiredAcks: ['variance'],
        },
      ],
      captureMode: 'staged',
      expiry: { ttl: 3600 },
    },
    {
      id: 'probe.twoleg.v1',
      subject: { canonicalizerRef: CANONICALIZER_REF },
      legs: [
        { id: 'maker', allowedAuthorities: ['session:probe'] },
        {
          id: 'checker',
          allowedAuthorities: ['session:probe'],
          sod: { notActorOf: ['maker'] },
        },
      ],
      captureMode: 'staged',
      expiry: { ttl: 3600 },
    },
    {
      id: 'probe.live.v1',
      subject: { canonicalizerRef: CANONICALIZER_REF },
      legs: [
        {
          id: 'decide',
          allowedAuthorities: ['session:probe'],
          requiredConsultations: ['rederive'],
        },
      ],
      captureMode: 'live',
      expiry: { ttl: 3600 },
      redeem: { reverify: true },
      signing: true,
    },
  ];
}

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const signer: Signer = async (bytes) => ({
  keyRef: 'probe-key-1',
  signature: edSign(null, bytes, privateKey).toString('base64'),
});
const verifier: Verifier = async (bytes, signature) =>
  edVerify(null, bytes, publicKey, Buffer.from(signature, 'base64'));

/**
 * The methods every full-featured driver below shares, independent of which `Store` it
 * hands out: content/subjectRef minting (a monotonic counter — unique per call,
 * deterministic across a test run), a fixed leg-decider identity every declared
 * `allowedAuthorities` list accepts, `sampleConsultations`'s per-declaring-profile
 * answers, and the sever/disable hooks. Each caller gets its OWN `counter`/`severed`
 * closures — no cross-driver state leaks.
 */
function sharedDriverMethods(): Pick<
  ProbeDriver,
  | 'sampleContent'
  | 'sampleIdentity'
  | 'sampleConsultations'
  | 'severConsultationAuthority'
  | 'disableRenderingCredential'
> {
  let counter = 0;
  const severed = new Set<string>();
  return {
    sampleContent(profileId: string) {
      counter += 1;
      return {
        content: { probedProfile: profileId, n: counter },
        subjectRef: `subject:probe-${counter}`,
      };
    },
    sampleIdentity(): IdentityAssertion {
      return IDENTITY;
    },
    sampleConsultations(profileId: string): FinalizeOptions {
      if (profileId === 'probe.gated.v1') {
        if (severed.has('risk-check')) {
          return {
            consultations: [
              { kind: 'risk-check', unreachable: true, authority: 'svc:probe-risk-check' },
            ],
          };
        }
        return { consultations: [obtainedPass('risk-check')] };
      }
      if (profileId === 'probe.eligible.v1') {
        return { consultations: [obtainedPass('eligibility')] };
      }
      if (profileId === 'probe.live.v1') {
        return {
          consultations: [{ ...obtainedPass('rederive'), observedAt: new Date().toISOString() }],
        };
      }
      return {};
    },
    async severConsultationAuthority(kind: string) {
      severed.add(kind);
      return async () => {
        severed.delete(kind);
      };
    },
    async disableRenderingCredential() {
      // A fake: the independent re-derivation ('rederive') is answered by
      // sampleConsultations regardless of this toggle — demonstrating the PASS path
      // (an honest limitation of an in-memory fixture, noted per CONTROLS §4's own
      // "Probe-proved, host-specific" bound). `makeFakeIndependencePathDriver` below
      // overrides BOTH methods together to demonstrate the FAIL direction instead.
      return async () => {};
    },
  };
}

/**
 * A `Store` wrapper whose underlying backing can be swapped out from under it —
 * `swap()` redirects every subsequent call without changing the WRAPPER's own object
 * identity, the one `create()` already closed over when it built `handles`. This is
 * what makes a driver's `restartPersistence()` hook actually MEAN something: reopening
 * the same file (real durability, `makeSqliteRestartDriver` below) or swapping in a
 * fresh store (simulated data loss, `makeLosesStateOnRestartDriver` below) both take
 * effect on the very same `Store` reference `handles` already holds.
 */
function swappableStore(initial: Store): { store: Store; swap: (next: Store) => void } {
  let current = initial;
  const store: Store = {
    putStaged: (s, tx) => current.putStaged(s, tx),
    getStaged: (r) => current.getStaged(r),
    appendTransition: (e, t, m, tx) => current.appendTransition(e, t, m, tx),
    appendBatch: (e, ts, m, tx) => current.appendBatch(e, ts, m, tx),
    chainHead: (r) => current.chainHead(r),
    listDue: (now) => current.listDue(now),
    findNonTerminal: (p, s) => current.findNonTerminal(p, s),
    readChain: (r) => current.readChain(r),
  };
  return {
    store,
    swap: (next) => {
      current = next;
    },
  };
}

/**
 * The full-featured driver: every probe in `ALL_PROBES` EXCEPT `state-survives-restart`
 * must pass against it. This driver deliberately carries NO `restartPersistence` hook —
 * an in-memory `Store` has nothing durable to restart, and a no-op fake claiming
 * otherwise would prove nothing. `state-survives-restart`'s own REAL pass path is
 * `makeSqliteRestartDriver` below, over a genuine close-and-reopen file-backed store.
 */
function makeFullDriver(): ProbeDriver {
  return {
    ...sharedDriverMethods(),
    makeConfig(): Config {
      return {
        profiles: fullProfiles(),
        store: new MemoryStore(),
        canonicalizers: { [CANONICALIZER_REF]: identityCanonicalizer() },
        signing: {
          signer,
          verifiers: { 'probe-key-1': verifier },
          signatures: new MemorySignatureStore(),
        },
      };
    },
    // No restartPersistence — see the doc comment above.
  };
}

/** Cleanup closures minted by `makeSqliteRestartDriver` below, one per `makeConfig()`
 * call — run after every test so this file leaves nothing on disk. Each closure closes
 * whatever connection is CURRENTLY open (read at cleanup time, not capture time — a
 * restart may have reopened a new one) before removing the temp directory: on Windows
 * an open `DatabaseSync` holds the file (and its WAL/SHM siblings) locked, and
 * `rmSync` before the close is exactly the EPERM this ordering avoids. */
const sqliteCleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of sqliteCleanups.splice(0)) {
    cleanup();
  }
});

/**
 * The REAL pass-path driver for `state-survives-restart`: a file-backed `SqliteStore`
 * whose `restartPersistence()` closes the connection and reopens the SAME file — the
 * exact close-and-reopen shape `test/sqlite-store.test.ts`'s own durability test uses.
 * Every other profile/hook is identical to `makeFullDriver`'s, over the swappable
 * wrapper so `handles` (built once per probe, over the STABLE wrapper) transparently
 * sees the reopened connection afterward.
 */
function makeSqliteRestartDriver(): ProbeDriver {
  let active: { path: string; sqlite: SqliteStore; swap: (next: Store) => void } | undefined;
  return {
    ...sharedDriverMethods(),
    makeConfig(): Config {
      const dir = mkdtempSync(join(tmpdir(), 'vidimera-probe-sqlite-'));
      const path = join(dir, 'store.db');
      const sqlite = new SqliteStore(path);
      const { store, swap } = swappableStore(sqlite);
      const handle = { path, sqlite, swap };
      active = handle;
      sqliteCleanups.push(() => {
        try {
          handle.sqlite.database.close();
        } catch {
          // already closed — fine, the file is what we actually need to release
        }
        rmSync(dir, { recursive: true, force: true });
      });
      return {
        profiles: fullProfiles(),
        store,
        canonicalizers: { [CANONICALIZER_REF]: identityCanonicalizer() },
        signing: {
          signer,
          verifiers: { 'probe-key-1': verifier },
          signatures: new MemorySignatureStore(),
        },
      };
    },
    async restartPersistence() {
      if (active === undefined) {
        throw new Error('restartPersistence: called before any makeConfig()');
      }
      active.sqlite.database.close();
      const reopened = new SqliteStore(active.path); // the SAME file, genuinely reopened
      active.sqlite = reopened;
      active.swap(reopened);
    },
  };
}

/**
 * The FAIL-direction driver for `state-survives-restart`: `restartPersistence()`
 * deliberately swaps in a FRESH, EMPTY `MemoryStore` — a "restart" that actually lost
 * everything. `state-survives-restart` must catch this as a fail, not a pass.
 */
function makeLosesStateOnRestartDriver(): ProbeDriver {
  let active: { swap: (next: Store) => void } | undefined;
  return {
    ...sharedDriverMethods(),
    makeConfig(): Config {
      const { store, swap } = swappableStore(new MemoryStore());
      active = { swap };
      return {
        profiles: fullProfiles(),
        store,
        canonicalizers: { [CANONICALIZER_REF]: identityCanonicalizer() },
        signing: {
          signer,
          verifiers: { 'probe-key-1': verifier },
          signatures: new MemorySignatureStore(),
        },
      };
    },
    async restartPersistence() {
      if (active === undefined) {
        throw new Error('restartPersistence: called before any makeConfig()');
      }
      active.swap(new MemoryStore());
    },
  };
}

/**
 * The FAIL-direction driver for `path-distinctness`: under the disabled credential,
 * `sampleConsultations` for the live profile's `'rederive'` kind switches to a FAILING
 * verdict instead of staying a pass — the paths were never actually independent, the
 * same lying-hook shape `makeStubbedSeverDriver` demonstrates for
 * `consultation-genuineness`.
 */
function makeFakeIndependencePathDriver(): ProbeDriver {
  const inner = makeFullDriver();
  let disabled = false;
  return {
    ...inner,
    sampleConsultations(profileId: string, legId: string): FinalizeOptions {
      if (profileId === 'probe.live.v1' && disabled) {
        return {
          consultations: [
            {
              ...obtainedPass('rederive'),
              verdict: 'fail',
              observedAt: new Date().toISOString(),
            } as ConsultationInput,
          ],
        };
      }
      return inner.sampleConsultations?.(profileId, legId) ?? {};
    },
    async disableRenderingCredential() {
      disabled = true;
      return async () => {
        disabled = false;
      };
    },
  };
}

/** Wraps `makeFullDriver()` so EVERY canonicalizer always returns one constant value —
 * `content-drift` can never fire, since every content digests identically. Demonstrates
 * `drift-refuses` FAILING. */
function makeBrokenCanonicalizerDriver(): ProbeDriver {
  const inner = makeFullDriver();
  return {
    ...inner,
    makeConfig(): Config {
      const config = inner.makeConfig();
      const constant: Canonicalizer = () => ({ constant: true });
      const canonicalizers: Record<string, Canonicalizer> = {};
      for (const ref of Object.keys(config.canonicalizers)) {
        canonicalizers[ref] = constant;
      }
      return { ...config, canonicalizers };
    },
  };
}

/** Wraps `makeFullDriver()` so `severConsultationAuthority` claims to sever an
 * authority but never actually changes what `sampleConsultations` reports — a STUBBED
 * pass. Demonstrates `consultation-genuineness` FAILING. */
function makeStubbedSeverDriver(): ProbeDriver {
  const inner = makeFullDriver();
  return {
    ...inner,
    async severConsultationAuthority(_kind: string) {
      return async () => {};
    },
  };
}

/** A single plain capture profile, no optional hooks at all: every probe requiring a
 * declaring profile OR a host hook reports not-driven; the profile-agnostic probes
 * still pass. */
function makeMinimalDriver(): ProbeDriver {
  let counter = 0;
  return {
    makeConfig(): Config {
      return {
        profiles: [
          {
            id: 'probe.minimal.v1',
            subject: { canonicalizerRef: CANONICALIZER_REF },
            legs: [{ id: 'decide', allowedAuthorities: ['session:probe'] }],
            captureMode: 'staged',
            expiry: { ttl: 3600 },
          },
        ],
        store: new MemoryStore(),
        canonicalizers: { [CANONICALIZER_REF]: identityCanonicalizer() },
      };
    },
    sampleContent(profileId: string) {
      counter += 1;
      return {
        content: { probedProfile: profileId, n: counter },
        subjectRef: `subject:probe-minimal-${counter}`,
      };
    },
    sampleIdentity(): IdentityAssertion {
      return IDENTITY;
    },
    // No sampleConsultations, no severConsultationAuthority, no
    // disableRenderingCredential, no restartPersistence — every declaring/hook-gated
    // probe's not-driven branch fires HONESTLY here, never a fabricated pass.
  };
}

/** Every declaring profile from `makeFullDriver()` is present, but the three optional
 * HOST hooks are not — isolates "missing hook" from "unreached configuration" as a
 * not-driven reason. */
function makeDeclaringNoHooksDriver(): ProbeDriver {
  const inner = makeFullDriver();
  return {
    makeConfig: inner.makeConfig,
    sampleContent: inner.sampleContent,
    sampleIdentity: inner.sampleIdentity,
    sampleConsultations: inner.sampleConsultations,
  };
}

/** A driver whose `sampleContent` always throws — proves the runner's own "a probe
 * whose setup throws is reported as a fail, and the suite never aborts" discipline. */
function makeThrowingSampleContentDriver(): ProbeDriver {
  const inner = makeFullDriver();
  return {
    ...inner,
    sampleContent(_profileId: string): { content: unknown; subjectRef: string } {
      throw new Error('probe fixture: sampleContent deliberately throws (RED-path driver)');
    },
  };
}

// === ALL_PROBES shape pins =============================================================

test('ALL_PROBES: seventeen probes, unique ids, stable registry order', () => {
  assert.equal(ALL_PROBES.length, 17);
  const ids = ALL_PROBES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'every probe id must be unique');
  assert.deepEqual(ids, [
    'drift-refuses',
    'exclusivity-holds',
    'consultation-genuineness',
    'tamper-evident',
    'payload-identity-refused',
    'at-most-once-redeem',
    'effects-match',
    'sod-refuses',
    'acks-block',
    'consultations-present',
    'ineligible-refuses',
    'agent-cannot-decide',
    'unknown-fails-closed',
    'binds-reviewed',
    'signature-tamper-refuses',
    'path-distinctness',
    'state-survives-restart',
  ]);
});

test('the three fully-worked templates keep their pinned ids and CONTROLS §4 targets', () => {
  const byId = new Map(ALL_PROBES.map((p) => [p.id, p]));
  assert.equal(byId.get('drift-refuses')?.target, 'drifted content refuses');
  assert.equal(
    byId.get('exclusivity-holds')?.target,
    'at most one non-terminal record per subject',
  );
  assert.equal(
    byId.get('consultation-genuineness')?.target,
    'required consultations are present and genuine (a severed authority yields `availability`, never a pass)',
  );
});

test("every probe's target is a verbatim substring of CONTROLS §4's target list (hand-verified)", async () => {
  // The contract-scan's citation resolver checks `SPEC §N`/`DECISIONS.md #N` only — a
  // `CONTROLS §4` quote carries no automated backstop, so this pin IS the check,
  // against a whitespace-collapsed copy of docs/concept/CONTROLS.md:64-73.
  const TARGET_LIST_SENTENCE =
    'decision state survives restart; tampering is evident on replay; drifted content ' +
    'refuses; a payload-carried identity cannot finalize; a confirmation redeems at most ' +
    'once; cross-leg self-approval refuses; stale or missing acknowledgments block ' +
    'finalize; required consultations are present and genuine (a severed authority ' +
    'yields `availability`, never a pass); effects require redemption and match the ' +
    'redeemed record; at most one non-terminal record per subject; nothing ' +
    'agent-reachable decides; unknown inputs and compromise fail closed; the decision ' +
    'binds what the reviewer saw; an ineligible actor refuses.';
  // CONTROLS.md's own OPERATOR-ASSURANCE table row (line 61), the ONE target this file
  // draws from a different sentence than the target-list one above:
  const LIVE_PATH_ROW =
    'Disable the rendering credential; the independent re-derivation must still succeed';
  for (const probe of ALL_PROBES) {
    const ok = TARGET_LIST_SENTENCE.includes(probe.target) || probe.target === LIVE_PATH_ROW;
    assert.ok(ok, `probe '${probe.id}' target is not verbatim from CONTROLS §4: "${probe.target}"`);
  }
});

// === the full-featured driver: every probe passes ======================================

test('the full-featured (in-memory) driver: every registered probe passes EXCEPT state-survives-restart, which honestly reports not-driven', async () => {
  const driver = makeFullDriver();
  const report = await runProbes(driver);
  assert.equal(report.results.length, ALL_PROBES.length);
  for (const probe of ALL_PROBES) {
    const result = report.results.find((r) => r.id === probe.id);
    assert.ok(result !== undefined, `probe '${probe.id}' produced no result`);
    if (probe.id === 'state-survives-restart') {
      // The in-memory driver carries no restartPersistence hook — see makeFullDriver's
      // own doc comment. Its REAL pass path is the dedicated SQLite driver test below.
      assert.equal(
        result.status,
        'not-driven',
        `expected not-driven, observed ${JSON.stringify(result)}`,
      );
      continue;
    }
    assert.equal(
      result.status,
      'pass',
      `probe '${probe.id}' expected pass, observed ${JSON.stringify(result)}`,
    );
  }
  assert.equal(report.expiredWaivers.length, 0);
  assert.equal(report.unusedWaivers.length, 0);
});

test('a SQLite-backed restart driver: state-survives-restart passes against REAL close-and-reopen persistence', async () => {
  const driver = makeSqliteRestartDriver();
  const report = await runProbes(driver);
  const result = report.results.find((r) => r.id === 'state-survives-restart');
  assert.ok(result !== undefined);
  assert.equal(result.status, 'pass', `expected pass, observed ${JSON.stringify(result)}`);
});

// === demonstrated FAIL paths: probes that can fail, not just pass ======================

test('a constant-digest canonicalizer driver: drift-refuses fails (content-drift never fires)', async () => {
  const driver = makeBrokenCanonicalizerDriver();
  const report = await runProbes(driver);
  const drift = report.results.find((r) => r.id === 'drift-refuses');
  assert.ok(drift !== undefined);
  assert.equal(drift.status, 'fail');
  assert.match(drift.detail, /content-drift/);
});

test('a stubbed-pass sever hook driver: consultation-genuineness fails (a severed authority still yields a pass)', async () => {
  const driver = makeStubbedSeverDriver();
  const report = await runProbes(driver);
  const genuineness = report.results.find((r) => r.id === 'consultation-genuineness');
  assert.ok(genuineness !== undefined);
  assert.equal(genuineness.status, 'fail');
  assert.match(genuineness.detail, /stubbed pass/);
});

test('a driver whose restart swaps in a FRESH empty store: state-survives-restart fails (state was actually lost)', async () => {
  const driver = makeLosesStateOnRestartDriver();
  const report = await runProbes(driver);
  const result = report.results.find((r) => r.id === 'state-survives-restart');
  assert.ok(result !== undefined);
  assert.equal(result.status, 'fail', `expected fail, observed ${JSON.stringify(result)}`);
});

test('a driver whose disabled-credential path LIES (the re-derivation fails once disabled): path-distinctness fails', async () => {
  const driver = makeFakeIndependencePathDriver();
  const report = await runProbes(driver);
  const result = report.results.find((r) => r.id === 'path-distinctness');
  assert.ok(result !== undefined);
  assert.equal(result.status, 'fail', `expected fail, observed ${JSON.stringify(result)}`);
});

test('a minimal-config driver: every declaring/hook-gated probe reports not-driven honestly; profile-agnostic probes still pass', async () => {
  const driver = makeMinimalDriver();
  const report = await runProbes(driver);
  const byId = new Map(report.results.map((r) => [r.id, r]));
  const declaring = [
    'consultation-genuineness',
    'at-most-once-redeem',
    'effects-match',
    'sod-refuses',
    'acks-block',
    'consultations-present',
    'ineligible-refuses',
    'signature-tamper-refuses',
    'path-distinctness',
    'state-survives-restart',
  ];
  for (const id of declaring) {
    const result = byId.get(id);
    assert.equal(
      result?.status,
      'not-driven',
      `${id} should report not-driven under the minimal driver`,
    );
    assert.ok(
      (result?.detail.length ?? 0) > 0,
      `${id}'s not-driven detail must be plain-language, not empty`,
    );
  }
  const agnostic = [
    'drift-refuses',
    'exclusivity-holds',
    'tamper-evident',
    'payload-identity-refused',
    'agent-cannot-decide',
    'unknown-fails-closed',
    'binds-reviewed',
  ];
  for (const id of agnostic) {
    assert.equal(
      byId.get(id)?.status,
      'pass',
      `${id} should still pass under a minimal-but-valid config`,
    );
  }
  assert.equal(report.satisfied, false, 'not-driven results are not pass/waived');
});

test('a driver with every declaring profile but no host hooks: the hook-gated probes report not-driven for the missing hook specifically', async () => {
  const driver = makeDeclaringNoHooksDriver();
  const report = await runProbes(driver);
  const byId = new Map(report.results.map((r) => [r.id, r]));
  for (const id of ['consultation-genuineness', 'path-distinctness', 'state-survives-restart']) {
    const result = byId.get(id);
    assert.equal(result?.status, 'not-driven');
    assert.match(result?.detail ?? '', /hook/i);
  }
  // the declaring-profile-only probes (no host-hook dependency) still pass — the
  // declaring profiles ARE present here, unlike the minimal-driver test above:
  for (const id of [
    'at-most-once-redeem',
    'effects-match',
    'sod-refuses',
    'acks-block',
    'consultations-present',
    'ineligible-refuses',
    'signature-tamper-refuses',
  ]) {
    assert.equal(
      byId.get(id)?.status,
      'pass',
      `${id} should pass — its declaring profile is present`,
    );
  }
});

test('a throwing driver: every probe still runs; a probe whose setup throws surfaces as a fail via the runner catch', async () => {
  const driver = makeThrowingSampleContentDriver();
  const report = await runProbes(driver);
  assert.equal(report.results.length, ALL_PROBES.length, 'the runner never aborts the suite');
  const drift = report.results.find((r) => r.id === 'drift-refuses');
  assert.equal(drift?.status, 'fail');
  assert.match(drift?.detail ?? '', /probe threw/);
  // agent-cannot-decide and unknown-fails-closed never call sampleContent — untouched:
  assert.equal(report.results.find((r) => r.id === 'agent-cannot-decide')?.status, 'pass');
  assert.equal(report.results.find((r) => r.id === 'unknown-fails-closed')?.status, 'pass');
});

// === the runner and waiver-governance pins =============================================

test('an unexpired waiver converts a fail to waived, carrying the reason and expiry in its detail', async () => {
  const driver = makeBrokenCanonicalizerDriver();
  const waiver: Waiver = {
    probeId: 'drift-refuses',
    reason: 'known canonicalizer gap, tracked',
    expires: '2999-01-01T00:00:00Z',
  };
  const report = await runProbes(driver, { waivers: [waiver] });
  const drift = report.results.find((r) => r.id === 'drift-refuses');
  assert.equal(drift?.status, 'waived');
  assert.match(drift?.detail ?? '', /known canonicalizer gap, tracked/);
  assert.match(drift?.detail ?? '', /2999-01-01T00:00:00Z/);
  assert.equal(report.expiredWaivers.length, 0);
  // The waiver named drift-refuses and drift-refuses failed — used, not unused. (The
  // broken canonicalizer also breaks effects-match, unwaived here on purpose — this
  // test's own point is the waiver's conversion, not whole-suite satisfaction; that
  // collateral failure is its own honest finding, not something to paper over.)
  assert.equal(report.unusedWaivers.length, 0);
});

test('an unexpired waiver converts a not-driven result to waived too', async () => {
  const driver = makeMinimalDriver();
  const waiver: Waiver = {
    probeId: 'sod-refuses',
    reason: 'no multi-leg profile in this deployment yet',
    expires: '2999-01-01T00:00:00Z',
  };
  const report = await runProbes(driver, { waivers: [waiver] });
  const sod = report.results.find((r) => r.id === 'sod-refuses');
  assert.equal(sod?.status, 'waived');
  assert.match(sod?.detail ?? '', /not-driven under waiver/);
});

test('an EXPIRED waiver converts NOTHING and is flagged in expiredWaivers', async () => {
  const driver = makeBrokenCanonicalizerDriver();
  const waiver: Waiver = {
    probeId: 'drift-refuses',
    reason: 'expired long ago',
    expires: '2000-01-01T00:00:00Z',
  };
  const report = await runProbes(driver, {
    waivers: [waiver],
    now: () => new Date('2026-08-18T00:00:00Z'),
  });
  const drift = report.results.find((r) => r.id === 'drift-refuses');
  assert.equal(drift?.status, 'fail', 'an expired waiver converts nothing');
  assert.equal(report.expiredWaivers.length, 1);
  assert.equal(report.expiredWaivers[0]?.probeId, 'drift-refuses');
  assert.equal(report.unusedWaivers.length, 0, 'an expired waiver is not ALSO reported unused');
});

test('a waiver on a probe that PASSES outright is unused (never converts a pass) and is not expired', async () => {
  // makeSqliteRestartDriver, not makeFullDriver: every probe genuinely passes against
  // it (including state-survives-restart), so the ONLY thing left unsatisfied would be
  // the waiver's own bookkeeping — exactly what this test isolates.
  const driver = makeSqliteRestartDriver();
  const waiver: Waiver = {
    probeId: 'agent-cannot-decide',
    reason: 'just in case',
    expires: '2999-01-01T00:00:00Z',
  };
  const report = await runProbes(driver, { waivers: [waiver] });
  assert.equal(report.satisfied, true);
  assert.equal(report.unusedWaivers.length, 1);
  assert.equal(report.unusedWaivers[0]?.probeId, 'agent-cannot-decide');
  assert.equal(report.expiredWaivers.length, 0);
  const agent = report.results.find((r) => r.id === 'agent-cannot-decide');
  assert.equal(agent?.status, 'pass', 'the waiver does not turn a pass into waived');
});

test('runProbes throws on a malformed waiver expires — missing offset, or unparseable', async () => {
  const driver = makeFullDriver();
  await assert.rejects(
    runProbes(driver, {
      waivers: [{ probeId: 'drift-refuses', reason: 'x', expires: '2026-01-01T00:00:00' }],
    }),
    /expires/,
  );
  await assert.rejects(
    runProbes(driver, {
      waivers: [{ probeId: 'drift-refuses', reason: 'x', expires: 'not-a-date' }],
    }),
    /expires/,
  );
});

test('assertSatisfied does not throw when satisfied and no waivers are expired', async () => {
  // makeSqliteRestartDriver, not makeFullDriver: every probe genuinely passes against
  // it, so `satisfied` is true with no help from a waiver.
  const driver = makeSqliteRestartDriver();
  const report = await runProbes(driver);
  assert.equal(
    report.satisfied,
    true,
    `fixture: expected every probe to pass — ${JSON.stringify(report.results.filter((r) => r.status !== 'pass'))}`,
  );
  assert.doesNotThrow(() => assertSatisfied(report));
});

test('assertSatisfied throws naming every fail/not-driven result when unsatisfied', async () => {
  const driver = makeMinimalDriver();
  const report = await runProbes(driver);
  assert.throws(() => assertSatisfied(report), /sod-refuses.*not-driven/s);
});

test("assertSatisfied throws on an expired waiver even when every OTHER probe passes (the row's own governance point)", async () => {
  // makeSqliteRestartDriver, not makeFullDriver: every probe genuinely passes against
  // it, so the expired waiver below is the ONLY thing standing between this report and
  // a clean `assertSatisfied`.
  const driver = makeSqliteRestartDriver();
  const waiver: Waiver = {
    probeId: 'drift-refuses', // passes under this driver: the waiver is simply UNUSED, and expired
    reason: 'stale',
    expires: '2000-01-01T00:00:00Z',
  };
  const report = await runProbes(driver, {
    waivers: [waiver],
    now: () => new Date('2026-08-18T00:00:00Z'),
  });
  assert.equal(
    report.satisfied,
    true,
    'every probe result is pass — satisfied is true on its own terms',
  );
  assert.equal(report.expiredWaivers.length, 1);
  assert.throws(() => assertSatisfied(report), /probe suite unsatisfied/);
  assert.throws(() => assertSatisfied(report), /expired waiver drift-refuses/);
});
