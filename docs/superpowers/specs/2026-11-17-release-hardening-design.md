# The release-hardening increment — design

**A post-build-order increment (no step): the dispatch-only release workflow, the first-use
workflow, CODEOWNERS and dependabot. No sealed-set edit, no library source change, no
public-surface change. The workflow has never published; its first real run is the 0.1 cut.**

**Status.** Taken on the owner's standing instruction of 2026-11-17 ("make your own
decisions"). Branch `release-hardening-2026-11-17`, stacked on
`compliance-statement-2026-11-17`. Not merged. Two halves need the owner in the repository
settings — the `release` environment's tag rule and moving `NPM_TOKEN` into it — and are
release-checklist items, not something this branch can do.

## 1. What it answers

- **The guard does not check what its header says.** `release.yml`'s header says the guard
  "refuses to publish a package that skipped any of that" — bump, drop `private`, commit, tag.
  It checks two things: `private` and `0.0.0`. A dispatch from `main`, a branch, or a tag
  whose name does not match the version publishes; so do two packages at different versions.
- **One job holds the credentials and runs everything.** The single `publish` job has
  `id-token: write` from its first step and receives `NPM_TOKEN` at its last, after
  `pnpm install`, the whole dev toolchain, the test suite and the smoke test's
  script-enabled registry installs have all run in the same job.
- **First-use interpolates free-text inputs into a shell script.** `first-use.yml` writes the
  `version` and `source` inputs straight into a `run:` block, so the dispatcher's text becomes
  shell.
- **Three header facts are wrong**: the adapter's peer range is `workspace:^`, not
  `workspace:*`; the token is a granular access token (classic automation tokens can no
  longer be created, as the release checklist says); the dry-run input's description says the
  guard is skipped, where it runs and reports. The release checklist repeats `workspace:*`.
- **CODEOWNERS leaves the release workflow, the gate scripts and itself unowned.**
- **Dependency updates land with no delay**: no dependabot cooldown.

## 2. Goals, non-goals

**Goals.**

- The guard refuses unless the run was dispatched from a tag, the tag is `v<version>`, both
  packages share that version, neither is `private` and neither is `0.0.0`. In a dry run it
  still reports every reason and does not block.
- Two jobs. `build` (`contents: read` only) installs, runs the guard and every gate, packs both
  tarballs and uploads them as one artifact. `publish` (needs `build`; skipped in a dry run and
  for a non-tag ref) is the only job with `id-token: write` and the token, runs in the
  `release` environment, does no checkout, no install and no cache, downloads the artifact and
  publishes exactly those two tarballs, record first.
- First-use passes both inputs through `env:` and validates the version as semver before using
  it.
- The header and dispatch text, and the release checklist, say what the workflow does; the
  checklist gains the two settings steps (create the `release` environment with a `v*` tag
  rule; move `NPM_TOKEN` into it as an environment secret and delete the repository secret).
- CODEOWNERS owns `/.github/` (CODEOWNERS included) and `/scripts/`.
- Dependabot waits seven days before proposing a new release, both ecosystems.

**Non-goals.**

- The `release` environment's protection rules and the secret's move — repository settings,
  owner-only. Until they are done, `environment: release` is created on first use with no rule
  and the job reads the repository secret: the job split and the guard still hold, the
  environment adds nothing yet. Stated in the checklist and the status record.
- pnpm's `minimumReleaseAge` — the lockfile is frozen in every workflow, and a setting that
  changes resolution cannot be exercised on the authoring machine (its `pnpm` launcher is
  broken). Named open.
- Pinning `first-use.yml`'s `postgres:18` service image by digest — named open: the digest
  cannot be looked up and verified from the authoring machine, and first-use is a dispatch-only
  release act, not a per-push gate.
- `--ignore-scripts` in the smoke test: after the split, the smoke test's registry installs run
  in a job with no credentials, which is what the concern was about. *(Amended after review,
  §7: no credentials, but the same job packs the bytes that are published — the split keeps
  the credentials away from the toolchain, not the toolchain away from the bytes.)*

## 3. Constraints

- Every action stays pinned by full commit SHA with its version comment, reusing the pins the
  workflows already carry (`actions/upload-artifact` and `actions/download-artifact` from
  `first-use.yml`).
- The release workflow cannot be exercised locally. `scripts/test/workflows.test.mjs` parses
  and asserts shape and facts only; the first dry-run dispatch after merge is what first runs
  the build and dry-run jobs' YAML, and the real publish jobs — with them the `release`
  environment, provenance and the token — first run at the release dispatch itself (amended
  after review, §7). That is the existing bound, restated.
- The test that pins the old single-job shape is rewritten to pin the same guarantees over two
  jobs — the dry-run input, the guard reporting without blocking in a dry run, both publish
  steps skipped in a dry run, every gate before any publish — plus the new ones. The guarantees
  keep their truth value; their encoding moves with the structure. Not an inversion.

## 4. Approaches

1. **Split build and publish, guard in a script (picked).** The guard's logic moves to
   `scripts/release-guard.mjs` with a pure `guardFindings` function, unit-tested beside the
   other gate scripts, and the workflow calls it with the ref passed through `env:`.
2. **Keep one job, add `if:` conditions.** Leaves credentials in the job that runs the
   toolchain. Not picked.
