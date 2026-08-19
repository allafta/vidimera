// Project-scoped vitest globalSetup: one embedded Postgres per `pnpm test` run. Runs in
// the main process before workers fork, so the DSN set on process.env is inherited by
// every worker. There is deliberately NO skip path: if the server cannot start, the
// suite fails loudly — the zero-skips discipline.
import { mkdtempSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (addr === null || typeof addr === 'string') {
        reject(new Error('freePort: no address'));
        return;
      }
      const { port } = addr;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

export default async function setup(): Promise<() => Promise<void>> {
  // The documented external-server seam: a pre-provided URL wins, and the embedded
  // server never spawns. This exists because a real environment can be unable to run
  // the embedded binaries at all — the first CI run proved it: postgres.exe refuses an
  // elevated (administrator) token, which is exactly what GitHub's Windows runners
  // carry, so that leg starts the runner's preinstalled PostgreSQL service and hands
  // its URL in (ci.yml). Either way the suite runs against a real server — no skip
  // path exists on any branch.
  if (process.env.VIDIMERA_PG_URL !== undefined) {
    return async () => {};
  }
  const port = await freePort();
  const pg = new EmbeddedPostgres({
    databaseDir: mkdtempSync(join(tmpdir(), 'vidimera-pg-')),
    user: 'vidimera',
    password: 'vidimera',
    port,
    persistent: false,
    // initdb/postgres chatter stays out of the test output; real errors still surface.
    onLog: () => {},
  });
  // The library's start() rejects with NO argument when the server process exits
  // before its readiness line, and its stderr goes only to the readiness parser — a
  // bare `undefined` failure with the real message swallowed (the first CI run's
  // exact symptom). Wrap both phases so a failure names itself and the likely causes.
  try {
    await pg.initialise();
    await pg.start();
  } catch (err) {
    throw new Error(
      `embedded Postgres failed to ${err === undefined ? 'start (the server process exited before readiness — its stderr is swallowed by the library; an elevated/administrator token is the known cause on Windows)' : 'initialise/start'}: ${String(err)}. ` +
        'Provide a reachable server via VIDIMERA_PG_URL to run the suite against it instead.',
    );
  }
  process.env.VIDIMERA_PG_URL = `postgresql://vidimera:vidimera@127.0.0.1:${port}/postgres`;
  return async () => {
    await pg.stop();
  };
}
