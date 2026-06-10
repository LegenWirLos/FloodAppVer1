// Thin wrappers around the free, key-less Open-Meteo APIs.
// All of these endpoints are CORS-enabled, so the browser can call them directly
// (no backend needed). Docs: https://open-meteo.com/en/docs

const ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";
const FLOOD_URL = "https://flood-api.open-meteo.com/v1/flood";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

/**
 * Fetch terrain elevation (metres above sea level) for a list of {lat, lng} points.
 * Open-Meteo accepts up to 100 coordinate pairs in a single request.
 * Returns a number[] aligned 1:1 with `points`.
 */
export async function fetchElevations(points) {
  if (!points.length) return [];
  if (points.length > 100) {
    throw new Error(
      `Open-Meteo elevation accepts at most 100 points per call (got ${points.length}).`
    );
  }
  const lat = points.map((p) => p.lat.toFixed(5)).join(",");
  const lng = points.map((p) => p.lng.toFixed(5)).join(",");
  const res = await fetch(`${ELEVATION_URL}?latitude=${lat}&longitude=${lng}`);
  if (!res.ok) throw new Error(`Elevation request failed (HTTP ${res.status}).`);
  const data = await res.json();
  if (!Array.isArray(data.elevation)) {
    throw new Error("Elevation response was missing the 'elevation' array.");
  }
  return data.elevation;
}

/**
 * Fetch daily river discharge (m³/s) from the GloFAS model for a single location.
 * Returns { time: string[], discharge: (number|null)[] }.
 * Locations with no modelled river channel come back as all-null discharge.
 */
export async function fetchRiverDischarge(lat, lng, startDate, endDate) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    daily: "river_discharge",
    start_date: startDate,
    end_date: endDate,
  });
  const res = await fetch(`${FLOOD_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Flood request failed (HTTP ${res.status}).`);
  const data = await res.json();
  return {
    time: data?.daily?.time ?? [],
    discharge: data?.daily?.river_discharge ?? [],
  };
}

/**
 * Fetch daily precipitation totals (mm) from the ERA5 reanalysis archive.
 * Used to gauge how much extreme rain a location actually receives — the
 * dominant driver of the 2022 floods. Returns { time: string[], precipitation: (number|null)[] }.
 */
export async function fetchPrecipitationArchive(lat, lng, startDate, endDate) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    daily: "precipitation_sum",
    start_date: startDate,
    end_date: endDate,
    timezone: "auto",
  });
  const res = await fetch(`${ARCHIVE_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Rainfall request failed (HTTP ${res.status}).`);
  const data = await res.json();
  return {
    time: data?.daily?.time ?? [],
    precipitation: data?.daily?.precipitation_sum ?? [],
  };
}
