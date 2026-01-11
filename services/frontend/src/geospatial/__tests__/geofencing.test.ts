import { describe, it, expect } from 'vitest';
import { isPointInCircle, isPointInPolygon } from '../geofencing';

describe('isPointInCircle', () => {
  it('returns true for a point inside the radius', () => {
    const center = { latitude: 0, longitude: 0 };
    const point = { latitude: 0.005, longitude: 0 }; // ~556m

    expect(isPointInCircle(point, { center, radiusMeters: 1000 })).toBe(true);
  });

  it('returns false for a point outside the radius', () => {
    const center = { latitude: 0, longitude: 0 };
    const point = { latitude: 0.02, longitude: 0 }; // ~2.2km

    expect(isPointInCircle(point, { center, radiusMeters: 1000 })).toBe(false);
  });

  it('respects inclusive=false on boundary', () => {
    const center = { latitude: 0, longitude: 0 };
    const point = { latitude: 0, longitude: 0 };
    expect(isPointInCircle(point, { center, radiusMeters: 0 }, { inclusive: false })).toBe(false);
  });
});

describe('isPointInPolygon', () => {
  const square = {
    vertices: [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
      { latitude: 1, longitude: 1 },
      { latitude: 1, longitude: 0 },
    ],
  };

  it('returns true for a point inside the polygon', () => {
    expect(isPointInPolygon({ latitude: 0.5, longitude: 0.5 }, square)).toBe(true);
  });

  it('returns false for a point outside the polygon', () => {
    expect(isPointInPolygon({ latitude: 1.5, longitude: 0.5 }, square)).toBe(false);
  });

  it('treats a point on the edge as inside by default', () => {
    expect(isPointInPolygon({ latitude: 0, longitude: 0.5 }, square)).toBe(true);
  });

  it('returns false for degenerate polygons', () => {
    expect(
      isPointInPolygon(
        { latitude: 0, longitude: 0 },
        {
          vertices: [
            { latitude: 0, longitude: 0 },
            { latitude: 1, longitude: 1 },
          ],
        }
      )
    ).toBe(false);
  });

  it('does not treat collinear points outside the segment as on-edge', () => {
    expect(isPointInPolygon({ latitude: 0, longitude: -1 }, square)).toBe(false);
    expect(isPointInPolygon({ latitude: 0, longitude: 2 }, square)).toBe(false);
  });
});
