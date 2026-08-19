// @vidimera/record — public-surface.test.ts: the phase-1 API review's export rules
// (2026-08-19, `docs/analysis/2026-08-19-phase-1-api-review.md`), pinned at the entry
// point itself. Rule 1 — no unspellable names: every type a public signature names is
// re-exported from `index.ts`, so a host can annotate a wrapper without reaching past
// the entry point. Rule 2 — the pure audit functions (`replay(chain)`,
// `verifyChain(chain)`; SPEC §5) export beside their operator-handle forms, for the
// offline-audit case (an archived chain needs no store and no handle). Rule 3 — the
// signing tier is root-reachable (the `./probes` subpath is publish-tooling work,
// register row 1: no exports map exists yet, so a subpath cannot).
//
// The TYPE half of the pin is the import block below compiling: vitest's transform
// strips types unchecked, so `pnpm typecheck` (which includes test/) is the gate that
// fails when a ruled type export goes missing.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import type {
  AckInput,
  ConsultationInput,
  FinalizeOptions,
  FindingInput,
  ObtainedConsultation,
  OpenOptions,
  PolicyInput,
  PriorRecordRef,
  RecordedAck,
  RecordedFinding,
  RecordedPriorLegRef,
  SignatureEntry,
  SignatureReport,
  SignatureStore,
  Signer,
  SigningConfig,
  SupersedesRef,
  Surfaces,
  UnreachableMarker,
  Verifier,
} from '../src/index.js';
import {
  canonicalize,
  create,
  digest,
  MemorySignatureStore,
  MemoryStore,
  replay,
  SqliteStore,
  verifyChain,
  withSigning,
} from '../src/index.js';
import { captureProfile, makeConfig } from './helpers/profiles.js';

// Uses every ruled type import once, so `pnpm typecheck` fails loudly if any export
// is removed — `noUnusedLocals`-proof and self-documenting about which rule covers it.
type RuledTypeExports = [
  // rule 1 — signature-reachable types, config.ts
  OpenOptions,
  FinalizeOptions,
  ConsultationInput,
  ObtainedConsultation,
  UnreachableMarker,
  PolicyInput,
  PriorRecordRef,
  // rule 1 — signature-reachable types, kernel seams
  FindingInput,
  AckInput,
  SignatureReport,
  // rule 1 — reachable through exported record-model fields, types.ts
  RecordedPriorLegRef,
  RecordedFinding,
  RecordedAck,
  SupersedesRef,
  // rule 3 — the signing tier
  SigningConfig,
  Signer,
  Verifier,
  SignatureEntry,
  SignatureStore,
];

test('every ruled value export is reachable from the entry point', () => {
  const fns = { canonicalize, create, digest, replay, verifyChain, withSigning };
  for (const [name, fn] of Object.entries(fns)) {
    assert.equal(typeof fn, 'function', `expected index.ts to export function '${name}'`);
  }
  const classes = { MemorySignatureStore, MemoryStore, SqliteStore };
  for (const [name, ctor] of Object.entries(classes)) {
    assert.equal(typeof ctor, 'function', `expected index.ts to export class '${name}'`);
  }
});

test("Surfaces names create()'s return shape — the handle pair is no longer anonymous", () => {
  const handles: Surfaces = create(makeConfig([captureProfile()]));
  assert.equal(typeof handles.agent.stage, 'function');
  assert.equal(typeof handles.operator.finalize, 'function');
  const _typesUsed: RuledTypeExports | undefined = undefined;
  assert.equal(_typesUsed, undefined);
});
