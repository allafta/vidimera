// smoke-pack.mjs — the published-artifact smoke test (phase-2 packaging ruling,
// `docs/analysis/2026-08-19-phase-2-packaging.md`): the one check the vitest suite
// structurally cannot make, because every test there imports `../src/*.js` and so never
// exercises the built artifact, the exports map, or the shipped declarations.
//
// Covers BOTH workspace packages since the session-2 posture ruling
// (`docs/analysis/2026-08-20-artifact-postures.md`). What it does, end to end, in a
// temp directory it always removes:
//   1. builds `packages/record` and `packages/store-postgres` (tsc, each package's
//      `tsconfig.build.json`) into `dist/`;
//   2. packs both into a scratch dir (works under `private: true` — only publish is
//      blocked, which is the point of the flag). The record package packs with npm;
//      the adapter MUST pack with pnpm, because only pnpm's pack rewrites its
//      `workspace:^` peerDependency to a concrete range — the release workflow's own
//      tarball-first shape — and npm would ship the workspace protocol verbatim, which
//      the install below then refuses;
//   3. installs both tarballs into a fresh scratch project, the record tarball
//      satisfying the adapter's rewritten peer range;
//   4. runs a script there that imports `@vidimera/record` AND `@vidimera/record/probes`
//      through the exports map and drives a stage → open → finalize → verify round trip,
//      checking both the operator-handle and the pure forms of the audit functions —
//      and, for the adapter, resolves `@vidimera/store-postgres` through its exports
//      map, asserts the peer-range rewrite in the installed manifest, and constructs
//      `PostgresStore` over a pool that never connects.
//
// THE ADAPTER'S RECORDED BOUND (session-2 ruling): its coverage here is
// PACKAGING-LEVEL ONLY — no live database, no confirm loop. The adapter's runtime
// behavior stays suite-side, proven against a real embedded Postgres on every test
// run; its packed artifact was live-proven once at the phase-6 rehearsal
// (`docs/analysis/2026-08-19-phase-6-rehearsal.md`), and the release checklist's
// post-publish registry install re-proves it against the published artifacts.
//
// Exits 0 silent-ish on success, 1 with the failing step's output on any failure.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = join(repoRoot, 'packages', 'record');
const adapterDir = join(repoRoot, 'packages', 'store-postgres');
const tscBin = join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');

function run(label, cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (result.status !== 0) {
    console.error(`smoke: FAILED at ${label} (exit ${result.status})`);
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exit(1);
  }
  return result.stdout ?? '';
}

// (1) build — tsc resolved from the workspace root's own devDependency, run via this
// Node binary so the script needs no shell-PATH assumptions for the compiler.
run('build (tsc)', process.execPath, [tscBin, '-p', join(pkgDir, 'tsconfig.build.json')]);
for (const artifact of ['index.js', 'index.d.ts', join('probes', 'index.js')]) {
  const p = join(pkgDir, 'dist', artifact);
  if (!existsSync(p)) {
    console.error(`smoke: FAILED — build produced no ${p}`);
    process.exit(1);
  }
}
run('build adapter (tsc)', process.execPath, [
  tscBin,
  '-p',
  join(adapterDir, 'tsconfig.build.json'),
]);
for (const artifact of ['index.js', 'index.d.ts']) {
  const p = join(adapterDir, 'dist', artifact);
  if (!existsSync(p)) {
    console.error(`smoke: FAILED — adapter build produced no ${p}`);
    process.exit(1);
  }
}

