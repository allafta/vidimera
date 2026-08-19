import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Two projects (a third file-set, scripts/test, rides with record): the record project
// is exactly the pre-projects single-config behavior; the store-postgres project exists
// so its embedded-Postgres globalSetup (packages/store-postgres/test/setup/) scopes to
// the adapter suite alone and never starts a server for a record-only run. execArgv
// silences node:sqlite's ExperimentalWarning (SqliteStore).
const execArgv = ['--disable-warning=ExperimentalWarning'];

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'record',
          include: ['packages/record/test/**/*.test.ts', 'scripts/test/**/*.test.mjs'],
          execArgv,
        },
      },
      {
        // The alias resolves the adapter's runtime imports of @vidimera/record to
        // source, preserving the workspace's run-from-source discipline (record's own
        // exports map points at dist, which only exists when built). Anchored as a
        // regex on the EXACT specifier: a bare-string alias prefix-matches, which would
        // silently rewrite a subpath import like '@vidimera/record/probes' to
        // '.../src/index.ts/probes'.
        resolve: {
          alias: [
            {
              find: /^@vidimera\/record$/,
              replacement: fileURLToPath(
                new URL('./packages/record/src/index.ts', import.meta.url),
              ),
            },
          ],
        },
        test: {
          name: 'store-postgres',
          include: ['packages/store-postgres/test/**/*.test.ts'],
          globalSetup: ['packages/store-postgres/test/setup/global-setup.ts'],
          execArgv,
        },
      },
    ],
  },
});
