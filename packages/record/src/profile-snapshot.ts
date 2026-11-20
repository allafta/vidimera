// @vidimera/record — profile-snapshot.ts: the one place a host's profile object is READ.
// `create()` turns each profile into a fresh, deeply frozen, plain-data copy here; validation
// (`config.ts`'s `validateProfile`) and the digest (`profile-digest.ts`) then run on the copy,
// and the kernel keeps only the copy. Mutating the host's object after `create()` therefore
// changes nothing: not what a seam enforces, not the digest a genesis binds.
//
// PLAIN DATA ONLY. Every object in a profile must be a plain object (prototype
// `Object.prototype` or `null`) or an array (prototype `Array.prototype`), and every own
// string-keyed property an enumerable DATA property. That is what the digest projection reads,
// so the copy keeps exactly what the projection would, and `profileDigest(hostObject)` equals
// the digest the instance binds for every profile this module accepts. A class instance, an
// `Object.create(proto)` object, an accessor, a non-enumerable property, a `Set`/`Map` or a
// sparse array would be enforced through `[[Get]]` yet missed (or differently read) by the
// projection, so each throws here and says what it found. Symbol-keyed properties are ignored,
// as the projection and the kernel ignore them. An object from another realm has a different
// `Object.prototype` and is refused with the class instances. Each property's descriptor is
// read once, so an object whose reads disagree from one read to the next still yields one
// consistent copy.
//
// THE SCHEMA is SPEC §9.1's field table, nested, and bounded: list elements are primitives and
// are never recursed into, so a cyclic structure meets an unknown key or a non-primitive
// element before it can loop. Per own key:
//  - a known key holding `undefined` is omitted (an absent key, as the digest already folds it);
//  - a known key holding a function throws;
//  - a primitive (including `null`) in ANY slot is copied as is, so `validateProfile` judges it
//    with its own message;
//  - an array in an object slot, and an object or array in a scalar slot, throw naming the field;
//  - an unknown key holding a function or `undefined` is dropped (SPEC §4: the projection
//    excludes host code references), a redemption field off `redeem` throws the stray-key
//    message, and any other unknown key throws, naming the profile and where it sits.
// Messages use `validateProfile`'s `invalid profile '<id>': …` register; a profile whose id is
// not yet a usable string is named by its position in `config.profiles` instead.

import { type ConfirmProfile, isRedemptionKey, strayRedemptionKeyMessage } from './config.js';

type Slot = 'scalar' | 'list' | 'record' | { object: Schema } | { objects: Schema };

interface Schema {
  /** What a redemption field found here (off `redeem`) is called in the stray-key message. */
  strayWhere?: string;
  keys: Readonly<Record<string, Slot>>;
}

const SOD: Schema = { keys: { notActorOf: 'list' } };
const LEG: Schema = {
  strayWhere: 'leg',
  keys: {
    id: 'scalar',
    allowedAuthorities: 'list',
    sod: { object: SOD },
    proposer: 'scalar',
    ackMode: 'scalar',
    requiredAcks: 'list',
    requiredConsultations: 'list',
    freshness: 'record',
    eligibility: 'scalar',
    decline: 'scalar',
    terminalRefusals: 'list',
  },
};
const SUBJECT: Schema = { keys: { canonicalizerRef: 'scalar' } };
const EXPIRY: Schema = { keys: { ttl: 'scalar' } };
const REDEEM: Schema = {
  keys: {
    confirmToRedeem: 'scalar',
    redeemBound: 'scalar',
    reverify: 'scalar',
    result: 'scalar',
  },
};
const PROFILE: Schema = {
  strayWhere: 'top-level profile',
  keys: {
    id: 'scalar',
    subject: { object: SUBJECT },
    legs: { objects: LEG },
    captureMode: 'scalar',
    expiry: { object: EXPIRY },
    policySource: 'scalar',
    redeem: { object: REDEEM },
    signing: 'scalar',
  },
};

interface Ctx {
  /** `invalid profile '<id>'`, or the position form while the id is not a usable string. */
  head: string;
}

const PLAIN_DATA = 'a profile must be plain data (an object literal or parsed JSON)';

function fail(ctx: Ctx, message: string): never {
  throw new Error(`${ctx.head}: ${message}`);
}

