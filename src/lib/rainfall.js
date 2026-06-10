// Extreme-rainfall exposure for a location, from the ERA5 archive.
// Heavy monsoon rain was the dominant driver of Pakistan's 2022 floods, so we
// gauge how much rain a place actually gets — the worst multi-day downpour on
// record. Deserts come out low; the monsoon belt comes out high.

import { fetchPrecipitationArchive } from "./openMeteo";

const START = "2010-01-01"; // window covers the 2010 and 2022 mega-floods

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Largest rolling `win`-day total in a daily series (nulls treated as 0). */
function maxRollingSum(values, win) {
  let sum = 0;
  let max = 0;
  const window = [];
  for (const v of values) {
    const x = Number.isFinite(v) ? v : 0;
    window.push(x);
    sum += x;
    if (window.length > win) sum -= window.shift();
    if (sum > max) max = sum;
  }
  return max;
}

/**
 * Returns { available, maxRain5d, maxRain1d } in mm.
 * maxRain5d (heaviest 5-day total since 2010) is the flood-relevant figure.
 */
export async function getRainExposure(lat, lng) {
  const { precipitation } = await fetchPrecipitationArchive(lat, lng, START, todayISO());
  const finite = precipitation.filter((v) => Number.isFinite(v));
  if (finite.length < 365) return { available: false };
  return {
    available: true,
    maxRain5d: maxRollingSum(precipitation, 5),
    maxRain1d: finite.reduce((m, v) => (v > m ? v : m), 0),
  };
}
