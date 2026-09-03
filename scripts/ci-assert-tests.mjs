#!/usr/bin/env node
// The CI test-gate assertion: reads the JSON report vitest wrote (`--reporter=json
// --outputFile=<path>`) and exits non-zero unless the run succeeded with zero failed
// tests, zero failed files, zero skipped or todo tests (the zero-skips discipline), and at
// least one test. Prints one summary line either way.
//
// Why this exists: the workflow's `pnpm test` step had been concluding success while vitest
// reported failed tests — on every matrix leg, not just Windows (a canary run with one
// always-failing test proved it: 33705059031, 2026-09-03). This gate reads the report
// itself instead of trusting a process exit code that has to survive vitest, pnpm and the
// runner's shell wrapper in turn.
//
// Bounds — read before treating a green run as coverage: this checks the report's own
// counters only. It cannot tell whether the report describes the tree under test, whether
// the right files were included, or whether vitest's counters are themselves correct; a
// report from a stale or partial run passes if its counters are clean. The report path is
// written by the same step that runs the suite, immediately before this script runs. The
// report's "suites" count every `describe` block as well as every file, so the file count
// printed here is the length of its per-file `testResults` list, not `numTotalTestSuites`.
import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (path === undefined) {
  console.error('usage: node scripts/ci-assert-tests.mjs <vitest-json-report>');
  process.exit(2);
}

let report;
try {
  report = JSON.parse(readFileSync(path, 'utf8'));
} catch (err) {
  console.error(`ci-assert-tests: FAIL — cannot read the report at ${path}: ${String(err)}`);
  process.exit(1);
}

function count(key) {
  const value = report[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    console.error(`ci-assert-tests: FAIL — the report lacks a numeric ${key}`);
    process.exit(1);
  }
  return value;
}

const total = count('numTotalTests');
const passed = count('numPassedTests');
const failed = count('numFailedTests');
const skipped = count('numPendingTests');
const todo = count('numTodoTests');
const suites = count('numTotalTestSuites');
const files = Array.isArray(report.testResults) ? report.testResults.length : -1;
const failedFiles = count('numFailedTestSuites');
const skippedFiles = count('numPendingTestSuites');

const problems = [];
if (report.success !== true) problems.push(`success=${String(report.success)}`);
if (failed !== 0) problems.push(`${failed} failed test(s)`);
if (failedFiles !== 0) problems.push(`${failedFiles} failed file(s)`);
if (skipped !== 0) problems.push(`${skipped} skipped test(s)`);
if (todo !== 0) problems.push(`${todo} todo test(s)`);
if (skippedFiles !== 0) problems.push(`${skippedFiles} skipped file(s)`);
if (total < 1) problems.push('zero tests ran');
if (files < 1) problems.push('the report lists no test files');

const summary = `${total} tests in ${files} files (${suites} suites): ${passed} passed, ${failed} failed, ${skipped} skipped, ${todo} todo`;
if (problems.length > 0) {
  console.error(`ci-assert-tests: FAIL — ${problems.join('; ')} (${summary})`);
  process.exit(1);
}
console.log(`ci-assert-tests: ok — ${summary}`);
