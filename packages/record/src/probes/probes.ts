// @vidimera/record — probes/probes.ts: the registry (CONTROLS §4's OPERATOR-ASSURANCE
// tier, the self-test-tier increment, the build order's last item). Vocabulary: a
// "probe" RE-ATTACKS one promoted behavior against the host's OWN wiring, using
// nothing the host itself could not call — the insider surface, deliberately (SPEC §9's
// operator/agent handles plus the config's own Store/sidecar handles, the same seam a
// real operator holds). Every `target` below QUOTES CONTROLS §4's target list
// (`docs/concept/CONTROLS.md:64-73`) verbatim, hand-verified against a
// whitespace-collapsed copy of that source — this file is TypeScript, so the
// contract-scan's citation resolver does not check a `CONTROLS §N` citation the way it
// checks `SPEC §N`/`DECISIONS.md #N`; the quotes here carry no automated backstop.
//
// The `requires` predicate every probe applies before attacking generalizes ONE rule:
// "the probed configuration reaches no profile declaring the control" (or supplies no
// host hook for it) is `not-driven`, never a fabricated pass — the same honesty
// discipline `not-driven`'s own doc comment (`types.ts`) states. A probe whose setup
// throws (a refused stage/open ahead of the attack) is caught by the runner and
// reported `fail` — correct: the probed configuration could not even reach the attack,
// which IS a finding.
//
// Shapes here are PROVISIONAL pre-1.0 (types.ts's own header repeats the point): a
// probe's `id`/`target`/`detail` strings are the contract an operator reads; the
// TypeScript shapes around them are not frozen. Every probe uses a FRESH
// `driver.makeConfig()` state — no probe shares mutable state with another, and a
// probe's own multiple `makeConfig()` calls (where used) are independent instances of
// the SAME declared profiles, never the same store.

import type { AgentSurface } from '../agent-surface.js';
import { canonicalize, digest, resolveCanonicalizer } from '../canonical.js';
import type { Config, ConfirmProfile, ConsultationInput, FinalizeOptions } from '../config.js';
import { profileDeclaresEffectSeam } from '../config.js';
import { create } from '../create.js';
import type { OperatorSurface } from '../operator-surface.js';
import type { Outcome } from '../outcome.js';
import type { AppendMeta, BatchResult, Store } from '../store/store.js';
import type { IdentityAssertion, Transition } from '../types.js';
import type { ProbeDriver, ProbeResult } from './types.js';

export interface Probe {
  id: string;
  target: string;
  run(driver: ProbeDriver): Promise<ProbeResult>;
}

function pass(p: Probe, detail: string): ProbeResult {
  return { id: p.id, target: p.target, status: 'pass', detail };
}
function fail(p: Probe, detail: string): ProbeResult {
  return { id: p.id, target: p.target, status: 'fail', detail };
}
function notDriven(p: Probe, detail: string): ProbeResult {
  return { id: p.id, target: p.target, status: 'not-driven', detail };
}

// --- shared helpers (resolved once, reused by every probe below) ---------------------

/** A canonical facts fixture the probes own — a valid `{figures, checker}` pair no
 * probe's attack turns on, so every probe that needs SOME facts to reach its own gate
 * reuses this one rather than hand-rolling a copy. */
function probeFacts(): { figures: unknown; checker: IdentityAssertion } {
  return {
    figures: { probedBy: 'operator-assurance-tier' },
    checker: { principal: 'system:probe-facts', authority: 'mtls:probe-facts' },
  };
}

/** Thin wrapper over the public factory — named so a probe's own setup reads as
 * "assemble the handles", not a bare `create()` call amid attack logic. */
function createFrom(config: Config): { agent: AgentSurface; operator: OperatorSurface } {
  return create(config);
}

/** Thin wrapper over the public stage()+open() pair — used where a probe needs the
 * `Outcome` itself (e.g. to attack `open()` a second time), not `openOne`'s
 * throws-on-refusal convenience. */
async function stageOpen(
  handles: { agent: AgentSurface; operator: OperatorSurface },
  content: unknown,
  profileId: string,
  subjectRef: string,
): Promise<Outcome<{ recordId: string }>> {
  const staged = await handles.agent.stage(content, profileId, subjectRef);
  if (staged.status !== 'ok') return staged;
  return handles.operator.open(staged.value.stagedRef);
}

/** Stage+open under the profile's first leg — the shared setup every probe uses. */
async function openOne(driver: ProbeDriver, profileId: string) {
  const config = driver.makeConfig();
  const handles = create(config);
  const profile = config.profiles.find((p) => p.id === profileId);
  const legId = profile?.legs[0]?.id;
  if (profile === undefined || legId === undefined) {
    throw new Error(`openOne: profile '${profileId}' or its first leg is missing`);
  }
  const { content, subjectRef } = driver.sampleContent(profileId);
  const staged = await handles.agent.stage(content, profileId, subjectRef);
  if (staged.status !== 'ok') {
    throw new Error(`openOne: stage refused: ${JSON.stringify(staged)}`);
  }
  const opened = await handles.operator.open(staged.value.stagedRef);
  if (opened.status !== 'ok') {
    throw new Error(`openOne: open refused: ${JSON.stringify(opened)}`);
  }
  return { handles, recordId: opened.value.recordId, content, subjectRef, legId };
}

