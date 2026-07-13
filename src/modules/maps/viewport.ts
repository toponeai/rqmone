/**
 * Viewport helpers for the interactive Earth.
 *
 * The globe camera is expressed as { lat, lng, altitude } where altitude is in
 * "planet radii" (globe-gl convention): 0 = surface, ~2.5 = "space" default.
 * We derive:
 *   - a rough lat/lng bounding box of what's visible
 *   - a zoom scalar (0 = far, 12+ = street level)
 *   - a clustering "precision" (higher = finer grid cells server-side)
 *
 * These are intentionally approximations — clustering just needs stable bins,
 * and the bbox is only a pre-filter (server still validates coordinates).
 */

export interface GlobeCamera {
  lat: number;
  lng: number;
  altitude: number;
}

export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/** Above this precision, return raw entity points instead of clusters. */
export const RAW_POINTS_PRECISION_THRESHOLD = 10;

/**
 * Map altitude → a discrete zoom level (0..14). Larger altitude = smaller zoom.
 * Rounded so small camera jitters produce the same key and TanStack Query
 * dedupes identical viewports.
 */
export function altitudeToZoom(altitude: number): number {
  const raw = Math.log2(2.5 / Math.max(altitude, 0.02));
  return Math.max(0, Math.min(14, Math.round(raw + 2)));
}

/** Higher zoom → higher precision → smaller grid cells server-side. */
export function zoomToPrecision(zoom: number): number {
  return Math.max(2, Math.min(14, zoom + 2));
}

/**
 * Approximate half-angle (in degrees) of the visible cap of the globe at a
 * given altitude, using camera-on-sphere geometry:
 *   cos(halfAngle) = 1 / (1 + altitude)  (radians)
 */
function visibleHalfAngleDeg(altitude: number): number {
  const a = Math.max(altitude, 0.02);
  const halfRad = Math.acos(1 / (1 + a));
  return (halfRad * 180) / Math.PI;
}

/**
 * Compute a rough lat/lng bbox visible from the given camera. Expands the raw
 * cap a little because the viewport is wider than the geometric cap suggests.
 */
export function cameraToBbox(cam: GlobeCamera, padding = 1.15): Bbox {
  const half = visibleHalfAngleDeg(cam.altitude) * padding;
  const cosLat = Math.max(Math.cos((cam.lat * Math.PI) / 180), 0.1);
  const lngHalf = Math.min(180, half / cosLat);
  const latHalf = Math.min(85, half);

  return {
    minLng: Math.max(-180, cam.lng - lngHalf),
    maxLng: Math.min(180, cam.lng + lngHalf),
    minLat: Math.max(-85, cam.lat - latHalf),
    maxLat: Math.min(85, cam.lat + latHalf),
  };
}

/** Stable string key for a viewport, used in TanStack Query cache keys. */
export function bboxKey(bbox: Bbox, precision: number): string {
  const q = (v: number) => v.toFixed(1);
  return `${precision}:${q(bbox.minLng)},${q(bbox.minLat)},${q(bbox.maxLng)},${q(bbox.maxLat)}`;
}
