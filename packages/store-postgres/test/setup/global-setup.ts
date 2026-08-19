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
  await pg.initialise();
  await pg.start();
  process.env.VIDIMERA_PG_URL = `postgresql://vidimera:vidimera@127.0.0.1:${port}/postgres`;
  return async () => {
    await pg.stop();
  };
}
