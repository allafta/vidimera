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

// The release workflow, since the release-hardening increment: two jobs. The guarantees the
// single-job version pinned keep their truth value — the dry-run input, the guard reporting
// without blocking only in a dry run, nothing published in a dry run, every gate before any
// publish — and are asserted over the new structure; the split's own guarantees follow.
test('release.yml: a boolean dry_run input; the guard reports without blocking in a dry run; the publish job skips in a dry run; every gate precedes any publish', () => {
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
  const publishJob = doc.jobs.publish;
  assert.equal(publishJob.needs, 'build', 'nothing publishes before the build job has passed');
  assert.equal(
    publishJob.if,
    ghExpr("!inputs.dry_run && github.ref_type == 'tag'"),
    'the publish job is skipped in a dry run and for any ref that is not a tag',
  );
  const publish = publishJob.steps.filter(
    (s) => typeof s.name === 'string' && s.name.startsWith('publish '),
  );
  assert.equal(publish.length, 2, 'both packages publish');
  assert.match(publish[0].name, /@vidimera\/record/, 'record publishes first');
  assert.match(publish[1].name, /@vidimera\/store-postgres/, 'the adapter publishes second');
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
  // packed; the publish job needs the build job, so every gate precedes any publish.
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

test('release.yml: only the publish job holds credentials, and it runs no toolchain', () => {
  const doc = load('release.yml');
  assert.deepEqual(doc.permissions, { contents: 'read' }, 'the workflow default is read-only');
  assert.equal(doc.jobs.build.permissions, undefined, 'the build job inherits read-only');
  assert.deepEqual(doc.jobs.publish.permissions, { contents: 'read', 'id-token': 'write' });
  assert.equal(doc.jobs.publish.environment, 'release', 'the publish job runs in its environment');
  const build = JSON.stringify(doc.jobs.build);
  assert.ok(!build.includes('secrets.'), 'the build job reads no secret');
  assert.ok(!build.includes('id-token'), 'the build job cannot mint an OIDC token');
  const pub = doc.jobs.publish.steps;
  const uses = pub.filter((s) => typeof s.uses === 'string').map((s) => s.uses.split('@')[0]);
  assert.deepEqual(uses, ['actions/setup-node', 'actions/download-artifact']);
  const setup = pub.find((s) => s.uses?.startsWith('actions/setup-node@'));
  assert.equal(setup.with.cache, undefined, 'no dependency cache in the publish job');
  for (const step of pub.filter((s) => typeof s.run === 'string')) {
    assert.match(step.run.trim(), /^npm publish release-tarballs\/vidimera-[a-z-]+-\*\.tgz /);
  }
  const upload = doc.jobs.build.steps.find((s) => s.uses?.startsWith('actions/upload-artifact@'));
  const download = pub.find((s) => s.uses?.startsWith('actions/download-artifact@'));
  assert.equal(upload.with.name, download.with.name, 'publish downloads what build uploaded');
  assert.equal(upload.with['if-no-files-found'], 'error');
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

test('first-use.yml: no run block interpolates a dispatch input — inputs reach scripts through env', () => {
  const doc = load('first-use.yml');
  const marker = ['$', '{{'].join('');
  for (const [jobName, job] of Object.entries(doc.jobs)) {
    for (const step of job.steps) {
      if (typeof step.run !== 'string') continue;
      const exprs = step.run.split(marker).slice(1);
      for (const e of exprs) {
        assert.ok(
          !e.trimStart().startsWith('inputs.'),
          `${jobName}: a run block interpolates an input: ${step.name ?? step.run.slice(0, 40)}`,
        );
      }
    }
  }
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
