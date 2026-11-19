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

/**
 * Per-test budget for the three tests that spawn a Node child process which loads
 * `embedded-postgres`. On the Windows CI runner that start-up varies widely: across ten Windows
 * runs between 2026-11-17 and 2026-11-20 this file took 0.6s to 6.0s, and on 2026-11-19 one of
 * these tests took 5.2s and failed at vitest's 5s default while every other leg passed (its rerun
 * passed). Thirty seconds is five times the slowest file observed. A pass is still decided by the
 * child's exit status and stderr, never by the clock.
 */
const SUBPROCESS_TIMEOUT_MS = 30_000;

test('the hazard: a bare import of embedded-postgres turns a process that set exitCode 1 into exit 0 — if THIS pin fails, the library fixed it and the workaround is obsolete', {
  timeout: SUBPROCESS_TIMEOUT_MS,
}, () => {
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

// The workaround's own side effect, pinned both ways (deferral register row 24's noise note).
// `async-exit-hook` hands a hook its `done` callback only from the `beforeExit` path; with
// that listener removed, the library's `exit`-event path runs `gracefulShutdown` first and
// passes nothing. The library never prunes a stopped server from its shutdown set, so after a
// clean stop the re-stop returns at once and `done()` throws — an exit-phase rejection Node
// reports as a fatal trace WITHOUT touching the exit code already set. The child runs the REAL
// `loadEmbeddedPostgres` (Node's type stripping, flagged at the 22.16 floor, default-on later)
// so the pin binds the workaround itself, not a copy of its four lines.
const throughWorkaround = (tail: string) =>
  spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--disable-warning=ExperimentalWarning',
      '--input-type=module',
      '-e',
      `import { loadEmbeddedPostgres } from './test/setup/global-setup.ts'; await loadEmbeddedPostgres(); ${tail}`,
    ],
    { cwd: packageDir, encoding: 'utf8' },
  );

test('through loadEmbeddedPostgres(), a process that set exitCode 1 exits 1 — the exit-phase rejection the workaround exposes never touches the code the CI gate reads', {
  timeout: SUBPROCESS_TIMEOUT_MS,
}, () => {
  const failing = throughWorkaround('process.exitCode = 1;');
  assert.equal(
    failing.status,
    1,
    `exitCode 1 must survive the exit phase; stderr: ${failing.stderr}`,
  );
});

test("the exposed noise itself: after a clean run the library's exit-event hook throws `done is not a function` on stderr — if THIS pin fails, the library fixed its exit path and row 24's noise note is stale", {
  timeout: SUBPROCESS_TIMEOUT_MS,
}, () => {
  const clean = throughWorkaround('process.exitCode = 0;');
  assert.equal(clean.status, 0, `the control run exits 0; stderr: ${clean.stderr}`);
  assert.match(
    clean.stderr,
    /TypeError: done is not a function/,
    'the trace is the workaround exposing the library exit path that passes no callback',
  );
});
