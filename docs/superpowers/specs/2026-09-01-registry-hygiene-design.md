# Registry-facing hygiene — design

**Date: 2026-09-01.** **A three-decision increment. No sanction is needed and none is
sought.** Nothing in `docs/concept/` moves and no maturity marker moves. The three items
here are the ones the 2026-08-30 sweep grouped as "registry-facing hygiene"
(`docs/analysis/2026-08-30-pre-release-code-gaps.md` §2 increment 2: items 10, 45, 47) and
the 2026-09-01 gaps record promoted on its immutability lens: each is a decision with a
small code consequence, and each becomes unfixable for 0.1 the moment the packages
publish — the registry page renders from the 0.1 tarball's manifest, and the error string
ships in `dist/*.js` under the provenance attestation. The public API surface does not
change (`pnpm api-sync` unaffected: the renamed helper was never exported), but one
adopter-VISIBLE error string changes, which is exactly why this lands before the cut and
not after.

**On SPEC §9.1, said precisely so the reword is not mistaken for a fork.** §9.1's
error-shape rule — a feature field for an unimplemented capability fails fast with an
explicit unavailable-in-this-build error — binds GUARDS. Measured against the current
tree, zero governed fields remain (`config.ts`'s own count, "1 → 0 with this lift"), so no
site emits a §9.1 guard error; the four surviving `governedUnavailable` call sites are
generic unknown-option-key throws that merely RIDE the guard era's helper, and its head
names a mechanism the tree no longer has. Rewording that head neither touches §9.1 nor
weakens it: if a governed field ever returns, its guard mints its own §9.1-shaped message
at its own site. The head is today "NOT pinned by any test … Ordinary prose, not a byte
contract" by `config.ts:99-106`'s own recorded ruling, so the reword breaks no gate — and
this increment ends that unpinned state for the NEW head (ruling 1).

## Rulings taken (2026-09-01, in the scoping session), so they are not re-litigated

1. **Item 45 — REWORD the message head, rename the helper, and PIN the new head.** Of the
   sweep's three exits (pin as-is / reword / record unpinned), reword: the word "GOVERNED"
   names the feature-guard era, which closed. New head: `unknown option key (<key>)`,
   with every caller's tail (the seam's accepted-keys sentence and its SPEC contract
   citation) unchanged. Helper renamed `governedUnavailable` → `unknownOptionKey` so the
   name stops asserting a dead mechanism too. And the reword completes with what exit (a)
   offered separately: ONE positive `assert.match` on the new head at one of the four
   seams, so the string an adopter will match on is a tested contract from its first
   published day — plus the two existing `assert.doesNotMatch` negatives updated to the
   new head, keeping their meaning (a structural error is not the unknown-key string)
   instead of going permanently, vacuously green against a string that no longer exists.
2. **Item 47 — pin `@types/node` to the floor major (`^22`), decided empirically.** The
   increment's FIRST act on this item is the check the ruling was made pending: set the
   root devDependency to `^22`, `pnpm install`, and run the full typecheck (both packages,
   tests included via the vitest projects' tsconfig reach). If it comes back clean, the
   pin lands, `pnpm-lock.yaml` moves with it, and `.github/dependabot.yml`'s npm group
   gains an ignore rule for `@types/node` major updates (else the weekly group would bump
   the pin back). If the check FAILS on typings the floor's own APIs need (the
   `node:sqlite` surface is the suspect: `DatabaseSync`, `exec`, `prepare`,
   `isTransaction`), the decided fallback is: keep `^26`, change nothing else, and record
   in the increment account that the exact-floor CI leg (ubuntu @ 22.16.0) is the
   deliberate gate — the sweep's own alternative exit. **The pin's honest bound either
   way:** `^22` resolves to the latest 22.x typings, so an API added WITHIN the 22 line
   after 22.16 still typechecks while absent at the floor; the pin narrows the
   types-vs-floor gap by a major line, it does not close it, and the exact-floor CI leg
   remains the runtime gate regardless.
3. **Item 10 — add `homepage`, `bugs`, and `keywords` to both manifests; omit
   `publishConfig` deliberately.** `release.yml` already passes `--access public` on the
   publish command line, so `publishConfig.access` would be a second copy of the same
   fact; the omission is recorded here and in the increment account rather than silently.
   The URLs point at a repository that is private until the cut — they 404 for outsiders
   today, which is fine: the registry pages that render them exist only after the publish,
   which the checklist orders after the visibility flip.

## The permitted edit envelope, stated as a STOP

- `packages/record/src/config.ts` — the helper (rename + new head), its doc comment
  (`:98-121`, rewritten: the §9.1 guard framing becomes the history of why the helper
  exists, any retained SPEC quotation kept verbatim so the contract-scan resolver still
  finds it), and the `validateProfile` count comment (`:600-609`) that names the helper —
  its "the two must not diverge again" pairing rule is preserved, both sides updated
  together.
- The four caller files, mechanically: `kernel/open.ts` (import, call site, and the `:48`
  comment saying "throws GOVERNED"), `kernel/finalize.ts` (`finalizeOptionMessage`),
  `kernel/decline.ts`, `kernel/redeem.ts` (`validateRedeemOptions`). No behavior change
  at any of them — same throws, same keys, same tails, new head.
- `packages/record/test/construction-validation.test.ts` — the header mention and the two
  `doesNotMatch` negatives (~`:83`, ~`:378`), updated to the new head.
- ONE positive pin of the new head at one of the four seams — the plan locates the best
  existing unknown-key test to upgrade (or adds one beside it).
- `packages/record/package.json` and `packages/store-postgres/package.json` — the three
  metadata fields (values in the next section).
- Root `package.json` (`@types/node`), `pnpm-lock.yaml` (regenerated by the install), and
  `.github/dependabot.yml` (the ignore rule) — the last two ONLY if ruling 2's pin lands.
