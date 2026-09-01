# The 0.1 cut gaps — the whole gate set, and three things the code sweep does not carry

**Date: 2026-09-01.** A second reading of the same question the 2026-08-30 sweep asked
(`docs/analysis/2026-08-30-pre-release-code-gaps.md`), with its frame removed. That sweep
asked, of 193 catalogued items, whether each is still open, whether its closing act is
**code**, and whether the records tie it to the 0.1 cut; its headline — "three code edits
gate the cut" — is true inside that frame and undercounts the cut outside it, because the
cut is mostly not code. This record takes the gate set whole: the acts, the rulings, the
commit, and the paperwork, in one list, and then names what the sweep's own brainstorm
missed.

**What this document is not.** It decides nothing and moves nothing. The deferral register
(`docs/process/deferral-register.md`) stays the only ledger where a deferral is retired;
`docs/process/release-checklist.md` stays release day's authoritative list;
`docs/process/implementation-status.md` stays the authoritative account of what is built.
Where this document and any of those disagree, this document is stale and they win.

**Bounds, stated first.** Every claim below was measured against `main = 710aa69` on
2026-09-01 and drifts from that moment. Live platform state — the npm scope, the token, the
repository's visibility and protection settings, the Dependabot queue — was not checked; this
reading is of the repository only, the same bound the 2026-08-30 sweep declared. Nothing was
run except `git grep` and the reads cited; no gate, test, or build was executed for this
record until its own commit. One external fact is used and cannot be verified from here — npm's
unpublish window — and is flagged where it appears. The three findings in section 2 were each
checked at their sites by hand; the section 1 arithmetic is a count of the checklist's own
boxes and is reproducible.

---

## 1. The gate set, whole

The checklist carries **18 open checkboxes** and one ticked
(`grep -c '^- \[ \]' docs/process/release-checklist.md`), distributed thus:

| Kind | Count | What it is |
|---|---|---|
| Owner acts, no commit possible | 5 | The readiness bar; visibility → public; the `@vidimera` scope and a live granular `NPM_TOKEN`; private vulnerability reporting; code-owner branch protection |
| Decisions taken on the day | 3 boxes (+1 unboxed) | The floor rule; row 19's disposition; row 22a's disposition — and the `SqliteStore` entry-point exit, which has no box |
| The release commit | 6 | Both version bumps; both `private` drops; the CHANGELOG cut; the docset flips; the `CLAUDE.md` skim; gates, commit, tag, push |
| The dispatch and after | 5 | The dispatch itself; the registry first-use re-proof; retire row 1; record the 19/22 rulings; refresh the measured block |

So: **19 gates** — 18 boxes plus one decision with no box — and separately two items the
2026-08-30 sweep argues for pre-cut without any document gating them (its items 10 and 11:
manifest metadata, and the retired-review pointer in `operator-surface.ts`).

Three observations follow from laying it out this way, none of them visible from the
code-only frame.

**The owner-act kind is a chain, not a list.** Two of its five are not merely undone but
unavailable while the repository is private — the platform refuses both code-owner branch
protection and private vulnerability reporting on a private repository under this account's
plan (`docs/process/release-checklist.md:33-38`). Visibility is therefore not one item among
five; it is the precondition for two others and for provenance, and it is the one item
deliberately withheld from automation.

**Item 9 is the only cut-gating decision with no checkbox.** Whether `SqliteStore` stays an
eager re-export at `packages/record/src/index.ts:83` — and so whether every adopter below Node
24.15 meets `node:sqlite`'s `ExperimentalWarning` at bare import — is weighed *inside* the
floor rule's prose (`docs/process/release-checklist.md:79-80`) rather than asked as its own
question. The recorded default is ship-as-is with the documented flag, which is very likely
right; the defect is procedural, not substantive. A behavioral decision that reaches an
adopter at `import` should be ruled on, not defaulted into by living in another item's
paragraph.

**Only three of the nineteen are code**, and they are the three the sweep names. The rest are
acts, rulings and documentation. The practical consequence: the parts of release day most
likely to go wrong are the parts no gate, test, or rehearsal touches.

