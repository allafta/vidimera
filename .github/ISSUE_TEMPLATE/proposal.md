---
name: Proposal
about: A capability, API change, or scope question — before you build it
labels: proposal
---

## The problem

<!-- What can't be done today, or costs too much. Problem first; the feature is a means. -->

## The proposal

<!-- The shape of the change: which seam, which surface, what a caller would write. -->

## Scope check

This repository has a scope discipline (`docs/concept/SCOPING-GUIDE.md`), so three
questions decide most proposals — answering them up front saves everyone a round-trip:

- **Purpose trace.** Does this serve the kernel confirm loop, or the governed-host bar?
  (`docs/concept/CONCEPT.md` §3 — every capability traces to one of the two, explicitly.)
- **The operator-only line.** Is this meaningful to the operator who runs the application,
  or only to an outside party? Outside-party capabilities are out of scope by design, not
  backlog.
- **Already decided?** Check `docs/concept/DECISIONS.md` (thirty load-bearing decisions
  with their re-deciding costs), `docs/concept/OPEN-QUESTIONS.md`, and
  `docs/process/deferral-register.md` — your proposal may already have a recorded stance,
  a register row with a trigger, or a stated cost of re-deciding.

## What it would take

<!-- Optional: affected files/seams, new refusal codes, spec sections touched. A proposal
     that touches docs/concept/ needs a sanction through the scope machinery — say so if
     you know it does. -->