/** Setup-step convenience: throws (never fabricates a value) when an `Outcome` a
 * probe's own SETUP depends on is not `ok` — the same "a probe whose setup throws
 * reports fail via the runner's catch" discipline `openOne` itself follows, factored
 * out for probes that cannot use `openOne` because they need the `Config`/`Store`
 * handle `openOne` does not return. */
function assertOk<T>(outcome: Outcome<T>, label: string): T {
  if (outcome.status !== 'ok') {
    throw new Error(`${label}: refused unexpectedly: ${JSON.stringify(outcome)}`);
  }
  return outcome.value;
}

/** A canonical digest-shaped fixture value for probe-authored consultations/findings —
 * never a real payload (consultations are digest-only by SPEC §11.1's own custody
 * rule; the probes never see or need real evidence bytes). */
const PROBE_DIGEST = `sha256:${'a'.repeat(64)}`;

/** A minimal insider `Store` wrapper: every write delegates to `inner`; `readChain`
 * returns a TAMPERED copy of `targetRecordId`'s chain only, mutating a NON-LAST
 * transition's payload (index 0) — the AL1 next-link rule this build's own tests rely
 * on (only a non-last tamper surfaces at `verifyChain`'s break). This is the honest
 * seeded-copy attack `test/helpers/stores.ts`'s `TamperingStore` demonstrates in this
 * build's own suite, reimplemented here from scratch over the PUBLIC `Store` contract
 * alone — `src/probes/` may not import from `test/`. If a host's `Config.store` is not
 * a plain object this wrapper can stand in front of (every conforming `Store` is —
 * the interface has no such escape hatch), the attack is undrivable and the calling
 * probe reports `not-driven` with that detail, never a fabricated pass.
 */
function tamperedCopyStore(inner: Store, targetRecordId: string): Store {
  return {
    putStaged: (staged, tx) => inner.putStaged(staged, tx),
    getStaged: (stagedRef) => inner.getStaged(stagedRef),
    appendTransition: (expected, transition, meta, tx) =>
      inner.appendTransition(expected, transition, meta, tx),
    appendBatch: (
      expected: Parameters<Store['appendBatch']>[0],
      transitions: Parameters<Store['appendBatch']>[1],
      meta: AppendMeta,
      tx?: unknown,
    ): Promise<BatchResult> => inner.appendBatch(expected, transitions, meta, tx),
    chainHead: (recordId) => inner.chainHead(recordId),
    listDue: (now) => inner.listDue(now),
    findNonTerminal: (profileId, subjectRef) => inner.findNonTerminal(profileId, subjectRef),
    async readChain(recordId: string): Promise<Transition[]> {
      const chain = await inner.readChain(recordId);
      if (recordId !== targetRecordId || chain.length < 2) return chain;
      const tampered = structuredClone(chain);
      const target = tampered[0];
      if (target === undefined) return tampered;
      const basePayload =
        target.payload !== null && typeof target.payload === 'object' ? target.payload : {};
      tampered[0] = {
        ...target,
        payload: { ...(basePayload as Record<string, unknown>), __probeTampered: true },
      };
      return tampered;
    },
  };
}

/** A generic content-corruption helper for the effect-family probes: `content` is
 * host-arbitrary (`unknown`), so this mutates whatever shape it is handed rather than
 * assuming an object — a different value under the SAME adopter canonicalizer, which
 * is all the correspondence check at redemption compares. */
function corruptedCopy(content: unknown): unknown {
  if (Array.isArray(content)) return [...content, '__probeCorrupted__'];
  if (content !== null && typeof content === 'object') {
    return { ...(content as Record<string, unknown>), __probeCorrupted: true };
  }
  if (typeof content === 'string') return `${content}__probeCorrupted__`;
  if (typeof content === 'number') return content + 1;
  if (typeof content === 'boolean') return !content;
  return { __probeCorrupted: true, original: content };
}

/** RESOLVED honestly (a self-test-tier fix-wave rider): a synthetic foreign-shaped value —
 * `{ DRIFTED: true, ... }` above, `corruptedCopy`'s `__probeCorrupted` keys — is exactly
 * the shape a shape-validating adopter canonicalizer can throw on meeting, turning a
 * WORKING drift/corruption control into "probe threw" rather than the refusal it should
 * demonstrate. Draws a SECOND `driver.sampleContent(profileId)` instead — a value the
 * host's own canonicalizer already knows how to shape, since the driver is the host's own
 * wiring — and falls back to `fallback` (the caller's synthetic value) ONLY when the
 * redraw happens to digest IDENTICALLY to `content` under the profile's own canonicalizer
 * (sampleContent's own counter can coincidentally collide, or a driver may mint the same
 * fixture every call); the synthetic shape is still correct there, since drift genuinely
 * cannot be demonstrated with a same-digest value. */
function driftedOrFallback(
  driver: ProbeDriver,
  config: Config,
  profile: ConfirmProfile,
  content: unknown,
  fallback: unknown,
): unknown {
  const canonicalizer = resolveCanonicalizer(
    config.canonicalizers,
    profile.subject.canonicalizerRef,
  );
  const originalDigest = digest(canonicalize(canonicalizer(content)));
  const resampled = driver.sampleContent(profile.id).content;
  const resampledDigest = digest(canonicalize(canonicalizer(resampled)));
  return resampledDigest === originalDigest ? fallback : resampled;
}

