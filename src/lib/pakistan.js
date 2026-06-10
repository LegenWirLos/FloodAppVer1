// Is a point inside Pakistan, and which province?
// Uses bundled province boundaries (geoBoundaries PAK ADM1, CC-BY 4.0 —
// © geoBoundaries, https://www.geoboundaries.org). Their union is the country,
// so one dataset gates the whole app AND tells us the province (used for the
// recent-flood reference). Disputed borders (Kashmir) are approximate.

import provinces from "./pakistan-provinces.json";

// Ray-casting across ALL rings of one polygon with a single accumulator, so
// interior holes correctly subtract. Coordinates are GeoJSON [lng, lat].
function inPolygon(lng, lat, rings) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0],
        yi = ring[i][1];
      const xj = ring[j][0],
        yj = ring[j][1];
      if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

function inGeometry(lng, lat, geom) {
  if (geom.type === "Polygon") return inPolygon(lng, lat, geom.coordinates);
  if (geom.type === "MultiPolygon")
    return geom.coordinates.some((poly) => inPolygon(lng, lat, poly));
  return false;
}

/** Returns { inPakistan, province }. */
export function locate(lat, lng) {
  for (const f of provinces.features) {
    if (inGeometry(lng, lat, f.geometry)) {
      return { inPakistan: true, province: f.properties.shapeName };
    }
  }
  return { inPakistan: false, province: null };
}