function isPrimitive(value: unknown): boolean {
  return value === null || (typeof value !== 'object' && typeof value !== 'function');
}

/** What an object IS, for a message: the shape the host handed in. */
function describe(value: object): string {
  if (Array.isArray(value)) return 'an array';
  const proto: unknown = Object.getPrototypeOf(value);
  if (proto === Object.prototype || proto === null) return 'a plain object';
  const tag = Object.prototype.toString.call(value).slice(8, -1);
  if (tag !== 'Object') return `a ${tag}`;
  return "an object with a non-plain prototype (a class instance, an Object.create(…) object or another realm's object)";
}

function isPlainObject(value: object): boolean {
  if (Array.isArray(value)) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Every own string-keyed property of a plain object as `[key, value]`, each descriptor read
 * once; an accessor or a non-enumerable property throws. */
function readEntries(obj: object, ctx: Ctx, where: string): Array<[string, unknown]> {
  const entries: Array<[string, unknown]> = [];
  for (const key of Object.getOwnPropertyNames(obj)) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    if (descriptor === undefined) continue;
    if (!('value' in descriptor)) {
      fail(ctx, `${key} on ${where} is an accessor — ${PLAIN_DATA}, and an accessor is read live`);
    }
    if (descriptor.enumerable !== true) {
      fail(
        ctx,
        `${key} on ${where} is a non-enumerable property — ${PLAIN_DATA}; the digest reads only enumerable properties`,
      );
    }
    entries.push([key, descriptor.value]);
  }
  return entries;
}

/** The elements of a real array, in order, each descriptor read once. A hole, an extra
 * property or a non-enumerable element throws. */
function readElements(arr: unknown[], ctx: Ctx, field: string): unknown[] {
  if (Object.getPrototypeOf(arr) !== Array.prototype) {
    fail(ctx, `${field} is an array of another class or realm — ${PLAIN_DATA}`);
  }
  const length = arr.length;
  const names = Object.getOwnPropertyNames(arr);
  const indexNames = names.filter((n) => n !== 'length' && /^(0|[1-9]\d*)$/.test(n));
  if (indexNames.length !== length) {
    fail(ctx, `${field} is a sparse array (${length - indexNames.length} hole(s)) — ${PLAIN_DATA}`);
  }
  if (names.length !== length + 1) {
    fail(ctx, `${field} is an array carrying an extra property — ${PLAIN_DATA}`);
  }
  const elements: unknown[] = [];
  for (let i = 0; i < length; i += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(arr, String(i));
    if (descriptor === undefined || !('value' in descriptor) || descriptor.enumerable !== true) {
      fail(ctx, `${field} has an accessor or non-enumerable element at ${i} — ${PLAIN_DATA}`);
    }
    elements.push(descriptor.value);
  }
  return elements;
}

function copyPrimitiveList(value: object, key: string, where: string, ctx: Ctx): unknown[] {
  const field = `${key} on ${where}`;
  if (!Array.isArray(value)) {
    fail(ctx, `${field} is ${describe(value)} — expected an array (${PLAIN_DATA})`);
  }
  const elements = readElements(value, ctx, field);
  elements.forEach((element, index) => {
    if (!isPrimitive(element)) {
      fail(
        ctx,
        `${field}: element ${index} is ${typeof element === 'function' ? 'a function' : describe(element as object)} — list entries are plain values`,
      );
    }
  });
  return Object.freeze(elements) as unknown[];
}

function copyRecord(value: object, key: string, where: string, ctx: Ctx): object {
  const field = `${key} on ${where}`;
  if (!isPlainObject(value)) {
    fail(
      ctx,
      `${field} is ${describe(value)} — expected a plain object keyed by name (${PLAIN_DATA})`,
    );
  }
  const entries = readEntries(value, ctx, field);
  for (const [name, member] of entries) {
    if (!isPrimitive(member)) {
      fail(
        ctx,
        `${field}: the value for '${name}' is ${typeof member === 'function' ? 'a function' : describe(member as object)} — expected a plain value`,
      );
    }
  }
  // `Object.fromEntries` creates own properties, so an own `__proto__` key survives.
  return Object.freeze(Object.fromEntries(entries));
}