/** Corrupts a COPY of a sampled `FinalizeOptions`' `eligibility` consultation verdict
 * to `fail` (ProbeDriver's own contract: "Probes corrupt COPIES of these"). `undefined`
 * when there is nothing to corrupt — the caller's own not-driven branch. */
function corruptEligibilityVerdict(opts: FinalizeOptions): FinalizeOptions | undefined {
  const consultations = opts.consultations;
  if (consultations === undefined) return undefined;
  const index = consultations.findIndex((c) => c.kind === 'eligibility' && 'verdict' in c);
  if (index === -1) return undefined;
  const copy: ConsultationInput[] = consultations.map((c) => ({ ...c }));
  const target = copy[index];
  if (target === undefined || !('verdict' in target)) return undefined;
  (target as { verdict: 'pass' | 'fail' }).verdict = 'fail';
  return { ...opts, consultations: copy };
}

// --- the three fully-worked templates (verbatim shape; every other probe follows it) --

const driftRefuses: Probe = {
  id: 'drift-refuses',
  target: 'drifted content refuses',
  async run(driver) {
    const config = driver.makeConfig();
    const profile = config.profiles[0];
    if (profile === undefined) return notDriven(this, 'the configuration has no profiles');
    const { handles, recordId, content, legId } = await openOne(driver, profile.id);
    const identity = driver.sampleIdentity(profile.id, legId);
    const consultations = driver.sampleConsultations?.(profile.id, legId);
    const drifted = driftedOrFallback(driver, config, profile, content, {
      DRIFTED: true,
      was: content,
    });
    const out = await handles.operator.finalize(
      recordId,
      identity,
      drifted,
      probeFacts(),
      consultations,
    );
    return out.status === 'refused' && out.code === 'content-drift'
      ? pass(this, 'altered content refused content-drift')
      : fail(this, `expected refused/content-drift, observed ${JSON.stringify(out)}`);
  },
};

const exclusivityHolds: Probe = {
  id: 'exclusivity-holds',
  target: 'at most one non-terminal record per subject',
  async run(driver) {
    const config = driver.makeConfig();
    const profile = config.profiles[0];
    if (profile === undefined) return notDriven(this, 'the configuration has no profiles');
    const handles = createFrom(config);
    const { content, subjectRef } = driver.sampleContent(profile.id);
    const first = await stageOpen(handles, content, profile.id, subjectRef);
    if (first.status !== 'ok') return fail(this, `first open refused: ${JSON.stringify(first)}`);
    const second = await stageOpen(handles, content, profile.id, subjectRef);
    return second.status === 'refused' && second.code === 'record-exists'
      ? pass(this, 'the second open refused record-exists')
      : fail(this, `expected refused/record-exists, observed ${JSON.stringify(second)}`);
  },
};

const consultationGenuineness: Probe = {
  id: 'consultation-genuineness',
  target:
    'required consultations are present and genuine (a severed authority yields `availability`, never a pass)',
  async run(driver) {
    if (driver.severConsultationAuthority === undefined) {
      return notDriven(this, 'the driver supplies no severConsultationAuthority hook');
    }
    const config = driver.makeConfig();
    // NARROWED, honestly, the same shape `sod-refuses` (below) already uses: `openOne`
    // always stages+opens leg 0, so accepting a declaring leg ANYWHERE (the prior
    // `p.legs.some(...)` scan) let a declaration past leg 0 through — severing that
    // leg's authority then attacked a leg-0 record the severed kind never gated, so
    // finalize returned ok and this probe reported a FALSE FAIL ("a stubbed pass")
    // against a CONFORMING host. Scan leg 0 only, like `consultations-present`
    // (~consultationsPresent below), `ineligible-refuses`, and `acks-block` already do.
    const declaring = config.profiles.find(
      (p) => (p.legs[0]?.requiredConsultations?.length ?? 0) > 0,
    );
    if (declaring === undefined) {
      const deeperOnly = config.profiles.some((p) =>
        p.legs.some((l, i) => i > 0 && (l.requiredConsultations?.length ?? 0) > 0),
      );
      return notDriven(
        this,
        deeperOnly
          ? 'a profile declares requiredConsultations only beyond leg 0 — this probe ' +
              'drives only the leg-0 shape today (openOne always stages+opens leg 0); ' +
              'deeper legs are a pre-1.0 driver-shape question'
          : 'no profile declares requiredConsultations',
      );
    }
    const leg = declaring.legs[0];
    const kind = leg?.requiredConsultations?.[0];
    if (leg === undefined || kind === undefined) return notDriven(this, 'unreachable');
    const { handles, recordId, content } = await openOne(driver, declaring.id);
    const restore = await driver.severConsultationAuthority(kind);
    try {
      // The HOST's consultation path is severed; the host's own gathering should now
      // produce an unreachable marker — the driver's sampleConsultations is asked
      // again UNDER the severed condition:
      const consultations = driver.sampleConsultations?.(declaring.id, leg.id);
      const out = await handles.operator.finalize(
        recordId,
        driver.sampleIdentity(declaring.id, leg.id),
        content,
        probeFacts(),
        consultations,
      );
      if (out.status === 'unavailable') {
        return pass(this, `severed '${kind}' yielded the availability outcome`);
      }
      if (out.status === 'ok') {
        return fail(this, `severed '${kind}' still finalized — a stubbed pass`);
      }
      return fail(this, `severed '${kind}' produced ${JSON.stringify(out)}, not availability`);
    } finally {
      await restore();
    }
  },
};