3. **Inline the extended guard as `node -e`.** Untestable, and the old inline guard is how the
   header and the check drifted apart. Not picked.

## 5. Rulings

- `guardFindings({ packages, refType, refName })` returns every reason to refuse (an empty
  array means pass); the CLI prints each as `refusing to publish: …` and exits 1, or prints one
  `guard: ok` line naming the version and tag.
- Tarballs are packed with `pnpm pack --pack-destination` into one directory and uploaded with
  `if-no-files-found: error`; the publish job publishes `vidimera-record-*.tgz` then
  `vidimera-store-postgres-*.tgz` from the downloaded directory.
- `publish`'s `if:` is `!inputs.dry_run && github.ref_type == 'tag'` — a second, cheap
  statement of the guard's tag rule at the job boundary.
- CODEOWNERS and dependabot comments say what each new entry is for.

## 6. Exit

Every gate green except `smoke` (CI). The release workflow's first dry-run dispatch after merge
is the first execution of its build and dry-run jobs; its real publish jobs first execute at the
release dispatch itself, as the old publish steps would have (amended after review, §7).

## 7. Amended after review

One review of the increment's commit (`af824c7`) found a critical regression, two important
gaps and several minors; one fix wave answered all of them. Where an item changes a ruling
above, the ruling stays as written for the record and this section supersedes it.

- **The publish argument is a file path** (supersedes §5's tarball spelling).
  `npm publish release-tarballs/vidimera-record-*.tgz` is read by npm as a GitHub `owner/repo`
  spec, not a file: npm 10.9's own argument parser, run locally, returns a `git` spec of the
  github type for `release-tarballs/<name>.tgz` and a `file` spec for
  `./release-tarballs/<name>.tgz`. Every publish command now starts
  `npm publish ./release-tarballs/`, with a comment at the first that the `./` is load-bearing.
  The old single job's `./*.tgz` was right, so this was a regression of this increment, caught
  before anything ran. The workflow test pins each real publish command as an exact literal and
  every `npm publish` line in any job as a `./` path; both were observed red against
  `af824c7`'s workflow.
- **Two publish jobs, not one** (supersedes §2's "Two jobs" goal and §5's `publish` rulings).
  `publish-record` (needs `build`) and `publish-store-postgres` (needs `publish-record`), each
  with the same `if:`, `environment: release`, `contents: read` and `id-token: write`, Node set
  up with the registry and no cache, the artifact download, and its one publish step holding
  the token. A failure at the adapter then re-runs alone (Re-run failed jobs) without
  re-publishing record. The bound: whether a re-run attempt can download the artifact the first
  attempt uploaded was not verified here.
- **The dry run exercises the publish commands** (amends §3 and §6). A `publish-dry-run` job
  (needs `build`; dry run only; no environment, no permissions beyond the read-only default, no
  secret; Node set up with no registry and no cache, so no auth line is written) downloads the
  same artifact and runs the real publish commands with `--provenance` removed — provenance
  needs the OIDC token this job deliberately lacks — and `--dry-run` appended, record first. The
  test derives those commands from the real jobs', so the two cannot drift. A dry run exercises
  the build job in full, the artifact upload and download, and the exact publish commands under
  `--dry-run` (argument parsing, tarball read). It never exercises the `release` environment,
  the OIDC token or provenance, `NPM_TOKEN`, or the real publish: those first run at the release
  dispatch itself.
- **The split's limit, stated** (qualifies §1's second bullet and §2's `--ignore-scripts`
  non-goal). The published bytes are produced in `build`, which runs `pnpm install`, the suite
  and the smoke test, whose scratch install fetches registry dependencies fresh, with install
  scripts, outside the lockfile and the dependabot cooldown. Code running there can alter what
  `pnpm pack` packs, and the publish jobs then publish it with valid provenance. The split keeps
  the publish credentials away from the toolchain, not the toolchain away from the bytes.
  Stated in the workflow header, the CHANGELOG entry, the status record and here.
- **First-use's semver check matches the whole value** (amends §2's first-use goal in
  mechanism). The `printf … | grep -Eq` line becomes bash's `[[ "$VERSION" =~ … ]]` under an
  explicit `shell: bash`: grep matches line by line, so a multi-line value whose first line was
  semver passed (measured locally). The first-use workflow test also rejects
  `github.event.inputs.` interpolations in `run:` blocks.
- **Minors.** In the release checklist: the guard's description, CODEOWNERS' coverage with
  the sole-code-owner limit (the owner's own pull requests need an admin bypass; the gain is
  on others', dependabot's included), the token's location, the deployment rule's **Tag** type
  and what it does not limit (who may push a `v*` tag — a required reviewer does, and is
  recommended), the bypass-2FA token option, and the local `--dry-run`'s `./` form. The
  dependabot cooldown's limit: it delays version updates only, not security updates.
  `CLAUDE.md`'s workflow sentence: "no publish credential" (the build job still holds a
  read-only `GITHUB_TOKEN`) and the token a repository secret until the owner moves it. Named
  open in the status record: npm trusted publishing, which would remove `NPM_TOKEN`, needs npm
  11.5.1 or later, newer than Node 22's bundled npm 10.9 — a later change, after 0.1.0 exists.
