import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `scripts/test` is `.mjs` on purpose: contract-scan reads tracked `*.ts`/`*.mts`/`*.cts`,
    // so a planted-violation fixture in a `.ts` test would make that gate red against itself.
    include: ['packages/*/test/**/*.test.ts', 'scripts/test/**/*.test.mjs'],
    // Targeted suppression of node:sqlite's ExperimentalWarning (the embedded adapter,
    // packages/record/src/store/sqlite.ts, imports the module; the warning would otherwise
    // print once per worker and make test output non-pristine). --disable-warning is scoped
    // to exactly this warning class — never a blanket --no-warnings. Remove when node:sqlite
    // stabilizes. Vitest 4 moved `execArgv` to a top-level `test` option (`poolOptions.forks`
    // was removed — see the migration guide).
    execArgv: ['--disable-warning=ExperimentalWarning'],
  },
});
