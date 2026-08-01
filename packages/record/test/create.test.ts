import { describe, expect, it } from 'vitest';
import { create, VidimeraNotImplementedError } from '../src/index.js';

describe('create (walking skeleton)', () => {
  it('throws the loud not-implemented construction error', () => {
    expect(() => create({})).toThrow(VidimeraNotImplementedError);
  });

  it('names the gap in the message', () => {
    expect(() => create({})).toThrow(/not implemented/);
  });
});
