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
        test: {
          name: 'store-postgres',
          include: ['packages/store-postgres/test/**/*.test.ts'],
          execArgv,
        },
      },
    ],
  },
});
