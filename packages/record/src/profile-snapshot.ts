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
// `Object.prototype` and is refused with the class instances. A Proxy is refused wherever it
// sits (`types.isProxy`, checked before anything else is asked of the object, so no trap
// runs): its reads can disagree from one read to the next, so no copy of it could be known to
// match what the digest projection reads. Every other object is read through descriptors, once
// each, which is what makes the copy and `profileDigest(hostObject)` agree. The limit: `isProxy`
// is a Node API, and so is this library (it already imports `node:crypto`).
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

import { types } from 'node:util';
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

const PLAIN_DATA = 'a profile must be plain data, such as an object literal or parsed JSON';

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

/** A Proxy is refused before any other question is asked of the object, so no trap runs. */
function refuseProxy(value: object, ctx: Ctx, what: string): void {
  if (types.isProxy(value)) {
    fail(ctx, `${what} is a Proxy — ${PLAIN_DATA}, and a Proxy can answer each read differently`);
  }
}

/** An object that is not what its slot expects. Says what the slot expects; the plain-data
 * tail is added only when the value is not plain-shaped at all (a plain object or an array in
 * the wrong slot IS plain data, so telling the host to use plain data would mislead). */
function wrongShape(ctx: Ctx, field: string, value: object, expected: string): never {
  const plainShaped = Array.isArray(value) || isPlainObject(value);
  fail(
    ctx,
    `${field} is ${describe(value)} — expected ${expected}${plainShaped ? '' : `; ${PLAIN_DATA}`}`,
  );
}

type Described = Array<[string, PropertyDescriptor]>;

/** Every own string-keyed property's descriptor, each read once. Nothing is judged yet, so a
 * caller can name the object (by its own `id`, taken from THESE descriptors) before a throw. */
function readDescriptors(obj: object): Described {
  const described: Described = [];
  for (const key of Object.getOwnPropertyNames(obj)) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    if (descriptor !== undefined) described.push([key, descriptor]);
  }
  return described;
}

/** The value of the `id` data property among `described`, if it is one. */
function idOf(described: Described): unknown {
  const found = described.find(([key]) => key === 'id');
  return found !== undefined && 'value' in found[1] ? found[1].value : undefined;
}

/** `[key, value]` for every descriptor; an accessor or a non-enumerable property throws. */
function entriesOf(described: Described, ctx: Ctx, where: string): Array<[string, unknown]> {
  const entries: Array<[string, unknown]> = [];
  for (const [key, descriptor] of described) {
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

function readEntries(obj: object, ctx: Ctx, where: string): Array<[string, unknown]> {
  return entriesOf(readDescriptors(obj), ctx, where);
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
  if (!Array.isArray(value)) wrongShape(ctx, field, value, 'an array of plain values');
  const elements = readElements(value, ctx, field);
  elements.forEach((element, index) => {
    if (!isPrimitive(element)) {
      if (typeof element === 'object')
        refuseProxy(element as object, ctx, `${field}: element ${index}`);
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
  if (!isPlainObject(value)) wrongShape(ctx, field, value, 'a plain object keyed by name');
  const entries = readEntries(value, ctx, field);
  for (const [name, member] of entries) {
    if (!isPrimitive(member)) {
      if (typeof member === 'object')
        refuseProxy(member as object, ctx, `${field}: the value for '${name}'`);
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
  refuseProxy(object, ctx, `${key} on ${where}`);
  if (slot === 'scalar') wrongShape(ctx, `${key} on ${where}`, object, 'a single value');
  if (slot === 'list') return copyPrimitiveList(object, key, where, ctx);
  if (slot === 'record') return copyRecord(object, key, where, ctx);
  if ('object' in slot) {
    if (!isPlainObject(object)) wrongShape(ctx, `${key} on ${where}`, object, 'a plain object');
    return copyObject(object, slot.object, key === 'sod' ? `sod of ${where}` : key, ctx);
  }
  return copyLegs(object, slot.objects, key, where, ctx);
}

function copyLegs(value: object, schema: Schema, key: string, where: string, ctx: Ctx): unknown[] {
  const field = `${key} on ${where}`;
  if (!Array.isArray(value)) wrongShape(ctx, field, value, 'an array of leg declarations');
  const copied = readElements(value, ctx, field).map((leg, index) => {
    if (isPrimitive(leg)) return leg;
    if (typeof leg === 'function') fail(ctx, `${field}: element ${index} is a function`);
    const object = leg as object;
    refuseProxy(object, ctx, `${field}: element ${index}`);
    if (!isPlainObject(object)) {
      wrongShape(ctx, `${field}: element ${index}`, object, 'a plain object');
    }
    const described = readDescriptors(object);
    const legId = idOf(described);
    const legWhere =
      typeof legId === 'string' && legId.length > 0 ? `leg '${legId}'` : `leg at position ${index}`;
    return copyEntries(entriesOf(described, ctx, legWhere), schema, legWhere, ctx);
  });
  return Object.freeze(copied) as unknown[];
}

function copyObject(obj: object, schema: Schema, where: string, ctx: Ctx): object {
  return copyEntries(readEntries(obj, ctx, where), schema, where, ctx);
}

function copyEntries(
  entries: Array<[string, unknown]>,
  schema: Schema,
  where: string,
  ctx: Ctx,
): object {
  const copied: Array<[string, unknown]> = [];
  for (const [key, value] of entries) {
    const slot = Object.hasOwn(schema.keys, key) ? schema.keys[key] : undefined;
    if (slot === undefined) {
      if (schema.strayWhere !== undefined && isRedemptionKey(key)) {
        throw new Error(strayRedemptionKeyMessage(ctx.head, key, schema.strayWhere));
      }
      if (typeof value === 'function' || value === undefined) continue;
      fail(
        ctx,
        `unknown key '${key}' on ${where} — a profile carries only the profile type's fields ` +
          '(SPEC §9.1, §9.2, §14); keep host metadata beside the profile, not in it',
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
  refuseProxy(object, byPosition, 'the profile');
  if (!isPlainObject(object)) {
    fail(byPosition, `the profile is ${describe(object)} — ${PLAIN_DATA}`);
  }
  const described = readDescriptors(object);
  const id = idOf(described);
  const ctx: Ctx =
    typeof id === 'string' && id.length > 0 ? { head: `invalid profile '${id}'` } : byPosition;
  return copyEntries(
    entriesOf(described, ctx, 'the profile'),
    PROFILE,
    'the profile',
    ctx,
  ) as ConfirmProfile;
}
