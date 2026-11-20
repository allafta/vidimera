// @vidimera/record — handle-fn.ts: one handle's own function objects. Both handles are built
// from the same kernel closures; if they carried those closures themselves, a function would
// be reachable from both handles, and code holding only the agent handle could plant an own
// `bind`, `call` or `apply` on a shared read that operator-side code then invokes with the
// operator handle as its argument. Freezing a handle object does not freeze the functions on
// it. So each handle gets a fresh closure per kernel function, frozen: nothing on one handle
// is the same object as anything on another, and nothing can be planted on either. A shared
// primordial (`Function.prototype` itself) stays outside this — SPEC §9: the capability split
// is in-process object-capability discipline, not a sandbox.

/** A fresh, frozen closure that forwards every argument to `fn` and returns what it returns. */
export function handleFn<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  return Object.freeze((...args: A): R => fn(...args));
}
