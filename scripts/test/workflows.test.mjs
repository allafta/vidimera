// workflows.test.mjs — the workflow-file parse gate. Until 2026-09-03 GitHub's YAML parser
// was the only one that ever read `.github/workflows/*.yml`, and when it rejected the
// release workflow's new dry-run input (a notice line whose plain scalar carried a colon and
// a space) it said so only as a push-event failure of a dispatch-only workflow and a refused
// dispatch, neither naming the line. No YAML parser lived in this tree. This file parses
// every workflow with `yaml` and asserts the few facts the repository's other documents rely
// on.
//
// Bounds — read before treating a green run as coverage: parse and shape only. It knows
// nothing of GitHub's schema: an `if` expression with a typo, a misspelled `runs-on`, a
// wrong input type name, or an action pinned to a bad SHA all pass here and fail on GitHub.
// It asserts the facts named below, not every line.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';
import { parse } from 'yaml';

const dir = fileURLToPath(new URL('../../.github/workflows/', import.meta.url));
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
  .sort();

function load(name) {
  return parse(readFileSync(join(dir, name), 'utf8'));
}

/** The shape every workflow here relies on: a trigger, jobs with steps, each step exactly one of `uses` or a non-empty `run`. */
function assertWorkflowShape(doc, name) {
  assert.ok(doc !== null && typeof doc === 'object', `${name}: parses to a mapping`);
  assert.ok(Object.hasOwn(doc, 'on'), `${name}: declares a trigger`);
  const jobs = doc.jobs;
  assert.ok(
    jobs !== null && typeof jobs === 'object' && Object.keys(jobs).length > 0,
    `${name}: has jobs`,
  );
  for (const [jobName, job] of Object.entries(jobs)) {
    assert.ok(
      Array.isArray(job.steps) && job.steps.length > 0,
      `${name}: job ${jobName} has steps`,
    );
    job.steps.forEach((step, i) => {
      const label = `${name}: job ${jobName}, step ${i + 1}${typeof step?.name === 'string' ? ` (${step.name})` : ''}`;
      assert.ok(step !== null && typeof step === 'object', `${label}: is a mapping`);
      const hasUses = typeof step.uses === 'string' && step.uses.length > 0;
      const hasRun = typeof step.run === 'string' && step.run.trim().length > 0;
      assert.ok(hasUses !== hasRun, `${label}: exactly one of uses / a non-empty run`);
    });
  }
}

const runs = (steps) => steps.map((s) => (typeof s.run === 'string' ? s.run.trim() : null));
/** A GitHub Actions expression, built by concatenation so no source string carries a template placeholder. */
const ghExpr = (inner) => ['$', '{{ ', inner, ' }}'].join('');

