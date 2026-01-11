import { describe, it, expect } from 'vitest';
import { calculateRouteDistance, optimizeRoute, type RouteStop } from '../routeOptimization';

describe('optimizeRoute', () => {
  it('returns a route containing all stops exactly once', () => {
    const stops: RouteStop[] = [
      { id: 'a', coordinates: { latitude: 0, longitude: 0 } },
      { id: 'b', coordinates: { latitude: 0, longitude: 1 } },
      { id: 'c', coordinates: { latitude: 1, longitude: 1 } },
      { id: 'd', coordinates: { latitude: 1, longitude: 0 } },
    ];

    const optimized = optimizeRoute(stops);
    expect(optimized.map((s) => s.id).sort()).toEqual(stops.map((s) => s.id).sort());
    expect(new Set(optimized.map((s) => s.id)).size).toBe(stops.length);
  });

  it('does not increase total distance for a zig-zag order', () => {
    const stops: RouteStop[] = [
      { id: 'a', coordinates: { latitude: 0, longitude: 0 } },
      { id: 'b', coordinates: { latitude: 0, longitude: 3 } },
      { id: 'c', coordinates: { latitude: 0, longitude: 1 } },
      { id: 'd', coordinates: { latitude: 0, longitude: 4 } },
      { id: 'e', coordinates: { latitude: 0, longitude: 2 } },
    ];

    const baseline = calculateRouteDistance(stops);
    const optimized = optimizeRoute(stops);
    const optimizedDistance = calculateRouteDistance(optimized);

    expect(optimizedDistance).toBeLessThanOrEqual(baseline);
  });

  it('respects startId when provided', () => {
    const stops: RouteStop[] = [
      { id: 'a', coordinates: { latitude: 0, longitude: 0 } },
      { id: 'b', coordinates: { latitude: 0, longitude: 1 } },
      { id: 'c', coordinates: { latitude: 1, longitude: 1 } },
    ];

    const optimized = optimizeRoute(stops, { startId: 'b' });
    expect(optimized[0].id).toBe('b');
  });
});