// --- the remaining probes, same shape (contract table order) -------------------------

const tamperEvident: Probe = {
  id: 'tamper-evident',
  target: 'tampering is evident on replay',
  async run(driver) {
    const config = driver.makeConfig();
    const profile = config.profiles[0];
    if (profile === undefined) return notDriven(this, 'the configuration has no profiles');
    const legId = profile.legs[0]?.id;
    if (legId === undefined) {
      return notDriven(this, `profile '${profile.id}' declares no legs`);
    }
    const handles = createFrom(config);
    const { content, subjectRef } = driver.sampleContent(profile.id);
    const { recordId } = assertOk(
      await stageOpen(handles, content, profile.id, subjectRef),
      'tamper-evident: stage+open',
    );
    const identity = driver.sampleIdentity(profile.id, legId);
    const consultations = driver.sampleConsultations?.(profile.id, legId);
    assertOk(
      await handles.operator.finalize(recordId, identity, content, probeFacts(), consultations),
      'tamper-evident: finalize (setup)',
    );

    // RESOLVED honestly: seed a tampered COPY into a fresh instance built from the SAME
    // declared profiles over a WRAPPED store — the insider attack this build's own test
    // corpus uses (`test/helpers/stores.ts`'s `TamperingStore`, reimplemented above
    // since `src/probes/` cannot import `test/`). Any conforming `Store` can be wrapped
    // this way; the not-driven branch above (missing profiles/legs) is the only honest
    // escape this attack has in this build.
    const tampered = tamperedCopyStore(config.store, recordId);
    const attackHandles = createFrom({ ...config, store: tampered });
    const attack = await attackHandles.operator.finalize(
      recordId,
      identity,
      content,
      probeFacts(),
      consultations,
    );
    return attack.status === 'refused' && attack.code === 'chain-compromise'
      ? pass(this, 'a tampered non-last transition refused chain-compromise on replay')
      : fail(this, `expected refused/chain-compromise, observed ${JSON.stringify(attack)}`);
  },
};

const payloadIdentityRefused: Probe = {
  id: 'payload-identity-refused',
  target: 'a payload-carried identity cannot finalize',
  async run(driver) {
    const config = driver.makeConfig();
    const profile = config.profiles[0];
    if (profile === undefined) return notDriven(this, 'the configuration has no profiles');
    const { handles, recordId, content, legId } = await openOne(driver, profile.id);
    const sampled = driver.sampleIdentity(profile.id, legId);
    // An authority manufactured to sit outside ANY declared allowedAuthorities list
    // (real authorities follow the RECOMMENDED oidc:/session:/mtls:/dev-stub forms;
    // this one deliberately does not) — the payload-carried shape SPEC §6 refuses.
    const bogus: IdentityAssertion = {
      principal: sampled.principal,
      authority: `probe:payload-carried:${sampled.authority}`,
    };
    const consultations = driver.sampleConsultations?.(profile.id, legId);
    const out = await handles.operator.finalize(
      recordId,
      bogus,
      content,
      probeFacts(),
      consultations,
    );
    return out.status === 'refused' && out.code === 'identity-authority-refused'
      ? pass(this, 'an identity under a disallowed authority refused identity-authority-refused')
      : fail(this, `expected refused/identity-authority-refused, observed ${JSON.stringify(out)}`);
  },
};

const atMostOnceRedeem: Probe = {
  id: 'at-most-once-redeem',
  target: 'a confirmation redeems at most once',
  async run(driver) {
    const scan = driver.makeConfig();
    // NARROWED, honestly: `kernel/redeem.ts` refuses `unredeemable-state` on any
    // non-final leg, so a legal multi-leg maker-checker+redemption profile makes this
    // probe's own setup (`assertOk` below) THROW on leg 0's own redeem — a legal host
    // config reported as "probe threw" rather than the honest not-driven it is owed.
    // Require the effect-seam profile to be single-leg; a multi-leg-only effect-seam
    // config reports not-driven with that reason named, rather than this probe building
    // a prior-leg chain to reach a final leg.
    const profile = scan.profiles.find((p) => profileDeclaresEffectSeam(p) && p.legs.length === 1);
    if (profile === undefined) {
      const multiLegOnly = scan.profiles.some(
        (p) => profileDeclaresEffectSeam(p) && p.legs.length > 1,
      );
      return notDriven(
        this,
        multiLegOnly
          ? 'every effect-seam profile is multi-leg — the probe drives the single-leg ' +
              'effect-seam shape today'
          : 'the configuration declares no effect-seam profile (a redeem block or captureMode "live")',
      );
    }
    const { handles, recordId, content, legId } = await openOne(driver, profile.id);
    const identity = driver.sampleIdentity(profile.id, legId);
    const consultations = driver.sampleConsultations?.(profile.id, legId);
    assertOk(
      await handles.operator.finalize(recordId, identity, content, probeFacts(), consultations),
      'at-most-once-redeem: finalize (setup)',
    );
    assertOk(
      await handles.operator.redeem(recordId, content),
      'at-most-once-redeem: first redeem (setup)',
    );
    const second = await handles.operator.redeem(recordId, content);
    return second.status === 'refused' && second.code === 'already-redeemed'
      ? pass(this, 'a second redeem on the same record refused already-redeemed')
      : fail(this, `expected refused/already-redeemed, observed ${JSON.stringify(second)}`);
  },
};