test('every workflow file parses, and the three the repository documents are present', () => {
  for (const expected of ['ci.yml', 'first-use.yml', 'release.yml']) {
    assert.ok(files.includes(expected), `${expected} is present`);
  }
  for (const name of files) {
    try {
      load(name);
    } catch (err) {
      assert.fail(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
});

test('every workflow has the shape the repository relies on', () => {
  for (const name of files) assertWorkflowShape(load(name), name);
});

// The release workflow, since the release-hardening increment and the fix wave after its
// review: four jobs. `build` holds no publish credential: it installs, runs the guard and every
// gate, and packs both tarballs. `publish-record`, then `publish-store-postgres` (which needs
// it, so a failure at the adapter re-runs alone), are the only jobs holding `id-token: write`
// and the token, in the `release` environment, and publish exactly those tarballs.
// `publish-dry-run` runs only in a dry run, holds no credential, and runs the same publish
// commands with `--dry-run`. The guarantees the single-job version pinned keep their truth
// value — the dry-run input, the guard reporting without blocking only in a dry run, nothing
// published in a dry run, every gate before any publish — and are asserted over the new
// structure; the split's own guarantees follow.
const REAL_PUBLISH_JOBS = ['publish-record', 'publish-store-postgres'];
const REAL_PUBLISH_IF = ghExpr("!inputs.dry_run && github.ref_type == 'tag'");
/**
 * The real publish commands, exactly. The leading `./` is load-bearing: without it npm parses
 * `release-tarballs/<name>.tgz` as a GitHub `owner/repo` spec, not a file — a regression the
 * increment's review caught before anything ran. The old single job's `./*.tgz` was right.
 */
const REAL_PUBLISH_COMMANDS = {
  'publish-record':
    'npm publish ./release-tarballs/vidimera-record-*.tgz --provenance --access public',
  'publish-store-postgres':
    'npm publish ./release-tarballs/vidimera-store-postgres-*.tgz --provenance --access public',
};
const usesOf = (steps) =>
  steps.filter((s) => typeof s.uses === 'string').map((s) => s.uses.split('@')[0]);
const runStepsOf = (steps) => steps.filter((s) => typeof s.run === 'string');

test('release.yml: exactly four jobs — build, the two real publish jobs, and the dry-run publish', () => {
  const doc = load('release.yml');
  assert.deepEqual(Object.keys(doc.jobs).sort(), [
    'build',
    'publish-dry-run',
    'publish-record',
    'publish-store-postgres',
  ]);
});

// Structure-independent on purpose, so it reads the same against any shape of the file: every
// `npm publish` line, in any job, names its tarball as a `./` path.
test('release.yml: every npm publish names its tarball as a ./ path — without it npm reads release-tarballs/… as a GitHub repository', () => {
  const doc = load('release.yml');
  const publishes = [];
  for (const [jobName, job] of Object.entries(doc.jobs)) {
    for (const step of runStepsOf(job.steps)) {
      for (const line of step.run.split('\n')) {
        if (/\bnpm publish\b/.test(line)) publishes.push([jobName, line.trim()]);
      }
    }
  }
  for (const [jobName, line] of publishes) {
    assert.match(
      line,
      /^npm publish \.\/release-tarballs\/vidimera-[a-z-]+-\*\.tgz /,
      `${jobName}: the tarball argument must start with ./ — ${line}`,
    );
  }
  assert.equal(publishes.length, 4, 'the two real publishes and their two dry runs');
});

test('release.yml: a boolean dry_run input; the guard reports without blocking in a dry run; the real publish jobs skip in a dry run; every gate precedes any publish', () => {
  const doc = load('release.yml');
  const input = doc.on.workflow_dispatch.inputs.dry_run;
  assert.equal(input.type, 'boolean');
  assert.equal(input.default, false);
  const steps = doc.jobs.build.steps;
  const guard = steps.find((s) => typeof s.name === 'string' && s.name.startsWith('guard'));
  assert.ok(guard, 'the pre-release guard step exists');
  assert.equal(
    guard['continue-on-error'],
    ghExpr('inputs.dry_run'),
    'the guard reports without blocking only in a dry run',
  );
  assert.equal(guard.if, undefined, 'the guard runs in both modes');
  for (const jobName of REAL_PUBLISH_JOBS) {
    assert.equal(
      doc.jobs[jobName].if,
      REAL_PUBLISH_IF,
      `${jobName} is skipped in a dry run and for any ref that is not a tag`,
    );
  }
  assert.equal(
    doc.jobs['publish-record'].needs,
    'build',
    'nothing publishes before the build job has passed',
  );
  assert.equal(
    doc.jobs['publish-store-postgres'].needs,
    'publish-record',
    'the adapter publishes only after record has, and a failure there re-runs without record',
  );
  const gates = [
    'pnpm typecheck',
    'pnpm test:ci',
    'node scripts/ci-assert-tests.mjs .vitest-results.json',
    'pnpm build',
    'pnpm smoke',
    'pnpm lint:strict',
    'pnpm contract-scan',
    'pnpm api-sync',
    'pnpm docs-index-sync',
  ];
  // Every gate runs in the build job, in order, after the guard and before the tarballs are
  // packed; every publish job needs the build job, directly or through record's, so every gate
  // precedes any publish.
  const order = runs(steps);
  const guardAt = steps.indexOf(guard);
  const packAt = steps.findIndex((s) => s.name === 'pack both tarballs');
  assert.ok(packAt >= 0, 'the build job packs both tarballs');
  let last = guardAt;
  for (const gate of gates) {
    const at = order.indexOf(gate);
    assert.ok(at > last, `${gate} runs, after the guard and the previous gate`);
    assert.ok(at < packAt, `${gate} runs before the tarballs are packed`);
    last = at;
  }
});

test('release.yml: only the two real publish jobs hold credentials, in the release environment, and they run no toolchain', () => {
  const doc = load('release.yml');
  assert.deepEqual(doc.permissions, { contents: 'read' }, 'the workflow default is read-only');
  for (const [jobName, job] of Object.entries(doc.jobs)) {
    if (REAL_PUBLISH_JOBS.includes(jobName)) continue;
    assert.equal(job.permissions, undefined, `${jobName} inherits the read-only default`);
    assert.equal(job.environment, undefined, `${jobName} runs outside the release environment`);
    const text = JSON.stringify(job);
    assert.ok(!text.includes('secrets.'), `${jobName} reads no secret`);
    assert.ok(!text.includes('id-token'), `${jobName} cannot mint an OIDC token`);
  }
  for (const jobName of REAL_PUBLISH_JOBS) {
    const job = doc.jobs[jobName];
    assert.deepEqual(job.permissions, { contents: 'read', 'id-token': 'write' }, jobName);
    assert.equal(job.environment, 'release', `${jobName} runs in the release environment`);
    assert.deepEqual(
      usesOf(job.steps),
      ['actions/setup-node', 'actions/download-artifact'],
      `${jobName}: no checkout, no install`,
    );
    const setup = job.steps.find((s) => s.uses?.startsWith('actions/setup-node@'));
    assert.equal(setup.with.cache, undefined, `${jobName}: no dependency cache`);
    assert.equal(setup.with['registry-url'], 'https://registry.npmjs.org', jobName);
    const run = runStepsOf(job.steps);
    assert.deepEqual(
      run.map((s) => s.run.trim()),
      [REAL_PUBLISH_COMMANDS[jobName]],
      `${jobName}: exactly one publish, of exactly this ./ tarball path`,
    );
    assert.deepEqual(run[0].env, { NODE_AUTH_TOKEN: ghExpr('secrets.NPM_TOKEN') }, jobName);
  }
});

test('release.yml: the dry-run job runs the real publish commands under --dry-run, with no credential and no environment', () => {
  const doc = load('release.yml');
  const dry = doc.jobs['publish-dry-run'];
  assert.equal(dry.needs, 'build', 'it publishes-in-dry-run what the build job packed');
  assert.equal(dry.if, ghExpr('inputs.dry_run'), 'it runs only in a dry run');
  assert.equal(dry.environment, undefined, 'never the release environment');
  assert.equal(dry.permissions, undefined, 'the read-only default — no id-token');
  assert.ok(!JSON.stringify(dry).includes('secrets.'), 'no secret anywhere in the job');
  assert.deepEqual(usesOf(dry.steps), ['actions/setup-node', 'actions/download-artifact']);
  const setup = dry.steps.find((s) => s.uses?.startsWith('actions/setup-node@'));
  assert.equal(
    setup.with['registry-url'],
    undefined,
    'no registry-url, so setup-node writes no auth line',
  );
  assert.equal(setup.with.cache, undefined, 'no dependency cache');
  // Derived from the real jobs' own commands, record first, so the two cannot drift apart.
  const expected = REAL_PUBLISH_JOBS.map((jobName) => {
    const real = runStepsOf(doc.jobs[jobName].steps)[0].run.trim();
    assert.ok(real.includes(' --provenance'), `${jobName} publishes with provenance`);
    return `${real.replace(' --provenance', '')} --dry-run`;
  });
  assert.deepEqual(
    runStepsOf(dry.steps).map((s) => s.run.trim()),
    expected,
    'the real publish commands, record first, without --provenance and with --dry-run',
  );
});

test('release.yml: the build job uploads the tarballs with if-no-files-found: error, and every downloading job fetches that artifact', () => {
  const doc = load('release.yml');
  const upload = doc.jobs.build.steps.find((s) => s.uses?.startsWith('actions/upload-artifact@'));
  assert.ok(upload, 'the build job uploads the packed tarballs');
  assert.equal(upload.with['if-no-files-found'], 'error');
  const downloaders = Object.entries(doc.jobs).filter(([, job]) =>
    job.steps.some((s) => s.uses?.startsWith('actions/download-artifact@')),
  );
  assert.deepEqual(downloaders.map(([jobName]) => jobName).sort(), [
    'publish-dry-run',
    'publish-record',
    'publish-store-postgres',
  ]);
  for (const [jobName, job] of downloaders) {
    const download = job.steps.find((s) => s.uses?.startsWith('actions/download-artifact@'));
    assert.equal(download.with.name, upload.with.name, `${jobName} downloads what build uploaded`);
    assert.equal(
      download.with.path,
      'release-tarballs',
      `${jobName} downloads into the directory its publish command names`,
    );
  }
});

test('release.yml: the guard runs the guard script with the ref through the environment', () => {
  const doc = load('release.yml');
  const guard = doc.jobs.build.steps.find((s) => s.name?.startsWith('guard'));
  assert.equal(guard.run.trim(), 'node scripts/release-guard.mjs');
  assert.deepEqual(guard.env, {
    REF_TYPE: ghExpr('github.ref_type'),
    REF_NAME: ghExpr('github.ref_name'),
  });
});

/**
 * Every expression in a run block that opens on a dispatch input, in either spelling —
 * `inputs.` or `github.event.inputs.`. Bounds: an input reached inside a function call
 * (`format('{0}', inputs.x)`) is not seen.
 */
function inputInterpolations(run) {
  const marker = ['$', '{{'].join('');
  return run
    .split(marker)
    .slice(1)
    .map((e) => e.trimStart())
    .filter((e) => e.startsWith('inputs.') || e.startsWith('github.event.inputs.'));
}

test('first-use.yml: no run block interpolates a dispatch input — inputs reach scripts through env', () => {
  const doc = load('first-use.yml');
  for (const [jobName, job] of Object.entries(doc.jobs)) {
    for (const step of runStepsOf(job.steps)) {
      assert.deepEqual(
        inputInterpolations(step.run),
        [],
        `${jobName}: a run block interpolates an input: ${step.name ?? step.run.slice(0, 40)}`,
      );
    }
  }
});

test('the interpolation check sees both spellings of a dispatch input, and nothing else', () => {
  assert.equal(inputInterpolations(`echo ${ghExpr('inputs.version')}`).length, 1);
  assert.equal(inputInterpolations(`echo ${ghExpr('github.event.inputs.version')}`).length, 1);
  assert.equal(inputInterpolations(['echo $', '{{inputs.version}}'].join('')).length, 1);
  assert.equal(inputInterpolations(`echo ${ghExpr('matrix.node')} "$VERSION"`).length, 0);
});

test('ci.yml: the four-leg matrix keeps the exact floor, and test:ci is followed by the report gate', () => {
  const doc = load('ci.yml');
  const legs = doc.jobs.test.strategy.matrix.include;
  assert.equal(legs.length, 4);
  assert.ok(
    legs.some((l) => l.os === 'ubuntu-latest' && String(l.node) === '22.16.0'),
    'the declared engines floor is exercised exactly — a floor declared but never exercised is a claim with no gate',
  );
  assert.deepEqual(
    new Set(legs.map((l) => l.os)),
    new Set(['ubuntu-latest', 'windows-latest', 'macos-latest']),
  );
  const order = runs(doc.jobs.test.steps);
  const at = order.indexOf('pnpm test:ci');
  assert.ok(at >= 0, 'the test job runs test:ci');
  assert.equal(
    order[at + 1],
    'node scripts/ci-assert-tests.mjs .vitest-results.json',
    'the report gate is the very next step',
  );
  const checks = runs(doc.jobs.checks.steps);
  for (const gate of [
    'pnpm typecheck',
    'pnpm lint',
    'pnpm contract-scan',
    'pnpm api-sync',
    'pnpm docs-index-sync',
    'pnpm lint:strict',
  ]) {
    assert.ok(checks.includes(gate), `checks runs ${gate}`);
  }
});

test('the parser refuses the defect GitHub refused on 2026-09-03: a plain scalar carrying a colon-space', () => {
  assert.throws(() => parse('steps:\n  - run: echo "dry run: the tree may still be private"\n'));
  assert.doesNotThrow(
    () => parse('steps:\n  - run: |\n      echo "dry run: the tree may still be private"\n'),
    'the block-scalar form parses',
  );
});

test('the shape check refuses a job without steps, and a step with neither or both of uses / run', () => {
  assert.throws(() => assertWorkflowShape({ on: {}, jobs: { a: {} } }, 'fixture'), /has steps/);
  assert.throws(
    () => assertWorkflowShape({ on: {}, jobs: { a: { steps: [{ name: 'x' }] } } }, 'fixture'),
    /exactly one of/,
  );
  assert.throws(
    () =>
      assertWorkflowShape(
        { on: {}, jobs: { a: { steps: [{ uses: 'x@y', run: 'z' }] } } },
        'fixture',
      ),
    /exactly one of/,
  );
  assert.throws(
    () => assertWorkflowShape({ on: {}, jobs: { a: { steps: [{ run: '   ' }] } } }, 'fixture'),
    /exactly one of/,
  );
  assert.throws(
    () => assertWorkflowShape({ jobs: { a: { steps: [{ run: 'x' }] } } }, 'fixture'),
    /declares a trigger/,
  );
  assert.doesNotThrow(() =>
    assertWorkflowShape(
      { on: {}, jobs: { a: { steps: [{ uses: 'x@y' }, { run: 'z' }] } } },
      'fixture',
    ),
  );
});
