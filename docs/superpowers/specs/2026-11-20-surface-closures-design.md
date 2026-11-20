# Per-handle frozen closures — design

**Date: 2026-11-20.** One finding of an external analysis, sanction-free.

## 1. What this answers

The agent and operator handles carried the kernel's read closures — `getRecord`, `readChain`,
`chainHead` — as the same, unfrozen function objects. Freezing a handle freezes the object, not
the functions on it. Code holding only the agent handle could define an own `bind`, `call` or
`apply` on one of those shared functions; operator-side code that wrote
`operator.getRecord.bind(operator)` then ran the agent's function with the operator handle as its
argument — enough to decide records. That breaks SPEC §9's capability split ("in-process
object-capability discipline, not a sandbox") and the guarantee `SECURITY.md` states: the agent
handle reaching a record-transitioning capability. The channel exists even where the realm's
built-ins are frozen, because the planted property is on the library's own function.

## 2. Rulings

- **Every function on both handles is a fresh closure per handle, frozen** (`handle-fn.ts`'s
  `handleFn`): nothing on one handle is the same object as anything on another, and nothing can
  be planted on either. All functions, not only the three shared reads, so the rule is uniform.
- **Behavior is unchanged:** each closure forwards every argument to its kernel function and
  returns what it returns; the kernel functions read no `this`.
- **Not covered, stated:** patching a shared built-in (`Function.prototype.bind`) in the same
  realm — SPEC §9 already disclaims a sandbox.
- **No sealed edit.** SPEC §9's sentence is the requirement this meets.

## 3. Pins

`packages/record/test/surface-closures.test.ts`: no function object is shared between the two
handles or between instances; every function on both handles is frozen; planting `bind`, `call`
or `apply` on any agent read throws `TypeError`, and the operator's `.bind(operator)` and
`.call(operator, …)` read the real record; the per-handle reads answer exactly as the kernel does.
Red first against the old source (three of five).
