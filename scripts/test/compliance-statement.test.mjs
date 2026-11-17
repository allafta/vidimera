// compliance-statement.test.mjs — SCOPING-GUIDE §6's rule, held as a pin: "adopting the library
// makes no host compliant with anything, and every user-facing document in an inheriting
// project must say so". The user-facing set here is the repository front door, both package
// READMEs (the registry pages after the cut), the documentation front door, and every page of
// the public guide — enumerated from the directory, so a new guide page is held to the rule the
// moment it lands. Each must carry the phrase "makes no host compliant", matched after
// collapsing whitespace so a line wrap inside it still counts.
//
// The bound, in the same breath: this checks that the statement is PRESENT, never that the
// rest of the page avoids a compliance reading — a page can carry the sentence and still
// overclaim elsewhere. The concept set (`docs/concept/`) and the process record are outside
// the set: the first states the rule itself, the second is not user-facing. So are the
// project-process pages (`CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, the `.github/`
// templates), which describe how to work on the project rather than what the library is, and
// the manifests' one-line `description` fields, which make no compliance claim to qualify.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PHRASE = 'makes no host compliant';

const guidePages = readdirSync(join(root, 'docs', 'guide'))
  .filter((name) => name.endsWith('.md'))
  .map((name) => `docs/guide/${name}`);

const userFacing = [
  'README.md',
  'packages/record/README.md',
  'packages/store-postgres/README.md',
  'docs/README.md',
  ...guidePages,
];

test('the guide directory is non-empty, so the enumeration below cannot pass vacuously', () => {
  assert.ok(guidePages.length >= 5, `found ${guidePages.length} guide pages`);
});

for (const page of userFacing) {
  test(`${page} says adopting the library makes no host compliant`, () => {
    const text = readFileSync(join(root, page), 'utf8').replace(/\s+/g, ' ');
    assert.ok(text.includes(PHRASE), `${page} lacks "${PHRASE}" (SCOPING-GUIDE §6)`);
  });
}
