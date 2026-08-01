/**
 * Walking skeleton. The spec's public entry point exists so the toolchain runs
 * against real code, and it refuses loudly: no build-order increment has landed
 * in this repository yet. Feature-guard discipline from day one — unimplemented
 * means a construction-time throw, never silent degradation.
 */

export class VidimeraNotImplementedError extends Error {
  constructor() {
    super(
      'vidimera: create() is not implemented - no build-order increment has landed in this repository yet',
    );
    this.name = 'VidimeraNotImplementedError';
  }
}

export function create(_config: unknown): never {
  throw new VidimeraNotImplementedError();
}
