# First-Use Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Discharge the release checklist's clean-machine precondition by construction — a dispatch-only workflow whose consumer job has no checkout, installs only the packed artifacts, and drives the getting-started flow to a verified chain over both stores — and pin the `node:sqlite` warning story both ways so the two public sentences that describe it become measured claims.

**Architecture:** Task 1 writes the consumer script and dry-runs it locally against freshly packed tarballs (the record half; the Postgres half skips with a notice when no server is given). Task 2 writes the two-job workflow — `pack` uploads one artifact, `first-use` downloads it on a runner that never checked out — and names it in `CLAUDE.md`. Task 3 dispatches one run, reads both legs' results and stderr measurements, writes the analysis record, and only then corrects the two public sentences the measurement licenses. Task 4 writes the increment section, indexes the pair, and exits.

**Tech Stack:** GitHub Actions (SHA-pinned actions), Node 22.16.0 and 24 (LTS), npm + pnpm pack, a PostgreSQL 18 service container, plain ESM `.mjs`. No new dependencies anywhere.

**Spec:** `docs/superpowers/specs/2026-08-29-first-use-proof-design.md`

## Global Constraints

- **NO SANCTION IS NEEDED AND NONE IS SOUGHT.** No task edits `docs/concept/`. No maturity marker moves.
- **NO `packages/*/src/` FILE IS TOUCHED. NO `packages/*/test/` FILE IS TOUCHED.** The vitest totals (67 files / 821 tests today — measure, do not copy) must be identical at every commit. **If you find yourself editing a `.ts` file, STOP.**
- **`.github/workflows/ci.yml`, `.github/workflows/release.yml`, `scripts/smoke-pack.mjs` and `docs/process/release-checklist.md` are NOT touched.** The checklist, the stale `v0.1.0` tag, the pickup instructions and rows 19/22 belong to the next increment. Any edit to those four files is a STOP.
- **THE FLOOR STAYS `>=22.16`.** No `engines` field, no CI floor leg, no README floor sentence moves. Spec ruling 3.
- **REPORTING THE MEASUREMENT, NOT PREDICTING IT.** The two public sentences (Task 3 Step 5) are written AFTER the run and say what the run showed. If the 24 leg shows the warning PRESENT, the story is wrong: STOP, record the observed Node patch in the analysis record, and do not rewrite the sentences.
- **Every action is pinned by full SHA with its version in a trailing comment**, as `ci.yml` does. The two actions new to this repository, resolved 2026-08-29 from their release tags: `actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1` and `actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1`. A tag-pinned action is a STOP.
- **The `first-use` job has NO `actions/checkout` step.** That absence is the whole proof. If any step needs a file from the repository, put it in the artifact in the `pack` job.
- **The warning pin is bare.** The import runs under `node -e` with no `NODE_OPTIONS`, no `--disable-warning`, no vitest. The captured stderr is echoed to the log before the assertion.
- **The standalone contract binds the new `.mjs` and `.yml` by hand** — `scripts/contract-scan.mjs` scans `*.md`/`*.ts` only. No external URL in any comment; `owner/action@sha` references are not URLs. New markdown is scanned as usual.
- **Markdown is citation-checked by nothing.** Hand-verify every quoted phrase against a whitespace-collapsed copy of its source (`tr -s ' \n' ' ' < file | grep -oF -- "phrase" | wc -l`).
- **`docs-index-sync`'s counted sentences are phrasing-locked** (``N files in `specs/`, M in `plans/` `` and ``**`docs/analysis/`** holds N files``). Numbers are measured with `git ls-files` after `git add`, never incremented by hand; spec, plan, record, INDEX row and counts land in ONE commit (Task 4).
- **Biome formats the new script.** `./node_modules/.bin/biome check --write scripts/first-use.mjs` before committing; the Biome file count will rise by one (measure it).
- **ONE OUTWARD-FACING ACTION, and it needs the owner's explicit yes.** Dispatching the workflow requires the workflow file on a remote ref — Task 3 pushes the feature branch (`git push -u origin <branch>`) and dispatches with `gh workflow run first-use.yml --ref <branch>`. `CLAUDE.md` forbids pushing without instruction; the controller obtains that instruction before Task 3 Step 1 and records it. Never push `main` in this increment.
- **Gates at every commit — never call `pnpm`** (the global shim is broken on this machine): `./node_modules/.bin/vitest run`, `./node_modules/.bin/tsc --noEmit -p packages/record` AND `-p packages/store-postgres`, `./node_modules/.bin/biome check --error-on-warnings .`, `node scripts/contract-scan.mjs` exit 0, `node scripts/api-reference-sync.mjs` exit 0, `node scripts/docs-index-sync.mjs` exit 0.
- Commit messages via `git commit -F <msgfile>` where the message file is written with the **Write tool**. Verify the branch is attached before each commit.
- Commit subjects follow the increment convention: `First-use proof N/4: <what landed>`.

