import type { Coordinate } from './types';
import { calculateDistance } from './distance';

export interface RouteStop {
  id: string;
  coordinates: Coordinate;
}

export function calculateRouteDistance(stops: RouteStop[]): number {
  if (stops.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    total += calculateDistance(stops[i].coordinates, stops[i + 1].coordinates, 'km');
  }
  return total;
}

function nearestNeighborRoute(stops: RouteStop[], startIndex: number): RouteStop[] {
  const remaining = stops.slice();
  const route: RouteStop[] = [];

  const currentIndex = startIndex;
  route.push(remaining.splice(currentIndex, 1)[0]);

  while (remaining.length > 0) {
    const current = route[route.length - 1];
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i++) {
      const distance = calculateDistance(current.coordinates, remaining[i].coordinates, 'km');
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    route.push(remaining.splice(bestIndex, 1)[0]);
  }

  return route;
}

function twoOpt(route: RouteStop[]): RouteStop[] {
  if (route.length < 4) return route;
  let best = route.slice();
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 2; i++) {
      for (let k = i + 1; k < best.length - 1; k++) {
        const candidate = best
          .slice(0, i)
          .concat(best.slice(i, k + 1).reverse())
          .concat(best.slice(k + 1));
        if (calculateRouteDistance(candidate) + 1e-9 < calculateRouteDistance(best)) {
          best = candidate;
          improved = true;
        }
      }
    }
  }

  return best;
}

export function optimizeRoute(stops: RouteStop[], options: { startId?: string } = {}): RouteStop[] {
  if (stops.length <= 1) return stops.slice();

  const startIndex = options.startId
    ? Math.max(
        0,
        stops.findIndex((s) => s.id === options.startId)
      )
    : 0;

  const nn = nearestNeighborRoute(stops, startIndex);
  const improved = twoOpt(nn);

  if (!options.startId) return improved;
  if (improved[0]?.id === options.startId) return improved;

  const startAt = improved.findIndex((s) => s.id === options.startId);
  if (startAt <= 0) return improved;
  return improved.slice(startAt).concat(improved.slice(0, startAt));
}
