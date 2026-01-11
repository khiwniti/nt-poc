/**
 * Distance calculation utilities using Haversine formula
 * Provides accurate distance calculations between GPS coordinates
 */

/**
 * Calculate distance between two points using Haversine formula
 * The Haversine formula determines the great-circle distance between two points
 * on a sphere given their longitudes and latitudes.
 *
 * @param lat1 Latitude of point 1 (degrees, range: -90 to 90)
 * @param lon1 Longitude of point 1 (degrees, range: -180 to 180)
 * @param lat2 Latitude of point 2 (degrees, range: -90 to 90)
 * @param lon2 Longitude of point 2 (degrees, range: -180 to 180)
 * @returns Distance in kilometers (rounded to 2 decimal places)
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert degrees to radians
 * @param degrees Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate driving time estimate based on distance
 * Uses average speed to estimate travel duration
 *
 * @param distanceKm Distance in kilometers
 * @param avgSpeedKmh Average speed in km/h (default: 60 km/h for mixed driving)
 * @returns Estimated time in minutes (rounded)
 */
export function estimateDrivingTime(
  distanceKm: number,
  avgSpeedKmh: number = 60
): number {
  const hours = distanceKm / avgSpeedKmh;
  return Math.round(hours * 60); // Convert to minutes and round
}

/**
 * Format distance for display
 * Shows meters for short distances, kilometers for longer distances
 *
 * @param distanceKm Distance in kilometers
 * @returns Formatted string (e.g., "5.2 km" or "850 m")
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Format duration for display
 * Shows hours and minutes for longer durations, just minutes for shorter
 *
 * @param minutes Duration in minutes
 * @returns Formatted string (e.g., "2h 30m" or "45m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Generate Google Maps directions URL
 * Creates a URL that opens Google Maps with directions between two points
 *
 * @param originLat Origin latitude
 * @param originLng Origin longitude
 * @param destLat Destination latitude
 * @param destLng Destination longitude
 * @returns Google Maps URL with driving directions
 */
export function getDirectionsUrl(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
}