---

### Task 1: The consumer script, dry-run against freshly packed tarballs

**Files:**
- Create: `scripts/first-use.mjs`

**Interfaces:**
- Consumes: nothing from the repository at run time — it runs inside a scratch project against installed `@vidimera/record` and `@vidimera/store-postgres`. Environment: `VIDIMERA_PG_URL` (optional; a PostgreSQL connection string — absent skips the Postgres half with a printed notice), `FIRST_USE_SOURCE` (`tarball` or `registry`, informational, printed in the summary).
- Produces: the script Task 2's workflow ships in its artifact and runs. Exit code 0 with one `first-use: OK …` line; non-zero with the failing assertion otherwise.

- [ ] **Step 1: Verify the premise and record the baselines.**

```bash
git status --short --branch
ls scripts/
./node_modules/.bin/vitest run 2>&1 | grep -E "Test Files|Tests "
./node_modules/.bin/biome check --error-on-warnings . 2>&1 | tail -1
node --version
```
Expected: a clean tree on the feature branch; no `first-use.mjs` yet; the vitest totals and the Biome file count — **write both down**; the local Node version (24.12.0 on this machine — below 24.15, so a local import WILL warn; that is expected and is not the pin).

- [ ] **Step 2: Write the script.**

Create `scripts/first-use.mjs`:

```js
// first-use.mjs — the clean-runner first-use proof (the first-use-proof increment; the
// release checklist's first precondition). This file is CONSUMER code: it is shipped inside
// the workflow artifact and run in a scratch project that installed `@vidimera/record` and
// `@vidimera/store-postgres` from tarballs or from the registry, on a runner that never
// checked this repository out. Everything it imports resolves through the packages' exports
// maps or fails. It is the getting-started flow in substance — stage → open → review →
// finalize → confirmed, the offline and handle-form audit reads, the refused half, the
// ./probes subpath — and the same confirm loop over a real PostgreSQL server the consumer
// owns. What it does NOT prove: that the guide's prose reads right (a human's judgment), or
// anything about the probe tier's verdicts (running probes needs a host-declared driver).
//
// Exit 0 with one summary line on success; the first failed assertion exits non-zero.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MemoryStore, create, replay, verifyChain } from '@vidimera/record';
import { ALL_PROBES, assertSatisfied, runProbes } from '@vidimera/record/probes';
import { PostgresStore } from '@vidimera/store-postgres';
import pg from 'pg';

const source = process.env.FIRST_USE_SOURCE ?? 'unknown';

const profile = {
  id: 'finance.invoice-approval.v1',
  subject: { canonicalizerRef: 'finance.invoice.v1' },
  legs: [{ id: 'approver-decide', allowedAuthorities: ['session:ap-console'] }],
  captureMode: 'staged',
  expiry: { ttl: 3600 },
};
const canonicalizers = { 'finance.invoice.v1': (content) => content };
const content = { invoiceId: 'INV-1042', payee: 'Acme AB', amount: 41250, currency: 'SEK' };
const alice = { principal: 'user:alice', authority: 'session:ap-console' };
const facts = {
  figures: { amountShown: '41 250,00', currencyShown: 'SEK' },
  checker: { principal: 'svc:review-surface', authority: 'mtls:review-surface' },
};

/** The getting-started flow, in substance, over whichever store is handed in. */
async function confirmLoop(store, subjectRef) {
  const { agent, operator } = create({ profiles: [profile], store, canonicalizers });
  const staged = await agent.stage(content, profile.id, subjectRef);
  assert.equal(staged.status, 'ok', 'stage');
  const opened = await operator.open(staged.value.stagedRef);
  assert.equal(opened.status, 'ok', 'open');
  const recordId = opened.value.recordId;
  const view = await operator.review(recordId);
  assert.equal(view.status, 'ok', 'review');
  assert.equal(view.value.state, 'open');
  const decided = await operator.finalize(recordId, alice, content, facts);
  assert.equal(decided.status, 'ok', 'finalize');
  assert.equal(decided.value.state, 'confirmed');

  const chain = await operator.readChain(recordId);
  assert.equal(verifyChain(chain).intact, true, 'offline verifyChain');
  assert.equal(replay(chain).state, 'confirmed', 'offline replay');
  assert.equal((await operator.verifyChain(recordId)).intact, true, 'handle verifyChain');
  assert.deepEqual(
    chain.map((t) => t.kind),
    ['opened', 'consultation-recorded', 'consultation-recorded', 'confirmed'],
    'the four transitions the guide shows',
  );
  return { operator, recordId, chain };
}

// --- the record half: MemoryStore -------------------------------------------------------
const memory = await confirmLoop(new MemoryStore(), 'invoice:INV-1042');

// The refused half: a wrong-authority identity is RETURNED as a refusal, never thrown.
{
  const { agent, operator } = create({
    profiles: [profile],
    store: new MemoryStore(),
    canonicalizers,
  });
  const staged = await agent.stage(content, profile.id, 'invoice:INV-1043');
  const opened = await operator.open(staged.value.stagedRef);
  assert.equal(opened.status, 'ok');
  const refused = await operator.finalize(
    opened.value.recordId,
    { principal: 'user:mallory', authority: 'session:someone-else' },
    content,
    facts,
  );
  assert.equal(refused.status, 'refused', 'a wrong authority refuses');
  assert.equal(refused.code, 'identity-authority-refused');
  assert.equal(refused.class, 'refusal');
}

// The ./probes subpath: the tier is reachable; running it needs a host driver (not here).
assert.ok(ALL_PROBES.length > 0, 'the ./probes subpath resolves and carries probes');
assert.equal(typeof runProbes, 'function');
assert.equal(typeof assertSatisfied, 'function');

// --- the adapter: peer range, then a REAL confirm loop when a server is given ----------
const adapterManifest = JSON.parse(
  readFileSync('./node_modules/@vidimera/store-postgres/package.json', 'utf8'),
);
const peerRange = adapterManifest.peerDependencies['@vidimera/record'];
assert.ok(
  !peerRange.startsWith('workspace:'),
  `adapter peer range must be a concrete range, got: ${peerRange}`,
);

let postgresNote = 'postgres half SKIPPED (no VIDIMERA_PG_URL)';
if (process.env.VIDIMERA_PG_URL) {
  const pool = new pg.Pool({ connectionString: process.env.VIDIMERA_PG_URL });
  try {
    const store = new PostgresStore(pool, { schema: 'first_use' });
    const pgRun = await confirmLoop(store, 'invoice:INV-2042');
    postgresNote = `postgres half OK (${pgRun.chain.length} transitions, confirmed + intact)`;
  } finally {
    await pool.end();
  }
} else {
  console.error('first-use: NOTE — VIDIMERA_PG_URL not set; the PostgreSQL half did not run');
}

console.log(
  `first-use: OK - source=${source}; memory: ${memory.chain.length} transitions, confirmed + intact; ` +
    `${ALL_PROBES.length} probes visible through ./probes; adapter peer range ${peerRange}; ${postgresNote}`,
);
```

