# FloodApp — "Will my land flood?" Risk Map

> **Resuming?** Read this, then continue from **Implementation step 7 (Firebase)**.
>
> **Done so far — Phase A, the core app (dev server compiles clean):**
> - Deps installed: `@geoman-io/leaflet-geoman-free`, `firebase`.
> - `src/lib/openMeteo.js` — elevation + GloFAS river-discharge fetch helpers.
> - `src/lib/geo.js` — point grid + polygon sampling + point-in-polygon.
> - `src/lib/rainfall.js` — ERA5 archive extreme-rainfall exposure (`getRainExposure`, max 5-day mm since 2010).
> - `src/lib/floodRisk.js` — **v2 model: `Risk = WaterSource × Receptivity`**. WaterSource = rain
>   (rainfall.js) OR river (GloFAS). Receptivity = flat + low terrain. Plus sea/water detection
>   (elev ≤ 0 → "over water", no score). Fixes desert over-flagging & sea pins; terrain demoted to
>   a modifier. Verified offline: Sindh→100, desert dip→0, hills→1, sea→water.
> - **v3:** `src/lib/pakistan.js` + `pakistan-provinces.json` (geoBoundaries ADM1, CC-BY) gate scoring
>   to Pakistan (`locate`→{inPakistan,province}); `src/lib/floodReference.js` = per-province recent-flood
>   reference + ±25% score modifier (best-effort live Wikipedia link). RiskPanel renders out-of-bounds +
>   the reference. Verified offline: cities→right province, foreign/sea pts→rejected, Karachi→High.
> - `src/lib/floodHistory.js` — historical discharge summary (2022 peak, yearly maxima).
> - `src/components/` — `MapView`, `DrawTools` (Geoman pin+polygon), `RiskPanel`, `Sparkline`, `Disclaimer`.
> - `src/App.jsx` + `App.css` + `index.css` — full wiring: Pin / Draw / Clear modes + result panel.
> - Run it: `npm run dev` → http://localhost:5173
>
> **Next:** steps 7–9 (Firebase auth + saved plots), then verify + deploy (step 11).
> **Still owed from Phase A:** a `npm run build` check + a live click-through (floodplain in
> Sindh should score higher than hill terrain; the 2022 peak should appear in the history).

## Context

Motivated by the 2022 Pakistan floods, the goal is a web app where a person finds
their land on a map and gets an honest **flood-risk estimate** for it, and can **sign in
to save the plots they check**. The repo today (`C:\Users\rolle\Desktop\FloodApp\FrontEnd`)
is a clean **Vite + React 19 + Leaflet** app: one full-screen OpenStreetMap centered on
Pakistan, nothing else.

Important framing: real "will water reach this spot on date X" forecasting needs heavy
hydrodynamic modeling — out of scope for a few-day build. What we *can* do credibly and
for free is a **flood-risk score**: how exposed a piece of land is, from terrain shape +
how the nearby river has behaved historically. Shown as Low/Med/High with a plain-English
"why" and a clear disclaimer that it's an informational estimate at regional resolution,
not an official warning.

### Decisions locked in (from your answers)
- **Depth:** terrain risk **+ historical context** (no live forecast layer in v1 — easy to add later, same data provider).
- **Land selection:** **both** tap-to-drop-a-pin **and** draw-a-boundary polygon.
- **Accounts + data:** **Firebase Auth** (email + Google) **+ Firestore**. Logging in **saves plots with a label + notes**, synced across devices.
- **Architecture:** frontend-only React app + Firebase (no custom server to write/host). Deploys static to **Firebase Hosting** (or Vercel/Netlify).

## How the prediction works (the method)

**1. Terrain susceptibility — Open-Meteo Elevation API** (free, no key, CORS, 100 pts/call)
When a user picks a spot, sample a small grid of elevations around it (e.g. 7×7 ≈ 49
points over ~±1 km) in **one** batched request. From that local patch compute:
- *Height above local minimum* = `target − min(grid)` → near the low point = water pools there = higher risk.
- *Local percentile* = fraction of surrounding points lower than the target → among the lowest = higher risk.
- Normalize by *local relief* `max−min` so it works in flat and hilly terrain.

Blend into a 0–100 score → Low / Med / High band, with the contributing factors shown.
(Honest caveat in the UI: this is a *relative, heuristic* susceptibility.)

**2. Historical context — Open-Meteo Flood API / GloFAS** (free, no key)
For the selected location, pull daily **river discharge** history (GloFAS, back to 1984).
Surface the **2022 monsoon peak**, where it ranks in the full record, and a small timeline
sparkline. e.g. *"The river near here peaked at ~X m³/s in Aug 2022 — its highest in 40 years."*
This is the reliable, verified "history" feature and ties directly to the motivating event.

**3. (Optional accuracy boost) Nearest-river HAND** — the local-grid method under-rates
*broad flat floodplains*. If time allows, query Overpass/OSM for the nearest river and add
*height-above-nearest-drainage*. Optional so the timeline stays safe.

**4. (Optional) Historical flood overlay** — a GeoJSON layer of the 2022 flood extent for
visual comparison (candidate free sources: Copernicus EMS, Dartmouth Flood Observatory,
Global Flood Database). Secondary to feature #2.

