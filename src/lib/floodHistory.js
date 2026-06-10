// Historical river behaviour near a location, from the GloFAS reanalysis
// (via Open-Meteo's Flood API). Used to add context like:
// "the nearby river hit its highest level in N years during 2022".

import { fetchRiverDischarge } from "./openMeteo";

const START = "1984-01-01"; // GloFAS v4 reanalysis begins in 1984

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Pull and summarise river-discharge history for a location.
 * Returns either { available: false } (no modelled river nearby) or:
 * {
 *   available: true,
 *   peak, peakDate,            // all-time max discharge (m³/s) and its date
 *   peak2022, peak2022Date,    // 2022's max (the motivating monsoon event)
 *   isRecord,                  // did 2022 set the all-time record?
 *   yearlyMax: [{year, max}],  // for the sparkline
 *   years,                     // length of the record in years
 * }
 */
export async function getHistory(lat, lng) {
  const { time, discharge } = await fetchRiverDischarge(lat, lng, START, todayISO());

  const pairs = [];
  for (let i = 0; i < time.length; i++) {
    const v = discharge[i];
    if (Number.isFinite(v) && v > 0) pairs.push({ t: time[i], v });
  }
  if (pairs.length < 30) return { available: false };

  let peak = pairs[0];
  const yearly = new Map(); // year -> {t, v} of that year's peak
  for (const p of pairs) {
    if (p.v > peak.v) peak = p;
    const year = Number(p.t.slice(0, 4));
    const cur = yearly.get(year);
    if (!cur || p.v > cur.v) yearly.set(year, p);
  }

  const yearlyMax = [...yearly.entries()]
    .map(([year, p]) => ({ year, max: p.v }))
    .sort((a, b) => a.year - b.year);

  const p2022 = yearly.get(2022) ?? null;
  const isRecord = p2022 ? p2022.v >= peak.v - 1e-9 : false;

  // "magnitude" = the river's typical FLOOD size (median of yearly peaks).
  // We use this as a proxy for how big the nearest river is, which feeds the
  // flood-risk score. Median of annual peaks is more flood-relevant than the
  // overall median (which is dominated by dry-season baseflow).
  const peaksSorted = yearlyMax.map((y) => y.max).sort((a, b) => a - b);
  const magnitude = peaksSorted[Math.floor(peaksSorted.length / 2)] ?? 0;

  return {
    available: true,
    magnitude,
    peak: peak.v,
    peakDate: peak.t,
    peak2022: p2022?.v ?? null,
    peak2022Date: p2022?.t ?? null,
    isRecord,
    yearlyMax,
    years: yearlyMax.length,
  };
}