const effectsMatch: Probe = {
  id: 'effects-match',
  target: 'effects require redemption and match the redeemed record',
  async run(driver) {
    const scan = driver.makeConfig();
    // NARROWED the same way `at-most-once-redeem` is, immediately above:
    // `kernel/redeem.ts` refuses `unredeemable-state` on any non-final leg, so this
    // probe's own setup (`assertOk` below) would THROW against a legal multi-leg
    // effect-seam config rather than reporting the honest not-driven it is owed.
    const profile = scan.profiles.find((p) => profileDeclaresEffectSeam(p) && p.legs.length === 1);
    if (profile === undefined) {
      const multiLegOnly = scan.profiles.some(
        (p) => profileDeclaresEffectSeam(p) && p.legs.length > 1,
      );
      return notDriven(
        this,
        multiLegOnly
          ? 'every effect-seam profile is multi-leg — the probe drives the single-leg ' +
              'effect-seam shape today'
          : 'the configuration declares no effect-seam profile (a redeem block or captureMode "live")',
      );
    }
    const { handles, recordId, content, legId } = await openOne(driver, profile.id);
    const identity = driver.sampleIdentity(profile.id, legId);
    const consultations = driver.sampleConsultations?.(profile.id, legId);
    assertOk(
      await handles.operator.finalize(recordId, identity, content, probeFacts(), consultations),
      'effects-match: finalize (setup)',
    );
    const attack = await handles.operator.redeem(
      recordId,
      driftedOrFallback(driver, scan, profile, content, corruptedCopy(content)),
    );
    return attack.status === 'refused' &&
      (attack.code === 'effect-mismatch' || attack.code === 'content-drift')
      ? pass(this, `wrong content at redemption refused ${attack.code}`)
      : fail(
          this,
          `expected refused/effect-mismatch (or content-drift under reverify), observed ${JSON.stringify(attack)}`,
        );
  },
};

const sodRefuses: Probe = {
  id: 'sod-refuses',
  target: 'cross-leg self-approval refuses',
  async run(driver) {
    // NARROWED, honestly: `verifyPriorLegs` demands EXACTLY `legIndex` entries in
    // `priorRecordRefs`, paired by index against every strictly-earlier leg (SPEC
    // §10.1) — this attack builds only ONE reference (the named prior leg), so it can
    // only ever open a leg at legIndex 1 correctly. A leg deeper than that (legIndex
    // 2+) whose sod.notActorOf still names its immediate predecessor would need
    // references for EVERY earlier leg too, which this probe does not build — so it
    // deliberately does not claim that shape. A profile that only declares sod deeper
    // than legIndex 1 reports not-driven with that reason named, never a false FAIL
    // from a probe-side setup mismatch it could not have satisfied.
    const scan = driver.makeConfig();
    let target: { profileId: string } | undefined;
    let deeperOnly = false;
    for (const p of scan.profiles) {
      for (const [index, leg] of p.legs.entries()) {
        if (leg.sod === undefined) continue;
        const namedId = leg.sod.notActorOf[0];
        if (namedId === undefined || p.legs[index - 1]?.id !== namedId) continue;
        if (index === 1) {
          target = { profileId: p.id };
        } else {
          deeperOnly = true;
        }
      }
      if (target !== undefined) break;
    }
    if (target === undefined) {
      return notDriven(
        this,
        deeperOnly
          ? 'a profile declares sod naming its immediately-preceding leg, but only beyond ' +
              'legIndex 1 — this probe drives only the two-leg shape (legIndex 1) today; deeper ' +
              'chains are a pre-1.0 driver-shape question'
          : 'no profile declares a leg whose sod.notActorOf names its immediately-preceding leg ' +
              '(the shape this probe attacks)',
      );
    }
    const config = driver.makeConfig();
    const profile = config.profiles.find((p) => p.id === target.profileId);
    const priorLeg = profile?.legs[0];
    const sodLeg = profile?.legs[1];
    if (profile === undefined || priorLeg === undefined || sodLeg === undefined) {
      throw new Error('sod-refuses: the scanned profile/leg vanished between makeConfig() calls');
    }
    const handles = createFrom(config);
    const { content, subjectRef } = driver.sampleContent(profile.id);
    const priorIdentity = driver.sampleIdentity(profile.id, priorLeg.id);

    const priorOpened = assertOk(
      await stageOpen(handles, content, profile.id, subjectRef),
      'sod-refuses: stage+open the prior leg',
    );
    const priorConsultations = driver.sampleConsultations?.(profile.id, priorLeg.id);
    assertOk(
      await handles.operator.finalize(
        priorOpened.recordId,
        priorIdentity,
        content,
        probeFacts(),
        priorConsultations,
      ),
      'sod-refuses: finalize the prior leg (setup)',
    );
    const priorHead = await handles.operator.chainHead(priorOpened.recordId);
    if (priorHead === null) {
      throw new Error('sod-refuses: the confirmed prior leg has no chain head');
    }

    const sodStaged = await handles.agent.stage(content, profile.id, subjectRef, sodLeg.id);
    if (sodStaged.status !== 'ok') {
      return fail(
        this,
        `setup: staging the sod-declaring leg refused: ${JSON.stringify(sodStaged)}`,
      );
    }
    const sodOpened = await handles.operator.open(sodStaged.value.stagedRef, {
      priorRecordRefs: [{ recordId: priorOpened.recordId, chainHead: priorHead }],
    });
    if (sodOpened.status !== 'ok') {
      return fail(
        this,
        `setup: opening the sod-declaring leg refused: ${JSON.stringify(sodOpened)}`,
      );
    }
    const sodConsultations = driver.sampleConsultations?.(profile.id, sodLeg.id);
    // The SAME principal that decided the named prior leg attempts the sod-declaring leg:
    const attack = await handles.operator.finalize(
      sodOpened.value.recordId,
      priorIdentity,
      content,
      probeFacts(),
      sodConsultations,
    );
    return attack.status === 'refused' && attack.code === 'sod-violation'
      ? pass(this, 'the same principal deciding the checker leg refused sod-violation')
      : fail(this, `expected refused/sod-violation, observed ${JSON.stringify(attack)}`);
  },
};

