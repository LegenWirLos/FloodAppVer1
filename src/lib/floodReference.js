// Recent-flood reference for a location.
//
// The SCORE signal (`sref`) comes from a curated per-province severity table,
// seeded from the 2022/2025 Pakistan floods (Wikipedia-cited). This is reliable
// and discriminating: a live per-click query just returns the national "2022
// Pakistan floods" article almost everywhere, so it can't tell regions apart.
// Live Wikipedia is used only to UPGRADE the displayed link to a more-local
// article when one exists. Small places inherit their region's report.

const W2022 = "https://en.wikipedia.org/wiki/2022_Pakistan_floods";

// severity 0..1 — how hard recent (2022/2025) floods hit each province. Tunable.
const RECENT_FLOODS = {
  Sindh: { severity: 1.0, title: "2022 Pakistan floods — Sindh (catastrophic)", url: W2022 },
  Balochistan: { severity: 0.9, title: "2022 Pakistan floods — Balochistan", url: W2022 },
  "Khyber Pakhtunkhwa": { severity: 0.65, title: "2022 Pakistan floods — Khyber Pakhtunkhwa", url: W2022 },
  Punjab: { severity: 0.55, title: "2022 Pakistan floods — Punjab", url: W2022 },
  "Gilgit-Baltistan": { severity: 0.45, title: "2022 floods & glacial outbursts — Gilgit-Baltistan", url: W2022 },
  "Azad Kashmir": { severity: 0.35, title: "2022 Pakistan floods — Azad Kashmir", url: W2022 },
  "Islamabad Capital Territory": { severity: 0.3, title: "Recent urban flooding — Islamabad", url: W2022 },
};
const DEFAULT = { severity: 0.15, title: null, url: null };

const wikiUrl = (title) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

// fetch JSON with a hard timeout so a slow/blocked Wikipedia can't stall the result.
async function fetchJson(url, ms = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return res.ok ? await res.json() : null;
  } finally {
    clearTimeout(t);
  }
}

// Best-effort: find a more-local Wikipedia flood article near the point.
async function liveLocalArticle(lat, lng) {
  const geo = await fetchJson(
    `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=20000&gslimit=5&format=json&origin=*`
  );
  const place = geo?.query?.geosearch?.[0]?.title;
  if (!place) return null;
  const search = await fetchJson(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(place + " flood")}&srlimit=5&format=json&origin=*`
  );
  const hit = (search?.query?.search || []).find(
    (r) => /flood/i.test(r.title) && r.title !== "2022 Pakistan floods"
  );
  return hit ? { title: hit.title, url: wikiUrl(hit.title), scale: "local" } : null;
}

/**
 * Returns { sref, title, url, scale, hasRecord }.
 * sref drives the score; title/url/scale are for display.
 */
export async function getFloodReference(province, lat, lng) {
  const rec = RECENT_FLOODS[province] || DEFAULT;
  let title = rec.title;
  let url = rec.url;
  let scale = rec.title ? "regional" : "none";
  try {
    const local = await liveLocalArticle(lat, lng);
    if (local) {
      title = local.title;
      url = local.url;
      scale = "local";
    }
  } catch {
    /* best-effort only */
  }
  return { sref: rec.severity, title, url, scale, hasRecord: rec.severity >= 0.25 };
}
