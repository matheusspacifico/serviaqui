export const EARTH_RADIUS_KM = 6371;
export const CITY_DETECTION_RADIUS_KM = 100;
export const KM_PER_DEGREE = 111.32;

export type Coordinates = { lat: number; lng: number };
export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function isValidCoordinates(value: unknown): value is Coordinates {
  if (typeof value !== "object" || value === null) return false;
  const { lat, lng } = value as Record<string, unknown>;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function roundCoordinates(c: Coordinates): Coordinates {
  return {
    lat: Math.round(c.lat * 1000) / 1000,
    lng: Math.round(c.lng * 1000) / 1000,
  };
}

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) *
      Math.cos(toRadians(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function boundingBox(center: Coordinates, radiusKm: number): BoundingBox {
  const dLat = radiusKm / KM_PER_DEGREE;
  const cos = Math.max(Math.cos(toRadians(center.lat)), 0.01);
  const dLng = radiusKm / (KM_PER_DEGREE * cos);
  return {
    minLat: center.lat - dLat,
    maxLat: center.lat + dLat,
    minLng: center.lng - dLng,
    maxLng: center.lng + dLng,
  };
}

export function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.max(100, Math.round((km * 1000) / 100) * 100);
    return meters >= 1000 ? "≈ 1,0 km" : `≈ ${meters} m`;
  }
  if (km < 10) {
    const rounded = Math.round(km * 10) / 10;
    if (rounded < 10) return `≈ ${rounded.toFixed(1).replace(".", ",")} km`;
  }
  return `≈ ${Math.round(km)} km`;
}
