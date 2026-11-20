// @vidimera/record — handle-fn.ts: one handle's own function objects. Both handles are built
// from the same kernel closures; if they carried those closures themselves, a function would
// be reachable from both handles, and code holding only the agent handle could plant an own
// `bind`, `call` or `apply` on a shared read that operator-side code then invokes with the
// operator handle as its argument. Freezing a handle object does not freeze the functions on
// it. So each handle gets a fresh closure per kernel function, frozen: nothing on one handle
// is the same object as anything on another, and nothing can be planted on either.
//
// The limit, in the same breath: this closes the library's own channel only. Every function
// inherits from the realm's shared `Function.prototype`, so in-process agent code that can
// patch it (`Function.prototype.bind` itself) still reaches whatever operator code passes to
// `bind`, `call` or `apply` — in a default Node realm it can. Confining in-process agent code
// is the host's job (frozen intrinsics, no ambient module loading); SPEC §9: the capability
// split is in-process object-capability discipline, not a sandbox.

/**
 * A fresh, frozen closure that forwards every argument to `fn` and returns what it returns,
 * carrying `fn`'s `name` and `length`. What still differs from `fn`: identity, `toString`, and
 * (for an `async` kernel function) the `AsyncFunction` tag — the closure is a plain function
 * returning the same promise.
 */
export function handleFn<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const own = (...args: A): R => fn(...args);
  Object.defineProperty(own, 'name', { value: fn.name });
  Object.defineProperty(own, 'length', { value: fn.length });
  return Object.freeze(own);
}
