// @vidimera/record — chain-binding-census.test.ts: the chain-binding claim, asserted rather
// than stated. Every chain load is bound to the recordId it was requested for, and every
// transition the library builds is addressed by the caller's id, never by one read off a
// loaded chain. A source-text scan of packages/record/src that fails when a future change
// adds an unbound load, an unlisted `.readChain(` site, or a chain-derived address.
//
// It proves NAMING, not behavior: it counts call sites and reads literals, and cannot tell
// whether a listed site's binding still behaves. Comment lines (trimmed text starting with
// `//`, `*` or `/*`) are skipped, so prose mentioning a call is not a call. The behavioral
// pins live in the replay and seam tests; this is the tripwire for a site that appears.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

/** Every `*.ts` under `dir`, recursively, as absolute paths. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

const FILES = sourceFiles(SRC).map((abs) => ({
  rel: relative(SRC, abs).split('\\').join('/'),
  text: readFileSync(abs, 'utf8'),
}));

/** The source with comment lines blanked (line count preserved). */
function code(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const t = line.trim();
      return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') ? '' : line;
    })
    .join('\n');
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** The inner text of every call to `name(`, up to its balanced closing parenthesis. */
function callTexts(src: string, name: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`(?<![\\w])${name}\\(`, 'g');
  for (let m = re.exec(src); m !== null; m = re.exec(src)) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')' && --depth === 0) {
        out.push(src.slice(open + 1, i));
        break;
      }
    }
  }
  return out;
}

/**
 * A parameter list, not an argument list: its first parameter opens `identifier :` or
 * `identifier?:` (an interface method). An argument that merely holds a `:` — a ternary —
 * does not open that way, so it stays a call.
 */
function isDeclaration(inner: string): boolean {
  return /^\s*[A-Za-z_$][\w$]*\s*\??\s*:/.test(inner);
}

/** Top-level argument count of a call's inner text (nesting-aware, trailing comma tolerated). */
function argCount(inner: string): number {
  let depth = 0;
  let args = 0;
  let seen = false;
  for (const ch of inner) {
    if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    if (depth === 0 && ch === ',') {
      if (seen) args++;
      seen = false;
    } else if (!/\s/.test(ch)) seen = true;
  }
  return seen ? args + 1 : args;
}

/** The top-level arguments of a call's inner text, trimmed (nesting-aware). */
function topArgs(inner: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of inner) {
    if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    if (depth === 0 && ch === ',') {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim() !== '') out.push(cur.trim());
  return out;
}

/** Top-level text of each `{...}` literal holding a `prevHash:` key (nested braces blanked). */
function prevHashLiterals(src: string): string[] {
  const out: string[] = [];
  const re = /\bprevHash\s*:/g;
  for (let m = re.exec(src); m !== null; m = re.exec(src)) {
    let depth = 0;
    let start = -1;
    for (let i = m.index - 1; i >= 0; i--) {
      if (src[i] === '}') depth++;
      else if (src[i] === '{') {
        if (depth === 0) {
          start = i;
          break;
        }
        depth--;
      }
    }
    assert.notEqual(start, -1, 'prevHash: outside any object literal');
    let end = -1;
    depth = 0;
    for (let i = start; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}' && --depth === 0) {
        end = i;
        break;
      }
    }
    let top = '';
    depth = 0;
    for (const ch of src.slice(start, end + 1)) {
      if (ch === '{') {
        depth++;
        top += depth === 1 ? ch : ' ';
      } else if (ch === '}') {
        top += depth === 1 ? ch : ' ';
        depth--;
      } else top += depth === 1 ? ch : ' ';
    }
    out.push(top);
  }
  return out;
}

test('chain binding: no source reads last.recordId', () => {
  const hits = FILES.filter((f) => f.text.includes('last.recordId')).map((f) => f.rel);
  assert.deepEqual(hits, [], 'a transition address was read off a loaded chain');
});

