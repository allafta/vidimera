# Staged-draft integrity and `open()`'s option snapshot — design

**Date: 2026-11-20.** Two findings of an external analysis, both sanction-free: a persisted
staged draft is bound without being checked against its content-derived reference, and `open()`
re-reads caller-supplied options after it has verified them.

## 1. What this increment answers

- **The staged draft is trusted as stored.** `open(stagedRef)` reads the draft with
  `store.getStaged(stagedRef)` and binds its `profileId`, `legId`, `subjectRef` and
  `contentDigest` into the genesis. A staged reference is content-derived (SPEC §3, §12:
  `deriveStagedRef` over those four fields), but nothing re-derives it or compares the draft's own
  `id`. A storage-writing insider who edits a pending staged row between `stage()` and `open()`
  can redirect the record to another registered profile with the same leg id, or to another
  subject: the redirected genesis is bound, signed at AL2, and verifies clean; the intended
  profile's controls (required consultations) are skipped and the intended `(profile, subject)`
  pair escapes exclusivity. The `proposed` option's draft is read the same way, so its
  `contentDigest` can be rewritten into `proposedDigest`.
- **Options are read twice.** `verifySupersedes` and `verifyPriorLegs` build the reference they
  record by re-reading `ref.recordId` and `ref.chainHead` from the caller's object after their
  awaits, and `open()` checks `opts.policyDigest` for presence at one point and binds it at
  another, with awaits between. A value that changes between the reads reaches the immutable
  genesis unverified (a recorded `supersedes` naming a record that was never verified; a
  policy-declaring genesis bound with no `policyDigest`, which then refuses `policy-drift`). Only
  the trusted host can trigger it — by mutating its own argument mid-call, or with an accessor
  whose value changes — and a full swap of `recordId` and `chainHead` is already caught.

## 2. Goals, non-goals, anti-goals

- **Goal.** `open()` binds only a staged draft that re-derives to the reference it was asked for,
  for both the opened draft and the `proposed` draft; a mismatch throws and records nothing.
- **Goal.** `open()` reads each caller-supplied option once, at entry, into a snapshot it uses
  for every check and every binding.
- **Non-goal.** An insider who writes a whole new, self-consistent draft: its reference is the
  digest of its own fields, so it lives under a different reference, and `open()` binds it only
  if the host asks for that reference. The check makes a draft's fields unchangeable under the
  reference the host holds; it does not authenticate who staged a draft (SPEC §2 already says the
  provenance binding never proves who authored a draft).
- **Anti-goal.** A new refusal code, or a change to any byte of an honest genesis.

## 3. Rulings

**3.1 The check.** After each `getStaged` in `open()` — the opened draft and the `proposed`
draft — the draft must satisfy `draft.id === ref` and
`deriveStagedRef({ contentDigest, profileId, subjectRef, legId }) === ref`, reading each field
once. Otherwise `open()` throws an `Error` naming the reference and saying the persisted draft
does not match it — SPEC §8's loud-throw posture for "corrupted or foreign persisted config read
back at a seam": a caller error class, nothing appended, no refusal recorded. The check runs
before any other use of the draft. An unknown reference keeps its existing throw.

**3.2 The snapshot.** At entry, after the existing option validation, `open()` copies what it
will use — `supersedes.{recordId, chainHead}`, each `priorRecordRefs[i].{recordId, chainHead}`,
`policyDigest`, `proposed.stagedRef` — into plain locals, read once each, and every later check
and binding uses only those. `verifySupersedes` and `verifyPriorLegs` read their reference's
fields once into locals before their first await, and record those locals. An accessor that
throws during the snapshot propagates as the caller error it is.

**3.3 Docs and records.** The guide's provenance sentences that call `proposedDigest` "the
agent's original" say it is the digest of the draft the store held under that reference when the
record opened, which now must re-derive to it. CHANGELOG `[Unreleased]` (`Fixed`), a status-record
section, `CLAUDE.md`'s counts.

## 4. Approaches

- **(a) Re-derive and compare in `open()`, snapshot at entry (chosen).** One digest per draft per
  `open()`, local to the seam that binds.
- **(b) Validate in each backing's `getStaged`.** Puts a kernel invariant into every adapter,
  including hosts' own; rejected.
- **(c) A refusal code for a tampered draft.** A storage fault is not a domain outcome (SPEC §8);
  rejected.

## 5. Pins

Over `MemoryStore` and `SqliteStore` (the staged row edited in place: `MemoryStore` through a
store wrapper whose `getStaged` returns an altered copy, SQLite by SQL): a draft whose
`profileId`, `subjectRef`, `legId` or `contentDigest` was edited throws and appends nothing; a
draft whose `id` was edited throws; the `proposed` draft likewise; an untampered draft opens with
byte-identical genesis (the frozen digests stay green). The snapshot: an options object whose
`supersedes.recordId`, a `priorRecordRefs` entry, or `policyDigest` changes after the first read
(an accessor that returns a different value on its second read) records the first-read value or
refuses on it — never a value that was not verified; `policyDigest` cleared mid-call no longer
reaches the genesis as absent.

## 6. Exit

Every gate clean; a whole-branch review on the most capable model; one fix wave.

## 7. Amended after review

The review found no code defect and asked for record and message fixes. Recorded in the status
section: the SPEC §8 and §9 reading (the quoted passages describe a draft that re-derives; one
that does not is corrupted persisted data and throws first, as `finalize` orders integrity before
profile resolution; a SPEC finding if the owner reads the exception as covering any draft). Also:
the check derives with the default digest algorithm (a stated limit under SPEC §7 migration); the
throwing-accessor change stated generally; the `typeof` guards' rationale corrected (defensive);
and the error message cites SPEC §12 and names a Store that does not round-trip the draft.
