// release-guard.mjs — the release workflow's pre-publish guard (the release-hardening
// increment). `release.yml`'s build job runs it before every gate; in a dry run the step
// reports without blocking, in a real run a finding fails the job and neither publish job,
// both downstream of it, ever starts.
//
// What it refuses — every reason at once, so one dry run names everything left to do:
// a package still `private`; a package still at `0.0.0`; the two packages at different
// versions (they publish in lockstep — the adapter's peer range is rewritten to record's
// version at pack time); a dispatch from anything but a tag; a tag whose name is not
// `v<version>`. The ref comes from the runner through the environment (`REF_TYPE`,
// `REF_NAME`, set from `github.ref_type` / `github.ref_name` in the workflow) — never
// interpolated into a script.
//
// The bound, in the same breath: it checks what the repository and the dispatch can show. It
// knows nothing about the registry it is about to write to (whether the version already
// exists, whether the token is live); the release checklist's pre-flight covers those. Clean =
// one `guard: ok` line and exit 0; findings go to stderr, one per line, and exit 1.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Every reason to refuse the publish; an empty array means the guard passes.
 * @param {{ packages: { name: string, version: string, private?: boolean }[],
 *           refType: string | undefined, refName: string | undefined }} input
 * @returns {string[]}
 */
export function guardFindings({ packages, refType, refName }) {
  const findings = [];
  for (const p of packages) {
    if (p.private) findings.push(`${p.name}: private is still true`);
    if (p.version === '0.0.0') findings.push(`${p.name}: version is still 0.0.0`);
  }
  const versions = new Set(packages.map((p) => p.version));
  if (versions.size > 1) {
    const listed = packages.map((p) => `${p.name} ${p.version}`).join(', ');
    findings.push(`the packages are not in lockstep: ${listed}`);
  }
  const expected = `v${packages[0]?.version ?? ''}`;
  if (refType !== 'tag') {
    const kind = refType === undefined || refType === '' ? 'an unknown ref' : refType;
    findings.push(`dispatched from ${kind} '${refName ?? ''}', not from the tag ${expected}`);
  } else if (refName !== expected) {
    findings.push(`the tag '${refName ?? ''}' does not match the version: expected ${expected}`);
  }
  return findings;
}

function main() {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const packages = ['record', 'store-postgres'].map((dir) =>
    JSON.parse(readFileSync(join(repoRoot, 'packages', dir, 'package.json'), 'utf8')),
  );
  const findings = guardFindings({
    packages,
    refType: process.env.REF_TYPE,
    refName: process.env.REF_NAME,
  });
  if (findings.length > 0) {
    for (const f of findings) console.error(`refusing to publish: ${f}`);
    process.exit(1);
  }
  console.log(`guard: ok — both packages at ${packages[0].version}, dispatched from its tag`);
}

if (process.argv[1]?.endsWith('release-guard.mjs')) {
  main();
}
