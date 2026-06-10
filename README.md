# FloodApp — "Will my land flood?"

An interactive map for Pakistan that estimates the **flood risk** of a chosen spot or
plot. Drop a pin or draw a boundary and the app blends rainfall history, river behaviour,
and terrain into a Low / Medium / High estimate, with a plain-English "why" and a recent
recorded-flood reference for the region.

> ⚠️ **This is an informational estimate at regional resolution, not an official warning.**
> Do not use it for emergency decisions. For official alerts in Pakistan, see the
> [NDMA](https://www.ndma.gov.pk/) and the [Pakistan Meteorological Department](https://www.pmd.gov.pk/).

## How the estimate works

`Risk = WaterSource × Receptivity`, then nudged ±25% by recent recorded flooding in the region:

- **Water source** — heaviest 5-day rainfall on record (ERA5 archive) **or** a sizeable
  nearby river (GloFAS discharge). No water source ⇒ low risk (deserts, etc.).
- **Receptivity** — flat, low-lying ground where water spreads and sits.
- **Regional flood record** — curated per-province severity from the 2022/2025 floods.

Scoring is restricted to inside Pakistan; points outside (or over open water) return no score.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/
```

Frontend-only — all data APIs are free, keyless and browser-callable, so it deploys as a
static site (Firebase Hosting / Vercel / Netlify).

## Data sources & attribution

- **Elevation, river discharge (GloFAS), rainfall (ERA5)** — [Open-Meteo](https://open-meteo.com/) (free, no key).
- **Pakistan province boundaries** — © [geoBoundaries](https://www.geoboundaries.org/) (PAK ADM1), licensed **CC-BY 4.0**.
- **Map tiles** — © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
- **Recent-flood references** — [Wikipedia](https://www.wikipedia.org/).

Boundaries around disputed areas (e.g. Kashmir) use Pakistan-administered extents and are approximate.