Then: `./node_modules/.bin/biome check --write scripts/first-use.mjs` and re-read the diff. The `ttl: 3600`, the four-kind chain shape, `identity-authority-refused` and the review view's `state === 'open'` all come from `docs/guide/getting-started.md`'s two tests, which pass against this tree verbatim — the script is that flow, not a variation of it.

- [ ] **Step 3: Dry-run it locally against freshly packed tarballs (record half).**

This is what the workflow's `first-use` job will do, minus the runner and minus Postgres. Do it in a scratch directory OUTSIDE the repository:

```bash
SCRATCH=$(mktemp -d)
./node_modules/.bin/tsc -p packages/record/tsconfig.build.json && ./node_modules/.bin/tsc -p packages/store-postgres/tsconfig.build.json
(cd packages/record && npm pack --pack-destination "$SCRATCH" --loglevel=error)
(cd packages/store-postgres && ./../../node_modules/.bin/pnpm pack --pack-destination "$SCRATCH" 2>/dev/null || pnpm pack --pack-destination "$SCRATCH")
ls "$SCRATCH"
mkdir "$SCRATCH/app" && cd "$SCRATCH/app"
printf '{ "name": "first-use-app", "private": true, "type": "module" }\n' > package.json
npm install "$SCRATCH"/*.tgz --no-audit --no-fund --loglevel=error
cp /c/Users/a/Documents/GitHub/allafta/vidimera/scripts/first-use.mjs .
FIRST_USE_SOURCE=tarball node first-use.mjs; echo "exit=$?"
cd /c/Users/a/Documents/GitHub/allafta/vidimera && rm -rf "$SCRATCH"
```
Expected: `first-use: OK - source=tarball; memory: 4 transitions, confirmed + intact; 17 probes visible …; adapter peer range ^0.0.0 …; postgres half SKIPPED (no VIDIMERA_PG_URL)` and `exit=0`, with the NOTE line on stderr and — on this machine's Node 24.12.0 — the `ExperimentalWarning` on stderr as well (expected: below 24.15). **If `pnpm pack` is unavailable** (the global shim is broken here), use the workspace's own binary: `./node_modules/.bin/pnpm` if present, else `npx --yes pnpm@11.18.0 pack …`; record which you used. If the peer range prints `workspace:^`, the adapter was packed with npm — redo with pnpm.

