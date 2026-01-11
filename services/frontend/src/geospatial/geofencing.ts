import type { Coordinate } from './types';
import { calculateDistance } from './distance';

export interface CircleGeofence {
  center: Coordinate;
  radiusMeters: number;
}

export interface PolygonGeofence {
  vertices: Coordinate[];
}

function isPointOnSegment(
  point: Coordinate,
  a: Coordinate,
  b: Coordinate,
  epsilon: number
): boolean {
  const cross =
    (point.longitude - a.longitude) * (b.latitude - a.latitude) -
    (point.latitude - a.latitude) * (b.longitude - a.longitude);
  if (Math.abs(cross) > epsilon) return false;

  const dot =
    (point.longitude - a.longitude) * (b.longitude - a.longitude) +
    (point.latitude - a.latitude) * (b.latitude - a.latitude);
  if (dot < -epsilon) return false;

  const lenSq =
    (b.longitude - a.longitude) * (b.longitude - a.longitude) +
    (b.latitude - a.latitude) * (b.latitude - a.latitude);
  if (dot - lenSq > epsilon) return false;

  return true;
}

export function isPointInCircle(
  point: Coordinate,
  geofence: CircleGeofence,
  options: { inclusive?: boolean } = {}
): boolean {
  const inclusive = options.inclusive ?? true;
  const distanceMeters = calculateDistance(point, geofence.center, 'm');
  return inclusive
    ? distanceMeters <= geofence.radiusMeters
    : distanceMeters < geofence.radiusMeters;
}

export function isPointInPolygon(
  point: Coordinate,
  geofence: PolygonGeofence,
  options: { inclusive?: boolean; epsilon?: number } = {}
): boolean {
  const inclusive = options.inclusive ?? true;
  const epsilon = options.epsilon ?? 1e-10;

  const vertices = geofence.vertices;
  if (vertices.length < 3) return false;

  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    if (isPointOnSegment(point, a, b, epsilon)) return inclusive;
  }

  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].longitude,
      yi = vertices[i].latitude;
    const xj = vertices[j].longitude,
      yj = vertices[j].latitude;

    const intersect =
      yi > point.latitude !== yj > point.latitude &&
      point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}