## Accounts & saved plots (Firebase)
- **Auth:** Firebase Authentication — email/password + Google sign-in (popup). Track state with `onAuthStateChanged`, exposed via a small `useAuth` hook/context.
- **Storage:** Firestore. Model: `users/{uid}/plots/{plotId}` → `{ label, notes, type:'pin'|'polygon', geometry, score, band, factors, historyPeak, createdAt }`.
- **Saved-plots UX:** after a risk result, a **Save** form (label + notes); a **"My plots"** list to revisit (click → recenter map, redraw pin/polygon, show stored risk); edit label/notes; delete.
- **Security:** the Firebase web config is **public and safe to ship** (an identifier, not a secret). Real protection = Firestore security rules: `allow read, write: if request.auth != null && request.auth.uid == uid`. Config kept tidy via Vite env vars (`VITE_FIREBASE_*` in `.env`).
- No server to run — the browser SDK talks to Firebase directly; the app stays a static deploy.

## Data sources (all free, no API key, browser-callable)
- Elevation: `https://api.open-meteo.com/v1/elevation?latitude=a,b,..&longitude=a,b,..` → `{ elevation: [...] }`
- Flood/discharge: `https://flood-api.open-meteo.com/v1/flood?latitude=LAT&longitude=LNG&daily=river_discharge&start_date=..&end_date=..`
- (optional) Place search: `https://geocoding-api.open-meteo.com/v1/search` · Nearest river: Overpass API (OSM `waterway`)

## Architecture & going live
- Frontend-only React + Firebase. `npm run build` → static `dist/` → deploy to **Firebase Hosting** (`firebase deploy`, one project alongside Auth + Firestore) or **Vercel/Netlify**.
- A custom server is still not needed for v1; it would only earn its place later for server-side jobs or integrations Firebase can't cover.

## Implementation steps

1. **Map interaction (pin + boundary).** Add `@geoman-io/leaflet-geoman-free` (attach to the
   underlying map via `useMap()` — robust with react-leaflet v5). Pin = marker on map click
   (`useMapEvents`); Draw = Geoman polygon. Capture point/vertices into state. Use a custom
   `L.divIcon` (sidesteps the Leaflet+bundler broken-icon bug and lets us color the marker by risk).
2. **Geometry/sampling helper** (`src/lib/geo.js`): elevation grid around a point; for a polygon,
   sample points inside its bounding box (cap 100).
3. **Elevation + risk module** (`src/lib/floodRisk.js`): fetch batched elevations, compute score +
   band + factors. Pure functions.
4. **History module** (`src/lib/floodHistory.js`): fetch GloFAS discharge; compute peak/ranking/series.
5. **Result panel** (`src/components/RiskPanel.jsx`): band + score, the "why" factors, history note +
   sparkline, and the **disclaimer** (link to Pakistan NDMA/PMD).
6. **Compose `App.jsx`:** map + results panel + mode toggle (Pin / Draw / Clear).
7. **Firebase setup:** create project + enable Email & Google auth + Firestore; add `firebase` dep,
   `src/lib/firebase.js` (init `auth`, `db`), `.env` with `VITE_FIREBASE_*`.
8. **Auth UI:** `src/hooks/useAuth.js` + `src/components/AuthBar.jsx` (sign up / in / out, Google).
9. **Saved plots:** `src/lib/plotsStore.js` (save/list/update/delete) + `SavePlotForm.jsx` +
   `SavedPlots.jsx`; wire to map; **set Firestore security rules** (`firestore.rules`).
10. **(Optional)** HAND via Overpass; historical flood GeoJSON overlay; place-search box.
11. **Build + deploy** (Firebase Hosting or Vercel/Netlify); confirm the live URL.

## Files
- **Modify:** `src/App.jsx`, `src/App.css`, `src/main.jsx` (wire auth provider if used).
- **New (map/risk):** `src/lib/openMeteo.js`, `src/lib/geo.js`, `src/lib/floodRisk.js`, `src/lib/floodHistory.js`, `src/components/MapView.jsx`, `src/components/DrawTools.jsx`, `src/components/RiskPanel.jsx`, `src/components/Disclaimer.jsx`.
- **New (accounts):** `src/lib/firebase.js`, `src/hooks/useAuth.js`, `src/lib/plotsStore.js`, `src/components/AuthBar.jsx`, `src/components/SavePlotForm.jsx`, `src/components/SavedPlots.jsx`, `firestore.rules`, `.env` (gitignored).
- **Add deps:** `@geoman-io/leaflet-geoman-free`, `firebase`. (History sparkline as inline SVG — no chart dep.)

## Verification
- `npm run dev`; scores move the right way: low ground beside the Indus (e.g. **Sindh — Dadu/Khairpur**, hit hard in 2022) reads **higher**; hilly ground **lower**. Polygon over a floodplain vs. a ridge differs sensibly. Riverside point shows the **2022 peak** in the timeline.
- **Accounts:** sign up + log in (email *and* Google); refresh stays logged in. Check a spot → **Save** as "my farm" + a note → shows in **My plots**. Reload / different browser → it persists. Click a saved plot → map recenters, pin/polygon + stored risk restored.
- **Security:** confirm one user can't read another `uid`'s plots (rules enforced, not test-mode).
- Touch/mobile check. `npm run build` → `npm run preview` clean → deploy and load the public URL.

## Risks / caveats (and how we handle them)
- **Resolution** (~90 m elevation, ~5 km discharge) → regional, not parcel-precise → stated in the disclaimer.
- **Flat floodplains** under-rated by local-grid method → optional HAND step; disclaimer notes the limit.
- **Geoman + react-leaflet v5** → integrate at the map-instance level, not a React wrapper plugin.
- **Firebase:** set real Firestore **security rules before launch** (don't leave test-mode open); add the deployed domain to Auth **authorized domains** for Google sign-in.
- **Ethics/safety:** never an authoritative warning; link to official flood authorities.
- **Scope note:** accounts + polygon grew the original "few days" target — still ships tiered (core risk → accounts → optional extras), realistically within ~a week.
