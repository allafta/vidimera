// @vidimera/record — kernel/intake.ts: argument-depth guards shared by the seams and the
// reads. Each throws a named caller error with the caller's head, and each runs before any
// store read, lock or append, so a malformed call leaves no trace and meets the same answer
// on every backing. An empty or unknown string is NOT a malformed id: it keeps the seam's
// existing answer (null, an empty chain, or its domain outcome). Only a non-string throws.

/** An id argument (`recordId`, `stagedRef`) must be a string. */
export function assertIdArg(seam: string, name: string, value: unknown): void {
  if (typeof value !== 'string') {
    throw new Error(`${seam}: ${name} must be a string`);
  }
}

/** An options bag is an absent argument, an explicit `undefined`, or an object. `null` is
 * not "absent": treating it as absent would hide a host bug. */
export function assertOptionsBag(seam: string, opts: unknown): void {
  if (opts !== undefined && (typeof opts !== 'object' || opts === null)) {
    throw new Error(`${seam}: options must be an object when supplied`);
  }
}