## 2. Three findings the 2026-08-30 sweep does not carry

### 2.1 The docset flip list is an enumeration, and it has now been short twice

`docs/process/release-checklist.md:102-108` names eight sites to flip from the unpublished
caveat to the published truth: `README.md`'s status paragraph, `docs/guide/getting-started.md`'s
honest precondition, `docs/guide/api-reference.md`'s header caveat, `docs/guide/faq.md`'s
is-it-production-ready answer, `SECURITY.md`'s supported-versions section, `docs/README.md`'s
"not yet published or installable" line, and both package READMEs' status blocks.

A grep of the publish-facing docset finds three more spots the list does not name. They are
not all the same kind, and the difference matters:

- **`CHANGELOG.md:11` and `CHANGELOG.md:173-177` become flatly false.** Line 11 reads "**No
  release has been cut.** The package is pre-0.1 and unpublished"; the "Known not-done" block
  at 173-177 reads "The release itself: the package is `private: true` and unpublished by
  design until the 0.1 cut". The checklist's CHANGELOG item
  (`docs/process/release-checklist.md:101`) covers *only* cutting a `[0.1.0]` section from
  `[Unreleased]`. Executed exactly as written, the release commit therefore produces a
  CHANGELOG carrying a `[0.1.0]` heading above a paragraph denying that a release exists. The
  2026-08-30 sweep's item 143 does name both spots; the checklist does not inherit them, and
  release day runs from the checklist.
- **`docs/guide/api-reference.md:509` needs a ruling, not necessarily a flip.** "Inside this
  workspace, where everything runs from source, the deep import `src/probes/index.js` is still
  how the tier is reached" stays true for a reader inside the workspace, but it is the second
  workspace-scoped caveat in a file whose flip the checklist scopes to "the header caveat"
  (`:14-15`) alone. After publish, the sentence an adopter needs is about
  `@vidimera/record/probes`.
- **`docs/guide/integrating.md:533` is in the same position**, and `integrating.md` is absent
  from the flip list entirely.

