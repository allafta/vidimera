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
  in a job with no credentials, which is what the concern was about.

## 3. Constraints

- Every action stays pinned by full commit SHA with its version comment, reusing the pins the
  workflows already carry (`actions/upload-artifact` and `actions/download-artifact` from
  `first-use.yml`).
- The release workflow cannot be exercised locally. `scripts/test/workflows.test.mjs` parses
  and asserts shape and facts only; the first dry-run dispatch after merge is what runs the
  YAML. That is the existing bound, restated.
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
is the only execution of its new YAML, as it was for the old.
