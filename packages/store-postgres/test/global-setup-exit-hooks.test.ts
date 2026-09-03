// The global setup's one hazard, pinned in both directions. `embedded-postgres` registers an
// `async-exit-hook` handler at module load, and that library's `beforeExit` listener exits
// the process with code 0 once the event loop drains — clobbering the non-zero
// `process.exitCode` vitest sets for a failed run. A globalSetup module runs in vitest's MAIN
// process, so a plain top-level import there turned every failed `pnpm test` into exit 0, on
// every CI leg, from the adapter's first commit until the CI test-gate repair (2026-09-03).
// `loadEmbeddedPostgres` (setup/global-setup.ts) is the workaround; these pins keep it honest.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';

const packageDir = fileURLToPath(new URL('..', import.meta.url));

test('the hazard: a bare import of embedded-postgres turns a process that set exitCode 1 into exit 0 — if THIS pin fails, the library fixed it and the workaround is obsolete', () => {
  const run = (source: string) =>
    spawnSync(process.execPath, ['--input-type=module', '-e', source], {
      cwd: packageDir,
      encoding: 'utf8',
    });
  const control = run('process.exitCode = 1;');
  assert.equal(control.status, 1, 'control: exitCode 1 survives when nothing is imported');
  const hazard = run("import 'embedded-postgres'; process.exitCode = 1;");
  assert.equal(hazard.stderr.trim(), '', `the import itself must not fail: ${hazard.stderr}`);
  assert.equal(
    hazard.status,
    0,
    "async-exit-hook's beforeExit listener exits 0 over the process's own exitCode",
  );
});

test('loadEmbeddedPostgres() hands back the constructor and leaves the beforeExit listeners exactly as they were', async () => {
  const before = process.listeners('beforeExit');
  const setup = await import('./setup/global-setup.js');
  assert.deepEqual(
    process.listeners('beforeExit'),
    before,
    'importing the global-setup module registers no beforeExit listener',
  );
  const EmbeddedPostgres = await setup.loadEmbeddedPostgres();
  assert.equal(typeof EmbeddedPostgres, 'function', 'the default export is the constructor');
  assert.deepEqual(
    process.listeners('beforeExit'),
    before,
    'loading embedded-postgres through the guarded path leaves no beforeExit listener behind',
  );
});
