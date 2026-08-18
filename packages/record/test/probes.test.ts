// @vidimera/record — probes.test.ts (CONTROLS §4's OPERATOR-ASSURANCE tier; the
// self-test-tier increment, the build order's last item). Three fixture drivers:
//   - `makeFullDriver()` — declares one profile per attacked feature (capture,
//     effect-seam, requiredConsultations, eligibility, findings-flow, two-leg SoD, and
//     a combined live+reverify+signing profile), plus every optional host hook. Every
//     probe in `ALL_PROBES` must PASS against it.
//   - three BROKEN drivers, each demonstrating that a probe CAN fail (never a suite
//     that only ever reports pass): a constant-digest canonicalizer (drift-refuses
//     fails), a stubbed-pass sever hook (consultation-genuineness fails), and a
//     minimal single-profile, no-optional-hooks config (every declaring/hook-gated
//     probe reports not-driven, honestly, never a fabricated pass).
//   - `makeDeclaringNoHooksDriver()` isolates the OTHER not-driven reason: every
//     declaring profile is present, but the optional host hooks are not, so the
//     hook-gated probes' own not-driven detail names the missing hook, not a missing
//     profile.
// The runner/waiver pins close the file.

import assert from 'node:assert/strict';
import { sign as edSign, verify as edVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'vitest';

import type { Canonicalizer } from '../src/canonical.js';
import type { Config, ConfirmProfile, ConsultationInput, FinalizeOptions } from '../src/config.js';
import type { ProbeDriver, Waiver } from '../src/probes/index.js';
import { ALL_PROBES, assertSatisfied, runProbes } from '../src/probes/index.js';
import { MemorySignatureStore } from '../src/signing/memory.js';
import type { Signer, Verifier } from '../src/signing/store.js';
import { MemoryStore } from '../src/store/memory.js';
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
 * The full-featured driver: every probe in `ALL_PROBES` must pass against it. Content
 * and subjectRefs are minted from a monotonic counter — unique per call, deterministic
 * across a test run. `sampleConsultations` answers per declaring profile; a severed
 * `'risk-check'` (tracked in `severed`, set/cleared only through the REAL
 * `severConsultationAuthority` hook below) switches its answer to an unreachable
 * marker — the genuine sever-and-recover behavior `consultation-genuineness` attacks.
 */
function makeFullDriver(): ProbeDriver {
  let counter = 0;
  const severed = new Set<string>();
  return {
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
      // "Probe-proved, host-specific" bound).
      return async () => {};
    },
    async restartPersistence() {
      // A fake: the in-memory fixture's state has nothing to restart — the SAME
      // `handles` reads it unchanged, which is the honest limitation this SKETCHED-tier
      // hook carries in-process (CONTROLS §4).
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

test('the full-featured driver: every registered probe passes', async () => {
  const driver = makeFullDriver();
  const report = await runProbes(driver);
  assert.equal(report.results.length, ALL_PROBES.length);
  for (const probe of ALL_PROBES) {
    const result = report.results.find((r) => r.id === probe.id);
    assert.ok(result !== undefined, `probe '${probe.id}' produced no result`);
    assert.equal(
      result.status,
      'pass',
      `probe '${probe.id}' expected pass, observed ${JSON.stringify(result)}`,
    );
  }
  assert.equal(report.satisfied, true);
  assert.equal(report.expiredWaivers.length, 0);
  assert.equal(report.unusedWaivers.length, 0);
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
  const driver = makeFullDriver();
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
  const driver = makeFullDriver();
  const report = await runProbes(driver);
  assert.doesNotThrow(() => assertSatisfied(report));
});

test('assertSatisfied throws naming every fail/not-driven result when unsatisfied', async () => {
  const driver = makeMinimalDriver();
  const report = await runProbes(driver);
  assert.throws(() => assertSatisfied(report), /sod-refuses.*not-driven/s);
});

test("assertSatisfied throws on an expired waiver even when every OTHER probe passes (the row's own governance point)", async () => {
  const driver = makeFullDriver();
  const waiver: Waiver = {
    probeId: 'drift-refuses', // passes under the full driver: the waiver is simply UNUSED, and expired
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
