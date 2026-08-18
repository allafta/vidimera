// @vidimera/record — probes/types.ts (CONTROLS §4 "OPERATOR-ASSURANCE — self-run
// verification"; the self-test-tier increment, the build order's last item). Shapes
// are PROVISIONAL pre-1.0, the Store contract's own discipline: the behaviors are the
// contract, the signatures are not. A passing suite "proves the control operated in
// the probed configuration, at probe time" — never third-party assurance, never a
// claim about unprobed configurations.

import type { Config, FinalizeOptions } from '../config.js';
import type { IdentityAssertion } from '../types.js';

/** The host's own wiring, handed to the probes. Isolation is the driver's duty: every
 * makeConfig() call returns an INDEPENDENT instance (fresh store state); probes
 * re-attack the probed configuration, never a library-supplied fixture. */
export interface ProbeDriver {
  makeConfig(): Config;
  /** Content + a UNIQUE subjectRef the given profile accepts (stage-able). */
  sampleContent(profileId: string): { content: unknown; subjectRef: string };
  /** A leg-decider identity the given profile/leg accepts (allowedAuthorities). */
  sampleIdentity(profileId: string, legId: string): IdentityAssertion;
  /** Options satisfying the given leg's required kinds (pass verdicts; observedAt
   * where freshness demands). Probes corrupt COPIES of these. Optional — absent
   * gates the consultation-family probes to not-driven on declaring profiles. */
  sampleConsultations?(profileId: string, legId: string): FinalizeOptions;
  // Host-environment exercises — each optional; absent => not-driven:
  severConsultationAuthority?(kind: string): Promise<() => Promise<void>>;
  disableRenderingCredential?(): Promise<() => Promise<void>>;
  restartPersistence?(): Promise<void>;
}

export type ProbeStatus = 'pass' | 'fail' | 'not-driven' | 'waived';

export interface ProbeResult {
  id: string;
  /** Verbatim from CONTROLS §4's target list. */
  target: string;
  status: ProbeStatus;
  /** For fail: what was expected vs observed. For not-driven: what was missing
   * (a hook, or a declaring profile). For waived: the covering waiver's id+reason. */
  detail: string;
}

/** Dated, expiring self-waivers (CONTROLS §4's waiver-governance row): an UNEXPIRED
 * waiver converts fail/not-driven to waived; an EXPIRED one converts NOTHING and is
 * flagged — the expiry discipline is the row's whole point. */
export interface Waiver {
  probeId: string;
  reason: string;
  /** RFC 3339 with an explicit offset — the freshness increment's intake class. */
  expires: string;
}

export interface ProbeReport {
  results: ProbeResult[];
  /** Every result pass or waived. */
  satisfied: boolean;
  expiredWaivers: Waiver[];
  unusedWaivers: Waiver[];
}
