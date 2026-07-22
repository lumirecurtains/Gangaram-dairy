// ============================================================
// HAVERSINE — Gangaram Merchant Onboarding
// Module 7 — Pure mathematical distance computation
// ============================================================

const EARTH_RADIUS_KM = 6371;

/**
 * Converts degrees to radians.
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Computes the great-circle distance between two geographic coordinates
 * using the Haversine formula.
 *
 * @param lat1 - Latitude of point 1 in degrees
 * @param lng1 - Longitude of point 1 in degrees
 * @param lat2 - Latitude of point 2 in degrees
 * @param lng2 - Longitude of point 2 in degrees
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Checks whether a point is within a given radius from a center point.
 *
 * @param centerLat - Center latitude
 * @param centerLng - Center longitude
 * @param targetLat - Target latitude
 * @param targetLng - Target longitude
 * @param radiusKm - Maximum allowed distance in kilometers
 * @returns True if the target is within range
 */
export function isWithinRadius(
  centerLat: number,
  centerLng: number,
  targetLat: number,
  targetLng: number,
  radiusKm: number
): boolean {
  const distance = haversineDistance(centerLat, centerLng, targetLat, targetLng);
  return distance <= radiusKm;
}
