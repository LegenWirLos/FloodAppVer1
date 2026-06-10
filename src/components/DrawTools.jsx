import { useEffect } from "react";
import { useMap } from "react-leaflet";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

// Drives polygon drawing via Leaflet-Geoman, attached to the underlying map
// instance (robust with react-leaflet v5). We don't show Geoman's own toolbar —
// drawing is toggled by the `active` prop from our own buttons.
export default function DrawTools({ active, onPolygon }) {
  const map = useMap();

  // When a polygon is finished: read its ring, remove Geoman's layer (we render
  // our own colored Polygon from React state), and hand the coords up.
  useEffect(() => {
    if (!map?.pm) return;
    const handleCreate = (e) => {
      const ring = e.layer?.getLatLngs?.()[0] ?? [];
      const latlngs = ring.map((p) => ({ lat: p.lat, lng: p.lng }));
      map.removeLayer(e.layer);
      if (latlngs.length >= 3) onPolygon(latlngs);
    };
    map.on("pm:create", handleCreate);
    return () => map.off("pm:create", handleCreate);
  }, [map, onPolygon]);

  // Toggle polygon draw mode.
  useEffect(() => {
    if (!map?.pm) return;
    if (active) {
      map.pm.enableDraw("Polygon", { snappable: true, continueDrawing: false });
    } else {
      map.pm.disableDraw();
    }
    return () => {
      if (map?.pm) map.pm.disableDraw();
    };
  }, [map, active]);

  return null;
}