const acksBlock: Probe = {
  id: 'acks-block',
  target: 'stale or missing acknowledgments block finalize',
  async run(driver) {
    const scan = driver.makeConfig();
    const declaring = scan.profiles.find(
      (p) => p.legs[0]?.ackMode !== undefined && (p.legs[0]?.requiredAcks?.length ?? 0) > 0,
    );
    const kind = declaring?.legs[0]?.requiredAcks?.[0];
    if (declaring === undefined || kind === undefined) {
      return notDriven(this, 'no profile declares ackMode+requiredAcks on its first leg');
    }
    const { handles, recordId, content, legId } = await openOne(driver, declaring.id);
    const raiser = driver.sampleIdentity(declaring.id, legId);
    const raised = await handles.operator.raiseFinding(
      recordId,
      { findingId: 'probe-finding-1', kind, findingDigest: PROBE_DIGEST },
      raiser,
    );
    if (raised.status !== 'ok') {
      return fail(this, `setup: raiseFinding refused: ${JSON.stringify(raised)}`);
    }
    const identity = driver.sampleIdentity(declaring.id, legId);
    const consultations = driver.sampleConsultations?.(declaring.id, legId);
    const out = await handles.operator.finalize(
      recordId,
      identity,
      content,
      probeFacts(),
      consultations,
    );
    return out.status === 'refused' && out.code === 'ack-missing'
      ? pass(this, 'a raised required-kind finding with no acknowledgment refused ack-missing')
      : fail(this, `expected refused/ack-missing, observed ${JSON.stringify(out)}`);
  },
};

const consultationsPresent: Probe = {
  id: 'consultations-present',
  target: 'required consultations are present',
  async run(driver) {
    if (driver.sampleConsultations === undefined) {
      return notDriven(this, 'the driver supplies no sampleConsultations hook');
    }
    const scan = driver.makeConfig();
    const declaring = scan.profiles.find(
      (p) => (p.legs[0]?.requiredConsultations?.length ?? 0) > 0,
    );
    if (declaring === undefined) {
      return notDriven(this, 'no profile declares requiredConsultations on its first leg');
    }
    const { handles, recordId, content, legId } = await openOne(driver, declaring.id);
    const identity = driver.sampleIdentity(declaring.id, legId);
    const without = await handles.operator.finalize(recordId, identity, content, probeFacts());
    if (!(without.status === 'refused' && without.code === 'consultation-missing')) {
      return fail(
        this,
        `finalize without the required consultations: expected refused/consultation-missing, ` +
          `observed ${JSON.stringify(without)}`,
      );
    }
    const withThem = await handles.operator.finalize(
      recordId,
      identity,
      content,
      probeFacts(),
      driver.sampleConsultations(declaring.id, legId),
    );
    return withThem.status === 'ok'
      ? pass(
          this,
          'missing required consultations refused consultation-missing; supplying them confirmed',
        )
      : fail(
          this,
          `finalize with the sampled consultations: expected ok, observed ${JSON.stringify(withThem)}`,
        );
  },
};

const ineligibleRefuses: Probe = {
  id: 'ineligible-refuses',
  target: 'an ineligible actor refuses',
  async run(driver) {
    if (driver.sampleConsultations === undefined) {
      return notDriven(this, 'the driver supplies no sampleConsultations hook');
    }
    const scan = driver.makeConfig();
    const declaring = scan.profiles.find((p) => p.legs[0]?.eligibility !== undefined);
    if (declaring === undefined) {
      return notDriven(this, 'no profile declares eligibility on its first leg');
    }
    const { handles, recordId, content, legId } = await openOne(driver, declaring.id);
    const sample = driver.sampleConsultations(declaring.id, legId);
    const corrupted = corruptEligibilityVerdict(sample);
    if (corrupted === undefined) {
      return notDriven(
        this,
        "the driver's sampleConsultations carries no 'eligibility' entry to corrupt",
      );
    }
    const identity = driver.sampleIdentity(declaring.id, legId);
    const out = await handles.operator.finalize(
      recordId,
      identity,
      content,
      probeFacts(),
      corrupted,
    );
    return out.status === 'refused' && out.code === 'ineligible'
      ? pass(this, "a failed eligibility verdict refused 'ineligible'")
      : fail(this, `expected refused/ineligible, observed ${JSON.stringify(out)}`);
  },
};