- `CLAUDE.md` — its six present-tense `GOVERNED`/`governedUnavailable` mentions (two
  paragraphs), updated to the new name and head.
- `docs/process/implementation-status.md` — present-tense sentences naming the CURRENT
  helper or head only, found by the sweep recipe below, plus the increment's own account
  section at exit. **Past-tense accounts of the guard era stay exactly as written** — they
  describe history truthfully and must not be flipped; the commit-pinned gate blocks are
  untouchable as always.
- `CHANGELOG.md` `[Unreleased]` and `docs/superpowers/INDEX.md` at exit.
- **STOP, absolute:** `docs/concept/**` (sealed), `docs/guide/**` (verified 2026-09-01:
  zero `GOVERNED` mentions in the publish-facing docset — README, CHANGELOG, guide, both
  package READMEs), `docs/process/deferral-register.md`,
  `docs/process/release-checklist.md`, `.github/workflows/**` (`release.yml`'s
  `--access public` stays the single copy of that fact),
  `packages/record/test/byte-stability.test.ts`, every existing `PINNED_` literal
  (message strings are not chained — no byte pin can legally move).

## Ruling 1's exact shapes

The helper today (`config.ts`, verified 2026-09-01):

```ts
export function governedUnavailable(field: string, contract: string): string {
  return `GOVERNED feature not available in this build (${field}) — ${contract}`;
}
```

becomes:

```ts
export function unknownOptionKey(field: string, contract: string): string {
  return `unknown option key (${field}) — ${contract}`;
}
```

Lowercase head, matching the file's own error style (`invalid profile '…'`). Every caller
passes the unknown key as `field` and a seam-specific tail as `contract` (e.g. `open()`'s:
"open() accepts only priorRecordRefs, policyDigest, supersedes, and proposed in this
build. Contract: §9.") — the tails are already true and stay byte-identical. The positive
pin asserts `assert.match(err.message, /^unknown option key \(/)` plus the seam's key in
the parenthesis, at one seam; the two negatives become
`assert.doesNotMatch(err.message, /unknown option key/)` with their messages updated.

**The sweep recipe** (run before writing the account, then re-run and shown clean):

```sh
# Must return EMPTY after the increment — code, tests, and CLAUDE.md carry no
# present-tense trace of the old name or head:
git grep -n "governedUnavailable\|GOVERNED feature not available" -- packages/ CLAUDE.md

# Every hit here needs a RULING, not necessarily an edit: past-tense guard-era accounts
# stay; present-tense claims about the current tree move:
git grep -n "governedUnavailable\|GOVERNED feature not available" -- docs/process/
```

## Ruling 3's exact values

Both URLs are DERIVED from each manifest's own `repository.url` — strip the `git+` prefix
and the `.git` suffix to get the https base — so this document stays free of literal
external URLs (the standalone-contract scan holds repo-wide) while the values are fully
determined. `packages/record/package.json` gains:

```json
"homepage": "[repository https base]/tree/main/packages/record#readme",
"bugs": { "url": "[repository https base]/issues" },
"keywords": ["decision-records", "confirmation", "hash-chain", "append-only", "tamper-evident", "audit", "human-in-the-loop"]
```

`packages/store-postgres/package.json` gains:

```json
"homepage": "[repository https base]/tree/main/packages/store-postgres#readme",
"bugs": { "url": "[repository https base]/issues" },
"keywords": ["vidimera", "postgres", "postgresql", "store-adapter", "decision-records"]
```

Per-package `tree/main` homepages (matching each manifest's own
`repository.directory` precision) rather than one shared root link; a shared `bugs` URL;
sober keywords drawn from the descriptions — no compliance vocabulary, no claim a keyword
search would make that the README does not. `package.json` is not contract-scanned
(the scan covers tracked `*.md` and `*.ts*`), so the URLs raise no standalone-contract
question; the concept set stays reference-free either way.

## Verification

- **Gates, all green at exit:** typecheck (both packages), the full test run, lint:strict,
  contract-scan, api-sync, docs-index-sync, **build, and smoke** — smoke is mandatory
  here, not optional: both manifests change, and smoke packs and consumer-tests the
  tarballs those manifests shape. (The truth-restoration increment's final review caught
  exactly this omission; it is named in the spec this time.)
- **The positive pin must be shown to fire** (temporarily flip the expected pattern, watch
  it fail, revert) — the standing firing-counter lesson.
- **Ruling 2's check is evidence, not vibes:** the report records the exact `@types/node`
  version installed and the typecheck output, whichever exit it lands.
- **The sweep recipe's first grep returns empty**, and every `docs/process/` hit carries a
  ruling in the increment account.
- **Review bar:** after the reword, read each of the four seams' thrown message end to
  end — head plus tail — and confirm the whole sentence is true of the seam it names.

## Out of scope, deliberately

- Any change to `release.yml` (the `--access public` fact stays single-copy).
- Any new register row or checklist edit — item 45's old register lineage (row 7,
  "corrected, not satisfied") is history; the decision lands in the increment account.
- The `node:sqlite` floor rule, the entry-point decision, and everything else on release
  day's list — untouched here.
- Package `README` or guide changes: the docset carries no mention of the old head.
- Renaming anything exported: the helper is internal; the public surface does not move.

## Exit

The increment account lands in `docs/process/implementation-status.md` (its own section:
the three rulings, ruling 2's measured exit, the sweep-recipe results with per-hit
rulings, the publishConfig omission recorded), `CHANGELOG.md`'s `[Unreleased]` gains its
entries, and `docs/superpowers/INDEX.md` gains the row. The implementation plan follows at
`docs/superpowers/plans/2026-09-01-registry-hygiene.md`.
