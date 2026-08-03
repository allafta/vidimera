import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `scripts/test` is `.mjs` on purpose: contract-scan reads tracked `*.ts`/`*.mts`/`*.cts`,
    // so a planted-violation fixture in a `.ts` test would make that gate red against itself.
    include: ['packages/*/test/**/*.test.ts', 'scripts/test/**/*.test.mjs'],
  },
});
