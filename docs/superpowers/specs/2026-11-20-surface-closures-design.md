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
- **Calls behave as before:** each closure forwards every argument to its kernel function and
  returns what it returns (the kernel functions read no `this`), and keeps the kernel function's
  `name` and `length`. What a host can see change: identity (`agent.getRecord !==
  operator.getRecord`), a property attached to a handle function now throws, and `toString` and
  the `AsyncFunction` tag differ.
- **Not covered, stated:** every function inherits from the realm's shared `Function.prototype`,
  so in-process agent code that can patch `Function.prototype.bind` (any code, in a default Node
  realm) still reaches what operator code passes to it. Confining in-process agent code is the
  host's job (frozen built-ins, no ambient module loading); SPEC §9 already disclaims a sandbox.
- **ARCHITECTURE §2's "pure select-and-freeze" (sealed), read, not edited:** each surface now
  selects, wraps and freezes; the sentence's claim — the surface exposes exactly the selected
  subset, frozen — still holds, and no sealed sentence changes.
- **No sealed edit.** SPEC §9's sentence is the requirement this meets.

## 3. Pins

`packages/record/test/surface-closures.test.ts`: no function object is shared between the two
handles or between instances; every function on both handles is frozen; an agent's attempts to
plant `bind`, `call` or `apply` on its reads all fail, and the operator's `.bind(operator)`,
`.call(operator, …)` and `.apply(operator, …)` hand the operator to no planted function and read
the real record, head and chain; the two handles read the same answers; every handle function
keeps its kernel function's `name` and `length`. Against the old source three of the six fail,
the leak pin with "no planted function ever received the operator handle".

## 4. Amended after review

The review found the limit stated too narrowly (it read as a stronger attacker than any in-process
agent code in a default realm), name and length lost, host-visible changes unlisted, a leak pin
that could not fail on its own, and `create.ts`'s "pure select-and-freeze" comment stale. All
fixed: the limit, here and in the guide, `SECURITY.md`, the CHANGELOG and the record; `handleFn`
keeps `name` and `length`; the leak pin now fails on the old source for the leak itself.
