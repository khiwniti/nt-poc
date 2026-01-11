import { describe, it, expect } from 'vitest';
import { isValidCoordinate, toRadians } from '../types';

describe('toRadians', () => {
  it('converts degrees to radians', () => {
    expect(toRadians(180)).toBeCloseTo(Math.PI, 10);
  });
});

describe('isValidCoordinate', () => {
  it('returns true for valid latitude/longitude', () => {
    expect(isValidCoordinate({ latitude: 13.7563, longitude: 100.5018 })).toBe(true);
  });

  it('rejects non-finite values', () => {
    expect(isValidCoordinate({ latitude: Number.NaN, longitude: 0 })).toBe(false);
    expect(isValidCoordinate({ latitude: 0, longitude: Number.POSITIVE_INFINITY })).toBe(false);
  });

  it('rejects out-of-range values', () => {
    expect(isValidCoordinate({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidCoordinate({ latitude: 0, longitude: 181 })).toBe(false);
  });
});