**Why this is a finding and not a nitpick: the same failure mode already fired once.** The
open-items plan's stage-2 pass found four sites missing from the paused attempt's flip set —
`SECURITY.md`, `docs/README.md`, and both package READMEs — and the checklist records that
provenance in the flip item itself ("the last four entries added at the open-items plan's
stage-2 pass, which found them missing from the paused cut's flip set"). An enumerated list of
sites, maintained by hand across a docset that keeps growing, has now been wrong twice. It will
be wrong a third time for the same reason.

**The repair** (approved 2026-09-01, scoped in section 4): replace the enumeration with a grep
recipe the checklist runs and requires to come back empty, keeping the enumeration only as a
worked example of what the recipe catches. The list stops being a memory test and starts being
a check.

### 2.2 The publish is irreversible, non-atomic, and unrehearsed at its failure edge

`.github/workflows/release.yml` publishes in two steps in one job: `@vidimera/record` first
(`packages/record`, `pnpm pack` then `npm publish ./*.tgz --provenance --access public`), then
`@vidimera/store-postgres` the same way. The ordering is deliberate and correct — tarball-first
so pnpm rewrites the adapter's `workspace:^` peer range, record before the package that
peer-depends on it.

What no document covers is the seam between the two publishes. If the second fails — token
scope, name availability, a registry fault — then `@vidimera/record@0.1.0` is live and
immutable while the adapter is not. That is precisely the state the lockstep ruling forbids
(`docs/analysis/2026-08-20-versioning-mechanics.md`, cited at
`docs/process/release-checklist.md:96-99`: both packages carry the same version and both
publish). Three absences compound it:

- **No pre-flight.** Nothing in the workflow or on the checklist performs a `--dry-run`, an
  `npm whoami` or `npm access` probe against the scope, or a name-availability check before the
  first irreversible call. The guard step at `release.yml:29-37` checks the two things the
  repository can see — `private` and `0.0.0` — and nothing about the registry it is about to
  write to. The checklist's token item asks the owner to "verify the token's validity near the
  dispatch"; a valid token and a token with publish rights on `@vidimera` are different facts,
  and only the second one matters.
- **No named recovery.** As known at the time of writing, npm permits unpublishing a version
  within 72 hours of its publication, after which the version number is burned permanently
  even if unpublished. That window is the whole escape hatch for a half-published cut, and it
  appears in no repository document. It is also an external policy this record cannot verify —
  confirm it on the day rather than trusting this sentence.
- **No account of the window in which `main` lies.** The release commit flips the docset to
  published state, then is tagged and pushed; the dispatch is a separate act afterwards. Between
  the two, `main` asserts a publish that has not happened. The checklist's banner records that
  this is exactly what the paused attempt of 2026-08-19 ran into, and that the answer then was
  to revert the whole commit (`8be3fce`) — but that answer lives in a banner describing history,
  not in an item telling release day what to do if the dispatch fails.

None of this argues for changing `release.yml`'s publish order, which is right. It argues that
the irreversible step is the only step on the list with no verification in front of it and no
stated way back.

**Checked and clear, so nobody re-derives it:** bumping both versions does not invalidate
`pnpm install --frozen-lockfile` in the release job. `pnpm-lock.yaml` records the workspace
dependency as `version: link:../record` (`pnpm-lock.yaml:39-41`) — a path, not a version — so
the manifest edits the release commit makes are invisible to the lockfile.

### 2.3 A correction: the stale comments ship in `dist/*.js`, not in the declaration output

The 2026-08-30 sweep's brainstorm argues that stale source comments matter at the cut because
"comments in `.ts` files ship in the tarball's declaration output". The conclusion holds; the
mechanism named does not. `tsc` strips leading `//` comments from `.d.ts`, so the stale text is
**absent** from every `.d.ts` in `dist/` and **present** in the JavaScript. Measured after
`pnpm build` — `dist/` is a build artifact and is gitignored (`.gitignore:3`), so this is
reproduced rather than read from the tree: `packages/record/dist/operator-surface.js:37` still
reads "flagged to the pre-0.1 naming review" and `packages/record/dist/probes/index.js:11`
carries its own. Both files are inside `dist/`, the first entry of `files` in
`packages/record/package.json`, so both ship in the tarball and both fall under the provenance
attestation.

This is worth writing down for one reason: a plan author who takes the sweep at its word,
greps `dist/*.d.ts`, finds nothing, and marks the item closed would have produced a false
negative of exactly the kind `CLAUDE.md` keeps a trap list for. The item is open; the file
extension in the argument was wrong.

## 3. The lens the catalogue is missing: what becomes immutable at the cut

The 2026-08-30 sweep applies "unfixable for 0.1 once published" to manifest metadata alone (its
item 10). It is the right sort for the whole pre-cut question, and it cuts across the sweep's
buckets rather than along them:

| Immutable at 0.1 | Reversible after 0.1 |
|---|---|
| Manifest metadata (item 10) — the registry page renders from the 0.1 tarball | Every test in the sweep's section 9 |
| `dist/*.js` comment text (items 11, 185) — shipped and attested | Gate-script widening (items 17, 18) |
| The `GOVERNED feature not available` message head (item 45) | Probe driver shapes (items 15, 37, 86) |
| Public names: `acker`, `listDue`, `Waiver` (items 56, 66, 67) | A durable `SignatureStore` backing (item 34) |
| Entry-point warning behavior (item 9) | The whole 22a inventory |

Read that way, the sweep's proposed steps 1 and 2 earn the pre-cut window and its step 3 does
not: adapter and probe evidence is valuable and entirely reversible, so it has no claim on the
days before an irreversible act. The same lens promotes item 45 — the message head — from
"cheap" to "last chance", since it publishes a word for a mechanism the tree no longer has.

## 4. Increment 0 — repair the checklist

Scoped here on the owner's approval of 2026-09-01. It is documentation only; it changes what
release day executes without changing what the release commit touches, and it is independent
of every owner-gated setting, so it can land while those are arranged.

**In scope, four changes to `docs/process/release-checklist.md`:**

1. **Replace the flip enumeration with a grep recipe.** The item becomes: run a named `git grep`
   over the publish-facing docset for unpublished-state and from-source claims, rule on every
   hit, and require the rerun to come back empty (or empty of anything but deliberately retained
   history). Keep the eight named sites beneath it as the worked example of what the recipe
   catches, and add the three this record found — the two CHANGELOG spots, `api-reference.md:509`,
   `integrating.md:533` — with the ruling each needs, since two of the three want a rewording
   rather than a flip.
2. **Extend the CHANGELOG item** so it covers the banner at `:11` and the "Known not-done" block
   at `:173-177`, not only the `[0.1.0]` section cut. This is the one change without which the
   checklist, executed correctly, produces a self-contradicting file.
3. **Add a pre-flight block immediately before the dispatch item**: prove publish rights against
   the live scope before the irreversible call, and state the recovery — the unpublish window as
   it stands on the day, and the 0.1.1 path once it closes — together with what state `main` is
   in if the dispatch fails after the tag is pushed, and that the paused attempt's whole-commit
   revert is the precedent for that case.
4. **Promote item 9 out of the floor-rule prose** into its own decision line with the three
   recorded exits (ship as-is, lazy-load, raise the floor) and the recorded default named as the
   default rather than as an absence.

**Out of scope, deliberately.** No change to `release.yml` — its publish order is right, and a
pre-flight belongs on the list beside the other things no commit can land, not as a workflow
step that would then need its own rehearsal. No change to the two pre-argued rulings on rows 19
and 22a; this increment makes the list true, it does not decide anything on it. Nothing in
`docs/concept/`, which would need a fresh sanction through `SCOPING-GUIDE.md` §§1–2.

**How it is verified.** The grep recipe must be run and shown empty against the current tree
before it is written down as a check, and the four edits must leave `pnpm contract-scan` green.

## 5. The revised sequence

Against the 2026-08-30 sweep's section 12, one row added and one moved:

| Step | Content | Size | Gates the cut? |
|---|---|---|---|
| **0** | **Repair the checklist (section 4)** | **half a day** | **No — but release day runs from it** |
| 1 | Truth restoration in shipped source and tests | 2–3 days | No — but the source's words ship |
| 2 | Registry-facing hygiene: manifests, message head, `@types/node` | 1 day + 3 rulings | No — but immutable for 0.1 after |
| 3 | Release day per the repaired checklist | the checklist's own | Yes |
| 4 | Adapter and probe evidence (*was step 3*) | 1–2 days | No — and fully reversible |
| 5 | First post-0.1: durable `SignatureStore` backing, then the 22a inventory on measurement | 1 week+ | No |
| 6 | Pre-1.0 program as the open-items plan stages it | — | No |

Step 4's move is the one substantive re-ordering, and section 3 is its argument. Step 0 had no
home before this record: the sweep's steps are code increments with spec and plan pairs, while
the checklist repairs are documentation and would otherwise have ridden nobody's branch and
been applied from memory on the day.

## 6. Decisions still only the owner's

Unchanged from the 2026-08-30 sweep's own list of eight, plus two this record adds:

9. Whether the pre-flight proof of publish rights is a manual step on the list or a guard step
   in `release.yml` — this record recommends the list, and the recommendation is contestable.
10. Whether the CHANGELOG's banner and "Known not-done" block are flipped in the release commit
    or removed outright, given that `[0.1.0]` existing makes both redundant rather than merely
    false.

---

**What this record does not do.** It moves no register row, ticks no checkbox, edits no
checklist, and takes none of the four decisions in section 4. It adds one dated reading beside
the 2026-08-30 sweep, and it corrects that sweep on one point of mechanism (section 2.3). The
sweep remains the catalogue; this is the cut's gate set and the case for repairing the list
before running it.
