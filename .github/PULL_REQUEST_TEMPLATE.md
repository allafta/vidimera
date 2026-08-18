## What this changes

<!-- One or two sentences: the problem, and the shape of the fix. -->

## Checklist

Gates (CI runs these too, but run them locally first):

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint:strict` passes (CI errors on warnings, not just errors)
- [ ] `pnpm test` passes with zero skipped tests
- [ ] `pnpm contract-scan` exits 0 — new files are `git add`ed before running it, since the
      scan only reads tracked files

Repository rules (see `CONTRIBUTING.md` for the reasoning):

- [ ] `docs/concept/` is untouched — or this PR cites the fresh, explicit sanction through
      `docs/concept/SCOPING-GUIDE.md` §§1–2 that licenses the edit
- [ ] The frozen digests in `packages/record/test/byte-stability.test.ts` are untouched —
      or this PR explains, as a finding, why the minimal chain's bytes legitimately moved
- [ ] Any code-vs-`SPEC.md` difference this work surfaced is reported as a finding in the
      description, not silently reconciled
- [ ] Consciously deferred work has a row in `docs/process/deferral-register.md` with a
      trigger
- [ ] New or changed prose states each guarantee with its limit, makes no compliance
      claims, and never says "non-repudiation"
- [ ] If the public surface moved (`packages/record/src/index.ts` or either surface
      interface), `docs/guide/api-reference.md` and any affected guide walkthroughs moved
      with it