const AGENT_KEYS = ['chainHead', 'getRecord', 'readChain', 'stage'];
const TRANSITIONING_KEYS = [
  'open',
  'review',
  'finalize',
  'redeem',
  'beginRedemption',
  'completeRedemption',
  'seal',
  'replay',
  'verifyChain',
  'listDue',
];

const agentCannotDecide: Probe = {
  id: 'agent-cannot-decide',
  target: 'nothing agent-reachable decides',
  async run(driver) {
    const config = driver.makeConfig();
    const { agent } = createFrom(config);
    const keys = Object.keys(agent).sort();
    const expected = [...AGENT_KEYS].sort();
    if (keys.length !== expected.length || keys.some((k, i) => k !== expected[i])) {
      return fail(
        this,
        `expected the agent handle's key set to be exactly ${JSON.stringify(expected)}, observed ${JSON.stringify(keys)}`,
      );
    }
    const record = agent as unknown as Record<string, unknown>;
    for (const name of TRANSITIONING_KEYS) {
      if (name in record || record[name] !== undefined) {
        return fail(this, `'${name}' is reachable on the agent handle`);
      }
    }
    return pass(
      this,
      `the agent handle's key set is exactly ${JSON.stringify(expected)}; no transitioning method reachable`,
    );
  },
};

const unknownFailsClosed: Probe = {
  id: 'unknown-fails-closed',
  target: 'unknown inputs and compromise fail closed',
  async run(driver) {
    // Neither attack below needs a real record: both intake validations (finalize's
    // options-key/consultations-shape check; open()'s options-key check) run BEFORE
    // any chain or staged draft loads (kernel/finalize.ts, kernel/open.ts) — so this
    // probe is driven by ANY config `create()` accepts, profiles included or not.
    const config = driver.makeConfig();
    const { operator } = createFrom(config);

    let consultationsThrew = false;
    try {
      await operator.finalize(
        'probe-nonexistent-record',
        { principal: 'probe-actor', authority: 'probe:authority' },
        { probed: true },
        probeFacts(),
        { consultations: 'not-an-array' as unknown as FinalizeOptions['consultations'] },
      );
    } catch {
      consultationsThrew = true;
    }
    if (!consultationsThrew) {
      return fail(this, 'finalize() with a garbage (non-array) consultations bag did not throw');
    }

    let openThrew = false;
    try {
      await operator.open('probe-nonexistent-staged-ref', {
        thisKeyDoesNotExist: true,
      } as unknown as Parameters<typeof operator.open>[1]);
    } catch {
      openThrew = true;
    }
    return openThrew
      ? pass(this, 'both a garbage consultations bag and an unknown open-options key threw')
      : fail(this, 'open() with an unknown options key did not throw');
  },
};

const bindsReviewed: Probe = {
  id: 'binds-reviewed',
  target: 'the decision binds what the reviewer saw',
  async run(driver) {
    const config = driver.makeConfig();
    const profile = config.profiles[0];
    if (profile === undefined) return notDriven(this, 'the configuration has no profiles');
    const { handles, recordId, content, legId } = await openOne(driver, profile.id);
    const reviewed = await handles.operator.review(recordId);
    if (reviewed.status !== 'ok') {
      return fail(this, `review() refused unexpectedly: ${JSON.stringify(reviewed)}`);
    }
    const record = await handles.operator.getRecord(recordId);
    if (record === null || record.contentDigest !== reviewed.value.contentDigest) {
      return fail(this, "review()'s contentDigest diverges from the record's own bound digest");
    }
    const identity = driver.sampleIdentity(profile.id, legId);
    const consultations = driver.sampleConsultations?.(profile.id, legId);
    const out = await handles.operator.finalize(
      recordId,
      identity,
      content,
      probeFacts(),
      consultations,
    );
    return out.status === 'ok'
      ? pass(
          this,
          "review()'s contentDigest matched the record's binding, and matching content finalized",
        )
      : fail(
          this,
          `finalize with the exact staged content: expected ok, observed ${JSON.stringify(out)}`,
        );
  },
};