test('chain binding: every transition the library builds takes its recordId from a parameter', () => {
  const bad: string[] = [];
  let literals = 0;
  for (const f of FILES.filter((x) => x.rel.startsWith('kernel/'))) {
    for (const lit of prevHashLiterals(code(f.text))) {
      literals++;
      if (/(^|[\s{,])recordId\s*:/.test(lit)) bad.push(`${f.rel}: recordId written as key: value`);
      else if (!/(^|[\s{,])recordId\s*[,}]/.test(lit)) bad.push(`${f.rel}: no shorthand recordId`);
    }
  }
  assert.ok(literals > 0, 'the scan found no prevHash literals — it has gone blind');
  assert.deepEqual(bad, [], 'a built transition takes its recordId from other than a parameter');
});

test('chain binding: every verifyChain call outside chain/replay.ts passes the requested id as its second argument', () => {
  const bad: string[] = [];
  let calls = 0;
  for (const f of FILES.filter((x) => x.rel !== 'chain/replay.ts')) {
    // `verifyChain(?:Core)?`: create.ts imports the core under the alias `verifyChainCore`.
    for (const inner of callTexts(code(f.text), 'verifyChain(?:Core)?')) {
      if (isDeclaration(inner)) continue;
      calls++;
      const args = topArgs(inner);
      // The second argument is the id the chain was loaded for: the seam's own `recordId`
      // parameter, or a ref's `ref.recordId` — never an id read off the loaded chain.
      if (argCount(inner) !== 2 || !['recordId', 'ref.recordId'].includes(args[1] ?? '')) {
        bad.push(`${f.rel}: verifyChain(${inner.trim()})`);
      }
    }
  }
  assert.ok(calls > 0, 'the scan found no verifyChain calls — it has gone blind');
  assert.deepEqual(bad, [], 'a verifyChain call is missing the requested id');
});

/** `.readChain(` call sites per file, and the `assertChainFor(` calls the identity files owe. */
const READ_CHAIN: Record<string, { reads: number; asserts?: number }> = {
  // getRecord, replay: identity; verifyChain: verify; readChain: raw by contract
  'create.ts': { reads: 4, asserts: 2 },
  // recordSigns: ruling 5.6; the readChain pass-through: raw
  'signing/decorate.ts': { reads: 2 },
  // the probe's tampering wrapper: pass-through
  'probes/probes.ts': { reads: 1 },
  // load: verify; seqConflict: identity
  'kernel/finalize.ts': { reads: 2, asserts: 1 },
  // prologue: verify; residualRefusal: identity
  'kernel/redeem.ts': { reads: 2, asserts: 1 },
  // lostResolutionRefusal's re-read after a lost clock CAS: identity
  'kernel/expiry.ts': { reads: 1, asserts: 1 },
  // verify
  'kernel/decline.ts': { reads: 1 },
  'kernel/findings-seams.ts': { reads: 1 },
  'kernel/seal.ts': { reads: 1 },
  'kernel/prior-legs.ts': { reads: 1 },
  'kernel/supersedes.ts': { reads: 1 },
  // identity
  'kernel/review.ts': { reads: 1, asserts: 1 },
  'kernel/open.ts': { reads: 1, asserts: 1 },
  'kernel/verify-signatures.ts': { reads: 1, asserts: 1 },
};

test('chain binding: every readChain call site is listed with its binding', () => {
  const actualReads: Record<string, number> = {};
  const actualAsserts: Record<string, number> = {};
  for (const f of FILES) {
    const c = code(f.text);
    const reads = count(c, '.readChain(');
    if (reads > 0) actualReads[f.rel] = reads;
    // The definition lives in chain/binding.ts; calls elsewhere are what the files owe.
    if (f.rel !== 'chain/binding.ts') {
      const asserts = callTexts(c, 'assertChainFor').length;
      if (asserts > 0) actualAsserts[f.rel] = asserts;
    }
  }
  const expectedReads: Record<string, number> = {};
  const expectedAsserts: Record<string, number> = {};
  for (const [file, row] of Object.entries(READ_CHAIN)) {
    expectedReads[file] = row.reads;
    if (row.asserts !== undefined) expectedAsserts[file] = row.asserts;
  }
  assert.deepEqual(actualReads, expectedReads, 'a .readChain( call site appeared or vanished');
  assert.deepEqual(actualAsserts, expectedAsserts, 'an assertChainFor( call appeared or vanished');
});

test('chain binding: layerVerdicts lists the sidecar by the requested id', () => {
  const file = FILES.find((f) => f.rel === 'kernel/verify-signatures.ts');
  assert.ok(file, 'kernel/verify-signatures.ts is missing');
  const c = code(file.text);
  const found = callTexts(c, 'listByRecord').map((a) => a.trim());
  assert.deepEqual(found, ['recordId'], 'listByRecord must take layerVerdicts own recordId');
  assert.ok(
    !/genesis\??\.recordId/.test(c),
    'a genesis-derived recordId feeds the sidecar listing',
  );
});
