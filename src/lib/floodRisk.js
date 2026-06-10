// Flood-susceptibility scoring (v3).
//
// HONEST FRAMING: a heuristic estimate, not a hydrodynamic prediction.
//
//   base  = WaterSource × Receptivity
//     WaterSource (S) = extreme rainfall  OR  a sizeable nearby river
//     Receptivity (T) = flat, low-lying ground where water spreads and sits
//   final = base nudged ±25% by recent recorded flooding in the region (sref)
//
// Scoring only runs inside Pakistan; points outside return { outOfBounds: true }.

import { buildGrid, sampleAroundPolygon, centroid } from "./geo";
import { fetchElevations } from "./openMeteo";
import { getHistory } from "./floodHistory";
import { getRainExposure } from "./rainfall";
import { locate } from "./pakistan";
import { getFloodReference } from "./floodReference";

const FLAT_RELIEF_M = 3;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export function bandFor(score) {
  if (score >= 66) return "high";
  if (score >= 33) return "medium";
  return "low";
}

function analyzeTerrain(target, grid) {
  const valid = grid.filter((e) => Number.isFinite(e));
  if (!valid.length || !Number.isFinite(target)) return null;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const relief = max - min;
  const below = valid.filter((e) => e < target).length;
  const percentile = below / valid.length;
  const halmNorm = relief > 0 ? (target - min) / relief : 0.5;
  const sloc = 0.55 * (1 - percentile) + 0.45 * (1 - halmNorm);
  const flatfac = clamp(1 - relief / 40, 0, 1);
  return { sloc, flatfac, elevation: target, min, relief, percentile };
}

function riverSignal(history) {
  const q = history?.available ? history.magnitude : 0;
  if (!q) return { rmag: 0, hasRiver: false };
  const rmag = clamp(Math.log10(q + 1) / Math.log10(3000), 0, 1);
  return { rmag, hasRiver: true, magnitude: q };
}

function rainSignal(rain) {
  if (!rain?.available) return { srain: 0, maxRain5d: null };
  const srain = clamp((rain.maxRain5d - 40) / (250 - 40), 0, 1);
  return { srain, maxRain5d: rain.maxRain5d };
}

function buildFactors(terrain, river, rain, reference) {
  return [
    {
      label: "Heavy rainfall",
      detail: rain.maxRain5d
        ? `up to ~${Math.round(rain.maxRain5d)} mm in 5 days (since 2010)`
        : "no rainfall record here",
    },
    {
      label: "Nearby river",
      detail: !river.hasRiver
        ? "no major river modelled nearby"
        : river.rmag >= 0.6
        ? "a major river runs nearby"
        : "a modest watercourse nearby",
    },
    {
      label: "Ground shape",
      detail:
        terrain.flatfac >= 0.6
          ? terrain.sloc >= 0.6
            ? "low-lying and flat — water collects here"
            : "flat — water spreads out and sits"
          : "sloped — water tends to drain away",
    },
    {
      label: "Recent flood reports",
      detail: reference?.hasRecord
        ? reference.scale === "local"
          ? "documented near here — raises the estimate"
          : "documented in this region — raises the estimate"
        : "none on record for this region — lowers the estimate",
    },
    { label: "Elevation", detail: `~${Math.round(terrain.elevation)} m above sea level` },
  ];
}

function buildResult(terrain, history, rain, reference, isWater, loc) {
  if (isWater) {
    return { isWater: true, score: null, band: "water", factors: [], history, province: loc?.province };
  }
  if (!terrain) {
    return {
      score: null,
      band: "unknown",
      factors: [{ label: "Terrain", detail: "No elevation data for this spot." }],
      history,
      reference,
      province: loc?.province,
    };
  }
  const river = riverSignal(history);
  const rain2 = rainSignal(rain);
  const S = 1 - (1 - rain2.srain) * (1 - river.rmag);
  const T = clamp(terrain.flatfac + 0.4 * terrain.sloc, 0, 1);
  const base = S * T; // 0..1

  // Nudge by recent recorded flooding in the region (±25%).
  const sref = reference?.sref ?? 0.15;
  const score = Math.round(clamp(base * (0.75 + 0.5 * sref), 0, 1) * 100);

  return {
    score,
    band: bandFor(score),
    factors: buildFactors(terrain, river, rain2, reference),
    terrain,
    river,
    rain: rain2,
    reference,
    province: loc?.province,
    S,
    T,
    history,
  };
}

const isWaterElev = (e) => Number.isFinite(e) && e <= 0;

/** Assess a single dropped pin. */
export async function assessPoint(point) {
  const loc = locate(point.lat, point.lng);
  if (!loc.inPakistan) return { outOfBounds: true };

  const { points, centerIndex } = buildGrid(point, { n: 7, radiusMeters: 1000 });
  const [elevs, history, rain, reference] = await Promise.all([
    fetchElevations(points),
    getHistory(point.lat, point.lng).catch(() => ({ available: false })),
    getRainExposure(point.lat, point.lng).catch(() => ({ available: false })),
    getFloodReference(loc.province, point.lat, point.lng).catch(() => null),
  ]);
  const target = elevs[centerIndex];
  if (isWaterElev(target)) return buildResult(null, history, rain, reference, true, loc);
  return buildResult(analyzeTerrain(target, elevs), history, rain, reference, false, loc);
}

/** Assess a drawn polygon (lowest point inside the plot floods first). */
export async function assessPolygon(polygon) {
  const center = centroid(polygon);
  const loc = locate(center.lat, center.lng);
  if (!loc.inPakistan) return { outOfBounds: true };

  const { points, insideMask } = sampleAroundPolygon(polygon, { steps: 9, pad: 0.5 });
  const [elevs, history, rain, reference] = await Promise.all([
    fetchElevations(points),
    getHistory(center.lat, center.lng).catch(() => ({ available: false })),
    getRainExposure(center.lat, center.lng).catch(() => ({ available: false })),
    getFloodReference(loc.province, center.lat, center.lng).catch(() => null),
  ]);

  let plotElevs = elevs.filter((e, i) => insideMask[i] && Number.isFinite(e));
  if (!plotElevs.length) {
    const [cElev] = await fetchElevations([center]);
    plotElevs = Number.isFinite(cElev) ? [cElev] : [];
  }
  const target = plotElevs.length ? Math.min(...plotElevs) : NaN;
  if (isWaterElev(target)) return buildResult(null, history, rain, reference, true, loc);
  return buildResult(analyzeTerrain(target, elevs), history, rain, reference, false, loc);
}