const scratch = mkdtempSync(join(tmpdir(), 'vidimera-smoke-'));
try {
  // (2) pack — npm itself, so the tarball is exactly what a publish would upload.
  // npm is a .cmd shim on Windows, so these two npm steps run as a single quoted shell
  // string (args-with-shell is deprecated as unescaped; a pre-quoted string is not).
  const packOut = run('npm pack', `npm pack --pack-destination "${scratch}"`, [], {
    cwd: pkgDir,
    shell: true,
  });
  const tarball = packOut.trim().split('\n').at(-1)?.trim();
  if (!tarball) {
    console.error('smoke: FAILED — npm pack reported no tarball name');
    process.exit(1);
  }

  // (2b) pack the adapter with pnpm, never npm — only pnpm's pack rewrites the
  // `workspace:^` peerDependency to a concrete range (the header's own reasoning).
  // Under `pnpm smoke`, npm_execpath IS pnpm, so the rewrite runs through this exact
  // Node binary; a direct `node scripts/smoke-pack.mjs` falls back to pnpm on PATH.
  const pnpmExec = process.env.npm_execpath;
  const adapterPackOut =
    pnpmExec && /pnpm/.test(pnpmExec)
      ? run(
          'pnpm pack (adapter)',
          process.execPath,
          [pnpmExec, 'pack', '--pack-destination', scratch],
          { cwd: adapterDir },
        )
      : run('pnpm pack (adapter)', `pnpm pack --pack-destination "${scratch}"`, [], {
          cwd: adapterDir,
          shell: true,
        });
  const adapterTarballLine = adapterPackOut.trim().split('\n').at(-1)?.trim();
  if (!adapterTarballLine) {
    console.error('smoke: FAILED — pnpm pack reported no adapter tarball name');
    process.exit(1);
  }
  // pnpm prints a path (absolute or relative); keep only the file name, joined below.
  const adapterTarball = adapterTarballLine.split(/[\\/]/).at(-1) ?? adapterTarballLine;

  // (3) a fresh consumer project, ESM like the package.
  const app = join(scratch, 'app');
  mkdirSync(app);
  writeFileSync(
    join(app, 'package.json'),
    `${JSON.stringify({ name: 'vidimera-smoke-app', private: true, type: 'module' }, null, 2)}\n`,
  );
  run(
    'npm install (tarballs)',
    `npm install "${join(scratch, tarball)}" "${join(scratch, adapterTarball)}" --no-audit --no-fund --loglevel=error`,
    [],
    { cwd: app, shell: true },
  );

  // (4) the consumer script: both entry points, both audit-function forms, one full
  // confirm loop. Everything here resolves through the exports map or fails.
  writeFileSync(
    join(app, 'smoke.mjs'),
    `import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MemoryStore, create, replay, verifyChain } from '@vidimera/record';
import { ALL_PROBES } from '@vidimera/record/probes';
import { PostgresStore } from '@vidimera/store-postgres';
import pg from 'pg';

const profile = {
  id: 'smoke.approval.v1',
  subject: { canonicalizerRef: 'smoke.v1' },
  legs: [{ id: 'approve', allowedAuthorities: ['session:smoke'] }],
  captureMode: 'staged',
  expiry: 'none',
};
const { agent, operator } = create({
  profiles: [profile],
  store: new MemoryStore(),
  canonicalizers: { 'smoke.v1': (content) => content },
});

const content = { subject: 'demo', amount: 1 };
const staged = await agent.stage(content, 'smoke.approval.v1', 'demo:1');
assert.equal(staged.status, 'ok');
const opened = await operator.open(staged.value.stagedRef);
assert.equal(opened.status, 'ok');
const recordId = opened.value.recordId;
const decided = await operator.finalize(
  recordId,
  { principal: 'user:smoke', authority: 'session:smoke' },
  content,
  { figures: { shown: '1' }, checker: { principal: 'svc:smoke', authority: 'session:smoke' } },
);
assert.equal(decided.status, 'ok');
assert.equal(decided.value.state, 'confirmed');

const chain = await operator.readChain(recordId);
assert.equal(verifyChain(chain).intact, true); // the pure form (offline audit)
assert.equal(replay(chain).state, 'confirmed'); // the pure form
assert.equal((await operator.verifyChain(recordId)).intact, true); // the handle form
assert.ok(ALL_PROBES.length > 0, 'the ./probes subpath resolves and carries probes');

// The adapter, packaging-level only (the recorded bound in this script's header):
// the import above already proved its exports map and dist; now pin that pnpm's pack
// actually rewrote the workspace peer range (the install would refuse the workspace
// protocol, but pin the rewrite as a claim, not a side effect) and that the shipped
// class constructs — over a pool that never connects (construction is synchronous,
// DDL is lazy).
const adapterManifest = JSON.parse(
  readFileSync('./node_modules/@vidimera/store-postgres/package.json', 'utf8'),
);
const peerRange = adapterManifest.peerDependencies['@vidimera/record'];
assert.ok(
  !peerRange.startsWith('workspace:'),
  'adapter peer range rewritten at pack time, got: ' + peerRange,
);
const pool = new pg.Pool({ host: '127.0.0.1', port: 9, user: 'never', database: 'never' });
const pgStore = new PostgresStore(pool, { schema: 'smoke' });
for (const method of [
  'putStaged', 'getStaged', 'appendTransition', 'readChain',
  'chainHead', 'appendBatch', 'listDue', 'findNonTerminal',
]) {
  assert.equal(typeof pgStore[method], 'function', 'PostgresStore.' + method + ' shipped');
}
await pool.end();

console.log(
  'smoke: OK - ' +
    chain.length +
    ' transitions, confirmed + intact, ' +
    ALL_PROBES.length +
    ' probes visible through ./probes; adapter resolved, peer range ' +
    peerRange +
    ', PostgresStore constructs (packaging-level only, by recorded bound)',
);
`,
  );
  const out = run('consumer script', process.execPath, ['smoke.mjs'], { cwd: app });
  process.stdout.write(out);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