function copySlot(value: unknown, slot: Slot, key: string, where: string, ctx: Ctx): unknown {
  if (isPrimitive(value)) return value;
  const object = value as object;
  if (slot === 'scalar') {
    fail(
      ctx,
      `${key} on ${where} is ${describe(object)} — expected a single value (${PLAIN_DATA})`,
    );
  }
  if (slot === 'list') return copyPrimitiveList(object, key, where, ctx);
  if (slot === 'record') return copyRecord(object, key, where, ctx);
  if ('object' in slot) {
    if (!isPlainObject(object)) {
      fail(
        ctx,
        `${key} on ${where} is ${describe(object)} — expected a plain object (${PLAIN_DATA})`,
      );
    }
    return copyObject(object, slot.object, key === 'sod' ? `sod of ${where}` : key, ctx);
  }
  return copyLegs(object, key, where, ctx);
}

function copyLegs(value: object, key: string, where: string, ctx: Ctx): unknown[] {
  const field = `${key} on ${where}`;
  if (!Array.isArray(value)) {
    fail(ctx, `${field} is ${describe(value)} — expected an array (${PLAIN_DATA})`);
  }
  const copied = readElements(value, ctx, field).map((leg, index) => {
    if (isPrimitive(leg)) return leg;
    if (typeof leg === 'function') fail(ctx, `${field}: element ${index} is a function`);
    const object = leg as object;
    if (!isPlainObject(object)) {
      fail(
        ctx,
        `${field}: element ${index} is ${describe(object)} — expected a plain object (${PLAIN_DATA})`,
      );
    }
    const idDescriptor = Object.getOwnPropertyDescriptor(object, 'id');
    const legId: unknown =
      idDescriptor !== undefined && 'value' in idDescriptor ? idDescriptor.value : undefined;
    const legWhere =
      typeof legId === 'string' && legId.length > 0 ? `leg '${legId}'` : `leg at position ${index}`;
    return copyObject(object, LEG, legWhere, ctx);
  });
  return Object.freeze(copied) as unknown[];
}

function copyObject(obj: object, schema: Schema, where: string, ctx: Ctx): object {
  const copied: Array<[string, unknown]> = [];
  for (const [key, value] of readEntries(obj, ctx, where)) {
    const slot = Object.hasOwn(schema.keys, key) ? schema.keys[key] : undefined;
    if (slot === undefined) {
      if (schema.strayWhere !== undefined && isRedemptionKey(key)) {
        throw new Error(strayRedemptionKeyMessage(ctx.head, key, schema.strayWhere));
      }
      if (typeof value === 'function' || value === undefined) continue;
      fail(
        ctx,
        `unknown key '${key}' on ${where} — a profile carries only the fields SPEC §9.1 names`,
      );
    }
    if (value === undefined) continue;
    if (typeof value === 'function') {
      fail(
        ctx,
        `${key} on ${where} is a function — a profile field is data, never a host callback`,
      );
    }
    copied.push([key, copySlot(value, slot, key, where, ctx)]);
  }
  return Object.freeze(Object.fromEntries(copied));
}

/**
 * Copies `input` (one element of `config.profiles`) into a deeply frozen plain-data
 * `ConfirmProfile`, per the schema above. Throws an `invalid profile` `Error` for anything
 * that is not plain data or does not fit the schema; judges nothing else (`validateProfile`
 * runs on the result). `position` is the index in `config.profiles`, named in a message only
 * while the profile's own id is not a usable string.
 */
export function snapshotProfile(input: unknown, position: number): ConfirmProfile {
  const byPosition: Ctx = { head: `invalid profile at position ${position} of config.profiles` };
  if (isPrimitive(input) || typeof input === 'function') {
    fail(byPosition, `expected a profile object, found ${input === null ? 'null' : typeof input}`);
  }
  const object = input as object;
  if (!isPlainObject(object)) {
    fail(byPosition, `the profile is ${describe(object)} — ${PLAIN_DATA}`);
  }
  const idDescriptor = Object.getOwnPropertyDescriptor(object, 'id');
  const id: unknown =
    idDescriptor !== undefined && 'value' in idDescriptor ? idDescriptor.value : undefined;
  const ctx: Ctx =
    typeof id === 'string' && id.length > 0 ? { head: `invalid profile '${id}'` } : byPosition;
  return copyObject(object, PROFILE, 'the profile', ctx) as ConfirmProfile;
}
