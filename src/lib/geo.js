// Small geometry helpers for sampling terrain around a point or polygon.
// Pure functions, no external dependencies.

const M_PER_DEG_LAT = 111_320;

/** Convert a north–south distance in metres to a latitude delta (degrees). */
export function metersToLat(m) {
  return m / M_PER_DEG_LAT;
}

/** Convert an east–west distance in metres to a longitude delta at a given latitude. */
export function metersToLng(m, atLat) {
  return m / (M_PER_DEG_LAT * Math.cos((atLat * Math.PI) / 180));
}

/**
 * Build an n×n grid of {lat, lng} centred on `center`, spanning ±radiusMeters.
 * `n` is forced odd so the exact centre point is one of the nodes.
 * Returns { points, centerIndex }.
 */
export function buildGrid(center, { n = 7, radiusMeters = 1000 } = {}) {
  const size = n % 2 === 0 ? n + 1 : n;
  const step = (2 * radiusMeters) / (size - 1);
  const points = [];
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const dy = -radiusMeters + i * step;
      const dx = -radiusMeters + j * step;
      points.push({
        lat: center.lat + metersToLat(dy),
        lng: center.lng + metersToLng(dx, center.lat),
      });
    }
  }
  return { points, centerIndex: (size * size - 1) / 2 };
}

/** Ray-casting point-in-polygon test. polygon = [{lat, lng}, ...]. */
export function pointInPolygon(pt, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng,
      yi = polygon[i].lat;
    const xj = polygon[j].lng,
      yj = polygon[j].lat;
    const intersect =
      yi > pt.lat !== yj > pt.lat &&
      pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Axis-aligned bounds of a polygon. */
export function bounds(polygon) {
  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;
  for (const p of polygon) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return { minLat, maxLat, minLng, maxLng };
}

/** Simple average-of-vertices centroid (good enough for re-centring the map). */
export function centroid(polygon) {
  const lat = polygon.reduce((s, p) => s + p.lat, 0) / polygon.length;
  const lng = polygon.reduce((s, p) => s + p.lng, 0) / polygon.length;
  return { lat, lng };
}

/**
 * Sample a `steps`×`steps` grid across the polygon's bounding box, expanded by
 * `pad` (fraction of box size) so we also capture the surrounding terrain.
 * Returns { points, insideMask } — insideMask[i] is true when points[i] is inside
 * the polygon. With steps=9 that's 81 points (within the 100-point API limit).
 */
export function sampleAroundPolygon(polygon, { steps = 9, pad = 0.5 } = {}) {
  const b = bounds(polygon);
  const latPad = (b.maxLat - b.minLat) * pad || metersToLat(200);
  const lngPad = (b.maxLng - b.minLng) * pad || metersToLng(200, b.minLat);
  const minLat = b.minLat - latPad,
    maxLat = b.maxLat + latPad;
  const minLng = b.minLng - lngPad,
    maxLng = b.maxLng + lngPad;
  const points = [];
  const insideMask = [];
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const lat = minLat + ((maxLat - minLat) * i) / (steps - 1);
      const lng = minLng + ((maxLng - minLng) * j) / (steps - 1);
      const pt = { lat, lng };
      points.push(pt);
      insideMask.push(pointInPolygon(pt, polygon));
    }
  }
  return { points, insideMask };
}
