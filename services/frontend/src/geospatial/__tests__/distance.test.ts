import { describe, it, expect } from 'vitest';
import { calculateDistance, calculateDistanceVincenty } from '../distance';

describe('calculateDistance', () => {
  it('calculates distance between Bangkok and Nonthaburi (km)', () => {
    const bangkok = { latitude: 13.7563, longitude: 100.5018 };
    const nonthaburi = { latitude: 13.8621, longitude: 100.5144 };

    const distance = calculateDistance(bangkok, nonthaburi, 'km');
    expect(distance).toBeCloseTo(11.8, 1);
  });

  it('returns 0 for identical coordinates', () => {
    const coord = { latitude: 13.7563, longitude: 100.5018 };
    expect(calculateDistance(coord, coord, 'km')).toBe(0);
  });

  it('handles different units', () => {
    const coord1 = { latitude: 0, longitude: 0 };
    const coord2 = { latitude: 1, longitude: 0 };

    const distanceKm = calculateDistance(coord1, coord2, 'km');
    const distanceMi = calculateDistance(coord1, coord2, 'mi');
    const distanceM = calculateDistance(coord1, coord2, 'm');

    expect(distanceKm).toBeCloseTo(111.19, 1);
    expect(distanceMi).toBeCloseTo(69.09, 1);
    expect(distanceM).toBeCloseTo(111195, 0);
  });
});

describe('calculateDistanceVincenty', () => {
  it('returns 0 for identical coordinates', () => {
    const coord = { latitude: 0, longitude: 0 };
    expect(calculateDistanceVincenty(coord, coord)).toBe(0);
  });

  it('returns NaN for antipodal points (non-convergence)', () => {
    const coord1 = { latitude: 0, longitude: 0 };
    const coord2 = { latitude: 0, longitude: 180 };
    expect(Number.isNaN(calculateDistanceVincenty(coord1, coord2))).toBe(true);
  });

  it('handles equatorial lines', () => {
    const coord1 = { latitude: 0, longitude: 0 };
    const coord2 = { latitude: 0, longitude: 1 };
    const vincentyKm = calculateDistanceVincenty(coord1, coord2);
    expect(vincentyKm).toBeCloseTo(111.32, 1);
  });

  it('is close to haversine for typical distances', () => {
    const coord1 = { latitude: 13.7563, longitude: 100.5018 };
    const coord2 = { latitude: 13.8621, longitude: 100.5144 };

    const haversineKm = calculateDistance(coord1, coord2, 'km');
    const vincentyKm = calculateDistanceVincenty(coord1, coord2);

    expect(Math.abs(vincentyKm - haversineKm)).toBeLessThan(0.2);
  });
});