const signatureTamperRefuses: Probe = {
  id: 'signature-tamper-refuses',
  target: 'tampering is evident on replay',
  async run(driver) {
    const config = driver.makeConfig();
    if (config.signing === undefined) {
      return notDriven(this, 'the configuration supplies no config.signing sidecar');
    }
    const signingProfile = config.profiles.find((p) => p.signing === true);
    if (signingProfile === undefined) {
      return notDriven(this, 'no profile declares signing: true');
    }
    const legId = signingProfile.legs[0]?.id;
    if (legId === undefined) {
      return notDriven(this, `profile '${signingProfile.id}' declares no legs`);
    }
    const handles = createFrom(config);
    const { content, subjectRef } = driver.sampleContent(signingProfile.id);
    const { recordId } = assertOk(
      await stageOpen(handles, content, signingProfile.id, subjectRef),
      'signature-tamper-refuses: stage+open',
    );
    const identity = driver.sampleIdentity(signingProfile.id, legId);
    const consultations = driver.sampleConsultations?.(signingProfile.id, legId);
    assertOk(
      await handles.operator.finalize(recordId, identity, content, probeFacts(), consultations),
      'signature-tamper-refuses: finalize (setup)',
    );

    // Chain-driven correlation, never sidecar-driven: `verifySignatures` walks the CHAIN and
    // reports each transition's own digest, so a victim chosen from its report always names a
    // transition that actually landed. `listByRecord` promises no order, and a signing
    // deployment accumulates entries for transitions that never landed — every refusing seam
    // call against a record admitting no CAS candidate leaves one, because the decorator signs
    // before delegating. Taking the list's first element could therefore garble an orphan,
    // leave every real signature intact, and fail a sound build.
    const report = await handles.operator.verifySignatures(recordId);
    const signed = report.transitions.find((t) => t.signed);
    if (signed === undefined) {
      return fail(this, 'a confirmed signing record has no signed transitions');
    }
    const entries = await config.signing.signatures.listByRecord(recordId);
    const victim = entries.find((e) => e.transitionDigest === signed.transitionDigest);
    if (victim === undefined) {
      // Not reachable on a sound build: `layerVerdicts` marks a transition `signed` only when
      // the sidecar holds an entry for its digest, so this arm guards against a store that
      // changes its answer between two reads, not a live path. It fails rather than throws so
      // the suite keeps reporting.
      return fail(this, 'a signed transition has no sidecar entry');
    }
    // Garble the persisted signature over a real digest — the insider attack this
    // build's own signing-enforce.test.ts uses (`config.signing.signatures.put`, the
    // sidecar's own public upsert, never a test-only backdoor).
    await config.signing.signatures.put({
      ...victim,
      signature: `AAAA${victim.signature.slice(4)}`,
    });

    const attack = await handles.operator.finalize(
      recordId,
      identity,
      content,
      probeFacts(),
      consultations,
    );
    return attack.status === 'refused' && attack.code === 'chain-compromise'
      ? pass(this, 'a tampered sidecar signature refused chain-compromise on replay')
      : fail(this, `expected refused/chain-compromise, observed ${JSON.stringify(attack)}`);
  },
};

const pathDistinctness: Probe = {
  id: 'path-distinctness',
  target: 'Disable the rendering credential; the independent re-derivation must still succeed',
  async run(driver) {
    if (driver.disableRenderingCredential === undefined) {
      return notDriven(this, 'the driver supplies no disableRenderingCredential hook');
    }
    const scan = driver.makeConfig();
    const liveProfile = scan.profiles.find((p) => p.captureMode === 'live');
    if (liveProfile === undefined) {
      return notDriven(this, "no profile declares captureMode 'live'");
    }
    const { handles, recordId, content, legId } = await openOne(driver, liveProfile.id);
    const restore = await driver.disableRenderingCredential();
    try {
      const identity = driver.sampleIdentity(liveProfile.id, legId);
      const consultations = driver.sampleConsultations?.(liveProfile.id, legId);
      const out = await handles.operator.finalize(
        recordId,
        identity,
        content,
        probeFacts(),
        consultations,
      );
      return out.status === 'ok'
        ? pass(
            this,
            'the independent re-derivation still succeeded with the rendering credential disabled',
          )
        : fail(
            this,
            `finalize under the disabled credential: expected ok, observed ${JSON.stringify(out)}`,
          );
    } finally {
      await restore();
    }
  },
};

const stateSurvivesRestart: Probe = {
  id: 'state-survives-restart',
  target: 'decision state survives restart',
  async run(driver) {
    if (driver.restartPersistence === undefined) {
      return notDriven(this, 'the driver supplies no restartPersistence hook');
    }
    const config = driver.makeConfig();
    const profile = config.profiles[0];
    if (profile === undefined) return notDriven(this, 'the configuration has no profiles');
    const { handles, recordId, content, legId } = await openOne(driver, profile.id);
    const identity = driver.sampleIdentity(profile.id, legId);
    const consultations = driver.sampleConsultations?.(profile.id, legId);
    assertOk(
      await handles.operator.finalize(recordId, identity, content, probeFacts(), consultations),
      'state-survives-restart: finalize (setup)',
    );
    await driver.restartPersistence();
    const record = await handles.operator.getRecord(recordId);
    return record?.state === 'confirmed'
      ? pass(this, "the 'confirmed' state survived restartPersistence()")
      : fail(this, `expected state 'confirmed' after restart, observed ${JSON.stringify(record)}`);
  },
};

export const ALL_PROBES: readonly Probe[] = [
  driftRefuses,
  exclusivityHolds,
  consultationGenuineness,
  tamperEvident,
  payloadIdentityRefused,
  atMostOnceRedeem,
  effectsMatch,
  sodRefuses,
  acksBlock,
  consultationsPresent,
  ineligibleRefuses,
  agentCannotDecide,
  unknownFailsClosed,
  bindsReviewed,
  signatureTamperRefuses,
  pathDistinctness,
  stateSurvivesRestart,
];
