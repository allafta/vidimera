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

test('release.yml: a boolean dry_run input; the guard reports without blocking in a dry run; both publish steps skip; every gate precedes them', () => {
  const doc = load('release.yml');
  const input = doc.on.workflow_dispatch.inputs.dry_run;
  assert.equal(input.type, 'boolean');
  assert.equal(input.default, false);
  const steps = doc.jobs.publish.steps;
  const guard = steps.find((s) => typeof s.name === 'string' && s.name.startsWith('guard'));
  assert.ok(guard, 'the pre-release guard step exists');
  assert.equal(
    guard['continue-on-error'],
    ghExpr('inputs.dry_run'),
    'the guard reports without blocking only in a dry run',
  );
  assert.equal(guard.if, undefined, 'the guard runs in both modes');
  const publish = steps.filter((s) => typeof s.name === 'string' && s.name.startsWith('publish '));
  assert.equal(publish.length, 2, 'both packages publish');
  for (const step of publish)
    assert.equal(step.if, ghExpr('!inputs.dry_run'), `${step.name}: skipped in a dry run`);
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
  const order = runs(steps);
  const firstPublish = steps.indexOf(publish[0]);
  let last = -1;
  for (const gate of gates) {
    const at = order.indexOf(gate);
    assert.ok(at > last, `${gate} runs, after the previous gate`);
    assert.ok(at < firstPublish, `${gate} runs before the first publish step`);
    last = at;
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