- [ ] **Step 4: Prove the Postgres half's code path at least once locally.**

The workflow proves it against a real server; locally, make the branch execute by pointing it at a server that does not exist and asserting the failure is the CONNECT, not a bug before it:

```bash
cd "$(mktemp -d)" && printf '{ "type": "module" }\n' > package.json && cp /c/Users/a/Documents/GitHub/allafta/vidimera/scripts/first-use.mjs . && npm install pg@8 --no-audit --no-fund --loglevel=error >/dev/null 2>&1; echo "(this step only checks the script parses and reaches the pool; skip if the record packages are not installed here)"
node --check /c/Users/a/Documents/GitHub/allafta/vidimera/scripts/first-use.mjs && echo "syntax OK"
```
Expected: `syntax OK`. (The real Postgres proof is Task 3's run; do not stand up a server here.)

- [ ] **Step 5: Gates and commit.**

The Global Constraints battery. Expected: vitest totals identical to Step 1; Biome file count = Step 1's + 1; everything else exit 0. `git status --porcelain` shows exactly one added path.

Subject: `First-use proof 1/4: the consumer script — the getting-started flow, shipped as the artifact's own code`

---

### Task 2: The two-job workflow, and its sentence in `CLAUDE.md`

**Files:**
- Create: `.github/workflows/first-use.yml`
- Modify: `CLAUDE.md` (the CI paragraph, one added sentence)

**Interfaces:**
- Consumes: `scripts/first-use.mjs` from Task 1; the two pinned action SHAs from the Global Constraints.
- Produces: a `workflow_dispatch` workflow named `First-use` with inputs `source` and `version`; an artifact `first-use-<run_id>` holding `vidimera-record-*.tgz`, `vidimera-store-postgres-*.tgz` and `first-use.mjs`.

- [ ] **Step 1: Write the workflow.**

Create `.github/workflows/first-use.yml`:

```yaml
# The clean-runner first-use proof (the first-use-proof increment; the release checklist's
# first precondition, "a machine that never held this checkout"). Two jobs. `pack` checks the
# repository out, builds, packs both packages — npm for the record package, pnpm for the
# adapter, because only pnpm rewrites the adapter's `workspace:^` peer range (the release
# workflow's own tarball-first shape) — and uploads ONE artifact: both tarballs plus the
# consumer script. `first-use` has NO checkout step, by design and as the proof: it downloads
# only that artifact, installs the packages into a scratch project, drives the getting-started
# flow to a verified chain over MemoryStore and over a real PostgreSQL service the job owns,
# and then pins the node:sqlite warning story both ways — a bare import must warn on the
# declared floor (22.16.0) and must not on the current LTS line (24, which resolves to a patch
# at or above 24.15 on a current runner image). Dispatch-only: this is a deliberate release
# act, like release.yml, not a per-push gate — `pnpm smoke` stays that. `source: registry`
# reuses the same job against the published packages after the cut.
name: First-use
on:
  workflow_dispatch:
    inputs:
      source:
        description: where the consumer installs from
        type: choice
        options: [tarball, registry]
        default: tarball
      version:
        description: package version to install when source is registry (ignored for tarball)
        type: string
        default: ''
permissions:
  contents: read
jobs:
  pack:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: pnpm/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86 # v6.0.10
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: pack both packages and stage the artifact
        run: |
          mkdir -p first-use-artifact
          (cd packages/record && npm pack --pack-destination ../../first-use-artifact --loglevel=error)
          (cd packages/store-postgres && pnpm pack --pack-destination ../../first-use-artifact)
          cp scripts/first-use.mjs first-use-artifact/
          ls -l first-use-artifact
      - uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: first-use-${{ github.run_id }}
          path: first-use-artifact/
          if-no-files-found: error
          retention-days: 7
  first-use:
    needs: pack
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        include:
          - node: 22.16.0 # the declared engines floor, exactly — the import MUST warn here
            expect_warning: 'true'
          - node: 24 # the current LTS line — resolves to >= 24.15, where the import MUST NOT warn
            expect_warning: 'false'
    services:
      postgres:
        image: postgres:18
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 12
    # NO actions/checkout here. That absence is the proof: nothing below can resolve from the
    # repository, because the repository is not on this runner.
    steps:
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: ${{ matrix.node }}
      - uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
        with:
          name: first-use-${{ github.run_id }}
          path: artifact
      - name: scratch consumer project
        run: |
          mkdir app && cd app
          printf '{ "name": "first-use-app", "private": true, "type": "module" }\n' > package.json
          cp ../artifact/first-use.mjs .
      - name: install the packages (${{ inputs.source }})
        working-directory: app
        run: |
          if [ "${{ inputs.source }}" = "registry" ]; then
            test -n "${{ inputs.version }}" || { echo "source=registry needs a version input"; exit 1; }
            npm install "@vidimera/record@${{ inputs.version }}" "@vidimera/store-postgres@${{ inputs.version }}" --no-audit --no-fund
          else
            ls ../artifact/*.tgz
            npm install ../artifact/*.tgz --no-audit --no-fund
          fi
      - name: first use — the getting-started flow over MemoryStore and PostgreSQL
        working-directory: app
        env:
          FIRST_USE_SOURCE: ${{ inputs.source }}
          VIDIMERA_PG_URL: postgresql://postgres:postgres@127.0.0.1:5432/postgres
        run: node first-use.mjs
      - name: the node:sqlite warning pin — bare import, stderr captured, asserted both ways
        working-directory: app
        run: |
          node --version
          node -e "await import('@vidimera/record'); console.log('imported @vidimera/record')" 2> stderr.txt || { cat stderr.txt; exit 1; }
          echo "--- stderr of a bare import ---"; cat stderr.txt; echo "--- end ---"
          if [ "${{ matrix.expect_warning }}" = "true" ]; then
            grep -q ExperimentalWarning stderr.txt || { echo "expected the node:sqlite ExperimentalWarning on Node ${{ matrix.node }} and saw none"; exit 1; }
          else
            if grep -q ExperimentalWarning stderr.txt; then echo "unexpected ExperimentalWarning on Node $(node --version) — the guide's sentence would be false here"; exit 1; fi
          fi
```

**Every `uses:` line must match the SHA + version comment pairs in the Global Constraints exactly** — copy them; do not retype a SHA.

- [ ] **Step 2: Sanity-check the YAML parses and the constraints hold.**

```bash
node -e "
const fs=require('fs');const y=fs.readFileSync('.github/workflows/first-use.yml','utf8');
const uses=[...y.matchAll(/uses: ([^\s]+)@([0-9a-f]{40}) # (v[0-9.]+)/g)].map(m=>m[1]+'@'+m[3]);
console.log('pinned actions:',uses.join(', '));
const bad=[...y.matchAll(/uses: [^\n]*@(?![0-9a-f]{40})/g)];console.log('non-SHA uses:',bad.length);
console.log('checkout steps in first-use job:',(y.split('first-use:')[1]||'').split('uses: actions/checkout').length-1);
console.log('http refs:',(y.match(/https?:\/\//g)||[]).length);"
```
Expected: five pinned actions listed; `non-SHA uses: 0`; `checkout steps in first-use job: 0`; `http refs: 0`. There is no YAML linter in this repository and no workflow can be run without a remote ref — the run itself (Task 3) is the parse check; a syntax error there is fixed in a follow-up commit within this task's scope.

- [ ] **Step 3: `CLAUDE.md`'s CI paragraph.**

The paragraph beginning `CI (`.github/workflows/ci.yml`) is two-tier on every push` ends with the sentence `… unexercised until the 0.1 cut; `docs/process/release-checklist.md` is release day's authoritative list.` Insert immediately after that sentence, before the `.github/dependabot.yml` sentence, wrapped to the file's width:

```
`.github/workflows/first-use.yml` is the dispatch-only clean-runner first-use proof: a `pack`
job uploads both packed tarballs and `scripts/first-use.mjs` as one artifact, and a
`first-use` job with NO checkout step installs them into a scratch project on the declared
Node floor and on the current LTS line, drives the getting-started flow to a verified chain
over `MemoryStore` and a PostgreSQL service, and pins the `node:sqlite` warning story both
ways (present on 22.16.0, absent on 24.15+); `source: registry` reuses it against the
published packages after the cut. It is a deliberate release act, never a per-push gate —
`pnpm smoke` remains that.
```

- [ ] **Step 4: Gates and commit.**

The Global Constraints battery. `git status --porcelain` shows exactly the new workflow and `CLAUDE.md`.

Subject: `First-use proof 2/4: the two-job workflow — pack uploads one artifact, first-use never checks out`

---

### Task 3: One documented run, then the two sentences the run licenses

**Files:**
- Create: `docs/analysis/2026-08-29-first-use-proof.md`
- Modify: `docs/guide/integrating.md` (the `SqliteStore` bullet's warning sentence)
- Modify: `packages/record/README.md` (the Node/`node:sqlite` sentences at its lines 26–29)

**Interfaces:**
- Consumes: the workflow from Task 2; the owner's explicit instruction to push the feature branch (Global Constraints).
- Produces: the run URL and both legs' stderr measurements, cited by Task 4.

- [ ] **Step 1: Push the branch and dispatch — with the owner's instruction in hand.**

Confirm the instruction is recorded (the controller's ledger or the conversation). Then:

```bash
BR=$(git branch --show-current); echo "$BR"
git push -u origin "$BR"
gh workflow run first-use.yml --ref "$BR" -f source=tarball
sleep 20; gh run list --workflow=first-use.yml --limit 1
```
Expected: the push succeeds; `gh run list` shows one `in_progress` (or `queued`) run on the branch. Note its run id.

- [ ] **Step 2: Wait for the run and read both legs.**

```bash
RUN=<run id>
gh run watch "$RUN" --exit-status; echo "exit=$?"
gh run view "$RUN" --json jobs --jq '.jobs[] | "\(.conclusion)\t\(.name)"'
gh run view "$RUN" --log 2>/dev/null | grep -E "first-use: OK|--- stderr of a bare import|ExperimentalWarning|imported @vidimera/record|^.*node --version|v2[24]\.[0-9]+\.[0-9]+" | cut -c1-200
```
Expected: three jobs — `pack`, `first-use (22.16.0, true)`, `first-use (24, false)` — all `success`; each first-use log carries a `first-use: OK - source=tarball; memory: 4 transitions … postgres half OK (4 transitions …)` line; the 22.16.0 leg's stderr block contains `ExperimentalWarning`, the 24 leg's does not, and the 24 leg's `node --version` prints a patch ≥ 24.15. **Write down: the run URL, both resolved Node versions, both summary lines, and both stderr blocks verbatim.**

If the 24 leg fails on the warning assertion, STOP: record the resolved patch and the stderr in the analysis record as the finding, leave both public sentences unchanged, and report — the story would be false for that image and the sentence must not be written. If `pack` or an install step fails, fix the workflow in a follow-up commit within Task 2's scope, push, and re-dispatch; do not weaken an assertion to get green.

- [ ] **Step 3: Write the analysis record.**

Create `docs/analysis/2026-08-29-first-use-proof.md`, dated, in the shape of `docs/analysis/2026-08-19-phase-6-rehearsal.md` (title; a `**Date: …**` opening that states the bound first; `## What ran`; `## The measurement`; `## Standing after this run`). It must carry: what "machine that never held this checkout" was satisfied by (a GitHub-hosted `ubuntu-latest` runner with no checkout step, per the owner's 2026-08-29 ruling); the run URL; per leg — the resolved Node version, the install source, the `first-use: OK` line verbatim, the chain length over each store, the probe count, the peer range observed, and the stderr block of the bare import verbatim; the conclusion the two blocks license (warning present at 22.16.0, absent at the resolved 24.x); and the bound in the same breath — ubuntu only; tarball source only until the cut; the prose unproven; the `24` leg measured the runner's resolved patch, named. **No external URL** except the run URL, which is this repository's own workflow run on its own remote — write it in backticks as the record's one pointer, and note that the standalone contract's external-link scan will flag it if it is written as a bare link: check `node scripts/contract-scan.mjs` after writing; if the scan flags the run URL, replace it with the run id and the workflow name (`First-use` run `<id>` on `origin`) and say why.

- [ ] **Step 4: Verify the record's claims against the log once more — and leave the record UNTRACKED.**

Re-read the record against the `gh run view --log` output: every quoted line must appear in the log verbatim. Then do NOT `git add` it in this task. `docs-index-sync` reads tracked files only and fails on a tracked analysis file whose count sentence has not moved; the count moves in Task 4 together with the INDEX row and the spec/plan `git add`, in one commit. Task 3's commit therefore carries only the two guide corrections (Step 5), and `git status --porcelain` at Step 6 must show the record as `??`.

- [ ] **Step 5: Correct the two public sentences — only if Step 2's measurement licenses them.**

`docs/guide/integrating.md`, the `SqliteStore` bullet, currently ends `Note Node still flags `node:sqlite` as experimental and prints a warning (this repo's own vitest config suppresses exactly that warning class).` (the sentence wraps across lines 39–41 — locate by whitespace-collapsed content). Replace it with:

```
  On Node below 24.15 (and 25.x below 25.7), importing the package prints Node's
  `ExperimentalWarning` for `node:sqlite` — the entry point re-exports this class, so every
  adopter meets it at import whatever store they choose — and
  `node --disable-warning=ExperimentalWarning` silences it; on 24.15 and later nothing
  prints, since Node marked the module a release candidate there. Measured, not assumed:
  the first-use workflow imports the packed artifact bare on the declared floor and on the
  current LTS line and asserts the warning present on the first and absent on the second
  (`docs/analysis/2026-08-29-first-use-proof.md`).
```

`packages/record/README.md` lines 26–29 currently read (verify by content): `Requires Node 22.16 or newer. Importing the package loads `node:sqlite` (the embedded …` through `… `node --disable-warning=ExperimentalWarning` silences it.` Rewrite the `node:sqlite` sentences in the same voice: the import loads `node:sqlite`; on Node below 24.15 that prints an `ExperimentalWarning`, silenced by the flag; on 24.15 and later it does not — measured by the first-use workflow. Keep `Requires Node 22.16 or newer.` byte-identical (the floor does not move).

Hand-verify the two guide sentences quote nothing they do not need to; wrap to each file's width.

- [ ] **Step 6: Gates and commit (the two guide files only).**

```bash
git status --porcelain
```
Expected: `M docs/guide/integrating.md`, `M packages/record/README.md`, and `?? docs/analysis/2026-08-29-first-use-proof.md` (untracked, deliberately). The battery, all green. `git add` the two guide files only.

Subject: `First-use proof 3/4: the run, and the two sentences it licenses — the warning present at 22.16.0, absent at 24.15+`

The commit body carries the run URL (or id), both resolved Node versions, and both stderr blocks — the evidence for the sentences travels with them.

---

### Task 4: The record and the exit

**Files:**
- Modify: `docs/process/implementation-status.md` (a new increment section; the present-tense Biome count — the test counts do not move)
- Modify: `docs/superpowers/INDEX.md` (this pair's row; the `specs/`, `plans/` and `docs/analysis/` counts)
- Add to the index: `docs/superpowers/specs/2026-08-29-first-use-proof-design.md`, `docs/superpowers/plans/2026-08-29-first-use-proof.md`, `docs/analysis/2026-08-29-first-use-proof.md`

**Interfaces:**
- Consumes: Task 3's run facts; Task 1 Step 1's baselines.
- Produces: nothing.

- [ ] **Step 1: Classify every count sentence before touching one.**

```bash
grep -n "test files, [0-9]* tests\|files checked" CLAUDE.md docs/process/implementation-status.md | head -30
```
Only `CLAUDE.md`'s State paragraph and `implementation-status.md`'s `**Measured against the current tree**` bullet are present-tense. The vitest figures do NOT move (no test file was added — verify against Task 1 Step 1). The Biome count moves by one (`scripts/first-use.mjs`) — re-measure it from `./node_modules/.bin/biome check --error-on-warnings .` and write what it prints. Every figure under a `**Gate outputs, as measured against this increment's own exit commit**` heading stays byte-identical.

- [ ] **Step 2: Write the increment section.**

Append `## Post-build-order increment — First-use proof` after the last section of `docs/process/implementation-status.md`, in the house shape (read the two preceding sections and match them): the ordinal — count the `## Post-build-order increment —` headings above and add one (expected thirteenth; the `## Post-build-order note —` heading does not count); exit status; the commit range in backticks closed by this commit; **no `packages/` file touched** proved by `git diff <baseline> --stat -- packages/` (empty); no marker, no `docs/concept/`, no sanction; `Design:`/`plan:` paths. Then: **The gap this closed.** (the precondition unprovable from a checkout; the stale warning sentences); **What landed.** per file; **The run, and what it proved** — the URL/id, both legs, both measurements verbatim, the Postgres half against a service the job owned; **The floor did not move, and why** (Stability 1.2 is not the rule's trigger; what changed is the story, now pinned); **Deviations from the plan as written** (write "None" only if true — a workflow fix-up commit inside Task 2's scope is a deviation to record, as is any Step 3 URL-vs-id substitution); **The honest limit.** (ubuntu only; prose unproven; tarball source until the cut; the `24` leg measured a named patch; `pnpm smoke` unchanged as the per-push gate; the probe tier not run); **What stays outside, and why.** (the checklist and its precondition tick, the stale tag, the pickup rewrite, rows 19/22 — the next increment's; raising the floor; a lazy `SqliteStore` load; Windows/macOS legs); **Cuts.** None; **Gate outputs, as measured against this increment's own exit commit** with the measured figures, `git diff <baseline> --stat -- packages/` empty, and `docs/process/deferral-register.md` loses no row and gains none.

- [ ] **Step 3: Index the pair and the record; move all three counts.**

Add the INDEX row after the `Sidecar orphans report` row:

```
| 2026-08-29 | First-use proof | Post-build-order (no step) | [design](specs/2026-08-29-first-use-proof-design.md) | [plan](plans/2026-08-29-first-use-proof.md) |
```

Then:
```bash
git add docs/superpowers/specs/2026-08-29-first-use-proof-design.md docs/superpowers/plans/2026-08-29-first-use-proof.md docs/analysis/2026-08-29-first-use-proof.md
git ls-files -- 'docs/superpowers/specs/*.md' | wc -l
git ls-files -- 'docs/superpowers/plans/*.md' | wc -l
git ls-files -- 'docs/analysis/*.md' | wc -l
```
Write the three measured numbers into ``**N files in `specs/`, M in `plans/`**`` and ``**`docs/analysis/`** holds K files`` — **do not reword either sentence**. Then `node scripts/docs-index-sync.mjs; echo "exit=$?"` → `exit=0`, no output.

- [ ] **Step 4: Move the present-tense Biome count** (Step 1) in `CLAUDE.md`'s State paragraph only if it is stated there (today it states only the test counts — verify), and in `implementation-status.md`'s Measured bullet.

- [ ] **Step 5: Prove the envelope.**

Tasks 1, 2 and 3 have each committed once (plus any recorded Task 2 fix-up), so the pre-increment baseline is the commit the branch was cut from — `git merge-base main HEAD`:

```bash
BASE=$(git merge-base main HEAD); echo "$BASE"
git diff "$BASE" --stat -- packages/ ; echo "empty means no package file moved"
git diff "$BASE" --name-only -- .github/workflows/ scripts/ docs/process/release-checklist.md
```
Expected: no output from the first; the second lists exactly `.github/workflows/first-use.yml` and `scripts/first-use.mjs` — `release-checklist.md`, `ci.yml`, `release.yml` and `smoke-pack.mjs` must NOT appear. Any other path is a STOP.

- [ ] **Step 6: Full gates, commit, and discharge the explicit-proposal condition.**

The Global Constraints battery, all green, the vitest figure identical to Task 1 Step 1's.

Subject: `First-use proof 4/4: the record lands the exit — the precondition discharged by construction`

The commit body names every `docs/process/` file this increment touched (only `implementation-status.md`) and what changed and why, per `CONTRIBUTING.md`'s requirement that `implementation-status.md` edits be proposed rather than slipped in; and states that `release-checklist.md` was deliberately NOT touched.

---

## Self-review notes

- **Spec coverage.** Ruling 1 (no-checkout runner) → the `first-use` job's missing checkout step and Task 2 Step 2's zero-count check; ruling 2 (two jobs, one artifact, script shipped inside it) → Task 2 Step 1's `pack` job and the `cp scripts/first-use.mjs first-use-artifact/`; ruling 3 (floor stays) → Global Constraints and Task 3 Step 5's byte-identical `Requires Node 22.16 or newer.`; ruling 4 (pinned both ways) → the matrix's `expect_warning` and the bare-import step; ruling 5 (Postgres service) → the `services.postgres` block and `VIDIMERA_PG_URL`; ruling 6 (dispatch-only, `source` input) → `on: workflow_dispatch` with `source`/`version`; ruling 7 (script = getting-started in substance, no probe run) → Task 1 Step 2; ruling 8 (one documented run, the bound stated) → Task 3 Steps 2–3; ruling 9 (`CLAUDE.md` sentence) → Task 2 Step 3. The spec's "What lands" → Tasks 1–4 file by file.
- **The one thing most likely to be got wrong** is writing the two public sentences before — or regardless of — the measurement. Task 3's order is deliberate: dispatch, read the stderr blocks, THEN rewrite; a 24 leg that warns stops the rewrite cold.
- **The second most likely** is committing the analysis record in Task 3 and tripping `docs-index-sync` (a tracked analysis file with an unmoved count). Task 3 Step 4 says so twice on purpose; the record is Task 4's `git add`.
- **The third** is the `pack` job packing the adapter with npm, shipping `workspace:^` verbatim, and the install refusing it — the same trap `smoke-pack.mjs` documents. The workflow uses `pnpm pack` for the adapter and the script asserts the range.
- **Type/name consistency.** Artifact name `first-use-${{ github.run_id }}` in both jobs; download path `artifact`, script copied from `../artifact/first-use.mjs`, tarballs installed from `../artifact/*.tgz`; env names `FIRST_USE_SOURCE` and `VIDIMERA_PG_URL` in both the workflow and the script; schema `first_use` matches `PostgresStore`'s `SCHEMA_NAME` constraint (lowercase, underscore).
- **No figure in this plan is a measurement.** Test totals, the Biome count, the resolved Node patches and the run id are read at the step that needs them.
